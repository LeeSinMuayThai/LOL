import { gauss } from './rng.js';
import { clamp, probabilidadDeGanar } from './numeros.js';
import { factorDeCampeon } from './ajusteMeta.js';
import { ligaOZonaDeCarrera } from './competicion.js';
import { BALANCE } from '../data/balance.js';

// La temporada regular (fase 5): antes se resolvía con UNA tirada
// (`posicionEnLaLiga`, ahora borrada de `systems/rendimiento.js`) y una sola
// línea de log. Acá se simula el calendario completo — con nombre, tabla y
// racha — y el split elige 2 o 3 fechas con algo en juego para jugarlas de
// verdad; el resto pasa resumido. Todo lo que vive acá es puro (salvo lo que
// recibe `rng` por parámetro): `systems/temporada.js` es el único que muta
// estado, siguiendo el mismo reparto que ya usan `core/serie.js` y
// `systems/serie.js`.
//
// Fase 9Rb: antes los partidos entre los OTROS equipos se resolvían TODOS de
// una vez al abrir el split (`simularResto`), mientras tu fila arrancaba 0-0 y
// crecía fecha a fecha. La tabla mezclaba tu jornada 3 con la jornada 9 de los
// demás, así que en la primera mitad de toda temporada te decía que ibas
// último (posición relativa media 0,96 en la jornada 1) gobiernes como
// gobiernes — y sobre esa tabla falsa se calculaban `puntero` y
// `define_clasificacion`. Ahora hay un fixture round-robin real y los cruces
// ajenos de cada jornada se resuelven EN PASO con los tuyos: la tabla siempre
// tiene a todos con la misma cantidad de fechas jugadas.

// Round-robin de una sola vuelta por el método del círculo. Con N equipos
// (siempre par en las ligas y zonas del juego) da N-1 jornadas, cada equipo
// contra cada otro exactamente una vez y sin fechas libres. Puro y
// determinista: NO consume `rng` — el fixture no depende de cuándo se lo mira,
// igual que el calendario que reemplaza. Devuelve el calendario del jugador
// (misma forma de siempre: `{ jornada, rival, fuerzaRival, local }`) y, por
// jornada, los cruces que NO lo involucran.
export function generarFixture(liga, propiaNombre) {
  if (!liga || !Array.isArray(liga.orgs) || liga.orgs.length < 2) {
    return { calendario: [], cruces: [] };
  }

  const equipos = liga.orgs;
  const n = equipos.length;
  const mitad = Math.floor(n / 2);
  const calendario = [];
  const cruces = [];

  // Posiciones 0..n-1: la 0 queda fija y el resto rota una posición por
  // jornada. En cada jornada se enfrentan pos[i] y pos[n-1-i]. Con n impar
  // (no debería pasar) el último "equipo" es un hueco y ese rival tiene fecha
  // libre esa jornada.
  const pos = equipos.map((_, i) => i);

  for (let r = 0; r < n - 1; r += 1) {
    const crucesJornada = [];
    for (let i = 0; i < mitad; i += 1) {
      const a = equipos[pos[i]];
      const b = equipos[pos[n - 1 - i]];
      if (!a || !b) {
        continue;
      }
      if (a.nombre === propiaNombre || b.nombre === propiaNombre) {
        const rival = a.nombre === propiaNombre ? b : a;
        // `local` = sos vos el primero del par. No cambia ninguna fórmula (no
        // hay ventaja de localía en resolverFecha), solo le da un valor
        // coherente al campo que el calendario ya traía.
        calendario.push({ jornada: r + 1, rival: rival.nombre, fuerzaRival: rival.fuerza, local: a.nombre === propiaNombre });
      } else {
        crucesJornada.push({ local: a.nombre, visitante: b.nombre, fuerzaLocal: a.fuerza, fuerzaVisitante: b.fuerza });
      }
    }
    cruces.push(crucesJornada);
    pos.splice(1, 0, pos.pop());
  }

  return { calendario, cruces };
}

