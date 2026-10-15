// G1 (PLANUI §0.9, contrato de G1). Vive fuera de `minijuegos/` (ahí cada archivo es una mecánica): la vara de cada minijuego en sus unidades, el juicio con la misma cuenta que el
// motor y el "tan cerca" de después. Puro (sin DOM): lo usan la parada del minijuego y el stream del Swiss.
//
// La cuenta del motor (contrato): `paso = resultado >= vara`, con `vara` ya bajada por el poder del escenario si se
// activó; es "casi" si `vara - margenCasi <= resultado < vara`. Acá se repite tal cual, y la regla en palabras sale de
// la misma vara: "necesitás 3 de 4" es el menor `k` con `k / total >= vara` (no `ceil(vara × total)`, que con la coma
// flotante puede pedir uno de más: 0,6 × 5 = 3,0000000000000004).
import { BALANCE } from '../../data/balance.js';
import { veredictoDeMinijuego, minijuegoPorId, lecturaDeVentana, latenciaQuePasa, radioQuePasa } from '../../core/minijuegos.js';
import { ventanaPorStat, dificultadDe } from './minijuegos/comun.js';
import { TOTAL as MINIONS } from './minijuegos/lastHit.js';
import { LARGO as TECLAS_COMBO } from './minijuegos/elCombo.js';
import { RONDAS as SKILLSHOTS } from './minijuegos/dodge.js';
import { TIEMPOS } from './minijuegos/elKite.js';
import { A_OSCURAS } from './minijuegos/laVision.js';
import { BLANCOS } from './minijuegos/laPrueba.js';
import { FRENADAS } from './minijuegos/laCorrida.js';
import { TOPE_ERRORES, PARES } from './minijuegos/laPizarra.js';
import { ESCALA_DISTANCIA } from './minijuegos/robarBaron.js';
import { MARGEN_DISTANCIA, ANCHO_ZONA } from './minijuegos/elTeleport.js';
import { VENTANA_MS } from './minijuegos/laLlamada.js';

// Las mecánicas que se cuentan de a una: el total y cómo se llama lo que se cuenta.
const CONTEO = {
  last_hit: { total: MINIONS, unidad: 'minions', articulo: 'los' },
  el_combo: { total: TECLAS_COMBO, unidad: 'teclas del combo', articulo: 'las' },
  dodge: { total: SKILLSHOTS, unidad: 'skillshots', articulo: 'los' },
  el_kite: { total: TIEMPOS, unidad: 'tiempos de kite', articulo: 'los' },
  la_vision: { total: A_OSCURAS, unidad: 'wards', articulo: 'los' },
  la_prueba: { total: BLANCOS, unidad: 'blancos', articulo: 'los' },
  la_corrida: { total: FRENADAS, unidad: 'frenadas en la zona', articulo: 'las' }
};
// El stat de las dos mecánicas nuevas, por si `data/minijuegos.json` todavía no las trae (la entrada la registra G1a).
const STAT_SIN_DATO = { la_corrida: 'mecanica', la_pizarra: 'macro' };
const NOMBRE_STAT = { mecanica: 'mecánica', macro: 'macro', teamfight: 'teamfight', laneo: 'laneo', shotcalling: 'shotcalling', adaptabilidad: 'adaptabilidad' };
// Las líneas de las mecánicas que no traen `veredictos` en el dato (las dos nuevas, hasta que G1a las registre).
const LINEA_SIN_DATO = {
  paso: 'La clavaste cuando había que clavarla.',
  casi: 'Por un pelo. Así de chiquita es la diferencia en una final.',
  no: 'Hoy no salió. El chat ya está editando el clip.'
};
export const TITULO_JUICIO = { paso: 'PASÓ', casi: 'CASI', no: 'NO SALIÓ' };
const NIVEL_DE_JUICIO = { paso: 'bien', casi: 'parejo', no: 'mal' };

