// G1 (PLANUI §0.9, "Pantalla"): las piezas de una final que se juega con las manos. Las arma la parada del minijuego
// (`paradas/minijuego.js`) con lo que el motor manda en `decision.datos.g1` (contrato de G1):
//   - el camino: el torneo, las etapas (CUARTOS ✓ · SEMIS ✓ · FINAL ▶) o el récord del Swiss, y la tira de mapas con el
//     marcador escrito (MAPA 1 ✓ · MAPA 2 ✗ · MAPA 3 ▶);
//   - la mesa: la vara en las unidades del minijuego, el poder de tu clase, DESEMPATE o REVANCHA, la charla y el premio;
//   - el veredicto: PASÓ / CASI / NO SALIÓ, la línea del dato y el "tan cerca";
//   - el sello del Bo1 con riesgo (🎲 ARRIESGADO / 🧊 SEGURO), que usa el cara a cara.
// Sin arte de campeón: acá la pantalla habla del torneo, no de un pick.
import { el } from '../fx/util.js';
import { logoOrg, siglaDe } from '../fx/competicion.js';
import { BALANCE } from '../../data/balance.js';
import * as G1 from './varaG1.js';

const SWISS = BALANCE.mundial;
const MARCA = { ganada: '✓', perdida: '✗', actual: '▶', pendiente: '' };
const MARCA_MAPA = { W: '✓', L: '✗', casi: '≈' };

// La línea que dice qué se juega en este mapa, por el marcador (o por el récord del Swiss).
function momentoDe(camino) {
  if (camino.swiss) {
    const { victorias: v, derrotas: d } = camino.swiss;
    const pasa = SWISS.victoriasParaAvanzar - 1;
    const cae = SWISS.derrotasParaQuedarAfuera - 1;
    if (v === pasa && d === cae) return { texto: 'Vida o muerte', tono: 'peligro' };
    if (v === pasa) return { texto: 'Una más y adentro', tono: 'gloria' };
    if (d === cae) return { texto: 'Una más y afuera', tono: 'peligro' };
    return null;
  }
  if (!camino.bo || camino.bo < 2) return null;
  const [nos, ellos] = camino.marcador ?? [0, 0];
  const necesita = Math.ceil(camino.bo / 2);
  const final = (camino.etapas ?? []).find((e) => e.estado === 'actual')?.id === 'final';
  if (nos === necesita - 1 && ellos === necesita - 1) return { texto: 'Mapa decisivo', tono: 'peligro' };
  if (nos === necesita - 1) return { texto: final ? 'Punto de campeonato' : 'Punto de serie', tono: 'gloria' };
  if (ellos === necesita - 1) return { texto: final ? 'Al borde: si se pierde, la copa es de ellos' : 'Al borde: si se pierde, se termina la serie', tono: 'peligro' };
  return null;
}

// El camino del torneo y la tira de mapas. `estado` da los nombres (tu org y el rival).
export function crearCaminoG1(g1, estado, decision = null) {
  const camino = g1.camino ?? {};
  const nos = estado?.career?.currentOrg ?? estado?.internacional?.jugador ?? '';
  const ellos = estado?.serie?.rival?.org ?? decision?.datos?.rival ?? estado?.internacional?.partidoEnCurso?.rival ?? '';
  const momento = momentoDe(camino);
  const etapas = camino.swiss
    ? crearSwiss(camino.swiss)
    : el('ol', { class: 'g1-etapas', 'aria-label': 'Las etapas' }, (camino.etapas ?? []).map((e, i) => el('li', { 'data-estado': e.estado, style: { '--i': String(i) } }, [
      el('span', { text: e.nombre }),
      MARCA[e.estado] ? el('i', { 'aria-hidden': 'true', text: MARCA[e.estado] }) : null
    ])));
  const serie = camino.bo > 1 ? crearSerie(camino, nos, ellos) : null;
  const final = (camino.etapas ?? []).find((e) => e.estado === 'actual')?.id === 'final';
  return el('section', { class: 'g1-camino', 'aria-label': `El camino: ${camino.torneo ?? ''}`, 'data-necesita': camino.bo > 1 ? String(Math.ceil(camino.bo / 2)) : null, 'data-final': final }, [
    el('p', { class: 'g1-torneo', text: camino.torneo ?? '' }),
    etapas,
    serie,
    momento ? el('p', { class: 'g1-momento', 'data-tono': momento.tono, text: momento.texto }) : null
  ]);
}

