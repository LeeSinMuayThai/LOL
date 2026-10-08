// El contraste de la pantalla (FASE V, V7 / D48): una regla escrita y medible para "se lee a un metro".
//
//   node src/dev/contraste.mjs --puerto 8000 --seed 25 [--anchos 1440x900,390x844] [--salida <dir>] [--max-auditorias 40]
//
// LA REGLA (DISENO.md §9):
//   1. Todo texto visible tiene un contraste WCAG >= 4,5:1 contra su fondo real; >= 3:1 si es texto grande
//      (>= 24 px, o >= 18,66 px en negrita).
//   2. Los adornos que transmiten estado (el borde de una opcion elegida, el anillo de foco) llevan >= 3:1.
//
// COMO MIDE: juega una carrera corta en Chromium (sin politica: elige la primera opcion de cada parada; es una visita, no una
// carrera con sentido) y, en cada pieza distinta (inicio, relato, decision, partido, mercado, minijuego, final), con cada
// acompañante distinto y con los seis cuartos abiertos, recorre TODOS los nodos de texto visibles. Para cada uno calcula, con
// los `getComputedStyle`, el color del texto (con su alfa y el `opacity` de sus ancestros) y el fondo efectivo (las capas de
// `background-color` de los ancestros, de la raiz hacia abajo, componiendo alfas). Reporta los que no llegan, agrupados por
// selector + colores.
//
// LO QUE NO MIDE (y lo dice): texto sobre `background-image` (degradados, ilustraciones: usa solo el color de fondo, y cuenta
// los nodos que tienen una imagen detras en `conImagen`); los `::before/::after` con `content`; el `::backdrop` de un <dialog>
// (oscurece, asi que ignorarlo es conservador); los controles deshabilitados (WCAG los exime).
// No es un check de validate.js: es un script que se corre a mano cuando se toca un color de tokens.css.
//
// Necesita `node server.js` corriendo. playwright-core y Chromium salen de PLAYWRIGHT_CORE y CHROMIUM_EXE (como recorrido.mjs).
// Sale con codigo 1 si hay fallos (para poder usarlo en un script), 0 si no.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

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
const PUERTO = String(args.puerto ?? 8000);
const SEED = String(args.seed ?? 25);
const ANCHOS = String(args.anchos ?? '1440x900,390x844').split(',').map((s) => s.split('x').map(Number));
const SALIDA = path.resolve(String(args.salida ?? 'contraste-salida'));
const MAX_AUDITORIAS = Number(args['max-auditorias'] ?? 40);

const PLAYWRIGHT_CORE = process.env.PLAYWRIGHT_CORE
  ?? 'C:/Users/Ignacio/AppData/Local/npm-cache/_npx/e058441c325e062a/node_modules/playwright-core';
const CHROMIUM_EXE = process.env.CHROMIUM_EXE
  ?? 'C:/Users/Ignacio/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
if (!fs.existsSync(PLAYWRIGHT_CORE)) { console.error(`No encuentro playwright-core en ${PLAYWRIGHT_CORE}. Definí PLAYWRIGHT_CORE.`); process.exit(2); }
if (!fs.existsSync(CHROMIUM_EXE)) { console.error(`No encuentro Chromium en ${CHROMIUM_EXE}. Definí CHROMIUM_EXE.`); process.exit(2); }
const require = createRequire(import.meta.url);
const { chromium } = require(PLAYWRIGHT_CORE);
fs.mkdirSync(SALIDA, { recursive: true });

const UMBRAL_TEXTO = 4.5;
const UMBRAL_GRANDE = 3;
const UMBRAL_ADORNO = 3;

