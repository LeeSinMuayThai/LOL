import { BALANCE } from '../data/balance.js';

// Estrategias de jugador para la simulacion masiva. Existen porque medir una
// sola forma de jugar no dice nada del balance: el criterio de CONCEPTO §11
// ("si mas del 25% termina en el mismo arquetipo, el balance esta roto") es
// sobre la poblacion de partidas, y la poblacion incluye al que se juega la
// vida al ranked y al que se cuida de mas.
//
// Todas corren EXACTAMENTE el mismo pipeline que el navegador: solo cambian
// que contestan cuando el motor pide una decision.

function repartoTodoARanked(decision) {
  const reparto = Object.fromEntries(decision.destinos.map((destino) => [destino.id, 0]));
  reparto.ranked = decision.bloques + decision.extraMax;
  return { reparto, extra: decision.extraMax };
}

function repartoPrudente(state, decision) {
  const a = BALANCE.amateur;
  const reparto = Object.fromEntries(decision.destinos.map((destino) => [destino.id, 0]));

  // Primero tapa los agujeros: colegio hasta salir de la banda de aviso,
  // familia y sueño hasta un piso digno. Lo que sobra, ranked.
  const faltaEstudio = Math.max(0, a.avisoUmbral - state.player.studies);
  const faltaFamilia = Math.max(0, a.trustReferencia - state.player.familyTrust);
  const faltaSueno = Math.max(0, a.autoSuenoObjetivo - state.player.sleep);

  let restantes = decision.bloques;
  const asignar = (destino, bloques) => {
    const usados = Math.min(restantes, Math.ceil(bloques));
    reparto[destino] += usados;
    restantes -= usados;
  };

  asignar('estudiar', faltaEstudio / a.estudioPorBloque);
  asignar('familia', faltaFamilia / a.familiaPorBloque);
  asignar('dormir', faltaSueno / a.suenoPorBloque);
  reparto.ranked += restantes;

  return { reparto, extra: 0 };
}

export const ESTRATEGIAS = {
  // Reacciona a las barras que tiene en rojo. Es el criterio que vive en cada
  // sistema (`resolverAuto`) y el mas parecido a alguien jugando con cabeza.
  equilibrado: null,

  // Se juega la carrera entera al ranked y le roba al sueño todo lo que puede.
  ranked: (sistema, state, decision, rng) => (
    decision.tipo === 'reparto' ? repartoTodoARanked(decision) : sistema.resolverAuto(state, decision, rng)
  ),

  // Cuida el colegio, la familia y el sueño antes que el LP.
  prudente: (sistema, state, decision, rng) => (
    decision.tipo === 'reparto' ? repartoPrudente(state, decision) : sistema.resolverAuto(state, decision, rng)
  )
};

export const NOMBRES_ESTRATEGIA = Object.keys(ESTRATEGIAS);
