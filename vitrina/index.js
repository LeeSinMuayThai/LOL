// Indice de la vitrina: miniaturas vivas, lado a lado, matriz de funciones, antes/despues y "como elegir".
import { cargarMuestras } from './comun/datos.js';
import { DIRECCIONES, PANTALLAS, ERAS, PANTALLA_DE, hashDe } from './comun/catalogo.js';

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const ANCHO_ESCRITORIO = 1440;
const ALTO_ESCRITORIO = 900;
const ANCHO_CELULAR = 390;
const ALTO_CELULAR = 844;

// ---------- seed ----------
cargarMuestras().then((d) => {
  $('#seed').textContent = d?.meta?.seed ?? '?';
});

// ---------- miniaturas vivas ----------
// Cada iframe se monta recien cuando su contenedor entra en pantalla y vuelve a about:blank cuando sale. Nunca mas de
// MAX_VIVOS a la vez (las direcciones usan WebGL): si hay mas visibles, quedan vivos los 4 mas cerca del centro.
const MAX_VIVOS = 4;
const items = new Map(); // contenedor -> { url, visible }

const observador = new IntersectionObserver((entradas) => {
  for (const e of entradas) {
    const it = items.get(e.target);
    if (it) it.visible = e.isIntersecting;
  }
  reconciliar();
}, { rootMargin: '120px' });

const escalador = new ResizeObserver((entradas) => {
  for (const e of entradas) escalar(e.target);
});

function distanciaAlCentro(contenedor) {
  const r = contenedor.getBoundingClientRect();
  return Math.abs(r.top + r.height / 2 - innerHeight / 2);
}

function reconciliar() {
  const visibles = [...items].filter(([, it]) => it.visible).sort((x, y) => distanciaAlCentro(x[0]) - distanciaAlCentro(y[0]));
  const vivos = new Set(visibles.slice(0, MAX_VIVOS).map(([c]) => c));
  for (const [contenedor, it] of items) {
    const marco = $('iframe', contenedor);
    if (vivos.has(contenedor)) {
      if (marco.dataset.montada !== it.url) {
        marco.src = it.url; // mismo documento y otro hash: la pagina se entera por hashchange
        marco.dataset.montada = it.url;
      }
    } else if (marco.dataset.montada) {
      marco.src = 'about:blank';
      delete marco.dataset.montada;
    }
  }
}
let pendiente = false;
addEventListener('scroll', () => {
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(() => { pendiente = false; reconciliar(); });
}, { passive: true });

function escalar(contenedor) {
  const marco = contenedor.querySelector('iframe');
  if (!marco) return;
  const celular = contenedor.dataset.dispositivo === 'celular';
  const ancho = celular ? ANCHO_CELULAR : ANCHO_ESCRITORIO;
  const alto = celular ? ALTO_CELULAR : ALTO_ESCRITORIO;
  const k = contenedor.clientWidth / ancho;
  marco.width = ancho;
  marco.height = alto;
  marco.style.transform = `scale(${k})`;
}

function montarVivo(contenedor, dir, hash, dispositivo = 'escritorio') {
  contenedor.dataset.dispositivo = dispositivo;
  const url = `${dir}/index.html#${hash}&panel=0`;
  if (!items.has(contenedor)) {
    const marco = document.createElement('iframe');
    marco.title = `Vista previa de ${dir}`;
    marco.tabIndex = -1;
    marco.setAttribute('aria-hidden', 'true');
    contenedor.appendChild(marco);
    items.set(contenedor, { url, visible: false });
    observador.observe(contenedor);
    escalador.observe(contenedor);
  } else {
    items.get(contenedor).url = url;
  }
  escalar(contenedor);
  reconciliar();
}

// Las tres tarjetas del principio
for (const art of $$('.direccion')) montarVivo($('.vivo', art), art.dataset.dir, art.dataset.hash ?? $('.vivo', art).dataset.hash);

// ---------- lado a lado ----------
const selPantalla = $('#lado-pantalla');
const selMuestra = $('#lado-muestra');
const selEra = $('#lado-era');
const selDisp = $('#lado-dispositivo');
selPantalla.replaceChildren(...Object.keys(PANTALLAS).map((p) => new Option(p, p)));
selEra.replaceChildren(new Option('auto (la de la muestra)', 'auto'), ...ERAS.map((e) => new Option(e, e)));

