// opciones.html (PLANUI §4.7): las tres opciones de diseño de cada pantalla lado a lado. Cada columna es la fusión entera
// (index.html) en un iframe de 1440x900 escalado, viva e interactiva, con el panel de la vitrina oculto, `color=receta` y
// `op=<id>` en el hash. Las pestañas cambian la pantalla (y las tres opciones) a la vez. Clic (o 1-3) abre una grande, con
// el conmutador (1-3 las opciones, 0 = como hoy: sin color ni op; con Alt desde adentro del juego); Esc vuelve. Mientras
// una está grande, las otras dos pausan su mundo (tres WebGL a la vez).
import { eraEfectiva } from '../../comun/catalogo.js';

const COLOR = 'receta'; // el color de las tres columnas (todavia puede caer al valor por defecto)
const HOY = 'hoy'; // la vista "como hoy": sin color ni op
const PARTIDO = [
  { op: 'luz', titulo: 'La luz del evento', linea: 'La luz toma los colores del torneo; logos en el marcador.', corto: 'Luz' },
  { op: 'transmision', titulo: 'La transmisión oficial', linea: 'Vestida como la transmisión del torneo: marcador, placas, cortina de entrada.', corto: 'Transmisión' },
  { op: 'escenario', titulo: 'El escenario', linea: 'El fondo es la arena: luces del torneo, pantalla gigante, público.', corto: 'Escenario' },
];
const PESTANAS = [
  { id: 'serie', titulo: 'La serie', pantalla: 'partido', muestra: 'serie', opciones: PARTIDO },
  { id: 'swiss', titulo: 'El Swiss', pantalla: 'partido', muestra: 'swiss', opciones: PARTIDO },
  {
    id: 'decision', titulo: 'La decisión', pantalla: 'decision', muestra: 'evento',
    opciones: [
      { op: 'escena', titulo: 'La escena', linea: 'El fondo cuenta lo que pasa; apuntar una opción cruza la escena a ese camino.', corto: 'Escena' },
      { op: 'cliente', titulo: 'El momento del cliente', linea: 'La decisión grande llega como una invitación del cliente, con el anillo de Aceptar.', corto: 'Cliente' },
      { op: 'bisagra', titulo: 'El peso', linea: 'La decisión grande como capítulo: lo que arriesgás y los dos caminos en la luz.', corto: 'El peso' },
    ],
  },
  {
    id: 'mercado', titulo: 'El mercado', pantalla: 'mercado', muestra: 'mercado',
    opciones: [
      { op: 'mesa', titulo: 'La mesa de firma', linea: 'Cada oferta es un contrato con el logo de la org; Enter firma.', corto: 'Mesa' },
      { op: 'anuncio', titulo: 'El anuncio', linea: 'Cada oferta como la placa oficial de fichaje de la org.', corto: 'Anuncio' },
      { op: 'orgs', titulo: 'Te llaman', linea: 'Los logos de las orgs en la luz; apuntar una lleva el mundo a sus colores.', corto: 'Te llaman' },
    ],
  },
];
const LINEA_HOY = 'Como está hoy: sin receta de color ni opción de diseño.';
const ANCHO = 1440;
const ALTO = 900;
const ALTO_BARRA = 52; // la barra del modo grande, arriba del juego

const html = document.documentElement;
const columnas = document.getElementById('columnas');
const nav = document.querySelector('.oc-pestanas');
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
let vista = null; // el op de la grande (o HOY); puede no ser el de su columna

const hashDe = (p, op) => `pantalla=${p.pantalla}&muestra=${p.muestra}&era=auto&panel=0${op === HOY ? '' : `&color=${COLOR}&op=${op}`}`;
const srcDe = (p, op) => `index.html#${hashDe(p, op)}`;
const opDe = (p, i) => p.opciones[i].op;

// ---------- las tres columnas ----------
const cols = [0, 1, 2].map((i) => {
  const o = pestana.opciones[i];
  const marco = el('iframe', { class: 'oc-marco', title: `${o.titulo}: ${o.linea}`, src: srcDe(pestana, o.op), width: String(ANCHO), height: String(ALTO), tabindex: '-1' });
  const ventana = el('div', { class: 'oc-ventana' }, marco);
  const nombre = el('b', { class: 'oc-col-nombre', text: o.titulo.toLowerCase() });
  const linea = el('span', { class: 'oc-col-linea', text: o.linea });
  const abrirBtn = el('button', { type: 'button', class: 'oc-col-cab', 'aria-label': `Ver grande: ${o.titulo}` }, [
    el('span', { class: 'op-tecla', text: String(i + 1) }),
    el('span', { class: 'oc-col-txt' }, [nombre, linea]),
  ]);
  abrirBtn.addEventListener('click', () => abrir(i));
  const nodo = el('section', { class: 'oc-col', 'aria-label': o.titulo }, [abrirBtn, ventana]);
  columnas.append(nodo);
  marco.addEventListener('load', () => instalar(marco, i));
  return { i, nodo, marco, ventana, abrirBtn, nombre, linea };
});
const rotular = () => cols.forEach((c) => {
  const o = pestana.opciones[c.i];
  c.nombre.textContent = o.titulo.toLowerCase();
  c.linea.textContent = o.linea;
  c.nodo.setAttribute('aria-label', o.titulo);
  c.abrirBtn.setAttribute('aria-label', `Ver grande: ${o.titulo}`);
  c.marco.title = `${o.titulo}: ${o.linea}`;
});

