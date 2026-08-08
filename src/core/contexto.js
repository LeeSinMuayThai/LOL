import { BALANCE } from '../data/balance.js';
import { clamp } from './numeros.js';
import { bandaDeLadder, servidorDeLaPartida } from './ranked.js';
import { campeonesMuertos } from './ajusteMeta.js';
import { campeonesDisponibles, campeonNuevoPendiente } from './pool.js';
import { MOMENTOS } from '../data/contextos.js';

// "Donde estas parado en la carrera", derivado del estado.
//
// `calcularContexto` es PURA y no consume una sola tirada de RNG. Eso tiene tres
// consecuencias que sostienen todo el sistema de contenido:
//   1. nunca se desincroniza del estado real;
//   2. se puede enumerar sin simular, que es lo que hace autoreable el catalogo;
//   3. introducirla no movio ni un decimal del balance ya calibrado.
//
// `state.contexto` existe solo como cache para la UI y los logs: la fuente de
// verdad es siempre esta funcion.

function bandaPorTecho(valor, bandas, ultimo) {
  const entrada = Object.entries(bandas).find(([, techo]) => valor <= techo);
  return entrada ? entrada[0] : ultimo;
}

function ligaDe(state) {
  if (!state.career.liga) {
    return null;
  }
  return state.mundo.ligas.find((liga) => liga.id === state.career.liga) ?? null;
}

function calcularEtapa(state) {
  if (state.phase === 'amateur') {
    return 'amateur';
  }
  if (state.phase === 'retirado') {
    return 'retirado';
  }

  // El debut son los primeros splits desde el fichaje: sos el rookie y casi no
  // decidis nada. Mecanicamente ya existe (jerarquia baja -> no te dan tus
  // picks); lo que faltaba era poder nombrarlo para gatear contenido.
  const splitsComoPro = state.player.splitCount - (state.splitFichaje ?? 0);
  if (splitsComoPro < BALANCE.contexto.splitsDeDebut) {
    return 'debut';
  }

  // 'declive' lo activa el paso 11: no es una edad, es presion de mercado.
  return 'profesional';
}

function calcularNivel(state) {
  if (state.phase === 'amateur') {
    return 'soloq';
  }
  if (state.phase === 'retirado') {
    return 'libre';
  }
  if (!state.career.currentOrg) {
    return 'libre';
  }
  return `tier${ligaDe(state)?.tier ?? 1}`;
}

function calcularEstatus(state) {
  if (!state.career.currentOrg) {
    return 'ninguno';
  }
  return bandaPorTecho(state.career.jerarquia, BALANCE.contexto.estatusBandas, 'franquicia');
}

// El momentum sale de una ventana movil de "como te fue", que cada sistema
// competitivo empuja a `career.historial` como un puntaje 0-100. Sin historial
// no hay racha ni slump: estas estable.
function calcularMomentum(state) {
  const historial = state.career.historial ?? [];
  if (historial.length === 0) {
    return 'estable';
  }

  const promedio = historial.reduce((suma, puntaje) => suma + puntaje, 0) / historial.length;
  // El puntaje es "que tan bien te fue" (100 = perfecto); las bandas estan
  // definidas sobre "que tan mal", asi que se invierte.
  const inverso = (BALANCE.stats.max - promedio) / BALANCE.stats.max;
  return bandaPorTecho(inverso, BALANCE.contexto.momentumBandas, 'crisis');
}

function calcularMercado(state) {
  return state.career.currentOrg ? 'contrato_firme' : 'sin_contrato';
}

function calcularVentana(state) {
  const posicionEnTemporada = state.player.splitCount % BALANCE.edad.splitsPorEdad;
  if (posicionEnTemporada === 0) {
    return 'pretemporada';
  }
  return posicionEnTemporada === BALANCE.edad.splitsPorEdad - 1 ? 'playoffs' : 'regular';
}

function calcularMarcas(state) {
  const marcas = [];
  const a = BALANCE.amateur;

  if (state.player.deudaSueno >= a.robosParaDeuda) {
    marcas.push('deuda_sueno');
  }
  if ((state.flags.pcConfiscada ?? 0) > 0) {
    marcas.push('pc_confiscada');
  }
  if (state.phase === 'amateur' && state.player.studies < a.confiscacionUmbral && !state.flags.negociacionGanada) {
    marcas.push('riesgo_familiar');
  }
  // Estás en el radar de los scouts cuando entrás al ápice de la ladder, no
  // cuando llegás a un elo cualquiera.
  if (state.phase === 'amateur' && state.player.soloqElo >= a.puntosParaRadar) {
    marcas.push('en_el_radar');
  }
  if (state.flags.nocturno) {
    marcas.push('nocturno');
  }
  if (state.flags.negociacionGanada) {
    marcas.push('negociacion_ganada');
  }
  if (state.flags.secundario === 'lo_dejo') {
    marcas.push('sin_secundario');
  }
  if (state.flags.secundario === 'terminado') {
    marcas.push('secundario_terminado');
  }
  if (state.player.signatureChampion) {
    marcas.push('signature');
  }
  // Hay gente con nombre alrededor: recién desde el split siguiente al fichaje.
  if ((state.career.companeros?.length ?? 0) > 0) {
    marcas.push('con_vestuario');
  }
  if (state.player.stats.mentalidad < BALANCE.atributos.burnoutUmbral + BALANCE.contexto.margenMentalidadAlLimite) {
    marcas.push('mentalidad_al_limite');
  }

  return [...marcas, ...marcasDePool(state)];
}

