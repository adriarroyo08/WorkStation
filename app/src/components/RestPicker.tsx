import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, Timer } from 'lucide-react';
import { clock } from '../store';
import { Sheet } from './ui';

export const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
const label = (s: number) => (s ? clock(s) : 'Desactivado');

// Selector de descanso propio (en vez del <select> nativo de Android): chips + ajuste libre de 15 s.
export default function RestPicker({ value, onChange, prefix = 'Descanso' }: { value: number; onChange: (s: number) => void; prefix?: string }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(value);
  const sel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) sel.current?.focus();
  }, [open]);
  const pick = (s: number) => (onChange(s), setOpen(false));
  return (
    <>
      <button className="ghost small rest-chip" onClick={() => (setCustom(value), setOpen(true))} aria-label={`${prefix}: ${label(value)}`}>
        <Timer size={16} className="ico" /> {prefix}: {label(value)}
      </button>
      {open && (
        <Sheet title="Tiempo de descanso" onClose={() => setOpen(false)}>
          <div className="rest-grid">
            {REST_OPTIONS.map((s) => (
              <button
                key={s}
                ref={s === value ? sel : undefined}
                className={`rest-opt ${s === value ? 'on' : ''}`}
                aria-pressed={s === value}
                aria-label={s ? `${clock(s)} de descanso` : 'Sin descanso'}
                onClick={() => pick(s)}
              >
                {label(s)}
              </button>
            ))}
          </div>
          <div className="rest-custom">
            <button className="ghost" aria-label="Menos 15 segundos" disabled={custom <= 0} onClick={() => setCustom(Math.max(0, custom - 15))}>
              <Minus size={18} />
            </button>
            <b className="grow" aria-live="polite" data-testid="rest-custom">
              {label(custom)}
            </b>
            <button className="ghost" aria-label="Más 15 segundos" onClick={() => setCustom(Math.min(3600, custom + 15))}>
              <Plus size={18} />
            </button>
            <button className="primary" onClick={() => pick(custom)}>
              Usar
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
