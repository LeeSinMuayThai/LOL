import { crearLog } from '../core/log.js';
import { calcularContexto } from '../core/contexto.js';
import { BALANCE } from '../data/balance.js';
import {
  elegirEvento, decisionDesdeEvento, resolverOpcion, opcionDelPerfilPara,
  resolver as resolverEvento, resolverAuto as resolverAutoEvento
} from './events.js';
import { armarRosterAlVolver } from './roster.js';
import { calcularCalendario } from './edadInicio.js';

export const id = 'retiro';

// Fase 10a (PLAN.md §10.1): la carrera termina cuando el mercado deja de
// llamarte — y ahora es de verdad una DECISIÓN, no un dado. 9R5a cerraba la
// run con `chance()` contra una edad fija (`edadDeclive: 27`); acá el reloj
// es la presión real: `contexto.etapa === 'declive'` (D30, `core/contexto.js`
// — banqueado, o caíste de tier 1 y no volviste, o tu nivel cayó en serio
// respecto de tu pico) MÁS estar sin equipo, que se suma aparte porque el eje
// compartido asume que 'declive' garantiza tener org (para el contenido). Un
// jugador que sigue subiendo nunca entra en esta cuenta, sin importar la
// edad — solo la línea Faker (edad dura) lo agarra a todos por igual. Cero
// RNG en todo el sistema.
//
// Va después de `mercado` en `ETAPAS_SPLIT`: el estado de contrato / banquillo
// de los que depende `etapa` ya está fresco este split.
//
// El retiro por decisión o por mercado abre una ventana de vuelta
// (`vueltasMaximas`, `CONCEPTO` §12.4: Bjergsen/Doublelift, dos veces cada
// uno); burnout, prohibición familiar y no_llego siguen siendo terminales
// (los setea `atributos.js`/`amateur.js`, no este sistema).

// K5-C: todo retiro que decide este sistema (o la bifurcación del mercado) deja su motivo en una línea
// (`state.motivoRetiro`), que la tarjeta muestra debajo del marco.
function terminar(state, finAnticipado, mensaje, { reversible = false, motivo = null } = {}) {
  return {
    state: {
      ...state,
      phase: 'retirado',
      terminado: !reversible,
      finAnticipado,
      motivoRetiro: motivo,
      flags: {
        ...state.flags, splitsEnDeclive: 0, splitsEnVentana: 0, splitsSinOfertaEnTier: 0, pruebasFallidas: [],
        // K5c-R: si volvés, volvés de free agent; la presión de tier 2 arranca de cero (como la de K5-C).
        splitsTier2SinOfertaTier1: 0
      }
    },
    logs: [crearLog('retiro', mensaje)]
  };
}

// K5c-R, la presión de tier 2: cada split jugado en tier 2 (con club, también con contrato corriendo) desde
// `BALANCE.retiro.presionTier2.edadDesde` suma uno a `flags.splitsTier2SinOfertaTier1`. Lo vuelve a cero solo una oferta de
// tier 1 (`systems/mercado.js`, que también frena con la bifurcación al llegar al umbral). Corre todos los splits de la
// fase profesional, después del mercado (el tier y el club ya son los del split que se juega). Cero `rng`; las perillas
// se leen acá, no al importar el módulo.
export function conPresionTier2(state) {
  const { edadDesde } = BALANCE.retiro.presionTier2;
  if (state.career.tier !== 2 || !state.career.currentOrg || state.age < edadDesde) {
    return state;
  }
  const splitsTier2SinOfertaTier1 = (state.flags.splitsTier2SinOfertaTier1 ?? 0) + 1;
  return { ...state, flags: { ...state.flags, splitsTier2SinOfertaTier1 } };
}

