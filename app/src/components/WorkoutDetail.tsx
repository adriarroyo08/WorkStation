import { useState } from 'react';
import { MUSCLE_REGION } from '../../../shared/exercises';
import { repeatWorkout, routineFromWorkout } from '../../../shared/data';
import { formatDuration, formatSet, muscleSets, prEvents, workoutDurationMin, workoutReps, workoutSetCount, workoutVolume } from '../../../shared/stats';
import type { MuscleGroup, Workout } from '../../../shared/types';
import { workoutImage } from '../share';
import { fmtCompact, fmtDate, fmtTime, shareOrDownload, useStore } from '../store';
import { bestSetText } from '../summary';
import { Back, ExerciseMedia, HBars, PrList, Stat } from './ui';
import WorkoutLogger from './WorkoutLogger';

// Detalle de un entrenamiento guardado. `justFinished` muestra la pantalla de "¡Buen trabajo!".
export default function WorkoutDetail({ id, onBack, justFinished = false, onExercise, goTrain }: { id: string; onBack: () => void; justFinished?: boolean; onExercise?: (id: string) => void; goTrain?: () => void }) {
  const { data, update, active, setActive } = useStore();
  const w = data.workouts.find((x) => x.id === id);
  const [editing, setEditing] = useState<Workout | null>(null);
  if (!w) return <Back onClick={onBack} />;

  if (editing)
    return (
      <WorkoutLogger
        workout={editing}
        mode="edit"
        edit={(fn) =>
          setEditing((cur) => {
            const n = structuredClone(cur!);
            fn(n);
            return n;
          })
        }
        onFinish={() => {
          const clean = { ...editing, exercises: editing.exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) })).filter((e) => e.sets.length) };
          update((d) => void (d.workouts[d.workouts.findIndex((x) => x.id === id)] = clean));
          setEditing(null);
        }}
        onDiscard={() => setEditing(null)}
      />
    );

  const ex = new Map(data.exercises.map((e) => [e.id, e]));
  const prs = prEvents(data).filter((e) => e.workoutId === id);
  const regions = new Map<string, number>();
  for (const [m, n] of Object.entries(muscleSets(data, [w], false))) regions.set(MUSCLE_REGION[m as MuscleGroup], (regions.get(MUSCLE_REGION[m as MuscleGroup]) ?? 0) + n);
  const totalSets = [...regions.values()].reduce((a, b) => a + b, 0) || 1;
  const routine = data.routines.find((r) => r.id === w.routineId);
  const count = [...data.workouts].sort((a, b) => a.startedAt.localeCompare(b.startedAt)).findIndex((x) => x.id === id) + 1;

  const share = async () => shareOrDownload(await workoutImage(data, w), `entreno-${w.startedAt.slice(0, 10)}.png`, w.name);

  return (
    <section>
      <Back onClick={onBack} label={justFinished ? 'Listo' : 'Volver'} right={<button className="ghost" onClick={() => setEditing(structuredClone(w))}>Editar</button>} />
      {justFinished && (
        <div className="congrats">
          <div className="big-emoji">💪</div>
          <h1>¡Buen trabajo!</h1>
          <p className="muted">Este es tu entrenamiento nº {count}.</p>
        </div>
      )}
      {!justFinished && <h1>{w.name}</h1>}
      <p className="muted small">
        {fmtDate(w.startedAt)} · {fmtTime(w.startedAt)}
        {routine ? ` · Rutina: ${routine.name}` : ''}
      </p>
      <div className="stats four">
        <Stat value={formatDuration(workoutDurationMin(w) * 60)} label="duración" />
        <Stat value={fmtCompact(workoutVolume(w))} label="kg volumen" />
        <Stat value={workoutSetCount(w)} label="series" />
        <Stat value={prs.length} label="récords" />
      </div>
      {w.notes && <p className="card small">{w.notes}</p>}

      {prs.length > 0 && (
        <div className="card">
          <h3>🏆 Récords batidos</h3>
          <PrList prs={prs.map((p) => ({ ...p, exerciseName: ex.get(p.exerciseId)?.name ?? p.exerciseId }))} />
        </div>
      )}

      <div className="card">
        <h3>Distribución muscular</h3>
        <HBars rows={[...regions.entries()].sort((a, b) => b[1] - a[1]).map(([label, v]) => ({ label, value: Math.round((v / totalSets) * 100) }))} format={(v) => `${v}%`} />
      </div>

      {w.exercises.map((we, i) => {
        const e = ex.get(we.exerciseId);
        return (
          <div key={i} className={`card ${we.supersetId ? 'superset' : ''}`}>
            <div className="row" onClick={() => onExercise?.(we.exerciseId)}>
              <ExerciseMedia exercise={e} size="thumb" />
              <div className="grow">
                <b className="accent-text">{e?.name ?? we.exerciseId}</b>
                <div className="muted small">{bestSetText(we, e)}</div>
              </div>
            </div>
            {we.notes && <p className="muted small">{we.notes}</p>}
            <ol className="setlist">
              {we.sets.map((s, j) => (
                <li key={j} className={s.type}>
                  {formatSet(s, e)}
                </li>
              ))}
            </ol>
          </div>
        );
      })}
      <p className="muted small">Repeticiones totales: {workoutReps(w)}</p>

      <div className="actions">
        <button className="primary full" onClick={share}>
          📤 Compartir imagen
        </button>
        <button
          className="ghost full"
          onClick={() => {
            if (active && !confirm('Ya hay un entrenamiento en curso. ¿Reemplazarlo?')) return;
            setActive(repeatWorkout(w));
            goTrain?.();
          }}
        >
          🔁 Repetir entrenamiento
        </button>
        {routine ? (
          <button
            className="ghost full"
            onClick={() => {
              if (!confirm(`¿Actualizar la rutina "${routine.name}" con los ejercicios, series y pesos de hoy?`)) return;
              update((d) => {
                const i = d.routines.findIndex((r) => r.id === routine.id);
                d.routines[i] = { ...routineFromWorkout(w, d.settings.defaultRestSec), id: routine.id, name: routine.name, notes: routine.notes, folderId: routine.folderId };
              });
              alert('Rutina actualizada.');
            }}
          >
            📋 Actualizar rutina “{routine.name}”
          </button>
        ) : null}
        <button
          className="ghost full"
          onClick={() => {
            const name = prompt('Nombre de la nueva rutina', w.name);
            if (!name) return;
            update((d) => void d.routines.push({ ...routineFromWorkout(w, d.settings.defaultRestSec), name }));
            alert('Rutina guardada.');
          }}
        >
          ➕ Guardar como nueva rutina
        </button>
        <button className="danger full" onClick={() => confirm('¿Borrar este entrenamiento?') && (update((d) => void (d.workouts = d.workouts.filter((x) => x.id !== id))), onBack())}>
          Borrar entrenamiento
        </button>
      </div>
    </section>
  );
}
