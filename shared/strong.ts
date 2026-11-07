/**
 * CSV de Strong: separador coma o punto y coma, BOM UTF-8, CRLF/LF, comillas
 * dobles escapadas y notas multilínea. Cabeceras (sensibles a mayúsculas):
 * Date, Workout Name, Duration, Exercise Name, Set Order, Weight, Reps,
 * Distance, Seconds, Notes, Workout Notes, RPE; opcionales Weight Unit y
 * Distance Unit. Variante reciente: Workout #, Duration (sec), Weight (kg)
 * o Weight (lb), Distance (meters), Distance (km) o Distance (miles).
 * Date admite ISO con/sin zona y hora local, dd MMM yyyy (mes inglés/español),
 * dd/MM/yyyy o MM/dd/yyyy SOLO cuando no hay ambigüedad (o día=mes).
 * Duration admite segundos, HH:MM:SS, MM:SS o «1h 20m 3s».
 * Weight Unit: kg/lb; Distance Unit: m/meters/km/mi/miles.
 * Nunca se deducen unidades: las opciones explícitas solo rellenan ausencias.
 * W/D/F representan warmup/drop/failure; los números conservan el orden del CSV.
 * Las filas inválidas se omiten con diagnóstico; los índices son registros CSV,
 * no líneas físicas (una nota puede ocupar varias líneas). No se crean rutinas.
 * Los fixtures son ejemplos sintéticos anonimizados del contrato, sin datos personales.
 */
import { hevyExercise, parseCsv, parseHevyDate, upsertWorkouts } from './hevy';
import { fromUnit, type WeightUnit } from './units';
import type { SetType, Workout, WorkstationData } from './types';

export interface StrongOptions {
  weightUnit?: WeightUnit;
  distanceUnit?: 'm' | 'km' | 'mi';
}
export interface StrongPreview {
  data: WorkstationData;
  workouts: Workout[];
  sets: number;
  customExercises: number;
  skippedRows: number;
  diagnostics: string[];
  unsupportedColumns: string[];
  needsWeightUnit: boolean;
  needsDistanceUnit: boolean;
  canConfirm: boolean;
}
const COLUMNS = [
  'Workout #',
  'Date',
  'Workout Name',
  'Duration',
  'Duration (sec)',
  'Exercise Name',
  'Set Order',
  'Weight',
  'Weight (kg)',
  'Weight (lb)',
  'Weight Unit',
  'Reps',
  'Distance',
  'Distance (meters)',
  'Distance (km)',
  'Distance (miles)',
  'Distance Unit',
  'Seconds',
  'Notes',
  'Workout Notes',
  'RPE',
];
const TYPES: Record<string, SetType> = { W: 'warmup', D: 'drop', F: 'failure' };
const DISTANCES: Record<string, number> = { m: 1, meters: 1, km: 1000, mi: 1609.344, miles: 1609.344 };

function number(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const text = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(text)) throw new Error(`Número inválido: ${value}`);
  const n = Number(text);
  if (!Number.isFinite(n)) throw new Error(`Número fuera de rango: ${value}`);
  return n;
}
function duration(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const text = value.trim();
  if (/^\d+(?:[.,]\d+)?$/.test(text)) return number(text);
  const clock = text.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (clock && +clock[2] < 60 && +clock[3] < 60) return +(clock[1] ?? 0) * 3600 + +clock[2] * 60 + +clock[3];
  const units = text.match(/^(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?$/);
  if (units && units.slice(1).some(Boolean)) return +(units[1] ?? 0) * 3600 + +(units[2] ?? 0) * 60 + +(units[3] ?? 0);
  throw new Error(`Duración inválida: ${value}`);
}

/** Rechaza fechas ambiguas e imposibles antes de usar el parser común de Hevy. */
export function parseStrongDate(value: string): string {
  let text = value.trim();
  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (slash) {
    const a = +slash[1],
      b = +slash[2];
    if (a <= 12 && b <= 12 && a !== b) throw new Error(`Fecha ambigua: ${value}. Usa YYYY-MM-DD.`);
    const day = a > 12 ? a : b,
      month = a > 12 ? b : a;
    text = `${slash[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${(slash[4] ?? '00').padStart(2, '0')}:${slash[5] ?? '00'}:${slash[6] ?? '00'}`;
  }
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/);
  if (iso) {
    const [, y, m, d, h = '0', min = '0', sec = '0'] = iso;
    const days = new Date(Date.UTC(+y, +m, 0)).getUTCDate();
    if (+m < 1 || +m > 12 || +d < 1 || +d > days || +h > 23 || +min > 59 || +sec > 59) throw new Error(`Fecha inválida: ${value}`);
    // Una fecha sin hora también es local, como las exportaciones sin zona.
    const result = parseHevyDate(iso[4] ? text : `${text}T00:00:00`);
    if (result) return result;
  }
  const named = text.match(/^(\d{1,2})\s+([a-záéíóú]+)\.?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/i);
  if (named) {
    const result = parseHevyDate(text);
    if (result) {
      const date = new Date(result);
      if (date.getDate() === +named[1] && date.getFullYear() === +named[3] && +named[4] <= 23 && +named[5] <= 59 && +(named[6] ?? 0) <= 59) {
        date.setSeconds(+(named[6] ?? 0));
        return date.toISOString();
      }
    }
  }
  throw new Error(`Fecha inválida o no compatible: ${value}`);
}

