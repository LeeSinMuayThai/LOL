// El fichaje (PLANUI §2, compuerta 2 del mercado, pasos c y d; U2b punto 2). Después de la firma sobre el contrato:
//   c. TU LÍNEA CAE SOBRE EL MAPA: la Grieta con sus cinco líneas (el `plantel` de la vitrina) con el escudo de la org de
//      marca en el piso, que cae desde arriba (sobre el papel firmado del mercado, si lo hay: PLANUI §0.6 punto 1). El glifo de tu rol cae desde arriba a tu lugar, toca con un golpe y aparecen tus compañeros: los
//      de verdad si el motor ya los trajo al firmar (`career.companeros`), y si no "por anunciar" (D102);
//   d. LA FIRMA (el walkout de la vitrina, `crearFirmaLinea` con op=linea): el mapa se achica y viaja al lugar del
//      escudo de la org (FLIP), su escudo se funde en el logo y ahí cae el golpe, con el haz; tu handle gigante con la firma trazada, la bienvenida y los términos como placas. A la
//      derecha, en lugar de un campeón, el jersey de la org de espaldas con tu handle y tu número, que ELEGÍS (1-99). El
//      número es cosmético: vive en el marcador de la vista (`almacenamiento.js`), nunca en el state; la próxima firma
//      lo propone de nuevo.
// Una capa a pantalla completa sobre el shell (los cuartos la tapan y la pausan). Un solo reloj de beats para c y d:
// Espacio (o Enter, o un clic) va al cuadro final, con el número esperando; INST arranca ahí. Con movimiento reducido
// (PLANUI §0.3) son dos cuadros fijos, cada uno con su fundido corto: el mapa con tu línea, con su tiempo de lectura
// (Espacio, Enter o un clic adelantan), y la bienvenida. Enter o "Seguir" cierran: recién ahí sigue el relato.
//
// Lo que se cuenta sale del estado de antes y de después de la respuesta (`fichajeDe`), nunca de la prosa del motor; el
// renglón del motor ("Firmás con…") va tal cual, abajo.
import { el, svg, animar, celular, quieto, EXPO } from '../fx/util.js';
import { entrar, num } from '../fx/movimiento.js';
import { glifoRol } from '../fx/iconos.js';
import { pintarLogo } from '../fx/logos.js';
import { tonoOrg, paletaDe, aplicarTono } from '../fx/tono.js';
import { placaInferior } from '../fx/transmision.js';
import { crearBeats } from '../fx/beats.js';
import { crearConfeti } from '../fx/confeti.js';
import { crearAzar } from '../fx/azar.js';
import { crearJersey } from './jersey.js';
import { crearNarracion, modoDe, fundirCuadro } from '../narracion.js';
import { lugarDeLiga } from '../core/bisagra.js';
import { nombreVisibleDeLiga } from '../formatoUi.js';
import { leerNumeroJersey, guardarNumeroJersey } from '../almacenamiento.js';
import { ROLES } from '../../data/roles.js';

const ROLES_PL = ['top', 'jungla', 'mid', 'adc', 'support'];
// Dónde cae cada rol en el mapa de la Grieta (% del lado del mapa: la base azul abajo a la izquierda).
const PL_POS = { top: [18, 16], jungla: [25, 44], mid: [50, 47], adc: [70, 89], support: [87, 67] };
// El número del jersey: 1-99.
const DORSAL = { min: 1, max: 99 };
const TIPO_DE_CONTRATO = { renovacion: 'Renovación', import: 'Import', transferencia: 'Transferencia', rookie: 'Rookie' };
const fmt1 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
const aniosTxt = (n) => `${n} ${n === 1 ? 'año' : 'años'}`;

// c. El mapa (ms desde que abre la capa, a 1×; PLANUI §0.6 punto 1: el mercado firmó el papel en los 2300 ms de antes).
//   0-1000     el mapa cae desde arriba (encima del papel firmado, que se va atrás) y se dibujan las líneas;
//   1000-2000  tu línea cae y se enciende; aparecen tus compañeros;
//   2000-2800  el mapa se achica y viaja al lugar del escudo del walkout (FLIP): el escudo del mapa se funde en el logo.
const T_MAPA = {
  fondoDur: 360,
  mapaDur: 1000, mapaToca: 0.68, mapaCae: 1.05, mapaGiro: -3, // la caída del mapa (desde 1,05 alturas de pantalla)
  cab: 420,
  carriles: 450, carrilesDur: 620, carrilPaso: 60,
  pos: 620, posPaso: 70,
  cae: 1000, caeDur: 480, toca: 0.82, // la caída: acelera y toca a esta fracción, después se aplasta y vuelve
  pingPaso: 150, pingDur: 900, pingEscala: 2.6,
  vos: 120, companeros: 200, companeroPaso: 60,
  papelAtras: 120, papelAtrasDur: 820, // el papel se va atrás: escala, desenfoque y luz
  viaja: 2000, viajaDur: 800, funde: 0.55, cabSale: 0.4, restoSale: 0.5, // el viaje del mapa al escudo
  papelSaleDur: 640,
  sosten: 350 // lo mínimo que el papel firmado se sostiene cuando lo recibe el fichaje (el mercado lo sostuvo 150)
};
// el papel firmado, detrás del mapa: cuánto se achica y cuánta luz le queda
const PAPEL_ATRAS = { escala: 0.9, luz: 0.4 };
// la capa montada antes del papel: su opacidad mientras espera (se pinta, no se ve)
const MONTADA_ALFA = 0.01;
// el golpe sobre el escudo ya en su lugar
const LOGO_GOLPE = { escala: 1.12, dur: 520 };
// d. La firma (el walkout), en ms desde que arranca (W0, el golpe sobre el escudo): los tiempos de la vitrina, corridos
// para que su golpe (T_FL.golpe) caiga en W0. Lo de antes del golpe en la vitrina (el apagón, la liga y el rol en el haz,
// el logo que entra en el centro) ya lo contó el mapa.
const W0 = 2800;
const T_FL = {
  duracion: 4600, asentarse: 4300,
  apaga: -180,
  haz: 60, hazDur: 560,
  liga: 300, ligaDur: 420,
  rol: 600, rolDur: 320, giro: 650, giroDur: 560,
  sube: 1150, subeDur: 280,
  rotulo: 1300,
  golpe: 1440, inundaDur: 1300, ondaDur: 720, ondaPaso: 110,
  barre: 1480, barreDur: 640,
  logoDur: 920, logoLlega: 0.14, logoQueda: 0.43,
  handle: 1990, letraPaso: 55, letraDur: 400, impacto: 0.6,
  trazo: 2500, trazoDur: 950, rubrica: 3200, rubricaDur: 380,
  placas: 2950, placaPaso: 170, placaDur: 460,
  bienvenida: 3450, bienvenidaDur: 520,
  confeti: 3500, cortina: 3620, lluvia: 4300,
  barrido: 2300,
  log: 3750, numero: 3800, seguir: 3900,
  halo: 2420, haloPeriodo: 3200, mecer: 2200, mecerPeriodo: 7000, brillo: 4400, brilloPeriodo: 5600,
  cierra: 220
};
// movimiento reducido: el tiempo de lectura del cuadro del mapa (ms a velocidad x1), antes del de la bienvenida
const LECTURA_MAPA = 2200;
// el confeti de la bienvenida: "un poco" (en el celular, menos)
const CONFETI = { cantidad: 130, celular: 0.6, calma: 600, alfa: 0.16 };
// la firma trazada: el ancho del trazo, desde cuántas letras el handle se aprieta, y el largo de los trazos
const FIRMA = { ancho: 640, larga: 11, trazo: 2200, rubrica: 700 };
// el nombre gigante achica la letra hasta entrar en su ancho (px)
const LETRA_MIN = 34;

