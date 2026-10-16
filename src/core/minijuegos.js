import { hashCadena } from './numeros.js';
import { resolverTexto } from './plantillas.js';
import { BALANCE } from '../data/balance.js';
import MINIJUEGOS from '../data/minijuegos.json' with { type: 'json' };
import SERIES_DATA from '../data/series.json' with { type: 'json' };
import PERFILES from '../data/perfiles.json' with { type: 'json' };

// Fase 9R4a: el minijuego es un DATO, no cinco ramas de `if` repartidas entre
// `systems/serie.js`, `systems/amateur.js` y la UI. Hasta acá `minijuegos.json`
// eran cinco stubs (`id`/`titulo`/`descripcion`) y todo lo que importa — a quién
// le toca, qué stat lo corre, cuánto mueve, qué se lee al terminar — vivía
// hardcodeado en el motor y duplicado en `ui/components/minijuegos/index.js`.
// Eso rompía la regla invariable 4 y era la causa directa de D20 (dos
// parámetros de balance genéricos para cinco minijuegos distintos).
//
// Este módulo es puro y **no toca el `rng`** (regla invariable 1, trampa T1): la
// elección es determinista por `hashCadena`, igual que las variantes de texto de
// 9R3a y las frases de fecha marcada de 9R0a.

export const CATALOGO_MINIJUEGOS = MINIJUEGOS;

const TITULO_VEREDICTO = { bien: '¡Clavado!', parejo: 'Salió parejo', mal: 'No salió' };

export function minijuegoPorId(id) {
  return MINIJUEGOS.find((entrada) => entrada.id === id) ?? null;
}

// Los elegibles de un momento: `roles: []` significa "cualquiera" (la_llamada
// la puede jugar todo el mundo; el Barón es del jungla).
export function minijuegosPara(state, momento) {
  return MINIJUEGOS.filter((entrada) => (
    entrada.momentos.includes(momento)
    && (entrada.roles.length === 0 || entrada.roles.includes(state.player.role))
  ));
}

function enCooldown(state, id) {
  const limite = state.player.splitCount - BALANCE.serie.minijuegoCooldownSplits;
  return (state.flags.minijuegosRecientes ?? []).some(
    (visto) => visto.id === id && visto.splitCount > limite
  );
}

// Anti-repetición con la misma forma que `flags.motivosFechaRecientes` (9R0a):
// un minijuego recién jugado se saltea mientras haya otro elegible. Si TODOS
// están en cooldown se juega igual —el cupo del mapa no se puede quedar mudo—,
// que es lo mismo que hace `fraseDeMotivo` cuando se le agotan las variantes.
export function elegirMinijuego(state, momento, excluir = []) {
  const todos = minijuegosPara(state, momento);
  // H3e: la rotación saca la mecánica que ya cumplió `g1.rotacionMax` rondas seguidas (si queda otra).
  const otros = todos.filter((entrada) => !excluir.includes(entrada.id));
  const candidatos = otros.length > 0 ? otros : todos;
  if (candidatos.length === 0) {
    return null;
  }
  const frescos = candidatos.filter((entrada) => !enCooldown(state, entrada.id));
  const pool = frescos.length > 0 ? frescos : candidatos;
  const semilla = [
    momento,
    state.player.splitCount,
    state.serie?.ronda ?? '',
    state.serie?.mapaActual ?? 0,
    state.career?.currentOrg ?? ''
  ].join('|');
  return pool[hashCadena(semilla) % pool.length];
}

export function registrarMinijuegoVisto(state, id) {
  const limite = state.player.splitCount - BALANCE.serie.minijuegoCooldownSplits;
  const vivos = (state.flags.minijuegosRecientes ?? []).filter((visto) => visto.splitCount > limite);
  return [...vivos, { id, splitCount: state.player.splitCount }];
}

