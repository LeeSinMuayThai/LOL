// La Llamada (fase 4). Migrado de index.html en la fase T6 — ver
// `robarBaron.js` para el porqué del `rngUi` como parámetro.
export function montar(container, state, onDone, rngUi) {
  container.innerHTML =
    '<div class="minijuego-aviso">Esperá la señal del equipo...</div>' +
    '<button type="button" class="minijuego-btn">¡Ahora!</button>';
  const aviso = container.querySelector('.minijuego-aviso');
  const boton = container.querySelector('.minijuego-btn');

  let listo = false;
  let inicio = 0;
  const espera = setTimeout(() => {
    listo = true;
    inicio = performance.now();
    aviso.textContent = '¡AHORA!';
  }, 900 + rngUi() * 2200);

  boton.addEventListener('click', () => {
    if (!listo) {
      clearTimeout(espera);
      onDone(0.05);
      return;
    }
    const latencia = performance.now() - inicio;
    onDone(Math.max(0, 1 - latencia / 700));
  }, { once: true });
}
