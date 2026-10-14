// El mundo de cada pieza (PLANUI §0.2, punto 3): lo que la vitrina leía de cada fábrica de pantalla (`arte`, `tono`,
// `costura`, `escena`, `lightsticks`, `encuadre`, `velo`) y `vitrina/fusion/js/main.js` le pasaba al ambiente. En el juego
// el director pone el mundo por defecto de la pieza (`mundoBase`) y la familia de la parada declara lo suyo encima
// (`ctx.mundo.declarar`, el puente de `shell.js`). Puro: sin DOM, corre en Node.
import CAMPEONES from '../../data/champions.json' with { type: 'json' };

const POR_NOMBRE = new Map(CAMPEONES.map((c) => [c.name, c]));

// La clave de Data Dragon de un campeón (por su nombre visible: "K'Sante" -> "KSante"). `null` si no está.
export function claveDe(nombre) {
  return POR_NOMBRE.get(nombre)?.ddragon ?? null;
}

// Los datos del catálogo de un campeón por su clave o su nombre: { name, role, tags, ddragon }.
export function campeonDe(claveONombre) {
  return POR_NOMBRE.get(claveONombre) ?? CAMPEONES.find((c) => c.ddragon === claveONombre) ?? null;
}

// Tu campeón ahora: el del split (lo que jugás este split) o, si no hay, el de más maestría del pool.
export function mainDe(vista) {
  const p = vista?.player;
  if (!p) return null;
  if (p.campeonDelSplit) return claveDe(p.campeonDelSplit);
  const pool = p.championPool ?? [];
  if (pool.length === 0) return null;
  const mejor = pool.reduce((a, c) => ((c.mastery ?? 0) > (a.mastery ?? 0) ? c : a));
  return claveDe(mejor.name);
}

// Tu campeón en la luz del mundo ahora (P1, PLANUI §0.4): justo después de una serie (`serie.postSerie`, hasta que la
// etapa siguiente lo baja) es el del último mapa que jugaste, no el del split: con Fearless cada mapa fue otro y el relato
// de después tiene que verse como el final de la serie. Si no, el de `mainDe`.
export function campeonDeAhora(vista) {
  const se = vista?.serie;
  const ultimo = se?.postSerie ? (se.mapas ?? []).at(-1)?.campeon : null;
  return (ultimo && claveDe(ultimo)) || mainDe(vista);
}

// El mundo de una pieza antes de que su familia declare nada. El inicio lo maneja su pantalla (el champ select); el
// relato y las paradas comunes llevan tu campeón en la luz de la era; la final, también (la leyenda).
export const MUNDO_VACIO = Object.freeze({
  arte: null, pegajosa: false, encuadre: 'derecha', velo: 0.6, tono: null, paleta: null, costura: null, lightsticks: 0,
  escena: null, cruce: null, animo: null
});

export function mundoBase(pieza, vista) {
  if (pieza === 'inicio') return { ...MUNDO_VACIO, encuadre: 'inicio', velo: 0.75 };
  return { ...MUNDO_VACIO, arte: campeonDeAhora(vista) };
}
