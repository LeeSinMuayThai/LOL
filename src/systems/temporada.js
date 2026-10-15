import { weightedPick, chance } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { hashCadena } from '../core/numeros.js';
import { calcularContexto } from '../core/contexto.js';
import { resolverTexto } from '../core/plantillas.js';
import { ligaOZonaDeCarrera } from '../core/competicion.js';
import {
  generarFixture, aplicarCrucesDeJornada, tablaDePosiciones, posicionEnTabla,
  motivosDeFecha, motivoPrincipal, defineClasificacion, defineClasificacionMasAdelante,
  campeonDelSplitEnPool, probabilidadDeFechaMarcada,
  registrarEnFila, filaVacia, rendimientoDeLaTemporada, resultadosVacios, sumarResultado
} from '../core/temporada.js';
import { nivelDeCompaneros, rendimientoBase, rendimientoDePartido, fuerzaDePartido } from '../core/fuerza.js';
import { jugarPartido, tirarPartido } from '../core/partido.js';
import { nivelDelJugador } from '../core/ficha.js';
import { disponibleEn, opcionesVivas, resolverOpcion, cooldownActivo, pesoConMemoria, pesoEfectivo, opcionDelPerfilPara } from './events.js';
import { devolverCupo } from './serie.js';
import {
  elegirMinijuego, registrarMinijuegoVisto, textoDeMinijuego, minijuegoPorId, juzgarMinijuego, resultadoDelBot,
  factorDificultadPorRonda, factorEscalada, reglaDeLaVara, varaDeMapa, techoDeVara, anchoDelBot
} from '../core/minijuegos.js';
import { textoDeRangos, payoffNormalizado, familiaDeEfecto } from '../core/previa.js';
import { frenaEnLaCola, hitoDelMomento, conFirmaDeLaCola, enLaCola } from '../core/cola.js';
import { registrarFecha, registrarSplitJugado } from '../core/registro.js';
import { BALANCE } from '../data/balance.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';

export const id = 'temporada';

// La temporada regular (fase 5): antes de esto, `rendimiento.js` resolvía la
// posición del split entero con una sola tirada. Ahora hay un calendario real
// con nombre y tabla, y a lo sumo UNA fecha del split frena al jugador (fase
// 9Re: era 2-3) — la que decide algo (K4-A), sin draft: la previa y un momento
// con 2 a 4 opciones que mueve el resultado de ESE partido, y el resultado
// inmediato. El resto del calendario
// se resuelve en silencio y pasa resumido en una línea `tecnico`.
// `rendimiento.js` sigue aplicando las consecuencias (hype, mentalidad,
// jerarquía, títulos): esto solo decide de dónde sale la posición que él lee.

// Fase 9R0a: eran siete strings fijos y una fecha marcada por split durante
// ~20 splits, así que el jugador leía la MISMA frase una y otra vez ("La
// revancha contra tal, que te sacó de la última serie"). Ahora cada motivo
// tiene varias variantes y se elige una de forma determinista según el rival y
// el split — sin tocar el `rng`, para no correr el stream.
export const ETIQUETAS_MOTIVO = {
  define_clasificacion: ['Se define la clasificación', 'Partido bisagra', 'Todo o nada'],
  archirrival: ['El archirrival', 'Duelo de archirrivales', 'Cara a cara'],
  clasico: ['Clásico', 'El clásico', 'Viejo conocido'],
  revancha: ['La revancha', 'Cuentas pendientes', 'El desquite'],
  // F2 (PLANUI §0.8): la última fecha del split regular, cuando el split no frenó en ninguna otra parte
  // (`paradaGarantizada`). No define nada en la tabla: es el partido que se juega igual.
  ultima_fecha: ['Última fecha', 'Cierre del split', 'La última del split']
};

export const FRASES_MOTIVO = {
  define_clasificacion: [
    (r) => `Contra ${r}, con la clasificación en juego.`,
    (r) => `${r}, y de este partido depende entrar a playoffs.`,
    (r) => `Contra ${r}: ganar es entrar, perder es quedar afuera.`,
    (r) => `${r} enfrente, con el boleto a playoffs sobre la mesa.`,
    (r) => `Contra ${r}, partido bisagra por la clasificación.`
  ],
  archirrival: [
    (r) => `Contra ${r}, el equipo de tu archirrival.`,
    (r) => `${r} enfrente, y del otro lado juega tu archirrival.`,
    (r) => `Toca ${r}: con el archirrival enfrente no se regala nada.`,
    (r) => `Contra ${r}, con las cuentas pendientes de tu archirrival.`,
    (r) => `${r}, y el que te viene peleando todo está del otro lado.`
  ],
  clasico: [
    (r) => `El clásico contra ${r}.`,
    (r) => `Otra vez contra ${r}: siempre pesa distinto.`,
    (r) => `${r} enfrente. Con estos ya hay historia.`,
    (r) => `Toca ${r}, y no es un partido más.`,
    (r) => `Contra ${r}, el rival de siempre.`
  ],
  revancha: [
    (r) => `La revancha contra ${r}, que te dejó afuera la última vez.`,
    (r) => `${r} otra vez: los mismos que te eliminaron.`,
    (r) => `Contra ${r}, con la eliminación todavía atragantada.`,
    (r) => `${r} enfrente. Hay cuentas pendientes de la última serie.`,
    (r) => `Toca ${r}, los que te sacaron de los playoffs pasados.`
  ],
  ultima_fecha: [
    (r) => `Contra ${r}, la última fecha del split regular.`,
    (r) => `${r} enfrente para cerrar el split.`,
    (r) => `Última fecha, contra ${r}: la tabla ya casi no se mueve, pero se juega igual.`,
    (r) => `Contra ${r}, el último partido antes del corte.`,
    (r) => `${r} en la última del split. Nadie quiere cerrar con una derrota.`
  ]
};

function variante(lista, semilla) {
  return lista[hashCadena(semilla) % lista.length];
}

function etiquetaDeMotivo(motivo, semilla = '') {
  const opciones = ETIQUETAS_MOTIVO[motivo] ?? ['Partido'];
  return variante(opciones, `${motivo}|${semilla}`);
}

