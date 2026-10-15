import { chance, weightedPick } from '../core/rng.js';
import { clamp } from '../core/numeros.js';
import { crearLog } from '../core/log.js';
import { elegirOrgTier3, asignarOrgTier3 } from '../core/tier3.js';
import { cerrarFila, filaAbierta } from '../core/registro.js';
import { calcularContexto } from '../core/contexto.js';
import { conPlantelesDe, fuerzaDePlantel } from '../core/plantel.js';
import { BALANCE } from '../data/balance.js';
import { nombreVisibleDeLiga, esLigaFranquiciada } from '../core/ligas.js';
import { nivelDelJugador } from '../core/ficha.js';
import { calibreDeLiga, orgsQueTeFicharian, asientoAbierto, ofertaPosible } from '../core/demanda.js';
import { entero, plata } from '../core/formato.js';
import { etiquetaRol } from '../data/roles.js';
import { construirOferta, aceptarOferta } from './mercado.js';

// El tránsito entre tiers.
//
// Fase 3: tier 3 (equipos inventados, efímeros) se resuelve solo — subís o el
// equipo se disuelve. Fase 9 (§9.4): el mercado decide A QUÉ ORG vas.
//
// Fase 9Md (§9M.5): **la escalera de tier 2 y tier 1 deja de sortearse**. Ya no
// hay "ascenso ganado" — hay asientos (`systems/mercado.js`, que corre justo
// después). Este sistema queda con:
//  - tier 3, que no cambia ("a ese nivel no se negocia"): disolución, re-fichaje,
//    y el salto a tier 2 (que ahora te deja como AGENTE LIBRE de tier 2 — el
//    mercado te ofrece club en la pretemporada).
//  - el DESCENSO de tier 1 (D16): si tu org termina última de una liga con
//    `desciendeA`, baja de categoría y tu contrato viaja con ella; su org tier-2
//    más fuerte de la región promociona a taparla. K6b-F: las ligas
//    franquiciadas (`franquicia` en `data/leagues.json`: LCK, LPL y LEC,
//    CONCEPTO §12.3) no descienden a nadie; su `desciendeA` queda como la liga
//    de desarrollo de la región (de ahí hereda la dificultad, el banquillo).

function conFilaCerrada(state, motivo) {
  return cerrarFila(state.career.registro, {
    anio: state.calendario.anio, split: state.player.splitCount,
    arraigoActual: state.career.arraigo, motivo
  });
}

export const id = 'competitivo';

function ligaTier2DeLaRegion(state) {
  return state.mundo.ligas.find((liga) => liga.tier === 2 && liga.regionId === state.mundo.regionIdOrigen) ?? null;
}

// --- Tier 3: brevedad forzada ---

// Fase 9E (bug D25): `tier` se CONSERVA en 3. Se te disolvió el equipo, no
// dejaste de ser un jugador de tier 3.
function disolverEquipo(state, logsPrevios) {
  return {
    state: {
      ...state,
      career: {
        ...state.career, tier: 3, liga: null, currentOrg: null, rosterDeOrg: null,
        companeros: [], jerarquia: 0, arraigo: 0, sinergia: 0,
        registro: conFilaCerrada(state, 'disolucion')
      }
    },
    logs: [...logsPrevios, crearLog('competitivo', `${state.career.currentOrg} se disuelve. Se acabó ese armado — a buscar otro equipo chico.`)]
  };
}

// Fase 9Md: el salto de tier 3 te deja como AGENTE LIBRE de tier 2 — "deja el
// asiento abierto". La próxima pretemporada el mercado te ofrece club.
// Rama tier3-nivel: `motivo` es la frase que va antes del salto cuando lo explica algo que el jugador tiene que leer (regla 12).
function saltarATier2(state, logsPrevios, motivo = '') {
  const liga = ligaTier2DeLaRegion(state);
  if (!liga) {
    // No debería pasar (las 6 regiones tienen tier 2 en leagues.json).
    return { state, logs: logsPrevios };
  }
  return {
    state: {
      ...state,
      career: {
        ...state.career,
        tier: 2, liga: liga.id, currentOrg: null, rosterDeOrg: null,
        companeros: [], jerarquia: 0, arraigo: 0, sinergia: 0,
        contrato: { ...state.career.contrato, org: null, liga: liga.id, tier: 2, anios: 0, aniosRestantes: 0 },
        registro: conFilaCerrada(state, 'ascenso')
      }
    },
    logs: [...logsPrevios, crearLog('competitivo', `${motivo}Te ganás el salto a ${nombreVisibleDeLiga(liga.id)}. ${saltoAMitadDeAnio(state)
      ? 'Sos agente libre de tier 2.'
      : 'Sos agente libre de tier 2: en la pretemporada elegís club.'}`)]
  };
}

