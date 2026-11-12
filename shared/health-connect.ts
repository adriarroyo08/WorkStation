// Exportación optativa a Health Connect (solo app Android). Contrato con la parte nativa en docs/health-connect.md.
import type { Workout } from './types';

/** Lo que la web entrega a Android al terminar una sesión. `hr`: [instante en ms, ppm]; vacío si no hay muestras reales. */
export interface HealthExport {
  v: 1;
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  hr: [number, number][];
}

export type HealthConnectAvailability = 'available' | 'update_required' | 'unavailable';

export interface HealthConnectStatus {
  availability: HealthConnectAvailability;
  /** El usuario activó la exportación en este móvil. */
  enabled: boolean;
  /** Permisos de escritura concedidos ahora mismo en Health Connect. */
  exercise: boolean;
  heartRate: boolean;
}

/** Sesión terminada → datos a exportar. null si no es exportable: sin fin real, sin duración o sin series hechas. */
export function buildHealthExport(w: Workout): HealthExport | null {
  if (!w.endedAt || !w.exercises.some((e) => e.sets.some((s) => s.done))) return null;
  const startMs = Date.parse(w.startedAt);
  const endMs = Date.parse(w.endedAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  const hr = (w.heartRate?.samples ?? [])
    .map(([sec, bpm]): [number, number] => [startMs + sec * 1000, bpm])
    // Health Connect exige muestras dentro del registro y entre 1 y 300 ppm.
    .filter(([t, bpm]) => t >= startMs && t < endMs && bpm >= 1 && bpm <= 300);
  return { v: 1, id: w.id, title: w.name, startMs, endMs, hr };
}

const AVAILABILITIES: readonly string[] = ['available', 'update_required', 'unavailable'];

export function parseHealthConnectStatus(raw: unknown): HealthConnectStatus | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.availability !== 'string' || !AVAILABILITIES.includes(s.availability)) return null;
  return {
    availability: s.availability as HealthConnectAvailability,
    enabled: s.enabled === true,
    exercise: s.exercise === true,
    heartRate: s.heartRate === true,
  };
}

export type HealthConnectPhase = 'unavailable' | 'update_required' | 'off' | 'active' | 'revoked';

export function healthConnectPhase(s: HealthConnectStatus): HealthConnectPhase {
  if (s.availability !== 'available') return s.availability;
  if (!s.enabled) return 'off';
  return s.exercise ? 'active' : 'revoked';
}

/** Texto de estado para Ajustes. */
export function healthConnectMessage(s: HealthConnectStatus, denied: boolean): string {
  switch (healthConnectPhase(s)) {
    case 'unavailable':
      return 'Health Connect no está disponible en este dispositivo. Tus entrenamientos se siguen guardando en la app.';
    case 'update_required':
      return 'Para exportar necesitas instalar o actualizar Health Connect. Tus entrenamientos se siguen guardando en la app.';
    case 'revoked':
      return 'Has retirado el permiso en Health Connect, así que no se exporta nada. Tus entrenamientos se siguen guardando en la app.';
    case 'active':
      return s.heartRate
        ? 'Se exportan los entrenamientos que termines en este móvil, con su pulso si lo has registrado.'
        : 'Se exportan los entrenamientos que termines en este móvil, sin pulso porque ese permiso no está concedido.';
    default:
      return denied
        ? 'No se ha concedido el permiso, así que no se exporta nada. Puedes concederlo desde Health Connect.'
        : 'Envía a Health Connect el inicio y el fin de cada entrenamiento que termines en este móvil y, si das el permiso, su pulso. La app nunca lee datos de Health Connect.';
  }
}
