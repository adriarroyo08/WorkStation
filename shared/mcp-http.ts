// Servidor MCP remoto (Streamable HTTP, sin estado) como manejador Request → Response.
// Sirve en Supabase Edge Functions (Deno) y en Node. La API key llega en
// `Authorization: Bearer ws_…`, en `x-api-key` o en la URL (`?key=ws_…`, para clientes que solo aceptan una URL).
import { ARTICLE_RESOURCE, readArticleResource } from './article-resource';
import { RateLimitError } from './cloud-source';
import { callTool, MCP_INSTRUCTIONS, TOOLS, toolAnnotations, toolJsonSchema, type DataSource } from './mcp-tools';

const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER = { name: 'workstation', version: '0.7.0' };
// Máximo de mensajes en una petición agrupada (batch): cada llamada a herramienta gasta cuota de la API key igualmente.
export const MAX_BATCH = 20;
// Tope del cuerpo de una petición: se comprueba antes de parsear, porque cualquier valor de clave llega hasta aquí.
export const MAX_BODY_BYTES = 1_000_000;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, x-api-key, mcp-session-id, mcp-protocol-version',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
  'access-control-expose-headers': 'retry-after',
};

interface RpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

const reply = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json', ...extra } });
const rpcError = (id: RpcRequest['id'], code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

export function apiKeyFrom(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ') && auth.slice(7).startsWith('ws_')) return auth.slice(7).trim();
  const header = req.headers.get('x-api-key');
  if (header) return header.trim();
  return new URL(req.url).searchParams.get('key');
}

async function readLimited(req: Request, max: number): Promise<string | undefined> {
  if (Number(req.headers.get('content-length')) > max) return undefined;
  const reader = req.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let text = '';
  let bytes = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return text + decoder.decode();
      bytes += value.byteLength;
      if (bytes > max) return undefined;
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

export async function handleMcp(req: Request, sourceFor: (apiKey: string) => DataSource): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method === 'GET') return reply({ name: SERVER.name, version: SERVER.version, transport: 'streamable-http', tools: TOOLS.map((t) => t.name) });
  if (req.method !== 'POST') return reply(rpcError(null, -32600, 'Método HTTP no soportado'), 405);

  const key = apiKeyFrom(req);
  if (!key) return reply(rpcError(null, -32001, 'Falta la API key de Workstation (Authorization: Bearer ws_…)'), 401);

  const raw = await readLimited(req, MAX_BODY_BYTES);
  if (raw === undefined) return reply(rpcError(null, -32600, `Petición demasiado grande (máximo ${MAX_BODY_BYTES} bytes)`), 413);
  let body: RpcRequest | RpcRequest[];
  try {
    body = JSON.parse(raw);
  } catch {
    return reply(rpcError(null, -32700, 'JSON no válido'), 400);
  }
  if (Array.isArray(body) && body.length > MAX_BATCH) return reply(rpcError(null, -32600, `Demasiados mensajes en una petición (máximo ${MAX_BATCH})`), 400);
  // Si la base de datos corta por cuota (429), no se sigue llamando y se responde 429 con Retry-After.
  const state: { limited?: RateLimitError } = {};
  const watch = <T>(p: Promise<T>) =>
    p.catch((e: unknown) => {
      if (e instanceof RateLimitError) state.limited = e;
      throw e;
    });
  const base = sourceFor(key);
  const src: DataSource = { ...base, load: () => watch(base.load()), save: (d) => watch(base.save(d)) };
  const done = (out: unknown) =>
    state.limited
      ? reply(out ?? rpcError(null, -32029, state.limited.message), 429, { 'retry-after': String(state.limited.retryAfter) })
      : out
        ? reply(out)
        : new Response(null, { status: 202, headers: CORS });
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
            capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
            serverInfo: SERVER,
            instructions: MCP_INSTRUCTIONS,
          },
        };
      }
      case 'ping':
        return { jsonrpc: '2.0', id: m.id, result: {} };
      case 'resources/list':
        return { jsonrpc: '2.0', id: m.id, result: { resources: [ARTICLE_RESOURCE] } };
      case 'resources/read': {
        const uri = String(m.params?.uri ?? '');
        if (uri !== ARTICLE_RESOURCE.uri) return rpcError(m.id, -32002, 'Recurso desconocido');
        return { jsonrpc: '2.0', id: m.id, result: readArticleResource(uri) };
      }
      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id: m.id,
          result: { tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: toolJsonSchema(t), annotations: toolAnnotations(t) })) },
        };
      case 'tools/call': {
        if (state.limited) return rpcError(m.id, -32029, state.limited.message);
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
    return done(out.length ? out : null);
  }
  if (body === null || typeof body !== 'object') return reply(rpcError(null, -32600, 'Petición JSON-RPC no válida'), 400);
  return done(await handle(body));
}
