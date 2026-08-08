import { BALANCE } from '../data/balance.js';

// Estrategias de jugador para la simulacion masiva. Existen porque medir una
// sola forma de jugar no dice nada del balance: el criterio de CONCEPTO §11
// ("si mas del 25% termina en el mismo arquetipo, el balance esta roto") es
// sobre la poblacion de partidas, y la poblacion incluye al que se juega la
// vida al ranked y al que se cuida de mas.
//
// Todas corren EXACTAMENTE el mismo pipeline que el navegador: solo cambian
// que contestan cuando el motor pide una decision. Desde que las decisiones de
// reparto son rutinas narrativas, "elegir una estrategia" es elegir cual de las
// rutinas ofrecidas tomar.

function esDecisionDeRutina(decision) {
  return decision.datos?.rutinas?.length > 0;
}

function mejorRutina(decision, puntuar) {
  const elegida = decision.datos.rutinas.reduce((mejor, rutina) => (
    puntuar(rutina) > puntuar(mejor) ? rutina : mejor
  ));
  return { opcionId: elegida.id };
}

// Cuanto le falta a cada barra para estar tranquila. Se usa para elegir la
// rutina que mejor tapa los agujeros.
function deficits(state) {
  const a = BALANCE.amateur;
  return {
    estudiar: Math.max(0, a.avisoUmbral - state.player.studies),
    familia: Math.max(0, a.trustReferencia - state.player.familyTrust),
    dormir: Math.max(0, a.autoSuenoObjetivo - state.player.sleep),
    ranked: 0
  };
}

export const ESTRATEGIAS = {
  // Reacciona a las barras que tiene en rojo. Es el criterio que vive en cada
  // sistema (`resolverAuto`) y el mas parecido a alguien jugando con cabeza.
  equilibrado: null,

  // Se juega la carrera entera al ranked: siempre la rutina mas agresiva.
  ranked: (sistema, state, decision, rng) => (
    esDecisionDeRutina(decision)
      ? mejorRutina(decision, (rutina) => (rutina.reparto.ranked ?? 0) + rutina.extra * 2)
      : sistema.resolverAuto(state, decision, rng)
  ),

  // Cuida el colegio, la familia y el sueño antes que el LP.
  prudente: (sistema, state, decision, rng) => {
    if (!esDecisionDeRutina(decision)) {
      return sistema.resolverAuto(state, decision, rng);
    }
    const falta = deficits(state);
    // Tapa los agujeros primero, y con lo que sobra grindea: sin ese desempate
    // el prudente nunca juega ranked y no lo ficha nadie.
    return mejorRutina(decision, (rutina) => (
      Object.entries(rutina.reparto).reduce((suma, [destino, bloques]) => suma + bloques * (falta[destino] ?? 0), 0) * 10
      + (rutina.reparto.ranked ?? 0)
      - rutina.extra * BALANCE.amateur.suenoPorBloqueRobado
    ));
  }
};

export const NOMBRES_ESTRATEGIA = Object.keys(ESTRATEGIAS);
