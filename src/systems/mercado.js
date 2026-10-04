import { chance, weightedPick, roll, gauss } from '../core/rng.js';
import { elegirMinijuego, textoDeMinijuego, registrarMinijuegoVisto, minijuegoPorId, saltosDeFichaje } from '../core/minijuegos.js';
import { clamp, clampStat } from '../core/numeros.js';
import { crearLog } from '../core/log.js';
import { plata } from '../core/formato.js';
import { calcularContexto } from '../core/contexto.js';
import { ligaDeCarrera } from '../core/competicion.js';
import { salarioDeOferta } from '../core/salarios.js';
import { valorDeMercado, sesgoEtario } from '../core/valorMercado.js';
import { cerrarFila, registrarPico, registrarSalarioEnFila, registrarArraigoEnFila, arraigoInicial } from '../core/registro.js';
import { bandaDeJerarquia, bandaDeArraigoFicha, nivelDelJugador } from '../core/ficha.js';
import { orgsQueTeFicharian, ofertaPosible, esResidenteDe, nivelAlternativaAsiento, factorRenovacionEtario, factorElite, plantelEnLiga } from '../core/demanda.js';
import { resolverMercadoMundial, cerrarAsientosCongelados, congelarAsientosOfrecibles } from '../core/mercadoMundial.js';
import { jerarquiaAlFichar, sinergiaAlFichar, conPlantillaDelPlantel } from './roster.js';
import { conPlantelesDe } from '../core/plantel.js';
import { companerosDelPlantel } from '../core/fuerza.js';
import { BALANCE } from '../data/balance.js';
import { ajusteBaseDeMinijuego, probabilidadDeFirmarTrasPrueba } from '../core/serie.js';
import { retirarsePorMercado, pretemporadasEnPalabras, aniosEnPalabras } from './retiro.js';
import { nombreVisibleDeLiga } from '../core/ligas.js';

export const id = 'mercado';

// El mercado (fase 9, PLAN.md §9.3-9.6): contratos que vencen, ofertas que
// llegan (o no), y la trampa del equipo grande hecha texto ANTES de firmar.
// Va después de `competitivo` en el registro.
//
// Fase 9Md (PLAN.md §9M.5): la escalera deja de ser un dado. `competitivo.js`
// ya no "marca un ascenso"; este sistema escanea las 6 ligas tier 1 (+ tu tier
// 2) y te llega la oferta si un club tiene hueco en tu rol y te puede pagar.
// Subís a primera porque hay asiento, no porque salió `chance()`.

function conFilaCerrada(state, motivo) {
  return cerrarFila(state.career.registro, {
    anio: state.calendario.anio, split: state.player.splitCount,
    arraigoActual: state.career.arraigo, motivo
  });
}

// La org de `orgNombre` en cualquiera de las 6 ligas del mundo (una oferta
// puede venir de una liga que no es la tuya — 9Md).
function orgDelMundo(state, orgNombre) {
  for (const liga of state.mundo.ligas) {
    const org = liga.orgs.find((candidata) => candidata.nombre === orgNombre);
    if (org) {
      return org;
    }
  }
  return null;
}

// Fase 9Me (§9M.6): cuánto te quieren, para el texto de riesgo de negociar y la
// probabilidad de ruptura al pedir más. Es la alternativa real del asiento
// (`core/demanda.js:nivelAlternativaAsiento`, 9Mi) con un piso de negociación:
// una org nunca te trata como plan B si sos peor que su propia fuerza menos un
// bombazo (`margenBombazoFuerza`). Ese piso es una heurística de negociación,
// no una alternativa de fichaje — por eso vive acá y no en `core`.
function referenteDeNegociacion(state, orgNombre) {
  const base = nivelAlternativaAsiento(state, orgNombre, state.player.role);
  const org = orgDelMundo(state, orgNombre);
  return Math.max(base, (org?.fuerza ?? 0) - BALANCE.mercado.margenBombazoFuerza);
}

// --- Construcción de una oferta (§9.5: el contrato de datos exacto) ---

function tipoDeContrato(state, liga, esRenovacion) {
  if (esRenovacion) {
    return 'renovacion';
  }
  // Sos import si firmás en una región que no es la tuya y todavía no
  // acumulaste residencia ahí (D29: el eje `residencia` ya lo calcula así).
  if (liga.regionId !== state.mundo.regionIdOrigen && !esResidenteDe(state, liga.regionId)) {
    return 'import';
  }
  return 'transferencia';
}

export function construirOferta(state, liga, org, tagForzado, rng) {
  const m = BALANCE.mercado;
  const jerarquiaActual = state.career.jerarquia;
  const esRenovacion = tagForzado === 'renovacion';
  const esOrgActual = org.nombre === state.career.currentOrg;

  // Fase 9d (medido): una renovación con ruido lognormal completo caía a
  // menos de la mitad del contrato anterior en 1 de cada 3 casos — el club
  // que ya te tiene no te tasa de cero cada vez. `renovacionSigmaFactor`
  // achica el ruido sin tocar la señal de jerarquía/hype.
  const ligaParaSalario = esRenovacion
    ? { ...liga, salario: { ...liga.salario, sigma: liga.salario.sigma * m.renovacionSigmaFactor } }
    : liga;
  const salarioAnualUSD = salarioDeOferta(ligaParaSalario, {
    rol: state.player.role, jerarquia: jerarquiaActual, hype: state.player.stats.hype
  }, rng);
  const anios = roll(m.aniosContratoMin, m.aniosContratoMax, rng);

  // D67: el salario de referencia es el contrato vigente si lo hay; si es 0
  // (agente libre), es la mediana salarial de la liga de la oferta. Sin `?.` ni
  // `?? 0` a propósito: `salarioDeOferta` ya exige `liga.salario` y validate.js
  // exige `minimoUSD < medianaUSD`; si algún día faltara la mediana, un `0` por
  // defecto volvería a etiquetar TODA oferta como bombazo (D67) sin avisar.
  const sueldoVigente = state.career.contrato.salarioAnualUSD;
  const salarioReferencia = sueldoVigente > 0 ? sueldoVigente : liga.salario.medianaUSD;
  const tag = tagForzado ?? (
    salarioAnualUSD > salarioReferencia * m.bombazoMultiplo ? 'bombazo' : 'lateral'
  );

  // Regla de proceso 15: la jerarquía que se muestra tiene que ser LA MISMA
  // que `roster.js` va a asignar si el jugador acepta — se tira una sola vez
  // acá y viaja por `flags.jerarquiaProyectadaAlFichar` (ver roster.js).
  let jerarquiaProyectadaCruda = null;
  let proyeccionJerarquia;
  if (esOrgActual) {
    const banda = bandaDeJerarquia({ career: { jerarquia: jerarquiaActual } });
    proyeccionJerarquia = { desde: Math.round(jerarquiaActual), hasta: Math.round(jerarquiaActual), etiqueta: banda.label, flecha: 'igual' };
  } else {
    jerarquiaProyectadaCruda = jerarquiaAlFichar(state, rng);
    // D39: lo que se muestra es donde vas a estar al cerrar el split, no el
    // instante de firmar — `rendimiento.js` corre despues, en el mismo split.
    const hasta = Math.round(clampStat(jerarquiaProyectadaCruda + BALANCE.roster.derivaPrimerSplit));
    const banda = bandaDeJerarquia({ career: { jerarquia: hasta } });
    const flecha = hasta > jerarquiaActual ? 'sube' : (hasta < jerarquiaActual ? 'baja' : 'igual');
    proyeccionJerarquia = { desde: Math.round(jerarquiaActual), hasta, etiqueta: banda.label, flecha };
  }

  const jerarquiaFutura = esOrgActual
    ? jerarquiaActual
    : (jerarquiaProyectadaCruda === null ? jerarquiaActual : jerarquiaProyectadaCruda + BALANCE.roster.derivaPrimerSplit);
  const proyeccionPicks = jerarquiaFutura < BALANCE.serie.jerarquiaMinimaParaSeguirLlamada
    ? 'Con esa jerarquía casi nunca vas a elegir tu campeón.'
    : 'Tu palabra todavía va a pesar en el draft.';

  const bandaArraigoActual = bandaDeArraigoFicha(state.career.arraigo);
  const costeArraigo = esOrgActual
    ? { pierde: 0, etiqueta: 'Seguís en la misma organización: no perdés nada.' }
    : {
      pierde: Math.round(state.career.arraigo),
      etiqueta: `Dejás ${state.career.currentOrg ?? 'tu equipo actual'}: perdés ${bandaArraigoActual.label} (${Math.round(state.career.arraigo)}/100)`
    };
  const arraigoAlLlegar = esOrgActual
    ? { valor: Math.round(state.career.arraigo), etiqueta: 'Seguís donde estabas.' }
    : { valor: Math.round(arraigoInicial(state.player.stats.hype)), etiqueta: 'Allá arrancás casi de cero: tu fama te precede.' };

  const progresoHito = esOrgActual && !bandaArraigoActual.esMaxima
    ? {
      faltan: Math.round(bandaArraigoActual.techo - bandaArraigoActual.valor),
      hacia: bandaDeArraigoFicha(bandaArraigoActual.techo).label,
      actual: Math.round(bandaArraigoActual.valor)
    }
    : null;

  const riesgo = esOrgActual
    ? null
    : (org.fuerza >= liga.prestigio + m.margenBombazoFuerza
      ? 'Vas a competir por un lugar en un roster cargado de estrellas.'
      : 'Acá vas a tener margen para mandar vos.');

  // Fase 9Me: cuánto te quieren, para el texto de riesgo de "pedir más". La
  // brecha entre tu nivel y su mejor alternativa gobierna si el club aguanta el
  // apriete o se va a otro (`negociarPedirMas`).
  const brechaNegociacion = nivelDelJugador(state) - referenteDeNegociacion(state, org.nombre);
  const negociacionInfo = {
    riesgoTexto: brechaNegociacion >= m.brechaNegociacionComoda
      ? 'Te quieren: difícil que se caiga si pedís más.'
      : 'Sos su plan B: si apretás, se pueden ir a otro.',
    escalonesMax: m.escalonesNegociacionMax
  };

  return {
    id: org.nombre,
    org: org.nombre, liga: liga.id, tier: liga.tier, region: liga.regionId,
    tag,
    salarioAnualUSD, anios,
    proyeccionJerarquia, proyeccionPicks,
    costeArraigo, arraigoInicial: arraigoAlLlegar,
    progresoHito,
    riesgo,
    // K5c-M: dónde está el plantel por fuerza dentro de su liga (puesto, de cuántos, la banda que dice la carta).
    // Lectura pura del mundo, sin rng: no mueve ninguna tirada.
    plantelEnLiga: plantelEnLiga(liga, org),
    // Fase 9Me: estado de la negociación (arranca en cero) e info para el
    // texto de riesgo. `salarioBase` es el ancla para calcular los escalones.
    negociacion: { escalones: 0, clausula: false, salarioBase: salarioAnualUSD },
    negociacionInfo,
    label: `${org.nombre} · ${nombreVisibleDeLiga(liga.id)}`,
    descripcion: esOrgActual
      ? 'Te renueva tu propia organización.'
      : (liga.tier < (state.career.tier ?? 9) ? 'El salto a una liga más grande.'
        : (liga.tier > (state.career.tier ?? 0) ? 'Un escalón para abajo, pero es jugar.'
          : (tag === 'bombazo' ? 'La oferta grande.' : 'Una salida lateral.'))),
    datos: {
      tipo: tipoDeContrato(state, liga, esRenovacion),
      jerarquiaProyectada: jerarquiaProyectadaCruda,
      // Fase 9Me: `null` hasta que se negocie la cláusula de salida; entonces
      // `'salida'` y `aceptarOferta` la escribe en el contrato (regla 15).
      clausula: null
    }
  };
}

