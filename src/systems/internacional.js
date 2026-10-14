import { crearLog } from '../core/log.js';
import { roll } from '../core/rng.js';
import { clampStat } from '../core/numeros.js';
import { ligaDeCarrera } from '../core/competicion.js';
import { esCierreDeTemporada, calificaAInternacional, charlaDisponible, ajusteDeCharla } from '../core/serie.js';
import { fuerzaDeMundial, TEXTO_JERARQUIA_MUNDIAL } from '../core/fuerza.js';
import { tirarPartido } from '../core/partido.js';
import { registrarInternacional, registrarPico, registrarArraigoEnFila } from '../core/registro.js';
import {
  crearMundial, emparejarRondaSwiss, jugarRondaSwiss, swissTerminado, cruceDe, rivalEn, sigueEnSwiss, esVidaOMuerte,
  probabilidadDeCruceSwiss, sembrarBracket, crucesDeEtapa, jugarEtapaBracket, etapaSiguiente, resolverResto,
  resultadoDelJugador, caminoDelJugador, recordDelJugador, resumenDelMundial
} from '../core/internacional.js';
import { arrancarSerieDelMundial, resolver as resolverSerie, resolverAuto as resolverAutoSerie } from './serie.js';
import { BALANCE } from '../data/balance.js';
import { nombreVisibleDeLiga, nombreVisibleDeLigaOZona } from '../core/ligas.js';

export const id = 'internacional';

// K5-A (PLAN.md "K5 — decisiones de spec", K5-A): el Mundial de verdad. Corre entre `serie` (que deja la final
// doméstica jugada y `career.posicion` fresca) y `events`, en el split de cierre de temporada, TODOS los años: el
// mundo tiene Mundial juegues o no, y `systems/escena.js` nombra a su campeón al cierre del año.
//
// - Si no clasificaste, el torneo entero sale de `core/internacional.js` por hash: cero tiradas, cero logs.
// - Si clasificaste, tus partidos del Swiss se tiran solos (UNA tirada contra la p, K2b) salvo el 2-2, el de vida o
//   muerte, que frena con la previa y la charla del coach. F1 (PLANUI §0.8): con `mundial.frenaCadaRondaSwiss`, cada
//   ronda tuya frena (una opción, sin charla) con el tablero del Swiss en pantalla. El bracket se juega como serie con las reglas de K4
//   (`systems/serie.js`: plan de Fearless, mapa decisivo, charla). Las pausas de esas series vuelven por `resolver`
//   de ESTE sistema (el cursor del pipeline es por id), que se las pasa a la serie.
// - T9: el Mundial frena como mucho `mundial.maxInterrupciones` veces por split; lo que pasa el tope lo decide el
//   coach (`resolverAuto`), guardando `reservaParaLaFinal` paradas para la final.

const LINEA_FINAL = {
  eliminado: (t, r) => `Afuera en el Swiss del Mundial ${t.anio} con ${r}. Se vuelve a casa temprano.`,
  cuartos: (t, r) => `Pasaste el Swiss ${r} y te quedaste en cuartos del Mundial ${t.anio}. Lo ganó ${t.campeon}.`,
  semis: (t, r) => `Semifinal del Mundial ${t.anio} (Swiss ${r}). Lo ganó ${t.campeon}.`,
  final: (t, r) => `Llegaste a la final del Mundial ${t.anio} (Swiss ${r}) y la perdiste con ${t.campeon}.`,
  campeon: (t, r) => `¡Campeones del mundo! Mundial ${t.anio}, desde el Swiss ${r} hasta levantar la Copa del Invocador.`
};

const HITO = {
  eliminado: (org, edad) => `Afuera en el Swiss del Mundial con ${org} a los ${edad}`,
  cuartos: (org, edad) => `Cuartos del Mundial con ${org} a los ${edad}`,
  semis: (org, edad) => `Semifinal del Mundial con ${org} a los ${edad}`,
  final: (org, edad) => `Subcampeón del mundo con ${org} a los ${edad}`,
  campeon: (org, edad) => `Campeón del mundo con ${org} a los ${edad}`
};

