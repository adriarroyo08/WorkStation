import { useState } from 'react';
import { formatSet, workoutDurationMin, workoutSetCount, workoutVolume } from '../../../shared/stats';
import { fmtDate, useStore } from '../store';

export default function History() {
  const { data, update } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const ex = new Map(data.exercises.map((e) => [e.id, e]));
  const list = [...data.workouts].sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  return (
    <section>
      <h1>Historial</h1>
      {!list.length && <p className="muted">Aún no hay entrenamientos. ¡Empieza uno o importa tus datos de Hevy en Ajustes!</p>}
      {list.map((w) => (
        <div key={w.id} className="card" onClick={() => setOpen(open === w.id ? null : w.id)}>
          <div className="row">
            <div className="grow">
              <b>{w.name}</b>
              <div className="muted small">{fmtDate(w.startedAt)}</div>
            </div>
            <div className="small right">
              {workoutDurationMin(w)} min · {workoutSetCount(w)} series
              <div className="muted">{workoutVolume(w).toLocaleString('es-ES')} kg</div>
            </div>
          </div>
          {open === w.id ? (
            <div className="detail">
              {w.notes && <p className="muted">{w.notes}</p>}
              {w.exercises.map((e, i) => (
                <div key={i}>
                  <b className="accent-text">{ex.get(e.exerciseId)?.name ?? e.exerciseId}</b>
                  <ol>
                    {e.sets.map((s, j) => (
                      <li key={j}>{formatSet(s, ex.get(e.exerciseId))}</li>
                    ))}
                  </ol>
                </div>
              ))}
              <button
                className="danger"
                onClick={(ev) => {
                  ev.stopPropagation();
                  if (confirm('¿Borrar este entrenamiento?')) update((d) => void (d.workouts = d.workouts.filter((x) => x.id !== w.id)));
                }}
              >
                Borrar
              </button>
            </div>
          ) : (
            <div className="muted small">{w.exercises.map((e) => ex.get(e.exerciseId)?.name ?? e.exerciseId).join(' · ')}</div>
          )}
        </div>
      ))}
    </section>
  );
}
