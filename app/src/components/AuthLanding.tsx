// Pantallas de la web a las que llegan los enlaces del email: "Cuenta confirmada" y "Elige tu nueva contraseña".
import { useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, KeyRound } from 'lucide-react';
import { activeApiKeys, finishPasswordRecovery, revokeAllLabel, revokeKeys, revokeOutcomeText, type RecoveryApiKey, type RevokeOutcome } from '../../../shared/api-keys';
import { cloud, useCloud } from '../cloud';
import { NewPasswordFields, newPasswordReady } from './Account';
import { Toggle } from './ui';

export default function AuthLanding() {
  const { recovery: rec, linkError, email } = useCloud();
  const recovery = rec && !linkError;
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [keys, setKeys] = useState<RecoveryApiKey[] | null>(null); // null: aún no se sabe o no se pudo consultar
  const [revoke, setRevoke] = useState(true);
  const [outcome, setOutcome] = useState<RevokeOutcome | null>(null);

  // Se espera a la sesión: esta pantalla se pinta con el primer render, antes de que exista el cliente.
  useEffect(() => {
    if (!recovery || !email) return;
    let live = true;
    cloud
      .listApiKeys()
      .then((k) => live && setKeys(k))
      .catch(() => {}); // sin la lista se sigue ofreciendo revocarlas: el borrado no depende de ella
    return () => {
      live = false;
    };
  }, [recovery, email]);

  const active = keys && activeApiKeys(keys);
  const revokeAll = () => cloud.revokeAllApiKeys();
  const note = outcome && revokeOutcomeText(outcome, active ? active.length : null);

  return (
    <main className="landing">
      {recovery && !outcome ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr('');
            try {
              setOutcome(await finishPasswordRecovery(() => cloud.updatePassword(pw), revoke && active?.length !== 0 ? revokeAll : null));
            } catch (x) {
              setErr((x as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <KeyRound size={40} className="muted" aria-hidden />
          <h1>Elige tu nueva contraseña</h1>
          <NewPasswordFields label="Nueva contraseña" pw={pw} setPw={setPw} pw2={pw2} setPw2={setPw2} />
          {active?.length !== 0 && (
            <section aria-label="API keys de tu cuenta">
              <Toggle checked={revoke} onChange={setRevoke} label={revokeAllLabel(active ? active.length : null)} />
              <p className="small muted">Recomendado si no sabes quién puede tenerlas. Incluye la del reloj: el móvil creará otra al abrir la app.</p>
              {active && (
                <ul className="landing-keys small">
                  {active.map((k) => (
                    <li key={k.id}>
                      <b>{k.name}</b> <span className="muted">{k.key_prefix}…</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {err && (
            <p className="error small" role="alert">
              {err}
            </p>
          )}
          <button className="primary full" disabled={busy || !newPasswordReady(pw, pw2)}>
            Guardar contraseña
          </button>
        </form>
      ) : (
        <>
          {linkError ? <CircleAlert size={40} className="landing-bad" aria-hidden /> : <CircleCheck size={40} className="muted" aria-hidden />}
          <h1>{linkError ? 'Enlace no válido' : recovery ? 'Contraseña actualizada' : 'Cuenta confirmada'}</h1>
          <p className="muted">{linkError ?? (recovery ? 'Ya puedes usarla en la app.' : 'Vuelve a la app e inicia sesión.')}</p>
          {recovery && note && (
            <p className={outcome?.status === 'failed' ? 'error small' : 'small muted'} role={outcome?.status === 'failed' ? 'alert' : undefined}>
              {note}
            </p>
          )}
          {recovery && outcome?.status === 'failed' && (
            <button
              className="outline full"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setOutcome(await revokeKeys(revokeAll));
                setBusy(false);
              }}
            >
              Reintentar la revocación
            </button>
          )}
          <button className="primary full" onClick={cloud.dismissLanding}>
            Continuar en la web
          </button>
        </>
      )}
    </main>
  );
}
