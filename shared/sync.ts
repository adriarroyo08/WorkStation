// Sincronización por registros: cada objeto de la app es una fila (colección + id).
// Se envían solo los registros que cambian y, en conflicto, gana el cambio más reciente.
import { emptyData, normalizeData } from './data';
import { DEFAULT_SETTINGS, type WorkstationData } from './types';

export const COLLECTIONS = ['workouts', 'routines', 'folders', 'exercises', 'measurements', 'settings'] as const;
export type Collection = (typeof COLLECTIONS)[number];

export interface SyncRecord {
  collection: Collection;
  id: string;
  doc: unknown | null; // null = borrado
  deleted: boolean;
  client_updated_at: string;
  updated_at?: string;
}

type ListCollection = Exclude<Collection, 'settings'>;
const LISTS: ListCollection[] = ['workouts', 'routines', 'folders', 'exercises', 'measurements'];

export const recordKey = (c: Collection, id: string) => `${c}:${id}`;

// Huella JSON de cada registro, para detectar cambios.
export function snapshot(data: WorkstationData): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of LISTS) for (const item of data[c] as { id: string }[]) m.set(recordKey(c, item.id), JSON.stringify(item));
  m.set(recordKey('settings', 'settings'), JSON.stringify(data.settings));
  return m;
}

// Cambios locales entre dos versiones de los datos.
export function diff(prev: Map<string, string>, next: WorkstationData, now = new Date().toISOString()): SyncRecord[] {
  const out: SyncRecord[] = [];
  const cur = snapshot(next);
  for (const [k, json] of cur) {
    if (prev.get(k) === json) continue;
    const [collection, ...rest] = k.split(':');
    out.push({ collection: collection as Collection, id: rest.join(':'), doc: JSON.parse(json), deleted: false, client_updated_at: now });
  }
  for (const k of prev.keys()) {
    if (cur.has(k)) continue;
    const [collection, ...rest] = k.split(':');
    out.push({ collection: collection as Collection, id: rest.join(':'), doc: null, deleted: true, client_updated_at: now });
  }
  return out;
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const validExercises = (v: unknown) => Array.isArray(v) && v.every((e) => isObject(e) && typeof e.exerciseId === 'string' && Array.isArray(e.sets));

/**
 * ¿Se puede aplicar este documento remoto? La base de datos guarda JSON libre: una API key de escritura filtrada podría
 * dejar filas que rompen la app en todos los dispositivos y pueden impedir llegar a la pantalla donde se revoca.
 */
export function validRemoteDoc(collection: Collection, id: string, doc: unknown): boolean {
  if (!isObject(doc)) return false;
  if (collection === 'settings') return true;
  if (doc.id !== id) return false;
  if (collection === 'workouts') return typeof doc.name === 'string' && typeof doc.startedAt === 'string' && validExercises(doc.exercises);
  if (collection === 'routines') return typeof doc.name === 'string' && validExercises(doc.exercises);
  if (collection === 'measurements') return typeof doc.date === 'string';
  return typeof doc.name === 'string'; // folders y exercises
}

const SETTINGS_SHAPE: Record<string, unknown> = { ...DEFAULT_SETTINGS, barLb: 0, platesLb: [] };
/** Descarta los ajustes remotos con un tipo distinto del esperado; los campos desconocidos se conservan (versiones futuras). */
function validSettings(doc: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(doc).filter(([k, v]) => {
      const shape = SETTINGS_SHAPE[k];
      return shape === undefined || (Array.isArray(shape) ? Array.isArray(v) : typeof v === typeof shape);
    }),
  );
}

// Aplica registros remotos sobre los datos locales. `pendingTs` = cambios locales aún no subidos
// (clave → fecha): si el local es más nuevo, se conserva el local.
export function applyRemote(data: WorkstationData, rows: SyncRecord[], pendingTs: Map<string, string> = new Map()): { data: WorkstationData; changed: number } {
  const d = structuredClone(data);
  let changed = 0;
  for (const r of rows) {
    if (!COLLECTIONS.includes(r.collection)) continue;
    if (!r.deleted && r.doc && !validRemoteDoc(r.collection, r.id, r.doc)) continue;
    const local = pendingTs.get(recordKey(r.collection, r.id));
    // Fechas comparadas como fechas: el servidor las devuelve como "…+00:00" con microsegundos y el cliente como "…Z".
    if (local && Date.parse(local) > Date.parse(r.client_updated_at)) continue;
    if (r.collection === 'settings') {
      if (!r.deleted && r.doc) {
        d.settings = { ...d.settings, ...validSettings(r.doc as Record<string, unknown>) };
        changed++;
      }
      continue;
    }
    const list = d[r.collection] as { id: string }[];
    const i = list.findIndex((x) => x.id === r.id);
    if (r.deleted || !r.doc) {
      if (i >= 0) {
        list.splice(i, 1);
        changed++;
      }
    } else if (i >= 0) {
      if (JSON.stringify(list[i]) !== JSON.stringify(r.doc)) {
        list[i] = r.doc as { id: string };
        changed++;
      }
    } else {
      list.push(r.doc as { id: string });
      changed++;
    }
  }
  return { data: normalizeData(d), changed };
}

// Primera sincronización de un dispositivo: todo lo local que no está en remoto se sube.
// No se suben los registros que siguen siendo los de fábrica (ajustes y ejercicios de la biblioteca sin tocar):
// si no, un móvil recién instalado subiría valores por defecto que luego pisarían los del dispositivo principal.
export function initialUpload(local: WorkstationData, remoteKeys: Set<string>, now = new Date(0).toISOString()): SyncRecord[] {
  const out: SyncRecord[] = [];
  const pristine = snapshot(emptyData());
  for (const [k, json] of snapshot(local)) {
    if (remoteKeys.has(k) || pristine.get(k) === json) continue;
    const [collection, ...rest] = k.split(':');
    // Fecha antigua: si otro dispositivo ya tenía ese registro, gana el remoto.
    out.push({ collection: collection as Collection, id: rest.join(':'), doc: JSON.parse(json), deleted: false, client_updated_at: now });
  }
  return out;
}

/**
 * Desfase del reloj del dispositivo respecto al servidor (ms; servidor − local), estimado con filas recién subidas:
 * el servidor les pone updated_at entre que se envía la petición (sentAt) y llega la respuesta (receivedAt).
 * Con él, "gana el cambio más reciente" no depende de que la hora del móvil esté bien puesta.
 */
export function estimateClockOffset(samples: { serverAt: string; sentAt: number; receivedAt: number }[]): number | undefined {
  const offs = samples.map((x) => Date.parse(x.serverAt) - (x.sentAt + x.receivedAt) / 2).filter((x) => Number.isFinite(x));
  if (!offs.length) return undefined;
  offs.sort((a, b) => a - b);
  return Math.round(offs[Math.floor(offs.length / 2)]);
}
