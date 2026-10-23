// Copias de seguridad automáticas en el dispositivo (IndexedDB): una al día y otra antes de cada operación
// que sustituye datos (importar, borrar, restaurar). Se guardan los datos completos, sin fotos.
import { del, get, set } from 'idb-keyval';
import { needsDaily, prune, type BackupMeta } from '../../shared/backups';
import { normalizeData } from '../../shared/data';
import type { WorkstationData } from '../../shared/types';
import { uid } from '../../shared/types';

const INDEX = 'backups';
const key = (id: string) => `backup:${id}`;

export const listBackups = async (): Promise<BackupMeta[]> => ((await get<BackupMeta[]>(INDEX)) ?? []).sort((a, b) => b.at.localeCompare(a.at));

export async function snapshot(data: WorkstationData, reason: BackupMeta['reason']): Promise<void> {
  if (!data.workouts.length && !data.routines.length && !data.measurements.length) return; // nada que proteger
  const meta: BackupMeta = { id: uid(), at: new Date().toISOString(), reason, workouts: data.workouts.length, routines: data.routines.length };
  await set(key(meta.id), data);
  const { keep, drop } = prune([...(await listBackups()), meta]);
  await set(INDEX, keep);
  await Promise.all(drop.map((b) => del(key(b.id))));
}

export async function dailySnapshot(data: WorkstationData): Promise<void> {
  if (needsDaily(await listBackups())) await snapshot(data, 'diaria');
}

export const loadBackup = async (id: string): Promise<WorkstationData | undefined> => {
  const d = await get(key(id));
  return d ? normalizeData(d) : undefined;
};
