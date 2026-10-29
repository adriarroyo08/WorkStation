// Activación muscular detallada: qué grupos trabaja cada ejercicio de la biblioteca, con qué intensidad (0-100, el
// motor principal = 100) y qué partes de cada músculo. Valores orientativos a partir de estudios de EMG y de la
// biomecánica del movimiento. Ejercicios sin tabla (catálogo, personalizados): principal 100 y secundarios 50.
import { DEFAULT_EXERCISES, MUSCLE_LABELS } from './exercises';
import type { Exercise, MuscleGroup } from './types';

export const REGIONS = {
  'pecho-sup': ['pecho', 'Pecho superior (clavicular)'],
  'pecho-med': ['pecho', 'Pecho medio (esternal)'],
  'pecho-inf': ['pecho', 'Pecho inferior (costal)'],
  'hombro-ant': ['hombros', 'Deltoides anterior'],
  'hombro-lat': ['hombros', 'Deltoides lateral'],
  'hombro-post': ['hombros', 'Deltoides posterior'],
  'biceps-larga': ['biceps', 'Bíceps, cabeza larga'],
  'biceps-corta': ['biceps', 'Bíceps, cabeza corta'],
  braquial: ['biceps', 'Braquial'],
  'triceps-larga': ['triceps', 'Tríceps, cabeza larga'],
  'triceps-lateral': ['triceps', 'Tríceps, cabeza lateral'],
  'triceps-medial': ['triceps', 'Tríceps, cabeza medial'],
  flexores: ['antebrazo', 'Flexores (agarre)'],
  extensores: ['antebrazo', 'Extensores'],
  braquiorradial: ['antebrazo', 'Braquiorradial'],
  'trap-med': ['espalda', 'Trapecio medio'],
  romboides: ['espalda', 'Romboides'],
  redondo: ['espalda', 'Redondo mayor'],
  'dorsal-sup': ['dorsales', 'Dorsal ancho, zona alta'],
  'dorsal-inf': ['dorsales', 'Dorsal ancho, zona baja'],
  'abd-sup': ['core', 'Recto abdominal superior'],
  'abd-inf': ['core', 'Recto abdominal inferior'],
  oblicuos: ['core', 'Oblicuos'],
  'gluteo-mayor': ['gluteos', 'Glúteo mayor'],
  'gluteo-medio': ['gluteos', 'Glúteo medio'],
  'recto-femoral': ['cuadriceps', 'Recto femoral'],
  'vasto-lateral': ['cuadriceps', 'Vasto lateral'],
  'vasto-medial': ['cuadriceps', 'Vasto medial'],
  gastrocnemio: ['gemelos', 'Gastrocnemio'],
  soleo: ['gemelos', 'Sóleo'],
} as const satisfies Record<string, readonly [MuscleGroup, string]>;
export type Region = keyof typeof REGIONS;

// "parte 100, grupo 40": cada elemento es una parte (REGIONS) o un grupo entero (MuscleGroup).
const PRESS_BANCA = 'pecho-med 100, pecho-inf 75, pecho-sup 50, hombro-ant 55, triceps-lateral 45, triceps-medial 40, triceps-larga 25';
const PRESS_DECLINADO = 'pecho-inf 100, pecho-med 75, pecho-sup 25, hombro-ant 30, triceps-lateral 50, triceps-medial 45';
const DOMINADAS = 'dorsal-sup 100, dorsal-inf 85, redondo 70, romboides 55, trap-med 45, biceps-larga 55, biceps-corta 50, braquial 50, braquiorradial 40, hombro-post 35, abd-sup 25';
const REMO_SENTADO = 'romboides 100, trap-med 90, dorsal-inf 85, dorsal-sup 65, redondo 55, hombro-post 60, biceps-larga 45, braquial 40, lumbar 25';
const PAJAROS = 'hombro-post 100, trap-med 65, romboides 60, hombro-lat 40, redondo 25';
const FRONTALES = 'hombro-ant 100, pecho-sup 50, hombro-lat 40, trapecio 30';
const MARTILLO = 'braquial 100, braquiorradial 95, biceps-larga 70, biceps-corta 45, extensores 30, flexores 30';
const PREDICADOR = 'biceps-corta 100, braquial 80, biceps-larga 65, braquiorradial 40';
const FONDOS_TRICEPS = 'triceps-lateral 100, triceps-medial 95, triceps-larga 75, pecho-inf 55, hombro-ant 45, pecho-med 35';
const HIP_THRUST = 'gluteo-mayor 100, gluteo-medio 55, isquios 50, vasto-lateral 40, vasto-medial 35, aductores 35, lumbar 30';

