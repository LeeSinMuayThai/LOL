import { BALANCE } from '../data/balance.js';
import { splitsDeResidencia, valorDeMercado } from './valorMercado.js';
import { nivelDelJugador } from './ficha.js';
import { etiquetaRol } from '../data/roles.js';
import { plata } from './formato.js';

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

// Lo que la org puede pagar por ese asiento: su presupuesto (orbita la mediana
// de su liga y su propia fuerza) menos lo que ya gasta en los cuatro que se
// quedan.
export function presupuestoParaAsiento(state, orgNombre, rol) {
  const plantel = state.mundo.planteles?.[orgNombre];
  const org = orgDe(state, orgNombre);
  const liga = ligaDeOrg(state, orgNombre);
  if (!plantel || !org || !liga) {
    return 0;
  }
  const d = BALANCE.demanda;
  const presupuestoTotal = liga.salario.medianaUSD * d.presupuestoOrgFactor
    * (1 + (org.fuerza / BALANCE.stats.max - 0.5) * d.presupuestoPorFuerza);
  const yaGasta = Object.entries(plantel)
    .filter(([r]) => r !== rol)
    .reduce((suma, [, npc]) => suma + npc.contrato.salarioAnualUSD, 0);
  return Math.max(0, Math.round(presupuestoTotal - yaGasta));
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
    if (nivelDelJugador(state) < org.fuerza + BALANCE.mercado.margenImport) {
      return { ok: false, motivo: `como import no alcanza con estar apenas mejor` };
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

// Las orgs de una liga con un asiento que el jugador puede ocupar hoy. Es lo
// que reemplaza al `roll(0, techo)` en `systems/mercado.js`.
export function orgsQueTeFicharian(state, liga) {
  const rol = state.player.role;
  return liga.orgs
    .filter((org) => org.nombre !== state.career.currentOrg)
    .map((org) => ({ org, ...ofertaPosible(state, org.nombre, rol) }))
    .filter((entrada) => entrada.posible);
}