// --- F2 (PLANUI §0.8, "el año muerto"): la llamada de un club de tier 2 en el split del salto ---
//
// El mercado corre solo en la pretemporada (`systems/mercado.js`). Un salto en el segundo o el tercer split del año te
// dejaba agente libre el resto del año, sin club, sin mercado y sin una sola decisión: en las dos carreras jugadas de
// §0.8 el año de los 16 pasó en un clic. Ahora, en ese mismo split, frena la llamada del club de tier 2 de tu región que
// tiene tu rol libre y te puede pagar (`orgsQueTeFicharian`: el asiento abierto, la banda, el presupuesto y la disputa,
// las mismas reglas del mercado; de esos, el que más paga). Firmás ahora (`aceptarOferta`, el contrato de siempre) o
// esperás la pretemporada. Sin club con lugar, la parada igual ocurre y lo dice.
//
// Los asientos: firmar a mitad de año no mueve a nadie del plantel del mundo. Es la misma regla que la firma de la
// pretemporada (`core/mercadoMundial.js`, "el incumbente sigue": tu casilla queda con su NPC, que `companerosDelPlantel`
// nunca cuenta como compañero), así que nadie queda en dos orgs. Tus compañeros los arma `roster.js` el split que viene,
// igual que cuando firmás sin equipo en la pretemporada.
export const MOTIVO_LLAMADA = 'llamada_tier2';

// Solo el split del medio (`regular`). En el de playoffs, el último del año, el contrato "hasta la pretemporada" vencía sin
// jugarse un solo split: el mercado corre en el split siguiente y ya te agarra (medido: 204 de 511 llamadas caían ahí). Ese
// split igual frena con el cierre del año.
// G3b, "nunca sin equipo": también el salto del último split del año trae su llamada (antes quedabas agente libre hasta la
// pretemporada). En la pretemporada no: ahí corre el mercado entero.
function saltoAMitadDeAnio(state) {
  return calcularContexto(state).ventana !== 'pretemporada';
}

function clubQueTeHaceLugar(state, liga) {
  const nivel = nivelDelJugador(state);
  const conPlantel = liga.orgs.filter((org) => state.mundo.planteles?.[org.nombre]);
  const orden = [
    ...conPlantel.filter((org) => org.fuerza <= nivel).sort((a, b) => b.fuerza - a.fuerza),
    ...conPlantel.filter((org) => org.fuerza > nivel).sort((a, b) => a.fuerza - b.fuerza)
  ];
  for (const org of orden) {
    const forzada = ofertaPosible(state, org.nombre, state.player.role, { forzada: true });
    if (forzada?.posible) {
      return { org, liga, motivo: forzada.motivo };
    }
  }
  return null;
}

function clubQueTeLlama(state, liga) {
  const candidatos = orgsQueTeFicharian(state)
    .filter((entrada) => entrada.liga.id === liga.id)
    .sort((a, b) => b.presupuesto - a.presupuesto || a.org.nombre.localeCompare(b.org.nombre));
  return candidatos[0] ?? null;
}

function decisionDeLlamada(state, liga, oferta) {
  const rol = etiquetaRol(state.player.role);
  const porQue = asientoAbierto(state, oferta.org, state.player.role).motivo;
  const contrato = `${plata(oferta.salarioAnualUSD)} al año, hasta la pretemporada`;
  return {
    tipo: 'opciones',
    titulo: `${oferta.org} te quiere`,
    descripcion: `No terminaste de festejar el salto y ya suena el teléfono. ${oferta.org} busca ${rol} para lo que queda del `
      + `año en ${nombreVisibleDeLiga(liga.id)}${porQue ? ` (${porQue})` : ''}: ${contrato}. La pretemporada trae el mercado entero, `
      + 'con más ofertas o con ninguna.',
    opciones: [
      // La opción de firmar ES la oferta (con los campos de una carta del mercado): `resolver` la firma tal cual, y la
      // decisión no suma campos nuevos a la forma del estado (los guardados, D71).
      {
        ...oferta,
        id: 'firmar',
        label: `Firmar con ${oferta.org}`,
        descripcion: `Firmás ahora (${contrato}) y el split que viene ya jugás en ${nombreVisibleDeLiga(liga.id)}.`
      },
      {
        id: 'esperar',
        label: 'Agradecer y esperar la pretemporada',
        descripcion: 'Seguís agente libre lo que queda del año, entrenando por tu cuenta. En la pretemporada elegís entre todo lo que haya.'
      }
    ],
    datos: { motivo: MOTIVO_LLAMADA }
  };
}

