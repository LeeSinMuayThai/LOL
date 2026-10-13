// Los chips de eje (PLANUI §0.3, puntos 1-3): "▲ Casa +8" con el glifo y el color del eje (core/ejes.js). Los usan la
// planilla, "lo que pasó", el relato y la placa "Vos": un mismo chip en todas las pantallas. Estilos: estilos/ejes.css.
//
// El color del chip es el del eje (qué se movió); el signo va en el triángulo y en el número (--up / --down).
// Una palabra que no es eje da un chip neutro: nada del texto del motor se pierde.
import { ejeDe, EJES } from '../core/ejes.js';
import { icono } from '../fx/iconos.js';

const SIGNO = /^[+\-−±]/;
// "estudios -7", "Mecánica +1", "Sylas +2 maestría", "+13 LP", "macro 53" (sin signo: un valor, no un cambio).
const SEGMENTO = /^(.*?)\s*([+\-−±]?\d+(?:[.,]\d+)?)\s*(.*)$/;

// Texto de efectos del motor -> [{ eje, etiqueta, valor, cambio, sufijo }]. `cambio`: el número traía signo (es un
// delta); sin signo es un valor absoluto (la tira técnica: "macro 53"). `eje` puede ser null (chip neutro).
// Si un segmento no tiene número, vuelve como { etiqueta: segmento, valor: null }.
export function efectosDeTexto(texto) {
  // un encabezado antes de los dos puntos ("Split 6: mecánica -1, …") no es un efecto: se saca
  const limpio = String(texto ?? '').replace(/^[^,:]{1,40}:\s*/, '').trim();
  if (!limpio) return [];
  return limpio.split(/\s*[,·;]\s*/).filter(Boolean).map((seg) => {
    const m = seg.match(SEGMENTO);
    if (!m) return { eje: null, etiqueta: seg, valor: null, cambio: false, sufijo: '' };
    const [, antes, numero, despues] = m;
    const valor = Number(numero.replace('−', '-').replace('±', '').replace(',', '.'));
    // la palabra del eje puede ir antes ("estudios -7") o después ("+2 maestría", "+13 LP")
    const ejeAntes = ejeDe(antes);
    const ejeDespues = ejeDe(despues);
    const eje = ejeAntes ?? ejeDespues;
    // se lee en el orden del motor: "Sylas +2 maestría" -> Sylas · +2 · maestría; sin nombre ("+13 LP"), el del eje
    return { eje, etiqueta: antes.trim() || null, valor, cambio: SIGNO.test(numero), sufijo: despues.trim() };
  });
}

// Un chip. `eje`: id de core/ejes.js o null. `valor`: número o null. `cambio`: true si es un delta (lleva signo;
// C1b puede sumarle los triángulos de fx/iconos.js). `etiqueta`: el texto (por defecto el nombre corto del eje). `sufijo`: "LP", "maestría"…
export function chipEje({ eje = null, valor = null, cambio = true, etiqueta = null, sufijo = '', grande = false } = {}) {
  const chip = document.createElement('span');
  chip.className = 'eje-chip' + (grande ? ' eje-chip--grande' : '');
  if (eje && EJES[eje]) chip.dataset.eje = eje;
  if (cambio && typeof valor === 'number') chip.dataset.signo = valor > 0 ? 'sube' : valor < 0 ? 'baja' : 'igual';
  if (eje && EJES[eje]) chip.appendChild(icono(EJES[eje].glifo, { clase: 'ln-ico eje-chip-ico' }));
  const nombre = document.createElement('span');
  nombre.className = 'eje-chip-nombre';
  nombre.textContent = etiqueta ?? (eje && EJES[eje] ? EJES[eje].corto : '');
  chip.appendChild(nombre);
  if (typeof valor === 'number') {
    const n = document.createElement('b');
    n.className = 'eje-chip-n';
    n.textContent = cambio ? (valor > 0 ? '+' : valor < 0 ? '−' : '±') + Math.abs(valor) : String(valor);
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

// Una fila de chips desde el texto de efectos del motor (con el texto original en `title` y para lectores).
export function chipsDeTexto(texto, { clase = 'eje-chips' } = {}) {
  const fila = document.createElement('div');
  fila.className = clase;
  fila.setAttribute('aria-label', String(texto ?? ''));
  for (const e of efectosDeTexto(texto)) fila.appendChild(chipEje(e));
  return fila;
}
