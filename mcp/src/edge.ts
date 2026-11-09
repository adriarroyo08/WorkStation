// Entrada de la Supabase Edge Function "mcp" (MCP remoto por HTTP).
// Se empaqueta en supabase/functions/mcp/index.ts con `npm run build:edge`.
import { cloudSource } from '../../shared/cloud-source';
import { handleMcp } from '../../shared/mcp-http';
import { createNewsCollector, handleNews, supabaseNewsStore } from '../../shared/news-collector';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
  resolveDns(host: string, type: 'A' | 'AAAA'): Promise<string[]>;
};

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const collectNews = createNewsCollector(
  fetch,
  async (host) => {
    const results = await Promise.allSettled([Deno.resolveDns(host, 'A'), Deno.resolveDns(host, 'AAAA')]);
    return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  },
  Date.now,
  serviceKey ? supabaseNewsStore({ url, serviceKey }) : undefined,
);

Deno.serve((req) => (new URL(req.url).pathname.endsWith('/mcp/news') ? handleNews(req, collectNews) : handleMcp(req, (apiKey) => cloudSource({ url, anonKey, apiKey, env: (n) => Deno.env.get(n) }))));