// La vara de la ronda: la del motor menos lo que bajó el poder del escenario y la charla del coach (`bajaCharla`: lo que
// baja la charla si se eligió, `0` si no).
export function varaEfectiva(g1, poderActivo = false, bajaCharla = 0) {
  const baja = poderActivo && g1?.poder?.efecto?.bajaVara ? g1.poder.efecto.bajaVara : 0;
  return Math.max(0, (g1?.vara ?? 0) - baja - bajaCharla);
}

// `{ paso, casi, vara, clave }`: la cuenta del motor.
export function juzgar(resultado, g1, poderActivo = false, bajaCharla = 0) {
  const vara = varaEfectiva(g1, poderActivo, bajaCharla);
  const paso = resultado >= vara;
  const casi = !paso && resultado >= vara - (g1?.margenCasi ?? 0);
  return { paso, casi, vara, clave: paso ? 'paso' : casi ? 'casi' : 'no' };
}

// El menor `k` de 0..total con `k / total >= vara` (`total + 1` si ni todos alcanzan).
export function necesarios(vara, total) {
  for (let k = 0; k <= total; k += 1) if (k / total >= vara) return k;
  return total + 1;
}

// Los errores que podés cometer: el mayor `e` con `1 - e / tope >= vara` (-1 si ni sin errores alcanza).
function erroresPermitidos(vara, tope) {
  for (let e = tope; e >= 0; e -= 1) if (1 - e / tope >= vara) return e;
  return -1;
}

// Cómo se mide el minijuego `id` (con el stat y la dificultad de esta ronda, para las ventanas que dependen de ellos).
export function medidaDe(id, state, datos) {
  if (CONTEO[id]) return { tipo: 'conteo', ...CONTEO[id] };
  if (id === 'la_pizarra') return { tipo: 'errores', tope: TOPE_ERRORES, pares: PARES };
  if (id === 'robar_baron') return { tipo: 'distancia', escala: ESCALA_DISTANCIA };
  if (id === 'el_teleport') {
    const ancho = ventanaPorStat(state?.player?.stats?.macro, ANCHO_ZONA[0], ANCHO_ZONA[1], dificultadDe(state, datos));
    return { tipo: 'distancia', escala: ancho / 2 + MARGEN_DISTANCIA };
  }
  if (id === 'la_llamada') {
    // la misma ventana que arma la mecánica: el piso humano más lo que abre `shotcalling` (`laLlamada.js`)
    const ventanaMs = BALANCE.g1.pisoHumano.llamadaMs
      + ventanaPorStat(state?.player?.stats?.shotcalling, VENTANA_MS[0], VENTANA_MS[1], dificultadDe(state, datos));
    return { tipo: 'latencia', ventanaMs };
  }
  return { tipo: 'porcentaje' };
}

const redondo = (n) => Math.round(n);

// La regla con la vara, en las unidades del minijuego: "Necesitás 3 de 4 frenadas en la zona".
export function reglaDeVara(id, vara, state, datos) {
  const m = medidaDe(id, state, datos);
  if (m.tipo === 'conteo') {
    const n = necesarios(vara, m.total);
    if (n <= 0) return `Pasás aunque no claves ninguno: la vara está en el piso`;
    if (n > m.total) return `Ni con ${m.articulo} ${m.total} alcanza`;
    return n === m.total ? `Necesitás ${m.articulo} ${m.total} ${m.unidad}, sin fallar ${m.articulo === 'las' ? 'una' : 'uno'}` : `Necesitás ${n} de ${m.total} ${m.unidad}`;
  }
  if (m.tipo === 'errores') {
    const e = erroresPermitidos(vara, m.tope);
    if (e < 0) return 'Ni sin errores alcanza';
    return e === 0 ? `Los ${m.pares} pares sin un solo error` : `Los ${m.pares} pares, con ${e} ${e === 1 ? 'error' : 'errores'} como mucho`;
  }
  if (m.tipo === 'distancia') {
    const d = redondo(radioQuePasa(vara, m.escala));
    return id === 'el_teleport' ? `Que el TP caiga a ${d} o menos del centro de la pelea` : `Smite a ${d} o menos del centro de la zona`;
  }
  if (m.tipo === 'latencia') return `Cantala en menos de ${redondo(latenciaQuePasa(vara, m.ventanaMs))} ms`;
  return `Sacá ${Math.ceil(vara * 100)}% o más`;
}

