import { esSplitEventful } from '../core/presupuesto.js';
import { BALANCE } from '../data/balance.js';

export const id = 'presupuesto';

// Fase 9Rf: fija el cupo de interrupciones del split y lo pone en cero de
// gastadas. Va PRIMERO en `ETAPAS_SPLIT` —antes de `contexto`— porque
// `esSplitEventful` compara el `state.contexto` del split anterior contra el
// contexto en vivo, y `systems/contexto.js` está por pisar ese cache.
//
// No toca `rng` (regla de proceso 10): el cupo es determinista dado el estado.
// `core/pipeline.js` descuenta uno por cada pausa; `core/presupuesto.js`
// expone `hayPresupuesto`, que solo consulta `events.js` antes de frenar.
export function aplicar(state, rng) {
  const p = BALANCE.presupuesto.interrupcionesPorSplit;
  const total = state.phase !== 'profesional'
    ? BALANCE.partida.maxDecisionesPorSplit
    : (esSplitEventful(state) ? p.eventful : p.rutina);

  return {
    state: { ...state, presupuesto: { total, gastadas: 0 } },
    logs: []
  };
}
