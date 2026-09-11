import { BALANCE } from '../data/balance.js';
import { ROLES } from '../data/roles.js';
import { clamp } from './numeros.js';
import { getPath } from './selectors.js';
import { nivelDelJugador } from './ficha.js';
import { ligaDeCarrera } from './competicion.js';
import { calificaAPlayoffs, calificaAInternacional } from './serie.js';
import { TOKENS } from './plantillas.js';

// El resumen anual (fase 11, PLAN.md §11.1): nota, titular y viñetas del año
// que cierra. Puro y sin RNG — `systems/resumenAnio.js` es el único que lo
// llama y el único que muta estado, después de que `escena`/`topMundial`/
// `rivales` ya corrieron este split (necesita `mundo.archirrival` fresco).
//
// Reemplaza `generarTextoResumen` de `systems/edadCierre.js`, que se borró.

// --- Piezas compartidas ---

function deltaEsteAnio(state, path) {
  const antes = state.flags.edadSnapshot?.[path];
  return antes === undefined ? 0 : getPath(state, path) - antes;
}

function deltaNivelEsteAnio(state) {
  const snapshot = state.flags.edadSnapshot ?? {};
  const { pesos } = ROLES[state.player.role];
  const antes = Object.entries(pesos).reduce((suma, [stat, peso]) => {
    const valorAntes = snapshot[`player.stats.${stat}`];
    return suma + (valorAntes === undefined ? state.player.stats[stat] : valorAntes) * peso;
  }, 0);
  return nivelDelJugador(state) - antes;
}

function rendimientoPropioMedio(state) {
  const ventana = state.career.historial.slice(-BALANCE.edad.splitsPorEdad);
  if (ventana.length === 0) {
    return 0.5;
  }
  return (ventana.reduce((suma, valor) => suma + valor, 0) / ventana.length) / BALANCE.stats.max;
}

// El archirrival sumó un trofeo propio (liga o internacional) ESTE año: el
// último renglón de `historial` (que `systems/rivales.js` acaba de escribir)
// contra el anterior — comparar acumulados en vez de guardar un delta aparte.
function archirrivalGanoEsteAnio(archirrival) {
  const historial = archirrival?.historial ?? [];
  if (historial.length === 0) {
    return false;
  }
  if (historial.length === 1) {
    return historial[0].titulos > 0;
  }
  return historial[historial.length - 1].titulos > historial[historial.length - 2].titulos;
}

function construirContexto(state) {
  const anio = state.calendario.anio;
  const registro = state.career.registro;
  const temporadas = registro.temporadas;
  return {
    anio,
    liga: ligaDeCarrera(state),
    internacionalEsteAnio: registro.internacionales.find((entrada) => entrada.anio === anio) ?? null,
    tituloEsteAnio: registro.titulos.find((titulo) => titulo.anio === anio) ?? null,
    filaAbiertaEsteAnio: registro.porOrg.find((fila) => fila.desdeAnio === anio) ?? null,
    mainMuerto: TOKENS.mainMuerto(state),
    rendimientoEsteAnio: rendimientoPropioMedio(state) * BALANCE.stats.max,
    deltaNivel: deltaNivelEsteAnio(state),
    rivalGanoEsteAnio: archirrivalGanoEsteAnio(state.mundo.archirrival),
    anioAnterior: temporadas[temporadas.length - 1] ?? null
  };
}

// --- 11.1: `notaDeLaTemporada` ---

function scorePosicion(state) {
  const { posicion } = state.career;
  const equipos = state.career.temporada?.tabla?.length || ligaDeCarrera(state)?.orgs.length || 0;
  if (!posicion || equipos <= 1) {
    return 0.5;
  }
  return 1 - (posicion - 1) / (equipos - 1);
}

function scorePlayoffs(state, anio) {
  const s = BALANCE.temporadaResumen.scorePlayoffs;
  const registro = state.career.registro;
  if (registro.titulos.some((titulo) => titulo.anio === anio)) {
    return s.campeon;
  }
  if (registro.internacionales.some((entrada) => entrada.anio === anio)) {
    return s.llegoAlInternacional;
  }
  const liga = ligaDeCarrera(state);
  // `state.career.posicion` es `null` sin equipo este año — sin el guard,
  // `calificaAPlayoffs`/`calificaAInternacional` lo coercionan a 0 y un año
  // sin club se lee como "clasificado en el puesto 0".
  if (!liga?.formatoPlayoffs || !state.career.posicion) {
    return s.sinLigaReal;
  }
  return calificaAPlayoffs(liga, state.career.posicion) ? s.clasificado : s.noClasificado;
}

