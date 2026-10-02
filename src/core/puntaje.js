import LIGAS from '../data/leagues.json' with { type: 'json' };
import LEYENDAS from '../data/leyendas.json' with { type: 'json' };
import { BALANCE } from '../data/balance.js';
import { clamp } from './numeros.js';
import { splitsJugadosEnTier, TIERS_DE_SPLIT } from './registro.js';
import { desdePuntos, etiquetaDeRanked, servidorDeLaPartida } from './ranked.js';

// El número de la carrera (FASE K, K1 — PLAN.md §K1 y "K1 — decisiones de spec").
//
// `puntajeDeCarrera(state)` →
//   { total, subtotal, componentes: [{ id, etiqueta, puntos, detalle }],
//     nivel: { id, nombre, siguiente }, percentil, leyenda, potencial, perfil }
//
// Puro: sin `rng`, sin DOM, sin reloj, sin mutar el estado. Todas las constantes
// viven en `BALANCE.puntaje`. `core/pipeline.js` lo compone una sola vez, cuando
// la carrera termina (`state.tarjeta.puntaje`); `simulate.js` lo pide sobre el
// estado final de cada carrera del lote. La pantalla (K1-B) muestra las
// etiquetas y los detalles tal cual: están escritos para el jugador.
//
// Los seis componentes son >= 0 y crecen con el logro (eso da la monotonía):
//  1. trayectoria  — splits jugados con contrato, por tier (`splitsPorTier`, D76)
//  2. titulos      — títulos domésticos por tier, × prestigio de su liga
//  3. internacional — participar y buen papel, × `dificultad` de la liga que representaste
//  4. mundo        — pico de rank mundial por bandas + temporadas en el Top 20 (× `pesoRol`)
//  5. generacion   — puesto contra los rivales de tu generación (× `pesoRol`)
//  6. soloq        — el piso: el pico de soloQ, para que "el que no llegó" también compare
// Cada componente se redondea a entero y el subtotal es su suma exacta (el
// desglose que se ve suma lo que dice). El total es el subtotal × el factor de
// potencial ("hasta dónde llegaste contra hasta dónde podías"), redondeado.

const P = () => BALANCE.puntaje;

const LIGA_POR_ID = Object.fromEntries(LIGAS.map((liga) => [liga.id, liga]));

// La `dificultad` más baja entre las ligas que mandan gente a un internacional:
// el "sin bonus" contra el que se dice cuánto más vale salir de otra región.
const DIFICULTAD_DE_REFERENCIA = Math.min(...LIGAS.filter((liga) => liga.tier === 1).map((liga) => liga.dificultad));

// Cómo se nombra cada tier en el desglose.
const LUGAR_DE_TIER = {
  1: 'en primera',
  2: 'en la liga de desarrollo',
  3: 'en el circuito chico'
};

// Los niveles con nombre, de abajo hacia arriba. "El GOAT" es el nombre visible
// provisorio del nivel "el nuevo Faker" (PLAN.md §K.1: inventado mientras el
// usuario no confirme el literal). Los cortes viven en `BALANCE.puntaje.niveles`.
export const NIVELES = [
  { id: 'no_llego', nombre: 'El que no llegó' },
  { id: 'circuito', nombre: 'Pasó por el circuito' },
  { id: 'profesional', nombre: 'Un profesional más' },
  { id: 'fijo', nombre: 'Fijo en primera' },
  { id: 'campeon', nombre: 'Campeón' },
  { id: 'figura', nombre: 'Figura mundial' },
  { id: 'leyenda', nombre: 'Leyenda' },
  { id: 'goat', nombre: 'El GOAT' }
];

const NOMBRE_DE_NIVEL = Object.fromEntries(NIVELES.map((nivel) => [nivel.id, nivel.nombre]));

// --- Ayudas de texto ---

function plural(n, singular, pluralTexto) {
  return n === 1 ? singular : pluralTexto;
}

