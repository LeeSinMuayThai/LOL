import { weightedPick, chance } from '../core/rng.js';
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
import { pesoDePick } from '../core/ajusteMeta.js';
import { registrarFecha } from '../core/registro.js';
import { BALANCE } from '../data/balance.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';

export const id = 'temporada';

// La temporada regular (fase 5): antes de esto, `rendimiento.js` resolvía la
// posición del split entero con una sola tirada. Ahora hay un calendario real
// con nombre y tabla, y a lo sumo UNA fecha del split frena al jugador (fase
// 9Re: era 2-3) — draft corto, un momento con 2 a 4 opciones que mueve el
// resultado de ESE partido, y el resultado inmediato. El resto del calendario
// se resuelve en silencio y pasa resumido en una línea `tecnico`.
// `rendimiento.js` sigue aplicando las consecuencias (hype, mentalidad,
// jerarquía, títulos): esto solo decide de dónde sale la posición que él lee.

// Fase 9R0a: eran siete strings fijos y una fecha marcada por split durante
// ~20 splits, así que el jugador leía la MISMA frase una y otra vez ("La
// revancha contra tal, que te sacó de la última serie"). Ahora cada motivo
// tiene varias variantes y se elige una de forma determinista según el rival y
// el split — sin tocar el `rng`, para no correr el stream.
export const ETIQUETAS_MOTIVO = {
  clasico: ['Clásico', 'El clásico', 'Viejo conocido'],
  puntero: ['Contra el puntero', 'El de arriba', 'Choque de arriba'],
  define_clasificacion: ['Se define la clasificación', 'Partido bisagra', 'Todo o nada'],
  revancha: ['La revancha', 'Cuentas pendientes', 'El desquite'],
  presion: ['Con la soga al cuello', 'Sin margen', 'Obligados'],
  rival_de_generacion: ['Cruce de generación', 'El de tu camada', 'Mano a mano generacional'],
  parejo: ['Partido parejo', 'Mano a mano', 'Se define por detalles']
};

export const FRASES_MOTIVO = {
  clasico: [
    (r) => `El clásico contra ${r}.`,
    (r) => `Otra vez contra ${r}: siempre pesa distinto.`,
    (r) => `${r} enfrente. Con estos ya hay historia.`,
    (r) => `Toca ${r}, y no es un partido más.`,
    (r) => `Contra ${r}, el rival de siempre.`
  ],
  puntero: [
    (r) => `Contra el puntero, ${r}.`,
    (r) => `${r} va primero: hoy se mide contra el mejor.`,
    (r) => `Choque contra ${r}, que lidera la tabla.`,
    (r) => `${r} arriba de todos. A ver de qué están hechos.`,
    (r) => `Contra ${r}, el que manda la liga por ahora.`
  ],
  define_clasificacion: [
    (r) => `Contra ${r}, con la clasificación en juego.`,
    (r) => `${r}, y de este partido depende entrar a playoffs.`,
    (r) => `Contra ${r}: ganar es entrar, perder es quedar afuera.`,
    (r) => `${r} enfrente, con el boleto a playoffs sobre la mesa.`,
    (r) => `Contra ${r}, partido bisagra por la clasificación.`
  ],
  revancha: [
    (r) => `La revancha contra ${r}, que te dejó afuera la última vez.`,
    (r) => `${r} otra vez: los mismos que te eliminaron.`,
    (r) => `Contra ${r}, con la eliminación todavía atragantada.`,
    (r) => `${r} enfrente. Hay cuentas pendientes de la última serie.`,
    (r) => `Toca ${r}, los que te sacaron de los playoffs pasados.`
  ],
  presion: [
    (r) => `Contra ${r}, veniendo de racha negativa.`,
    (r) => `${r} enfrente, y no podés permitirte otra derrota.`,
    (r) => `Contra ${r}, con la cabeza cargada de las últimas caídas.`,
    (r) => `${r}, y el vestuario necesita ganar ya.`,
    (r) => `Contra ${r}, obligados a cortar la mala racha.`
  ],
  rival_de_generacion: [
    (r) => `Contra ${r}, con uno de tu generación del otro lado.`,
    (r) => `${r} enfrente: del otro lado juega uno de tu camada.`,
    (r) => `Contra ${r}, mano a mano con alguien que debutó con vos.`,
    (r) => `${r}, y enfrente está uno con el que te comparan.`,
    (r) => `Toca ${r}: cruce con un rival de tu propia generación.`
  ],
  parejo: [
    (r) => `Contra ${r}, mano a mano.`,
    (r) => `${r} enfrente, de los que se definen por detalles.`,
    (r) => `Contra ${r}, parejo de arriba a abajo.`,
    (r) => `${r}, y en el papel no hay favorito.`,
    (r) => `Contra ${r}, uno de esos que salen 50 y 50.`
  ]
};

