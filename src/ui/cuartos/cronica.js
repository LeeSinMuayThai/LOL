// El cuarto Crónica (FASE V, V3e; PLAN.md §V.4): lo que pasó en la carrera, agrupado por AÑO y por SPLIT, con encabezados, lo
// más nuevo arriba. Antes era un volcado de los últimos 8 beats sin ninguna referencia de cuándo.
//
// Lee la `vista` (lo que la pantalla ya contó). A mitad de un relato la `vista` sigue en la parada anterior: por eso suma
// los beats que la página en curso YA mostró (`contadoDelRelato`, de `app.js`), cortando el feed donde el reproductor se
// quedó. Nunca uno por contar (regla 4 de §V.3).
//
// Los logs del motor no traen el año ni el split (`state.logs` es una lista plana), así que se reconstruyen de dos marcas
// que el motor SÍ escribe:
//   - el año cierra con el log `edad` que trae `anio` (el resumen del año, `systems/resumenAnio.js`): todo lo anterior,
//     desde el cierre previo, es de ese año, y su titular rotula el año;
//   - un split abre con el parche del meta (`systems/meta.js`): el primer log `meta` de una racha (el segundo de la racha,
//     "Sale tal campeón", viaja con el primero). Los `contexto` que lo preceden son del split nuevo.
// Un año cerrado numera sus splits hacia atrás desde el último (el año cierra en el tercero); el año en curso, hacia
// adelante desde el primero. Si algo no cierra con esa cuenta (más marcas que splits por año), numera de corrido: nunca
// inventa un número que la cuenta no sostiene.
import { agruparBeats, nodoDeBeat } from '../components/feed.js';
import { BALANCE } from '../../data/balance.js';
import { crearTexto } from './comun.js';

const ES_CIERRE_DE_ANIO = (log) => log.type === 'edad' && Number.isFinite(log.anio);
const ES_PARCHE = (logs, i) => logs[i].type === 'meta' && logs[i - 1]?.type !== 'meta';

// Parte `logs` en años: `[{ anio, cerrado, titular, desde, hasta, splits: [{ numero, desde, hasta }] }]`, del más viejo al
// más nuevo; `hasta` es exclusive. `anioEnCurso`: el año del reloj, para el último tramo (el que no cerró). Pura: sin DOM.
export function dividirEnAnios(logs, anioEnCurso) {
  const anios = [];
  let desde = 0;
  for (let i = 0; i < logs.length; i += 1) {
    if (!ES_CIERRE_DE_ANIO(logs[i])) continue;
    // Dos cierres del mismo año (el resumen y su titular) son un solo cierre: gana el último.
    const siguiente = logs.findIndex((log, j) => j > i && ES_CIERRE_DE_ANIO(log));
    if (siguiente > -1 && logs[siguiente].anio === logs[i].anio) continue;
    anios.push({ anio: logs[i].anio, cerrado: true, titular: logs[i].message ?? '', desde, hasta: i + 1 });
    desde = i + 1;
  }
  if (desde < logs.length) {
    anios.push({ anio: anioEnCurso, cerrado: false, titular: '', desde, hasta: logs.length });
  }
  for (const tramo of anios) {
    tramo.splits = dividirEnSplits(logs, tramo);
  }
  return anios;
}

function dividirEnSplits(logs, { desde, hasta, cerrado }) {
  const parches = [];
  for (let i = desde; i < hasta; i += 1) {
    if (ES_PARCHE(logs, i)) {
      let inicio = i;
      while (inicio > desde && logs[inicio - 1].type === 'contexto') inicio -= 1;
      parches.push(inicio);
    }
  }
  // Sin ningún parche (un año recortado): un solo bloque sin número.
  if (parches.length === 0) return [{ numero: null, desde, hasta }];
  const porAnio = BALANCE.edad.splitsPorEdad;
  const splits = parches.map((inicio, k) => ({
    numero: null,
    // Lo que quedó antes del primer parche (el cierre del año anterior ya no está: cortó en el `edad`) va con el primer split.
    desde: k === 0 ? desde : inicio,
    hasta: k + 1 < parches.length ? parches[k + 1] : hasta
  }));
  const cuentaCierra = splits.length <= porAnio;
  splits.forEach((split, k) => {
    if (!cuentaCierra) split.numero = k + 1;
    else split.numero = cerrado ? porAnio - (splits.length - 1 - k) : k + 1;
  });
  return splits;
}

function tituloDeSplit(split) {
  return split.numero === null ? 'Sin parche' : `Split ${split.numero}`;
}

// Los beats de un tramo de logs, el más nuevo arriba, con el mismo nodo que el relato.
function pintarBeats(destino, logs, estado, { desde, hasta }) {
  const beats = agruparBeats(logs.slice(desde, hasta), desde).reverse();
  destino.replaceChildren(...beats.map((beat) => nodoDeBeat(beat, estado)));
}

function pintarAnio(tramo, logs, estado) {
  const caja = document.createElement('details');
  caja.className = 'cronica-anio';
  const resumen = document.createElement('summary');
  resumen.className = 'cronica-anio-titulo';
  const anio = document.createElement('span');
  anio.className = 'cronica-anio-numero';
  anio.textContent = tramo.anio === null ? 'Año en curso' : String(tramo.anio);
  const nota = document.createElement('span');
  nota.className = 'cronica-anio-nota';
  nota.textContent = tramo.cerrado ? tramo.titular : 'en curso';
  resumen.append(anio, nota);
  caja.appendChild(resumen);

  const cuerpo = document.createElement('div');
  cuerpo.className = 'cronica-anio-cuerpo';
  caja.appendChild(cuerpo);
  const llenar = () => {
    // Del split más nuevo al más viejo.
    for (const split of [...tramo.splits].reverse()) {
      const seccion = document.createElement('section');
      seccion.className = 'cronica-split';
      const titulo = document.createElement('h3');
      titulo.className = 'cronica-split-titulo';
      titulo.textContent = tituloDeSplit(split);
      const lista = document.createElement('div');
      lista.className = 'log-list cronica-lista';
      pintarBeats(lista, logs, estado, split);
      seccion.append(titulo, lista);
      cuerpo.appendChild(seccion);
    }
  };
  // El año en curso se pinta de entrada; los cerrados, recién al abrirlos (una carrera larga tiene ~800 líneas).
  if (!tramo.cerrado) {
    caja.open = true;
    llenar();
  } else {
    caja.addEventListener('toggle', () => {
      if (caja.open && cuerpo.childElementCount === 0) llenar();
    });
  }
  return caja;
}

export function pintar(cuerpo, estado, { contadoDelRelato }) {
  const enCurso = contadoDelRelato?.() ?? null;
  const fuente = enCurso ? enCurso.estado : estado;
  const logs = enCurso ? fuente.logs.slice(0, enCurso.hasta) : fuente.logs;
  if (logs.length === 0) {
    cuerpo.appendChild(crearTexto('cuarto-vacio', 'Todavía no pasó nada que contar: la crónica se arma a medida que jugás.'));
    return;
  }
  const lista = document.createElement('div');
  lista.className = 'cronica';
  const anios = dividirEnAnios(logs, fuente.calendario?.anio ?? null);
  lista.append(...anios.reverse().map((tramo) => pintarAnio(tramo, logs, fuente)));
  cuerpo.appendChild(lista);
}
