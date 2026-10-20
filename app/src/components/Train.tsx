import { useState } from 'react';
import { workoutFromRoutine } from '../../../shared/data';
import { weekStreak } from '../../../shared/reports';
import type { Routine, RoutineExercise, SetType } from '../../../shared/types';
import { uid } from '../../../shared/types';
import { PROGRAMS, instantiateProgram, type ProgramTemplate } from '../../../shared/templates';
import { importHevyCsv } from '../../../shared/hevy';
import { hasPendingData } from '../../../shared/session';
import { MUSCLE_LABELS } from '../../../shared/exercises';
import { muscleRecovery, nextRoutine } from '../../../shared/planning';
import { discardActive, finishActive, startEmpty, startWorkout, summary, useSummary } from '../controller';
import { clock, useStore } from '../store';
import ExercisePicker from './ExercisePicker';
import { BatteryCharging, CalendarCheck, ClipboardList, Compass, Flame, FolderPlus, MoreHorizontal, Play, Plus } from 'lucide-react';
import BodyMap from './BodyMap';
import { Back, ExerciseMedia, ProgressRing, Sheet, useScrollTop } from './ui';
import WorkoutDetail from './WorkoutDetail';
import WorkoutLogger from './WorkoutLogger';

export default function Train({ onExercise }: { onExercise: (id: string) => void }) {
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
          <h3>
            {thisWeek >= settings.weeklyGoal
              ? '¡Objetivo semanal cumplido!'
              : thisWeek
                ? `Te faltan ${settings.weeklyGoal - thisWeek} entreno${settings.weeklyGoal - thisWeek === 1 ? '' : 's'}`
                : 'A por la semana'}
          </h3>
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
                  input.files?.[0]?.text().then((t) => {
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
              <select value={menu.folderId ?? ''} onChange={(e) => (update((d) => void (d.routines.find((r) => r.id === menu.id)!.folderId = e.target.value || undefined)), setMenu(null))}>
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
                const txt = `${menu.name}\n${menu.exercises.map((e) => `- ${exName.get(e.exerciseId)}: ${e.sets.length}×${e.sets[0]?.reps ?? e.sets[0]?.durationSec + 's'}${e.sets[0]?.weight ? ` @ ${e.sets[0].weight}kg` : ''}`).join('\n')}`;
                navigator.share ? navigator.share({ title: menu.name, text: txt }).catch(() => {}) : navigator.clipboard.writeText(txt).then(() => alert('Copiado al portapapeles'));
                setMenu(null);
              }}
            >
              📤 Compartir como texto
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

function Explore({ onBack }: { onBack: () => void }) {
  const { data, update } = useStore();
  const [sel, setSel] = useState<ProgramTemplate | null>(null);
  const exMap = new Map(data.exercises.map((e) => [e.id, e]));
  if (sel) {
    return (
      <section>
        <Back onClick={() => setSel(null)} />
        <h1>{sel.name}</h1>
        <p className="muted small">
          {sel.level} · {sel.daysPerWeek} días/semana · {sel.goal} · {sel.equipment}
        </p>
        <p>{sel.description}</p>
        {sel.routines.map((r) => (
          <div key={r.name} className="card">
            <b>{r.name}</b>
            {r.exercises.map(([id, sets, reps]) => (
              <div key={id} className="row small exline">
                <ExerciseMedia exercise={exMap.get(id)} size="thumb" />
                <span className="grow">{exMap.get(id)?.name ?? id}</span>
                <span className="muted">
                  {sets} × {reps}
                </span>
              </div>
            ))}
          </div>
        ))}
        <button
          className="primary full"
          onClick={() => {
            const { folder, routines } = instantiateProgram(sel);
            update((d) => {
              d.folders.push(folder);
              d.routines.push(...routines);
            });
            alert(`Programa guardado en la carpeta "${folder.name}".`);
            onBack();
          }}
        >
          Guardar programa en mis rutinas
        </button>
        <p className="muted small">Después ajusta los pesos en cada rutina o simplemente empieza: la app recordará lo que levantes.</p>
      </section>
    );
  }
  return (
    <section>
      <Back onClick={onBack} />
      <h1>Explorar programas</h1>
      {PROGRAMS.map((p) => (
        <button key={p.id} className="card full left" onClick={() => setSel(p)}>
          <b>{p.name}</b>
          <div className="muted small">
            {p.level} · {p.daysPerWeek} días/semana · {p.goal}
          </div>
          <div className="small">{p.routines.map((r) => r.name).join(' · ')}</div>
        </button>
      ))}
      <p className="muted small">¿Quieres algo a medida? Pídeselo al Coach IA: «créame un programa de 4 días para ganar fuerza en banca».</p>
    </section>
  );
}

function RoutineEditor({ initial, onClose }: { initial: Routine; onClose: () => void }) {
  const { data, update, settings } = useStore();
  const [r, setR] = useState<Routine>(structuredClone(initial));
  const [picker, setPicker] = useState<{ replace?: number } | null>(null);
  const ex = new Map(data.exercises.map((e) => [e.id, e]));
  const edit = (fn: (r: Routine) => void) =>
    setR((cur) => {
      const n = structuredClone(cur);
      fn(n);
      return n;
    });
  const num = (v: string) => (v === '' ? undefined : Number(v.replace(',', '.')));
  const exists = data.routines.some((x) => x.id === r.id);

  const save = () => {
    if (!r.name.trim()) return alert('Ponle un nombre a la rutina');
    update((d) => {
      const i = d.routines.findIndex((x) => x.id === r.id);
      if (i >= 0) d.routines[i] = r;
      else d.routines.push(r);
    });
    onClose();
  };

  const newEx = (exerciseId: string, supersetId?: string): RoutineExercise => {
    const kind = ex.get(exerciseId)?.kind;
    const set = kind === 'duration' ? { type: 'normal' as SetType, durationSec: 60 } : { type: 'normal' as SetType, reps: 10 };
    return { exerciseId, restSec: settings.defaultRestSec, supersetId, sets: [{ ...set }, { ...set }, { ...set }] };
  };

  return (
    <section>
      <Back
        onClick={() => (JSON.stringify(r) === JSON.stringify(initial) || confirm('¿Salir sin guardar?')) && onClose()}
        label="Cancelar"
        right={
          <button className="primary" onClick={save}>
            Guardar
          </button>
        }
      />
      <input className="title" value={r.name} onChange={(e) => edit((n) => void (n.name = e.target.value))} placeholder="Nombre de la rutina" />
      <textarea placeholder="Notas de la rutina" value={r.notes ?? ''} onChange={(e) => edit((n) => void (n.notes = e.target.value || undefined))} />
      {data.folders.length > 0 && (
        <label>
          Carpeta
          <select value={r.folderId ?? ''} onChange={(e) => edit((n) => void (n.folderId = e.target.value || undefined))}>
            <option value="">Sin carpeta</option>
            {data.folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {r.exercises.map((e, i) => {
        const kind = ex.get(e.exerciseId)?.kind ?? 'weight_reps';
        const dur = kind === 'duration';
        const ssPrev = i > 0 && e.supersetId && r.exercises[i - 1].supersetId === e.supersetId;
        return (
          <div key={i} className={`card ${e.supersetId ? 'superset' : ''} ${ssPrev ? 'ss-mid' : ''}`}>
            {e.supersetId && !ssPrev && <div className="ss-label">Superserie</div>}
            <div className="row">
              <ExerciseMedia exercise={ex.get(e.exerciseId)} size="thumb" />
              <b className="grow accent-text">{ex.get(e.exerciseId)?.name}</b>
              <button className="ghost small" disabled={i === 0} onClick={() => edit((n) => void n.exercises.splice(i - 1, 0, ...n.exercises.splice(i, 1)))}>
                ↑
              </button>
              <button className="ghost small" disabled={i === r.exercises.length - 1} onClick={() => edit((n) => void n.exercises.splice(i + 1, 0, ...n.exercises.splice(i, 1)))}>
                ↓
              </button>
              <button className="ghost small" onClick={() => edit((n) => void n.exercises.splice(i, 1))}>
                🗑
              </button>
            </div>
            <div className="row small">
              <label className="grow">
                Descanso
                <select value={e.restSec} onChange={(ev) => edit((n) => void (n.exercises[i].restSec = Number(ev.target.value)))}>
                  {[0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300].map((s) => (
                    <option key={s} value={s}>
                      {s ? clock(s) : 'Off'}
                    </option>
                  ))}
                </select>
              </label>
              {i < r.exercises.length - 1 && (
                <button
                  className="ghost small"
                  onClick={() =>
                    edit((n) => {
                      const a = n.exercises[i],
                        b = n.exercises[i + 1];
                      if (a.supersetId && a.supersetId === b.supersetId) b.supersetId = undefined;
                      else a.supersetId = b.supersetId = a.supersetId ?? b.supersetId ?? uid();
                    })
                  }
                >
                  {e.supersetId && r.exercises[i + 1].supersetId === e.supersetId ? '✂️ Separar' : '🔗 Superserie con siguiente'}
                </button>
              )}
              <button className="ghost small" onClick={() => setPicker({ replace: i })}>
                🔄
              </button>
            </div>
            <div className="rset head small muted">
              <span>Serie</span>
              <span>{dur ? '' : 'kg'}</span>
              <span>{dur ? 'Seg' : 'Reps'}</span>
              <span />
            </div>
            {e.sets.map((s, si) => (
              <div key={si} className="rset">
                <button
                  className={`settype ${s.type}`}
                  onClick={() =>
                    edit(
                      (n) =>
                        void (n.exercises[i].sets[si].type = (['normal', 'warmup', 'drop', 'failure'] as SetType[])[((['normal', 'warmup', 'drop', 'failure'] as SetType[]).indexOf(s.type) + 1) % 4]),
                    )
                  }
                >
                  {{ normal: si + 1, warmup: 'C', drop: 'D', failure: 'F' }[s.type]}
                </button>
                {dur ? <span /> : <input inputMode="decimal" value={s.weight ?? ''} placeholder="-" onChange={(ev) => edit((n) => void (n.exercises[i].sets[si].weight = num(ev.target.value)))} />}
                {dur ? (
                  <input inputMode="numeric" value={s.durationSec ?? ''} onChange={(ev) => edit((n) => void (n.exercises[i].sets[si].durationSec = num(ev.target.value)))} />
                ) : (
                  <input inputMode="numeric" value={s.reps ?? ''} placeholder="-" onChange={(ev) => edit((n) => void (n.exercises[i].sets[si].reps = num(ev.target.value)))} />
                )}
                <button className="ghost small" onClick={() => edit((n) => void n.exercises[i].sets.splice(si, 1))} disabled={e.sets.length === 1}>
                  ✕
                </button>
              </div>
            ))}
            <button className="ghost full small" onClick={() => edit((n) => void n.exercises[i].sets.push({ ...(n.exercises[i].sets.at(-1) ?? { type: 'normal' }) }))}>
              + Añadir serie
            </button>
          </div>
        );
      })}
      <button className="primary full" onClick={() => setPicker({})}>
        <Plus size={18} strokeWidth={2.6} /> Añadir ejercicio
      </button>
      {exists && (
        <button className="danger full" onClick={() => confirm('¿Borrar esta rutina?') && (update((d) => void (d.routines = d.routines.filter((x) => x.id !== r.id))), onClose())}>
          Borrar rutina
        </button>
      )}
      {picker && (
        <ExercisePicker
          single={picker.replace !== undefined}
          onClose={() => setPicker(null)}
          onPick={(es, ss) => {
            const sid = ss ? uid() : undefined;
            edit((n) => {
              if (picker.replace !== undefined) n.exercises[picker.replace] = { ...n.exercises[picker.replace], exerciseId: es[0].id };
              else n.exercises.push(...es.map((x) => newEx(x.id, sid)));
            });
            setPicker(null);
          }}
        />
      )}
    </section>
  );
}
