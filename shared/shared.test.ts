import { describe, expect, it } from 'vitest';
import { emptyData, normalizeData, repeatWorkout, routineFromWorkout } from './data';
import { DEFAULT_EXERCISES } from './exercises';
import { importHevyCsv, parseCsv } from './hevy';
import { period, periodReport, weekStreak } from './reports';
import { estimate1RM, prEvents, repRecords, muscleSets } from './stats';
import { instantiateProgram, PROGRAMS } from './templates';
import { platesFor, warmupSets } from './tools';
import type { Workout, WorkstationData } from './types';

const w = (id: string, date: string, exerciseId: string, sets: [number, number][]): Workout => ({
  id,
  name: id,
  startedAt: date,
  endedAt: new Date(Date.parse(date) + 3600e3).toISOString(),
  exercises: [{ exerciseId, sets: sets.map(([weight, reps]) => ({ type: 'normal', weight, reps, done: true })) }],
});

const withWorkouts = (...ws: Workout[]): WorkstationData => ({ ...emptyData(), workouts: ws });

describe('stats', () => {
  it('Epley', () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(80, 8)).toBe(101.3);
  });
  it('detecta récords sin contar la primera sesión', () => {
    const d = withWorkouts(w('a', '2026-10-01T10:00:00Z', 'press-banca', [[80, 8]]), w('b', '2026-10-05T10:00:00Z', 'press-banca', [[85, 8]]), w('c', '2026-10-08T10:00:00Z', 'press-banca', [[70, 5]]));
    const ev = prEvents(d);
    expect(ev.every((e) => e.workoutId === 'b')).toBe(true);
    expect(ev.find((e) => e.kind === 'weight')).toMatchObject({ value: 85, previous: 80 });
  });
  it('récords por número de reps', () => {
    const d = withWorkouts(w('a', '2026-10-01T10:00:00Z', 'sentadilla', [[100, 5], [110, 3]]), w('b', '2026-10-02T10:00:00Z', 'sentadilla', [[105, 5]]));
    expect(repRecords(d, 'sentadilla')).toEqual([
      { reps: 3, weight: 110, date: '2026-10-01T10:00:00Z' },
      { reps: 5, weight: 105, date: '2026-10-02T10:00:00Z' },
    ]);
  });
  it('series por músculo con secundarios a 0,5', () => {
    const d = withWorkouts(w('a', '2026-10-01T10:00:00Z', 'press-banca', [[80, 8], [80, 8]]));
    expect(muscleSets(d, d.workouts)).toMatchObject({ pecho: 2, triceps: 1, hombros: 1 });
  });
});

describe('informes', () => {
  const now = new Date('2026-10-15T12:00:00'); // jueves
  it('semana empieza en lunes', () => {
    const p = period('week', 0, true, now);
    expect(p.start.getDay()).toBe(1);
    expect(p.start.getDate()).toBe(12);
  });
  it('mes y comparación con el anterior', () => {
    const d = withWorkouts(w('sep', '2026-09-10T10:00:00Z', 'press-banca', [[80, 8]]), w('oct', '2026-10-10T10:00:00Z', 'press-banca', [[90, 8]]));
    const r = periodReport(d, period('month', 0, true, now));
    expect(r.totals.workouts).toBe(1);
    expect(r.previous.workouts).toBe(1);
    expect(r.prs.length).toBeGreaterThan(0);
    expect(r.byDay).toHaveLength(31);
  });
  it('racha semanal', () => {
    const d = withWorkouts(w('1', '2026-10-01T10:00:00', 'crunch', [[0, 10]]), w('2', '2026-10-07T10:00:00', 'crunch', [[0, 10]]));
    expect(weekStreak(d, true, now)).toBe(2);
  });
});

describe('calculadoras', () => {
  it('discos por lado', () => {
    expect(platesFor(100, 20).perSide).toEqual([25, 15]);
    expect(platesFor(61, 20)).toMatchObject({ perSide: [20], remainder: 1 });
  });
  it('calentamiento', () => {
    expect(warmupSets(100, 20)).toEqual([{ weight: 20, reps: 10 }, { weight: 40, reps: 10 }, { weight: 60, reps: 5 }, { weight: 80, reps: 3 }]);
  });
});

describe('datos', () => {
  it('migra datos antiguos y refresca la biblioteca base', () => {
    const old = { version: 1, exercises: [{ id: 'press-banca', name: 'viejo', muscle: 'pecho', equipment: 'barra', kind: 'weight_reps', stickyNote: 'agarre medio' }], routines: [], workouts: [], measurements: [] };
    const d = normalizeData(old);
    const pb = d.exercises.find((e) => e.id === 'press-banca')!;
    expect(pb.name).toBe('Press de banca (barra)');
    expect(pb.media).toBeTruthy();
    expect(pb.stickyNote).toBe('agarre medio');
    expect(d.folders).toEqual([]);
    expect(d.settings.defaultRestSec).toBe(90);
  });
  it('plantillas usan ejercicios existentes', () => {
    const ids = new Set(DEFAULT_EXERCISES.map((e) => e.id));
    for (const p of PROGRAMS) for (const r of instantiateProgram(p).routines) for (const e of r.exercises) expect(ids.has(e.exerciseId), `${p.id}: ${e.exerciseId}`).toBe(true);
  });
  it('guardar como rutina y repetir', () => {
    const src = w('a', '2026-10-01T10:00:00Z', 'press-banca', [[80, 8]]);
    expect(routineFromWorkout(src).exercises[0].sets[0]).toMatchObject({ weight: 80, reps: 8 });
    expect(repeatWorkout(src).exercises[0].sets[0].done).toBe(false);
  });
  it('CSV de Hevy', () => {
    const csv = '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"\n"Push","10 Oct 2026, 18:00","10 Oct 2026, 19:05","","Press de banca (barra)","","",0,"warmup",40,10,"","",""\n"Push","10 Oct 2026, 18:00","10 Oct 2026, 19:05","","Press de banca (barra)","","",1,"normal",80,8,"","",8';
    expect(parseCsv(csv)).toHaveLength(2);
    const d = emptyData();
    expect(importHevyCsv(d, csv)).toBe(1);
    expect(d.workouts[0].exercises[0].sets.map((s) => s.type)).toEqual(['warmup', 'normal']);
  });
});

describe('serie anterior', () => {
  it('empareja calentamientos con calentamientos', async () => {
    const { alignPrevious } = await import('./stats');
    const prev = [
      { type: 'warmup' as const, weight: 40, reps: 10, done: true },
      { type: 'normal' as const, weight: 80, reps: 8, done: true },
    ];
    const cur = [{ type: 'warmup' as const }, { type: 'warmup' as const }, { type: 'normal' as const }, { type: 'normal' as const }];
    expect(alignPrevious(cur, prev).map((s) => s?.weight)).toEqual([40, undefined, 80, undefined]);
  });
});
