// Mapa corporal estilizado (frontal y trasero) dividido en las partes de cada músculo (pecho superior/medio/inferior,
// cabezas del deltoides, del bíceps y del tríceps…), coloreado por series trabajadas o por intensidad de un ejercicio.
import { useState } from 'react';
import { MUSCLE_LABELS } from '../../../shared/exercises';
import { exerciseActivation, intensityLabel, REGIONS, type Region } from '../../../shared/muscle-detail';
import type { Exercise, MuscleGroup } from '../../../shared/types';

type Shape = { m: MuscleGroup | null; reg?: Region; d: string; clip?: string };

const e = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx},${cy}a${rx},${ry} 0 1,0 ${rx * 2},0a${rx},${ry} 0 1,0 ${-rx * 2},0`;
const r = (x: number, y: number, w: number, h: number, rad = 3) =>
  `M${x + rad},${y}h${w - 2 * rad}a${rad},${rad} 0 0 1 ${rad},${rad}v${h - 2 * rad}a${rad},${rad} 0 0 1 ${-rad},${rad}h${-(w - 2 * rad)}a${rad},${rad} 0 0 1 ${-rad},${-rad}v${-(h - 2 * rad)}a${rad},${rad} 0 0 1 ${rad},${-rad}z`;
// Una forma a cada lado del eje; reg = parte concreta del músculo (si no, el grupo entero).
const pair = (m: MuscleGroup, cx: number, dx: number, cy: number, rx: number, ry: number, reg?: Region): Shape[] => [
  { m, reg, d: e(cx - dx, cy, rx, ry) },
  { m, reg, d: e(cx + dx, cy, rx, ry) },
];
const PEC_CLIP = (
  <defs>
    <clipPath id="bm-pec-l">
      <path d={e(42, 51.5, 8.5, 7.5)} />
    </clipPath>
    <clipPath id="bm-pec-r">
      <path d={e(58, 51.5, 8.5, 7.5)} />
    </clipPath>
  </defs>
);
const rpair = (m: MuscleGroup, cx: number, dx: number, y: number, w: number, h: number, reg?: Region, rad = 2): Shape[] => [
  { m, reg, d: r(cx - dx - w, y, w, h, rad) },
  { m, reg, d: r(cx + dx, y, w, h, rad) },
];

function figure(cx: number, back: boolean): Shape[] {
  const base: Shape[] = [
    { m: null, d: e(cx, 16, 9, 10) }, // cabeza
    { m: back ? 'cuello' : null, d: r(cx - 4, 25, 8, 8, 2) },
  ];
  if (!back)
    return [
      ...base,
      ...pair('hombros', cx, 15.5, 42, 5.5, 6, 'hombro-ant'),
      ...pair('hombros', cx, 21.5, 43, 3.2, 6, 'hombro-lat'),
      // Pectorales: tres franjas recortadas con la forma de cada pectoral (ver PEC_CLIP).
      ...(['pecho-sup', 'pecho-med', 'pecho-inf'] as const).flatMap((reg, k) =>
        (['l', 'r'] as const).map((side): Shape => ({ m: 'pecho', reg, clip: `url(#bm-pec-${side})`, d: r(side === 'l' ? cx - 17 : cx + 1, 44 + 5 * k, 16, 5, 0) })),
      ),
      ...pair('biceps', cx, 24.7, 59, 2.4, 7.5, 'biceps-larga'),
      ...pair('biceps', cx, 21.4, 59, 2.4, 7.5, 'biceps-corta'),
      ...pair('biceps', cx, 23, 68.5, 3.4, 2.4, 'braquial'),
      ...pair('antebrazo', cx, 29.5, 76, 2.4, 5, 'braquiorradial'),
      ...pair('antebrazo', cx, 26, 85, 3.6, 9.5, 'flexores'),
      { m: 'core', reg: 'abd-sup', d: r(cx - 6, 62, 12, 13, 3) },
      { m: 'core', reg: 'abd-inf', d: r(cx - 6, 76, 12, 14, 3) },
      ...rpair('core', cx, 7, 64, 4, 22, 'oblicuos'),
      ...pair('abductores', cx, 15, 100, 2.5, 6),
      { m: 'aductores', d: e(cx, 111, 3, 10) },
      ...pair('cuadriceps', cx, 8, 117, 3.2, 17, 'recto-femoral'),
      ...pair('cuadriceps', cx, 12.6, 120, 2.6, 15, 'vasto-lateral'),
      ...pair('cuadriceps', cx, 4.4, 129, 2.6, 7, 'vasto-medial'),
      ...pair('gemelos', cx, 7, 160, 4.5, 12),
    ];
  return [
    ...base,
    { m: 'trapecio', d: e(cx, 37, 13, 5) },
    { m: 'espalda', reg: 'trap-med', d: r(cx - 12, 42.5, 24, 4.5, 2) },
    ...pair('hombros', cx, 21.5, 43, 3.2, 6, 'hombro-lat'),
    ...pair('hombros', cx, 16, 42.5, 5, 5.5, 'hombro-post'),
    { m: 'espalda', reg: 'romboides', d: r(cx - 6, 48, 12, 12, 3) },
    ...pair('espalda', cx, 11.5, 51.5, 3.6, 3, 'redondo'),
    ...pair('dorsales', cx, 11, 59.5, 5, 5, 'dorsal-sup'),
    ...pair('dorsales', cx, 9.5, 69.5, 4.5, 5.5, 'dorsal-inf'),
    ...pair('triceps', cx, 21.4, 59, 2.4, 7.5, 'triceps-larga'),
    ...pair('triceps', cx, 24.7, 58, 2.4, 6.5, 'triceps-lateral'),
    ...pair('triceps', cx, 23, 68.5, 3.4, 2.4, 'triceps-medial'),
    ...pair('antebrazo', cx, 26, 83, 3.8, 10, 'extensores'),
    { m: 'lumbar', d: r(cx - 5, 62, 10, 25, 3) },
    ...pair('gluteos', cx, 10.5, 90.5, 5, 3.5, 'gluteo-medio'),
    ...pair('gluteos', cx, 7, 100, 7, 7, 'gluteo-mayor'),
    ...pair('abductores', cx, 15, 102, 2.5, 6),
    ...pair('isquios', cx, 8, 124, 6.5, 16),
    ...pair('gemelos', cx, 7, 155, 5.5, 8, 'gastrocnemio'),
    ...pair('gemelos', cx, 7, 166, 4, 5, 'soleo'),
  ];
}