// --- K4-C2: la oferta de import que trae una bifurcación (`ofertaDeImport` en `data/events/caminos.json`) ---
//
// Regla 15: la tarjeta que dice "una org de la LPL te quiere" tiene que poder cumplirse. La org que te vino a buscar
// te hace lugar (como el piso de franquicia, `forzada`: salta asiento, presupuesto y banda) pero NUNCA las reglas
// duras: edad mínima, cupo de imports, residentes y el listón de import de esa liga. Se elige la org más fuerte que
// te puede fichar; `ligas` es una liga o una lista en orden de preferencia ("occidente": LEC, después LCS). Pura.
export function ofertaDeImportPosible(state, ligas) {
  const ids = [].concat(ligas);
  let motivo = null;
  for (const ligaId of ids) {
    const liga = state.mundo.ligas.find((candidata) => candidata.id === ligaId);
    if (!liga) {
      continue;
    }
    const orgs = liga.orgs
      .filter((org) => org.nombre !== state.career.currentOrg && state.mundo.planteles?.[org.nombre])
      .sort((a, b) => b.fuerza - a.fuerza);
    for (const org of orgs) {
      const res = ofertaPosible(state, org.nombre, state.player.role, { forzada: true });
      if (res.posible) {
        return { posible: true, liga, org };
      }
      motivo = motivo ?? res.motivo ?? null;
    }
  }
  return {
    posible: false,
    motivo: `Ninguna org de ${ids.join(' ni de ')} puede ficharte${motivo ? `: ${motivo}` : ''}.`
  };
}

// El efecto del evento: deja la oferta pendiente (`flags.ofertaDeImport`) para la próxima pretemporada, que es
// cuando abre el mercado. `clausula: 'salida'` viaja al contrato (el "año a prueba" de la LPL).
export function prometerImport(state, effect) {
  const ids = [].concat(effect.liga);
  return {
    state: { ...state, flags: { ...state.flags, ofertaDeImport: { ligas: ids, clausula: effect.clausula ?? null } } },
    descripcion: `te vas a la ${ids.join(' o a la ')} en la próxima pretemporada`
  };
}

// En la pretemporada, antes que el banquillo y el contrato: la oferta pendiente se vuelve a mirar contra el mundo de
// HOY (el mercado del mundo acaba de moverse) y, si sigue en pie, se firma por `aceptarOferta`, como cualquier otra:
// salario y años de `construirOferta`, tipo de contrato (import o no) por residencia. Si ya no hay org que pueda,
// se dice por qué y el mercado sigue como siempre. `null` si no había oferta pendiente.
function firmarImportPendiente(state, rng) {
  const pendiente = state.flags.ofertaDeImport;
  if (!pendiente) {
    return null;
  }
  const limpio = { ...state, flags: { ...state.flags, ofertaDeImport: null } };
  const posible = ofertaDeImportPosible(limpio, pendiente.ligas);
  if (!posible.posible) {
    return { state: limpio, logs: [crearLog('mercado', `La mudanza se cae en la pretemporada. ${posible.motivo}`)], firmado: false };
  }
  const cruda = construirOferta(limpio, posible.liga, posible.org, null, rng);
  const oferta = { ...cruda, datos: { ...cruda.datos, clausula: pendiente.clausula } };
  const origen = limpio.career.currentOrg;
  const firmado = aceptarOferta(limpio, oferta, rng, { motivoFila: 'transferencia' });
  const cerrado = cerrarAsientosCongelados(firmado.state, oferta.org, rng, new Set([oferta.org]));
  const salida = origen ? `Dejás ${origen}: ` : '';
  return {
    state: { ...cerrado.state, flags: { ...cerrado.state.flags, banquilloPendiente: false } },
    logs: [crearLog('mercado', `${salida}la mudanza se hace. ${oferta.org} te espera en la ${nombreVisibleDeLiga(oferta.liga)}.`), ...firmado.logs, ...cerrado.logs],
    firmado: true,
    oferta
  };
}

// La mano de ofertas: la renovación de tu club (si te quieren) + las orgs del
// MUNDO con un asiento congelado para vos este offseason (`core/mercadoMundial.js`).
// Fase 9Md: `orgsQueTeFicharian` ya no recibe una liga — escanea las 6 tier 1
// + tu tier 2. El mercado ya no tira ningún dado.
//
// Devuelve `{ ofertas, fichadores }`: `fichadores` es el escaneo crudo de la
// demanda (antes del filtro de congelados) para que 9Mg arme los "asientos
// abiertos" sin volver a escanear el mundo.
//
// K5c-M, la élite se busca: el orden de la mano suma `k · f(nivel) · org.fuerza` (`mercado.elite.pesoFuerzaOrden`,
// `core/demanda.js:factorElite`): con nivel de élite los clubes fuertes van primero. Con k = 0 el término es 0 exacto
// y la mano (y el orden de las tiradas de `construirOferta`) queda idéntica. Exportada para los checks de K5c-M.
export function generarOfertas(state, rng) {
  const m = BALANCE.mercado;
  const ofertas = [];

  const ligaActual = ligaDeCarrera(state);
  const orgActual = ligaActual?.orgs.find((org) => org.nombre === state.career.currentOrg);
  // Fase 9Mi: la renovación también se enfría con la edad — un veterano en
  // declive que ya no le gana a la camada joven no se renueva "para siempre".
  const probRenovacion = clamp(
    (m.probRenovacionBase + (state.career.jerarquia / BALANCE.stats.max) * m.probRenovacionPorJerarquia)
      * factorRenovacionEtario(state, ligaActual),
    0, 1
  );
  if (orgActual && chance(probRenovacion, rng)) {
    ofertas.push(construirOferta(state, ligaActual, orgActual, 'renovacion', rng));
  }

  // Sólo los asientos que `mercadoMundial.js` CONGELÓ para vos (9Mc): así toda
  // oferta lateral corresponde a un asiento que, si lo rechazás,
  // `cerrarAsientosCongelados` cierra con nombre (check 10). Sin resolución del
  // mundo (estado sintético de un check) no se filtra.
  const pre = state.mundo.mercadoPretemporada;
  const congeladosOrgs = pre
    ? new Set(pre.congelados.filter((c) => c.rol === state.player.role).map((c) => c.org))
    : null;
  const dominante = state.mundo.regionDominante;
  const fichadores = orgsQueTeFicharian(state);
  const pesoFuerza = m.elite.pesoFuerzaOrden * factorElite(nivelDelJugador(state));
  const posibles = fichadores
    .filter((entrada) => !congeladosOrgs || congeladosOrgs.has(entrada.org.nombre))
    // `regionDominante` (9Md): las orgs de esa región suben en el orden de la mano. K5c-M: y con nivel de élite,
    // las fuertes.
    .map((entrada) => ({
      ...entrada,
      orden: entrada.presupuesto + (entrada.liga.region === dominante ? m.nudgeRegionDominante : 0)
        + pesoFuerza * (entrada.org.fuerza ?? 0)
    }))
    .sort((a, b) => b.orden - a.orden);

  // 9R0e: si sos claramente una franquicia para TU liga y aun así ningún
  // asiento se abrió, el club más débil de tu liga hace lugar — el silencio no
  // es para una franquicia. (Sin liga —recién ascendido de tier 3— no aplica.)
  // Fase 9Wb (§9W.4): estar en el Top 20 del mundo TAMBIÉN te hace franquicia
  // — el mercado siempre le tiene asiento a un top 20.
  const enTopMundial = state.flags.rankMundialActual != null
    && state.flags.rankMundialActual <= BALANCE.topMundial.tamano;
  const claramenteArriba = Boolean(ligaActual)
    && (nivelDelJugador(state) - (ligaActual.prestigio ?? m.nivelLigaPorDefecto) >= m.brechaFranquicia
      || enTopMundial);
  if (claramenteArriba && posibles.length === 0) {
    // El club más débil de tu liga que PUEDE ficharte (respeta las reglas duras
    // — cupo de imports incluido, 9Md). Se prueba de la más débil hacia arriba.
    // K5-C: solo las orgs con plantel (las mismas que escanea `orgsQueTeFicharian`). Un import cedido a la liga de
    // desarrollo de su club (KR en NACL, `resolverBanquillo`) cae en una liga sin planteles, y ahí `ofertaPosible`
    // reventaba en `noResidentesTrasFichar` (medido en HEAD c8a220d: seed 23 con el nivel roto, bot `malas`).
    // Revisión de K5: desde que `resolverBanquillo` puebla esa liga (`conPlantelesDe`) el filtro ya no deja la
    // liga vacía en una carrera nueva; queda por los guardados que cayeron ahí antes.
    const candidatas = ligaActual.orgs
      .filter((org) => org.nombre !== state.career.currentOrg && state.mundo.planteles?.[org.nombre])
      .sort((a, b) => a.fuerza - b.fuerza);
    for (const org of candidatas) {
      const forzada = ofertaPosible(state, org.nombre, state.player.role, { forzada: true });
      if (forzada?.posible) {
        posibles.push({ org, liga: ligaActual, motivo: forzada.motivo, forzadaFranquicia: true });
        break;
      }
    }
  }

  // El mercado prefiere jóvenes (CONCEPTO §12): `sesgoEtario` adelgaza la mano.
  // 9Md: se escala la mano YA capada a `ofertasMax` (con 6 ligas `posibles`
  // puede ser enorme y el tope tapaba el sesgo antes de que mordiera). Piso 1
  // para la franquicia.
  const manoBase = Math.min(posibles.length, m.ofertasMax - ofertas.length);
  const cupoEtario = Math.max(claramenteArriba ? 1 : 0, Math.round(manoBase * sesgoEtario(state.age)));
  const candidatas = posibles.slice(0, cupoEtario);

  for (const { org, liga, motivo, forzadaFranquicia } of candidatas) {
    const oferta = construirOferta(state, liga, org, null, rng);
    ofertas.push({ ...oferta, motivoDemanda: motivo, ...(forzadaFranquicia ? { forzadaFranquicia: true } : {}) });
  }

  return { ofertas: ofertas.slice(0, m.ofertasMax), fichadores };
}

