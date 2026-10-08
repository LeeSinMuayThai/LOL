// Las paradas (FASE V, V2-B): elige la familia de una pausa del motor (`familiaDeParada`, ui/core/escena.js) y la pinta
// en su contenedor. El contrato de las familias está escrito en la cabecera de `src/ui/escena.js`.
import { familiaDeParada } from '../core/escena.js';
import { marcarFoco } from '../escena.js';
import * as decision from './decision.js';
import * as partido from './partido.js';
import * as mercado from './mercado.js';
import { mostrar as mostrarMinijuego } from './minijuego.js';

// El minijuego (V2-A lo mudó tal cual a `paradas/minijuego.js`) se conecta acá: su previa y el foco en su título. Nunca lleva `data-atajo`: los minijuegos son dueños de sus teclas (1-5, Q/W/E/R, A/D, A/S).
const minijuego = {
  mostrar(contenedor, decisionDelMinijuego, ctx) {
    const { estado, rngUi, responder, pintarPrevia } = ctx;
    pintarPrevia(decisionDelMinijuego, estado);
    mostrarMinijuego(contenedor, decisionDelMinijuego, {
      estado,
      rngUi,
      responder,
      renderPrevia: pintarPrevia
    });
    marcarFoco(contenedor.querySelector('#minijuegoTitle'));
    return contenedor;
  },
  acompanante() {
    return null;
  }
};

export const FAMILIAS = { decision, partido, mercado, minijuego };

// `pendiente`: el `state.pendiente` del motor. `ctx.contenedores[familia]` es el contenedor de cada familia. Devuelve la
// familia que pintó.
export function mostrarParada(pendiente, ctx) {
  const familia = familiaDeParada(pendiente);
  FAMILIAS[familia].mostrar(ctx.contenedores[familia], pendiente.decision, ctx);
  return familia;
}
