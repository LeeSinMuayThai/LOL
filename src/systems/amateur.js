import { gauss, roll, chance, weightedPick } from '../core/rng.js';
import { BALANCE } from '../data/balance.js';
import { crearLog } from '../core/log.js';
import { clamp, clampStat } from '../core/numeros.js';
import { rangoDeElo } from '../core/selectors.js';
import { multiplicadorDeMeta } from '../core/ajusteMeta.js';

export const id = 'amateur';

const DESTINOS = [
  { id: 'ranked', label: 'Rankeds' },
  { id: 'estudiar', label: 'Estudiar' },
  { id: 'dormir', label: 'Dormir' },
  { id: 'familia', label: 'Familia' }
];

const IDS_DESTINO = DESTINOS.map((destino) => destino.id);

function lpDeUnBloque(state, rng) {
  const a = BALANCE.amateur;
  const { mecanica, mentalidad } = state.player.stats;

  const factorMecanica = a.lpFactorMecanicaBase + (mecanica / BALANCE.stats.max) * a.lpFactorMecanicaRango;
  const factorMentalidad = a.lpFactorMentalidadBase + (mentalidad / BALANCE.stats.max) * a.lpFactorMentalidadRango;
  const penalDeuda = 1 - Math.min(a.lpPenalPorDeudaMax, state.player.deudaSueno * a.lpPenalPorDeuda);
  // Si el meta pide lo que dominás, el mismo grindeo rinde el doble de LP.
  const factorMeta = multiplicadorDeMeta(state.meta.ajuste);

  return gauss(a.lpPorBloque, a.lpPorBloqueSpread, rng) * factorMecanica * factorMentalidad * penalDeuda * factorMeta;
}

// La probabilidad de cada banda crece a medida que los estudios bajan, y se
// multiplica por lo estrictos que salieron los viejos y por la confianza que
// queda. No hay un numero exacto donde pincha: se puede zafar con la barra por
// el piso y se puede pinchar con la barra a medias.
function probBanda(estudios, umbral, pendiente, techo) {
  if (estudios >= umbral) {
    return 0;
  }
  return Math.min(techo, (umbral - estudios) / pendiente);
}

function multiplicadorFamiliar(state) {
  const a = BALANCE.amateur;
  const estrictez = (BALANCE.stats.max - state.origen.toleranciaViejos) / a.toleranciaReferencia;
  const modTrust = clamp(
    1 + (a.trustReferencia - state.player.familyTrust) * a.trustPesoEnRiesgo,
    a.trustModMin,
    a.trustModMax
  );
  return estrictez * modTrust;
}

function textoDeSituacion(state) {
  const a = BALANCE.amateur;
  const partes = [];

  if (state.player.deudaSueno >= a.robosParaDeuda) {
    partes.push('Arrastrás deuda de sueño: los reflejos no responden igual.');
  } else if (state.flags.robosConsecutivos > 0) {
    partes.push('Venís durmiendo de menos y el cuerpo lo empieza a marcar.');
  }

  if (state.player.studies < a.confiscacionUmbral) {
    partes.push('En casa el boletín ya es tema de conversación.');
  } else if (state.player.studies < a.avisoUmbral) {
    partes.push('El colegio te empieza a quedar grande.');
  }

  if (state.flags.nocturno) {
    partes.push('Con el nocturno te sobra tiempo de día.');
  }

  return partes.length > 0 ? partes.join(' ') : 'Semana normal: colegio, casa y la compu esperando.';
}

function bloquesDisponibles(state) {
  return BALANCE.amateur.bloquesBase + (state.flags.nocturno ? BALANCE.amateur.nocturnoBloquesExtra : 0);
}

