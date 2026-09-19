import { roll, weightedPick, chance } from '../core/rng.js';
import { getPath, setPath, cumpleCondiciones, etiquetaCampo } from '../core/selectors.js';
import { calcularContexto, coincideContexto } from '../core/contexto.js';
import { resolverTexto } from '../core/plantillas.js';
import { aplicarLPAlEstado, etiquetaDeRanked, servidorDeLaPartida } from '../core/ranked.js';
import { aprenderCampeones, subirMaestria, olvidarPeor, principalDelPool } from '../core/pool.js';
import { registrarMomento } from '../core/registro.js';
import { crearLog } from '../core/log.js';
import { deltaCorto, lista } from '../core/formato.js';
import { tipoDeSplit, hayPresupuesto } from '../core/presupuesto.js';
import { previaDeOpcion, riesgoDeOpcion, gateDeOpcion } from '../core/previa.js';
import { rarezaDeOpcionEvento } from '../core/rareza.js';
import { BALANCE } from '../data/balance.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';

export const id = 'eventos';

// Fase 13e (T10, PLAN.md): el mensaje exacto que loguea `aplicar` cuando
// `elegirEvento` no encuentra ningún candidato — el pool se vació por gating
// fino. Exportado para que validate.js mida su frecuencia real por celda
// momento×ventana sin duplicar el string ni volver a correr `elegirEvento`
// (que consumiría una tirada de más y desincronizaría el stream, T1).
export const SPLIT_SIN_EVENTO_MSG = 'Un split tranquilo, sin eventos destacados.';

// Fase 9Ra: el cooldown se cuenta en splits. `cooldownHasta[id]` es el
// `splitCount` en el que el evento vuelve a estar libre; sigue bloqueado
// mientras ese número sea mayor al split actual.
export function cooldownActivo(state, eventId) {
  return (state.flags.cooldownHasta?.[eventId] ?? -1) > state.player.splitCount;
}

// El gating grueso ("donde estas parado") va en `contexto`; las `conditions`
// solo estrechan con numeros. Esa division es lo que hace que la matriz de
// cobertura sea confiable: si el gating grueso pudiera esconderse adentro de
// una condicion numerica, la matriz mentiria.
//
// El contexto se calcula EN VIVO, no se lee de `state.contexto`: la fase puede
// cambiar a mitad de split (el split en el que firmas, sin ir mas lejos) y el
// cache del arranque ya estaria viejo. El cache es para la UI y los logs.
export function disponibleEn(state, evento, contexto = calcularContexto(state)) {
  return coincideContexto(contexto, evento.contexto, state.age)
    && cumpleCondiciones(state, evento.conditions);
}

// Una opcion puede tener su propio gating: "esta salida solo existe si
// terminaste el secundario".
export function opcionesVivas(state, evento, contexto = calcularContexto(state)) {
  return evento.options.filter((opcion) => disponibleEn(state, opcion, contexto));
}

function candidatos(state) {
  const contexto = calcularContexto(state);
  return TODOS_LOS_EVENTOS.filter(
    (event) => !event.cierreDeEdad
      && !cooldownActivo(state, event.id)
      && disponibleEn(state, event, contexto)
      && opcionesVivas(state, event, contexto).length >= 2
  );
}

// Las tres cosas que un evento puede hacerle al pool. Toda la mecánica vive en
// core/pool.js; acá solo se traduce el JSON.
//
// `objetivo: 'nuevo'` (bug encontrado en la auditoría de contenido, agosto
// 2026): `aprenderCampeones` YA devuelve qué campeón entró (`resultado.campeones`),
// pero como cada efecto de un outcome se aplica por separado, ese dato se
// perdía apenas terminaba el efecto `aprender` — el siguiente efecto
// `maestria objetivo:'nuevo'` no tenía forma de saber a quién apuntar y caía,
// en silencio, sobre `principalDelPool` (el campeón de siempre, no el
// recién llegado). Se arregla dejando un rastro de un solo split en
// `state.flags.ultimoAprendidoPool` (T4-safe, se pisa en cada `aprender` y no
// se lee en ningún otro lado) para que el efecto siguiente, DEL MISMO
// outcome, lo pueda usar.
function aplicarAlPool(state, effect, rng) {
  const pool = state.player.championPool;

  if (effect.accion === 'aprender') {
    const resultado = aprenderCampeones(state, pool, roll(effect.min, effect.max, rng), rng, { criterio: effect.criterio });
    return { ...resultado, ultimoAprendido: resultado.campeones ?? [] };
  }

  if (effect.accion === 'maestria') {
    const nombreNuevo = state.flags.ultimoAprendidoPool?.[0];
    const objetivo = effect.objetivo === 'jugado'
      ? pool.find((campeon) => campeon.name === state.player.campeonDelSplit) ?? principalDelPool(pool)
      : effect.objetivo === 'nuevo'
        ? pool.find((campeon) => campeon.name === nombreNuevo) ?? principalDelPool(pool)
        : principalDelPool(pool);
    const cantidad = roll(effect.min, effect.max, rng);
    return {
      pool: subirMaestria(pool, objetivo.name, cantidad),
      texto: `${objetivo.name} ${deltaCorto(cantidad)} maestría`
    };
  }

  return olvidarPeor(pool);
}

