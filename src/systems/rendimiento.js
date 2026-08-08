import { gauss, chance } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { clamp, clampStat } from '../core/numeros.js';
import { multiplicadorDeMeta } from '../core/ajusteMeta.js';
import { registrarEnHistorial } from '../core/contexto.js';
import { ligaOZonaDeCarrera } from '../core/competicion.js';
import { BALANCE } from '../data/balance.js';
import { ROLES } from '../data/roles.js';

export const id = 'rendimiento';

// Rendimiento personal del split: la hoja de atributos ponderada por rol,
// corrida por el ajuste al meta, la maestria del campeon que TERMINASTE
// jugando, la sinergia del roster, la jerarquia y ruido gaussiano.
function calcularRendimiento(state, rng) {
  const r = BALANCE.rendimiento;
  const { pesos } = ROLES[state.player.role];

  const base = Object.entries(pesos).reduce((suma, [stat, peso]) => suma + state.player.stats[stat] * peso, 0);

  const campeon = state.player.championPool.find((c) => c.name === state.player.campeonDelSplit);
  const factorMaestria = 1 + ((campeon?.mastery ?? BALANCE.stats.max / 2) / BALANCE.stats.max - 0.5) * r.maestriaPesoEnRendimiento * 2;
  const factorSinergia = 1 + (state.career.sinergia / BALANCE.stats.max - 0.5) * r.sinergiaPesoEnRendimiento * 2;
  const factorJerarquia = 1 + (state.career.jerarquia / BALANCE.stats.max - 0.5) * r.jerarquiaPesoEnRendimiento * 2;

  const bruto = base
    * multiplicadorDeMeta(state.meta.ajuste)
    * factorMaestria
    * factorSinergia
    * factorJerarquia
    + gauss(0, r.ruidoRendimiento, rng);

  return clampStat(bruto);
}

// El equipo es sus companeros mas vos. Cuanto mas peso tenes en el resultado,
// mas te sube y te baja la jerarquia lo que pase.
function fuerzaDelEquipo(state, rendimiento) {
  const r = BALANCE.rendimiento;
  const nivelCompaneros = state.career.companeros.reduce((suma, c) => suma + c.nivel, 0)
    / Math.max(1, state.career.companeros.length);

  const bruto = nivelCompaneros * (1 - r.pesoJugadorEnEquipo) + rendimiento * r.pesoJugadorEnEquipo;
  return bruto * (1 + (state.career.sinergia / BALANCE.stats.max - 0.5) * r.sinergiaPesoEnRendimiento);
}

function posicionEnLaLiga(state, fuerza, rng) {
  const liga = ligaOZonaDeCarrera(state);
  const rivales = liga.orgs.filter((org) => org.nombre !== state.career.currentOrg);

  // Cada rival tira su propio split: los favoritos ganan mas seguido, no siempre.
  const porEncima = rivales.filter((org) => gauss(org.fuerza, BALANCE.rendimiento.ruidoRival, rng) > fuerza).length;

  return { posicion: porEncima + 1, equipos: liga.orgs.length, liga };
}

function consecuencias(state, rendimiento, resultado, esCierreDeTemporada, rng) {
  const r = BALANCE.rendimiento;
  const { posicion, equipos, liga } = resultado;
  const logs = [];

  // El titulo se levanta cuando cierra la temporada, no en cada split: los
  // splits intermedios son regular season y dejan posicion, no trofeo.
  const campeon = posicion === 1 && esCierreDeTemporada;
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

  // `nombreLiga` cubre el tier 3: ahí no hay una liga real que nombrar (fase 3).
  const nombreLiga = liga.nombreLiga ?? liga.id;

  logs.push(crearLog(
    'rendimiento',
    `${state.career.currentOrg} terminó ${posicion}º de ${equipos} en ${nombreLiga}. `
    + `Tu rendimiento: ${Math.round(rendimiento)}/100 con ${state.player.campeonDelSplit}. Jerarquía ${Math.round(jerarquia)}.`
  ));

  if (campeon) {
    titulos += 1;
    hitos.push(`Campeón de ${nombreLiga} a los ${state.age}`);
    logs.push(crearLog('rendimiento', `Campeones de ${nombreLiga}. El título es tuyo también.`));
  }

  // Al cierre de temporada, el campeon de la liga viaja al internacional. Solo
  // las ligas tier 1 declaran cupos: tier 2 y tier 3 nunca clasifican (fase 3).
  const cuposInternacionales = liga.cuposInternacionales ?? 0;
  if (esCierreDeTemporada && posicion <= cuposInternacionales) {
    internacionales += 1;
    worlds += 1;
    const rendiBien = chance(clamp(liga.prestigio / (r.prestigioReferencia * 2) + rendimiento / (BALANCE.stats.max * 3), 0, 0.9), rng);
    hype += rendiBien ? r.hypePorTitulo : r.hypePorPodio;
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

  const rendimiento = calcularRendimiento(state, rng);
  const fuerza = fuerzaDelEquipo(state, rendimiento);
  const resultado = posicionEnLaLiga(state, fuerza, rng);
  const esCierreDeTemporada = (state.player.splitCount + 1) % BALANCE.edad.splitsPorEdad === 0;

  return consecuencias(state, rendimiento, resultado, esCierreDeTemporada, rng);
}