// Los traspasos del mundo que se le muestran al jugador (regla 16: "el dado
// trajo…"). Los fichajes de agentes libres antes que las subidas de cantera, y
// tope `traspasosEnPantalla`.
function traspasosParaPantalla(state) {
  const pre = state.mundo.mercadoPretemporada;
  const rank = (desde) => (desde === 'libre' ? 0 : 1);
  return (pre?.traspasos ?? [])
    .slice()
    .sort((a, b) => rank(a.desde) - rank(b.desde))
    .slice(0, BALANCE.demanda.traspasosEnPantalla);
}

// Fase 9Mg (§9M.8): el bloque "Vos en el mercado" de la pantalla. Valor de
// mercado con su referente (regla 13: contra tu sueldo vigente, nunca un número
// suelto) y el contrato con los años que quedan. No calcula nada nuevo — lee
// `valorDeMercado` y `career.contrato`, que ya existen.
function vosEnElMercado(state) {
  const c = state.career.contrato;
  const valorUSD = valorDeMercado(state);
  const sueldoUSD = c.org ? c.salarioAnualUSD : 0;
  return {
    valorUSD,
    sueldoUSD,
    // El valor como % sobre el sueldo vigente. `null` si no hay con qué
    // comparar (agente libre, o sin liga que te tase todavía).
    sobreSueldoPct: sueldoUSD > 0 ? Math.round((valorUSD / sueldoUSD - 1) * 100) : null,
    contrato: c.org
      ? {
        org: c.org, liga: c.liga ?? null,
        salarioUSD: c.salarioAnualUSD,
        aniosRestantes: c.aniosRestantes,
        clausula: c.clausula ?? null
      }
      : null
  };
}

// Fase 9Mg: los asientos abiertos en tu rol que este offseason NO se
// tradujeron en oferta —el mercado prefirió jóvenes, o el asiento no se
// congeló para vos—. Es lo que explica "por qué me llegó lo que me llegó".
// `fichadores` es el escaneo de la demanda que `generarOfertas` ya hizo (o
// `orgsQueTeFicharian` directo, para el traspaso); se le quitan las orgs que ya
// son tarjeta y tu club actual. Capado como la lista del representante.
function asientosAbiertosParaPantalla(state, ofertas, fichadores) {
  const fuera = new Set(ofertas.map((oferta) => oferta.org));
  fuera.add(state.career.currentOrg);
  return fichadores
    .filter((entrada) => !fuera.has(entrada.org.nombre))
    .sort((a, b) => b.org.fuerza - a.org.fuerza)
    .slice(0, BALANCE.mercado.clubesInteresadosMax)
    .map((entrada) => ({ org: entrada.org.nombre, liga: entrada.liga.id }));
}

// `carry` sobrevive a la re-presentación de la decisión cuando se negocia
// (§9M.6): los asientos que un club te cerró por apretar de más y los clubes
// que el representante reveló que te miran.
function construirDecisionOfertas(state, ofertas, carry = {}) {
  return {
    tipo: 'opciones',
    presentacion: 'mercado',
    titulo: 'Mercado de pases',
    descripcion: 'El dado trajo estas ofertas. Elegí: ¿la guita o el proyecto?',
    opciones: ofertas,
    datos: {
      motivo: 'oferta',
      representanteDisponible: !state.flags.llamadaRepresentante,
      // Fase 9Mg: el bloque "Vos en el mercado" —valor con su referente, el
      // contrato, los años que quedan—. Se recalcula en cada re-presentación
      // (el estado no cambia al negociar, pero es barato).
      vos: vosEnElMercado(state),
      // Fase 9Mc: los 4-6 traspasos que movieron el mercado este offseason.
      traspasosMundo: traspasosParaPantalla(state),
      // Fase 9Mg: asientos abiertos en tu rol que no llegaron a oferta. Se
      // computa una vez (`aplicar`) y viaja por `carry` en cada re-presentación.
      asientosAbiertos: carry.asientosAbiertos ?? [],
      // Fase 9Me: asientos que se cerraron porque apretaste de más en la
      // negociación — siguen contando para "quién te sacó el puesto" (check 10).
      negociacionesRotas: carry.negociacionesRotas ?? [],
      // Fase 9Me: los clubes que te miran sin haber ofertado (representante).
      clubesInteresados: carry.clubesInteresados ?? []
    }
  };
}

// --- Split normal: valor de mercado, contrato que corre, o el mercado calla ---

function conValorDeMercadoActualizado(state) {
  const valor = valorDeMercado(state);
  return {
    ...state,
    career: { ...state.career, registro: registrarPico(state.career.registro, 'valorMercadoUSD', valor) }
  };
}

function quedarLibre(state, racha, rng) {
  // El jugador se queda sin equipo: los asientos que le habían congelado se
  // cierran con un NPC (el mundo siguió sin vos), aunque nunca llegó a ver la
  // tarjeta.
  const cerrado = cerrarAsientosCongelados(state, null, rng);
  return {
    state: {
      ...cerrado.state,
      flags: { ...cerrado.state.flags, splitsSinOfertaConsecutivos: 0 },
      career: {
        ...cerrado.state.career,
        currentOrg: null, liga: null, rosterDeOrg: null, companeros: [], sinergia: 0,
        contrato: { ...cerrado.state.career.contrato, avisoNoRenovacion: false },
        registro: conFilaCerrada(cerrado.state, 'libre')
      }
    },
    logs: [...cerrado.logs, crearLog('mercado', `Nadie te ofrece nada hace ${racha} pretemporadas seguidas. Te quedás sin equipo.`)]
  };
}

// K4-D frenaba la pretemporada con el mercado y la preparación del receso en una sola parada. K4c (plan anual): la
// práctica la fija el cierre de año y se entrena sola (`systems/practica.js`), así que la pretemporada queda para el
// mercado: si frena, frena solo por el mercado.
export function aplicar(state, rng) {
  return aplicarMercado(state, rng);
}

function aplicarMercado(state, rng) {
  if (state.phase !== 'profesional') {
    return { state, logs: [] };
  }
  // Trampa T2: el contexto se calcula en vivo, nunca se confía en el cache.
  if (calcularContexto(state).ventana !== 'pretemporada') {
    return { state, logs: [] };
  }

  // Fase 9Mc: ANTES de nada, el mercado del mundo se resuelve. `vaAlMercado` es
  // true cuando el jugador realmente va a elegir este offseason (contrato
  // vencido o sin equipo): sólo entonces se le congelan asientos.
  const contratoVencido = !state.career.currentOrg
    || Math.max(0, state.career.contrato.aniosRestantes - 1) <= 0;

  // Revisión de K5: a la edad del retiro forzoso, `retiro.js` (la etapa siguiente) cierra la carrera en esta misma
  // pretemporada sin pregunta. No hay mercado para vos: sin esto una prueba (`la_prueba`) o una firma se cerraban con
  // "te retirás a los 34" en el mismo split, y el minijuego quedaba como el paso que terminó la carrera. El mundo
  // igual se mueve (sin asientos congelados para vos).
  const lineaDelRetiro = state.age >= BALANCE.retiro.edadRetiroForzoso;
  const mundo = resolverMercadoMundial(state, rng, { vaAlMercado: contratoVencido && !lineaDelRetiro });
  // K2b: el mercado del mundo acaba de mover los planteles (envejecer, retirar,
  // fichar). Si tocó a tus compañeros, la plantilla los trae ya — la temporada
  // de este split se juega con ellos, no con la foto de `roster.js`.
  const plantilla = conPlantillaDelPlantel(mundo.state);
  const logsMundo = [...mundo.logs, ...plantilla.logs];
  const stMovido = conValorDeMercadoActualizado(plantilla.state);

  // Tier 3: a ese nivel no hay mercado, es automático (competitivo.js lo
  // resuelve). Un tier-2 LIBRE (recién ascendido de tier 3, o sin equipo) SÍ va
  // al mercado — abajo.
  if (stMovido.career.tier === 3 || lineaDelRetiro) {
    return { state: stMovido, logs: logsMundo };
  }
  // Revisión de K5: los asientos que recién son ofrecibles con el mundo ya movido también se congelan (sin rng).
  const stConValor = contratoVencido ? congelarAsientosOfrecibles(stMovido) : stMovido;

  // K4-C2: la oferta de import que aceptaste en una bifurcación se firma antes que nada (banquillo incluido: te fuiste).
  const importPendiente = firmarImportPendiente(stConValor, rng);
  if (importPendiente?.firmado) {
    // K5c-R: el import firmado es una oferta como cualquier otra: si es de tier 1, la presión de tier 2 vuelve a cero.
    return { state: conOfertaDeTier1(importPendiente.state, [importPendiente.oferta]), logs: [...logsMundo, ...importPendiente.logs] };
  }
  if (importPendiente) {
    return aplicarMercadoSinImport(importPendiente.state, [...logsMundo, ...importPendiente.logs], rng);
  }
  return aplicarMercadoSinImport(stConValor, logsMundo, rng);
}

