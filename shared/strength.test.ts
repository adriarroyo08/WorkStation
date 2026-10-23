import { describe, expect, it } from 'vitest';
import { emptyData } from './data';
import { strengthLevel, strengthLevels } from './strength';

describe('niveles de fuerza', () => {
  it('calcula nivel y lo que falta para el siguiente', () => {
    const l = strengthLevel('press-banca', 85, 80)!;
    expect(l.level).toBe(2); // Intermedio (≥ 80 kg)
    expect(l.ratio).toBe(1.06);
    expect(l.next).toEqual({ level: 'Avanzado', target: 120, missing: 35 });
    expect(strengthLevel('press-banca', 30, 80)!.level).toBe(-1);
    expect(strengthLevel('press-banca', 200, 80)!.next).toBeUndefined();
    expect(strengthLevel('press-banca', 55, 60, 'f')!.level).toBe(2);
    expect(strengthLevel('press-banca', 85, undefined)).toBeNull();
    expect(strengthLevel('curl-barra', 50, 80)).toBeNull();
  });
  it('dominadas por repeticiones, sin necesitar peso corporal', () => {
    const d = emptyData();
    d.workouts.push({ id: 'w', name: 'x', startedAt: '2026-10-01T10:00:00Z', exercises: [{ exerciseId: 'dominadas', sets: [{ type: 'normal', reps: 12, done: true }] }] });
    const [l] = strengthLevels(d);
    expect(l).toMatchObject({ exerciseId: 'dominadas', unit: 'reps', level: 2, next: { target: 15, missing: 3 } });
  });
});
