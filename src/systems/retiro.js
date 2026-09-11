import { crearLog } from '../core/log.js';
import { calcularContexto } from '../core/contexto.js';
import { BALANCE } from '../data/balance.js';

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

function terminar(state, finAnticipado, mensaje, { reversible } = { reversible: false }) {
  return {
    state: {
      ...state,
      phase: 'retirado',
      terminado: !reversible,
      finAnticipado,
      flags: { ...state.flags, splitsEnDeclive: 0, splitsEnVentana: 0 }
    },
    logs: [crearLog('retiro', mensaje)]
  };
}

function mensajeDeSalida(state, finAnticipado) {
  if (finAnticipado === 'sin_equipo') {
    return `A los ${state.age} el teléfono dejó de sonar. Sin equipo y sin llamados: se termina acá.`;
  }
  return `Te retirás a los ${state.age}. ${state.career.titulos} título(s), `
    + `${state.career.internacionales} internacional(es). Se cierra una carrera.`;
}

function decisionDeclive(state) {
  return {
    tipo: 'opciones',
    bisagra: true,
    titulo: 'Fin de temporada: ¿la seguís?',
    descripcion: `A los ${state.age} el mercado te está diciendo que no. ¿Seguís peleándola o colgás los botines?`,
    opciones: [
      { id: 'seguir', label: 'La seguís peleando', descripcion: 'Un año más contra la corriente. Esto no se resetea solo.' },
      { id: 'retirarse', label: 'Colgás los botines', descripcion: 'Cerrás la carrera. Con la puerta entreabierta, si el cuerpo y las ganas dan.' }
    ],
    datos: { motivo: 'retiro_declive' }
  };
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
function aplicarVentanaDeVuelta(state) {
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

  return { state: conCuenta, logs: [], decision: decisionVuelta(conCuenta) };
}

export function aplicar(state, rng) {
  // Si llegamos acá con `phase: 'retirado'` es siempre la ventana reversible
  // — un retiro terminal nunca vuelve a correr `ETAPAS_SPLIT`
  // (`core/pipeline.js` corta en `state.terminado` antes de llegar).
  if (state.phase === 'retirado') {
    return aplicarVentanaDeVuelta(state);
  }

  if (state.phase !== 'profesional') {
    return { state, logs: [] };
  }
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
    const finAnticipado = state.career.currentOrg ? 'retiro_elegido' : 'sin_equipo';
    return terminar(state, finAnticipado, mensajeDeSalida(state, finAnticipado), { reversible: false });
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

  if (splitsEnDeclive < r.splitsDeclivePorAviso) {
    return { state: conCuenta, logs: [] };
  }

  return { state: conCuenta, logs: [], decision: decisionDeclive(conCuenta) };
}

export function resolver(state, decision, respuesta, rng) {
  const { motivo } = decision.datos;

  if (motivo === 'retiro_declive') {
    const r = BALANCE.retiro;
    if (respuesta.opcionId === 'seguir') {
      const splitsEnDeclive = Math.floor(state.flags.splitsEnDeclive * r.factorSeguirPeleandola);
      return {
        state: { ...state, flags: { ...state.flags, splitsEnDeclive } },
        logs: [crearLog('retiro', 'Decidís seguir. El mercado no va a esperar para siempre.')]
      };
    }
    const finAnticipado = state.career.currentOrg ? 'retiro_elegido' : 'sin_equipo';
    const puedeVolver = state.flags.vueltasUsadas < r.vueltasMaximas;
    return terminar(state, finAnticipado, mensajeDeSalida(state, finAnticipado), { reversible: puedeVolver });
  }

  // motivo === 'retiro_vuelta'
  if (respuesta.opcionId === 'volver') {
    return {
      state: {
        ...state,
        phase: 'profesional',
        flags: {
          ...state.flags,
          splitsEnVentana: 0,
          vueltasUsadas: state.flags.vueltasUsadas + 1,
          splitVuelta: state.player.splitCount
        }
      },
      logs: [crearLog('retiro', 'Volvés a competir. De free agent, a ver quién te llama.')]
    };
  }
  return { state, logs: [crearLog('retiro', 'Por ahora, no. La puerta sigue entreabierta.')] };
}

export function resolverAuto(state, decision, rng) {
  const { motivo } = decision.datos;
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
