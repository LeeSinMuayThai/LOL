import { etiquetaRol } from '../data/roles.js';
import { campeonesEnMeta, campeonesMuertos } from './ajusteMeta.js';
import { campeonesDisponibles, principalDelPool, campeonNuevoPendiente } from './pool.js';

// Tokens para que el contenido nombre TU carrera y no una genérica.
// "{jungla} no camina más para vos" -> "Zenvex no camina más para vos".
//
// Todos los getters son puros y sin RNG: la resolucion de texto no puede mover
// el stream de azar ni depender de cuando se llama.

function companeroDeRol(state, rol) {
  return state.career.companeros.find((companero) => companero.role === rol) ?? null;
}

export const TOKENS = {
  handle: (state) => state.player.name,
  rol: (state) => etiquetaRol(state.player.role),
  org: (state) => state.career.currentOrg,
  liga: (state) => state.career.liga,
  region: (state) => state.mundo.regionOrigen,
  campeon: (state) => state.player.campeonDelSplit,
  signature: (state) => state.player.signatureChampion,
  top: (state) => companeroDeRol(state, 'top')?.handle,
  jungla: (state) => companeroDeRol(state, 'jungla')?.handle,
  mid: (state) => companeroDeRol(state, 'mid')?.handle,
  adc: (state) => companeroDeRol(state, 'adc')?.handle,
  support: (state) => companeroDeRol(state, 'support')?.handle,
  rival: (state) => state.mundo.rivales[0]?.handle,
  // El rival de ESTA fecha de temporada regular (fase 5) — no confundir con
  // {rival}, que es el rival de generación. Solo resuelve mientras hay una
  // fecha marcada en curso, que es el único momento en que este token puede
  // aparecer en un texto (data/events/partido/*.json).
  rivalDeLaFecha: (state) => state.career.temporada?.fechaEnCurso?.rival ?? null,
  // El campeón que domina el parche en tu línea. Deja escribir "todos pickean
  // {metaTop}" sin cablear un nombre en el JSON.
  metaTop: (state) => campeonesEnMeta(state.meta.weights, campeonesDisponibles(state), 1)[0]?.name,
  // Tu main de mayor maestría.
  main: (state) => (state.player.championPool.length > 0 ? principalDelPool(state.player.championPool).name : null),
  // Tu main SOLO si el parche lo dejó a contramano. Devuelve null si no, así el
  // check de tokens exige la marca `main_muerto` y el texto nunca miente.
  mainMuerto: (state) => {
    if (state.player.championPool.length === 0) {
      return null;
    }
    const principal = principalDelPool(state.player.championPool);
    const muertos = campeonesMuertos([principal], state.meta.weights, campeonesDisponibles(state));
    return muertos.length > 0 ? principal.name : null;
  },
  // El campeón que salió con el último parche y todavía no tenés.
  campeonNuevo: (state) => campeonNuevoPendiente(state)
};

const PATRON_TOKEN = /\{(\w+)\}/g;

export function tokensUsados(texto) {
  return [...String(texto ?? '').matchAll(PATRON_TOKEN)].map(([, token]) => token);
}

// Si un token no resuelve, el contenido esta mal gateado: "{jungla}" no puede
// aparecer en un evento que puede caer en la etapa amateur, donde no hay equipo.
// Devolver el marcador crudo hace que el bug se vea en pantalla y que validate
// lo pueda detectar en vez de imprimir "undefined" en silencio.
export function resolverTexto(texto, state) {
  return String(texto ?? '').replace(PATRON_TOKEN, (crudo, token) => {
    const getter = TOKENS[token];
    if (!getter) {
      return crudo;
    }
    const valor = getter(state);
    return valor === null || valor === undefined ? crudo : String(valor);
  });
}

export function textoResuelveCompleto(texto, state) {
  return tokensUsados(resolverTexto(texto, state)).length === 0;
}
