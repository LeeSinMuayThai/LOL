// La prueba de aceptación del arcade (H3k, PLANUI §0.10 H3): las mecánicas rehechas corridas en Node con tres jugadores de
// mentira, sin pantalla (`simular(params, humano, rng)` de `ui/arcade/`).
//   quieto  no toca nada;
//   azar    toca al azar (el Barón: un smite en un momento cualquiera; el dodge: clics a cualquier lado y algún Flash);
//   humano  reacciona con 250 ± 60 ms (normal, con piso): mira lo que hay en pantalla, decide y la mano llega tarde.
// Uso: node src/dev/arcade-humano.js [corridas=1000] [stat=60]
// Imprime la tabla: % que pasa por vara, la ventana de stat 40 a 85 y si 60 Hz y 144 Hz dan lo mismo.

import { mulberry32, gauss } from '../core/rng.js';
import * as baron from '../ui/arcade/baron.js';
import * as esquive from '../ui/arcade/esquive.js';
import { BALANCE } from '../data/balance.js';
import * as combo from '../ui/arcade/combo.js';
import * as corrida from '../ui/arcade/corrida.js';
import * as prueba from '../ui/arcade/prueba.js';

const CORRIDAS = Number(process.env.CORRIDAS ?? process.argv[2]) || 1000;
const STAT = Number(process.argv[3]) || 60;
const RT_MEDIA_MS = 250;
const RT_DESVIO_MS = 60;
const RT_PISO_MS = 120;
const SEMILLA_HUMANO = 7919;

const rtSegundos = (rng) => Math.max(RT_PISO_MS, gauss(RT_MEDIA_MS, RT_DESVIO_MS, rng)) / 1000;

// --- el Barón ------------------------------------------------------------------------------------------------------------
// El humano estima a qué velocidad baja la vida (lo que vio en los últimos `MIRA_S`), suma el golpe grande avisado si cae
// antes de que llegue su mano, y cuando la cuenta da que en 250 ms la vida está en el centro, decide: la mano llega con su
// tiempo de reacción de esta vez.
const MIRA_S = 0.3;
function humanoBaron(rng) {
  let fase = -1;
  let visto = [];
  let disparaEn = null;
  return (e) => {
    const f = e.fase;
    if (f.fin) return null;
    if (f.i !== fase) { fase = f.i; visto = []; disparaEn = null; }
    visto.push([f.t, f.vida]);
    if (disparaEn !== null) {
      if (f.t >= disparaEn) { disparaEn = Infinity; return { smite: true }; }
      return null;
    }
    const viejo = visto.find((v) => v[0] >= f.t - MIRA_S) ?? visto[0];
    const dt = f.t - viejo[0];
    if (dt <= 0) return null;
    const ritmo = (viejo[1] - f.vida) / dt;
    const adelanto = RT_MEDIA_MS / 1000;
    const grande = f.aviso && f.aviso.resta < adelanto ? f.aviso.monto : 0;
    if (f.vida - ritmo * adelanto - grande <= f.centro) disparaEn = f.t + rtSegundos(rng);
    return null;
  };
}
const FASE_MAXIMA_S = 9;
function azarBaron(rng) {
  let fase = -1;
  let en = 0;
  return (e) => {
    const f = e.fase;
    if (f.fin) return null;
    if (f.i !== fase) { fase = f.i; en = rng() * FASE_MAXIMA_S; }
    return f.t >= en ? { smite: true } : null;
  };
}