function crearSwiss({ victorias, derrotas }) {
  const ranura = (tipo, llena, i) => el('i', { 'data-tipo': tipo, 'data-llena': llena ? '' : null, style: { '--i': String(i) } });
  return el('div', { class: 'g1-swiss', 'aria-label': `Swiss: ${victorias} y ${derrotas}` }, [
    el('b', { class: 'g1-swiss-record num', text: `${victorias}–${derrotas}` }),
    el('span', { class: 'g1-swiss-pips', 'aria-hidden': 'true' }, [
      ...Array.from({ length: SWISS.victoriasParaAvanzar }, (_, i) => ranura('v', i < victorias, i)),
      el('span', { class: 'g1-swiss-sep' }),
      ...Array.from({ length: SWISS.derrotasParaQuedarAfuera }, (_, i) => ranura('d', i < derrotas, i + SWISS.victoriasParaAvanzar))
    ]),
    el('small', { text: `${SWISS.victoriasParaAvanzar} victorias clasifican · ${SWISS.derrotasParaQuedarAfuera} derrotas, afuera` })
  ]);
}

function crearSerie(camino, nos, ellos) {
  const [a, b] = camino.marcador ?? [0, 0];
  const equipo = (nombre, lado) => el('span', { class: `g1-equipo g1-equipo--${lado}` }, [logoOrg(nombre, { clase: 'g1-logo' }), el('span', { class: 'g1-sigla', text: siglaDe(nombre) || nombre })]);
  const mapas = (camino.mapas?.length ? camino.mapas : Array.from({ length: camino.bo }, (_, i) => ({ numero: i + 1, resultado: null })));
  const actual = mapas.find((m) => m.resultado == null)?.numero ?? null;
  return el('div', { class: 'g1-serie' }, [
    el('div', { class: 'g1-marcador', 'aria-label': `Bo${camino.bo}: ${a} a ${b}` }, [
      equipo(nos, 'nos'),
      el('b', { class: 'g1-goles num', 'data-lado': 'nos', text: String(a) }),
      el('i', { class: 'g1-guion', 'aria-hidden': 'true', text: '–' }),
      el('b', { class: 'g1-goles num', 'data-lado': 'ellos', text: String(b) }),
      equipo(ellos, 'ellos')
    ]),
    el('ol', { class: 'g1-mapas', 'aria-label': `Los mapas del Bo${camino.bo}` }, mapas.map((m, i) => {
      const res = m.resultado ?? (m.numero === actual ? 'actual' : null);
      return el('li', { 'data-res': res, style: { '--i': String(i) } }, [
        el('span', {}, [el('span', { class: 'g1-mapa-palabra', text: 'Mapa ' }), String(m.numero)]),
        el('i', { 'aria-hidden': 'true', text: res === 'actual' ? '▶' : MARCA_MAPA[res] ?? '' })
      ]);
    }))
  ]);
}

