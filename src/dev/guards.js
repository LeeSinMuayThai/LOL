import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// `.html` entra desde 9Ed (D28): los cinco montadores de minijuego de
// `index.html` ya usan `rngUi` (un stream propio sembrado desde la seed), pero
// nada impedía que volviera un `Math.random()` del navegador y rompiera el
// determinismo de una carrera jugada a mano. El guard es ese candado.
const EXTENSIONES_A_REVISAR = new Set(['.js', '.html']);

function listarArchivos(dir, { recursivo = true } = {}) {
  const entradas = fs.readdirSync(dir, { withFileTypes: true });
  return entradas.flatMap((entrada) => {
    const fullPath = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      return recursivo ? listarArchivos(fullPath) : [];
    }
    return EXTENSIONES_A_REVISAR.has(path.extname(entrada.name)) ? [fullPath] : [];
  });
}

const PATRON_PROHIBIDO = 'Math' + '.random(';

// `srcDir` se recorre entero; `extrasDirs` sólo en su primer nivel (la raíz del
// repo, donde vive `index.html`, sin descender a `node_modules` ni a `src/`).
export function verificarSinMathRandom(srcDir, extrasDirs = []) {
  const archivoActual = fileURLToPath(import.meta.url);
  const archivos = [
    ...listarArchivos(srcDir),
    ...extrasDirs.flatMap((dir) => listarArchivos(dir, { recursivo: false }))
  ].filter((archivo) => archivo !== archivoActual);
  return archivos.filter((archivo) => fs.readFileSync(archivo, 'utf8').includes(PATRON_PROHIBIDO));
}

// Fase 8 (regla invariable 2, "el motor no debe tocar el DOM"): `src/ui/` es
// la única carpeta que puede referenciar `document`. El corte es por punto o
// corchete después de la palabra para no confundir con la prosa en español
// ("documento", "documentación") que aparece seguido en los comentarios.
const PATRON_DOCUMENT = /\bdocument\s*[.[]/;

export function verificarDocumentSoloEnUi(srcDir) {
  const archivoActual = fileURLToPath(import.meta.url);
  const uiDir = path.join(srcDir, 'ui') + path.sep;
  const archivos = listarArchivos(srcDir).filter((archivo) => archivo !== archivoActual && !archivo.startsWith(uiDir));
  return archivos.filter((archivo) => PATRON_DOCUMENT.test(fs.readFileSync(archivo, 'utf8')));
}

// ============================================================================
// Fase T0b — el candado del sistema de diseño.
// El bug que motivó esta fase (button:hover con --ink de fondo, un bloque
// casi blanco sobre un fondo casi negro) no era un valor mal elegido: era
// que nada impedía escribirlo. Estos tres checks lo convierten en un error
// de build en vez de en un bug que hay que mirar para encontrar.
// ============================================================================

const EXTENSION_CSS = new Set(['.css']);

function listarArchivosCss(dir) {
  const entradas = fs.readdirSync(dir, { withFileTypes: true });
  return entradas.flatMap((entrada) => {
    const fullPath = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      return listarArchivosCss(fullPath);
    }
    return EXTENSION_CSS.has(path.extname(entrada.name)) ? [fullPath] : [];
  });
}

// --ink e --ink-dim son casi blancas: de fondo, en un ESTADO DE INTERACCIÓN
// (`:hover`/`:active`/`:focus`), son el bug exacto que reportó el usuario —
// un bloque casi blanco que se prende de golpe sobre un fondo casi negro.
// En reposo, en cambio, un trazo chico y sólido en tinta es una marca de
// lectura legítima (el hito alcanzado de una barra, el cursor de un
// minijuego): ahí el punto ES ser lo más visible de la pantalla, sin que
// nadie le haya pasado el mouse por encima. El candado solo mira estados de
// interacción — es donde el "se prende" ciega, no donde "se marca".
const PATRON_BLOQUE = /([^{}]+)\{([^{}]*)\}/g;
const PATRON_TINTA_EN_FONDO = /background(?:-color)?\s*:[^;]*var\(\s*--ink(?:-dim)?\s*\)/;
const PATRON_ESTADO_INTERACCION = /:hover|:active|:focus/;

