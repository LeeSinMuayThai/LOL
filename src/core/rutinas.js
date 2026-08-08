import { weightedPick } from './rng.js';
import { calcularContexto, coincideContexto } from './contexto.js';
import { cumpleCondiciones } from './selectors.js';
import { BALANCE } from '../data/balance.js';
import RUTINAS_AMATEUR from '../data/rutinas/amateur.json' with { type: 'json' };
import RUTINAS_OFFSEASON from '../data/rutinas/offseason.json' with { type: 'json' };

// Una rutina es un reparto de recursos con texto narrativo encima.
//
// El jugador ve "Clase, siesta corta, y de las 8 a las 2"; el motor ve
// { ranked: 6, estudiar: 1, dormir: 2, familia: 1 } y un bloque robado al sueño.
// Por eso `aplicarReparto` no cambió ni una línea: toda la economía y todo el
// balance calibrado siguen operando igual. Lo único que cambió es quién produce
// el reparto — antes un panel de botones +/-, ahora una decisión con voz.

export const RUTINAS = {
  amateur: RUTINAS_AMATEUR,
  offseason: RUTINAS_OFFSEASON
};

function disponibles(state, pool, contexto) {
  return pool.filter((rutina) => (
    coincideContexto(contexto, rutina.contexto, state.age) && cumpleCondiciones(state, rutina.conditions)
  ));
}

function tiene(rutina, etiqueta) {
  return rutina.etiquetas.includes(etiqueta);
}

// La forma de la decisión importa tanto como su contenido: siempre tiene que
// haber una salida segura (nunca se acorrala al jugador en una mala elección) y
// siempre tiene que estar la agresiva (la trampa está disponible aunque
// convenga no tomarla — es el corazón de CONCEPTO §4).
export function ofrecerRutinas(state, rng, { pool = 'amateur', cantidad = BALANCE.rutinas.ofrecidas } = {}) {
  const contexto = calcularContexto(state);
  const candidatas = disponibles(state, RUTINAS[pool], contexto);

  if (candidatas.length === 0) {
    return [];
  }

  const elegidas = [];
  const tomar = (subconjunto) => {
    const restantes = subconjunto.filter((rutina) => !elegidas.includes(rutina));
    if (restantes.length > 0) {
      elegidas.push(weightedPick(restantes, (rutina) => rutina.peso, rng));
    }
  };

  tomar(candidatas.filter((rutina) => tiene(rutina, 'segura')));
  tomar(candidatas.filter((rutina) => tiene(rutina, 'agresiva')));

  while (elegidas.length < Math.min(cantidad, candidatas.length)) {
    tomar(candidatas);
  }

  return elegidas;
}

// Contesta como alguien con criterio: puntúa cada rutina ofrecida contra los
// pesos que el sistema ya usaba para reaccionar a las barras en rojo. Así la
// simulación masiva sigue midiendo el juego y no el ruido, aunque ahora elija
// entre opciones cerradas en vez de armar el reparto libremente.
function proporciones(reparto) {
  const total = Object.values(reparto).reduce((suma, bloques) => suma + bloques, 0);
  return total === 0
    ? reparto
    : Object.fromEntries(Object.entries(reparto).map(([destino, bloques]) => [destino, bloques / total]));
}

// Elige la rutina mas parecida a como el jugador habria repartido el tiempo si
// pudiera hacerlo bloque por bloque.
//
// No maximiza la suma ponderada: eso siempre elegiria la rutina mas extrema en
// el destino de mayor peso. Lo que se busca es la MENOR distancia contra las
// proporciones deseadas, que es exactamente lo que producia el reparto libre
// que estas rutinas reemplazaron. El ruido ya vive en `pesosAutomaticos`, que
// sortea los pesos en cada llamada.
export function elegirRutinaAutomatica(rutinas, pesos) {
  const total = Object.values(pesos).reduce((suma, peso) => suma + peso, 0);
  const deseado = Object.fromEntries(Object.entries(pesos).map(([destino, peso]) => [destino, peso / total]));

  const distancia = (rutina) => {
    const real = proporciones(rutina.reparto);
    const desvio = Object.keys(deseado).reduce((suma, destino) => suma + Math.abs((real[destino] ?? 0) - deseado[destino]), 0);
    return desvio + rutina.extra * BALANCE.rutinas.penalRoboEnAuto;
  };

  return rutinas.reduce((mejor, rutina) => (distancia(rutina) < distancia(mejor) ? rutina : mejor));
}

export function rutinaPorId(rutinas, id) {
  return rutinas.find((rutina) => rutina.id === id) ?? rutinas[0];
}
