import { describe, expect, it } from 'vitest';
import { buildHealthExport, healthConnectMessage, healthConnectPhase, parseHealthConnectStatus, type HealthConnectStatus } from './health-connect';
import { finishWorkout } from './session';
import type { Workout } from './types';

const start = '2026-11-10T10:00:00.000Z';
const end = '2026-11-10T11:00:00.000Z';
const startMs = Date.parse(start);
const done: Workout = {
  id: 'abc123',
  name: 'Pierna',
  startedAt: start,
  endedAt: end,
  exercises: [{ exerciseId: 'sentadilla', sets: [{ weight: 100, reps: 5, type: 'normal', done: true }] }],
};
const status = (p: Partial<HealthConnectStatus> = {}): HealthConnectStatus => ({ availability: 'available', enabled: true, exercise: true, heartRate: true, ...p });

describe('buildHealthExport', () => {
  it('usa el inicio y el fin reales de la sesión y no añade pulso si no hay muestras', () => {
    expect(buildHealthExport(done)).toEqual({ v: 1, id: 'abc123', title: 'Pierna', startMs, endMs: Date.parse(end), hr: [] });
  });

  it('convierte las muestras reales a instantes absolutos', () => {
    const w = { ...done, heartRate: { avg: 120, min: 100, max: 140, samples: [[5, 100], [65, 140]] as [number, number][] } };
    expect(buildHealthExport(w)?.hr).toEqual([
      [startMs + 5000, 100],
      [startMs + 65000, 140],
    ]);
  });

  it('no inventa muestras a partir del resumen de pulso', () => {
    expect(buildHealthExport({ ...done, heartRate: { avg: 120, min: 100, max: 140 } })?.hr).toEqual([]);
  });

  it('descarta muestras fuera de la sesión o fuera de rango', () => {
    const samples: [number, number][] = [[-5, 100], [3600, 100], [3700, 100], [10, 0], [20, 301], [30, 120]];
    expect(buildHealthExport({ ...done, heartRate: { avg: 120, min: 100, max: 140, samples } })?.hr).toEqual([[startMs + 30000, 120]]);
  });

  it('no exporta sesiones sin terminar, sin duración o sin series hechas', () => {
    expect(buildHealthExport({ ...done, endedAt: undefined })).toBeNull();
    expect(buildHealthExport({ ...done, endedAt: start })).toBeNull();
    expect(buildHealthExport({ ...done, endedAt: '2026-11-10T09:00:00.000Z' })).toBeNull();
    expect(buildHealthExport({ ...done, startedAt: 'no-es-fecha' })).toBeNull();
    expect(buildHealthExport({ ...done, exercises: [{ exerciseId: 'sentadilla', sets: [{ weight: 100, reps: 5, type: 'normal', done: false }] }] })).toBeNull();
  });

  it('una sesión descartada por finishWorkout no llega a exportarse', () => {
    const pending = { ...done, endedAt: undefined, exercises: [{ exerciseId: 'sentadilla', sets: [{ weight: 100, reps: 5, type: 'normal' as const, done: false }] }] };
    expect(finishWorkout(pending)).toBeNull();
  });

  it('la misma sesión produce siempre el mismo identificador', () => {
    expect(buildHealthExport(done)?.id).toBe(buildHealthExport({ ...done })?.id);
  });
});

describe('estado de Health Connect', () => {
  it('interpreta el estado del puente nativo', () => {
    expect(parseHealthConnectStatus(status({ heartRate: false }))).toEqual(status({ heartRate: false }));
  });

  it('rechaza estados mal formados y trata lo no booleano como falso', () => {
    expect(parseHealthConnectStatus(null)).toBeNull();
    expect(parseHealthConnectStatus('x')).toBeNull();
    expect(parseHealthConnectStatus({ availability: 'otra' })).toBeNull();
    expect(parseHealthConnectStatus({ availability: 'available', enabled: 'true' })).toEqual(status({ enabled: false, exercise: false, heartRate: false }));
  });

  it('calcula la fase', () => {
    expect(healthConnectPhase(status({ availability: 'unavailable' }))).toBe('unavailable');
    expect(healthConnectPhase(status({ availability: 'update_required' }))).toBe('update_required');
    expect(healthConnectPhase(status({ enabled: false }))).toBe('off');
    expect(healthConnectPhase(status())).toBe('active');
    expect(healthConnectPhase(status({ exercise: false }))).toBe('revoked');
  });

  it('explica cada situación sin dar a entender que se pierde el entrenamiento', () => {
    expect(healthConnectMessage(status({ availability: 'unavailable' }), false)).toMatch(/siguen guardando/);
    expect(healthConnectMessage(status({ availability: 'update_required' }), false)).toMatch(/instalar o actualizar/);
    expect(healthConnectMessage(status({ exercise: false }), false)).toMatch(/retirado el permiso/);
    expect(healthConnectMessage(status({ enabled: false }), true)).toMatch(/No se ha concedido/);
    expect(healthConnectMessage(status({ enabled: false }), false)).toMatch(/nunca lee/);
    expect(healthConnectMessage(status({ heartRate: false }), false)).toMatch(/sin pulso/);
    expect(healthConnectMessage(status(), false)).toMatch(/con su pulso/);
  });
});
