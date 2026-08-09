import { BALANCE } from '../data/balance.js';
import { gauss, chance, pick } from '../core/rng.js';
import { clamp } from '../core/numeros.js';
import { tierListDeRol, saltosDeTierPropios } from '../core/regimen.js';
import { campeonesPorDebutar } from '../core/pool.js';
import { crearLog } from '../core/log.js';
import { ARQUETIPOS } from '../data/meta-tags.js';
import METAS from '../data/metas.json' with { type: 'json' };

export const id = 'meta';

// El meta con nombre (fase 6): reemplaza el random walk de nueve pesos por un
// régimen de `data/metas.json` que los fija. El cambio de régimen es una
// noticia, no una deriva: 60% de chance al abrir cada season, 25% de un
// parche correctivo a mitad de cualquier split (números textuales del
// usuario). Los pesos siguen viviendo en `state.meta.weights` sobre el mismo
// vocabulario de ARQUETIPOS de siempre — lo único que cambia es quién los
// escribe, así que `afinidadDeCampeon`, `deseoPorCampeon` y todo lo que ya
// cruzaba el pool contra el meta sigue funcionando sin tocarse.

// Los pesos base de un régimen: lo que sube va a pesoSube, lo que hunde a
// pesoHunde, el resto (ni mencionado en `sube` ni en `hunde`) queda neutro.
// Un `gauss` chico por encima de cada base evita que dos splits del mismo
// régimen sean idénticos, sin que se note como un régimen distinto.
function pesosDelRegimen(regimen, rng) {
  const r = BALANCE.regimen;
  const m = BALANCE.meta;

  return Object.fromEntries(ARQUETIPOS.map((tag) => {
    const base = regimen.sube.includes(tag) ? r.pesoSube : regimen.hunde.includes(tag) ? r.pesoHunde : r.pesoNeutro;
    return [tag, clamp(gauss(base, r.ruidoPorSplit, rng), m.pesoMinimo, m.pesoMaximo)];
  }));
}

function elegirRegimenDistinto(idActual, rng) {
  const candidatos = METAS.filter((regimen) => regimen.id !== idActual);
  return pick(candidatos.length > 0 ? candidatos : METAS, rng);
}

function esAperturaDeSeason(state) {
  return state.player.splitCount % BALANCE.edad.splitsPorEdad === 0;
}

// Decide si el régimen cambia este split, y a cuál. `tipo` queda null si no
// cambió: el parche sigue siendo el mismo régimen, solo se movió un poco.
function decidirCambioDeRegimen(state, rng) {
  const r = BALANCE.regimen;

  if (esAperturaDeSeason(state) && chance(r.probCambioApertura, rng)) {
    return { regimen: elegirRegimenDistinto(state.meta.regimen, rng), tipo: 'apertura' };
  }
  if (!esAperturaDeSeason(state) && chance(r.probCambioCorrectivo, rng)) {
    return { regimen: elegirRegimenDistinto(state.meta.regimen, rng), tipo: 'correctivo' };
  }
  return { regimen: METAS.find((candidato) => candidato.id === state.meta.regimen) ?? METAS[0], tipo: null };
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

function textoDelParche(patch, regimenVigente, tipoDeCambio, saltos) {
  const cabeza = tipoDeCambio === 'apertura'
    ? `Pretemporada. Se dio vuelta el juego: se viene la ${regimenVigente.nombre}. ${regimenVigente.descripcion}`
    : tipoDeCambio === 'correctivo'
      ? `Parche ${patch} a mitad de split: nerfean lo que venía arriba. El meta vira a la ${regimenVigente.nombre}.`
      : `Parche ${patch}: sigue la ${regimenVigente.nombre}. ${regimenVigente.descripcion}`;

  return saltos.length > 0 ? `${cabeza} ${saltos.join('. ')}.` : cabeza;
}

export function aplicar(state, rng) {
  const { regimen, tipo } = decidirCambioDeRegimen(state, rng);
  const patch = state.meta.patch + 1;
  const weights = pesosDelRegimen(regimen, rng);

  const conPesos = { ...state, meta: { ...state.meta, patch, regimen: regimen.id, weights } };
  const tierListNueva = tierListDeRol(conPesos);
  const saltos = saltosDeTierPropios(state.meta.tierList, tierListNueva, state.player.championPool);

  const logs = [crearLog('meta', textoDelParche(patch, regimen, tipo, saltos))];

  const conTierList = {
    ...conPesos,
    meta: { ...conPesos.meta, tierList: tierListNueva, tierListAnterior: state.meta.tierList }
  };

  const { state: nextState, log } = debutarCampeon(conTierList, rng);
  if (log) {
    logs.push(log);
  }

  return { state: nextState, logs };
}
