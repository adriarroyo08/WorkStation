import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const DOC_PATH = path.resolve(__dirname, '../docs/declaraciones-play.md');
const PLAN_BETA_PATH = path.resolve(__dirname, '../docs/plan-beta.md');

describe('declaraciones de seguridad de los datos y salud para Google Play (issue #160)', () => {
  it('el documento docs/declaraciones-play.md existe y tiene contenido sustancial', () => {
    expect(fs.existsSync(DOC_PATH)).toBe(true);
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    expect(content.length).toBeGreaterThan(5000);
  });

  it('incluye el inventario trazable con todas las categorías requeridas', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    const requiredCategories = [
      'Cuenta y Autenticación',
      'Entrenamientos y Planificación',
      'Medidas Corporales',
      'Frecuencia Cardíaca',
      'Supabase',
      'Credenciales del Protocolo MCP',
      'Google Identity',
      'Proveedores del Módulo Coach IA',
    ];

    for (const cat of requiredCategories) {
      expect(content).toContain(cat);
    }

    // Comprueba que distingue taxativamente entre almacenamiento local, transferencia y terceros
    expect(content).toContain('Almacenamiento local');
    expect(content).toContain('Transferencia / Tránsito');
    expect(content).toContain('Terceros involucrados');
  });

  it('todos los ficheros del repositorio citados en el documento existen físicamente', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    // Busca enlaces a ficheros relativos [texto](ruta) o rutas entre comillas/backticks
    const linkMatches = [...content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
    const docsDir = path.dirname(DOC_PATH);

    for (const match of linkMatches) {
      const target = match[2];
      // Ignorar anclas internas (#...), URLs remotas (https://...) e issues de GitHub
      if (target.startsWith('#') || target.startsWith('http://') || target.startsWith('https://')) {
        continue;
      }

      const cleanTarget = target.split('#')[0];
      if (!cleanTarget) continue;

      const resolved = path.resolve(docsDir, cleanTarget);
      expect(fs.existsSync(resolved), `El enlace relativo '${target}' no apunta a un fichero existente: ${resolved}`).toBe(true);
    }
  });

  it('contiene el borrador de Seguridad de los datos (Data safety) con desglose por categorías', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    expect(content).toContain('Seguridad de los datos');
    expect(content).toContain('Información Personal');
    expect(content).toContain('Salud y Actividad Física');
    expect(content).toContain('Rendimiento de la Aplicación');
    expect(content).toContain('Datos Expresamente NO Recopilados');

    // Comprueba preguntas clave
    expect(content).toContain('cifran en tránsito');
    expect(content).toContain('solicitar que se eliminen sus datos');
  });

  it('contiene la declaración de apps de salud con categorías, permisos biométricos y descargo médico', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    expect(content).toContain('Declaración de Aplicaciones de Salud');
    expect(content).toContain('Actividad y estado físico');
    expect(content).toContain('android.permission.BODY_SENSORS');
    expect(content).toContain('android.permission.health.READ_HEART_RATE');
    expect(content).toContain('android.permission.FOREGROUND_SERVICE_HEALTH');
    expect(content).toContain('Descargo de Responsabilidad Médica');
    expect(content).toContain('no es un dispositivo médico ni un software clínico');
  });

  it('distingue las funciones actuales de Health Connect (pendiente en #31 y #163)', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    expect(content).toContain('Diferenciación frente a Android Health Connect');
    expect(content).toContain('#31');
    expect(content).toContain('#163');
    expect(content).toContain('revision-hevy.md');
    expect(content).toContain('NO declarar integración con Health Connect en esta fase');
  });

  it('identifica retención, eliminación (#146), URL externa y marca [Adrián] donde falta identidad o validación', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    expect(content).toContain('#146');
    expect(content).toContain('Borrar datos locales');
    expect(content).toContain('answer/13327111');
    expect(content).toContain('[Adrián]');
    expect(content).toContain('responsable del tratamiento');
    expect(content).toContain('Buzón oficial');
  });

  it('no presenta los borradores como asesoramiento legal', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    expect(content).toContain('No constituye asesoramiento legal');
  });

  it('todas las fuentes oficiales incluyen URL canónica HTTPS y fecha de consulta', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    const requiredSources = [
      'https://support.google.com/googleplay/android-developer/answer/10787469',
      'https://support.google.com/googleplay/android-developer/answer/12261419',
      'https://support.google.com/googleplay/android-developer/answer/13327111',
      'https://support.google.com/googleplay/android-developer/answer/101449',
      'https://developer.android.com/health-and-fitness/guides/health-connect',
      'https://developer.android.com/docs/quality-guidelines/wear-app-quality',
    ];

    for (const url of requiredSources) {
      expect(content).toContain(url);
    }

    expect(content).toContain('9 de noviembre de 2026');
  });

  it('docs/plan-beta.md enlaza a docs/declaraciones-play.md como material pendiente de validación', () => {
    expect(fs.existsSync(PLAN_BETA_PATH)).toBe(true);
    const planContent = fs.readFileSync(PLAN_BETA_PATH, 'utf8');
    expect(planContent).toContain('declaraciones-play.md');
  });
});
