import { BALANCE } from '../data/balance.js';
import { ROLES } from '../data/roles.js';
import { clamp } from './numeros.js';
import { getPath } from './selectors.js';
import { nivelDelJugador } from './ficha.js';
import { ligaDeCarrera } from './competicion.js';
import { calificaAPlayoffs, calificaAInternacional } from './serie.js';
import { TOKENS } from './plantillas.js';
import { esBuenPapel } from './registro.js';
import { nombreVisibleDeLiga } from './ligas.js';
import { etiquetaDeRanked, servidorDeLaPartida } from './ranked.js';
import { plural, deLaLiga } from './formato.js';

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

// G4a: el golpe del año, si hubo. `pcConfiscada` y la confianza de la familia no guardan "cuándo": se leen contra las marcas
// del cierre anterior (`entrada.marcas`, que `systems/resumenAnio.js` persiste), igual que `mainMuerto`. La lesión grave
// guarda su split: este año es lo que cae dentro de los últimos `splitsPorEdad`.
function marcasDelCierre(state) {
  return { pcConfiscada: (state.flags.pcConfiscada ?? 0) > 0, familyTrust: state.player.familyTrust };
}

function golpeDelAnio(state, anioAnterior) {
  const lesion = state.flags.lesionGraveSplit;
  if (lesion != null && lesion >= state.player.splitCount - BALANCE.edad.splitsPorEdad) {
    return 'lesion';
  }
  const antes = anioAnterior?.marcas;
  if (marcasDelCierre(state).pcConfiscada && !antes?.pcConfiscada) {
    return 'pc';
  }
  if (antes && antes.familyTrust - state.player.familyTrust >= BALANCE.temporadaResumen.umbralGolpeFamilia) {
    return 'familia';
  }
  return null;
}

