import { BALANCE } from '../data/balance.js';
import { ROLES } from '../data/roles.js';
import { bandaDeArraigo as idDeBandaDeArraigo } from './registro.js';
import { etiquetaCampo } from './selectors.js';
import { deltaCorto } from './formato.js';
import { ORIGEN_DESGASTE, desgasteDe } from './curvas.js';
import { conSplitPendienteAsentado } from './registro.js';
import { puntajeDeCarrera, escalonDeCarrera } from './puntaje.js';

// La ficha de carrera (fase 8, PLAN.md §8.3): lo que la UI pinta en la
// tarjeta permanente (`src/ui/components/ficha.js`). Puro, sin RNG — se
// puede llamar en cualquier momento sin mover el balance.

// --- El número único (H7 de PLAN.md) ---
//
// La MISMA suma ponderada por rol que ya usa `rendimientoBase`
// (core/fuerza.js; hasta K2a, `calcularRendimiento`) ANTES de aplicarle meta, maestría, sinergia,
// jerarquía y ruido — el "cuánto rendís en limpio", sin el contexto del
// split. Se extrae acá para que rendimiento.js la importe en vez de
// mantener dos copias de la misma fórmula (regla de proceso 2: la fórmula
// no se reescribe ni se retunea, solo se expone).
export function nivelDelJugador(state) {
  const { pesos } = ROLES[state.player.role];
  return Object.entries(pesos).reduce((suma, [stat, peso]) => suma + state.player.stats[stat] * peso, 0);
}

export function bandaDeNivel(nivel) {
  const { nivelBandas } = BALANCE.ficha;
  if (nivel <= nivelBandas.prospecto) {
    return 'prospecto';
  }
  if (nivel <= nivelBandas.titular) {
    return 'titular';
  }
  if (nivel <= nivelBandas.elite) {
    return 'elite';
  }
  return 'clase_mundial';
}

// --- Las flechas ▲▼ (imagen 2/14 de PLAN.md) ---
//
// Contra `flags.edadSnapshot` (la foto que `edadInicio.js` toma al abrir
// cada edad — `CAMPOS_EDAD` incluye los 6 atributos de rol desde la fase 8).
// Un delta menor a `BALANCE.ficha.umbralFlecha` no dibuja flecha: una deriva
// de 0,4 no es una noticia.
const STATS_DE_ROL = ['mecanica', 'macro', 'teamfight', 'laneo', 'shotcalling', 'adaptabilidad'];

export function deltasDeStats(state) {
  const snapshot = state.flags.edadSnapshot ?? {};
  const deltas = {};
  for (const stat of STATS_DE_ROL) {
    const antes = snapshot[`player.stats.${stat}`];
    if (antes === undefined) {
      continue;
    }
    const diferencia = state.player.stats[stat] - antes;
    if (Math.abs(diferencia) >= BALANCE.ficha.umbralFlecha) {
      deltas[stat] = Math.round(diferencia);
    }
  }
  return deltas;
}

// El stat que más pesa de un vistazo: el más alto entre los que tu rol
// pondera (imagen 1 de PLAN.md: "65 VELOCIDAD" resaltado).
export function statDestacado(state) {
  const stats = Object.keys(ROLES[state.player.role].pesos);
  return stats.reduce((mejor, stat) => (state.player.stats[stat] > state.player.stats[mejor] ? stat : mejor), stats[0]);
}

// --- Mentalidad y Hype (fase 9R.2) ---
//
// Hasta acá NO se dibujaban en ninguna pantalla profesional, y el 74% de los
// efectos del contenido mueve una de las dos. El 12,5% de las carreras muere
// de burnout (`atributos.js`, `mentalidad ≤ burnoutUmbral` con probabilidad
// creciente) sin que el jugador vea nunca la barra. `al_limite` es el aviso
// que no existía.
function delta(state, campo) {
  const antes = state.flags.edadSnapshot?.[`player.stats.${campo}`];
  if (antes === undefined) {
    return 0;
  }
  const diferencia = state.player.stats[campo] - antes;
  return Math.abs(diferencia) >= BALANCE.ficha.umbralFlecha ? Math.round(diferencia) : 0;
}

const LABELS_MENTALIDAD = { al_limite: 'al límite', tensionado: 'tensionado', entero: 'entero', en_llamas: 'en llamas' };

