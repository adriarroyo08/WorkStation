// Lógica de la función delete-account, sin dependencias de Deno para poder probarla con Vitest (supabase/delete-account.test.ts).
export interface DeleteAccountConfig {
  url: string;
  anonKey: string;
  serviceKey: string;
  fetch?: typeof fetch;
}

// La sesión viaja en la cabecera Authorization, nunca en cookies: permitir cualquier origen no da acceso sin el token.
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });

export function deleteAccountHandler({ url, anonKey, serviceKey, fetch: http = fetch }: DeleteAccountConfig) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
    const token = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization') ?? '')?.[1];
    if (!token) return reply(401, { error: 'session_required' });
    try {
      // El usuario sale siempre de la sesión validada por Auth; el cuerpo de la petición no se lee.
      const session = await http(`${url}/auth/v1/user`, { headers: { apikey: anonKey, authorization: `Bearer ${token}` } });
      if (session.status >= 500) return reply(502, { error: 'auth_unavailable' });
      if (!session.ok) return reply(401, { error: 'session_required' });
      const { id } = (await session.json()) as { id?: unknown };
      if (typeof id !== 'string' || !UUID.test(id)) return reply(401, { error: 'session_required' });
      // Las filas del usuario caen en cascada con auth.users. Un 404 es que ya estaba borrado.
      const removed = await http(`${url}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } });
      if (!removed.ok && removed.status !== 404) return reply(502, { error: 'delete_failed' });
      return reply(200, { deleted: true });
    } catch {
      return reply(502, { error: 'auth_unavailable' });
    }
  };
}
