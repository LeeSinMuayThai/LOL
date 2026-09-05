import { weightedPick } from './rng.js';
import { campeonesEnMeta, deseoPorCampeon, factorDeCampeon } from './ajusteMeta.js';
import { campeonesDisponibles, entradaDePool } from './pool.js';
import { rendimientoBase, fuerzaDelEquipo } from './fuerza.js';
import { probabilidadDeGanar } from './numeros.js';
import { BALANCE } from '../data/balance.js';

// La mecánica de la serie de playoffs (fase 4): Bo5 con Fearless draft, jugada
// mapa a mapa. Todo lo que vive acá es puro (salvo lo que recibe `rng` por
// parámetro): `systems/serie.js` es el único que muta estado.
//
// Simplificación deliberada, documentada en PROGRESO: las 6 ligas tier 1 usan
// doble eliminación real en 2026 (hay bracket de perdedores); acá se modela
// eliminación simple de 6 clasificados con bye para los 2 mejores sembrados,
// porque el motor solo simula TU camino, nunca el resto del bracket.

// Misma fórmula que usa rendimiento.js para saber si el split que está por
// cerrar es el último de la edad (regular season) — la comparten para no
// duplicarla y que las dos lecturas de "cierre de temporada" no diverjan.
export function esCierreDeTemporada(splitCount) {
  return (splitCount + 1) % BALANCE.edad.splitsPorEdad === 0;
}

export function calificaAPlayoffs(liga, posicion) {
  return Boolean(liga?.formatoPlayoffs) && posicion <= liga.formatoPlayoffs.clasifican;
}

export function calificaAInternacional(liga, posicion) {
  return posicion <= (liga?.cuposInternacionales ?? 0);
}

// El bracket es de eliminación simple: los dos mejores sembrados saltan
// directo a semifinal, el resto arranca en cuartos.
export function rondaInicial(posicion, formatoPlayoffs) {
  if (posicion <= formatoPlayoffs.byes) {
    return 'semis';
  }
  if (posicion <= formatoPlayoffs.clasifican) {
    return 'cuartos';
  }
  return null;
}

const ORDEN_RONDAS = ['cuartos', 'semis', 'final'];

export function siguienteRonda(ronda) {
  const indice = ORDEN_RONDAS.indexOf(ronda);
  if (indice < 0 || indice === ORDEN_RONDAS.length - 1) {
    return null;
  }
  return ORDEN_RONDAS[indice + 1];
}

export function etiquetaDeRonda(ronda) {
  const etiquetas = { cuartos: 'Cuartos de final', semis: 'Semifinal', final: 'La final', internacional: 'El internacional' };
  return etiquetas[ronda] ?? ronda;
}

// El rival de la ronda. Doméstico: otra org de la misma liga, pesada por
// fuerza (más fuerte, más probable que sea quien te toque en una fase alta).
// Internacional: una org de OTRA liga tier 1, pesada por el prestigio de esa
// liga y después por la fuerza de la org — nombra un rival real de otra
// región, consistente con CLAUDE.md (ligas y orgs reales están permitidas).
export function generarRival(state, ronda, rng) {
  if (ronda === 'internacional') {
    const propia = state.career.liga;
    const otrasLigas = state.mundo.ligas.filter((liga) => liga.tier === 1 && liga.id !== propia);
    const liga = weightedPick(otrasLigas, (candidata) => candidata.prestigio, rng);
    const org = weightedPick(liga.orgs, (candidata) => candidata.fuerza, rng);
    return { org: org.nombre, fuerza: org.fuerza };
  }

  const liga = state.mundo.ligas.find((candidata) => candidata.id === state.career.liga);
  const rivales = liga.orgs.filter((org) => org.nombre !== state.career.currentOrg);
  const org = weightedPick(rivales, (candidata) => candidata.fuerza, rng);
  return { org: org.nombre, fuerza: org.fuerza };
}

// --- Fearless draft ---

export function disponiblesDelPool(pool, quemados) {
  return pool.filter((campeon) => !quemados.includes(campeon.name));
}

// El rival no sortea al azar: quema campeones tomados del meta (4.5). Si el
// top del meta ya está todo quemado, extiende la búsqueda a todo el rol
// ordenado por afinidad — siempre hay más campeones de un rol que mapas en
// una serie, así que esto nunca se queda sin opciones.
export function elegirCampeonRival(state, quemados, rng) {
  const delRol = campeonesDisponibles(state, state.player.role);
  const top = campeonesEnMeta(state.meta.weights, delRol, delRol.length).filter(
    (campeon) => !quemados.includes(campeon.name)
  );

  if (top.length === 0) {
    return null;
  }
  // Entre los mejores no quemados, pesa hacia el tope del meta sin ser
  // siempre el mismo: reusa el mismo criterio de deseo que el draft del motor.
  return weightedPick(top.slice(0, 3), (campeon) => deseoPorCampeon(campeon, state.meta.weights), rng).name;
}

// Cuando el Fearless deja el pool en cero, te toca un comodín fuera del pool
// con maestría mínima (4.5): "el castigo del pool angosto".
export function campeonComodin(state, quemados, rng) {
  const delRol = campeonesDisponibles(state, state.player.role);
  const usables = delRol.filter((campeon) => !quemados.includes(campeon.name));
  const elegido = weightedPick(usables, (campeon) => deseoPorCampeon(entradaDePool(campeon, BALANCE.serie.maestriaComodin), state.meta.weights), rng);
  return entradaDePool(elegido, BALANCE.serie.maestriaComodin);
}

