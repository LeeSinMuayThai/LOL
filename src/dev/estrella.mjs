// La estrella del norte, lado a lado (PLANUI §11 U1a, §12): para cada muestra de la vitrina que tiene guardado, mete ese
// guardado en el juego, lo deja en la MISMA parada, saca una captura, saca la de la vitrina (fusion, `op=linea`) en esa
// muestra y arma una composicion  JUEGO | VITRINA  en PNG. Se juzga mirando (compuerta 2): no mide nada, no falla por numeros.
//
//   node src/dev/estrella.mjs [--salida dir] [--muestras serie,swiss,...] [--puerto-juego 8151] [--puerto-vitrina 8152]
//        [--sin-webgl] [--tamanos 1440,390]
//
// - Levanta y baja sus propios servidores (`node server.js` con PORT, y `node vitrina/servir.mjs`); solo mata los que levanto.
// - Los guardados salen de vitrina/datos/guardados/*.json ({ carrera, vista, claves }): se escriben en el localStorage del
//   juego (`lolcs-carrera-guardada` y `lolcs-vista`), se recarga y se toca "Continuar", como un jugador que retoma. Las
//   muestras sin guardado (firma, titulo, mundial: son momentos, no paradas) no se pueden inyectar y se saltean.
//   `inicio` usa `inicio-historial.json` (la clave `lolcs-historial`) y no toca Continuar.
// - Tamanos: 1440x900 (escritorio) y 390x844 (celular; en la vitrina, `dispositivo=celular`).
// - Movimiento congelado: si el juego expone un congelar de `fx` (`window.__fx`, `window.fx` o `window.lolero.fx`, con
//   `.congelar(ms)`) lo usa; si no, espera a que asienten las entradas y termina/pausa las animaciones WAAPI. La vitrina
//   usa su propio `window.vitrina.congelar(ms)`.
// - --sin-webgl: Chromium con WebGL deshabilitado (`--disable-3d-apis`) para ver el fallback CSS; la vitrina ademas recibe
//   `webgl=0` en el hash. Sin la opcion, Chromium arranca con swiftshader para que el ambiente WebGL se dibuje en headless.
// - Salida (por defecto ./estrella-salida, en el cwd; nunca dentro de src/): `NN-<muestra>-<ancho>.png` (la composicion),
//   `partes/NN-<muestra>-<ancho>-{juego,vitrina}.png` y `manifiesto.json` (que se pudo, que no y por que, errores de consola,
//   el rectangulo del escenario). Playwright y Chromium salen de PLAYWRIGHT_CORE / CHROMIUM_EXE (rutas de esta maquina).
import { createRequire } from 'module';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------- argumentos y rutas ----------
function leerArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const k = argv[i].slice(2);
    const sig = argv[i + 1];
    if (sig === undefined || sig.startsWith('--')) a[k] = true; else { a[k] = sig; i++; }
  }
  return a;
}
const args = leerArgs(process.argv.slice(2));
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SALIDA = path.resolve(String(args.salida ?? 'estrella-salida'));
let PUERTO_JUEGO = Number(args['puerto-juego'] ?? 8151);
const PUERTO_VITRINA = Number(args['puerto-vitrina'] ?? 8152);
const SIN_WEBGL = Boolean(args['sin-webgl']);
const SOLO = args.muestras && args.muestras !== true ? String(args.muestras).split(',').map((s) => s.trim()).filter(Boolean) : null;
const CONGELAR_MS = 1500;
const ASENTAR_MS = 1400; // entradas del juego y countUp (components/countUp.js: 420 ms) antes de congelar
if (SALIDA === RAIZ || SALIDA.startsWith(path.join(RAIZ, 'src') + path.sep)) {
  console.error(`--salida ${SALIDA}: no puede caer dentro de src/ ni ser la raiz del repo`);
  process.exit(2);
}

