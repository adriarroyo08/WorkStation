// Ciclo de vida de la API key con la que el móvil sube los entrenos del reloj.
const DAY_MS = 86_400_000;

/** Vida de cada key. Si la app no se abre en todo este tiempo, los entrenos esperan en el reloj sin perderse. */
export const WATCH_KEY_DAYS = 90;
/** Margen antes de caducar en el que la app, al abrirse con sesión, ya emite la siguiente. */
export const WATCH_KEY_RENEW_DAYS = 30;

export function watchKeyExpiry(now = Date.now()): string {
  return new Date(now + WATCH_KEY_DAYS * DAY_MS).toISOString();
}

/**
 * ¿Hay que emitir una key nueva? Sí si la guardada es de otra cuenta (o no hay ninguna), si no tiene caducidad
 * legible (las anteriores a esta versión) o si le queda menos del margen de renovación.
 */
export function watchKeyDue(savedUser: string, savedExpiry: string | undefined, uid: string, now = Date.now()): boolean {
  if (savedUser !== uid) return true;
  const expiry = Date.parse(savedExpiry ?? '');
  return !Number.isFinite(expiry) || expiry - now < WATCH_KEY_RENEW_DAYS * DAY_MS;
}
