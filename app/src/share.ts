// Genera una imagen (PNG) con el resumen del entrenamiento para compartir.
import { bestSetText } from './summary';
import type { Workout, WorkstationData } from '../../shared/types';
import type { YearWrapped } from '../../shared/wrapped';
import { formatDuration, prEvents, workoutDurationMin, workoutSetCount, workoutVolume } from '../../shared/stats';
import { fmtMass } from '../../shared/units';

export async function workoutImage(data: WorkstationData, w: Workout): Promise<Blob> {
  const W = 1080;
  const ex = new Map(data.exercises.map((e) => [e.id, e]));
  const prs = prEvents(data).filter((e) => e.workoutId === w.id);
  const rows = w.exercises.slice(0, 10);
  const H = 520 + rows.length * 78 + (w.exercises.length > 10 ? 60 : 0) + 90;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#1a1210');
  grad.addColorStop(1, '#2a1018');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  const font = (size: number, weight = 400) => (g.font = `${weight} ${size}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`);

  g.fillStyle = '#ff5f1f';
  font(34, 700);
  g.fillText('WORKSTATION', 70, 100);
  g.fillStyle = '#ffffff';
  font(64, 800);
  g.fillText(w.name.slice(0, 26), 70, 185);
  g.fillStyle = '#b3a59c';
  font(32);
  g.fillText(new Date(w.startedAt).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), 70, 238);

  const stats: [string, string][] = [
    [formatDuration(workoutDurationMin(w) * 60), 'Duración'],
    [fmtMass(workoutVolume(w, data.exercises)), 'Volumen'],
    [String(workoutSetCount(w)), 'Series'],
    [String(prs.length), 'Récords'],
  ];
  stats.forEach(([v, l], i) => {
    const x = 70 + i * 240;
    g.fillStyle = '#ffffff';
    font(46, 800);
    g.fillText(v, x, 340);
    g.fillStyle = '#b3a59c';
    font(28);
    g.fillText(l, x, 382);
  });

  g.fillStyle = '#3a2a26';
  g.fillRect(70, 430, W - 140, 2);
  let y = 500;
  for (const we of rows) {
    const e = ex.get(we.exerciseId);
    const pr = prs.some((p) => p.exerciseId === we.exerciseId);
    g.fillStyle = '#ffffff';
    font(36, 600);
    g.fillText(`${we.sets.filter((s) => s.done).length} × ${(e?.name ?? we.exerciseId).slice(0, 32)}${pr ? '  · récord' : ''}`, 70, y);
    g.fillStyle = '#b3a59c';
    font(28);
    g.fillText(bestSetText(we, e), 70, y + 36);
    y += 78;
  }
  if (w.exercises.length > 10) {
    g.fillStyle = '#b3a59c';
    font(28);
    g.fillText(`+ ${w.exercises.length - 10} ejercicios más`, 70, y);
  }
  return new Promise((res) => c.toBlob((b) => res(b!), 'image/png'));
}

// Imagen vertical (formato historia, 1080×1920) del resumen anual.
export async function wrappedImage(y: YearWrapped): Promise<Blob> {
  const W = 1080;
  const H = 1920;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#ff5f1f');
  bg.addColorStop(0.55, '#ff2d6f');
  bg.addColorStop(1, '#2a0a1a');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const font = (size: number, weight = 400) => (g.font = `${weight} ${size}px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`);

  g.fillStyle = 'rgba(255,255,255,0.85)';
  font(40, 700);
  g.fillText('WORKSTATION', 90, 170);
  g.fillStyle = '#ffffff';
  font(150, 900);
  g.fillText(`Mi ${y.year}`, 90, 340);

  const rows: [string, string][] = [
    [String(y.workouts), 'entrenamientos'],
    [`${y.hours.toLocaleString('es-ES')} h`, 'entrenando'],
    [fmtMass(y.volumeKg), `levantadas (${y.equivalence})`],
    [String(y.prs), 'récords batidos'],
    [`${y.longestStreak} sem.`, 'de racha máxima'],
  ];
  rows.forEach(([v, l], i) => {
    const top = 520 + i * 210;
    g.fillStyle = '#ffffff';
    font(120, 900);
    g.fillText(v, 90, top);
    g.fillStyle = 'rgba(255,255,255,0.82)';
    font(40, 500);
    g.fillText(l, 90, top + 60);
  });
  if (y.topExercise) {
    g.fillStyle = '#c6f34a';
    g.beginPath();
    g.roundRect(90, 1600, W - 180, 150, 40);
    g.fill();
    g.fillStyle = '#141a05';
    font(34, 600);
    g.fillText('Mi ejercicio del año', 140, 1660);
    font(52, 800);
    g.fillText(y.topExercise.name.slice(0, 30), 140, 1722);
  }
  return new Promise((res) => c.toBlob((b) => res(b!), 'image/png'));
}
