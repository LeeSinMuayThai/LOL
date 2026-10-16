import { crearLog } from '../core/log.js';
import { roll } from '../core/rng.js';
import { clampStat } from '../core/numeros.js';
import { ligaDeCarrera } from '../core/competicion.js';
import {
  esCierreDeTemporada, calificaAInternacional, charlaDisponible, ajusteDeCharla, conCharlaGastada
} from '../core/serie.js';
import { fuerzaDeMundial, TEXTO_JERARQUIA_MUNDIAL } from '../core/fuerza.js';
import { tirarPartido } from '../core/partido.js';
import { registrarInternacional, registrarPico, registrarArraigoEnFila } from '../core/registro.js';
import {
  crearMundial, emparejarRondaSwiss, jugarRondaSwiss, swissTerminado, cruceDe, rivalEn, sigueEnSwiss, esVidaOMuerte,
  probabilidadDeCruceSwiss, sembrarBracket, crucesDeEtapa, jugarEtapaBracket, etapaSiguiente, resolverResto,
  resultadoDelJugador, caminoDelJugador, recordDelJugador, resumenDelMundial,
  entraAlPlayIn, rivalesDelPlayIn, partidosDeLaTanda, pDelCampo
} from '../core/internacional.js';
import {
  arrancarSerieDelMundial, resolver as resolverSerie, resolverAuto as resolverAutoSerie,
  armarG1, etapasDelMundial, varaDeRonda, devolverCupo, torneoTrasRonda, repeticionTrasDerrota, LINEA_REPETICION,
  poderActivado, poderDelBot, respuestaDelBot
} from './serie.js';
import {
  claveDeTorneo, torneoG1, minijuegoDelTorneo, registrarMinijuegoVisto, textoDeMinijuego, juzgarMinijuego,
  veredictoDeMinijuego, reglaDeLaVara, factorDificultadPorRonda
} from '../core/minijuegos.js';
import { bajaDeCharla } from '../core/minijuegos.js';
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

// G1 (PLANUI §0.9): cada Bo1 tuyo del Swiss es un minijuego y lo decide el minijuego, sin tirada. En el 2-2 se suma la
// charla del coach, como antes. La mecánica es la del torneo (una para todo el Mundial) y cada ronda sube un escalón.
// `repeticion` arma el desempate o la revancha del mismo Bo1. Sin mecánica para el rol (hoy no pasa), la parada de F1.
const MOMENTO_SWISS = 'mapa_decisivo';

