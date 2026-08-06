export function mulberry32(seed) {
  let state = seed >>> 0;
  return function () {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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
