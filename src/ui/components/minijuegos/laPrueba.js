// La Prueba (fase 4). Migrado de index.html en la fase T6 — ver
// `robarBaron.js` para el porqué del `rngUi` como parámetro.
import { dificultadDe, ventanaPorStat } from './comun.js';

// G1 (PLANUI §0.9, "Variedad"): cuánto queda cada blanco lo abre `mecanica` (antes, 900 ms para todos).
export const BLANCOS = 5;
const VIDA_BLANCO_MS = [720, 1100];

export function montar(container, state, onDone, rngUi, datos = null) {
  const vidaBlanco = ventanaPorStat(state.player.stats.mecanica, VIDA_BLANCO_MS[0], VIDA_BLANCO_MS[1], dificultadDe(state, datos));
  const total = BLANCOS;
  let aciertos = 0;
  let ronda = 0;

  container.innerHTML = '<div class="minijuego-campo"></div><div class="minijuego-aim-info"></div>';
  const campo = container.querySelector('.minijuego-campo');
  const info = container.querySelector('.minijuego-aim-info');

  function siguiente() {
    if (ronda >= total) {
      onDone(aciertos / total);
      return;
    }
    ronda += 1;
    info.textContent = 'Blanco ' + ronda + ' de ' + total;

    const blanco = document.createElement('button');
    blanco.type = 'button';
    blanco.className = 'minijuego-blanco';
    blanco.style.left = (rngUi() * 85) + '%';
    blanco.style.top = (rngUi() * 75) + '%';

    const vencido = setTimeout(() => {
      blanco.remove();
      siguiente();
    }, vidaBlanco);

    blanco.addEventListener('click', () => {
      clearTimeout(vencido);
      aciertos += 1;
      blanco.remove();
      siguiente();
    }, { once: true });

    campo.appendChild(blanco);
  }
  siguiente();
}
