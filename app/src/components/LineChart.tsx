// Gráfico de línea SVG mínimo, sin dependencias.
export default function LineChart({ points, format = (v) => String(v), timeAxis = false }: { points: { x: number; y: number }[]; format?: (v: number) => string; timeAxis?: boolean }) {
  if (points.length < 2) return <p className="muted small chart-empty">Necesitas al menos 2 sesiones para ver la gráfica.</p>;
  const W = 340,
    H = 170,
    P = 30;
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const sx = (x: number) => P + ((x - x0) / (x1 - x0 || 1)) * (W - 2 * P);
  const sy = (y: number) => H - P - ((y - y0) / (y1 - y0 || 1)) * (H - 2 * P);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const area = `${d} L${sx(x1)},${H - P} L${sx(x0)},${H - P} Z`;
  const date = (t: number) =>
    timeAxis ? new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const last = points[points.length - 1];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Progresión">
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} className="axis" />
      <line x1={P} y1={sy(y1)} x2={W - P} y2={sy(y1)} className="grid" />
      <text x={P} y={sy(y1) - 6} className="lbl">
        {format(y1)}
      </text>
      <text x={P} y={H - P - 4} className="lbl">
        {format(y0)}
      </text>
      <text x={P} y={H - P + 14} className="lbl">
        {date(x0)}
      </text>
      <text x={W - P} y={H - P + 14} className="lbl" textAnchor="end">
        {date(x1)}
      </text>
      <path d={area} className="area" />
      <path d={d} className="line" />
      {points.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={i === points.length - 1 ? 4.5 : 3} className="dot">
          <title>{`${date(p.x)}: ${format(p.y)}`}</title>
        </circle>
      ))}
      <text x={sx(last.x)} y={sy(last.y) - 9} className="lbl strong" textAnchor="end">
        {format(last.y)}
      </text>
    </svg>
  );
}
