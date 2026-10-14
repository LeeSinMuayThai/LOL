import { nombreVisibleDeLiga } from '../formatoUi.js';
import { logoOrg, siglaDe } from '../fx/competicion.js';
// K5-A (PLAN.md "K5 — decisiones de spec", K5-A, pantalla): el Mundial en una tarjeta. Arriba, tu Swiss resumido
// (tu récord y cada cruce, con su resultado); abajo, el bracket de 8 con tu camino marcado. Lee solo el resumen que
// el motor dejó en el log de cierre del Mundial (`core/internacional.js:resumenDelMundial`): no calcula nada.

const ETIQUETA_RESULTADO = {
  campeon: 'Campeón del mundo',
  final: 'Subcampeón',
  semis: 'Semifinal',
  cuartos: 'Cuartos',
  eliminado: 'Afuera en el Swiss'
};

const ETIQUETA_ETAPA = { cuartos: 'Cuartos', semis: 'Semis', final: 'Final' };

function el(tag, clase, texto) {
  const nodo = document.createElement(tag);
  if (clase) {
    nodo.className = clase;
  }
  if (texto !== undefined) {
    nodo.textContent = texto;
  }
  return nodo;
}

function filaSwiss(resumen) {
  const fila = el('div', 'mundial-swiss');
  fila.appendChild(el('span', 'mundial-rotulo', `Swiss ${resumen.record}`));
  const cruces = el('div', 'mundial-cruces');
  for (const cruce of resumen.swiss) {
    const chip = el('span', `mundial-cruce mundial-cruce--${cruce.gano ? 'w' : 'l'}`);
    chip.title = `Ronda ${cruce.ronda}: ${cruce.gano ? 'ganaste' : 'perdiste'} contra ${cruce.rival} (${nombreVisibleDeLiga(cruce.liga)})`;
    chip.append(el('span', 'mundial-cruce-res', cruce.gano ? 'G' : 'P'), el('span', 'mundial-cruce-rival', cruce.rival));
    cruces.appendChild(chip);
  }
  fila.appendChild(cruces);
  return fila;
}

// F1 (PLANUI §0.8): la misma fila sirve para el cuadro EN CURSO (`core/internacional.js:cuadroDelMundial`): una serie
// sin jugar no trae `marcador` (va "—") y una de una etapa que todavía no tiene cruces no trae equipos (va "por definir").
// `conSigla` (el cuadro de la transmisión, angosto): el escudo y la sigla, con el nombre entero en el `title`.
function filaSerie(serie, jugador, etapaEnCurso = null, etapa = null, conSigla = false) {
  const tuya = Boolean(jugador) && (serie.a === jugador || serie.b === jugador);
  const enCurso = tuya && etapa === etapaEnCurso;
  const fila = el('div', `mundial-serie${tuya ? ' mundial-serie--tuya' : ''}${enCurso ? ' mundial-serie--ahora' : ''}`);
  const lado = (nombre, mapas) => {
    const gano = serie.ganador != null && serie.ganador === nombre;
    const perdio = serie.ganador != null && serie.ganador !== nombre;
    const nodo = el('span', `mundial-equipo${gano ? ' mundial-equipo--gano' : ''}${perdio ? ' mundial-equipo--perdio' : ''}${nombre && nombre === jugador ? ' mundial-equipo--vos' : ''}`);
    const rotulo = el('span', 'mundial-equipo-nombre', nombre ? (conSigla ? siglaDe(nombre) || nombre : nombre) : 'por definir');
    if (conSigla && nombre) {
      nodo.title = nombre;
      rotulo.prepend(logoOrg(nombre, { clase: 'mundial-equipo-logo' }));
    }
    nodo.append(rotulo, el('span', 'mundial-equipo-mapas', mapas == null ? '—' : String(mapas)));
    return nodo;
  };
  fila.append(lado(serie.a, serie.marcador?.[0]), lado(serie.b, serie.marcador?.[1]));
  return fila;
}

function bloqueBracket(resumen, conSigla = false) {
  const bracket = el('div', 'mundial-bracket');
  for (const { etapa, series } of resumen.bracket) {
    const columna = el('div', `mundial-etapa${etapa === resumen.etapaEnCurso ? ' mundial-etapa--ahora' : ''}`);
    columna.appendChild(el('div', 'mundial-rotulo', ETIQUETA_ETAPA[etapa]));
    for (const serie of series) {
      columna.appendChild(filaSerie(serie, resumen.jugador, resumen.etapaEnCurso, etapa, conSigla));
    }
    bracket.appendChild(columna);
  }
  return bracket;
}

// F1: el cuadro de 8 en las paradas de cuartos, semis y final del Mundial, con tu camino marcado (tus series, la de
// ahora encendida). Lo arma `cuadroDelMundial` (`core/internacional.js`); la pantalla no calcula nada.
export function crearCuadroMundial(cuadro) {
  const caja = el('section', 'mundial-cuadro');
  caja.setAttribute('aria-label', 'El cuadro del Mundial');
  caja.append(el('div', 'mundial-rotulo mundial-cuadro-k', 'El cuadro del Mundial'), bloqueBracket(cuadro, true));
  return caja;
}

export function crearTarjetaMundial(entry) {
  const resumen = entry.mundial;
  const item = el('div', `log-item mundial mundial--${resumen.resultado}`);
  item.dataset.type = entry.type ?? 'internacional';

  const cabeza = el('div', 'mundial-cabeza');
  cabeza.append(
    el('span', 'mundial-titulo', `Mundial ${resumen.anio}`),
    el('span', 'mundial-resultado', ETIQUETA_RESULTADO[resumen.resultado] ?? '')
  );
  item.append(cabeza, el('div', 'mundial-texto', entry.message), filaSwiss(resumen));
  if (resumen.bracket.length > 0) {
    item.appendChild(bloqueBracket(resumen));
  }
  item.appendChild(el('div', 'mundial-campeon', `Campeón: ${resumen.campeon} (${nombreVisibleDeLiga(resumen.ligaCampeon)})`));
  return item;
}
