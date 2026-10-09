// Catalogo COMUN de pantallas y muestras que las tres direcciones deben implementar, para que el indice (lado a lado,
// funciones, antes/despues) pueda apuntar a lo mismo en las tres con un solo hash. Una direccion puede sumar pantallas
// propias, pero estas tienen que existir con estos nombres.
//
// Cada muestra es una clave de primer nivel de datos/muestras.json (muestras.evento, muestras.titulo, ...). Ninguna trae
// un campo `era`: la era de cada muestra sale de ERA_DE_MUESTRA.

export const ERAS = ['pieza', 'academia', 'escenario', 'mundial', 'leyenda'];

// ALCANCE DE LA RONDA 1. pantalla -> muestras que se pueden mirar en ella ([] = la pantalla no tiene variantes).
// Es lo unico que muestran el panel y el indice.
export const PANTALLAS = {
  inicio: [],
  decision: ['evento', 'planAmateur'],
  partido: ['serie', 'serieReplan', 'swiss'],
  mercado: ['mercado', 'firma'],
  cumbre: ['titulo', 'final'],
  eras: [],
};

// Ronda 1b: finalistas. B · NOCTURNO queda archivada en la ronda 1 (se puede abrir, no crece).
export const FINALISTAS = ['a-luz', 'c-pantallas'];
// Direcciones que el indice muestra por defecto en "lado a lado" y "antes / despues" (B sigue con "mostrar B").
export const VISIBLES_POR_DEFECTO = ['fusion', 'a-luz', 'c-pantallas'];
export const PANTALLAS_RONDA_1 = {
  inicio: [],
  decision: ['evento', 'planAmateur'],
  cumbre: ['titulo', 'final'],
  eras: [],
};
const SOLO_RONDA_1 = ['b-nocturno'];

// Que pantallas/muestras tiene cada direccion: las archivadas, solo las de la ronda 1; el resto, todo PANTALLAS.
export function catalogoDe(direccion) {
  return SOLO_RONDA_1.includes(direccion) ? PANTALLAS_RONDA_1 : PANTALLAS;
}
export function direccionTiene(direccion, pantalla, muestra) {
  const ms = catalogoDe(direccion)[pantalla];
  if (!ms) return false;
  return !muestra || ms.length === 0 || ms.includes(muestra);
}

// Lo que viene en la ronda 2. Ni el panel ni el indice lo muestran todavia.
export const RONDA_2 = {
  temporada: ['cierreAnio'],
  cumbre: ['mundial'],
};

// Era "automatica" de cada muestra (era=auto en el hash): la que le corresponde en la carrera.
// La pantalla `eras` no tiene muestra: con auto usa `pieza` como base.
export const ERA_DE_MUESTRA = {
  inicio: 'pieza',
  planAmateur: 'pieza',
  evento: 'escenario',
  serie: 'escenario',
  serieReplan: 'escenario',
  cierreAnio: 'escenario',
  mercado: 'academia',
  firma: 'academia',
  swiss: 'mundial',
  titulo: 'escenario',
  mundial: 'mundial',
  final: 'leyenda',
};

// Resuelve la era efectiva: una era fija gana; con 'auto' se usa la de la muestra (o la de la pantalla, p. ej. `inicio`).
export function eraEfectiva(era, pantalla, muestra) {
  if (era && era !== 'auto') return era;
  return ERA_DE_MUESTRA[muestra] ?? ERA_DE_MUESTRA[pantalla] ?? ERAS[0];
}

// La fusion (A + C, ronda 2) va primera. Su carpeta puede no existir todavia: verificar.mjs la saltea con un aviso y
// el indice muestra "en construccion".
export const DIRECCIONES = [
  { id: 'fusion', letra: 'A+C', nombre: 'LA FUSIÓN' },
  { id: 'a-luz', letra: 'A', nombre: 'LUZ' },
  { id: 'b-nocturno', letra: 'B', nombre: 'NOCTURNO' },
  { id: 'c-pantallas', letra: 'C', nombre: 'PANTALLAS' },
];

// En que pantalla vive cada muestra (ronda 1). `inicio` es pantalla y muestra a la vez (la usa el "antes / despues").
export const PANTALLA_DE = {
  inicio: 'inicio',
  ...Object.fromEntries(Object.entries(PANTALLAS).flatMap(([pantalla, ms]) => ms.map((m) => [m, pantalla]))),
};

// Arma el hash de la vitrina. era por defecto = 'auto'.
// extra: { sonido: 1, textos: 'breves', dispositivo: 'celular', panel: 0, ... }
export function hashDe({ pantalla = 'inicio', muestra, era = 'auto', ...extra } = {}) {
  const p = new URLSearchParams();
  p.set('pantalla', pantalla);
  const ms = PANTALLAS[pantalla] ?? [];
  const m = ms.includes(muestra) ? muestra : ms[0];
  if (m) p.set('muestra', m);
  p.set('era', era);
  p.set('dispositivo', extra.dispositivo ?? 'escritorio');
  for (const [k, v] of Object.entries(extra)) if (k !== 'dispositivo') p.set(k, String(v));
  return p.toString();
}
