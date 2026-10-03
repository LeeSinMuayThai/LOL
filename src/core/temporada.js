import { clamp, clampStat } from './numeros.js';
import { factorDeCampeon } from './ajusteMeta.js';
import { ligaOZonaDeCarrera } from './competicion.js';
import { jugarPartido, probabilidadDePartido } from './partido.js';
import { rondaInicial } from './serie.js';
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

// Round-robin por el método del círculo, repetido `vueltas` veces (K2b:
// `BALANCE.temporada.vueltas`; 1 = una sola vuelta, como hasta K2a). Con N
// equipos (siempre par en las ligas y zonas del juego) cada vuelta da N-1
// jornadas, cada equipo contra cada otro exactamente una vez y sin fechas
// libres; la vuelta siguiente repite los mismos cruces en el mismo orden con
// la localía invertida (ida y vuelta). Puro y determinista: NO consume `rng` —
// el fixture no depende de cuándo se lo mira, igual que el calendario que
// reemplaza. Devuelve el calendario del jugador (misma forma de siempre:
// `{ jornada, rival, fuerzaRival, local }`, con `jornada` corrida entre
// vueltas) y, por jornada, los cruces que NO lo involucran.
export function generarFixture(liga, propiaNombre, vueltas = BALANCE.temporada.vueltas) {
  if (!liga || !Array.isArray(liga.orgs) || liga.orgs.length < 2) {
    return { calendario: [], cruces: [] };
  }

  const equipos = liga.orgs;
  const n = equipos.length;
  const mitad = Math.floor(n / 2);
  const calendario = [];
  const cruces = [];

  for (let vuelta = 0; vuelta < vueltas; vuelta += 1) {
    // La vuelta par es la de ida; la impar invierte la localía de cada cruce.
    const invertida = vuelta % 2 === 1;
    // Posiciones 0..n-1: la 0 queda fija y el resto rota una posición por
    // jornada. En cada jornada se enfrentan pos[i] y pos[n-1-i]. Con n impar
    // (no debería pasar) el último "equipo" es un hueco y ese rival tiene
    // fecha libre esa jornada. Cada vuelta arranca de la misma rotación.
    const pos = equipos.map((_, i) => i);

    for (let r = 0; r < n - 1; r += 1) {
      const crucesJornada = [];
      for (let i = 0; i < mitad; i += 1) {
        const primero = equipos[pos[i]];
        const segundo = equipos[pos[n - 1 - i]];
        if (!primero || !segundo) {
          continue;
        }
        const a = invertida ? segundo : primero;
        const b = invertida ? primero : segundo;
        if (a.nombre === propiaNombre || b.nombre === propiaNombre) {
          const rival = a.nombre === propiaNombre ? b : a;
          // `local` = sos vos el primero del par. No cambia ninguna fórmula
          // (no hay ventaja de localía en la p del partido), solo le da un
          // valor coherente al campo que el calendario ya traía.
          calendario.push({ jornada: vuelta * (n - 1) + r + 1, rival: rival.nombre, fuerzaRival: rival.fuerza, local: a.nombre === propiaNombre });
        } else {
          crucesJornada.push({ local: a.nombre, visitante: b.nombre, fuerzaLocal: a.fuerza, fuerzaVisitante: b.fuerza });
        }
      }
      cruces.push(crucesJornada);
      pos.splice(1, 0, pos.pop());
    }
  }

  return { calendario, cruces };
}