// --- el dodge ------------------------------------------------------------------------------------------------------------
// El humano, cuando aparece un aviso nuevo, tarda su reacción y después busca el punto seguro más cercano (fuera de todo
// lo que está avisado) y va; si no llega caminando antes del primer golpe, usa el Flash (una vez).
const DIRECCIONES = 16;
const PASO_BUSQUEDA = 1.5;
const BUSQUEDA_MAXIMA = 40;
const MARGEN_SEGURO = 0.6;
function puntoSeguro(e) {
  const amenazas = e.tiros.filter((t) => t.armado && e.t < t.fin);
  const { yo } = e;
  for (let d = 0; d <= BUSQUEDA_MAXIMA; d += PASO_BUSQUEDA) {
    for (let k = 0; k < DIRECCIONES; k += 1) {
      const a = (k / DIRECCIONES) * Math.PI * 2;
      const x = yo.x + Math.cos(a) * d;
      const y = yo.y + Math.sin(a) * d;
      if (x < esquive.RADIO || y < esquive.RADIO || x > esquive.ANCHO - esquive.RADIO || y > esquive.ALTO - esquive.RADIO) continue;
      if (!amenazas.some((t) => esquive.cubre(t, x, y, esquive.RADIO + MARGEN_SEGURO))) return { x, y, d, amenazas };
      if (d === 0) break;
    }
  }
  return null;
}
const VELOCIDAD = 34;
function humanoDodge(rng) {
  const vistos = new Set();
  let planEn = null;
  return (e) => {
    for (const t of e.tiros) if (t.armado && !vistos.has(t)) { vistos.add(t); planEn = e.t + rtSegundos(rng); }
    if (planEn === null || e.t < planEn) return null;
    planEn = null;
    const p = puntoSeguro(e);
    if (!p || p.d === 0) return null;
    const llegaEn = p.d / VELOCIDAD;
    const primero = Math.min(...p.amenazas.filter((t) => esquive.cubre(t, e.yo.x, e.yo.y)).map((t) => t.pega - e.t), Infinity);
    if (e.flash && llegaEn > primero) return { flash: { x: p.x, y: p.y }, ir: { x: p.x, y: p.y } };
    return { ir: { x: p.x, y: p.y } };
  };
}
const AZAR_CADA_S = [0.25, 0.6];
const AZAR_FLASH = 0.05;
function azarDodge(rng) {
  let proximo = 0;
  return (e) => {
    if (e.t < proximo) return null;
    proximo = e.t + AZAR_CADA_S[0] + rng() * (AZAR_CADA_S[1] - AZAR_CADA_S[0]);
    const p = { x: rng() * esquive.ANCHO, y: rng() * esquive.ALTO };
    return rng() < AZAR_FLASH ? { ir: p, flash: p } : { ir: p };
  };
}

// Cada humano tiene su día: un factor de habilidad que multiplica sus errores (1 = el de la media; más, peor). Sin esto todos los
// jugadores serían iguales y la tabla no mostraría que un día se está mejor que otro.
const HABILIDAD_DESVIO = 0.45;
const HABILIDAD_RANGO = [0.4, 2.6];
const habilidad = (rng) => Math.max(HABILIDAD_RANGO[0], Math.min(HABILIDAD_RANGO[1], gauss(1, HABILIDAD_DESVIO, rng)));

// --- el combo (M3) -------------------------------------------------------------------------------------------------------
// Ritmo, no reflejo: el humano ve la nota bajar y la aprieta cuando cruza la línea, con un error de timing que crece cuando
// las notas vienen más juntas, y a veces agarra otra tecla (más seguido cuanto menos tiempo tiene para leerla).
const HC_SIGMA_S = 0.040;
const HC_RAPIDEZ = 0.8;
const HC_GAP_REF = 0.7;
const HC_ERR_BASE = 0.01;
const HC_ERR_RAPIDEZ = 0.12;
function humanoCombo(rng) {
  const dia = habilidad(rng);
  let plan = null;
  return (e) => {
    if (e.estado !== 'combo') { plan = null; return null; }
    const c = e.combo;
    const n = c.notas[c.idx];
    if (!plan || plan.nota !== n) {
      const sigma = dia * HC_SIGMA_S * (1 + HC_RAPIDEZ * (HC_GAP_REF / c.gapS - 1));
      const pErr = dia * HC_ERR_BASE + HC_ERR_RAPIDEZ * Math.max(0, HC_GAP_REF - c.gapS) / HC_GAP_REF;
      const otras = combo.TECLAS.filter((k) => k !== n.k);
      plan = { nota: n, en: n.en + gauss(0, sigma, rng), k: rng() < pErr ? otras[Math.floor(rng() * otras.length)] : n.k, hecho: false };
    }
    if (!plan.hecho && e.t >= plan.en) { plan.hecho = true; return { tecla: plan.k }; }
    return null;
  };
}
const AZAR_COMBO_CADA_S = [0.15, 0.4];
function azarCombo(rng) {
  let proximo = 0;
  return (e) => {
    if (e.t < proximo) return null;
    proximo = e.t + AZAR_COMBO_CADA_S[0] + rng() * (AZAR_COMBO_CADA_S[1] - AZAR_COMBO_CADA_S[0]);
    return { tecla: combo.TECLAS[Math.floor(rng() * combo.TECLAS.length)] };
  };
}

