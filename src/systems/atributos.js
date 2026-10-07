import { gauss, chance } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { deltaCorto, entero } from '../core/formato.js';
import { clamp, clampStat } from '../core/numeros.js';
import {
  nivelDeCurva, techoDeCarrera, bonusDeCurva, perdidaDeAcumulativo, desgasteDe, hayDesgaste, conDesgasteDelBonus
} from '../core/curvas.js';
import { nivelDelJugador } from '../core/ficha.js';
import { registrarPicoNivel } from '../core/registro.js';
import { mentalidadHaciaSuBase, recuperarPorDescanso } from '../core/barras.js';
import { BALANCE } from '../data/balance.js';

export const id = 'atributos';

// La forma deriva sola con memoria: por eso las rachas duran varios splits en
// vez de titilar. El jugador nunca ve este numero.
function derivarForma(state, rng) {
  const a = BALANCE.atributos;
  const siguiente = state.player.oculto.forma * a.formaPersistencia + gauss(0, a.formaShock, rng);
  return clamp(siguiente, -a.formaMax, a.formaMax);
}

function moverStatsDeCurva(stats, state, forma, rng) {
  const a = BALANCE.atributos;
  const { oculto } = state.player;
  const splitsJugados = state.player.splitCount;
  const movidos = { ...stats };

  for (const [stat, config] of Object.entries(a.curvas)) {
    // K3-B: la curva converge a `objetivo + bonusPermanente[stat]` (lo que las decisiones dejaron; 0 = como siempre).
    const objetivo = nivelDeCurva(state.age, oculto, { declive: config.declive, splitsJugados })
      * (1 + forma * a.formaAmplitud) + bonusDeCurva(state.player, stat);

    // Converge hacia el objetivo en vez de saltar: el declive nunca se anuncia,
    // se nota recien cuando ya lleva un par de splits pasando.
    const delta = (objetivo - movidos[stat]) * config.velocidad + gauss(0, config.ruido, rng);
    movidos[stat] = clampStat(movidos[stat] + delta);

    // Fase 10c: una lesión crónica (`systems/salud.js`) topea la mecánica —
    // solo la mecánica, es de manos, no de lectura de juego, así que no se
    // toca `techoDeCarrera` (que hoy comparte un solo techo entre los tres
    // stats de curva). El objetivo de la curva puede seguir moviéndose, pero
    // el valor movido nunca vuelve a cruzar el techo: por eso la caída queda.
    if (stat === 'mecanica' && state.player.techoLesionMecanica != null) {
      movidos[stat] = Math.min(movidos[stat], state.player.techoLesionMecanica);
    }
  }

  return movidos;
}

// K5c-E: devuelve los stats movidos y `desgaste`, lo que los años te sacan hoy de cada acumulativo.
function moverStatsAcumulativos(stats, state, rng) {
  const a = BALANCE.atributos;
  const techo = clampStat(techoDeCarrera(state.player.oculto, state.player.splitCount) + a.techoAcumulativoBonus);
  const movidos = { ...stats };
  const desgaste = { ...desgasteDe(state.player) };

  for (const [stat, config] of Object.entries(a.acumulativos)) {
    // Rendimientos decrecientes: cuanto mas cerca del techo, menos rinde.
    const margen = Math.max(0, techo - movidos[stat]) / BALANCE.stats.max;
    const sorteo = gauss(config.ganancia, config.spread, rng);
    const bruto = sorteo * margen;
    const delta = config.permiteBajar ? bruto : Math.max(0, bruto);
    movidos[stat] = clampStat(movidos[stat] + delta);

    // K5c-E: el desgaste va DESPUES del `max(0, ...)`, para que `permiteBajar: false` (macro) no se lo coma, y no
    // consume `rng`: la pérdida es una función de la edad. Como el acumulativo se recupera solo (`margen`), lo que
    // los años te sacan es una diferencia neta: se lleva en `desgaste[stat]` el stat "sin desgaste" (`stats[stat] +
    // desgaste[stat]`, con el MISMO sorteo de este split), y lo que te falta contra él es lo que te sacaron.
    const perdida = perdidaDeAcumulativo(stat, state.age, state.player.oculto);
    if (perdida > 0 || desgaste[stat] > 0) {
      const sinDesgaste = clampStat(stats[stat] + desgaste[stat]);
      const margenSinDesgaste = Math.max(0, techo - sinDesgaste) / BALANCE.stats.max;
      const brutoSinDesgaste = sorteo * margenSinDesgaste;
      const sinDesgasteDespues = clampStat(sinDesgaste + (config.permiteBajar ? brutoSinDesgaste : Math.max(0, brutoSinDesgaste)));
      movidos[stat] = clampStat(movidos[stat] - perdida);
      desgaste[stat] = Math.max(0, sinDesgasteDespues - movidos[stat]);
    }
  }

  return { stats: movidos, desgaste };
}

