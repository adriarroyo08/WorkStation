import { countsAsWorkSet, exerciseHistory } from './stats';
import type { Exercise, WorkoutSet, WorkstationData } from './types';

export type StagnationConfidence = 'alta' | 'moderada' | 'baja';
export type StagnationType = 'ninguno' | 'estancamiento_esfuerzo' | 'meseta_rendimiento' | 'historico_insuficiente';

export interface StagnationReport {
  exerciseId: string;
  type: StagnationType;
  confidence: StagnationConfidence;
  consecutiveSessions: number;
  lastWeightKg: number;
  averageRpe?: number;
  recommendation?: DeloadRecommendation;
}

export interface DeloadRecommendation {
  strategy: 'volumen' | 'reseteo_ligero' | 'mantener';
  suggestedSetsFactor: number;
  suggestedWeightFactor: number;
  targetRir: number;
  userMessage: string;
  rationale: string;
}

const DAY = 86_400_000;

/** Evalúa las últimas sesiones válidas del ejercicio; todos los pesos están en kg. */
export function evaluateStagnation(data: WorkstationData, exerciseId: string, now = new Date().toISOString()): StagnationReport {
  const end = Date.parse(now);
  const sessions = exerciseHistory(data, exerciseId)
    .filter((s) => Date.parse(s.date) >= end - 45 * DAY && Date.parse(s.date) <= end)
    .map((s) => {
      const work = s.sets.filter(countsAsWorkSet);
      const top = work.filter((set) => set.weight === s.bestWeight);
      const rpes = top.map((set) => set.rpe).filter((r): r is number => r !== undefined && Number.isFinite(r));
      const averageRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : undefined;
      return {
        date: Date.parse(s.date),
        weight: s.bestWeight,
        // Epley sin redondear, incluso a una repetición, según el contrato §5.1.
        performance: Math.max(0, ...top.map((set) => s.bestWeight * (1 + (set.reps ?? 0) / 30))),
        valid: work.length >= 2 && s.bestWeight > 0 && top.some((set) => (set.reps ?? 0) > 0),
        rpes,
        hard: (averageRpe !== undefined && averageRpe >= 9) || top.some((set) => set.type === 'failure' || set.rpe === 10),
      };
    })
    .filter((s) => s.valid)
    .sort((a, b) => a.date - b.date);

  let start = 0;
  for (let i = 1; i < sessions.length; i++) {
    if (sessions[i].date - sessions[i - 1].date > 21 * DAY) start = i;
  }
  const recent = sessions.slice(start);
  const last = recent.at(-1);
  const report: StagnationReport = {
    exerciseId,
    type: 'historico_insuficiente',
    confidence: 'baja',
    consecutiveSessions: recent.length,
    lastWeightKg: last?.weight ?? 0,
  };
  if (recent.length < 3) return report;

  const window = recent.slice(-3);
  const rpes = window.flatMap((s) => s.rpes);
  if (rpes.length) report.averageRpe = rpes.reduce((a, b) => a + b, 0) / rpes.length;
  const metrics = window.map((s) => s.performance);
  const max = Math.max(...metrics);
  const plateau = window.every((s) => s.weight === last!.weight) && max - Math.min(...metrics) <= 0.02 * max;
  report.type = plateau ? (window.every((s) => s.hard) ? 'estancamiento_esfuerzo' : 'meseta_rendimiento') : 'ninguno';
  report.confidence = report.type === 'estancamiento_esfuerzo' ? 'alta' : 'moderada';
  const recommendation = createDeloadSuggestion(report);
  if (recommendation) report.recommendation = recommendation;
  return report;
}

/** Descarga localizada y opcional; una meseta sin esfuerzo alto no exige reducir volumen. */
export function createDeloadSuggestion(report: StagnationReport, exercise?: Exercise): DeloadRecommendation | null {
  if (report.type === 'ninguno' || report.type === 'historico_insuficiente') return null;
  const context = exercise ? ` en ${exercise.name}` : ' en este ejercicio';
  if (report.type === 'estancamiento_esfuerzo') {
    return {
      strategy: 'volumen',
      suggestedSetsFactor: 0.5,
      suggestedWeightFactor: 1,
      targetRir: 3,
      userMessage: `Rendimiento estabilizado${context} durante las últimas 3 sesiones con esfuerzo alto registrado. Sugerencia opcional: reduce a la mitad las series efectivas en la próxima sesión manteniendo el peso y dejando 3–4 repeticiones en recámara.`,
      rationale: 'Reducir el volumen conservando la carga permite gestionar el trabajo sin atribuir una causa fisiológica. El orden de los ejercicios también influye en el rendimiento.',
    };
  }
  return {
    strategy: 'mantener',
    suggestedSetsFactor: 1,
    suggestedWeightFactor: 1,
    targetRir: 3,
    userMessage: `Meseta de repeticiones registradas${context} durante las últimas 3 sesiones. Si sientes fatiga, considera una descarga de series; si te sentiste cómodo, intenta sumar una repetición o progresar en carga dentro de tu rango.`,
    rationale: 'Sin esfuerzo alto repetido no se propone reducir el volumen. El registro no permite determinar la causa de la meseta; el orden de los ejercicios puede influir.',
  };
}

/** Conserva calentamientos y series hechas; retira solo series efectivas pendientes. */
export function deloadPendingSets(sets: WorkoutSet[]): WorkoutSet[] {
  const pending = sets.filter((s) => !s.done && s.type !== 'warmup');
  const keep = new Set(pending.slice(0, Math.max(1, Math.ceil(pending.length / 2))));
  return sets.filter((s) => s.done || s.type === 'warmup' || keep.has(s));
}
