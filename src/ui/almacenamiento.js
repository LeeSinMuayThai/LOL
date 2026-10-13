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
    localStorage.setItem(CLAVE_VISTA, JSON.stringify(marcador));
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

/* PLANUI §0.2 */
// "Textos: breves | completos" (PLANUI §7.5): una preferencia de la vista, en su propia clave (no es de una carrera).
// `breves` por defecto. Con `completos`, `html[data-textos="completos"]` muestra la prosa entera de cada parada.
const CLAVE_TEXTOS = 'lolcs-textos';
const TEXTOS = ['breves', 'completos'];

export function textosDeLaVista() {
  try {
    const guardado = localStorage.getItem(CLAVE_TEXTOS);
    return TEXTOS.includes(guardado) ? guardado : 'breves';
  } catch {
    return 'breves';
  }
}

export function guardarTextosDeLaVista(valor) {
  const elegido = TEXTOS.includes(valor) ? valor : 'breves';
  try {
    localStorage.setItem(CLAVE_TEXTOS, elegido);
  } catch { /* sin almacenamiento la preferencia dura lo que dura la página */ }
  return elegido;
}

// El número de tu jersey (la compuerta 2 del mercado, PLANUI §2): cosmético, vive en el marcador `lolcs-vista` junto a la
// página, nunca en el `state` (la huella y la versión del guardado no cambian). Es de una carrera: se lee solo si el
// marcador es de esa seed. 1-99.
const NUMERO_MIN = 1;
const NUMERO_MAX = 99;
const numeroValido = (n) => Number.isInteger(n) && n >= NUMERO_MIN && n <= NUMERO_MAX;

export function leerNumeroJersey(seed) {
  const marcador = cargarVista();
  if (!marcador || (seed != null && marcador.seed !== seed)) return null;
  return numeroValido(marcador.numeroJersey) ? marcador.numeroJersey : null;
}

export function guardarNumeroJersey(seed, numero) {
  if (!numeroValido(numero)) return false;
  const marcador = cargarVista();
  if (!marcador || marcador.seed !== seed) return false;
  return guardarVista({ ...marcador, numeroJersey: numero });
}