function decisionDeReparto(state) {
  const bloques = bloquesDisponibles(state);

  return {
    tipo: 'reparto',
    titulo: `Cómo repartís la semana (${rangoDeElo(state.player.soloqElo)}, ${state.player.soloqElo} LP)`,
    descripcion: `${textoDeSituacion(state)} Tenés ${bloques} bloques de tiempo y podés robarle hasta ${BALANCE.amateur.bloquesExtraMax} al sueño.`,
    bloques,
    extraMax: BALANCE.amateur.bloquesExtraMax,
    destinos: DESTINOS,
    datos: { motivo: 'reparto' }
  };
}

// `pesoAuto` es lo que elegiria alguien con criterio: lo usa la simulacion
// masiva para medir el juego en vez del ruido. No se muestra al jugador.
function decisionDeOpciones(titulo, descripcion, opciones, motivo) {
  return { tipo: 'opciones', titulo, descripcion, opciones, datos: { motivo } };
}

// --- El periodo con la PC confiscada: perdes el periodo entero ---

function periodoSinPC(state, rng) {
  const a = BALANCE.amateur;

  return {
    state: {
      ...state,
      player: {
        ...state.player,
        studies: clampStat(state.player.studies + roll(a.sinPCEstudioMin, a.sinPCEstudioMax, rng)),
        familyTrust: clampStat(state.player.familyTrust + roll(a.sinPCTrustMin, a.sinPCTrustMax, rng)),
        sleep: clampStat(state.player.sleep + roll(a.sinPCSuenoMin, a.sinPCSuenoMax, rng)),
        stats: {
          ...state.player.stats,
          mentalidad: clampStat(state.player.stats.mentalidad + roll(a.sinPCMentalidadMin, a.sinPCMentalidadMax, rng))
        },
        deudaSueno: 0
      },
      flags: { ...state.flags, pcConfiscada: state.flags.pcConfiscada - 1, robosConsecutivos: 0 }
    },
    logs: [crearLog('amateur', 'Sin PC en casa: el periodo se te fue en colegio y sobremesas. Descansaste, pero no tocaste el ranked.')]
  };
}

// --- Reparto de bloques ---

function normalizarReparto(state, respuesta) {
  const bloques = bloquesDisponibles(state);
  const pedido = respuesta?.reparto ?? {};
  const extra = clamp(Math.round(respuesta?.extra ?? 0), 0, BALANCE.amateur.bloquesExtraMax);

  const crudo = Object.fromEntries(IDS_DESTINO.map((destino) => [destino, Math.max(0, Math.round(pedido[destino] ?? 0))]));
  const pedidos = IDS_DESTINO.reduce((suma, destino) => suma + crudo[destino], 0);
  const disponibles = bloques + extra;

  if (pedidos === 0) {
    // Nadie reparte nada: el tiempo igual pasa, y se va en dormir.
    return { reparto: { ...crudo, dormir: disponibles }, extra };
  }

  // Se respeta la proporcion pedida y se ajusta al total real de bloques, asi
  // una respuesta mal formada nunca inventa ni pierde tiempo.
  const escala = disponibles / pedidos;
  const ajustado = Object.fromEntries(IDS_DESTINO.map((destino) => [destino, Math.floor(crudo[destino] * escala)]));

  let sobrante = disponibles - IDS_DESTINO.reduce((suma, destino) => suma + ajustado[destino], 0);
  const porPrioridad = [...IDS_DESTINO].sort((a, b) => crudo[b] - crudo[a]);
  for (let i = 0; sobrante > 0; i = (i + 1) % porPrioridad.length, sobrante -= 1) {
    ajustado[porPrioridad[i]] += 1;
  }

  return { reparto: ajustado, extra };
}

