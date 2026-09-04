// Rueda de Prensa (fase 4). Migrado de index.html en la fase T6 — ver
// `robarBaron.js` para el porqué del `rngUi` como parámetro.
export function montar(container, state, onDone, rngUi) {
  const objetivo = rngUi() * 100;
  container.innerHTML =
    '<input type="range" min="0" max="100" value="50" class="minijuego-slider" />' +
    '<div class="minijuego-slider-labels"><span>Humilde</span><span>Desafiante</span></div>' +
    '<button type="button" class="minijuego-btn">Responder</button>';

  const slider = container.querySelector('.minijuego-slider');
  const boton = container.querySelector('.minijuego-btn');
  boton.addEventListener('click', () => {
    const distancia = Math.abs(Number(slider.value) - objetivo);
    onDone(Math.max(0, 1 - distancia / 55));
  }, { once: true });
}
