// El teleport (ola H, M2): la lógica de `el_teleport`, separada del dibujo. Pura y sin DOM: la corre la parada (cuadro a cuadro,
// con `avanzar`) y `simular`, en Node (`dev/arcade-humano.js`). Las constantes, en `BALANCE.g1.arcade.el_teleport`.
//
// El minimapa: se arma una pelea (los campeones van llegando, hay pings y barras de vida). Elegís dónde caer (un ward o un
// minion cerca de la pelea, del lado de los tuyos, no adentro del equipo rival) y cuándo: el TP canaliza `canalS` y se ve, así
// que hay que tirarlo ANTES de que la pelea arranque (anticipar, no reaccionar). Si cae antes de que arranque, te ven el TP; si
// cae después de que terminó, ya no hay nada. Tres fases: una pelea clara; pings que son cebo; dos peleas a la vez y se gana una.
//
// La regla es de DISTANCIA (contrato de G1): d = lo que te alejaste del centro de la pelea + `segundoFuera` por cada segundo
// lejos del mejor momento; vale `resultadoDeDistancia(d, escala)` y la zona dibujada mide `radioQuePasa(vara)`. El resultado
// del minijuego es el PEOR de las tres fases. Lo que ves es lo que pasa.

import { BALANCE } from '../../data/balance.js';
import { resultadoDeDistancia, radioQuePasa } from '../../core/minijuegos.js';
import { ventanaPorStat } from '../components/minijuegos/comun.js';
import { PASO_FIJO, correrComoMonitor } from './reloj.js';

const A = BALANCE.g1.arcade.el_teleport;
// Lo que la escala de distancia suma a la media zona (a esa distancia del centro, el resultado es 0). Lo lee `components/varaG1.js`.
export const MARGEN_DISTANCIA = 4;
// El ancho de la zona, entre estos topes según `macro` (`ventanaPorStat`).
export const ANCHO_ZONA = [6, 14];
export const FASES = A.fases.length;
// el lado rival: la pelea se arma contra el rincón de arriba a la derecha del minimapa (tu base está abajo a la izquierda)
export const HACIA_RIVAL = { x: Math.SQRT1_2, y: -Math.SQRT1_2 };
const CERO_ANGULO = Math.atan2(-HACIA_RIVAL.y, -HACIA_RIVAL.x);
const ABIERTO_ALIADO = 1.2;

const entre = (rng, [a, b]) => a + (b - a) * rng();

export function parametros({ stat = 50, vara = null, dificultad = 1 } = {}) {
  const v = vara ?? A.varaSinG1;
  const ancho = ventanaPorStat(stat, ANCHO_ZONA[0], ANCHO_ZONA[1], dificultad);
  const escala = ancho / 2 + MARGEN_DISTANCIA;
  return {
    stat,
    vara: v,
    dificultad,
    escala,
    radio: radioQuePasa(v, escala),
    ventanaS: ventanaPorStat(stat, A.ventanaS[0], A.ventanaS[1], dificultad)
  };
}

// La ventana en segundos: lo que dura la pelea (el tiempo en que un TP puede caer). Lo que abre el stat.
export function ventanaEnSegundos(p) {
  return p.ventanaS;
}

// Un sitio (ward o minion) a `d` del centro en la dirección `ang`.
function sitio(id, centro, ang, d, tipo, especial) {
  const x = centro.x + Math.cos(ang) * d;
  const y = centro.y + Math.sin(ang) * d;
  return { id, x, y, d, tipo, rival: (x - centro.x) * HACIA_RIVAL.x + (y - centro.y) * HACIA_RIVAL.y > 0, ...especial };
}