export function verificarSinFondoDeTinta(estilosDir) {
  const hallazgos = [];
  for (const archivo of listarArchivosCss(estilosDir)) {
    const texto = fs.readFileSync(archivo, 'utf8');
    for (const match of texto.matchAll(PATRON_BLOQUE)) {
      const [bloque, selector, cuerpo] = match;
      if (PATRON_ESTADO_INTERACCION.test(selector) && PATRON_TINTA_EN_FONDO.test(cuerpo)) {
        const linea = texto.slice(0, match.index).split('\n').length;
        hallazgos.push(`${path.basename(archivo)}:${linea} (${selector.trim()})`);
      }
    }
  }
  return hallazgos;
}

// Ningún color literal fuera de tokens.css: si no está tokenizado, no existe.
const PATRON_COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/;

export function verificarSinColorLiteral(estilosDir) {
  const hallazgos = [];
  for (const archivo of listarArchivosCss(estilosDir)) {
    if (path.basename(archivo) === 'tokens.css') continue;
    const lineas = fs.readFileSync(archivo, 'utf8').split('\n');
    lineas.forEach((linea, i) => {
      // El grano de base.css es un SVG de data URI: trae `%23` (un `#`
      // escapado), no un color literal.
      if (linea.includes('data:image')) return;
      if (PATRON_COLOR_LITERAL.test(linea)) {
        hallazgos.push(`${path.basename(archivo)}:${i + 1}`);
      }
    });
  }
  return hallazgos;
}

