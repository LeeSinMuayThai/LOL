import { fichaCompleta } from '../../core/ficha.js';
import { valorDeMercado } from '../../core/valorMercado.js';
import { crearBarra, crearInstrumento } from './barra.js';
import { crearStatRow } from './statRow.js';
import { crearOrgChip } from './orgChip.js';
import { crearCampeonTile } from './campeonTile.js';
import { marcaRol } from './iconos.js';
import { countUp } from './countUp.js';
import { BALANCE } from '../../data/balance.js';
import { romano, tierPorId } from '../../data/ranked.js';
import { actualizarTopbar, aplicarEstudio } from '../shell.js';

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
const MARCAS_VISIBLES = 6;
const POOL_TILES = 8;

let fichaPrevia = { seed: null, nivel: null, lp: null };

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

export function filaHistoria(fila) {
  const item = document.createElement('div');
  item.className = 'ficha-historia-fila';
  item.appendChild(crearOrgChip(fila.org, { size: 16 }));
  const texto = document.createElement('span');
  const rango = fila.hastaAnio ? `${fila.desdeAnio}–${fila.hastaAnio}` : `${fila.desdeAnio}–`;
  const titulos = fila.titulos.length > 0
    ? ` · ${fila.titulos.map((t) => `${t.nombre} ${t.anio}`).join(', ')}`
    : '';
  texto.textContent = `${fila.org} — ${fila.splits} splits · ${fila.fechasG}-${fila.fechasP} · ${rango}${titulos}`;
  item.appendChild(texto);
  return item;
}

export function filaMomento(momento) {
  const item = document.createElement('div');
  item.className = 'ficha-historia-fila';
  const lugar = momento.org ? ` · ${momento.org}` : '';
  item.textContent = `${momento.anio} (${momento.edad} años)${lugar} — ${momento.texto}`;
  return item;
}

function tonoDeEstudio(valor, a) {
  if (valor < a.confiscacionUmbral) return 'danger';
  if (valor < a.avisoUmbral) return 'warn';
  return null;
}

function crearRankedHero(state, modulos) {
  const ranked = state.player.ranked;
  const servidor = modulos.ranked.servidorDeLaPartida(state);
  const tier = tierPorId(ranked.tier);
  const wrap = document.createElement('div');
  wrap.className = `ficha-ranked ficha-ranked--${ranked.tier ?? 'iron'}`;

  const nombre = document.createElement('div');
  nombre.className = 'ficha-ranked-nombre';
  nombre.textContent = !tier
    ? 'Sin rango'
    : (tier.apice ? tier.label : `${tier.label} ${romano(ranked.division)}`);

  let pct = 0;
  let sufijo = ' LP';
  if (!tier) {
    pct = 0;
  } else if (!tier.apice) {
    pct = ranked.lp;
  } else if (ranked.tier === 'challenger') {
    pct = 100;
    const puesto = modulos.ranked.rangoAproximado(ranked, servidor);
    if (puesto) sufijo = ` LP · #${puesto} de ${servidor.label}`;
  } else if (ranked.tier === 'grandmaster') {
    const span = Math.max(1, servidor.cutoffChallenger - servidor.cutoffGM);
    pct = Math.max(0, Math.min(100, ((ranked.lp - servidor.cutoffGM) / span) * 100));
  } else {
    pct = Math.max(0, Math.min(100, (ranked.lp / Math.max(1, servidor.cutoffGM)) * 100));
  }

  const lpEl = document.createElement('div');
  lpEl.className = 'ficha-ranked-lp';
  const num = document.createElement('span');
  num.className = 'num';
  countUp(num, fichaPrevia.lp, ranked.lp);
  lpEl.append(num, document.createTextNode(sufijo));

  const pista = document.createElement('div');
  pista.className = 'ficha-ranked-pista';
  const relleno = document.createElement('div');
  relleno.className = 'ficha-ranked-relleno';
  relleno.style.width = `${pct}%`;
  pista.appendChild(relleno);

  wrap.append(nombre, lpEl, pista);
  fichaPrevia.lp = ranked.lp;
  return wrap;
}

function crearMarcas(marcas) {
  const ordenadas = [...marcas].sort((a, b) => Number(MARCAS_DE_RIESGO.has(b)) - Number(MARCAS_DE_RIESGO.has(a)));
  const visibles = ordenadas.slice(0, MARCAS_VISIBLES);
  const resto = ordenadas.slice(MARCAS_VISIBLES);
  const row = document.createElement('div');
  row.className = 'ficha-marcas';
  for (const id of visibles) {
    const chip = document.createElement('span');
    chip.className = 'ficha-marca' + (MARCAS_DE_RIESGO.has(id) ? ' ficha-marca--peligro' : '');
    chip.textContent = LABEL_MARCA[id] ?? id;
    row.appendChild(chip);
  }
  if (resto.length > 0) {
    const mas = document.createElement('span');
    mas.className = 'ficha-marca';
    mas.textContent = `+${resto.length}`;
    mas.title = resto.map((id) => LABEL_MARCA[id] ?? id).join(' · ');
    row.appendChild(mas);
  }
  return row;
}

