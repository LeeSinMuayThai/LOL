import { gauss, weightedPick, roll } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { clamp, clampStat } from '../core/numeros.js';
import { ligaDeCarrera } from '../core/competicion.js';
import { pesoDePick, factorDeCampeon, lecturaDePick } from '../core/ajusteMeta.js';
import {
  esCierreDeTemporada, calificaAPlayoffs, calificaAInternacional,
  rondaInicial, siguienteRonda, etiquetaDeRonda, generarRival,
  disponiblesDelPool, elegirCampeonRival, campeonComodin,
  esMapaDecisivo, esMapaDeDesempate, serieTerminada, decisionDeDraft,
  esMapaCerrado, factorJerarquiaEnLlamada
} from '../core/serie.js';
import { calcularRendimiento, fuerzaDelEquipo } from './rendimiento.js';
import {
  registrarMapa, registrarSerie, registrarTitulo, registrarInternacional, registrarPico, registrarArraigoEnFila
} from '../core/registro.js';
import {
  elegirMinijuego, minijuegoPorId, textoDeMinijuego, registrarMinijuegoVisto, veredictoDeMinijuego,
  generarCierreMapa, factorDificultadPorRonda
} from '../core/minijuegos.js';
import { BALANCE } from '../data/balance.js';

export const id = 'serie';

// La serie de playoffs (fase 4): cuando tu equipo clasifica, tu camino por el
// bracket se juega mapa a mapa con Fearless draft (cada campeón elegido queda
// bloqueado el resto de la ronda) y hasta un minijuego por ronda en semis,
// final e internacional. Va después de `rendimiento.js` en el registro
// (CONCEPTO §5: temporada regular → playoffs), que ya dejó `career.posicion`
// fresca este split y — para tier 1 con `formatoPlayoffs` — se abstuvo de
// resolver título/internacional al instante: eso lo hace este sistema.

function nombreLigaDe(liga) {
  return liga.nombreLiga ?? liga.id;
}

// --- Construcción de decisiones ---

// Fase 9Rd: las opciones van ordenadas best-first por `factorDeCampeon` (el
// mismo criterio con el que el motor auto-pickearía) y cada una trae su lectura
// en palabras —afinidad al parche × maestría relativa a tu pool— en vez de un
// número de maestría suelto.
function construirDecisionDraft(state, disponibles) {
  const { ronda, rival, formato, marcador, quemados } = state.serie;
  const weights = state.meta.weights;
  const pool = state.player.championPool;
  const ordenados = [...disponibles].sort(
    (a, b) => factorDeCampeon(b, weights) - factorDeCampeon(a, weights)
  );
  return {
    tipo: 'opciones',
    titulo: `${etiquetaDeRonda(ronda)} vs ${rival.org} · Bo${formato} · ${marcador[0]}-${marcador[1]}`,
    descripcion: `Quemados esta serie: ${quemados.length > 0 ? quemados.join(', ') : 'ninguno todavía'}.`,
    opciones: ordenados.map((campeon) => ({
      id: campeon.name,
      label: campeon.name,
      descripcion: `${lecturaDePick(campeon, weights, pool)} · maestría ${Math.round(campeon.mastery)}`
    })),
    datos: { motivo: 'draft' }
  };
}

