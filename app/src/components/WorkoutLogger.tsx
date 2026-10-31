import {
  Lightbulb,
  Play,
  Square,
  TrendingUp,
  ArrowUpDown,
  Calculator,
  Check,
  Flame,
  Heart,
  Link2,
  ListChecks,
  MoreHorizontal,
  Pin,
  Plus,
  RefreshCw,
  Scissors,
  Timer,
  Trash2,
  Trophy,
  Watch,
  Weight,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MUSCLE_LABELS } from '../../../shared/exercises';
import { nextPendingSet, toggleSet } from '../../../shared/session';
import { alignPrevious, estimate1RM, exerciseHistory, formatDuration, lastSessionSets, workoutSetCount, workoutVolume } from '../../../shared/stats';
import { platesFor, warmupSets } from '../../../shared/tools';
import type { Exercise, SetType, Workout, WorkoutExercise, WorkoutSet } from '../../../shared/types';
import { uid } from '../../../shared/types';
import { rest, useRest } from '../rest';
import { suggestNext } from '../../../shared/progression';
import { useHeartRate } from '../hr';
import { toast } from '../toast';
import { clock, useNow, useStore, useWakeLock } from '../store';
import RestPicker from './RestPicker';
import DevicesSheet from './DevicesSheet';
import ExercisePicker from './ExercisePicker';
import ExerciseInfo from './ExerciseInfo';
import { ExerciseMedia, NumberField, Sheet, WeightField } from './ui';
import { DEFAULT_BAR_LB, DEFAULT_PLATES_LB, fmtMass, fmtWeight, fromUnit, toUnit, weightUnit } from '../../../shared/units';
import { ReorderSheet, moveItem } from './Reorder';

const SET_CYCLE: SetType[] = ['normal', 'warmup', 'drop', 'failure'];
const SET_LABEL: Record<SetType, string> = { normal: '', warmup: 'C', drop: 'D', failure: 'F' };
const SET_NAMES: Record<SetType, string> = { normal: 'Normal', warmup: 'Calentamiento', drop: 'Drop set', failure: 'Al fallo' };
const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

type Edit = (fn: (w: Workout) => void) => void;

