import type { Exercise, Workout, WorkoutSet, WorkstationData } from './types';

// 1RM estimado (fórmula de Epley).
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

const counts = (s: WorkoutSet) => s.done && s.type !== 'warmup';

export function workoutVolume(w: Workout): number {
  let v = 0;
  for (const ex of w.exercises)
    for (const s of ex.sets) if (counts(s)) v += (s.weight ?? 0) * (s.reps ?? 0);
  return Math.round(v);
}

export function workoutSetCount(w: Workout): number {
  return w.exercises.reduce((n, ex) => n + ex.sets.filter(counts).length, 0);
}

export function workoutDurationMin(w: Workout): number {
  if (!w.endedAt) return 0;
  return Math.round((Date.parse(w.endedAt) - Date.parse(w.startedAt)) / 60000);
}

export interface ExerciseSession {
  workoutId: string;
  date: string;
  sets: WorkoutSet[];
  bestWeight: number;
  best1RM: number;
  volume: number;
  maxReps: number;
}

export function exerciseHistory(data: WorkstationData, exerciseId: string): ExerciseSession[] {
  const out: ExerciseSession[] = [];
  for (const w of data.workouts) {
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      const sets = ex.sets.filter(counts);
      if (!sets.length) continue;
      out.push({
        workoutId: w.id,
        date: w.startedAt,
        sets,
        bestWeight: Math.max(0, ...sets.map((s) => s.weight ?? 0)),
        best1RM: Math.max(0, ...sets.map((s) => estimate1RM(s.weight ?? 0, s.reps ?? 0))),
        volume: sets.reduce((v, s) => v + (s.weight ?? 0) * (s.reps ?? 0), 0),
        maxReps: Math.max(0, ...sets.map((s) => s.reps ?? 0)),
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  bestWeight: number;
  best1RM: number;
  maxReps: number;
  bestVolumeSession: number;
  lastDate: string;
}

export function personalRecords(data: WorkstationData): PersonalRecord[] {
  const names = new Map(data.exercises.map((e) => [e.id, e.name]));
  const ids = new Set(data.workouts.flatMap((w) => w.exercises.map((e) => e.exerciseId)));
  const prs: PersonalRecord[] = [];
  for (const id of ids) {
    const h = exerciseHistory(data, id);
    if (!h.length) continue;
    prs.push({
      exerciseId: id,
      exerciseName: names.get(id) ?? id,
      bestWeight: Math.max(...h.map((s) => s.bestWeight)),
      best1RM: Math.max(...h.map((s) => s.best1RM)),
      maxReps: Math.max(...h.map((s) => s.maxReps)),
      bestVolumeSession: Math.round(Math.max(...h.map((s) => s.volume))),
      lastDate: h[h.length - 1].date,
    });
  }
  return prs.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}

export function formatSet(s: WorkoutSet, ex?: Exercise): string {
  const tag = s.type === 'warmup' ? ' (calent.)' : s.type === 'drop' ? ' (drop)' : s.type === 'failure' ? ' (fallo)' : '';
  if (ex?.kind === 'duration' || (s.durationSec && !s.reps)) return `${s.durationSec ?? 0}s${tag}`;
  if (ex?.kind === 'distance' || (s.distanceM && !s.reps)) return `${s.distanceM ?? 0}m${s.durationSec ? ` en ${s.durationSec}s` : ''}${tag}`;
  const w = s.weight ? `${s.weight}kg × ` : '';
  const rpe = s.rpe ? ` @RPE${s.rpe}` : '';
  return `${w}${s.reps ?? 0}${rpe}${tag}`;
}

// Resumen en texto plano para dar contexto a un modelo de IA.
export function trainingSummary(data: WorkstationData, lastN = 10): string {
  const names = new Map(data.exercises.map((e) => [e.id, e]));
  const recent = [...data.workouts].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, lastN);
  const lines: string[] = [];
  lines.push(`Entrenamientos totales registrados: ${data.workouts.length}.`);
  const lastBw = [...data.measurements].sort((a, b) => b.date.localeCompare(a.date)).find((m) => m.bodyweight);
  if (lastBw) lines.push(`Peso corporal más reciente: ${lastBw.bodyweight} kg (${lastBw.date.slice(0, 10)}).`);
  lines.push('', `Últimos ${recent.length} entrenamientos:`);
  for (const w of recent) {
    lines.push(`- ${w.startedAt.slice(0, 10)} "${w.name}" (${workoutDurationMin(w)} min, volumen ${workoutVolume(w)} kg)`);
    for (const ex of w.exercises) {
      const e = names.get(ex.exerciseId);
      const sets = ex.sets.filter((s) => s.done).map((s) => formatSet(s, e)).join(', ');
      lines.push(`    ${e?.name ?? ex.exerciseId}: ${sets}`);
    }
  }
  const prs = personalRecords(data).filter((p) => p.best1RM > 0).slice(0, 30);
  if (prs.length) {
    lines.push('', 'Récords (1RM estimado / peso máximo):');
    for (const p of prs) lines.push(`- ${p.exerciseName}: ${p.best1RM} kg e1RM, ${p.bestWeight} kg máx.`);
  }
  return lines.join('\n');
}
