import type { Settings, WorkstationData } from './types';

// 104 semanas completas, cuatro sesiones por semana. Fecha fija para comparar ejecuciones.
export function performanceData(settings: Settings): WorkstationData {
  const ids = ['press-banca', 'remo-barra', 'sentadilla', 'peso-muerto', 'press-militar', 'curl-barra'];
  const start = Date.parse('2024-11-04T18:00:00Z');
  const workouts: WorkstationData['workouts'] = Array.from({ length: 416 }, (_, i) => {
    const time = start + (Math.floor(i / 4) * 7 + [0, 1, 3, 5][i % 4]) * 86400000;
    return {
      id: `perf-w-${i}`,
      name: `Fuerza ${(i % 4) + 1}`,
      routineId: `perf-r-${i % 4}`,
      startedAt: new Date(time).toISOString(),
      endedAt: new Date(time + 3600000).toISOString(),
      exercises: ids.map((exerciseId, e) => ({
        exerciseId,
        restSec: 90,
        sets: Array.from({ length: 4 }, (_, s) => ({ type: 'normal', weight: 30 + e * 10 + Math.floor(i / 16) * 2.5, reps: 8 + ((i + s) % 3), done: true })),
      })),
    };
  });
  return {
    version: 1,
    exercises: [],
    settings: { ...settings, weeklyGoal: 4 },
    folders: [{ id: 'perf-f', name: 'Fuerza' }],
    routines: workouts.slice(0, 4).map((w, i) => ({ id: `perf-r-${i}`, name: w.name, folderId: 'perf-f', exercises: w.exercises.map((e) => ({ ...e, restSec: 90 })) })),
    workouts,
    measurements: Array.from({ length: 104 }, (_, i) => ({ id: `perf-m-${i}`, date: new Date(start + i * 7 * 86400000).toISOString(), bodyweight: 80 + (i % 5) * 0.2 })),
  };
}
