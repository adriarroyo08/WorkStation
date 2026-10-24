import { useState } from 'react';
import { cloud, useCloud } from '../cloud';
import { toast } from '../toast';

const STATUS: Record<string, string> = {
  off: 'Sin configurar',
  'signed-out': 'Sin sesión',
  syncing: 'Sincronizando…',
  idle: 'Sincronizado',
  offline: 'Sin conexión (se subirá al volver)',
  error: 'Error',
};

export default function CloudSettings() {
  const st = useCloud();
  const [url, setUrl] = useState(cloud.config().url);
  const [key, setKey] = useState(cloud.config().anonKey);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [bad, setBad] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMsg('');
    setBad(false);
    try {
      await fn();
    } catch (e) {
      setMsg((e as Error).message);
      setBad(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="row">
        <b className="grow">{st.email ?? 'Tu cuenta'}</b>
        <span className={`pill ${st.status === 'idle' ? 'ok' : ''}`}>{STATUS[st.status]}</span>
      </div>
      <p className="small muted">
        Opcional. Guarda tus entrenamientos en tu propio proyecto de{' '}
        <a href="https://supabase.com" target="_blank" rel="noreferrer">
          Supabase
        </a>{' '}
        (gratis) y sincroniza móvil, web y app Android. Sin cuenta, todo sigue guardándose solo en este dispositivo.
      </p>

      {(!st.configured || st.status === 'off') && (
        <>
          <label>
            Project URL
            <input placeholder="https://xxxx.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label>
            anon public key
            <input type="password" placeholder="eyJhbGciOi…" value={key} onChange={(e) => setKey(e.target.value)} />
          </label>
          <button className="primary" disabled={busy || !url || !key} onClick={() => run(() => cloud.configure({ url, anonKey: key }))}>
            Conectar con Supabase
          </button>
          <p className="small muted">
            En Supabase: Project Settings → API. Antes, ejecuta una vez el SQL de <code>supabase/migrations/001_records.sql</code> en el SQL Editor.
          </p>
        </>
      )}

      {st.configured && st.status === 'signed-out' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => cloud.signIn(email, pw));
          }}
        >
          <label>
            Email
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Contraseña
            <input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
          <div className="row">
            <button className="primary" disabled={busy || !email || pw.length < 6}>
              Iniciar sesión
            </button>
            <button
              type="button"
              className="outline"
              disabled={busy || !email || pw.length < 6}
              onClick={() =>
                run(async () => {
                  const r = await cloud.signUp(email, pw);
                  setMsg(r === 'confirm' ? 'Revisa tu email para confirmar la cuenta y luego inicia sesión.' : 'Cuenta creada.');
                })
              }
            >
              Crear cuenta
            </button>
          </div>
          <button type="button" className="ghost small" onClick={() => run(() => cloud.configure({ url: '', anonKey: '' }))}>
            Cambiar proyecto
          </button>
        </form>
      )}

      {st.email && (
        <>
          <p className="small muted">
            {st.pending ? `${st.pending} cambios pendientes de subir. ` : ''}
            {st.lastSync ? `Última sincronización: ${new Date(st.lastSync).toLocaleString('es-ES')}.` : ''}
          </p>
          {st.error && <p className="error small">{st.error}</p>}
          <div className="row">
            <button className="primary" disabled={busy || st.status === 'syncing'} onClick={() => run(async () => (await cloud.syncNow(), toast.show('Sincronizado')))}>
              Sincronizar ahora
            </button>
            <button className="outline" onClick={() => run(() => cloud.signOut())}>
              Cerrar sesión
            </button>
          </div>
        </>
      )}
      {msg && <p className={bad ? 'small error' : 'small'}>{msg}</p>}
    </div>
  );
}
