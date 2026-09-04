// Bootcamp (fase 4). Migrado de index.html en la fase T6 — ver
// `robarBaron.js` para el porqué del `rngUi` como parámetro (acá no se usa
// directamente: el sorteo lo hace el motor al elegir el minijuego, este
// solo cronometra el click del jugador).
export function montar(container, state, onDone) {
  const opciones = ['Matchups', 'El meta nuevo', 'Cabeza'];
  const objetivo = 5;
  let puntos = 0;
  let activo = true;

  container.innerHTML =
    '<div class="minijuego-barra-tiempo"><div class="minijuego-barra-tiempo-fill"></div></div>' +
    '<div class="minijuego-cards">' + opciones.map((label, i) => (
      '<button type="button" class="minijuego-card" data-i="' + i + '">' + label
      + '<span class="minijuego-card-count" data-count="' + i + '">0</span></button>'
    )).join('') + '</div>';

  const relleno = container.querySelector('.minijuego-barra-tiempo-fill');

  function terminar() {
    if (!activo) return;
    activo = false;
    onDone(Math.min(1, puntos / objetivo));
  }

  container.querySelectorAll('.minijuego-card').forEach((boton) => {
    boton.addEventListener('click', () => {
      if (!activo || puntos >= objetivo) return;
      puntos += 1;
      const contador = boton.querySelector('.minijuego-card-count');
      contador.textContent = String(Number(contador.textContent) + 1);
      if (puntos >= objetivo) terminar();
    });
  });

  const duracion = 6000;
  const inicio = performance.now();
  function frame(t) {
    if (!activo) return;
    const restante = Math.max(0, duracion - (t - inicio));
    relleno.style.width = (restante / duracion * 100) + '%';
    if (restante <= 0) { terminar(); return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
