import { describe, expect, it } from 'vitest';
import { WATCH_KEY_DAYS, WATCH_KEY_RENEW_DAYS, watchKeyDue, watchKeyExpiry } from './watch-key';

const NOW = Date.parse('2026-11-09T12:00:00.000Z');
const DAY = 86_400_000;
const inDays = (d: number) => new Date(NOW + d * DAY).toISOString();

describe('watchKeyExpiry', () => {
  it('caduca a los días fijados, nunca sin fecha', () => {
    expect(watchKeyExpiry(NOW)).toBe(inDays(WATCH_KEY_DAYS));
  });
});

describe('watchKeyDue', () => {
  it('emite si no hay key guardada o es de otra cuenta', () => {
    expect(watchKeyDue('', '', 'yo', NOW)).toBe(true);
    expect(watchKeyDue('otro', inDays(80), 'yo', NOW)).toBe(true);
  });

  it('emite si la guardada no tiene caducidad legible', () => {
    expect(watchKeyDue('yo', '', 'yo', NOW)).toBe(true);
    expect(watchKeyDue('yo', undefined, 'yo', NOW)).toBe(true);
    expect(watchKeyDue('yo', 'nunca', 'yo', NOW)).toBe(true);
  });

  it('conserva una key recién emitida y hasta el borde del margen', () => {
    expect(watchKeyDue('yo', watchKeyExpiry(NOW), 'yo', NOW)).toBe(false);
    expect(watchKeyDue('yo', inDays(WATCH_KEY_RENEW_DAYS), 'yo', NOW)).toBe(false);
  });

  it('renueva dentro del margen y también si ya caducó', () => {
    expect(watchKeyDue('yo', new Date(NOW + WATCH_KEY_RENEW_DAYS * DAY - 1).toISOString(), 'yo', NOW)).toBe(true);
    expect(watchKeyDue('yo', inDays(-5), 'yo', NOW)).toBe(true);
  });
});