function aplicarMercadoSinImport(stConValor, logsMundo, rng) {
  // Fase 9Mf: el banquillo se cobra ANTES que nada. `rendimiento.js` lo marcó
  // el split pasado; tu club te cede a la liga de desarrollo de su región.
  if (stConValor.career.currentOrg && stConValor.flags.banquilloPendiente) {
    return resolverBanquillo(stConValor, logsMundo, rng);
  }

  // Contrato corriendo: descuenta un año. Y a mitad de contrato (§9M.7) un club
  // grande puede venir a buscarte — con cláusula te vas y tu club cobra, sin
  // cláusula tu club decide.
  if (stConValor.career.currentOrg) {
    const aniosRestantes = Math.max(0, stConValor.career.contrato.aniosRestantes - 1);
    if (aniosRestantes > 0) {
      const stConAnio = {
        ...stConValor,
        career: { ...stConValor.career, contrato: { ...stConValor.career.contrato, aniosRestantes } }
      };
      const traspaso = ofertaDeTraspaso(stConAnio, rng);
      if (traspaso) {
        // K5c-R: un club de tier 1 que viene a buscarte a mitad de contrato es una oferta de tier 1, la firmes o no.
        return { state: conOfertaDeTier1(stConAnio, traspaso.opciones), logs: logsMundo, decision: traspaso };
      }
      return {
        state: stConAnio,
        logs: [...logsMundo, crearLog('mercado', `Te queda ${aniosRestantes === 1 ? 'un año' : `${aniosRestantes} años`} de contrato con ${stConValor.career.currentOrg}.`)]
      };
    }
  }

  const { ofertas, fichadores } = generarOfertas(stConValor, rng);
  // D.1: la decisión de renovar YA se tiró adentro de `generarOfertas`
  // (`chance(probRenovacion)`). Acá sólo se registra el resultado — no hay
  // tirada nueva (trampa T1). El flag se escribe en los dos sentidos cada
  // pretemporada con club: prendido si no hay renovación, apagado si sí
  // hay. El log (`avisoNuevo`) dispara sólo en el flanco de subida.
  const clubNoRenueva = Boolean(stConValor.career.currentOrg)
    && !ofertas.some((oferta) => oferta.tag === 'renovacion');
  const avisoNuevo = clubNoRenueva && !stConValor.career.contrato.avisoNoRenovacion;
  const stMercado = stConValor.career.currentOrg
    ? {
      ...stConValor,
      career: {
        ...stConValor.career,
        contrato: { ...stConValor.career.contrato, avisoNoRenovacion: clubNoRenueva }
      }
    }
    : stConValor;
  const logsAviso = avisoNuevo
    ? [crearLog('mercado', `${stConValor.career.currentOrg} te avisó: no van a renovarte.`)]
    : [];

  // K5-C: el final lo decide el mercado. Cada pretemporada con el mercado abierto se cuenta si ninguna oferta es de
  // tu tier o mejor; al llegar al umbral, en vez de la mano de siempre frena la bifurcación "bajás o te retirás".
  // K5c-R: una oferta de tier 1 en la mano (la firmes o no) vuelve a cero la presión de tier 2.
  const stTier = conOfertaDeTier1(conCuentaSinOfertaEnTier(stMercado, ofertas), ofertas);
  if (correspondeBifurcar(stTier)) {
    const stFork = { ...stTier, flags: { ...stTier.flags, forkMercadoSplit: stTier.player.splitCount } };
    const asientosFork = ofertas.length > 0 ? asientosAbiertosParaPantalla(stFork, ofertas, fichadores) : [];
    return {
      state: stFork, logs: [...logsMundo, ...logsAviso],
      decision: decisionFinPorMercado(stFork, ofertas, asientosFork)
    };
  }
  // K5c-R: la presión de tier 2. Misma bifurcación (y mismo orden de tiradas que la mano de siempre), con su motivo. La de
  // K5-C va primero: si ni tu tier te ofrece, esa es la que corresponde.
  if (correspondePresionTier2(stTier)) {
    const stFork = { ...stTier, flags: { ...stTier.flags, forkMercadoSplit: stTier.player.splitCount } };
    const asientosFork = ofertas.length > 0 ? asientosAbiertosParaPantalla(stFork, ofertas, fichadores) : [];
    return {
      state: stFork, logs: [...logsMundo, ...logsAviso],
      decision: decisionPresionTier2(stFork, ofertas, asientosFork)
    };
  }

  if (ofertas.length === 0) {
    const silencio = elTelefonoNoSuena(stTier, rng);
    return { state: silencio.state, logs: [...logsMundo, ...logsAviso, ...silencio.logs] };
  }

  const asientosAbiertos = asientosAbiertosParaPantalla(stTier, ofertas, fichadores);
  return {
    state: stTier, logs: [...logsMundo, ...logsAviso],
    decision: construirDecisionOfertas(stTier, ofertas, { asientosAbiertos })
  };
}

// Pretemporada sin una sola oferta: la racha sube y, al llegar a `splitsSinOfertaParaLibre`, te quedás sin equipo.
// Si no, el mundo igual llena los asientos que te había congelado. (Extraído tal cual para que la bifurcación de K5-C
// lo reuse cuando elegís seguir buscando: mismo orden de tiradas.)
function elTelefonoNoSuena(state, rng) {
  const racha = state.flags.splitsSinOfertaConsecutivos + 1;
  if (racha >= BALANCE.mercado.splitsSinOfertaParaLibre) {
    return quedarLibre(state, racha, rng);
  }
  const cerrado = cerrarAsientosCongelados(state, null, rng);
  return {
    state: { ...cerrado.state, flags: { ...cerrado.state.flags, splitsSinOfertaConsecutivos: racha } },
    logs: [...cerrado.logs, crearLog('mercado', 'Nadie te llama esta pretemporada. El teléfono no suena.')]
  };
}

// --- K5-C: el final lo decide el mercado ---

// La cuenta de pretemporadas sin una oferta de tu tier o mejor (la renovación de tu club cuenta: es tu liga). Cero
// `rng`: se lee la mano que `generarOfertas` ya armó.
function conCuentaSinOfertaEnTier(state, ofertas) {
  const enTier = ofertas.some((oferta) => oferta.tier <= state.career.tier);
  const splitsSinOfertaEnTier = enTier ? 0 : state.flags.splitsSinOfertaEnTier + 1;
  return { ...state, flags: { ...state.flags, splitsSinOfertaEnTier } };
}

// Pasada la línea de los 34 no hay nada que bifurcar: `retiro.js` te retira igual en esta misma pretemporada.
function correspondeBifurcar(state) {
  return state.flags.splitsSinOfertaEnTier >= BALANCE.retiro.splitsSinOfertaEnTierParaBifurcar
    && state.age < BALANCE.retiro.edadRetiroForzoso;
}

// --- K5c-R: la presión de tier 2 ---

// Solo una oferta de tier 1 (de una mano, un traspaso o un import firmado) vuelve a cero la cuenta que sube
// `conPresionTier2` (`systems/retiro.js`); una de tier 2, la renovación incluida, no. Cero `rng`.
function conOfertaDeTier1(state, ofertas) {
  if (!ofertas.some((oferta) => oferta?.tier === 1) || state.flags.splitsTier2SinOfertaTier1 === 0) {
    return state;
  }
  return sinPresionTier2(state);
}

// K5c (revisión, regla 15): un import de tier 1 que te ofrecen es una oferta de tier 1 aunque la rechaces. La bifurcación que lo
// presenta (`ofertaDeImport` en `data/events/caminos.json`) vuelve a cero la cuenta apenas se te muestra, la aceptes o no: si no, el
// motivo de la presión dice después "ninguna org de primera te llamó" y es falso. Solo cuenta si la oferta se puede cumplir hoy
// (`ofertaDeImportPosible`, la misma regla que la firma) y es de una liga de tier 1. Cero `rng`; la llama `systems/events.js`.
export function conImportDeTier1Presentado(state, evento) {
  if ((state.flags.splitsTier2SinOfertaTier1 ?? 0) === 0) {
    return state;
  }
  const ofreceTier1 = evento.options.some((opcion) => opcion.outcomes.some((outcome) => outcome.effects.some((efecto) => {
    if (efecto.type !== 'ofertaDeImport') {
      return false;
    }
    const posible = ofertaDeImportPosible(state, efecto.liga);
    return posible.posible && posible.liga.tier === 1;
  })));
  return ofreceTier1 ? sinPresionTier2(state) : state;
}

function sinPresionTier2(state) {
  return { ...state, flags: { ...state.flags, splitsTier2SinOfertaTier1: 0 } };
}

// Las perillas se leen acá, en el momento (un override en memoria las pisa). Pasada la línea de los 34, nada que bifurcar.
function correspondePresionTier2(state) {
  return state.career.tier === 2
    && (state.flags.splitsTier2SinOfertaTier1 ?? 0) >= BALANCE.retiro.presionTier2.splitsSinOfertaTier1
    && state.age < BALANCE.retiro.edadRetiroForzoso;
}

// La variante `presion_tier2` de la bifurcación del final por mercado: misma pausa (`motivo: 'fin_mercado'`, la misma
// regla de los bots y del headless), otro motivo. Seguir es quedarte en tier 2 con lo que te ofrecen (la mano de
// siempre, la renovación incluida) y la cuenta en cero; si nadie ofrece, seguir buscando.
function decisionPresionTier2(state, ofertas, asientosAbiertos) {
  const liga = (state.career.liga ? nombreDeLigaEnMundo(state, state.career.liga) : null) ?? `tier ${state.career.tier}`;
  const motivoRetiro = `Tenés ${state.age} años, llevás ${aniosEnPalabras(state.flags.splitsTier2SinOfertaTier1)} en ${liga} `
    + 'y ninguna org de primera te llamó.';
  const ligasQueOfrecen = [...new Set(ofertas.map((oferta) => nombreDeLigaEnMundo(state, oferta.liga) ?? `tier ${oferta.tier}`))].join(' o ');
  const seguir = ofertas.length > 0
    ? { id: 'seguir', label: `Seguís en ${ligasQueOfrecen}`, descripcion: 'Otra temporada abajo, a ganarte el llamado. Ves lo que te ofrecen y elegís; la cuenta arranca de cero.' }
    : { id: 'esperar', label: 'Seguís buscando', descripcion: 'De free agent, a esperar que suene el teléfono. La cuenta de primera arranca de cero.' };
  const cierre = ofertas.length > 0
    ? `En ${ligasQueOfrecen} todavía te quieren. ¿Seguís o colgás el mouse?`
    : 'Y nadie te está llamando. ¿Seguís o colgás el mouse?';
  return {
    tipo: 'opciones',
    bisagra: true,
    titulo: 'Primera no llama',
    descripcion: `${motivoRetiro} ${cierre}`,
    opciones: [
      seguir,
      { id: 'retirarse', label: 'Colgás el mouse', descripcion: 'Cerrás la carrera acá. Con la puerta entreabierta, si el cuerpo y las ganas dan.' }
    ],
    datos: { motivo: 'fin_mercado', variante: 'presion_tier2', motivoRetiro, ofertas, asientosAbiertos }
  };
}

function nombreDeLigaEnMundo(state, ligaId) {
  return state.mundo.ligas.find((liga) => liga.id === ligaId)?.nombre ?? null;
}

// Quién ya no te quiere, dicho como lo diría el mercado. En tier 1 el escaneo es el mundo entero (las 6 ligas de
// primera, 9Md): no es solo tu liga la que no llamó. En tier 2 es la de tu región. Sin liga (free agent, D.3) se
// nombra el tier.
function quienYaNoTeQuiere(state) {
  const nombre = state.career.liga ? nombreDeLigaEnMundo(state, state.career.liga) : null;
  if (state.career.tier === 1) {
    return nombre ? `primera, ni de la ${nombre} ni de afuera,` : 'primera';
  }
  return nombre ?? `tier ${state.career.tier}`;
}

