// El recorrido en navegador (FASE V, V2-A): juega una carrera de punta a punta en Chromium con una politica que LEE lo que
// muestra la pantalla, y mide lo que PLAN.md §V.2 exige de cada pantalla. Es la linea de base de FASE V: se corre antes y
// despues de cada subfase y los numeros se comparan.
//
//   node src/dev/recorrido.mjs --puerto 8000 --seed 25 --ancho 1440 --alto 900 --salida <dir>
//        [--politica buena|mala] [--max-paradas N] [--modo recorrido|capturas]
//        [--rol N] [--perfil N] [--region N]      (indices en la pantalla de inicio; por defecto 0)
//        [--sin-teclado]                          (sin las pruebas de teclado de V2-B: linea de base sobre una UI vieja)
//
// Necesita `node server.js` corriendo (usa el puerto que ese comando imprime). playwright-core y Chromium salen de las
// variables PLAYWRIGHT_CORE y CHROMIUM_EXE (con las rutas de esta maquina por defecto); no descarga nada.
//
// --modo recorrido (por defecto): juega la carrera; en la PRIMERA parada de cada tipo guarda una captura y mide, con
//   scrollY = 0: (a) los numeros visibles en el viewport, (b) si el ultimo boton de opcion entra en el viewport y, por
//   separado, si el titulo y la opcion 1 se ven enteros, (c) el scroll horizontal, (d) los errores de consola y pageerror.
//   En esa misma parada prueba "retomar": recarga, toca Continuar y verifica que vuelve la misma parada. Escribe
//   `recorrido.json` en --salida: una fila por parada medida y un resumen por tipo.
//   Desde V2-C, ademas (si la UI tiene franja, acompañante y cuartos): (e) la franja y el acompañante no cambian durante el
//   relato (la regla 4, que en V2-B medía topbar y ficha); (f) en CADA parada, el tipo del acompañante (`data-acompanante`,
//   y si se ve: desde 1180 px el aside, debajo el chip "ver contexto") coincide con `acompananteDe` sobre la carrera
//   guardada; (g) en la primera parada de cada tipo, los 6 cuartos abren con clic y con su letra, Esc los cierra, el foco
//   vuelve a la parada y la parada es la misma; (h) las letras no abren nada en el inicio ni en el minijuego; (i) con un
//   cuarto abierto el relato se pausa (no entra ningun beat) y al cerrarlo sigue.
//   (f2) en CADA parada, DONDE esta: desde 1180 px y con acompañante, el aside queda a la derecha del escenario (su `left` >= el
//   `right` del escenario) y arranca a su altura (±40 px); sin acompañante el escenario queda centrado (±40 px); en todos los
//   tamaños el escenario mide <= `--escenario-columna` (720) + el padding de `.shell-cuerpo`. Lo puso la ronda en que un `}` de mas
//   en shell.css dejo el escenario en x=0 y el acompañante debajo, con todo "presente" y nada rojo.
//   §V.8 lo corre con las seeds 25, 39 y 152 a 1440x900, 1024x768 (desde V2-C) y 390x844.
// --modo capturas: velocidad INST + reduced-motion + fuentes cargadas, y capturas fijas (inicio con el draft completo, la
//   primera decision generica, el primer mercado, la primera serie, el primer minijuego antes de "¡Vamos!" y con el
//   widget, y la tarjeta final si llega). Misma seed y mismo ancho => mismas capturas, para comparar byte a byte.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

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
const PUERTO = String(args.puerto ?? 8000);
const SEED = String(args.seed ?? 25);
const ANCHO = Number(args.ancho ?? 1440);
const ALTO = Number(args.alto ?? 900);
const MODO = String(args.modo ?? 'recorrido');
const POL = String(args.politica ?? 'buena');
const MALA = POL === 'mala';
const MAX_PARADAS = Number(args['max-paradas'] ?? 0);
const ROL = Number(args.rol ?? 0);
const PERFIL = Number(args.perfil ?? 0);
const REGION = Number(args.region ?? 0);
// --sin-teclado: sin las pruebas de teclado de V2-B (para medir la linea de base sobre una UI vieja, donde Enter en
// Continuar arranca otra carrera y Enter en Copiar vuelve al inicio: la carrera se desviaria).
const SIN_TECLADO = Boolean(args['sin-teclado']);
const SALIDA = path.resolve(String(args.salida ?? `recorrido-${MODO}-s${SEED}-${ANCHO}x${ALTO}`));
if (!['recorrido', 'capturas'].includes(MODO)) { console.error(`--modo ${MODO}: tiene que ser recorrido o capturas`); process.exit(2); }
if (!['buena', 'mala'].includes(POL)) { console.error(`--politica ${POL}: tiene que ser buena o mala`); process.exit(2); }

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
const logf = path.join(SALIDA, 'log.txt');
fs.writeFileSync(logf, '');
const L = (s) => fs.appendFileSync(logf, s + '\n');
const URL_JUEGO = `http://127.0.0.1:${PUERTO}/?seed=${SEED}`;

// ---------- la pieza visible: UN solo lugar ----------
// Corre dentro de la pagina. Desde V2-B manda `.shell[data-pieza]` (lo escribe solo el director, src/ui/escena.js), traducido
// al vocabulario del recorrido: inicio -> 'setup', relato -> null (el split se esta reproduciendo), final -> 'tarjeta'; decision,
// partido, mercado y minijuego quedan igual. Sin `data-pieza` (una UI anterior a V2-B, para medir la linea de base) cae a la
// logica vieja: que panel del escenario no tiene `hidden`.
function detectarPieza() {
  const shell = document.querySelector('.shell[data-pieza]');
  if (shell) {
    const p = shell.dataset.pieza || null;
    const traduccion = { inicio: 'setup', relato: null, final: 'tarjeta' };
    return p in traduccion ? traduccion[p] : p;
  }
  const v = (s) => { const e = document.querySelector(s); return !!e && !e.hidden; };
  if (v('#nuevaCarrera') || (v('#tarjeta') && document.querySelector('#tarjeta').innerText.length > 20)) return 'tarjeta';
  if (v('#minijuego')) return 'minijuego';
  if (v('#mercado')) return 'mercado';
  if (v('#decision')) return 'decision';
  if (v('#setup')) return 'setup';
  return null;
}
const piezaVisible = (page) => page.evaluate(detectarPieza);
// La pieza CRUDA de `data-pieza` (null en una UI anterior a V2-B).
const piezaCruda = (page) => page.evaluate(() => document.querySelector('.shell[data-pieza]')?.dataset.pieza ?? null);
// V2-B: que lo que se ve coincida con `data-pieza` — exactamente un panel de pieza visible, y el que corresponde.
function panelesVisibles() {
  const vis = (s) => { const e = document.querySelector(s); return !!e && e.checkVisibility({ checkVisibilityCSS: true }); };
  return ['#setup', '#decision', '#mercado', '#minijuego', '#tarjeta'].filter(vis);
}
const PANEL_DE_PIEZA = { inicio: '#setup', decision: '#decision', partido: '#decision', mercado: '#mercado', minijuego: '#minijuego', final: '#tarjeta' };
const esperarPieza = (page, timeout = 30000) =>
  page.waitForFunction(`(() => { const p = (${detectarPieza.toString()})(); return p && p !== 'setup' ? p : false; })()`, null, { timeout });

// ---------- navegador ----------
const errs = [];
const advertencias = [];
const t0 = Date.now();
const browser = await chromium.launch({ executablePath: CHROMIUM_EXE, args: ['--no-sandbox'] });
const ctx = await browser.newContext({
  viewport: { width: ANCHO, height: ALTO },
  ...(MODO === 'capturas' ? { reducedMotion: 'reduce' } : {})
});
// El "Copiar..." de la tarjeta final se prueba con Enter (V2-B): con permiso de portapapeles no ensucia la consola.
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: `http://127.0.0.1:${PUERTO}` }).catch(() => {});
const page = await ctx.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') { errs.push(`[console.error] ${m.text()}`); L(`!! console.error: ${m.text()}`); }
  else if (m.type() === 'warning') { advertencias.push(m.text()); L(`!! console.warning: ${m.text()}`); }
});
page.on('pageerror', (e) => { errs.push(`[pageerror] ${e.message}`); L(`!! pageerror: ${e.message}`); });
page.on('requestfailed', (r) => { errs.push(`[reqfail] ${r.url()}`); L(`!! reqfailed ${r.url()}`); });

async function velocidadInstantanea() {
  for (let i = 0; i < 3; i++) {
    const t = await page.textContent('#toggleVelocidad');
    if (t.includes('INST')) return;
    await page.click('#toggleVelocidad');
  }
}
// V2-B: la velocidad 1× (para ver el relato con sus esperas: la regla 4).
async function velocidadUno() {
  for (let i = 0; i < 3; i++) {
    const t = await page.textContent('#toggleVelocidad');
    if (t.includes('1×')) return;
    await page.click('#toggleVelocidad');
  }
}
// El draft completo en el inicio (region, perfil, linea, 3 mains): "Empezar carrera" queda habilitado.
async function completarElDraft() {
  await page.waitForSelector('#rolGrid > *');
  await page.locator('#regionGrid > *').nth(REGION).click();
  await page.locator('#perfilGrid > *').nth(PERFIL).click();
  await page.locator('#rolGrid > *').nth(ROL).click();
  for (let i = 0; i < 3; i++) await page.locator('#campeonGrid .campeon-tile:not(.campeon-tile--elegido)').first().click();
  await page.waitForSelector('#run:not([disabled])');
}
async function armarElInicio() {
  await page.goto(URL_JUEGO);
  await page.waitForSelector('#rolGrid > *');
  await velocidadInstantanea();
  await completarElDraft();
  if (MODO === 'capturas') await page.evaluate(() => document.fonts.ready);
}

