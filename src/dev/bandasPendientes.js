// El registro de checks de BANDA fuera de banda dentro de un bloque de corrimiento abierto
// (PLAN.md §K.4, "Cómo se anota un check fuera de banda dentro de un bloque").
//
// Dentro de un bloque (A — el nivel: K2, K3; B — el ritmo: K4; C — el mundo: K5) un cambio estructural puede
// sacar de banda un check que protege "lo que el juego hace hoy" (regla 17). Ese check no se re-basea en el acto
// (regla 2 + T6): se anota acá con su valor medido, su banda, el commit que lo sacó y la subfase de calibración que
// lo re-basea. `validate.js` lo reporta PENDIENTE (no FAIL, no rompe la corrida) mientras falle.
//
// Solo entran checks de BANDA. Uno estructural, de determinismo o de pureza que falla es un bug y se arregla.
//
// Tres checks custodian este registro (al final de `validate.js`):
//  1. una entrada cuyo check PASA es un error: hay que borrarla (el registro no acumula basura);
//  2. una entrada de un bloque CERRADO es un error: la calibración de su bloque (K3c, K4c, K5c) tiene que vaciarlo;
//  3. una entrada sin valor medido, sin banda, sin commit o sin la subfase que la re-basea es un error.
// Las funciones de abajo son puras para que esos tres checks se puedan probar con registros sintéticos.

// Los bloques de corrimiento (§K.4): qué subfases tiene cada uno, con qué calibración cierra y si ya cerró. Un bloque
// se marca `cerrado: true` en el commit de su calibración, que es el que vacía sus entradas.
export const BLOQUES_DE_CORRIMIENTO = {
  A: { nombre: 'el nivel', subfases: ['K2', 'K3'], cierraCon: 'K3c', cerrado: true },
  B: { nombre: 'el ritmo', subfases: ['K4'], cierraCon: 'K4c', cerrado: false },
  C: { nombre: 'el mundo', subfases: ['K5'], cierraCon: 'K5c', cerrado: false }
};

// Una entrada por check de banda fuera de banda:
//   check   — el nombre EXACTO con el que `validate.js` lo registra (un nombre que no existe es un error);
//   bloque  — 'A', 'B' o 'C';
//   medido  — el valor que dio, en texto (con la unidad y la muestra);
//   banda   — la banda que exige el check;
//   commit  — la subfase cuyo commit lo sacó de banda (su mensaje empieza con `FASE K, <subfase>:`);
//   rebasea — la calibración que lo re-basea (tiene que ser el `cierraCon` de su bloque);
//   porque  — opcional: por qué salió de banda.
export const BANDAS_PENDIENTES = [
  // K4-B borró el check "Mediana de decisiones de draft por serie ∈ [0, 1] y ≥28% de series sin ningún draft" (no hay
  // más draft mapa a mapa; regla 17, ver validate.js) y con él su entrada de acá.
  // K4-B: el rival también quema campeones con el Fearless (su fuerza de mapa se degrada como la tuya) y el Bo5 conjunto
  // volvió a su banda (criterio 800 × 60): la entrada "K3c meta Bo5 favorito claro (conjunto) ∈ [75, 85]" se borró.
  // K4 (integración) había sacado de banda por arriba el Bo5 del favorito claro, los dos checks (jugador 86,6%, conjunto
  // 86,4%). Con K5 integrado volvieron a su banda (criterio 800 × 60: jugador 84%, rival 80,1%, conjunto 82,9%) y sus dos
  // entradas se borraron (custodio 1).
  // K4 (revisión 2): el reparto del banco de mecánicas es una banda del ritmo. Con K4 los minijuegos de mapa salen solo
  // en el clímax (el mapa decisivo) y la prensa tras una final o un escándalo, así que la mezcla se corrió entera.
  {
    check: 'El banco de mecánicas se reparte: ninguna se lleva la carrera (9R4c)',
    bloque: 'B',
    medido: '51% rueda_de_prensa con K5 integrado (300 carreras × 60 splits; con K4, 48%: 1384 de 2874); la_prueba 20% en K4; last_hit, la_vision y el_kite (solo mapa_cerrado) no salen nunca',
    banda: '≤ 35%',
    commit: 'K4',
    rebasea: 'K4c',
    porque: 'K4 dejó los minijuegos solo en el clímax y la prensa tras finales/escándalos; K4c re-balancea el banco (incluidas las tres mecánicas que solo tenían momento mapa_cerrado)'
  },
  // K4c-S: la prueba decide el contrato. Con P(firmar) < 1 (criterio: ~0,83 con el resultado 0,85 de su respuesta) una parte de las
  // carreras tarda más en llegar a pro (la firma amateur se posterga) o pierde una oferta del mercado: menos splits pro en 60, menos
  // bifurcaciones. Medido con las mismas 40 carreras (seeds 4400-4439): 4,15 con la prueba y 5,28 sin ella (correrCarrera de
  // simulate.js: 4,55 y 5,28); con las seeds 1-40, 5,75 contra 5,90. Es ruido de muestra y efecto real mezclados: lo decide K4c.
  {
    check: 'K4-C2 las bifurcaciones frenan entre 4,5 y 7,5 veces por carrera (criterio, 40 carreras × 60; la meta es 5-7)',
    bloque: 'B',
    medido: '4,15 bifurcaciones por carrera (166 en 40 carreras, seeds 4400-4439; sin K4c-S pasaba en banda: 5,28 con correrCarrera)',
    banda: '[4,5, 7,5]',
    commit: 'K4c-S',
    rebasea: 'K4c',
    porque: 'la prueba del tryout decide el contrato (P(firmar) 0,15 / 0,55 / 0,95 de arranque): más carreras postergan la firma o pierden una oferta y juegan menos splits pro; K4c calibra las tres constantes y re-mide'
  },
  // K5 (integración) había sacado de banda el check de D78 de K5-B (LCK 0 splits en 60 carreras coreanas con criterio).
  // La revisión de K5 cambió el calibre de liga a un cuantil bajo por org y congeló los asientos ofrecibles post-mercado:
  // LCK 0 -> 12 splits (1 carrera), LPL 6 -> 33 (4 carreras), 60 × 60, región elegida. La entrada se borró (custodio 1).
  // La longevidad es del bloque C (el mundo). En la integración de K5 dio r = 0,32 justo (el check pide > 0,32); en la
  // revisión, el calibre de liga por cuantil (D78) la llevó a 0,27 y el mundo amateur que renueva contratos NPC a 0,21
  // (medido commit a commit, 1200 carreras).
  {
    check: 'La duración de la carrera correlaciona con el potencial oculto (r > 0.32)',
    bloque: 'C',
    medido: 'r = 0,21 (1200 carreras; integración de K5: 0,32; tras el calibre por cuantil de D78: 0,27; tras la renovación NPC en el mundo amateur: 0,21)',
    banda: 'r > 0,32',
    commit: 'K5',
    rebasea: 'K5c',
    porque: 'K5 movió el mundo (mercado por cuantil de liga, asientos congelados post-mercado, contratos NPC renovados en la etapa amateur): más carreras de potencial medio encuentran asiento; K5c calibra la longevidad del mundo nuevo'
  }
];

