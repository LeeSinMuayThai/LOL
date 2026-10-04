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

// Fase 10c / K4 (revisión 2): el techo que deja una lesión crónica (`systems/salud.js`) topea la mecánica en TODO
// camino que la sube, no solo en `atributos.js`. `edadCierre.js` resuelve el evento del cierre del año DESPUÉS de
// `atributos.js`, así que un "Mecánica +4" ahí cruzaba el techo hasta el split siguiente (y la marca permanente
// contaba lo que el techo debía recortar). Un efecto que sube no cruza el techo; uno que baja baja igual; si el valor
// ya estaba arriba (la lesión de este split, antes de que `atributos.js` la cobre) no lo sube más ni lo baja acá.
export function conTechoDeLesion(player, stat, antes, despues) {
  if (stat !== 'mecanica' || player.techoLesionMecanica == null) {
    return despues;
  }
  return Math.min(despues, Math.max(antes, player.techoLesionMecanica));
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

// --- K5c-E: el desgaste ---
//
// Pasado el pico (`oculto.edadPico`) más la gracia (`BALANCE.atributos.desgaste.graciaAnios`), los años se cobran lo que
// construiste: los acumulativos pierden un término determinista por split y el bonus permanente decae una fracción.
// Nada de acá consume `rng`, y con las perillas en 0 (el valor del repo) nada se escribe: el juego queda como estaba.
// Las perillas se leen acá adentro, en el momento de usarlas, para que un override en memoria las pise.

// El `origen` de las marcas negativas que deja el desgaste del bonus (es el nombre visible: la ficha lo muestra
// aparte y no lo cuenta entre las decisiones).
export const ORIGEN_DESGASTE = 'Los años';

// Años enteros o fraccionarios pasados de `edadPico + gracia`; 0 hasta que la edad los cruza (nunca negativo).
export function aniosDeDesgaste(edad, oculto) {
  return Math.max(0, edad - (oculto.edadPico + BALANCE.atributos.desgaste.graciaAnios));
}

// Lo que pierde un acumulativo este split. 0 antes de cruzar `edadPico + gracia`; después, la pérdida base del stat
// por el factor `1 + aceleracionPorAnio × años`, que no baja nunca con la edad (con aceleración 0 es constante).
export function perdidaDeAcumulativo(stat, edad, oculto) {
  const d = BALANCE.atributos.desgaste;
  const anios = aniosDeDesgaste(edad, oculto);
  if (anios <= 0) {
    return 0;
  }
  return (d.perdidaPorSplit[stat] ?? 0) * (1 + d.aceleracionPorAnio * anios);
}

// `player.desgaste[stat]`: lo que los años te sacan hoy, un número por stat de curva y por acumulativo, completo con
// ceros desde el estado inicial (T4). Stat de curva: el bonus permanente que se gastó (la suma de las marcas "Los años",
// en positivo). Acumulativo: los puntos que hoy te faltan contra donde estarías sin desgaste (ver `moverStatsAcumulativos`
// en `systems/atributos.js`: es una diferencia neta, no la suma de las pérdidas, porque el stat se recupera solo).
export function desgasteInicial() {
  return Object.fromEntries([...statsDeCurva(), ...Object.keys(BALANCE.atributos.acumulativos)].map((stat) => [stat, 0]));
}

export function desgasteDe(player) {
  return player.desgaste ?? desgasteInicial();
}

export function hayDesgaste(player) {
  return Object.values(desgasteDe(player)).some((valor) => valor > 0);
}

// El bonus permanente decae `fraccionBonusPorSplit` por split pasado el pico más la gracia. Solo el bonus positivo (una
// cicatriz no se cura con la edad). Pasa por `conPermanencia`, el único punto de escritura del bonus, así que lo perdido
// queda como una marca negativa por stat y bonus = Σ marcas sigue valiendo. No consume `rng`.
export function conDesgasteDelBonus(state) {
  const fraccion = BALANCE.atributos.desgaste.fraccionBonusPorSplit;
  if (fraccion === 0 || aniosDeDesgaste(state.age, state.player.oculto) <= 0) {
    return state;
  }
  return statsDeCurva().reduce((st, stat) => {
    const bonus = Math.max(0, bonusDeCurva(st.player, stat));
    const conMarca = conPermanencia(st, stat, -bonus, ORIGEN_DESGASTE, fraccion);
    if (conMarca === st) {
      return st;
    }
    const desgaste = desgasteDe(conMarca.player);
    return { ...conMarca, player: { ...conMarca.player, desgaste: { ...desgaste, [stat]: desgaste[stat] + bonus * fraccion } } };
  }, state);
}