function scoreInternacional(state, anio) {
  const c = BALANCE.temporadaResumen;
  const entrada = state.career.registro.internacionales.find((e) => e.anio === anio);
  if (!entrada) {
    return c.scoreInternacionalNeutro;
  }
  return entrada.resultado === 'buen_papel' ? 1 : c.scoreInternacionalEliminado;
}

function scoreJerarquiaArraigo(state) {
  const deltaProm = (deltaEsteAnio(state, 'career.jerarquia') + deltaEsteAnio(state, 'career.arraigo')) / 2;
  return clamp(0.5 + deltaProm / BALANCE.temporadaResumen.escalaJerarquiaArraigo, 0, 1);
}

function scoreSoloqAnual(state) {
  const delta = deltaEsteAnio(state, 'player.soloqElo');
  return clamp(delta / BALANCE.temporadaResumen.escalaSoloqAnual, 0, 1);
}

function scoreNivelAbsoluto(valor) {
  return clamp(valor / BALANCE.stats.max, 0, 1);
}

export function notaDeLaTemporada(state) {
  const c = BALANCE.temporadaResumen;
  let compuesto;
  if (state.phase === 'amateur') {
    const p = c.pesosAmateur;
    compuesto = scoreSoloqAnual(state) * p.soloq
      + scoreNivelAbsoluto(state.player.studies) * p.estudios
      + scoreNivelAbsoluto(state.player.familyTrust) * p.familia
      + scoreNivelAbsoluto(state.player.sleep) * p.sueno;
  } else {
    const p = c.pesos;
    const anio = state.calendario.anio;
    compuesto = scorePosicion(state) * p.posicion
      + scorePlayoffs(state, anio) * p.playoffs
      + rendimientoPropioMedio(state) * p.rendimientoPropio
      + scoreInternacional(state, anio) * p.internacional
      + scoreJerarquiaArraigo(state) * p.jerarquiaArraigo;
  }
  return Math.round(clamp(compuesto, 0, 1) * 100) / 10;
}

export function bandaDeNota(nota) {
  const { bandas } = BALANCE.temporadaResumen;
  if (nota < bandas.rojo) {
    return 'rojo';
  }
  if (nota <= bandas.gris) {
    return 'gris';
  }
  if (nota <= bandas.ambar) {
    return 'ambar';
  }
  return 'verde';
}

// --- 11.1: `titularDelAnio` ---
//
// Puntaje por peso emocional, no por magnitud (PLAN.md §11.1): un torneo que
// no jugaste (`ausencia`, 75) titula por encima de una temporada regular
// sólida (`eliminacion`, 50). Se evalúan todos los candidatos elegibles y
// gana el de mayor puntaje; `estable` es el piso que siempre está disponible.

const PUNTAJES = {
  titulo_internacional: 100,
  titulo_liga: 80,
  ausencia: 75,
  main_muerto: 70,
  debut: 70,
  sequia: 65,
  rival: 60,
  caida: 60,
  transferencia: 55,
  eliminacion: 50,
  estable: 10
};

function candidatoTituloInternacional(state, ctx) {
  if (ctx.internacionalEsteAnio?.resultado !== 'buen_papel') {
    return null;
  }
  return { titular: 'CAMPEONES DEL MUNDO', bajada: null };
}

function candidatoTituloLiga(state, ctx) {
  if (!ctx.tituloEsteAnio) {
    return null;
  }
  return { titular: `CAMPEONES DE LA ${ctx.tituloEsteAnio.nombre.toUpperCase()}`, bajada: null };
}

