import { gauss, chance, pick } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { clampStat } from '../core/numeros.js';
import { generarHandle } from '../core/mundo.js';
import { orgDeCarrera } from '../core/competicion.js';
import { BALANCE } from '../data/balance.js';
import { IDS_ROL, etiquetaRol } from '../data/roles.js';

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

function armarRoster(state, rng) {
  const r = BALANCE.roster;
  const org = orgActual(state);

  if (!org) {
    return { state, logs: [] };
  }

  // Al cambiar de equipo la jerarquia se resetea parcialmente: lo que ganaste
  // en otro vestuario vale, pero no tanto como creias.
  const jerarquiaPrevia = state.career.jerarquia * r.jerarquiaRetenidaAlCambiar;
  const jerarquia = clampStat(Math.max(jerarquiaPrevia, gauss(r.jerarquiaInicial, r.jerarquiaInicialSpread, rng)));
  const sinergia = clampStat(
    Math.max(state.career.sinergia * r.sinergiaRetenidaAlCambiar, gauss(r.sinergiaInicial, r.sinergiaInicialSpread, rng))
  );

  const companeros = generarCompaneros(state, org, rng);

  return {
    state: {
      ...state,
      career: { ...state.career, companeros, jerarquia: Math.round(jerarquia), sinergia: Math.round(sinergia), rosterDeOrg: org.nombre }
    },
    logs: [crearLog(
      'roster',
      `Vestuario de ${org.nombre}: ${companeros.map((c) => `${c.handle} (${etiquetaRol(c.role)})`).join(', ')}. `
      + `Entrás como uno más: jerarquía ${Math.round(jerarquia)}.`
    )]
  };
}

export function aplicar(state, rng) {
  if (state.phase !== 'profesional' || !state.career.currentOrg) {
    return { state, logs: [] };
  }

  // Roster nuevo: recien fichaste, o cambiaste de equipo.
  if (state.career.rosterDeOrg !== state.career.currentOrg) {
    return armarRoster(state, rng);
  }

  const r = BALANCE.roster;
  const logs = [];
  let { companeros, sinergia } = state.career;

  // Cada tanto se va alguien: entra uno nuevo y la quimica vuelve a cero.
  if (chance(r.probCambioDeRoster, rng)) {
    const org = orgActual(state);
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
    state: { ...state, career: { ...state.career, companeros, sinergia: Math.round(nuevaSinergia) } },
    logs
  };
}