// En la etapa amateur el sueño se administra a mano, bloque por bloque. Una vez
// que sos profesional deja de ser tuyo: hay horarios, gaming house y alguien
// que te controla la dieta, asi que la barra vuelve sola hacia un descanso
// normal. Lo que sigue costando —y no se repone solo— es la mentalidad.
function normalizarSueno(state, rng) {
  const a = BALANCE.atributos;

  if (state.phase === 'amateur') {
    return state.player.sleep;
  }

  const delta = (a.suenoConfortable - state.player.sleep) * a.suenoRegresionPro;
  return clampStat(state.player.sleep + delta + gauss(0, a.suenoRuidoPro, rng));
}

// Casi todo lo que te hace mejor jugador cuesta mentalidad. El unico descuento
// que existe es dormir de verdad: por encima del descanso normal, el balance se
// da vuelta y la barra sube. Es la razon mecanica para gastar bloques en dormir
// en vez de en LP.
//
// K6d-B: `base` es el término del dado (`gauss(desgasteBase, desgasteSpread)` en `aplicar`, `desgasteBase` en la
// proyección sin dado de `riesgoDeBurnoutAlCierre`): la misma cuenta para el motor y para la carta (regla 15).
function desgasteDeMentalidad(sleep, deudaSueno, base) {
  const a = BALANCE.atributos;
  const falta = Math.max(0, a.suenoConfortable - sleep) * a.suenoPesoEnDesgaste;
  const sobra = Math.max(0, sleep - a.suenoConfortable) * a.recuperacionPorSuenoAlto;
  return base + falta + deudaSueno * a.deudaPesoEnDesgaste - sobra;
}

// Fase 9R.2 + K3-A: la mentalidad con la que cierra el split, dado el desgaste. Un desgaste negativo (dormir por encima
// del confortable) es descanso y pasa por el tope (`recuperarPorDescanso`); después, la vuelta hacia la base; y la caída
// neta del split se topea en `maxCaidaMentalPorSplit`. K6d-B: la usan `aplicar` y la proyección (una sola fuente).
function mentalidadDelCierre(mentalidad, desgaste) {
  const sinTope = mentalidadHaciaSuBase(desgaste < 0
    ? recuperarPorDescanso(mentalidad, -desgaste)
    : clampStat(mentalidad - desgaste));
  return Math.max(sinTope, mentalidad - BALANCE.atributos.maxCaidaMentalPorSplit);
}

// K6d-B (D77, "que el burnout se vea venir en la firma y en el pro", decisión del usuario 2026-10-07): lo que el dado del
// burnout de `aplicar` haría con la mentalidad proyectada al cerrar este split, sin el dado: el sueño del cierre (en el pro
// vuelve solo hacia `suenoConfortable`, sin el ruido), el desgaste medio (`desgasteBase`) y la misma `mentalidadDelCierre`.
// La racha (`flags.splitsMentalBajo`) suma este split si la proyección queda en zona roja, y la chance es la misma
// `probabilidadDeBurnout` que tira `aplicar` (o 1 en el piso duro). `fase`, `deudaSueno`, `sleep` y `mentalidad` pisan las
// del estado: la oferta del amateur proyecta "si firmás" (pro, con la deuda que deja la firma) contra "si esperás", y la
// parada del pro proyecta cada opción. Lo leen la carta, el perfil y los bots (regla 15). Puro, sin `rng`.
export function riesgoDeBurnoutAlCierre(state, {
  fase = state.phase, deudaSueno = state.player.deudaSueno ?? 0, sleep = state.player.sleep, mentalidad = state.player.stats.mentalidad
} = {}) {
  const a = BALANCE.atributos;
  const suenoDelCierre = fase === 'amateur' ? sleep : clampStat(sleep + (a.suenoConfortable - sleep) * a.suenoRegresionPro);
  const alCierre = mentalidadDelCierre(mentalidad, desgasteDeMentalidad(suenoDelCierre, deudaSueno, a.desgasteBase));
  const splitsMentalBajo = alCierre <= a.burnoutMentalBajo ? (state.flags.splitsMentalBajo ?? 0) + 1 : 0;
  const sostenido = splitsMentalBajo >= a.burnoutSplitsMinimos;
  const probabilidad = alCierre <= BALANCE.stats.min ? 1 : sostenido ? probabilidadDeBurnout(alCierre) : 0;
  return { mentalidad: alCierre, sueno: suenoDelCierre, splitsMentalBajo, sostenido, probabilidad };
}

