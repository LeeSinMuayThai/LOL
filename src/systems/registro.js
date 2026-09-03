// Registro declarativo de sistemas. El orden de esta lista ES el orden del split.
//
// Agregar un sistema = un archivo nuevo en /src/systems + UNA linea aca
// (regla invariable 6). El pipeline no conoce ningun sistema por nombre: solo
// recorre esta lista.
//
// Contrato de un sistema:
//   export const id                                -> identificador unico
//   export function aplicar(state, rng)            -> { state, logs, decision? }
//   export function resolver(state, decision, respuesta, rng)
//                                                  -> { state, logs, decision? }
//   export function resolverAuto(state, decision, rng) -> respuesta
//
// `resolver` y `resolverAuto` solo son obligatorios si el sistema puede devolver
// una `decision` desde `aplicar`.

// El orden sigue el ciclo del split de CONCEPTO §5: llega el parche, se
// recalcula el Ajuste al Meta, se juega, caen los eventos, y recien despues se
// mueven los atributos y cierra la temporada.
export const ETAPAS_SPLIT = [
  // Fase 9Rf: antes que nada fija el cupo de interrupciones del split. Va
  // ANTES de `contexto` a proposito: `tipoDeSplit` necesita el `state.contexto`
  // del split anterior, que `contexto.js` esta por pisar. No consume rng.
  await import('./presupuesto.js'),
  // Primero de todo: recalcula donde estas parado en la carrera. Todo el
  // contenido de los sistemas que siguen se filtra contra eso.
  await import('./contexto.js'),
  await import('./edadInicio.js'),
  await import('./meta.js'),
  await import('./roster.js'),
  // El transito entre tiers (fase 3): en el split del fichaje, `amateur`
  // todavia no corrio (viene mas adelante en la lista), asi que esto ve
  // `phase: 'amateur'` y no hace nada — recien actua desde el split siguiente.
  await import('./competitivo.js'),
  // El mercado (fase 9): contratos que vencen y ofertas que llegan. Va justo
  // despues de `competitivo`, que decide SI ascendes; este decide A QUE ORG
  // vas — la eleccion real de PLAN.md §9.4.
  await import('./mercado.js'),
  await import('./campeones.js'),
  // Antes de amateur a proposito: si la carrera se corta en este split, el flag
  // del secundario ya quedo congelado y entra en la tarjeta final.
  await import('./secundario.js'),
  await import('./amateur.js'),
  // La temporada regular (fase 5): calendario real, tabla de posiciones, y
  // 2-3 fechas por split que se juegan de verdad. Va justo antes de
  // `rendimiento`, que ahora SOLO aplica las consecuencias (hype, mentalidad,
  // jerarquia, titulos) leyendo la posicion que este sistema calculo — no
  // vuelve a resolverla.
  await import('./temporada.js'),
  await import('./rendimiento.js'),
  // La serie de playoffs (fase 4): temporada regular -> playoffs, siguiendo el
  // orden de CONCEPTO §5. Solo actua en tier 1 con formatoPlayoffs; ahi le
  // saca a rendimiento.js la resolucion instantanea de titulo/internacional.
  await import('./serie.js'),
  await import('./events.js'),
  await import('./atributos.js'),
  await import('./practica.js'),
  await import('./edadCierre.js')
];

export function sistemaPorId(sistemaId) {
  const sistema = ETAPAS_SPLIT.find((etapa) => etapa.id === sistemaId);
  if (!sistema) {
    throw new Error(`Sistema desconocido en el registro: ${sistemaId}`);
  }
  return sistema;
}
