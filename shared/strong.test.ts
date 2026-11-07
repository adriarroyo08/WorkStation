import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { emptyData } from './data';
import { parseStrongDate, previewStrongCsv } from './strong';
import { fromUnit } from './units';
const fixture = (name: string) => readFileSync(new URL(`./fixtures/strong/${name}.csv`, import.meta.url), 'utf8');
const csv = (row = '2026-10-17 18:30:00,A,Press de banca (barra),1,50,8', extra = '') => `Date,Workout Name,Exercise Name,Set Order,Weight,Reps${extra}\n${row}`;

describe('importación Strong', () => {
  it('no modifica datos ni crea ejercicios hasta confirmar; exige unidad', () => {
    const data = emptyData(),
      before = structuredClone(data);
    const result = previewStrongCsv(data, fixture('unitless'));
    expect(result.needsWeightUnit).toBe(true);
    expect(result.canConfirm).toBe(false);
    expect(result.data.workouts).toEqual([]);
    expect(result.diagnostics).toEqual(['Elige la unidad de peso para continuar']);
    expect(result.skippedRows).toBe(0);
    expect(data).toEqual(before);
  });
  it('conserva sesiones, tipos, orden, notas multilínea, decimales y duraciones', () => {
    const data = emptyData();
    const result = previewStrongCsv(data, fixture('unitless'), { weightUnit: 'kg' });
    expect(result.canConfirm).toBe(true);
    expect(result.skippedRows).toBe(0);
    expect(result.sets).toBe(5);
    expect(result.workouts).toHaveLength(2);
    const workout = result.workouts[0];
    expect(Date.parse(workout.endedAt!) - Date.parse(workout.startedAt)).toBe(3723_000);
    expect(workout.notes).toBe('Sesión de prueba');
    expect(workout.exercises[0].exerciseId).toBe('press-banca');
    expect(workout.exercises[0].sets.map((s) => s.type)).toEqual(['warmup', 'normal', 'drop']);
    expect(workout.exercises[1].sets[0].type).toBe('failure');
    expect(workout.exercises[0].sets[1]).toMatchObject({ weight: 82.5, reps: 8, rpe: 8.5, done: true });
    expect(workout.exercises[0].notes).toBe('Pausa, controlada\nDos líneas:\n"sin prisa"');
    expect(result.customExercises).toBe(2);
    expect(result.data.exercises.find((e) => e.id === 'custom-plancha-de-prueba')).toMatchObject({ custom: true, kind: 'duration' });
    expect(result.workouts[1].exercises[0].sets[0].durationSec).toBe(60);
    expect(data.workouts).toHaveLength(0);
    expect(result.data.workouts).toHaveLength(2);
    const repeated = previewStrongCsv(result.data, fixture('unitless'), { weightUnit: 'kg' });
    expect(repeated.data.workouts).toHaveLength(2);
    expect(repeated.customExercises).toBe(0);
  });
  it('admite BOM, CRLF, punto y coma, unidades en cabeceras y avisa columnas desconocidas', () => {
    const result = previewStrongCsv(emptyData(), '\uFEFF' + fixture('explicit').replaceAll('\n', '\r\n'));
    expect(result.canConfirm).toBe(true);
    expect(result.unsupportedColumns).toEqual(['Extra']);
    expect(result.skippedRows).toBe(0);
    expect(result.workouts[0].exercises[0].sets[0].weight).toBe(82.5);
    expect(result.workouts[0].exercises[0].notes).toBe('Pausa; controlada');
    expect(result.workouts[1].exercises[0].sets[0]).toMatchObject({ distanceM: 1500, durationSec: 600 });
  });
  it('convierte lb y distancia por fila; la selección no sustituye unidades explícitas', () => {
    const text = csv('2026-10-17,A,Nuevo,1,100,8,lb,1.5,miles\n2026-10-17,A,Nuevo,2,50,8,kg,1,km', ',Weight Unit,Distance,Distance Unit');
    const result = previewStrongCsv(emptyData(), text, { weightUnit: 'kg', distanceUnit: 'm' });
    const sets = result.workouts[0].exercises[0].sets;
    expect(result.canConfirm).toBe(true);
    expect(sets[0].weight).toBeCloseTo(fromUnit(100, 'lb'));
    expect(sets[0].distanceM).toBeCloseTo(2414.016);
    expect(sets[1]).toMatchObject({ weight: 50, distanceM: 1000 });
    expect(previewStrongCsv(emptyData(), csv().replace('Weight,', 'Weight (lb),')).workouts[0].exercises[0].sets[0].weight).toBeCloseTo(fromUnit(50, 'lb'));
  });
  it('rellena unidades vacías de forma explícita y no adivina distancias', () => {
    const text = csv('2026-10-17,A,Nuevo,1,50,8,,2,', ',Weight Unit,Distance,Distance Unit');
    const result = previewStrongCsv(emptyData(), text);
    expect(result.needsWeightUnit).toBe(true);
    expect(result.needsDistanceUnit).toBe(true);
    expect(result.canConfirm).toBe(false);
    const selected = previewStrongCsv(emptyData(), text, { weightUnit: 'lb', distanceUnit: 'mi' });
    expect(selected.canConfirm).toBe(true);
    expect(selected.workouts[0].exercises[0].sets[0]).toMatchObject({ weight: fromUnit(50, 'lb'), distanceM: 3218.688 });
  });
  it.each([
    ['2026-10-17,A,Nuevo,1,abc,8', 'Número inválido'],
    ['2026-10-17,A,Nuevo,1,-50,8', 'Número inválido'],
    ['2026-10-17,A,Nuevo,1,50,8.5', 'enteras'],
    ['2026-10-17,A,Nuevo,X,50,8', 'Set Order'],
    ['2026-10-17,A,,1,50,8', 'Falta nombre'],
    ['2026-10-17,A,Nuevo,1,,', 'Serie sin'],
    ['04/05/2026,A,Nuevo,1,50,8', 'Fecha ambigua'],
    ['2026-02-30,A,Nuevo,1,50,8', 'Fecha inválida'],
  ])('diagnostica filas inválidas sin perder las válidas: %s', (row, diagnostic) => {
    const result = previewStrongCsv(emptyData(), csv(`${row}\n2026-10-18,A,Press de banca (barra),1,50,8`), { weightUnit: 'kg' });
    expect(result.canConfirm).toBe(true);
    expect(result.skippedRows).toBe(1);
    expect(result.sets).toBe(1);
    expect(result.diagnostics[0]).toContain(diagnostic);
    expect(result.customExercises).toBe(0);
  });
  it.each([
    [',RPE', ',11', 'RPE fuera'],
    [',Weight Unit', ',stones', 'Unidad de peso'],
    [',Distance,Distance Unit', ',2,yards', 'Unidad de distancia'],
    [',Duration', ',desconocida', 'Duración inválida'],
  ])('diagnostica valores no compatibles: %s', (header, value, diagnostic) => {
    const result = previewStrongCsv(emptyData(), csv(`2026-10-17,A,Nuevo,1,50,8${value}`, header), { weightUnit: 'kg' });
    expect(result.canConfirm).toBe(false);
    expect(result.skippedRows).toBe(1);
    expect(result.diagnostics[0]).toContain(diagnostic);
  });
  it.each(['', 'Date,Other\nx,y', csv() + ',extra', csv().replace(',50,', ',"50,'), csv(undefined, ',Weight')])('rechaza estructuras inválidas sin escribir', (text) => {
    const result = previewStrongCsv(emptyData(), text, { weightUnit: 'kg' });
    expect(result.canConfirm).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.data.workouts).toHaveLength(0);
  });
  it('mantiene separadas sesiones con Workout # distinto y ejercicios repetidos no consecutivos', () => {
    const result = previewStrongCsv(
      emptyData(),
      csv(
        '2026-10-17,A,Press de banca (barra),1,50,8,1\n2026-10-17,A,Remo con barra,1,50,8,1\n2026-10-17,A,Press de banca (barra),2,50,8,1\n2026-10-17,A,Press de banca (barra),1,50,8,2',
        ',Workout #',
      ),
      { weightUnit: 'kg' },
    );
    expect(result.workouts).toHaveLength(2);
    expect(result.data.workouts).toHaveLength(2);
    expect(result.workouts[0].exercises).toHaveLength(3);
  });
});

