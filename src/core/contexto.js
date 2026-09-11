import { BALANCE } from '../data/balance.js';
import { clamp } from './numeros.js';
import { bandaDeLadder, servidorDeLaPartida } from './ranked.js';
import { campeonesMuertos } from './ajusteMeta.js';
import { campeonNuevoPendiente } from './pool.js';
import { residenciaEn } from './demanda.js';
import { nivelDelJugador } from './ficha.js';
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

function calcularEtapa(state, nivel) {
  if (state.phase === 'amateur') {
    return 'amateur';
  }
  if (state.phase === 'retirado') {
    return 'retirado';
  }

  // El debut son los primeros splits desde el fichaje: sos el rookie y casi no
  // decidis nada. Mecanicamente ya existe (jerarquia baja -> no te dan tus
  // picks); lo que faltaba era poder nombrarlo para gatear contenido.
  //
  // Llegar a tier 1 reinicia el reloj (fase 3): un pibe puede llevar diez
  // splits siendo "pro" en tier 3 y tier 2, pero el debut que importa —el que
  // describe CONCEPTO §2— es pisar una liga real por primera vez, no
  // cualquier contrato chico.
  const splitDeReferencia = nivel === 'tier1' && state.career.splitAscensoTier1 !== null
    ? state.career.splitAscensoTier1
    : (state.splitFichaje ?? 0);
  const splitsComoPro = state.player.splitCount - splitDeReferencia;
  if (splitsComoPro < BALANCE.contexto.splitsDeDebut) {
    return 'debut';
  }

  // Fase 10a (D30): 'declive' deja de ser un valor muerto — no es una edad
  // fija, es presión de mercado real: banqueado, caíste de tier 1 y no
  // volviste, o tu nivel cayó por debajo de tu propio pico (ver `enDeclive`
  // más abajo). `systems/retiro.js` es el que actúa sobre esto de verdad (el
  // reloj real del retiro); el resto del contenido lo puede leer como
  // cualquier otra etapa.
  if (enDeclive(state)) {
    return 'declive';
  }

  return 'profesional';
}

