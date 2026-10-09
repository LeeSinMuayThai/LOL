// variantes.html (PLANUI §4.6): las tres variantes del COLOR del campeon lado a lado, sobre la misma pantalla y con
// `fondo=menos` ("un poco menos" de campeon de fondo). Cada columna es la fusion entera (index.html) en un iframe de
// 1440x900 escalado, viva e interactiva, con el panel de la vitrina oculto y `color`/`fondo` en el hash. Las pestañas
// cambian la pantalla de las tres a la vez. Clic (o 1-3) abre una grande, con el conmutador (1-3 las tres, 0 = como hoy:
// duotono y pleno; con Alt desde adentro del juego) y el espacio como selector secundario; Esc vuelve. Mientras una esta
// grande, las otras dos pausan su mundo (tres WebGL a la vez).
import { POLITICAS } from './fondo.js';
import { POLITICAS_COLOR } from './color.js';
import { eraEfectiva } from '../../comun/catalogo.js';

const VARIANTES = ['real', 'mitad', 'capas']; // el color de cada columna
const ESPACIO_DEF = 'menos'; // el fondo de las tres columnas
const HOY = { color: 'duotono', fondo: 'pleno' };
const CONMUTADOR = [['1', 'real', 'A color'], ['2', 'mitad', 'Mitad'], ['3', 'capas', 'Retratos a color'], ['0', 'duotono', 'Como hoy']];
const ESPACIOS = ['pleno', 'menos', 'tenue', 'paso', 'lugar'];
const PESTANAS = [
  { id: 'serie', titulo: 'La serie', pantalla: 'partido', muestra: 'serie' },
  { id: 'swiss', titulo: 'El Swiss', pantalla: 'partido', muestra: 'swiss' },
  { id: 'decision', titulo: 'La decisión', pantalla: 'decision', muestra: 'evento' },
  { id: 'mercado', titulo: 'El mercado', pantalla: 'mercado', muestra: 'mercado' },
];
const ANCHO = 1440;
const ALTO = 900;
const ALTO_BARRA = 52; // la barra del modo grande, arriba del juego

const html = document.documentElement;
const columnas = document.getElementById('columnas');
const nav = document.querySelector('.va-pestanas');
const barra = document.getElementById('barra');
const el = (tag, attrs = {}, hijos = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const h of [].concat(hijos)) if (h != null) n.append(h);
  return n;
};

// ---------- estado: la pestaña vive en el hash de la pagina (#p=serie) ----------
const deHash = () => new URLSearchParams(location.hash.slice(1));
let pestana = PESTANAS.find((p) => p.id === deHash().get('p')) ?? PESTANAS[0];
let grande = null; // indice de la columna abierta grande, o null
let vista = null; // { color, fondo } de la grande (puede no ser la de su columna)
let espacio = ESPACIO_DEF; // el selector secundario de la grande

const hashDe = (p, v) => `pantalla=${p.pantalla}&muestra=${p.muestra}&era=auto&panel=0&fondo=${v.fondo}&color=${v.color}`;
const srcDe = (p, v) => `index.html#${hashDe(p, v)}`;
const deColumna = (v) => ({ color: v, fondo: ESPACIO_DEF });

// ---------- las tres columnas ----------
const cols = VARIANTES.map((v, i) => {
  const pol = POLITICAS_COLOR[v];
  const marco = el('iframe', { class: 'va-marco', title: `${pol.etiqueta}: ${pol.linea}`, src: srcDe(pestana, deColumna(v)), width: String(ANCHO), height: String(ALTO), tabindex: '-1' });
  const ventana = el('div', { class: 'va-ventana' }, marco);
  const abrirBtn = el('button', { type: 'button', class: 'va-col-cab', 'aria-label': `Ver grande: ${pol.etiqueta}` }, [
    el('span', { class: 'op-tecla', text: String(i + 1) }),
    el('span', { class: 'va-col-txt' }, [el('b', { class: 'va-col-nombre', text: pol.etiqueta.toLowerCase() }), el('span', { class: 'va-col-linea', text: pol.linea })]),
  ]);
  abrirBtn.addEventListener('click', () => abrir(i));
  const nodo = el('section', { class: 'va-col', 'data-color': v, 'aria-label': pol.etiqueta }, [abrirBtn, ventana]);
  columnas.append(nodo);
  marco.addEventListener('load', () => instalar(marco, i));
  return { v, nodo, marco, ventana, abrirBtn };
});