function decisionSinLugar(state, liga) {
  return {
    tipo: 'opciones',
    titulo: 'El teléfono no suena todavía',
    descripcion: `Te ganaste el lugar en ${nombreVisibleDeLiga(liga.id)}, pero a mitad de año ningún club tiene el puesto de `
      + `${etiquetaRol(state.player.role)} libre para vos. Hasta la pretemporada no se mueve nadie: ahí se abre el mercado.`,
    opciones: [
      {
        id: 'esperar',
        label: 'Entrenar por tu cuenta hasta la pretemporada',
        descripcion: 'Seguís agente libre lo que queda del año. En la pretemporada elegís club.'
      }
    ],
    datos: { motivo: MOTIVO_LLAMADA }
  };
}

// El salto que acaba de pasar (`salto`, lo que devolvió `saltarATier2`) con su llamada, si el mercado no corre en este split.
// `construirOferta` tira el sueldo, los años y la jerarquía proyectada una sola vez, acá (regla 15: lo que la carta dice es
// lo que se firma).
function conLlamadaDeTier2(salto, rng) {
  const { state } = salto;
  if (state.career.tier !== 2 || state.career.currentOrg || !saltoAMitadDeAnio(state)) {
    return salto;
  }
  const liga = state.mundo.ligas.find((candidata) => candidata.id === state.career.liga);
  if (!liga) {
    return salto;
  }
  // G3b, "nunca sin equipo": si ningún club tiene el asiento abierto, el más fuerte que no te supera te hace lugar (el piso de
  // ofertas del mercado, `ofertaPosible` forzada).
  const club = clubQueTeLlama(state, liga) ?? clubQueTeHaceLugar(state, liga);
  if (!club) {
    return { ...salto, decision: decisionSinLugar(state, liga) };
  }
  // El contrato es por lo que queda del año (`competitivo.llamadaTier2.aniosContrato`): en la pretemporada se vence y vas al
  // mercado entero, con la renovación de este club como una oferta más. Con los 1-3 años de un contrato de mercado, la
  // llamada te ataba al tier 2: medido (1000 carreras de 15 splits), llegar a tier 1 bajaba de 46,6% a 40,5%.
  const oferta = construirOferta(state, club.liga, club.org, null, rng);
  const deLoQueQueda = { ...oferta, anios: BALANCE.competitivo.llamadaTier2.aniosContrato, motivoDemanda: club.motivo };
  return { ...salto, decision: decisionDeLlamada(state, liga, deLoQueQueda) };
}

// Rama tier3-nivel ("el nivel manda en tier 3", D34): tu nivel contra el calibre de la liga tier 2 de tu región. Si lo supera
// por `competitivo.margenNivelSobreTier2` o más, el circuito chico ya no te alcanza y el salto no se sortea. Puro, sin `rng`.
export function nivelSobreTier2(state) {
  const liga = ligaTier2DeLaRegion(state);
  if (!liga) {
    return null;
  }
  const nivel = nivelDelJugador(state);
  const calibre = calibreDeLiga(liga);
  return { liga, nivel, calibre, alcanza: nivel >= calibre + BALANCE.competitivo.margenNivelSobreTier2 };
}

