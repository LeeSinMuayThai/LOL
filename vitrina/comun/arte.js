// Un solo cargador de arte (Data Dragon) para toda la vitrina. Las imagenes se piden con CORS
// (crossOrigin='anonymous') para poder dibujarlas en canvas/WebGL. Nunca url() de CSS para el arte.
// Nunca aborta una carga y nunca rechaza: sin red resuelve null y la pagina sigue andando.

const BASE_POR_DEFECTO = 'https://ddragon.leagueoflegends.com/cdn';
const VERSION_POR_DEFECTO = '16.19.1';
const cache = new Map();

export function cargarImagen(url) {
  if (!url) return Promise.resolve(null);
  if (cache.has(url)) return cache.get(url);
  const promesa = new Promise((resolver) => {
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

function base(meta) {
  return meta?.ddragon?.base ?? BASE_POR_DEFECTO;
}
function version(meta) {
  return meta?.ddragon?.version ?? VERSION_POR_DEFECTO;
}

// `meta` es muestras.meta ({ ddragon: { version, base } }); opcional.
export const urlSplash = (key, meta) => `${base(meta)}/img/champion/splash/${key}_0.jpg`;
export const urlCarga = (key, meta) => `${base(meta)}/img/champion/loading/${key}_0.jpg`;
export const urlCentrada = (key, meta) => `${base(meta)}/img/champion/centered/${key}_0.jpg`;
export const urlTile = (key, meta) => `${base(meta)}/img/champion/tiles/${key}_0.jpg`;
export const urlIcono = (key, meta) => `${base(meta)}/${version(meta)}/img/champion/${key}.png`;

// Atajo: precarga varias urls en paralelo; resuelve el arreglo de imagenes (null donde fallo).
export function precargar(urls) {
  return Promise.all(urls.map(cargarImagen));
}