let nCaptura = 0;
async function captura(nombre, { completa = false, arriba = false } = {}) {
  const n = String(nCaptura++).padStart(3, '0');
  if (MODO === 'capturas') {
    await page.mouse.move(0, 0);
    // Las ilustraciones cargan perezosas: sin esperarlas, dos corridas iguales sacan capturas distintas.
    await page.evaluate(() => {
      document.activeElement?.blur?.();
      const imgs = [...document.images];
      imgs.forEach((i) => { i.loading = 'eager'; });
      const listas = imgs.filter((i) => !i.complete).map((i) => new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); }));
      return Promise.race([Promise.all([document.fonts.ready, ...listas]), new Promise((r) => setTimeout(r, 6000))]);
    });
    await page.waitForTimeout(400);
    // El scroll del inicio llega por scrollIntoView suave y puede terminar tarde: se fija arriba al final.
    if (arriba) {
      for (let k = 0; k < 5; k++) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.waitForTimeout(250);
        if ((await page.evaluate(() => window.scrollY)) === 0) break;
      }
    }
  }
  const opts = { animations: 'disabled', caret: 'hide' };
  await page.screenshot({ path: path.join(SALIDA, `${n}-${nombre}.png`), fullPage: false, ...opts });
  if (completa) await page.screenshot({ path: path.join(SALIDA, `${n}-${nombre}-completa.png`), fullPage: true, ...opts });
  L(`## CAPTURA ${n}-${nombre}`);
}

// ---------- politica de decisiones (lee la pantalla; copiada del re-juego de K6) ----------
const W = [['desgaste', -0.9], ['lesi', -0.9], ['presi', -0.4], ['cansancio', -0.6], ['soloq', 1.3], ['mecánica', 1], ['macro', 1], ['laneo', 1], ['teamfight', 1], ['shotcalling', 1], ['adaptabilidad', 1], ['consistencia', 0.9], ['mentalidad', 0.9], ['cabeza', 0.9], ['jerarqu', 0.7], ['sinergia', 0.6], ['maestr', 0.6], ['pool', 0.6], ['confianza', 0.5], ['salud', 0.8], ['sueño', 0.6], ['hype', 0.25], ['arraigo', 0.25], ['plata', 0.1], ['colegio', 0.3], ['familia', 0.4]];
const peso = (t) => { const l = t.toLowerCase(); for (const [k, v] of W) if (l.includes(k)) return v; return 0.5; };
const RETIRO = /retir|colg(á|a)s el mouse|colgar el mouse|dej(á|a)s ac(á|a)|abandon|colgarlo/i;
const LINEA = /otra línea|línea nueva|cambiar de (rol|línea)|cubrir otra/i;
const IMPORT = /coreano|corea|china|import|irte a|te quiere en su cupo/i;
const MALAS_KW = /impuls|forzar|dejarte llevar|hacerles notar|a fondo|stream|quedarte|lealtad|no arriesgar|bancártelo|infiltr|plantarte|hacerte cargo|apostar todo|leerlo entero|ignorar|no ir|rechaz/i;
let pro = false;
function pctDe(s, re) { const m = s.match(re); return m ? +m[1] : null; }
function puntuar(o, edad) {
  const full = o.full;
  const serie = pctDe(full, /La serie: (\d+)%/) ?? pctDe(full, /(\d+)% de (ganar|pasar|clasificar)/);
  let s = 0; const why = [];
  if (serie !== null) { s += serie; why.push(`serie ${serie}%`); }
  for (const k of o.kick) {
    const mag = { baja: 1, media: 2, alta: 3 }[k.mag] ?? 1;
    const lp = /soloq/i.test(k.t) ? pctDe(k.t, /~[+-](\d+) LP/) : null;
    let v = lp !== null ? (k.sube ? 1 : -1) * Math.min(8, lp / 120) : (k.sube ? 1 : -1) * mag * peso(k.t);
    if (!pro && /hype/i.test(k.t)) v *= 2.4;
    s += v;
  }
  if (o.kick.length) why.push(`kick ${o.kick.map((k) => k.t).join(',')}`);
  const p = pctDe(o.prob + ' ' + o.desc, /(\d+)% de que/);
  if (p !== null) { s += (p - 50) / 8; why.push(`p ${p}%`); }
  if (/seguro/i.test(o.riesgoT)) s += 0.4;
  if (/torcido/i.test(o.riesgoT)) s -= 0.4;
  if (/muy abierto/i.test(o.riesgoT)) s -= 0.8;
  const tit = o.titulo + ' ' + o.desc;
  if (RETIRO.test(o.titulo)) { const pen = MALA ? (edad < 28 ? -100 : 0) : (edad < 33 ? -100 : -1); s += pen; why.push(`retiro(${pen})`); }
  if (LINEA.test(tit) && !/(^|\s)no\s|rechaz|quedarte/i.test(o.titulo)) { s -= MALA ? 0 : 3; why.push('cambio de línea'); }
  return { s, why: why.join(' / ') };
}
async function leerOpciones(sel) {
  return page.$$eval(sel, (els) => els.map((e) => ({
    titulo: e.querySelector('.option-title')?.innerText ?? e.innerText.split('\n')[0],
    desc: e.querySelector('.option-desc')?.innerText ?? '',
    plan: e.querySelector('.option-plan')?.innerText ?? '',
    kick: [...e.querySelectorAll('.option-previa-kicker')].map((k) => ({ t: k.innerText, sube: k.className.includes('--sube'), mag: (k.className.match(/magnitud-(\w+)/) || [])[1] })),
    prob: e.querySelector('.option-prob')?.innerText ?? '',
    riesgoT: e.querySelector('.option-riesgo')?.innerText ?? '',
    full: e.innerText.replace(/\n+/g, ' | ')
  })));
}
function elegir(opts, edad, titulo) {
  const sc = opts.map((o) => puntuar(o, edad));
  let idx = 0;
  if (MALA) {
    const v = sc.map((x, i) => x.s - (MALAS_KW.test(opts[i].titulo) ? 2.5 : 0));
    if (!pro) opts.forEach((o, i) => { if (/^firmar|ir a la prueba/i.test(o.titulo)) v[i] -= 50; });
    if (pro) opts.forEach((o, i) => { if (IMPORT.test(o.titulo) && !/rechaz|quedarte|seguir en tu|(^|\s)no\s/i.test(o.titulo)) v[i] += 50; });
    idx = v.indexOf(Math.min(...v));
  } else {
    const v = sc.map((x, i) => x.s - (IMPORT.test(opts[i].titulo) && !/rechaz|quedarte|seguir en tu|(^|\s)no\s/i.test(opts[i].titulo) && /corea|china|import|cupo/i.test(titulo + opts[i].titulo) ? 2 : 0));
    if (!pro) opts.forEach((o, i) => { if (/^firmar|ir a la prueba/i.test(o.titulo)) v[i] += 50; });
    idx = v.indexOf(Math.max(...v));
  }
  return { idx, sc };
}

// ---------- mercado ----------
const LIGAS = [['LCK CL', 2], ['LCP Challengers', 2], ['EMEA Masters', 2], ['Circuito Desafiante', 2], ['NACL', 2], ['LDL', 2], ['LRN', 2], ['LRS', 2], ['LCK', 1], ['LPL', 1], ['LEC', 1], ['LCS', 1], ['CBLOL', 1], ['LCP', 1]];
const tierDe = (t) => { for (const [n, tier] of LIGAS) if (t.includes(n)) return tier; return /tier 3|amateur|ERL|LFL|liga regional/i.test(t) ? 3 : null; };
function puntuarCarta(txt, tierActual) {
  if (/quedar/i.test(txt) && !/Firmar/.test(txt) && tierDe(txt) === null) return { s: (4 - (tierActual || 2)) * 100 + 25, tier: tierActual, quedarse: true };
  const tier = tierDe(txt) ?? 3;
  let s = (4 - tier) * 100;
  if (/más fuerte/i.test(txt)) s += 30; else if (/(\d+)\.º de (\d+)/.test(txt)) { const [, a, b] = txt.match(/(\d+)\.º de (\d+)/); s += 30 * (1 - (a - 1) / Math.max(1, b - 1)); } else if (/mitad de tabla/i.test(txt)) s += 15; else if (/de los de abajo/i.test(txt)) s += 3;
  const BONO = { 'LCK CL': 0, LCK: 40, LPL: 40, LEC: 25, LCS: 12, 'LCP Challengers': 0, LCP: 10, CBLOL: 5 };
  for (const [n] of LIGAS) if (txt.includes(n)) { s += BONO[n] ?? 0; break; }
  const jer = txt.match(/Jerarquía en el equipo: (\d+)(?: \S+ (\d+))?/); if (jer) s += +(jer[2] ?? jer[1]) * 0.2; // la proyectada (`hasta`); sin flecha, la de hoy
  const sal = txt.match(/\$(\d+)k\/año/); if (sal) s += +sal[1] / 100;
  return { s, tier, renov: /RENOVACI/i.test(txt) };
}

