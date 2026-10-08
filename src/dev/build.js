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
// `assets/og-image.png` es el único archivo binario del bundle (la imagen de
// Open Graph, P.4) — se copia el PNG puntual, no el directorio `assets/`
// entero: la fuente `og-image.svg` es material de autoría, no algo que el
// navegador necesite servido.
const A_COPIAR = ['index.html', 'src/core', 'src/data', 'src/systems', 'src/ui', 'assets/og-image.png'];

const SEEDS_DE_VERIFICACION = 12;
const SPLITS_DE_VERIFICACION = 30;

// PLAN.md §P.6: hasta el 2026-09-13 este número solo se reportaba (nunca hacía
// fallar el build), y por eso subió sin que nadie lo notara — 576 KB en la fase
// P original hasta 1561 KB nueve meses de contenido después. Techo fijado sobre
// el peso medido ese mismo día (1482 KB) con margen para lo que falta de la
// fase 13 y la fase D, no sobre una expectativa.
//
// Re-medido en la higiene de AUD-1 (2026-09-25, `AUDITORIA.md` H6): con
// `src/ui/graficos/` commiteada el peso real dio 1699,7 KB — a 0,3 KB del
// techo de 1700, el mismo patrón de margen-que-se-cierra-en-silencio que este
// número ya tuvo una vez (nota de arriba). Subido con margen para los
// consumidores de `graficos/` que vienen en V2/J-previa, sobre el peso medido
// ese día, no una expectativa.
//
// Re-medido en la segunda revisión de K1 (2026-10-02): la revisión leyó 0,19 KB de
// margen sobre el techo de 1800 (en este checkout, 1799,2 KB antes de sus arreglos),
// el mismo margen-que-se-cierra-en-silencio por tercera vez, y con los arreglos de
// esa revisión (validación y textos del puntaje) el peso medido dio 1801,4 KB: ya
// por encima. Subido a 1900 con margen para las pantallas que faltan de la fase K
// (la previa de K2d, K4/K5), sobre el peso medido ese día, no una expectativa.
//
// Re-medido al abrir K4 (2026-10-03): el peso medido ese día dio 1870 KB contra el
// techo de 1900, el mismo margen-que-se-cierra-en-silencio por cuarta vez. Subido a
// 2000 con margen para las pantallas de K4 y K5, sobre el peso medido ese día, no
// una expectativa.
//
// Re-medido en la integración de K5 (2026-10-03): con K5-A (el Mundial: core/internacional.js, systems/internacional.js
// y su tarjeta), K5-B (las ligas LRN y LRS, los chips de región) y K5-C (el final por mercado) juntos, el peso medido
// dio 2063,3 KB contra el techo de 2000: el margen para K4 y K5 se gastó entero. Subido a 2100: 37 KB de margen sobre
// el peso medido ese día, no una expectativa. No hay pantallas planeadas después de K5 (K5c calibra números, el resto
// son arreglos), así que el margen es el de los arreglos y no uno para K6.
//
// Re-medido al cerrar el bloque B (K4c, paso 3b, 2026-10-03): con el bloque B integrado (K4 y K4c) el peso medido dio 2124 KB contra el
// techo de 2100. La limpieza del plan anual (la preparación de la pretemporada, sus estilos y el catálogo de offseason) lo bajó a 2115,3 KB:
// todavía 15 KB arriba. Subido a 2200: ~85 KB (4%) de margen sobre el peso medido ese día, no una expectativa. Lo que queda de la FASE K
// son números (K5c) y arreglos; K6 mide el tiempo real en el navegador, no suma pantallas.
//
// Re-medido al cerrar K5c (paso 3, 2026-10-05): el peso medido dio 2240 KB contra el techo de 2200, el mismo
// margen-que-se-cierra-en-silencio por sexta vez. Lo que creció desde K4c (92eb777, 2115 KB) es código y datos del motor que
// el navegador corre, no algo que sobre en dist/: los "arreglos" de K5c y K6a no fueron chicos. En crudo (git), +124 KB: src/systems
// +44 (mercado.js +16,5 con la presión de tier 2 y el import de élite, amateur.js +12 con la semana de K6a-A, retiro.js +7 con el
// reloj de la vuelta), src/core +44 (demanda.js +11 con la casa y la élite, guardado.js +5 con las formas conocidas, puntaje,
// curvas, serie), src/data +24 (balance.js +17 con las perillas de Final2 y sus comentarios, version.js +5) y src/ui +12. Subido
// a 2300: ~60 KB (2,7%) de margen sobre el peso medido ese día, no una expectativa. K6 juega carreras y arregla lo que encuentre.
//
// Re-medido en la integración de K6c (2026-10-06, `k6c-integracion`): 2310 KB contra 2300. Lo que creció desde K5c (ef3509b)
// es motor que el usuario pidió en K6b y K6c, no algo que sobre: en crudo (git) +67 KB, src/systems +38 (amateur.js +383 líneas
// con el plan del año y la vara de la prueba, mercado.js +289 con el mérito y el contrato, retiro.js con la vuelta), src/core +19
// (cola.js nuevo, legado.js, demanda.js, guardado.js), src/data +8 (balance.js). Subido a 2400: ~90 KB (3,9%) de margen sobre el
// peso medido ese día, no una expectativa.
//
// Re-medido en la integración de K6d (2026-10-07, `k6d-integracion`): 2402 KB contra 2400. Lo que creció desde `fase-9r` (80d4b9b)
// es lo que el usuario pidió para K6d, no algo que sobre: en crudo (git) +54 KB, src/systems +30 (burnout.js nuevo con la parada
// del pro, amateur.js con la oferta que avisa y deja esperar, atributos.js con el riesgo del cierre, competitivo.js con el tier 3),
// src/core +12 (prensa.js nuevo, topMundial.js con P3, guardado.js con la 14), src/data +10 (balance.js, version.js) y src/ui +2.
// Subido a 2500: ~98 KB (4%) de margen sobre el peso medido ese día, no una expectativa.
//
// Re-medido en la integración de la ola V3 de la FASE V (2026-10-08, `v-integracion` c02a8c9): 2517 KB contra 2500. Lo
// que creció desde `fase-9r` (c01b905) es la pantalla que el usuario pidió para la FASE V ("Escenario + un panel", "Una
// página por split") y el Golden Road, no algo que sobre: en crudo (git) src/ui +90 KB (la franja, los cuartos, el
// acompañante, el director de escena, el teclado, las familias de paradas y el CSS partido por familia: estilos +22,
// components +24, paradas +16, core +11) y src/core +11 (el registro por split, el escalón y el seguimiento del Golden
// Road). Subido a 2600: ~83 KB (3,3%) de margen sobre el peso medido ese día, no una expectativa. V7 re-mide con el CSS
// muerto de los rieles ya borrado.
//
// Re-medido en la integración de V4 (2026-10-08, `v-integracion` cad8449): 2621 KB contra 2600. Lo que creció desde la
// ola V3 (2517) es la ola 4 y V4, lo que pidió el plan de la FASE V: los minijuegos con sus fases (V3d), la franja y los
// cuartos con la ficha única (V3e), el cuarto Carrera con `ui/core/trayectoria.js` y la medalla del Golden Road (V5), y
// el movimiento (V4: los deltas animados, los carteles de página, la pausa del cierre de año). Subido a 2700: ~79 KB
// (3%) de margen sobre el peso medido ese día, no una expectativa. V7 re-mide con el CSS muerto borrado.
const PESO_MAXIMO_KB = 2700;

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
// Fase 13e (P.4): `og:image`/`twitter:image` referencian un archivo por
// `<meta content="...">`, no por `<link href>` — el mismo agujero de P.7
// pero para la imagen social. Acotado a esos dos `property`/`name` (no
// cualquier `<meta content>`: `theme-color`, `viewport`, etc. no son rutas).
const META_IMAGEN = /<meta\b[^>]*\b(?:property|name)\s*=\s*['"](?:og:image|twitter:image)['"][^>]*\bcontent\s*=\s*(['"])([^'"]+)\1/gi;

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

    // `<meta property="og:image"|"twitter:image" content="...">` — la imagen
    // social (P.4). Mismo chequeo: sin esto, un typo en la ruta no rompe el
    // juego pero sí deja el link compartido sin preview, en silencio.
    for (const [, , especificador] of texto.matchAll(META_IMAGEN)) {
      if (!esRutaLocal(especificador)) continue;
      imports += 1;
      const destino = path.resolve(path.dirname(archivo), especificador);
      if (!existeConCapitalizacionExacta(destino)) {
        problemas.push(`${relativo}: <meta ... content="${especificador}"> (imagen social) no resuelve en un filesystem case-sensitive`);
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

const pesoKB = pesoDe(DIST) / 1024;

const errores = [
  ...problemas,
  ...conGuionBajo.map((f) => `${f}: empieza con "_" y Jekyll lo ignora (hace falta .nojekyll)`),
  ...(distintas.length > 0
    ? [`el build cambió el juego en ${distintas.length} de ${carreras} carreras:\n${distintas.join('\n')}`]
    : []),
  ...(pesoKB > PESO_MAXIMO_KB
    ? [`dist/ pesa ${pesoKB.toFixed(0)} KB, por encima del techo declarado de ${PESO_MAXIMO_KB} KB (PLAN.md §P.6)`]
    : [])
];

console.log(`\n  peso           ${pesoKB.toFixed(0)} KB (techo ${PESO_MAXIMO_KB} KB)\n`);

if (errores.length > 0) {
  console.error(`FALLÓ el build (${errores.length}):`);
  for (const error of errores) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log('Build OK. `dist/` es lo que se sube: nada más, nada menos.');