function decisionFinPorMercado(state, ofertas, asientosAbiertos) {
  const motivoRetiro = `Ninguna org de ${quienYaNoTeQuiere(state)} te ofreció contrato en `
    + `${pretemporadasEnPalabras(state.flags.splitsSinOfertaEnTier)}.`;
  const ligasAbajo = [...new Set(ofertas.map((oferta) => nombreDeLigaEnMundo(state, oferta.liga) ?? `tier ${oferta.tier}`))];
  const abajo = ligasAbajo.join(' o ');
  const seguir = ofertas.length > 0
    ? { id: 'bajar', label: `Bajás a ${abajo}`, descripcion: `Jugar es jugar. Ves lo que te ofrecen en ${abajo} y elegís.` }
    : { id: 'esperar', label: 'Seguís buscando', descripcion: 'De free agent, a esperar que suene el teléfono. La cuenta no se resetea sola.' };
  const cierre = ofertas.length > 0
    ? `Más abajo sí te quieren: ${abajo}. ¿Bajás o colgás el mouse?`
    : 'Y nadie más te está llamando. ¿Seguís o colgás el mouse?';
  return {
    tipo: 'opciones',
    bisagra: true,
    titulo: 'El mercado ya habló',
    descripcion: `${motivoRetiro} ${cierre}`,
    opciones: [
      seguir,
      { id: 'retirarse', label: 'Colgás el mouse', descripcion: 'Cerrás la carrera acá. Con la puerta entreabierta, si el cuerpo y las ganas dan.' }
    ],
    datos: { motivo: 'fin_mercado', motivoRetiro, ofertas, asientosAbiertos }
  };
}

function resolverFinPorMercado(state, decision, respuesta, rng) {
  if (respuesta.opcionId === 'retirarse') {
    // El mundo sigue sin vos: los asientos que te habían congelado se llenan con un NPC (mismo cierre que el
    // silencio), y recién después te retirás.
    const cerrado = cerrarAsientosCongelados(state, null, rng);
    const retiro = retirarsePorMercado(cerrado.state, decision.datos.motivoRetiro);
    return { state: retiro.state, logs: [...cerrado.logs, ...retiro.logs] };
  }
  if (respuesta.opcionId === 'bajar') {
    return {
      state,
      logs: [crearLog('mercado', 'Bajás un escalón. Jugar es jugar: a ver qué hay.')],
      decision: construirDecisionOfertas(state, decision.datos.ofertas, { asientosAbiertos: decision.datos.asientosAbiertos })
    };
  }
  // K5c-R: seguir en tier 2 (con ofertas, la mano de siempre; sin ninguna, seguir buscando) vuelve a cero la presión.
  if (respuesta.opcionId === 'seguir') {
    const sigue = sinPresionTier2(state);
    return {
      state: sigue,
      logs: [crearLog('mercado', 'Seguís abajo. La cuenta de primera arranca de cero: a ganarte el llamado.')],
      decision: construirDecisionOfertas(sigue, decision.datos.ofertas, { asientosAbiertos: decision.datos.asientosAbiertos })
    };
  }
  const base = decision.datos.variante === 'presion_tier2' ? sinPresionTier2(state) : state;
  const silencio = elTelefonoNoSuena(base, rng);
  return { state: silencio.state, logs: [crearLog('mercado', 'Seguís buscando. El mercado no va a esperar para siempre.'), ...silencio.logs] };
}

// La regla del headless (y del bot `criterio`): joven, seguís (bajás o esperás); desde
// `edadAutoAceptaVeredicto`, aceptás el veredicto del mercado. K5c-R: la variante `presion_tier2` va por la misma regla
// (su primera opción es seguir en tier 2, o seguir buscando).
export function opcionAutoFinPorMercado(state, decision) {
  if (state.age >= BALANCE.retiro.edadAutoAceptaVeredicto) {
    return 'retirarse';
  }
  return decision.opciones[0].id;
}

// --- Aceptar una oferta (o pedir una mano nueva) ---

// `motivoFila`: el motivo con el que se cierra la fila de la org anterior en el
// registro. Por defecto se deriva del cambio de tier (ascenso/descenso/
// transferencia); 9Mf lo pasa explícito para el banquillo.
function aceptarOferta(state, oferta, rng, { motivoFila } = {}) {
  const esRenovacion = oferta.tag === 'renovacion';
  const contrato = {
    org: oferta.org, liga: oferta.liga, tier: oferta.tier,
    salarioAnualUSD: oferta.salarioAnualUSD,
    anios: oferta.anios, aniosRestantes: oferta.anios,
    // Fase 9Me: `contrato.clausula` deja de valer siempre `null` — si la
    // negociaste, viaja acá (regla 15: lo que la tarjeta promete, el motor lo
    // cumple). La consume 9Mf (traspasos a mitad de contrato).
    clausula: oferta.datos.clausula ?? null,
    tipo: oferta.datos.tipo,
    firmadoAEdad: state.age, firmadoEnAnio: state.calendario.anio,
    avisoNoRenovacion: false
  };
  const conClausula = contrato.clausula === 'salida' ? ' Con cláusula de salida.' : '';

  if (esRenovacion) {
    return {
      state: {
        ...state,
        flags: { ...state.flags, splitsSinOfertaConsecutivos: 0, pruebasFallidas: [] },
        career: {
          ...state.career, contrato,
          registro: registrarSalarioEnFila(state.career.registro, contrato.salarioAnualUSD)
        }
      },
      logs: [crearLog('mercado', `Renovás con ${oferta.org}: ${plata(contrato.salarioAnualUSD)}/año, ${contrato.anios} año(s).${conClausula}`)]
    };
  }

  // Revisión de K5: firmar (sin ser renovación) cierra la fila de la org de hoy, y la nueva la abre `roster.js`
  // cuando ve que cambió la org. Con la MISMA org esa fila no se abriría nunca: lo jugado quedaría sin fila para
  // siempre. Ningún camino del mercado lo hace (las ofertas excluyen tu org, el banquillo también): si vuelve a
  // pasar, que reviente acá, donde se rompe, y no splits más tarde en `registrarSplitJugado`.
  if (oferta.org === state.career.currentOrg) {
    throw new Error(`Firma con ${oferta.org} sin ser renovación estando ya en ${oferta.org}: la fila se cerraría y nadie abriría la nueva`);
  }

  // El motivo de cierre de fila para el registro: subiste de tier ('ascenso'),
  // bajaste ('descenso') o te moviste al mismo nivel ('transferencia'). Tier 1
  // es el número más bajo. 9Mf lo puede forzar ('banquillo').
  const tierPrevio = state.career.tier ?? 9;
  const motivoFilaFinal = motivoFila ?? (oferta.tier < tierPrevio ? 'ascenso'
    : (oferta.tier > tierPrevio ? 'descenso' : 'transferencia'));

  // K2b (PLAN.md "K2 — lo que midió la investigación", viñeta K2b.2): un
  // traspaso se juega con el plantel NUEVO desde este mismo split. `roster.js`
  // corre antes que el mercado, así que hasta K2a el primer split en la org
  // nueva se jugaba con los compañeros de la anterior (el 91% de los cambios de
  // liga). Ahora la lista se refresca al firmar con el plantel de la org nueva
  // (sin dado). Si venías sin equipo (sin compañeros), sigue vacía: el roster
  // lo arma `roster.js` el split que viene, como siempre. Si la org nueva no
  // tuviera plantel (no pasa: el mercado solo ofrece orgs con plantel, medido
  // 0 de 2.892 traspasos en 1.200 carreras), queda vacía igual: nunca se juega
  // con el plantel viejo.
  const companeros = state.career.companeros.length > 0
    ? (companerosDelPlantel(state, oferta.org) ?? [])
    : state.career.companeros;

  // K2b (revisión): con el plantel nuevo viene la química del plantel nuevo
  // — la regla de `armarRoster` (`sinergiaAlFichar`), tirada una sola vez acá y
  // pasada a `armarRoster` por `flags.sinergiaProyectadaAlFichar`. Sin
  // compañeros (venías sin equipo) no hay nada que resetear: lo arma el roster.
  const sinergiaAlFirmar = state.career.companeros.length > 0 ? sinergiaAlFichar(state, rng) : null;

  return {
    state: {
      ...state,
      flags: {
        ...state.flags,
        splitsSinOfertaConsecutivos: 0,
        // K5-C: firmaste (en tu tier o más abajo): la cuenta de "sin oferta en tu tier" arranca de cero en el nuevo.
        splitsSinOfertaEnTier: 0,
        pruebasFallidas: [],
        jerarquiaProyectadaAlFichar: oferta.datos.jerarquiaProyectada,
        sinergiaProyectadaAlFichar: sinergiaAlFirmar
      },
      career: {
        ...state.career,
        companeros,
        sinergia: sinergiaAlFirmar === null ? state.career.sinergia : Math.round(sinergiaAlFirmar),
        tier: oferta.tier, liga: oferta.liga, currentOrg: oferta.org,
        orgs: [...state.career.orgs, oferta.org],
        // "En qué split entraste a una liga real POR PRIMERA VEZ" (`core/state.js`,
        // `core/contexto.js:47`) — de un solo trazo. Bug encontrado en fase 11
        // (medido con `candidatoDebut` de `core/temporadaResumen.js`, D8):
        // sin el `=== null`, cada re-fichaje a tier 1 (transferencia,
        // renovación tras bajar y volver a subir) pisaba el split del debut
        // real con el de HOY, y tanto `calcularEtapa` (eje `debut`) como el
        // titular `debut` de la fase 11 leían un debut que no era.
        splitAscensoTier1: oferta.tier === 1 && state.career.splitAscensoTier1 === null
          ? state.player.splitCount
          : state.career.splitAscensoTier1,
        // K5c-R: el primer contrato de tier 2 o tier 1 marca desde cuándo se cuentan los años pro (el de tier 3 no cuenta).
        splitPrimerContratoTier2: oferta.tier <= 2 && state.career.splitPrimerContratoTier2 == null
          ? state.player.splitCount
          : state.career.splitPrimerContratoTier2,
        contrato,
        registro: conFilaCerrada(state, motivoFilaFinal)
      }
    },
    logs: [crearLog('mercado', `Firmás con ${oferta.org} (${nombreVisibleDeLiga(oferta.liga)}): ${plata(contrato.salarioAnualUSD)}/año, ${contrato.anios} año(s).${conClausula}`)]
  };
}

// --- Fase 9Mf: traspasos a mitad de contrato, y el banquillo (§9M.7) ---
//
// Hoy, con el contrato corriendo, el mercado imprime una línea y no pasa nada
// (3,80 pretemporadas por carrera desperdiciadas). Desde acá: un club grande
// puede venir a buscarte a mitad de contrato, y si tu nivel cae por debajo del
// suplente perdés la titularidad — la puerta al declive.

