import { BALANCE } from '../data/balance.js';
import { splitsDeResidencia, valorDeMercado } from './valorMercado.js';
import { nivelDelJugador } from './ficha.js';
import { etiquetaRol } from '../data/roles.js';
import { plata } from './formato.js';
import { seVaDelMundo } from './plantel.js';

// LA DEMANDA EXISTE (fase 9M, PLAN.md §9M.3): se acabó el `roll(0, techo)`.
//
// Una oferta deja de ser un dado y pasa a ser una consecuencia legible del
// mundo: una org te llega SI tiene un asiento abierto en tu rol, tu nivel entra
// en su banda, te puede pagar, y las cuotas de import lo permiten. El número de
// ofertas es cuántas orgs cumplen eso, no una tirada.
//
// Puro y SIN rng: es una lectura del estado (los planteles de 9Ma), no una
// negociación. El ruido de la negociación sigue en `salarioDeOferta`.

function ligaDeOrg(state, orgNombre) {
  return state.mundo.ligas.find((liga) => liga.orgs.some((org) => org.nombre === orgNombre)) ?? null;
}

function orgDe(state, orgNombre) {
  const liga = ligaDeOrg(state, orgNombre);
  return liga?.orgs.find((org) => org.nombre === orgNombre) ?? null;
}

// ¿Es residente de esta región? Reusa `splitsDeResidencia` (core/valorMercado.js,
// que ya lo deriva de `career.registro.porOrg`) contra el umbral de la fase 9.
export function esResidenteDe(state, regionId) {
  return splitsDeResidencia(state, regionId) >= BALANCE.mercado.valorResidenciaSplits;
}

// La residencia del jugador respecto de una liga: 'local' si es su región de
// origen, 'residente' si acumuló residencia en otra, 'import' si recién llega.
// Es lo que `core/contexto.js` escribe en el eje `residencia` (D29: dejaba de
// ser el literal 'local' fijo).
export function residenciaEn(state, regionId) {
  if (!regionId || regionId === state.mundo.regionIdOrigen) {
    return 'local';
  }
  return esResidenteDe(state, regionId) ? 'residente' : 'import';
}

// ¿Esta org tiene un asiento abierto en `rol`? Sí si el NPC de ese rol tiene
// contrato vencido, si su nivel cayó por debajo de lo que la org sostiene, o si
// VOS sos claramente mejor que él — un club banca a su titular para ficharte
// (9R0e: el silencio de mercado no es para una franquicia). Devuelve bool +
// motivo legible.
export function asientoAbierto(state, orgNombre, rol) {
  const plantel = state.mundo.planteles?.[orgNombre];
  if (!plantel) {
    return { abierto: false };
  }
  const npc = plantel[rol];
  const org = orgDe(state, orgNombre);
  const fuerza = org?.fuerza ?? 0;
  const d = BALANCE.demanda;

  if (npc.contrato.anios <= 0) {
    return { abierto: true, motivo: `se les va ${npc.handle}, ${npc.edad}` };
  }
  if (npc.nivel < fuerza - d.brechaReemplazo) {
    return { abierto: true, motivo: `${npc.handle} viene rindiendo por debajo` };
  }
  // `porMerito`: el asiento se abre porque VOS sos mejor que su titular. Una org
  // que te quiere por eso también acepta pagarte por encima de su banda
  // habitual (`ofertaPosible` salta el techo de banda en ese caso).
  if (nivelDelJugador(state) > npc.nivel + d.forzarAsientoSobreNpc) {
    return { abierto: true, porMerito: true, motivo: `mejorás claramente sobre ${npc.handle}` };
  }
  return { abierto: false };
}

// Lo que una org puede pagar por un asiento: su presupuesto (orbita la mediana
// de su liga y su propia fuerza) menos lo que ya gasta en los otros cuatro. Puro
// y sin estado — `mercadoMundial.js` (9Mc) lo llama sobre planteles a medio
// armar (casillas `null` mientras se resuelve la ronda) y por eso ignora lo que
// no es un NPC con contrato.
export function presupuestoDeAsiento(liga, fuerzaOrg, plantel, rol) {
  const d = BALANCE.demanda;
  const presupuestoTotal = liga.salario.medianaUSD * d.presupuestoOrgFactor
    * (1 + (fuerzaOrg / BALANCE.stats.max - 0.5) * d.presupuestoPorFuerza);
  const yaGasta = Object.entries(plantel)
    .filter(([r, npc]) => r !== rol && npc && !npc.esJugador)
    .reduce((suma, [, npc]) => suma + (npc.contrato?.salarioAnualUSD ?? 0), 0);
  return Math.max(0, Math.round(presupuestoTotal - yaGasta));
}

