import { gauss, chance, roll } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { clamp, clampStat } from '../core/numeros.js';
import { registrarEnHistorial } from '../core/contexto.js';
import { ligaOZonaDeCarrera } from '../core/competicion.js';
import { esCierreDeTemporada } from '../core/serie.js';
import { rendimientoBase, fuerzaDelEquipo } from '../core/fuerza.js';
import { registrarTitulo, registrarInternacional, registrarPico, registrarArraigoEnFila } from '../core/registro.js';
import { BALANCE } from '../data/balance.js';
import { ROLES } from '../data/roles.js';

export const id = 'rendimiento';

// Fase 4 (systems/serie.js) y fase 5 (systems/temporada.js) importan
// `fuerzaDelEquipo` desde acá: se re-exporta para no cambiar ningún llamador
// cuando la fórmula se mudó a `core/fuerza.js` (9Rc).
export { fuerzaDelEquipo };

// Rendimiento personal del split: la hoja de atributos ponderada por rol,
// corrida por el ajuste al meta, la maestria del campeon que TERMINASTE
// jugando, la sinergia del roster, la jerarquia y ruido gaussiano.
//
// Se exporta: la fase 4 (systems/serie.js) reusa exactamente esta formula para
// resolver cada mapa de una serie, sobreescribiendo campeonDelSplit con el
// campeon elegido en el draft de la serie, y la fase 5 (systems/temporada.js)
// la llama una vez por split para fijar la fuerza con la que se juega el
// calendario entero. No se reescribe la formula.
export function calcularRendimiento(state, rng) {
  // Fase 9Rc: la parte determinista se calcula en `core/fuerza.js`
  // (`rendimientoBase`, la MISMA fórmula extraída para que el draft la mire sin
  // el ruido). Acá solo se le suma el gaussiano y se clampea una vez — un solo
  // `gauss`, en el mismo orden que antes: el stream de RNG no se corre.
  return clampStat(rendimientoBase(state) + gauss(0, BALANCE.rendimiento.ruidoRendimiento, rng));
}

