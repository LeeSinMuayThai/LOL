// final.html (PLANUI §4.8, §4.9): la demostracion. UN solo iframe grande con la fusion entera (index.html, 1440x900
// escalado, viva e interactiva, panel de la vitrina oculto, era=auto). Las pestañas cambian su hash; cada una tiene su
// version (`op`, hoy `linea`: "una linea") y la de antes (`antes`: la demostracion final de §4.8, o null = sin op); 0
// alterna entre las dos; R recarga el iframe para ver otra vez las animaciones de entrada. "Las 7 juntas" no es el juego:
// es la hoja de contactos de las siete pantallas (la arma el supervisor al final de la ronda).
// Las teclas funcionan con el foco en la pagina o adentro del juego (mismo origen: se escucha tambien en la ventana del marco).
import { eraEfectiva } from '../../comun/catalogo.js';

// Lo que el supervisor puede ajustar: las pestañas, su hash y la linea de "que mirar". `op: null` = sin version nueva
// (el inicio es la referencia): ahi 0 no tiene nada con que comparar. `imagen`: la pestaña muestra esa imagen y no el juego.
const PESTANAS = [
  { id: 'inicio', titulo: 'El inicio', pantalla: 'inicio', muestra: null, op: null, antes: null, mirar: 'Así arranca: tu main al 100 %, en bitono dentro de la luz. Es la línea que siguen todas.' },
  { id: 'decision', titulo: 'La decisión', pantalla: 'decision', muestra: 'evento', op: 'linea', antes: 'final', mirar: 'La invitación de la LCK como el aviso de aceptar partida; aceptala y se abre la costura con los dos destinos.' },
  { id: 'serie', titulo: 'La serie', pantalla: 'partido', muestra: 'serie', op: 'linea', antes: 'final', mirar: 'El cara a cara: tu campeón contra el del rival, cada mitad en el tono de su equipo; jugá con 1-3.' },
  { id: 'swiss', titulo: 'El Swiss', pantalla: 'partido', muestra: 'swiss', op: 'linea', antes: 'final', mirar: 'El stream de verdad: la transmisión con la gráfica de Worlds y el chat vivo.' },
  { id: 'mercado', titulo: 'El mercado', pantalla: 'mercado', muestra: 'mercado', op: 'linea', antes: 'final', mirar: 'Tu segunda selección: apuntá una org y la pantalla se vuelve su splash; firmá con Enter.' },
  { id: 'firma', titulo: 'La firma', pantalla: 'mercado', muestra: 'firma', op: 'linea', antes: 'final', mirar: 'El anuncio: LOUD da la bienvenida.' },
  { id: 'titulo', titulo: 'El título', pantalla: 'cumbre', muestra: 'titulo', op: 'linea', antes: null, mirar: 'Levantar la copa: CAMPEONES.' },
  { id: 'juntas', titulo: 'Las 7 juntas', imagen: '../referencia/linea/hoja-de-contactos.jpg', op: null, antes: null, mirar: 'Las siete pantallas en una sola hoja: la prueba de que es una línea.' },
];
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
const juntas = document.getElementById('juntas');
const juntasImg = document.getElementById('juntas-img');
// sin la hoja todavia (se arma al final de la ronda) queda el texto; cuando carga, la imagen lo tapa
juntasImg.addEventListener('error', () => (juntasImg.hidden = true));
juntasImg.addEventListener('load', () => juntas.querySelector('.fn-juntas-txt').setAttribute('hidden', ''));

// ---------- estado: la pestaña vive en el hash de la pagina (#p=serie) ----------
const deHash = () => new URLSearchParams(location.hash.slice(1));
let pestana = PESTANAS.find((p) => p.id === deHash().get('p')) ?? PESTANAS[0];
let estaba = false; // true = la version de antes (`antes`: op=final o sin op)
// la ultima pestaña del juego (la de imagen no tiene hash propio: el juego se queda donde estaba, en pausa)
let ultimaJuego = pestana.imagen ? PESTANAS[0] : pestana;

const hashDe = (p, conOp) => {
  const op = conOp ? p.op : p.antes;
  return `pantalla=${p.pantalla}${p.muestra ? `&muestra=${p.muestra}` : ''}${op ? `&op=${op}` : ''}&era=auto&panel=0`;
};
const srcDe = (p) => `index.html#${hashDe(p, true)}`;
const comparable = (p) => Boolean(p.op);

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
  if (!pestana.imagen) html.dataset.era = eraEfectiva('auto', pestana.pantalla, pestana.muestra);
  mirarTxt.textContent = pestana.mirar;
  const vista = pestana.imagen ? 'juntas' : !comparable(pestana) ? 'referencia' : estaba ? 'estaba' : 'linea';
  indicador.dataset.vista = vista;
  const antes = pestana.antes === 'final' ? 'la demostración final' : 'sin opciones';
  indTxt.textContent = { juntas: 'la hoja de contactos', referencia: 'la referencia: no cambia', estaba: `antes: ${antes}`, linea: 'una línea' }[vista];
  btnComparar.disabled = !comparable(pestana);
  txtComparar.textContent = estaba ? 'Volver a una línea' : 'Como estaba';
  // la hoja de contactos: el juego se esconde (y se pausa); la imagen se pide recien la primera vez que se abre
  escenario.dataset.vista = pestana.imagen ? 'imagen' : 'juego';
  juntas.hidden = !pestana.imagen;
  if (pestana.imagen && !juntasImg.getAttribute('src')) juntasImg.src = pestana.imagen;
  btnRepetir.disabled = Boolean(pestana.imagen);
}
// pausa el mundo del juego mientras se mira la hoja de contactos (main.js escucha este mensaje)
function pausarJuego(si) {
  marco.contentWindow?.postMessage({ vitrina: 'ambiente', pausar: si }, location.origin);
}
function irA(p) {
  if (p === pestana) return;
  pestana = p;
  estaba = false;
  history.replaceState(null, '', `#p=${p.id}`);
  pintar();
  pausarJuego(Boolean(p.imagen));
  if (p.imagen) return;
  ultimaJuego = p;
  marco.contentWindow.location.hash = hashDe(p, true);
}
function paso(d) {
  const i = PESTANAS.indexOf(pestana);
  irA(PESTANAS[(i + d + PESTANAS.length) % PESTANAS.length]);
}
function comparar() {
  if (!comparable(pestana)) return;
  estaba = !estaba;
  pintar();
  marco.contentWindow.location.hash = hashDe(pestana, !estaba);
}
// recarga el iframe (con el hash de ahora) para ver otra vez las animaciones de entrada
function repetir() {
  if (pestana.imagen) return;
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
marco.src = srcDe(ultimaJuego);
if (pestana.imagen) marco.addEventListener('load', () => pausarJuego(true), { once: true });
window.final = { irA: (id) => irA(PESTANAS.find((p) => p.id === id) ?? pestana), comparar, repetir, estado: () => ({ pestana: pestana.id, estaba }) };
