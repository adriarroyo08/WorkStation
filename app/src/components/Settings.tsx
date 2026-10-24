import { useState } from 'react';
import { AI_PROVIDERS, chat } from '../../../shared/ai';
import { emptyData, mergeData, normalizeData } from '../../../shared/data';
import { importHevyCsv } from '../../../shared/hevy';
import { clock, downloadFile, useStore } from '../store';
import { DevicesPanel } from './DevicesSheet';
import ApiKeys from './ApiKeys';
import AutoBackups from './AutoBackups';
import { AllReleasesSheet, APP_VERSION } from './WhatsNew';
import { Sparkles } from 'lucide-react';
import { snapshot } from '../backups';
import CloudSettings from './CloudSettings';
import ExdbSettings from './ExdbSettings';
import { Back, Toggle } from './ui';

export default function Settings({ onBack }: { onBack: () => void }) {
  const { data, ai, settings, setAi, setSettings, replace } = useStore();
  const [notes, setNotes] = useState(false);
  const [cfg, setCfg] = useState(ai);
  const [test, setTest] = useState('');
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

  const exportCsv = () => {
    const ex = new Map(data.exercises.map((e) => [e.id, e.name]));
    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      [
        'title',
        'start_time',
        'end_time',
        'description',
        'exercise_title',
        'superset_id',
        'exercise_notes',
        'set_index',
        'set_type',
        'weight_kg',
        'reps',
        'distance_km',
        'duration_seconds',
        'rpe',
      ].join(','),
    ];
    for (const w of [...data.workouts].sort((a, b) => a.startedAt.localeCompare(b.startedAt)))
      for (const e of w.exercises)
        e.sets.forEach((s, i) =>
          rows.push(
            [
              w.name,
              w.startedAt,
              w.endedAt,
              w.notes,
              ex.get(e.exerciseId) ?? e.exerciseId,
              e.supersetId,
              e.notes,
              i,
              s.type === 'drop' ? 'dropset' : s.type,
              s.weight,
              s.reps,
              s.distanceM !== undefined ? s.distanceM / 1000 : '',
              s.durationSec,
              s.rpe,
            ]
              .map(q)
              .join(','),
          ),
        );
    downloadFile(`workstation-${new Date().toISOString().slice(0, 10)}.csv`, rows.join('\n'), 'text/csv');
  };

  return (
    <section>
      <Back onClick={onBack} />
      <h1>Ajustes</h1>

      <h2>☁️ Cuenta y sincronización</h2>
      <CloudSettings />

      <h2>🔌 Acceso para IA (MCP)</h2>
      <ApiKeys />

      <h2>🏋️ Entrenamiento</h2>
      <div className="card">
        <label>
          Descanso por defecto
          <select value={settings.defaultRestSec} onChange={(e) => setSettings({ defaultRestSec: Number(e.target.value) })}>
            {[0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300].map((s) => (
              <option key={s} value={s}>
                {s ? clock(s) : 'Desactivado'}
              </option>
            ))}
          </select>
        </label>
        <label>
          Objetivo semanal (entrenos)
          <select value={settings.weeklyGoal} onChange={(e) => setSettings({ weeklyGoal: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <Toggle label="Mostrar columna RPE" checked={settings.showRpe} onChange={(v) => setSettings({ showRpe: v })} />
        <Toggle label="Sonido al terminar el descanso" checked={settings.sound} onChange={(v) => setSettings({ sound: v })} />
        <Toggle label="Vibrar al terminar el descanso" checked={settings.vibrate} onChange={(v) => setSettings({ vibrate: v })} />
        <Toggle label="Mantener pantalla encendida" checked={settings.keepAwake} onChange={(v) => setSettings({ keepAwake: v })} />
        <Toggle label="La semana empieza en lunes" checked={settings.weekStartsMonday} onChange={(v) => setSettings({ weekStartsMonday: v })} />
        <label>
          Tema
          <select value={settings.theme} onChange={(e) => setSettings({ theme: e.target.value as typeof settings.theme })}>
            <option value="auto">Automático</option>
            <option value="dark">Oscuro</option>
            <option value="light">Claro</option>
          </select>
        </label>
      </div>

      <h2>⌚ Reloj y sensores</h2>
      <DevicesPanel />

      <h2>🎞️ GIFs de ejercicios</h2>
      <ExdbSettings />

      <h2>🧮 Calculadora de discos</h2>
      <div className="card">
        <label>
          Peso de la barra (kg)
          <input inputMode="decimal" value={settings.barKg} onChange={(e) => setSettings({ barKg: Number(e.target.value.replace(',', '.')) || 0 })} />
        </label>
        <label>Discos disponibles (kg)</label>
        <div className="chips">
          {[50, 25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5].map((p) => (
            <button
              key={p}
              className={settings.platesKg.includes(p) ? 'on' : ''}
              onClick={() => setSettings({ platesKg: settings.platesKg.includes(p) ? settings.platesKg.filter((x) => x !== p) : [...settings.platesKg, p].sort((a, b) => b - a) })}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

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
        <p className="small muted">La clave se guarda solo en este dispositivo y no se incluye en los backups.</p>
        <div className="row">
          <button className="primary" onClick={() => (setAi(cfg), setTest('Guardado'))}>
            Guardar
          </button>
          <button className="ghost" onClick={testAi}>
            Probar conexión
          </button>
        </div>
        {test && <p className="small">{test}</p>}
      </div>

      <h2>💾 Datos</h2>
      <div className="card">
        <p className="small muted">
          {data.workouts.length} entrenamientos · {data.routines.length} rutinas · {data.exercises.length} ejercicios · {data.measurements.length} medidas. Todo se guarda en este navegador: exporta
          backups a menudo.
        </p>
        <button
          className="primary full"
          onClick={() => downloadFile(`workstation-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2))}
        >
          Exportar backup (JSON)
        </button>
        <button className="ghost full" onClick={exportCsv}>
          Exportar entrenamientos (CSV, formato compatible con Hevy)
        </button>
        <button
          className="ghost full"
          onClick={() =>
            readFile('.json,application/json', async (t) => {
              try {
                await snapshot(data, 'antes de importar');
                replace(normalizeData(mergeData(data, normalizeData(JSON.parse(t)))));
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
            readFile('.csv,text/csv', async (t) => {
              await snapshot(data, 'antes de importar');
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
        <button
          className="danger full"
          onClick={async () => {
            if (!confirm('¿Borrar TODOS los datos? Se guardará antes una copia automática en este dispositivo.') || !confirm('¿Seguro?')) return;
            await snapshot(data, 'antes de borrar');
            replace(emptyData());
          }}
        >
          Borrar todos los datos
        </button>
      </div>
      <AutoBackups />

      <h2>🔌 MCP</h2>
      <div className="card small">
        <p>
          Para que Claude Desktop, Cursor, LM Studio u otro cliente MCP lea y edite tus entrenamientos, usa el servidor <code>mcp/</code> del repositorio. Trabaja sobre un fichero JSON con el mismo
          formato que el backup: exporta aquí, guárdalo en la ruta de <code>WORKSTATION_DATA</code> y vuelve a importarlo cuando la IA cree rutinas o registre entrenos.
        </p>
      </div>

      <h2>ℹ️ Acerca de</h2>
      <div className="card small muted">
        <p>Workstation · app personal de entrenamiento. Imágenes e instrucciones de ejercicios: free-exercise-db (dominio público).</p>
        <button className="ghost small icon-btn" onClick={() => setNotes(true)}>
          <Sparkles size={15} /> Novedades
        </button>
        <a className="ghost small" href="https://github.com/adriarroyo08/WorkStation/blob/main/PRIVACY.md" target="_blank" rel="noreferrer">
          Privacidad
        </a>
      </div>
      <p className="app-version">
        Workstation v{APP_VERSION} · {__APP_COMMIT__}
      </p>
      {notes && <AllReleasesSheet onClose={() => setNotes(false)} />}
    </section>
  );
}
