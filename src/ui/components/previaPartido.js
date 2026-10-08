import { crearOrgChip } from './orgChip.js';

// K2d (PLAN.md "K2d — la previa (pantalla)"): la tarjeta de la previa, antes de
// la fecha marcada y antes de un mapa. Solo pinta lo que arma el selector puro
// `previaDeDecision` (`core/previaDePartido.js`): la p que muestra es la que el
// motor tira, y todos los textos ya vienen con nombres para mostrar.
//
// FASE V (V3b, regla 2 de §V.3: "primero lo que se decide"): en el escenario la previa es UNA línea —la p, el rival y lo que
// define el partido— y el desglose entero va detrás de un desplegable (nada se saca: queda a un toque). `completo` pinta la
// tarjeta entera y abierta: es la del acompañante (≥ 1180 px, `acompanante.js`), donde el escenario no repite la línea
// (`estilos/serie.css`) para que no aparezca dos veces.
//
// El desplegable recuerda si lo abriste: la previa se repinta en cada parada y sin esto se cerraba solo. Es estado por
// contenedor (`WeakMap`), no de módulo: el escenario y el acompañante no se pisan.
const memoria = new WeakMap();

export function renderPrevia(container, previa, { completo = false } = {}) {
  if (!previa) {
    container.hidden = true;
    container.replaceChildren();
    return;
  }

  const partes = partesDeLaPrevia(previa);
  if (completo) {
    container.replaceChildren(...partes);
    container.hidden = false;
    return;
  }

  let m = memoria.get(container);
  if (!m) {
    m = { abierto: false };
    memoria.set(container, m);
  }
  const detalles = document.createElement('details');
  detalles.className = 'previa-resumen';
  detalles.open = m.abierto;
  detalles.addEventListener('toggle', () => { m.abierto = detalles.open; });
  const resumen = document.createElement('summary');
  resumen.className = 'previa-linea';
  resumen.append(...lineaDeLaPrevia(previa));
  const detalle = document.createElement('div');
  detalle.className = 'previa-detalle';
  detalle.append(...partes);
  detalles.append(resumen, detalle);
  container.replaceChildren(detalles);
  container.hidden = false;
}

function texto(clase, contenido) {
  const el = document.createElement('span');
  el.className = clase;
  el.textContent = contenido;
  return el;
}

// La línea: la p (lo que más pesa al decidir), contra quién y lo que define este partido (el subtítulo: "Se define la
// clasificación", la ronda, "el de vida o muerte"). El porqué largo y las fuerzas van adentro.
function lineaDeLaPrevia(previa) {
  const p = document.createElement('span');
  p.className = 'previa-linea-p';
  p.append(texto('previa-linea-pct', `${previa.porcentaje}%`), texto('previa-linea-etq', 'de ganar'));
  const partes = [p, texto('previa-linea-rival', `vs ${previa.rival.nombre}`)];
  if (previa.subtitulo) {
    partes.push(texto('previa-linea-sub', previa.subtitulo));
  }
  partes.push(texto('previa-linea-mas', 'Previa'));
  return partes;
}

function partesDeLaPrevia(previa) {
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
  const partes = [cabecera, ...(previa.porQue ? [porQue] : []), duelo, desglose];
  if (previa.nota) {
    const nota = document.createElement('div');
    nota.className = 'previa-nota';
    nota.textContent = previa.nota;
    partes.push(nota);
  }
  return partes;
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