// Registro de un entrenamiento. mode="live": en curso (cronómetro, descansos). mode="edit": editar uno ya guardado.
export default function WorkoutLogger({
  workout: w,
  edit,
  mode,
  onFinish,
  onDiscard,
  onExercise,
}: {
  workout: Workout;
  edit: Edit;
  mode: 'live' | 'edit';
  onFinish: () => void;
  onDiscard: () => void;
  onExercise?: (id: string) => void;
}) {
  const { data, settings } = useStore();
  const now = useNow();
  const restState = useRest();
  const [picker, setPicker] = useState<{ replace?: number } | null>(null);
  const [menu, setMenu] = useState<number | null>(null);
  const [reorder, setReorder] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
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
      out.set(id, {
        prev: lastSessionSets(data, id, w.startedAt, w.id),
        best1RM: Math.max(0, ...h.map((s) => s.best1RM)),
        bestWeight: Math.max(0, ...h.map((s) => s.bestWeight)),
        maxReps: Math.max(0, ...h.map((s) => s.maxReps)),
      });
    }
    return out;
  }, [data, w.id, w.startedAt, w.exercises]);

  const setField = (ei: number, si: number, patch: Partial<WorkoutSet>) => edit((n) => void Object.assign(n.exercises[ei].sets[si], patch));

  // Serie cuyo ✓ arrancó el descanso actual: si se desmarca, el descanso se cancela.
  const restFrom = useRef<string | null>(null);
  const toggleDone = (ei: number, si: number) => {
    const wasDone = w.exercises[ei].sets[si].done;
    if (!wasDone && settings.vibrate) navigator.vibrate?.(25);
    // Si el cronómetro de esta serie está en marcha, su tiempo es el de la serie.
    const running = stopwatch?.ei === ei && stopwatch.si === si ? { durationSec: Math.round((Date.now() - stopwatch.start) / 1000) } : {};
    if (running.durationSec !== undefined) setStopwatch(null);
    const r = toggleSet(data, w, ei, si, running);
    edit((n) => void Object.assign(n, structuredClone(r.workout)));
    const key = `${ei}:${si}`;
    if (mode === 'live' && r.restSec > 0) {
      rest.start(r.restSec);
      restFrom.current = key;
    } else if (mode === 'live' && wasDone && restFrom.current === key && rest.get().end) {
      rest.stop();
      restFrom.current = null;
    }
    // Lleva la vista a la siguiente serie pendiente.
    const nx = nextPendingSet(r.workout);
    if (mode === 'live' && nx && !w.exercises[ei].sets[si].done) setTimeout(() => document.getElementById(`set-${nx.ei}-${nx.si}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  };
  const cursor = mode === 'live' ? nextPendingSet(w) : null;
  const nextLabel = (() => {
    if (!cursor) return '';
    const we = w.exercises[cursor.ei];
    const s = we.sets[cursor.si];
    const prev = alignPrevious(we.sets, history.get(we.exerciseId)?.prev ?? [])[cursor.si];
    const wt = s.weight ?? prev?.weight;
    const reps = s.reps ?? prev?.reps;
    return `${exMap.get(we.exerciseId)?.name ?? ''}${wt || reps ? ` · ${wt ? `${fmtWeight(wt)} × ` : ''}${reps ?? ''}` : ''}`;
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

  const replaceExercise = (ei: number, e: Exercise) =>
    // Se conservan las series (y las ya hechas): reemplazar sirve sobre todo para corregir el ejercicio elegido.
    edit((n) => void (n.exercises[ei] = { ...n.exercises[ei], exerciseId: e.id }));

  const elapsed = Math.round((now - Date.parse(w.startedAt)) / 1000);
  const totals = { sets: workoutSetCount(w), planned: w.exercises.reduce((n, e) => n + e.sets.length, 0), volume: workoutVolume(w, data.exercises) };

  return (
    <section className={`active ${mode === 'live' && restState.end && restLeft > 0 ? 'resting' : ''}`}>
      <div className="sticky">
        <div className="row">
          <input className="title grow" aria-label="Nombre del entrenamiento" value={w.name} onChange={(e) => edit((n) => void (n.name = e.target.value))} />
          <button className="primary" onClick={onFinish}>
            {mode === 'live' ? 'Terminar' : 'Guardar'}
          </button>
        </div>
        <div className="row live-stats small muted">
          {mode === 'live' && (
            <span className="icon-btn">
              <Timer size={14} /> {formatDuration(elapsed)}
            </span>
          )}
          {mode === 'live' && hr.live && (
            <span className="hr-live">
              <Heart size={16} className="ico" /> {hr.bpm}
            </span>
          )}
          <span className="icon-btn">
            <Weight size={14} /> {fmtMass(totals.volume)}
          </span>
          <span className="icon-btn">
            <ListChecks size={14} /> {mode === 'live' && totals.planned ? `${totals.sets}/${totals.planned}` : totals.sets} series
          </span>
          {mode === 'live' && (
            <button className="ghost small devices-btn" onClick={() => setDevices(true)} aria-label="Reloj y sensores">
              <Watch size={18} />
            </button>
          )}
        </div>
        {mode === 'live' && totals.planned > 0 && (
          <div className="wprog" role="progressbar" aria-label="Series completadas" aria-valuemin={0} aria-valuemax={totals.planned} aria-valuenow={totals.sets}>
            <i style={{ width: `${(totals.sets / totals.planned) * 100}%` }} />
          </div>
        )}
      </div>

      {mode === 'edit' && <EditTimes w={w} edit={edit} />}
      <textarea className="notes" rows={1} placeholder="Notas del entrenamiento…" value={w.notes ?? ''} onChange={(e) => edit((n) => void (n.notes = e.target.value || undefined))} />

      {!w.exercises.length && <p className="muted center-text">Añade tu primer ejercicio para empezar.</p>}

      {w.exercises.map((we, ei) => {
        const ex = exMap.get(we.exerciseId);
        const h = history.get(we.exerciseId);
        const aligned = alignPrevious(we.sets, h?.prev ?? []);
        const ssPrev = ei > 0 && we.supersetId && w.exercises[ei - 1].supersetId === we.supersetId;
        const ssNext = we.supersetId && w.exercises[ei + 1]?.supersetId === we.supersetId;
        const kind = ex?.kind ?? 'weight_reps';
        const u = weightUnit();
        const [c1, c2] = kind === 'duration' ? [u, 'Tiempo'] : kind === 'distance' ? ['Metros', 'Tiempo'] : kind === 'reps' ? [`+${u}`, 'Reps'] : kind === 'assisted' ? [`-${u}`, 'Reps'] : [u, 'Reps'];
        return (
          <div key={ei} className={`card excard ${we.supersetId ? 'superset' : ''} ${ssPrev ? 'ss-mid' : ''} ${ssNext ? 'ss-next' : ''}`}>
            {we.supersetId && !ssPrev && <div className="ss-label">Superserie</div>}
            <div className="row">
              <button className="plain row grow left exinfo-open" aria-label={`Ver cómo se hace ${ex?.name ?? ''}`} disabled={!ex} onClick={() => setInfo(we.exerciseId)}>
                <ExerciseMedia exercise={ex} size="thumb" />
                <b className="grow">{ex?.name ?? we.exerciseId}</b>
              </button>
              <button className="ghost" onClick={() => setMenu(ei)} aria-label="Opciones">
                <MoreHorizontal size={20} />
              </button>
            </div>
            {ex?.stickyNote && (
              <p className="sticky-note small">
                <Pin size={16} className="ico" /> {ex.stickyNote}
              </p>
            )}
            {mode === 'live' && (
              <SuggestionChip we={we} ex={ex} prev={h?.prev ?? []} onApply={(p) => edit((n) => n.exercises[ei].sets.forEach((s) => !s.done && s.type !== 'warmup' && Object.assign(s, p)))} />
            )}
            <input className="notes" placeholder="Notas…" value={we.notes ?? ''} onChange={(e) => edit((n) => void (n.exercises[ei].notes = e.target.value || undefined))} />
            {mode === 'live' && <RestPicker value={we.restSec ?? settings.defaultRestSec} onChange={(v) => edit((n) => void (n.exercises[ei].restSec = v))} />}
            <div className="exprog" role="progressbar" aria-label="Series completadas" aria-valuemin={0} aria-valuemax={we.sets.length} aria-valuenow={we.sets.filter((x) => x.done).length}>
              <div style={{ width: `${we.sets.length ? (100 * we.sets.filter((x) => x.done).length) / we.sets.length : 0}%` }} />
            </div>
            <div className={`sets ${settings.showRpe ? 'rpe' : ''}`}>
              <div className="set head">
                <span>Serie</span>
                <span>Anterior</span>
                <span>{c1}</span>
                <span>{c2}</span>
                {settings.showRpe && <span>RPE</span>}
                <span>
                  <Check size={14} aria-label="Hecha" />
                </span>
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
                  onRemove={() => {
                    // Deshacer vuelve a meter solo esa serie (no revierte lo que hayas hecho después).
                    const removed = structuredClone(we.sets[si]);
                    const exId = we.exerciseId;
                    setStopwatch(null);
                    edit((n) => void n.exercises[ei].sets.splice(si, 1));
                    toast.undo('Serie borrada', () =>
                      edit((n) => {
                        const target = n.exercises[ei]?.exerciseId === exId ? n.exercises[ei] : n.exercises.find((x) => x.exerciseId === exId);
                        target?.sets.splice(Math.min(si, target.sets.length), 0, removed);
                      }),
                    );
                  }}
                  onPlates={() => setPlates(s.weight ?? aligned[si]?.weight ?? 0)}
                />
              ))}
            </div>
            <button
              className="ghost full icon-btn"
              onClick={() =>
                edit((n) => {
                  const last = n.exercises[ei].sets.at(-1);
                  n.exercises[ei].sets.push({
                    type: last?.type === 'warmup' ? 'normal' : (last?.type ?? 'normal'),
                    weight: last?.weight,
                    reps: last?.reps,
                    durationSec: last?.durationSec,
                    distanceM: last?.distanceM,
                    done: false,
                  });
                })
              }
            >
              <Plus size={16} /> Añadir serie
            </button>
          </div>
        );
      })}

      <button className="primary full icon-btn" onClick={() => setPicker({})}>
        <Plus size={18} strokeWidth={2.6} /> Añadir ejercicio
      </button>
      <button className="danger full" onClick={() => confirm(mode === 'live' ? '¿Descartar este entrenamiento?' : '¿Descartar los cambios?') && onDiscard()}>
        {mode === 'live' ? 'Descartar entrenamiento' : 'Descartar cambios'}
      </button>

      {mode === 'live' && restState.end && restLeft > 0 && (
        <div className="rest" role="timer" aria-label="Descanso">
          <div className="rest-progress" style={{ width: `${(restLeft / Math.max(1, restState.total)) * 100}%` }} />
          <div className="rest-main">
            <span>Descanso</span>
            <b>{clock(restLeft)}</b>
            {nextLabel && <small className="rest-next">Siguiente: {nextLabel}</small>}
          </div>
          <button onClick={() => rest.add(-15)} aria-label="Quitar 15 segundos">
            −15
          </button>
          <button onClick={() => rest.add(15)} aria-label="Añadir 15 segundos">
            +15
          </button>
          <button className="rest-skip" onClick={rest.stop}>
            Saltar
          </button>
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
      {info && <ExerciseInfo id={info} onClose={() => setInfo(null)} onFull={onExercise && ((id) => (setInfo(null), onExercise(id)))} />}
      {menu !== null && w.exercises[menu] && (
        <ExerciseMenu
          w={w}
          ei={menu}
          edit={(fn) => (setStopwatch(null), edit(fn))}
          onClose={() => setMenu(null)}
          onReplace={() => (setPicker({ replace: menu }), setMenu(null))}
          onReorder={() => (setMenu(null), setReorder(true))}
        />
      )}
      {reorder && (
        <ReorderSheet
          items={w.exercises}
          keyOf={(we, i) => `${we.exerciseId}-${w.exercises.slice(0, i).filter((x) => x.exerciseId === we.exerciseId).length}`}
          render={(we) => {
            const e = data.exercises.find((x) => x.id === we.exerciseId);
            return (
              <span className="row">
                <ExerciseMedia exercise={e} size="thumb" />
                <span className="grow">
                  <b>{e?.name ?? we.exerciseId}</b>
                  <small className="muted">
                    {' '}
                    · {we.sets.length} {we.sets.length === 1 ? 'serie' : 'series'}
                  </small>
                </span>
              </span>
            );
          }}
          onMove={(from, to) => (setStopwatch(null), edit((n) => void (n.exercises = moveItem(n.exercises, from, to))))}
          onClose={() => setReorder(false)}
        />
      )}
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
        <input
          type="datetime-local"
          value={local(w.startedAt)}
          onChange={(e) =>
            e.target.value &&
            edit((n) => {
              const start = new Date(e.target.value);
              n.startedAt = start.toISOString();
              n.endedAt = new Date(start.getTime() + dur * 60000).toISOString();
            })
          }
        />
      </label>
      <label className="dur-field">
        Duración (min)
        <input inputMode="numeric" value={dur} onChange={(e) => edit((n) => void (n.endedAt = new Date(Date.parse(n.startedAt) + (Number(e.target.value) || 0) * 60000).toISOString()))} />
      </label>
    </div>
  );
}

function ExerciseMenu({ w, ei, edit, onClose, onReplace, onReorder }: { w: Workout; ei: number; edit: Edit; onClose: () => void; onReplace: () => void; onReorder: () => void }) {
  const { data, settings } = useStore();
  const we = w.exercises[ei];
  const ex = data.exercises.find((e) => e.id === we.exerciseId);
  const next = w.exercises[ei + 1];
  const work = we.sets.find((s) => s.type !== 'warmup');
  const workWeight = work?.weight ?? exerciseHistory(data, we.exerciseId).at(-1)?.bestWeight ?? 0;
  return (
    <Sheet title={ex?.name} onClose={onClose}>
      <p className="muted small">{ex && MUSCLE_LABELS[ex.muscle]}</p>
      <RestPicker value={we.restSec ?? settings.defaultRestSec} onChange={(v) => edit((n) => void (n.exercises[ei].restSec = v))} />
      <div className="list">
        {ex?.kind === 'weight_reps' && workWeight > 0 && (
          <button
            className="item icon-btn"
            onClick={() => {
              // Se calcula en la unidad visible (redondeo a 2,5 kg o 5 lb) y se guarda en kg.
              const lb = weightUnit() === 'lb';
              const ws = warmupSets(toUnit(workWeight), lb ? (settings.barLb ?? DEFAULT_BAR_LB) : settings.barKg, lb ? 5 : 2.5);
              edit((n) => void n.exercises[ei].sets.unshift(...ws.map((s) => ({ type: 'warmup' as SetType, weight: fromUnit(s.weight), reps: s.reps, done: false }))));
              onClose();
            }}
          >
            <Flame size={16} /> Añadir series de calentamiento (hasta {fmtWeight(workWeight)})
          </button>
        )}
        {next && (
          <button
            className="item icon-btn"
            onClick={() => {
              edit((n) => {
                const id = n.exercises[ei].supersetId ?? n.exercises[ei + 1].supersetId ?? uid();
                n.exercises[ei].supersetId = id;
                n.exercises[ei + 1].supersetId = id;
              });
              onClose();
            }}
          >
            <Link2 size={16} /> Hacer superserie con el siguiente
          </button>
        )}
        {we.supersetId && (
          <button className="item icon-btn" onClick={() => (edit((n) => void (n.exercises[ei].supersetId = undefined)), onClose())}>
            <Scissors size={16} /> Quitar de la superserie
          </button>
        )}
        <button className="item icon-btn" onClick={onReplace}>
          <RefreshCw size={16} /> Reemplazar ejercicio
        </button>
        <button className="item icon-btn" disabled={w.exercises.length < 2} onClick={onReorder}>
          <ArrowUpDown size={16} /> Reordenar ejercicios
        </button>
        <button
          className="item danger icon-btn"
          onClick={() => {
            const removed = structuredClone(we);
            edit((n) => void n.exercises.splice(ei, 1));
            toast.undo(`${ex?.name ?? 'Ejercicio'} quitado`, () => edit((n) => void n.exercises.splice(Math.min(ei, n.exercises.length), 0, removed)));
            onClose();
          }}
        >
          <Trash2 size={16} /> Quitar ejercicio
        </button>
      </div>
    </Sheet>
  );
}

export function PlateCalculator({ initial, onClose }: { initial: number; onClose: () => void }) {
  const { settings } = useStore();
  // Trabaja en la unidad visible: en lb usa barra de 45 y discos en libras.
  const u = weightUnit();
  const lb = u === 'lb';
  const [target, setTarget] = useState<number | undefined>(initial ? toUnit(initial) : undefined);
  const [bar, setBar] = useState(lb ? (settings.barLb ?? DEFAULT_BAR_LB) : settings.barKg);
  const r = platesFor(target ?? 0, bar, lb ? (settings.platesLb ?? DEFAULT_PLATES_LB) : settings.platesKg);
  const asKg = (p: number) => fromUnit(p, u);
  return (
    <Sheet title="Calculadora de discos" onClose={onClose}>
      <div className="row plate-form">
        <label className="grow">
          Peso total ({u})
          <NumberField value={target} onChange={setTarget} autoFocus />
        </label>
        <label>
          Barra
          <select value={bar} onChange={(e) => setBar(Number(e.target.value))}>
            {(lb ? [45, 35, 25, 15, 0] : [20, 15, 10, 7, 0]).map((b) => (
              <option key={b} value={b}>
                {b} {u}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="plates">
        <div className="barbell" />
        {r.perSide.map((p, i) => {
          const k = asKg(p); // el color y el tamaño siguen el estándar en kg
          return (
            <div key={i} className={`plate p${k >= 24 ? 25 : k >= 19 ? 20 : k >= 14 ? 15 : k >= 9 ? 10 : k >= 5 ? 5 : k >= 2 ? 2 : 1}`} style={{ height: `${40 + k * 3}px` }}>
              {String(p).replace('.', ',')}
            </div>
          );
        })}
      </div>
      <p>
        Por lado: <b>{r.perSide.length ? r.perSide.map((p) => String(p).replace('.', ',')).join(' + ') : '—'}</b>
      </p>
      <p className="muted small">
        Total cargado: {String(r.achieved).replace('.', ',')} {u}
        {r.remainder ? ` (faltan ${String(r.remainder).replace('.', ',')} ${u} con tus discos)` : ''}. Configura tus discos en Ajustes.
      </p>
    </Sheet>
  );
}

function SetRow(props: {
  id: string;
  isNext: boolean;
  n: number;
  s: WorkoutSet;
  prev?: WorkoutSet;
  ex?: Exercise;
  pr: boolean;
  showRpe: boolean;
  running?: number;
  onStopwatch: () => void;
  onChange: (p: Partial<WorkoutSet>) => void;
  onToggle: () => void;
  onRemove: () => void;
  onPlates: () => void;
}) {
  const { id, isNext, n, s, prev, ex, pr, showRpe, running, onStopwatch, onChange, onToggle, onRemove, onPlates } = props;
  const [typeMenu, setTypeMenu] = useState(false);
  const swipe = useSwipeSet(onRemove, onToggle);
  const numVal = (v: string) => (v === '' ? undefined : Number(v.replace(',', '.')));
  const kind = ex?.kind ?? 'weight_reps';
  const prevTxt = prev
    ? kind === 'duration'
      ? formatDuration(prev.durationSec ?? 0)
      : kind === 'distance'
        ? `${prev.distanceM ?? '-'}m`
        : `${prev.weight ? `${String(toUnit(prev.weight)).replace('.', ',')} × ` : ''}${prev.reps ?? 0}`
    : '—';
  const weightInput = (
    <WeightField
      aria-label={kind === 'assisted' ? `Asistencia (${weightUnit()})` : `Peso (${weightUnit()})`}
      placeholder={prev?.weight ? String(toUnit(prev.weight)).replace('.', ',') : ''}
      kg={s.weight}
      onChange={(weight) => onChange({ weight })}
      onDoubleClick={kind === 'weight_reps' ? onPlates : undefined}
    />
  );
  return (
    <div className={`swipe ${swipe.armed ? `armed ${swipe.armed}` : ''} ${swipe.dir ?? ''}`}>
      <div className="swipe-bg" aria-hidden="true">
        <Trash2 size={18} /> Borrar
      </div>
      <div className="swipe-bg to-done" aria-hidden="true">
        <Check size={18} strokeWidth={3} /> {s.done ? 'Desmarcar' : 'Hecha'}
      </div>
      <div id={id} className={`set ${s.done ? 'done' : ''} ${isNext ? 'next' : ''} ${showRpe ? 'rpe' : ''}`} {...swipe.handlers} style={swipe.style}>
        <button className={`settype ${s.type}`} onClick={() => setTypeMenu(true)} title="Tipo de serie">
          {SET_LABEL[s.type] || n}
          {pr && (
            <span className="pr-badge" role="img" aria-label="Récord" title="Récord">
              <Trophy size={12} aria-hidden />
            </span>
          )}
        </button>
        <span className="muted small prev" onClick={() => prev && onChange({ weight: prev.weight, reps: prev.reps, durationSec: prev.durationSec, distanceM: prev.distanceM })}>
          {prevTxt}
        </span>
        {kind === 'distance' ? (
          <NumberField aria-label="Distancia (m)" placeholder={prev?.distanceM?.toString() ?? ''} value={s.distanceM} onChange={(distanceM) => onChange({ distanceM })} />
        ) : (
          weightInput
        )}
        {kind === 'duration' || kind === 'distance' ? (
          <div className="dur">
            <NumberField
              decimals={false}
              aria-label="Tiempo (s)"
              placeholder={prev?.durationSec ? `${prev.durationSec}s` : 's'}
              value={running ?? s.durationSec}
              onChange={(durationSec) => onChange({ durationSec })}
            />
            <button className={`plain sw ${running !== undefined ? 'on' : ''}`} onClick={onStopwatch} aria-label="Cronómetro">
              {running !== undefined ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>
          </div>
        ) : (
          <NumberField decimals={false} aria-label="Repeticiones" placeholder={prev?.reps?.toString() ?? ''} value={s.reps} onChange={(reps) => onChange({ reps })} />
        )}
        {showRpe && (
          <select aria-label="RPE" className="rpe-select" value={s.rpe ?? ''} onChange={(e) => onChange({ rpe: numVal(e.target.value) })}>
            <option value="">–</option>
            {RPE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}
        <button className={`check ${s.done ? 'on' : ''}`} onClick={onToggle} aria-label="Completar serie" aria-pressed={!!s.done}>
          <Check size={20} strokeWidth={3} />
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
                <button className="item icon-btn" onClick={() => (setTypeMenu(false), onPlates())}>
                  <Calculator size={16} /> Calculadora de discos
                </button>
              )}
              <button className="item danger icon-btn" onClick={() => (onRemove(), setTypeMenu(false))}>
                <Trash2 size={16} /> Borrar serie
              </button>
            </div>
          </Sheet>
        )}
      </div>
    </div>
  );
}

// Deslizar una serie a la izquierda la borra (como en Hevy) y a la derecha la marca como hecha (o la desmarca).
// Solo actúa en gestos horizontales, así que el scroll vertical y escribir en los campos siguen funcionando igual.
const SWIPE_DELETE_PX = 96;
const SWIPE_DONE_PX = 72;
function useSwipeSet(onDelete: () => void, onToggle: () => void) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const g = useRef<{ x: number; y: number; id: number; active: boolean } | null>(null);
  const swiped = useRef(false);
  const armed = dx <= -SWIPE_DELETE_PX ? 'delete' : dx >= SWIPE_DONE_PX ? 'done' : null;
  useEffect(() => {
    if (armed) navigator.vibrate?.(12);
  }, [armed]);
  const end = () => {
    const active = g.current?.active;
    g.current = null;
    if (!active) return;
    setDragging(false);
    swiped.current = true;
    setTimeout(() => (swiped.current = false), 50);
    if (armed === 'delete') {
      setDx(-window.innerWidth);
      setTimeout(() => (onDelete(), setDx(0)), 180);
    } else {
      if (armed === 'done') onToggle();
      setDx(0);
    }
  };
  return {
    armed,
    dir: dx > 0 ? 'right' : dx < 0 ? 'left' : null,
    style: dx ? { transform: `translateX(${dx}px)`, transition: dragging ? 'none' : 'transform 0.18s var(--ease)' } : undefined,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        g.current = { x: e.clientX, y: e.clientY, id: e.pointerId, active: false };
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
        const st = g.current;
        if (!st || st.id !== e.pointerId) return;
        const mx = e.clientX - st.x;
        const my = e.clientY - st.y;
        if (!st.active) {
          if (Math.abs(my) > 10) return void (g.current = null); // es scroll vertical
          if (Math.abs(mx) < 12 || Math.abs(mx) < Math.abs(my) * 1.5) return;
          st.active = true;
          setDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
        }
        // Hacia la derecha se frena pasado el umbral: basta con armarlo.
        setDx(mx > 0 ? Math.min(mx, SWIPE_DONE_PX + (mx - SWIPE_DONE_PX) * 0.25) : mx);
      },
      onPointerUp: end,
      onPointerCancel: end,
      // Tras deslizar no se dispara el clic del botón o campo donde empezó el gesto.
      onClickCapture: (e: React.MouseEvent) => swiped.current && e.stopPropagation(),
    },
  };
}

// "Hoy: 82,5 kg × 8" (o en lb) — sobrecarga progresiva según la última sesión. Un toque lo aplica a las series pendientes.
function SuggestionChip({ we, ex, prev, onApply }: { we: WorkoutExercise; ex?: Exercise; prev: WorkoutSet[]; onApply: (p: Partial<WorkoutSet>) => void }) {
  const [open, setOpen] = useState(false);
  const pending = we.sets.filter((s) => !s.done && s.type !== 'warmup');
  if (!pending.length) return null;
  const sug = suggestNext(prev, ex, pending[0].reps);
  if (!sug) return null;
  const label = sug.durationSec ? `${sug.durationSec}s` : `${sug.weight ? `${fmtWeight(sug.weight)} × ` : ''}${sug.reps ?? ''}`;
  const applied = pending.every(
    (s) => (sug.weight === undefined || s.weight === sug.weight) && (sug.reps === undefined || s.reps === sug.reps) && (sug.durationSec === undefined || s.durationSec === sug.durationSec),
  );
  return (
    <div className={`suggestion ${sug.action}`}>
      <button className="plain grow left" onClick={() => setOpen(!open)}>
        {sug.action === 'up' ? <TrendingUp size={16} className="ico" /> : <Lightbulb size={16} className="ico" />} Hoy: <b>{label}</b>
        {open && <div className="small muted">{sug.reason}</div>}
      </button>
      <button
        className="ghost small"
        disabled={applied}
        onClick={() => (onApply({ weight: sug.weight, reps: sug.reps, durationSec: sug.durationSec }), toast.show('Sugerencia aplicada a las series pendientes'))}
      >
        {applied ? <Check size={16} aria-label="Aplicada" /> : 'Aplicar'}
      </button>
    </div>
  );
}
