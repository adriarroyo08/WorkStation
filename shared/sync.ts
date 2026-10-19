// Sincronización por registros: cada objeto de la app es una fila (colección + id).
// Se envían solo los registros que cambian y, en conflicto, gana el cambio más reciente.
import { normalizeData } from './data';
import type { WorkstationData } from './types';

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

// Aplica registros remotos sobre los datos locales. `pendingTs` = cambios locales aún no subidos
// (clave → fecha): si el local es más nuevo, se conserva el local.
export function applyRemote(data: WorkstationData, rows: SyncRecord[], pendingTs: Map<string, string> = new Map()): { data: WorkstationData; changed: number } {
  const d = structuredClone(data);
  let changed = 0;
  for (const r of rows) {
    if (!COLLECTIONS.includes(r.collection)) continue;
    const local = pendingTs.get(recordKey(r.collection, r.id));
    if (local && local > r.client_updated_at) continue;
    if (r.collection === 'settings') {
      if (!r.deleted && r.doc) {
        d.settings = { ...d.settings, ...(r.doc as object) };
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
export function initialUpload(local: WorkstationData, remoteKeys: Set<string>, now = new Date(0).toISOString()): SyncRecord[] {
  const out: SyncRecord[] = [];
  for (const [k, json] of snapshot(local)) {
    if (remoteKeys.has(k)) continue;
    const [collection, ...rest] = k.split(':');
    // Fecha antigua: si otro dispositivo ya tenía ese registro, gana el remoto.
    out.push({ collection: collection as Collection, id: rest.join(':'), doc: JSON.parse(json), deleted: false, client_updated_at: now });
  }
  return out;
}