// Worlds existe todos los años (`mundo.escenaAnual`, fase 9M-lite): la
// ausencia sólo cuenta cuando tu liga de verdad manda gente — sin eso, no
// estar no es una historia, es lo normal.
function candidatoAusencia(state, ctx) {
  if (ctx.internacionalEsteAnio || (ctx.liga?.cuposInternacionales ?? 0) <= 0) {
    return null;
  }
  return { titular: 'WORLDS, POR TWITCH', bajada: 'Worlds se jugó sin vos. La espina más grande de tu carrera.' };
}

// El titular es "EL PARCHE QUE TE MATÓ..." (un hecho puntual, pasado), no
// "seguís sin tu main" — pero `TOKENS.mainMuerto` es una condición que dura
// mientras el meta no vuelva a girar, no un evento de un solo split. Sin el
// corte por transición, esto ganaba hasta 8 de los primeros 10 resúmenes de
// una carrera (medido, viola §11.3 check 2): sólo cuenta el año en que la
// marca ENTRA, no cada año que sigue prendida.
function candidatoMainMuerto(state, ctx) {
  if (!ctx.mainMuerto || ctx.anioAnterior?.mainMuerto) {
    return null;
  }
  return { titular: `EL PARCHE QUE TE MATÓ EL ${ctx.mainMuerto.toUpperCase()}`, bajada: null };
}

function candidatoDebut(state, ctx) {
  const { splitAscensoTier1 } = state.career;
  // `splitAscensoTier1` guarda el splitCount de ANTES del incremento de
  // `atributos.js` en su propio split (mercado.js corre antes en
  // `ETAPAS_SPLIT`) — el split más viejo de este año equivale entonces a
  // `splitCount actual - splitsPorEdad`, no `- (splitsPorEdad - 1)`. Con `<`
  // en vez de `<=` acá se perdía el debut cuando pasaba justo en el primer
  // split del año (trampa encontrada al medir: 0 apariciones en 40 seeds).
  if (splitAscensoTier1 === null || splitAscensoTier1 < state.player.splitCount - BALANCE.edad.splitsPorEdad) {
    return null;
  }
  return { titular: `EL PIBE DE LA ${ctx.liga?.id ?? 'LIGA'}`, bajada: null };
}

function candidatoSequia(state, ctx) {
  // El drop del shotcalling en sí casi nunca pasa bajo juego automático
  // (medido: nunca cruza -0.5 en un año) — la sequía real es el
  // RESULTADO: rendiste mal aunque el nivel no se haya caído (si se cayó,
  // ya lo titula `caida`, que puntúa distinto).
  if (ctx.rendimientoEsteAnio > BALANCE.temporadaResumen.umbralSequiaRendimiento || state.phase === 'amateur') {
    return null;
  }
  return { titular: '¿Y EL SHOTCALLING?', bajada: 'Año seco: las llamadas no salieron.' };
}

function candidatoRival(state, ctx) {
  if (!ctx.rivalGanoEsteAnio) {
    return null;
  }
  return { titular: `${state.mundo.archirrival.org.toUpperCase()} LEVANTÓ LA COPA`, bajada: null };
}

function candidatoCaida(state, ctx) {
  if (ctx.deltaNivel > -BALANCE.temporadaResumen.umbralCaida) {
    return null;
  }
  return { titular: 'EL AÑO QUE SE TE CAYÓ LA MANO', bajada: null };
}

function candidatoTransferencia(state, ctx) {
  if (!ctx.filaAbiertaEsteAnio) {
    return null;
  }
  const region = state.mundo.ligas.find((liga) => liga.id === ctx.filaAbiertaEsteAnio.liga)?.region;
  return { titular: region ? `TE FUISTE A ${region.toUpperCase()}` : 'CAMBIO DE AIRES', bajada: null };
}

function candidatoEliminacion(state, ctx) {
  if (!ctx.liga?.formatoPlayoffs || !state.career.posicion || !calificaAPlayoffs(ctx.liga, state.career.posicion)) {
    return null;
  }
  const otraVez = (ctx.anioAnterior?.tipoBase ?? ctx.anioAnterior?.tipo) === 'eliminacion' ? ', OTRA VEZ' : '';
  return { titular: `AFUERA DE PLAYOFFS DE ${ctx.liga.id}${otraVez}`, bajada: null };
}

