import { gauss, chance, pick } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { clampStat, clamp } from '../core/numeros.js';
import { generarHandle } from '../core/mundo.js';
import { orgDeCarrera } from '../core/competicion.js';
import { companerosDelPlantel } from '../core/fuerza.js';
import {
  abrirFila, registrarSplitEnFila, registrarJerarquiaEnFila, registrarArraigoEnFila,
  registrarPico, registrarSalarioEnFila, acumularDinero, arraigoInicial
} from '../core/registro.js';
import { BALANCE } from '../data/balance.js';
import { ROLES, IDS_ROL, etiquetaRol } from '../data/roles.js';
import { aprenderCampeones } from '../core/pool.js';
import { tierListDeRol } from '../core/regimen.js';

export const id = 'roster';

// K4-C2 (regla 15): el cambio de línea de una bifurcación (`cambiarRol` en `data/events/caminos.json`). Tu línea
// pasa a ser otra de verdad: los pesos del rol (`data/roles.js`) los lee todo el motor desde `player.role`; el pool
// se rearma con campeones de la línea nueva y maestría de recién aprendidos (`aprenderCampeones`, la misma regla que
// el offseason); los compañeros pasan a ser los de las otras cuatro líneas (el plantel del mundo si tu org lo tiene;
// si no, el que jugaba tu línea nueva pasa a la tuya). La línea y el pool que dejás quedan guardados en
// `flags.rolDeOrigen`: `rol: 'origen'` te devuelve a ellos (con el óxido de los splits sin jugarlos).
// `rol` es una línea o un mapa línea actual → línea nueva.
export function cambiarDeRol(state, rol, rng) {
  const rolViejo = state.player.role;
  const origen = state.flags.rolDeOrigen;
  const rolNuevo = rol === 'origen' ? origen?.rol : (typeof rol === 'string' ? rol : rol?.[rolViejo]);
  if (!ROLES[rolNuevo] || rolNuevo === rolViejo) {
    return { state, descripcion: `seguís de ${etiquetaRol(rolViejo)}` };
  }
  const vuelve = origen?.rol === rolNuevo;
  const conRol = { ...state, player: { ...state.player, role: rolNuevo, championPool: [], campeonDelSplit: null } };
  const pool = vuelve
    ? origen.pool
    : aprenderCampeones(conRol, [], BALANCE.roster.cambioDeRol.tamanoPool, rng).pool;
  const companeros = companerosDelPlantel(conRol, state.career.currentOrg)
    ?? state.career.companeros.map((companero) => (companero.role === rolNuevo ? { ...companero, role: rolViejo } : companero));
  const conPool = { ...conRol, player: { ...conRol.player, championPool: pool } };
  // Revisión de K5: la tier list del meta es la de TU rol (`systems/meta.js` la arma con `tierListDeRol`). Al cambiar
  // de línea se rearma acá, pura y sin rng, con los pesos del régimen vigente: si no, hasta el split siguiente quedaba
  // la del rol viejo (19 entradas contra 16 campeones del rol nuevo). La anterior se vacía: era de otra línea.
  return {
    state: {
      ...conPool,
      meta: { ...state.meta, tierList: tierListDeRol(conPool), tierListAnterior: [] },
      career: { ...state.career, companeros },
      flags: { ...state.flags, rolDeOrigen: vuelve ? null : (origen ?? { rol: rolViejo, pool: state.player.championPool }) }
    },
    descripcion: `pasás de ${etiquetaRol(rolViejo)} a ${etiquetaRol(rolNuevo)} (pool de ${pool.map((c) => c.name).join(', ')})`
  };
}

// Sea tier 1, 2 o 3: `orgDeCarrera` sabe dónde buscar en cada caso (fase 3).
const orgActual = orgDeCarrera;

// Fase 9M (PLAN.md §9M.2): si la org tiene plantel NPC (tier 1 y la tier 2 de
// tu región), los compañeros SALEN de ahí — con edad y contrato, y con memoria:
// si volvés cinco años después están o no están los mismos. Sin plantel (tier
// 3, o una tier 2 fuera del set modelado) se siguen inventando como antes.
//
// Trampa T1: leer del plantel no consume `rng`; el fallback sí. Ninguna seed
// anterior a 9M reproduce su carrera (D35, anticipado). K2b: la lectura del
// plantel es `companerosDelPlantel` (`core/fuerza.js`), la MISMA que usa la
// fuerza del equipo en vivo.
function generarCompaneros(state, org, rng) {
  const delPlantel = companerosDelPlantel(state, org.nombre);
  if (delPlantel) {
    return delPlantel;
  }

  const otrosRoles = IDS_ROL.filter((rol) => rol !== state.player.role);
  const usados = new Set(state.career.companeros.map((companero) => companero.handle));
  return otrosRoles.map((rol) => ({
    handle: generarHandle(rng, usados),
    role: rol,
    nivel: Math.round(clampStat(gauss(org.fuerza, BALANCE.roster.nivelCompaneroSpread, rng)))
  }));
}

