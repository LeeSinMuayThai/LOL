import { gauss, weightedPick, roll } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { clamp, clampStat } from '../core/numeros.js';
import { resolverTexto } from '../core/plantillas.js';
import { ligaDeCarrera } from '../core/competicion.js';
import { deseoPorCampeon } from '../core/ajusteMeta.js';
import {
  esCierreDeTemporada, calificaAPlayoffs, calificaAInternacional,
  rondaInicial, siguienteRonda, etiquetaDeRonda, generarRival,
  disponiblesDelPool, elegirCampeonRival, campeonComodin,
  esMapaDecisivo, serieTerminada, decisionDeDraft,
  esMapaCerrado, factorJerarquiaEnLlamada
} from '../core/serie.js';
import { calcularRendimiento, fuerzaDelEquipo } from './rendimiento.js';
import {
  registrarMapa, registrarSerie, registrarTitulo, registrarInternacional, registrarPico, registrarArraigoEnFila
} from '../core/registro.js';
import { BALANCE } from '../data/balance.js';
import MINIJUEGOS from '../data/minijuegos.json' with { type: 'json' };

export const id = 'serie';

// La serie de playoffs (fase 4): cuando tu equipo clasifica, tu camino por el
// bracket se juega mapa a mapa con Fearless draft (cada campeón elegido queda
// bloqueado el resto de la ronda) y hasta un minijuego por ronda en semis,
// final e internacional. Va después de `rendimiento.js` en el registro
// (CONCEPTO §5: temporada regular → playoffs), que ya dejó `career.posicion`
// fresca este split y — para tier 1 con `formatoPlayoffs` — se abstuvo de
// resolver título/internacional al instante: eso lo hace este sistema.

function minijuegoPorId(minijuegoId) {
  return MINIJUEGOS.find((entrada) => entrada.id === minijuegoId);
}

function nombreLigaDe(liga) {
  return liga.nombreLiga ?? liga.id;
}

// --- Construcción de decisiones ---

function construirDecisionDraft(state, disponibles) {
  const { ronda, rival, formato, marcador, quemados } = state.serie;
  return {
    tipo: 'opciones',
    titulo: `${etiquetaDeRonda(ronda)} vs ${rival.org} · Bo${formato} · ${marcador[0]}-${marcador[1]}`,
    descripcion: `Quemados esta serie: ${quemados.length > 0 ? quemados.join(', ') : 'ninguno todavía'}.`,
    opciones: disponibles.map((campeon) => ({
      id: campeon.name,
      label: campeon.name,
      descripcion: `Maestría ${Math.round(campeon.mastery)}.`
    })),
    datos: { motivo: 'draft' }
  };
}

function construirDecisionMinijuego(state, minijuegoId, statRelevante, datosExtra = {}) {
  const datos = minijuegoPorId(minijuegoId);
  return {
    tipo: 'opciones',
    presentacion: 'minijuego',
    titulo: resolverTexto(datos.titulo, state),
    descripcion: resolverTexto(datos.descripcion, state),
    opciones: [],
    datos: { motivo: 'minijuego', minijuego: minijuegoId, statRelevante, ...datosExtra }
  };
}

// --- Arrancar una ronda ---

function iniciarRonda(state, ronda, rng) {
  const liga = ligaDeCarrera(state);
  const formato = ronda === 'internacional' ? 5 : liga.formatoPlayoffs.bo;
  const rival = generarRival(state, ronda, rng);

  return {
    ...state,
    serie: {
      activa: true,
      ronda,
      rival,
      formato,
      marcador: [0, 0],
      mapaActual: 0,
      mapas: [],
      quemados: [],
      minijuegoUsado: false
    }
  };
}

// --- Un mapa: quema del rival, draft (auto o pausa), minijuego (si aplica), resultado ---

