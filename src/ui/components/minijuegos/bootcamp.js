import { unaSolaVez, relojDeMinijuego } from './comun.js';

// Bootcamp (fase 4). Migrado de index.html en la fase T6 — ver `robarBaron.js`
// para el porqué del `rngUi` como parámetro (acá no se usa: el sorteo lo hace
// el motor al elegir el minijuego, este solo cronometra los clicks).
//
// Fase 9R4c: el reloj pasa a `relojDeMinijuego` (comun.js), que respeta
// `prefers-reduced-motion`. Antes animaba la barra con `requestAnimationFrame`
// sin mirar la preferencia: el CSS de base.css apaga las animaciones de CSS,
// no las que dibuja el JS a mano.
const OPCIONES = ['Matchups', 'El meta nuevo', 'Cabeza'];
const OBJETIVO = 5;
const DURACION = 6000;

export function montar(container, state, onDone) {
  const terminar = unaSolaVez(onDone);
  let puntos = 0;

  container.innerHTML =
    '<div class="minijuego-cards">' + OPCIONES.map((label, i) => (
      '<button type="button" class="minijuego-card" data-i="' + i + '">' + label
      + '<span class="minijuego-card-count" data-count="' + i + '">0</span></button>'
    )).join('') + '</div>';

  let pararReloj = () => {};

  function cerrar() {
    pararReloj();
    container.querySelectorAll('.minijuego-card').forEach((boton) => { boton.disabled = true; });
    terminar(Math.min(1, puntos / OBJETIVO));
  }

  container.querySelectorAll('.minijuego-card').forEach((boton) => {
    boton.addEventListener('click', () => {
      if (puntos >= OBJETIVO) {
        return;
      }
      puntos += 1;
      const contador = boton.querySelector('.minijuego-card-count');
      contador.textContent = String(Number(contador.textContent) + 1);
      if (puntos >= OBJETIVO) {
        cerrar();
      }
    });
  });

  pararReloj = relojDeMinijuego(container, DURACION, cerrar);
}
