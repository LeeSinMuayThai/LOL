// El mercado (PLANUI U2b punto 2 y la compuerta 2 del mercado, §2; portado de `crearOfertasLinea` de
// vitrina/fusion/js/mercado.js con `op=linea` y la derecha `ofertas` de §4.10). El mercado es tu segunda selección: a los
// 15 elegiste campeones; ahora elegís equipo, con el mismo gesto.
//   - LA LLEGADA: la ventana de pases como tiempo que pasa. Un reloj de 14 días corre y cada oferta CAE a su lugar en su
//     día, con su aviso y el color de su org; los clubes chicos se mueven primero y el bombazo cierra la ventana. Se usa
//     mientras llegan; Espacio (o elegir una que no llegó) las trae todas. Al retomar, o si la ventana ya se vio (volvés
//     de negociar), están todas.
//   - APUNTAR una org (mouse, foco, 1-6) es el aura: la interfaz y la luz del mundo cruzan a su tono, arriba va su escudo
//     monumental, su nombre gigante y los términos como números grandes con referente; a la derecha, su carta sale de la
//     pila (las ofertas son cartas formales con membrete y sello, apiladas en el orden en que llegaron). Sin apuntar, el
//     reposo: vos en el mercado (tu valor, cuántos te llaman, la más alta).
//   - La comparación es la grilla de escudos (barras de sueldo y jerarquía) y el detalle va al inspector, con la
//     negociación (pedir más, pedir cláusula); abajo, el representante y no firmar. FIRMAR es el BLOQUEAR del inicio.
//   - LA FIRMA AL FRENTE (`narrar`, con la respuesta del motor; PLANUI §0.6 punto 1): el papel de arriba de la pila se
//     despega y viaja al centro, grande, sobre un velo; tu firma se traza en tu línea y cae el sello al pie (Firmado,
//     Renovado o, si la org pide una prueba, A prueba). Si firmaste con un club nuevo, la escena sigue en el fichaje
//     (`components/fichaje.js`): el mapa cae encima del papel, tu línea cae, y el mapa viaja y se vuelve el escudo del
//     walkout. Si no, el papel vuelve a la pila sellado y la hoja sellada queda en el panel. En rápido, la misma secuencia
//     con la escala de la narración; Espacio salta al walkout; con movimiento reducido, cuadros fijos.
//   - Después de una prueba que salió (`paradas/minijuego.js`, PLANUI §0.3 punto 5), la misma hoja se firma suelta en el
//     panel de la prueba (`narrarContratoFirmado`), con el tono y el valor con que el mercado mostró esa oferta
//     (`firmaDeLaPrueba`); después, el fichaje.
//   - "Mientras tanto" (los fichajes del resto del mundo y los asientos que no llegaron a oferta) es la cinta, abajo.
// El traspaso a mitad de contrato (`motivo: 'traspaso'`) es la misma pantalla con una sola carta: la del club que te
// quiere, y sus caminos (aceptar, pedir salir, quedarte) en lugar de la grilla.
//
// Cada número sale de la decisión del motor (`systems/mercado.js`), tal cual: esta pantalla no calcula nada del juego.
import { el, svg, animar, quieto, celular, EXPO, DUR } from '../fx/util.js';
import { entrar, num, odometro } from '../fx/movimiento.js';
import { icono } from '../fx/iconos.js';
import { pintarLogo, logoOrg, escudo, iniciales } from '../fx/logos.js';
import { tonoOrg, tonoEra, paletaDe, aplicarTono } from '../fx/tono.js';
import { bloquear } from '../fx/ceremonia.js';
import { cinta } from '../fx/transmision.js';
import { crearBeats } from '../fx/beats.js';
import { crearAzar } from '../fx/azar.js';
import { crearNarracion, fundirCuadro } from '../narracion.js';
import { fichajeDe, narrarFichaje, firmaTrazada, trazarFirma, rubricar } from './fichaje.js';
import { nombreVisibleDeLiga } from '../formatoUi.js';
import { faltan as faltanTexto } from '../../core/formato.js';
import { ventanaVisibleDe } from '../../core/vistaDeCarrera.js';
import { valorDeMercado } from '../../core/valorMercado.js';
import { LABEL_DE_VENTANA } from '../core/escena.js';
import { ROLES } from '../../data/roles.js';

// ================================================================================================= las líneas de una carta
// K5c-M: dónde está el plantel por fuerza dentro de su liga, en palabras. Lee `oferta.plantelEnLiga` tal cual llega del
// motor (`core/demanda.js:plantelEnLiga`: puesto, de cuántos y la banda); no calcula nada. `null` si la oferta no lo trae.
export function lineaDePlantelDeOferta(oferta) {
  const plantel = oferta.plantelEnLiga;
  if (!plantel) {
    return null;
  }
  const liga = nombreVisibleDeLiga(plantel.liga);
  switch (plantel.banda) {
    case 'primero':
      return `El plantel más fuerte de ${liga}`;
    case 'arriba':
      return `Plantel: ${plantel.puesto}.º de ${plantel.de} en ${liga}`;
    case 'abajo':
      return `Plantel: de los de abajo en ${liga}`;
    default:
      return `Plantel: mitad de tabla en ${liga}`;
  }
}

// K6a-U: "Te falta 1 punto para Ídolo" (el verbo concuerda con el número). Solo la renovación trae `progresoHito`.
export function lineaDeHitoDeOferta(oferta) {
  if (!oferta.progresoHito) {
    return null;
  }
  const { faltan, hacia } = oferta.progresoHito;
  return `${faltanTexto(faltan, 'punto', 'puntos', 'Te')} para ${hacia}`;
}

// K6a-U (regla de proceso 12): el motor arma POR QUÉ el club te ficha (`oferta.motivoDemanda`, de
// `core/demanda.js:asientoAbierto`). Se dice tal cual viene; sin motivo, sin línea.
export function lineaDeMotivoDeOferta(oferta) {
  return oferta.motivoDemanda ? `Por qué te quieren: ${oferta.motivoDemanda}.` : null;
}

// ================================================================================================= constantes
// G3c-ui (PLANUI §0.9): el frente de la oferta. Lee `oferta.frente` tal cual llega del motor (`systems/mercado.js:frenteDeOferta`);
// no calcula nada. Las etiquetas: la primera manda el color; la TRAICIÓN dice de qué org es el clásico (`orgActual`).
const ETIQUETAS = {
  RENOVACION: { clave: 'renovacion', texto: 'Renovación' },
  TRAICION: { clave: 'traicion', texto: 'Traición' },
  VOLVE_A_CASA: { clave: 'casa', texto: 'Volvé a casa' },
  BOMBAZO: { clave: 'bombazo', texto: 'Bombazo' },
  A_LA_BAJA: { clave: 'a_la_baja', texto: 'A la baja' }
};
const ETIQUETA_DE_TAG = { renovacion: 'RENOVACION', bombazo: 'BOMBAZO', a_la_baja: 'A_LA_BAJA' };
const MINUTOS = { mas: { texto: 'Vas a jugar MÁS que ahora', tono: 'bien' }, igual: { texto: 'Vas a jugar IGUAL que ahora', tono: 'neutro' }, menos: { texto: 'Vas a jugar MENOS que ahora', tono: 'mal' } };
export function etiquetasDeOferta(oferta, orgActual = null) {
  const ids = oferta.frente?.etiquetas ?? (ETIQUETA_DE_TAG[oferta.tag] ? [ETIQUETA_DE_TAG[oferta.tag]] : []);
  return ids.filter((id) => ETIQUETAS[id]).map((id) => ({ id, ...ETIQUETAS[id], sub: id === 'TRAICION' && orgActual ? `es el clásico de ${orgActual}` : null }));
}
// Los cuatro ejes del frente: `[{ clave, ico, k, texto, tono }]`. Sin `frente` (una partida vieja), ninguno.
export function ejesDeOferta(oferta) {
  const f = oferta.frente;
  if (!f) {
    return [];
  }
  const a = f.arraigoArranca;
  const renueva = (f.etiquetas ?? []).includes('RENOVACION');
  const arraigo = renueva
    ? `Sos ${a.escalon} (${a.valor}/100)${a.faltan != null ? `: ${faltanTexto(a.faltan, 'punto', 'puntos')} para ${a.proximo}` : ''}`
    : `Allá arrancás ${a.escalon} (${a.valor}/100)${a.faltan != null ? ` · ${a.faltan} para ${a.proximo}` : ''}`;
  return [
    { clave: 'plata', ico: '\u{1F4B0}', k: 'Plata', texto: `USD ${num(f.sueldo)} / año${f.hasta ? ` · hasta USD ${num(f.hasta)}` : ''}`, tono: 'neutro' },
    { clave: 'minutos', ico: '\u23F1', k: 'Minutos', texto: MINUTOS[f.minutos]?.texto ?? MINUTOS.igual.texto, tono: MINUTOS[f.minutos]?.tono ?? 'neutro' },
    f.arraigoPierde ? { clave: 'pierde', ico: '\u{1F494}', k: 'Perdés', texto: `−${f.arraigoPierde.valor} de arraigo con ${f.arraigoPierde.org}`, tono: 'mal' } : null,
    { clave: 'arraigo', ico: '\u{1F3E0}', k: renueva ? 'Tu arraigo' : 'Arrancás', texto: arraigo, tono: 'neutro' }
  ].filter(Boolean);
}
function nodoEtiquetas(oferta, orgActual, clase = 'ms-etqs') {
  const lista = etiquetasDeOferta(oferta, orgActual);
  if (!lista.length) {
    return null;
  }
  return el('div', { class: clase }, lista.map((e, k) => el('span', { class: 'ms-etq', 'data-etq': e.clave, 'data-primera': k === 0 ? 'si' : 'no' }, [el('b', { text: e.texto }), e.sub ? el('i', { text: e.sub }) : null])));
}
function nodoEjes(oferta, clase = 'ms-ejes') {
  const ejes = ejesDeOferta(oferta);
  return ejes.length ? el('ul', { class: clase }, ejes.map((e) => el('li', { class: 'ms-eje', 'data-eje': e.clave, 'data-tono': e.tono }, [el('span', { class: 'ms-eje-ico', 'aria-hidden': 'true', text: e.ico }), el('span', { class: 'ms-eje-k', text: e.k }), el('span', { class: 'ms-eje-t', text: e.texto })]))) : null;
}