// K6a-M: tu paso por un tier 3 no se resuelve (ni el salto ni la disolución) antes de que hayas jugado un split con ese
// equipo. Sin esto, el split después de firmar —con el plantel todavía sin armar— el equipo podía saltar o disolverse:
// en el ensayo de K6 una prueba clavada ("95% de que te firmen") firmó y la ficha quedó "SIN EQUIPO · 0 partidos". El
// split jugado es el que asienta `systems/temporada.js` (la fila abierta de esta org, o el pendiente sin fila).
export function jugasteUnSplitConLaOrg(state) {
  const org = state.career.currentOrg;
  const abierta = filaAbierta(state.career.registro);
  return (abierta?.org === org && (abierta.splitsPorTier?.[3] ?? 0) > 0)
    || state.flags.splitJugadoSinFila?.org === org;
}

function resolverTier3(state, rng) {
  const c = BALANCE.competitivo;
  // Rama tier3-nivel: con nivel de sobra, el salto es seguro y no consume `rng` (la tirada de abajo queda para el resto).
  const sobra = nivelSobreTier2(state);
  if (sobra?.alcanza) {
    return conLlamadaDeTier2(saltarATier2(state, [], `Te sobraba nivel para el circuito chico: ${entero(sobra.nivel)} de nivel contra el `
      + `${entero(sobra.calibre)} de un equipo medio de ${nombreVisibleDeLiga(sobra.liga.id)}. `), rng);
  }
  if (!chance(c.probSalidaTier3, rng)) {
    return { state, logs: [] };
  }

  const probAscenso = clamp(
    c.probAscensoBaseDesdeTier3 + (state.career.jerarquia / BALANCE.stats.max) * c.probAscensoPorJerarquiaDesdeTier3,
    0, 1
  );
  if (!chance(probAscenso, rng)) {
    // G3b, "nunca sin equipo": el armado se disuelve y otro equipo chico te levanta en el mismo split.
    const disuelto = disolverEquipo(state, []);
    const otro = reFicharTier3(disuelto.state, rng);
    return { state: otro.state, logs: [...disuelto.logs, ...otro.logs] };
  }
  return conLlamadaDeTier2(saltarATier2(state, []), rng);
}

// Un tier 3 disuelto nunca queda mucho tiempo sin equipo: es la característica
// del nivel, siempre hay otro armado chico buscando gente.
// G3b (PLANUI §0.9, "nunca sin equipo"): ya no es una tirada por split: el split siguiente a la disolución ya tenés club.
function reFicharTier3(state, rng) {
  const org = elegirOrgTier3(state, rng);
  return {
    state: asignarOrgTier3(state, org),
    logs: [crearLog('competitivo', `${org.nombre} te levanta. Otro equipo chico, otra chance de mostrarte.`)]
  };
}

// --- Descenso de tier 1 (fase 9Md, cierra D16) ---

// `conPlantelesDe` (core/plantel.js): la liga de destino tiene planteles —una extranjera se genera al vuelo— para que
// el mercado tenga con qué trabajar. La comparte el banquillo de `mercado.js` (revisión de K5).
function resolverDescenso(state, rng) {
  if (state.career.tier !== 1 || !state.career.currentOrg) {
    return null;
  }
  if (calcularContexto(state).ventana !== 'pretemporada') {
    return null;
  }
  const ligaActual = state.mundo.ligas.find((liga) => liga.id === state.career.liga);
  // K6b-F: una liga franquiciada no tiene descenso (en K6 Fnatic bajaba de la LEC a EMEA Masters). La marca se lee del
  // archivo de ligas y no del mundo, que guarda una copia de cada liga desde la creación (un guardado anterior a la marca
  // también la respeta).
  if (!ligaActual?.desciendeA || esLigaFranquiciada(ligaActual.id)) {
    return null;
  }
  const equipos = ligaActual.orgs.length;
  // `career.posicion` trae el resultado del split de cierre que acaba de pasar.
  if (state.career.posicion == null || state.career.posicion < equipos) {
    return null;
  }

  const ligaDestino = state.mundo.ligas.find((liga) => liga.id === ligaActual.desciendeA);
  if (!ligaDestino) {
    return null;
  }

  const planteles = conPlantelesDe(state, ligaDestino, rng);
  const orgQueBaja = ligaActual.orgs.find((org) => org.nombre === state.career.currentOrg);
  // La org tier-2 más fuerte de esa región promociona a tapar el hueco.
  const orgQueSube = [...ligaDestino.orgs].sort((a, b) => b.fuerza - a.fuerza)[0];

  const ligas = state.mundo.ligas.map((liga) => {
    if (liga.id === ligaActual.id) {
      return { ...liga, orgs: liga.orgs.map((org) => (org.nombre === orgQueBaja.nombre ? orgQueSube : org)) };
    }
    if (liga.id === ligaDestino.id) {
      return { ...liga, orgs: liga.orgs.map((org) => (org.nombre === orgQueSube.nombre ? orgQueBaja : org)) };
    }
    return liga;
  });

  // K1 (D76): el descenso es "en el lugar" — la fila del registro NO se cierra
  // (el contrato viaja con la org), así que `fila.tier`/`fila.liga` siguen
  // siendo los de la firma. Desde ESTE split (el descenso corre en la
  // pretemporada, antes de jugar) `systems/temporada.js` cuenta cada split
  // jugado en `fila.splitsPorTier[2]`, y los títulos ganados acá llevan su
  // `liga`/`tier` reales: eso es lo que leen el puntaje y el veredicto.
  return {
    state: {
      ...state,
      flags: { ...state.flags, splitDescenso: state.player.splitCount },
      mundo: { ...state.mundo, ligas, planteles },
      career: {
        ...state.career,
        tier: 2, liga: ligaDestino.id,
        contrato: { ...state.career.contrato, tier: 2, liga: ligaDestino.id }
      }
    },
    logs: [crearLog('competitivo', `${orgQueBaja.nombre} termina último en ${nombreVisibleDeLiga(ligaActual.id)}: desciende a ${nombreVisibleDeLiga(ligaDestino.id)}. ${contratoQueSeVence(state)
      ? 'Tu contrato se termina ahora: si bajás con ellos depende de que te renueven.'
      : 'Bajás con ellos — el contrato viaja.'}`)]
  };
}