function construirContexto(state) {
  const anio = state.calendario.anio;
  const registro = state.career.registro;
  const temporadas = registro.temporadas;
  return {
    anio,
    liga: ligaDeCarrera(state),
    internacionalEsteAnio: registro.internacionales.find((entrada) => entrada.anio === anio) ?? null,
    // F3: los Mundiales de años anteriores (para el "primero" y la bajada de veterano) y la final doméstica perdida del año.
    swissPrevio: registro.internacionales.some((entrada) => entrada.anio < anio && entrada.resultado === 'eliminado'),
    mundialesPrevios: registro.internacionales.filter((entrada) => entrada.anio < anio).length,
    finalPerdidaEsteAnio: (registro.finales ?? []).find((final) => final.anio === anio && !final.gano) ?? null,
    // La copa amateur también entra en `registro.titulos` (`tier: 'amateur'`): no es un título de liga, tiene su titular.
    tituloEsteAnio: registro.titulos.find((titulo) => titulo.anio === anio && titulo.tier !== 'amateur') ?? null,
    copaAmateurEsteAnio: registro.titulos.find((titulo) => titulo.anio === anio && titulo.tier === 'amateur') ?? null,
    primeraFirma: registro.porOrg.length === 1,
    golpe: golpeDelAnio(state, temporadas[temporadas.length - 1] ?? null),
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
  return esBuenPapel(entrada) ? 1 : c.scoreInternacionalEliminado;
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
//
// G4a (PLANUI §0.9, D114): cada titular tiene al menos tres redacciones y la que sale rota con el año (`redaccion`), así
// que el mismo tipo en dos años seguidos nunca repite el texto. Y la prioridad, escrita (`PRIORIDAD_DE_TITULARES`, derivada
// de `PUNTAJES`, de mayor a menor): lo que te pasó (título, golpe, traición, vuelta a casa, el rival que te gana) le gana a
// lo genérico (la sequía, la transferencia, la eliminación, el año parejo).

const PUNTAJES = {
  titulo_internacional: 100,
  // El techo del papel internacional; el puntaje real depende de hasta dónde llegaste (`PUNTAJES_PAPEL_INTERNACIONAL`).
  papel_internacional: 90,
  titulo_liga: 80,
  // G4a: los hechos de la vida del jugador. Un golpe duro y una traición pesan lo que un título de liga menos uno; la copa
  // amateur es el título del que todavía no tiene liga.
  golpe_duro: 79,
  traicion: 79,
  copa_amateur: 79,
  volve_a_casa: 78,
  // F3 (PLANUI §0.8 punto 7): lo que pasó en el año titula por encima de lo que NO pasó (`ausencia`) y del color (`main_muerto`,
  // `debut`...), y por debajo de un título de liga y de un papel internacional desde cuartos (78). Si en el mismo año
  // se pierde la final y se juega el primer Mundial, gana el Mundial: aparece antes en `CANDIDATOS` y el empate lo gana el primero.
  primer_mundial: 77,
  final_perdida: 77,
  afuera_en_el_swiss: 76,
  rival_trapo: 76,
  ausencia: 75,
  primera_firma: 72,
  main_muerto: 70,
  debut: 70,
  sequia: 65,
  rival: 60,
  caida: 60,
  transferencia: 55,
  eliminacion: 50,
  estable: 10
};

export const PRIORIDAD_DE_TITULARES = Object.entries(PUNTAJES).sort((a, b) => b[1] - a[1]).map(([tipo]) => tipo);

// La redacción que toca este año: rota de a una por año, con un corrimiento por tipo para que no salgan todas a la par.
function redaccion(ctx, tipo, lista) {
  const corrimiento = [...tipo].reduce((suma, letra) => suma + letra.charCodeAt(0), 0);
  return lista[(ctx.anio + corrimiento) % lista.length];
}

// K4c (revisión): el titular dice lo que pasó. Campeón del mundo solo si ganaste; cuartos, semis y final (y el "buen
// papel" de los registros viejos, que no guardó hasta dónde llegaste) son su propio tipo, con su propia racha: no es un
// título del mundo que se repite.
// K4c (revisión, supervisor): el papel internacional pesa según hasta dónde llegaste. Una final del Mundial titula por encima
// de un título de liga (80); unos cuartos, por debajo: ganar tu liga es más historia que caer en cuartos.
const PUNTAJES_PAPEL_INTERNACIONAL = { final: 90, semis: 82, cuartos: 78, buen_papel: 78 };

// Cada redacción dice hasta dónde llegaste (el check de K4c lo exige).
const TITULARES_DE_PAPEL_INTERNACIONAL = {
  cuartos: ['CUARTOS DE FINAL EN WORLDS', 'LLEGASTE A CUARTOS EN WORLDS', 'CUARTOS DE FINAL: WORLDS SE CORTÓ ACÁ'],
  semis: ['SEMIFINALISTAS EN WORLDS', 'SEMIS DE WORLDS: A UN PASO DE LA FINAL', 'WORLDS TE LLEVÓ HASTA LAS SEMIS'],
  final: ['SUBCAMPEONES DEL MUNDO', 'SUBCAMPEONES EN WORLDS: A UN SUSPIRO', 'FINAL DE WORLDS: TE QUEDASTE A UN PASO'],
  buen_papel: ['BUEN PAPEL EN WORLDS', 'WORLDS: SE HABLÓ DE VOS', 'WORLDS TE DEJÓ PARADO']
};

function candidatoTituloInternacional(state, ctx) {
  if (ctx.internacionalEsteAnio?.resultado !== 'campeon') {
    return null;
  }
  return { titular: redaccion(ctx, 'titulo_internacional', ['CAMPEONES DEL MUNDO', '¡CAMPEONES DEL MUNDO!', 'CAMPEONES DEL MUNDO: LA COPA ES TUYA']), bajada: null };
}

function candidatoPapelInternacional(state, ctx) {
  const resultado = ctx.internacionalEsteAnio?.resultado;
  const lista = TITULARES_DE_PAPEL_INTERNACIONAL[resultado];
  return lista ? { titular: redaccion(ctx, resultado, lista), bajada: null, puntaje: PUNTAJES_PAPEL_INTERNACIONAL[resultado] } : null;
}

function candidatoTituloLiga(state, ctx) {
  if (!ctx.tituloEsteAnio) {
    return null;
  }
  const liga = deLaLiga(ctx.tituloEsteAnio.nombre).toUpperCase();
  return { titular: redaccion(ctx, 'titulo_liga', [`CAMPEONES ${liga}`, `TÍTULO ${liga}`, `LA COPA ${liga} SE QUEDA CON VOS`]), bajada: null };
}

// G4a: la copa amateur del año (`registro.titulos` con `tier: 'amateur'`): el título del que todavía no juega una liga.
function candidatoCopaAmateur(state, ctx) {
  const copa = ctx.copaAmateurEsteAnio;
  if (!copa) {
    return null;
  }
  const nombre = String(copa.nombre).toUpperCase();
  return {
    titular: redaccion(ctx, 'copa_amateur', [`CAMPEÓN DE ${nombre}`, `LEVANTASTE LA COPA: ${nombre}`, `${nombre}: LA COPA ES TUYA`]),
    bajada: 'La copa va a la vitrina y el server no habla de otra cosa.'
  };
}

// G4a: golpe duro. Lo que dejó marca en el año: la lesión grave, la PC confiscada o la familia que te frenó.
const TITULARES_DE_GOLPE = {
  lesion: {
    titulares: ['EL CUERPO DIJO BASTA', 'UN AÑO CON LA LESIÓN ENCIMA', 'LA LESIÓN TE PARÓ EL AÑO'],
    bajada: 'Una lesión grave te sacó del ritmo. Volver cuesta más que caerse.'
  },
  pc: {
    titulares: ['SIN PC, SIN SOLOQ', 'TE SACARON LA COMPU', 'EL AÑO QUE TE CONFISCARON LA PC'],
    bajada: 'Sin máquina no hay ladder. Hubo que arreglárselas como se pudo.'
  },
  familia: {
    titulares: ['EN CASA SE PUSO FEA LA COSA', 'LA FAMILIA TE PISÓ EL FRENO', 'EL AÑO DE LAS DISCUSIONES EN LA MESA'],
    bajada: 'La confianza en casa se resintió. Jugar así pesa distinto.'
  }
};

function candidatoGolpeDuro(state, ctx) {
  const golpe = TITULARES_DE_GOLPE[ctx.golpe];
  if (!golpe) {
    return null;
  }
  return { titular: redaccion(ctx, `golpe_${ctx.golpe}`, golpe.titulares), bajada: golpe.bajada };
}

// G4a: la fila de `registro.porOrg` que se abrió este año lleva `etiqueta` (G3c). Sin ella (ramas viejas, guardados
// anteriores), no sale ningún titular de mercado.
function candidatoTraicion(state, ctx) {
  const fila = ctx.filaAbiertaEsteAnio;
  if (fila?.etiqueta !== 'TRAICION') {
    return null;
  }
  const org = String(fila.org).toUpperCase();
  const rival = fila.traicionA ?? 'tu club de siempre';
  return {
    titular: redaccion(ctx, 'traicion', ['TRAICIÓN', 'TE PASASTE AL ENEMIGO', `DE ${String(fila.traicionA ?? 'TU CLUB').toUpperCase()} A ${org}: NO SE PERDONA`]),
    bajada: `Dejaste a ${rival} para firmar con ${fila.org}. Los hinchas no te lo van a olvidar.`
  };
}

function candidatoVolveACasa(state, ctx) {
  const fila = ctx.filaAbiertaEsteAnio;
  if (fila?.etiqueta !== 'VOLVE_A_CASA') {
    return null;
  }
  const org = String(fila.org).toUpperCase();
  return {
    titular: redaccion(ctx, 'volve_a_casa', ['VOLVISTE A CASA', `DE VUELTA EN ${org}`, `${org} TE RECIBE DE NUEVO`]),
    bajada: `${fila.org} te abrió la puerta otra vez.`
  };
}

// G4a: la primera firma de la carrera: el contrato que se recuerda.
function candidatoPrimeraFirma(state, ctx) {
  const fila = ctx.filaAbiertaEsteAnio;
  if (!fila || !ctx.primeraFirma) {
    return null;
  }
  const org = String(fila.org).toUpperCase();
  return {
    titular: redaccion(ctx, 'primera_firma', [`FIRMASTE POR ${org}`, `TU PRIMER CONTRATO: ${org}`, `YA SOS DE ${org}`]),
    bajada: 'El primer contrato no se olvida.'
  };
}

// G4a: el duelo eterno se lleva el titular el año que te gana: el rival levantó un trofeo este año y va adelante.
function candidatoRivalTrapo(state, ctx) {
  const archirrival = state.mundo.archirrival;
  if (!ctx.rivalGanoEsteAnio || !archirrival || archirrival.duelo.suyos <= archirrival.duelo.tuyos) {
    return null;
  }
  const { suyos, tuyos } = archirrival.duelo;
  return {
    titular: redaccion(ctx, 'rival_trapo', ['EL RIVAL TE PASÓ EL TRAPO', `${String(archirrival.handle).toUpperCase()} TE PASÓ EL TRAPO`, 'TE ESTÁN GANANDO EL DUELO']),
    bajada: `${archirrival.handle} sumó otro trofeo: ${suyos} contra tus ${tuyos}.`
  };
}

// Worlds existe todos los años (`mundo.escenaAnual`, fase 9M-lite): la
// ausencia sólo cuenta cuando tu liga de verdad manda gente — sin eso, no
// estar no es una historia, es lo normal.
function candidatoAusencia(state, ctx) {
  if (ctx.internacionalEsteAnio || (ctx.liga?.cuposInternacionales ?? 0) <= 0) {
    return null;
  }
  // F3: "la espina más grande de tu carrera" es una bajada de veterano; quien nunca jugó un Mundial todavía no tiene espina.
  const yaJugoUno = ctx.mundialesPrevios > 0;
  return {
    titular: redaccion(ctx, 'ausencia', ['WORLDS, POR TWITCH', 'WORLDS SE MIRÓ DESDE EL SOFÁ', 'WORLDS SIN VOS EN EL ESCENARIO']),
    bajada: yaJugoUno ? 'Worlds se jugó sin vos. La espina más grande de tu carrera.' : 'Worlds se jugó sin vos. Todavía no es tu año.'
  };
}

// F3 (D106, PLANUI §0.8): la final doméstica perdida del año. La bajada dice contra quién y cómo (el marcador con el ganador primero, como el log de la serie).
function candidatoFinalPerdida(state, ctx) {
  const final = ctx.finalPerdidaEsteAnio;
  if (!final) {
    return null;
  }
  return {
    titular: redaccion(ctx, 'final_perdida', ['SE ESCAPÓ LA FINAL', 'LA FINAL SE TE FUE DE LAS MANOS', 'FINAL PERDIDA: A UN PASO DE LA COPA']),
    bajada: `${final.marcador[1]}-${final.marcador[0]} contra ${final.rival} en la final ${deLaLiga(nombreVisibleDeLiga(final.liga))}.`
  };
}

// F3: el primer Mundial de la carrera, aunque te vayas en el Swiss. Desde cuartos lo titula el papel internacional.
function candidatoPrimerMundial(state, ctx) {
  if (!ctx.internacionalEsteAnio || ctx.internacionalEsteAnio.resultado !== 'eliminado' || ctx.mundialesPrevios > 0) {
    return null;
  }
  return {
    titular: redaccion(ctx, 'primer_mundial', ['TU PRIMER MUNDIAL', 'DEBUT EN WORLDS', 'PISASTE WORLDS POR PRIMERA VEZ']),
    bajada: 'Te tocó irte en el Swiss, pero ya estuviste.'
  };
}

// F3: un Mundial que no es el primero y se acaba en el Swiss. El "otra vez" exige un Swiss previo con eliminación: si los
// Mundiales de antes fueron mejores (cuartos, final, título), es "AFUERA EN EL SWISS" a secas.
function candidatoAfueraEnElSwiss(state, ctx) {
  if (ctx.internacionalEsteAnio?.resultado !== 'eliminado' || ctx.mundialesPrevios === 0) {
    return null;
  }
  const lista = ctx.swissPrevio
    ? ['OTRA VEZ AFUERA EN EL SWISS', 'OTRA VEZ SE TE CORTÓ EN EL SWISS', 'EL SWISS TE GANÓ DE NUEVO']
    : ['AFUERA EN EL SWISS', 'SE ACABÓ EN EL SWISS', 'WORLDS TE QUEDÓ GRANDE: AFUERA EN EL SWISS'];
  return { titular: redaccion(ctx, 'afuera_en_el_swiss', lista), bajada: 'Worlds se te acabó en la primera fase.' };
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
  const main = ctx.mainMuerto.toUpperCase();
  return { titular: redaccion(ctx, 'main_muerto', [`EL PARCHE QUE TE MATÓ EL ${main}`, `ADIÓS ${main}: EL PARCHE SE LO LLEVÓ`, `SIN ${main} POR CULPA DEL PARCHE`]), bajada: null };
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
  const liga = ctx.liga ? nombreVisibleDeLiga(ctx.liga.id).toUpperCase() : 'LIGA';
  return { titular: redaccion(ctx, 'debut', [`EL PIBE DE LA ${liga}`, `DEBUT EN LA ${liga}`, `LLEGASTE A LA ${liga}`]), bajada: null };
}

function candidatoSequia(state, ctx) {
  // El drop del shotcalling en sí casi nunca pasa bajo juego automático
  // (medido: nunca cruza -0.5 en un año) — la sequía real es el
  // RESULTADO: rendiste mal aunque el nivel no se haya caído (si se cayó,
  // ya lo titula `caida`, que puntúa distinto).
  if (ctx.rendimientoEsteAnio > BALANCE.temporadaResumen.umbralSequiaRendimiento || state.phase === 'amateur') {
    return null;
  }
  return {
    titular: redaccion(ctx, 'sequia', ['¿Y EL SHOTCALLING?', 'LAS CALLS NO ENTRARON', 'UN AÑO PARA OLVIDAR EN LAS CALLS']),
    bajada: 'Año seco: las llamadas no salieron.'
  };
}

function candidatoRival(state, ctx) {
  if (!ctx.rivalGanoEsteAnio) {
    return null;
  }
  const org = state.mundo.archirrival.org.toUpperCase();
  return { titular: redaccion(ctx, 'rival', [`${org} LEVANTÓ LA COPA`, `LA COPA SE FUE PARA ${org}`, `${org} SE QUEDÓ CON EL TROFEO`]), bajada: null };
}

function candidatoCaida(state, ctx) {
  if (ctx.deltaNivel > -BALANCE.temporadaResumen.umbralCaida) {
    return null;
  }
  return { titular: redaccion(ctx, 'caida', ['EL AÑO QUE SE TE CAYÓ LA MANO', 'SE TE BAJÓ EL NIVEL', 'LA MANO YA NO ES LA DE ANTES']), bajada: null };
}

function candidatoTransferencia(state, ctx) {
  if (!ctx.filaAbiertaEsteAnio) {
    return null;
  }
  const region = state.mundo.ligas.find((liga) => liga.id === ctx.filaAbiertaEsteAnio.liga)?.region?.toUpperCase();
  const lista = region
    ? [`TE FUISTE A ${region}`, `NUEVO AIRE EN ${region}`, `HICISTE LAS VALIJAS PARA ${region}`]
    : ['CAMBIO DE AIRES', 'NUEVO CLUB, NUEVA HISTORIA', 'OTRA CAMISETA'];
  return { titular: redaccion(ctx, 'transferencia', lista), bajada: null };
}

function candidatoEliminacion(state, ctx) {
  if (!ctx.liga?.formatoPlayoffs || !state.career.posicion || !calificaAPlayoffs(ctx.liga, state.career.posicion)) {
    return null;
  }
  const otraVez = (ctx.anioAnterior?.tipoBase ?? ctx.anioAnterior?.tipo) === 'eliminacion' ? ', OTRA VEZ' : '';
  const liga = nombreVisibleDeLiga(ctx.liga.id).toUpperCase();
  const lista = [`AFUERA DE PLAYOFFS DE ${liga}`, `SE TE CORTÓ EN PLAYOFFS DE ${liga}`, `PLAYOFFS DE ${liga}: HASTA ACÁ LLEGASTE`];
  return { titular: `${redaccion(ctx, 'eliminacion', lista)}${otraVez}`, bajada: null };
}

// Orden de desempate en caso de puntaje igual (`debut`/`main_muerto` y
// `rival`/`caida` empatan): `debut` primero — es un hito único e irrepetible
// de la carrera, `main_muerto` puede volver a salir cualquier año.
const CANDIDATOS = [
  ['titulo_internacional', candidatoTituloInternacional],
  ['papel_internacional', candidatoPapelInternacional],
  ['titulo_liga', candidatoTituloLiga],
  ['golpe_duro', candidatoGolpeDuro],
  ['traicion', candidatoTraicion],
  ['copa_amateur', candidatoCopaAmateur],
  ['volve_a_casa', candidatoVolveACasa],
  ['primer_mundial', candidatoPrimerMundial],
  ['final_perdida', candidatoFinalPerdida],
  ['afuera_en_el_swiss', candidatoAfueraEnElSwiss],
  ['rival_trapo', candidatoRivalTrapo],
  ['ausencia', candidatoAusencia],
  ['primera_firma', candidatoPrimeraFirma],
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
  let elegido = { titular: redaccion(ctx, 'estable', ['UN AÑO MÁS EN LA GRIETA', 'OTRA TEMPORADA DE SCRIMS Y TABLA', 'UN AÑO SIN SOBRESALTOS']), bajada: null };
  let puntaje = PUNTAJES.estable;
  for (const [candidatoTipo, fn] of CANDIDATOS) {
    if (PUNTAJES[candidatoTipo] <= puntaje) {
      continue;
    }
    const candidato = fn(state, ctx);
    // Un candidato puede declarar un puntaje propio por debajo del techo de su tipo (el papel internacional).
    const puntajeCandidato = candidato?.puntaje ?? PUNTAJES[candidatoTipo];
    if (candidato && puntajeCandidato > puntaje) {
      tipoBase = candidatoTipo;
      elegido = { titular: candidato.titular, bajada: candidato.bajada };
      puntaje = puntajeCandidato;
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
    tipo, tipoBase, titular: `${prefijo}${elegido.titular}`, bajada: elegido.bajada, mainMuerto: Boolean(ctx.mainMuerto),
    marcas: marcasDelCierre(state)
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
    // K6a-U: el rango ("Platino III · 33 LP"), no los puntos absolutos de la escalera ("2019 LP"), que no significan nada.
    return { icono: '🏆', texto: `SoloQ: ${etiquetaDeRanked(state.player.ranked, servidorDeLaPartida(state))}. Todavía sin equipo profesional.` };
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
    texto: `${state.career.currentOrg} terminó ${state.career.posicion}º de ${equipos} en ${ctx.liga ? nombreVisibleDeLiga(ctx.liga.id) : 'la liga'}${campeon}`
  };
}

function vinetaInternacional(ctx) {
  if (!ctx.internacionalEsteAnio) {
    return { icono: '🌍', texto: 'Sin internacional este año.' };
  }
  return {
    icono: '🌍',
    texto: esBuenPapel(ctx.internacionalEsteAnio)
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
  const quien = `${archirrival.handle} (${archirrival.org ?? 'sin equipo'})`;
  // K6a-U (regla 15): con 0-0 "vas ganando el duelo" salía todos los años. Empate no es ir ganando: se dice lo que hay.
  if (tuyos === 0 && suyos === 0) {
    return { icono: '⚡', texto: `${quien}: ninguno de los dos ganó un trofeo todavía.` };
  }
  const ventaja = tuyos > suyos ? 'vas ganando el duelo' : (tuyos < suyos ? 'te lleva ventaja' : 'el duelo está parejo');
  return {
    icono: '⚡',
    texto: `${quien}: ${suyos} ${plural(suyos, 'trofeo', 'trofeos')} contra tus ${tuyos} (títulos y Mundiales ganados) — ${ventaja}.`
  };
}

function vinetaMeta(state, ctx) {
  // G4a (D114): "te dejó sin X" es lo que pasó el año del parche; el año siguiente la marca sigue prendida pero ya no es noticia.
  if (ctx.mainMuerto && !ctx.anioAnterior?.mainMuerto) {
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
  // K6b-U: sin equipo no hay tabla ni contrato que mirar: la viñeta de equipo dice "Sin equipo" y esta no puede hablar de
  // playoffs o de un contrato (`career.posicion` y `contrato.org` quedan del club que se fue).
  if (!state.career.currentOrg) {
    return { icono: '🎀', texto: 'Sin equipo: el año que viene, a esperar la llamada de un club en la pretemporada.' };
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