function aplicarEfecto(state, effect, rng) {
  // La escalera de soloQ no se escribe sumando a un entero: se aplica LP y ella
  // resuelve promoción, descenso y el rango que se muestra.
  if (effect.type === 'ladder') {
    const antes = etiquetaDeRanked(state.player.ranked, servidorDeLaPartida(state));
    const nextState = aplicarLPAlEstado(state, roll(effect.min, effect.max, rng), rng);
    const despues = etiquetaDeRanked(nextState.player.ranked, servidorDeLaPartida(nextState));
    return {
      state: nextState,
      descripcion: antes === despues ? `SoloQ ${despues}` : `SoloQ: ${antes} → ${despues}`
    };
  }

  // El pool no se escribe con un path: aprender, pulir y olvidar tienen reglas
  // propias (cupo, maestría mínima, rendimientos decrecientes) que viven en
  // core/pool.js y las comparten el offseason, los eventos y el draft.
  if (effect.type === 'pool') {
    const resultado = aplicarAlPool(state, effect, rng);
    const flags = effect.accion === 'aprender'
      ? { ...state.flags, ultimoAprendidoPool: resultado.ultimoAprendido ?? [] }
      : state.flags;
    return {
      state: { ...state, player: { ...state.player, championPool: resultado.pool }, flags },
      descripcion: resultado.texto ?? 'el pool queda igual'
    };
  }

  // Un momento narrativo permanente (fase 8D, PLAN.md §8D.2): a diferencia de
  // `push` (que solo amontona strings en `career.hitos` y nadie los lee), esto
  // escribe en `career.registro.momentos` — el slot que la fase 8 dejó listo
  // "para que la fase 13 pueda citarlos" — con fecha y edad, y la ficha
  // (`src/ui/components/ficha.js`) lo muestra. Es la marca que hace que UNA
  // decisión, no todas, le quede pegada al resto de la carrera.
  //
  // `effect.path` no se usa acá adentro (el destino es siempre
  // `career.registro.momentos`, vía `registrarMomento`, que espera el
  // registro completo y no un path suelto) — se declara igual en el JSON
  // porque el chequeo de esquema de `validate.js` lo exige para TODO efecto,
  // antes de mirar el tipo.
  if (effect.type === 'momento') {
    const valor = weightedPick(effect.values, () => 1, rng);
    const momento = { tipo: effect.tipo, anio: state.calendario.anio, edad: state.age, org: state.career.currentOrg, texto: valor };
    return {
      state: { ...state, career: { ...state.career, registro: registrarMomento(state.career.registro, momento) } },
      descripcion: `Momento: "${valor}"`
    };
  }

  if (effect.type === 'push') {
    const lista = getPath(state, effect.path) ?? [];
    const valor = weightedPick(effect.values, () => 1, rng);
    return {
      state: setPath(state, effect.path, [...lista, valor]),
      descripcion: `${etiquetaCampo(effect.path)}: se suma "${valor}"`
    };
  }

  // Fase 5: mueve el resultado de la fecha de temporada que está en curso, no
  // un stat. `min`/`max` son una fracción (p.ej. -0.18 a 0.22) que
  // `systems/temporada.js` lee de `career.temporada.ajustePartido` apenas
  // vuelve de resolver esta opción, y usa para correr `resolverFecha`. Nunca
  // decide el resultado solo (regla 1 de los minijuegos, 4.6): sigue
  // compitiendo contra la fuerza real del rival.
  if (effect.type === 'partido') {
    const valor = effect.min + rng() * (effect.max - effect.min);
    return {
      state: setPath(state, effect.path, valor),
      descripcion: valor >= 0 ? 'esto ayuda al partido' : 'esto complica el partido'
    };
  }

  const antes = getPath(state, effect.path) ?? 0;
  let despues = antes + roll(effect.min, effect.max, rng);
  if (effect.clamp) {
    const [min, max] = effect.clamp;
    despues = Math.min(max, Math.max(min, despues));
  }

  // El estado guarda el float (el clamp puede dejar un decimal arrastrado desde
  // antes); el log muestra el cambio redondeado.
  return {
    state: setPath(state, effect.path, despues),
    descripcion: `${etiquetaCampo(effect.path)} ${deltaCorto(despues - antes)}`
  };
}

