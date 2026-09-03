import { roll, weightedPick, chance } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { calcularContexto } from '../core/contexto.js';
import { resolverTexto } from '../core/plantillas.js';
import { ligaOZonaDeCarrera } from '../core/competicion.js';
import {
  generarFixture, aplicarCrucesDeJornada, tablaDePosiciones, posicionEnTabla,
  resolverFecha, motivosDeFecha, motivoPrincipal, decisionDeDraftFecha, factorDraftFecha,
  registrarEnFila, filaVacia
} from '../core/temporada.js';
import { calcularRendimiento, fuerzaDelEquipo } from './rendimiento.js';
import { disponibleEn, opcionesVivas, resolverOpcion, cooldownActivo, pesoConMemoria } from './events.js';
import { deseoPorCampeon } from '../core/ajusteMeta.js';
import { registrarFecha } from '../core/registro.js';
import { BALANCE } from '../data/balance.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';

export const id = 'temporada';

// La temporada regular (fase 5): antes de esto, `rendimiento.js` resolvía la
// posición del split entero con una sola tirada. Ahora hay un calendario real
// con nombre y tabla, y 2-3 fechas del split se juegan de verdad — draft
// corto, un momento con 2 a 4 opciones que mueve el resultado de ESE
// partido, y el resultado inmediato. El resto del calendario se resuelve en
// silencio y pasa resumido en una línea. `rendimiento.js` sigue aplicando las
// consecuencias (hype, mentalidad, jerarquía, títulos): esto solo decide de
// dónde sale la posición que él lee.

const ETIQUETAS_MOTIVO = {
  clasico: 'Clásico',
  puntero: 'Contra el puntero',
  define_clasificacion: 'Se define la clasificación',
  revancha: 'La revancha',
  presion: 'Con la soga al cuello',
  rival_de_generacion: 'Cruce de generación',
  parejo: 'Partido parejo'
};

const FRASES_MOTIVO = {
  clasico: (rival) => `El clásico contra ${rival}.`,
  puntero: (rival) => `Contra el puntero, ${rival}.`,
  define_clasificacion: (rival) => `Contra ${rival}, con la clasificación en juego.`,
  revancha: (rival) => `La revancha contra ${rival}, que te sacó de la última serie que jugaste.`,
  presion: (rival) => `Contra ${rival}, veniendo de racha negativa.`,
  rival_de_generacion: (rival) => `Contra ${rival}, con uno de tu generación del otro lado.`,
  parejo: (rival) => `Contra ${rival}, mano a mano.`
};

function etiquetaDeMotivo(motivo) {
  return ETIQUETAS_MOTIVO[motivo] ?? 'Partido';
}

function fraseDeMotivo(motivo, rival) {
  return (FRASES_MOTIVO[motivo] ?? FRASES_MOTIVO.parejo)(rival);
}

function textoResumenSilencioso({ ganados, perdidos }) {
  const total = ganados + perdidos;
  if (total === 0) {
    return null;
  }
  if (perdidos === 0) {
    return `Temporada regular: ${ganados} de ${ganados}, sin sobresaltos.`;
  }
  if (ganados === 0) {
    return `Temporada regular: ${perdidos} derrotas seguidas en las fechas de rutina.`;
  }
  return `Temporada regular: ${ganados}-${perdidos} en las fechas de rutina.`;
}

// --- Arrancar la temporada del split ---

function iniciarTemporada(state, rng) {
  // `ligaOZonaDeCarrera` no debería devolver null nunca con currentOrg seteado
  // (todo tier tiene una liga o una zona sintética), pero si alguna vez pasa,
  // la temporada queda vacía en vez de reventar: calendario sin fechas, cruces
  // vacíos, registrosOtros vacío, y `continuarTemporada` cierra en el primer
  // chequeo con una tabla de un solo equipo.
  const liga = ligaOZonaDeCarrera(state);
  const { calendario, cruces } = generarFixture(liga, state.career.currentOrg);
  // Fase 9Rb: las filas ajenas arrancan en cero, igual que la tuya. Se llenan
  // jornada a jornada en `avanzarFechaSilenciosa`, en paso con tus fechas.
  const registrosOtros = Object.fromEntries(
    (liga?.orgs ?? [])
      .filter((org) => org.nombre !== state.career.currentOrg)
      .map((org) => [org.nombre, filaVacia(org.nombre)])
  );
  const t = BALANCE.temporada;
  const objetivoMarcadas = Math.min(calendario.length, roll(t.fechasMarcadasMin, t.fechasMarcadasMax, rng));

  const rendimiento = calcularRendimiento(state, rng);
  const fuerzaPropia = fuerzaDelEquipo(state, rendimiento);

  return {
    activa: true,
    calendario,
    cruces,
    indice: 0,
    rendimiento,
    fuerzaPropia,
    registrosOtros,
    filaPropia: { org: state.career.currentOrg, ganados: 0, perdidos: 0 },
    racha: 0,
    objetivoMarcadas,
    marcadasHechas: 0,
    ajustePartido: 0,
    posicion: null,
    tabla: [],
    fechaEnCurso: null
  };
}