// El mapa que se acaba de jugar queda escrito en la tira, al toque (y el marcador se mueve si pasó o no).
export function marcarMapaG1(camino, clave) {
  const li = camino?.querySelector('.g1-mapas [data-res="actual"]');
  if (!li) return;
  const res = clave === 'paso' ? 'W' : clave === 'casi' ? 'casi' : 'L';
  li.dataset.res = res;
  li.querySelector('i').textContent = MARCA_MAPA[res];
  if (res === 'casi') return;
  const goles = camino.querySelector(`.g1-goles[data-lado="${res === 'W' ? 'nos' : 'ellos'}"]`);
  if (goles) {
    goles.textContent = String(Number(goles.textContent) + 1);
    goles.dataset.suma = '';
  }
  // la línea del momento ya no vale: si con este mapa se cerró la serie, lo dice; si no, se va
  const momento = camino.querySelector('.g1-momento');
  const necesita = Number(camino.dataset.necesita);
  if (momento && goles && Number(goles.textContent) >= necesita) {
    const final = camino.dataset.final === '';
    momento.dataset.tono = res === 'W' ? 'gloria' : 'peligro';
    momento.textContent = res === 'W' ? (final ? '¡Campeones!' : 'Serie ganada') : (final ? 'La copa es de ellos' : 'Serie perdida');
  } else {
    momento?.remove();
  }
}

// La mesa: la vara, los chips y el premio. `alCambiarPoder(activo)` avisa a la parada; `alJugar` traba el poder.
export function crearMesaG1(decision, estado, { alCambiarPoder = () => {} } = {}) {
  const g1 = decision.datos.g1;
  const id = decision.datos.minijuego;
  const poder = g1.poder ?? null;
  const regla = el('p', { class: 'g1-regla-texto' });
  const antes = el('s', { class: 'g1-regla-antes' });
  const stat = G1.lineaDeStat(id, estado);
  let activo = false;
  let charlaActiva = false;
  const bajaCharla = () => (charlaActiva ? (decision.datos.charla?.bajaVara ?? 0) : 0);
  const pintarRegla = () => {
    regla.textContent = G1.reglaDeVara(id, G1.varaEfectiva(g1, activo, bajaCharla()), estado, decision.datos);
    // la regla tachada de antes: la vara que había sin el poder ni la charla
    const bajo = (activo && poder?.efecto?.bajaVara) || charlaActiva;
    const antesDicho = bajo ? G1.reglaDeVara(id, g1.vara, estado, decision.datos) : '';
    // con una mecánica de pocos pasos (3 de 4), bajar la vara 0,08 puede no mover el número: no se tacha lo que no cambió
    const cambio = antesDicho !== regla.textContent;
    antes.textContent = cambio ? antesDicho : '';
    antes.hidden = !cambio;
  };
  pintarRegla();

  const chips = [];
  let botonPoder = null;
  if (poder) {
    const usable = poder.disponible && poder.id !== 'vestuario';
    const cuerpo = [
      el('span', { class: 'g1-poder-k', text: poder.disponible ? 'Tu poder' : 'Tu poder · ya lo usaste' }),
      el('b', { text: poder.nombre }),
      el('small', { text: poder.texto })
    ];
    botonPoder = usable
      ? el('button', { type: 'button', class: 'g1-chip g1-poder', 'aria-pressed': 'false', 'data-poder': poder.id }, cuerpo)
      : el('div', { class: 'g1-chip g1-poder', 'data-poder': poder.id, 'data-usado': poder.disponible ? null : '' }, cuerpo);
    if (usable) {
      botonPoder.addEventListener('click', () => {
        activo = !activo;
        botonPoder.setAttribute('aria-pressed', String(activo));
        botonPoder.querySelector('.g1-poder-k').textContent = activo ? 'Tu poder · activado' : 'Tu poder';
        pintarRegla();
        alCambiarPoder(activo);
      });
    }
    chips.push(botonPoder);
  }
  // El desempate que todavía te queda en este torneo (`g1.desempateDisponible`, lo da el motor): un solo casi por torneo.
  if (!g1.desempate && !g1.revancha && g1.desempateDisponible) {
    chips.push(el('span', { class: 'g1-chip g1-desempate', 'data-queda': '' }, [
      el('span', { class: 'g1-poder-k', text: 'Te queda el desempate' }),
      el('small', { text: 'Si quedás a un pelo, se juega otra vez, más corto y más difícil.' })
    ]));
  }
  if (g1.desempate) chips.push(el('span', { class: 'g1-chip g1-rotulo', 'data-tipo': 'desempate', text: 'Desempate' }));
  if (g1.revancha) chips.push(el('span', { class: 'g1-chip g1-rotulo', 'data-tipo': 'revancha', text: 'Revancha' }));
  const charla = decision.datos.charla;
  let chipCharla = null;
  let textoCharla = null;
  if (charla) {
    const usos = charla.usos ?? (charla.disponible ? 1 : 0);
    textoCharla = el('b', { text: usos > 0 ? `te ${usos === 1 ? 'queda 1' : `quedan ${usos}`} esta temporada` : 'ya la usaste esta temporada' });
    chipCharla = el('span', { class: 'g1-chip g1-charla', 'data-vacia': usos > 0 ? null : '' }, [
      el('span', { class: 'g1-poder-k', text: 'Charla del coach' }),
      textoCharla
    ]);
    textoCharla.dataset.base = textoCharla.textContent;
    chips.push(chipCharla);
  }
  const premio = g1.premio
    ? el('p', { class: 'g1-premio' }, [el('span', { text: 'Si sale' }), el('b', { text: g1.premio.si }), el('span', { text: 'Si no' }), el('b', { text: g1.premio.no })])
    : null;
  const nodo = el('div', { class: 'g1-mesa' }, [
    el('div', { class: 'g1-regla' }, [
      el('span', { class: 'g1-regla-k', text: g1.desempate ? 'La vara del desempate' : 'La vara' }),
      regla,
      antes,
      stat ? el('small', { class: 'g1-regla-stat', text: stat }) : null
    ]),
    chips.length ? el('div', { class: 'g1-chips' }, chips) : null,
    premio
  ]);
  return {
    nodo,
    // La charla se elige antes del "¡Vamos!": la vara de la regla baja lo que baja la charla (`datos.charla.bajaVara`).
    fijarCharla(activa) {
      charlaActiva = activa === true && charla?.disponible === true;
      if (chipCharla) {
        if (charlaActiva) chipCharla.dataset.usada = '';
        else delete chipCharla.dataset.usada;
        textoCharla.textContent = charlaActiva ? 'la usás en este mapa' : textoCharla.dataset.base;
      }
      pintarRegla();
    },
    alJugar() {
      nodo.dataset.jugando = '';
      if (botonPoder?.tagName === 'BUTTON') botonPoder.disabled = true;
    },
    alTerminar(juicio) {
      nodo.dataset.juicio = juicio.clave;
    }
  };
}

