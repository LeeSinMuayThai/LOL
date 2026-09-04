import { montar as montarRobarBaron } from './robarBaron.js';
import { montar as montarLaLlamada } from './laLlamada.js';
import { montar as montarBootcamp } from './bootcamp.js';
import { montar as montarRuedaDePrensa } from './ruedaDePrensa.js';
import { montar as montarLaPrueba } from './laPrueba.js';

// Los 5 minijuegos, migrados de index.html en la fase T6 (PLAN.md §8.5 los
// dejó sin mover a propósito "porque la fase 12 les cambia la
// presentación" — es acá). Cada uno vive en su propio archivo; este barrel
// es el único punto de entrada para el controlador, mismo patrón que
// `render.js`.
export const MONTAR_MINIJUEGO = {
  robar_baron: montarRobarBaron,
  la_llamada: montarLaLlamada,
  bootcamp: montarBootcamp,
  rueda_de_prensa: montarRuedaDePrensa,
  la_prueba: montarLaPrueba
};

// Fase 9R0b: el motor recibía el `resultado` 0-1 y seguía de largo, así que
// el jugador nunca sabía si había clavado el minijuego. Esto traduce el
// 0-1 a un veredicto ("clavado / parejo / no salió") y la consecuencia
// concreta, en el tono de los logs que el motor emite después. No toca el
// motor: el `resultado` que se le pasa es el mismo.
const RESULTADO_MINIJUEGO = {
  robar_baron: {
    bien: 'El Barón es tuyo: el mapa se te va a favor.',
    parejo: 'Lo smiteás justo, sin sacar ventaja clara.',
    mal: 'Te roban el Barón: el mapa se complica.'
  },
  la_llamada: {
    bien: 'La llamada sale y todos te siguen: el mapa se inclina para tu lado.',
    parejo: 'La jugada sale a medias, sin cambiar mucho.',
    mal: 'Nadie reacciona a tiempo: el mapa se complica.'
  },
  bootcamp: {
    bien: 'El bootcamp rindió: llegás mejor preparado.',
    parejo: 'El bootcamp fue parejo, no alcanzó a pulir todo.',
    mal: 'El bootcamp se hizo cuesta arriba: llegás justo.'
  },
  rueda_de_prensa: {
    bien: 'El tono cae justo: el vestuario y la prensa lo toman bien.',
    parejo: 'La rueda de prensa pasa sin pena ni gloria.',
    mal: 'El tono no fue el mejor: la nota sale rara.'
  },
  la_prueba: {
    bien: 'Impresionaste en el tryout: entrás con crédito.',
    parejo: 'El tryout fue correcto, sin más.',
    mal: 'El tryout no terminó de convencer.'
  }
};

export function veredictoMinijuego(minijuegoId, resultado) {
  const nivel = resultado >= 0.72 ? 'bien' : resultado >= 0.42 ? 'parejo' : 'mal';
  const titulo = nivel === 'bien' ? '¡Clavado!' : nivel === 'parejo' ? 'Salió parejo' : 'No salió';
  const porTipo = RESULTADO_MINIJUEGO[minijuegoId] ?? {
    bien: 'Salió bien.', parejo: 'Salió parejo.', mal: 'No salió.'
  };
  return { nivel, titulo, detalle: porTipo[nivel] };
}
