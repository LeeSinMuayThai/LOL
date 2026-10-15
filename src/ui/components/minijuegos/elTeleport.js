import { unaSolaVez, ventanaPorStat, escuchaTeclado, motionReducido, dificultadDe } from './comun.js';

// "El teleport" (fase 9R4c). Es de timing como el Barón, pero al revés: el TP
// tarda en canalizar, así que hay que apretar ANTES de que la pelea esté en la
// ventana. Anticipar, no reaccionar — por eso lo corre `macro` y no `mecanica`,
// y por eso es del top.
//
// Con `prefers-reduced-motion` el cursor no se desliza: salta de escalón en
// escalón, con el número a la vista. Se pierde la animación, no la decisión.

const PASOS = 20;
// Lo que la escala de distancia suma a la media zona (a esa distancia del centro, el resultado es 0). La lee `components/varaG1.js`.
export const MARGEN_DISTANCIA = 14;
// El ancho de la zona, entre estos topes según `macro` (`ventanaPorStat`).
export const ANCHO_ZONA = [12, 26];

export function montar(container, state, onDone, rngUi, datos = null) {
  const terminar = unaSolaVez(onDone);
  const dificultad = dificultadDe(state, datos);
  const ancho = ventanaPorStat(state.player.stats.macro, ANCHO_ZONA[0], ANCHO_ZONA[1], dificultad);
  const reducido = motionReducido();
  const canalizacion = 18; // lo que el TP tarda, en la misma escala 0-100
  const centro = 30 + rngUi() * 45;

  container.innerHTML =
    '<div class="minijuego-aviso">El TP tarda: apretá antes</div>'
    + '<div class="minijuego-aim-info">La pelea se prende en la zona marcada.</div>'
    + '<div class="minijuego-barra"><div class="minijuego-zona"></div>'
    + '<div class="minijuego-marcador"></div></div>'
    + '<button type="button" class="minijuego-btn">TP ya</button>';

  const zona = container.querySelector('.minijuego-zona');
  zona.style.left = `${Math.max(0, centro - ancho / 2)}%`;
  zona.style.width = `${ancho}%`;

  const cursor = container.querySelector('.minijuego-marcador');
  const boton = container.querySelector('.minijuego-btn');

  let posicion = 0;
  let vivo = true;
  let soltarTeclado = () => {};
  let reloj = null;

  function pintar() {
    cursor.style.left = `${posicion}%`;
    if (reducido) {
      cursor.textContent = String(Math.round(posicion));
    }
  }

  function avanzar(delta) {
    posicion += delta;
    if (posicion >= 100) {
      posicion = 100;
      pintar();
      cerrar(0);
      return;
    }
    pintar();
  }

  function cerrar(resultado, detalle = { tipo: 'tarde' }) {
    if (!vivo) {
      return;
    }
    vivo = false;
    clearInterval(reloj);
    soltarTeclado();
    boton.disabled = true;
    terminar(resultado, detalle);
  }

  function tirarTp() {
    if (!vivo) {
      return;
    }
    // Llegás donde va a estar el reloj cuando termine la canalización.
    const llegada = posicion + canalizacion;
    const distancia = Math.abs(llegada - centro);
    const escala = ancho / 2 + MARGEN_DISTANCIA;
    cerrar(Math.max(0, 1 - distancia / escala), { tipo: 'distancia', pos: llegada, centro, escala });
  }

  boton.addEventListener('click', tirarTp);
  soltarTeclado = escuchaTeclado((evento) => {
    if (evento.key !== ' ' && evento.key !== 'Enter') {
      return;
    }
    // Si el foco está en el botón, el navegador ya dispara su `click`.
    if (document.activeElement === boton) {
      return;
    }
    evento.preventDefault();
    tirarTp();
  });

  pintar();
  if (reducido) {
    reloj = setInterval(() => avanzar(100 / PASOS), 320);
  } else {
    reloj = setInterval(() => avanzar(1.4), 40);
  }
}
