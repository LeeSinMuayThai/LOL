// La visión (ola H, M2): la lógica de `la_vision`, separada del dibujo. Pura y sin DOM: la corre la parada (cuadro a cuadro,
// con `avanzar`) y `simular`, en Node (`dev/arcade-humano.js`). Las constantes, en `BALANCE.g1.arcade.la_vision`.
//
// El mapa con niebla de guerra. El jungla rival cruza su selva (una cadena de campamentos, de arriba a abajo) y vos tenés pocos
// wards: tenés que ponerlos donde va a aparecer ANTES de que llegue. Las pistas te dicen para qué lado va: un ward lo ve en un
// campamento (de dónde sale), falta un campamento (de ahí viene), una línea empuja (hacia ahí viene a ganquear). Con pistas
// falsas, y cada vez con menos tiempo. La regla es de CONTEO (G1): cada vez que lo cazás cuenta; N = `g1.conteo.la_vision`.

import { BALANCE } from '../../data/balance.js';
import { ventanaPorStat } from '../components/minijuegos/comun.js';
import { PASO_FIJO, correrComoMonitor } from './reloj.js';

const A = BALANCE.g1.arcade.la_vision;
export const CAZAS = BALANCE.g1.conteo.la_vision;
export const FASES = A.fases.length;
// La cadena de campamentos del jungla rival, de arriba (0) a abajo (5), en el minimapa 0-100.
export const CAMPS = [
  { nombre: 'Krugs', x: 46, y: 14 },
  { nombre: 'Rojo', x: 64, y: 16 },
  { nombre: 'Raptors', x: 80, y: 28 },
  { nombre: 'Azul', x: 82, y: 46 },
  { nombre: 'Lobos', x: 74, y: 62 },
  { nombre: 'Gromp', x: 58, y: 76 }
];
const ULTIMO = CAMPS.length - 1;

const faseDe = (i) => Math.min(FASES - 1, Math.floor((i * FASES) / CAZAS));

export function parametros({ stat = 50, vara = null, dificultad = 1 } = {}) {
  return { stat, vara, dificultad, ventana: ventanaPorStat(stat, A.ventanaStat[0], A.ventanaStat[1], dificultad), radio: A.radioWard, wards: A.wards };
}

// La ventana en segundos: lo que el jungla tarda en pasar de un campamento al otro en la última fase (lo que abre el stat).
export function ventanaEnSegundos(p) {
  return A.fases[FASES - 1].tcS * p.ventana;
}

const campDe = (k) => CAMPS[Math.max(0, Math.min(ULTIMO, k))];

// Hacia dónde apunta una pista (+1: baja por la cadena, −1: sube), con lo que se ve: el campamento del ward (`s`) y de dónde
// viene. La usa el humano de `dev/arcade-humano.js` y el panel de pistas.
export function implica(pista, s) {
  if (pista.tipo === 'falta') return Math.sign(s - pista.camp);
  if (pista.tipo === 'empuja') return pista.lado === 'arriba' ? -1 : 1;
  return 0;
}

// `corta`: la chance de que, en una fase que corta, el jungla se quede en el primer paso (no llega adonde esperabas el ward).
function armarCaza(i, p, rng, corta = 0) {
  const f = A.fases[faseDe(i)];
  const dir = rng() < 0.5 ? 1 : -1;
  // `s` entre 1 y 4 (siempre hay un campamento detrás de él) y que le queden al menos 2 pasos por delante
  const permitidos = [1, 2, 3, 4].filter((s) => (dir > 0 ? ULTIMO - s : s) >= 2);
  const s = permitidos[Math.floor(rng() * permitidos.length)];
  const quedaCorto = f.corta && rng() < corta;
  const pasos = quedaCorto ? 1 : Math.min(A.pasosMax, dir > 0 ? ULTIMO - s : s);
  const tc = f.tcS * p.ventana;
  const origen = s; // (el plural con paréntesis del check de textos no distingue `campDe(s)` de "título(s)")
  const ruta = Array.from({ length: pasos + 1 }, (_, k) => s + k * dir);
  const pistas = f.pistas.map((pi) => {
    const verdad = pi.ok;
    const d = verdad ? dir : -dir; // para dónde apunta (de verdad o de mentira)
    const base = { tipo: pi.tipo, ok: pi.ok, en: pi.en * tc, visible: false };
    if (pi.tipo === 'ward') return { ...base, camp: s };
    if (pi.tipo === 'falta') return { ...base, camp: s - d };
    return { ...base, lado: d < 0 ? 'arriba' : 'abajo' };
  });
  return { i, fase: faseDe(i), dir, s, pasos, tc, ruta, pistas, wards: [], quedan: A.wards, t: 0, fin: false, cazado: false, tFin: pasos * tc + A.colaS, pos: { ...campDe(origen) } };
}