// Custodio 1: las entradas cuyo check pasó en esta corrida. `resultados` es un Map nombre → 'ok' | 'fail' |
// 'pendiente' | 'skip'. Con `completo` (la corrida no filtró checks con --solo), una entrada cuyo check no apareció
// también es un problema: un nombre que no matchea nunca falla (trampa T5).
export function entradasQuePasan(registro, resultados, { completo }) {
  const problemas = [];
  for (const entrada of registro) {
    const resultado = resultados.get(entrada.check);
    if (resultado === 'ok') {
      problemas.push(`"${entrada.check}" pasa: ya volvió a su banda, borrá la entrada`);
    } else if (resultado === undefined && completo) {
      problemas.push(`"${entrada.check}" no es el nombre de ningún check de esta corrida`);
    }
  }
  return problemas;
}

// Custodio 2: las entradas de un bloque que ya cerró (o de un bloque que no existe).
export function entradasDeBloquesCerrados(registro, bloques) {
  const problemas = [];
  for (const entrada of registro) {
    const bloque = bloques[entrada.bloque];
    if (!bloque) {
      problemas.push(`"${entrada.check}": bloque desconocido ${JSON.stringify(entrada.bloque)}`);
    } else if (bloque.cerrado) {
      problemas.push(`"${entrada.check}": el bloque ${entrada.bloque} (${bloque.nombre}) ya cerró con ${bloque.cierraCon}; la calibración tenía que re-basearlo`);
    }
  }
  return problemas;
}

const textoNoVacio = (valor) => typeof valor === 'string' && valor.trim() !== '';

// Custodio 3: las entradas incompletas — sin nombre, sin valor medido, sin banda, sin commit, sin la subfase que la
// re-basea, o con una subfase que no es la calibración de su bloque. Una entrada repetida también es un error.
export function entradasIncompletas(registro, bloques) {
  const problemas = [];
  const vistos = new Set();
  for (const entrada of registro) {
    const nombre = entrada?.check;
    for (const campo of ['check', 'bloque', 'medido', 'banda', 'commit', 'rebasea']) {
      if (!textoNoVacio(entrada?.[campo])) {
        problemas.push(`${textoNoVacio(nombre) ? `"${nombre}"` : 'una entrada sin nombre'}: falta "${campo}"`);
      }
    }
    const bloque = bloques[entrada?.bloque];
    if (bloque && textoNoVacio(entrada.rebasea) && entrada.rebasea !== bloque.cierraCon) {
      problemas.push(`"${nombre}": se re-basea en ${entrada.rebasea}, pero su bloque ${entrada.bloque} cierra con ${bloque.cierraCon}`);
    }
    if (textoNoVacio(nombre)) {
      if (vistos.has(nombre)) {
        problemas.push(`"${nombre}" está dos veces`);
      }
      vistos.add(nombre);
    }
  }
  return problemas;
}