const PLANTEL = {
  abajo: { ico: 'margen', largo: 'plantel flojo' },
  medio: { ico: 'parejo', largo: 'plantel parejo' },
  arriba: { ico: 'pelea', largo: 'plantel cargado' },
  primero: { ico: 'pelea', largo: 'el más fuerte de su liga' }
};
const TIPO_DE_CONTRATO = { renovacion: 'renovación', import: 'import', transferencia: 'transferencia', rookie: 'rookie' };
// El aura: entra a los 120 ms de apuntar (barrer la grilla no dispara seis cruces), vuelve a los 600, el mundo cruza en 350.
const T_MS = { aura: 120, vuelta: 600, cruce: 350, borde: 620, letra: 26 };
// La firma sobre el contrato (ms).
const T_FIRMAR = {
  duracion: 3000, asentarse: 2400,
  apaga: 300, sube: 120, subeDur: 480, trazo: 520, trazoDur: 1050, rubrica: 1420, rubricaDur: 420,
  sello: 1650, selloDur: 380, golpe: 1916, onda: 620, sacude: 220, resultado: 2150,
  sostener: 900, // lo que se queda el contrato firmado cuando no sigue el fichaje (una renovación, una prueba)
  sueltaSostener: 700, // la firma suelta (después de la prueba): lo que se queda sellado antes del fichaje
  lectura: 1800 // movimiento reducido: el tiempo de lectura del contrato sellado (un cuadro fijo, a velocidad x1)
};
// Lo que se queda a la vista lo que dijo el club cuando negociás (ms).
const T_NEGOCIAR = { sostener: 1700, odometro: 900 };
// La llegada (ms): el bumper, el reloj de la ventana y las ofertas que caen (los de la vitrina, §4.10).
const VENTANA_DIAS = 14;
const T_LL = {
  bumperDur: 800, abre: 0.3, cierra: 0.72,
  panel: 160, panelDur: 460,
  heroe: 200,
  reloj: 760, // el día 1 de la ventana
  dia: 335, // por día: una llegada por día como mucho, y >= la separación de destellos de beats.js
  cae: 280, // del aviso al golpe
  asienta: 340, // del golpe al reposo (el rebote)
  final: 20, cola: 200,
  caidaMax: 230, caidaSobre: 70, // cuánto cae una oferta en la grilla (px, tope) y por encima del panel desde donde arranca
  reposo: 880, cinta: 1150
};
const LLEGADA_PESO = { min: 0.7, max: 1.3 }; // el peso de cada salto entre días (azar decorativo, sembrado con la ventana)
// Las cartas de la derecha: los giros y corrimientos de la pila, la caída, cómo sale una de la pila y queda al frente.
const CARTA = { giro: 6, dx: 16, dy: 12, caida: 300, giroCaida: 10, frente: 60, sale: { x: 12, y: -40, giro: 7 }, alFrente: { x: 1, y: -2, giro: -1.2, escala: 1.03 }, mueve: 440, corte: 0.45 };
const CARTA_SELLO = { r: 38 };
// LA FIRMA AL FRENTE (PLANUI §0.6 punto 1), en ms desde FIRMAR a 1× (en rápido, por la escala de la narración):
//   0-450 el papel se despega y viaja al centro (a `despega` ya se levantó), el velo baja y los otros papeles caen;
//   450-1500 tu firma se traza; 1500-1800 cae el sello (el golpe, al 70 %); 1800-2300 se sostiene (después, el mapa cae
//   encima: `fichaje.js`); sin fichaje, el papel vuelve a la pila en `vuelve`.
const T_FRENTE = {
  viaja: 450, despega: 0.34, velo: 380,
  caen: 40, caenPaso: 45, caenDur: 520,
  trazo: 470, trazoDur: 820, rubrica: 1290, rubricaDur: 210,
  sello: 1500, selloDur: 300,
  fin: 2300, vuelve: 460,
  entrega: 1950 // con fichaje, el papel pasa al fichaje acá: el resto del sostén lo cubre el jersey que se monta (fichaje.js)
};
// El papel al frente: su ancho (tope en px, fracción del ancho de la pantalla en escritorio y en el celular), el aire que
// deja arriba y abajo (px), la pose del despegue (px, grados) y cómo caen los otros papeles (vh, grados).
const PAPEL = {
  ancho: 560, vw: 0.44, vwCelular: 0.9, aire: 40,
  perspectiva: 1400, despegue: 0.55, levanta: 46, inclina: { x: 14, y: -10, z: 2.5 },
  cae: { y: 70, giro: 16 },
  firmaAire: 40, firmaMin: 420 // el ancho del dibujo de tu firma (unidades del viewBox de `firmaTrazada`)
};
const LETRA_MIN = 34;
// Las paletas de las orgs inventadas, una distinta para cada una en el orden de la grilla (por hash, varias caían igual).
const PALETAS_ORG = 4;
const CAMPOS_TONO = ['luz', 'contra', 'acento', 'noche', 'vacio'];
const tonoPaleta = (k) => Object.freeze({ id: `org-p${k}`, ...Object.fromEntries(CAMPOS_TONO.map((c) => [c, `--tono-org-p${k}-${c}`])) });

const fmt1 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
const aniosTxt = (n) => `${n} ${n === 1 ? 'año' : 'años'}`;
const periodo = (anio, n) => (anio && n > 1 ? `${anio}–${anio + n - 1}` : String(anio ?? ''));
// El logo de la liga de una oferta (o de un club), decorativo: el nombre de la liga va escrito al lado.
const logoDeSuLiga = (x, tam) => pintarLogo(x.liga, { liga: true, tam, alt: '' });
const varsDeTono = (t) => ({ '--h-luz': `var(${t.luz})`, '--h-contra': `var(${t.contra})`, '--h-acento': `var(${t.acento})`, '--h-noche': `var(${t.noche})` });

// La ventana que ya se vio (volvés de negociar o del representante: la misma parada, re-presentada): la llegada no se
// repite, la oferta elegida sigue elegida y los sueldos que cambiaron ruedan desde el de antes.
let ventanaVista = null;
// La oferta que pidió prueba (firmaste y el club te prueba): su tono en la grilla y tu valor de mercado, para la firma
// después de la prueba (`firmaDeLaPrueba`).
let pruebaPendiente = null;

// El tono y tu valor de mercado con que el mercado mostró la oferta de `org` que pidió prueba (los que usa la firma después
// de la prueba). Sin la pantalla del mercado en esta sesión (se retomó en la prueba, o la prueba del amateur), los de
// siempre: el tono de la org y tu valor de hoy.
export function firmaDeLaPrueba(estado, org) {
  if (pruebaPendiente && pruebaPendiente.seed === estado?.seed && pruebaPendiente.org === org) {
    return { tono: pruebaPendiente.tono, valor: pruebaPendiente.valor };
  }
  let valor = 0;
  try {
    valor = valorDeMercado(estado) ?? 0;
  } catch {
    valor = 0;
  }
  return { tono: tonoOrg(org), valor };
}

// ================================================================================================= la hoja del contrato
// La hoja que se firma: la usan la firma del mercado y la firma suelta después de la prueba. `sello`: Firmado, Renovado
// o A prueba; `sigue` y `texto`: la línea del resultado (adónde vas) y la del motor.
function hojaDeContrato({ org, liga, tono, handle, ventana, anio, anios, sueldo, tipo, clausula, traspaso = false, sello, sigue, texto }) {
  const firma = firmaTrazada(handle, 'ms-ct-firma');
  const onda = el('i', { class: 'ms-onda', 'aria-hidden': 'true' });
  const selloNodo = el('span', { class: 'ms-sello', 'aria-hidden': 'true' }, [el('b', { text: sello }), el('span', { text: `${ventana} ${anio ?? ''}`.trim() }), onda]);
  const res = el('div', { class: 'ms-res', tabindex: '-1', 'aria-label': `${sello}: ${org}` }, [
    el('p', { class: 'ms-res-sigue' }, [icono('flecha'), el('span', { text: sigue })]),
    texto ? el('p', { class: 'ms-res-texto', text: texto }) : null
  ]);
  const nodo = el('article', { class: 'ms-contrato', 'data-tono': tono.id, 'aria-label': `Contrato con ${org}`, style: { '--ms-acento': `var(${tono.acento})`, '--ms-luz': `var(${tono.luz})` } }, [
    el('header', { class: 'ms-ct-cab' }, [
      el('span', { class: 'ms-ct-logo' }, pintarLogo(org, { tam: 54, alt: '' })),
      el('div', { class: 'ms-ct-quien' }, [
        el('p', { class: 'ms-ct-k', text: traspaso ? 'Contrato de traspaso' : 'Contrato de jugador profesional' }),
        el('h2', { class: 'ms-ct-t' }, [el('span', { text: org }), el('i', { text: '×' }), el('span', { text: handle })]),
        el('p', { class: 'ms-ct-sub', text: [nombreVisibleDeLiga(liga), periodo(anio, anios), `USD ${num(sueldo)} / año`, tipo ? `${TIPO_DE_CONTRATO[tipo] ?? tipo}${clausula ? ', con cláusula' : ''}` : null].filter(Boolean).join(' · ') })
      ])
    ]),
    el('div', { class: 'ms-ct-firmas' }, [
      el('div', { class: 'ms-ct-parte' }, [el('span', { class: 'ms-ct-sello-org', 'aria-hidden': 'true' }, pintarLogo(org, { tam: 34, alt: '' })), el('i', { class: 'ms-ct-linea' }), el('span', { class: 'ms-ct-firmante', text: `Por ${org}` })]),
      el('div', { class: 'ms-ct-parte ms-ct-vos' }, [firma.nodo, selloNodo, el('i', { class: 'ms-ct-linea' }), el('span', { class: 'ms-ct-firmante', text: `${handle} · el jugador` })])
    ]),
    res
  ]);
  return { nodo, firma, selloNodo, onda, res };
}

// La firma sobre la hoja `h`, en el reloj de beats `bt`: la hoja sube, la firma se traza, cae el sello (el golpe, con su
// pulso y su sonido) y entra el resultado. Con INST o movimiento reducido no hay animaciones: la hoja queda sellada.
function firmarHoja(bt, h, { fx = () => null, sonido = null } = {}) {
  const w = (a) => bt.waapi(a);
  w(animar(h.nodo, [{ opacity: 0, transform: 'translateY(46px) scale(.98)' }, { opacity: 1, transform: 'none' }], { delay: T_FIRMAR.sube, dur: T_FIRMAR.subeDur }));
  [...h.nodo.querySelectorAll('.ms-ct-cab, .ms-ct-parte')].forEach((n, k) => w(entrar(n, T_FIRMAR.sube + 120 + k * 70, 8)));
  w(trazarFirma(h.firma, T_FIRMAR.trazo, T_FIRMAR.trazoDur));
  w(rubricar(h.firma, T_FIRMAR.rubrica, T_FIRMAR.rubricaDur));
  w(animar(h.selloNodo, [
    { opacity: 0, transform: 'rotate(-15deg) scale(2.6)', easing: 'cubic-bezier(.55,0,1,.45)' },
    { opacity: 1, transform: 'rotate(-7deg) scale(.9)', offset: (T_FIRMAR.golpe - T_FIRMAR.sello) / T_FIRMAR.selloDur, easing: EXPO },
    { opacity: 1, transform: 'rotate(-7deg)' }
  ], { delay: T_FIRMAR.sello, dur: T_FIRMAR.selloDur, easing: 'linear' }));
  w(animar(h.onda, [{ opacity: 0, transform: 'scale(1)' }, { opacity: 0.9, transform: 'scale(1)', offset: 0.02 }, { opacity: 0, transform: 'scale(2.8)' }], { delay: T_FIRMAR.golpe, dur: T_FIRMAR.onda }));
  w(animar(h.nodo, [{ translate: '0 0' }, { translate: '0 4px', offset: 0.18 }, { translate: '-3px -1px', offset: 0.42 }, { translate: '2px 1px', offset: 0.7 }, { translate: '0 0' }], { delay: T_FIRMAR.golpe, dur: T_FIRMAR.sacude, easing: 'linear' }));
  const td = bt.destello(T_FIRMAR.golpe);
  if (td != null) fx()?.pulso?.('logro', td);
  bt.esperar(T_FIRMAR.golpe).then((llego) => llego && sonido?.golpe?.());
  w(animar(h.res, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay: T_FIRMAR.resultado, dur: DUR.larga }));
  [...h.res.children].forEach((c, k) => w(entrar(c, T_FIRMAR.resultado + 80 + k * 70, 8)));
}

// Lo que se queda a la vista la hoja sellada, según el modo de la narración (PLANUI §0.3): la secuencia hasta asentarse
// y `sostener` ms más (en rápido, con la escala corta de la narración); con movimiento reducido, un cuadro fijo con su
// fundido corto y su tiempo de lectura.
async function sostenerHoja(bt, narracion, h, sostener) {
  if (narracion.modo === 'reducido') {
    fundirCuadro(h.nodo);
    h.res.focus({ preventScroll: true });
    await narracion.esperar(T_FIRMAR.lectura);
    return;
  }
  await bt.esperar(T_FIRMAR.asentarse);
  h.res.focus({ preventScroll: true });
  if (sostener > 0) await narracion.esperar(sostener);
}

