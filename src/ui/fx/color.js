// LA POLITICA DEL COLOR DEL CAMPEON (PLANUI §4.6-§4.9, LINEA.md §2; portado de vitrina/fusion/js/color.js). En
// produccion hay UNA politica, `linea` (la curva del usuario); las otras de la vitrina (duotono, real, mitad, capas,
// receta) eran la comparacion y no se portan. El eje es el duotono de la era sobre el arte del campeon, y vive aca:
//   - el mundo (ambiente.js) lo lee a traves de los estados de fondo.js (colorFondo, lavado, colorLugar);
//   - las piezas de interfaz (libres, ranuras, picks, cartas de carga, la costura) se pintan con pintarCampeon();
//   - nadie fija a mano el porcentaje: se lee de aca (mezclaPieza(), los estados de fondo.js).
//
// La curva (LINEA.md §2; 0 = duotono, 1 = color real):
//   inicio   el inicio y la tira de eras: 100 % duotono (siempre; no cambia)
//   juego    las pantallas de juego: las piezas al 65 % de su color real, el arte de fondo al 60 %
//   momento  la firma, el titulo y AFUERA: 70 % en el fondo y en las piezas
// `animoConColor` (PLANUI §4.9, U): ningun animo del mundo saca el color (la caida y el peligro se cuentan con la luz,
// mas oscura y fria): sin eso, AFUERA y el cierre de una serie perdida quedaban casi en blanco y negro.
// Puro salvo pintarCampeon (canvas): corre en Node.
import { duotono } from './util.js';

// Cada estado (0 = duotono, 1 = color real):
//   fondo      el arte de fondo de pantalla completa
//   lavado     cuanto duotono vuelve sobre el arte de fondo a color (en `linea`, 0)
//   pieza      todo campeon que es pieza de interfaz
//   presencia, contraste   multiplican los del fondo (en `linea`, 1)
const DUOTONO = Object.freeze({ fondo: 0, lavado: 0, pieza: 0, presencia: 1, contraste: 1 });
const JUEGO = Object.freeze({ fondo: 0.6, lavado: 0, pieza: 0.65, presencia: 1, contraste: 1 });
const MOMENTO = Object.freeze({ fondo: 0.7, pieza: 0.7 });
export const POLITICA_LINEA = Object.freeze({ ...JUEGO, momento: MOMENTO, animoConColor: true });

export const CONTEXTOS_COLOR = ['inicio', 'juego', 'momento'];
export const CONTEXTO_DEF = 'juego';
const deMomento = (c) => (c.momento ? { ...c, ...c.momento } : DUOTONO);

// La politica de color de un contexto ('inicio' | 'juego' | 'momento'). Un contexto desconocido es 'juego'.
export function colorDe(contexto = CONTEXTO_DEF) {
  if (contexto === 'inicio') return DUOTONO;
  return contexto === 'momento' ? deMomento(POLITICA_LINEA) : POLITICA_LINEA;
}

// Un estado del mundo (fondo.js) con el color: `takeover` va al `momento` de la politica (AFUERA, la firma, el titulo).
export function conColor(estado, c, { takeover = false } = {}) {
  const k = takeover ? deMomento(c) : c;
  return { ...estado, presencia: estado.presencia * k.presencia, contraste: estado.contraste * k.contraste, colorFondo: k.fondo, lavado: k.lavado, colorLugar: k.pieza };
}

// La del contexto montado, para las piezas que se pintan despues (las cartas de carga de cada mapa).
let actual = DUOTONO;
export function fijarColor(contexto) {
  actual = colorDe(contexto);
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
