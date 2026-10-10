// LA POLITICA DEL COLOR DEL CAMPEON (PLANUI §4.6, segunda vuelta). El usuario: "el blanco y negro, violeta ese que
// tienen… estaba bien para el inicio, pero si estaba siempre iba a ser como un estilo repetitivo. Que esté presente, pero
// no tan fuerte siempre". El eje es el duotono de la era sobre el arte del campeon. Vive aca y en ningun otro lado:
//   - el mundo (ambiente.js) lo lee a traves de los estados de js/fondo.js (colorFondo, lavado, colorLugar);
//   - las piezas de interfaz (libres, ranuras, picks, cartas de carga) se pintan con pintarCampeon();
//   - los quemados leen --pieza-color (main.js la pone en <html>).
//
//   duotono  hoy (por defecto): blanco y negro + la luz de la era, en todos lados.
//   real     "A color": todo campeon con sus colores; la era queda en la luz y en un lavado leve sobre el arte de fondo.
//   mitad    "Mitad": 50 % color real y 50 % duotono, en todos lados.
//   capas    el fondo de pantalla completa en duotono (mas suave); toda pieza de interfaz a color, como en el cliente.
//   receta   (PLANUI §4.7) la de la tercera vuelta, con los numeros del usuario: parte de `mitad` y "los campeones
//            tienen un 15 % mas de color mientras que el fondo un 10 % mas": piezas 65/35, fondo 60/40. Es la base de
//            todas las opciones de §4.7: con `op` en el hash y sin `color`, main.js la usa por defecto.
//   linea    (PLANUI §4.9, "una linea") la receta + los momentos al 70 %: "los campeones con 70% de su color real" en la
//            firma, el titulo y AFUERA. Con `op=linea` y sin `color`, main.js la usa por defecto (colorDeOp).
//
// Lo mismo en todas: el inicio y las eras van siempre en duotono. Los takeovers (CAMPEONES, la firma, AFUERA) tambien,
// salvo en una politica con `momento` (linea): ahi van con su `momento`.
import { duotono } from './util.js';

export const COLORES = ['duotono', 'real', 'mitad', 'capas', 'receta', 'linea'];
export const COLOR_DEF = 'duotono';
// el color por defecto cuando el hash trae una opcion de §4.7 (`op=`)
export const COLOR_OP = 'receta';
// el color por defecto de cada `op`: `linea` lleva la suya; el resto de las opciones, la receta
export const colorDeOp = (op) => (op === 'linea' ? 'linea' : COLOR_OP);
export const normalizarColor = (c) => (COLORES.includes(c) ? c : COLOR_DEF);

// Cada variante (0 = duotono, 1 = color real):
//   fondo      el arte de fondo de pantalla completa (y el video de la Tribuna)
//   lavado     cuanto duotono vuelve sobre el arte de fondo a color (≤ 0,2: el campeon "en la escena", no pegado)
//   pieza      todo campeon que es pieza de interfaz (y la ventana de `fondo=lugar`)
//   presencia, contraste   multiplican los del fondo (capas: el duotono de fondo, mas suave)
export const POLITICAS_COLOR = {
  duotono: { etiqueta: 'Como hoy', linea: 'Blanco y negro con la luz de la era, en todos lados.', fondo: 0, lavado: 0, pieza: 0, presencia: 1, contraste: 1 },
  real: { etiqueta: 'A color', linea: 'Cada campeón con sus colores. La era queda en la luz.', fondo: 1, lavado: 0.18, pieza: 1, presencia: 1, contraste: 1 },
  mitad: { etiqueta: 'Mitad', linea: 'Mitad color, mitad duotono: se reconocen sus colores, llevados a la paleta de la era.', fondo: 0.5, lavado: 0, pieza: 0.5, presencia: 1, contraste: 1 },
  capas: { etiqueta: 'Fondo en duotono, retratos a color', linea: 'El fondo sigue en duotono, más suave; los retratos y las cartas, a color, como en el cliente.', fondo: 0, lavado: 0, pieza: 1, presencia: 0.72, contraste: 0.8 },
  receta: { etiqueta: 'La receta', linea: 'Medio duotono, con un poco más de color: los campeones 65 %, el fondo 60 %.', fondo: 0.6, lavado: 0, pieza: 0.65, presencia: 1, contraste: 1 },
};
// PLANUI §4.9: la receta, y los momentos (firma, titulo, AFUERA) con el 70 % del color real en el fondo y en las piezas
POLITICAS_COLOR.linea = { ...POLITICAS_COLOR.receta, etiqueta: 'Una línea', linea: 'La receta, y los momentos con el 70 % de su color real.', momento: { fondo: 0.7, pieza: 0.7 } };
const DUOTONO = POLITICAS_COLOR.duotono;

// Las pantallas que siempre van en duotono: el inicio y las eras (la demostracion de las cinco luces).
const SIEMPRE_DUOTONO = ['inicio', 'eras'];
// Los momentos de pantalla completa (CAMPEONES, la firma): en duotono, o en el `momento` de la politica si tiene (linea).
const MOMENTOS = ['cumbre/titulo', 'mercado/firma'];
const en = (lista, pantalla, muestra) => lista.includes(pantalla) || lista.includes(`${pantalla}/${muestra ?? ''}`);
// La politica de un momento: la de la variante con su `momento` encima, o el duotono si no tiene.
const deMomento = (c) => (c.momento ? { ...c, ...c.momento } : DUOTONO);

// La politica de color de una pantalla.
export const colorDe = (nombre, pantalla, muestra) => {
  if (en(SIEMPRE_DUOTONO, pantalla, muestra)) return DUOTONO;
  const c = POLITICAS_COLOR[normalizarColor(nombre)];
  return en(MOMENTOS, pantalla, muestra) ? deMomento(c) : c;
};

// Un estado del mundo (js/fondo.js) con el color: `takeover` vuelve al duotono (AFUERA), o al `momento` de la politica.
export function conColor(estado, c, { takeover = false } = {}) {
  const k = takeover ? deMomento(c) : c;
  return { ...estado, presencia: estado.presencia * k.presencia, contraste: estado.contraste * k.contraste, colorFondo: k.fondo, lavado: k.lavado, colorLugar: k.pieza };
}

// La de la pantalla montada, para las piezas que se pintan despues (las cartas de carga de cada mapa).
let actual = DUOTONO;
export function fijarColor(nombre, pantalla, muestra) {
  actual = colorDe(nombre, pantalla, muestra);
  return actual;
}
export const mezclaPieza = () => actual.pieza;

// Pinta un campeon: el duotono de la era de siempre y, encima, su color real con la mezcla pedida (0 = duotono exacto).
export function pintarCampeon(canvas, img, sombra, luz, { foco = [0.5, 0.35], brillo = 1, mezcla = mezclaPieza() } = {}) {
  duotono(img, sombra, luz, canvas.width, canvas.height, { canvas, foco, brillo });
  if (!img || !(mezcla > 0)) return canvas;
  const ctx = canvas.getContext('2d');
  const esc = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
  const w = img.naturalWidth * esc;
  const h = img.naturalHeight * esc;
  ctx.globalAlpha = Math.min(1, mezcla);
  ctx.drawImage(img, (canvas.width - w) * foco[0], (canvas.height - h) * foco[1], w, h);
  ctx.globalAlpha = 1;
  return canvas;
}
