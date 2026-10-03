import { weightedPick, chance } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { hashCadena } from '../core/numeros.js';
import { calcularContexto } from '../core/contexto.js';
import { resolverTexto } from '../core/plantillas.js';
import { ligaOZonaDeCarrera } from '../core/competicion.js';
import {
  generarFixture, aplicarCrucesDeJornada, tablaDePosiciones, posicionEnTabla,
  motivosDeFecha, motivoPrincipal, defineClasificacion, defineClasificacionMasAdelante,
  campeonDelSplitEnPool, probabilidadDeFechaMarcada,
  registrarEnFila, filaVacia, rendimientoDeLaTemporada, resultadosVacios, sumarResultado
} from '../core/temporada.js';
import { nivelDeCompaneros, rendimientoBase, rendimientoDePartido, fuerzaDePartido } from '../core/fuerza.js';
import { jugarPartido, tirarPartido } from '../core/partido.js';
import { nivelDelJugador } from '../core/ficha.js';
import { disponibleEn, opcionesVivas, resolverOpcion, cooldownActivo, pesoConMemoria } from './events.js';
import { registrarFecha, registrarSplitJugado } from '../core/registro.js';
import { BALANCE } from '../data/balance.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';

export const id = 'temporada';

// La temporada regular (fase 5): antes de esto, `rendimiento.js` resolvía la
// posición del split entero con una sola tirada. Ahora hay un calendario real
// con nombre y tabla, y a lo sumo UNA fecha del split frena al jugador (fase
// 9Re: era 2-3) — la que decide algo (K4-A), sin draft: la previa y un momento
// con 2 a 4 opciones que mueve el resultado de ESE partido, y el resultado
// inmediato. El resto del calendario
// se resuelve en silencio y pasa resumido en una línea `tecnico`.
// `rendimiento.js` sigue aplicando las consecuencias (hype, mentalidad,
// jerarquía, títulos): esto solo decide de dónde sale la posición que él lee.

// Fase 9R0a: eran siete strings fijos y una fecha marcada por split durante
// ~20 splits, así que el jugador leía la MISMA frase una y otra vez ("La
// revancha contra tal, que te sacó de la última serie"). Ahora cada motivo
// tiene varias variantes y se elige una de forma determinista según el rival y
// el split — sin tocar el `rng`, para no correr el stream.
export const ETIQUETAS_MOTIVO = {
  define_clasificacion: ['Se define la clasificación', 'Partido bisagra', 'Todo o nada'],
  archirrival: ['El archirrival', 'Duelo de archirrivales', 'Cara a cara'],
  clasico: ['Clásico', 'El clásico', 'Viejo conocido'],
  revancha: ['La revancha', 'Cuentas pendientes', 'El desquite']
};

export const FRASES_MOTIVO = {
  define_clasificacion: [
    (r) => `Contra ${r}, con la clasificación en juego.`,
    (r) => `${r}, y de este partido depende entrar a playoffs.`,
    (r) => `Contra ${r}: ganar es entrar, perder es quedar afuera.`,
    (r) => `${r} enfrente, con el boleto a playoffs sobre la mesa.`,
    (r) => `Contra ${r}, partido bisagra por la clasificación.`
  ],
  archirrival: [
    (r) => `Contra ${r}, el equipo de tu archirrival.`,
    (r) => `${r} enfrente, y del otro lado juega tu archirrival.`,
    (r) => `Toca ${r}: con el archirrival enfrente no se regala nada.`,
    (r) => `Contra ${r}, con las cuentas pendientes de tu archirrival.`,
    (r) => `${r}, y el que te viene peleando todo está del otro lado.`
  ],
  clasico: [
    (r) => `El clásico contra ${r}.`,
    (r) => `Otra vez contra ${r}: siempre pesa distinto.`,
    (r) => `${r} enfrente. Con estos ya hay historia.`,
    (r) => `Toca ${r}, y no es un partido más.`,
    (r) => `Contra ${r}, el rival de siempre.`
  ],
  revancha: [
    (r) => `La revancha contra ${r}, que te dejó afuera la última vez.`,
    (r) => `${r} otra vez: los mismos que te eliminaron.`,
    (r) => `Contra ${r}, con la eliminación todavía atragantada.`,
    (r) => `${r} enfrente. Hay cuentas pendientes de la última serie.`,
    (r) => `Toca ${r}, los que te sacaron de los playoffs pasados.`
  ]
};

