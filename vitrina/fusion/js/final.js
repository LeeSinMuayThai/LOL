// final.html (PLANUI §4.8): la ultima demostracion. UN solo iframe grande con la fusion entera (index.html, 1440x900 escalado,
// viva e interactiva, panel de la vitrina oculto, era=auto). Las pestañas cambian su hash; 0 alterna entre la version final
// (op=final) y "como estaba" (el mismo hash sin op); R recarga el iframe para ver otra vez las animaciones de entrada.
// Las teclas funcionan con el foco en la pagina o adentro del juego (mismo origen: se escucha tambien en la ventana del marco).
import { eraEfectiva } from '../../comun/catalogo.js';

// Lo que el supervisor puede ajustar: las pestañas, su hash y la linea de "que mirar". `op: false` = sin version final
// (es la referencia o no cambia): ahi 0 no tiene nada con que comparar.
const PESTANAS = [
  { id: 'inicio', titulo: 'El inicio', pantalla: 'inicio', muestra: null, op: false, mirar: 'Así arranca: tu main al 100%.' },
  { id: 'decision', titulo: 'La decisión', pantalla: 'decision', muestra: 'evento', op: true, mirar: 'La invitación de la LCK: aceptala y se abre el capítulo con los dos caminos.' },
  { id: 'serie', titulo: 'La serie', pantalla: 'partido', muestra: 'serie', op: true, mirar: 'Las pantallas del estadio muestran tu pick y el del rival; apuntá campeones y jugá con 1-3.' },
  { id: 'swiss', titulo: 'El Swiss', pantalla: 'partido', muestra: 'swiss', op: true, mirar: 'Lo ves como un stream: la transmisión en el player y el chat al costado.' },
  { id: 'mercado', titulo: 'El mercado', pantalla: 'mercado', muestra: 'mercado', op: true, mirar: 'Las ofertas entran; apuntá una org, leé su contrato y firmá con Enter.' },
  { id: 'firma', titulo: 'La firma', pantalla: 'mercado', muestra: 'firma', op: true, mirar: 'LOUD.' },
  { id: 'titulo', titulo: 'El título', pantalla: 'cumbre', muestra: 'titulo', op: false, mirar: 'CAMPEONES.' },
];
const OP_FINAL = 'final';
const ANCHO = 1440;
const ALTO = 900;

const html = document.documentElement;
const marco = document.getElementById('marco');
const escenario = document.getElementById('escenario');
const nav = document.querySelector('.fn-pestanas');
const indicador = document.getElementById('indicador');
const indTxt = document.getElementById('ind-txt');
const mirarTxt = document.getElementById('mirar-txt');
const btnComparar = document.getElementById('comparar');
const txtComparar = document.getElementById('comparar-txt');
const btnRepetir = document.getElementById('repetir');

// ---------- estado: la pestaña vive en el hash de la pagina (#p=serie) ----------
const deHash = () => new URLSearchParams(location.hash.slice(1));
let pestana = PESTANAS.find((p) => p.id === deHash().get('p')) ?? PESTANAS[0];
let estaba = false; // true = "como estaba" (sin op)

const hashDe = (p, conOp) => `pantalla=${p.pantalla}${p.muestra ? `&muestra=${p.muestra}` : ''}${p.op && conOp ? `&op=${OP_FINAL}` : ''}&era=auto&panel=0`;
const srcDe = (p) => `index.html#${hashDe(p, true)}`;

// ---------- pestañas ----------
const botones = PESTANAS.map((p) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('role', 'tab');
  b.className = 'cuarto fn-pestana';
  b.textContent = p.titulo;
  b.addEventListener('click', () => {
    irA(p);
    enfocarJuego();
  });
  nav.append(b);
  return b;
});

function pintar() {
  botones.forEach((b, i) => {
    b.setAttribute('aria-selected', String(PESTANAS[i] === pestana));
    b.classList.toggle('activo', PESTANAS[i] === pestana);
  });
  html.dataset.era = eraEfectiva('auto', pestana.pantalla, pestana.muestra);
  mirarTxt.textContent = pestana.mirar;
  const vista = !pestana.op ? 'referencia' : estaba ? 'estaba' : 'final';
  indicador.dataset.vista = vista;
  indTxt.textContent = vista === 'referencia' ? 'sin cambios: es la referencia' : vista === 'estaba' ? 'como estaba' : 'final';
  btnComparar.disabled = !pestana.op;
  txtComparar.textContent = estaba ? 'Volver a la final' : 'Como estaba';
}
function irA(p) {
  if (p === pestana) return;
  pestana = p;
  estaba = false;
  history.replaceState(null, '', `#p=${p.id}`);
  pintar();
  marco.contentWindow.location.hash = hashDe(p, true);
}
function paso(d) {
  const i = PESTANAS.indexOf(pestana);
  irA(PESTANAS[(i + d + PESTANAS.length) % PESTANAS.length]);
}
function comparar() {
  if (!pestana.op) return;
  estaba = !estaba;
  pintar();
  marco.contentWindow.location.hash = hashDe(pestana, !estaba);
}
// recarga el iframe (con el hash de ahora) para ver otra vez las animaciones de entrada
function repetir() {
  marco.contentWindow.location.reload();
}
function enfocarJuego() {
  marco.focus();
  marco.contentWindow?.focus();
}
btnComparar.addEventListener('click', () => {
  comparar();
  enfocarJuego();
});
btnRepetir.addEventListener('click', () => {
  repetir();
  enfocarJuego();
});

// ---------- escala: lo mas grande que entre manteniendo 16:10, centrado ----------
function escalar() {
  const W = escenario.clientWidth;
  const H = escenario.clientHeight;
  const s = Math.min(W / ANCHO, H / ALTO);
  marco.style.transform = `scale(${s})`;
  marco.style.left = `${Math.round((W - ANCHO * s) / 2)}px`;
  marco.style.top = `${Math.round((H - ALTO * s) / 2)}px`;
}
addEventListener('resize', escalar);

// ---------- teclado: en la pagina y adentro del juego ----------
function tecla(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') paso(e.key === 'ArrowRight' ? 1 : -1);
  else if (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0') comparar();
  else if (e.key === 'r' || e.key === 'R') repetir();
  else return;
  e.preventDefault();
  e.stopPropagation();
}
addEventListener('keydown', (e) => {
  if (!e.repeat) tecla(e);
});
marco.addEventListener('load', () => {
  const w = marco.contentWindow;
  if (!w || w.__final) return;
  w.__final = true;
  w.addEventListener('keydown', (e) => {
    if (!e.repeat) tecla(e);
  }, true);
});
addEventListener('hashchange', () => {
  const p = PESTANAS.find((x) => x.id === deHash().get('p'));
  if (p) irA(p);
});

pintar();
escalar();
marco.src = srcDe(pestana);
window.final = { irA: (id) => irA(PESTANAS.find((p) => p.id === id) ?? pestana), comparar, repetir, estado: () => ({ pestana: pestana.id, estaba }) };