// Fase 9Ra: antes esto DECREMENTABA todos los cooldowns en 1 cada vez que se
// resolvía un evento cualquiera (`resolverOpcion` se llama desde `events`,
// `edadCierre` y `temporada`, ~4,5 veces por split), así que un `cooldown: 4`
// —la moda del catálogo— duraba 0,89 splits. Ya no hay nada que decrementar:
// se estampa el split de expiración y `cooldownActivo` compara contra
// `splitCount`. Con eventoElegido null (split sin evento) no hace nada.
function registrarEventoVisto(state, eventoElegido) {
  if (!eventoElegido) {
    return state;
  }

  const cooldownHasta = { ...(state.flags.cooldownHasta ?? {}) };
  const duracion = Math.max(BALANCE.eventos.cooldownMinimoSplits, eventoElegido.cooldown ?? 0);
  cooldownHasta[eventoElegido.id] = state.player.splitCount + duracion;

  // Fase 7: cuenta cuántas veces salió cada evento, para que la próxima
  // selección le corra el peso en contra (ver `pesoConMemoria`).
  const eventosVistos = state.flags.eventosVistos ?? {};
  const vistosActualizados = { ...eventosVistos, [eventoElegido.id]: (eventosVistos[eventoElegido.id] ?? 0) + 1 };

  return { ...state, flags: { ...state.flags, cooldownHasta, eventosVistos: vistosActualizados } };
}

// Fase 7: memoria anti-repetición. Antes lo único que evitaba el repetido era
// el cooldown fijo de cada evento, y con ~17 candidatos en fase profesional
// el pool se reciclaba en round-robin — el evento más repetido salía 10 veces
// por carrera (mediana). Cada vista corre el peso en contra
// (1 + vistas × fatigaPorVista al denominador); la primera vez suma un bonus
// de novedad. No reemplaza al cooldown (que sigue sacando el evento del todo
// un tiempo): esto además hace que, aun disponible, un evento visto compita
// peor contra uno que nunca salió.
export function pesoConMemoria(state, evento) {
  const e = BALANCE.eventos;
  const vistas = state.flags.eventosVistos?.[evento.id] ?? 0;
  const fatiga = 1 / (1 + vistas * e.fatigaPorVista);
  const bonus = vistas === 0 ? e.bonusNovedad : 1;
  return evento.weight * fatiga * bonus;
}

// Una bisagra siempre pasa; una normal compite por el turno (fase 2, densidad
// emergente). Si hay al menos un candidato bisagra este split, el resto del
// pool ambiente ni siquiera entra al sorteo: "salió tu campeón nuevo" no puede
// perder contra "racha de ranked" por una tirada de peso.
function conPrioridadDeBisagra(eventos) {
  const bisagras = eventos.filter((event) => event.bisagra);
  return bisagras.length > 0 ? bisagras : eventos;
}

export function elegirEvento(state, rng, { excluirId } = {}) {
  const disponibles = conPrioridadDeBisagra(candidatos(state).filter((event) => event.id !== excluirId));
  if (disponibles.length === 0) {
    return null;
  }
  return weightedPick(disponibles, (event) => pesoConMemoria(state, event), rng);
}

export function elegirEventoCierre(state, rng) {
  const contexto = calcularContexto(state);
  const disponibles = TODOS_LOS_EVENTOS.filter(
    (event) => event.cierreDeEdad
      && !cooldownActivo(state, event.id)
      && disponibleEn(state, event, contexto)
      && opcionesVivas(state, event, contexto).length >= 2
  );
  if (disponibles.length === 0) {
    return null;
  }
  return weightedPick(disponibles, (event) => pesoConMemoria(state, event), rng);
}

