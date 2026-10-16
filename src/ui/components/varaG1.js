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
import { reglaDe, fraseDeLaVara } from '../../core/minijuegos.js';
import { BLANCOS } from './minijuegos/laPrueba.js';
import { TOPE_ERRORES, PARES } from './minijuegos/laPizarra.js';
import { ESCALA_DISTANCIA } from './minijuegos/robarBaron.js';
import { MARGEN_DISTANCIA, ANCHO_ZONA } from './minijuegos/elTeleport.js';
import { VENTANA_MS } from './minijuegos/laLlamada.js';

// Las mecánicas que se cuentan de a una: el total y cómo se llama lo que se cuenta.
// H3e: la forma sale del dato (`minijuegos.json` → `regla`, vía `reglaDe`) y el total, de `BALANCE.g1.conteo`. La
// prueba de ingreso todavía cuenta sus blancos en la mecánica (no están en el balance).
const TOTAL_SIN_BALANCE = { la_prueba: BLANCOS };
function conteoDe(id) {
  const regla = reglaDe(id);
  const total = regla?.tipo === 'conteo' ? (regla.total ?? TOTAL_SIN_BALANCE[id]) : null;
  return total ? { total, unidad: regla.unidad, articulo: regla.articulo } : null;
}
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
  if (id === 'la_pizarra') return { tipo: 'errores', tope: TOPE_ERRORES, pares: PARES };
  const conteo = conteoDe(id);
  if (conteo) return { tipo: 'conteo', ...conteo };
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

// La regla con la vara, dicha en la ficción (`minijuegos.json` → `regla.frase`, vía `fraseDeLaVara`): "Rematá 3 minions antes de
// que te los roben". `{n}` es la vara en las unidades de la mecánica; las de distancia dibujan la zona y su frase no lleva número.
export function reglaDeVara(id, vara, state, datos) {
  const m = medidaDe(id, state, datos);
  if (m.tipo === 'conteo') {
    const n = necesarios(vara, m.total);
    if (n <= 0) return `Pasás aunque no claves ninguno: la vara está en el piso`;
    if (n > m.total) return `Ni con ${m.articulo} ${m.total} alcanza`;
    return fraseDeLaVara(id, n) ?? `Necesitás ${n} de ${m.total} ${m.unidad}`;
  }
  if (m.tipo === 'errores') {
    const e = erroresPermitidos(vara, m.tope);
    if (e < 0) return 'Ni sin errores alcanza';
    if (e === 0) return 'Armá la pizarra sin un solo error';
    const frase = fraseDeLaVara(id, e);
    return frase ? (e === 1 ? frase.replace('1 errores', '1 error') : frase) : `Los ${m.pares} pares, con ${e} errores como mucho`;
  }
  if (m.tipo === 'distancia') return fraseDeLaVara(id, 0) ?? (id === 'el_teleport' ? 'Que el TP caiga en la pelea' : 'Los 3 smites adentro de su zona');
  if (m.tipo === 'latencia') {
    const ms = redondo(latenciaQuePasa(vara, m.ventanaMs));
    return fraseDeLaVara(id, ms) ?? `Cantala en menos de ${ms} ms`;
  }
  return `Sacá ${Math.ceil(vara * 100)}% o más`;
}

