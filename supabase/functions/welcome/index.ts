// Email de bienvenida. La llama el trigger de 012_welcome_secret.sql con { user_id } al confirmarse una cuenta.
// Envía por SMTP (secrets SMTP_HOST, SMTP_USER, SMTP_PASS y MAIL_FROM; por defecto el relay de Brevo). Se despliega con --no-verify-jwt:
// se autentica con el secret WELCOME_SECRET, que debe valer lo mismo que `welcome_secret` en Vault. La lógica está en handler.ts.
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { createWelcomeHandler } from './handler.ts';

const env = (k: string) => Deno.env.get(k)!;

Deno.serve(
  createWelcomeHandler({
    secret: Deno.env.get('WELCOME_SECRET'),
    supabaseUrl: env('SUPABASE_URL'),
    serviceKey: env('SUPABASE_SERVICE_ROLE_KEY'),
    send: async (to, html) => {
      const smtp = new SMTPClient({
        connection: { hostname: Deno.env.get('SMTP_HOST') ?? 'smtp-relay.brevo.com', port: 465, tls: true, auth: { username: env('SMTP_USER'), password: env('SMTP_PASS') } },
      });
      try {
        await smtp.send({ from: `Workstation <${env('MAIL_FROM')}>`, to, subject: '¡Bienvenido a Workstation!', html });
      } finally {
        await smtp.close().catch(() => {});
      }
    },
  }),
);
