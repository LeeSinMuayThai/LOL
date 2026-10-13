// El fichaje (PLANUI §2, compuerta 2 del mercado, pasos c y d; U2b punto 2). Después de la firma sobre el contrato:
//   c. TU LÍNEA CAE SOBRE EL MAPA: la Grieta con sus cinco líneas (el `plantel` de la vitrina) con el escudo de la org de
//      marca en el piso. El glifo de tu rol cae desde arriba a tu lugar, toca con un golpe y aparecen tus compañeros: los
//      de verdad si el motor ya los trajo al firmar (`career.companeros`), y si no "por anunciar" (D102);
//   d. LA FIRMA (el walkout de la vitrina, `crearFirmaLinea` con op=linea): el apagón, el haz con la liga y tu rol, el
//      golpe del logo de la org, tu handle gigante con la firma trazada, la bienvenida y los términos como placas. A la
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

// c. El mapa (ms desde que abre la capa).
const T_MAPA = {
  fondoDur: 360,
  mapa: 100, mapaDur: 560,
  cab: 180,
  carriles: 220, carrilesDur: 760,
  pos: 560, posPaso: 70,
  cae: 900, caeDur: 480, toca: 0.82, // la caída: acelera y toca a esta fracción, después se aplasta y vuelve
  pingPaso: 150, pingDur: 900, pingEscala: 2.6,
  vos: 120, companeros: 340, companeroPaso: 90,
  sale: 2620, saleDur: 420
};
// d. La firma, en ms desde que arranca (W0): los tiempos de la vitrina.
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
// el logo entra en el centro del haz (fracción del alto de la pantalla) y crece ahí
const LOGO_CENTRO = 0.46;
const LOGO_ESCALA = 2.2;
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
  return { nodo, cab, mapa, grieta, posiciones, vos, estela, pings };
}

// ------------------------------------------------------------------------------------------------- d. la firma
function laFirma(f, tono, { numero, valor }) {
  const lugar = lugarDeLiga(f.liga);
  const { logoDeLaLiga, ligaYAnio } = laLigaDe(f);
  const rolEtiqueta = ROLES[f.rol]?.label ?? f.rol;
  const bienvenida = `${f.org} da la bienvenida a ${f.handle}`;
  const negro = el('div', { class: 'fj-negro', 'aria-hidden': 'true' });
  const haz = el('div', { class: 'fj-haz', 'aria-hidden': 'true' });
  const inunda = el('div', { class: 'fj-inunda', 'aria-hidden': 'true' });
  const velo = el('div', { class: 'fj-velo', 'aria-hidden': 'true' });
  const ondas = [0, 1].map(() => el('i', { class: 'fj-onda', 'aria-hidden': 'true' }));
  // en el haz: la liga y su región, y tu rol (decorativos: el rótulo los dice)
  const introLiga = el('div', { class: 'fj-intro-liga' }, [logoDeLaLiga(120), el('b', { class: 'fj-region', text: lugar?.regionId ?? ligaYAnio }), el('span', { class: 'fj-region-k', text: ligaYAnio })]);
  const introRol = el('div', { class: 'fj-intro-rol' }, [glifoRol(f.rol, 'ln-glifo-rol fj-glifo'), el('span', { text: rolEtiqueta })]);
  const intro = el('div', { class: 'fj-intro', 'aria-hidden': 'true' }, [introLiga, introRol]);
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
  return { negro, haz, inunda, velo, ondas, intro, introLiga, introRol, kicker, logo, halo, letras, brillo, firma, nombre, linea, placas, log, bloque, jersey, campo, menos, mas, eleccion, seguir, lado };
}