// El único choke point por el que avanza una jornada, marcada o silenciosa.
// Registra el resultado de tu fecha (`t.calendario[t.indice]`) en los DOS
// lados — tu fila y la del rival — y resuelve los cruces ajenos de ESA misma
// jornada (`t.cruces[t.indice]`), para que todas las filas de la tabla
// avancen juntas (fase 9Rb). Cada jornada suma exactamente un ganado y un
// perdido por equipo.
function avanzarFechaSilenciosa(state, gano, rng) {
  const t = state.career.temporada;
  const fecha = t.calendario[t.indice];
  const registrosTrasOtros = aplicarCrucesDeJornada(t.registrosOtros, t.cruces?.[t.indice] ?? [], rng);
  return {
    ...state,
    career: {
      ...state.career,
      // Fase 8: cada fecha de temporada regular jugada —marcada o silenciosa,
      // esta función es el único choke point de las dos— suma al registro
      // global y a la fila de la org en curso.
      registro: registrarFecha(state.career.registro, gano),
      temporada: {
        ...t,
        indice: t.indice + 1,
        filaPropia: registrarEnFila(t.filaPropia, gano),
        registrosOtros: { ...registrosTrasOtros, [fecha.rival]: registrarEnFila(registrosTrasOtros[fecha.rival], !gano) },
        racha: gano ? (t.racha > 0 ? t.racha + 1 : 1) : (t.racha < 0 ? t.racha - 1 : -1)
      }
    }
  };
}

// --- El pool de contenido de una fecha marcada ---
//
// Dos pools separados por `category`, no por `stakes`: el momento (antes del
// resultado, con `type: 'partido'` en sus efectos) y la reacción post-partido
// (después, solo mueve stats). Comparten el mismo eje `stakes` y el mismo
// cooldown compartido con el resto del catálogo (`state.flags.cooldownHasta`).
function candidatosDePartido(state, motivo, soloPostpartido) {
  const contexto = calcularContexto(state, { ventana: 'regular', stakes: motivo });
  return TODOS_LOS_EVENTOS.filter((evento) => (
    Boolean(evento.contexto?.stakes)
    && (evento.category === 'partido_postpartido') === soloPostpartido
    && !cooldownActivo(state, evento.id)
    && disponibleEn(state, evento, contexto)
    && opcionesVivas(state, evento, contexto).length >= 2
  ));
}

function construirDecisionDraft(state) {
  const fecha = state.career.temporada.fechaEnCurso;
  return {
    tipo: 'opciones',
    titulo: `vs ${fecha.rival} · ${etiquetaDeMotivo(motivoPrincipal(fecha.motivos))}`,
    descripcion: 'Con qué campeón vas a este partido.',
    opciones: state.player.championPool.map((campeon) => ({
      id: campeon.name,
      label: campeon.name,
      descripcion: `Maestría ${Math.round(campeon.mastery)}.`
    })),
    datos: { motivo: 'draft' }
  };
}

function construirDecisionMomento(state, evento, contexto, fecha, tipoDecision) {
  return {
    tipo: 'opciones',
    titulo: `${resolverTexto(evento.title, state)} — vs ${fecha.rival}`,
    descripcion: resolverTexto(evento.description, state),
    opciones: opcionesVivas(state, evento, contexto).map((opcion) => ({
      id: opcion.id,
      label: resolverTexto(opcion.label, state),
      descripcion: resolverTexto(opcion.descripcion, state)
    })),
    datos: { motivo: tipoDecision, eventoId: evento.id }
  };
}