const TAMANOS_TODOS = [
  { nombre: '1440', ancho: 1440, alto: 900, dispositivo: 'escritorio' },
  { nombre: '390', ancho: 390, alto: 844, dispositivo: 'celular' }
];
const pedidos = args.tamanos && args.tamanos !== true ? String(args.tamanos).split(',') : null;
const TAMANOS = pedidos ? TAMANOS_TODOS.filter((t) => pedidos.includes(t.nombre)) : TAMANOS_TODOS;

// Donde vive cada muestra en la vitrina (vitrina/comun/catalogo.js, PANTALLAS). `cierreAnio` es "ronda 2" de la vitrina: no
// tiene pantalla; el lado derecho sale como una placa avisandolo (se confirma contra window.vitrina.catalogo()).
const PANTALLA_DE_MUESTRA = {
  inicio: { pantalla: 'inicio', muestra: '' },
  evento: { pantalla: 'decision', muestra: 'evento' },
  planAmateur: { pantalla: 'decision', muestra: 'planAmateur' },
  serie: { pantalla: 'partido', muestra: 'serie' },
  serieReplan: { pantalla: 'partido', muestra: 'serieReplan' },
  swiss: { pantalla: 'partido', muestra: 'swiss' },
  mercado: { pantalla: 'mercado', muestra: 'mercado' },
  final: { pantalla: 'cumbre', muestra: 'final' },
  cierreAnio: null
};
const ORDEN = ['inicio', 'evento', 'planAmateur', 'cierreAnio', 'serie', 'serieReplan', 'swiss', 'mercado', 'final'];

const PLAYWRIGHT_CORE = process.env.PLAYWRIGHT_CORE
  ?? 'C:/Users/Ignacio/AppData/Local/npm-cache/_npx/e058441c325e062a/node_modules/playwright-core';
const CHROMIUM_EXE = process.env.CHROMIUM_EXE
  ?? 'C:/Users/Ignacio/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
if (!fs.existsSync(PLAYWRIGHT_CORE)) { console.error(`No encuentro playwright-core en ${PLAYWRIGHT_CORE}. Definí PLAYWRIGHT_CORE.`); process.exit(2); }
if (!fs.existsSync(CHROMIUM_EXE)) { console.error(`No encuentro Chromium en ${CHROMIUM_EXE}. Definí CHROMIUM_EXE.`); process.exit(2); }
const { chromium } = createRequire(import.meta.url)(PLAYWRIGHT_CORE);

// ---------- los guardados ----------
const DIR_GUARDADOS = path.join(RAIZ, 'vitrina', 'datos', 'guardados');
if (!fs.existsSync(DIR_GUARDADOS)) { console.error(`No existe ${DIR_GUARDADOS} (corré vitrina/datos/generar.mjs)`); process.exit(2); }
const leerJson = (f) => JSON.parse(fs.readFileSync(path.join(DIR_GUARDADOS, f), 'utf8'));
const hayGuardado = (id) => fs.existsSync(path.join(DIR_GUARDADOS, id === 'inicio' ? 'inicio-historial.json' : `${id}.json`));
const muestras = ORDEN.filter((id) => (!SOLO || SOLO.includes(id)));
const desconocidas = (SOLO ?? []).filter((id) => !ORDEN.includes(id));
if (desconocidas.length) { console.error(`--muestras: no conozco ${desconocidas.join(', ')} (las que hay: ${ORDEN.join(', ')})`); process.exit(2); }

