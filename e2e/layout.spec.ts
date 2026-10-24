// Diseño en móviles estrechos (360 px): ninguna pantalla se desborda en horizontal ni corta texto sin elipsis.
// Con SHOTS=/ruta también guarda capturas de cada pantalla para revisarlas.
import type { Page } from '@playwright/test';
import { SAMPLE, expect, seed, tab, test } from './fixtures';
test.use({ viewport: { width: 360, height: 740 } });

async function overflow(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const out: string[] = [];
    const W = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > W + 1) out.push(`PAGE scrollWidth ${document.documentElement.scrollWidth} > ${W}`);
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('[hidden]')) continue;
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      if (b.right > W + 1 && !el.closest('.plates, .chips, .wrapped, .heatmap, svg, .bars, .tabs, .scroll-x'))
        out.push(`${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 40)} right=${Math.round(b.right)} "${(el.textContent ?? '').trim().slice(0, 30)}"`);
      // texto cortado sin elipsis
      if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 2 && cs.overflow !== 'visible' && cs.textOverflow !== 'ellipsis' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName))
        out.push(`CLIP ${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 30)} "${(el.textContent ?? '').trim().slice(0, 30)}"`);
    }
    return [...new Set(out)].slice(0, 12);
  });
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${label}.png`, fullPage: true });
  expect(r, label).toEqual([]);
}

for (const scheme of ['dark', 'light'] as const)
  test(`sin desbordes a 360 px en modo ${scheme}`, async ({ page, errors }) => {
    void errors;
    test.setTimeout(120000);
    page.on('dialog', (d) => d.accept());
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await seed(page, { ...SAMPLE, measurements: [...SAMPLE.measurements, { id: 'm2', date: new Date().toISOString(), bodyweight: 79.4, waist: 82 }] });
    await page.waitForTimeout(600);
    const p = (n: string) => `${scheme}-${n}`;
    await overflow(page, p('01-train'));
    await page.locator('.recovery-row').click();
    await overflow(page, p('02-recovery'));
    await page.keyboard.press('Escape');
    await page.locator('.today').getByRole('button', { name: 'Empezar' }).click();
    await page.waitForTimeout(700);
    await overflow(page, p('03-logger'));
    const row = page.locator('.swipe .set').first();
    await row.getByLabel('Peso (kg)').fill('102,5');
    await row.getByLabel('Repeticiones').fill('5');
    await row.getByLabel('Completar serie').click();
    await page.waitForTimeout(400);
    await overflow(page, p('04-logger-rest'));
    await page.getByRole('button', { name: 'Opciones' }).first().click();
    await overflow(page, p('05-exmenu'));
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Terminar' }).click();
    await page.waitForTimeout(800);
    await overflow(page, p('06-summary'));
    await page.getByRole('button', { name: 'Listo' }).click();
    for (const [i, name] of [
      ['07', 'Historial'],
      ['08', 'Ejercicios'],
      ['09', 'Perfil'],
    ] as const) {
      await tab(page, name).click();
      await page.waitForTimeout(700);
      await overflow(page, p(`${i}-${name}`));
    }
    await tab(page, 'Perfil').click();
    await page.getByRole('button', { name: /Coach IA/ }).click();
    await page.waitForTimeout(700);
    await overflow(page, p('10-Coach'));
    await tab(page, 'Ejercicios').click();
    await page.locator('.exrow', { hasText: 'Press de banca (barra)' }).first().click();
    await page.waitForTimeout(700);
    await overflow(page, p('11-exdetail'));
    for (const t of ['Historial', 'Récords']) {
      await page.locator('.segmented button', { hasText: t }).click();
      await page.waitForTimeout(300);
      await overflow(page, p(`12-ex-${t}`));
    }
    await tab(page, 'Perfil').click();
    await page.getByRole('button', { name: 'Informes' }).click();
    await page.waitForTimeout(600);
    await overflow(page, p('13-reports'));
    await page.getByRole('button', { name: 'Volver' }).first().click();
    await page.getByRole('button', { name: /Medidas/ }).click();
    await page.waitForTimeout(500);
    await overflow(page, p('14-measures'));
    await page.getByRole('button', { name: 'Volver' }).first().click();
    await page.getByRole('button', { name: /Logros/ }).click();
    await page.waitForTimeout(500);
    await overflow(page, p('15-achievements'));
    await page.getByRole('button', { name: 'Volver' }).first().click();
    await page.getByRole('button', { name: 'Ajustes' }).click();
    await page.waitForTimeout(700);
    await overflow(page, p('16-settings'));
    await page.getByRole('button', { name: 'Volver' }).first().click();
    await tab(page, 'Entrenar').click();
    await page.getByRole('button', { name: 'Nueva rutina' }).first().click();
    await page.waitForTimeout(600);
    await overflow(page, p('17-routine-editor'));
  });

// Pantallas secundarias: Explorar, menús, compartir, Wrapped, claves API, copias, Novedades y temporizador de descanso.
for (const scheme of ['dark', 'light'] as const)
  test(`pantallas secundarias a 360 px en modo ${scheme}`, async ({ page, errors }) => {
    void errors;
    test.setTimeout(120000);
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      (navigator as unknown as { share: (d: ShareData) => Promise<void> }).share = async (d) => void ((window as unknown as { shared: ShareData }).shared = d);
    });
    await seed(page, SAMPLE);
    await page.waitForTimeout(600);
    const p = (n: string) => `${scheme}-${n}`;
    const shot = async (n: string) => process.env.SHOTS && (await page.screenshot({ path: `${process.env.SHOTS}/${p(n)}.png` }));
    // Menú de rutina (filas .item)
    await page.locator('.routine', { hasText: 'Torso A' }).getByRole('button', { name: 'Opciones' }).click();
    await page.waitForTimeout(300);
    await overflow(page, p('20-routine-menu'));
    await shot('20v-routine-menu');
    await page.getByRole('button', { name: /Compartir enlace/ }).click();
    const url = await page.waitForFunction(() => (window as unknown as { shared?: ShareData }).shared?.url).then((h) => h.jsonValue() as Promise<string>);
    await page.goto(url.replace(/^https?:\/\/[^/]+\/?/, '/'));
    await page.waitForTimeout(600);
    await overflow(page, p('21-shared-routine'));
    await page.getByRole('button', { name: 'Guardar en mis rutinas' }).click();
    // Explorar programas
    await page
      .getByRole('button', { name: /Explorar/ })
      .first()
      .click();
    await page.waitForTimeout(600);
    await overflow(page, p('22-explore'));
    await page.getByRole('button', { name: 'Volver' }).first().click();
    // Wrapped
    await tab(page, 'Perfil').click();
    await page.getByRole('button', { name: /Tu \d{4} en Workstation/ }).click();
    await page.waitForTimeout(700);
    await overflow(page, p('23-wrapped'));
    await page
      .getByRole('button', { name: /Cerrar/ })
      .first()
      .click();
    // Ajustes: claves API, copias y Novedades
    await page.getByRole('button', { name: 'Ajustes' }).click();
    await page.waitForTimeout(500);
    await page.addStyleTag({ content: '.toast{display:none!important}' });
    await page.getByRole('heading', { name: /Acceso para IA/ }).evaluate((el) => el.scrollIntoView());
    await page.waitForTimeout(400);
    await shot('24-apikeys');
    await page.getByRole('heading', { name: 'Datos', exact: true }).evaluate((el) => el.scrollIntoView());
    await page.waitForTimeout(400);
    await shot('25-datos-copias');
    await page.getByRole('heading', { name: /Copias automáticas/ }).evaluate((el) => el.scrollIntoView());
    await page.waitForTimeout(400);
    await shot('25b-copias');
    await page.getByRole('button', { name: /Novedades/ }).click();
    await page.waitForTimeout(500);
    await overflow(page, p('26-novedades-todas'));
    await page.keyboard.press('Escape');
    // Novedades tras actualizar
    await page.evaluate(() => localStorage.setItem('ws:seenVersion', '1.2.0'));
    await page.reload();
    await page.waitForTimeout(800);
    await overflow(page, p('27-novedades-update'));
    await page.getByRole('button', { name: '¡Genial!' }).click();
    // Temporizador de descanso (solo ventana visible)
    await tab(page, 'Entrenar').click();
    await page.locator('.today').getByRole('button', { name: 'Empezar' }).click();
    const row = page.locator('.swipe .set').first();
    await row.getByLabel('Peso (kg)').fill('100');
    await row.getByLabel('Repeticiones').fill('5');
    await row.getByLabel('Completar serie').click();
    await page.waitForTimeout(400);
    await shot('28-rest-viewport');
  });
