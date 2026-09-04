import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const EXTENSIONES_A_REVISAR = new Set(['.js']);

function listarArchivos(dir) {
  const entradas = fs.readdirSync(dir, { withFileTypes: true });
  return entradas.flatMap((entrada) => {
    const fullPath = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      return listarArchivos(fullPath);
    }
    return EXTENSIONES_A_REVISAR.has(path.extname(entrada.name)) ? [fullPath] : [];
  });
}

const PATRON_PROHIBIDO = 'Math' + '.random(';

export function verificarSinMathRandom(srcDir) {
  const archivoActual = fileURLToPath(import.meta.url);
  const archivos = listarArchivos(srcDir).filter((archivo) => archivo !== archivoActual);
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

// Todo var(--x) que se usa tiene que estar definido en tokens.css.
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
    for (const [, nombre] of texto.matchAll(/var\(\s*(--[a-z0-9_-]+)/gi)) {
      usados.add(nombre);
    }
  }
  return [...usados].filter((nombre) => !definidos.has(nombre));
}
