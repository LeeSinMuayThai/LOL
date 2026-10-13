// El cuarto Vos (FASE V, V3e; PLAN.md §V.4; PLANUI U2c punto 3): la ficha ENTERA (`components/ficha.js`) y, al lado, el radar
// de tu juego (`graficos/hexa.js`): tus seis atributos de juego contra lo que pide tu línea (los pesos de rendimiento del
// rol, `data/roles.js`, llevados a 0-1 contra el que más pesa). La misma ficha sirve al acompañante, en su versión compacta
// (`acompanante`, abajo): hay una sola ficha y dos tamaños, no dos pantallas que se parecen.
//
//  - En la pieza final (`estado.terminado`) la ficha del retiro miente: tras muchos splits sin equipo las curvas bajaron y
//    macro, shotcalling y adaptabilidad llegaron a verse en 0 (D90). Ahí el cuarto muestra los PICOS de la carrera, sin radar.
//  - La memoria de la ficha (desde dónde cuenta el `countUp`, qué desplegables dejó abiertos el jugador) es del cuerpo del
//    cuarto: abrirlo dos veces seguidas con el mismo estado no cuenta desde el valor de otro contenedor (D95).
import { renderFicha, renderFichaCompacta, renderFichaFinal } from '../components/ficha.js';
import { crearHexa } from '../graficos/hexa.js';
import { ROLES } from '../../data/roles.js';

// Los seis atributos de juego, en el orden del radar (el de la ficha), con su rótulo corto.
const EJES = [['mecanica', 'MEC'], ['macro', 'MACRO'], ['teamfight', 'TF'], ['laneo', 'LANEO'], ['shotcalling', 'SHOT'], ['adaptabilidad', 'ADAPT']];
const STAT_MAX = 100;
const TAMANO_RADAR = 300;
const NOMBRE = { mecanica: 'mecánica', macro: 'macro', teamfight: 'teamfight', laneo: 'laneo', shotcalling: 'shotcalling', adaptabilidad: 'adaptabilidad' };

function nuevaFicha() {
  const ficha = document.createElement('div');
  ficha.className = 'ficha-card';
  return ficha;
}

function nodo(etiqueta, clase, texto) {
  const n = document.createElement(etiqueta);
  if (clase) n.className = clase;
  if (texto != null) n.textContent = texto;
  return n;
}

// El radar: tus atributos (la figura llena) contra lo que pide tu línea (la fantasma), y en dos líneas qué es lo que más
// pesa en tu rol y cómo te va ahí.
function crearRadar(estado) {
  const stats = estado.player?.stats ?? {};
  const pesos = ROLES[estado.player?.role]?.pesos ?? null;
  const caja = nodo('section', 'cuarto-radar');
  caja.setAttribute('aria-label', 'Tu juego contra lo que pide tu línea');
  caja.appendChild(nodo('p', 'cuarto-radar-k', `Tu juego · ${ROLES[estado.player?.role]?.label ?? ''}`.trim()));
  const ejes = EJES.map(([id, label]) => ({ id, label, valor: (stats[id] ?? 0) / STAT_MAX }));
  const maxPeso = pesos ? Math.max(...EJES.map(([id]) => pesos[id] ?? 0)) : 0;
  const fantasma = pesos && maxPeso > 0 ? EJES.map(([id, label]) => ({ id, label, valor: (pesos[id] ?? 0) / maxPeso })) : null;
  const { nodo: radar } = crearHexa({ ejes, fantasma, tono: 'live', tamano: TAMANO_RADAR });
  caja.appendChild(radar);
  const ley = nodo('p', 'cuarto-radar-ley');
  const item = (clase, texto) => {
    const s = nodo('span');
    s.append(nodo('i', clase), document.createTextNode(texto));
    return s;
  };
  ley.append(item('cuarto-radar-vos', 'Tus atributos'));
  if (fantasma) ley.append(item('cuarto-radar-rol', 'Lo que pide tu línea'));
  caja.appendChild(ley);
  if (pesos) {
    const porPeso = [...EJES].sort((a, b) => (pesos[b[0]] ?? 0) - (pesos[a[0]] ?? 0));
    const [primero, segundo] = porPeso;
    const flojo = [...EJES].sort((a, b) => (stats[a[0]] ?? 0) - (stats[b[0]] ?? 0))[0];
    const lectura = nodo('ul', 'cuarto-radar-lectura');
    const li = (partes) => {
      const l = nodo('li');
      l.append(...partes);
      return l;
    };
    lectura.append(
      li(['Tu línea vive de ', nodo('b', null, NOMBRE[primero[0]]), ' y ', nodo('b', null, NOMBRE[segundo[0]]), `: tenés ${Math.round(stats[primero[0]] ?? 0)} y ${Math.round(stats[segundo[0]] ?? 0)}.`]),
      li(['Lo más flojo: ', nodo('b', null, NOMBRE[flojo[0]]), ` (${Math.round(stats[flojo[0]] ?? 0)}).`])
    );
    caja.appendChild(lectura);
  }
  return caja;
}

export function pintar(cuerpo, estado, { modulos }) {
  const ficha = nuevaFicha();
  cuerpo.appendChild(ficha);
  if (estado.terminado) {
    renderFichaFinal(ficha, estado, modulos);
    return;
  }
  renderFicha(ficha, estado, modulos, { dueno: cuerpo });
  if (estado.player?.stats) cuerpo.appendChild(crearRadar(estado));
}

// Lo que el acompañante (≥ 1180 px) muestra de Vos: la ficha compacta. `caja` es el `aside`: sobrevive a cada pintada, así
// que el `countUp` del nivel y de los LP sigue contando desde el valor que el jugador vio la última vez.
export function acompanante(caja, estado, { modulos }) {
  const ficha = nuevaFicha();
  caja.appendChild(ficha);
  renderFichaCompacta(ficha, estado, modulos, { dueno: caja });
}
