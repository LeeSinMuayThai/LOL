import { motionReducido, unaSolaVez, ventanaPorStat, escuchaTeclado, marcadorDeRondas } from './comun.js';

// "Last hit" (fase 9R4c). El minion baja de vida solo; el remate entra si le
// pegás cuando ya está en zona de ejecución. Muy temprano no lo matás, muy
// tarde te lo come la ola. La zona la abre `laneo` — un top de 90 remata
// cómodo, uno de 30 tiene que clavarlo.
//
// Contrato de T6: `montar(container, state, onDone, rngUi)` → `onDone(0..1)`.

const TOTAL = 5;
const TECLAS = ['1', '2', '3', '4', '5'];

export function montar(container, state, onDone, rngUi) {
  const terminar = unaSolaVez(onDone);
  const ventana = ventanaPorStat(state.player.stats.laneo, 14, 34);
  const reducido = motionReducido();

  container.innerHTML =
    '<div class="minijuego-aviso">Rematalos en zona de ejecución</div>'
    + '<div class="minijuego-aim-info">Click, Enter o el número del minion.</div>'
    + '<div class="minijuego-ola"></div>';

  const ola = container.querySelector('.minijuego-ola');
  const marcador = marcadorDeRondas(container);

  const minions = TECLAS.map((tecla, i) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'minijuego-minion';
    boton.disabled = true;
    boton.innerHTML =
      '<span class="minijuego-minion-hp"></span>'
      + `<span class="minijuego-minion-num">${tecla}</span>`;
    ola.appendChild(boton);
    return { boton, hp: boton.querySelector('.minijuego-minion-hp'), i };
  });

  let indice = -1;
  let aciertos = 0;
  let vida = 100;
  let caida = 2.2;
  let reloj = null;
  let soltarTeclado = () => {};

  function pintar(minion) {
    if (reducido) {
      minion.hp.textContent = `${Math.round(vida)}`;
    } else {
      minion.hp.style.height = `${Math.max(0, vida)}%`;
    }
    minion.boton.dataset.zona = vida <= ventana ? 'ejecucion' : 'sano';
  }

  function cerrar() {
    clearInterval(reloj);
    soltarTeclado();
    minions.forEach((minion) => { minion.boton.disabled = true; });
  }

  function resolver(acerto) {
    const minion = minions[indice];
    if (!minion || minion.boton.disabled) {
      return;
    }
    minion.boton.dataset.resultado = acerto ? 'bien' : 'mal';
    minion.boton.disabled = true;
    if (acerto) {
      aciertos += 1;
    }
    clearInterval(reloj);
    siguiente();
  }

  function siguiente() {
    indice += 1;
    marcador(`Minions rematados: ${aciertos} de ${TOTAL}`);
    if (indice >= TOTAL) {
      cerrar();
      terminar(aciertos / TOTAL);
      return;
    }

    const minion = minions[indice];
    minion.boton.disabled = false;
    minion.boton.focus();
    vida = 100;
    // Cada minion baja distinto: el ritmo sale de `rngUi`, el stream de la UI
    // (regla invariable 1 — nunca `Math.random`, nunca el `rng` del motor).
    caida = 1.6 + rngUi() * 1.6;
    pintar(minion);

    reloj = setInterval(() => {
      vida -= caida * (reducido ? 3 : 1);
      pintar(minion);
      if (vida <= 0) {
        resolver(false);
      }
    }, reducido ? 150 : 50);
  }

  minions.forEach((minion) => {
    minion.boton.addEventListener('click', () => {
      if (minion.i !== indice) {
        return;
      }
      resolver(vida <= ventana);
    });
  });

  // Solo los números: Enter y espacio ya disparan el `click` del botón que
  // tiene el foco, y engancharlos acá también remataría dos veces.
  soltarTeclado = escuchaTeclado((evento) => {
    if (evento.key !== TECLAS[indice]) {
      return;
    }
    evento.preventDefault();
    resolver(vida <= ventana);
  });

  siguiente();
}
