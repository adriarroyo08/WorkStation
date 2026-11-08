// Cronómetro de serie en curso: persiste en el dispositivo para sobrevivir a recargas (como el descanso).
import { useSyncExternalStore } from 'react';
import { parseStopwatch, pauseStopwatch, resumeStopwatch, startStopwatch, type SetStopwatch } from '../../shared/stopwatch';

const KEY = 'set-stopwatch';

let state: SetStopwatch | null = (() => {
  try {
    return parseStopwatch(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return null;
  }
})();
const subs = new Set<() => void>();

function emit(next: SetStopwatch | null) {
  state = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento */
  }
  subs.forEach((f) => f());
}

export const stopwatch = {
  start: (ref: Parameters<typeof startStopwatch>[0], targetSec?: number) => emit(startStopwatch(ref, Date.now(), targetSec)),
  toggle: () => state && emit(state.startedAt === null ? resumeStopwatch(state, Date.now()) : pauseStopwatch(state, Date.now())),
  markNotified: () => state && emit({ ...state, targetNotified: true }),
  clear: () => state && emit(null),
};

export function useStopwatch(): SetStopwatch | null {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => state,
  );
}
