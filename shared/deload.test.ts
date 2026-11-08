import { describe, expect, it } from 'vitest';
import { emptyData } from './data';
import { createDeloadSuggestion, deloadPendingSets, evaluateStagnation, type StagnationType } from './deload';
import type { WorkoutSet } from './types';

const now = '2026-11-08T12:00:00Z';
const sets = (weight = 50, reps = 5, rpe?: number): WorkoutSet[] => Array.from({ length: 3 }, () => ({ type: 'normal', done: true, weight, reps, rpe }));
const history = (sessions: WorkoutSet[][], days = [14, 7, 0]) => {
  const data = emptyData();
  data.workouts = sessions.map((s, i) => ({
    id: String(i),
    name: 'Entrenamiento',
    startedAt: new Date(Date.parse(now) - days[i] * 86_400_000).toISOString(),
    exercises: [{ exerciseId: 'press-militar', sets: s }],
  }));
  return data;
};
const evaluate = (sessions: WorkoutSet[][], days?: number[]) => evaluateStagnation(history(sessions, days), 'press-militar', now);

describe('detección de estancamiento', () => {
  it('aplica el umbral del 2 % inclusivo del contrato sin redondear Epley', () => {
    expect(evaluate([sets(30, 19), sets(30, 20), sets(30, 20)]).type).toBe('meseta_rendimiento');
    expect(evaluate([sets(30, 18), sets(30, 20), sets(30, 20)]).type).toBe('ninguno');
  });

  it('reconoce progresión de peso y de repeticiones', () => {
    expect(evaluate([sets(50), sets(52.5), sets(55)]).type).toBe('ninguno');
    expect(evaluate([sets(50, 5), sets(50, 6), sets(50, 7)]).type).toBe('ninguno');
  });

  it('detecta esfuerzo alto y el caso A usando la mejor serie al peso máximo', () => {
    const last = sets(50, 4, 10);
    last[0].reps = 5;
    const report = evaluate([sets(50, 5, 9.5), sets(50, 5, 10), last]);
    expect(report).toMatchObject({
      type: 'estancamiento_esfuerzo',
      confidence: 'alta',
      consecutiveSessions: 3,
      lastWeightKg: 50,
      recommendation: { strategy: 'volumen', suggestedSetsFactor: 0.5, suggestedWeightFactor: 1, targetRir: 3 },
    });
    expect(report.averageRpe).toBeCloseTo(9.833333);
  });

  it('reconoce meseta submáxima y caso B sin imponer descarga', () => {
    expect(evaluate([sets(100, 8, 7), sets(100, 8, 7), sets(100, 8, 7.5)])).toMatchObject({
      type: 'meseta_rendimiento',
      confidence: 'moderada',
      recommendation: { strategy: 'mantener', suggestedSetsFactor: 1 },
    });
  });

  it('reconoce el caso D sin inventar esfuerzo ausente', () => {
    const report = evaluate([sets(15, 8), sets(15, 8), sets(15, 8)]);
    expect(report).toMatchObject({ type: 'meseta_rendimiento', confidence: 'moderada' });
    expect(report.averageRpe).toBeUndefined();
    expect(report.recommendation?.userMessage).toContain('Si sientes fatiga');
  });

  it('reinicia después de 21 días de inactividad (caso C)', () => {
    expect(evaluate([sets(140), sets(130), sets(130)], [35, 7, 0])).toMatchObject({ type: 'historico_insuficiente', consecutiveSessions: 2, lastWeightKg: 130 });
    expect(evaluate([sets(), sets(), sets()], [42, 21, 0]).type).toBe('meseta_rendimiento');
  });

  it('incluye el límite de 45 días y excluye fechas futuras y anteriores', () => {
    expect(evaluate([sets(), sets(), sets(), sets()], [45, 30, 15, 0]).consecutiveSessions).toBe(4);
    expect(evaluate([sets(), sets(), sets()], [46, 7, 0]).type).toBe('historico_insuficiente');
    expect(evaluate([sets(), sets(), sets()], [7, 0, -1]).consecutiveSessions).toBe(2);
  });

  it('excluye calentamientos, series pendientes y sesiones truncadas', () => {
    const warmups = sets().map((s): WorkoutSet => ({ ...s, type: 'warmup' }));
    const pending = sets().map((s) => ({ ...s, done: false }));
    expect(evaluate([sets(), warmups, pending, sets().slice(0, 1), sets()], [14, 12, 10, 7, 0])).toMatchObject({ type: 'historico_insuficiente', consecutiveSessions: 2 });
    expect(evaluate([sets().slice(0, 2), sets().slice(0, 2), sets().slice(0, 2)]).type).toBe('meseta_rendimiento');
  });

  it('considera fallos y RPE 10 aunque la media sea menor de 9', () => {
    const failure = sets();
    failure[0].type = 'failure';
    const ten = sets(50, 5, 7);
    ten[0].rpe = 10;
    expect(evaluate([failure, ten, sets(50, 5, 9)]).type).toBe('estancamiento_esfuerzo');
    expect(evaluate([sets(50, 5, 9), sets(), sets(50, 5, 9)]).type).toBe('meseta_rendimiento');
  });

  it('calcula esfuerzo y rendimiento solo al peso techo, sin mezclar variantes', () => {
    const session = [...sets(50, 5, 9), ...sets(40, 30, 6)];
    const data = history([session, session, session]);
    data.workouts[1].exercises.push({ exerciseId: 'otra-variante', sets: sets(80, 10) });
    expect(evaluateStagnation(data, 'press-militar', now).type).toBe('estancamiento_esfuerzo');
    expect(evaluateStagnation(data, 'otra-variante', now).consecutiveSessions).toBe(1);
  });

  it('usa solo las tres sesiones más recientes para detectar la meseta', () => {
    expect(evaluate([sets(40), sets(), sets(), sets()], [21, 14, 7, 0]).type).toBe('meseta_rendimiento');
    expect(evaluate([sets(), sets(), sets(), sets(52.5)], [21, 14, 7, 0]).type).toBe('ninguno');
  });

  it('rechaza sesiones sin carga ni repeticiones y no modifica el historial', () => {
    expect(evaluate([sets(0), sets(0), sets(0)]).type).toBe('historico_insuficiente');
    expect(evaluate([sets(50, 0), sets(50, 0), sets(50, 0)]).type).toBe('historico_insuficiente');
    const data = history([sets(), sets(), sets()]);
    data.workouts.reverse();
    const original = JSON.stringify(data);
    expect(evaluateStagnation(data, 'press-militar', now).type).toBe('meseta_rendimiento');
    expect(JSON.stringify(data)).toBe(original);
    expect(evaluateStagnation(emptyData(), 'ausente', now)).toMatchObject({ consecutiveSessions: 0, lastWeightKg: 0, confidence: 'baja' });
  });
});

