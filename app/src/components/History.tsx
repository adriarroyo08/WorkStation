import { CalendarDays, ChevronLeft, ChevronRight, Heart, ListChecks, Repeat, Timer, Trash2, Trophy, Weight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { repeatWorkout } from '../../../shared/data';
import { prEvents, workoutDurationMin, workoutSetCount, workoutVolume } from '../../../shared/stats';
import type { Exercise, Workout } from '../../../shared/types';
import { launchWorkout } from '../controller';
import { toast } from '../toast';
import { cap, fmtDate, useStore } from '../store';
import { SessionMap } from './BodyMap';
import { MonthCalendar, Sheet, useLongPress } from './ui';
import WorkoutDetail from './WorkoutDetail';
import { fmtMass } from '../../../shared/units';

export default function History({ onExercise, goTrain }: { onExercise: (id: string) => void; goTrain: () => void }) {
  const store = useStore();
  const { data, settings, update, active } = store;
  const [open, setOpen] = useState<string | null>(null);
  const [menu, setMenu] = useState<Workout | null>(null);
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
      {mode === 'list' && data.workouts.length > 0 && !q && <MonthHero workouts={data.workouts} exercises={data.exercises} />}
      {mode === 'list' && data.workouts.length > 0 && <input aria-label="Buscar entrenamientos" placeholder="Buscar por nombre o ejercicio…" value={q} onChange={(e) => setQ(e.target.value)} />}
      {mode === 'calendar' && (
        <div className="card">
          <div className="row">
            <button className="ghost icon-btn" aria-label="Mes anterior" onClick={() => (setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)), setDay(null))}>
              <ChevronLeft size={20} />
            </button>
            <b className="grow center-text">{cap(month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))}</b>
            <button className="ghost icon-btn" aria-label="Mes siguiente" onClick={() => (setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)), setDay(null))}>
              <ChevronRight size={20} />
            </button>
          </div>
          <MonthCalendar month={month} trained={trained} mondayFirst={settings.weekStartsMonday} onDay={(d) => setDay(day === d.toDateString() ? null : d.toDateString())} />
          <p className="muted small center-text">
            {list.length} {list.length === 1 ? 'entrenamiento' : 'entrenamientos'} {day ? 'ese día' : 'este mes'}
          </p>
        </div>
      )}
      {!data.workouts.length && (
        <div className="empty-state">
          <CalendarDays size={40} className="muted" />
          <h2>Aún no hay entrenamientos</h2>
          <p className="muted small">Cuando termines uno aparecerá aquí. También puedes importar tu historial de Hevy desde Perfil → Ajustes.</p>
          <button className="primary" onClick={goTrain}>
            Ir a Entrenar
          </button>
        </div>
      )}
      {data.workouts.length > 0 && !total && <p className="muted center-text">{q ? `Nada coincide con «${q}».` : 'Sin entrenamientos en este periodo.'}</p>}
      {groups.map((g) => (
        <div key={g.label}>
          <h2 className="sec">
            {g.label} · {g.items.length}
          </h2>
          {g.items.map((w) => (
            <HistoryRow key={w.id} w={w} ex={ex} prs={prCount.get(w.id) ?? 0} onOpen={() => setOpen(w.id)} onMenu={() => setMenu(w)} />
          ))}
        </div>
      ))}
      {total > limit && (
        <button className="ghost full" onClick={() => setLimit(limit + 30)}>
          Ver más ({total - limit} restantes)
        </button>
      )}
      {menu && (
        <Sheet title={menu.name} onClose={() => setMenu(null)}>
          <div className="list">
            <button
              className="item icon-btn"
              onClick={() => {
                if (active && !confirm('Ya hay un entrenamiento en curso. ¿Reemplazarlo?')) return;
                launchWorkout(store, repeatWorkout(menu));
                setMenu(null);
                goTrain();
              }}
            >
              <Repeat size={16} /> Repetir entrenamiento
            </button>
            <button
              className="item icon-btn"
              onClick={() => {
                const snap = structuredClone(menu);
                update((d) => void (d.workouts = d.workouts.filter((x) => x.id !== snap.id)));
                toast.undo('Entrenamiento borrado', () => update((d) => void d.workouts.push(snap)));
                setMenu(null);
              }}
            >
              <Trash2 size={16} /> Borrar entrenamiento
            </button>
          </div>
        </Sheet>
      )}
    </section>
  );
}

// Este mes en grande, comparado con el mes pasado hasta el mismo día.
function MonthHero({ workouts, exercises }: { workouts: Workout[]; exercises: Exercise[] }) {
  const now = new Date();
  const inMonth = (w: Workout, back: number) => {
    const d = new Date(w.startedAt);
    const ref = new Date(now.getFullYear(), now.getMonth() - back, 1);
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && (back === 0 || d.getDate() <= now.getDate());
  };
  const cur = workouts.filter((w) => inMonth(w, 0));
  const prev = workouts.filter((w) => inMonth(w, 1)).length;
  const diff = cur.length - prev;
  const min = cur.reduce((t, w) => t + workoutDurationMin(w), 0);
  return (
    <div className="month-hero">
      <div className="weekstrip-head">
        <b className="week-count">{cur.length}</b>
        <span className="muted">
          {cur.length === 1 ? 'entreno' : 'entrenos'} en {now.toLocaleDateString('es-ES', { month: 'long' })}
          {prev > 0 && <span className={`metric-diff ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}`}>{diff > 0 ? `+${diff}` : diff < 0 ? `−${-diff}` : 'igual'} que el mes pasado</span>}
        </span>
      </div>
      {cur.length > 0 && (
        <div className="row small muted wstats">
          <span className="icon-btn">
            <Weight size={14} /> {fmtMass(cur.reduce((v, w) => v + workoutVolume(w, exercises), 0))}
          </span>
          <span className="icon-btn">
            <Timer size={14} /> {min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`}
          </span>
          <span className="icon-btn">
            <ListChecks size={14} /> {cur.reduce((n, w) => n + workoutSetCount(w), 0)} series
          </span>
        </div>
      )}
    </div>
  );
}

// Un entreno de la lista con su mapa muscular. Mantener pulsado abre Repetir / Borrar.
function HistoryRow({ w, ex, prs, onOpen, onMenu }: { w: Workout; ex: Map<string, Exercise>; prs: number; onOpen: () => void; onMenu: () => void }) {
  const { data } = useStore();
  const press = useLongPress(onMenu);
  const items = w.exercises.flatMap((e) => {
    const exercise = ex.get(e.exerciseId);
    return exercise ? [{ exercise, sets: e.sets.filter((s) => s.done).length }] : [];
  });
  return (
    <button className="hrow full left" onClick={onOpen} {...press}>
      <div className="hrow-grid">
        <div className="hrow-main">
          <div className="row">
            <div className="grow">
              <b>{w.name}</b>
              <div className="muted small">{fmtDate(w.startedAt)}</div>
            </div>
            {prs ? (
              <span className="pr-pill">
                <Trophy size={16} className="ico" /> {prs}
              </span>
            ) : null}
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
            {w.heartRate && (
              <span className="icon-btn">
                <Heart size={14} /> {w.heartRate.avg} ppm
              </span>
            )}
          </div>
          <div className="small exsum">
            {w.exercises.slice(0, 4).map((e, i) => (
              <div key={i}>
                {e.sets.length} × {ex.get(e.exerciseId)?.name ?? e.exerciseId}
              </div>
            ))}
            {w.exercises.length > 4 && <div className="muted">+ {w.exercises.length - 4} más</div>}
          </div>
        </div>
        <SessionMap items={items} />
      </div>
    </button>
  );
}
