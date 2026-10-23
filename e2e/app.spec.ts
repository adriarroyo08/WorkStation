import { SAMPLE, expect, seed, tab, test } from './fixtures';

test('entreno completo desde cero', async ({ page, errors }) => {
  void errors;
  await page.goto('/');
  await expect(page.getByText('Bienvenido a Workstation')).toBeVisible();
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Empezar entrenamiento vacío' }).click();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).click();
  await page.getByPlaceholder('Buscar ejercicio…').fill('press de banca');
  await page.locator('.exrow', { hasText: 'Press de banca (barra)' }).first().click();
  const row = page.locator('.set:not(.head)').first();
  const inputs = row.locator('input[inputmode]');
  await inputs.nth(0).fill('60');
  await inputs.nth(1).fill('10');
  await row.getByLabel('Completar serie').click();
  await page.getByRole('button', { name: 'Terminar' }).click();
  await expect(page.getByText('¡Buen trabajo!')).toBeVisible();
  await expect(page.getByText('600', { exact: true })).toBeVisible();
});

test('hoy toca, recuperación y comparación con la sesión anterior', async ({ page, errors }) => {
  void errors;
  await seed(page, SAMPLE);
  await expect(page.locator('.today h3')).toHaveText('Pierna A');
  await page.locator('.recovery-row').click();
  await expect(page.getByText('Recuperación muscular')).toBeVisible();
  await expect(page.locator('.recovery-item', { hasText: 'Pecho' })).toBeVisible();
  await page.keyboard.press('Escape');

  await tab(page, 'Historial').click();
  await page.locator('button.card', { hasText: 'Torso A' }).first().click();
  const vs = page.locator('.vs-last');
  await expect(vs).toContainText('Frente a la última vez');
  await expect(vs.locator('.delta.up').first()).toBeVisible();
});

for (const scheme of ['light', 'dark'] as const)
  test(`todas las pestañas cargan en modo ${scheme}`, async ({ page, errors }) => {
    void errors;
    await page.emulateMedia({ colorScheme: scheme });
    await seed(page, SAMPLE);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe(scheme === 'dark' ? 'rgb(12, 10, 9)' : 'rgb(251, 248, 245)');
    for (const name of ['Historial', 'Ejercicios', 'Perfil', 'Coach', 'Entrenar']) {
      await tab(page, name).click();
      await expect(page.locator('h1:visible').first()).toBeVisible();
    }
  });

test('niveles de fuerza en la ficha y en el perfil', async ({ page, errors }) => {
  void errors;
  await seed(page, SAMPLE);
  await tab(page, 'Perfil').click();
  const overview = page.locator('.card.strength');
  await expect(overview.locator('.exline', { hasText: 'Press de banca (barra)' })).toContainText('Intermedio');
  await overview.locator('.exline', { hasText: 'Press de banca (barra)' }).click();
  const card = page.locator('.card.strength');
  await expect(card.locator('.lvl-name')).toHaveText('Intermedio');
  await expect(card).toContainText('para Avanzado');
  await card.getByRole('button', { name: 'Mujer' }).click();
  await expect(card.locator('.lvl-name')).toHaveText('Avanzado');
});

test('resumen anual en historias', async ({ page, errors }) => {
  void errors;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seed(page, SAMPLE);
  await tab(page, 'Perfil').click();
  await page.locator('.wrapped-tile').click();
  const story = page.getByRole('dialog', { name: /Resumen de \d{4}/ });
  await expect(story).toContainText('Tu ');
  await story.click({ position: { x: 300, y: 400 } });
  await expect(story).toContainText('entrenamientos');
  await expect(story.locator('.huge')).toHaveText('3');
  for (let k = 0; k < 6; k++) await page.keyboard.press('ArrowRight');
  await expect(story.getByRole('button', { name: 'Compartir mi año' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(story).toBeHidden();
});

test('deslizar una serie a la izquierda la borra y se puede deshacer', async ({ page, errors }) => {
  void errors;
  await seed(page, SAMPLE);
  await page.locator('.today').getByRole('button', { name: 'Empezar' }).click();
  const rows = page.locator('.swipe');
  await rows.first().waitFor();
  await page.waitForTimeout(600); // deja terminar el desplazamiento automático a la siguiente serie
  const before = await rows.count();
  const box = (await rows.first().locator('.prev').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let k = 1; k <= 8; k++) await page.mouse.move(box.x + box.width / 2 - k * 20, box.y + box.height / 2);
  await expect(rows.first()).toHaveClass(/armed/);
  await page.mouse.up();
  await expect(rows).toHaveCount(before - 1);
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(rows).toHaveCount(before);
});