function participante(t, nombre) {
  return t.participantes.find((p) => p.nombre === nombre);
}

function clasificaste(state) {
  if (state.phase !== 'profesional' || !state.career.currentOrg || state.career.companeros.length === 0) {
    return false;
  }
  const liga = ligaDeCarrera(state);
  return Boolean(liga) && liga.tier === 1 && calificaAInternacional(liga, state.career.posicion);
}

// --- El Swiss ---

// F1 (PLANUI §0.8): lo que está en juego en tu ronda, con tu récord: "ganás y quedás 2-0; perdés y quedás 1-1", "3-0 y
// pasás", "una más y te volvés". Los números salen de `mundial.victoriasParaAvanzar` / `derrotasParaQuedarAfuera`.
function loQueSeJuega({ v, d }) {
  const m = BALANCE.mundial;
  const ganar = v + 1 >= m.victoriasParaAvanzar ? `ganás y estás en cuartos (${v + 1}-${d})` : `ganás y quedás ${v + 1}-${d}`;
  const perder = d + 1 >= m.derrotasParaQuedarAfuera ? `perdés y te volvés a casa (${v}-${d + 1})` : `perdés y quedás ${v}-${d + 1}`;
  const cara = v + 1 >= m.victoriasParaAvanzar && d + 1 >= m.derrotasParaQuedarAfuera ? 'vida o muerte'
    : v + 1 >= m.victoriasParaAvanzar ? (d === 0 ? `${v + 1}-0 y pasás` : 'una más y estás en cuartos')
      : d + 1 >= m.derrotasParaQuedarAfuera ? 'una más y te volvés'
        : v + d === 0 ? 'arranca tu Mundial'
          : v === d ? 'el que gana queda a una de cuartos'
            : v > d ? 'ganás y quedás a una de cuartos' : 'perdés y quedás a una de volverte';
  return { cara, linea: `${ganar[0].toUpperCase()}${ganar.slice(1)}; ${perder}.` };
}

// F1: la ronda anterior, para que la parada siguiente diga que tu récord se movió.
function vienesDe(t) {
  const ultima = t.swiss.rondas[t.swiss.rondas.length - 1]?.find((p) => p.propio);
  if (!ultima) {
    return '';
  }
  const rival = ultima.a === t.jugador ? ultima.b : ultima.a;
  return ultima.ganador === t.jugador ? `Venís de ganarle a ${rival}. ` : `Venís de perder con ${rival}. `;
}

function construirDecisionSwiss(state) {
  const t = state.internacional;
  const e = t.partidoEnCurso;
  const record = t.swiss.record[t.jugador];
  const ronda = t.swiss.rondas.length + 1;
  const vidaOMuerte = esVidaOMuerte(record);
  const datos = { motivo: 'swiss', rival: e.rival, ronda, record: { ...record }, vidaOMuerte };
  if (!vidaOMuerte) {
    // F1: una ronda que no es el 2-2 frena con UNA opción y sin charla (la charla es del 2-2): la tirada es la de siempre.
    const { cara, linea } = loQueSeJuega(record);
    return {
      tipo: 'opciones',
      titulo: `Swiss del Mundial · ronda ${ronda} · ${record.v}-${record.d} vs ${e.rival}: ${cara}`,
      // revisión de F1: lo que se juega va primero (se lee sin abrir "más"); de dónde venís, después
      descripcion: `${linea} Bo1 contra ${e.rival} (${nombreVisibleDeLiga(e.ligaRival)}). ${vienesDe(t)}`.trim(),
      opciones: [{ id: 'jugar', label: 'A jugarlo', descripcion: 'Bo1 de Swiss: la charla del coach se guarda para el 2-2 o el bracket.' }],
      datos
    };
  }
  const conCharla = charlaDisponible(state);
  const base = `${vienesDe(t)}Ganás y estás en cuartos; perdés y te volvés a casa. Es al Bo1 contra ${e.rival} (${nombreVisibleDeLiga(e.ligaRival)}).`;
  return {
    tipo: 'opciones',
    titulo: `Swiss del Mundial · 2-2 vs ${e.rival}: vida o muerte`,
    descripcion: conCharla
      ? `${base} El coach tiene una charla guardada para toda la temporada: ¿la usa ahora?`
      : base,
    opciones: conCharla
      ? [
        { id: 'charla', label: 'Que hable el coach ahora', descripcion: 'Es la única de la temporada: si la gastás acá, no la tenés en el bracket.' },
        { id: 'sinCharla', label: 'Guardar la charla', descripcion: 'Salen así; la charla queda para cuartos, si llegan.' }
      ]
      : [{ id: 'sinCharla', label: 'A jugarlo', descripcion: 'La charla del coach ya se usó esta temporada.' }],
    datos
  };
}