// El calendario del jugador, derivado del fixture. Misma firma y misma forma
// de retorno que antes: `systems/temporada.js` y los checks no cambian.
export function generarCalendario(state) {
  return generarFixture(ligaOZonaDeCarrera(state), state.career.currentOrg).calendario;
}

// Misma forma que `finalizarMapa` en `systems/serie.js`: cada lado tira
// alrededor de su fuerza y gana el que saca el número más alto. No se
// reescribe la fórmula de rendimiento: `fuerzaPropia` ya sale de
// `calcularRendimiento` + `fuerzaDelEquipo`, calculada una sola vez por split
// en `systems/temporada.js`.
export function resolverFecha(fuerzaPropia, fuerzaRival, rng) {
  const t = BALANCE.temporada;
  return gauss(fuerzaPropia, t.ruidoFecha, rng) > gauss(fuerzaRival, t.ruidoRivalFecha, rng);
}

export function filaVacia(org) {
  return { org, ganados: 0, perdidos: 0 };
}

export function registrarEnFila(fila, gano) {
  return gano
    ? { ...fila, ganados: fila.ganados + 1 }
    : { ...fila, perdidos: fila.perdidos + 1 };
}

// Los cruces ajenos de UNA jornada (los que no involucran al jugador),
// resueltos una tirada cada uno. Se llama en paso con cada fecha del jugador,
// así todas las filas de la tabla avanzan juntas. El total de tiradas sobre la
// temporada es idéntico al del viejo `simularResto` ((N-1)(N-2)/2): lo único
// que cambia es EN QUÉ ORDEN caen (deuda D38, familia D21).
export function aplicarCrucesDeJornada(registrosOtros, crucesJornada, rng) {
  let registros = registrosOtros;
  for (const cruce of crucesJornada) {
    const ganaLocal = resolverFecha(cruce.fuerzaLocal, cruce.fuerzaVisitante, rng);
    registros = {
      ...registros,
      [cruce.local]: registrarEnFila(registros[cruce.local], ganaLocal),
      [cruce.visitante]: registrarEnFila(registros[cruce.visitante], !ganaLocal)
    };
  }
  return registros;
}

// La tabla completa: la fila del jugador más las de los demás equipos, todas
// con la misma cantidad de fechas jugadas (ver nota de la fase 9Rb arriba),
// ordenada por ganados y diferencia.
export function tablaDePosiciones(registrosOtros, filaPropia) {
  const filas = [filaPropia, ...Object.values(registrosOtros)];
  return filas
    .map((fila) => ({ ...fila, diferencia: fila.ganados - fila.perdidos }))
    .sort((a, b) => b.ganados - a.ganados || b.diferencia - a.diferencia);
}

export function posicionEnTabla(tabla, org) {
  const indice = tabla.findIndex((fila) => fila.org === org);
  return indice < 0 ? tabla.length : indice + 1;
}

// El hash determinista que le da un equipo "de local" a cada rival de
// generación DENTRO de su liga tier 1. No consume `rng`: los rivales no
// tienen una org asignada en `core/mundo.js` (se generan antes de que exista
// ninguna carrera profesional), así que esto les da una sin tocar el stream
// ni el módulo de generación del mundo. Solo importa cuando el jugador
// compite en la MISMA liga tier 1 que el rival: es la única situación real en
// la que se cruzarían.
function orgDelRival(rival, liga) {
  if (!liga || liga.tier !== 1 || rival.liga !== liga.id || liga.orgs.length === 0) {
    return null;
  }
  const hash = [...rival.handle].reduce((suma, caracter) => suma + caracter.charCodeAt(0), 0);
  return liga.orgs[hash % liga.orgs.length].nombre;
}

export function esRivalDeGeneracion(state, liga, orgRival) {
  return state.mundo.rivales.some((rival) => orgDelRival(rival, liga) === orgRival);
}

