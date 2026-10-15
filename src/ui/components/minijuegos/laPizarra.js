import { unaSolaVez, ventanaPorStat, dificultadDe, marcadorDeRondas } from './comun.js';

// "La pizarra del rival" (G1, PLANUI §0.9, "Variedad"): una mecánica universal, de cualquier rol. El analista te muestra
// la pizarra del rival un instante (las jugadas que repite) y después se da vuelta: armás los pares de memoria. Cada par
// que no es, un error. Cuánto la ves lo abre `macro`; el VOD del Profesional (`dificultadDe`) te la deja ver más.
//
// El resultado es `1 - errores / TOPE_ERRORES`, así la vara se dice en errores ("podés errar 2 veces", `g1.js`). Con más
// errores que el tope, la pizarra se cierra.
//
// Contrato de T6: `montar(container, state, onDone, rngUi, datos)` → `onDone(0..1, { tipo: 'errores', errores })`.

export const PARES = 6;
export const TOPE_ERRORES = 8;
// Cuánto se ve la pizarra antes de darse vuelta (ms), entre estos topes según `macro`.
const VISTA_MS = [1300, 2800];
// Lo que queda a la vista un par que no era, antes de darse vuelta.
const ERROR_MS = 650;
// Las jugadas del rival (lo que se lee en la carta). Salen `PARES` de acá, mezcladas con `rngUi`.
const JUGADAS = [
  'Dive bot 3\'', 'Invade nivel 1', 'Drake 5\'', 'Herald top', 'Swap de lanes', 'Lane freeze',
  'Gank por río', 'Split top', 'Vision en tri', 'Baron 20\'', 'Roam del mid', 'Counter jungle'
];

export function montar(container, state, onDone, rngUi, datos = null) {
  const terminar = unaSolaVez(onDone);
  const dificultad = dificultadDe(state, datos);
  const vistaMs = ventanaPorStat(state.player.stats.macro, VISTA_MS[0], VISTA_MS[1], dificultad);

  // las jugadas de esta pizarra y las cartas (dos de cada una), mezcladas con el RNG de la interfaz
  const mezclar = (lista) => {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rngUi() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  };
  const jugadas = mezclar(JUGADAS).slice(0, PARES);
  const cartas = mezclar([...jugadas, ...jugadas]);

  container.innerHTML =
    '<div class="minijuego-aviso">Mirá la pizarra del rival</div>'
    + '<div class="mj-pizarra" role="group" aria-label="La pizarra del rival"></div>';
  const aviso = container.querySelector('.minijuego-aviso');
  const tablero = container.querySelector('.mj-pizarra');
  const marcador = marcadorDeRondas(container);

  const botones = cartas.map((jugada, i) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'mj-pizarra-carta';
    boton.dataset.estado = 'vista';
    boton.disabled = true;
    boton.innerHTML = `<span class="mj-pizarra-dorso" aria-hidden="true">${i + 1}</span><span class="mj-pizarra-cara">${jugada}</span>`;
    boton.setAttribute('aria-label', `Carta ${i + 1}`);
    tablero.appendChild(boton);
    return { boton, jugada };
  });

  let errores = 0;
  let pares = 0;
  let abierta = null;
  let ocupado = false;

  function cerrar() {
    botones.forEach(({ boton }) => { boton.disabled = true; });
    terminar(Math.max(0, 1 - errores / TOPE_ERRORES), { tipo: 'errores', errores });
  }

  function contar() {
    marcador(`Pares: ${pares} de ${PARES} · errores: ${errores}`);
  }

  function dar(carta) {
    if (ocupado || carta.boton.dataset.estado !== 'tapada') return;
    carta.boton.dataset.estado = 'abierta';
    carta.boton.setAttribute('aria-label', carta.jugada);
    if (!abierta) {
      abierta = carta;
      return;
    }
    const otra = abierta;
    abierta = null;
    if (otra.jugada === carta.jugada) {
      otra.boton.dataset.estado = 'par';
      carta.boton.dataset.estado = 'par';
      otra.boton.disabled = true;
      carta.boton.disabled = true;
      pares += 1;
      contar();
      if (pares >= PARES) cerrar();
      return;
    }
    errores += 1;
    contar();
    ocupado = true;
    otra.boton.dataset.estado = 'error';
    carta.boton.dataset.estado = 'error';
    setTimeout(() => {
      ocupado = false;
      if (errores > TOPE_ERRORES) {
        cerrar();
        return;
      }
      for (const c of [otra, carta]) {
        c.boton.dataset.estado = 'tapada';
        c.boton.setAttribute('aria-label', `Carta ${botones.indexOf(c) + 1}`);
      }
    }, ERROR_MS);
  }

  botones.forEach((carta) => carta.boton.addEventListener('click', () => dar(carta)));
  contar();

  // la pizarra a la vista, y después se da vuelta
  setTimeout(() => {
    aviso.textContent = 'Armá los pares de memoria';
    botones.forEach(({ boton }) => {
      boton.dataset.estado = 'tapada';
      boton.disabled = false;
    });
    botones[0].boton.focus({ preventScroll: true });
  }, vistaMs);
}
