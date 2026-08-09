import { BALANCE } from '../data/balance.js';
import { ROLES } from '../data/roles.js';

// La ficha de carrera (fase 8, PLAN.md §8.3): lo que la UI va a pintar en la
// tarjeta permanente. Puro, sin RNG — se puede llamar en cualquier momento
// sin mover el balance.
//
// En esta primera mitad de la fase (8a, "el registro acumula") solo vive acá
// el número único: el resto de la ficha (deltas de stats, bandas de
// jerarquia/arraigo, estado internacional) se agrega en 8b, junto con la
// pantalla que los consume — no hace falta antes.

// El NIVEL 0-100 (H7 de PLAN.md): la MISMA suma ponderada por rol que ya usa
// `calcularRendimiento` (systems/rendimiento.js) ANTES de aplicarle meta,
// maestría, sinergia, jerarquía y ruido — el "cuánto rendís en limpio", sin
// el contexto del split. Se extrae acá para que rendimiento.js la importe en
// vez de mantener dos copias de la misma fórmula (regla de proceso 2: la
// fórmula no se reescribe ni se retunea, solo se expone).
export function nivelDelJugador(state) {
  const { pesos } = ROLES[state.player.role];
  return Object.entries(pesos).reduce((suma, [stat, peso]) => suma + state.player.stats[stat] * peso, 0);
}

export function bandaDeNivel(nivel) {
  const { nivelBandas } = BALANCE.ficha;
  if (nivel <= nivelBandas.prospecto) {
    return 'prospecto';
  }
  if (nivel <= nivelBandas.titular) {
    return 'titular';
  }
  if (nivel <= nivelBandas.elite) {
    return 'elite';
  }
  return 'clase_mundial';
}