function mensajeDeSalida(state, finAnticipado) {
  if (finAnticipado === 'sin_equipo') {
    return probasteCon(state)
      ? `A los ${state.age} te quedás sin equipo: hubo llamados, pero las pruebas no alcanzaron. Se termina acá.`
      : `A los ${state.age} el teléfono dejó de sonar. Sin equipo y sin llamados: se termina acá.`;
  }
  return `Te retirás a los ${state.age}. ${state.career.titulos} título(s), `
    + `${state.career.internacionales} internacional(es). Se cierra una carrera.`;
}

const NUMERO_EN_PALABRAS = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis'];

// "dos pretemporadas seguidas" (o "la última pretemporada"): cuántos mercados te dijeron que no, en palabras.
export function pretemporadasEnPalabras(n) {
  if (n <= 1) {
    return 'la última pretemporada';
  }
  return `${NUMERO_EN_PALABRAS[n] ?? n} pretemporadas seguidas`;
}

const ANIOS_EN_PALABRAS = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];

// K5c-R: "dos años" (o "más de un año", o "dos splits"): cuánto llevás, dicho a partir de los splits contados.
export function aniosEnPalabras(splits) {
  const porAnio = BALANCE.edad.splitsPorEdad;
  const anios = Math.floor(splits / porAnio);
  if (anios === 0) {
    return splits === 1 ? 'un split' : `${ANIOS_EN_PALABRAS[splits] ?? splits} splits`;
  }
  const texto = `${ANIOS_EN_PALABRAS[anios] ?? anios} ${anios === 1 ? 'año' : 'años'}`;
  return splits % porAnio === 0 ? texto : `más de ${texto}`;
}

// K4c (revisión): "probaste con Onda Collective y no alcanzó" (o "con A y con B"), si desde tu última firma hubo pruebas del
// mercado que no alcanzaron sin un respaldo (`flags.pruebasFallidas`, `systems/mercado.js`). `null` si no hubo: entonces sí fue
// el mercado el que no llamó. El declive las cuenta igual (sin club es sin club), pero dice lo que pasó.
function probasteCon(state) {
  const orgs = [...new Set(state.flags.pruebasFallidas ?? [])];
  if (orgs.length === 0) {
    return null;
  }
  const lista = orgs.length === 1 ? orgs[0] : `${orgs.slice(0, -1).join(', ')} y con ${orgs.at(-1)}`;
  return `probaste con ${lista} y no alcanzó`;
}

function finDeSalida(state) {
  return state.career.currentOrg ? 'retiro_elegido' : 'sin_equipo';
}

// K5-C: la bifurcación del mercado (`systems/mercado.js`, motivo `fin_mercado`) termina acá cuando elegís colgar el
// mouse. Mismo retiro que `retiro_declive` —con la ventana de vuelta si te quedan vueltas—, pero con el motivo que
// dio el mercado ("Ninguna org de LCK te ofreció contrato en dos pretemporadas seguidas.").
export function retirarsePorMercado(state, motivo) {
  const finAnticipado = finDeSalida(state);
  const puedeVolver = state.flags.vueltasUsadas < BALANCE.retiro.vueltasMaximas;
  return terminar(state, finAnticipado, `${motivo} ${mensajeDeSalida(state, finAnticipado)}`, { reversible: puedeVolver, motivo });
}

function decisionDeclive(state) {
  return {
    tipo: 'opciones',
    bisagra: true,
    titulo: 'Fin de temporada: ¿la seguís?',
    descripcion: probasteCon(state)
      ? `A los ${state.age} ${probasteCon(state)}${state.career.currentOrg ? '' : ', y seguís sin club'}. ¿Seguís peleándola o colgás el mouse?`
      : `A los ${state.age} el mercado te está diciendo que no. ¿Seguís peleándola o colgás el mouse?`,
    opciones: [
      { id: 'seguir', label: 'La seguís peleando', descripcion: 'Un año más contra la corriente. Esto no se resetea solo.' },
      { id: 'retirarse', label: 'Colgás el mouse', descripcion: 'Cerrás la carrera. Con la puerta entreabierta, si el cuerpo y las ganas dan.' }
    ],
    datos: { motivo: 'retiro_declive' }
  };
}

