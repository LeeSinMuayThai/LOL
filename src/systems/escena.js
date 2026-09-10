// 9M-lite / 9ML.a (PLAN.md): otras ligas vivas — digest anual.
//
// Se para justo después de `edadCierre` en el registro (regla invariable 6):
// así el digest se ve el mismo split en que la carrera del jugador resume su
// año, y si `edadCierre` pausó por un evento de cierre, `resolverDecision`
// retoma exactamente en este sistema — nunca se salta un año.
//
// Early-return SIN tocar `rng` en cualquier split que no sea de cierre de
// edad (regla de proceso 10): el 2 de cada 3 splits que no cierran año no le
// cuestan ni un `rng()` a este sistema.

import { crearLog } from '../core/log.js';
import { weightedPick, sample } from '../core/rng.js';
import { BALANCE } from '../data/balance.js';
import { esCierreDeEdad } from './edadCierre.js';
import {
  ligasParaDigest, todosLosOrgsTier1, lineaDeLiga, lineaDeInternacional, construirEscenaAnual
} from '../core/escena.js';

export const id = 'escena';

function resolverFinal(orgs, rng) {
  const campeon = weightedPick(orgs, (org) => org.fuerza, rng);
  const restantes = orgs.filter((org) => org !== campeon);
  const subcampeon = weightedPick(restantes, (org) => org.fuerza, rng);
  const marcador = weightedPick(BALANCE.escena.marcadoresBo5, () => 1, rng);
  return { campeon, subcampeon, marcador };
}

export function aplicar(state, rng) {
  if (!esCierreDeEdad(state)) {
    return { state, logs: [] };
  }

  const anio = state.calendario.anio;
  const candidatas = ligasParaDigest(state);
  const ligasElegidas = sample(candidatas, Math.min(BALANCE.escena.ligasEnDigest, candidatas.length), rng);

  // Las finales que se narran: se resuelven con `rng` como siempre. Se guarda
  // el resultado por liga para que `construirEscenaAnual` no lo vuelva a tirar.
  const narradas = ligasElegidas.map((liga) => ({ liga, ...resolverFinal(liga.orgs, rng) }));
  const logs = narradas.map(({ liga, campeon, subcampeon, marcador }) =>
    crearLog('escena', lineaDeLiga(liga, campeon, subcampeon, marcador), { tecnico: false }));

  const campeonMundial = weightedPick(todosLosOrgsTier1(state), (org) => org.fuerza, rng);
  logs.push(crearLog('escena', lineaDeInternacional(anio, campeonMundial), { tecnico: false }));

  // Fase 9W: persistir el resultado del año para el ranking mundial. El
  // digest sólo narra 4 ligas; el ranking necesita las 6 (más el internacional)
  // todos los años — `construirEscenaAnual` completa el hueco sin tocar `rng`.
  const escenaAnual = construirEscenaAnual(state, anio, narradas, campeonMundial);

  return {
    state: {
      ...state,
      mundo: { ...state.mundo, escenaAnual, escenaAnualPrevia: state.mundo.escenaAnual }
    },
    logs
  };
}