function fraseDeMotivo(motivo, rival, semilla = '') {
  const opciones = FRASES_MOTIVO[motivo] ?? FRASES_MOTIVO.clasico;
  return variante(opciones, `${motivo}|${rival}|${semilla}`)(rival);
}

// F2: la fecha de la parada garantizada lleva la marca `ultima_fecha` entre sus motivos (al lado de los de verdad, si los
// tiene). `motivoPrincipal` no la conoce: el contenido del momento sale del motivo de verdad o, sin ninguno, del pool de
// `parejo`. Es una marca y no un campo nuevo de la fecha para no cambiar la forma del estado (los guardados, D71).
export const MARCA_PARADA_GARANTIZADA = 'ultima_fecha';
const esParadaGarantizada = (fecha) => (fecha.motivos ?? []).includes(MARCA_PARADA_GARANTIZADA);

// F2: el motivo con el que se NOMBRA la fecha: sin otro motivo, "la última fecha" (sin esto la frase caía en la del
// clásico). Puro.
function motivoDeTexto(fecha) {
  const motivo = motivoPrincipal(fecha.motivos);
  return esParadaGarantizada(fecha) && motivo === 'parejo' ? MARCA_PARADA_GARANTIZADA : motivo;
}

// F2 (PLANUI §0.8, "splits sin parada"): ¿este split necesita que su última fecha frene? Con club de tier
// `temporada.paradaGarantizadaHastaTier` o mejor y con menos de `temporada.paradasMinimasPorSplit` pausas en lo que va del
// split (`state.presupuesto.gastadas`, que `core/pipeline.js` cuenta en cada pausa: el mercado, un evento, otra fecha). Lo
// que frene después de la temporada todavía no corrió, con una excepción que se sabe de antemano: el split de playoffs es el
// que cierra el año, y ahí frena el cierre (`systems/edadCierre.js`, las tres cartas) salvo en la cola de la carrera, donde
// puede narrarse. Medido en f8503ce: de 1.653 splits de playoffs con club, 26 pasaban sin parada; de 1.664 regulares, 868.
// Sin esa excepción la fecha garantizada frenaba también en casi todos los splits de playoffs, delante del cierre: relleno.
// Puro, sin `rng`.
function necesitaParadaGarantizada(state) {
  const t = BALANCE.temporada;
  const frenaElCierre = calcularContexto(state).ventana === 'playoffs' && !enLaCola(state);
  return !frenaElCierre
    && (state.career.tier ?? Infinity) <= t.paradaGarantizadaHastaTier
    && (state.presupuesto?.gastadas ?? 0) < t.paradasMinimasPorSplit;
}

// Fase 9R0a: un par (motivo, rival) recién marcado entra en cooldown para que
// la misma fecha no se repita split tras split. `flags.motivosFechaRecientes`
// guarda `{ motivo, rival, splitCount }` y se poda a la ventana de cooldown.
function parEnCooldown(state, motivo, rival) {
  const limite = state.player.splitCount - BALANCE.temporada.motivoRivalCooldownSplits;
  return (state.flags.motivosFechaRecientes ?? []).some(
    (par) => par.motivo === motivo && par.rival === rival && par.splitCount > limite
  );
}

function registrarParMarcado(state, motivo, rival) {
  const limite = state.player.splitCount - BALANCE.temporada.motivoRivalCooldownSplits;
  const vivos = (state.flags.motivosFechaRecientes ?? []).filter((par) => par.splitCount > limite);
  return [...vivos, { motivo, rival, splitCount: state.player.splitCount }];
}

function textoResumenSilencioso({ ganados, perdidos }) {
  const total = ganados + perdidos;
  if (total === 0) {
    return null;
  }
  if (perdidos === 0) {
    return `Temporada regular: ${ganados} de ${ganados}, sin sobresaltos.`;
  }
  if (ganados === 0) {
    return `Temporada regular: ${perdidos} derrotas seguidas en las fechas de rutina.`;
  }
  return `Temporada regular: ${ganados}-${perdidos} en las fechas de rutina.`;
}

// --- Arrancar la temporada del split ---

function iniciarTemporada(state, rng) {
  // `ligaOZonaDeCarrera` no debería devolver null nunca con currentOrg seteado
  // (todo tier tiene una liga o una zona sintética), pero si alguna vez pasa,
  // la temporada queda vacía en vez de reventar: calendario sin fechas, cruces
  // vacíos, registrosOtros vacío, y `continuarTemporada` cierra en el primer
  // chequeo con una tabla de un solo equipo.
  const liga = ligaOZonaDeCarrera(state);
  const { calendario, cruces } = generarFixture(liga, state.career.currentOrg);
  // Fase 9Rb: las filas ajenas arrancan en cero, igual que la tuya. Se llenan
  // jornada a jornada en `avanzarFechaSilenciosa`, en paso con tus fechas.
  const registrosOtros = Object.fromEntries(
    (liga?.orgs ?? [])
      .filter((org) => org.nombre !== state.career.currentOrg)
      .map((org) => [org.nombre, filaVacia(org.nombre)])
  );
  const t = BALANCE.temporada;
  // Fase 9Re: una sola fecha marcada por split (antes: roll(2,3)). Se saca la
  // tirada de acá — un `rng()` menos por split competitivo (D38).
  const objetivoMarcadas = Math.min(calendario.length, t.fechasMarcadasPorSplit);

  // K2b: la fuerza del split es DETERMINISTA. Hasta K2a acá se tiraba un
  // `gauss` (el rendimiento del split) que decidía las 7-9 fechas juntas; ahora
  // cada fecha es una tirada contra su p y nada más (`jugarPartido`).
  const rendimiento = rendimientoDePartido(state);
  const fuerzaPropia = fuerzaDePartido(state);

  return {
    activa: true,
    calendario,
    cruces,
    indice: 0,
    // El rendimiento del split: hasta que cierre el calendario, el de los
    // partidos (el base acotado); al cerrar, el que cuentan tus resultados
    // (`rendimientoDeLaTemporada`), que es el que leen las consecuencias.
    rendimiento,
    // K2b: el base sin acotar (con el que se lee el rendimiento del split) y lo
    // que tus fechas dieron contra lo que su p prometía.
    rendimientoBase: rendimientoBase(state),
    resultadosPropios: resultadosVacios(),
    fuerzaPropia,
    // K2a (PLAN.md "K2 — lo que midió la investigación"): lo que el motor usó
    // para `rendimiento` y `fuerzaPropia`, expuesto para el instrumento de
    // `src/dev/simulate.js`: el nivel del jugador (la base de
    // `rendimientoBase`) y el nivel medio de los compañeros (el de
    // `fuerzaDelEquipo`), leídos sobre el MISMO estado que esas dos llamadas.
    // Lectura pura: no cambia ningún cálculo ni consume `rng`.
    nivelJugador: nivelDelJugador(state),
    nivelCompaneros: nivelDeCompaneros(state),
    registrosOtros,
    filaPropia: { org: state.career.currentOrg, ganados: 0, perdidos: 0 },
    racha: 0,
    objetivoMarcadas,
    marcadasHechas: 0,
    ajustePartido: 0,
    posicion: null,
    tabla: [],
    fechaEnCurso: null
  };
}