// Fase V (V1, D44) — candado de color literal en JS.
// Mismo criterio que verificarSinColorLiteral pero sobre src/ui/**/*.js.
export function verificarSinColorLiteralEnJs(uiDir) {
  const hallazgos = [];
  const archivos = listarArchivos(uiDir).filter((archivo) => path.extname(archivo) === '.js');

  for (const archivo of archivos) {
    const lineas = fs.readFileSync(archivo, 'utf8').split('\n');
    lineas.forEach((linea, i) => {
      // Excepción conocida: exportar.js fallback de leerToken (PLAN.md D44)
      if (path.basename(archivo) === 'exportar.js' && linea.includes("valor || '#2ee8ff'")) {
        return;
      }
      if (/#[0-9a-fA-F]{3,8}\b/.test(linea)) {
        hallazgos.push(`${path.basename(archivo)}:${i + 1}`);
        return;
      }
      const matchColorFn = linea.match(/\b(?:rgb|rgba|hsl|hsla)\(/);
      if (matchColorFn) {
        const antes = linea.slice(0, matchColorFn.index);
        if (!antes.includes('`')) {
          hallazgos.push(`${path.basename(archivo)}:${i + 1}`);
        }
      }
    });
  }
  return hallazgos;
}

// ============================================================================
// Fase V (V1) — cálculo de contraste WCAG y lectura de tokens.
// Extraídas de validate.js para reutilización entre el check de texto existente
// y el check nuevo de contraste de marca gráfica (WCAG 1.4.11).
// ============================================================================

export function luminanciaRelativa(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrasteRatio(hexA, hexB) {
  const [l1, l2] = [luminanciaRelativa(hexA), luminanciaRelativa(hexB)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function hexDeToken(nombreToken, cssTexto) {
  const m = cssTexto.match(new RegExp(`--${nombreToken}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${nombreToken} no encontrado para medir contraste`);
  return m[1];
}

// Todo var(--x) SIN fallback que se usa tiene que estar definido en
// tokens.css. `var(--x, algo)` CON fallback queda afuera a propósito (T4):
// `--tab-color` es una custom property que `decision.js` fija por JS
// (`element.style.setProperty(...)`) para el color de categoría del
// evento — nunca vive en tokens.css, y el fallback (`var(--live)`) es
// justamente lo que la vuelve segura si algún día no se fija. Un var()
// SIN fallback que apunte a un nombre inexistente, en cambio, se rompe en
// silencio — eso es lo que este check sigue cazando.
// ============================================================================
// Fase V (V0) — el kernel: el controlador vive en `src/ui/app.js`, no en un
// `<script type="module">` inline de `index.html`. Sin este candado, la
// mudanza se podría deshacer sola (alguien agrega una función "rapidito"
// adentro del HTML) sin que nada lo note.
// ============================================================================

const MAX_LINEAS_INDEX_HTML = 200;
const PATRON_SCRIPT_INLINE = /<script type="module">([\s\S]*?)<\/script>/g;
const PATRON_LOGICA_DE_JUEGO = /\b(function|const)\b/;

export function verificarSinLogicaEnIndexHtml(indexHtmlPath) {
  const texto = fs.readFileSync(indexHtmlPath, 'utf8');
  const hallazgos = [];

  const lineas = texto.split('\n').length;
  if (lineas > MAX_LINEAS_INDEX_HTML) {
    hallazgos.push(`index.html tiene ${lineas} líneas (máximo ${MAX_LINEAS_INDEX_HTML})`);
  }

  for (const match of texto.matchAll(PATRON_SCRIPT_INLINE)) {
    if (PATRON_LOGICA_DE_JUEGO.test(match[1])) {
      hallazgos.push('un <script type="module"> inline de index.html declara function/const — la lógica va en src/ui/app.js');
    }
  }

  return hallazgos;
}

export function verificarTokensDefinidos(estilosDir) {
  const archivos = listarArchivosCss(estilosDir);
  const archivoTokens = archivos.find((archivo) => path.basename(archivo) === 'tokens.css');
  const definidos = new Set();
  if (archivoTokens) {
    const texto = fs.readFileSync(archivoTokens, 'utf8');
    // El guion bajo entra en la clase de caracteres: --nivel-clase_mundial
    // lo usa, y sin él la mitad del nombre del token quedaba cortada.
    for (const [, nombre] of texto.matchAll(/(--[a-z0-9_-]+)\s*:/gi)) {
      definidos.add(nombre);
    }
  }
  const usados = new Set();
  for (const archivo of archivos) {
    const texto = fs.readFileSync(archivo, 'utf8');
    // El grupo 2 es el separador que sigue al nombre: `,` = tiene fallback,
    // `)` = no tiene. Solo se exige definición para el segundo caso.
    for (const [, nombre, separador] of texto.matchAll(/var\(\s*(--[a-z0-9_-]+)\s*([,)])/gi)) {
      if (separador === ')') {
        usados.add(nombre);
      }
    }
  }
  return [...usados].filter((nombre) => !definidos.has(nombre));
}

// ============================================================================
// PLANUI U1 (cimientos) — los guards de la UI nueva: la lista de prohibidos
// (§5.9), los colores que los parsers de contraste no leen (§9.5), `rngUi`
// acotado a los minijuegos (§9.5) y el check temporal de tokens contra la
// vitrina (§9.3). Los comentarios no cuentan: una hoja que dice "sin
// escuadras" no está usando una.
// ============================================================================

// Un comentario de bloque se reemplaza por sus saltos de línea: los hallazgos siguen diciendo la línea real.
const soloSaltos = (comentario) => comentario.replace(/[^\n]/g, '');

function sinComentariosCss(texto) {
  return texto.replace(/\/\*[\s\S]*?\*\//g, soloSaltos);
}

function sinComentariosHtml(texto) {
  return texto.replace(/<!--[\s\S]*?-->/g, soloSaltos);
}

// Sin lexer: corta `/* … */` y `// …` (lo que sigue a `//` fuera de un string de la misma línea es un comentario; una URL
// `http://` adentro de un string se salva porque el `//` va pegado a `:`).
function sinComentariosJs(texto) {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, soloSaltos)
    .split(/\r?\n/)
    .map((linea) => linea.replace(/(^|[^:'"`\\])\/\/.*$/, '$1'))
    .join('\n');
}

// §5.9. `escuadra` y `--tick*` son los ticks de encuadre; `--clip-corte` y `--chamfer`, el chaflán (los dos nombres que
// tuvo); la grilla de fondo es la de `repeating-linear-gradient`; `%23` es el `#` escapado de un data URI (el favicon).
export const PROHIBIDOS_CSS = [
  { patron: /--clip-corte/, que: 'el chaflán (--clip-corte)' },
  { patron: /--chamfer/, que: 'el chaflán (--chamfer)' },
  { patron: /--tick/, que: 'los ticks de encuadre (--tick*)' },
  { patron: /escuadra/i, que: 'las escuadras' },
  { patron: /--scanline/, que: 'las scanlines (--scanline)' },
  { patron: /repeating-linear-gradient/, que: 'la grilla de fondo (repeating-linear-gradient)' },
  { patron: /barlow/i, que: 'la familia Barlow' },
  { patron: /(?:#|%23)2ee8ff/i, que: 'el cyan #2ee8ff' }
];
const PROHIBIDO_JS = { patron: /barlow/i, que: 'la familia Barlow' };

// `estilosDir`: todas las hojas (tokens.css incluido). `indexHtml`: el HTML (sin sus comentarios). `uiDir`: el JS de la UI,
// donde solo se busca la fuente (un `ctx.font` del PNG también es la familia).
export function verificarProhibidos({ estilosDir, indexHtml = null, uiDir = null }) {
  const hallazgos = [];
  const revisar = (archivo, texto, reglas) => {
    texto.split('\n').forEach((linea, i) => {
      for (const { patron, que } of reglas) {
        if (patron.test(linea)) hallazgos.push(`${path.basename(archivo)}:${i + 1} ${que}`);
      }
    });
  };
  for (const archivo of listarArchivosCss(estilosDir)) {
    revisar(archivo, sinComentariosCss(fs.readFileSync(archivo, 'utf8')), PROHIBIDOS_CSS);
  }
  if (indexHtml) {
    revisar(indexHtml, sinComentariosHtml(fs.readFileSync(indexHtml, 'utf8')), PROHIBIDOS_CSS);
  }
  if (uiDir) {
    for (const archivo of listarArchivos(uiDir).filter((a) => path.extname(a) === '.js')) {
      revisar(archivo, sinComentariosJs(fs.readFileSync(archivo, 'utf8')), [PROHIBIDO_JS]);
    }
  }
  return hallazgos;
}

// §9.5: los parsers de contraste (`hexDeToken`, `contraste.mjs`) leen `#rrggbb` y lo que el navegador computa como
// `rgb()`/`color(srgb …)`; un `oklch()`, un `lab()` o un `color-mix(in oklab …)` en una hoja pasan sin medir. Las variantes
// translúcidas fijas van como `#rrggbbaa` en tokens.css. PLANUI §0.2 (la ola 2 rehecha): `color-mix(in srgb, …)` SÍ se
// permite en las hojas de las familias —el navegador lo computa a `color(srgb …)`, que `contraste.mjs` lee—, porque los
// tintes del segundo tono (`--tono-*`) cambian en tiempo de ejecución y no se pueden precalcular. Exenta de todo:
// `fx.css`, la hoja del kit (U1k), que es decorativa y copia textual la vitrina (decisión del supervisor, 2026-10-10).
const PATRON_COLOR_MODERNO = /(?<![\w-])(?:oklch|oklab|lab|lch|color)\(|(?<![\w-])color-mix\(\s*in\s+(?!srgb\b)/i;
export const HOJAS_DECORATIVAS = Object.freeze(['fx.css']);

export function verificarSinColorModerno(estilosDir, { exentas = HOJAS_DECORATIVAS } = {}) {
  const hallazgos = [];
  for (const archivo of listarArchivosCss(estilosDir).filter((a) => !exentas.includes(path.basename(a)))) {
    sinComentariosCss(fs.readFileSync(archivo, 'utf8')).split('\n').forEach((linea, i) => {
      if (PATRON_COLOR_MODERNO.test(linea)) hallazgos.push(`${path.basename(archivo)}:${i + 1}`);
    });
  }
  return hallazgos;
}

// §9.5: un triplete de color escrito en un shader (`vec3(0.18, 0.42, 1.0)`) es un color literal que esquiva tokens.css.
// Los colores del shader salen de los tokens con `leerToken`. Una constante que no es un color (los pesos de luminancia)
// se marca en su línea con el comentario `glsl-no-color`.
const PATRON_TRIPLETE_GLSL = /vec[34]\(\s*\d*\.\d+\s*,\s*\d*\.\d+\s*,\s*\d*\.\d+/;

export function verificarSinTripletesGlsl(fxDir) {
  if (!fs.existsSync(fxDir)) return [];
  const hallazgos = [];
  for (const archivo of listarArchivos(fxDir).filter((a) => path.extname(a) === '.js')) {
    fs.readFileSync(archivo, 'utf8').split('\n').forEach((linea, i) => {
      if (PATRON_TRIPLETE_GLSL.test(linea) && !linea.includes('glsl-no-color')) {
        hallazgos.push(`${path.basename(archivo)}:${i + 1}`);
      }
    });
  }
  return hallazgos;
}

// §9.5: `rngUi` es el stream de los minijuegos humanos. Un uso decorativo (un efecto que tira un dado) lo correría sin que
// ningún bot lo note. Puede aparecer en `components/minijuegos/`, `paradas/minijuego.js`, `app.js` (lo crea y lo pasa) y
// `almacenamiento.js` (lo guarda y lo restaura, sin consumirlo). Los comentarios no cuentan.
export function verificarRngUiAcotado(uiDir) {
  const permitido = (relativo) => relativo.startsWith('components/minijuegos/')
    || ['paradas/minijuego.js', 'app.js', 'almacenamiento.js'].includes(relativo);
  return listarArchivos(uiDir)
    .filter((archivo) => path.extname(archivo) === '.js')
    .map((archivo) => ({ archivo, relativo: path.relative(uiDir, archivo).split(path.sep).join('/') }))
    .filter(({ archivo, relativo }) => !permitido(relativo) && /\brngUi\b/.test(sinComentariosJs(fs.readFileSync(archivo, 'utf8'))))
    .map(({ relativo }) => relativo);
}

// --- El color, en números (para precalcular y verificar los derivados de la luz sin color-mix) -----------------------

export function colorDeHex(hex) {
  const h = hex.replace('#', '');
  const canal = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
  return { r: canal(0), g: canal(2), b: canal(4), a: h.length === 8 ? canal(6) : 1 };
}

export function hexDeColor({ r, g, b, a = 1 }) {
  const byte = (x) => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, '0');
  return `#${byte(r)}${byte(g)}${byte(b)}${a >= 1 ? '' : byte(a)}`;
}

// `color-mix(in srgb, A p, B)`: interpolación premultiplicada (CSS Color 5 §3), como la hace el navegador.
export function mezclarSrgb(a, b, p) {
  const alfa = a.a * p + b.a * (1 - p);
  if (alfa === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const canal = (k) => (a[k] * a.a * p + b[k] * b.a * (1 - p)) / alfa;
  return { r: canal('r'), g: canal('g'), b: canal('b'), a: alfa };
}

const aLineal = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const deLineal = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

function aOklab({ r, g, b }) {
  const [lr, lg, lb] = [r, g, b].map(aLineal);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ];
}

function deOklab([L, A, B]) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return {
    r: deLineal(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: deLineal(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: deLineal(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    a: 1
  };
}

// `color-mix(in oklab, A p, B)` entre dos colores opacos.
export function mezclarOklab(a, b, p) {
  const [x, y] = [aOklab(a), aOklab(b)];
  return deOklab(x.map((v, i) => v * p + y[i] * (1 - p)));
}

// Las declaraciones `--x: valor;` de una hoja de tokens, sin comentarios, con el selector de su bloque.
export function declaracionesDeTokens(cssTexto) {
  const salida = [];
  for (const [, selector, cuerpo] of sinComentariosCss(cssTexto).matchAll(PATRON_BLOQUE)) {
    const selectores = selector.split(',').map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
    for (const [, nombre, valor] of cuerpo.matchAll(/(--[a-z0-9_-]+)\s*:\s*([^;]+);/gi)) {
      salida.push({ selectores, nombre, valor: valor.trim().replace(/\s+/g, ' ') });
    }
  }
  return salida;
}

// El valor de `--nombre` en `:root` (la primera declaración de `:root`), siguiendo las `var(--x)` hasta un literal.
function valorEnRaiz(decls, nombre, vistos = new Set()) {
  if (vistos.has(nombre)) return null;
  vistos.add(nombre);
  const d = decls.find((x) => x.nombre === nombre && x.selectores.includes(':root'));
  if (!d) return null;
  const v = d.valor.match(/^var\((--[a-z0-9_-]+)\)$/i);
  return v ? valorEnRaiz(decls, v[1], vistos) : d.valor;
}

// Los derivados de la luz de la vitrina (`--luz-texto: color-mix(in oklab, var(--luz) 52%, var(--ink))`, etc.), evaluados
// para una luz dada. `declsVitrina`: las declaraciones del tokens.css de la vitrina. Devuelve `{ '--luz-texto': '#…', … }`.
const PATRON_MEZCLA = /^color-mix\(in (srgb|oklab), var\(--luz\) ([\d.]+)%, (transparent|var\((--[a-z0-9_-]+)\))\)$/i;

export function derivadosDeLuz(declsVitrina, luzHex) {
  const salida = {};
  for (const { nombre, valor } of declsVitrina) {
    const m = valor.match(PATRON_MEZCLA);
    if (!m) continue;
    const [, espacio, porcentaje, otro, otroToken] = m;
    const b = otro === 'transparent' ? { r: 0, g: 0, b: 0, a: 0 } : colorDeHex(valorEnRaiz(declsVitrina, otroToken));
    const p = Number(porcentaje) / 100;
    const luz = colorDeHex(luzHex);
    salida[nombre] = hexDeColor(espacio === 'oklab' ? mezclarOklab(luz, b, p) : mezclarSrgb(luz, b, p));
  }
  return salida;
}

// Las luces que cambian `--luz`: las 5 eras (`--luz-<era>`) y las competiciones (`--comp-<id>-acento`), con el selector
// donde el juego tiene que tener sus derivados precalculados.
export function lucesDeLaVitrina(declsVitrina) {
  const luces = [];
  for (const { selectores, nombre, valor } of declsVitrina) {
    if (nombre !== '--luz') continue;
    const token = valor.match(/^var\((--[a-z0-9_-]+)\)$/i)?.[1];
    for (const selector of selectores) {
      if (/^html\[data-(era|comp)=/.test(selector) && token) {
        luces.push({ selector, hex: valorEnRaiz(declsVitrina, token) });
      }
    }
  }
  return luces;
}

// §9.3, el check temporal (vive hasta U4): el tokens.css del juego contiene los tokens de la vitrina con el mismo valor.
// Las declaraciones literales se comparan textuales (nombre + valor); los derivados con color-mix (§9.5 no los deja en
// una hoja), por su valor: en cada selector de era y de competición el juego tiene el hex que daría el navegador (±1 por
// canal). Devuelve los problemas.
export function verificarTokensDeLaVitrina(cssJuego, cssVitrina) {
  const vitrina = declaracionesDeTokens(cssVitrina);
  const juego = declaracionesDeTokens(cssJuego);
  const pares = new Set(juego.map((d) => `${d.nombre}: ${d.valor}`));
  const problemas = [];
  for (const d of vitrina) {
    if (PATRON_MEZCLA.test(d.valor)) continue;
    if (!pares.has(`${d.nombre}: ${d.valor}`)) problemas.push(`${d.nombre}: ${d.valor} (falta o cambió)`);
  }
  const cerca = (x, y) => {
    if (!x || !y || x.length !== y.length) return false;
    const [a, b] = [colorDeHex(x), colorDeHex(y)];
    return ['r', 'g', 'b', 'a'].every((k) => Math.abs(a[k] - b[k]) * 255 <= 1.01);
  };
  for (const { selector, hex } of lucesDeLaVitrina(vitrina)) {
    for (const [nombre, esperado] of Object.entries(derivadosDeLuz(vitrina, hex))) {
      const tiene = juego.find((d) => d.nombre === nombre && d.selectores.includes(selector));
      if (!tiene || !cerca(tiene.valor, esperado)) {
        problemas.push(`${selector} ${nombre}: ${tiene?.valor ?? 'sin declarar'} (la vitrina da ${esperado})`);
      }
    }
  }
  return problemas;
}

// K4c (paso 1, revisión): `flags.splitJugadoSinFila` es el split del pase que espera a que `roster.js` le abra su fila
// (`{ org, splitsPorTier }`): a lo sumo UNO. Un bug ya arreglado (el banco te cedía a tu propio club) lo dejó crecer a
// `{ 2: 9 }` a mitad de una carrera sin que nada lo viera hasta el final. `simulate.js` lo mira después de cada split.
// `null` si está bien; si no, el mensaje.
export function verificarSplitJugadoSinFila(state) {
  const pendiente = state?.flags?.splitJugadoSinFila;
  if (!pendiente) {
    return null;
  }
  const acumulados = Object.values(pendiente.splitsPorTier ?? {}).reduce((suma, n) => suma + n, 0);
  return acumulados > 1
    ? `flags.splitJugadoSinFila acumula ${acumulados} splits (${JSON.stringify(pendiente.splitsPorTier)}, org ${pendiente.org}): nunca puede haber más de uno esperando fila`
    : null;
}
