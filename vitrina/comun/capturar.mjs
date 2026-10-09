// Capturas de una direccion de la vitrina con Playwright (Chromium en cache).
//   node vitrina/comun/capturar.mjs --puerto 8102 --direccion a-luz [--congelar 1500] [--rapido]
// Antes hay que tener el servidor andando: node vitrina/servir.mjs --puerto 8102
//
// Que hace (todo se guarda en vitrina/<direccion>/capturas/):
//  1. Cada pantalla x muestra a 1440x900 y a 390x844, en modo "movimiento prendido, reloj congelado": deja correr la
//     entrada, llama window.vitrina.congelar(ms) y pausa todas las animaciones WAAPI antes de sacar la foto.
//  2. Tiras de cuadros (era=auto) a 0/150/400/800/1500/2400 ms: elegir(1) en decision/evento y decision/planAmateur,
//     repetir() en cumbre/titulo (el takeover) y en inicio (la intro).
//  3. Una pasada con --enable-unsafe-swiftshader (WebGL por software) y otra con data-sin-webgl (webgl=0).
//  4. informe.json: errores de consola, pageerror y requestfailed, medidas de FPS y la lista de PNG.
// Mata solo el navegador que abrio.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
    return acc;
  }, []),
);
const PUERTO = Number(args.puerto ?? 8102);
const DIRECCION = args.direccion;
const CONGELAR_MS = Number(args.congelar ?? 1500);
const RAPIDO = Boolean(args.rapido); // espera de entrada mas corta (para pruebas)
const ENTRADA_MS = RAPIDO ? 700 : 1800;
const MS_TIRA = [0, 150, 400, 800, 1500, 2400];
const TIRAS = [
  { accion: 'elegir', pantalla: 'decision', muestra: 'evento' },
  { accion: 'elegir', pantalla: 'decision', muestra: 'planAmateur' },
  { accion: 'repetir', pantalla: 'cumbre', muestra: 'titulo' },
  { accion: 'repetir', pantalla: 'inicio', muestra: '' },
];
const TAMANOS = [
  { nombre: '1440', ancho: 1440, alto: 900, hash: 'dispositivo=escritorio' },
  { nombre: '390', ancho: 390, alto: 844, hash: 'dispositivo=celular' },
];

if (!DIRECCION || DIRECCION === true) {
  console.error('Falta --direccion (a-luz | b-nocturno | c-pantallas)');
  process.exit(2);
}
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, DIRECCION, 'capturas');
if (!fs.existsSync(path.join(RAIZ, DIRECCION, 'index.html'))) {
  console.error(`No existe vitrina/${DIRECCION}/index.html`);
  process.exit(2);
}

// Rutas por defecto iguales a src/dev/recorrido.mjs:66-69
const PLAYWRIGHT_CORE = process.env.PLAYWRIGHT_CORE
  ?? 'C:/Users/Ignacio/AppData/Local/npm-cache/_npx/e058441c325e062a/node_modules/playwright-core';
const CHROMIUM_EXE = process.env.CHROMIUM_EXE
  ?? 'C:/Users/Ignacio/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
if (!fs.existsSync(PLAYWRIGHT_CORE)) {
  console.error(`No encuentro playwright-core en ${PLAYWRIGHT_CORE}. Definí PLAYWRIGHT_CORE con la carpeta del paquete.`);
  process.exit(2);
}
if (!fs.existsSync(CHROMIUM_EXE)) {
  console.error(`No encuentro Chromium en ${CHROMIUM_EXE}. Definí CHROMIUM_EXE con la ruta del ejecutable.`);
  process.exit(2);
}
const require = createRequire(import.meta.url);
const { chromium } = require(PLAYWRIGHT_CORE);