// K6b-F (regla 15): "el contrato viaja" solo si el contrato sigue vigente después de esta pretemporada. Si se vence ahora
// (la misma cuenta que `systems/mercado.js`, que corre justo después y descuenta el año), la org baja igual, pero quedarte
// o irte lo decide la renovación: decir "viaja" y en el mismo receso "no te renovaron" era la contradicción de K6.
function contratoQueSeVence(state) {
  return Math.max(0, state.career.contrato.aniosRestantes - 1) <= 0;
}

export function aplicar(state, rng) {
  if (state.phase !== 'profesional') {
    return { state, logs: [] };
  }

  const descenso = resolverDescenso(state, rng);
  if (descenso) {
    return descenso;
  }

  if (!state.career.currentOrg) {
    // Sólo tier 3 se re-ofrece solo. Un tier-2 libre (recién saltó de tier 3, o
    // el mercado no le consiguió equipo) lo resuelve `mercado.js`.
    return state.career.tier === 3 ? reFicharTier3(state, rng) : { state, logs: [] };
  }

  if (state.career.tier === 3) {
    return jugasteUnSplitConLaOrg(state) ? resolverTier3(state, rng) : { state, logs: [] };
  }
  // Tier 1 y tier 2 con equipo: no se sortea nada. El mercado (más abajo en el
  // split) decide si te vas, te quedás o subís.
  return { state, logs: [] };
}

// F2: la única decisión de este sistema es la llamada de tier 2 (`conLlamadaDeTier2`). Firmar es la firma de siempre
// (`aceptarOferta`, con su log "Firmás con…", que la UI monta como la firma del relato); esperar no toca nada.
export function resolver(state, decision, respuesta, rng) {
  const oferta = decision.opciones.find((opcion) => opcion.id === 'firmar') ?? null;
  if (respuesta.opcionId === 'firmar' && oferta) {
    return aceptarOferta(state, oferta, rng);
  }
  return {
    state,
    logs: [crearLog('competitivo', oferta
      ? `Le decís a ${oferta.org} que no, por ahora. Seguís agente libre hasta la pretemporada.`
      : 'Seguís agente libre hasta la pretemporada, entrenando por tu cuenta.')]
  };
}

export function resolverAuto(state, decision, rng) {
  const pesos = BALANCE.competitivo.llamadaTier2;
  if (decision.opciones.length === 1) {
    return { opcionId: decision.opciones[0].id };
  }
  const peso = (opcion) => (opcion.id === 'firmar' ? pesos.pesoAutoFirmar : pesos.pesoAutoEsperar);
  return { opcionId: weightedPick(decision.opciones, peso, rng).id };
}
