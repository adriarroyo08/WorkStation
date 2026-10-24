import { Heart, ListChecks, Timer, Trophy, Weight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { prEvents, workoutDurationMin, workoutSetCount, workoutVolume } from '../../../shared/stats';
import { cap, fmtDate, useStore } from '../store';
import { MonthCalendar } from './ui';
import WorkoutDetail from './WorkoutDetail';
import { fmtMass } from '../../../shared/units';

export default function History({ onExercise, goTrain }: { onExercise: (id: string) => void; goTrain: () => void }) {
  const { data, settings } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [mode, setMode] = useState<'list' | 'calendar'>('list');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [day, setDay] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(30);
  const ex = new Map(data.exercises.map((e) => [e.id, e]));
  const prCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of prEvents(data)) m.set(e.workoutId, (m.get(e.workoutId) ?? 0) + 1);
    return m;
  }, [data]);
  const trained = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of data.workouts) m.set(new Date(w.startedAt).toDateString(), (m.get(new Date(w.startedAt).toDateString()) ?? 0) + 1);
    return m;
  }, [data.workouts]);

  if (open) return <WorkoutDetail id={open} onBack={() => setOpen(null)} onExercise={onExercise} goTrain={goTrain} />;

  let list = [...data.workouts].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (q) list = list.filter((w) => w.name.toLowerCase().includes(q.toLowerCase()) || w.exercises.some((e) => ex.get(e.exerciseId)?.name.toLowerCase().includes(q.toLowerCase())));
  if (mode === 'calendar')
    list = list.filter((w) =>
      day ? new Date(w.startedAt).toDateString() === day : new Date(w.startedAt).getMonth() === month.getMonth() && new Date(w.startedAt).getFullYear() === month.getFullYear(),
    );

  // Agrupar por mes como en Hevy (solo los primeros `limit`, para listas largas).
  const total = list.length;
  const groups: { label: string; items: typeof list }[] = [];
  for (const w of list.slice(0, limit)) {
    const label = cap(new Date(w.startedAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));
    if (groups.at(-1)?.label !== label) groups.push({ label, items: [] });
    groups.at(-1)!.items.push(w);
  }

  return (
    <section>
      <div className="row">
        <h1 className="grow">Historial</h1>
        <div className="segmented small">
          <button className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')}>
            Lista
          </button>
          <button className={mode === 'calendar' ? 'on' : ''} onClick={() => setMode('calendar')}>
            Calendario
          </button>
        </div>
      </div>
      {mode === 'list' && <input placeholder="Buscar por nombre o ejercicio…" value={q} onChange={(e) => setQ(e.target.value)} />}
      {mode === 'calendar' && (
        <div className="card">
          <div className="row">
            <button className="ghost" onClick={() => (setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)), setDay(null))}>
              ‹
            </button>
            <b className="grow center-text">{cap(month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))}</b>
            <button className="ghost" onClick={() => (setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)), setDay(null))}>
              ›
            </button>
          </div>
          <MonthCalendar month={month} trained={trained} mondayFirst={settings.weekStartsMonday} onDay={(d) => setDay(day === d.toDateString() ? null : d.toDateString())} />
          <p className="muted small center-text">
            {list.length} entrenamientos {day ? 'ese día' : 'este mes'}
          </p>
        </div>
      )}
      {!data.workouts.length && <p className="muted">Aún no hay entrenamientos. ¡Empieza uno o importa tus datos de Hevy en Ajustes!</p>}
      {groups.map((g) => (
        <div key={g.label}>
          <h3 className="muted month-h">
            {g.label} · {g.items.length}
          </h3>
          {g.items.map((w) => (
            <button key={w.id} className="card full left" onClick={() => setOpen(w.id)}>
              <div className="row">
                <div className="grow">
                  <b>{w.name}</b>
                  <div className="muted small">{fmtDate(w.startedAt)}</div>
                </div>
                {prCount.get(w.id) ? <span className="pr-pill"><Trophy size={16} className="ico" /> {prCount.get(w.id)}</span> : null}
              </div>
              <div className="row small muted wstats">
                <span className="icon-btn">
                  <Timer size={14} /> {workoutDurationMin(w)} min
                </span>
                <span className="icon-btn">
                  <Weight size={14} /> {fmtMass(workoutVolume(w, data.exercises))}
                </span>
                <span className="icon-btn">
                  <ListChecks size={14} /> {workoutSetCount(w)} series
                </span>
                {w.heartRate && <span><Heart size={16} className="ico" /> {w.heartRate.avg}</span>}
              </div>
              <div className="small exsum">
                {w.exercises.slice(0, 4).map((e, i) => (
                  <div key={i}>
                    {e.sets.length} × {ex.get(e.exerciseId)?.name ?? e.exerciseId}
                  </div>
                ))}
                {w.exercises.length > 4 && <div className="muted">+ {w.exercises.length - 4} más</div>}
              </div>
            </button>
          ))}
        </div>
      ))}
      {total > limit && (
        <button className="ghost full" onClick={() => setLimit(limit + 30)}>
          Ver más ({total - limit} restantes)
        </button>
      )}
    </section>
  );
}
