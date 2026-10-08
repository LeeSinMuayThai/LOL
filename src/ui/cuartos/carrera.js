// El cuarto Carrera (FASE V, V5; PLAN.md §V.4 y §V.6): tu carrera dibujada. La trayectoria (la cinta de clubes, la curva fina de
// nivel y la nota de cada año), los hitos (títulos, Mundiales y Golden Roads), el archirrival, el escalón en el que vas y, si el
// año está vivo, cómo va el Golden Road. Todo sale de `trayectoriaDeCarrera` (`ui/core/trayectoria.js`, pura): este archivo
// dibuja lo que esa función dice y no calcula nada aparte (regla 15: lo dibujado es el registro). Se pinta desde la `vista`,
// lo que la pantalla ya contó (regla 4).
//
// También lo usa el acompañante en el cierre de año, el retiro y la vuelta (`acompanante`, abajo): el mismo dibujo en chico y
// sin números sueltos.
import { trayectoriaDeCarrera, textoDeEscalon } from '../core/trayectoria.js';
import { crearLineaGoldenRoad } from '../components/cierre.js';
import { crearOrgChip } from '../components/orgChip.js';
import { crearCinta } from '../graficos/cinta.js';
import { crearLinea } from '../graficos/linea.js';
import { crearBarras } from '../graficos/barras.js';
import { nombreVisibleDeLiga } from '../../core/ligas.js';
import { plural } from '../../core/formato.js';

// Los lienzos de los gráficos (el `viewBox`; el CSS los estira al ancho de su caja). En el celular se dibujan más angostos y no
// más chicos: así los números de los ejes no se achican hasta no poder leerse.
const CONSULTA_ANCHA = '(min-width: 720px)';
const ANCHO_PRINCIPAL = 560;
const ANCHO_ESTRECHO = 330;
const ANCHO_RESUMEN = 300;
const ALTO_CINTA = 52;
const ALTO_CURVA = 124;
const ALTO_NOTAS = 132;
const ALTO_CINTA_RESUMEN = 46;
const ALTO_CURVA_RESUMEN = 56;
// El margen izquierdo donde la curva dibuja su eje: la cinta lo reserva igual para que los años de las dos queden alineados.
const MARGEN_IZQ = 36;
const MARGEN_DER = 18;
const MARGEN_IZQ_RESUMEN = 6;
const MARGEN_DER_RESUMEN = 8;
// La nota de una temporada va de 0 a 10 (`core/temporadaResumen.js`); con menos de este ancho por año el número de la punta de
// cada barra se pisa con el del vecino.
const NOTA_MAXIMA = 10;
const ANCHO_MINIMO_POR_NOTA = 26;
// Los momentos a la vista, los más nuevos primero (los mismos que mostraba la ficha).
const MOMENTOS_A_LA_VISTA = 10;
// La banda de la nota → el tono del gráfico (el mismo color que el titular del año: `resumen-anio-nota--*`).
const TONO_DE_BANDA = { rojo: 'danger', gris: 'ink-dim', ambar: 'warn', verde: 'up' };
const TONO_DE_LA_CURVA = 'live';

