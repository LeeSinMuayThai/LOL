import LIGAS from '../data/leagues.json' with { type: 'json' };
import LEYENDAS from '../data/leyendas.json' with { type: 'json' };
import { BALANCE } from '../data/balance.js';
import { clamp } from './numeros.js';
import { splitsJugadosEnTier, TIERS_DE_SPLIT } from './registro.js';
import { desdePuntos, etiquetaDeRanked, servidorDeLaPartida } from './ranked.js';

// El número de la carrera (FASE K, K1 — PLAN.md §K1, "K1 — decisiones de spec"
// y "K1 — lo que cambió la revisión de K1-A").
//
// `puntajeDeCarrera(state)` → { total, subtotal, componentes: [{ id, etiqueta,
// puntos, detalle }], nivel: { id, nombre, siguiente: { id, nombre, requisito }
// | null }, percentil, leyenda, potencial, perfil, hechos }
//
// Puro: sin `rng`, sin DOM, sin reloj, sin mutar el estado; constantes en
// `BALANCE.puntaje`. Lo compone `core/pipeline.js` al terminar la carrera
// (`state.tarjeta.puntaje`). Los textos son para el jugador: cada liga va con
// su `nombre` de `leagues.json`, nunca con su id. Falla fuerte: un registro que
// no se puede puntuar tira un `Error` que dice qué falta, nunca da NaN ni cae a
// un valor por defecto (un título de tier 3 con `liga: null` es válido).
//
// Seis componentes, todos >= 0 y crecientes en el logro (la monotonía), cada
// uno redondeado: el subtotal es su suma y el total, subtotal × el factor de
// potencial. 1 trayectoria (splits jugados por tier, D76) · 2 títulos (por
// tier × prestigio de su liga) · 3 internacional (× `dificultad` de la liga que
// representaste) · 4 el mundo y 5 la generación (× `pesoRol`) · 6 la soloQ.
//
// El NIVEL no sale del número: se gana con hechos (`BALANCE.puntaje.niveles`,
// gana el más alto que se cumple). El número se compara; su referente es el
// percentil (regla 13).

const P = () => BALANCE.puntaje;

const LIGA_POR_ID = Object.fromEntries(LIGAS.map((liga) => [liga.id, liga]));

// El "sin bonus" del internacional: la `dificultad` más baja de primera.
const DIFICULTAD_DE_REFERENCIA = Math.min(...LIGAS.filter((liga) => liga.tier === 1).map((liga) => liga.dificultad));

const LUGAR_DE_TIER = { 1: 'en primera', 2: 'en la liga de desarrollo', 3: 'en el circuito chico' };

// Los niveles, de abajo hacia arriba, en el orden de `BALANCE.puntaje.niveles`
// (que tiene el requisito de cada uno). "El GOAT" es el nombre provisorio del
// nivel "el nuevo Faker" (PLAN.md §K.1).
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
const INDICE_DE_NIVEL = Object.fromEntries(NIVELES.map((nivel, i) => [nivel.id, i]));

// --- Ayudas de texto ---

function plural(n, singular, pluralTexto) {
  return n === 1 ? singular : pluralTexto;
}

// "un split" / "3 splits" ("una temporada" con `uno = 'una'`).
function cantidad(n, singular, pluralTexto, uno = 'un') {
  return n === 1 ? `${uno} ${singular}` : `${n} ${pluralTexto}`;
}

