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
  // K4-D movió el stream (la preparación del receso se sortea al empezar el año, en la parada del mercado): el silencio de
  // una franquicia, un evento de ~1 en 1500 carreras, apareció una vez. La invariante no cambió; la muestra sí.
  {
    check: 'El mercado lee tu nivel: el silencio es para los que están por debajo, no para una franquicia (fase 9R0e)',
    bloque: 'B',
    medido: '1 pretemporada de un jugador claramente por encima de su liga sin ofertas (1500 carreras, check)',
    banda: 'tope 0 pretemporadas sin ofertas por encima de la liga',
    commit: 'K4',
    rebasea: 'K4c',
    porque: 'corrimiento del stream de K4-D (T1): evento raro, la muestra cambió; K4c lo re-mide con el stream final'
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
