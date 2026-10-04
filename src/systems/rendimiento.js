import { gauss, chance, roll } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { clampStat, hashCadena } from '../core/numeros.js';
import { registrarEnHistorial } from '../core/contexto.js';
import { ligaOZonaDeCarrera } from '../core/competicion.js';
import { esCierreDeTemporada } from '../core/serie.js';
import { fuerzaDelEquipo, nivelDeCompaneros } from '../core/fuerza.js';
import { registrarTitulo, registrarPico, registrarArraigoEnFila } from '../core/registro.js';
import { nivelDelJugador } from '../core/ficha.js';
import { hypeHaciaSuBase } from '../core/barras.js';
import { BALANCE } from '../data/balance.js';
import { ROLES } from '../data/roles.js';
import { nombreVisibleDeLigaOZona } from '../core/ligas.js';

export const id = 'rendimiento';

// Fase 4 (systems/serie.js) y fase 5 (systems/temporada.js) importan
// `fuerzaDelEquipo` desde acá: se re-exporta para no cambiar ningún llamador
// cuando la fórmula se mudó a `core/fuerza.js` (9Rc).
export { fuerzaDelEquipo };

// K2b: `calcularRendimiento` (el rendimiento del split = base + un `gauss` de
// σ 7) se borró. La fuerza de partido es determinista (`core/fuerza.js`,
// `fuerzaDePartido`) y el rendimiento del split que leen estas consecuencias lo
// cuentan tus partidos de temporada regular (`career.temporada.rendimiento`,
// escrito por `systems/temporada.js` con `rendimientoDeLaTemporada`).

// Fase 9R0d: 2 de cada 3 splits no son de playoffs, y cerraban con una sola
// línea `[rendimiento]` — "terminó 4º de 10" sin decir qué significa ese 4º.
// El usuario lo leyó como "los 3 splits no sirven para nada, clasificar es un
// cartel". Esto le pone al cierre de CADA split competitivo una frase de qué
// hay en juego. No promete lo que el motor no cumple: en tier 2/3 no hay
// bracket (fase 4), así que ahí es posición + momentum, no playoffs. Varias
// variantes por banda, elegidas de forma determinista (sin tocar el `rng`),
// para que un jugador dominante en una liga chica no lea "arriba de todo"
// diez splits seguidos. El hash determinista vive en core/numeros.js desde 9R.3.

const PARADA_ZONA = {
  dentro: [
    (p, n, l) => `Cerrás el split ${p}º de ${n}: dentro de la zona de playoffs de ${l} por ahora.`,
    (p, n, l) => `${p}º de ${n} en ${l}: el split cierra con lugar de playoffs.`,
    (p, n, l) => `Terminás ${p}º de ${n}: hoy jugarías los playoffs de ${l}.`,
    (p, n, l) => `${p}º de ${n}: adentro de la zona, sin margen para relajarse.`
  ],
  fuera: [
    (p, n, l, k) => `Cerrás el split ${p}º de ${n}: a ${k} de la zona de playoffs de ${l}.`,
    (p, n, l, k) => `${p}º de ${n} en ${l}: te faltan ${k} puesto${k === 1 ? '' : 's'} para los playoffs.`,
    (p, n, l, k) => `Terminás ${p}º de ${n}: la zona de playoffs queda a ${k} de distancia.`,
    (p, n, l, k) => `${p}º de ${n}: afuera de playoffs por ${k}, hay que apretar.`
  ]
};

const PARADA_TABLA = {
  arriba: [
    (p, n, l) => `Cerrás el split ${p}º de ${n}: arriba de todo en ${l}.`,
    (p, n, l) => `${p}º de ${n} en ${l}: nadie te movió de la punta.`,
    (p, n, l) => `Terminás ${p}º de ${n}: cerrás el split como el equipo a vencer de ${l}.`,
    (p, n, l) => `${p}º de ${n}: dominás ${l} de arriba a abajo.`
  ],
  media: [
    (p, n, l) => `Cerrás el split ${p}º de ${n}: en la mitad de la tabla de ${l}.`,
    (p, n, l) => `${p}º de ${n} en ${l}: ni arriba ni abajo, a mejorar.`,
    (p, n, l) => `Terminás ${p}º de ${n}: un split del montón en ${l}.`,
    (p, n, l) => `${p}º de ${n}: quedás a mitad de camino en ${l}.`
  ],
  abajo: [
    (p, n, l) => `Cerrás el split ${p}º de ${n}: peleando en la parte baja de ${l}.`,
    (p, n, l) => `${p}º de ${n} en ${l}: el split se sufrió de abajo.`,
    (p, n, l) => `Terminás ${p}º de ${n}: hay que levantar, ${l} no perdona.`,
    (p, n, l) => `${p}º de ${n}: mal split, quedás en el fondo de ${l}.`
  ]
};

