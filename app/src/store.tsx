import { get, set } from 'idb-keyval';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AiConfig } from '../../shared/ai';
import { AI_PROVIDERS } from '../../shared/ai';
import { emptyData, normalizeData } from '../../shared/data';
import type { Workout, WorkstationData } from '../../shared/types';

// Todo se guarda en el navegador (IndexedDB). Nada sale del dispositivo salvo las llamadas a la IA que tú configures.
interface Store {
  data: WorkstationData;
  active: Workout | null;
  ai: AiConfig;
  update: (fn: (d: WorkstationData) => void) => void;
  replace: (d: WorkstationData) => void;
  setActive: (w: Workout | null | ((w: Workout) => Workout)) => void;
  setAi: (c: AiConfig) => void;
}

const Ctx = createContext<Store | null>(null);

const defaultAi = (): AiConfig => ({ providerId: 'gemini', baseUrl: AI_PROVIDERS[0].baseUrl, model: AI_PROVIDERS[0].defaultModel, apiKey: '' });

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ data: WorkstationData; active: Workout | null; ai: AiConfig } | null>(null);

  useEffect(() => {
    Promise.all([get('data'), get('active'), get('ai')]).then(([d, a, ai]) =>
      setState({ data: d ? normalizeData(d) : emptyData(), active: a ?? null, ai: ai ?? defaultAi() }),
    );
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

  if (!state) return <div className="center muted">Cargando…</div>;
  return <Ctx.Provider value={{ ...state, update, replace, setActive, setAi }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fuera de StoreProvider');
  return s;
}

export function downloadFile(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
