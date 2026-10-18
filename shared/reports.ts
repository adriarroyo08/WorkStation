// Informes semanales / mensuales / anuales y estadísticas de perfil.
import { MUSCLE_LABELS } from './exercises';
import { countsAsWorkSet, muscleSets, PR_LABELS, prEvents, workoutDurationMin, workoutReps, workoutSetCount, workoutVolume, type PrEvent } from './stats';
import type { MuscleGroup, Workout, WorkstationData } from './types';

export type PeriodKind = 'week' | 'month' | 'year';

export interface Period {
  kind: PeriodKind;
  start: Date; // inclusivo
  end: Date; // exclusivo
  label: string;
}

export function startOfWeek(d: Date, mondayFirst = true): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay(); // 0 = domingo
  const diff = mondayFirst ? (dow + 6) % 7 : dow;
  x.setDate(x.getDate() - diff);
  return x;
}

// offset 0 = periodo actual, -1 = anterior, etc.
export function period(kind: PeriodKind, offset = 0, mondayFirst = true, now = new Date()): Period {
  let start: Date, end: Date, label: string;
  if (kind === 'week') {
    start = startOfWeek(now, mondayFirst);
    start.setDate(start.getDate() + offset * 7);
    end = new Date(start);
    end.setDate(end.getDate() + 7);
    const last = new Date(end.getTime() - 864e5);
    const f = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    label = `Semana del ${f(start)} al ${f(last)}`;
  } else if (kind === 'month') {
    start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    label = start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    label = label[0].toUpperCase() + label.slice(1);
  } else {
    start = new Date(now.getFullYear() + offset, 0, 1);
    end = new Date(start.getFullYear() + 1, 0, 1);
    label = `Año ${start.getFullYear()}`;
  }
  return { kind, start, end, label };
}

export const inPeriod = (w: Workout, p: Period) => {
  const t = Date.parse(w.startedAt);
  return t >= p.start.getTime() && t < p.end.getTime();
};

export interface PeriodTotals {
  workouts: number;
  durationMin: number;
  volume: number;
  sets: number;
  reps: number;
  daysTrained: number;
}

export function totals(ws: Workout[]): PeriodTotals {
  return {
    workouts: ws.length,
    durationMin: ws.reduce((n, w) => n + workoutDurationMin(w), 0),
    volume: ws.reduce((n, w) => n + workoutVolume(w), 0),
    sets: ws.reduce((n, w) => n + workoutSetCount(w), 0),
    reps: ws.reduce((n, w) => n + workoutReps(w), 0),
    daysTrained: new Set(ws.map((w) => new Date(w.startedAt).toDateString())).size,
  };
}

export interface PeriodReport {
  period: Period;
  totals: PeriodTotals;
  previous: PeriodTotals;
  workouts: Workout[];
  prs: (PrEvent & { exerciseName: string })[];
  muscles: { muscle: MuscleGroup; label: string; sets: number; previous: number }[];
  topExercises: { exerciseId: string; name: string; sets: number; volume: number; sessions: number }[];
  byDay: { date: string; workouts: number; volume: number }[];
  goal: { target: number; weeksMet: number; weeks: number };
}

