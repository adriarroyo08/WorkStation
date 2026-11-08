/* global indexedDB, requestAnimationFrame, document, window, innerHeight */
import { chromium, devices } from '@playwright/test';
import { preview } from '../app/node_modules/vite/dist/node/index.js';
import { performanceData } from '../shared/perf-data.ts';
import { DEFAULT_SETTINGS } from '../shared/types.ts';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const profiling = process.env.PERF_PROFILE === '1';
const repetitions = profiling ? 1 : Number(process.env.PERF_REPETITIONS ?? 5);
if (!profiling && (!Number.isInteger(repetitions) || repetitions < 5)) throw new Error('PERF_REPETITIONS debe ser un entero >= 5');
await readFile(new URL('app/dist/index.html', root)); // Nunca medir el servidor de desarrollo.
const data = performanceData(DEFAULT_SETTINGS);
const appVersion = JSON.parse(await readFile(new URL('app/package.json', root), 'utf8')).version;
const server = await preview({ root: fileURLToPath(new URL('app/', root)), configFile: false, preview: { host: '127.0.0.1', port: 0, open: false } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const samples = {};
const record = (name, ms) => (samples[name] ??= []).push(Math.round(ms * 10) / 10);
let browserVersion;
let blocked = 0;
try {
  for (let run = 0; run < repetitions; run++) {
    const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
    browserVersion = browser.version();
    try {
      const options = { ...devices['Pixel 7'], locale: 'es-ES', timezoneId: 'Europe/Madrid', serviceWorkers: 'block' };
      const seed = await browser.newContext(options);
      await seed.route('**/*', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Seed</title>' }));
      const setup = await seed.newPage();
      await setup.goto(origin);
      await setup.evaluate(
        async ({ data, appVersion }) => {
          localStorage.setItem('ws:onboarded', '1');
          localStorage.setItem('ws:seenVersion', appVersion);
          await new Promise((resolve, reject) => {
            const request = indexedDB.open('keyval-store');
            request.onupgradeneeded = () => request.result.createObjectStore('keyval');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const tx = db.transaction('keyval', 'readwrite');
              tx.objectStore('keyval').put(data, 'data');
              tx.oncomplete = () => {
                db.close();
                resolve();
              };
              tx.onerror = () => reject(tx.error);
            };
          });
        },
        { data, appVersion },
      );
      const storageState = await seed.storageState({ indexedDB: true });
      await seed.close();
      const context = await browser.newContext({ ...options, storageState });
      // Lista permitida estricta: ninguna petición llega a Supabase, imágenes remotas o IA.
      // El routing también desactiva la caché HTTP; los service workers están bloqueados.
      await context.route('**/*', (route) => {
        if (new URL(route.request().url()).origin === origin) return route.continue();
        blocked++;
        return route.abort('blockedbyclient');
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(origin, { waitUntil: 'commit' });
      await page.getByRole('button', { name: 'Empezar entrenamiento vacío', exact: true }).click({ trial: true });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      record('Arranque frío hasta control interactuable', await page.evaluate(() => performance.now()));
      // Marcas dentro del navegador: desde click DOM hasta contenido visible y dos RAF.
      const navigate = async (name, selector) =>
        page.evaluate(
          async ({ name, selector }) => {
            const start = performance.now();
            [...document.querySelectorAll('nav.tabs button')].find((b) => b.textContent === name).click();
            await new Promise((resolve, reject) => {
              const check = () => {
                if (document.querySelector(selector)?.getBoundingClientRect().height > 0) resolve();
                else if (performance.now() - start > 30000) reject(new Error(`No se abrió ${name}`));
                else requestAnimationFrame(check);
              };
              check();
            });
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return performance.now() - start;
          },
          { name, selector },
        );
      for (const [name, selector] of [
        ['Historial', 'button.hrow'],
        ['Ejercicios', '.exrow'],
        ['Perfil', '.card.strength'],
        ['Entrenar', '.today'],
      ]) {
        record(`Pestaña ${name} (primera visita)`, await navigate(name, selector));
      }
      record('Reapertura del historial', await navigate('Historial', 'button.hrow'));
      // Perfil separado de la referencia: PERF_PROFILE=1 añade sobrecoste de instrumentación.
      const cdp = profiling ? await context.newCDPSession(page) : null;
      const expansions = [];
      if (cdp) {
        await mkdir(new URL('test-results/', root), { recursive: true });
        await cdp.send('Performance.enable');
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.start');
        await cdp.send('Tracing.start', { categories: 'devtools.timeline,blink.user_timing', transferMode: 'ReturnAsStream' });
        await page.evaluate(() => {
          document.addEventListener(
            'click',
            (event) => {
              if (event.target.textContent.startsWith('Ver más')) performance.mark('history-click');
            },
            true,
          );
        });
      }
      const start = performance.now();
      let slowestExpansion = 0;
      while (await page.getByRole('button', { name: /^Ver más/ }).count()) {
        const before = cdp ? (await cdp.send('Performance.getMetrics')).metrics : [];
        const expansionStart = performance.now();
        await page.getByRole('button', { name: /^Ver más/ }).click();
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        slowestExpansion = Math.max(slowestExpansion, performance.now() - expansionStart);
        if (cdp) {
          const elapsed = performance.now() - expansionStart;
          const after = (await cdp.send('Performance.getMetrics')).metrics;
          expansions.push({
            rows: await page.locator('button.hrow').count(),
            elapsed,
            metrics: Object.fromEntries(after.filter((m) => /Duration$/.test(m.name)).map((m) => [m.name, (m.value - before.find((b) => b.name === m.name).value) * 1000])),
          });
          await page.evaluate(() => performance.mark('history-two-raf'));
        }
      }
      if (cdp) {
        const { profile } = await cdp.send('Profiler.stop');
        await writeFile(new URL('test-results/history.cpuprofile', root), JSON.stringify(profile));
        await writeFile(new URL('test-results/history-expansions.json', root), JSON.stringify(expansions, null, 2));
        const completed = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve));
        await cdp.send('Tracing.end');
        const { stream } = await completed;
        let trace = '';
        for (;;) {
          const part = await cdp.send('IO.read', { handle: stream });
          trace += part.data;
          if (part.eof) break;
        }
        await cdp.send('IO.close', { handle: stream });
        await writeFile(new URL('test-results/history-trace.json', root), trace);
        await cdp.detach();
      }
      if ((await page.locator('button.hrow').count()) !== 416) throw new Error('Historial incompleto');
      record('Cargar historial completo (13 ampliaciones)', performance.now() - start);
      record('Historial (ampliación más lenta)', slowestExpansion);
      const scroll = await page.evaluate(async () => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        let previous = performance.now();
        const start = previous;
        let worst = 0;
        let frames = 0;
        while (window.scrollY + innerHeight < document.documentElement.scrollHeight - 1) {
          if (frames++ > 10000) throw new Error('El scroll no termina');
          window.scrollBy({ top: innerHeight * 0.8, behavior: 'instant' });
          const now = await new Promise((resolve) => requestAnimationFrame(resolve));
          worst = Math.max(worst, now - previous);
          previous = now;
        }
        await new Promise((resolve) => requestAnimationFrame(resolve));
        return { total: performance.now() - start, worst };
      });
      record('Scroll completo (duración del recorrido)', scroll.total);
      record('Scroll completo (peor intervalo de fotograma)', scroll.worst);
      if (errors.length) throw new Error(errors.join('\n'));
      console.log(`Repetición ${run + 1}/${repetitions} completada`);
      await context.close();
    } finally {
      await browser.close();
    }
  }
  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const rows = Object.entries(samples)
    .map(([name, values]) => `| ${name} | ${median(values).toFixed(1)} | ${values.join(', ')} |`)
    .join('\n');
  const stalls = Object.entries(samples).filter(([name, values]) => !/duración del recorrido|13 ampliaciones/.test(name) && median(values) > 1000);
  const report = `# Rendimiento de referencia\n\n## Método\n\nEjecutar \`npm --prefix app run build && npm run perf\` (Node >= 22; instalar Chromium una vez con \`npx playwright install chromium\`, o indicar \`PW_CHROMIUM\`). No forma parte de \`npm run check\`. \`PERF_REPETITIONS\` permite aumentar las repeticiones, nunca bajarlas de cinco.\n\nBuild de producción servido en loopback por Vite preview, Chromium headless, perfil Pixel 7 (412 × 839 CSS px, DPR 2.625), es-ES, Europe/Madrid, sin limitación artificial de CPU/red. Es emulación de viewport, no rendimiento de un teléfono físico. Cada repetición arranca otro navegador y contexto sin caché HTTP ni service worker: arranque frío de recursos con datos locales existentes. El generador determinista shared/perf-data.ts crea 104 semanas desde 2024-11-04: 416 entrenamientos, 6 ejercicios y 4 series completadas por sesión (9984 series), pesos en kg con progresión, 4 rutinas y 104 medidas de peso. La biblioteca base se normaliza por la PWA. No depende de la fecha actual para generar datos; los resúmenes de la interfaz sí dependen de ella.\n\nLos datos se insertan en IndexedDB keyval-store/keyval, clave data, en una página vacía; se transfieren a un contexto nuevo antes de abrir la app. Tour y novedades se marcan vistos. Sin cuenta ni configuración de nube; se aborta toda petición fuera del origen local, incluso Supabase (${blocked} solicitudes externas bloqueadas en esta ejecución). No se reutiliza ni modifica el perfil personal.\n\nArranque: desde navigationStart hasta que Playwright verifica que el botón de entreno vacío acepta interacción (trial) y pasan dos requestAnimationFrame; incluye el pequeño coste de automatización. Es una definición operacional de disponibilidad, no el antiguo TTI de Lighthouse. Pestañas: click DOM en el navegador, contenido propio visible y dos RAF, en orden Historial → Ejercicios → Perfil → Entrenar; primera visita incluye chunks lazy. Reapertura mide Historial de nuevo. Carga completa: 13 clicks reales en Ver más hasta verificar 416 filas, incluye automatización y autoscroll del botón. Scroll: desde arriba hasta abajo, pasos del 80% del viewport por RAF, sin pausas humanas; se informa duración y peor intervalo entre fotogramas. No es una medida de FPS durante gestos táctiles reales.\n\n## Máquina\n\n- Fecha UTC: ${new Date().toISOString()}\n- Sistema: ${os.type()} ${os.release()} (${os.arch()})\n- CPU: ${os.cpus()[0].model}; ${os.cpus().length} procesadores lógicos\n- RAM: ${(os.totalmem() / 1024 ** 3).toFixed(1)} GiB\n- Node: ${process.version}; Chromium: ${browserVersion}\n- Commit fuente: ${execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()}; app ${appVersion}\n- Sin aislamiento de carga del sistema; comparar en la misma máquina y condiciones.\n\n## Resultados de referencia\n\nMediana de ${repetitions} repeticiones secuenciales; todos los tiempos en ms. Muestras conservadas para ver dispersión.\n\n| Operación | Mediana (ms) | Muestras (ms) |\n| --- | ---: | --- |\n${rows}\n\n## Cuellos de botella\n\n${stalls.length ? stalls.map(([name, values]) => `- ${name}: mediana ${median(values).toFixed(1)} ms (> 1 s); requiere investigación independiente, sin corregir aquí.`).join('\n') : 'Ninguna espera individual medida supera 1 s de mediana.'}\n\nEl tiempo acumulado de 13 ampliaciones y la duración del recorrido no equivalen a una pausa individual: dependen del número de acciones y fotogramas. Revisar además las muestras y el peor intervalo de fotograma al comparar en beta. Este ensayo no atribuye causas sin un perfil de CPU. Las incidencias de seguimiento de la referencia inicial se documentan en docs/rendimiento-seguimiento.md.\n`;
  await mkdir(new URL('test-results/', root), { recursive: true });
  const reportName = profiling ? 'perfil-rendimiento' : 'rendimiento';
  await writeFile(new URL(`test-results/${reportName}.md`, root), report);
  await writeFile(new URL(`test-results/${reportName}.json`, root), JSON.stringify({ repetitions, samples, blocked }, null, 2) + '\n');
  console.log(report);
  console.log(`Informes: test-results/${reportName}.md y test-results/${reportName}.json${profiling ? ' (instrumentados; no usar como referencia)' : ''}`);
} finally {
  await new Promise((resolve, reject) => server.httpServer.close((error) => (error ? reject(error) : resolve())));
}