// La promesa de CONCEPTO §8: "la opción obviamente correcta sale mal a veces.
// Tus stats corren esos pesos, no los eliminan." Un outcome sin `modificadores`
// mantiene su peso de siempre; uno con `modificadores` lo corre según qué tan
// lejos estás del valor de referencia declarado. El piso evita que un stat muy
// malo lleve un outcome a probabilidad cero — CORRE los pesos, no los borra.
//
// Exportada desde la fase 12d: `core/previa.js` la necesita para que la
// consecuencia previa y el riesgo respeten los mismos pesos que de verdad
// va a usar `elegirOutcome`, no el peso crudo de catálogo.
export function pesoEfectivo(state, outcome) {
  if (!outcome.modificadores) {
    return outcome.weight;
  }

  const ajuste = outcome.modificadores.reduce((suma, mod) => {
    const valor = getPath(state, mod.field) ?? mod.referencia;
    return suma + (valor - mod.referencia) * mod.factor;
  }, 0);

  return Math.max(outcome.weight * BALANCE.eventos.pisoPesoEfectivo, outcome.weight * (1 + ajuste));
}

// Separado de `resolverOpcion` para que sea testeable sin aplicar efectos: el
// check de balance necesita saber QUÉ outcome salió con un stat en el
// percentil 10 contra el percentil 90, sin tocar el resto del estado.
export function elegirOutcome(state, opcion, rng) {
  return weightedPick(opcion.outcomes, (outcome) => pesoEfectivo(state, outcome), rng);
}

// Elegir tiene que devolver una historia, no un diff.
//
// Antes esto loguaba `"Meme de la prensa — Subirse a la ola: Hype +8, Mentalidad -1."`
// y el jugador nunca se enteraba de QUE paso: solo veia moverse dos barras. El
// `texto` del outcome es la mitad narrativa de la decision, igual que el `texto`
// de una rutina. Los efectos quedan como pie, entre parentesis.
//
// El titulo y la etiqueta se resuelven contra el estado PREVIO (es lo que decia
// la tarjeta que el jugador acaba de leer) y el texto del resultado contra el
// estado POSTERIOR (es lo que quedo despues de aplicar los efectos).
export function resolverOpcion(state, evento, opcionId, rng) {
  const vivas = opcionesVivas(state, evento);
  const opcion = vivas.find((option) => option.id === opcionId) ?? vivas[0] ?? evento.options[0];
  const outcome = elegirOutcome(state, opcion, rng);

  const titulo = `${resolverTexto(evento.title, state)} · ${resolverTexto(opcion.label, state)}`;

  const descripciones = [];
  const nextState = outcome.effects.reduce((acc, effect) => {
    const { state: siguiente, descripcion } = aplicarEfecto(acc, effect, rng);
    descripciones.push(descripcion);
    return siguiente;
  }, state);

  const cuerpo = resolverTexto(outcome.texto, nextState);
  const efectos = lista(descripciones);

  return {
    state: registrarEventoVisto(nextState, evento),
    logs: [crearLog('event', `${titulo} — ${cuerpo} (${efectos})`, { titulo, cuerpo, efectos })]
  };
}

