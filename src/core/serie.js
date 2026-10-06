import { weightedPick } from './rng.js';
import { campeonesEnMeta, factorDeCampeon } from './ajusteMeta.js';
import { campeonesDisponibles, entradaDePool } from './pool.js';
import { fuerzaDePartido, jerarquiaNoCuentaEn } from './fuerza.js';
import { probabilidadDePartido } from './partido.js';
import { BALANCE } from '../data/balance.js';

// La mecánica de la serie de playoffs (fase 4): Bo5 con Fearless draft, jugada
// mapa a mapa. Todo lo que vive acá es puro (salvo lo que recibe `rng` por
// parámetro): `systems/serie.js` es el único que muta estado.
//
// Simplificación deliberada, documentada en PROGRESO: las 6 ligas tier 1 usan
// doble eliminación real en 2026 (hay bracket de perdedores); acá se modela
// eliminación simple de 6 clasificados con bye para los 2 mejores sembrados,
// porque el motor solo simula TU camino, nunca el resto del bracket.

// Misma fórmula que usa rendimiento.js para saber si el split que está por
// cerrar es el último de la edad (regular season) — la comparten para no
// duplicarla y que las dos lecturas de "cierre de temporada" no diverjan.
export function esCierreDeTemporada(splitCount) {
  return (splitCount + 1) % BALANCE.edad.splitsPorEdad === 0;
}

export function calificaAPlayoffs(liga, posicion) {
  return Boolean(liga?.formatoPlayoffs) && posicion <= liga.formatoPlayoffs.clasifican;
}

export function calificaAInternacional(liga, posicion) {
  return posicion <= (liga?.cuposInternacionales ?? 0);
}

// El bracket es de eliminación simple: los dos mejores sembrados saltan
// directo a semifinal, el resto arranca en cuartos. K6a-M: un formato con `arranca` (la final de tier 2, que juegan los
// `clasifican` de arriba) entra directo en esa ronda.
export function rondaInicial(posicion, formatoPlayoffs) {
  if (formatoPlayoffs.arranca) {
    return posicion <= formatoPlayoffs.clasifican ? formatoPlayoffs.arranca : null;
  }
  if (posicion <= formatoPlayoffs.byes) {
    return 'semis';
  }
  if (posicion <= formatoPlayoffs.clasifican) {
    return 'cuartos';
  }
  return null;
}

const ORDEN_RONDAS = ['cuartos', 'semis', 'final'];

export function siguienteRonda(ronda) {
  const indice = ORDEN_RONDAS.indexOf(ronda);
  if (indice < 0 || indice === ORDEN_RONDAS.length - 1) {
    return null;
  }
  return ORDEN_RONDAS[indice + 1];
}

// K5-A: una serie del Mundial es `ronda: 'internacional'` con su `etapa` del bracket.
const ETIQUETAS_DEL_MUNDIAL = { cuartos: 'Cuartos del Mundial', semis: 'Semifinal del Mundial', final: 'La final del Mundial' };

export function etiquetaDeRonda(ronda, etapa = null) {
  if (ronda === 'internacional' && etapa) {
    return ETIQUETAS_DEL_MUNDIAL[etapa] ?? 'El Mundial';
  }
  const etiquetas = { cuartos: 'Cuartos de final', semis: 'Semifinal', final: 'La final', internacional: 'El Mundial' };
  return etiquetas[ronda] ?? ronda;
}

// El rival de la ronda: otra org de la misma liga, pesada por fuerza (más
// fuerte, más probable que sea quien te toque en una fase alta).
// K5-A: el rival del Mundial ya no se sortea acá: lo pone el torneo (`core/internacional.js`).
export function generarRival(state, ronda, rng) {
  const liga = state.mundo.ligas.find((candidata) => candidata.id === state.career.liga);
  // Guarda defensiva, no alcanzada hoy (medido: 0/300 seeds × 60 splits).
  // D.3 hace que `career.liga` pueda ser null en caminos adyacentes
  // (free agency); un rival doméstico sin liga no debería existir. Si este
  // camino se alcanza, el invariante está roto — ruidoso, no un rival fantasma.
  if (!liga) {
    throw new Error(
      `generarRival: no hay liga doméstica para ronda=${ronda} `
      + `(career.liga=${JSON.stringify(state.career.liga)}, `
      + `currentOrg=${JSON.stringify(state.career.currentOrg)})`
    );
  }
  const rivales = liga.orgs.filter((org) => org.nombre !== state.career.currentOrg);
  const org = weightedPick(rivales, (candidata) => candidata.fuerza, rng);
  return { org: org.nombre, fuerza: org.fuerza };
}