export function bandaDeMentalidad(state) {
  const valor = state.player.stats.mentalidad;
  // `al_limite` = la zona roja desde la que el burnout puede pinchar
  // (`atributos.burnoutMentalBajo`). Es exactamente la barra que hay que
  // mirar.
  const id = valor <= BALANCE.atributos.burnoutMentalBajo ? 'al_limite'
    : valor <= 50 ? 'tensionado'
      : valor <= 75 ? 'entero'
        : 'en_llamas';
  return { id, label: LABELS_MENTALIDAD[id], valor: Math.round(valor), delta: delta(state, 'mentalidad'), peligro: id === 'al_limite' };
}

const LABELS_HYPE = { ignoto: 'ignoto', conocido: 'conocido', figura: 'figura', estrella: 'estrella' };
// W1 (PLANUI §0.7): los techos de cada banda de hype en un solo lugar, para que la escalera de la ficha
// (`escaleraDeHype`) nombre el mismo umbral que usa esta banda. Los valores son los de siempre.
const TECHOS_HYPE = { ignoto: 25, conocido: 55, figura: 80 };

export function bandaDeHype(state) {
  const valor = state.player.stats.hype;
  const id = valor <= TECHOS_HYPE.ignoto ? 'ignoto'
    : valor <= TECHOS_HYPE.conocido ? 'conocido'
      : valor <= TECHOS_HYPE.figura ? 'figura'
        : 'estrella';
  return { id, label: LABELS_HYPE[id], valor: Math.round(valor), delta: delta(state, 'hype') };
}

// --- Las barras con hitos (jerarquía y arraigo) ---

const LABELS_JERARQUIA = { rookie: 'Rookie', titular: 'Titular', referente: 'Referente', franquicia: 'Franquicia' };

// Reusa `BALANCE.contexto.estatusBandas` — las mismas bandas que ya
// gatean contenido en `core/contexto.js:78`, ahora también expuestas para
// la barra visual.
export function bandaDeJerarquia(state) {
  const valor = state.career.jerarquia;
  const { estatusBandas } = BALANCE.contexto;
  const ids = ['rookie', 'titular', 'referente', 'franquicia'];
  const pisos = [0, estatusBandas.rookie, estatusBandas.titular, estatusBandas.referente];
  const techos = [estatusBandas.rookie, estatusBandas.titular, estatusBandas.referente, BALANCE.stats.max];

  let i = techos.length - 1;
  for (let k = 0; k < techos.length; k += 1) {
    if (valor <= techos[k]) {
      i = k;
      break;
    }
  }

  return { id: ids[i], label: LABELS_JERARQUIA[ids[i]], valor, piso: pisos[i], techo: techos[i], esMaxima: i === ids.length - 1 };
}

const LABELS_ARRAIGO = { uno_mas: 'Uno más', querido: 'Querido', idolo: 'Ídolo', leyenda: 'Leyenda' };

// Reusa `bandaDeArraigo` de `core/registro.js` (el id) para no mantener dos
// veces la comparación contra `BALANCE.arraigo.hitos` — acá se enriquece con
// lo que la barra necesita: piso, techo del próximo hito, y si ya es el
// último (para pintarla dorada, imagen 14 de PLAN.md).
export function bandaDeArraigoFicha(valorArraigo) {
  const { hitos } = BALANCE.arraigo;
  const ids = ['uno_mas', 'querido', 'idolo', 'leyenda'];
  const pisos = ids.map((id) => hitos[id]);
  const id = idDeBandaDeArraigo(valorArraigo);
  const i = ids.indexOf(id);
  const techo = i === ids.length - 1 ? BALANCE.stats.max : pisos[i + 1];

  return { id, label: LABELS_ARRAIGO[id], valor: valorArraigo, piso: pisos[i], techo, esMaxima: i === ids.length - 1 };
}

// --- El estado internacional, con nombre en vez de un contador ---
//
// Imagen 1/5/6 de PLAN.md: "SELECCIÓN: SIN CHANCE" → "EN CARPETA" →
// "CONVOCADO". El equivalente de LoL es el cupo internacional de tu liga.
function ligaDe(state) {
  if (!state.career.liga) {
    return null;
  }
  return state.mundo.ligas.find((liga) => liga.id === state.career.liga) ?? null;
}

// `null` si no hay un cupo del que hablar (amateur, tier 2 y 3, retirado): el cupo internacional es de la liga de primera, y
// "sin chance" ahí es un veredicto sobre una puerta que ni siquiera es la tuya. La pantalla no dibuja el chip.
export function estadoInternacional(state) {
  if (state.serie?.activa && state.serie.ronda === 'internacional') {
    return 'jugando';
  }
  const liga = ligaDe(state);
  if (!liga || liga.tier !== 1) {
    return null;
  }
  const cupos = liga?.cuposInternacionales ?? 0;
  if (cupos <= 0 || !state.career.posicion) {
    return 'sin_chance';
  }
  if (state.career.posicion <= cupos) {
    return 'clasificado';
  }
  return state.career.posicion <= cupos + 2 ? 'en_carpeta' : 'sin_chance';
}

