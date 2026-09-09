import { roll, chance } from './rng.js';
import { crearLog } from './log.js';
import { BALANCE } from '../data/balance.js';
import { etiquetaRol, IDS_ROL } from '../data/roles.js';
import {
  usadosDePlanteles, envejecerNpc, generarCanterano, fuerzaDePlantel, ligasConPlantel
} from './plantel.js';
import {
  clasificarAsientoNpc, mejorCandidatoParaAsiento, ofertaPosible
} from './demanda.js';

const PRESTIGIO_POR_DEFECTO = BALANCE.mercado.nivelLigaPorDefecto;

// ALGUIEN MÁS QUIERE TU ASIENTO (fase 9M, PLAN.md §9M.4).
//
// Cada pretemporada, ANTES de mostrarle nada al jugador, el mercado del mundo se
// resuelve por rondas de arriba hacia abajo: las orgs más fuertes eligen primero
// y cada una toma el mejor candidato que puede pagar y que las cuotas permiten.
// Los asientos donde el jugador califica quedan CONGELADOS hasta que responda; si
// los rechaza, se cierran con un NPC y el log lo dice con nombre.
//
// Reemplaza, para la etapa profesional, el envejecimiento en sitio de
// `systems/plantel.js` (que queda para la etapa amateur). Toma `rng` por
// parámetro: es determinista dado el estado y la seed. Trampa T1/D35: corre el
// stream de RNG cada offseason — ninguna seed anterior a 9Mc reproduce su
// carrera; el determinismo intra-versión queda intacto.

function indiceOrgLiga(ligas) {
  const orgLiga = new Map();
  for (const liga of ligas) {
    for (const org of liga.orgs) {
      orgLiga.set(org.nombre, liga);
    }
  }
  return orgLiga;
}

// Pasada 1: envejece cada casilla, la clasifica, y separa lo que queda en juego.
// `congelar(org, rol)` decide si un asiento se reserva para el jugador.
function envejecerYClasificar(state, rng, congelar) {
  const d = BALANCE.demanda;
  const p = BALANCE.plantel;
  const orgLiga = indiceOrgLiga(state.mundo.ligas);

  const planteles = {};
  const pool = [];        // agentes libres: { npc, origen }
  const abiertos = [];    // asientos a llenar top-down: { orgNombre, ligaId, rol, fuerzaOrg }
  const congelados = [];  // { org, liga, rol } — el jugador califica, se esperan

  for (const [orgNombre, plantel] of Object.entries(state.mundo.planteles)) {
    const liga = orgLiga.get(orgNombre);
    if (!liga) {
      planteles[orgNombre] = plantel;
      continue;
    }
    const org = liga.orgs.find((candidata) => candidata.nombre === orgNombre);
    const fuerzaOrg = org?.fuerza ?? fuerzaDePlantel(plantel);

    const nuevo = {};
    for (const rol of IDS_ROL) {
      const npc = plantel[rol];

      // La casilla del jugador: sólo envejece, nunca se disputa ni se llena.
      if (npc.esJugador) {
        nuevo[rol] = npc;
        continue;
      }

      const envejecido = envejecerNpc(npc, rng);
      const clase = clasificarAsientoNpc(envejecido, fuerzaOrg);

      // Un rival de generación (D8) corre una carrera larga y estable en su org
      // — `orgDelRival` (temporada.js) lo ancla ahí por hash del handle para el
      // `stakes: rival_de_generacion`. No se va al mercado; sólo su asiento se
      // abre cuando por fin se retira (de viejo).
      if (envejecido.rivalDeGeneracion) {
        if (clase === 'retiro') {
          nuevo[rol] = null;
          abiertos.push({ orgNombre, ligaId: liga.id, rol, fuerzaOrg });
        } else if (clase === 'firme') {
          nuevo[rol] = envejecido;
        } else {
          nuevo[rol] = { ...envejecido, contrato: { ...envejecido.contrato, anios: roll(p.contratoAniosMin, p.contratoAniosMax, rng) } };
        }
        continue;
      }

      // ¿Se reserva para el jugador? Se chequea ANTES del `firme`: un asiento
      // `porMerito` (el jugador supera claramente al titular) se congela aunque
      // el titular tenga contrato — es la vía por la que sube una franquicia
      // (9R0e / 9Md). También el del que se retira ("se les va X, 27").
      if (congelar(orgNombre, rol)) {
        nuevo[rol] = envejecido;   // el incumbente sigue: `asientoAbierto` queda true
        congelados.push({ org: orgNombre, liga: liga.id, rol });
        continue;
      }

      if (clase === 'firme') {
        nuevo[rol] = envejecido;
        continue;
      }

      if (clase === 'retiro') {
        nuevo[rol] = null;
        abiertos.push({ orgNombre, ligaId: liga.id, rol, fuerzaOrg });
        continue;
      }

      // La mayoría renueva en su org (contrato fresco). Sale al mercado con
      // probabilidad baja — más alta si viene flojo (la org busca upgrade).
      const probSalir = clase === 'flojo' ? d.probNoRenovarNpcFlojo : d.probNoRenovarNpc;
      if (!chance(probSalir, rng)) {
        nuevo[rol] = { ...envejecido, contrato: { ...envejecido.contrato, anios: roll(p.contratoAniosMin, p.contratoAniosMax, rng) } };
        continue;
      }
      pool.push({ npc: envejecido, origen: orgNombre });
      nuevo[rol] = null;
      abiertos.push({ orgNombre, ligaId: liga.id, rol, fuerzaOrg });
    }
    planteles[orgNombre] = nuevo;
  }

  return { planteles, pool, abiertos, congelados };
}