it('agrupa avisos de unidades en miles de filas pendientes sin contarlas como omitidas', () => {
  const header = 'Date,Workout Name,Exercise Name,Set Order,Weight,Reps,Distance';
  const rows = Array.from({ length: 3000 }, () => '2026-10-17,A,Nuevo,1,50,8,2');
  const text = [header, ...rows, '2026-10-17,A,Nuevo,1,invalido,8,2'].join('\n');
  const base = emptyData();
  const result = previewStrongCsv(base, text);
  expect(result.canConfirm).toBe(false);
  expect(result.needsWeightUnit).toBe(true);
  expect(result.needsDistanceUnit).toBe(true);
  expect(result.skippedRows).toBe(1);
  expect(result.diagnostics).toHaveLength(3);
  expect(result.diagnostics.slice(1)).toEqual(['Elige la unidad de peso para continuar', 'Elige la unidad de distancia para continuar']);
  const weightSelected = previewStrongCsv(base, text, { weightUnit: 'kg' });
  expect(weightSelected.diagnostics.slice(1)).toEqual(['Elige la unidad de distancia para continuar']);
  expect(weightSelected.skippedRows).toBe(1);
  const selected = previewStrongCsv(base, text, { weightUnit: 'kg', distanceUnit: 'km' });
  expect(selected.canConfirm).toBe(true);
  expect(selected.sets).toBe(3000);
  expect(selected.skippedRows).toBe(1);
  expect(selected.diagnostics).toHaveLength(1);
  expect(base.workouts).toHaveLength(0);
});

describe('fechas Strong sin ambigüedad', () => {
  it.each(['2026-10-17 18:30:15', '17/10/2026 18:30:15', '10/17/2026 18:30:15', '17 Oct 2026, 18:30:15'])('interpreta hora local de %s', (text) => {
    expect(parseStrongDate(text)).toBe(new Date(2026, 9, 17, 18, 30, 15).toISOString());
  });
  it('respeta la zona explícita', () => expect(parseStrongDate('2026-10-17T18:30:15+02:00')).toBe('2026-10-17T16:30:15.000Z'));
  it.each(['01/02/2026', '2026-13-01', '2026-01-00', '2026-01-01 24:00:00', '31 Feb 2026, 18:30', 'ayer', ''])('rechaza %s', (text) => expect(() => parseStrongDate(text)).toThrow());
});
