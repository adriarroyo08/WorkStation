import { test as base, expect, type Page } from '@playwright/test';

// Falla el test si la página lanza errores de JavaScript.
export const test = base.extend<{ errors: string[] }>({
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // Una violación de la CSP no lanza excepción: se detecta en la consola.
    page.on('console', (m) => m.type() === 'error' && /Content Security Policy/i.test(m.text()) && errors.push(m.text()));
    await use(errors);
    expect(errors).toEqual([]);
  },
});
export { expect };

const hoursAgo = (n: number) => new Date(Date.now() - n * 3600e3).toISOString();
const sets = (n: number, weight: number, reps: number) => Array.from({ length: n }, () => ({ type: 'normal', weight, reps, done: true }));
const routine = (id: string, name: string, exercises: string[]) => ({
  id,
  name,
  folderId: 'f',
  exercises: exercises.map((exerciseId) => ({ exerciseId, restSec: 90, sets: [{ type: 'normal', reps: 8 }] })),
});

// Historial de ejemplo: programa Torso/Pierna con tres sesiones.
export const SAMPLE = {
  version: 1,
  exercises: [],
  measurements: [{ id: 'm1', date: hoursAgo(300), bodyweight: 80 }],
  settings: {},
  folders: [{ id: 'f', name: 'Torso / Pierna' }],
  routines: [routine('ta', 'Torso A', ['press-banca', 'remo-barra']), routine('pa', 'Pierna A', ['sentadilla', 'curl-femoral'])],
  workouts: [
    { id: 'w0', name: 'Torso A', routineId: 'ta', startedAt: hoursAgo(170), endedAt: hoursAgo(169), exercises: [{ exerciseId: 'press-banca', sets: sets(3, 75, 8) }] },
    { id: 'w1', name: 'Pierna A', routineId: 'pa', startedAt: hoursAgo(50), endedAt: hoursAgo(49), exercises: [{ exerciseId: 'sentadilla', sets: sets(5, 100, 5) }] },
    { id: 'w2', name: 'Torso A', routineId: 'ta', startedAt: hoursAgo(21), endedAt: hoursAgo(20), exercises: [{ exerciseId: 'press-banca', sets: sets(4, 80, 8) }] },
  ],
};

// Guarda datos en IndexedDB (idb-keyval) y recarga la app.
export async function seed(page: Page, data: unknown) {
  await page.goto('/');
  await page.evaluate(
    (d) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('keyval-store');
        open.onupgradeneeded = () => open.result.createObjectStore('keyval');
        open.onsuccess = () => {
          const tx = open.result.transaction('keyval', 'readwrite');
          tx.objectStore('keyval').put(d, 'data');
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    data,
  );
  await page.reload();
}

export const tab = (page: Page, name: string) => page.locator('nav.tabs button', { hasText: name });