// Orden de desempate en caso de puntaje igual (`debut`/`main_muerto` y
// `rival`/`caida` empatan): `debut` primero — es un hito único e irrepetible
// de la carrera, `main_muerto` puede volver a salir cualquier año.
const CANDIDATOS = [
  ['titulo_internacional', candidatoTituloInternacional],
  ['titulo_liga', candidatoTituloLiga],
  ['ausencia', candidatoAusencia],
  ['debut', candidatoDebut],
  ['main_muerto', candidatoMainMuerto],
  ['sequia', candidatoSequia],
  ['rival', candidatoRival],
  ['caida', candidatoCaida],
  ['transferencia', candidatoTransferencia],
  ['eliminacion', candidatoEliminacion]
];

// Cuántas veces salió ya `tipoBase` DENTRO de la ventana que mira el check
// de §11.3 (los últimos `ventanaRacha` años — uno menos que su ventana de 10,
// porque el año actual todavía no está en `registro.temporadas`). A
// propósito NO exige que sean consecutivos: una dinastía de liga o una
// sequía de internacionales que se repiten salteados igual saturan la misma
// ventana de 10 años que el check cuenta.
function contarEnVentana(temporadas, tipoBase) {
  const ventana = temporadas.slice(-BALANCE.temporadaResumen.ventanaRacha);
  return ventana.filter((t) => (t.tipoBase ?? t.tipo) === tipoBase).length;
}

// §11.3 check 2: ningún `tipo` puede repetirse más de 3 veces en 10 años.
// Algunos titulares son una condición sostenida de verdad, no un evento —
// una dinastía de liga o una sequía de internacionales pueden durar más de 3
// años reales — así que "ampliar el catálogo" (PLAN.md §11.3) no puede
// significar inventar tipos nuevos con el mismo criterio (nunca alcanzaría);
// significa que cada 3 apariciones en la ventana la racha se vuelve su
// propia variante, con un prefijo que la NOMBRA como racha en vez de repetir
// el mismo titular como si fuera la primera vez que pasa.
const PREFIJOS_RACHA = ['', 'OTRA VEZ — ', 'Y SIGUE — ', 'SIN FRENO — '];

export function titularDelAnio(state) {
  const ctx = construirContexto(state);
  let tipoBase = 'estable';
  let elegido = { titular: 'UN AÑO MÁS EN LA GRIETA', bajada: null };
  let puntaje = PUNTAJES.estable;
  for (const [candidatoTipo, fn] of CANDIDATOS) {
    if (PUNTAJES[candidatoTipo] <= puntaje) {
      continue;
    }
    const candidato = fn(state, ctx);
    if (candidato) {
      tipoBase = candidatoTipo;
      elegido = candidato;
      puntaje = PUNTAJES[candidatoTipo];
    }
  }

  const previas = contarEnVentana(state.career.registro.temporadas, tipoBase);
  const tramo = Math.floor(previas / 3);
  const tipo = tramo === 0 ? tipoBase : `${tipoBase}_racha${tramo + 1}`;
  const prefijo = PREFIJOS_RACHA[Math.min(tramo, PREFIJOS_RACHA.length - 1)];

  // `tipoBase`/`mainMuerto` viajan en el resultado (no sólo se usan acá
  // adentro): `systems/resumenAnio.js` los persiste en `registro.temporadas`
  // para que el año siguiente pueda seguir contando la racha y saber si
  // `main_muerto` ya estaba prendido (el corte por transición de arriba).
  return {
    tipo, tipoBase, titular: `${prefijo}${elegido.titular}`, bajada: elegido.bajada, mainMuerto: Boolean(ctx.mainMuerto)
  };
}

// --- 11.1: `vinetasDelAnio` ---

function vinetaNumeros(state) {
  const nivel = Math.round(nivelDelJugador(state));
  const rendimiento = Math.round(rendimientoPropioMedio(state) * BALANCE.stats.max);
  return { icono: '📊', texto: `Nivel ${nivel}/100 · rendimiento medio del año ${rendimiento}/100.` };
}

