import { unaSolaVez, ventanaPorStat, marcadorDeRondas, relojDeMinijuego } from './comun.js';

// "La visión" (fase 9R4c). Se apagan tres zonas del mapa por un momento y hay
// que decir cuáles quedaron a oscuras para wardearlas. No es puntería ni
// reflejos: es leer el mapa y acordarse, que es lo que hace `macro`.
//
// Todos los blancos son `<button>`, así que se juega entero con Tab + Enter.

const ZONAS = [
  'Río de arriba', 'Foso del Barón', 'Tribush azul',
  'Río de abajo', 'Foso del Dragón', 'Tribush rojo'
];
const A_OSCURAS = 3;

export function montar(container, state, onDone, rngUi) {
  const terminar = unaSolaVez(onDone);
  const msVisible = ventanaPorStat(state.player.stats.macro, 900, 2000);

  // Barajado determinista con `rngUi` (Fisher-Yates): las tres zonas oscuras
  // salen del stream de la UI, nunca de `Math.random`.
  const indices = ZONAS.map((zona, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rngUi() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const oscuras = new Set(indices.slice(0, A_OSCURAS));

  container.innerHTML =
    '<div class="minijuego-aviso">Mirá qué zonas quedan sin visión.</div>'
    + '<div class="minijuego-zonas"></div>';

  const grilla = container.querySelector('.minijuego-zonas');
  const aviso = container.querySelector('.minijuego-aviso');
  const marcador = marcadorDeRondas(container);

  const botones = ZONAS.map((nombre, i) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'minijuego-zona-btn';
    boton.textContent = nombre;
    boton.disabled = true;
    boton.dataset.estado = oscuras.has(i) ? 'oscura' : 'iluminada';
    grilla.appendChild(boton);
    return boton;
  });

  let elegidas = 0;
  let aciertos = 0;
  let pararReloj = () => {};

  function cerrar() {
    pararReloj();
    botones.forEach((boton) => { boton.disabled = true; });
  }

  function elegir(i) {
    const boton = botones[i];
    if (boton.disabled) {
      return;
    }
    boton.disabled = true;
    const bien = oscuras.has(i);
    boton.dataset.resultado = bien ? 'bien' : 'mal';
    if (bien) {
      aciertos += 1;
    }
    elegidas += 1;
    marcador(`Wards puestas: ${elegidas} de ${A_OSCURAS}`);
    if (elegidas >= A_OSCURAS) {
      cerrar();
      terminar(aciertos / A_OSCURAS);
    }
  }

  botones.forEach((boton, i) => boton.addEventListener('click', () => elegir(i)));

  setTimeout(() => {
    aviso.textContent = `Wardeá las ${A_OSCURAS} que estaban a oscuras.`;
    botones.forEach((boton) => {
      boton.dataset.estado = 'tapada';
      boton.disabled = false;
    });
    botones[0].focus();
    marcador(`Wards puestas: 0 de ${A_OSCURAS}`);
    // Si se acaba el tiempo, cuenta lo que hayas puesto.
    pararReloj = relojDeMinijuego(container, 6000, () => {
      cerrar();
      terminar(aciertos / A_OSCURAS);
    });
  }, msVisible);
}
