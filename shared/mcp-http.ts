// Servidor MCP remoto (Streamable HTTP, sin estado) como manejador Request → Response.
// Sirve en Supabase Edge Functions (Deno) y en Node. La API key llega en
// `Authorization: Bearer ws_…`, en `x-api-key` o en la URL (`?key=ws_…`, para clientes que solo aceptan una URL).
import { callTool, TOOLS, toolJsonSchema, type DataSource } from './mcp-tools';

const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER = { name: 'workstation', version: '0.4.0' };

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, x-api-key, mcp-session-id, mcp-protocol-version',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
};

interface RpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

const reply = (body: unknown, status = 200) => new Response(body === null ? null : JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
const rpcError = (id: RpcRequest['id'], code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

export function apiKeyFrom(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ') && auth.slice(7).startsWith('ws_')) return auth.slice(7).trim();
  const header = req.headers.get('x-api-key');
  if (header) return header.trim();
  return new URL(req.url).searchParams.get('key');
}

export async function handleMcp(req: Request, sourceFor: (apiKey: string) => DataSource): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method === 'GET') return reply({ name: SERVER.name, version: SERVER.version, transport: 'streamable-http', tools: TOOLS.map((t) => t.name) });
  if (req.method !== 'POST') return reply(rpcError(null, -32600, 'Método HTTP no soportado'), 405);

  const key = apiKeyFrom(req);
  if (!key) return reply(rpcError(null, -32001, 'Falta la API key de Workstation (Authorization: Bearer ws_…)'), 401);

  let body: RpcRequest | RpcRequest[];
  try {
    body = await req.json();
  } catch {
    return reply(rpcError(null, -32700, 'JSON no válido'), 400);
  }
  const src = sourceFor(key);
  const handle = async (m: RpcRequest) => {
    if (!m || typeof m !== 'object' || Array.isArray(m)) return rpcError(null, -32600, 'Petición JSON-RPC no válida');
    if (m.id === undefined) return null; // notificación (p. ej. notifications/initialized)
    switch (m.method) {
      case 'initialize': {
        const asked = String(m.params?.protocolVersion ?? '');
        return {
          jsonrpc: '2.0',
          id: m.id,
          result: {
            protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
            capabilities: { tools: { listChanged: false } },
            serverInfo: SERVER,
            instructions: 'Datos de entrenamiento del usuario en Workstation. Empieza por training_summary.',
          },
        };
      }
      case 'ping':
        return { jsonrpc: '2.0', id: m.id, result: {} };
      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id: m.id,
          result: { tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: toolJsonSchema(t), annotations: { readOnlyHint: !t.write } })) },
        };
      case 'tools/call': {
        const r = await callTool(src, String(m.params?.name ?? ''), m.params?.arguments ?? {});
        return { jsonrpc: '2.0', id: m.id, result: { content: [{ type: 'text', text: r.text }], isError: !!r.isError } };
      }
      default:
        return rpcError(m.id, -32601, `Método no soportado: ${m.method}`);
    }
  };
  if (Array.isArray(body)) {
    // En orden, una detrás de otra: dos escrituras a la vez partirían del mismo estado y se pisarían.
    const out: unknown[] = [];
    for (const m of body) {
      const r = await handle(m);
      if (r) out.push(r);
    }
    return out.length ? reply(out) : new Response(null, { status: 202, headers: CORS });
  }
  if (body === null || typeof body !== 'object') return reply(rpcError(null, -32600, 'Petición JSON-RPC no válida'), 400);
  const out = await handle(body);
  return out ? reply(out) : new Response(null, { status: 202, headers: CORS });
}
