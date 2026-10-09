// Inventario "leer menos": 40 seeds jugadas con `criterio`; por cada parada (`state.pendiente`), qué datos estructurados trae cada
// opción (previa, riesgo, rareza, plan, una p numérica) y si el texto lleva un "%" que NO tiene un campo numérico detrás (solo prosa).
// Lectura pura: no cambia ninguna respuesta ni consume rng.
import fs from 'node:fs';
import path from 'node:path';
import { jugarCarrera } from './partida.mjs';
import { motivoDe } from './cobertura.mjs';
import { RAIZ } from './comun.mjs';

export const SEEDS_DEL_INVENTARIO = Array.from({ length: 40 }, (_, i) => i + 1);

// Campos que cuentan como "una p numérica": p, pSerie, pMapas, riesgoCasa, o cualquier `p<Mayúscula>`/`prob*`/`chance*`.
const ES_CAMPO_P = /^(p|pSerie|pMapas|riesgoCasa)$|^p[A-Z]|^prob|^chance/;

const esNumero = (v) => typeof v === 'number' && Number.isFinite(v);

// Los campos numéricos de tipo "probabilidad" de un objeto (un nivel hacia adentro de `datos`/`negociacionInfo`).
function camposP(objeto, ruta = '', profundidad = 0, salida = []) {
  if (!objeto || typeof objeto !== 'object' || profundidad > 2 || Array.isArray(objeto)) return salida;
  for (const [k, v] of Object.entries(objeto)) {
    if (ES_CAMPO_P.test(k) && (esNumero(v) || (Array.isArray(v) && v.length > 0 && v.every(esNumero)))) {
      salida.push(ruta ? `${ruta}.${k}` : k);
    } else if (v && typeof v === 'object' && !Array.isArray(v) && ['datos', 'negociacionInfo', 'riesgoDetalle'].includes(k)) {
      camposP(v, k, profundidad + 1, salida);
    }
  }
  return salida;
}

function textosDeOpcion(o) {
  return [o.label, o.descripcion, o.riesgoTexto, typeof o.riesgo === 'string' ? o.riesgo : null, o.negociacionInfo?.riesgoTexto, o.motivoDemanda, o.plan]
    .filter((t) => typeof t === 'string');
}

function resumenDeOpcion(o) {
  const campos = camposP(o);
  const textos = textosDeOpcion(o);
  const conPorciento = textos.some((t) => t.includes('%'));
  const previaItemsConValor = Array.isArray(o.previa) && o.previa.some((i) => esNumero(i?.valor));
  return {
    id: o.id,
    conPrevia: Array.isArray(o.previa) && o.previa.length > 0,
    conPreviaNumerica: previaItemsConValor,
    conRiesgo: o.riesgo !== undefined && o.riesgo !== null,
    conRareza: o.rareza !== undefined && o.rareza !== null,
    conPlan: o.plan !== undefined && o.plan !== null,
    camposP: campos,
    conP: campos.length > 0,
    textoConPorciento: conPorciento,
    // "Solo prosa": el % está en el texto y ningún campo numérico de la opción lo respalda.
    soloProsa: conPorciento && campos.length === 0 && !previaItemsConValor,
    textoPorciento: textos.find((t) => t.includes('%')) ?? null
  };
}

