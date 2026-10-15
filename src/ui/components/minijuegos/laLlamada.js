import { dificultadDe, ventanaPorStat, unaSolaVez } from './comun.js';

// G1 (PLANUI §0.9, "Variedad"): la ventana la abre `shotcalling` (antes era fija, 700 ms para todos), entre estos topes.
export const VENTANA_MS = [520, 900];

// La Llamada (fase 4). Migrado de index.html en la fase T6 — ver
// `robarBaron.js` para el porqué del `rngUi` como parámetro.
export function montar(container, state, onDone, rngUi, datos = null) {
  const terminar = unaSolaVez(onDone);
  const dificultad = dificultadDe(state, datos);
  const ventanaMs = ventanaPorStat(state.player.stats.shotcalling, VENTANA_MS[0], VENTANA_MS[1], dificultad);

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
      terminar(0.05, { tipo: 'temprano' });
      return;
    }
    const latencia = performance.now() - inicio;
    terminar(Math.max(0, 1 - latencia / ventanaMs), { tipo: 'latencia', ms: latencia, ventanaMs });
  }, { once: true });
}
