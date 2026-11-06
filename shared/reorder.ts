// Posición de destino al arrastrar un elemento en una lista de filas de igual alto.
// `center` es la altura del dedo, `firstCenter` el centro de la primera fila y `step` la distancia entre filas.
export function dropIndex(center: number, firstCenter: number, step: number, count: number): number {
  if (count <= 0) return 0;
  if (!(step > 0)) return 0;
  return Math.max(0, Math.min(count - 1, Math.round((center - firstCenter) / step)));
}

/** Desplazamiento de la fila `i` mientras se arrastra `from` hacia `to` (en filas: -1, 0 o 1). */
export function dragShift(i: number, from: number, to: number): number {
  if (i === from) return 0;
  if (from < i && i <= to) return -1;
  if (to <= i && i < from) return 1;
  return 0;
}
