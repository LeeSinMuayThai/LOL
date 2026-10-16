import { roll, weightedPick, chance, gauss } from '../core/rng.js';
import { clamp } from '../core/numeros.js';
import { getPath, setPath, cumpleCondiciones, etiquetaCampo } from '../core/selectors.js';
import { calcularContexto, coincideContexto } from '../core/contexto.js';
import { resolverTexto } from '../core/plantillas.js';
import { aplicarLPAlEstado, etiquetaDeRanked, servidorDeLaPartida } from '../core/ranked.js';
import { aprenderCampeones, subirMaestria, olvidarPeor, principalDelPool } from '../core/pool.js';
import { registrarMomento } from '../core/registro.js';
import { conPermanencia, conTechoDeLesion } from '../core/curvas.js';
import { crearLog, adjuntar } from '../core/log.js';
import { deltaCorto, lista } from '../core/formato.js';
import { tipoDeSplit } from '../core/presupuesto.js';
import { frenaEnLaCola, conFirmaDeLaCola } from '../core/cola.js';
import { previaDeOpcion, riesgoDeOpcion, gateDeOpcion, textoDeRiesgo, payoffNormalizado } from '../core/previa.js';
import { rarezaDeOpcionEvento } from '../core/rareza.js';
import { opcionDelPerfil, afinidadDeOpcion, derivarPerfil, nombreDePerfil } from '../core/perfil.js';
import { elegirMinijuego, minijuegoPorId, textoDeMinijuego, registrarMinijuegoVisto, veredictoDeMinijuego } from '../core/minijuegos.js';
import { ajusteBaseDeMinijuego } from '../core/serie.js';
import { aplicarStatsDeMinijuego } from './serie.js';
import { BALANCE } from '../data/balance.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';
import { ofertaDeImportPosible, prometerImport, conImportDeTier1Presentado } from './mercado.js';
import { cambiarDeRol } from './roster.js';
import { retirarsePorCamino } from './retiro.js';
import { datosDePrensa } from '../core/prensa.js';

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

// H1a (PLANUI §0.10, H1.2): la rareza del evento (`rarezaEvento` en el dato; si falta, común). No es la `rareza` de una opción.
export function rarezaDeEvento(evento) {
  return evento.rarezaEvento ?? 'comun';
}

export function esRaraOMas(evento) {
  return rarezaDeEvento(evento) !== 'comun';
}

// H1a (H1.3): cuánto dura el cooldown que estampa `registrarEventoVisto`: el del evento (con el piso de siempre) y, si es una
// común del split, al menos un año (`edad.splitsPorEdad`). La carta del cierre conserva el suyo.
function cooldownPropio(evento) {
  return Math.max(BALANCE.eventos.cooldownMinimoSplits, evento.cooldown ?? 0);
}

function duracionDeCooldown(evento) {
  const propio = cooldownPropio(evento);
  return evento.cierreDeEdad || esRaraOMas(evento) ? propio : Math.max(propio, BALANCE.edad.splitsPorEdad);
}

// H1a: con el pozo vacío se relaja "común una vez por año" (antes de devolver null): solo cuenta el cooldown propio del evento.
function cooldownRelajadoActivo(state, evento) {
  const hasta = state.flags.cooldownHasta?.[evento.id];
  if (hasta === undefined) {
    return false;
  }
  return hasta - (duracionDeCooldown(evento) - cooldownPropio(evento)) > state.player.splitCount;
}

// H1a: rara para arriba sale una vez por carrera (`flags.eventosVistos`).
function yaSalioUnaRara(state, evento) {
  return esRaraOMas(evento) && (state.flags.eventosVistos?.[evento.id] ?? 0) > 0;
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
  return evento.options.filter((opcion) => disponibleEn(state, opcion, contexto) && motivoDePromesaRota(state, opcion) === null);
}

// K4-C2 (regla 15): una opción que promete una mudanza (`ofertaDeImport`) solo existe si alguna org de esa liga
// puede ficharte HOY con las reglas duras del mercado (edad, cupo de imports, listón de import). Si no, se muestra
// cerrada con el motivo del mercado. Puro y sin `rng`: lo decide `systems/mercado.js`, no una copia de sus reglas.
export function motivoDePromesaRota(state, opcion) {
  for (const outcome of opcion.outcomes) {
    for (const effect of outcome.effects) {
      if (effect.type === 'ofertaDeImport') {
        const posible = ofertaDeImportPosible(state, effect.liga);
        if (!posible.posible) {
          return posible.motivo;
        }
      }
    }
  }
  return null;
}

