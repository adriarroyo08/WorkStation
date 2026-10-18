import { useState } from 'react';
import { AI_PROVIDERS, chat } from '../../../shared/ai';
import { emptyData, mergeData, normalizeData } from '../../../shared/data';
import { importHevyCsv } from '../../../shared/hevy';
import { uid } from '../../../shared/types';
import { downloadFile, fmtDate, useStore } from '../store';

export default function Settings() {
  const { data, ai, setAi, update, replace } = useStore();
  const [cfg, setCfg] = useState(ai);
  const [test, setTest] = useState('');
  const [bw, setBw] = useState('');
  const provider = AI_PROVIDERS.find((p) => p.id === cfg.providerId);

  const readFile = (accept: string, cb: (text: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => input.files?.[0]?.text().then(cb);
    input.click();
  };

  const testAi = async () => {
    setAi(cfg);
    setTest('Probando…');
    try {
      const r = await chat(cfg, [{ role: 'user', content: 'Responde solo: OK' }]);
      setTest(`✅ Conectado: ${r.slice(0, 80)}`);
    } catch (e) {
      setTest(`❌ ${(e as Error).message}`);
    }
  };

  const measurements = [...data.measurements].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section>
      <h1>Ajustes</h1>

      <h2>🤖 Inteligencia artificial</h2>
      <div className="card">
        <label>
          Proveedor
          <select
            value={cfg.providerId}
            onChange={(e) => {
              const p = AI_PROVIDERS.find((x) => x.id === e.target.value)!;
              setCfg({ ...cfg, providerId: p.id, baseUrl: p.baseUrl, model: p.defaultModel });
            }}
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        {provider?.keyUrl && (
          <p className="small">
            Consigue tu API key gratis en{' '}
            <a href={provider.keyUrl} target="_blank" rel="noreferrer">
              {new URL(provider.keyUrl).host}
            </a>
          </p>
        )}
        {cfg.providerId === 'ollama' && <p className="small muted">Arranca Ollama con OLLAMA_ORIGINS="*" ollama serve para permitir llamadas desde el navegador.</p>}
        <label>
          URL base
          <input value={cfg.baseUrl} onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })} />
        </label>
        <label>
          Modelo
          <input value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} />
        </label>
        <label>
          API key
          <input type="password" value={cfg.apiKey} placeholder={provider?.needsKey ? 'Pega tu clave aquí' : 'Opcional'} onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })} />
        </label>
        <p className="small muted">La clave se guarda solo en este dispositivo.</p>
        <div className="row">
          <button className="primary" onClick={() => setAi(cfg)}>
            Guardar
          </button>
          <button className="ghost" onClick={testAi}>
            Probar conexión
          </button>
        </div>
        {test && <p className="small">{test}</p>}
      </div>

      <h2>⚖️ Peso corporal</h2>
      <div className="card">
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            const v = Number(bw.replace(',', '.'));
            if (!v) return;
            update((d) => void d.measurements.push({ id: uid(), date: new Date().toISOString(), bodyweight: v }));
            setBw('');
          }}
        >
          <input inputMode="decimal" placeholder="kg" value={bw} onChange={(e) => setBw(e.target.value)} />
          <button className="primary">Añadir</button>
        </form>
        <ul className="small">
          {measurements.slice(0, 5).map((m) => (
            <li key={m.id}>
              {fmtDate(m.date)}: {m.bodyweight} kg
            </li>
          ))}
        </ul>
      </div>

      <h2>💾 Datos</h2>
      <div className="card">
        <p className="small muted">
          {data.workouts.length} entrenamientos · {data.routines.length} rutinas · {data.exercises.length} ejercicios. Todo se guarda en este navegador.
        </p>
        <button className="primary full" onClick={() => downloadFile(`workstation-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2))}>
          Exportar backup (JSON)
        </button>
        <button
          className="ghost full"
          onClick={() =>
            readFile('.json,application/json', (t) => {
              try {
                replace(mergeData(data, normalizeData(JSON.parse(t))));
                alert('Datos importados y fusionados.');
              } catch (e) {
                alert(`Error: ${(e as Error).message}`);
              }
            })
          }
        >
          Importar backup / fichero del MCP (JSON)
        </button>
        <button
          className="ghost full"
          onClick={() =>
            readFile('.csv,text/csv', (t) => {
              const d = structuredClone(data);
              const n = importHevyCsv(d, t);
              replace(d);
              alert(`Importados ${n} entrenamientos desde Hevy.`);
            })
          }
        >
          Importar CSV exportado de Hevy
        </button>
        <p className="small muted">En Hevy: Perfil → Ajustes → Exportar e importar datos → Exportar entrenamientos.</p>
        <button className="danger full" onClick={() => confirm('¿Borrar TODOS los datos? Exporta un backup antes.') && replace(emptyData())}>
          Borrar todos los datos
        </button>
      </div>

      <h2>🔌 MCP</h2>
      <div className="card small">
        <p>
          Para que Claude Desktop, Cursor, LM Studio u otro cliente MCP lea y edite tus entrenamientos, usa el servidor <code>mcp/</code> del repositorio. Trabaja sobre un fichero JSON con el mismo formato que el backup: exporta aquí, guárdalo como <code>~/.workstation/data.json</code> y vuelve a importarlo cuando la IA cree rutinas.
        </p>
      </div>
    </section>
  );
}