function armarSitios(rng, conTrampa) {
  const lista = [];
  const tipo = () => (rng() < 0.5 ? 'ward' : 'minion');
  const bueno = entre(rng, A.buena);
  const abre = (rng() * 2 - 1) * ABIERTO_ALIADO;
  lista.push({ ang: CERO_ANGULO + abre, d: bueno, tipo: tipo(), rol: 'bueno' });
  if (conTrampa) {
    const cerca = entre(rng, A.trampa);
    lista.push({ ang: CERO_ANGULO + Math.PI + (rng() * 2 - 1) * ABIERTO_ALIADO * 0.8, d: cerca, tipo: tipo(), rol: 'trampa' });
  }
  for (let k = 0; k < A.cantidadLejanos; k += 1) {
    lista.push({ ang: rng() * Math.PI * 2, d: entre(rng, A.lejanos), tipo: tipo(), rol: 'lejano' });
  }
  // se mezclan para que el bueno no sea siempre el primero
  for (let k = lista.length - 1; k > 0; k -= 1) {
    const j = Math.floor(rng() * (k + 1));
    [lista[k], lista[j]] = [lista[j], lista[k]];
  }
  return lista;
}

function lejos(a, b, min) {
  return Math.hypot(a.x - b.x, a.y - b.y) >= min;
}

// Una fase: los centros (pelea real o cebo), sus sitios y los tiempos. Todo el azar sale de `rng`, en este orden.
function armarFase(i, p, rng) {
  const cfg = A.fases[i];
  const centros = [];
  const intentar = (cuadrante) => {
    for (let n = 0; n < 40; n += 1) {
      const c = { x: entre(rng, A.centro), y: entre(rng, A.centro) };
      if (cuadrante && !cuadrante(c)) continue;
      if (centros.every((o) => lejos(o, c, A.cebosLejosDe))) return c;
    }
    return { x: entre(rng, A.centro), y: entre(rng, A.centro) };
  };
  const lugares = [];
  const reales = cfg.peleas;
  const signo = rng() < 0.5 ? 1 : -1;
  for (let k = 0; k < reales + cfg.cebos; k += 1) {
    const real = k < reales;
    // con dos peleas reales, cada una en su mitad del mapa (arriba-izquierda / abajo-derecha)
    const c = intentar(reales === 2 && real ? (q) => (k === 0 ? q.x + q.y < 100 : q.x + q.y >= 100) : null);
    centros.push(c);
    const tIni = entre(rng, A.llegadaS);
    const ventaja = real ? entre(rng, A.ventaja) * (reales === 2 ? (k === 0 ? signo : -signo) : 1) : 0;
    const sitios = armarSitios(rng, true).map((s, n) => sitio(`${k}.${n}`, c, s.ang, s.d, s.tipo, { lugar: k, rol: s.rol }));
    lugares.push({ idx: k, centro: c, real, ventaja, gana: ventaja > 0, tIni, tFin: tIni + p.ventanaS, sitios, arrancada: false, terminada: false });
  }
  const todos = lugares.flatMap((l) => l.sitios).map((s, n) => ({ ...s, n }));
  return {
    i,
    t: 0,
    lugares,
    sitios: todos,
    tFinTodo: Math.max(...lugares.filter((l) => l.real).map((l) => l.tFin)),
    canal: null,
    fin: false,
    resultado: null
  };
}

export function crear(params, rng) {
  const e = { p: params, rng, t: 0, iFase: 0, fase: null, espera: 0, fases: [], terminado: false, eventos: [] };
  e.fase = armarFase(0, params, rng);
  return e;
}

// La barra de vida que se ve en la pelea `l` en el instante `t`: la ventaja se abre de a poco (lee de 0 a `leeS`).
export function ventajaVisible(l, t) {
  return l.ventaja * Math.min(1, t / A.leeS);
}

function cerrarFase(e, r) {
  const f = e.fase;
  f.fin = true;
  f.resultado = r;
  e.fases.push(r);
  e.espera = A.entreFasesS;
}

