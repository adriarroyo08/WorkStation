/** Normaliza una caducidad opcional; nunca permite crear claves ya caducadas. */
export function apiKeyExpiry(value: string | null, now = Date.now()): string | null {
  if (value === null) return null;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time) || time <= now) throw new Error('Elige una fecha de caducidad futura');
  return new Date(time).toISOString();
}

export interface RecoveryApiKey {
  id: string;
  name: string;
  key_prefix: string;
  expires_at: string | null;
}

export type RevokeOutcome = { status: 'revoked' } | { status: 'kept' } | { status: 'failed'; error: string };

/** Las keys que aún sirven para entrar: sin caducidad o con caducidad futura. */
export function activeApiKeys<T extends { expires_at: string | null }>(keys: T[], now = Date.now()): T[] {
  return keys.filter((k) => k.expires_at === null || new Date(k.expires_at).getTime() > now);
}

/** Un fallo al revocar se devuelve, no se lanza: la contraseña ya puede estar cambiada y hay que poder reintentarlo. */
export async function revokeKeys(revoke: () => Promise<void>): Promise<RevokeOutcome> {
  try {
    await revoke();
    return { status: 'revoked' };
  } catch (e) {
    return { status: 'failed', error: (e as Error).message };
  }
}

/** Primero la contraseña: si no se acepta, las keys no se tocan. Sin `revoke`, se conservan. */
export async function finishPasswordRecovery(updatePassword: () => Promise<void>, revoke: (() => Promise<void>) | null): Promise<RevokeOutcome> {
  await updatePassword();
  return revoke ? revokeKeys(revoke) : { status: 'kept' };
}

/** `count` es null mientras no se sabe cuántas hay. */
export const revokeAllLabel = (count: number | null): string => (count === null ? 'Revocar todas las API keys' : `Revocar todas las API keys (${count})`);

/** Qué ha pasado con las keys, para la pantalla final. `active` es null si no se pudieron contar. */
export function revokeOutcomeText(outcome: RevokeOutcome, active: number | null): string {
  if (outcome.status === 'revoked') return 'Las API keys se han revocado y ya no funcionan. Si necesitas alguna, genera otra en Ajustes.';
  if (outcome.status === 'failed') return `No se han podido revocar las API keys y siguen activas. ${outcome.error}`;
  if (active === 0) return '';
  if (active === 1) return 'Tu API key sigue activa. Puedes revocarla en Ajustes.';
  return `Tus${active === null ? '' : ` ${active}`} API keys siguen activas. Puedes revocarlas en Ajustes.`;
}

/**
 * ¿Hay que darle al móvil una key nueva para subir los entrenos del reloj?
 * `stored` es el dueño de la guardada ('' si no hay); `exists`, si sigue en el servidor (null si no se sabe: no se crea otra por un fallo de red).
 */
export function needsWatchKey(stored: string, uid: string, exists: boolean | null): boolean {
  return stored !== uid || exists === false;
}
