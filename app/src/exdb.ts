// GIFs de ExerciseDB: configuración (solo en el dispositivo), caché de la lista y de los GIFs.
import { get, set } from 'idb-keyval';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { DEFAULT_EXDB, fetchExdbGif, fetchExdbList, type ExdbConfig, type ExdbExercise } from '../../shared/exercisedb';

let config: ExdbConfig = DEFAULT_EXDB;
const subs = new Set<() => void>();
get<ExdbConfig>('exdb').then((c) => {
  if (c) {
    config = { ...DEFAULT_EXDB, ...c };
    subs.forEach((f) => f());
  }
});

export const exdb = {
  get: () => config,
  set(c: Partial<ExdbConfig>) {
    config = { ...config, ...c };
    set('exdb', config);
    subs.forEach((f) => f());
  },
};

export const useExdbConfig = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => config,
  );

// Lista completa (≈1.300 ejercicios): una sola petición, guardada en IndexedDB.
export async function loadExdbList(refresh = false): Promise<ExdbExercise[]> {
  if (!refresh) {
    const cached = await get<ExdbExercise[]>('exdb-list');
    if (cached?.length) return cached;
  }
  const list = await fetchExdbList(config);
  await set('exdb-list', list);
  return list;
}

// ---- GIFs: Cache Storage (o IndexedDB si no existe) + cola de 3 descargas simultáneas ----
const urls = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
const queue: (() => void)[] = [];
let running = 0;
const runQueued = <T>(job: () => Promise<T>) =>
  new Promise<T>((resolve, reject) => {
    const start = () => {
      running++;
      job()
        .then(resolve, reject)
        .finally(() => {
          running--;
          queue.shift()?.();
        });
    };
    if (running < 3) start();
    else queue.push(start);
  });

const cacheKey = (id: string, res: number) => `https://exdb.local/${res}/${id}.gif`;

async function readCached(key: string): Promise<Blob | undefined> {
  if ('caches' in self) {
    const r = await (await caches.open('exdb-gifs')).match(key);
    return r ? r.blob() : undefined;
  }
  return get<Blob>(key);
}

async function writeCached(key: string, blob: Blob) {
  if ('caches' in self) await (await caches.open('exdb-gifs')).put(key, new Response(blob, { headers: { 'content-type': 'image/gif' } }));
  else await set(key, blob);
}

export function gifUrl(id: string, cachedOnly = false): Promise<string> {
  const c = config;
  const key = cacheKey(id, c.resolution);
  const hit = urls.get(key);
  if (hit) return Promise.resolve(hit);
  const inflight = pending.get(key);
  if (inflight) return inflight;
  if (cachedOnly)
    return readCached(key).then((b) => {
      if (!b) throw new Error('No está en caché');
      const url = URL.createObjectURL(b);
      urls.set(key, url);
      return url;
    });
  const p = (async () => {
    let blob = await readCached(key);
    if (!blob) {
      if (cachedOnly) throw new Error('No está en caché');
      if (!c.key) throw new Error('Sin API key de ExerciseDB');
      blob = await runQueued(() => fetchExdbGif(c, id));
      await writeCached(key, blob);
    }
    const url = URL.createObjectURL(blob);
    urls.set(key, url);
    return url;
  })();
  pending.set(key, p);
  p.finally(() => pending.delete(key)).catch(() => {});
  return p;
}

// URL del GIF (o null mientras carga / si no hay key / si falla).
export function useExdbGif(id?: string, cachedOnly = false): string | null {
  const c = useExdbConfig();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!id || !c.key) return;
    let alive = true;
    gifUrl(id, cachedOnly).then(
      (u) => alive && setUrl(u),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [id, c.key, c.resolution, cachedOnly]);
  return url;
}

export async function clearGifCache() {
  urls.forEach((u) => URL.revokeObjectURL(u));
  urls.clear();
  if ('caches' in self) await caches.delete('exdb-gifs');
}