// ---------- servidores propios ----------
const hijos = [];
function levantar(nombre, argv, env, patronPuerto) {
  return new Promise((resolver, rechazar) => {
    const p = spawn(process.execPath, argv, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    hijos.push(p);
    let listo = false;
    const t = setTimeout(() => rechazar(new Error(`${nombre}: no arranco en 15 s`)), 15000);
    const alLeer = (d) => {
      const m = String(d).match(patronPuerto);
      if (m && !listo) { listo = true; clearTimeout(t); resolver(Number(m[1])); }
    };
    p.stdout.on('data', alLeer);
    p.stderr.on('data', alLeer);
    p.on('exit', (c) => { if (!listo) { clearTimeout(t); rechazar(new Error(`${nombre}: salio con ${c}`)); } });
  });
}
function bajarTodo() {
  for (const p of hijos) { try { p.kill(); } catch { /* ya estaba muerto */ } }
}
process.on('exit', bajarTodo);
process.on('SIGINT', () => { bajarTodo(); process.exit(130); });

// ---------- el navegador ----------
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => String(s).replace(/[^a-zA-Z0-9_-]+/g, '_');
const errores = [];

// Termina las animaciones finitas y pausa las infinitas: lo que el ojo ve es el cuadro "asentado".
async function asentar(page, { vitrina }) {
  if (vitrina) {
    await page.evaluate((ms) => window.vitrina?.congelar?.(ms), CONGELAR_MS).catch(() => {});
  } else {
    await pausa(ASENTAR_MS);
    await page.evaluate((ms) => {
      const fx = window.__fx ?? window.fx ?? window.lolero?.fx;
      if (fx && typeof fx.congelar === 'function') fx.congelar(ms);
    }, CONGELAR_MS).catch(() => {});
  }
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      try {
        const it = a.effect?.getComputedTiming?.().iterations;
        if (it === Infinity) a.pause(); else a.finish();
      } catch { try { a.pause(); } catch { /* sin linea de tiempo */ } }
    }
  }).catch(() => {});
  await pausa(120);
}

async function capturaDelJuego(browser, id, tam, destino) {
  const ctx = await browser.newContext({ viewport: { width: tam.ancho, height: tam.alto } });
  const page = await ctx.newPage();
  const log = [];
  page.on('console', (m) => { if (m.type() === 'error') log.push(`[console.error] ${m.text()}`); });
  page.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => log.push(`[reqfail] ${r.url()}`));
  const resultado = { ok: false, motivo: null, errores: log, escenario: null };
  try {
    const base = `http://127.0.0.1:${PUERTO_JUEGO}/`;
    await page.goto(base, { waitUntil: 'load' });
    if (id === 'inicio') {
      const h = leerJson('inicio-historial.json');
      await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(v)); }, [h.clave, h.valor]);
      await page.reload({ waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
    } else {
      const g = leerJson(`${id}.json`);
      await page.evaluate(([c, v, claves]) => {
        localStorage.clear();
        localStorage.setItem(claves.carrera, c);
        localStorage.setItem(claves.vista, JSON.stringify(v));
      }, [g.carrera, g.vista, g.claves]);
      await page.reload({ waitUntil: 'load' });
      try {
        await page.waitForSelector('#continuarBtn:not([hidden])', { timeout: 10000 });
      } catch {
        resultado.motivo = 'el juego no ofrece "Continuar" con este guardado (no lo reconoce o la UI no lo muestra)';
        await page.screenshot({ path: destino }).catch(() => {});
        return resultado;
      }
      await page.click('#continuarBtn');
      // La parada de la muestra: `data-pieza` pasa de 'inicio' a la pieza (decision, partido, mercado, minijuego, final).
      try {
        await page.waitForFunction(() => {
          const p = document.querySelector('.shell[data-pieza]')?.dataset.pieza;
          return p && p !== 'inicio' && p !== 'relato';
        }, null, { timeout: 15000 });
      } catch {
        resultado.motivo = 'tocó Continuar pero no apareció ninguna parada (data-pieza siguió en inicio/relato)';
      }
      await page.evaluate(() => document.fonts.ready);
    }
    await asentar(page, { vitrina: false });
    resultado.pieza = await page.evaluate(() => document.querySelector('.shell[data-pieza]')?.dataset.pieza ?? null);
    resultado.titulo = await page.evaluate(() => (document.querySelector('#decision h2, #decision h1, #tarjeta h2, #tarjeta h1, h1')?.innerText ?? '').split('\n')[0].trim().slice(0, 90));
    resultado.escenario = await page.evaluate(() => {
      const e = document.querySelector('#escenario');
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), width: Math.round(r.width), viewport: document.documentElement.clientWidth };
    });
    resultado.webgl = await page.evaluate(() => { const c = document.createElement('canvas'); return Boolean(c.getContext('webgl2') || c.getContext('webgl')); });
    await page.screenshot({ path: destino, animations: 'allow', caret: 'hide' });
    resultado.ok = !resultado.motivo;
  } catch (e) {
    resultado.motivo = `fallo la captura del juego: ${e.message}`;
  } finally {
    await ctx.close();
  }
  return resultado;
}

