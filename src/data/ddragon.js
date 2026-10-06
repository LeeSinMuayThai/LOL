// Data Dragon: el CDN público de Riot con los íconos y el splash de cada campeón (J9).
// Las imágenes NO viajan con el juego: el navegador del jugador las pide acá y
// `dist/` no crece un byte. Si no cargan (sin red, CDN caído, parche nuevo que
// borró una key), la UI cae al tile geométrico de siempre (`campeonTile.js`,
// `screens/inicio.js`). La key de cada campeón vive explícita en
// `champions.json` (`ddragon`), no se deriva del nombre.
//
// La versión se sube a mano cuando sale un campeón nuevo o se quiere ver su
// arte actualizado: las imágenes de versiones viejas siguen existiendo en el CDN,
// así que dejarla atrás nunca rompe nada. Es presentación pura: el motor no la lee.
export const VERSION_DDRAGON = '16.19.1';
export const BASE_DDRAGON = 'https://ddragon.leagueoflegends.com/cdn';
