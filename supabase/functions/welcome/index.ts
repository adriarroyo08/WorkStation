// Email de bienvenida. La llama el trigger de 005_welcome.sql con { user_id } al confirmarse una cuenta.
// Envía por SMTP de Gmail (secrets GMAIL_USER y GMAIL_APP_PASSWORD). Se despliega con --no-verify-jwt:
// no hace falta secreto porque solo actúa sobre cuentas confirmadas y una sola vez por usuario (tabla welcome_sent).
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { WELCOME_HTML } from './template.ts';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json' };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

Deno.serve(async (req) => {
  const { user_id } = await req.json().catch(() => ({}));
  if (typeof user_id !== 'string' || !/^[0-9a-f-]{36}$/.test(user_id)) return new Response('user_id', { status: 400 });

  const r = await fetch(`${URL_}/auth/v1/admin/users/${user_id}`, { headers: admin });
  if (!r.ok) return new Response('usuario', { status: 404 });
  const user = await r.json();
  if (!user.email || !user.email_confirmed_at) return new Response('sin confirmar', { status: 409 });

  // Reserva el envío: si la fila ya existía, ya se mandó.
  const ins = await fetch(`${URL_}/rest/v1/welcome_sent?on_conflict=user_id`, {
    method: 'POST',
    headers: { ...admin, prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ user_id }),
  });
  if (!ins.ok || !(await ins.json()).length) return new Response('ya enviado');

  const meta = user.user_metadata ?? {};
  const full: string = meta.full_name ?? meta.name ?? '';
  const name = full.split(' ')[0] || user.email.split('@')[0];
  const from = Deno.env.get('GMAIL_USER')!;
  const smtp = new SMTPClient({ connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: from, password: Deno.env.get('GMAIL_APP_PASSWORD')! } } });
  try {
    await smtp.send({ from: `Workstation <${from}>`, to: user.email, subject: '¡Bienvenido a Workstation!', html: WELCOME_HTML.replaceAll('{{name}}', esc(name)) });
  } catch (e) {
    // Libera la reserva para poder reintentarlo.
    await fetch(`${URL_}/rest/v1/welcome_sent?user_id=eq.${user_id}`, { method: 'DELETE', headers: admin });
    return new Response(String(e), { status: 502 });
  } finally {
    await smtp.close().catch(() => {});
  }
  return new Response('enviado');
});
