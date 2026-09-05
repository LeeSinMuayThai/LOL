import { motionReducido, unaSolaVez, ventanaPorStat } from './comun.js';

// Robar Baron (fase 4). Migrado de index.html en la fase T6 —
// PLAN.md §8.5 lo dejó sin mover a propósito "porque la fase 12 le cambia
// la presentación". El motor nunca lo implementa (regla 5): entra un
// `resultado` 0-1 por `onDone` y listo. `resolverAuto` (systems/serie.js)
// simula lo mismo con gauss corrido por mecánica cuando no hay nadie
// mirando (simulate.js).
//
// Contrato: `montar(container, state, onDone, rngUi)`. `rngUi` entra como
// parámetro — antes vivía en el closure de index.html; movido a su propio
// módulo, ya no hay closure que compartir. Sigue siendo el stream separado
// del `rng` del motor (regla invariable 1, trampa T1 de PLAN.md).
//
// Fase 9R4c: con `prefers-reduced-motion` el cursor deja de deslizarse y salta
// de escalón en escalón mostrando el número. Se pierde la animación, no la
// decisión — antes el CSS apagaba sus propias animaciones y esta, dibujada por
// JS, seguía corriendo igual.
const PASOS = 20;

export function montar(container, state, onDone, rngUi) {
  const terminar = unaSolaVez(onDone);
  const anchoZona = ventanaPorStat(state.player.stats.mecanica, 14, 32);
  const centroZona = 25 + rngUi() * 50;
  const reducido = motionReducido();

  container.innerHTML =
    '<div class="minijuego-barra"><div class="minijuego-zona"></div><div class="minijuego-marcador"></div></div>' +
    '<button type="button" class="minijuego-btn">¡Smite ya!</button>';

  const zona = container.querySelector('.minijuego-zona');
  zona.style.left = (centroZona - anchoZona / 2) + '%';
  zona.style.width = anchoZona + '%';
  const marcador = container.querySelector('.minijuego-marcador');
  const boton = container.querySelector('.minijuego-btn');

  let pos = 0;
  let dir = 1;
  let activo = true;

  function pintar() {
    marcador.style.left = pos + '%';
    if (reducido) {
      marcador.textContent = String(Math.round(pos));
    }
  }

  function avanzar(paso) {
    if (!activo) {
      return;
    }
    pos += dir * paso;
    if (pos >= 100) { pos = 100; dir = -1; }
    if (pos <= 0) { pos = 0; dir = 1; }
    pintar();
  }

  const reloj = reducido
    ? setInterval(() => avanzar(100 / PASOS), 300)
    : null;

  function frame() {
    if (!activo) return;
    avanzar(1.7);
    requestAnimationFrame(frame);
  }
  if (!reducido) {
    requestAnimationFrame(frame);
  }
  pintar();

  boton.addEventListener('click', () => {
    activo = false;
    clearInterval(reloj);
    const distancia = Math.abs(pos - centroZona);
    terminar(Math.max(0, 1 - distancia / 45));
  }, { once: true });
}
