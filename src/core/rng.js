// El ÚNICO cambio de motor de toda la fase T (PLAN.md "T8 — La página como
// página", P.2 el guardado). `.estado()`/`.restaurar(n)` son puramente
// aditivos: el generador en sí no cambia una coma — `state` es la única
// variable que gobierna la secuencia, así que guardarla y devolverla
// reproduce exactamente los mismos próximos números que si nunca se
// hubiera interrumpido. Trampa T1 de PLAN.md: verificado con la huella
// `finAnticipado:splits:soloqElo` sobre ≥12 seeds, restaurando a mitad de
// carrera contra corriéndola de corrido — cero divergencias.
export function mulberry32(seed) {
  let state = seed >>> 0;
  const generar = function () {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  generar.estado = () => state;
  generar.restaurar = (n) => { state = n >>> 0; };
  return generar;
}

export function roll(min, max, rng) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function gauss(mean, stdDev, rng) {
  const u1 = Math.max(Number.EPSILON, rng());
  const u2 = rng();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * stdDev;
}

export function chance(probability, rng) {
  return rng() < probability;
}

export function pick(items, rng) {
  return items[Math.floor(rng() * items.length)];
}

// Sortea `cantidad` elementos distintos sin reponer, sin mutar la lista original.
export function sample(items, cantidad, rng) {
  const restantes = [...items];
  const elegidos = [];

  while (elegidos.length < cantidad && restantes.length > 0) {
    elegidos.push(restantes.splice(Math.floor(rng() * restantes.length), 1)[0]);
  }

  return elegidos;
}

export function weightedPick(items, getWeight, rng) {
  const totalWeight = items.reduce((sum, item) => sum + getWeight(item), 0);
  let cursor = rng() * totalWeight;

  for (const item of items) {
    cursor -= getWeight(item);
    if (cursor <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}
