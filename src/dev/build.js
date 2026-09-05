import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

// Build estático (PLAN.md fase P). Produce `dist/` con SOLO lo que el navegador
// necesita para jugar, y con una garantía verificable: la carrera que sale de
// `dist/` es EXACTAMENTE la misma que sale de `src/` para la misma seed.
//
// No hay bundler ni una sola dependencia: el proyecto no tiene ninguna y esta
// fase no es excusa para agregar la primera. Son tres pasos de copiar, reescribir
// y comprobar.
//
// Qué hace y por qué:
//
// 1. COPIA lo que corre en el navegador y deja afuera lo que no (`src/dev/`,
//    `server.js`, los cinco `.md`). Servir el plan de desarrollo al jugador no
//    es un problema de peso, es que no tiene por qué estar ahí.
//
// 2. INLINEA los JSON. El motor los importa con `with { type: 'json' }` en 32
//    lugares — sintaxis que necesita Chrome 123+ / Safari 17.2+ / Firefox 138+.
//    En un navegador anterior eso no degrada: es un error de sintaxis y el juego
//    no arranca, con la pantalla en blanco y nada en el log. Cada `foo.json` pasa
//    a ser un `foo.json.js` con `export default {...}` y los imports se reescriben.
//    `dist/` queda sin una sola declaración de import attributes, y el piso de
//    navegador baja a "soporta ES modules", que es 2018.
//
// 3. VERIFICA que el paso 2 no cambió nada, corriendo el motor desde `dist/` y
//    desde `src/` con las mismas seeds y comparando la huella de cada carrera.
//    Una transformación de código en el build que rompe en silencio produce el
//    peor bug posible —el juego local anda y el publicado no—, así que no se
//    confía en que salió bien: se comprueba.

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = path.join(RAIZ, 'dist');

// Lo que el navegador carga. `src/dev` y `server.js` quedan afuera a propósito.
const A_COPIAR = ['index.html', 'src/core', 'src/data', 'src/systems', 'src/ui'];

const SEEDS_DE_VERIFICACION = 12;
const SPLITS_DE_VERIFICACION = 30;

function copiar(desde, hacia) {
  const stat = fs.statSync(desde);
  if (stat.isDirectory()) {
    fs.mkdirSync(hacia, { recursive: true });
    for (const entrada of fs.readdirSync(desde)) {
      copiar(path.join(desde, entrada), path.join(hacia, entrada));
    }
    return;
  }
  fs.mkdirSync(path.dirname(hacia), { recursive: true });
  fs.copyFileSync(desde, hacia);
}

function archivosPorExtension(dir, extensiones, acc = []) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      archivosPorExtension(p, extensiones, acc);
    } else if (extensiones.includes(path.extname(entrada.name))) {
      acc.push(p);
    }
  }
  return acc;
}

// --- Paso 1: copiar ---

function copiarFuentes() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  for (const relativo of A_COPIAR) {
    const origen = path.join(RAIZ, relativo);
    if (!fs.existsSync(origen)) {
      throw new Error(`build: falta ${relativo}, que el navegador necesita`);
    }
    copiar(origen, path.join(DIST, relativo));
  }
}

// --- Paso 2: inlinear los JSON ---

// `import X from './a.json' with { type: 'json' }` -> `import X from './a.json.js'`
const IMPORT_ESTATICO = /from\s*(['"])([^'"]+\.json)\1\s*with\s*\{\s*type\s*:\s*(['"])json\3\s*\}/g;
// `import('./a.json', { with: { type: 'json' } })` -> `import('./a.json.js')`
const IMPORT_DINAMICO = /import\(\s*(['"])([^'"]+\.json)\1\s*,\s*\{\s*with\s*:\s*\{\s*type\s*:\s*(['"])json\3\s*\}\s*\}\s*\)/g;