// --- la corrida (M3) -----------------------------------------------------------------------------------------------------
// El humano ve que se juntan (reacción de 250 ms desde que arrancan a converger), estima cuándo llegan (con error), elige el
// centro que más lugares cubre (con error de puntería) y tira la R para que explote cuando ya están juntos. No cuenta con el Flash.
const CORR = BALANCE.g1.arcade.la_corrida;
const HR_SIGMA_LLEGADA_S = 0.24;
const HR_ADELANTO_S = 0.3;
const HR_RUIDO_PUNTO = 2.8;
const HR_DESCUIDO = 0.15; // por la habilidad del día: la probabilidad de no ver la primera junta
function humanoCorrida(rng) {
  const dia = habilidad(rng);
  let engage = -1;
  let vista = -1;
  let plan = null;
  return (e) => {
    if (e.estado !== 'engage') return null;
    const g = e.engage;
    if (g.cast) return null;
    if (g.i !== engage) { engage = g.i; vista = -1; plan = null; }
    if (g.modo !== 'suelto' && g.junta !== vista) {
      vista = g.junta;
      if (g.junta === 1 && rng() < HR_DESCUIDO * dia) return null;
      const faltan = Math.max(...g.rivales.map((r) => Math.hypot(r.x - r.slot.x, r.y - r.slot.y))) / (g.f.v * CORR.juntaK);
      const llegada = e.t + faltan + gauss(0, dia * dia * HR_SIGMA_LLEGADA_S, rng);
      const puntos = g.rivales.map((r) => ({ x: r.slot.x + gauss(0, dia * dia * HR_RUIDO_PUNTO, rng), y: r.slot.y + gauss(0, dia * dia * HR_RUIDO_PUNTO, rng) }));
      let mejor = null;
      for (const c of puntos) {
        const n = puntos.filter((q) => Math.hypot(q.x - c.x, q.y - c.y) <= e.p.radio && !corrida.hayPared(g.paredes, c.x, c.y, q.x, q.y)).length;
        if (!mejor || n > mejor.n) mejor = { n, x: c.x, y: c.y };
      }
      plan = { en: Math.max(g.juntaDesde + rtSegundos(rng), llegada + HR_ADELANTO_S - CORR.castS), x: mejor.x, y: mejor.y };
    }
    if (plan && e.t >= plan.en) {
      const p = plan;
      plan = null;
      if (g.modo !== 'suelto') return { r: { x: p.x, y: p.y } };
    }
    return null;
  };
}
function azarCorrida(rng) {
  let en = -1;
  let engage = -1;
  let donde = null;
  return (e) => {
    if (e.estado !== 'engage') return null;
    const g = e.engage;
    if (g.i !== engage) { engage = g.i; en = rng() * CORR.engageMaxS; donde = { x: CORR.arena.x[0] + rng() * (CORR.arena.x[1] - CORR.arena.x[0]), y: CORR.arena.y[0] + rng() * (CORR.arena.y[1] - CORR.arena.y[0]) }; }
    return !g.cast && g.t >= en ? { r: donde } : null;
  };
}

// --- la prueba (M3) ------------------------------------------------------------------------------------------------------
// El humano ve aparecer un dummy, reacciona (250 ms), calcula el punto de intercepción con la velocidad que le ve (con error) y
// tira; si el tiro no llega antes de que el dummy se vaya, ni lo intenta. Si el dummy da la vuelta en el aire, se pierde el tiro.
const PRU = BALANCE.g1.arcade.la_prueba;
const HP_RUIDO_V = 0.2;
const HP_RUIDO_PUNTO = 2.0;
const HP_REAPUNTA = 0.6;
function humanoPrueba(rng) {
  const dia = habilidad(rng);
  const planes = new Map();
  return (e) => {
    for (const d of e.dummies) if (!planes.has(d.id)) planes.set(d.id, { en: e.t + rtSegundos(rng) });
    if (e.recarga > 0) return null;
    const listo = e.dummies.filter((d) => planes.get(d.id).en <= e.t).sort((a, b) => b.edad - a.edad)[0];
    if (!listo) return null;
    const plan = planes.get(listo.id);
    const vx = listo.vx * (1 + gauss(0, dia * HP_RUIDO_V, rng));
    const vy = listo.vy * (1 + gauss(0, dia * HP_RUIDO_V, rng));
    let T = Math.hypot(listo.x - PRU.yo.x, listo.y - PRU.yo.y) / PRU.velTiro;
    let x = listo.x; let y = listo.y;
    for (let k = 0; k < 4; k += 1) {
      x = listo.x + vx * T;
      y = listo.y + vy * T;
      T = Math.hypot(x - PRU.yo.x, y - PRU.yo.y) / PRU.velTiro;
    }
    if (listo.edad + T > e.p.vida) { plan.en = Infinity; return null; }
    plan.en = e.t + T + HP_REAPUNTA * RT_MEDIA_MS / 1000;
    return { tiro: { x: x + gauss(0, dia * HP_RUIDO_PUNTO, rng), y: y + gauss(0, dia * HP_RUIDO_PUNTO, rng) } };
  };
}
const AZAR_PRUEBA_CADA_S = [0.3, 0.7];
function azarPrueba(rng) {
  let proximo = 0;
  return (e) => {
    if (e.t < proximo) return null;
    proximo = e.t + AZAR_PRUEBA_CADA_S[0] + rng() * (AZAR_PRUEBA_CADA_S[1] - AZAR_PRUEBA_CADA_S[0]);
    return { tiro: { x: PRU.campo.x[0] + rng() * (PRU.campo.x[1] - PRU.campo.x[0]), y: PRU.campo.y[0] + rng() * (PRU.campo.y[1] - PRU.campo.y[0]) } };
  };
}

