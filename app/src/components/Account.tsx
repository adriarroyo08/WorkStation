// Cuenta: tarjeta de Perfil, pantalla de email (entrar / crear cuenta / recuperar) y diálogo al cambiar de cuenta.
import { Mail, RefreshCw } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { cloud, setAccountSwitchPrompt, useCloud } from '../cloud';
import { toast } from '../toast';
import { Back } from './ui';

const STATUS: Record<string, string> = {
  off: 'Sin configurar',
  'signed-out': 'Sin sesión',
  syncing: 'Sincronizando…',
  idle: 'Sincronizado',
  offline: 'Sin conexión (se subirá al volver)',
  error: 'Error de sincronización',
};

export function AccountCard({ onEmail }: { onEmail?: () => void }) {
  const st = useCloud();
  const [busy, setBusy] = useState(false);

  if (st.email)
    return (
      <div className="card account">
        <div className="row">
          <span className="avatar" aria-hidden>
            {st.email[0].toUpperCase()}
          </span>
          <span className="grow account-who">
            <b>{st.email}</b>
            <small className="muted">{STATUS[st.status]}</small>
          </span>
        </div>
        {(st.pending > 0 || st.lastSync) && (
          <p className="small muted">
            {st.pending ? `${st.pending} cambios pendientes de subir. ` : ''}
            {st.lastSync ? `Última sincronización: ${new Date(st.lastSync).toLocaleString('es-ES')}.` : ''}
          </p>
        )}
        {st.error && <p className="error small">{st.error}</p>}
        <div className="row">
          <button
            className="outline"
            disabled={busy || st.status === 'syncing'}
            onClick={async () => {
              setBusy(true);
              await cloud.syncNow();
              setBusy(false);
              toast.show('Sincronizado');
            }}
          >
            <RefreshCw size={16} /> Sincronizar ahora
          </button>
          <button className="outline" onClick={() => cloud.signOut()}>
            Cerrar sesión
          </button>
        </div>
      </div>
    );

  if (!st.configured || st.status === 'off')
    return (
      <div className="card account">
        <b>Sincronización sin configurar</b>
        <p className="small muted">Puedes usar tu propio proyecto de Supabase en Ajustes. Sin cuenta, todo se guarda en este dispositivo.</p>
      </div>
    );

  return (
    <div className="card account">
      <b>Inicia sesión para sincronizar</b>
      <p className="small muted">Guarda tus entrenos en la nube y úsalos en el móvil, la web y el reloj. Sin cuenta, todo se guarda en este dispositivo.</p>
      <button className="primary full" onClick={onEmail}>
        <Mail size={16} /> Continuar con email
      </button>
    </div>
  );
}

export function EmailAuth({ onBack, signUp = false }: { onBack: () => void; signUp?: boolean }) {
  const st = useCloud();
  const [mode, setMode] = useState<'in' | 'up'>(signUp ? 'up' : 'in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState<'signup' | 'reset' | null>(null);

  // Con la sesión iniciada, esta pantalla ya no hace falta.
  useEffect(() => {
    if (st.email) onBack();
  }, [st.email, onBack]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr('');
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (sent)
    return (
      <section>
        <Back onClick={onBack} />
        <h1>Te hemos enviado un email</h1>
        <p className="muted">
          {sent === 'signup' ? (
            <>
              Abre el enlace que hemos mandado a <b>{email}</b> para confirmar la cuenta y luego vuelve aquí a iniciar sesión.
            </>
          ) : (
            <>
              Si <b>{email}</b> tiene cuenta, recibirás un enlace para elegir una contraseña nueva. Se abre en la web.
            </>
          )}
        </p>
        <p className="small muted">Si no lo ves, mira en la carpeta de spam.</p>
        <button
          className="primary full"
          onClick={() => {
            setSent(null);
            setMode('in');
          }}
        >
          Volver a iniciar sesión
        </button>
      </section>
    );

  return (
    <section>
      <Back onClick={onBack} />
      <h1>{mode === 'in' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            if (mode === 'in') return cloud.signIn(email.trim(), pw);
            if ((await cloud.signUp(email.trim(), pw)) === 'confirm') setSent('signup');
          });
        }}
      >
        <label>
          Email
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Contraseña
          <input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        {err && (
          <p className="error small" role="alert">
            {err}
          </p>
        )}
        <button className="primary full" disabled={busy || !email || pw.length < 6}>
          {mode === 'in' ? 'Iniciar sesión' : 'Crear cuenta'}
        </button>
      </form>
      <div className="row">
        {mode === 'in' && (
          <button
            className="ghost small"
            disabled={busy || !email}
            onClick={() =>
              run(async () => {
                await cloud.resetPassword(email.trim());
                setSent('reset');
              })
            }
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}
        <span className="grow" />
        <button
          className="ghost small"
          onClick={() => {
            setMode(mode === 'in' ? 'up' : 'in');
            setErr('');
          }}
        >
          {mode === 'in' ? 'No tengo cuenta' : 'Ya tengo cuenta'}
        </button>
      </div>
    </section>
  );
}

// La pregunta vive fuera del componente: si el árbol cambia mientras está pendiente (tour, enlace del email), al volver a montarse se muestra de nuevo.
type Ask = { email: string | null; done: (r: 'fresh' | 'merge') => void };
let pendingAsk: Ask | null = null;
const askSubs = new Set<() => void>();
const setAsk = (a: Ask | null) => {
  pendingAsk = a;
  askSubs.forEach((f) => f());
};
setAccountSwitchPrompt((email) => new Promise((done) => setAsk({ email, done })));

/** Diálogo propio cuando entra una cuenta distinta a la anterior del dispositivo (sustituye al confirm() nativo). Se monta una vez en App, por encima de todo. */
export function AccountSwitchDialog() {
  const ask = useSyncExternalStore(
    (f) => (askSubs.add(f), () => askSubs.delete(f)),
    () => pendingAsk,
  );
  if (!ask) return null;
  const pick = (r: 'fresh' | 'merge') => {
    setAsk(null);
    ask.done(r);
  };
  return (
    <div className="modal">
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Has entrado con otra cuenta">
        <h2>Has entrado con otra cuenta</h2>
        <p className="muted">{ask.email ?? 'Esta cuenta'} es distinta de la que usabas en este dispositivo. ¿Qué hacemos con los datos que hay aquí?</p>
        <button className="primary full" onClick={() => pick('fresh')}>
          Empezar de cero
        </button>
        <p className="small muted">Se usan los datos de esa cuenta. Antes se guarda una copia de los actuales en este dispositivo.</p>
        <button className="outline full" onClick={() => pick('merge')}>
          Subir también estos datos
        </button>
        <p className="small muted">Los datos de este dispositivo se añaden a esa cuenta.</p>
      </div>
    </div>
  );
}
