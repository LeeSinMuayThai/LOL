import { gauss, roll } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { clamp, clampStat } from '../core/numeros.js';
import { conPermanencia, conTechoDeLesion } from '../core/curvas.js';
import { ligaDeCarrera } from '../core/competicion.js';
import {
  esCierreDeTemporada, calificaAPlayoffs,
  rondaInicial, siguienteRonda, etiquetaDeRonda, generarRival,
  objetivoDelRival, conQuemaDelRival, esMapaDecisivoDeLaSerie, serieTerminada,
  PLANES_DE_SERIE, esSerieSinNadaEnJuego, charlaDisponible, conPlan, mapaDelPlan, proyeccionDelPlan,
  probabilidadDeMapa, ajusteDeMinijuegoDeMapa, ajusteBaseDeMinijuego, ajusteDeCharla
} from '../core/serie.js';
import { fuerzaDePartido } from '../core/fuerza.js';
import { tirarPartido } from '../core/partido.js';
import {
  registrarMapa, registrarSerie, registrarTitulo, registrarPico, registrarArraigoEnFila
} from '../core/registro.js';
import {
  elegirMinijuego, minijuegoPorId, textoDeMinijuego, registrarMinijuegoVisto, veredictoDeMinijuego,
  generarCierreMapa, factorDificultadPorRonda
} from '../core/minijuegos.js';
import { BALANCE } from '../data/balance.js';

export const id = 'serie';

// La serie de playoffs (fase 4): cuando tu equipo clasifica, tu camino por el bracket se juega mapa a mapa con
// Fearless draft (cada campeón que sale queda quemado el resto de la serie, para los dos). Va después de
// `rendimiento.js` en el registro (CONCEPTO §5: temporada regular → playoffs), que ya dejó `career.posicion` fresca
// este split y —para tier 1 con `formatoPlayoffs`— se abstuvo de resolver título/internacional al instante.
//
// K4-B (PLAN.md "K4 — decisiones de spec", K4-B; reemplaza a J6 y a D63): la serie es un PLAN. Al arrancar elegís
// el plan de Fearless (cada camino con su p por mapa, la que el motor tira); el motor lo juega y te frena solo si el
// rival te quema el campeón que guardabas o cuando llega el mapa decisivo (con su minijuego en semis, final e
// internacional, y la charla del coach si te queda). Una serie sin nada en juego no pregunta.

function nombreLigaDe(liga) {
  return liga.nombreLiga ?? liga.id;
}

// --- Construcción de decisiones ---

const ETIQUETA_PLAN = {
  guardar: (guardado) => `Guardar a ${guardado} para el mapa decisivo`,
  conTodo: () => 'Salir con todo',
  sorpresa: (_, sorpresa) => `La sorpresa: ${sorpresa} en el mapa 1`,
  coach: () => 'Lo que diga el coach'
};

const DESCRIPCION_PLAN = {
  guardar: (guardado) => `Sale todo lo demás primero y ${guardado} queda en el bolsillo para el mapa que define. `
    + 'Si te lo leen y lo queman antes, frenás a cambiar el plan.',
  conTodo: () => 'Tus mejores picks de entrada y a pegar fuerte los dos primeros mapas. Si la serie se estira, lo pagás.',
  sorpresa: (_, sorpresa) => `Abrís con ${sorpresa}, que no lo prepararon. Después, lo mejor que te quede.`,
  coach: () => 'El mejor pick que quede en cada mapa, sin inventar nada.'
};

export function textoDelPlan(plan, proyeccion) {
  const guardado = proyeccion?.guardado ?? null;
  const sorpresa = proyeccion?.mapas?.[0]?.campeon ?? null;
  return ETIQUETA_PLAN[plan](guardado, sorpresa);
}

