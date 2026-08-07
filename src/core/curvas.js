import { BALANCE } from '../data/balance.js';
import { clamp, clampStat } from './numeros.js';

// La forma de carrera, en una funcion. La comparten la generacion del mundo
// (para que los stats iniciales sean coherentes con la curva que te toco) y el
// sistema de atributos (para que la sigan split a split).
//
// Ninguna transicion es abrupta y ningun umbral es una puerta: el jugador no
// ve la curva, la intuye por como crece y por cuando deja de crecer.

// Techo real de un stat de manos: el potencial oculto, corrido por la amplitud
// de la forma de carrera y por los splits que ya jugaste.
export function techoDeCarrera(oculto, splitsJugados = 0) {
  const a = BALANCE.atributos;
  const forma = BALANCE.formasCarrera[oculto.formaCarrera];
  const bonus = Math.min(a.bonusMaximo, splitsJugados * a.bonusPorSplit);

  return clampStat(oculto.potencial * forma.amplitud + bonus);
}

// Nivel al que "deberia" estar un stat de manos a esta edad. `declive` modula
// cuanto le pega la caida despues del pico: 1 para la mecanica pura, menos para
// lo que es en parte conocimiento.
export function nivelDeCurva(edad, oculto, { declive = 1, splitsJugados = 0 } = {}) {
  const a = BALANCE.atributos;
  const forma = BALANCE.formasCarrera[oculto.formaCarrera];
  const techo = techoDeCarrera(oculto, splitsJugados);

  const factor = edad <= oculto.edadPico
    ? clamp(1 - ((oculto.edadPico - edad) / a.anchoSubida) ** 2, 0, 1)
    : clamp(1 - forma.caida * declive * ((edad - oculto.edadPico) / a.anchoBajada) ** 2, a.factorMinimo, 1);

  return techo * (a.pisoJuvenil + (1 - a.pisoJuvenil) * factor);
}