function jugarMapaSiguiente(state, rng, logsAcum) {
  const campeonRival = elegirCampeonRival(state, state.serie.quemados, rng);
  const quemados = campeonRival ? [...state.serie.quemados, campeonRival] : state.serie.quemados;
  const st = { ...state, serie: { ...state.serie, quemados } };
  const logs = campeonRival
    ? [...logsAcum, crearLog('serie', `${st.serie.rival.org} juega ${campeonRival}: queda quemado para el resto de la serie.`)]
    : logsAcum;

  const disponibles = disponiblesDelPool(st.player.championPool, quemados);

  if (disponibles.length === 0) {
    const comodin = campeonComodin(st, quemados, rng);
    return jugarConCampeon(
      st, comodin.name, rng,
      [...logs, crearLog('serie', `Se te quemó todo el pool: te toca de comodín a ${comodin.name} (maestría ${comodin.mastery}).`)],
      comodin
    );
  }

  const decisivo = esMapaDecisivo(st.serie.marcador, st.serie.formato);
  const draft = decisionDeDraft(st, disponibles, decisivo);

  if (!draft.pausa) {
    return jugarConCampeon(
      st, draft.elegido.name, rng,
      [...logs, crearLog('serie', `Elegís solo: ${draft.elegido.name} (maestría ${Math.round(draft.elegido.mastery)}).`)]
    );
  }

  return { state: st, logs, decision: construirDecisionDraft(st, disponibles) };
}

// `entradaExtra` es el comodín fuera del pool (4.5): no vive en
// `player.championPool`, así que se inyecta una copia temporal del pool solo
// para que `calcularRendimiento` encuentre su maestría real y no la neutra.
function jugarConCampeon(state, campeonElegido, rng, logsAcum, entradaExtra = null) {
  const poolParaRendimiento = entradaExtra ? [...state.player.championPool, entradaExtra] : state.player.championPool;
  const rendimiento = calcularRendimiento(
    { ...state, player: { ...state.player, campeonDelSplit: campeonElegido, championPool: poolParaRendimiento } },
    rng
  );
  const fuerzaPropia = fuerzaDelEquipo(state, rendimiento);

  const puedeMinijuego = ['semis', 'final', 'internacional'].includes(state.serie.ronda) && !state.serie.minijuegoUsado;
  if (puedeMinijuego && esMapaCerrado(fuerzaPropia, state.serie.rival.fuerza)) {
    const minijuego = state.player.role === 'jungla' ? 'robar_baron' : 'la_llamada';
    const statRelevante = minijuego === 'robar_baron' ? 'mecanica' : 'shotcalling';
    return {
      state,
      logs: logsAcum,
      decision: construirDecisionMinijuego(state, minijuego, statRelevante, { campeonElegido, fuerzaPropia })
    };
  }

  return finalizarMapa(state, campeonElegido, fuerzaPropia, 0, rng, logsAcum);
}

