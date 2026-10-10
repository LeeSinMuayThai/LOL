// El cargador de arte (PLANUI §6.2; portado de vitrina/comun/arte.js). Un solo cargador de Data Dragon para el <img>,
// la textura WebGL y el PNG. Las imagenes se piden con CORS (crossOrigin = 'anonymous', verificado el 2026-10-09: splash,
// carga, centrada, tiles e iconos responden `Access-Control-Allow-Origin: *`) para poder dibujarlas en canvas/WebGL.
//   - nunca url() de CSS para el arte (un cacheo mixto contamina el canvas del PNG);
//   - nunca aborta una carga (el recorrido cuenta `requestfailed` como error) y nunca rechaza: sin red resuelve null y
//     la pagina sigue (el tile cae a las iniciales, que ya existe).
// Importarlo no toca el DOM: `new Image()` recien adentro de cargarImagen().
import { VERSION_DDRAGON, BASE_DDRAGON } from '../../data/ddragon.js';

const cache = new Map();

export function cargarImagen(url) {
  if (!url) return Promise.resolve(null);
  if (cache.has(url)) return cache.get(url);
  const promesa = new Promise((resolver) => {
    if (typeof Image !== 'function') {
      resolver(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolver(img);
    img.onerror = () => resolver(null);
    img.src = url;
  });
  cache.set(url, promesa);
  return promesa;
}

// `meta` (opcional): { ddragon: { version, base } } para pisar la version de src/data/ddragon.js.
const base = (meta) => meta?.ddragon?.base ?? BASE_DDRAGON;
const version = (meta) => meta?.ddragon?.version ?? VERSION_DDRAGON;

export const urlSplash = (key, meta) => `${base(meta)}/img/champion/splash/${key}_0.jpg`;
export const urlCarga = (key, meta) => `${base(meta)}/img/champion/loading/${key}_0.jpg`;
export const urlCentrada = (key, meta) => `${base(meta)}/img/champion/centered/${key}_0.jpg`;
export const urlTile = (key, meta) => `${base(meta)}/img/champion/tiles/${key}_0.jpg`;
export const urlIcono = (key, meta) => `${base(meta)}/${version(meta)}/img/champion/${key}.png`;

// Atajo: precarga varias urls en paralelo; resuelve el arreglo de imagenes (null donde fallo).
export function precargar(urls) {
  return Promise.all(urls.map(cargarImagen));
}
