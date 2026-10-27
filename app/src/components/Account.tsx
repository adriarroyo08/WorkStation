// Cuenta: tarjeta de Perfil, pantalla de email (entrar / crear cuenta / recuperar) y diálogo al cambiar de cuenta.
import { Circle, CircleAlert, CircleCheck, CloudOff, CloudUpload, Eye, EyeOff, Lock, LogOut, Mail, MailCheck, MonitorSmartphone, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { cloud, setAccountSwitchPrompt, useCloud } from '../cloud';
import { useNow } from '../store';
import { toast } from '../toast';
import { PASSWORD_RULES, passwordOk, passwordStrength } from '../../../shared/password';
import { Back } from './ui';

const STATUS: Record<string, string> = {
  off: 'Sin configurar',
  'signed-out': 'Sin sesión',
  syncing: 'Sincronizando…',
  idle: 'Sincronizado',
  offline: 'Sin conexión (se subirá al volver)',
  error: 'Error de sincronización',
};

const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.4z" />
    <path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0 0 12 23.5z" />
    <path fill="#FBBC05" d="M5.6 14.2a6.9 6.9 0 0 1 0-4.4v-3H1.8a11.5 11.5 0 0 0 0 10.4l3.8-3z" />
    <path fill="#EA4335" d="M12 5.4c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 0 0 1.8 6.8l3.8 3C6.5 7.4 9 5.4 12 5.4z" />
  </svg>
);

/** Ilustración: la nube enlazada con móvil, reloj y web. Los colores salen del tema (clases en styles.css). */
export const SyncArt = ({ small }: { small?: boolean }) => (
  <svg className={`sync-art${small ? ' small' : ''}`} viewBox="0 0 280 132" aria-hidden>
    <path className="sa-link" d="M116 44Q60 44 46 58" />
    <path className="sa-link" d="M164 44Q225 44 231 66" />
    <path className="sa-link" d="M140 50V76" />
    <g className="sa-acc">
      <circle cx="124" cy="38" r="10" />
      <circle cx="140" cy="30" r="14" />
      <circle cx="156" cy="38" r="10" />
      <rect x="124" y="34" width="32" height="14" />
    </g>
    <path className="sa-check" d="M133 38l5 5 9-9" />
    {/* Móvil */}
    <rect className="sa-dev" x="26" y="58" width="40" height="66" rx="8" />
    <rect className="sa-mut" x="40" y="63" width="12" height="2" rx="1" />
    <rect className="sa-mut" x="33" y="104" width="5" height="12" rx="1.5" />
    <rect className="sa-mut" x="41" y="98" width="5" height="18" rx="1.5" />
    <rect className="sa-acc" x="49" y="90" width="5" height="26" rx="1.5" />
    {/* Reloj */}
    <rect className="sa-dev" x="130" y="76" width="20" height="50" rx="5" />
    <rect className="sa-dev" x="124" y="84" width="32" height="34" rx="10" />
    <circle className="sa-ring" cx="140" cy="101" r="9" />
    {/* Web */}
    <rect className="sa-dev" x="200" y="66" width="62" height="42" rx="5" />
    <path className="sa-dev" d="M192 110h86l-4 6h-78z" />
    <rect className="sa-acc" x="208" y="74" width="22" height="4" rx="2" />
    <rect className="sa-mut" x="208" y="83" width="44" height="3" rx="1.5" />
    <rect className="sa-mut" x="208" y="90" width="36" height="3" rx="1.5" />
    <rect className="sa-mut" x="208" y="97" width="40" height="3" rx="1.5" />
  </svg>
);