// H3u: el "tan cerca" de las mecánicas rehechas, en la ficción y con la medida. Cada línea, de 12 palabras o menos.
const TELEPORT_FALLA = { temprano: 'Te vieron el TP antes de la pelea', rival: 'Caíste adentro del equipo rival', cebo: 'Era un cebo', perdida: 'Caíste en la pelea que se perdía' };
const LLAMADA_FALLA = { mal: 'Cantaste el objetivo equivocado', temprano: 'Cantaste antes de que se abra', tarde: 'Se te pasó la ventana' };
const LAST_HIT_FALLA = { torre: 'la torre te los robó', oleada: 'la oleada se los llevó', tiempo: 'se te fue el tiempo' };
const GANCHO_FALLA = { minion: 'un minion se metió en el medio', lejos: 'el gancho se quedó corto', tiempo: 'se te fue el tiempo' };
const masFrecuente = (lista) => {
  const cuenta = {};
  for (const x of lista) cuenta[x] = (cuenta[x] ?? 0) + 1;
  return Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a])[0] ?? null;
};
const unaVez = (n) => (n === 1 ? 'una vez' : `${n} veces`);
function cercaDeConteo(detalle) {
  if (!detalle) return '';
  if (detalle.tipo === 'combos') {
    const cortados = detalle.intentos.filter((x) => !x.ok).length;
    return `Clavaste ${detalle.hechos} de ${detalle.total}: un error cortó ${cortados === 1 ? 'un combo' : `${cortados} combos`}.`;
  }
  if (detalle.tipo === 'engages') {
    const fallos = detalle.intentos.filter((x) => !x.ok);
    const sinTiro = fallos.filter((x) => !x.tiro).length;
    return `Metiste la R en ${detalle.hechos} de ${detalle.total} engages: ${sinTiro * 2 >= fallos.length ? 'se te pasó uno' : 'los agarraste sueltos'}.`;
  }
  if (detalle.tipo === 'oleadas') {
    const primera = detalle.historial.findIndex((ok) => !ok);
    return `Esquivaste ${detalle.esquivadas} de ${detalle.total} oleadas${primera >= 0 ? `: la oleada ${primera + 1} te comió` : ''}.`;
  }
  if (detalle.tipo === 'cazas') return `Cazaste ${detalle.cazados} de ${detalle.de}: el jungla pasó por el otro lado.`;
  if (detalle.tipo === 'blancos') return `Pegaste ${detalle.golpes} de ${detalle.total} dummies en ${detalle.disparos} skillshots.`;
  if (detalle.tipo === 'conteo' && detalle.minions) {
    const falla = masFrecuente(detalle.minions.filter((x) => !x.cs).map((x) => x.motivo));
    return `Remataste ${detalle.logrados} de ${detalle.total} minions: ${LAST_HIT_FALLA[falla] ?? 'se te escaparon'}.`;
  }
  if (detalle.tipo === 'conteo' && detalle.tiempos) {
    return `Kiteaste ${detalle.logrados} de ${detalle.total} tiempos: el bruiser te agarró ${unaVez(detalle.total - detalle.logrados)}.`;
  }
  if (detalle.tipo === 'conteo' && detalle.tiros) {
    const falla = masFrecuente(detalle.tiros.filter((x) => !x.acerto).map((x) => x.motivo));
    return `Enganchaste ${detalle.logrados} de ${detalle.total}: ${GANCHO_FALLA[falla] ?? 'fallaste los otros'}.`;
  }
  return '';
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
    const ficcion = juicio.paso ? '' : cercaDeConteo(detalle);
    if (ficcion) return ficcion;
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
    return juicio.paso ? `${hechos} ${hechos === 1 ? 'error' : 'errores'}, y podías ${Math.max(0, e)}.` : `${hechos} ${hechos === 1 ? 'pick mal puesto' : 'picks mal puestos'}: aguantabas ${Math.max(0, e)}.`;
  }
  if (m.tipo === 'distancia') {
    if (detalle?.tipo === 'tarde') return 'Se te pasó la pelea: el TP nunca salió.';
    if (id === 'el_teleport' && TELEPORT_FALLA[detalle?.tipo]) {
      const bien = (detalle.fases ?? []).filter((f) => f.tipo === 'distancia').length;
      return `${TELEPORT_FALLA[detalle.tipo]}: ${bien} de ${(detalle.fases ?? []).length} bien.`;
    }
    if (id === 'el_teleport' && detalle?.tipo === 'distancia' && detalle.centro === 0) {
      const dec = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
      return `Tu peor TP cayó a ${dec(detalle.pos)} de la pelea: pasaba con ${dec(radioQuePasa(vara, detalle.escala))}.`;
    }
    // H3k: el Barón son tres smites (pasa si los tres caen en su zona): cuánto erró cada uno y cuánto pedía la zona
    if (detalle?.tipo === 'smites') {
      const decimal = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
      const cada = detalle.smites.map((x) => (x.robado ? 'robado' : decimal(x.d))).join(' · ');
      return `Tus smites, del centro: ${cada}. La zona pedía ${decimal(radioQuePasa(vara, detalle.escala))} o menos.`;
    }
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
    const malas = (detalle.llamadas ?? []).filter((l) => l.motivo !== 'bien');
    if (!juicio.paso && malas.length) {
      const motivo = (malas.find((l) => l.motivo === 'mal') ?? malas[0]).motivo;
      return `${LLAMADA_FALLA[motivo] ?? 'Se te escapó una llamada'}: ${malas.length} de ${detalle.llamadas.length}.`;
    }
    return `Te pedían ${redondo(latenciaQuePasa(vara, detalle.ventanaMs))} ms de media y llegaste en ${redondo(detalle.ms)}.`;
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
