import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_EXERCISES, MUSCLE_LABELS } from './exercises';
import { parseExerciseScience } from './exercise-science';
import {
  EXERCISE_EVIDENCE_MATRIX,
  findExercisesWithoutMetadata,
  findOrphanMetadataIds,
  getExerciseEvidence,
  getLibraryEvidenceStats,
  resolveCatalogExerciseScience,
  validateScientificSources,
} from './exercise-evidence';
import { MOVEMENT_PATTERNS } from './types';
import type { Exercise } from './types';
import { exerciseActivation, isGroup, isRegion, REGIONS, sessionMuscles } from './muscle-detail';

describe('matriz de evidencia científica de ejercicios (issue #49)', () => {
  it('cubre exactamente los 130 ejercicios de DEFAULT_EXERCISES sin omitir ninguno', () => {
    const defaultIds = new Set(DEFAULT_EXERCISES.map((e) => e.id));
    const matrixIds = new Set(Object.keys(EXERCISE_EVIDENCE_MATRIX));

    expect(matrixIds.size).toBe(130);
    expect(defaultIds.size).toBe(130);
    expect(matrixIds).toEqual(defaultIds);
  });

  it('todos los registros de la matriz cumplen estrictamente el contrato tipado ExerciseScience', () => {
    for (const [, item] of Object.entries(EXERCISE_EVIDENCE_MATRIX)) {
      const parsed = parseExerciseScience(item);
      expect(parsed.patron).toBe(item.patron);
      expect(MOVEMENT_PATTERNS).toContain(parsed.patron);
      expect(parsed.musculos.length).toBeGreaterThanOrEqual(1);

      // Comprobar que todos los ids musculares son válidos en el sistema
      for (const m of parsed.musculos) {
        expect(isGroup(m.id) || isRegion(m.id)).toBe(true);
        expect(['principal', 'secundario', 'estabilizador']).toContain(m.rol);
        expect(m.intensidad).toBeGreaterThanOrEqual(0);
        expect(m.intensidad).toBeLessThanOrEqual(100);
      }

      // Al menos un músculo debe ser motor principal
      expect(parsed.musculos.some((m) => m.rol === 'principal')).toBe(true);

      // Regla de evidencia y fuentes
      if (parsed.evidencia === 'estimada') {
        expect(parsed.fuentes).toEqual([]);
      } else {
        expect(parsed.fuentes.length).toBeGreaterThan(0);
        for (const f of parsed.fuentes) {
          expect(f.titulo.trim().length).toBeGreaterThan(0);
          expect(f.autores.length).toBeGreaterThan(0);
          expect(Number.isInteger(f.año)).toBe(true);
          expect(f.año).toBeGreaterThan(1900);
          expect(f.doi !== undefined || f.url !== undefined).toBe(true);
          if (f.doi) expect(f.doi).toMatch(/^10\.\d{4,9}\/[^\s]+$/i);
          if (f.url) expect(f.url).toMatch(/^https?:\/\//);
          if (f.fechaConsulta) expect(f.fechaConsulta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          if (f.ejercicioEstudiado) expect(f.ejercicioEstudiado.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('distingue correctamente EMG, hipertrofia y estimaciones sin citas inventadas', () => {
    const stats = getLibraryEvidenceStats();
    expect(stats.total).toBe(130);
    expect(stats.directHypertrophyCount).toBe(9);
    expect(stats.directEmgCount).toBe(60);
    expect(stats.directEvidenceCount).toBe(69);
    expect(stats.estimatedCount).toBe(61);
    expect(stats.directEvidenceCount + stats.estimatedCount).toBe(130);

    // Comprobar ejercicios clave de hipertrofia
    const sentadilla = getExerciseEvidence('sentadilla');
    expect(sentadilla?.evidencia).toBe('hipertrofia');
    expect(sentadilla?.fuentes.some((f) => f.año === 2019 && f.autores.includes('Keitaro Kubo'))).toBe(true);

    const legCurl = getExerciseEvidence('curl-femoral-sentado');
    expect(legCurl?.evidencia).toBe('hipertrofia');
    expect(legCurl?.fuentes.some((f) => f.autores.includes('Sumiaki Maeo'))).toBe(true);

    const tricepsExt = getExerciseEvidence('extension-triceps-cabeza');
    expect(tricepsExt?.evidencia).toBe('hipertrofia');

    const calves = getExerciseEvidence('gemelos-pie');
    expect(calves?.evidencia).toBe('hipertrofia');

    // Comprobar ejercicios estimados (sin citas)
    const goblet = getExerciseEvidence('sentadilla-goblet');
    expect(goblet?.evidencia).toBe('estimada');
    expect(goblet?.fuentes).toEqual([]);

    const curlMartillo = getExerciseEvidence('curl-martillo');
    expect(curlMartillo?.evidencia).toBe('estimada');
    expect(curlMartillo?.fuentes).toEqual([]);
  });

  it('contabiliza todos los patrones de movimiento en las estadísticas', () => {
    const stats = getLibraryEvidenceStats();
    let sumPatterns = 0;
    for (const p of MOVEMENT_PATTERNS) {
      const pStat = stats.byPattern[p];
      expect(pStat).toBeDefined();
      expect(pStat.total).toBe(pStat.emg + pStat.hipertrofia + pStat.estimada);
      sumPatterns += pStat.total;
    }
    expect(sumPatterns).toBe(130);
  });

  it('resuelve ejercicios del catálogo externo y personalizados sin atribuir evidencia heredada', () => {
    // 1. Ejercicio personalizado creado por el usuario:
    const customEx: Exercise = {
      id: 'custom-press',
      name: 'Press personal de prueba',
      muscle: 'pecho',
      secondary: ['triceps'],
      equipment: 'mancuernas',
      kind: 'weight_reps',
      custom: true,
    };
    const customScience = resolveCatalogExerciseScience(customEx);
    expect(customScience.evidencia).toBe('estimada');
    expect(customScience.fuentes).toEqual([]);
    expect(customScience.musculos).toEqual([
      { id: 'pecho', rol: 'principal', intensidad: 100 },
      { id: 'triceps', rol: 'secundario', intensidad: 50 },
    ]);

    // 2. Ejercicio de catálogo externo no emparejado con la biblioteca base:
    const catalogEx: Exercise = {
      id: 'external_catalog_999',
      name: 'External Press Variant',
      muscle: 'hombros',
      equipment: 'máquina',
      kind: 'weight_reps',
    };
    const catalogScience = resolveCatalogExerciseScience(catalogEx);
    expect(catalogScience.evidencia).toBe('estimada');
    expect(catalogScience.fuentes).toEqual([]);

    // 3. Ejercicio de la biblioteca base estándar:
    const baseEx = DEFAULT_EXERCISES.find((e) => e.id === 'press-banca')!;
    const baseScience = resolveCatalogExerciseScience(baseEx);
    expect(baseScience.evidencia).toBe('emg');
    expect(baseScience.fuentes.length).toBeGreaterThan(0);
  });

  it('todos los ejercicios de DEFAULT_EXERCISES tienen propiedad science poblada con patrón, músculos, roles, intensidades y evidencia explícito', () => {
    expect(DEFAULT_EXERCISES.length).toBe(130);
    for (const ex of DEFAULT_EXERCISES) {
      expect(ex.science, `Falta science en ${ex.id}`).toBeDefined();
      const s = ex.science!;
      expect(MOVEMENT_PATTERNS).toContain(s.patron);
      expect(s.musculos.length).toBeGreaterThanOrEqual(1);
      for (const m of s.musculos) {
        expect(['principal', 'secundario', 'estabilizador']).toContain(m.rol);
        expect(m.intensidad).toBeGreaterThanOrEqual(0);
        expect(m.intensidad).toBeLessThanOrEqual(100);
        expect(isGroup(m.id) || isRegion(m.id)).toBe(true);
      }
      expect(s.musculos.some((m) => m.rol === 'principal')).toBe(true);
      expect(['estimada', 'emg', 'hipertrofia']).toContain(s.evidencia);
      if (s.evidencia === 'estimada') {
        expect(s.fuentes).toEqual([]);
      } else {
        expect(s.fuentes.length).toBeGreaterThan(0);
      }
    }
  });

  it('detecta ejercicios nuevos que no tienen metadatos científicos asociados', () => {
    // La biblioteca actual tiene cobertura al 100%
    const missingInCurrent = findExercisesWithoutMetadata(DEFAULT_EXERCISES);
    expect(missingInCurrent).toEqual([]);

    // Simular un ejercicio nuevo agregado sin metadatos
    const mockLibrary: Exercise[] = [
      ...DEFAULT_EXERCISES,
      {
        id: 'ejercicio-nuevo-sin-metadatos',
        name: 'Ejercicio Nuevo',
        muscle: 'pecho',
        equipment: 'barra',
        kind: 'weight_reps',
      },
    ];
    const detected = findExercisesWithoutMetadata(mockLibrary);
    expect(detected).toEqual(['ejercicio-nuevo-sin-metadatos']);
  });

  it('detecta identificadores huérfanos en la matriz que no corresponden a la biblioteca', () => {
    // La matriz actual no tiene ningún ID huérfano
    const orphans = findOrphanMetadataIds(DEFAULT_EXERCISES);
    expect(orphans).toEqual([]);

    // Simular una entrada huérfana en la matriz
    const mockMatrix = {
      ...EXERCISE_EVIDENCE_MATRIX,
      'ejercicio-fantasma-inexistente': {
        patron: 'aislamiento' as const,
        musculos: [{ id: 'biceps' as const, rol: 'principal' as const, intensidad: 100 }],
        evidencia: 'estimada' as const,
        fuentes: [],
      },
    };
    const detectedOrphans = findOrphanMetadataIds(DEFAULT_EXERCISES, mockMatrix);
    expect(detectedOrphans).toEqual(['ejercicio-fantasma-inexistente']);
  });

  it('validador estricto detecta fuentes mal formadas en ejecución offline', () => {
    // Todas las fuentes reales de la matriz son válidas
    for (const item of Object.values(EXERCISE_EVIDENCE_MATRIX)) {
      const res = validateScientificSources(item.fuentes);
      expect(res.valid).toBe(true);
      expect(res.errors).toEqual([]);
    }

    // Comprobar detección de múltiples casos mal formados
    expect(validateScientificSources(null as unknown as unknown[]).valid).toBe(false);
    expect(validateScientificSources(['no un objeto']).valid).toBe(false);

    // Título ausente o vacío
    expect(validateScientificSources([{ titulo: '', autores: ['Autor'], año: 2020, doi: '10.1000/123' }]).valid).toBe(false);

    // Autores vacíos o mal formados
    expect(validateScientificSources([{ titulo: 'Test', autores: [], año: 2020, doi: '10.1000/123' }]).valid).toBe(false);
    expect(validateScientificSources([{ titulo: 'Test', autores: ['  '], año: 2020, doi: '10.1000/123' }]).valid).toBe(false);

    // Año no entero o fuera de rango
    expect(validateScientificSources([{ titulo: 'Test', autores: ['Autor'], año: 1850, doi: '10.1000/123' }]).valid).toBe(false);
    expect(validateScientificSources([{ titulo: 'Test', autores: ['Autor'], año: 2020.5, doi: '10.1000/123' }]).valid).toBe(false);

    // Sin DOI ni URL
    expect(validateScientificSources([{ titulo: 'Test', autores: ['Autor'], año: 2020 }]).valid).toBe(false);

    // DOI mal formado
    expect(validateScientificSources([{ titulo: 'Test', autores: ['Autor'], año: 2020, doi: 'doi-invalido' }]).valid).toBe(false);

    // URL mal formada o no permitida (ftp, credenciales)
    expect(validateScientificSources([{ titulo: 'Test', autores: ['Autor'], año: 2020, url: 'no-es-url' }]).valid).toBe(false);
    expect(validateScientificSources([{ titulo: 'Test', autores: ['Autor'], año: 2020, url: 'ftp://ftp.example.com' }]).valid).toBe(false);
    expect(validateScientificSources([{ titulo: 'Test', autores: ['Autor'], año: 2020, url: 'https://user:pass@example.com' }]).valid).toBe(false);
  });

  it('mantiene total compatibilidad con exerciseActivation y sessionMuscles', () => {
    // 1. exerciseActivation funciona idénticamente para cada ejercicio de la biblioteca enriquecida
    for (const ex of DEFAULT_EXERCISES) {
      const acts = exerciseActivation(ex);
      expect(acts.length).toBeGreaterThan(0);
      expect(acts.find((a) => a.group === ex.muscle)?.pct).toBe(acts[0].pct);
    }

    // 2. sessionMuscles pondera series y normaliza correctamente
    const bench = DEFAULT_EXERCISES.find((e) => e.id === 'press-banca')!;
    const row = DEFAULT_EXERCISES.find((e) => e.id === 'remo-barra')!;
    const session = sessionMuscles([
      { exercise: bench, sets: 4 },
      { exercise: row, sets: 4 },
    ]);
    expect(session.length).toBeGreaterThan(0);
    expect(session.some((s) => s.group === 'pecho')).toBe(true);
    expect(session.some((s) => s.group === 'espalda')).toBe(true);

    // 3. Un ejercicio con science no altera la activación basada en el modelo visual/regiones
    const customWithScience: Exercise = {
      id: 'custom-aislamiento-puro',
      name: 'Custom Curl',
      muscle: 'biceps',
      secondary: ['antebrazo'],
      equipment: 'mancuernas',
      kind: 'weight_reps',
      science: {
        patron: 'aislamiento',
        musculos: [
          { id: 'biceps-corta', rol: 'principal', intensidad: 100 },
          { id: 'antebrazo', rol: 'secundario', intensidad: 55 },
        ],
        evidencia: 'estimada',
        fuentes: [],
      },
    };
    const customActs = exerciseActivation(customWithScience);
    expect(customActs[0].group).toBe('biceps');
    expect(customActs[0].pct).toBe(100);
    expect(customActs[1].group).toBe('antebrazo');
    expect(customActs[1].pct).toBe(50);
  });

  it('genera y mantiene el documento entregable docs/evidencia-ejercicios.md al día con la matriz', () => {
    const stats = getLibraryEvidenceStats();

    let md = `# Investigación de evidencia científica y cobertura de la biblioteca de ejercicios

Documento entregable de investigación y matriz científica para los 130 ejercicios base de WorkStation (Issue #49, parte de la épica #34).

---

## 1. Objetivo y Criterios Metodológicos

El propósito de esta investigación es verificar fuentes científicas primarias contrastadas antes de poblar los metadatos de la biblioteca base de ejercicios, asegurando rigor científico e integridad de datos:

1. **Distinción inequívoca entre metodologías experimentales:**
   - **Hipertrofia (\`hipertrofia\`):** Estudios de intervención longitudinal (habitualmente de 8 a 12 semanas) que cuantifican el cambio volumétrico o anatómico de la sección transversal muscular (CSA) mediante resonancia magnética nuclear (MRI) o ecografía cuantitativa. Representa la adaptación estructural a largo plazo.
   - **Electromiografía (\`emg\`):** Ensayos experimentales agudos que registran la amplitud de la señal mioeléctrica de superficie (sEMG) normalizada al porcentaje de contracción isométrica voluntaria máxima (%MVC o %MVIC). Refleja excitación neuromuscular bajo variantes biomecánicas concretas, no necesariamente hipertrofia equivalente.
   - **Estimación biomecánica (\`estimada\`):** Determinación analítica a partir de la anatomía funcional del aparato locomotor, brazos de momento de fuerza y cinemática articular en aquellas variantes donde no existe literatura empírica directa de laboratorio.
2. **Tolerancia cero a citas inventadas:**
   - La regla del contrato científico (\`exerciseScienceSchema\`) exige que todo ejercicio con \`evidencia: 'estimada'\` tenga exactamente cero fuentes (\`fuentes: []\`).
   - Las citas solo se atribuyen cuando el ejercicio específico evaluado en el ensayo clínico o biomecánico coincide exactamente con el movimiento de la biblioteca.
3. **Verificación manual y técnica de fuentes:**
   - Cada fuente cuenta con título completo, autores reales, año entero, DOI resuelto (comprobado con respuesta HTTP 302 hacia la editorial) o URL primaria accesible en repositorios abiertos certificados (PubMed Central / PMC), fecha de consulta (\`2026-10-31\`) y variante explícita examinada en el laboratorio.

---

## 2. Contabilidad y Cobertura de la Biblioteca Base

La biblioteca base (\`DEFAULT_EXERCISES\`) contiene exactamente **130 ejercicios**. La cobertura de la investigación se resume en las siguientes métricas cuantitativas:

### 2.1 Resumen Global

| Métrica | Ejercicios | Porcentaje |
| :--- | :---: | :---: |
| **Total biblioteca base** | **130** | **100,0 %** |
| **Evidencia directa medida total** | **69** | **53,1 %** |
| ↳ *Estudios de hipertrofia por MRI/ecografía* (\`hipertrofia\`) | 9 | 6,9 % |
| ↳ *Estudios de electromiografía de superficie* (\`emg\`) | 60 | 46,2 % |
| **Evidencia biomecánica estimada** (\`estimada\`, sin citas) | **61** | **46,9 %** |

### 2.2 Desglose por Patrón de Movimiento

Los 11 patrones fundamentales del contrato (\`MOVEMENT_PATTERNS\`) presentan la siguiente distribución:

| Patrón de Movimiento | Total | Hipertrofia | EMG | Estimada | Cobertura Directa |
| :--- | :---: | :---: | :---: | :---: | :---: |
`;

    for (const p of MOVEMENT_PATTERNS) {
      const s = stats.byPattern[p];
      const covPct = Math.round(((s.emg + s.hipertrofia) / s.total) * 100);
      md += `| \`${p}\` | ${s.total} | ${s.hipertrofia} | ${s.emg} | ${s.estimada} | ${covPct} % |\n`;
    }

    md += `
### 2.3 Desglose por Grupo Muscular Principal

| Grupo Muscular | Ejercicios | Hipertrofia | EMG | Estimada | Cobertura Directa |
| :--- | :---: | :---: | :---: | :---: | :---: |
`;

    const groupStats: Record<string, { total: number; hipertrofia: number; emg: number; estimada: number }> = {};
    for (const ex of DEFAULT_EXERCISES) {
      const g = ex.muscle;
      groupStats[g] ??= { total: 0, hipertrofia: 0, emg: 0, estimada: 0 };
      const item = EXERCISE_EVIDENCE_MATRIX[ex.id];
      groupStats[g].total++;
      if (item.evidencia === 'hipertrofia') groupStats[g].hipertrofia++;
      else if (item.evidencia === 'emg') groupStats[g].emg++;
      else groupStats[g].estimada++;
    }

    for (const [g, s] of Object.entries(groupStats)) {
      const covPct = Math.round(((s.emg + s.hipertrofia) / s.total) * 100);
      md += `| ${MUSCLE_LABELS[g as keyof typeof MUSCLE_LABELS] ?? g} (\`${g}\`) | ${s.total} | ${s.hipertrofia} | ${s.emg} | ${s.estimada} | ${covPct} % |\n`;
    }

    md += `
---

## 3. Tratamiento del Catálogo Externo y Ejercicios Personalizados

Para no comprometer la rigurosidad científica del sistema, se establecen los siguientes principios arquitectónicos implementados en \`shared/exercise-evidence.ts\` (\`resolveCatalogExerciseScience\`):

### 3.1 Catálogo Externo (\`app/public/catalog.json\`, 876 ejercicios)
- **Prohibición de herencia indebida:** En la interfaz visual (\`shared/muscle-detail.ts\`), los ejercicios del catálogo externo pueden compartir el mapa muscular estético mediante el identificador \`media\` para ilustrar qué zonas aproximadas intervienen. No obstante, **la evidencia científica (\`evidencia\`) y las citas (\`fuentes\`) jamás se heredan**.
- **Justificación científica:** Que dos ejercicios compartan un medio visual en el catálogo libre (\`free-exercise-db\`) no garantiza equivalencia en la curva de resistencia, la profundidad articular, el agarre ni la cinemática medida en un protocolo clínico.
- **Estado por defecto:** Todo ejercicio del catálogo externo sin validación experimental específica se tipa como \`evidencia: 'estimada'\` con \`fuentes: []\`.

### 3.2 Ejercicios Personalizados del Usuario (\`custom: true\`)
- Los ejercicios dados de alta manualmente por el usuario o procedentes de copias de seguridad anteriores carecen de ensayos empíricos asociados en la literatura médica.
- Se clasifican automáticamente como \`evidencia: 'estimada'\` con \`fuentes: []\`, asignando rol principal (100) al músculo primario y rol secundario (50) a los secundarios declarados, sin inventar estudios.

---

## 4. Bibliografía de Fuentes Primarias Verificadas

Todas las fuentes citadas a continuación han sido consultadas y comprobadas en fecha **2026-10-31**. Cada DOI resuelve al artículo original; los artículos de acceso abierto sin DOI convencional enlazan a su registro primario verificado en PubMed Central (PMC).

1. **Andersen et al. (2014)** — *Effects of grip width on muscle strength and activation in the lat pull-down*. Journal of Strength and Conditioning Research, 28(4), 1135–1142. DOI: [10.1097/JSC.0000000000000232](https://doi.org/10.1097/JSC.0000000000000232).
   - *Variante estudiada:* Jalón en polea alta con agarre ancho, medio y estrecho.
2. **Andersen et al. (2018)** — *Electromyographic Comparison of Barbell Deadlift, Hex Bar Deadlift, and Hip Thrust Exercises: A Cross-Over Study*. Journal of Strength and Conditioning Research, 32(3), 587–593. DOI: [10.1519/JSC.0000000000001826](https://doi.org/10.1519/JSC.0000000000001826).
   - *Variante estudiada:* Peso muerto con barra convencional, peso muerto con barra hexagonal e hip thrust con barra a 1RM.
3. **Boren et al. (2011)** — *Electromyographic analysis of gluteus medius and gluteus maximus during rehabilitation exercises*. International Journal of Sports Physical Therapy, 6(3), 206–223. URL: [PMC3201064](https://pmc.ncbi.nlm.nih.gov/articles/PMC3201064/).
   - *Variante estudiada:* Abducción de cadera en decúbito lateral y máquina para glúteo medio y TFL.
4. **Calatayud et al. (2015)** — *Bench press and push-up at comparable levels of muscle activity results in similar strength gains*. Journal of Strength and Conditioning Research, 29(1), 246–253. DOI: [10.1519/JSC.0000000000000589](https://doi.org/10.1519/JSC.0000000000000589).
   - *Variante estudiada:* Flexiones en suelo (push-up) con resistencia de bandas elásticas calibrada frente a press de banca.
5. **Comfort et al. (2011)** — *An electromyographical comparison of trunk muscle activity during isometric trunk and dynamic strengthening exercises*. Journal of Strength and Conditioning Research, 25(1), 149–154. DOI: [10.1519/JSC.0b013e3181fb412f](https://doi.org/10.1519/JSC.0b013e3181fb412f).
   - *Variante estudiada:* Cargada de potencia con barra (power clean) y ejercicios de estabilización de tronco.
6. **Contreras et al. (2015)** — *A Comparison of Gluteus Maximus, Biceps Femoris, and Vastus Lateralis Electromyographic Activity in the Back Squat and Barbell Hip Thrust Exercises*. Journal of Applied Biomechanics, 31(6), 452–458. DOI: [10.1123/jab.2014-0301](https://doi.org/10.1123/jab.2014-0301).
   - *Variante estudiada:* Hip thrust con barra en banco horizontal frente a sentadilla trasera con barra a 10RM.
7. **Coratella et al. (2020)** — *An Electromyographic Analysis of Lateral Raise Variations and Frontal Raise in Competitive Bodybuilders*. International Journal of Environmental Research and Public Health, 17(17), 6015. DOI: [10.3390/ijerph17176015](https://doi.org/10.3390/ijerph17176015).
   - *Variante estudiada:* Elevaciones laterales con mancuernas (rotación neutra e interna) y elevaciones frontales.
8. **Davidson & Hubley-Kozey (2001)** — *Electromyographic activity of selected trunk muscles during dynamic spine stabilization exercises*. Archives of Physical Medicine and Rehabilitation, 82(6), 800–806. DOI: [10.1053/apmr.2001.26082](https://doi.org/10.1053/apmr.2001.26082).
   - *Variante estudiada:* Ejercicio dinámico de estabilización lumbo-pélvica dead bug (dying bug) en suelo.
9. **Ebben et al. (2011)** — *Kinetic analysis of several variations of push-ups*. Journal of Strength and Conditioning Research, 25(10), 2891–2894. DOI: [10.1519/JSC.0b013e31820c8587](https://doi.org/10.1519/JSC.0b013e31820c8587).
   - *Variante estudiada:* Flexiones declinadas con elevación de pies a 30 cm y 60 cm.
10. **Ekstrom et al. (2007)** — *Electromyographic analysis of core trunk, hip, and thigh muscles during 9 rehabilitation exercises*. Journal of Orthopaedic & Sports Physical Therapy, 37(12), 754–762. DOI: [10.2519/jospt.2007.2471](https://doi.org/10.2519/jospt.2007.2471).
    - *Variante estudiada:* Plancha prona (prone bridge), plancha lateral (side bridge) y puente de glúteos en suelo.
11. **Ema et al. (2013)** — *Inhomogeneous architectural changes of the quadriceps femoris induced by resistance training*. European Journal of Applied Physiology, 113(11), 2691–2703. DOI: [10.1007/s00421-013-2700-1](https://doi.org/10.1007/s00421-013-2700-1).
    - *Variante estudiada:* Extensión de rodilla en máquina (leg extension); hipertrofia regional evaluada por ecografía/MRI.
12. **Escamilla et al. (2001)** — *Effects of technique variations on knee biomechanics during the squat and leg press*. Medicine & Science in Sports & Exercise, 33(9), 1552–1566. DOI: [10.1097/00005768-200109000-00020](https://doi.org/10.1097/00005768-200109000-00020).
    - *Variante estudiada:* Prensa de piernas a 45° con apoyo alto y bajo de pies, y sentadilla con barra.
13. **Escamilla et al. (2002)** — *An electromyographic analysis of sumo and conventional style deadlifts*. Medicine & Science in Sports & Exercise, 34(4), 682–688. DOI: [10.1097/00005768-200204000-00019](https://doi.org/10.1097/00005768-200204000-00019).
    - *Variante estudiada:* Peso muerto convencional frente a peso muerto estilo sumo con barra.
14. **Escamilla et al. (2006)** — *Electromyographic analysis of traditional and nontraditional abdominal exercises: implications for rehabilitation and training*. Physical Therapy, 86(5), 656–671. DOI: [10.1093/ptj/86.5.656](https://doi.org/10.1093/ptj/86.5.656).
    - *Variante estudiada:* Crunch abdominal en suelo y elevación de piernas colgado en barra (hanging leg raise).
15. **Escamilla et al. (2010)** — *Core muscle activation during Swiss ball and traditional abdominal exercises*. Journal of Orthopaedic & Sports Physical Therapy, 40(5), 265–276. DOI: [10.2519/jospt.2010.3073](https://doi.org/10.2519/jospt.2010.3073).
    - *Variante estudiada:* Despliegue con rueda abdominal / balón suizo (roll-out) frente a crunch tradicional.
16. **Fenwick et al. (2009)** — *Comparison of different rowing exercises: trunk muscle activation and lumbar spine motion, load, and stiffness*. Journal of Strength and Conditioning Research, 23(5), 1408–1417. DOI: [10.1519/JSC.0b013e3181b07334](https://doi.org/10.1519/JSC.0b013e3181b07334).
    - *Variante estudiada:* Remo inclinado con barra libre, remo invertido con peso corporal y remo unilateral en polea.
17. **Gullett et al. (2009)** — *A Biomechanical Comparison of Back and Front Squats in Healthy Trained Individuals*. Journal of Strength and Conditioning Research, 23(1), 284–292. DOI: [10.1519/JSC.0b013e31818546bb](https://doi.org/10.1519/JSC.0b013e31818546bb).
    - *Variante estudiada:* Sentadilla frontal con barra en clavícula comparada con sentadilla trasera.
18. **Kinoshita, Maeo et al. (2023)** — *Triceps surae muscle hypertrophy is greater after standing versus seated calf-raise training*. Frontiers in Physiology, 14, 1272106. DOI: [10.3389/fphys.2023.1272106](https://doi.org/10.3389/fphys.2023.1272106).
    - *Variante estudiada:* Elevación de talones de pie vs sentado en máquina; hipertrofia de gastrocnemios y sóleo evaluada por MRI.
19. **Kubo et al. (2019)** — *Effects of squat training with different depths on lower limb muscle volumes*. European Journal of Applied Physiology, 119(9), 1933–1942. DOI: [10.1007/s00421-019-04181-y](https://doi.org/10.1007/s00421-019-04181-y).
    - *Variante estudiada:* Sentadilla trasera profunda (full squat) vs media sentadilla con barra; hipertrofia por MRI de cuádriceps, glúteos y aductores.
20. **Lauver et al. (2016)** — *Influence of bench angle on upper extremity muscular activation during bench press exercise*. European Journal of Sport Science, 16(3), 309–316. DOI: [10.1080/17461391.2015.1022605](https://doi.org/10.1080/17461391.2015.1022605).
    - *Variante estudiada:* Press de banca con barra a ángulos de -15° (declinado), 0° (plano), 30° y 45° (inclinado).
21. **Lawrence et al. (2019)** — *Biomechanical Comparison of the Reverse Hyperextension Machine and the Hyperextension Exercise*. Journal of Strength and Conditioning Research, 33(8), 2053–2056. DOI: [10.1519/JSC.0000000000003146](https://doi.org/10.1519/JSC.0000000000003146).
    - *Variante estudiada:* Hiperextensión de tronco en banco inclinado a 45°.
22. **Lehman (2005)** — *The influence of grip width and forearm pronation/supination on upper-body myoelectric activity during the flat bench press*. Journal of Strength and Conditioning Research, 19(3), 587–591. DOI: [10.1519/R-15024.1](https://doi.org/10.1519/R-15024.1).
    - *Variante estudiada:* Press de banca con agarre estrecho (close-grip) y pronado/supinado.
23. **Lehman et al. (2004)** — *Variations in muscle activation levels during traditional latissimus dorsi weight training exercises: An experimental study*. Dynamic Medicine, 3, 4. DOI: [10.1186/1476-5918-3-4](https://doi.org/10.1186/1476-5918-3-4).
    - *Variante estudiada:* Jalón al pecho pronado y supino, y remo sentado en polea baja con agarre neutro.
24. **Maeo et al. (2021)** — *Greater Hamstrings Muscle Hypertrophy but Similar Damage Protection after Training at Long versus Short Muscle Lengths*. Medicine & Science in Sports & Exercise, 53(4), 825–837. DOI: [10.1249/MSS.0000000000002523](https://doi.org/10.1249/MSS.0000000000002523).
    - *Variante estudiada:* Curl femoral sentado vs curl femoral tumbado en máquina; hipertrofia de isquiotibiales por MRI.
25. **Maeo et al. (2023)** — *Triceps brachii hypertrophy is substantially greater after elbow extension training performed in the overhead versus neutral arm position*. European Journal of Sport Science, 23(7), 1240–1250. DOI: [10.1080/17461391.2022.2100279](https://doi.org/10.1080/17461391.2022.2100279).
    - *Variante estudiada:* Extensión de tríceps en polea en posición neutra vs extensión sobre la cabeza; hipertrofia de las 3 cabezas por MRI.
26. **Marchetti & Uchida (2011)** — *Effects of the pullover exercise on the pectoralis major and latissimus dorsi muscles as evaluated by EMG*. Journal of Applied Biomechanics, 27(4), 380–384. DOI: [10.1123/jab.27.4.380](https://doi.org/10.1123/jab.27.4.380).
    - *Variante estudiada:* Pullover con barra y mancuerna sobre banco horizontal.
27. **Marcolin et al. (2018)** — *Differences in electromyographic activity of biceps brachii and brachioradialis while performing three variants of curl*. PeerJ, 6, e5165. DOI: [10.7717/peerj.5165](https://doi.org/10.7717/peerj.5165).
    - *Variante estudiada:* Curl de bíceps con barra recta, barra EZ y mancuernas.
28. **McAllister et al. (2013)** — *Effect of Grip Width on Electromyographic Activity During the Upright Row*. Journal of Strength and Conditioning Research, 27(1), 181–187. DOI: [10.1519/JSC.0b013e31824f23ad](https://doi.org/10.1519/JSC.0b013e31824f23ad).
    - *Variante estudiada:* Remo al mentón con barra a anchuras de agarre de 50%, 100% y 200% del ancho biacromial.
29. **McAllister et al. (2014)** — *Muscle activation during various hamstring exercises*. Journal of Strength and Conditioning Research, 28(6), 1573–1580. DOI: [10.1519/JSC.0000000000000302](https://doi.org/10.1519/JSC.0000000000000302).
    - *Variante estudiada:* Peso muerto rumano con barra (RDL) comparado con curl femoral y good morning.
30. **McCurdy et al. (2010)** — *Comparison of lower extremity EMG between the 2-leg squat and modified single-leg squat in female athletes*. Journal of Sport Rehabilitation, 19(1), 57–70. DOI: [10.1123/jsr.19.1.57](https://doi.org/10.1123/jsr.19.1.57).
    - *Variante estudiada:* Sentadilla unilateral modificada (sentadilla búlgara con mancuernas).
31. **McGill & Marshall (2012)** — *Kettlebell swing, snatch, and bottoms-up carry: back and hip muscle activation, motion, and low back loads*. Journal of Strength and Conditioning Research, 26(1), 16–27. DOI: [10.1519/JSC.0b013e31823a4063](https://doi.org/10.1519/JSC.0b013e31823a4063).
    - *Variante estudiada:* Balanceo con kettlebell ruso a dos manos (kettlebell swing) y cargas en la columna lumbar.
32. **McKenzie et al. (2022)** — *Bench, Bar, and Ring Dips: Do Kinematics and Muscle Activity Differ?* International Journal of Environmental Research and Public Health, 19(20), 13211. DOI: [10.3390/ijerph192013211](https://doi.org/10.3390/ijerph192013211).
    - *Variante estudiada:* Fondos en barras paralelas (bar dips) y fondos en banco (bench dips).
33. **Neto et al. (2020)** — *Gluteus Maximus Activation during Common Strength and Hypertrophy Exercises: A Systematic Review*. Journal of Sports Science and Medicine, 19(1), 195–203. URL: [PMC7039033](https://pmc.ncbi.nlm.nih.gov/articles/PMC7039033/).
    - *Variante estudiada:* Zancadas (lunges), step-ups y zancadas caminando en activación electromiográfica.
34. **Oliveira et al. (2009)** — *Effect of the shoulder position on the biceps brachii EMG in different dumbbell curls*. Journal of Sports Science and Medicine, 8(1), 24–29. URL: [PMC3737788](https://pmc.ncbi.nlm.nih.gov/articles/PMC3737788/).
    - *Variante estudiada:* Curl de bíceps con mancuernas en banco inclinado y banco predicador (Scott).
35. **Pizzari et al. (2014)** — *Modifying a shrug exercise can facilitate the upward rotator muscles of the scapula*. Clinical Biomechanics, 29(2), 201–205. DOI: [10.1016/j.clinbiomech.2013.11.011](https://doi.org/10.1016/j.clinbiomech.2013.11.011).
    - *Variante estudiada:* Encogimientos de hombros con barra y mancuernas de pie.
36. **Saeterbakken & Fimland (2013)** — *Effects of body position and loading modality on muscle activity and strength in shoulder presses*. Journal of Strength and Conditioning Research, 27(7), 1824–1831. DOI: [10.1519/JSC.0b013e318276b873](https://doi.org/10.1519/JSC.0b013e318276b873).
    - *Variante estudiada:* Press de hombros de pie y sentado con barra y mancuernas.
37. **Saeterbakken et al. (2011)** — *A comparison of muscle activity and 1-RM strength of three chest-press exercises with different stability requirements*. Journal of Sports Sciences, 29(5), 533–538. DOI: [10.1080/02640414.2010.543916](https://doi.org/10.1080/02640414.2010.543916).
    - *Variante estudiada:* Press de banca plano con barra libre, mancuernas y máquina Smith.
38. **Serner et al. (2014)** — *EMG evaluation of hip adduction exercises for soccer players: implications for exercise selection in prevention and treatment of groin injuries*. British Journal of Sports Medicine, 48(14), 1108–1114. DOI: [10.1136/bjsports-2012-091746](https://doi.org/10.1136/bjsports-2012-091746).
    - *Variante estudiada:* Aducción de cadera en máquina y decúbito.
39. **Solstad et al. (2020)** — *A Comparison of Muscle Activation between Barbell Bench Press and Dumbbell Flyes in Resistance-Trained Males*. Journal of Sports Science and Medicine, 19(4), 645–651. URL: [PMC7675616](https://pmc.ncbi.nlm.nih.gov/articles/PMC7675616/).
    - *Variante estudiada:* Aperturas con mancuernas en banco plano (dumbbell flyes) comparadas con press de banca.
40. **Trebs et al. (2010)** — *An electromyographical analysis of 3 different incline positions during the bench press exercise*. Journal of Strength and Conditioning Research, 24(7), 1925–1930. DOI: [10.1519/JSC.0b013e3181ddfae7](https://doi.org/10.1519/JSC.0b013e3181ddfae7).
    - *Variante estudiada:* Press inclinado con barra a 0°, 28°, 44° y 56°.
41. **Vigotsky et al. (2015)** — *Effects of load on good morning kinematics and EMG activity*. PeerJ, 3, e708. DOI: [10.7717/peerj.708](https://doi.org/10.7717/peerj.708).
    - *Variante estudiada:* Buenos días (good morning) con barra a diferentes cargas.
42. **Winwood et al. (2014)** — *A Biomechanical Analysis of the Farmers Walk, and Comparison with the Deadlift and Unloaded Walk*. International Journal of Sports Science & Coaching, 9(5), 1127–1143. DOI: [10.1260/1747-9541.9.5.1127](https://doi.org/10.1260/1747-9541.9.5.1127).
    - *Variante estudiada:* Paseo del granjero (farmers walk) con carga pesada y submáxima.
43. **Youdas et al. (2010)** — *Surface electromyographic activation patterns and elbow joint motion during a pull-up, chin-up, or perfect-pullup™ rotational exercise*. Journal of Strength and Conditioning Research, 24(12), 3404–3414. DOI: [10.1519/JSC.0b013e3181f1598c](https://doi.org/10.1519/JSC.0b013e3181f1598c).
    - *Variante estudiada:* Dominadas pronadas estándar (pull-up) y dominadas supinas (chin-up).

---

## 5. Matriz Completa por ID de \`DEFAULT_EXERCISES\` (130 ejercicios)

A continuación se detalla la matriz científica completa de los 130 ejercicios base. Cada entrada incluye su identificador único, nombre oficial, patrón biomecánico propuesto, desglose muscular con roles e intensidades finitas (0–100), estado de evidencia y citas comprobadas.

| # | ID (\`id\`) | Nombre | Patrón (\`patron\`) | Músculos (Rol e Intensidad) | Evidencia | Citas / Estudios |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- |
`;

    let idx = 1;
    for (const ex of DEFAULT_EXERCISES) {
      const item = EXERCISE_EVIDENCE_MATRIX[ex.id];
      const muscStr = item.musculos
        .map((m) => {
          const label = REGIONS[m.id as keyof typeof REGIONS]?.[1] ?? MUSCLE_LABELS[m.id as keyof typeof MUSCLE_LABELS] ?? m.id;
          return `${label} (${m.rol}: ${m.intensidad}%)`;
        })
        .join('; ');

      let citStr = '*(Sin citas: evidencia estimada)*';
      if (item.fuentes.length > 0) {
        citStr = item.fuentes
          .map((f) => {
            const ref = f.doi ? `DOI: [${f.doi}](https://doi.org/${f.doi})` : `[URL](${f.url})`;
            const firstAuthor = f.autores[0].split(' ').pop();
            return `${firstAuthor} et al. (${f.año}), ${ref}`;
          })
          .join('<br>');
      }

      md += `| ${idx++} | \`${ex.id}\` | ${ex.name} | \`${item.patron}\` | ${muscStr} | \`${item.evidencia}\` | ${citStr} |\n`;
    }

    const outPath = path.resolve(__dirname, '../docs/evidencia-ejercicios.md');
    fs.writeFileSync(outPath, md, 'utf8');
    expect(fs.existsSync(outPath)).toBe(true);
    expect(fs.statSync(outPath).size).toBeGreaterThan(15000);
  });
});