// K4-C2 (regla 15): el retiro que elegís en una bifurcación (`retirarse` en `data/events/caminos.json`: dejar de
// competir para vivir del canal, colgar el mouse para pasar al staff). Va por el MISMO camino que el retiro del
// declive (`terminar`, reversible si te quedan vueltas): la ventana de vuelta, la tarjeta y el `finAnticipado`
// ('retiro_elegido') son los de siempre. El motivo queda en `state.motivoRetiro` (K5: el único lugar; la tarjeta lo
// muestra) y se dice en el log, en palabras.
export const MOTIVOS_DE_RETIRO = {
  streaming: 'para vivir del canal',
  staff: 'para pasar al staff'
};

// El split en el que te retirás por una bifurcación: uno (no es una perilla, es la cuenta de "este split").
const SPLIT_DEL_RETIRO = 1;

export function retirarsePorCamino(state, motivo) {
  const puedeVolver = state.flags.vueltasUsadas < BALANCE.retiro.vueltasMaximas;
  const { state: retirado, logs } = terminar(state, 'retiro_elegido',
    `Dejás de competir a los ${state.age} ${MOTIVOS_DE_RETIRO[motivo]}. ${state.career.titulos} título(s), `
    + `${state.career.internacionales} internacional(es).${puedeVolver ? ' La puerta queda entreabierta.' : ''}`,
    { reversible: puedeVolver, motivo: `Dejaste de competir ${MOTIVOS_DE_RETIRO[motivo]}.` });
  // Arreglo de K5c (años pro): la bifurcación llega en `eventos`, con la temporada de este split ya jugada, pero `atributos`
  // no corre: ni el reloj (`player.splitCount`) ni `registro.splitsJugados` la cuentan. Ese split fue pro y se jugó: el
  // registro lo suma y `career.splitsRetirado` (lo que `aniosProDe` le descuenta al reloj) baja uno, así que
  // `splitsJugados = splitCount − splitsRetirado` se sigue cumpliendo. Sin vuelta, la tarjeta lo cuenta; con vuelta, se
  // compensa con el split del retiro que `relojAlVolver` suma dentro de `flags.splitsEnVentana`, que antes se descontaba
  // entero (la vuelta perdía un split pro: 15 de 87 vueltas de `azar` con Final2).
  const temporadaJugada = state.phase === 'profesional' && state.career.splitPrimerContratoTier2 != null;
  const conSplitPro = temporadaJugada
    ? {
      ...retirado,
      career: {
        ...retirado.career,
        splitsRetirado: (retirado.career.splitsRetirado ?? 0) - SPLIT_DEL_RETIRO,
        registro: { ...retirado.career.registro, splitsJugados: retirado.career.registro.splitsJugados + SPLIT_DEL_RETIRO }
      }
    }
    : retirado;
  return { state: conSplitPro, descripcion: `te retirás ${MOTIVOS_DE_RETIRO[motivo]}`, logs };
}

// K4-C2: la ventana de vuelta tiene su contenido (`data/events/retiro_y_vuelta.json`, etapa `retirado`), que el
// pipeline no corría: `phase: 'retirado'` corta las etapas antes de `events`. Ahora sale acá, en la parada donde se
// decide la vuelta: una bifurcación (`la_llamada_del_manager`) frena antes del "¿Volvés?"; el resto lo resuelve tu
// perfil en una línea de crónica, como cualquier evento que no es bifurcación (K4-C).
function eventoDeVentana(state, rng) {
  const evento = elegirEvento(state, rng, { filtro: (candidato) => candidato.contexto?.etapa?.includes('retirado') });
  if (!evento) {
    return { state, logs: [], decision: decisionVuelta(state) };
  }
  if (evento.bifurcacion) {
    const decision = decisionDesdeEvento(state, evento, { franja: 'normal', slot: 1 });
    return { state, logs: [], decision: { ...decision, datos: { ...decision.datos, motivo: 'evento_ventana' } } };
  }
  const resuelto = resolverOpcion(state, evento, opcionDelPerfilPara(state, evento), rng, { cronica: state.player.perfil.actual });
  return { state: resuelto.state, logs: resuelto.logs, decision: decisionVuelta(resuelto.state) };
}

