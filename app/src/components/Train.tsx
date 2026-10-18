import { useEffect, useMemo, useState } from 'react';
import { workoutFromRoutine } from '../../../shared/data';
import { estimate1RM, exerciseHistory, personalRecords, workoutVolume } from '../../../shared/stats';
import type { Exercise, SetType, Workout, WorkoutSet } from '../../../shared/types';
import { uid } from '../../../shared/types';
import { useStore } from '../store';
import ExercisePicker from './ExercisePicker';

export default function Train() {
  const { active } = useStore();
  return active ? <ActiveWorkout /> : <StartScreen />;
}

function StartScreen() {
  const { data, setActive } = useStore();
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const week = data.workouts.filter((w) => w.startedAt >= weekAgo);
  return (
    <section>
      <h1>Entrenar</h1>
      <div className="stats">
        <div>
          <b>{week.length}</b>
          <small>entrenos esta semana</small>
        </div>
        <div>
          <b>{week.reduce((v, w) => v + workoutVolume(w), 0).toLocaleString('es-ES')}</b>
          <small>kg de volumen</small>
        </div>
        <div>
          <b>{data.workouts.length}</b>
          <small>en total</small>
        </div>
      </div>
      <button className="primary big" onClick={() => setActive({ id: uid(), name: 'Entrenamiento', startedAt: new Date().toISOString(), exercises: [] })}>
        + Empezar entrenamiento vacío
      </button>
      {data.routines.length > 0 && <h2>Empezar desde rutina</h2>}
      {data.routines.map((r) => (
        <div key={r.id} className="card row">
          <div className="grow">
            <b>{r.name}</b>
            <small className="muted"> · {r.exercises.length} ejercicios</small>
          </div>
          <button className="primary" onClick={() => setActive(workoutFromRoutine(r))}>
            Empezar
          </button>
        </div>
      ))}
    </section>
  );
}