// Toda decision, venga de un evento o de un sistema, se presenta igual: titulo,
// descripcion y una lista de opciones. La UI tiene un solo camino de render.
// `franja` distingue la decision normal del split de la del cierre de edad; no
// tiene nada que ver con el contexto de carrera.
export function decisionDesdeEvento(state, evento, { franja, slot }) {
  const titulo = resolverTexto(evento.title, state);
  const contexto = calcularContexto(state);

  return {
    tipo: 'opciones',
    titulo: franja === 'cierre' ? `${titulo} (fin de temporada)` : titulo,
    descripcion: resolverTexto(evento.description, state),
    // `descripcion` es la mitad de la decision: sin ella, elegir "Subirse a la
    // ola" no dice que estas arriesgando. Las rutinas ya la mandaban y la UI ya
    // sabe pintarla; los eventos la descartaban en este map.
    opciones: opcionesVivas(state, evento, contexto).map((option) => {
      // Fase 12d (PLAN.md §12.3): los pesos EFECTIVOS de esta opción, en ESTE
      // estado — la previa y el riesgo tienen que respetar `modificadores`,
      // no el peso crudo de catálogo (CONCEPTO §8).
      const pesos = option.outcomes.map((outcome) => pesoEfectivo(state, outcome));
      return {
        id: option.id,
        label: resolverTexto(option.label, state),
        descripcion: resolverTexto(option.descripcion, state),
        previa: previaDeOpcion(option, pesos),
        riesgo: riesgoDeOpcion(option, pesos),
        ...(BALANCE.rareza.eventosDeMejora.includes(evento.id)
          ? { rareza: rarezaDeOpcionEvento(option, pesos) }
          : {})
      };
    }),
    // Las que no pasaron `disponibleEn` se muestran cerradas con su motivo,
    // no se resucitan: no entran a `opcionesVivas`, no las ve
    // `elegirOpcionAutomatica`, cero consumo de `rng` (trampa T1) — es lo que
    // hace barata esta subfase entera.
    opcionesBloqueadas: evento.options
      .filter((option) => !disponibleEn(state, option, contexto))
      .map((option) => ({ label: resolverTexto(option.label, state), gate: gateDeOpcion(option) })),
    // Fase 12c (PLAN.md §12.2): el peso visual, calculado acá una sola vez en
    // vez de que la UI lo adivine. `ambiente` es la rutina sin bisagra — antes
    // de que `categoria` existiera (fase 12b) no había de dónde sacarlo sin
    // inventar un campo (T4 lo dejó afuera a propósito por eso mismo).
    peso: evento.bisagra ? 'bisagra' : (evento.categoria === 'rutina' ? 'ambiente' : 'normal'),
    franja,
    slot,
    datos: { evento }
  };
}

// Elige una opcion sola cuando no hay nadie mirando (simulacion masiva).
// Respeta los pesos declarados, asi el camino headless mide lo mismo que juega
// una persona con criterio promedio.
export function elegirOpcionAutomatica(state, decision, rng) {
  const opcion = weightedPick(opcionesVivas(state, decision.datos.evento), (option) => option.weight, rng);
  return { opcionId: opcion.id };
}

export function aplicar(state, rng) {
  // Fase 9Rf: en fase profesional el evento de ambiente compite por el
  // presupuesto de interrupción del split. Si ya se gastó (una fecha marcada,
  // el mercado, un cierre de edad), el split no frena además por color.
  // Early return SIN tocar rng (regla de proceso 10): el split ya tiene sus
  // líneas de los otros sistemas, así que no queda mudo.
  if (state.phase === 'profesional' && !hayPresupuesto(state)) {
    return { state, logs: [] };
  }

  const evento = elegirEvento(state, rng);

  if (!evento) {
    return {
      state,
      logs: [crearLog('event', SPLIT_SIN_EVENTO_MSG)]
    };
  }

  return {
    state,
    logs: [],
    decision: decisionDesdeEvento(state, evento, { franja: 'normal', slot: 1 })
  };
}

export function resolver(state, decision, respuesta, rng) {
  const { evento } = decision.datos;
  const { state: nextState, logs } = resolverOpcion(state, evento, respuesta.opcionId, rng);

  if (nextState.terminado) {
    return { state: nextState, logs };
  }

  // A veces la vida se amontona: un segundo evento antes de que cierre el
  // split. Cuánto de seguido depende de cuánto cambió ya este split (fase 2):
  // un split denso casi siempre amontona, uno comprimido casi nunca. El cupo
  // de la fase 9Rf gatea el PRIMER evento (arriba, en `aplicar`); si ese
  // pasó, este segundo lo sigue gobernando `probSegundaDecisionPorTipo` como
  // en la fase 2 — el presupuesto no lo pisa.
  const probabilidad = BALANCE.edad.probSegundaDecisionPorTipo[tipoDeSplit(nextState)];
  if (decision.slot === 1 && chance(probabilidad, rng)) {
    const segundoEvento = elegirEvento(nextState, rng, { excluirId: evento.id });
    if (segundoEvento) {
      return {
        state: nextState,
        logs,
        decision: decisionDesdeEvento(nextState, segundoEvento, { franja: 'normal', slot: 2 })
      };
    }
  }

  return { state: nextState, logs };
}

export function resolverAuto(state, decision, rng) {
  return elegirOpcionAutomatica(state, decision, rng);
}
