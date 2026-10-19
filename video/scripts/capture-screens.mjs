// Capturas de pantallas clave (oscuro y claro) con datos de ejemplo, para el vídeo.
// Uso (con la app en http://localhost:4173): node scripts/capture-screens.mjs [dir-salida] [csv]
// CHROMIUM=/ruta/a/chrome para usar un navegador concreto.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const OUT = process.argv[2] ?? 'public/shots';
const CSV = process.argv[3] ?? new URL('./sample-hevy.csv', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const errors = [];

for (const scheme of ['dark', 'light']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('dialog', (d) => d.accept());
  const tab = (t) => p.locator('.tabs button', { hasText: t }).click();
  const shot = async (n) => {
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/${scheme}-${n}.png` });
  };
  await p.goto('http://localhost:4173/');
  await p.waitForTimeout(600);
  await shot('welcome');
  // Datos: historial de Hevy + programa PPL + medidas
  await tab('Perfil');
  await p.getByRole('button', { name: 'Ajustes' }).click();
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.getByText('Importar CSV exportado de Hevy').click()]);
  await fc.setFiles(CSV);
  await p.waitForTimeout(400);
  await p.getByText('← Volver').click();
  await tab('Entrenar');
  await p.getByRole('button', { name: 'Explorar programas' }).click();
  await shot('explore');
  await p.getByText('Empuje / Tirón / Pierna (PPL)').click();
  await p.getByText('Guardar programa en mis rutinas').click();
  await p.waitForTimeout(400);
  await shot('home');
  // Entreno en vivo
  await p.locator('.card.routine', { hasText: 'Empuje' }).getByText('Empezar rutina').click();
  await p.waitForTimeout(400);
  const card = p.locator('.excard').first();
  await card.locator('.set:not(.head) input').nth(0).fill('85');
  await card.locator('.set:not(.head) input').nth(1).fill('8');
  await card.locator('.check').nth(0).click();
  await card.locator('.set:not(.head) input').nth(2).fill('90');
  await card.locator('.set:not(.head) input').nth(3).fill('6');
  await card.locator('.check').nth(1).click();
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot('active');
  await card.locator('.settype').first().click();
  await p.getByText('🧮 Calculadora de discos').click();
  await p.locator('.sheet input').first().fill('100');
  await shot('plates');
  await p.getByLabel('Cerrar').click();
  await p.getByText('Terminar').first().click();
  await p.waitForTimeout(600);
  await shot('summary');
  await p.getByText('← Listo').click();
  await tab('Historial');
  await shot('history');
  await tab('Ejercicios');
  await p.waitForTimeout(800);
  await shot('exercises');
  await p.locator('.exrow', { hasText: 'Press de banca (barra)' }).first().click();
  await p.waitForTimeout(1500);
  await shot('exercise-detail');
  await tab('Perfil');
  await shot('profile');
  await p.evaluate(() => window.scrollTo(0, 700));
  await shot('profile-2');
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.getByRole('button', { name: /Informes/ }).click();
  await shot('report');
  await p.getByText('← Volver').click();
  await p.getByRole('button', { name: /Logros/ }).click();
  await shot('achievements');
  await tab('Coach');
  await shot('coach');
  await ctx.close();
}
console.log(errors.length ? errors.join('\n') : 'no errors');
await b.close();
