import { Copy, KeyRound, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { cloud, useCloud } from '../cloud';
import { toast } from '../toast';

interface KeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scope: 'read' | 'write';
  created_at: string;
  last_used_at: string | null;
}

// Key aleatoria de 256 bits: ws_ + base64url. En el servidor solo se guarda su SHA-256.
function newKey(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return (
    'ws_' +
    btoa(String.fromCharCode(...b))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  );
}
async function sha256Hex(s: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.show('Copiado'));

export default function ApiKeys() {
  const st = useCloud();
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [name, setName] = useState('Claude');
  const [scope, setScope] = useState<'read' | 'write'>('read');
  const [created, setCreated] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const client = cloud.client();
  const url = cloud.config().url;

  const refresh = useCallback(async () => {
    if (!client) return;
    const { data, error } = await client.from('api_keys').select('id,name,key_prefix,scope,created_at,last_used_at').order('created_at', { ascending: false });
    // Un error sin mensaje (p. ej. 404 sin cuerpo) no debe romper la pantalla.
    const msg = error?.message ?? (error ? 'No se pudieron cargar las API keys' : '');
    if (error) setErr(msg.includes('api_keys') || error.code === '42P01' || error.code === 'PGRST205' ? 'Falta ejecutar supabase/migrations/002_api_keys.sql en tu proyecto.' : msg);
    else setKeys(Array.isArray(data) ? (data as KeyRow[]) : []);
  }, [client]);

  useEffect(() => {
    if (st.email) refresh();
  }, [st.email, refresh]);

  if (!st.email)
    return (
      <div className="card small muted">
        <KeyRound size={16} className="tile-ico inline" /> Inicia sesión en tu cuenta (arriba) para generar una API key y conectar una IA a tus datos por MCP.
      </div>
    );

  const create = async () => {
    setErr('');
    const key = newKey();
    const { error } = await client!.from('api_keys').insert({ name: name.trim() || 'IA', key_hash: await sha256Hex(key), key_prefix: key.slice(0, 10), scope });
    if (error) return setErr(error.message);
    setCreated(key);
    refresh();
  };

  const remoteUrl = `${url}/functions/v1/mcp`;
  const localCfg = (k: string) =>
    JSON.stringify(
      {
        mcpServers: {
          workstation: {
            command: 'node',
            args: ['/RUTA/A/WorkStation/mcp/dist/index.js'],
            env: { WORKSTATION_API_KEY: k, WORKSTATION_SUPABASE_URL: url, WORKSTATION_SUPABASE_ANON_KEY: cloud.config().anonKey },
          },
        },
      },
      null,
      2,
    );

  return (
    <div className="card">
      <p className="small muted">
        Genera una API key para que una IA (Claude, ChatGPT, Cursor…) lea tus entrenamientos por MCP. Solo se guarda su huella (hash): cópiala al crearla, no se puede volver a ver.
      </p>
      <div className="row">
        <input className="grow" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre (p. ej. Claude)" />
        <select className="inline" value={scope} onChange={(e) => setScope(e.target.value as 'read' | 'write')}>
          <option value="read">Solo lectura</option>
          <option value="write">Lectura y escritura</option>
        </select>
      </div>
      <button className="primary full icon-btn" onClick={create}>
        <KeyRound size={18} /> Generar API key
      </button>
      {err && <p className="error small">{err}</p>}

      {created && (
        <div className="card new-key">
          <b>Tu nueva API key</b>
          <p className="small muted">Cópiala ahora: no se volverá a mostrar.</p>
          <div className="row">
            <code className="grow key-text">{created}</code>
            <button className="ghost icon-btn" onClick={() => copy(created)} aria-label="Copiar key">
              <Copy size={16} />
            </button>
          </div>
          <h3>Conectar</h3>
          <p className="small">
            <b>MCP remoto</b> (Claude Code, conectores personalizados, clientes HTTP). URL del servidor:
          </p>
          <div className="row">
            <code className="grow key-text">{remoteUrl}</code>
            <button className="ghost icon-btn" onClick={() => copy(remoteUrl)} aria-label="Copiar URL">
              <Copy size={16} />
            </button>
          </div>
          <p className="small muted">
            Envía la key en la cabecera <code>Authorization: Bearer {created.slice(0, 8)}…</code>. Si tu cliente solo admite una URL, usa la URL con la key al final:
          </p>
          <div className="row">
            <code className="grow key-text">{`${remoteUrl}?key=${created.slice(0, 8)}…`}</code>
            <button className="ghost icon-btn" onClick={() => copy(`${remoteUrl}?key=${created}`)} aria-label="Copiar URL con key">
              <Copy size={16} />
            </button>
          </div>
          <p className="small muted">
            Claude Code: <code>claude mcp add --transport http workstation {remoteUrl} --header "Authorization: Bearer …"</code>
          </p>
          <p className="small">
            <b>MCP local</b> (Claude Desktop): añade esto a <code>claude_desktop_config.json</code>.
          </p>
          <pre className="code small">{localCfg(created)}</pre>
          <button className="ghost small icon-btn" onClick={() => copy(localCfg(created))}>
            <Copy size={14} /> Copiar configuración
          </button>
          <button className="ghost small" onClick={() => setCreated(null)}>
            Ya la he guardado
          </button>
        </div>
      )}

      {keys.length > 0 && <h3>Keys activas</h3>}
      {keys.map((k) => (
        <div key={k.id} className="row key-row">
          <div className="grow">
            <b>{k.name}</b> <span className="pill">{k.scope === 'write' ? 'lectura y escritura' : 'solo lectura'}</span>
            <div className="small muted">
              {k.key_prefix}… · creada {new Date(k.created_at).toLocaleDateString('es-ES')} · {k.last_used_at ? `último uso ${new Date(k.last_used_at).toLocaleString('es-ES')}` : 'sin usar'}
            </div>
          </div>
          <button
            className="ghost danger icon-btn"
            aria-label={`Revocar ${k.name}`}
            onClick={async () => {
              if (!confirm(`¿Revocar la key "${k.name}"? Dejará de funcionar al instante.`)) return;
              const { error } = await client!.from('api_keys').delete().eq('id', k.id);
              if (error) setErr(error.message);
              else {
                toast.show('Key revocada');
                refresh();
              }
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
