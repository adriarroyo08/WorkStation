import { lazy, Suspense, useEffect, useState } from 'react';
import { ask } from '../dialog';
import { workoutFromRoutine } from '../../../shared/data';
import type { Routine } from '../../../shared/types';
import { uid } from '../../../shared/types';
import { hasPendingData } from '../../../shared/session';
import { MUSCLE_LABELS } from '../../../shared/exercises';
import { muscleRecovery, nextRoutine } from '../../../shared/planning';
import { sessionMuscles } from '../../../shared/muscle-detail';
import { discardActive, finishActive, launchEmpty, launchWorkout, summary, useSummary } from '../controller';
import { useStore } from '../store';
import { BatteryCharging, ChevronDown, ChevronRight, Copy, Download, FolderInput, FolderPlus, Link2, MoreHorizontal, Pencil, Play, Plus, Search, Share2, Trash2 } from 'lucide-react';
import BodyMap, { SessionMap } from './BodyMap';
import { haptic, Sheet, useLongPress, useScrollTop, WeekStrip } from './ui';
import { fmtWeight } from '../../../shared/units';
import { shareRoutineLink } from './SharedRoutine';
import { native } from '../native';

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
        onFinish={async () => {
          if (
            hasPendingData(
              active,
              store.data.routines.find((r) => r.id === active.routineId),
            ) &&
            !(await ask.confirm('Hay series con datos sin marcar como completadas. Se descartarán.', { title: '¿Terminar igualmente?', ok: 'Terminar' }))
          )
            return;
          if (!finishActive(store) && (await ask.confirm('No hay series completadas.', { title: '¿Descartar el entrenamiento?', ok: 'Descartar', danger: true }))) discardActive(store);
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
      {next && <TodayHero routine={next.routine} folder={folder?.name} last={next.last?.startedAt} />}
      {recovery.length > 0 && (
        <button className="recovery-row line" onClick={() => setShowRecovery(true)}>
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
          <ChevronRight size={16} className="muted" aria-hidden="true" />
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

// Lo protagonista de la pantalla: la siguiente rutina con los músculos que va a trabajar.
function TodayHero({ routine, folder, last }: { routine: Routine; folder?: string; last?: string }) {
  const store = useStore();
  const byId = new Map(store.data.exercises.map((e) => [e.id, e]));
  const items = routine.exercises.flatMap((e) => {
    const exercise = byId.get(e.exerciseId);
    return exercise ? [{ exercise, sets: e.sets.length || 1 }] : [];
  });
  const sets = routine.exercises.reduce((n, e) => n + e.sets.length, 0);
  // Estimación: cada serie ~45 s más su descanso.
  const minutes = Math.round(routine.exercises.reduce((t, e) => t + e.sets.length * (45 + e.restSec), 0) / 60 / 5) * 5;
  const muscles = sessionMuscles(items).filter((m) => m.pct >= 45);
  return (
    <div className="today">
      <div className="sec">Hoy toca{folder ? ` · ${folder}` : ''}</div>
      <div className="today-card">
        <SessionMap items={items} />
        <div className="today-info">
          <h3>{routine.name}</h3>
          <p className="today-meta">
            {routine.exercises.length} ejercicios · {sets} series{minutes ? ` · ~${minutes} min` : ''}
          </p>
          {muscles.length > 0 && (
            <ul className="today-muscles" aria-label="Músculos que trabaja">
              {muscles.slice(0, 4).map((m) => (
                <li key={m.group}>
                  <span>{m.label}</span>
                  <i style={{ width: `${m.pct}%` }} aria-hidden="true" />
                </li>
              ))}
            </ul>
          )}
          {last && <small className="muted">Última vez {ago(last)}</small>}
        </div>
      </div>
      <button className="primary big icon-btn today-go" onClick={() => (haptic(), launchWorkout(store, workoutFromRoutine(routine)))} disabled={!routine.exercises.length}>
        <Play size={18} fill="currentColor" /> Empezar
      </button>
    </div>
  );
}

// Fila de rutina: mantenerla pulsada abre su menú (igual que el botón de opciones).
function RoutineRow({ onLong, children }: { onLong: () => void; children: React.ReactNode }) {
  return (
    <div className="routine line" {...useLongPress(onLong)}>
      {children}
    </div>
  );
}

function Home({ onNewRoutine, onEdit, onExplore }: { onNewRoutine: (folderId?: string) => void; onEdit: (r: Routine) => void; onExplore: () => void }) {
  const store = useStore();
  const { data, settings, update } = store;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<Routine | null>(null);
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - (settings.weekStartsMonday ? (weekStart.getDay() + 6) % 7 : weekStart.getDay()));
  const days = Array<boolean>(7).fill(false);
  for (const w of data.workouts) {
    const t = Date.parse(w.startedAt);
    if (t >= weekStart.getTime()) days[(new Date(t).getDay() + (settings.weekStartsMonday ? 6 : 0)) % 7] = true;
  }

  const groups: { id?: string; name: string; routines: Routine[] }[] = [
    ...data.folders.map((f) => ({ id: f.id, name: f.name, routines: data.routines.filter((r) => r.folderId === f.id) })),
    { name: 'Mis rutinas', routines: data.routines.filter((r) => !r.folderId || !data.folders.some((f) => f.id === r.folderId)) },
  ];
  const exName = new Map(data.exercises.map((e) => [e.id, e.name]));
  const hasNext = !!nextRoutine(data);

  return (
    <section>
      <h1>Entrenar</h1>
      <WeekStrip days={days} goal={settings.weeklyGoal} mondayFirst={!!settings.weekStartsMonday} />
      <Today />
      {!data.workouts.length && !data.routines.length && (
        <div className="welcome">
          <h2>Bienvenido a Workstation</h2>
          <p className="small muted">Elige un programa, trae tu historial o empieza un entrenamiento vacío y añade ejercicios sobre la marcha.</p>
          <button className="line" onClick={onExplore}>
            <Search size={18} className="tile-ico" />
            <span className="grow left">
              <b>Elegir un programa</b>
              <small className="muted">Full body, 5×5, PPL, Torso/Pierna…</small>
            </span>
            <ChevronRight size={16} className="muted" />
          </button>
          <button
            className="line"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv,text/csv';
              input.onchange = () =>
                input.files?.[0]?.text().then(async (t) => {
                  const { hevySummary, importHevyCsv } = await import('../../../shared/hevy');
                  const d = structuredClone(data);
                  const r = importHevyCsv(d, t);
                  store.replace(d);
                  ask.notice(hevySummary(r));
                });
              input.click();
            }}
          >
            <Download size={18} className="tile-ico" />
            <span className="grow left">
              <b>Importar mi historial de Hevy</b>
              <small className="muted">Hevy → Perfil → Ajustes → Exportar entrenamientos (CSV)</small>
            </span>
            <ChevronRight size={16} className="muted" />
          </button>
        </div>
      )}
      <button className={`${hasNext ? 'outline' : 'primary big'} full icon-btn`} onClick={() => (haptic(), launchEmpty(store))}>
        <Plus size={20} strokeWidth={2.6} /> Empezar entrenamiento vacío
      </button>
      <div className="row actions">
        <button className="outline grow" onClick={() => onNewRoutine()}>
          Nueva rutina
        </button>
        <button className="outline grow" onClick={onExplore}>
          Explorar
        </button>
      </div>

      <div className="row sec-row">
        <div className="sec grow">Rutinas</div>
        <button
          className="link icon-btn"
          onClick={async () => {
            const name = (await ask.prompt('Nombre de la carpeta', '', { ok: 'Crear', placeholder: 'Ej.: Fuerza' }))?.trim();
            if (name) update((d) => void d.folders.push({ id: uid(), name }));
          }}
        >
          <FolderPlus size={16} /> Carpeta
        </button>
      </div>

      {groups.map((g) =>
        !g.id && !g.routines.length ? null : (
          <div key={g.id ?? 'root'}>
            <div className="row folder">
              <button className="plain grow left icon-btn folder-name" onClick={() => setCollapsed((s) => (s.has(g.name) ? (s.delete(g.name), new Set(s)) : new Set(s.add(g.name))))}>
                {collapsed.has(g.name) ? <ChevronRight size={16} /> : <ChevronDown size={16} />} <b>{g.name}</b> <span className="muted small">({g.routines.length})</span>
              </button>
              {g.id && (
                <>
                  <button className="ghost small icon-btn gray" aria-label="Nueva rutina en la carpeta" onClick={() => onNewRoutine(g.id)}>
                    <Plus size={16} />
                  </button>
                  <button
                    className="ghost small icon-btn gray"
                    aria-label="Renombrar carpeta"
                    onClick={async () => {
                      const name = await ask.prompt('Nombre de la carpeta', g.name, { title: 'Renombrar carpeta', placeholder: 'Vacío = borrar la carpeta (las rutinas se conservan)' });
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
                    <Pencil size={16} />
                  </button>
                </>
              )}
            </div>
            {!collapsed.has(g.name) &&
              g.routines.map((r) => (
                <RoutineRow key={r.id} onLong={() => setMenu(r)}>
                  <div className="grow" onClick={() => onEdit(r)}>
                    <b>{r.name}</b>
                    <p className="muted small">{r.exercises.map((e) => exName.get(e.exerciseId) ?? e.exerciseId).join(', ') || 'Sin ejercicios'}</p>
                  </div>
                  <button className="link" aria-label={`Empezar rutina ${r.name}`} onClick={() => launchWorkout(store, workoutFromRoutine(r))} disabled={!r.exercises.length}>
                    Empezar
                  </button>
                  <button className="ghost" onClick={() => setMenu(r)} aria-label="Opciones">
                    <MoreHorizontal size={20} />
                  </button>
                </RoutineRow>
              ))}
          </div>
        ),
      )}
      {!data.routines.length && <p className="muted small">Crea una rutina, guarda un programa desde Explorar o pídesela al Coach IA (Perfil → Coach IA).</p>}

      {menu && (
        <Sheet title={menu.name} onClose={() => setMenu(null)}>
          <div className="list">
            <button className="item icon-btn" onClick={() => (onEdit(menu), setMenu(null))}>
              <Pencil size={16} /> Editar rutina
            </button>
            <button className="item icon-btn" onClick={() => (update((d) => void d.routines.push({ ...structuredClone(menu), id: uid(), name: `${menu.name} (copia)` })), setMenu(null))}>
              <Copy size={16} /> Duplicar
            </button>
            <label className="menu-select">
              <FolderInput size={16} aria-hidden="true" />
              <span className="grow">Mover a carpeta</span>
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
              className="item icon-btn"
              onClick={() => {
                const txt = `${menu.name}\n${menu.exercises.map((e) => `- ${exName.get(e.exerciseId)}: ${e.sets.length}×${e.sets[0]?.reps ?? e.sets[0]?.durationSec + 's'}${e.sets[0]?.weight ? ` @ ${fmtWeight(e.sets[0].weight, { space: false })}` : ''}`).join('\n')}`;
                if (!native.shareText(menu.name, txt))
                  navigator.share ? navigator.share({ title: menu.name, text: txt }).catch(() => {}) : navigator.clipboard.writeText(txt).then(() => ask.notice('Copiado al portapapeles'));
                setMenu(null);
              }}
            >
              <Share2 size={16} /> Compartir como texto
            </button>
            <button
              className="item icon-btn"
              disabled={!menu.exercises.length}
              onClick={() => {
                void shareRoutineLink(menu, data.exercises);
                setMenu(null);
              }}
            >
              <Link2 size={16} /> Compartir enlace
            </button>
            <button
              className="item danger icon-btn"
              onClick={async () =>
                (await ask.confirm(`¿Borrar "${menu.name}"?`, { ok: 'Borrar', danger: true })) && (update((d) => void (d.routines = d.routines.filter((r) => r.id !== menu.id))), setMenu(null))
              }
            >
              <Trash2 size={16} /> Borrar rutina
            </button>
          </div>
        </Sheet>
      )}
    </section>
  );
}