function logDePartidoSwiss(t, rival, gano, p) {
  const r = t.swiss.record[t.jugador];
  const ronda = t.swiss.rondas.length;
  return crearLog(
    'internacional',
    `Swiss, ronda ${ronda}: ${gano ? 'le ganaste a' : 'perdiste con'} ${rival.nombre} (${nombreVisibleDeLiga(rival.liga)}). Vas ${r.v}-${r.d}.`,
    { torneo: 'mundial', etapa: 'swiss', ronda, rival: rival.nombre, resultado: gano ? 'W' : 'L', p }
  );
}

// Tus partidos del Swiss hasta que se decide tu suerte (3 victorias o 3 derrotas). Frena el 2-2 y, con
// `mundial.frenaCadaRondaSwiss` (F1), cada ronda tuya: la tirada se hace en `resolverSwiss`, con la misma p y en el mismo
// orden que si se tirara acá.
function avanzarSwiss(state, rng, logsAcum) {
  let st = state;
  const logs = [...logsAcum];
  while (sigueEnSwiss(st.internacional, st.internacional.jugador)) {
    const t = st.internacional;
    const cruces = emparejarRondaSwiss(t);
    const rival = participante(t, rivalEn(cruceDe(cruces, t.jugador), t.jugador));
    const fuerzaPropia = fuerzaDeMundial(st);
    if (BALANCE.mundial.frenaCadaRondaSwiss || esVidaOMuerte(t.swiss.record[t.jugador])) {
      const partidoEnCurso = { cruces, rival: rival.nombre, ligaRival: rival.liga, fuerzaRival: rival.fuerza, fuerzaPropia };
      const conPartido = { ...st, internacional: { ...t, partidoEnCurso } };
      return { state: conPartido, logs, decision: construirDecisionSwiss(conPartido) };
    }
    const { gano, p } = tirarPartido(probabilidadDeCruceSwiss(st, fuerzaPropia, rival.fuerza), rng);
    st = { ...st, internacional: jugarRondaSwiss(t, cruces, { gano, p }) };
    logs.push(logDePartidoSwiss(st.internacional, rival, gano, p));
  }
  return trasSwiss(st, rng, logs);
}

function trasSwiss(state, rng, logs) {
  let t = state.internacional;
  const record = recordDelJugador(t);
  if (t.swiss.record[t.jugador].d >= BALANCE.mundial.derrotasParaQuedarAfuera) {
    return cerrarMundial({ ...state, internacional: resolverResto(t) }, rng, logs);
  }
  // Pasaste: el resto del Swiss se juega sin vos (ya no estás en ningún cruce) y se siembra el bracket.
  while (!swissTerminado(t)) {
    t = jugarRondaSwiss(t, emparejarRondaSwiss(t));
  }
  t = sembrarBracket(t);
  const siembra = t.bracket.siembra.indexOf(t.jugador) + 1;
  return arrancarEtapa({ ...state, internacional: t }, 'cuartos', rng, [
    ...logs,
    crearLog('internacional', `Pasaste el Swiss ${record}: al bracket como ${siembra}º sembrado de 8.`)
  ]);
}