// K2b (PLAN.md "K2 — lo que midió la investigación", viñeta K2b.2): en una
// liga modelada, `career.companeros` es el plantel VIVO de tu org. Si el mundo
// cambió a alguien (el mercado del mundo de la pretemporada, un retiro, un
// canterano), esto lo trae: la lista pasa a ser la del plantel, cada puesto que
// cambió de jugador se cuenta en una línea y la química se resetea como cuando
// se iba alguien (`sinergiaRetenidaAlCambiar`). Sin dado: lo que sacude el
// roster es el mundo, no una tirada. No hace nada si la org no tiene plantel,
// si el roster todavía no se armó para esta org (`rosterDeOrg`: eso es
// `armarRoster`) o si no hay compañeros. Pura. La usan este sistema (cada split
// en el mismo equipo) y `mercado.js` (después de que el mercado del mundo movió
// los planteles, antes de que se juegue la temporada).
export function conPlantillaDelPlantel(state) {
  const { career } = state;
  if (!career.currentOrg || career.rosterDeOrg !== career.currentOrg || career.companeros.length === 0) {
    return { state, logs: [] };
  }
  const vivos = companerosDelPlantel(state, career.currentOrg);
  if (!vivos) {
    return { state, logs: [] };
  }

  const cambios = vivos
    .map((vivo) => ({ entrante: vivo, saliente: career.companeros.find((c) => c.role === vivo.role) ?? null }))
    .filter(({ entrante, saliente }) => saliente?.handle !== entrante.handle);
  const sinergia = cambios.length > 0
    ? Math.round(clampStat(career.sinergia * BALANCE.roster.sinergiaRetenidaAlCambiar))
    : career.sinergia;
  const logs = cambios.map(({ entrante, saliente }) => crearLog(
    'roster',
    saliente
      ? `${saliente.handle} se va del equipo y entra ${entrante.handle}. Hay que volver a construir todo.`
      : `Entra ${entrante.handle} (${etiquetaRol(entrante.role)}) al equipo. Hay que volver a construir todo.`
  ));

  return { state: { ...state, career: { ...career, companeros: vivos, sinergia } }, logs };
}

// Al cambiar de equipo la jerarquia se resetea parcialmente: lo que ganaste
// en otro vestuario vale, pero no tanto como creias. Extraída para que
// `mercado.js` pueda proyectar EXACTAMENTE este mismo número en la tarjeta de
// oferta (regla de proceso 15) sin volver a tirar el dado: el roll se hace
// una sola vez, en `mercado.js`, y viaja a acá por `flags.jerarquiaProyectadaAlFichar`.
export function jerarquiaAlFichar(state, rng) {
  const r = BALANCE.roster;
  const jerarquiaPrevia = state.career.jerarquia * r.jerarquiaRetenidaAlCambiar;
  return Math.max(jerarquiaPrevia, gauss(r.jerarquiaInicial, r.jerarquiaInicialSpread, rng));
}

// K2b (revisión): la química con la que entrás a un plantel nuevo. Extraída
// para que la regla viva en un solo lugar: `armarRoster` la usa al armar el
// roster y `mercado.js` la usa al firmar un traspaso, porque ese primer split ya
// se juega con los compañeros nuevos y no puede jugarse con la química del
// vestuario anterior. El dado se tira UNA vez (al firmar) y viaja a
// `armarRoster` por `flags.sinergiaProyectadaAlFichar`, igual que la jerarquía.
export function sinergiaAlFichar(state, rng) {
  const r = BALANCE.roster;
  return clampStat(
    Math.max(state.career.sinergia * r.sinergiaRetenidaAlCambiar, gauss(r.sinergiaInicial, r.sinergiaInicialSpread, rng))
  );
}