function decisionVuelta(state) {
  return {
    tipo: 'opciones',
    bisagra: true,
    titulo: '¿Volvés a competir?',
    descripcion: 'La ventana sigue abierta. ¿Le das una vuelta más o lo dejás cerrado?',
    opciones: [
      { id: 'volver', label: 'Volvés', descripcion: 'De free agent otra vez: a esperar que suene el teléfono.' },
      { id: 'quedarse', label: 'Lo dejás cerrado', descripcion: 'Todavía podés volver más adelante, si la ventana no se cerró.' }
    ],
    datos: { motivo: 'retiro_vuelta' }
  };
}

// La ventana de vuelta: el jugador ya está `retirado` con `terminado: false`.
// `core/pipeline.js` corta el resto de `ETAPAS_SPLIT` mientras dure —
// `player.splitCount` queda congelado (lo mueve `atributos.js`, que no llega
// a correr), así que el reloj de la ventana es propio: `flags.splitsEnVentana`,
// que este mismo sistema es el único que toca.
function aplicarVentanaDeVuelta(state, rng) {
  const r = BALANCE.retiro;
  const splitsEnVentana = state.flags.splitsEnVentana + 1;
  const conCuenta = { ...state, flags: { ...state.flags, splitsEnVentana } };

  if (splitsEnVentana > r.ventanaDeVueltaSplits) {
    return {
      state: { ...conCuenta, terminado: true },
      logs: [crearLog('retiro', 'La ventana se cerró sola. Esta vez, para siempre.')]
    };
  }

  // Se pregunta al ritmo de una pretemporada por año, no en cada tick. Pero
  // ningún split puede cerrar mudo (regla de proceso 13, ya cubierta para
  // 'split tranquilo' en `events.js`) — el resto del registro está apagado
  // acá (`core/pipeline.js`), así que sin esto un split de la ventana no
  // narraría nada.
  if (splitsEnVentana % BALANCE.edad.splitsPorEdad !== 0) {
    return { state: conCuenta, logs: [crearLog('retiro', 'Seguís retirado. Nada nuevo este split.', { tecnico: true })] };
  }

  // K5c (motor): la vuelta te devuelve con la edad que el mundo te puso (`relojAlVolver`). Si con esos años ya llegaste a
  // la línea Faker, no hay vuelta que ofrecer: la misma línea que `aplicar` hace cumplir en la pretemporada, sin pregunta.
  if (relojAlVolver(conCuenta).age >= r.edadRetiroForzoso) {
    return {
      state: { ...conCuenta, terminado: true },
      logs: [crearLog('retiro', 'La ventana se cerró sola: con los años que pasaron afuera, ya no hay vuelta.')]
    };
  }

  return eventoDeVentana(conCuenta, rng);
}

export function aplicar(state, rng) {
  // Si llegamos acá con `phase: 'retirado'` es siempre la ventana reversible
  // — un retiro terminal nunca vuelve a correr `ETAPAS_SPLIT`
  // (`core/pipeline.js` corta en `state.terminado` antes de llegar).
  if (state.phase === 'retirado') {
    return aplicarVentanaDeVuelta(state, rng);
  }

  if (state.phase !== 'profesional') {
    return { state, logs: [] };
  }
  // K5c-R: la presión de tier 2 se cuenta todos los splits, antes de mirar si es pretemporada.
  return aplicarProfesional(conPresionTier2(state));
}

