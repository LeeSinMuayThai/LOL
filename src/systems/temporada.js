import { crearLog } from '../core/log.js';
import { ligaOZonaDeCarrera } from '../core/competicion.js';
import {
  generarFixture, aplicarCrucesDeJornada, tablaDePosiciones, posicionEnTabla,
  registrarEnFila, filaVacia, rendimientoDeLaTemporada, resultadosVacios, sumarResultado
} from '../core/temporada.js';
import { nivelDeCompaneros, rendimientoBase, rendimientoDePartido, fuerzaDePartido } from '../core/fuerza.js';
import { jugarPartido } from '../core/partido.js';
import { nivelDelJugador } from '../core/ficha.js';
import { registrarFecha, registrarSplitJugado } from '../core/registro.js';
import { BALANCE } from '../data/balance.js';

export const id = 'temporada';

// La temporada regular (fase 5): un calendario real con nombre y tabla. H1b (PLANUI §0.10, H1.6): el usuario decidió que la
// temporada regular NUNCA tiene minijuego ni parada de partido, así que se juega entera en silencio y pasa resumida en una
// línea `tecnico`. Lo que antes frenaba acá (la fecha marcada con su "momento", la parada garantizada de F2 y el Bo1
// arriesgado/seguro de D118) salió: los 64 eventos de partido viven ahora en el mazo del split (`data/events/partido/`).
// Los playoffs no cambian (`serie.js`). `rendimiento.js` sigue aplicando las consecuencias (hype, mentalidad, jerarquía,
// títulos): esto solo decide de dónde sale la posición que él lee.


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
  // K2b: la fuerza del split es DETERMINISTA. Hasta K2a acá se tiraba un
  // `gauss` (el rendimiento del split) que decidía las 7-9 fechas juntas; ahora
  // cada fecha es una tirada contra su p y nada más (`jugarPartido`).
  const rendimiento = rendimientoDePartido(state);
  const fuerzaPropia = fuerzaDePartido(state);

  return {
    activa: true,
    calendario,
    cruces,
    indice: 0,
    // El rendimiento del split: hasta que cierre el calendario, el de los
    // partidos (el base acotado); al cerrar, el que cuentan tus resultados
    // (`rendimientoDeLaTemporada`), que es el que leen las consecuencias.
    rendimiento,
    // K2b: el base sin acotar (con el que se lee el rendimiento del split) y lo
    // que tus fechas dieron contra lo que su p prometía.
    rendimientoBase: rendimientoBase(state),
    resultadosPropios: resultadosVacios(),
    fuerzaPropia,
    // K2a (PLAN.md "K2 — lo que midió la investigación"): lo que el motor usó
    // para `rendimiento` y `fuerzaPropia`, expuesto para el instrumento de
    // `src/dev/simulate.js`: el nivel del jugador (la base de
    // `rendimientoBase`) y el nivel medio de los compañeros (el de
    // `fuerzaDelEquipo`), leídos sobre el MISMO estado que esas dos llamadas.
    // Lectura pura: no cambia ningún cálculo ni consume `rng`.
    nivelJugador: nivelDelJugador(state),
    nivelCompaneros: nivelDeCompaneros(state),
    registrosOtros,
    filaPropia: { org: state.career.currentOrg, ganados: 0, perdidos: 0 },
    racha: 0,
    // Forma del estado (T4, el guardado): ya nadie las lee desde H1b; se borran con la subida de VERSION.
    objetivoMarcadas: 0,
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
// perdido por equipo. K2b: `partido` es `{ gano, p }` de `jugarPartido`; si
// `jugaste` (no estabas de baja), entra a los resultados con los que se lee tu
// rendimiento del split.
function avanzarFechaSilenciosa(state, partido, jugaste, rng) {
  const { gano } = partido;
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
        resultadosPropios: jugaste ? sumarResultado(t.resultadosPropios, partido) : t.resultadosPropios,
        registrosOtros: { ...registrosTrasOtros, [fecha.rival]: registrarEnFila(registrosTrasOtros[fecha.rival], !gano) },
        racha: gano ? (t.racha > 0 ? t.racha + 1 : 1) : (t.racha < 0 ? t.racha - 1 : -1)
      }
    }
  };
}

// --- El loop principal: recorre el calendario entero en silencio ---