// El único choke point por el que avanza una jornada, marcada o silenciosa.
// Registra el resultado de tu fecha (`t.calendario[t.indice]`) en los DOS
// lados — tu fila y la del rival — y resuelve los cruces ajenos de ESA misma
// jornada (`t.cruces[t.indice]`), para que todas las filas de la tabla
// avancen juntas (fase 9Rb). Cada jornada suma exactamente un ganado y un
// perdido por equipo. K2b: `partido` es `{ gano, p }` de `jugarPartido`; si
// `jugaste` (no estabas de baja), entra a los resultados con los que se lee tu
// rendimiento del split.
function avanzarFechaSilenciosa(state, partido, jugaste, rng) {
  const { gano } = partido;
  const t = state.career.temporada;
  const fecha = t.calendario[t.indice];
  const registrosTrasOtros = aplicarCrucesDeJornada(t.registrosOtros, t.cruces?.[t.indice] ?? [], rng);
  return {
    ...state,
    career: {
      ...state.career,
      // Fase 8: cada fecha de temporada regular jugada —marcada o silenciosa,
      // esta función es el único choke point de las dos— suma al registro
      // global y a la fila de la org en curso.
      registro: registrarFecha(state.career.registro, gano),
      temporada: {
        ...t,
        indice: t.indice + 1,
        filaPropia: registrarEnFila(t.filaPropia, gano),
        resultadosPropios: jugaste ? sumarResultado(t.resultadosPropios, partido) : t.resultadosPropios,
        registrosOtros: { ...registrosTrasOtros, [fecha.rival]: registrarEnFila(registrosTrasOtros[fecha.rival], !gano) },
        racha: gano ? (t.racha > 0 ? t.racha + 1 : 1) : (t.racha < 0 ? t.racha - 1 : -1)
      }
    }
  };
}

// --- El pool de contenido de una fecha marcada ---
//
// Dos pools separados por `category`, no por `stakes`: el momento (antes del
// resultado, con `type: 'partido'` en sus efectos) y la reacción post-partido
// (después, solo mueve stats). Comparten el mismo eje `stakes` y el mismo
// cooldown compartido con el resto del catálogo (`state.flags.cooldownHasta`).
function candidatosDePartido(state, motivo, soloPostpartido) {
  const contexto = calcularContexto(state, { ventana: 'regular', stakes: motivo });
  return TODOS_LOS_EVENTOS.filter((evento) => (
    Boolean(evento.contexto?.stakes)
    && (evento.category === 'partido_postpartido') === soloPostpartido
    && !cooldownActivo(state, evento.id)
    && disponibleEn(state, evento, contexto)
    && opcionesVivas(state, evento, contexto).length >= 2
  ));
}

// K3 (PLAN.md "K3, tal como quedó y lo que se decide al integrar"): la pausa guarda la p de antes de decidir
// (`pAntesDeDecidir`, la que muestra la previa). Decidir mueve el partido de verdad —el `ajustePartido` y, con
// `consistencia.k` ≠ 0, la mentalidad—, así que la p tirada se calcula con el estado de después y esta es la que
// el log de la fecha reporta como `pSinMomento` ("el momento la movió desde X%").
function construirDecisionMomento(state, evento, contexto, fecha, tipoDecision) {
  return {
    tipo: 'opciones',
    titulo: `${resolverTexto(evento.title, state)} — vs ${fecha.rival}`,
    descripcion: resolverTexto(evento.description, state),
    opciones: opcionesVivas(state, evento, contexto).map((opcion) => ({
      id: opcion.id,
      label: resolverTexto(opcion.label, state),
      descripcion: resolverTexto(opcion.descripcion, state)
    })),
    datos: {
      motivo: tipoDecision,
      eventoId: evento.id,
      pAntesDeDecidir: probabilidadDeFechaMarcada(state),
      // K4-A: el rótulo del partido, para el subtítulo de la previa.
      etiqueta: etiquetaDeMotivo(motivoDeTexto(fecha), state.player.splitCount)
    }
  };
}

// --- D118 (PLANUI §0.9, G1): el Bo1 que frena se juega con las manos ---
//
// Primero elegís cómo lo encarás, con el premio a la vista: 🎲 ARRIESGADO (la opción del momento con más varianza en el
// partido; la vara más alta) o 🧊 SEGURO (la de menos; la vara más baja). Después se juega el minijuego, sin tirada: el
// resultado de la fecha es su `paso`. Los efectos del dato se reparten en "si sale" (el outcome de la opción que más
// empujaba el partido) y "si no sale" (el que más lo hundía), como rangos y a la vista (`textoDeRangos`).
// En Node el bot elige por perfil y pasa con la p de la fecha corrida por el ajuste MEDIO del momento (lo que hoy movía
// la p, en promedio): la tasa de victorias de la fecha no se mueve por construcción.
const MOMENTO_MECANICA_BO1 = 'mapa_decisivo';
export const MOMENTO_PARADA_BO1 = 'fecha_bo1';
const ROTULO_RIESGO = { arriesgado: '🎲 Arriesgado', seguro: '🧊 Seguro' };

