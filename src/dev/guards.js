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
