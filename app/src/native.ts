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

// Mensajes que llegan desde Android: {kind:'watch_cmd', payload:'<json>'} | {kind:'watch_status', nodes:[...]}
(window as unknown as { __workstationFromNative: (raw: string) => void }).__workstationFromNative = (raw: string) => {
  try {
    const msg = JSON.parse(raw) as { kind: string; payload?: string; nodes?: string[] };
    if (msg.kind === 'watch_status') {
      watch = { nodes: msg.nodes ?? [], checkedAt: Date.now() };
      subs.forEach((f) => f());
    } else if (msg.kind === 'watch_cmd' && msg.payload) {
      const c = parseWatchCommand(msg.payload);
      if (c) handler?.(c);
    }
  } catch {
    /* mensaje mal formado */
  }
};

export const native = {
  sendToWatch: (json: string) => api()?.sendToWatch(json),
  requestWatchStatus: () => api()?.requestWatchStatus(),
  scheduleRest: (end: number, label: string) => api()?.scheduleRest(end, label),
  cancelRest: () => api()?.cancelRest(),
  workoutOngoing: (name: string, startedAt: number, restEnd: number) => api()?.workoutOngoing(name, startedAt, restEnd),
  workoutEnded: () => api()?.workoutEnded(),
  openWatchApp: () => api()?.openWatchApp(),
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
