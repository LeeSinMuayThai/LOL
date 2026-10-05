// K6b-C2, la cola de verdad (PLAN.md §K6b; D-B en la cola). Desde los `BALANCE.cola.edadDesde` años o desde el aviso de
// declive (`etapa === 'declive'`), lo que llegue primero, el cierre de año (`systems/edadCierre.js`) y el momento de una
// fecha marcada (`systems/temporada.js`) frenan solo en tres casos:
// - es un hito: el primer título, el último año antes del retiro, un récord, o el cierre de un año con un título o un
//   Mundial (`hitoDelCierre`, `hitoDelMomento`);
// - algo cambió desde la última vez que ese tipo frenó en la cola: el club, el tier, una lesión o el declive
//   (`firmaDeLaCola` contra `flags.colaFirmas[tipo]`);
// - su tipo tiene palanca: la medida con `agencia.js` (`BALANCE.cola.palancaMedidaPct`) llega al umbral.
// Si no, lo resuelve tu perfil (como cualquier evento que no frena, K4-C) y se narra en una línea. Fuera de la cola no
// cambia nada. Todo esto es puro y sin `rng`: decide SI se frena, no cambia ninguna tirada.
import { BALANCE } from '../data/balance.js';
import { calcularContexto } from './contexto.js';

// Los tipos de parada que mira la regla (las claves de `flags.colaFirmas` y de `BALANCE.cola.palancaMedidaPct`).
export const TIPOS_DE_LA_COLA = ['cierre', 'momento'];

function enDeclive(state) {
  return calcularContexto(state).etapa === 'declive';
}

// ¿Estás en la cola? Desde la edad o desde el aviso de declive, lo que llegue primero.
export function enLaCola(state) {
  return state.phase === 'profesional' && (state.age >= BALANCE.cola.edadDesde || enDeclive(state));
}

// La foto de "algo cambió": el club, el tier, la última lesión grave y el declive.
export function firmaDeLaCola(state) {
  return [
    state.career.currentOrg ?? 'libre',
    state.career.tier ?? '-',
    state.flags.lesionGraveSplit ?? 'sin lesion',
    enDeclive(state) ? 'declive' : 'sin declive'
  ].join('|');
}

// ¿El tipo tiene palanca? La medida (agencia.js) contra el umbral, los dos en `balance.js`.
export function tienePalanca(tipo) {
  const medida = BALANCE.cola.palancaMedidaPct[tipo];
  return Number.isFinite(medida) && medida >= BALANCE.cola.umbralPalancaPct;
}

// El último año antes del retiro: el que termina con la edad del retiro forzoso (la línea Faker, `systems/retiro.js`).
// `edadAlCerrar` es la edad con la que se cierra el año (la de después de cumplir).
function esUltimoAnio(edadAlCerrar) {
  return edadAlCerrar >= BALANCE.retiro.edadRetiroForzoso;
}

// El hito del cierre de año. `state` es el de ANTES de cumplir (el año que cierra, con su `calendario.anio`) y
// `edadAlCerrar` la de después. Devuelve el motivo o `null`.
export function hitoDelCierre(state, edadAlCerrar) {
  const registro = state.career.registro;
  const anio = state.calendario.anio;
  const titulosDelAnio = registro.titulos.filter((titulo) => titulo.anio === anio);
  if (titulosDelAnio.length > 0) {
    return titulosDelAnio.length === registro.titulos.length ? 'primer titulo' : 'titulo';
  }
  if (registro.internacionales.some((entrada) => entrada.anio === anio)) {
    return 'mundial';
  }
  // El récord: tu mejor nivel de la carrera llegó este año.
  if (registro.picos.nivel > 0 && registro.picos.edadDelPicoDeNivel === state.age) {
    return 'record';
  }
  if (esUltimoAnio(edadAlCerrar)) {
    return 'ultimo anio';
  }
  return null;
}

// El hito del momento de una fecha marcada (temporada regular): el año que se juega es el último antes del retiro.
export function hitoDelMomento(state) {
  return esUltimoAnio(state.age + 1) ? 'ultimo anio' : null;
}

// ¿Frena esta parada de la cola? `hito` es el de `hitoDelCierre`/`hitoDelMomento` (o `null`). Devuelve
// `{ frena, motivo }`: `motivo` es por qué frena ('fuera de la cola', 'hito', 'cambio', 'palanca') o `null`.
export function frenaEnLaCola(state, tipo, hito) {
  if (!enLaCola(state)) {
    return { frena: true, motivo: 'fuera de la cola' };
  }
  if (hito) {
    return { frena: true, motivo: 'hito' };
  }
  if ((state.flags.colaFirmas?.[tipo] ?? null) !== firmaDeLaCola(state)) {
    return { frena: true, motivo: 'cambio' };
  }
  if (tienePalanca(tipo)) {
    return { frena: true, motivo: 'palanca' };
  }
  return { frena: false, motivo: null };
}

// La foto se guarda cada vez que ese tipo frena en la cola (fuera de la cola no se toca: la cola arranca de cero).
export function conFirmaDeLaCola(state, tipo) {
  if (!enLaCola(state)) {
    return state;
  }
  return {
    ...state,
    flags: { ...state.flags, colaFirmas: { ...(state.flags.colaFirmas ?? {}), [tipo]: firmaDeLaCola(state) } }
  };
}

// La línea de crónica de una parada de la cola que no frenó (la que escribe `resolverOpcion` con `cronica`) lleva `cola: tipo`,
// para que el instrumento y los checks la cuenten sin adivinar por el título. `opcionId` es la opción que tomó tu perfil.
export function narradaEnLaCola(logs, tipo, opcionId) {
  return logs.map((log) => (log.cronica ? { ...log, cola: tipo, opcionId } : log));
}