export function inventariar() {
  const paradas = [];
  const largos = {};
  const recordar = (clave, texto, donde) => {
    if (typeof texto !== 'string') return;
    if (!largos[clave] || texto.length > largos[clave].largo) largos[clave] = { largo: texto.length, texto, donde };
  };

  for (const seed of SEEDS_DEL_INVENTARIO) {
    jugarCarrera(seed, {
      alParar({ sistema, state, decision }) {
        const motivo = motivoDe(decision);
        const ev = decision.datos?.evento;
        const opciones = (decision.opciones ?? []).map(resumenDeOpcion);
        const textosDecision = [decision.titulo, decision.descripcion].filter((t) => typeof t === 'string');
        const camposPDecision = camposP(decision.datos ?? {}, 'datos');
        const donde = `${sistema.id}:${motivo ?? 'x'}`;
        paradas.push({
          seed,
          edad: state.age,
          sistema: sistema.id,
          motivo: motivo ?? 'x',
          subtipo: ev?.categoria ?? null,
          tipo: `${sistema.id}:${motivo ?? 'x'}`,
          presentacion: decision.presentacion ?? null,
          nOpciones: opciones.length,
          peso: decision.peso ?? null,
          decisionConPorciento: textosDecision.some((t) => t.includes('%')),
          decisionTextoPorciento: textosDecision.find((t) => t.includes('%')) ?? null,
          decisionCamposP: camposPDecision,
          opciones
        });
        recordar('decision.titulo', decision.titulo, donde);
        recordar('decision.descripcion', decision.descripcion, donde);
        for (const o of decision.opciones ?? []) {
          recordar('opcion.label', o.label, donde);
          recordar('opcion.descripcion', o.descripcion, donde);
        }
      }
    });
  }
  return { paradas, largos };
}

// --- Dónde vive cada cosa en el motor (archivo:línea) ---

function leerLineas(rel) {
  try {
    return fs.readFileSync(path.join(RAIZ, rel), 'utf8').split('\n');
  } catch {
    return [];
  }
}

// Dónde arma el motor una parada (archivo:línea). Los eventos (`datos.evento`) y los cierres los arma `decisionDesdeEvento`
// (src/systems/events.js); el plan de Fearless, `construirDecisionPlan` (src/systems/serie.js, también el de internacional); el resto
// declara `motivo: '<motivo>'` en el archivo de su sistema (o, si no, en el primero de src/systems que lo declare).
export function ubicacionDeMotivo(sistema, motivo, { esEvento = false } = {}) {
  const lineaDe = (rel, patron) => {
    const idx = leerLineas(rel).findIndex((l) => patron.test(l));
    return idx >= 0 ? `${rel}:${idx + 1}` : null;
  };
  const patronMotivo = new RegExp(`motivo:\\s*'${motivo}'`);
  if (esEvento && motivo !== 'minijuego') {
    return lineaDe('src/systems/events.js', /export function decisionDesdeEvento/);
  }
  // La fecha marcada pasa el motivo por una variable.
  if (sistema === 'temporada' && motivo === 'momento') {
    return lineaDe('src/systems/temporada.js', /motivo:\s*tipoDecision/);
  }
  if (motivo === 'plan') {
    return lineaDe('src/systems/serie.js', patronMotivo);
  }
  const archivoDelSistema = sistema === 'eventos' ? 'events' : sistema;
  const propio = lineaDe(`src/systems/${archivoDelSistema}.js`, patronMotivo);
  if (propio) return propio;
  // Los motivos que el amateur pasa como argumento suelto (`'negociacion'`, `'nocturno'`).
  const comoArgumento = lineaDe(`src/systems/${archivoDelSistema}.js`, new RegExp(`^\\s*'${motivo}'\\s*$`));
  if (comoArgumento) return comoArgumento;
  const archivos = fs.readdirSync(path.join(RAIZ, 'src/systems')).filter((f) => f.endsWith('.js')).sort();
  for (const f of archivos) {
    const hallado = lineaDe(`src/systems/${f}`, patronMotivo);
    if (hallado) return hallado;
  }
  return null;
}

