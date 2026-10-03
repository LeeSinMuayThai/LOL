import { nombreVisibleDeLiga } from '../formatoUi.js';
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

function filaSerie(serie, jugador) {
  const tuya = serie.a === jugador || serie.b === jugador;
  const fila = el('div', `mundial-serie${tuya ? ' mundial-serie--tuya' : ''}`);
  const lado = (nombre, mapas) => {
    const gano = serie.ganador === nombre;
    const nodo = el('span', `mundial-equipo${gano ? ' mundial-equipo--gano' : ''}`);
    nodo.append(el('span', 'mundial-equipo-nombre', nombre), el('span', 'mundial-equipo-mapas', String(mapas)));
    return nodo;
  };
  fila.append(lado(serie.a, serie.marcador[0]), lado(serie.b, serie.marcador[1]));
  return fila;
}

function bloqueBracket(resumen) {
  const bracket = el('div', 'mundial-bracket');
  for (const { etapa, series } of resumen.bracket) {
    const columna = el('div', 'mundial-etapa');
    columna.appendChild(el('div', 'mundial-rotulo', ETIQUETA_ETAPA[etapa]));
    for (const serie of series) {
      columna.appendChild(filaSerie(serie, resumen.jugador));
    }
    bracket.appendChild(columna);
  }
  return bracket;
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