// Lo que pasa adentro de cada iframe (es del mismo origen): en el lado a lado, un clic abre la grande en vez de elegir y
// 1-3 abren la columna; en la grande, Alt+1-3/0 cambian la opcion y Esc (si el juego no lo uso) vuelve.
function instalar(marco, i) {
  const w = marco.contentWindow;
  if (!w || w.__opciones) return;
  w.__opciones = true;
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
  const b = el('button', { type: 'button', role: 'tab', class: 'cuarto oc-pestana', 'aria-selected': String(p === pestana), text: p.titulo });
  b.addEventListener('click', () => irA(p));
  nav.append(b);
  return b;
});
function irA(p) {
  if (p === pestana) return;
  if (grande != null) cerrar({ enfocar: false });
  pestana = p;
  history.replaceState(null, '', `#p=${p.id}`);
  botonesP.forEach((b, i) => b.setAttribute('aria-selected', String(PESTANAS[i] === p)));
  marcarEra();
  rotular();
  cols.forEach((c) => {
    c.marco.contentWindow.location.hash = hashDe(p, opDe(p, c.i));
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
    if (c.i === grande) continue;
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
// el conmutador: 1-3 las opciones de la pestaña, 0 como hoy (se rearma al abrir, porque las opciones cambian con la pestaña)
let segBotones = [];
const lineaGrande = el('p', { class: 'oc-grande-linea' });
const volver = el('button', { type: 'button', class: 'boton oc-volver', onclick: () => cerrar() }, ['Lado a lado', el('kbd', { text: 'Esc' })]);
const grupo = el('div', { class: 'oc-seg-grupo', role: 'group', 'aria-label': 'Opción' });
barra.append(volver, grupo, lineaGrande);
function armarConmutador() {
  const items = [...pestana.opciones.map((o, i) => [String(i + 1), o.op, o.corto, o.linea]), ['0', HOY, 'Como hoy', LINEA_HOY]];
  segBotones = items.map(([k, op, corto, linea]) => {
    const b = el('button', { type: 'button', class: 'oc-seg', 'data-op': op, title: linea }, [el('span', { class: 'op-tecla', text: k }), corto]);
    b.addEventListener('click', () => {
      conmutar(k);
      enfocarJuego();
    });
    return b;
  });
  grupo.replaceChildren(...segBotones);
}

const pausar = (c, si) => c.marco.contentWindow?.postMessage({ vitrina: 'ambiente', pausar: si }, location.origin);
function enfocarJuego() {
  if (grande == null) return;
  const m = cols[grande].marco;
  m.focus();
  m.contentWindow?.focus();
}
function pintarBarra() {
  segBotones.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.op === vista)));
  lineaGrande.textContent = vista === HOY ? LINEA_HOY : pestana.opciones.find((o) => o.op === vista).linea;
}
function mostrar(op) {
  vista = op;
  cols[grande].marco.contentWindow.location.hash = hashDe(pestana, op);
  pintarBarra();
}
function abrir(i) {
  if (grande === i) return;
  if (grande != null) cerrar({ enfocar: false });
  grande = i;
  vista = opDe(pestana, i);
  html.dataset.grande = '';
  cols[i].nodo.dataset.abierta = '';
  cols.forEach((c) => pausar(c, c.i !== i));
  armarConmutador();
  barra.hidden = false;
  pintarBarra();
  escalar();
  enfocarJuego();
}
function conmutar(tecla) {
  if (grande == null) return;
  mostrar(tecla === '0' ? HOY : (pestana.opciones[Number(tecla) - 1]?.op ?? vista));
}
function cerrar({ enfocar = true } = {}) {
  if (grande == null) return;
  const c = cols[grande];
  // vuelve a su opcion (si se cambio adentro de la grande)
  const suya = opDe(pestana, c.i);
  if (vista !== suya) c.marco.contentWindow.location.hash = hashDe(pestana, suya);
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
// medir: window.opciones.fps(ms) cuenta los cuadros de la pagina y de cada columna durante ms
window.opciones = {
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
