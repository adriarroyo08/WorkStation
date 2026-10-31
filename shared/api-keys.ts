/** Normaliza una caducidad opcional; nunca permite crear claves ya caducadas. */
export function apiKeyExpiry(value: string | null, now = Date.now()): string | null {
  if (value === null) return null;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time) || time <= now) throw new Error('Elige una fecha de caducidad futura');
  return new Date(time).toISOString();
}
