// El `localStorage` de la carrera guardada (fase T8, P.2). Separado de
// `core/guardado.js` (que es puro) para que `validate.js`/`simulate.js`
// sigan corriendo en Node sin que este archivo se interponga.
import { serializar, deserializar } from '../core/guardado.js';

const CLAVE = 'lolcs-carrera-guardada';

// `localStorage` puede fallar (navegación privada, cuota llena, política
// del navegador) — nunca deja tirar al juego: se guarda "mejor esfuerzo",
// y si falla, la carrera sigue jugándose igual, solo que sin red de
// seguridad si se recarga la página.
export function guardarCarrera(state, rng, rngUi) {
  try {
    localStorage.setItem(CLAVE, serializar(state, rng, rngUi));
    return true;
  } catch {
    return false;
  }
}

export function hayCarreraGuardada() {
  try {
    return localStorage.getItem(CLAVE) !== null;
  } catch {
    return false;
  }
}

export function cargarCarreraGuardada() {
  try {
    const json = localStorage.getItem(CLAVE);
    return json ? deserializar(json) : null;
  } catch {
    return null;
  }
}

export function borrarCarreraGuardada() {
  try {
    localStorage.removeItem(CLAVE);
  } catch { /* nada que borrar si localStorage no está disponible */ }
}

// El marcador de la página del relato (FASE V, V2-B; PLAN.md §V.5 "Retomar"): `{ seed, inicioDePagina, fotoInicio,
// ultimoCierre, cierreVisto, logs }` (`cierreVisto`: si la tarjeta de `ultimoCierre` se llegó a ver),
// en una clave APARTE de la carrera guardada — la UI no toca `core/guardado.js` ni la forma del
// guardado. Se escribe junto con `guardarCarrera` y se borra junto con `borrarCarreraGuardada`. Al retomar se usa solo si
// es de esta carrera (misma seed, `inicioDePagina <= logs.length` y, si lo trae, el mismo largo de `logs`); si no, la
// página son los últimos beats y la tarjeta de cierre sale sin delta. Mismo trato "mejor esfuerzo" que la carrera.
const CLAVE_VISTA = 'lolcs-vista';

export function guardarVista(marcador) {
  try {
    localStorage.setItem(CLAVE_VISTA, JSON.stringify(conservarNumeroJersey(marcador)));
    return true;
  } catch {
    return false;
  }
}

export function cargarVista() {
  try {
    const json = localStorage.getItem(CLAVE_VISTA);
    const marcador = json ? JSON.parse(json) : null;
    return marcador && typeof marcador === 'object' ? marcador : null;
  } catch {
    return null;
  }
}

export function borrarVista() {
  try {
    localStorage.removeItem(CLAVE_VISTA);
  } catch { /* nada que borrar si localStorage no está disponible */ }
}

/* U2b */
// El dorsal es cosmético: vive en el marcador `lolcs-vista`, nunca en el `state`.
// `app.js` reescribe el marcador entero en cada guardado y no conoce el número: si la seed
// coincide (o el marcador anterior todavía no tenía seed), el número se conserva.
function conservarNumeroJersey(marcador) {
  if (!marcador || typeof marcador !== 'object') return marcador;
  if (Object.prototype.hasOwnProperty.call(marcador, 'numeroJersey')) return marcador;
  const previa = cargarVista();
  const n = previa?.numeroJersey;
  if (!Number.isInteger(n) || n < 1 || n > 99) return marcador;
  if (previa.seed != null && previa.seed !== marcador.seed) return marcador;
  return { ...marcador, numeroJersey: n };
}

export function leerNumeroJersey() {
  const n = cargarVista()?.numeroJersey;
  return Number.isInteger(n) && n >= 1 && n <= 99 ? n : null;
}

export function guardarNumeroJersey(n) {
  const numero = Number(n);
  if (!Number.isInteger(numero) || numero < 1 || numero > 99) return false;
  const actual = cargarVista() ?? {};
  return guardarVista({ ...actual, numeroJersey: numero });
}
