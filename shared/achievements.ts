// Logros desbloqueables a partir del historial.
import { weekStreak } from './reports';
import { prEvents, workoutVolume } from './stats';
import type { Workout, WorkstationData } from './types';

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  desc: string;
  unlocked: boolean;
  progress?: [number, number];
}

const bestLift = (data: WorkstationData, ids: string[]) => {
  let best = 0;
  for (const w of data.workouts) for (const e of w.exercises) if (ids.includes(e.exerciseId)) for (const s of e.sets) if (s.done && s.type !== 'warmup' && (s.reps ?? 0) >= 1) best = Math.max(best, s.weight ?? 0);
  return best;
};

export function achievements(data: WorkstationData, now = new Date()): Achievement[] {
  const ws: Workout[] = data.workouts;
  const n = ws.length;
  const tons = ws.reduce((v, w) => v + workoutVolume(w), 0) / 1000;
  const prs = prEvents(data).length;
  const streak = weekStreak(data, data.settings?.weekStartsMonday ?? true, now);
  const hours = ws.map((w) => new Date(w.startedAt).getHours());
  const longest = Math.max(0, ...ws.map((w) => (w.endedAt ? (Date.parse(w.endedAt) - Date.parse(w.startedAt)) / 60000 : 0)));
  const bench = bestLift(data, ['press-banca']);
  const squat = bestLift(data, ['sentadilla']);
  const dead = bestLift(data, ['peso-muerto', 'peso-muerto-sumo', 'peso-muerto-hexagonal']);
  const bw = [...data.measurements].sort((a, b) => b.date.localeCompare(a.date)).find((m) => m.bodyweight)?.bodyweight;

  const count = (id: string, icon: string, title: string, target: number, value: number, desc: string): Achievement => ({ id, icon, title, desc, unlocked: value >= target, progress: [Math.min(value, target), target] });

  const list: Achievement[] = [
    count('w1', '🎉', 'Primer paso', 1, n, 'Registra tu primer entrenamiento'),
    count('w10', '🔟', 'Constante', 10, n, '10 entrenamientos'),
    count('w25', '💪', 'Hábito', 25, n, '25 entrenamientos'),
    count('w50', '🏅', 'Medio centenar', 50, n, '50 entrenamientos'),
    count('w100', '💯', 'Centurión', 100, n, '100 entrenamientos'),
    count('w250', '👑', 'Leyenda', 250, n, '250 entrenamientos'),
    count('s4', '🔥', 'Un mes sin fallar', 4, streak, '4 semanas seguidas entrenando'),
    count('s12', '🌋', 'Trimestre de hierro', 12, streak, '12 semanas seguidas'),
    count('s26', '☄️', 'Medio año imparable', 26, streak, '26 semanas seguidas'),
    count('t10', '🏋️', '10 toneladas', 10, Math.floor(tons), 'Levanta 10 t en total'),
    count('t100', '🚛', '100 toneladas', 100, Math.floor(tons), 'Levanta 100 t en total'),
    count('t1000', '🛳️', '1.000 toneladas', 1000, Math.floor(tons), 'Levanta 1.000 t en total'),
    count('pr1', '🏆', 'Primer récord', 1, prs, 'Bate tu primera marca'),
    count('pr50', '🥇', 'Coleccionista de récords', 50, prs, 'Bate 50 marcas'),
    count('b100', '🛡️', 'Club de los 100 en banca', 100, bench, 'Press de banca con 100 kg'),
    count('sq140', '🦵', 'Sentadilla de 140', 140, squat, 'Sentadilla con 140 kg'),
    count('dl180', '⚡', 'Peso muerto de 180', 180, dead, 'Peso muerto con 180 kg'),
    { id: 'early', icon: '🌅', title: 'Madrugador', desc: 'Entrena antes de las 7:00', unlocked: hours.some((h) => h < 7) },
    { id: 'night', icon: '🌙', title: 'Búho nocturno', desc: 'Entrena después de las 22:00', unlocked: hours.some((h) => h >= 22) },
    { id: 'long', icon: '⏳', title: 'Maratón de hierro', desc: 'Un entrenamiento de más de 2 horas', unlocked: longest >= 120 },
    { id: 'bwbench', icon: '⚖️', title: 'Tu peso en banca', desc: 'Press de banca con tu peso corporal', unlocked: !!bw && bench >= bw },
  ];
  return list;
}

// Logros que se desbloquean con un entrenamiento concreto (para celebrarlo al terminar).
export function newlyUnlocked(data: WorkstationData, workoutId: string, now = new Date()): Achievement[] {
  const before = new Set(achievements({ ...data, workouts: data.workouts.filter((w) => w.id !== workoutId) }, now).filter((a) => a.unlocked).map((a) => a.id));
  return achievements(data, now).filter((a) => a.unlocked && !before.has(a.id));
}