function arrancarMomento(state, rng, logs, campeonElegido) {
  const fecha = { ...state.career.temporada.fechaEnCurso, campeonElegido };
  const stConCampeon = { ...state, career: { ...state.career, temporada: { ...state.career.temporada, fechaEnCurso: fecha } } };
  const motivo = motivoPrincipal(fecha.motivos);
  const candidatos = candidatosDePartido(stConCampeon, motivo, false);

  if (candidatos.length === 0) {
    // Red de seguridad (no debería pasar con el catálogo escrito, pero un
    // stakes×rol sin contenido no puede dejar el pipeline colgado): se
    // resuelve la fecha directo, sin momento ni ajuste de partido.
    return resolverFechaMarcada(stConCampeon, rng, logs);
  }

  const evento = weightedPick(candidatos, (candidato) => pesoConMemoria(state, candidato), rng);
  const contexto = calcularContexto(stConCampeon, { ventana: 'regular', stakes: motivo });

  return { state: stConCampeon, logs, decision: construirDecisionMomento(stConCampeon, evento, contexto, fecha, 'momento') };
}

function arrancarFechaMarcada(state, rng, logs) {
  const draft = decisionDeDraftFecha(state);
  if (draft.pausa) {
    return { state, logs, decision: construirDecisionDraft(state) };
  }
  return arrancarMomento(state, rng, logs, draft.elegido);
}

// --- Resolver el resultado de la fecha marcada y seguir el calendario ---

function resolverFechaMarcada(state, rng, logsAcum) {
  const t = state.career.temporada;
  const fecha = t.fechaEnCurso;
  const motivo = motivoPrincipal(fecha.motivos);
  const factorDraft = factorDraftFecha(fecha.campeonElegido, state.meta.weights);
  const fuerzaFecha = t.fuerzaPropia * (1 + factorDraft + (t.ajustePartido ?? 0));
  const gano = resolverFecha(fuerzaFecha, fecha.fuerzaRival, rng);

  // El resultado ya quedó fijo: se avanza la jornada COMPLETA (tu fecha + los
  // cruces ajenos de esa ronda) ANTES de leer la tabla, para que la posición
  // que se loguea sea la de una jornada de verdad cerrada y no la de
  // vos-jugaste-y-el-resto-no (fase 9Rb). La reacción posterior es flavor y no
  // puede volver a tocar el resultado.
  const stConResultado = avanzarFechaSilenciosa(
    { ...state, career: { ...state.career, temporada: { ...t, ajustePartido: 0 } } },
    gano,
    rng
  );
  const tt = stConResultado.career.temporada;
  const tablaTrasFecha = tablaDePosiciones(tt.registrosOtros, tt.filaPropia);
  const posicion = posicionEnTabla(tablaTrasFecha, state.career.currentOrg);

  const logs = [...logsAcum, crearLog(
    'temporada',
    `${fraseDeMotivo(motivo, fecha.rival)} ${gano ? 'Ganan.' : 'Pierden.'} `
    + `Quedan ${posicion}º de ${tablaTrasFecha.length}`
    + `${fecha.campeonElegido ? ` jugando ${fecha.campeonElegido.name}` : ''}.`
  )];

  if (chance(BALANCE.temporada.probReaccion, rng)) {
    const candidatos = candidatosDePartido(stConResultado, motivo, true);
    if (candidatos.length > 0) {
      const evento = weightedPick(candidatos, (candidato) => pesoConMemoria(stConResultado, candidato), rng);
      const contexto = calcularContexto(stConResultado, { ventana: 'regular', stakes: motivo });
      // `fechaEnCurso` sigue vivo un turno más: {rivalDeLaFecha} tiene que
      // seguir resolviendo en el texto de la reacción. Se limpia al resolverla.
      return { state: stConResultado, logs, decision: construirDecisionMomento(stConResultado, evento, contexto, fecha, 'reaccion') };
    }
  }

  return continuarTemporada(limpiarFechaEnCurso(stConResultado), rng, logs);
}

function limpiarFechaEnCurso(state) {
  return { ...state, career: { ...state.career, temporada: { ...state.career.temporada, fechaEnCurso: null } } };
}

// --- El loop principal: recorre el calendario, marca 2-3 fechas, resuelve el resto en silencio ---

