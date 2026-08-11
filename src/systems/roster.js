import { gauss, chance, pick } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { clampStat, clamp } from '../core/numeros.js';
import { generarHandle } from '../core/mundo.js';
import { orgDeCarrera } from '../core/competicion.js';
import {
  abrirFila, registrarSplitEnFila, registrarJerarquiaEnFila, registrarArraigoEnFila,
  registrarPico, registrarSalarioEnFila, arraigoInicial
} from '../core/registro.js';
import { BALANCE } from '../data/balance.js';
import { ROLES, IDS_ROL, etiquetaRol } from '../data/roles.js';

export const id = 'roster';

// Sea tier 1, 2 o 3: `orgDeCarrera` sabe dónde buscar en cada caso (fase 3).
const orgActual = orgDeCarrera;

function generarCompaneros(state, org, rng) {
  const usados = new Set(state.career.companeros.map((companero) => companero.handle));

  return IDS_ROL.filter((rol) => rol !== state.player.role).map((rol) => ({
    handle: generarHandle(rng, usados),
    role: rol,
    nivel: Math.round(clampStat(gauss(org.fuerza, BALANCE.roster.nivelCompaneroSpread, rng)))
  }));
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
  const sinergia = clampStat(
    Math.max(state.career.sinergia * r.sinergiaRetenidaAlCambiar, gauss(r.sinergiaInicial, r.sinergiaInicialSpread, rng))
  );

  const companeros = generarCompaneros(state, org, rng);
  const jerarquiaRedondeada = Math.round(jerarquia);

  // Fase 8: se abre la fila de esta org en el registro (regla de proceso 14:
  // el registro solo crece — `competitivo.js`/`mercado.js` ya cerró la fila
  // anterior, si había una, antes de cambiar `currentOrg`). El split en que
  // fichás cuenta como jugado ahí. Fase 9: el sueldo del contrato vigente
  // (0 en tier 3, donde el mercado todavía no existe) queda registrado en la
  // fila desde que se abre.
  const registroConFila = registrarSalarioEnFila(
    registrarJerarquiaEnFila(
      registrarSplitEnFila(
        abrirFila(state.career.registro, {
          org: org.nombre, liga: state.career.liga, tier: state.career.tier,
          anio: state.calendario.anio, split: state.player.splitCount
        })
      ),
      jerarquiaRedondeada
    ),
    state.career.contrato.salarioAnualUSD
  );

  // Arraigo (fase 8.4): NUNCA se resetea a 0 a secas — arranca en una
  // fracción del hype que ya tenías ("tu fama te precede", imagen 6 de
  // PLAN.md). El registro guarda el pico independientemente del split-a-split.
  const arraigoNuevo = Math.round(arraigoInicial(state.player.stats.hype));
  const registroConPicos = registrarArraigoEnFila(
    registrarPico(registrarPico(registroConFila, 'jerarquia', jerarquiaRedondeada), 'arraigo', arraigoNuevo),
    arraigoNuevo
  );

  return {
    state: {
      ...state,
      flags: { ...state.flags, bonusJerarquiaTryout: 0, jerarquiaProyectadaAlFichar: null },
      career: {
        ...state.career, companeros, jerarquia: jerarquiaRedondeada, sinergia: Math.round(sinergia),
        rosterDeOrg: org.nombre, arraigo: arraigoNuevo, registro: registroConPicos
      }
    },
    logs: [crearLog(
      'roster',
      `Vestuario de ${org.nombre}: ${companeros.map((c) => `${c.handle} (${etiquetaRol(c.role)})`).join(', ')}. `
      + `Entrás como uno más: jerarquía ${jerarquiaRedondeada}.`
    )]
  };
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

  // Fase 8: mismo equipo que el split pasado — un split más jugado ahí (se
  // suma al global Y a la fila de la org) y el goteo de arraigo de base.
  const stConRegistro = {
    ...state,
    career: {
      ...state.career,
      registro: registrarJerarquiaEnFila(registrarSplitEnFila(state.career.registro), state.career.jerarquia)
    }
  };
  const stConArraigo = conArraigoDelSplit(stConRegistro, rng);

  const r = BALANCE.roster;
  const logs = [];
  let { companeros, sinergia } = stConArraigo.career;

  // Cada tanto se va alguien: entra uno nuevo y la quimica vuelve a cero.
  if (chance(r.probCambioDeRoster, rng)) {
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