// --- la tabla ------------------------------------------------------------------------------------------------------------
const MECANICAS = [
  { id: 'robar_baron', m: baron, humano: humanoBaron, azar: azarBaron, conVara: true },
  { id: 'dodge', m: esquive, humano: humanoDodge, azar: azarDodge, conVara: false },
  { id: 'el_combo', m: combo, humano: humanoCombo, azar: azarCombo, conVara: false },
  { id: 'la_corrida', m: corrida, humano: humanoCorrida, azar: azarCorrida, conVara: false },
  { id: 'la_prueba', m: prueba, humano: humanoPrueba, azar: azarPrueba, conVara: false }
];

export { MECANICAS };
export function pasa(mec, quien, vara, stat = STAT, hz = 60) {
  let pasan = 0;
  let suma = 0;
  for (let s = 1; s <= CORRIDAS; s += 1) {
    const params = mec.m.parametros({ stat, vara: mec.conVara ? vara : null, dificultad: 1 });
    const jugador = quien ? quien(mulberry32(SEMILLA_HUMANO * s)) : null;
    const { resultado } = mec.m.simular(params, jugador, mulberry32(s), { hz });
    if (resultado >= vara) pasan += 1;
    suma += resultado;
  }
  return { p: pasan / CORRIDAS, media: suma / CORRIDAS };
}

function mismosA60y144(mec) {
  const N = Math.min(CORRIDAS, 300);
  let distintos = 0;
  for (let s = 1; s <= N; s += 1) {
    const params = mec.m.parametros({ stat: STAT, vara: 0.7, dificultad: 1 });
    const a = mec.m.simular(params, mec.humano(mulberry32(SEMILLA_HUMANO * s)), mulberry32(s), { hz: 60 });
    const b = mec.m.simular(params, mec.humano(mulberry32(SEMILLA_HUMANO * s)), mulberry32(s), { hz: 144 });
    if (a.resultado !== b.resultado || JSON.stringify(a.detalle) !== JSON.stringify(b.detalle)) distintos += 1;
  }
  return { N, distintos };
}

import { pathToFileURL } from 'node:url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pct = (x) => `${(x * 100).toFixed(1)}%`.padStart(6);
  console.log(`arcade-humano · ${CORRIDAS} corridas por celda · stat ${STAT} · humano ${RT_MEDIA_MS}±${RT_DESVIO_MS} ms`);
  console.log('mecánica      quieto@.6  azar@.6   hum@.5   hum@.7   hum@.85  | ventana 40→85      | 60 vs 144 Hz');
  for (const mec of MECANICAS) {
    const q = pasa(mec, null, 0.6);
    const z = pasa(mec, mec.azar, 0.6);
    const h5 = pasa(mec, mec.humano, 0.5);
    const h7 = pasa(mec, mec.humano, 0.7);
    const h85 = pasa(mec, mec.humano, 0.85);
    const v40 = mec.m.ventanaEnSegundos(mec.m.parametros({ stat: 40, vara: 0.7 }));
    const v85 = mec.m.ventanaEnSegundos(mec.m.parametros({ stat: 85, vara: 0.7 }));
    const hz = mismosA60y144(mec);
    console.log(`${mec.id.padEnd(12)}  ${pct(q.p)}    ${pct(z.p)}   ${pct(h5.p)}   ${pct(h7.p)}   ${pct(h85.p)}  | ${(v40 * 1000).toFixed(0)}→${(v85 * 1000).toFixed(0)} ms (+${((v85 / v40 - 1) * 100).toFixed(0)}%) | ${hz.distintos} distintos de ${hz.N}`);
  }
  console.log('objetivo:     ≤5%        ≤20%      ~80±10   ~60±10   ~35±10    | ≥ +25%             | 0 distintos');
}
