// Diálogos propios en lugar de confirm()/prompt() del navegador (en Android salen con el aspecto del sistema
// y bloquean la app). Devuelven una promesa; los avisos informativos van como toast.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Sheet } from './components/ui';
import { toast } from './toast';

interface Pending {
  id?: number;
  kind: 'confirm' | 'prompt';
  text: string;
  title?: string;
  ok: string;
  danger?: boolean;
  initial?: string;
  placeholder?: string;
  done: (v: boolean | string | null) => void;
}

let pending: Pending | null = null;
let seq = 0;
const subs = new Set<() => void>();
const set = (p: Pending | null) => {
  // Si se pide otro con uno abierto, el anterior se da por cancelado.
  pending?.done(pending.kind === 'confirm' ? false : null);
  pending = p && { ...p, id: ++seq };
  subs.forEach((f) => f());
};

export const ask = {
  confirm(text: string, opts: { title?: string; ok?: string; danger?: boolean } = {}): Promise<boolean> {
    return new Promise((done) => set({ kind: 'confirm', text, title: opts.title, ok: opts.ok ?? 'Aceptar', danger: opts.danger, done: (v) => done(v === true) }));
  },
  prompt(text: string, initial = '', opts: { title?: string; ok?: string; placeholder?: string } = {}): Promise<string | null> {
    return new Promise((done) =>
      set({ kind: 'prompt', text, title: opts.title, ok: opts.ok ?? 'Guardar', initial, placeholder: opts.placeholder, done: (v) => done(typeof v === 'string' ? v : null) }),
    );
  },
  /** Aviso informativo que no necesita respuesta. */
  notice(text: string) {
    toast.show(text, undefined, 4500);
  },
  /** Error mostrado al usuario; se queda un poco más. */
  error(text: string) {
    toast.show(text, undefined, 7000);
  },
};

export function DialogHost() {
  const p = useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => pending,
  );
  if (!p) return null;
  return <Dialog key={p.id} p={p} />;
}

function Dialog({ p }: { p: Pending }) {
  const [value, setValue] = useState(p.initial ?? '');
  const input = useRef<HTMLInputElement>(null);
  const okBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (p.kind === 'prompt') input.current?.select();
    else okBtn.current?.focus();
  }, [p.kind]);
  const finish = (v: boolean | string | null) => {
    pending = null;
    subs.forEach((f) => f());
    p.done(v);
  };
  const cancel = () => finish(p.kind === 'confirm' ? false : null);
  return (
    <Sheet title={p.title ?? (p.kind === 'prompt' ? p.text : 'Confirmar')} onClose={cancel}>
      <form
        className="ask"
        onSubmit={(e) => {
          e.preventDefault();
          finish(p.kind === 'confirm' ? true : value);
        }}
      >
        {(p.kind === 'confirm' || p.title) && <p className="ask-text">{p.text}</p>}
        {p.kind === 'prompt' && <input ref={input} aria-label={p.text} value={value} placeholder={p.placeholder} onChange={(e) => setValue(e.target.value)} />}
        <div className="row ask-actions">
          <button type="button" className="outline grow" onClick={cancel}>
            Cancelar
          </button>
          <button ref={okBtn} type="submit" className={`${p.danger ? 'danger-solid' : 'primary'} grow`}>
            {p.ok}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