// Los tres textos de la tarjeta del minijuego, con las variantes ya resueltas
// (`resolverTexto` acepta arrays desde 9R3a). `apuesta` es lo que 9R4d pinta
// ANTES de jugarlo: hasta 9R.4 el jugador se enteraba de qué se jugaba recién
// cuando terminaba (principio rector 3, regla de proceso 13).
// Fase 12f (§12.5): identidad y nombre por competición + intro con regla en ficción.
export function textoDeMinijuego(entrada, state) {
  const competicion = state.serie?.ronda === 'internacional'
    ? 'internacional'
    : (state.career?.liga ?? 'default');

  let titulos = entrada.titulos;
  if (entrada.nombresPorCompeticion) {
    const especial = entrada.nombresPorCompeticion[competicion]
      ?? entrada.nombresPorCompeticion[state.career?.liga]
      ?? entrada.nombresPorCompeticion.default;
    if (especial) {
      titulos = [especial];
    }
  }

  // Sin liga (un hueco entre contratos): el nombre de la competición dice "la liga" en vez de dejar el {liga} sin resolver.
  if (!state.career?.liga) {
    titulos = titulos.map((titulo) => titulo.replaceAll('{liga}', 'la liga'));
  }
  const titulo = resolverTexto(titulos, state);
  const descripcionBase = resolverTexto(entrada.descripciones, state);
  const regla = entrada.reglaEnFiccion ? resolverTexto(entrada.reglaEnFiccion, state) : '';
  const descripcion = regla ? `${descripcionBase} ${regla}` : descripcionBase;

  return {
    titulo,
    descripcion,
    apuesta: resolverTexto(entrada.apuesta, state),
    regla
  };
}

// Fase 12f (§12.5): dificultad que escala por ronda (semis -> final -> internacional).
export function factorDificultadPorRonda(ronda) {
  return BALANCE.serie.dificultadMinijuegoPorRonda[ronda] ?? 1.0;
}

// Fase 12f (§12.5): cierre narrativo determinista por mapa.
export function generarCierreMapa(campeon, gano, marcador, state) {
  const lista = SERIES_DATA.cierresMapa[gano ? 'W' : 'L'];
  const semilla = [
    state.calendario?.anio ?? 0,
    state.player?.splitCount ?? 0,
    state.serie?.ronda ?? '',
    state.serie?.mapaActual ?? 0,
    campeon
  ].join('|');
  const index = Math.abs(hashCadena(semilla)) % lista.length;
  const plantilla = lista[index];
  return plantilla.replace('{campeon}', campeon).replace('{marcador}', marcador);
}

// El veredicto 0-1 → nivel + frase. Vivía duplicado en la UI (9R0b) con su
// propia tabla de textos; ahora sale del mismo dato que consume el motor.
//
// K6c: la prueba del amateur no tira dado (la vara, `veredictoDeLaPrueba`): con `pasa` el resultado ya está decidido, así que
// la frase sale de `veredictosConVara` del dato, sin las de `veredictos` que hablan de un contrato que "se puede escapar" o de
// "si te firman" (esas son de la prueba del mercado, que sí tira). Con `pasa: false` no hay frase: lo dice la línea de la vara.
// G1: en un mapa con minijuego el nivel lo pone el juicio contra la vara (`nivel`: 'bien' si pasó, 'mal' si no), no el
// resultado suelto: un 65 puede ganar un mapa y perder otro.
export function veredictoDeMinijuego(id, resultado, state = null, { pasa = null, nivel: nivelDado = null } = {}) {
  const umbrales = BALANCE.serie.veredictoMinijuego;
  const nivel = nivelDado ?? (resultado >= umbrales.bien ? 'bien' : resultado >= umbrales.parejo ? 'parejo' : 'mal');
  const entrada = minijuegoPorId(id);
  const variantes = pasa === null ? entrada?.veredictos?.[nivel] : pasa ? entrada?.veredictosConVara?.[nivel] : null;
  return {
    nivel,
    titulo: TITULO_VEREDICTO[nivel],
    detalle: variantes ? resolverTexto(variantes, state) : ''
  };
}

