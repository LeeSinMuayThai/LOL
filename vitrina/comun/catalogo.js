// Catalogo COMUN de pantallas y muestras que las tres direcciones deben implementar, para que el indice (lado a lado,
// funciones, antes/despues) pueda apuntar a lo mismo en las tres con un solo hash. Una direccion puede sumar pantallas
// propias, pero estas tienen que existir con estos nombres.
//
// Cada muestra es una clave de muestras.muestras (datos/muestras.json).

export const ERAS = ['pieza', 'academia', 'escenario', 'mundial', 'leyenda'];

// pantalla -> muestras que se pueden mirar en ella ([] = la pantalla no tiene variantes)
export const PANTALLAS = {
  inicio: [],
  decision: ['evento', 'planAmateur', 'serie'],
  temporada: ['cierreAnio', 'swiss', 'mercado', 'firma'],
  cumbre: ['titulo', 'mundial', 'final'],
  eras: [],
};

export const DIRECCIONES = [
  { id: 'a-luz', letra: 'A', nombre: 'LUZ' },
  { id: 'b-nocturno', letra: 'B', nombre: 'NOCTURNO' },
  { id: 'c-pantallas', letra: 'C', nombre: 'PANTALLAS' },
];

// En que pantalla vive cada muestra
export const PANTALLA_DE = Object.fromEntries(
  Object.entries(PANTALLAS).flatMap(([pantalla, ms]) => ms.map((m) => [m, pantalla])),
);

// Arma el hash de la vitrina. extra: { sonido: 1, textos: 'breves', dispositivo: 'celular', panel: 0, ... }
export function hashDe({ pantalla = 'inicio', muestra, era = 'pieza', ...extra } = {}) {
  const p = new URLSearchParams();
  p.set('pantalla', pantalla);
  const m = muestra ?? PANTALLAS[pantalla]?.[0];
  if (m) p.set('muestra', m);
  p.set('era', era);
  p.set('dispositivo', extra.dispositivo ?? 'escritorio');
  for (const [k, v] of Object.entries(extra)) if (k !== 'dispositivo') p.set(k, String(v));
  return p.toString();
}
