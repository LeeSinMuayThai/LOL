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
export { veredictoDeMinijuego } from "../../../core/minijuegos.js";