// El duelo contra el archirrival (fase 11, §11.2): `mundo.archirrival` sale
// elegido desde `generarMundo` (siempre hay uno mientras haya rivales de
// generación) y `systems/rivales.js` le mantiene el `duelo` al día cada
// cierre de edad — títulos + internacionales acumulados, de cada lado. El
// contador de la ficha (item 1 de los "tres lugares" de §11.2) lee esto.
export function dueloDeGeneracion(state) {
  const archirrival = state.mundo.archirrival;
  if (!archirrival) {
    return null;
  }
  const { tuyos, suyos } = archirrival.duelo;
  // Un 0-0 no es un duelo: hasta que alguno de los dos sume un título o un internacional, no hay nada que contar.
  if (tuyos + suyos === 0) {
    return null;
  }
  return {
    handle: archirrival.handle,
    org: archirrival.org,
    tuyos,
    suyos,
    vasGanando: tuyos >= suyos
  };
}

// --- K3-B: "Lo que construiste" ---
//
// Las marcas del registro (`registro.marcas`: lo que una decisión le dejó a una curva de edad), agregadas por
// stat, origen y año — el origen es el nombre visible del evento, nunca un id, y el año va en la línea
// ("▲ +3 Mecánica — Bootcamp en Corea 2028"). Solo se cuentan las que acumulan un bonus que redondea a
// `marcaMinimaVisible` o más en valor absoluto; una deriva de 0,2 no es una noticia (igual que las flechas).
export function loQueConstruiste(registro) {
  const { marcaMinimaVisible, marcasVisibles } = BALANCE.ficha;
  const filas = new Map();
  for (const marca of registro.marcas ?? []) {
    // K5c-E: lo que se gastó con los años no es una decisión: va en su propia línea (`loQueTeSacaronLosAnios`).
    if (marca.origen === ORIGEN_DESGASTE) {
      continue;
    }
    const clave = `${marca.stat}|${marca.origen}|${marca.anio}`;
    const previa = filas.get(clave);
    filas.set(clave, previa ? { ...previa, acumulado: previa.acumulado + marca.delta } : { ...marca, acumulado: marca.delta });
  }
  return [...filas.values()]
    .map((fila) => ({ ...fila, delta: Math.sign(fila.acumulado) * Math.round(Math.abs(fila.acumulado)) }))
    .filter((fila) => Math.abs(fila.delta) >= marcaMinimaVisible)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, marcasVisibles)
    .map(({ stat, delta, origen, anio }) => ({
      stat,
      delta,
      origen,
      anio,
      texto: `${delta > 0 ? '▲' : '▼'} ${deltaCorto(delta)} ${etiquetaCampo(`player.stats.${stat}`).toLowerCase()} — ${origen} ${anio}`
    }));
}

// K5c-E: una sola línea con lo que te sacaron los años (`player.desgaste`: el bonus que se gastó en los stats de curva y
// los puntos que te faltan de cada acumulativo), con los mismos umbrales que las marcas (`marcaMinimaVisible`,
// `marcasVisibles`). `null` mientras no haya nada que mostrar: con las perillas en 0 no aparece.
export function loQueTeSacaronLosAnios(player) {
  const { marcaMinimaVisible, marcasVisibles } = BALANCE.ficha;
  const partes = Object.entries(desgasteDe(player))
    .map(([stat, valor]) => ({ stat, delta: -Math.round(valor) }))
    .filter(({ delta }) => Math.abs(delta) >= marcaMinimaVisible)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, marcasVisibles);
  if (partes.length === 0) {
    return null;
  }
  const lista = partes.map(({ stat, delta }) => `${deltaCorto(delta)} ${etiquetaCampo(`player.stats.${stat}`).toLowerCase()}`);
  return { desgaste: true, partes, texto: `▼ ${lista.join(', ')} — ${ORIGEN_DESGASTE}` };
}