export const ACTIVATION: Record<string, string> = {
  // Pecho
  'press-banca': PRESS_BANCA,
  'press-banca-smith': PRESS_BANCA,
  'press-banca-mancuernas': 'pecho-med 100, pecho-inf 70, pecho-sup 55, hombro-ant 55, triceps-lateral 35, triceps-medial 30',
  'press-inclinado': 'pecho-sup 100, pecho-med 60, pecho-inf 25, hombro-ant 75, triceps-lateral 45, triceps-medial 40',
  'press-inclinado-mancuernas': 'pecho-sup 100, pecho-med 55, pecho-inf 20, hombro-ant 70, triceps-lateral 35, triceps-medial 30',
  'press-inclinado-maquina': 'pecho-sup 100, pecho-med 55, hombro-ant 65, triceps-lateral 40, triceps-medial 35',
  'press-declinado': PRESS_DECLINADO,
  'press-declinado-maquina': PRESS_DECLINADO,
  'press-pecho-maquina': 'pecho-med 100, pecho-inf 65, pecho-sup 45, hombro-ant 45, triceps-lateral 40, triceps-medial 35',
  aperturas: 'pecho-med 100, pecho-inf 60, pecho-sup 50, hombro-ant 40, biceps-corta 20',
  'aperturas-inclinadas': 'pecho-sup 100, pecho-med 55, hombro-ant 50, biceps-corta 20',
  'pec-deck': 'pecho-med 100, pecho-inf 60, pecho-sup 55, hombro-ant 30',
  'cruce-poleas': 'pecho-inf 100, pecho-med 80, pecho-sup 30, hombro-ant 35',
  'cruce-poleas-bajo': 'pecho-sup 100, pecho-med 55, hombro-ant 50, biceps-corta 20',
  fondos: 'pecho-inf 100, pecho-med 60, triceps-lateral 75, triceps-medial 70, triceps-larga 50, hombro-ant 50',
  flexiones: 'pecho-med 100, pecho-inf 65, pecho-sup 45, hombro-ant 55, triceps-lateral 50, triceps-medial 45, abd-sup 30, abd-inf 30',
  'flexiones-declinadas': 'pecho-sup 100, pecho-med 70, hombro-ant 70, triceps-lateral 50, triceps-medial 45, abd-sup 30',
  // Espalda
  dominadas: DOMINADAS,
  'dominadas-lastradas': DOMINADAS,
  'dominadas-asistidas': DOMINADAS,
  'dominadas-supinas': 'dorsal-inf 100, dorsal-sup 80, redondo 55, biceps-corta 80, biceps-larga 75, braquial 55, romboides 45, trap-med 35, pecho-inf 25',
  'jalon-pecho': 'dorsal-sup 100, dorsal-inf 80, redondo 65, romboides 50, trap-med 40, biceps-larga 50, biceps-corta 45, braquial 45, hombro-post 35',
  'jalon-cerrado': 'dorsal-inf 100, dorsal-sup 75, redondo 55, biceps-corta 60, biceps-larga 55, braquial 50, romboides 45',
  'jalon-brazos-rectos': 'dorsal-inf 100, dorsal-sup 80, redondo 70, triceps-larga 45, pecho-inf 30, abd-sup 25',
  'remo-barra': 'romboides 100, trap-med 95, dorsal-inf 80, dorsal-sup 65, redondo 60, hombro-post 70, biceps-larga 45, biceps-corta 40, braquial 45, lumbar 55, isquios 30',
  'remo-supino': 'romboides 100, dorsal-inf 95, trap-med 75, dorsal-sup 60, biceps-corta 65, biceps-larga 60, braquial 45, hombro-post 50, lumbar 50',
  'remo-mancuerna': 'romboides 100, dorsal-inf 95, dorsal-sup 75, trap-med 70, redondo 60, hombro-post 60, biceps-larga 45, braquial 40, oblicuos 25',
  'remo-sentado': REMO_SENTADO,
  'remo-maquina': REMO_SENTADO,
  'remo-iso-maquina': 'romboides 100, dorsal-inf 90, trap-med 80, dorsal-sup 70, redondo 55, hombro-post 55, biceps-larga 40, braquial 35',
  'remo-t': 'romboides 100, trap-med 90, dorsal-inf 80, dorsal-sup 70, hombro-post 65, biceps-larga 40, braquial 40, lumbar 45',
  'remo-invertido': 'romboides 100, trap-med 90, dorsal-sup 70, dorsal-inf 60, hombro-post 70, biceps-larga 50, biceps-corta 45, abd-sup 30, gluteo-mayor 25',
  pullover: 'dorsal-inf 100, pecho-med 70, pecho-inf 55, redondo 70, triceps-larga 50, pecho-sup 40, abd-sup 25',
  'peso-muerto': 'lumbar 100, gluteo-mayor 90, isquios 85, trapecio 70, vasto-lateral 50, vasto-medial 45, recto-femoral 30, trap-med 50, dorsal-inf 45, flexores 60, oblicuos 35, abd-sup 30, abd-inf 30',
  'peso-muerto-sumo': 'gluteo-mayor 100, aductores 85, vasto-medial 70, vasto-lateral 65, isquios 70, lumbar 75, trapecio 55, gluteo-medio 40, recto-femoral 40, flexores 55',
  'peso-muerto-hexagonal': 'vasto-lateral 100, vasto-medial 95, recto-femoral 60, gluteo-mayor 85, isquios 60, lumbar 70, trapecio 65, flexores 60',
  hiperextensiones: 'lumbar 100, gluteo-mayor 75, isquios 65',
  'buenos-dias': 'isquios 100, lumbar 85, gluteo-mayor 75, abd-sup 25',
  encogimientos: 'trapecio 100, trap-med 45, flexores 45',
  'encogimientos-mancuernas': 'trapecio 100, trap-med 40, flexores 50',
  // Hombros
  'press-militar': 'hombro-ant 100, hombro-lat 65, pecho-sup 45, triceps-lateral 55, triceps-medial 50, triceps-larga 30, trapecio 45, abd-sup 30, oblicuos 30, lumbar 30',
  'press-militar-sentado': 'hombro-ant 100, hombro-lat 65, pecho-sup 40, triceps-lateral 55, triceps-medial 50, trapecio 40',
  'press-hombro-mancuernas': 'hombro-ant 100, hombro-lat 70, pecho-sup 35, triceps-lateral 45, triceps-medial 40, trapecio 40',
  'press-arnold': 'hombro-ant 100, hombro-lat 75, pecho-sup 40, triceps-lateral 45, triceps-medial 40, trapecio 35',
  'press-hombro-maquina': 'hombro-ant 100, hombro-lat 60, pecho-sup 35, triceps-lateral 50, triceps-medial 45',
  'elevaciones-laterales': 'hombro-lat 100, trapecio 50, hombro-ant 40, hombro-post 25',
  'elevaciones-laterales-polea': 'hombro-lat 100, trapecio 40, hombro-ant 35, hombro-post 30',
  'elevaciones-laterales-maquina': 'hombro-lat 100, trapecio 35, hombro-ant 30, hombro-post 25',
  'elevaciones-frontales': FRONTALES,
  'elevaciones-frontales-polea': FRONTALES,
  pajaros: PAJAROS,
  'pajaros-maquina': PAJAROS,
  'face-pull': 'hombro-post 100, trap-med 75, romboides 65, trapecio 50, hombro-lat 45, redondo 30, biceps-larga 25',
  'remo-al-menton': 'hombro-lat 100, trapecio 85, hombro-ant 65, biceps-larga 35, braquial 35, braquiorradial 30',
  // Brazos
  'curl-barra': 'biceps-corta 100, biceps-larga 90, braquial 60, braquiorradial 45, flexores 40, hombro-ant 20',
  'curl-z': 'biceps-corta 95, biceps-larga 100, braquial 70, braquiorradial 55, flexores 35',
  'curl-mancuernas': 'biceps-corta 100, biceps-larga 95, braquial 60, braquiorradial 45, flexores 35',
  'curl-inclinado': 'biceps-larga 100, biceps-corta 75, braquial 50, braquiorradial 35',
  'curl-martillo': MARTILLO,
  'curl-martillo-polea': MARTILLO,
  'curl-predicador': PREDICADOR,
  'curl-predicador-maquina': PREDICADOR,
  'curl-concentrado': 'biceps-corta 100, biceps-larga 85, braquial 65, braquiorradial 35',
  'curl-spider': 'biceps-corta 100, biceps-larga 80, braquial 65',
  'curl-polea': 'biceps-corta 100, biceps-larga 85, braquial 55, braquiorradial 35',
  'curl-polea-espalda': 'biceps-larga 100, biceps-corta 75, braquial 50, braquiorradial 30',
  'extension-triceps-polea': 'triceps-lateral 100, triceps-medial 90, triceps-larga 60, extensores 25',
  'extension-triceps-cuerda': 'triceps-lateral 100, triceps-medial 85, triceps-larga 60, extensores 25',
  'extension-triceps-polea-una': 'triceps-lateral 100, triceps-medial 90, triceps-larga 55',
  'extension-triceps-cuerda-cabeza': 'triceps-larga 100, triceps-medial 75, triceps-lateral 60, abd-sup 20',
  'press-frances': 'triceps-larga 100, triceps-medial 85, triceps-lateral 75',
  'extension-triceps-cabeza': 'triceps-larga 100, triceps-medial 70, triceps-lateral 60',
  'press-cerrado': 'triceps-lateral 100, triceps-medial 95, triceps-larga 70, pecho-med 70, pecho-inf 55, pecho-sup 35, hombro-ant 50',
  'fondos-triceps': FONDOS_TRICEPS,
  'fondos-lastrados': FONDOS_TRICEPS,
  'fondos-banco': 'triceps-lateral 100, triceps-medial 90, triceps-larga 55, hombro-ant 50, pecho-inf 25',
  'curl-muneca': 'flexores 100, braquiorradial 25',
  'curl-inverso': 'braquiorradial 100, extensores 85, braquial 80, biceps-larga 50, biceps-corta 35',
  'paseo-granjero': 'flexores 100, trapecio 85, extensores 60, oblicuos 60, lumbar 50, abd-sup 45, abd-inf 45, gluteo-medio 45, gastrocnemio 40, soleo 35, vasto-lateral 30',
  // Pierna
  sentadilla: 'vasto-lateral 100, vasto-medial 100, recto-femoral 70, gluteo-mayor 85, aductores 60, lumbar 55, isquios 40, abd-sup 30, abd-inf 30, gastrocnemio 25, soleo 25',
  'sentadilla-frontal': 'vasto-medial 100, vasto-lateral 100, recto-femoral 80, gluteo-mayor 65, aductores 50, abd-sup 45, abd-inf 45, lumbar 45, trap-med 45, isquios 25',
  'sentadilla-goblet': 'vasto-medial 100, vasto-lateral 95, recto-femoral 70, gluteo-mayor 75, aductores 55, abd-sup 40, abd-inf 40, flexores 30',
  'sentadilla-smith': 'vasto-lateral 100, vasto-medial 95, recto-femoral 65, gluteo-mayor 70, aductores 45, isquios 30',
  'sentadilla-hack': 'vasto-lateral 100, vasto-medial 95, recto-femoral 60, gluteo-mayor 65, aductores 45',
  'sentadilla-peso-corporal': 'vasto-lateral 100, vasto-medial 95, recto-femoral 65, gluteo-mayor 70, aductores 40, abd-sup 25',
  prensa: 'vasto-lateral 100, vasto-medial 100, recto-femoral 55, gluteo-mayor 70, aductores 55, isquios 30, gastrocnemio 20',
  'extension-cuadriceps': 'recto-femoral 100, vasto-lateral 95, vasto-medial 90',
  zancadas: 'vasto-medial 100, vasto-lateral 95, gluteo-mayor 90, recto-femoral 60, gluteo-medio 60, aductores 50, isquios 40, gastrocnemio 30',
  'zancadas-caminando': 'vasto-medial 100, vasto-lateral 95, gluteo-mayor 95, recto-femoral 60, gluteo-medio 65, aductores 50, isquios 45, gastrocnemio 35',
  bulgara: 'vasto-medial 100, vasto-lateral 95, gluteo-mayor 95, gluteo-medio 65, recto-femoral 55, aductores 50, isquios 35, gastrocnemio 25',
  'peso-muerto-rumano': 'isquios 100, gluteo-mayor 85, lumbar 70, flexores 50, aductores 45, trapecio 40, dorsal-inf 30',
  'peso-muerto-piernas-rigidas': 'isquios 100, lumbar 80, gluteo-mayor 75, flexores 50, aductores 40, gastrocnemio 25',
  'curl-femoral': 'isquios 100, gastrocnemio 50',
  'curl-femoral-sentado': 'isquios 100, gastrocnemio 35',
  'hip-thrust': HIP_THRUST,
  'hip-thrust-maquina': HIP_THRUST,
  'puente-gluteo': 'gluteo-mayor 100, isquios 55, gluteo-medio 45, lumbar 25',
  'patada-gluteo': 'gluteo-mayor 100, gluteo-medio 55, isquios 50, lumbar 25',
  abductores: 'abductores 100, gluteo-medio 90, gluteo-mayor 50',
  aductores: 'aductores 100, vasto-medial 25',
  'gemelos-pie': 'gastrocnemio 100, soleo 70',
  'gemelos-sentado': 'soleo 100, gastrocnemio 45',
  'gemelos-prensa': 'gastrocnemio 100, soleo 65',
  // Core
  plancha: 'abd-sup 100, abd-inf 95, oblicuos 75, hombro-ant 45, gluteo-mayor 40, recto-femoral 30, pecho-med 25',
  'plancha-lateral': 'oblicuos 100, gluteo-medio 70, abd-sup 50, abd-inf 50, lumbar 45, hombro-lat 40, abductores 35, aductores 30',
  crunch: 'abd-sup 100, abd-inf 60, oblicuos 50',
  'crunch-polea': 'abd-sup 100, abd-inf 70, oblicuos 55',
  'crunch-maquina': 'abd-sup 100, abd-inf 65, oblicuos 50',
  'elevacion-piernas': 'abd-inf 100, abd-sup 70, recto-femoral 70, oblicuos 60, flexores 50, dorsal-sup 40',
  'elevacion-piernas-paralelas': 'abd-inf 100, recto-femoral 70, abd-sup 65, oblicuos 55, triceps-medial 30, hombro-ant 30',
  'rueda-abdominal': 'abd-sup 100, abd-inf 95, oblicuos 70, dorsal-inf 50, hombro-ant 45, triceps-larga 35, lumbar 30',
  'giros-rusos': 'oblicuos 100, abd-sup 65, abd-inf 60, recto-femoral 30',
  'dead-bug': 'abd-inf 100, abd-sup 80, oblicuos 70, recto-femoral 30',
  escaladores: 'abd-inf 100, abd-sup 75, oblicuos 60, recto-femoral 60, hombro-ant 50, cardio 50, pecho-med 30',
  'crunch-bicicleta': 'oblicuos 100, abd-sup 85, abd-inf 80, recto-femoral 45',
  'codo-rodilla': 'oblicuos 100, abd-sup 80, abd-inf 75, recto-femoral 35',
  'flexion-lateral': 'oblicuos 100, lumbar 45, flexores 35, abd-sup 30',
  // Cardio y cuerpo completo
  correr: 'cardio 100, gastrocnemio 85, soleo 80, isquios 75, gluteo-mayor 70, recto-femoral 70, vasto-lateral 60, vasto-medial 55, abd-inf 30',
  'caminar-cinta': 'cardio 100, gastrocnemio 60, soleo 55, gluteo-mayor 45, isquios 45, recto-femoral 40, vasto-lateral 35',
  bici: 'cardio 100, vasto-lateral 80, vasto-medial 80, recto-femoral 70, gluteo-mayor 50, isquios 40, gastrocnemio 40',
  eliptica: 'cardio 100, vasto-lateral 60, vasto-medial 55, gluteo-mayor 55, isquios 40, recto-femoral 40, dorsal-inf 25',
  escaladora: 'cardio 100, gluteo-mayor 85, vasto-lateral 75, vasto-medial 75, gastrocnemio 55, recto-femoral 50, isquios 45, soleo 45',
  'remo-ergometro': 'cardio 100, vasto-lateral 75, vasto-medial 70, gluteo-mayor 65, dorsal-inf 65, romboides 60, dorsal-sup 55, trap-med 55, hombro-post 45, isquios 45, lumbar 40, biceps-larga 35, braquial 30, abd-sup 30',
  'air-bike': 'cardio 100, vasto-lateral 70, vasto-medial 65, recto-femoral 55, gluteo-mayor 45, hombro-ant 40, pecho-med 30, dorsal-inf 30, triceps-lateral 30, biceps-larga 25',
  comba: 'cardio 100, gastrocnemio 85, soleo 80, hombro-lat 30, flexores 30, recto-femoral 30, hombro-ant 25, abd-sup 25',
  burpees: 'cuerpo_completo 100, pecho-med 60, vasto-lateral 60, vasto-medial 55, gluteo-mayor 55, hombro-ant 50, abd-sup 50, abd-inf 50, triceps-lateral 45, recto-femoral 45, gastrocnemio 40',
  'kettlebell-swing': 'cuerpo_completo 100, gluteo-mayor 100, isquios 85, lumbar 70, flexores 55, abd-sup 45, abd-inf 45, oblicuos 40, hombro-ant 35, trapecio 35, vasto-lateral 35',
  clean: 'cuerpo_completo 100, trapecio 85, gluteo-mayor 85, vasto-lateral 80, vasto-medial 75, isquios 70, lumbar 70, gastrocnemio 55, hombro-lat 50, flexores 50, hombro-ant 45, recto-femoral 45',
  'salto-cajon': 'vasto-lateral 100, vasto-medial 95, gluteo-mayor 90, gastrocnemio 75, recto-femoral 70, soleo 55, isquios 45',
  'muscle-up': 'dorsal-sup 100, dorsal-inf 90, triceps-lateral 75, triceps-medial 70, pecho-inf 65, redondo 60, biceps-corta 55, biceps-larga 55, braquial 50, hombro-ant 45, flexores 45, abd-sup 40, abd-inf 40',
};