function aterrizar(e) {
  const f = e.fase;
  const s = f.sitios[f.canal.sitio];
  const l = f.lugares[s.lugar];
  const t = f.t;
  const base = { sitio: s.id, t, d: s.d, centro: l.centro };
  let r;
  if (!l.real) r = { ...base, tipo: 'cebo', r: 0, dTotal: s.d };
  else if (t < l.tIni) r = { ...base, tipo: 'temprano', r: 0, dTotal: s.d };
  else if (t > l.tFin) r = { ...base, tipo: 'tarde', r: 0, dTotal: s.d };
  else if (s.rival) r = { ...base, tipo: 'rival', r: 0, dTotal: s.d };
  else if (!l.gana) r = { ...base, tipo: 'perdida', r: 0, dTotal: s.d };
  else {
    const tMejor = l.tIni + (e.p.ventanaS / 2);
    const dTotal = s.d + A.segundoFuera * Math.abs(t - tMejor);
    r = { ...base, tipo: 'distancia', r: resultadoDeDistancia(dTotal, e.p.escala), dTotal, fuera: t - tMejor };
  }
  e.eventos.push({ tipo: 'aterriza', ...r });
  cerrarFase(e, r);
}

// Un paso fijo. `entrada`: `{ tp: n }` (el número del sitio donde querés caer) o nada.
export function avanzar(e, entrada = null) {
  if (e.terminado) return;
  e.t += PASO_FIJO;
  const f = e.fase;
  if (f.fin) {
    e.espera -= PASO_FIJO;
    if (e.espera > 0) return;
    if (e.iFase + 1 >= FASES) {
      e.terminado = true;
      e.eventos.push({ tipo: 'final' });
      return;
    }
    e.iFase += 1;
    e.fase = armarFase(e.iFase, e.p, e.rng);
    e.eventos.push({ tipo: 'fase', i: e.iFase });
    return;
  }
  f.t += PASO_FIJO;
  for (const l of f.lugares) {
    if (!l.real) continue;
    if (!l.arrancada && f.t >= l.tIni) { l.arrancada = true; e.eventos.push({ tipo: 'pelea', lugar: l.idx }); }
    if (!l.terminada && f.t >= l.tFin) { l.terminada = true; e.eventos.push({ tipo: 'termina', lugar: l.idx, gana: l.gana }); }
  }
  if (entrada && entrada.tp !== undefined && entrada.tp !== null && !f.canal && f.sitios[entrada.tp]) {
    f.canal = { sitio: entrada.tp, desde: f.t, hasta: f.t + A.canalS };
    e.eventos.push({ tipo: 'tp', sitio: entrada.tp });
  }
  if (f.canal) {
    if (f.t >= f.canal.hasta) aterrizar(e);
  } else if (f.t > f.tFinTodo + A.finS) {
    cerrarFase(e, { tipo: 'tarde', r: 0, dTotal: null, centro: f.lugares[0].centro, sitio: null });
    e.eventos.push({ tipo: 'sinTp' });
  }
}

export function resultadoDe(e) {
  if (e.fases.length < FASES) return 0;
  return Math.min(...e.fases.map((x) => x.r));
}

// Lo que la parada lee para el "tan cerca" (`components/varaG1.js`). Si en alguna fase no hubo TP útil, el peor es de ese tipo;
// si no, el peor es el de la distancia más grande. `pos` es la distancia total y el `centro` es 0: la zona es 0..radio.
export function detalleDe(e) {
  const peor = e.fases.reduce((a, x) => (a === null || x.r < a.r ? x : a), null) ?? { tipo: 'tarde', r: 0 };
  const base = { escala: e.p.escala, radio: e.p.radio, fases: e.fases.map((x) => ({ tipo: x.tipo, r: x.r, d: x.dTotal })) };
  if (peor.tipo === 'distancia') return { tipo: 'distancia', pos: peor.dTotal, centro: 0, ...base };
  return { ...base, tipo: peor.tipo };
}

export function simular(params, humano, rng, { hz = 60 } = {}) {
  const e = crear(params, rng);
  correrComoMonitor(hz, () => e.terminado, () => {
    e.eventos.length = 0;
    avanzar(e, humano ? humano(e) : null);
  });
  return { resultado: resultadoDe(e), detalle: detalleDe(e) };
}

// Lo que el dibujo y el texto necesitan de la balanza: cuanto canaliza el TP y cuanto cuesta cada segundo lejos del mejor momento.
export const CANAL_S = A.canalS;
export const SEGUNDO_FUERA = A.segundoFuera;
