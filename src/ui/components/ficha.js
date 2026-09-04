import { fichaCompleta } from '../../core/ficha.js';
import { valorDeMercado } from '../../core/valorMercado.js';
import { crearBarra } from './barra.js';
import { crearStatRow } from './statRow.js';
import { BALANCE } from '../../data/balance.js';
import { actualizarTopbar } from '../shell.js';

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

// `data/contextos.js` declara los ids de `MARCAS` para que `validate.js`
// pueda detectar una marca inventada en un JSON — no trae etiqueta de
// display, porque hasta T2 nada las mostraba. Las 5 útlimas ('pendiente')
// las activan pasos que todavía no existen: quedan acá para el día que
// aparezcan, hoy nunca las emite `calcularContexto`.
const LABEL_MARCA = {
  deuda_sueno: 'Deuda de sueño',
  pc_confiscada: 'PC confiscada',
  riesgo_familiar: 'Riesgo familiar',
  en_el_radar: 'En el radar',
  nocturno: 'Nocturno',
  negociacion_ganada: 'Negociación ganada',
  sin_secundario: 'Sin secundario',
  secundario_terminado: 'Secundario terminado',
  signature: 'Tiene signature',
  mentalidad_al_limite: 'Mentalidad al límite',
  con_vestuario: 'Con vestuario',
  pool_angosto: 'Pool angosto',
  pool_ancho: 'Pool ancho',
  pool_en_meta: 'Pool en meta',
  pool_fuera_meta: 'Pool fuera de meta',
  main_muerto: 'Main fuera de meta',
  campeon_nuevo: 'Campeón nuevo en el pool',
  es_campeon: 'Campeón',
  multicampeon: 'Multicampeón',
  paso_por_tier3: 'Pasó por tier 3',
  curtido: 'Curtido',
  nomade: 'Nómade',
  espera_edad_minima: 'Espera edad mínima',
  lesion_cronica: 'Lesión crónica',
  servicio_militar: 'Servicio militar',
  ventana_de_vuelta: 'Ventana de vuelta',
  vuelta_del_retiro: 'Vuelta del retiro'
};
const MARCAS_DE_RIESGO = new Set(['deuda_sueno', 'pc_confiscada', 'riesgo_familiar', 'mentalidad_al_limite']);

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

  // El topbar no tiene forma de leer `state` por su cuenta (T1/T2, ver
  // PLAN.md): se actualiza acá, en el único lugar que ya corre en cada tick.
  actualizarTopbar(state);

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

  // --- Marcas de contexto, como chips (fase T2) -------------------------
  // `contexto.marcas` se calcula cada split y hasta acá no se veía en
  // ningún lado. Universal a las dos fases: 'riesgo_familiar'/'deuda_sueno'
  // son de la etapa amateur, 'nomade'/'multicampeon' de la profesional.
  const marcas = state.contexto?.marcas ?? [];
  if (marcas.length > 0) {
    const marcasRow = document.createElement('div');
    marcasRow.className = 'ficha-marcas';
    for (const id of marcas) {
      const chip = document.createElement('span');
      chip.className = 'ficha-marca' + (MARCAS_DE_RIESGO.has(id) ? ' ficha-marca--peligro' : '');
      chip.textContent = LABEL_MARCA[id] ?? id;
      marcasRow.appendChild(chip);
    }
    container.appendChild(marcasRow);
  }

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

  // --- Contrato y valor de mercado (fase T2) -----------------------------
  // `career.contrato` existe desde la fase 9 y nunca se dibujó: el jugador
  // no tenía forma de ver con quién firmó, por cuánto, ni por cuántos años
  // más. `contrato.org` es `null` hasta la primera firma (trampa T4: el
  // objeto siempre existe, pero no hay nada real que mostrar todavía).
  const contrato = state.career.contrato;
  if (contrato.org) {
    const contratoBox = document.createElement('div');
    contratoBox.className = 'ficha-contrato';
    const label = document.createElement('div');
    label.className = 'ficha-contrato-label';
    label.textContent = 'Contrato';
    const linea = document.createElement('div');
    linea.className = 'ficha-contrato-linea';
    const restantes = contrato.aniosRestantes === 1 ? '1 año restante' : `${contrato.aniosRestantes} años restantes`;
    const salarioSpan = document.createElement('span');
    salarioSpan.className = 'ficha-contrato-salario';
    salarioSpan.textContent = `${modulos.formato.plata(contrato.salarioAnualUSD)}/año`;
    linea.append(`${contrato.org} · ${contrato.liga ?? ''} · `, salarioSpan, ` · ${restantes}`);
    contratoBox.append(label, linea);
    container.appendChild(contratoBox);
  }

  // Distinto del sueldo: lo que el mejor postor de tu propia liga pagaría
  // HOY. `0` fuera de una liga real (tier 3 o sin equipo) — ahí no hay
  // mercado que te tase todavía, así que no se dibuja nada.
  const valor = valorDeMercado(state);
  if (valor > 0) {
    const bajoSueldo = contrato.org && valor > contrato.salarioAnualUSD * 1.15;
    const valorBox = document.createElement('div');
    valorBox.className = 'ficha-valor-mercado' + (bajoSueldo ? ' ficha-valor-mercado--bajo-sueldo' : '');
    const label = document.createElement('div');
    label.className = 'ficha-valor-mercado-label';
    label.textContent = 'Valor de mercado';
    const cifra = document.createElement('div');
    cifra.className = 'ficha-valor-mercado-cifra';
    cifra.textContent = `${modulos.formato.plata(valor)}/año`;
    valorBox.append(label, cifra);
    container.appendChild(valorBox);
  }

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
