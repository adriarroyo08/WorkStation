import { useMemo, useState } from 'react';
import { MUSCLE_LABELS, MUSCLE_REGION } from '../../../shared/exercises';
import { totals, weekStreak, weeklySeries } from '../../../shared/reports';
import { muscleSets, personalRecords } from '../../../shared/stats';
import type { MuscleGroup } from '../../../shared/types';
import { cap, fmtShort, useStore } from '../store';
import { formatDuration } from '../../../shared/stats';
import { achievements } from '../../../shared/achievements';
import Achievements, { AchievementIcon } from './Achievements';
import { Award, FileBarChart, Sparkles, Moon, Ruler, Settings as SettingsIcon, Sun } from 'lucide-react';
import BodyMap from './BodyMap';
import { StrengthOverview } from './Strength';
import Wrapped from './Wrapped';
import YearHeatmap from './YearHeatmap';
import Measurements from './Measurements';
import Reports from './Reports';
import Settings from './Settings';
import Coach from './Coach';
import { BarChart, HBars, MonthCalendar, Stat } from './ui';
import { fmtMass, fmtWeight, toUnit } from '../../../shared/units';

type Metric = 'workouts' | 'durationMin' | 'volume' | 'sets' | 'reps';
const METRICS: Record<Metric, string> = { workouts: 'Entrenos', durationMin: 'Duración', volume: 'Volumen', sets: 'Series', reps: 'Reps' };