// Lo que pasa adentro de cada iframe (es del mismo origen): en el lado a lado, un clic abre la grande en vez de elegir y
// 1-3 abren la columna; en la grande, Alt+1-3/0 cambian la variante y Esc (si el juego no lo uso) vuelve.
function instalar(marco, i) {
  const w = marco.contentWindow;
  if (!w || w.__variantes) return;
  w.__variantes = true;
  w.addEventListener('click', (e) => {
    if (grande != null) return;
    e.preventDefault();
    e.stopPropagation();
    abrir(i);
  }, true);
  w.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) return;
    if (grande == null && !e.altKey && /^[1-3]$/.test(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      abrir(Number(e.key) - 1);
    } else if (grande != null && e.altKey && /^Digit[0-3]$/.test(e.code)) {
      e.preventDefault();
      e.stopPropagation();
      conmutar(e.code.slice(5));
    }
  }, true);
  w.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !e.defaultPrevented && grande != null) cerrar();
  });
}

// ---------- pestañas ----------
const botonesP = PESTANAS.map((p) => {
  const b = el('button', { type: 'button', role: 'tab', class: 'cuarto va-pestana', 'aria-selected': String(p === pestana), text: p.titulo });
  b.addEventListener('click', () => irA(p));
  nav.append(b);
  return b;
});
function irA(p) {
  if (p === pestana) return;
  pestana = p;
  history.replaceState(null, '', `#p=${p.id}`);
  botonesP.forEach((b, i) => {
    b.setAttribute('aria-selected', String(PESTANAS[i] === p));
    b.classList.toggle('activo', PESTANAS[i] === p);
  });
  marcarEra();
  cols.forEach((c, i) => {
    c.marco.contentWindow.location.hash = hashDe(p, grande === i && vista ? vista : deColumna(c.v));
  });
}
// el acento de la pagina es la luz de la era de la pantalla que se mira
function marcarEra() {
  html.dataset.era = eraEfectiva('auto', pestana.pantalla, pestana.muestra);
  botonesP.forEach((b, i) => b.classList.toggle('activo', PESTANAS[i] === pestana));
}

// ---------- escala ----------
function escalar() {
  for (const c of cols) {
    if (cols.indexOf(c) === grande) continue;
    const s = c.ventana.clientWidth / ANCHO;
    c.ventana.style.height = `${Math.round(ALTO * s)}px`;
    c.marco.style.transform = `scale(${s})`;
    c.marco.style.left = '';
    c.marco.style.top = '';
  }
  if (grande != null) {
    const s = Math.min(innerWidth / ANCHO, (innerHeight - ALTO_BARRA) / ALTO);
    const m = cols[grande].marco;
    m.style.transform = `scale(${s})`;
    m.style.left = `${Math.round((innerWidth - ANCHO * s) / 2)}px`;
    m.style.top = `${Math.round(ALTO_BARRA + (innerHeight - ALTO_BARRA - ALTO * s) / 2)}px`;
  }
}
addEventListener('resize', escalar);

// ---------- grande ----------
const segBotones = CONMUTADOR.map(([k, c, corto]) => {
  const b = el('button', { type: 'button', class: 'va-seg', 'data-color': c, title: POLITICAS_COLOR[c].linea }, [el('span', { class: 'op-tecla', text: k }), corto]);
  b.addEventListener('click', () => {
    conmutar(k);
    enfocarJuego();
  });
  return b;
});
// el espacio (cuanto campeon de fondo): selector secundario
const selEspacio = el('select', { class: 'va-espacio', 'aria-label': 'Espacio: cuánto campeón de fondo' }, ESPACIOS.map((f) => el('option', { value: f, text: f === 'pleno' ? 'Hoy' : POLITICAS[f].etiqueta })));
selEspacio.addEventListener('change', () => {
  espacio = selEspacio.value;
  if (grande == null) return;
  mostrar({ color: vista.color, fondo: espacio });
  enfocarJuego();
});
const lineaGrande = el('p', { class: 'va-grande-linea' });
const volver = el('button', { type: 'button', class: 'boton va-volver', onclick: () => cerrar() }, ['Lado a lado', el('kbd', { text: 'Esc' })]);
barra.append(
  volver,
  el('div', { class: 'va-seg-grupo', role: 'group', 'aria-label': 'Color' }, segBotones),
  el('label', { class: 'va-espacio-campo' }, [el('span', { text: 'Espacio' }), selEspacio]),
  lineaGrande,
);