// Exportada desde J0 (AUDITORIA.md, fase J-higiene): `simulate.js` la llama
// tal cual, en vivo, para medir cuántos candidatos quedan afuera del sorteo
// cuando `conPrioridadDeBisagra` corta el pool a solo bisagras — sin
// reimplementar el filtro gordo acá y arriesgar que las dos copias diverjan
// (la misma lección que `disponibleEn`/`opcionesVivas` ya dejan escrita).
export function candidatos(state, { relajarComunes = false } = {}) {
  const contexto = calcularContexto(state);
  return TODOS_LOS_EVENTOS.filter(
    (event) => !event.cierreDeEdad
      && !yaSalioUnaRara(state, event)
      && !(relajarComunes ? cooldownRelajadoActivo(state, event) : cooldownActivo(state, event.id))
      && disponibleEn(state, event, contexto)
      && opcionesVivas(state, event, contexto).length >= 2
      && textoSinHuecos(state, event)
  );
}

// K4-C: un evento cuyo texto nombra a alguien que este estado no tiene (`{adc}` cuando el ADC sos vos, `{jungla}`
// sin jungla en el plantel) no sale: antes se mostraba con el token crudo en la tarjeta, y ahora que la mayoría se
// cuenta en una línea de crónica, también en el feed. Puro: `resolverTexto` no toca el `rng`.
const HUECO_DE_PLANTILLA = /\{[a-zA-Z]+\}/;
function textoSinHuecos(state, evento) {
  return ![evento.title, evento.description, ...evento.options.map((option) => option.label)]
    .some((texto) => HUECO_DE_PLANTILLA.test(resolverTexto(texto, state)));
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

  // J4 (d): `objetivo: 'principal'` suelta a tu main (el de más maestría) — la salida de `pool_main_muerto` que
  // deja el pool sin el campeón caído. Respeta el mismo piso de pool que `olvidarPeor`.
  if (effect.objetivo === 'principal') {
    if (pool.length <= BALANCE.campeones.poolMinimo) {
      return { pool, texto: null };
    }
    const principal = principalDelPool(pool);
    return {
      pool: pool.filter((campeon) => campeon.name !== principal.name),
      texto: `${principal.name} sale del pool`,
      campeon: principal.name
    };
  }

  return olvidarPeor(pool);
}

