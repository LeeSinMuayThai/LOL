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
import * as lastHit from '../ui/arcade/lastHit.js';
import * as kite from '../ui/arcade/kite.js';
import * as gancho from '../ui/arcade/gancho.js';
import { BALANCE } from '../data/balance.js';

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

// --- M1: last hit, el kite y el gancho (ola H, entrega 2) ------------------------------------------------------------------
// Last hit: el humano mira la vida del minion y lo que baja por segundo (lo de los últimos `MIRA_LH_S`), suma el tiro de la
// torre si ya salió, y cuando calcula que su mano llega con la vida en `APUNTA_LH` del daño de su auto, decide: la mano llega
// con su tiempo de reacción de esta vez. Bajo la torre pre-golpea si el tiro lo va a dejar todavía arriba del remate.
const MIRA_LH_S = 0.35;
const APUNTA_LH = 0.6;
function humanoLastHit(rng) {
  const A = BALANCE.g1.arcade.last_hit;
  let visto = [];
  let disparaEn = null;
  let anterior = null;
  return (e) => {
    const o = e.objetivo;
    if (!o || !o.vivo || o.t < A.llegaS) { visto = []; disparaEn = null; anterior = null; return null; }
    if (anterior !== o) { anterior = o; visto = []; disparaEn = null; }
    visto.push([e.t, o.hp]);
    if (disparaEn !== null) {
      if (e.t >= disparaEn && e.cd <= 0) { disparaEn = null; return { golpe: true }; }
      return null;
    }
    const viejo = visto.find((v) => v[0] >= e.t - MIRA_LH_S) ?? visto[0];
    const dt = e.t - viejo[0];
    if (dt <= 0) return null;
    const adelanto = RT_MEDIA_MS / 1000;
    const f = A.fases[o.i];
    // el ritmo de los aliados sin contar el tiro de la torre (que es un salto, no un ritmo)
    const ritmo = Math.max(0, (viejo[1] - o.hp) / dt);
    const tiro = o.torre && o.torre.vuelo !== null && o.torre.vuelo < adelanto + 0.1 ? f.torre.danio : 0;
    const hpMano = o.hp - ritmo * adelanto - tiro;
    if (hpMano <= e.p.danio * APUNTA_LH && hpMano > 0) { disparaEn = e.t + rtSegundos(rng); return null; }
    // pre-golpe: el tiro está en camino y, aun después de él, el minion quedaría arriba del remate
    if (f.parcial && o.torre.vuelo !== null && o.torre.vuelo > 0.05 && o.hp > e.p.danio && o.hp - e.p.danio - f.torre.danio > 0 && o.hp - f.torre.danio > e.p.danio && o.torre.vuelo > adelanto * 0.5) {
      disparaEn = e.t + rtSegundos(rng);
    }
    return null;
  };
}
function azarLastHit(rng) {
  let proximo = 0;
  return (e) => {
    if (e.t < proximo) return null;
    proximo = e.t + AZAR_CADA_S[0] + rng() * (AZAR_CADA_S[1] - AZAR_CADA_S[0]);
    return { golpe: true };
  };
}

// El kite: el humano pega cuando el anillo está lleno y el bruiser entra en rango (su mano llega tarde) y mientras el anillo
// se llena corre para el lado que más lo aleja del bruiser sin meterse en una pared. Si ve el aviso de un dash, esquiva de
// costado cuando le llega la reacción. Quieto espera. Cada 0.15 s revisa para dónde corre.
const REVISA_KITE_S = 0.15;
const DISTANCIA_FUGA = 45;
const MARGEN_ESQUIVE = 2;
const DIRS_KITE = 16;
function humanoKite(rng) {
  let disparaEn = null;
  let dirFuga = null;
  let revisaEn = 0;
  let esquivaEn = null;
  let esquiva = null;
  let avisoVisto = false;
  return (e) => {
    const b = e.bruiser;
    const yo = e.yo;
    const d = Math.hypot(b.x - yo.x, b.y - yo.y);
    let ataque = false;
    if (e.anillo >= 1 && d <= kite.RANGO) { if (disparaEn === null) disparaEn = e.t + rtSegundos(rng); } else disparaEn = null;
    if (disparaEn !== null && e.t >= disparaEn) { ataque = true; disparaEn = null; }
    // el dash avisado
    const dash = e.dash;
    if (dash && dash.aviso > 0 && !avisoVisto) { avisoVisto = true; esquivaEn = e.t + rtSegundos(rng); }
    if (!dash || (dash.aviso <= 0 && dash.queda <= 0)) { avisoVisto = false; esquiva = null; esquivaEn = null; }
    if (esquivaEn !== null && e.t >= esquivaEn && dash.dir) {
      const lados = [{ x: -dash.dir.y, y: dash.dir.x }, { x: dash.dir.y, y: -dash.dir.x }];
      const sitio = (l) => Math.min(yo.x + l.x * 12, kite.ANCHO - (yo.x + l.x * 12), yo.y + l.y * 12, kite.ALTO - (yo.y + l.y * 12));
      esquiva = sitio(lados[0]) >= sitio(lados[1]) ? lados[0] : lados[1];
      esquivaEn = null;
    }
    if (esquiva && (dash.aviso > 0 || dash.queda > 0)) return { mover: esquiva, ataque };
    // correr mientras el anillo se llena
    const corre = (e.anillo < 1 && d < DISTANCIA_FUGA) || d < kite.CONTACTO + MARGEN_ESQUIVE;
    if (!corre) { dirFuga = null; return { ataque }; }
    if (dirFuga === null || e.t >= revisaEn) {
      revisaEn = e.t + REVISA_KITE_S;
      let mejor = -Infinity;
      for (let k = 0; k < DIRS_KITE; k += 1) {
        const a = (k / DIRS_KITE) * Math.PI * 2;
        const dx = Math.cos(a);
        const dy = Math.sin(a);
        const nx = Math.max(kite.RADIO, Math.min(kite.ANCHO - kite.RADIO, yo.x + dx * 30));
        const ny = Math.max(kite.RADIO, Math.min(kite.ALTO - kite.RADIO, yo.y + dy * 30));
        const lejos = Math.hypot(nx - b.x, ny - b.y);
        const pared = Math.min(nx, kite.ANCHO - nx, ny, kite.ALTO - ny);
        const puntaje = lejos + 1.0 * Math.min(pared, 30) - 0.4 * Math.hypot(nx - kite.ANCHO / 2, ny - kite.ALTO / 2);
        if (puntaje > mejor) { mejor = puntaje; dirFuga = { x: dx, y: dy }; }
      }
    }
    return { mover: dirFuga, ataque };
  };
}
function azarKite(rng) {
  let proximo = 0;
  let mover = null;
  return (e) => {
    let ataque = false;
    if (e.t >= proximo) {
      proximo = e.t + AZAR_CADA_S[0] + rng() * (AZAR_CADA_S[1] - AZAR_CADA_S[0]);
      const a = rng() * Math.PI * 2;
      mover = { x: Math.cos(a), y: Math.sin(a) };
      ataque = rng() < 0.7;
    }
    return { mover, ataque };
  };
}

