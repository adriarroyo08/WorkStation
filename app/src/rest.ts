// Estado global del temporizador de descanso (sobrevive al cambiar de pestaña).
import { useSyncExternalStore } from 'react';

interface RestState {
  end: number | null;
  total: number;
}

let state: RestState = (() => {
  try {
    const s = JSON.parse(localStorage.getItem('rest') ?? 'null') as RestState | null;
    return s && s.end && s.end > Date.now() ? s : { end: null, total: 0 };
  } catch {
    return { end: null, total: 0 };
  }
})();
const subs = new Set<() => void>();

function emit(next: RestState) {
  state = next;
  try {
    localStorage.setItem('rest', JSON.stringify(state));
  } catch {
    /* sin almacenamiento */
  }
  subs.forEach((f) => f());
}

export const rest = {
  get: () => state,
  start: (sec: number) => emit({ end: Date.now() + sec * 1000, total: sec }),
  add: (sec: number) => state.end && emit({ end: Math.max(Date.now(), state.end + sec * 1000), total: Math.max(1, state.total + sec) }),
  stop: () => emit({ end: null, total: 0 }),
};

export function useRest(): RestState {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => state,
  );
}