const FRONT = figure(50, false);
const SHAPES = [...FRONT, ...figure(150, true)];

const Labels = () => (
  <>
    <text x="50" y="178" className="bm-lbl" textAnchor="middle">
      Frontal
    </text>
    <text x="150" y="178" className="bm-lbl" textAnchor="middle">
      Trasera
    </text>
  </>
);

// fatigue: valores 0..1 de fatiga (1 = recién entrenado); se pinta en naranja y sin leyenda de series.
export default function BodyMap({ sets, fatigue = false }: { sets: Partial<Record<MuscleGroup, number>>; fatigue?: boolean }) {
  const max = fatigue ? 1 : Math.max(1, ...Object.values(sets).map((v) => v ?? 0));
  const top = (Object.entries(sets) as [MuscleGroup, number][]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <div className="bodymap">
      <svg viewBox="0 0 200 180" role="img" aria-label={fatigue ? 'Mapa de recuperación muscular' : 'Mapa de músculos trabajados'}>
        {PEC_CLIP}
        {SHAPES.map((s, i) => {
          const v = s.m ? (sets[s.m] ?? 0) : 0;
          const ratio = v / max;
          return (
            <path key={i} d={s.d} clipPath={s.clip} className={s.m ? 'bm-muscle' : 'bm-base'} style={s.m && v ? { fill: fatigue ? 'var(--warn)' : 'var(--accent)', fillOpacity: 0.25 + 0.75 * ratio } : undefined}>
              {s.m && <title>{fatigue ? `${MUSCLE_LABELS[s.m]}: ${Math.round((1 - v) * 100)}% recuperado` : `${MUSCLE_LABELS[s.m]}: ${Math.round(v * 10) / 10} series`}</title>}
            </path>
          );
        })}
        <Labels />
      </svg>
      {!fatigue && top.length > 0 && <p className="muted small center-text">Más trabajado: {top.map(([m, v]) => `${MUSCLE_LABELS[m]} (${Math.round(v)})`).join(' · ')}</p>}
    </div>
  );
}

type ExerciseLike = Pick<Exercise, 'id' | 'muscle' | 'secondary' | 'media'>;

// Intensidad 0..1 de cada forma del mapa para un ejercicio: la de su parte si el ejercicio detalla partes de ese
// grupo y, si no, la del grupo entero.
function shapeLevels(exercise: ExerciseLike) {
  const group = new Map(exerciseActivation(exercise).map((a) => [a.group, a]));
  return (s: Shape) => {
    const g = s.m ? group.get(s.m) : undefined;
    if (!g) return 0;
    if (!g.parts.length || !s.reg) return g.pct / 100;
    return (g.parts.find((p) => p.region === s.reg)?.pct ?? 0) / 100;
  };
}

// Silueta pequeña para las listas: solo la vista (frontal o trasera) donde está el músculo principal.
export function MuscleThumb({ exercise }: { exercise: ExerciseLike }) {
  const level = shapeLevels(exercise);
  if (!SHAPES.some((s) => level(s) > 0)) return null;
  const back = !FRONT.some((s) => s.m === exercise.muscle) && SHAPES.some((s) => s.m === exercise.muscle);
  return (
    <svg className="bm-thumb" viewBox={back ? '115 4 70 168' : '15 4 70 168'} aria-hidden>
      {PEC_CLIP}
      {SHAPES.map((s, i) => {
        const v = level(s);
        return <path key={i} d={s.d} clipPath={s.clip} className={s.m ? 'bm-muscle' : 'bm-base'} style={v ? { fill: 'var(--accent)', fillOpacity: 0.2 + 0.8 * v } : undefined} />;
      })}
    </svg>
  );
}

