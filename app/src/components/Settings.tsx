import RestPicker from './RestPicker';
import { useState } from 'react';
import { AI_PROVIDERS, chat } from '../../../shared/ai';
import { emptyData, mergeData, normalizeData } from '../../../shared/data';
import { importHevyCsv } from '../../../shared/hevy';
import { downloadFile, useStore } from '../store';
import { DevicesPanel } from './DevicesSheet';
import ApiKeys from './ApiKeys';
import AutoBackups from './AutoBackups';
import { cloud } from '../cloud';
import { AllReleasesSheet, APP_VERSION } from './WhatsNew';
import { Bot, Calculator, ChevronRight, Cloud, Compass, Dumbbell, ExternalLink, Film, Info, Plug, Save, ShieldCheck, Sparkles, Watch } from 'lucide-react';
import { snapshot } from '../backups';
import CloudSettings from './CloudSettings';
import ExdbSettings from './ExdbSettings';
import { Back, NumberField, Toggle } from './ui';
import { DEFAULT_BAR_LB, DEFAULT_PLATES_LB } from '../../../shared/units';

export default function Settings({ onBack }: { onBack: () => void }) {
  const { data, ai, settings, setAi, setSettings, replace } = useStore();
  const [notes, setNotes] = useState(false);
  const [cfg, setCfg] = useState(ai);
  const [test, setTest] = useState('');
  const [testBad, setTestBad] = useState(false);
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
    setTestBad(false);
    try {
      const r = await chat(cfg, [{ role: 'user', content: 'Responde solo: OK' }]);
      setTest(`Conectado: ${r.slice(0, 80)}`);
    } catch (e) {
      setTest((e as Error).message);
      setTestBad(true);
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

      <h2>
        <Dumbbell size={16} className="ico" /> Entrenamiento
      </h2>
      <div className="card">
        <RestPicker prefix="Descanso por defecto" value={settings.defaultRestSec} onChange={(v) => setSettings({ defaultRestSec: v })} />
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
          Unidad de peso
          <select value={settings.unit ?? 'kg'} onChange={(e) => setSettings({ unit: e.target.value as 'kg' | 'lb' })}>
            <option value="kg">Kilos (kg)</option>
            <option value="lb">Libras (lb)</option>
          </select>
        </label>
        <label>
          Tema
          <select value={settings.theme} onChange={(e) => setSettings({ theme: e.target.value as typeof settings.theme })}>
            <option value="auto">Automático</option>
            <option value="dark">Oscuro</option>
            <option value="light">Claro</option>
          </select>
        </label>
      </div>

      <h2>
        <Calculator size={16} className="ico" /> Calculadora de discos
      </h2>
      <div className="card">
        {settings.unit === 'lb' ? (
          <>
            <label>
              Peso de la barra (lb)
              <NumberField value={settings.barLb ?? DEFAULT_BAR_LB} onChange={(v) => setSettings({ barLb: v ?? 0 })} />
            </label>
            <label>Discos disponibles (lb)</label>
            <div className="chips">
              {[55, 45, 35, 25, 15, 10, 5, 2.5, 1.25].map((p) => {
                const plates = settings.platesLb ?? DEFAULT_PLATES_LB;
                return (
                  <button
                    key={p}
                    className={plates.includes(p) ? 'on' : ''}
                    aria-pressed={plates.includes(p)}
                    onClick={() => setSettings({ platesLb: plates.includes(p) ? plates.filter((x) => x !== p) : [...plates, p].sort((a, b) => b - a) })}
                  >
                    {String(p).replace('.', ',')}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <label>
              Peso de la barra (kg)
              <NumberField value={settings.barKg} onChange={(v) => setSettings({ barKg: v ?? 0 })} />
            </label>
            <label>Discos disponibles (kg)</label>
            <div className="chips">
              {[50, 25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5].map((p) => (
                <button
                  key={p}
                  className={settings.platesKg.includes(p) ? 'on' : ''}
                  aria-pressed={settings.platesKg.includes(p)}
                  onClick={() => setSettings({ platesKg: settings.platesKg.includes(p) ? settings.platesKg.filter((x) => x !== p) : [...settings.platesKg, p].sort((a, b) => b - a) })}
                >
                  {String(p).replace('.', ',')}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <h2>
        <Watch size={16} className="ico" /> Reloj y sensores
      </h2>
      <DevicesPanel />

      <h2>
        <Bot size={16} className="ico" /> Inteligencia artificial
      </h2>
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
          <button className="outline" onClick={() => (setAi(cfg), setTest('Guardado'))}>
            Guardar
          </button>
          <button className="outline" onClick={testAi}>
            Probar conexión
          </button>
        </div>
        {test && <p className={testBad ? 'small error' : 'small'}>{test}</p>}
      </div>

      <h2>
        <Film size={16} className="ico" /> GIFs de ejercicios
      </h2>
      <ExdbSettings />

      <h2>
        <Save size={16} className="ico" /> Datos
      </h2>
      <div className="card">
        <p className="small muted">
          {data.workouts.length} entrenamientos · {data.routines.length} rutinas · {data.exercises.length} ejercicios · {data.measurements.length} medidas. Todo se guarda en este dispositivo: exporta
          backups a menudo.
        </p>
        <button
          className="primary full"
          onClick={() => downloadFile(`workstation-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2))}
        >
          Exportar backup (JSON)
        </button>
        <button className="outline full" onClick={exportCsv}>
          Exportar entrenamientos (CSV)
        </button>
        <button
          className="outline full"
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
          Importar backup (JSON)
        </button>
        <button
          className="outline full"
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
          Importar CSV de Hevy
        </button>
        <p className="small muted">El CSV usa el formato de Hevy. El backup JSON también vale para el fichero del MCP. En Hevy: Perfil → Ajustes → Exportar e importar datos → Exportar entrenamientos.</p>
        <button
          className="danger full"
          onClick={async () => {
            const synced = cloud.signedIn() ? ' Tienes la sincronización activa: se borrarán también de la nube y de tus otros dispositivos.' : '';
            if (!confirm(`¿Borrar TODOS los datos? Se guardará antes una copia automática en este dispositivo.${synced}`) || !confirm('¿Seguro?')) return;
            await snapshot(data, 'antes de borrar');
            replace(emptyData());
          }}
        >
          Borrar todos los datos
        </button>
      </div>
      <AutoBackups />

      <h2>
        <Cloud size={16} className="ico" /> Servidor de sincronización
      </h2>
      <CloudSettings />

      <h2>
        <Plug size={16} className="ico" /> Acceso para IA (MCP)
      </h2>
      <ApiKeys />

      <div className="card">
        <b>MCP local, sin cuenta</b>
        <p className="small muted">
          Para que Claude Desktop, Cursor, LM Studio u otro cliente MCP lea y edite tus entrenamientos, usa el servidor <code>mcp/</code> del repositorio. Trabaja sobre un fichero JSON con el mismo
          formato que el backup: exporta aquí, guárdalo en la ruta de <code>WORKSTATION_DATA</code> y vuelve a importarlo cuando la IA cree rutinas o registre entrenos.
        </p>
      </div>

      <h2>
        <Info size={16} className="ico" /> Acerca de
      </h2>
      <p className="small muted">Workstation · app personal de entrenamiento. Imágenes e instrucciones de ejercicios: free-exercise-db (dominio público).</p>
      <div className="lines">
        <button className="line" onClick={() => setNotes(true)}>
          <Sparkles size={20} className="tile-ico" />
          <span className="grow">Novedades</span>
          <ChevronRight size={16} className="muted" />
        </button>
        <button className="line" onClick={() => window.dispatchEvent(new Event('ws:show-tour'))}>
          <Compass size={20} className="tile-ico" />
          <span className="grow">Ver tour de nuevo</span>
          <ChevronRight size={16} className="muted" />
        </button>
        <a className="line" href="https://github.com/adriarroyo08/WorkStation/blob/main/PRIVACY.md" target="_blank" rel="noreferrer">
          <ShieldCheck size={20} className="tile-ico" />
          <span className="grow">Privacidad</span>
          <ExternalLink size={16} className="muted" />
        </a>
      </div>
      <p className="app-version">
        Workstation v{APP_VERSION} · {__APP_COMMIT__}
      </p>
      {notes && <AllReleasesSheet onClose={() => setNotes(false)} />}
    </section>
  );
}
