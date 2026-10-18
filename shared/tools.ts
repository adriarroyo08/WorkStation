// Calculadoras de gimnasio: discos por lado y series de calentamiento.

export interface PlateResult {
  perSide: number[];
  achieved: number;
  remainder: number;
}

export function platesFor(target: number, barKg = 20, plates = [25, 20, 15, 10, 5, 2.5, 1.25]): PlateResult {
  let side = Math.max(0, (target - barKg) / 2);
  const perSide: number[] = [];
  for (const p of [...plates].sort((a, b) => b - a)) {
    while (side + 1e-9 >= p) {
      perSide.push(p);
      side -= p;
    }
  }
  const achieved = barKg + perSide.reduce((a, b) => a + b, 0) * 2;
  return { perSide, achieved: Math.round(achieved * 100) / 100, remainder: Math.round((target - achieved) * 100) / 100 };
}

export const roundTo = (v: number, step = 2.5) => Math.round(v / step) * step;

// Esquema clásico: barra vacía y aproximaciones al 40/60/80 %.
export function warmupSets(working: number, barKg = 20): { weight: number; reps: number }[] {
  if (working <= barKg) return [{ weight: Math.max(0, roundTo(working * 0.5)), reps: 10 }];
  const scheme: [number, number][] = [
    [0.4, 10],
    [0.6, 5],
    [0.8, 3],
  ];
  const out = [{ weight: barKg, reps: 10 }];
  for (const [p, reps] of scheme) {
    const w = roundTo(working * p);
    if (w > out[out.length - 1].weight && w < working) out.push({ weight: w, reps });
  }
  return out;
}
