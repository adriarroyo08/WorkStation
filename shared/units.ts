// Unidades de peso. Los datos SIEMPRE se guardan en kg; esto solo convierte al mostrar y al escribir.
// La unidad activa es global (la fija la app desde los ajustes); el servidor MCP y la IA trabajan en kg.
export type WeightUnit = 'kg' | 'lb';

export const LB_PER_KG = 1 / 0.45359237;
let unit: WeightUnit = 'kg';

export const setWeightUnit = (u: WeightUnit | undefined) => void (unit = u ?? 'kg');
export const weightUnit = () => unit;

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/** kg → unidad visible (lb con 1 decimal, kg con 2 como mucho). */
export const toUnit = (kg: number, u = unit) => (u === 'lb' ? round(kg * LB_PER_KG, 1) : round(kg, 2));
/** unidad visible → kg (precisión completa para que ida y vuelta no derive). */
export const fromUnit = (v: number, u = unit) => (u === 'lb' ? v / LB_PER_KG : v);

/** "82,5 kg" / "182 lb". `space=false` → "82,5kg". */
export function fmtWeight(kg: number | undefined, opts: { space?: boolean; decimals?: number; u?: WeightUnit } = {}): string {
  const u = opts.u ?? unit;
  const v = toUnit(kg ?? 0, u);
  const n = opts.decimals !== undefined ? round(v, opts.decimals) : v;
  return `${n.toLocaleString('es-ES', { maximumFractionDigits: 2 })}${opts.space === false ? '' : ' '}${u}`;
}

/** Volumen/toneladas: en kg "1,2 t", en lb "2.645 lb" (o "12,3k lb"). */
export function fmtMass(kg: number, u = unit): string {
  if (u === 'lb') {
    const lb = kg * LB_PER_KG;
    return lb >= 10_000 ? `${round(lb / 1000, 1).toLocaleString('es-ES')}k lb` : `${Math.round(lb).toLocaleString('es-ES')} lb`;
  }
  return kg >= 1000 ? `${round(kg / 1000, 1).toLocaleString('es-ES')} t` : `${Math.round(kg).toLocaleString('es-ES')} kg`;
}

// Calculadora de discos por defecto en libras (barra olímpica de 45 lb).
export const DEFAULT_BAR_LB = 45;
export const DEFAULT_PLATES_LB = [45, 35, 25, 10, 5, 2.5];