// El presupuesto de la org de `orgNombre` para su asiento de `rol`, leído del
// estado (planteles de 9Ma).
export function presupuestoParaAsiento(state, orgNombre, rol) {
  const plantel = state.mundo.planteles?.[orgNombre];
  const org = orgDe(state, orgNombre);
  const liga = ligaDeOrg(state, orgNombre);
  if (!plantel || !org || !liga) {
    return 0;
  }
  return presupuestoDeAsiento(liga, org.fuerza, plantel, rol);
}

// --- Fase 9Mc: la resolución del mercado del mundo ---
//
// En qué estado está el asiento de un NPC al abrir el offseason. `mercadoMundial.js`
// lo llama sobre el NPC YA envejecido (contrato descontado). Puro.
export function clasificarAsientoNpc(npc, fuerzaOrg) {
  if (seVaDelMundo(npc, fuerzaOrg)) {
    return 'retiro';
  }
  if (npc.contrato.anios > 0) {
    return 'firme';
  }
  if (npc.nivel < fuerzaOrg - BALANCE.demanda.brechaReemplazo) {
    return 'flojo';
  }
  return 'vencido';
}

// Las reglas DURAS de una liga aplicadas a un NPC candidato: edad mínima y
// cuotas de import. `plantel` es la casilla-a-casilla YA en construcción (puede
// traer `null`). Es la versión NPC de `cumpleReglasDuras` (que mira al jugador).
export function cumpleReglasDurasNpc(npc, liga, rol, plantel) {
  if (npc.edad < (liga.edadMinima ?? 0)) {
    return false;
  }
  if (npc.regionId !== liga.regionId) {
    const otrosImports = Object.entries(plantel)
      .filter(([r, x]) => r !== rol && x && !x.esJugador && x.regionId !== liga.regionId)
      .length;
    if (otrosImports + 1 > (liga.cupoImports ?? 99)) {
      return false;
    }
    if (BALANCE.plantel.tamano - (otrosImports + 1) < (liga.minimoResidentes ?? 0)) {
      return false;
    }
  }
  return true;
}

// De un pool de agentes libres, el mejor que una org puede fichar para `rol`:
// el de mayor nivel que entra en el presupuesto y que las cuotas permiten.
// Puro: no muta el pool. Devuelve la entrada `{ npc, origen }` o `null`.
export function mejorCandidatoParaAsiento(pool, { liga, fuerzaOrg, plantel, rol }) {
  const presupuesto = presupuestoDeAsiento(liga, fuerzaOrg, plantel, rol);
  let mejor = null;
  for (const entrada of pool) {
    const { npc } = entrada;
    if ((npc.contrato?.salarioAnualUSD ?? 0) > presupuesto) {
      continue;
    }
    if (!cumpleReglasDurasNpc(npc, liga, rol, plantel)) {
      continue;
    }
    if (!mejor || npc.nivel > mejor.npc.nivel) {
      mejor = entrada;
    }
  }
  return mejor;
}

// Cuántos no residentes quedarían en el plantel de `orgNombre` si te firman
// para `rol`. Los NPCs de un plantel se generan como locales de su región, así
// que hoy este número es ~el jugador si es import; carga real desde 9Md.
function noResidentesTrasFichar(state, orgNombre, rol, liga, jugadorEsResidente) {
  const plantel = state.mundo.planteles[orgNombre];
  const npcsNoResidentes = Object.entries(plantel)
    .filter(([r, npc]) => r !== rol && npc.regionId !== liga.regionId)
    .length;
  return npcsNoResidentes + (jugadorEsResidente ? 0 : 1);
}