// "a, b y c"
function enumerar(partes) {
  return partes.length <= 1 ? partes.join('') : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

// --- Fallar fuerte ---

function fallar(mensaje) {
  throw new Error(`puntajeDeCarrera: ${mensaje}`);
}

function ligaConocida(ligaId, donde) {
  return LIGA_POR_ID[ligaId] ?? fallar(`${donde} trae una liga desconocida (${String(ligaId)})`);
}

// El nombre que ve el jugador ("EMEA Masters", no "EMEA_MASTERS").
export function nombreDeLiga(ligaId) {
  return ligaConocida(ligaId, 'el texto').nombre;
}

// Los rivales de generación miden lo mismo que tu pico: un puesto del Top 20 del
// mundo (entero, de 1 a `BALANCE.topMundial.tamano`) o `0` si nunca entraron. Un
// `NaN` contaría en silencio como "no te ganó"; un 25 como un rank que no existe.
function validarRivales(rivales) {
  if (!Array.isArray(rivales)) {
    fallar('falta mundo.rivales');
  }
  const { tamano } = BALANCE.topMundial;
  rivales.forEach((rival, i) => {
    const puntaje = rival?.puntaje;
    if (!Number.isInteger(puntaje) || puntaje < 0 || puntaje > tamano) {
      fallar(`mundo.rivales[${i}] (${String(rival?.handle)}) trae un puntaje ${String(puntaje)} que no es un puesto del Top ${tamano} (ni 0)`);
    }
  });
}

function validarCarrera(state) {
  const potencial = state.player?.oculto?.potencial;
  if (!Number.isFinite(potencial)) {
    fallar(`falta el potencial oculto (player.oculto.potencial = ${String(potencial)})`);
  }
  if (!Number.isFinite(P().pesoRol[state.player.role])) {
    fallar(`el rol ${String(state.player.role)} no tiene pesoRol`);
  }
  const r = state.career?.registro ?? fallar('falta career.registro');
  for (const fila of r.porOrg) {
    if (!TIERS_DE_SPLIT.every((tier) => Number.isInteger(fila.splitsPorTier?.[tier]) && fila.splitsPorTier[tier] >= 0)) {
      // Es un objeto: `String` daría "[object Object]", así que este sí va con JSON.
      fallar(`la fila de ${fila.org} no trae splitsPorTier completo (${JSON.stringify(fila.splitsPorTier)})`);
    }
  }
  for (const t of r.titulos) {
    const donde = `el título ${t.nombre} ${t.anio}`;
    if (!TIERS_DE_SPLIT.includes(t.tier)) {
      fallar(`${donde} no trae tier (${String(t.tier)})`);
    }
    if (t.tier === 3 ? t.liga !== null : ligaConocida(t.liga, donde).tier !== t.tier) {
      fallar(t.tier === 3
        ? `${donde} es de tier 3 y trae liga ${String(t.liga)}: en tier 3 va liga: null`
        : `${donde} dice tier ${t.tier} y su liga ${t.liga} es de tier ${LIGA_POR_ID[t.liga].tier}`);
    }
  }
  for (const e of r.internacionales) {
    const donde = `el internacional ${e.torneo} ${e.anio}`;
    if (e.liga === undefined || e.liga === null) {
      fallar(`${donde} no trae la liga que representaste`);
    }
    if (ligaConocida(e.liga, donde).tier !== 1) {
      fallar(`${donde} representa a ${e.liga}, que no es una liga de primera`);
    }
    // La tabla que puntúa es la lista de resultados que se conocen: uno que no está
    // no puede valer "participar y nada más" en silencio.
    const { porResultado } = P().internacional;
    if (!Object.hasOwn(porResultado, e.resultado)) {
      fallar(`${donde} trae un resultado ${String(e.resultado)} que no se puntúa (los conocidos: ${Object.keys(porResultado).join(', ')})`);
    }
  }
  // [campo, valor, entero]: los conteos y los puestos son enteros; los puntos de soloQ, solo finitos.
  const contadores = [
    ['picos.rankMundial', r.picos?.rankMundial, true],
    ['picos.rankedPuntos', r.picos?.rankedPuntos, false],
    ['splitsEnTopMundial', r.splitsEnTopMundial, true],
    ['cierresComoNumeroUno', r.cierresComoNumeroUno, true]
  ];
  for (const [campo, valor, entero] of contadores) {
    if (!(entero ? Number.isInteger(valor) : Number.isFinite(valor)) || valor < 0) {
      fallar(`registro.${campo} inválido (${String(valor)})`);
    }
  }
  if (!Number.isInteger(r.picos.rankMundial) || r.picos.rankMundial > BALANCE.topMundial.tamano) {
    fallar(`registro.picos.rankMundial ${r.picos.rankMundial} no es un puesto del Top ${BALANCE.topMundial.tamano} (ni 0)`);
  }
  validarRivales(state.mundo?.rivales);
}

// --- Los datos de la carrera que mira el puntaje ---

function registroDe(state) {
  return state.career.registro;
}

function rankPicoDe(state) {
  return registroDe(state).picos.rankMundial;
}

function aniosProDe(state) {
  if (state.splitFichaje === null || state.splitFichaje === undefined) {
    return 0;
  }
  return Math.max(0, (state.player.splitCount - state.splitFichaje) / BALANCE.edad.splitsPorEdad);
}

function titulosDePrimera(registro) {
  return registro.titulos.filter((titulo) => titulo.tier === 1).length;
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
  // Tier 3 no es una liga: vale con el prestigio sintético de su zona.
  const prestigio = (t) => (t.tier === 3 ? BALANCE.tier3.fuerzaMedia : LIGA_POR_ID[t.liga].prestigio);
  const crudo = titulos.reduce((total, t) => total + porTitulo[t.tier] * (prestigio(t) / prestigioReferencia), 0);

  // "5 LCK, 2 LCK CL y 1 torneo chico", en el orden en que los ganaste por
  // primera vez. Tier 3 (`liga: null`) son torneos chicos.
  const porLiga = new Map();
  for (const titulo of titulos) {
    porLiga.set(titulo.liga, (porLiga.get(titulo.liga) ?? 0) + 1);
  }
  const lista = [...porLiga.entries()]
    .map(([liga, n]) => `${n} ${liga === null ? plural(n, 'torneo chico', 'torneos chicos') : nombreDeLiga(liga)}`);
  const porque = 'Cada copa pesa según su liga: una LCK vale más que una LCS.';
  let detalle;
  if (titulos.length === 0) {
    detalle = 'Ninguna copa: la vitrina quedó vacía.';
  } else if (titulos.length === 1) {
    const unica = titulos[0].liga === null ? 'un torneo chico de la región' : nombreDeLiga(titulos[0].liga);
    detalle = `Una sola copa: ${unica}. ${porque}`;
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
  const { participacion, porResultado } = P().internacional;
  const internacionales = registroDe(state).internacionales;
  const crudo = internacionales.reduce(
    (total, entrada) => total + (participacion + porResultado[entrada.resultado]) * LIGA_POR_ID[entrada.liga].dificultad,
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
    const nombre = nombreDeLiga(liga);
    const extra = Math.round((LIGA_POR_ID[liga].dificultad / DIFICULTAD_DE_REFERENCIA - 1) * 100);
    const porque = extra > 0
      ? `Saliendo de ${nombre} cuesta más llegar lejos: cada uno vale un ${extra}% más que saliendo de la región favorita.`
      : `Saliendo de ${nombre}, la región favorita, cada uno vale lo justo: sin bonus por dificultad.`;
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
  const temporadas = registroDe(state).splitsEnTopMundial;
  const { tamano } = BALANCE.topMundial;
  const crudo = (puntosDeBandaDeRank(rank) + temporadas * P().mundo.porTemporadaEnTop20) * pesoRol;

  const enElTop = temporadas > 0
    ? ` ${temporadas === 1 ? 'Una temporada cerrada' : `${temporadas} temporadas cerradas`} adentro del Top ${tamano}.`
    : '';
  let detalle;
  if (rank === 1) {
    detalle = `Fuiste el #1 del mundo.${enElTop}`;
  } else if (rank > 0) {
    detalle = `Tu pico: #${rank} del mundo.${enElTop}`;
  } else {
    detalle = `Nunca entraste al Top ${tamano} del mundo.`;
  }

  return { id: 'mundo', etiqueta: 'El mundo', crudo, detalle };
}

// --- 5. La generación ---

// ¿`a` es un rank mundial ESTRICTAMENTE mejor que `b`? `0` = nunca entró: va
// último, y dos ceros empatan. Los empates no superan a nadie.
function rankMejor(a, b) {
  return a > 0 && (b === 0 || a < b);
}

// Tu pico (`picos.rankMundial`) contra el de cada rival (`mundo.rivales[].puntaje`),
// los dos tomados al cierre de temporada (`systems/topMundial.js`).
export function puestoEnLaGeneracion(state) {
  const tuRank = rankPicoDe(state);
  const rivales = state.mundo.rivales;
  validarRivales(rivales);
  const mejores = rivales.filter((rival) => rankMejor(rival.puntaje, tuRank));
  const superados = rivales.filter((rival) => rankMejor(tuRank, rival.puntaje));
  const mejorRival = rivales
    .filter((rival) => rival.puntaje > 0)
    .sort((a, b) => a.puntaje - b.puntaje || (a.handle < b.handle ? -1 : 1))[0] ?? null;
  return {
    puesto: mejores.length + 1,
    de: rivales.length + 1,
    superados: superados.length,
    rivales: rivales.length,
    tuRank,
    mejorRival: mejorRival ? { handle: mejorRival.handle, rank: mejorRival.puntaje } : null
  };
}

function componenteGeneracion(state, pesoRol) {
  const g = P().generacion;
  const { tamano } = BALANCE.topMundial;
  const { puesto, de, superados, rivales, tuRank, mejorRival } = puestoEnLaGeneracion(state);
  const primero = tuRank > 0 && puesto === 1;
  const crudo = (superados * g.porRivalSuperado + (primero ? g.bonoPrimero : 0)) * pesoRol;

  let detalle;
  if (rivales === 0) {
    detalle = 'No hubo una generación contra la cual medirte.';
  } else if (primero) {
    detalle = mejorRival
      ? `Fuiste el mejor de tu generación: llegaste al #${tuRank} y de tu camada nadie pasó del #${mejorRival.rank} (${mejorRival.handle}).`
      : `Fuiste el mejor de tu generación: llegaste al #${tuRank} y nadie de tu camada tocó el Top ${tamano}.`;
  } else if (mejorRival && puesto > 1) {
    // Sin Top 20 el componente vale 0: no se lee como un logro ("quedaste 2º").
    detalle = tuRank > 0
      ? `Quedaste ${puesto}º de ${de} en tu generación: ${mejorRival.handle} llegó al #${mejorRival.rank} y vos al #${tuRank}.`
      : `Nadie de tu generación te quedó atrás: ${mejorRival.handle} llegó al #${mejorRival.rank} y vos nunca entraste al Top ${tamano}.`;
  } else {
    detalle = `Nadie de tu generación tocó el Top ${tamano} del mundo, y vos tampoco.`;
  }

  return { id: 'generacion', etiqueta: 'Tu generación', crudo, detalle };
}

// --- 6. La soloQ ---

function componenteSoloQ(state) {
  const s = P().soloQ;
  const puntos = registroDe(state).picos.rankedPuntos;
  const avance = clamp((puntos - s.puntosDesde) / (s.puntosHasta - s.puntosDesde), 0, 1);
  const servidor = servidorDeLaPartida(state);
  const pico = etiquetaDeRanked(desdePuntos(puntos, servidor), servidor);
  const detalle = state.splitFichaje === null
    ? `Tu techo en soloQ: ${pico}. Sin contrato, es lo único que queda en la planilla.`
    : `Tu techo en soloQ: ${pico}. Un piso chico: la soloQ no gana trofeos.`;

  return { id: 'soloq', etiqueta: 'La soloQ', crudo: s.tope * avance, detalle };
}

// --- El nivel: por hechos ---

export function hechosDeCarrera(state) {
  const r = registroDe(state);
  return {
    splitsJugados: TIERS_DE_SPLIT.reduce((total, tier) => total + splitsJugadosEnTier(r, tier), 0),
    splitsTier1: splitsJugadosEnTier(r, 1),
    titulosTier1: titulosDePrimera(r),
    cierresEnTop20: r.splitsEnTopMundial,
    rankPico: r.picos.rankMundial,
    cierresNumeroUno: r.cierresComoNumeroUno
  };
}

// "N más (hiciste X de M)" cuando ya hay algo; si no, solo "M".
function faltanDe(hecho, n, singular, pluralTexto, que, hiciste, uno) {
  return hecho === 0
    ? `${cantidad(n, singular, pluralTexto, uno)}${que}`
    : `${cantidad(n - hecho, singular, pluralTexto, uno)} más${que} (${hiciste} ${hecho} de ${n})`;
}

// Cada hecho que puede pedir un nivel: cuándo se cumple con `n`, y qué faltó
// en palabras (`plural` elige entre "faltó" y "faltaron").
const REQUISITOS = {
  splitsJugados: {
    cumple: (h, n) => h.splitsJugados >= n,
    falta: (h, n) => ({ texto: `jugar ${cantidad(n, 'split', 'splits')} con contrato`, plural: false })
  },
  splitsTier1: {
    cumple: (h, n) => h.splitsTier1 >= n,
    falta: (h, n) => ({ texto: faltanDe(h.splitsTier1, n, 'split', 'splits', ' en primera', 'jugaste'), plural: n - h.splitsTier1 > 1 })
  },
  titulosTier1: {
    cumple: (h, n) => h.titulosTier1 >= n,
    falta: (h, n) => ({ texto: faltanDe(h.titulosTier1, n, 'título', 'títulos', ' de liga de primera', 'ganaste'), plural: n - h.titulosTier1 > 1 })
  },
  cierresEnTop20: {
    cumple: (h, n) => h.cierresEnTop20 >= n,
    falta: (h, n) => ({
      texto: `cerrar ${faltanDe(h.cierresEnTop20, n, 'temporada', 'temporadas', ` en el Top ${BALANCE.topMundial.tamano} del mundo`, 'cerraste', 'una')}`,
      plural: false
    })
  },
  rankPicoHasta: {
    cumple: (h, n) => h.rankPico > 0 && h.rankPico <= n,
    falta: (h, n) => ({
      texto: `${n === 1 ? 'llegar al #1 del mundo' : `llegar al top ${n} del mundo`} (`
        + `${h.rankPico > 0 ? `tu pico fue #${h.rankPico}` : `nunca entraste al Top ${BALANCE.topMundial.tamano}`})`,
      plural: false
    })
  },
  cierresNumeroUno: {
    cumple: (h, n) => h.cierresNumeroUno >= n,
    falta: (h, n) => ({
      texto: `cerrar ${faltanDe(h.cierresNumeroUno, n, 'temporada', 'temporadas', ' como #1 del mundo', 'cerraste', 'una')}`,
      plural: false
    })
  }
};

// Los hechos que puede pedir un requisito (`validate.js` revisa `BALANCE` contra esto).
export const HECHOS_DE_REQUISITO = Object.keys(REQUISITOS);

function requisitoDe(clave) {
  return REQUISITOS[clave] ?? fallar(`BALANCE.puntaje.niveles pide un hecho que no existe: ${String(clave)}`);
}

// Gana el nivel más alto cuyo requisito se cumple entero (no son escalones
// anidados: un #3 del mundo sin títulos es "Figura mundial"). `siguiente` es el
// de arriba con lo que faltó, como hecho: "Te faltó un título de liga de primera."
export function nivelDeCarrera(hechos) {
  const niveles = P().niveles;
  const pendientes = (nivel) => Object.entries(nivel.requisito).filter(([clave, n]) => !requisitoDe(clave).cumple(hechos, n));
  const indice = niveles.map((nivel) => pendientes(nivel).length === 0).lastIndexOf(true);
  if (indice < 0) {
    fallar('ningún nivel se cumple: el primero de BALANCE.puntaje.niveles no puede pedir nada');
  }
  const proximo = niveles[indice + 1];
  let siguiente = null;
  if (proximo) {
    const partes = pendientes(proximo).map(([clave, n]) => requisitoDe(clave).falta(hechos, n));
    const verbo = partes.length > 1 || partes[0].plural ? 'faltaron' : 'faltó';
    siguiente = { id: proximo.id, nombre: NOMBRE_DE_NIVEL[proximo.id], requisito: `Te ${verbo} ${enumerar(partes.map((p) => p.texto))}.` };
  }
  return { id: niveles[indice].id, nombre: NOMBRE_DE_NIVEL[niveles[indice].id], siguiente };
}

// --- Potencial contra logro ---

export function factorDePotencial(potencial) {
  const { factorConPotencialMinimo, factorConPotencialMaximo } = P().potencial;
  const { potencialMin, potencialMax } = BALANCE.mundo;
  const t = clamp((potencial - potencialMin) / (potencialMax - potencialMin), 0, 1);
  return factorConPotencialMinimo + (factorConPotencialMaximo - factorConPotencialMinimo) * t;
}

// Habla según hasta dónde llegaste: a un techo alto que llegó lejos no se le
// dice "se esperaba más" (`BALANCE.puntaje.potencial.nivelAprovechado`/`nivelAMedias`).
function detalleDePotencial(potencial, factor, nivelId, hechos) {
  const { nivelAprovechado, nivelAMedias } = P().potencial;
  const efecto = Math.round((factor - 1) * 100);
  const base = `Tu techo era ${potencial}, oculto hasta hoy`;
  if (efecto > 0) {
    // Sin un solo split con contrato no hay logros a los que sumarles ese peso.
    return hechos.splitsJugados === 0
      ? `${base}: con ese techo cada logro habría pesado un ${efecto}% más, pero nunca llegaste a jugar un split con contrato.`
      : `${base}: con ese techo, cada cosa que lograste pesa un ${efecto}% más.`;
  }
  if (efecto === 0) {
    return `${base}: ni suma ni resta.`;
  }
  if (INDICE_DE_NIVEL[nivelId] >= INDICE_DE_NIVEL[nivelAprovechado]) {
    return `${base}: el talento estaba y lo hiciste rendir. Con un techo así la vara es más alta: el número se ajusta un ${-efecto}% para abajo.`;
  }
  if (INDICE_DE_NIVEL[nivelId] >= INDICE_DE_NIVEL[nivelAMedias]) {
    return `${base}: daba para más que esto, y el número se ajusta un ${-efecto}% para abajo.`;
  }
  return `${base}: con tanto talento se esperaba más, y eso resta un ${-efecto}%.`;
}

// --- Percentil ---

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

// Solo títulos de primera, igual que el `titulos` de cada leyenda.
function perfilDeCarrera(state) {
  const r = registroDe(state);
  return { anios: Math.round(aniosProDe(state)), titulos: titulosDePrimera(r), internacionales: r.internacionales.length, rankPico: rankPicoDe(state) };
}

function ejeDeRank(rank) {
  return rank > 0 ? BALANCE.topMundial.tamano + 1 - rank : 0;
}

// Euclídea sobre (años, títulos de primera, internacionales, rank), cada eje
// sobre su escala, más la penalización si la leyenda es de otro rol.
export function distanciaDeLeyenda(perfil, rol, leyenda) {
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

// La más cercana; empate: el `id` menor.
export function leyendaMasCercana(perfil, rol) {
  const ordenadas = LEYENDAS
    .map((leyenda) => ({ leyenda, distancia: distanciaDeLeyenda(perfil, rol, leyenda) }))
    .sort((a, b) => a.distancia - b.distancia || (a.leyenda.id < b.leyenda.id ? -1 : 1));
  const { id, handle, rol: rolLeyenda, region, anios, titulos, internacionales, rankPico, historia } = ordenadas[0].leyenda;
  return { id, handle, rol: rolLeyenda, region, anios, titulos, internacionales, rankPico, historia };
}

// --- El número ---

export function puntajeDeCarrera(state) {
  validarCarrera(state);
  const pesoRol = P().pesoRol[state.player.role];
  const componentes = [
    componenteTrayectoria(state),
    componenteTitulos(state),
    componenteInternacional(state),
    componenteMundo(state, pesoRol),
    componenteGeneracion(state, pesoRol),
    componenteSoloQ(state)
  ].map(({ id, etiqueta, crudo, detalle }) => ({ id, etiqueta, puntos: Math.round(crudo), detalle }));
  const subtotal = componentes.reduce((total, componente) => total + componente.puntos, 0);

  const valor = state.player.oculto.potencial;
  const factor = factorDePotencial(valor);
  const total = Math.round(subtotal * factor);
  const hechos = hechosDeCarrera(state);
  const nivel = nivelDeCarrera(hechos);
  const perfil = perfilDeCarrera(state);

  return {
    total,
    subtotal,
    componentes,
    nivel,
    percentil: percentilDePuntaje(total),
    leyenda: leyendaMasCercana(perfil, state.player.role),
    potencial: { valor, factor, puntos: total - subtotal, detalle: detalleDePotencial(valor, factor, nivel.id, hechos) },
    perfil,
    hechos
  };
}