// Ficha del ejercicio: mapa por partes y lista de grupos con su intensidad. Tocar un grupo (en la lista o en el
// mapa) lo resalta en el mapa y despliega sus partes.
export function MuscleMap({ exercise }: { exercise: ExerciseLike }) {
  const acts = exerciseActivation(exercise);
  const level = shapeLevels(exercise);
  const [focus, setFocus] = useState<MuscleGroup | null>(null);
  const toggle = (g: MuscleGroup) => setFocus((f) => (f === g ? null : g));
  return (
    <div className="bodymap">
      {SHAPES.some((s) => level(s) > 0) && (
        <svg viewBox="0 0 200 180" role="img" aria-label="Músculos que trabaja">
          {PEC_CLIP}
          {SHAPES.map((s, i) => {
            const v = level(s);
            const m = s.m;
            const dim = focus !== null && m !== focus;
            return (
              <path
                key={i}
                d={s.d}
                clipPath={s.clip}
                className={m ? (v ? 'bm-muscle on' : 'bm-muscle') : 'bm-base'}
                style={v ? { fill: 'var(--accent)', fillOpacity: dim ? 0.1 : 0.2 + 0.8 * v } : undefined}
                onClick={v && m ? () => toggle(m) : undefined}
              >
                {m && v > 0 && <title>{`${s.reg ? REGIONS[s.reg][1] : MUSCLE_LABELS[m]}: ${Math.round(v * 100)}%`}</title>}
              </path>
            );
          })}
          <Labels />
        </svg>
      )}
      <ul className="act-list">
        {acts.map((a) => {
          const open = focus === a.group;
          return (
            <li key={a.group} className={open ? 'open' : undefined}>
              <button className="act-row" aria-expanded={a.parts.length ? open : undefined} onClick={() => toggle(a.group)}>
                <span className="act-name">{a.label}</span>
                <span className="act-tag">{intensityLabel(a.pct)}</span>
                <span className="act-bar" aria-hidden>
                  <i style={{ width: `${a.pct}%` }} />
                </span>
                <span className="act-pct">{a.pct}%</span>
              </button>
              {open && a.parts.length > 0 && (
                <ul className="act-parts">
                  {a.parts.map((p) => (
                    <li key={p.region}>
                      <span className="act-name">{p.label}</span>
                      <span className="act-bar" aria-hidden>
                        <i style={{ width: `${p.pct}%` }} />
                      </span>
                      <span className="act-pct">{p.pct}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Músculos de una sesión (rutina): cada parte suma la intensidad de cada ejercicio por sus series.
// big: a todo el ancho (detalle de un entreno), con título accesible; si no, miniatura decorativa.
export function SessionMap({ items, big = false }: { items: { exercise: ExerciseLike; sets: number }[]; big?: boolean }) {
  const levels = items.map((it) => ({ level: shapeLevels(it.exercise), sets: it.sets }));
  const raw = SHAPES.map((s) => levels.reduce((sum, l) => sum + l.level(s) * l.sets, 0));
  const max = Math.max(...raw);
  if (!max) return null;
  return (
    <svg className={big ? 'bm-session big' : 'bm-session'} viewBox={big ? '0 0 200 180' : '14 4 172 168'} {...(big ? { role: 'img', 'aria-label': 'Músculos trabajados' } : { 'aria-hidden': true })}>
      {PEC_CLIP}
      {SHAPES.map((s, i) => {
        const v = raw[i] / max;
        return <path key={i} d={s.d} clipPath={s.clip} className={s.m ? 'bm-muscle' : 'bm-base'} style={v ? { fill: 'var(--accent)', fillOpacity: 0.15 + 0.85 * v } : undefined} />;
      })}
      {big && <Labels />}
    </svg>
  );
}

// Filtro de la biblioteca: tocar un músculo del cuerpo filtra por ese grupo; tocarlo otra vez lo quita.
export function MuscleFilter({ value, onPick }: { value: MuscleGroup | ''; onPick: (m: MuscleGroup | '') => void }) {
  return (
    <svg className="bm-filter" viewBox="14 4 172 168" role="group" aria-label="Filtrar tocando un músculo">
      {PEC_CLIP}
      {SHAPES.map((s, i) => {
        const m = s.m;
        return m ? (
          <path key={i} d={s.d} clipPath={s.clip} className={value === m ? 'bm-muscle on sel' : 'bm-muscle on'} onClick={() => onPick(value === m ? '' : m)}>
            <title>{MUSCLE_LABELS[m]}</title>
          </path>
        ) : (
          <path key={i} d={s.d} className="bm-base" />
        );
      })}
    </svg>
  );
}
