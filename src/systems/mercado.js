import { chance, weightedPick, roll } from '../core/rng.js';
import { clamp, clampStat } from '../core/numeros.js';
import { crearLog } from '../core/log.js';
import { plata } from '../core/formato.js';
import { calcularContexto } from '../core/contexto.js';
import { ligaDeCarrera } from '../core/competicion.js';
import { salarioDeOferta } from '../core/salarios.js';
import { valorDeMercado, sesgoEtario } from '../core/valorMercado.js';
import { cerrarFila, registrarPico, registrarSalarioEnFila, arraigoInicial } from '../core/registro.js';
import { bandaDeJerarquia, bandaDeArraigoFicha, nivelDelJugador } from '../core/ficha.js';
import { jerarquiaAlFichar } from './roster.js';
import { BALANCE } from '../data/balance.js';

export const id = 'mercado';

// El mercado (fase 9, PLAN.md §9.3-9.6): contratos que vencen, ofertas que
// llegan (o no), y la trampa del equipo grande hecha texto ANTES de firmar.
// Va después de `competitivo` en el registro: ese sistema decide SI ascendés
// (mérito), este decide A QUÉ ORG vas (elección real, §9.4) y qué te paga
// cualquier organización, ascenso o no.

function conFilaCerrada(state, motivo) {
  return cerrarFila(state.career.registro, {
    anio: state.calendario.anio, split: state.player.splitCount,
    arraigoActual: state.career.arraigo, motivo
  });
}

// --- Construcción de una oferta (§9.5: el contrato de datos exacto) ---

function sampleWeighted(items, getWeight, n, rng) {
  const restantes = [...items];
  const elegidos = [];
  while (elegidos.length < n && restantes.length > 0) {
    const elegido = weightedPick(restantes, getWeight, rng);
    elegidos.push(elegido);
    restantes.splice(restantes.indexOf(elegido), 1);
  }
  return elegidos;
}