function armarRoster(state, rng) {
  const r = BALANCE.roster;
  const org = orgActual(state);

  if (!org) {
    return { state, logs: [] };
  }

  // "la_prueba" (fase 4): el tryout con el tier 3 deja un bonus/malus que se
  // consume acá, una sola vez, y no en el momento en que se firma — a esa
  // altura del split este sistema (roster) todavía no corrió otra vez.
  const bonusTryout = state.flags.bonusJerarquiaTryout ?? 0;
  // Fase 9: si este fichaje vino de una oferta de mercado.js, la jerarquía ya
  // se sorteó y se mostró en la tarjeta ANTES de aceptar — usar ese número
  // tal cual, sin volver a tirar el dado (trampa T1: dos tiradas para el
  // mismo evento correrían el stream distinto a lo que se mostró).
  const jerarquiaCruda = state.flags.jerarquiaProyectadaAlFichar ?? jerarquiaAlFichar(state, rng);
  const jerarquia = clampStat(jerarquiaCruda + bonusTryout);
  // Si el traspaso ya fijó la química al firmar (`mercado.js`), no se vuelve a
  // tirar: es la misma con la que se jugó ese primer split.
  const sinergia = state.flags.sinergiaProyectadaAlFichar ?? sinergiaAlFichar(state, rng);

  const companeros = generarCompaneros(state, org, rng);
  const jerarquiaRedondeada = Math.round(jerarquia);

  // Fase 8: se abre la fila de esta org en el registro (regla de proceso 14:
  // el registro solo crece — `competitivo.js`/`mercado.js` ya cerró la fila
  // anterior, si había una, antes de cambiar `currentOrg`). El split en que
  // arrancás acá cuenta en `fila.splits`. Fase 9: el sueldo del contrato
  // vigente (0 en tier 3, donde el mercado todavía no existe) queda registrado
  // en la fila desde que se abre. K1 (D76): lo jugado por tier lo suma
  // `temporada.js`; el split del pase, ya jugado acá, entra con la fila.
  const sinFila = state.flags.splitJugadoSinFila;
  if (sinFila && sinFila.org !== org.nombre) {
    throw new Error(`Se abre la fila de ${org.nombre} con un split jugado sin fila de ${sinFila.org}`);
  }
  const registroConFila = registrarSalarioEnFila(
    registrarJerarquiaEnFila(
      registrarSplitEnFila(
        abrirFila(state.career.registro, {
          org: org.nombre, liga: state.career.liga, tier: state.career.tier,
          anio: state.calendario.anio, split: state.player.splitCount
        }, sinFila?.splitsPorTier ?? null)
      ),
      jerarquiaRedondeada
    ),
    state.career.contrato.salarioAnualUSD
  );

  // Arraigo (fase 8.4): NUNCA se resetea a 0 a secas — arranca en una
  // fracción del hype que ya tenías ("tu fama te precede", imagen 6 de
  // PLAN.md). El registro guarda el pico independientemente del split-a-split.
  const arraigoNuevo = Math.round(arraigoInicial(state.player.stats.hype));
  const registroConPicos = conPagaDelSplit(
    registrarArraigoEnFila(
      registrarPico(registrarPico(registroConFila, 'jerarquia', jerarquiaRedondeada), 'arraigo', arraigoNuevo),
      arraigoNuevo
    ),
    state.career.contrato.salarioAnualUSD
  );

  return {
    state: {
      ...state,
      flags: { ...state.flags, bonusJerarquiaTryout: 0, jerarquiaProyectadaAlFichar: null, splitJugadoSinFila: null, sinergiaProyectadaAlFichar: null },
      career: {
        ...state.career, companeros, jerarquia: jerarquiaRedondeada, sinergia: Math.round(sinergia),
        rosterDeOrg: org.nombre, arraigo: arraigoNuevo, registro: registroConPicos
      }
    },
    logs: [crearLog(
      'roster',
      `Roster de ${org.nombre}: ${companeros.map((c) => `${c.handle} (${etiquetaRol(c.role)})`).join(', ')}. `
      + `Entrás como uno más: jerarquía ${jerarquiaRedondeada}.`
    )]
  };
}

