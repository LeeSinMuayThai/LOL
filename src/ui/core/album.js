// H6 (PLANUI §0.10, "el álbum"): lo que descubriste, en tu navegador. Solo pantalla: el motor no lo lee (regla 1) ni lo guarda
// en `state` (no entra al guardado ni a la huella). Guarda las cartas (`c`) y los eventos (`e`) que viste, con su rareza.
//
// La lógica es pura y vive acá (registrar lo visto, qué es nuevo, el resumen); el `localStorage` queda detrás de un adaptador
// (`{ getItem, setItem }`, el mismo que `almacenamientoLocal()`), y cada lectura y cada escritura van en try/catch: sin
// storage (navegación privada, cuota llena) el juego anda igual y no hay álbum.
//
// La forma guardada: `{ version, vistos: { 'c:<id>': rareza, 'e:<id>': rareza }, carrera: { seed, nuevos: [clave, ...] } }`.
// `carrera` es lo descubierto en la carrera de esa seed (para la línea de la tarjeta final); una seed distinta la reinicia.

export const CLAVE_ALBUM = 'lolero-album';
export const VERSION_ALBUM = 1;
export const RAREZAS = ['comun', 'rara', 'epica', 'legendaria'];
export const NOMBRE_RAREZA = { comun: 'Común', rara: 'Rara', epica: 'Épica', legendaria: 'Legendaria' };

export const claveDe = (tipo, id) => `${tipo}:${id}`;
const rarezaValida = (r) => (RAREZAS.includes(r) ? r : 'comun');

export function albumVacio() {
  return { version: VERSION_ALBUM, vistos: {}, carrera: { seed: null, nuevos: [] } };
}

// Lo que vino del disco puede estar roto o ser de otra versión: se queda con lo que tiene forma y tira el resto.
export function normalizar(crudo) {
  const album = albumVacio();
  if (!crudo || typeof crudo !== 'object' || crudo.version !== VERSION_ALBUM) return album;
  if (crudo.vistos && typeof crudo.vistos === 'object') {
    for (const [clave, rareza] of Object.entries(crudo.vistos)) {
      if (/^[ce]:.+/.test(clave)) album.vistos[clave] = rarezaValida(rareza);
    }
  }
  const carrera = crudo.carrera;
  if (carrera && typeof carrera === 'object' && Array.isArray(carrera.nuevos)) {
    album.carrera = { seed: carrera.seed ?? null, nuevos: carrera.nuevos.filter((c) => typeof c === 'string' && c in album.vistos) };
  }
  return album;
}

// Suma lo que se ve (`items`: [{ tipo: 'c'|'e', id, rareza }]) a una copia del álbum. Devuelve el álbum nuevo y los items que
// nunca habías visto (en el orden en que llegaron, sin repetir). `seed`: la de la carrera en curso.
export function registrar(album, items, seed = null) {
  const siguiente = {
    version: VERSION_ALBUM,
    vistos: { ...album.vistos },
    carrera: album.carrera.seed === seed ? { seed, nuevos: [...album.carrera.nuevos] } : { seed, nuevos: [] }
  };
  const nuevos = [];
  for (const item of items) {
    if (!item || item.id == null) continue;
    const clave = claveDe(item.tipo, item.id);
    if (clave in siguiente.vistos) continue;
    siguiente.vistos[clave] = rarezaValida(item.rareza);
    siguiente.carrera.nuevos.push(clave);
    nuevos.push({ tipo: item.tipo, id: item.id, rareza: siguiente.vistos[clave] });
  }
  return { album: siguiente, nuevos };
}

export const esNuevo = (album, tipo, id) => !(claveDe(tipo, id) in album.vistos);

// "12 de 134" por rareza. `catalogo`: [{ tipo, id, rareza }] con todo lo que se puede descubrir.
export function resumen(album, catalogo) {
  const porRareza = Object.fromEntries(RAREZAS.map((r) => [r, { vistos: 0, total: 0 }]));
  for (const item of catalogo) {
    const r = rarezaValida(item.rareza);
    porRareza[r].total += 1;
    if (claveDe(item.tipo, item.id) in album.vistos) porRareza[r].vistos += 1;
  }
  const vistos = RAREZAS.reduce((s, r) => s + porRareza[r].vistos, 0);
  const total = RAREZAS.reduce((s, r) => s + porRareza[r].total, 0);
  return { porRareza, vistos, total };
}

// Lo de una rareza, para la pantalla: cada item con `visto`.
export function listar(album, catalogo, rareza) {
  return catalogo
    .filter((item) => rarezaValida(item.rareza) === rareza)
    .map((item) => ({ ...item, visto: claveDe(item.tipo, item.id) in album.vistos }));
}

// Lo que descubriste en esta carrera: cuántas cosas nuevas y cuántas legendarias.
export function resumenDeCarrera(album, seed) {
  if (album.carrera.seed !== seed) return { nuevas: 0, legendarias: 0 };
  const nuevas = album.carrera.nuevos.length;
  const legendarias = album.carrera.nuevos.filter((c) => album.vistos[c] === 'legendaria').length;
  return { nuevas, legendarias };
}

// "Descubriste 9 cosas nuevas, 2 legendarias". Nada que decir si no hubo nada nuevo.
export function textoDeCarrera({ nuevas, legendarias }) {
  if (!nuevas) return null;
  const cosas = nuevas === 1 ? 'Descubriste 1 cosa nueva' : `Descubriste ${nuevas} cosas nuevas`;
  if (!legendarias) return cosas;
  return `${cosas}, ${legendarias} ${legendarias === 1 ? 'legendaria' : 'legendarias'}`;
}

// --- El adaptador del storage -----------------------------------------------------------------------------------------

export function almacenamientoDelNavegador() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

// El álbum con su storage. Sin storage (o con uno que tira), anda en memoria: la sesión ve lo "nuevo" y nada persiste.
export function crearAlbum(storage = almacenamientoDelNavegador()) {
  let album = null;
  const cargar = () => {
    if (album) return album;
    try {
      const crudo = storage?.getItem(CLAVE_ALBUM);
      album = normalizar(crudo ? JSON.parse(crudo) : null);
    } catch {
      album = albumVacio();
    }
    return album;
  };
  const guardar = () => {
    try {
      storage?.setItem(CLAVE_ALBUM, JSON.stringify(album));
      return true;
    } catch {
      return false;
    }
  };
  return {
    // Devuelve los items nuevos (los que el álbum no tenía) y los suma.
    registrar(items, seed = null) {
      const r = registrar(cargar(), items, seed);
      album = r.album;
      if (r.nuevos.length > 0 || seed !== null) guardar();
      return r.nuevos;
    },
    esNuevo: (tipo, id) => esNuevo(cargar(), tipo, id),
    vistos: () => Object.keys(cargar().vistos).length,
    resumen: (catalogo) => resumen(cargar(), catalogo),
    listar: (catalogo, rareza) => listar(cargar(), catalogo, rareza),
    resumenDeCarrera: (seed) => resumenDeCarrera(cargar(), seed),
    textoDeCarrera: (seed) => textoDeCarrera(resumenDeCarrera(cargar(), seed))
  };
}

// Uno solo para toda la página (el que usan la decisión, la pantalla del álbum y la tarjeta final).
let compartido = null;
export function albumCompartido() {
  compartido ??= crearAlbum();
  return compartido;
}
