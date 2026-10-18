import { useState } from 'react';
import { workoutFromRoutine } from '../../../shared/data';
import type { Routine } from '../../../shared/types';
import { uid } from '../../../shared/types';
import { useStore } from '../store';
import ExercisePicker from './ExercisePicker';

export default function Routines({ goTrain }: { goTrain: () => void }) {
  const { data, update, active, setActive } = useStore();
  const [editing, setEditing] = useState<Routine | null>(null);
  const ex = new Map(data.exercises.map((e) => [e.id, e]));

  if (editing) return <RoutineEditor initial={editing} onClose={() => setEditing(null)} />;

  return (
    <section>
      <h1>Rutinas</h1>
      <button className="primary full" onClick={() => setEditing({ id: uid(), name: 'Nueva rutina', exercises: [] })}>
        + Nueva rutina
      </button>
      {!data.routines.length && <p className="muted">También puedes pedirle una rutina al Coach IA y guardarla con un toque.</p>}
      {data.routines.map((r) => (
        <div key={r.id} className="card">
          <div className="row">
            <b className="grow">{r.name}</b>
            <button className="ghost" onClick={() => setEditing(r)}>
              Editar
            </button>
            <button
              className="primary"
              onClick={() => {
                if (active && !confirm('Ya hay un entrenamiento en curso. ¿Reemplazarlo?')) return;
                setActive(workoutFromRoutine(r));
                goTrain();
              }}
            >
              Empezar
            </button>
          </div>
          {r.notes && <p className="muted small">{r.notes}</p>}
          <ul className="small">
            {r.exercises.map((e, i) => (
              <li key={i}>
                {e.sets.length} × {ex.get(e.exerciseId)?.name ?? e.exerciseId}
                {e.sets[0]?.reps ? ` · ${e.sets[0].reps} reps` : ''}
                {e.sets[0]?.weight ? ` · ${e.sets[0].weight} kg` : ''}
              </li>
            ))}
          </ul>
          <button className="danger small" onClick={() => confirm(`¿Borrar "${r.name}"?`) && update((d) => void (d.routines = d.routines.filter((x) => x.id !== r.id)))}>
            Borrar
          </button>
        </div>
      ))}
    </section>
  );
}

function RoutineEditor({ initial, onClose }: { initial: Routine; onClose: () => void }) {
  const { data, update } = useStore();
  const [r, setR] = useState<Routine>(structuredClone(initial));
  const [picking, setPicking] = useState(false);
  const ex = new Map(data.exercises.map((e) => [e.id, e]));
  const edit = (fn: (r: Routine) => void) =>
    setR((cur) => {
      const n = structuredClone(cur);
      fn(n);
      return n;
    });
  const num = (v: string) => (v === '' ? undefined : Number(v));

  const save = () => {
    update((d) => {
      const i = d.routines.findIndex((x) => x.id === r.id);
      if (i >= 0) d.routines[i] = r;
      else d.routines.push(r);
    });
    onClose();
  };

  return (
    <section>
      <div className="row">
        <button className="ghost" onClick={onClose}>
          ← Volver
        </button>
        <span className="grow" />
        <button className="primary" onClick={save}>
          Guardar
        </button>
      </div>
      <input className="title" value={r.name} onChange={(e) => edit((n) => void (n.name = e.target.value))} />
      <textarea placeholder="Notas de la rutina" value={r.notes ?? ''} onChange={(e) => edit((n) => void (n.notes = e.target.value))} />
      {r.exercises.map((e, i) => (
        <div key={i} className="card">
          <div className="row">
            <b className="grow accent-text">{ex.get(e.exerciseId)?.name}</b>
            <button className="ghost" disabled={i === 0} onClick={() => edit((n) => void n.exercises.splice(i - 1, 0, ...n.exercises.splice(i, 1)))}>
              ↑
            </button>
            <button className="ghost" onClick={() => edit((n) => void n.exercises.splice(i, 1))}>
              🗑
            </button>
          </div>
          <div className="grid4">
            <label>
              Series
              <input
                inputMode="numeric"
                value={e.sets.length}
                onChange={(ev) =>
                  edit((n) => {
                    const c = Math.max(1, Math.min(20, Number(ev.target.value) || 1));
                    const s = n.exercises[i].sets;
                    while (s.length < c) s.push({ ...(s.at(-1) ?? { type: 'normal' }) });
                    s.length = c;
                  })
                }
              />
            </label>
            <label>
              Reps
              <input inputMode="numeric" value={e.sets[0]?.reps ?? ''} onChange={(ev) => edit((n) => n.exercises[i].sets.forEach((s) => (s.reps = num(ev.target.value))))} />
            </label>
            <label>
              kg
              <input inputMode="decimal" value={e.sets[0]?.weight ?? ''} onChange={(ev) => edit((n) => n.exercises[i].sets.forEach((s) => (s.weight = num(ev.target.value))))} />
            </label>
            <label>
              Desc. (s)
              <input inputMode="numeric" value={e.restSec} onChange={(ev) => edit((n) => void (n.exercises[i].restSec = Number(ev.target.value) || 0))} />
            </label>
          </div>
        </div>
      ))}
      <button className="primary full" onClick={() => setPicking(true)}>
        + Añadir ejercicio
      </button>
      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(p) => {
            edit((n) => void n.exercises.push({ exerciseId: p.id, restSec: 90, sets: [{ type: 'normal', reps: 10 }, { type: 'normal', reps: 10 }, { type: 'normal', reps: 10 }] }));
            setPicking(false);
          }}
        />
      )}
    </section>
  );
}
