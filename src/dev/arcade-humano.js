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
import * as pizarra from '../ui/arcade/pizarra.js';
import * as llamada from '../ui/arcade/llamada.js';
import { BALANCE } from '../data/balance.js';
import * as teleport from '../ui/arcade/teleport.js';
import * as vision from '../ui/arcade/vision.js';

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

// --- M4: las dos de cabeza -------------------------------------------------------------------------------------------------
// Acá el humano no solo reacciona: se equivoca de memoria y de lectura.
//   la pizarra: fija cada par con probabilidad `1 − exp(−vistaPorPar / MEMORIA_S)` (menos por cada cambio de lugar a la
//   vista); lo que no fijó lo busca dando vuelta cartas, y lo que ve en cada intento lo aprende (con `SABE_LO_VISTO`).
//   la llamada: lee bien la situación con la probabilidad de su fase (los señuelos y la prisa confunden) y llama a los
//   `LLAMADA_MEDIA_MS` ms de la señal, con un sesgo propio de la corrida y un desvío por llamada.
const MEMORIA_S = 1.1;
const OLVIDO_POR_MEZCLA = 0.12;
const PENSAR_S = 0.3;
const SABE_LO_VISTO = 0.4;
function humanoPizarra(rng) {
  let fase = -1;
  let sabe = null;
  let proximo = null;
  const aprende = (f, i) => {
    const c = f.cartas[i];
    if (rng() < SABE_LO_VISTO) sabe.get(c.par)[c.lado] = i;
  };
  return (e) => {
    const f = e.fase;
    if (f.i !== fase) { fase = f.i; sabe = null; proximo = null; }
    if (f.estado !== 'juega') return null;
    if (!sabe) {
      sabe = new Map();
      const olvido = BALANCE.g1.arcade.la_pizarra.fases[f.i].mezclas * OLVIDO_POR_MEZCLA;
      const fija = (1 - Math.exp(-(f.vistaS / f.pares) / MEMORIA_S)) * (1 - olvido);
      const recuerda = Array.from({ length: f.pares }, () => rng() < fija);
      for (let par = 0; par < f.pares; par += 1) sabe.set(par, [null, null]);
      f.cartas.forEach((c, i) => { if (recuerda[c.par]) sabe.get(c.par)[c.lado] = i; });
    }
    if (proximo === null) proximo = f.t + PENSAR_S + rtSegundos(rng);
    if (f.t < proximo) return null;
    proximo = null;
    const libre = (i) => f.cartas[i].estado === 'tapada';
    let idx = null;
    if (f.abiertas.length === 1) {
      const c = f.cartas[f.abiertas[0]];
      const otra = sabe.get(c.par)[1 - c.lado];
      if (otra !== null && libre(otra)) idx = otra;
    } else {
      for (const [, [a, b]] of sabe) if (a !== null && b !== null && libre(a) && libre(b)) { idx = a; break; }
    }
    if (idx === null) {
      const conocidas = new Set([...sabe.values()].flat().filter((i) => i !== null));
      const todas = f.cartas.map((_, i) => i).filter(libre);
      const desconocidas = todas.filter((i) => !conocidas.has(i));
      const lista = desconocidas.length ? desconocidas : todas;
      idx = lista[Math.floor(rng() * lista.length)];
    }
    aprende(f, idx);
    return { voltear: idx };
  };
}
const AZAR_PIZARRA_S = [0.25, 0.6];
function azarPizarra(rng) {
  let proximo = 0;
  return (e) => {
    const f = e.fase;
    if (f.estado !== 'juega' || e.t < proximo) return null;
    proximo = e.t + AZAR_PIZARRA_S[0] + rng() * (AZAR_PIZARRA_S[1] - AZAR_PIZARRA_S[0]);
    const libres = f.cartas.map((_, i) => i).filter((i) => f.cartas[i].estado === 'tapada');
    return libres.length ? { voltear: libres[Math.floor(rng() * libres.length)] } : null;
  };
}