function vinetaEquipo(state, ctx) {
  if (state.phase === 'amateur') {
    return { icono: '🏆', texto: `SoloQ: ${Math.round(state.player.soloqElo)} LP. Todavía sin equipo profesional.` };
  }
  if (!state.career.currentOrg) {
    return { icono: '🏆', texto: 'Sin equipo esta temporada.' };
  }
  // Tier 3 (u otro tramo sin tabla real): hay org pero `career.posicion`
  // nunca se fijó — sin este corte, el texto de abajo mostraría "nullº".
  if (!state.career.posicion) {
    return { icono: '🏆', texto: `${state.career.currentOrg}: temporada sin tabla de posiciones oficial.` };
  }
  const equipos = state.career.temporada?.tabla?.length || ctx.liga?.orgs.length || 0;
  const campeon = ctx.tituloEsteAnio ? ' — campeones.' : '.';
  return {
    icono: '🏆',
    texto: `${state.career.currentOrg} terminó ${state.career.posicion}º de ${equipos} en ${ctx.liga?.id ?? 'la liga'}${campeon}`
  };
}

function vinetaInternacional(ctx) {
  if (!ctx.internacionalEsteAnio) {
    return { icono: '🌍', texto: 'Sin internacional este año.' };
  }
  return {
    icono: '🌍',
    texto: ctx.internacionalEsteAnio.resultado === 'buen_papel'
      ? 'Buen papel en el internacional: se habló de vos afuera de tu región.'
      : 'Eliminado temprano en el internacional.'
  };
}

function vinetaArchirrival(state) {
  const archirrival = state.mundo.archirrival;
  if (!archirrival) {
    return { icono: '⚡', texto: 'Sin un rival de generación que te pise los talones todavía.' };
  }
  const { tuyos, suyos } = archirrival.duelo;
  const ventaja = tuyos >= suyos ? 'vas ganando el duelo' : 'te lleva ventaja';
  return {
    icono: '⚡',
    texto: `${archirrival.handle} (${archirrival.org ?? 'sin equipo'}): ${suyos} trofeos contra tus ${tuyos} — ${ventaja}.`
  };
}

function vinetaMeta(state, ctx) {
  if (ctx.mainMuerto) {
    return { icono: '🎯', texto: `El parche te dejó sin ${ctx.mainMuerto} — el meta te lo mató.` };
  }
  const c = BALANCE.contexto;
  if (state.meta.ajuste >= c.ajusteAFavor) {
    return { icono: '🎯', texto: 'El meta te vino a favor: tu pool estuvo en tier alta todo el año.' };
  }
  if (state.meta.ajuste <= c.ajusteEnContra) {
    return { icono: '🎯', texto: 'El meta te remó en contra, pero tu pool aguantó.' };
  }
  return { icono: '🎯', texto: 'El meta se mantuvo parejo con tu pool.' };
}

// La única viñeta obligatoria en TODA carrera (§11.3): siempre nombra algo
// concreto del año que viene, nunca un genérico "a seguir así".
function vinetaProximoAnio(state, ctx) {
  const contrato = state.career.contrato;
  if (state.phase === 'amateur') {
    return { icono: '🎀', texto: 'El año que viene: a seguir empujando el ranked y esperar la llamada de un equipo.' };
  }
  if (ctx.liga && state.career.posicion && calificaAInternacional(ctx.liga, state.career.posicion)) {
    return { icono: '🎀', texto: `Quedaron ${state.career.posicion}º: el año que viene arrancan con cupo a internacional.` };
  }
  if (contrato.org && contrato.aniosRestantes <= 1) {
    return { icono: '🎀', texto: 'Se te vence el contrato: el año que viene, en la pretemporada, vas a tener que decidir.' };
  }
  if (ctx.liga && state.career.posicion && calificaAPlayoffs(ctx.liga, state.career.posicion)) {
    return { icono: '🎀', texto: 'Quedaron dentro de playoffs: el año que viene, a sostenerlo.' };
  }
  return { icono: '🎀', texto: 'El año que viene: a pelear un lugar mejor en la tabla.' };
}

export function vinetasDelAnio(state) {
  const ctx = construirContexto(state);
  return [
    vinetaNumeros(state),
    vinetaEquipo(state, ctx),
    vinetaInternacional(ctx),
    vinetaArchirrival(state),
    vinetaMeta(state, ctx),
    vinetaProximoAnio(state, ctx)
  ];
}
