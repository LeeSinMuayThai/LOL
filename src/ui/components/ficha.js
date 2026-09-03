import { fichaCompleta } from '../../core/ficha.js';
import { crearBarra } from './barra.js';
import { crearStatRow } from './statRow.js';
import { BALANCE } from '../../data/balance.js';

// LA TARJETA (fase 8, PLAN.md §8.6): vive en todas las pantallas de carrera.
// Es la respuesta directa a H7 del diagnóstico — "los números que ves no
// tienen referente" — así que ningún número sale acá sin banda, sin flecha,
// o sin comparación (regla de proceso 13).

const LABEL_NIVEL = { prospecto: 'Prospecto', titular: 'Titular', elite: 'Élite', clase_mundial: 'Clase mundial' };
const LABEL_INTERNACIONAL = {
  sin_chance: 'Selección: sin chance',
  en_carpeta: 'Selección: en carpeta',
  clasificado: 'Clasificado a internacional',
  jugando: 'Jugando el internacional'
};
const FASE_LABEL = { amateur: 'Amateur', profesional: 'Profesional', retirado: 'Retirado' };

function hitosJerarquia() {
  const { estatusBandas } = BALANCE.contexto;
  return [
    { id: 'rookie', label: 'Rookie', piso: 0 },
    { id: 'titular', label: 'Titular', piso: estatusBandas.rookie },
    { id: 'referente', label: 'Referente', piso: estatusBandas.titular },
    { id: 'franquicia', label: 'Franquicia', piso: estatusBandas.referente }
  ];
}

function hitosArraigo() {
  const { hitos } = BALANCE.arraigo;
  return [
    { id: 'uno_mas', label: 'Uno más', piso: hitos.uno_mas },
    { id: 'querido', label: 'Querido', piso: hitos.querido },
    { id: 'idolo', label: 'Ídolo', piso: hitos.idolo },
    { id: 'leyenda', label: 'Leyenda', piso: hitos.leyenda }
  ];
}

// Una fila de "TU HISTORIA, CLUB POR CLUB" (imagen 15 de PLAN.md). La misma
// función la va a reusar la tarjeta final de la fase 10 — se escribe acá
// una vez.
export function filaHistoria(fila) {
  const item = document.createElement('div');
  item.className = 'ficha-historia-fila';
  const rango = fila.hastaAnio ? `${fila.desdeAnio}–${fila.hastaAnio}` : `${fila.desdeAnio}–`;
  const titulos = fila.titulos.length > 0
    ? ` · 🏆 ${fila.titulos.map((t) => `${t.nombre} ${t.anio}`).join(', ')}`
    : '';
  item.textContent = `${fila.org} — ${fila.splits} splits · ${fila.fechasG}-${fila.fechasP} · ${rango}${titulos}`;
  return item;
}

// Una fila de momento (fase 8D, `career.registro.momentos`): la decisión que
// te quedó pegada. Distinto de `filaHistoria` — esto no es "cuánto jugaste en
// cada club", es "qué te pasó y cuándo", el efecto `momento` escribe acá.
export function filaMomento(momento) {
  const item = document.createElement('div');
  item.className = 'ficha-historia-fila';
  const lugar = momento.org ? ` · ${momento.org}` : '';
  item.textContent = `${momento.anio} (${momento.edad} años)${lugar} — ${momento.texto}`;
  return item;
}