function aplicarReparto(state, reparto, extra, rng) {
  const a = BALANCE.amateur;
  const logs = [];

  const lpGanado = Math.round(
    Array.from({ length: reparto.ranked }, () => lpDeUnBloque(state, rng)).reduce((suma, lp) => suma + lp, 0)
  );

  // Deriva pasiva: los estudios caen solos, y caen mas en un colegio exigente.
  const factorColegio = state.origen.exigenciaColegio / a.exigenciaColegioReferencia;
  const factorNocturno = state.flags.nocturno ? a.nocturnoFactorDecaeEstudio : 1;
  const caidaEstudio = Math.max(0, gauss(a.estudioDecae, a.estudioDecaeSpread, rng)) * factorColegio * factorNocturno;
  const caidaSueno = Math.max(0, gauss(a.suenoDecae, a.suenoDecaeSpread, rng));

  // La confianza familiar esta acoplada a los estudios: cae sola y cae mas
  // rapido cuanto peor va el colegio.
  const estudiosDespues = state.player.studies + reparto.estudiar * a.estudioPorBloque - caidaEstudio;
  const brechaEstudios = Math.max(0, a.confianzaEstudioUmbral - estudiosDespues);
  const caidaTrust = Math.max(0, gauss(a.confianzaDecae, a.confianzaDecaeSpread, rng)) + brechaEstudios * a.confianzaEstudioPenal;

  // Robarle al sueño cuesta mentalidad, y el costo es acumulativo.
  const robosConsecutivos = extra > 0 ? (state.flags.robosConsecutivos ?? 0) + 1 : 0;
  const penalAcumulada = 1 + Math.max(0, robosConsecutivos - 1) * a.penalRoboConsecutivo;
  const costoMentalidad = extra * a.mentalidadPorBloqueRobado * penalAcumulada;
  const deudaSueno = clamp(
    robosConsecutivos >= a.robosParaDeuda ? state.player.deudaSueno + 1 : Math.max(0, state.player.deudaSueno - 1),
    0,
    a.deudaMaxima
  );

  const player = {
    ...state.player,
    soloqElo: Math.max(0, state.player.soloqElo + lpGanado),
    studies: clampStat(estudiosDespues),
    sleep: clampStat(state.player.sleep + reparto.dormir * a.suenoPorBloque - caidaSueno - extra * a.suenoPorBloqueRobado),
    familyTrust: clampStat(state.player.familyTrust + reparto.familia * a.familiaPorBloque - caidaTrust),
    deudaSueno,
    stats: {
      ...state.player.stats,
      mentalidad: clampStat(state.player.stats.mentalidad - costoMentalidad)
    }
  };

  logs.push(crearLog(
    'amateur',
    `Semana repartida (${reparto.ranked} ranked / ${reparto.estudiar} colegio / ${reparto.dormir} dormir / ${reparto.familia} familia${extra > 0 ? ` + ${extra} robados al sueño` : ''}): `
    + `${lpGanado >= 0 ? '+' : ''}${lpGanado} LP, ${Math.round(player.studies - state.player.studies)} estudios, `
    + `${Math.round(player.sleep - state.player.sleep)} sueño, ${Math.round(player.familyTrust - state.player.familyTrust)} confianza.`
  ));

  if (deudaSueno >= a.robosParaDeuda && state.player.deudaSueno < a.robosParaDeuda) {
    logs.push(crearLog('amateur', 'Entraste en deuda de sueño: te cuesta encontrar la ventana, y el LP lo nota.'));
  }

  return { state: { ...state, player, flags: { ...state.flags, robosConsecutivos } }, logs };
}

// --- Bandas de riesgo familiar ---