// Los motivos por los que ESTA fecha, entre todas las del split, tiene algo
// en juego. Puede haber varios a la vez (una revancha contra el puntero
// también sería un clásico); `motivoPrincipal` abajo elige cuál manda para
// filtrar contenido. `parejo` es el único que siempre está disponible como
// red: sin él, una liga sin clásicos ni racha nunca completaría su cupo de
// fechas marcadas.
export function motivosDeFecha(state, liga, fecha, tablaAntes, rachaPropia, indice, totalFechas) {
  const motivos = [];

  // Fase 9R0a: `career.orgs` sólo crece, así que sin este tope toda org por
  // la que pasaste alguna vez quedaba de "clásico" el resto de la carrera.
  // Sólo cuentan tus últimos ex-equipos (el actual nunca aparece como rival
  // en el fixture, así que se filtra para no gastar el cupo).
  const exEquiposRecientes = state.career.orgs
    .filter((org) => org !== state.career.currentOrg)
    .slice(-BALANCE.temporada.clasicoOrgsRecientes);
  if (exEquiposRecientes.includes(fecha.rival)) {
    motivos.push('clasico');
  }

  const puntero = tablaAntes[0];
  if (puntero && puntero.org === fecha.rival && puntero.ganados > 0) {
    motivos.push('puntero');
  }

  if (liga?.formatoPlayoffs && indice === totalFechas - 1) {
    const clasifican = liga.formatoPlayoffs.clasifican;
    const propia = tablaAntes.find((fila) => fila.org === state.career.currentOrg) ?? filaVacia(state.career.currentOrg);
    const siGana = posicionEnTabla(
      [...tablaAntes.filter((fila) => fila.org !== propia.org), { ...propia, ganados: propia.ganados + 1, diferencia: propia.diferencia + 1 }]
        .sort((a, b) => b.ganados - a.ganados || (b.diferencia ?? 0) - (a.diferencia ?? 0)),
      propia.org
    );
    const siPierde = posicionEnTabla(
      [...tablaAntes.filter((fila) => fila.org !== propia.org), { ...propia, perdidos: propia.perdidos + 1, diferencia: propia.diferencia - 1 }]
        .sort((a, b) => b.ganados - a.ganados || (b.diferencia ?? 0) - (a.diferencia ?? 0)),
      propia.org
    );
    if ((siGana <= clasifican) !== (siPierde <= clasifican)) {
      motivos.push('define_clasificacion');
    }
  }

  if (state.career.ultimoEliminadoPor && state.career.ultimoEliminadoPor === fecha.rival) {
    motivos.push('revancha');
  }

  if (rachaPropia <= -BALANCE.temporada.derrotasParaPresion) {
    motivos.push('presion');
  }

  if (esRivalDeGeneracion(state, liga, fecha.rival)) {
    motivos.push('rival_de_generacion');
  }

  return motivos.length > 0 ? motivos : ['parejo'];
}

// Orden de prioridad narrativa para cuando una fecha junta varios motivos a
// la vez: el que manda es el que más se pueda nombrar en una línea de texto.
const PRIORIDAD_MOTIVOS = ['define_clasificacion', 'revancha', 'clasico', 'puntero', 'presion', 'rival_de_generacion', 'parejo'];

export function motivoPrincipal(motivos) {
  return PRIORIDAD_MOTIVOS.find((motivo) => motivos.includes(motivo)) ?? 'parejo';
}

// Cuánto pesa cada fecha para decidir si es una de las 2-3 que se juegan: una
// fecha con un motivo "real" (no `parejo`) siempre pesa más que una pareja de
// pura casualidad, y entre las parejas gana la de fuerza más cercana.
export function puntajeDeFecha(motivos, fecha, fuerzaPropia) {
  const tieneMotivoReal = motivos.some((motivo) => motivo !== 'parejo');
  const cercania = 1 / (1 + Math.abs(fecha.fuerzaRival - fuerzaPropia));
  return tieneMotivoReal ? 10 + motivos.length + cercania : cercania;
}

