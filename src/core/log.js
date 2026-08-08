// Una entrada del feed de la carrera.
//
// `message` es la linea completa ya compuesta: todo lo que la lee (la UI vieja,
// validate, simulate) sigue funcionando sin cambios. `extra` son las partes
// sueltas — titulo, cuerpo narrativo, resumen de efectos — para que la UI pueda
// darles jerarquia tipografica en vez de escupir un renglon plano.
export function crearLog(type, message, extra = null) {
  return extra ? { type, message, ...extra } : { type, message };
}