// K6d-B: el % y el cierre proyectado en palabras, una sola forma para las cartas de la oferta, de la prueba y del pro.
// El % de burnout como lo dice la carta: la chance del motor redondeada, y "menos de 1%" si redondea a 0 pero no es 0.
export function porcentajeDeBurnout(p) {
  return p > 0 && Math.round(p * BALANCE.stats.max) === 0 ? 'menos de 1%' : `${Math.round(p * BALANCE.stats.max)}%`;
}

// Un cierre proyectado, en palabras: la mentalidad y lo que hace el dado con ella.
export function textoDelCierre(cierre) {
  const m = `~${entero(cierre.mentalidad)}`;
  if (cierre.probabilidad > 0) {
    return `${m}: ${porcentajeDeBurnout(cierre.probabilidad)} de burnout`;
  }
  return cierre.sostenido
    ? `${m}: el burnout entra al sorteo, pero con eso todavía no pincha (0%: pincha debajo de ${BALANCE.atributos.burnoutUmbral})`
    : `${m}: sin burnout en el sorteo`;
}

// K6d-B: la opción que no quema de una carta con el riesgo de burnout a la vista (las opciones con `riesgoBurnout`, la chance que
// dice la carta): la de menos; a igual chance, la primera (la carta las ordena de menos a más costo). La eligen `resolverAuto` (el
// perfil) y `criterio`; `malas`, la de más (`peor`). Puro, sin `rng`.
export function opcionQueNoQuema(decision, peor = false) {
  const candidatas = decision.opciones.filter((opcion) => Number.isFinite(opcion.riesgoBurnout));
  return candidatas.reduce((mejor, opcion) => (
    (peor ? opcion.riesgoBurnout > mejor.riesgoBurnout : opcion.riesgoBurnout < mejor.riesgoBurnout) ? opcion : mejor
  )).id;
}

export function probabilidadDeBurnout(mentalidad) {
  const a = BALANCE.atributos;
  if (mentalidad >= a.burnoutUmbral) {
    return 0;
  }
  return Math.min(a.burnoutTecho, (a.burnoutUmbral - mentalidad) / a.burnoutPendiente);
}

// K5c-E: la línea de la primera vez que los años te cobran, por stat (el que más perdió).
const TEXTO_DE_DESGASTE = {
  mecanica: 'Los reflejos ya no son los de antes: la mecánica empieza a cobrar los años.',
  laneo: 'La fase de líneas ya no sale sola: el laneo empieza a cobrar los años.',
  teamfight: 'En las peleas llegás un segundo tarde a lo que antes leías de memoria: el teamfight empieza a cobrar los años.',
  macro: 'Se te escapan rotaciones que antes veías de memoria: el macro empieza a cobrar los años.',
  shotcalling: 'Cuesta más sostener las llamadas en comms: el shotcalling empieza a cobrar los años.',
  adaptabilidad: 'Cada cambio de meta cuesta un poco más: la adaptabilidad empieza a cobrar los años.'
};
const TEXTO_DE_DESGASTE_GENERICO = 'Los años empiezan a cobrarse: ya no rendís como antes.';

function textoDeDesgaste(player) {
  const [stat] = Object.entries(desgasteDe(player)).sort((a, b) => b[1] - a[1])[0];
  return TEXTO_DE_DESGASTE[stat] ?? TEXTO_DE_DESGASTE_GENERICO;
}