export function periodReport(data: WorkstationData, p: Period): PeriodReport {
  const names = new Map(data.exercises.map((e) => [e.id, e.name]));
  const ws = data.workouts.filter((w) => inPeriod(w, p)).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const len = p.end.getTime() - p.start.getTime();
  const prevP: Period =
    p.kind === 'month'
      ? { ...p, start: new Date(p.start.getFullYear(), p.start.getMonth() - 1, 1), end: p.start }
      : p.kind === 'year'
        ? { ...p, start: new Date(p.start.getFullYear() - 1, 0, 1), end: p.start }
        : { ...p, start: new Date(p.start.getTime() - len), end: p.start };
  const prevWs = data.workouts.filter((w) => inPeriod(w, prevP));

  const ids = new Set(ws.map((w) => w.id));
  const prs = prEvents(data)
    .filter((e) => ids.has(e.workoutId))
    .map((e) => ({ ...e, exerciseName: names.get(e.exerciseId) ?? e.exerciseId }));

  const cur = muscleSets(data, ws, false);
  const prev = muscleSets(data, prevWs, false);
  const muscles = [...new Set([...Object.keys(cur), ...Object.keys(prev)])]
    .map((m) => ({ muscle: m as MuscleGroup, label: MUSCLE_LABELS[m as MuscleGroup] ?? m, sets: cur[m as MuscleGroup] ?? 0, previous: prev[m as MuscleGroup] ?? 0 }))
    .sort((a, b) => b.sets - a.sets);

  const top = new Map<string, { sets: number; volume: number; sessions: number }>();
  for (const w of ws)
    for (const we of w.exercises) {
      const sets = we.sets.filter(countsAsWorkSet);
      if (!sets.length) continue;
      const t = top.get(we.exerciseId) ?? { sets: 0, volume: 0, sessions: 0 };
      t.sets += sets.length;
      t.volume += sets.reduce((v, s) => v + (s.weight ?? 0) * (s.reps ?? 0), 0);
      t.sessions++;
      top.set(we.exerciseId, t);
    }
  const topExercises = [...top.entries()]
    .map(([exerciseId, t]) => ({ exerciseId, name: names.get(exerciseId) ?? exerciseId, ...t, volume: Math.round(t.volume) }))
    .sort((a, b) => b.sets - a.sets)
    .slice(0, 10);

  const byDay: PeriodReport['byDay'] = [];
  if (p.kind !== 'year')
    for (let d = new Date(p.start); d < p.end; d.setDate(d.getDate() + 1)) {
      const day = ws.filter((w) => new Date(w.startedAt).toDateString() === d.toDateString());
      byDay.push({ date: d.toISOString(), workouts: day.length, volume: day.reduce((v, w) => v + workoutVolume(w), 0) });
    }

  // Semanas del periodo que cumplieron el objetivo semanal.
  const target = data.settings?.weeklyGoal ?? 3;
  const mondayFirst = data.settings?.weekStartsMonday ?? true;
  let weeks = 0,
    weeksMet = 0;
  for (let s = startOfWeek(p.start, mondayFirst); s < p.end && s.getTime() <= Date.now(); s.setDate(s.getDate() + 7)) {
    const e = new Date(s.getTime() + 7 * 864e5);
    weeks++;
    if (data.workouts.filter((w) => Date.parse(w.startedAt) >= s.getTime() && Date.parse(w.startedAt) < e.getTime()).length >= target) weeksMet++;
  }

  return { period: p, totals: totals(ws), previous: totals(prevWs), workouts: ws, prs, muscles, topExercises, byDay, goal: { target, weeksMet, weeks } };
}

// Serie de las últimas N semanas (para el gráfico de barras del perfil).
export function weeklySeries(data: WorkstationData, weeks = 12, mondayFirst = true, now = new Date()) {
  const out: { start: Date; totals: PeriodTotals }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const p = period('week', -i, mondayFirst, now);
    out.push({ start: p.start, totals: totals(data.workouts.filter((w) => inPeriod(w, p))) });
  }
  return out;
}

// Racha: semanas consecutivas (hasta la actual) con al menos un entrenamiento.
// La semana en curso no rompe la racha si todavía no has entrenado.
export function weekStreak(data: WorkstationData, mondayFirst = true, now = new Date()): number {
  let streak = 0;
  for (let i = 0; i < 520; i++) {
    const p = period('week', -i, mondayFirst, now);
    const n = data.workouts.filter((w) => inPeriod(w, p)).length;
    if (n > 0) streak++;
    else if (i > 0) break;
  }
  return streak;
}

const pct = (a: number, b: number) => (b ? `${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)}%` : a ? 'nuevo' : '=');

export function reportToText(r: PeriodReport): string {
  const t = r.totals,
    p = r.previous;
  const lines = [
    `INFORME: ${r.period.label}`,
    `Entrenamientos: ${t.workouts} (${pct(t.workouts, p.workouts)} vs periodo anterior) · Días entrenados: ${t.daysTrained}`,
    `Duración total: ${Math.round(t.durationMin / 6) / 10} h (${pct(t.durationMin, p.durationMin)}) · Volumen: ${t.volume.toLocaleString('es-ES')} kg (${pct(t.volume, p.volume)})`,
    `Series: ${t.sets} (${pct(t.sets, p.sets)}) · Repeticiones: ${t.reps}`,
    `Objetivo semanal (${r.goal.target}/semana) cumplido ${r.goal.weeksMet} de ${r.goal.weeks} semanas`,
  ];
  if (r.muscles.length) lines.push('', 'Series por músculo:', ...r.muscles.map((m) => `- ${m.label}: ${m.sets} (antes ${m.previous})`));
  if (r.topExercises.length) lines.push('', 'Ejercicios principales:', ...r.topExercises.map((e) => `- ${e.name}: ${e.sets} series, ${e.volume} kg`));
  if (r.prs.length) lines.push('', `Récords batidos (${r.prs.length}):`, ...r.prs.map((e) => `- ${e.exerciseName} · ${PR_LABELS[e.kind]}: ${e.value} (antes ${e.previous})`));
  return lines.join('\n');
}
