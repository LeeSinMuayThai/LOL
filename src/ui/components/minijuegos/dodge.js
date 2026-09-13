import { unaSolaVez, ventanaPorStat, escuchaTeclado, marcadorDeRondas, motionReducido, factorDificultadRonda } from './comun.js';

// "Dodge" (fase 9R4c). Cuatro skillshots, uno por vez: el carril peligroso se
// telegrafía y tenés lo que dura el telegrafiado para moverte a otro. `mecanica`
// decide cuánto dura ese aviso.
//
// Se juega con flechas o A/D (y con los botones, para mouse). No hay nada que
// se mueva de forma continua: el telegrafiado es un cambio de estado del
// carril, así que con `prefers-reduced-motion` se juega igual.

const CARRILES = 5;
const RONDAS = 4;

export function montar(container, state, onDone, rngUi) {
  const terminar = unaSolaVez(onDone);
  const dificultad = factorDificultadRonda(state.serie?.ronda);
  const msAviso = ventanaPorStat(state.player.stats.mecanica, 700, 1600, dificultad);

  container.innerHTML =
    '<div class="minijuego-aviso">Salí del carril marcado</div>'
    + '<div class="minijuego-aim-info">Flechas o A/D.</div>'
    + '<div class="minijuego-carriles"></div>'
    + '<div class="minijuego-cards minijuego-mover"></div>';

  const pista = container.querySelector('.minijuego-carriles');
  const mover = container.querySelector('.minijuego-mover');
  const marcador = marcadorDeRondas(container);

  const carriles = Array.from({ length: CARRILES }, () => {
    const carril = document.createElement('div');
    carril.className = 'minijuego-carril';
    pista.appendChild(carril);
    return carril;
  });

  let posicion = Math.floor(CARRILES / 2);
  let ronda = 0;
  let esquivados = 0;
  let peligro = -1;
  let reloj = null;
  let soltarTeclado = () => {};

  function pintar() {
    carriles.forEach((carril, i) => {
      carril.dataset.yo = i === posicion ? 'si' : 'no';
      carril.dataset.peligro = i === peligro ? 'si' : 'no';
    });
  }

  function moverse(delta) {
    posicion = Math.max(0, Math.min(CARRILES - 1, posicion + delta));
    pintar();
  }

  function cerrar() {
    clearTimeout(reloj);
    soltarTeclado();
    mover.querySelectorAll('button').forEach((boton) => { boton.disabled = true; });
  }

  function resolver() {
    const salvado = posicion !== peligro;
    if (salvado) {
      esquivados += 1;
    }
    carriles[peligro].dataset.impacto = salvado ? 'fallo' : 'acierto';
    setTimeout(() => {
      carriles.forEach((carril) => { delete carril.dataset.impacto; });
      siguiente();
    }, motionReducido() ? 120 : 260);
  }

  function siguiente() {
    ronda += 1;
    marcador(`Esquivados: ${esquivados} de ${RONDAS}`);
    if (ronda > RONDAS) {
      cerrar();
      terminar(esquivados / RONDAS);
      return;
    }
    // El carril que se prende sale de `rngUi`: nunca `Math.random`.
    peligro = Math.floor(rngUi() * CARRILES);
    pintar();
    reloj = setTimeout(resolver, msAviso);
  }

  [['←', -1], ['→', 1]].forEach(([label, delta]) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'minijuego-btn';
    boton.textContent = label;
    boton.addEventListener('click', () => moverse(delta));
    mover.appendChild(boton);
  });

  soltarTeclado = escuchaTeclado((evento) => {
    const tecla = evento.key.toLowerCase();
    if (tecla === 'arrowleft' || tecla === 'a') {
      evento.preventDefault();
      moverse(-1);
    }
    if (tecla === 'arrowright' || tecla === 'd') {
      evento.preventDefault();
      moverse(1);
    }
  });

  pintar();
  siguiente();
}