function evaluarRiesgoFamiliar(state, rng) {
  const a = BALANCE.amateur;

  if (state.flags.negociacionGanada) {
    return { state, logs: [] };
  }

  const multiplicador = multiplicadorFamiliar(state);
  const estudios = state.player.studies;

  const probCorte = Math.min(a.riesgoTotalTecho, probBanda(estudios, a.corteUmbral, a.cortePendiente, a.corteTecho) * multiplicador);
  if (chance(probCorte, rng)) {
    return {
      state: { ...state, phase: 'retirado', terminado: true, finAnticipado: 'prohibicion_familiar' },
      logs: [crearLog('amateur', 'Se terminó: en tu casa decidieron que el ranked se acabó, y esta vez no hay vuelta atrás.')]
    };
  }

  const probConfiscacion = Math.min(
    a.riesgoTotalTecho,
    probBanda(estudios, a.confiscacionUmbral, a.confiscacionPendiente, a.confiscacionTecho) * multiplicador
  );
  if (chance(probConfiscacion, rng)) {
    return {
      state: {
        ...state,
        player: {
          ...state.player,
          familyTrust: clampStat(state.player.familyTrust - roll(a.confiscacionCostoTrustMin, a.confiscacionCostoTrustMax, rng))
        },
        flags: { ...state.flags, pcConfiscada: a.periodosSinPC }
      },
      logs: [crearLog('amateur', 'Te confiscaron la PC. El próximo periodo lo vas a mirar desde afuera.')]
    };
  }

  const probAviso = Math.min(a.riesgoTotalTecho, probBanda(estudios, a.avisoUmbral, a.avisoPendiente, a.avisoTecho) * multiplicador);
  if (chance(probAviso, rng)) {
    return {
      state: {
        ...state,
        player: {
          ...state.player,
          familyTrust: clampStat(state.player.familyTrust - roll(a.avisoCostoTrustMin, a.avisoCostoTrustMax, rng))
        },
        flags: { ...state.flags, avisos: (state.flags.avisos ?? 0) + 1 }
      },
      logs: [crearLog('amateur', 'Llegó el aviso del colegio y en casa te lo hicieron saber.')]
    };
  }

  return { state, logs: [] };
}

// --- Las tres salidas ---

function probabilidadDeScouting(state) {
  const a = BALANCE.amateur;

  if (state.player.splitCount < a.splitMinimoScouting || state.player.soloqElo < a.eloMinimoScouting) {
    return 0;
  }

  const avanceElo = clamp((state.player.soloqElo - a.eloMinimoScouting) / a.eloScoutingRango, 0, 1);
  const avanceHype = clamp(state.player.stats.hype / a.hypeReferenciaScouting, 0, 1);

  return a.scoutingProbMax * (avanceElo * a.scoutingPesoElo + avanceHype * a.scoutingPesoHype);
}

function orgQueTeMira(state, rng) {
  const liga = state.mundo.ligas.find((candidata) => candidata.id === state.mundo.ligaOrigen);
  // Cuanto mas fuerte la org, menos probable que se fije en un pibe de soloQ.
  return weightedPick(liga.orgs, (org) => BALANCE.stats.max - org.fuerza, rng);
}

function buscarSalida(state, rng) {
  const a = BALANCE.amateur;
  const lpMaster = BALANCE.rangos.find((rango) => rango.nombre === 'Máster').lp;

  if (chance(probabilidadDeScouting(state), rng)) {
    const org = orgQueTeMira(state, rng);
    return decisionDeOpciones(
      `${org.nombre} te quiere en su academy`,
      `Te vieron en soloQ con ${state.player.soloqElo} LP. Ofrecen contrato chico, mudanza a la gaming house y dejar el colegio a mitad de camino.`,
      [
        { id: 'firmar', label: `Firmar con ${org.nombre}`, pesoAuto: 7 },
        { id: 'esperar_mejor_oferta', label: 'Agradecer y seguir grindeando por algo más grande', pesoAuto: 3 }
      ],
      'oferta'
    );
  }

  // Llegar a Master con la confianza familiar todavia en pie abre la
  // negociacion: es la unica salida que no depende de que alguien te elija.
  if (!state.flags.negociacionGanada && state.player.soloqElo >= lpMaster && state.player.familyTrust >= a.negociacionTrustMinimo) {
    return decisionDeOpciones(
      'Máster: la charla que venías pateando',
      'Llegaste a Máster y en tu casa lo saben. Es el momento de sentarte a negociar en serio, o de dejarlo pasar una vez más.',
      [
        { id: 'plantear_el_tema', label: 'Sentarte a plantearlo de una vez', pesoAuto: 7 },
        { id: 'no_arriesgar', label: 'No arriesgar la paz de casa todavía', pesoAuto: 3 }
      ],
      'negociacion'
    );
  }

  if (!state.flags.nocturno && state.player.studies < a.nocturnoEstudiosUmbral) {
    return decisionDeOpciones(
      'Pasarte a nocturno',
      'Con estas notas, el turno noche te libera las tardes enteras. En casa lo van a leer como una rendición.',
      [
        { id: 'pasarse', label: 'Pasarte al nocturno', pesoAuto: 4 },
        { id: 'aguantar', label: 'Aguantar el turno de siempre', pesoAuto: 6 }
      ],
      'nocturno'
    );
  }

  return null;
}