// ---------- lo que corre dentro de la pagina ----------
function auditarEnPagina({ umbralTexto, umbralGrande, umbralAdorno }) {
  const raiz = document.documentElement;
  function parsear(c) {
    let m = c.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.%]+))?\s*\)$/);
    if (m) {
      let a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      return { r: +m[1], g: +m[2], b: +m[3], a };
    }
    m = c.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)$/);
    if (m) {
      const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      return { r: +m[1] * 255, g: +m[2] * 255, b: +m[3] * 255, a };
    }
    return null;
  }
  const mezclar = (fondo, capa, a) => ({
    r: fondo.r * (1 - a) + capa.r * a, g: fondo.g * (1 - a) + capa.g * a, b: fondo.b * (1 - a) + capa.b * a
  });
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  const nombre = (e) => {
    if (!e || !e.tagName) return '';
    const id = e.id ? '#' + e.id : '';
    const cl = typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    return e.tagName.toLowerCase() + id + cl;
  };
  const selector = (e) => `${nombre(e)} < ${nombre(e.parentElement)}`;

  // El fondo efectivo de un elemento (incluido el propio): capas de la raiz hacia abajo. El `opacity` de cada ancestro
  // multiplica el alfa de sus capas y del texto que lleva dentro.
  function fondoDe(el) {
    const cadena = [];
    for (let e = el; e; e = e.parentElement) cadena.unshift(e);
    let fondo = { r: 0, g: 0, b: 0 };
    let opacidad = 1;
    let conImagen = false;
    for (const e of cadena) {
      const cs = getComputedStyle(e);
      opacidad *= parseFloat(cs.opacity);
      const bg = parsear(cs.backgroundColor);
      if (bg && bg.a > 0) fondo = mezclar(fondo, bg, bg.a * opacidad);
      if (cs.backgroundImage && cs.backgroundImage !== 'none' && e !== raiz && e !== document.body) conImagen = true;
    }
    return { fondo, opacidad, conImagen };
  }

  const visible = (e) => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  const fallos = [];
  let nodos = 0, conImagen = 0, ignoradosDeshabilitados = 0, sinColor = 0;
  const caminante = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const OMITIR = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE', 'TEMPLATE']);
  for (let n = caminante.nextNode(); n; n = caminante.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const p = n.parentElement;
    if (!p || OMITIR.has(p.tagName) || !visible(p)) continue;
    const rango = document.createRange();
    rango.selectNodeContents(n);
    const r = rango.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const control = p.closest('button, a, input, select, textarea, summary, [role="button"], [role="tab"]');
    if (p.closest('button:disabled, [disabled], [aria-disabled="true"], [inert]') || (control && getComputedStyle(control).pointerEvents === 'none')) { ignoradosDeshabilitados++; continue; }
    const cs = getComputedStyle(p);
    const esSvg = p instanceof SVGElement;
    const texto = parsear(esSvg ? cs.fill : cs.color);
    if (!texto) { sinColor++; continue; }
    const { fondo, opacidad, conImagen: img } = fondoDe(p);
    const aT = texto.a * opacidad;
    if (aT === 0) continue;
    nodos++;
    if (img) conImagen++;
    const final = mezclar(fondo, texto, aT);
    const c = ratio(final, fondo);
    const px = parseFloat(cs.fontSize);
    const peso = parseInt(cs.fontWeight, 10) || 400;
    const grande = px >= 24 || (px >= 18.66 && peso >= 700);
    const umbral = grande ? umbralGrande : umbralTexto;
    if (c < umbral) {
      fallos.push({
        selector: selector(p), texto: n.nodeValue.trim().slice(0, 50), ratio: +c.toFixed(2), umbral, px: +px.toFixed(1), peso,
        color: `rgba(${Math.round(texto.r)},${Math.round(texto.g)},${Math.round(texto.b)},${+texto.a.toFixed(2)})${opacidad < 1 ? ` x opacity ${+opacidad.toFixed(2)}` : ''}`,
        fondo: `rgb(${Math.round(fondo.r)},${Math.round(fondo.g)},${Math.round(fondo.b)})`,
        imagen: img
      });
    }
  }

  // Adornos de estado: el borde de lo elegido y el anillo de foco, >= 3:1 contra lo que hay afuera.
  const adornos = [];
  const ELEGIDOS = '.elegido, .campeon-tile--elegido, [aria-pressed="true"], [aria-selected="true"], [aria-checked="true"], [data-elegido="si"], [data-estado="elegido"]';
  for (const e of document.querySelectorAll(ELEGIDOS)) {
    if (!visible(e)) continue;
    const cs = getComputedStyle(e);
    const lados = ['Top', 'Right', 'Bottom', 'Left'].filter((l) => parseFloat(cs['border' + l + 'Width']) > 0 && cs['border' + l + 'Style'] !== 'none'
      && (parsear(cs['border' + l + 'Color'])?.a ?? 0) > 0);
    const afuera = e.parentElement ? fondoDe(e.parentElement) : { fondo: { r: 0, g: 0, b: 0 }, opacidad: 1 };
    const adentro = fondoDe(e);
    // Lo que marca "elegido" puede ser el borde o el relleno propio (un fondo distinto al de afuera): se mide el mejor de los dos.
    let mejor = null;
    for (const l of lados) {
      const borde = parsear(cs['border' + l + 'Color']);
      const fb = mezclar(afuera.fondo, borde, borde.a * adentro.opacidad);
      const r = ratio(fb, afuera.fondo);
      if (mejor === null || r > mejor) mejor = r;
    }
    if (mejor === null) { adornos.push({ tipo: 'elegido', selector: selector(e), sinBorde: true, ratio: null }); continue; }
    adornos.push({ tipo: 'elegido', selector: selector(e), ratio: +mejor.toFixed(2), umbral: umbralAdorno });
  }
  return { nodos, conImagen, ignoradosDeshabilitados, sinColor, fallos, adornos, ELEGIDOS };
}

