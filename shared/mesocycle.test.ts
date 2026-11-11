import { afterEach, describe, expect, it } from 'vitest';
import { emptyData, normalizeData } from './data';
import {
  MESO_TEMPLATES,
  liftPlan,
  mesocycleError,
  mesocycleFromTemplate,
  mesoProgress,
  prescribedWeight,
  programOneRm,
  workoutForRoutine,
  type Mesocycle,
} from './mesocycle';
import type { Routine, Workout, WorkstationData } from './types';
import { setWeightUnit } from './units';

const START = '2026-11-01T00:00:00.000Z';

const routine = (id: string, folderId = 'f'): Routine => ({
  id,
  name: id,
  folderId,
  exercises: [
    {
      exerciseId: 'press-banca',
      restSec: 120,
      sets: [
        { type: 'warmup', weight: 40, reps: 10 },
        { type: 'normal', weight: 60, reps: 8 },
        { type: 'normal', weight: 60, reps: 8 },
      ],
    },
    { exerciseId: 'curl-mancuernas', restSec: 60, sets: [1, 2, 3, 4].map(() => ({ type: 'normal' as const, weight: 12, reps: 12 })) },
  ],
});

const done = (id: string, at: string, routineId: string, weight = 80, reps = 5): Workout => ({
  id,
  name: routineId,
  routineId,
  startedAt: at,
  endedAt: at,
  exercises: [{ exerciseId: 'press-banca', sets: [{ type: 'normal', weight, reps, done: true }] }],
});

function program(meso?: Partial<Mesocycle>): WorkstationData {
  const d = emptyData();
  d.routines.push(routine('a'), routine('b'));
  const m = mesocycleFromTemplate('fuerza-4', d.routines, d.exercises, START);
  d.folders.push({ id: 'f', name: 'Bloque', mesocycle: { ...m, ...meso } });
  return d;
}

afterEach(() => setWeightUnit('kg'));

describe('plantillas', () => {
  it('todas son válidas y acaban en descarga con la mitad de series', () => {
    for (const t of MESO_TEMPLATES) {
      expect(mesocycleError({ startedAt: START, weeks: t.weeks, lifts: ['x'] })).toBeUndefined();
      const last = t.weeks[t.weeks.length - 1];
      expect(last.phase).toBe('descarga');
      expect(last.accessorySets).toBe(0.5);
    }
  });
  it('marca como principal el primer ejercicio con peso de cada rutina', () => {
    const d = program();
    expect(d.folders[0].mesocycle!.lifts).toEqual(['press-banca']);
  });
  it('rechaza programas fuera de rango o sin principales', () => {
    const weeks = MESO_TEMPLATES[0].weeks;
    expect(mesocycleError({ startedAt: START, weeks: weeks.slice(0, 3), lifts: ['x'] })).toMatch(/4 a 12/);
    expect(mesocycleError({ startedAt: START, weeks, lifts: [] })).toMatch(/principal/);
    expect(mesocycleError({ startedAt: START, weeks: weeks.map((w) => ({ ...w, main: { sets: 3, reps: 5, pct: 120 } })), lifts: ['x'] })).toMatch(/% de 1RM/);
  });
});

describe('progreso', () => {
  it('avanza una semana por cada vuelta a las rutinas de la carpeta', () => {
    const d = program();
    const f = d.folders[0] as Parameters<typeof mesoProgress>[1];
    expect(mesoProgress(d, f)).toMatchObject({ week: 0, done: 0, total: 8, finished: false });
    d.workouts.push(done('1', '2026-11-02T10:00:00Z', 'a'), done('2', '2026-11-04T10:00:00Z', 'b'), done('3', '2026-11-06T10:00:00Z', 'a'));
    expect(mesoProgress(d, f)).toMatchObject({ week: 1, done: 3 });
  });
  it('no cuenta sesiones anteriores al inicio, de otras carpetas ni sin terminar', () => {
    const d = program();
    d.routines.push(routine('suelta', 'otra'));
    d.workouts.push(done('1', '2026-10-30T10:00:00Z', 'a'), done('2', '2026-11-02T10:00:00Z', 'suelta'), { ...done('3', '2026-11-02T10:00:00Z', 'a'), endedAt: undefined });
    expect(mesoProgress(d, d.folders[0] as Parameters<typeof mesoProgress>[1]).done).toBe(0);
  });
});