fs.mkdirSync(SALIDA, { recursive: true });
const informe = { direccion: DIRECCION, puerto: PUERTO, congelarMs: CONGELAR_MS, errores: [], avisos: [], pasadas: {}, capturas: [] };
const URL_BASE = `http://127.0.0.1:${PUERTO}/${DIRECCION}/index.html`;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => String(s).replace(/[^a-zA-Z0-9_-]+/g, '_');

async function abrir(contexto, pasada, hash) {
  const page = await contexto.newPage();
  page.setDefaultTimeout(15000);
  const donde = (extra) => ({ pasada, pagina: hash, ...extra });
  page.on('console', (m) => {
    // Mientras no exista datos/muestras.json, datos.js cae al stub y el navegador loguea ese 404 como "error": es un aviso.
    if (m.type() === 'error' && (m.location()?.url ?? '').endsWith('/datos/muestras.json')) {
      informe.avisos.push(donde({ texto: 'datos/muestras.json no existe todavia (se uso el stub)' }));
    } else if (m.type() === 'error') informe.errores.push(donde({ tipo: 'console', texto: m.text(), url: m.location()?.url }));
    else if (m.type() === 'warning') informe.avisos.push(donde({ texto: m.text() }));
  });
  page.on('pageerror', (e) => informe.errores.push(donde({ tipo: 'pageerror', texto: String(e.message ?? e) })));
  page.on('requestfailed', (r) => informe.errores.push(donde({ tipo: 'requestfailed', texto: `${r.url()} ${r.failure()?.errorText ?? ''}` })));
  await page.goto(`${URL_BASE}#${hash}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.vitrina && typeof window.vitrina.estado === 'function', null, { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  // "Listo": la direccion puede exponer window.vitrina.listo() (una Promise: arte cargado, ambiente armado). Si no, se
  // espera que todas las <img> terminen. Tope de 8 s. (No se usa networkidle: nunca llega con fetch de JSON que da 404.)
  await page.evaluate(() => Promise.race([
    (window.vitrina.listo ? window.vitrina.listo() : Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))))),
    new Promise((r) => setTimeout(r, 8000)),
  ]));
  return page;
}

function hashDe(base, e) {
  return `pantalla=${e.pantalla}${e.muestra ? '&muestra=' + e.muestra : ''}&era=${e.era}&${base.hash}&panel=0${e.extra ?? ''}`;
}

async function congelar(page, ms) {
  await page.evaluate((t) => {
    window.vitrina.congelar(t);
    for (const a of document.getAnimations()) {
      try {
        a.pause();
      } catch {
        /* sin linea de tiempo */
      }
    }
  }, ms);
  await pausa(60);
}

async function foto(page, nombre, extra = {}) {
  const archivo = path.join(SALIDA, nombre + '.png');
  await page.screenshot({ path: archivo, animations: 'allow', caret: 'hide' });
  informe.capturas.push({ archivo: nombre + '.png', ...extra });
}

async function listarEstados(page0) {
  const cat = await page0.evaluate(() => window.vitrina.catalogo());
  const estados = [];
  for (const pantalla of cat.pantallas) {
    const ms = cat.muestras[pantalla]?.length ? cat.muestras[pantalla] : [''];
    for (const muestra of ms) estados.push({ pantalla, muestra, era: 'auto' });
    if (pantalla === 'eras') for (const era of cat.eras.slice(1)) estados.push({ pantalla, muestra: ms[0], era });
  }
  return { cat, estados };
}

async function pasada(nombre, { argsNavegador = [], sufijoHash = '', sufijoArchivo = '', completa }) {
  const browser = await chromium.launch({ executablePath: CHROMIUM_EXE, headless: true, args: argsNavegador });
  const resumen = { webgl: null, atributoSinWebgl: null, fps: {} };
  informe.pasadas[nombre] = resumen;
  try {
    const ctx0 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p0 = await abrir(ctx0, nombre, `${TAMANOS[0].hash}&panel=0${sufijoHash}`);
    resumen.webgl = await p0.evaluate(() => {
      const c = document.createElement('canvas');
      return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
    });
    resumen.atributoSinWebgl = await p0.evaluate(() => document.documentElement.hasAttribute('data-sin-webgl'));
    const { cat, estados } = await listarEstados(p0);
    await ctx0.close();

    for (const tam of completa ? TAMANOS : TAMANOS.slice(0, 1)) {
      const ctx = await browser.newContext({ viewport: { width: tam.ancho, height: tam.alto } });
      for (const e of estados) {
        const page = await abrir(ctx, nombre, hashDe(tam, { ...e, extra: sufijoHash }));
        await pausa(ENTRADA_MS);
        await congelar(page, CONGELAR_MS);
        const nom = [String(informe.capturas.length).padStart(3, '0'), e.pantalla, e.muestra, e.pantalla === 'eras' ? e.era : '', tam.nombre]
          .filter(Boolean).map(slug).join('-') + sufijoArchivo;
        await foto(page, nom, { pasada: nombre, pantalla: e.pantalla, muestra: e.muestra, era: e.era, ancho: tam.ancho });
        await page.close();
      }
      await ctx.close();
    }

    // FPS por pantalla (escritorio, movimiento corriendo)
    const ctxF = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    for (const pantalla of cat.pantallas) {
      const muestra = cat.muestras[pantalla]?.[0] ?? '';
      const page = await abrir(ctxF, nombre, hashDe(TAMANOS[0], { pantalla, muestra, era: 'auto', extra: sufijoHash }));
      await pausa(ENTRADA_MS);
      await page.evaluate(() => window.vitrina.set('fps', true));
      await pausa(2200);
      resumen.fps[pantalla] = await page.evaluate(() => window.vitrina.fps());
      await page.close();
    }
    await ctxF.close();

    // Tiras (solo en la pasada normal), siempre con era=auto: elegir(1) en decision/evento y decision/planAmateur,
    // repetir() en cumbre/titulo (el takeover) y en inicio (la intro).
    if (completa) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      for (const t of TIRAS) {
        const hayPantalla = cat.pantallas.includes(t.pantalla) && (!t.muestra || cat.muestras[t.pantalla]?.includes(t.muestra));
        if (!hayPantalla) {
          informe.avisos.push({ pasada: nombre, texto: `tira ${t.accion}-${t.muestra || t.pantalla} omitida: la direccion no tiene esa pantalla/muestra` });
          continue;
        }
        for (const ms of MS_TIRA) {
          const page = await abrir(ctx, nombre, hashDe(TAMANOS[0], { pantalla: t.pantalla, muestra: t.muestra, era: 'auto' }));
          await pausa(ENTRADA_MS);
          await page.evaluate((a) => (a === 'elegir' ? window.vitrina.elegir(1) : window.vitrina.repetir()), t.accion);
          await congelar(page, ms);
          await foto(page, `tira-${t.accion}-${t.muestra || t.pantalla}-${String(ms).padStart(4, '0')}ms`, { pasada: nombre, tira: t.accion, pantalla: t.pantalla, muestra: t.muestra, ms });
          await page.close();
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close(); // solo el que abrimos nosotros
  }
}

try {
  await pasada('normal', { completa: true });
  await pasada('swiftshader', { argsNavegador: ['--enable-unsafe-swiftshader'], sufijoArchivo: '-swiftshader', completa: false });
  await pasada('sin-webgl', { sufijoHash: '&webgl=0', sufijoArchivo: '-sinwebgl', completa: false });
} catch (e) {
  informe.errores.push({ tipo: 'capturar', texto: String(e.stack ?? e) });
  console.error(e);
}
fs.writeFileSync(path.join(SALIDA, 'informe.json'), JSON.stringify(informe, null, 2) + '\n');
console.log(`${informe.capturas.length} capturas, ${informe.errores.length} error(es), ${informe.avisos.length} aviso(s) -> ${path.relative(process.cwd(), SALIDA)}/informe.json`);
process.exit(informe.errores.length ? 1 : 0);
