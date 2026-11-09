// Lógica de la función `welcome`, sin dependencias de Deno para poder probarla (supabase/welcome.test.ts).
// Está junto a la función y no en shared/ porque `welcome` se despliega tal cual, sin el empaquetado que usa `mcp`.
import { WELCOME_HTML } from './template.ts';

export const SECRET_HEADER = 'x-welcome-secret';

export interface WelcomeDeps {
  /** Valor esperado en SECRET_HEADER. Sin configurar, se rechaza toda petición. */
  secret: string | undefined;
  supabaseUrl: string;
  serviceKey: string;
  send: (to: string, html: string) => Promise<void>;
  fetch?: typeof globalThis.fetch;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const sha256 = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

// Compara resúmenes de longitud fija recorriéndolos enteros: el tiempo no depende de dónde difieran.
async function sameSecret(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// Una misma respuesta para todo lo que no sea un fallo de envío: el resultado concreto no sale de la función.
const ok = () => new Response('ok');

export function createWelcomeHandler({ secret, supabaseUrl, serviceKey, send, fetch: http = globalThis.fetch }: WelcomeDeps) {
  const admin = { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json' };

  return async (req: Request): Promise<Response> => {
    const given = req.headers.get(SECRET_HEADER);
    if (!secret || !given || !(await sameSecret(given, secret))) return new Response('no autorizado', { status: 401 });

    const { user_id } = await req.json().catch(() => ({}));
    if (typeof user_id !== 'string' || !/^[0-9a-f-]{36}$/.test(user_id)) return new Response('petición no válida', { status: 400 });

    const r = await http(`${supabaseUrl}/auth/v1/admin/users/${user_id}`, { headers: admin });
    if (!r.ok) return ok();
    const user = await r.json();
    if (!user.email || !user.email_confirmed_at) return ok();

    // Reserva el envío: si la fila ya existía, ya se mandó.
    const ins = await http(`${supabaseUrl}/rest/v1/welcome_sent?on_conflict=user_id`, {
      method: 'POST',
      headers: { ...admin, prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({ user_id }),
    });
    if (!ins.ok || !(await ins.json()).length) return ok();

    const meta = user.user_metadata ?? {};
    const full: string = meta.full_name ?? meta.name ?? '';
    const name = full.split(' ')[0] || user.email.split('@')[0];
    try {
      await send(user.email, WELCOME_HTML.replaceAll('{{name}}', esc(name)));
    } catch (e) {
      console.error('welcome: fallo al enviar', e); // solo en los registros de la función
      // Libera la reserva para poder reintentarlo.
      await http(`${supabaseUrl}/rest/v1/welcome_sent?user_id=eq.${user_id}`, { method: 'DELETE', headers: admin });
      return new Response('no se pudo enviar', { status: 502 });
    }
    return ok();
  };
}
