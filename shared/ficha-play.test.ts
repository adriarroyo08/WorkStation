import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const DOC_PATH = path.resolve(__dirname, '../docs/ficha-play.md');
const PLAN_BETA_PATH = path.resolve(__dirname, '../docs/plan-beta.md');

describe('ficha de Google Play y Wear OS para la beta cerrada (issue #161)', () => {
  it('el documento docs/ficha-play.md existe y tiene contenido sustancial', () => {
    expect(fs.existsSync(DOC_PATH)).toBe(true);
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    expect(content.length).toBeGreaterThan(5000);
  });

  it('incluye las fuentes oficiales fechadas con URLs canónicas', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    const requiredSources = [
      'https://support.google.com/googleplay/android-developer/answer/9898842',
      'https://support.google.com/googleplay/android-developer/answer/9866151',
      'https://developer.android.com/docs/quality-guidelines/wear-app-quality',
      'https://developer.android.com/training/wearables/packaging',
      'https://support.google.com/googleplay/android-developer/answer/14151465',
      'https://support.google.com/googleplay/android-developer/answer/13295490',
    ];

    for (const url of requiredSources) {
      expect(content).toContain(url);
    }
    expect(content).toContain('9 de noviembre de 2026');
  });

  it('los textos de la ficha principal están dentro de los límites oficiales de caracteres', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');

    // Extrae bloques ```text ... ``` de la sección 3
    const section3Match = content.match(/## 3\. Textos Oficiales de la Ficha Principal[\s\S]*?(?=## 4\.|$)/);
    expect(section3Match).not.toBeNull();
    const s3 = section3Match![0];

    const blocks = [...s3.matchAll(/```text\r?\n([\s\S]*?)\r?\n```/g)].map((m) => m[1]);
    expect(blocks.length).toBeGreaterThanOrEqual(3);

    const title = blocks[0];
    const shortDesc = blocks[1];
    const fullDesc = blocks[2];

    expect(title.length).toBeLessThanOrEqual(30);
    expect(title.length).toBeGreaterThan(0);
    expect(shortDesc.length).toBeLessThanOrEqual(80);
    expect(shortDesc.length).toBeGreaterThan(0);
    expect(fullDesc.length).toBeLessThanOrEqual(4000);
    expect(fullDesc.length).toBeGreaterThan(500);

    // Verificación de política de metadatos (no usar palabras promocionales prohibidas en título)
    expect(title.toLowerCase()).not.toContain('gratis');
    expect(title.toLowerCase()).not.toContain('free');
    expect(title.toLowerCase()).not.toContain('#1');
    expect(title.toLowerCase()).not.toContain('mejor');
  });

  it('los textos de la ficha específica de Wear OS están dentro de los límites oficiales', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');

    const section4Match = content.match(/## 4\. Textos Oficiales de la Ficha Específica para Wear OS[\s\S]*?(?=## 5\.|$)/);
    expect(section4Match).not.toBeNull();
    const s4 = section4Match![0];

    const blocks = [...s4.matchAll(/```text\r?\n([\s\S]*?)\r?\n```/g)].map((m) => m[1]);
    expect(blocks.length).toBeGreaterThanOrEqual(3);

    const wearTitle = blocks[0];
    const wearShort = blocks[1];
    const wearFull = blocks[2];

    expect(wearTitle.length).toBeLessThanOrEqual(30);
    expect(wearTitle.length).toBeGreaterThan(0);
    expect(wearShort.length).toBeLessThanOrEqual(80);
    expect(wearShort.length).toBeGreaterThan(0);
    expect(wearFull.length).toBeLessThanOrEqual(4000);
    expect(wearFull.length).toBeGreaterThan(500);
  });

  it('diferencia taxativamente entre móvil, reloj conectado y reloj autónomo con trazabilidad a código', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');

    // Conceptos clave
    expect(content).toContain('Reloj Conectado');
    expect(content).toContain('Reloj Autónomo');
    expect(content).toContain('Móvil');

    // Ficheros clave de trazabilidad
    expect(content).toContain('WatchUi.kt');
    expect(content).toContain('Local.kt');
    expect(content).toContain('native.ts');
    expect(content).toContain('HeartRateService.kt');
    expect(content).toContain('PhoneLink.kt');
    expect(content).toContain('PhoneListenerService.kt');
  });

  it('prohíbe expresamente anunciar Health Connect y mesociclos como disponibles', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');

    expect(content).toContain('Funciones Pendientes Expresamente Excluidas');
    expect(content).toContain('Health Connect');
    expect(content).toContain('#163');
    expect(content).toContain('Mesociclos');
    expect(content).toContain('#137');
    expect(content).toContain('No citar Health Connect');
    expect(content).toContain('No anunciar planificador de mesociclos');
  });

  it('identidad, contacto y URL de privacidad pendientes marcados [Adrián] y coherencia con ROADMAP.md', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');

    expect(content).toContain('**[Adrián]**');
    expect(content).toContain('Nombre del desarrollador');
    expect(content).toContain('Correo electrónico de contacto');
    expect(content).toContain('URL de la política de privacidad');
    expect(content).toContain('No comerciante');
    expect(content).toContain('100 % gratuita');
    expect(content).toContain('Compras integradas (In-App Purchases) : No activadas');
    expect(content).toContain('No contiene anuncios');
  });

  it('incluye el inventario técnico de recursos gráficos y especificaciones de Wear OS', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');

    expect(content).toContain('512 x 512 px');
    expect(content).toContain('1024 x 500 px');
    expect(content).toContain('1080 x 2400 px');
    expect(content).toContain('450 x 450 px');
    expect(content).toContain('Relación de aspecto 1:1 obligatoria');
    expect(content).toContain('Prohibición de marcos de hardware');
    expect(content).toContain('Prohibición de texto decorativo exterior');
    expect(content).toContain('Fondo negro liso');
  });

  it('incluye guion detallado de capturas con datos ficticios para smartphone y Wear OS', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');

    expect(content).toContain('Carlos Gómez');
    expect(content).toContain('GUION DE CAPTURAS: SMARTPHONE');
    expect(content).toContain('GUION DE CAPTURAS: WEAR OS');
    expect(content).toContain('Press banca');
    expect(content).toContain('Dominadas');
    expect(content).toContain('HomeScreen');
    expect(content).toContain('SetScreen');
    expect(content).toContain('RestScreen');
  });

  it('todos los ficheros relativos del repositorio enlazados existen físicamente', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    const linkMatches = [...content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
    const docsDir = path.dirname(DOC_PATH);

    for (const match of linkMatches) {
      const target = match[2];
      if (target.startsWith('#') || target.startsWith('http://') || target.startsWith('https://')) {
        continue;
      }

      const cleanTarget = target.split('#')[0];
      if (!cleanTarget) continue;

      const resolved = path.resolve(docsDir, cleanTarget);
      expect(fs.existsSync(resolved), `El enlace relativo '${target}' no apunta a un fichero existente: ${resolved}`).toBe(true);
    }
  });

  it('docs/plan-beta.md enlaza a docs/ficha-play.md', () => {
    expect(fs.existsSync(PLAN_BETA_PATH)).toBe(true);
    const planContent = fs.readFileSync(PLAN_BETA_PATH, 'utf8');
    expect(planContent).toContain('ficha-play.md');
  });

  it('incluye descargo de responsabilidad de no publicación en Play Console', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    expect(content).toContain('No constituye publicación efectiva');
    expect(content).toContain('aprobación expresa de **[Adrián]**');
  });
});
