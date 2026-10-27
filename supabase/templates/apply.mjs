// Aplica a tu proyecto de Supabase: SMTP de Gmail, plantillas con la marca, política de contraseñas y los secrets
// de la función `welcome`. Las claves se leen del entorno y van directas a la API de Supabase (no se guardan en ningún sitio).
//
//   SUPABASE_ACCESS_TOKEN=sbp_…  GMAIL_USER=tu@gmail.com  GMAIL_APP_PASSWORD=xxxx…  node supabase/templates/apply.mjs
//
// SUPABASE_ACCESS_TOKEN: supabase.com → Account → Access Tokens. GMAIL_APP_PASSWORD: Cuenta de Google → Seguridad →
// Contraseñas de aplicaciones (requiere verificación en dos pasos). PROJECT_REF por defecto: el de Workstation.
import { readFileSync } from 'node:fs';

const { SUPABASE_ACCESS_TOKEN: token, GMAIL_USER: user, PROJECT_REF: ref = 'gogaykvgwopkqevarnjo' } = process.env;
const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, ''); // Google la muestra en grupos de 4
if (!token || !user || !pass) {
  console.error('Faltan SUPABASE_ACCESS_TOKEN, GMAIL_USER o GMAIL_APP_PASSWORD');
  process.exit(1);
}
const tpl = (n) => readFileSync(new URL(`./${n}.html`, import.meta.url), 'utf8');
const api = async (method, path, body) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${await r.text()}`);
};

await api('PATCH', '/config/auth', {
  smtp_host: 'smtp.gmail.com',
  smtp_port: '465',
  smtp_user: user,
  smtp_pass: pass,
  smtp_admin_email: user,
  smtp_sender_name: 'Workstation',
  mailer_subjects_confirmation: 'Confirma tu email en Workstation',
  mailer_templates_confirmation_content: tpl('confirmation'),
  mailer_subjects_recovery: 'Restablece tu contraseña de Workstation',
  mailer_templates_recovery_content: tpl('recovery'),
  mailer_subjects_email_change: 'Confirma tu nuevo email en Workstation',
  mailer_templates_email_change_content: tpl('email_change'),
  mailer_subjects_magic_link: 'Tu enlace para entrar en Workstation',
  mailer_templates_magic_link_content: tpl('magic_link'),
  // La misma política que pide la app al crear cuenta (shared/password.ts).
  password_min_length: 8,
  password_required_characters: 'abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789',
});
console.log('✓ Auth: SMTP de Gmail, plantillas y política de contraseñas');

await api('POST', '/secrets', [
  { name: 'GMAIL_USER', value: user },
  { name: 'GMAIL_APP_PASSWORD', value: pass },
]);
console.log('✓ Secrets de la función welcome');
