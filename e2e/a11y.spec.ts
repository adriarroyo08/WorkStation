import type { Locator, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SAMPLE, expect, seed, tab, test } from './fixtures';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// No focus() ni clics: cada destino debe ser alcanzable desde el foco real con Tab.
async function reach(page: Page, target: Locator) {
  for (let i = 0; i < 150; i++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((el) => el === document.activeElement)) {
      await expect(target).toBeVisible();
      await expect(target).toBeFocused();
      expect(await target.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
      expect(
        await target.evaluate((el) => {
          const s = getComputedStyle(el);
          const token = document.createElement('span');
          token.style.color = 'var(--accent-ink)';
          document.body.append(token);
          const ink = getComputedStyle(token).color;
          token.remove();
          return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) || (s.borderStyle !== 'none' && s.borderColor === ink);
        }),
      ).toBe(true);
      return;
    }
  }
  throw new Error(`No se alcanza con Tab: ${target}`);
}

async function noMotion(page: Page) {
  expect(
    await page.evaluate(() => {
      const failures: string[] = [];
      for (const el of document.querySelectorAll('*')) {
        for (const pseudo of [null, '::before', '::after']) {
          const s = getComputedStyle(el, pseudo);
          for (const key of ['animationDuration', 'animationDelay', 'transitionDuration', 'transitionDelay'] as const)
            if (s[key].split(',').some((v) => parseFloat(v) > 0)) failures.push(`${el.tagName}.${el.className} ${pseudo ?? ''} ${key}: ${s[key]}`);
        }
      }
      return failures;
    }),
  ).toEqual([]);
}

for (const scheme of ['light', 'dark'] as const) {
  test(`accesibilidad en modo ${scheme}`, async ({ page, errors }) => {
    void errors;
    test.setTimeout(90000);
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await seed(page, SAMPLE);
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(scheme === 'dark' ? 'rgb(20, 20, 20)' : 'rgb(255, 255, 255)');
    const audit = async (name: string) => {
      await expect(page.locator('h1:visible').first()).toBeVisible();
      const r = await new AxeBuilder({ page }).withTags(tags).analyze();
      expect(r.violations, name).toEqual([]);
      await noMotion(page);
    };
    for (const name of ['Entrenar', 'Historial', 'Ejercicios', 'Perfil']) {
      await tab(page, name).click();
      await audit(name);
    }
    await page.getByRole('button', { name: /Coach IA/ }).click();
    await audit('Coach');
    await tab(page, 'Ejercicios').click();
    await page.getByRole('textbox', { name: 'Buscar ejercicio', exact: true }).fill('press banca');
    await page.locator('.exrow').first().click();
    await expect(page.locator('.metric-head')).toBeVisible();
    await audit('Ficha de ejercicio');
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    await page.getByRole('button', { name: /Biblioteca de artículos/ }).click();
    await expect(page.locator('.article-card').first()).toBeVisible();
    await audit('Artículos');
    await page.locator('.article-card').first().click();
    await expect(page.locator('.article-body')).toBeVisible();
    await audit('Lectura de artículo');
  });

  test(`registrar una serie solo con teclado y foco visible ${scheme}`, async ({ page, errors }) => {
    void errors;
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await seed(page, SAMPLE);
    await reach(page, page.locator('.today').getByRole('button', { name: 'Empezar', exact: true }));
    await page.keyboard.press('Enter');
    const row = page.locator('.swipe .set').first();
    await expect(row).toBeVisible();
    const weight = row.getByLabel('Peso (kg)', { exact: true });
    await reach(page, weight);
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('100');
    await reach(page, row.getByLabel('Repeticiones', { exact: true }));
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('5');
    await reach(page, row.getByLabel('Completar serie', { exact: true }));
    await page.keyboard.press('Space');
    await expect(row).toHaveClass(/done/);
    await expect(row.getByLabel('Completar serie')).toHaveAttribute('aria-pressed', 'true');
    await expect(weight).toHaveValue('100');
    await expect(row.getByLabel('Repeticiones', { exact: true })).toHaveValue('5');
    await noMotion(page);
    await reach(page, page.getByRole('button', { name: 'Terminar', exact: true }));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: '¡Buen trabajo!' })).toBeVisible();
    await noMotion(page);
  });

  test(`sistema de diseño sin movimiento ${scheme}`, async ({ page, errors }) => {
    void errors;
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await seed(page, SAMPLE);
    // Primitivas transitorias, incluidas las que desaparecen antes de medir el DOM.
    await page.evaluate(() => {
      document.documentElement.classList.add('theme-anim');
      const host = document.createElement('div');
      host.innerHTML =
        '<div class="skeleton"></div><div class="toast"></div><div class="modal"><div class="sheet"></div></div><div class="list"><div></div></div><div class="badges"><div></div></div><div class="pr-badge"></div><div class="set done"><button class="check"></button></div><div class="tabs"><button class="on"></button></div>';
      document.body.append(host);
    });
    await noMotion(page);
  });
}
