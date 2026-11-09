// Borra la cuenta de quien la llama. La usa el botón "Borrar cuenta" de Perfil.
// Se despliega con: supabase functions deploy delete-account --no-verify-jwt
// No usa la verificación JWT de la pasarela porque comprueba la sesión contra Auth (handler.ts). No necesita secretos propios.
import { deleteAccountHandler } from './handler.ts';

Deno.serve(
  deleteAccountHandler({
    url: Deno.env.get('SUPABASE_URL')!,
    anonKey: Deno.env.get('SUPABASE_ANON_KEY')!,
    serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  }),
);