function firmarConEquipo(state, rng) {
  const org = orgQueTeMira(state, rng);

  return {
    state: {
      ...state,
      phase: 'profesional',
      splitFichaje: state.player.splitCount,
      career: {
        ...state.career,
        currentOrg: org.nombre,
        liga: org.liga,
        orgs: [...state.career.orgs, org.nombre]
      }
    },
    logs: [crearLog('amateur', `Firmaste con ${org.nombre}. Se terminó el soloQ de pieza: a partir de acá te pagan por jugar.`)]
  };
}

function resolverOferta(state, opcionId, rng) {
  if (opcionId === 'firmar') {
    return firmarConEquipo(state, rng);
  }

  const hypeGanado = roll(2, 6, rng);
  return {
    state: {
      ...state,
      player: { ...state.player, stats: { ...state.player.stats, hype: clampStat(state.player.stats.hype + hypeGanado) } }
    },
    logs: [crearLog('amateur', `Dijiste que no. Se comentó en Twitter, y algo de eso te queda (+${hypeGanado} hype).`)]
  };
}

function resolverNegociacion(state, opcionId, rng) {
  if (opcionId !== 'plantear_el_tema') {
    return { state, logs: [crearLog('amateur', 'Dejaste pasar la charla. El tema sigue ahí, esperando.')] };
  }

  // Los stats corren los pesos, no los eliminan: la confianza acumulada y las
  // notas mueven la balanza, pero la charla puede salir mal igual.
  const pesoBien = state.player.familyTrust + state.player.studies;
  const pesoMal = BALANCE.stats.max * 2 - pesoBien;
  const sale = weightedPick([true, false], (bien) => (bien ? pesoBien : pesoMal), rng);

  if (sale) {
    return {
      state: {
        ...state,
        flags: { ...state.flags, negociacionGanada: true },
        player: { ...state.player, familyTrust: clampStat(state.player.familyTrust + roll(6, 14, rng)) }
      },
      logs: [crearLog('amateur', 'Salió bien: te bancan el intento. Mientras no abandones del todo el colegio, la PC es tuya.')]
    };
  }

  return {
    state: {
      ...state,
      player: { ...state.player, familyTrust: clampStat(state.player.familyTrust - roll(8, 16, rng)) }
    },
    logs: [crearLog('amateur', 'Salió mal. Ahora además de desconfiar, saben exactamente lo que querés hacer.')]
  };
}

function resolverNocturno(state, opcionId, rng) {
  if (opcionId !== 'pasarse') {
    return { state, logs: [crearLog('amateur', 'Te quedaste en el turno de siempre. Menos tiempo, menos ruido en casa.')] };
  }

  const a = BALANCE.amateur;
  const costo = roll(a.nocturnoCostoTrustMin, a.nocturnoCostoTrustMax, rng);

  return {
    state: {
      ...state,
      flags: { ...state.flags, nocturno: true },
      player: { ...state.player, familyTrust: clampStat(state.player.familyTrust - costo) }
    },
    logs: [crearLog('amateur', `Te pasaste al nocturno: ${a.nocturnoBloquesExtra} bloques más por periodo y el colegio deja de pesar tanto. En casa cayó como un balde de agua fría (-${costo} confianza).`)]
  };
}