// El objeto único que consume `src/ui/components/ficha.js`.
export function fichaCompleta(state) {
  return {
    // K3-B: lo que construiste (vacío mientras `fraccionPermanente` valga 0).
    // K5c-E: y, al final, lo que te sacaron los años (nada mientras el desgaste valga 0).
    construido: [...loQueConstruiste(state.career.registro), ...[loQueTeSacaronLosAnios(state.player)].filter(Boolean)],
    nivel: Math.round(nivelDelJugador(state)),
    bandaNivel: bandaDeNivel(nivelDelJugador(state)),
    destacado: statDestacado(state),
    deltas: deltasDeStats(state),
    jerarquia: bandaDeJerarquia(state),
    arraigo: bandaDeArraigoFicha(state.career.arraigo),
    mentalidad: bandaDeMentalidad(state),
    hype: bandaDeHype(state),
    estadoInternacional: estadoInternacional(state),
    duelo: dueloDeGeneracion(state),
    // Fase 9Wb (§9W.4 gancho 5): el rank mundial actual (`null` fuera del Top
    // 20) y el mejor de la vida (`0` = nunca). La pantalla (9Wc) los pinta.
    rankMundial: state.flags?.rankMundialActual ?? null,
    rankMundialPico: state.career.registro?.picos?.rankMundial ?? 0
  };
}

// --- W1 (PLANUI §0.7): la ficha fija, "que se sienta el avance" ---
//
// Helpers puros de lectura para la ficha que la UI muestra siempre (`src/ui/fichaFija.js`): cada número con su próximo
// escalón con nombre y su movimiento del año (contra `flags.edadSnapshot`, la misma foto que las flechas ▲▼). Ninguno
// consume rng ni escribe el estado; no cambian lo que devuelven las funciones de arriba.

// El movimiento del año de un campo del snapshot (`CAMPOS_EDAD`); 0 debajo de `umbralFlecha`, como las flechas.
function deltaDelAnio(state, ruta, actual) {
  const antes = state.flags?.edadSnapshot?.[ruta];
  if (antes === undefined || !Number.isFinite(actual)) {
    return 0;
  }
  const diferencia = actual - antes;
  return Math.abs(diferencia) >= BALANCE.ficha.umbralFlecha ? Math.round(diferencia) : 0;
}

// El arraigo y la jerarquía son con TU org: si la fila abierta del registro arrancó este año (cambiaste de club), la
// foto de inicio de año es de otro club y no hay delta del año que contar.
function orgNuevaEsteAnio(state) {
  const fila = (state.career?.registro?.porOrg ?? []).find((f) => f.hastaAnio === null && f.org === state.career.currentOrg);
  const splitCount = state.player?.splitCount;
  if (!fila || !Number.isFinite(fila.desdeSplit) || !Number.isFinite(splitCount)) {
    return false;
  }
  const inicioDelAnio = splitCount - (splitCount % BALANCE.edad.splitsPorEdad);
  return fila.desdeSplit >= inicioDelAnio;
}

// Una banda (`{ id, label, valor, piso, techo, esMaxima }`) vuelta escalera: el progreso dentro del escalón (0-1) y el
// próximo escalón con el número en el que se entra (`umbral`). `entraEnTecho`: si el próximo escalón empieza EN el techo
// (el arraigo: `valor >= hito`) o pasándolo (jerarquía y hype: `valor <= techo` todavía es la banda de abajo).
function escalera(banda, ids, labels, { entraEnTecho }) {
  const i = ids.indexOf(banda.id);
  const rango = banda.techo - banda.piso;
  const progreso = rango > 0 ? Math.max(0, Math.min(1, (banda.valor - banda.piso) / rango)) : 1;
  const proximo = banda.esMaxima ? null : ids[i + 1];
  const umbral = proximo ? (entraEnTecho ? banda.techo : Math.floor(banda.techo) + 1) : null;
  return {
    ...banda,
    paso: i + 1,
    pasos: ids.length,
    progreso,
    siguiente: proximo ? { id: proximo, label: labels[proximo], umbral, falta: Math.max(0, Math.ceil(umbral - banda.valor)) } : null
  };
}

// El arraigo con la org actual como escalera (Uno más → Querido → Ídolo → Leyenda, `BALANCE.arraigo.hitos`). `null` sin
// org (amateur, agente libre): no hay club del que hablar.
export function escaleraDeArraigo(state) {
  const org = state.career?.currentOrg ?? null;
  if (!org) {
    return null;
  }
  const valor = state.career.arraigo ?? 0;
  const banda = bandaDeArraigoFicha(valor);
  return {
    ...escalera(banda, ['uno_mas', 'querido', 'idolo', 'leyenda'], LABELS_ARRAIGO, { entraEnTecho: true }),
    org,
    delta: orgNuevaEsteAnio(state) ? 0 : deltaDelAnio(state, 'career.arraigo', valor)
  };
}