function inlinearJson() {
  const jsonEnDist = archivosPorExtension(path.join(DIST, 'src'), ['.json']);

  for (const archivo of jsonEnDist) {
    // Parsear y volver a serializar valida el JSON de paso: un archivo roto
    // revienta acá, en el build, y no en la pantalla del jugador.
    const datos = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    fs.writeFileSync(
      `${archivo}.js`,
      `// Generado por src/dev/build.js desde ${path.basename(archivo)}. No editar.\n`
      + `export default ${JSON.stringify(datos)};\n`
    );
    fs.rmSync(archivo);
  }

  let reescritos = 0;
  for (const archivo of archivosPorExtension(DIST, ['.js', '.html'])) {
    const antes = fs.readFileSync(archivo, 'utf8');
    const despues = antes
      .replace(IMPORT_ESTATICO, (_, c, ruta) => `from ${c}${ruta}.js${c}`)
      .replace(IMPORT_DINAMICO, (_, c, ruta) => `import(${c}${ruta}.js${c})`);
    if (despues !== antes) {
      fs.writeFileSync(archivo, despues);
      reescritos += 1;
    }
  }

  return { jsonInlineados: jsonEnDist.length, archivosReescritos: reescritos };
}

// --- Paso 3: los chequeos que hacen que el deploy no falle ---

// Windows no distingue mayúsculas; el host corre Linux y sí. Un `Roles.js`
// importado como `roles.js` anda local y tira 404 publicado.
function existeConCapitalizacionExacta(absoluto) {
  let actual = DIST;
  for (const segmento of path.relative(DIST, absoluto).split(path.sep)) {
    let entradas;
    try {
      entradas = fs.readdirSync(actual);
    } catch {
      return false;
    }
    if (!entradas.includes(segmento)) {
      return false;
    }
    actual = path.join(actual, segmento);
  }
  return true;
}

