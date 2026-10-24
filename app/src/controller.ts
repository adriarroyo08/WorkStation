// Controlador global del entrenamiento en curso: fin de descansos, sincronización con el reloj,
// notificación de Android, comandos que llegan del reloj y pulso.
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { workoutFromRoutine } from '../../shared/data';
import { buildWatchState, finishWorkout, summarizeHeartRate, toggleSet, type WatchCommand } from '../../shared/session';
import type { Workout } from '../../shared/types';
import { uid } from '../../shared/types';
import { clearSamples, pushHeartRate, takeSamples } from './hr';
import { native, onWatchCommand } from './native';
import { rest, useRest } from './rest';
import { beep, useNow, useStore } from './store';

type Store = ReturnType<typeof useStore>;

// Pantalla de resumen pendiente de mostrar (tras terminar desde el móvil o el reloj).
let summaryId: string | null = null;
const subs = new Set<() => void>();
export const summary = {
  show: (id: string) => ((summaryId = id), subs.forEach((f) => f())),
  clear: () => ((summaryId = null), subs.forEach((f) => f())),
};
export const useSummary = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => summaryId,
  );

export function startWorkout(store: Store, w: Workout) {
  clearSamples();
  rest.stop();
  store.setActive(w);
}

// Empezar desde la interfaz: la primera vez, y solo en Android con el permiso por pedir, se explica antes el
// permiso de notificaciones (NotifGate). Desde el reloj se arranca directamente con startWorkout.
const ASKED_KEY = 'ws:notifAsked';
const askedBefore = () => {
  try {
    return !!localStorage.getItem(ASKED_KEY);
  } catch {
    return false;
  }
};
export const markNotifAsked = () => {
  try {
    localStorage.setItem(ASKED_KEY, '1');
  } catch {
    /* almacenamiento bloqueado: se volverá a preguntar, sin más */
  }
};
let pendingStart: (() => void) | null = null;
const gateSubs = new Set<() => void>();
export const usePendingStart = () =>
  useSyncExternalStore(
    (f) => (gateSubs.add(f), () => gateSubs.delete(f)),
    () => pendingStart,
  );
export const resolvePendingStart = () => {
  const go = pendingStart;
  pendingStart = null;
  gateSubs.forEach((f) => f());
  go?.();
};
export function launchWorkout(store: Store, w: Workout) {
  if (native.notificationsState() !== 'ask' || askedBefore()) return startWorkout(store, w);
  markNotifAsked();
  pendingStart = () => startWorkout(store, w);
  gateSubs.forEach((f) => f());
}
export const launchEmpty = (store: Store) =>
  launchWorkout(store, { id: uid(), name: 'Entrenamiento', startedAt: new Date().toISOString(), exercises: [] });

export function startEmpty(store: Store) {
  startWorkout(store, { id: uid(), name: 'Entrenamiento', startedAt: new Date().toISOString(), exercises: [] });
}

export function discardActive(store: Store) {
  clearSamples();
  rest.stop();
  native.workoutEnded();
  store.setActive(null);
}

// Guarda el entrenamiento en curso. Devuelve false si no había ninguna serie completada.
export function finishActive(store: Store): boolean {
  const a = store.active;
  if (!a) return false;
  const done = finishWorkout(a);
  if (!done) return false;
  const hr = summarizeHeartRate(Date.parse(a.startedAt), takeSamples());
  if (hr) done.heartRate = hr;
  store.update((d) => void d.workouts.push(done));
  rest.stop();
  native.workoutEnded();
  store.setActive(null);
  summary.show(done.id);
  return true;
}

export function completeSet(store: Store, w: Workout, ei: number, si: number, overrides = {}, forceDone?: boolean): Workout {
  const { workout, restSec } = toggleSet(store.data, w, ei, si, overrides, forceDone);
  store.setActive(workout);
  if (restSec > 0) rest.start(restSec);
  return workout;
}

// ¿El comando del reloj se refiere al entreno y ejercicio que hay ahora en esa posición?
const matchesWatch = (w: Workout, data: Store['data'], c: { ei: number; wid?: string; ex?: string }) =>
  (!c.wid || c.wid === w.id) && (!c.ex || data.exercises.find((e) => e.id === w.exercises[c.ei]?.exerciseId)?.name === c.ex);

export function useSessionController() {
  const store = useStore();
  const { data, active, settings } = store;
  const r = useRest();
  const now = useNow(500);
  const ref = useRef(store);
  ref.current = store;

  // Fin del descanso (funciona en cualquier pestaña).
  const left = r.end ? r.end - now : 0;
  useEffect(() => {
    if (!r.end || left > 0) return;
    if (settings.vibrate) navigator.vibrate?.([300, 120, 300, 120, 300]);
    if (settings.sound) beep();
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted')
      navigator.serviceWorker?.getRegistration().then((reg) => reg?.showNotification('¡Descanso terminado!', { body: 'Siguiente serie', tag: 'rest', icon: 'icon.svg' }));
    rest.stop();
  }, [r.end, left, settings.vibrate, settings.sound]);

  // Estado → reloj (con un pequeño debounce) y notificación persistente de Android.
  useEffect(() => {
    const t = setTimeout(() => native.sendToWatch(JSON.stringify(buildWatchState(data, active, r))), 250);
    return () => clearTimeout(t);
  }, [data, active, r]);
  useEffect(() => {
    if (active) native.workoutOngoing(active.name, Date.parse(active.startedAt), r.end ?? 0);
    else native.workoutEnded();
  }, [active?.id, active?.name, active?.startedAt, r.end]); // eslint-disable-line react-hooks/exhaustive-deps

  // Alarma nativa para el fin del descanso (suena aunque la pantalla esté apagada).
  useEffect(() => {
    if (r.end && r.end > Date.now()) native.scheduleRest(r.end, ref.current.active?.name ?? 'Workstation');
    else native.cancelRest();
  }, [r.end]);

  // Comandos del reloj.
  useEffect(() => {
    onWatchCommand((c: WatchCommand) => {
      const s = ref.current;
      switch (c.type) {
        case 'hello':
          native.sendToWatch(JSON.stringify(buildWatchState(s.data, s.active, rest.get())));
          break;
        case 'complete_set':
        case 'uncomplete_set': {
          if (!s.active) break;
          // Si el reloj veía un estado anterior (se reordenó o borró algo), no se toca nada y se le reenvía el actual.
          if (!matchesWatch(s.active, s.data, c)) {
            native.sendToWatch(JSON.stringify(buildWatchState(s.data, s.active, rest.get())));
            break;
          }
          const next =
            c.type === 'complete_set' ? completeSet(s, s.active, c.ei, c.si, { weight: c.weight, reps: c.reps, durationSec: c.durationSec }, true) : completeSet(s, s.active, c.ei, c.si, {}, false);
          // Dos comandos seguidos antes de que React vuelva a pintar: el segundo parte del resultado del primero.
          ref.current = { ...s, active: next };
          break;
        }
        case 'rest_add':
          rest.add(c.sec);
          break;
        case 'rest_skip':
          rest.stop();
          break;
        case 'start_routine': {
          const routine = s.data.routines.find((x) => x.id === c.id);
          if (routine && !s.active) startWorkout(s, workoutFromRoutine(routine));
          break;
        }
        case 'start_empty':
          if (!s.active) startEmpty(s);
          break;
        case 'finish':
          if (!finishActive(s)) native.sendToWatch(JSON.stringify(buildWatchState(s.data, s.active, rest.get())));
          break;
        case 'hr':
          pushHeartRate(c.bpm, 'watch');
          break;
      }
    });
    native.requestWatchStatus();
  }, []);
}
