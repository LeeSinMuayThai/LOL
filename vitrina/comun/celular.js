// Cascara de celular: la misma pagina de la vitrina dentro de un iframe de 390x844 con marco de telefono.
// ?src=<url de la pagina>  y  #<hash de la vitrina>. El panel de adentro avisa por postMessage cuando
// se elige "Escritorio" para volver.
const q = new URLSearchParams(location.search);
const marco = document.getElementById('marco');
const telefono = document.getElementById('telefono');
const volver = document.getElementById('volver');

let base = null;
try {
  const u = new URL(q.get('src') ?? '', location.href);
  if (u.origin === location.origin) base = u.href.split('#')[0];
} catch {
  /* src invalido */
}
const hash = location.hash || '';

function hashEscritorio() {
  let h = hash;
  try {
    h = marco.contentWindow.location.hash || hash;
  } catch {
    /* otro origen: se usa el hash inicial */
  }
  const p = new URLSearchParams(h.slice(1));
  p.set('dispositivo', 'escritorio');
  return '#' + p.toString();
}
function aEscritorio() {
  if (base) location.href = base + hashEscritorio();
}

if (base) {
  marco.src = base + hash;
  volver.addEventListener('click', (e) => {
    e.preventDefault();
    aEscritorio();
  });
  window.addEventListener('message', (e) => {
    if (e.origin === location.origin && e.data?.vitrina === 'dispositivo' && e.data.valor === 'escritorio') aEscritorio();
  });
} else {
  volver.hidden = true;
}

// Que entre entero en la ventana
function ajustar() {
  const k = Math.min(1, (innerHeight - 56) / 868, (innerWidth - 32) / 414);
  telefono.style.transform = `scale(${k})`;
  telefono.style.marginBlock = `${(868 * k - 868) / 2}px`;
}
addEventListener('resize', ajustar);
ajustar();
