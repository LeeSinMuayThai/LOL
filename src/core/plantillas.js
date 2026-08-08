import { etiquetaRol } from '../data/roles.js';

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
  rival: (state) => state.mundo.rivales[0]?.handle
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
