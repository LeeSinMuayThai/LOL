import { crearOrgChip } from './orgChip.js';

// K2d (PLAN.md "K2d — la previa (pantalla)"): la tarjeta de la previa, antes de
// la fecha marcada y antes de un mapa. Solo pinta lo que arma el selector puro
// `previaDeDecision` (`core/previaDePartido.js`): la p que muestra es la que el
// motor tira, y todos los textos ya vienen con nombres para mostrar.
export function renderPrevia(container, previa) {
  if (!previa) {
    container.hidden = true;
    container.replaceChildren();
    return;
  }

  const cabecera = document.createElement('div');
  cabecera.className = 'previa-cabecera';
  const titulo = document.createElement('span');
  titulo.className = 'previa-titulo';
  titulo.textContent = previa.titulo;
  cabecera.appendChild(titulo);
  if (previa.subtitulo) {
    const sub = document.createElement('span');
    sub.className = 'previa-sub';
    sub.textContent = previa.subtitulo;
    cabecera.appendChild(sub);
  }

  const duelo = document.createElement('div');
  duelo.className = 'previa-duelo';
  const pct = document.createElement('div');
  pct.className = 'previa-p';
  pct.innerHTML = '<span class="previa-pct"></span><span class="previa-pct-label">de ganar</span>';
  pct.firstChild.textContent = `${previa.porcentaje}%`;
  duelo.append(lado(previa.propio, ''), pct, lado(previa.rival, ' previa-lado--rival'));

  const desglose = document.createElement('dl');
  desglose.className = 'previa-desglose';
  for (const fila of previa.filas) {
    const dt = document.createElement('dt');
    dt.textContent = fila.etiqueta;
    const dd = document.createElement('dd');
    dd.textContent = fila.texto;
    if (/^[+−]/.test(fila.texto)) {
      dd.dataset.signo = fila.texto.startsWith('+') ? 'up' : 'down';
    }
    desglose.append(dt, dd);
  }

  // K4-A: por qué frena esta fecha, antes que los números.
  const porQue = document.createElement('div');
  porQue.className = 'previa-porque';
  porQue.textContent = previa.porQue ?? '';
  container.replaceChildren(cabecera, ...(previa.porQue ? [porQue] : []), duelo, desglose);
  if (previa.nota) {
    const nota = document.createElement('div');
    nota.className = 'previa-nota';
    nota.textContent = previa.nota;
    container.appendChild(nota);
  }
  container.hidden = false;
}

function lado({ nombre, texto }, extra) {
  const el = document.createElement('div');
  el.className = `previa-lado${extra}`;
  const n = document.createElement('span');
  n.className = 'previa-nombre';
  n.textContent = nombre;
  const f = document.createElement('span');
  f.className = 'previa-fuerza';
  f.textContent = texto;
  el.append(crearOrgChip(nombre, { size: 20 }), n, f);
  return el;
}
