// Importación de TUS datos desde Hevy por vías oficiales:
//  1. CSV de exportación (Hevy → Perfil → Ajustes → Exportar datos).
//  2. API pública de Hevy (requiere Hevy Pro y una API key de https://hevy.com/settings?developer).
// No usa ni copia código de la app de Hevy.
import { findOrCreateExercise } from './data';
import type { SetType, Workout, WorkoutExercise, WorkstationData } from './types';

const SET_TYPES: Record<string, SetType> = { normal: 'normal', warmup: 'warmup', dropset: 'drop', drop: 'drop', failure: 'failure' };

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') row.push(cell), (cell = '');
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell), rows.push(row), (row = []), (cell = '');
    } else cell += c;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  const [header, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ''])));
}

// Hevy exporta fechas como "17 Oct 2026, 18:30".
function parseHevyDate(s: string): string {
  const t = Date.parse(s.replace(',', ''));
  return Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}

const num = (s: string | number | null | undefined) => {
  if (s === null || s === undefined || s === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

export function importHevyCsv(data: WorkstationData, csv: string): number {
  const rows = parseCsv(csv);
  const byKey = new Map<string, Workout>();
  for (const r of rows) {
    const key = `${r.title}|${r.start_time}`;
    let w = byKey.get(key);
    if (!w) {
      const startedAt = parseHevyDate(r.start_time);
      w = { id: `hevy-${Date.parse(startedAt).toString(36)}`, name: r.title || 'Entrenamiento', startedAt, endedAt: r.end_time ? parseHevyDate(r.end_time) : undefined, notes: r.description || undefined, exercises: [] };
      byKey.set(key, w);
    }
    const exId = findOrCreateExercise(data, r.exercise_title).id;
    let ex: WorkoutExercise | undefined = w.exercises[w.exercises.length - 1];
    if (!ex || ex.exerciseId !== exId) {
      ex = { exerciseId: exId, notes: r.exercise_notes || undefined, sets: [] };
      w.exercises.push(ex);
    }
    const km = num(r.distance_km);
    ex.sets.push({ type: SET_TYPES[r.set_type] ?? 'normal', weight: num(r.weight_kg), reps: num(r.reps), rpe: num(r.rpe), durationSec: num(r.duration_seconds), distanceM: km !== undefined ? km * 1000 : undefined, done: true });
  }
  return upsertWorkouts(data, [...byKey.values()]);
}

interface HevyApiWorkout {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  exercises: { title: string; notes?: string; sets: { type?: string; weight_kg?: number | null; reps?: number | null; distance_meters?: number | null; duration_seconds?: number | null; rpe?: number | null }[] }[];
}

export function convertHevyApiWorkouts(data: WorkstationData, list: HevyApiWorkout[]): number {
  const workouts: Workout[] = list.map((hw) => ({
    id: `hevy-${hw.id}`,
    name: hw.title,
    notes: hw.description || undefined,
    startedAt: new Date(hw.start_time).toISOString(),
    endedAt: hw.end_time ? new Date(hw.end_time).toISOString() : undefined,
    exercises: hw.exercises.map((e) => ({
      exerciseId: findOrCreateExercise(data, e.title).id,
      notes: e.notes || undefined,
      sets: e.sets.map((s) => ({ type: SET_TYPES[s.type ?? 'normal'] ?? 'normal', weight: num(s.weight_kg), reps: num(s.reps), rpe: num(s.rpe), durationSec: num(s.duration_seconds), distanceM: num(s.distance_meters), done: true })),
    })),
  }));
  return upsertWorkouts(data, workouts);
}

export async function fetchHevyWorkouts(apiKey: string, maxPages = 50): Promise<HevyApiWorkout[]> {
  const all: HevyApiWorkout[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(`https://api.hevyapp.com/v1/workouts?page=${page}&pageSize=10`, { headers: { 'api-key': apiKey, accept: 'application/json' } });
    if (res.status === 404) break;
    if (!res.ok) throw new Error(`Hevy API ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { page_count: number; workouts: HevyApiWorkout[] };
    all.push(...body.workouts);
    if (page >= body.page_count) break;
  }
  return all;
}

function upsertWorkouts(data: WorkstationData, ws: Workout[]): number {
  const idx = new Map(data.workouts.map((w, i) => [w.id, i]));
  for (const w of ws) {
    const i = idx.get(w.id);
    if (i === undefined) data.workouts.push(w);
    else data.workouts[i] = w;
  }
  return ws.length;
}