function variante(lista, semilla) {
  return lista[hashCadena(semilla) % lista.length];
}

function etiquetaDeMotivo(motivo, semilla = '') {
  const opciones = ETIQUETAS_MOTIVO[motivo] ?? ['Partido'];
  return variante(opciones, `${motivo}|${semilla}`);
}

function fraseDeMotivo(motivo, rival, semilla = '') {
  const opciones = FRASES_MOTIVO[motivo] ?? FRASES_MOTIVO.clasico;
  return variante(opciones, `${motivo}|${rival}|${semilla}`)(rival);
}

// Fase 9R0a: un par (motivo, rival) recién marcado entra en cooldown para que
// la misma fecha no se repita split tras split. `flags.motivosFechaRecientes`
// guarda `{ motivo, rival, splitCount }` y se poda a la ventana de cooldown.
function parEnCooldown(state, motivo, rival) {
  const limite = state.player.splitCount - BALANCE.temporada.motivoRivalCooldownSplits;
  return (state.flags.motivosFechaRecientes ?? []).some(
    (par) => par.motivo === motivo && par.rival === rival && par.splitCount > limite
  );
}

function registrarParMarcado(state, motivo, rival) {
  const limite = state.player.splitCount - BALANCE.temporada.motivoRivalCooldownSplits;
  const vivos = (state.flags.motivosFechaRecientes ?? []).filter((par) => par.splitCount > limite);
  return [...vivos, { motivo, rival, splitCount: state.player.splitCount }];
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
  // Fase 9Re: una sola fecha marcada por split (antes: roll(2,3)). Se saca la
  // tirada de acá — un `rng()` menos por split competitivo (D38).
  const objetivoMarcadas = Math.min(calendario.length, t.fechasMarcadasPorSplit);

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

// K3 (PLAN.md "K3, tal como quedó y lo que se decide al integrar"): la pausa guarda la p de antes de decidir
// (`pAntesDeDecidir`, la que muestra la previa). Decidir mueve el partido de verdad —el `ajustePartido` y, con
// `consistencia.k` ≠ 0, la mentalidad—, así que la p tirada se calcula con el estado de después y esta es la que
// el log de la fecha reporta como `pSinMomento` ("el momento la movió desde X%").
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
    datos: {
      motivo: tipoDecision,
      eventoId: evento.id,
      pAntesDeDecidir: probabilidadDeFechaMarcada(state),
      // K4-A: el rótulo del partido, para el subtítulo de la previa.
      etiqueta: etiquetaDeMotivo(motivoPrincipal(fecha.motivos), state.player.splitCount)
    }
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

// K4-A: sin draft. La fecha marcada frena UNA vez —la previa y el momento— y se
// juega con el campeón del split (`factorDraftFecha` de ese campeón es 0).
function arrancarFechaMarcada(state, rng, logs) {
  return arrancarMomento(state, rng, logs, campeonDelSplitEnPool(state) ?? null);
}

// --- Resolver el resultado de la fecha marcada y seguir el calendario ---

function resolverFechaMarcada(state, rng, logsAcum, pAntesDeDecidir = null) {
  const t = state.career.temporada;
  const fecha = t.fechaEnCurso;
  const motivo = motivoPrincipal(fecha.motivos);
  // Fase 9Rc: el factor del draft es RELATIVO al campeón del split (el que ya
  // asumió `t.fuerzaPropia`). Elegir ese mismo campeón para la fecha da 0.
  // K2b: una sola tirada contra la p declarada (la misma que mira el draft).
  // K2d: y la misma que muestra la previa (`probabilidadDeFechaMarcada`); el
  // log lleva esa p y la de antes del momento, para mostrarlas con el resultado.
  // K3: `state` es el de DESPUÉS del momento (con su `ajustePartido` y su
  // mentalidad); la de antes es la que guardó la pausa. Sin momento (la red de
  // seguridad de `arrancarMomento`) nada la movió: es la misma tirada.
  const partido = tirarPartido(probabilidadDeFechaMarcada(state), rng);
  const { gano } = partido;
  const ajustePartido = t.ajustePartido ?? 0;
  const pSinMomento = pAntesDeDecidir ?? partido.p;

  // Fase 9R0a: la revancha se juega UNA vez. Después, ese rival deja de ser
  // "el que te eliminó": si no se limpiaba, `ultimoEliminadoPor` quedaba
  // pegado toda la carrera y la revancha se marcaba split tras split.
  const limpiaEliminado = motivo === 'revancha' && fecha.rival === state.career.ultimoEliminadoPor;

  // El resultado ya quedó fijo: se avanza la jornada COMPLETA (tu fecha + los
  // cruces ajenos de esa ronda) ANTES de leer la tabla, para que la posición
  // que se loguea sea la de una jornada de verdad cerrada y no la de
  // vos-jugaste-y-el-resto-no (fase 9Rb). La reacción posterior es flavor y no
  // puede volver a tocar el resultado.
  const stConResultado = avanzarFechaSilenciosa(
    {
      ...state,
      career: {
        ...state.career,
        ultimoEliminadoPor: limpiaEliminado ? null : state.career.ultimoEliminadoPor,
        temporada: { ...t, ajustePartido: 0 }
      }
    },
    partido,
    true,
    rng
  );
  const tt = stConResultado.career.temporada;
  const tablaTrasFecha = tablaDePosiciones(tt.registrosOtros, tt.filaPropia);
  const posicion = posicionEnTabla(tablaTrasFecha, state.career.currentOrg);

  const logs = [...logsAcum, crearLog(
    'temporada',
    `${fraseDeMotivo(motivo, fecha.rival, state.player.splitCount)} ${gano ? 'Ganan.' : 'Pierden.'} `
    + `Quedan ${posicion}º de ${tablaTrasFecha.length}`
    + `${fecha.campeonElegido ? ` jugando ${fecha.campeonElegido.name}` : ''}.`,
    { p: partido.p, pSinMomento, ajustePartido }
  )];

  // Fase 9Re: la reacción postpartido dejó de ser una decisión. Es flavor —
  // el código mismo dice que no puede tocar el resultado (ya pasó)— y con 4
  // eventos de postpartido para toda la carrera repetía cada uno ~6 veces. Se
  // resuelve sola (opción por peso, exactamente lo que hacía el camino
  // headless) y se cuenta en una línea. El contenido no se borra: se degrada a
  // crónica. El consumo de RNG es idéntico al del camino headless de antes.
  if (chance(BALANCE.temporada.probReaccion, rng)) {
    const candidatos = candidatosDePartido(stConResultado, motivo, true);
    if (candidatos.length > 0) {
      const evento = weightedPick(candidatos, (candidato) => pesoConMemoria(stConResultado, candidato), rng);
      const opcion = weightedPick(opcionesVivas(stConResultado, evento), (candidata) => candidata.weight, rng);
      const { state: trasReaccion, logs: logsReaccion } = resolverOpcion(stConResultado, evento, opcion.id, rng);
      return continuarTemporada(limpiarFechaEnCurso(trasReaccion), rng, [...logs, ...logsReaccion]);
    }
  }

  return continuarTemporada(limpiarFechaEnCurso(stConResultado), rng, logs);
}

function limpiarFechaEnCurso(state) {
  return { ...state, career: { ...state.career, temporada: { ...state.career.temporada, fechaEnCurso: null } } };
}

// --- El loop principal: recorre el calendario, marca a lo sumo una fecha, resuelve el resto en silencio ---

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
    const liga = ligaOZonaDeCarrera(st);

    // Fase 10c: mientras haya baja por lesión pendiente (`systems/salud.js`),
    // el equipo juega esta fecha sin vos — nunca se marca (no hay fecha
    // marcada para un partido que no jugás).
    const enBajaPorLesion = st.flags.fechasBajaLesion > 0;

    // K4-A: se marca la fecha que DECIDE algo, y como mucho una por split
    // (`objetivoMarcadas`). Con el cupo libre se mira esta fecha: si define la
    // clasificación (la de mayor prioridad) frena; si es de menor prioridad (el
    // archirrival, el clásico, la revancha) frena solo si el split no tiene a la
    // vista una que defina la clasificación más adelante, así gana la de mayor
    // prioridad y, a igual prioridad, la primera. Fase 9R0a: y las de menor
    // prioridad solo si el par (motivo, rival) no está en cooldown — sin esto la
    // misma revancha/clásico contra el mismo rival se marcaba split tras split.
    // Una temporada sin ningún motivo libre pasa entera resumida, y está bien.
    const marcadasQueFaltan = t.objetivoMarcadas - t.marcadasHechas;
    let motivos = ['parejo'];
    let marcar = false;
    if (!enBajaPorLesion && marcadasQueFaltan > 0) {
      motivos = motivosDeFecha(st, liga, fecha, t);
      const principal = motivoPrincipal(motivos);
      marcar = principal === 'define_clasificacion'
        || (principal !== 'parejo'
          && !parEnCooldown(st, principal, fecha.rival)
          && !defineClasificacionMasAdelante(st, liga, t));
    }
    const principal = motivoPrincipal(motivos);

    if (marcar) {
      const logs = [...logsAcum];
      const resumen = textoResumenSilencioso(silenciosas);
      if (resumen) {
        logs.push(crearLog('temporada', resumen, { tecnico: true }));
      }
      const stConFecha = {
        ...st,
        flags: { ...st.flags, motivosFechaRecientes: registrarParMarcado(st, principal, fecha.rival) },
        career: {
          ...st.career,
          temporada: { ...t, marcadasHechas: t.marcadasHechas + 1, fechaEnCurso: { ...fecha, motivos } }
        }
      };
      return arrancarFechaMarcada(stConFecha, rng, logs);
    }

    // Fuerza penalizada mientras dura la baja — no suma ni saca ninguna
    // tirada de `rng` (trampa T1): sigue siendo una sola tirada por fecha,
    // cambia la fuerza que recibe, no la cantidad de tiradas. Esa fecha no
    // cuenta para tu rendimiento del split: el equipo jugó sin vos.
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

export function resolver(state, decision, respuesta, rng) {
  // Solo hay 'momento': el draft de la fecha desapareció (K4-A) y la reacción
  // postpartido dejó de ser una decisión (fase 9Re, se resuelve sola en
  // `resolverFechaMarcada`).
  const evento = TODOS_LOS_EVENTOS.find((candidato) => candidato.id === decision.datos.eventoId);
  const { state: nextState, logs } = resolverOpcion(state, evento, respuesta.opcionId, rng);

  return resolverFechaMarcada(nextState, rng, logs, decision.datos.pAntesDeDecidir);
}

export function resolverAuto(state, decision, rng) {
  const evento = TODOS_LOS_EVENTOS.find((candidato) => candidato.id === decision.datos.eventoId);
  const opcion = weightedPick(opcionesVivas(state, evento), (candidata) => candidata.weight, rng);
  return { opcionId: opcion.id };
}
