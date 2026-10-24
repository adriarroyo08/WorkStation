// Origen de datos "nube": lee y escribe tus registros de Supabase usando tu API key personal (ws_…).
// Funciona en Node, Deno (Supabase Edge Functions) y navegador: solo usa fetch.
import { emptyData } from './data';
import type { DataSource } from './mcp-tools';
import { applyRemote, diff, snapshot, type SyncRecord } from './sync';
import type { WorkstationData } from './types';

export interface CloudSourceOptions {
  url: string; // https://xxxx.supabase.co
  anonKey: string;
  apiKey: string; // ws_…
  fetch?: typeof fetch;
  env?: (name: string) => string | undefined;
}

export function cloudSource(o: CloudSourceOptions): DataSource {
  const f = o.fetch ?? fetch;
  let base: Map<string, string> | null = null;
  const rpc = async (fn: string, body: unknown) => {
    const res = await f(`${o.url.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: o.anonKey, authorization: `Bearer ${o.anonKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      let msg = text;
      try {
        msg = (JSON.parse(text) as { message?: string }).message ?? text;
      } catch {
        /* texto plano */
      }
      throw new Error(`Workstation cloud: ${msg}`);
    }
    return text ? JSON.parse(text) : null;
  };
  return {
    label: 'tu cuenta de Workstation (Supabase)',
    env: o.env,
    async load(): Promise<WorkstationData> {
      // La API devuelve como mucho 1000 filas por llamada: se pide por páginas desde el último updated_at.
      const rows: SyncRecord[] = [];
      for (let since: string | undefined; ;) {
        const page = ((await rpc('api_records', since ? { p_key: o.apiKey, p_since: since } : { p_key: o.apiKey })) ?? []) as SyncRecord[];
        rows.push(...page);
        if (page.length < 1000 || !page.at(-1)?.updated_at) break;
        since = page.at(-1)!.updated_at;
      }
      const data = applyRemote(emptyData(), rows).data;
      base = snapshot(data);
      return data;
    },
    async save(data: WorkstationData) {
      if (!base) throw new Error('save() sin load() previo');
      const changes = diff(base, data);
      if (!changes.length) return;
      await rpc('api_upsert', { p_key: o.apiKey, p_rows: changes.map(({ collection, id, doc, deleted, client_updated_at }) => ({ collection, id, doc, deleted, client_updated_at })) });
      base = snapshot(data);
    },
  };
}