// ------------------------------------------------------------------------------------------------- qué se firmó
// El fichaje de una respuesta, o `null` si la respuesta no firmó nada nuevo. `antes`/`despues`: el estado del motor; `logs`:
// los de la respuesta. Una renovación (la misma org) es un fichaje sin mudanza (`renovacion`): no cae ninguna línea.
// `hasta`: cuántos logs de la respuesta cuenta la firma (hasta el renglón "Firmás con…" / "Renovás con…", incluido).
export function fichajeDe(antes, despues, logs = []) {
  const c0 = antes?.career?.contrato ?? {};
  const c1 = despues?.career?.contrato ?? {};
  if (!c1.org || c1.tipo === 'ninguno') return null;
  const igual = ['org', 'salarioAnualUSD', 'anios', 'firmadoEnAnio', 'firmadoAEdad', 'tipo'].every((k) => c0[k] === c1[k]);
  if (igual) return null;
  const i = logs.findIndex((l) => l?.type === 'mercado' && /^(Firmás|Renovás) con /.test(l.message ?? ''));
  return {
    org: c1.org,
    liga: c1.liga,
    tier: c1.tier,
    salario: c1.salarioAnualUSD,
    anios: c1.anios,
    tipo: c1.tipo,
    clausula: c1.clausula === 'salida',
    renovacion: c0.org === c1.org,
    primero: !(antes?.career?.orgs ?? []).length,
    anio: despues.calendario?.anio ?? null,
    handle: despues.player?.name ?? '',
    rol: despues.player?.role ?? 'mid',
    companeros: (despues.career?.companeros ?? []).map((c) => ({ handle: c.handle, rol: c.role })),
    seed: despues.seed,
    log: i >= 0 ? logs[i] : null,
    hasta: i >= 0 ? i + 1 : 0
  };
}

// El número que propone la firma: el que ya elegiste en esta carrera o, la primera vez, los dígitos del final del handle
// (Elurah89 -> 89); si no tiene, uno del azar decorativo sembrado con el handle (siempre el mismo).
export function numeroPropuesto(seed, handle) {
  const guardado = leerNumeroJersey(seed);
  if (guardado != null) return guardado;
  const m = /(\d{1,2})$/.exec(String(handle ?? ''));
  if (m && Number(m[1]) >= DORSAL.min) return Number(m[1]);
  return crearAzar(`dorsal|${handle}`).entero(DORSAL.min, DORSAL.max);
}

// La firma trazada: el handle con trazo (apretado si es largo) y la rúbrica.
function firmaTrazada(handle, clase) {
  const texto = svg('text', { x: '8', y: '104', class: `${clase}-trazo` }, document.createTextNode(handle));
  if (String(handle).length >= FIRMA.larga) {
    texto.setAttribute('textLength', String(FIRMA.ancho - 30));
    texto.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }
  texto.style.strokeDasharray = String(FIRMA.trazo);
  const rubrica = svg('path', { class: `${clase}-rubrica`, d: 'M14 128 C 140 112, 300 140, 420 120 S 600 96, 628 112' });
  const nodo = svg('svg', { class: clase, viewBox: `0 0 ${FIRMA.ancho} 150`, 'aria-hidden': 'true' }, [texto, rubrica]);
  return { nodo, texto, rubrica };
}
export const trazarFirma = (f, t0, dur) => animar(f.texto, [{ strokeDashoffset: FIRMA.trazo, fillOpacity: 0 }, { strokeDashoffset: 0, fillOpacity: 0, offset: 0.78 }, { strokeDashoffset: 0, fillOpacity: 1 }], { delay: t0, dur, easing: 'cubic-bezier(.45,0,.2,1)' });
export const rubricar = (f, t0, dur) => animar(f.rubrica, [{ strokeDashoffset: FIRMA.rubrica }, { strokeDashoffset: 0 }], { delay: t0, dur, easing: EXPO });
export { firmaTrazada };

// La letra más grande con la que `nodo` entra en su ancho (sin pasar la del CSS).
function ajustarLetra(nodo, min = LETRA_MIN) {
  if (!nodo?.isConnected) return;
  nodo.style.fontSize = '';
  const ancho = nodo.clientWidth;
  const largo = nodo.scrollWidth;
  if (!ancho || largo <= ancho) return;
  const base = parseFloat(getComputedStyle(nodo).fontSize);
  nodo.style.fontSize = `${Math.max(min, Math.floor(base * (ancho / largo) * 0.98))}px`;
}

