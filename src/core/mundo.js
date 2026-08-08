import { roll, gauss, chance, pick, sample, weightedPick } from './rng.js';
import { clamp, clampStat } from './numeros.js';
import { BALANCE } from '../data/balance.js';
import { nivelDeCurva } from './curvas.js';
import { rankedInicial } from './ranked.js';
import { SERVIDORES } from '../data/servidores.js';
import { ARQUETIPOS } from '../data/meta-tags.js';
import { IDS_ROL } from '../data/roles.js';
import LIGAS from '../data/leagues.json' with { type: 'json' };
import CAMPEONES from '../data/champions.json' with { type: 'json' };

// Los handles se arman por silabas para que cada seed invente los suyos. Los
// companeros y rivales tienen que ser inventados (CLAUDE.md, precision de dominio).
const PREFIJOS_HANDLE = [
  'Ka', 'Zen', 'Ryu', 'Nox', 'Vel', 'Sil', 'Dra', 'Kor', 'Ash', 'Mir',
  'Tho', 'Gru', 'Lex', 'Vay', 'Nam', 'Ori', 'Kri', 'Sha', 'Ver', 'Ozz',
  'Bal', 'Cyn', 'Dae', 'Elu', 'Fen', 'Hal', 'Ith', 'Jor', 'Lum', 'Mal'
];

const SUFIJOS_HANDLE = [
  'ron', 'vex', 'ko', 'shi', 'dar', 'nis', 'zel', 'mir', 'tas', 'ken',
  'lux', 'rah', 'fin', 'sol', 'vik', 'nor', 'tep', 'jin', 'wen', 'bal',
  'que', 'rix', 'thy', 'ova', 'gal', 'hen', 'zor', 'nyx', 'ade', 'ith'
];

export function generarHandle(rng, usados) {
  const { probHandleConNumero, numeroHandleMin, numeroHandleMax } = BALANCE.mundo;

  for (let intento = 0; intento < PREFIJOS_HANDLE.length; intento += 1) {
    const base = `${pick(PREFIJOS_HANDLE, rng)}${pick(SUFIJOS_HANDLE, rng)}`;
    const handle = chance(probHandleConNumero, rng)
      ? `${base}${roll(numeroHandleMin, numeroHandleMax, rng)}`
      : base;

    if (!usados.has(handle)) {
      usados.add(handle);
      return handle;
    }
  }

  // Fallback deterministico si el espacio de nombres se saturara.
  const handle = `${pick(PREFIJOS_HANDLE, rng)}${usados.size}`;
  usados.add(handle);
  return handle;
}

function generarLigas(rng) {
  const { fuerzaOrgSpread, fuerzaOrgMin, fuerzaOrgMax } = BALANCE.mundo;

  return LIGAS.map((liga) => ({
    ...liga,
    orgs: liga.orgs.map((nombre) => ({
      nombre,
      liga: liga.id,
      // La fuerza orbita el prestigio de su liga: una org media de LCK sigue
      // siendo mas fuerte que la mejor de una liga chica.
      fuerza: Math.round(clamp(gauss(liga.prestigio, fuerzaOrgSpread, rng), fuerzaOrgMin, fuerzaOrgMax))
    }))
  }));
}

// Los cutoffs de cada servidor se sortean una vez por partida alrededor de sus
// valores reales: entrar a Challenger no cuesta lo mismo en dos carreras.
function generarServidores(rng) {
  const { cutoffSpread, proporcionCutoffGM } = BALANCE.ranked;

  return Object.fromEntries(SERVIDORES.map((servidor) => {
    const cutoffChallenger = Math.round(servidor.cutoffChallengerBase * (1 + gauss(0, cutoffSpread, rng)));
    return [servidor.id, {
      cutoffChallenger,
      cutoffGM: Math.round(cutoffChallenger * proporcionCutoffGM)
    }];
  }));
}

// Donde arranca en soloQ un pibe de 15. La mediana de la ladder real esta en
// Plata/Oro: nadie empieza en Platino. El potencial oculto corre el punto de
// partida, asi que un prodigio ya arranca mas arriba sin que se le diga.
function generarRankedInicial(servidorId, potencial, rng) {
  const r = BALANCE.ranked;
  const base = r.puntosInicialesBase + potencial * r.puntosInicialesPorPotencial;
  const puntos = Math.max(r.puntosInicialesMin, gauss(base, r.puntosInicialesSpread, rng));
  return rankedInicial(servidorId, puntos);
}

function generarMetaInicial(rng) {
  const { pesoMetaInicialMin, pesoMetaInicialMax } = BALANCE.mundo;
  const rango = pesoMetaInicialMax - pesoMetaInicialMin;

  return Object.fromEntries(
    ARQUETIPOS.map((tag) => [tag, Number((pesoMetaInicialMin + rng() * rango).toFixed(3))])
  );
}

function generarOrigen(rng) {
  const m = BALANCE.mundo;

  return {
    // Cuanto tiempo te come el colegio y que tan rapido caen los estudios.
    exigenciaColegio: roll(m.exigenciaColegioMin, m.exigenciaColegioMax, rng),
    // Cuanto aguantan tus viejos antes de bajarte del ranked.
    toleranciaViejos: roll(m.toleranciaViejosMin, m.toleranciaViejosMax, rng),
    // Si en tu casa sobra o falta, cambia cuanto pesa una oferta chica.
    apoyoEconomico: roll(m.apoyoEconomicoMin, m.apoyoEconomicoMax, rng)
  };
}