const ajusteDeOutcome = (outcome) => outcome.effects
  .filter((effect) => effect.type === 'partido')
  .reduce((suma, effect) => suma + (effect.min + effect.max) / 2, 0);

function ajusteMedioDelMomento(state, opciones) {
  const pesoOpciones = opciones.reduce((suma, opcion) => suma + opcion.weight, 0);
  if (pesoOpciones <= 0) return 0;
  return opciones.reduce((suma, opcion) => {
    const pesos = opcion.outcomes.map((outcome) => pesoEfectivo(state, outcome));
    const total = pesos.reduce((a, b) => a + b, 0);
    const media = total > 0 ? opcion.outcomes.reduce((a, outcome, i) => a + ajusteDeOutcome(outcome) * pesos[i], 0) / total : 0;
    return suma + (opcion.weight / pesoOpciones) * media;
  }, 0);
}

// `{ arriesgado, seguro }`: cada uno `{ opcion, si, no }` (`si`/`no`: índices de outcome). El arriesgado es la opción con más
// distancia entre su mejor y su peor partido (a igual distancia, la de mejor techo); el seguro, la de menos entre las otras
// (a igual distancia, la de mejor piso).
export function encaresDelMomento(opciones) {
  const conExtremos = opciones.map((opcion) => {
    const ajustes = opcion.outcomes.map(ajusteDeOutcome);
    const max = Math.max(...ajustes);
    const min = Math.min(...ajustes);
    return { opcion, max, min, si: ajustes.indexOf(max), no: ajustes.lastIndexOf(min) };
  });
  const abierta = (e) => e.max - e.min;
  const arriesgado = conExtremos.reduce((a, e) => (abierta(e) > abierta(a) || (abierta(e) === abierta(a) && e.max > a.max) ? e : a));
  const seguro = conExtremos.filter((e) => e !== arriesgado)
    .reduce((a, e) => (abierta(e) < abierta(a) || (abierta(e) === abierta(a) && e.min > a.min) ? e : a));
  return { arriesgado, seguro };
}

const enPuntos = (vara) => Math.round(vara * BALANCE.stats.max) / BALANCE.stats.max;

// La vara de cada encare, desde la de la p del bot, con el techo humano de la mecánica.
export function varasDelBo1(pBot, minijuego) {
  const base = Math.min(techoDeVara(minijuego), enPuntos(varaDeMapa(pBot)));
  const { arriesgadoSubeVara, seguroBajaVara } = BALANCE.g1.bo1;
  return {
    arriesgado: Math.min(techoDeVara(minijuego), enPuntos(base + arriesgadoSubeVara)),
    seguro: Math.max(0, enPuntos(base - seguroBajaVara))
  };
}

// G-fix C1: el premio de cada encare (más difícil, más premio). Sale de los efectos del momento, como rangos (regla 7):
// "el mejor" es lo bueno del outcome que más da entre todas las opciones vivas; "el peor", lo malo del que más quita
// (`payoffNormalizado`: cada familia en su escala). Los factores, en `g1.bo1.premio`.
const PATH_HYPE = 'player.stats.hype';
const esMagnitud = (effect) => effect.type !== 'partido' && familiaDeEfecto(effect) !== null;
const valorDe = (effects) => payoffNormalizado({ effects });
const sinCeroNegativo = (n) => (n === 0 ? 0 : n);

// Un rango por un factor: uno bueno nunca baja de +1 (un "si sale" siempre paga algo); uno malo que redondea a 0 se va.
function escalarEfectos(effects, factor) {
  return effects.map((effect) => {
    const lo = sinCeroNegativo(Math.round(effect.min * factor));
    const hi = sinCeroNegativo(Math.round(effect.max * factor));
    if (effect.min + effect.max > 0) {
      const min = Math.max(1, lo);
      return { ...effect, min, max: Math.max(min, hi) };
    }
    return { ...effect, min: Math.min(lo, hi), max: Math.max(lo, hi) };
  }).filter((effect) => effect.min !== 0 || effect.max !== 0);
}

// Suma un rango de hype: si el premio ya mueve el hype, se agranda ese rango (una fila, no dos).
function conHype(effects, [min, max]) {
  const i = effects.findIndex((effect) => effect.type === 'stat' && effect.path === PATH_HYPE);
  if (i < 0) return [...effects, { type: 'stat', path: PATH_HYPE, min, max, clamp: [0, BALANCE.stats.max] }];
  return effects.map((effect, k) => (k === i ? { ...effect, min: effect.min + min, max: effect.max + max } : effect));
}

function extremosDelMomento(opciones) {
  const outcomes = opciones.flatMap((opcion) => opcion.outcomes.map((outcome) => outcome.effects.filter(esMagnitud)));
  const buenos = outcomes.map((effects) => effects.filter((effect) => effect.min + effect.max > 0));
  const malos = outcomes.map((effects) => effects.filter((effect) => effect.min + effect.max < 0));
  const mejor = buenos.reduce((a, b) => (valorDe(b) > valorDe(a) ? b : a), []);
  const peor = malos.reduce((a, b) => (valorDe(b) < valorDe(a) ? b : a), []);
  return { mejor, peor };
}

// `{ arriesgado: { si, no }, seguro: { si, no } }`: listas de efectos (rangos), nunca un "si sale" vacío.
export function premiosDelBo1(opciones) {
  const P = BALANCE.g1.bo1.premio;
  const { mejor, peor } = extremosDelMomento(opciones);
  const seguroSi = mejor.length > 0 ? escalarEfectos(mejor, P.seguroSi) : conHype([], P.seguroHypeSinPremio);
  return {
    arriesgado: { si: conHype(escalarEfectos(mejor, P.arriesgadoSi), P.arriesgadoHype), no: escalarEfectos(peor, P.arriesgadoNo) },
    seguro: { si: seguroSi, no: escalarEfectos(peor, P.seguroNo) }
  };
}

