// Cuenta y sincronización con Supabase (opcional). Sin configurar, la app funciona igual que siempre: todo local.
// - Cola de cambios pendientes (sobrevive a recargas y a estar sin conexión).
// - Descarga incremental por `updated_at` y aviso en tiempo real desde otros dispositivos.
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { get, set } from 'idb-keyval';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { applyRemote, diff, estimateClockOffset, initialUpload, recordKey, snapshot, type SyncRecord } from '../../shared/sync';
import type { WorkstationData } from '../../shared/types';
import { useStore } from './store';
import { emptyData } from '../../shared/data';
import { snapshot as snapshotBackup } from './backups';
import { isNative, native } from './native';
import { makeNonce } from '../../shared/nonce';

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
  /** Llegó el enlace de "recuperar contraseña": toca elegir una nueva. */
  recovery: boolean;
  /** Sesión llegada por el enlace de confirmación del email (solo en la web). */
  justConfirmed: boolean;
  /** El enlace del email llegó con error (caducado, ya usado). */
  linkError: string | null;
}

const ENV: CloudConfig = { url: import.meta.env.VITE_SUPABASE_URL ?? '', anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '' };

let cfg: CloudConfig = ENV;
// Supabase deja los tokens en el hash del enlace del email (#access_token=…&type=signup|recovery) y supabase-js lo consume al crear el cliente.
const authHash = typeof location === 'undefined' ? '' : /[#&](access_token|error)=/.test(location.hash) ? location.hash : '';
const hashType = new URLSearchParams(authHash.slice(1)).get('type');
/** ¿La página se abrió desde un enlace de email de Supabase? (el tour no debe taparlo) */
export const openedFromAuthLink = !!authHash;
let state: CloudState = {
  configured: !!(ENV.url && ENV.anonKey),
  email: null,
  status: 'off',
  pending: 0,
  lastSync: null,
  error: null,
  recovery: hashType === 'recovery',
  // Solo los enlaces de email llevan `type`; al volver de Google (OAuth) la sesión entra directa, sin pantalla de "cuenta confirmada".
  justConfirmed: /[#&]access_token=/.test(authHash) && !!hashType && hashType !== 'recovery',
  linkError: /[#&]error=/.test(authHash) ? 'El enlace ha caducado o ya se usó. Vuelve a pedirlo desde la app.' : null,
};
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
/** Arranque en curso: las acciones de cuenta lo esperan (si no, un envío muy rápido vería el cliente aún sin crear). */
let ready: Promise<unknown> = Promise.resolve();
let channel: RealtimeChannel | null = null;
let userId: string | null = null;
/** Mientras el diálogo de cambio de cuenta está abierto, nada se sube: iría a la cuenta nueva. */
let switching = false;
let pending = new Map<string, SyncRecord>();
let cursor = '1970-01-01T00:00:00Z';
// Desfase del reloj local respecto al servidor (ms) y subidas recientes con las que medirlo.
let clockOffset = 0;
const inflight = new Map<string, { client_updated_at: string; sentAt: number; receivedAt: number }>();
/** Hora "del servidor" para fechar los cambios locales. */
const serverNow = () => new Date(Date.now() + clockOffset).toISOString();
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
  clockOffset = (await get<number>('cloud-clock-offset')) ?? 0;
  emit({ configured: !!(cfg.url && cfg.anonKey), pending: pending.size });
  client = await makeClient();
  if (!client) return emit({ status: 'off' });
  client.auth.onAuthStateChange((e, session) => {
    if (e === 'PASSWORD_RECOVERY') emit({ recovery: true });
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

// La interfaz registra aquí su diálogo; sin él, se suben también los datos del dispositivo.
let askSwitch: (email: string | null) => Promise<'fresh' | 'merge'> = async () => 'merge';
export const setAccountSwitchPrompt = (fn: typeof askSwitch) => void (askSwitch = fn);

const PUBLIC_URL = 'https://adriarroyo08.github.io/WorkStation/';
/** Dónde abren los enlaces de los emails: en el APK la web publicada; en la web, esta misma (BASE_URL puede ser relativa). */
const redirectUrl = () => (isNative() ? PUBLIC_URL : new URL(import.meta.env.BASE_URL, location.origin + location.pathname).href);

const ES: [RegExp, string][] = [
  [/invalid login credentials/i, 'Email o contraseña incorrectos.'],
  [/email not confirmed/i, 'Aún no has confirmado tu email. Revisa tu bandeja de entrada.'],
  [/already registered|already been registered/i, 'Ya existe una cuenta con ese email. Inicia sesión.'],
  [/password should be|weak password|at least \d+ char/i, 'La contraseña es demasiado débil: usa al menos 6 caracteres.'],
  [/different from the old/i, 'La nueva contraseña debe ser distinta de la anterior.'],
  [/rate limit|only request this after|too many/i, 'Demasiados intentos. Espera un momento y vuelve a probar.'],
  [/invalid email|unable to validate email/i, 'Ese email no parece válido.'],
  [/auth session missing/i, 'El enlace ha caducado. Vuelve a pedirlo desde la app.'],
  [/expired|invalid.*(token|otp|link)|otp/i, 'El enlace o el código ha caducado. Vuelve a pedirlo desde la app.'],
  [/signups? not allowed|signup.*disabled/i, 'Ahora mismo no se pueden crear cuentas nuevas.'],
  [/provider is not enabled|unsupported provider/i, 'Este método de inicio de sesión no está activado.'],
  [/user not found/i, 'No hay ninguna cuenta con ese email.'],
  [/failed to fetch|network ?error|networkerror|load failed/i, 'Sin conexión con el servidor. Revisa tu conexión.'],
];
// Supabase responde en inglés: lo traducimos y, si no lo reconocemos, damos un mensaje genérico en español.
const friendly = (m: string) => {
  const es = ES.find(([re]) => re.test(m))?.[1];
  if (!es) console.warn('Error de cuenta sin traducir:', m);
  return new Error(es ?? 'No se ha podido completar. Inténtalo de nuevo en un momento.');
};

async function onSignedIn(uid: string, email: string | null) {
  emit({ email, status: 'syncing', error: null });
  // Otra cuenta en este dispositivo: no mezclar sus datos con los de la anterior sin preguntar.
  switching = true;
  try {
    const last = await get<string>('cloud-last-user');
    if (last && last !== uid && (await askSwitch(email)) === 'fresh') {
      await snapshotBackup(getData(), 'antes de cambiar de cuenta');
      pending.clear();
      await savePending();
      applyData(emptyData());
    }
  } finally {
    switching = false;
  }
  await set('cloud-last-user', uid);
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
  // Se relee una pequeña ventana anterior al cursor: una transacción que empezó antes puede confirmarse después
  // de que otra haya movido el cursor. Aplicar dos veces la misma fila no cambia nada (gana la más reciente).
  let from = new Date(Math.max(0, Date.parse(cursor) - 60_000)).toISOString();
  for (;;) {
    const { data, error } = await client.from('records').select('*').gt('updated_at', from).order('updated_at', { ascending: true }).limit(1000);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as SyncRecord[];
    if (!rows.length) break;
    rows.forEach((r) => seen.add(recordKey(r.collection, r.id)));
    const pendingTs = new Map([...pending].map(([k, r]) => [k, r.client_updated_at]));
    const res = applyRemote(getData(), rows, pendingTs);
    if (res.changed) applyData(res.data);
    // Si en la nube hay una versión igual o más nueva que un cambio pendiente, ese cambio ya no debe subirse.
    let dropped = false;
    for (const r of rows) {
      const k = recordKey(r.collection, r.id);
      const p = pending.get(k);
      if (p && Date.parse(p.client_updated_at) <= Date.parse(r.client_updated_at)) dropped = pending.delete(k) || dropped;
    }
    if (dropped) await savePending();
    // Filas que acabamos de subir: su updated_at (hora del servidor) permite medir el desfase del reloj.
    const samples = rows.flatMap((r) => {
      const f = inflight.get(recordKey(r.collection, r.id));
      return f && r.updated_at && f.client_updated_at === r.client_updated_at ? [{ serverAt: r.updated_at, sentAt: f.sentAt, receivedAt: f.receivedAt }] : [];
    });
    const off = estimateClockOffset(samples);
    if (off !== undefined) {
      clockOffset = Math.abs(off) < 2000 ? 0 : off; // por debajo de 2 s es solo latencia
      inflight.clear();
      await set('cloud-clock-offset', clockOffset);
    }
    from = rows[rows.length - 1].updated_at ?? from;
    if (Date.parse(from) > Date.parse(cursor)) cursor = from;
    await set(`cloud-cursor:${userId}`, cursor);
    if (rows.length < 1000) break;
  }
  emit({ lastSync: new Date().toISOString() });
  return seen;
}

async function flush() {
  if (switching || !client || !userId) return;
  if (!navigator.onLine) return emit({ status: 'offline', pending: pending.size });
  emit({ status: 'syncing' });
  try {
    const batch = [...pending.values()];
    for (let i = 0; i < batch.length; i += 200) {
      const chunk = batch.slice(i, i + 200);
      const sentAt = Date.now();
      const { error } = await client.from('records').upsert(
        chunk.map((r) => ({ collection: r.collection, id: r.id, doc: r.doc, deleted: r.deleted, client_updated_at: r.client_updated_at })),
        { onConflict: 'user_id,collection,id' },
      );
      if (error) throw new Error(error.message);
      const receivedAt = Date.now();
      for (const r of chunk.slice(0, 20)) inflight.set(recordKey(r.collection, r.id), { client_updated_at: r.client_updated_at, sentAt, receivedAt });
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
    await ready;
    if (!client) throw new Error('Configura primero la URL y la anon key');
    const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: redirectUrl() } });
    if (error) throw friendly(error.message);
    // Con la confirmación activada, un email ya registrado no da error: devuelve un usuario sin identidades.
    if (data.user && !data.user.identities?.length) throw friendly('User already registered');
    return data.session ? 'ok' : 'confirm';
  },
  async signIn(email: string, password: string) {
    await ready;
    if (!client) throw new Error('Configura primero la URL y la anon key');
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw friendly(error.message);
  },
  async resetPassword(email: string) {
    await ready;
    if (!client) throw new Error('Configura primero la URL y la anon key');
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() });
    if (error) throw friendly(error.message);
  },
  async updatePassword(password: string) {
    await ready;
    if (!client) throw new Error('Configura primero la URL y la anon key');
    const { error } = await client.auth.updateUser({ password });
    if (error) throw friendly(error.message);
  },
  /** Hay cliente OAuth Web configurado y la app va conectada al Supabase del build (el proveedor Google se configura allí). */
  googleAvailable: () => !!import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID && cloud.builtIn(),
  /** Android: Credential Manager → id_token → Supabase (entra por onSignedIn, como el email). Web: redirección OAuth. Cancelar no es error. */
  async signInWithGoogle() {
    await ready;
    if (!client) throw new Error('Configura primero la URL y la anon key');
    if (isNative()) {
      const { raw, hashed } = await makeNonce();
      let token: string | null;
      try {
        token = await native.googleSignIn(import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID!, hashed);
      } catch (e) {
        throw friendly((e as Error).message);
      }
      if (!token) return;
      const { error } = await client.auth.signInWithIdToken({ provider: 'google', token, nonce: raw });
      if (error) throw friendly(error.message);
    } else {
      const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl() } });
      if (error) throw friendly(error.message);
    }
  },
  /** Cierra las pantallas de "cuenta confirmada" / "nueva contraseña". */
  dismissLanding: () => emit({ recovery: false, justConfirmed: false, linkError: null }),
  /** ¿La configuración activa es la del build (no una propia del usuario)? */
  builtIn: () => !!ENV.url && cfg.url === ENV.url && cfg.anonKey === ENV.anonKey,
  async signOut() {
    await client?.auth.signOut();
  },
  syncNow: () => flush(),
  /** ¿Hay sesión iniciada? (los cambios locales se replican en los demás dispositivos) */
  signedIn: () => !!userId,
  client: () => client,
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
    ready = setup().catch((e) => emit({ status: 'error', error: String(e) }));
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
    const changes = diff(prev.current, d, serverNow());
    prev.current = snapshot(d);
    if (!changes.length || !state.configured) return;
    for (const r of changes) pending.set(recordKey(r.collection, r.id), r);
    emit({ pending: pending.size });
    savePending();
    schedule(flush, 1500);
  }, [store.data]);
}