// La jerarquía en tu org con su próximo escalón (las bandas de `bandaDeJerarquia`). `null` sin org.
export function escaleraDeJerarquia(state) {
  if (!state.career?.currentOrg) {
    return null;
  }
  const banda = bandaDeJerarquia(state);
  return {
    ...escalera(banda, ['rookie', 'titular', 'referente', 'franquicia'], LABELS_JERARQUIA, { entraEnTecho: false }),
    delta: orgNuevaEsteAnio(state) ? 0 : deltaDelAnio(state, 'career.jerarquia', state.career.jerarquia)
  };
}

// El hype con su próximo escalón (las bandas de `bandaDeHype`, con los mismos techos).
export function escaleraDeHype(state) {
  const banda = bandaDeHype(state);
  const ids = ['ignoto', 'conocido', 'figura', 'estrella'];
  const i = ids.indexOf(banda.id);
  const pisos = [0, TECHOS_HYPE.ignoto, TECHOS_HYPE.conocido, TECHOS_HYPE.figura];
  const techos = [TECHOS_HYPE.ignoto, TECHOS_HYPE.conocido, TECHOS_HYPE.figura, BALANCE.stats.max];
  const conRango = { ...banda, valor: state.player.stats.hype, piso: pisos[i], techo: techos[i], esMaxima: i === ids.length - 1 };
  return { ...escalera(conRango, ids, LABELS_HYPE, { entraEnTecho: false }), valor: banda.valor, delta: banda.delta };
}

// El nivel con su movimiento del año: la misma suma ponderada de `nivelDelJugador` sobre la foto de inicio de año.
// `delta: null` si la foto no tiene alguno de los stats que pesa tu rol (una carrera vieja).
export function nivelDelAnio(state) {
  const ahora = nivelDelJugador(state);
  const snapshot = state.flags?.edadSnapshot ?? {};
  const { pesos } = ROLES[state.player.role];
  let antes = 0;
  for (const [stat, peso] of Object.entries(pesos)) {
    const valor = snapshot[`player.stats.${stat}`];
    if (valor === undefined) {
      return { valor: Math.round(ahora), banda: bandaDeNivel(ahora), delta: null };
    }
    antes += valor * peso;
  }
  const diferencia = ahora - antes;
  return {
    valor: Math.round(ahora),
    banda: bandaDeNivel(ahora),
    delta: Math.abs(diferencia) >= BALANCE.ficha.umbralFlecha ? Math.round(diferencia) : 0
  };
}

// El puntaje de la carrera EN VIVO: el mismo `puntajeDeCarrera` de la tarjeta final, sobre el registro asentado (como
// `escalonDeCarrera`), y el escalón con su "te falta…". `total` es `null` si el registro todavía no se puede puntuar
// (`puntajeDeCarrera` falla fuerte); el escalón sale igual.
export function puntajeEnVivo(state) {
  let total = null;
  try {
    total = puntajeDeCarrera(conSplitPendienteAsentado(state)).total;
  } catch {
    total = null;
  }
  let escalon = null;
  try {
    escalon = escalonDeCarrera(state);
  } catch {
    escalon = null;
  }
  return { total, actual: escalon?.actual ?? null, siguiente: escalon?.siguiente ?? null };
}

// La vitrina: los títulos del registro agrupados por tier (primera, desarrollo, circuito chico), de arriba hacia abajo.
// Cada grupo trae sus títulos en orden (nombre, año, org y su `indice` en el registro: los nuevos son los de índice más
// alto) para que la pantalla dibuje una copa por título.
export function vitrinaDeTitulos(registro) {
  const titulos = registro?.titulos ?? [];
  const grupos = new Map();
  titulos.forEach((titulo, indice) => {
    const tier = Number.isFinite(titulo.tier) ? titulo.tier : null;
    if (!grupos.has(tier)) {
      grupos.set(tier, []);
    }
    grupos.get(tier).push({ nombre: titulo.nombre, anio: titulo.anio, org: titulo.org, indice });
  });
  const orden = (tier) => (tier === null ? Number.POSITIVE_INFINITY : tier);
  return {
    total: titulos.length,
    grupos: [...grupos.entries()].sort(([a], [b]) => orden(a) - orden(b)).map(([tier, lista]) => ({ tier, titulos: lista }))
  };
}

// La plata ganada en la carrera (`registro.dineroTotalUSD`, que acumula `systems/roster.js` cada split con contrato).
export function dineroGanado(registro) {
  const valor = Number(registro?.dineroTotalUSD);
  return Number.isFinite(valor) && valor > 0 ? valor : 0;
}
