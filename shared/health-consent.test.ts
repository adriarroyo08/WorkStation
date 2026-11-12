import { describe, expect, it } from 'vitest';
import { HEALTH_CONSENT_TEXT, HEALTH_CONSENT_VERSION, hasHealthConsent, healthConsentMetadata, healthConsentStep, newHealthConsent, pendingHealthConsent } from './health-consent';

const NOW = Date.parse('2026-11-09T12:00:00Z');
const accepted = newHealthConsent(new Date(NOW));
const stored = healthConsentMetadata(accepted);

describe('consentimiento de medidas corporales y pulso', () => {
  it('el texto nombra las medidas corporales y el pulso', () => {
    expect(HEALTH_CONSENT_TEXT).toMatch(/medidas corporales/);
    expect(HEALTH_CONSENT_TEXT).toMatch(/pulso/);
  });

  it('guarda fecha y versión del texto', () => {
    expect(accepted).toEqual({ version: HEALTH_CONSENT_VERSION, accepted_at: '2026-11-09T12:00:00.000Z' });
    expect(hasHealthConsent(stored)).toBe(true);
  });

  it.each([[undefined], [null], [{}], [{ health_consent: null }], [{ health_consent: { version: HEALTH_CONSENT_VERSION } }], [{ health_consent: { version: HEALTH_CONSENT_VERSION, accepted_at: 'ayer' } }]])(
    'sin una aceptación válida no consta: %j',
    (metadata) => expect(hasHealthConsent(metadata)).toBe(false),
  );

  it('aceptar un texto anterior no vale para el actual', () => {
    expect(hasHealthConsent({ health_consent: { version: '2020-01-01', accepted_at: '2020-01-01T00:00:00Z' } })).toBe(false);
  });

  it('lo marcado antes de ir a Google solo vale si es válido y reciente', () => {
    expect(pendingHealthConsent(accepted, NOW + 60_000)).toEqual(accepted);
    expect(pendingHealthConsent(accepted, NOW + 2 * 3600_000)).toBeNull();
    expect(pendingHealthConsent(accepted, NOW - 60_000)).toBeNull();
    expect(pendingHealthConsent(undefined, NOW)).toBeNull();
    expect(pendingHealthConsent({ version: 'otra', accepted_at: accepted.accepted_at }, NOW)).toBeNull();
  });

  it('sin el proyecto común no se pide nada', () => {
    expect(healthConsentStep({ sharedProject: false, metadata: {}, pending: null })).toBe('allow');
    expect(healthConsentStep({ sharedProject: false, metadata: {}, pending: accepted })).toBe('allow');
  });

  it('una cuenta con la aceptación vigente sincroniza y no la sobrescribe', () => {
    expect(healthConsentStep({ sharedProject: true, metadata: stored, pending: null })).toBe('allow');
    expect(healthConsentStep({ sharedProject: true, metadata: stored, pending: accepted })).toBe('allow');
  });

  it('al volver de Google se guarda lo marcado; si no hay nada, se pregunta', () => {
    expect(healthConsentStep({ sharedProject: true, metadata: {}, pending: accepted })).toBe('save');
    expect(healthConsentStep({ sharedProject: true, metadata: {}, pending: null })).toBe('ask');
  });
});
