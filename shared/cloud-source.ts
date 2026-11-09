// Origen de datos "nube": lee y escribe tus registros de Supabase usando tu API key personal (ws_…).
// Funciona en Node, Deno (Supabase Edge Functions) y navegador: solo usa fetch.
import { emptyData } from './data';
import type { DataSource } from './mcp-tools';
import { applyRemote, diff, snapshot, type SyncRecord } from './sync';
import type { WorkstationData } from './types';

// La API key ha superado su cuota (429 de la base de datos, ver supabase/migrations/008). retryAfter en segundos.
export class RateLimitError extends Error {
  constructor(
    message: string,
    readonly retryAfter: number,
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

const UPSERT_CHUNK = 500;

export interface CloudSourceOptions {
  url: string; // https://xxxx.supabase.co
  anonKey: string;
  apiKey: string; // ws_…
  fetch?: typeof fetch;
  env?: (name: string) => string | undefined;
}

export interface CloudSource extends DataSource {
  /** Indica si la clave existe y no ha caducado, sin leer datos ni gastar cuota. Lanza si no se ha podido comprobar. */
  verifyKey(): Promise<boolean>;
}

export function cloudSource(o: CloudSourceOptions): CloudSource {
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
      if (res.status === 429) throw new RateLimitError(`Workstation cloud: ${msg}`, Math.max(1, Number(res.headers.get('retry-after')) || 60));
      throw new Error(`Workstation cloud: ${msg}`);
    }
    return text ? JSON.parse(text) : null;
  };
  return {
    label: 'tu cuenta de Workstation (Supabase)',
    env: o.env,
    verifyKey: async () => (await rpc('api_key_check', { p_key: o.apiKey })) === true,
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
      // api_upsert admite un número limitado de filas por llamada (migración 009); una importación puede superarlo.
      // Si falla a medias, base no cambia y el siguiente guardado reenvía todo: repetir una fila no altera nada.
      for (let i = 0; i < changes.length; i += UPSERT_CHUNK) {
        const p_rows = changes.slice(i, i + UPSERT_CHUNK).map(({ collection, id, doc, deleted, client_updated_at }) => ({ collection, id, doc, deleted, client_updated_at }));
        await rpc('api_upsert', { p_key: o.apiKey, p_rows });
      }
      base = snapshot(data);
    },
  };
}