function resolverSwiss(state, decision, respuesta, rng) {
  const t = state.internacional;
  const e = t.partidoEnCurso;
  const usada = respuesta.opcionId === 'charla' && charlaDisponible(state);
  let st = state;
  // F1: la parada de una ronda que no es el 2-2 no gasta el presupuesto de interrupciones del split (`core/presupuesto.js`,
  // el que `events.js` consulta antes de frenar): el pipeline la descontó al pausar y acá se devuelve. Sin esto, los
  // eventos que vienen después del Mundial dejarían de frenar y la carrera cambiaría (la huella se movía).
  const cupo = st.presupuesto;
  if (decision.datos?.vidaOMuerte === false && cupo && cupo.gastadas > 0) {
    st = { ...st, presupuesto: { ...cupo, gastadas: cupo.gastadas - 1 } };
  }
  const logs = [];
  if (usada) {
    st = { ...st, career: { ...st.career, charlaUsadaEn: st.calendario.anio } };
    logs.push(crearLog('internacional', 'El coach junta a todos antes del 2-2: la charla de la temporada se usa acá.'));
  }
  const { gano, p } = tirarPartido(probabilidadDeCruceSwiss(st, e.fuerzaPropia, e.fuerzaRival, ajusteDeCharla(usada)), rng);
  st = { ...st, internacional: jugarRondaSwiss({ ...t, partidoEnCurso: null }, e.cruces, { gano, p }) };
  logs.push(logDePartidoSwiss(st.internacional, participante(t, e.rival), gano, p));
  return avanzarSwiss(st, rng, logs);
}

// --- El bracket ---

function arrancarEtapa(state, etapa, rng, logs) {
  const t = state.internacional;
  const rival = participante(t, rivalEn(cruceDe(crucesDeEtapa(t, etapa), t.jugador), t.jugador));
  return arrancarSerieDelMundial(state, etapa, { org: rival.nombre, fuerza: rival.fuerza, liga: rival.liga }, rng, logs);
}

function trasSerie(state, finDeSerie, rng) {
  const etapa = state.serie.etapa;
  const t = jugarEtapaBracket(state.internacional, etapa, finDeSerie);
  const st = { ...state, internacional: t };
  if (finDeSerie.gano && etapa !== 'final') {
    return arrancarEtapa(st, etapaSiguiente(etapa), rng, []);
  }
  return cerrarMundial({ ...st, internacional: resolverResto(t) }, rng, []);
}

// --- El cierre: lo que te deja el Mundial ---

function cerrarMundial(state, rng, logs) {
  const t = state.internacional;
  const resultado = resultadoDelJugador(t);
  const record = recordDelJugador(t);
  const a = BALANCE.arraigo;
  const liga = ligaDeCarrera(state);
  const arraigo = Math.round(clampStat(state.career.arraigo + roll(a.porInternacionalMin, a.porInternacionalMax, rng)));
  const registro = registrarArraigoEnFila(
    registrarInternacional(registrarPico(state.career.registro, 'arraigo', arraigo), {
      torneo: `Mundial ${t.anio}`,
      anio: state.calendario.anio,
      org: state.career.currentOrg,
      // K1 (D76): la liga que representaste.
      liga: liga.id,
      resultado,
      record,
      campeon: t.campeon,
      camino: caminoDelJugador(t)
    }),
    arraigo
  );
  const hypeGanado = BALANCE.mundial.hypePorResultado[resultado];
  const jugoElBracket = state.serie?.torneo === 'mundial';
  return {
    state: {
      ...state,
      serie: jugoElBracket ? { ...state.serie, activa: false, postSerie: true } : state.serie,
      player: {
        ...state.player,
        worlds: state.player.worlds + 1,
        stats: { ...state.player.stats, hype: clampStat(state.player.stats.hype + hypeGanado) }
      },
      career: {
        ...state.career,
        internacionales: state.career.internacionales + 1,
        arraigo,
        registro,
        hitos: [...state.career.hitos, HITO[resultado](state.career.currentOrg, state.age)]
      }
    },
    logs: [...logs, crearLog('internacional', LINEA_FINAL[resultado](t, record), {
      torneo: 'mundial', resultado, mundial: resumenDelMundial(t)
    })]
  };
}

// --- El tope de paradas (T9) ---

