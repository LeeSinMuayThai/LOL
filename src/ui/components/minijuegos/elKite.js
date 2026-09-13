import { unaSolaVez, ventanaPorStat, escuchaTeclado, marcadorDeRondas, factorDificultadRonda } from './comun.js';

// "El kite" (fase 9R4c). Atacar, moverse, atacar, moverse: ocho tiempos
// alternados contra un metrónomo. Si repetís la misma acción dos veces seguidas
// o llegás tarde al tiempo, perdés ese golpe. `mecanica` abre la ventana de
// cada tiempo.
//
// Teclado: A (atacar) y S (moverse), o los dos botones.

const TIEMPOS = 8;

export function montar(container, state, onDone) {
  const terminar = unaSolaVez(onDone);
  const dificultad = factorDificultadRonda(state.serie?.ronda);
  const msTiempo = ventanaPorStat(state.player.stats.mecanica, 520, 1000, dificultad);

  container.innerHTML =
    '<div class="minijuego-aviso">Atacá (A)</div>'
    + '<div class="minijuego-aim-info">Alterná A y S, uno por tiempo.</div>'
    + '<div class="minijuego-metronomo"></div>'
    + '<div class="minijuego-cards minijuego-kite"></div>';

  const metronomo = container.querySelector('.minijuego-metronomo');
  const botonera = container.querySelector('.minijuego-kite');
  const marcador = marcadorDeRondas(container);

  const pasos = Array.from({ length: TIEMPOS }, () => {
    const paso = document.createElement('span');
    paso.className = 'minijuego-paso';
    metronomo.appendChild(paso);
    return paso;
  });

  let tiempo = 0;
  let esperada = 'atacar';
  let logrados = 0;
  let jugadoEsteTiempo = false;
  let reloj = null;
  let soltarTeclado = () => {};

  function cerrar() {
    clearInterval(reloj);
    soltarTeclado();
    botonera.querySelectorAll('button').forEach((boton) => { boton.disabled = true; });
  }

  function jugar(accion) {
    if (jugadoEsteTiempo || tiempo >= TIEMPOS) {
      return;
    }
    jugadoEsteTiempo = true;
    const bien = accion === esperada;
    pasos[tiempo].dataset.resultado = bien ? 'bien' : 'mal';
    if (bien) {
      logrados += 1;
    }
    marcador(`Ritmo: ${logrados} de ${TIEMPOS}`);
  }

  function tick() {
    if (tiempo < TIEMPOS && !jugadoEsteTiempo) {
      pasos[tiempo].dataset.resultado = 'mal';
    }
    tiempo += 1;
    if (tiempo >= TIEMPOS) {
      cerrar();
      terminar(logrados / TIEMPOS);
      return;
    }
    jugadoEsteTiempo = false;
    esperada = esperada === 'atacar' ? 'mover' : 'atacar';
    pasos[tiempo].dataset.activo = 'si';
    if (tiempo > 0) {
      delete pasos[tiempo - 1].dataset.activo;
    }
    container.querySelector('.minijuego-aviso').textContent = esperada === 'atacar'
      ? 'Atacá (A)'
      : 'Movete (S)';
  }

  [['Atacar · A', 'atacar'], ['Moverse · S', 'mover']].forEach(([label, accion]) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'minijuego-btn';
    boton.textContent = label;
    boton.addEventListener('click', () => jugar(accion));
    botonera.appendChild(boton);
  });

  soltarTeclado = escuchaTeclado((evento) => {
    const tecla = evento.key.toLowerCase();
    if (tecla !== 'a' && tecla !== 's') {
      return;
    }
    evento.preventDefault();
    jugar(tecla === 'a' ? 'atacar' : 'mover');
  });

  pasos[0].dataset.activo = 'si';
  marcador(`Ritmo: 0 de ${TIEMPOS}`);
  container.querySelector('.minijuego-aviso').textContent = 'Atacá (A)';
  // motion-reducido: no aplica. El metrónomo son pasos que cambian de estado,
  // no algo que se desliza, así que el tempo es el mismo con la preferencia
  // activada. Estirarlo sólo alargaba el minijuego (medido en Chrome: 9s
  // contra 6,4s) sin dar una sola información más.
  reloj = setInterval(tick, msTiempo);
}