// Los planes que tienen sentido con este pool: guardar pide dos libres; la sorpresa, un pick fuera de lo que el
// rival preparó (si no lo hay, la sorpresa sería el plan del coach con otro nombre).
function planesOfrecidos(state) {
  return PLANES_DE_SERIE
    .map((plan) => ({ plan, proyeccion: proyeccionDelPlan(state, plan) }))
    .filter(({ plan, proyeccion }) => {
      if (plan === 'guardar') {
        return proyeccion.guardado !== null;
      }
      if (plan === 'sorpresa') {
        return state.serie.mapaActual === 0 && esSorpresa(state, proyeccion);
      }
      return true;
    });
}

function esSorpresa(state, proyeccion) {
  return proyeccion.mapas[0]?.campeon !== proyeccionDelPlan(state, 'coach').mapas[0]?.campeon;
}

// La tarjeta del plan de Fearless. Cada opción lleva su proyección (la p por mapa y la de la serie): la previa
// (`core/previaDePartido.js`) la vuelve a pedir a `proyeccionDelPlan` para mostrarla, el motor la tira.
function construirDecisionPlan(state, { replan = false, quemado = null } = {}) {
  const { ronda, rival, formato, marcador } = state.serie;
  const ofrecidos = planesOfrecidos(state);
  return {
    tipo: 'opciones',
    titulo: replan
      ? `Te leyeron: ${rival.org} quemó a ${quemado}`
      : `${etiquetaDeRonda(ronda, state.serie.etapa)} vs ${rival.org} · Bo${formato}: el plan de Fearless`,
    descripcion: replan
      ? `Era el que guardabas para el mapa decisivo. Van ${marcador[0]}-${marcador[1]}: ¿con qué plan seguís?`
      : 'Cada campeón que sale queda quemado para los dos el resto de la serie, y el rival también se va quedando sin '
        + 'picks. ¿Cómo la encarás?',
    opciones: ofrecidos.map(({ plan, proyeccion }) => ({
      id: plan,
      label: textoDelPlan(plan, proyeccion),
      descripcion: DESCRIPCION_PLAN[plan](proyeccion.guardado, proyeccion.mapas[0]?.campeon),
      pSerie: proyeccion.pSerie,
      pMapas: proyeccion.mapas.map((m) => m.p)
    })),
    datos: { motivo: 'plan', replan }
  };
}

// La pausa del mapa decisivo cuando no hay minijuego (cuartos, o un rol sin minijuego para el momento): la previa
// y la charla del coach, si te queda esta temporada.
function construirDecisionDecisiva(state, jugada, conCharla) {
  const { marcador, mapaActual } = state.serie;
  return {
    tipo: 'opciones',
    titulo: `Mapa ${mapaActual + 1} · ${marcador[0]}-${marcador[1]}: el que define la serie`,
    descripcion: conCharla
      ? `El que gane este se lleva la serie. Salen con ${jugada.campeon}, y el coach tiene una charla guardada para toda la temporada: ¿la usa ahora?`
      : `El que gane este se lleva la serie. Salen con ${jugada.campeon}.`,
    opciones: conCharla
      ? [
        { id: 'charla', label: 'Que hable el coach ahora', descripcion: 'Es la única de la temporada: si la gastás acá, no la tenés después.' },
        { id: 'sinCharla', label: 'Guardar la charla', descripcion: 'Salen así; la charla queda para más adelante.' }
      ]
      : [{ id: 'sinCharla', label: 'A jugarlo', descripcion: 'La charla del coach ya se usó esta temporada.' }],
    datos: {
      motivo: 'decisivo',
      campeonElegido: jugada.campeon,
      entradaExtra: jugada.entradaExtra,
      fuerzaPropia: jugada.fuerzaPropia,
      ajustePlan: jugada.ajustePlan
    }
  };
}

// Cuál de los cupos de la serie gasta cada momento (9R4b): el mapa decisivo, o la rueda de prensa de después.
function cupoGastado(momento) {
  if (momento === 'mapa_decisivo') {
    return { decisivoUsado: true };
  }
  return { minijuegoUsado: true };
}

