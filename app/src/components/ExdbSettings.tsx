import { useState } from 'react';
import { autoLink } from '../../../shared/exercisedb';
import { clearGifCache, exdb, loadExdbList, useExdbConfig } from '../exdb';
import { useStore } from '../store';
import { toast } from '../toast';

export default function ExdbSettings() {
  const { data, replace } = useStore();
  const cfg = useExdbConfig();
  const [key, setKey] = useState(cfg.key);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const linked = data.exercises.filter((e) => e.exdbId).length;

  const link = async () => {
    exdb.set({ key: key.trim() });
    setBusy(true);
    setMsg('Descargando la lista de ExerciseDB…');
    try {
      const list = await loadExdbList(true);
      const d = structuredClone(data);
      const n = autoLink(d.exercises, list);
      replace(d);
      setMsg(`✅ ${list.length} ejercicios en ExerciseDB. Vinculados automáticamente: ${n} más.`);
      toast.show('GIFs de ejercicios activados');
    } catch (e) {
      setMsg(`❌ ${(e as Error).message}. Revisa la key y que estés suscrito a ExerciseDB en RapidAPI.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <p className="small muted">
        GIFs animados de 1.300+ ejercicios con tu propia API key de{' '}
        <a href="https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb" target="_blank" rel="noreferrer">
          ExerciseDB en RapidAPI
        </a>{' '}
        (plan gratuito disponible). La key y los GIFs se guardan solo en este dispositivo; sin key se usan las imágenes del catálogo libre.
      </p>
      <label>
        API key (X-RapidAPI-Key)
        <input type="password" value={key} placeholder="Pega tu key de RapidAPI" onChange={(e) => setKey(e.target.value)} />
      </label>
      <label>
        Calidad del GIF
        <select value={cfg.resolution} onChange={(e) => exdb.set({ resolution: Number(e.target.value) as 180 | 360 | 720 | 1080 })}>
          <option value={180}>180 px (plan gratuito)</option>
          <option value={360}>360 px</option>
          <option value={720}>720 px</option>
          <option value={1080}>1080 px</option>
        </select>
      </label>
      <details className="small">
        <summary className="muted">Avanzado</summary>
        <label>
          Host de la API
          <input value={cfg.host} onChange={(e) => exdb.set({ host: e.target.value.trim() })} />
        </label>
      </details>
      <div className="row">
        <button className="primary" disabled={busy || !key.trim()} onClick={link}>
          {busy ? 'Vinculando…' : 'Guardar y vincular ejercicios'}
        </button>
        {cfg.key && (
          <button className="ghost" onClick={() => (exdb.set({ key: '' }), setKey(''), setMsg('Key eliminada.'))}>
            Quitar key
          </button>
        )}
      </div>
      {msg && <p className="small">{msg}</p>}
      <p className="small muted">
        {linked} de {data.exercises.length} ejercicios con GIF. Puedes elegir otro GIF desde la ficha de cada ejercicio.{' '}
        <button className="ghost small" onClick={() => clearGifCache().then(() => toast.show('Caché de GIFs borrada'))}>
          Borrar caché
        </button>
      </p>
    </div>
  );
}
