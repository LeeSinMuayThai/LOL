import { roll, gauss, chance, pick, sample, weightedPick } from './rng.js';
import { clamp, clampStat } from './numeros.js';
import { BALANCE } from '../data/balance.js';
import { nivelDeCurva } from './curvas.js';
import { rankedInicial } from './ranked.js';
import { SERVIDORES } from '../data/servidores.js';
import { ARQUETIPOS } from '../data/meta-tags.js';
import { IDS_ROL } from '../data/roles.js';
import { campeonesElegiblesAlInicio, entradaDePool } from './pool.js';
import { generarNombreOrg, generarOrgsTier3 } from './tier3.js';
import { generarPlanteles, fuerzaDePlantel } from './plantel.js';
import LIGAS from '../data/leagues.json' with { type: 'json' };

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

// Las ligas tier 1 traen su roster real y fijo (`orgs: [nombres]`); las tier 2
// declaran `orgsGeneradas: true` y una `cantidadOrgs` — sus rosters reales
// rotan temporada a temporada y no están investigados con la firmeza que pide
// CLAUDE.md para nombrar un equipo real, así que se generan igual que el
// tier 3 (fase 3), con un rango de fuerza más alto.
function generarLigas(rng, usadosOrgs) {
  const { fuerzaOrgSpread, fuerzaOrgMin, fuerzaOrgMax } = BALANCE.mundo;
  const c = BALANCE.competitivo;

  return LIGAS.map((liga) => {
    if (liga.orgsGeneradas) {
      return {
        ...liga,
        orgs: Array.from({ length: liga.cantidadOrgs }, () => ({
          nombre: generarNombreOrg(rng, usadosOrgs),
          liga: liga.id,
          fuerza: Math.round(clamp(gauss(liga.prestigio, c.fuerzaOrgTier2Spread, rng), c.fuerzaOrgTier2Min, c.fuerzaOrgTier2Max))
        }))
      };
    }

    return {
      ...liga,
      orgs: liga.orgs.map((nombre) => ({
        nombre,
        liga: liga.id,
        // La fuerza orbita el prestigio de su liga: una org media de LCK sigue
        // siendo mas fuerte que la mejor de una liga chica.
        fuerza: Math.round(clamp(gauss(liga.prestigio, fuerzaOrgSpread, rng), fuerzaOrgMin, fuerzaOrgMax))
      }))
    };
  });
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

// Bootstrap: `systems/meta.js` (fase 6) corre siempre y sobreescribe este
// vector con los pesos de un régimen de verdad ya en el split 1, antes de que
// nadie más lo lea. Se mantiene la tirada acá para no correr el stream de RNG
// del resto de `generarMundo` (rivales, tier3PorRegion) que viene después.
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

// El pool inicial. Si el jugador eligió sus mains, se respetan; si no (camino
// headless de simulate y validate), se sortean.
//
// Los `debut` quedan afuera en los dos casos: todavía no existen en este mundo.
// Y las tiradas de maestría se consumen igual se haya elegido o no, para que el
// stream del RNG no dependa de si hubo pantalla de inicio.
function generarPoolInicial(rol, rng, elegidos) {
  const { campeonesIniciales, maestriaInicialMin, maestriaInicialMax } = BALANCE.mundo;
  const delRol = campeonesElegiblesAlInicio(rol);

  // Las dos tiradas se consumen SIEMPRE y en el mismo orden, se haya elegido o
  // no: así el stream del RNG no depende de si hubo pantalla de inicio, y una
  // seed genera el mismo mundo para el que eligió y para el que no.
  const sorteados = sample(delRol, campeonesIniciales, rng);
  const maestrias = Array.from({ length: campeonesIniciales }, () => roll(maestriaInicialMin, maestriaInicialMax, rng));

  const pedidos = (elegidos ?? [])
    .map((nombre) => delRol.find((campeon) => campeon.name === nombre))
    .filter(Boolean)
    .slice(0, campeonesIniciales);

  const base = pedidos.length >= BALANCE.campeones.poolMinimo ? pedidos : sorteados;

  return base.map((campeon, i) => entradaDePool(campeon, maestrias[i]));
}

// Los rivales de generación debutan y corren una carrera de primera en
// paralelo a la tuya (CONCEPTO §6): su liga de origen tiene que ser tier 1,
// nunca una de desarrollo.
const LIGAS_TIER1 = LIGAS.filter((liga) => liga.tier === 1);

// D8 (parcial, fase 9M): cada rival de generación deja de ser una ficha suelta
// y pasa a OCUPAR la casilla de su rol en un plantel real — la misma org que
// `orgDelRival` (core/temporada.js) le asigna por hash del handle. La casilla
// ya está bien formada (nivel que orbita la fuerza de la org, edad, contrato);
// el rival sólo le presta su identidad y queda marcado para que
// `systems/plantel.js` lo trate como carrera larga. Cero `rng`: es un swap.
function insertarRivalesEnPlanteles(rivales, planteles, ligas) {
  for (const rival of rivales) {
    const liga = ligas.find((candidata) => candidata.id === rival.liga);
    if (!liga || liga.tier !== 1 || liga.orgs.length === 0) {
      continue;
    }
    const hash = [...rival.handle].reduce((suma, caracter) => suma + caracter.charCodeAt(0), 0);
    const orgNombre = liga.orgs[hash % liga.orgs.length].nombre;
    const plantel = planteles[orgNombre];
    if (!plantel) {
      continue;
    }
    plantel[rival.role] = { ...plantel[rival.role], handle: rival.handle, rivalDeGeneracion: true };
  }
}

// Fase 11 (§11.2, cierra D8): uno de los 5 se promueve a archirrival — el
// que comparte tu rol, y si no hay ninguno, el que comparte tu región de
// origen. Cero `rng` (es una elección, no un sorteo): determinista sobre el
// orden en que `generarRivales` ya los generó. `org`/`nivel` arrancan vacíos
// — `systems/rivales.js` los llena cada cierre de edad, junto con
// `titulos`/`internacionales`/`duelo`/`historial`.
function elegirArchirrival(rivales, rol, regionIdOrigen) {
  const regionIdDe = (rival) => LIGAS_TIER1.find((liga) => liga.id === rival.liga)?.regionId;
  const elegido = rivales.find((rival) => rival.role === rol)
    ?? rivales.find((rival) => regionIdDe(rival) === regionIdOrigen)
    ?? rivales[0]
    ?? null;
  if (!elegido) {
    return null;
  }
  return {
    handle: elegido.handle,
    rol: elegido.role,
    org: null,
    liga: elegido.liga,
    nivel: elegido.potencial,
    titulos: 0,
    internacionales: 0,
    duelo: { tuyos: 0, suyos: 0 },
    historial: []
  };
}

function generarRivales(rng, usados) {
  const m = BALANCE.mundo;

  return Array.from({ length: m.cantidadRivales }, () => {
    const [formaCarrera] = weightedPick(Object.entries(BALANCE.formasCarrera), ([, datos]) => datos.peso, rng);
    const liga = pick(LIGAS_TIER1, rng);

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
//
// `eleccion` es lo que el jugador decidio en la pantalla de inicio:
// `{ handle?, rol?, campeones? }`. Si no viene, se sortea todo como antes — ese
// es el camino que corren simulate.js y validate.js, que no cambian una linea.
//
// El MUNDO sigue saliendo entero de la seed; lo que se elige es la identidad.
// Cada tirada se consume igual haya eleccion o no, asi la misma seed genera el
// mismo mundo para el que eligio y para el que no.
export function generarMundo(rng, edadInicial, eleccion = null) {
  const usados = new Set();
  const usadosOrgs = new Set();
  const ligasBase = generarLigas(rng, usadosOrgs);
  const ligasTier1 = ligasBase.filter((liga) => liga.tier === 1);

  // De dónde sos. Pesado por prestigio (tamaño de escena): nacer en Corea no
  // es 1 en 6 como nacer en Brasil (fase 3) — antes era un sorteo parejo entre
  // todas las ligas, tier 2 incluido.
  const ligaOrigen = weightedPick(ligasTier1, (liga) => liga.prestigio, rng);
  const rolSorteado = pick(IDS_ROL, rng);
  const rol = IDS_ROL.includes(eleccion?.rol) ? eleccion.rol : rolSorteado;
  const oculto = generarOculto(rng);

  const handleSorteado = generarHandle(rng, usados);
  const handle = eleccion?.handle?.trim() ? eleccion.handle.trim() : handleSorteado;

  // Fase 9M (PLAN.md §9M.2): el mundo tiene gente. Se genera acá, en posición
  // fija del stream (después de generarLigas, antes de generarRivales — trampa
  // T1). Cada casilla orbita el `fuerza` sorteado de su org, y después
  // `org.fuerza` pasa a DERIVAR del promedio de nivel de su plantel: el día 1
  // la distribución agregada es idéntica; desde el año 2 un equipo que ficha
  // bien sube de fuerza (lo recalcula `systems/plantel.js` cada offseason).
  const planteles = generarPlanteles(rng, ligasBase, ligaOrigen.regionId, usados);
  const rivales = generarRivales(rng, usados);
  insertarRivalesEnPlanteles(rivales, planteles, ligasBase);

  const ligas = ligasBase.map((liga) => ({
    ...liga,
    orgs: liga.orgs.map((org) => (
      planteles[org.nombre] ? { ...org, fuerza: fuerzaDePlantel(planteles[org.nombre]) } : org
    ))
  }));

  return {
    jugador: {
      handle,
      role: rol,
      oculto,
      stats: generarStatsIniciales(oculto, edadInicial, rng),
      barras: generarBarrasIniciales(rng),
      championPool: generarPoolInicial(rol, rng, eleccion?.campeones),
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
      // Que region manda en esta generacion: sesga los internacionales. Solo
      // entre las tier 1: una de desarrollo nunca es la region dominante.
      regionDominante: weightedPick(ligasTier1, (liga) => liga.prestigio, rng).region,
      metaInicial: generarMetaInicial(rng),
      rivales,
      archirrival: elegirArchirrival(rivales, rol, ligaOrigen.regionId),
      // Los 5 planteles por org de tier 1 y de la tier 2 de tu región (~340
      // NPCs con edad, contrato y carrera propia). El resto del mundo sigue con
      // `fuerza` escalar. `systems/plantel.js` los envejece cada offseason.
      planteles,
      // Los equipos chicos por region donde ficha todo el mundo la primera
      // vez (fase 3): comparten el pool de nombres con las orgs de tier 2
      // para que dos niveles distintos nunca terminen con el mismo nombre.
      tier3PorRegion: generarOrgsTier3(rng, usadosOrgs)
    }
  };
}
