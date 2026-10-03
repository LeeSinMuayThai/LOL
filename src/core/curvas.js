import { BALANCE } from '../data/balance.js';
import { clamp, clampStat } from './numeros.js';
import { registrarMarca } from './registro.js';

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

// --- K3-B: los efectos que duran ---
//
// `player.bonusPermanente[stat]` es lo que una decisión le suma al objetivo al que converge la curva de edad
// (`systems/atributos.js`: `objetivo + bonus`). Un campo por stat de curva, completo con ceros desde el estado
// inicial (T4). Con `BALANCE.atributos.fraccionPermanente` en 0 (el valor neutro: el juego queda como estaba) no
// se escribe nada, ni el bonus ni la marca del registro.
export function statsDeCurva() {
  return Object.keys(BALANCE.atributos.curvas);
}

export function bonusPermanenteInicial() {
  return Object.fromEntries(statsDeCurva().map((stat) => [stat, 0]));
}

export function bonusDeCurva(player, stat) {
  return player.bonusPermanente?.[stat] ?? 0;
}

// El único punto donde un efecto se vuelve permanente: `delta` es lo que el efecto movió de verdad sobre `stat`.
// Si `stat` es de curva, una fracción del delta va al bonus y la marca (`origen` es el nombre visible del evento o
// de la decisión, nunca un id) se anota en el registro por su único punto de escritura. No consume `rng`.
// `fraccion` es la de los eventos y decisiones por defecto; la práctica (`systems/practica.js`) pasa la suya,
// `fraccionPermanentePractica` (K3-B 2b).
export function conPermanencia(state, stat, delta, origen, fraccion = BALANCE.atributos.fraccionPermanente) {
  const parte = fraccion * delta;
  if (parte === 0 || !statsDeCurva().includes(stat)) {
    return state;
  }
  const marca = { stat, delta: parte, origen, anio: state.calendario.anio };
  return {
    ...state,
    player: {
      ...state.player,
      bonusPermanente: { ...state.player.bonusPermanente, [stat]: bonusDeCurva(state.player, stat) + parte }
    },
    career: { ...state.career, registro: registrarMarca(state.career.registro, marca) }
  };
}

// Las rutinas del jugador (el offseason de `systems/practica.js` y la semana amateur de `systems/amateur.js`)
// dejan marca por el mismo camino: `state` ya trae los stats de después y `statsAntes` los de antes. Solo cuentan las
// GANANCIAS reales (ya con el clamp y el techo de lesión): lo que un techo recorta no es una pérdida de la práctica.
// La fracción es la propia de la práctica (`fraccionPermanentePractica`) y `origen` el título visible de la rutina.
// `conPermanencia` ignora los stats que no son de curva.
export function conMarcasDeRutina(state, statsAntes, origen) {
  return Object.keys(state.player.stats).reduce((st, stat) => conPermanencia(
    st, stat, Math.max(0, state.player.stats[stat] - (statsAntes[stat] ?? state.player.stats[stat])), origen,
    BALANCE.atributos.fraccionPermanentePractica
  ), state);
}
