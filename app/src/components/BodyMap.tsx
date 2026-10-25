// Mapa corporal estilizado (frontal y trasero) coloreado por series trabajadas.
import { MUSCLE_LABELS } from '../../../shared/exercises';
import type { MuscleGroup } from '../../../shared/types';

type Shape = { m: MuscleGroup | null; d: string };

const e = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx},${cy}a${rx},${ry} 0 1,0 ${rx * 2},0a${rx},${ry} 0 1,0 ${-rx * 2},0`;
const r = (x: number, y: number, w: number, h: number, rad = 3) =>
  `M${x + rad},${y}h${w - 2 * rad}a${rad},${rad} 0 0 1 ${rad},${rad}v${h - 2 * rad}a${rad},${rad} 0 0 1 ${-rad},${rad}h${-(w - 2 * rad)}a${rad},${rad} 0 0 1 ${-rad},${-rad}v${-(h - 2 * rad)}a${rad},${rad} 0 0 1 ${rad},${-rad}z`;
const pair = (m: MuscleGroup, cx: number, dx: number, cy: number, rx: number, ry: number): Shape[] => [
  { m, d: e(cx - dx, cy, rx, ry) },
  { m, d: e(cx + dx, cy, rx, ry) },
];

function figure(cx: number, back: boolean): Shape[] {
  const base: Shape[] = [
    { m: null, d: e(cx, 16, 9, 10) }, // cabeza
    { m: back ? 'cuello' : null, d: r(cx - 4, 25, 8, 8, 2) },
  ];
  if (!back)
    return [
      ...base,
      ...pair('hombros', cx, 17, 42, 8, 6),
      ...pair('pecho', cx, 8, 52, 8, 7),
      ...pair('biceps', cx, 23, 61, 5, 9),
      ...pair('antebrazo', cx, 27, 83, 4, 10),
      { m: 'core', d: r(cx - 7, 62, 14, 28, 4) },
      { m: 'aductores', d: e(cx, 111, 3, 10) },
      ...pair('cuadriceps', cx, 8, 118, 6.5, 18),
      ...pair('gemelos', cx, 7, 160, 4.5, 12),
      ...pair('abductores', cx, 15, 100, 2.5, 6),
    ];
  return [
    ...base,
    { m: 'trapecio', d: e(cx, 38, 13, 6) },
    ...pair('hombros', cx, 17, 43, 8, 6),
    { m: 'espalda', d: r(cx - 7, 45, 14, 18, 3) },
    ...pair('dorsales', cx, 11, 63, 6, 12),
    ...pair('triceps', cx, 23, 61, 5, 9),
    ...pair('antebrazo', cx, 27, 83, 4, 10),
    { m: 'lumbar', d: r(cx - 6, 74, 12, 14, 3) },
    ...pair('gluteos', cx, 7, 99, 7.5, 8),
    ...pair('abductores', cx, 15, 102, 2.5, 6),
    ...pair('isquios', cx, 8, 124, 6.5, 16),
    ...pair('gemelos', cx, 7, 160, 5.5, 12),
  ];
}

const FRONT = figure(50, false);
const SHAPES = [...FRONT, ...figure(150, true)];

// fatigue: valores 0..1 de fatiga (1 = recién entrenado); se pinta en naranja y sin leyenda de series.
export default function BodyMap({ sets, fatigue = false }: { sets: Partial<Record<MuscleGroup, number>>; fatigue?: boolean }) {
  const max = fatigue ? 1 : Math.max(1, ...Object.values(sets).map((v) => v ?? 0));
  const top = (Object.entries(sets) as [MuscleGroup, number][]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <div className="bodymap">
      <svg viewBox="0 0 200 180" role="img" aria-label={fatigue ? 'Mapa de recuperación muscular' : 'Mapa de músculos trabajados'}>
        {SHAPES.map((s, i) => {
          const v = s.m ? (sets[s.m] ?? 0) : 0;
          const ratio = v / max;
          return (
            <path key={i} d={s.d} className={s.m ? 'bm-muscle' : 'bm-base'} style={s.m && v ? { fill: fatigue ? 'var(--warn)' : 'var(--accent)', fillOpacity: 0.25 + 0.75 * ratio } : undefined}>
              {s.m && <title>{fatigue ? `${MUSCLE_LABELS[s.m]}: ${Math.round((1 - v) * 100)}% recuperado` : `${MUSCLE_LABELS[s.m]}: ${Math.round(v * 10) / 10} series`}</title>}
            </path>
          );
        })}
        <text x="50" y="178" className="bm-lbl" textAnchor="middle">
          Frontal
        </text>
        <text x="150" y="178" className="bm-lbl" textAnchor="middle">
          Trasera
        </text>
      </svg>
      {!fatigue && top.length > 0 && <p className="muted small center-text">Más trabajado: {top.map(([m, v]) => `${MUSCLE_LABELS[m]} (${Math.round(v)})`).join(' · ')}</p>}
    </div>
  );
}

// Músculos de un ejercicio: el principal en naranja pleno y los secundarios en naranja suave.
// thumb: silueta pequeña (solo la vista, frontal o trasera, donde está el principal) para las listas.
const SECONDARY = 0.4;
export function MuscleMap({ primary, secondary = [], thumb = false }: { primary: MuscleGroup; secondary?: MuscleGroup[]; thumb?: boolean }) {
  const level = (m: MuscleGroup | null) => (m === primary ? 1 : m && secondary.includes(m) ? SECONDARY : 0);
  const drawn = SHAPES.some((s) => s.m === primary || (s.m && secondary.includes(s.m)));
  if (thumb) {
    if (!drawn) return null;
    const back = !FRONT.some((s) => s.m === primary) && SHAPES.some((s) => s.m === primary);
    return (
      <svg className="bm-thumb" viewBox={back ? '115 4 70 168' : '15 4 70 168'} aria-hidden>
        {SHAPES.map((s, i) => (
          <path key={i} d={s.d} className={s.m ? 'bm-muscle' : 'bm-base'} style={level(s.m) ? { fill: 'var(--accent)', fillOpacity: level(s.m) } : undefined} />
        ))}
      </svg>
    );
  }
  return (
    <div className="bodymap">
      {drawn && (
        <svg viewBox="0 0 200 180" role="img" aria-label="Músculos que trabaja">
          {SHAPES.map((s, i) => (
            <path key={i} d={s.d} className={s.m ? 'bm-muscle' : 'bm-base'} style={level(s.m) ? { fill: 'var(--accent)', fillOpacity: level(s.m) } : undefined} />
          ))}
          <text x="50" y="178" className="bm-lbl" textAnchor="middle">
            Frontal
          </text>
          <text x="150" y="178" className="bm-lbl" textAnchor="middle">
            Trasera
          </text>
        </svg>
      )}
      <ul className="bm-legend">
        <li>
          <span className="bm-dot" /> {MUSCLE_LABELS[primary]} <small className="muted">Principal</small>
        </li>
        {secondary.map((m) => (
          <li key={m}>
            <span className="bm-dot soft" /> {MUSCLE_LABELS[m]} <small className="muted">Secundario</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