function construirParadaSwiss(state, repeticion = null) {
  const t = state.internacional;
  const e = t.partidoEnCurso;
  const record = t.swiss.record[t.jugador];
  const previo = torneoG1(state, claveDeTorneo(state, 'mundial'));
  const torneo = repeticion?.torneo ?? { ...previo, inicio: previo.inicio ?? 'swiss' };
  const { entrada, nueva } = minijuegoDelTorneo(state, torneo, MOMENTO_SWISS);
  if (!entrada) {
    return { state, decision: construirDecisionSwiss(state) };
  }
  const ronda = t.swiss.rondas.length + 1;
  const vidaOMuerte = esVidaOMuerte(record);
  // H3e: la tanda, k partidos con su vara (el primero es `e`; la repetición es de a uno).
  const partidos = (e.tanda ?? [e]).map((partido, i) => {
    const pPartido = probabilidadDeCruceSwiss(state, e.fuerzaPropia, partido.fuerzaRival);
    const varaPartido = varaDeRonda(pPartido, i === 0 && repeticion ? repeticion.varaAnterior : null, entrada.id);
    return { rival: partido.rival, vara: varaPartido, p: pPartido };
  });
  const { p, vara } = partidos[0];
  const charlaEnElMapa = repeticion?.charlaEnElMapa ?? false;
  const conCharla = vidaOMuerte && !charlaEnElMapa && charlaDisponible(state);
  const torneoConMecanica = { ...torneo, minijuego: entrada.id };
  const st = {
    ...state,
    career: { ...state.career, torneoG1: torneoConMecanica },
    flags: nueva ? { ...state.flags, minijuegosRecientes: registrarMinijuegoVisto(state, entrada.id) } : state.flags
  };
  const camino = {
    torneo: `Worlds ${t.anio}`,
    etapas: etapasDelMundial('swiss'),
    mapas: [{ numero: 1, resultado: null }],
    marcador: [0, 0],
    bo: 1,
    swiss: { victorias: record.v, derrotas: record.d }
  };
  const g1 = armarG1(st, torneoConMecanica, {
    vara, esFinal: false, conCharla, camino,
    desempate: repeticion?.tipo === 'desempate', revancha: repeticion?.tipo === 'revancha',
    varaAnterior: repeticion?.varaAnterior ?? null
  });
  // El nombre de la mecánica es el del Mundial (`nombresPorCompeticion.internacional`).
  const textos = textoDeMinijuego(entrada, { ...st, serie: { ...(st.serie ?? {}), ronda: 'internacional' } });
  const { cara, linea } = vidaOMuerte
    ? { cara: 'vida o muerte', linea: 'Ganás y estás en cuartos; perdés y te volvés a casa.' }
    : loQueSeJuega(record);
  return {
    state: st,
    decision: {
      tipo: 'opciones',
      presentacion: 'minijuego',
      titulo: `Swiss del Mundial · ronda ${ronda} · ${record.v}-${record.d} vs ${e.rival}: ${cara}`,
      descripcion: `${linea} Bo1 contra ${e.rival} (${nombreVisibleDeLiga(e.ligaRival)}). ${vienesDe(t)}${textos.descripcion}`.trim(),
      opciones: [],
      datos: {
        motivo: 'swiss',
        rival: e.rival,
        ronda,
        record: { ...record },
        vidaOMuerte,
        minijuego: entrada.id,
        tituloMinijuego: textos.titulo,
        momento: MOMENTO_SWISS,
        dificultad: factorDificultadPorRonda('internacional'),
        statRelevante: entrada.statRelevante,
        apuesta: textos.apuesta,
        regla: textos.regla,
        reglaVara: reglaDeLaVara(vara),
        p,
        // D122: la charla vale al menos una unidad de la regla visible (`bajaDeCharla`).
        charla: { disponible: conCharla, bajaVara: bajaDeCharla(entrada.id, vara, g1.poder?.efecto?.bajaVara ?? 0) },
        charlaEnElMapa,
        ajusteBot: repeticion?.ajusteBot ?? 0,
        g1,
        // H3e: la UI juega el partido i con su vara y corta en la primera derrota o al ganarlos todos.
        // `pCampo`: tu p contra la fuerza media del campo, la que fija el tamaño (`g1.tanda`).
        tanda: {
          etapa: 'swiss', partidos, victoriasParaPasar: partidos.length, derrotasParaQuedarAfuera: 1, pCampo: pDelCampo(state, t, e.fuerzaPropia)
        }
      }
    }
  };
}

// H3e: los partidos de la tanda, con el rival de cada uno suponiendo que ganás los anteriores (los cruces ajenos son por
// hash, así que el rival es el que de verdad toca si llegás). El 2-2 es siempre de a uno.
function tandaDelSwiss(state, t, fuerzaPropia) {
  const k = esVidaOMuerte(t.swiss.record[t.jugador]) ? 1 : partidosDeLaTanda(state, t, fuerzaPropia);
  const partidos = [];
  let supuesto = t;
  while (partidos.length < k && sigueEnSwiss(supuesto, supuesto.jugador)) {
    const cruces = emparejarRondaSwiss(supuesto);
    const rival = participante(supuesto, rivalEn(cruceDe(cruces, supuesto.jugador), supuesto.jugador));
    partidos.push({ cruces, rival: rival.nombre, ligaRival: rival.liga, fuerzaRival: rival.fuerza });
    supuesto = jugarRondaSwiss(supuesto, cruces, { gano: true, p: null });
  }
  return partidos;
}

