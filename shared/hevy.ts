// Importación de TUS datos desde Hevy por vías oficiales:
//  1. CSV de exportación (Hevy → Perfil → Ajustes → Exportar datos).
//  2. API pública de Hevy (requiere Hevy Pro y una API key de https://hevy.com/settings?developer).
// No usa ni copia código de la app de Hevy.
import { findOrCreateExercise, routineFromWorkout } from './data';
import { fromUnit } from './units';
import { uid } from './types';
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
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ''])));
}

// Hevy exporta fechas como "17 Oct 2026, 18:30" (o con el mes en español: "17 oct 2026, 18:30").
// Se interpretan en hora local. Si no se entiende la fecha, la fila se descarta (nunca se usa "ahora").
const MONTHS: Record<string, number> = {
  jan: 0,
  ene: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  ago: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
  dic: 11,
};
export function parseHevyDate(s: string | undefined): string | undefined {
  const t = (s ?? '').trim();
  const m = t.match(/^(\d{1,2})\s+([a-záéíóú]{3,})\.?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/i);
  if (m) {
    const month = MONTHS[m[2].toLowerCase().slice(0, m[2].toLowerCase().startsWith('sept') ? 4 : 3)];
    if (month !== undefined) return new Date(+m[3], month, +m[1], +m[4], +m[5]).toISOString();
  }
  // Formatos ISO ("2026-10-17 18:30:00", "2026-10-17T18:30:00Z").
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    const ms = Date.parse(t.replace(' ', 'T'));
    if (!Number.isNaN(ms)) return new Date(ms).toISOString();
  }
  return undefined;
}

const num = (s: string | number | null | undefined) => {
  if (s === null || s === undefined || s === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

export interface HevyImport {
  workouts: number;
  routines: number;
}

export function importHevyCsv(data: WorkstationData, csv: string): HevyImport {
  const rows = parseCsv(csv);
  const byKey = new Map<string, Workout>();
  for (const r of rows) {
    const key = `${r.title}|${r.start_time}`;
    let w = byKey.get(key);
    if (!w) {
      const startedAt = parseHevyDate(r.start_time);
      if (!startedAt) continue; // fecha ilegible: mejor no importar que fecharlo hoy
      w = {
        id: `hevy-${Date.parse(startedAt).toString(36)}`,
        name: r.title || 'Entrenamiento',
        startedAt,
        endedAt: parseHevyDate(r.end_time),
        notes: r.description || undefined,
        exercises: [],
      };
      byKey.set(key, w);
    }
    const exId = findOrCreateExercise(data, r.exercise_title).id;
    let ex: WorkoutExercise | undefined = w.exercises[w.exercises.length - 1];
    if (!ex || ex.exerciseId !== exId) {
      ex = { exerciseId: exId, notes: r.exercise_notes || undefined, sets: [] };
      w.exercises.push(ex);
    }
    // Las exportaciones en unidades imperiales usan weight_lbs y distance_miles.
    const lbs = num(r.weight_lbs);
    const miles = num(r.distance_miles);
    const km = num(r.distance_km) ?? (miles !== undefined ? miles * 1.609344 : undefined);
    ex.sets.push({
      type: SET_TYPES[r.set_type] ?? 'normal',
      weight: num(r.weight_kg) ?? (lbs !== undefined ? fromUnit(lbs, 'lb') : undefined),
      reps: num(r.reps),
      rpe: num(r.rpe),
      durationSec: num(r.duration_seconds),
      distanceM: km !== undefined ? km * 1000 : undefined,
      done: true,
    });
  }
  return importWorkouts(data, [...byKey.values()]);
}

interface HevyApiWorkout {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  exercises: {
    title: string;
    notes?: string;
    sets: { type?: string; weight_kg?: number | null; reps?: number | null; distance_meters?: number | null; duration_seconds?: number | null; rpe?: number | null }[];
  }[];
}

export function convertHevyApiWorkouts(data: WorkstationData, list: HevyApiWorkout[]): HevyImport {
  const workouts: Workout[] = list.map((hw) => ({
    id: `hevy-${hw.id}`,
    name: hw.title,
    notes: hw.description || undefined,
    startedAt: new Date(hw.start_time).toISOString(),
    endedAt: hw.end_time ? new Date(hw.end_time).toISOString() : undefined,
    exercises: hw.exercises.map((e) => ({
      exerciseId: findOrCreateExercise(data, e.title).id,
      notes: e.notes || undefined,
      sets: e.sets.map((s) => ({
        type: SET_TYPES[s.type ?? 'normal'] ?? 'normal',
        weight: num(s.weight_kg),
        reps: num(s.reps),
        rpe: num(s.rpe),
        durationSec: num(s.duration_seconds),
        distanceM: num(s.distance_meters),
        done: true,
      })),
    })),
  }));
  return importWorkouts(data, workouts);
}

export const hevySummary = (r: HevyImport) =>
  `Importados ${r.workouts} entrenamientos desde Hevy` + (r.routines ? ` y ${r.routines} rutinas (carpeta «Hevy»).` : '.');

function importWorkouts(data: WorkstationData, ws: Workout[]): HevyImport {
  upsertWorkouts(data, ws);
  return { workouts: ws.length, routines: addHevyRoutines(data, ws) };
}

// Las exportaciones de Hevy no traen las rutinas, pero cada entreno lleva su nombre: se reconstruye cada rutina
// a partir de la última vez que se hizo, en la carpeta "Hevy". Las rutinas que ya existen con ese nombre no se tocan.
function addHevyRoutines(data: WorkstationData, ws: Workout[]): number {
  const key = (s: string) => s.trim().toLowerCase();
  const have = new Set(data.routines.map((r) => key(r.name)));
  const latest = new Map<string, Workout>();
  for (const w of ws) {
    const k = key(w.name);
    const prev = latest.get(k);
    if (!have.has(k) && w.exercises.length && (!prev || w.startedAt > prev.startedAt)) latest.set(k, w);
  }
  if (!latest.size) return 0;
  let folder = data.folders.find((f) => f.name === 'Hevy');
  if (!folder) data.folders.push((folder = { id: uid(), name: 'Hevy' }));
  for (const w of latest.values()) data.routines.push({ ...routineFromWorkout(w, data.settings.defaultRestSec), folderId: folder.id });
  return latest.size;
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

// Inserta o actualiza. Un entreno ya importado se reconoce por id o por nombre + inicio (al minuto), así
// reimportar el CSV, o importar por CSV y después por la API, no duplica entrenos.
function upsertWorkouts(data: WorkstationData, ws: Workout[]) {
  const sig = (w: Workout) => `${w.name.trim().toLowerCase()}|${w.startedAt.slice(0, 16)}`;
  const byId = new Map(data.workouts.map((w, i) => [w.id, i]));
  const bySig = new Map(data.workouts.map((w, i) => [sig(w), i]));
  for (const w of ws) {
    const i = byId.get(w.id) ?? bySig.get(sig(w));
    if (i === undefined) {
      byId.set(w.id, data.workouts.length);
      bySig.set(sig(w), data.workouts.length);
      data.workouts.push(w);
    } else data.workouts[i] = { ...w, id: data.workouts[i].id };
  }
}
