// Pantallas de la web a las que llegan los enlaces del email: "Cuenta confirmada" y "Elige tu nueva contraseña".
import { useState } from 'react';
import { cloud, useCloud } from '../cloud';

export default function AuthLanding() {
  const { recovery: rec, linkError } = useCloud();
  const recovery = rec && !linkError;
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);

  return (
    <main className="landing">
      {recovery && !saved ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr('');
            try {
              await cloud.updatePassword(pw);
              setSaved(true);
            } catch (x) {
              setErr((x as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h1>Elige tu nueva contraseña</h1>
          <label>
            Nueva contraseña
            <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
          {err && (
            <p className="error small" role="alert">
              {err}
            </p>
          )}
          <button className="primary full" disabled={busy || pw.length < 6}>
            Guardar contraseña
          </button>
        </form>
      ) : (
        <>
          <h1>{linkError ? 'Enlace no válido' : recovery ? 'Contraseña actualizada' : 'Cuenta confirmada'}</h1>
          <p className={linkError ? 'error' : 'muted'}>{linkError ?? (recovery ? 'Ya puedes usarla en la app.' : 'Vuelve a la app e inicia sesión.')}</p>
          <button className="primary full" onClick={cloud.dismissLanding}>
            Continuar en la web
          </button>
        </>
      )}
    </main>
  );
}
