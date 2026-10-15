import { motionReducido, unaSolaVez, ventanaPorStat, escuchaTeclado, dificultadDe, AMORTIGUACION_DIFICULTAD } from './comun.js';

// "La corrida" (G1, PLANUI §0.9, "Variedad"): una mecánica universal, de cualquier rol. La barra corre de punta a punta
// y frenás en la zona: cuatro frenadas, cada una un poco más rápida que la anterior (como "cada partido, más larga y más
// rápida" de La seña del DT). La zona la agranda `mecanica`. El resultado es la fracción de frenadas en la zona, así la
// vara se dice en frenadas ("necesitás 3 de 4", `g1.js`).
//
// Contrato de T6: `montar(container, state, onDone, rngUi, datos)` → `onDone(0..1, detalle)`. `detalle` es la última
// frenada que se fue de la zona (o la última, si las clavaste todas): la zona y dónde frenaste, para el "tan cerca".

export const FRENADAS = 4;
// El ancho de la zona (en la escala 0-100 de la barra), entre estos topes según `mecanica`.
const ANCHO_ZONA = [9, 22];
// Lo que corre el cursor por cuadro en la primera frenada, y cuánto más rápido va cada frenada siguiente.
const VELOCIDAD_BASE = 1.35;
const ACELERACION_POR_FRENADA = 0.14;
// Dónde puede caer el centro de la zona (para que nunca quede pegada a una punta).
const CENTRO_ZONA = [18, 82];
// Con motion reducido el cursor salta de escalón en escalón, con el número a la vista.
const PASOS_REDUCIDO = 20;
const MS_PASO_REDUCIDO = 300;
// La pausa entre una frenada y la siguiente (lo que tarda en leerse si entró o no).
const PAUSA_ENTRE_FRENADAS_MS = 520;

export function montar(container, state, onDone, rngUi, datos = null) {
  const terminar = unaSolaVez(onDone);
  const dificultad = dificultadDe(state, datos);
  const ancho = ventanaPorStat(state.player.stats.mecanica, ANCHO_ZONA[0], ANCHO_ZONA[1], dificultad);
  const reducido = motionReducido();

  container.innerHTML =
    '<div class="minijuego-aviso">Frená en la zona</div>'
    + '<div class="mj-corrida-pips" aria-hidden="true"></div>'
    + '<div class="minijuego-barra mj-corrida-barra"><div class="minijuego-zona"></div><div class="minijuego-marcador"></div></div>'
    + '<button type="button" class="minijuego-btn">¡Frená!</button>'
    + '<div class="minijuego-aim-info">Click, Espacio o Enter.</div>';

  const zona = container.querySelector('.minijuego-zona');
  const cursor = container.querySelector('.minijuego-marcador');
  const boton = container.querySelector('.minijuego-btn');
  const info = container.querySelector('.minijuego-aim-info');
  const pips = container.querySelector('.mj-corrida-pips');
  const marcas = Array.from({ length: FRENADAS }, () => {
    const pip = document.createElement('i');
    pips.appendChild(pip);
    return pip;
  });

  let frenada = 0;
  let adentro = 0;
  let pos = 0;
  let dir = 1;
  let vivo = false;
  let centro = 50;
  let reloj = null;
  let ultima = null;
  let soltarTeclado = () => {};

  function pintar() {
    cursor.style.left = `${pos}%`;
    if (reducido) cursor.textContent = String(Math.round(pos));
  }

  function avanzar(paso) {
    pos += dir * paso;
    if (pos >= 100) { pos = 100; dir = -1; }
    if (pos <= 0) { pos = 0; dir = 1; }
    pintar();
  }

  function arrancarFrenada() {
    centro = CENTRO_ZONA[0] + rngUi() * (CENTRO_ZONA[1] - CENTRO_ZONA[0]);
    zona.style.left = `${centro - ancho / 2}%`;
    zona.style.width = `${ancho}%`;
    container.dataset.frenada = '';
    marcas[frenada].dataset.estado = 'actual';
    pos = rngUi() < 0.5 ? 0 : 100;
    dir = pos === 0 ? 1 : -1;
    pintar();
    vivo = true;
    boton.disabled = false;
    const velocidad = VELOCIDAD_BASE * (1 + ACELERACION_POR_FRENADA * frenada) * (1 + (dificultad - 1) * AMORTIGUACION_DIFICULTAD);
    if (reducido) {
      reloj = setInterval(() => avanzar(100 / PASOS_REDUCIDO), MS_PASO_REDUCIDO);
    } else {
      const cuadro = () => {
        if (!vivo) return;
        avanzar(velocidad);
        requestAnimationFrame(cuadro);
      };
      requestAnimationFrame(cuadro);
    }
  }

  function frenar() {
    if (!vivo) return;
    vivo = false;
    clearInterval(reloj);
    boton.disabled = true;
    const desde = centro - ancho / 2;
    const hasta = centro + ancho / 2;
    const entro = pos >= desde && pos <= hasta;
    if (entro) adentro += 1;
    marcas[frenada].dataset.estado = entro ? 'bien' : 'mal';
    zona.dataset.resultado = entro ? 'bien' : 'mal';
    const jugada = { tipo: 'zona', zona: [desde, hasta], frenaste: pos };
    if (!entro || !ultima || ultima.entro) ultima = { ...jugada, entro };
    info.textContent = `En la zona: ${adentro} de ${frenada + 1}`;
    frenada += 1;
    if (frenada >= FRENADAS) {
      soltarTeclado();
      terminar(adentro / FRENADAS, ultima);
      return;
    }
    setTimeout(() => {
      delete zona.dataset.resultado;
      arrancarFrenada();
    }, PAUSA_ENTRE_FRENADAS_MS);
  }

  boton.addEventListener('click', frenar);
  soltarTeclado = escuchaTeclado((evento) => {
    if (evento.key !== ' ' && evento.key !== 'Enter') return;
    // con el foco en el botón, el navegador ya dispara su `click`
    if (document.activeElement === boton) return;
    evento.preventDefault();
    frenar();
  });

  arrancarFrenada();
  boton.focus({ preventScroll: true });
}
