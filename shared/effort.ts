export type EffortScale = 'rpe' | 'rir';

export const EFFORT_OPTIONS: Record<EffortScale, number[]> = {
  rpe: [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10],
  rir: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4],
};

/** La escala solo afecta a la entrada y presentación; las series conservan RPE. */
export function effortToRpe(value: number | undefined, scale: EffortScale): number | undefined {
  if (value === undefined || !EFFORT_OPTIONS[scale].includes(value)) return undefined;
  return scale === 'rir' ? 10 - value : value;
}

export function effortFromRpe(rpe: number | undefined, scale: EffortScale): number | undefined {
  if (rpe === undefined || !EFFORT_OPTIONS.rpe.includes(rpe)) return undefined;
  return scale === 'rir' ? 10 - rpe : rpe;
}