// Fase 9Mf: cada split jugado bajo contrato cobra `salarioAnualUSD / splitsPorEdad`
// (el año son `splitsPorEdad` splits) — se acumula en `registro.dineroTotalUSD`
// (monótono) y se registra el pico de sueldo. En tier 3 el sueldo es 0: los dos
// son no-op. Único punto donde se toca la plata: corre cada split (armado de
// roster nuevo y equipo repetido), headless incluido.
function conPagaDelSplit(registro, salarioAnualUSD) {
  return registrarPico(
    acumularDinero(registro, salarioAnualUSD / BALANCE.edad.splitsPorEdad),
    'salarioAnualUSD', salarioAnualUSD
  );
}

// El arraigo sube solo con el tiempo (fase 8.4), escalado por cuánto se habla
// de tu rol (ROLES[].visibilidad, la misma que ya pondera el hype en
// rendimiento.js). Es la ganancia "de base"; los bonos por título, buen
// rendimiento e internacional viven donde esos resultados se calculan de
// verdad (rendimiento.js y serie.js corren después de roster.js en el
// registro y son quienes conocen el resultado del split).
function conArraigoDelSplit(state, rng) {
  const a = BALANCE.arraigo;
  const ganancia = gauss((a.porSplitMin + a.porSplitMax) / 2, (a.porSplitMax - a.porSplitMin) / 4, rng)
    * ROLES[state.player.role].visibilidad;
  const arraigo = clampStat(state.career.arraigo + clamp(ganancia, 0, a.porSplitMax * 1.5));
  const arraigoRedondeado = Math.round(arraigo);
  const registro = registrarArraigoEnFila(registrarPico(state.career.registro, 'arraigo', arraigoRedondeado), arraigoRedondeado);
  return { ...state, career: { ...state.career, arraigo: arraigoRedondeado, registro } };
}

export function aplicar(state, rng) {
  if (state.phase !== 'profesional' || !state.career.currentOrg) {
    return { state, logs: [] };
  }

  // Roster nuevo: recien fichaste, o cambiaste de equipo.
  if (state.career.rosterDeOrg !== state.career.currentOrg) {
    return armarRoster(state, rng);
  }

  // Fase 8: mismo equipo que el split pasado — un split más arrancado ahí (se
  // suma al global Y a la fila de la org) y el goteo de arraigo de base. Lo
  // jugado por tier lo cuenta `systems/temporada.js` (K1, D76).
  const stConRegistro = {
    ...state,
    career: {
      ...state.career,
      registro: conPagaDelSplit(
        registrarJerarquiaEnFila(registrarSplitEnFila(state.career.registro), state.career.jerarquia),
        state.career.contrato.salarioAnualUSD
      )
    }
  };
  const stConArraigo = conArraigoDelSplit(stConRegistro, rng);

  const r = BALANCE.roster;
  const logs = [];
  let { companeros, sinergia } = stConArraigo.career;

  // K2b: en una liga modelada los compañeros son los del plantel vivo — el
  // roster cambia cuando cambia el plantel, sin dado. Solo donde no hay
  // plantel (tier 3, tier 2 fuera de tu región) cada tanto se va alguien: entra
  // uno nuevo inventado y la quimica vuelve a cero.
  const sincronizado = conPlantillaDelPlantel(stConArraigo);
  if (companerosDelPlantel(stConArraigo, stConArraigo.career.currentOrg)) {
    ({ companeros, sinergia } = sincronizado.state.career);
    logs.push(...sincronizado.logs);
  } else if (chance(r.probCambioDeRoster, rng)) {
    const org = orgActual(stConArraigo);
    const saliente = pick(companeros, rng);
    const usados = new Set(companeros.map((companero) => companero.handle));
    const entrante = {
      handle: generarHandle(rng, usados),
      role: saliente.role,
      nivel: Math.round(clampStat(gauss(org?.fuerza ?? saliente.nivel, r.nivelCompaneroSpread, rng)))
    };

    companeros = companeros.map((companero) => (companero.handle === saliente.handle ? entrante : companero));
    sinergia = clampStat(sinergia * r.sinergiaRetenidaAlCambiar);
    logs.push(crearLog('roster', `${saliente.handle} se va del equipo y entra ${entrante.handle}. Hay que volver a construir todo.`));
  }

  // La quimica sube sola con los splits juntos, con techo.
  const nuevaSinergia = clampStat(
    sinergia + (r.sinergiaObjetivo - sinergia) * r.sinergiaVelocidad + gauss(0, r.sinergiaRuido, rng)
  );

  return {
    state: { ...stConArraigo, career: { ...stConArraigo.career, companeros, sinergia: Math.round(nuevaSinergia) } },
    logs
  };
}
