// Una entrada del feed de la carrera.
//
// `message` es la linea completa ya compuesta: todo lo que la lee (la UI vieja,
// validate, simulate) sigue funcionando sin cambios. `extra` son las partes
// sueltas — titulo, cuerpo narrativo, resumen de efectos — para que la UI pueda
// darles jerarquia tipografica en vez de escupir un renglon plano.
export function crearLog(type, message, extra = null) {
  return extra ? { type, message, ...extra } : { type, message };
}

// K4c-F (el feed): `adjunto: true` marca una línea que NO forma su propio beat del reproductor: viaja adentro del beat
// anterior (como las `tecnico`, pero se pinta legible, no atenuada). Nada se borra: la línea sigue en `state.logs` y en
// el feed, solo deja de costar un beat. La pone el motor, que es quien sabe qué es secundario (el renglón de efecto de
// un evento, el mundo que no te toca, el segundo renglón de un parche, los mapas de una serie que no te frenó).
export function adjuntar(log) {
  return { ...log, adjunto: true };
}

// Única fuente de verdad de qué línea es un beat: la usan el reproductor (`agruparBeats`, src/ui/components/feed.js) y
// el instrumento (`contarBeats` y `tiempoMaquinaMin`, src/dev/simulate.js).
export function formaBeat(log) {
  return !log.tecnico && !log.adjunto;
}
