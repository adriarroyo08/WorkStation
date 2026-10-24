import { SAMPLE, expect, seed, tab, test } from './fixtures';

// Sombra "con color": algún canal con saturación apreciable (negro/gris con alfa está permitido).
const SAT = (css: string) => {
  const cols = css.match(/rgba?\([^)]*\)/g) ?? [];
  return cols.some((c) => {
    const [r, g, b] = c.match(/[\d.]+/g)!.map(Number);
    return Math.max(r, g, b) - Math.min(r, g, b) > 24;
  });
};

test('sin degradados ni brillos de color', async ({ page, errors }) => {
  void errors;
  await seed(page, SAMPLE);
  const bad: string[] = [];
  for (const name of ['Entrenar', 'Historial', 'Ejercicios', 'Perfil', 'Coach']) {
    await tab(page, name).click();
    // Con la hoja abierta se ejercita .modal (fondo difuminado)
    const sheet = name === 'Entrenar' ? page.locator('.recovery-row') : null;
    if (sheet) await sheet.click();
    const found = await page.evaluate((satSrc) => {
      const sat = new Function('css', `return (${satSrc})(css)`) as (c: string) => boolean;
      const out: string[] = [];
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const skip = el.closest('.skeleton') || el.tagName === 'IMG';
        const tag = `${el.tagName.toLowerCase()}.${String(el.getAttribute('class') ?? '').replace(/\s+/g, '.')}`;
        if (!skip && cs.backgroundImage.includes('gradient')) out.push(`${tag} bg: ${cs.backgroundImage.slice(0, 60)}`);
        if (cs.backdropFilter !== 'none' && cs.backdropFilter !== '') out.push(`${tag} backdrop: ${cs.backdropFilter}`);
        if (/url\(/.test(cs.stroke + cs.fill)) out.push(`${tag} paint: ${cs.stroke} ${cs.fill}`);
        if (cs.boxShadow !== 'none' && sat(cs.boxShadow)) out.push(`${tag} shadow: ${cs.boxShadow.slice(0, 60)}`);
      }
      return out;
    }, SAT.toString());
    bad.push(...found.map((f) => `${name}: ${f}`));
    if (sheet) await page.keyboard.press('Escape');
  }
  expect(bad).toEqual([]);
});