// Líneas de src/systems y src/core que escriben un "%" en un texto de parada (prosa, no un comentario).
export function lineasConPorcientoEnProsa(limite = 12) {
  const salida = [];
  for (const rel of ['src/systems/amateur.js', 'src/systems/serie.js', 'src/systems/mercado.js', 'src/systems/internacional.js', 'src/systems/burnout.js', 'src/systems/events.js', 'src/core/previa.js', 'src/core/previaDePartido.js', 'src/systems/temporada.js', 'src/systems/retiro.js']) {
    leerLineas(rel).forEach((linea, i) => {
      const t = linea.trim();
      if (t.startsWith('//') || t.startsWith('*')) return;
      if (/['"`][^'"`]*%[^'"`]*['"`]/.test(t) && /\$\{|[a-zñáéíóú]{4,}/i.test(t)) {
        salida.push({ archivo: `${rel}:${i + 1}`, linea: t.slice(0, 160) });
      }
    });
  }
  return salida.slice(0, limite);
}

const pct = (a, b) => (b === 0 ? 0 : Math.round((a / b) * 100));

// La tabla por tipo de parada.
export function resumirInventario({ paradas }) {
  const porTipo = new Map();
  for (const p of paradas) {
    if (!porTipo.has(p.tipo)) porTipo.set(p.tipo, []);
    porTipo.get(p.tipo).push(p);
  }
  const filas = [];
  for (const [tipo, lista] of [...porTipo.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))) {
    const ops = lista.flatMap((p) => p.opciones);
    const [sistema, motivo] = tipo.split(':');
    const opcionesPorParada = [...new Set(lista.map((p) => p.nOpciones))].sort((a, b) => a - b);
    filas.push({
      tipo,
      veces: lista.length,
      opcionesPorParada,
      opciones: ops.length,
      pctConPrevia: pct(ops.filter((o) => o.conPrevia).length, ops.length),
      pctConRiesgo: pct(ops.filter((o) => o.conRiesgo).length, ops.length),
      pctConRareza: pct(ops.filter((o) => o.conRareza).length, ops.length),
      pctConPlan: pct(ops.filter((o) => o.conPlan).length, ops.length),
      pctConP: pct(ops.filter((o) => o.conP).length, ops.length),
      pctEstructurado: pct(ops.filter((o) => o.conPrevia || o.conRiesgo || o.conRareza || o.conPlan || o.conP).length, ops.length),
      opcionesConPorciento: ops.filter((o) => o.textoConPorciento).length,
      opcionesSoloProsa: ops.filter((o) => o.soloProsa).length,
      pctSoloProsa: pct(ops.filter((o) => o.soloProsa).length, ops.length),
      paradasConPorcientoEnLaDecision: lista.filter((p) => p.decisionConPorciento).length,
      paradasConPorcientoSinCampoP: lista.filter((p) => p.decisionConPorciento && p.decisionCamposP.length === 0).length,
      ubicacion: ubicacionDeMotivo(sistema, motivo, { esEvento: lista.some((p) => p.subtipo !== null) })
    });
  }
  const todas = paradas.flatMap((p) => p.opciones);
  const total = {
    paradas: paradas.length,
    opciones: todas.length,
    paradasSinOpciones: paradas.filter((p) => p.nOpciones === 0).length,
    pctEstructurado: pct(todas.filter((o) => o.conPrevia || o.conRiesgo || o.conRareza || o.conPlan || o.conP).length, todas.length),
    opcionesConPorciento: todas.filter((o) => o.textoConPorciento).length,
    opcionesSoloProsa: todas.filter((o) => o.soloProsa).length,
    pctSoloProsa: pct(todas.filter((o) => o.soloProsa).length, todas.length),
    paradasConAlgunaOpcionSoloProsa: paradas.filter((p) => p.opciones.some((o) => o.soloProsa)).length,
    paradasConPorcientoEnLaDecision: paradas.filter((p) => p.decisionConPorciento).length,
    paradasConPorcientoSinCampoP: paradas.filter((p) => p.decisionConPorciento && p.decisionCamposP.length === 0).length
  };
  return { filas, total };
}

// Ejemplos reales de prosa con "%" y sin campo numérico (el texto tal cual sale al jugador), uno por tipo de parada.
export function ejemplosDeSoloProsa(paradas, limite = 8) {
  const vistos = new Set();
  const salida = [];
  for (const p of paradas) {
    if (vistos.has(p.tipo)) continue;
    const opcion = p.opciones.find((o) => o.soloProsa);
    const enDecision = p.decisionConPorciento && p.decisionCamposP.length === 0;
    if (!opcion && !enDecision) continue;
    vistos.add(p.tipo);
    salida.push({
      tipo: p.tipo,
      seed: p.seed,
      nivel: opcion ? 'opcion' : 'decision',
      texto: (opcion ? opcion.textoPorciento : p.decisionTextoPorciento).slice(0, 200)
    });
  }
  return salida.slice(0, limite);
}
