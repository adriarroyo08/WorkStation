import { useMemo, useState } from 'react';
import { MUSCLE_LABELS } from '../../../shared/exercises';
import { nextPendingSet, toggleSet } from '../../../shared/session';
import { alignPrevious, estimate1RM, exerciseHistory, formatDuration, lastSessionSets } from '../../../shared/stats';
import { platesFor, warmupSets } from '../../../shared/tools';
import type { Exercise, SetType, Workout, WorkoutExercise, WorkoutSet } from '../../../shared/types';
import { uid } from '../../../shared/types';
import { rest, useRest } from '../rest';
import { useHeartRate } from '../hr';
import { clock, useNow, useStore, useWakeLock } from '../store';
import DevicesSheet from './DevicesSheet';
import ExercisePicker from './ExercisePicker';
import { ExerciseMedia, Sheet } from './ui';

const SET_CYCLE: SetType[] = ['normal', 'warmup', 'drop', 'failure'];
const SET_LABEL: Record<SetType, string> = { normal: '', warmup: 'C', drop: 'D', failure: 'F' };
const SET_NAMES: Record<SetType, string> = { normal: 'Normal', warmup: 'Calentamiento', drop: 'Drop set', failure: 'Al fallo' };
const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

type Edit = (fn: (w: Workout) => void) => void;