// --- Fearless draft ---

export function disponiblesDelPool(pool, quemados) {
  return pool.filter((campeon) => !quemados.includes(campeon.name));
}

// K4-B: el rival no sortea. Quema (juega en tu línea) el campeón de tu rol que el meta más pide entre los que
// siguen libres, igual que vos salís con el mejor que te queda: así su fuerza también se degrada con el Fearless
// (`fuerzaRivalDeMapa`). Determinista: es lo que deja que el plan declare su p por mapa antes de jugarlo (regla 15).
// Lo único que el rival hace fuera de este orden es leerte el campeón que guardás (`plan.pLeenElGuardado`, que tira
// `systems/serie.js` y te frena). `null` si no queda ninguno.
export function objetivoDelRival(state, quemados) {
  const delRol = campeonesDisponibles(state, state.player.role);
  const libre = campeonesEnMeta(state.meta.weights, delRol, delRol.length)
    .find((campeon) => !quemados.includes(campeon.name));
  return libre?.name ?? null;
}

// Cuando el Fearless deja el pool en cero, te toca un comodín fuera del pool con maestría mínima (4.5): "el castigo
// del pool angosto". K4-B: el que mejor rinde entre los libres, sin sortear (el plan lo declara antes de jugarlo).
export function campeonComodin(state, quemados) {
  const delRol = campeonesDisponibles(state, state.player.role);
  const usables = delRol.filter((campeon) => !quemados.includes(campeon.name));
  const entradas = usables.map((campeon) => entradaDePool(campeon, BALANCE.serie.maestriaComodin, state.player.splitCount));
  return ordenarPorFactor(entradas, state.meta.weights)[0] ?? null;
}

export function necesitaGanarPara(formato) {
  return Math.ceil(formato / 2);
}

// K4-B: EL MAPA DECISIVO es el que puede cerrar la serie para cualquiera de los dos: los dos equipos en punto de
// partido, el 2-2 de un Bo5 o el 1-1 de un Bo3. Es siempre el último mapa posible de la serie, así que se lee por
// índice (`esMapaDecisivoDeLaSerie`, lo que deja proyectar el plan sin resultados) o por marcador (esta, la de 9R4b),
// y las dos coinciden siempre que el mapa se juega. Un 2-0 no es decisivo: lo puede cerrar uno solo.
export function esMapaDeDesempate(marcador, formato) {
  const punto = necesitaGanarPara(formato) - 1;
  return marcador[0] === punto && marcador[1] === punto;
}

export function esMapaDecisivoDeLaSerie(serie, indice = serie.mapaActual) {
  return indice === serie.formato - 1;
}

export function serieTerminada(marcador, formato) {
  const necesarias = necesitaGanarPara(formato);
  return marcador[0] >= necesarias || marcador[1] >= necesarias;
}

function ordenarPorFactor(campeones, weights) {
  return [...campeones].sort(
    (a, b) => factorDeCampeon(b, weights) - factorDeCampeon(a, weights)
  );
}

// --- K4-B: la serie como plan (PLAN.md "K4 — decisiones de spec", K4-B) ---

export const PLANES_DE_SERIE = ['guardar', 'conTodo', 'sorpresa', 'coach'];

// K6a-M (D-B: los playoffs son lo importante): una serie de eliminación —cuartos, semis y la final domésticas, y el
// bracket del Mundial— nunca se resuelve sola, por más despareja que sea: se juega con el plan de Fearless de siempre.
// Hoy todas las series del motor son de eliminación (los playoffs son de eliminación simple, PLAN.md fase 4).
// K6a-R: "no se resuelve sola" quiere decir que frena en lo que decide: la final y la abierta en el plan, la cantada en
// su mapa decisivo (`cantadaDeLaSerie`).
export function esSerieDeEliminacion(serie) {
  return ORDEN_RONDAS.includes(serie.ronda) || serie.ronda === 'internacional';
}

