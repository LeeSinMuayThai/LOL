// Los chips de eje (PLANUI §0.3, puntos 1-3): "▲ Casa +8" con el glifo y el color del eje (core/ejes.js). Los usan la
// planilla, "lo que pasó", el relato y la placa "Vos": un mismo chip en todas las pantallas. Estilos: estilos/ejes.css.
//
// El color del chip es el del eje (qué se movió); el signo va en el triángulo y en el número (--up / --down).
// Una palabra que no es eje da un chip neutro: nada del texto del motor se pierde.
//
// C1b (el relato): el lector de los efectos conoce todos los formatos que escribe el motor (medidos en 40 carreras, seeds
// 1-40: `diag-c1b/` del worktree de C1b): "Eje ±n" ("estudios -7", "Mecánica +1", "Confianza familiar -12"), "Campeón ±n
// maestría" ("Sylas +2", "Jarvan IV +3 maestría"), la transición de SoloQ ("SoloQ: Diamante II · 93 LP → Diamante I · 20
// LP", con "(#12 de China)" en Challenger), los hitos con comillas ('Momento: "…"', 'Hitos: se suma "…"'), los que no
// tienen número ("esto ayuda al partido", "entra Aphelios al pool", "pasás de Jungla a Top (pool de Jax, Ornn, Gnar)",
// "te vas a la LPL en la próxima pretemporada") y la tira técnica ("Split 6: mecánica -1, macro 53, consistencia 3": un
// delta y dos valores). Las comas adentro de comillas o paréntesis no cortan.
import { ejeDe, EJES } from '../core/ejes.js';
import { icono, triangulos } from '../fx/iconos.js';
import { TIERS, romano } from '../../data/ranked.js';
import { puntosAbsolutos, puntosDelApice, desdePuntos } from '../../core/ranked.js';
import { BALANCE } from '../../data/balance.js';

const SIGNO = /^[+\-−±]/;
// "estudios -7", "Mecánica +1", "Sylas +2 maestría", "+13 LP", "macro 53" (sin signo: un valor, no un cambio).
const SEGMENTO = /^(.*?)\s*([+\-−±]?\d+(?:[.,]\d+)?)\s*(.*)$/;
// La magnitud de un cambio por cantidad de triángulos (la misma escala que la tarjeta de "lo que pasó": de 100, ▲ / ▲▲ /
// ▲▲▲). El LP se mueve en otra escala: un bloque de ranked da decenas.
const MAGNITUD = { alta: 8, media: 3 };
const MAGNITUD_LP = { alta: 100, media: 30 };
// El glifo propio de cada stat (fx/iconos.js): el eje `juego` (y `equipo`) agrupa varias y sin esto Macro, Laneo y Adapt.
// se verían iguales. La palabra del motor, sin tildes ni mayúsculas -> el glifo. La maestría de un campeón, el hexágono.
const GLIFO_DE_STAT = {
  mecanica: 'mecanica', macro: 'macro', laneo: 'laneo', teamfight: 'teamfight', shotcalling: 'shotcalling', calls: 'shotcalling',
  adaptabilidad: 'adaptabilidad', jerarquia: 'jerarquia', sinergia: 'sinergia', arraigo: 'arraigo', maestria: 'campeones'
};
const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function glifoDeStat(palabra) {
  return GLIFO_DE_STAT[sinTildes(palabra)] ?? null;
}

// Los efectos sin número que igual dicen hacia dónde (el partido que se te complica o se te facilita).
const TEXTO_CON_SIGNO = [
  { patron: /ayuda al partido/i, signo: 'sube' },
  { patron: /complica el partido/i, signo: 'baja' }
];

// --- El rango de SoloQ en texto ("Diamante I · 83 LP", "Gran Máster · 1214 LP (#40 de Corea)") ---------------------------

