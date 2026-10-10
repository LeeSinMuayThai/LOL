// La luz de la pantalla (PLANUI §5.2, §6.1, §9.2): qué era y qué ánimo muestra el mundo. Puro, sin DOM ni `rng`: corre
// en Node. Reemplaza a `aplicarEstudio` (la luz de estudio de V2-B, `shell.js`): hay un solo escritor de la luz, el
// director (`ui/escena.js`), que la pone en `data-era`/`data-animo` y se la pasa al ambiente.
//
// Lee SOLO la `vista` (lo que la pantalla ya contó), nunca el `store` (regla 4 de §V.3): mientras el relato cuenta un
// split la `vista` no cambia, así que la era tampoco (§12: "quieto durante el relato"). La luz no adelanta el resultado.
import { ventanaVisibleDe } from '../../core/vistaDeCarrera.js';
import { fichaCompleta } from '../../core/ficha.js';
import { TIER_DE_PRIMERA } from '../../core/registro.js';

// Las cinco eras (§5.2, el equipo de luz de cada una vive en tokens.css: --luz-<era>, --contra-<era>).
export const ERAS = Object.freeze(['pieza', 'academia', 'escenario', 'mundial', 'leyenda']);
// Los ánimos que entiende el ambiente (`api.ambiente({ animo })`). La `vista` solo dice `normal` o `peligro`: `gloria` y
// `caida` son de los momentos (el título, la eliminación), que los piden por su gancho.
export const ANIMOS = Object.freeze(['normal', 'peligro', 'gloria', 'caida']);

// Las marcas del amateur que ponen la cabeza en peligro (las mismas que leía `aplicarEstudio`).
const MARCAS_DE_PELIGRO_AMATEUR = Object.freeze(['deuda_sueno', 'riesgo_familiar', 'pc_confiscada']);

// `pieza`: el amateur, sin club (de noche en tu cuarto); `academia`: tier 2 o 3; `escenario`: tier 1; `mundial`: en un
// internacional; `leyenda`: la carrera terminó (la final) o el retiro está en curso. `null` (el inicio): `pieza`. Un pro
// entre contratos sigue en la luz de su último tier (`career.tier` no se borra al quedar libre): la era no parpadea a la
// pieza en cada ventana de pases.
export function eraDe(vista) {
  if (!vista) return 'pieza';
  if (vista.terminado || vista.phase === 'retirado') return 'leyenda';
  if (ventanaVisibleDe(vista) === 'internacional') return 'mundial';
  if (vista.phase === 'amateur' || vista.career?.tier == null) return 'pieza';
  return vista.career.tier === TIER_DE_PRIMERA ? 'escenario' : 'academia';
}

// `peligro`: la mentalidad al límite (la ficha) o, en el amateur, una marca de las de arriba. Si no, `normal`.
export function animoDe(vista) {
  if (!vista || vista.terminado) return 'normal';
  const marcas = vista.contexto?.marcas ?? [];
  const peligroAmateur = vista.phase === 'amateur' && MARCAS_DE_PELIGRO_AMATEUR.some((marca) => marcas.includes(marca));
  if (peligroAmateur) return 'peligro';
  return fichaCompleta(vista)?.mentalidad?.peligro ? 'peligro' : 'normal';
}

// Lo que el director escribe en el documento y le pasa al ambiente.
export function luzDe(vista) {
  return { era: eraDe(vista), animo: animoDe(vista) };
}