// ---------- minijuegos ----------
// Jugador habil, con reaccion humana (copiado del re-juego de K6).
async function jugarMinijuegoBien() {
  return page.evaluate(() => new Promise((resolve) => {
    const W = document.querySelector('#minijuegoWidget');
    const panel = document.querySelector('#minijuego');
    const fin = (r) => { clearInterval(iv); resolve(r); };
    const q = (s) => W.querySelector(s);
    let tipo = null, memo = null, ultimo = -1, jugadoEn = -1, t0 = Date.now();
    // Termina cuando la parada se va (V2-B: `data-pieza` deja de ser 'minijuego'; antes, el panel con `hidden`).
    const seFue = () => { const sh = document.querySelector('.shell[data-pieza]'); return sh ? sh.dataset.pieza !== 'minijuego' : panel.hidden; };
    const iv = setInterval(() => {
      if (seFue() || Date.now() - t0 > 30000) return fin(tipo || 'cerrado');
      // V2-B: con el veredicto en pantalla el minijuego ya termino (la parada se va 1600 ms despues). Antes de esta guarda,
      // las ramas de la_llamada, robar_baron y el_teleport leian nodos que el veredicto ya habia borrado: ~107 pageerror
      // "Cannot read properties of null" por minijuego (1600 ms / 15 ms), que el recorrido se anotaba como errores del juego.
      if (q('.minijuego-resultado')) return;
      if (!tipo) {
        if (q('.minijuego-campo')) tipo = 'la_prueba'; else if (q('.minijuego-ola')) tipo = 'last_hit'; else if (q('.minijuego-teclas')) tipo = 'el_combo';
        else if (q('.minijuego-metronomo')) tipo = 'el_kite'; else if (q('.minijuego-carriles')) tipo = 'dodge'; else if (q('.minijuego-zonas')) tipo = 'la_vision';
        else if (q('.minijuego-slider')) tipo = 'rueda_de_prensa'; else if (q('.minijuego-barra') && /TP/.test(W.innerText)) tipo = 'el_teleport';
        else if (q('.minijuego-barra')) tipo = 'robar_baron'; else if (/señal|AHORA/i.test(W.innerText)) tipo = 'la_llamada';
        if (tipo === 'el_combo') memo = [...W.querySelectorAll('.minijuego-tecla')].map((c) => c.textContent);
        if (tipo === 'la_vision') memo = [...W.querySelectorAll('.minijuego-zona-btn')].map((b) => b.dataset.estado === 'oscura');
        return;
      }
      const ahora = Date.now();
      if (tipo === 'la_prueba') { const b = q('.minijuego-blanco'); if (b) { if (!b.dataset.visto) b.dataset.visto = ahora; else if (ahora - b.dataset.visto > 280) b.click(); } }
      if (tipo === 'last_hit') { const m = q('.minijuego-minion:not([disabled])'); if (m && m.dataset.zona === 'ejecucion') m.click(); }
      if (tipo === 'el_combo') { const bs = [...W.querySelectorAll('.minijuego-tecla-btn:not([disabled])')]; if (bs.length && memo.length) { const k = memo.shift(); bs.find((b) => b.textContent === k)?.click(); } }
      if (tipo === 'el_kite') { const pasos = [...W.querySelectorAll('.minijuego-paso')]; const i = pasos.findIndex((p) => p.dataset.activo === 'si'); if (i >= 0 && i !== jugadoEn) { const av = q('.minijuego-aviso')?.textContent ?? ''; const bs = [...W.querySelectorAll('.minijuego-kite button')]; const b = /Atac/.test(av) ? bs[0] : bs[1]; if (b && !b.disabled) { b.click(); jugadoEn = i; } } }
      if (tipo === 'dodge') { const cs = [...W.querySelectorAll('.minijuego-carril')]; const yo = cs.findIndex((c) => c.dataset.yo === 'si'); const pel = cs.findIndex((c) => c.dataset.peligro === 'si'); if (yo >= 0 && yo === pel) { const bs = W.querySelectorAll('.minijuego-mover button'); (yo > 0 ? bs[0] : bs[1])?.click(); } }
      if (tipo === 'la_vision') { const bs = [...W.querySelectorAll('.minijuego-zona-btn')]; if (bs.length && bs[0].dataset.estado === 'tapada') { const i = memo.findIndex((x) => x); if (i >= 0 && !bs[i].disabled) { memo[i] = false; bs[i].click(); } } }
      if (tipo === 'robar_baron' || tipo === 'el_teleport') {
        const z = q('.minijuego-zona'), c = q('.minijuego-marcador'), b = q('.minijuego-btn');
        if (!z || !c) return;
        const centro = parseFloat(z.style.left) + parseFloat(z.style.width) / 2; const pos = parseFloat(c.style.left || '0');
        const objetivo = tipo === 'el_teleport' ? centro - 18 : centro;
        if (b && !b.disabled && Math.abs(pos - objetivo) < 1.6) b.click();
      }
      if (tipo === 'la_llamada') { const av = q('.minijuego-aviso'); if (av && /AHORA/.test(av.textContent)) { if (ultimo < 0) ultimo = ahora; else if (ahora - ultimo > 200) q('.minijuego-btn')?.click(); } }
      if (tipo === 'rueda_de_prensa' && !window.__prensa) {
        const ps = [...W.querySelectorAll('.minijuego-pistas-lista li')].map((l) => l.textContent);
        const POS = /al frente|hablar fuerte|es tuya|crédito|carácter|no te achicás|hacerte notar|firmeza/i, NEG = /humildad|bajá el tono|bajar el tono|respeto|grupo adelante|no te metas|divo|no sobra/i;
        let sum = 0;
        for (const p of ps) {
          if (/no te mueve/i.test(p)) continue;
          const fijo = /crisis/i.test(p) ? -26 : /slump/i.test(p) ? -16 : /en racha/i.test(p) ? 16 : /Ganaste una final/i.test(p) ? 22 : /Ganaste la serie/i.test(p) ? 14 : /Perdiste una final/i.test(p) ? -29 : /Perdiste la serie/i.test(p) ? -18 : /escándalo/i.test(p) ? -8 : /archirrival/i.test(p) ? 16 : /de tu generación/i.test(p) ? 8 : null;
          if (fijo !== null) { sum += fijo; continue; }
          const m = /algo|un poco|no sobra/i.test(p) ? 6 : 12;
          if (NEG.test(p) && !/al frente/i.test(p)) sum -= m; else if (POS.test(p)) sum += m;
        }
        const tono = Math.max(5, Math.min(95, 58 + sum));
        const sl = q('.minijuego-slider'); if (sl) { sl.value = String(Math.round(tono)); sl.dispatchEvent(new Event('input', { bubbles: true })); }
        window.__prensa = { pistas: ps, tono: Math.round(tono) };
        q('.minijuego-btn')?.click();
      }
    }, 15);
  }));
}
// Jugador apurado: aprieta lo que ve sin leer la consigna.
async function jugarMinijuegoMal() {
  for (let k = 0; k < 60 && (await piezaVisible(page)) === 'minijuego'; k++) {
    const b = page.locator('#minijuegoWidget button:not(.minijuego-espera-boton):not([disabled])');
    const nb = await b.count();
    for (let q = 0; q < Math.min(nb, 2); q++) await b.nth(q).click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(200);
  }
  return 'apurado';
}
// Modo capturas: no toca el widget (el resultado no depende del pulso de nadie). Si no termina solo, cae a la politica.
async function dejarPasarMinijuego() {
  for (let k = 0; k < 120; k++) {
    if ((await piezaVisible(page)) !== 'minijuego') return 'pasivo';
    await page.waitForTimeout(250);
  }
  return MALA ? jugarMinijuegoMal() : jugarMinijuegoBien();
}