const textoDelPremio = (effects, base) => {
  const rangos = textoDeRangos(effects);
  return rangos ? `${base} · ${rangos}` : base;
};

// La p del bot con la vara de su encare: lo que la vara sube o baja desde la base mueve la p en vara / ancho (la regla de
// `resultadoDelBot`, como el escenario o el desempate).
const pDelEncare = (pBot, varaBase, vara) => Math.min(1, Math.max(0, pBot - (vara - varaBase) / anchoDelBot()));

// La parada de la elección. `null` si el rol no tiene mecánica de mapa (no pasa: hay universales): queda el momento.
function construirDecisionBo1(state, evento, contexto, fecha, decisionDelMomento) {
  const entrada = elegirMinijuego(state, MOMENTO_MECANICA_BO1);
  if (!entrada) return null;
  const vivas = opcionesVivas(state, evento, contexto);
  const pBot = probabilidadDeFechaMarcada(state, { ajustePartido: ajusteMedioDelMomento(state, vivas) });
  const varas = varasDelBo1(pBot, entrada.id);
  const varaBase = Math.min(techoDeVara(entrada.id), enPuntos(varaDeMapa(pBot)));
  const encares = encaresDelMomento(vivas);
  const premios = premiosDelBo1(vivas);
  const porOpcion = {};
  const opciones = ['arriesgado', 'seguro'].map((riesgo) => {
    const encare = encares[riesgo];
    const { si: efectosSi, no: efectosNo } = premios[riesgo];
    const premio = { si: textoDelPremio(efectosSi, 'ganás la fecha'), no: textoDelPremio(efectosNo, 'perdés la fecha') };
    const p = pDelEncare(pBot, varaBase, varas[riesgo]);
    porOpcion[encare.opcion.id] = {
      riesgo, vara: varas[riesgo], p, si: encare.si, no: encare.no, efectosSi, efectosNo, premio,
      valorSi: valorDe(efectosSi), valorNo: valorDe(efectosNo)
    };
    return {
      id: encare.opcion.id,
      label: resolverTexto(encare.opcion.label, state),
      // la descripción es la del momento: el "si sale / si no" ya está en el premio (`g1.premio`)
      descripcion: resolverTexto(encare.opcion.descripcion, state),
      g1: { riesgo, vara: varas[riesgo], premio: `Si sale: ${premio.si} · si no: ${premio.no}` }
    };
  });
  return {
    ...decisionDelMomento,
    descripcion: `${decisionDelMomento.descripcion} Elegí cómo lo encarás: no se tira, lo decide el minijuego.`,
    opciones,
    datos: {
      ...decisionDelMomento.datos,
      // `dificultad` y `factorEscalada`: los del minijuego que viene, para que la pantalla diga la regla de cada vara
      bo1: { minijuego: entrada.id, pBot, porOpcion, dificultad: factorDificultadPorRonda(null), factorEscalada: factorEscalada(0) }
    }
  };
}

// El minijuego del encare elegido (la segunda pausa, la del contrato de G1: `datos.g1` con la vara y el premio).
function pausaDelBo1(state, decision, opcionId) {
  const { bo1, eventoId, pAntesDeDecidir, etiqueta } = decision.datos;
  const elegida = bo1.porOpcion[opcionId] ? opcionId : Object.keys(bo1.porOpcion)[0];
  const encare = bo1.porOpcion[elegida];
  const entrada = minijuegoPorId(bo1.minijuego);
  const textos = textoDeMinijuego(entrada, state);
  const fecha = state.career.temporada.fechaEnCurso;
  const g1 = {
    vara: encare.vara,
    margenCasi: BALANCE.g1.margenCasi,
    escalon: 0,
    factorEscalada: factorEscalada(0),
    camino: { torneo: `${etiqueta ?? 'Temporada regular'} · vs ${fecha.rival}`, bo: 1, etapas: [] },
    poder: null,
    desempate: false,
    revancha: false,
    desempateDisponible: false,
    premio: { si: encare.premio.si, no: encare.premio.no }
  };
  return {
    state: { ...state, flags: { ...state.flags, minijuegosRecientes: registrarMinijuegoVisto(state, entrada.id) } },
    logs: [],
    decision: {
      tipo: 'opciones',
      presentacion: 'minijuego',
      titulo: `${ROTULO_RIESGO[encare.riesgo]} · ${textos.titulo}`,
      descripcion: textos.descripcion,
      opciones: [],
      datos: {
        motivo: 'bo1',
        momento: MOMENTO_PARADA_BO1,
        eventoId,
        opcionId: elegida,
        riesgo: encare.riesgo,
        si: encare.si,
        no: encare.no,
        efectosSi: encare.efectosSi,
        efectosNo: encare.efectosNo,
        rival: fecha.rival,
        etiqueta,
        minijuego: entrada.id,
        ronda: null,
        dificultad: factorDificultadPorRonda(null),
        statRelevante: entrada.statRelevante,
        apuesta: textos.apuesta,
        regla: textos.regla,
        reglaVara: reglaDeLaVara(encare.vara),
        // G-fix C1: la p del bot con la vara de este encare (🎲 más difícil, 🧊 más fácil)
        p: encare.p,
        pBot: encare.p,
        pAntesDeDecidir,
        g1
      }
    }
  };
}