export function necesitaGanarPara(formato) {
  return Math.ceil(formato / 2);
}

// El mapa que puede cerrar la serie para cualquiera de los dos lados. En un
// Bo5 2-2 esto ya es cierto (necesitaGanarPara - 1 = 2), así que cubre "mapa 5"
// sin necesitar un caso especial contando mapas.
export function esMapaDecisivo(marcador, formato) {
  const punto = necesitaGanarPara(formato) - 1;
  return marcador[0] === punto || marcador[1] === punto;
}

// Fase 9R4b: el mapa de DESEMPATE — el último posible de la serie, con los dos
// equipos en punto de partido (2-2 en un Bo5, 1-1 en un Bo3). Es "el mapa 5"
// del que habla PLAN.md §9R.4, y no es lo mismo que `esMapaDecisivo`: ese es
// cualquier mapa que PUEDE cerrar la serie, incluido el 2-0 de un barrido, que
// según la regla 4 de §4.6 justamente no merece minijuego.
export function esMapaDeDesempate(marcador, formato) {
  const punto = necesitaGanarPara(formato) - 1;
  return marcador[0] === punto && marcador[1] === punto;
}

export function serieTerminada(marcador, formato) {
  const necesarias = necesitaGanarPara(formato);
  return marcador[0] >= necesarias || marcador[1] >= necesarias;
}

// La regla de 4.3, resuelta sin ambigüedad (ver PROGRESO): con 0 disponibles,
// comodín automático (no llega acá); con 1, no hay elección; con exactamente 2,
// siempre para (pool exhausto, cada pick pesa). Con 3 o más, el motor elige
// solo salvo que el mejor campeón mueva la probabilidad de ganar el mapa más
// que `puntosEnJuegoParaPreguntar` respecto del segundo; el mapa decisivo baja
// ese umbral. Fase 9Rd: antes el criterio era un ratio de `deseoPorCampeon`
// (maestría²) contra `dominanciaClara`, que no medía el resultado del mapa.
export function decisionDeDraft(state, disponibles, esDecisivo) {
  if (disponibles.length === 1) {
    return { pausa: false, elegido: disponibles[0] };
  }
  if (disponibles.length === 2) {
    return { pausa: true };
  }

  // Fase 9Rc/9Rd: "el mejor" se ordena con `factorDeCampeon` —el mismo criterio
  // con el que el mapa se resuelve—, no con `deseoPorCampeon` (maestría²).
  const [mejor, segundo] = ordenarPorFactor(disponibles, state.meta.weights);
  const umbral = esDecisivo
    ? BALANCE.serie.puntosEnJuegoParaPreguntarDecisivo
    : BALANCE.serie.puntosEnJuegoParaPreguntar;

  return puntosEnJuegoDeMapa(state, mejor, segundo) >= umbral
    ? { pausa: true }
    : { pausa: false, elegido: mejor };
}

function ordenarPorFactor(campeones, weights) {
  return [...campeones].sort(
    (a, b) => factorDeCampeon(b, weights) - factorDeCampeon(a, weights)
  );
}

// Cuánta probabilidad de ganar ESTE mapa te da un campeón: `rendimientoBase`
// con ese campeón (determinista, sin el gauss de ruido) → `fuerzaDelEquipo` →
// logística contra la fuerza del rival, con los mismos σ que `finalizarMapa`.
function probabilidadConCampeon(state, campeon) {
  const rb = rendimientoBase({ ...state, player: { ...state.player, campeonDelSplit: campeon.name } });
  const fp = fuerzaDelEquipo(state, rb);
  return probabilidadDeGanar(fp, state.serie.rival.fuerza, BALANCE.serie.ruidoMapa, BALANCE.serie.ruidoRivalSerie);
}

// P(mejor) − P(segundo). ≥ 0 siempre: más `factorDeCampeon` ⇒ más
// `rendimientoBase` ⇒ más fuerza propia ⇒ más probabilidad.
function puntosEnJuegoDeMapa(state, mejor, segundo) {
  return probabilidadConCampeon(state, mejor) - probabilidadConCampeon(state, segundo);
}

// "Mapa cerrado" (regla 4 de 4.6): el rendimiento base del jugador y la fuerza
// del rival quedaron a un margen chico. Condición necesaria para un minijuego.
//
// Fase 9R4b: el margen entra por parámetro porque el mapa que CIERRA la serie
// usa uno mucho más ancho (`margenMapaCerradoDecisivo`). "El Barón de un mapa 5"
// (PLAN.md §9R.4) no se puede quedar sin jugarse porque el mapa venía diez
// puntos torcido: es el mapa que define, y ahí la jugada existe casi siempre.
export function esMapaCerrado(rendimientoBase, fuerzaRival, margen = BALANCE.serie.margenMapaCerrado) {
  return Math.abs(rendimientoBase - fuerzaRival) <= margen;
}

// El minijuego "la_llamada" depende de shotcalling, pero una buena llamada con
// jerarquía baja no se ejecuta igual (regla textual de 4.6): el impacto sobre
// el rendimiento se amortigua fuerte por debajo del umbral.
export function factorJerarquiaEnLlamada(jerarquia) {
  return jerarquia >= BALANCE.serie.jerarquiaMinimaParaSeguirLlamada ? 1 : BALANCE.serie.factorLlamadaSinJerarquia;
}
