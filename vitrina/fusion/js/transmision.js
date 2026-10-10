// LA TRANSMISION (PLANUI §4.9, LINEA.md §4.4): el vocabulario grafico de la transmision de LoL Esports, fino y caro.
// Placas oscuras delgadas, logos reales como <img> (logoOrg/logoComp de js/competicion.js; nunca un canvas), siglas, el
// marcador en Mona expandida 900 tabular, los pips de mapa; la placa inferior (lower third) y la cinta que corre. El
// color es el ACENTO DEL TONO (--tono-acento: aplicarTono() de js/tono.js en un ancestro, o el `tono` de la placa).
//   marcador({ comp, rotulo, local, visita, formato, mapas }) -> { nodo, actualizar({ local, visita, mapas }) }
//   placaInferior({ rotulo, titulo, sub, tono }) -> nodo
//   cinta({ rotulo, items }) -> nodo
// Estilos: estilos/transmision.css (prefijo ln-). La cinta corre por CSS y queda quieta con movimiento reducido o INST.
import { el, reducido, inst } from './util.js';
import { logoComp } from './competicion.js';
import { aplicarTono } from './tono.js';

const quieto = () => reducido() || inst();
// cuantos mapas hay que ganar en un Bo{formato}
const aGanar = (formato) => Math.floor((Math.max(1, Number(formato) || 1)) / 2) + 1;
// el resultado de un mapa visto desde el local: true gano, false perdio, null sin jugar
function ganoLocal(m) {
  const r = typeof m === 'object' && m ? m.resultado : m;
  if (r === true || r === false) return r;
  const s = String(r ?? '').toLowerCase();
  if (['v', 'victoria', 'gano', 'local', 'w'].includes(s)) return true;
  if (['d', 'derrota', 'perdio', 'visita', 'l'].includes(s)) return false;
  return null;
}
const cuenta = (mapas, lado) => (mapas ?? []).filter((m) => ganoLocal(m) === (lado === 'local')).length;

// ---------- el marcador ----------
export function marcador({ comp, rotulo = '', local = {}, visita = {}, formato = 1, mapas = [] } = {}) {
  const n = aGanar(formato);
  const lado = (eq, cual) => {
    const pips = el('span', { class: 'ln-mc-pips', 'aria-hidden': 'true' }, Array.from({ length: n }, () => el('i', { class: 'ln-mc-pip' })));
    const num = el('b', { class: 'ln-mc-num', 'aria-hidden': 'true' });
    const caja = el('div', { class: `ln-mc-eq ln-mc-${cual}` }, [
      el('span', { class: 'ln-mc-logo' }, eq.logo ?? null),
      el('span', { class: 'ln-mc-nombre' }, [el('b', { class: 'ln-mc-sigla', text: eq.sigla ?? '' }), pips]),
      num,
    ]);
    return { caja, num, pips };
  };
  const L = lado(local, 'local');
  const V = lado(visita, 'visita');
  const centro = el('div', { class: 'ln-mc-centro' }, [comp ? logoComp(comp, { clase: 'ln-mc-comp' }) : null, el('span', { class: 'ln-mc-rotulo', text: rotulo }), el('span', { class: 'ln-mc-formato', text: `Bo${formato}` })]);
  const nodo = el('div', { class: 'ln-marcador', role: 'group' }, [L.caja, centro, V.caja]);
  const estado = { local: { ...local }, visita: { ...visita }, mapas: [...mapas] };
  function pintar(golpe) {
    const nL = estado.local.marcador ?? cuenta(estado.mapas, 'local');
    const nV = estado.visita.marcador ?? cuenta(estado.mapas, 'visita');
    for (const [x, v, eq] of [[L, nL, estado.local], [V, nV, estado.visita]]) {
      const antes = x.num.textContent;
      x.num.textContent = String(v);
      [...x.pips.children].forEach((p, i) => p.classList.toggle('ganado', i < v));
      x.caja.querySelector('.ln-mc-sigla').textContent = eq.sigla ?? '';
      if (golpe && antes !== String(v) && !quieto()) x.num.animate([{ transform: 'scale(1.35)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' });
    }
    nodo.setAttribute('aria-label', `${estado.local.nombre ?? estado.local.sigla ?? 'Local'} ${nL}, ${estado.visita.nombre ?? estado.visita.sigla ?? 'Visita'} ${nV}${rotulo ? ` · ${rotulo}` : ''} · al mejor de ${formato}`);
  }
  pintar(false);
  return {
    nodo,
    actualizar({ local: l, visita: v, mapas: m } = {}) {
      if (l) estado.local = { ...estado.local, ...l };
      if (v) estado.visita = { ...estado.visita, ...v };
      if (m) estado.mapas = [...m];
      pintar(true);
    },
  };
}

// ---------- la placa inferior ----------
export function placaInferior({ rotulo = '', titulo = '', sub = '', tono } = {}) {
  const nodo = el('div', { class: 'ln-placa' }, [
    el('i', { class: 'ln-placa-filo', 'aria-hidden': 'true' }),
    el('div', { class: 'ln-placa-cuerpo' }, [
      rotulo ? el('p', { class: 'ln-placa-rotulo', text: rotulo }) : null,
      el('p', { class: 'ln-placa-titulo', text: titulo }),
      sub ? el('p', { class: 'ln-placa-sub', text: sub }) : null,
    ]),
  ]);
  if (tono) aplicarTono(nodo, tono);
  return nodo;
}

// ---------- la cinta ----------
// Los items van dos veces seguidos (el segundo juego, aria-hidden) y la tira se corre la mitad: un loop sin salto. El
// tiempo depende del largo del texto (SEG_POR_LETRA, con un minimo), asi la velocidad es la misma con pocas o muchas.
const SEG_POR_LETRA = 0.16;
const SEG_MIN = 18;
export function cinta({ rotulo = '', items = [] } = {}) {
  const item = (x, oculto) => el('span', { class: 'ln-cinta-item', 'aria-hidden': oculto ? 'true' : null }, [x.logo ? (oculto ? x.logo.cloneNode(true) : x.logo) : null, el('span', { text: x.texto ?? '' })]);
  const tira = el('div', { class: 'ln-cinta-tira' }, [...items.map((x) => item(x, false)), ...items.map((x) => item(x, true))]);
  const letras = items.reduce((s, x) => s + String(x.texto ?? '').length + 6, 0);
  const nodo = el('div', { class: 'ln-cinta', role: 'region', 'aria-label': rotulo || 'Noticias', style: { '--ln-cinta-dur': `${Math.max(SEG_MIN, Math.round(letras * SEG_POR_LETRA))}s` } }, [
    rotulo ? el('b', { class: 'ln-cinta-rotulo', text: rotulo }) : null,
    el('div', { class: 'ln-cinta-pista' }, tira),
  ]);
  return nodo;
}
