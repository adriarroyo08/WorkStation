import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { emptyData, normalizeData } from '../../shared/data';
import type { WorkstationData } from '../../shared/types';

export const dataPath = () => process.env.WORKSTATION_DATA ?? join(homedir(), '.workstation', 'data.json');

export function loadData(): WorkstationData {
  const p = dataPath();
  if (!existsSync(p)) return emptyData();
  return normalizeData(JSON.parse(readFileSync(p, 'utf8')));
}

export function saveData(data: WorkstationData) {
  const p = dataPath();
  mkdirSync(dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  writeFileSync(tmp, JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2));
  renameSync(tmp, p);
}
