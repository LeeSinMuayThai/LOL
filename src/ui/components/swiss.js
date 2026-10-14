// F1 (PLANUI §0.8): EL TABLERO DEL SWISS. "Ver un Swiss Stage simulado con los brackets simulados y ver dónde estás vos"
// (el usuario, textual). Lee `tableroDelSwiss` (`core/internacional.js`, puro: arma `state.internacional` para pintar) y
// no calcula nada del torneo. Es la gráfica que la transmisión de Worlds pone entre partido y partido:
//   - una columna por ronda, con los cruces agrupados por el récord con el que llegaron (0-0; 1-0 y 0-1; …), el ganador
//     encendido y el perdedor apagado; la ronda que se está por jugar, al final y sin resultado;
//   - vos resaltado en cada cruce tuyo, y tu cruce de esta ronda marcado;
//   - los que ya pasaron (3 victorias) y los eliminados (3 derrotas), con su récord.
// `compacto` (el celular): solo la ronda en curso y los que ya se definieron, en una columna, sin scroll horizontal.
import { el } from '../fx/util.js';
import { logoOrg, siglaDe } from '../fx/competicion.js';
import { nombreVisibleDeLiga } from '../formatoUi.js';

function equipo(nombre, { tablero, ganador }) {
  const vos = nombre === tablero.jugador;
  const estado = ganador == null ? null : ganador === nombre ? 'gano' : 'perdio';
  const del = { liga: tablero.ligas[nombre] };
  return el('span', { class: 'sw-eq', 'data-vos': vos ? '' : null, 'data-res': estado, title: `${nombre}${del.liga ? ` (${nombreVisibleDeLiga(del.liga)})` : ''}` }, [
    logoOrg(nombre, { clase: 'sw-logo' }),
    el('b', { class: 'sw-sigla', text: siglaDe(nombre) || nombre })
  ]);
}

function cruce(c, tablero, enCurso) {
  return el('li', { class: 'sw-cruce', 'data-tuyo': c.propio ? '' : null, 'data-vivo': enCurso && c.propio ? '' : null }, [
    equipo(c.a, { tablero, ganador: c.ganador }),
    el('i', { class: 'sw-vs', text: 'vs' }),
    equipo(c.b, { tablero, ganador: c.ganador })
  ]);
}

function columna(ronda, tablero) {
  return el('section', { class: 'sw-ronda', 'data-encurso': ronda.enCurso ? '' : null, 'aria-label': `Ronda ${ronda.ronda}` }, [
    el('p', { class: 'sw-ronda-k', text: ronda.enCurso ? `Ronda ${ronda.ronda} · ahora` : `Ronda ${ronda.ronda}` }),
    ...ronda.pools.map((pool) => {
      const tuyo = pool.cruces.some((c) => c.propio);
      return el('div', { class: 'sw-pool', 'data-tuyo': tuyo ? '' : null }, [
        el('p', { class: 'sw-pool-k' }, [el('b', { class: 'num', text: `${pool.v}–${pool.d}` }), tuyo ? el('small', { text: 'vos' }) : null]),
        el('ul', { class: 'sw-cruces' }, pool.cruces.map((c) => cruce(c, tablero, ronda.enCurso)))
      ]);
    })
  ]);
}

function definidos(lista, tablero, clase, rotulo) {
  return el('section', { class: `sw-def sw-def--${clase}`, 'aria-label': rotulo }, [
    el('p', { class: 'sw-ronda-k' }, [rotulo, el('b', { class: 'num', text: String(lista.length) })]),
    lista.length
      ? el('ul', { class: 'sw-def-lista' }, lista.map((x) => el('li', { 'data-vos': x.nombre === tablero.jugador ? '' : null }, [
        equipo(x.nombre, { tablero, ganador: null }),
        el('small', { class: 'num', text: `${x.v}–${x.d}` })
      ])))
      : el('p', { class: 'sw-def-nadie', text: 'todavía nadie' })
  ]);
}

export function crearTableroSwiss(tablero, { compacto = false } = {}) {
  const rec = tablero.record[tablero.jugador] ?? { v: 0, d: 0 };
  const rondas = compacto ? tablero.rondas.filter((r) => r.enCurso).slice(-1) : tablero.rondas;
  return el('section', { class: `sw${compacto ? ' sw--compacto' : ''}`, 'aria-label': `El Swiss del Mundial: vas ${rec.v}-${rec.d}` }, [
    el('p', { class: 'sw-cab' }, [el('span', { text: 'El Swiss' }), el('b', { class: 'num', text: `vas ${rec.v}–${rec.d}` })]),
    el('div', { class: 'sw-grilla' }, [
      ...rondas.map((r) => columna(r, tablero)),
      el('div', { class: 'sw-defs' }, [
        definidos(tablero.pasaron, tablero, 'pasaron', 'A cuartos'),
        definidos(tablero.afuera, tablero, 'afuera', 'Afuera')
      ])
    ])
  ]);
}
