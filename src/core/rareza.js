// Rareza de las decisiones de mejora (PLAN.md §12.4, fase 12e). Puro: cero
// RNG, cero import de `systems/`. La etiqueta (`comun` / `rara`) se DERIVA
// del payoff que el catálogo ya tiene — no es un loot nuevo ni un bonus
// extra. Imagen 3: RARA da +4 contra +3; acá eso es el corte medido sobre
// cada escala nativa (offseason = puntos de preparación concentrados,
// amateur = bloques de ranked, evento = payoff normalizado de 12d).
import { BALANCE } from '../data/balance.js';
import { previaDeOpcion } from './previa.js';

export const EJE_AMATEUR = '¿el ranked o la casa?';
export const EJE_OFFSEASON = '¿entrenar o parar?';
export const EJE_POOL = '¿el main o el meta?';

const CAMINOS = {
  1: 'un camino',
  2: 'dos caminos',
  3: 'tres caminos',
  4: 'cuatro caminos',
  5: 'cinco caminos',
  6: 'seis caminos'
};

// Amateur: el ranked ES la mejora de carrera de esa etapa. Offseason: el
// máximo entre pulir/nuevo/mecánica/macro — descansar no cuenta como
// mejora, y el corte en 4 es el +4 contra +3 de la imagen 3, que el
// catálogo ya tenía (2 rutinas en 4, el resto en 0-3).
export function payoffDeRutina(rutina, pool) {
  const r = rutina.reparto ?? {};
  if (pool === 'amateur') {
    return r.ranked ?? 0;
  }
  return Math.max(r.pulir ?? 0, r.nuevo ?? 0, r.mecanica ?? 0, r.macro ?? 0);
}

export function rarezaDeRutina(rutina, pool) {
  const umbral = BALANCE.rareza.umbral[pool];
  return payoffDeRutina(rutina, pool) >= umbral ? 'rara' : 'comun';
}

export function opcionDesdeRutina(rutina, pool) {
  return {
    id: rutina.id,
    label: rutina.titulo,
    descripcion: rutina.texto,
    rareza: rarezaDeRutina(rutina, pool)
  };
}

// Evento de mejora (`pool_a_cual_le_metes`): rara si alguna consecuencia
// positiva llega a magnitud `alta` (las bandas de 12d). En el catálogo
// real eso parte pulir (media, 4.8 de maestría) de aprender (alta: la
// familia `pool_aprender` no tiene variación y todo [1,2] cae en alta).
export function rarezaDeOpcionEvento(opcion, pesos) {
  const previa = previaDeOpcion(opcion, pesos);
  return previa.some((entrada) => entrada.signo === '+' && entrada.magnitud === 'alta')
    ? 'rara'
    : 'comun';
}

// Encabezado de todo menú generado por sorteo (H10). El eje del dilema
// va en la misma frase, como ya hace mercado.js: "El dado trajo estas
// ofertas. Elegí: ¿la guita o el proyecto?"
export function descripcionDeSorteo(cantidad, eje, extra = '') {
  const caminos = CAMINOS[cantidad] ?? `${cantidad} caminos`;
  const cabeza = `El dado trajo ${caminos}. Elegí: ${eje}`;
  const cola = extra && String(extra).trim() ? ` ${String(extra).trim()}` : '';
  return cabeza + cola;
}
