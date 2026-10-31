import { Copy, KeyRound, Mail, Share2, Sparkles, Trash2 } from 'lucide-react';
import { ask } from '../dialog';
import { useCallback, useEffect, useState } from 'react';
import { cloud, useCloud } from '../cloud';
import { isNative, native } from '../native';
import { toast } from '../toast';

interface KeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scope: 'read' | 'write';
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

const copy = (t: string, msg = 'Copiado') => navigator.clipboard.writeText(t).then(() => toast.show(msg));
const CLAUDE_CONNECTORS = 'https://claude.ai/settings/connectors';
const keyText = (key: string, url: string) =>
  `API key de Workstation:
${key}

Conector MCP (URL para Claude → Conectores → Añadir conector personalizado):
${url}?key=${key}

No la compartas: da acceso a tus entrenos.`;
// En el APK el WebView manda los enlaces externos (https, mailto) a su app; en la web, Claude en otra pestaña.
const openExternal = (u: string) => (isNative() || u.startsWith('mailto:') ? void (location.href = u) : void window.open(u, '_blank', 'noopener'));
// Android: menú de compartir nativo; web: Web Share o, si no hay, copiar.
const share = (text: string) => {
  if (native.shareText('API key de Workstation', text)) return;
  if (navigator.share) return void navigator.share({ title: 'API key de Workstation', text }).catch(() => {});
  copy(text);
};

export default function ApiKeys() {
  const st = useCloud();
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [name, setName] = useState('Claude');
  const [scope, setScope] = useState<'read' | 'write'>('read');
  const [expiry, setExpiry] = useState('');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const client = cloud.client();
  const url = cloud.config().url;

  const refresh = useCallback(async () => {
    if (!client) return;
    const { data, error } = await client.from('api_keys').select('id,name,key_prefix,scope,created_at,last_used_at,expires_at').order('created_at', { ascending: false });
    // Un error sin mensaje (p. ej. 404 sin cuerpo) no debe romper la pantalla.
    const msg = error?.message ?? (error ? 'No se pudieron cargar las API keys' : '');
    if (error)
      setErr(
        msg.includes('expires_at')
          ? 'Falta ejecutar supabase/migrations/006_api_key_expiry.sql en tu proyecto.'
          : msg.includes('api_keys') || error.code === '42P01' || error.code === 'PGRST205'
            ? 'Falta ejecutar supabase/migrations/002_api_keys.sql en tu proyecto.'
            : msg,
      );
    else setKeys(Array.isArray(data) ? (data as KeyRow[]) : []);
  }, [client]);

  useEffect(() => {
    if (st.email) refresh();
  }, [st.email, refresh]);

  if (!st.email)
    return (
      <div className="card small muted">
        <KeyRound size={16} className="tile-ico inline" /> Inicia sesión en Perfil para generar una API key y conectar una IA a tus datos por MCP.
      </div>
    );

  const create = async () => {
    setErr('');
    let key: string;
    try {
      key = await cloud.createApiKey(name.trim() || 'IA', scope, hasExpiry ? expiry : null);
    } catch (e) {
      return setErr((e as Error).message);
    }
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
        <input aria-label="Nombre de la API key" className="grow" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre (p. ej. Claude)" />
        <select aria-label="Permisos de la API key" className="inline" value={scope} onChange={(e) => setScope(e.target.value as 'read' | 'write')}>
          <option value="read">Solo lectura</option>
          <option value="write">Lectura y escritura</option>
        </select>
      </div>
      <label>
        Caducidad
        <select aria-label="Caducidad" value={hasExpiry ? 'date' : 'none'} onChange={(e) => setHasExpiry(e.target.value === 'date')}>
          <option value="none">Sin caducidad</option>
          <option value="date">Elegir fecha</option>
        </select>
      </label>
      {hasExpiry && (
        <label>
          Fecha de caducidad (hora local)
          <input type="datetime-local" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </label>
      )}
      <button className="primary full icon-btn" onClick={create}>
        <KeyRound size={18} /> Generar API key
      </button>
      {err && (
        <p role="alert" className="error small">
          {err}
        </p>
      )}

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
          <div className="key-actions">
            <button
              className="outline icon-btn"
              onClick={async () => {
                await copy(`${remoteUrl}?key=${created}`, 'URL copiada: pégala en Claude → Añadir conector personalizado');
                openExternal(CLAUDE_CONNECTORS);
              }}
            >
              <Sparkles size={16} /> Añadir a Claude
            </button>
            <button
              className="outline icon-btn"
              onClick={() => openExternal(`mailto:${st.email}?subject=${encodeURIComponent('Tu API key de Workstation')}&body=${encodeURIComponent(keyText(created, remoteUrl))}`)}
            >
              <Mail size={16} /> Enviar a mi email
            </button>
            <button className="outline icon-btn" onClick={() => share(keyText(created, remoteUrl))}>
              <Share2 size={16} /> Compartir
            </button>
          </div>
          <p className="small muted">Quien tenga la key puede {scope === 'write' ? 'leer y cambiar' : 'leer'} tus entrenos: mándala solo a ti y revócala si se filtra.</p>
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

      {keys.length > 0 && <h3>API keys</h3>}
      {keys.map((k) => (
        <div key={k.id} className="row key-row">
          <div className="grow">
            <b>{k.name}</b> <span className="pill">{k.scope === 'write' ? 'lectura y escritura' : 'solo lectura'}</span>
            <div className="small muted">
              {k.expires_at ? `${new Date(k.expires_at).getTime() <= Date.now() ? 'Caducada desde' : 'Caduca'} ${new Date(k.expires_at).toLocaleString('es-ES')}` : 'Sin caducidad'} · {k.key_prefix}… ·
              creada {new Date(k.created_at).toLocaleDateString('es-ES')} · {k.last_used_at ? `último uso ${new Date(k.last_used_at).toLocaleString('es-ES')}` : 'sin usar'}
            </div>
          </div>
          <button
            className="ghost danger icon-btn"
            aria-label={`Revocar ${k.name}`}
            onClick={async () => {
              if (!(await ask.confirm(`¿Revocar la key "${k.name}"? Dejará de funcionar al instante.`, { ok: 'Revocar', danger: true }))) return;
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
