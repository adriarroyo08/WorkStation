import { describe, expect, it, vi } from 'vitest';
import { activeApiKeys, apiKeyExpiry, finishPasswordRecovery, needsWatchKey, revokeAllLabel, revokeKeys, revokeOutcomeText } from './api-keys';

describe('caducidad de API keys', () => {
  const now = Date.parse('2026-10-30T12:00:00Z');
  it('mantiene las claves sin caducidad y normaliza fechas futuras', () => {
    expect(apiKeyExpiry(null, now)).toBeNull();
    expect(apiKeyExpiry('2026-10-30T15:00:00+02:00', now)).toBe('2026-10-30T13:00:00.000Z');
  });
  it.each(['', 'incorrecta', '2026-10-30T11:59:59Z', '2026-10-30T12:00:00Z'])('rechaza %s', (value) => {
    expect(() => apiKeyExpiry(value, now)).toThrow('fecha de caducidad futura');
  });
});

describe('API keys al recuperar la contraseña', () => {
  const now = Date.parse('2026-10-30T12:00:00Z');

  it('cuenta como activas las que no tienen caducidad o la tienen en el futuro', () => {
    const keys = [{ expires_at: null }, { expires_at: '2026-10-30T12:00:01Z' }, { expires_at: '2026-10-30T12:00:00Z' }, { expires_at: '2026-01-01T00:00:00Z' }];
    expect(activeApiKeys(keys, now)).toEqual(keys.slice(0, 2));
  });

  it('cambia la contraseña antes de revocar', async () => {
    const order: string[] = [];
    const outcome = await finishPasswordRecovery(
      async () => void order.push('contraseña'),
      async () => void order.push('revocar'),
    );
    expect(order).toEqual(['contraseña', 'revocar']);
    expect(outcome).toEqual({ status: 'revoked' });
  });

  it('si la contraseña no se acepta, no revoca nada', async () => {
    const revoke = vi.fn(async () => {});
    await expect(finishPasswordRecovery(() => Promise.reject(new Error('débil')), revoke)).rejects.toThrow('débil');
    expect(revoke).not.toHaveBeenCalled();
  });

  it('conserva las keys si no se pide revocar', async () => {
    expect(await finishPasswordRecovery(async () => {}, null)).toEqual({ status: 'kept' });
  });

  it('un fallo al revocar no se pierde y se puede reintentar sin tocar la contraseña', async () => {
    const updatePassword = vi.fn(async () => {});
    const revoke = vi.fn<() => Promise<void>>().mockRejectedValueOnce(new Error('Sin conexión.')).mockResolvedValueOnce();
    expect(await finishPasswordRecovery(updatePassword, revoke)).toEqual({ status: 'failed', error: 'Sin conexión.' });
    expect(await revokeKeys(revoke)).toEqual({ status: 'revoked' });
    expect(updatePassword).toHaveBeenCalledTimes(1);
  });

  it('indica cuántas keys se van a revocar', () => {
    expect(revokeAllLabel(3)).toBe('Revocar todas las API keys (3)');
    expect(revokeAllLabel(null)).toBe('Revocar todas las API keys');
  });

  it('explica el resultado', () => {
    expect(revokeOutcomeText({ status: 'revoked' }, 2)).toMatch(/revocado y ya no funcionan/);
    expect(revokeOutcomeText({ status: 'failed', error: 'Sin conexión.' }, 2)).toBe('No se han podido revocar las API keys y siguen activas. Sin conexión.');
    expect(revokeOutcomeText({ status: 'kept' }, 2)).toBe('Tus 2 API keys siguen activas. Puedes revocarlas en Ajustes.');
    expect(revokeOutcomeText({ status: 'kept' }, 1)).toBe('Tu API key sigue activa. Puedes revocarla en Ajustes.');
    expect(revokeOutcomeText({ status: 'kept' }, null)).toBe('Tus API keys siguen activas. Puedes revocarlas en Ajustes.');
    expect(revokeOutcomeText({ status: 'kept' }, 0)).toBe('');
  });
});

describe('key de subida del reloj', () => {
  it('se crea si no hay ninguna o es de otra cuenta', () => {
    expect(needsWatchKey('', 'ana', null)).toBe(true);
    expect(needsWatchKey('bea', 'ana', null)).toBe(true);
  });
  it('se renueva si la guardada ya no existe en el servidor', () => {
    expect(needsWatchKey('ana', 'ana', false)).toBe(true);
  });
  it('se mantiene si sigue existiendo o no se ha podido comprobar', () => {
    expect(needsWatchKey('ana', 'ana', true)).toBe(false);
    expect(needsWatchKey('ana', 'ana', null)).toBe(false);
  });
});
