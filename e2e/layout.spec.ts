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
  });