// El pretendiente a mitad de contrato: sale de `orgsQueTeFicharian` (asiento
// abierto en tu rol, te puede pagar, entrás en su banda) y tiene que ser
// bastante más fuerte que tu org actual — una salida hacia arriba, no lateral.
// Devuelve una decisión `motivo: 'traspaso'` o `null` si nadie califica o no
// sale el dado.
function ofertaDeTraspaso(state, rng) {
  const m = BALANCE.mercado;
  const ligaActual = ligaDeCarrera(state);
  const orgActual = ligaActual?.orgs.find((org) => org.nombre === state.career.currentOrg);
  if (!orgActual) {
    return null;
  }

  const fichadores = orgsQueTeFicharian(state);
  const pretendiente = fichadores
    .filter((entrada) => entrada.org.fuerza >= orgActual.fuerza + m.traspasoBrechaFuerzaMin)
    .sort((a, b) => b.org.fuerza - a.org.fuerza)[0];
  if (!pretendiente || !chance(m.probTraspasoMitadContrato, rng)) {
    return null;
  }

  const { org, liga } = pretendiente;
  const ofertaCruda = construirOferta(state, liga, org, null, rng);
  // Un club que te saca a mitad de contrato viene a mejorar lo que ganás — si
  // no, no te moverías. Piso: `traspasoSalarioMinFactor` sobre el contrato
  // vigente (el ruido lognormal de `salarioDeOferta` no debería dejar la
  // propuesta por debajo de lo que ya cobrás).
  const salarioAnualUSD = Math.max(
    ofertaCruda.salarioAnualUSD,
    Math.round(state.career.contrato.salarioAnualUSD * m.traspasoSalarioMinFactor)
  );
  const oferta = {
    ...ofertaCruda, salarioAnualUSD,
    negociacion: { ...ofertaCruda.negociacion, salarioBase: salarioAnualUSD }
  };
  const conClausula = state.career.contrato.clausula === 'salida';
  const traspasoUSD = Math.round(
    valorDeMercado(state) * m.traspasoBaseFactor
    * (1 + Math.max(0, state.career.contrato.aniosRestantes) * m.traspasoPorAnioRestante)
  );

  const quedarse = {
    id: 'quedarse', tipo: 'quedarse',
    label: `Quedarte en ${state.career.currentOrg}`,
    descripcion: 'Seguís tu contrato como estaba.'
  };
  const aceptar = {
    ...oferta, id: 'aceptar', tipo: 'aceptar',
    label: `Aceptar: irte a ${org.nombre} (${nombreVisibleDeLiga(liga.id)})`,
    descripcion: conClausula
      ? `Tenés cláusula: te vas y ${state.career.currentOrg} cobra ${plata(traspasoUSD)}. No opina.`
      : `${org.nombre} pone ${plata(traspasoUSD)} de traspaso. ${state.career.currentOrg} decide si te suelta.`
  };
  const opciones = conClausula
    ? [aceptar, quedarse]
    : [aceptar, {
      ...oferta, id: 'pedirSalir', tipo: 'pedirSalir',
      label: 'Pedir salir',
      descripcion: 'Apretás para irte. Si te lo niegan, se resiente el clima del equipo: perdés arraigo y jerarquía.'
    }, quedarse];

  return {
    tipo: 'opciones',
    presentacion: 'mercado',
    titulo: 'Te quieren a mitad de contrato',
    descripcion: `${org.nombre} preguntó por vos. Te quedan ${state.career.contrato.aniosRestantes} año(s) de contrato con ${state.career.currentOrg}.`,
    opciones,
    datos: {
      motivo: 'traspaso',
      conClausula,
      traspasoUSD,
      comprador: org.nombre,
      representanteDisponible: false,
      // Fase 9Mg: la misma pantalla de tres bloques. Bloque 1 (vos) y bloque 3
      // (mundo + asientos abiertos), acá con el contrato VIGENTE y sus años. El
      // comprador se pasa como "oferta" para que el helper lo excluya.
      vos: vosEnElMercado(state),
      traspasosMundo: traspasosParaPantalla(state),
      asientosAbiertos: asientosAbiertosParaPantalla(state, [{ org: org.nombre }], fichadores),
      negociacionesRotas: [],
      clubesInteresados: []
    }
  };
}

// Resuelve el traspaso: quedarse (nada cambia), aceptar (tu club decide si te
// suelta, salvo cláusula), o pedir salir (empuja a favor, pero si te lo niegan
// cuesta arraigo y jerarquía). El `traspasoUSD` lo cobra tu club, no vos: no
// entra a `registro.dineroTotalUSD`.
function resolverTraspaso(state, decision, respuesta, rng) {
  const m = BALANCE.mercado;
  const elegida = decision.opciones.find((opcion) => opcion.id === respuesta.opcionId)
    ?? decision.opciones.find((opcion) => opcion.id === 'quedarse');

  if (elegida.tipo === 'quedarse') {
    return { state, logs: [crearLog('mercado', `Te quedás en ${state.career.currentOrg}. El traspaso no se hace.`)] };
  }

  const ligaActual = ligaDeCarrera(state);
  const orgActual = ligaActual?.orgs.find((org) => org.nombre === state.career.currentOrg);
  const brechaNivel = nivelDelJugador(state) - (orgActual?.fuerza ?? 0);

  let teSuelta = decision.datos.conClausula;
  if (!teSuelta) {
    const probRetiene = clamp(
      m.clubRetieneBase + Math.max(0, brechaNivel) * m.clubRetienePorBrechaNivel
      - (elegida.tipo === 'pedirSalir' ? m.pedirSalirBonusSalida : 0),
      0, 1
    );
    teSuelta = !chance(probRetiene, rng);
  }

  if (!teSuelta) {
    if (elegida.tipo === 'pedirSalir') {
      const arraigoNuevo = Math.round(clampStat(state.career.arraigo * (1 - m.pedirSalirCastigoArraigo)));
      const jerarquiaNueva = Math.round(clampStat(state.career.jerarquia * (1 - m.pedirSalirCastigoJerarquia)));
      return {
        state: {
          ...state,
          career: {
            ...state.career, arraigo: arraigoNuevo, jerarquia: jerarquiaNueva,
            registro: registrarArraigoEnFila(state.career.registro, arraigoNuevo)
          }
        },
        logs: [crearLog('mercado', `${state.career.currentOrg} te niega la salida y el pedido no cayó bien: perdés peso en el equipo.`)]
      };
    }
    return { state, logs: [crearLog('mercado', `${decision.datos.comprador} preguntó, pero ${state.career.currentOrg} no te suelta. Seguís.`)] };
  }

  const origen = state.career.currentOrg;
  const firmado = aceptarOferta(state, elegida, rng, { motivoFila: 'transferencia' });
  const cerrado = cerrarAsientosCongelados(firmado.state, elegida.org, rng, new Set([elegida.org]));
  const clausulaTxt = decision.datos.conClausula ? ' Se ejecuta la cláusula.' : '';
  return {
    state: cerrado.state,
    logs: [
      crearLog('mercado', `Traspaso cerrado: te vas de ${origen} a ${elegida.org} a mitad de contrato por ${plata(decision.datos.traspasoUSD)}.${clausulaTxt}`),
      ...firmado.logs,
      ...cerrado.logs
    ]
  };
}

// El banquillo: `rendimiento.js` marcó `flags.banquilloPendiente`. Tu club te
// cede a la liga de desarrollo de su región — la org tier-2 más débil te toma,
// con el contrato reescrito hacia abajo. Desde ahí se pelea la vuelta, o se
// termina la carrera (fase 10). Sin liga de desarrollo en la región (import
// relegado, raro) el banquillo te deja sin equipo. No es una decisión: te
// sentaron.
//
// Revisión de K5: la org que te sienta nunca es la que te toma. Si tu club ya
// juega la liga de desarrollo (bajó entero en este mismo receso, o el banco te
// agarró en tier 2) y era la más débil, el `sort()[0]` te re-firmaba con tu
// propio club: `aceptarOferta` cerraba su fila y `roster.js`, que abre la fila
// cuando cambia la org, nunca abría la nueva. Cada split siguiente quedaba en
// `flags.splitJugadoSinFila` y el próximo pase reventaba en
// `registrarSplitJugado`. Devuelve `{ dev, org }`, o `null` si en la liga de
// desarrollo de tu región no hay otra org que te tome.
export function academiaDelBanquillo(state) {
  const regionId = ligaDeCarrera(state)?.regionId ?? state.mundo.regionIdOrigen;
  const dev = state.mundo.ligas.find((liga) => liga.tier === 2 && liga.regionId === regionId);
  const candidatas = (dev?.orgs ?? []).filter((org) => org.nombre !== state.career.currentOrg);
  if (candidatas.length === 0) {
    return null;
  }
  return { dev, org: [...candidatas].sort((a, b) => a.fuerza - b.fuerza)[0] };
}

function resolverBanquillo(state, logsPrevios, rng) {
  const origen = state.career.currentOrg;
  const academia = academiaDelBanquillo(state);

  if (!academia) {
    return {
      state: {
        ...state,
        flags: {
          ...state.flags, banquilloPendiente: false,
          splitsSinOfertaConsecutivos: state.flags.splitsSinOfertaConsecutivos + 1
        },
        career: {
          ...state.career, currentOrg: null, liga: null, rosterDeOrg: null, companeros: [], sinergia: 0,
          contrato: { ...state.career.contrato, avisoNoRenovacion: false },
          registro: conFilaCerrada(state, 'banquillo')
        }
      },
      logs: [...logsPrevios, crearLog('mercado', `${origen} te deja fuera del equipo y no hay academia donde jugar. Te quedás sin lugar.`)]
    };
  }

  // Revisión de K5: la academia de un club EXTRANJERO (un import en la LCP te sienta y te cede a LCP Challengers) es
  // una tier 2 que no es la de tu región, y esas no tienen planteles (`ligasConPlantel`). Sin planteles el mercado no
  // la ve: ni `orgsQueTeFicharian` ni el piso de franquicia (que solo prueba orgs con plantel) encuentran a nadie, y
  // al vencer el contrato una franquicia de esa liga se quedaba con "Nadie te llama" — medido: seed 1088, split 54,
  // 59,7 de nivel en LCP Challengers (prestigio 38), ninguna de sus 10 orgs con plantel. Igual que el descenso, la
  // liga de destino se puebla al vuelo (sin tirada si ya tenía).
  const { dev, org: orgDestino } = academia;
  const conAcademia = { ...state, mundo: { ...state.mundo, planteles: conPlantelesDe(state, dev, rng) } };
  const oferta = construirOferta(conAcademia, dev, orgDestino, null, rng);
  const firmado = aceptarOferta(conAcademia, { ...oferta, id: oferta.org }, rng, { motivoFila: 'banquillo' });
  return {
    state: { ...firmado.state, flags: { ...firmado.state.flags, banquilloPendiente: false } },
    logs: [
      ...logsPrevios,
      crearLog('mercado', `${origen} te manda a la academia: bajás a ${nombreVisibleDeLiga(dev.id)} con ${orgDestino.nombre}. Desde abajo se vuelve.`),
      ...firmado.logs
    ]
  };
}

// --- Fase 9Me: negociar, no aceptar (§9M.6) ---
//
// Tres acciones DENTRO de la misma decisión de mercado (trampa T9: la
// interrupción no se multiplica) — `resolver` devuelve otra vez la decisión,
// igual que el representante. `resolverAuto` nunca las produce, así que el
// pipeline headless jamás entra al bucle de negociación.