function aplicarProfesional(state) {
  // El retiro es un momento de fin de año, no una deriva a mitad de temporada
  // (T2: el contexto se calcula en vivo, nunca se confía en el cache).
  const contexto = calcularContexto(state);
  if (contexto.ventana !== 'pretemporada') {
    return { state, logs: [] };
  }

  const r = BALANCE.retiro;

  // La línea Faker: pasada cierta edad te retirás sí o sí, sin pregunta —
  // no hay nada que elegir (regla 1) y sin ventana de vuelta: es la línea de
  // verdad, no una más. Sin este `reversible: false` fijo, alguien con
  // `vueltasUsadas < vueltasMaximas` podía rebotar de vuelta contra la MISMA
  // edad una y otra vez, corriendo el retiro "de verdad" varios años de más.
  if (state.age >= r.edadRetiroForzoso) {
    const finAnticipado = finDeSalida(state);
    const motivo = `Llegaste a los ${state.age}: la línea que casi nadie cruza en el competitivo.`;
    return terminar(state, finAnticipado, mensajeDeSalida(state, finAnticipado), { reversible: false, motivo });
  }

  // `contexto.etapa === 'declive'` no incluye "sin equipo" (D30, `core/
  // contexto.js`: ese eje asume que 'declive' garantiza tener org, para el
  // contenido). Acá sí importa el mercado directo: no tener equipo es la
  // causa modal de retiro real (`CONCEPTO` §12.4), así que se suma aparte.
  const enPresion = contexto.etapa === 'declive' || !state.career.currentOrg;

  if (!enPresion) {
    if (state.flags.splitsEnDeclive === 0) {
      return { state, logs: [] };
    }
    // Saliste del declive (volviste a tener equipo, dejaste el banco, o tu
    // nivel se recuperó): la cuenta BAJA, no se borra de un año para el
    // otro — un solo año bueno en medio de una racha mala no debería tapar
    // dos años reales de presión (el nivel oscila con ruido, no es un
    // escalón limpio). "Si venís para arriba, seguís" (pedido explícito del
    // usuario) igual se cumple: unos años sostenidos para arriba SÍ la
    // bajan del todo.
    const splitsEnDeclive = Math.max(0, state.flags.splitsEnDeclive - 1);
    return { state: { ...state, flags: { ...state.flags, splitsEnDeclive } }, logs: [] };
  }

  const splitsEnDeclive = state.flags.splitsEnDeclive + 1;
  const conCuenta = { ...state, flags: { ...state.flags, splitsEnDeclive } };

  // K5-C: si el mercado ya frenó esta misma pretemporada con "bajás o te retirás" (`forkMercadoSplit`), no se
  // pregunta dos veces: la cuenta sigue, la pregunta queda para el año que viene.
  if (splitsEnDeclive < r.splitsDeclivePorAviso || state.flags.forkMercadoSplit === state.player.splitCount) {
    return { state: conCuenta, logs: [] };
  }

  return { state: conCuenta, logs: [], decision: decisionDeclive(conCuenta) };
}

// K5c (motor): el mundo no te espera. Mientras dura la ventana `player.splitCount` queda congelado (lo mueve
// `atributos.js`, que no corre), y con él el calendario (`edadInicio.js`) y la edad (`edadCierre.js`): sin esto, la
// vuelta retomaba el reloj donde lo habías dejado y el mundo repetía el año (dos Mundiales 2034 en la seed 4 de `azar`:
// el retiro de una bifurcación llega en `events`, DESPUÉS del Mundial y antes de `atributos`, así que la vuelta volvía
// a jugar ese mismo split). Al volver, el reloj adelanta los splits que pasaron afuera: el del retiro (jugado o no,
// `atributos` no lo contó) más los de la ventana hasta este, que son `flags.splitsEnVentana` en total (la vuelta solo
// se ofrece cuando ese contador es múltiplo de `splitsPorEdad`, así que volvés en el mismo punto del año). La edad
// suma los cierres de año que cruzaste y el calendario se recalcula ya, en este split (`edadInicio` corrió antes con el
// reloj viejo). Si la ventana se cierra sin vuelta no se toca nada: la tarjeta queda en el año y la edad del retiro.
function relojAlVolver(state) {
  const porAnio = BALANCE.edad.splitsPorEdad;
  const antes = state.player.splitCount;
  const splitCount = antes + state.flags.splitsEnVentana;
  const aniosAfuera = Math.floor(splitCount / porAnio) - Math.floor(antes / porAnio);
  const conReloj = { ...state, age: state.age + aniosAfuera, player: { ...state.player, splitCount } };
  return { ...conReloj, calendario: calcularCalendario(conReloj) };
}