// Una serie sin nada en juego: la diferencia de fuerza al arrancar supera el umbral. No pregunta: juega el plan del
// coach y no frena en el mapa decisivo. K6a-M: nunca una de eliminación (`esSerieDeEliminacion`).
export function esSerieSinNadaEnJuego(serie) {
  return !esSerieDeEliminacion(serie)
    && Math.abs(serie.fuerzaInicial - serie.rival.fuerza) > BALANCE.serie.plan.umbralSinNadaEnJuego;
}

// K6a-R (PLAN.md, "Decisión del supervisor (K6a-R, el ritmo de la eliminación)"): una serie de eliminación frena en lo
// que decide. Toda final —la doméstica de tier 1, la de tier 2 y la del Mundial— frena siempre en su plan.
export function esFinalDeSerie(serie) {
  return serie.ronda === 'final' || (serie.ronda === 'internacional' && serie.etapa === 'final');
}

// La p de ganar la serie al arrancar con el plan del coach (el neutro): la vara de "abierta" o "cantada".
export function pSerieDelCoach(state) {
  return proyeccionDelPlan(state, 'coach').pSerie;
}

// De qué lado está cantada una p de serie: 'favorito' arriba de 1 − `pAbiertaEliminacion`, 'underdog' abajo de
// `pAbiertaEliminacion`, `null` si está abierta (los bordes cuentan como abierta).
export function ladoCantado(pSerie) {
  const pAbierta = BALANCE.serie.plan.pAbiertaEliminacion;
  if (pSerie > 1 - pAbierta) {
    return 'favorito';
  }
  return pSerie < pAbierta ? 'underdog' : null;
}

// Una serie de eliminación cantada (no una final, con la p del plan del coach fuera de la franja abierta) no frena en
// el plan: lo arma el coach, el feed lo dice, y frena solo en el mapa decisivo si la serie llega. `null` si frena en el
// plan (una final, una abierta) o si no es de eliminación. Se lee al arrancar la serie (marcador 0-0).
export function cantadaDeLaSerie(state) {
  const { serie } = state;
  if (!esSerieDeEliminacion(serie) || esFinalDeSerie(serie)) {
    return null;
  }
  return ladoCantado(pSerieDelCoach(state));
}

// La charla del coach: un comodín por temporada (el año del calendario), que se ofrece en el mapa decisivo.
export function charlaDisponible(state) {
  return state.career.charlaUsadaEn !== state.calendario.anio;
}

// El rival quema el campeón de este mapa: entra a los quemados y es el que juega en tu línea en este mapa.
export function conQuemaDelRival(state, campeonRival) {
  const quemados = campeonRival ? [...state.serie.quemados, campeonRival] : state.serie.quemados;
  return { ...state, serie: { ...state.serie, quemados, rivalJuega: campeonRival, rivalJuegaEnMapa: state.serie.mapaActual } };
}

// La fuerza del rival en el mapa que se juega, con la misma regla que la tuya: su campeón (`rivalJuega`) entra por
// `factorDeCampeon` con una maestría que cae mapa a mapa (su pool también se acaba), y pesa en su equipo lo mismo
// que tu campeón pesa en el tuyo (`pesoJugadorEnEquipo`). En el mapa 1, con el mejor del meta, es `rival.fuerza`.
export function fuerzaRivalDeMapa(state) {
  const { rival, rivalJuega, mapaActual } = state.serie;
  const p = BALANCE.serie.plan;
  const weights = state.meta.weights;
  const delRol = campeonesDisponibles(state, state.player.role);
  const referencia = campeonesEnMeta(weights, delRol, 1)[0];
  if (!referencia) {
    return rival.fuerza;
  }
  const juega = delRol.find((campeon) => campeon.name === rivalJuega);
  const maestria = juega
    ? Math.max(BALANCE.serie.maestriaComodin, p.maestriaRivalTope - mapaActual * p.caidaMaestriaRivalPorMapa)
    : BALANCE.serie.maestriaComodin;
  const split = state.player.splitCount;
  const factor = factorDeCampeon(entradaDePool(juega ?? referencia, maestria, split), weights);
  const factorReferencia = factorDeCampeon(entradaDePool(referencia, p.maestriaRivalTope, split), weights);
  return rival.fuerza * (1 + BALANCE.rendimiento.pesoJugadorEnEquipo * (factor / factorReferencia - 1));
}

