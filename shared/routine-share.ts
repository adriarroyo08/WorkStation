// Compartir rutinas por enlace: la rutina viaja comprimida en el propio enlace (tras el #), sin servidor.
// Los ejercicios de la biblioteca van por id; los personalizados incluyen su definición para recrearlos.
import { DEFAULT_EXERCISES, EXERCISE_KIND_LABELS, MUSCLE_LABELS } from './exercises';
import type { Exercise, ExerciseKind, MuscleGroup, Routine, SetType, WorkstationData } from './types';
import { uid } from './types';

const BUILTIN = new Set(DEFAULT_EXERCISES.map((e) => e.id));
const SET_TYPES: SetType[] = ['normal', 'warmup', 'drop', 'failure'];

interface Payload {
  v: 1;
  n: string; // nombre
  o?: string; // notas
  // [id, descanso, superserie?, series: [tipo, reps?, kg?, seg?][]]
  e: [string, number, string | null, [number, number | null, number | null, number | null][]][];
  // ejercicios personalizados: id → [nombre, músculo, material, tipo]
  c?: Record<string, [string, MuscleGroup, string, ExerciseKind]>;
}

const b64url = {
  enc: (bytes: Uint8Array) =>
    btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, ''),
  dec: (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

/** Codifica una rutina para un enlace. Con compresión ("z…") si el navegador la soporta; si no, JSON ("j…"). */
export async function encodeRoutine(r: Routine, exercises: Exercise[]): Promise<string> {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const ss = new Map<string, string>();
  const c: NonNullable<Payload['c']> = {};
  const p: Payload = {
    v: 1,
    n: r.name,
    ...(r.notes ? { o: r.notes } : {}),
    e: r.exercises.map((re) => {
      const ex = byId.get(re.exerciseId);
      if (!BUILTIN.has(re.exerciseId) && ex) c[re.exerciseId] = [ex.name, ex.muscle, ex.equipment, ex.kind];
      const sup = re.supersetId ? (ss.get(re.supersetId) ?? (ss.set(re.supersetId, String.fromCharCode(97 + ss.size)), ss.get(re.supersetId)!)) : null;
      return [re.exerciseId, re.restSec, sup, re.sets.map((s) => [SET_TYPES.indexOf(s.type), s.reps ?? null, s.weight ?? null, s.durationSec ?? null])];
    }),
    ...(Object.keys(c).length ? { c } : {}),
  };
  const json = new TextEncoder().encode(JSON.stringify(p));
  if (typeof CompressionStream === 'function') return `z${b64url.enc(await pipe(json, new CompressionStream('deflate-raw')))}`;
  return `j${b64url.enc(json)}`;
}

export interface SharedRoutine {
  name: string;
  notes?: string;
  exercises: { exerciseId: string; name: string; restSec: number; superset?: string; sets: { type: SetType; reps?: number; weight?: number; durationSec?: number }[] }[];
  custom: Exercise[];
}

/** Decodifica y valida un enlace compartido. Lanza un error legible si está roto o manipulado. */
export async function decodeRoutine(code: string, exercises: Exercise[] = DEFAULT_EXERCISES): Promise<SharedRoutine> {
  let p: Payload;
  try {
    const raw = b64url.dec(code.slice(1));
    const bytes = code[0] === 'z' ? await pipe(raw, new DecompressionStream('deflate-raw')) : raw;
    p = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('El enlace de la rutina está incompleto o dañado.');
  }
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined);
  const num = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : undefined);
  if (p?.v !== 1 || !str(p.n, 120) || !Array.isArray(p.e) || !p.e.length || p.e.length > 60) throw new Error('El enlace no contiene una rutina válida.');
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const custom: Exercise[] = Object.entries(p.c ?? {})
    .slice(0, 60)
    .map(([id, [name, muscle, equipment, kind]]) => ({
      id: str(id, 80)!,
      name: str(name, 80) ?? id,
      // Solo valores conocidos: un enlace manipulado no puede colar músculos o tipos inexistentes.
      muscle: muscle in MUSCLE_LABELS ? muscle : 'otro',
      equipment: str(equipment, 40) ?? 'otro',
      kind: kind in EXERCISE_KIND_LABELS ? kind : 'weight_reps',
      custom: true,
    }));
  const customById = new Map(custom.map((e) => [e.id, e]));
  return {
    name: str(p.n, 120)!,
    notes: str(p.o, 2000),
    custom,
    exercises: p.e.map(([id, rest, sup, sets]) => {
      const exerciseId = str(id, 80) ?? 'otro';
      return {
        exerciseId,
        name: byId.get(exerciseId)?.name ?? customById.get(exerciseId)?.name ?? exerciseId,
        restSec: num(rest, 3600) ?? 90,
        superset: str(sup, 4) ?? undefined,
        sets: (Array.isArray(sets) ? sets : []).slice(0, 30).map(([t, reps, weight, dur]) => ({
          type: SET_TYPES[num(t, 3) ?? 0],
          reps: num(reps, 1000) ?? undefined,
          weight: num(weight, 2000) ?? undefined,
          durationSec: num(dur, 36000) ?? undefined,
        })),
      };
    }),
  };
}

/** Guarda una rutina compartida en los datos: recrea los ejercicios personalizados que falten (por nombre). */
export function importSharedRoutine(data: WorkstationData, s: SharedRoutine, folderId?: string): Routine {
  const idMap = new Map<string, string>();
  for (const c of s.custom) {
    const same = data.exercises.find((e) => e.id === c.id || e.name.toLowerCase() === c.name.toLowerCase());
    if (same) idMap.set(c.id, same.id);
    else {
      const id = data.exercises.some((e) => e.id === c.id) ? `custom-${uid()}` : c.id;
      data.exercises.push({ ...c, id });
      idMap.set(c.id, id);
    }
  }
  const groups = new Map<string, string>();
  const r: Routine = {
    id: uid(),
    name: s.name,
    notes: s.notes,
    folderId,
    exercises: s.exercises.map((e) => ({
      exerciseId: idMap.get(e.exerciseId) ?? e.exerciseId,
      restSec: e.restSec,
      supersetId: e.superset ? (groups.get(e.superset) ?? (groups.set(e.superset, uid()), groups.get(e.superset))) : undefined,
      sets: e.sets.map((x) => ({
        type: x.type,
        ...(x.reps !== undefined ? { reps: x.reps } : {}),
        ...(x.weight !== undefined ? { weight: x.weight } : {}),
        ...(x.durationSec !== undefined ? { durationSec: x.durationSec } : {}),
      })),
    })),
  };
  data.routines.push(r);
  return r;
}