function crearPoolTiles(state) {
  const pool = state.player.championPool ?? [];
  if (pool.length === 0) return null;
  const row = document.createElement('div');
  row.className = 'ficha-pool-tiles';
  const tierList = state.meta?.tierList ?? [];
  const mostrar = pool.slice(0, POOL_TILES);
  for (const campeon of mostrar) {
    const tier = tierList.find((entrada) => entrada.name === campeon.name)?.tier ?? null;
    row.appendChild(crearCampeonTile(campeon, { tier, size: 'ficha' }));
  }
  if (pool.length > POOL_TILES) {
    const mas = document.createElement('span');
    mas.className = 'ficha-pool-mas';
    mas.textContent = `+${pool.length - POOL_TILES}`;
    row.appendChild(mas);
  }
  return row;
}

function envolverMas(siempre, extra) {
  const frag = document.createDocumentFragment();
  for (const n of siempre) if (n) frag.appendChild(n);
  const extras = extra.filter(Boolean);
  if (extras.length === 0) return frag;
  const mas = document.createElement('details');
  mas.className = 'ficha-mas';
  mas.open = window.matchMedia?.('(min-width: 900px)').matches ?? true;
  const sum = document.createElement('summary');
  sum.textContent = 'Más datos';
  mas.appendChild(sum);
  for (const n of extras) mas.appendChild(n);
  frag.appendChild(mas);
  return frag;
}

function crearContratoFranja(state, modulos) {
  const contrato = state.career.contrato;
  const valor = valorDeMercado(state);
  if (!contrato.org && valor <= 0) return null;

  const franja = document.createElement('div');
  franja.className = 'ficha-contrato-franja';
  if (contrato.org) franja.appendChild(crearOrgChip(contrato.org, { size: 28 }));

  const datos = document.createElement('div');
  datos.className = 'ficha-contrato-datos';
  if (contrato.org) {
    const label = document.createElement('div');
    label.className = 'ficha-contrato-label';
    label.textContent = 'Contrato';
    const linea = document.createElement('div');
    linea.className = 'ficha-contrato-linea';
    const restantes = contrato.aniosRestantes === 1 ? '1 año restante' : `${contrato.aniosRestantes} años restantes`;
    const salarioSpan = document.createElement('span');
    salarioSpan.className = 'ficha-contrato-salario';
    salarioSpan.textContent = `${modulos.formato.plata(contrato.salarioAnualUSD)}/año`;
    linea.append(salarioSpan, ` · ${restantes}`);
    datos.append(label, linea);
  }
  if (valor > 0) {
    const bajoSueldo = contrato.org && valor > contrato.salarioAnualUSD * 1.15;
    const cifra = document.createElement('span');
    cifra.className = 'ficha-valor-mercado-cifra' + (bajoSueldo ? ' ficha-valor-mercado--bajo-sueldo' : '');
    cifra.textContent = `valor ${modulos.formato.plata(valor)}/año`;
    datos.appendChild(cifra);
  }
  franja.appendChild(datos);
  return franja;
}

function crearBadgeInternacional(ficha) {
  const internacional = document.createElement('div');
  internacional.className = `ficha-badge ficha-badge--${ficha.estadoInternacional}`;
  internacional.textContent = LABEL_INTERNACIONAL[ficha.estadoInternacional];
  return internacional;
}

// El duelo contra el archirrival (fase 11, §11.2): "el contador de la ficha"
// — uno de los tres únicos lugares donde el duelo aparece. `ficha.duelo`
// existe desde la fase 9Wb pero nunca se había dibujado en ninguna pantalla.
function crearBadgeDuelo(ficha) {
  if (!ficha.duelo) return null;
  const { handle, org, tuyos, suyos, vasGanando } = ficha.duelo;
  const badge = document.createElement('div');
  badge.className = `ficha-badge ficha-badge--duelo-${vasGanando ? 'ganando' : 'perdiendo'}`;
  badge.textContent = `${tuyos}-${suyos} vs ${handle}${org ? ` (${org})` : ''}`;
  return badge;
}

function crearDetalleHistoria(registro) {
  if (registro.porOrg.length === 0) return null;
  const detalle = document.createElement('details');
  detalle.className = 'ficha-historia';
  const resumen = document.createElement('summary');
  resumen.textContent = 'Ver carrera';
  detalle.appendChild(resumen);
  detalle.append(...registro.porOrg.map(filaHistoria));
  return detalle;
}

