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
  cumbre: ['titulo', 'final'],
  eras: [],
};

// Lo que viene en la ronda 2. Ni el panel ni el indice lo muestran todavia.
export const RONDA_2 = {
  decision: ['serie', 'serieReplan'],
  temporada: ['cierreAnio', 'swiss', 'mercado', 'firma'],
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

export const DIRECCIONES = [
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
