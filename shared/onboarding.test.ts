import { describe, expect, it } from 'vitest';
import { shouldShowOnboarding } from './onboarding';

describe('shouldShowOnboarding', () => {
  it('primera visita sin datos: sí', () => expect(shouldShowOnboarding({ onboarded: false, seenVersion: undefined, hasData: false })).toBe(true));
  it('ya visto: no', () => expect(shouldShowOnboarding({ onboarded: true, seenVersion: undefined, hasData: false })).toBe(false));
  it('actualización (versión ya vista): no', () => expect(shouldShowOnboarding({ onboarded: false, seenVersion: '1.3.0', hasData: false })).toBe(false));
  it('datos previos: no', () => expect(shouldShowOnboarding({ onboarded: false, seenVersion: undefined, hasData: true })).toBe(false));
});
