// Resumen anual tipo "historias": las cifras y curiosidades del año de entrenamiento.
import { MUSCLE_LABELS } from './exercises';
import { period, periodReport, startOfWeek } from './reports';
import { exerciseHistory } from './stats';
import type { WorkstationData } from './types';

export interface YearWrapped {
  year: number;
  workouts: number;
  hours: number;
  daysTrained: number;
  volumeKg: number;
  sets: number;
  reps: number;
  prs: number;
  equivalence: string;
  topExercise?: { id: string; name: string; sessions: number };
  topMuscle?: { label: string; sets: number };
  biggestGain?: { name: string; from: number; to: number };
  bestMonth?: { label: string; workouts: number };
  favoriteDay?: string;
  timeOfDay?: 'mañana' | 'mediodía' | 'tarde' | 'noche';
  longestStreak: number; // semanas seguidas
}

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// Equivalencia divertida del peso total levantado.
export function volumeEquivalence(kg: number): string {
  const units: [number, string, string][] = [
    [190_000, 'ballena azul', 'ballenas azules'],
    [6_000, 'elefante', 'elefantes'],
    [1_500, 'coche', 'coches'],
    [300, 'piano de cola', 'pianos de cola'],
  ];
  for (const [w, one, many] of units) {
    const n = kg / w;
    if (n >= 1) {
      const r = n >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
      return `${r.toLocaleString('es-ES')} ${r === 1 ? one : many}`;
    }
  }
  return `${Math.round(kg / 20)} sacos de cemento`;
}

export function yearWrapped(data: WorkstationData, year = new Date().getFullYear()): YearWrapped {
  const p = period('year', year - new Date().getFullYear());
  const r = periodReport(data, p);
  const ws = r.workouts;
  const t = r.totals;

  const top = [...r.topExercises].sort((a, b) => b.sessions - a.sessions)[0];
  const muscle = r.muscles.find((m) => m.sets > 0);

  // Mayor mejora de 1RM estimado dentro del año (primera sesión del año frente a la mejor).
  let biggestGain: YearWrapped['biggestGain'];
  for (const ex of r.topExercises) {
    const h = exerciseHistory(data, ex.exerciseId).filter((s) => s.date >= p.start.toISOString() && s.date < p.end.toISOString() && s.best1RM > 0);
    if (h.length < 2) continue;
    const from = h[0].best1RM;
    const to = Math.max(...h.map((s) => s.best1RM));
    if (to > from && (!biggestGain || to - from > biggestGain.to - biggestGain.from)) biggestGain = { name: ex.name, from, to };
  }

  const months = new Map<number, number>();
  const days = new Map<number, number>();
  const hours = new Map<YearWrapped['timeOfDay'], number>();
  for (const w of ws) {
    const d = new Date(w.startedAt);
    months.set(d.getMonth(), (months.get(d.getMonth()) ?? 0) + 1);
    days.set(d.getDay(), (days.get(d.getDay()) ?? 0) + 1);
    const h = d.getHours();
    const tod = h < 12 ? 'mañana' : h < 16 ? 'mediodía' : h < 21 ? 'tarde' : 'noche';
    hours.set(tod, (hours.get(tod) ?? 0) + 1);
  }
  const maxOf = <K>(m: Map<K, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  const bm = maxOf(months);
  const fd = maxOf(days);
  const td = maxOf(hours);

  // Racha más larga de semanas consecutivas con algún entreno.
  const mondayFirst = data.settings.weekStartsMonday ?? true;
  const weeks = [...new Set(ws.map((w) => startOfWeek(new Date(w.startedAt), mondayFirst).getTime()))].sort((a, b) => a - b);
  let longestStreak = 0;
  let run = 0;
  weeks.forEach((wk, i) => {
    run = i > 0 && Math.round((wk - weeks[i - 1]) / (7 * 864e5)) === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
  });

  const monthLabel = (m: number) => {
    const s = new Date(year, m, 1).toLocaleDateString('es-ES', { month: 'long' });
    return s[0].toUpperCase() + s.slice(1);
  };

  return {
    year,
    workouts: t.workouts,
    hours: Math.round((t.durationMin / 60) * 10) / 10,
    daysTrained: t.daysTrained,
    volumeKg: Math.round(t.volume),
    sets: t.sets,
    reps: t.reps,
    prs: r.prs.length,
    equivalence: volumeEquivalence(t.volume),
    topExercise: top && { id: top.exerciseId, name: top.name, sessions: top.sessions },
    topMuscle: muscle && { label: MUSCLE_LABELS[muscle.muscle] ?? muscle.label, sets: muscle.sets },
    biggestGain,
    bestMonth: bm && { label: monthLabel(bm[0]), workouts: bm[1] },
    favoriteDay: fd && DAYS[fd[0]],
    timeOfDay: td?.[0],
    longestStreak,
  };
}