// La línea del stat que ya existía ("tu mecánica 71 te abre la ventana"), también para las mecánicas sin dato.
export function lineaDeStat(id, state) {
  const entrada = minijuegoPorId(id) ?? (STAT_SIN_DATO[id] ? { statRelevante: STAT_SIN_DATO[id] } : null);
  if (!entrada || !state?.player?.stats) return '';
  const l = lecturaDeVentana(entrada, state);
  return `tu ${NOMBRE_STAT[l.stat] ?? l.stat} ${l.valor} ${l.frase}`;
}

const enBarra = (n) => Math.max(0, Math.min(100, redondo(n)));

// El "tan cerca" de después: lo que revela la ventana ("te faltó 1", "la zona era 41-58, frenaste en 61").
export function tanCerca(id, resultado, detalle, juicio, state, datos) {
  const m = medidaDe(id, state, datos);
  const { vara } = juicio;
  if (m.tipo === 'conteo') {
    const k = Math.round(resultado * m.total);
    const n = necesarios(vara, m.total);
    const base = juicio.paso
      ? (k === n ? `${k} de ${m.total}: justo lo que hacía falta.` : `${k} de ${m.total}: te sobró ${k - n}.`)
      : `${k} de ${m.total}: te ${n - k === 1 ? 'faltó 1' : `faltaron ${n - k}`}.`;
    if (!juicio.paso && detalle?.tipo === 'zona' && !detalle.entro) {
      return `${base} La zona era ${enBarra(detalle.zona[0])}-${enBarra(detalle.zona[1])}, frenaste en ${enBarra(detalle.frenaste)}.`;
    }
    return base;
  }
  if (m.tipo === 'errores') {
    const e = erroresPermitidos(vara, m.tope);
    const hechos = detalle?.errores ?? Math.round((1 - resultado) * m.tope);
    return juicio.paso ? `${hechos} ${hechos === 1 ? 'error' : 'errores'}, y podías ${Math.max(0, e)}.` : `${hechos} errores: podías ${Math.max(0, e)}.`;
  }
  if (m.tipo === 'distancia') {
    if (detalle?.tipo === 'tarde') return 'Se te pasó la pelea: el TP nunca salió.';
    if (detalle?.tipo !== 'distancia') return '';
    const radio = radioQuePasa(vara, detalle.escala);
    const zona = `${enBarra(detalle.centro - radio)}-${enBarra(detalle.centro + radio)}`;
    return id === 'el_teleport'
      ? `La pelea que pasaba era ${zona}; tu TP cayó en ${enBarra(detalle.pos)}.`
      : `La zona que pasaba era ${zona}, tiraste el smite en ${enBarra(detalle.pos)}.`;
  }
  if (m.tipo === 'latencia') {
    if (detalle?.tipo === 'temprano') return 'Cantaste antes de la señal: el equipo fue a ciegas.';
    if (detalle?.tipo !== 'latencia') return '';
    return `Tenías ${redondo(latenciaQuePasa(vara, detalle.ventanaMs))} ms y llegaste en ${redondo(detalle.ms)}.`;
  }
  return `Sacaste ${redondo(resultado * 100)}% y la vara era ${redondo(vara * 100)}%.`;
}

// La línea específica del resultado: los `veredictos` del dato, por nivel (paso → bien, casi → parejo, no → mal).
export function lineaDeVeredicto(id, clave, state) {
  const umbrales = BALANCE.serie.veredictoMinijuego;
  const representativo = { paso: umbrales.bien, casi: umbrales.parejo, no: 0 }[clave];
  const detalle = minijuegoPorId(id) ? veredictoDeMinijuego(id, representativo, state).detalle : '';
  return { nivel: NIVEL_DE_JUICIO[clave], titulo: TITULO_JUICIO[clave], detalle: detalle || LINEA_SIN_DATO[clave] };
}