export function crear(params, rng) {
  const e = { p: params, rng, t: 0, iCaza: 0, caza: null, espera: 0, cazas: [], terminado: false, eventos: [] };
  // el estilo del jungla rival de esta partida: con `cortaRival.prob` es de los que cortan la ruta, tanto como `cortaRival.p`
  e.corta = rng() < A.cortaRival.prob ? A.cortaRival.p[0] + (A.cortaRival.p[1] - A.cortaRival.p[0]) * rng() : 0;
  e.caza = armarCaza(0, params, rng, e.corta);
  return e;
}

// Dónde está el jungla en el instante `t` de la cacería: de campamento en campamento, y se queda en el último.
export function posicionEn(c, t) {
  const k = Math.min(c.pasos, Math.floor(t / c.tc));
  const u = k >= c.pasos ? 0 : (t - k * c.tc) / c.tc;
  const a = campDe(c.ruta[k]);
  const b = campDe(c.ruta[Math.min(c.pasos, k + 1)]);
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

function cerrarCaza(e, cazado) {
  const c = e.caza;
  c.fin = true;
  c.cazado = cazado;
  e.cazas.push(cazado);
  e.espera = A.resultadoS + A.entreCazasS;
  e.eventos.push({ tipo: cazado ? 'cazado' : 'sePerdio' });
}

// Un paso fijo. `entrada`: `{ ward: { x, y } }` o nada.
export function avanzar(e, entrada = null) {
  if (e.terminado) return;
  e.t += PASO_FIJO;
  const c = e.caza;
  if (c.fin) {
    e.espera -= PASO_FIJO;
    if (e.espera > 0) return;
    if (e.iCaza + 1 >= CAZAS) {
      e.terminado = true;
      e.eventos.push({ tipo: 'final' });
      return;
    }
    e.iCaza += 1;
    e.caza = armarCaza(e.iCaza, e.p, e.rng, e.corta);
    e.eventos.push({ tipo: 'caza', i: e.iCaza, fase: e.caza.fase });
    return;
  }
  c.t += PASO_FIJO;
  for (const pi of c.pistas) {
    if (!pi.visible && c.t >= pi.en) { pi.visible = true; pi.vistaT = c.t; e.eventos.push({ tipo: 'pista', pista: pi }); }
  }
  if (entrada?.ward && c.quedan > 0) {
    c.quedan -= 1;
    c.wards.push({ x: entrada.ward.x, y: entrada.ward.y, desde: c.t, listaEn: c.t + A.colocarS, activo: false });
    e.eventos.push({ tipo: 'ward', x: entrada.ward.x, y: entrada.ward.y });
  }
  c.pos = posicionEn(c, c.t);
  for (const w of c.wards) {
    if (!w.activo && c.t >= w.listaEn) { w.activo = true; e.eventos.push({ tipo: 'wardListo', x: w.x, y: w.y }); }
    if (w.activo && Math.hypot(c.pos.x - w.x, c.pos.y - w.y) <= A.radioWard) {
      cerrarCaza(e, true);
      return;
    }
  }
  if (c.t >= c.tFin) cerrarCaza(e, false);
}

export function resultadoDe(e) {
  return e.cazas.filter(Boolean).length / CAZAS;
}

export function detalleDe(e) {
  return { tipo: 'cazas', cazados: e.cazas.filter(Boolean).length, de: CAZAS, cazas: [...e.cazas] };
}

export function simular(params, humano, rng, { hz = 60 } = {}) {
  const e = crear(params, rng);
  correrComoMonitor(hz, () => e.terminado, () => {
    e.eventos.length = 0;
    avanzar(e, humano ? humano(e) : null);
  });
  return { resultado: resultadoDe(e), detalle: detalleDe(e) };
}
