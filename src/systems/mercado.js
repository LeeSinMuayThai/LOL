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
      : (liga.tier < (state.career.tier ?? 9) ? 'El salto a una liga más grande.'
        : (liga.tier > (state.career.tier ?? 0) ? 'Un escalón para abajo, pero es jugar.'
          : (tag === 'bombazo' ? 'La oferta grande.' : 'Una salida lateral.'))),
    datos: { tipo: tipoDeContrato(state, liga, esRenovacion), jerarquiaProyectada: jerarquiaProyectadaCruda }
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

function construirDecisionOfertas(state, ofertas) {
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
      traspasosMundo: traspasosParaPantalla(state)
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

  // Contrato corriendo: descuenta un año y listo.
  if (stConValor.career.currentOrg) {
    const aniosRestantes = Math.max(0, stConValor.career.contrato.aniosRestantes - 1);
    if (aniosRestantes > 0) {
      return {
        state: { ...stConValor, career: { ...stConValor.career, contrato: { ...stConValor.career.contrato, aniosRestantes } } },
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
        flags: { ...state.flags, splitsSinOfertaConsecutivos: 0 },
        career: {
          ...state.career, contrato,
          registro: registrarSalarioEnFila(state.career.registro, contrato.salarioAnualUSD)
        }
      },
      logs: [crearLog('mercado', `Renovás con ${oferta.org}: ${plata(contrato.salarioAnualUSD)}/año, ${contrato.anios} año(s).`)]
    };
  }

  // El motivo de cierre de fila para el registro: subiste de tier ('ascenso'),
  // bajaste ('descenso') o te moviste al mismo nivel ('transferencia'). Tier 1
  // es el número más bajo.
  const tierPrevio = state.career.tier ?? 9;
  const motivoFila = oferta.tier < tierPrevio ? 'ascenso'
    : (oferta.tier > tierPrevio ? 'descenso' : 'transferencia');

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
        registro: conFilaCerrada(state, motivoFila)
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
    const stConLlamada = { ...state, flags: { ...state.flags, llamadaRepresentante: true } };
    const ofertas = generarOfertas(stConLlamada, rng);

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
  const firmado = aceptarOferta(state, elegida);
  // Fase 9Mc: firmaste — los demás asientos que te habían ofrecido se cierran
  // con un NPC, y el log lo dice con nombre ("el mundo siguió sin vos"). Sólo
  // las orgs que aparecieron como tarjeta lateral (no las que el sesgo etario
  // dejó fuera de la mano) dan ese log.
  const orgsOfrecidas = new Set(
    decision.opciones.filter((o) => o.tag !== 'renovacion' && !o.forzadaFranquicia).map((o) => o.org)
  );
  const cerrado = cerrarAsientosCongelados(firmado.state, elegida.org, rng, orgsOfrecidas);
  return { state: cerrado.state, logs: [...firmado.logs, ...cerrado.logs] };
}

export function resolverAuto(state, decision, rng) {
  const elegida = weightedPick(decision.opciones, (opcion) => Math.max(1, opcion.salarioAnualUSD), rng);
  return { opcionId: elegida.id };
}
