import { gauss, roll } from '../core/rng.js';
import { clampStat } from '../core/numeros.js';
import { crearLog } from '../core/log.js';
import { BALANCE } from '../data/balance.js';
import { esCierreDeEdad } from './edadCierre.js';
import { nivelNpc, generarNpc, fuerzaDePlantel, ligasConPlantel } from '../core/plantel.js';
import { IDS_ROL } from '../data/roles.js';

// EL MUNDO ENVEJECE (fase 9M, PLAN.md §9M.2).
//
// Corre SOLO en el offseason (cierre de edad): envejece a cada NPC un año,
// mueve su nivel por la curva, descuenta un año de contrato, retira al que
// nadie quiere y sube un canterano a cubrir el asiento. Al final recalcula
// `org.fuerza` desde el plantel — desde el año 2, un equipo que renovó bien
// sube de fuerza y te gana la liga el año que viene.
//
// Regla de proceso 10 / trampa T1: los ~11 de cada 12 splits que no son de
// cierre de edad no le cuestan un `rng()` a este sistema. Va ÚLTIMO en
// `ETAPAS_SPLIT`, después de `escena`: el mercado del jugador (más arriba en
// el split) ya se resolvió con la fuerza del año que cierra, y el mundo
// envejecido lo ve la temporada del año que viene.

export const id = 'plantel';

function usadosDe(state) {
  const usados = new Set([state.player.name]);
  for (const plantel of Object.values(state.mundo.planteles ?? {})) {
    for (const npc of Object.values(plantel)) {
      usados.add(npc.handle);
    }
  }
  for (const rival of state.mundo.rivales ?? []) {
    usados.add(rival.handle);
  }
  return usados;
}

function envejecer(npc, rng) {
  const p = BALANCE.plantel;
  const edad = npc.edad + 1;
  const nivelCurva = nivelNpc({ ...npc, edad });
  const nivel = Math.round(clampStat(gauss(nivelCurva, p.ruidoNivelAnual, rng)));
  return {
    ...npc,
    edad,
    nivel,
    contrato: { ...npc.contrato, anios: Math.max(0, npc.contrato.anios - 1) }
  };
}

// ¿Este NPC deja el equipo este offseason? Un rival de generación corre una
// carrera larga (D8): sólo se va de viejo. El resto: contrato vencido, ya pasó
// su pico, y su nivel cayó por debajo del piso de la org — o demasiado viejo.
function seVa(npc, fuerzaOrg) {
  const p = BALANCE.plantel;
  if (npc.rivalDeGeneracion) {
    return npc.edad >= p.retiroEdadDura + p.rivalRetiroExtra;
  }
  if (npc.edad >= p.retiroEdadDura) {
    return true;
  }
  return npc.contrato.anios <= 0
    && npc.edad > npc.edadPico + p.retiroEdadSobrePico
    && npc.nivel < fuerzaOrg - p.retiroNivelBajoOrg;
}

function canterano(rng, rol, liga, fuerzaOrg, usados) {
  const p = BALANCE.plantel;
  return generarNpc(rng, {
    rol,
    regionId: liga.regionId,
    medianaSalarioUSD: liga.salario.medianaUSD,
    usados,
    edad: roll(p.canteraEdadMin, p.canteraEdadMax, rng),
    fuerzaOrg: fuerzaOrg - p.canteraNivelBajoOrg
  });
}

export function aplicar(state, rng) {
  // Regla 10: fuera del offseason, cero `rng`. `splitCount === 0` es el mundo
  // recién generado — no hay nada que envejecer todavía.
  if (state.player.splitCount === 0 || !esCierreDeEdad(state) || !state.mundo.planteles) {
    return { state, logs: [] };
  }

  const usados = usadosDe(state);
  const planteles = {};
  const cambiosPorOrg = new Map();

  for (const [orgNombre, plantel] of Object.entries(state.mundo.planteles)) {
    const liga = state.mundo.ligas.find((candidata) => candidata.orgs.some((org) => org.nombre === orgNombre));
    const orgActual = liga?.orgs.find((org) => org.nombre === orgNombre);
    const fuerzaOrg = orgActual?.fuerza ?? fuerzaDePlantel(plantel);

    const nuevo = {};
    let bajas = 0;
    for (const rol of IDS_ROL) {
      const envejecido = envejecer(plantel[rol], rng);
      if (seVa(envejecido, fuerzaOrg)) {
        nuevo[rol] = liga ? canterano(rng, rol, liga, fuerzaOrg, usados) : envejecido;
        if (liga) bajas += 1;
      } else {
        nuevo[rol] = envejecido;
      }
    }

    planteles[orgNombre] = nuevo;
    if (bajas > 0) {
      cambiosPorOrg.set(orgNombre, bajas);
    }
  }

  // `org.fuerza` deriva del plantel envejecido. Reconstrucción inmutable: sólo
  // las orgs con plantel cambian; el resto de `ligas` viaja por referencia.
  const ligas = state.mundo.ligas.map((liga) => {
    if (!ligasConPlantel([liga], state.mundo.regionIdOrigen).length) {
      return liga;
    }
    return {
      ...liga,
      orgs: liga.orgs.map((org) => (
        planteles[org.nombre] ? { ...org, fuerza: fuerzaDePlantel(planteles[org.nombre]) } : org
      ))
    };
  });

  const totalBajas = [...cambiosPorOrg.values()].reduce((suma, n) => suma + n, 0);
  const logs = totalBajas > 0
    ? [crearLog('plantel', `Movimiento de pretemporada en el mundo: ${totalBajas} relevo(s) de cantera en ${cambiosPorOrg.size} organización(es).`, { tecnico: true })]
    : [];

  return { state: { ...state, mundo: { ...state.mundo, planteles, ligas } }, logs };
}
