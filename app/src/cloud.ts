// Cuenta y sincronización con Supabase (opcional). Sin configurar, la app funciona igual que siempre: todo local.
// - Cola de cambios pendientes (sobrevive a recargas y a estar sin conexión).
// - Descarga incremental por `updated_at` y aviso en tiempo real desde otros dispositivos.
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { get, set } from 'idb-keyval';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { applyRemote, diff, initialUpload, recordKey, snapshot, type SyncRecord } from '../../shared/sync';
import type { WorkstationData } from '../../shared/types';
import { useStore } from './store';

export interface CloudConfig {
  url: string;
  anonKey: string;
}

export interface CloudState {
  configured: boolean;
  email: string | null;
  status: 'off' | 'signed-out' | 'syncing' | 'idle' | 'offline' | 'error';
  pending: number;
  lastSync: string | null;
  error: string | null;
}

const ENV: CloudConfig = { url: import.meta.env.VITE_SUPABASE_URL ?? '', anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '' };

let cfg: CloudConfig = ENV;
let state: CloudState = { configured: !!(ENV.url && ENV.anonKey), email: null, status: 'off', pending: 0, lastSync: null, error: null };
const subs = new Set<() => void>();
const emit = (p: Partial<CloudState>) => {
  state = { ...state, ...p };
  subs.forEach((f) => f());
};
export const useCloud = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => state,
  );

let client: SupabaseClient | null = null;
let channel: RealtimeChannel | null = null;
let userId: string | null = null;
let pending = new Map<string, SyncRecord>();
let cursor = '1970-01-01T00:00:00Z';
let getData: () => WorkstationData = () => {
  throw new Error('store no listo');
};
let applyData: (d: WorkstationData) => void = () => {};

const savePending = () => set('cloud-pending', [...pending.values()]);

async function makeClient(): Promise<SupabaseClient | null> {
  if (!cfg.url || !cfg.anonKey) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'ws-auth' } });
}

async function setup() {
  const stored = await get<CloudConfig>('cloud-config');
  if (stored?.url && stored.anonKey) cfg = stored;
  pending = new Map(((await get<SyncRecord[]>('cloud-pending')) ?? []).map((r) => [recordKey(r.collection, r.id), r]));
  emit({ configured: !!(cfg.url && cfg.anonKey), pending: pending.size });
  client = await makeClient();
  if (!client) return emit({ status: 'off' });
  client.auth.onAuthStateChange((_e, session) => {
    const uid = session?.user.id ?? null;
    if (uid === userId) return;
    userId = uid;
    if (uid) onSignedIn(uid, session!.user.email ?? null);
    else {
      channel?.unsubscribe();
      channel = null;
      emit({ email: null, status: 'signed-out' });
    }
  });
  const { data } = await client.auth.getSession();
  if (!data.session) emit({ status: 'signed-out' });
}