function el(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

function anchoDelGrafico() {
  return (window.matchMedia?.(CONSULTA_ANCHA)?.matches ?? true) ? ANCHO_PRINCIPAL : ANCHO_ESTRECHO;
}

// Un bloque con título (la misma cabecera que los paneles de contexto).
function bloque(titulo, ...hijos) {
  const caja = el('section', 'carrera-bloque');
  if (titulo) caja.appendChild(el('h3', 'carrera-bloque-titulo', titulo));
  caja.append(...hijos.filter(Boolean));
  return caja;
}

// --- El escalón ------------------------------------------------------------------------------------------------------------

function nodoDeEscalon(escalon) {
  const frase = textoDeEscalon(escalon);
  if (!frase) return null;
  const caja = el('p', 'carrera-escalon');
  caja.append(el('strong', 'carrera-escalon-vas', frase.vas), ' · ', el('span', 'carrera-escalon-falta', frase.falta));
  return caja;
}

// --- El Golden Road ---------------------------------------------------------------------------------------------------------

const DEFINICION_DEL_GOLDEN_ROAD = 'Todo en el mismo año: primero en la tabla de los tres splits, campeón de la liga de primera y campeón del Mundial. Hasta ahora, en la vida real, nadie lo consiguió.';

function nodoDeGoldenRoad(seguimiento, { conDefinicion }) {
  if (!seguimiento?.vivo) return null;
  const caja = el('section', 'carrera-gr');
  caja.appendChild(crearLineaGoldenRoad(seguimiento));
  if (conDefinicion) caja.appendChild(el('p', 'carrera-gr-definicion', DEFINICION_DEL_GOLDEN_ROAD));
  return caja;
}

// --- La trayectoria -----------------------------------------------------------------------------------------------------------

function bandasDeCinta(tramos) {
  return tramos.map(({ org, desde, hasta, tier, activa }) => ({ org, desde, hasta, tier, activa }));
}

function puntosDeNivel(puntos) {
  return puntos.map((punto) => ({ x: punto.x, y: punto.nivel }));
}

function nodoDeCinta(tr, { ancho, alto, conEtiquetas, margenIzq, margenDer }) {
  const { nodo } = crearCinta({
    bandas: bandasDeCinta(tr.tramos), ancho, alto, dominio: tr.dominio, padIzq: margenIzq, padDer: margenDer, etiquetas: conEtiquetas
  });
  nodo.classList.add('carrera-grafico');
  return nodo;
}

function nodoDeCurva(tr, { ancho, alto, conEtiquetas, margenIzq, margenDer }) {
  const { nodo } = crearLinea({
    series: [{ id: 'nivel', label: 'Nivel', tono: TONO_DE_LA_CURVA, puntos: puntosDeNivel(tr.puntos) }],
    ancho, alto, dominioX: tr.dominio, padIzq: margenIzq, padDer: margenDer, etiquetas: conEtiquetas
  });
  nodo.classList.add('carrera-grafico');
  return nodo;
}

// Un renglón por club: el monograma, el nombre, la liga y los años. Es la leyenda de la cinta (y su versión legible: la cinta
// sola no dice los años de cada tramo).
function filaDeClub(tramo, anioDeCierre) {
  const fila = el('li', 'carrera-club');
  fila.appendChild(crearOrgChip(tramo.org, { size: 18 }));
  const hasta = tramo.hastaAnio ?? anioDeCierre;
  const rango = tramo.desdeAnio === hasta || hasta === null ? `${tramo.desdeAnio}` : `${tramo.desdeAnio}–${hasta}`;
  const liga = tramo.liga ? nombreVisibleDeLiga(tramo.liga) : 'torneo chico';
  fila.append(el('span', 'carrera-club-nombre', tramo.org), el('span', 'carrera-club-detalle', `${liga} · ${rango}`));
  return fila;
}

function bloqueDeTrayectoria(tr) {
  const medidas = { ancho: anchoDelGrafico(), margenIzq: MARGEN_IZQ, margenDer: MARGEN_DER };
  const graficos = el('div', 'carrera-graficos');
  // Los años van una sola vez, abajo de la curva: la cinta de arriba comparte su eje.
  graficos.append(
    el('div', 'carrera-grafico-titulo', 'Clubes · más alta la barra, más alta la liga'),
    nodoDeCinta(tr, { ...medidas, alto: ALTO_CINTA, conEtiquetas: false }),
    el('div', 'carrera-grafico-titulo', 'Tu nivel, split a split'),
    nodoDeCurva(tr, { ...medidas, alto: ALTO_CURVA, conEtiquetas: true })
  );
  return bloque('Tu trayectoria', graficos);
}

function bloqueDeClubes(tr, estado) {
  const anioDeCierre = estado.calendario?.anio ?? null;
  const lista = el('ul', 'carrera-clubes');
  lista.append(...tr.tramos.map((tramo) => filaDeClub(tramo, anioDeCierre)));
  return bloque('Club por club', lista);
}

// --- La nota de cada año ----------------------------------------------------------------------------------------------------

function bloqueDeNotas(tr) {
  if (tr.notas.length === 0) return null;
  const ancho = anchoDelGrafico();
  const grupos = tr.notas.map((nota) => ({
    id: String(nota.anio),
    label: String(nota.anio).slice(-2),
    barras: [{ id: String(nota.anio), label: String(nota.anio), valor: nota.nota, tono: TONO_DE_BANDA[nota.banda] }]
  }));
  const { nodo } = crearBarras({
    grupos, ancho, alto: ALTO_NOTAS, dominioY: [0, NOTA_MAXIMA], valores: ancho / grupos.length >= ANCHO_MINIMO_POR_NOTA
  });
  nodo.classList.add('carrera-grafico');
  const mejor = tr.notas.reduce((a, b) => (b.nota > a.nota ? b : a));
  return bloque('La nota de cada año', nodo, el('p', 'carrera-pie', `De 0 a ${NOTA_MAXIMA}. Tu mejor año: ${mejor.anio}, con ${mejor.nota.toFixed(1)}.`));
}

// --- Los hitos -----------------------------------------------------------------------------------------------------------------

function resumenDeHitos(tr) {
  const partes = [];
  const titulos = tr.titulos.length;
  if (titulos > 0) partes.push(`${titulos} ${plural(titulos, 'título', 'títulos')}`);
  const mundiales = tr.mundiales.length;
  if (mundiales > 0) partes.push(`${mundiales} ${plural(mundiales, 'Mundial', 'Mundiales')}`);
  const golden = tr.goldenRoads.length;
  if (golden > 0) partes.push(`${golden} ${plural(golden, 'Golden Road', 'Golden Roads')}`);
  return partes.join(' · ');
}

function chipDeHito(hito) {
  const chip = el('li', `carrera-hito carrera-hito--${hito.tipo}${hito.tier > 1 ? ' carrera-hito--menor' : ''}`);
  chip.dataset.hito = hito.tipo;
  chip.appendChild(el('span', 'carrera-hito-texto', hito.texto));
  if (hito.org && hito.tipo !== 'goldenRoad') chip.appendChild(el('span', 'carrera-hito-org', hito.org));
  return chip;
}

function bloqueDeHitos(tr) {
  if (tr.hitos.length === 0) {
    return bloque('Tu vitrina', el('p', 'carrera-vacio', 'Todavía no hay copas: ni de liga, ni del Mundial.'));
  }
  const lista = el('ul', 'carrera-hitos');
  lista.append(...tr.hitos.map(chipDeHito));
  return bloque('Tu vitrina', el('p', 'carrera-pie carrera-pie--arriba', resumenDeHitos(tr)), lista);
}

// --- El archirrival -------------------------------------------------------------------------------------------------------------

function bloqueDelRival(tr) {
  const rival = tr.rival;
  if (!rival) return null;
  const donde = rival.org ? `${rival.org}${rival.liga ? ` (${nombreVisibleDeLiga(rival.liga)})` : ''}` : null;
  const quien = el('p', 'carrera-rival-quien');
  quien.append(el('strong', 'carrera-rival-handle', rival.handle), el('span', 'carrera-rival-donde', [rival.rol, donde].filter(Boolean).join(' · ')));
  // El duelo son los trofeos de cada lado (títulos de liga + Mundiales): un 0-0 no es un duelo.
  const duelo = rival.tuyos + rival.suyos === 0
    ? 'Todavía nadie sumó un título: el duelo está en cero.'
    : `Duelo de trofeos: vos ${rival.tuyos} — ${rival.suyos} él${rival.tuyos > rival.suyos ? ' · vas ganando' : (rival.tuyos < rival.suyos ? ' · va ganando' : ' · parejo')}.`;
  return bloque('Tu archirrival', quien, el('p', 'carrera-rival-duelo', duelo));
}

// --- Los momentos ------------------------------------------------------------------------------------------------------------

function bloqueDeMomentos(estado) {
  const momentos = estado.career?.registro?.momentos ?? [];
  if (momentos.length === 0) return null;
  const detalle = el('details', 'carrera-momentos');
  detalle.appendChild(el('summary', 'carrera-momentos-resumen', `Momentos (${momentos.length})`));
  const lista = el('ul', 'carrera-momentos-lista');
  for (const momento of [...momentos].reverse().slice(0, MOMENTOS_A_LA_VISTA)) {
    const donde = momento.org ? ` · ${momento.org}` : '';
    lista.appendChild(el('li', 'carrera-momento', `${momento.anio} (${momento.edad} años)${donde} — ${momento.texto}`));
  }
  detalle.appendChild(lista);
  return detalle;
}

// --- El cuarto ------------------------------------------------------------------------------------------------------------------

export function pintar(cuerpo, estado) {
  const tr = trayectoriaDeCarrera(estado);
  const raiz = el('div', 'carrera');
  const cabecera = el('div', 'carrera-cabecera');
  cabecera.append(...[nodoDeEscalon(tr.escalon), nodoDeGoldenRoad(tr.seguimiento, { conDefinicion: true })].filter(Boolean));
  if (cabecera.children.length > 0) raiz.appendChild(cabecera);

  if (tr.vacia) {
    raiz.appendChild(el('p', 'cuarto-vacio', 'Todavía no jugaste en ningún club: tu trayectoria se arma acá, club por club.'));
    const rival = bloqueDelRival(tr);
    if (rival) raiz.appendChild(rival);
    cuerpo.appendChild(raiz);
    return;
  }

  const principal = el('div', 'carrera-principal');
  principal.append(...[bloqueDeTrayectoria(tr), bloqueDeNotas(tr)].filter(Boolean));
  const lateral = el('div', 'carrera-lateral');
  lateral.append(...[bloqueDeHitos(tr), bloqueDelRival(tr), bloqueDeClubes(tr, estado), bloqueDeMomentos(estado)].filter(Boolean));
  const cuadricula = el('div', 'carrera-cuadricula');
  cuadricula.append(principal, lateral);
  raiz.appendChild(cuadricula);
  cuerpo.appendChild(raiz);
}

// --- El acompañante (cierre de año, retiro y vuelta) ------------------------------------------------------------------------

// Un resumen compacto: el escalón, el Golden Road si está vivo y una mini trayectoria (la cinta y la curva, sin números en los
// ejes: este panel no gasta números, PLAN.md §V.8). Lo que el cuarto Carrera cuenta entero, esto lo cuenta de un vistazo.
export function acompanante(caja, estado) {
  const tr = trayectoriaDeCarrera(estado);
  const panel = el('div', 'panel-contexto carrera-resumen');
  panel.appendChild(el('div', 'panel-contexto-titulo', 'Tu carrera'));
  const escalon = nodoDeEscalon(tr.escalon);
  if (escalon) panel.appendChild(escalon);
  const goldenRoad = nodoDeGoldenRoad(tr.seguimiento, { conDefinicion: false });
  if (goldenRoad) panel.appendChild(goldenRoad);
  if (!tr.vacia) {
    const medidas = { ancho: ANCHO_RESUMEN, conEtiquetas: false, margenIzq: MARGEN_IZQ_RESUMEN, margenDer: MARGEN_DER_RESUMEN };
    const graficos = el('div', 'carrera-graficos carrera-graficos--resumen');
    graficos.append(nodoDeCinta(tr, { ...medidas, alto: ALTO_CINTA_RESUMEN }), nodoDeCurva(tr, { ...medidas, alto: ALTO_CURVA_RESUMEN }));
    panel.appendChild(graficos);
    const resumen = resumenDeHitos(tr);
    if (resumen) panel.appendChild(el('p', 'carrera-pie', resumen));
  }
  caja.appendChild(panel);
}
