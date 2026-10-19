// Programas predefinidos (sección "Explorar"). Usan ids de la biblioteca base.
import type { Routine, RoutineFolder } from './types';
import { uid } from './types';

type T = [exerciseId: string, sets: number, reps: number | string, restSec?: number, superset?: string];

export interface ProgramTemplate {
  id: string;
  name: string;
  level: 'Principiante' | 'Intermedio' | 'Avanzado';
  goal: string;
  daysPerWeek: number;
  equipment: string;
  description: string;
  routines: { name: string; exercises: T[] }[];
}

export const PROGRAMS: ProgramTemplate[] = [
  {
    id: 'fullbody-3',
    name: 'Cuerpo completo 3 días',
    level: 'Principiante',
    goal: 'Fuerza e hipertrofia general',
    daysPerWeek: 3,
    equipment: 'Gimnasio',
    description: 'Alterna A y B (A-B-A una semana, B-A-B la siguiente). Sube peso cuando completes todas las reps.',
    routines: [
      {
        name: 'Cuerpo completo A',
        exercises: [
          ['sentadilla', 3, 8, 150],
          ['press-banca', 3, 8, 150],
          ['remo-barra', 3, 10, 120],
          ['elevaciones-laterales', 3, 15, 60],
          ['plancha', 3, '45s', 60],
        ],
      },
      {
        name: 'Cuerpo completo B',
        exercises: [
          ['peso-muerto', 3, 5, 180],
          ['press-militar', 3, 8, 120],
          ['jalon-pecho', 3, 10, 90],
          ['zancadas', 3, 10, 90],
          ['curl-mancuernas', 2, 12, 60],
          ['extension-triceps-polea', 2, 12, 60],
        ],
      },
    ],
  },
  {
    id: 'stronglifts-5x5',
    name: 'Fuerza 5×5',
    level: 'Principiante',
    goal: 'Fuerza',
    daysPerWeek: 3,
    equipment: 'Barra y rack',
    description: 'Básicos con barra. Añade 2,5 kg por sesión mientras completes 5×5.',
    routines: [
      {
        name: '5×5 A',
        exercises: [
          ['sentadilla', 5, 5, 180],
          ['press-banca', 5, 5, 180],
          ['remo-barra', 5, 5, 180],
        ],
      },
      {
        name: '5×5 B',
        exercises: [
          ['sentadilla', 5, 5, 180],
          ['press-militar', 5, 5, 180],
          ['peso-muerto', 1, 5, 180],
        ],
      },
    ],
  },
  {
    id: 'upper-lower-4',
    name: 'Torso / Pierna 4 días',
    level: 'Intermedio',
    goal: 'Hipertrofia',
    daysPerWeek: 4,
    equipment: 'Gimnasio',
    description: 'Torso A, Pierna A, descanso, Torso B, Pierna B. Cada músculo 2 veces por semana.',
    routines: [
      {
        name: 'Torso A',
        exercises: [
          ['press-banca', 4, 6, 150],
          ['remo-barra', 4, 8, 120],
          ['press-hombro-mancuernas', 3, 10, 90],
          ['jalon-pecho', 3, 10, 90],
          ['curl-barra', 3, 10, 60, 'a'],
          ['press-frances', 3, 10, 60, 'a'],
        ],
      },
      {
        name: 'Pierna A',
        exercises: [
          ['sentadilla', 4, 6, 180],
          ['peso-muerto-rumano', 3, 8, 120],
          ['prensa', 3, 12, 90],
          ['curl-femoral', 3, 12, 60],
          ['gemelos-pie', 4, 12, 60],
          ['elevacion-piernas', 3, 12, 60],
        ],
      },
      {
        name: 'Torso B',
        exercises: [
          ['press-inclinado-mancuernas', 4, 10, 120],
          ['dominadas', 4, 8, 120],
          ['remo-sentado', 3, 12, 90],
          ['elevaciones-laterales', 4, 15, 60],
          ['curl-martillo', 3, 12, 60, 'b'],
          ['extension-triceps-cuerda', 3, 12, 60, 'b'],
        ],
      },
      {
        name: 'Pierna B',
        exercises: [
          ['peso-muerto', 3, 5, 180],
          ['bulgara', 3, 10, 90],
          ['extension-cuadriceps', 3, 15, 60],
          ['hip-thrust', 3, 10, 90],
          ['gemelos-sentado', 4, 15, 60],
          ['crunch-polea', 3, 15, 60],
        ],
      },
    ],
  },
  {
    id: 'ppl-6',
    name: 'Empuje / Tirón / Pierna (PPL)',
    level: 'Intermedio',
    goal: 'Hipertrofia',
    daysPerWeek: 6,
    equipment: 'Gimnasio',
    description: 'Repite el ciclo dos veces por semana (o una vez para 3 días).',
    routines: [
      {
        name: 'Empuje',
        exercises: [
          ['press-banca', 4, 8, 150],
          ['press-militar', 3, 8, 120],
          ['press-inclinado-mancuernas', 3, 10, 90],
          ['elevaciones-laterales', 4, 15, 60],
          ['extension-triceps-cuerda', 3, 12, 60],
          ['extension-triceps-cabeza', 3, 12, 60],
        ],
      },
      {
        name: 'Tirón',
        exercises: [
          ['peso-muerto', 3, 5, 180],
          ['dominadas', 4, 8, 120],
          ['remo-mancuerna', 3, 10, 90],
          ['face-pull', 3, 15, 60],
          ['curl-barra', 3, 10, 60],
          ['curl-martillo', 3, 12, 60],
        ],
      },
      {
        name: 'Pierna',
        exercises: [
          ['sentadilla', 4, 8, 180],
          ['peso-muerto-rumano', 3, 10, 120],
          ['prensa', 3, 12, 90],
          ['curl-femoral-sentado', 3, 12, 60],
          ['extension-cuadriceps', 3, 15, 60],
          ['gemelos-pie', 4, 12, 60],
        ],
      },
    ],
  },
  {
    id: 'arnold-split',
    name: 'Arnold split',
    level: 'Avanzado',
    goal: 'Hipertrofia',
    daysPerWeek: 6,
    equipment: 'Gimnasio',
    description: 'Pecho+Espalda, Hombros+Brazos, Pierna. Alto volumen.',
    routines: [
      {
        name: 'Pecho y espalda',
        exercises: [
          ['press-banca', 4, 8, 120],
          ['dominadas', 4, 8, 120],
          ['press-inclinado-mancuernas', 3, 10, 90, 'a'],
          ['remo-barra', 3, 10, 90, 'a'],
          ['aperturas', 3, 12, 60, 'b'],
          ['pullover', 3, 12, 60, 'b'],
        ],
      },
      {
        name: 'Hombros y brazos',
        exercises: [
          ['press-arnold', 4, 10, 90],
          ['elevaciones-laterales', 4, 15, 60],
          ['pajaros', 3, 15, 60],
          ['curl-barra', 4, 10, 60, 'a'],
          ['press-cerrado', 4, 10, 60, 'a'],
          ['curl-concentrado', 3, 12, 45, 'b'],
          ['extension-triceps-cuerda', 3, 12, 45, 'b'],
        ],
      },
      {
        name: 'Pierna',
        exercises: [
          ['sentadilla', 5, 8, 180],
          ['prensa', 4, 12, 90],
          ['peso-muerto-piernas-rigidas', 4, 10, 120],
          ['extension-cuadriceps', 3, 15, 60],
          ['curl-femoral', 3, 12, 60],
          ['gemelos-pie', 5, 15, 45],
        ],
      },
    ],
  },
  {
    id: 'casa-mancuernas',
    name: 'En casa con mancuernas',
    level: 'Principiante',
    goal: 'Forma física general',
    daysPerWeek: 3,
    equipment: 'Mancuernas y peso corporal',
    description: 'Sin gimnasio: un par de mancuernas y el suelo.',
    routines: [
      {
        name: 'Casa A',
        exercises: [
          ['sentadilla-goblet', 4, 12, 90],
          ['flexiones', 4, 12, 60],
          ['remo-mancuerna', 4, 12, 60],
          ['press-hombro-mancuernas', 3, 12, 60],
          ['plancha', 3, '40s', 45],
        ],
      },
      {
        name: 'Casa B',
        exercises: [
          ['bulgara', 3, 10, 90],
          ['press-banca-mancuernas', 3, 12, 60],
          ['curl-mancuernas', 3, 12, 45, 'a'],
          ['fondos-banco', 3, 12, 45, 'a'],
          ['giros-rusos', 3, 20, 45],
          ['burpees', 3, 10, 60],
        ],
      },
    ],
  },
  {
    id: 'gluteo-pierna',
    name: 'Glúteo y pierna',
    level: 'Intermedio',
    goal: 'Tren inferior',
    daysPerWeek: 2,
    equipment: 'Gimnasio',
    description: 'Dos sesiones de tren inferior con énfasis en glúteo. Combínalo con 1-2 días de torso.',
    routines: [
      {
        name: 'Glúteo A',
        exercises: [
          ['hip-thrust', 4, 10, 120],
          ['sentadilla', 3, 8, 150],
          ['peso-muerto-rumano', 3, 10, 120],
          ['abductores', 3, 15, 60],
          ['patada-gluteo', 3, 15, 45],
        ],
      },
      {
        name: 'Glúteo B',
        exercises: [
          ['peso-muerto-sumo', 3, 6, 150],
          ['bulgara', 3, 10, 90],
          ['puente-gluteo', 3, 12, 90],
          ['curl-femoral', 3, 12, 60],
          ['aductores', 3, 15, 60],
        ],
      },
    ],
  },
];

// Convierte un programa en carpeta + rutinas listas para guardar.
export function instantiateProgram(p: ProgramTemplate): { folder: RoutineFolder; routines: Routine[] } {
  const folder = { id: uid(), name: p.name };
  const routines: Routine[] = p.routines.map((r) => {
    const ss = new Map<string, string>();
    return {
      id: uid(),
      name: r.name,
      notes: p.description,
      folderId: folder.id,
      exercises: r.exercises.map(([exerciseId, sets, reps, restSec, superset]) => {
        const dur = typeof reps === 'string' && reps.endsWith('s') ? Number(reps.slice(0, -1)) : undefined;
        if (superset && !ss.has(superset)) ss.set(superset, uid());
        return {
          exerciseId,
          restSec: restSec ?? 90,
          supersetId: superset ? ss.get(superset) : undefined,
          sets: Array.from({ length: sets }, () => ({ type: 'normal' as const, ...(dur ? { durationSec: dur } : { reps: Number(reps) }) })),
        };
      }),
    };
  });
  return { folder, routines };
}