// Pasada 2: las orgs con asiento abierto eligen de arriba hacia abajo. Cada una
// toma del pool al de mayor nivel que puede pagar y que las cuotas permiten; si
// el pool no da, sube un canterano. Contrato fresco en cada firma.
function resolverRondas(state, rng, { planteles, pool, abiertos }) {
  const p = BALANCE.plantel;
  const usados = usadosDePlanteles(state);
  for (const plantel of Object.values(planteles)) {
    for (const npc of Object.values(plantel)) {
      if (npc?.handle) usados.add(npc.handle);
    }
  }
  const ligaPorId = new Map(state.mundo.ligas.map((liga) => [liga.id, liga]));

  const porOrg = new Map();
  for (const asiento of abiertos) {
    if (!porOrg.has(asiento.orgNombre)) {
      porOrg.set(asiento.orgNombre, { fuerzaOrg: asiento.fuerzaOrg, ligaId: asiento.ligaId, roles: [] });
    }
    porOrg.get(asiento.orgNombre).roles.push(asiento.rol);
  }

  const ordenadas = [...porOrg.entries()].sort((a, b) => b[1].fuerzaOrg - a[1].fuerzaOrg);
  const traspasos = [];

  for (const [orgNombre, info] of ordenadas) {
    const liga = ligaPorId.get(info.ligaId);
    const plantel = planteles[orgNombre];
    for (const rol of info.roles) {
      const elegido = mejorCandidatoParaAsiento(pool, { liga, fuerzaOrg: info.fuerzaOrg, plantel, rol });
      let npcFinal;
      let desde;
      if (elegido) {
        pool.splice(pool.indexOf(elegido), 1);
        desde = elegido.origen === orgNombre ? 'renueva' : 'libre';
        npcFinal = {
          ...elegido.npc,
          role: rol,
          contrato: { ...elegido.npc.contrato, anios: roll(p.contratoAniosMin, p.contratoAniosMax, rng) }
        };
      } else {
        npcFinal = generarCanterano(rng, { rol, liga, fuerzaOrg: info.fuerzaOrg, usados, prestigioPorDefecto: PRESTIGIO_POR_DEFECTO });
        desde = 'cantera';
      }
      plantel[rol] = npcFinal;

      if (desde !== 'renueva') {
        const verbo = desde === 'cantera' ? 'sube al canterano' : 'firma a';
        traspasos.push({
          org: orgNombre, liga: info.ligaId, rol,
          handle: npcFinal.handle, edad: npcFinal.edad, desde,
          motivo: `${orgNombre} ${verbo} ${npcFinal.handle} (${etiquetaRol(rol)}, ${npcFinal.edad})`
        });
      }
    }
  }

  return traspasos;
}

