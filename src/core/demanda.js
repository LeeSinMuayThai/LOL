import { BALANCE } from '../data/balance.js';
import { splitsDeResidencia, valorDeMercado, castigoEtario } from './valorMercado.js';
import { nivelDelJugador } from './ficha.js';
import { etiquetaRol } from '../data/roles.js';
import { plata } from './formato.js';
import { seVaDelMundo, nivelAnclaReemplazo } from './plantel.js';
import { nombreVisibleDeLiga } from './ligas.js';
import { clamp } from './numeros.js';

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

// K5c-M, la élite se busca: cuánto pesa la fuerza del club en tu mercado según tu nivel. 0 por debajo de
// `mercado.elite.umbralNivel`, sube en línea recta y vale 1 desde `umbralNivel + anchoNivel` (la forma está explicada
// en `data/balance.js`). Lee el BALANCE vivo en cada llamada (un override en memoria la pisa). Pura.
export function factorElite(nivel) {
  const { umbralNivel, anchoNivel } = BALANCE.mercado.elite;
  if (anchoNivel <= 0) {
    return nivel >= umbralNivel ? 1 : 0;
  }
  return clamp((nivel - umbralNivel) / anchoNivel, 0, 1);
}

// K5c-M, la élite se busca: los puntos que un club le perdona a un jugador de tu nivel en los dos márgenes del asiento,
// el que lo abre por mérito (`demanda.forzarAsientoSobreNpc`, `rebajaMeritoElite`) y el de la disputa
// (`demanda.margenSobreAlternativa`, `rebajaDisputaElite`).
// Medido con la perilla en 0 (80 carreras de `criterio`, los 10 clubes más fuertes del mundo contra los jugadores con
// f = 1): de 242 pares que las reglas duras permiten, solo 12 eran ofrecibles. Abrir solo el asiento no sumaba ninguno:
// la disputa los frenaba (el jugador quedaba ~5,6 puntos debajo de la alternativa, que en un club fuerte tiene el piso
// `org.fuerza − alternativaPisoFuerza`). Perdonar 8 en los dos márgenes los llevaba a ~63 (cuenta sin el presupuesto).
// Por eso la rebaja va en los dos. Las reglas duras (cupo de imports, el listón de import) no se tocan: frenan ~2 de cada 3 pares.
// Revisión de K5c (regla 15): son dos perillas, cada una topeada en SU margen. Con una sola perilla sobre los dos, un valor mayor
// que `margenSobreAlternativa` (4) fichaba a una estrella peor que la alternativa del club, y con 8 o más el asiento se abría "por
// mérito" para quien no le gana al titular. Con el tope, el margen efectivo nunca baja de 0: nivel > NPC, y nunca peor que la
// alternativa. Con las perillas en 0 el margen es el de siempre, exacto.
export function rebajaMeritoElite(nivel) {
  return clamp(BALANCE.mercado.elite.rebajaMerito * factorElite(nivel), 0, BALANCE.demanda.forzarAsientoSobreNpc);
}

export function rebajaDisputaElite(nivel) {
  return clamp(BALANCE.mercado.elite.rebajaDisputa * factorElite(nivel), 0, BALANCE.demanda.margenSobreAlternativa);
}

