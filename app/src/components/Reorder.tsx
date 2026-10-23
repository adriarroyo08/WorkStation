// Lista reordenable arrastrando el asa (⠿) con el dedo o el ratón; con teclado, flechas arriba/abajo sobre el asa.
import { useRef, useState, type ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import { Sheet } from './ui';

export const moveItem = <T,>(arr: T[], from: number, to: number) => {
  const a = [...arr];
  a.splice(to, 0, ...a.splice(from, 1));
  return a;
};

export function ReorderList<T>({
  items,
  keyOf,
  render,
  onMove,
}: {
  items: T[];
  keyOf: (t: T, i: number) => string;
  render: (t: T, i: number) => ReactNode;
  onMove: (from: number, to: number) => void;
}) {
  const [drag, setDrag] = useState<{ from: number; dy: number; step: number } | null>(null);
  const startY = useRef(0);
  const target = drag ? Math.max(0, Math.min(items.length - 1, drag.from + Math.round(drag.dy / drag.step))) : -1;

  const shift = (i: number) => {
    if (!drag || i === drag.from) return 0;
    if (drag.from < i && i <= target) return -drag.step;
    if (target <= i && i < drag.from) return drag.step;
    return 0;
  };

  return (
    <ol className="reorder" aria-label="Arrastra para reordenar">
      {items.map((t, i) => (
        <li
          key={keyOf(t, i)}
          className={`reorder-row ${drag?.from === i ? 'dragging' : ''}`}
          style={drag ? { transform: `translateY(${i === drag.from ? drag.dy : shift(i)}px)`, transition: i === drag.from ? 'none' : undefined } : undefined}
        >
          {render(t, i)}
          <button
            className="plain reorder-handle"
            aria-label={`Mover (posición ${i + 1} de ${items.length})`}
            onPointerDown={(e) => {
              const row = e.currentTarget.closest('li')!;
              const next = row.nextElementSibling ?? row.previousElementSibling;
              const step = next ? Math.abs(next.getBoundingClientRect().top - row.getBoundingClientRect().top) : row.offsetHeight;
              e.currentTarget.setPointerCapture(e.pointerId);
              startY.current = e.clientY;
              setDrag({ from: i, dy: 0, step });
              navigator.vibrate?.(8);
            }}
            onPointerMove={(e) => drag && setDrag({ ...drag, dy: e.clientY - startY.current })}
            onPointerUp={() => {
              if (drag && target !== drag.from) onMove(drag.from, target);
              setDrag(null);
            }}
            onPointerCancel={() => setDrag(null)}
            onKeyDown={(e) => {
              const to = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : -1;
              if (to < 0 || to >= items.length) return;
              e.preventDefault();
              onMove(i, to);
            }}
          >
            <GripVertical size={20} />
          </button>
        </li>
      ))}
    </ol>
  );
}

/** Hoja con la lista de ejercicios para reordenarlos. */
export function ReorderSheet<T>(props: {
  title?: string;
  items: T[];
  keyOf: (t: T, i: number) => string;
  render: (t: T, i: number) => ReactNode;
  onMove: (from: number, to: number) => void;
  onClose: () => void;
}) {
  const { title = 'Reordenar ejercicios', onClose, ...list } = props;
  return (
    <Sheet title={title} onClose={onClose}>
      <p className="small muted">Mantén y arrastra los puntos ⠿ de la derecha para cambiar el orden.</p>
      <ReorderList {...list} />
      <button className="primary full" onClick={onClose}>
        Listo
      </button>
    </Sheet>
  );
}
