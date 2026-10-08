// La parada del minijuego (FASE V, V2-A): el flujo que vivía en `app.js` — la consigna, la charla del coach, el botón
// "¡Vamos!", el minijuego en sí y el veredicto — mudado tal cual a su propio archivo, sin cambio de comportamiento: mismo
// DOM, mismo texto, mismos tiempos. `app.js` lo llama donde antes llamaba a su `mostrarMinijuego`.
//
// Los 5 minijuegos (fase 4) se migraron a `src/ui/components/minijuegos/` en la fase T6 — PLAN.md §8.5 los dejó sin mover a
// propósito "porque la fase 12 les cambia la presentación". Import estático: son livianos y no necesitan el manejo de
// error de `cargarModulos()` (esa ruta existe por si `location.protocol === 'file:'`, que ya rompe mucho antes).
import { MONTAR_MINIJUEGO, veredictoDeMinijuego, crearApuesta, marcarHit, marcarMiss } from '../components/minijuegos/index.js';
import { previaDeDecision } from '../../core/previaDePartido.js';
import { probabilidadDeFirmarTrasPrueba, veredictoDeLaPrueba } from '../../core/serie.js';
import { porcentaje } from '../../core/formato.js';

// `contenedor` es el panel `#minijuego` (con `#minijuegoTitle`, `#minijuegoDesc`, `#minijuegoApuesta` y `#minijuegoWidget`
// adentro). Lo demás llega de `app.js`:
//   estado        el state de la carrera en este momento.
//   rngUi         el RNG de la interfaz (el que ponen los minijuegos; el motor no lo ve).
//   responder     manda la respuesta de la pausa al motor ({ resultado } o { resultado, charla }).
//   renderPrevia  pinta la previa del partido (K2d) y devuelve la previa (o null).
export function mostrar(contenedor, decision, { estado, rngUi, responder, renderPrevia }) {
  const estadoActual = estado;
  const minijuegoTitle = contenedor.querySelector('#minijuegoTitle');
  const minijuegoDesc = contenedor.querySelector('#minijuegoDesc');
  const minijuegoApuesta = contenedor.querySelector('#minijuegoApuesta');
  const minijuegoWidget = contenedor.querySelector('#minijuegoWidget');

  contenedor.hidden = false;
  minijuegoTitle.textContent = decision.titulo;
  minijuegoDesc.textContent = decision.descripcion;
  // Fase 9R4d: qué se juega, ANTES de jugarlo.
  minijuegoApuesta.replaceChildren(crearApuesta(decision, estadoActual));
  minijuegoWidget.innerHTML = '';

  // K4-B: en el mapa decisivo, si te queda la charla del coach de la temporada, se elige antes de jugar: cada botón
  // dice con cuánto llegás (la previa de arriba cambia con la elección, y es la p que se tira).
  if (decision.datos.charla?.disponible) {
    const conCharla = previaDeDecision(estadoActual, decision, { charla: true });
    const sinCharla = previaDeDecision(estadoActual, decision, { charla: false });
    const eleccion = document.createElement('div');
    eleccion.className = 'minijuego-charla';
    const pregunta = document.createElement('p');
    pregunta.className = 'minijuego-charla-pregunta';
    pregunta.textContent = 'Te queda la charla del coach de esta temporada. ¿La usa antes de este mapa?';
    eleccion.appendChild(pregunta);
    [
      { charla: true, label: 'Que hable el coach ahora', previa: conCharla },
      { charla: false, label: 'Guardarla para después', previa: sinCharla }
    ].forEach((opcion) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'option-btn';
      boton.textContent = opcion.previa ? `${opcion.label} · ${opcion.previa.porcentaje}% de ganar` : opcion.label;
      boton.addEventListener('click', () => {
        renderPrevia(decision, estadoActual, { charla: opcion.charla });
        minijuegoWidget.innerHTML = '';
        montarMinijuego(opcion.charla);
      });
      eleccion.appendChild(boton);
    });
    minijuegoWidget.appendChild(eleccion);
    return;
  }
  montarMinijuego(false);

  // K6a-U ("hacés un clic y perdiste", y peor, con cero clics): el minijuego NO arranca solo. Mostraba la carta y los
  // blancos de 900 ms ya corrían mientras el jugador leía la consigna. Ahora la consigna queda a la vista y el reloj
  // espera un botón; el minijuego se monta recién con el clic.
  function montarMinijuego(charla) {
    minijuegoWidget.innerHTML = '';
    const espera = document.createElement('div');
    espera.className = 'minijuego-espera';
    const nota = document.createElement('p');
    nota.className = 'minijuego-espera-nota';
    nota.textContent = 'Leé la consigna. El reloj no arranca hasta que toques el botón.';
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'option-btn minijuego-espera-boton';
    boton.textContent = '¡Vamos!';
    boton.addEventListener('click', () => {
      // El arranque va en el turno siguiente: con Enter, el mismo `keydown` que apretó el botón llegaría al
      // listener de teclado que el minijuego instala al montarse y contaría como una jugada.
      setTimeout(() => arrancarMinijuego(charla), 0);
    }, { once: true });
    espera.append(nota, boton);
    minijuegoWidget.appendChild(espera);
    traerAlaVista(minijuegoWidget);
  }

  // El panel del minijuego puede montarse con la página scrolleada al feed: sin esto el reloj corría fuera de vista.
  function traerAlaVista(elemento) {
    elemento.scrollIntoView?.({ block: 'nearest' });
  }

  function arrancarMinijuego(charla) {
    minijuegoWidget.innerHTML = '';
    const montar = MONTAR_MINIJUEGO[decision.datos.minijuego];
    let resuelto = false;
    montar(minijuegoWidget, estadoActual, (resultado) => {
      if (resuelto) {
        return;
      }
      resuelto = true;
      // K2d: la p final del mapa, ya corrida por el minijuego: la que se tira.
      const previaFinal = renderPrevia(decision, estadoActual, { resultadoMinijuego: resultado, charla });
      // K4c-S (regla 15): la prueba decide el contrato, y la pantalla dice con qué probabilidad. K6c: la del amateur trae su vara
      // (`datos.vara`, de tu nivel contra el del club) y no tira dado: la pantalla dice "Te firman" o por cuánto no llegaste, con
      // la misma cuenta y la misma vara que el motor (`veredictoDeLaPrueba`). La del mercado sigue con su probabilidad.
      const conVara = decision.datos.momento === 'tryout' && decision.datos.vara !== undefined;
      const laPrueba = conVara ? veredictoDeLaPrueba(resultado, decision.datos.vara) : null;
      const pFirma = decision.datos.momento === 'tryout' && !conVara ? probabilidadDeFirmarTrasPrueba(resultado) : null;
      // K6c: con la vara el resultado ya está decidido: la frase sale de `veredictosConVara` del dato (sin el "si te firman" de
      // la prueba del mercado) y, si no llegaste, no hay frase: manda la línea de la vara.
      const v = veredictoDeMinijuego(decision.datos.minijuego, resultado, estadoActual, laPrueba ? { pasa: laPrueba.pasa } : {});
      if (resultado >= 0.67) marcarHit(minijuegoWidget);
      else if (resultado <= 0.33) marcarMiss(minijuegoWidget);
      minijuegoWidget.innerHTML =
        '<div class="minijuego-resultado minijuego-resultado--' + v.nivel + '">'
        + '<div class="minijuego-resultado-titulo">' + v.titulo + '</div>'
        + '<div class="minijuego-resultado-detalle">' + v.detalle + '</div>'
        // K2d: la misma p que muestra la tarjeta de la previa (que queda arriba del widget).
        + (previaFinal ? '<div class="minijuego-resultado-p">Con esto: ' + previaFinal.porcentaje + '% de ganar</div>' : '')
        + (pFirma !== null ? '<div class="minijuego-resultado-p">Con esto: ' + porcentaje(pFirma) + ' de que te firmen</div>' : '')
        + (laPrueba ? '<div class="minijuego-resultado-p minijuego-resultado-vara">' + (laPrueba.pasa
          ? (laPrueba.vara === 0
            // K6c-fix: con la vara en 0 tu nivel ya alcanzaba (la misma línea que el log de `resolverLaPrueba`).
            ? 'Te firman: con tu nivel, la vara era 0% (sacaste ' + laPrueba.sacaste + '%).'
            : 'Te firman: sacaste ' + laPrueba.sacaste + '% y la vara era ' + laPrueba.vara + '%.')
          : 'No llegaste: te faltó ' + laPrueba.falta + '% (sacaste ' + laPrueba.sacaste + '%, la vara era ' + laPrueba.vara + '%).') + '</div>' : '')
        + '</div>';
      setTimeout(() => responder(decision.datos.charla?.disponible ? { resultado, charla } : { resultado }), 1600);
    }, rngUi, decision.datos);

    traerAlaVista(minijuegoWidget);
  }
}
