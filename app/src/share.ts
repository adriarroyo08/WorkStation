// Genera una imagen (PNG) con el resumen del entrenamiento para compartir.
import { bestSetText } from './summary';
import type { Workout, WorkstationData } from '../../shared/types';
import { formatDuration, prEvents, workoutDurationMin, workoutSetCount, workoutVolume } from '../../shared/stats';

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
  grad.addColorStop(0, '#11141b');
  grad.addColorStop(1, '#1b2436');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  const font = (size: number, weight = 400) => (g.font = `${weight} ${size}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`);

  g.fillStyle = '#4f8cff';
  font(34, 700);
  g.fillText('WORKSTATION', 70, 100);
  g.fillStyle = '#ffffff';
  font(64, 800);
  g.fillText(w.name.slice(0, 26), 70, 185);
  g.fillStyle = '#8b919c';
  font(32);
  g.fillText(new Date(w.startedAt).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), 70, 238);

  const stats: [string, string][] = [
    [formatDuration(workoutDurationMin(w) * 60), 'Duración'],
    [`${workoutVolume(w).toLocaleString('es-ES')} kg`, 'Volumen'],
    [String(workoutSetCount(w)), 'Series'],
    [String(prs.length), 'Récords'],
  ];
  stats.forEach(([v, l], i) => {
    const x = 70 + i * 240;
    g.fillStyle = '#ffffff';
    font(46, 800);
    g.fillText(v, x, 340);
    g.fillStyle = '#8b919c';
    font(28);
    g.fillText(l, x, 382);
  });

  g.fillStyle = '#262a33';
  g.fillRect(70, 430, W - 140, 2);
  let y = 500;
  for (const we of rows) {
    const e = ex.get(we.exerciseId);
    const pr = prs.some((p) => p.exerciseId === we.exerciseId);
    g.fillStyle = '#ffffff';
    font(36, 600);
    g.fillText(`${we.sets.filter((s) => s.done).length} × ${(e?.name ?? we.exerciseId).slice(0, 32)}${pr ? '  🏆' : ''}`, 70, y);
    g.fillStyle = '#8b919c';
    font(28);
    g.fillText(bestSetText(we, e), 70, y + 36);
    y += 78;
  }
  if (w.exercises.length > 10) {
    g.fillStyle = '#8b919c';
    font(28);
    g.fillText(`+ ${w.exercises.length - 10} ejercicios más`, 70, y);
  }
  return new Promise((res) => c.toBlob((b) => res(b!), 'image/png'));
}
