import { hashCadena } from './numeros.js';
import { probabilidadDePartido } from './partido.js';
import { fuerzaFinalDeMapa } from './serie.js';
import { BALANCE } from '../data/balance.js';

// K5-A (PLAN.md "K5 — decisiones de spec", K5-A; J7 comprimido): el Mundial de verdad. Puro y SIN `rng`: los
// clasificados salen de `cuposInternacionales` de cada liga (dato), el Swiss de 16 se empareja por récord sin
// revancha, y todo partido que no es tuyo se resuelve con `hashCadena` (seed + año + etapa + equipos + mapa) contra
// la p de su cruce, la MISMA función con la que el motor tira los tuyos (`probabilidadDePartido`, K2b). Si no
// clasificás, el torneo entero se juega acá sin mover el stream (`systems/internacional.js` no tira nada).
//
// El torneo es un objeto plano que vive en `state.internacional` (el último del mundo, juegues o no):
//   { anio, clave, jugador, participantes: [{ nombre, liga, fuerza, cupo, esJugador }],
//     swiss: { rondas: [[{ a, b, ganador, ronda, propio?, p? }]], record: { [nombre]: { v, d } } },
//     bracket: null | { siembra, cuartos, semis, final }, campeon, subcampeon, fase, interrupciones }

const M = () => BALANCE.mundial;

// `hashCadena` es un polinomio (h·31 + c): dos claves que solo difieren en el último carácter (el mapa 1 y el 2 del
// mismo cruce) dan hashes vecinos. El finalizador de MurmurHash3 (fmix32) los separa antes de volverlos un uniforme.
const FMIX_MULT_1 = 0x85ebca6b;
const FMIX_MULT_2 = 0xc2b2ae35;
const FMIX_SHIFT_1 = 16;
const FMIX_SHIFT_2 = 13;
const DOS_A_LA_32 = 4294967296;

export function uniformeDeClave(clave) {
  let h = hashCadena(clave) >>> 0;
  h ^= h >>> FMIX_SHIFT_1;
  h = Math.imul(h, FMIX_MULT_1) >>> 0;
  h ^= h >>> FMIX_SHIFT_2;
  h = Math.imul(h, FMIX_MULT_2) >>> 0;
  h ^= h >>> FMIX_SHIFT_1;
  return h / DOS_A_LA_32;
}

export function claveDelMundial(seed, anio) {
  return `${seed}|mundial|${anio}`;
}

// --- Los clasificados ---

// La tabla de una liga que no jugaste: su fuerza más un ruido de temporada (determinista, por hash). Los `n`
// primeros viajan. Excluye a tu org si jugás esa liga (ya sabemos dónde terminaste).
function clasificadosDeLiga(liga, n, clave, excluir) {
  return liga.orgs
    .filter((org) => org.nombre !== excluir)
    .map((org) => ({
      org,
      orden: (org.fuerza ?? 0) + (uniformeDeClave(`${clave}|tabla|${liga.id}|${org.nombre}`) - 0.5) * M().ruidoDeTabla
    }))
    .sort((x, y) => y.orden - x.orden || x.org.nombre.localeCompare(y.org.nombre))
    .slice(0, n)
    .map(({ org }) => org);
}

// `jugador`: `{ nombre, liga, fuerza, cupo }` si tu equipo clasificó (tu cupo es tu posición en la tabla), o `null`.
export function clasificadosDelMundial(state, anio, jugador) {
  const clave = claveDelMundial(state.seed, anio);
  const participantes = [];
  for (const liga of state.mundo.ligas) {
    const cupos = liga.tier === 1 ? (liga.cuposInternacionales ?? 0) : 0;
    if (cupos === 0) {
      continue;
    }
    const propia = jugador && jugador.liga === liga.id;
    const excluir = propia ? jugador.nombre : (liga.id === state.career?.liga ? state.career?.currentOrg : null);
    const otros = clasificadosDeLiga(liga, propia ? cupos - 1 : cupos, clave, excluir);
    const orgs = otros.map((org) => ({ nombre: org.nombre, liga: liga.id, fuerza: org.fuerza, esJugador: false }));
    if (propia) {
      orgs.splice(jugador.cupo - 1, 0, { nombre: jugador.nombre, liga: liga.id, fuerza: jugador.fuerza, esJugador: true });
    }
    orgs.forEach((org, i) => participantes.push({ ...org, cupo: i + 1 }));
  }
  return participantes;
}