function puedeFrenar(state) {
  const m = BALANCE.mundial;
  const enLaFinal = state.serie?.activa && state.serie.torneo === 'mundial' && state.serie.etapa === 'final';
  return state.internacional.interrupciones < m.maxInterrupciones - (enLaFinal ? 0 : m.reservaParaLaFinal);
}

function resolverCrudo(state, decision, respuesta, rng) {
  return decision.datos?.motivo === 'swiss'
    ? resolverSwiss(state, decision, respuesta, rng)
    : resolverSerie(state, decision, respuesta, rng);
}

// Sigue el torneo hasta la próxima pausa que entra en el tope, o hasta el final. Una serie que termina vuelve con
// `finDeSerie` y acá se decide con quién va la próxima.
function seguir(resultado, rng) {
  let actual = resultado;
  for (;;) {
    if (actual.decision) {
      const t = actual.state.internacional;
      // F1: una ronda del Swiss que no es el 2-2 frena siempre y no gasta el tope (T9 cuida el bracket y la final).
      if (actual.decision.datos?.motivo === 'swiss' && actual.decision.datos.vidaOMuerte === false) {
        return actual;
      }
      if (puedeFrenar(actual.state)) {
        return { ...actual, state: { ...actual.state, internacional: { ...t, interrupciones: t.interrupciones + 1 } } };
      }
      const aviso = actual.decision.datos?.motivo === 'plan' && !actual.decision.datos?.replan
        ? [crearLog('internacional', 'Este Mundial ya no frena más antes de la final: el plan lo pone el coach.')]
        : [];
      const siguiente = resolverCrudo(actual.state, actual.decision, resolverAuto(actual.state, actual.decision, rng), rng);
      actual = { ...siguiente, logs: [...actual.logs, ...aviso, ...siguiente.logs] };
      continue;
    }
    if (actual.finDeSerie) {
      const { finDeSerie, ...resto } = actual;
      const siguiente = trasSerie(resto.state, finDeSerie, rng);
      actual = { ...siguiente, logs: [...resto.logs, ...siguiente.logs] };
      continue;
    }
    return actual;
  }
}

// --- Contrato del sistema ---

export function aplicar(state, rng) {
  if (!esCierreDeTemporada(state.player.splitCount)) {
    return { state, logs: [] };
  }
  const anio = state.calendario.anio;
  if (!clasificaste(state)) {
    // El Mundial se juega igual, entero por hash: si no clasificaste, el stream no se mueve.
    return { state: { ...state, internacional: resolverResto(crearMundial(state, anio, null)) }, logs: [] };
  }

  const liga = ligaDeCarrera(state);
  const jugador = {
    nombre: state.career.currentOrg, liga: liga.id, fuerza: fuerzaDeMundial(state), cupo: state.career.posicion
  };
  const torneo = crearMundial(state, anio, jugador);
  const log = crearLog(
    'internacional',
    `Clasificaste al Mundial ${anio} como ${jugador.cupo}º de ${nombreVisibleDeLigaOZona(liga)}: Swiss de 16, `
    + 'tres victorias y pasás, tres derrotas y te volvés.'
    // K5c-H (regla 12): con `mundial.jerarquiaCuenta` en false, el feed dice que acá tu peso en el vestuario no cuenta.
    + (BALANCE.mundial.jerarquiaCuenta ? '' : ` ${TEXTO_JERARQUIA_MUNDIAL}`)
  );
  return seguir(avanzarSwiss({ ...state, internacional: torneo }, rng, [log]), rng);
}

export function resolver(state, decision, respuesta, rng) {
  return seguir(resolverCrudo(state, decision, respuesta, rng), rng);
}

// El 2-2 en automático gasta la charla si la hay (es eliminación directa); una ronda del Swiss que no es el 2-2 tiene una
// sola opción (F1: "A jugarlo"); las pausas de la serie, las de K4-B.
export function resolverAuto(state, decision, rng) {
  if (decision.datos?.motivo === 'swiss') {
    return { opcionId: decision.opciones.some((opcion) => opcion.id === 'charla') ? 'charla' : decision.opciones[0].id };
  }
  return resolverAutoSerie(state, decision, rng);
}
