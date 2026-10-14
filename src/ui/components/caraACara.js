// EL CARA A CARA (PLANUI U2b; portado de `crearSerieLinea` de vitrina/fusion/js/partido.js con `op=linea`). La serie
// es una transmisión: la imagen héroe es la costura del ambiente (tu campeón en el tono de tu org contra el del rival en
// el suyo), arriba el marcador de la transmisión con la fuerza y los mapas, en el medio los nombres gigantes y abajo una
// franja de transmisión: tus libres como cartas de carga, el plan como barras (la chance de cada mapa y la de la serie)
// y la tira de Fearless. Elegir responde al motor; lo que pasó lo cuenta la transmisión (`narrar`, PLANUI §0.2): mapa a
// mapa, la costura cambia a los campeones del mapa y entran sus cartas de carga con su duelo en el rótulo del mapa
// ("Sylas vs Ahri": cada mapa, su campeón), VICTORIA/DERROTA del lado del ganador,
// el pip y el golpe del marcador, el quemado de Fearless; el decisivo (el Bo5 a 2-2) con su suspenso. Al final, la placa
// de cierre. Todo con los logs reales de la respuesta (`ctx.logs`), cortados donde termina la serie.
//
// `modo: 'fecha'` (la fecha marcada, `temporada`): la misma transmisión al Bo1. El cruce con la p grande; elegir cuenta
// lo que eligió el momento, el partido y su resultado.
//
// `crearCaraACaraDeNarracion` (PLANUI §0.3, punto 6.1): el mapa decisivo de semis, final e internacional se juega como
// minijuego (`systems/serie.js` `pausaDecisiva`); después del veredicto la misma transmisión se monta solo para narrar
// (sin el plan: en su lugar, la chance del mapa) y cuenta ese mapa con su suspenso y el cierre de la serie.
//
// Los modos de la narración (PLANUI §0.3, `narracion.js`): la secuencia entera; con movimiento reducido, cuadros fijos
// (cada vestuario, cada mapa con su VICTORIA o DERROTA, el decisivo antes y después, la placa de cierre) con un fundido
// corto y su tiempo de lectura. La velocidad rápida corre la misma secuencia más rápido (P1: sin modo INST).
//
// Lo grande del centro son los EQUIPOS (P1, PLANUI §0.4: "Sylas contra LOUD" no se entendía): el escudo y la sigla de
// cada org; el duelo de campeones va como segunda línea (los retratos y "Sylas vs Ahri", o solo el tuyo).
import { el, celular, quieto, EXPO } from '../fx/util.js';
import { entrar, lineasConMascara } from '../fx/movimiento.js';
import { animar } from '../fx/util.js';
import { marcador as marcadorTx, placaInferior } from '../fx/transmision.js';
import { victoriaDerrota, quemar as quemarCarta } from '../fx/ceremonia.js';
import { crearBeats } from '../fx/beats.js';
import { tonoOrg, tonoCompeticion, separar, paletaDe } from '../fx/tono.js';
import { logoOrg, logoComp, siglaDe, logosListos } from '../fx/competicion.js';
import { cargarImagen, urlCarga, urlIcono } from '../fx/arte.js';
import { claveDe } from '../core/mundo.js';
import { crearNarracion } from '../narracion.js';
import {
  anim, pct, ventanaTx, irseEn, pintarEnTono, tonosDeLados, carasDe, cabeceraTx, competicionDeEstado,
  TX_SUS, TX_SUS_PIP, esDecisivo, expoSus, cuadrosLatido, cuadrosTira, latirPlaca, programarSuspenso, placaDecisiva, entrarPlaca,
  cuadrosQuietos, apareceEn, contarEnCuadros
} from './transmisionComun.js';
import { tanCercaDeLaFinal } from '../core/momentos.js';
import { probabilidadDeMapa, ajusteDeCharla } from '../../core/serie.js';

const TX = {
  t0: 360, // el primer mapa, después de fijar el plan
  presentar: 1100, // solo para narrar (el decisivo jugado como minijuego): la transmisión entra antes de que arranque el mapa
  mapa: 2400, // lo que dura un mapa (LINEA regla 8: <= 2,4 s)
  charla: 1150, // una placa del vestuario entre mapas
  cruce: 520, // el cruce de la costura a los campeones del mapa
  rotulo: 60,
  carta: 110,
  cartaDur: 460,
  resultado: 860, // VICTORIA / DERROTA sobre el lado del ganador
  pip: 1420, // el pip del mapa y el golpe del marcador
  quema: 1760, // el quemado de los dos campeones en la tira de Fearless
  cierreDur: 1700,
  asentarse: 1150,
  sostener: 1600, // después de asentarse, la placa de cierre se queda antes del relato
  aquietar: 700,
  alerta: [220, 2400], // el aviso del replan: desde, cuánto dura
  juego: 1000, // la fecha: EN JUEGO
  entrada: -260 // la parada entra después del relato: el panel, un poco antes que en la vitrina
};
// Movimiento reducido (PLANUI §0.3): el tiempo de lectura de cada cuadro fijo, en ms a velocidad x1.
const LECTURA = { charla: 1500, previa: 1500, mapa: 1900, cierre: 2400 };
// Movimiento reducido: dónde cae cada cuadro dentro de su tramo de la secuencia (ms desde que empieza el tramo).
const CUADRO = { previa: 600, mapa: 1900, juego: 500, resultado: 500 };
const TX_CARTA = { libre: [154, 280], mapa: [308, 560] };
const TX_FOCO_CARGA = [0.5, 0.18];
// la fuerza de un equipo va de 0 a 100: el referente de la barrita de la fuerza
const TX_FUERZA_MAX = 100;
const RONDAS = { final: 'La final', semis: 'Semifinal', semifinal: 'Semifinal', cuartos: 'Cuartos de final' };

// El nombre visible de un campeón por su nombre del motor (el motor ya usa el nombre visible: "Kai'Sa").
const nombreDe = (n) => String(n ?? '');

// Los logs de la serie dentro de la respuesta: hasta el que la cierra (`postSerie`) o, si la serie sigue en otra
// parada, hasta el último mapa. Sin mapas, nada.
export function logsDeLaSerie(logs) {
  const fin = logs.findIndex((l) => l?.postSerie);
  if (fin >= 0) return logs.slice(0, fin + 1);
  let ultimo = -1;
  logs.forEach((l, i) => {
    if (l?.mapa) ultimo = i;
  });
  return ultimo >= 0 ? logs.slice(0, ultimo + 1) : [];
}
// Los logs de la fecha: lo que dejó el momento y el partido (`temporada` con su `p`).
export function logsDeLaFecha(logs) {
  const i = logs.findIndex((l) => l?.type === 'temporada' && Number.isFinite(l.p) && typeof l.gano === 'boolean');
  return i >= 0 ? logs.slice(0, i + 1) : [];
}