// Cuál de los tres cupos de la serie gasta cada momento (9R4b).
function cupoGastado(momento) {
  if (momento === 'pre_internacional') {
    return { preSerieUsado: true };
  }
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
function aplicarStatsDeMinijuego(state, targets, delta) {
  return targets.reduce((st, target) => {
    if (target.startsWith('player.stats.')) {
      const stat = target.slice('player.stats.'.length);
      return {
        ...st,
        player: { ...st.player, stats: { ...st.player.stats, [stat]: clampStat(st.player.stats[stat] + delta) } }
      };
    }
    const campo = target.slice('career.'.length);
    return { ...st, career: { ...st.career, [campo]: clampStat(st.career[campo] + delta) } };
  }, state);
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
      minijuegoUsado: false,
      decisivoUsado: false,
      preSerieUsado: false,
      postSerie: false
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

  // Fase 9R4b: el mapa que cierra la serie tiene su propio cupo y su propio
  // margen. El del mapa normal sigue siendo uno por serie (PLAN.md:80: "que
  // tampoco todo sea un gambling a los minijuegos"), pero ya no se puede comer
  // el del mapa que define.
  const rondaConMinijuego = ['semis', 'final', 'internacional'].includes(state.serie.ronda);
  if (rondaConMinijuego) {
    const desempate = esMapaDeDesempate(state.serie.marcador, state.serie.formato);
    const momento = desempate && !state.serie.decisivoUsado ? 'mapa_decisivo'
      : !state.serie.minijuegoUsado ? 'mapa_cerrado'
        : null;
    const margen = momento === 'mapa_decisivo'
      ? BALANCE.serie.margenMapaCerradoDecisivo
      : BALANCE.serie.margenMapaCerrado;

    if (momento && esMapaCerrado(fuerzaPropia, state.serie.rival.fuerza, margen)) {
      const pausa = pausaDeMinijuego(state, momento, logsAcum, { campeonElegido, fuerzaPropia });
      if (pausa) {
        return pausa;
      }
    }
  }

  return finalizarMapa(state, campeonElegido, fuerzaPropia, 0, rng, logsAcum);
}

function finalizarMapa(state, campeonElegido, fuerzaPropia, ajusteMinijuego, rng, logsAcum) {
  const s = BALANCE.serie;
  const fuerzaFinal = fuerzaPropia * (1 + ajusteMinijuego);
  const gano = gauss(fuerzaFinal, s.ruidoMapa, rng) > gauss(state.serie.rival.fuerza, s.ruidoRivalSerie, rng);

  const marcador = [...state.serie.marcador];
  marcador[gano ? 0 : 1] += 1;
  const marcadorStr = `${marcador[0]}-${marcador[1]}`;
  const numeroMapa = state.serie.mapaActual + 1;
  const cierre = generarCierreMapa(campeonElegido, gano, marcadorStr, state);

  const nextState = {
    ...state,
    career: { ...state.career, registro: registrarMapa(state.career.registro, gano) },
    serie: {
      ...state.serie,
      marcador,
      quemados: [...state.serie.quemados, campeonElegido],
      mapas: [...state.serie.mapas, {
        mapa: numeroMapa,
        campeon: campeonElegido,
        resultado: gano ? 'W' : 'L',
        marcador: marcadorStr,
        cierre
      }],
      mapaActual: numeroMapa
    }
  };

  const logs = [...logsAcum, crearLog(
    'serie',
    `Mapa ${numeroMapa} — jugás ${campeonElegido}: ${gano ? 'ganan' : 'pierden'}. Marcador ${marcadorStr}.`,
    { mapa: numeroMapa, campeon: campeonElegido, resultado: gano ? 'W' : 'L', marcador: marcadorStr, cierre }
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
        camino: state.serie.mapas.map((mapa, i) => ({
          mapa: mapa.mapa ?? (i + 1),
          campeon: mapa.campeon,
          resultado: mapa.resultado,
          marcador: mapa.marcador,
          cierre: mapa.cierre
        }))
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
  const datosPost = {
    postSerie: true,
    ronda,
    rival: state.serie.rival.org,
    marcador: [...marcador],
    gano,
    mapas: [...st.serie.mapas]
  };

  if (ronda === 'internacional') {
    logs.push(crearLog('serie', gano
      ? 'Ganaste tu serie en el internacional: se habló de vos afuera de tu región.'
      : 'Perdiste tu serie en el internacional: vuelta temprano a casa.',
      datosPost));
    st = aplicarConsecuenciaInternacional(st, gano, rng);
  } else if (gano && ronda === 'final') {
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

  if (['final', 'internacional'].includes(ronda) && !st.serie.minijuegoUsado) {
    const pausa = pausaDeMinijuego(st, 'post_serie', logs, { trasRonda: ronda, gano });
    if (pausa) {
      return pausa;
    }
  }

  return continuarTrasRonda(st, ronda, gano, rng, logs);
}

function continuarTrasRonda(state, ronda, gano, rng, logsAcum) {
  if (ronda === 'internacional') {
    return { state: { ...state, serie: { ...state.serie, activa: false, postSerie: true } }, logs: logsAcum };
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
    return { state: { ...state, serie: { ...state.serie, activa: false, postSerie: true } }, logs: logsAcum };
  }

  const st = iniciarRonda(state, 'internacional', rng);
  const logs = [...logsAcum, crearLog('serie', `Clasificaste al internacional: rival, ${st.serie.rival.org}.`)];

  // El bootcamp NO gasta el cupo de la serie (9R4b): pasa antes del primer
  // mapa, y hasta acá dejaba al internacional —la serie más grande del juego—
  // sin una sola jugada dentro de un mapa ni rueda de prensa.
  return pausaDeMinijuego(st, 'pre_internacional', logs) ?? jugarMapaSiguiente(st, rng, logs);
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

  return jugarMapaSiguiente(st, rng, logs);
}

export function resolver(state, decision, respuesta, rng) {
  const { motivo } = decision.datos;

  if (motivo === 'draft') {
    return jugarConCampeon(state, respuesta.opcionId, rng, []);
  }

  // Fase 9R4a: la rama la decide el DATO (`efecto.tipo`), no el id del
  // minijuego. Agregar una mecánica nueva al catálogo no toca este archivo.
  const entrada = minijuegoPorId(decision.datos.minijuego);
  const resultado = clamp(respuesta.resultado ?? 0.5, 0, 1);
  const ajusteBase = (resultado - 0.5) * 2;
  const stConCupo = { ...state, serie: { ...state.serie, ...cupoGastado(decision.datos.momento) } };

  if (entrada.efecto.tipo === 'mapa') {
    const { campeonElegido, fuerzaPropia } = decision.datos;
    const amortiguado = entrada.efecto.amortiguador === 'jerarquia'
      ? factorJerarquiaEnLlamada(state.career.jerarquia)
      : 1;
    return finalizarMapa(stConCupo, campeonElegido, fuerzaPropia, ajusteBase * entrada.impacto * amortiguado, rng, []);
  }

  const st = aplicarStatsDeMinijuego(stConCupo, entrada.efecto.targets, ajusteBase * entrada.impacto);
  const logs = [crearLog('serie', veredictoDeMinijuego(entrada.id, resultado, state).detalle)];

  return decision.datos.momento === 'pre_internacional'
    ? jugarMapaSiguiente(st, rng, logs)
    : continuarTrasRonda(st, decision.datos.trasRonda, decision.datos.gano, rng, logs);
}

export function resolverAuto(state, decision, rng) {
  const { motivo } = decision.datos;

  if (motivo === 'draft') {
    // Fase 9Rc: mismo criterio único que `decisionDeDraft` (factorDeCampeon,
    // exagerado para que el headless no tire una moneda entre un pick bueno y
    // uno apenas peor).
    const elegido = weightedPick(decision.opciones, (opcion) => {
      const campeon = state.player.championPool.find((candidato) => candidato.name === opcion.id);
      return campeon ? pesoDePick(campeon, state.meta.weights) : 1;
    }, rng);
    return { opcionId: elegido.id };
  }

  // Regla 5 de 4.6: Node simula el minijuego con gauss corrido por el stat
  // relevante — el motor no lo implementa, solo lo consume.
  const entrada = minijuegoPorId(decision.datos.minijuego);
  const valor = state.player.stats[decision.datos.statRelevante] ?? 50;
  return { resultado: clamp(gauss(valor / 100, entrada.spread, rng), 0, 1) };
}
