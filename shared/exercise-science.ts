import { z } from 'zod';
import { isGroup, isRegion } from './muscle-detail';
import { MOVEMENT_PATTERNS } from './types';
import type { Exercise, ExerciseScience, MuscleGroup } from './types';
import type { Region } from './muscle-detail';

const safeUrl = z
  .string()
  .url()
  .refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  }, 'La fuente debe usar HTTP(S) sin credenciales');
const source = z
  .object({
    titulo: z.string().trim().min(1),
    autores: z.array(z.string().trim().min(1)).min(1),
    año: z.number().int().min(1).max(9999),
    doi: z
      .string()
      .regex(/^10\.\d{4,9}\/[^\s]+$/i)
      .optional(),
    url: safeUrl.optional(),
  })
  .refine((value) => value.doi !== undefined || value.url !== undefined, 'Falta DOI o URL');

export const exerciseScienceSchema = z
  .object({
    patron: z.enum(MOVEMENT_PATTERNS),
    musculos: z
      .array(
        z.object({
          id: z.custom<MuscleGroup | Region>((id) => typeof id === 'string' && (isGroup(id) || isRegion(id))),
          rol: z.enum(['principal', 'secundario', 'estabilizador']),
          intensidad: z.number().min(0).max(100),
        }),
      )
      .min(1),
    evidencia: z.enum(['estimada', 'emg', 'hipertrofia']),
    fuentes: z.array(source),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.musculos.map((muscle) => muscle.id)).size !== value.musculos.length) ctx.addIssue({ code: 'custom', message: 'Músculos duplicados', path: ['musculos'] });
    if (value.evidencia === 'estimada' ? value.fuentes.length !== 0 : value.fuentes.length === 0)
      ctx.addIssue({ code: 'custom', message: 'La evidencia medida requiere fuentes; la estimada no atribuye citas', path: ['fuentes'] });
  });

export function parseExerciseScience(input: unknown): ExerciseScience {
  return exerciseScienceSchema.parse(input) as ExerciseScience;
}

// Sin patrón inferido ni citas: los roles proceden del modelo antiguo, nunca de umbrales visuales.
export function exerciseScience(exercise: Exercise): Omit<ExerciseScience, 'patron'> & { patron?: ExerciseScience['patron'] } {
  if (exercise.science) return parseExerciseScience(exercise.science);
  return {
    evidencia: 'estimada',
    fuentes: [],
    musculos: [
      { id: exercise.muscle, rol: 'principal', intensidad: 100 },
      ...[...new Set(exercise.secondary ?? [])].filter((id) => id !== exercise.muscle).map((id) => ({ id, rol: 'secundario' as const, intensidad: 50 })),
    ],
  };
}