// `contenedor`: `#decision`. `opciones`: { estado, previa, mundo, sonido, responder, modo: 'serie' | 'fecha',
// internacional, soloNarrar, pMapa }. Devuelve { titulo, mundo, narrar(ctx), destruir() }. `soloNarrar` (el decisivo
// jugado como minijuego): sin el plan, ya elegido; en el lugar del plan, la chance del mapa (`pMapa`).
export function crearCaraACara(contenedor, decision, { estado, previa = null, mundo, sonido = null, responder, modo = 'serie', internacional = false, soloNarrar = false, pMapa = null }) {
  const fecha = modo === 'fecha';
  const comp = competicionDeEstado(estado, { internacional });
  const fx = () => mundo?.fx?.() ?? null;
  const ops = soloNarrar ? [] : decision.opciones ?? [];
  const pg = previa ?? {};
  const pOpc = Object.fromEntries((pg.opciones ?? []).map((o) => [o.id, o]));
  const se = estado.serie ?? {};
  const t = estado.career?.temporada ?? {};
  const fechaEnCurso = t.fechaEnCurso ?? null;
  const formato = fecha ? 1 : se.formato ?? 5;
  const replan = !fecha && Boolean(se.replanUsado && se.rivalJuega && decision.datos?.motivo === 'plan' && (se.mapas ?? []).length > 0);
  const decisivo = decision.datos?.motivo === 'decisivo';
  const ronda = fecha ? (decision.datos?.etiqueta ?? 'Fecha marcada') : RONDAS[se.ronda] ?? se.etapa ?? 'La serie';
  const nos = estado.career?.currentOrg ?? pg.propio?.nombre ?? '';
  const ellos = fecha ? (fechaEnCurso?.rival ?? pg.rival?.nombre ?? '') : (se.rival?.org ?? pg.rival?.nombre ?? '');
  const handle = estado.player?.name ?? '';
  const sNos = siglaDe(nos);
  const sEllos = siglaDe(ellos);
  const quemados0 = (se.quemados ?? []).map(nombreDe);
  const libres = fecha ? [] : (estado.player?.championPool ?? []).map((c) => c.name).filter((n) => !quemados0.includes(n));
  const jugados = fecha ? [] : (se.mapas ?? []);
  const offset = jugados.length;
  const leido = replan ? se.rivalJuega : null;
  const tuyoN = pg.desglose?.campeon ?? decision.datos?.campeonElegido ?? estado.player?.campeonDelSplit ?? libres[0] ?? null;
  const suyoN = leido ?? (fecha ? null : pg.rival?.campeon ?? null);
  const tuyo = claveDe(tuyoN);
  const suyo = claveDe(suyoN);
  const marcadorAhora = se.marcador ?? [0, 0];
  const cargas = [];

  // ---------- los tonos: la competición (la página) y cada org (cada mitad de la costura) ----------
  const tComp = tonoCompeticion(comp.id);
  const tA = tonoOrg(nos);
  const tB = separar(tA, tonoOrg(ellos), tComp);
  const costura0 = { a: { arte: tuyo, tono: tA }, b: { arte: suyo, tono: tB }, posicion: 0.5, k: 1 };

  const raiz = el('section', { class: 'tx tx-serie', 'data-modo': modo, 'data-replan': replan ? '' : null });
  tonosDeLados(raiz, tA, tB);

  // ---------- arriba: el marcador de la transmisión y, debajo, la fuerza y los mapas ----------
  const mc = marcadorTx({
    comp,
    rotulo: fecha ? `${ronda}` : `${ronda} · Fearless`,
    local: { nombre: nos, sigla: sNos, logo: logoOrg(nos) },
    visita: { nombre: ellos, sigla: sEllos, logo: logoOrg(ellos) },
    formato,
    mapas: jugados.map((mp) => ({ resultado: mp.resultado }))
  });
  mc.nodo.classList.add('tx-mc');
  const pipsMapa = Array.from({ length: formato }, (_, i) => el('i', { class: 'tx-mp', 'data-decisivo': i === formato - 1 && formato > 1 ? '' : null, 'data-siguiente': i === offset ? '' : null }, el('i', { class: 'tx-mp-in' })));
  jugados.forEach((mp) => {
    const p = pipsMapa[mp.mapa - 1];
    if (p) p.firstElementChild.dataset.res = mp.resultado;
  });
  const fuerzaPropia = pg.propio?.fuerza ?? decision.datos?.fuerzaPropia ?? t.fuerzaPropia ?? null;
  const fuerzaRival = pg.rival?.fuerza ?? (fecha ? fechaEnCurso?.fuerzaRival : se.rival?.fuerza) ?? null;
  const fuerza = (lado, n) => el('p', { class: 'tx-fuerza', 'data-lado': lado, title: `Fuerza del equipo, de 0 a ${TX_FUERZA_MAX}: el motor las compara para la chance de cada mapa` }, [
    el('b', { class: 'num', text: Number.isFinite(n) ? String(Math.round(n)) : '—' }),
    el('span', { class: 'tx-fuerza-k' }, [el('small', { text: 'fuerza' }), el('i', { class: 'tx-fuerza-barra', style: { '--v': String(Math.min(1, (n ?? 0) / TX_FUERZA_MAX)) } })])
  ]);
  const etqMapas = `Mapas de la serie, al mejor de ${formato}${jugados.length ? `: ${jugados.map((mp) => `mapa ${mp.mapa} ${mp.resultado === 'W' ? 'ganado' : 'perdido'}`).join(', ')}` : ''}`;
  const sub = el('div', { class: 'tx-sub' }, [fuerza('a', fuerzaPropia), el('span', { class: 'tx-mapas', role: 'img', 'aria-label': etqMapas }, pipsMapa), fuerza('b', fuerzaRival)]);
  const arriba = el('div', { class: 'tx-arriba' }, [mc.nodo, sub]);

  // ---------- el centro: los equipos gigantes sobre la costura y, debajo, el duelo de campeones ----------
  // un retrato de campeón (el ícono de Data Dragon; sin red, el hueco con su borde)
  function retrato(n, lado) {
    const r = el('span', { class: 'tx-retrato', 'data-lado': lado, 'aria-hidden': 'true' });
    ponerRetrato(r, n);
    return r;
  }
  function ponerRetrato(r, n) {
    const k = claveDe(n);
    r.replaceChildren();
    r.dataset.n = n ?? '';
    if (!k) return;
    cargas.push(cargarImagen(urlIcono(k)).then((img) => {
      if (!img || r.dataset.n !== n) return;
      const c = img.cloneNode();
      c.alt = '';
      r.replaceChildren(c);
    }));
  }
  // el duelo: "Sylas vs Ahri" con sus retratos; si el rival no tiene campeón a la vista, solo el tuyo
  function duelo(nA, nB, clase = '') {
    if (!nA && !nB) return null;
    const nombre = (n, lado) => el('b', { class: 'tx-duelo-n', 'data-lado': lado, text: n });
    const partes = nB
      ? [retrato(nA, 'a'), nombre(nA ?? '—', 'a'), el('i', { class: 'tx-duelo-vs', text: 'vs' }), nombre(nB, 'b'), retrato(nB, 'b')]
      : [retrato(nA, 'a'), nombre(nA, 'a'), el('small', { class: 'tx-duelo-tuyo', text: 'tu campeón' })];
    return el('p', { class: `tx-duelo ${clase}`.trim(), 'aria-hidden': 'true' }, partes);
  }
  function parCaras({ subA, subB, clase = '' } = {}) {
    const cara = (lado, org, sigla, subT) => el('div', { class: 'tx-cara', 'data-lado': lado }, [
      el('p', { class: 'tx-cara-eq' }, [logoOrg(org, { clase: 'tx-cara-escudo' }), el('span', { class: 'tx-cara-n', text: sigla || org })]),
      el('p', { class: 'tx-cara-q' }, [el('span', { text: subT })])
    ]);
    return el('div', { class: `tx-par ${clase}`.trim(), 'aria-hidden': 'true' }, [cara('a', nos, sNos, subA), cara('b', ellos, sEllos, subB)]);
  }
  const subA = `${handle} · ${nos}`;
  const subBReposo = fecha ? `${ellos} · ${fechaEnCurso?.local === false ? 'de local' : 'de visita'}` : `${ellos}${replan ? ' · te leyó' : ''}`;
  const parReposo = parCaras({ subA, subB: subBReposo, clase: 'tx-par-reposo' });
  const dueloReposo = duelo(tuyoN, suyoN, 'tx-duelo-reposo');
  const caras = el('div', { class: 'tx-caras' }, [parReposo, dueloReposo]);
  const juego = el('div', { class: 'tx-juego', 'aria-live': 'polite' });
  // si el rival no tiene campeón a la vista, su lado queda solo tono y su logo va encima, donde cae su cara
  const logoB = suyo ? null : el('div', { class: 'tx-logo-b', 'aria-hidden': 'true' }, logoOrg(ellos));
  const escenario = el('div', { class: 'tx-escenario' }, [caras, juego, logoB]);
  const dueloLector = tuyoN ? (suyoN ? `; el duelo, ${tuyoN} contra ${suyoN}` : `; tu campeón, ${tuyoN}`) : '';
  const vs = el('p', { class: 'solo-lectores', text: `${nos} contra ${ellos} (vos, ${handle}, en ${nos})${dueloLector}` });

  // ---------- abajo: la franja de transmisión ----------
  const rotulo = fecha
    ? [comp.rotulo, decision.datos?.etiqueta ?? 'Fecha marcada', fechaEnCurso?.local === false ? 'de visita' : fechaEnCurso?.local ? 'de local' : null]
    : [comp.rotulo, ronda, `Bo${formato} · Fearless`, decisivo ? `Van ${marcadorAhora[0]}–${marcadorAhora[1]}` : replan ? `Van ${marcadorAhora[0]}–${marcadorAhora[1]}` : 'cada pick se quema'];
  const cab = cabeceraTx({ rotulo, titulo: decision.titulo, descripcion: decision.descripcion, alerta: replan ? 'Replan' : decisivo ? 'Decisivo' : null, logo: logoComp(comp, { clase: 'rot-logo' }) });

  // tus libres: cartas de carga (el arte de carga en el bitono de tu org)
  const libresNodos = new Map();
  const cartasLibres = libres.map((n) => {
    const k = claveDe(n);
    const c = el('canvas', { class: 'tx-carta-arte', width: String(TX_CARTA.libre[0]), height: String(TX_CARTA.libre[1]), 'aria-hidden': 'true' });
    if (k) cargas.push(cargarImagen(urlCarga(k)).then((img) => pintarEnTono(c, img, tA, TX_FOCO_CARGA)));
    const b = el('button', { type: 'button', class: 'tx-carta', 'data-campeon': n, 'aria-label': `${n}: apuntalo para verlo en tu lado` }, [c, el('span', { class: 'tx-carta-n', 'aria-hidden': 'true', text: n })]);
    b.addEventListener('pointerenter', () => apuntarCampeon(n));
    b.addEventListener('focus', () => apuntarCampeon(n));
    libresNodos.set(n, b);
    return el('li', {}, b);
  });
  const secLibres = fecha ? null : el('section', { class: 'tx-libres', 'aria-label': `Tus libres: ${libres.length}` }, [
    el('p', { class: 'eq-kicker' }, [el('span', { text: 'Tus libres' }), el('b', { class: 'tx-k-n', text: String(libres.length) })]),
    el('ul', { class: 'tx-cartas' }, cartasLibres)
  ]);

  // el plan: barras de transmisión (label, la chance de cada mapa en pips, el % de la serie grande)
  const pSerieDe = (o) => o.pSerie ?? pOpc[o.id]?.p ?? null;
  const pMapasDe = (o) => o.pMapas ?? pOpc[o.id]?.pMapas ?? (Number.isFinite(pOpc[o.id]?.p) && decisivo ? [pOpc[o.id].p] : null);
  const mejor = Math.max(...ops.map((o) => pSerieDe(o) ?? 0));
  const filas = ops.map((o, i) => el('button', {
    class: 'opcion tx-op', type: 'button', 'data-atajo': i < 4 ? String(i + 1) : null, 'data-id': o.id, 'data-mejor': pSerieDe(o) != null && pSerieDe(o) === mejor && ops.length > 1 ? '' : null,
    'aria-describedby': `tx-desc-${i + 1}`, style: { '--v': String(pSerieDe(o) ?? 0) }
  }, [
    el('span', { class: 'op-tecla', 'aria-hidden': 'true', text: String(i + 1) }),
    el('span', { class: 'op-label', text: o.label }),
    pMapasDe(o) ? el('span', { class: 'tx-op-mapas', 'aria-hidden': 'true' }, Array.from({ length: formato }, (_, j) => {
      const restantes = pMapasDe(o);
      const desde = formato - restantes.length;
      const p = j >= Math.max(offset, desde) ? restantes[j - Math.max(offset, desde)] : null;
      return el('i', { 'data-jugado': j < offset ? '' : null, 'data-decisivo': j === formato - 1 ? '' : null, style: { '--v': String(p ?? 0) } });
    })) : el('span'),
    pSerieDe(o) != null ? el('span', { class: 'tx-op-serie' }, [el('b', { class: 'num', text: pct(pSerieDe(o)) }), el('small', { text: decisivo ? 'el mapa' : 'la serie' })]) : el('span')
  ]));
  const ocultas = el('div', { class: 'solo-lectores' }, ops.map((o, i) => el('div', { id: `tx-desc-${i + 1}` }, [o.descripcion ?? '', ' ', pOpc[o.id]?.texto ?? ''])));
  const insp = el('div', { class: 'tx-insp', 'aria-live': 'polite' });
  let apuntada = 0;
  function apuntar(i, { mover = false, detalle = false } = {}) {
    apuntada = Math.max(0, Math.min(ops.length - 1, i));
    const o = ops[apuntada];
    filas.forEach((f, k) => f.classList.toggle('apuntada', k === apuntada));
    // leer menos: en reposo, la prosa; el número de cada mapa recién al apuntar
    insp.replaceChildren(...[
      el('p', { class: 'tx-insp-t' }, [el('b', { text: o.label }), ' ', o.descripcion ?? '']),
      detalle && pOpc[o.id]?.texto ? el('p', { class: 'tx-insp-mono', text: pOpc[o.id].texto }) : null
    ].filter(Boolean));
    if (mover) filas[apuntada].focus({ preventScroll: true });
  }
  filas.forEach((f, i) => {
    f.addEventListener('pointerenter', () => {
      if (elegida) return;
      if (i !== apuntada) fx()?.pulso?.('apuntar');
      apuntar(i, { detalle: true });
    });
    f.addEventListener('focus', () => !elegida && apuntar(i, { detalle: true }));
    f.addEventListener('click', () => elegir(i));
  });
  const secPlan = el('section', { class: 'tx-plan' }, [el('div', { class: 'tx-planes', id: 'decisionOptions', role: 'group', 'aria-label': fecha ? 'Las opciones' : 'El plan' }, filas), insp]);

  // la tira de Fearless: lo quemado de la serie (el leído, marcado)
  const capacidad = formato * 2;
  const slots = Array.from({ length: fecha ? 0 : capacidad }, () => el('li', { class: 'tx-q' }));
  function ponerIcono(slot, n, esLeido = false) {
    slot.dataset.lleno = '';
    slot.title = `${n}: quemado`;
    if (esLeido) slot.dataset.leido = '';
    const ico = el('span', { class: 'tx-q-ico' });
    const k = claveDe(n);
    if (k) {
      cargas.push(cargarImagen(urlIcono(k)).then((img) => {
        if (!img) return;
        const c = img.cloneNode();
        c.alt = n;
        ico.append(c);
      }));
    }
    slot.append(ico);
    return ico;
  }
  quemados0.forEach((n, i) => {
    if (!slots[i]) return;
    ponerIcono(slots[i], n, n === leido);
    // lo que ya estaba quemado al parar: el estado final del quemado, sin animar
    for (const a of quemarCarta(slots[i]) ?? []) a?.finish?.();
  });
  const contador = el('small', { text: quemados0.length ? `${quemados0.length} de ${capacidad}` : 'ninguno todavía' });
  const secFearless = fecha ? null : el('section', { class: 'tx-fearless', 'aria-label': 'Quemados por Fearless' }, [
    el('p', { class: 'eq-kicker' }, [el('span', { text: 'Fearless' }), contador]),
    el('ul', { class: 'tx-qs' }, slots)
  ]);

  // la fecha: el cruce con la p grande y por qué importa (el decisivo jugado como minijuego: la chance del mapa)
  const pFecha = soloNarrar ? (Number.isFinite(pMapa) ? pMapa : pg.p ?? null) : Number.isFinite(pg.p) ? pg.p : decision.datos?.pAntesDeDecidir ?? null;
  const secP = fecha || soloNarrar ? el('section', { class: 'tx-chance', 'aria-label': `${soloNarrar ? 'Tu chance en el mapa decisivo' : 'Tu chance en esta fecha'}: ${pct(pFecha)}` }, [
    el('p', { class: 'eq-kicker' }, [el('span', { text: soloNarrar ? 'Tu chance en el mapa' : 'Tu chance' })]),
    el('p', { class: 'tx-chance-p' }, [el('b', { class: 'num', text: pct(pFecha) }), el('small', { text: soloNarrar ? 'con lo del minijuego' : 'así como llegan' })]),
    el('i', { class: 'tx-chance-barra', style: { '--v': String(pFecha ?? 0) } })
  ]) : null;
  const secPorque = fecha && pg.porQue ? el('section', { class: 'tx-porque' }, [el('p', { class: 'eq-kicker' }, [el('span', { text: 'Lo que se juega' })]), el('p', { class: 'tx-porque-t', text: pg.porQue })]) : null;

  const cuerpo = el('div', { class: 'tx-cuerpo' }, fecha ? [secP, secPlan, secPorque] : soloNarrar ? [secLibres, secP, secFearless] : [secLibres, secPlan, secFearless]);
  const franjaTx = el('div', { class: 'tx-franja panel' }, [cab.nodo, cuerpo, ocultas, vs]);
  raiz.append(arriba, escenario, franjaTx);
  contenedor.replaceChildren(raiz);
  if (ops.length) apuntar(0);

  // el aura: apuntar un libre cruza tu lado de la costura (el nombre lo sigue)
  const nombreA = dueloReposo?.querySelector('.tx-duelo-n[data-lado="a"]');
  const retratoA = dueloReposo?.querySelector('.tx-retrato[data-lado="a"]');
  let auraVigente = tuyoN;
  function apuntarCampeon(n) {
    if (elegida || !n || n === auraVigente) return;
    auraVigente = n;
    mundo?.costura?.({ a: { arte: claveDe(n) } }, quieto() ? 0 : TX.cruce);
    if (!nombreA) return;
    nombreA.textContent = n;
    if (retratoA) ponerRetrato(retratoA, n);
    if (!quieto()) anim(nombreA, [{ opacity: 0, transform: 'translateX(-24px)', clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' }], { duration: 320, easing: EXPO });
  }

  // el logo del lado solo tono sigue a la cara de B (la geometría del ambiente)
  let seguirRaf = 0;
  function seguir() {
    seguirRaf = requestAnimationFrame(seguir);
    if (!logoB || !raiz.isConnected) return;
    const g = carasDe(mundo?.geometria?.());
    const r = escenario.getBoundingClientRect();
    logoB.style.left = `${g.b.x * innerWidth - r.left}px`;
    logoB.style.top = `${g.b.y * innerHeight - r.top}px`;
  }

  // ---------- entrar: la luz (la costura se traza sola) -> el marcador -> los nombres -> la franja ----------
  const d0 = TX.entrada;
  function entrada() {
    anim(arriba, [{ opacity: 0, transform: 'translateY(-18px)' }, { opacity: 1, transform: 'none' }], { delay: Math.max(0, 140 + d0), duration: 380, easing: EXPO });
    parReposo.querySelectorAll('.tx-cara').forEach((c, i) => anim(c, [{ opacity: 0, transform: `translateX(${i ? 40 : -40}px)`, clipPath: i ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' }], { delay: Math.max(0, 300 + d0) + i * 90, duration: 480, easing: EXPO }));
    parReposo.querySelectorAll('.tx-cara-escudo').forEach((x, i) => anim(x, [{ opacity: 0, transform: 'scale(1.6) rotate(-8deg)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { delay: Math.max(0, 380 + d0) + i * 90, duration: 520, easing: EXPO }));
    if (dueloReposo) anim(dueloReposo, [{ opacity: 0, transform: 'translate(-50%, -10px)', clipPath: 'inset(0 50% 0 50%)' }, { opacity: 1, transform: 'translate(-50%, 0)', clipPath: 'inset(0 0 0 0)' }], { delay: Math.max(0, 520 + d0), duration: 460, easing: EXPO });
    anim(franjaTx, [{ opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'none' }], { delay: Math.max(0, 180 + d0), duration: 360, easing: EXPO });
    entrar(cab.rotulo, Math.max(0, 260 + d0), 8);
    lineasConMascara(cab.titulo).forEach((l, i) => animar(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: Math.max(0, 300 + d0) + i * 70, dur: 420 }));
    entrar(cab.planteo, Math.max(0, 420 + d0), 8);
    cartasLibres.forEach((li, i) => anim(li, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { delay: Math.max(0, 420 + d0) + i * 45, duration: 320, easing: EXPO }));
    const tPlan = Math.max(0, (replan ? 1150 : 480) + d0);
    filas.forEach((f, i) => {
      anim(f, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay: tPlan + i * 60, duration: 300, easing: EXPO });
      const b = f.querySelector('.tx-op-serie b');
      if (b) anim(b, [{ opacity: 0 }, { opacity: 1 }], { delay: tPlan + 120 + i * 60, duration: 260 });
      f.querySelectorAll('.tx-op-mapas i').forEach((x, k) => anim(x, [{ transform: 'scaleY(0)' }, { transform: 'none' }], { delay: tPlan + 80 + i * 60 + k * 30, duration: 420, easing: EXPO }));
    });
    slots.forEach((s, i) => anim(s, [{ opacity: 0 }, { opacity: 1 }], { delay: Math.max(0, 520 + d0) + i * 25, duration: 200 }));
    if (secP) {
      entrar(secP, Math.max(0, 420 + d0), 10);
      anim(secP.querySelector('.tx-chance-barra'), [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: Math.max(0, 520 + d0), duration: 620, easing: EXPO });
    }
    if (logoB) seguir();
    if (replan) {
      // te leyeron: la luz se quiebra, el aviso de la transmisión y el quemado de lo que te leyeron
      fx()?.quiebre?.(quieto() ? 0 : TX.alerta[0]);
      const aviso = el('div', { class: 'tx-alerta', role: 'status' }, placaInferior({
        rotulo: 'Replan · te leyeron',
        titulo: `${ellos} te leyó ${leido ?? 'el plan'}`,
        sub: `${leido ? `${leido} sale quemado para vos` : 'Lo que guardabas ya no está'}: rearmá el plan para los mapas que quedan.`,
        tono: { id: 'tx-alerta', luz: '--down', contra: '--down', acento: '--down', noche: tComp.noche, vacio: tComp.vacio }
      }));
      escenario.append(aviso);
      ventanaTx(aviso, TX.alerta[0], TX.alerta[1]);
      const sl = slots.find((s) => s.hasAttribute('data-leido'));
      if (sl && !quieto()) quemarCarta(sl, { retardo: TX.alerta[0] + 420 });
    }
  }
  entrada();

  // ---------- elegir: el plan queda fijado y se responde al motor (solo para narrar: ya está elegido) ----------
  let elegida = soloNarrar ? { i: -1, op: null } : null;
  if (soloNarrar) {
    raiz.dataset.jugando = '';
    // montada en otro panel (el del minijuego): sin el id del encabezado de la decisión, que sigue en `#decision`
    cab.titulo.removeAttribute('id');
  }
  function elegir(i) {
    const op = ops[i];
    if (!op || elegida) return;
    elegida = { i, op };
    raiz.dataset.jugando = '';
    apuntar(i);
    filas.forEach((f, j) => {
      if (j !== i) f.classList.add('bloqueada');
      f.setAttribute('aria-disabled', 'true');
    });
    for (const c of libresNodos.values()) c.removeAttribute('data-campeon');
    pipsMapa.forEach((p) => p.removeAttribute('data-siguiente'));
    fx()?.pulso?.('elegir');
    mundo?.aquietar?.(false);
    sonido?.clic?.();
    responder({ opcionId: op.id });
  }
  raiz.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || elegida) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      apuntar(apuntada + (e.key === 'ArrowDown' ? 1 : -1), { mover: true, detalle: true });
    }
  });

  // ---------- narrar: la serie mapa a mapa (o la fecha), como una secuencia de beats ----------
  let beats = null;
  // la placa de cierre: al terminar la narración queda puesta (la foto de la transición al relato la lleva)
  let cierreNodo = null;
  async function narrar(ctx) {
    if (!elegida || !raiz.isConnected) return 0;
    const logs = fecha ? logsDeLaFecha(ctx.logs ?? []) : logsDeLaSerie(ctx.logs ?? []);
    if (logs.length === 0) return 0;
    const b = fecha ? secuenciaFecha(logs) : secuenciaSerie(logs);
    beats = b.beats;
    // Espacio: los beats van a `asentarse`; un cuarto: se pausan (el reloj de la narración es el de los beats). Con
    // movimiento reducido, Espacio, Enter o un clic adelantan un cuadro.
    const narracion = crearNarracion(ctx, [raiz], { reloj: b.beats });
    try {
      b.beats.iniciar();
      if (narracion.modo === 'reducido' && cuadrosQuietos()) {
        await contarEnCuadros(b.beats, b.cuadros, narracion, { escenario, vivo: () => raiz.isConnected });
      } else if (!narracion.saltada) {
        await b.beats.esperar(b.asentarse);
        await narracion.esperar(TX.sostener);
      }
    } finally {
      if (cierreNodo?.isConnected) cierreNodo.style.visibility = 'visible';
      narracion.fin();
    }
    return logs.length;
  }

  // La serie: los mapas, las placas del vestuario, el suspenso del decisivo y la placa de cierre.
  function secuenciaSerie(logs) {
    const iMapas = logs.map((l, i) => (l.mapa ? i : -1)).filter((i) => i >= 0);
    const primero = iMapas[0] ?? -1;
    const mapasT = [];
    const charlas = [];
    let tt = TX.t0 + (soloNarrar ? TX.presentar : 0);
    logs.forEach((l, i) => {
      if (l.mapa) {
        const s = esDecisivo(l, formato) && !quieto() ? TX_SUS.dura : 0;
        mapasT.push({ l, t0: tt, k: claveDe(l.campeon), rk: claveDe(l.rivalJuega), s });
        tt += TX.mapa + s;
      } else if (!l.postSerie && (i < primero ? !l.adjunto : true)) {
        charlas.push({ l, t0: tt });
        tt += TX.charla;
      }
    });
    const tFin = tt;
    const fin = logs[logs.length - 1];
    const b = crearBeats({ duracion: tFin + TX.cierreDur, asentarse: tFin + TX.asentarse });
    // los cuadros del movimiento reducido (PLANUI §0.3): cada vestuario, cada mapa (el decisivo, antes y después) y el
    // cierre, cada uno con su tiempo de lectura. El quemado de Fearless llega con el cuadro de su mapa (su estado final es
    // una clase: puesta al armar, se vería quemado desde el primer cuadro).
    const cuadros = [];
    const quemasEnCuadros = [];
    const quemarHasta = (t) => {
      for (const x of quemasEnCuadros) {
        if (x.hecha || x.t > t) continue;
        x.hecha = true;
        quemarCarta(x.nodo);
      }
    };

    // los nombres de la selección se van cuando entra el primer mapa
    b.waapi(irseEn(parReposo, mapasT[0]?.t0 ?? TX.t0));
    if (dueloReposo) b.waapi(irseEn(dueloReposo, mapasT[0]?.t0 ?? TX.t0));
    // los retratos de cada mapa, antes de que entre el primero
    for (const mp of mapasT) for (const k of [mp.k, mp.rk]) if (k) cargarImagen(urlIcono(k));
    if (logoB) b.waapi(irseEn(logoB, mapasT[0]?.t0 ?? TX.t0));

    const quemados = new Set(quemados0);
    let qi = quemados0.length;
    const cuentaQ = [];
    mapasT.forEach((mp, j) => {
      const tSig = mapasT[j + 1]?.t0 ?? (charlas.find((c) => c.t0 > mp.t0)?.t0 ?? tFin);
      jugarMapa(b, mp, tSig, j === mapasT.length - 1);
      cuentaQ.push({ t: mp.t0 + TX.quema + mp.s, n: qi });
    });
    charlas.forEach((ch) => {
      const caja = el('div', { class: 'tx-charla' }, placaInferior({ rotulo: 'Vestuario · el coach', titulo: ch.l.message, tono: tComp }));
      juego.append(caja);
      b.waapi(ventanaTx(caja, ch.t0, TX.charla));
      cuadros.push({ t: ch.t0 + TX.charla / 2, lectura: LECTURA.charla });
    });
    const ganoSerie = fin?.postSerie ? Boolean(fin.gano) : mapasT[mapasT.length - 1]?.l.resultado === 'W';
    cierreSerie(b, fin?.postSerie ? fin : null, mapasT, tFin, ganoSerie);

    function jugarMapa(bb, mp, tSig, esUltimo) {
      const { l, t0, k, rk, s } = mp;
      const gano = l.resultado === 'W';
      const tR = t0 + TX.resultado + s;
      const par = parCaras({ subA, subB: ellos, clase: 'tx-par-mapa' });
      caras.append(par);
      bb.waapi(ventanaTx(par, t0, tSig - t0 + (esUltimo ? 200 : 0), 160, 160));
      par.querySelectorAll('.tx-cara-n').forEach((x, i) => bb.waapi(anim(x, [{ transform: `translateX(${i ? 34 : -34}px)`, clipPath: i ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }, { transform: 'none', clipPath: 'inset(0 0 0 0)' }], { delay: t0 + 140 + i * 60, duration: 420, easing: EXPO })));
      const carta = (kk, n, tono, lado, quien, org) => {
        const c = el('canvas', { class: 'tx-carga-arte', width: String(TX_CARTA.mapa[0]), height: String(TX_CARTA.mapa[1]), 'aria-hidden': 'true' });
        if (kk) cargas.push(cargarImagen(urlCarga(kk)).then((img) => pintarEnTono(c, img, tono, TX_FOCO_CARGA)));
        return el('figure', { class: 'tx-carga', 'data-lado': lado }, [c, el('figcaption', {}, [el('b', { text: n }), el('span', {}, [logoOrg(org, { clase: 'tx-carga-logo' }), quien])])]);
      };
      const cA = carta(k, l.campeon, tA, 'a', subA, nos);
      const cB = l.rivalJuega ? carta(rk, l.rivalJuega, tB, 'b', sEllos, ellos) : null;
      const vd = victoriaDerrota({ gano, sub: `Mapa ${l.mapa} · ${String(l.marcador).replace('-', '–')} · tenías ${pct(l.p)}`, retardo: tR });
      const caja = el('div', { class: 'tx-vd', 'data-lado': gano ? 'a' : 'b' }, vd.nodo);
      // VICTORIA o DERROTA cae sobre el nombre gigante de su lado: cuando entra, ese nombre se atenúa (en la vitrina la
      // franja del nombre queda más abajo; en el juego el escenario es más bajo y se cruzarían). Opacidad: corre también
      // con movimiento reducido, en su cuadro (cae en `tR`, igual que la placa).
      const nombreDelLado = par.querySelectorAll('.tx-cara-n')[gano ? 0 : 1];
      if (nombreDelLado) bb.waapi(anim(nombreDelLado, [{ opacity: 1 }, { opacity: 0.2 }], { delay: tR, duration: 260, easing: 'ease-out', fill: 'forwards', forzar: true }));
      // el rótulo del mapa lleva su duelo: cada mapa, su campeón (Fearless no repite)
      const rot = el('div', { class: 'tx-mapa-n' }, [
        el('p', { class: 'tx-mapa-k' }, [el('b', { text: `Mapa ${l.mapa}` }), l.mapa === formato && formato > 1 ? el('span', { text: 'el decisivo' }) : null]),
        duelo(l.campeon, l.rivalJuega, 'tx-duelo-mapa')
      ]);
      const capa = el('div', { class: 'tx-mapa', 'data-res': l.resultado }, [rot, cA, cB, caja]);
      juego.append(capa);
      bb.waapi(ventanaTx(capa, t0, tSig - t0 + (esUltimo ? 200 : 0), 120, 220));
      // movimiento reducido: VICTORIA o DERROTA aparece en su momento (el cuadro de antes no adelanta el resultado)
      bb.waapi(apareceEn(caja, tR));
      if (cuadrosQuietos()) {
        // el decisivo: un cuadro antes del resultado, con lo que se juega y la chance del motor (el suspenso, quieto)
        if (esDecisivo(l, formato)) {
          const [a, b2] = String(l.marcador).split('-').map(Number);
          const empate = gano ? `${a - 1}–${b2}` : `${a}–${b2 - 1}`;
          const pl = placaDecisiva({ rotulo: `En juego · ${empate}`, linea: `el que gana se lleva ${se.ronda === 'final' ? 'la final' : 'la serie'}`, p: l.p, nos, ellos, pie: 'la chance del motor para este mapa' });
          capa.append(pl.nodo);
          bb.waapi(ventanaTx(pl.nodo, t0, TX.resultado));
          cuadros.push({ t: t0 + CUADRO.previa, lectura: LECTURA.previa });
        }
        cuadros.push({ t: t0 + CUADRO.mapa + s, lectura: LECTURA.mapa, al: () => quemarHasta(t0 + CUADRO.mapa + s) });
      }
      bb.waapi(anim(rot, [{ opacity: 0, transform: 'translate(-50%, -10px)', letterSpacing: '0.4em' }, { opacity: 1, transform: 'translate(-50%, 0)' }], { delay: t0 + TX.rotulo, duration: 360, easing: EXPO }));
      [cA, cB].forEach((c, j) => c && bb.waapi(anim(c, [{ opacity: 0, transform: `translateX(${j ? 52 : -52}vw) rotate(${j ? 5 : -5}deg)` }, { opacity: 1, transform: 'none' }], { delay: t0 + TX.carta + j * 60, duration: TX.cartaDur, easing: EXPO })));
      bb.waapi(vd.animaciones);
      const [cg, cp] = gano ? [cA, cB] : [cB, cA];
      if (cg) bb.waapi(anim(cg, [{ filter: 'brightness(1.7)' }, { filter: 'none' }], { delay: tR, duration: 640, easing: EXPO }));
      if (cp) bb.waapi(anim(cp, [{ filter: 'none' }, { filter: 'grayscale(1) brightness(0.5)' }], { delay: tR, duration: 360, fill: 'both' }));
      const td = bb.destello(tR + 40);
      if (td != null && gano) fx()?.pulso?.('logro', td);
      bb.esperar(tR + 60).then((ok) => ok && (gano ? sonido?.victoria?.() : sonido?.derrota?.()));
      if (s) suspenso(bb, { l, tS: t0 + TX.resultado, cA, cB, capa });
      const pin = pipsMapa[l.mapa - 1]?.firstElementChild;
      if (pin) {
        pin.dataset.res = l.resultado;
        bb.waapi(anim(pin, [{ opacity: 0, transform: 'scaleX(0)' }, { opacity: 1, transform: 'none' }], { delay: t0 + TX.pip + s, duration: 380, easing: EXPO }));
        bb.waapi(apareceEn(pin, t0 + TX.pip + s));
      }
      bb.esperar(t0 + TX.pip + s).then((ok) => ok && sonido?.golpe?.());
      // Fearless: los dos picks se queman (en la tira y, si era un libre tuyo, su carta)
      let quemo = false;
      for (const q of [l.campeon, l.rivalJuega]) {
        if (!q || quemados.has(q)) continue;
        quemados.add(q);
        const slot = slots[qi++];
        if (slot) {
          const ico = ponerIcono(slot, q);
          bb.waapi(anim(ico, [{ opacity: 0, transform: 'scale(1.7)' }, { opacity: 1, transform: 'none' }], { delay: t0 + TX.quema + s - 180, duration: 240, easing: EXPO }));
          bb.waapi(apareceEn(ico, t0 + TX.quema + s - 180));
          if (cuadrosQuietos()) quemasEnCuadros.push({ t: t0 + TX.quema + s, nodo: slot });
          else bb.waapi(quemarCarta(slot, { retardo: t0 + TX.quema + s }));
          quemo = true;
        }
        const lib = libresNodos.get(q);
        if (lib && cuadrosQuietos()) quemasEnCuadros.push({ t: t0 + TX.quema + s, nodo: lib });
        else if (lib) bb.waapi(quemarCarta(lib, { retardo: t0 + TX.quema + s }));
      }
      if (quemo) bb.esperar(t0 + TX.quema + s).then((ok) => ok && sonido?.quemado?.());
    }

    // el suspenso del decisivo: las cartas se abren y entra la placa con la chance del motor
    function suspenso(bb, { l, tS, cA, cB, capa }) {
      const D = TX_SUS.dura;
      const cel = celular();
      const [a, b2] = String(l.marcador).split('-').map(Number);
      const empate = l.resultado === 'W' ? `${a - 1}–${b2}` : `${a}–${b2 - 1}`;
      const pl = placaDecisiva({ rotulo: `En juego · ${empate}`, linea: `el que gana se lleva ${se.ronda === 'final' ? 'la final' : 'la serie'}`, p: l.p, nos, ellos, pie: 'la chance del motor para este mapa' });
      capa.append(pl.nodo);
      entrarPlaca(bb, pl, tS);
      const caja = document.documentElement;
      const px = cel ? caja.clientHeight || innerHeight : caja.clientWidth || innerWidth;
      const eje = cel ? 'y' : 'x';
      const abre = (u) => (cel ? 0 : TX_SUS.separar * expoSus(u * (D / TX_SUS.abrir)));
      [cA, cB].forEach((c, j) => c && bb.waapi(anim(c, cuadrosTira(px, { eje, base: (u) => (j ? 1 : -1) * abre(u), k: TX_SUS.siguen, crece: TX_SUS.crece, lado: j ? -1 : 1 }), { delay: tS, duration: D, fill: 'both' })));
      const latidos = programarSuspenso({ b: bb, api: fx(), sonido, tS });
      latirPlaca(bb, pl, latidos, tS);
      const tL = tS - TX_SUS.latido.cae;
      const dL = D + TX_SUS.latido.cae;
      const pip = pipsMapa[l.mapa - 1];
      const halo = (v) => ({ boxShadow: `inset 0 0 0 1px var(--linea-fuerte), 0 0 ${(v * TX_SUS_PIP).toFixed(1)}px var(--luz)` });
      if (pip) bb.waapi(anim(pip, cuadrosLatido(latidos, tL, dL, { valor: halo }), { delay: tL, duration: dL, fill: 'none' }));
    }

    // los participantes que no son WAAPI: la costura (el ambiente) y el marcador (la gráfica del kit)
    b.agregar({
      fps: 20,
      i: -2,
      en(t2) {
        let i = -1;
        for (let j = 0; j < mapasT.length; j++) if (t2 >= mapasT[j].t0) i = j;
        if (i === this.i) return;
        this.i = i;
        const mp = mapasT[i];
        mundo?.costura?.(mp ? { a: { arte: mp.k }, b: { arte: mp.rk ?? null } } : { a: { arte: tuyo }, b: { arte: suyo } }, quieto() ? 0 : TX.cruce);
      }
    });
    b.agregar({
      fps: 30,
      n: -1,
      en(t2) {
        let s = 0;
        for (const mp of mapasT) if (t2 >= mp.t0 + TX.pip + mp.s) s++;
        let q = quemados0.length;
        for (const x of cuentaQ) if (t2 >= x.t) q = x.n;
        contador.textContent = q ? `${q} de ${capacidad}` : 'ninguno todavía';
        if (s === this.n) return;
        this.n = s;
        mc.actualizar({ mapas: [...jugados, ...mapasT.slice(0, s).map((x) => x.l)].map((x) => ({ resultado: x.resultado })) });
      }
    });
    // el desenlace en el mundo: la luz cae (perdiste), sube (gloria) o queda en tensión (la serie sigue). Con
    // movimiento reducido llega con el cuadro de la placa de cierre (antes adelantaría el resultado).
    const animoFin = fin?.postSerie ? (ganoSerie ? 'gloria' : 'caida') : 'peligro';
    const desenlace = () => mundo?.momento?.(animoFin, { retardo: 0 });
    if (cuadrosQuietos()) cuadros.push({ t: tFin + TX.cierreDur, lectura: LECTURA.cierre, al: () => (quemarHasta(Infinity), desenlace()) });
    else mundo?.momento?.(animoFin, { retardo: quieto() ? 0 : tFin });
    if (animoFin === 'gloria') {
      const td = b.destello(tFin);
      if (td != null) fx()?.pulso?.('gloria', td);
    }
    return { beats: b, asentarse: tFin + TX.asentarse, cuadros: cuadros.sort((x, y) => x.t - y.t) };
  }

  // La placa de cierre de la serie: el resultado grande (los dos logos y el marcador), quién se la lleva y el texto.
  function cierreSerie(b, finLog, mapasT, t0, gano) {
    const ultimoMp = mapasT[mapasT.length - 1]?.l;
    const sigue = !finLog;
    const [a, bb] = finLog?.marcador ?? String(ultimoMp?.marcador ?? `${marcadorAhora[0]}-${marcadorAhora[1]}`).split('-');
    const titular = sigue ? 'La serie sigue' : gano ? (se.ronda === 'final' ? 'Campeones' : `${sNos} gana la serie`) : `${sEllos} gana ${se.ronda === 'final' ? 'la final' : 'la serie'}`;
    const texto = finLog?.message ?? ultimoMp?.cierre ?? '';
    // W1-D (PLANUI §0.7, W3): la final que se perdió en el mapa que la definía dice qué tan cerca estuvo
    const esFinal = se.ronda === 'final' || (se.torneo === 'mundial' && se.etapa === 'final');
    const cerca = finLog && !gano && esFinal
      ? tanCercaDeLaFinal({ perdioLaFinal: true, decisivo: esDecisivo(ultimoMp, formato), pFinal: ultimoMp?.p, pSinJugada: pSinLaJugada(ultimoMp) })
      : null;
    placaCierre(b, { a, b: bb, t0, titular, texto, cerca, gana: sigue ? null : gano, sub: `${sNos} ${a ?? ''}–${bb ?? ''} ${sEllos}${sigue ? ' · la serie sigue' : ''}`, rotulo: `${comp.rotulo} · ${ronda} · Bo${formato}` });
  }
  // La chance que tenía el mapa decisivo sin el minijuego (el plan y la charla, la misma cuenta que `systems/serie.js`), para
  // decir si la jugada lo movió a favor o en contra. `null` si el decisivo no se jugó como minijuego.
  function pSinLaJugada(l) {
    const d = decision.datos ?? {};
    if (!soloNarrar || !d.conMinijuego || !Number.isFinite(d.fuerzaPropia)) return null;
    try {
      return probabilidadDeMapa(estado, d.fuerzaPropia, (d.ajustePlan ?? 0) + ajusteDeCharla(Boolean(l?.charla)));
    } catch {
      return null;
    }
  }
  function placaCierre(b, { a, b: bb, t0, titular, texto, cerca = null, gana, sub: subT, rotulo: rot }) {
    const res = el('div', { class: 'tx-cierre-res' }, [
      el('span', { class: 'tx-cierre-eq', 'data-lado': 'a', 'data-gana': gana === true ? '' : null }, [logoOrg(nos, { clase: 'tx-cierre-logo' }), el('b', { class: 'num', text: String(a ?? '') })]),
      el('i', { class: 'tx-cierre-guion', 'aria-hidden': 'true', text: '–' }),
      el('span', { class: 'tx-cierre-eq', 'data-lado': 'b', 'data-gana': gana === false ? '' : null }, [el('b', { class: 'num', text: String(bb ?? '') }), logoOrg(ellos, { clase: 'tx-cierre-logo' })])
    ]);
    const titulo = el('p', { class: 'tx-cierre-t', 'data-gano': gana == null ? 'sigue' : String(Boolean(gana)), text: titular });
    const placa = placaInferior({ rotulo: rot, titulo: texto, sub: subT, tono: tComp });
    const casi = cerca ? el('p', { class: 'tx-cierre-cerca' }, [el('b', { text: cerca.rotulo }), el('span', { text: cerca.texto })]) : null;
    const nodo = el('div', { class: 'tx-cierre', role: 'status', 'aria-label': `${titular}: ${nos} ${a}, ${ellos} ${bb}${cerca ? `. ${cerca.rotulo}: ${cerca.texto}` : ''}` }, [res, titulo, ...(casi ? [casi] : []), el('div', { class: 'tx-cierre-pie' }, placa)]);
    juego.append(nodo);
    cierreNodo = nodo;
    // la placa entra y QUEDA (fill forwards: antes se iba con su animación de entrada y el cierre duraba 360 ms). Sin
    // animación (movimiento reducido), queda puesta igual.
    const ver = anim(nodo, [{ opacity: 0, visibility: 'visible' }, { opacity: 1, visibility: 'visible' }], { delay: t0, duration: 360, fill: 'forwards', forzar: true });
    if (!ver) nodo.style.visibility = 'visible';
    b.waapi([
      ver,
      anim(res, [{ transform: 'scale(1.35)', filter: 'blur(10px) brightness(2)' }, { transform: 'none', filter: 'none' }], { delay: t0, duration: 520, easing: EXPO }),
      anim(titulo, [{ opacity: 0, letterSpacing: '0.32em', transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay: t0 + 220, duration: 560, easing: EXPO }),
      anim(placa, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { delay: t0 + 480, duration: 420, easing: EXPO }),
      ...(casi ? [anim(casi, [{ opacity: 0, transform: 'translateY(8px)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { delay: t0 + 380, duration: 520, easing: EXPO })] : [])
    ]);
  }

  // La fecha: lo que dejó el momento (una placa), EN JUEGO con la chance del motor y el resultado; al final la placa de
  // cierre con lo que dice el motor (la tabla).
  function secuenciaFecha(logs) {
    const partido = logs[logs.length - 1];
    const antes = logs.slice(0, -1).filter((l) => !l.tecnico);
    let tt = TX.t0;
    const placas = antes.map((l) => {
      const caja = el('div', { class: 'tx-charla' }, placaInferior({ rotulo: 'Lo que elegiste', titulo: l.cuerpo ?? l.message, sub: l.efectos ?? '', tono: tComp }));
      const x = { caja, t0: tt };
      tt += TX.charla + 400;
      return x;
    });
    const tJuego = tt;
    const tR = tJuego + TX.juego;
    const tFin = tR + TX.mapa - TX.resultado;
    const b = crearBeats({ duracion: tFin + TX.cierreDur, asentarse: tFin + TX.asentarse });
    // los cuadros del movimiento reducido: lo que dejó el momento, EN JUEGO, el resultado y el cierre
    const cuadros = [];
    b.waapi(irseEn(parReposo, tJuego));
    if (dueloReposo) b.waapi(irseEn(dueloReposo, tJuego));
    if (logoB) b.waapi(irseEn(logoB, tFin));
    placas.forEach((x) => {
      juego.append(x.caja);
      b.waapi(ventanaTx(x.caja, x.t0, TX.charla + 400));
      cuadros.push({ t: x.t0 + (TX.charla + 400) / 2, lectura: LECTURA.charla });
    });
    if (cuadrosQuietos()) {
      cuadros.push({ t: tJuego + CUADRO.juego, lectura: LECTURA.previa }, { t: tR + CUADRO.resultado, lectura: LECTURA.mapa }, { t: tFin + TX.cierreDur, lectura: LECTURA.cierre });
    }
    const gano = Boolean(partido.gano);
    const movio = Number.isFinite(partido.pSinMomento) && pct(partido.pSinMomento) !== pct(partido.p);
    const enJuego = el('div', { class: 'tx-sw-enjuego tx-enjuego' }, [
      el('p', { class: 'tx-sw-enjuego-k' }, [el('i', { class: 'tx-sw-punto' }), 'En juego']),
      el('p', { class: 'tx-sw-enjuego-vs' }, [logoOrg(nos, { clase: 'tx-cara-logo' }), el('b', { text: `${sNos} vs ${sEllos}` }), logoOrg(ellos, { clase: 'tx-cara-logo' })]),
      el('p', { class: 'tx-sw-enjuego-p' }, [el('b', { class: 'num', text: pct(partido.p) }), el('span', { text: movio ? `tu chance · el momento la movió desde ${pct(partido.pSinMomento)}` : 'tu chance en esta fecha' })])
    ]);
    juego.append(enJuego);
    b.waapi(ventanaTx(enJuego, tJuego, TX.juego + 120));
    const vd = victoriaDerrota({ gano, sub: `vs ${ellos} · tenías ${pct(partido.p)}`, retardo: tR });
    const vdCaja = el('div', { class: 'tx-vd', 'data-lado': gano ? 'a' : 'b' }, vd.nodo);
    juego.append(vdCaja);
    b.waapi(ventanaTx(vdCaja, tR, tFin - tR + 200, 60, 260));
    b.waapi(vd.animaciones);
    const td = b.destello(tR + 40);
    if (td != null && gano) fx()?.pulso?.('logro', td);
    b.esperar(tR + 60).then((ok) => ok && (gano ? sonido?.victoria?.() : sonido?.derrota?.()));
    const pin = pipsMapa[0]?.firstElementChild;
    if (pin) {
      pin.dataset.res = gano ? 'W' : 'L';
      b.waapi(anim(pin, [{ opacity: 0, transform: 'scaleX(0)' }, { opacity: 1, transform: 'none' }], { delay: tR + 200, duration: 380, easing: EXPO }));
      b.waapi(apareceEn(pin, tR + 200));
    }
    b.agregar({
      fps: 30,
      n: -1,
      en(t2) {
        const s = t2 >= tR + 200 ? 1 : 0;
        if (s === this.n) return;
        this.n = s;
        mc.actualizar({ mapas: s ? [{ resultado: gano ? 'W' : 'L' }] : [] });
      }
    });
    placaCierre(b, { a: gano ? 1 : 0, b: gano ? 0 : 1, t0: tFin, titular: gano ? `${sNos} gana` : `${sEllos} gana`, texto: partido.message, gana: gano, sub: Number.isFinite(partido.posicion) ? `Quedan ${partido.posicion}.º de ${partido.equipos}` : '', rotulo: `${comp.rotulo} · ${decision.datos?.etiqueta ?? 'Fecha marcada'}` });
    return { beats: b, asentarse: tFin + TX.asentarse, cuadros: cuadros.sort((x, y) => x.t - y.t) };
  }

  return {
    titulo: cab.titulo,
    // El mundo de la parada (PLANUI §0.2, punto 3): la costura cara a cara en el tono de la competición, con público.
    mundo: { arte: tuyo, encuadre: celular() ? 'celular' : 'derecha', velo: 0, tono: tComp, paleta: paletaDe(tComp), costura: costura0, escena: 'costura', lightsticks: 1 },
    listo: () => Promise.all([...cargas, logosListos(raiz)]),
    narrar,
    destruir() {
      cancelAnimationFrame(seguirRaf);
      beats?.destruir();
      mundo?.soltarMomento?.();
    }
  };
}

// El mapa decisivo que se jugó como minijuego (PLANUI §0.3, punto 6.1): la misma transmisión, montada solo para narrar
// (`soloNarrar`: sin el plan, con la chance del mapa en su lugar), en `contenedor` (lo vacía). `decision`: la del
// minijuego (`datos.momento === 'mapa_decisivo'`, con `campeonElegido` y `fuerzaPropia`); `estado`: el de la parada (antes
// de la respuesta: los mapas ya jugados, el marcador, los quemados); `pMapa`: la chance con la que se tiró el mapa.
// Devuelve la vista: { titulo, mundo, narrar(ctx), destruir() }; `narrar` cuenta el mapa y el cierre con `ctx.logs`.
export function crearCaraACaraDeNarracion(contenedor, decision, { estado, previa = null, mundo = null, sonido = null, internacional = false, pMapa = null }) {
  const datos = decision?.datos ?? {};
  const narrable = {
    titulo: decision?.titulo ?? 'El mapa decisivo',
    descripcion: '',
    opciones: [],
    // `conMinijuego` y `ajustePlan` (W1-D): con ellos la placa de cierre sabe cuánto movió la jugada la chance del mapa
    datos: { motivo: 'decisivo', campeonElegido: datos.campeonElegido ?? null, fuerzaPropia: datos.fuerzaPropia ?? null, ajustePlan: datos.ajustePlan ?? null, conMinijuego: datos.motivo === 'minijuego' }
  };
  return crearCaraACara(contenedor, narrable, { estado, previa, mundo, sonido, responder: () => {}, modo: 'serie', internacional, soloNarrar: true, pMapa });
}

// Precarga del arte de carga de los campeones que puede jugar (lo que la serie va a mostrar mapa a mapa).
export function precargarSerie(nombres) {
  for (const n of nombres) {
    const k = claveDe(n);
    if (k) cargarImagen(urlCarga(k));
  }
}