// Fase 9R4a: el minijuego sale del catálogo (`data/minijuegos.json`) por
// MOMENTO y por rol, no de un `if` sobre `player.role`. Devuelve la pausa
// entera —estado incluido— porque el id elegido se anota en
// `flags.minijuegosRecientes` para no repetir la misma mecánica dos series
// seguidas cuando hay otra elegible. `null` si el momento no tiene contenido:
// el que llama sigue de largo.
function pausaDeMinijuego(state, momento, logsAcum, datosExtra = {}) {
  const entrada = elegirMinijuego(state, momento);
  if (!entrada) {
    return null;
  }
  const textos = textoDeMinijuego(entrada, state);
  const ronda = state.serie?.ronda ?? null;
  const dificultad = factorDificultadPorRonda(ronda);

  return {
    state: { ...state, flags: { ...state.flags, minijuegosRecientes: registrarMinijuegoVisto(state, entrada.id) } },
    logs: logsAcum,
    decision: {
      tipo: 'opciones',
      presentacion: 'minijuego',
      titulo: textos.titulo,
      descripcion: textos.descripcion,
      opciones: [],
      datos: {
        motivo: 'minijuego',
        minijuego: entrada.id,
        momento,
        ronda,
        dificultad,
        statRelevante: entrada.statRelevante,
        apuesta: textos.apuesta,
        regla: textos.regla,
        ...datosExtra
      }
    }
  };
}

// Los efectos `tipo: 'stat'` declaran a qué apuntan en el propio dato
// (`player.stats.mentalidad`, `career.sinergia`): el motor no sabe cuál es el
// del bootcamp y cuál el de la rueda de prensa, los aplica.
//
// K3-B: un stat de curva que mueve un minijuego se vuelve permanente por el mismo helper que los eventos
// (`conPermanencia`, con la fracción de los eventos y el nombre visible del minijuego como origen), con el delta REAL
// que movió el clamp. Hoy ningún minijuego apunta a un stat de curva: no cambia nada.
export function aplicarStatsDeMinijuego(state, targets, delta, origen) {
  return targets.reduce((st, target) => {
    if (target.startsWith('player.stats.')) {
      const stat = target.slice('player.stats.'.length);
      const antes = st.player.stats[stat];
      const despues = conTechoDeLesion(st.player, stat, antes, clampStat(antes + delta));
      const movido = {
        ...st,
        player: { ...st.player, stats: { ...st.player.stats, [stat]: despues } }
      };
      return conPermanencia(movido, stat, despues - antes, origen);
    }
    const campo = target.slice('career.'.length);
    return { ...st, career: { ...st.career, [campo]: clampStat(st.career[campo] + delta) } };
  }, state);
}

// --- Arrancar una ronda ---

// K5-A: `mundial` (`{ etapa, rival }`) arma una serie del bracket del Mundial: el rival lo pone el torneo
// (`core/internacional.js`, sin `rng`) y el formato es el Bo5 del bracket. La serie se juega con las mismas reglas.
function iniciarRonda(state, ronda, rng, mundial = null) {
  const liga = ligaDeCarrera(state);
  const formato = mundial ? BALANCE.mundial.boBracket : liga.formatoPlayoffs.bo;
  const rival = mundial ? mundial.rival : generarRival(state, ronda, rng);
  // K2a: la fuerza de tu equipo al empezar la serie, con el campeón del split (K2b: determinista). Es el lado propio
  // del Δ con el que `src/dev/simulate.js` mide "el favorito gana el Bo5" y, desde K4-B, el que decide si la serie
  // tiene algo en juego.
  const fuerzaInicial = fuerzaDePartido(state);
  const serie = {
    activa: true,
    ronda,
    rival,
    formato,
    // K5-A: `torneo: 'mundial'` y su `etapa` (cuartos, semis, final); `null` en los playoffs domésticos.
    torneo: mundial ? 'mundial' : null,
    etapa: mundial ? mundial.etapa : null,
    fuerzaInicial,
    marcador: [0, 0],
    mapaActual: 0,
    mapas: [],
    quemados: [],
    // K4-B: el plan de Fearless, el campeón guardado para el mapa decisivo, si ya te frenaron a re-planear, y el
    // campeón con el que el rival juega el mapa en curso (`rivalJuegaEnMapa`: el índice del mapa de esa quema).
    plan: null,
    guardado: null,
    replanUsado: false,
    rivalJuega: null,
    rivalJuegaEnMapa: -1,
    sinNadaEnJuego: false,
    minijuegoUsado: false,
    decisivoUsado: false,
    postSerie: false
  };
  return { ...state, serie: { ...serie, sinNadaEnJuego: esSerieSinNadaEnJuego(serie) } };
}