function consecuencias(state, rendimiento, resultado, esCierre, rng) {
  const r = BALANCE.rendimiento;
  const { posicion, equipos, liga } = resultado;
  const logs = [];

  // Tier 1 con formatoPlayoffs (fase 4) juega una serie de verdad: el título y
  // el internacional los decide `systems/serie.js`, que corre a continuación
  // en el registro. Acá solo queda la posición de temporada regular. Tier 2 y
  // tier 3 (sin bracket modelado) siguen resolviendo el título al instante,
  // como siempre.
  const juegaSerieDePlayoffs = liga.tier === 1 && Boolean(liga.formatoPlayoffs);

  // El titulo se levanta cuando cierra la temporada, no en cada split: los
  // splits intermedios son regular season y dejan posicion, no trofeo.
  const campeon = !juegaSerieDePlayoffs && posicion === 1 && esCierre;
  const podio = posicion <= Math.max(2, Math.round(equipos * 0.34));
  const fracaso = posicion > equipos * r.posicionFracaso;

  let hype = state.player.stats.hype - r.hypeDecaimiento;
  hype += (campeon ? r.hypePorTitulo : podio ? r.hypePorPodio : 0) * ROLES[state.player.role].visibilidad;
  hype += (rendimiento - BALANCE.stats.max / 2) * r.hypePorRendimiento * ROLES[state.player.role].visibilidad;

  let mentalidad = state.player.stats.mentalidad
    + (campeon ? r.mentalidadPorTitulo : podio ? r.mentalidadPorPodio : fracaso ? r.mentalidadPorFracaso : 0);

  // La jerarquia se mueve por la distancia entre lo que rendiste y lo que se
  // esperaba de vos. Y lo que se espera crece con tu propia jerarquia: a la
  // franquicia del equipo no le alcanza con rendir como uno mas. Por eso el
  // bucle de CONCEPTO §7 empuja en las dos direcciones y no se clava arriba.
  const nivelEquipo = state.career.companeros.reduce((suma, c) => suma + c.nivel, 0)
    / Math.max(1, state.career.companeros.length);
  const esperado = nivelEquipo * (BALANCE.roster.exigenciaBase
    + (state.career.jerarquia / BALANCE.stats.max) * BALANCE.roster.exigenciaPorJerarquia);
  const brecha = (rendimiento - esperado) / BALANCE.roster.jerarquiaReferenciaRendimiento;
  const jerarquia = clampStat(
    state.career.jerarquia + brecha * BALANCE.roster.jerarquiaVelocidad * BALANCE.stats.max / 10
    + gauss(0, BALANCE.roster.jerarquiaRuido, rng)
  );

  let titulos = state.career.titulos;
  let internacionales = state.career.internacionales;
  let worlds = state.player.worlds;
  const hitos = [...state.career.hitos];

  // Arraigo (fase 8.4): rendir por encima de lo esperado suma via la MISMA
  // `brecha` que ya mueve la jerarquia; un split de fracaso lo cobra. El
  // título y el internacional suman aparte, más abajo, cuando de verdad
  // pasan (acá tier 2/tier 3 sin bracket; tier 1 con playoffs lo hace
  // `serie.js`, que corre a continuación en el registro).
  const a = BALANCE.arraigo;
  let registro = state.career.registro;
  let arraigo = clampStat(state.career.arraigo + brecha * a.factorBrechaRendimiento
    + (fracaso ? roll(a.porFracasoMin, a.porFracasoMax, rng) : 0));

  // `nombreLiga` cubre el tier 3: ahí no hay una liga real que nombrar (fase 3).
  const nombreLiga = liga.nombreLiga ?? liga.id;

  logs.push(crearLog(
    'rendimiento',
    `${state.career.currentOrg} terminó ${posicion}º de ${equipos} en ${nombreLiga}. `
    + `Tu rendimiento: ${Math.round(rendimiento)}/100 con ${state.player.campeonDelSplit}. Jerarquía ${Math.round(jerarquia)}.`
  ));

  if (campeon) {
    titulos += 1;
    arraigo = clampStat(arraigo + roll(a.porTituloMin, a.porTituloMax, rng));
    registro = registrarTitulo(registro, { nombre: nombreLiga, anio: state.calendario.anio, org: state.career.currentOrg });
    hitos.push(`Campeón de ${nombreLiga} a los ${state.age}`);
    logs.push(crearLog('rendimiento', `Campeones de ${nombreLiga}. El título es tuyo también.`));
  }

  // Al cierre de temporada, el campeon de la liga viaja al internacional. Solo
  // las ligas tier 1 declaran cupos: tier 2 y tier 3 nunca clasifican (fase 3).
  // Tier 1 con playoffs lo resuelve `serie.js` jugando la serie internacional.
  const cuposInternacionales = liga.cuposInternacionales ?? 0;
  if (!juegaSerieDePlayoffs && esCierre && posicion <= cuposInternacionales) {
    internacionales += 1;
    worlds += 1;
    const rendiBien = chance(clamp(liga.prestigio / (r.prestigioReferencia * 2) + rendimiento / (BALANCE.stats.max * 3), 0, 0.9), rng);
    hype += rendiBien ? r.hypePorTitulo : r.hypePorPodio;
    arraigo = clampStat(arraigo + roll(a.porInternacionalMin, a.porInternacionalMax, rng));
    registro = registrarInternacional(registro, {
      torneo: `internacional — ${nombreLiga}`, anio: state.calendario.anio, org: state.career.currentOrg,
      resultado: rendiBien ? 'buen_papel' : 'eliminado', camino: []
    });
    hitos.push(rendiBien
      ? `Buen papel internacional con ${state.career.currentOrg} a los ${state.age}`
      : `Eliminado en fase de grupos a los ${state.age}`);
    logs.push(crearLog(
      'rendimiento',
      rendiBien
        ? 'Viajaste al internacional y diste la cara: se habló de vos afuera de tu región.'
        : 'Viajaste al internacional y volviste temprano. Pasa.'
    ));
  }

  registro = registrarPico(registrarPico(registro, 'jerarquia', Math.round(jerarquia)), 'arraigo', Math.round(arraigo));
  registro = registrarArraigoEnFila(registrarPico(registro, 'hype', Math.round(clampStat(hype))), Math.round(arraigo));

  // "Cómo te fue" para el momentum: 100 si salieron primeros, 0 si últimos.
  const puntajeDelSplit = (1 - (posicion - 1) / Math.max(1, equipos - 1)) * BALANCE.stats.max;

  const nextState = registrarEnHistorial({
      ...state,
      player: {
        ...state.player,
        worlds,
        titles: titulos,
        stats: { ...state.player.stats, hype: clampStat(hype), mentalidad: clampStat(mentalidad) }
      },
      career: {
        ...state.career,
        jerarquia: Math.round(jerarquia),
        arraigo: Math.round(arraigo),
        registro,
        posicion,
        titulos,
        podios: state.career.podios + (podio ? 1 : 0),
        internacionales,
        hitos
      }
  }, puntajeDelSplit);

  return { state: nextState, logs };
}

export function aplicar(state, rng) {
  if (state.phase !== 'profesional' || !state.career.currentOrg || state.career.companeros.length === 0) {
    return { state, logs: [] };
  }

  // La fase 5 movió la resolución de la temporada regular a `systems/temporada.js`,
  // que corre justo antes en el registro (`registro.js`) y deja la posición y el
  // rendimiento que la produjo en `career.temporada`. Esto ya no vuelve a tirar
  // el split: solo lee el resultado y aplica sus consecuencias.
  const t = state.career.temporada;
  const liga = ligaOZonaDeCarrera(state);
  const resultado = { posicion: t.posicion ?? 1, equipos: t.tabla.length || (liga?.orgs.length ?? 1), liga };

  return consecuencias(state, t.rendimiento, resultado, esCierreDeTemporada(state.player.splitCount), rng);
}
