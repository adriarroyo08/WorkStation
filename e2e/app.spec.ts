import { SAMPLE, expect, seed, tab, test, skipTour } from './fixtures';
import { CHANGELOG } from '../shared/changelog';

test.describe('tour de bienvenida', () => {
  test.use({ onboarded: false });
  const tour = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Bienvenida' });

  test('primera visita: se muestra, Saltar lo cierra y no vuelve', async ({ page, errors }) => {
    void errors;
    await page.goto('/');
    await expect(tour(page)).toContainText('Bienvenido a Workstation');
    await page.getByRole('button', { name: 'Saltar' }).click();
    await expect(tour(page)).toHaveCount(0);
    await expect(page.getByText('Bienvenido a Workstation')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Bienvenido a Workstation')).toBeVisible();
    await expect(tour(page)).toHaveCount(0);
  });

  test('recorre las 7 pantallas y Crear cuenta lleva al registro por email', async ({ page, errors }) => {
    void errors;
    await page.goto('/');
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('keyval-store');
          open.onupgradeneeded = () => open.result.createObjectStore('keyval');
          open.onsuccess = () => {
            const tx = open.result.transaction('keyval', 'readwrite');
            tx.objectStore('keyval').put({ url: 'https://fake-project.supabase.co', anonKey: 'anon-key' }, 'cloud-config');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          };
        }),
    );
    await page.reload();
    for (let n = 0; n < 6; n++) await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(tour(page)).toContainText('Todo sincronizado');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.locator('h1:visible').first()).toHaveText('Crear cuenta');
  });

  test('sin nube configurada no hay Crear cuenta y Escape cierra el tour', async ({ page, errors }) => {
    void errors;
    await page.goto('/');
    for (let n = 0; n < 6; n++) await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page.getByRole('button', { name: 'Crear cuenta' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(tour(page)).toHaveCount(0);
  });

  test('con datos no sale', async ({ page, errors }) => {
    void errors;
    await seed(page, SAMPLE);
    await expect(tour(page)).toHaveCount(0);
  });

  test('"Ver tour de nuevo" en Ajustes lo abre', async ({ page, errors }) => {
    void errors;
    await seed(page, SAMPLE);
    await tab(page, 'Perfil').click();
    await page.getByRole('button', { name: 'Ajustes' }).click();
    await page.getByRole('button', { name: 'Ver tour de nuevo' }).click();
    await expect(tour(page)).toBeVisible();
    // Al cerrarlo sigues en Ajustes, no vuelves al inicio de Perfil.
    await page.keyboard.press('Escape');
    await expect(tour(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ver tour de nuevo' })).toBeVisible();
  });

});

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
  await expect(page.getByText('600 kg', { exact: true })).toBeVisible();
});

test('la semana se muestra como 7 días', async ({ page, errors }) => {
  void errors;
  await seed(page, SAMPLE);
  const days = page.locator('.weekstrip i');
  await expect(days).toHaveCount(7);
  // Días distintos de esta semana (lunes primero) con algún entreno, calculados en el navegador.
  const expected = await page.evaluate(
    (starts) => {
      const mon = new Date();
      mon.setHours(0, 0, 0, 0);
      mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
      return new Set(starts.filter((s) => Date.parse(s) >= mon.getTime()).map((s) => (new Date(s).getDay() + 6) % 7)).size;
    },
    SAMPLE.workouts.map((w) => w.startedAt),
  );
  await expect(page.locator('.weekstrip i.on')).toHaveCount(expected);
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
  await page.locator('button.hrow', { hasText: 'Torso A' }).first().click();
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
    expect(bg).toBe(scheme === 'dark' ? 'rgb(20, 20, 20)' : 'rgb(255, 255, 255)');
    for (const name of ['Historial', 'Ejercicios', 'Perfil', 'Entrenar']) {
      await tab(page, name).click();
      await expect(page.locator('h1:visible').first()).toBeVisible();
    }
  });

