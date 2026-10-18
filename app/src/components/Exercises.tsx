import { useState } from 'react';
import { MUSCLE_LABELS } from '../../../shared/exercises';
import { exerciseHistory, formatSet, personalRecords } from '../../../shared/stats';
import { fmtDate, useStore } from '../store';
import LineChart from './LineChart';

type Metric = 'best1RM' | 'bestWeight' | 'volume' | 'maxReps';
const METRICS: Record<Metric, string> = { best1RM: '1RM estimado', bestWeight: 'Peso máximo', volume: 'Volumen', maxReps: 'Reps máx.' };

export default function Exercises() {
  const { data } = useStore();
  const [sel, setSel] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>('best1RM');
  const [q, setQ] = useState('');
  const prs = personalRecords(data);

  if (sel) {
    const e = data.exercises.find((x) => x.id === sel);
    const h = exerciseHistory(data, sel);
    const pr = prs.find((p) => p.exerciseId === sel);
    return (
      <section>
        <button className="ghost" onClick={() => setSel(null)}>
          ← Volver
        </button>
        <h1>{e?.name}</h1>
        <p className="muted">
          {e && MUSCLE_LABELS[e.muscle]} · {e?.equipment}
        </p>
        {pr && (
          <div className="stats">
            <div>
              <b>{pr.best1RM}</b>
              <small>kg e1RM</small>
            </div>
            <div>
              <b>{pr.bestWeight}</b>
              <small>kg máx.</small>
            </div>
            <div>
              <b>{pr.maxReps}</b>
              <small>reps máx.</small>
            </div>
          </div>
        )}
        <div className="chips">
          {(Object.keys(METRICS) as Metric[]).map((m) => (
            <button key={m} className={metric === m ? 'on' : ''} onClick={() => setMetric(m)}>
              {METRICS[m]}
            </button>
          ))}
        </div>
        <LineChart points={h.map((s) => ({ x: Date.parse(s.date), y: Math.round(s[metric] * 10) / 10 }))} />
        <h2>Sesiones</h2>
        {[...h].reverse().map((s) => (
          <div key={s.workoutId + s.date} className="card small">
            <b>{fmtDate(s.date)}</b>
            <div className="muted">{s.sets.map((x) => formatSet(x, e)).join(' · ')}</div>
          </div>
        ))}
        {!h.length && <p className="muted">Sin registros todavía.</p>}
      </section>
    );
  }

  const trained = new Set(prs.map((p) => p.exerciseId));
  const list = data.exercises
    .filter((e) => e.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(trained.has(b.id)) - Number(trained.has(a.id)) || a.name.localeCompare(b.name));

  return (
    <section>
      <h1>Progreso</h1>
      <input placeholder="Buscar ejercicio…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="list">
        {list.map((e) => {
          const pr = prs.find((p) => p.exerciseId === e.id);
          return (
            <button key={e.id} className="item" onClick={() => setSel(e.id)}>
              <b>{e.name}</b>
              <small className="muted">{pr ? `🏆 ${pr.best1RM} kg e1RM · ${pr.bestWeight} kg máx.` : MUSCLE_LABELS[e.muscle]}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