// Las orgs cuyo asiento se cierra con nombre cuando el jugador firma o espera:
// las que fueron tarjeta lateral + las que se levantaron de la mesa por apretar
// de más (check 10: ninguna oferta rechazada desaparece sin un log de quién la
// tomó).
function orgsOfrecidasDe(decision) {
  return new Set([
    ...decision.opciones.filter((o) => o.tag !== 'renovacion' && !o.forzadaFranquicia).map((o) => o.org),
    ...(decision.datos.negociacionesRotas ?? []).map((r) => r.org)
  ]);
}

// "Esperar": no se firma nada esta ventana. Los asientos congelados se cierran
// (con nombre si eran tarjetas laterales) y la racha sin equipo corre — si
// llega al tope, quedás libre. Reutilizado cuando se cae la última oferta.
function resolverEspera(state, decision, rng, motivo) {
  const racha = state.flags.splitsSinOfertaConsecutivos + 1;
  if (racha >= BALANCE.mercado.splitsSinOfertaParaLibre) {
    const libre = quedarLibre(state, racha, rng);
    return { state: libre.state, logs: [crearLog('mercado', motivo), ...libre.logs] };
  }
  const cerrado = cerrarAsientosCongelados(state, null, rng, orgsOfrecidasDe(decision));
  return {
    state: { ...cerrado.state, flags: { ...cerrado.state.flags, splitsSinOfertaConsecutivos: racha } },
    logs: [crearLog('mercado', motivo), ...cerrado.logs]
  };
}

// Pedir más: el club sube el número, contraoferta a medias, o se levanta de la
// mesa — pesado por cuánto te quieren (tu nivel sobre su mejor alternativa) y
// por cuántos escalones ya pediste. Devuelve { ofertas, logs, nuevasRotas, corte }.
function negociarPedirMas(ofertas, idx, state, rng) {
  const m = BALANCE.mercado;
  const oferta = ofertas[idx];
  const neg = oferta.negociacion ?? { escalones: 0, clausula: false, salarioBase: oferta.salarioAnualUSD };
  if (neg.escalones >= m.escalonesNegociacionMax) {
    return { ofertas, logs: [crearLog('mercado', `${oferta.org} no se mueve más del número.`)], nuevasRotas: [] };
  }

  const brecha = nivelDelJugador(state) - referenteDeNegociacion(state, oferta.org);
  const probRuptura = clamp(
    m.rupturaNegociacionBase - brecha * m.rupturaPorBrechaNivel + neg.escalones * m.rupturaPorEscalonPedido,
    m.rupturaNegociacionMin, m.rupturaNegociacionMax
  );

  if (chance(probRuptura, rng)) {
    const ofertasRestantes = ofertas.filter((_, i) => i !== idx);
    return {
      ofertas: ofertasRestantes,
      logs: [crearLog('mercado', `${oferta.org} se levanta de la mesa: apretaste de más.`)],
      nuevasRotas: [{ org: oferta.org, rol: state.player.role }],
      corte: ofertasRestantes.length === 0
    };
  }

  const entero = chance(m.probAceptaEscalonEntero, rng);
  const suba = Math.round(neg.salarioBase * m.escalonNegociacionFactor * (entero ? 1 : m.contraofertaFactor));
  const actualizada = {
    ...oferta,
    salarioAnualUSD: oferta.salarioAnualUSD + suba,
    negociacion: { ...neg, escalones: neg.escalones + 1 }
  };
  return {
    ofertas: ofertas.map((o, i) => (i === idx ? actualizada : o)),
    logs: [crearLog('mercado', entero
      ? `${oferta.org} sube la oferta a ${plata(actualizada.salarioAnualUSD)}/año.`
      : `${oferta.org} no llega a todo, pero contraoferta: ${plata(actualizada.salarioAnualUSD)}/año.`)],
    nuevasRotas: []
  };
}

// Pedir cláusula de salida: `contrato.clausula` deja de valer siempre `null`.
// Se paga con sueldo. A cambio, un club grande te puede sacar a mitad de
// contrato (lo consume 9Mf). Trato directo, sin dado.
function negociarClausula(ofertas, idx) {
  const m = BALANCE.mercado;
  const oferta = ofertas[idx];
  const neg = oferta.negociacion ?? { escalones: 0, clausula: false, salarioBase: oferta.salarioAnualUSD };
  if (neg.clausula) {
    return { ofertas, logs: [crearLog('mercado', `${oferta.org} ya te incluyó la cláusula.`)], nuevasRotas: [] };
  }
  const costo = Math.round(oferta.salarioAnualUSD * m.precioClausulaSalida);
  const actualizada = {
    ...oferta,
    salarioAnualUSD: oferta.salarioAnualUSD - costo,
    negociacion: { ...neg, clausula: true },
    datos: { ...oferta.datos, clausula: 'salida' }
  };
  return {
    ofertas: ofertas.map((o, i) => (i === idx ? actualizada : o)),
    logs: [crearLog('mercado', `${oferta.org} te suma la cláusula de salida: cuesta ${plata(costo)} de sueldo (${plata(actualizada.salarioAnualUSD)}/año).`)],
    nuevasRotas: []
  };
}

// K4 (integración): si la oferta elegida es un salto grande, `resolverMercado` devuelve la prueba (K4-C) como la
// decisión re-presentada, y al contestarla se firma: una pantalla más, no otra parada.
export function resolver(state, decision, respuesta, rng) {
  return resolverMercado(state, decision, respuesta, rng);
}

// K4-C: la prueba del salto grande (tier 2, tier 1, import). Frena ANTES de firmar con el minijuego `tryout`
// (el mismo de la prueba amateur); el resultado corre cuánto crédito llevás de entrada, igual que en amateur
// (`flags.bonusJerarquiaTryout`, lo cobra `roster.js`). `null` si el catálogo no tiene minijuego de tryout.
// K4c-S: la prueba también decide el contrato (`probabilidadDeFirmarTrasPrueba`). Si no alcanza, se cae esa oferta y
// seguís con el respaldo (`respaldoDePrueba`): la pausa lleva consigo las otras ofertas (`otras`), cuál es el respaldo
// (`respaldo`, el id) y lo que el camino de "sin ofertas" necesita (`carry`, el mismo de la negociación).
function pausaDePrueba(state, oferta, saltos, decision) {
  const ofrecidas = orgsOfrecidasDe(decision);
  const entrada = elegirMinijuego(state, 'tryout');
  if (!entrada) {
    return null;
  }
  const textos = textoDeMinijuego(entrada, state);
  const otras = decision.opciones.filter((opcion) => opcion.id !== oferta.id);
  const respaldo = respaldoDePrueba(state, otras);
  return {
    state: { ...state, flags: { ...state.flags, minijuegosRecientes: registrarMinijuegoVisto(state, entrada.id) } },
    logs: [],
    decision: {
      tipo: 'opciones',
      presentacion: 'minijuego',
      titulo: textos.titulo,
      descripcion: textos.descripcion,
      opciones: [],
      datos: {
        motivo: 'minijuego',
        minijuego: entrada.id,
        momento: 'tryout',
        statRelevante: entrada.statRelevante,
        // Regla 15: la apuesta dice también qué pasa si no alcanza (el respaldo que aplica `caeLaOfertaPorLaPrueba`).
        apuesta: `${textos.apuesta} ${textoDeRespaldo(respaldo)}`,
        oferta,
        saltos,
        // Array, no el `Set` de `orgsOfrecidasDe`: la pausa vive en `state.pendiente` y se guarda con
        // JSON, que convierte un `Set` en `{}` (al recargar, `cerrarAsientosCongelados` tiraba).
        ofrecidas: [...ofrecidas],
        otras,
        respaldo: respaldo?.id ?? null,
        carry: {
          negociacionesRotas: decision.datos.negociacionesRotas ?? [],
          clubesInteresados: decision.datos.clubesInteresados ?? [],
          asientosAbiertos: decision.datos.asientosAbiertos ?? []
        }
      }
    }
  };
}

function resolverPrueba(state, decision, respuesta, rng) {
  const { oferta, saltos, ofrecidas } = decision.datos;
  const resultado = clamp(respuesta.resultado ?? 0.5, 0, 1);
  // K4c-S: la prueba decide el contrato. Un solo sorteo, siempre (también con p = 0 o 1), para que el stream no dependa
  // del resultado.
  const alcanza = chance(probabilidadDeFirmarTrasPrueba(resultado), rng);
  if (!alcanza) {
    return caeLaOfertaPorLaPrueba(state, decision, rng);
  }
  const bonus = Math.round(ajusteBaseDeMinijuego(resultado) * minijuegoPorId(decision.datos.minijuego).impacto);
  const conBonus = {
    ...state,
    flags: {
      ...state.flags,
      bonusJerarquiaTryout: bonus,
      saltosConPrueba: [...(state.flags.saltosConPrueba ?? []), ...saltos]
    }
  };
  const firmado = aceptarOferta(conBonus, oferta, rng);
  const cerrado = cerrarAsientosCongelados(firmado.state, oferta.org, rng, new Set(ofrecidas));
  const veredicto = crearLog('mercado', bonus >= 0
    ? `La prueba en ${oferta.org} te sale bien: firmás y llegás con algo de crédito ganado de entrada.`
    : `La prueba en ${oferta.org} es floja, pero alcanza: firmás, sin nada ganado de entrada.`);
  return { state: cerrado.state, logs: [veredicto, ...firmado.logs, ...cerrado.logs] };
}

// K4c (paso 3a): el respaldo de la prueba. Si la prueba no alcanza, la parada NO se re-abre con las demás ofertas: eso
// era una segunda parada de mercado en la misma pretemporada (y, si la siguiente también estrenaba un salto, otra prueba
// más), contra K4-D ("una parada por año; el tryout, como mucho una pantalla extra"). Seguís con tu club si te renovaba
// o, si no, con la oferta de más sueldo de las que no piden otra prueba. `null` si no queda ninguna. Puro, sin rng: lo
// anuncia la prueba antes de jugarla (regla 15).
function respaldoDePrueba(state, otras) {
  const sinPrueba = otras.filter((opcion) => saltosDeFichaje(state, opcion).length === 0);
  return sinPrueba.find((opcion) => opcion.tag === 'renovacion')
    ?? sinPrueba.reduce((mejor, opcion) => (mejor === null || opcion.salarioAnualUSD > mejor.salarioAnualUSD ? opcion : mejor), null);
}

