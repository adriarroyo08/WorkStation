// Integración con ExerciseDB (RapidAPI): GIFs animados de 1.300+ ejercicios.
// Cada usuario usa su propia API key; los GIFs no se redistribuyen en el repo, solo se cachean en su dispositivo.
import type { Exercise } from './types';

export interface ExdbExercise {
  id: string;
  name: string;
  bodyPart?: string;
  equipment?: string;
  target?: string;
  secondaryMuscles?: string[];
  instructions?: string[];
}

export interface ExdbConfig {
  key: string;
  host: string; // p. ej. exercisedb.p.rapidapi.com
  resolution: 180 | 360 | 720 | 1080;
}

export const DEFAULT_EXDB: ExdbConfig = { key: '', host: 'exercisedb.p.rapidapi.com', resolution: 180 };

const headers = (c: ExdbConfig) => ({ 'x-rapidapi-key': c.key, 'x-rapidapi-host': c.host });

export async function fetchExdbList(c: ExdbConfig): Promise<ExdbExercise[]> {
  const res = await fetch(`https://${c.host}/exercises?limit=0&offset=0`, { headers: headers(c) });
  if (!res.ok) throw new Error(`ExerciseDB ${res.status}: ${(await res.text()).slice(0, 200)}`);
  let list = (await res.json()) as ExdbExercise[];
  // Algunos planes ignoran limit=0 y devuelven solo 10: paginamos.
  if (list.length <= 10) {
    list = [];
    for (let offset = 0; offset < 3000; offset += 200) {
      const r = await fetch(`https://${c.host}/exercises?limit=200&offset=${offset}`, { headers: headers(c) });
      if (!r.ok) throw new Error(`ExerciseDB ${r.status}`);
      const page = (await r.json()) as ExdbExercise[];
      list.push(...page);
      if (page.length < 200) break;
    }
  }
  return list.map(({ id, name, bodyPart, equipment, target, secondaryMuscles, instructions }) => ({ id, name, bodyPart, equipment, target, secondaryMuscles, instructions }));
}

export async function fetchExdbGif(c: ExdbConfig, id: string): Promise<Blob> {
  const res = await fetch(`https://${c.host}/image?exerciseId=${encodeURIComponent(id)}&resolution=${c.resolution}`, { headers: headers(c) });
  if (!res.ok) throw new Error(`ExerciseDB GIF ${res.status}`);
  return res.blob();
}

// ---- Emparejado por nombre ----

const STOP = new Set(['the', 'a', 'with', 'on', 'of', 'and', 'to', 'medium', 'grip', 'version', 'v', 'variation', 'exercise']);
const SYN: Record<string, string> = {
  dumbbells: 'dumbbell',
  db: 'dumbbell',
  barbells: 'barbell',
  bb: 'barbell',
  machine: 'lever',
  leverage: 'lever',
  pullups: 'pull',
  pullup: 'pull',
  chinup: 'chin',
  pushups: 'push',
  pushup: 'push',
  situp: 'sit',
  crunches: 'crunch',
  curls: 'curl',
  raises: 'raise',
  flyes: 'fly',
  flye: 'fly',
  flys: 'fly',
  rows: 'row',
  lunges: 'lunge',
  squats: 'squat',
  dips: 'dip',
  extensions: 'extension',
  pulldowns: 'pulldown',
  pushdowns: 'pushdown',
  shrugs: 'shrug',
  stationary: 'stationary',
  skullcrusher: 'skull',
  crusher: 'skull',
};

export function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((t) => SYN[t] ?? t)
    .filter((t) => !STOP.has(t));
}

// Nombre en inglés del ejercicio: el id del catálogo libre ("Barbell_Bench_Press_-_Medium_Grip") o su nombre.
export function englishName(e: Exercise): string {
  return (e.media ?? e.name).replace(/_/g, ' ');
}

export function matchScore(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = new Set([...ta, ...tb]).size;
  // Penaliza nombres muy largos de ExerciseDB ("... with twist on bench").
  return inter / union;
}

export function bestMatch(e: Exercise, list: ExdbExercise[]): { item: ExdbExercise; score: number } | null {
  const name = englishName(e);
  let best: { item: ExdbExercise; score: number } | null = null;
  for (const item of list) {
    const s = matchScore(name, item.name);
    if (!best || s > best.score || (s === best.score && item.name.length < best.item.name.length)) best = { item, score: s };
  }
  return best && best.score >= 0.4 ? best : null;
}

export function searchExdb(list: ExdbExercise[], q: string, limit = 30): ExdbExercise[] {
  const t = q.trim();
  if (!t) return list.slice(0, limit);
  return list
    .map((item) => ({ item, s: matchScore(t, item.name) + (item.name.includes(t.toLowerCase()) ? 0.5 : 0) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.item.name.length - b.item.name.length)
    .slice(0, limit)
    .map((x) => x.item);
}

// Vincula automáticamente los ejercicios sin GIF asignado. Devuelve cuántos se enlazaron.
export function autoLink(exercises: Exercise[], list: ExdbExercise[]): number {
  let n = 0;
  for (const e of exercises) {
    if (e.exdbId) continue;
    const m = bestMatch(e, list);
    if (m) {
      e.exdbId = m.item.id;
      n++;
    }
  }
  return n;
}