// K4-B: la serie arranca por el plan. Sin nada en juego, juega el del coach y lo cuenta en una línea.
function arrancarSerie(state, rng, logsAcum) {
  if (state.serie.sinNadaEnJuego) {
    const st = conPlan(state, 'coach');
    const { fuerzaInicial, rival } = st.serie;
    return jugarMapaSiguiente(st, rng, [...logsAcum, crearLog(
      'serie',
      `Serie sin nada en juego (${Math.round(fuerzaInicial)} contra ${Math.round(rival.fuerza)} de ${rival.org}): `
      + 'juega lo que diga el coach, sin frenar.'
    )]);
  }
  return { state, logs: logsAcum, decision: construirDecisionPlan(state) };
}

// --- Un mapa: la quema del rival, el pick del plan, el mapa decisivo, el resultado ---

// El rival quema su campeón del mapa. Si el plan guarda uno y el rival te lee (`pLeenElGuardado`, una vez por
// serie como mucho: después de re-planear ya no tira), quema ese y te frena a elegir el plan de nuevo.
function jugarMapaSiguiente(state, rng, logsAcum) {
  const { serie } = state;
  const puedeLeerte = serie.plan === 'guardar' && serie.guardado && !serie.replanUsado
    && !esMapaDecisivoDeLaSerie(serie) && !serie.quemados.includes(serie.guardado);
  const teLeyo = puedeLeerte && rng() < BALANCE.serie.plan.pLeenElGuardado;

  if (teLeyo) {
    const quemado = serie.guardado;
    const st = conQuemaDelRival(state, quemado);
    const replan = { ...st, serie: { ...st.serie, plan: null, guardado: null, replanUsado: true } };
    return {
      state: replan,
      logs: [...logsAcum, crearLog('serie', `${serie.rival.org} te leyó: quemó a ${quemado}, el que guardabas para el mapa decisivo.`)],
      decision: construirDecisionPlan(replan, { replan: true, quemado })
    };
  }

  return jugarMapa(conQuemaDelRival(state, objetivoDelRival(state, serie.quemados)), rng, logsAcum);
}

// El mapa con la quema del rival ya hecha: el plan elige (`mapaDelPlan`, la misma cuenta que la tarjeta). En el
// mapa decisivo de una serie con algo en juego, te frena: con su minijuego en semis, final e internacional, o con
// la previa y la charla en una pausa propia.
function jugarMapa(state, rng, logsAcum) {
  const jugada = mapaDelPlan(state);
  if (esMapaDecisivoDeLaSerie(state.serie) && !state.serie.sinNadaEnJuego) {
    return pausaDecisiva(state, jugada, logsAcum);
  }
  return finalizarMapa(state, jugada, { ajusteExtra: 0, charla: false }, rng, logsAcum);
}