// ---------- lo que se mide en cada parada ----------
const PIEZAS = {
  decision: { titulo: '#decisionTitle', opciones: '#decisionOptions .option-btn', botones: '#decisionOptions .option-btn' },
  mercado: { titulo: '#mercadoTitle', opciones: '#mercadoGrid .mercado-card', botones: '#mercadoGrid .mercado-card-acciones button, #mercadoRepresentante:not([hidden]), #mercadoEsperar:not([hidden])' },
  minijuego: { titulo: '#minijuegoTitle', opciones: '#minijuegoWidget button', botones: '#minijuegoWidget button' },
  tarjeta: { titulo: '#tarjeta', opciones: '#nuevaCarrera', botones: '#nuevaCarrera:not([hidden])' }
};
async function medir(pieza) {
  const cfg = PIEZAS[pieza] ?? PIEZAS.decision;
  return page.evaluate((cfg) => {
    window.scrollTo(0, 0);
    for (const e of document.querySelectorAll('*')) if (e.scrollTop > 0) e.scrollTop = 0;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const visible = (e) => !!e && e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    // (a) numeros visibles: cada token /\d+/ de cada nodo de texto visible cuyo rect cae dentro del viewport
    // V2-C: la franja reemplaza a la topbar y el acompañante al riel derecho (los selectores viejos quedan para medir la
    // linea de base sobre una UI anterior).
    const zonas = { franja: '.franja, .topbar', ficha: '.riel', escenario: '#escenario', acompanante: '#acompanante, .riel-der', ticker: '.ticker' };
    const porZona = {};
    let total = 0;
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const rango = document.createRange();
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const el = n.parentElement;
      if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName) || !/\d/.test(n.textContent) || !visible(el)) continue;
      for (const m of n.textContent.matchAll(/\d+/g)) {
        rango.setStart(n, m.index);
        rango.setEnd(n, m.index + m[0].length);
        const r = rango.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0 || r.top < 0 || r.bottom > vh || r.left < 0 || r.right > vw) continue;
        total++;
        const z = Object.keys(zonas).find((k) => el.closest(zonas[k])) ?? 'otro';
        porZona[z] = (porZona[z] ?? 0) + 1;
      }
    }
    // (b) el titulo, la opcion 1 y el ultimo boton. V2-C: en el celular la barra de cuartos va fija abajo y tapa ese
    // borde: lo que queda debajo de ella no "entra".
    const barra = document.querySelector('#cuartosBarra');
    const rb = barra && visible(barra) && getComputedStyle(barra).position === 'fixed' ? barra.getBoundingClientRect() : null;
    const piso = rb && rb.top < vh && rb.top > vh / 2 ? rb.top : vh;
    const caja = (e) => {
      if (!e || !visible(e)) return null;
      const r = e.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), entero: r.top >= 0 && r.bottom <= piso };
    };
    const titulo = caja(document.querySelector(cfg.titulo));
    const opcion1 = caja([...document.querySelectorAll(cfg.opciones)].find(visible));
    const botones = [...document.querySelectorAll(cfg.botones)].filter(visible);
    const ultimo = botones.length ? botones[botones.length - 1].getBoundingClientRect() : null;
    // V2-C: el ultimo atajo de la parada (`[data-atajo]` visible del escenario, V2-B): la medida de §V.8 a 1440.
    const atajos = [...document.querySelectorAll('#escenario [data-atajo]')].filter(visible);
    const ultimoAtajo = atajos.length ? atajos[atajos.length - 1].getBoundingClientRect() : null;
    return {
      viewport: { ancho: vw, alto: vh },
      numerosVisibles: total,
      numerosPorZona: porZona,
      tituloCaja: titulo,
      opcion1Caja: opcion1,
      nBotones: botones.length,
      ultimoBotonBordeInferior: ultimo ? Math.round(ultimo.bottom) : null,
      ultimoBotonEntra: ultimo ? ultimo.bottom <= piso : null,
      piso: Math.round(piso),
      nAtajos: atajos.length,
      ultimoAtajoBordeInferior: ultimoAtajo ? Math.round(ultimoAtajo.bottom) : null,
      ultimoAtajoEntra: ultimoAtajo ? ultimoAtajo.bottom <= piso : null,
      scrollHorizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth
        || document.body.scrollWidth > document.body.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    };
  }, cfg);
}
// La "firma" de una parada: lo que tiene que volver igual despues de recargar y tocar Continuar. Solo lo visible: con
// `data-pieza` (V2-B) los paneles de otras piezas quedan en el DOM con su contenido viejo, escondidos por CSS.
async function firmaDeParada(pieza) {
  const cfg = PIEZAS[pieza] ?? PIEZAS.decision;
  const f = await page.evaluate((cfg) => {
    const vis = (e) => e.checkVisibility({ checkVisibilityCSS: true });
    return {
      titulo: (document.querySelector(cfg.titulo)?.innerText ?? '').split('\n')[0].trim(),
      opciones: [...document.querySelectorAll(cfg.opciones)].filter(vis).map((e) => e.innerText.replace(/\s+/g, ' ').trim())
    };
  }, cfg);
  return { ...f, pieza };
}
// Los sueldos del mercado (y los numeros de la ficha) entran con `countUp` desde 0 durante 420 ms (components/countUp.js):
// leer la firma antes de que terminen daba un "firma-distinta" falso al retomar en el mercado.
const ESPERA_COUNTUP_MS = 600;
// D86 (V2-B): el PRIMER retomar se hace con el draft completo y Enter sobre "Continuar" (antes eso arrancaba una carrera
// nueva y borraba la guardada); los demas, con clic.
let continuarConEnterProbado = SIN_TECLADO;
async function retomar(pieza) {
  if (pieza === 'tarjeta') return { ok: null, motivo: 'no-aplica: la carrera terminada no se guarda' };
  await page.waitForTimeout(ESPERA_COUNTUP_MS);
  const antes = await firmaDeParada(pieza);
  await page.reload();
  try {
    await page.waitForSelector('#continuarBtn:not([hidden])', { timeout: 10000 });
  } catch {
    return { ok: false, motivo: 'sin-boton-continuar', antes };
  }
  const conEnter = !continuarConEnterProbado;
  if (conEnter) {
    continuarConEnterProbado = true;
    await completarElDraft();
    // Otra seed en el input: si Enter arrancara una carrera nueva (el bug), no seria esta misma con la misma seed y la firma
    // lo delataria. Al retomar de verdad, la seed del input no se usa.
    await page.evaluate(() => { const i = document.querySelector('#seedInput'); if (i) i.value = '1'; });
    await page.focus('#continuarBtn');
    await page.keyboard.press('Enter');
  } else {
    await page.click('#continuarBtn');
  }
  try { await esperarPieza(page, 20000); } catch { return { ok: false, motivo: 'no-vuelve-ninguna-parada', conEnter, antes }; }
  await velocidadInstantanea().catch(() => {});
  await page.waitForTimeout(ESPERA_COUNTUP_MS);
  const piezaDespues = await piezaVisible(page);
  const despues = await firmaDeParada(piezaDespues);
  const guardadaSigue = await page.evaluate(() => localStorage.getItem('lolcs-carrera-guardada') !== null);
  const ok = antes.pieza === despues.pieza && antes.titulo === despues.titulo && JSON.stringify(antes.opciones) === JSON.stringify(despues.opciones);
  if (conEnter) teclado.continuarEnter = { ok: ok && guardadaSigue, pieza, guardadaSigue };
  return { ok, motivo: ok ? null : 'firma-distinta', conEnter, antes, despues: ok ? undefined : despues };
}

// ---------- V2-B: el teclado y la regla 4 ----------
const teclado = { continuarEnter: null, mercado1: null, copiarEnterFinal: null, escFinal: null, letrasInicio: null, letrasMinijuego: null, minijuegoPrevia: null, minijuegoJuego: null, previaConCharla: null, previaSinCharla: null, charlaConTecla: null, vamosConTecla: null };
// "1" en el mercado (V2-B): lleva el FOCO al "Firmar" de la oferta 1 y NO firma; Enter sobre ese boton si. Un listener de
// captura en `window` se queda con el primer clic (y lo frena antes de que llegue al boton), para ver si la tecla hizo clic
// y a QUE: el de "1" tiene que ser ninguno, y el de Enter el "Firmar" de la oferta 1, sin cambiar la carrera.
async function probarUnoEnElMercado() {
  if (SIN_TECLADO) return;
  await page.evaluate(() => {
    window.__clicDeLaTecla = null;
    window.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      const card = b?.closest('.mercado-card');
      window.__clicDeLaTecla = {
        texto: b?.innerText.trim() ?? null,
        atajo: b?.dataset.atajo ?? null,
        carta: card ? [...card.parentElement.children].indexOf(card) : null
      };
      e.stopImmediatePropagation();
      e.preventDefault();
    }, { capture: true, once: true });
    document.activeElement?.blur?.();
  });
  await page.keyboard.press('1');
  await page.waitForTimeout(100);
  const clicDeUno = await page.evaluate(() => window.__clicDeLaTecla);
  const foco = await page.evaluate(() => {
    const a = document.activeElement;
    const card = a?.closest('.mercado-card');
    return { texto: a?.innerText?.trim() ?? null, carta: card ? [...card.parentElement.children].indexOf(card) : null };
  });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  const clic = await page.evaluate(() => window.__clicDeLaTecla);
  const sigue = await piezaVisible(page);
  teclado.mercado1 = {
    ok: !clicDeUno && foco.carta === 0 && /Firmar/i.test(foco.texto ?? '')
      && !!clic && clic.carta === 0 && /Firmar/i.test(clic.texto ?? '') && sigue === 'mercado',
    clicDeUno, foco, clic
  };
}
// V3d (D94): el teclado en un minijuego. Un listener de captura en `window` registra los clics sobre algo con `data-atajo`,
// `data-vamos` o la barra de cuartos (sin frenarlos) y los clics que se frenan para no cambiar la parada.
//   - PREVIA (`data-fase="previa"`): 1 hace clic en la charla 1 (si hay charla), V en "¡Vamos!" (si hay); los dos se frenan.
//   - JUEGO (`data-fase="juego"`): ni 1-4, ni V, ni las letras de los cuartos (T/M/C) tocan la parada: solo el minijuego las lee.
async function probarAtajosDeLaPrevia(hayCharla) {
  if (SIN_TECLADO) return;
  await page.evaluate(() => {
    if (window.__frenarClics) window.removeEventListener('click', window.__frenarClics, { capture: true });
    window.__clicsDeTeclas = [];
    window.__frenarClics = (e) => {
      const b = e.target.closest?.('button');
      if (!b) return;
      const marca = b.dataset.atajo ? 'atajo' + b.dataset.atajo : b.hasAttribute('data-vamos') ? 'vamos' : b.closest('#cuartosBarra') ? 'cuarto' : null;
      if (!marca) return;
      window.__clicsDeTeclas.push(marca);
      if (window.__frenar) { e.stopImmediatePropagation(); e.preventDefault(); }
    };
    window.__frenar = true;
    window.addEventListener('click', window.__frenarClics, { capture: true });
    document.activeElement?.blur?.();
  });
  const leer = () => page.evaluate(() => ({ clics: window.__clicsDeTeclas.splice(0), fase: document.querySelector('#minijuego')?.dataset.fase ?? null }));
  const resultado = { hayCharla };
  await page.keyboard.press('1');
  resultado.con1 = await leer();
  await page.keyboard.press('v');
  resultado.conV = await leer();
  await page.evaluate(() => { window.__frenar = false; });
  resultado.ok = resultado.con1.fase === 'previa' && resultado.conV.fase === 'previa'
    && (hayCharla ? resultado.con1.clics.join() === 'atajo1' && resultado.conV.clics.length === 0
      : resultado.con1.clics.length === 0 && resultado.conV.clics.join() === 'vamos');
  teclado.minijuegoPrevia = resultado;
}
// Ya en juego (la fase pasó a `juego`): las teclas son del minijuego; la parada no reacciona. Se juega con ellas, así que se prueba una sola vez.
async function probarTeclasEnJuego() {
  if (SIN_TECLADO) return;
  const fase = await page.evaluate(() => { window.__clicsDeTeclas?.splice(0); return document.querySelector('#minijuego')?.dataset.fase ?? null; });
  for (const tecla of ['1', '2', 'v', 't', 'm', 'c', 'q', 'w', 'e', 'r', 'a', 'd', 's']) {
    await page.keyboard.press(tecla);
    await page.waitForTimeout(20);
  }
  const r = await page.evaluate(() => ({
    clics: window.__clicsDeTeclas.splice(0),
    fase: document.querySelector('#minijuego')?.dataset.fase ?? null,
    cuarto: document.querySelector('#cuarto')?.open ?? false,
    pieza: document.querySelector('.shell')?.dataset.pieza ?? null
  }));
  await page.evaluate(() => { window.removeEventListener('click', window.__frenarClics, { capture: true }); });
  teclado.minijuegoJuego = { ok: fase === 'juego' && r.clics.length === 0 && !r.cuarto && r.pieza === 'minijuego' && r.fase !== 'previa', faseAntes: fase, ...r };
}
// V3d: "¡Vamos!" a la vista. Mismo piso que `medir` (la barra de cuartos del celular tapa lo que queda debajo).
const medirVamos = () => page.evaluate(() => {
  const visible = (e) => !!e && e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  const vh = window.innerHeight;
  const barra = document.querySelector('#cuartosBarra');
  const rb = barra && visible(barra) && getComputedStyle(barra).position === 'fixed' ? barra.getBoundingClientRect() : null;
  const piso = rb && rb.top < vh && rb.top > vh / 2 ? rb.top : vh;
  const b = document.querySelector('#minijuegoWidget [data-vamos]');
  if (!b || !visible(b)) return null;
  const r = b.getBoundingClientRect();
  const t = document.querySelector('#minijuegoTitle')?.getBoundingClientRect();
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), piso: Math.round(piso), entra: r.top >= 0 && r.bottom <= piso, tituloEntra: !!t && t.top >= 0 && t.bottom <= piso };
});

