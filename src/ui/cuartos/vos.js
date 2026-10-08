// El cuarto Vos (FASE V, V3e; PLAN.md §V.4): la ficha ENTERA (`components/ficha.js`). La misma pieza sirve al acompañante, en
// su versión compacta (`acompanante`, abajo): hay una sola ficha y dos tamaños, no dos pantallas que se parecen.
//
//  - En la pieza final (`estado.terminado`) la ficha del retiro miente: tras muchos splits sin equipo las curvas bajaron y
//    macro, shotcalling y adaptabilidad llegaron a verse en 0 (D90). Ahí el cuarto muestra los PICOS de la carrera.
//  - La memoria de la ficha (desde dónde cuenta el `countUp`, qué desplegables dejó abiertos el jugador) es del cuerpo del
//    cuarto: abrirlo dos veces seguidas con el mismo estado no cuenta desde el valor de otro contenedor (D95).
import { renderFicha, renderFichaCompacta, renderFichaFinal } from '../components/ficha.js';

function nuevaFicha() {
  const ficha = document.createElement('div');
  ficha.className = 'ficha-card';
  return ficha;
}

export function pintar(cuerpo, estado, { modulos }) {
  const ficha = nuevaFicha();
  cuerpo.appendChild(ficha);
  if (estado.terminado) {
    renderFichaFinal(ficha, estado, modulos);
  } else {
    renderFicha(ficha, estado, modulos, { dueno: cuerpo });
  }
}

// Lo que el acompañante (≥ 1180 px) muestra de Vos: la ficha compacta. `caja` es el `aside`: sobrevive a cada pintada, así
// que el `countUp` del nivel y de los LP sigue contando desde el valor que el jugador vio la última vez.
export function acompanante(caja, estado, { modulos }) {
  const ficha = nuevaFicha();
  caja.appendChild(ficha);
  renderFichaCompacta(ficha, estado, modulos, { dueno: caja });
}