const pausar = (c, si) => c.marco.contentWindow?.postMessage({ vitrina: 'ambiente', pausar: si }, location.origin);
function enfocarJuego() {
  if (grande == null) return;
  const m = cols[grande].marco;
  m.focus();
  m.contentWindow?.focus();
}
function pintarBarra() {
  segBotones.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.color === vista.color)));
  selEspacio.value = vista.fondo;
  lineaGrande.textContent = POLITICAS_COLOR[vista.color].linea;
}
function mostrar(v) {
  vista = v;
  cols[grande].marco.contentWindow.location.hash = hashDe(pestana, v);
  pintarBarra();
}
function abrir(i) {
  if (grande === i) return;
  if (grande != null) cerrar({ enfocar: false });
  grande = i;
  espacio = ESPACIO_DEF;
  vista = deColumna(cols[i].v);
  html.dataset.grande = '';
  cols[i].nodo.dataset.abierta = '';
  cols.forEach((c, k) => pausar(c, k !== i));
  barra.hidden = false;
  pintarBarra();
  escalar();
  enfocarJuego();
}
function conmutar(tecla) {
  if (grande == null) return;
  const c = CONMUTADOR.find(([k]) => k === tecla)?.[1];
  if (!c) return;
  // 0 = como hoy (duotono y pleno); 1-3 = ese color, con el espacio elegido
  mostrar(c === HOY.color ? { ...HOY } : { color: c, fondo: espacio });
}
function cerrar({ enfocar = true } = {}) {
  if (grande == null) return;
  const c = cols[grande];
  // vuelve a su variante (si se cambio adentro de la grande)
  const suya = deColumna(c.v);
  if (vista.color !== suya.color || vista.fondo !== suya.fondo) c.marco.contentWindow.location.hash = hashDe(pestana, suya);
  delete c.nodo.dataset.abierta;
  delete html.dataset.grande;
  grande = null;
  vista = null;
  barra.hidden = true;
  cols.forEach((x) => pausar(x, false));
  escalar();
  if (enfocar) c.abrirBtn.focus();
}

// ---------- teclado de la pagina ----------
addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) return;
  if (e.key === 'Escape' && grande != null) {
    e.preventDefault();
    cerrar();
  } else if (grande == null && !e.altKey && /^[1-3]$/.test(e.key)) {
    e.preventDefault();
    abrir(Number(e.key) - 1);
  } else if (grande != null && /^Digit[0-3]$/.test(e.code)) {
    e.preventDefault();
    conmutar(e.code.slice(5));
  }
});
addEventListener('hashchange', () => {
  const p = PESTANAS.find((x) => x.id === deHash().get('p'));
  if (p) irA(p);
});

marcarEra();
escalar();
// medir: window.variantes.fps(ms) cuenta los cuadros de la pagina y de cada columna durante ms
window.variantes = {
  abrir,
  cerrar,
  conmutar,
  irA: (id) => irA(PESTANAS.find((p) => p.id === id) ?? pestana),
  async fps(ms = 3000) {
    const contar = (w) => new Promise((r) => {
      let n = 0;
      const t0 = w.performance.now();
      const paso = () => {
        n++;
        if (w.performance.now() - t0 < ms) w.requestAnimationFrame(paso);
        else r(Math.round((n * 1000) / (w.performance.now() - t0)));
      };
      w.requestAnimationFrame(paso);
    });
    const [pagina, ...marcos] = await Promise.all([contar(window), ...cols.map((c) => contar(c.marco.contentWindow))]);
    return { pagina, marcos };
  },
};