// Registro de un entrenamiento. mode="live": en curso (cronómetro, descansos). mode="edit": editar uno ya guardado.
export default function WorkoutLogger({ workout: w, edit, mode, onFinish, onDiscard, onExercise }: { workout: Workout; edit: Edit; mode: 'live' | 'edit'; onFinish: () => void; onDiscard: () => void; onExercise?: (id: string) => void }) {
  const { data, settings } = useStore();
  const now = useNow();
  const restState = useRest();
  const [picker, setPicker] = useState<{ replace?: number } | null>(null);
  const [menu, setMenu] = useState<number | null>(null);
  const [plates, setPlates] = useState<number | null>(null);
  const [stopwatch, setStopwatch] = useState<{ ei: number; si: number; start: number } | null>(null);
  const exMap = useMemo(() => new Map(data.exercises.map((e) => [e.id, e])), [data.exercises]);
  useWakeLock(mode === 'live' && settings.keepAwake);

  const restLeft = restState.end ? Math.ceil((restState.end - now) / 1000) : 0;
  const hr = useHeartRate();
  const [devices, setDevices] = useState(false);

  // Historial previo (excluye el propio entrenamiento si se está editando).
  const history = useMemo(() => {
    const others = { ...data, workouts: data.workouts.filter((x) => x.id !== w.id && x.startedAt < w.startedAt) };
    const out = new Map<string, { prev: WorkoutSet[]; best1RM: number; bestWeight: number; maxReps: number }>();
    for (const id of new Set(w.exercises.map((e) => e.exerciseId))) {
      const h = exerciseHistory(others, id);
      out.set(id, { prev: lastSessionSets(data, id, w.startedAt, w.id), best1RM: Math.max(0, ...h.map((s) => s.best1RM)), bestWeight: Math.max(0, ...h.map((s) => s.bestWeight)), maxReps: Math.max(0, ...h.map((s) => s.maxReps)) });
    }
    return out;
  }, [data, w.id, w.startedAt, w.exercises]);

  const setField = (ei: number, si: number, patch: Partial<WorkoutSet>) => edit((n) => void Object.assign(n.exercises[ei].sets[si], patch));

  const toggleDone = (ei: number, si: number) => {
    const r = toggleSet(data, w, ei, si);
    edit((n) => void Object.assign(n, structuredClone(r.workout)));
    if (mode === 'live' && r.restSec > 0) rest.start(r.restSec);
    // Lleva la vista a la siguiente serie pendiente.
    const nx = nextPendingSet(r.workout);
    if (mode === 'live' && nx && !w.exercises[ei].sets[si].done)
      setTimeout(() => document.getElementById(`set-${nx.ei}-${nx.si}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  };
  const cursor = mode === 'live' ? nextPendingSet(w) : null;
  const nextLabel = (() => {
    if (!cursor) return '';
    const we = w.exercises[cursor.ei];
    const s = we.sets[cursor.si];
    const prev = alignPrevious(we.sets, history.get(we.exerciseId)?.prev ?? [])[cursor.si];
    const wt = s.weight ?? prev?.weight;
    const reps = s.reps ?? prev?.reps;
    return `${exMap.get(we.exerciseId)?.name ?? ''}${wt || reps ? ` · ${wt ? `${wt} kg × ` : ''}${reps ?? ''}` : ''}`;
  })();

  const isPr = (we: WorkoutExercise, s: WorkoutSet, ex?: Exercise) => {
    const h = history.get(we.exerciseId);
    if (!s.done || s.type === 'warmup' || !h || (!h.best1RM && !h.maxReps)) return false;
    if (!ex || ex.kind === 'weight_reps') return estimate1RM(s.weight ?? 0, s.reps ?? 0) > h.best1RM || (s.weight ?? 0) > h.bestWeight;
    if (ex.kind === 'reps' || ex.kind === 'assisted') return (s.reps ?? 0) > h.maxReps;
    return false;
  };

  const addExercises = (es: Exercise[], superset: boolean) => {
    const sid = superset ? uid() : undefined;
    edit((n) => {
      for (const e of es) {
        const prev = lastSessionSets(data, e.id);
        const sets: WorkoutSet[] = (prev.length ? prev : [{ type: 'normal' as SetType }, { type: 'normal' as SetType }, { type: 'normal' as SetType }]).map((p) => ({ type: p.type, done: false }));
        n.exercises.push({ exerciseId: e.id, sets, supersetId: sid, restSec: settings.defaultRestSec });
      }
    });
  };

  const replaceExercise = (ei: number, e: Exercise) => edit((n) => void (n.exercises[ei] = { ...n.exercises[ei], exerciseId: e.id, sets: n.exercises[ei].sets.map((s) => ({ type: s.type, done: false })) }));

  const elapsed = Math.round((now - Date.parse(w.startedAt)) / 1000);
  const totals = w.exercises.reduce(
    (t, e) => {
      for (const s of e.sets)
        if (s.done && s.type !== 'warmup') {
          t.sets++;
          t.volume += (s.weight ?? 0) * (s.reps ?? 0);
        }
      return t;
    },
    { sets: 0, volume: 0 },
  );

  return (
    <section className="active">
      <div className="sticky">
        <div className="row">
          <input className="title grow" value={w.name} onChange={(e) => edit((n) => void (n.name = e.target.value))} />
          <button className="primary" onClick={onFinish}>
            {mode === 'live' ? 'Terminar' : 'Guardar'}
          </button>
        </div>
        <div className="row live-stats small muted">
          {mode === 'live' && <span>⏱ {formatDuration(elapsed)}</span>}
          {mode === 'live' && hr.live && <span className="hr-live">❤️ {hr.bpm}</span>}
          <span>🏋️ {Math.round(totals.volume).toLocaleString('es-ES')} kg</span>
          <span>✅ {totals.sets} series</span>
          {mode === 'live' && (
            <button className="ghost small devices-btn" onClick={() => setDevices(true)} aria-label="Reloj y sensores">
              ⌚
            </button>
          )}
        </div>
      </div>

      {mode === 'edit' && <EditTimes w={w} edit={edit} />}
      <textarea className="notes" placeholder="Notas del entrenamiento…" value={w.notes ?? ''} onChange={(e) => edit((n) => void (n.notes = e.target.value || undefined))} />

      {!w.exercises.length && <p className="muted center-text">Añade tu primer ejercicio para empezar.</p>}

      {w.exercises.map((we, ei) => {
        const ex = exMap.get(we.exerciseId);
        const h = history.get(we.exerciseId);
        const aligned = alignPrevious(we.sets, h?.prev ?? []);
        const ssPrev = ei > 0 && we.supersetId && w.exercises[ei - 1].supersetId === we.supersetId;
        const ssNext = we.supersetId && w.exercises[ei + 1]?.supersetId === we.supersetId;
        const kind = ex?.kind ?? 'weight_reps';
        const [c1, c2] = kind === 'duration' ? ['kg', 'Tiempo'] : kind === 'distance' ? ['Metros', 'Tiempo'] : kind === 'reps' ? ['+kg', 'Reps'] : kind === 'assisted' ? ['-kg', 'Reps'] : ['kg', 'Reps'];
        return (
          <div key={ei} className={`card excard ${we.supersetId ? 'superset' : ''} ${ssPrev ? 'ss-mid' : ''} ${ssNext ? 'ss-next' : ''}`}>
            {we.supersetId && !ssPrev && <div className="ss-label">Superserie</div>}
            <div className="row">
              <button className="plain" onClick={() => onExercise?.(we.exerciseId)}>
                <ExerciseMedia exercise={ex} size="thumb" />
              </button>
              <b className="grow accent-text" onClick={() => onExercise?.(we.exerciseId)}>
                {ex?.name ?? we.exerciseId}
              </b>
              <button className="ghost" onClick={() => setMenu(ei)} aria-label="Opciones">
                ⋯
              </button>
            </div>
            {ex?.stickyNote && <p className="sticky-note small">📌 {ex.stickyNote}</p>}
            <input className="notes" placeholder="Notas…" value={we.notes ?? ''} onChange={(e) => edit((n) => void (n.exercises[ei].notes = e.target.value || undefined))} />
            {mode === 'live' && (
              <button className="ghost small rest-chip" onClick={() => setMenu(ei)}>
                ⏲ Descanso: {we.restSec ?? settings.defaultRestSec ? clock(we.restSec ?? settings.defaultRestSec) : 'off'}
              </button>
            )}
            <div className={`sets ${settings.showRpe ? 'rpe' : ''}`}>
              <div className="set head">
                <span>Serie</span>
                <span>Anterior</span>
                <span>{c1}</span>
                <span>{c2}</span>
                {settings.showRpe && <span>RPE</span>}
                <span>✓</span>
              </div>
              {we.sets.map((s, si) => (
                <SetRow
                  key={si}
                  id={`set-${ei}-${si}`}
                  isNext={cursor?.ei === ei && cursor.si === si}
                  n={we.sets.slice(0, si + 1).filter((x) => x.type !== 'warmup').length}
                  s={s}
                  prev={aligned[si]}
                  ex={ex}
                  pr={isPr(we, s, ex)}
                  showRpe={settings.showRpe}
                  running={stopwatch?.ei === ei && stopwatch.si === si ? Math.round((now - stopwatch.start) / 1000) : undefined}
                  onStopwatch={() => {
                    if (stopwatch?.ei === ei && stopwatch.si === si) {
                      setField(ei, si, { durationSec: Math.round((Date.now() - stopwatch.start) / 1000) });
                      setStopwatch(null);
                    } else setStopwatch({ ei, si, start: Date.now() });
                  }}
                  onChange={(p) => setField(ei, si, p)}
                  onToggle={() => toggleDone(ei, si)}
                  onRemove={() => edit((n) => void n.exercises[ei].sets.splice(si, 1))}
                  onPlates={() => setPlates(s.weight ?? aligned[si]?.weight ?? 0)}
                />
              ))}
            </div>
            <button
              className="ghost full"
              onClick={() =>
                edit((n) => {
                  const last = n.exercises[ei].sets.at(-1);
                  n.exercises[ei].sets.push({ type: last?.type === 'warmup' ? 'normal' : (last?.type ?? 'normal'), weight: last?.weight, reps: last?.reps, durationSec: last?.durationSec, distanceM: last?.distanceM, done: false });
                })
              }
            >
              + Añadir serie
            </button>
          </div>
        );
      })}

      <button className="primary full" onClick={() => setPicker({})}>
        + Añadir ejercicio
      </button>
      <button className="danger full" onClick={() => confirm(mode === 'live' ? '¿Descartar este entrenamiento?' : '¿Descartar los cambios?') && onDiscard()}>
        {mode === 'live' ? 'Descartar entrenamiento' : 'Descartar cambios'}
      </button>

      {mode === 'live' && restState.end && restLeft > 0 && (
        <div className="rest">
          <div className="rest-progress" style={{ width: `${(restLeft / Math.max(1, restState.total)) * 100}%` }} />
          <div className="rest-main">
            <span>Descanso</span>
            <b>{clock(restLeft)}</b>
            {nextLabel && <small className="rest-next">Siguiente: {nextLabel}</small>}
          </div>
          <button onClick={() => rest.add(-15)}>-15</button>
          <button onClick={() => rest.add(15)}>+15</button>
          <button onClick={rest.stop}>Saltar</button>
        </div>
      )}

      {picker && (
        <ExercisePicker
          title={picker.replace !== undefined ? 'Reemplazar ejercicio' : 'Añadir ejercicio'}
          single={picker.replace !== undefined}
          onClose={() => setPicker(null)}
          onPick={(es, ss) => {
            if (picker.replace !== undefined) replaceExercise(picker.replace, es[0]);
            else addExercises(es, ss);
            setPicker(null);
          }}
        />
      )}
      {menu !== null && w.exercises[menu] && <ExerciseMenu w={w} ei={menu} edit={edit} onClose={() => setMenu(null)} onReplace={() => (setPicker({ replace: menu }), setMenu(null))} />}
      {plates !== null && <PlateCalculator initial={plates} onClose={() => setPlates(null)} />}
      {devices && <DevicesSheet onClose={() => setDevices(false)} />}
    </section>
  );
}

function EditTimes({ w, edit }: { w: Workout; edit: Edit }) {
  const local = (iso: string) => {
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const dur = w.endedAt ? Math.round((Date.parse(w.endedAt) - Date.parse(w.startedAt)) / 60000) : 60;
  return (
    <div className="row">
      <label className="grow">
        Fecha y hora
        <input type="datetime-local" value={local(w.startedAt)} onChange={(e) => e.target.value && edit((n) => {
          const start = new Date(e.target.value);
          n.startedAt = start.toISOString();
          n.endedAt = new Date(start.getTime() + dur * 60000).toISOString();
        })} />
      </label>
      <label>
        Duración (min)
        <input inputMode="numeric" value={dur} onChange={(e) => edit((n) => void (n.endedAt = new Date(Date.parse(n.startedAt) + (Number(e.target.value) || 0) * 60000).toISOString()))} />
      </label>
    </div>
  );
}

function ExerciseMenu({ w, ei, edit, onClose, onReplace }: { w: Workout; ei: number; edit: Edit; onClose: () => void; onReplace: () => void }) {
  const { data, settings } = useStore();
  const we = w.exercises[ei];
  const ex = data.exercises.find((e) => e.id === we.exerciseId);
  const next = w.exercises[ei + 1];
  const work = we.sets.find((s) => s.type !== 'warmup');
  const workWeight = work?.weight ?? exerciseHistory(data, we.exerciseId).at(-1)?.bestWeight ?? 0;
  const move = (d: number) => edit((n) => void n.exercises.splice(ei + d, 0, ...n.exercises.splice(ei, 1)));
  return (
    <Sheet title={ex?.name} onClose={onClose}>
      <p className="muted small">{ex && MUSCLE_LABELS[ex.muscle]}</p>
      <label>
        ⏲ Temporizador de descanso
        <select value={we.restSec ?? settings.defaultRestSec} onChange={(e) => edit((n) => void (n.exercises[ei].restSec = Number(e.target.value)))}>
          {REST_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s ? clock(s) : 'Desactivado'}
            </option>
          ))}
        </select>
      </label>
      <div className="list">
        {ex?.kind === 'weight_reps' && workWeight > 0 && (
          <button
            className="item"
            onClick={() => {
              const ws = warmupSets(workWeight, settings.barKg);
              edit((n) => void n.exercises[ei].sets.unshift(...ws.map((s) => ({ type: 'warmup' as SetType, weight: s.weight, reps: s.reps, done: false }))));
              onClose();
            }}
          >
            🔥 Añadir series de calentamiento (hasta {workWeight} kg)
          </button>
        )}
        {next && (
          <button
            className="item"
            onClick={() => {
              edit((n) => {
                const id = n.exercises[ei].supersetId ?? n.exercises[ei + 1].supersetId ?? uid();
                n.exercises[ei].supersetId = id;
                n.exercises[ei + 1].supersetId = id;
              });
              onClose();
            }}
          >
            🔗 Hacer superserie con el siguiente
          </button>
        )}
        {we.supersetId && (
          <button className="item" onClick={() => (edit((n) => void (n.exercises[ei].supersetId = undefined)), onClose())}>
            ✂️ Quitar de la superserie
          </button>
        )}
        <button className="item" onClick={onReplace}>
          🔄 Reemplazar ejercicio
        </button>
        <button className="item" disabled={ei === 0} onClick={() => (move(-1), onClose())}>
          ⬆️ Subir
        </button>
        <button className="item" disabled={ei === w.exercises.length - 1} onClick={() => (move(1), onClose())}>
          ⬇️ Bajar
        </button>
        <button className="item danger" onClick={() => (edit((n) => void n.exercises.splice(ei, 1)), onClose())}>
          🗑 Quitar ejercicio
        </button>
      </div>
    </Sheet>
  );
}

export function PlateCalculator({ initial, onClose }: { initial: number; onClose: () => void }) {
  const { settings } = useStore();
  const [target, setTarget] = useState(String(initial || ''));
  const [bar, setBar] = useState(settings.barKg);
  const r = platesFor(Number(target.replace(',', '.')) || 0, bar, settings.platesKg);
  return (
    <Sheet title="Calculadora de discos" onClose={onClose}>
      <div className="row">
        <label className="grow">
          Peso total (kg)
          <input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} autoFocus />
        </label>
        <label>
          Barra
          <select value={bar} onChange={(e) => setBar(Number(e.target.value))}>
            {[20, 15, 10, 7, 0].map((b) => (
              <option key={b} value={b}>
                {b} kg
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="plates">
        <div className="barbell" />
        {r.perSide.map((p, i) => (
          <div key={i} className="plate" style={{ height: `${40 + p * 3}px` }}>
            {p}
          </div>
        ))}
      </div>
      <p>
        Por lado: <b>{r.perSide.length ? r.perSide.join(' + ') : '—'}</b>
      </p>
      <p className="muted small">
        Total cargado: {r.achieved} kg{r.remainder ? ` (faltan ${r.remainder} kg con tus discos)` : ''}. Configura tus discos en Ajustes.
      </p>
    </Sheet>
  );
}

function SetRow(props: { id: string; isNext: boolean; n: number; s: WorkoutSet; prev?: WorkoutSet; ex?: Exercise; pr: boolean; showRpe: boolean; running?: number; onStopwatch: () => void; onChange: (p: Partial<WorkoutSet>) => void; onToggle: () => void; onRemove: () => void; onPlates: () => void }) {
  const { id, isNext, n, s, prev, ex, pr, showRpe, running, onStopwatch, onChange, onToggle, onRemove, onPlates } = props;
  const [typeMenu, setTypeMenu] = useState(false);
  const numVal = (v: string) => (v === '' ? undefined : Number(v.replace(',', '.')));
  const kind = ex?.kind ?? 'weight_reps';
  const prevTxt = prev ? (kind === 'duration' ? formatDuration(prev.durationSec ?? 0) : kind === 'distance' ? `${prev.distanceM ?? '-'}m` : `${prev.weight ? `${prev.weight}×` : ''}${prev.reps ?? 0}`) : '—';
  const weightInput = (
    <input inputMode="decimal" placeholder={prev?.weight?.toString() ?? ''} value={s.weight ?? ''} onChange={(e) => onChange({ weight: numVal(e.target.value) })} onDoubleClick={kind === 'weight_reps' ? onPlates : undefined} />
  );
  return (
    <div id={id} className={`set ${s.done ? 'done' : ''} ${isNext ? 'next' : ''} ${showRpe ? 'rpe' : ''}`}>
      <button className={`settype ${s.type}`} onClick={() => setTypeMenu(true)} title="Tipo de serie">
        {SET_LABEL[s.type] || n}
        {pr && <span className="pr-badge">🏆</span>}
      </button>
      <span className="muted small prev" onClick={() => prev && onChange({ weight: prev.weight, reps: prev.reps, durationSec: prev.durationSec, distanceM: prev.distanceM })}>
        {prevTxt}
      </span>
      {kind === 'distance' ? <input inputMode="decimal" placeholder={prev?.distanceM?.toString() ?? ''} value={s.distanceM ?? ''} onChange={(e) => onChange({ distanceM: numVal(e.target.value) })} /> : weightInput}
      {kind === 'duration' || kind === 'distance' ? (
        <div className="dur">
          <input inputMode="numeric" placeholder={prev?.durationSec ? `${prev.durationSec}s` : 's'} value={running ?? s.durationSec ?? ''} onChange={(e) => onChange({ durationSec: numVal(e.target.value) })} />
          <button className={`plain sw ${running !== undefined ? 'on' : ''}`} onClick={onStopwatch} aria-label="Cronómetro">
            {running !== undefined ? '■' : '▶'}
          </button>
        </div>
      ) : (
        <input inputMode="numeric" placeholder={prev?.reps?.toString() ?? ''} value={s.reps ?? ''} onChange={(e) => onChange({ reps: numVal(e.target.value) })} />
      )}
      {showRpe && (
        <select className="rpe-select" value={s.rpe ?? ''} onChange={(e) => onChange({ rpe: numVal(e.target.value) })}>
          <option value="">–</option>
          {RPE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      )}
      <button className={`check ${s.done ? 'on' : ''}`} onClick={onToggle} aria-label="Completar serie">
        ✓
      </button>
      {typeMenu && (
        <Sheet title="Tipo de serie" onClose={() => setTypeMenu(false)}>
          <div className="list">
            {SET_CYCLE.map((t) => (
              <button key={t} className={`item settype-item ${t}`} onClick={() => (onChange({ type: t }), setTypeMenu(false))}>
                <b>{SET_LABEL[t] || '1'}</b> {SET_NAMES[t]}
              </button>
            ))}
            {kind === 'weight_reps' && (
              <button className="item" onClick={() => (setTypeMenu(false), onPlates())}>
                🧮 Calculadora de discos
              </button>
            )}
            <button className="item danger" onClick={() => (onRemove(), setTypeMenu(false))}>
              🗑 Borrar serie
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