// Del más largo al más corto: "Gran Máster" antes que "Máster".
const TIERS_POR_ETIQUETA = [...TIERS].sort((a, b) => b.label.length - a.label.length);
const ROMANOS = [1, 2, 3, 4].map((division) => [romano(division), division]);

// "Diamante I · 83 LP" -> { tier, division, lp, puntos, etiqueta, nombre } (nombre: "Diamante I"); null si no se lee.
export function leerRango(texto) {
  const m = String(texto ?? '').trim().match(/^(.+?)\s*·\s*(\d+)\s*LP(?:\s*\((.*)\))?$/);
  if (!m) return null;
  const [, nombre, lpTexto, puesto] = m;
  const tier = TIERS_POR_ETIQUETA.find((t) => nombre === t.label || nombre.startsWith(`${t.label} `));
  if (!tier) return null;
  const lp = Number(lpTexto);
  let division = null;
  if (!tier.apice) {
    const resto = nombre.slice(tier.label.length).trim();
    division = ROMANOS.find(([r]) => r === resto)?.[1] ?? null;
    if (division === null) return null;
  }
  const ranked = { tier: tier.id, division, lp };
  return { ...ranked, apice: Boolean(tier.apice), puntos: puntosAbsolutos(ranked), nombre, puesto: puesto ?? null, etiqueta: String(texto).trim() };
}

// El rango de antes desde el de después y el delta de LP: { nombre, lp } (sin el puesto del ápice: depende del servidor).
// En el ápice el tier visible lo deciden los cupos del servidor, así que si los dos quedan en el ápice se usa el mismo nombre.
export function rangoAntes(despues, deltaLP) {
  if (!despues || !Number.isFinite(deltaLP)) return null;
  const puntos = Math.max(0, despues.puntos - deltaLP);
  if (puntos >= puntosDelApice()) {
    return { nombre: despues.apice ? despues.nombre : TIERS.find((t) => t.apice).label, lp: puntos - puntosDelApice(), apice: true, puntos };
  }
  const r = desdePuntos(puntos, null);
  const tier = TIERS.find((t) => t.id === r.tier);
  return { nombre: `${tier.label} ${romano(r.division)}`, lp: r.lp, apice: false, puntos, division: r.division, tier: r.tier };
}

export const LP_POR_DIVISION = BALANCE.ranked.lpPorDivision;

// --- El texto de efectos del motor, en segmentos -----------------------------------------------------------------------