// La firma suelta (PLANUI §0.3, punto 5): después de una prueba que salió, el contrato con el club que te probó se firma
// en `contenedor` (el panel de la prueba: queda ahí, sellado, debajo del fichaje y en la transición al relato), con su
// sello "Firmado" (o "Renovado"), antes del fichaje. `ctx`: el de la narración (`app.js`, `narrarRespuesta`); `f`:
// `fichajeDe(...)`; `tono`: el de la oferta en el mercado (`firmaDeLaPrueba`). Resuelve con la hoja sellada a la vista.
export async function narrarContratoFirmado(ctx, f, { contenedor, tono: tonoDado = null, mundo = null, sonido = null } = {}) {
  if (!f || !contenedor || typeof document === 'undefined') return;
  const tono = tonoDado ?? tonoOrg(f.org);
  const estado = ctx?.despues ?? ctx?.antes ?? null;
  const ventana = LABEL_DE_VENTANA[estado ? ventanaVisibleDe(estado) : null] ?? 'Pretemporada';
  const raiz = el('section', { class: 'ms-suelta', 'aria-label': `Contrato con ${f.org}` });
  aplicarTono(raiz, tono);
  const h = hojaDeContrato({
    org: f.org, liga: f.liga, tono, handle: f.handle, ventana, anio: f.anio, anios: f.anios, sueldo: f.salario, tipo: f.tipo,
    clausula: f.clausula, sello: f.renovacion ? 'Renovado' : 'Firmado',
    sigue: f.renovacion ? `Seguís en ${f.org}` : `Tu nuevo club: ${f.org}`, texto: f.log?.message ?? ''
  });
  raiz.append(el('div', { class: 'ms-suelta-hoja' }, h.nodo));
  contenedor.replaceChildren(raiz);
  mundo?.cruzar?.(tono, paletaDe(tono, 0.6), T_FIRMAR.apaga);
  const bt = crearBeats({ duracion: T_FIRMAR.duracion, asentarse: T_FIRMAR.asentarse });
  const narracion = crearNarracion(ctx, [raiz], { reloj: bt });
  try {
    firmarHoja(bt, h, { fx: () => mundo?.fx?.() ?? null, sonido });
    bt.iniciar();
    await sostenerHoja(bt, narracion, h, T_FIRMAR.sueltaSostener);
  } finally {
    narracion.fin();
    // la hoja queda sellada en su estado de CSS (las animaciones eran todas de entrada): el reloj se suelta
    bt.destruir();
  }
}
const claveDeVentana = (estado, decision) => [estado.seed, estado.calendario?.anio, estado.player?.splitCount, decision.datos?.motivo].join('|');

// Una oferta del motor, en los campos que usa la pantalla.
function normalizar(o) {
  return {
    id: o.id,
    org: o.org,
    liga: o.liga,
    tier: o.tier,
    sueldo: o.salarioAnualUSD ?? 0,
    anios: o.anios ?? 1,
    jer: o.proyeccionJerarquia ?? null,
    plantel: o.plantelEnLiga ?? null,
    tipo: o.datos?.tipo ?? null,
    clausula: Boolean(o.negociacion?.clausula || o.datos?.clausula === 'salida'),
    escalones: o.negociacion?.escalones ?? 0,
    tag: o.tag,
    frente: o.frente ?? null
  };
}

// El día de la ventana en que llega cada oferta y el orden de llegada: los clubes chicos (tier más alto en número) se
// mueven primero y, en su tier, de menor a mayor sueldo; el bombazo cierra la ventana. Los saltos entre días, del azar
// decorativo sembrado con la ventana: el mismo calendario cada vez. La última llega el día VENTANA_DIAS - 1.
function diasDeLlegada(ofertas, semilla) {
  const orden = ofertas.map((_, i) => i).sort((a, b) => {
    const A = ofertas[a];
    const B = ofertas[b];
    return (A.tag === 'bombazo') - (B.tag === 'bombazo') || (B.tier ?? 0) - (A.tier ?? 0) || (A.salarioAnualUSD ?? 0) - (B.salarioAnualUSD ?? 0) || a - b;
  });
  const dias = ofertas.map(() => 1);
  if (ofertas.length < 2) return { dias, orden };
  const azar = crearAzar(`ventana|${semilla}|${ofertas.map((o) => o.org).join('|')}`);
  const pesos = orden.slice(1).map(() => azar.entre(LLEGADA_PESO.min, LLEGADA_PESO.max));
  const total = pesos.reduce((a, b) => a + b, 0);
  const tramo = VENTANA_DIAS - 2;
  let acum = 0;
  let previo = 1;
  orden.forEach((i, k) => {
    if (!k) return;
    acum += pesos[k - 1];
    previo = Math.min(VENTANA_DIAS - 1, Math.max(previo + 1, 1 + Math.round((acum / total) * tramo)));
    dias[i] = previo;
  });
  return { dias, orden };
}

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