// La sorpresa: el campeón de tu pool que el rival no preparó (fuera de los `formato` que más pide el meta), el de
// más maestría. `null` si todo tu pool está en lo que el rival preparó.
function campeonSorpresa(state, disponibles) {
  const delRol = campeonesDisponibles(state, state.player.role);
  const preparados = new Set(campeonesEnMeta(state.meta.weights, delRol, state.serie.formato).map((c) => c.name));
  const fuera = disponibles.filter((campeon) => !preparados.has(campeon.name));
  return [...fuera].sort((a, b) => b.mastery - a.mastery)[0] ?? null;
}

// Qué juega el plan en el mapa que viene, con los quemados de ahora (el del rival en este mapa incluido): el
// campeón, el comodín si hace falta, y cuánto mueve el plan la fuerza de ese mapa (`ajustePlan`, constantes en
// `BALANCE.serie.plan`). Puro y sin `rng`: lo usan el motor (para jugar) y la tarjeta del plan (para declarar).
export function jugadaDelPlan(state) {
  const { serie } = state;
  const p = BALANCE.serie.plan;
  const i = serie.mapaActual;
  const decisivo = esMapaDecisivoDeLaSerie(serie);
  const disponibles = ordenarPorFactor(disponiblesDelPool(state.player.championPool, serie.quemados), state.meta.weights);

  if (disponibles.length === 0) {
    const comodin = campeonComodin(state, serie.quemados);
    return { campeon: comodin.name, entradaExtra: comodin, ajustePlan: 0, motivo: 'comodin' };
  }

  if (serie.plan === 'guardar' && serie.guardado) {
    const guardado = disponibles.find((campeon) => campeon.name === serie.guardado);
    if (guardado && decisivo) {
      return { campeon: guardado.name, entradaExtra: null, ajustePlan: p.empujeGuardado, motivo: 'guardado' };
    }
    const resto = disponibles.filter((campeon) => campeon.name !== serie.guardado);
    return { campeon: (resto[0] ?? disponibles[0]).name, entradaExtra: null, ajustePlan: 0, motivo: 'plan' };
  }

  if (serie.plan === 'conTodo') {
    const ajustePlan = i < p.mapasConTodo ? p.empujeConTodo : -p.desgasteConTodo;
    return { campeon: disponibles[0].name, entradaExtra: null, ajustePlan, motivo: 'plan' };
  }

  if (serie.plan === 'sorpresa' && i === 0) {
    const sorpresa = campeonSorpresa(state, disponibles);
    if (sorpresa) {
      return { campeon: sorpresa.name, entradaExtra: null, ajustePlan: p.empujeSorpresa, motivo: 'sorpresa' };
    }
  }

  return { campeon: disponibles[0].name, entradaExtra: null, ajustePlan: 0, motivo: 'plan' };
}

// La fuerza propia y la p del mapa que viene según el plan (sin charla ni minijuego). ES la p que tira el motor si
// nada lo frena (regla 15).
export function mapaDelPlan(state) {
  const jugada = jugadaDelPlan(state);
  const fuerzaPropia = fuerzaDePartido(estadoDelMapa(state, jugada.campeon, jugada.entradaExtra));
  return { ...jugada, fuerzaPropia, p: probabilidadDeMapa(state, fuerzaPropia, jugada.ajustePlan) };
}

// El guardado de un plan: tu mejor campeón disponible (por `factorDeCampeon`) que llega vivo al mapa decisivo con
// el orden de quemas del rival (`objetivoDelRival`): guardar el que el rival se va a llevar igual no es un plan.
// Sin al menos dos libres, o sin ninguno que llegue, no hay nada que guardar (`null`).
export function guardadoDelPlan(state, plan) {
  if (plan !== 'guardar') {
    return null;
  }
  const disponibles = ordenarPorFactor(disponiblesDelPool(state.player.championPool, state.serie.quemados), state.meta.weights);
  if (disponibles.length < 2) {
    return null;
  }
  const llega = disponibles.find((campeon) => {
    const mapas = proyectarMapas({ ...state, serie: { ...state.serie, plan, guardado: campeon.name } });
    return mapas[mapas.length - 1]?.campeon === campeon.name;
  });
  return llega?.name ?? null;
}

// El estado de la serie con el plan elegido (y su guardado).
export function conPlan(state, plan) {
  return { ...state, serie: { ...state.serie, plan, guardado: guardadoDelPlan(state, plan) } };
}

