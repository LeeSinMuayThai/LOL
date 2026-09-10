import { montar as montarRobarBaron } from './robarBaron.js';
import { montar as montarLaLlamada } from './laLlamada.js';
import { montar as montarBootcamp } from './bootcamp.js';
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

// Los 11 minijuegos (5 de la fase 4, migrados de index.html en la fase T6; (PLAN.md §8.5 los
// dejó sin mover a propósito "porque la fase 12 les cambia la
// presentación" — es acá). Cada uno vive en su propio archivo; este barrel
// es el único punto de entrada para el controlador, mismo patrón que
// `render.js`.
export const MONTAR_MINIJUEGO = {
  robar_baron: montarRobarBaron,
  la_llamada: montarLaLlamada,
  bootcamp: montarBootcamp,
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
// 9R0b. Son dos líneas: qué mueve esta jugada (del catálogo) y qué te da tu
// hoja para jugarla, con el número y su referente (regla de proceso 13).
const NOMBRE_STAT = {
  mecanica: 'mecánica',
  macro: 'macro',
  teamfight: 'teamfight',
  laneo: 'laneo',
  shotcalling: 'shotcalling',
  adaptabilidad: 'adaptabilidad'
};

export function crearApuesta(decision, state) {
  const caja = document.createElement('div');
  caja.className = 'minijuego-apuesta';

  const entrada = minijuegoPorId(decision.datos.minijuego);
  const lectura = entrada ? lecturaDeVentana(entrada, state) : null;
  if (lectura) {
    const kicker = document.createElement('div');
    kicker.className = 'minijuego-apuesta-kicker';
    kicker.textContent = `SE JUEGA ${(NOMBRE_STAT[lectura.stat] ?? lectura.stat).toUpperCase()}`;
    caja.appendChild(kicker);
  }

  if (decision.datos.apuesta) {
    const texto = document.createElement('div');
    texto.textContent = decision.datos.apuesta;
    caja.appendChild(texto);
  }

  if (lectura) {
    const linea = document.createElement('span');
    linea.className = 'minijuego-apuesta-stat';
    linea.textContent = `Tu ${NOMBRE_STAT[lectura.stat] ?? lectura.stat} ${lectura.valor} · ${lectura.frase}`;
    caja.appendChild(linea);
  }
  return caja;
}