// El anillo de foco: enfoca (con focus-visible) un ejemplar de cada selector y mide su outline contra lo de afuera.
function focoEnPagina({ umbralAdorno, muestras }) {
  const parsear = (c) => {
    const m = c.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.%]+))?\s*\)$/);
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : parseFloat(m[4]) } : null;
  };
  const mezclar = (f, c, a) => ({ r: f.r * (1 - a) + c.r * a, g: f.g * (1 - a) + c.g * a, b: f.b * (1 - a) + c.b * a });
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  const nombre = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const fondoDe = (el) => {
    const cadena = [];
    for (let e = el; e; e = e.parentElement) cadena.unshift(e);
    let fondo = { r: 0, g: 0, b: 0 }, op = 1;
    for (const e of cadena) { const cs = getComputedStyle(e); op *= parseFloat(cs.opacity); const bg = parsear(cs.backgroundColor); if (bg && bg.a > 0) fondo = mezclar(fondo, bg, bg.a * op); }
    return fondo;
  };
  const vistos = new Set();
  const out = [];
  const foco = document.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])');
  for (const e of foco) {
    if (!e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const k = nombre(e);
    if (vistos.has(k) || vistos.size >= muestras) continue;
    vistos.add(k);
    document.activeElement?.blur?.();
    const lados = ['Top', 'Right', 'Bottom', 'Left'];
    const antes = lados.map((l) => getComputedStyle(e)['border' + l + 'Color']);
    try { e.focus({ focusVisible: true }); } catch { continue; }
    if (document.activeElement !== e) continue;
    const cs = getComputedStyle(e);
    const grosor = cs.outlineStyle !== 'none' ? parseFloat(cs.outlineWidth) : 0;
    const col = parsear(cs.outlineColor);
    const afuera = e.parentElement ? fondoDe(e.parentElement) : { r: 0, g: 0, b: 0 };
    let r = null, via = 'outline';
    if (grosor > 0 && col) r = +ratio(mezclar(afuera, col, col.a), afuera).toFixed(2);
    else {
      // Sin outline: el foco puede ser un cambio de color de borde (los inputs del inicio) o una sombra.
      const nuevos = lados.map((l) => cs['border' + l + 'Color']);
      const i = nuevos.findIndex((c, j) => c !== antes[j]);
      const cb = i >= 0 ? parsear(nuevos[i]) : null;
      if (cb) { via = 'borde'; r = +ratio(mezclar(afuera, cb, cb.a), afuera).toFixed(2); }
    }
    out.push({ tipo: 'foco', selector: k, anillo: r !== null, via, ratio: r, umbral: umbralAdorno, sombra: cs.boxShadow !== 'none' });
    e.blur();
  }
  return out;
}

