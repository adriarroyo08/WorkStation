// Genera app/public/catalog.json a partir de free-exercise-db (Unlicense / dominio público) y de wger (CC BY-SA 4.0).
// Uso: node scripts/build-catalog.mjs [ruta-local-a-exercises.json] [ruta-local-a-wger-exerciseinfo.json]
// De wger solo entran los ejercicios marcados como nuevos en scripts/wger-map.json (los repetidos se descartan).
import { readFileSync, writeFileSync } from 'node:fs';
import { wgerSteps } from '../shared/wger.ts';

const SRC = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const MUSCLE = {
  chest: 'pecho',
  lats: 'dorsales',
  'middle back': 'espalda',
  'lower back': 'lumbar',
  traps: 'trapecio',
  neck: 'cuello',
  shoulders: 'hombros',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'antebrazo',
  quadriceps: 'cuadriceps',
  hamstrings: 'isquios',
  glutes: 'gluteos',
  calves: 'gemelos',
  abdominals: 'core',
  abductors: 'abductores',
  adductors: 'aductores',
};
const EQUIP = {
  barbell: 'barra',
  dumbbell: 'mancuernas',
  machine: 'máquina',
  cable: 'polea',
  'body only': 'peso corporal',
  kettlebells: 'kettlebell',
  bands: 'bandas',
  'e-z curl bar': 'barra',
  'medicine ball': 'balón medicinal',
  'exercise ball': 'fitball',
  'foam roll': 'rodillo de espuma',
  other: 'otro',
};
const LEVEL = { beginner: 'principiante', intermediate: 'intermedio', expert: 'avanzado' };
const CAT = {
  strength: 'fuerza',
  stretching: 'estiramiento',
  plyometrics: 'pliometría',
  powerlifting: 'powerlifting',
  'olympic weightlifting': 'halterofilia',
  strongman: 'strongman',
  cardio: 'cardio',
};

// Instrucciones traducidas al español (id → pasos). Si falta un id o no cuadra el número de pasos, queda en inglés.
let ES = {};
try {
  ES = JSON.parse(readFileSync(new URL('./catalog-es.json', import.meta.url), 'utf8'));
} catch {
  /* sin traducciones */
}
// Nombres en español (id → nombre). Si falta un id, queda el nombre original en inglés.
let NAMES = {};
try {
  NAMES = JSON.parse(readFileSync(new URL('./catalog-names-es.json', import.meta.url), 'utf8'));
} catch {
  /* sin nombres traducidos */
}
const list = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], 'utf8')) : await (await fetch(SRC)).json();
const out = list.map((x) => {
  const kind = x.category === 'cardio' ? 'duration' : x.category === 'stretching' ? 'duration' : x.equipment === 'body only' ? 'reps' : 'weight_reps';
  return {
    id: x.id,
    name: NAMES[x.id] ?? x.name,
    muscle: x.category === 'cardio' ? 'cardio' : (MUSCLE[x.primaryMuscles[0]] ?? 'otro'),
    secondary: [...new Set(x.secondaryMuscles.map((m) => MUSCLE[m]).filter(Boolean))],
    equipment: EQUIP[x.equipment] ?? 'otro',
    category: CAT[x.category] ?? x.category,
    level: LEVEL[x.level] ?? x.level,
    kind,
    instructions: ((steps) => (ES[x.id]?.length === steps.length ? ES[x.id] : steps))(x.instructions.filter((s) => s.trim())),
  };
});
// --- wger (https://wger.de, datos CC BY-SA 4.0) ---
const WGER_SRC = 'https://wger.de/api/v2/exerciseinfo/?limit=1000';
const WGER_EN = 2;
const WGER_ES = 4;
const MAP = JSON.parse(readFileSync(new URL('./wger-map.json', import.meta.url), 'utf8'));
const wger = (process.argv[3] ? JSON.parse(readFileSync(process.argv[3], 'utf8')) : await (await fetch(WGER_SRC)).json()).results;
const names = new Set(out.map((x) => x.name.toLowerCase()));
let added = 0;
for (const e of wger) {
  const m = MAP[String(e.id)];
  if (!m?.es || names.has(m.es.toLowerCase())) continue;
  names.add(m.es.toLowerCase());
  const tr = e.translations.find((t) => t.language === WGER_ES) ?? e.translations.find((t) => t.language === WGER_EN);
  const images = [...e.images].sort((a, b) => Number(b.is_main) - Number(a.is_main)).map((i) => i.image);
  out.push({
    id: `wger-${e.id}`,
    name: m.es,
    muscle: m.muscle,
    secondary: (m.secondary ?? []).filter((g) => g !== m.muscle),
    equipment: m.equipment,
    category: m.muscle === 'cardio' ? 'cardio' : m.kind === 'duration' ? 'resistencia' : 'fuerza',
    level: '',
    kind: m.kind,
    instructions: wgerSteps(tr?.description),
    ...(images.length ? { images: images.slice(0, 2) } : {}),
    source: 'wger',
    author: e.license_author || undefined,
  });
  added++;
}

writeFileSync(new URL('../app/public/catalog.json', import.meta.url), JSON.stringify(out));
console.log(`catalog.json: ${out.length} ejercicios (${added} de wger)`);