export function crearMundial(state, anio, jugador) {
  const participantes = clasificadosDelMundial(state, anio, jugador);
  if (participantes.length !== M().participantes) {
    throw new Error(`Mundial ${anio}: ${participantes.length} clasificados, el Swiss es de ${M().participantes}`);
  }
  const record = Object.fromEntries(participantes.map((p) => [p.nombre, { v: 0, d: 0 }]));
  return {
    anio,
    clave: claveDelMundial(state.seed, anio),
    jugador: jugador?.nombre ?? null,
    participantes,
    swiss: { rondas: [], record },
    bracket: null,
    campeon: null,
    subcampeon: null,
    fase: 'swiss',
    // Las pausas que el Mundial ya gastó (T9) y tu partido del 2-2 mientras frena.
    interrupciones: 0,
    partidoEnCurso: null
  };
}

function participante(t, nombre) {
  return t.participantes.find((p) => p.nombre === nombre);
}

// --- Un cruce ajeno: mapa a mapa por hash contra la p del cruce ---

export function necesariasPara(bo) {
  return Math.floor(bo / 2) + 1;
}

// La p con la que el motor resuelve un cruce que no es tuyo: la de un partido sin la consistencia de nadie (σ base).
export function probabilidadAjena(fuerzaA, fuerzaB) {
  return probabilidadDePartido(null, fuerzaA, fuerzaB, 'mapa');
}

// Devuelve `{ ganador, marcador: [mapas de a, mapas de b] }`. El orden de los equipos no cambia el resultado: la clave
// y la p se arman sobre el par ordenado.
export function cruceAjeno(t, etapa, a, b, bo) {
  const [x, y] = [a, b].sort();
  const p = probabilidadAjena(participante(t, x).fuerza, participante(t, y).fuerza);
  const necesarias = necesariasPara(bo);
  const mapas = [0, 0];
  for (let mapa = 0; mapas[0] < necesarias && mapas[1] < necesarias; mapa += 1) {
    mapas[uniformeDeClave(`${t.clave}|${etapa}|${x}|${y}|${mapa}`) < p ? 0 : 1] += 1;
  }
  const ganador = mapas[0] > mapas[1] ? x : y;
  return { ganador, marcador: a === x ? mapas : [mapas[1], mapas[0]] };
}

// --- El Swiss ---

export function sigueEnSwiss(t, nombre) {
  const r = t.swiss.record[nombre];
  return r.v < M().victoriasParaAvanzar && r.d < M().derrotasParaQuedarAfuera;
}

export function vivosEnSwiss(t) {
  return t.participantes.filter((p) => sigueEnSwiss(t, p.nombre));
}

export function yaSeCruzaron(t, a, b) {
  return t.swiss.rondas.some((ronda) => ronda.some((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a)));
}

// Todos los emparejamientos completos de la lista, en orden de preferencia (backtracking: el primero de la lista se
// cruza con el primero que le está permitido; después, con el siguiente). Perezoso: casi siempre alcanza el primero.
function* emparejamientos(lista, permitido) {
  if (lista.length === 0) {
    yield [];
    return;
  }
  const [primero, ...resto] = lista;
  for (let i = 0; i < resto.length; i += 1) {
    if (!permitido(primero, resto[i])) {
      continue;
    }
    for (const sub of emparejamientos([...resto.slice(0, i), ...resto.slice(i + 1)], permitido)) {
      yield [[primero, resto[i]], ...sub];
    }
  }
}

function* producto(generadores, i = 0) {
  if (i === generadores.length) {
    yield [];
    return;
  }
  for (const pares of generadores[i]()) {
    for (const resto of producto(generadores, i + 1)) {
      yield [...pares, ...resto];
    }
  }
}

function agruparPorRecord(lista) {
  const grupos = [];
  for (const p of lista) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo[0].r.v === p.r.v && ultimo[0].r.d === p.r.d) {
      ultimo.push(p);
    } else {
      grupos.push([p]);
    }
  }
  return grupos;
}

