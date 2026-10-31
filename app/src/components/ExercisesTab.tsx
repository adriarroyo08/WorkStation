import { Check, ChevronRight, Film, Pin, Plus, Search, Trophy } from 'lucide-react';
import { ask } from '../dialog';
import { useEffect, useState } from 'react';
import { englishName, searchExdb, type ExdbExercise } from '../../../shared/exercisedb';
import { loadExdbList, useExdbConfig } from '../exdb';
import { chat } from '../../../shared/ai';
import { EXERCISE_KIND_LABELS, MUSCLE_LABELS, catalogLabel } from '../../../shared/exercises';
import { MuscleFilter, MuscleMap } from './BodyMap';
import { exerciseHistory, formatDuration, formatSet, personalRecords, repRecords, type ExerciseSession } from '../../../shared/stats';
import type { Exercise, ExerciseKind } from '../../../shared/types';
import { cap, fmtDate, useStore } from '../store';
import ExerciseEditor from './ExerciseEditor';
import { ExerciseRow, useExerciseFilter } from './ExercisePicker';
import LineChart from './LineChart';
import { StrengthCard } from './Strength';
import { fmtWeight, toUnit, weightUnit } from '../../../shared/units';
import { Back, ExerciseMedia, Sheet, Stat } from './ui';
import { loadCatalog, type CatalogItem } from '../catalog';

export default function ExercisesTab({ openId, onOpened, onClose }: { openId?: string | null; onOpened?: () => void; onClose?: () => void }) {
  const { data } = useStore();
  const [sel, setSel] = useState<string | null>(openId ?? null);
  const [catalog, setCatalog] = useState(false);
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (!openId) return;
    setSel(openId);
    onOpened?.();
  }, [openId, onOpened]);
  const prs = new Map(personalRecords(data).map((p) => [p.exerciseId, p]));
  const sorted = [...data.exercises].sort((a, b) => Number(prs.has(b.id)) - Number(prs.has(a.id)) || a.name.localeCompare(b.name));
  const { list, filters, muscle, setMuscle } = useExerciseFilter(sorted);

  if (sel) return <ExerciseDetail id={sel} onBack={() => (onClose ? onClose() : setSel(null))} />;
  if (catalog) return <CatalogBrowser onBack={() => setCatalog(false)} onOpen={(id) => (setCatalog(false), setSel(id))} />;

  return (
    <section>
      <div className="row">
        <h1 className="grow">Ejercicios</h1>
        <button className="ghost icon-btn" onClick={() => setCreating(true)}>
          <Plus size={18} /> Crear
        </button>
      </div>
      <button className="line" onClick={() => setCatalog(true)}>
        <Search size={18} className="tile-ico" />
        <span className="grow">
          <b>Explorar catálogo completo</b>
          <small className="muted">870+ ejercicios con imágenes e instrucciones</small>
        </span>
        <ChevronRight size={16} className="muted" />
      </button>
      <div className="mfilter">
        <MuscleFilter value={muscle} onPick={setMuscle} />
        <div className="mfilter-info">
          <b>{list.length}</b>
          <span>{muscle ? MUSCLE_LABELS[muscle] : 'ejercicios'}</span>
          <small className="muted">{muscle ? 'Toca otra vez para quitar el filtro' : 'Toca un músculo para filtrar'}</small>
        </div>
      </div>
      {filters}
      <div className="list">
        {list.map((e) => {
          const pr = prs.get(e.id);
          return (
            <ExerciseRow
              key={e.id}
              e={e}
              onClick={() => setSel(e.id)}
              right={
                pr ? (
                  <small className="muted right">
                    <Trophy size={16} className="ico" />{' '}
                    {pr.best1RM ? fmtWeight(pr.best1RM) : pr.maxDuration ? formatDuration(pr.maxDuration) : pr.maxDistance ? `${pr.maxDistance} m` : `${pr.maxReps} reps`}
                    <br />
                    {pr.sessions} ses.
                  </small>
                ) : undefined
              }
            />
          );
        })}
      </div>
      {creating && (
        <Sheet title="Nuevo ejercicio" onClose={() => setCreating(false)}>
          <ExerciseEditor onSaved={(e) => (setCreating(false), setSel(e.id))} />
        </Sheet>
      )}
    </section>
  );
}

