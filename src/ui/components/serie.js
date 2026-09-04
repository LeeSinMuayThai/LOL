import { tablaDePosiciones, posicionEnTabla } from '../../core/temporada.js';
import { etiquetaDeRonda } from '../../core/serie.js';
import { etiquetaDeFuerza } from '../formatoUi.js';

// La transmisión del partido y la serie (fase T6, PLAN.md "T6 — El partido
// y la serie como transmisión"). Dos piezas: la tarjeta de resultado de
// fecha (reemplaza el log plano de `type: 'temporada'`) y el contexto de
// serie de playoffs (bracket + camino Fearless), visible mientras
// `state.serie.activa`.

// --- La tarjeta de resultado de fecha ---------------------------------
//
// El log `type: 'temporada'` que `systems/temporada.js` ya escribe trae
// TODO narrado en una frase — motivo, resultado, posición, campeón — pero
// como prosa, no como campos. En vez de re-parsear ese texto (frágil: un
// cambio de redacción rompería el parser en silencio), esta tarjeta usa el
// texto tal cual para el cuerpo, y arma el encabezado con los campos que sí
// están disponibles como datos reales, sin tocar `systems/`:
//   - rival/fuerza/local: `career.temporada.calendario[indice - 1]` — la
//     fecha recién jugada, ya avanzada por `avanzarFechaSilenciosa`.
//   - victoria/derrota: el signo de `racha` (ya persistente y correcto
//     después de resolver, no hace falta re-derivarlo).
//   - posición: `posicionEnTabla` sobre la tabla derivada en vivo — mismo
//     campo muerto que encontró T5 (`career.temporada.tabla` no sirve).
// `career.registro.momentos` no registra las fechas marcadas (solo lo que
// pasa por `systems/events.js`) — no hay otra fuente estructurada posible
// sin tocar motor.
export function crearTarjetaResultado(entry, state) {
  const { temporada, registro, currentOrg } = state.career;
  const fecha = temporada.calendario[temporada.indice - 1];

  const item = document.createElement('div');
  item.className = 'log-item log-item--resultado';

  if (!fecha) {
    // Red de seguridad: si algún día un log `type:'temporada'` no viene de
    // una fecha del fixture (no debería pasar hoy), se degrada al log
    // plano de siempre en vez de romper.
    item.textContent = entry.message;
    return item;
  }

  const gano = temporada.racha > 0;
  const tabla = tablaDePosiciones(temporada.registrosOtros, temporada.filaPropia);
  const posicion = posicionEnTabla(tabla, currentOrg);

  item.classList.add(gano ? 'log-item--resultado-victoria' : 'log-item--resultado-derrota');

  const cabecera = document.createElement('div');
  cabecera.className = 'resultado-cabecera';

  const marcador = document.createElement('span');
  marcador.className = 'resultado-marcador';
  marcador.textContent = gano ? 'GANARON' : 'PERDIERON';

  const rivalEl = document.createElement('span');
  rivalEl.className = 'resultado-rival';
  rivalEl.textContent = `${fecha.local ? 'vs' : '@'} ${fecha.rival}`;

  const fuerzaEl = document.createElement('span');
  fuerzaEl.className = 'resultado-fuerza';
  fuerzaEl.textContent = etiquetaDeFuerza(fecha.fuerzaRival, temporada.fuerzaPropia);

  cabecera.append(marcador, rivalEl, fuerzaEl);
  item.appendChild(cabecera);

  const cuerpo = document.createElement('div');
  cuerpo.textContent = entry.message;
  item.appendChild(cuerpo);

  const pie = document.createElement('div');
  pie.className = 'resultado-pie';
  const rachaAbs = Math.abs(temporada.racha);
  const rachaTxt = rachaAbs > 1 ? `Racha de ${rachaAbs} ${gano ? 'triunfos' : 'derrotas'}` : null;
  pie.textContent = [`${posicion}º de ${tabla.length}`, rachaTxt].filter(Boolean).join(' · ');
  item.appendChild(pie);

  return item;
}

// --- El bracket + el camino de la serie --------------------------------
//
// `serie.ronda` recorre `['cuartos','semis','final']` (+ `'internacional'`
// aparte) — `core/serie.js:etiquetaDeRonda` ya las nombra. `serie.mapas` ya
// guarda `[{campeon, resultado:'W'|'L'}]` y `serie.quemados` los campeones
// que el Fearless draft ya gastó: es la mecánica más distintiva del juego
// y hoy es una línea de texto plana.
const RONDAS_BRACKET = ['cuartos', 'semis', 'final'];

export function renderSerieContexto(container, state) {
  const { serie } = state;

  if (!serie.activa) {
    container.hidden = true;
    return;
  }

  container.hidden = false;
  container.replaceChildren();

  // El bracket, solo para las rondas domésticas — el internacional es un
  // cruce único, no tiene sentido en una barra de 3 pasos.
  if (RONDAS_BRACKET.includes(serie.ronda)) {
    const bracket = document.createElement('div');
    bracket.className = 'serie-bracket';
    const indiceActual = RONDAS_BRACKET.indexOf(serie.ronda);
    RONDAS_BRACKET.forEach((ronda, indice) => {
      const paso = document.createElement('span');
      paso.className = 'serie-bracket-paso'
        + (indice < indiceActual ? ' serie-bracket-paso--superada' : '')
        + (indice === indiceActual ? ' serie-bracket-paso--actual' : '');
      paso.textContent = etiquetaDeRonda(ronda);
      bracket.appendChild(paso);
    });
    container.appendChild(bracket);
  } else {
    const titulo = document.createElement('div');
    titulo.className = 'serie-bracket-titulo-solo';
    titulo.textContent = etiquetaDeRonda(serie.ronda);
    container.appendChild(titulo);
  }

  const marcadorEl = document.createElement('div');
  marcadorEl.className = 'serie-marcador';
  marcadorEl.textContent = `${state.serie.rival.org} · ${serie.marcador[0]}-${serie.marcador[1]}`;
  container.appendChild(marcadorEl);

  // El camino mapa a mapa: el campeón jugado en cada uno, con los quemados
  // tachados. El Fearless no se entiende leído en una línea de texto.
  if (serie.mapas.length > 0 || serie.quemados.length > 0) {
    const camino = document.createElement('div');
    camino.className = 'serie-camino';
    serie.mapas.forEach((mapa, indice) => {
      const paso = document.createElement('span');
      paso.className = `serie-mapa serie-mapa--${mapa.resultado === 'W' ? 'ganado' : 'perdido'}`;
      paso.textContent = `M${indice + 1} ${mapa.campeon}`;
      camino.appendChild(paso);
    });
    if (serie.quemados.length > 0) {
      const quemadosEl = document.createElement('div');
      quemadosEl.className = 'serie-quemados';
      quemadosEl.textContent = `Quemados: ${serie.quemados.join(', ')}`;
      container.appendChild(camino);
      container.appendChild(quemadosEl);
    } else {
      container.appendChild(camino);
    }
  }
}
