// Entrada de la Supabase Edge Function "mcp" (MCP remoto por HTTP).
// Se empaqueta en supabase/functions/mcp/index.ts con `npm run build:edge`.
import { cloudSource } from '../../shared/cloud-source';
import { handleMcp } from '../../shared/mcp-http';

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (req: Request) => Response | Promise<Response>): void };

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve((req) => handleMcp(req, (apiKey) => cloudSource({ url, anonKey, apiKey, env: (n) => Deno.env.get(n) })));