// El minijuego jugado: el juicio contra la vara decide la fecha (sin tirada) y el outcome ("si sale" o "si no sale").
function resolverBo1(state, decision, respuesta, rng) {
  const d = decision.datos;
  const juicio = juzgarMinijuego(respuesta.resultado ?? 0, d.g1.vara, d.g1.margenCasi);
  const evento = TODOS_LOS_EVENTOS.find((candidato) => candidato.id === d.eventoId);
  const opcion = evento.options.find((candidata) => candidata.id === d.opcionId);
  const outcome = opcion.outcomes[juicio.paso ? d.si : d.no];
  // G-fix C1: el texto es el del outcome del encare; los números, el premio a la vista (más lo que no es una magnitud, como
  // un camino o un momento, que el outcome traía)
  const premio = juicio.paso ? d.efectosSi : d.efectosNo;
  const otros = outcome.effects.filter((effect) => effect.type !== 'partido' && familiaDeEfecto(effect) === null);
  const forzado = { ...outcome, effects: [...premio, ...otros] };
  const { state: tras, logs } = resolverOpcion(devolverCupo(state), evento, d.opcionId, rng, { outcome: forzado });
  const max = BALANCE.stats.max;
  const juicioTexto = juicio.paso ? 'salió' : juicio.casi ? 'casi' : 'no salió';
  const linea = crearLog(
    'temporada',
    `${ROTULO_RIESGO[d.riesgo]}: ${juicioTexto} (sacaste ${Math.round(juicio.resultado * max)}; la vara era ${Math.round(d.g1.vara * max)}).`,
    { minijuego: d.minijuego, vara: d.g1.vara, resultado: juicio.resultado, paso: juicio.paso, casi: juicio.casi, riesgo: d.riesgo, bo1: true }
  );
  return resolverFechaMarcada(tras, rng, [linea, ...logs], d.pAntesDeDecidir, { gano: juicio.paso, p: d.pBot });
}

function arrancarMomento(state, rng, logs, campeonElegido) {
  const fecha = { ...state.career.temporada.fechaEnCurso, campeonElegido };
  const stConCampeon = { ...state, career: { ...state.career, temporada: { ...state.career.temporada, fechaEnCurso: fecha } } };
  // F2: si el motivo no tiene contenido (la red de seguridad de abajo; medido en f8503ce: ~300 fechas marcadas en 1000 carreras
  // pasaban sin momento) y el split todavía no frenó, el momento sale del pool de `parejo`, para que la fecha frene igual. La
  // fecha conserva su motivo en el rótulo y la frase; solo el contenido es el genérico.
  const motivoFecha = motivoPrincipal(fecha.motivos);
  const sinContenido = candidatosDePartido(stConCampeon, motivoFecha, false).length === 0;
  const motivo = sinContenido && necesitaParadaGarantizada(stConCampeon) ? 'parejo' : motivoFecha;
  const candidatos = candidatosDePartido(stConCampeon, motivo, false);

  if (candidatos.length === 0) {
    // Red de seguridad (no debería pasar con el catálogo escrito, pero un
    // stakes×rol sin contenido no puede dejar el pipeline colgado): se
    // resuelve la fecha directo, sin momento ni ajuste de partido.
    return resolverFechaMarcada(stConCampeon, rng, logs);
  }

  const evento = weightedPick(candidatos, (candidato) => pesoConMemoria(state, candidato), rng);
  const contexto = calcularContexto(stConCampeon, { ventana: 'regular', stakes: motivo });

  const decision = construirDecisionMomento(stConCampeon, evento, contexto, fecha, 'momento');
  // K6b-C2 (la cola de verdad): en la cola, el momento frena solo si es un hito, si algo cambió o si su tipo tiene palanca,
  // con el tope del año (`core/cola.js`). G2a: si no frena, el momento no pasa (tu perfil ya no lo resuelve por vos) y la
  // fecha se juega directo. F2: la fecha de la parada garantizada frena también en la cola (cuenta como hito).
  if (!frenaEnLaCola(stConCampeon, 'momento', esParadaGarantizada(fecha) || hitoDelMomento(stConCampeon)).frena) {
    return resolverFechaMarcada(stConCampeon, rng, logs, decision.datos.pAntesDeDecidir);
  }
  // D118: el Bo1 que frena se juega con las manos (la elección del encare y, después, el minijuego).
  const bo1 = construirDecisionBo1(stConCampeon, evento, contexto, fecha, decision);
  return { state: conFirmaDeLaCola(stConCampeon, 'momento'), logs, decision: bo1 ?? decision };
}

// K4-A: sin draft. La fecha marcada frena UNA vez —la previa y el momento— y se
// juega con el campeón del split, el que ya asumió `t.fuerzaPropia`.
function arrancarFechaMarcada(state, rng, logs) {
  return arrancarMomento(state, rng, logs, campeonDelSplitEnPool(state) ?? null);
}

// --- Resolver el resultado de la fecha marcada y seguir el calendario ---