function continuarTemporada(state, rng, logsAcum) {
  let st = state;
  let silenciosas = { ganados: 0, perdidos: 0 };

  for (;;) {
    const t = st.career.temporada;

    if (t.indice >= t.calendario.length) {
      const logs = [...logsAcum];
      const resumen = textoResumenSilencioso(silenciosas);
      if (resumen) {
        logs.push(crearLog('temporada', resumen));
      }
      const tablaFinal = tablaDePosiciones(t.registrosOtros, t.filaPropia);
      const posicion = posicionEnTabla(tablaFinal, st.career.currentOrg);
      return {
        state: { ...st, career: { ...st.career, temporada: { ...t, activa: false, posicion, tabla: tablaFinal } } },
        logs
      };
    }

    const fecha = t.calendario[t.indice];
    const liga = ligaOZonaDeCarrera(st);
    const tablaAntes = tablaDePosiciones(t.registrosOtros, t.filaPropia);
    const motivos = motivosDeFecha(st, liga, fecha, tablaAntes, t.racha, t.indice, t.calendario.length);

    const fechasRestantes = t.calendario.length - t.indice;
    const marcadasQueFaltan = t.objetivoMarcadas - t.marcadasHechas;
    const forzarMarca = marcadasQueFaltan > 0 && fechasRestantes <= marcadasQueFaltan;
    const marcar = marcadasQueFaltan > 0 && (forzarMarca || motivos.some((motivo) => motivo !== 'parejo'));

    if (marcar) {
      const logs = [...logsAcum];
      const resumen = textoResumenSilencioso(silenciosas);
      if (resumen) {
        logs.push(crearLog('temporada', resumen));
      }
      const stConFecha = {
        ...st,
        career: {
          ...st.career,
          temporada: { ...t, marcadasHechas: t.marcadasHechas + 1, fechaEnCurso: { ...fecha, motivos } }
        }
      };
      return arrancarFechaMarcada(stConFecha, rng, logs);
    }

    const gano = resolverFecha(t.fuerzaPropia, fecha.fuerzaRival, rng);
    silenciosas = { ...silenciosas, [gano ? 'ganados' : 'perdidos']: silenciosas[gano ? 'ganados' : 'perdidos'] + 1 };
    st = avanzarFechaSilenciosa(st, gano, rng);
  }
}

// --- Contrato del sistema ---

// El guard es EXACTAMENTE el de rendimiento.js (regla de proceso: dos
// sistemas que se pasan un resultado entre sí no pueden tener guards
// distintos, o uno corre y el otro lee un `career.temporada` de un split
// viejo). `iniciarTemporada` es quien se hace cargo de una liga rara —nunca
// esta función.
export function aplicar(state, rng) {
  if (state.phase !== 'profesional' || !state.career.currentOrg || state.career.companeros.length === 0) {
    return { state, logs: [] };
  }

  const st = { ...state, career: { ...state.career, temporada: iniciarTemporada(state, rng) } };
  return continuarTemporada(st, rng, []);
}

export function resolver(state, decision, respuesta, rng) {
  const { motivo } = decision.datos;

  if (motivo === 'draft') {
    const elegido = state.player.championPool.find((campeon) => campeon.name === respuesta.opcionId) ?? null;
    return arrancarMomento(state, rng, [], elegido);
  }

  const evento = TODOS_LOS_EVENTOS.find((candidato) => candidato.id === decision.datos.eventoId);
  const { state: nextState, logs } = resolverOpcion(state, evento, respuesta.opcionId, rng);

  if (motivo === 'reaccion') {
    return continuarTemporada(limpiarFechaEnCurso(nextState), rng, logs);
  }

  return resolverFechaMarcada(nextState, rng, logs);
}

export function resolverAuto(state, decision, rng) {
  const { motivo } = decision.datos;

  if (motivo === 'draft') {
    // Mismo criterio que el draft de una serie de playoffs (fase 4): pesa por
    // deseo (maestría × afinidad al meta), no uniforme, para que el camino
    // headless mida algo parecido a jugar con criterio.
    const elegido = weightedPick(state.player.championPool, (campeon) => deseoPorCampeon(campeon, state.meta.weights), rng);
    return { opcionId: elegido.name };
  }

  const evento = TODOS_LOS_EVENTOS.find((candidato) => candidato.id === decision.datos.eventoId);
  const opcion = weightedPick(opcionesVivas(state, evento), (candidata) => candidata.weight, rng);
  return { opcionId: opcion.id };
}