// El gancho: el humano elige un rival, le adelanta el tiro (donde va a estar cuando le llegue la mano más lo que tarda el
// gancho, con rebote en los bordes), mira si el camino está libre (los minions sueltos, extrapolados; la pared) y tira con su
// tiempo de reacción. Si los rivales amagan, tira poco después de que invierten. Puntería con un error chico.
const REVISA_GANCHO_S = 0.1;
const ERROR_ANGULO = 0.01;
const SEGURO_TRAS_JUKE_S = 0.55;
const PASO_CAMINO = 4;
const MARGEN_CAMINO = 1.2;
const plegar = (y, lo, hi) => {
  const ancho = hi - lo;
  let v = (y - lo) % (2 * ancho);
  if (v < 0) v += 2 * ancho;
  return lo + (v > ancho ? 2 * ancho - v : v);
};
function humanoGancho(rng) {
  const G = BALANCE.g1.arcade.el_gancho;
  let plan = null;
  let revisaEn = 0;
  return (e) => {
    if (e.gancho) { plan = null; return null; }
    if (plan) {
      if (e.t >= plan.en && e.cd <= 0) { const a = plan.angulo; plan = null; return { angulo: a, tirar: true }; }
      return { angulo: plan.angulo };
    }
    if (e.t < revisaEn || e.cd > 0.3) return null;
    revisaEn = e.t + REVISA_GANCHO_S;
    const rt = rtSegundos(rng);
    const juke = !!G.fases[e.i].juke;
    for (const en of e.enemigos) {
      if (juke && (en.amague > 0 || e.t - en.ultimoCambio > SEGURO_TRAS_JUKE_S)) continue;
      let y = en.y;
      let vuelo = 0;
      for (let k = 0; k < 3; k += 1) {
        y = plegar(en.y + en.vel * (rt + vuelo), G.yMin, G.yMax);
        vuelo = Math.hypot(en.xMeta - gancho.YO_X, y - gancho.YO_Y) / G.velocidad;
      }
      const dx = en.xMeta - gancho.YO_X;
      const dy = y - gancho.YO_Y;
      const largo = Math.hypot(dx, dy);
      const angulo = Math.atan2(dy, dx) + gauss(0, ERROR_ANGULO, rng);
      if (Math.abs(angulo) > G.anguloMaximo) continue;
      let libre = true;
      for (let s = PASO_CAMINO; s < largo && libre; s += PASO_CAMINO) {
        const px = gancho.YO_X + Math.cos(angulo) * s;
        const py = gancho.YO_Y + Math.sin(angulo) * s;
        const tau = rt + s / G.velocidad;
        const pared = gancho.paredEn(e, e.t + tau);
        const obst = [...pared, ...e.minions.map((m) => ({ x: m.x, y: plegar(m.y + m.vy * tau, G.yMin, G.yMax) }))];
        if (obst.some((m) => Math.hypot(m.x - px, m.y - py) <= G.radioMinion + G.radioGancho + MARGEN_CAMINO)) libre = false;
      }
      if (libre) { plan = { en: e.t + rt, angulo }; return { angulo }; }
    }
    return null;
  };
}
function azarGancho(rng) {
  let proximo = 0;
  return (e) => {
    if (e.t < proximo) return null;
    proximo = e.t + AZAR_CADA_S[0] + rng() * (AZAR_CADA_S[1] - AZAR_CADA_S[0]);
    return { angulo: (rng() * 2 - 1) * 1.0, tirar: true };
  };
}

// --- la tabla ------------------------------------------------------------------------------------------------------------
const MECANICAS = [
  { id: 'robar_baron', m: baron, humano: humanoBaron, azar: azarBaron, conVara: true },
  { id: 'dodge', m: esquive, humano: humanoDodge, azar: azarDodge, conVara: false },
  { id: 'last_hit', m: lastHit, humano: humanoLastHit, azar: azarLastHit, conVara: false },
  { id: 'el_kite', m: kite, humano: humanoKite, azar: azarKite, conVara: false },
  { id: 'el_gancho', m: gancho, humano: humanoGancho, azar: azarGancho, conVara: false }
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