function resolverFechaMarcada(state, rng, logsAcum, pAntesDeDecidir = null, decidido = null) {
  const t = state.career.temporada;
  const fecha = t.fechaEnCurso;
  const motivo = motivoPrincipal(fecha.motivos);
  // Fase 9Rc: el factor del draft es RELATIVO al campeón del split (el que ya
  // asumió `t.fuerzaPropia`). Elegir ese mismo campeón para la fecha da 0.
  // K2b: una sola tirada contra la p declarada (la misma que mira el draft).
  // K2d: y la misma que muestra la previa (`probabilidadDeFechaMarcada`); el
  // log lleva esa p y la de antes del momento, para mostrarlas con el resultado.
  // K3: `state` es el de DESPUÉS del momento (con su `ajustePartido` y su
  // mentalidad); la de antes es la que guardó la pausa. Sin momento (la red de
  // seguridad de `arrancarMomento`) nada la movió: es la misma tirada.
  // D118: el Bo1 que frena llega `decidido` (`{ gano, p }`, el `paso` del minijuego): sin tirada.
  const partido = decidido ?? tirarPartido(probabilidadDeFechaMarcada(state), rng);
  const { gano } = partido;
  const ajustePartido = t.ajustePartido ?? 0;
  const pSinMomento = pAntesDeDecidir ?? partido.p;

  // Fase 9R0a: la revancha se juega UNA vez. Después, ese rival deja de ser
  // "el que te eliminó": si no se limpiaba, `ultimoEliminadoPor` quedaba
  // pegado toda la carrera y la revancha se marcaba split tras split.
  const limpiaEliminado = motivo === 'revancha' && fecha.rival === state.career.ultimoEliminadoPor;

  // El resultado ya quedó fijo: se avanza la jornada COMPLETA (tu fecha + los
  // cruces ajenos de esa ronda) ANTES de leer la tabla, para que la posición
  // que se loguea sea la de una jornada de verdad cerrada y no la de
  // vos-jugaste-y-el-resto-no (fase 9Rb). La reacción posterior es flavor y no
  // puede volver a tocar el resultado.
  const stConResultado = avanzarFechaSilenciosa(
    {
      ...state,
      career: {
        ...state.career,
        ultimoEliminadoPor: limpiaEliminado ? null : state.career.ultimoEliminadoPor,
        temporada: { ...t, ajustePartido: 0 }
      }
    },
    partido,
    true,
    rng
  );
  const tt = stConResultado.career.temporada;
  const tablaTrasFecha = tablaDePosiciones(tt.registrosOtros, tt.filaPropia);
  const posicion = posicionEnTabla(tablaTrasFecha, state.career.currentOrg);

  const logs = [...logsAcum, crearLog(
    'temporada',
    `${fraseDeMotivo(motivoDeTexto(fecha), fecha.rival, state.player.splitCount)} ${gano ? 'Ganan.' : 'Pierden.'} `
    + `Quedan ${posicion}º de ${tablaTrasFecha.length}`
    + `${fecha.campeonElegido ? ` jugando ${fecha.campeonElegido.name}` : ''}.`,
    // K6a-M: la fecha jugada viaja en su log (`encabezadoDeResultado`, core/temporada.js): la tarjeta de resultado la
    // pinta de acá y no del estado de cuando se pinta, que ya siguió el calendario en silencio (en el ensayo de K6 la
    // previa fue contra RED Canids y la tarjeta dijo "GANARON vs PAIN GAMING", la última fecha del split).
    {
      p: partido.p, pSinMomento, ajustePartido,
      rival: fecha.rival, local: fecha.local, fuerzaRival: fecha.fuerzaRival, fuerzaPropia: t.fuerzaPropia,
      gano, posicion, equipos: tablaTrasFecha.length, racha: tt.racha
    }
  )];

  // Fase 9Re: la reacción postpartido dejó de ser una decisión. Es flavor —
  // el código mismo dice que no puede tocar el resultado (ya pasó)— y con 4
  // eventos de postpartido para toda la carrera repetía cada uno ~6 veces. Se
  // resuelve sola (opción por peso, exactamente lo que hacía el camino
  // headless) y se cuenta en una línea. El contenido no se borra: se degrada a
  // crónica. El consumo de RNG es idéntico al del camino headless de antes.
  if (chance(BALANCE.temporada.probReaccion, rng)) {
    const candidatos = candidatosDePartido(stConResultado, motivo, true);
    if (candidatos.length > 0) {
      const evento = weightedPick(candidatos, (candidato) => pesoConMemoria(stConResultado, candidato), rng);
      const opcion = weightedPick(opcionesVivas(stConResultado, evento), (candidata) => candidata.weight, rng);
      const { state: trasReaccion, logs: logsReaccion } = resolverOpcion(stConResultado, evento, opcion.id, rng);
      return continuarTemporada(limpiarFechaEnCurso(trasReaccion), rng, [...logs, ...logsReaccion]);
    }
  }

  return continuarTemporada(limpiarFechaEnCurso(stConResultado), rng, logs);
}

function limpiarFechaEnCurso(state) {
  return { ...state, career: { ...state.career, temporada: { ...state.career.temporada, fechaEnCurso: null } } };
}

// --- El loop principal: recorre el calendario, marca a lo sumo una fecha, resuelve el resto en silencio ---

