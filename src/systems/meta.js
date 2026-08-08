import { BALANCE } from '../data/balance.js';
import { gauss, chance, pick } from '../core/rng.js';
import { clamp } from '../core/numeros.js';
import { campeonesEnMeta, campeonesMuertos } from '../core/ajusteMeta.js';
import { campeonesDisponibles, campeonesPorDebutar, principalDelPool } from '../core/pool.js';
import { crearLog } from '../core/log.js';

export const id = 'meta';

// Cada split es un parche. Casi siempre el meta se mueve poco: reacomoda pesos
// entre arquetipos sin volantazos. Cada tanto se sacude entero, y ahi es donde
// un pool angosto se queda sin nada que jugar.
function moverPesos(state, delta, rng) {
  const { pesoMinimo, pesoMaximo, derivaMedia } = BALANCE.meta;

  return Object.fromEntries(
    Object.entries(state.meta.weights).map(([tag, peso]) => [
      tag,
      clamp(peso + gauss(derivaMedia, delta, rng), pesoMinimo, pesoMaximo)
    ])
  );
}

// El parche se cuenta con nombres, no con arquetipos.
//
// Antes decia "el meta se mueve despacio hacia los magos de control": correcto,
// y completamente abstracto. Un jugador no piensa en arquetipos, piensa "este
// parche manda Sejuani". Nombrar el meta es lo que convierte el vector de pesos
// en algo que se siente, y es lo que hace que "tu Lee Sin quedo a contramano"
// se pueda escribir.
// Tu main quedó fuera del meta con ESTE parche. Se compara antes contra después
// a propósito: si el main ya venía muerto, no es noticia — decirlo cada parche
// durante diez splits es ruido, no información.
function mainReciénMuerto(antes, despues) {
  const pool = despues.player.championPool;
  if (pool.length === 0) {
    return null;
  }
  const principal = principalDelPool(pool);
  const estaba = campeonesMuertos([principal], antes.meta.weights, campeonesDisponibles(antes)).length > 0;
  const esta = campeonesMuertos([principal], despues.meta.weights, campeonesDisponibles(despues)).length > 0;
  return !estaba && esta ? principal.name : null;
}

function textoDelParche(state, sacudon, mainMuerto) {
  const patch = state.meta.patch;
  const arriba = campeonesEnMeta(state.meta.weights, campeonesDisponibles(state)).map((campeon) => campeon.name);
  const manda = arriba.length >= 2 ? `${arriba[0]} y ${arriba[1]}` : arriba[0];

  const cabeza = sacudon
    ? `Parche ${patch}: volantazo de balance. Se dio vuelta todo y ahora manda ${manda}.`
    : `Parche ${patch}: se mueve despacio hacia ${manda}.`;

  return mainMuerto ? `${cabeza} Tu ${mainMuerto} quedó a contramano de un día para el otro.` : cabeza;
}

// Cada tanto sale un campeon nuevo. No es cosmetico: es la decision que pediste
// —"salió un champ nuevo y jugás en dos semanas: ¿lo practicás a full o pulís
// los de ahora?"— y sin que exista el campeon no hay decision que tomar.
//
// Solo debutan campeones de TU rol: son los unicos que cambian algo.
function debutarCampeon(state, rng) {
  const candidatos = campeonesPorDebutar(state);
  if (candidatos.length === 0 || !chance(BALANCE.meta.probCampeonNuevo, rng)) {
    return { state, log: null };
  }

  const nuevo = pick(candidatos, rng);
  const debut = { nombre: nuevo.name, split: state.player.splitCount };

  return {
    state: {
      ...state,
      mundo: { ...state.mundo, campeonesDebutados: [...state.mundo.campeonesDebutados, debut] }
    },
    log: crearLog('meta', `Sale ${nuevo.name}. Todavía nadie sabe jugarlo y en dos semanas va a estar en todos lados.`)
  };
}

export function aplicar(state, rng) {
  const { probSacudon, sacudonDelta, maxDelta } = BALANCE.meta;
  const sacudon = chance(probSacudon, rng);

  const weights = moverPesos(state, sacudon ? sacudonDelta : maxDelta, rng);
  const conPesos = { ...state, meta: { ...state.meta, patch: state.meta.patch + 1, weights } };

  const logs = [crearLog('meta', textoDelParche(conPesos, sacudon, mainReciénMuerto(state, conPesos)))];

  const { state: nextState, log } = debutarCampeon(conPesos, rng);
  if (log) {
    logs.push(log);
  }

  return { state: nextState, logs };
}