// El draft corto de una fecha marcada (5.3): más liviano que el Fearless de
// playoffs (no hay quema de campeones acá, es temporada regular). Fase 9Rd:
// mismo criterio que la serie — frena sólo si el mejor campeón te mueve la
// probabilidad de ganar la fecha más que `temporada.puntosEnJuegoParaPreguntar`
// respecto del segundo. Sin contexto de temporada (sondas de validate) o con
// 1-2 campeones, auto-elige el mejor por `factorDeCampeon` y no frena.
export function decisionDeDraftFecha(state) {
  const pool = state.player.championPool;
  if (pool.length === 0) {
    return { pausa: false, elegido: null };
  }

  const [mejor, segundo] = [...pool].sort(
    (a, b) => factorDeCampeon(b, state.meta.weights) - factorDeCampeon(a, state.meta.weights)
  );
  if (pool.length <= 2) {
    return { pausa: false, elegido: mejor };
  }

  const t = state.career?.temporada;
  const fecha = t?.fechaEnCurso;
  if (!fecha || !Number.isFinite(t.fuerzaPropia)) {
    return { pausa: false, elegido: mejor };
  }
  // Una fecha sólo se marca con un motivo real (`continuarTemporada` lo
  // garantiza); si aun así llegara una pareja, nunca frena.
  if (motivoPrincipal(fecha.motivos ?? []) === 'parejo') {
    return { pausa: false, elegido: mejor };
  }

  const campeonDelSplit = pool.find((c) => c.name === state.player.campeonDelSplit) ?? mejor;
  const puntos = probabilidadDeFecha(t, fecha, campeonDelSplit, mejor, state.meta.weights)
    - probabilidadDeFecha(t, fecha, campeonDelSplit, segundo, state.meta.weights);

  return puntos >= BALANCE.temporada.puntosEnJuegoParaPreguntar
    ? { pausa: true }
    : { pausa: false, elegido: mejor };
}

// La probabilidad de ganar la fecha con `elegido`, construida igual que
// `resolverFechaMarcada`: `t.fuerzaPropia` corrida por `factorDraftFecha`
// (relativo al campeón del split) → logística con los σ de `resolverFecha`.
function probabilidadDeFecha(t, fecha, campeonDelSplit, elegido, weights) {
  const fuerzaFecha = t.fuerzaPropia * (1 + factorDraftFecha(elegido, campeonDelSplit, weights));
  return probabilidadDeGanar(fuerzaFecha, fecha.fuerzaRival, BALANCE.temporada.ruidoFecha, BALANCE.temporada.ruidoRivalFecha);
}

// Cuánto mueve la fuerza de ESTA fecha el campeón elegido en el draft corto,
// RELATIVO al que ya asumió `t.fuerzaPropia` (el campeón del split). Fase 9Rc:
// antes usaba solo la afinidad absoluta del elegido, así que elegir el MISMO
// campeón del split igual sumaba un factor ≠ 0 — doble conteo. Ahora es el ratio
// de `factorDeCampeon` menos 1: mismo campeón → exactamente 0. Acotado a
// `impactoDraftFecha`: una fecha de temporada regular no se gana en el draft.
export function factorDraftFecha(elegido, base, weights) {
  if (!elegido) {
    return 0;
  }
  const t = BALANCE.temporada;
  const ratio = factorDeCampeon(elegido, weights) / Math.max(0.001, factorDeCampeon(base, weights));
  return clamp(ratio - 1, -t.impactoDraftFecha, t.impactoDraftFecha);
}

export function factorDelMomento(resultadoTirado) {
  const t = BALANCE.temporada;
  return clamp(resultadoTirado, t.partidoMin, t.partidoMax);
}