function finalizarMapa(state, campeonElegido, fuerzaPropia, ajusteMinijuego, rng, logsAcum) {
  const s = BALANCE.serie;
  const fuerzaFinal = fuerzaPropia * (1 + ajusteMinijuego);
  const gano = gauss(fuerzaFinal, s.ruidoMapa, rng) > gauss(state.serie.rival.fuerza, s.ruidoRivalSerie, rng);

  const marcador = [...state.serie.marcador];
  marcador[gano ? 0 : 1] += 1;

  const nextState = {
    ...state,
    career: { ...state.career, registro: registrarMapa(state.career.registro, gano) },
    serie: {
      ...state.serie,
      marcador,
      quemados: [...state.serie.quemados, campeonElegido],
      mapas: [...state.serie.mapas, { campeon: campeonElegido, resultado: gano ? 'W' : 'L' }],
      mapaActual: state.serie.mapaActual + 1
    }
  };

  const logs = [...logsAcum, crearLog(
    'serie',
    `Mapa ${state.serie.mapaActual + 1} — jugás ${campeonElegido}: ${gano ? 'ganan' : 'pierden'}. Marcador ${marcador[0]}-${marcador[1]}.`
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
      { nombre: nombreLigaDe(liga), anio: state.calendario.anio, org: state.career.currentOrg }
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

function aplicarConsecuenciaInternacional(state, gano, rng) {
  const r = BALANCE.rendimiento;
  const a = BALANCE.arraigo;
  const arraigo = clampStat(state.career.arraigo + roll(a.porInternacionalMin, a.porInternacionalMax, rng));
  const registro = registrarArraigoEnFila(
    registrarInternacional(
      registrarPico(state.career.registro, 'arraigo', Math.round(arraigo)),
      {
        torneo: `internacional — ${nombreLigaDe(ligaDeCarrera(state))}`,
        anio: state.calendario.anio,
        org: state.career.currentOrg,
        resultado: gano ? 'buen_papel' : 'eliminado',
        camino: state.serie.mapas.map((mapa, i) => ({ mapa: i + 1, campeon: mapa.campeon, resultado: mapa.resultado }))
      }
    ),
    Math.round(arraigo)
  );

  return {
    ...state,
    player: {
      ...state.player,
      worlds: state.player.worlds + 1,
      stats: { ...state.player.stats, hype: clampStat(state.player.stats.hype + (gano ? r.hypePorTitulo : r.hypePorPodio)) }
    },
    career: {
      ...state.career,
      internacionales: state.career.internacionales + 1,
      arraigo: Math.round(arraigo),
      registro,
      hitos: [...state.career.hitos, gano
        ? `Buen papel internacional con ${state.career.currentOrg} a los ${state.age}`
        : `Eliminado en el internacional a los ${state.age}`]
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

  if (ronda === 'internacional') {
    logs.push(crearLog('serie', gano
      ? 'Ganaste tu serie en el internacional: se habló de vos afuera de tu región.'
      : 'Perdiste tu serie en el internacional: vuelta temprano a casa.'));
    st = aplicarConsecuenciaInternacional(st, gano, rng);
  } else if (gano && ronda === 'final') {
    logs.push(crearLog('serie', `¡Campeones de ${nombreLigaDe(liga)}! Cerraste la serie ${marcador[0]}-${marcador[1]}.`));
    st = aplicarTitulo(st, liga, rng);
  } else if (!gano) {
    logs.push(crearLog(
      'serie',
      `Se termina en ${etiquetaDeRonda(ronda).toLowerCase()}: perdiste la serie ${marcador[1]}-${marcador[0]} contra ${state.serie.rival.org}.`
    ));
    st = aplicarEliminacionDomestica(st, ronda, liga);
  } else {
    logs.push(crearLog('serie', `Ganaste la serie ${marcador[0]}-${marcador[1]} contra ${state.serie.rival.org}. Avanzás de ronda.`));
  }

  if (['final', 'internacional'].includes(ronda) && !st.serie.minijuegoUsado) {
    return {
      state: st,
      logs,
      decision: construirDecisionMinijuego(st, 'rueda_de_prensa', 'adaptabilidad', { trasRonda: ronda, gano })
    };
  }

  return continuarTrasRonda(st, ronda, gano, rng, logs);
}

function continuarTrasRonda(state, ronda, gano, rng, logsAcum) {
  if (ronda === 'internacional') {
    return { state: { ...state, serie: { ...state.serie, activa: false } }, logs: logsAcum };
  }

  if (gano) {
    const siguiente = siguienteRonda(ronda);
    if (siguiente) {
      const st = iniciarRonda(state, siguiente, rng);
      return jugarMapaSiguiente(st, rng, [...logsAcum, crearLog('serie', `${etiquetaDeRonda(siguiente)} vs ${st.serie.rival.org}.`)]);
    }
  }

  return intentarInternacional(state, rng, logsAcum);
}

function intentarInternacional(state, rng, logsAcum) {
  const liga = ligaDeCarrera(state);
  if (!calificaAInternacional(liga, state.career.posicion)) {
    return { state: { ...state, serie: { ...state.serie, activa: false } }, logs: logsAcum };
  }

  const st = iniciarRonda(state, 'internacional', rng);
  const logs = [...logsAcum, crearLog('serie', `Clasificaste al internacional: rival, ${st.serie.rival.org}.`)];

  return { state: st, logs, decision: construirDecisionMinijuego(st, 'bootcamp', 'macro') };
}

// --- Contrato del sistema ---

export function aplicar(state, rng) {
  if (state.phase !== 'profesional' || !state.career.currentOrg || state.career.companeros.length === 0) {
    return { state, logs: [] };
  }
  if (!esCierreDeTemporada(state.player.splitCount)) {
    return { state, logs: [] };
  }

  const liga = ligaDeCarrera(state);
  if (!liga || !calificaAPlayoffs(liga, state.career.posicion)) {
    return { state, logs: [] };
  }

  const ronda = rondaInicial(state.career.posicion, liga.formatoPlayoffs);
  const st = iniciarRonda(state, ronda, rng);
  const logs = [crearLog(
    'serie',
    `Clasificaste a playoffs de ${nombreLigaDe(liga)} como ${state.career.posicion}º sembrado: arrancás en `
    + `${etiquetaDeRonda(ronda).toLowerCase()} vs ${st.serie.rival.org}.`
  )];

  return jugarMapaSiguiente(st, rng, logs);
}

export function resolver(state, decision, respuesta, rng) {
  const { motivo } = decision.datos;

  if (motivo === 'draft') {
    return jugarConCampeon(state, respuesta.opcionId, rng, []);
  }

  const { minijuego } = decision.datos;
  const resultado = clamp(respuesta.resultado ?? 0.5, 0, 1);
  const ajusteBase = (resultado - 0.5) * 2;
  const s = BALANCE.serie;
  const stConCupo = { ...state, serie: { ...state.serie, minijuegoUsado: true } };

  if (minijuego === 'robar_baron' || minijuego === 'la_llamada') {
    const { campeonElegido, fuerzaPropia } = decision.datos;
    const amortiguado = minijuego === 'la_llamada' ? factorJerarquiaEnLlamada(state.career.jerarquia) : 1;
    return finalizarMapa(stConCupo, campeonElegido, fuerzaPropia, ajusteBase * s.impactoMinijuego * amortiguado, rng, []);
  }

  if (minijuego === 'bootcamp') {
    const delta = ajusteBase * s.impactoDirecto;
    const st = {
      ...stConCupo,
      player: { ...stConCupo.player, stats: { ...stConCupo.player.stats, mentalidad: clampStat(stConCupo.player.stats.mentalidad + delta) } }
    };
    const logs = [crearLog('serie', delta >= 0
      ? 'El bootcamp rindió: llegás mejor preparado.'
      : 'El bootcamp fue parejo, no alcanzó a pulir todo.')];
    return jugarMapaSiguiente(st, rng, logs);
  }

  // rueda_de_prensa
  const delta = ajusteBase * s.impactoDirecto;
  const st = {
    ...stConCupo,
    player: { ...stConCupo.player, stats: { ...stConCupo.player.stats, hype: clampStat(stConCupo.player.stats.hype + delta) } },
    career: { ...stConCupo.career, sinergia: clampStat(stConCupo.career.sinergia + delta) }
  };
  const logs = [crearLog('serie', delta >= 0
    ? 'La rueda de prensa te queda bien: el tono cayó justo.'
    : 'La rueda de prensa sale rara: el tono no fue el mejor.')];
  return continuarTrasRonda(st, decision.datos.trasRonda, decision.datos.gano, rng, logs);
}

export function resolverAuto(state, decision, rng) {
  const { motivo } = decision.datos;

  if (motivo === 'draft') {
    const elegido = weightedPick(decision.opciones, (opcion) => {
      const campeon = state.player.championPool.find((candidato) => candidato.name === opcion.id);
      return campeon ? deseoPorCampeon(campeon, state.meta.weights) : 1;
    }, rng);
    return { opcionId: elegido.id };
  }

  // Regla 5 de 4.6: Node simula el minijuego con gauss corrido por el stat
  // relevante — el motor no lo implementa, solo lo consume.
  const valor = state.player.stats[decision.datos.statRelevante] ?? 50;
  return { resultado: clamp(gauss(valor / 100, BALANCE.serie.minijuegoSpread, rng), 0, 1) };
}