function generarOculto(rng) {
  const m = BALANCE.mundo;
  const formas = Object.entries(BALANCE.formasCarrera);
  const [formaCarrera, curva] = weightedPick(formas, ([, datos]) => datos.peso, rng);

  return {
    // Techo que el jugador nunca ve: solo lo intuye por como crece.
    potencial: Math.round(clamp(gauss(m.potencialMedia, m.potencialSpread, rng), m.potencialMin, m.potencialMax)),
    formaCarrera,
    // Edad de pico propia: no existe "la edad" en la que se declina.
    edadPico: Number(gauss(curva.picoEdad, curva.picoSpread, rng).toFixed(2)),
    // Rachas y slumps sin explicacion. Deriva split a split.
    forma: Number(gauss(0, m.formaInicialSpread, rng).toFixed(3))
  };
}

// Los stats de manos no salen de una constante: salen de la curva de carrera
// que te toco, evaluada a los 15. Un precoz ya arranca fuerte; a un tardio le
// falta todo. Es la unica forma de que la generacion del mundo y el sistema de
// atributos no se contradigan en el primer split.
function generarStatsIniciales(oculto, edadInicial, rng) {
  const { dispersionStats } = BALANCE.mundo;
  const conRuido = (valor) => Math.round(clampStat(gauss(valor, dispersionStats, rng)));

  const deCurva = Object.fromEntries(
    Object.entries(BALANCE.atributos.curvas).map(([stat, config]) => [
      stat,
      conRuido(nivelDeCurva(edadInicial, oculto, { declive: config.declive }))
    ])
  );

  const acumulativos = Object.fromEntries(
    Object.keys(BALANCE.atributos.acumulativos).map((stat) => [stat, conRuido(BALANCE.inicial.stats[stat])])
  );

  return {
    ...deCurva,
    ...acumulativos,
    mentalidad: conRuido(BALANCE.inicial.stats.mentalidad),
    hype: conRuido(BALANCE.inicial.stats.hype)
  };
}

// Las tres barras de la etapa amateur tambien salen de la cuna: no todos
// arrancan con el mismo colchon de notas, de paciencia en casa ni de sueño.
function generarBarrasIniciales(rng) {
  const { dispersionBarras } = BALANCE.mundo;
  const { studies, familyTrust, sleep } = BALANCE.inicial;

  return {
    studies: Math.round(clampStat(gauss(studies, dispersionBarras, rng))),
    familyTrust: Math.round(clampStat(gauss(familyTrust, dispersionBarras, rng))),
    sleep: Math.round(clampStat(gauss(sleep, dispersionBarras, rng)))
  };
}

function generarPoolInicial(rol, rng) {
  const { campeonesIniciales, maestriaInicialMin, maestriaInicialMax } = BALANCE.mundo;
  const delRol = CAMPEONES.filter((campeon) => campeon.role === rol);

  return sample(delRol, campeonesIniciales, rng).map((campeon) => ({
    name: campeon.name,
    tags: [...campeon.tags],
    mastery: roll(maestriaInicialMin, maestriaInicialMax, rng),
    partidas: 0
  }));
}

function generarRivales(rng, usados) {
  const m = BALANCE.mundo;

  return Array.from({ length: m.cantidadRivales }, () => {
    const [formaCarrera] = weightedPick(Object.entries(BALANCE.formasCarrera), ([, datos]) => datos.peso, rng);
    const liga = pick(LIGAS, rng);

    return {
      handle: generarHandle(rng, usados),
      role: pick(IDS_ROL, rng),
      liga: liga.id,
      region: liga.region,
      formaCarrera,
      potencial: Math.round(clampStat(gauss(m.rivalPotencialMedia, m.rivalPotencialSpread, rng))),
      // Se completa en el cierre de carrera: cada rival corre su propia historia.
      puntaje: 0,
      desenlace: null
    };
  });
}

// Sortea el mundo entero de una seed. Todo lo que devuelve es dato de estado:
// ningun sistema puede volver a sortearlo despues.
export function generarMundo(rng, edadInicial) {
  const usados = new Set();
  const ligas = generarLigas(rng);
  const ligaOrigen = pick(ligas, rng);
  const rol = pick(IDS_ROL, rng);
  const oculto = generarOculto(rng);

  return {
    jugador: {
      handle: generarHandle(rng, usados),
      role: rol,
      oculto,
      stats: generarStatsIniciales(oculto, edadInicial, rng),
      barras: generarBarrasIniciales(rng),
      championPool: generarPoolInicial(rol, rng),
      ranked: generarRankedInicial(ligaOrigen.servidor, oculto.potencial, rng)
    },
    origen: generarOrigen(rng),
    mundo: {
      ligas,
      ligaOrigen: ligaOrigen.id,
      regionOrigen: ligaOrigen.region,
      regionIdOrigen: ligaOrigen.regionId,
      servidorOrigen: ligaOrigen.servidor,
      servidores: generarServidores(rng),
      // Que region manda en esta generacion: sesga los internacionales.
      regionDominante: weightedPick(ligas, (liga) => liga.prestigio, rng).region,
      metaInicial: generarMetaInicial(rng),
      rivales: generarRivales(rng, usados)
    }
  };
}
