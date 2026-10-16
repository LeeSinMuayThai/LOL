export const id = 'presupuesto';

// Fase 9Rf, H1a: pone en cero lo que el split lleva gastado al arrancar. `gastadas` son las pausas del split (las cuenta
// `core/pipeline.js` en cada pausa; las leen la fecha marcada y la serie) y `eventos` la parada de evento del split
// (`BALANCE.eventos.paradasPorSplit`, `systems/events.js`). H1a: se fue el `total` (el cupo de interrupciones de la fase
// 9Rf, `BALANCE.presupuesto`): el evento tiene su cupo propio y nadie más lo leía (T5).
//
// No toca `rng` (regla de proceso 10).
export function aplicar(state, rng) {
  return {
    state: { ...state, presupuesto: { gastadas: 0, eventos: 0 } },
    logs: []
  };
}
