// Nonce para Google: Google recibe el hash y Supabase comprueba el valor original dentro del id_token.
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

export async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = hex(crypto.getRandomValues(new Uint8Array(32)));
  const hashed = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))));
  return { raw, hashed };
}