// K5c-M, lo que ve la carta de oferta: el puesto del plantel de `org` por fuerza dentro de `liga` (1 = el más
// fuerte; los empates comparten puesto), de cuántos, y la banda en palabras que usa la carta (`'primero'`,
// `'arriba'`, `'medio'`, `'abajo'`, con los cortes de `mercado.plantelEnLiga`). `fuerza` viaja para el bot del
// instrumento (`dev/estrategias.js`), que compara clubes de ligas distintas. Puro y sin rng: una lectura del mundo.
export function plantelEnLiga(liga, org) {
  const orgs = liga?.orgs ?? [];
  const fuerza = org?.fuerza ?? 0;
  const de = Math.max(1, orgs.length);
  const puesto = 1 + orgs.filter((otra) => otra.nombre !== org?.nombre && (otra.fuerza ?? 0) > fuerza).length;
  const { fraccionArriba, fraccionAbajo } = BALANCE.mercado.plantelEnLiga;
  let banda = 'medio';
  if (puesto === 1) {
    banda = 'primero';
  } else if (puesto <= Math.ceil(de * fraccionArriba)) {
    banda = 'arriba';
  } else if (puesto > de - Math.ceil(de * fraccionAbajo)) {
    banda = 'abajo';
  }
  return { puesto, de, banda, liga: liga?.id ?? null, fuerza };
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
  // K5c-M: a la élite el club le perdona parte del margen (`rebajaMeritoElite`, topeada: nunca por debajo del NPC; con la perilla
  // en 0 es el mismo margen de siempre, exacto). Revisión de K5c (regla 15): el motivo dice lo que es. "Claramente" solo si le
  // sacás el margen entero; si lo abrió la rebaja, el club apuesta por vos y estás a la par.
  const nivel = nivelDelJugador(state);
  if (nivel > npc.nivel + d.forzarAsientoSobreNpc - rebajaMeritoElite(nivel)) {
    const claramente = nivel > npc.nivel + d.forzarAsientoSobreNpc;
    return {
      abierto: true,
      porMerito: true,
      motivo: claramente ? `mejorás claramente sobre ${npc.handle}` : `estás a la par de ${npc.handle} y el club apuesta por vos`
    };
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
    return { ok: false, motivo: `no llegás a la edad mínima de ${nombreVisibleDeLiga(liga.id)}` };
  }
  if (residenciaEn(state, liga.regionId) === 'import') {
    const noResidentes = noResidentesTrasFichar(state, org.nombre, rol, liga, false);
    if (noResidentes > (liga.cupoImports ?? 99)) {
      return { ok: false, motivo: `${nombreVisibleDeLiga(liga.id)} ya tiene el cupo de imports lleno` };
    }
    if (BALANCE.plantel.tamano - noResidentes < (liga.minimoResidentes ?? 0)) {
      return { ok: false, motivo: `${nombreVisibleDeLiga(liga.id)} necesita más residentes en el roster` };
    }
    // Fase 9Md: el listón para un import escala con `dificultadAdaptacion` — a
    // LCK/LPL hay que ser mucho mejor que el local; a CBLOL/LCS, apenas.
    const margenImport = BALANCE.mercado.margenImport
      * (1 + (liga.dificultadAdaptacion ?? 50) / 100 * BALANCE.mercado.factorDificultadImport);
    if (nivelDelJugador(state) < org.fuerza + margenImport) {
      return { ok: false, motivo: `como import a ${nombreVisibleDeLiga(liga.id)} no alcanza con estar apenas mejor` };
    }
  }
  return { ok: true };
}

// Fase 9Mi (PLAN.md §9M.12.2 punto 1): la mejor alternativa REAL de una org a
// ficharte para `rol` — contra la que se disputa el asiento en `ofertaPosible`.
// Es lo mejor de:
//   - el calibre de la liga: `max(calibreDeLiga, org.fuerza) −   (calibreDeLiga: un cuantil bajo, revisión K5)
//     alternativaPisoFuerza`. Un asiento en LCK atrae talento de LCK aunque el
//     club venga colapsado; un club fuerte en una liga chica pide su propia
//     fuerza. Es el término que hace que el tier mida "¿le ganás a la
//     competencia de esa liga?" — que es lo que quiere el check 9. Sin él, el
//     asiento se disputa contra un `org.fuerza` que se desangró a ~40 y
//     cualquiera con potencial medio lo gana (medido en 9Mi: tier1.fuerza p50
//     66, min 32);
//   - su titular NPC, salvo que se vaya del mundo (`seVaDelMundo`);
//   - el mejor agente libre de TU rol que quedó del offseason
//     (`mercadoPretemporada.libresRestantes`, filtrado por `role`);
//   - el canterano que subiría (`nivelAnclaReemplazo − canteraNivelBajoOrg`).
// Subida de `systems/mercado.js` a `core/` (lo pedía §9M.12.2). La heurística
// de negociación de `mercado.js` (piso `org.fuerza − margenBombazoFuerza`)
// quedó allá: no es una alternativa de fichaje, es cuánto te quieren.
// K5-B (D78): el calibre de una liga es el nivel REAL de sus clubes —el promedio de `org.fuerza`, que
// deriva del plantel—, no su `prestigio`. En LCK (95) y LPL (93) el prestigio está muy por encima de lo que
// juegan sus titulares (~82 y ~81, medido), así que con el prestigio como calibre había que tener 97-99 de
// nivel para ganar un asiento: con `criterio` hubo 0 splits de LCK y de LPL en 400 carreras, Corea incluida.
// En el resto de las ligas las dos cosas casi coinciden. Una liga sin orgs cae al prestigio.
// Revisión de K5: el calibre ya no es el PROMEDIO de la liga sino un cuantil bajo de sus clubes
// (`demanda.cuantilCalibreDeLiga`), y el término de cada org es `max(org.fuerza, ese cuantil)`. Con el promedio,
// la misma vara (~81 en LCK) valía para el campeón y para el colista, y quedaba por encima de donde pica una carrera
// coreana con `criterio` (p50 ~82, con el castigo etario encima): 0 splits de LCK en 60 carreras. Con el cuantil, el
// club fuerte sigue pidiendo su fuerza y el flojo pide la del fondo de su liga, que es contra quien compite el asiento.
export function calibreDeLiga(liga) {
  const orgs = liga?.orgs ?? [];
  if (!orgs.length) {
    return liga?.prestigio ?? 0;
  }
  const fuerzas = orgs.map((org) => org.fuerza ?? 0).sort((a, b) => a - b);
  const posicion = BALANCE.demanda.cuantilCalibreDeLiga * (fuerzas.length - 1);
  const abajo = Math.floor(posicion);
  const arriba = Math.min(fuerzas.length - 1, abajo + 1);
  return fuerzas[abajo] + (fuerzas[arriba] - fuerzas[abajo]) * (posicion - abajo);
}

