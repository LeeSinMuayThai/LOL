import { fichaCompleta, bandaDeNivel, bandaDeJerarquia, bandaDeArraigoFicha, bandaDeHype } from '../../core/ficha.js';
import { calcularContexto } from '../../core/contexto.js';
import { desdePuntos, etiquetaDeRanked } from '../../core/ranked.js';
import { valorDeMercado } from '../../core/valorMercado.js';
import { plural } from '../../core/formato.js';
import { titulosDeFila } from '../../core/registro.js';
import { crearBarra, crearInstrumento } from './barra.js';
import { crearStatRow } from './statRow.js';
import { crearOrgChip } from './orgChip.js';
import { crearCampeonTile } from './campeonTile.js';
import { marcaRol } from './iconos.js';
import { countUp } from './countUp.js';
import { BALANCE } from '../../data/balance.js';
import { romano, tierPorId } from '../../data/ranked.js';
import LIGAS from '../../data/leagues.json' with { type: 'json' };

// El nombre visible de una liga (K1: ningún texto muestra su id crudo). Los
// títulos de la fila guardan el nombre con el que los anotó el motor, que en
// las ligas de desarrollo es el id ("LCK_CL").
const NOMBRE_DE_LIGA = Object.fromEntries(LIGAS.map((liga) => [liga.id, liga.nombre]));

// LA TARJETA (fase 8, PLAN.md §8.6): vive en todas las pantallas de carrera.
// Es la respuesta directa a H7 del diagnóstico — "los números que ves no
// tienen referente" — así que ningún número sale acá sin banda, sin flecha,
// o sin comparación (regla de proceso 13).

const LABEL_NIVEL = { prospecto: 'Prospecto', titular: 'Competitivo', elite: 'Élite', clase_mundial: 'Clase mundial' };
const LABEL_INTERNACIONAL = {
  sin_chance: 'Internacional: sin chance',
  en_carpeta: 'Internacional: en carpeta',
  clasificado: 'Clasificado a internacional',
  jugando: 'Jugando el internacional'
};
const FASE_LABEL = { amateur: 'Amateur', profesional: 'Profesional', retirado: 'Retirado' };

// Exportado para el check de ids crudos de `validate.js`: toda marca que `core/contexto.js` puede producir tiene que
// estar acá, o la ficha muestra el id como chip.
export const LABEL_MARCA = {
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
  con_vestuario: 'Con compañeros',
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
  vuelta_del_retiro: 'Vuelta del retiro',
  descenso: 'Descendiste',
  top_mundial: 'Top 20 del mundo',
  mejor_del_mundo: 'Mejor del mundo'
};
const MARCAS_DE_RIESGO = new Set(['deuda_sueno', 'pc_confiscada', 'riesgo_familiar', 'mentalidad_al_limite']);
const MARCAS_VISIBLES = 6;
const POOL_TILES = 8;

// D95 (FASE V, V3e): lo que la ficha recuerda de su render anterior (el valor desde donde arranca el `countUp` y qué
// desplegables dejó abiertos el jugador) es de CADA contenedor, no del módulo: la ficha se pinta en el cuarto Vos y en el
// acompañante, y con un estado compartido el cuarto contaba desde el valor del otro ("18 LP" y "50 LP" con el mismo
// estado). `dueno` es el nodo estable que sobrevive a los renders (el cuerpo del cuarto, el `aside`): el `.ficha-card` se
// rehace entero cada vez. Una carrera nueva (otra `seed`) empieza de cero.
const memoriaDeFicha = new WeakMap();

function memoriaDe(dueno, state) {
  let memoria = memoriaDeFicha.get(dueno);
  if (!memoria || memoria.seed !== state.seed) {
    memoria = { seed: state.seed, nivel: null, lp: null, abiertos: new Map() };
    memoriaDeFicha.set(dueno, memoria);
  }
  return memoria;
}