function tipoDeContrato(tag, tierActual) {
  if (tag === 'renovacion') {
    return 'renovacion';
  }
  if (tag === 'salto' && tierActual === 3) {
    // Primera vez que pisás una liga real: es el debut, no una transferencia.
    return 'rookie';
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

  return {
    id: org.nombre,
    org: org.nombre, liga: liga.id, tier: liga.tier, region: liga.regionId,
    tag,
    salarioAnualUSD, anios,
    proyeccionJerarquia, proyeccionPicks,
    costeArraigo, arraigoInicial: arraigoAlLlegar,
    progresoHito,
    riesgo,
    label: `${org.nombre} · ${liga.id}`,
    descripcion: esOrgActual
      ? 'Te renueva tu propia organización.'
      : (tag === 'salto' ? 'El ascenso que te ganaste.' : (tag === 'bombazo' ? 'La oferta grande.' : 'Una salida lateral.')),
    datos: { tipo: tipoDeContrato(tag, state.career.tier), jerarquiaProyectada: jerarquiaProyectadaCruda }
  };
}

function generarOfertasParaLiga(state, liga, rng, { esAscenso }) {
  const m = BALANCE.mercado;
  const ofertas = [];

  if (!esAscenso) {
    const orgActual = liga.orgs.find((org) => org.nombre === state.career.currentOrg);
    const probRenovacion = clamp(
      m.probRenovacionBase + (state.career.jerarquia / BALANCE.stats.max) * m.probRenovacionPorJerarquia,
      0, 1
    );
    if (orgActual && chance(probRenovacion, rng)) {
      ofertas.push(construirOferta(state, liga, orgActual, 'renovacion', rng));
    }
  }

  // Fase 9R0e: cuánto te busca el mercado sale de tu NIVEL contra la liga, no
  // de `roll(0, techo)` con sesgo etario a secas. Un jugador claramente por
  // encima SIEMPRE tiene ofertas (piso por demanda); uno por debajo, casi
  // ninguna. El `sesgoEtario` sigue acotando el techo (CONCEPTO §12: el mercado
  // prefiere jóvenes), pero ahora convive con la lectura de nivel.
  const nivel = nivelDelJugador(state);
  const brecha = nivel - (liga.prestigio ?? m.nivelLigaPorDefecto);
  const demanda = clamp(0.5 + brecha / m.brechaNivelRango, 0, 1);
  const piso = Math.round(demanda * m.ofertasPisoPorDemanda);
  const techoEtario = Math.max(1, Math.round(m.ofertasMax * sesgoEtario(state.age)));
  const techo = Math.max(piso + 1, Math.round(techoEtario * (m.techoDemandaBase + demanda * m.techoDemandaPeso)));
  const cantidadTotal = esAscenso ? roll(Math.max(1, piso), techo, rng) : roll(piso, techo, rng);
  const cupoLaterales = Math.max(0, cantidadTotal - ofertas.length);
  const candidatos = liga.orgs.filter((org) => org.nombre !== state.career.currentOrg);
  // Y las laterales vienen de orgs cerca de TU nivel, no siempre de las más
  // fuertes: así un 50-media no firma con el mejor equipo de la liga.
  const elegidos = sampleWeighted(
    candidatos,
    (org) => 1 / (1 + Math.abs(org.fuerza - nivel) / m.afinidadOfertaRango),
    Math.min(cupoLaterales, candidatos.length),
    rng
  );

  for (const org of elegidos) {
    ofertas.push(construirOferta(state, liga, org, esAscenso ? 'salto' : null, rng));
  }

  return ofertas.slice(0, m.ofertasMax);
}

function construirDecisionOfertas(state, ofertas) {
  const ascenso = state.flags.ascensoPendiente;
  return {
    tipo: 'opciones',
    presentacion: 'mercado',
    titulo: 'Mercado de pases',
    descripcion: 'El dado trajo estas ofertas. Elegí: ¿la guita o el proyecto?',
    opciones: ofertas,
    datos: {
      motivo: 'oferta',
      esAscenso: Boolean(ascenso),
      ligaId: ascenso ? ascenso.ligaId : state.career.liga,
      representanteDisponible: !state.flags.llamadaRepresentante
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

function quedarLibre(state, racha) {
  return {
    state: {
      ...state,
      flags: { ...state.flags, splitsSinOfertaConsecutivos: 0 },
      career: {
        ...state.career, currentOrg: null, rosterDeOrg: null, companeros: [], sinergia: 0,
        registro: conFilaCerrada(state, 'libre')
      }
    },
    logs: [crearLog('mercado', `Nadie te ofrece nada hace ${racha} pretemporadas seguidas. Te quedás sin equipo.`)]
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

  const stConValor = conValorDeMercadoActualizado(state);
  const ascenso = stConValor.flags.ascensoPendiente;

  if (ascenso) {
    const liga = stConValor.mundo.ligas.find((candidata) => candidata.id === ascenso.ligaId);
    if (!liga || stConValor.age < (liga.edadMinima ?? 0)) {
      // El año muerto (fase 3, ahora resuelto acá): ya ganaste el ascenso,
      // todavía no llegás a la edad. No se vuelve a tirar nada.
      return { state: stConValor, logs: [] };
    }
    const ofertas = generarOfertasParaLiga(stConValor, liga, rng, { esAscenso: true });
    if (ofertas.length === 0) {
      // No debería pasar (toda liga real tiene orgs candidatas), pero si
      // pasa, el ascenso ganado no se pierde: se reintenta la próxima.
      return { state: stConValor, logs: [] };
    }
    return { state: stConValor, logs: [], decision: construirDecisionOfertas(stConValor, ofertas) };
  }

  const liga = ligaDeCarrera(stConValor);
  if (!liga) {
    // Tier 3 (o recién disuelto): a ese nivel no hay mercado, es automático
    // (competitivo.js lo resuelve solo).
    return { state: stConValor, logs: [] };
  }

  const aniosRestantes = Math.max(0, stConValor.career.contrato.aniosRestantes - 1);
  if (aniosRestantes > 0) {
    return {
      state: { ...stConValor, career: { ...stConValor.career, contrato: { ...stConValor.career.contrato, aniosRestantes } } },
      logs: [crearLog('mercado', `Te queda ${aniosRestantes === 1 ? 'un año' : `${aniosRestantes} años`} de contrato con ${stConValor.career.currentOrg}.`)]
    };
  }

  const ofertas = generarOfertasParaLiga(stConValor, liga, rng, { esAscenso: false });
  if (ofertas.length === 0) {
    const racha = stConValor.flags.splitsSinOfertaConsecutivos + 1;
    if (racha >= BALANCE.mercado.splitsSinOfertaParaLibre) {
      return quedarLibre(stConValor, racha);
    }
    return {
      state: { ...stConValor, flags: { ...stConValor.flags, splitsSinOfertaConsecutivos: racha } },
      logs: [crearLog('mercado', 'Nadie te llama esta pretemporada. El teléfono no suena.')]
    };
  }

  return { state: stConValor, logs: [], decision: construirDecisionOfertas(stConValor, ofertas) };
}

// --- Aceptar una oferta (o pedir una mano nueva) ---

function aceptarOferta(state, oferta) {
  const esRenovacion = oferta.tag === 'renovacion';
  const contrato = {
    org: oferta.org, liga: oferta.liga, tier: oferta.tier,
    salarioAnualUSD: oferta.salarioAnualUSD,
    anios: oferta.anios, aniosRestantes: oferta.anios,
    clausula: null,
    tipo: oferta.datos.tipo,
    firmadoAEdad: state.age, firmadoEnAnio: state.calendario.anio
  };

  if (esRenovacion) {
    return {
      state: {
        ...state,
        flags: { ...state.flags, ascensoPendiente: null, splitsSinOfertaConsecutivos: 0 },
        career: {
          ...state.career, contrato,
          registro: registrarSalarioEnFila(state.career.registro, contrato.salarioAnualUSD)
        }
      },
      logs: [crearLog('mercado', `Renovás con ${oferta.org}: ${plata(contrato.salarioAnualUSD)}/año, ${contrato.anios} año(s).`)]
    };
  }

  return {
    state: {
      ...state,
      flags: {
        ...state.flags,
        ascensoPendiente: null,
        splitsSinOfertaConsecutivos: 0,
        jerarquiaProyectadaAlFichar: oferta.datos.jerarquiaProyectada
      },
      career: {
        ...state.career,
        tier: oferta.tier, liga: oferta.liga, currentOrg: oferta.org,
        orgs: [...state.career.orgs, oferta.org],
        splitAscensoTier1: oferta.tier === 1 ? state.player.splitCount : state.career.splitAscensoTier1,
        contrato,
        registro: conFilaCerrada(state, oferta.tag === 'salto' ? 'ascenso' : 'transferencia')
      }
    },
    logs: [crearLog('mercado', `Firmás con ${oferta.org} (${oferta.liga}): ${plata(contrato.salarioAnualUSD)}/año, ${contrato.anios} año(s).`)]
  };
}

export function resolver(state, decision, respuesta, rng) {
  if (respuesta.representante) {
    // Una sola vez por carrera (§9.6): si ya se usó, la UI no debería ofrecer
    // el botón, pero el motor no confía en eso — vuelve a pausar con la
    // MISMA decisión, sin rebarajar de nuevo.
    if (state.flags.llamadaRepresentante) {
      return { state, logs: [], decision };
    }
    const liga = decision.datos.esAscenso
      ? state.mundo.ligas.find((candidata) => candidata.id === decision.datos.ligaId)
      : ligaDeCarrera(state);
    const stConLlamada = { ...state, flags: { ...state.flags, llamadaRepresentante: true } };
    const ofertas = liga ? generarOfertasParaLiga(stConLlamada, liga, rng, { esAscenso: decision.datos.esAscenso }) : [];

    if (ofertas.length === 0) {
      return { state: stConLlamada, logs: [crearLog('mercado', 'Tu representante mueve algunos hilos, pero no aparece nada nuevo.')] };
    }
    return {
      state: stConLlamada,
      logs: [crearLog('mercado', 'Tu representante te consigue una segunda mano de ofertas.')],
      decision: construirDecisionOfertas(stConLlamada, ofertas)
    };
  }

  const elegida = decision.opciones.find((opcion) => opcion.id === respuesta.opcionId);
  return aceptarOferta(state, elegida);
}

export function resolverAuto(state, decision, rng) {
  const elegida = weightedPick(decision.opciones, (opcion) => Math.max(1, opcion.salarioAnualUSD), rng);
  return { opcionId: elegida.id };
}