const SET_CYCLE: SetType[] = ['normal', 'warmup', 'drop', 'failure'];
const SET_LABEL: Record<SetType, string> = { normal: '', warmup: 'C', drop: 'D', failure: 'F' };

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec % 60)).padStart(2, '0')}`;

function ActiveWorkout() {
  const { data, active, setActive, update } = useStore();
  const w = active!;
  const now = useNow();
  const [picking, setPicking] = useState(false);
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restSec, setRestSec] = useState(90);
  const exMap = useMemo(() => new Map(data.exercises.map((e) => [e.id, e])), [data.exercises]);
  const routine = data.routines.find((r) => r.id === w.routineId);

  const restLeft = restEnd ? Math.round((restEnd - now) / 1000) : 0;
  useEffect(() => {
    if (restEnd && restLeft <= 0) {
      navigator.vibrate?.([200, 100, 200]);
      setRestEnd(null);
    }
  }, [restEnd, restLeft]);

  const edit = (fn: (w: Workout) => void) =>
    setActive((cur) => {
      const n = structuredClone(cur);
      fn(n);
      return n;
    });

  const setField = (ei: number, si: number, patch: Partial<WorkoutSet>) => edit((n) => Object.assign(n.exercises[ei].sets[si], patch));

  const toggleDone = (ei: number, si: number) => {
    const s = w.exercises[ei].sets[si];
    const prev = previousSets(w.exercises[ei].exerciseId)[si];
    // Si el usuario no escribió nada, usa los valores de la sesión anterior (como placeholder).
    const patch: Partial<WorkoutSet> = { done: !s.done };
    if (!s.done && prev) {
      if (s.weight === undefined && prev.weight !== undefined) patch.weight = prev.weight;
      if (s.reps === undefined && prev.reps !== undefined) patch.reps = prev.reps;
      if (s.durationSec === undefined && prev.durationSec !== undefined) patch.durationSec = prev.durationSec;
    }
    setField(ei, si, patch);
    if (!s.done) {
      const rr = routine?.exercises.find((e) => e.exerciseId === w.exercises[ei].exerciseId)?.restSec ?? restSec;
      setRestEnd(Date.now() + rr * 1000);
    }
  };

  const previousSets = (exerciseId: string): WorkoutSet[] => {
    const h = exerciseHistory(data, exerciseId);
    return h.length ? h[h.length - 1].sets : [];
  };

  const finish = () => {
    const done: Workout = {
      ...w,
      endedAt: new Date().toISOString(),
      exercises: w.exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) })).filter((e) => e.sets.length),
    };
    if (!done.exercises.length) {
      if (confirm('No hay series completadas. ¿Descartar entrenamiento?')) setActive(null);
      return;
    }
    const before = new Map(personalRecords(data).map((p) => [p.exerciseId, p.best1RM]));
    const newPrs = done.exercises
      .map((e) => ({ e, best: Math.max(...e.sets.map((s) => estimate1RM(s.weight ?? 0, s.reps ?? 0))) }))
      .filter(({ e, best }) => best > 0 && best > (before.get(e.exerciseId) ?? 0) && before.has(e.exerciseId))
      .map(({ e, best }) => `${exMap.get(e.exerciseId)?.name}: ${best} kg e1RM`);
    update((d) => void d.workouts.push(done));
    setActive(null);
    alert(`¡Entrenamiento guardado! Volumen: ${workoutVolume(done)} kg${newPrs.length ? `\n\n🏆 Nuevos récords:\n${newPrs.join('\n')}` : ''}`);
  };

  return (
    <section className="active">
      <div className="row sticky">
        <input className="title" value={w.name} onChange={(e) => edit((n) => void (n.name = e.target.value))} />
        <span className="timer">{clock(Math.round((now - Date.parse(w.startedAt)) / 1000))}</span>
        <button className="primary" onClick={finish}>
          Terminar
        </button>
      </div>

      {w.exercises.map((we, ei) => {
        const ex = exMap.get(we.exerciseId);
        const prev = previousSets(we.exerciseId);
        return (
          <div key={ei} className="card">
            <div className="row">
              <b className="grow accent-text">{ex?.name ?? we.exerciseId}</b>
              <button className="ghost" onClick={() => edit((n) => void n.exercises.splice(ei, 1))} title="Quitar ejercicio">
                🗑
              </button>
            </div>
            <input className="notes" placeholder="Notas…" value={we.notes ?? ''} onChange={(e) => edit((n) => void (n.exercises[ei].notes = e.target.value))} />
            <div className="sets">
              <div className="set head">
                <span>Serie</span>
                <span>Anterior</span>
                <span>{kindLabels(ex)[0]}</span>
                <span>{kindLabels(ex)[1]}</span>
                <span>✓</span>
              </div>
              {we.sets.map((s, si) => (
                <SetRow key={si} n={si + 1} s={s} prev={prev[si]} ex={ex} onChange={(p) => setField(ei, si, p)} onToggle={() => toggleDone(ei, si)} onRemove={() => edit((n) => void n.exercises[ei].sets.splice(si, 1))} />
              ))}
            </div>
            <button
              className="ghost full"
              onClick={() =>
                edit((n) => {
                  const last = n.exercises[ei].sets.at(-1);
                  n.exercises[ei].sets.push({ type: 'normal', weight: last?.weight, reps: last?.reps, durationSec: last?.durationSec, done: false });
                })
              }
            >
              + Añadir serie
            </button>
          </div>
        );
      })}

      <button className="primary full" onClick={() => setPicking(true)}>
        + Añadir ejercicio
      </button>
      <button className="danger full" onClick={() => confirm('¿Descartar este entrenamiento?') && setActive(null)}>
        Descartar entrenamiento
      </button>

      {restEnd && (
        <div className="rest">
          <span>Descanso</span>
          <b>{clock(restLeft)}</b>
          <button onClick={() => setRestEnd(restEnd - 15000)}>-15</button>
          <button onClick={() => setRestEnd(restEnd + 15000)}>+15</button>
          <button onClick={() => setRestEnd(null)}>Saltar</button>
        </div>
      )}
      {!restEnd && (
        <label className="muted small">
          Descanso por defecto:{' '}
          <select value={restSec} onChange={(e) => setRestSec(Number(e.target.value))}>
            {[30, 60, 90, 120, 150, 180, 240, 300].map((s) => (
              <option key={s} value={s}>
                {clock(s)}
              </option>
            ))}
          </select>
        </label>
      )}

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(e) => {
            const prev = previousSets(e.id);
            edit((n) =>
              void n.exercises.push({
                exerciseId: e.id,
                sets: (prev.length ? prev : [{ type: 'normal' as SetType, done: false }, { type: 'normal' as SetType, done: false }, { type: 'normal' as SetType, done: false }]).map((p) => ({ type: p.type, done: false })),
              }),
            );
            setPicking(false);
          }}
        />
      )}
    </section>
  );
}

function kindLabels(ex?: Exercise): [string, string] {
  if (ex?.kind === 'duration') return ['', 'Seg'];
  if (ex?.kind === 'distance') return ['Metros', 'Seg'];
  if (ex?.kind === 'reps') return ['+kg', 'Reps'];
  return ['kg', 'Reps'];
}

function SetRow({ n, s, prev, ex, onChange, onToggle, onRemove }: { n: number; s: WorkoutSet; prev?: WorkoutSet; ex?: Exercise; onChange: (p: Partial<WorkoutSet>) => void; onToggle: () => void; onRemove: () => void }) {
  const numVal = (v: string) => (v === '' ? undefined : Number(v.replace(',', '.')));
  const kind = ex?.kind ?? 'weight_reps';
  const prevTxt = prev ? (kind === 'duration' ? `${prev.durationSec ?? '-'}s` : kind === 'distance' ? `${prev.distanceM ?? '-'}m` : `${prev.weight ?? 0}×${prev.reps ?? 0}`) : '—';
  return (
    <div className={`set ${s.done ? 'done' : ''}`}>
      <button className={`settype ${s.type}`} onClick={() => onChange({ type: SET_CYCLE[(SET_CYCLE.indexOf(s.type) + 1) % SET_CYCLE.length] })} onDoubleClick={onRemove} title="Toca para cambiar tipo (C=calentamiento, D=drop, F=fallo). Doble toque para borrar.">
        {SET_LABEL[s.type] || n}
      </button>
      <span className="muted small">{prevTxt}</span>
      {kind === 'duration' ? (
        <span />
      ) : kind === 'distance' ? (
        <input inputMode="decimal" placeholder={prev?.distanceM?.toString() ?? ''} value={s.distanceM ?? ''} onChange={(e) => onChange({ distanceM: numVal(e.target.value) })} />
      ) : (
        <input inputMode="decimal" placeholder={prev?.weight?.toString() ?? ''} value={s.weight ?? ''} onChange={(e) => onChange({ weight: numVal(e.target.value) })} />
      )}
      {kind === 'duration' || kind === 'distance' ? (
        <input inputMode="numeric" placeholder={prev?.durationSec?.toString() ?? ''} value={s.durationSec ?? ''} onChange={(e) => onChange({ durationSec: numVal(e.target.value) })} />
      ) : (
        <input inputMode="numeric" placeholder={prev?.reps?.toString() ?? ''} value={s.reps ?? ''} onChange={(e) => onChange({ reps: numVal(e.target.value) })} />
      )}
      <button className={`check ${s.done ? 'on' : ''}`} onClick={onToggle}>
        ✓
      </button>
    </div>
  );
}