export function resolver(state, decision, respuesta, rng) {
  const { motivo } = decision.datos;

  if (motivo === 'evento_ventana') {
    const resuelto = resolverEvento(state, decision, respuesta, rng);
    return { state: resuelto.state, logs: resuelto.logs, decision: decisionVuelta(resuelto.state) };
  }

  if (motivo === 'retiro_declive') {
    const r = BALANCE.retiro;
    if (respuesta.opcionId === 'seguir') {
      const splitsEnDeclive = Math.floor(state.flags.splitsEnDeclive * r.factorSeguirPeleandola);
      return {
        state: { ...state, flags: { ...state.flags, splitsEnDeclive } },
        logs: [crearLog('retiro', 'Decidís seguir. El mercado no va a esperar para siempre.')]
      };
    }
    const finAnticipado = finDeSalida(state);
    const puedeVolver = state.flags.vueltasUsadas < r.vueltasMaximas;
    const enBaja = `${pretemporadasEnPalabras(state.flags.splitsEnDeclive)} en baja`;
    const probaste = probasteCon(state);
    const motivo = probaste
      ? `${probaste[0].toUpperCase()}${probaste.slice(1)}: ${enBaja}.`
      : `El mercado te venía diciendo que no: ${enBaja}.`;
    return terminar(state, finAnticipado, mensajeDeSalida(state, finAnticipado), { reversible: puedeVolver, motivo });
  }

  // motivo === 'retiro_vuelta'
  if (respuesta.opcionId === 'volver') {
    const reloj = relojAlVolver(state);
    const vuelto = {
      ...reloj,
      phase: 'profesional',
      motivoRetiro: null,
      // K5c (revisión): los splits de la ventana avanzaron el reloj pero no fueron años pro (`career.splitsRetirado`).
      career: { ...reloj.career, splitsRetirado: (reloj.career.splitsRetirado ?? 0) + reloj.flags.splitsEnVentana },
      flags: {
        ...reloj.flags,
        splitsEnVentana: 0,
        vueltasUsadas: reloj.flags.vueltasUsadas + 1,
        splitVuelta: reloj.player.splitCount
      }
    };
    // K4c (integración): `roster` ya corrió este split, con `phase: 'retirado'`. Si te habías retirado en el split del
    // pase, la org del contrato no tiene fila todavía: se arma acá, antes de la temporada de la vuelta (ver
    // `armarRosterAlVolver`).
    const conRoster = armarRosterAlVolver(vuelto, rng);
    return {
      state: conRoster.state,
      logs: [crearLog('retiro', 'Volvés a competir. De free agent, a ver quién te llama.'), ...conRoster.logs]
    };
  }
  return { state, logs: [crearLog('retiro', 'Por ahora, no. La puerta sigue entreabierta.')] };
}

export function resolverAuto(state, decision, rng) {
  const { motivo } = decision.datos;
  if (motivo === 'evento_ventana') {
    return resolverAutoEvento(state, decision, rng);
  }
  if (motivo === 'retiro_declive') {
    // Alguien con criterio acepta el veredicto del mercado en vez de
    // insistir contra viento y marea (`CONCEPTO` §12.4: la causa modal de
    // retiro real es "no te renuevan", no la negación).
    return { opcionId: 'retirarse' };
  }
  // La vuelta: se ejercita una vez por carrera (Bjergsen volvió; no todos
  // vuelven dos veces), nunca la segunda — dos vueltas es la excepción real.
  return { opcionId: state.flags.vueltasUsadas === 0 ? 'volver' : 'quedarse' };
}
