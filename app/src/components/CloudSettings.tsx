// Solo lo técnico: apuntar la app a tu propio proyecto de Supabase. La cuenta (email) vive en Perfil.
import { useState } from 'react';
import { cloud, useCloud } from '../cloud';

export default function CloudSettings() {
  const st = useCloud();
  const [url, setUrl] = useState(cloud.config().url);
  const [key, setKey] = useState(cloud.config().anonKey);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMsg('');
    try {
      await fn();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <p className="small muted">
        Opcional. Por defecto la app usa su propio servicio. Si prefieres guardar tus entrenamientos en tu proyecto de{' '}
        <a href="https://supabase.com" target="_blank" rel="noreferrer">
          Supabase
        </a>{' '}
        (gratis), conéctalo aquí. Tu cuenta, con el email, está en Perfil.
      </p>

      {!st.configured || st.status === 'off' ? (
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
      ) : (
        <>
          <p className="small">
            Proyecto: <code>{cloud.config().url}</code>
            {cloud.builtIn() && ' (el de la app)'}
          </p>
          {st.status === 'signed-out' && (
            <button className="outline" disabled={busy} onClick={() => run(() => cloud.configure({ url: '', anonKey: '' }))}>
              Cambiar proyecto
            </button>
          )}
        </>
      )}
      {msg && <p className="small error">{msg}</p>}
    </div>
  );
}
