import { describe, expect, it } from 'vitest';
import {
  getAllTopicResearch,
  getEvidenceSummaryForPrompt,
  getTopicResearch,
  RESEARCH_TOPIC_IDS,
  TOPIC_RESEARCH_SHEETS,
  validateAllResearchSheets,
  validateResearchSheet,
  type ResearchEvidenceLevel,
  type ResearchTopicId,
  type TopicResearchSheet,
} from './article-research';

describe('fichas de investigación bibliográfica (Issue #53)', () => {
  it('contiene exactamente las 10 fichas temáticas requeridas', () => {
    expect(TOPIC_RESEARCH_SHEETS).toHaveLength(10);
    expect(RESEARCH_TOPIC_IDS).toHaveLength(10);

    const sheetIds = TOPIC_RESEARCH_SHEETS.map((s) => s.id);
    for (const requiredId of RESEARCH_TOPIC_IDS) {
      expect(sheetIds).toContain(requiredId);
    }
  });

  it('valida el conjunto completo sin errores de esquema ni duplicados', () => {
    const result = validateAllResearchSheets(TOPIC_RESEARCH_SHEETS);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('cada ficha cumple con todos los criterios de aceptación requeridos', () => {
    for (const sheet of TOPIC_RESEARCH_SHEETS) {
      const res = validateResearchSheet(sheet);
      expect(res.valid, `Ficha ${sheet.id} no es válida: ${res.errors.join(', ')}`).toBe(true);

      // Pregunta formulada
      expect(sheet.pregunta.trim().length).toBeGreaterThan(15);
      expect(sheet.pregunta).toMatch(/\?|¿/);

      // Conclusiones permitidas
      expect(sheet.conclusionesPermitidas.length).toBeGreaterThanOrEqual(3);
      for (const conclusion of sheet.conclusionesPermitidas) {
        expect(conclusion.trim().length).toBeGreaterThan(20);
      }

      // Población
      expect(sheet.poblacion.tipo.trim().length).toBeGreaterThan(5);
      expect(sheet.poblacion.detalles.trim().length).toBeGreaterThan(10);

      // Límites metodológicos
      expect(sheet.limites.asociacionVsCausalidad.trim().length).toBeGreaterThan(20);
      expect(sheet.limites.noExtrapolar.length).toBeGreaterThanOrEqual(1);
      expect(sheet.limites.ausenciaEvidencia.length).toBeGreaterThanOrEqual(1);

      // Fuentes científicas
      expect(sheet.fuentes.length).toBeGreaterThanOrEqual(2);
      for (const fuente of sheet.fuentes) {
        expect(fuente.titulo.trim().length).toBeGreaterThan(10);
        expect(fuente.autores.length).toBeGreaterThanOrEqual(1);
        expect(fuente.año).toBeGreaterThanOrEqual(2000);
        expect(fuente.año).toBeLessThanOrEqual(2026);
        expect(fuente.doi).toMatch(/^10\.\d{4,9}\/[^\s]+$/i);
        if (fuente.url) {
          expect(fuente.url).toMatch(/^https:\/\//);
        }
        expect(fuente.fechaConsulta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('prioriza metaanálisis y posiciones oficiales ISSN / ACSM', () => {
    const niveles = TOPIC_RESEARCH_SHEETS.map((s) => s.nivelEvidencia);
    const tipos = TOPIC_RESEARCH_SHEETS.flatMap((s) => s.fuentes.map((f) => f.tipoEstudio));

    expect(niveles).toContain('posicion_oficial');
    expect(niveles).toContain('metaanalisis');
    expect(tipos).toContain('posicion_oficial');
    expect(tipos).toContain('metaanalisis');

    // Ficha creatina contiene posición oficial de la ISSN
    const creatina = getTopicResearch('creatina')!;
    expect(creatina.nivelEvidencia).toBe('posicion_oficial');
    expect(creatina.fuentes.some((f) => f.titulo.includes('International Society of Sports Nutrition position stand'))).toBe(true);

    // Ficha proteína contiene metaanálisis de Morton y posición de la ISSN
    const proteina = getTopicResearch('proteina')!;
    expect(proteina.fuentes.some((f) => f.titulo.includes('Morton'))).toBe(false); // título no tiene Morton
    expect(proteina.fuentes.some((f) => f.autores.some((a) => a.includes('Morton')))).toBe(true);
    expect(proteina.fuentes.some((f) => f.tipoEstudio === 'metaanalisis')).toBe(true);

    // Ficha progresión contiene ACSM position stand
    const progresion = getTopicResearch('progresion')!;
    expect(progresion.fuentes.some((f) => f.titulo.includes('American College of Sports Medicine'))).toBe(true);
  });

  describe('validación de errores y casos límite en validateResearchSheet', () => {
    it('rechaza objetos nulos o no objetos', () => {
      expect(validateResearchSheet(null).valid).toBe(false);
      expect(validateResearchSheet('invalido').valid).toBe(false);
      expect(validateResearchSheet(123).valid).toBe(false);
    });

    it('detecta ID de tema no válido o ausente', () => {
      const invalido = { ...TOPIC_RESEARCH_SHEETS[0], id: 'invalido' as unknown as ResearchTopicId };
      const res = validateResearchSheet(invalido);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('ID de tema ausente o no válido'))).toBe(true);
    });

    it('detecta nivel de evidencia inválido', () => {
      const invalido = { ...TOPIC_RESEARCH_SHEETS[0], nivelEvidencia: 'opinion_personal' as unknown as ResearchEvidenceLevel };
      const res = validateResearchSheet(invalido);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('Nivel de evidencia no válido'))).toBe(true);
    });

    it('detecta fuentes con formato DOI defectuoso', () => {
      const copia = JSON.parse(JSON.stringify(TOPIC_RESEARCH_SHEETS[0])) as TopicResearchSheet;
      copia.fuentes[0].doi = 'invalido-doi-sin-prefijo';
      const res = validateResearchSheet(copia);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('formato de DOI no válido'))).toBe(true);
    });

    it('detecta fuentes sin autores o con año ilógico', () => {
      const copia = JSON.parse(JSON.stringify(TOPIC_RESEARCH_SHEETS[0])) as TopicResearchSheet;
      copia.fuentes[0].autores = [];
      copia.fuentes[0].año = 1850;
      const res = validateResearchSheet(copia);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('al menos un autor'))).toBe(true);
      expect(res.errors.some((e) => e.includes('año no válido'))).toBe(true);
    });

    it('detecta ausencia de conclusiones o límites incompletos', () => {
      const copia = JSON.parse(JSON.stringify(TOPIC_RESEARCH_SHEETS[0])) as Record<string, unknown>;
      copia.conclusionesPermitidas = [];
      copia.limites = {
        noExtrapolar: [],
        ausenciaEvidencia: [],
      };
      const res = validateResearchSheet(copia);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('al menos una conclusión permitida'))).toBe(true);
      expect(res.errors.some((e) => e.includes('Los límites deben incluir'))).toBe(true);
    });
  });

  describe('validación de conjunto completo en validateAllResearchSheets', () => {
    it('detecta arrays incompletos cuando falta un tema', () => {
      const incompleto = TOPIC_RESEARCH_SHEETS.slice(0, 9);
      const res = validateAllResearchSheets(incompleto);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('Falta la ficha requerida'))).toBe(true);
    });

    it('detecta temas duplicados', () => {
      const duplicado = [...TOPIC_RESEARCH_SHEETS, TOPIC_RESEARCH_SHEETS[0]];
      const res = validateAllResearchSheets(duplicado);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('duplicado'))).toBe(true);
    });

    it('rechaza entradas que no sean array', () => {
      expect(validateAllResearchSheets({}).valid).toBe(false);
    });
  });

  describe('funciones de consulta y asistentes', () => {
    it('getTopicResearch devuelve la ficha correspondiente o undefined', () => {
      const sheet = getTopicResearch('sueno');
      expect(sheet).toBeDefined();
      expect(sheet?.id).toBe('sueno');
      expect(sheet?.tema).toContain('sueño');

      expect(getTopicResearch('inexistente')).toBeUndefined();
    });

    it('getAllTopicResearch devuelve todas las fichas', () => {
      const all = getAllTopicResearch();
      expect(all).toHaveLength(10);
    });

    it('getEvidenceSummaryForPrompt genera resumen formateado para el coach', () => {
      const summary = getEvidenceSummaryForPrompt('recomposicion');
      expect(summary).toContain('EVIDENCIA CIENTÍFICA');
      expect(summary).toContain('RECOMPOSICIÓN');
      expect(summary).toContain('Pregunta:');
      expect(summary).toContain('Conclusiones validadas:');
      expect(summary).toContain('Límites y precauciones:');
      expect(summary).toContain('Causalidad:');
      expect(summary).toContain('No extrapolar:');

      expect(getEvidenceSummaryForPrompt('inexistente' as unknown as ResearchTopicId)).toBe('');
    });
  });
});