export interface GroupActivation {
  group: MuscleGroup;
  label: string;
  pct: number;
  parts: { region: Region; label: string; pct: number }[];
}

export const isRegion = (id: string): id is Region => id in REGIONS;
export const isGroup = (id: string): id is MuscleGroup => id in MUSCLE_LABELS;

export function parseActivation(spec: string): { id: Region | MuscleGroup; pct: number }[] {
  return spec.split(',').map((t) => {
    const [id, pct] = t.trim().split(/\s+/);
    if (!isRegion(id) && !isGroup(id)) throw new Error(`Músculo desconocido: ${id}`);
    return { id, pct: Number(pct) };
  });
}

// Grupos ordenados de más a menos trabajados, cada uno con sus partes; el grupo vale lo que su parte más trabajada.
// Los del catálogo que son el mismo movimiento que uno de la biblioteca (misma imagen) usan su tabla.
let byMedia: Map<string, string> | undefined;
export function exerciseActivation(e: Pick<Exercise, 'id' | 'muscle' | 'secondary' | 'media'>): GroupActivation[] {
  byMedia ??= new Map(DEFAULT_EXERCISES.filter((x) => x.media && ACTIVATION[x.id]).map((x) => [x.media!, ACTIVATION[x.id]]));
  const spec = ACTIVATION[e.id] ?? (e.media ? byMedia.get(e.media) : undefined);
  const items = spec ? parseActivation(spec) : [{ id: e.muscle, pct: 100 }, ...(e.secondary ?? []).filter((m) => m !== e.muscle).map((id) => ({ id, pct: 50 }))];
  const groups = new Map<MuscleGroup, GroupActivation>();
  for (const { id, pct } of items) {
    const group = isRegion(id) ? REGIONS[id][0] : id;
    const g = groups.get(group) ?? { group, label: MUSCLE_LABELS[group], pct: 0, parts: [] };
    g.pct = Math.max(g.pct, pct);
    if (isRegion(id)) g.parts.push({ region: id, label: REGIONS[id][1], pct });
    groups.set(group, g);
  }
  for (const g of groups.values()) g.parts.sort((a, b) => b.pct - a.pct);
  return [...groups.values()].sort((a, b) => b.pct - a.pct);
}

export const intensityLabel = (pct: number) => (pct >= 80 ? 'Principal' : pct >= 45 ? 'Secundario' : 'Estabilizador');

// Músculos de una sesión: suma la intensidad de cada ejercicio por sus series y normaliza a 0-100.
export function sessionMuscles(items: { exercise: Pick<Exercise, 'id' | 'muscle' | 'secondary' | 'media'>; sets: number }[]) {
  const score = new Map<MuscleGroup, number>();
  for (const { exercise, sets } of items) for (const a of exerciseActivation(exercise)) score.set(a.group, (score.get(a.group) ?? 0) + (a.pct / 100) * sets);
  const max = Math.max(0, ...score.values());
  return [...score]
    .filter(([g]) => g !== 'cardio' && g !== 'cuerpo_completo' && g !== 'otro')
    .map(([group, v]) => ({ group, label: MUSCLE_LABELS[group], pct: Math.round((v / max) * 100) }))
    .sort((a, b) => b.pct - a.pct);
}