function CatalogBrowser({ onBack, onOpen }: { onBack: () => void; onOpen: (id: string) => void }) {
  const { data, update } = useStore();
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState<CatalogItem | null>(null);
  useEffect(() => {
    loadCatalog().then(setItems, (e) => setErr(String(e)));
  }, []);
  const asExercise = (c: CatalogItem): Exercise => ({
    id: `db-${c.id}`,
    name: c.name,
    muscle: c.muscle,
    secondary: c.secondary,
    equipment: c.equipment,
    kind: c.kind,
    media: c.id,
    instructions: c.instructions,
    custom: true,
  });
  const { list, filters } = useExerciseFilter((items ?? []).map(asExercise));
  const have = new Set(data.exercises.map((e) => e.id));
  const libraryByMedia = new Map(data.exercises.filter((e) => e.media).map((e) => [e.media!, e.id]));

  const add = (c: CatalogItem) => {
    const existing = libraryByMedia.get(c.id);
    if (existing) return onOpen(existing);
    update((d) => void d.exercises.push(asExercise(c)));
    onOpen(`db-${c.id}`);
  };

  return (
    <section>
      <Back onClick={onBack} />
      <h1>Catálogo</h1>
      <p className="muted small">Catálogo libre free-exercise-db (dominio público). Nombres e instrucciones en inglés: tradúcelos con el Coach IA desde la ficha.</p>
      {err && <p className="error">No se pudo cargar el catálogo: {err}</p>}
      {!items && !err && <p className="muted">Cargando…</p>}
      {filters}
      <p className="muted small">{list.length} resultados</p>
      <div className="list">
        {list.slice(0, 150).map((e) => (
          <ExerciseRow
            key={e.id}
            e={e}
            onClick={() => setPreview(items!.find((c) => c.id === e.media)!)}
            right={
              libraryByMedia.has(e.media!) || have.has(e.id) ? (
                <small className="muted icon-btn in-lib">
                  <Check size={14} /> En tu biblioteca
                </small>
              ) : undefined
            }
          />
        ))}
        {list.length > 150 && <p className="muted small">Mostrando 150. Afina la búsqueda para ver más.</p>}
      </div>
      {preview && (
        <Sheet title={preview.name} onClose={() => setPreview(null)}>
          <ExerciseMedia media={preview.id} />
          <p className="muted small">
            {MUSCLE_LABELS[preview.muscle]} · {catalogLabel(preview.equipment)} · {preview.category} · {catalogLabel(preview.level)}
          </p>
          <ol className="small">
            {preview.instructions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <button className="primary full" onClick={() => add(preview)}>
            {libraryByMedia.has(preview.id) ? 'Abrir en mi biblioteca' : 'Añadir a mi biblioteca'}
          </button>
        </Sheet>
      )}
    </section>
  );
}

type Metric = 'best1RM' | 'bestWeight' | 'bestSetVolume' | 'volume' | 'maxReps' | 'totalReps' | 'maxDuration' | 'maxDistance';
const METRICS: Record<Metric, string> = {
  best1RM: '1RM estimado',
  bestWeight: 'Peso máximo',
  bestSetVolume: 'Mejor serie',
  volume: 'Volumen sesión',
  maxReps: 'Reps máx.',
  totalReps: 'Reps sesión',
  maxDuration: 'Tiempo máx.',
  maxDistance: 'Distancia máx.',
};
const METRICS_BY_KIND: Record<ExerciseKind, Metric[]> = {
  weight_reps: ['best1RM', 'bestWeight', 'bestSetVolume', 'volume', 'totalReps'],
  reps: ['maxReps', 'totalReps', 'bestWeight'],
  assisted: ['maxReps', 'totalReps'],
  duration: ['maxDuration'],
  distance: ['maxDistance', 'maxDuration'],
};

function ExerciseDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, update, ai } = useStore();
  const e = data.exercises.find((x) => x.id === id);
  const [tab, setTab] = useState<'summary' | 'history' | 'howto' | 'records'>('summary');
  const [metric, setMetric] = useState<Metric | null>(null);
  const [range, setRange] = useState<'3m' | '1y' | 'all'>('all');
  const [editing, setEditing] = useState(false);
  const [instructions, setInstructions] = useState<string[] | null>(e?.instructions ?? null);
  const [translating, setTranslating] = useState(false);
  const [pickGif, setPickGif] = useState(false);
  const exdbCfg = useExdbConfig();

  useEffect(() => {
    if (!instructions && e?.media)
      loadCatalog()
        .then((c) => setInstructions(c.find((x) => x.id === e.media)?.instructions ?? []))
        .catch(() => setInstructions([]));
  }, [e?.media, instructions]);

  if (!e) return <Back onClick={onBack} />;
  const h = exerciseHistory(data, id);
  const pr = personalRecords(data).find((p) => p.exerciseId === id);
  const metrics = METRICS_BY_KIND[e.kind];
  const m = metric && metrics.includes(metric) ? metric : metrics[0];
  const since = range === 'all' ? 0 : Date.now() - (range === '3m' ? 90 : 365) * 864e5;
  const pts = h.filter((s) => Date.parse(s.date) >= since).map((s) => ({ x: Date.parse(s.date), y: Math.round((s[m as keyof ExerciseSession] as number) * 10) / 10 }));
  const fmtMetric = (k: Metric, v: number) => (k === 'maxDuration' ? formatDuration(v) : k === 'maxDistance' ? `${v} m` : k.includes('Reps') ? `${v}` : fmtWeight(v, { decimals: 1 }));

  const translate = async () => {
    if (!instructions?.length) return;
    setTranslating(true);
    try {
      const r = await chat(ai, [
        {
          role: 'user',
          content: `Traduce al español estas instrucciones de ejercicio. Devuelve solo una lista numerada, un paso por línea, sin introducción:\n${instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
        },
      ]);
      const steps = r
        .split('\n')
        .map((l) => l.replace(/^\s*\d+[.)]\s*/, '').trim())
        .filter(Boolean);
      setInstructions(steps);
      update((d) => void (d.exercises.find((x) => x.id === id)!.instructions = steps));
    } catch (err) {
      ask.error((err as Error).message);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <section>
      <Back
        onClick={onBack}
        right={
          <button className="ghost" onClick={() => setEditing(true)}>
            Editar
          </button>
        }
      />
      <h1>{e.name}</h1>
      <p className="muted small">
        {cap(catalogLabel(e.equipment))} · {EXERCISE_KIND_LABELS[e.kind]}
      </p>
      <div className="segmented fit">
        {(['summary', 'history', 'howto', 'records'] as const).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {{ summary: 'Resumen', history: 'Historial', howto: 'Cómo hacerlo', records: 'Récords' }[t]}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <>
          <ExerciseMedia exercise={e} />
          <MuscleMap exercise={e} />
          {exdbCfg.key && (
            <button className="ghost small icon-btn" onClick={() => setPickGif(true)}>
              <Film size={15} /> {e.exdbId ? 'Cambiar GIF' : 'Elegir GIF'}
            </button>
          )}
          {pr && (
            <div className="stats">
              {e.kind === 'weight_reps' ? (
                <>
                  <Stat value={toUnit(pr.best1RM)} label={`${weightUnit()} 1RM est.`} />
                  <Stat value={toUnit(pr.bestWeight)} label={`${weightUnit()} máx.`} />
                  <Stat value={pr.sessions} label="sesiones" />
                </>
              ) : e.kind === 'duration' ? (
                <>
                  <Stat value={formatDuration(pr.maxDuration)} label="mejor tiempo" />
                  <Stat value={pr.sessions} label="sesiones" />
                </>
              ) : e.kind === 'distance' ? (
                <>
                  <Stat value={`${pr.maxDistance} m`} label="mejor distancia" />
                  <Stat value={pr.sessions} label="sesiones" />
                </>
              ) : (
                <>
                  <Stat value={pr.maxReps} label="reps máx." />
                  <Stat value={pr.sessions} label="sesiones" />
                </>
              )}
            </div>
          )}
          <div className="chips">
            {metrics.map((k) => (
              <button key={k} className={m === k ? 'on' : ''} onClick={() => setMetric(k)}>
                {METRICS[k]}
              </button>
            ))}
          </div>
          <div className="chips small">
            {(['3m', '1y', 'all'] as const).map((r) => (
              <button key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>
                {{ '3m': '3 meses', '1y': '1 año', all: 'Todo' }[r]}
              </button>
            ))}
          </div>
          <MetricHead points={pts} label={METRICS[m]} range={{ '3m': 'en 3 meses', '1y': 'en un año', all: 'desde el principio' }[range]} format={(v) => fmtMetric(m, v)} />
          <LineChart points={pts} format={(v) => fmtMetric(m, v)} />
          {e.stickyNote && (
            <p className="sticky-note">
              <Pin size={16} className="ico" /> {e.stickyNote}
            </p>
          )}
          <StrengthCard exerciseId={id} />
        </>
      )}

      {tab === 'history' && (
        <>
          {[...h].reverse().map((s) => (
            <div key={s.workoutId + s.date} className="card small">
              <b>{fmtDate(s.date)}</b> <span className="muted">· {data.workouts.find((w) => w.id === s.workoutId)?.name}</span>
              <ol>
                {s.sets.map((x, i) => (
                  <li key={i}>{formatSet(x, e)}</li>
                ))}
              </ol>
            </div>
          ))}
          {!h.length && <p className="muted">Sin registros todavía.</p>}
        </>
      )}

      {tab === 'howto' && (
        <>
          <ExerciseMedia exercise={e} />
          {instructions === null && <p className="muted">Cargando instrucciones…</p>}
          {instructions?.length ? (
            <ol>
              {instructions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          ) : (
            instructions && <p className="muted">Sin instrucciones para este ejercicio.</p>
          )}
          {!!instructions?.length && ai.baseUrl && (
            <button className="ghost" disabled={translating} onClick={translate}>
              {translating ? 'Traduciendo…' : 'Traducir al español con IA'}
            </button>
          )}
          <label>
            <Pin size={16} className="ico" /> Nota fija (aparece cada vez que hagas este ejercicio)
            <textarea
              value={e.stickyNote ?? ''}
              placeholder="Ej.: asiento en posición 4, agarre medio"
              onChange={(ev) => update((d) => void (d.exercises.find((x) => x.id === id)!.stickyNote = ev.target.value || undefined))}
            />
          </label>
        </>
      )}

      {tab === 'records' && <Records id={id} e={e} />}

      {pickGif && (
        <GifPicker
          exercise={e}
          onClose={() => setPickGif(false)}
          onPick={(id) => {
            update((d) => void (d.exercises.find((x) => x.id === e.id)!.exdbId = id));
            setPickGif(false);
          }}
        />
      )}
      {editing && (
        <Sheet title="Editar ejercicio" onClose={() => setEditing(false)}>
          <ExerciseEditor initial={e} onSaved={() => setEditing(false)} />
          {e.custom && !data.workouts.some((w) => w.exercises.some((x) => x.exerciseId === id)) && (
            <button
              className="danger full"
              onClick={async () =>
                (await ask.confirm('¿Borrar este ejercicio?', { ok: 'Borrar', danger: true })) && (update((d) => void (d.exercises = d.exercises.filter((x) => x.id !== id))), onBack())
              }
            >
              Borrar ejercicio
            </button>
          )}
        </Sheet>
      )}
    </section>
  );
}

// Cifra grande de la métrica elegida (última sesión) y cuánto ha cambiado en el rango.
function MetricHead({ points, label, range, format }: { points: { y: number }[]; label: string; range: string; format: (v: number) => string }) {
  if (!points.length) return null;
  const last = points.at(-1)!.y;
  const diff = Math.round((last - points[0].y) * 10) / 10;
  return (
    <div className="metric-head">
      <b>{format(last)}</b>
      <span className="muted small">{label} · última sesión</span>
      {points.length > 1 && (
        <span className={`metric-diff ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}`}>
          {diff > 0 ? '+' : diff < 0 ? '−' : '±'}
          {format(Math.abs(diff))} {range}
        </span>
      )}
    </div>
  );
}

function Records({ id, e }: { id: string; e: Exercise }) {
  const { data } = useStore();
  const pr = personalRecords(data).find((p) => p.exerciseId === id);
  const reps = repRecords(data, id);
  const h = exerciseHistory(data, id);
  if (!pr) return <p className="muted">Aún no hay récords.</p>;
  const totalVol = h.reduce((v, s) => v + s.volume, 0);
  const totalReps = h.reduce((v, s) => v + s.totalReps, 0);
  return (
    <>
      <div className="card">
        <h3>Récords personales</h3>
        <table className="table">
          <tbody>
            {e.kind === 'weight_reps' && (
              <>
                <tr>
                  <td>Peso máximo</td>
                  <td>{fmtWeight(pr.bestWeight)}</td>
                </tr>
                <tr>
                  <td>1RM estimado</td>
                  <td>{fmtWeight(pr.best1RM)}</td>
                </tr>
                <tr>
                  <td>Mejor serie (peso × reps)</td>
                  <td>{fmtWeight(pr.bestSetVolume, { decimals: 0 })}</td>
                </tr>
                <tr>
                  <td>Mejor volumen en una sesión</td>
                  <td>{fmtWeight(pr.bestVolumeSession, { decimals: 0 })}</td>
                </tr>
              </>
            )}
            {pr.maxReps > 0 && (
              <tr>
                <td>Más repeticiones</td>
                <td>{pr.maxReps}</td>
              </tr>
            )}
            {pr.maxDuration > 0 && (
              <tr>
                <td>Más tiempo</td>
                <td>{formatDuration(pr.maxDuration)}</td>
              </tr>
            )}
            {pr.maxDistance > 0 && (
              <tr>
                <td>Más distancia</td>
                <td>{pr.maxDistance} m</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {reps.length > 0 && (
        <div className="card">
          <h3>Mejor peso por repeticiones</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Reps</th>
                <th>Peso</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {reps.map((r) => (
                <tr key={r.reps}>
                  <td>{r.reps}</td>
                  <td>{fmtWeight(r.weight)}</td>
                  <td className="muted">{fmtDate(r.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {e.kind === 'weight_reps' && pr.best1RM > 0 && (
        <div className="card">
          <h3>Porcentajes de tu 1RM ({fmtWeight(pr.best1RM)})</h3>
          <table className="table small">
            <thead>
              <tr>
                <th>%</th>
                <th>Peso</th>
                <th>Reps aprox.</th>
              </tr>
            </thead>
            <tbody>
              {[100, 95, 90, 85, 80, 75, 70, 65, 60, 50].map((p) => {
                // Redondeado a pesos cargables: 2,5 kg o 5 lb.
                const step = weightUnit() === 'lb' ? 5 : 2.5;
                const wgt = Math.round((toUnit(pr.best1RM) * p) / 100 / step) * step;
                const reps = p === 100 ? 1 : Math.max(1, Math.round(30 * (100 / p - 1)));
                return (
                  <tr key={p}>
                    <td>{p}%</td>
                    <td>
                      {String(wgt).replace('.', ',')} {weightUnit()}
                    </td>
                    <td>{reps}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="card">
        <h3>Totales de por vida</h3>
        <table className="table">
          <tbody>
            <tr>
              <td>Sesiones</td>
              <td>{pr.sessions}</td>
            </tr>
            <tr>
              <td>Series</td>
              <td>{h.reduce((v, s) => v + s.sets.length, 0)}</td>
            </tr>
            {totalReps > 0 && (
              <tr>
                <td>Repeticiones</td>
                <td>{totalReps.toLocaleString('es-ES')}</td>
              </tr>
            )}
            {totalVol > 0 && (
              <tr>
                <td>Volumen</td>
                <td>{fmtWeight(totalVol, { decimals: 0 })}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// Buscador de GIFs de ExerciseDB para asignar a un ejercicio.
function GifPicker({ exercise, onClose, onPick }: { exercise: Exercise; onClose: () => void; onPick: (id: string | undefined) => void }) {
  const [list, setList] = useState<ExdbExercise[] | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState(englishName(exercise).replace(/ - .*/, ''));
  const [sel, setSel] = useState<string | undefined>(exercise.exdbId);
  useEffect(() => {
    loadExdbList().then(setList, (e) => setErr((e as Error).message));
  }, []);
  const results = list ? searchExdb(list, q, 40) : [];
  return (
    <Sheet title="Elegir GIF (ExerciseDB)" onClose={onClose}>
      {sel && <ExerciseMedia exdbId={sel} />}
      <input placeholder="Buscar en inglés (p. ej. bench press)" value={q} onChange={(ev) => setQ(ev.target.value)} />
      {err && <p className="error small">{err}</p>}
      {!list && !err && <p className="muted small">Cargando lista…</p>}
      <div className="list">
        {results.map((r) => (
          <button key={r.id} className={`item ${sel === r.id ? 'accent' : ''}`} onClick={() => setSel(r.id)}>
            <b>{r.name}</b>
            <small className="muted">
              {r.target} · {r.equipment}
            </small>
          </button>
        ))}
      </div>
      <div className="row picker-actions">
        <button className="primary grow" disabled={!sel} onClick={() => onPick(sel)}>
          Usar este GIF
        </button>
        {exercise.exdbId && (
          <button className="ghost" onClick={() => onPick(undefined)}>
            Quitar GIF
          </button>
        )}
      </div>
    </Sheet>
  );
}