// La proyección de un plan: mapa por mapa, desde el que viene hasta el decisivo, con la misma secuencia que juega
// el motor (el rival quema, el plan elige, tu campeón queda quemado). Lo único que no proyecta es lo que te frena:
// que el rival te lea el guardado, y la charla y el minijuego del mapa decisivo. `p` de cada mapa es la que tira
// `systems/serie.js`; `pSerie`, la de ganar la serie desde el marcador de ahora con esas p.
export function proyeccionDelPlan(state, plan) {
  const st = conPlan(state, plan);
  const mapas = proyectarMapas(st);
  const ps = mapas.map((m) => m.p);
  return { plan, guardado: st.serie.guardado, mapas, pSerie: probabilidadDeSerie(state.serie.marcador, state.serie.formato, ps) };
}

// El estado del mapa que viene con la quema del rival de ese mapa ya hecha (si todavía no pasó): el que miran la
// previa del plan y la proyección.
export function estadoDelProximoMapa(state) {
  return state.serie.rivalJuegaEnMapa === state.serie.mapaActual
    ? state
    : conQuemaDelRival(state, objetivoDelRival(state, state.serie.quemados));
}

// Los mapas que quedan con el plan y el guardado que `state.serie` ya trae.
function proyectarMapas(state) {
  let st = state;
  const mapas = [];
  for (let i = st.serie.mapaActual; i < st.serie.formato; i += 1) {
    st = estadoDelProximoMapa(st);
    const mapa = mapaDelPlan(st);
    mapas.push({
      mapa: i + 1, campeon: mapa.campeon, rivalJuega: st.serie.rivalJuega, p: mapa.p,
      decisivo: esMapaDecisivoDeLaSerie(st.serie, i)
    });
    st = { ...st, serie: { ...st.serie, quemados: [...st.serie.quemados, mapa.campeon], mapaActual: i + 1 } };
  }
  return mapas;
}

// P(ganar la serie) desde `marcador`, con la p de cada mapa que queda (en orden). Exacta: recorre los marcadores.
export function probabilidadDeSerie(marcador, formato, ps) {
  const necesarias = necesitaGanarPara(formato);
  const desde = (a, b, k) => {
    if (a >= necesarias) {
      return 1;
    }
    if (b >= necesarias) {
      return 0;
    }
    const p = ps[k];
    return p * desde(a + 1, b, k + 1) + (1 - p) * desde(a, b + 1, k + 1);
  };
  return desde(marcador[0], marcador[1], 0);
}

// K2d: el estado con el que se calcula la fuerza de un mapa: el campeón elegido como campeón del partido y, si es el
// comodín fuera del pool (4.5), una copia del pool con su entrada, para que `rendimientoBase` encuentre su maestría
// real y no la neutra. Lo usan el motor (`systems/serie.js`), el plan y la previa.
export function estadoDelMapa(state, campeonElegido, entradaExtra = null) {
  const championPool = entradaExtra ? [...state.player.championPool, entradaExtra] : state.player.championPool;
  return { ...state, player: { ...state.player, campeonDelSplit: campeonElegido, championPool } };
}

// K2d/K4-B: la p de un mapa: la fuerza de partido del campeón elegido, corrida por todo lo que la mueve (`ajuste`:
// el del plan, la charla y el minijuego, sumados), contra la del rival EN ESE MAPA (`fuerzaRivalDeMapa`). ES la p
// que tira `finalizarMapa` y la que muestran el plan y la previa (regla 15).
export function probabilidadDeMapa(state, fuerzaPropia, ajuste = 0) {
  return probabilidadDePartido(state, fuerzaFinalDeMapa(fuerzaPropia, ajuste), fuerzaRivalDeMapa(state), 'mapa');
}

export function fuerzaFinalDeMapa(fuerzaPropia, ajuste = 0) {
  return fuerzaPropia * (1 + ajuste);
}

// K4-B: lo que la charla del coach le suma al ajuste del mapa decisivo.
export function ajusteDeCharla(usada) {
  return usada ? BALANCE.serie.plan.empujeCharla : 0;
}

