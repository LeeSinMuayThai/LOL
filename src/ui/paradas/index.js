// Las paradas (FASE V, V2-B): elige la familia de una pausa del motor (`familiaDeParada`, ui/core/escena.js) y la pinta
// en su contenedor. El contrato de las familias está escrito en la cabecera de `src/ui/escena.js`.
import { familiaDeParada } from '../core/escena.js';
import * as decision from './decision.js';
import * as partido from './partido.js';
import * as mercado from './mercado.js';
import * as minijuego from './minijuego.js';

export const FAMILIAS = { decision, partido, mercado, minijuego };

// `pendiente`: el `state.pendiente` del motor. `ctx.contenedores[familia]` es el contenedor de cada familia. Devuelve la
// vista de la parada: `{ familia }` y, si la familia los trae (PLANUI §0.2), `narrar(ctx)` (contar su resultado en el
// lugar) y `destruir()` (soltar sus relojes y oyentes cuando la parada se va).
export function mostrarParada(pendiente, ctx) {
  const familia = familiaDeParada(pendiente);
  const vista = FAMILIAS[familia].mostrar(ctx.contenedores[familia], pendiente.decision, ctx);
  const esObjeto = vista && typeof vista === 'object' && !(typeof Node !== 'undefined' && vista instanceof Node);
  return { familia, ...(esObjeto ? vista : {}) };
}
