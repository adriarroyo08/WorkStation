// Política de retención de las copias de seguridad automáticas del dispositivo.
export interface BackupMeta {
  id: string;
  at: string; // ISO
  reason: 'diaria' | 'antes de importar' | 'antes de borrar' | 'antes de restaurar' | 'antes de cambiar de cuenta' | 'manual';
  workouts: number;
  routines: number;
}

export const KEEP_DAILY = 7;
export const KEEP_OTHER = 5;

const day = (iso: string) => iso.slice(0, 10);

/** ¿Hace falta la copia diaria? (no hay ninguna "diaria" de hoy). */
export const needsDaily = (list: BackupMeta[], now = new Date()) => !list.some((b) => b.reason === 'diaria' && day(b.at) === day(now.toISOString()));

/** Copias que sobran: se conservan las últimas 7 diarias (una por día) y las últimas 5 del resto. */
export function prune(list: BackupMeta[]): { keep: BackupMeta[]; drop: BackupMeta[] } {
  const sorted = [...list].sort((a, b) => b.at.localeCompare(a.at));
  const keep: BackupMeta[] = [];
  const days = new Set<string>();
  let others = 0;
  for (const b of sorted) {
    if (b.reason === 'diaria') {
      if (days.size < KEEP_DAILY && !days.has(day(b.at))) {
        days.add(day(b.at));
        keep.push(b);
      }
    } else if (others < KEEP_OTHER) {
      others++;
      keep.push(b);
    }
  }
  return { keep, drop: sorted.filter((b) => !keep.includes(b)) };
}