/** Vista previa pura: clona los datos y jamás escribe sobre el original. */
export function previewStrongCsv(base: WorkstationData, csv: string, options: StrongOptions = {}): StrongPreview {
  const data = structuredClone(base);
  const result: StrongPreview = {
    data,
    workouts: [],
    sets: 0,
    customExercises: 0,
    skippedRows: 0,
    diagnostics: [],
    unsupportedColumns: [],
    needsWeightUnit: false,
    needsDistanceUnit: false,
    canConfirm: false,
  };
  const text = csv.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  // Las cabeceras conocidas no contienen separadores; parseCsv respeta las comillas.
  const headerLine = text.split(/\r?\n/)[0] ?? '';
  const separator = /(?:^|;)\s*"?Date"?\s*;/.test(headerLine) ? ';' : ',';
  let rows: Record<string, string>[];
  try {
    rows = parseCsv(text, separator, true);
    if (!rows.length) throw new Error('El CSV no contiene series.');
    const headers = Object.keys(rows[0]);
    const missing = ['Date', 'Workout Name', 'Exercise Name', 'Set Order'].filter((h) => !headers.includes(h));
    if (missing.length) throw new Error(`Faltan cabeceras: ${missing.join(', ')}.`);
    result.unsupportedColumns = headers.filter((h) => !COLUMNS.includes(h));
    for (const variants of [
      ['Duration', 'Duration (sec)'],
      ['Weight', 'Weight (kg)', 'Weight (lb)'],
      ['Distance', 'Distance (meters)', 'Distance (km)', 'Distance (miles)'],
    ]) {
      if (variants.filter((h) => headers.includes(h)).length > 1) throw new Error(`Columnas incompatibles entre sí: ${variants.join(', ')}.`);
    }
  } catch (e) {
    result.diagnostics.push((e as Error).message);
    return result;
  }
  const sessions = new Map<string, Workout>();
  rows.forEach((row, index) => {
    try {
      const startedAt = parseStrongDate(row.Date);
      if (!row['Workout Name']?.trim() || !row['Exercise Name']?.trim()) throw new Error('Falta nombre de entrenamiento o ejercicio.');
      const order = row['Set Order'].trim().toUpperCase();
      if (!/^(\d+|W|D|F)$/.test(order)) throw new Error(`Set Order no compatible: ${order}`);
      const weight = number(row.Weight ?? row['Weight (kg)'] ?? row['Weight (lb)']);
      const distance = number(row.Distance ?? row['Distance (meters)'] ?? row['Distance (km)'] ?? row['Distance (miles)']);
      const reps = number(row.Reps),
        seconds = number(row.Seconds),
        rpe = number(row.RPE);
      if (reps !== undefined && !Number.isInteger(reps)) throw new Error('Las repeticiones deben ser enteras.');
      if (rpe !== undefined && rpe > 10) throw new Error('RPE fuera de rango (0–10).');
      if (weight === undefined && reps === undefined && seconds === undefined && distance === undefined) throw new Error('Serie sin peso, repeticiones, tiempo ni distancia.');
      const sessionDuration = duration(row.Duration ?? row['Duration (sec)']);
      const headerWeight = row['Weight (kg)'] !== undefined ? 'kg' : row['Weight (lb)'] !== undefined ? 'lb' : undefined;
      const rowWeight = row['Weight Unit']?.trim().toLowerCase();
      if (rowWeight && rowWeight !== 'kg' && rowWeight !== 'lb') throw new Error(`Unidad de peso no compatible: ${rowWeight}`);
      if (headerWeight && rowWeight && headerWeight !== rowWeight) throw new Error('Unidades de peso contradictorias.');
      const weightUnit = headerWeight ?? (rowWeight || options.weightUnit);
      const headerDistance = row['Distance (meters)'] !== undefined ? 'm' : row['Distance (km)'] !== undefined ? 'km' : row['Distance (miles)'] !== undefined ? 'mi' : undefined;
      const rowDistance = row['Distance Unit']?.trim().toLowerCase();
      if (rowDistance && !Object.hasOwn(DISTANCES, rowDistance)) throw new Error(`Unidad de distancia no compatible: ${rowDistance}`);
      if (headerDistance && rowDistance && DISTANCES[headerDistance] !== DISTANCES[rowDistance]) throw new Error('Unidades de distancia contradictorias.');
      const distanceUnit = headerDistance ?? (rowDistance || options.distanceUnit);
      if (weight !== undefined && !weightUnit) result.needsWeightUnit = true;
      if (distance !== undefined && distance > 0 && !distanceUnit) result.needsDistanceUnit = true;
      // La fila queda pendiente de una elección, no es una fila inválida u omitida.
      if ((weight !== undefined && !weightUnit) || (distance !== undefined && distance > 0 && !distanceUnit)) return;
      const name = row['Workout Name'].trim();
      const key = JSON.stringify([startedAt, name, row['Workout #'] ?? '']);
      let workout = sessions.get(key);
      const endedAt = sessionDuration !== undefined ? new Date(Date.parse(startedAt) + sessionDuration * 1000).toISOString() : undefined;
      if (!workout) {
        workout = { id: `strong-${encodeURIComponent(key)}`, name, startedAt, endedAt, notes: row['Workout Notes'] || undefined, exercises: [] };
        sessions.set(key, workout);
      } else {
        if (workout.endedAt && endedAt && workout.endedAt !== endedAt) throw new Error('Duraciones contradictorias en la misma sesión.');
        workout.endedAt ??= endedAt;
        if (row['Workout Notes'] && !workout.notes?.split('\n').includes(row['Workout Notes'])) workout.notes = [workout.notes, row['Workout Notes']].filter(Boolean).join('\n');
      }
      const exercise = hevyExercise(data, row['Exercise Name'].trim());
      if (exercise.custom && seconds !== undefined && reps === undefined && weight === undefined) exercise.kind = distance !== undefined ? 'distance' : 'duration';
      let entry = workout.exercises.at(-1);
      if (!entry || entry.exerciseId !== exercise.id) {
        entry = { exerciseId: exercise.id, notes: row.Notes || undefined, sets: [] };
        workout.exercises.push(entry);
      } else if (row.Notes && !entry.notes?.includes(row.Notes)) entry.notes = [entry.notes, row.Notes].filter(Boolean).join('\n');
      entry.sets.push({
        type: TYPES[order] ?? 'normal',
        weight: weight !== undefined ? fromUnit(weight, weightUnit as WeightUnit) : undefined,
        reps,
        rpe,
        durationSec: seconds,
        distanceM: distance !== undefined ? distance * (distanceUnit ? DISTANCES[distanceUnit] : 1) : undefined,
        done: true,
      });
      result.sets++;
    } catch (e) {
      result.skippedRows++;
      result.diagnostics.push(`Registro ${index + 2}: ${(e as Error).message}`);
    }
  });
  if (result.needsWeightUnit) result.diagnostics.push('Elige la unidad de peso para continuar');
  if (result.needsDistanceUnit) result.diagnostics.push('Elige la unidad de distancia para continuar');
  result.workouts = [...sessions.values()];
  result.customExercises = data.exercises.length - base.exercises.length;
  result.canConfirm = result.sets > 0 && !result.needsWeightUnit && !result.needsDistanceUnit;
  if (result.canConfirm) upsertWorkouts(data, result.workouts, false);
  return result;
}
