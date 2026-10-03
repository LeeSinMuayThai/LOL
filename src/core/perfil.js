// K4-C (PLAN.md "K4 — decisiones de spec"): el perfil. Profesional / hambriento / showman / leal.
//
// Solo frenan las bifurcaciones de carrera (`bifurcacion: true` en el dato); el resto de los eventos lo
// resuelve tu perfil. Puro: cero `rng`, cero import de `systems/`. Recibe la previa y el riesgo de cada opción
// YA calculados (`core/previa.js`, con los pesos efectivos de `systems/events.js`): el encaje sale de lo mismo
// que la tarjeta le mostraría a una persona, no de una segunda lectura del dato.
import PERFILES from '../data/perfiles.json' with { type: 'json' };
import { hashCadena } from './numeros.js';
import { BALANCE } from '../data/balance.js';

export const IDS_PERFIL = PERFILES.orden;

export function esPerfilValido(id) {
  return IDS_PERFIL.includes(id);
}

export function nombreDePerfil(id) {
  return PERFILES.perfiles[id]?.nombre ?? '';
}

export function descripcionDePerfil(id) {
  return PERFILES.perfiles[id]?.descripcion ?? '';
}

// El perfil del arranque, completo desde el primer split (trampa T4). Si el jugador no eligió (camino headless,
// desafío diario), sale de la seed por `hashCadena` — sin tocar el `rng`, así elegir o no elegir no corre el stream.
export function perfilInicial(seed, elegido = null) {
  const actual = esPerfilValido(elegido) ? elegido : IDS_PERFIL[hashCadena(`perfil:${seed}`) % IDS_PERFIL.length];
  const pesos = Object.fromEntries(IDS_PERFIL.map((id) => [id, id === actual ? BALANCE.perfil.pesoInicialElegido : 0]));
  return { actual, pesos };
}

// El perfil vigente: el de mayor peso. En empate se queda el que ya estaba (no parpadea por un decimal).
export function perfilDominante(pesos, actual = null) {
  let mejor = actual && esPerfilValido(actual) ? actual : IDS_PERFIL[0];
  for (const id of IDS_PERFIL) {
    if ((pesos[id] ?? 0) > (pesos[mejor] ?? 0)) {
      mejor = id;
    }
  }
  return mejor;
}

export function familiaDeCampo(campo) {
  return PERFILES.familiaDeCampo[campo] ?? null;
}

// Cuánto le cierra a UN perfil una opción, desde su previa (familia de efecto + signo + magnitud) y su riesgo.
// `previa`: [{ campo, signo, magnitud }] de `previaDeOpcion`; `riesgo`: 'seguro' | 'incierto' | 'ruleta'.
export function encajeDePerfil(perfilId, previa, riesgo) {
  const perfil = PERFILES.perfiles[perfilId];
  const { pesoMagnitud } = BALANCE.perfil;
  let total = perfil.riesgo[riesgo] ?? 0;
  for (const fila of previa) {
    const familia = familiaDeCampo(fila.campo);
    if (familia === null) continue;
    const signo = fila.signo === '-' ? -1 : 1;
    total += (perfil.familias[familia] ?? 0) * signo * (pesoMagnitud[fila.magnitud] ?? 0);
  }
  return total;
}

// El encaje con TU perfil: la mezcla de los cuatro por sus pesos (con el perfil recién elegido es uno solo; a
// medida que las bifurcaciones lo corren, la mezcla se nota antes de que cambie la palabra de la ficha).
export function encajeConPesos(pesos, previa, riesgo) {
  return IDS_PERFIL.reduce((suma, id) => suma + (pesos[id] ?? 0) * encajeDePerfil(id, previa, riesgo), 0);
}

// La opción que tu perfil elige. `opciones`: [{ id, perfil?, previa, riesgo }] en el orden del dato.
// 1) Override: una opción con `perfil: '<id>'` igual a tu perfil vigente gana (la primera, si hubiera dos).
// 2) Si no, la de mayor encaje; en empate, la primera del dato. Determinista: el `rng` lo usa el outcome.
export function opcionDelPerfil(perfil, opciones) {
  const forzada = opciones.find((opcion) => opcion.perfil === perfil.actual);
  if (forzada) {
    return { id: forzada.id, forzada: true };
  }
  let mejor = null;
  let mejorEncaje = -Infinity;
  for (const opcion of opciones) {
    const encaje = encajeConPesos(perfil.pesos, opcion.previa, opcion.riesgo);
    if (encaje > mejorEncaje) {
      mejor = opcion;
      mejorEncaje = encaje;
    }
  }
  return { id: mejor.id, forzada: false };
}

// La afinidad de una opción de bifurcación: el perfil al que más le cierra (o el que fuerza el dato).
export function afinidadDeOpcion(opcion) {
  if (esPerfilValido(opcion.perfil)) {
    return opcion.perfil;
  }
  let mejor = IDS_PERFIL[0];
  let mejorEncaje = -Infinity;
  for (const id of IDS_PERFIL) {
    const encaje = encajeDePerfil(id, opcion.previa, opcion.riesgo);
    if (encaje > mejorEncaje) {
      mejor = id;
      mejorEncaje = encaje;
    }
  }
  return mejor;
}

// La regla de deriva: cada bifurcación que decidís corre los pesos hacia la afinidad de la opción que tomaste,
// `pesos ← (1 − α)·pesos + α·[afinidad]` con α = `BALANCE.perfil.derivaPorBifurcacion`. Los pesos siguen sumando
// lo mismo; la palabra cambia cuando otro perfil pasa al que tenías.
export function derivarPerfil(perfil, afinidad) {
  const alfa = BALANCE.perfil.derivaPorBifurcacion;
  const pesos = Object.fromEntries(IDS_PERFIL.map((id) => [
    id,
    (1 - alfa) * (perfil.pesos[id] ?? 0) + (id === afinidad ? alfa * BALANCE.perfil.pesoInicialElegido : 0)
  ]));
  return { actual: perfilDominante(pesos, perfil.actual), pesos };
}
