// G4b (PLANUI §0.9, "promesas que se pagan"): alguien del entorno te promete algo con plazo y el motor lo cuenta.
//
// `career.promesas = [{ id, estado: 'abierta'|'cumplida'|'rota', texto, progreso, vence, ... }]`. Hay una abierta a la vez;
// las resueltas quedan en la lista como historia. `texto` y `progreso` son strings listos para mostrar. El contenido de cada
// promesa (quién la hace, cuándo puede abrirse, plazo, condición y pago como rangos; la promesa rota no castiga) vive en
// `data/events/promesas.json`; acá solo está la cuenta.
//
// Dónde corre: justo antes de `resumenAnio` en `ETAPAS_SPLIT`, con `escena` ya escrita: así el diario del año
// (`core/temporadaResumen.js`) ve la promesa que se resolvió este año.
//
// Cuándo gasta `rng`: solo al abrir una (en el cierre de año, con una promesa elegible y nada abierto) y al pagar o castigar.
// Un split sin nada de eso no le cuesta ni un `rng()` a nadie (regla de proceso 10).
//
// Al retiro: `resolverAlRetiro` (la llama `core/pipeline.js` cuando la carrera termina) rompe lo que haya quedado abierto,
// sin castigo: ninguna promesa se queda abierta para siempre.

import promesasData from '../data/events/promesas.json' with { type: 'json' };
import { crearLog } from '../core/log.js';
import { roll, chance, pick } from '../core/rng.js';
import { clampStat } from '../core/numeros.js';
import { entero, faltan } from '../core/formato.js';
import { puntosAbsolutos, puntosDelApice } from '../core/ranked.js';
import { tierPorId } from '../data/ranked.js';
import { BALANCE } from '../data/balance.js';
import { esCierreDeEdad } from './edadCierre.js';

export const id = 'promesas';

export const PROMESAS = promesasData;

const definicion = (promesaId) => PROMESAS.find((p) => p.id === promesaId) ?? null;

export function promesasDe(state) {
  return Array.isArray(state.career.promesas) ? state.career.promesas : [];
}

export function promesaAbierta(state) {
  return promesasDe(state).find((p) => p.estado === 'abierta') ?? null;
}

// Los puntos absolutos de entrar a un tier de soloQ. Los tiers con división van por escalón; el ápice arranca donde terminan
// (`puntosDelApice`, el mismo piso de Máster).
function puntosDeTier(tierId) {
  const tier = tierPorId(tierId);
  if (tier.apice) {
    return puntosDelApice();
  }
  return tier.orden * BALANCE.ranked.divisionesPorTier * BALANCE.ranked.lpPorDivision;
}

function ordenDeTier(tierId) {
  return tierPorId(tierId)?.orden ?? 0;
}

function rellenar(plantilla, vars) {
  return String(plantilla).replace(/\{(\w+)\}/g, (_, clave) => String(vars[clave] ?? ''));
}

function varsDe(p, extra = {}) {
  return { quien: p.quien, org: p.org ?? 'tu club', edadLimite: p.edadLimite, plazoAnios: p.plazoAnios, ...extra };
}

// --- Cuándo puede abrirse ---

function puedeAbrirse(state, def) {
  const a = def.abre;
  const { career, player } = state;
  if (!a.fases.includes(state.phase)) {
    return false;
  }
  if (a.edadMin != null && state.age < a.edadMin) {
    return false;
  }
  if (a.edadMax != null && state.age > a.edadMax) {
    return false;
  }
  if (a.rankMinTier && puntosAbsolutos(player.ranked) < puntosDeTier(a.rankMinTier)) {
    return false;
  }
  if (a.rankMaxTier && ordenDeTier(player.ranked.tier) > ordenDeTier(a.rankMaxTier)) {
    return false;
  }
  if (a.sinTier && career.tier != null) {
    return false;
  }
  if (a.tierMax != null && (career.tier == null || career.tier > a.tierMax)) {
    return false;
  }
  if (a.conOrg && !career.currentOrg) {
    return false;
  }
  if (a.arraigoMin != null && career.arraigo < a.arraigoMin) {
    return false;
  }
  if (a.arraigoMax != null && career.arraigo > a.arraigoMax) {
    return false;
  }
  if (a.sinInternacional && career.registro.internacionales.length > 0) {
    return false;
  }
  return true;
}