// H3e: la respuesta de la UI en sus dos formas: un número (un partido) o un array (la tanda). Sin nada, un partido en 0.
function resultadosDe(respuesta) {
  return Array.isArray(respuesta.resultados) && respuesta.resultados.length > 0
    ? respuesta.resultados
    : [respuesta.resultado ?? 0];
}

// H3e: el bot juega cada partido de la tanda con su p (la de la base), y corta como la UI: `corta(v, d)`. Una tirada por
// partido jugado y en el mismo orden que antes, cuando cada partido era una parada.
function resultadosDelBot(g1, rng, partidos, { bajaCharla = 0, usaPoder, ajusteBot = 0 }, corta) {
  const bajaPoder = usaPoder ? (g1.poder.efecto.bajaVara ?? 0) : 0;
  const resultados = [];
  let v = 0;
  let d = 0;
  for (const { vara, pMapa } of partidos) {
    if (corta(v, d)) break;
    const resultado = respuestaDelBot({ ...g1, vara }, rng, { pMapa, bajaCharla, usaPoder, ajusteBot });
    resultados.push(resultado);
    if (resultado >= vara - bajaPoder - bajaCharla) v += 1; else d += 1;
  }
  return resultados;
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

function logDePartidoSwiss(t, rival, gano, p, minijuego = null) {
  const r = t.swiss.record[t.jugador];
  const ronda = t.swiss.rondas.length;
  return crearLog(
    'internacional',
    `Swiss, ronda ${ronda}: ${gano ? 'le ganaste a' : 'perdiste con'} ${rival.nombre} (${nombreVisibleDeLiga(rival.liga)}). Vas ${r.v}-${r.d}.`,
    // G1: `minijuego` ({ vara, resultado }) si el Bo1 lo decidió el minijuego, no una tirada.
    { torneo: 'mundial', etapa: 'swiss', ronda, rival: rival.nombre, resultado: gano ? 'W' : 'L', p, ...(minijuego ? { minijuego } : {}) }
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
      const tanda = tandaDelSwiss(st, t, fuerzaPropia);
      const partidoEnCurso = { ...tanda[0], fuerzaPropia, tanda };
      const parada = construirParadaSwiss({ ...st, internacional: { ...t, partidoEnCurso } });
      return { state: parada.state, logs, decision: parada.decision };
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

// G1: el Bo1 del Swiss jugado con las manos: el juicio contra la vara decide el partido (o da el desempate o la revancha).
// H3e: la tanda. Cada resultado juega su partido contra su vara, en orden, hasta la primera derrota (que pasa por el
// desempate y la revancha de siempre, de a uno) o hasta que se te acaba el Swiss. Un partido sin resultado no se juega:
// vuelve en la tanda siguiente.
function resolverSwissG1(state, decision, respuesta, rng) {
  const { g1 } = decision.datos;
  const t = state.internacional;
  const e = t.partidoEnCurso;
  const partidos = e.tanda ?? [e];
  const varas = decision.datos.tanda?.partidos.map((partido) => partido.vara) ?? [g1.vara];
  const resultados = resultadosDe(respuesta);
  // Una pausa de minijuego no gasta el cupo del split (F1 ya lo hacía con las rondas que no son el 2-2).
  let st = devolverCupo(state);
  const usada = respuesta.charla === true && decision.datos.charla?.disponible === true && charlaDisponible(st);
  const poderUsado = poderActivado(g1, respuesta);
  const bajaPoder = poderUsado ? (g1.poder.efecto.bajaVara ?? 0) : 0;
  const baja = bajaPoder + (usada ? decision.datos.charla.bajaVara : 0);
  const logs = [];
  if (usada) {
    st = conCharlaGastada(st);
    logs.push(crearLog('internacional', 'El coach junta a todos antes del 2-2: la charla de la temporada se usa acá.'));
  }
  const clave = claveDeTorneo(state, 'mundial');
  const jugado = torneoTrasRonda(torneoG1(state, clave), { poderUsado, desempate: g1.desempate });
  const max = BALANCE.stats.max;
  const conTorneo = (s0, torneo) => ({ ...s0, career: { ...s0.career, torneoG1: torneo } });
  let torneo = { ...t, partidoEnCurso: null };
  for (let i = 0; i < partidos.length && i < resultados.length && sigueEnSwiss(torneo, torneo.jugador); i += 1) {
    const partido = partidos[i];
    const varaEfectiva = varas[i] - baja;
    const juicio = juzgarMinijuego(resultados[i], varaEfectiva, g1.margenCasi);
    const sacaste = Math.round(juicio.resultado * max);
    const varaPts = Math.round(varaEfectiva * max);
    const veredicto = veredictoDeMinijuego(decision.datos.minijuego, juicio.resultado, state, { nivel: juicio.paso ? 'bien' : 'mal' }).detalle;
    logs.push(crearLog('internacional', `${veredicto} (sacaste ${sacaste}; la vara era ${varaPts}).`.trim(), {
      minijuego: decision.datos.minijuego, vara: varaEfectiva, resultado: juicio.resultado, paso: juicio.paso, casi: juicio.casi
    }));
    if (!juicio.paso) {
      const repite = repeticionTrasDerrota(state, jugado, juicio.casi);
      if (repite) {
        logs.push(crearLog('internacional', LINEA_REPETICION[repite.tipo](sacaste, varaPts)));
        const enCurso = { ...partido, fuerzaPropia: e.fuerzaPropia, tanda: [partido] };
        const parada = construirParadaSwiss({ ...conTorneo(st, repite.torneo), internacional: { ...torneo, partidoEnCurso: enCurso } }, {
          tipo: repite.tipo,
          torneo: repite.torneo,
          varaAnterior: varaEfectiva,
          charlaEnElMapa: usada || decision.datos.charlaEnElMapa === true,
          ajusteBot: (decision.datos.ajusteBot ?? 0) + bajaPoder
        });
        return { state: parada.state, logs, decision: parada.decision };
      }
    }
    const gano = juicio.paso;
    const p = i === 0 ? decision.datos.p : probabilidadDeCruceSwiss(st, e.fuerzaPropia, partido.fuerzaRival);
    torneo = jugarRondaSwiss(torneo, partido.cruces, { gano, p });
    logs.push(logDePartidoSwiss(torneo, participante(t, partido.rival), gano, p, { vara: varaEfectiva, resultado: juicio.resultado }));
    if (!gano) break;
  }
  return avanzarSwiss({ ...conTorneo(st, jugado), internacional: torneo }, rng, logs);
}

function resolverSwiss(state, decision, respuesta, rng) {
  if (decision.datos?.g1) {
    return resolverSwissG1(state, decision, respuesta, rng);
  }
  // Un guardado de la 16 con la parada de antes de G1 pendiente: la tirada de siempre.
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
    st = conCharlaGastada(st);
    logs.push(crearLog('internacional', 'El coach junta a todos antes del 2-2: la charla de la temporada se usa acá.'));
  }
  const { gano, p } = tirarPartido(probabilidadDeCruceSwiss(st, e.fuerzaPropia, e.fuerzaRival, ajusteDeCharla(usada)), rng);
  st = { ...st, internacional: jugarRondaSwiss({ ...t, partidoEnCurso: null }, e.cruces, { gano, p }) };
  logs.push(logDePartidoSwiss(st.internacional, participante(t, e.rival), gano, p));
  return avanzarSwiss(st, rng, logs);
}

// --- H3e (PLANUI §0.10 H3): el Play-In ---
// El último sembrado de una liga grande arranca acá: una sola parada y una sola tanda contra los primeros no clasificados de
// las otras ligas grandes. `playIn.victoriasParaPasar` y al Swiss en tu cupo; `derrotasParaQuedarAfuera` y el Mundial se
// juega sin vos (tu lugar lo toma el siguiente de tu liga).

function cortaElPlayIn(v, d) {
  const m = BALANCE.mundial.playIn;
  return v >= m.victoriasParaPasar || d >= m.derrotasParaQuedarAfuera;
}

function construirParadaPlayIn(state, rng, logs) {
  const t = state.internacional;
  const { rivales, fuerzaPropia } = t.playIn;
  const previo = torneoG1(state, claveDeTorneo(state, 'mundial'));
  const torneo = { ...previo, inicio: previo.inicio ?? 'playin' };
  const { entrada, nueva } = minijuegoDelTorneo(state, torneo, MOMENTO_SWISS);
  const partidos = rivales.map((rival) => {
    const p = probabilidadDeCruceSwiss(state, fuerzaPropia, rival.fuerza);
    return { rival: rival.nombre, vara: entrada ? varaDeRonda(p, null, entrada.id) : null, p };
  });
  if (!entrada || partidos.length < BALANCE.mundial.playIn.victoriasParaPasar) {
    // Un rol sin mecánica (hoy no pasa) o sin rivales de sobra para la tanda: se tira, partido a partido, con la p de cada uno.
    const ganados = [];
    for (const partido of partidos) {
      if (cortaElPlayIn(ganados.filter(Boolean).length, ganados.filter((g) => !g).length)) break;
      ganados.push(tirarPartido(partido.p, rng).gano);
    }
    return trasPlayIn(state, partidos, ganados, null, rng, logs);
  }
  const m = BALANCE.mundial.playIn;
  const torneoConMecanica = { ...torneo, minijuego: entrada.id };
  const st = {
    ...state,
    career: { ...state.career, torneoG1: torneoConMecanica },
    flags: nueva ? { ...state.flags, minijuegosRecientes: registrarMinijuegoVisto(state, entrada.id) } : state.flags
  };
  const camino = {
    torneo: `Worlds ${t.anio}`, etapas: etapasDelMundial('swiss'), mapas: [{ numero: 1, resultado: null }], marcador: [0, 0], bo: 1, swiss: null
  };
  const g1 = armarG1(st, torneoConMecanica, { vara: partidos[0].vara, esFinal: false, conCharla: false, camino });
  const textos = textoDeMinijuego(entrada, { ...st, serie: { ...(st.serie ?? {}), ronda: 'internacional' } });
  const nombres = partidos.map((partido) => partido.rival).join(', ');
  return {
    state: st,
    logs,
    decision: {
      tipo: 'opciones',
      presentacion: 'minijuego',
      titulo: `Play-In del Mundial · ${m.victoriasParaPasar} victorias y al Swiss`,
      descripcion: `Una sola tanda contra ${nombres}: ${m.victoriasParaPasar} victorias y estás en el Swiss; ${m.derrotasParaQuedarAfuera} derrotas y te volvés a casa. ${textos.descripcion}`.trim(),
      opciones: [],
      datos: {
        motivo: 'playin',
        rival: partidos[0].rival,
        ronda: 0,
        record: { v: 0, d: 0 },
        vidaOMuerte: false,
        minijuego: entrada.id,
        tituloMinijuego: textos.titulo,
        momento: MOMENTO_SWISS,
        dificultad: factorDificultadPorRonda('internacional'),
        statRelevante: entrada.statRelevante,
        apuesta: textos.apuesta,
        regla: textos.regla,
        reglaVara: reglaDeLaVara(partidos[0].vara),
        p: partidos[0].p,
        charla: { disponible: false, bajaVara: 0 },
        charlaEnElMapa: false,
        ajusteBot: 0,
        g1,
        tanda: {
          etapa: 'playin', partidos, victoriasParaPasar: m.victoriasParaPasar, derrotasParaQuedarAfuera: m.derrotasParaQuedarAfuera
        }
      }
    }
  };
}

function resolverPlayIn(state, decision, respuesta, rng) {
  const { g1, tanda } = decision.datos;
  let st = devolverCupo(state);
  const poderUsado = poderActivado(g1, respuesta);
  const bajaPoder = poderUsado ? (g1.poder.efecto.bajaVara ?? 0) : 0;
  const resultados = resultadosDe(respuesta);
  const ganados = [];
  const juicios = [];
  for (let i = 0; i < tanda.partidos.length && i < resultados.length; i += 1) {
    if (cortaElPlayIn(ganados.filter(Boolean).length, ganados.filter((g) => !g).length)) break;
    const juicio = juzgarMinijuego(resultados[i], tanda.partidos[i].vara - bajaPoder, g1.margenCasi);
    ganados.push(juicio.paso);
    juicios.push(juicio);
  }
  // Una respuesta corta no elimina al que va ganando: los partidos que faltan se tiran (la rama sin mecánica).
  for (let i = ganados.length; i < tanda.partidos.length; i += 1) {
    if (cortaElPlayIn(ganados.filter(Boolean).length, ganados.filter((g) => !g).length)) break;
    ganados.push(tirarPartido(tanda.partidos[i].p, rng).gano);
  }
  const jugado = torneoTrasRonda(torneoG1(state, claveDeTorneo(state, 'mundial')), { poderUsado });
  st = { ...st, career: { ...st.career, torneoG1: jugado } };
  return trasPlayIn(st, tanda.partidos, ganados, { juicios }, rng, []);
}

function trasPlayIn(state, partidos, ganados, conMinijuego, rng, logsAcum) {
  const t = state.internacional;
  const logs = [...logsAcum];
  let v = 0;
  let d = 0;
  ganados.forEach((gano, i) => {
    if (gano) v += 1; else d += 1;
    const rival = t.playIn.rivales[i];
    const juicio = conMinijuego?.juicios[i];
    logs.push(crearLog(
      'internacional',
      `Play-In, partido ${i + 1}: ${gano ? 'le ganaste a' : 'perdiste con'} ${rival.nombre} (${nombreVisibleDeLiga(rival.liga)}). Vas ${v}-${d}.`,
      {
        torneo: 'mundial', etapa: 'playin', ronda: i + 1, rival: rival.nombre, resultado: gano ? 'W' : 'L', p: partidos[i].p,
        ...(juicio ? { minijuego: { vara: juicio.vara, resultado: juicio.resultado } } : {})
      }
    ));
  });
  const paso = v >= BALANCE.mundial.playIn.victoriasParaPasar;
  const playIn = { ...t.playIn, paso, record: `${v}-${d}` };
  if (paso) {
    logs.push(crearLog('internacional', `Pasaste el Play-In ${v}-${d}: al Swiss de 16, tres victorias y pasás, tres derrotas y te volvés.`));
    return avanzarSwiss({ ...state, internacional: { ...t, fase: 'swiss', playIn } }, rng, logs);
  }
  const sinVos = { ...resolverResto(crearMundial(state, t.anio, null)), playIn };
  logs.push(crearLog('internacional', `Afuera en el Play-In del Mundial ${t.anio} (${v}-${d}). El Swiss se juega sin ustedes.`, {
    torneo: 'mundial', resultado: 'playin'
  }));
  return {
    state: {
      ...state,
      internacional: sinVos,
      career: { ...state.career, hitos: [...state.career.hitos, `Afuera en el Play-In del Mundial con ${state.career.currentOrg} a los ${state.age}`] }
    },
    logs
  };
}

function respuestaAutoPlayIn(state, decision, rng) {
  const { g1, tanda } = decision.datos;
  const usaPoder = poderDelBot(g1);
  const partidos = tanda.partidos.map(({ vara, p }) => ({ vara, pMapa: p }));
  const resultados = resultadosDelBot(g1, rng, partidos, { usaPoder }, cortaElPlayIn);
  return { resultado: resultados[0], resultados, poder: usaPoder };
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
  if (decision.datos?.motivo === 'playin') {
    return resolverPlayIn(state, decision, respuesta, rng);
  }
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
      // G1: un minijuego de mapa (el Swiss, el que cierra una serie del bracket, cada mapa de la final) tampoco: se
      // juega con las manos, no lo decide el coach.
      if (actual.decision.datos?.g1
        || (actual.decision.datos?.motivo === 'swiss' && actual.decision.datos.vidaOMuerte === false)) {
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
  const playIn = entraAlPlayIn(liga, jugador.cupo);
  const log = crearLog(
    'internacional',
    `Clasificaste al Mundial ${anio} como ${jugador.cupo}º de ${nombreVisibleDeLigaOZona(liga)}: `
    + (playIn
      ? `arrancás en el Play-In, ${BALANCE.mundial.playIn.victoriasParaPasar} victorias y al Swiss de 16.`
      : 'Swiss de 16, tres victorias y pasás, tres derrotas y te volvés.')
    // K5c-H (regla 12): con `mundial.jerarquiaCuenta` en false, el feed dice que acá tu peso en el vestuario no cuenta.
    + (BALANCE.mundial.jerarquiaCuenta ? '' : ` ${TEXTO_JERARQUIA_MUNDIAL}`)
  );
  if (playIn) {
    const datosPlayIn = { rivales: rivalesDelPlayIn(state, anio, jugador), fuerzaPropia: jugador.fuerza, paso: null, record: null };
    return seguir(construirParadaPlayIn({ ...state, internacional: { ...torneo, fase: 'playin', playIn: datosPlayIn } }, rng, [log]), rng);
  }
  return seguir(avanzarSwiss({ ...state, internacional: torneo }, rng, [log]), rng);
}

export function resolver(state, decision, respuesta, rng) {
  return seguir(resolverCrudo(state, decision, respuesta, rng), rng);
}

// El 2-2 en automático gasta la charla si la hay (es eliminación directa); una ronda del Swiss que no es el 2-2 tiene una
// sola opción (F1: "A jugarlo"); las pausas de la serie, las de K4-B.
export function resolverAuto(state, decision, rng) {
  if (decision.datos?.motivo === 'playin') {
    return respuestaAutoPlayIn(state, decision, rng);
  }
  if (decision.datos?.motivo === 'swiss' && decision.datos.g1) {
    return respuestaAutoSwiss(state, decision, rng);
  }
  if (decision.datos?.motivo === 'swiss') {
    return { opcionId: decision.opciones.some((opcion) => opcion.id === 'charla') ? 'charla' : decision.opciones[0].id };
  }
  return resolverAutoSerie(state, decision, rng);
}

// G1: el bot en un Bo1 del Swiss. Pasa con la p que la base tiraba (la del cruce, con la charla en el 2-2, que la base
// gastaba siempre): las tasas del Mundial no se mueven por construcción.
// H3e: en la tanda, cada partido con su p (la charla y el ajuste son del 2-2 y de la repetición, que son de a uno).
function respuestaAutoSwiss(state, decision, rng) {
  const { g1 } = decision.datos;
  const e = state.internacional.partidoEnCurso;
  const charla = decision.datos.charla?.disponible === true;
  const conCharla = charla || decision.datos.charlaEnElMapa === true;
  const varas = decision.datos.tanda?.partidos.map((partido) => partido.vara) ?? [g1.vara];
  const partidos = (e.tanda ?? [e]).map((partido, i) => ({
    vara: varas[i],
    pMapa: probabilidadDeCruceSwiss(state, e.fuerzaPropia, partido.fuerzaRival, ajusteDeCharla(conCharla))
  }));
  const usaPoder = poderDelBot(g1);
  const resultados = resultadosDelBot(g1, rng, partidos, {
    bajaCharla: charla ? decision.datos.charla.bajaVara : 0, usaPoder, ajusteBot: decision.datos.ajusteBot ?? 0
  }, (v, d) => d > 0);
  return { resultado: resultados[0], resultados, charla, poder: usaPoder };
}