function variantePorSemilla(lista, semilla) {
  return lista[hashCadena(semilla) % lista.length];
}

function textoDeParadaEnLaTabla(nombreLiga, liga, posicion, equipos, esCierre, juegaSerie, splitCount) {
  // La semilla de la variante sigue siendo el id de la liga (no su nombre visible): cambiar cómo se ve no cambia cuál se elige.
  const claveDeLiga = liga.nombreLiga ?? liga.id;
  if (juegaSerie) {
    const corte = liga.formatoPlayoffs.clasifican;
    // El split de cierre que clasifica lo narra `serie.js` con su propia
    // fanfarria ("Clasificaste a playoffs de X como Nº sembrado…"): no se
    // duplica acá.
    if (esCierre && posicion <= corte) {
      return null;
    }
    if (esCierre) {
      const faltan = posicion - corte;
      return `Cerrás ${posicion}º de ${equipos} en ${nombreLiga}: afuera de los playoffs por ${faltan} puesto${faltan === 1 ? '' : 's'}.`;
    }
    if (posicion <= corte) {
      return variantePorSemilla(PARADA_ZONA.dentro, `dentro|${claveDeLiga}|${splitCount}`)(posicion, equipos, nombreLiga);
    }
    return variantePorSemilla(PARADA_ZONA.fuera, `fuera|${claveDeLiga}|${splitCount}`)(posicion, equipos, nombreLiga, posicion - corte);
  }

  const banda = posicion <= 2 ? 'arriba' : posicion <= Math.ceil(equipos / 2) ? 'media' : 'abajo';
  return variantePorSemilla(PARADA_TABLA[banda], `${banda}|${claveDeLiga}|${splitCount}`)(posicion, equipos, nombreLiga);
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
  // K6a-M (D-B: toda final frena, en tier 1 y en tier 2): tier 2 también define el título en una serie, la final entre
  // los dos primeros (`formatoPlayoffs.arranca`, leagues.json); en el ensayo de K6 dos títulos de LRS llegaron por la
  // tabla sin una sola parada. El tier 3 (una zona, sin formato) sigue con el título al instante.
  const juegaSerieDePlayoffs = Boolean(liga.formatoPlayoffs);

  // El titulo se levanta cuando cierra la temporada, no en cada split: los
  // splits intermedios son regular season y dejan posicion, no trofeo.
  const campeon = !juegaSerieDePlayoffs && posicion === 1 && esCierre;
  const podio = posicion <= Math.max(2, Math.round(equipos * 0.34));
  const fracaso = posicion > equipos * r.posicionFracaso;

  // K3-A: el hype da un paso hacia su base (resultados + visibilidad,
  // `core/barras.js#baseDeHype`) antes del decaimiento fijo de siempre.
  let hype = hypeHaciaSuBase(state.player.stats.hype, state, liga) - r.hypeDecaimiento;
  hype += (campeon ? r.hypePorTitulo : podio ? r.hypePorPodio : 0) * ROLES[state.player.role].visibilidad;
  hype += (rendimiento - BALANCE.stats.max / 2) * r.hypePorRendimiento * ROLES[state.player.role].visibilidad;

  let mentalidad = state.player.stats.mentalidad
    + (campeon ? r.mentalidadPorTitulo : podio ? r.mentalidadPorPodio : fracaso ? r.mentalidadPorFracaso : 0);

  // La jerarquia se mueve por la distancia entre lo que rendiste y lo que se
  // esperaba de vos. Y lo que se espera crece con tu propia jerarquia: a la
  // franquicia del equipo no le alcanza con rendir como uno mas. Por eso el
  // bucle de CONCEPTO §7 empuja en las dos direcciones y no se clava arriba.
  // K2b: el nivel del equipo es el MISMO que usó la fuerza (`nivelDeCompaneros`,
  // en vivo en las ligas modeladas).
  const nivelEquipo = nivelDeCompaneros(state);
  const esperado = nivelEquipo * (BALANCE.roster.exigenciaBase
    + (state.career.jerarquia / BALANCE.stats.max) * BALANCE.roster.exigenciaPorJerarquia);
  const brecha = (rendimiento - esperado) / BALANCE.roster.jerarquiaReferenciaRendimiento;
  let jerarquia = clampStat(
    state.career.jerarquia + brecha * BALANCE.roster.jerarquiaVelocidad * BALANCE.stats.max / 10
    + gauss(0, BALANCE.roster.jerarquiaRuido, rng)
  );

  let titulos = state.career.titulos;
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

  // Fase 9Mf: el banquillo. Si tu nivel cayó bien por debajo del plantel —el
  // suplente que el club tiene o puede fichar— y encima el split fue flojo,
  // podés perder la titularidad: la jerarquía se derrumba y la pretemporada te
  // cede a la liga de desarrollo (`systems/mercado.js` consume el flag). Es la
  // puerta al declive de la que la fase 10 saca el retiro (CONCEPTO §12.4). El
  // `chance` sólo se consume en un split flojo de un jugador ya descolgado:
  // corre el stream poco (D35).
  const mkt = BALANCE.mercado;
  let banquilloPendiente = state.flags.banquilloPendiente ?? false;
  const enTierConPlantel = state.career.tier === 1 || state.career.tier === 2;
  if (enTierConPlantel && !banquilloPendiente && fracaso
    && nivelDelJugador(state) < nivelEquipo - mkt.umbralBanquillo
    && chance(mkt.probBanquilloPorBrecha, rng)) {
    banquilloPendiente = true;
    jerarquia = clampStat(jerarquia * mkt.banquilloJerarquiaFactor);
    arraigo = clampStat(arraigo * mkt.banquilloArraigoFactor);
    logs.push(crearLog('mercado',
      `Te mandan al banco: tu nivel quedó por debajo del suplente. `
      + `En la próxima ventana ${state.career.currentOrg} te cede a su academia.`));
  }

  // `nombreLiga` cubre el tier 3: ahí no hay una liga real que nombrar (fase 3).
  const nombreLiga = nombreVisibleDeLigaOZona(liga);

  logs.push(crearLog(
    'rendimiento',
    `${state.career.currentOrg} terminó ${posicion}º de ${equipos} en ${nombreLiga}. `
    + `Tu rendimiento: ${Math.round(rendimiento)}/100 con ${state.player.campeonDelSplit}. Jerarquía ${Math.round(jerarquia)}.`
  ));

  // Fase 9R0d: qué significa esa posición — para que el split no muera en un
  // recibo numérico.
  const paradaEnTabla = textoDeParadaEnLaTabla(
    nombreLiga, liga, posicion, equipos, esCierre, juegaSerieDePlayoffs, state.player.splitCount
  );
  if (paradaEnTabla) {
    logs.push(crearLog('temporada', paradaEnTabla));
  }

  if (campeon) {
    titulos += 1;
    arraigo = clampStat(arraigo + roll(a.porTituloMin, a.porTituloMax, rng));
    // K1 (D76): la liga real (`null` en tier 3, que es una zona y no una liga)
    // y el tier donde se ganó, no el de la fila.
    registro = registrarTitulo(registro, {
      nombre: nombreLiga, anio: state.calendario.anio, org: state.career.currentOrg,
      liga: liga.tier === 3 ? null : liga.id, tier: liga.tier
    });
    hitos.push(`Campeón de ${nombreLiga} a los ${state.age}`);
    logs.push(crearLog('rendimiento', `Campeones de ${nombreLiga}. El título es tuyo también.`));
  }

  registro = registrarPico(registrarPico(registro, 'jerarquia', Math.round(jerarquia)), 'arraigo', Math.round(arraigo));
  registro = registrarArraigoEnFila(registrarPico(registro, 'hype', Math.round(clampStat(hype))), Math.round(arraigo));

  // "Cómo te fue" para el momentum: 100 si salieron primeros, 0 si últimos.
  const puntajeDelSplit = (1 - (posicion - 1) / Math.max(1, equipos - 1)) * BALANCE.stats.max;

  const nextState = registrarEnHistorial({
      ...state,
      flags: { ...state.flags, banquilloPendiente },
      player: {
        ...state.player,
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