export function aplicar(state, rng) {
  const forma = derivarForma(state, rng);
  const sleep = normalizarSueno(state, rng);

  const conCurva = moverStatsDeCurva(state.player.stats, state, forma, rng);
  const { stats: conAcumulados, desgaste: desgasteDeAnios } = moverStatsAcumulativos(conCurva, state, rng);
  // Fase 9R.2: la caída NETA de mentalidad de un split (lo que ya movieron los
  // eventos, en `conAcumulados`, + el desgaste de acá) se topea, para que la
  // barra roja siempre se vea venir. La subida no se topea.
  //
  // K3-A: un desgaste negativo (dormir por encima del confortable) es
  // descanso, y el descanso sube la mentalidad solo hasta `topeDescanso`
  // (`core/barras.js#recuperarPorDescanso`). Después, la vuelta del split
  // hacia la base (`mentalidadHaciaSuBase`), adentro del tope de caída neta.
  const desgaste = desgasteDeMentalidad(sleep, state.player.deudaSueno,
    gauss(BALANCE.atributos.desgasteBase, BALANCE.atributos.desgasteSpread, rng));
  // `conAcumulados.mentalidad` es `state.player.stats.mentalidad`: la mentalidad no está en `curvas` ni en `acumulativos`.
  const mentalidad = mentalidadDelCierre(conAcumulados.mentalidad, desgaste);

  const stats = { ...conAcumulados, mentalidad };
  const deltaMecanica = stats.mecanica - state.player.stats.mecanica;

  // Fase 8: cada split del juego (amateur o pro) suma a `registro.splitsJugados`
  // — coincide siempre con `player.splitCount`, que este mismo sistema
  // incrementa acá abajo. El NIVEL (core/ficha.js) se mide con los stats YA
  // movidos de este split, así que el pico refleja de verdad el mejor
  // momento de la carrera, no el arranque de ella.
  const nivelDeEsteSplit = nivelDelJugador({ player: { role: state.player.role, stats } });
  const registro = registrarPicoNivel(
    { ...state.career.registro, splitsJugados: state.career.registro.splitsJugados + 1 },
    nivelDeEsteSplit,
    state.age
  );

  // Fase 9R.2: cuántos splits seguidos lleva la mentalidad en zona roja
  // (`al_limite`). El burnout solo puede pinchar si esto llega a
  // `burnoutSplitsMinimos` — así siempre se ve venir en la barra.
  const a = BALANCE.atributos;
  const splitsMentalBajo = mentalidad <= a.burnoutMentalBajo
    ? (state.flags.splitsMentalBajo ?? 0) + 1
    : 0;

  // K5c-E: el bonus permanente se gasta después de mover los stats de este split (el objetivo de la curva todavía usó
  // el de antes). Con las perillas en 0 `conDesgasteDelBonus` devuelve el mismo estado y `desgasteDeAnios` no cambia.
  const nextState = conDesgasteDelBonus({
    ...state,
    player: {
      ...state.player,
      stats,
      sleep,
      oculto: { ...state.player.oculto, forma },
      desgaste: desgasteDeAnios,
      splitCount: state.player.splitCount + 1
    },
    flags: { ...state.flags, splitsMentalBajo },
    career: { ...state.career, currentSplit: state.career.currentSplit + 1, registro }
  });

  // Fase 7: `tecnico: true` marca los logs puramente numéricos — nadie los
  // borra (siguen siendo útiles para depurar y para simulate.js), pero le
  // dan a la UI (fase 11) la señal para esconderlos o achicarlos. Un split
  // profesional sin playoffs era 5-6 líneas, la mayoría de este tipo.
  const logs = [crearLog(
    'split',
    `Split ${state.career.currentSplit}: mecánica ${deltaCorto(deltaMecanica)}, `
    + `macro ${entero(stats.macro)}, consistencia ${entero(mentalidad)}.`,
    { tecnico: true }
  )];

  // K5c-E: la primera vez que el desgaste muerde (antes no había nada que los años te hubieran sacado) lo dice una vez,
  // con el stat que más perdió.
  if (!hayDesgaste(state.player) && hayDesgaste(nextState.player)) {
    logs.push(crearLog('split', textoDeDesgaste(nextState.player)));
  }

  // La mentalidad en cero es el fin de la carrera, pero el borde no es un
  // acantilado: abajo del umbral la probabilidad crece hasta volverse segura.
  // Fase 9R.2: salvo el piso duro (mentalidad ≤ 0), el sorteo solo entra
  // después de `burnoutSplitsMinimos` splits seguidos en rojo.
  const sostenido = splitsMentalBajo >= a.burnoutSplitsMinimos;
  if (mentalidad <= BALANCE.stats.min || (sostenido && chance(probabilidadDeBurnout(mentalidad), rng))) {
    return {
      state: { ...nextState, phase: 'retirado', terminado: true, finAnticipado: 'burnout' },
      logs: [...logs, crearLog('split', 'No da más la cabeza. Te bajás: esto se terminó acá.')]
    };
  }

  return { state: nextState, logs };
}