// K2d: cuánto mueve el minijuego de un mapa la fuerza de ese mapa, según cómo te salió (`resultado` 0-1; 0,5 no la
// mueve). La comparten `systems/serie.js` (que la aplica antes de tirar) y la previa (que muestra la p final).
// K5c-H: en el Mundial con `mundial.jerarquiaCuenta` en false (`jerarquiaNoCuentaEn`), la llamada no se amortigua por
// jerarquía: es lo que dicen la previa y el feed (regla 12), y la fuerza del mapa ya juega sin ella.
export function ajusteDeMinijuegoDeMapa(state, entrada, resultado) {
  const ajusteBase = ajusteBaseDeMinijuego(resultado);
  const amortiguado = entrada.efecto.amortiguador === 'jerarquia' && !jerarquiaNoCuentaEn(state)
    ? factorJerarquiaEnLlamada(state.career.jerarquia)
    : 1;
  return ajusteBase * entrada.impacto * amortiguado;
}

// K2d: el punto medio del minijuego, una sola vez: `resultado` 0-1 (acotado) pasa a un ajuste de -1 a 1, con 0 en el
// 0,5 neutro. Lo usan el mapa (`ajusteDeMinijuegoDeMapa`) y los minijuegos de stats de `systems/serie.js`.
export function ajusteBaseDeMinijuego(resultado) {
  return (Math.min(1, Math.max(0, resultado ?? 0.5)) - 0.5) * 2;
}

// K4c-S: la probabilidad de firmar tras la prueba (tryout). `resultado` 0-1; se interpola entre los tres puntos de
// `serie.probFirmaTryout` sobre el mismo eje que el ajuste del minijuego (-1 es el peor, 0 el regular, 1 el mejor).
// Es una probabilidad, no un corte: un resultado bueno puede no firmar y uno malo puede firmar. La comparten el tryout
// del mercado y el del amateur. Puro, sin `rng`.
export function probabilidadDeFirmarTrasPrueba(resultado) {
  const { malo, regular, bueno } = BALANCE.serie.probFirmaTryout;
  const ajuste = ajusteBaseDeMinijuego(resultado);
  return ajuste < 0 ? regular + (regular - malo) * ajuste : regular + (bueno - regular) * ajuste;
}

// K6c ("pasaste = firmás"): la prueba del amateur no tira dado. `resultado` 0-1 contra la vara, en puntos de porcentaje
// enteros (los mismos que lee el jugador: "necesitás 45%", "te faltó 20%"), así lo que dice la pantalla y lo que decide el
// motor no se separan por un redondeo. La usan `systems/amateur.js` (la oferta, la previa, el contrato y el log) y
// `ui/app.js` (el veredicto): una sola cuenta (regla 15). Puro, sin `rng`.
//
// K6c, segunda pasada ("el nivel manda"): la vara depende de tu nivel (`nivelDelJugador`) contra el calibre del club
// (`org.fuerza`, la misma vara de `calibreDeLiga`): `clamp(base − pendiente × (nivel − calibre), mínimo, máximo)`, con las
// constantes en `amateur.varaPrueba`. Si sos claramente mejor que el club, una prueba floja alcanza; si estás justo,
// necesitás una buena. Se calcula una vez, al armar la oferta, y viaja en la decisión (`datos.vara`): la oferta, la previa,
// el motor y la pantalla leen el mismo número.
export function varaDeLaPrueba(nivel, calibre) {
  const { base, pendiente, minimo, maximo } = BALANCE.amateur.varaPrueba;
  const vara = Math.min(maximo, Math.max(minimo, base - pendiente * (nivel - calibre)));
  return Math.round(vara * BALANCE.stats.max);
}

export function veredictoDeLaPrueba(resultado, vara) {
  const sacaste = Math.round(Math.min(1, Math.max(0, resultado ?? 0)) * BALANCE.stats.max);
  return { pasa: sacaste >= vara, vara, sacaste, falta: Math.max(0, vara - sacaste) };
}

// El minijuego "la_llamada" depende de shotcalling, pero una buena llamada con jerarquía baja no se ejecuta igual
// (regla textual de 4.6): el impacto sobre el rendimiento se amortigua fuerte por debajo del umbral.
export function factorJerarquiaEnLlamada(jerarquia) {
  return jerarquia >= BALANCE.serie.jerarquiaMinimaParaSeguirLlamada ? 1 : BALANCE.serie.factorLlamadaSinJerarquia;
}