function hashCorto(texto) {
  let h = 0;
  for (const caracter of String(texto ?? '')) {
    h = (h * 31 + caracter.charCodeAt(0)) | 0;
  }
  return Math.abs(h);
}

function variante(lista, semilla) {
  return lista[hashCorto(semilla) % lista.length];
}

function etiquetaDeMotivo(motivo, semilla = '') {
  const opciones = ETIQUETAS_MOTIVO[motivo] ?? ['Partido'];
  return variante(opciones, `${motivo}|${semilla}`);
}

function fraseDeMotivo(motivo, rival, semilla = '') {
  const opciones = FRASES_MOTIVO[motivo] ?? FRASES_MOTIVO.parejo;
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
    titulo: `vs ${fecha.rival} · ${etiquetaDeMotivo(motivoPrincipal(fecha.motivos), state.player.splitCount)}`,
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
  // Fase 9Rc: el factor del draft es RELATIVO al campeón del split (el que ya
  // asumió `t.fuerzaPropia`). Elegir ese mismo campeón para la fecha da 0.
  const campeonDelSplit = state.player.championPool.find((c) => c.name === state.player.campeonDelSplit);
  const factorDraft = factorDraftFecha(fecha.campeonElegido, campeonDelSplit, state.meta.weights);
  const fuerzaFecha = t.fuerzaPropia * (1 + factorDraft + (t.ajustePartido ?? 0));
  const gano = resolverFecha(fuerzaFecha, fecha.fuerzaRival, rng);

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
    gano,
    rng
  );
  const tt = stConResultado.career.temporada;
  const tablaTrasFecha = tablaDePosiciones(tt.registrosOtros, tt.filaPropia);
  const posicion = posicionEnTabla(tablaTrasFecha, state.career.currentOrg);

  const logs = [...logsAcum, crearLog(
    'temporada',
    `${fraseDeMotivo(motivo, fecha.rival, state.player.splitCount)} ${gano ? 'Ganan.' : 'Pierden.'} `
    + `Quedan ${posicion}º de ${tablaTrasFecha.length}`
    + `${fecha.campeonElegido ? ` jugando ${fecha.campeonElegido.name}` : ''}.`
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
      return {
        state: { ...st, career: { ...st.career, temporada: { ...t, activa: false, posicion, tabla: tablaFinal } } },
        logs
      };
    }

    const fecha = t.calendario[t.indice];
    const liga = ligaOZonaDeCarrera(st);
    const tablaAntes = tablaDePosiciones(t.registrosOtros, t.filaPropia);
    const motivos = motivosDeFecha(st, liga, fecha, tablaAntes, t.racha, t.indice, t.calendario.length);
    const principal = motivoPrincipal(motivos);

    // Fase 9Re: se marca la PRIMERA fecha del split con un motivo real (nunca
    // `parejo`), y como mucho una. Fase 9R0a: y sólo si el par (motivo, rival)
    // no está en cooldown — sin esto la misma revancha/clásico contra el mismo
    // rival se marcaba split tras split (el fixture es determinista y ese
    // rival no cambiaba). Una temporada sin ningún motivo libre pasa entera
    // resumida, y está bien.
    const marcadasQueFaltan = t.objetivoMarcadas - t.marcadasHechas;
    const marcar = marcadasQueFaltan > 0
      && principal !== 'parejo'
      && !parEnCooldown(st, principal, fecha.rival);

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

  // Solo queda el 'momento': la reacción postpartido dejó de ser una decisión
  // (fase 9Re, se resuelve sola en `resolverFechaMarcada`).
  const evento = TODOS_LOS_EVENTOS.find((candidato) => candidato.id === decision.datos.eventoId);
  const { state: nextState, logs } = resolverOpcion(state, evento, respuesta.opcionId, rng);

  return resolverFechaMarcada(nextState, rng, logs);
}

export function resolverAuto(state, decision, rng) {
  const { motivo } = decision.datos;

  if (motivo === 'draft') {
    // Mismo criterio único que el draft de una serie de playoffs (fase 9Rc):
    // `pesoDePick` (factorDeCampeon exagerado), no uniforme, para que el camino
    // headless mida algo parecido a jugar con criterio.
    const elegido = weightedPick(state.player.championPool, (campeon) => pesoDePick(campeon, state.meta.weights), rng);
    return { opcionId: elegido.name };
  }

  const evento = TODOS_LOS_EVENTOS.find((candidato) => candidato.id === decision.datos.eventoId);
  const opcion = weightedPick(opcionesVivas(state, evento), (candidata) => candidata.weight, rng);
  return { opcionId: opcion.id };
}
