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
import { ligasParaDigest, todosLosOrgsTier1, lineaDeLiga, lineaDeInternacional } from '../core/escena.js';

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

  const candidatas = ligasParaDigest(state);
  const ligasElegidas = sample(candidatas, Math.min(BALANCE.escena.ligasEnDigest, candidatas.length), rng);

  const logs = ligasElegidas.map((liga) => {
    const { campeon, subcampeon, marcador } = resolverFinal(liga.orgs, rng);
    return crearLog('escena', lineaDeLiga(liga, campeon, subcampeon, marcador), { tecnico: false });
  });

  const campeonMundial = weightedPick(todosLosOrgsTier1(state), (org) => org.fuerza, rng);
  logs.push(crearLog('escena', lineaDeInternacional(state.calendario.anio, campeonMundial), { tecnico: false }));

  return { state, logs };
}
