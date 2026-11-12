import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const DOC_PATH = path.resolve(__dirname, '../docs/revision-hevy.md');

describe('revisión exhaustiva frente a Hevy y priorización de huecos (issue #164)', () => {
  it('el documento docs/revision-hevy.md existe y tiene contenido sustancial', () => {
    expect(fs.existsSync(DOC_PATH)).toBe(true);
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    expect(content.length).toBeGreaterThan(5000);
  });

  it('incluye la fecha de actualización y referencia a la issue #164', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    expect(content).toContain('10 de noviembre de 2026');
    expect(content).toContain('#164');
    expect(content).toContain('#31');
    expect(content).toContain('#37');
    expect(content).toContain('#38');
    expect(content).toContain('investigacion-competidores.md');
  });

  it('no contiene ningún enlace file:// ligado a worktrees ni rutas absolutas locales', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    expect(content).not.toContain('file://');
    expect(content).not.toContain('/home/ubuntu');
  });

  it('todos los enlaces relativos apuntan a ficheros o directorios existentes en el repositorio', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    const docsDir = path.dirname(DOC_PATH);
    const linkMatches = [...content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];

    for (const match of linkMatches) {
      const target = match[2];
      if (target.startsWith('#') || target.startsWith('http://') || target.startsWith('https://')) {
        continue;
      }
      const cleanTarget = target.split('#')[0];
      if (!cleanTarget) continue;

      const resolved = path.resolve(docsDir, cleanTarget);
      expect(fs.existsSync(resolved), `El enlace relativo '${target}' no apunta a un fichero o directorio existente: ${resolved}`).toBe(true);
    }
  });

  it('refleja todas las issues hijas cerradas y abiertas con trazabilidad comprobada', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    const expectedIssues = ['#83', '#85', '#113', '#114', '#115', '#119', '#120', '#121', '#137', '#139', '#163'];

    for (const issue of expectedIssues) {
      expect(content).toContain(issue);
    }
  });

  it('documenta con símbolos reales la implementación completada de H1 a H5', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');

    // H1: Strong CSV
    expect(content).toContain('shared/strong.ts');
    expect(content).toContain('parseStrongCsv');
    expect(content).toContain('StrongImport.tsx');

    // H2: Doble progresión y rangos min-max
    expect(content).toContain('repsMin');
    expect(content).toContain('normalizeRepRange');
    expect(content).toContain('suggestNext');
    expect(content).toContain('RoutineEditor.tsx');

    // H3: RIR y RPE canónico
    expect(content).toContain('effortScale');
    expect(content).toContain('shared/effort.ts');
    expect(content).toContain('effortFromRpe');
    expect(content).toContain('effortToRpe');

    // H4: Ejercicios basados en tiempo e isométricos
    expect(content).toContain('shared/stopwatch.ts');
    expect(content).toContain('durationSec');
    expect(content).toContain('startStopwatch');

    // H5: Detección de estancamiento y descarga
    expect(content).toContain('shared/deload.ts');
    expect(content).toContain('evaluateStagnation');
    expect(content).toContain('createDeloadSuggestion');
  });

  it('no da por completados definitivamente Health Connect (#163) ni Mesociclos (#137)', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');

    // Health Connect (#163) debe registrar que la verificación física y revisión formal están pendientes
    expect(content).toContain('#163');
    expect(content).toMatch(/verificación en (?:hardware|dispositivos?|dispositivo) físico.*pendiente|validación física.*pendiente/i);
    expect(content).toMatch(/no dar por completada definitivamente/i);

    // Mesociclos (#137) debe registrarse como abierta / pendiente de implementación
    expect(content).toContain('#137');
    expect(content).toMatch(/#137.*(?:Abierta|Pendiente de implementación)/i);
  });

  it('contiene la tabla final consolidada y separa hechos comprobados de decisiones pendientes', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');

    // Tabla final y columnas
    expect(content).toContain('Matriz resumen de huecos');
    expect(content).toContain('Prioridad inicial');
    expect(content).toContain('Issue existente');
    expect(content).toContain('Estado actual');

    // Separación taxativa
    expect(content).toContain('Hechos comprobados');
    expect(content).toContain('Decisiones y validaciones pendientes');
  });
});
