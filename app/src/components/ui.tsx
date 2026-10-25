import { useEffect, useLayoutEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, X } from 'lucide-react';
import { fromUnit, toUnit } from '../../../shared/units';
import { mediaUrls } from '../../../shared/exercises';
import { ANIMATED } from '../../../shared/anim-index';
import { useExdbGif } from '../exdb';
import { formatDuration, PR_LABELS, type PrKind } from '../../../shared/stats';
import type { Exercise } from '../../../shared/types';

const openSheets: object[] = [];

// Hoja modal. Va en un portal a <body>: dentro de una pantalla con animación (transform) el
// position:fixed sería relativo a esa pantalla y la hoja saldría recortada.
// `full`: pantalla completa, con `header` y `footer` fijos y cuerpo con scroll propio.
export function Sheet({ title, onClose, children, full, header, footer }: { title?: string; onClose: () => void; children: ReactNode; full?: boolean; header?: ReactNode; footer?: ReactNode }) {
  // Escape (y el Atrás de Android) cierra solo la hoja de encima, no todas las abiertas.
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const me = {};
    openSheets.push(me);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && openSheets.at(-1) === me && close.current();
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('keydown', onKey);
      openSheets.splice(openSheets.indexOf(me), 1);
    };
  }, []);
  return createPortal(
    <div className={`modal ${full ? 'full' : ''}`} onClick={onClose}>
      <div className={`sheet ${full ? 'full' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className={full ? 'sheet-top' : undefined}>
          <div className="row sheet-head">
            <b className="grow">{title}</b>
            <button className="ghost" onClick={onClose} aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>
          {header}
        </div>
        {full ? <div className="sheet-body">{children}</div> : children}
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Back({ onClick, label = 'Volver', right }: { onClick: () => void; label?: string; right?: ReactNode }) {
  useScrollTop();
  return (
    <div className="row topbar">
      <button className="ghost back" onClick={onClick}>
        <ChevronLeft size={20} /> {label}
      </button>
      <span className="grow" />
      {right}
    </div>
  );
}

// "GIF" del ejercicio: alterna las dos imágenes (inicio/fin del movimiento) del catálogo libre.
// Si el ejercicio tiene GIF de ExerciseDB y hay API key, se muestra el GIF; si no, las dos fotos del catálogo libre.
// Las miniaturas solo usan GIFs ya descargados (para no gastar la cuota de la API en listas).
export function ExerciseMedia({ exercise, media, exdbId, size = 'large' }: { exercise?: Exercise; media?: string; exdbId?: string; size?: 'thumb' | 'large' }) {
  const gif = useExdbGif(exdbId ?? exercise?.exdbId, size === 'thumb');
  const urls = mediaUrls(media ?? exercise?.media);
  const [frame, setFrame] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (urls.length < 2) return;
    const t = setInterval(() => setFrame((f) => 1 - f), size === 'thumb' ? 1200 : 900);
    return () => clearInterval(t);
  }, [urls.length, size]);
  if (gif)
    return (
      <div className={`media ${size} gif`}>
        <img src={gif} alt={exercise?.name ?? ''} />
      </div>
    );
  // Animación propia (generada a partir del catálogo libre y servida con la app).
  const own = media ?? exercise?.media;
  if (own && ANIMATED.has(own) && !failed)
    return (
      <div className={`media ${size} gif`}>
        <img src={`anim/${own}.webp`} alt={exercise?.name ?? ''} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      </div>
    );
  if (!urls.length || failed)
    return (
      <div className={`media ${size} placeholder`} aria-hidden>
        {(exercise?.name ?? '?').slice(0, 1)}
      </div>
    );
  return (
    <div className={`media ${size}`}>
      {urls.map((u, i) => (
        <img key={u} src={u} alt={i === 0 ? (exercise?.name ?? '') : ''} loading="lazy" style={{ opacity: frame === i ? 1 : 0 }} onError={() => setFailed(true)} />
      ))}
    </div>
  );
}

export function Delta({ cur, prev, unit = '' }: { cur: number; prev: number; unit?: string }) {
  if (!prev && !cur) return null;
  if (!prev) return <span className="delta up">nuevo</span>;
  const p = Math.round(((cur - prev) / prev) * 100);
  return (
    <span className={`delta ${p > 0 ? 'up' : p < 0 ? 'down' : ''}`} title={`Antes: ${Math.round(prev)}${unit}`}>
      {p > 0 ? '▲' : p < 0 ? '▼' : '='} {Math.abs(p)}%
    </span>
  );
}

export function Stat({ value, label, extra }: { value: ReactNode; label: string; extra?: ReactNode }) {
  return (
    <div className="stat">
      {/* Números con formato español (101,3 y no 101.3). */}
      <b>{typeof value === 'number' ? value.toLocaleString('es-ES', { maximumFractionDigits: 1 }) : value}</b>
      <small>{label}</small>
      {extra}
    </div>
  );
}

export function BarChart({
  bars,
  highlightLast = true,
  format = (v: number) => String(Math.round(v)),
}: {
  bars: { label: string; value: number }[];
  highlightLast?: boolean;
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  // Con muchas barras, una etiqueta sí y otra no (empezando por la última) para que quepan en móviles estrechos.
  const sparse = bars.length > 8;
  return (
    <div className="bars" role="img" aria-label="Gráfico de barras">
      {bars.map((b, i) => (
        <div key={i} className="bar-col" title={`${b.label}: ${format(b.value)}`}>
          <span className="bar-val">{b.value ? format(b.value) : ''}</span>
          <div className={`bar ${highlightLast && i === bars.length - 1 ? 'on' : ''}`} style={{ height: `${(b.value / max) * 100}%` }} />
          <span className="bar-lbl">{sparse && (bars.length - 1 - i) % 2 ? '' : b.label}</span>
        </div>
      ))}
    </div>
  );
}

export function HBars({ rows, format = (v: number) => String(v) }: { rows: { label: string; value: number; previous?: number }[]; format?: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="hbars">
      {rows.map((r) => (
        <div key={r.label} className="hbar">
          <span className="hbar-lbl">{r.label}</span>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="hbar-val">
            {format(r.value)}
            {r.previous !== undefined && <Delta cur={r.value} prev={r.previous} />}
          </span>
        </div>
      ))}
    </div>
  );
}

// Calendario mensual con los días entrenados marcados.
export function MonthCalendar({ month, trained, mondayFirst, onDay }: { month: Date; trained: Map<string, number>; mondayFirst: boolean; onDay?: (d: Date) => void }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = mondayFirst ? (first.getDay() + 6) % 7 : first.getDay();
  const names = mondayFirst ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const today = new Date().toDateString();
  return (
    <div className="calendar">
      {names.map((n, i) => (
        <span key={`h${i}`} className="cal-h">
          {n}
        </span>
      ))}
      {Array.from({ length: offset }, (_, i) => (
        <span key={`e${i}`} />
      ))}
      {Array.from({ length: days }, (_, i) => {
        const d = new Date(month.getFullYear(), month.getMonth(), i + 1);
        const n = trained.get(d.toDateString()) ?? 0;
        return (
          <button key={i} className={`cal-d ${n ? 'on' : ''} ${d.toDateString() === today ? 'today' : ''}`} onClick={() => onDay?.(d)} disabled={!n}>
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="toggle">
      <span className="grow">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

// Récords agrupados por ejercicio: "Press de banca — Peso máximo 87,5 (antes 85) · 1RM estimado 110 (antes 108)".
export function PrList({ prs }: { prs: { exerciseName: string; kind: PrKind; value: number; previous: number }[] }) {
  const groups = new Map<string, typeof prs>();
  for (const p of prs) groups.set(p.exerciseName, [...(groups.get(p.exerciseName) ?? []), p]);
  return (
    <ul className="small prlist">
      {[...groups.entries()].map(([name, items]) => (
        <li key={name}>
          <b>{name}</b>
          <div className="muted">
            {items
              .map((p) => {
                // Récords de peso en la unidad del usuario; reps, tiempo y distancia tal cual.
                const v = (n: number) =>
                  p.kind === 'duration' ? formatDuration(n) : p.kind === 'distance' ? `${n.toLocaleString('es-ES')} m` : (p.kind === 'reps' ? n : toUnit(n)).toLocaleString('es-ES');
                return `${PR_LABELS[p.kind]} ${v(p.value)} (antes ${v(p.previous)})`;
              })
              .join(' · ')}
          </div>
        </li>
      ))}
    </ul>
  );
}

// Semana en 7 casillas: las de los días entrenados en acento.
export function WeekStrip({ days, goal }: { days: boolean[]; goal: number }) {
  return (
    <div className="weekstrip">
      <div className="sec">
        Esta semana · {days.filter(Boolean).length} de {goal}
      </div>
      <div className="weekstrip-days">
        {days.map((on, i) => (
          <i key={i} className={on ? 'on' : ''} />
        ))}
      </div>
    </div>
  );
}

// Cada pantalla nueva empieza arriba (como al navegar en una app nativa).
export function useScrollTop(key?: unknown) {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [key]);
}

const fmtNum = (v?: number) => (v === undefined || Number.isNaN(v) ? '' : String(Math.round(v * 1000) / 1000).replace('.', ','));
const parseNum = (t: string) => (t === '' || t === ',' || t === '.' ? undefined : Number(t.replace(',', '.')));

/**
 * Campo numérico que conserva lo que escribes ("82," mientras tecleas 82,5) y acepta coma o punto.
 * Solo emite números válidos; si el valor cambia desde fuera (p. ej. "Aplicar sugerencia"), se actualiza.
 */
export function NumberField({
  value,
  onChange,
  decimals = true,
  ...rest
}: { value?: number; onChange: (v: number | undefined) => void; decimals?: boolean } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [text, setText] = useState(() => fmtNum(value));
  useEffect(() => {
    setText((t) => (parseNum(t) === value ? t : fmtNum(value)));
  }, [value]);
  return (
    <input
      inputMode={decimals ? 'decimal' : 'numeric'}
      {...rest}
      value={text}
      onChange={(e) => {
        const t = e.target.value.replace(/\s/g, '');
        if (!(decimals ? /^\d*([.,]\d{0,3})?$/ : /^\d*$/).test(t)) return;
        setText(t);
        onChange(parseNum(t));
      }}
    />
  );
}

/** Campo de peso en la unidad del usuario; guarda siempre kg. */
export function WeightField({ kg, onChange, ...rest }: { kg?: number; onChange: (kg: number | undefined) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return <NumberField value={kg === undefined ? undefined : toUnit(kg)} onChange={(v) => onChange(v === undefined ? undefined : fromUnit(v))} {...rest} />;
}