function continuarTemporada(state, rng, logsAcum) {
  let st = state;
  let silenciosas = { ganados: 0, perdidos: 0 };

  for (;;) {
    const t = st.career.temporada;

    if (t.indice >= t.calendario.length) {
      const logs = [...logsAcum];
      const resumen = textoResumenSilencioso(silenciosas);
      if (resumen) {
        logs.push(crearLog('temporada', resumen, { tecnico: true }));
      }
      const tablaFinal = tablaDePosiciones(t.registrosOtros, t.filaPropia);
      const posicion = posicionEnTabla(tablaFinal, st.career.currentOrg);
      // K2b: el rendimiento del split lo cuentan los partidos que jugaste.
      const rendimiento = rendimientoDeLaTemporada(t.rendimientoBase, t.resultadosPropios);
      return {
        state: { ...st, career: { ...st.career, temporada: { ...t, activa: false, posicion, tabla: tablaFinal, rendimiento } } },
        logs
      };
    }

    const fecha = t.calendario[t.indice];

    // Fase 10c: mientras haya baja por lesión pendiente (`systems/salud.js`), el equipo juega esta fecha sin vos.
    const enBajaPorLesion = st.flags.fechasBajaLesion > 0;

    // Fuerza penalizada mientras dura la baja — no suma ni saca ninguna tirada de `rng` (trampa T1): sigue siendo una sola
    // tirada por fecha, cambia la fuerza que recibe, no la cantidad de tiradas. Esa fecha no cuenta para tu rendimiento
    // del split: el equipo jugó sin vos.
    const fuerzaEfectiva = enBajaPorLesion ? t.fuerzaPropia * BALANCE.salud.factorFuerzaLesionado : t.fuerzaPropia;
    const partido = jugarPartido(st, fuerzaEfectiva, fecha.fuerzaRival, 'fecha', rng);
    const { gano } = partido;
    silenciosas = { ...silenciosas, [gano ? 'ganados' : 'perdidos']: silenciosas[gano ? 'ganados' : 'perdidos'] + 1 };
    st = avanzarFechaSilenciosa(
      enBajaPorLesion ? { ...st, flags: { ...st.flags, fechasBajaLesion: st.flags.fechasBajaLesion - 1 } } : st,
      partido,
      !enBajaPorLesion,
      rng
    );
  }
}

// --- Contrato del sistema ---

// K1 (D76): el split se cuenta acá, donde se JUEGA (ya pasaron el mercado, el
// ascenso y el descenso), con la org y el tier de ahora. Sin fila abierta para
// esta org (el split del pase), espera en `flags.splitJugadoSinFila` a que
// `roster.js` la abra. Nada del juego lo lee: cero `rng`.
function conSplitJugado(state) {
  const { registro, sinFila } = registrarSplitJugado(
    state.career.registro,
    { org: state.career.currentOrg, tier: state.career.tier },
    state.flags.splitJugadoSinFila
  );
  return {
    ...state,
    flags: { ...state.flags, splitJugadoSinFila: sinFila },
    career: { ...state.career, registro }
  };
}

// El guard es EXACTAMENTE el de rendimiento.js (regla de proceso: dos
// sistemas que se pasan un resultado entre sí no pueden tener guards
// distintos, o uno corre y el otro lee un `career.temporada` de un split
// viejo). `iniciarTemporada` es quien se hace cargo de una liga rara —nunca
// esta función.
export function aplicar(state, rng) {
  if (state.phase !== 'profesional' || !state.career.currentOrg || state.career.companeros.length === 0) {
    return { state, logs: [] };
  }

  const jugado = conSplitJugado(state);
  const st = { ...jugado, career: { ...jugado.career, temporada: iniciarTemporada(jugado, rng) } };
  return continuarTemporada(st, rng, []);
}

// Un guardado viejo puede traer una pausa de fecha marcada o de Bo1 (de antes de H1b): ya no existen. Se descarta la pausa y
// la temporada sigue en silencio desde donde estaba. Nada nuevo frena acá.
export function resolver(state, decision, respuesta, rng) {
  const t = state.career.temporada;
  return continuarTemporada({ ...state, career: { ...state.career, temporada: { ...t, fechaEnCurso: null } } }, rng, []);
}

export function resolverAuto() {
  return {};
}
