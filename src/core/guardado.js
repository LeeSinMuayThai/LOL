// El guardado de la carrera (fase T8, PLAN.md "T8 — La página como
// página", P.2). Puro: serializa y deserializa, nada de `localStorage` acá
// — eso vive en `src/ui/almacenamiento.js`, para que este archivo (y
// `validate.js`/`simulate.js`, que lo pueden importar transitivamente)
// sigan corriendo en Node sin tocar el navegador.
//
// `VERSION` viaja adentro del JSON. Si algún día `state` cambia de forma
// (un campo nuevo, uno que se borra), un guardado viejo con una versión
// distinta se descarta entero en vez de cargarse a medias — un estado que
// ningún sistema actual entiende es peor que no guardar nada (la carrera
// simplemente arranca de cero, con un aviso, en vez de romper en un lugar
// impredecible tres splits después).
//
// Historia: 2 (K0-B, el check de forma de `validate.js`) · 3 (K1-A, D76:
// `registro.porOrg[].splitsPorTier`, `liga`/`tier` en cada título, `liga` en
// cada internacional, `state.desafio` y `tarjeta.puntaje` — un guardado a
// mitad de carrera tendría títulos sin liga) · 4 (K2a: `nivelJugador` y
// `nivelCompaneros` en `career.temporada`, `fuerzaInicial` en `serie`, y
// `formato`/`fuerzaInicial`/`fuerzaRival` en el log de cierre de cada serie —
// lo que el motor usó, expuesto para el instrumento de `src/dev/simulate.js`).
export const VERSION = 4;

export function serializar(state, rng, rngUi) {
  return JSON.stringify({
    version: VERSION,
    guardadoEn: Date.now(),
    seed: state.seed,
    rngEstado: rng.estado(),
    rngUiEstado: rngUi ? rngUi.estado() : null,
    state
  });
}

// Devuelve `null` si el JSON está corrupto o es de otra versión — nunca
// tira: quien llama decide qué hacer con "no hay nada que continuar".
export function deserializar(json) {
  let datos;
  try {
    datos = JSON.parse(json);
  } catch {
    return null;
  }
  if (!datos || typeof datos !== 'object' || datos.version !== VERSION) {
    return null;
  }
  if (typeof datos.rngEstado !== 'number' || !datos.state) {
    return null;
  }
  return {
    seed: datos.seed,
    rngEstado: datos.rngEstado,
    rngUiEstado: typeof datos.rngUiEstado === 'number' ? datos.rngUiEstado : null,
    state: datos.state,
    guardadoEn: datos.guardadoEn ?? null
  };
}
