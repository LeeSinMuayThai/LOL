import { unaSolaVez, ventanaPorStat, escuchaTeclado, marcadorDeRondas, relojDeMinijuego } from './comun.js';

// "El combo" (fase 9R4c). La secuencia aparece un momento y hay que repetirla
// de memoria con el teclado (o con los botones, que son los mismos). `mecanica`
// decide cuánto tiempo la ves: con la mano fina te alcanza con un vistazo.
//
// Es el único de puro teclado, y a propósito: el banco tiene que tener
// mecánicas distintas, no cinco variantes de apretar en el momento justo.

const TECLAS = ['Q', 'W', 'E', 'R'];
const LARGO = 5;

export function montar(container, state, onDone, rngUi) {
  const terminar = unaSolaVez(onDone);
  const msVisible = ventanaPorStat(state.player.stats.mecanica, 900, 2200);

  const secuencia = Array.from({ length: LARGO }, () => TECLAS[Math.floor(rngUi() * TECLAS.length)]);

  container.innerHTML =
    '<div class="minijuego-aviso">Memorizá el combo.</div>'
    + '<div class="minijuego-teclas"></div>';

  const fila = container.querySelector('.minijuego-teclas');
  const aviso = container.querySelector('.minijuego-aviso');
  const marcador = marcadorDeRondas(container);

  const casillas = secuencia.map((tecla) => {
    const casilla = document.createElement('span');
    casilla.className = 'minijuego-tecla';
    casilla.textContent = tecla;
    fila.appendChild(casilla);
    return casilla;
  });

  let paso = 0;
  let aciertos = 0;
  let soltarTeclado = () => {};
  let pararReloj = () => {};

  const botonera = document.createElement('div');
  botonera.className = 'minijuego-cards';
  container.appendChild(botonera);

  function cerrar() {
    pararReloj();
    soltarTeclado();
    botonera.querySelectorAll('button').forEach((boton) => { boton.disabled = true; });
  }

  function jugar(tecla) {
    if (paso >= LARGO) {
      return;
    }
    const correcta = tecla === secuencia[paso];
    casillas[paso].dataset.resultado = correcta ? 'bien' : 'mal';
    casillas[paso].textContent = tecla;
    if (correcta) {
      aciertos += 1;
    }
    paso += 1;
    marcador(`${paso} de ${LARGO}`);
    if (paso >= LARGO) {
      cerrar();
      terminar(aciertos / LARGO);
    }
  }

  function arrancarTurno() {
    aviso.textContent = 'Ahora: repetilo (teclado o botones).';
    casillas.forEach((casilla) => { casilla.textContent = '·'; });
    marcador(`0 de ${LARGO}`);

    TECLAS.forEach((tecla) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'minijuego-btn minijuego-tecla-btn';
      boton.textContent = tecla;
      boton.addEventListener('click', () => jugar(tecla));
      botonera.appendChild(boton);
    });

    soltarTeclado = escuchaTeclado((evento) => {
      const tecla = evento.key.toUpperCase();
      if (!TECLAS.includes(tecla)) {
        return;
      }
      evento.preventDefault();
      jugar(tecla);
    });

    // Si se te va el tiempo, cuenta lo que llevabas hecho: no es un cero.
    pararReloj = relojDeMinijuego(container, 5000, () => {
      if (paso < LARGO) {
        cerrar();
        terminar(aciertos / LARGO);
      }
    });
  }

  setTimeout(arrancarTurno, msVisible);
}