// --- La cuenta de cada condición ---

function titulosDeLiga(state, org) {
  return state.career.registro.titulos.filter((titulo) => titulo.org === org && titulo.tier !== 'amateur').length;
}

// `{ cumplida, rota, progreso }` de la promesa abierta `p` contra el estado de hoy (sin el vencimiento: eso lo cierra quien llama).
function evaluar(state, p, def) {
  const c = def.condicion;
  const { career, player } = state;
  const ligadaAOrg = def.abre.conOrg && (c.tipo === 'titulo' || c.tipo === 'arraigo');
  if (ligadaAOrg && career.currentOrg !== p.org) {
    return { cumplida: false, rota: `Te fuiste de ${p.org}.`, progreso: `te fuiste de ${p.org}` };
  }
  if (c.tipo === 'rank') {
    const falta = puntosDeTier(c.tier) - puntosAbsolutos(player.ranked);
    return { cumplida: falta <= 0, rota: null, progreso: falta > 0 ? faltan(entero(falta), 'LP', 'LP') : 'listo' };
  }
  if (c.tipo === 'tier') {
    const ok = career.tier != null && career.tier <= c.tierMax;
    const progreso = career.tier == null ? 'todavía sin contrato' : `seguís en tier ${career.tier}`;
    return { cumplida: ok, rota: null, progreso: ok ? 'listo' : progreso };
  }
  if (c.tipo === 'titulo') {
    const nuevos = titulosDeLiga(state, p.org) - p.base;
    return { cumplida: nuevos > 0, rota: null, progreso: nuevos > 0 ? 'listo' : `todavía sin título con ${p.org}` };
  }
  if (c.tipo === 'arraigo') {
    const falta = c.valor - career.arraigo;
    return { cumplida: falta <= 0, rota: null, progreso: falta > 0 ? faltan(entero(Math.ceil(falta)), 'punto de arraigo', 'puntos de arraigo') : 'listo' };
  }
  if (c.tipo === 'internacional') {
    const ok = career.registro.internacionales.length > p.base;
    return { cumplida: ok, rota: null, progreso: ok ? 'listo' : 'todavía sin Mundial' };
  }
  return { cumplida: false, rota: null, progreso: '' };
}

function conQuedan(progreso, quedan) {
  const tiempo = quedan <= 0 ? 'último año' : `${quedan} ${quedan === 1 ? 'año' : 'años'}`;
  return `${progreso} · ${tiempo}`;
}

// --- Pago ---

// Aplica un bloque `{ hype: [min, max], arraigo: [min, max] }` y devuelve el estado y las líneas "+9 hype".
function aplicarEfectos(state, efectos, rng) {
  let next = state;
  const partes = [];
  for (const [campo, [min, max]] of Object.entries(efectos ?? {})) {
    const delta = Math.round(roll(min, max, rng));
    if (campo === 'hype') {
      next = { ...next, player: { ...next.player, stats: { ...next.player.stats, hype: clampStat(next.player.stats.hype + delta) } } };
    } else if (campo === 'arraigo') {
      next = { ...next, career: { ...next.career, arraigo: clampStat(next.career.arraigo + delta) } };
    }
    partes.push(`${delta >= 0 ? '+' : ''}${delta} ${campo}`);
  }
  return { state: next, resumen: partes.join(', ') };
}

function reemplazar(state, promesa) {
  const promesas = promesasDe(state).map((p) => (p.id === promesa.id && p.estado === 'abierta' ? promesa : p));
  return { ...state, career: { ...state.career, promesas } };
}

function logDe(mensaje, p, estado, resumen) {
  const completo = resumen ? `${mensaje} (${resumen})` : mensaje;
  return crearLog('promesa', completo, { promesaId: p.id, estado });
}

// --- El sistema ---

