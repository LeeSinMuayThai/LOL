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