// --- Contrato del sistema ---

export function aplicar(state, rng) {
  if (state.phase !== 'amateur') {
    return { state, logs: [] };
  }

  if (state.age >= BALANCE.amateur.edadLimite) {
    return {
      state: { ...state, phase: 'retirado', terminado: true, finAnticipado: 'no_llego' },
      logs: [crearLog('amateur', `Cumpliste ${state.age} y nadie te llamó. La ventana de los prospectos se cerró.`)]
    };
  }

  if ((state.flags.pcConfiscada ?? 0) > 0) {
    return periodoSinPC(state, rng);
  }

  return { state, logs: [], decision: decisionDeReparto(state) };
}

export function resolver(state, decision, respuesta, rng) {
  if (decision.datos.motivo === 'reparto') {
    const { reparto, extra } = normalizarReparto(state, respuesta);
    const rReparto = aplicarReparto(state, reparto, extra, rng);
    const rRiesgo = evaluarRiesgoFamiliar(rReparto.state, rng);
    const logs = [...rReparto.logs, ...rRiesgo.logs];

    if (rRiesgo.state.terminado) {
      return { state: rRiesgo.state, logs };
    }

    const salida = buscarSalida(rRiesgo.state, rng);
    return salida ? { state: rRiesgo.state, logs, decision: salida } : { state: rRiesgo.state, logs };
  }

  const { motivo } = decision.datos;
  const { opcionId } = respuesta;

  if (motivo === 'oferta') {
    return resolverOferta(state, opcionId, rng);
  }
  if (motivo === 'negociacion') {
    return resolverNegociacion(state, opcionId, rng);
  }
  return resolverNocturno(state, opcionId, rng);
}

// El jugador automatico no reparte al azar: mira que barras tiene en rojo y
// reacciona, como haria alguien con criterio. Es la unica forma de que la
// simulacion masiva mida el juego y no el ruido.
function pesosAutomaticos(state, rng) {
  const a = BALANCE.amateur;
  const conRuido = (peso) => Math.max(a.autoPesoMinimo, peso * gauss(1, a.autoRuido, rng));

  const riesgoColegio = clamp((a.avisoUmbral - state.player.studies) / a.avisoUmbral, 0, 1);
  const riesgoFamilia = clamp((a.trustReferencia - state.player.familyTrust) / a.trustReferencia, 0, 1);
  const riesgoSueno = clamp((a.autoSuenoObjetivo - state.player.sleep) / a.autoSuenoObjetivo, 0, 1);

  return {
    ranked: conRuido(a.autoPesoRanked),
    estudiar: conRuido(a.autoPesoEstudiar + riesgoColegio * a.autoReaccionColegio),
    dormir: conRuido(a.autoPesoDormir + riesgoSueno * a.autoReaccionSueno),
    familia: conRuido(a.autoPesoFamilia + riesgoFamilia * a.autoReaccionFamilia)
  };
}

export function resolverAuto(state, decision, rng) {
  if (decision.tipo === 'opciones') {
    return { opcionId: weightedPick(decision.opciones, (opcion) => opcion.pesoAuto, rng).id };
  }

  const a = BALANCE.amateur;
  const pesos = pesosAutomaticos(state, rng);

  const reparto = Object.fromEntries(IDS_DESTINO.map((destino) => [destino, 0]));
  for (let bloque = 0; bloque < decision.bloques; bloque += 1) {
    reparto[weightedPick(IDS_DESTINO, (destino) => pesos[destino], rng)] += 1;
  }

  // Robarle al sueño solo tiene sentido si todavia hay sueño que robar.
  const extra = state.player.sleep > a.autoSuenoObjetivo && chance(a.autoProbRobar, rng)
    ? roll(1, decision.extraMax, rng)
    : 0;

  return { reparto, extra };
}
