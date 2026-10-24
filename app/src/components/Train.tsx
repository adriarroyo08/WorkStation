import { lazy, Suspense, useEffect, useState } from 'react';
import { workoutFromRoutine } from '../../../shared/data';
import { weekStreak } from '../../../shared/reports';
import type { Routine } from '../../../shared/types';
import { uid } from '../../../shared/types';
import { hasPendingData } from '../../../shared/session';
import { MUSCLE_LABELS } from '../../../shared/exercises';
import { muscleRecovery, nextRoutine } from '../../../shared/planning';
import { discardActive, finishActive, startEmpty, startWorkout, summary, useSummary } from '../controller';
import { useStore } from '../store';
import { BatteryCharging, CalendarCheck, ClipboardList, Compass, Flame, FolderPlus, MoreHorizontal, Play, Plus } from 'lucide-react';
import BodyMap from './BodyMap';
import { ProgressRing, Sheet, useScrollTop } from './ui';
import { fmtWeight } from '../../../shared/units';
import { shareRoutineLink } from './SharedRoutine';

// Pantallas que no hacen falta al abrir la app: se descargan aparte y se precargan cuando el navegador está libre.
const loadLogger = () => import('./WorkoutLogger');
const loadDetail = () => import('./WorkoutDetail');
const loadExplore = () => import('./Explore');
const loadEditor = () => import('./RoutineEditor');
const WorkoutLogger = lazy(loadLogger);
const WorkoutDetail = lazy(loadDetail);
const Explore = lazy(loadExplore);
const RoutineEditor = lazy(loadEditor);

export default function Train({ onExercise }: { onExercise: (id: string) => void }) {
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1500));
    idle(() => void Promise.all([loadLogger(), loadDetail(), loadExplore(), loadEditor()]).catch(() => {}));
  }, []);
  return (
    <Suspense fallback={<div className="skeleton" />}>
      <TrainScreen onExercise={onExercise} />
    </Suspense>
  );
}

function TrainScreen({ onExercise }: { onExercise: (id: string) => void }) {
  const store = useStore();
  const { active, setActive } = store;
  const finished = useSummary();
  const [view, setView] = useState<'home' | 'explore'>('home');
  const [editing, setEditing] = useState<Routine | null>(null);
  useScrollTop(`${view}:${editing?.id}:${finished}:${!!active}`);

  if (finished) return <WorkoutDetail id={finished} justFinished onBack={summary.clear} onExercise={onExercise} />;

  if (active)
    return (
      <WorkoutLogger
        workout={active}
        mode="live"
        edit={(fn) =>
          setActive((cur) => {
            const n = structuredClone(cur);
            fn(n);
            return n;
          })
        }
        onExercise={onExercise}
        onDiscard={() => discardActive(store)}
        onFinish={() => {
          if (hasPendingData(active) && !confirm('Hay series con datos sin marcar como completadas. Se descartarán. ¿Terminar igualmente?')) return;
          if (!finishActive(store) && confirm('No hay series completadas. ¿Descartar el entrenamiento?')) discardActive(store);
        }}
      />
    );

  if (editing) return <RoutineEditor initial={editing} onClose={() => setEditing(null)} />;
  if (view === 'explore') return <Explore onBack={() => setView('home')} />;
  return <Home onNewRoutine={(folderId) => setEditing({ id: uid(), name: 'Nueva rutina', folderId, exercises: [] })} onEdit={setEditing} onExplore={() => setView('explore')} />;
}