async function onSignedIn(uid: string, email: string | null) {
  emit({ email, status: 'syncing', error: null });
  cursor = (await get<string>(`cloud-cursor:${uid}`)) ?? '1970-01-01T00:00:00Z';
  const firstTime = !(await get<boolean>(`cloud-init:${uid}`));
  try {
    const remoteKeys = await pull();
    if (firstTime) {
      // Primera vez en este dispositivo: sube lo que solo existe aquí.
      for (const r of initialUpload(getData(), remoteKeys)) if (!pending.has(recordKey(r.collection, r.id))) pending.set(recordKey(r.collection, r.id), r);
      await set(`cloud-init:${uid}`, true);
    }
    await flush();
  } catch (e) {
    emit({ status: 'error', error: (e as Error).message });
  }
  channel?.unsubscribe();
  channel = client!
    .channel(`records-${uid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'records', filter: `user_id=eq.${uid}` }, () => schedule(pullOnly, 400))
    .subscribe();
}

// Descarga lo nuevo desde el último cursor y lo aplica. Devuelve las claves remotas vistas.
async function pull(): Promise<Set<string>> {
  const seen = new Set<string>();
  if (!client || !userId) return seen;
  for (;;) {
    const { data, error } = await client.from('records').select('*').gt('updated_at', cursor).order('updated_at', { ascending: true }).limit(1000);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as SyncRecord[];
    if (!rows.length) break;
    rows.forEach((r) => seen.add(recordKey(r.collection, r.id)));
    const pendingTs = new Map([...pending].map(([k, r]) => [k, r.client_updated_at]));
    const res = applyRemote(getData(), rows, pendingTs);
    if (res.changed) applyData(res.data);
    cursor = rows[rows.length - 1].updated_at ?? cursor;
    await set(`cloud-cursor:${userId}`, cursor);
    if (rows.length < 1000) break;
  }
  emit({ lastSync: new Date().toISOString() });
  return seen;
}

async function flush() {
  if (!client || !userId) return;
  if (!navigator.onLine) return emit({ status: 'offline', pending: pending.size });
  emit({ status: 'syncing' });
  try {
    const batch = [...pending.values()];
    for (let i = 0; i < batch.length; i += 200) {
      const chunk = batch.slice(i, i + 200);
      const { error } = await client.from('records').upsert(
        chunk.map((r) => ({ collection: r.collection, id: r.id, doc: r.doc, deleted: r.deleted, client_updated_at: r.client_updated_at })),
        { onConflict: 'user_id,collection,id' },
      );
      if (error) throw new Error(error.message);
      // Solo se quitan si no han vuelto a cambiar mientras subían.
      for (const r of chunk) {
        const k = recordKey(r.collection, r.id);
        if (pending.get(k) === r) pending.delete(k);
      }
      await savePending();
    }
    await pull();
    emit({ status: 'idle', pending: pending.size, error: null });
  } catch (e) {
    emit({ status: 'error', pending: pending.size, error: (e as Error).message });
  }
}

const pullOnly = async () => {
  try {
    await pull();
  } catch (e) {
    emit({ status: 'error', error: (e as Error).message });
  }
};

const timers = new Map<() => Promise<void>, ReturnType<typeof setTimeout>>();
function schedule(fn: () => Promise<void>, ms: number) {
  clearTimeout(timers.get(fn));
  timers.set(fn, setTimeout(fn, ms));
}

// ---- API para la interfaz ----
export const cloud = {
  config: () => cfg,
  async configure(c: CloudConfig) {
    cfg = { url: c.url.trim().replace(/\/$/, ''), anonKey: c.anonKey.trim() };
    await set('cloud-config', cfg);
    channel?.unsubscribe();
    userId = null;
    await setup();
  },
  async signUp(email: string, password: string) {
    if (!client) throw new Error('Configura primero la URL y la anon key');
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return data.session ? 'ok' : 'confirm';
  },
  async signIn(email: string, password: string) {
    if (!client) throw new Error('Configura primero la URL y la anon key');
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  },
  async signOut() {
    await client?.auth.signOut();
  },
  syncNow: () => flush(),
};

// Engancha el store: cada cambio local se encola; los cambios remotos se aplican sin volver a subirse.
export function useCloudSync() {
  const store = useStore();
  const prev = useRef<Map<string, string> | null>(null);
  const applied = useRef<WorkstationData | null>(null);
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    getData = () => storeRef.current.data;
    applyData = (d) => {
      applied.current = d;
      storeRef.current.replace(d);
    };
    setup().catch((e) => emit({ status: 'error', error: String(e) }));
    const online = () => schedule(flush, 200);
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, []);

  useEffect(() => {
    const d = store.data;
    if (!prev.current || applied.current === d) {
      prev.current = snapshot(d);
      applied.current = null;
      return;
    }
    const changes = diff(prev.current, d);
    prev.current = snapshot(d);
    if (!changes.length || !state.configured) return;
    for (const r of changes) pending.set(recordKey(r.collection, r.id), r);
    emit({ pending: pending.size });
    savePending();
    schedule(flush, 1500);
  }, [store.data]);
}