describe('peso prescrito', () => {
  it('redondea hacia abajo al incremento del ejercicio', () => {
    expect(prescribedWeight(100, 72.5, undefined, 'kg')).toBe(72.5);
    expect(prescribedWeight(103, 70, undefined, 'kg')).toBe(70); // 72,1 → 70
    expect(prescribedWeight(100, 70, { id: 'x', name: 'x', muscle: 'biceps', equipment: 'mancuernas', kind: 'weight_reps' }, 'kg')).toBe(70);
    expect(prescribedWeight(31, 70, { id: 'x', name: 'x', muscle: 'biceps', equipment: 'mancuernas', kind: 'weight_reps' }, 'kg')).toBe(20); // 21,7 → 20
  });
  it('en libras redondea a 5 lb y guarda kg', () => {
    const kg = prescribedWeight(100, 70, undefined, 'lb'); // 154,3 lb → 150 lb
    expect(Math.round(kg * 2.20462)).toBe(150);
  });
  it('usa el 1RM manual o el mejor estimado antes del inicio, y no inventa si no hay', () => {
    const d = program();
    const m = d.folders[0].mesocycle!;
    expect(programOneRm(d, m, 'press-banca')).toBeUndefined();
    d.workouts.push(done('1', '2026-10-20T10:00:00Z', 'x', 90, 5), done('2', '2026-11-03T10:00:00Z', 'x', 120, 5));
    expect(programOneRm(d, m, 'press-banca')).toEqual({ kg: 105, source: 'estimado' }); // 90 × (1 + 5/30); la sesión posterior al inicio no cuenta
    expect(programOneRm(d, { ...m, oneRm: { 'press-banca': 110 } }, 'press-banca')).toEqual({ kg: 110, source: 'manual' });
  });
  it('sin 1RM avisa en vez de dar peso', () => {
    const d = program();
    expect(liftPlan(d, d.folders[0].mesocycle!, 0, 'press-banca')).toMatchObject({ weight: undefined, missingOneRm: true });
  });
  it('aplica el ajuste propio de un ejercicio en una semana', () => {
    const d = program({ oneRm: { 'press-banca': 100 }, overrides: { 'press-banca': [{ pct: 60, reps: 10 }] } });
    expect(liftPlan(d, d.folders[0].mesocycle!, 0, 'press-banca')).toMatchObject({ weight: 60, target: { sets: 4, reps: 10, pct: 60 } });
  });
});

describe('sesión del programa', () => {
  it('rellena los principales con la semana y deja el resto como en la rutina', () => {
    const d = program({ oneRm: { 'press-banca': 100 } });
    const w = workoutForRoutine(d, d.routines[0]);
    expect(w.program).toEqual({ folderId: 'f', week: 0, phase: 'acumulacion', lifts: ['press-banca'] });
    const [bench, curl] = w.exercises;
    expect(bench.sets[0]).toMatchObject({ type: 'warmup', weight: 40 });
    expect(bench.sets.slice(1)).toEqual(Array.from({ length: 4 }, () => ({ type: 'normal', reps: 8, weight: 70, done: false })));
    expect(bench.notes).toMatch(/4×8 · 70% 1RM/);
    expect(curl.sets).toHaveLength(4);
  });
  it('en descarga reduce a la mitad las series de los accesorios', () => {
    const d = program({ oneRm: { 'press-banca': 100 } });
    for (let i = 0; i < 6; i++) d.workouts.push(done(`${i}`, `2026-11-0${i + 2}T10:00:00Z`, i % 2 ? 'b' : 'a'));
    const w = workoutForRoutine(d, d.routines[0]);
    expect(w.program?.phase).toBe('descarga');
    expect(w.exercises[0].sets.filter((s) => s.type === 'normal')).toHaveLength(2);
    expect(w.exercises[0].sets[1].weight).toBe(75);
    expect(w.exercises[1].sets).toHaveLength(2);
  });
  it('sin 1RM conserva el peso de la rutina y lo dice en la nota', () => {
    const d = program();
    const bench = workoutForRoutine(d, d.routines[0]).exercises[0];
    expect(bench.sets[1].weight).toBe(60);
    expect(bench.notes).toMatch(/sin 1RM/);
  });
  it('fuera de un programa activo, la rutina sin cambios', () => {
    const d = program();
    d.folders[0].mesocycle!.endedAt = '2026-11-05T00:00:00Z';
    const w = workoutForRoutine(d, d.routines[0]);
    expect(w.program).toBeUndefined();
    expect(w.exercises[0].sets).toHaveLength(3);
  });
  it('con el programa terminado ya no prescribe', () => {
    const d = program({ oneRm: { 'press-banca': 100 } });
    for (let i = 0; i < 8; i++) d.workouts.push(done(`${i}`, `2026-11-${String(i + 2).padStart(2, '0')}T10:00:00Z`, i % 2 ? 'b' : 'a'));
    expect(workoutForRoutine(d, d.routines[0]).program).toBeUndefined();
  });
});

describe('datos', () => {
  it('normalizeData conserva el mesociclo, descarta uno roto y carga datos antiguos igual', () => {
    const d = program();
    const back = normalizeData(JSON.parse(JSON.stringify(d)));
    expect(back.folders[0].mesocycle).toEqual(d.folders[0].mesocycle);
    const broken = normalizeData({ ...d, folders: [{ id: 'f', name: 'Bloque', mesocycle: { weeks: 'x' } }] });
    expect(broken.folders[0]).toEqual({ id: 'f', name: 'Bloque' });
    expect(normalizeData({ folders: [{ id: 'g', name: 'Viejo' }] }).folders).toEqual([{ id: 'g', name: 'Viejo' }]);
  });
});
