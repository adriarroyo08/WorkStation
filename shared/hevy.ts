// Importación de TUS datos desde Hevy por vías oficiales:
//  1. CSV de exportación (Hevy → Perfil → Ajustes → Exportar datos).
//  2. API pública de Hevy (requiere Hevy Pro y una API key de https://hevy.com/settings?developer).
// No usa ni copia código de la app de Hevy.
import { findOrCreateExercise, routineFromWorkout } from './data';
import { fromUnit } from './units';
import { uid } from './types';
import type { SetType, Workout, WorkoutExercise, WorkstationData } from './types';

const SET_TYPES: Record<string, SetType> = { normal: 'normal', warmup: 'warmup', dropset: 'drop', drop: 'drop', failure: 'failure' };

// Nombres de Hevy (exportación en inglés) → ejercicio de la biblioteca, para enlazar imágenes, instrucciones y récords.
// Los que no estén aquí se buscan por nombre y, si no hay, se crean como personalizados.
export const HEVY_EXERCISES: Record<string, string> = {
  'bench press (barbell)': 'press-banca',
  'bench press (dumbbell)': 'press-banca-mancuernas',
  'bench press (smith machine)': 'press-banca-smith',
  'bench press - close grip (barbell)': 'press-cerrado',
  'incline bench press (barbell)': 'press-inclinado',
  'incline bench press (dumbbell)': 'press-inclinado-mancuernas',
  'incline chest press (machine)': 'press-inclinado-maquina',
  'decline bench press (barbell)': 'press-declinado',
  'decline bench press (machine)': 'press-declinado-maquina',
  'chest press (machine)': 'press-pecho-maquina',
  'iso-lateral chest press (machine)': 'press-pecho-maquina',
  'chest fly (dumbbell)': 'aperturas',
  'incline chest fly (dumbbell)': 'aperturas-inclinadas',
  'chest fly (machine)': 'pec-deck',
  'butterfly (pec deck)': 'pec-deck',
  'cable fly crossovers': 'cruce-poleas',
  'low cable fly crossovers': 'cruce-poleas-bajo',
  'chest dip': 'fondos',
  'push up': 'flexiones',
  'decline push up': 'flexiones-declinadas',
  'pull up': 'dominadas',
  'pull up (weighted)': 'dominadas-lastradas',
  'pull up (assisted)': 'dominadas-asistidas',
  'chin up': 'dominadas-supinas',
  'lat pulldown (cable)': 'jalon-pecho',
  'lat pulldown (machine)': 'jalon-pecho',
  'lat pulldown - close grip (cable)': 'jalon-cerrado',
  'straight arm lat pulldown (cable)': 'jalon-brazos-rectos',
  'bent over row (barbell)': 'remo-barra',
  'dumbbell row': 'remo-mancuerna',
  'seated cable row - v grip (cable)': 'remo-sentado',
  'seated cable row - bar grip': 'remo-sentado',
  'seated row (machine)': 'remo-maquina',
  'iso-lateral row (machine)': 'remo-iso-maquina',
  't bar row': 'remo-t',
  'inverted row': 'remo-invertido',
  'pullover (dumbbell)': 'pullover',
  'deadlift (barbell)': 'peso-muerto',
  'sumo deadlift': 'peso-muerto-sumo',
  'deadlift (trap bar)': 'peso-muerto-hexagonal',
  'back extension (hyperextension)': 'hiperextensiones',
  'good morning (barbell)': 'buenos-dias',
  'shrug (barbell)': 'encogimientos',
  'shrug (dumbbell)': 'encogimientos-mancuernas',
  'overhead press (barbell)': 'press-militar',
  'seated overhead press (barbell)': 'press-militar-sentado',
  'shoulder press (dumbbell)': 'press-hombro-mancuernas',
  'seated shoulder press (machine)': 'press-hombro-maquina',
  'shoulder press (machine plates)': 'press-hombro-maquina',
  'arnold press (dumbbell)': 'press-arnold',
  'lateral raise (dumbbell)': 'elevaciones-laterales',
  'lateral raise (cable)': 'elevaciones-laterales-polea',
  'single arm lateral raise (cable)': 'elevaciones-laterales-polea',
  'lateral raise (machine)': 'elevaciones-laterales-maquina',
  'front raise (dumbbell)': 'elevaciones-frontales',
  'front raise (cable)': 'elevaciones-frontales-polea',
  'rear delt reverse fly (dumbbell)': 'pajaros',
  'rear delt reverse fly (machine)': 'pajaros-maquina',
  'face pull': 'face-pull',
  'upright row (barbell)': 'remo-al-menton',
  'bicep curl (barbell)': 'curl-barra',
  'ez bar biceps curl': 'curl-z',
  'bicep curl (dumbbell)': 'curl-mancuernas',
  'incline curl (dumbbell)': 'curl-inclinado',
  'hammer curl (dumbbell)': 'curl-martillo',
  'hammer curl (cable)': 'curl-martillo-polea',
  'preacher curl (barbell)': 'curl-predicador',
  'preacher curl (machine)': 'curl-predicador-maquina',
  'concentration curl': 'curl-concentrado',
  'spider curl (dumbbell)': 'curl-spider',
  'bicep curl (cable)': 'curl-polea',
  'behind the back curl (cable)': 'curl-polea-espalda',
  'triceps pushdown': 'extension-triceps-polea',
  'triceps extension (cable)': 'extension-triceps-polea',
  'triceps rope pushdown': 'extension-triceps-cuerda',
  'single arm triceps pushdown (cable)': 'extension-triceps-polea-una',
  'overhead triceps extension (cable)': 'extension-triceps-cuerda-cabeza',
  'triceps extension (dumbbell)': 'extension-triceps-cabeza',
  'skullcrusher (barbell)': 'press-frances',
  'triceps dip': 'fondos-triceps',
  'triceps dip (weighted)': 'fondos-lastrados',
  'bench dip': 'fondos-banco',
  'wrist curl (barbell)': 'curl-muneca',
  'reverse curl (barbell)': 'curl-inverso',
  'farmers walk': 'paseo-granjero',
  'squat (barbell)': 'sentadilla',
  'front squat': 'sentadilla-frontal',
  'goblet squat': 'sentadilla-goblet',
  'squat (smith machine)': 'sentadilla-smith',
  'hack squat (machine)': 'sentadilla-hack',
  'squat (bodyweight)': 'sentadilla-peso-corporal',
  'leg press (machine)': 'prensa',
  'leg extension (machine)': 'extension-cuadriceps',
  'lunge (dumbbell)': 'zancadas',
  'walking lunge (dumbbell)': 'zancadas-caminando',
  'bulgarian split squat': 'bulgara',
  'bulgarian split squat (dumbbell)': 'bulgara',
  'romanian deadlift (barbell)': 'peso-muerto-rumano',
  'straight leg deadlift': 'peso-muerto-piernas-rigidas',
  'lying leg curl (machine)': 'curl-femoral',
  'seated leg curl (machine)': 'curl-femoral-sentado',
  'hip thrust (barbell)': 'hip-thrust',
  'hip thrust (machine)': 'hip-thrust-maquina',
  'glute bridge': 'puente-gluteo',
  'glute kickback (machine)': 'patada-gluteo',
  'hip abduction (machine)': 'abductores',
  'hip adduction (machine)': 'aductores',
  'standing calf raise': 'gemelos-pie',
  'standing calf raise (machine)': 'gemelos-pie',
  'seated calf raise': 'gemelos-sentado',
  'calf extension (machine)': 'gemelos-prensa',
  'calf press (machine)': 'gemelos-prensa',
  plank: 'plancha',
  'side plank': 'plancha-lateral',
  crunch: 'crunch',
  'bicycle crunch': 'crunch-bicicleta',
  'elbow to knee': 'codo-rodilla',
  'hanging leg raise': 'elevacion-piernas',
  'leg raise parallel bars': 'elevacion-piernas-paralelas',
  'ab wheel': 'rueda-abdominal',
  'cable crunch': 'crunch-polea',
  'crunch (machine)': 'crunch-maquina',
  'russian twist (weighted)': 'giros-rusos',
  'russian twist (bodyweight)': 'giros-rusos',
  'side bend (dumbbell)': 'flexion-lateral',
  'dead bug': 'dead-bug',
  'mountain climber': 'escaladores',
  running: 'correr',
  walking: 'caminar-cinta',
  cycling: 'bici',
  'elliptical trainer': 'eliptica',
  'stair machine': 'escaladora',
  'rowing machine': 'remo-ergometro',
  'air bike': 'air-bike',
  'jump rope': 'comba',
  burpee: 'burpees',
  'kettlebell swing': 'kettlebell-swing',
  'power clean': 'clean',
  'box jump': 'salto-cajon',
  'muscle up': 'muscle-up',
};

const hevyKey = (title: string) => title.trim().toLowerCase().replace(/\s+/g, ' ');

function hevyExercise(data: WorkstationData, title: string) {
  const id = HEVY_EXERCISES[hevyKey(title)];
  return data.exercises.find((e) => e.id === id) ?? findOrCreateExercise(data, title);
}

// Ejercicios ya importados como personalizados (antes de tener la tabla): sus entrenos y rutinas pasan al de la
// biblioteca y el personalizado se borra.
function relinkHevyExercises(data: WorkstationData) {
  const to = new Map<string, string>();
  for (const e of data.exercises) {
    const id = e.custom ? HEVY_EXERCISES[hevyKey(e.name)] : undefined;
    if (id && data.exercises.some((x) => x.id === id)) to.set(e.id, id);
  }
  if (!to.size) return;
  for (const x of [...data.workouts, ...data.routines]) for (const ex of x.exercises) ex.exerciseId = to.get(ex.exerciseId) ?? ex.exerciseId;
  data.exercises = data.exercises.filter((e) => !to.has(e.id));
}

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
    const exId = hevyExercise(data, r.exercise_title).id;
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
      exerciseId: hevyExercise(data, e.title).id,
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
  relinkHevyExercises(data);
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