test('cuatro pestañas y Coach IA dentro de Perfil', async ({ page, errors }) => {
  void errors;
  await seed(page, SAMPLE);
  await expect(page.locator('nav.tabs button')).toHaveText(['Entrenar', 'Historial', 'Ejercicios', 'Perfil']);
  await tab(page, 'Perfil').click();
  await page.getByRole('button', { name: /Coach IA/ }).click();
  await expect(page.locator('h1:visible').first()).toHaveText('Coach IA');
  await page.locator('.topbar > button:first-child').click();
  await expect(page.locator('h1:visible').first()).toHaveText('Perfil');
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
  await page.getByRole('button', { name: /Tu \d{4} en Workstation/ }).click();
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

test('copia automática diaria: borrar todo y restaurar', async ({ page, errors }) => {
  void errors;
  page.on('dialog', (d) => d.accept());
  await seed(page, SAMPLE);
  await page.waitForTimeout(3500); // la copia diaria se crea unos segundos después de abrir
  await tab(page, 'Perfil').click();
  await page.getByRole('button', { name: 'Ajustes' }).click();
  const panel = page.locator('.card', { has: page.getByRole('heading', { name: 'Copias automáticas' }) });
  await expect(panel.locator('.backup-row').first()).toContainText('diaria · 3 entrenos');
  await page.getByRole('button', { name: 'Borrar todos los datos' }).click();
  await expect(page.getByText(/^0 entrenamientos/)).toBeVisible();
  await expect(panel.locator('.backup-row').first()).toContainText('antes de borrar');
  await panel.locator('.backup-row', { hasText: 'diaria' }).getByRole('button', { name: 'Restaurar' }).click();
  await expect(page.getByText(/^3 entrenamientos/)).toBeVisible();
});

test('reordenar ejercicios arrastrando y con teclado', async ({ page, errors }) => {
  void errors;
  await seed(page, SAMPLE);
  await page.locator('.today').getByRole('button', { name: 'Empezar' }).click();
  await page.getByRole('button', { name: 'Opciones' }).first().click();
  await page.getByRole('button', { name: 'Reordenar ejercicios' }).click();
  const names = page.locator('.reorder-row b');
  await expect(names).toHaveText(['Sentadilla (barra)', 'Curl femoral tumbado']);
  const handle = page.locator('.reorder-handle').first();
  await page.waitForTimeout(500); // la hoja termina de subir
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let k = 1; k <= 6; k++) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + k * 15);
  await page.mouse.up();
  await expect(names).toHaveText(['Curl femoral tumbado', 'Sentadilla (barra)']);
  await page.locator('.reorder-handle').nth(1).focus();
  await page.keyboard.press('ArrowUp');
  await expect(names).toHaveText(['Sentadilla (barra)', 'Curl femoral tumbado']);
  await page.getByRole('button', { name: 'Listo' }).click();
  await expect(page.locator('.excard').first()).toContainText('Sentadilla');
});

test('novedades tras actualizar y versión en ajustes', async ({ page, errors }) => {
  void errors;
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'Novedades' })).toHaveCount(0); // primera instalación: sin aviso
  await page.evaluate(() => localStorage.setItem('ws:seenVersion', '0.2.0'));
  await page.reload();
  const sheet = page.getByRole('dialog', { name: 'Novedades' });
  await expect(sheet).toContainText('Versión 1.4.0');
  await sheet.getByRole('button', { name: '¡Genial!' }).click();
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Novedades' })).toHaveCount(0);
  await tab(page, 'Perfil').click();
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await expect(page.locator('.app-version')).toContainText(`Workstation v${CHANGELOG[0].version}`);
});

test.describe('1.4.0: tour o novedades según de dónde vienes', () => {
  test.use({ onboarded: false });
  const tour = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Bienvenida' });
  const novedades = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Novedades' });

  test('actualizando desde 1.3.0 con datos: Novedades 1.4.0 y no el tour', async ({ page, errors }) => {
    void errors;
    await seed(page, SAMPLE);
    await page.evaluate(() => localStorage.setItem('ws:seenVersion', '1.3.0'));
    await page.reload();
    await expect(novedades(page)).toContainText('Versión 1.4.0');
    await expect(tour(page)).toHaveCount(0);
  });

  test('instalación limpia: tour y no Novedades', async ({ page, errors }) => {
    void errors;
    await page.goto('/');
    await expect(tour(page)).toBeVisible();
    await expect(novedades(page)).toHaveCount(0);
  });
});

test('decimales con coma en el peso (82,5 no se convierte en 825)', async ({ page, errors }) => {
  void errors;
  page.on('dialog', (d) => d.accept());
  await seed(page, SAMPLE);
  await page.locator('.today').getByRole('button', { name: 'Empezar' }).click();
  const row = page.locator('.swipe .set').first();
  const kg = row.getByLabel('Peso (kg)');
  await kg.pressSequentially('82,5');
  await expect(kg).toHaveValue('82,5');
  await row.getByLabel('Repeticiones').fill('5');
  await row.getByLabel('Completar serie').click();
  await page.getByRole('button', { name: 'Terminar' }).click();
  await expect(page.getByText('82,5kg × 5').first()).toBeVisible();
});