// El veredicto: el sello, la línea del dato y el "tan cerca".
export function crearVeredictoG1(decision, estado, { resultado, detalle, juicio, poderActivo }) {
  const id = decision.datos.minijuego;
  const v = G1.lineaDeVeredicto(id, juicio.clave, estado);
  const cerca = G1.tanCerca(id, resultado, detalle, juicio, estado, { ...decision.datos, poderActivo });
  return el('div', { class: `minijuego-resultado minijuego-resultado--${v.nivel} g1-veredicto`, 'data-juicio': juicio.clave, role: 'status' }, [
    el('div', { class: 'g1-veredicto-sello', text: v.titulo }),
    v.detalle ? el('div', { class: 'minijuego-resultado-detalle', text: v.detalle }) : null,
    cerca ? el('div', { class: 'g1-cerca', text: cerca }) : null
  ]);
}

// El sello del Bo1 con riesgo (contrato de G1, "Las opciones del Bo1 con riesgo"): solo si la opción trae `g1`.
export function selloDeRiesgo(opcion) {
  const r = opcion?.g1;
  if (!r?.riesgo) return null;
  const arriesgado = r.riesgo === 'arriesgado';
  return el('span', { class: 'g1-sello-riesgo', 'data-riesgo': r.riesgo }, [
    el('b', { text: arriesgado ? '🎲 Arriesgado' : '🧊 Seguro' }),
    r.premio ? el('small', { text: r.premio }) : null
  ]);
}