// El sello de una carta (la de la pila o el papel al frente): cae al pie con el golpe a los 70 % de `dur`, que llega en `t`.
function sellarCarta(c, { w, t, texto, dur }) {
  c.querySelector('.ms-carta-firmada')?.remove();
  const f = el('span', { class: 'ms-carta-firmada', 'aria-hidden': 'true', text: texto });
  c.querySelector('.ms-carta-pie')?.append(f);
  c.classList.add('ms-carta-sellada');
  // el sello de la firma toma el lugar del sello redondo del club: el del club se va con el golpe (no se pisan)
  const delClub = c.querySelector('.ms-carta-sello');
  if (delClub) {
    delClub.style.opacity = '0';
    w(animar(delClub, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.7)' }], { delay: Math.max(0, t - dur * 0.25), dur: dur * 0.5, easing: 'ease-in' }));
  }
  w(animar(f, [{ opacity: 0, transform: 'rotate(-14deg) scale(2.4)', easing: 'cubic-bezier(.55,0,1,.45)' }, { opacity: 1, transform: 'rotate(-9deg) scale(.92)', offset: 0.7, easing: EXPO }, { opacity: 1, transform: 'rotate(-9deg)' }], { delay: Math.max(0, t - dur * 0.7), dur, easing: 'linear' }));
  return f;
}

// ================================================================================================= la pila de cartas
// Las ofertas como cartas formales: el membrete (la banda en la noche de la org, con su escudo), a quién va, los términos y
// el sello. Caen sobre la pila en el orden en que llegan (la última, arriba); apuntar una org la saca de la pila y la pone
// al frente; al soltar vuelve a su lugar. Los giros y corrimientos, del azar decorativo.
function pilaDeCartas({ ofertas, norm, tonos, yo, dias, orden, semilla, orgActual = null }) {
  const id = `ms-carta-${semilla}`.replace(/\W/g, '');
  const azar = crearAzar(`cartas|${semilla}`);
  const altura = ofertas.map(() => 0);
  orden.forEach((i, k) => (altura[i] = k + 1));
  const pila = ofertas.map(() => ({ r: azar.entre(-CARTA.giro, CARTA.giro), dx: azar.entre(-CARTA.dx, CARTA.dx), dy: azar.entre(-CARTA.dy, CARTA.dy) }));
  const enPila = (i, extra = {}) => `translate(${(pila[i].dx + (extra.dx ?? 0)).toFixed(1)}px, ${(pila[i].dy + (extra.dy ?? 0)).toFixed(1)}px) rotate(${(pila[i].r + (extra.r ?? 0)).toFixed(2)}deg) scale(${extra.s ?? 1})`;
  const sale = (i) => `translate(${CARTA.sale.x}%, ${CARTA.sale.y}%) rotate(${(pila[i].r + CARTA.sale.giro).toFixed(2)}deg)`;
  const frente = `translate(${CARTA.alFrente.x}%, ${CARTA.alFrente.y}%) rotate(${CARTA.alFrente.giro}deg) scale(${CARTA.alFrente.escala})`;
  const fila = (k, v) => el('div', { class: 'ms-carta-fila' }, [el('dt', { text: k }), el('dd', { text: v })]);
  const cartas = ofertas.map((o, i) => {
    const x = norm[i];
    const anillo = svg('svg', { class: 'ms-carta-anillo', viewBox: '0 0 100 100', 'aria-hidden': 'true' }, [
      svg('defs', {}, svg('path', { id: `${id}-sello-${i}`, d: `M 50 ${50 - CARTA_SELLO.r} a ${CARTA_SELLO.r} ${CARTA_SELLO.r} 0 1 1 -0.01 0` })),
      svg('circle', { class: 'ms-carta-aro', cx: '50', cy: '50', r: String(CARTA_SELLO.r + 8) }),
      svg('circle', { class: 'ms-carta-aro', cx: '50', cy: '50', r: String(CARTA_SELLO.r - 8) }),
      svg('text', { class: 'ms-carta-sello-txt' }, svg('textPath', { href: `#${id}-sello-${i}`, startOffset: '0' }, document.createTextNode(`${o.org} · ${nombreVisibleDeLiga(o.liga)} · ${yo.anio ?? ''} · `.toUpperCase()))),
      svg('text', { class: 'ms-carta-sello-ini', x: '50', y: '57', 'text-anchor': 'middle' }, document.createTextNode(iniciales(o.org)))
    ]);
    return el('article', { class: 'ms-carta', 'data-i': String(i), style: { ...varsDeTono(tonos[i]), zIndex: String(altura[i]), transform: enPila(i) } }, [
      el('header', { class: 'ms-carta-membrete' }, [
        el('span', { class: 'ms-carta-escudo' }, pintarLogo(o.org, { tam: 44, alt: '' })),
        el('div', { class: 'ms-carta-quien' }, [el('b', { class: 'ms-carta-org', text: o.org }), el('span', { class: 'ms-carta-liga' }, [logoDeSuLiga(o, 12), `${nombreVisibleDeLiga(o.liga)}${o.tier ? ` · tier ${o.tier}` : ''}`])]),
        dias ? el('span', { class: 'ms-carta-dia', text: `Día ${dias[i]}` }) : null
      ]),
      el('div', { class: 'ms-carta-cuerpo' }, [
        nodoEtiquetas(o, orgActual, 'ms-etqs ms-carta-etqs'),
        el('p', { class: 'ms-carta-k', text: `Oferta de contrato · ${yo.ventana} ${yo.anio ?? ''}`.trim() }),
        el('p', { class: 'ms-carta-para' }, ['Para ', el('b', { text: yo.handle }), yo.rolEtiqueta ? ` · ${yo.rolEtiqueta}` : '']),
        o.descripcion || o.motivoDemanda ? el('p', { class: 'ms-carta-texto', text: [o.descripcion, o.motivoDemanda ? `Te quieren: ${o.motivoDemanda}.` : null].filter(Boolean).join(' ') }) : null,
        el('dl', { class: 'ms-carta-terminos' }, [
          x.frente ? null : fila('Sueldo', `USD ${num(x.sueldo)} / año`),
          fila('Contrato', `${aniosTxt(x.anios)} · ${periodo(yo.anio, x.anios)}`),
          x.tipo ? fila('Modalidad', `${TIPO_DE_CONTRATO[x.tipo] ?? x.tipo}${x.clausula ? ', con cláusula' : ''}`) : null,
          x.jer ? fila('Jerarquía', `${x.jer.hasta} de 100, proyectada`) : null,
          x.plantel ? fila('Plantel', `${x.plantel.puesto}.º de ${x.plantel.de} en ${nombreVisibleDeLiga(x.plantel.liga ?? o.liga)}`) : null
        ]),
        nodoEjes(o, 'ms-ejes ms-carta-ejes'),
        el('footer', { class: 'ms-carta-pie' }, [
          el('div', { class: 'ms-carta-firmas' }, [
            el('div', { class: 'ms-carta-firma' }, [el('i'), el('span', { text: `Por ${o.org}` })]),
            el('div', { class: 'ms-carta-firma ms-carta-vos' }, [el('i'), el('span', { text: `${yo.handle} · el jugador` })])
          ]),
          el('span', { class: 'ms-carta-sello' }, anillo)
        ])
      ])
    ]);
  });
  const bandeja = el('div', { class: 'ms-cartas-bandeja' }, el('span', { text: 'La bandeja de ofertas' }));
  const nodo = el('div', { class: 'ms-cartas' }, [bandeja, ...cartas]);
  let alFrente = null;
  function mostrar(i, { animado = true } = {}) {
    if (i === alFrente) return;
    const antes = alFrente;
    alFrente = i;
    if (antes != null) {
      const c = cartas[antes];
      c.classList.remove('al-frente');
      c.style.zIndex = String(altura[antes]);
      c.style.transform = enPila(antes);
      if (animado) animar(c, [{ transform: frente, zIndex: CARTA.frente }, { transform: sale(antes), zIndex: CARTA.frente, offset: CARTA.corte }, { transform: sale(antes), zIndex: altura[antes], offset: CARTA.corte + 0.01 }, { transform: enPila(antes), zIndex: altura[antes] }], { dur: CARTA.mueve });
    }
    if (i != null) {
      const c = cartas[i];
      c.classList.add('al-frente');
      c.style.zIndex = String(CARTA.frente);
      c.style.transform = frente;
      if (animado) animar(c, [{ transform: enPila(i), zIndex: altura[i] }, { transform: sale(i), zIndex: altura[i], offset: CARTA.corte }, { transform: sale(i), zIndex: CARTA.frente, offset: CARTA.corte + 0.01 }, { transform: frente, zIndex: CARTA.frente }], { dur: CARTA.mueve });
    }
  }
  // La llegada: cada carta cae sobre la pila en su día (acelera, golpea, se asienta); la bandeja vacía se va con la primera.
  function llegada({ w, tCae, tToca }) {
    const D = T_LL.cae + T_LL.asienta;
    const toca = T_LL.cae / D;
    cartas.forEach((c, i) => w(animar(c, [
      { opacity: 0, transform: enPila(i, { dy: -CARTA.caida, r: -CARTA.giroCaida, s: 1.05 }), easing: 'cubic-bezier(.5,0,.85,.4)' },
      { opacity: 1, transform: enPila(i, { dy: -CARTA.caida * 0.8, r: -CARTA.giroCaida * 0.8, s: 1.05 }), offset: 0.14, easing: 'cubic-bezier(.5,0,.85,.4)' },
      { opacity: 1, transform: enPila(i, { dy: 3, s: 0.99 }), offset: toca, easing: EXPO },
      { opacity: 1, transform: enPila(i) }
    ], { delay: tCae[i], dur: D, easing: 'linear' })));
    w(animar(bandeja, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { delay: T_LL.heroe, dur: Math.max(DUR.larga, Math.min(...tToca) - T_LL.heroe), easing: 'linear', fill: 'none' }));
  }
  // FIRMAR: la carta de la org elegida (al frente) recibe su sello con el golpe, al pie (sobre el sello de la org, nunca
  // sobre los términos). `dur`: lo que tarda en caer (el golpe, al 70 %).
  function firmar(i, { w, t, texto, dur = T_FIRMAR.selloDur }) {
    const c = cartas[i];
    if (!c) return null;
    return sellarCarta(c, { w, t, texto, dur });
  }
  return { nodo, mostrar, llegada, firmar, carta: (i) => cartas[i] ?? null, cartas };
}

// ================================================================================================= la pantalla
// `ctx`: { estado, mundo, sonido, responder, controlar, retomar }. Devuelve { nodo, titulo, mundo, entrar(), narrar(ctx),
// destruir() }.
export function crearMercado(contenedor, decision, { estado, mundo = null, sonido = null, responder, controlar = null, retomar = false }) {
  const datos = decision.datos ?? {};
  const traspaso = datos.motivo === 'traspaso';
  // las ofertas (en un traspaso, una sola: la del club que te quiere, que traen aceptar y pedir salir)
  const caminos = traspaso ? decision.opciones : [];
  const ofertas = traspaso ? [decision.opciones.find((o) => o.org)].filter(Boolean) : decision.opciones;
  const norm = ofertas.map(normalizar);
  const orgActual = estado.career?.currentOrg ?? null;
  const vos = datos.vos ?? {};
  const valor = vos.valorUSD ?? 0;
  const rol = estado.player?.role ?? 'mid';
  const yo = {
    handle: estado.player?.name ?? '',
    rol,
    rolEtiqueta: ROLES[rol]?.label ?? '',
    anio: estado.calendario?.anio ?? null,
    edad: estado.age,
    ventana: LABEL_DE_VENTANA[ventanaVisibleDe(estado)] ?? 'Pretemporada'
  };
  const inventadas = ofertas.filter((o) => !logoOrg(o.org).src).map((o) => o.org);
  const tonos = ofertas.map((o) => (inventadas.includes(o.org) ? tonoPaleta((inventadas.indexOf(o.org) % PALETAS_ORG) + 1) : tonoOrg(o.org)));
  const maxSueldo = Math.max(1, ...norm.map((x) => x.sueldo));
  const semilla = `${estado.seed}|${yo.anio}|${estado.player?.splitCount}`;
  const { dias, orden } = diasDeLlegada(ofertas, semilla);
  const tCae = dias.map((d) => T_LL.reloj + (d - 1) * T_LL.dia);
  const tToca = tCae.map((t) => t + T_LL.cae);
  const diaFinal = Math.max(...dias, 1);
  const asentarseLl = Math.max(...tToca, 0) + T_LL.asienta + T_LL.final;
  const clave = claveDeVentana(estado, decision);
  const vista = ventanaVista?.clave === clave ? ventanaVista : null;
  ventanaVista = { clave, sueldos: new Map(norm.map((x) => [x.id, x.sueldo])), elegida: vista?.elegida ?? null };
  const conLlegada = !traspaso && !retomar && !vista && !quieto();
  const fx = () => mundo?.fx?.() ?? null;
  const html = document.documentElement;
  const tonoReposo = () => tonoEra(html.dataset.era);

  const raiz = el('section', { class: 'ms-mercado', 'data-forma': traspaso ? 'traspaso' : 'ofertas', 'data-heroe': '', style: { '--ms-cols': String(Math.max(4, ofertas.length)) } });
  let vivo = true;
  let elegido = false; // ya se respondió (firmar, un camino, negociar, esperar)
  let entrando = false;
  let elegida = -1;
  let mostrada = null;
  let tAura = 0;
  let beats = null;
  let soltarControl = () => {};
  let respuesta = null; // { tipo: 'firmar' | 'camino' | 'negociar' | 'representante' | 'esperar', i }

  // ---------------------------------------------------------------------------------------------- armar
  const bumper = el('div', { class: 'ms-bumper', 'aria-hidden': 'true' }, [
    el('i', { class: 'ms-bumper-banda' }),
    el('p', { class: 'ms-bumper-txt' }, [el('span', { text: 'Ventana de pases' }), el('b', { text: 'abierta' })]),
    el('p', { class: 'ms-bumper-sub', text: `${yo.ventana} ${yo.anio ?? ''} · ${VENTANA_DIAS} días · buscan ${yo.rolEtiqueta || 'tu rol'}` })
  ]);
  const lineaLuz = el('i', { class: 'ms-linea-luz', 'aria-hidden': 'true' });
  // el reloj de la ventana (decorativo: la grilla y el rótulo dicen cuántas llegaron)
  const celdas = Array.from({ length: VENTANA_DIAS }, (_, k) => el('li', { class: 'ms-reloj-d' }, ofertas.map((o, i) => (dias[i] === k + 1 ? el('i', { class: 'ms-reloj-marca', 'data-i': String(i), style: { '--ms-acento': `var(${tonos[i].acento})` } }) : null))));
  const relojN = el('b', { class: 'ms-reloj-n', text: String(conLlegada ? 1 : diaFinal).padStart(2, '0') });
  const relojUlt = el('p', { class: 'ms-reloj-ult' });
  const reloj = traspaso ? null : el('div', { class: 'ms-reloj', 'aria-hidden': 'true' }, [
    el('p', { class: 'ms-reloj-k' }, [el('span', { text: 'Ventana de pases' }), el('span', { class: 'ms-reloj-de', text: `${VENTANA_DIAS} días` })]),
    el('div', { class: 'ms-reloj-fila' }, [el('p', { class: 'ms-reloj-dia' }, [el('span', { text: 'Día' }), relojN]), el('ol', { class: 'ms-reloj-dias' }, celdas)]),
    relojUlt
  ]);
  // la derecha: las cartas (sin campeón)
  const heroe = pilaDeCartas({ ofertas, norm, tonos, yo, dias: traspaso ? null : dias, orden, semilla, orgActual });
  const heroeNodo = el('aside', { class: 'ms-heroe', 'aria-hidden': 'true' }, el('div', { class: 'ms-heroe-in ms-h-ofertas' }, heroe.nodo));
  // el aura
  const velo = el('div', { class: 'ms-velo', 'aria-hidden': 'true' });
  const aura = el('section', { class: 'ms-aura', 'aria-live': 'polite', 'aria-label': 'La oferta apuntada' });
  // el panel
  const [primera, resto] = partirTexto(decision.descripcion ?? '');
  const btnMas = resto ? el('button', { type: 'button', class: 'btn-mas', 'aria-expanded': 'false', text: 'más' }) : null;
  const planteo = el('p', { class: 'planteo ms-planteo' }, [el('span', { class: 'planteo-1', text: primera }), resto ? el('span', { class: 'planteo-resto', text: ` ${resto}` }) : null, btnMas]);
  btnMas?.addEventListener('click', () => {
    const a = !planteo.classList.contains('abierto');
    planteo.classList.toggle('abierto', a);
    btnMas.setAttribute('aria-expanded', String(a));
    btnMas.textContent = a ? 'menos' : 'más';
  });
  const rotN = el('span', { class: 'bisagra ms-rot-n', text: traspaso ? 'a mitad de contrato' : `${ofertas.length} ${ofertas.length === 1 ? 'oferta' : 'ofertas'}` });
  const rotulo = el('p', { class: 'rotulo-cat' }, [el('i', { class: 'punto-luz' }), el('span', { text: 'Mercado' }), el('span', { class: 'bisagra', text: `${yo.ventana} ${yo.anio ?? ''}`.trim() }), rotN]);
  const titulo = el('h1', { class: 'titulo-parada ms-titulo', id: 'mercadoTitulo', tabindex: '-1', text: decision.titulo });
  const cab = el('header', { class: 'ms-cab' }, [
    el('div', { class: 'ms-cab-t' }, [rotulo, titulo, planteo]),
    traspaso ? null : el('div', { class: 'ms-cab-der' }, reloj)
  ]);

  // la grilla de escudos (las ofertas) o los caminos (el traspaso)
  const escudos = traspaso ? [] : ofertas.map((o, i) => {
    const x = norm[i];
    const t = tonos[i];
    const desc = el('span', { class: 'solo-lectores', id: `ms-desc-${i}` }, [
      `USD ${num(x.sueldo)} por año, ${aniosTxt(x.anios)}`,
      x.jer ? `, jerarquía proyectada ${x.jer.hasta} de 100` : '',
      x.plantel ? `, ${x.plantel.puesto}.º de ${x.plantel.de} en su liga` : '',
      '.'
    ]);
    const etq = etiquetasDeOferta(o, orgActual)[0] ?? null;
    const tag = etq ? etq.texto : null;
    return el('button', { type: 'button', class: 'ms-op', 'data-atajo': i < 9 ? String(i + 1) : null, 'data-tono': t.id, 'aria-pressed': 'false', 'aria-keyshortcuts': i < 9 ? String(i + 1) : null, 'aria-label': `${o.org}, ${nombreVisibleDeLiga(o.liga)}${o.tier ? `, tier ${o.tier}` : ''}${tag ? `, ${tag.toLowerCase()}` : ''}`, 'aria-describedby': desc.id, style: { '--ms-acento': `var(${t.acento})`, '--ms-luz': `var(${t.luz})` } }, [
      el('span', { class: 'ms-op-vacio', 'aria-hidden': 'true' }, escudo('?')),
      el('span', { class: 'ms-op-tecla', 'aria-hidden': 'true', text: String(i + 1) }),
      tag ? el('span', { class: 'ms-op-tag', 'data-tag': o.tag, 'data-etq': etq.clave, text: tag }) : null,
      el('span', { class: 'ms-op-cresta' }, pintarLogo(o.org, { tam: 54, alt: '' })),
      el('span', { class: 'ms-op-txt' }, [
        el('b', { class: 'ms-op-org', text: o.org }),
        el('span', { class: 'ms-op-liga' }, [logoDeSuLiga(o, 13), nombreVisibleDeLiga(o.liga), o.tier ? ` · T${o.tier}` : ''])
      ]),
      el('span', { class: 'ms-op-barras', 'aria-hidden': 'true' }, [
        el('i', { class: 'ms-op-barra ms-op-sueldo', style: { '--v': (x.sueldo / maxSueldo).toFixed(3) } }),
        el('i', { class: 'ms-op-barra ms-op-jer', style: { '--v': ((x.jer?.hasta ?? 0) / 100).toFixed(3) } })
      ]),
      el('i', { class: 'ms-op-borde', 'aria-hidden': 'true' }),
      el('i', { class: 'ms-op-estela', 'aria-hidden': 'true' }),
      el('i', { class: 'ms-op-polvo', 'aria-hidden': 'true' }),
      desc
    ]);
  });
  const filasCamino = caminos.map((c, i) => el('button', { type: 'button', class: 'ms-camino', 'data-atajo': String(i + 1), 'data-tipo': c.tipo, 'aria-keyshortcuts': String(i + 1) }, [
    el('span', { class: 'op-tecla', 'aria-hidden': 'true', text: String(i + 1) }),
    el('span', { class: 'ms-camino-t' }, [el('b', { text: c.label }), c.descripcion ? el('span', { text: c.descripcion }) : null])
  ]));
  const grilla = traspaso
    ? el('div', { class: 'ms-caminos', role: 'group', 'aria-label': 'Qué hacés' }, filasCamino)
    : el('div', { class: 'ms-grilla', role: 'group', 'aria-label': `Ofertas: elegí tu equipo (1 a ${Math.min(ofertas.length, 9)})` }, escudos);
  const ranura = el('div', { class: 'ms-ranura' });
  const inspector = el('div', { class: 'ms-insp', 'aria-live': 'polite' });
  const boton = bloquear({ texto: 'Firmar', tecla: null, sonido, alBloquear: () => firmar(elegida) });
  boton.nodo.setAttribute('aria-keyshortcuts', 'Enter');
  boton.nodo.append(el('kbd', { 'aria-hidden': 'true', text: 'Enter' }));
  boton.habilitar(false);
  // la negociación de la oferta elegida, junto a FIRMAR (pedir más, pedir cláusula)
  const negociar = el('div', { class: 'ms-negociar' });
  const firmarCaja = traspaso ? null : el('div', { class: 'ms-firmar' }, [boton.nodo, negociar]);
  // lo de abajo: los clubes que te siguen (si el representante ya habló), el representante y no firmar
  const interesados = datos.clubesInteresados ?? [];
  const btnRepresentante = !traspaso && datos.representanteDisponible
    ? el('button', { type: 'button', class: 'btn-mas ms-otra', title: 'Te dice qué clubes te siguen sin haber ofertado. Una vez por carrera.' }, [icono('chat'), 'Llamar al representante'])
    : null;
  // G3b: en la segunda ventana seguida sin club no hay "no firmar" (`datos.sinEsperar`): firmás.
  const btnEsperar = traspaso || datos.sinEsperar ? null : el('button', { type: 'button', class: 'btn-mas ms-otra', title: 'Esta ventana no firmás con nadie.' }, 'No firmar esta ventana');
  const otras = traspaso ? null : el('div', { class: 'ms-otras' }, [
    el('p', { class: 'ms-leyenda', 'aria-hidden': 'true' }, [el('span', {}, [el('i', { class: 'ms-ley-sueldo' }), el('span', { text: 'sueldo / año' })]), el('span', {}, [el('i', { class: 'ms-ley-jer' }), el('span', { text: 'jerarquía proyectada' })])]),
    interesados.length ? el('p', { class: 'ms-siguen' }, [el('span', { class: 'ms-siguen-k', text: 'Te siguen sin ofertar' }), ...interesados.map((x) => el('span', { class: 'ms-siguen-org', title: x.motivo ?? '' }, [pintarLogo(x.org, { tam: 16, alt: '' }), x.org]))]) : null,
    el('span', { class: 'ms-otras-botones' }, [btnRepresentante, btnEsperar])
  ]);
  const cierre = el('footer', { class: 'ms-cierre' }, [ranura, inspector, firmarCaja, otras]);
  const panel = el('section', { class: 'panel ms-panel', 'aria-labelledby': 'mercadoTitulo' }, [cab, grilla, cierre]);
  // "mientras tanto": la cinta de la transmisión
  const yaNombrados = new Set(interesados.map((x) => x.org));
  const items = [
    ...(datos.traspasosMundo ?? []).map((t) => ({ texto: t.motivo, logo: pintarLogo(t.org, { tam: 22, alt: '' }) })),
    ...(datos.asientosAbiertos ?? []).filter((a) => !yaNombrados.has(a.org)).map((a) => ({ texto: `${a.org} (${nombreVisibleDeLiga(a.liga)}) tiene un asiento abierto en tu puesto`, logo: pintarLogo(a.org, { tam: 22, alt: '' }) }))
  ];
  const tira = items.length ? el('div', { class: 'ms-cinta' }, cinta({ rotulo: 'Mientras tanto', items })) : null;
  raiz.append(...[velo, aura, heroeNodo, panel, tira, conLlegada ? bumper : null, conLlegada ? lineaLuz : null].filter(Boolean));
  contenedor.replaceChildren(raiz);

  // ---------------------------------------------------------------------------------------------- el aura
  const terminoNodo = (t) => el('div', { class: 'ms-termino', 'data-t': t.id ?? null }, [
    el('dt', { class: 'ms-termino-k', text: t.k }),
    el('dd', { class: 'ms-termino-v' }, [el('b', { class: 'ms-num', text: t.n }), t.u ? el('span', { class: 'ms-unidad', text: t.u }) : null]),
    t.ref ? el('dd', { class: 'ms-ref', text: t.ref }) : null
  ]);
  function terminosDe(i) {
    const x = norm[i];
    const pl = PLANTEL[x.plantel?.banda] ?? null;
    return [
      { id: 'sueldo', k: 'Sueldo', n: num(x.sueldo), u: 'USD / año', ref: x.frente?.hasta ? `hasta USD ${num(x.frente.hasta)}` : (valor ? `${fmt1.format(x.sueldo / valor)}× tu valor (${num(valor)})` : null) },
      { k: 'Contrato', n: String(x.anios), u: x.anios === 1 ? 'año' : 'años', ref: periodo(yo.anio, x.anios) },
      x.jer ? { k: 'Jerarquía', n: String(x.jer.hasta), u: 'de 100', ref: ['proyectada', x.jer.etiqueta ? x.jer.etiqueta.toLowerCase() : null].filter(Boolean).join(' · ') } : null,
      x.plantel ? { k: 'Plantel', n: `${x.plantel.puesto}.º`, u: `de ${x.plantel.de}`, ref: pl?.largo ?? null } : null
    ].filter(Boolean);
  }
  // los términos del reposo que dependen de cuántas llegaron: cuántos te llaman y la más alta
  function terminosLlegadas(ya) {
    const mejor = ya.reduce((a, i) => (a == null || norm[i].sueldo > norm[a].sueldo ? i : a), null);
    const o = mejor == null ? null : ofertas[mejor];
    return [
      { id: 'llaman', k: 'Te llaman', n: String(ya.length), u: ya.length === 1 ? 'club' : 'clubes', ref: `buscan ${yo.rolEtiqueta || 'tu rol'}` },
      { id: 'alta', k: 'La más alta', n: o ? num(norm[mejor].sueldo) : '—', u: 'USD / año', ref: !o ? 'esperando ofertas' : valor ? `${fmt1.format(norm[mejor].sueldo / valor)}× tu valor · ${o.org}` : o.org }
    ];
  }
  function pintarAura(i, { animado = true } = {}) {
    aura.dataset.estado = i == null ? 'reposo' : 'org';
    let escudoNodo;
    let nombre;
    let kicker;
    let terminos;
    if (i == null) {
      const c = vos.contrato;
      const restante = c ? (c.aniosRestantes <= 0 ? 'vence ahora' : `${aniosTxt(c.aniosRestantes)} de contrato`) : null;
      escudoNodo = el('span', { class: 'ms-aura-escudo ms-aura-vacio' }, escudo('?'));
      kicker = [el('span', { text: c ? `${c.org} · ${restante}` : 'Agente libre' }), Number.isFinite(yo.edad) ? el('span', { text: `${yo.edad} años` }) : null, yo.rolEtiqueta ? el('span', { text: yo.rolEtiqueta }) : null];
      nombre = 'Elegí tu equipo';
      terminos = [{ k: 'Tu valor', n: valor ? num(valor) : '—', u: 'USD', ref: c ? `con contrato: USD ${num(c.salarioUSD)} / año` : 'sin contrato: agente libre' }, ...terminosLlegadas(llegadas())];
    } else {
      const o = ofertas[i];
      const x = norm[i];
      escudoNodo = el('span', { class: 'ms-aura-escudo' }, pintarLogo(o.org, { tam: 172, alt: '' }));
      kicker = [
        el('span', {}, [logoDeSuLiga(o, 16), nombreVisibleDeLiga(o.liga)]),
        o.tier ? el('span', { text: `tier ${o.tier}` }) : null,
        x.tipo ? el('span', { text: `${TIPO_DE_CONTRATO[x.tipo] ?? x.tipo}${x.clausula ? ', con cláusula' : ''}` }) : null,
        traspaso ? el('span', { text: 'te quiere a mitad de contrato' }) : el('span', { text: `oferta ${i + 1} de ${ofertas.length}` }),
        null
      ];
      nombre = o.org;
      terminos = terminosDe(i);
    }
    const nom = el('h2', { class: 'ms-aura-nombre', 'aria-label': nombre }, [...String(nombre)].map((c) => el('span', { class: 'ms-aura-letra', 'aria-hidden': 'true', text: c })));
    const k = el('p', { class: 'ms-aura-k' }, kicker.filter(Boolean));
    const dl = el('dl', { class: 'ms-terminos' }, terminos.map(terminoNodo));
    const etqs = i >= 0 && ofertas[i] ? nodoEtiquetas(ofertas[i], orgActual, 'ms-etqs ms-aura-etqs') : null;
    aura.replaceChildren(el('div', { class: 'ms-aura-cab' }, [escudoNodo, el('div', { class: 'ms-aura-t' }, [etqs, k, nom])]), dl);
    ajustarLetra(nom);
    if (!animado || quieto()) return;
    animar(escudoNodo, [{ opacity: 0, transform: 'scale(.86)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], { dur: 360 });
    nom.querySelectorAll('.ms-aura-letra').forEach((l, j) => animar(l, [{ opacity: 0, transform: 'translateY(34%)' }, { opacity: 1, transform: 'none' }], { delay: 40 + j * T_MS.letra, dur: 300 }));
    animar(k, [{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }], { delay: 60, dur: 280 });
    dl.querySelectorAll('.ms-termino').forEach((t, j) => animar(t, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay: 120 + j * 50, dur: 300 }));
  }

  // ---------------------------------------------------------------------------------------------- la llegada en el tiempo
  // El tiempo de la llegada: el del reloj mientras entra; fuera de la entrada, todas llegaron.
  const tLlegada = () => (entrando && beats && !beats.quieto ? beats.ahora() : Infinity);
  const llego = (i) => tToca[i] <= tLlegada();
  const llegadas = (t = tLlegada()) => ofertas.map((_, i) => i).filter((i) => tToca[i] <= t);
  let ultDia = -1;
  let ultN = -1;
  function pintarLlegadas(t) {
    const ya = llegadas(t);
    escudos.forEach((b, i) => {
      const si = ya.includes(i);
      b.dataset.llego = si ? '1' : '0';
      if (si) b.removeAttribute('aria-disabled');
      else b.setAttribute('aria-disabled', 'true');
    });
    reloj?.querySelectorAll('.ms-reloj-marca').forEach((x) => x.classList.toggle('llego', ya.includes(Number(x.dataset.i))));
    if (!traspaso) rotN.textContent = `${ya.length} ${ya.length === 1 ? 'oferta' : 'ofertas'}`;
    const ult = ya.length ? ya.reduce((a, i) => (tToca[i] > tToca[a] ? i : a)) : null;
    relojUlt.replaceChildren(...(ult == null ? [el('span', { text: 'Esperando ofertas' })] : ya.length === ofertas.length ? [el('b', { text: `${ya.length} ${ya.length === 1 ? 'oferta' : 'ofertas'}` }), ` en ${diaFinal} ${diaFinal === 1 ? 'día' : 'días'}`] : [pintarLogo(ofertas[ult].org, { tam: 16, alt: '' }), el('span', { text: 'Llegó ' }), el('b', { text: ofertas[ult].org })]));
    if (mostrada != null || aura.dataset.estado !== 'reposo') return;
    for (const x of terminosLlegadas(ya)) {
      const nodo = aura.querySelector(`[data-t='${x.id}']`);
      if (!nodo) continue;
      nodo.querySelector('.ms-num').textContent = x.n;
      const u = nodo.querySelector('.ms-unidad');
      if (u) u.textContent = x.u;
      const r = nodo.querySelector('.ms-ref');
      if (r) r.textContent = x.ref;
    }
  }

  // ---------------------------------------------------------------------------------------------- el cierre del panel
  function pintarCierre(i) {
    if (traspaso) {
      ranura.replaceChildren(el('span', { class: 'ms-ranura-cara' }, pintarLogo(ofertas[0]?.org ?? '', { tam: 40, alt: '' })), el('span', { class: 'ms-ranura-t' }, [el('span', { class: 'ms-ranura-k', text: 'Te quiere' }), el('b', { text: ofertas[0]?.org ?? '' })]));
      inspector.replaceChildren(el('p', { class: 'ms-insp-texto', text: datos.conClausula ? 'Tenés cláusula de salida: si aceptás, te vas.' : 'Si aceptás, tu club decide si te suelta; si pedís salir, empujás, pero si te lo niegan se resiente el clima.' }));
      return;
    }
    if (i < 0) {
      ranura.replaceChildren(el('span', { class: 'ms-ranura-cara ms-ranura-libre', 'aria-hidden': 'true' }, escudo('?')), el('span', { class: 'ms-ranura-t' }, [el('span', { class: 'ms-ranura-k', text: 'Tu equipo' }), el('b', { text: vos.contrato?.org && vos.contrato.aniosRestantes > 0 ? vos.contrato.org : 'Libre' })]));
      inspector.replaceChildren(el('p', { class: 'ms-insp-texto', text: `Apuntá un escudo para verte en ese equipo. 1 a ${Math.min(ofertas.length, 9)} eligen; Enter firma.` }));
      negociar.replaceChildren();
      boton.habilitar(false);
      return;
    }
    const o = ofertas[i];
    const x = norm[i];
    const pl = PLANTEL[x.plantel?.banda] ?? PLANTEL.medio;
    ranura.replaceChildren(el('span', { class: 'ms-ranura-cara' }, pintarLogo(o.org, { tam: 40, alt: '' })), el('span', { class: 'ms-ranura-t' }, [el('span', { class: 'ms-ranura-k', text: 'Tu equipo' }), el('b', { text: o.org })]));
    const hito = lineaDeHitoDeOferta(o);
    const info = o.negociacionInfo;
    const puedePedirMas = info && x.escalones < info.escalonesMax;
    negociar.replaceChildren(...[
      puedePedirMas ? el('button', { type: 'button', class: 'btn-mas', title: info.riesgoTexto ?? '', onclick: () => negociar1(i, 'pedirMas') }, [icono('mercado'), 'Pedir más']) : null,
      !x.clausula ? el('button', { type: 'button', class: 'btn-mas', title: 'Una cláusula de salida: si después te quiere uno grande, te podés ir.', onclick: () => negociar1(i, 'clausula') }, [icono('candado'), 'Pedir cláusula']) : null
    ].filter(Boolean));
    inspector.replaceChildren(
      el('p', { class: 'ms-insp-texto', text: [o.descripcion, lineaDeMotivoDeOferta(o)].filter(Boolean).join(' ') }),
      nodoEjes(o),
      el('ul', { class: 'ms-insp-previa' }, [
        o.riesgo ? el('li', {}, [icono(pl.ico), o.riesgo]) : null,
        !x.frente && o.costeArraigo?.pierde > 0 ? el('li', { class: 'ms-extra' }, [icono('arraigo'), o.costeArraigo.etiqueta]) : null,
        !x.frente && o.arraigoInicial ? el('li', {}, [icono('arraigo'), o.arraigoInicial.etiqueta]) : null,
        !x.frente && hito ? el('li', {}, [icono('meta'), hito]) : null,
        o.proyeccionPicks ? el('li', { class: 'ms-extra' }, [icono('jerarquia'), o.proyeccionPicks]) : null,
        x.escalones > 0 ? el('li', {}, [icono('mercado'), `Pediste más ${x.escalones === 1 ? 'una vez' : `${x.escalones} veces`}`]) : null,
        x.clausula ? el('li', {}, [icono('candado'), 'Con cláusula de salida']) : null,
        puedePedirMas && info.riesgoTexto ? el('li', { class: 'ms-insp-riesgo ms-extra' }, [icono('incierto'), info.riesgoTexto]) : null
      ])
    );
    boton.habilitar(true);
  }

  // ---------------------------------------------------------------------------------------------- apuntar y elegir
  // La luz: la interfaz y el mundo cruzan al tono de la org (o al de la era, en reposo).
  function ponerTono(tono, cruce = T_MS.cruce) {
    aplicarTono(raiz, tono);
    mundo?.cruzar?.(tono, paletaDe(tono), cruce);
  }
  function mostrar(i, { animado = true } = {}) {
    if (i === mostrada || !vivo) return;
    mostrada = i;
    escudos.forEach((b, k) => b.classList.toggle('apuntada', k === i));
    pintarAura(i, { animado });
    heroe.mostrar(i, { animado });
    ponerTono(i == null ? tonoReposo() : tonos[i]);
    if (i != null && animado) fx()?.pulso?.('apuntar');
  }
  const sigue = () => vivo && raiz.isConnected && !elegido;
  function previsualizar(i) {
    if (!sigue() || !llego(i)) return;
    clearTimeout(tAura);
    if (quieto()) return mostrar(i);
    tAura = setTimeout(() => sigue() && mostrar(i), T_MS.aura);
  }
  function soltar() {
    if (!sigue()) return;
    clearTimeout(tAura);
    const base = elegida >= 0 ? elegida : null;
    if (quieto()) return mostrar(base);
    tAura = setTimeout(() => sigue() && mostrar(base), T_MS.vuelta);
  }
  function elegir1(i, { mover = false } = {}) {
    if (elegido || i < 0 || i >= ofertas.length) return;
    if (entrando && !llego(i)) saltarEntrada();
    clearTimeout(tAura);
    if (i !== elegida) {
      elegida = i;
      ventanaVista.elegida = ofertas[i].id;
      escudos.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
      pintarCierre(i);
      sonido?.clic?.();
    }
    mostrar(i);
    if (mover && document.activeElement !== escudos[i]) escudos[i].focus({ preventScroll: true });
  }
  escudos.forEach((b, i) => {
    b.addEventListener('pointerenter', () => !celular() && previsualizar(i));
    b.addEventListener('pointerleave', () => !celular() && soltar());
    b.addEventListener('focus', () => llego(i) && elegir1(i));
    b.addEventListener('click', () => elegir1(i, { mover: true }));
  });
  // las flechas recorren la grilla
  grilla.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || elegido || traspaso) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const i = escudos.indexOf(document.activeElement);
    const j = Math.max(0, Math.min(escudos.length - 1, (i < 0 ? elegida : i) + (e.key === 'ArrowRight' ? 1 : -1)));
    elegir1(j, { mover: true });
  });

  // ---------------------------------------------------------------------------------------------- responder
  function bloquearPantalla() {
    elegido = true;
    clearTimeout(tAura);
    saltarEntrada();
    raiz.classList.add('ms-respondio');
    for (const b of [...escudos, ...filasCamino, btnRepresentante, btnEsperar]) if (b) b.disabled = true;
    negociar.querySelectorAll('button').forEach((b) => (b.disabled = true));
  }
  function firmar(i) {
    if (elegido || i < 0 || !ofertas[i]) return;
    mostrar(i);
    bloquearPantalla();
    // con movimiento reducido no hay ceremonia en FIRMAR: mientras responde el motor, la grilla y el inspector se apagan ya
    if (quieto()) raiz.classList.add('ms-firmando');
    respuesta = { tipo: 'firmar', i };
    responder({ opcionId: ofertas[i].id });
  }
  function negociar1(i, como) {
    if (elegido) return;
    bloquearPantalla();
    respuesta = { tipo: 'negociar', i, como };
    responder({ negociar: como, opcionId: ofertas[i].id });
  }
  btnRepresentante?.addEventListener('click', () => {
    if (elegido) return;
    bloquearPantalla();
    respuesta = { tipo: 'representante' };
    responder({ representante: true });
  });
  btnEsperar?.addEventListener('click', () => {
    if (elegido) return;
    bloquearPantalla();
    respuesta = { tipo: 'esperar' };
    responder({ negociar: 'esperar' });
  });
  filasCamino.forEach((b, k) => b.addEventListener('click', () => {
    if (elegido) return;
    const c = caminos[k];
    b.setAttribute('aria-pressed', 'true');
    bloquearPantalla();
    respuesta = { tipo: 'camino', i: c.org ? 0 : null, camino: c };
    responder({ opcionId: c.id });
  }));
  // Enter firma la elegida (salvo con el foco en otro botón, o con un cuarto abierto)
  const teclaEnter = (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat || e.key !== 'Enter' || traspaso) return;
    if (elegido || elegida < 0 || !raiz.isConnected || document.querySelector('dialog[open]')) return;
    const enBoton = e.target?.closest?.('button, a, input, summary');
    if (enBoton && !enBoton.classList.contains('ms-op')) return;
    e.preventDefault();
    boton.bloquear();
  };
  document.addEventListener('keydown', teclaEnter);

  // ---------------------------------------------------------------------------------------------- la entrada
  // La llegada: el bumper abre la ventana, el panel sube con la grilla vacía y el reloj corre los días; cada oferta cae en
  // el suyo. Un solo reloj (beats.js); Espacio la saltea y un cuarto abierto la pausa (`controlar`, el del reproductor).
  function llegada() {
    const bt = crearBeats({ duracion: asentarseLl + T_LL.cola, asentarse: asentarseLl });
    beats = bt;
    entrando = true;
    const w = (a) => bt.waapi(a);
    soltarControl = controlar?.({ saltar: saltarEntrada, pausar: () => bt.pausar(), reanudar: () => bt.reanudar() }) ?? (() => {});
    const td = bt.destello(60);
    if (td != null) fx()?.pulso?.('elegir', td);
    // el bumper: la banda se abre, el rótulo entra apretándose y la banda se cierra en una línea de luz que se apaga
    const D = T_LL.bumperDur;
    w(animar(bumper, [{ opacity: 1 }, { opacity: 1, offset: 0.97 }, { opacity: 0 }], { dur: D, easing: 'linear' }));
    w(animar(bumper.querySelector('.ms-bumper-banda'), [{ transform: 'scaleY(0)', easing: EXPO }, { transform: 'scaleY(1)', offset: T_LL.abre, easing: 'linear' }, { transform: 'scaleY(1)', offset: T_LL.cierra, easing: 'cubic-bezier(.7,0,.3,1)' }, { transform: 'scaleY(.01)' }], { dur: D, easing: 'linear' }));
    w(animar(bumper.querySelector('.ms-bumper-txt'), [
      { opacity: 0, letterSpacing: '0.42em', filter: 'blur(8px)', easing: EXPO },
      { opacity: 1, letterSpacing: '0em', filter: 'blur(0px)', offset: 0.36, easing: 'linear' },
      { opacity: 1, letterSpacing: '0em', transform: 'none', filter: 'blur(0px)', offset: T_LL.cierra - 0.04, easing: 'cubic-bezier(.7,0,.3,1)' },
      { opacity: 0, letterSpacing: '0em', transform: 'scaleY(.2)', filter: 'blur(4px)', offset: 0.9 },
      { opacity: 0, letterSpacing: '0em', transform: 'scaleY(.2)', filter: 'blur(4px)' }
    ], { dur: D, easing: 'linear' }));
    w(animar(bumper.querySelector('.ms-bumper-sub'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none', offset: 0.45 }, { opacity: 1, transform: 'none', offset: T_LL.cierra - 0.06 }, { opacity: 0, transform: 'none', offset: 0.82 }, { opacity: 0, transform: 'none' }], { delay: 120, dur: D - 120, easing: 'linear' }));
    w(animar(lineaLuz, [{ opacity: 0, transform: 'scaleX(.6)' }, { opacity: 1, transform: 'none', offset: 0.2 }, { opacity: 0, transform: 'scaleX(1.06)' }], { delay: D * T_LL.cierra, dur: D * (1 - T_LL.cierra) + 240, easing: 'linear' }));
    // el panel sube con la grilla vacía; adentro, el orden de siempre (luz -> rótulo -> título -> opciones)
    w(animar(panel, [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' }], { delay: T_LL.panel, dur: T_LL.panelDur }));
    w(entrar(rotulo, T_LL.panel + 120, 10));
    w(animar(titulo, [{ opacity: 0, transform: 'translateY(40%)' }, { opacity: 1, transform: 'none' }], { delay: T_LL.panel + 200, dur: 420 }));
    w(entrar(planteo, T_LL.panel + 300, 10));
    w(entrar(cierre, T_LL.panel + 520, 10));
    if (reloj) w(entrar(reloj, T_LL.reloj - 220, 8));
    // el reloj: el día que corre, las celdas que pasan y las llegadas
    bt.agregar({
      en(t) {
        const d = t < T_LL.reloj ? 1 : Math.min(diaFinal, 1 + Math.floor((t - T_LL.reloj) / T_LL.dia));
        if (d !== ultDia) {
          ultDia = d;
          relojN.textContent = String(d).padStart(2, '0');
          celdas.forEach((c, k) => {
            c.classList.toggle('pasado', k + 1 < d);
            c.classList.toggle('hoy', k + 1 === d);
          });
        }
        const n = tToca.filter((x) => x <= t).length;
        if (n !== ultN) {
          ultN = n;
          pintarLlegadas(t);
        }
      }
    });
    // las ofertas caen a su lugar, cada una en su día (medido: la grilla está quieta en su lugar final)
    const techo = panel.getBoundingClientRect().top - T_LL.caidaSobre;
    const dur = T_LL.cae + T_LL.asienta;
    const toca = T_LL.cae / dur;
    escudos.forEach((b, i) => {
      const t0 = tCae[i];
      const tt = tToca[i];
      const cresta = b.querySelector('.ms-op-cresta');
      const r = cresta.getBoundingClientRect();
      const alto = Math.round(Math.max(0, Math.min(T_LL.caidaMax, r.top + r.height / 2 - techo)));
      const estela = b.querySelector('.ms-op-estela');
      estela.style.height = `${Math.max(0, Math.round(alto - (r.top - b.getBoundingClientRect().top)))}px`;
      w(animar(estela, [{ opacity: 0, transform: 'scaleY(.2)' }, { opacity: 1, transform: 'scaleY(1)', offset: 0.3 }, { opacity: 0.7, transform: 'scaleY(1)', offset: toca }, { opacity: 0, transform: 'scaleY(.05)' }], { delay: t0, dur, easing: 'linear' }));
      w(animar(cresta, [
        { opacity: 0, transform: `translateY(${-alto}px) scale(.62)`, filter: 'blur(5px)', easing: 'cubic-bezier(.5,0,.9,.4)' },
        { opacity: 1, transform: `translateY(${Math.round(-alto * 0.86)}px) scale(.7)`, filter: 'blur(3px)', offset: 0.08, easing: 'cubic-bezier(.5,0,.9,.4)' },
        { opacity: 1, transform: 'translateY(7%) scale(1.18, .8)', filter: 'blur(0px)', offset: toca, easing: 'cubic-bezier(.2,.7,.3,1)' },
        { opacity: 1, transform: 'translateY(-9%) scale(.95, 1.06)', filter: 'blur(0px)', offset: toca + (1 - toca) * 0.45, easing: 'ease-in-out' },
        { opacity: 1, transform: 'none', filter: 'blur(0px)' }
      ], { delay: t0, dur, easing: 'linear' }));
      w(animar(b.querySelector('.ms-op-vacio'), [{ opacity: 1 }, { opacity: 0 }], { delay: tt - 40, dur: 140, easing: 'linear' }));
      w(animar(b.querySelector('.ms-op-txt'), [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { delay: tt + 40, dur: 300 }));
      b.querySelectorAll('.ms-op-barra').forEach((x, k) => w(animar(x, [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: tt + 100 + k * 50, dur: 480 })));
      const tag = b.querySelector('.ms-op-tag');
      if (tag) w(animar(tag, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { delay: tt + 160, dur: 260 }));
      w(animar(b.querySelector('.ms-op-polvo'), [{ opacity: 0.9, transform: 'scaleX(.3)' }, { opacity: 0, transform: 'scaleX(1.7)' }], { delay: tt, dur: 520, fill: 'none' }));
      w(animar(b.querySelector('.ms-op-borde'), [{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 0 }], { delay: tt - 20, dur: T_MS.borde, easing: 'ease-out' }));
      w(animar(b, [{ transform: 'none' }, { transform: 'translateY(4px)', offset: 0.25 }, { transform: 'none' }], { delay: tt, dur: 260, easing: 'ease-out' }));
      bt.esperar(t0).then((ya) => ya && sonido?.ding?.());
      bt.esperar(tt).then((ya) => ya && sonido?.golpe?.());
      const tp = bt.destello(tt);
      if (tp != null) fx()?.pulso?.('apuntar', tp);
    });
    heroe.llegada({ w, tCae, tToca });
    // el aura en reposo y la cinta (el mundo se mueve mientras esperás)
    w(animar(aura, [{ opacity: 0 }, { opacity: 1 }], { delay: T_LL.reposo, dur: 200, easing: 'linear' }));
    w(animar(aura.querySelector('.ms-aura-escudo'), [{ opacity: 0, transform: 'scale(.8)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], { delay: T_LL.reposo, dur: 380 }));
    w(animar(aura.querySelector('.ms-aura-k'), [{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }], { delay: T_LL.reposo + 40, dur: 300 }));
    aura.querySelectorAll('.ms-aura-letra').forEach((l, j) => w(animar(l, [{ opacity: 0, transform: 'translateY(34%)' }, { opacity: 1, transform: 'none' }], { delay: T_LL.reposo + 60 + j * 16, dur: 300 })));
    aura.querySelectorAll('.ms-termino').forEach((t, j) => w(entrar(t, T_LL.reposo + 140 + j * 50, 10)));
    if (tira) w(animar(tira, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { delay: T_LL.cinta, dur: 420 }));
    bt.esperar(asentarseLl).then(() => {
      if (beats !== bt) return;
      entrando = false;
      soltarControl();
      pintarLlegadas(Infinity);
    });
    bt.iniciar();
  }
  function saltarEntrada() {
    if (!entrando) return;
    entrando = false;
    beats?.saltar();
    soltarControl();
    pintarLlegadas(Infinity);
  }
  // un clic afuera de los escudos y los botones mientras llegan: llegan todas
  raiz.addEventListener('click', (e) => entrando && !e.target.closest('button, a, input, select, summary') && saltarEntrada());

  // el primer cuadro: el reposo (o, volviendo de negociar, la que estaba elegida, con su sueldo nuevo rodando)
  pintarAura(null, { animado: false });
  pintarCierre(-1);
  if (traspaso) {
    mostrar(0, { animado: false });
  } else if (conLlegada) {
    pintarLlegadas(0);
  } else {
    pintarLlegadas(Infinity);
    const k = vista?.elegida != null ? ofertas.findIndex((o) => o.id === vista.elegida) : -1;
    if (k >= 0) {
      elegir1(k);
      const antes = vista.sueldos.get(ofertas[k].id);
      const sueldo = aura.querySelector("[data-t='sueldo'] .ms-num");
      if (sueldo && Number.isFinite(antes) && antes !== norm[k].sueldo) odometro(sueldo, antes, norm[k].sueldo, { dur: T_NEGOCIAR.odometro });
    } else ponerTono(tonoReposo(), 0);
  }

  // ---------------------------------------------------------------------------------------------- narrar
  // `ctx` (app.js, `narrarRespuesta`). Devuelve cuántos de los logs nuevos contó (desde el primero).
  async function narrar(ctx) {
    if (!respuesta || !raiz.isConnected) return 0;
    const logs = ctx.logs ?? [];
    if (respuesta.tipo === 'negociar' || respuesta.tipo === 'representante') return narrarCharla(ctx, logs);
    if (respuesta.tipo === 'esperar') return 0;
    const i = respuesta.i;
    const f = fichajeDe(ctx.antes, ctx.despues, logs);
    const prueba = ctx.despues?.pendiente?.decision?.datos?.momento === 'tryout' ? ctx.despues.pendiente.decision : null;
    if (respuesta.tipo === 'camino' && !f) return narrarCamino(ctx, logs);
    if (i == null || (!f && !prueba)) return 0;
    // la oferta pide prueba: su tono y tu valor quedan para la firma después de la prueba
    if (prueba && !f) pruebaPendiente = { seed: estado.seed, org: ofertas[i].org, tono: tonos[i], valor };
    // con un club nuevo, el fichaje se monta ANTES del papel (casi invisible, esperando el papel firmado); el jersey, que
    // es lo caro de dibujar, entra en el sostén del papel (`fichaje.js`)
    let entregar = () => {};
    const papelListo = new Promise((r) => (entregar = r));
    const fichaje = f && !f.renovacion ? narrarFichaje(ctx, f, { mundo, sonido, valor, tono: tonos[i], papel: papelListo }) : null;
    let papel = null;
    try {
      papel = await narrarContrato(ctx, i, f, prueba);
    } finally {
      entregar(papel);
    }
    try {
      if (fichaje) await fichaje;
    } finally {
      papel?.soltar();
    }
    return f ? f.hasta : 0;
  }

  // Lo que dijo el club (o el representante), en el lugar del inspector; la parada vuelve re-presentada con lo nuevo.
  async function narrarCharla(ctx, logs) {
    const sigueLaVentana = ctx.despues?.pendiente?.decision?.presentacion === 'mercado';
    if (!logs.length || !sigueLaVentana) return 0;
    const narracion = crearNarracion(ctx, [raiz]);
    try {
      const nodo = el('div', { class: 'ms-charla', role: 'status', tabindex: '-1' }, [icono(respuesta.tipo === 'representante' ? 'chat' : 'mercado'), el('p', { text: logs.map((l) => l.message).join(' ') })]);
      inspector.replaceChildren(nodo);
      animar(nodo, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { dur: DUR.larga });
      const i = respuesta.i;
      const nueva = i != null ? ctx.despues.pendiente.decision.opciones.find((o) => o.id === ofertas[i].id) : null;
      const sueldo = aura.querySelector("[data-t='sueldo'] .ms-num");
      if (nueva && sueldo && nueva.salarioAnualUSD !== norm[i].sueldo) {
        odometro(sueldo, norm[i].sueldo, nueva.salarioAnualUSD, { dur: T_NEGOCIAR.odometro });
        ventanaVista.sueldos.set(nueva.id, nueva.salarioAnualUSD);
      }
      nodo.focus({ preventScroll: true });
      await narracion.esperar(T_NEGOCIAR.sostener);
    } finally {
      narracion.fin();
    }
    return logs.length;
  }

  // Un traspaso que no se hace (te quedás, o tu club no te suelta): lo que dijo el motor en el lugar del inspector, y la
  // carta del club que te quería recibe su sello.
  async function narrarCamino(ctx, logs) {
    if (!logs.length) return 0;
    const narracion = crearNarracion(ctx, [raiz]);
    try {
      const nodo = el('div', { class: 'ms-charla', role: 'status', tabindex: '-1' }, [icono('mercado'), el('p', { text: logs[0].message })]);
      inspector.replaceChildren(nodo);
      animar(nodo, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { dur: DUR.larga });
      heroe.firmar(0, { w: (a) => a, t: T_FIRMAR.selloDur, texto: respuesta.camino?.tipo === 'quedarse' ? 'Rechazada' : 'Retenido' });
      nodo.focus({ preventScroll: true });
      await narracion.esperar(T_NEGOCIAR.sostener);
    } finally {
      narracion.fin();
    }
    return 1;
  }

  // LA FIRMA AL FRENTE (PLANUI §0.6 punto 1): el papel de arriba de la pila se despega y viaja al centro, grande, sobre un
  // velo; tu firma se traza en su línea y cae el sello al pie. Con fichaje (un club nuevo), el papel queda al frente y el
  // fichaje sigue la escena (el mapa cae encima): devuelve el papel montado. Sin fichaje (una renovación, una prueba), se
  // sostiene firmado y vuelve a la pila; la hoja sellada queda en el panel, como antes, y el relato sigue.
  async function narrarContrato(ctx, i, f, prueba) {
    const o = ofertas[i];
    const x = norm[i];
    const tono = tonos[i];
    const sello = f ? (f.renovacion ? 'Renovado' : 'Firmado') : 'A prueba';
    const conFichaje = Boolean(f && !f.renovacion);
    raiz.classList.add('ms-firmando');
    panel.style.setProperty('--ms-cierre', `${cierre.offsetHeight}px`);
    for (const n of [cab, grilla, inspector]) {
      n.setAttribute('inert', '');
      n.setAttribute('aria-hidden', 'true');
    }
    // la hoja del panel: el registro sellado (lo lee el lector de pantalla; se ve cuando el papel vuelve o se va)
    const h = hojaDeContrato({
      org: o.org, liga: o.liga, tono, handle: yo.handle, ventana: yo.ventana, anio: yo.anio, anios: f?.anios ?? x.anios,
      sueldo: f?.salario ?? x.sueldo, tipo: x.tipo, clausula: f?.clausula ?? x.clausula, traspaso, sello,
      sigue: f ? (f.renovacion ? `Seguís en ${o.org}` : `Tu nuevo club: ${o.org}`) : `La prueba de ingreso en ${o.org}`,
      texto: prueba ? prueba.datos?.apuesta ?? prueba.descripcion ?? '' : f?.log?.message ?? ''
    });
    h.nodo.style.opacity = '0';
    panel.append(h.nodo);

    // ---- el papel: una copia de la carta de arriba, del tamaño de la carta, que se escala al frente (FLIP)
    const carta = heroe.carta(i);
    const k = Number.isFinite(ctx?.escala) && ctx.escala > 0 ? Math.min(1, ctx.escala) : 1;
    const T = (ms) => Math.round(ms * k);
    const medida = getComputedStyle(carta);
    const ancho = parseFloat(medida.width) || 1;
    let alto = parseFloat(medida.height) || 1;
    const altoCarta = alto;
    const origen = carta.getBoundingClientRect();
    const papel = carta.cloneNode(true);
    for (const n of papel.querySelectorAll('[id]')) {
      const nuevo = `${n.id}-frente`;
      for (const u of papel.querySelectorAll(`[href="#${n.id}"]`)) u.setAttribute('href', `#${nuevo}`);
      n.id = nuevo;
    }
    // el sello de la org se vuelve a armar desde su marcado: el texto en arco copiado de la pila (achicada con `zoom` en
    // el celular) se dibujaba con la escala de la pila
    for (const n of papel.querySelectorAll('.ms-carta-sello')) n.innerHTML = n.innerHTML;
    papel.classList.remove('al-frente', 'ms-carta-sellada');
    papel.classList.add('ms-papel');
    papel.querySelector('.ms-carta-firmada')?.remove();
    Object.assign(papel.style, { transform: 'none', zIndex: '', visibility: '', opacity: '' });
    const firma = firmaTrazada(yo.handle, 'ms-papel-firma');
    papel.querySelector('.ms-carta-vos')?.prepend(firma.nodo);
    // la sombra: el papel se apaga detrás del mapa (opacidad, sin `filter`: un desenfoque animado sobre el papel grande
    // trababa la GPU justo cuando cae el mapa)
    const sombra = el('i', { class: 'ms-frente-sombra', 'aria-hidden': 'true' });
    const caja = el('div', { class: 'ms-frente-papel', style: { width: `${ancho}px`, height: `${alto}px` } }, [papel, sombra]);
    const velo = el('div', { class: 'ms-frente-velo', style: { '--ms-frente-fondo': `var(${tono.vacio})`, '--ms-frente-luz': `var(${tono.luz})` } });
    const capa = el('div', { class: 'ms-frente', 'aria-hidden': 'true' }, [velo, caja]);
    (document.querySelector('.shell') ?? document.body).append(capa);
    // G-fix F: el papel es tan alto como su contenido (la carta recorta: con los cuatro ejes y un texto largo, la firma y el sello
    // quedaban cortados abajo); más alto, la escala al frente lo achica para que entre entero en la pantalla
    const alturaPapel = Math.ceil(papel.scrollHeight);
    if (alturaPapel > alto + 1) {
      alto = alturaPapel;
      caja.style.height = `${alto}px`;
    }
    // tu firma llena su línea: el ancho del dibujo, el del nombre (con un mínimo, para que la rúbrica no quede enorme)
    try {
      const largo = firma.texto.getComputedTextLength();
      if (largo > 0) firma.nodo.setAttribute('viewBox', `0 0 ${Math.round(Math.max(largo + PAPEL.firmaAire, PAPEL.firmaMin))} 150`);
    } catch {
      /* sin medida, el dibujo de siempre */
    }
    // el centro de la pantalla visible (sin la barra de scroll): la capa se corre si su contenedor no la deja ahí
    const vw = document.documentElement.clientWidth || innerWidth;
    const vh = document.documentElement.clientHeight || innerHeight;
    const enCapa = caja.getBoundingClientRect();
    caja.style.left = `${Math.round(vw / 2 - (enCapa.left + enCapa.width / 2))}px`;
    caja.style.top = `${Math.round(vh / 2 - (enCapa.top + enCapa.height / 2))}px`;
    const destino = caja.getBoundingClientRect();
    const escala = Math.min(Math.min(PAPEL.ancho, vw * (celular() ? PAPEL.vwCelular : PAPEL.vw)) / ancho, (vh - 2 * PAPEL.aire) / alto);
    caja.style.transform = `scale(${escala.toFixed(4)})`;
    carta.style.visibility = 'hidden';
    const s0 = origen.height / altoCarta;
    const dx = Math.round(origen.left + origen.width / 2 - (destino.left + destino.width / 2));
    const dy = Math.round(origen.top + origen.height / 2 - (destino.top + destino.height / 2));
    const pose = (px, py, rx, ry, rz, s) => `translate(${px}px, ${py}px) perspective(${PAPEL.perspectiva}px) rotateX(${rx}deg) rotateY(${ry}deg) rotate(${rz}deg) scale(${s.toFixed(4)})`;
    const enLaPila = pose(dx, dy, 0, 0, CARTA.alFrente.giro, s0);
    const alFrente = pose(0, 0, 0, 0, 0, escala);

    const bt = crearBeats({ duracion: T(T_FRENTE.fin), asentarse: T(T_FRENTE.fin) });
    let saltado = false;
    let narracion = null;
    // Espacio en el papel salta al walkout (el fichaje arranca en su cuadro final); con movimiento reducido, adelanta
    const reloj = { saltar: () => ((saltado = narracion?.modo !== 'reducido'), bt.saltar()), pausar: () => bt.pausar(), reanudar: () => bt.reanudar() };
    narracion = crearNarracion(ctx, [raiz, capa], { reloj });
    const w = (a) => bt.waapi(a);
    try {
      for (const n of [cab, grilla]) w(animar(n, [{ opacity: 1 }, { opacity: 0 }], { dur: T(T_FIRMAR.apaga), easing: 'linear' }));
      w(animar(inspector, [{ opacity: 1, visibility: 'visible' }, { opacity: 0, visibility: 'visible' }], { dur: T(T_FIRMAR.apaga), easing: 'linear' }));
      // 0-450: se despega (se levanta y se inclina), gira a plano y llega al centro; el velo baja; los otros papeles caen
      w(animar(caja, [
        { transform: enLaPila, easing: 'cubic-bezier(.3,0,.3,1)' },
        { transform: pose(Math.round(dx * PAPEL.despegue), Math.round(dy * PAPEL.despegue) - PAPEL.levanta, PAPEL.inclina.x, PAPEL.inclina.y, PAPEL.inclina.z, (s0 + escala) / 2), offset: T_FRENTE.despega, easing: 'cubic-bezier(.2,.7,.2,1)' },
        { transform: alFrente }
      ], { dur: T(T_FRENTE.viaja), easing: 'linear' }));
      w(animar(velo, [{ opacity: 0 }, { opacity: 1 }], { dur: T(T_FRENTE.velo), easing: 'linear' }));
      heroe.cartas.filter((c) => c !== carta).forEach((c, n) => {
        const base = c.style.transform;
        c.style.opacity = '0';
        w(animar(c, [{ opacity: 1, transform: base }, { opacity: 0, transform: `${base} translateY(${PAPEL.cae.y}vh) rotate(${(n % 2 ? 1 : -1) * PAPEL.cae.giro}deg)` }], { delay: T(T_FRENTE.caen + n * T_FRENTE.caenPaso), dur: T(T_FRENTE.caenDur), easing: 'cubic-bezier(.55,0,.9,.5)' }));
      });
      // 450-1500: tu firma se traza en tu línea
      w(trazarFirma(firma, T(T_FRENTE.trazo), T(T_FRENTE.trazoDur)));
      w(rubricar(firma, T(T_FRENTE.rubrica), T(T_FRENTE.rubricaDur)));
      // 1500-1800: el sello cae al pie, con el golpe (el pulso, la onda, el papel que se sacude y el sonido)
      const golpe = T(T_FRENTE.sello + T_FRENTE.selloDur * 0.7);
      const marca = sellarCarta(papel, { w, t: golpe, texto: sello, dur: T(T_FRENTE.selloDur) });
      const onda = el('i', { class: 'ms-papel-onda', 'aria-hidden': 'true' });
      marca.append(onda);
      w(animar(onda, [{ opacity: 0, transform: 'scale(1)' }, { opacity: 0.9, transform: 'scale(1)', offset: 0.02 }, { opacity: 0, transform: 'scale(2.4)' }], { delay: golpe, dur: T(T_FIRMAR.onda) }));
      w(animar(caja, [{ translate: '0 0' }, { translate: '0 5px', offset: 0.18 }, { translate: '-3px -1px', offset: 0.42 }, { translate: '2px 1px', offset: 0.7 }, { translate: '0 0' }], { delay: golpe, dur: T(T_FIRMAR.sacude), easing: 'linear' }));
      const td = bt.destello(golpe);
      if (td != null) fx()?.pulso?.('logro', td);
      bt.esperar(golpe).then((llego) => llego && sonido?.golpe?.());
      // la carta de la pila (escondida mientras el papel está al frente) recibe el mismo sello: vuelve sellada
      heroe.firmar(i, { w, t: golpe, texto: sello, dur: T(T_FRENTE.selloDur) });
      bt.iniciar();
      // 1800-2300: se sostiene (con movimiento reducido, el cuadro fijo del papel firmado y su tiempo de lectura)
      if (narracion.modo === 'reducido') {
        fundirCuadro(capa);
        await narracion.esperar(T_FIRMAR.lectura);
      } else {
        // G-fix G: la espera del papel se mide con el reloj de la narración (timers, que corren aunque la pestaña esté en
        // segundo plano y se pausan con un cuarto), no con el del bucle de cuadros (`bt.esperar`: solo avanza con requestAnimationFrame,
        // y una pestaña oculta o con cuadros frenados dejaba el papel congelado sin que nada lo soltara). Espacio sigue salteándola.
        await narracion.esperar(conFichaje ? T_FRENTE.entrega : T_FRENTE.fin);
      }
      if (!conFichaje) await narracion.esperar(T_FIRMAR.sostener);
    } finally {
      narracion.fin();
    }
    const soltar = () => {
      capa.remove();
      bt.destruir();
      carta.style.visibility = '';
      h.nodo.style.opacity = '';
    };
    if (conFichaje && raiz.isConnected) return { capa, caja, sombra, escala, saltado, soltar };
    // sin fichaje: el papel vuelve a la pila (sellada) y la hoja sellada aparece en el panel
    const vuelta = animar(caja, [{ transform: alFrente }, { transform: enLaPila }], { dur: T(T_FRENTE.vuelve), easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' });
    animar(velo, [{ opacity: 1 }, { opacity: 0 }], { dur: T(T_FRENTE.vuelve), easing: 'linear', fill: 'forwards' });
    if (vuelta) await vuelta.finished.catch(() => {});
    soltar();
    if (narracion.modo === 'reducido') fundirCuadro(h.nodo);
    else animar(h.nodo, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { dur: DUR.larga });
    h.res.focus({ preventScroll: true });
    return null;
  }

  return {
    nodo: raiz,
    titulo,
    // el mundo del mercado: sin campeón (la derecha son las cartas); la luz, la del tono (la era en reposo)
    mundo: { arte: null, escena: null, costura: null, encuadre: 'derecha', velo: 0.55, lightsticks: 0 },
    entrar() {
      ajustarLetra(aura.querySelector('.ms-aura-nombre'));
      if (conLlegada) llegada();
    },
    narrar,
    destruir() {
      vivo = false;
      clearTimeout(tAura);
      document.removeEventListener('keydown', teclaEnter);
      soltarControl();
      beats?.destruir();
      boton.destruir();
    }
  };
}

// La primera oración del planteo y el resto (el "más").
function partirTexto(texto) {
  const m = /^(.+?[.!?])\s+(.+)$/s.exec(String(texto).trim());
  return m ? [m[1], m[2]] : [String(texto).trim(), ''];
}