const ago = (iso: string) => {
  const days = Math.round((Date.now() - Date.parse(iso)) / 86400_000);
  return days <= 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`;
};

// "Hoy toca": siguiente rutina del programa y estado de recuperación de cada músculo.
function Today() {
  const store = useStore();
  const { data } = store;
  const [showRecovery, setShowRecovery] = useState(false);
  const next = nextRoutine(data);
  const recovery = muscleRecovery(data);
  const folder = next && data.folders.find((f) => f.id === next.routine.folderId);
  if (!next && !recovery.length) return null;
  const tired = recovery.filter((r) => r.recovery < 0.6);
  return (
    <>
      {next && (
        <div className="card today">
          <div className="row">
            <CalendarCheck size={18} className="tile-ico" />
            <span className="muted small grow">Hoy toca{folder ? ` · ${folder.name}` : ''}</span>
            {next.last && <span className="muted small">Última vez {ago(next.last.startedAt)}</span>}
          </div>
          <h3>{next.routine.name}</h3>
          <button className="primary full icon-btn" onClick={() => startWorkout(store, workoutFromRoutine(next.routine))}>
            <Play size={16} fill="currentColor" /> Empezar
          </button>
        </div>
      )}
      {recovery.length > 0 && (
        <button className="card recovery-row" onClick={() => setShowRecovery(true)}>
          <BatteryCharging size={18} className="tile-ico" />
          <span className="grow left small">
            {tired.length ? (
              <>
                En recuperación:{' '}
                <b>
                  {tired
                    .slice(0, 3)
                    .map((r) => MUSCLE_LABELS[r.muscle])
                    .join(', ')}
                </b>
                {tired.length > 3 ? ` y ${tired.length - 3} más` : ''}
              </>
            ) : (
              'Músculos casi recuperados: buen momento para entrenar fuerte'
            )}
          </span>
          <span className="muted small">Ver</span>
        </button>
      )}
      {showRecovery && (
        <Sheet title="Recuperación muscular" onClose={() => setShowRecovery(false)}>
          <BodyMap fatigue sets={Object.fromEntries(recovery.map((r) => [r.muscle, 1 - r.recovery]))} />
          <div className="list">
            {recovery.map((r) => (
              <div key={r.muscle} className="recovery-item">
                <div className="row">
                  <b className="grow">{MUSCLE_LABELS[r.muscle]}</b>
                  <span className="small muted">
                    {Math.round(r.recovery * 100)}% · hace {Math.round(r.hoursSince)} h
                  </span>
                </div>
                <div className="progress thin">
                  <div style={{ width: `${r.recovery * 100}%`, background: r.recovery < 0.5 ? 'var(--warn)' : r.recovery < 0.85 ? 'var(--accent)' : 'var(--ok)' }} />
                </div>
              </div>
            ))}
          </div>
          <p className="muted small">Estimación según las series efectivas de los últimos 3 días (36–72 h por músculo). Escucha a tu cuerpo.</p>
        </Sheet>
      )}
    </>
  );
}

function Home({ onNewRoutine, onEdit, onExplore }: { onNewRoutine: (folderId?: string) => void; onEdit: (r: Routine) => void; onExplore: () => void }) {
  const store = useStore();
  const { data, settings, update } = store;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<Routine | null>(null);
  const streak = weekStreak(data, settings.weekStartsMonday);
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - (settings.weekStartsMonday ? (weekStart.getDay() + 6) % 7 : weekStart.getDay()));
  const thisWeek = data.workouts.filter((w) => Date.parse(w.startedAt) >= weekStart.getTime()).length;

  const groups: { id?: string; name: string; routines: Routine[] }[] = [
    ...data.folders.map((f) => ({ id: f.id, name: f.name, routines: data.routines.filter((r) => r.folderId === f.id) })),
    { name: 'Mis rutinas', routines: data.routines.filter((r) => !r.folderId || !data.folders.some((f) => f.id === r.folderId)) },
  ];
  const exName = new Map(data.exercises.map((e) => [e.id, e.name]));

  return (
    <section>
      <h1>Entrenar</h1>
      <div className="card hero">
        <ProgressRing value={thisWeek} max={settings.weeklyGoal} label={`${thisWeek}/${settings.weeklyGoal}`} sub="semana" />
        <div className="grow">
          <h2>
            {thisWeek >= settings.weeklyGoal
              ? '¡Objetivo semanal cumplido!'
              : thisWeek
                ? `Te faltan ${settings.weeklyGoal - thisWeek} entreno${settings.weeklyGoal - thisWeek === 1 ? '' : 's'}`
                : 'A por la semana'}
          </h2>
          <p className="muted small" style={{ margin: '0 0 8px' }}>
            {data.workouts.length
              ? `Último: ${new Date([...data.workouts].sort((x, y) => y.startedAt.localeCompare(x.startedAt))[0].startedAt).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}`
              : 'Tu primer entreno te espera'}
          </p>
          <span className={`chip ${streak ? 'warm' : ''}`} title="Semanas seguidas entrenando">
            <Flame size={13} /> {streak} {streak === 1 ? 'semana' : 'semanas'} de racha
          </span>
        </div>
      </div>
      <Today />
      {!data.workouts.length && !data.routines.length && (
        <div className="card welcome">
          <h3>👋 Bienvenido a Workstation</h3>
          <p className="small muted">Tres formas de empezar:</p>
          <div className="list">
            <button className="item" onClick={onExplore}>
              <b>🔎 Elegir un programa</b>
              <small className="muted">Full body, 5×5, PPL, Torso/Pierna…</small>
            </button>
            <button
              className="item"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.csv,text/csv';
                input.onchange = () =>
                  input.files?.[0]?.text().then(async (t) => {
                    const { importHevyCsv } = await import('../../../shared/hevy');
                    const d = structuredClone(data);
                    const n = importHevyCsv(d, t);
                    store.replace(d);
                    alert(`Importados ${n} entrenamientos desde Hevy.`);
                  });
                input.click();
              }}
            >
              <b>📥 Importar mi historial de Hevy</b>
              <small className="muted">Hevy → Perfil → Ajustes → Exportar entrenamientos (CSV)</small>
            </button>
            <button className="item" onClick={() => startEmpty(store)}>
              <b>⚡ Entrenar ya</b>
              <small className="muted">Empieza vacío y añade ejercicios sobre la marcha</small>
            </button>
          </div>
        </div>
      )}
      <button className="primary big icon-btn" onClick={() => startEmpty(store)}>
        <Plus size={20} strokeWidth={2.6} /> Empezar entrenamiento vacío
      </button>

      <div className="row">
        <h2 className="grow">Rutinas</h2>
        <button
          className="ghost small icon-btn"
          onClick={() => {
            const name = prompt('Nombre de la carpeta');
            if (name) update((d) => void d.folders.push({ id: uid(), name }));
          }}
        >
          <FolderPlus size={16} /> Carpeta
        </button>
      </div>
      <div className="row">
        <button className="card grow tile" onClick={() => onNewRoutine()}>
          <ClipboardList size={20} className="tile-ico" /> Nueva rutina
        </button>
        <button className="card grow tile" onClick={onExplore}>
          <Compass size={20} className="tile-ico" /> Explorar programas
        </button>
      </div>

      {groups.map((g) =>
        !g.id && !g.routines.length ? null : (
          <div key={g.id ?? 'root'}>
            <div className="row folder">
              <button className="plain grow left" onClick={() => setCollapsed((s) => (s.has(g.name) ? (s.delete(g.name), new Set(s)) : new Set(s.add(g.name))))}>
                {collapsed.has(g.name) ? '▸' : '▾'} <b>{g.name}</b> <span className="muted small">({g.routines.length})</span>
              </button>
              {g.id && (
                <>
                  <button className="ghost small" onClick={() => onNewRoutine(g.id)}>
                    +
                  </button>
                  <button
                    className="ghost small"
                    onClick={() => {
                      const name = prompt('Renombrar carpeta (vacío = borrar carpeta; las rutinas se conservan)', g.name);
                      if (name === null) return;
                      update((d) => {
                        if (name.trim()) d.folders.find((f) => f.id === g.id)!.name = name.trim();
                        else {
                          d.folders = d.folders.filter((f) => f.id !== g.id);
                          d.routines.forEach((r) => r.folderId === g.id && (r.folderId = undefined));
                        }
                      });
                    }}
                  >
                    ✎
                  </button>
                </>
              )}
            </div>
            {!collapsed.has(g.name) &&
              g.routines.map((r) => (
                <div key={r.id} className="card routine">
                  <div className="row">
                    <b className="grow" onClick={() => onEdit(r)}>
                      {r.name}
                    </b>
                    <button className="ghost" onClick={() => setMenu(r)} aria-label="Opciones">
                      <MoreHorizontal size={20} />
                    </button>
                  </div>
                  <p className="muted small" onClick={() => onEdit(r)}>
                    {r.exercises.map((e) => exName.get(e.exerciseId) ?? e.exerciseId).join(', ') || 'Sin ejercicios'}
                  </p>
                  <button className="primary full icon-btn" onClick={() => startWorkout(store, workoutFromRoutine(r))} disabled={!r.exercises.length}>
                    <Play size={16} fill="currentColor" /> Empezar rutina
                  </button>
                </div>
              ))}
          </div>
        ),
      )}
      {!data.routines.length && <p className="muted small">Crea una rutina, guarda un programa desde Explorar o pídesela al Coach IA.</p>}

      {menu && (
        <Sheet title={menu.name} onClose={() => setMenu(null)}>
          <div className="list">
            <button className="item" onClick={() => (onEdit(menu), setMenu(null))}>
              ✎ Editar rutina
            </button>
            <button className="item" onClick={() => (update((d) => void d.routines.push({ ...structuredClone(menu), id: uid(), name: `${menu.name} (copia)` })), setMenu(null))}>
              ⧉ Duplicar
            </button>
            <label>
              Mover a carpeta
              <select
                aria-label="Carpeta"
                value={menu.folderId ?? ''}
                onChange={(e) => (update((d) => void (d.routines.find((r) => r.id === menu.id)!.folderId = e.target.value || undefined)), setMenu(null))}
              >
                <option value="">Mis rutinas (sin carpeta)</option>
                {data.folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="item"
              onClick={() => {
                const txt = `${menu.name}\n${menu.exercises.map((e) => `- ${exName.get(e.exerciseId)}: ${e.sets.length}×${e.sets[0]?.reps ?? e.sets[0]?.durationSec + 's'}${e.sets[0]?.weight ? ` @ ${fmtWeight(e.sets[0].weight, { space: false })}` : ''}`).join('\n')}`;
                navigator.share ? navigator.share({ title: menu.name, text: txt }).catch(() => {}) : navigator.clipboard.writeText(txt).then(() => alert('Copiado al portapapeles'));
                setMenu(null);
              }}
            >
              📤 Compartir como texto
            </button>
            <button
              className="item"
              disabled={!menu.exercises.length}
              onClick={() => {
                void shareRoutineLink(menu, data.exercises);
                setMenu(null);
              }}
            >
              🔗 Compartir enlace (se guarda con un toque)
            </button>
            <button className="item danger" onClick={() => confirm(`¿Borrar "${menu.name}"?`) && (update((d) => void (d.routines = d.routines.filter((r) => r.id !== menu.id))), setMenu(null))}>
              🗑 Borrar rutina
            </button>
          </div>
        </Sheet>
      )}
    </section>
  );
}