function aplicarEfecto(state, effect, rng, origen) {
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

  // K4-C2: un camino que se abre o se cierra. Escribe un valor en un flag (`flags.caminos.<bifurcación>`, o uno del motor
  // que el dato pida a propósito, como `flags.banquilloPendiente`) para que los eventos de seguimiento lo lean con una
  // `condition` común. No es una magnitud: no tiene rango ni entra en la previa, y no suma a la línea de efectos.
  if (effect.type === 'camino') {
    return { state: setPath(state, effect.path, effect.valor), descripcion: null };
  }

  // K4-C2 (regla 15): los efectos de carrera. El dato los declara; la lógica es de su sistema dueño, no se copia acá.
  // `ofertaDeImport` deja una oferta real pendiente que el mercado firma en la próxima pretemporada (con sus reglas);
  // `cambiarRol` te cambia de línea (pool, plantel); `retirarse` te retira por el camino del retiro, con su motivo.
  if (effect.type === 'ofertaDeImport') {
    return prometerImport(state, effect);
  }
  if (effect.type === 'cambiarRol') {
    return cambiarDeRol(state, effect.rol, rng);
  }
  if (effect.type === 'retirarse') {
    return retirarsePorCamino(state, effect.motivo);
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
  // vuelve de resolver esta opción, y usa para correr la fuerza de la fecha (K2b: `fuerzaDeFecha`). Nunca
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
  //
  // K3-B: el único lugar donde un efecto de evento o decisión mueve un stat. Si es un stat de curva, una
  // fracción de lo que movió se vuelve permanente (`conPermanencia`: bonus + marca en el registro). Con la
  // fracción en 0 devuelve el mismo estado.
  const stat = effect.path.startsWith('player.stats.') ? effect.path.slice('player.stats.'.length) : null;
  // K4 (revisión 2): el techo de lesión vale también acá — el evento del cierre del año corre después de `atributos.js`.
  if (stat !== null) {
    despues = conTechoDeLesion(state.player, stat, antes, despues);
  }
  const movido = setPath(state, effect.path, despues);
  return {
    state: stat === null ? movido : conPermanencia(movido, stat, despues - antes, origen),
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
  cooldownHasta[eventoElegido.id] = state.player.splitCount + duracionDeCooldown(eventoElegido);

  // Fase 7: cuenta cuántas veces salió cada evento, para que la próxima
  // selección le corra el peso en contra (ver `pesoConMemoria`).
  const eventosVistos = state.flags.eventosVistos ?? {};
  const vistosActualizados = { ...eventosVistos, [eventoElegido.id]: (eventosVistos[eventoElegido.id] ?? 0) + 1 };

  // J4 (b): la categoría entra en la ventana de las recientes (mismo patrón que `flags.minijuegosRecientes`).
  const categoriasRecientes = [...(state.flags.categoriasRecientes ?? []), eventoElegido.categoria]
    .slice(-BALANCE.eventos.categoriasRecientesMax);

  return { ...state, flags: { ...state.flags, cooldownHasta, eventosVistos: vistosActualizados, categoriasRecientes } };
}

// Fase 7: memoria anti-repetición. Antes lo único que evitaba el repetido era
// el cooldown fijo de cada evento, y con ~17 candidatos en fase profesional
// el pool se reciclaba en round-robin — el evento más repetido salía 10 veces
// por carrera (mediana). Cada vista corre el peso en contra
// (1 + vistas × fatigaPorVista al denominador); la primera vez suma un bonus
// de novedad. No reemplaza al cooldown (que sigue sacando el evento del todo
// un tiempo): esto además hace que, aun disponible, un evento visto compita
// peor contra uno que nunca salió.
// H1a: `fatigaPorVista` la elige quien sortea (el sorteo del split usa `eventos.fatigaSplit`).
export function pesoConMemoria(state, evento, fatigaPorVista = BALANCE.eventos.fatigaPorVista) {
  const e = BALANCE.eventos;
  const vistas = state.flags.eventosVistos?.[evento.id] ?? 0;
  const fatiga = 1 / (1 + vistas * fatigaPorVista);
  const bonus = vistas === 0 ? e.bonusNovedad : 1;
  // J4 (a): la bisagra ya no filtra el pool (antes, con una bisagra candidata el resto ni entraba al sorteo):
  // multiplica su peso. Sigue ganando casi siempre, pero con tirada. (b): la categoría que salió hace poco pesa menos.
  const bisagra = evento.bisagra ? e.factorBisagra : 1;
  const reciente = (state.flags.categoriasRecientes ?? []).includes(evento.categoria) ? e.factorCategoriaReciente : 1;
  return evento.weight * fatiga * bonus * bisagra * reciente;
}

export function elegirEvento(state, rng, { excluirId, filtro = () => true } = {}) {
  const disponibles = candidatos(state).filter((event) => event.id !== excluirId && filtro(event));
  if (disponibles.length === 0) {
    return null;
  }
  return weightedPick(disponibles, (event) => pesoConMemoria(state, event), rng);
}

// G-int: continuación es pedir que la bandera YA tenga un valor (`eq` con algo que no es null ni false). Una guarda de "todavía
// no" (`eq null`, `neq "cubrio"`) es la de un evento que ABRE un camino, no la de uno que lo sigue.
const esContinuacion = (condicion) => String(condicion.field ?? '').startsWith('flags.')
  && condicion.op === 'eq' && condicion.value !== null && condicion.value !== false;

// H1a (PLANUI §0.10, H1.1-H1.5): el pozo del sorteo del split. Si queda vacío, se relaja "común una vez por año" antes de rendirse.
export function pozoDelSplit(state, { excluirId } = {}) {
  const pozo = candidatos(state).filter((event) => event.id !== excluirId);
  if (pozo.length > 0) {
    return pozo;
  }
  return candidatos(state, { relajarComunes: true }).filter((event) => event.id !== excluirId);
}

// H1a: el peso del sorteo. Cada rareza se lleva `probRareza[r]` del total, repartido entre sus elegibles según su `weight`, y
// adentro corre la memoria de siempre con la fatiga del split. Una rareza sin elegibles no suma: weightedPick renormaliza.
function pesoDelSorteo(state, elegibles) {
  const sumaPorRareza = {};
  for (const evento of elegibles) {
    const rareza = rarezaDeEvento(evento);
    sumaPorRareza[rareza] = (sumaPorRareza[rareza] ?? 0) + evento.weight;
  }
  return (evento) => {
    const rareza = rarezaDeEvento(evento);
    const suma = sumaPorRareza[rareza];
    return suma > 0
      ? (BALANCE.eventos.probRareza[rareza] / suma) * pesoConMemoria(state, evento, BALANCE.eventos.fatigaSplit)
      : 0;
  };
}

// H1a: un solo sorteo con rareza (una sola tirada, T1). Se fue el escalón sin tirada de G2a (`escalonDeEvento`), que dejaba una
// mediana de 2 candidatos. Quedan dos prioridades duras: el golpe `obligatorio` (cuenta un cambio de estado que ya pasó) y la
// continuación de una cadena (lee una bandera que dejó otro). Con `pisoRara` sorteos seguidos sin rara+, el sorteo es rara+ si hay.
export function elegiblesDelSplit(state, pozo) {
  const obligatorios = pozo.filter((event) => event.obligatorio);
  if (obligatorios.length > 0) {
    return obligatorios;
  }
  const continuaciones = pozo.filter((event) => event.conditions.some(esContinuacion));
  if (continuaciones.length > 0) {
    return continuaciones;
  }
  if ((state.flags.sorteosSinRara ?? 0) >= BALANCE.eventos.pisoRara) {
    const raras = pozo.filter(esRaraOMas);
    if (raras.length > 0) {
      return raras;
    }
  }
  return pozo;
}

export function elegirEventoDelSplit(state, rng, { excluirId } = {}) {
  const pozo = pozoDelSplit(state, { excluirId });
  if (pozo.length === 0) {
    return null;
  }
  const elegibles = elegiblesDelSplit(state, pozo);
  return weightedPick(elegibles, pesoDelSorteo(state, elegibles), rng);
}

// H1a: el piso (`flags.sorteosSinRara`) suma uno por cada sorteo sin rara+ y vuelve a 0 con una.
function conSorteo(state, evento) {
  const sorteosSinRara = esRaraOMas(evento) ? 0 : (state.flags.sorteosSinRara ?? 0) + 1;
  return { ...state, flags: { ...state.flags, sorteosSinRara } };
}

// G2a, H1a: ¿le queda al split su parada de evento? El tope (`BALANCE.eventos.paradasPorSplit`) vale en el amateur y en el pro. En
// el pro, además (H1a, PLANUI §0.10 H1.5, que reemplaza el cupo de interrupciones de 9Rf): el split del cierre de año no tiene
// evento (ya tiene la carta y las finales), y en la cola el evento frena con su propio tope por año (`core/cola.js`). Puro.
export function quedaParadaDeEvento(state) {
  const usadas = state.presupuesto?.eventos ?? 0;
  if (usadas >= BALANCE.eventos.paradasPorSplit) {
    return false;
  }
  if (state.phase !== 'profesional') {
    return true;
  }
  return frenaEnLaCola(state, 'evento', null).frena;
}

// G2a: el evento que frena gasta la parada del split (`presupuesto.eventos`, que `systems/presupuesto.js` vuelve a cero). H1a: y,
// en la cola, la del año (`conFirmaDeLaCola`, que fuera de la cola no toca nada).
export function conParadaDeEvento(state) {
  const p = state.presupuesto ?? { gastadas: 0, eventos: 0 };
  return conFirmaDeLaCola({ ...state, presupuesto: { ...p, eventos: (p.eventos ?? 0) + 1 } }, 'evento');
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
// K4-C: con `cronica` (el id del perfil que decidió) el evento se cuenta en UNA línea de crónica: el texto del
// evento, la opción que tomó tu perfil y lo que pasó. El texto no se pierde: pasa a ser la historia.
// D118: `outcome` fuerza el outcome (el Bo1 que frena: lo decide el minijuego, no la tirada).
export function resolverOpcion(state, evento, opcionId, rng, { cronica = null, outcome: outcomeForzado = null } = {}) {
  const vivas = opcionesVivas(state, evento);
  const opcion = vivas.find((option) => option.id === opcionId) ?? vivas[0] ?? evento.options[0];
  const outcome = outcomeForzado ?? elegirOutcome(state, opcion, rng);

  const nombre = resolverTexto(evento.title, state);
  const titulo = `${nombre} · ${resolverTexto(opcion.label, state)}`;

  const descripciones = [];
  // K4-C2: un efecto de carrera puede traer su propia línea (el retiro dice su balance, como cualquier retiro).
  const logsDeEfectos = [];
  const nextState = outcome.effects.reduce((acc, effect) => {
    // K3-B: `nombre` (el título visible del evento, nunca su id) es el `origen` de lo que quede permanente.
    const { state: siguiente, descripcion, logs: extra = [] } = aplicarEfecto(acc, effect, rng, nombre);
    descripciones.push(descripcion);
    // K4c-F: los renglones de efecto van adentro del beat del evento (un beat, no N); siguen en `state.logs`.
    logsDeEfectos.push(...extra.map(adjuntar));
    return siguiente;
  }, state);

  const cuerpo = resolverTexto(outcome.texto, nextState);
  const efectos = lista(descripciones);

  if (cronica) {
    const opcionTexto = resolverTexto(opcion.label, state);
    // Si la descripción pide a alguien que este estado no tiene (un `{jungla}` sin jungla en el plantel), la crónica
    // la saltea en vez de mostrar el token crudo: el título y lo que pasó alcanzan para contarlo.
    const descripcionResuelta = resolverTexto(evento.description, state);
    const descripcion = /\{[a-zA-Z]+\}/.test(descripcionResuelta) ? '' : descripcionResuelta;
    const perfilNombre = nombreDePerfil(cronica);
    return {
      state: registrarEventoVisto(nextState, evento),
      // G2a: `porPerfil` y `opcionesVivas` son el contador de la promesa ("ningún evento con 2 opciones o más se resuelve por
      // el perfil adentro del motor"): toda resolución por el perfil pasa por acá.
      logs: [crearLog('event', `${nombre}: ${descripcion ? `${descripcion} ` : ''}Como ${perfilNombre.toLowerCase()}: ${opcionTexto}. ${cuerpo} (${efectos})`, {
        cronica: true, titulo: nombre, descripcion, opcion: opcionTexto, perfil: perfilNombre, cuerpo, efectos,
        porPerfil: true, opcionesVivas: vivas.length
      }), ...logsDeEfectos]
    };
  }

  return {
    state: registrarEventoVisto(nextState, evento),
    logs: [crearLog('event', `${titulo} — ${cuerpo} (${efectos})`, { titulo, cuerpo, efectos }), ...logsDeEfectos]
  };
}

// K4-C: la previa y el riesgo de cada opción viva, con los pesos EFECTIVOS de este estado — lo mismo que la
// tarjeta le mostraría a una persona (`decisionDesdeEvento`). De acá sale el encaje con el perfil.
export function opcionesConPrevia(state, evento, contexto = calcularContexto(state)) {
  return opcionesVivas(state, evento, contexto).map((option) => {
    const pesos = option.outcomes.map((outcome) => pesoEfectivo(state, outcome));
    return {
      id: option.id,
      perfil: option.perfil ?? null,
      previa: previaDeOpcion(option, pesos),
      riesgo: riesgoDeOpcion(option, pesos)
    };
  });
}

// K4-C: la opción que elegiría tu perfil (`core/perfil.js`). G2a: ya no decide adentro del motor; es la sugerencia "TU
// PERFIL" de la tarjeta y la elección del bot en Node (`resolverAuto`).
export function opcionDelPerfilPara(state, evento) {
  return opcionDelPerfil(state.player.perfil, opcionesConPrevia(state, evento)).id;
}

// G2a (la carta de El Ídolo, regla de F4): el número seguro de una opción. El efecto principal es el de la fila de previa
// más pesada (cada familia en su escala, `payoffNormalizado`); su piso es lo mínimo que puede dar entre todos los
// outcomes (el que no lo trae, 0). `{ campo, etiqueta, valor, unidad }`, o `null` si la opción no mueve ningún número.
const FAMILIAS_CON_NUMERO = new Set(['stat', 'ladder']);
//
// G-fix-copa: con el `state`, el número no promete más de lo que deja el clamp del efecto: min(efecto, tope − actual)
// (y, en un efecto negativo, max(efecto, piso − actual)). Con los estudios en 98, "+8" se muestra como lo que rinde.
export function seguroDeOpcion(opcion, pesos, state = null) {
  const pesoTotal = pesos.reduce((suma, peso) => suma + peso, 0);
  if (pesoTotal <= 0) {
    return null;
  }
  const medias = new Map();
  opcion.outcomes.forEach((outcome, indice) => {
    for (const effect of outcome.effects) {
      if (!FAMILIAS_CON_NUMERO.has(effect.type)) continue;
      const alta = BALANCE.eventos.magnitudBandas[effect.type]?.p66 || 1;
      medias.set(effect.path, (medias.get(effect.path) ?? 0) + ((effect.min + effect.max) / 2 / alta) * pesos[indice]);
    }
  });
  if (medias.size === 0) {
    return null;
  }
  const [campo] = [...medias.entries()].reduce((mejor, entrada) => (Math.abs(entrada[1]) > Math.abs(mejor[1]) ? entrada : mejor));
  const piso = Math.min(...opcion.outcomes.map((outcome) => {
    const efectos = outcome.effects.filter((effect) => effect.path === campo && FAMILIAS_CON_NUMERO.has(effect.type));
    const suma = efectos.reduce((total, effect) => total + Math.min(effect.min, effect.max), 0);
    const tope = efectos.find((effect) => effect.clamp)?.clamp;
    const actual = state && tope ? getPath(state, campo) : null;
    return typeof actual === 'number' ? Math.min(tope[1] - actual, Math.max(tope[0] - actual, suma)) : suma;
  }));
  const ladder = opcion.outcomes.some((outcome) => outcome.effects.some((effect) => effect.path === campo && effect.type === 'ladder'));
  return { campo, etiqueta: etiquetaCampo(campo), valor: piso, unidad: ladder ? 'LP' : '' };
}

// G2a: el riesgo en palabras (⚠). El `aviso` del dato si la opción lo trae; si no, el peor resultado de su distribución
// (el de menor `payoffNormalizado`) cuando de verdad te saca algo, con su chance. `{ texto, pct }` o `null`.
export function avisoDeOpcion(state, opcion, pesos) {
  if (opcion.aviso) {
    return { texto: resolverTexto(opcion.aviso, state), pct: null };
  }
  const pesoTotal = pesos.reduce((suma, peso) => suma + peso, 0);
  if (pesoTotal <= 0 || opcion.outcomes.length < 2) {
    return null;
  }
  const indice = opcion.outcomes.reduce((peor, outcome, i) => (payoffNormalizado(outcome) < payoffNormalizado(opcion.outcomes[peor]) ? i : peor), 0);
  const peor = opcion.outcomes[indice];
  const pierde = peor.effects.some((effect) => FAMILIAS_CON_NUMERO.has(effect.type) && Math.max(effect.min, effect.max) < 0);
  if (!pierde || pesos[indice] <= 0) {
    return null;
  }
  const texto = resolverTexto(peor.texto, state);
  const primera = texto.match(/^.*?[.!?…](?=\s|$)/)?.[0] ?? texto;
  return { texto: primera, pct: Math.round((pesos[indice] / pesoTotal) * 100) };
}

// Toda decision, venga de un evento o de un sistema, se presenta igual: titulo,
// descripcion y una lista de opciones. La UI tiene un solo camino de render.
// `franja` distingue la decision normal del split de la del cierre de edad; no
// tiene nada que ver con el contexto de carrera.
export function decisionDesdeEvento(state, evento, { franja, slot }) {
  const titulo = resolverTexto(evento.title, state);
  const contexto = calcularContexto(state);
  // G2a: la opción que elegiría tu perfil, para el chip "TU PERFIL" (puro, sin `rng`). Solo si hay algo que elegir.
  const idDelPerfil = state.player?.perfil && opcionesVivas(state, evento, contexto).length >= 2 ? opcionDelPerfilPara(state, evento) : null;

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
        // K6a-A: lo que la píldora muestra (la clave `riesgo` sigue igual para el perfil y el estilo).
        riesgoTexto: textoDeRiesgo(option, riesgoDeOpcion(option, pesos)),
        // G2a: el número seguro, el riesgo en palabras y la sugerencia de tu perfil (nunca una decisión).
        seguro: seguroDeOpcion(option, pesos, state),
        aviso: avisoDeOpcion(state, option, pesos),
        ...(option.id === idDelPerfil ? { propuesta: `Es lo que elegiría tu perfil (${nombreDePerfil(state.player.perfil.actual)}). Decidís vos.` } : {}),
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
      .filter((option) => !disponibleEn(state, option, contexto) || motivoDePromesaRota(state, option) !== null)
      .map((option) => ({ label: resolverTexto(option.label, state), gate: motivoDePromesaRota(state, option) ?? gateDeOpcion(option) })),
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
  // G2a, H1a: el split que ya gastó su parada de evento (o, en el pro, el split del cierre de año o la cola sin lugar) no sortea
  // evento: lo que no entra no pasa. Early return SIN tocar rng (regla de proceso
  // 10): el split ya tiene sus líneas de los otros sistemas, así que no queda mudo.
  if (!quedaParadaDeEvento(state)) {
    return { state, logs: [] };
  }

  const evento = elegirEventoDelSplit(state, rng);

  if (!evento) {
    return {
      state,
      logs: [crearLog('event', SPLIT_SIN_EVENTO_MSG)]
    };
  }

  return presentarOResolver(conSorteo(state, evento), evento, 1, rng);
}

// G2a (PLANUI §0.9, "el perfil no decide nada"): todo evento con dos opciones vivas o más frena —tenga o no `bifurcacion`
// en el dato— y gasta la parada de evento del split. El de una sola opción no frena: se aplica tal cual (no hay nada que
// elegir) y se cuenta como cualquier evento. El perfil ya no elige adentro del motor: queda como sugerencia en la tarjeta.
export function presentarOResolver(state, evento, slot, rng) {
  const vivas = opcionesVivas(state, evento);
  if (vivas.length >= 2) {
    return {
      // K5c (revisión): un import de tier 1 que se te presenta vuelve a cero la presión de tier 2, lo aceptes o no.
      state: conParadaDeEvento(conImportDeTier1Presentado(state, evento)),
      logs: [],
      decision: decisionDesdeEvento(state, evento, { franja: 'normal', slot })
    };
  }
  const { state: nextState, logs } = resolverOpcion(state, evento, vivas[0]?.id ?? evento.options[0].id, rng);
  return encadenar(nextState, logs, evento, slot, rng);
}

// La rueda de prensa después de un escándalo (K4-C: la prensa sale solo tras una final o un escándalo). `null` si
// el catálogo no tiene minijuego para ese momento.
function pausaDePrensa(state, logs) {
  const entrada = elegirMinijuego(state, 'post_escandalo');
  if (!entrada) {
    return null;
  }
  const textos = textoDeMinijuego(entrada, state);
  return {
    state: { ...state, flags: { ...state.flags, minijuegosRecientes: registrarMinijuegoVisto(state, entrada.id) } },
    logs,
    decision: {
      tipo: 'opciones',
      presentacion: 'minijuego',
      titulo: textos.titulo,
      descripcion: textos.descripcion,
      opciones: [],
      datos: {
        motivo: 'minijuego',
        minijuego: entrada.id,
        momento: 'post_escandalo',
        statRelevante: entrada.statRelevante,
        apuesta: textos.apuesta,
        regla: textos.regla,
        // K6d-P: el tono de la rueda de prensa y sus pistas (puro, sin tirada).
        ...datosDePrensa(state, entrada.id, 'post_escandalo')
      }
    }
  };
}

export function resolver(state, decision, respuesta, rng) {
  if (decision.datos.motivo === 'minijuego') {
    const entrada = minijuegoPorId(decision.datos.minijuego);
    const resultado = clamp(respuesta.resultado ?? 0.5, 0, 1);
    const nombreVisible = decision.titulo ?? textoDeMinijuego(entrada, state).titulo;
    const st = aplicarStatsDeMinijuego(state, entrada.efecto.targets, ajusteBaseDeMinijuego(resultado) * entrada.impacto, nombreVisible);
    return { state: st, logs: [crearLog('event', veredictoDeMinijuego(entrada.id, resultado, state).detalle)] };
  }

  const { evento } = decision.datos;
  const { state: resuelto, logs } = resolverOpcion(state, evento, respuesta.opcionId, rng);

  // K4-C: la bifurcación que decidiste corre tu perfil hacia la afinidad de la opción que tomaste.
  const tomada = opcionesConPrevia(state, evento).find((opcion) => opcion.id === respuesta.opcionId);
  const nextState = tomada
    ? { ...resuelto, player: { ...resuelto.player, perfil: derivarPerfil(resuelto.player.perfil, afinidadDeOpcion(tomada)) } }
    : resuelto;

  if (nextState.terminado || nextState.phase === 'retirado') {
    return { state: nextState, logs };
  }

  if (evento.escandalo) {
    const prensa = pausaDePrensa(nextState, logs);
    if (prensa) {
      return prensa;
    }
  }

  return encadenar(nextState, logs, evento, decision.slot, rng);
}

function encadenar(nextState, logs, evento, slot, rng) {
  // K4-C2: un `retirarse` deja `phase: 'retirado'` sin `terminado` (la ventana de vuelta): tampoco se amontona nada.
  if (nextState.terminado || nextState.phase === 'retirado') {
    return { state: nextState, logs };
  }

  // A veces la vida se amontona: un segundo evento antes de que cierre el
  // split. Cuánto de seguido depende de cuánto cambió ya este split (fase 2):
  // un split denso casi siempre amontona, uno comprimido casi nunca. El cupo
  // de la fase 9Rf gatea el PRIMER evento (arriba, en `aplicar`); si ese
  // pasó, este segundo lo sigue gobernando `probSegundaDecisionPorTipo` como
  // en la fase 2 — el presupuesto no lo pisa.
  // G2a: el segundo evento se pliega al tope de paradas del split: si ya no entra, ni se tira (cero `rng`).
  // H1a (D141): con `paradasPorSplit` en 1 y todo candidato con dos opciones vivas o más (`candidatos`), el primer evento siempre
  // gasta la parada: este segundo evento (y `edad.probSegundaDecisionPorTipo`) solo se alcanza llamando a `resolver` con un split
  // que no gastó su parada (el check del chaining). Anotado en D141; no se borra en H1a.
  if (slot !== 1 || !quedaParadaDeEvento(nextState)) {
    return { state: nextState, logs };
  }
  const probabilidad = BALANCE.edad.probSegundaDecisionPorTipo[tipoDeSplit(nextState)];
  if (chance(probabilidad, rng)) {
    const segundoEvento = elegirEventoDelSplit(nextState, rng, { excluirId: evento.id });
    if (segundoEvento) {
      const segundo = presentarOResolver(conSorteo(nextState, segundoEvento), segundoEvento, 2, rng);
      return { ...segundo, logs: [...logs, ...segundo.logs] };
    }
  }

  return { state: nextState, logs };
}

export function resolverAuto(state, decision, rng) {
  if (decision.datos.motivo === 'minijuego') {
    // Regla 5 de 4.6: Node simula el minijuego con gauss corrido por el stat relevante, como la serie.
    const entrada = minijuegoPorId(decision.datos.minijuego);
    const valor = state.player.stats[decision.datos.statRelevante] ?? 50;
    return { resultado: clamp(gauss(valor / 100, entrada.spread, rng), 0, 1) };
  }
  // G2a: el bot es un jugador con tu perfil (`opcionDelPerfil`): elige lo mismo que antes elegía el motor por vos, así el
  // modelo no cambia salvo por el tope. La bifurcación, que ya frenaba, se sigue contestando como siempre (sus pesos).
  if (decision.datos.evento.bifurcacion) {
    return elegirOpcionAutomatica(state, decision, rng);
  }
  return { opcionId: opcionDelPerfilPara(state, decision.datos.evento) };
}