function pausaDecisiva(state, jugada, logsAcum) {
  const conCharla = charlaDisponible(state);
  if (BALANCE.serie.rondasConMinijuegoDecisivo.includes(state.serie.ronda)) {
    const pausa = pausaDeMinijuego(state, 'mapa_decisivo', logsAcum, {
      campeonElegido: jugada.campeon,
      fuerzaPropia: jugada.fuerzaPropia,
      entradaExtra: jugada.entradaExtra,
      ajustePlan: jugada.ajustePlan,
      // K4-B: la charla del coach se elige en la misma pausa, antes del minijuego.
      charla: { disponible: conCharla }
    });
    if (pausa) {
      return pausa;
    }
  }
  return { state, logs: logsAcum, decision: construirDecisionDecisiva(state, jugada, conCharla) };
}

function gastarCharla(state, usada) {
  if (!usada) {
    return { state, logs: [] };
  }
  return {
    state: { ...state, career: { ...state.career, charlaUsadaEn: state.calendario.anio } },
    logs: [crearLog('serie', 'El coach junta a todos antes del mapa que define: la charla de la temporada se usa acá.')]
  };
}

// K2b: el mapa es UNA tirada contra la p declarada. K4-B: el ajuste es el del plan más lo que lo mueve en el mapa
// decisivo (la charla y el minijuego); sin eso, es la p que la tarjeta del plan mostró para este mapa.
function finalizarMapa(state, jugada, { ajusteExtra, charla }, rng, logsAcum) {
  const { campeon, fuerzaPropia, ajustePlan } = jugada;
  const { gano, p } = tirarPartido(probabilidadDeMapa(state, fuerzaPropia, ajustePlan + ajusteExtra), rng);

  const marcador = [...state.serie.marcador];
  marcador[gano ? 0 : 1] += 1;
  const marcadorStr = `${marcador[0]}-${marcador[1]}`;
  const numeroMapa = state.serie.mapaActual + 1;
  const cierre = generarCierreMapa(campeon, gano, marcadorStr, state);
  const rivalJuega = state.serie.rivalJuega;

  const nextState = {
    ...state,
    career: { ...state.career, registro: registrarMapa(state.career.registro, gano) },
    serie: {
      ...state.serie,
      marcador,
      quemados: [...state.serie.quemados, campeon],
      mapas: [...state.serie.mapas, {
        mapa: numeroMapa,
        campeon,
        resultado: gano ? 'W' : 'L',
        marcador: marcadorStr,
        cierre
      }],
      mapaActual: numeroMapa
    }
  };

  const comodin = jugada.motivo === 'comodin' ? ` (de comodín: se te quemó todo el pool)` : '';
  const logs = [...logsAcum, crearLog(
    'serie',
    `Mapa ${numeroMapa} — ${state.serie.rival.org} sale con ${rivalJuega ?? 'lo que le queda'}; vos, ${campeon}${comodin}: `
    + `${gano ? 'ganan' : 'pierden'}. Marcador ${marcadorStr}.`,
    // K2d: `p` es la probabilidad con la que se tiró el mapa (la tarjeta del mapa la muestra).
    {
      mapa: numeroMapa, campeon, resultado: gano ? 'W' : 'L', marcador: marcadorStr, cierre, p,
      rivalJuega, plan: state.serie.plan, charla
    }
  )];

  return serieTerminada(marcador, state.serie.formato)
    ? concluirRonda(nextState, rng, logs)
    : jugarMapaSiguiente(nextState, rng, logs);
}

// --- Fin de ronda: título, eliminación, o el internacional ---

function aplicarTitulo(state, liga, rng) {
  const r = BALANCE.rendimiento;
  const a = BALANCE.arraigo;
  const arraigo = clampStat(state.career.arraigo + roll(a.porTituloMin, a.porTituloMax, rng));
  const registro = registrarArraigoEnFila(
    registrarTitulo(
      registrarPico(state.career.registro, 'arraigo', Math.round(arraigo)),
      // K1 (D76): la liga y el tier donde se ganó (el bracket es siempre tier 1).
      {
        nombre: nombreLigaDe(liga), anio: state.calendario.anio, org: state.career.currentOrg,
        liga: liga.id, tier: liga.tier
      }
    ),
    Math.round(arraigo)
  );

  return {
    ...state,
    player: {
      ...state.player,
      stats: {
        ...state.player.stats,
        hype: clampStat(state.player.stats.hype + r.hypePorTitulo),
        mentalidad: clampStat(state.player.stats.mentalidad + r.mentalidadPorTitulo)
      }
    },
    career: {
      ...state.career,
      titulos: state.career.titulos + 1,
      arraigo: Math.round(arraigo),
      registro,
      hitos: [...state.career.hitos, `Campeón de ${nombreLigaDe(liga)} a los ${state.age}`]
    }
  };
}

