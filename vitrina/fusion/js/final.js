// final.html (PLANUI §4.8, §4.9): la demostracion. UN solo iframe grande con la fusion entera (index.html, 1440x900
// escalado, viva e interactiva, panel de la vitrina oculto, era=auto). Las pestañas cambian su hash; cada una tiene su
// version (`op`, hoy `linea`: "una linea") y la de antes (`antes`: la demostracion final de §4.8, o null = sin op); 0
// alterna entre las dos; R recarga el iframe para ver otra vez las animaciones de entrada. "Las 7 juntas" no es el juego:
// es la hoja de contactos de las siete pantallas (la arma el supervisor al final de la ronda).
// PLANUI §4.10: "La decisión" y "El mercado" tienen variantes (la perilla `var=` de main.js, LINEA.md §11). Un control
// segmentado en la barra las elige y V las recorre; la variante vive en el hash de la pagina (#p=decision&v=copas) y
// suma `&var=<id>` al hash del juego, que vuelve a montar la pantalla solo. La comparacion (0) va a `antes`, sin `var`.
// Las teclas funcionan con el foco en la pagina o adentro del juego (mismo origen: se escucha tambien en la ventana del
// marco), y nunca mientras se escribe en un campo (el invocador del inicio).
import { eraEfectiva } from '../../comun/catalogo.js';

// Lo que el supervisor puede ajustar: las pestañas, su hash y la linea de "que mirar". `op: null` = sin version nueva
// (ahi 0 no tiene nada con que comparar). `imagen`: la pestaña muestra esa imagen y no el juego. `variantes`: los ids de
// `var=` de esa pantalla (el primero es el de sin `var`), cada uno con su titulo y su "que mirar".
const PESTANAS = [
  { id: 'inicio', titulo: 'El inicio', pantalla: 'inicio', muestra: null, op: 'linea', antes: null, mirar: 'El champ select: elegí el rol en las pestañas, apuntá un campeón (su nombre se escribe sobre su arte), llená las tres cartas y bloqueá con Enter.' },
  {
    id: 'decision', titulo: 'La decisión', pantalla: 'decision', muestra: 'evento', op: 'linea', antes: 'final',
    mirar: 'La invitación de la LCK como el aviso de aceptar partida; aceptala y se abre la costura con los dos destinos.',
    variantes: [
      { id: 'campeones', titulo: 'Campeones', mirar: 'Aceptá la invitación: la costura con los dos destinos, un campeón de cada lado en el color de su liga.' },
      { id: 'copas', titulo: 'Copas', mirar: 'Aceptá la invitación: cada lado lleva la copa 3D de su liga, en el tono de su destino y con su logo en la placa.' },
      { id: 'liga', titulo: 'Liga', mirar: 'Aceptá la invitación: cada lado es la identidad de su liga (el logo, la ciudad y la pared de escudos); tu equipo de un lado, el que te llama del otro.' },
    ],
  },
  { id: 'serie', titulo: 'La serie', pantalla: 'partido', muestra: 'serie', op: 'linea', antes: 'final', mirar: 'El cara a cara: tu campeón contra el del rival, cada mitad en el tono de su equipo; jugá con 1-3.' },
  { id: 'swiss', titulo: 'El Swiss', pantalla: 'partido', muestra: 'swiss', op: 'linea', antes: 'final', mirar: 'El stream de verdad: la transmisión con la gráfica de Worlds y el chat vivo.' },
  {
    id: 'mercado', titulo: 'El mercado', pantalla: 'mercado', muestra: 'mercado', op: 'linea', antes: 'final',
    mirar: 'Las ofertas van llegando con la ventana de pases; apuntá una org y firmá con Enter.',
    variantes: [
      { id: 'camiseta', titulo: 'Camiseta', mirar: 'Las ofertas llegan de a una; atrás, la camiseta de la org que apuntás, de espaldas y con tu nombre. Firmá con Enter.' },
      { id: 'plantel', titulo: 'Plantel', mirar: 'Las ofertas llegan de a una; atrás, el plantel de la org que apuntás, con tu lugar esperándote. Firmá con Enter.' },
      { id: 'ofertas', titulo: 'Ofertas', mirar: 'Las ofertas llegan como cartas formales con el membrete de cada org y se apilan; apuntá una para traerla al frente. Firmá con Enter.' },
    ],
  },
  { id: 'firma', titulo: 'La firma', pantalla: 'mercado', muestra: 'firma', op: 'linea', antes: 'final', mirar: 'El anuncio: LOUD da la bienvenida.' },
  { id: 'titulo', titulo: 'El título', pantalla: 'cumbre', muestra: 'titulo', op: 'linea', antes: null, mirar: 'Levantar la copa, y con quién: el logo de la liga, el escudo del equipo que golpea y la carta del campeón que cerró la final.' },
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
const selector = document.getElementById('variantes');
const selectorOpciones = document.getElementById('variantes-opciones');
const juntas = document.getElementById('juntas');
const juntasImg = document.getElementById('juntas-img');
// sin la hoja todavia (se arma al final de la ronda) queda el texto; cuando carga, la imagen lo tapa
juntasImg.addEventListener('error', () => (juntasImg.hidden = true));
juntasImg.addEventListener('load', () => juntas.querySelector('.fn-juntas-txt').setAttribute('hidden', ''));

// ---------- estado: la pestaña y su variante viven en el hash de la pagina (#p=serie, #p=decision&v=copas) ----------
const deHash = () => new URLSearchParams(location.hash.slice(1));
let pestana = PESTANAS.find((p) => p.id === deHash().get('p')) ?? PESTANAS[0];
let estaba = false; // true = la version de antes (`antes`: op=final o sin op)
// la ultima pestaña del juego (la de imagen no tiene hash propio: el juego se queda donde estaba, en pausa)
let ultimaJuego = pestana.imagen ? PESTANAS[0] : pestana;
// la variante elegida de cada pestaña que tiene (la del hash de la pagina manda al abrir)
const elegida = Object.fromEntries(PESTANAS.filter((p) => p.variantes).map((p) => [p.id, p.variantes[0]]));
const varDe = (p, id) => p.variantes?.find((v) => v.id === id) ?? null;
if (varDe(pestana, deHash().get('v'))) elegida[pestana.id] = varDe(pestana, deHash().get('v'));
const variante = (p = pestana) => elegida[p.id] ?? null;

// con la version nueva, la variante va como `var=` (junto a `op=linea`); la de antes no la lleva
const hashDe = (p, conOp) => {
  const op = conOp ? p.op : p.antes;
  const v = conOp ? variante(p) : null;
  return `pantalla=${p.pantalla}${p.muestra ? `&muestra=${p.muestra}` : ''}${op ? `&op=${op}` : ''}${v ? `&var=${v.id}` : ''}&era=auto&panel=0`;
};
const srcDe = (p) => `index.html#${hashDe(p, true)}`;
const comparable = (p) => Boolean(p.op);
// el hash de la pagina: la pestaña y, si no es la primera, su variante
const hashPagina = (p) => `#p=${p.id}${variante(p) && variante(p) !== p.variantes[0] ? `&v=${variante(p).id}` : ''}`;

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

// ---------- el selector de variantes (un control segmentado; V recorre) ----------
function pintarSelector() {
  const vs = pestana.variantes;
  selector.hidden = !vs;
  if (!vs) return;
  selectorOpciones.textContent = '';
  for (const v of vs) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.className = 'fn-variante';
    b.textContent = v.titulo;
    b.setAttribute('aria-checked', String(v === variante() && !estaba));
    b.addEventListener('click', () => {
      elegirVariante(v);
      enfocarJuego();
    });
    selectorOpciones.append(b);
  }
  selector.toggleAttribute('data-estaba', estaba);
}