// Corta por comas y punto y coma que no estén adentro de comillas o paréntesis. " · " también separa (los textos que
// juntan efectos con el punto medio), salvo en la transición de SoloQ, donde es parte del rango.
export function partirEfectos(texto) {
  const partes = [];
  let actual = '';
  let comillas = false;
  let parentesis = 0;
  for (const c of String(texto ?? '')) {
    if (c === '"' || c === '“' || c === '”') comillas = !comillas;
    else if (c === '(') parentesis += 1;
    else if (c === ')') parentesis = Math.max(0, parentesis - 1);
    if ((c === ',' || c === ';') && !comillas && parentesis === 0) {
      partes.push(actual);
      actual = '';
    } else {
      actual += c;
    }
  }
  partes.push(actual);
  return partes
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => (/^SoloQ:/i.test(p) || /"/.test(p) ? [p] : p.split(/\s+·\s+/)))
    .map((p) => p.replace(/\.$/, '').trim())
    .filter(Boolean);
}

// Un encabezado antes de los dos puntos ("Split 6: mecánica -1, …") no es un efecto: se separa. No lo es una etiqueta de eje
// ("SoloQ: …"), ni una que abre una cita ('Momento: "…"'), ni una sin número después ("Hitos: se suma …").
export function partirEncabezado(texto) {
  const crudo = String(texto ?? '').trim();
  const m = crudo.match(/^([^,:"()]{1,40}):\s*(.*)$/);
  if (!m) return { encabezado: null, resto: crudo };
  const [, encabezado, resto] = m;
  if (ejeDe(encabezado) || resto.startsWith('"') || !/\d/.test(resto)) return { encabezado: null, resto: crudo };
  return { encabezado: encabezado.trim(), resto: resto.trim() };
}

function efectoDeSegmento(seg) {
  // la transición de SoloQ: el chip dice cuánto LP (y a qué rango, si cambió)
  const soloq = seg.match(/^SoloQ:\s*(.+?)\s*→\s*(.+)$/i);
  if (soloq) {
    const desde = leerRango(soloq[1]);
    const hasta = leerRango(soloq[2]);
    const valor = desde && hasta ? hasta.puntos - desde.puntos : null;
    const cambioDeRango = desde && hasta && desde.nombre !== hasta.nombre ? hasta.nombre : '';
    return {
      eje: 'soloq', etiqueta: 'SoloQ', valor, cambio: valor !== null, sufijo: valor !== null ? ['LP', cambioDeRango && `→ ${cambioDeRango}`].filter(Boolean).join(' ') : `${soloq[1]} → ${soloq[2]}`,
      texto: seg, rango: hasta
    };
  }
  // una cita o algo sin número: chip neutro con el texto tal cual (y su dirección, si la dice)
  if (/"/.test(seg) || !/\d/.test(seg)) {
    const conSigno = TEXTO_CON_SIGNO.find((t) => t.patron.test(seg));
    return { eje: null, etiqueta: seg, valor: null, cambio: false, sufijo: '', texto: seg, signo: conSigno?.signo ?? null };
  }
  const m = seg.match(SEGMENTO);
  if (!m) return { eje: null, etiqueta: seg, valor: null, cambio: false, sufijo: '', texto: seg };
  const [, antes, numero, despues] = m;
  const valor = Number(numero.replace('−', '-').replace('±', '').replace(',', '.'));
  // la palabra del eje puede ir antes ("estudios -7") o después ("+2 maestría", "+13 LP")
  const eje = ejeDe(antes) ?? ejeDe(despues);
  // se lee en el orden del motor: "Sylas +2 maestría" -> Sylas · +2 · maestría; sin nombre ("+13 LP"), el del eje
  const glifo = glifoDeStat(antes) ?? glifoDeStat(despues);
  return { eje, etiqueta: antes.trim() || null, valor, cambio: SIGNO.test(numero), sufijo: despues.trim(), texto: seg, ...(glifo ? { glifo } : {}) };
}

// Texto de efectos del motor -> [{ eje, etiqueta, valor, cambio, sufijo, texto, glifo? }]. `glifo`: el de la stat, si la
// reconoce (mecánica, macro, laneo, teamfight, shotcalling, adaptabilidad, jerarquía, sinergia, arraigo, maestría). `cambio`: el número traía signo (es un
// delta); sin signo es un valor absoluto (la tira técnica: "macro 53"). `eje` puede ser null (chip neutro). Un segmento
// sin número vuelve como { etiqueta: segmento, valor: null }. `texto` es el segmento original (el `title` del chip).
export function efectosDeTexto(texto) {
  const { resto } = partirEncabezado(texto);
  return partirEfectos(resto).map(efectoDeSegmento);
}

// Los triángulos por cantidad (1, 2, 3) -> el nombre de la magnitud de fx/iconos.js.
const MAGNITUD_DE_CANTIDAD = { 1: 'baja', 2: 'media', 3: 'alta' };

function magnitudDe(valor, sufijo) {
  const escala = /^LP\b/.test(sufijo ?? '') ? MAGNITUD_LP : MAGNITUD;
  const n = Math.abs(valor);
  return n >= escala.alta ? 'alta' : n >= escala.media ? 'media' : 'baja';
}

// El número con su signo, como lo escribe el chip: "+7", "−7" (el signo menos tipográfico), "±0".
export function numeroConSigno(valor) {
  return (valor > 0 ? '+' : valor < 0 ? '−' : '±') + Math.abs(valor);
}

// Un chip. `eje`: id de core/ejes.js o null. `valor`: número o null. `cambio`: true si es un delta (lleva signo y los
// triángulos de fx/iconos.js: ▲ / ▲▲ / ▲▲▲ según cuánto). `etiqueta`: el texto (por defecto el nombre corto del eje).
// `sufijo`: "LP", "maestría"… Opcionales (C1b): `glifo` (un glifo de fx/iconos.js en lugar del del eje: la stat dentro
// de `juego` o `equipo`, ver `glifoDeStat`), `signo` ('sube' | 'baja') para un chip sin número que igual dice hacia dónde,
// y `titulo` (el texto original, en el `title`). `magnitud` (1-3, opcional): los triángulos que dice otra pieza de la misma
// pantalla para esa cifra (la celda de la planilla, la tarjeta de "lo que pasó"); pisa la que calcula el chip, para que la
// misma cifra tenga los mismos triángulos en todas partes.
export function chipEje({ eje = null, valor = null, cambio = true, etiqueta = null, sufijo = '', grande = false, signo = null, titulo = null, glifo = null, magnitud = null } = {}) {
  const chip = document.createElement('span');
  chip.className = 'eje-chip' + (grande ? ' eje-chip--grande' : '') + (typeof valor === 'number' ? '' : ' eje-chip--texto');
  if (eje && EJES[eje]) chip.dataset.eje = eje;
  const conSigno = cambio && typeof valor === 'number';
  if (conSigno) chip.dataset.signo = valor > 0 ? 'sube' : valor < 0 ? 'baja' : 'igual';
  else if (signo) chip.dataset.signo = signo;
  if (titulo) chip.title = titulo;
  const dibujo = glifo ?? (eje && EJES[eje] ? EJES[eje].glifo : null);
  if (dibujo) chip.appendChild(icono(dibujo, { clase: 'ln-ico eje-chip-ico' }));
  const nombre = document.createElement('span');
  nombre.className = 'eje-chip-nombre';
  nombre.textContent = etiqueta ?? (eje && EJES[eje] ? EJES[eje].corto : '');
  chip.appendChild(nombre);
  if (conSigno && valor !== 0) chip.appendChild(triangulos(MAGNITUD_DE_CANTIDAD[magnitud] ?? magnitudDe(valor, sufijo), valor > 0 ? '+' : '-'));
  else if (!conSigno && signo) chip.appendChild(triangulos('baja', signo === 'sube' ? '+' : '-'));
  if (typeof valor === 'number') {
    const n = document.createElement('b');
    n.className = 'eje-chip-n';
    n.textContent = cambio ? numeroConSigno(valor) : String(valor);
    // el relato hace rodar este número desde 0 cuando el beat entra (components/feed.js, `animarEfectos`)
    if (Number.isInteger(valor)) {
      n.dataset.rueda = String(Math.abs(valor));
      n.dataset.prefijo = cambio ? numeroConSigno(valor).charAt(0) : '';
    }
    chip.appendChild(n);
  }
  if (sufijo) {
    const cola = document.createElement('span');
    cola.className = 'eje-chip-sufijo';
    cola.textContent = sufijo;
    chip.appendChild(cola);
  }
  return chip;
}

// Una fila de chips desde el texto de efectos del motor. Para un lector de pantalla la fila es una sola imagen con el texto
// original del motor (`role="img"` + `aria-label`): lee la línea tal cual, no chip por chip ni el número mientras rueda.
// `tenue` (C1b): la variante atenuada de la tira técnica.
export function chipsDeTexto(texto, { clase = 'eje-chips', tenue = false } = {}) {
  const fila = document.createElement('div');
  fila.className = clase + (tenue ? ' eje-chips--tenue' : '');
  fila.setAttribute('role', 'img');
  fila.setAttribute('aria-label', String(texto ?? ''));
  for (const e of efectosDeTexto(texto)) fila.appendChild(chipEje({ ...e, titulo: e.texto }));
  return fila;
}