function conFuerzasRecalculadas(state, planteles) {
  return state.mundo.ligas.map((liga) => {
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
}

// Resuelve el mercado del mundo de esta pretemporada. `vaAlMercado` es true
// cuando el jugador realmente va a elegir este offseason (contrato vencido o sin
// equipo): sólo entonces se congelan asientos para él. Fase 9Md: los asientos
// que se congelan son de las 6 ligas tier 1 + tu tier 2, no sólo tu liga.
export function resolverMercadoMundial(state, rng, { vaAlMercado }) {
  if (state.player.splitCount === 0 || !state.mundo.planteles) {
    return { state, logs: [] };
  }

  const esPro = state.phase === 'profesional';
  const currentOrg = state.career.currentOrg;
  const rol = state.player.role;

  const congelar = (orgNombre, asientoRol) => (
    esPro && vaAlMercado
    && asientoRol === rol
    && orgNombre !== currentOrg
    && ofertaPosible(state, orgNombre, asientoRol).posible
  );

  const clasificado = envejecerYClasificar(state, rng, congelar);
  const traspasos = resolverRondas(state, rng, clasificado);
  const { planteles, pool, congelados } = clasificado;

  const ligas = conFuerzasRecalculadas(state, planteles);

  const libresRestantes = pool
    .slice()
    .sort((a, b) => b.npc.nivel - a.npc.nivel)
    .slice(0, BALANCE.demanda.libresRestantesMax)
    .map((entrada) => entrada.npc);

  const mercadoPretemporada = {
    anio: state.calendario.anio,
    traspasos,
    congelados,
    libresRestantes
  };

  const logs = traspasos.length > 0
    ? [crearLog('mercado', `El mercado se movió: ${traspasos.length} fichaje(s) en el mundo esta pretemporada.`, { tecnico: true })]
    : [];

  return {
    state: { ...state, mundo: { ...state.mundo, planteles, ligas, mercadoPretemporada } },
    logs
  };
}

// El jugador respondió (firmó con `orgFirmada`, o `null` si se quedó libre). Los
// asientos congelados que no tomó se cierran con un NPC: el mejor de los agentes
// libres que quedaron, o un canterano. `orgsOfrecidas` son las orgs que de
// verdad aparecieron como tarjeta lateral: sólo ésas dan el log "X firmó a Y …
// para el puesto que te ofrecían" (el resto — congelados que el sesgo etario
// dejó fuera de la mano — se llenan en silencio; nadie te ofreció nada ahí).
export function cerrarAsientosCongelados(state, orgFirmada, rng, orgsOfrecidas = null) {
  const pre = state.mundo.mercadoPretemporada;
  if (!pre || !pre.congelados || pre.congelados.length === 0) {
    return { state, logs: [] };
  }

  const orgLiga = indiceOrgLiga(state.mundo.ligas);
  const usados = usadosDePlanteles(state);
  const pool = (pre.libresRestantes ?? []).map((npc) => ({ npc }));
  const planteles = { ...state.mundo.planteles };
  const traspasos = [...pre.traspasos];
  const logs = [];

  for (const asiento of pre.congelados) {
    if (asiento.org === orgFirmada) {
      continue;
    }
    const liga = orgLiga.get(asiento.org);
    const org = liga?.orgs.find((candidata) => candidata.nombre === asiento.org);
    if (!liga || !org) {
      continue;
    }
    const plantel = { ...planteles[asiento.org] };
    const elegido = mejorCandidatoParaAsiento(pool, { liga, fuerzaOrg: org.fuerza, plantel, rol: asiento.rol });
    let npcFinal;
    if (elegido) {
      pool.splice(pool.indexOf(elegido), 1);
      npcFinal = {
        ...elegido.npc,
        role: asiento.rol,
        contrato: { ...elegido.npc.contrato, anios: roll(BALANCE.plantel.contratoAniosMin, BALANCE.plantel.contratoAniosMax, rng) }
      };
    } else {
      npcFinal = generarCanterano(rng, { rol: asiento.rol, liga, fuerzaOrg: org.fuerza, usados, prestigioPorDefecto: PRESTIGIO_POR_DEFECTO });
      usados.add(npcFinal.handle);
    }
    plantel[asiento.rol] = npcFinal;
    planteles[asiento.org] = plantel;
    const teOfrecian = orgsOfrecidas ? orgsOfrecidas.has(asiento.org) : false;
    traspasos.push({
      org: asiento.org, liga: asiento.liga, rol: asiento.rol,
      handle: npcFinal.handle, edad: npcFinal.edad, desde: elegido ? 'libre' : 'cantera',
      motivo: `${asiento.org} firma a ${npcFinal.handle} (${etiquetaRol(asiento.rol)}, ${npcFinal.edad})${teOfrecian ? ' para el puesto que te ofrecían' : ''}`
    });
    if (teOfrecian) {
      logs.push(crearLog('mercado', `${asiento.org} firmó a ${npcFinal.handle} (${etiquetaRol(asiento.rol)}, ${npcFinal.edad}) para el puesto que te ofrecían.`));
    }
  }

  const ligas = conFuerzasRecalculadas({ ...state, mundo: { ...state.mundo, planteles } }, planteles);

  return {
    state: {
      ...state,
      mundo: {
        ...state.mundo, planteles, ligas,
        mercadoPretemporada: { anio: pre.anio, traspasos, congelados: [], libresRestantes: [] }
      }
    },
    logs
  };
}