function llenarMuestras() {
  const ms = PANTALLAS[selPantalla.value] ?? [];
  selMuestra.replaceChildren(...ms.map((m) => new Option(m, m)));
  selMuestra.disabled = ms.length === 0;
}
function actualizarLado() {
  const hash = hashDe({ pantalla: selPantalla.value, muestra: selMuestra.value || undefined, era: selEra.value, dispositivo: selDisp.value });
  $('#lado').dataset.dispositivo = selDisp.value;
  for (const fig of $$('#lado .marco')) {
    montarVivo($('.vivo', fig), fig.dataset.dir, hash, selDisp.value);
    $('[data-abrir]', fig).href = `${fig.dataset.dir}/index.html#${hash}`;
  }
}
selPantalla.addEventListener('change', () => { llenarMuestras(); actualizarLado(); });
for (const s of [selMuestra, selEra, selDisp]) s.addEventListener('change', actualizarLado);
llenarMuestras();
actualizarLado();

// ---------- matriz de funciones ----------
// Solo el catalogo de la ronda 1 (comun/catalogo.js), con era=auto.
const FUNCIONES = [
  ['El ambiente vivo', { pantalla: 'eras' }],
  ['Elegir → resultado', { pantalla: 'decision', muestra: 'evento' }],
  ['El número que rueda', { pantalla: 'cumbre', muestra: 'final' }],
  ['El momento', { pantalla: 'cumbre', muestra: 'titulo' }],
  ['La carta', { pantalla: 'cumbre', muestra: 'final' }],
  ['La tira de eras', { pantalla: 'eras' }],
  ['La intro', { pantalla: 'inicio' }],
  ['Sonido', { pantalla: 'decision', muestra: 'evento', sonido: 1 }],
  ['Celular', { pantalla: 'decision', muestra: 'evento', dispositivo: 'celular' }],
  ['Textos breves', { pantalla: 'decision', muestra: 'planAmateur', textos: 'breves' }],
];
const cuerpoMatriz = $('#matriz');
for (const [nombre, estado] of FUNCIONES) {
  const tr = document.createElement('tr');
  const th = document.createElement('th');
  th.scope = 'row';
  th.textContent = nombre;
  tr.appendChild(th);
  for (const d of DIRECCIONES) {
    const td = document.createElement('td');
    td.dataset.dir = d.letra;
    const a = document.createElement('a');
    a.href = `${d.id}/index.html#${hashDe(estado)}`;
    a.textContent = 'Ver';
    a.setAttribute('aria-label', `${nombre} en ${d.letra} · ${d.nombre}`);
    td.appendChild(a);
    tr.appendChild(td);
  }
  cuerpoMatriz.appendChild(tr);
}

// ---------- antes / despues ----------
const selAD = $('#ad-muestra');
const imgHoy = $('.hoy img');
let indiceHoy = null;
fetch('hoy/indice.json').then((r) => (r.ok ? r.json() : null)).catch(() => null).then((idx) => {
  indiceHoy = idx;
  const claves = Object.keys(idx?.muestras ?? {}).filter((m) => PANTALLA_DE[m]);
  selAD.replaceChildren(...claves.map((m) => new Option(`${PANTALLA_DE[m]} · ${m}`, m)));
  actualizarAD();
});
function actualizarAD() {
  const m = selAD.value;
  if (!m || !indiceHoy) return;
  const ficha = indiceHoy.muestras[m];
  imgHoy.src = `hoy/${ficha.archivo}`;
  $('#ad-nota').textContent = ficha.nota ?? ficha.titulo ?? '';
  const hash = hashDe({ pantalla: PANTALLA_DE[m], muestra: m });
  for (const fig of $$('#antes-despues-grilla .marco[data-dir]')) {
    montarVivo($('.vivo', fig), fig.dataset.dir, hash);
    $('[data-abrir]', fig).href = `${fig.dataset.dir}/index.html#${hash}`;
  }
}
selAD.addEventListener('change', actualizarAD);

// ---------- como elegir ----------
const form = $('#form-eleccion');
const salida = $('#texto-eleccion');
function textoEleccion() {
  const base = form.elements.base.value;
  const ideas = $$('input[name=idea]:checked', form).map((i) => {
    const origen = i.dataset.origen; // A | B | C | '' (para cualquiera)
    return origen && origen !== base ? `${i.value} (de ${origen})` : i.value;
  });
  const cuerpo = (base ? `Elijo ${base}` : 'Todavía no elegí base') + ideas.map((i) => ` + ${i}`).join('');
  const ajustes = `textos ${form.elements.breves.checked ? 'breves' : 'completos'}; sonido ${form.elements.sonido.checked ? 'prendido' : 'apagado'}`;
  const libre = form.elements.libre.value.trim();
  return `${cuerpo}; ${ajustes}.${libre ? ` Algo más: ${libre}` : ''}`;
}
function refrescar() {
  salida.textContent = textoEleccion();
}
form.addEventListener('change', refrescar);
form.addEventListener('input', refrescar);
refrescar();

$('#copiar').addEventListener('click', async () => {
  const texto = textoEleccion();
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  const aviso = $('#copiado');
  aviso.textContent = 'Copiado';
  setTimeout(() => (aviso.textContent = ''), 2200);
});