function pintar() {
  botones.forEach((b, i) => {
    b.setAttribute('aria-selected', String(PESTANAS[i] === pestana));
    b.classList.toggle('activo', PESTANAS[i] === pestana);
  });
  if (!pestana.imagen) html.dataset.era = eraEfectiva('auto', pestana.pantalla, pestana.muestra);
  const v = variante();
  mirarTxt.textContent = v && !estaba ? v.mirar : pestana.mirar;
  const vista = pestana.imagen ? 'juntas' : !comparable(pestana) ? 'referencia' : estaba ? 'estaba' : 'linea';
  indicador.dataset.vista = vista;
  const antes = pestana.antes === 'final' ? 'la demostración final' : 'sin opciones';
  indTxt.textContent = { juntas: 'la hoja de contactos', referencia: 'la referencia: no cambia', estaba: `antes: ${antes}`, linea: v ? `una línea · ${v.titulo}` : 'una línea' }[vista];
  pintarSelector();
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
  history.replaceState(null, '', hashPagina(p));
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
// elegir una variante: el juego vuelve a montar la pantalla con `var=` (main.js escucha el hash). Si se estaba mirando
// la version de antes, vuelve a la nueva (la de antes no tiene variantes).
function elegirVariante(v) {
  if (!v || !pestana.variantes?.includes(v) || (v === variante() && !estaba)) return;
  elegida[pestana.id] = v;
  estaba = false;
  history.replaceState(null, '', hashPagina(pestana));
  pintar();
  marco.contentWindow.location.hash = hashDe(pestana, true);
}
function cicloVariante() {
  const vs = pestana.variantes;
  if (!vs) return;
  elegirVariante(vs[(vs.indexOf(variante()) + 1) % vs.length]);
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
  // escribiendo en un campo (el invocador del inicio) las teclas son letras, no atajos
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') paso(e.key === 'ArrowRight' ? 1 : -1);
  else if (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0') comparar();
  else if (e.key === 'r' || e.key === 'R') repetir();
  else if ((e.key === 'v' || e.key === 'V') && pestana.variantes) cicloVariante();
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
  const h = deHash();
  const p = PESTANAS.find((x) => x.id === h.get('p'));
  if (!p) return;
  const v = varDe(p, h.get('v')) ?? p.variantes?.[0];
  if (p !== pestana) {
    if (v) elegida[p.id] = v;
    irA(p);
  } else if (v) elegirVariante(v);
});

pintar();
escalar();
marco.src = srcDe(ultimaJuego);
if (pestana.imagen) marco.addEventListener('load', () => pausarJuego(true), { once: true });
window.final = {
  irA: (id) => irA(PESTANAS.find((p) => p.id === id) ?? pestana),
  variante: (id) => elegirVariante(varDe(pestana, id)),
  comparar,
  repetir,
  estado: () => ({ pestana: pestana.id, estaba, variante: variante()?.id ?? null, hash: marco.contentWindow?.location.hash ?? '' }),
};