// En la final: Enter sobre "Copiar..." no se va de la final (D87), y Esc no hace nada.
async function probarTecladoEnLaFinal() {
  if (SIN_TECLADO) return;
  const copiar = page.locator('#tarjeta button', { hasText: /Copiar/ }).first();
  if (await copiar.count()) {
    await copiar.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    teclado.copiarEnterFinal = { ok: (await piezaCruda(page)) === 'final', pieza: await piezaCruda(page) };
  } else {
    teclado.copiarEnterFinal = { ok: null, motivo: 'sin boton Copiar' };
  }
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  teclado.escFinal = { ok: (await piezaCruda(page)) === 'final', pieza: await piezaCruda(page) };
}
// Regla 4 (§V.3: nada adelanta el resultado): en las primeras REGLA4_PARADAS paradas de decision/partido, a 1x, se muestrea
// la topbar y la ficha cada 50 ms mientras la pieza es 'relato' y la pagina es la del split de la parada (la lista no se
// achica ni cambia su primer renglon: cuando arranca el split siguiente, la ficha SI se actualiza, con lo ya contado).
const REGLA4_PARADAS = 3;
const regla4 = [];
async function clicConRegla4(clic) {
  await velocidadUno();
  await page.waitForTimeout(ESPERA_COUNTUP_MS);
  await page.evaluate(() => {
    // textContent, no innerText: el contenido, no lo que el CSS deja ver (a <= 639 px la ficha se compactaba durante la
    // parada y volvia entera en el relato: eso no es un cambio de lo que dice). V2-C: la franja y el acompañante (antes,
    // la topbar y la ficha del riel; quedan como respaldo para medir una UI anterior).
    const texto = (s) => document.querySelector(s)?.textContent ?? '';
    const leer = () => `${texto('.franja') || texto('.topbar')}\n${texto('#acompanante') || texto('#fichaContainer')}`;
    const lista = document.querySelector('#logList');
    const r = { antes: leer(), muestras: [], primero: lista.firstElementChild?.textContent.slice(0, 120) ?? '', n: lista.children.length, cerrada: false };
    r.iv = setInterval(() => {
      if (r.cerrada || document.querySelector('.shell')?.dataset.pieza !== 'relato') return;
      const primero = lista.firstElementChild?.textContent.slice(0, 120) ?? '';
      if (lista.children.length < r.n || (r.primero && primero !== r.primero)) { r.cerrada = true; return; }
      r.n = lista.children.length;
      r.primero = r.primero || primero;
      r.muestras.push(leer());
    }, 50);
    window.__regla4 = r;
  });
  await clic();
  // V2-C (i): en la primera, un cuarto abierto a mitad del relato lo pausa.
  if (regla4.length === 0 && (await hayShellV2C())) await probarPausa();
  await page.waitForFunction(() => { const p = document.querySelector('.shell')?.dataset.pieza; return (p && p !== 'relato') || window.__regla4.cerrada; }, null, { timeout: 120000, polling: 100 }).catch(() => {});
  const r = await page.evaluate(() => { clearInterval(window.__regla4.iv); const { antes, muestras } = window.__regla4; return { antes, muestras }; });
  const distintas = r.muestras.filter((m) => m !== r.antes);
  regla4.push({ muestras: r.muestras.length, distintas: distintas.length, ejemplo: distintas[0]?.slice(0, 240) ?? null });
  L(`## REGLA4: ${r.muestras.length} muestras durante el relato, ${distintas.length} distintas de antes del clic`);
  await velocidadInstantanea();
}

// ---------- V2-C: la franja, el acompañante y los cuartos ----------
// ¿La UI es de V2-C en adelante? (sobre una UI anterior estas pruebas no aplican: la linea de base no las tiene).
const hayShellV2C = () => page.evaluate(() => !!document.querySelector('#cuarto') && !!document.querySelector('#acompanante'));
const LETRAS_DE_CUARTOS = { vos: 'v', temporada: 't', equipo: 'e', mundo: 'm', carrera: 'c', cronica: 'r' };
// Las letras que se prueban en el minijuego: las de los cuartos que NO son teclas de algun minijuego (Q/W/E/R, A/D, A/S).
// La V no va: desde V3d es "¡Vamos!" en la fase previa (se prueba aparte, `probarAtajosDeLaPrevia`).
const LETRAS_EN_EL_MINIJUEGO = ['t', 'm', 'c'];
const cuartoAbierto = () => page.evaluate(() => document.querySelector('#cuarto')?.open ?? false);

// (f) En cada parada: el acompañante es el de `acompananteDe` sobre la carrera guardada (en una parada, el estado de la
// parada: es lo mismo que la `vista`), y se ve donde tiene que verse.
const acompanantes = { paradas: 0, fallas: [], porTipo: {}, posiciones: 0, posicionFallas: [] };
async function probarAcompanante() {
  const r = await page.evaluate(async () => {
    const aside = document.querySelector('#acompanante');
    if (!aside) return null;
    const [{ acompananteDe }, { cargarCarreraGuardada }] = await Promise.all([
      import('/src/ui/core/escena.js'), import('/src/ui/almacenamiento.js')
    ]);
    const pieza = document.querySelector('.shell').dataset.pieza;
    const esperado = acompananteDe(cargarCarreraGuardada()?.state ?? null, pieza);
    const vis = (e) => !!e && e.checkVisibility({ checkVisibilityCSS: true });
    const ancho = window.matchMedia('(min-width: 1180px)').matches;
    const chip = document.querySelector('#verContexto');
    const tipo = aside.dataset.acompanante || null;
    const asideVisible = vis(aside);
    const chipVisible = vis(chip);
    const chipEsperado = !ancho && Boolean(esperado.cuarto) && ['decision', 'partido', 'mercado'].includes(pieza);
    const ok = tipo === esperado.tipo
      && asideVisible === (ancho && Boolean(esperado.tipo))
      && (!asideVisible || aside.children.length > 0)
      && chipVisible === chipEsperado
      && (!chipVisible || chip.dataset.cuarto === esperado.cuarto);
    // (f2) DONDE esta cada cosa (una hoja de estilos rota deja todo "presente" pero en cualquier lado: V2-C, la ronda del
    // `}` de mas en shell.css puso el escenario en x=0 y el acompañante debajo, y nada de lo de arriba lo noto). Desde 1180 px,
    // con acompañante: va a la derecha del escenario y arranca a su altura (±40). Sin el: el escenario queda centrado (±40).
    // Siempre: el escenario no pasa de la columna (720) mas el padding del cuerpo.
    const rect = (e) => { const r = e.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), width: Math.round(r.width) }; };
    const esc = rect(document.querySelector('#escenario'));
    const cuerpo = document.querySelector('.shell-cuerpo');
    const estiloCuerpo = getComputedStyle(cuerpo);
    const relleno = parseFloat(estiloCuerpo.paddingLeft) + parseFloat(estiloCuerpo.paddingRight);
    const columna = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--escenario-columna')) || 720;
    const vw = document.documentElement.clientWidth;
    const asideRect = rect(aside);
    const conAcompanante = asideVisible && Boolean(tipo);
    const fallasPos = [];
    if (esc.width > columna + relleno + 1) fallasPos.push(`el escenario mide ${esc.width} (> ${columna} + ${relleno})`);
    if (conAcompanante) {
      if (asideRect.left < esc.right) fallasPos.push(`el acompañante (left ${asideRect.left}) no esta a la derecha del escenario (right ${esc.right})`);
      if (Math.abs(asideRect.top - esc.top) > 40) fallasPos.push(`el acompañante empieza en y=${asideRect.top} y el escenario en y=${esc.top}`);
    } else if (Math.abs((esc.left + esc.right) / 2 - vw / 2) > 40) {
      fallasPos.push(`el escenario no esta centrado (centro ${(esc.left + esc.right) / 2}, ventana ${vw / 2})`);
    }
    return { ok, pieza, tipo, esperado, asideVisible, chipVisible, posicion: { ok: fallasPos.length === 0, fallas: fallasPos, esc, aside: asideRect, conAcompanante } };
  });
  if (!r) return;
  acompanantes.paradas++;
  const clave = r.tipo ?? 'ninguno';
  acompanantes.porTipo[clave] = (acompanantes.porTipo[clave] ?? 0) + 1;
  if (!r.ok) { acompanantes.fallas.push(r); L(`!! ACOMPANANTE: ${JSON.stringify(r)}`); }
  acompanantes.posiciones++;
  if (!r.posicion.ok) { acompanantes.posicionFallas.push({ pieza: r.pieza, ...r.posicion }); L(`!! POSICION: ${JSON.stringify(r.posicion)}`); }
}

