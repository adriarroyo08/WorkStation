// Actualizaciones de la PWA: la nueva versión se descarga en segundo plano y se aplica cuando el usuario
// pulsa "Actualizar" (nunca a mitad de un entreno sin avisar).
import { useSyncExternalStore } from 'react';
import { isNative } from './native';

let needRefresh = false;
let apply: (() => Promise<void>) | undefined;
const subs = new Set<() => void>();

export async function setupPwa() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  // En la app Android la web ya va dentro del APK: un service worker serviría la versión anterior tras
  // actualizar la app. Se quita el que hubiera registrado una versión antigua.
  if (isNative()) {
    for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    return;
  }
  try {
    const { registerSW } = await import('virtual:pwa-register');
    apply = registerSW({
      onNeedRefresh() {
        needRefresh = true;
        subs.forEach((f) => f());
      },
      // Comprueba si hay versión nueva cada hora mientras la app está abierta.
      onRegisteredSW(_url, reg) {
        if (reg) setInterval(() => void reg.update().catch(() => {}), 60 * 60 * 1000);
      },
    });
  } catch {
    // Sin service worker (p. ej. WebView sin soporte): la app funciona igual, solo sin modo offline.
  }
}

export const updateApp = () => apply?.();

export const useNeedRefresh = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => needRefresh,
  );
