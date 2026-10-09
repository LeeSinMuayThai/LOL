// Juega una carrera entera headless, como la juega el navegador pero sin DOM: `avanzarSplitAuto` con el bot `criterio` (o el
// responder que se le pase) y, en paralelo, la contabilidad de la "página" del relato que lleva `src/ui/app.js` (el `desde`, la
// foto del split, el cartel, el cierre del split anterior). Con ella, en cada parada se puede armar el guardado y el marcador
// `lolcs-vista` exactos que el juego escribiría en ese momento.
import { mulberry32 } from '../../../src/core/rng.js';
import { createInitialState } from '../../../src/core/state.js';
import { avanzarSplitAuto } from '../../../src/core/pipeline.js';
import { BALANCE } from '../../../src/data/balance.js';
import { ESTRATEGIAS } from '../../../src/dev/estrategias.js';
import { fotoDeSplit, cierreDeSplit, cartelDePagina } from '../../../src/ui/core/escena.js';

// Igual que `src/ui/app.js` (comenzarCarrera): el rngUi del juego se siembra de la misma seed con esta constante.
const SAL_RNG_UI = 0x9E3779B9;

export function crearRngUi(seed) {
  return mulberry32((seed ^ SAL_RNG_UI) >>> 0);
}

const paginaVacia = () => ({
  desde: 0, fotoInicio: null, fotoAnio: null, cartel: null, cierreFrenado: false, ultimoCierre: null, cierreVisto: false
});

// El marcador que el juego guarda en `lolcs-vista` (`marcadorDeVista`, src/ui/app.js).
export function marcadorDeVista(estado, pagina) {
  return {
    seed: estado.seed,
    inicioDePagina: pagina.desde,
    fotoInicio: pagina.fotoInicio,
    fotoAnio: pagina.fotoAnio,
    cartel: pagina.cartel,
    cierreFrenado: pagina.cierreFrenado,
    ultimoCierre: pagina.ultimoCierre,
    cierreVisto: pagina.cierreVisto,
    logs: estado.logs.length
  };
}

// `alParar({ sistema, state, decision, rng, rngUi, pagina, indiceSplit })`: antes de contestar cada parada (no puede tocar `state`
// ni `rng`). `alCerrarSplit({ antes, despues, pagina, cierre, indiceSplit })`: al volver `avanzarSplitAuto` de un split completo.
export function jugarCarrera(seed, {
  eleccion = null, desafio = null, responder = ESTRATEGIAS.criterio, alParar = null, alCerrarSplit = null, alArrancar = null
} = {}) {
  const rng = mulberry32(seed);
  const rngUi = crearRngUi(seed);
  let state = createInitialState(seed, rng, eleccion, desafio);
  if (alArrancar) {
    alArrancar({ state, rng, rngUi });
  }
  let pagina = paginaVacia();

  for (let indiceSplit = 0; indiceSplit < BALANCE.partida.maxSplitsDeSeguridad && !state.terminado; indiceSplit += 1) {
    const antes = state;
    // abrirPagina (src/ui/app.js)
    const fotoInicio = fotoDeSplit(antes);
    const cartel = cartelDePagina(antes);
    pagina = {
      desde: antes.logs.length,
      fotoInicio,
      fotoAnio: cartel?.nuevoAnio ? fotoInicio : pagina.fotoAnio,
      cartel,
      cierreFrenado: false,
      ultimoCierre: pagina.ultimoCierre,
      cierreVisto: pagina.cierreVisto
    };

    const envoltorio = (sistema, st, decision, rngLocal) => {
      // reproducirLlamada: la parada de `edadCierre` ES el momento del año.
      if (st.pendiente?.sistemaId === 'edadCierre') {
        pagina.cierreFrenado = true;
      }
      if (alParar) {
        alParar({ sistema, state: st, decision, rng: rngLocal, rngUi, pagina, indiceSplit });
      }
      return responder(sistema, st, decision, rngLocal);
    };

    state = avanzarSplitAuto(state, rng, envoltorio).state;

    let cierre = null;
    if (!state.pendiente && !state.terminado) {
      cierre = cierreDeSplit(pagina.fotoInicio, state, { cierreFrenado: pagina.cierreFrenado, fotoAnio: pagina.fotoAnio });
      pagina.ultimoCierre = cierre;
      pagina.cierreVisto = true;
    }
    if (alCerrarSplit) {
      alCerrarSplit({ antes, despues: state, pagina, cierre, indiceSplit, rng, rngUi });
    }
  }
  return { state, rng, rngUi };
}