function aplicarEliminacionDomestica(state, ronda, liga) {
  return {
    ...state,
    career: {
      ...state.career,
      hitos: [...state.career.hitos, `Eliminado en ${etiquetaDeRonda(ronda).toLowerCase()} de ${nombreLigaDe(liga)} a los ${state.age}`],
      // Fase 5: queda anotado quién te eliminó, para que una fecha de
      // temporada regular contra esa misma org se pueda leer como revancha.
      ultimoEliminadoPor: state.serie.rival.org
    }
  };
}

function concluirRonda(state, rng, logsAcum) {
  const { ronda, marcador } = state.serie;
  const gano = marcador[0] > marcador[1];
  const liga = ligaDeCarrera(state);
  let st = {
    ...state,
    career: {
      ...state.career,
      seriesJugadas: state.career.seriesJugadas + 1,
      registro: registrarSerie(state.career.registro, gano)
    }
  };
  const logs = [...logsAcum];
  const datosPost = {
    postSerie: true,
    ronda,
    rival: state.serie.rival.org,
    marcador: [...marcador],
    gano,
    mapas: [...st.serie.mapas],
    // K2a: el formato y las dos fuerzas al empezar la serie (la tuya con el campeón del split, sin ruido, y la del
    // rival): con esto `src/dev/simulate.js` mide en el motor cuánto gana el favorito de un Bo5 según el Δ de
    // fuerza. K4-B: y el plan con el que se cerró la serie. Lectura pura de `state.serie`.
    formato: state.serie.formato,
    fuerzaInicial: state.serie.fuerzaInicial,
    fuerzaRival: state.serie.rival.fuerza,
    plan: state.serie.plan,
    sinNadaEnJuego: state.serie.sinNadaEnJuego
  };

  if (state.serie.torneo === 'mundial') {
    // K5-A: la serie del Mundial termina acá; el torneo sigue en `systems/internacional.js`, que es quien la arrancó.
    logs.push(crearLog('serie', gano
      ? `${etiquetaDeRonda(ronda, state.serie.etapa)}: ganaste la serie ${marcador[0]}-${marcador[1]} contra ${state.serie.rival.org}.`
      : `${etiquetaDeRonda(ronda, state.serie.etapa)}: perdiste la serie ${marcador[1]}-${marcador[0]} contra ${state.serie.rival.org}.`,
      { ...datosPost, torneo: 'mundial', etapa: state.serie.etapa }));
    return { state: { ...st, serie: { ...st.serie, activa: false } }, logs, finDeSerie: { gano, marcador: [...marcador] } };
  }
  if (gano && ronda === 'final') {
    logs.push(crearLog('serie', `¡Campeones de ${nombreLigaDe(liga)}! Cerraste la serie ${marcador[0]}-${marcador[1]}.`, datosPost));
    st = aplicarTitulo(st, liga, rng);
  } else if (!gano) {
    logs.push(crearLog(
      'serie',
      `Se termina en ${etiquetaDeRonda(ronda).toLowerCase()}: perdiste la serie ${marcador[1]}-${marcador[0]} contra ${state.serie.rival.org}.`,
      datosPost
    ));
    st = aplicarEliminacionDomestica(st, ronda, liga);
  } else {
    logs.push(crearLog('serie', `Ganaste la serie ${marcador[0]}-${marcador[1]} contra ${state.serie.rival.org}. Avanzás de ronda.`, datosPost));
  }

  // K4-B quitó la rueda de prensa de la serie (minijuegos solo en el clímax); K4-C la devuelve solo después de una final
  // (`serie.rondasConPrensa`) —la otra mitad, tras un escándalo, la pone events.js—. Entra por `pausaDeMinijuego(st,
  // 'post_serie', ...)` y la resuelve `resolver` (gasta `minijuegoUsado`; el mapa decisivo gasta `decisivoUsado`).
  if (BALANCE.serie.rondasConPrensa.includes(ronda) && !st.serie.minijuegoUsado) {
    const pausa = pausaDeMinijuego(st, 'post_serie', logs, { trasRonda: ronda, gano });
    if (pausa) {
      return pausa;
    }
  }

  return continuarTrasRonda(st, ronda, gano, rng, logs);
}