const ESPECIFICADOR_RELATIVO = /(?:^|\n)\s*(?:import|export)[^'"\n]*from\s*['"](\.[^'"]+)['"]/g;

// Fase T8: la misma trampa de P.7, pero del lado del CSS — no estaba
// cubierta porque hasta la fase T no había CSS. `url()` de las fuentes
// (`base.css`) y `<link href>` de las hojas de estilo (`index.html`) son
// las dos formas en que un archivo puede referenciar al otro con la
// capitalización que sea en Windows y romper 404 en un host case-sensitive.
const URL_CSS = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
const LINK_HREF = /<link\b[^>]*\bhref\s*=\s*(['"])([^'"]+)\1/gi;

function esRutaLocal(especificador) {
  // `#`/`%23` es un fragmento SVG (`url(#n)` de un filtro), no un archivo
  // — aparece adentro del data URI del grano de `base.css`, y como el
  // regex de `url()` no sabe que está anidado en OTRO `url("data:...")`,
  // sin este filtro lo confunde con una ruta relativa rota.
  return !especificador.startsWith('data:')
    && !especificador.startsWith('#') && !especificador.startsWith('%23')
    && !/^[a-z]+:\/\//i.test(especificador);
}

// Concatenado, igual que `guards.js`: escrito de corrido, este archivo se
// delataría a sí mismo ante el check "sin aleatoriedad nativa" de validate.
const AZAR_NATIVO = 'Math' + '.random(';

function comprobarDist() {
  const problemas = [];
  let imports = 0;

  for (const archivo of archivosPorExtension(DIST, ['.js', '.html'])) {
    const texto = fs.readFileSync(archivo, 'utf8');
    const relativo = path.relative(DIST, archivo);

    for (const [, especificador] of texto.matchAll(ESPECIFICADOR_RELATIVO)) {
      imports += 1;
      const destino = path.resolve(path.dirname(archivo), especificador);
      if (!existeConCapitalizacionExacta(destino)) {
        problemas.push(`${relativo}: "${especificador}" no resuelve en un filesystem case-sensitive`);
      }
    }

    // El paso 2 tiene que haber borrado hasta el último import attribute.
    if (/with\s*\{\s*type\s*:\s*['"]json['"]/.test(texto)) {
      problemas.push(`${relativo}: quedó un import attribute sin reescribir`);
    }
    // Regla invariable 1. En dist importa el doble: sin determinismo, un link
    // con seed no reproduce la carrera que le mandaste a alguien.
    if (texto.includes(AZAR_NATIVO)) {
      const n = texto.split(AZAR_NATIVO).length - 1;
      problemas.push(`${relativo}: ${n} llamada(s) al azar nativo del navegador (rompe el determinismo)`);
    }

    // `<link href>` (hojas de estilo, preload de fuentes) — mismo chequeo
    // que los imports, pero es HTML, no JS.
    for (const [, , especificador] of texto.matchAll(LINK_HREF)) {
      if (!esRutaLocal(especificador)) continue;
      imports += 1;
      const destino = path.resolve(path.dirname(archivo), especificador);
      if (!existeConCapitalizacionExacta(destino)) {
        problemas.push(`${relativo}: <link href="${especificador}"> no resuelve en un filesystem case-sensitive`);
      }
    }
  }

  // `url()` de CSS (las fuentes de `base.css`) — mismo chequeo, sobre las
  // hojas de estilo en vez de sobre JS/HTML.
  for (const archivo of archivosPorExtension(DIST, ['.css'])) {
    const texto = fs.readFileSync(archivo, 'utf8');
    const relativo = path.relative(DIST, archivo);
    for (const [, , especificador] of texto.matchAll(URL_CSS)) {
      if (!esRutaLocal(especificador)) continue;
      imports += 1;
      const destino = path.resolve(path.dirname(archivo), especificador);
      if (!existeConCapitalizacionExacta(destino)) {
        problemas.push(`${relativo}: url("${especificador}") no resuelve en un filesystem case-sensitive`);
      }
    }
  }

  // GitHub Pages corre Jekyll y se saltea todo lo que empiece con "_".
  const conGuionBajo = archivosPorExtension(DIST, ['.js', '.html', '.json', '.css'])
    .map((f) => path.relative(DIST, f))
    .filter((f) => f.split(path.sep).some((s) => s.startsWith('_')));

  return { imports, problemas, conGuionBajo };
}

// --- Paso 4: la prueba de que el build no cambió el juego ---

// Corre las mismas seeds contra los dos árboles y compara. Si una sola difiere,
// la reescritura de imports cambió algo y el build no sirve.
async function huellaDe(raiz) {
  const url = (relativo) => pathToFileURL(path.join(raiz, relativo)).href;
  const { mulberry32 } = await import(url('src/core/rng.js'));
  const { createInitialState } = await import(url('src/core/state.js'));
  const { avanzarSplitAuto } = await import(url('src/core/pipeline.js'));

  const huellas = [];
  for (let seed = 1; seed <= SEEDS_DE_VERIFICACION; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < SPLITS_DE_VERIFICACION && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng, undefined).state;
    }
    huellas.push([
      seed,
      state.player.name,
      state.player.role,
      state.age,
      state.phase,
      state.finAnticipado,
      state.splitFichaje,
      state.career.currentOrg,
      state.career.liga,
      Math.round(state.player.soloqElo),
      Math.round(state.player.stats.mecanica * 1000),
      state.logs.length
    ].join(':'));
  }
  return huellas;
}

async function verificarQueElJuegoNoCambio() {
  const [origen, construido] = await Promise.all([huellaDe(RAIZ), huellaDe(DIST)]);
  const distintas = origen
    .map((h, i) => (h === construido[i] ? null : `  seed ${i + 1}\n    src : ${h}\n    dist: ${construido[i]}`))
    .filter(Boolean);
  return { carreras: origen.length, distintas };
}

// --- Main ---

function pesoDe(dir) {
  let total = 0;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entrada.name);
    total += entrada.isDirectory() ? pesoDe(p) : fs.statSync(p).size;
  }
  return total;
}

console.log('Build estático -> dist/\n');

copiarFuentes();
const { jsonInlineados, archivosReescritos } = inlinearJson();
console.log(`  copiado        ${A_COPIAR.join(', ')}`);
console.log(`  json inlineado ${jsonInlineados} archivos, ${archivosReescritos} módulos reescritos`);

const { imports, problemas, conGuionBajo } = comprobarDist();
console.log(`  imports        ${imports} relativos, todos verificados con capitalización exacta`);

const { carreras, distintas } = await verificarQueElJuegoNoCambio();
console.log(`  determinismo   ${carreras} carreras × ${SPLITS_DE_VERIFICACION} splits, src vs dist`);

const errores = [
  ...problemas,
  ...conGuionBajo.map((f) => `${f}: empieza con "_" y Jekyll lo ignora (hace falta .nojekyll)`),
  ...(distintas.length > 0
    ? [`el build cambió el juego en ${distintas.length} de ${carreras} carreras:\n${distintas.join('\n')}`]
    : [])
];

console.log(`\n  peso           ${(pesoDe(DIST) / 1024).toFixed(0)} KB\n`);

if (errores.length > 0) {
  console.error(`FALLÓ el build (${errores.length}):`);
  for (const error of errores) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log('Build OK. `dist/` es lo que se sube: nada más, nada menos.');