// ------------------------------------------------------------------------------------------------- la narración
// `ctx`: el de `app.js` (`narrarRespuesta`). `f`: `fichajeDe(...)`. `valor`: tu valor de mercado (USD), el referente del
// sueldo.
// `mundo`: el puente del ambiente; `sonido`: el del kit. `tono` (opcional): el de la org en la pantalla que firmó (el
// mercado le da a cada org inventada su paleta en el orden de la grilla); si no, `tonoOrg`. Resuelve cuando el jugador
// sigue.
export async function narrarFichaje(ctx, f, { mundo = null, sonido = null, valor = 0, tono: tonoDado = null } = {}) {
  if (!f || typeof document === 'undefined') return;
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
    calma: { desde: W0 + T_FL.bienvenida, dur: CONFETI.calma, alfa: CONFETI.alfa, zonas: () => [d.bloque.getBoundingClientRect()] },
    origenes: [
      { tipo: 'canon', x: 0, y: 1.02, angulo: 24, t: W0 + T_FL.confeti },
      { tipo: 'canon', x: 1, y: 1.02, angulo: -24, t: W0 + T_FL.confeti },
      { tipo: 'cortina', t: W0 + T_FL.cortina },
      { tipo: 'lluvia', t: W0 + T_FL.lluvia }
    ]
  });
  raiz.append(fondo, m.nodo, d.negro, d.haz, d.inunda, d.velo, ...d.ondas, confeti.nodo, d.intro, d.bloque, d.lado);
  // lo de abajo no se alcanza con el teclado mientras la firma está arriba (los cuartos siguen: el diálogo la tapa y la pausa)
  const tapados = [...capa.children].filter((n) => !n.inert && n.tagName !== 'DIALOG');
  for (const n of tapados) n.inert = true;
  capa.append(raiz);
  ajustarLetra(d.nombre);

  // el mundo: la luz de la org (en el mapa a media presencia; en el golpe, entera, con el público)
  mundo?.cruzar?.(tono, paletaDe(tono, 0.6), T_MAPA.fondoDur);
  const fx = () => mundo?.fx?.() ?? null;

  const bt = crearBeats({ duracion: W0 + T_FL.duracion, asentarse: W0 + T_FL.asentarse });
  const narracion = crearNarracion(ctx, [], { reloj: bt });
  const w = (a) => bt.waapi(a);
  const sonar = (t, fn) => bt.esperar(t).then((llego) => llego && fn());
  let asentado = false;
  let cerrar = () => {};
  const listo = new Promise((resolver) => (cerrar = resolver));

  // ---- c. el mapa: el fondo baja la luz, la Grieta se dibuja, los lugares entran y tu línea cae
  w(animar(fondo, [{ opacity: 0 }, { opacity: 1, offset: T_MAPA.fondoDur / (W0 + 400) }, { opacity: 1, offset: (W0 - 100) / (W0 + 400) }, { opacity: 0 }], { dur: W0 + 400, easing: 'linear', fill: 'none' }));
  w(animar(m.nodo, [{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none', offset: T_MAPA.mapaDur / T_MAPA.sale }, { opacity: 1, transform: 'none', offset: 1 }], { delay: T_MAPA.mapa, dur: T_MAPA.sale - T_MAPA.mapa, easing: EXPO, fill: 'none' }));
  w(animar(m.nodo, [{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: 'blur(6px)', transform: 'scale(1.04)' }], { delay: T_MAPA.sale, dur: T_MAPA.saleDur, easing: 'ease-in', fill: 'none' }));
  w(entrar(m.cab, T_MAPA.cab, 10));
  m.grieta.querySelectorAll('[pathLength]').forEach((p, k) => w(animar(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { delay: T_MAPA.carriles + k * 60, dur: T_MAPA.carrilesDur })));
  m.posiciones.forEach((p, k) => p !== m.vos.pos && w(animar(p, [{ opacity: 0, translate: '-50% -12px' }, { opacity: 1, translate: '-50% -22px' }], { delay: T_MAPA.pos + k * T_MAPA.posPaso, dur: 360 })));
  const tToca = T_MAPA.cae + T_MAPA.caeDur * T_MAPA.toca;
  // la caída: desde arriba de la pantalla hasta tu lugar (medido), acelerando; toca, se aplasta y vuelve
  const rn = m.vos.nodo.getBoundingClientRect();
  const alto = Math.round(rn.bottom + 60);
  w(animar(m.vos.nodo, [
    { opacity: 0, transform: `translateY(${-alto}px) scale(1.3)`, filter: 'blur(4px)', easing: 'cubic-bezier(.5,0,.9,.4)' },
    { opacity: 1, transform: `translateY(${Math.round(-alto * 0.9)}px) scale(1.25)`, filter: 'blur(3px)', offset: 0.08, easing: 'cubic-bezier(.5,0,.9,.4)' },
    { opacity: 1, transform: 'translateY(4%) scale(1.16, .82)', filter: 'blur(0px)', offset: T_MAPA.toca, easing: 'cubic-bezier(.2,.7,.3,1)' },
    { opacity: 1, transform: 'none', filter: 'blur(0px)' }
  ], { delay: T_MAPA.cae, dur: T_MAPA.caeDur, easing: 'linear' }));
  m.estela.style.height = `${alto}px`;
  w(animar(m.estela, [{ opacity: 0, transform: 'scaleY(.1)' }, { opacity: 1, transform: 'scaleY(1)', offset: 0.5 }, { opacity: 0.8, transform: 'scaleY(.6)', offset: T_MAPA.toca }, { opacity: 0, transform: 'scaleY(.02)' }], { delay: T_MAPA.cae, dur: T_MAPA.caeDur + 160, easing: 'linear', fill: 'none' }));
  m.pings.forEach((p, k) => w(animar(p, [{ opacity: 0.95, transform: 'translate(-50%, -50%) scale(.4)' }, { opacity: 0, transform: `translate(-50%, -50%) scale(${T_MAPA.pingEscala})` }], { delay: tToca + k * T_MAPA.pingPaso, dur: T_MAPA.pingDur, easing: EXPO, fill: 'none' })));
  w(animar(m.grieta.querySelector('.fj-pl-carril-vos'), [{ strokeWidth: 0.9, opacity: 1 }, { strokeWidth: 0.26, opacity: 0.8 }], { delay: tToca, dur: 700, fill: 'none' }));
  w(entrar(m.vos.txt, tToca + T_MAPA.vos, 10));
  m.posiciones.filter((p) => p !== m.vos.pos).forEach((p, k) => w(animar(p.querySelector('.fj-pl-quien'), [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { delay: tToca + T_MAPA.companeros + k * T_MAPA.companeroPaso, dur: 300 })));
  const golpeMapa = bt.destello(tToca);
  if (golpeMapa != null) fx()?.pulso?.('golpe', golpeMapa);
  sonar(T_MAPA.cae, () => sonido?.ding?.());
  sonar(tToca, () => sonido?.golpe?.());

  // ---- d. la firma: el apagón, el haz que baja, la liga y tu rol, el golpe del logo, tu handle y el jersey
  const t = (ms) => W0 + ms;
  // con el apagón entero, lo de abajo (el mercado, la franja, los cuartos) se va: el walkout queda solo sobre el mundo
  bt.esperar(t(0)).then(() => raiz.isConnected && !enCuadros && (raiz.dataset.fase = 'firma'));
  w(animar(d.negro, [
    { opacity: 0, clipPath: 'polygon(-40% 0, 140% 0, 140% 100%, -60% 100%)', easing: 'linear' },
    { opacity: 1, clipPath: 'polygon(-40% 0, 140% 0, 140% 100%, -60% 100%)', offset: -T_FL.apaga / (T_FL.barre + T_FL.barreDur - T_FL.apaga), easing: 'linear' },
    { opacity: 1, clipPath: 'polygon(-40% 0, 140% 0, 140% 100%, -60% 100%)', offset: (T_FL.barre - T_FL.apaga) / (T_FL.barre + T_FL.barreDur - T_FL.apaga), easing: 'cubic-bezier(.6,0,.3,1)' },
    { opacity: 1, clipPath: 'polygon(140% 0, 140% 0, 140% 100%, 120% 100%)' }
  ], { delay: t(T_FL.apaga), dur: T_FL.barre + T_FL.barreDur - T_FL.apaga, easing: 'linear', fill: 'none' }));
  w(animar(d.haz, [
    { opacity: 0, transform: 'translateX(-50%) scaleY(0)', easing: EXPO },
    { opacity: 1, transform: 'translateX(-50%) scaleY(1)', offset: T_FL.hazDur / T_FL.golpe, easing: 'linear' },
    { opacity: 1, transform: 'translateX(-50%) scaleY(1)', offset: 0.97, easing: 'ease-out' },
    { opacity: 0.16, transform: 'translateX(-50%) scaleY(1)' }
  ], { delay: t(T_FL.haz), dur: T_FL.golpe - T_FL.haz + 200, easing: 'linear' }));
  w(animar(d.velo, [{ opacity: 0 }, { opacity: 1 }], { delay: t(T_FL.barre), dur: T_FL.barreDur, easing: 'linear' }));
  const sube = { opacity: 0, transform: 'translateY(-26vh) scale(.3)', filter: 'blur(6px)' };
  const tramoLiga = T_FL.sube + T_FL.subeDur - T_FL.liga;
  w(animar(d.introLiga, [
    { opacity: 0, transform: 'scale(.82)', filter: 'blur(10px)', easing: EXPO },
    { opacity: 1, transform: 'none', filter: 'blur(0px)', offset: T_FL.ligaDur / tramoLiga, easing: 'linear' },
    { opacity: 1, transform: 'none', filter: 'blur(0px)', offset: (T_FL.sube - T_FL.liga) / tramoLiga, easing: 'cubic-bezier(.6,0,.4,1)' },
    sube
  ], { delay: t(T_FL.liga), dur: tramoLiga, easing: 'linear' }));
  const tramoRol = T_FL.sube + T_FL.subeDur - T_FL.rol;
  w(animar(d.introRol, [
    { opacity: 0, transform: 'translateY(14px)', easing: EXPO },
    { opacity: 1, transform: 'none', offset: T_FL.rolDur / tramoRol, easing: 'linear' },
    { opacity: 1, transform: 'none', offset: (T_FL.sube - T_FL.rol) / tramoRol, easing: 'cubic-bezier(.6,0,.4,1)' },
    sube
  ], { delay: t(T_FL.rol), dur: tramoRol, easing: 'linear' }));
  w(animar(d.introRol.querySelector('.fj-glifo'), [{ transform: 'perspective(400px) rotateY(-180deg)' }, { transform: 'perspective(400px) rotateY(360deg)' }], { delay: t(T_FL.giro), dur: T_FL.giroDur, easing: 'cubic-bezier(.3,.6,.25,1)' }));
  w(animar(d.kicker, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { delay: t(T_FL.rotulo), dur: 360 }));
  d.kicker.querySelectorAll(':scope > span').forEach((x, k) => w(entrar(x, t(T_FL.rotulo) + 60 + k * 70, -6)));
  // EL GOLPE: el logo entra en el centro del haz (su lugar final, medido) y viaja a su lugar
  const r = d.logo.getBoundingClientRect();
  const dx = Math.round(innerWidth / 2 - (r.left + r.width / 2));
  const dy = Math.round(innerHeight * LOGO_CENTRO - (r.top + r.height / 2));
  const enCentro = (k) => `translate(${dx}px, ${dy}px) scale(${k})`;
  w(animar(d.logo, [
    { opacity: 0, transform: enCentro(LOGO_ESCALA * 1.6), filter: 'blur(12px)', easing: 'cubic-bezier(.2,.9,.25,1)' },
    { opacity: 1, transform: enCentro(LOGO_ESCALA), filter: 'blur(0px)', offset: T_FL.logoLlega, easing: 'linear' },
    { opacity: 1, transform: enCentro(LOGO_ESCALA * 0.96), filter: 'blur(0px)', offset: T_FL.logoQueda, easing: 'cubic-bezier(.6,0,.2,1)' },
    { opacity: 1, transform: 'none', filter: 'blur(0px)' }
  ], { delay: t(T_FL.golpe), dur: T_FL.logoDur, easing: 'linear' }));
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
  bt.esperar(W0 + T_FL.asentarse).then(() => raiz.isConnected && !enCuadros && asentar());

  // ---- movimiento reducido (PLANUI §0.3): dos cuadros fijos con su fundido corto, sin desplazamientos
  async function contarEnCuadros() {
    const deLaFirma = [d.velo, d.haz, confeti.nodo, d.bloque, d.lado];
    cuadro = 'mapa';
    for (const n of deLaFirma) n.style.visibility = 'hidden';
    fondo.style.opacity = '1';
    m.nodo.style.opacity = '1';
    fundirCuadro(raiz);
    await narracion.esperar(LECTURA_MAPA);
    if (!raiz.isConnected) return;
    cuadro = 'firma';
    fondo.style.opacity = '';
    m.nodo.style.opacity = '';
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
