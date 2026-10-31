import { Award, BookmarkPlus, Dumbbell, Heart, RefreshCw, Repeat, Share2, Trophy } from 'lucide-react';
import { ask } from '../dialog';
import { useState } from 'react';
import { MUSCLE_REGION } from '../../../shared/exercises';
import { repeatWorkout, routineFromWorkout } from '../../../shared/data';
import { formatDuration, formatSet, muscleSets, prEvents, workoutDurationMin, workoutReps, workoutSetCount, workoutVolume } from '../../../shared/stats';
import type { MuscleGroup, Workout } from '../../../shared/types';
import { launchWorkout } from '../controller';
import { toast } from '../toast';
import { fmtDate, fmtTime, shareOrDownload, useStore } from '../store';
import { bestSetText } from '../summary';
import { newlyUnlocked } from '../../../shared/achievements';
import { AchievementBadge } from './Achievements';
import { SessionMap } from './BodyMap';
import LineChart from './LineChart';
import { Back, Delta, ExerciseMedia, HBars, PrList, Stat } from './ui';
import { compareWithPrevious } from '../../../shared/planning';
import WorkoutLogger from './WorkoutLogger';
import { fmtMass, toUnit, weightUnit } from '../../../shared/units';

// Detalle de un entrenamiento guardado. `justFinished` muestra la pantalla de "¡Buen trabajo!".
export default function WorkoutDetail({
  id,
  onBack,
  justFinished = false,
  onExercise,
  goTrain,
}: {
  id: string;
  onBack: () => void;
  justFinished?: boolean;
  onExercise?: (id: string) => void;
  goTrain?: () => void;
}) {
  const store = useStore();
  const { data, update, active } = store;
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
            if (!cur) return cur; // p. ej. "Deshacer" pulsado después de guardar o descartar
            const n = structuredClone(cur);
            fn(n);
            return n;
          })
        }
        onFinish={() => {
          // Editando un entreno pasado, una serie con datos cuenta como hecha aunque no se marque el ✓.
          const hasData = (x: Workout['exercises'][number]['sets'][number]) => x.weight !== undefined || x.reps !== undefined || x.durationSec !== undefined || x.distanceM !== undefined;
          const clean = {
            ...editing,
            exercises: editing.exercises.map((e) => ({ ...e, sets: e.sets.filter((x) => x.done || hasData(x)).map((x) => ({ ...x, done: true })) })).filter((e) => e.sets.length),
          };
          update((d) => void (d.workouts[d.workouts.findIndex((x) => x.id === id)] = clean));
          toast.dismiss();
          setEditing(null);
        }}
        onDiscard={() => (toast.dismiss(), setEditing(null))}
      />
    );

  const ex = new Map(data.exercises.map((e) => [e.id, e]));
  const prs = prEvents(data).filter((e) => e.workoutId === id);
  const regions = new Map<string, number>();
  for (const [m, n] of Object.entries(muscleSets(data, [w], false))) regions.set(MUSCLE_REGION[m as MuscleGroup], (regions.get(MUSCLE_REGION[m as MuscleGroup]) ?? 0) + n);
  const totalSets = [...regions.values()].reduce((a, b) => a + b, 0) || 1;
  const routine = data.routines.find((r) => r.id === w.routineId);
  const unlockedNow = justFinished ? newlyUnlocked(data, id) : [];
  const cmp = compareWithPrevious(data, id);
  const count = [...data.workouts].sort((a, b) => a.startedAt.localeCompare(b.startedAt)).findIndex((x) => x.id === id) + 1;

  const share = async () => shareOrDownload(await (await import('../share')).workoutImage(data, w), `entreno-${w.startedAt.slice(0, 10)}.png`, w.name);

  return (
    <section>
      <Back
        onClick={onBack}
        label={justFinished ? 'Listo' : 'Volver'}
        right={
          <button className="ghost" onClick={() => setEditing(structuredClone(w))}>
            Editar
          </button>
        }
      />
      {justFinished && (
        <div className="congrats">
          <Dumbbell size={48} className="big-emoji" />
          <h1>¡Buen trabajo!</h1>
          <p className="muted">Este es tu entrenamiento nº {count}.</p>
          {unlockedNow.length > 0 && (
            <div className="card new-badges">
              <b>
                <Award size={16} className="ico" /> ¡Logro{unlockedNow.length > 1 ? 's' : ''} desbloqueado{unlockedNow.length > 1 ? 's' : ''}!
              </b>
              <div className="badges">
                {unlockedNow.map((a) => (
                  <AchievementBadge key={a.id} a={a} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {!justFinished && <h1>{w.name}</h1>}
      <p className="muted small">
        {fmtDate(w.startedAt)} · {fmtTime(w.startedAt)}
        {routine ? ` · Rutina: ${routine.name}` : ''}
      </p>
      <div className="stats five">
        <Stat value={formatDuration(workoutDurationMin(w) * 60)} label="duración" />
        <Stat value={fmtMass(workoutVolume(w, data.exercises))} label="volumen" />
        <Stat value={workoutSetCount(w)} label="series" />
        <Stat value={workoutReps(w)} label="reps" />
        <Stat value={prs.length} label="récords" />
      </div>
      {cmp && (
        <div className="card vs-last">
          <h3>Frente a la última vez</h3>
          <p className="muted small">{fmtDate(cmp.previous.startedAt)}</p>
          <div className="stats four">
            <Stat value={fmtMass(cmp.volume[0])} label="volumen" extra={<Delta cur={toUnit(cmp.volume[0])} prev={toUnit(cmp.volume[1])} unit={` ${weightUnit()}`} />} />
            <Stat value={cmp.sets[0]} label="series" extra={<Delta cur={cmp.sets[0]} prev={cmp.sets[1]} />} />
            <Stat value={cmp.reps[0]} label="reps" extra={<Delta cur={cmp.reps[0]} prev={cmp.reps[1]} />} />
            <Stat value={formatDuration(cmp.durationMin[0] * 60)} label="duración" extra={<Delta cur={cmp.durationMin[0]} prev={cmp.durationMin[1]} unit=" min" />} />
          </div>
        </div>
      )}
      {w.notes && <p className="card small">{w.notes}</p>}
      {w.heartRate && (
        <div className="card">
          <h3>
            <Heart size={16} className="ico" /> Frecuencia cardiaca
          </h3>
          <div className="stats">
            <Stat value={w.heartRate.avg} label="ppm media" />
            <Stat value={w.heartRate.max} label="ppm máx." />
            <Stat value={w.heartRate.min} label="ppm mín." />
          </div>
          {w.heartRate.samples && w.heartRate.samples.length > 1 && (
            <LineChart points={w.heartRate.samples.map(([t, b]) => ({ x: Date.parse(w.startedAt) + t * 1000, y: b }))} format={(v) => `${Math.round(v)}`} timeAxis />
          )}
        </div>
      )}

      {prs.length > 0 && (
        <div className="card">
          <h3>
            <Trophy size={16} className="ico" /> Récords batidos
          </h3>
          <PrList prs={prs.map((p) => ({ ...p, exerciseName: ex.get(p.exerciseId)?.name ?? p.exerciseId }))} />
        </div>
      )}

      <div className="card">
        <h3>Distribución muscular</h3>
        <SessionMap
          big
          items={w.exercises.flatMap((we) => {
            const exercise = ex.get(we.exerciseId);
            const sets = we.sets.filter((st) => st.done).length;
            return exercise && sets ? [{ exercise, sets }] : [];
          })}
        />
        <HBars rows={[...regions.entries()].sort((a, b) => b[1] - a[1]).map(([label, v]) => ({ label, value: Math.round((v / totalSets) * 100) }))} format={(v) => `${v}%`} />
      </div>

      {w.exercises.map((we, i) => {
        const e = ex.get(we.exerciseId);
        return (
          <div key={i} className={`card ${we.supersetId ? 'superset' : ''}`}>
            <button className="plain row full left ex-head" onClick={() => onExercise?.(we.exerciseId)}>
              <ExerciseMedia exercise={e} size="thumb" />
              <span className="grow">
                <b>{e?.name ?? we.exerciseId}</b>
                <span className="muted small">{bestSetText(we, e)}</span>
              </span>
            </button>
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

      <div className="actions">
        <button className="primary full icon-btn" onClick={share}>
          <Share2 size={18} /> Compartir imagen
        </button>
        <button
          className="ghost full icon-btn"
          onClick={async () => {
            if (active && !(await ask.confirm('Ya hay un entrenamiento en curso. ¿Reemplazarlo?', { ok: 'Reemplazar', danger: true }))) return;
            launchWorkout(store, repeatWorkout(w));
            goTrain?.();
          }}
        >
          <Repeat size={18} /> Repetir entrenamiento
        </button>
        {routine ? (
          <button
            className="ghost full icon-btn"
            onClick={async () => {
              if (!(await ask.confirm('Se sustituyen sus ejercicios, series y pesos por los de hoy.', { title: `¿Actualizar "${routine.name}"?`, ok: 'Actualizar' }))) return;
              update((d) => {
                const i = d.routines.findIndex((r) => r.id === routine.id);
                d.routines[i] = { ...routineFromWorkout(w, d.settings.defaultRestSec), id: routine.id, name: routine.name, notes: routine.notes, folderId: routine.folderId };
              });
              ask.notice('Rutina actualizada');
            }}
          >
            <RefreshCw size={18} /> Actualizar rutina “{routine.name}”
          </button>
        ) : null}
        <button
          className="ghost full icon-btn"
          onClick={async () => {
            const name = (await ask.prompt('Nombre de la nueva rutina', w.name))?.trim();
            if (!name) return;
            update((d) => void d.routines.push({ ...routineFromWorkout(w, d.settings.defaultRestSec), name }));
            ask.notice(`Rutina "${name}" guardada`);
          }}
        >
          <BookmarkPlus size={18} /> Guardar como nueva rutina
        </button>
        <button
          className="danger full"
          onClick={async () => {
            if (!(await ask.confirm('Podrás deshacerlo justo después.', { title: '¿Borrar este entrenamiento?', ok: 'Borrar', danger: true }))) return;
            const snap = structuredClone(w);
            update((d) => void (d.workouts = d.workouts.filter((x) => x.id !== id)));
            toast.undo('Entrenamiento borrado', () => update((d) => void d.workouts.push(snap)));
            onBack();
          }}
        >
          Borrar entrenamiento
        </button>
      </div>
    </section>
  );
}