// NOTA: a propósito NO incluye "sin equipo" (`nivel === 'libre'`) — el check
// estático "Ningún token puede quedar sin resolver..." (`validate.js`) ya
// asume que `etapa: 'declive'` implica tener equipo (`CON_EQUIPO` incluye
// 'declive' junto a 'debut'/'profesional'), así que el contenido puede usar
// `{org}`/`{liga}` con esa condición sin blindaje extra. La presión de estar
// sin equipo es señal real igual — `systems/retiro.js` la suma por su cuenta,
// leyendo `career.currentOrg` directo, sin pasar por este eje compartido.
function enDeclive(state) {
  const r = BALANCE.retiro;
  if (state.age < r.edadMinimaDeclive) {
    return false;
  }
  // Banqueado: perdiste el puesto frente al suplente.
  if (state.flags.banquilloPendiente) {
    return true;
  }
  // Llegaste a tier 1 alguna vez y hoy no estás ahí: te cayó la escalera
  // (D16, `competitivo.js`/`mercado.js`) y no volviste a subir. Señal
  // discreta, no un margen de puntos — "llegaste a tier 1 y la hiciste
  // mal" es exactamente el caso que pidió el usuario.
  if (state.career.splitAscensoTier1 !== null && state.career.tier !== 1) {
    return true;
  }
  // O tu nivel actual cayó en serio respecto de tu propio pico — el declive
  // biológico de verdad (`CONCEPTO` §12.4: es raro, pero existe).
  const pico = state.career.registro.picos.nivel;
  return pico > 0 && (pico - nivelDelJugador(state)) >= BALANCE.contexto.margenDeclive;
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
  // `career.tier` es la fuente de verdad (fase 3): tier 3 no es una liga real,
  // así que no se puede derivar de `ligaDe(state)`, que da null ahí.
  return `tier${state.career.tier ?? 1}`;
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
  // El año muerto (fases 3 y 9Md): sos nivel de tier 1 pero te falta la edad
  // que exigen LEC/LPL (18). Seguís en tier 2 hasta que el cumpleaños destraba
  // la oferta (el mercado la genera solo apenas calificás).
  if (state.career.tier === 2
    && state.age < BALANCE.competitivo.edadDebutTardio
    && nivelDelJugador(state) >= BALANCE.competitivo.nivelParaTier1) {
    marcas.push('espera_edad_minima');
  }

  // Descenso reciente de tier 1 (fase 9Md, D16).
  if (state.flags.splitDescenso != null
    && state.player.splitCount - state.flags.splitDescenso < BALANCE.contexto.ventanaDescenso) {
    marcas.push('descenso');
  }

  // Fase 10a: el retiro reversible. La ventana está abierta mientras
  // `phase: 'retirado'` y `terminado: false` (lo cierra `systems/retiro.js`,
  // no una edad); la vuelta queda marcada un rato después de usarla, mismo
  // patrón que `descenso`/`ventanaDescenso`.
  if (state.phase === 'retirado' && !state.terminado) {
    marcas.push('ventana_de_vuelta');
  }
  if (state.flags.splitVuelta != null
    && state.player.splitCount - state.flags.splitVuelta < BALANCE.contexto.ventanaDescenso) {
    marcas.push('vuelta_del_retiro');
  }

  // Fase 9Wb (§9W.4): estás en el Top 20 del mundo AHORA / sos el #1. Estado
  // vivo (`flags.rankMundialActual`), no un pico — el contenido de "defendé el
  // #1" / "el rookie que va por tu lugar" (catálogo en fase 13) le habla a
  // quien está ahí ahora. El "eras top y te caíste" es de la fase 10, contra
  // `picos.rankMundial`.
  const rankMundial = state.flags.rankMundialActual;
  if (rankMundial != null && rankMundial <= BALANCE.topMundial.tamano) {
    marcas.push('top_mundial');
  }
  if (rankMundial === 1) {
    marcas.push('mejor_del_mundo');
  }

  // Fase 10c: `lesion_cronica` prende con la primera lesión GRAVE y ya no se
  // apaga (mismo criterio que `es_campeon`/`nomade`) — la leve es solo un
  // aviso, no te deja marca permanente. `servicio_militar` dura lo que tarda
  // en resolverse la cadena de 3 decisiones (`systems/servicioMilitar.js`),
  // normalmente un solo split.
  if (state.flags.lesionGraveSplit != null) {
    marcas.push('lesion_cronica');
  }
  if (state.flags.enServicioMilitar) {
    marcas.push('servicio_militar');
  }

  return [...marcas, ...marcasDePool(state), ...marcasDeRegistro(state)];
}

// Lo que ya viviste, leído como contexto (fase 8D). Todo esto sale de
// `career.registro` (fase 8), que ya lo acumula — cero persistencia nueva acá,
// solo la traducción a marca. Es lo que hace que un título de hace diez
// splits, o el club número tres de la carrera, le sigan importando al
// contenido de ahora, no solo al del momento en que pasó.
function marcasDeRegistro(state) {
  const r = BALANCE.registro;
  const registro = state.career.registro;
  const marcas = [];

  if (registro.titulos.length > 0) {
    marcas.push('es_campeon');
  }
  if (registro.titulos.length >= r.multicampeonUmbral) {
    marcas.push('multicampeon');
  }
  if (registro.porOrg.some((fila) => fila.tier === 3)) {
    marcas.push('paso_por_tier3');
  }
  if (registro.splitsJugados >= r.curtidoSplitsUmbral) {
    marcas.push('curtido');
  }
  if (registro.porOrg.length >= r.nomadeOrgsUmbral) {
    marcas.push('nomade');
  }

  return marcas;
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
    if (campeonesMuertos([principal], state.meta.tierList).length > 0) {
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
  const nivel = calcularNivel(state);

  const base = {
    etapa: calcularEtapa(state, nivel),
    edadBanda: bandaPorTecho(state.age, BALANCE.contexto.edadBandas, 'veterana'),
    nivel,
    estatus: calcularEstatus(state),
    momentum: calcularMomentum(state),
    mercado: calcularMercado(state),
    region: liga?.regionId ?? state.mundo.regionIdOrigen ?? null,
    // D29: dejaba de ser el literal 'local' fijo. `residenciaEn` la deriva de
    // `career.registro.porOrg` (splits acumulados en la región). Hasta que 9Md
    // abra el mercado entre regiones, sigue dando 'local' en la práctica —
    // pero ya no por construcción: un estado con carrera en otra región da
    // 'import'/'residente'.
    residencia: residenciaEn(state, liga?.regionId ?? state.mundo.regionIdOrigen),
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
