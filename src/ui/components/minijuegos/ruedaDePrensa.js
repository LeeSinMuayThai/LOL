import { BALANCE } from '../../../data/balance.js';

// Rueda de Prensa (fase 4). Migrado de index.html en la fase T6 — ver
// `robarBaron.js` para el porqué del `rngUi` como parámetro.
//
// K6d-P: ya no es azar puro. El motor manda `datos.tono` (0 Humilde, 100 Desafiante, de `core/prensa.js`) y `datos.pistas`
// (una frase por factor que pesó): la pantalla muestra las pistas arriba del slider y el objetivo es ese tono más un ruido
// chico de `rngUi` (`BALANCE.prensa.ruidoUi`), así que leer importa y no es una tabla. Sin `tono` (un guardado viejo, una
// pausa armada a mano) cae al comportamiento de antes: un objetivo al azar y ninguna pista.
// El tono al que apunta el slider (0 Humilde, 100 Desafiante): el del motor con un ruido de `rngUi`, o el de antes (al azar)
// si la pausa no trae `tono`. Una sola tirada de `rngUi` en los dos casos.
export function objetivoDePrensa(datos, rngUi) {
  if (typeof datos?.tono !== 'number') {
    return rngUi() * 100;
  }
  return Math.max(0, Math.min(100, datos.tono + (rngUi() * 2 - 1) * BALANCE.prensa.ruidoUi));
}

// El puntaje 0-1: 1 en el objetivo, 0 a `anchoDeAcierto` puntos de distancia o más.
export function puntajeDePrensa(slider, objetivo) {
  return Math.max(0, 1 - Math.abs(slider - objetivo) / BALANCE.prensa.anchoDeAcierto);
}

// Las pistas que se pintan arriba del slider: las del motor, solo si la pausa trae `tono` (sin tono, ninguna).
export function pistasDePrensa(datos) {
  return typeof datos?.tono === 'number' && Array.isArray(datos.pistas) ? datos.pistas : [];
}

export function montar(container, state, onDone, rngUi, datos = {}) {
  const objetivo = objetivoDePrensa(datos, rngUi);
  const pistas = pistasDePrensa(datos);

  container.innerHTML =
    (pistas.length > 0
      ? '<div class="minijuego-pistas"><div class="minijuego-pistas-kicker">LO QUE SE LEE EN LA SALA</div><ul class="minijuego-pistas-lista"></ul></div>'
      : '') +
    '<input type="range" min="0" max="100" value="50" class="minijuego-slider" aria-label="Tono de la respuesta, de Humilde a Desafiante" />' +
    '<div class="minijuego-slider-labels"><span>Humilde</span><span>Desafiante</span></div>' +
    '<button type="button" class="minijuego-btn">Responder</button>';

  const lista = container.querySelector('.minijuego-pistas-lista');
  for (const pista of pistas) {
    const item = document.createElement('li');
    item.textContent = pista;
    lista.appendChild(item);
  }

  const slider = container.querySelector('.minijuego-slider');
  const boton = container.querySelector('.minijuego-btn');
  boton.addEventListener('click', () => {
    onDone(puntajeDePrensa(Number(slider.value), objetivo));
  }, { once: true });
}
