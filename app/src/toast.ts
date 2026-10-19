// Avisos breves con acción opcional ("Deshacer").
import { useSyncExternalStore } from 'react';

export interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

let current: Toast | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const toast = {
  show(text: string, action?: Toast['action'], ms = 4000) {
    current = { id: Date.now(), text, action };
    clearTimeout(timer);
    timer = setTimeout(() => ((current = null), emit()), ms);
    emit();
  },
  undo(text: string, run: () => void) {
    toast.show(text, { label: 'Deshacer', run }, 6000);
  },
  dismiss() {
    current = null;
    emit();
  },
};

export const useToast = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => current,
  );
