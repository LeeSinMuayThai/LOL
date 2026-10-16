// La prueba (M3, ola H entrega 2): la lógica de `la_prueba`, separada del dibujo. Pura y sin DOM (la corre la parada con
// `avanzar` y `simular`, en Node). Las constantes, en `BALANCE.g1.arcade.la_prueba`.
//
// El practice tool con el coach del club mirando: dummies que se mueven en patrones y un skillshot que viaja hasta donde
// apuntaste. Hay que pegar la mayor cantidad en ~20 s. Regla de CONTEO (la de hoy): resultado = golpes / `blancos`, y la
// prueba corta apenas llegás a `blancos`. Fases: dummies quietos; en movimiento; con amagues (dan la vuelta sin aviso).
// Acá se mide velocidad y precisión (adelantar el tiro a un blanco que se mueve), no esperar el hueco entre minions.

import { BALANCE } from '../../data/balance.js';
import { ventanaPorStat } from '../components/minijuegos/comun.js';
import { PASO_FIJO, correrComoMonitor } from './reloj.js';

const A = BALANCE.g1.arcade.la_prueba;
export const BLANCOS = A.blancos;
export const FASES = A.fases.length;

const entre = (rng, [a, b]) => a + (b - a) * rng();
const limitar = (x, a, b) => Math.max(a, Math.min(b, x));

export function parametros({ stat = 50, dificultad = 1 } = {}) {
  return { stat, dificultad, vida: ventanaPorStat(stat, A.vidaS[0], A.vidaS[1], dificultad) };
}

// La ventana en segundos: cuánto se queda cada dummy (para medir el stat).
export function ventanaEnSegundos(p) { return p.vida; }

export const faseDeT = (t) => { const k = A.fases.findIndex((f) => t < f.hasta); return k < 0 ? FASES - 1 : k; };

export function crear(params, rng) {
  return { p: params, rng, t: 0, dummies: [], tiros: [], recarga: 0, golpes: 0, disparos: 0, spawnEn: 0.4, fase: 0, terminado: false, eventos: [], serie: 0 };
}

function aparecer(e) {
  const f = A.fases[e.fase];
  let x = 0; let y = 0;
  for (let k = 0; k < 8; k += 1) {
    x = entre(e.rng, A.campo.x);
    y = entre(e.rng, A.campo.y);
    if (!e.dummies.some((d) => Math.hypot(d.x - x, d.y - y) < A.separacion)) break;
  }
  const rapidez = entre(e.rng, f.v);
  const ang = e.rng() * Math.PI * 2;
  const d = {
    id: (e.serie += 1), x, y, vx: Math.cos(ang) * rapidez, vy: Math.sin(ang) * rapidez, edad: 0,
    amagaEn: f.amague ? entre(e.rng, A.amagueEn) : null, amagado: false, tiembla: false
  };
  e.dummies.push(d);
  e.eventos.push({ tipo: 'dummy', id: d.id, x, y });
}

// Un paso fijo. `entrada`: `{ tiro: { x, y } }` o nada.
export function avanzar(e, entrada = null) {
  if (e.terminado) return;
  e.t += PASO_FIJO;
  e.fase = faseDeT(e.t);
  const f = A.fases[e.fase];
  e.recarga = Math.max(0, e.recarga - PASO_FIJO);
  if (entrada?.tiro && e.recarga <= 0) {
    const dx = entrada.tiro.x - A.yo.x;
    const dy = entrada.tiro.y - A.yo.y;
    const d = Math.hypot(dx, dy) || 1;
    e.tiros.push({ x: A.yo.x, y: A.yo.y, vx: (dx / d) * A.velTiro, vy: (dy / d) * A.velTiro, resta: d, dest: { x: entrada.tiro.x, y: entrada.tiro.y } });
    e.recarga = A.recargaS;
    e.disparos += 1;
    e.eventos.push({ tipo: 'tiro', x: entrada.tiro.x, y: entrada.tiro.y });
  }
  for (const d of e.dummies) {
    d.edad += PASO_FIJO;
    if (d.amagaEn !== null && !d.amagado) {
      d.tiembla = d.edad >= d.amagaEn - A.avisoS;
      if (d.edad >= d.amagaEn) {
        d.amagado = true;
        d.tiembla = false;
        const giro = Math.PI * (0.6 + 0.8 * e.rng());
        const c = Math.cos(giro); const s = Math.sin(giro);
        [d.vx, d.vy] = [d.vx * c - d.vy * s, d.vx * s + d.vy * c];
        e.eventos.push({ tipo: 'amague', id: d.id, x: d.x, y: d.y });
      }
    }
    d.x += d.vx * PASO_FIJO;
    d.y += d.vy * PASO_FIJO;
    if (d.x < A.campo.x[0] || d.x > A.campo.x[1]) { d.vx = -d.vx; d.x = limitar(d.x, A.campo.x[0], A.campo.x[1]); }
    if (d.y < A.campo.y[0] || d.y > A.campo.y[1]) { d.vy = -d.vy; d.y = limitar(d.y, A.campo.y[0], A.campo.y[1]); }
  }
  for (const s of e.tiros) {
    const paso = Math.min(s.resta, A.velTiro * PASO_FIJO);
    const n = Math.hypot(s.vx, s.vy);
    s.x += (s.vx / n) * paso;
    s.y += (s.vy / n) * paso;
    s.resta -= paso;
    const d = e.dummies.find((q) => Math.hypot(q.x - s.x, q.y - s.y) <= A.radioDummy + A.radioTiro);
    if (d) {
      e.golpes += 1;
      s.resta = -1;
      e.dummies.splice(e.dummies.indexOf(d), 1);
      e.spawnEn = Math.max(e.spawnEn, e.t + A.reaparecerS);
      e.eventos.push({ tipo: 'golpe', id: d.id, x: d.x, y: d.y, n: e.golpes });
    } else if (s.resta <= 1e-9) {
      e.eventos.push({ tipo: 'fallo', x: s.x, y: s.y });
    }
  }
  e.tiros = e.tiros.filter((s) => s.resta > 1e-9);
  for (const d of e.dummies.filter((q) => q.edad >= e.p.vida)) {
    e.dummies.splice(e.dummies.indexOf(d), 1);
    e.spawnEn = Math.max(e.spawnEn, e.t + A.reaparecerS);
    e.eventos.push({ tipo: 'se_fue', id: d.id, x: d.x, y: d.y });
  }
  if (e.dummies.length < f.dummies && e.t >= e.spawnEn) { aparecer(e); e.spawnEn = e.t + A.reaparecerS; }
  if (e.t >= A.tiempoS || e.golpes >= BLANCOS) { e.terminado = true; e.eventos.push({ tipo: 'final' }); }
}

export const resultadoDe = (e) => Math.min(1, e.golpes / BLANCOS);

export function detalleDe(e) {
  return { tipo: 'blancos', total: BLANCOS, golpes: e.golpes, disparos: e.disparos, tiempo: e.t };
}

export function simular(params, humano, rng, { hz = 60 } = {}) {
  const e = crear(params, rng);
  correrComoMonitor(hz, () => e.terminado, () => {
    e.eventos.length = 0;
    avanzar(e, humano ? humano(e) : null);
  });
  return { resultado: resultadoDe(e), detalle: detalleDe(e) };
}