// El calendario del jugador, derivado del fixture. Misma firma y misma forma
// de retorno que antes: `systems/temporada.js` y los checks no cambian.
export function generarCalendario(state) {
  return generarFixture(ligaOZonaDeCarrera(state), state.career.currentOrg).calendario;
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
// así todas las filas de la tabla avanzan juntas (deuda D38, familia D21).
// K2b: cada cruce es UNA tirada contra su p (`jugarPartido`, tipo `fecha`, sin
// jugador: `state` = null), igual que tus fechas.
export function aplicarCrucesDeJornada(registrosOtros, crucesJornada, rng) {
  let registros = registrosOtros;
  for (const cruce of crucesJornada) {
    const ganaLocal = jugarPartido(null, cruce.fuerzaLocal, cruce.fuerzaVisitante, 'fecha', rng).gano;
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

// K4-A (PLAN.md "K4 — decisiones de spec", K4-A): la fecha que frena es la que
// DECIDE algo, no la primera con cualquier motivo. Son cuatro, en este orden de
// prioridad, y a lo sumo una por split (la de mayor prioridad; a igual
// prioridad, la primera). `puntero`, `presion` y el rival de generación dejaron
// de marcar: medido, el cupo se gastaba en ellos y el partido que define la
// clasificación salía 0,1 veces por carrera (D62).
export const PRIORIDAD_MOTIVOS = ['define_clasificacion', 'archirrival', 'clasico', 'revancha'];

// Las victorias reales de cada org al arrancar la fecha `t.indice`.
function victoriasActuales(t) {
  return Object.fromEntries([
    [t.filaPropia.org, t.filaPropia.ganados],
    ...Object.values(t.registrosOtros).map((fila) => [fila.org, fila.ganados])
  ]);
}

// Las victorias ESPERADAS de cada org en cada jornada que falta (de `t.indice`
// al final): la p de cada cruce, ajeno o tuyo, sumada en vez de tirada. Es una
// proyección: pura, sin `rng`, la misma sobre el mismo estado.
function victoriasEsperadasPorJornada(state, t) {
  const jornadas = [];
  for (let k = t.indice; k < t.calendario.length; k += 1) {
    const fecha = t.calendario[k];
    const pPropia = probabilidadDePartido(state, t.fuerzaPropia, fecha.fuerzaRival, 'fecha');
    const esperadas = { [t.filaPropia.org]: pPropia, [fecha.rival]: 1 - pPropia };
    for (const cruce of t.cruces?.[k] ?? []) {
      const pLocal = probabilidadDePartido(null, cruce.fuerzaLocal, cruce.fuerzaVisitante, 'fecha');
      esperadas[cruce.local] = pLocal;
      esperadas[cruce.visitante] = 1 - pLocal;
    }
    jornadas.push(esperadas);
  }
  return jornadas;
}

// La ronda con la que arrancarías los playoffs (`rondaInicial`: 'semis' con
// bye, 'cuartos', o `null` si no entrás) con estas victorias finales. Empate en
// victorias: gana tu fila, como en `tablaDePosiciones` (tu fila va primero).
function rondaConVictorias(victorias, orgPropia, formato) {
  const propias = victorias[orgPropia];
  const delante = Object.entries(victorias).filter(([org, v]) => org !== orgPropia && v > propias).length;
  return rondaInicial(delante + 1, { byes: formato.byes ?? 0, clasifican: formato.clasifican });
}

// ¿Esta fecha decide algo? Con la tabla de hoy y el fixture que falta, se
// proyecta el final del split dos veces —ganando la fecha y perdiéndola— y se
// mira con qué ronda terminás en cada caso. Decide si las dos rondas difieren:
// entrar o no a playoffs, o el bye a semis (el sembrado). Devuelve
// `{ siGana, siPierde }` (rondas) o `null` si no decide nada, si la liga no
// tiene playoffs o si falta más de `ventanaDefineClasificacion` fechas: antes de
// eso la proyección es una sola cuenta de esperanzas y decir "de este partido
// depende" sería mentirle al jugador.
export function defineClasificacion(state, liga, t, indice = t.indice) {
  const formato = liga?.formatoPlayoffs;
  if (!formato || indice < t.calendario.length - BALANCE.temporada.ventanaDefineClasificacion) {
    return null;
  }
  return evaluarFecha(proyeccionDelSplit(state, t), indice - t.indice, t, formato);
}

// ¿Alguna fecha DESPUÉS de la de ahora decide algo, según la proyección de hoy?
// Una fecha de menor prioridad (el archirrival, un clásico) no gasta el cupo del
// split si una de mayor prioridad se ve venir. Si la proyección falla (los
// resultados cambiaron la tabla), el cupo queda libre para las que sigan.
export function defineClasificacionMasAdelante(state, liga, t) {
  const formato = liga?.formatoPlayoffs;
  if (!formato) {
    return false;
  }
  const proyeccion = proyeccionDelSplit(state, t);
  const desde = Math.max(t.indice + 1, t.calendario.length - BALANCE.temporada.ventanaDefineClasificacion);
  for (let j = desde; j < t.calendario.length; j += 1) {
    if (evaluarFecha(proyeccion, j - t.indice, t, formato)) {
      return true;
    }
  }
  return false;
}

function proyeccionDelSplit(state, t) {
  return { base: victoriasActuales(t), esperadas: victoriasEsperadasPorJornada(state, t) };
}

// El final proyectado con la jornada `offset` (relativa a `t.indice`) resuelta
// por una rama —ganás o perdés—: tu fecha y la de tu rival pasan a ser un
// resultado, el resto del fixture sigue en esperanza.
function evaluarFecha({ base, esperadas }, offset, t, formato) {
  const orgPropia = t.filaPropia.org;
  const rival = t.calendario[t.indice + offset].rival;
  const rondaSi = (gana) => {
    const finales = { ...base };
    esperadas.forEach((jornada, i) => {
      for (const [org, valor] of Object.entries(jornada)) {
        if (i !== offset || (org !== orgPropia && org !== rival)) {
          finales[org] = (finales[org] ?? 0) + valor;
        }
      }
    });
    finales[orgPropia] += gana ? 1 : 0;
    finales[rival] = (finales[rival] ?? 0) + (gana ? 0 : 1);
    return rondaConVictorias(finales, orgPropia, formato);
  };
  const siGana = rondaSi(true);
  const siPierde = rondaSi(false);
  return siGana !== siPierde ? { siGana, siPierde } : null;
}

// Los motivos por los que ESTA fecha decide algo. Pueden ser varios a la vez;
// `motivoPrincipal` elige el de mayor prioridad. `parejo` es el "no marca": una
// fecha sin ninguno de los cuatro pasa resumida. `t` es la temporada en curso
// (`career.temporada`) y `fecha` la que toca (`t.calendario[t.indice]`).
export function motivosDeFecha(state, liga, fecha, t, definicion = defineClasificacion(state, liga, t)) {
  const motivos = [];

  if (definicion) {
    motivos.push('define_clasificacion');
  }

  if (state.mundo?.archirrival?.org === fecha.rival) {
    motivos.push('archirrival');
  }

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

  if (state.career.ultimoEliminadoPor && state.career.ultimoEliminadoPor === fecha.rival) {
    motivos.push('revancha');
  }

  return motivos.length > 0 ? motivos : ['parejo'];
}

export function motivoPrincipal(motivos) {
  return PRIORIDAD_MOTIVOS.find((motivo) => motivos.includes(motivo)) ?? 'parejo';
}

// Qué pasa con tus playoffs según la ronda de cada rama de `defineClasificacion`.
// Dos frases por rama: ganar y perder no dicen lo mismo con la misma ronda
// (ganar y entrar sin más / perder y quedar afuera).
function consecuenciaDeGanar(ronda, siPierde) {
  if (ronda === 'semis') {
    return 'pasás directo a semis';
  }
  return siPierde === null ? 'entrás a playoffs' : 'arrancás en cuartos';
}

function consecuenciaDePerder(ronda) {
  if (ronda === 'semis') {
    return 'pasás directo a semis';
  }
  return ronda === 'cuartos' ? 'arrancás en cuartos' : 'te quedás afuera';
}

// K4-A: la línea de por qué esta fecha frena, para la previa. Texto para
// mostrar: sin ids, con los nombres de la fecha. `null` si no hay fecha marcada
// en curso. Lee el estado de la pausa (nada avanza mientras dura), así que no
// hace falta guardarlo.
export function textoPorQueImporta(state) {
  const t = state.career?.temporada;
  const fecha = t?.fechaEnCurso;
  if (!fecha) {
    return null;
  }
  const motivo = motivoPrincipal(fecha.motivos ?? []);
  if (motivo === 'define_clasificacion') {
    const definicion = defineClasificacion(state, ligaOZonaDeCarrera(state), t);
    if (!definicion) {
      return 'De este partido depende tu lugar en los playoffs.';
    }
    const ganar = consecuenciaDeGanar(definicion.siGana, definicion.siPierde);
    const perder = consecuenciaDePerder(definicion.siPierde);
    // En la última fecha es un hecho; antes, es lo que dice la tabla hoy.
    return t.indice === t.calendario.length - 1
      ? `Si ganás, ${ganar}. Si perdés, ${perder}.`
      : `Con la tabla como viene: si ganás, ${ganar}; si perdés, ${perder}.`;
  }
  if (motivo === 'archirrival') {
    return `Es contra el equipo de tu archirrival: ahí juega ${state.mundo.archirrival.handle}.`;
  }
  if (motivo === 'clasico') {
    return `Es contra ${fecha.rival}, tu ex equipo: contra ellos siempre pesa distinto.`;
  }
  if (motivo === 'revancha') {
    return `Es la revancha: ${fecha.rival} te eliminó la última vez que se cruzaron.`;
  }
  return null;
}

// La probabilidad de ganar la fecha con `elegido`, construida igual que
// `resolverFechaMarcada`: `t.fuerzaPropia` corrida por `factorDraftFecha`
// (relativo al campeón del split) → la misma p con la que el motor tira la
// fecha (`probabilidadDePartido`, regla 15).
// K2d: es la misma función con la que la fecha marcada se tira y con la que la
// previa la muestra (`probabilidadDeFechaMarcada`).
function probabilidadDeFecha(state, fecha, campeonDelSplit, elegido, ajustePartido = 0) {
  const fuerzaFecha = fuerzaDeFecha(state.career.temporada.fuerzaPropia, elegido, campeonDelSplit, state.meta.weights, ajustePartido);
  return probabilidadDePartido(state, fuerzaFecha, fecha.fuerzaRival, 'fecha');
}

// K2d: el campeón del split como entrada del pool (`null` si no está), contra
// el que `factorDraftFecha` mide el campeón de la fecha.
export function campeonDelSplitEnPool(state) {
  return state.player.championPool.find((c) => c.name === state.player.campeonDelSplit);
}

// K2d: la p de la fecha marcada en curso (`temporada.fechaEnCurso`), con el
// campeón que eligió el draft corto y el `ajustePartido` del momento (por
// defecto, los del estado). ES la p que tira `resolverFechaMarcada` y la que
// muestra la previa (regla 15).
export function probabilidadDeFechaMarcada(state, {
  elegido = state.career.temporada.fechaEnCurso.campeonElegido ?? null,
  ajustePartido = state.career.temporada.ajustePartido ?? 0
} = {}) {
  return probabilidadDeFecha(state, state.career.temporada.fechaEnCurso, campeonDelSplitEnPool(state), elegido, ajustePartido);
}

// La fuerza con la que se juega UNA fecha: la del split (`t.fuerzaPropia`,
// determinista) corrida por el campeón del draft corto (relativo al del split)
// y por el momento de la fecha marcada. Una sola expresión para el motor y
// para el draft.
export function fuerzaDeFecha(fuerzaPropia, elegido, campeonDelSplit, weights, ajustePartido) {
  return fuerzaPropia * (1 + factorDraftFecha(elegido, campeonDelSplit, weights) + ajustePartido);
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

// K2b: el rendimiento del split que leen las consecuencias (hype, jerarquía,
// arraigo, el "Tu rendimiento: N/100" de `systems/rendimiento.js`) lo cuentan
// TUS partidos de temporada regular, sin dado propio. `resultados` acumula,
// por cada fecha que jugaste (las de baja por lesión no: el equipo jugó sin
// vos), la p declarada y el resultado: `{ fechas, ganados, esperados, varianza }`
// con `esperados = Σp` y `varianza = Σp(1−p)`. z = (ganados − esperados)/√varianza
// es cuánto mejor o peor te fue de lo que tu fuerza prometía; el rendimiento es
// el base (sin acotar) más `puntosPorDesvioDeResultados` × z, acotado a 0-100.
// Sin fechas (o con todas las p en 0 o 1), z = 0 y queda el base. Pura.
export function rendimientoDeLaTemporada(rendimientoBaseDelSplit, resultados) {
  return clampStat(rendimientoBaseDelSplit + BALANCE.rendimiento.puntosPorDesvioDeResultados * zDeResultados(resultados));
}

// La z de arriba, sola: cuántos desvíos mejor (o peor) te fue de lo que tu
// fuerza prometía. K3-A la lee también para la base del hype
// (`core/barras.js#baseDeHype`). Sin fechas, 0. Pura.
export function zDeResultados(resultados) {
  const desvio = Math.sqrt(resultados.varianza);
  return desvio > 0 ? (resultados.ganados - resultados.esperados) / desvio : 0;
}

export function resultadosVacios() {
  return { fechas: 0, ganados: 0, esperados: 0, varianza: 0 };
}

export function sumarResultado(resultados, { gano, p }) {
  return {
    fechas: resultados.fechas + 1,
    ganados: resultados.ganados + (gano ? 1 : 0),
    esperados: resultados.esperados + p,
    varianza: resultados.varianza + p * (1 - p)
  };
}