const LECTURA = [0.98, 0.9, 0.88];
const LLAMADA_MEDIA_MS = 212;
const SESGO_MS = 38;
const DESVIO_LLAMADA_MS = 44;
function humanoLlamada(rng) {
  const sesgo = gauss(0, SESGO_MS, rng);
  let fase = -1;
  let plan = null;
  return (e) => {
    const f = e.fase;
    if (f.estado === 'entre') return null;
    if (f.i !== fase) {
      fase = f.i;
      const lee = rng() < LECTURA[f.i];
      const otros = [0, 1, 2, 3].filter((i) => i !== f.correcto);
      const objetivo = lee ? f.correcto : (f.senuelos[0] ?? otros[Math.floor(rng() * otros.length)]);
      const ms = Math.max(RT_PISO_MS, LLAMADA_MEDIA_MS + sesgo + gauss(0, DESVIO_LLAMADA_MS, rng));
      plan = { objetivo, en: f.setupS + ms / 1000 };
    }
    return f.t >= plan.en ? { llamar: plan.objetivo } : null;
  };
}
function azarLlamada(rng) {
  let fase = -1;
  let plan = null;
  return (e) => {
    const f = e.fase;
    if (f.estado === 'entre') return null;
    if (f.i !== fase) { fase = f.i; plan = { objetivo: Math.floor(rng() * 4), en: rng() * (f.setupS + e.p.ventanaMs / 1000) }; }
    return f.t >= plan.en ? { llamar: plan.objetivo } : null;
  };
}

// --- el teleport (M2) ----------------------------------------------------------------------------------------------------
// El humano elige la pelea (a veces cae en un cebo, a veces lee mal las barras cuando son dos), el sitio más cercano al centro
// que no sea del lado rival (a veces se tienta con la trampa), y tira el TP cuando estima que la pelea arranca menos lo que
// canaliza: la estimación de cuándo llegan los campeones le sale con ±TP_SD_LLEGADA_S (y a veces se descuida: TP_P_DESCUIDO).
const TP_CANAL_S = 2.2;
const TP_LEE_BARRAS_S = 1.6;
const TP_SD_LLEGADA_S = 0.3;
const TP_P_DESCUIDO = 0.22;
const TP_SD_DESCUIDO_S = 1.1;
const TP_P_CEBO = 0.08;
const TP_RUIDO_BARRAS = 0.13;
const TP_P_TRAMPA = 0.03;
function humanoTeleport(rng) {
  let fase = -1;
  let plan = null;
  return (e) => {
    const f = e.fase;
    if (f.fin || f.canal) return null;
    if (f.i !== fase) { fase = f.i; plan = null; }
    const reales = f.lugares.filter((l) => l.real);
    if (!plan) {
      const decideEn = rtSegundos(rng) + (reales.length > 1 ? TP_LEE_BARRAS_S : 0);
      if (f.t < decideEn) return null;
      let l;
      if (f.lugares.length > reales.length && rng() < TP_P_CEBO) {
        const cebos = f.lugares.filter((x) => !x.real);
        l = cebos[Math.floor(rng() * cebos.length)];
      } else if (reales.length > 1) {
        const vista = reales.map((x) => teleport.ventajaVisible(x, f.t) + gauss(0, TP_RUIDO_BARRAS, rng));
        l = reales[vista[0] >= vista[1] ? 0 : 1];
      } else {
        l = reales[0];
      }
      const sitios = l.sitios.map((_, k) => f.sitios.find((s) => s.id === l.sitios[k].id));
      const seguros = sitios.filter((s) => !s.rival);
      const pool = rng() < TP_P_TRAMPA ? sitios : seguros;
      const cerca = pool.reduce((a, s) => (s.d < a.d ? s : a));
      plan = { sitio: cerca.n, en: l.tIni + e.p.ventanaS / 2 + gauss(0, rng() < TP_P_DESCUIDO ? TP_SD_DESCUIDO_S : TP_SD_LLEGADA_S, rng) - TP_CANAL_S };
    }
    return f.t >= plan.en ? { tp: plan.sitio } : null;
  };
}
const TP_AZAR_MAXIMO_S = 8;
function azarTeleport(rng) {
  let fase = -1;
  let plan = null;
  return (e) => {
    const f = e.fase;
    if (f.fin || f.canal) return null;
    if (f.i !== fase) { fase = f.i; plan = { en: rng() * TP_AZAR_MAXIMO_S, sitio: Math.floor(rng() * f.sitios.length) }; }
    return f.t >= plan.en ? { tp: plan.sitio } : null;
  };
}