function continuarTemporada(state, rng, logsAcum) {
  let st = state;
  let silenciosas = { ganados: 0, perdidos: 0 };

  for (;;) {
    const t = st.career.temporada;

    if (t.indice >= t.calendario.length) {
      const logs = [...logsAcum];
      const resumen = textoResumenSilencioso(silenciosas);
      if (resumen) {
        logs.push(crearLog('temporada', resumen, { tecnico: true }));
      }
      const tablaFinal = tablaDePosiciones(t.registrosOtros, t.filaPropia);
      const posicion = posicionEnTabla(tablaFinal, st.career.currentOrg);
      // K2b: el rendimiento del split lo cuentan los partidos que jugaste.
      const rendimiento = rendimientoDeLaTemporada(t.rendimientoBase, t.resultadosPropios);
      return {
        state: { ...st, career: { ...st.career, temporada: { ...t, activa: false, posicion, tabla: tablaFinal, rendimiento } } },
        logs
      };
    }

    const fecha = t.calendario[t.indice];
    const liga = ligaOZonaDeCarrera(st);

    // Fase 10c: mientras haya baja por lesión pendiente (`systems/salud.js`),
    // el equipo juega esta fecha sin vos — nunca se marca (no hay fecha
    // marcada para un partido que no jugás).
    const enBajaPorLesion = st.flags.fechasBajaLesion > 0;

    // K4-A: se marca la fecha que DECIDE algo, y como mucho una por split
    // (`objetivoMarcadas`). Con el cupo libre se mira esta fecha: si define la
    // clasificación (la de mayor prioridad) frena; si es de menor prioridad (el
    // archirrival, el clásico, la revancha) frena solo si el split no tiene a la
    // vista una que defina la clasificación más adelante, así gana la de mayor
    // prioridad y, a igual prioridad, la primera. Fase 9R0a: y las de menor
    // prioridad solo si el par (motivo, rival) no está en cooldown — sin esto la
    // misma revancha/clásico contra el mismo rival se marcaba split tras split.
    // Una temporada sin ningún motivo libre pasa entera resumida, y está bien.
    const marcadasQueFaltan = t.objetivoMarcadas - t.marcadasHechas;
    let motivos = ['parejo'];
    let marcar = false;
    if (!enBajaPorLesion && marcadasQueFaltan > 0) {
      motivos = motivosDeFecha(st, liga, fecha, t);
      const principal = motivoPrincipal(motivos);
      marcar = principal === 'define_clasificacion'
        || (principal !== 'parejo'
          && !parEnCooldown(st, principal, fecha.rival)
          && !defineClasificacionMasAdelante(st, liga, t));
    }
    // F2 (PLANUI §0.8): si el split no marcó ninguna fecha y todavía no frenó (`necesitaParadaGarantizada`), la última
    // del calendario se marca con o sin motivo. Usa el cupo de `objetivoMarcadas` (sigue habiendo a lo sumo una fecha
    // marcada por split, K4-A) y en baja por lesión no: es un partido que no jugás.
    const paradaGarantizada = !marcar && !enBajaPorLesion && marcadasQueFaltan > 0
      && t.indice === t.calendario.length - 1 && necesitaParadaGarantizada(st);
    if (paradaGarantizada) {
      motivos = [...motivosDeFecha(st, liga, fecha, t).filter((m) => m !== 'parejo'), MARCA_PARADA_GARANTIZADA];
      marcar = true;
    }
    const principal = motivoPrincipal(motivos);

    if (marcar) {
      const logs = [...logsAcum];
      const resumen = textoResumenSilencioso(silenciosas);
      if (resumen) {
        logs.push(crearLog('temporada', resumen, { tecnico: true }));
      }
      const stConFecha = {
        ...st,
        flags: { ...st.flags, motivosFechaRecientes: registrarParMarcado(st, principal, fecha.rival) },
        career: {
          ...st.career,
          temporada: { ...t, marcadasHechas: t.marcadasHechas + 1, fechaEnCurso: { ...fecha, motivos } }
        }
      };
      return arrancarFechaMarcada(stConFecha, rng, logs);
    }

    // Fuerza penalizada mientras dura la baja — no suma ni saca ninguna
    // tirada de `rng` (trampa T1): sigue siendo una sola tirada por fecha,
    // cambia la fuerza que recibe, no la cantidad de tiradas. Esa fecha no
    // cuenta para tu rendimiento del split: el equipo jugó sin vos.
    const fuerzaEfectiva = enBajaPorLesion ? t.fuerzaPropia * BALANCE.salud.factorFuerzaLesionado : t.fuerzaPropia;
    const partido = jugarPartido(st, fuerzaEfectiva, fecha.fuerzaRival, 'fecha', rng);
    const { gano } = partido;
    silenciosas = { ...silenciosas, [gano ? 'ganados' : 'perdidos']: silenciosas[gano ? 'ganados' : 'perdidos'] + 1 };
    st = avanzarFechaSilenciosa(
      enBajaPorLesion ? { ...st, flags: { ...st.flags, fechasBajaLesion: st.flags.fechasBajaLesion - 1 } } : st,
      partido,
      !enBajaPorLesion,
      rng
    );
  }
}

// --- Contrato del sistema ---

// K1 (D76): el split se cuenta acá, donde se JUEGA (ya pasaron el mercado, el
// ascenso y el descenso), con la org y el tier de ahora. Sin fila abierta para
// esta org (el split del pase), espera en `flags.splitJugadoSinFila` a que
// `roster.js` la abra. Nada del juego lo lee: cero `rng`.
function conSplitJugado(state) {
  const { registro, sinFila } = registrarSplitJugado(
    state.career.registro,
    { org: state.career.currentOrg, tier: state.career.tier },
    state.flags.splitJugadoSinFila
  );
  return {
    ...state,
    flags: { ...state.flags, splitJugadoSinFila: sinFila },
    career: { ...state.career, registro }
  };
}

// El guard es EXACTAMENTE el de rendimiento.js (regla de proceso: dos
// sistemas que se pasan un resultado entre sí no pueden tener guards
// distintos, o uno corre y el otro lee un `career.temporada` de un split
// viejo). `iniciarTemporada` es quien se hace cargo de una liga rara —nunca
// esta función.
export function aplicar(state, rng) {
  if (state.phase !== 'profesional' || !state.career.currentOrg || state.career.companeros.length === 0) {
    return { state, logs: [] };
  }

  const jugado = conSplitJugado(state);
  const st = { ...jugado, career: { ...jugado.career, temporada: iniciarTemporada(jugado, rng) } };
  return continuarTemporada(st, rng, []);
}

export function resolver(state, decision, respuesta, rng) {
  // Solo hay 'momento': el draft de la fecha desapareció (K4-A) y la reacción
  // postpartido dejó de ser una decisión (fase 9Re, se resuelve sola en
  // `resolverFechaMarcada`).
  // D118: el Bo1 que frena: la elección del encare abre el minijuego; el minijuego decide la fecha.
  if (decision.datos.motivo === 'bo1') {
    return resolverBo1(state, decision, respuesta, rng);
  }
  if (decision.datos.bo1) {
    return pausaDelBo1(state, decision, respuesta.opcionId);
  }
  const evento = TODOS_LOS_EVENTOS.find((candidato) => candidato.id === decision.datos.eventoId);
  const { state: nextState, logs } = resolverOpcion(state, evento, respuesta.opcionId, rng);

  return resolverFechaMarcada(nextState, rng, logs, decision.datos.pAntesDeDecidir);
}

export function resolverAuto(state, decision, rng) {
  // D118: el bot pasa con la p de la fecha (con el ajuste medio del momento) y elige el encare por perfil.
  if (decision.datos.motivo === 'bo1') {
    return { resultado: resultadoDelBot(rng(), decision.datos.g1.vara, decision.datos.pBot) };
  }
  if (decision.datos.bo1) {
    const evento = TODOS_LOS_EVENTOS.find((candidato) => candidato.id === decision.datos.eventoId);
    const ids = decision.opciones.map((opcion) => opcion.id);
    return { opcionId: opcionDelPerfilPara(state, { ...evento, options: evento.options.filter((o) => ids.includes(o.id)) }) };
  }
  const evento = TODOS_LOS_EVENTOS.find((candidato) => candidato.id === decision.datos.eventoId);
  const opcion = weightedPick(opcionesVivas(state, evento), (candidata) => candidata.weight, rng);
  return { opcionId: opcion.id };
}