// Fase 9R4d: "qué te juega tu stat en esta jugada", en palabras y con el número
// al lado. Es la mitad que faltaba del principio rector 3 (todo número tiene
// una frase) y de la regla de proceso 13 (todo número lleva referente): hasta
// acá el minijuego decía qué era, nunca qué abría o cerraba tu hoja.
export function lecturaDeVentana(entrada, state) {
  const bandas = BALANCE.serie.bandasVentanaMinijuego;
  const valor = Math.round(state.player.stats[entrada.statRelevante] ?? 0);
  const frase = valor >= bandas.ancha
    ? 'te abre la ventana'
    : valor >= bandas.normal
      ? 'te da la ventana de siempre'
      : 'te deja la ventana angosta';
  return { stat: entrada.statRelevante, valor, frase };
}

// K4-C: la prueba en cada salto grande — el primer fichaje en tier 2, el primero en tier 1 y el primero como
// import (PLAN.md K4: "la prueba, en cada salto grande"). Devuelve las claves de salto que este fichaje estrena
// (`[]` si no estrena ninguno); `flags.saltosConPrueba` guarda las que ya tuvieron su prueba. Puro, sin `rng`.
export function saltosDeFichaje(state, oferta) {
  if (!oferta || oferta.tag === 'renovacion') {
    return [];
  }
  const hechos = state.flags.saltosConPrueba ?? [];
  const claves = [];
  // Tier 2 no es salto si ya jugaste en tier 1 (bajar y volver a subir no es estrenar nada).
  if (oferta.tier === 2 && !hechos.includes('tier1')) claves.push('tier2');
  if (oferta.tier === 1) claves.push('tier1');
  if (oferta.datos?.tipo === 'import') claves.push('import');
  return claves.filter((clave) => !hechos.includes(clave));
}

// --- G1 (PLANUI §0.9, "Las finales se juegan con las manos") ---
//
// Un mapa con minijuego se decide por el minijuego, sin tirada: `paso = resultado >= vara`. La vara sale de la p del
// mapa (`varaDeMapa`) y viaja en la decisión (`datos.g1`, el contrato de G1 con la pantalla): el motor, la previa y la
// UI juzgan con la misma cuenta (`juzgarMinijuego`). Todo puro, sin `rng`: el bot recibe su número uniforme de afuera.

const CLASES = PERFILES.perfiles;

// La vara del mapa: el primer escalón de `g1.varaPorP` cuyo `desde` es <= p. A más p, menos vara.
export function varaDeMapa(p) {
  const tabla = BALANCE.g1.varaPorP;
  const fila = tabla.find((escalon) => p >= escalon.desde) ?? tabla[tabla.length - 1];
  return fila.vara;
}

// G-fix-vara: el techo de la vara del minijuego `id`: `g1.varaMaxima`, y en las mecánicas de conteo además (total − 1) /
// total, en puntos enteros hacia abajo (con 3 pasos, 0,66: "2 de 3"; redondeado a 0,67 pediría los 3).
export function techoDeVara(id = null) {
  const { varaMaxima } = BALANCE.g1;
  const max = BALANCE.stats.max;
  const total = id && reglaDe(id)?.tipo === 'conteo' ? BALANCE.g1.conteo[id] : undefined;
  const techo = total > 1 ? Math.min(varaMaxima, (total - 1) / total) : varaMaxima;
  return Math.floor(techo * max + EPSILON_PUNTOS) / max;
}

const EPSILON_PUNTOS = 1e-9;

// El piso humano de las mecánicas analógicas (`g1.pisoHumano`): la cuenta del resultado y su inversa (lo que pasa con una
// vara), una sola para la mecánica, la regla y el "tan cerca".
export function resultadoDeLatencia(ms, ventanaMs) {
  const piso = BALANCE.g1.pisoHumano.llamadaMs;
  return Math.min(1, Math.max(0, 1 - Math.max(0, ms - piso) / Math.max(1, ventanaMs - piso)));
}

export function latenciaQuePasa(vara, ventanaMs) {
  const piso = BALANCE.g1.pisoHumano.llamadaMs;
  return piso + (1 - Math.max(0, vara)) * Math.max(0, ventanaMs - piso);
}

export function resultadoDeDistancia(distancia, escala) {
  const piso = BALANCE.g1.pisoHumano.distancia;
  return Math.min(1, Math.max(0, 1 - Math.max(0, distancia - piso) / escala));
}

