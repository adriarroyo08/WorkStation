// Lista de copias automáticas del dispositivo, con restaurar y descargar.
import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import type { BackupMeta } from '../../../shared/backups';
import { listBackups, loadBackup, snapshot } from '../backups';
import { downloadFile, useStore } from '../store';
import { toast } from '../toast';

const fmt = (iso: string) => new Date(iso).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function AutoBackups() {
  const { data, replace } = useStore();
  const [list, setList] = useState<BackupMeta[] | null>(null);
  const refresh = () => void listBackups().then(setList);
  // Se recarga cuando cambian los datos (p. ej. tras importar o borrar, que crean una copia).
  useEffect(refresh, [data]);

  const restore = async (b: BackupMeta) => {
    if (!confirm(`¿Restaurar la copia del ${fmt(b.at)}? (${b.workouts} entrenamientos). Antes se guarda una copia del estado actual.`)) return;
    const d = await loadBackup(b.id);
    if (!d) return alert('No se encontró la copia.');
    await snapshot(data, 'antes de restaurar');
    replace(d);
    toast.show('Copia restaurada');
    refresh();
  };
  const download = async (b: BackupMeta) => {
    const d = await loadBackup(b.id);
    if (d) downloadFile(`workstation-copia-${b.at.slice(0, 10)}.json`, JSON.stringify(d, null, 2));
  };

  return (
    <div className="card">
      <div className="row">
        <History size={18} className="tile-ico inline" />
        <h3 className="grow">Copias automáticas</h3>
        <button
          className="ghost small"
          onClick={async () => {
            await snapshot(data, 'manual');
            refresh();
            toast.show('Copia guardada');
          }}
        >
          Crear ahora
        </button>
      </div>
      <p className="small muted">Una al día y otra antes de importar, borrar o restaurar. Se guardan en este dispositivo (las 7 últimas diarias y 5 más), sin fotos.</p>
      {list === null ? null : list.length ? (
        <div className="list">
          {list.map((b) => (
            <div key={b.id} className="row backup-row">
              <span className="grow">
                <b>{fmt(b.at)}</b>
                <small className="muted">
                  {' '}
                  · {b.reason} · {b.workouts} entrenos · {b.routines} rutinas
                </small>
              </span>
              <button className="ghost small" onClick={() => download(b)} aria-label={`Descargar copia del ${fmt(b.at)}`}>
                ⬇
              </button>
              <button className="ghost small" onClick={() => restore(b)}>
                Restaurar
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="small muted">Aún no hay copias: la primera se crea automáticamente hoy.</p>
      )}
    </div>
  );
}
