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

export const ETAPAS_SPLIT = [
  await import('./edadInicio.js'),
  // Antes de amateur a proposito: si la carrera se corta en este split, el flag
  // del secundario ya quedo congelado y entra en la tarjeta final.
  await import('./secundario.js'),
  await import('./amateur.js'),
  await import('./meta.js'),
  await import('./events.js'),
  await import('./atributos.js'),
  await import('./edadCierre.js')
];

export function sistemaPorId(sistemaId) {
  const sistema = ETAPAS_SPLIT.find((etapa) => etapa.id === sistemaId);
  if (!sistema) {
    throw new Error(`Sistema desconocido en el registro: ${sistemaId}`);
  }
  return sistema;
}
