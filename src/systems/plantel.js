import { crearLog } from '../core/log.js';
import { roll } from '../core/rng.js';
import { BALANCE } from '../data/balance.js';
import { esCierreDeEdad } from './edadCierre.js';
import {
  usadosDePlanteles, envejecerNpc, seVaDelMundo, generarCanterano,
  fuerzaDePlantel, ligasConPlantel
} from '../core/plantel.js';
import { IDS_ROL } from '../data/roles.js';
import { plural } from '../core/formato.js';

// EL MUNDO ENVEJECE — el offseason de la etapa amateur (fase 9M / 9Mc).
//
// Corre SOLO en el offseason (cierre de edad): envejece a cada NPC un año,
// mueve su nivel por la curva, descuenta un año de contrato (y renueva en su org
// al que se le venció), retira al que nadie quiere y sube un canterano a cubrir el asiento. Al final recalcula
// `org.fuerza` desde el plantel.
//
// Fase 9Mc: en la etapa PROFESIONAL este trabajo lo hace `core/mercadoMundial.js`
// (llamado desde `systems/mercado.js`, más arriba en el split) ANTES de la
// pantalla de mercado — la resolución top-down con nombres. Este sistema queda
// como el envejecedor de la etapa amateur, donde el mercado del jugador todavía
// no corre y el mundo tiene que moverse igual; si `mercadoMundial` ya resolvió
// este año, hace un early return.
//
// Regla de proceso 10 / trampa T1: los ~2 de cada 3 splits que no son de cierre
// de edad no le cuestan un `rng()` a este sistema. Va ÚLTIMO en `ETAPAS_SPLIT`.

export const id = 'plantel';

function envejecerEnSitio(state, rng) {
  const usados = usadosDePlanteles(state);
  const planteles = {};
  const cambiosPorOrg = new Map();

  for (const [orgNombre, plantel] of Object.entries(state.mundo.planteles)) {
    const liga = state.mundo.ligas.find((candidata) => candidata.orgs.some((org) => org.nombre === orgNombre));
    const orgActual = liga?.orgs.find((org) => org.nombre === orgNombre);
    const fuerzaOrg = orgActual?.fuerza ?? fuerzaDePlantel(plantel);

    const nuevo = {};
    let bajas = 0;
    for (const rol of IDS_ROL) {
      const envejecido = envejecerNpc(plantel[rol], rng);
      if (!envejecido.esJugador && seVaDelMundo(envejecido, fuerzaOrg)) {
        nuevo[rol] = liga ? generarCanterano(rng, { rol, liga, fuerzaOrg, usados }) : envejecido;
        if (liga) bajas += 1;
      } else if (!envejecido.esJugador && envejecido.contrato.anios <= 0) {
        // Revisión de K5: el que se queda renueva en su org (contrato fresco, como en `mercadoMundial`). Sin esto, en
        // una carrera que nunca llega a profesional (el mercado del mundo no corre) todos los contratos del mundo
        // decaían a 0 y quedaban ahí: seed 8 terminó `no_llego` con el 19% de los NPC con contrato vigente.
        nuevo[rol] = { ...envejecido, contrato: { ...envejecido.contrato, anios: roll(BALANCE.plantel.contratoAniosMin, BALANCE.plantel.contratoAniosMax, rng) } };
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
    ? [crearLog('mercado', `Movimiento de pretemporada en el mundo: ${totalBajas} ${plural(totalBajas, 'relevo', 'relevos')} de la academia en ${cambiosPorOrg.size} ${plural(cambiosPorOrg.size, 'organización', 'organizaciones')}.`, { tecnico: true })]
    : [];

  return { state: { ...state, mundo: { ...state.mundo, planteles, ligas } }, logs };
}

export function aplicar(state, rng) {
  // Regla 10: fuera del offseason, cero `rng`. `splitCount === 0` es el mundo
  // recién generado — no hay nada que envejecer todavía.
  if (state.player.splitCount === 0 || !esCierreDeEdad(state) || !state.mundo.planteles) {
    return { state, logs: [] };
  }
  // Fase 9Mc: `core/mercadoMundial.js` ya envejeció y resolvió el mundo este
  // offseason (etapa profesional). No se toca de nuevo.
  if (state.mundo.mercadoPretemporada?.anio === state.calendario.anio) {
    return { state, logs: [] };
  }
  return envejecerEnSitio(state, rng);
}
