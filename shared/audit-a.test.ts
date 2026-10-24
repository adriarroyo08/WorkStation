// Regresiones de la auditoría: asistidos, importación de Hevy, fusión de backups, semanas y discos.
import { describe, expect, it } from 'vitest';
import { emptyData, mergeData } from './data';
import { importHevyCsv, parseHevyDate } from './hevy';
import { period, periodReport } from './reports';
import { exerciseHistory, personalRecords, repRecords, workoutVolume } from './stats';
import { platesFor } from './tools';
import type { WorkoutSet } from './types';

const set = (weight: number, reps: number): WorkoutSet => ({ type: 'normal', weight, reps, done: true });

describe('ejercicios asistidos', () => {
  const d = emptyData();
  d.workouts.push(
    { id: 'a', name: 'x', startedAt: '2026-10-01T10:00:00', exercises: [{ exerciseId: 'dominadas-asistidas', sets: [set(40, 8)] }] },
    {
      id: 'b',
      name: 'x',
      startedAt: '2026-10-08T10:00:00',
      exercises: [
        { exerciseId: 'dominadas-asistidas', sets: [set(20, 8)] },
        { exerciseId: 'press-banca', sets: [set(60, 10)] },
      ],
    },
  );
  it('la ayuda no cuenta como peso levantado', () => {
    expect(workoutVolume(d.workouts[0])).toBe(0);
    expect(workoutVolume(d.workouts[1], d.exercises)).toBe(600);
    expect(exerciseHistory(d, 'dominadas-asistidas').map((h) => [h.bestWeight, h.best1RM, h.volume])).toEqual([
      [0, 0, 0],
      [0, 0, 0],
    ]);
    expect(repRecords(d, 'dominadas-asistidas')).toEqual([]);
    expect(personalRecords(d).find((p) => p.exerciseId === 'dominadas-asistidas')).toMatchObject({ maxReps: 8, best1RM: 0 });
  });
  it('sin 1RM del lastre en ejercicios de peso corporal', () => {
    const e = emptyData();
    e.workouts.push({ id: 'a', name: 'x', startedAt: '2026-10-01T10:00:00', exercises: [{ exerciseId: 'dominadas', sets: [set(10, 8)] }] });
    expect(exerciseHistory(e, 'dominadas')[0]).toMatchObject({ best1RM: 0, bestWeight: 10, maxReps: 8 });
  });
});

describe('importar CSV de Hevy', () => {
  const head = 'title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe\n';
  it('fechas en inglés y español, en hora local', () => {
    expect(parseHevyDate('17 Oct 2026, 18:30')).toBe(new Date(2026, 9, 17, 18, 30).toISOString());
    expect(parseHevyDate('17 ene 2026 18:30')).toBe(new Date(2026, 0, 17, 18, 30).toISOString());
    expect(parseHevyDate('3 sept 2026, 07:05')).toBe(new Date(2026, 8, 3, 7, 5).toISOString());
    expect(parseHevyDate('basura')).toBeUndefined();
  });
  it('descarta filas sin fecha válida y no duplica al reimportar', () => {
    const csv = `${head}Pierna,"17 ene 2026, 18:30",,,Sentadilla (barra),,,0,normal,100,5,,,\nTorso,"18 ene 2026, 18:30",,,Press de banca (barra),,,0,normal,80,8,,,\nRoto,ayer,,,Press de banca (barra),,,0,normal,80,8,,,\n`;
    const d = emptyData();
    importHevyCsv(d, csv);
    expect(d.workouts.map((w) => w.name).sort()).toEqual(['Pierna', 'Torso']);
    expect(new Set(d.workouts.map((w) => w.id)).size).toBe(2);
    importHevyCsv(d, csv);
    expect(d.workouts).toHaveLength(2);
  });
  it('exportaciones en libras', () => {
    const csv = 'title,start_time,exercise_title,set_type,weight_lbs,reps\nT,"17 Oct 2026, 18:30",Press de banca (barra),normal,225,5\n';
    const d = emptyData();
    importHevyCsv(d, csv);
    expect(d.workouts[0].exercises[0].sets[0].weight).toBeCloseTo(102.06, 1);
  });
});

describe('fusionar un backup', () => {
  it('no pierde la nota fija ni deshace ediciones locales', () => {
    const local = emptyData();
    local.exercises.find((e) => e.id === 'press-banca')!.stickyNote = 'asiento 4';
    local.workouts.push({ id: 'w', name: 'Editado', startedAt: '2026-10-01T10:00:00', exercises: [] });
    const file = emptyData();
    file.workouts.push({ id: 'w', name: 'Viejo', startedAt: '2026-10-01T10:00:00', exercises: [] }, { id: 'n', name: 'Nuevo', startedAt: '2026-10-02T10:00:00', exercises: [] });
    const m = mergeData(local, file);
    expect(m.exercises.find((e) => e.id === 'press-banca')!.stickyNote).toBe('asiento 4');
    expect(m.workouts.map((w) => w.name)).toEqual(['Editado', 'Nuevo']);
  });
});

describe('semanas y discos', () => {
  it('la semana anterior empieza el lunes anterior también con cambio de hora', () => {
    const p = period('week', 0, true, new Date(2026, 9, 28, 12)); // semana del lunes 26 oct (fin del horario de verano)
    const d = emptyData();
    d.workouts.push({ id: 'x', name: 'x', startedAt: new Date(2026, 9, 19, 0, 30).toISOString(), exercises: [{ exerciseId: 'press-banca', sets: [set(50, 5)] }] });
    expect(periodReport(d, p).previous.workouts).toBe(1);
  });
  it('discos no positivos no cuelgan la calculadora', () => {
    expect(platesFor(100, 20, [0, -5, 20]).perSide).toEqual([20, 20]);
  });
});