test('unidades en libras: escribir, calculadora de discos e historial', async ({ page, errors }) => {
  void errors;
  page.on('dialog', (d) => d.accept());
  await seed(page, { ...SAMPLE, settings: { unit: 'lb' } });
  await tab(page, 'Historial').click();
  await expect(page.locator('button.hrow', { hasText: 'Torso A' }).first()).toContainText('lb');
  await tab(page, 'Entrenar').click();
  await page.locator('.today').getByRole('button', { name: 'Empezar' }).click();
  const row = page.locator('.swipe .set').first();
  await expect(row.locator('.prev')).toContainText('220,5 × 5'); // 100 kg de la sesión anterior
  const lb = row.getByLabel('Peso (lb)');
  await lb.fill('225');
  await lb.dblclick();
  const calc = page.getByRole('dialog', { name: 'Calculadora de discos' });
  await expect(calc).toContainText('Por lado: 45 + 45');
  await expect(calc).toContainText('Total cargado: 225 lb');
});

test('funciona sin conexión tras la primera visita', async ({ page, context, errors }) => {
  void errors;
  await seed(page, SAMPLE);
  await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.active), { timeout: 20000 }).toBe(true);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.today h3')).toHaveText('Pierna A');
  await tab(page, 'Perfil').click(); // pestaña cargada bajo demanda: también desde la caché
  await expect(page.locator('h1:visible').first()).toHaveText('Perfil');
  await context.setOffline(false);
});

test('compartir una rutina por enlace y guardarla en otro dispositivo', async ({ page, browser, errors }) => {
  void errors;
  await page.addInitScript(() => {
    (navigator as unknown as { share: (d: ShareData) => Promise<void> }).share = async (d) => void ((window as unknown as { shared: ShareData }).shared = d);
  });
  await seed(page, SAMPLE);
  await page.locator('.routine', { hasText: 'Torso A' }).getByRole('button', { name: 'Opciones' }).click();
  await page.getByRole('button', { name: /Compartir enlace/ }).click();
  const url = await page.waitForFunction(() => (window as unknown as { shared?: ShareData }).shared?.url).then((h) => h.jsonValue() as Promise<string>);
  expect(url).toMatch(/#rutina=z[\w-]+$/);

  // Otra persona, sin datos, abre el enlace.
  const ctx = await browser.newContext({ ...test.info().project.use, baseURL: undefined });
  await skipTour(ctx);
  const other = await ctx.newPage();
  await other.goto(url.replace(/^https?:\/\/[^/]+\/?/, 'http://localhost:4174/'));
  const sheet = other.getByRole('dialog', { name: 'Rutina compartida' });
  await expect(sheet).toContainText('Torso A');
  await expect(sheet).toContainText('Press de banca (barra)');
  await sheet.getByRole('button', { name: 'Guardar en mis rutinas' }).click();
  await expect(other.locator('.routine', { hasText: 'Torso A' })).toBeVisible();
  expect(other.url()).not.toContain('#rutina=');
  await ctx.close();
});

test('editar un entreno pasado: series nuevas sin ✓ se guardan y deshacer tras guardar no rompe nada', async ({ page, errors }) => {
  void errors;
  await seed(page, SAMPLE);
  await tab(page, 'Historial').click();
  await page.locator('button.hrow', { hasText: 'Pierna A' }).first().click();
  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByRole('button', { name: 'Añadir serie' }).first().click();
  const last = page.locator('.swipe .set').last();
  await last.getByLabel('Repeticiones').fill('3');
  // Borra una serie (ofrece deshacer) y guarda: pulsar Deshacer después no debe romper la app.
  await page.locator('.swipe .set').first().locator('.settype').click();
  await page.getByRole('button', { name: /Borrar serie/ }).click();
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('button', { name: 'Deshacer' })).toHaveCount(0);
  await expect(page.locator('section:visible').getByText('100kg × 3')).toBeVisible();
});