function continuarTrasRonda(state, ronda, gano, rng, logsAcum) {
  if (gano) {
    const siguiente = siguienteRonda(ronda);
    if (siguiente) {
      const st = iniciarRonda(state, siguiente, rng);
      return arrancarSerie(st, rng, [...logsAcum, crearLog('serie', `${etiquetaDeRonda(siguiente)} vs ${st.serie.rival.org}.`)]);
    }
  }

  // K5-A: los playoffs terminan en la final doméstica. El Mundial es otro sistema (`systems/internacional.js`).
  return { state: { ...state, serie: { ...state.serie, activa: false, postSerie: true } }, logs: logsAcum };
}

// K5-A: una serie del bracket del Mundial, con las reglas de K4 (plan de Fearless, mapa decisivo, charla del coach).
// La arranca `systems/internacional.js`; cuando termina, vuelve con `finDeSerie: { gano, marcador }` en vez de
// seguir sola, y el torneo decide con quién se juega la próxima.
export function arrancarSerieDelMundial(state, etapa, rival, rng, logsAcum) {
  const st = iniciarRonda(state, 'internacional', rng, { etapa, rival });
  return arrancarSerie(st, rng, [...logsAcum, crearLog(
    'serie', `${etiquetaDeRonda('internacional', etapa)} vs ${rival.org} (${rival.liga}), al Bo${st.serie.formato}.`
  )]);
}

// --- Contrato del sistema ---

export function aplicar(state, rng) {
  const base = state.serie?.postSerie ? { ...state, serie: { ...state.serie, postSerie: false } } : state;
  if (base.phase !== 'profesional' || !base.career.currentOrg || base.career.companeros.length === 0) {
    return { state: base, logs: [] };
  }
  if (!esCierreDeTemporada(base.player.splitCount)) {
    return { state: base, logs: [] };
  }

  const liga = ligaDeCarrera(base);
  if (!liga || !calificaAPlayoffs(liga, base.career.posicion)) {
    return { state: base, logs: [] };
  }

  const ronda = rondaInicial(base.career.posicion, liga.formatoPlayoffs);
  const st = iniciarRonda(base, ronda, rng);
  const logs = [crearLog(
    'serie',
    `Clasificaste a playoffs de ${nombreLigaDe(liga)} como ${state.career.posicion}º sembrado: arrancás en `
    + `${etiquetaDeRonda(ronda).toLowerCase()} vs ${st.serie.rival.org}.`
  )];

  return arrancarSerie(st, rng, logs);
}