function GoogleButton({ label = 'Continuar con Google' }: { label?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <>
      <button
        type="button"
        className="google-btn full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr('');
          try {
            await cloud.signInWithGoogle();
          } catch (e) {
            setErr((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <GoogleG /> {label}
      </button>
      {err && (
        <p className="error small" role="alert">
          {err}
        </p>
      )}
    </>
  );
}

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
const ago = (iso: string, now: number) => {
  const s = Math.round((Date.parse(iso) - now) / 1000);
  if (s > -60) return 'ahora mismo';
  if (s > -3600) return rtf.format(Math.round(s / 60), 'minute');
  if (s > -86400) return rtf.format(Math.round(s / 3600), 'hour');
  return rtf.format(Math.round(s / 86400), 'day');
};

function Avatar({ name, email, src }: { name: string | null; email: string; src: string | null }) {
  const [broken, setBroken] = useState(false);
  return src && !broken ? (
    <img className="avatar big" src={src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
  ) : (
    <span className="avatar big" aria-hidden>
      {(name || email)[0].toUpperCase()}
    </span>
  );
}

const SYNC_ICON = { syncing: RefreshCw, idle: CircleCheck, offline: CloudOff, error: CircleAlert } as const;

export function AccountCard({ onEmail }: { onEmail?: () => void }) {
  const st = useCloud();
  const now = useNow(30_000);
  const [busy, setBusy] = useState(false);

  if (st.email) {
    const Icon = SYNC_ICON[st.status as keyof typeof SYNC_ICON] ?? CircleCheck;
    return (
      <div className="card account account-in">
        <div className="row">
          <span className={`avatar-wrap ${st.status}`}>
            <Avatar name={st.name} email={st.email} src={st.avatar} />
          </span>
          <span className="grow account-who">
            <b>{st.name ?? st.email}</b>
            {st.name && <small className="muted">{st.email}</small>}
          </span>
        </div>
        <div className={`sync-state ${st.status}`} role="status">
          <Icon size={16} aria-hidden />
          <span className="grow">
            {STATUS[st.status]}
            {st.status === 'idle' && st.lastSync && <span className="muted"> · {ago(st.lastSync, now)}</span>}
          </span>
          {st.pending > 0 && <span className="pill">{st.pending} pendientes</span>}
        </div>
        {st.error && <p className="error small">{st.error}</p>}
        <div className="account-actions">
          <button
            className="outline icon-btn full"
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
          <button className="ghost icon-btn gray full" onClick={() => cloud.signOut()}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (!st.configured || st.status === 'off')
    return (
      <div className="card account">
        <b>Sincronización sin configurar</b>
        <p className="small muted">Puedes usar tu propio proyecto de Supabase en Ajustes. Sin cuenta, todo se guarda en este dispositivo.</p>
      </div>
    );

  return (
    <div className="card account account-hero">
      <SyncArt />
      <h2>Inicia sesión para sincronizar</h2>
      <p className="small muted">Crea tu cuenta gratis y lleva tus entrenos a todas partes. Sin cuenta, todo se queda en este dispositivo.</p>
      <ul className="perks">
        <li>
          <CloudUpload size={18} aria-hidden /> Copia automática en la nube
        </li>
        <li>
          <MonitorSmartphone size={18} aria-hidden /> Móvil, web y reloj siempre al día
        </li>
        <li>
          <ShieldCheck size={18} aria-hidden /> Privado: solo tú ves tus datos
        </li>
      </ul>
      {cloud.googleAvailable() && <GoogleButton />}
      <button className={`${cloud.googleAvailable() ? 'outline' : 'primary'} full icon-btn`} onClick={onEmail}>
        <Mail size={16} /> Continuar con email
      </button>
    </div>
  );
}

/** Campo de contraseña con botón para verla. */
function PasswordInput({ label, value, onChange, autoComplete, invalid }: { label: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <label>
      {label}
      <span className={`input-icon${invalid ? ' bad' : ''}`}>
        <Lock size={16} aria-hidden />
        <input type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid || undefined} />
        <button type="button" className="ghost eye" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar' : 'Ver'} aria-pressed={show}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}

const STRENGTH = ['', 'Débil', 'Aceptable', 'Fuerte'];

/** Contraseña nueva: política en vivo, medidor de fuerza y repetición. Sirve para crear cuenta y para elegir una nueva. */
export function NewPasswordFields({ pw, setPw, pw2, setPw2, label = 'Contraseña' }: { pw: string; setPw: (v: string) => void; pw2: string; setPw2: (v: string) => void; label?: string }) {
  const level = passwordStrength(pw);
  const mismatch = !!pw2 && pw2 !== pw;
  return (
    <>
      <PasswordInput label={label} value={pw} onChange={setPw} autoComplete="new-password" />
      <div className={`pw-meter s${level}`} aria-hidden>
        <i />
        <i />
        <i />
      </div>
      {pw && <p className="small pw-level">Seguridad: {STRENGTH[level]}</p>}
      <ul className="pw-rules" aria-label="Requisitos de la contraseña">
        {PASSWORD_RULES.map((r) => {
          const ok = r.ok(pw);
          return (
            <li key={r.label} className={ok ? 'ok' : ''}>
              {ok ? <CircleCheck size={14} aria-hidden /> : <Circle size={14} aria-hidden />} {r.label}
              <span className="sr-only">{ok ? ' (cumplido)' : ' (pendiente)'}</span>
            </li>
          );
        })}
      </ul>
      <PasswordInput label="Repetir contraseña" value={pw2} onChange={setPw2} autoComplete="new-password" invalid={mismatch} />
      {mismatch && <p className="error small">Las contraseñas no coinciden.</p>}
      {!mismatch && pw2 && pw2 === pw && (
        <p className="small pw-match">
          <CircleCheck size={14} aria-hidden /> Coinciden
        </p>
      )}
    </>
  );
}
export const newPasswordReady = (pw: string, pw2: string) => passwordOk(pw) && pw === pw2;

export function EmailAuth({ onBack, signUp = false }: { onBack: () => void; signUp?: boolean }) {
  const st = useCloud();
  const [mode, setMode] = useState<'in' | 'up'>(signUp ? 'up' : 'in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState<'signup' | 'reset' | null>(null);
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());

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
  const switchTo = (m: 'in' | 'up') => {
    setMode(m);
    setErr('');
    setPw2('');
  };

  if (sent)
    return (
      <section className="auth">
        <Back onClick={onBack} />
        <div className="auth-sent">
          <span className="auth-bubble" aria-hidden>
            <MailCheck size={36} />
          </span>
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
        </div>
        <button
          className="primary full"
          onClick={() => {
            setSent(null);
            switchTo('in');
          }}
        >
          Volver a iniciar sesión
        </button>
      </section>
    );

  const google = cloud.googleAvailable();
  const ready = emailOk && (mode === 'in' ? pw.length >= 6 : newPasswordReady(pw, pw2));
  return (
    <section className="auth">
      <Back onClick={onBack} />
      <SyncArt small />
      <h1>{mode === 'in' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
      <p className="muted small">{mode === 'in' ? 'Entra para sincronizar tus entrenos entre el móvil, la web y el reloj.' : 'Gratis. Tus entrenos se guardan en la nube y te siguen entre dispositivos.'}</p>
      <div className="segmented" role="group" aria-label="Tipo de acceso">
        <button type="button" className={mode === 'in' ? 'on' : ''} aria-pressed={mode === 'in'} onClick={() => switchTo('in')}>
          Ya tengo cuenta
        </button>
        <button type="button" className={mode === 'up' ? 'on' : ''} aria-pressed={mode === 'up'} onClick={() => switchTo('up')}>
          No tengo cuenta
        </button>
      </div>
      {google && (
        <>
          <GoogleButton label={mode === 'up' ? 'Registrarse con Google' : 'Continuar con Google'} />
          <div className="or">o con tu email</div>
        </>
      )}
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
          <span className="input-icon">
            <Mail size={16} aria-hidden />
            <input type="email" autoComplete="email" inputMode="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </span>
        </label>
        {mode === 'in' ? <PasswordInput label="Contraseña" value={pw} onChange={setPw} autoComplete="current-password" /> : <NewPasswordFields pw={pw} setPw={setPw} pw2={pw2} setPw2={setPw2} />}
        {err && (
          <p className="error small" role="alert">
            {err}
          </p>
        )}
        <button className="primary full" disabled={busy || !ready}>
          {mode === 'in' ? 'Iniciar sesión' : 'Crear cuenta'}
        </button>
      </form>
      {mode === 'in' && (
        <button
          className="ghost small gray"
          disabled={busy || !emailOk}
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
