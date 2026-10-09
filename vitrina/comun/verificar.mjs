// Verificador de la vitrina. Aplica a vitrina/ las mismas reglas de src/dev/guards.js (carpeta por carpeta) y suma la
// lista de prohibidos de la UI nueva.
//   node vitrina/comun/verificar.mjs [--direccion a-luz]
// Sale con codigo 1 si algo falla. Salida legible por ambito: comun, indice, y cada direccion.
//
// Reglas (cada una cita la de guards.js que reimplementa; guards.js recorre una carpeta con CSS/JS, aca hace falta
// elegir archivos por ambito, asi que se reimplementan con la misma logica):
//  1. sin Math.random              <- guards.js:26-33 (verificarSinMathRandom; aca tambien .mjs y .css)
//  2. sin color literal en CSS     <- guards.js:99-116 (verificarSinColorLiteral; solo tokens.css los puede tener)
//  3. sin color literal en JS      <- guards.js:118-140 (verificarSinColorLiteralEnJs)
//  4. todo var(--x) sin fallback definido <- guards.js:205-232 (verificarTokensDefinidos)
//  5. sin fondo de tinta en :hover <- guards.js:81-97 (se llama a verificarSinFondoDeTinta de guards.js tal cual)
//  6. prohibidos de la UI nueva    <- propios (ver PROHIBIDOS)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { verificarSinFondoDeTinta } from '../../src/dev/guards.js';

const ESTE = fileURLToPath(import.meta.url);
const RAIZ = path.resolve(path.dirname(ESTE), '..');
const DIRECCIONES = ['fusion', 'a-luz', 'b-nocturno', 'c-pantallas'];
const SALTAR_CARPETAS = new Set(['capturas', 'node_modules', 'fuentes', 'datos', 'hoy']);
const EXT_CODIGO = new Set(['.js', '.mjs', '.html', '.css']);

const args = process.argv.slice(2);
const iDir = args.indexOf('--direccion');
const SOLO = iDir >= 0 ? args[iDir + 1] : null;

// ---------- recorrido ----------
function listar(dir, { recursivo = true } = {}) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return recursivo && !SALTAR_CARPETAS.has(e.name) ? listar(p) : [];
    return EXT_CODIGO.has(path.extname(e.name)) && p !== ESTE ? [p] : [];
  });
}
const leer = (f) => fs.readFileSync(f, 'utf8');
const rel = (f) => path.relative(RAIZ, f).replace(/\\/g, '/');
const lineaDe = (texto, indice) => texto.slice(0, indice).split('\n').length;

// ---------- patrones ----------
const MATH_RANDOM = 'Math' + '.random(';
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/;
const HEX = /(?<!&)#[0-9a-fA-F]{3,8}\b/;

// Prohibidos de la UI nueva. Los literales se arman con concatenacion para que este archivo no se delate a si mismo.
const PROHIBIDOS = [
  { nombre: '--clip-corte', re: new RegExp('--clip' + '-corte') },
  { nombre: 'ticks (--tick, clase tick/ticks)', re: new RegExp('--tick|\\.ticks?(?![\\w-])|class="[^"]*\\bticks?\\b|classList[^;\\n]*[\'"]ticks?[\'"]') },
  { nombre: 'escuadras', re: new RegExp('escua' + 'dra', 'i') },
  { nombre: '--scanline', re: new RegExp('scan' + 'line', 'i') },
  { nombre: 'familia Bar' + 'low', re: new RegExp('Bar' + 'low', 'i') },
  { nombre: 'hex #2ee8' + 'ff', re: new RegExp('#2ee8' + 'ff', 'i') },
];

// ---------- reglas ----------
function hallar(archivos, fn) {
  const out = [];
  for (const f of archivos) fn(f, leer(f), (linea, detalle) => out.push(`${rel(f)}:${linea}${detalle ? ' ' + detalle : ''}`));
  return out;
}

function reglaMathRandom(archivos) {
  return hallar(archivos, (f, t, anotar) => {
    t.split('\n').forEach((l, i) => l.includes(MATH_RANDOM) && anotar(i + 1));
  });
}

// Texto de un .html que cuenta como estilo: atributos style="..." y bloques <style>.
function estilosDeHtml(texto) {
  const trozos = [];
  for (const m of texto.matchAll(/style\s*=\s*"([^"]*)"/g)) trozos.push([m.index, m[1]]);
  for (const m of texto.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) trozos.push([m.index, m[1]]);
  return trozos;
}