async function capturaDeLaVitrina(browser, id, tam, destino) {
  const donde = PANTALLA_DE_MUESTRA[id];
  const resultado = { ok: false, motivo: null, errores: [] };
  if (!donde) { resultado.motivo = 'la vitrina no tiene esta pantalla (cierreAnio es ronda 2 de la vitrina)'; return resultado; }
  const ctx = await browser.newContext({ viewport: { width: tam.ancho, height: tam.alto } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  page.on('console', (m) => { if (m.type() === 'error') resultado.errores.push(`[console.error] ${m.text()}`); });
  page.on('pageerror', (e) => resultado.errores.push(`[pageerror] ${e.message}`));
  try {
    const hash = `pantalla=${donde.pantalla}${donde.muestra ? `&muestra=${donde.muestra}` : ''}&op=linea&era=auto&dispositivo=${tam.dispositivo}&panel=0${SIN_WEBGL ? '&webgl=0' : ''}`;
    await page.goto(`http://127.0.0.1:${PUERTO_VITRINA}/fusion/index.html#${hash}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.vitrina && typeof window.vitrina.estado === 'function', null, { timeout: 15000 });
    const hay = await page.evaluate(([p, m]) => {
      const c = window.vitrina.catalogo();
      return c.pantallas.includes(p) && (!m || (c.muestras[p] ?? []).includes(m));
    }, [donde.pantalla, donde.muestra]);
    if (!hay) { resultado.motivo = `la vitrina (fusion) no tiene ${donde.pantalla}/${donde.muestra}`; return resultado; }
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.race([
      window.vitrina.listo ? window.vitrina.listo() : Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))),
      new Promise((r) => setTimeout(r, 8000))
    ]));
    await pausa(1800); // la entrada de la pantalla
    await asentar(page, { vitrina: true });
    await page.screenshot({ path: destino, animations: 'allow', caret: 'hide' });
    resultado.ok = true;
  } catch (e) {
    resultado.motivo = `fallo la captura de la vitrina: ${e.message}`;
  } finally {
    await ctx.close();
  }
  return resultado;
}

// La composicion: dos <img> en una pagina con una barra de rotulos; se saca con el mismo Chromium.
async function componer(browser, { ruta, tam, id, juego, vitrina, rotulos }) {
  const dataUrl = (f) => (f && fs.existsSync(f) ? `data:image/png;base64,${fs.readFileSync(f).toString('base64')}` : null);
  const lado = (src, nota) => (src
    ? `<img src="${src}" width="${tam.ancho}" height="${tam.alto}">`
    : `<div class="vacio" style="width:${tam.ancho}px;height:${tam.alto}px">${nota}</div>`);
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#111;color:#ddd;font:600 15px/28px system-ui,sans-serif}
    .fila{display:flex;gap:6px}.col{display:flex;flex-direction:column}
    .rot{height:28px;padding:0 10px;background:#222;white-space:nowrap;overflow:hidden}
    img{display:block}.vacio{display:flex;align-items:center;justify-content:center;background:#1a1a1a;color:#999;text-align:center;padding:20px;box-sizing:border-box}
  </style><div class="fila">
    <div class="col"><div class="rot">${rotulos.juego}</div>${lado(dataUrl(juego), rotulos.notaJuego)}</div>
    <div class="col"><div class="rot">${rotulos.vitrina}</div>${lado(dataUrl(vitrina), rotulos.notaVitrina)}</div>
  </div>`;
  const ctx = await browser.newContext({ viewport: { width: tam.ancho * 2 + 6, height: tam.alto + 28 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
  await page.screenshot({ path: ruta, fullPage: true });
  await ctx.close();
}

// ---------- corrida ----------
fs.mkdirSync(path.join(SALIDA, 'partes'), { recursive: true });
const manifiesto = { fecha: new Date().toISOString(), sinWebgl: SIN_WEBGL, salida: SALIDA, tamanos: TAMANOS.map((t) => t.nombre), muestras: {} };
let browser;
try {
  const puertoJuego = await levantar('juego', ['server.js'], { PORT: String(PUERTO_JUEGO) }, /localhost:(\d+)/);
  const puertoVitrina = await levantar('vitrina', ['vitrina/servir.mjs', '--puerto', String(PUERTO_VITRINA)], {}, /(?:localhost|127\.0\.0\.1):(\d+)/);
  if (puertoJuego !== PUERTO_JUEGO) console.warn(`el juego quedo en ${puertoJuego} (el ${PUERTO_JUEGO} estaba ocupado)`);
  if (puertoVitrina !== PUERTO_VITRINA) throw new Error(`la vitrina quedo en ${puertoVitrina}, no en ${PUERTO_VITRINA}`);
  PUERTO_JUEGO = puertoJuego; // server.js prueba el siguiente puerto si el pedido esta ocupado: las capturas usan el anunciado

  const argsNavegador = ['--no-sandbox', ...(SIN_WEBGL ? ['--disable-3d-apis'] : ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'])];
  browser = await chromium.launch({ executablePath: CHROMIUM_EXE, headless: true, args: argsNavegador });

  let n = 0;
  for (const id of muestras) {
    n++;
    const idx = String(n).padStart(2, '0');
    const entrada = manifiesto.muestras[id] = { tieneGuardado: hayGuardado(id), tamanos: {} };
    if (!entrada.tieneGuardado) { entrada.motivo = 'sin guardado en vitrina/datos/guardados'; console.log(`${id}: sin guardado, se saltea`); continue; }
    for (const tam of TAMANOS) {
      const base = `${idx}-${slug(id)}-${tam.nombre}`;
      const fJuego = path.join(SALIDA, 'partes', `${base}-juego.png`);
      const fVitrina = path.join(SALIDA, 'partes', `${base}-vitrina.png`);
      const juego = await capturaDelJuego(browser, id, tam, fJuego);
      const vitrina = await capturaDeLaVitrina(browser, id, tam, fVitrina);
      const ruta = path.join(SALIDA, `${base}.png`);
      await componer(browser, {
        ruta, tam, id, juego: fJuego, vitrina: fVitrina,
        rotulos: {
          juego: `JUEGO · ${id} · ${tam.nombre}${SIN_WEBGL ? ' · sin WebGL' : ''}${juego.pieza ? ` · pieza ${juego.pieza}` : ''}`,
          vitrina: `VITRINA (fusion, op=linea) · ${id} · ${tam.nombre}`,
          notaJuego: juego.motivo ?? '', notaVitrina: vitrina.motivo ?? ''
        }
      });
      entrada.tamanos[tam.nombre] = { composicion: path.basename(ruta), juego, vitrina };
      for (const e of [...juego.errores, ...vitrina.errores]) errores.push(`${base}: ${e}`);
      console.log(`${base}: juego ${juego.ok ? 'ok' : 'NO (' + juego.motivo + ')'} · vitrina ${vitrina.ok ? 'ok' : 'NO (' + vitrina.motivo + ')'}`);
    }
  }
  manifiesto.erroresDeConsola = errores;
} catch (e) {
  manifiesto.fallo = String(e.stack ?? e);
  console.error(manifiesto.fallo);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(SALIDA, 'manifiesto.json'), JSON.stringify(manifiesto, null, 1));
  await browser?.close().catch(() => {});
  bajarTodo();
}
console.log(`\nComposiciones en ${SALIDA}`);
