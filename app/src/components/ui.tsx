import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { mediaUrls } from '../../../shared/exercises';
import { useExdbGif } from '../exdb';
import { PR_LABELS, type PrKind } from '../../../shared/stats';
import type { Exercise } from '../../../shared/types';

export function Sheet({ title, onClose, children }: { title?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row sheet-head">
          <b className="grow">{title}</b>
          <button className="ghost" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Back({ onClick, label = 'Volver', right }: { onClick: () => void; label?: string; right?: ReactNode }) {
  useScrollTop();
  return (
    <div className="row topbar">
      <button className="ghost" onClick={onClick}>
        ← {label}
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
      <b>{value}</b>
      <small>{label}</small>
      {extra}
    </div>
  );
}

export function BarChart({ bars, highlightLast = true, format = (v: number) => String(Math.round(v)) }: { bars: { label: string; value: number }[]; highlightLast?: boolean; format?: (v: number) => string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="bars" role="img" aria-label="Gráfico de barras">
      {bars.map((b, i) => (
        <div key={i} className="bar-col" title={`${b.label}: ${format(b.value)}`}>
          <span className="bar-val">{b.value ? format(b.value) : ''}</span>
          <div className={`bar ${highlightLast && i === bars.length - 1 ? 'on' : ''}`} style={{ height: `${(b.value / max) * 100}%` }} />
          <span className="bar-lbl">{b.label}</span>
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
            {items.map((p) => `${PR_LABELS[p.kind]} ${p.value.toLocaleString('es-ES')} (antes ${p.previous.toLocaleString('es-ES')})`).join(' · ')}
          </div>
        </li>
      ))}
    </ul>
  );
}

// Anillo de progreso con degradado (objetivo semanal, etc.).
export function ProgressRing({ value, max, size = 92, label, sub }: { value: number; max: number; size?: number; label: string; sub?: string }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label} ${sub ?? ''}`}>
      <defs>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={9} />
      <circle className="ring-val" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={9} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y={sub ? '47%' : '53%'} textAnchor="middle" dominantBaseline="middle">
        {label}
      </text>
      {sub && (
        <text className="ring-sub" x="50%" y="66%" textAnchor="middle" dominantBaseline="middle">
          {sub}
        </text>
      )}
    </svg>
  );
}

// Cada pantalla nueva empieza arriba (como al navegar en una app nativa).
export function useScrollTop(key?: unknown) {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [key]);
}
