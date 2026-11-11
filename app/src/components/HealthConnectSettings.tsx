import { useEffect } from 'react';
import { HeartPulse } from 'lucide-react';
import { healthConnectMessage, healthConnectPhase } from '../../../shared/health-connect';
import { native, useHealthConnect } from '../native';
import { Toggle } from './ui';

// Exportación optativa a Health Connect. Solo aparece en las versiones de la app Android que la admiten.
export default function HealthConnectSettings() {
  const { status, denied } = useHealthConnect();
  useEffect(() => native.healthConnectRefresh(), []);
  if (!native.healthConnectSupported() || !status) return null;

  const phase = healthConnectPhase(status);
  const canToggle = phase === 'off' || phase === 'active' || phase === 'revoked';
  const canOpen = phase === 'update_required' || phase === 'active' || phase === 'revoked' || (phase === 'off' && denied);

  return (
    <>
      <h2>
        <HeartPulse size={16} className="ico" /> Health Connect
      </h2>
      <div className="card">
        {canToggle && <Toggle label="Exportar entrenamientos a Health Connect" checked={phase === 'active'} onChange={(on) => (on ? native.healthConnectEnable() : native.healthConnectDisable())} />}
        <p className="muted small" role="status">
          {healthConnectMessage(status, denied)}
        </p>
        {canOpen && (
          <button className="full" onClick={() => native.healthConnectOpen()}>
            {phase === 'update_required' ? 'Instalar o actualizar Health Connect' : 'Abrir Health Connect'}
          </button>
        )}
      </div>
    </>
  );
}
