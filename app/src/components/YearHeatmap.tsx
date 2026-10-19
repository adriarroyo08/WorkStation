// Actividad del último año (estilo "contribuciones"): un cuadro por día, más intenso cuanto más volumen.
import { useMemo } from 'react';
import { workoutVolume } from '../../../shared/stats';
import type { Workout } from '../../../shared/types';

export default function YearHeatmap({ workouts, mondayFirst }: { workouts: Workout[]; mondayFirst: boolean }) {
  const { weeks, max, days } = useMemo(() => {
    const vol = new Map<string, number>();
    for (const w of workouts) {
      const k = new Date(w.startedAt).toDateString();
      vol.set(k, (vol.get(k) ?? 0) + Math.max(1, workoutVolume(w)));
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 52 * 7);
    start.setDate(start.getDate() - (mondayFirst ? (start.getDay() + 6) % 7 : start.getDay()));
    const weeks: { date: Date; v: number }[][] = [];
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      if (!weeks.length || weeks[weeks.length - 1].length === 7) weeks.push([]);
      weeks[weeks.length - 1].push({ date: new Date(d), v: vol.get(d.toDateString()) ?? 0 });
    }
    return { weeks, max: Math.max(1, ...vol.values()), days: [...vol.keys()].filter((k) => Date.parse(k) >= start.getTime()).length };
  }, [workouts, mondayFirst]);
  const C = 9,
    G = 2;
  return (
    <div className="heatmap">
      <svg viewBox={`0 0 ${weeks.length * (C + G)} ${7 * (C + G) + 16}`} role="img" aria-label="Actividad del último año">
        {weeks.map((wk, i) => (
          <g key={i}>
            {wk[0].date.getDate() <= 7 && wk[0].date.getMonth() % 2 === 0 && (
              <text x={i * (C + G)} y={7 * (C + G) + 14} className="hm-lbl">
                {wk[0].date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}
              </text>
            )}
            {wk.map((d, j) => (
              <rect key={j} x={i * (C + G)} y={j * (C + G)} width={C} height={C} rx={2} className={d.v ? 'hm on' : 'hm'} style={d.v ? { fillOpacity: 0.3 + 0.7 * (d.v / max) } : undefined}>
                <title>{`${d.date.toLocaleDateString('es-ES')}${d.v ? ` · ${Math.round(d.v).toLocaleString('es-ES')} kg` : ''}`}</title>
              </rect>
            ))}
          </g>
        ))}
      </svg>
      <p className="muted small">{days} días entrenados en los últimos 12 meses</p>
    </div>
  );
}