// Un desplegable que no se cierra solo en cada render (D95): arranca como lo dejó el jugador (o como dice `abierto` si
// nunca lo tocó) y recuerda lo que el jugador hace con un clic en su `summary` (también lo dispara el teclado).
function crearDesplegable(clave, titulo, abierto, memoria) {
  const detalle = document.createElement('details');
  detalle.open = memoria.abiertos.get(clave) ?? abierto;
  const resumen = document.createElement('summary');
  resumen.textContent = titulo;
  resumen.addEventListener('click', () => memoria.abiertos.set(clave, !detalle.open));
  detalle.appendChild(resumen);
  return detalle;
}

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

// La última org no tiene `hastaAnio` (no hubo salida): `anioDeCierre` es el año en que terminó la carrera
// (la tarjeta final lo pasa; la ficha en curso no, y entonces solo se ve el año de llegada, sin guion colgado).
export function filaHistoria(fila, anioDeCierre = null) {
  const item = document.createElement('div');
  item.className = 'ficha-historia-fila';
  item.appendChild(crearOrgChip(fila.org, { size: 16 }));
  const texto = document.createElement('span');
  const hasta = fila.hastaAnio ?? anioDeCierre;
  const rango = hasta && hasta !== fila.desdeAnio ? `${fila.desdeAnio}–${hasta}` : `${fila.desdeAnio}`;
  const titulos = fila.titulos.length > 0
    ? ` · ${fila.titulos.map((t) => `${NOMBRE_DE_LIGA[t.nombre] ?? t.nombre} ${t.anio}`).join(', ')}`
    : '';
  texto.textContent = `${fila.org} — ${fila.splits} ${plural(fila.splits, 'split', 'splits')} · ${fila.fechasG}-${fila.fechasP} · ${rango}${titulos}`;
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

function crearRankedHero(state, modulos, memoria) {
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
  // Sin valor anterior en este contenedor (la primera vez que se pinta) no hay delta que mostrar: sale el valor, sin contar
  // desde 0 (`countUp` toma el `null` como 0).
  num.textContent = String(memoria.lp ?? ranked.lp);
  countUp(num, memoria.lp ?? ranked.lp, ranked.lp);
  lpEl.append(num, document.createTextNode(sufijo));

  const pista = document.createElement('div');
  pista.className = 'ficha-ranked-pista';
  const relleno = document.createElement('div');
  relleno.className = 'ficha-ranked-relleno';
  relleno.style.width = `${pct}%`;
  pista.appendChild(relleno);

  wrap.append(nombre, lpEl, pista);
  memoria.lp = ranked.lp;
  return wrap;
}

// La línea de contexto de la ficha (org · liga · fecha · edad), con el nombre visible de la liga ("LCK CL", no
// "LCK_CL"). Pura: la usa el check de ids crudos de `validate.js`.
export function lineaDeContextoFicha(state) {
  const org = state.career.currentOrg ? `${state.career.currentOrg} · ` : '';
  // Tier 3 no es una liga (`career.liga` es null a propósito): el respaldo a `ligaOrigen` mostraba la liga de tier 1 de la
  // región ("Prisma Academy · LEC") sobre "RECIÉN LLEGADO A UN EQUIPO DE TIER 3" (regla 15). Ahí se nombra el circuito.
  if (state.career.tier === 3 && !state.career.liga) {
    return `${org}Tier 3 · ${state.mundo.regionOrigen} · ${state.calendario.etiqueta} · ${state.age} años`;
  }
  const liga = nombreDeLaLiga(state);
  return `${org}${liga} · ${state.calendario.etiqueta} · ${state.age} años`;
}

// La liga de la ficha con su nombre visible ("LCK CL", no "LCK_CL"): la del contrato, o la de origen si no hay.
function nombreDeLaLiga(state) {
  const ligaId = state.mundo.ligas?.find((l) => l.id === state.career.liga)?.id ?? state.mundo.ligaOrigen;
  return NOMBRE_DE_LIGA[ligaId] ?? ligaId;
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

function crearPoolTiles(state, modulos) {
  const pool = state.player.championPool ?? [];
  if (pool.length === 0) return null;
  const row = document.createElement('div');
  row.className = 'ficha-pool-tiles';
  const tierList = state.meta?.tierList ?? [];
  const mostrar = pool.slice(0, POOL_TILES);
  for (const campeon of mostrar) {
    const tier = tierList.find((entrada) => entrada.name === campeon.name)?.tier ?? null;
    // Medido contra la próxima corrida real de `campeones`, no contra `splitCount`
    // a secas: durante una pausa del split va desfasado en 1 (J3).
    const pronostico = modulos.pipeline.pronosticoDeOxidoEnVivo(state, campeon);
    row.appendChild(crearCampeonTile(campeon, { tier, size: 'ficha', pronostico }));
  }
  if (pool.length > POOL_TILES) {
    const mas = document.createElement('span');
    mas.className = 'ficha-pool-mas';
    mas.textContent = `+${pool.length - POOL_TILES}`;
    row.appendChild(mas);
  }
  return row;
}

function envolverMas(siempre, extra, memoria) {
  const frag = document.createDocumentFragment();
  for (const n of siempre) if (n) frag.appendChild(n);
  const extras = extra.filter(Boolean);
  if (extras.length === 0) return frag;
  const mas = crearDesplegable('mas', 'Más datos', window.matchMedia?.('(min-width: 900px)').matches ?? true, memoria);
  mas.className = 'ficha-mas';
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
  if (!ficha.estadoInternacional) return null;
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

function crearDetalleHistoria(registro, memoria) {
  if (registro.porOrg.length === 0) return null;
  const detalle = crearDesplegable('carrera', 'Ver carrera', false, memoria);
  detalle.className = 'ficha-historia';
  detalle.append(...registro.porOrg.map((fila) => filaHistoria({ ...fila, titulos: titulosDeFila(fila, registro) })));
  return detalle;
}

// K3-B: lo que tus decisiones le dejaron a las curvas de edad. Sin marcas visibles no hay sección.
function crearDetalleConstruido(construido, memoria) {
  if (construido.length === 0) return null;
  const detalle = crearDesplegable('construido', 'Lo que construiste', true, memoria);
  detalle.className = 'ficha-historia';
  detalle.append(...construido.map((marca) => {
    const item = document.createElement('div');
    item.className = 'ficha-historia-fila';
    item.textContent = marca.texto;
    return item;
  }));
  return detalle;
}

function crearDetalleMomentos(registro, memoria) {
  if (registro.momentos.length === 0) return null;
  const detalleMomentos = crearDesplegable('momentos', `Momentos (${registro.momentos.length})`, false, memoria);
  detalleMomentos.className = 'ficha-historia';
  detalleMomentos.append(...[...registro.momentos].reverse().slice(0, 10).map(filaMomento));
  return detalleMomentos;
}

// D91 (FASE V, V3e): la etiqueta de la situación ("Probándote en tier 3") y las marcas salían de `state.contexto`, que el
// motor calcula UNA vez al abrir el split (`systems/contexto.js`, el primero de la lista): si ascendés a tier 2 en ese split,
// la ficha seguía diciendo "tier 3" hasta el split siguiente (regla 15). Se recalcula acá, sobre el estado de hoy, con la
// misma función pura del motor (`calcularContexto`): no escribe nada y no toca el `rng`. Sin `state.contexto` (todavía no
// corrió ningún split) no hay situación que decir.
export function contextoDeLaFicha(state) {
  if (!state.contexto) return null;
  try {
    return calcularContexto(state);
  } catch (error) {
    console.error('No se pudo recalcular el contexto de la ficha:', error);
    return state.contexto;
  }
}

function crearNivelBox(numero, banda, etiqueta, memoria = null) {
  const nivelBox = document.createElement('div');
  nivelBox.className = `ficha-nivel ficha-nivel--${banda}`;
  const nivelNum = document.createElement('div');
  nivelNum.className = 'ficha-nivel-numero';
  if (memoria) {
    nivelNum.textContent = String(memoria.nivel ?? numero);
    countUp(nivelNum, memoria.nivel ?? numero, numero);
    memoria.nivel = numero;
  } else {
    nivelNum.textContent = String(numero);
  }
  const nivelLabel = document.createElement('div');
  nivelLabel.className = 'ficha-nivel-label';
  nivelLabel.textContent = etiqueta;
  nivelBox.append(nivelNum, nivelLabel);
  return nivelBox;
}

function crearNombreLinea(state, modulos) {
  const nombreLinea = document.createElement('div');
  nombreLinea.className = 'ficha-nombre-linea';
  nombreLinea.append(marcaRol(state.player.role));
  const nombreTxt = document.createElement('span');
  nombreTxt.textContent = `${state.player.name} · ${modulos.etiquetaRol(state.player.role)}`;
  nombreLinea.appendChild(nombreTxt);
  return nombreLinea;
}

function crearTotales(registro) {
  const totales = document.createElement('div');
  totales.className = 'ficha-totales';
  const partidos = registro.fechasGanadas + registro.fechasPerdidas + registro.mapasGanados + registro.mapasPerdidos;
  totales.textContent = `${registro.splitsJugados} ${plural(registro.splitsJugados, 'split', 'splits')} · ${partidos} ${plural(partidos, 'partido', 'partidos')} · ${registro.titulos.length} ${plural(registro.titulos.length, 'título', 'títulos')}`;
  return totales;
}

// La ficha entera, la del cuarto Vos. `dueno`: el nodo estable que guarda la memoria de la ficha (por defecto, el propio
// contenedor; el cuarto pasa su cuerpo, que sobrevive a cada apertura).
export function renderFicha(container, state, modulos, { dueno = container } = {}) {
  const ficha = fichaCompleta(state);
  const registro = state.career.registro;
  const enHitoMaximo = ficha.jerarquia.esMaxima || ficha.arraigo.esMaxima;
  const contexto = contextoDeLaFicha(state);
  const marcas = contexto?.marcas ?? [];
  const memoria = memoriaDe(dueno, state);

  container.replaceChildren();
  container.className = 'ficha-card' + (enHitoMaximo ? ' ficha-card--dorada' : '');

  const encabezado = document.createElement('div');
  encabezado.className = 'ficha-encabezado';

  const nivelBox = crearNivelBox(ficha.nivel, ficha.bandaNivel, LABEL_NIVEL[ficha.bandaNivel], memoria);

  const identidad = document.createElement('div');
  identidad.className = 'ficha-identidad';

  const nombreLinea = crearNombreLinea(state, modulos);

  const contextoLinea = document.createElement('div');
  contextoLinea.className = 'ficha-contexto-linea';
  contextoLinea.textContent = lineaDeContextoFicha(state);

  const estadoLinea = document.createElement('div');
  estadoLinea.className = 'ficha-estado-linea';
  estadoLinea.textContent = contexto
    ? modulos.describirContexto(contexto)
    : (FASE_LABEL[state.phase] ?? state.phase);

  // K4-C: tu perfil en una palabra (el que hoy resuelve lo chico; las bifurcaciones lo van corriendo).
  if (state.player.perfil) {
    const perfil = document.createElement('span');
    perfil.className = 'ficha-perfil';
    perfil.textContent = modulos.nombreDePerfil?.(state.player.perfil.actual) ?? '';
    perfil.title = 'Tu perfil: decide por vos los eventos que no son bifurcación';
    nombreLinea.appendChild(perfil);
  }

  identidad.append(nombreLinea, contextoLinea, estadoLinea);
  encabezado.append(nivelBox, identidad);
  container.appendChild(encabezado);

  if (state.phase === 'amateur') {
    const a = BALANCE.amateur;
    container.appendChild(envolverMas(
      [
        crearRankedHero(state, modulos, memoria),
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
      ],
      memoria
    ));
    return ficha;
  }

  const mentalidad = crearBarra({
    // K3: la barra se lee como consistencia (con la cabeza bien jugás a tu nivel); el id interno sigue siendo mentalidad.
    nombre: 'CONSISTENCIA',
    banda: ficha.mentalidad,
    tono: ficha.mentalidad.peligro ? 'peligro' : null
  });

  container.appendChild(envolverMas(
    [mentalidad],
    [
      crearTotales(registro),
      crearStatRow(state, ficha),
      marcas.length > 0 ? crearMarcas(marcas) : null,
      crearBarra({ nombre: 'ARRAIGO', banda: ficha.arraigo, hitos: hitosArraigo() }),
      crearBarra({ nombre: 'JERARQUÍA', banda: ficha.jerarquia, hitos: hitosJerarquia() }),
      crearBarra({ nombre: 'HYPE', banda: ficha.hype }),
      crearContratoFranja(state, modulos),
      crearBadgeInternacional(ficha),
      crearBadgeDuelo(ficha),
      crearPoolTiles(state, modulos),
      crearDetalleConstruido(ficha.construido, memoria),
      crearDetalleHistoria(registro, memoria),
      crearDetalleMomentos(registro, memoria)
    ],
    memoria
  ));
  return ficha;
}

// El club y la liga en una línea (sin la fecha ni la edad: la franja de arriba ya las dice).
function lineaDeClub(state) {
  const org = state.career.currentOrg ?? null;
  if (state.career.tier === 3 && !state.career.liga) {
    return [org, `Tier 3 · ${state.mundo.regionOrigen}`].filter(Boolean).join(' · ');
  }
  const liga = nombreDeLaLiga(state);
  return [org, liga].filter(Boolean).join(' · ');
}

// La ficha del acompañante (§V.4 "amateur → Vos (rango + barras)"; "con club → Vos"): solo lo que sirve para decidir.
//  - Amateur: el rango y las barras que el amateur cuida (estudios, confianza, sueño). Nada más: la ficha entera, con sus
//    seis atributos, vive en el cuarto Vos.
//  - Con club: el nivel con su banda, el rol, el club y el contrato.
export function renderFichaCompacta(container, state, modulos, { dueno = container } = {}) {
  const memoria = memoriaDe(dueno, state);
  const marcas = contextoDeLaFicha(state)?.marcas ?? [];
  container.replaceChildren();
  container.className = 'ficha-card ficha-card--compacta';

  if (state.phase === 'amateur') {
    const a = BALANCE.amateur;
    container.append(
      crearNombreLinea(state, modulos),
      crearRankedHero(state, modulos, memoria),
      crearInstrumento({ nombre: 'ESTUDIOS', valor: state.player.studies, tono: tonoDeEstudio(state.player.studies, a) }),
      crearInstrumento({ nombre: 'CONFIANZA', valor: state.player.familyTrust, tono: marcas.includes('riesgo_familiar') ? 'danger' : null }),
      crearInstrumento({ nombre: 'SUEÑO', valor: state.player.sleep, tono: marcas.includes('deuda_sueno') ? 'danger' : null })
    );
    return container;
  }

  const ficha = fichaCompleta(state);
  const encabezado = document.createElement('div');
  encabezado.className = 'ficha-encabezado';
  const identidad = document.createElement('div');
  identidad.className = 'ficha-identidad';
  const club = document.createElement('div');
  club.className = 'ficha-contexto-linea';
  club.textContent = lineaDeClub(state);
  identidad.append(crearNombreLinea(state, modulos), club);
  encabezado.append(crearNivelBox(ficha.nivel, ficha.bandaNivel, LABEL_NIVEL[ficha.bandaNivel], memoria), identidad);
  container.append(encabezado);
  const contrato = crearContratoFranja(state, modulos);
  if (contrato) container.append(contrato);
  return container;
}

// D90 (FASE V, V3e): en la pieza final, el cuarto Vos muestra los PICOS de la carrera, no la foto del retiro. Después de
// muchos splits sin equipo las curvas bajan (`BALANCE.perdidaPorSplit`) y la ficha del retiro llegó a mostrar macro,
// shotcalling y adaptabilidad en 0. Los picos son los máximos que dejó el registro (`registro.picos`): solo salen los que
// alguna vez se movieron, cada uno con su referente (la banda o la edad). Pura salvo por `modulos` (formato y ranked).
export function picosDeLaCarrera(state, modulos) {
  const picos = state.career.registro.picos;
  const filas = [];
  if (picos.nivel > 0) {
    const edad = picos.edadDelPicoDeNivel > 0 ? ` · a los ${picos.edadDelPicoDeNivel} años` : '';
    filas.push(['Nivel máximo', String(Math.round(picos.nivel)), `${LABEL_NIVEL[bandaDeNivel(picos.nivel)]}${edad}`]);
  }
  if (picos.rankMundial > 0) {
    filas.push(['Mejor puesto del mundo', `#${picos.rankMundial}`, null]);
  }
  if (picos.jerarquia > 0) {
    const banda = bandaDeJerarquia({ career: { jerarquia: picos.jerarquia } });
    filas.push(['Jerarquía máxima', `${Math.round(picos.jerarquia)}/100`, banda.label]);
  }
  if (picos.arraigo > 0) {
    filas.push(['Arraigo máximo', `${Math.round(picos.arraigo)}/100`, bandaDeArraigoFicha(picos.arraigo).label]);
  }
  if (picos.hype > 0) {
    const banda = bandaDeHype({ player: { stats: { hype: picos.hype } }, flags: {} });
    filas.push(['Hype máximo', `${Math.round(picos.hype)}/100`, banda.label]);
  }
  if (picos.valorMercadoUSD > 0) {
    filas.push(['Valor de mercado más alto', `${modulos.formato.plata(picos.valorMercadoUSD)}/año`, null]);
  }
  if (picos.salarioAnualUSD > 0) {
    filas.push(['Sueldo más alto', `${modulos.formato.plata(picos.salarioAnualUSD)}/año`, null]);
  }
  if (picos.rankedPuntos > 0 && state.player.ranked?.servidor) {
    const servidor = modulos.ranked.servidorDeLaPartida(state);
    filas.push(['Mejor rango en ranked', etiquetaDeRanked(desdePuntos(picos.rankedPuntos, servidor), null), null]);
  }
  return filas;
}

function filaDePico([rotulo, valor, referente]) {
  const fila = document.createElement('div');
  fila.className = 'ficha-pico';
  const rotuloEl = document.createElement('span');
  rotuloEl.className = 'ficha-pico-rotulo';
  rotuloEl.textContent = rotulo;
  const valorEl = document.createElement('span');
  valorEl.className = 'ficha-pico-valor';
  valorEl.textContent = valor;
  fila.append(rotuloEl, valorEl);
  if (referente) {
    const ref = document.createElement('span');
    ref.className = 'ficha-pico-referente';
    ref.textContent = referente;
    fila.appendChild(ref);
  }
  return fila;
}

export function renderFichaFinal(container, state, modulos) {
  container.replaceChildren();
  container.className = 'ficha-card ficha-card--picos';

  const registro = state.career.registro;
  const picos = registro.picos;
  const encabezado = document.createElement('div');
  encabezado.className = 'ficha-encabezado';
  const identidad = document.createElement('div');
  identidad.className = 'ficha-identidad';
  const rotulo = document.createElement('div');
  rotulo.className = 'ficha-estado-linea';
  rotulo.textContent = 'Los picos de tu carrera';
  identidad.append(crearNombreLinea(state, modulos), rotulo);
  if (picos.nivel > 0) {
    encabezado.append(crearNivelBox(Math.round(picos.nivel), bandaDeNivel(picos.nivel), 'Pico'));
  }
  encabezado.appendChild(identidad);
  container.append(encabezado, crearTotales(registro));

  const lista = document.createElement('div');
  lista.className = 'ficha-picos';
  lista.append(...picosDeLaCarrera(state, modulos).map(filaDePico));
  container.appendChild(lista);
  return container;
}