export default function Profile({ onExercise }: { onExercise: (id: string) => void }) {
  const { data, settings, setSettings } = useStore();
  const [view, setView] = useState<'home' | 'reports' | 'measures' | 'settings' | 'achievements' | 'coach'>('home');
  const [metric, setMetric] = useState<Metric>('workouts');
  const [muscleRange, setMuscleRange] = useState<30 | 90 | 365>(30);
  const [detailed, setDetailed] = useState(false);
  const [wrapped, setWrapped] = useState(false);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const series = useMemo(() => weeklySeries(data, 12, settings.weekStartsMonday), [data, settings.weekStartsMonday]);
  const trained = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of data.workouts) m.set(new Date(w.startedAt).toDateString(), 1);
    return m;
  }, [data.workouts]);
  const all = totals(data.workouts, data.exercises);
  const streak = weekStreak(data, settings.weekStartsMonday);

  const since = Date.now() - muscleRange * 864e5;
  const ms = muscleSets(
    data,
    data.workouts.filter((w) => Date.parse(w.startedAt) >= since),
    false,
  );
  const muscleRows = detailed
    ? Object.entries(ms).map(([m, v]) => ({ label: MUSCLE_LABELS[m as MuscleGroup], value: Math.round(v) }))
    : [...Object.entries(ms).reduce((acc, [m, v]) => acc.set(MUSCLE_REGION[m as MuscleGroup], (acc.get(MUSCLE_REGION[m as MuscleGroup]) ?? 0) + v), new Map<string, number>())].map(
        ([label, value]) => ({ label, value: Math.round(value) }),
      );

  const prs = personalRecords(data);
  const allAch = useMemo(() => achievements(data), [data]);
  const unlocked = allAch.filter((a) => a.unlocked);
  const main = [...prs].sort((a, b) => b.sessions - a.sessions).slice(0, 6);
  // Año del resumen: el actual si ya has entrenado; en enero, el anterior si aún no.
  const thisYear = new Date().getFullYear();
  const trainedIn = (y: number) => data.workouts.some((w) => new Date(w.startedAt).getFullYear() === y);
  const wrappedYear = trainedIn(thisYear) ? thisYear : trainedIn(thisYear - 1) ? thisYear - 1 : undefined;

  if (view === 'reports') return <Reports onBack={() => setView('home')} />;
  if (view === 'achievements') return <Achievements onBack={() => setView('home')} />;
  if (view === 'measures') return <Measurements onBack={() => setView('home')} />;
  if (view === 'coach') return <Coach onBack={() => setView('home')} goSettings={() => setView('settings')} />;
  if (view === 'settings') return <Settings onBack={() => setView('home')} />;

  const fmt = (v: number) =>
    metric === 'volume' ? ((x) => (x >= 1000 ? `${Math.round(x / 100) / 10}k` : String(Math.round(x))))(toUnit(v)) : metric === 'durationMin' ? `${Math.round(v / 6) / 10}h` : String(Math.round(v));

  return (
    <section>
      <div className="row">
        <h1 className="grow">Perfil</h1>
        <button
          className="ghost icon-btn"
          aria-label="Cambiar tema"
          title="Tema claro / oscuro"
          onClick={() => {
            const dark = settings.theme === 'dark' || (settings.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
            setSettings({ theme: dark ? 'light' : 'dark' });
          }}
        >
          {settings.theme === 'light' || (settings.theme === 'auto' && !matchMedia('(prefers-color-scheme: dark)').matches) ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <button className="ghost icon-btn" onClick={() => setView('settings')} aria-label="Ajustes">
          <SettingsIcon size={20} /> Ajustes
        </button>
      </div>
      <div className="stats four">
        <Stat value={all.workouts} label="entrenos" />
        <Stat value={`${Math.round(all.durationMin / 60)}h`} label="entrenando" />
        <Stat value={fmtMass(all.volume)} label="levantadas" />
        <Stat value={streak} label="sem. racha" />
      </div>

      <div className="row tiles">
        <button className="card grow tile" onClick={() => setView('reports')}>
          <FileBarChart size={20} className="tile-ico" /> Informes
          <small className="muted">semanal · mensual · anual</small>
        </button>
        <button className="card grow tile" onClick={() => setView('measures')}>
          <Ruler size={20} className="tile-ico" /> Medidas
          <small className="muted">peso · cuerpo · fotos</small>
        </button>
      </div>
      <button className="card full tile" onClick={() => setView('coach')}>
        <Sparkles size={20} className="tile-ico" /> Coach IA
        <small className="muted">pregunta, analiza y crea rutinas</small>
      </button>
      {wrappedYear && (
        <button className="card wrapped-tile" onClick={() => setWrapped(true)}>
          <Sparkles size={28} className="w-emoji" />
          <span className="grow">
            <b>Tu {wrappedYear} en Workstation</b>
            <small>Tus cifras del año, en historias para compartir</small>
          </span>
        </button>
      )}
      {wrapped && wrappedYear && <Wrapped year={wrappedYear} onClose={() => setWrapped(false)} />}
      <button className="card full tile achievements-tile" onClick={() => setView('achievements')}>
        <span>
          <Award size={18} className="tile-ico inline" /> Logros{' '}
          <small className="muted">
            {unlocked.length} de {allAch.length}
          </small>
        </span>
        <span className="badge-row">
          {unlocked.slice(-6).map((a) => (
            <span key={a.id} title={a.title}>
              <AchievementIcon name={a.icon} size={18} />
            </span>
          ))}
        </span>
      </button>

      <div className="card">
        <h3>Últimas 12 semanas</h3>
        <div className="chips small">
          {(Object.keys(METRICS) as Metric[]).map((m) => (
            <button key={m} className={metric === m ? 'on' : ''} onClick={() => setMetric(m)}>
              {METRICS[m]}
            </button>
          ))}
        </div>
        <BarChart bars={series.map((s) => ({ label: fmtShort(s.start).replace('.', ''), value: s.totals[metric] }))} format={fmt} />
      </div>

      <div className="card">
        <div className="row">
          <h3 className="grow">Distribución muscular (series)</h3>
          <select aria-label="Periodo" className="inline" value={muscleRange} onChange={(e) => setMuscleRange(Number(e.target.value) as 30 | 90 | 365)}>
            <option value={30}>30 días</option>
            <option value={90}>3 meses</option>
            <option value={365}>1 año</option>
          </select>
        </div>
        <label className="toggle small">
          <span className="grow">Por músculo (detallado)</span>
          <input type="checkbox" checked={detailed} onChange={(e) => setDetailed(e.target.checked)} />
        </label>
        {muscleRows.length > 0 && (
          <BodyMap
            sets={muscleSets(
              data,
              data.workouts.filter((w) => Date.parse(w.startedAt) >= since),
            )}
          />
        )}
        {muscleRows.length ? <HBars rows={muscleRows.sort((a, b) => b.value - a.value)} /> : <p className="muted small">Sin datos en este periodo.</p>}
      </div>

      <div className="card">
        <div className="row">
          <button className="ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            ‹
          </button>
          <b className="grow center-text">{cap(month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))}</b>
          <button className="ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            ›
          </button>
        </div>
        <MonthCalendar month={month} trained={trained} mondayFirst={settings.weekStartsMonday} />
      </div>
      <div className="card">
        <h3>Último año</h3>
        <YearHeatmap workouts={data.workouts} mondayFirst={settings.weekStartsMonday} />
      </div>

      <StrengthOverview onExercise={onExercise} />

      {main.length > 0 && (
        <div className="card">
          <h3>Ejercicios principales</h3>
          {main.map((p) => (
            <button key={p.exerciseId} className="plain row full left exline" onClick={() => onExercise(p.exerciseId)}>
              <span className="grow">{p.exerciseName}</span>
              <span className="muted small">
                {p.sessions} ses. · {p.best1RM ? `${fmtWeight(p.best1RM)} e1RM` : p.maxDuration ? formatDuration(p.maxDuration) : p.maxDistance ? `${p.maxDistance} m` : `${p.maxReps} reps`}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
