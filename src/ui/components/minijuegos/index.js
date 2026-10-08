import { montar as montarRobarBaron } from './robarBaron.js';
import { montar as montarLaLlamada } from './laLlamada.js';
import { montar as montarRuedaDePrensa } from './ruedaDePrensa.js';
import { montar as montarLaPrueba } from './laPrueba.js';
// El banco de la fase 9R4c: seis mecánicas más, para que la misma carrera no
// juegue cuatro veces lo mismo. Cada una declara en `minijuegos.json` a qué
// rol y a qué momento entra.
import { montar as montarLastHit } from './lastHit.js';
import { montar as montarElCombo } from './elCombo.js';
import { montar as montarDodge } from './dodge.js';
import { montar as montarLaVision } from './laVision.js';
import { montar as montarElKite } from './elKite.js';
import { montar as montarElTeleport } from './elTeleport.js';

// Los 10 minijuegos (5 de la fase 4, migrados de index.html en la fase T6; (PLAN.md §8.5 los
// dejó sin mover a propósito "porque la fase 12 les cambia la
// presentación" — es acá). Cada uno vive en su propio archivo; este barrel
// es el único punto de entrada para el controlador, mismo patrón que
// `render.js`. (K4, revisión: el bootcamp de antes del internacional se fue con
// su momento `pre_internacional`, que K4 dejó sin pausa.)
export const MONTAR_MINIJUEGO = {
  robar_baron: montarRobarBaron,
  la_llamada: montarLaLlamada,
  rueda_de_prensa: montarRuedaDePrensa,
  la_prueba: montarLaPrueba,
  last_hit: montarLastHit,
  el_combo: montarElCombo,
  dodge: montarDodge,
  la_vision: montarLaVision,
  el_kite: montarElKite,
  el_teleport: montarElTeleport
};

// Fase 9R0b: el motor recibía el `resultado` 0-1 y seguía de largo, así que
// el jugador nunca sabía si había clavado el minijuego. La traducción de ese
// 0-1 a un veredicto ("clavado / parejo / no salió") vive desde 9R4a en
// `core/minijuegos.js`, leyendo los textos del mismo `minijuegos.json` que
// consume el motor: acá había una segunda tabla de frases que podía quedar
// diciendo algo distinto de lo que el log del motor contaba dos líneas después.
import { minijuegoPorId, lecturaDeVentana } from "../../../core/minijuegos.js";

export { veredictoDeMinijuego } from "../../../core/minijuegos.js";
export { marcarHit, marcarMiss } from './comun.js';

// La apuesta, antes de jugar (fase 9R4d). Hasta acá entrabas al minijuego sin
// saber qué te estabas jugando y lo descubrías al terminar, en el beat de
// 9R0b. Qué mueve esta jugada (del catálogo) y qué te da tu hoja para jugarla,
// con el número y su referente (regla de proceso 13).
//
// V3d (PLAN.md §V.4, regla 2 de §V.3): la caja es COMPACTA. A la vista queda lo que se juega: el kicker con la ronda, la
// primera oración de la apuesta y tu hoja. Lo demás (el resto de la apuesta, la vara o la regla y lo que sobra de la
// descripción de la parada) va detrás de un solo "más": ninguna información se saca, solo se pliega.
const NOMBRE_STAT = {
  mecanica: 'mecánica',
  macro: 'macro',
  teamfight: 'teamfight',
  laneo: 'laneo',
  shotcalling: 'shotcalling',
  adaptabilidad: 'adaptabilidad'
};

// [primera oración, resto]: la línea de "qué se juega" y lo que va detrás del "más". La oración termina en un punto, ! o ? seguido
// de un espacio y una mayúscula; si la primera es más corta que MIN_ORACION se le suma la siguiente (dos palabras no dicen qué se juega).
const FIN_DE_ORACION = /[.!?…]["”»)]?\s+(?=[A-ZÁÉÍÓÚÜÑ¿¡"“«(])/g;
const MIN_ORACION = 30;
export function primeraOracion(texto) {
  const limpio = String(texto ?? '').trim();
  for (const m of limpio.matchAll(FIN_DE_ORACION)) {
    if (m.index + 1 >= MIN_ORACION) {
      return [limpio.slice(0, m.index + 1).trim(), limpio.slice(m.index + m[0].length).trim()];
    }
  }
  return [limpio, ''];
}

function el(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

// `opciones.resto`: lo que la parada no mostró de su descripción (el resto de la primera oración), que se pliega acá.
export function crearApuesta(decision, state, { resto = '' } = {}) {
  const caja = el('div', 'minijuego-apuesta');

  const entrada = minijuegoPorId(decision.datos.minijuego);
  const lectura = entrada ? lecturaDeVentana(entrada, state) : null;

  const cabecera = el('div', 'minijuego-apuesta-cabecera');
  if (lectura) {
    cabecera.appendChild(el('span', 'minijuego-apuesta-kicker', `SE JUEGA ${(NOMBRE_STAT[lectura.stat] ?? lectura.stat).toUpperCase()}`));
  }
  if (decision.datos.ronda) {
    const rondaLabel = decision.datos.ronda === 'internacional' ? 'INTERNACIONAL' : (decision.datos.ronda === 'final' ? 'FINAL' : 'SEMIS');
    const difLabel = decision.datos.ronda === 'internacional' ? 'DIFICULTAD MÁXIMA' : (decision.datos.ronda === 'final' ? 'DIFICULTAD ELEVADA' : 'DIFICULTAD ESTÁNDAR');
    cabecera.appendChild(el('span', 'minijuego-apuesta-ronda', `${rondaLabel} · ${difLabel}`));
  }
  if (cabecera.children.length > 0) caja.appendChild(cabecera);

  // La primera oración de la apuesta a la vista; el resto, la regla y el resto de la descripción, detrás del "más".
  const [lineaApuesta, restoApuesta] = primeraOracion(decision.datos.apuesta ?? '');
  if (lineaApuesta) caja.appendChild(el('div', 'minijuego-apuesta-texto', lineaApuesta));

  if (lectura) {
    caja.appendChild(el('span', 'minijuego-apuesta-stat', `Tu ${NOMBRE_STAT[lectura.stat] ?? lectura.stat} ${lectura.valor} · ${lectura.frase}`));
  }

  const plegado = el('div', 'minijuego-apuesta-plegado');
  plegado.hidden = true;
  [resto, restoApuesta].filter(Boolean).forEach((texto) => plegado.appendChild(el('p', 'minijuego-apuesta-resto', texto)));
  if (decision.datos.regla) plegado.appendChild(el('p', 'minijuego-apuesta-regla', decision.datos.regla));
  if (plegado.children.length > 0) {
    const mas = el('button', 'minijuego-mas', 'más');
    mas.type = 'button';
    mas.setAttribute('aria-expanded', 'false');
    mas.addEventListener('click', () => {
      const abrir = mas.getAttribute('aria-expanded') !== 'true';
      mas.setAttribute('aria-expanded', String(abrir));
      mas.textContent = abrir ? 'menos' : 'más';
      plegado.hidden = !abrir;
    });
    caja.append(mas, plegado);
  }
  return caja;
}