// --- la visión (M2) ------------------------------------------------------------------------------------------------------
// El humano lee cada pista con su tiempo de reacción (a veces se le pasa una, a veces la lee al revés), suma para qué lado van,
// y cuando leyó todas decide y pone sus wards adelante del jungla (dos campamentos más allá). Si queda parejo, tapa los dos lados.
const VIS_P_OLVIDO = 0.04;
const VIS_P_LEE_MAL = 0.06;
// una de cada cinco partidas llega distraído (cansado, mirando otra cosa): lee mal casi la mitad de las pistas
const VIS_P_DISTRAIDO = 0.25;
const VIS_P_LEE_MAL_DISTRAIDO = 0.42;
const VIS_DECIDE_S = 0.15;
const VIS_ENTRE_WARDS_S = 0.2;
const VIS_RUIDO_CLICK = 1.5;
function humanoVision(rng) {
  let caza = -1;
  let st = null;
  const pMal = rng() < VIS_P_DISTRAIDO ? VIS_P_LEE_MAL_DISTRAIDO : VIS_P_LEE_MAL;
  const camp = (k) => vision.CAMPS[Math.max(0, Math.min(vision.CAMPS.length - 1, k))];
  return (e) => {
    const c = e.caza;
    if (c.fin) return null;
    if (c.i !== caza) { caza = c.i; st = { leeEn: new Map(), leidas: 0, score: 0, decideEn: null, cola: null }; }
    const s = c.pistas.find((p) => p.tipo === 'ward' && p.visible)?.camp;
    for (const p of c.pistas) {
      if (p.visible && !st.leeEn.has(p)) st.leeEn.set(p, c.t + rtSegundos(rng));
    }
    for (const [p, en] of st.leeEn) {
      if (en === null || c.t < en) continue;
      st.leeEn.set(p, null);
      st.leidas += 1;
      if (p.tipo === 'ward' || rng() < VIS_P_OLVIDO) continue;
      const d = vision.implica(p, s);
      st.score += rng() < pMal ? -d : d;
    }
    if (st.decideEn === null && st.leidas >= c.pistas.length) {
      st.decideEn = c.t + VIS_DECIDE_S;
      const dir = Math.sign(st.score);
      const lugares = dir === 0 ? [s + 2, s - 2] : [s + 2 * dir, s + 3 * dir];
      st.cola = lugares.filter((k) => k >= 0 && k < vision.CAMPS.length);
      if (!st.cola.length) st.cola = [s + 2 * (dir || 1)];
    }
    if (st.decideEn === null || c.t < st.decideEn || !st.cola.length || c.quedan <= 0) return null;
    st.decideEn = c.t + VIS_ENTRE_WARDS_S;
    const k = st.cola.shift();
    const a = camp(k);
    return { ward: { x: a.x + gauss(0, VIS_RUIDO_CLICK, rng), y: a.y + gauss(0, VIS_RUIDO_CLICK, rng) } };
  };
}
const VIS_AZAR_MAXIMO_S = 5;
function azarVision(rng) {
  let caza = -1;
  let plan = [];
  return (e) => {
    const c = e.caza;
    if (c.fin) return null;
    if (c.i !== caza) { caza = c.i; plan = Array.from({ length: 2 }, () => ({ en: rng() * VIS_AZAR_MAXIMO_S, x: rng() * 100, y: rng() * 100 })); }
    const k = plan.findIndex((p) => c.t >= p.en);
    if (k < 0 || c.quedan <= 0) return null;
    const [p] = plan.splice(k, 1);
    return { ward: { x: p.x, y: p.y } };
  };
}

// --- la tabla ------------------------------------------------------------------------------------------------------------
const MECANICAS = [
  { id: 'robar_baron', m: baron, humano: humanoBaron, azar: azarBaron, conVara: true },
  { id: 'dodge', m: esquive, humano: humanoDodge, azar: azarDodge, conVara: false },
  { id: 'la_pizarra', m: pizarra, humano: humanoPizarra, azar: azarPizarra, conVara: false },
  { id: 'la_llamada', m: llamada, humano: humanoLlamada, azar: azarLlamada, conVara: false },
  { id: 'el_teleport', m: teleport, humano: humanoTeleport, azar: azarTeleport, conVara: true },
  { id: 'la_vision', m: vision, humano: humanoVision, azar: azarVision, conVara: false }
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
