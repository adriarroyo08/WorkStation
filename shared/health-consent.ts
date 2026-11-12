// Consentimiento explícito para medidas corporales y pulso (art. 9.2.a del RGPD, ver PRIVACY.md).
// Solo se pide con el proyecto común de Supabase: sin cuenta o con un proyecto propio, los datos no llegan a él.
// La aceptación se guarda en los metadatos del usuario, así que vale para la cuenta en cualquier dispositivo.

/** Cambiar esta versión al modificar el texto: las cuentas que aceptaron el anterior vuelven a ver la petición. */
export const HEALTH_CONSENT_VERSION = '2026-11-09';
export const HEALTH_CONSENT_TEXT = 'Consiento que mis medidas corporales y mi pulso se guarden en la nube de Workstation para sincronizarlos entre mis dispositivos.';
export const PRIVACY_URL = 'https://github.com/adriarroyo08/WorkStation/blob/main/PRIVACY.md';

const METADATA_KEY = 'health_consent';
/** Lo marcado antes de ir a Google solo vale para esa visita: si no se vuelve pronto, se pregunta otra vez. */
const PENDING_MAX_AGE_MS = 60 * 60 * 1000;

export interface HealthConsent {
  version: string;
  accepted_at: string;
}

export const newHealthConsent = (now = new Date()): HealthConsent => ({ version: HEALTH_CONSENT_VERSION, accepted_at: now.toISOString() });

export const healthConsentMetadata = (consent: HealthConsent) => ({ [METADATA_KEY]: consent });

function asConsent(value: unknown): HealthConsent | null {
  const c = value as Partial<HealthConsent> | null | undefined;
  return c?.version === HEALTH_CONSENT_VERSION && typeof c.accepted_at === 'string' && Number.isFinite(Date.parse(c.accepted_at)) ? { version: c.version, accepted_at: c.accepted_at } : null;
}

export const hasHealthConsent = (metadata: unknown): boolean => !!asConsent((metadata as Record<string, unknown> | null | undefined)?.[METADATA_KEY]);

/** La aceptación guardada antes de salir a Google, si es válida y reciente. */
export function pendingHealthConsent(stored: unknown, now = Date.now()): HealthConsent | null {
  const consent = asConsent(stored);
  if (!consent) return null;
  const age = now - Date.parse(consent.accepted_at);
  return age >= 0 && age <= PENDING_MAX_AGE_MS ? consent : null;
}

/** allow: se puede sincronizar. save: guardar en la cuenta lo marcado antes de la redirección. ask: pedir el consentimiento. */
export type HealthConsentStep = 'allow' | 'save' | 'ask';

export function healthConsentStep({ sharedProject, metadata, pending }: { sharedProject: boolean; metadata: unknown; pending: HealthConsent | null }): HealthConsentStep {
  if (!sharedProject || hasHealthConsent(metadata)) return 'allow';
  return pending ? 'save' : 'ask';
}
