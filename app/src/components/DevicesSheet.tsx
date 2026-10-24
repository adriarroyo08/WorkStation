import { useEffect, useState } from 'react';
import { Heart, Watch } from 'lucide-react';
import { bleSupported, connectBleHeartRate, disconnectBle, useHeartRate } from '../hr';
import { isNative, native, useWatchStatus } from '../native';
import { Sheet } from './ui';

export function DevicesPanel() {
  const hr = useHeartRate();
  const watch = useWatchStatus();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    native.requestWatchStatus();
  }, []);
  return (
    <div>
      <div className="card">
        <div className="row">
          <b className="grow">
            <Watch size={16} className="ico" /> Reloj Wear OS
          </b>
          {isNative() ? <span className={watch.nodes.length ? 'pill ok' : 'pill'}>{watch.nodes.length ? 'Conectado' : 'No detectado'}</span> : <span className="pill">Solo en la app Android</span>}
        </div>
        {isNative() ? (
          watch.nodes.length ? (
            <>
              <p className="small muted">{watch.nodes.join(', ')}: ve la serie actual, completa series, controla el descanso y envía tu pulso.</p>
              <button className="ghost small" onClick={() => native.openWatchApp()}>
                Abrir Workstation en el reloj
              </button>
            </>
          ) : (
            <p className="small muted">Instala la app Workstation en el reloj (APK «wear») y empareja el reloj con este móvil.</p>
          )
        ) : (
          <p className="small muted">Para usar el reloj instala la app Android de Workstation (APK «phone») en el móvil y la app «wear» en el reloj. Consulta el README.</p>
        )}
        {isNative() && (
          <button className="ghost small" onClick={() => native.requestWatchStatus()}>
            ↻ Buscar de nuevo
          </button>
        )}
      </div>
      <div className="card">
        <div className="row">
          <b className="grow">
            <Heart size={16} className="ico" /> Pulsómetro Bluetooth
          </b>
          {hr.bleName && <span className="pill ok">{hr.bleName}</span>}
        </div>
        <p className="small muted">Bandas de pecho o relojes que emitan frecuencia cardiaca por Bluetooth (perfil estándar «Heart Rate»).</p>
        {bleSupported() ? (
          hr.bleName ? (
            <button className="ghost" onClick={disconnectBle}>
              Desconectar
            </button>
          ) : (
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                setErr('');
                setBusy(true);
                try {
                  await connectBleHeartRate();
                } catch (e) {
                  if ((e as Error).name !== 'NotFoundError') setErr((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Conectando…' : 'Conectar pulsómetro'}
            </button>
          )
        ) : (
          <p className="small muted">Este navegador no soporta Web Bluetooth (usa Chrome en Android o escritorio).</p>
        )}
        {err && <p className="error small">{err}</p>}
      </div>
      {hr.live && (
        <p className="center-text">
          <span className="hr-big">
            <Heart size={28} className="ico" /> {hr.bpm}
          </span>{' '}
          <span className="muted small">ppm · {hr.source === 'watch' ? 'reloj' : 'Bluetooth'}</span>
        </p>
      )}
    </div>
  );
}

export default function DevicesSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Reloj y sensores" onClose={onClose}>
      <DevicesPanel />
    </Sheet>
  );
}