// ---------- la visita ----------
const resultados = [];
for (const [ancho, alto] of ANCHOS) {
  const browser = await chromium.launch({ executablePath: CHROMIUM_EXE, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  const auditorias = [];
  const vistas = new Set();
  const etiqueta = `${ancho}x${alto}`;

  async function auditar(clave, { foco = false } = {}) {
    if (vistas.has(clave) || auditorias.length >= MAX_AUDITORIAS) return;
    vistas.add(clave);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    const r = await page.evaluate(auditarEnPagina, { umbralTexto: UMBRAL_TEXTO, umbralGrande: UMBRAL_GRANDE, umbralAdorno: UMBRAL_ADORNO });
    if (foco) r.foco = await page.evaluate(focoEnPagina, { umbralAdorno: UMBRAL_ADORNO, muestras: 14 });
    auditorias.push({ clave, ...r });
  }
  const pieza = () => page.evaluate(() => document.querySelector('.shell')?.dataset.pieza ?? null);
  const acomp = () => page.evaluate(() => document.querySelector('#acompanante')?.dataset.acompanante ?? '');
  async function velocidad(quiero) {
    for (let i = 0; i < 4; i++) {
      const t = await page.textContent('#toggleVelocidad').catch(() => '');
      if (t.includes(quiero)) return;
      await page.click('#toggleVelocidad').catch(() => {});
    }
  }
  async function cuartos(prefijo) {
    for (const letra of ['v', 't', 'e', 'm', 'c', 'r']) {
      await page.keyboard.press(letra);
      await page.waitForTimeout(250);
      const abierto = await page.evaluate(() => document.querySelector('#cuarto')?.open ?? false);
      if (abierto) await auditar(`${prefijo} · cuarto ${letra}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
    }
  }

  await page.goto(`http://127.0.0.1:${PUERTO}/?seed=${SEED}`);
  await page.waitForSelector('#rolGrid > *');
  // Las transiciones se apagan: un getComputedStyle a mitad de una transicion lee el color viejo.
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
  await velocidad('INST');
  await auditar('inicio (sin elegir)', { foco: true });
  await page.locator('#regionGrid > *').first().click();
  await page.locator('#perfilGrid > *').first().click();
  await page.locator('#rolGrid > *').first().click();
  for (let i = 0; i < 3; i++) await page.locator('#campeonGrid .campeon-tile:not(.campeon-tile--elegido)').first().click();
  await page.waitForSelector('#run:not([disabled])');
  await auditar('inicio (draft completo)');
  await page.click('#run');

  let primerCuarto = false, relatos = 0;
  for (let it = 0; it < 1500 && auditorias.length < MAX_AUDITORIAS; it++) {
    const p = await pieza();
    if (p === 'final') {
      await page.waitForTimeout(700);
      await auditar('final', { foco: true });
      await cuartos('final');
      break;
    }
    if (p === 'relato') {
      if (relatos < 2) {
        // El relato a 1x para verlo con texto en pantalla (a INST pasa en un parpadeo).
        await velocidad('1×');
        await page.waitForTimeout(1800);
        await auditar(`relato (${relatos + 1}) · ${await acomp() || 'sin acompañante'}`);
        relatos++;
        await velocidad('INST');
      } else await page.waitForTimeout(120);
      continue;
    }
    if (p === 'decision' || p === 'partido') {
      const titulo = (await page.innerText('#decisionTitle').catch(() => '')).slice(0, 40);
      await auditar(`${p} · ${await acomp() || 'sin acompañante'} · ${titulo}`, { foco: !primerCuarto });
      if (!primerCuarto) { primerCuarto = true; await cuartos(p); }
      const o = page.locator('#decisionOptions .option-btn:not([disabled])').first();
      if (await o.count()) await o.click().catch(() => {});
      else await page.waitForTimeout(150);
      continue;
    }
    if (p === 'mercado') {
      await auditar(`mercado · ${await acomp() || 'sin acompañante'}`);
      const b = page.locator('#mercadoGrid .mercado-card-acciones button').first();
      if (await b.count()) await b.click().catch(() => {});
      else await page.locator('#mercadoEsperar:not([hidden])').click({ timeout: 1000 }).catch(() => {});
      await page.waitForTimeout(200);
      continue;
    }
    if (p === 'minijuego') {
      const titulo = (await page.innerText('#minijuegoTitle').catch(() => '')).slice(0, 40);
      await auditar(`minijuego (antes) · ${titulo}`);
      await page.locator('.minijuego-espera-boton').first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(300);
      await auditar(`minijuego (jugando) · ${titulo}`);
      for (let k = 0; k < 160 && (await pieza()) === 'minijuego'; k++) {
        await page.waitForTimeout(250);
        if (k % 8 === 7) for (const b of (await page.locator('#minijuegoWidget button:not([disabled])').all()).slice(0, 2)) await b.click({ timeout: 800 }).catch(() => {});
      }
      continue;
    }
    await page.waitForTimeout(150);
  }
  await browser.close();

  // Se agrupan los fallos por selector + colores (el mismo patron en muchas auditorias es UN problema de diseño).
  const patrones = new Map();
  let nodosTotales = 0, nodosFallados = 0;
  for (const a of auditorias) {
    nodosTotales += a.nodos;
    for (const f of a.fallos) {
      nodosFallados++;
      const k = `${f.selector} | ${f.color} | ${f.fondo} | ${f.px}px/${f.peso}`;
      const g = patrones.get(k) ?? { ...f, nodos: 0, auditorias: new Set() };
      g.nodos++; g.auditorias.add(a.clave);
      if (f.ratio < g.ratio) g.ratio = f.ratio;
      patrones.set(k, g);
    }
  }
  const adornosMal = [];
  for (const a of auditorias) {
    for (const d of [...a.adornos, ...(a.foco ?? [])]) {
      const mal = d.tipo === 'foco' ? (!d.anillo && !d.sombra) || (d.ratio !== null && d.ratio < UMBRAL_ADORNO)
        : d.sinBorde || (d.ratio !== null && d.ratio < UMBRAL_ADORNO);
      if (mal) adornosMal.push({ en: a.clave, ...d });
    }
  }
  const lista = [...patrones.values()].map((g) => ({ ...g, auditorias: g.auditorias.size })).sort((x, y) => y.nodos - x.nodos);
  resultados.push({
    viewport: etiqueta, auditorias: auditorias.length, claves: auditorias.map((a) => a.clave),
    nodosTotales, nodosFallados, patrones: lista.length,
    conImagen: auditorias.reduce((s, a) => s + a.conImagen, 0),
    deshabilitadosExentos: auditorias.reduce((s, a) => s + a.ignoradosDeshabilitados, 0),
    adornosMedidos: auditorias.reduce((s, a) => s + a.adornos.length + (a.foco?.length ?? 0), 0),
    adornosMal, fallos: lista, errores
  });
}

fs.writeFileSync(path.join(SALIDA, 'contraste.json'), JSON.stringify(resultados, null, 2));
let hayFallos = false;
for (const r of resultados) {
  console.log(`\n=== ${r.viewport}: ${r.auditorias} auditorias, ${r.nodosTotales} nodos de texto (${r.conImagen} con una imagen detras, sin medir la imagen; ${r.deshabilitadosExentos} deshabilitados exentos)`);
  console.log(`    TEXTO: ${r.nodosFallados} nodos no llegan, en ${r.patrones} patrones (selector + colores)`);
  for (const f of r.fallos) {
    console.log(`      ${String(f.ratio).padStart(5)} < ${f.umbral}  x${String(f.nodos).padStart(3)} en ${f.auditorias} aud.  ${f.selector}  [${f.color} sobre ${f.fondo}, ${f.px}px/${f.peso}${f.imagen ? ', con imagen' : ''}]  "${f.texto}"`);
  }
  console.log(`    ADORNOS: ${r.adornosMedidos} medidos, ${r.adornosMal.length} no llegan a ${UMBRAL_ADORNO}:1`);
  for (const d of r.adornosMal) console.log(`      ${d.tipo} ${d.selector} ${d.sinBorde ? '(sin borde)' : d.tipo === 'foco' && !d.anillo ? '(sin anillo)' : `ratio ${d.ratio}`}  en ${d.en}`);
  if (r.errores.length) console.log(`    ERRORES de pagina: ${r.errores.slice(0, 3).join(' | ')}`);
  if (r.nodosFallados || r.adornosMal.length) hayFallos = true;
}
console.log(`\n${hayFallos ? 'HAY FALLOS' : 'TODO LLEGA'} · detalle en ${path.join(SALIDA, 'contraste.json')}`);
process.exit(hayFallos ? 1 : 0);
