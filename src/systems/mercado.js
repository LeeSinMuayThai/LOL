import { chance, weightedPick, roll } from '../core/rng.js';
import { clamp, clampStat } from '../core/numeros.js';
import { crearLog } from '../core/log.js';
import { plata } from '../core/formato.js';
import { calcularContexto } from '../core/contexto.js';
import { ligaDeCarrera } from '../core/competicion.js';
import { salarioDeOferta } from '../core/salarios.js';
import { valorDeMercado, sesgoEtario } from '../core/valorMercado.js';
import { cerrarFila, registrarPico, registrarSalarioEnFila, registrarArraigoEnFila, arraigoInicial } from '../core/registro.js';
import { bandaDeJerarquia, bandaDeArraigoFicha, nivelDelJugador } from '../core/ficha.js';
import { orgsQueTeFicharian, ofertaPosible, esResidenteDe } from '../core/demanda.js';
import { resolverMercadoMundial, cerrarAsientosCongelados } from '../core/mercadoMundial.js';
import { jerarquiaAlFichar } from './roster.js';
import { BALANCE } from '../data/balance.js';

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

// Fase 9Me (§9M.6): la "mejor alternativa" de una org a ficharte para tu rol —
// su titular NPC (si no sos vos), o el mejor agente libre que quedó dando
// vueltas este offseason. Es lo que pesa cuánto te quieren cuando pedís más: si
// tu nivel está muy por encima de eso, difícil que se levanten de la mesa.
function nivelAlternativaAsiento(state, orgNombre) {
  const rol = state.player.role;
  const asiento = state.mundo.planteles?.[orgNombre]?.[rol];
  const nivelNpc = asiento && !asiento.esJugador ? (asiento.nivel ?? 0) : 0;
  const libres = state.mundo.mercadoPretemporada?.libresRestantes ?? [];
  const mejorLibre = libres.reduce((max, npc) => Math.max(max, npc?.nivel ?? 0), 0);
  const org = orgDelMundo(state, orgNombre);
  return Math.max(nivelNpc, mejorLibre, (org?.fuerza ?? 0) - BALANCE.mercado.margenBombazoFuerza);
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

function construirOferta(state, liga, org, tagForzado, rng) {
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

  const tag = tagForzado ?? (
    salarioAnualUSD > state.career.contrato.salarioAnualUSD * m.bombazoMultiplo ? 'bombazo' : 'lateral'
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
      ? 'Vas a competir por un lugar en un vestuario cargado de estrellas.'
      : 'Acá vas a tener margen para mandar vos.');

  // Fase 9Me: cuánto te quieren, para el texto de riesgo de "pedir más". La
  // brecha entre tu nivel y su mejor alternativa gobierna si el club aguanta el
  // apriete o se va a otro (`negociarPedirMas`).
  const brechaNegociacion = nivelDelJugador(state) - nivelAlternativaAsiento(state, org.nombre);
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
    // Fase 9Me: estado de la negociación (arranca en cero) e info para el
    // texto de riesgo. `salarioBase` es el ancla para calcular los escalones.
    negociacion: { escalones: 0, clausula: false, salarioBase: salarioAnualUSD },
    negociacionInfo,
    label: `${org.nombre} · ${liga.id}`,
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

// La mano de ofertas: la renovación de tu club (si te quieren) + las orgs del
// MUNDO con un asiento congelado para vos este offseason (`core/mercadoMundial.js`).
// Fase 9Md: `orgsQueTeFicharian` ya no recibe una liga — escanea las 6 tier 1
// + tu tier 2. El mercado ya no tira ningún dado.
function generarOfertas(state, rng) {
  const m = BALANCE.mercado;
  const ofertas = [];

  const ligaActual = ligaDeCarrera(state);
  const orgActual = ligaActual?.orgs.find((org) => org.nombre === state.career.currentOrg);
  const probRenovacion = clamp(
    m.probRenovacionBase + (state.career.jerarquia / BALANCE.stats.max) * m.probRenovacionPorJerarquia,
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
  const posibles = orgsQueTeFicharian(state)
    .filter((entrada) => !congeladosOrgs || congeladosOrgs.has(entrada.org.nombre))
    // `regionDominante` (9Md): las orgs de esa región suben en el orden de la mano.
    .map((entrada) => ({
      ...entrada,
      orden: entrada.presupuesto + (entrada.liga.region === dominante ? m.nudgeRegionDominante : 0)
    }))
    .sort((a, b) => b.orden - a.orden);

  // 9R0e: si sos claramente una franquicia para TU liga y aun así ningún
  // asiento se abrió, el club más débil de tu liga hace lugar — el silencio no
  // es para una franquicia. (Sin liga —recién ascendido de tier 3— no aplica.)
  const claramenteArriba = ligaActual
    && nivelDelJugador(state) - (ligaActual.prestigio ?? m.nivelLigaPorDefecto) >= m.brechaFranquicia;
  if (claramenteArriba && posibles.length === 0) {
    // El club más débil de tu liga que PUEDE ficharte (respeta las reglas duras
    // — cupo de imports incluido, 9Md). Se prueba de la más débil hacia arriba.
    const candidatas = ligaActual.orgs
      .filter((org) => org.nombre !== state.career.currentOrg)
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

  return ofertas.slice(0, m.ofertasMax);
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
      // Fase 9Mc: los 4-6 traspasos que movieron el mercado este offseason.
      traspasosMundo: traspasosParaPantalla(state),
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
        ...cerrado.state.career, currentOrg: null, rosterDeOrg: null, companeros: [], sinergia: 0,
        registro: conFilaCerrada(cerrado.state, 'libre')
      }
    },
    logs: [...cerrado.logs, crearLog('mercado', `Nadie te ofrece nada hace ${racha} pretemporadas seguidas. Te quedás sin equipo.`)]
  };
}

export function aplicar(state, rng) {
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

  const mundo = resolverMercadoMundial(state, rng, { vaAlMercado: contratoVencido });
  const logsMundo = mundo.logs;
  const stConValor = conValorDeMercadoActualizado(mundo.state);

  // Tier 3: a ese nivel no hay mercado, es automático (competitivo.js lo
  // resuelve). Un tier-2 LIBRE (recién ascendido de tier 3, o sin equipo) SÍ va
  // al mercado — abajo.
  if (stConValor.career.tier === 3) {
    return { state: stConValor, logs: logsMundo };
  }

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
        return { state: stConAnio, logs: logsMundo, decision: traspaso };
      }
      return {
        state: stConAnio,
        logs: [...logsMundo, crearLog('mercado', `Te queda ${aniosRestantes === 1 ? 'un año' : `${aniosRestantes} años`} de contrato con ${stConValor.career.currentOrg}.`)]
      };
    }
  }

  const ofertas = generarOfertas(stConValor, rng);
  if (ofertas.length === 0) {
    const racha = stConValor.flags.splitsSinOfertaConsecutivos + 1;
    if (racha >= BALANCE.mercado.splitsSinOfertaParaLibre) {
      const libre = quedarLibre(stConValor, racha, rng);
      return { state: libre.state, logs: [...logsMundo, ...libre.logs] };
    }
    // El teléfono no suena: si algún asiento se había congelado para vos, el
    // mundo igual lo llena.
    const cerrado = cerrarAsientosCongelados(stConValor, null, rng);
    return {
      state: { ...cerrado.state, flags: { ...cerrado.state.flags, splitsSinOfertaConsecutivos: racha } },
      logs: [...logsMundo, ...cerrado.logs, crearLog('mercado', 'Nadie te llama esta pretemporada. El teléfono no suena.')]
    };
  }

  return { state: stConValor, logs: logsMundo, decision: construirDecisionOfertas(stConValor, ofertas) };
}