function claveDeCruce(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// La ronda que viene después de `pares` tiene emparejamiento sin revancha, salga como salga tu partido. Solo se mira
// antes de la anteúltima ronda: la última (el 2-2) es un grupo de 6 que ya jugó 4 partidos cada uno y puede quedar sin
// salida si la anterior se armó a ciegas.
function laQueSigueEsPosible(t, pares) {
  const m = M();
  const jugados = new Set(t.swiss.rondas.flat().map((c) => claveDeCruce(c.a, c.b)));
  pares.forEach(([a, b]) => jugados.add(claveDeCruce(a.nombre, b.nombre)));
  const sinRevancha = (a, b) => !jugados.has(claveDeCruce(a.nombre, b.nombre));
  // Los cruces ajenos ya están decididos (el hash no depende de nada más); solo tu partido tiene dos salidas.
  const ronda = t.swiss.rondas.length + 1;
  const ganadores = pares.map(([a, b]) => (t.jugador && (a.nombre === t.jugador || b.nombre === t.jugador)
    ? null
    : cruceAjeno(t, `swiss|${ronda}`, a.nombre, b.nombre, m.boSwiss).ganador));
  const escenarios = ganadores.includes(null) ? 2 : 1;
  for (let escenario = 0; escenario < escenarios; escenario += 1) {
    const record = { ...t.swiss.record };
    pares.forEach(([a, b], i) => {
      const ganador = ganadores[i] ?? (escenario === 0 ? a.nombre : b.nombre);
      const [g, p] = ganador === a.nombre ? [a, b] : [b, a];
      record[g.nombre] = { v: record[g.nombre].v + 1, d: record[g.nombre].d };
      record[p.nombre] = { v: record[p.nombre].v, d: record[p.nombre].d + 1 };
    });
    const vivos = t.participantes
      .filter((p) => record[p.nombre].v < m.victoriasParaAvanzar && record[p.nombre].d < m.derrotasParaQuedarAfuera)
      .map((p) => ({ ...p, r: record[p.nombre] }))
      .sort((x, y) => y.r.v - x.r.v || x.r.d - y.r.d);
    if (emparejamientos(vivos, sinRevancha).next().done) {
      return false;
    }
  }
  return true;
}

// Los cruces de la próxima ronda: mismo récord, sin revancha y —mientras haya alternativa— sin dos equipos de la misma
// liga. Adentro de cada grupo el orden es un sorteo por hash de esa ronda. Si los grupos no tienen emparejamiento sin
// revancha, se empareja todo el Swiss junto (los grupos en orden, así que solo flota quien tiene que flotar). En la
// anteúltima ronda, además, el emparejamiento tiene que dejar posible la última, salga como salga.
export function emparejarRondaSwiss(t) {
  const m = M();
  const ronda = t.swiss.rondas.length + 1;
  const orden = (p) => uniformeDeClave(`${t.clave}|swiss|${ronda}|orden|${p.nombre}`);
  const vivos = vivosEnSwiss(t)
    .map((p) => ({ ...p, r: t.swiss.record[p.nombre], u: orden(p) }))
    .sort((x, y) => y.r.v - x.r.v || x.r.d - y.r.d || x.u - y.u);
  const sinRevancha = (a, b) => !yaSeCruzaron(t, a.nombre, b.nombre);
  const sinMismaLiga = (a, b) => sinRevancha(a, b) && a.liga !== b.liga;
  const anteultima = ronda === m.victoriasParaAvanzar + m.derrotasParaQuedarAfuera - 2;
  const sirve = (pares) => !anteultima || laQueSigueEsPosible(t, pares);

  const porGrupos = producto(agruparPorRecord(vivos).map((g) => function* preferidos() {
    yield* emparejamientos(g, sinMismaLiga);
    yield* emparejamientos(g, sinRevancha);
  }));
  let pares = null;
  for (const candidato of porGrupos) {
    if (sirve(candidato)) {
      pares = candidato;
      break;
    }
  }
  if (!pares) {
    for (const candidato of emparejamientos(vivos, sinRevancha)) {
      if (sirve(candidato)) {
        pares = candidato;
        break;
      }
    }
  }
  if (!pares) {
    throw new Error(`Mundial ${t.anio}: la ronda ${ronda} del Swiss no tiene emparejamiento sin revancha`);
  }
  return pares.map(([a, b]) => ({ a: a.nombre, b: b.nombre }));
}

export function cruceDe(cruces, nombre) {
  return cruces.find((c) => c.a === nombre || c.b === nombre) ?? null;
}

export function rivalEn(cruce, nombre) {
  return cruce.a === nombre ? cruce.b : cruce.a;
}

// Juega una ronda del Swiss. `resultadoJugador` (`{ gano, p }`) es tu partido, que tiró el sistema; los demás son
// ajenos. Si tu equipo está en la ronda y no viene tu resultado, es un error del que llama.
export function jugarRondaSwiss(t, cruces, resultadoJugador = null) {
  const ronda = t.swiss.rondas.length + 1;
  const record = { ...t.swiss.record };
  const partidos = cruces.map(({ a, b }) => {
    let partido;
    if (t.jugador && (a === t.jugador || b === t.jugador)) {
      if (!resultadoJugador) {
        throw new Error(`Mundial ${t.anio}: la ronda ${ronda} del Swiss incluye tu partido y no trae su resultado`);
      }
      const jugadorEsA = a === t.jugador;
      partido = { a, b, ganador: resultadoJugador.gano === jugadorEsA ? a : b, ronda, propio: true, p: resultadoJugador.p };
    } else {
      partido = { a, b, ganador: cruceAjeno(t, `swiss|${ronda}`, a, b, M().boSwiss).ganador, ronda };
    }
    const perdedor = partido.ganador === a ? b : a;
    record[partido.ganador] = { ...record[partido.ganador], v: record[partido.ganador].v + 1 };
    record[perdedor] = { ...record[perdedor], d: record[perdedor].d + 1 };
    return partido;
  });
  return { ...t, swiss: { rondas: [...t.swiss.rondas, partidos], record } };
}

export function swissTerminado(t) {
  return vivosEnSwiss(t).length === 0;
}

// --- El bracket ---

export const ETAPAS_BRACKET = ['cuartos', 'semis', 'final'];

export function etapaSiguiente(etapa) {
  const i = ETAPAS_BRACKET.indexOf(etapa);
  return i >= 0 && i < ETAPAS_BRACKET.length - 1 ? ETAPAS_BRACKET[i + 1] : null;
}

// Los 8 que pasaron, sembrados por récord (3-0, 3-1, 3-2) y después por fuerza: cuartos 1-8, 4-5, 2-7 y 3-6, para que
// el 1 y el 2 solo se crucen en la final.
export function sembrarBracket(t) {
  const clasificados = t.participantes
    .filter((p) => t.swiss.record[p.nombre].v >= M().victoriasParaAvanzar)
    .sort((x, y) => t.swiss.record[x.nombre].d - t.swiss.record[y.nombre].d
      || y.fuerza - x.fuerza || x.nombre.localeCompare(y.nombre));
  if (clasificados.length !== M().clasificanAlBracket) {
    throw new Error(`Mundial ${t.anio}: el Swiss dejó ${clasificados.length} en el bracket, no ${M().clasificanAlBracket}`);
  }
  const siembra = clasificados.map((p) => p.nombre);
  const cuartos = M().crucesDeCuartos.map(([i, j]) => ({ a: siembra[i], b: siembra[j] }));
  return { ...t, fase: 'bracket', bracket: { siembra, crucesCuartos: cuartos, cuartos: null, semis: null, final: null } };
}

export function crucesDeEtapa(t, etapa) {
  if (etapa === 'cuartos') {
    return t.bracket.crucesCuartos.map(({ a, b }) => ({ a, b }));
  }
  const anterior = t.bracket[ETAPAS_BRACKET[ETAPAS_BRACKET.indexOf(etapa) - 1]];
  const cruces = [];
  for (let i = 0; i < anterior.length; i += 2) {
    cruces.push({ a: anterior[i].ganador, b: anterior[i + 1].ganador });
  }
  return cruces;
}

// Juega una etapa del bracket. `resultadoJugador` (`{ gano, marcador: [tuyos, del rival] }`) es tu serie, que jugó
// el sistema mapa a mapa; las demás son ajenas, Bo5 por hash.
export function jugarEtapaBracket(t, etapa, resultadoJugador = null) {
  const partidos = crucesDeEtapa(t, etapa).map(({ a, b }) => {
    if (t.jugador && (a === t.jugador || b === t.jugador)) {
      if (!resultadoJugador) {
        throw new Error(`Mundial ${t.anio}: ${etapa} incluye tu serie y no trae su resultado`);
      }
      const jugadorEsA = a === t.jugador;
      const [tuyos, suyos] = resultadoJugador.marcador;
      return {
        a, b, propio: true,
        ganador: resultadoJugador.gano === jugadorEsA ? a : b,
        marcador: jugadorEsA ? [tuyos, suyos] : [suyos, tuyos]
      };
    }
    return { a, b, ...cruceAjeno(t, etapa, a, b, M().boBracket) };
  });
  const bracket = { ...t.bracket, [etapa]: partidos };
  if (etapa !== 'final') {
    return { ...t, bracket };
  }
  const [final] = partidos;
  return {
    ...t,
    bracket,
    fase: 'terminado',
    campeon: final.ganador,
    subcampeon: final.ganador === final.a ? final.b : final.a
  };
}

export function etapaPendiente(t) {
  return t.bracket ? ETAPAS_BRACKET.find((etapa) => !t.bracket[etapa]) ?? null : null;
}

// Termina el torneo sin tu equipo adentro (no clasificaste, o ya quedaste afuera): todo por hash.
export function resolverResto(t) {
  let torneo = t;
  while (!swissTerminado(torneo)) {
    torneo = jugarRondaSwiss(torneo, emparejarRondaSwiss(torneo));
  }
  if (!torneo.bracket) {
    torneo = sembrarBracket(torneo);
  }
  for (let etapa = etapaPendiente(torneo); etapa; etapa = etapaPendiente(torneo)) {
    torneo = jugarEtapaBracket(torneo, etapa);
  }
  return torneo;
}

// El Mundial de un año en que no jugaste: el que lee `systems/escena.js` si el sistema no dejó uno de este año.
export function mundialSinJugador(state, anio) {
  return resolverResto(crearMundial(state, anio, null));
}

// --- Tu partido del Swiss y tu resultado ---

// K2b: tu partido del Swiss es UNA tirada contra esta p (Bo1, σ de mapa). La previa la muestra con la misma función
// (regla 15). `ajuste`: la charla del coach, si la usás en el 2-2.
export function probabilidadDeCruceSwiss(state, fuerzaPropia, fuerzaRival, ajuste = 0) {
  return probabilidadDePartido(state, fuerzaFinalDeMapa(fuerzaPropia, ajuste), fuerzaRival, 'mapa');
}

export function esVidaOMuerte(record) {
  return record.v === M().victoriasParaAvanzar - 1 && record.d === M().derrotasParaQuedarAfuera - 1;
}

// Hasta dónde llegó tu equipo: `eliminado` (afuera en el Swiss), `cuartos`, `semis`, `final` o `campeon`. `null` si
// no jugaste este Mundial o todavía no se sabe.
export function resultadoDelJugador(t) {
  if (!t?.jugador) {
    return null;
  }
  const r = t.swiss.record[t.jugador];
  if (r.d >= M().derrotasParaQuedarAfuera) {
    return 'eliminado';
  }
  if (t.campeon === t.jugador) {
    return 'campeon';
  }
  const perdio = ETAPAS_BRACKET.find((etapa) => t.bracket?.[etapa]?.some((c) => c.propio && c.ganador !== t.jugador));
  return perdio ?? null;
}

// Tu camino, para el registro y la pantalla: cada partido del Swiss y cada serie del bracket que jugaste.
export function caminoDelJugador(t) {
  if (!t?.jugador) {
    return [];
  }
  const swiss = t.swiss.rondas.flatMap((ronda) => ronda.filter((c) => c.propio).map((c) => ({
    etapa: 'swiss', ronda: c.ronda, rival: rivalEn(c, t.jugador), gano: c.ganador === t.jugador, p: c.p
  })));
  const bracket = ETAPAS_BRACKET.flatMap((etapa) => (t.bracket?.[etapa] ?? []).filter((c) => c.propio).map((c) => ({
    etapa,
    rival: rivalEn(c, t.jugador),
    gano: c.ganador === t.jugador,
    marcador: c.a === t.jugador ? c.marcador : [c.marcador[1], c.marcador[0]]
  })));
  return [...swiss, ...bracket];
}

// Lo que la pantalla necesita del Mundial, plano y chico: viaja en el log de cierre (la tarjeta del feed no recalcula
// nada y sigue valiendo cuando `state.internacional` ya es el Mundial del año siguiente).
export function resumenDelMundial(t) {
  const ligaDe = (nombre) => participante(t, nombre)?.liga ?? null;
  return {
    anio: t.anio,
    jugador: t.jugador,
    record: recordDelJugador(t),
    resultado: resultadoDelJugador(t),
    swiss: caminoDelJugador(t).filter((c) => c.etapa === 'swiss')
      .map(({ ronda, rival, gano }) => ({ ronda, rival, liga: ligaDe(rival), gano })),
    bracket: ETAPAS_BRACKET.map((etapa) => ({
      etapa,
      series: (t.bracket?.[etapa] ?? []).map(({ a, b, marcador, ganador }) => ({ a, b, marcador, ganador }))
    })),
    campeon: t.campeon,
    ligaCampeon: ligaDe(t.campeon)
  };
}

export function recordDelJugador(t) {
  const r = t?.jugador ? t.swiss.record[t.jugador] : null;
  return r ? `${r.v}-${r.d}` : null;
}