// La liga del fichaje en pantalla: su logo (decorativo, el nombre va al lado) y su nombre visible con el año.
function laLigaDe(f) {
  const logoDeLaLiga = (tam) => pintarLogo(f.liga, { liga: true, tam, alt: '' });
  const ligaYAnio = `${nombreVisibleDeLiga(f.liga)}${f.anio ? ` ${f.anio}` : ''}`;
  return { logoDeLaLiga, ligaYAnio };
}

// ------------------------------------------------------------------------------------------------- c. el mapa
function escenaDelMapa(f, tono) {
  const rol = ROLES_PL.includes(f.rol) ? f.rol : 'mid';
  const lugar = lugarDeLiga(f.liga);
  const { logoDeLaLiga, ligaYAnio } = laLigaDe(f);
  const grieta = svg('svg', { class: 'fj-pl-grieta', viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [
    svg('path', { class: 'fj-pl-borde', d: 'M2.5 2.5h19v19h-19z', pathLength: '1' }),
    svg('path', { class: 'fj-pl-rio', d: 'M4.6 4.6L19.4 19.4', pathLength: '1' }),
    svg('path', { class: 'fj-pl-carril', d: 'M4.6 19.4V4.6h14.8', pathLength: '1' }),
    svg('path', { class: 'fj-pl-carril', d: 'M4.6 19.4h14.8V4.6', pathLength: '1' }),
    svg('path', { class: 'fj-pl-carril fj-pl-carril-vos', d: 'M4.6 19.4L19.4 4.6', pathLength: '1' }),
    svg('path', { class: 'fj-pl-base', d: 'M2.5 18a3.5 3.5 0 0 1 3.5 3.5' }),
    svg('path', { class: 'fj-pl-base', d: 'M21.5 6a3.5 3.5 0 0 1 -3.5 -3.5' })
  ]);
  const quienDe = (r) => f.companeros.find((c) => c.rol === r)?.handle ?? null;
  let vos = null;
  const posiciones = ROLES_PL.map((r) => {
    const [x, y] = PL_POS[r];
    const esVos = r === rol;
    const nodo = el('span', { class: 'fj-pl-nodo' }, [glifoRol(r, 'ln-glifo-rol fj-pl-glifo'), esVos ? el('i', { class: 'fj-pl-halo' }) : null]);
    const txt = esVos
      ? el('span', { class: 'fj-pl-txt' }, [el('span', { class: 'fj-pl-rol', text: `${ROLES[r]?.label ?? r} · tu lugar` }), el('b', { class: 'fj-pl-handle', text: f.handle, style: { '--fj-n': String(Math.max(1, String(f.handle).length)) } })])
      : el('span', { class: 'fj-pl-txt' }, [el('span', { class: 'fj-pl-rol', text: ROLES[r]?.label ?? r }), el('span', { class: quienDe(r) ? 'fj-pl-quien' : 'fj-pl-quien fj-pl-anunciar', text: quienDe(r) ?? 'por anunciar' })]);
    const pos = el('div', { class: `fj-pl-pos${esVos ? ' fj-pl-vos' : ''}`, 'data-rol': r, style: { left: `${x}%`, top: `${y}%` } }, [nodo, txt]);
    if (esVos) vos = { pos, nodo, txt };
    return pos;
  });
  const estela = el('i', { class: 'fj-pl-estela', 'aria-hidden': 'true', style: { left: `${PL_POS[rol][0]}%`, top: `${PL_POS[rol][1]}%` } });
  const pings = [0, 1].map(() => el('i', { class: 'fj-pl-ping', 'aria-hidden': 'true', style: { left: `${PL_POS[rol][0]}%`, top: `${PL_POS[rol][1]}%` } }));
  const marca = el('div', { class: 'fj-pl-marca', 'aria-hidden': 'true' }, pintarLogo(f.org, { tam: 320, alt: '' }));
  const mapa = el('div', { class: 'fj-pl-mapa' }, [marca, grieta, estela, ...pings, ...posiciones]);
  const cab = el('header', { class: 'fj-pl-cab' }, [
    el('p', { class: 'fj-pl-k' }, [logoDeLaLiga(16), `${ligaYAnio}${lugar?.ciudad ? ` · ${lugar.ciudad}` : ''} · tu plantel`]),
    el('p', { class: 'fj-pl-org', text: f.org })
  ]);
  const nodo = el('div', { class: 'fj-mapa-escena', 'aria-hidden': 'true' }, [cab, mapa]);
  aplicarTono(nodo, tono);
  return { nodo, cab, mapa, marca, grieta, posiciones, vos, estela, pings };
}

// ------------------------------------------------------------------------------------------------- d. la firma
function laFirma(f, tono, { numero, valor }) {
  const lugar = lugarDeLiga(f.liga);
  const { logoDeLaLiga, ligaYAnio } = laLigaDe(f);
  const rolEtiqueta = ROLES[f.rol]?.label ?? f.rol;
  const bienvenida = `${f.org} da la bienvenida a ${f.handle}`;
  const haz = el('div', { class: 'fj-haz', 'aria-hidden': 'true' });
  const inunda = el('div', { class: 'fj-inunda', 'aria-hidden': 'true' });
  const velo = el('div', { class: 'fj-velo', 'aria-hidden': 'true' });
  const ondas = [0, 1].map(() => el('i', { class: 'fj-onda', 'aria-hidden': 'true' }));
  // el bloque: el rótulo, el logo, el handle con la firma, la bienvenida, las placas y el renglón del motor
  const kicker = el('p', { class: 'fj-k' }, [
    el('span', { class: 'fj-k-liga' }, [logoDeLaLiga(20), lugar?.regionId ? el('b', { text: lugar.regionId }) : null, el('span', { text: ligaYAnio })]),
    el('span', { class: 'fj-k-rol' }, [glifoRol(f.rol), el('span', { text: rolEtiqueta })]),
    el('span', { text: f.primero ? 'Primer contrato' : f.tipo === 'import' ? 'Import' : 'Nuevo club' })
  ]);
  const halo = el('i', { class: 'fj-halo', 'aria-hidden': 'true' });
  const logo = el('div', { class: 'fj-logo' }, [halo, pintarLogo(f.org, { tam: 150, alt: f.org })]);
  const letras = [...f.handle].map((ch) => el('span', { class: 'fj-letra', text: ch }));
  const brillo = el('span', { class: 'fj-brillo', 'aria-hidden': 'true', text: f.handle });
  const firma = firmaTrazada(f.handle, 'fj-firma');
  const nombre = el('h1', { class: 'fj-handle', id: 'fichajeTitulo', tabindex: '-1', 'aria-label': bienvenida }, [el('span', { class: 'fj-letras', 'aria-hidden': 'true' }, letras), brillo]);
  const cabeza = el('div', { class: 'fj-cabeza' }, [nombre, firma.nodo]);
  const linea = el('p', { class: 'fj-bienvenida', 'aria-hidden': 'true' }, el('span', { text: bienvenida }));
  const placas = el('div', { class: 'fj-placas' }, [
    placaInferior({ rotulo: f.primero ? 'Primer contrato' : 'Contrato', titulo: `USD ${num(f.salario)} / año`, sub: valor ? `${fmt1.format(f.salario / valor)}× tu valor de mercado (USD ${num(valor)})` : '', tono }),
    placaInferior({ rotulo: ligaYAnio, titulo: aniosTxt(f.anios), sub: [TIPO_DE_CONTRATO[f.tipo] ?? null, f.clausula ? 'con cláusula de salida' : 'sin cláusula de salida'].filter(Boolean).join(' · '), tono })
  ]);
  const log = f.log ? el('p', { class: 'fj-log', text: f.log.message }) : null;
  const plantel = el('p', { class: 'solo-lectores', text: `Tu plantel en ${f.org}: ${ROLES_PL.map((r) => `${ROLES[r]?.label ?? r}, ${r === f.rol ? f.handle : f.companeros.find((c) => c.rol === r)?.handle ?? 'por anunciar'}`).join('; ')}.` });
  const bloque = el('div', { class: 'fj-bloque' }, [kicker, logo, cabeza, linea, placas, log, plantel]);

  // a la derecha: el jersey y el número que elegís
  const jersey = crearJersey({ org: f.org, liga: f.liga, handle: f.handle, numero, tono });
  const campo = el('input', { class: 'fj-num-campo', id: 'fichajeNumero', type: 'text', inputmode: 'numeric', maxlength: '2', autocomplete: 'off', enterkeyhint: 'done', value: String(numero), 'aria-describedby': 'fichajeNumeroAyuda' });
  const menos = el('button', { type: 'button', class: 'fj-num-paso', 'aria-label': 'Bajar el número', text: '−' });
  const mas = el('button', { type: 'button', class: 'fj-num-paso', 'aria-label': 'Subir el número', text: '+' });
  const eleccion = el('div', { class: 'fj-numero' }, [
    el('label', { class: 'fj-num-k', for: 'fichajeNumero', text: 'Tu número' }),
    el('div', { class: 'fj-num-fila' }, [menos, campo, mas]),
    el('p', { class: 'fj-num-ayuda', id: 'fichajeNumeroAyuda', text: 'Del 1 al 99 · ↑ ↓ lo cambian' })
  ]);
  const seguir = el('button', { type: 'button', class: 'boton boton-pri fj-seguir' }, ['Seguir', el('kbd', { text: 'Enter' })]);
  const lado = el('aside', { class: 'fj-lado', 'aria-label': `Tu jersey de ${f.org}` }, [jersey.nodo, eleccion, seguir]);
  return { haz, inunda, velo, ondas, kicker, logo, halo, letras, brillo, firma, nombre, linea, placas, log, bloque, jersey, campo, menos, mas, eleccion, seguir, lado };
}

// ------------------------------------------------------------------------------------------------- la narración
// `ctx`: el de `app.js` (`narrarRespuesta`). `f`: `fichajeDe(...)`. `valor`: tu valor de mercado (USD), el referente del
// sueldo.
// `mundo`: el puente del ambiente; `sonido`: el del kit. `tono` (opcional): el de la org en la pantalla que firmó (el
// mercado le da a cada org inventada su paleta en el orden de la grilla); si no, `tonoOrg`. Resuelve cuando el jugador
// sigue.
// `papel` (opcional, el mercado): la promesa del papel firmado al frente (`{ capa, caja, sombra, escala, saltado }`, o
// null si no llegó): la capa se monta ya, casi invisible, y la escena arranca cuando el papel está firmado; el mapa cae
// encima, el papel se va atrás y se esfuma mientras el mapa viaja al escudo. `saltado` (o el del papel): el jugador ya
// saltó (Espacio): va al walkout.
export async function narrarFichaje(ctx, f, { mundo = null, sonido = null, valor = 0, tono: tonoDado = null, papel: papelDado = null, saltado = false } = {}) {
  if (!f || typeof document === 'undefined') return;
  // en rápido (o a 2×), el mapa y el viaje con la escala de la narración (nunca saltados); el walkout, a su tiempo
  const K = Number.isFinite(ctx?.escala) && ctx.escala > 0 ? Math.min(1, ctx.escala) : 1;
  const M = (ms) => Math.round(ms * K);
  const W = M(W0);
  const tono = tonoDado ?? tonoOrg(f.org);
  let numero = numeroPropuesto(f.seed, f.handle);
  // movimiento reducido: los dos cuadros fijos (`cuadro`: 'mapa' mientras se lee el mapa, después 'firma')
  const enCuadros = modoDe(ctx) === 'reducido';
  let cuadro = null;
  const capa = document.querySelector('.shell') ?? document.body;
  // `data-fase`: 'mapa' (lo de abajo se ve apagado detrás) y 'firma' (el walkout tapa todo: queda el mundo)
  const raiz = el('section', { class: 'fj', 'aria-labelledby': 'fichajeTitulo', 'data-fase': 'mapa' });
  aplicarTono(raiz, tono);
  const fondo = el('div', { class: 'fj-fondo', 'aria-hidden': 'true' });
  const m = escenaDelMapa(f, tono);
  const d = laFirma(f, tono, { numero, valor });
  const confeti = crearConfeti(el('canvas', { class: 'cu-confeti fj-confeti', 'aria-hidden': 'true' }), {
    colores: [tono.luz, tono.contra, '--luz-blanca'],
    semilla: `firma-${f.org}-${f.handle}`,
    cantidad: Math.round(CONFETI.cantidad * (celular() ? CONFETI.celular : 1)),
    calma: { desde: W + T_FL.bienvenida - T_FL.golpe, dur: CONFETI.calma, alfa: CONFETI.alfa, zonas: () => [d.bloque.getBoundingClientRect()] },
    origenes: [
      { tipo: 'canon', x: 0, y: 1.02, angulo: 24, t: W + T_FL.confeti - T_FL.golpe },
      { tipo: 'canon', x: 1, y: 1.02, angulo: -24, t: W + T_FL.confeti - T_FL.golpe },
      { tipo: 'cortina', t: W + T_FL.cortina - T_FL.golpe },
      { tipo: 'lluvia', t: W + T_FL.lluvia - T_FL.golpe }
    ]
  });
  // el jersey (sus filtros de tela: ~medio segundo de GPU la primera vez) entra después, en el sostén del papel firmado
  raiz.append(fondo, m.nodo, d.haz, d.inunda, d.velo, ...d.ondas, confeti.nodo, d.bloque, ...(papelDado ? [] : [d.lado]));
  // lo de abajo no se alcanza con el teclado mientras la firma está arriba (los cuartos siguen: el diálogo la tapa y la pausa)
  const tapados = [...capa.children].filter((n) => !n.inert && n.tagName !== 'DIALOG');
  for (const n of tapados) n.inert = true;
  capa.append(raiz);
  ajustarLetra(d.nombre);
  // las medidas, antes de cualquier animación: tu lugar en el mapa (la caída), el escudo del mapa y el del walkout (el viaje)
  const rn = m.vos.nodo.getBoundingClientRect();
  const rMapa = m.mapa.getBoundingClientRect();
  const rMarca = (m.marca.firstElementChild ?? m.marca).getBoundingClientRect();
  const rLogo = (d.logo.lastElementChild ?? d.logo).getBoundingClientRect();
  const centro = (r) => [r.left + r.width / 2, r.top + r.height / 2];
  const [lx, ly] = centro(rLogo);
  // las ondas y la inundación del golpe salen del escudo, en su lugar
  for (const o of d.ondas) Object.assign(o.style, { left: `${Math.round(lx)}px`, top: `${Math.round(ly)}px` });
  d.inunda.style.setProperty('--fj-gx', `${Math.round(lx)}px`);
  d.inunda.style.setProperty('--fj-gy', `${Math.round(ly)}px`);
  // montada antes del papel: casi invisible (pintada, para que el jersey se dibuje ahora) hasta que el papel se firmó
  let papel = null;
  if (papelDado) {
    Object.assign(raiz.style, { opacity: String(MONTADA_ALFA), pointerEvents: 'none' });
    papel = await papelDado;
    if (papel && raiz.isConnected) {
      // el sostén del papel firmado: el jersey se dibuja mientras la pantalla está quieta (al menos `sosten` ms)
      raiz.append(d.lado);
      await Promise.all([new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))), new Promise((r) => setTimeout(r, M(T_MAPA.sosten)))]);
    }
    Object.assign(raiz.style, { opacity: '', pointerEvents: '' });
    if (!papel || !raiz.isConnected) {
      d.jersey.destruir();
      raiz.remove();
      for (const n of tapados) n.inert = false;
      return;
    }
  }

  // el mundo: la luz de la org (en el mapa a media presencia; en el golpe, entera, con el público)
  mundo?.cruzar?.(tono, paletaDe(tono, 0.6), T_MAPA.fondoDur);
  const fx = () => mundo?.fx?.() ?? null;

  // t(ms): un tiempo de la vitrina del walkout, corrido para que su golpe caiga en W
  const t = (ms) => W + ms - T_FL.golpe;
  const bt = crearBeats({ duracion: t(T_FL.duracion), asentarse: t(T_FL.asentarse) });
  const narracion = crearNarracion(ctx, [], { reloj: bt });
  const w = (a) => bt.waapi(a);
  const sonar = (t, fn) => bt.esperar(t).then((llego) => llego && fn());
  let asentado = false;
  let cerrar = () => {};
  const listo = new Promise((resolver) => (cerrar = resolver));

  // ---- c. el mapa: cae desde arriba (encima del papel firmado), las líneas se dibujan, los lugares entran y tu línea cae
  // el fondo baja la luz (con el papel, recién cuando el papel se esfuma: hasta ahí lo apaga el velo del mercado)
  const fondoDesde = papel ? M(T_MAPA.viaja) : 0;
  const fondoTotal = W + 400;
  const fondoLleno = Math.min(fondoDesde + (papel ? M(T_MAPA.viajaDur) / 2 : T_MAPA.fondoDur), W - 100);
  w(animar(fondo, [{ opacity: 0 }, { opacity: 0, offset: fondoDesde / fondoTotal }, { opacity: 1, offset: Math.max(fondoDesde, fondoLleno) / fondoTotal }, { opacity: 1, offset: Math.max(fondoDesde, fondoLleno, W - 100) / fondoTotal }, { opacity: 0 }], { dur: fondoTotal, easing: 'linear', fill: 'none' }));
  m.nodo.style.opacity = '1';
  w(animar(m.nodo, [
    { opacity: 0, transform: `translateY(${-T_MAPA.mapaCae * 100}vh) rotate(${T_MAPA.mapaGiro}deg)`, easing: 'cubic-bezier(.5,0,.85,.45)' },
    { opacity: 1, transform: `translateY(${-T_MAPA.mapaCae * 60}vh) rotate(${T_MAPA.mapaGiro * 0.6}deg)`, offset: 0.2, easing: 'cubic-bezier(.5,0,.85,.45)' },
    { opacity: 1, transform: 'translateY(1.5%) scale(1.02, .97)', offset: T_MAPA.mapaToca, easing: 'cubic-bezier(.2,.7,.3,1)' },
    { opacity: 1, transform: 'none' }
  ], { dur: M(T_MAPA.mapaDur), easing: 'linear' }));
  const golpeCaida = bt.destello(M(T_MAPA.mapaDur * T_MAPA.mapaToca));
  if (golpeCaida != null) fx()?.pulso?.('golpe', golpeCaida);
  if (papel) {
    const s = papel.escala;
    w(animar(papel.caja, [{ transform: `scale(${s})` }, { transform: `scale(${s * PAPEL_ATRAS.escala})` }], { delay: M(T_MAPA.papelAtras), dur: M(T_MAPA.papelAtrasDur), fill: 'forwards' }));
    w(animar(papel.sombra, [{ opacity: 0 }, { opacity: 1 - PAPEL_ATRAS.luz }], { delay: M(T_MAPA.papelAtras), dur: M(T_MAPA.papelAtrasDur), easing: 'linear', fill: 'forwards' }));
    // el papel se esfuma; el velo del mercado sigue hasta que el walkout tapa lo de abajo (fase 'firma', en W)
    w(animar(papel.caja, [{ opacity: 1 }, { opacity: 0 }], { delay: M(T_MAPA.viaja), dur: M(T_MAPA.papelSaleDur), easing: 'linear', fill: 'forwards' }));
  }
  w(entrar(m.cab, M(T_MAPA.cab), 10));
  m.grieta.querySelectorAll('[pathLength]').forEach((p, k) => w(animar(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { delay: M(T_MAPA.carriles + k * T_MAPA.carrilPaso), dur: M(T_MAPA.carrilesDur) })));
  m.posiciones.forEach((p, k) => p !== m.vos.pos && w(animar(p, [{ opacity: 0, translate: '-50% -12px' }, { opacity: 1, translate: '-50% -22px' }], { delay: M(T_MAPA.pos + k * T_MAPA.posPaso), dur: M(360) })));
  const tToca = M(T_MAPA.cae + T_MAPA.caeDur * T_MAPA.toca);
  // la caída: desde arriba de la pantalla hasta tu lugar (medido), acelerando; toca, se aplasta y vuelve
  const alto = Math.round(rn.bottom + 60);
  w(animar(m.vos.nodo, [
    { opacity: 0, transform: `translateY(${-alto}px) scale(1.3)`, filter: 'blur(4px)', easing: 'cubic-bezier(.5,0,.9,.4)' },
    { opacity: 1, transform: `translateY(${Math.round(-alto * 0.9)}px) scale(1.25)`, filter: 'blur(3px)', offset: 0.08, easing: 'cubic-bezier(.5,0,.9,.4)' },
    { opacity: 1, transform: 'translateY(4%) scale(1.16, .82)', filter: 'blur(0px)', offset: T_MAPA.toca, easing: 'cubic-bezier(.2,.7,.3,1)' },
    { opacity: 1, transform: 'none', filter: 'blur(0px)' }
  ], { delay: M(T_MAPA.cae), dur: M(T_MAPA.caeDur), easing: 'linear' }));
  m.estela.style.height = `${alto}px`;
  w(animar(m.estela, [{ opacity: 0, transform: 'scaleY(.1)' }, { opacity: 1, transform: 'scaleY(1)', offset: 0.5 }, { opacity: 0.8, transform: 'scaleY(.6)', offset: T_MAPA.toca }, { opacity: 0, transform: 'scaleY(.02)' }], { delay: M(T_MAPA.cae), dur: M(T_MAPA.caeDur + 160), easing: 'linear', fill: 'none' }));
  m.pings.forEach((p, k) => w(animar(p, [{ opacity: 0.95, transform: 'translate(-50%, -50%) scale(.4)' }, { opacity: 0, transform: `translate(-50%, -50%) scale(${T_MAPA.pingEscala})` }], { delay: tToca + M(k * T_MAPA.pingPaso), dur: M(T_MAPA.pingDur), easing: EXPO, fill: 'none' })));
  w(animar(m.grieta.querySelector('.fj-pl-carril-vos'), [{ strokeWidth: 0.9, opacity: 1 }, { strokeWidth: 0.26, opacity: 0.8 }], { delay: tToca, dur: M(700), fill: 'none' }));
  w(entrar(m.vos.txt, tToca + M(T_MAPA.vos), 10));
  m.posiciones.filter((p) => p !== m.vos.pos).forEach((p, k) => w(animar(p.querySelector('.fj-pl-quien'), [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { delay: tToca + M(T_MAPA.companeros + k * T_MAPA.companeroPaso), dur: M(300) })));
  const golpeMapa = bt.destello(tToca);
  if (golpeMapa != null) fx()?.pulso?.('golpe', golpeMapa);
  sonar(M(T_MAPA.cae), () => sonido?.ding?.());
  sonar(tToca, () => sonido?.golpe?.());

  // ---- el viaje: el mapa se achica y va al lugar del escudo del walkout (FLIP contra el escudo ya montado, invisible); el
  // escudo del mapa se enciende y se funde en el logo; lo demás del mapa se esfuma
  if (!enCuadros) {
    const [mx, my] = centro(rMapa);
    const [kx, ky] = centro(rMarca);
    const sM = rMarca.width > 0 ? rLogo.width / rMarca.width : 1;
    const tx = Math.round(lx - mx - sM * (kx - mx));
    const ty = Math.round(ly - my - sM * (ky - my));
    const viaje = { delay: M(T_MAPA.viaja), dur: M(T_MAPA.viajaDur), fill: 'forwards' };
    w(animar(m.mapa, [{ transform: 'none' }, { transform: `translate(${tx}px, ${ty}px) scale(${sM.toFixed(4)})` }], { ...viaje, easing: 'cubic-bezier(.65,0,.25,1)' }));
    w(animar(m.cab, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-14px)', offset: T_MAPA.cabSale }, { opacity: 0, transform: 'translateY(-14px)' }], { ...viaje, easing: 'ease-in' }));
    for (const n of [m.grieta, ...m.posiciones]) w(animar(n, [{ opacity: 1 }, { opacity: 0, offset: T_MAPA.restoSale }, { opacity: 0 }], { ...viaje, easing: 'linear' }));
    w(animar(m.marca, [{ opacity: 0.16 }, { opacity: 1, offset: T_MAPA.funde }, { opacity: 0 }], { ...viaje, easing: 'linear' }));
    w(animar(d.logo, [{ opacity: 0 }, { opacity: 0, offset: T_MAPA.funde }, { opacity: 1 }], { ...viaje, easing: 'linear', fill: 'backwards' }));
  }
  // con el escudo en su lugar, el mapa se va y lo de abajo también (el walkout queda solo sobre el mundo)
  bt.esperar(W).then(() => {
    if (!raiz.isConnected || enCuadros) return;
    m.nodo.style.visibility = 'hidden';
    raiz.dataset.fase = 'firma';
  });

  // ---- d. la firma: el golpe sobre el escudo, el haz, tu handle y el jersey
  w(animar(d.haz, [
    { opacity: 0, transform: 'translateX(-50%) scaleY(0)', easing: EXPO },
    { opacity: 0.9, transform: 'translateX(-50%) scaleY(1)', offset: 0.3, easing: 'ease-out' },
    { opacity: 0.16, transform: 'translateX(-50%) scaleY(1)' }
  ], { delay: t(T_FL.golpe), dur: T_FL.hazDur + T_FL.ligaDur, easing: 'linear' }));
  w(animar(d.velo, [{ opacity: 0 }, { opacity: 1 }], { delay: t(T_FL.barre), dur: T_FL.barreDur, easing: 'linear' }));
  w(animar(d.kicker, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { delay: t(T_FL.rotulo), dur: 360 }));
  d.kicker.querySelectorAll(':scope > span').forEach((x, k) => w(entrar(x, t(T_FL.rotulo) + 60 + k * 70, -6)));
  // EL GOLPE: el escudo, ya en su lugar, late
  w(animar(d.logo, [{ transform: 'none' }, { transform: `scale(${LOGO_GOLPE.escala})`, offset: 0.18, easing: EXPO }, { transform: 'none' }], { delay: t(T_FL.golpe), dur: LOGO_GOLPE.dur, easing: 'linear' }));
  d.ondas.forEach((o, k) => w(animar(o, [{ opacity: 0, transform: 'translate(-50%, -50%) scale(.2)' }, { opacity: 0.95, transform: 'translate(-50%, -50%) scale(.24)', offset: 0.02 }, { opacity: 0, transform: 'translate(-50%, -50%) scale(4.6)' }], { delay: t(T_FL.golpe) + 60 + k * T_FL.ondaPaso, dur: T_FL.ondaDur - k * 120, easing: 'cubic-bezier(.15,.7,.3,1)' })));
  const golpe = bt.destello(t(T_FL.golpe));
  if (golpe != null) {
    fx()?.pulso?.('golpe', golpe);
    w(animar(d.inunda, [{ opacity: 0 }, { opacity: 0.92, offset: 0.06 }, { opacity: 0.34, offset: 0.4 }, { opacity: 0 }], { delay: golpe, dur: T_FL.inundaDur, easing: 'ease-out' }));
  }
  // en el golpe el mundo se enciende entero en el tono de la org, con el público
  const enciende = (cruce) => (mundo?.cruzar?.(tono, paletaDe(tono), cruce), mundo?.declarar?.({ lightsticks: 1 }));
  bt.esperar(t(T_FL.golpe)).then(() => raiz.isConnected && !enCuadros && enciende(T_FL.inundaDur / 4));
  // el jersey aparece con el barrido del apagón y la luz de la org lo cruza
  w(animar(d.lado.querySelector('.jy'), [{ opacity: 0, transform: 'translateY(24px) scale(.97)' }, { opacity: 1, transform: 'none' }], { delay: t(T_FL.barre), dur: T_FL.barreDur + 200, easing: EXPO }));
  d.jersey.barrido(w, t(T_FL.barrido));
  // el handle gigante, letra por letra con peso, y la firma que se traza encima
  d.letras.forEach((l, i) => w(animar(l, [
    { opacity: 0, transform: 'translateY(-70%) scale(1.06, 1.3)', filter: 'blur(6px)', easing: 'cubic-bezier(.55,0,.9,.4)' },
    { opacity: 1, transform: 'translateY(3%) scale(1.1, .82)', filter: 'blur(0px)', offset: T_FL.impacto, easing: 'cubic-bezier(.2,.7,.3,1)' },
    { opacity: 1, transform: 'translateY(-2%) scale(.98, 1.04)', filter: 'blur(0px)', offset: 0.82 },
    { opacity: 1, transform: 'none', filter: 'blur(0px)' }
  ], { delay: t(T_FL.handle) + i * T_FL.letraPaso, dur: T_FL.letraDur, easing: 'linear' })));
  w(trazarFirma(d.firma, t(T_FL.trazo), T_FL.trazoDur));
  w(rubricar(d.firma, t(T_FL.rubrica), T_FL.rubricaDur));
  // los términos como placas, la bienvenida, el renglón del motor, tu número y "Seguir"
  [...d.placas.children].forEach((p, k) => w(animar(p, [{ opacity: 0, clipPath: 'inset(0 100% 0 0)', transform: 'translateX(-14px)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'none' }], { delay: t(T_FL.placas) + k * T_FL.placaPaso, dur: T_FL.placaDur })));
  w(animar(d.linea.firstElementChild, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: t(T_FL.bienvenida), dur: T_FL.bienvenidaDur }));
  if (d.log) w(entrar(d.log, t(T_FL.log), 8));
  w(entrar(d.eleccion, t(T_FL.numero), 8));
  w(entrar(d.seguir, t(T_FL.seguir), 6));
  // el loop vivo: el halo del logo respira, el haz se mece, el brillo cruza el handle
  const loop = (nodo, cuadros, opciones) => (quieto() ? null : nodo.animate(cuadros, opciones));
  w(loop(d.halo, [{ opacity: 0.55, transform: 'scale(.94)' }, { opacity: 1, transform: 'scale(1.06)' }], { delay: t(T_FL.halo), duration: T_FL.haloPeriodo, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));
  w(loop(d.haz, [{ rotate: '-2.2deg' }, { rotate: '2.2deg' }], { delay: t(T_FL.mecer), duration: T_FL.mecerPeriodo, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));
  w(loop(d.brillo, [{ backgroundPosition: '160% 0', opacity: 1 }, { backgroundPosition: '-60% 0', opacity: 1, offset: 0.2 }, { backgroundPosition: '-60% 0', opacity: 1 }], { delay: t(T_FL.brillo), duration: T_FL.brilloPeriodo, iterations: Infinity, easing: 'cubic-bezier(.4,0,.2,1)' }));
  sonar(t(T_FL.golpe), () => (sonido?.golpe?.(), sonido?.flash?.()));
  sonar(t(T_FL.handle + T_FL.letraDur * T_FL.impacto), () => sonido?.golpe?.());
  sonar(t(T_FL.confeti), () => sonido?.confeti?.());
  bt.agregar(confeti);

  // ---- el número: escribir, ↑/↓, − y +; el jersey lo sigue
  const valido = (n) => Number.isInteger(n) && n >= DORSAL.min && n <= DORSAL.max;
  const poner = (n) => {
    if (!valido(n)) return;
    const cambio = n !== numero;
    numero = n;
    if (d.campo.value !== String(n)) d.campo.value = String(n);
    if (cambio) d.jersey.numero(n);
  };
  const paso = (k) => poner(((numero - DORSAL.min + k + DORSAL.max) % DORSAL.max) + DORSAL.min);
  d.campo.addEventListener('input', () => {
    const limpio = d.campo.value.replace(/\D/g, '').slice(0, 2);
    if (limpio !== d.campo.value) d.campo.value = limpio;
    const n = Number(limpio);
    if (limpio && valido(n)) poner(n);
  });
  d.campo.addEventListener('blur', () => (d.campo.value = String(numero)));
  d.campo.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      paso(e.key === 'ArrowUp' ? 1 : -1);
    }
  });
  d.menos.addEventListener('click', () => paso(-1));
  d.mas.addEventListener('click', () => paso(1));

  // ---- saltar y seguir
  function asentar() {
    if (asentado || !raiz.isConnected) return;
    asentado = true;
    raiz.dataset.asentado = '';
    // en escritorio, el foco al número (se escribe directo); en el celular no se abre el teclado solo
    if (matchMedia?.('(pointer: fine)').matches) {
      d.campo.focus({ preventScroll: true });
      d.campo.select();
    } else {
      d.seguir.focus({ preventScroll: true });
      // en el celular la capa scrollea: el número y "Seguir" quedan a la vista
      d.seguir.scrollIntoView({ block: 'nearest', behavior: quieto() ? 'auto' : 'smooth' });
    }
  }
  function saltar() {
    if (asentado) return;
    // movimiento reducido: del cuadro del mapa al de la bienvenida
    if (cuadro === 'mapa') return narracion.adelantar();
    // si el golpe no llegó, el mundo va ya al tono de la org, con el público
    if (bt.ahora() < t(T_FL.golpe)) {
      mundo?.cruzar?.(tono, paletaDe(tono), 0);
      mundo?.declarar?.({ lightsticks: 1 });
    }
    bt.saltar();
    asentar();
  }
  function seguirYa() {
    if (!asentado) return saltar();
    guardarNumeroJersey(f.seed, numero);
    cerrar();
  }
  d.seguir.addEventListener('click', seguirYa);
  raiz.addEventListener('click', (e) => !asentado && !e.target.closest('button, input') && saltar());
  const tecla = (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat || e.key !== 'Enter') return;
    if (document.querySelector('dialog[open]')) return;
    if (!asentado) {
      e.preventDefault();
      saltar();
    } else if (e.target === d.campo || !e.target.closest?.('button, a, input')) {
      e.preventDefault();
      seguirYa();
    }
  };
  document.addEventListener('keydown', tecla);
  bt.esperar(t(T_FL.asentarse)).then(() => raiz.isConnected && !enCuadros && asentar());

  // ---- movimiento reducido (PLANUI §0.3): dos cuadros fijos con su fundido corto, sin desplazamientos
  async function contarEnCuadros() {
    const deLaFirma = [d.velo, d.haz, confeti.nodo, d.bloque, d.lado];
    cuadro = 'mapa';
    for (const n of deLaFirma) n.style.visibility = 'hidden';
    // con el papel firmado, el mapa encima y el papel atrás (achicado, desenfocado y apagado); sin papel, el fondo
    fondo.style.opacity = papel ? '0' : '1';
    if (papel) {
      papel.caja.style.transform = `scale(${papel.escala * PAPEL_ATRAS.escala})`;
      papel.sombra.style.opacity = String(1 - PAPEL_ATRAS.luz);
    }
    m.nodo.style.opacity = '1';
    fundirCuadro(raiz);
    await narracion.esperar(LECTURA_MAPA);
    if (!raiz.isConnected) return;
    cuadro = 'firma';
    fondo.style.opacity = '';
    m.nodo.style.opacity = '';
    if (papel) papel.capa.style.visibility = 'hidden';
    for (const n of deLaFirma) n.style.visibility = '';
    raiz.dataset.fase = 'firma';
    enciende(0);
    for (const n of deLaFirma) fundirCuadro(n);
    asentar();
  }

  d.nombre.focus({ preventScroll: true });
  // (INST o movimiento reducido: el reloj arranca en el cuadro final y las esperas de arriba resuelven ya; con movimiento
  // reducido, los cuadros de abajo lo cuentan en dos pasos)
  bt.iniciar();
  if (enCuadros) contarEnCuadros();
  // Espacio en el papel: directo al walkout
  else if (saltado || papel?.saltado) saltar();

  try {
    await listo;
  } finally {
    document.removeEventListener('keydown', tecla);
    narracion.fin();
    const salida = animar(raiz, [{ opacity: 1 }, { opacity: 0 }], { dur: T_FL.cierra, easing: 'linear', fill: 'forwards' });
    if (salida) await salida.finished.catch(() => {});
    bt.destruir();
    d.jersey.destruir();
    raiz.remove();
    for (const n of tapados) n.inert = false;
  }
}