describe('sugerencia de descarga', () => {
  it.each<StagnationType>(['ninguno', 'historico_insuficiente', 'meseta_rendimiento', 'estancamiento_esfuerzo'])('preserva la carga y usa lenguaje prudente: %s', (type) => {
    const report = { exerciseId: 'press-militar', type, confidence: 'moderada' as const, consecutiveSessions: 3, lastWeightKg: 50 };
    const suggestion = createDeloadSuggestion(report);
    if (type === 'ninguno' || type === 'historico_insuficiente') {
      expect(suggestion).toBeNull();
    } else {
      expect(suggestion!.suggestedWeightFactor).toBeGreaterThanOrEqual(0.85);
      expect(suggestion!.userMessage).not.toMatch(/sobreentren|sistema nervioso|diagnóstico|obligatori/i);
      expect(suggestion!.targetRir).toBeGreaterThanOrEqual(3);
      expect(suggestion!.targetRir).toBeLessThanOrEqual(4);
      expect(createDeloadSuggestion(report, { id: 'press-militar', name: 'Press militar', kind: 'weight_reps', equipment: 'barra', muscle: 'hombros' })!.userMessage).toContain('Press militar');
    }
  });
});

it('reduces pending sets only, rounds up and preserves weights', () => {
  for (const count of [0, 1, 2, 3, 4, 5]) {
    const done: WorkoutSet = { type: 'normal', done: true, weight: 80 };
    const warmup: WorkoutSet = { type: 'warmup', done: false, weight: 40 };
    const pending: WorkoutSet[] = Array.from({ length: count }, () => ({ type: 'normal', done: false, weight: 80 }));
    const original = [done, warmup, ...pending];
    expect(deloadPendingSets(original)).toEqual([done, warmup, ...pending.slice(0, Math.ceil(count / 2))]);
    expect(original).toHaveLength(count + 2);
  }
});