test('reemplazar un ejercicio conserva las series hechas', async ({ page, errors }) => {
  void errors;
  await seed(page, SAMPLE);
  await page.locator('.today').getByRole('button', { name: 'Empezar' }).click();
  const row = page.locator('.swipe .set').first();
  await row.getByLabel('Peso (kg)').fill('90');
  await row.getByLabel('Repeticiones').fill('5');
  await row.getByLabel('Completar serie').click();
  await page.getByRole('button', { name: 'Opciones' }).first().click();
  await page.getByRole('button', { name: 'Reemplazar ejercicio' }).click();
  await page.getByPlaceholder('Buscar ejercicio…').fill('sentadilla frontal');
  await page.locator('.exrow').first().click();
  const first = page.locator('.swipe .set').first();
  await expect(first).toHaveClass(/done/);
  await expect(first.getByLabel('Peso (kg)')).toHaveValue('90');
});

test('añadir ejercicio ocupa toda la pantalla y se puede elegir tras desplazar', async ({ page, errors }) => {
  void errors;
  await page.goto('/');
  await page.getByRole('button', { name: 'Empezar entrenamiento vacío' }).click();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).click();
  const dialog = page.locator('[role=dialog]');
  const vh = await page.evaluate(() => innerHeight);
  expect((await dialog.boundingBox())!.height).toBeGreaterThanOrEqual(vh * 0.95);
  const listW = (await page.locator('.picker-list').boundingBox())!.width;
  const rows = page.locator('.exrow');
  for (let i = 0; i < 5; i++) expect(Math.abs((await rows.nth(i).boundingBox())!.width - listW)).toBeLessThanOrEqual(2);
  await page.locator('.sheet-body').evaluate((el) => (el.scrollTop = 2500));
  await expect(page.getByPlaceholder('Buscar ejercicio…')).toBeVisible();
  await page.locator('.exrow', { hasText: 'Elevación de gemelos de pie' }).first().click();
  await expect(page.getByText('Elevación de gemelos de pie').first()).toBeVisible();
  await expect(dialog).toHaveCount(0);
});

test('cada ejercicio marca sus músculos: principal y secundarios', async ({ page, errors }) => {
  void errors;
  await page.goto('/');
  await tab(page, 'Ejercicios').click();
  const row = page.locator('.exrow', { hasText: 'Press de banca (barra)' }).first();
  await expect(row.locator('svg.bm-thumb')).toHaveCount(1);
  await row.click();
  const legend = page.locator('.bm-legend');
  await expect(legend.locator('li').first()).toContainText('Pecho');
  await expect(legend.locator('li').first()).toContainText('Principal');
  await expect(legend).toContainText('Secundario');
  await expect(page.getByRole('img', { name: 'Músculos que trabaja' })).toBeVisible();
});

test('marcar una serie activa el estilo hecho y aria-pressed', async ({ page, errors }) => {
  void errors;
  await page.goto('/');
  await page.getByRole('button', { name: 'Empezar entrenamiento vacío' }).click();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).click();
  await page.getByPlaceholder('Buscar ejercicio…').fill('press de banca');
  await page.locator('.exrow', { hasText: 'Press de banca (barra)' }).first().click();
  const row = page.locator('.set:not(.head)').first();
  const check = row.getByLabel('Completar serie');
  await expect(check).toHaveAttribute('aria-pressed', 'false');
  await check.click();
  await expect(row).toHaveClass(/done/);
  await expect(check).toHaveAttribute('aria-pressed', 'true');
  await check.click();
  await expect(row).not.toHaveClass(/done/);
});

test('selector de descanso propio: chip y ajuste libre', async ({ page, errors }) => {
  void errors;
  await page.goto('/');
  await page.getByRole('button', { name: 'Empezar entrenamiento vacío' }).click();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).click();
  await page.getByPlaceholder('Buscar ejercicio…').fill('press de banca');
  await page.locator('.exrow', { hasText: 'Press de banca (barra)' }).first().click();
  const trigger = page.locator('.rest-chip').first();
  await trigger.click();
  const dlg = page.getByRole('dialog', { name: 'Tiempo de descanso' });
  await expect(dlg).toBeVisible();
  await dlg.getByRole('button', { name: '2:00 de descanso' }).click();
  await expect(dlg).toBeHidden();
  await expect(trigger).toContainText('2:00');
  await trigger.click();
  await dlg.getByLabel('Más 15 segundos').click();
  await expect(dlg.getByTestId('rest-custom')).toHaveText('2:15');
  await dlg.getByRole('button', { name: 'Usar' }).click();
  await expect(trigger).toContainText('2:15');
});