export function resolver(state, decision, respuesta, rng) {
  const { motivo } = decision.datos;

  if (motivo === 'plan') {
    const plan = decision.opciones.some((opcion) => opcion.id === respuesta.opcionId) ? respuesta.opcionId : 'coach';
    const st = conPlan(state, plan);
    const logs = [crearLog('serie', `El plan: ${textoDelPlan(plan, proyeccionDelPlan(state, plan)).toLowerCase()}.`)];
    // Al re-planear, la quema del rival de este mapa ya pasó (fue la que te frenó): se juega el mapa.
    return decision.datos.replan ? jugarMapa(st, rng, logs) : jugarMapaSiguiente(st, rng, logs);
  }

  const jugada = {
    campeon: decision.datos.campeonElegido,
    entradaExtra: decision.datos.entradaExtra ?? null,
    fuerzaPropia: decision.datos.fuerzaPropia,
    ajustePlan: decision.datos.ajustePlan ?? 0,
    motivo: decision.datos.entradaExtra ? 'comodin' : 'plan'
  };

  if (motivo === 'decisivo') {
    const usada = respuesta.opcionId === 'charla' && charlaDisponible(state);
    const charla = gastarCharla(state, usada);
    return finalizarMapa(charla.state, jugada, { ajusteExtra: ajusteDeCharla(usada), charla: usada }, rng, charla.logs);
  }

  // Fase 9R4a: la rama la decide el DATO (`efecto.tipo`), no el id del minijuego. Agregar una mecánica nueva al
  // catálogo no toca este archivo.
  const entrada = minijuegoPorId(decision.datos.minijuego);
  const resultado = clamp(respuesta.resultado ?? 0.5, 0, 1);
  const ajusteBase = ajusteBaseDeMinijuego(resultado);
  const stConCupo = { ...state, serie: { ...state.serie, ...cupoGastado(decision.datos.momento) } };

  if (entrada.efecto.tipo === 'mapa') {
    // K2d: el mismo ajuste con el que la previa muestra la p final del mapa. K4-B: más la charla, si la elegiste.
    const usada = respuesta.charla === true && decision.datos.charla?.disponible === true && charlaDisponible(state);
    const charla = gastarCharla(stConCupo, usada);
    const ajusteExtra = ajusteDeCharla(usada) + ajusteDeMinijuegoDeMapa(state, entrada, resultado);
    return finalizarMapa(charla.state, jugada, { ajusteExtra, charla: usada }, rng, charla.logs);
  }

  const nombreVisible = decision.titulo ?? textoDeMinijuego(entrada, state).titulo;
  const st = aplicarStatsDeMinijuego(stConCupo, entrada.efecto.targets, ajusteBase * entrada.impacto, nombreVisible);
  const logs = [crearLog('serie', veredictoDeMinijuego(entrada.id, resultado, state).detalle)];

  return continuarTrasRonda(st, decision.datos.trasRonda, decision.datos.gano, rng, logs);
}

// K4-B: el camino headless gasta la charla del coach en la final o en el internacional, nunca antes (el dilema es
// gastarla en semis o guardarla para la final).
export function usaLaCharlaEnAuto(ronda) {
  return ronda === 'final' || ronda === 'internacional';
}

export function resolverAuto(state, decision, rng) {
  const { motivo } = decision.datos;

  if (motivo === 'plan') {
    // El plan con más p de ganar la serie, según la misma proyección que muestra la tarjeta. Sin sorteo.
    const mejor = decision.opciones.reduce((acum, opcion) => (opcion.pSerie > acum.pSerie ? opcion : acum));
    return { opcionId: mejor.id };
  }

  if (motivo === 'decisivo') {
    const charla = decision.opciones.some((opcion) => opcion.id === 'charla') && usaLaCharlaEnAuto(state.serie.ronda);
    return { opcionId: charla ? 'charla' : 'sinCharla' };
  }

  // Regla 5 de 4.6: Node simula el minijuego con gauss corrido por el stat relevante — el motor no lo implementa,
  // solo lo consume.
  const entrada = minijuegoPorId(decision.datos.minijuego);
  const valor = state.player.stats[decision.datos.statRelevante] ?? 50;
  const resultado = clamp(gauss(valor / 100, entrada.spread, rng), 0, 1);
  return decision.datos.charla?.disponible
    ? { resultado, charla: usaLaCharlaEnAuto(state.serie.ronda) }
    : { resultado };
}