export function aplicar(state, rng) {
  let next = state;
  const logs = [];
  const anio = state.calendario.anio;
  const cierre = esCierreDeEdad(state);
  const abierta = promesaAbierta(state);

  if (abierta) {
    const def = definicion(abierta.id);
    if (def) {
      const veredicto = evaluar(state, abierta, def);
      const vencida = cierre && anio >= abierta.vence;
      if (veredicto.cumplida) {
        const pagado = aplicarEfectos(next, def.pago, rng);
        next = pagado.state;
        const hecha = { ...abierta, estado: 'cumplida', progreso: 'cumplida', resueltaEn: anio, resueltaSplit: state.player.splitCount };
        next = reemplazar(next, hecha);
        logs.push(logDe(rellenar(def.lineaCumple, varsDe(abierta, { tier: state.career.tier })), abierta, 'cumplida', pagado.resumen));
      } else if (veredicto.rota || vencida) {
        // "Se paga, o se cuenta que no": una promesa rota no te saca nada (vos no la elegiste); queda el titular.
        const castigado = { state: next, resumen: '' };
        next = castigado.state;
        const rota = { ...abierta, estado: 'rota', progreso: veredicto.rota ? veredicto.progreso : 'se pasó el plazo', resueltaEn: anio, resueltaSplit: state.player.splitCount };
        next = reemplazar(next, rota);
        logs.push(logDe(rellenar(def.lineaRompe, varsDe(abierta)), abierta, 'rota', castigado.resumen));
      } else {
        const progreso = conQuedan(veredicto.progreso, abierta.vence - anio);
        if (progreso !== abierta.progreso) {
          next = reemplazar(next, { ...abierta, progreso });
        }
      }
    }
  }

  if (!cierre || promesaAbierta(next) || state.phase === 'retirado') {
    return { state: next, logs };
  }
  const historial = promesasDe(next);
  const enfriamiento = BALANCE.promesas.enfriamientoAnios * BALANCE.edad.splitsPorEdad;
  if (historial.some((p) => state.player.splitCount - (p.resueltaSplit ?? -Infinity) < enfriamiento)) {
    return { state: next, logs };
  }
  const elegibles = PROMESAS.filter((def) => !historial.some((p) => p.id === def.id) && puedeAbrirse(next, def));
  if (elegibles.length === 0 || !chance(BALANCE.promesas.chanceAbrir, rng)) {
    return { state: next, logs };
  }
  const def = pick(elegibles, rng);
  const nueva = abrir(next, def, anio);
  return {
    state: { ...next, career: { ...next.career, promesas: [...historial, nueva] } },
    logs: [...logs, logDe(rellenar(def.lineaAbre, varsDe(nueva)), nueva, 'abierta', null)]
  };
}

function abrir(state, def, anio) {
  const org = def.abre.conOrg ? state.career.currentOrg : null;
  const base = def.condicion.tipo === 'titulo'
    ? titulosDeLiga(state, org)
    : (def.condicion.tipo === 'internacional' ? state.career.registro.internacionales.length : 0);
  const parcial = {
    id: def.id, estado: 'abierta', quien: def.quien, org, base,
    abiertaEn: anio, vence: anio + def.plazoAnios, plazoAnios: def.plazoAnios, edadLimite: state.age + def.plazoAnios,
    resueltaEn: null, resueltaSplit: null, texto: '', progreso: ''
  };
  const texto = rellenar(def.texto, varsDe(parcial));
  const progreso = conQuedan(evaluar(state, parcial, def).progreso, def.plazoAnios);
  return { ...parcial, texto, progreso };
}

// Al retiro (o al fin de la carrera): lo que quedó abierto se cuenta como roto, sin castigo ni `rng`.
export function resolverAlRetiro(state) {
  const abiertas = promesasDe(state).filter((p) => p.estado === 'abierta');
  if (abiertas.length === 0) {
    return state;
  }
  const anio = state.calendario.anio;
  const promesas = promesasDe(state).map((p) => (p.estado === 'abierta'
    ? { ...p, estado: 'rota', progreso: 'la carrera se terminó antes', resueltaEn: anio, resueltaSplit: state.player.splitCount }
    : p));
  return { ...state, career: { ...state.career, promesas } };
}