export function radioQuePasa(vara, escala) {
  return BALANCE.g1.pisoHumano.distancia + (1 - Math.max(0, vara)) * escala;
}

// El juicio, una sola cuenta: `paso` si el resultado llega a la vara efectiva (la vara menos lo que la bajaron el
// poder y la charla); `casi` si quedó a menos de `margenCasi` por debajo.
export function juzgarMinijuego(resultado, varaEfectiva, margenCasi = BALANCE.g1.margenCasi) {
  const r = Math.min(1, Math.max(0, resultado ?? 0));
  const paso = r >= varaEfectiva;
  return { paso, casi: !paso && r >= varaEfectiva - margenCasi, resultado: r, vara: varaEfectiva };
}

// D122: cuánto baja la vara la charla del coach en el minijuego `id` con esta `vara`: al menos una unidad de la regla
// visible. Con una grilla de 1/total (`g1.conteo`, `g1.erroresTope`), el escalón de abajo del que pide hoy: "necesitás 3 de
// 4" pasa a "2 de 4" (y "2 errores como mucho" a 3). Sin grilla (la llamada, el Barón, el TP), `charlaBajaVara`. Si el
// poder de la ronda puede bajarla (`bajaPoder`, el escenario), vale una unidad también desde ahí: el máximo de las dos.
export function unidadesDeLaRegla(id) {
  if (reglaDe(id)?.tipo !== 'conteo') return null;
  return BALANCE.g1.conteo[id] ?? BALANCE.g1.erroresTope[id] ?? null;
}

// H3e (PLANUI §0.10 H3): la forma de la regla de cada mecánica, en el dato (`minijuegos.json` → `regla`): `tipo`
// (conteo | latencia | distancia | continuo), lo que se cuenta (`unidad`, `articulo`) y la vara dicha en la ficción
// (`frase`, con `{n}`). Los números (el N del conteo, la escala) quedan en `BALANCE.g1`: `total` sale de ahí.
export function reglaDe(id) {
  const regla = minijuegoPorId(id)?.regla ?? null;
  if (!regla) return null;
  const total = regla.tipo === 'conteo' ? (BALANCE.g1.conteo[id] ?? BALANCE.g1.erroresTope[id] ?? null) : null;
  return { ...regla, total };
}

// La vara en la ficción: "Cantá el objetivo en menos de 410 ms". `n` ya viene en las unidades de la regla.
export function fraseDeLaVara(id, n) {
  const frase = reglaDe(id)?.frase;
  return frase ? frase.replace('{n}', String(n)) : null;
}

function unaUnidadDesde(total, vara) {
  let n = 0;
  while (n <= total && n / total < vara) n += 1;
  // `EPSILON_PUNTOS` de más: la resta de la UI y del motor (vara − baja) no puede caer un pelo arriba del escalón
  return n <= 0 ? 0 : vara - (n - 1) / total + EPSILON_PUNTOS;
}

export function bajaDeCharla(id, vara, bajaPoder = 0) {
  const base = BALANCE.g1.charlaBajaVara;
  const total = unidadesDeLaRegla(id);
  if (!total) return base;
  return Math.max(base, unaUnidadDesde(total, vara), bajaPoder > 0 ? unaUnidadDesde(total, vara - bajaPoder) : 0);
}

// Lo que la UI multiplica por la ventana o el tiempo en la ronda `escalon` del torneo (0 = la primera), con piso.
export function factorEscalada(escalon) {
  const { escaladaPorEscalon, escaladaMinima } = BALANCE.g1;
  return Math.max(escaladaMinima, escaladaPorEscalon ** Math.max(0, escalon));
}

// La regla en palabras, la que dicen la previa y la parada: "necesitás 70 de 100".
export function reglaDeLaVara(vara) {
  return `Necesitás ${Math.round(vara * BALANCE.stats.max)} de ${BALANCE.stats.max} para ganar el mapa.`;
}

// El ancho del resultado del bot: P(casi) = pCasiBot por construcción.
export function anchoDelBot() {
  return BALANCE.g1.margenCasi / BALANCE.g1.pCasiBot;
}