export function nivelAlternativaAsiento(state, orgNombre, rol) {
  const org = orgDe(state, orgNombre);
  const liga = ligaDeOrg(state, orgNombre);
  const fuerzaOrg = org?.fuerza ?? 0;
  const calibre = Math.max(calibreDeLiga(liga), fuerzaOrg);

  const titular = state.mundo.planteles?.[orgNombre]?.[rol];
  const nivelTitular = titular && !titular.esJugador && !seVaDelMundo(titular, fuerzaOrg)
    ? (titular.nivel ?? 0)
    : 0;

  const libres = state.mundo.mercadoPretemporada?.libresRestantes ?? [];
  const nivelMejorLibre = libres.reduce(
    (max, npc) => (npc?.role === rol ? Math.max(max, npc.nivel ?? 0) : max),
    0
  );

  const nivelCanterano = liga
    ? nivelAnclaReemplazo(liga, fuerzaOrg, BALANCE.mercado.nivelLigaPorDefecto) - BALANCE.plantel.canteraNivelBajoOrg
    : 0;

  return Math.max(
    calibre - BALANCE.demanda.alternativaPisoFuerza,
    nivelTitular, nivelMejorLibre, nivelCanterano
  );
}

// Fase 9Mi (PLAN.md §9M.12.2 punto 2): tu propio club también se enfría. La
// renovación pasa por la MISMA disputa que un fichaje —tu nivel efectivo (con
// el castigo etario) contra la mejor alternativa de la org— porque el declive
// de atributos en este juego es leve (CONCEPTO §12.4): un veterano casi nunca
// "cae bajo la banda" por nivel, pero a los 30 el club igual prefiere al pibe.
// Un jugador que sigue siendo *claramente* mejor que la camada joven se renueva
// normal. Lo consume `systems/mercado.js:generarOfertas`.
export function factorRenovacionEtario(state, ligaActual) {
  const org = ligaActual?.orgs.find((o) => o.nombre === state.career.currentOrg);
  if (!org) {
    return 1;
  }
  const nivelEfectivo = nivelDelJugador(state) - castigoEtario(state.age);
  const alternativa = nivelAlternativaAsiento(state, org.nombre, state.player.role);
  const claramenteMejor = nivelEfectivo >= alternativa + BALANCE.demanda.margenSobreAlternativa;
  return claramenteMejor ? 1 : BALANCE.demanda.factorRenovacionDeclive;
}

// ¿Puede esta org fichar al jugador para ese asiento? bool + motivo legible.
// Es donde se enciende TODO lo que hoy está muerto en los datos: `edadMinima`,
// `cupoImports`, `minimoResidentes`, `margenImport`.
//
// `forzada`: el piso de franquicia (9R0e) salta el asiento, el presupuesto, la
// banda y la disputa del asiento —un club se estira por una estrella— pero
// NUNCA las reglas duras.
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

  // Fase 9Mi: el asiento se DISPUTA. Estar en banda no alcanza — tenés que
  // ganarle claramente (`margenSobreAlternativa`, mismo criterio que
  // `margenImport`) a la mejor alternativa real de la org, y el mercado te
  // descuenta nivel por la edad en esa disputa (`castigoEtario`). El piso de
  // franquicia ya salteó esto arriba (rama `forzada`).
  // K5c-M: la élite se busca, y en la disputa el club también le perdona `rebajaDisputaElite` (topeada en el margen: nunca peor
  // que la alternativa; 0 con la perilla neutra).
  const nivelEfectivo = nivel - castigoEtario(state.age);
  const alternativa = nivelAlternativaAsiento(state, orgNombre, rol);
  if (nivelEfectivo < alternativa + d.margenSobreAlternativa - rebajaDisputaElite(nivel)) {
    return { posible: false, motivo: `${org.nombre} tiene mejores opciones para el puesto` };
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