// El pool que elegiste, leído como contexto.
//
// Sin esto, elegir tus tres mains al empezar no cambia nada del contenido que
// ves: el pool solo movía un multiplicador abstracto. Estas seis marcas son lo
// que hace que los campeones que elegiste sigan importando veinte splits después.
function marcasDePool(state) {
  const c = BALANCE.campeones;
  const marcas = [];
  const pool = state.player.championPool ?? [];

  if (pool.length <= c.poolAngosto) {
    marcas.push('pool_angosto');
  }
  if (pool.length >= c.poolAncho) {
    marcas.push('pool_ancho');
  }
  if (state.meta.ajuste >= c.ajusteAFavor) {
    marcas.push('pool_en_meta');
  }
  if (state.meta.ajuste <= c.ajusteEnContra) {
    marcas.push('pool_fuera_meta');
  }

  // No alcanza con que un campeón cualquiera del pool se caiga: la marca es
  // sobre TU main, que es lo único que se siente como una pérdida.
  if (pool.length > 0) {
    const principal = pool.reduce((mejor, campeon) => (campeon.mastery > mejor.mastery ? campeon : mejor));
    if (campeonesMuertos([principal], state.meta.weights, campeonesDisponibles(state)).length > 0) {
      marcas.push('main_muerto');
    }
  }

  // Salió un campeón de tu rol y todavía no lo tenés: la decisión de si lo
  // aprendés ahora o después del partido que viene. Caduca — "salió un campeón
  // nuevo" es una noticia con fecha de vencimiento.
  if (campeonNuevoPendiente(state)) {
    marcas.push('campeon_nuevo');
  }

  return marcas;
}

// `overrides` existe porque la ventana cambia ADENTRO del split: el offseason y
// el internacional pasan despues de jugar, no al abrirlo. El sistema que los
// produce pide el contexto con su ventana en vez de que el motor adivine.
export function calcularContexto(state, overrides = {}) {
  const liga = ligaDe(state);

  const base = {
    etapa: calcularEtapa(state),
    edadBanda: bandaPorTecho(state.age, BALANCE.contexto.edadBandas, 'veterana'),
    nivel: calcularNivel(state),
    estatus: calcularEstatus(state),
    momentum: calcularMomentum(state),
    mercado: calcularMercado(state),
    region: liga?.regionId ?? state.mundo.regionIdOrigen ?? null,
    residencia: 'local',
    ventana: calcularVentana(state),
    ladder: bandaDeLadder(state.player.ranked, servidorDeLaPartida(state)),
    rol: state.player.role,
    marcas: calcularMarcas(state),
    ...overrides
  };

  return { ...base, momento: momentoDe(base) };
}

function patronCoincide(contexto, patron) {
  return Object.entries(patron).every(([eje, esperados]) => {
    if (eje === 'marcas') {
      return esperados.every((marca) => contexto.marcas.includes(marca));
    }
    return esperados.includes(contexto[eje]);
  });
}

export function momentoDe(contexto) {
  const encontrado = MOMENTOS.find((momento) => patronCoincide(contexto, momento.patron));
  return encontrado ? encontrado.id : 'desconocido';
}

// El filtro con el que el contenido declara cuando aparece.
//
//   AND entre claves, OR adentro de cada clave.
//   Prefijo "!" en una marca la niega.
//   Clave ausente = sin restriccion.
//   `edadMin` / `edadMax` permiten gatear por edad exacta sin salirse del
//   contexto, para que la matriz de cobertura no se quede ciega.
export function coincideContexto(contexto, filtro, edad) {
  if (!filtro) {
    return true;
  }

  return Object.entries(filtro).every(([clave, valor]) => {
    if (clave === 'edadMin') {
      return edad >= valor;
    }
    if (clave === 'edadMax') {
      return edad <= valor;
    }
    if (clave === 'marcas') {
      return valor.every((marca) => (
        marca.startsWith('!')
          ? !contexto.marcas.includes(marca.slice(1))
          : contexto.marcas.includes(marca)
      ));
    }
    if (clave === 'momento') {
      return valor.includes(contexto.momento);
    }
    return valor.includes(contexto[clave]);
  });
}

// Cada sistema competitivo empuja acá un puntaje 0-100 de "cómo te fue este
// split". Es lo único que alimenta el momentum, y por eso vive en un solo lugar.
export function registrarEnHistorial(state, puntaje) {
  const historial = [...(state.career.historial ?? []), Math.round(clamp(puntaje, BALANCE.stats.min, BALANCE.stats.max))];
  return {
    ...state,
    career: { ...state.career, historial: historial.slice(-BALANCE.contexto.historialMaximo) }
  };
}

export function describirContexto(contexto) {
  const momento = MOMENTOS.find((entrada) => entrada.id === contexto?.momento);
  return momento ? momento.label : 'Situación sin nombre';
}