// --- Aceptar una oferta (o pedir una mano nueva) ---

// `motivoFila`: el motivo con el que se cierra la fila de la org anterior en el
// registro. Por defecto se deriva del cambio de tier (ascenso/descenso/
// transferencia); 9Mf lo pasa explícito para el banquillo.
function aceptarOferta(state, oferta, { motivoFila } = {}) {
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
    firmadoAEdad: state.age, firmadoEnAnio: state.calendario.anio
  };
  const conClausula = contrato.clausula === 'salida' ? ' Con cláusula de salida.' : '';

  if (esRenovacion) {
    return {
      state: {
        ...state,
        flags: { ...state.flags, splitsSinOfertaConsecutivos: 0 },
        career: {
          ...state.career, contrato,
          registro: registrarSalarioEnFila(state.career.registro, contrato.salarioAnualUSD)
        }
      },
      logs: [crearLog('mercado', `Renovás con ${oferta.org}: ${plata(contrato.salarioAnualUSD)}/año, ${contrato.anios} año(s).${conClausula}`)]
    };
  }

  // El motivo de cierre de fila para el registro: subiste de tier ('ascenso'),
  // bajaste ('descenso') o te moviste al mismo nivel ('transferencia'). Tier 1
  // es el número más bajo. 9Mf lo puede forzar ('banquillo').
  const tierPrevio = state.career.tier ?? 9;
  const motivoFilaFinal = motivoFila ?? (oferta.tier < tierPrevio ? 'ascenso'
    : (oferta.tier > tierPrevio ? 'descenso' : 'transferencia'));

  return {
    state: {
      ...state,
      flags: {
        ...state.flags,
        splitsSinOfertaConsecutivos: 0,
        jerarquiaProyectadaAlFichar: oferta.datos.jerarquiaProyectada
      },
      career: {
        ...state.career,
        tier: oferta.tier, liga: oferta.liga, currentOrg: oferta.org,
        orgs: [...state.career.orgs, oferta.org],
        splitAscensoTier1: oferta.tier === 1 ? state.player.splitCount : state.career.splitAscensoTier1,
        contrato,
        registro: conFilaCerrada(state, motivoFilaFinal)
      }
    },
    logs: [crearLog('mercado', `Firmás con ${oferta.org} (${oferta.liga}): ${plata(contrato.salarioAnualUSD)}/año, ${contrato.anios} año(s).${conClausula}`)]
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

  const pretendiente = orgsQueTeFicharian(state)
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
    label: `Aceptar: irte a ${org.nombre} (${liga.id})`,
    descripcion: conClausula
      ? `Tenés cláusula: te vas y ${state.career.currentOrg} cobra ${plata(traspasoUSD)}. No opina.`
      : `${org.nombre} pone ${plata(traspasoUSD)} de traspaso. ${state.career.currentOrg} decide si te suelta.`
  };
  const opciones = conClausula
    ? [aceptar, quedarse]
    : [aceptar, {
      ...oferta, id: 'pedirSalir', tipo: 'pedirSalir',
      label: 'Pedir salir',
      descripcion: 'Apretás para irte. Si te lo niegan, se resiente el vestuario: perdés arraigo y jerarquía.'
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
      traspasosMundo: traspasosParaPantalla(state),
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
        logs: [crearLog('mercado', `${state.career.currentOrg} te niega la salida y el pedido no cayó bien: perdés peso en el vestuario.`)]
      };
    }
    return { state, logs: [crearLog('mercado', `${decision.datos.comprador} preguntó, pero ${state.career.currentOrg} no te suelta. Seguís.`)] };
  }

  const origen = state.career.currentOrg;
  const firmado = aceptarOferta(state, elegida, { motivoFila: 'transferencia' });
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
function resolverBanquillo(state, logsPrevios, rng) {
  const origen = state.career.currentOrg;
  const regionId = ligaDeCarrera(state)?.regionId ?? state.mundo.regionIdOrigen;
  const dev = state.mundo.ligas.find((liga) => liga.tier === 2 && liga.regionId === regionId);

  if (!dev || dev.orgs.length === 0) {
    return {
      state: {
        ...state,
        flags: {
          ...state.flags, banquilloPendiente: false,
          splitsSinOfertaConsecutivos: state.flags.splitsSinOfertaConsecutivos + 1
        },
        career: {
          ...state.career, currentOrg: null, rosterDeOrg: null, companeros: [], sinergia: 0,
          registro: conFilaCerrada(state, 'banquillo')
        }
      },
      logs: [...logsPrevios, crearLog('mercado', `${origen} te deja fuera del equipo y no hay filial donde jugar. Te quedás sin lugar.`)]
    };
  }

  const orgDestino = [...dev.orgs].sort((a, b) => a.fuerza - b.fuerza)[0];
  const oferta = construirOferta(state, dev, orgDestino, null, rng);
  const firmado = aceptarOferta(state, { ...oferta, id: oferta.org }, { motivoFila: 'banquillo' });
  return {
    state: { ...firmado.state, flags: { ...firmado.state.flags, banquilloPendiente: false } },
    logs: [
      ...logsPrevios,
      crearLog('mercado', `${origen} te manda a la filial: bajás a ${dev.id} con ${orgDestino.nombre}. Desde abajo se vuelve.`),
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

  const brecha = nivelDelJugador(state) - nivelAlternativaAsiento(state, oferta.org);
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

export function resolver(state, decision, respuesta, rng) {
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
        clubesInteresados: interesados
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
        negociacionesRotas, clubesInteresados: decision.datos.clubesInteresados
      });
      return resolverEspera(state, decisionActualizada, rng, `${res.logs[0].message} No queda nada que firmar esta ventana.`);
    }

    return {
      state,
      logs: res.logs,
      decision: construirDecisionOfertas(state, res.ofertas, {
        negociacionesRotas,
        clubesInteresados: decision.datos.clubesInteresados ?? []
      })
    };
  }

  // Firmar.
  const elegida = decision.opciones.find((opcion) => opcion.id === respuesta.opcionId);
  const firmado = aceptarOferta(state, elegida);
  // Fase 9Mc: firmaste — los demás asientos que te habían ofrecido se cierran
  // con un NPC, y el log lo dice con nombre ("el mundo siguió sin vos"). Sólo
  // las orgs que aparecieron como tarjeta lateral (o se levantaron de la mesa
  // por apretar de más) dan ese log.
  const cerrado = cerrarAsientosCongelados(firmado.state, elegida.org, rng, orgsOfrecidasDe(decision));
  return { state: cerrado.state, logs: [...firmado.logs, ...cerrado.logs] };
}

export function resolverAuto(state, decision, rng) {
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
