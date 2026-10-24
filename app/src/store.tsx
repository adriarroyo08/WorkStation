import { del, get, set } from 'idb-keyval';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AiConfig } from '../../shared/ai';
import { AI_PROVIDERS } from '../../shared/ai';
import { emptyData, normalizeData } from '../../shared/data';
import type { Settings, Workout, WorkstationData } from '../../shared/types';
import { isNative, native } from './native';
import { dailySnapshot } from './backups';
import { setWeightUnit } from '../../shared/units';

// Todo se guarda en el navegador (IndexedDB). Nada sale del dispositivo salvo las llamadas a la IA que tú configures.
interface Store {
  data: WorkstationData;
  settings: Settings;
  active: Workout | null;
  ai: AiConfig;
  update: (fn: (d: WorkstationData) => void) => void;
  replace: (d: WorkstationData) => void;
  setActive: (w: Workout | null | ((w: Workout) => Workout)) => void;
  setAi: (c: AiConfig) => void;
  setSettings: (s: Partial<Settings>) => void;
}

const Ctx = createContext<Store | null>(null);

const defaultAi = (): AiConfig => ({ providerId: 'gemini', baseUrl: AI_PROVIDERS[0].baseUrl, model: AI_PROVIDERS[0].defaultModel, apiKey: '' });

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ data: WorkstationData; active: Workout | null; ai: AiConfig } | null>(null);

  useEffect(() => {
    Promise.all([get('data'), get('active'), get('ai')]).then(([d, a, ai]) => {
      const data = d ? normalizeData(d) : emptyData();
      set('data', data);
      setState({ data, active: a ?? null, ai: ai ?? defaultAi() });
      // Copia diaria tras arrancar, cuando el navegador esté libre.
      setTimeout(() => void dailySnapshot(data).catch(() => {}), 3000);
    });
    navigator.storage?.persist?.();
  }, []);

  const update = useCallback((fn: (d: WorkstationData) => void) => {
    setState((s) => {
      if (!s) return s;
      const d = structuredClone(s.data);
      fn(d);
      set('data', d);
      return { ...s, data: d };
    });
  }, []);

  const replace = useCallback((d: WorkstationData) => {
    set('data', d);
    setState((s) => (s ? { ...s, data: d } : s));
  }, []);

  const setActive = useCallback((w: Workout | null | ((w: Workout) => Workout)) => {
    setState((s) => {
      if (!s) return s;
      const next = typeof w === 'function' ? (s.active ? w(s.active) : null) : w;
      set('active', next);
      return { ...s, active: next };
    });
  }, []);

  const setAi = useCallback((ai: AiConfig) => {
    set('ai', ai);
    setState((s) => (s ? { ...s, ai } : s));
  }, []);

  const setSettings = useCallback((p: Partial<Settings>) => update((d) => void (d.settings = { ...d.settings, ...p })), [update]);

  const theme = state?.data.settings.theme;
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-anim');
    if (theme === 'auto') root.removeAttribute('data-theme');
    else if (theme) root.setAttribute('data-theme', theme);
    const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0c0a09' : '#fbf8f5');
    const t = setTimeout(() => root.classList.remove('theme-anim'), 400);
    return () => clearTimeout(t);
  }, [theme]);

  if (!state) return <div className="center muted">Cargando…</div>;
  // Unidad de peso activa para todo el árbol (se fija antes de renderizar a los hijos).
  setWeightUnit(state.data.settings.unit);
  return <Ctx.Provider value={{ ...state, settings: state.data.settings, update, replace, setActive, setAi, setSettings }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fuera de StoreProvider');
  return s;
}

// --- Fotos de progreso: blobs en IndexedDB (no van en el backup JSON) ---
export const savePhoto = (id: string, blob: Blob) => set(`photo:${id}`, blob);
export const loadPhoto = (id: string) => get<Blob>(`photo:${id}`);
export const deletePhoto = (id: string) => del(`photo:${id}`);

export async function compressImage(file: File, maxSide = 1280, quality = 0.8): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b!), 'image/jpeg', quality));
}

// --- Utilidades de UI ---
export function downloadFile(name: string, content: string | Blob, type = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  // En la app Android no hay descargas de blobs: se guarda/comparte con el selector del sistema.
  if (isNative()) return void native.saveFile(name, blob);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareOrDownload(blob: Blob, name: string, title: string) {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch {
      /* cancelado: descargamos */
    }
  }
  downloadFile(name, blob);
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const fmtShort = (iso: string | Date) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const fmtNum = (n: number) => Math.round(n).toLocaleString('es-ES');
// 1234 → 1,2k (para tarjetas estrechas)
export const fmtCompact = (n: number) => (Math.abs(n) >= 10000 ? `${(n / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })}k` : fmtNum(n));
export const clock = (sec: number) => `${Math.floor(Math.max(0, sec) / 60)}:${String(Math.max(0, Math.round(sec) % 60)).padStart(2, '0')}`;

export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

// Mantiene la pantalla encendida durante el entrenamiento.
export function useWakeLock(enabled: boolean) {
  const lock = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    const acquire = () =>
      navigator.wakeLock
        .request('screen')
        .then((l) => (lock.current = l))
        .catch(() => {});
    acquire();
    const onVis = () => document.visibilityState === 'visible' && acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      lock.current?.release().catch(() => {});
    };
  }, [enabled]);
}

let audio: AudioContext | null = null;
export function beep(times = 3) {
  try {
    audio ??= new AudioContext();
    for (let i = 0; i < times; i++) {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.frequency.value = i === times - 1 ? 1100 : 880;
      g.gain.setValueAtTime(0.25, audio.currentTime + i * 0.25);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + i * 0.25 + 0.2);
      o.connect(g).connect(audio.destination);
      o.start(audio.currentTime + i * 0.25);
      o.stop(audio.currentTime + i * 0.25 + 0.2);
    }
  } catch {
    /* sin audio */
  }
}
