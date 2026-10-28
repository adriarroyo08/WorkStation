// Puente con la app Android (WebView). Si la web corre en el navegador, todo esto es no-op.
// La app Android expone `window.WorkstationNative` y llama a `window.__workstationFromNative(json)`.
import { useSyncExternalStore } from 'react';
import type { WatchCommand } from '../../shared/session';
import { parseWatchCommand } from '../../shared/session';

interface NativeApi {
  sendToWatch(json: string): void;
  requestWatchStatus(): void;
  scheduleRest(endAtMs: number, label: string): void;
  cancelRest(): void;
  workoutOngoing(name: string, startedAtMs: number, restEndAtMs: number): void;
  workoutEnded(): void;
  saveFile(name: string, mime: string, base64: string): void;
  openWatchApp(): void;
  setSystemBars?(dark: boolean): void; // desde la app 1.4
  notificationsState?(): 'granted' | 'denied' | 'ask';
  requestNotifications?(): void;
  googleSignIn?(webClientId: string, hashedNonce: string): void;
  shareText?(title: string, text: string): void; // desde la app 1.3
  // Reloj autónomo (desde la app 1.5): biblioteca para el reloj, entrenos hechos en él y subida en segundo plano.
  sendLibraryToWatch?(json: string): void;
  requestWatchWorkouts?(): void;
  ackWatchWorkout?(id: string): void;
  setWatchUpload?(json: string): void;
  watchUploadUser?(): string;
}

const api = (): NativeApi | undefined => (window as unknown as { WorkstationNative?: NativeApi }).WorkstationNative;
export const isNative = () => !!api();

// Estado del reloj conectado.
let watch: { nodes: string[]; checkedAt: number } = { nodes: [], checkedAt: 0 };
const subs = new Set<() => void>();
export function useWatchStatus() {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => watch,
  );
}

let handler: ((c: WatchCommand) => void) | null = null;
export const onWatchCommand = (h: (c: WatchCommand) => void) => void (handler = h);
let workoutHandler: ((json: string) => void) | null = null;
export const onWatchWorkout = (h: (json: string) => void) => void (workoutHandler = h);

const notifWaiters: ((granted: boolean) => void)[] = [];
const googleWaiters: { ok: (token: string | null) => void; fail: (e: Error) => void }[] = [];

// Mensajes que llegan desde Android: {kind:'watch_cmd', payload:'<json>'} | {kind:'watch_status', nodes:[...]}
(window as unknown as { __workstationFromNative: (raw: string) => void }).__workstationFromNative = (raw: string) => {
  try {
    const msg = JSON.parse(raw) as { kind: string; payload?: string; nodes?: string[]; granted?: boolean; token?: string; message?: string };
    if (msg.kind === 'watch_status') {
      watch = { nodes: msg.nodes ?? [], checkedAt: Date.now() };
      subs.forEach((f) => f());
    } else if (msg.kind === 'notif_result') {
      notifWaiters.splice(0).forEach((r) => r(!!msg.granted));
    } else if (msg.kind === 'google_token' || msg.kind === 'google_cancel') {
      googleWaiters.splice(0).forEach((w) => w.ok(msg.kind === 'google_token' ? (msg.token ?? null) : null));
    } else if (msg.kind === 'google_error') {
      googleWaiters.splice(0).forEach((w) => w.fail(new Error(msg.message || 'No se pudo iniciar sesión con Google')));
    } else if (msg.kind === 'watch_workout' && msg.payload) {
      workoutHandler?.(msg.payload);
    } else if (msg.kind === 'watch_cmd' && msg.payload) {
      const c = parseWatchCommand(msg.payload);
      if (c) handler?.(c);
    }
  } catch {
    /* mensaje mal formado */
  }
};

// Botón "Atrás" de Android: cierra la hoja abierta o vuelve de la pantalla actual. Devuelve false si no había
// nada que cerrar (entonces la app pasa a segundo plano).
(window as unknown as { __workstationBack: () => boolean }).__workstationBack = () => {
  if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    return true;
  }
  const back = [...document.querySelectorAll<HTMLButtonElement>('.topbar > button:first-child')].find((b) => b.offsetParent !== null);
  if (back) {
    back.click();
    return true;
  }
  return false;
};

export const native = {
  /** Menú de compartir nativo (en Android el WebView no tiene navigator.share). true si se usó. */
  shareText: (title: string, text: string) => {
    const a = api();
    if (!a?.shareText) return false;
    a.shareText(title, text);
    return true;
  },
  /** Permiso de notificaciones: 'unsupported' fuera de la app Android (o en versiones sin este puente). */
  notificationsState: (): 'granted' | 'denied' | 'ask' | 'unsupported' => api()?.notificationsState?.() ?? 'unsupported',
  requestNotifications: () =>
    new Promise<boolean>((resolve) => {
      const a = api();
      if (!a?.requestNotifications) return resolve(false);
      notifWaiters.push(resolve);
      a.requestNotifications();
    }),
  /** Google (Credential Manager). null = cancelado; rechaza si falla o si esta versión de la app no lo soporta. */
  googleSignIn: (webClientId: string, hashedNonce: string) =>
    new Promise<string | null>((ok, fail) => {
      const a = api();
      if (!a?.googleSignIn) return fail(new Error('Esta versión de la app no admite Google. Actualízala.'));
      googleWaiters.push({ ok, fail });
      a.googleSignIn(webClientId, hashedNonce);
    }),
  /** Iconos de las barras del sistema según el tema efectivo (Android). */
  setSystemBars: (dark: boolean) => api()?.setSystemBars?.(dark),
  sendToWatch: (json: string) => api()?.sendToWatch(json),
  requestWatchStatus: () => api()?.requestWatchStatus(),
  scheduleRest: (end: number, label: string) => api()?.scheduleRest(end, label),
  cancelRest: () => api()?.cancelRest(),
  workoutOngoing: (name: string, startedAt: number, restEnd: number) => api()?.workoutOngoing(name, startedAt, restEnd),
  workoutEnded: () => api()?.workoutEnded(),
  openWatchApp: () => api()?.openWatchApp(),
  sendLibraryToWatch: (json: string) => api()?.sendLibraryToWatch?.(json),
  requestWatchWorkouts: () => api()?.requestWatchWorkouts?.(),
  ackWatchWorkout: (id: string) => api()?.ackWatchWorkout?.(id),
  /** Credenciales para que el móvil suba solo los entrenos del reloj ('' las borra). */
  setWatchUpload: (json: string) => api()?.setWatchUpload?.(json),
  /** Usuario de las credenciales guardadas: '' si no hay, undefined si esta versión no lo admite. */
  watchUploadUser: (): string | undefined => api()?.watchUploadUser?.(),
  async saveFile(name: string, blob: Blob): Promise<boolean> {
    const a = api();
    if (!a) return false;
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    a.saveFile(name, blob.type || 'application/octet-stream', btoa(bin));
    return true;
  },
};