export function renderFicha(container, state, modulos) {
  const ficha = fichaCompleta(state);
  const registro = state.career.registro;
  const enHitoMaximo = ficha.jerarquia.esMaxima || ficha.arraigo.esMaxima;

  container.replaceChildren();
  container.className = 'ficha-card' + (enHitoMaximo ? ' ficha-card--dorada' : '');

  // --- Encabezado: NIVEL grande a la izquierda + identidad ---
  const encabezado = document.createElement('div');
  encabezado.className = 'ficha-encabezado';

  const nivelBox = document.createElement('div');
  nivelBox.className = `ficha-nivel ficha-nivel--${ficha.bandaNivel}`;
  const nivelNum = document.createElement('div');
  nivelNum.className = 'ficha-nivel-numero';
  nivelNum.textContent = String(ficha.nivel);
  const nivelLabel = document.createElement('div');
  nivelLabel.className = 'ficha-nivel-label';
  nivelLabel.textContent = LABEL_NIVEL[ficha.bandaNivel];
  nivelBox.append(nivelNum, nivelLabel);

  const identidad = document.createElement('div');
  identidad.className = 'ficha-identidad';

  const nombreLinea = document.createElement('div');
  nombreLinea.className = 'ficha-nombre-linea';
  nombreLinea.textContent = `${state.player.name} · ${modulos.etiquetaRol(state.player.role)}`;

  const contextoLinea = document.createElement('div');
  contextoLinea.className = 'ficha-contexto-linea';
  const org = state.career.currentOrg ? `${state.career.currentOrg} · ` : '';
  const liga = state.mundo.ligas?.find((l) => l.id === state.career.liga)?.id ?? state.mundo.ligaOrigen;
  contextoLinea.textContent = `${org}${liga} · ${state.calendario.etiqueta} · ${state.age} años`;

  const estadoLinea = document.createElement('div');
  estadoLinea.className = 'ficha-estado-linea';
  estadoLinea.textContent = state.contexto
    ? modulos.describirContexto(state.contexto)
    : (FASE_LABEL[state.phase] ?? state.phase);

  identidad.append(nombreLinea, contextoLinea, estadoLinea);
  encabezado.append(nivelBox, identidad);
  container.appendChild(encabezado);

  // --- Totales de por vida ---
  const totales = document.createElement('div');
  totales.className = 'ficha-totales';
  const partidos = registro.fechasGanadas + registro.fechasPerdidas + registro.mapasGanados + registro.mapasPerdidos;
  totales.textContent = `${registro.splitsJugados} splits · ${partidos} partidos · ${registro.titulos.length} título(s)`;
  container.appendChild(totales);

  // --- Los 6 atributos, con flechas y el destacado en color ---
  container.appendChild(crearStatRow(state, ficha));

  // La etapa amateur muestra otras filas (estudios, confianza, sueño, ranked)
  // — misma estructura, campos distintos (PLAN.md §8.6, punto 7) — y no
  // tiene jerarquía, arraigo, pool ni internacional todavía.
  if (state.phase === 'amateur') {
    const amateurRow = document.createElement('div');
    amateurRow.className = 'ficha-totales';
    amateurRow.textContent = `Estudios ${Math.round(state.player.studies)} · Confianza ${Math.round(state.player.familyTrust)}`
      + ` · Sueño ${Math.round(state.player.sleep)} · `
      + `${modulos.ranked.etiquetaDeRanked(state.player.ranked, modulos.ranked.servidorDeLaPartida(state))}`;
    container.appendChild(amateurRow);
    return;
  }

  // --- Arraigo y jerarquía: dos ejes separados (PARTE 3 de PLAN.md) ---
  container.appendChild(crearBarra({ nombre: 'ARRAIGO', banda: ficha.arraigo, hitos: hitosArraigo() }));
  container.appendChild(crearBarra({ nombre: 'JERARQUÍA', banda: ficha.jerarquia, hitos: hitosJerarquia() }));

  // --- Mentalidad y Hype (fase 9R.2): las barras que el 74% del contenido
  // mueve y hasta acá no se dibujaban. Mentalidad en rojo si está `al límite`
  // — el aviso de burnout que no existía. ---
  const animo = document.createElement('div');
  animo.className = 'ficha-animo' + (ficha.mentalidad.peligro ? ' ficha-animo--peligro' : '');
  for (const [nombre, banda] of [['MENTALIDAD', ficha.mentalidad], ['HYPE', ficha.hype]]) {
    const celda = document.createElement('span');
    celda.className = 'ficha-animo-celda';
    const flecha = banda.delta > 0 ? ' ▲' : banda.delta < 0 ? ' ▼' : '';
    celda.textContent = `${nombre} ${banda.valor} · ${banda.label}${flecha}`;
    animo.appendChild(celda);
  }
  container.appendChild(animo);

  // --- Estado internacional, con nombre en vez de un contador ---
  const internacional = document.createElement('div');
  internacional.className = `ficha-badge ficha-badge--${ficha.estadoInternacional}`;
  internacional.textContent = LABEL_INTERNACIONAL[ficha.estadoInternacional];
  container.appendChild(internacional);

  // --- El pool, con la tier del régimen vigente al lado ---
  if (state.player.championPool?.length > 0) {
    const poolRow = document.createElement('div');
    poolRow.className = 'ficha-pool';
    const tierList = state.meta?.tierList ?? [];
    poolRow.textContent = state.player.championPool.map((campeon) => {
      const tier = tierList.find((entrada) => entrada.name === campeon.name)?.tier;
      return `${campeon.name} ${Math.round(campeon.mastery)}${tier ? ` [${tier}]` : ''}`;
    }).join(' · ');
    container.appendChild(poolRow);
  }

  // --- Ver carrera: el registro por org (imagen 15 de PLAN.md) ---
  if (registro.porOrg.length > 0) {
    const detalle = document.createElement('details');
    detalle.className = 'ficha-historia';
    const resumen = document.createElement('summary');
    resumen.textContent = 'Ver carrera';
    detalle.appendChild(resumen);
    detalle.append(...registro.porOrg.map(filaHistoria));
    container.appendChild(detalle);
  }

  // --- Los momentos que te marcaron (fase 8D): algunas decisiones, no todas ---
  if (registro.momentos.length > 0) {
    const detalleMomentos = document.createElement('details');
    detalleMomentos.className = 'ficha-historia';
    const resumenMomentos = document.createElement('summary');
    resumenMomentos.textContent = `Momentos (${registro.momentos.length})`;
    detalleMomentos.appendChild(resumenMomentos);
    detalleMomentos.append(...[...registro.momentos].reverse().slice(0, 10).map(filaMomento));
    container.appendChild(detalleMomentos);
  }
}
