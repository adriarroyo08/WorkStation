import { useMemo, useState } from 'react';
import { chat } from '../../../shared/ai';
import { period, periodReport, reportToText, type PeriodKind } from '../../../shared/reports';
import { formatDuration } from '../../../shared/stats';
import { fmtCompact, fmtNum, useStore } from '../store';
import { Back, BarChart, Delta, HBars, PrList } from './ui';

export default function Reports({ onBack }: { onBack: () => void }) {
  const { data, settings, ai } = useStore();
  const [kind, setKind] = useState<PeriodKind>('week');
  const [offset, setOffset] = useState(0);
  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const p = period(kind, offset, settings.weekStartsMonday);
  const r = useMemo(() => periodReport(data, p), [data, p.start.getTime(), p.end.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const t = r.totals,
    prev = r.previous;
  const prevLabel = kind === 'week' ? 'semana anterior' : kind === 'month' ? 'mes anterior' : 'año anterior';
  const key = `${kind}:${p.start.toISOString()}`;

  const analyze = async () => {
    setBusy(true);
    try {
      const txt = await chat(ai, [
        { role: 'system', content: 'Eres un entrenador personal. Analiza el informe de entrenamiento en español: puntos fuertes, puntos a mejorar (volumen por músculo, constancia, progresión) y 3 recomendaciones concretas para el siguiente periodo. Máximo 200 palabras.' },
        { role: 'user', content: reportToText(r) },
      ]);
      setAnalysis((a) => ({ ...a, [key]: txt }));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Barras: días del periodo (semana/mes) o meses del año.
  const bars =
    kind === 'year'
      ? Array.from({ length: 12 }, (_, m) => ({
          label: new Date(p.start.getFullYear(), m, 1).toLocaleDateString('es-ES', { month: 'narrow' }),
          value: r.workouts.filter((w) => new Date(w.startedAt).getMonth() === m).length,
        }))
      : r.byDay.map((d) => ({ label: kind === 'week' ? new Date(d.date).toLocaleDateString('es-ES', { weekday: 'narrow' }) : String(new Date(d.date).getDate()), value: d.volume }));

  return (
    <section className="report">
      <Back onClick={onBack} right={<button className="ghost no-print" onClick={() => window.print()}>🖨 PDF</button>} />
      <h1>Informes</h1>
      <div className="segmented no-print">
        {(['week', 'month', 'year'] as const).map((k) => (
          <button key={k} className={kind === k ? 'on' : ''} onClick={() => (setKind(k), setOffset(0))}>
            {{ week: 'Semanal', month: 'Mensual', year: 'Anual' }[k]}
          </button>
        ))}
      </div>
      <div className="row period-nav">
        <button className="ghost no-print" onClick={() => setOffset(offset - 1)}>
          ‹
        </button>
        <b className="grow center-text">{p.label}</b>
        <button className="ghost no-print" disabled={offset >= 0} onClick={() => setOffset(offset + 1)}>
          ›
        </button>
      </div>

      {!t.workouts && <p className="muted center-text">No entrenaste en este periodo.</p>}

      <div className="stats four">
        {[
          ['Entrenos', t.workouts, prev.workouts, String(t.workouts)],
          ['Duración', t.durationMin, prev.durationMin, t.durationMin >= 60 ? `${Math.floor(t.durationMin / 60)}h ${t.durationMin % 60}m` : formatDuration(t.durationMin * 60)],
          ['Volumen (kg)', t.volume, prev.volume, fmtCompact(t.volume)],
          ['Series', t.sets, prev.sets, String(t.sets)],
        ].map(([label, cur, before, txt]) => (
          <div key={label as string} className="stat">
            <b>{txt}</b>
            <small>{label}</small>
            <Delta cur={cur as number} prev={before as number} />
          </div>
        ))}
      </div>
      <p className="muted small center-text">
        Comparado con {prevLabel} · {t.daysTrained} días entrenados · {t.reps.toLocaleString('es-ES')} repeticiones
      </p>

      <div className="card">
        <h3>Objetivo semanal ({r.goal.target} entrenos)</h3>
        <p>
          Cumplido <b>{r.goal.weeksMet}</b> de {r.goal.weeks} semana{r.goal.weeks === 1 ? '' : 's'}
        </p>
        <div className="progress">
          <div style={{ width: `${r.goal.weeks ? (r.goal.weeksMet / r.goal.weeks) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="card">
        <h3>{kind === 'year' ? 'Entrenos por mes' : 'Volumen por día'}</h3>
        <BarChart bars={bars} highlightLast={false} format={(v) => (kind === 'year' ? String(v) : v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v)))} />
      </div>

      {r.prs.length > 0 && (
        <div className="card">
          <h3>🏆 Récords batidos ({r.prs.length})</h3>
          <PrList prs={r.prs} />
        </div>
      )}

      {r.muscles.length > 0 && (
        <div className="card">
          <h3>Series por músculo</h3>
          <HBars rows={r.muscles.map((m) => ({ label: m.label, value: m.sets, previous: m.previous }))} />
        </div>
      )}

      {r.topExercises.length > 0 && (
        <div className="card">
          <h3>Ejercicios más trabajados</h3>
          <table className="table small">
            <thead>
              <tr>
                <th>Ejercicio</th>
                <th>Series</th>
                <th>Volumen</th>
              </tr>
            </thead>
            <tbody>
              {r.topExercises.map((e) => (
                <tr key={e.exerciseId}>
                  <td>{e.name}</td>
                  <td>{e.sets}</td>
                  <td>{e.volume ? `${fmtNum(e.volume)} kg` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {t.workouts > 0 && (
        <div className="card">
          <h3>🤖 Análisis del coach</h3>
          {analysis[key] ? <div className="pre small">{analysis[key]}</div> : <p className="muted small">Genera un análisis de este periodo con tu IA configurada.</p>}
          {ai.baseUrl ? (
            <button className="primary no-print" disabled={busy} onClick={analyze}>
              {busy ? 'Analizando…' : analysis[key] ? 'Regenerar análisis' : 'Generar análisis'}
            </button>
          ) : (
            <p className="muted small">Configura una IA en Ajustes para usar esta función.</p>
          )}
        </div>
      )}
      <button className="ghost full no-print" onClick={() => navigator.clipboard.writeText(reportToText(r) + (analysis[key] ? `\n\nANÁLISIS:\n${analysis[key]}` : '')).then(() => alert('Informe copiado'))}>
        📋 Copiar informe como texto
      </button>
    </section>
  );
}