// Las reglas DURAS de una liga: edad mínima y cuotas de import. No las salta
// nadie —ni la demanda, ni el piso de franquicia (9R0e), ni un ascenso—.
export function cumpleReglasDuras(state, org, liga, rol) {
  if (state.age < (liga.edadMinima ?? 0)) {
    return { ok: false, motivo: `no llegás a la edad mínima de ${liga.id}` };
  }
  if (residenciaEn(state, liga.regionId) === 'import') {
    const noResidentes = noResidentesTrasFichar(state, org.nombre, rol, liga, false);
    if (noResidentes > (liga.cupoImports ?? 99)) {
      return { ok: false, motivo: `${liga.id} ya tiene el cupo de imports lleno` };
    }
    if (BALANCE.plantel.tamano - noResidentes < (liga.minimoResidentes ?? 0)) {
      return { ok: false, motivo: `${liga.id} necesita más residentes en el roster` };
    }
    // Fase 9Md: el listón para un import escala con `dificultadAdaptacion` — a
    // LCK/LPL hay que ser mucho mejor que el local; a CBLOL/LCS, apenas.
    const margenImport = BALANCE.mercado.margenImport
      * (1 + (liga.dificultadAdaptacion ?? 50) / 100 * BALANCE.mercado.factorDificultadImport);
    if (nivelDelJugador(state) < org.fuerza + margenImport) {
      return { ok: false, motivo: `como import a ${liga.id} no alcanza con estar apenas mejor` };
    }
  }
  return { ok: true };
}

// ¿Puede esta org fichar al jugador para ese asiento? bool + motivo legible.
// Es donde se enciende TODO lo que hoy está muerto en los datos: `edadMinima`,
// `cupoImports`, `minimoResidentes`, `margenImport`.
//
// `forzada`: el piso de franquicia (9R0e) salta el asiento, el presupuesto y la
// banda —un club se estira por una estrella— pero NUNCA las reglas duras.
export function ofertaPosible(state, orgNombre, rol, { forzada = false } = {}) {
  const asiento = forzada ? { abierto: true, porMerito: true, motivo: 'te hacen lugar en el roster' } : asientoAbierto(state, orgNombre, rol);
  if (!asiento.abierto) {
    return { posible: false };
  }

  const org = orgDe(state, orgNombre);
  const liga = ligaDeOrg(state, orgNombre);
  if (!org || !liga) {
    return { posible: false };
  }

  const dura = cumpleReglasDuras(state, org, liga, rol);
  if (!dura.ok) {
    return { posible: false, motivo: dura.motivo };
  }

  if (forzada) {
    return { posible: true, presupuesto: presupuestoParaAsiento(state, orgNombre, rol), motivo: `${org.nombre} te hace lugar en el roster` };
  }

  const d = BALANCE.demanda;
  const nivel = nivelDelJugador(state);
  const valor = valorDeMercado(state);

  // Banda de nivel: una org no ficha muy por debajo de su fuerza. El techo de
  // banda (no pagar muy por encima de lo que sostiene) NO aplica cuando te
  // quieren por mérito: ahí el club se estira por una estrella.
  if (nivel < org.fuerza - d.bandaNivelAbajo) {
    return { posible: false };
  }
  if (!asiento.porMerito && nivel > org.fuerza + d.bandaNivelArriba) {
    return { posible: false };
  }

  // Presupuesto ≥ tu valor de mercado (las cuotas de import ya las cubrió
  // `cumpleReglasDuras` más arriba).
  const presupuesto = presupuestoParaAsiento(state, orgNombre, rol);
  if (presupuesto < valor * d.presupuestoMinimoFactor) {
    return { posible: false, motivo: `${org.nombre} no te puede pagar` };
  }

  return {
    posible: true,
    presupuesto,
    motivo: `${org.nombre} busca ${etiquetaRol(rol)} (${asiento.motivo}) y te puede pagar hasta ${plata(presupuesto)}`
  };
}

// Todas las orgs del mundo (las 6 ligas tier 1 + tu tier 2 — las que tienen
// plantel) con un asiento que el jugador puede ocupar hoy. Es lo que reemplaza
// al `roll(0, techo)` en `systems/mercado.js`.
//
// Fase 9Md: antes recibía UNA liga (tu liga era una jaula). Ahora escanea el
// mundo entero: subís a tier 1 porque un club de cualquiera de las 6 tiene
// hueco en tu rol y te puede pagar, no porque salió un dado.
export function orgsQueTeFicharian(state) {
  const rol = state.player.role;
  const entradas = [];
  for (const liga of state.mundo.ligas) {
    for (const org of liga.orgs) {
      if (org.nombre === state.career.currentOrg) {
        continue;
      }
      if (!state.mundo.planteles?.[org.nombre]) {
        continue;
      }
      const res = ofertaPosible(state, org.nombre, rol);
      if (res.posible) {
        entradas.push({ org, liga, ...res });
      }
    }
  }
  return entradas;
}
