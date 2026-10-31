// Genera app/public/catalog.json a partir de free-exercise-db (Unlicense / dominio público).
// Uso: node scripts/build-catalog.mjs [ruta-local-a-exercises.json]
import { readFileSync, writeFileSync } from 'node:fs';

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
const list = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], 'utf8')) : await (await fetch(SRC)).json();
const out = list.map((x) => {
  const kind = x.category === 'cardio' ? 'duration' : x.category === 'stretching' ? 'duration' : x.equipment === 'body only' ? 'reps' : 'weight_reps';
  return {
    id: x.id,
    name: x.name,
    muscle: x.category === 'cardio' ? 'cardio' : (MUSCLE[x.primaryMuscles[0]] ?? 'otro'),
    secondary: [...new Set(x.secondaryMuscles.map((m) => MUSCLE[m]).filter(Boolean))],
    equipment: EQUIP[x.equipment] ?? 'otro',
    category: CAT[x.category] ?? x.category,
    level: LEVEL[x.level] ?? x.level,
    kind,
    instructions: ((steps) => (ES[x.id]?.length === steps.length ? ES[x.id] : steps))(x.instructions.filter((s) => s.trim())),
  };
});
writeFileSync(new URL('../app/public/catalog.json', import.meta.url), JSON.stringify(out));
console.log(`catalog.json: ${out.length} ejercicios`);
