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
// mitad de carrera tendría títulos sin liga) · 4 (revisión de K1:
// `registro.cierresComoNumeroUno`, `flags.splitJugadoSinFila`, `nombre` en las
// ligas, y la forma nueva de `tarjeta.puntaje`: niveles por hechos) · 5 (K2,
// mergeado sobre K1 — K2a y K2b se escribieron en ramas paralelas a K1 y
// usaban 4 y 5 para formas sin los campos de K1; esos números no valen: regla
// "VERSION de guardado entre ramas paralelas" de PLAN.md. K2a: `nivelJugador`
// y `nivelCompaneros` en `career.temporada`, `fuerzaInicial` en `serie`, y
// `formato`/`fuerzaInicial`/`fuerzaRival` en el log de cierre de cada serie —
// lo que el motor usó, expuesto para el instrumento de `src/dev/simulate.js`.
// K2b: `rendimientoBase` y `resultadosPropios` en `career.temporada` — el
// rendimiento del split lo cuentan los partidos — y los compañeros de una liga
// modelada con la forma del plantel vivo; el estado inicial ya trae esos dos
// campos y `flags.sinergiaProyectadaAlFichar`) · 6 (K2d, la previa: la `p` con
// la que se tiró cada mapa y la fecha marcada —con `pSinMomento` y
// `ajustePartido`— en sus logs, y `entradaExtra` en los datos del minijuego de
// un mapa, para que la previa lea el comodín) · 7 (K3-B, los efectos que duran: `player.bonusPermanente`, un campo
// por stat de curva, y `registro.marcas`, lo que cada decisión dejó en las curvas de edad — K3-A puede subirla también:
// la rama que se mergea segunda toma max + 1) · 8 (K4, la integración de K4-B, K4-C y K4-D en un solo número —
// K4-B, la serie como plan: `serie.plan`, `guardado`, `replanUsado`, `rivalJuega`, `rivalJuegaEnMapa` y `sinNadaEnJuego`,
// sin `preSerieUsado`; `career.charlaUsadaEn`; y en el log de cada mapa `rivalJuega`, `plan` y `charla` — K4-C, el perfil:
// `player.perfil`, `flags.categoriasRecientes`, `flags.splitMainMuerto` y `flags.saltosConPrueba` — K4-D, la pretemporada
// en una sola parada: `flags.preparacionDeSplit`, el año cuya preparación ya se resolvió, y `preparacion` —las cartas de
// las rutinas de offseason— en los datos de la decisión del mercado y de la prueba del salto) · 9 (K5-B, la región se
// elige: las ligas del mundo suman LRN y LRS, las tier 2 de LATAM sin primera arriba, con `sinPrimera` y `alimentaA`).
export const VERSION = 9;

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
