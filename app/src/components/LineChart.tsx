// Gráfico de línea SVG mínimo, sin dependencias.
export default function LineChart({ points }: { points: { x: number; y: number }[] }) {
  if (points.length < 2) return <p className="muted small">Necesitas al menos 2 sesiones para ver la gráfica.</p>;
  const W = 340, H = 160, P = 28;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const sx = (x: number) => P + ((x - x0) / (x1 - x0 || 1)) * (W - 2 * P);
  const sy = (y: number) => H - P - ((y - y0) / (y1 - y0 || 1)) * (H - 2 * P);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const date = (t: number) => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Progresión">
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} className="axis" />
      <text x={P} y={P - 10} className="lbl">{y1}</text>
      <text x={P} y={H - P + 14} className="lbl">{date(x0)}</text>
      <text x={W - P} y={H - P + 14} className="lbl" textAnchor="end">{date(x1)}</text>
      <text x={P} y={H - P - 4} className="lbl">{y0}</text>
      <path d={d} className="line" />
      {points.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3} className="dot">
          <title>{`${date(p.x)}: ${p.y}`}</title>
        </circle>
      ))}
    </svg>
  );
}
