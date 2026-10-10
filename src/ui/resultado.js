// El resultado de una carrera, afuera del juego (K1-B, PLAN.md "K1 — decisiones
// de spec"): el texto para compartir, el link que la reproduce y el historial
// local. Puro: la fecha, la URL y el almacenamiento los pasa `app.js`, así
// `validate.js` lo prueba en Node, incluido un `localStorage` que tira: el
// historial es una conveniencia y nunca puede romper la tarjeta.
import { esFechaDeDesafio } from '../core/desafio.js';
import { VERSION_JUEGO } from '../data/version.js';
import { goldenRoadsDeEstado, medallaDeGoldenRoad } from './core/trayectoria.js';

export const NOMBRE_DEL_JUEGO = 'Lolero';
export const CLAVE_HISTORIAL = 'lolcs-historial';
// "Tus últimos resultados": cuántos se guardan. El récord personal vive aparte
// y sobrevive al recorte.
export const MAX_HISTORIAL = 10;
// La forma de lo guardado: si cambia, lo viejo se descarta (no se lee a medias).
const FORMA_HISTORIAL = 1;
const LARGO_FECHA_ISO = 10;

// 1512 -> "1.512" (como se escriben los miles acá). El negativo lleva el signo
// menos tipográfico: es el del potencial que resta.
export function miles(numero) {
  const redondeado = Math.round(Number(numero) || 0);
  const digitos = String(Math.abs(redondeado)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return redondeado < 0 ? `−${digitos}` : digitos;
}

// La fecha del desafío es la del día en UTC: la misma para todos.
export function fechaUTC(fecha) {
  return fecha.toISOString().slice(0, LARGO_FECHA_ISO);
}

// `?desafio=YYYY-MM-DD` de la URL, o `null` si no viene o no es un día que existe.
export function desafioDeBusqueda(busqueda) {
  const fecha = new URLSearchParams(busqueda).get('desafio');
  return esFechaDeDesafio(fecha) ? fecha : null;
}

// El link que reproduce esta carrera: el desafío por su fecha (la seed sale de
// ahí), una carrera libre por su seed. Sin la querystring vieja.
export function linkDeResultado({ seed, desafio }, href) {
  const url = new URL(href);
  url.search = '';
  url.hash = '';
  if (desafio) {
    url.searchParams.set('desafio', desafio);
  } else {
    url.searchParams.set('seed', String(seed));
  }
  return url.toString();
}

export function linkDeEstado(state, href) {
  return linkDeResultado({ seed: state.seed, desafio: state.desafio?.fecha ?? null }, href);
}

// "Lolero · Desafío 2026-10-02 · 1.512 pts · Campeón · v K1 · <link>".
// Fuera del desafío no hay fecha y el link es el de la seed. FASE V (V5): con un Golden Road, la medalla va entre el nivel y la
// versión ("… · Campeón · Golden Road 2031 · v K6d · <link>"); sin ninguno no aparece nada.
export function textoParaCompartir(state, href) {
  const { total, nivel } = state.tarjeta.puntaje;
  const desafio = state.desafio?.fecha ?? null;
  return [
    NOMBRE_DEL_JUEGO,
    desafio ? `Desafío ${desafio}` : null,
    `${miles(total)} pts`,
    nivel.nombre,
    medallaDeGoldenRoad(goldenRoadsDeEstado(state)),
    `v ${VERSION_JUEGO}`,
    linkDeEstado(state, href)
  ].filter(Boolean).join(' · ');
}

// --- El historial local ---

export function historialVacio() {
  return { forma: FORMA_HISTORIAL, entradas: [], record: null };
}

// Lo que se guarda de una carrera terminada. `jugadoEn` es la fecha UTC del día
// en que terminó (la pone la UI). FASE V (V5): `goldenRoads` son los años con Golden Road (`[]` si no hubo ninguno): un logro
// aparte, que no entra al puntaje.
export function entradaDeResultado(state, jugadoEn) {
  const { total, nivel } = state.tarjeta.puntaje;
  return {
    jugadoEn,
    total,
    nivel: nivel.nombre,
    version: VERSION_JUEGO,
    desafio: state.desafio?.fecha ?? null,
    seed: state.seed,
    rol: state.player.role,
    handle: state.player.name,
    intentos: 1,
    goldenRoads: goldenRoadsDeEstado(state)
  };
}

// Las entradas guardadas antes de V5 no traen `goldenRoads`: al leerlas valen `[]` (y lo que no es una lista de años se descarta).
function conGoldenRoads(entrada) {
  const anios = Array.isArray(entrada.goldenRoads) ? entrada.goldenRoads.filter(Number.isInteger) : [];
  return { ...entrada, goldenRoads: anios };
}

function esEntrada(entrada) {
  return entrada !== null && typeof entrada === 'object'
    && Number.isFinite(entrada.total) && Number.isFinite(entrada.seed)
    && typeof entrada.jugadoEn === 'string' && typeof entrada.nivel === 'string'
    && typeof entrada.version === 'string' && typeof entrada.rol === 'string'
    && typeof entrada.handle === 'string'
    && (entrada.desafio === null || esFechaDeDesafio(entrada.desafio))
    && Number.isInteger(entrada.intentos) && entrada.intentos >= 1;
}

// `localStorage` puede no existir, tirar al leerlo o traer basura: todo da vacío.
export function almacenamientoLocal() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function leerHistorial(almacenamiento) {
  try {
    const crudo = almacenamiento.getItem(CLAVE_HISTORIAL);
    if (!crudo) {
      return historialVacio();
    }
    const datos = JSON.parse(crudo);
    if (datos?.forma !== FORMA_HISTORIAL || !Array.isArray(datos.entradas)) {
      return historialVacio();
    }
    return {
      forma: FORMA_HISTORIAL,
      entradas: datos.entradas.filter(esEntrada).slice(0, MAX_HISTORIAL).map(conGoldenRoads),
      record: esEntrada(datos.record) ? conGoldenRoads(datos.record) : null
    };
  } catch {
    return historialVacio();
  }
}

export function guardarHistorial(almacenamiento, historial) {
  try {
    almacenamiento.setItem(CLAVE_HISTORIAL, JSON.stringify(historial));
    return true;
  } catch {
    return false;
  }
}

// El mismo desafío es la misma fecha EN LA MISMA VERSIÓN: con otra versión es
// otro juego, y sus puntajes no se comparan.
function mismoDesafio(a, b) {
  return a.desafio !== null && a.desafio === b.desafio && a.version === b.version;
}

export function mejorDelDesafio(historial, fecha, version = VERSION_JUEGO) {
  return historial.entradas.find((entrada) => mismoDesafio(entrada, { desafio: fecha, version })) ?? null;
}

// Puro: devuelve un historial nuevo. Un desafío repetido no suma filas: queda
// una sola, con el mejor puntaje, los intentos y la fecha del último. Lo más
// reciente va primero.
export function agregarAlHistorial(historial, entrada) {
  const previa = historial.entradas.find((otra) => mismoDesafio(otra, entrada)) ?? null;
  const fila = previa
    ? { ...(entrada.total > previa.total ? entrada : previa), jugadoEn: entrada.jugadoEn, intentos: previa.intentos + 1 }
    : entrada;
  const resto = historial.entradas.filter((otra) => otra !== previa);
  const record = historial.record === null || entrada.total > historial.record.total ? entrada : historial.record;
  return { forma: FORMA_HISTORIAL, entradas: [fila, ...resto].slice(0, MAX_HISTORIAL), record };
}

// La línea de la tarjeta que pone este resultado contra tu marca (regla 13).
// `previo` es el historial ANTES de esta carrera; `null` si no hay contra qué.
export function lineaDeHistorial(previo, entrada) {
  if (entrada.desafio) {
    const anterior = previo.entradas.find((otra) => mismoDesafio(otra, entrada));
    if (!anterior) {
      return 'Primer intento de este desafío en este navegador.';
    }
    const intento = anterior.intentos + 1;
    return entrada.total > anterior.total
      ? `Mejoraste tu marca en este desafío: antes ${miles(anterior.total)} pts. Intento ${intento}.`
      : `Tu mejor en este desafío sigue siendo ${miles(anterior.total)} pts (${anterior.nivel}). Intento ${intento}.`;
  }
  const record = previo.record;
  if (!record) {
    return null;
  }
  return entrada.total > record.total
    ? `Nuevo récord personal: superaste tus ${miles(record.total)} pts.`
    : `Tu récord personal: ${miles(record.total)} pts (${record.nivel}).`;
}