// "a, b y c"
function enumerar(partes) {
  if (partes.length <= 1) {
    return partes.join('');
  }
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

function ordinal(n) {
  return `${n}º`;
}

// --- Los datos de la carrera que mira el puntaje ---

function registroDe(state) {
  return state.career.registro;
}

function rankPicoDe(state) {
  return registroDe(state).picos.rankMundial ?? 0;
}

function aniosProDe(state) {
  if (state.splitFichaje === null || state.splitFichaje === undefined) {
    return 0;
  }
  return Math.max(0, (state.player.splitCount - state.splitFichaje) / BALANCE.edad.splitsPorEdad);
}

function prestigioDeTitulo(titulo) {
  const liga = titulo.liga ? LIGA_POR_ID[titulo.liga] : null;
  return liga ? liga.prestigio : BALANCE.tier3.fuerzaMedia;
}

function dificultadDe(ligaId) {
  return LIGA_POR_ID[ligaId]?.dificultad;
}

// --- 1. Trayectoria ---

function componenteTrayectoria(state) {
  const { porSplit } = P().trayectoria;
  const registro = registroDe(state);
  const porTier = TIERS_DE_SPLIT.map((tier) => ({ tier, splits: splitsJugadosEnTier(registro, tier) }));
  const crudo = porTier.reduce((total, { tier, splits }) => total + splits * porSplit[tier], 0);

  const partes = porTier
    .filter(({ splits }) => splits > 0)
    .map(({ tier, splits }, i) => (i === 0
      ? `${splits} ${plural(splits, 'split', 'splits')} ${LUGAR_DE_TIER[tier]}`
      : `${splits} ${LUGAR_DE_TIER[tier]}`));
  const detalle = partes.length > 0
    ? `${enumerar(partes)}. Cuanto más arriba, más pesa cada split.`
    : 'Nunca jugaste un split con contrato: todo quedó en la soloQ.';

  return { id: 'trayectoria', etiqueta: 'Trayectoria', crudo, detalle };
}

// --- 2. Títulos domésticos ---

function componenteTitulos(state) {
  const { porTitulo, prestigioReferencia } = P().titulos;
  const titulos = registroDe(state).titulos;
  const crudo = titulos.reduce(
    (total, titulo) => total + porTitulo[titulo.tier] * (prestigioDeTitulo(titulo) / prestigioReferencia),
    0
  );

  // "5 LCK, 2 LCK_CL y 1 torneo chico", en el orden en que los ganaste por
  // primera vez. Tier 3 no tiene liga (`liga: null`): son torneos chicos.
  const porLiga = new Map();
  for (const titulo of titulos) {
    porLiga.set(titulo.liga, (porLiga.get(titulo.liga) ?? 0) + 1);
  }
  const lista = [...porLiga.entries()].map(([liga, n]) => `${n} ${liga ?? plural(n, 'torneo chico', 'torneos chicos')}`);
  const porque = 'Cada copa pesa según su liga: una LCK vale más que una LCS.';
  let detalle;
  if (titulos.length === 0) {
    detalle = 'Ninguna copa: la vitrina quedó vacía.';
  } else if (titulos.length === 1) {
    detalle = `Una sola copa: ${titulos[0].liga ?? 'un torneo chico de la región'}. ${porque}`;
  } else {
    detalle = `${titulos.length} copas: ${enumerar(lista)}. ${porque}`;
  }

  return { id: 'titulos', etiqueta: 'Títulos', crudo, detalle };
}

// --- 3. Internacional ---

// La liga que más veces representaste (empate: la primera).
function ligaPrincipalInternacional(internacionales) {
  const conteo = new Map();
  for (const entrada of internacionales) {
    conteo.set(entrada.liga, (conteo.get(entrada.liga) ?? 0) + 1);
  }
  return [...conteo.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function componenteInternacional(state) {
  const { participacion, buenPapel } = P().internacional;
  const internacionales = registroDe(state).internacionales;
  const crudo = internacionales.reduce(
    (total, entrada) => total
      + (participacion + (entrada.resultado === 'buen_papel' ? buenPapel : 0)) * dificultadDe(entrada.liga),
    0
  );

  const buenos = internacionales.filter((entrada) => entrada.resultado === 'buen_papel').length;
  let detalle;
  if (internacionales.length === 0) {
    detalle = 'Nunca viajaste a un internacional.';
  } else {
    const cuantos = internacionales.length === 1
      ? `Un internacional, ${buenos === 1 ? 'con buen papel' : 'y volviste temprano'}.`
      : `${internacionales.length} internacionales, ${buenos === 0 ? 'ninguno con buen papel' : `${buenos} con buen papel`}.`;
    const liga = ligaPrincipalInternacional(internacionales);
    const extra = Math.round((dificultadDe(liga) / DIFICULTAD_DE_REFERENCIA - 1) * 100);
    const porque = extra > 0
      ? `Saliendo de ${liga} cuesta más llegar lejos: cada uno vale un ${extra}% más que saliendo de la región favorita.`
      : `Saliendo de ${liga}, la región favorita, cada uno vale lo justo: sin bonus por dificultad.`;
    detalle = `${cuantos} ${porque}`;
  }

  return { id: 'internacional', etiqueta: 'Internacionales', crudo, detalle };
}

// --- 4. El mundo ---

function puntosDeBandaDeRank(rank) {
  const m = P().mundo;
  if (rank === 1) {
    return m.numeroUno;
  }
  if (rank > 0 && rank <= m.corteTop5) {
    return m.top5;
  }
  return rank > 0 ? m.top20 : 0;
}

function componenteMundo(state, pesoRol) {
  const rank = rankPicoDe(state);
  const temporadas = registroDe(state).splitsEnTopMundial ?? 0;
  const crudo = (puntosDeBandaDeRank(rank) + temporadas * P().mundo.porTemporadaEnTop20) * pesoRol;

  const enElTop = temporadas > 0
    ? ` ${temporadas === 1 ? 'Una temporada cerrada' : `${temporadas} temporadas cerradas`} adentro del Top ${BALANCE.topMundial.tamano}.`
    : '';
  let detalle;
  if (rank === 1) {
    detalle = `Fuiste el #1 del mundo.${enElTop}`;
  } else if (rank > 0) {
    detalle = `Tu pico: #${rank} del mundo.${enElTop}`;
  } else {
    detalle = `Nunca entraste al Top ${BALANCE.topMundial.tamano} del mundo.`;
  }

  return { id: 'mundo', etiqueta: 'El mundo', crudo, detalle };
}

// --- 5. La generación ---

// ¿`a` es un rank mundial ESTRICTAMENTE mejor que `b`? `0` = nunca entró: va
// último, y dos ceros empatan. Los empates no superan a nadie.
function rankMejor(a, b) {
  return a > 0 && (b === 0 || a < b);
}

export function puestoEnLaGeneracion(state) {
  const tuRank = rankPicoDe(state);
  const rivales = state.mundo?.rivales ?? [];
  const rankDe = (rival) => rival.puntaje ?? 0;
  const mejores = rivales.filter((rival) => rankMejor(rankDe(rival), tuRank));
  const superados = rivales.filter((rival) => rankMejor(tuRank, rankDe(rival)));
  const mejorRival = [...rivales]
    .filter((rival) => rankDe(rival) > 0)
    .sort((a, b) => rankDe(a) - rankDe(b) || (a.handle < b.handle ? -1 : 1))[0] ?? null;
  return {
    puesto: mejores.length + 1,
    de: rivales.length + 1,
    superados: superados.length,
    rivales: rivales.length,
    tuRank,
    mejorRival: mejorRival ? { handle: mejorRival.handle, rank: rankDe(mejorRival) } : null
  };
}

function componenteGeneracion(state, pesoRol) {
  const g = P().generacion;
  const { puesto, de, superados, rivales, tuRank, mejorRival } = puestoEnLaGeneracion(state);
  const primero = tuRank > 0 && puesto === 1;
  const crudo = (superados * g.porRivalSuperado + (primero ? g.bonoPrimero : 0)) * pesoRol;

  let detalle;
  if (rivales === 0) {
    detalle = 'No hubo una generación contra la cual medirte.';
  } else if (primero) {
    detalle = mejorRival
      ? `Fuiste el mejor de tu generación: llegaste al #${tuRank} y de tu camada nadie pasó del #${mejorRival.rank} (${mejorRival.handle}).`
      : `Fuiste el mejor de tu generación: llegaste al #${tuRank} y nadie de tu camada tocó el Top ${BALANCE.topMundial.tamano}.`;
  } else if (mejorRival && puesto > 1) {
    detalle = tuRank > 0
      ? `Quedaste ${ordinal(puesto)} de ${de} en tu generación: ${mejorRival.handle} llegó al #${mejorRival.rank} y vos al #${tuRank}.`
      : `Quedaste ${ordinal(puesto)} de ${de} en tu generación: ${mejorRival.handle} llegó al #${mejorRival.rank} y vos nunca entraste al Top ${BALANCE.topMundial.tamano}.`;
  } else {
    detalle = `Nadie de tu generación tocó el Top ${BALANCE.topMundial.tamano} del mundo, y vos tampoco.`;
  }

  return { id: 'generacion', etiqueta: 'Tu generación', crudo, detalle };
}

// --- 6. La soloQ ---

function componenteSoloQ(state) {
  const s = P().soloQ;
  const puntos = registroDe(state).picos.rankedPuntos ?? 0;
  const avance = clamp((puntos - s.puntosDesde) / (s.puntosHasta - s.puntosDesde), 0, 1);
  const crudo = s.tope * avance;

  const servidor = servidorDeLaPartida(state);
  const pico = etiquetaDeRanked(desdePuntos(puntos, servidor), servidor);
  const detalle = state.splitFichaje === null
    ? `Tu techo en soloQ: ${pico}. Sin contrato, es lo único que queda en la planilla.`
    : `Tu techo en soloQ: ${pico}. Un piso chico: la soloQ no gana trofeos.`;

  return { id: 'soloq', etiqueta: 'La soloQ', crudo, detalle };
}

// --- Potencial contra logro ---

export function factorDePotencial(potencial) {
  const { factorConPotencialMinimo, factorConPotencialMaximo } = P().potencial;
  const { potencialMin, potencialMax } = BALANCE.mundo;
  const t = clamp((potencial - potencialMin) / (potencialMax - potencialMin), 0, 1);
  return factorConPotencialMinimo + (factorConPotencialMaximo - factorConPotencialMinimo) * t;
}

function detalleDePotencial(potencial, factor) {
  const efecto = Math.round((factor - 1) * 100);
  const base = `Tu techo era ${potencial}, oculto hasta hoy`;
  if (efecto > 0) {
    return `${base}: llegar hasta acá con ese techo suma un ${efecto}%.`;
  }
  if (efecto < 0) {
    return `${base}: con tanto talento se esperaba más, y eso resta un ${-efecto}%.`;
  }
  return `${base}: ni suma ni resta.`;
}

// --- Nivel y percentil ---

export function nivelDePuntaje(total, fichó) {
  const cortes = P().niveles;
  if (!fichó) {
    return { id: 'no_llego', nombre: NOMBRE_DE_NIVEL.no_llego, siguiente: null };
  }
  let indice = 0;
  cortes.forEach((corte, i) => {
    if (total >= corte.desde) {
      indice = i;
    }
  });
  const proximo = cortes[indice + 1] ?? null;
  return {
    id: cortes[indice].id,
    nombre: NOMBRE_DE_NIVEL[cortes[indice].id],
    siguiente: proximo ? { id: proximo.id, nombre: NOMBRE_DE_NIVEL[proximo.id], faltan: proximo.desde - total } : null
  };
}

// "Mejor que el X% de las carreras": interpola sobre `BALANCE.puntaje.cuantiles`
// (pares [percentil, puntaje], crecientes). Con un puntaje igual al de varios
// pares, cuenta solo los que quedaron estrictamente por debajo.
export function percentilDePuntaje(total) {
  const tabla = P().cuantiles;
  let ultimoDebajo = -1;
  tabla.forEach(([, puntos], i) => {
    if (puntos < total) {
      ultimoDebajo = i;
    }
  });
  if (ultimoDebajo < 0) {
    return tabla[0][0];
  }
  if (ultimoDebajo === tabla.length - 1) {
    return tabla[tabla.length - 1][0];
  }
  const [p0, x0] = tabla[ultimoDebajo];
  const [p1, x1] = tabla[ultimoDebajo + 1];
  return Math.floor(p0 + (p1 - p0) * ((total - x0) / (x1 - x0)));
}

// --- La leyenda comparada ---

function perfilDeCarrera(state) {
  const registro = registroDe(state);
  return {
    anios: Math.round(aniosProDe(state)),
    titulos: registro.titulos.length,
    internacionales: registro.internacionales.length,
    rankPico: rankPicoDe(state)
  };
}

function ejeDeRank(rank) {
  return rank > 0 ? BALANCE.topMundial.tamano + 1 - rank : 0;
}

function distanciaDeLeyenda(perfil, rol, leyenda) {
  const { escala, penalizacionRolDistinto } = P().leyendas;
  const ejes = [
    (perfil.anios - leyenda.anios) / escala.anios,
    (perfil.titulos - leyenda.titulos) / escala.titulos,
    (perfil.internacionales - leyenda.internacionales) / escala.internacionales,
    (ejeDeRank(perfil.rankPico) - ejeDeRank(leyenda.rankPico)) / escala.rank
  ];
  const euclidea = Math.sqrt(ejes.reduce((total, eje) => total + eje * eje, 0));
  return euclidea + (leyenda.rol === rol ? 0 : penalizacionRolDistinto);
}

export function leyendaMasCercana(perfil, rol) {
  const ordenadas = LEYENDAS
    .map((leyenda) => ({ leyenda, distancia: distanciaDeLeyenda(perfil, rol, leyenda) }))
    .sort((a, b) => a.distancia - b.distancia || (a.leyenda.id < b.leyenda.id ? -1 : 1));
  const { id, handle, rol: rolLeyenda, region, anios, titulos, internacionales, rankPico, historia } = ordenadas[0].leyenda;
  return { id, handle, rol: rolLeyenda, region, anios, titulos, internacionales, rankPico, historia };
}

// --- El número ---

export function puntajeDeCarrera(state) {
  const pesoRol = P().pesoRol[state.player.role];
  const crudos = [
    componenteTrayectoria(state),
    componenteTitulos(state),
    componenteInternacional(state),
    componenteMundo(state, pesoRol),
    componenteGeneracion(state, pesoRol),
    componenteSoloQ(state)
  ];
  const componentes = crudos.map(({ id, etiqueta, crudo, detalle }) => ({
    id, etiqueta, puntos: Math.round(crudo), detalle
  }));
  const subtotal = componentes.reduce((total, componente) => total + componente.puntos, 0);

  const valorPotencial = state.player.oculto.potencial;
  const factor = factorDePotencial(valorPotencial);
  const total = Math.round(subtotal * factor);
  const fichó = state.splitFichaje !== null && state.splitFichaje !== undefined;
  const perfil = perfilDeCarrera(state);

  return {
    total,
    subtotal,
    componentes,
    nivel: nivelDePuntaje(total, fichó),
    percentil: percentilDePuntaje(total),
    leyenda: leyendaMasCercana(perfil, state.player.role),
    potencial: {
      valor: valorPotencial,
      factor,
      puntos: total - subtotal,
      detalle: detalleDePotencial(valorPotencial, factor)
    },
    perfil
  };
}
