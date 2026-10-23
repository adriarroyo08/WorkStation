import AxeBuilder from '@axe-core/playwright';
import { SAMPLE, expect, seed, tab, test } from './fixtures';

// Auditoría WCAG 2.1 AA (contraste, etiquetas, roles…) en cada pestaña, en claro y oscuro.
for (const scheme of ['light', 'dark'] as const)
  test(`accesibilidad en modo ${scheme}`, async ({ page, errors }) => {
    void errors;
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await seed(page, SAMPLE);
    const report: string[] = [];
    for (const name of ['Entrenar', 'Historial', 'Ejercicios', 'Perfil', 'Coach']) {
      await tab(page, name).click();
      await page.waitForTimeout(400);
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      for (const v of r.violations)
        report.push(
          `${name} · ${v.id} (${v.impact}): ${v.nodes
            .slice(0, 4)
            .map((n) => `${n.target.join(' ')} ${n.any[0]?.message ?? ''}`)
            .join(' | ')}`,
        );
    }
    expect(report).toEqual([]);
  });