// (g) Los 6 cuartos con clic y con su letra; Esc cierra, el foco vuelve a la parada y la parada es la misma.
const cuartos = [];
async function probarCuartos(tipo, pieza) {
  if (!(await hayShellV2C())) return;
  await page.waitForTimeout(ESPERA_COUNTUP_MS);
  const antes = await firmaDeParada(pieza);
  const fallas = [];
  const leer = () => page.evaluate(() => {
    const d = document.querySelector('#cuarto');
    const a = document.activeElement;
    return {
      abierto: d.open,
      cuarto: d.dataset.cuarto ?? null,
      pestana: d.querySelector('[role="tab"][aria-selected="true"]')?.dataset.cuarto ?? null,
      contenido: document.querySelector('#cuartoCuerpo').children.length,
      focoEnLaParada: !!a?.closest?.('#escenario') && a.checkVisibility({ checkVisibilityCSS: true }),
      pieza: document.querySelector('.shell').dataset.pieza
    };
  });
  for (const [id, letra] of Object.entries(LETRAS_DE_CUARTOS)) {
    for (const modo of ['clic', 'letra']) {
      if (modo === 'clic') await page.click(`#cuartosBarra [data-cuarto="${id}"]`);
      else await page.keyboard.press(letra);
      await page.waitForTimeout(60);
      const abierto = await leer();
      if (!abierto.abierto || abierto.cuarto !== id || abierto.pestana !== id || abierto.contenido === 0) fallas.push(`${modo} ${id}: ${JSON.stringify(abierto)}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(60);
      const cerrado = await leer();
      if (cerrado.abierto || !cerrado.focoEnLaParada || cerrado.pieza !== pieza) fallas.push(`Esc tras ${modo} ${id}: ${JSON.stringify(cerrado)}`);
    }
  }
  // Con un cuarto abierto, otra letra cambia de pestaña (no abre otro ni lo cierra).
  await page.keyboard.press('v');
  await page.keyboard.press('m');
  await page.waitForTimeout(60);
  const cambio = await leer();
  if (!cambio.abierto || cambio.cuarto !== 'mundo') fallas.push(`v y despues m: ${JSON.stringify(cambio)}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(60);
  const despues = await firmaDeParada(pieza);
  const misma = antes.titulo === despues.titulo && JSON.stringify(antes.opciones) === JSON.stringify(despues.opciones);
  const fila = { tipo, pieza, ok: fallas.length === 0 && misma && !(await cuartoAbierto()), misma, fallas: fallas.slice(0, 6) };
  cuartos.push(fila);
  L(`## CUARTOS en ${tipo}: ${fila.ok ? 'ok' : `FALLA ${JSON.stringify(fila.fallas)} misma=${misma}`}`);
}

// (h) Las letras de los cuartos no abren nada en el inicio ni en el minijuego (que es dueño de sus teclas).
async function probarLetrasInertes(donde, letras) {
  if (!(await hayShellV2C())) return;
  const abiertos = [];
  for (const letra of letras) {
    await page.keyboard.press(letra);
    await page.waitForTimeout(40);
    if (await cuartoAbierto()) { abiertos.push(letra); await page.keyboard.press('Escape'); }
  }
  // Y el clic en la barra tampoco (en el minijuego queda a la vista pero apagada).
  await page.evaluate(() => document.querySelector('#cuartosBarra [data-cuarto="vos"]')?.click());
  await page.waitForTimeout(40);
  if (await cuartoAbierto()) { abiertos.push('clic'); await page.keyboard.press('Escape'); }
  teclado[`letras${donde}`] = { ok: abiertos.length === 0, abiertos };
}

// (i) Con un cuarto abierto el relato se pausa: se abre Temporada con su letra apenas arranca el relato (a 1x) y, durante
// dos beats y medio, no entra ninguna linea; al cerrarlo, el relato sigue hasta la parada.
const ESPERA_PAUSA_MS = 1800;
let pausa = null;
async function probarPausa() {
  const enRelato = await page.evaluate(() => document.querySelector('.shell').dataset.pieza === 'relato');
  if (!enRelato) { pausa = { ok: null, motivo: 'el relato termino antes de abrir el cuarto' }; return; }
  await page.keyboard.press('t');
  await page.waitForTimeout(100);
  const contar = () => page.evaluate(() => ({
    abierto: document.querySelector('#cuarto').open,
    lineas: document.querySelector('#logList').children.length,
    ultima: document.querySelector('#logList').lastElementChild?.textContent.slice(0, 80) ?? '',
    pieza: document.querySelector('.shell').dataset.pieza
  }));
  const a = await contar();
  await page.waitForTimeout(ESPERA_PAUSA_MS);
  const b = await contar();
  await page.keyboard.press('Escape');
  // Y al cerrarlo sigue: entra otra linea o llega la parada.
  const reanudo = await page.waitForFunction((n) => document.querySelector('#logList').children.length > n
    || document.querySelector('.shell').dataset.pieza !== 'relato', b.lineas, { timeout: 5000, polling: 50 }).then(() => true, () => false);
  pausa = { ok: a.abierto && b.abierto && b.pieza === 'relato' && a.lineas === b.lineas && a.ultima === b.ultima && reanudo, reanudo, a, b };
  L(`## PAUSA: ${JSON.stringify(pausa)}`);
}

// ---------- el tipo de parada ----------
function tipoDeParada(pieza, titulo, opts, extras = {}) {
  if (pieza === 'tarjeta') return 'tarjeta-final';
  if (pieza === 'mercado') return 'mercado';
  if (pieza === 'minijuego') {
    if (extras.charla) return 'mapa-decisivo';
    if (/PRUEBA DE INGRESO/i.test(titulo)) return 'prueba';
    if (/prensa/i.test(titulo)) return 'prensa';
    return 'minijuego';
  }
  if (/swiss/i.test(titulo + ' ' + (extras.topbar ?? ''))) return 'swiss';
  if (/FIN DE TEMPORADA/i.test(titulo)) return 'cierre-ano';
  if (/retir|vuelta/i.test(titulo) || opts.some((o) => /retir|colg(á|a)s el mouse|colgar el mouse/i.test(o.titulo))) return 'retiro-vuelta';
  if (/PLAN DE FEARLESS|BO\d/i.test(titulo)) return 'plan-serie';
  if (/EL PLAN DEL AÑO|CÓMO VIVÍS LA SEMANA/i.test(titulo)) return 'plan-amateur';
  return 'decision';
}

// V2-C: la ficha ya no esta siempre a la vista (vive en el cuarto Vos y, a veces, en el acompañante). La politica lee de
// ella la edad y la liga (para el tier de las ofertas): sale de la linea de contexto de la ficha (`lineaDeContextoFicha`,
// org · liga · año · edad) sobre la carrera guardada, que en una parada es el estado de la parada. TOPBAR es la franja.
async function snapshot() {
  return page.evaluate(async () => {
    const g = (s) => document.querySelector(s)?.innerText ?? '';
    const h = (s) => { const e = document.querySelector(s); return e && e.checkVisibility({ checkVisibilityCSS: true }) ? g(s) : ''; };
    let ficha = g('#fichaContainer').slice(0, 900);
    if (!document.querySelector('#fichaContainer')) {
      try {
        const [{ cargarCarreraGuardada }, { lineaDeContextoFicha }] = await Promise.all([
          import('/src/ui/almacenamiento.js'), import('/src/ui/components/ficha.js')
        ]);
        const datos = cargarCarreraGuardada();
        ficha = datos?.state ? lineaDeContextoFicha(datos.state) : '';
      } catch { ficha = ''; }
    }
    const franja = document.querySelector('#franjaEstado')?.textContent ?? g('#topbarEstado');
    return `TOPBAR: ${franja}\nFICHA: ${ficha}\nSERIE: ${h('#serieContexto')}\nPREVIA: ${h('#previa')}\nDECISION: ${h('#decision')}\nMINI: ${h('#minijuego')}\nMERCADO: ${h('#mercado')}\nLOG: ${g('#logList').slice(0, 4000)}`;
  });
}
const edadDe = (snap) => +((snap.match(/(\d{2}) años/) || [])[1] || 0);

// ---------- la carrera ----------
await armarElInicio();
L(`modo=${MODO} politica=${POL} seed=${SEED} ${ANCHO}x${ALTO} rol=${ROL} perfil=${PERFIL} region=${REGION}`);
if (MODO === 'capturas') await captura('inicio-draft-completo', { completa: true, arriba: true });
else await captura('inicio', { completa: true });
// V2-C (h): en el inicio, con el draft completo, las letras de los cuartos no abren nada.
if (MODO === 'recorrido') await probarLetrasInertes('Inicio', Object.values(LETRAS_DE_CUARTOS));
await page.click('#run');

const filas = [];
const visitadas = {};
const capturadas = new Set();
let paradas = 0, lastSnap = '', stuck = 0, step = 0;
const FIJAS = ['decision', 'mercado', 'serie', 'minijuego'];

async function medirPrimera(tipo, pieza, extra = {}) {
  const tMed = Date.now();
  const erroresAntes = errs.length;
  await captura(tipo);
  const medidas = await medir(pieza);
  const fila = { tipo, pieza, parada: paradas, step, topbar: extra.topbar ?? '', titulo: extra.titulo ?? '', ...medidas };
  // V2-B: lo que se ve coincide con `data-pieza` (exactamente un panel de pieza visible, el suyo).
  fila.piezaCruda = await piezaCruda(page);
  fila.panelesVisibles = await page.evaluate(panelesVisibles);
  fila.piezaCoincide = fila.piezaCruda
    ? fila.panelesVisibles.length === 1 && fila.panelesVisibles[0] === PANEL_DE_PIEZA[fila.piezaCruda]
    : null;
  fila.retomar = await retomar(pieza);
  // V2-C (g): los cuartos, en la parada que volvió (decision, partido o mercado; el minijuego no los abre).
  if (['decision', 'partido', 'mercado'].includes(pieza)) await probarCuartos(tipo, pieza);
  fila.erroresEnLaParada = errs.slice(erroresAntes);
  fila.msMedicion = Date.now() - tMed;
  filas.push(fila);
  L(`## MEDIDA ${tipo}: numeros=${fila.numerosVisibles} ultimoBotonEntra=${fila.ultimoBotonEntra} titulo=${fila.titulo?.slice?.(0, 40) ?? ''} retomar=${fila.retomar.ok}`);
}

for (let it = 0; it < 3000; it++) {
  if (MAX_PARADAS && paradas >= MAX_PARADAS) { L('-- tope de paradas'); break; }
  if (MODO === 'capturas' && !MAX_PARADAS && FIJAS.every((k) => capturadas.has(k))) { L('-- capturas fijas completas'); break; }
  let pieza;
  try {
    await esperarPieza(page, 30000);
    pieza = await piezaVisible(page);
  } catch {
    L(`!! TIMEOUT esperando pantalla (it ${it})`); await captura('timeout'); L(await snapshot()); stuck++; if (stuck > 2) break; continue;
  }
  const snap = await snapshot();
  const topbar = (snap.match(/^TOPBAR: (.*)$/m) || [])[1] || '';
  const edad = edadDe(snap);
  if (snap !== lastSnap) { L(`\n===== STEP ${step} (it ${it}) =====\n${snap}`); lastSnap = snap; stuck = 0; } else stuck++;
  if (stuck > 6) { L('!! ESTADO TRABADO'); await captura('trabado'); break; }

  if (pieza === 'tarjeta') {
    await page.waitForTimeout(800);
    visitadas['tarjeta-final'] = (visitadas['tarjeta-final'] || 0) + 1;
    const tx = await page.innerText('#tarjeta').catch(() => '');
    L('TARJETA_FINAL: ' + tx.replace(/\n+/g, ' | '));
    if (MODO === 'capturas') await captura('tarjeta-final', { completa: true });
    else {
      // V2-B: el teclado en la final ANTES de medir (medir prueba retomar, que recarga la pagina).
      await probarTecladoEnLaFinal();
      await medirPrimera('tarjeta-final', 'tarjeta', { topbar, titulo: tx.split('\n')[0] });
    }
    break;
  }

  if (pieza === 'minijuego') {
    paradas++; step++;
    const tit = await page.innerText('#minijuegoTitle').catch(() => '');
    const ap = await page.innerText('#minijuego').catch(() => '');
    const hayCharla = (await page.locator('#minijuegoWidget .minijuego-charla-opcion').count()) > 0;
    const tipoP = tipoDeParada('minijuego', tit, [], { charla: hayCharla });
    const primera = !visitadas[tipoP];
    visitadas[tipoP] = (visitadas[tipoP] || 0) + 1;
    if (MODO === 'recorrido') {
      await probarAcompanante();
      if (primera) await medirPrimera(tipoP, 'minijuego', { topbar, titulo: tit });
      // V2-C (h): antes de "¡Vamos!", las letras de los cuartos no abren nada.
      if (!teclado.letrasMinijuego) await probarLetrasInertes('Minijuego', LETRAS_EN_EL_MINIJUEGO);
      // V3d (D94): 1-n y V en la previa; una vez con charla y una sin (la primera de cada una).
      if (!(hayCharla ? teclado.previaConCharla : teclado.previaSinCharla)) { await probarAtajosDeLaPrevia(hayCharla); if (hayCharla) teclado.previaConCharla = teclado.minijuegoPrevia; else teclado.previaSinCharla = teclado.minijuegoPrevia; }
    } else if (!capturadas.has('minijuego')) {
      await captura('minijuego-antes-de-vamos', { completa: true });
    }
    const charla = page.locator('#minijuegoWidget .minijuego-charla-opcion');
    let charlaTxt = '';
    if (await charla.count()) {
      const ts = await charla.allInnerTexts();
      const ps = ts.map((t) => pctDe(t, /(\d+)% de ganar/) ?? 0);
      const i = MALA ? ps.indexOf(Math.min(...ps)) : ps.indexOf(Math.max(...ps));
      charlaTxt = ` CHARLA[${ts.join(' / ')}] -> ${i + 1}`;
      // V3d: la charla se elige con su tecla (1-n); si la tecla no hace nada, con el clic (y queda anotado).
      if (!SIN_TECLADO) await page.keyboard.press(String(i + 1));
      else await charla.nth(i).click();
      await page.waitForTimeout(100);
      if (await charla.count()) { teclado.charlaConTecla = { ok: false }; await charla.nth(i).click(); await page.waitForTimeout(100); }
      else if (!teclado.charlaConTecla) teclado.charlaConTecla = { ok: true };
    }
    // V3d: "¡Vamos!" entra sin scrollear (se mide una vez por tipo) y se aprieta con su tecla (V).
    const vamos = MODO === 'recorrido' ? await medirVamos() : null;
    if (primera && vamos) { const fila = [...filas].reverse().find((x) => x.tipo === tipoP); if (fila) fila.vamos = vamos; }
    if (!SIN_TECLADO) {
      await page.keyboard.press('v');
      await page.waitForTimeout(60);
      if (await page.locator('#minijuegoWidget [data-vamos]').count()) { teclado.vamosConTecla = { ok: false }; await page.locator('.minijuego-espera-boton').first().click({ timeout: 5000 }).catch(() => L('!! sin boton Vamos')); }
      else if (!teclado.vamosConTecla) teclado.vamosConTecla = { ok: true };
    } else {
      await page.locator('.minijuego-espera-boton').first().click({ timeout: 5000 }).catch(() => L('!! sin boton Vamos'));
    }
    await page.waitForTimeout(30);
    if (MODO === 'recorrido' && !teclado.minijuegoJuego && teclado.minijuegoPrevia) await probarTeclasEnJuego();
    if (MODO === 'capturas' && !capturadas.has('minijuego')) { await captura('minijuego-widget', { completa: true }); capturadas.add('minijuego'); }
    const jugada = MODO === 'capturas' ? await dejarPasarMinijuego() : MALA ? await jugarMinijuegoMal() : await jugarMinijuegoBien();
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.__prensa = null; });
    L(`[${step}] ${topbar} | MINIJUEGO(${tipoP}) "${tit}" (${jugada})${charlaTxt} || ${ap.replace(/\n+/g, ' | ').slice(0, 300)}`);
    continue;
  }

  if (pieza === 'mercado') {
    paradas++; step++;
    visitadas.mercado = (visitadas.mercado || 0) + 1;
    if (MODO === 'recorrido') await probarAcompanante();
    if (visitadas.mercado === 1) {
      if (MODO === 'recorrido') {
        await medirPrimera('mercado', 'mercado', { topbar, titulo: await page.innerText('#mercadoTitle').catch(() => '') });
        await probarUnoEnElMercado();
      } else { await captura('mercado', { completa: true }); capturadas.add('mercado'); }
    }
    const cartas = await page.$$eval('#mercadoGrid .mercado-card', (cs) => cs.map((c) => c.innerText.replace(/\n+/g, ' | ')));
    const fichaTop = (snap.match(/^FICHA: ([\s\S]{0,400})/m) || [])[1] || '';
    const tierActual = tierDe(fichaTop) ?? (pro ? 2 : null);
    const esperarVisible = await page.evaluate(() => { const e = document.querySelector('#mercadoEsperar'); return !!e && !e.hidden; });
    const sc = cartas.map((c) => puntuarCarta(c, tierActual));
    let i = -1;
    if (cartas.length) {
      if (MALA) {
        const r = sc.findIndex((x) => x.renov || x.quedarse);
        i = (pro && r >= 0) ? r : sc.map((x) => x.s).indexOf(Math.min(...sc.map((x) => x.s)));
      } else i = sc.map((x) => x.s).indexOf(Math.max(...sc.map((x) => x.s)));
    }
    L(`[${step}] ${topbar} | MERCADO (${cartas.length} cartas): ` + cartas.map((c, q) => `\n    ${q === i ? '>>' : '  '} [${sc[q].s.toFixed(0)}] ${c.slice(0, 260)}`).join(''));
    if (i >= 0) {
      await page.locator('#mercadoGrid .mercado-card').nth(i).locator('.mercado-card-acciones button').first().click();
      if (!pro) { pro = true; await page.waitForTimeout(400); }
    } else if (esperarVisible) { L('    > ESPERAR'); await page.click('#mercadoEsperar'); }
    else { L('!! mercado sin botones'); await captura('mercado-vacio'); stuck += 3; }
    continue;
  }

  // V2-B: el partido (fecha marcada, plan de Fearless, decisivo, Swiss) es su propia pieza, con el mismo panel `#decision`.
  if (pieza === 'decision' || pieza === 'partido') {
    paradas++; step++;
    const sel = '#decisionOptions .option-btn:not([disabled])';
    const opts = await leerOpciones(sel);
    const t = await page.innerText('#decisionTitle').catch(() => '');
    if (!opts.length) { L('!! decision sin opciones'); await captura('decision-sin-opciones'); stuck += 3; continue; }
    const serieViva = await page.evaluate(() => { const e = document.querySelector('#serieContexto'); return !!e && e.checkVisibility({ checkVisibilityCSS: true }); });
    // V3b: la fecha marcada (pieza `partido` con una decision que no es plan de serie ni Swiss) es su propio tipo; antes caia en 'decision'.
    let tipoP = tipoDeParada('decision', t, opts, { topbar });
    if (tipoP === 'decision' && pieza === 'partido') tipoP = 'fecha-marcada';
    const primera = !visitadas[tipoP];
    visitadas[tipoP] = (visitadas[tipoP] || 0) + 1;
    if (MODO === 'recorrido') {
      await probarAcompanante();
      if (primera) await medirPrimera(tipoP, pieza, { topbar, titulo: t });
    } else {
      if (tipoP === 'decision' && !capturadas.has('decision')) { await captura('decision-generica', { completa: true }); capturadas.add('decision'); }
      if (serieViva && !capturadas.has('serie')) { await captura('serie-primera', { completa: true }); capturadas.add('serie'); }
    }
    let { idx, sc } = elegir(opts, edad, t);
    const descTxt = await page.innerText('#decisionDesc').catch(() => '');
    const perfilPick = (descTxt.match(/Tu perfil iba a ir por "([^"]+)"/) || [])[1];
    if (!MALA && /EL PLAN DEL AÑO/i.test(t)) { const j = opts.findIndex((o) => /IRÍA POR ESTA/i.test(o.full)); if (j >= 0) idx = j; }
    if (!MALA && perfilPick) { const j = opts.findIndex((o) => o.titulo.toLowerCase().includes(perfilPick.toLowerCase())); if (j >= 0) idx = j; }
    if (!MALA && !pro) { const j = opts.findIndex((o) => /contestarle|venderte bien/i.test(o.titulo)); if (j >= 0) idx = j; }
    {
      const pct = (o) => { const m = o.full.match(/(\d+)% de burnout/); return m ? +m[1] : null; };
      const iEsp = opts.findIndex((o) => /que te espere un split/i.test(o.titulo));
      if (!MALA && !pro && iEsp >= 0) {
        const iFirma = opts.findIndex((o) => /^firmar|ir a la prueba/i.test(o.titulo));
        const pf = iFirma >= 0 ? pct(opts[iFirma]) : null;
        if (pf !== null && pf >= 20) { idx = iEsp; L(`>> BUENA espera (firmar ${pf}%)`); }
      }
      if (/cabeza en rojo/i.test(t)) {
        const ps = opts.map((o) => pct(o));
        if (MALA) idx = opts.findIndex((o) => /seguir/i.test(o.titulo)) >= 0 ? opts.findIndex((o) => /seguir/i.test(o.titulo)) : 0;
        else { let b = 0; opts.forEach((o, q) => { if ((ps[q] ?? 999) < (ps[b] ?? 999)) b = q; }); if (/seguir/i.test(opts[b].titulo)) { const o2 = opts.findIndex((o) => !/seguir/i.test(o.titulo)); if (o2 >= 0) b = o2; } idx = b; }
      }
    }
    L(`[${step}] ${topbar} | edad ${edad} | DECISION(${tipoP}) "${t}"` + opts.map((o, q) => `\n    ${q === idx ? '>>' : '  '} [${sc[q].s.toFixed(1)}] ${o.full.slice(0, 330)}`).join(''));
    const clic = () => page.locator(sel).nth(idx).click();
    if (MODO === 'recorrido' && paradas > 1 && regla4.length < REGLA4_PARADAS) await clicConRegla4(clic);
    else await clic();
    await page.waitForTimeout(60);
    continue;
  }
}

// ---------- salida ----------
const resumenPorTipo = {};
for (const [tipo, n] of Object.entries(visitadas)) resumenPorTipo[tipo] = { paradasVistas: n, medida: false };
for (const f of filas) {
  resumenPorTipo[f.tipo] = {
    paradasVistas: visitadas[f.tipo] ?? 1,
    medida: true,
    numerosVisibles: f.numerosVisibles,
    ultimoBotonEntra: f.ultimoBotonEntra,
    ultimoAtajoEntra: f.ultimoAtajoEntra,
    vamosEntra: f.vamos?.entra ?? null,
    tituloEntero: f.tituloCaja?.entero ?? null,
    opcion1Entera: f.opcion1Caja?.entero ?? null,
    scrollHorizontal: f.scrollHorizontal,
    retomarOk: f.retomar.ok
  };
}
const erroresReales = errs.filter((e) => !/Failed to load resource/.test(e));
const informe = {
  meta: { modo: MODO, politica: POL, seed: SEED, ancho: ANCHO, alto: ALTO, rol: ROL, perfil: PERFIL, region: REGION, url: URL_JUEGO, paradas, maxParadas: MAX_PARADAS, minutos: +((Date.now() - t0) / 60000).toFixed(2) },
  filas,
  resumenPorTipo,
  totales: {
    paradas,
    tiposMedidos: filas.length,
    retomarFallidos: filas.filter((f) => f.retomar.ok === false).map((f) => f.tipo),
    piezasVistas: [...new Set(filas.map((f) => f.piezaCruda))],
    piezaNoCoincide: filas.filter((f) => f.piezaCoincide === false).map((f) => `${f.tipo}:${f.piezaCruda}:${f.panelesVisibles.join('+')}`),
    teclado,
    regla4: { paradas: regla4.length, muestras: regla4.reduce((a, r) => a + r.muestras, 0), distintas: regla4.reduce((a, r) => a + r.distintas, 0), detalle: regla4 },
    scrollHorizontal: filas.filter((f) => f.scrollHorizontal).map((f) => f.tipo),
    ultimoBotonFueraDelViewport: filas.filter((f) => f.ultimoBotonEntra === false).map((f) => f.tipo),
    ultimoAtajoFueraDelViewport: filas.filter((f) => f.ultimoAtajoEntra === false).map((f) => f.tipo),
    vamosFueraDelViewport: filas.filter((f) => f.vamos && !f.vamos.entra).map((f) => f.tipo),
    // V2-C
    acompanante: { paradas: acompanantes.paradas, porTipo: acompanantes.porTipo, fallas: acompanantes.fallas.length, detalle: acompanantes.fallas.slice(0, 10) },
    posicion: { paradas: acompanantes.posiciones, fallas: acompanantes.posicionFallas.length, detalle: acompanantes.posicionFallas.slice(0, 10) },
    cuartos: { paradas: cuartos.length, fallas: cuartos.filter((c) => !c.ok).length, detalle: cuartos },
    pausa,
    errores: erroresReales.length,
    advertencias: advertencias.length
  },
  errores: errs,
  advertencias
};
if (MODO === 'recorrido') fs.writeFileSync(path.join(SALIDA, 'recorrido.json'), JSON.stringify(informe, null, 2));
else fs.writeFileSync(path.join(SALIDA, 'capturas.json'), JSON.stringify({ meta: informe.meta, capturadas: [...capturadas], errores: errs }, null, 2));
const ls = await page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; }).catch(() => ({}));
fs.writeFileSync(path.join(SALIDA, 'localStorage.json'), JSON.stringify(ls));
console.log(`RECORRIDO ${MODO} seed=${SEED} ${ANCHO}x${ALTO}: paradas=${paradas} tipos=${JSON.stringify(visitadas)} medidas=${filas.length} errores=${erroresReales.length} salida=${SALIDA}`);
if (MODO === 'recorrido') {
  const t = informe.totales;
  console.log(`  piezas=${JSON.stringify(t.piezasVistas)} piezaNoCoincide=${JSON.stringify(t.piezaNoCoincide)} retomarFallidos=${JSON.stringify(t.retomarFallidos)}`);
  console.log(`  regla4: ${t.regla4.paradas} paradas, ${t.regla4.muestras} muestras durante el relato, ${t.regla4.distintas} con la franja/acompañante distinta`);
  console.log(`  acompanante: ${t.acompanante.paradas} paradas, ${t.acompanante.fallas} fallas ${JSON.stringify(t.acompanante.porTipo)} | cuartos: ${t.cuartos.paradas} paradas, ${t.cuartos.fallas} fallas | pausa=${pausa ? pausa.ok : 'sin probar'}`);
  console.log(`  posicion (escenario centrado o acompañante a la derecha, ancho <= columna): ${t.posicion.paradas} paradas, ${t.posicion.fallas} fallas`);
  console.log(`  teclado: ${Object.entries(teclado).map(([k, v]) => `${k}=${v ? v.ok : 'sin probar'}`).join(' ')}`);
  console.log(`  vamos: ${filas.filter((f) => f.vamos).map((f) => `${f.tipo}=${f.vamos.entra ? 'entra' : 'NO entra'}(${f.vamos.bottom}/${f.vamos.piso})`).join(' ') || 'sin medir'}`);
  console.log(`  numerosVisibles: ${filas.map((f) => `${f.tipo}=${f.numerosVisibles}`).join(' ')}`);
}
await browser.close();