function reglaColorLiteral(archivos) {
  const out = [];
  for (const f of archivos) {
    const ext = path.extname(f);
    const base = path.basename(f);
    const t = leer(f);
    if (ext === '.css' && base !== 'tokens.css') {
      t.split('\n').forEach((l, i) => {
        if (l.includes('data:image')) return; // guards.js:106-108: el SVG de data URI trae %23, no un color
        if (COLOR_LITERAL.test(l)) out.push(`${rel(f)}:${i + 1}`);
      });
    } else if (ext === '.js' || ext === '.mjs') {
      t.split('\n').forEach((l, i) => {
        if (HEX.test(l)) return out.push(`${rel(f)}:${i + 1}`);
        const m = l.match(/\b(?:rgb|rgba|hsl|hsla)\(/);
        if (m && !l.slice(0, m.index).includes('`')) out.push(`${rel(f)}:${i + 1}`); // guards.js:134-139
      });
    } else if (ext === '.html') {
      for (const [idx, trozo] of estilosDeHtml(t)) {
        if (COLOR_LITERAL.test(trozo)) out.push(`${rel(f)}:${lineaDe(t, idx)} (style en html)`);
      }
    }
  }
  return out;
}

function declaradas(texto) {
  return new Set([...texto.matchAll(/(--[a-z0-9_-]+)\s*:/gi)].map((m) => m[1]));
}
// definidosGlobales: lo que declaran los tokens.css de su ambito (y los de comun/, que toda pagina carga).
// Ademas vale una variable local declarada en el MISMO archivo (--era-a dentro de ambiente-css.css): atrapa el typo
// igual que guards.js:205-232 sin obligar a subir al tokens.css cada variable de componente.
function reglaTokens(archivosCss, definidosGlobales) {
  const out = [];
  for (const f of archivosCss) {
    const t = leer(f);
    const locales = declaradas(t);
    for (const m of t.matchAll(/var\(\s*(--[a-z0-9_-]+)\s*([,)])/gi)) {
      if (m[2] !== ')') continue;
      if (!definidosGlobales.has(m[1]) && !locales.has(m[1])) out.push(`${rel(f)}:${lineaDe(t, m.index)} ${m[1]}`);
    }
  }
  return out;
}

function reglaProhibidos(archivos) {
  const out = [];
  for (const f of archivos) {
    const t = leer(f);
    for (const { nombre, re } of PROHIBIDOS) {
      t.split('\n').forEach((l, i) => re.test(l) && out.push(`${rel(f)}:${i + 1} prohibido: ${nombre}`));
    }
    // Grilla de fondo hecha con linear-gradient repetido.
    if (path.extname(f) === '.css') {
      t.split('\n').forEach((l, i) => /repeating-linear-gradient/.test(l) && out.push(`${rel(f)}:${i + 1} prohibido: grilla con repeating-linear-gradient`));
      for (const m of t.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const cuerpo = m[2];
        if ((cuerpo.match(/linear-gradient\(/g) ?? []).length >= 2 && /background-size/.test(cuerpo)) {
          out.push(`${rel(f)}:${lineaDe(t, m.index)} prohibido: grilla de fondo con linear-gradient repetido (${m[1].trim()})`);
        }
      }
    }
  }
  return out;
}

// ---------- ambitos ----------
const TOKENS_COMUN = path.join(RAIZ, 'comun', 'tokens.css');
const definidosComun = fs.existsSync(TOKENS_COMUN) ? declaradas(leer(TOKENS_COMUN)) : new Set();

function ambito(nombre, archivos, tokensDir) {
  const css = archivos.filter((f) => path.extname(f) === '.css');
  const tokensCss = tokensDir ? listar(tokensDir).filter((f) => path.basename(f) === 'tokens.css') : [];
  const definidos = new Set(definidosComun);
  for (const f of tokensCss) for (const d of declaradas(leer(f))) definidos.add(d);
  const resultados = [
    ['Math.random', reglaMathRandom(archivos)],
    ['color literal fuera de tokens.css', reglaColorLiteral(archivos)],
    ['var(--x) sin definir', reglaTokens(css, definidos)],
    ['prohibidos de la UI nueva', reglaProhibidos(archivos)],
  ];
  // guards.js:81-97 tal cual, sobre la carpeta del ambito (solo si es una carpeta propia)
  if (tokensDir) resultados.push(['fondo de tinta en :hover', verificarSinFondoDeTinta(tokensDir).map((h) => `${nombre}/${h}`)]);
  return { nombre, archivos: archivos.length, resultados };
}

const ambitos = [];
if (!SOLO || SOLO === 'comun') ambitos.push(ambito('comun', listar(path.join(RAIZ, 'comun')), path.join(RAIZ, 'comun')));
if (!SOLO || SOLO === 'indice') {
  const idx = ['index.html', 'index.css', 'index.js'].map((n) => path.join(RAIZ, n)).filter((f) => fs.existsSync(f));
  ambitos.push(ambito('indice', idx, null));
}
for (const d of DIRECCIONES) {
  if (SOLO && SOLO !== d) continue;
  const dir = path.join(RAIZ, d);
  if (!fs.existsSync(dir)) {
    console.log(`AVISO ${d}: la carpeta todavia no existe (se saltea)`);
    continue;
  }
  ambitos.push(ambito(d, listar(dir), dir));
}

let fallos = 0;
for (const a of ambitos) {
  const malas = a.resultados.filter(([, h]) => h.length);
  console.log(`${malas.length ? 'FALLA' : 'OK   '} ${a.nombre} (${a.archivos} archivos)`);
  for (const [regla, hallazgos] of malas) {
    console.log(`  - ${regla}`);
    hallazgos.slice(0, 20).forEach((h) => console.log(`      ${h}`));
    if (hallazgos.length > 20) console.log(`      ... y ${hallazgos.length - 20} mas`);
    fallos += hallazgos.length;
  }
}
console.log(fallos ? `\n${fallos} hallazgo(s).` : '\nTodo en verde.');
process.exit(fallos ? 1 : 0);