// K4c (revisión): una pausa del mercado que dejó parada un guardado de VERSION 10 (`core/guardado.js`, `migrarDe10`), rearmada
// con lo de hoy. Sin `preparacion` (la práctica ya no se elige en la pretemporada); y la prueba, con su respaldo (por la misma
// regla: si el guardado no trae `otras`, no hay con quién seguir) y la apuesta y los textos actuales, que dicen qué pasa si no
// alcanza (regla 15: la prueba de VERSION 10 firmaba siempre). Pura, sin rng.
export function pausaDeMercadoMigrada(state, decision) {
  const { preparacion, ...datos } = decision.datos ?? {};
  if (datos.motivo !== 'minijuego' || datos.momento !== 'tryout') {
    return { ...decision, datos };
  }
  const otras = datos.otras ?? [];
  const respaldo = datos.respaldo === undefined
    ? respaldoDePrueba(state, otras)
    : otras.find((opcion) => opcion.id === datos.respaldo) ?? null;
  const textos = textoDeMinijuego(minijuegoPorId(datos.minijuego), state);
  return {
    ...decision,
    titulo: textos.titulo,
    descripcion: textos.descripcion,
    datos: { ...datos, otras, carry: datos.carry ?? {}, respaldo: respaldo?.id ?? null, apuesta: `${textos.apuesta} ${textoDeRespaldo(respaldo)}` }
  };
}

function textoDeRespaldo(respaldo) {
  if (!respaldo) {
    return 'Si no alcanza, esta ventana no firmás con nadie.';
  }
  return respaldo.tag === 'renovacion'
    ? `Si no alcanza, renovás con ${respaldo.org}.`
    : `Si no alcanza, firmás con ${respaldo.org}, la mejor oferta que te queda sin prueba.`;
}

// K4c-S: la prueba no alcanzó. La oferta se cae (no queda crédito, y el salto no cuenta como probado: la próxima oferta
// que lo estrene vuelve a pedir su prueba) y se firma el respaldo que anunció la prueba, en la misma parada (K4c, paso
// 3a: antes la parada se re-presentaba con las demás ofertas). El asiento que se cae cuenta como los que se levantan de
// la mesa: `cerrarAsientosCongelados` lo cierra con nombre. Sin respaldo, se sigue por el camino de siempre de "no queda
// nada que firmar" (`resolverEspera`): el contrato no se toca.
function caeLaOfertaPorLaPrueba(state, decision, rng) {
  // Un guardado hecho antes de K4c-S con la prueba pendiente no trae `otras` ni `carry`: se cae la oferta y no queda otra.
  // Uno de K4c-S, antes del paso 3a, no trae `respaldo`: se calcula con la misma regla.
  const { oferta, otras = [], carry = {} } = decision.datos;
  const respaldo = decision.datos.respaldo === undefined
    ? respaldoDePrueba(state, otras)
    : otras.find((opcion) => opcion.id === decision.datos.respaldo) ?? null;
  const aviso = `La prueba en ${oferta.org} no alcanza: se cae la oferta`;
  if (!respaldo) {
    const sinNada = construirDecisionOfertas(state, otras, {
      negociacionesRotas: [...(carry.negociacionesRotas ?? []), { org: oferta.org, rol: state.player.role }],
      clubesInteresados: carry.clubesInteresados ?? [],
      asientosAbiertos: carry.asientosAbiertos ?? []
    });
    return probasteYNoAlcanzo(state, sinNada, oferta, otras.length > 0, aviso, rng);
  }
  const firmado = aceptarOferta(state, respaldo, rng);
  const ofrecidas = new Set([...(decision.datos.ofrecidas ?? []), oferta.org]);
  const cerrado = cerrarAsientosCongelados(firmado.state, respaldo.org, rng, ofrecidas);
  return {
    state: cerrado.state,
    logs: [crearLog('mercado', `${aviso} y seguís con ${respaldo.org}.`), ...firmado.logs, ...cerrado.logs]
  };
}

// K4c (revisión): la prueba no alcanzó y no hay respaldo (las demás ofertas, si había, también pedían prueba). Es su propio
// caso, no el silencio del mercado: no suma a `splitsSinOfertaConsecutivos` (antes iba por `resolverEspera`, y con seis
// ofertas en la mesa podía decir "Nadie te ofrece nada" y dejarte libre), queda anotada en `flags.pruebasFallidas` para que
// el declive diga lo que pasó (`systems/retiro.js`), y el contrato no se toca. Los asientos congelados se cierran como al
// esperar (con nombre los que te ofrecían).
function probasteYNoAlcanzo(state, sinNada, oferta, habiaOtras, aviso, rng) {
  const cerrado = cerrarAsientosCongelados(state, null, rng, orgsOfrecidasDe(sinNada));
  const lasDemas = habiaOtras ? ', y las demás también pedían prueba' : '';
  return {
    state: {
      ...cerrado.state,
      flags: { ...cerrado.state.flags, pruebasFallidas: [...(cerrado.state.flags.pruebasFallidas ?? []), oferta.org] }
    },
    logs: [crearLog('mercado', `${aviso}${lasDemas}. Probaste y no alcanzó: esta ventana no firmás con nadie.`), ...cerrado.logs]
  };
}

function resolverMercado(state, decision, respuesta, rng) {
  if (decision.datos.motivo === 'fin_mercado') {
    return resolverFinPorMercado(state, decision, respuesta, rng);
  }
  if (decision.datos.motivo === 'minijuego') {
    return resolverPrueba(state, decision, respuesta, rng);
  }

  // Fase 9Mf: traspaso a mitad de contrato — quedarse / aceptar / pedir salir.
  // No se re-presenta: se resuelve de una.
  if (decision.datos.motivo === 'traspaso') {
    return resolverTraspaso(state, decision, respuesta, rng);
  }

  // El representante ya no rebaraja (§9M.6): te dice qué clubes te miran sin
  // haber ofertado todavía. Una sola vez por carrera; si ya se usó, la UI no
  // debería ofrecer el botón, pero el motor no confía en eso.
  if (respuesta.representante) {
    if (state.flags.llamadaRepresentante) {
      return { state, logs: [], decision };
    }
    const stConLlamada = { ...state, flags: { ...state.flags, llamadaRepresentante: true } };
    // Ni las que ya son tarjeta, ni las que se levantaron de la mesa por apretar
    // de más (esas ya no te miran).
    const fuera = new Set([
      ...decision.opciones.map((o) => o.org),
      ...(decision.datos.negociacionesRotas ?? []).map((r) => r.org)
    ]);
    const interesados = orgsQueTeFicharian(stConLlamada)
      .filter((entrada) => !fuera.has(entrada.org.nombre))
      .sort((a, b) => b.presupuesto - a.presupuesto)
      .slice(0, BALANCE.mercado.clubesInteresadosMax)
      .map((entrada) => ({ org: entrada.org.nombre, liga: entrada.liga.id, motivo: entrada.motivo }));
    return {
      state: stConLlamada,
      logs: [crearLog('mercado', interesados.length
        ? `Tu representante te dice quién te sigue: ${interesados.map((i) => i.org).join(', ')}.`
        : 'Tu representante mueve hilos, pero nadie más está mirando tu puesto ahora.')],
      decision: construirDecisionOfertas(stConLlamada, decision.opciones, {
        negociacionesRotas: decision.datos.negociacionesRotas ?? [],
        clubesInteresados: interesados,
        asientosAbiertos: decision.datos.asientosAbiertos ?? []
      })
    };
  }

  // Esperar: no firmás nada esta ventana.
  if (respuesta.negociar === 'esperar') {
    return resolverEspera(state, decision, rng, 'Elegís esperar: esta ventana no firmás con nadie.');
  }

  // Negociar sobre una oferta concreta (pedir más / pedir cláusula).
  if (respuesta.negociar) {
    const idx = decision.opciones.findIndex((o) => o.id === respuesta.opcionId);
    if (idx < 0) {
      return { state, logs: [], decision };
    }
    const res = respuesta.negociar === 'clausula'
      ? negociarClausula(decision.opciones, idx)
      : negociarPedirMas(decision.opciones, idx, state, rng);
    const negociacionesRotas = [...(decision.datos.negociacionesRotas ?? []), ...res.nuevasRotas];

    if (res.corte) {
      const decisionActualizada = construirDecisionOfertas(state, res.ofertas, {
        negociacionesRotas,
        clubesInteresados: decision.datos.clubesInteresados,
        asientosAbiertos: decision.datos.asientosAbiertos ?? []
      });
      return resolverEspera(state, decisionActualizada, rng, `${res.logs[0].message} No queda nada que firmar esta ventana.`);
    }

    return {
      state,
      logs: res.logs,
      decision: construirDecisionOfertas(state, res.ofertas, {
        negociacionesRotas,
        clubesInteresados: decision.datos.clubesInteresados ?? [],
        asientosAbiertos: decision.datos.asientosAbiertos ?? []
      })
    };
  }

  // Firmar.
  const elegida = decision.opciones.find((opcion) => opcion.id === respuesta.opcionId);
  // K4-C: si este fichaje estrena un salto grande (tier 2, tier 1, import), antes va la prueba.
  const saltos = saltosDeFichaje(state, elegida);
  if (saltos.length > 0) {
    const pausa = pausaDePrueba(state, elegida, saltos, decision);
    if (pausa) {
      return pausa;
    }
  }
  const firmado = aceptarOferta(state, elegida, rng);
  // Fase 9Mc: firmaste — los demás asientos que te habían ofrecido se cierran
  // con un NPC, y el log lo dice con nombre ("el mundo siguió sin vos"). Sólo
  // las orgs que aparecieron como tarjeta lateral (o se levantaron de la mesa
  // por apretar de más) dan ese log.
  const cerrado = cerrarAsientosCongelados(firmado.state, elegida.org, rng, orgsOfrecidasDe(decision));
  return { state: cerrado.state, logs: [...firmado.logs, ...cerrado.logs] };
}

export function resolverAuto(state, decision, rng) {
  // K4-C: la prueba del salto.
  if (decision.datos.motivo === 'minijuego') {
    // Regla 5 de 4.6: Node simula el minijuego con gauss corrido por el stat relevante.
    const entrada = minijuegoPorId(decision.datos.minijuego);
    const valor = state.player.stats[decision.datos.statRelevante] ?? 50;
    return { resultado: clamp(gauss(valor / 100, entrada.spread, rng), 0, 1) };
  }
  return resolverAutoMercado(state, decision, rng);
}

function resolverAutoMercado(state, decision, rng) {
  if (decision.datos.motivo === 'fin_mercado') {
    return { opcionId: opcionAutoFinPorMercado(state, decision) };
  }
  // Fase 9Mf: el `aceptar` de un traspaso es, por construcción, un club bastante
  // más fuerte — un paso arriba en lo deportivo. El headless lo toma salvo que
  // sea un recorte de sueldo real (`traspasoAutoRecorteMax`). Determinista, sin
  // rng: el stream lo corre `resolver` al firmar (D35), no esta elección.
  if (decision.datos.motivo === 'traspaso') {
    const aceptar = decision.opciones.find((opcion) => opcion.id === 'aceptar');
    const vale = aceptar
      && aceptar.salarioAnualUSD >= state.career.contrato.salarioAnualUSD * BALANCE.mercado.traspasoAutoRecorteMax;
    return { opcionId: vale ? 'aceptar' : 'quedarse' };
  }
  const elegida = weightedPick(decision.opciones, (opcion) => Math.max(1, opcion.salarioAnualUSD), rng);
  return { opcionId: elegida.id };
}