function crearDetalleMomentos(registro) {
  if (registro.momentos.length === 0) return null;
  const detalleMomentos = document.createElement('details');
  detalleMomentos.className = 'ficha-historia';
  const resumenMomentos = document.createElement('summary');
  resumenMomentos.textContent = `Momentos (${registro.momentos.length})`;
  detalleMomentos.appendChild(resumenMomentos);
  detalleMomentos.append(...[...registro.momentos].reverse().slice(0, 10).map(filaMomento));
  return detalleMomentos;
}

export function renderFicha(container, state, modulos) {
  const ficha = fichaCompleta(state);
  const registro = state.career.registro;
  const enHitoMaximo = ficha.jerarquia.esMaxima || ficha.arraigo.esMaxima;
  const marcas = state.contexto?.marcas ?? [];

  if (fichaPrevia.seed !== state.seed) {
    fichaPrevia = { seed: state.seed, nivel: null, lp: null };
  }

  actualizarTopbar(state);
  aplicarEstudio(state, ficha);

  container.replaceChildren();
  container.className = 'ficha-card' + (enHitoMaximo ? ' ficha-card--dorada' : '');

  const encabezado = document.createElement('div');
  encabezado.className = 'ficha-encabezado';

  const nivelBox = document.createElement('div');
  nivelBox.className = `ficha-nivel ficha-nivel--${ficha.bandaNivel}`;
  const nivelNum = document.createElement('div');
  nivelNum.className = 'ficha-nivel-numero';
  countUp(nivelNum, fichaPrevia.nivel, ficha.nivel);
  fichaPrevia.nivel = ficha.nivel;
  const nivelLabel = document.createElement('div');
  nivelLabel.className = 'ficha-nivel-label';
  nivelLabel.textContent = LABEL_NIVEL[ficha.bandaNivel];
  nivelBox.append(nivelNum, nivelLabel);

  const identidad = document.createElement('div');
  identidad.className = 'ficha-identidad';

  const nombreLinea = document.createElement('div');
  nombreLinea.className = 'ficha-nombre-linea';
  nombreLinea.append(marcaRol(state.player.role));
  const nombreTxt = document.createElement('span');
  nombreTxt.textContent = `${state.player.name} · ${modulos.etiquetaRol(state.player.role)}`;
  nombreLinea.appendChild(nombreTxt);

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

  if (state.phase === 'amateur') {
    const a = BALANCE.amateur;
    container.appendChild(envolverMas(
      [
        crearRankedHero(state, modulos),
        crearInstrumento({
          nombre: 'ESTUDIOS',
          valor: state.player.studies,
          tono: tonoDeEstudio(state.player.studies, a)
        })
      ],
      [
        crearInstrumento({
          nombre: 'CONFIANZA',
          valor: state.player.familyTrust,
          tono: marcas.includes('riesgo_familiar') ? 'danger' : null
        }),
        crearInstrumento({
          nombre: 'SUEÑO',
          valor: state.player.sleep,
          tono: marcas.includes('deuda_sueno') ? 'danger' : null
        }),
        crearStatRow(state, ficha),
        marcas.length > 0 ? crearMarcas(marcas) : null
      ]
    ));
    return;
  }

  const totales = document.createElement('div');
  totales.className = 'ficha-totales';
  const partidos = registro.fechasGanadas + registro.fechasPerdidas + registro.mapasGanados + registro.mapasPerdidos;
  totales.textContent = `${registro.splitsJugados} splits · ${partidos} partidos · ${registro.titulos.length} título(s)`;

  const mentalidad = crearBarra({
    nombre: 'MENTALIDAD',
    banda: ficha.mentalidad,
    tono: ficha.mentalidad.peligro ? 'peligro' : null
  });

  container.appendChild(envolverMas(
    [mentalidad],
    [
      totales,
      crearStatRow(state, ficha),
      marcas.length > 0 ? crearMarcas(marcas) : null,
      crearBarra({ nombre: 'ARRAIGO', banda: ficha.arraigo, hitos: hitosArraigo() }),
      crearBarra({ nombre: 'JERARQUÍA', banda: ficha.jerarquia, hitos: hitosJerarquia() }),
      crearBarra({ nombre: 'HYPE', banda: ficha.hype }),
      crearContratoFranja(state, modulos),
      crearBadgeInternacional(ficha),
      crearBadgeDuelo(ficha),
      crearPoolTiles(state),
      crearDetalleHistoria(registro),
      crearDetalleMomentos(registro)
    ]
  ));
}
