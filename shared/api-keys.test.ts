import { describe, expect, it } from 'vitest';
import { apiKeyExpiry } from './api-keys';

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