// El resultado del bot (Node): uniforme alrededor de la vara efectiva, tal que P(resultado >= vara) = pObjetivo con
// `u` uniforme en [0, 1). Regla 8: el mapa es una distribución pesada [p, 1 − p], y el casi sale con P = pCasiBot.
export function resultadoDelBot(u, varaEfectiva, pObjetivo) {
  const p = Math.min(1, Math.max(0, pObjetivo));
  return Math.min(1, Math.max(0, varaEfectiva + anchoDelBot() * (u - (1 - p))));
}

// La clase: el perfil del arranque, fijo para toda la carrera (`career.clase`). `null` si no hay (un estado de prueba).
export function claseDe(state) {
  const id = state.career?.clase ?? null;
  return id && CLASES[id]?.clase ? { id, ...CLASES[id].clase } : null;
}

export function inclinacionDeClase(id) {
  return CLASES[id]?.clase?.inclinacion ?? {};
}

const EFECTO_PODER = {
  vod: () => ({ velocidad: BALANCE.g1.poderes.vodVelocidad }),
  revancha: () => ({}),
  escenario: () => ({ bajaVara: BALANCE.g1.poderes.escenarioBajaVara }),
  vestuario: () => ({})
};

// El poder de tu clase en esta ronda, o `null` si no aplica: el escenario es solo de finales; el vestuario, solo donde
// se ofrece la charla. `disponible: false` si ya lo usaste en este torneo (el vestuario: si no te quedan charlas).
export function poderDeLaRonda(state, torneo, { esFinal, conCharla, charlaQueda }) {
  const clase = claseDe(state);
  const poder = clase?.poder;
  if (!poder || (poder.id === 'escenario' && !esFinal) || (poder.id === 'vestuario' && !conCharla)) {
    return null;
  }
  const disponible = poder.id === 'vestuario' ? charlaQueda : !torneo.poderUsado;
  return { id: poder.id, nombre: poder.nombre, texto: poder.texto, disponible, efecto: EFECTO_PODER[poder.id]() };
}

// El estado del torneo de G1 (`career.torneoG1`): una mecánica por torneo, el escalón, el desempate y el poder. Un
// torneo es los playoffs de un split, o el Mundial entero (Swiss y bracket): `clave` los separa.
export function claveDeTorneo(state, torneo) {
  return `${torneo}|${state.calendario?.anio ?? 0}|${state.player?.splitCount ?? 0}`;
}

export function torneoG1(state, clave) {
  const actual = state.career?.torneoG1 ?? null;
  return actual && actual.clave === clave
    ? actual
    : { clave, escalon: 0, desempateUsado: false, poderUsado: false, minijuego: null, inicio: null, racha: null };
}

// La mecánica del torneo: la que ya salió si sigue siendo tuya para este momento; si no, una nueva (`elegirMinijuego`).
export function minijuegoDelTorneo(state, torneo, momento) {
  const previa = torneo.minijuego ? minijuegoPorId(torneo.minijuego) : null;
  // H3e: nunca más de `g1.rotacionMax` rondas seguidas de la misma mecánica (`torneo.racha`, la cuenta `torneoTrasRonda`).
  const cansada = previa && torneo.racha?.id === previa.id && torneo.racha.n >= BALANCE.g1.rotacionMax;
  if (previa && !cansada && minijuegosPara(state, momento).some((entrada) => entrada.id === previa.id)) {
    return { entrada: previa, nueva: false };
  }
  // Un torneo nuevo no sigue la racha del anterior ni la del último minijuego de mapa suelto (la final amateur, la copa):
  // arranca con otra. El último de mapa sale de `flags.minijuegosRecientes` (la prueba y la prensa no cuentan).
  const ultimoDeMapa = [...(state.flags?.minijuegosRecientes ?? [])].reverse()
    .find((visto) => minijuegoPorId(visto.id)?.momentos.includes(momento))?.id;
  const anteriores = torneo.minijuego ? [] : [state.career?.torneoG1?.racha?.id, ultimoDeMapa];
  const entrada = elegirMinijuego(state, momento, cansada ? [previa.id] : anteriores.filter(Boolean));
  return { entrada, nueva: Boolean(entrada) };
}
