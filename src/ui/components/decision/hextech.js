// La decisión en la variante `hextech` de la previa (`?dc=hextech`, PLANUI §0.4): un evento del cliente de LoL. El
// contrato es el de `crearDecision` (cabecera de `decision/comun.js`): las mismas opciones y el mismo retorno.
//
// - El marco: un cuadro centrado con el borde dorado (doble filo y ornamentos en las esquinas) y el interior azul noche.
// - Arriba, la ilustración: un recorte ancho del splash de tu main con viñeta y un paneo lento (Ken Burns), y encima el
//   rótulo, el título y el planteo con su "más".
// - Las opciones son botones del cliente: borde dorado, el label en display condensada, los chips de eje abajo y, a la
//   derecha, un anillo: con p, el % real; sin p, el riesgo en segmentos (1-4) con su palabra y su ícono. Nunca un número
//   inventado.
// - Apuntar: el botón se enciende, el anillo gira y brilla, pasa un reflejo y la prosa va al panel de abajo del marco.
// - Elegir: el botón se comprime y estalla en un anillo de luz con chispas (posición y velocidad de `azar.js`), el marco
//   destella, la ilustración se pliega hacia arriba y "lo que pasó" aparece en el marco.
// - El plan del año (la planilla): una tabla con filas hextech, barras por eje en sus colores y la cabecera con los
//   valores de hoy.
//
// El comportamiento (la costura, el teclado, el inspector, elegir, `narrar`) es el de `components/decision.js`.
import { el, svg, animar, quieto, celular, EXPO, SALE, DUR } from '../../fx/util.js';
import { entrar, salir, esperar, lineasConMascara, num } from '../../fx/movimiento.js';
import { icono, glifoDeCampo, triangulos } from '../../fx/iconos.js';
import { urlSplash } from '../../fx/arte.js';
import { azarFx } from '../../fx/azar.js';
import { rotuloDeDecision } from '../../formatoUi.js';
import { crearCostura, equiposDelMundo } from '../costura.js';
import { crearNarracion } from '../../narracion.js';
import { ejeDe } from '../../core/ejes.js';
import { leerDecision, partirDescripcion, estiloEje, campoCorto, conSigno, porcentaje, RIESGO, T_RESULTADO, tarjetaDelResultado, animarResultado, pulsoDelResultado, riesgoNodo as nodoDeRiesgo } from './comun.js';

// La coreografía (ms). Entrada: desde que se pinta. Elegir: desde la tecla.
const T = {
  marco: 0,
  orn: 180,
  ornPaso: 70,
  splash: 60,
  rotulo: 260,
  titulo: 320,
  tituloPaso: 70,
  planteo: 480,
  ops: 560,
  opPaso: 80,
  anillo: 680,
  detalle: 900,
  compresion: 90, // el botón se comprime antes de estallar
  rebote: 300, // compresión + rebote
  aro: 720, // el anillo de luz
  chispaMin: 420,
  chispaMax: 860,
  destello: 560,
  estallido: 460, // lo que se deja ver el estallido antes de que el marco cuente lo que pasó
  plegar: 560, // la ilustración se pliega
  tarjeta: 560
};
// El estallido: cuántas chispas, cuán lejos (px) y cuán largas.
const CHISPAS = { n: 22, distMin: 70, distMax: 230, largoMin: 6, largoMax: 18, retardoMax: 90 };
const ARO = { r0: 10, alcance: 0.42, trazo0: 7, trazo1: 0.5 }; // `alcance`: fracción del ancho del marco
// El anillo de las opciones (unidades del viewBox de 64).
const ANILLO = { c: 32, r: 25, orla: 30, hueco: 9, giro: 30 };
// El riesgo como segmentos lleno de 4.
const NIVEL_RIESGO = { seguro: 1, incierto: 2, ruleta: 3, alto: 4 };
const SEGMENTOS = 4;
const GRADOS = 360;
const RAD = Math.PI / 180;

// Un arco del anillo, de `a0` a `a1` grados (0 = arriba, sentido horario).
function arco(r, a0, a1) {
  const p = (a) => [ANILLO.c + r * Math.cos((a - 90) * RAD), ANILLO.c + r * Math.sin((a - 90) * RAD)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > GRADOS / 2 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

// El anillo de una opción: con p, el % real; sin p, el riesgo en segmentos. `chico`: el de la planilla (sin rótulo).
function anillo(o, p, riesgo, { chico = false } = {}) {
  if (p == null && !riesgo) return null;
  const giro = svg('g', { class: 'hx-anillo-giro' }, [svg('circle', { class: 'hx-anillo-orla', cx: ANILLO.c, cy: ANILLO.c, r: ANILLO.orla })]);
  if (p != null) {
    const circ = 2 * Math.PI * ANILLO.r;
    giro.append(
      svg('circle', { class: 'hx-anillo-riel', cx: ANILLO.c, cy: ANILLO.c, r: ANILLO.r }),
      svg('circle', { class: 'hx-anillo-arco', cx: ANILLO.c, cy: ANILLO.c, r: ANILLO.r, 'stroke-dasharray': `${(circ * p).toFixed(2)} ${circ.toFixed(2)}`, 'data-largo': (circ * p).toFixed(2), 'data-circ': circ.toFixed(2), transform: `rotate(-90 ${ANILLO.c} ${ANILLO.c})` })
    );
  } else {
    const n = NIVEL_RIESGO[riesgo] ?? NIVEL_RIESGO.incierto;
    const paso = GRADOS / SEGMENTOS;
    for (let k = 0; k < SEGMENTOS; k++) {
      giro.append(svg('path', { class: `hx-seg${k < n ? ' lleno' : ''}`, d: arco(ANILLO.r, k * paso + ANILLO.hueco / 2, (k + 1) * paso - ANILLO.hueco / 2) }));
    }
  }
  const pct = p != null ? porcentaje(p) : null;
  return el('span', {
    class: `hx-anillo${chico ? ' hx-anillo-chico' : ''}`,
    'data-riesgo': riesgo ?? null,
    'data-modo': p != null ? 'p' : 'riesgo',
    role: p != null ? 'meter' : null,
    'aria-valuemin': p != null ? '0' : null,
    'aria-valuemax': p != null ? '100' : null,
    'aria-valuenow': p != null ? String(pct) : null,
    'aria-label': p != null ? `${pct}% de chance` : `Riesgo: ${o.riesgo}`
  }, [
    svg('svg', { class: 'hx-anillo-svg', viewBox: `0 0 ${ANILLO.c * 2} ${ANILLO.c * 2}`, 'aria-hidden': 'true' }, giro),
    el('span', { class: 'hx-anillo-centro', 'aria-hidden': 'true' }, p != null ? el('b', { text: `${pct}%` }) : icono(riesgo)),
    chico ? null : el('span', { class: 'hx-anillo-rot', 'aria-hidden': 'true', text: p != null ? 'chance' : o.riesgo })
  ]);
}

// Un ornamento de esquina del marco (SVG): dos filos que doblan y una gema.
function ornamento(esq) {
  return svg('svg', { class: 'hx-orn', 'data-esq': esq, viewBox: '0 0 40 40', 'aria-hidden': 'true' }, [
    svg('path', { class: 'hx-orn-filo', d: 'M2 38 V8 L8 2 H38' }),
    svg('path', { class: 'hx-orn-filo hx-orn-fino', d: 'M7 34 V11 L11 7 H34' }),
    svg('path', { class: 'hx-orn-gema', d: 'M8 2 L12 6 L8 10 L4 6 Z'})
  ]);
}

export function crear(contenedor, decision, { estado, previa = null, mundo, sonido = null, responder, arte = null, limite = null, lateral = null, margen = () => 0 }) {
  const lector = leerDecision(decision, { estado, previa });
  const { forma, esMatriz, disponibles, bloqueadas, lec, variante, previas, pDe } = lector;
  const fx = () => mundo?.fx?.() ?? null;

  // ------------------------------------------------------------------ la ilustración y la cabecera
  const raiz = el('section', { class: 'hx-raiz', 'data-forma': forma, 'data-bisagra': lec.bisagra ? '' : null, 'data-costura': variante });
  const rotuloCat = rotuloDeDecision(decision, estado);
  const rotuloTxt = el('span', { text: esMatriz ? 'El plan del año' : rotuloCat.label });
  const rotulo = el('p', { class: 'hx-rotulo' }, [
    el('i', { class: 'hx-rombo', 'aria-hidden': 'true' }),
    rotuloTxt,
    lec.bisagra ? el('span', { class: 'hx-sello', text: 'Decisión bisagra' }) : null,
    esMatriz ? el('span', { class: 'hx-sello', text: 'el plan corre solo' }) : null
  ]);
  const titulo = el('h1', { class: 'hx-titulo', id: 'decisionTitle', 'data-foco': '', tabindex: '-1', text: decision.titulo });
  const [primera, resto] = partirDescripcion(decision.descripcion);
  const btnMas = resto ? el('button', { type: 'button', class: 'btn-mas hx-btn-mas', 'aria-expanded': 'false', text: 'más' }) : null;
  const planteo = el('p', { class: 'hx-planteo', id: 'decisionDesc' }, [el('span', { text: primera }), resto ? el('span', { class: 'hx-planteo-resto', text: ' ' + resto }) : null, btnMas]);
  btnMas?.addEventListener('click', () => {
    const abrir = !planteo.classList.contains('abierto');
    planteo.classList.toggle('abierto', abrir);
    btnMas.setAttribute('aria-expanded', String(abrir));
    btnMas.textContent = abrir ? 'menos' : 'más';
  });
  const splash = arte ? el('img', { class: 'hx-splash', src: urlSplash(arte), alt: '', decoding: 'async', draggable: 'false' }) : null;
  splash?.addEventListener('error', () => splash.remove());
  const ilus = el('div', { class: 'hx-ilus' }, [
    el('div', { class: 'hx-ilus-arte', 'aria-hidden': 'true' }, [splash, el('i', { class: 'hx-vineta' })]),
    el('header', { class: 'hx-cab' }, [rotulo, titulo, planteo])
  ]);

  // ------------------------------------------------------------------ las opciones
  const filas = [];
  const descId = (i) => `decision-desc-${i}`;
  const descOculta = (o, i) => el('span', { class: 'solo-lectores', id: descId(i) }, [lector.lectores(o)]);
  const tags = (o) => {
    const hay = o.propuesta || (o.rareza && o.rareza !== 'comun');
    return hay ? el('span', { class: 'op-tags hx-tags' }, [
      o.propuesta ? el('span', { class: 'tag tag-perfil', text: 'Tu perfil' }) : null,
      o.rareza && o.rareza !== 'comun' ? el('span', { class: 'tag tag-rara', text: o.rareza }) : null
    ]) : null;
  };
  const opDesc = (o) => (o.descripcion ? el('span', { class: 'op-desc hx-desc', text: o.descripcion }) : null);
  const opPlan = (o) => (o.plan?.texto ? el('span', { class: 'op-plan hx-plan', title: o.plan.texto }, [icono('practica'), el('span', { text: o.plan.titulo ?? o.plan.texto })]) : null);
  const masMovil = (o, i) => {
    const b = el('button', { type: 'button', class: 'hx-mas', 'aria-label': `Más sobre ${o.label}`, text: 'más' });
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      apuntar(i, true, true);
    });
    return b;
  };
  const luz = () => el('span', { class: 'hx-op-luz', 'aria-hidden': 'true' });

  let lista;
  if (!esMatriz) {
    lista = el('div', { class: 'hx-opciones', id: 'decisionOptions', role: 'group', 'aria-label': 'Opciones', 'data-n': String(disponibles.length + bloqueadas.length) });
    disponibles.forEach((o, i) => {
      const p = pDe(o);
      const chips = el('span', { class: 'eje-chips hx-chips' }, [
        ...(o.previa ?? []).map(lector.chipDePrevia),
        p != null ? nodoDeRiesgo(o, lector) : null
      ]);
      const b = el('button', { type: 'button', class: 'opcion hx-op', 'data-atajo': i < 4 ? String(i + 1) : null, 'data-id': o.id, 'aria-describedby': descId(i) }, [
        luz(),
        el('span', { class: 'op-tecla hx-tecla', 'aria-hidden': 'true', text: String(i + 1) }),
        el('span', { class: 'hx-op-cuerpo' }, [el('span', { class: 'op-label hx-label' }, [el('span', { text: o.label }), tags(o)]), opDesc(o), chips, opPlan(o)]),
        anillo(o, p, lector.riesgoDe(o)),
        descOculta(o, i)
      ]);
      filas.push(b);
      lista.append(el('div', { class: 'hx-caja' }, [b, masMovil(o, i)]));
    });
  } else {
    // la planilla: columnas = ejes en orden de aparición; cada celda, barra en el color del eje + número + magnitud
    const { ejes, referente, stats, mejorGanancia } = lector.matriz;
    lista = el('div', { class: 'hx-planilla', id: 'decisionOptions', role: 'group', 'aria-label': 'El plan del año: opciones por eje', style: { '--hx-ejes': String(ejes.length) } });
    lista.append(el('div', { class: 'hx-mx-cab', 'aria-hidden': 'true' }, [
      el('span', { class: 'hx-mx-op', text: 'Plan · por semana' }),
      ...ejes.map((c) => el('span', { class: 'hx-mx-eje', 'data-eje': ejeDe(c), style: estiloEje(ejeDe(c)) }, [
        el('span', { class: 'hx-mx-eje-nom' }, [icono(glifoDeCampo(c)), lector.nombreDeEje(c)]),
        referente[c] != null ? el('b', { class: 'hx-mx-hoy' }, [el('small', { text: 'hoy ' }), typeof referente[c] === 'number' ? num(referente[c]) : String(referente[c])]) : null
      ])),
      el('span', { class: 'hx-mx-eje hx-mx-riesgo-cab' }, el('span', { class: 'hx-mx-eje-nom' }, [icono('incierto'), 'Riesgo · año']))
    ]));
    disponibles.forEach((o, i) => {
      const mejor = mejorGanancia(o);
      const celdas = ejes.map((c) => {
        const pv = (o.previa ?? []).find((x) => x.campo === c);
        if (!pv) return el('span', { class: 'hx-mx-celda vacia' }, el('i', { class: 'hx-mx-nada' }));
        const st = stats[c];
        const ancho = (Math.abs(pv.valor) / st.max) * (st.mixto ? 50 : 100);
        const signo = pv.signo === '-' ? 'baja' : 'sube';
        const eje = ejeDe(c);
        return el('span', { class: `hx-mx-celda ${signo}${c === mejor ? ' hx-mx-mejor' : ''}`, 'data-eje': eje, style: estiloEje(eje), title: pv.texto }, [
          el('span', { class: `hx-mx-barra${st.mixto ? ' mixta' : ''}` }, el('i', { class: signo, style: { width: `${ancho}%` } })),
          el('b', {}, [conSigno(pv.valor), campoCorto(c) === 'ranked' ? el('small', { text: ' LP' }) : null]),
          triangulos(pv.magnitud, pv.signo)
        ]);
      });
      const marcas = [];
      if (o.semanaDeuda != null) marcas.push(el('span', { class: 'hx-mx-marca', title: `deuda de sueño desde la semana ${o.semanaDeuda}` }, [icono('sleep'), `s${o.semanaDeuda}`]));
      if (o.semanaMentalRoja != null) marcas.push(el('span', { class: 'hx-mx-marca', title: `cabeza en rojo desde la semana ${o.semanaMentalRoja}` }, [icono('mentalidad'), `s${o.semanaMentalRoja}`]));
      if (o.semanaRiesgoFisico != null) marcas.push(el('span', { class: 'hx-mx-marca', title: `riesgo físico desde la semana ${o.semanaRiesgoFisico}` }, [icono('alto'), `s${o.semanaRiesgoFisico}`]));
      const casa = Number.isFinite(o.riesgoCasa) ? porcentaje(o.riesgoCasa) : null;
      const riesgo = el('span', { class: 'hx-mx-celda hx-mx-riesgo', 'data-riesgo': RIESGO[o.riesgo] ?? 'incierto' }, [
        anillo(o, null, lector.riesgoDe(o), { chico: true }),
        el('span', { class: 'hx-mx-riesgo-txt' }, [
          el('span', { class: 'hx-mx-riesgo-nom', text: o.riesgo ?? '' }),
          casa != null ? el('span', { class: 'hx-mx-casa', title: 'que en casa te saquen la PC en el año' }, [icono(glifoDeCampo('player.familyTrust')), `${casa}%`]) : null,
          ...marcas
        ])
      ]);
      const b = el('button', { type: 'button', class: 'opcion hx-op hx-mx-fila', 'data-atajo': i < 4 ? String(i + 1) : null, 'data-id': o.id, 'aria-describedby': descId(i) }, [
        luz(),
        el('span', { class: 'hx-mx-op' }, [el('span', { class: 'op-tecla hx-tecla', 'aria-hidden': 'true', text: String(i + 1) }), el('span', { class: 'op-label hx-label', text: o.label }), tags(o)]),
        ...celdas,
        riesgo,
        descOculta(o, i)
      ]);
      filas.push(b);
      lista.append(el('div', { class: 'hx-caja' }, [b, masMovil(o, i)]));
    });
  }
  // Las cerradas se ven con su candado y su motivo, y no se eligen.
  bloqueadas.forEach((bq, k) => {
    const b = el('div', { class: `opcion bloqueada hx-op hx-cerrada${esMatriz ? ' hx-mx-fila' : ''}`, tabindex: '0', 'aria-disabled': 'true', 'data-gate': bq.gate ?? '' }, [
      el('span', { class: 'op-tecla hx-tecla', 'aria-hidden': 'true' }, icono('candado')),
      el('span', { class: 'hx-op-cuerpo' }, [el('span', { class: 'op-label hx-label', text: bq.label }), el('span', { class: 'hx-gate' }, [el('b', { text: 'Cerrada' }), bq.gate ? ` · ${bq.gate}` : ''])]),
      el('span', { class: 'solo-lectores', text: `Cerrada: ${bq.gate ?? ''}` })
    ]);
    b.dataset.cerrada = String(k);
    filas.push(b);
    lista.append(el('div', { class: 'hx-caja' }, b));
  });

  // ------------------------------------------------------------------ el panel de abajo (una sola prosa a la vez)
  const detalle = el('div', { class: 'hx-detalle', 'aria-live': 'polite' });
  let apuntada = 0;
  let elegido = false;
  function pintarDetalle(i, destino = detalle) {
    const f = filas[i];
    if (!f) return;
    destino.textContent = '';
    if (f.classList.contains('bloqueada')) {
      destino.append(el('div', { class: 'hx-det-prosa' }, [el('p', { class: 'hx-det-kicker' }, [icono('candado'), 'Cerrada']), el('p', { class: 'hx-det-texto', text: f.dataset.gate })]));
      return;
    }
    const o = disponibles[i];
    destino.append(
      el('div', { class: 'hx-det-prosa' }, [
        el('p', { class: 'hx-det-kicker' }, [el('span', { class: 'hx-det-n', text: String(i + 1) }), o.label]),
        el('p', { class: 'hx-det-texto', text: o.descripcion ?? '' })
      ]),
      el('ul', { class: 'hx-det-lista' }, [
        ...(o.previa ?? []).map((pv) => el('li', { class: `${pv.signo === '-' ? 'baja' : 'sube'}`, 'data-eje': ejeDe(pv.campo), style: estiloEje(ejeDe(pv.campo)) }, [icono(glifoDeCampo(pv.campo)), pv.texto])),
        o.riesgoTexto ? el('li', { class: 'hx-det-riesgo' }, [icono(RIESGO[o.riesgo] ?? 'incierto'), o.riesgoTexto]) : null,
        previas[o.id]?.texto ? el('li', { class: 'hx-det-p' }, [icono('rendimiento'), previas[o.id].texto]) : null,
        o.propuesta ? el('li', { class: 'hx-det-perfil' }, [icono('hype'), o.propuesta]) : null,
        o.plan?.texto ? el('li', { class: 'hx-det-plan' }, [icono('practica'), o.plan.texto]) : null
      ])
    );
  }
  function apuntar(i, mover = false, usuario = false) {
    apuntada = Math.max(0, Math.min(filas.length - 1, i));
    filas.forEach((f, k) => f.classList.toggle('apuntada', k === apuntada));
    pintarDetalle(apuntada);
    if (mover) filas[apuntada].focus({ preventScroll: true });
    detalle.classList.toggle('expandido', mover);
    if (usuario && !elegido) capa?.apuntar(apuntada);
  }
  filas.forEach((f, i) => {
    f.addEventListener('pointerenter', () => {
      if (celular() || elegido) return;
      if (i !== apuntada) {
        fx()?.pulso?.('apuntar');
        sonido?.hover?.();
      }
      apuntar(i, false, true);
    });
    f.addEventListener('focus', () => {
      if (!elegido) apuntar(i, false, Boolean(capa));
    });
    if (!f.classList.contains('bloqueada')) f.addEventListener('click', () => elegir(i));
  });

  const destello = el('i', { class: 'hx-destello', 'aria-hidden': 'true' });
  const cuerpo = el('div', { class: 'hx-cuerpo' }, [lista, detalle]);
  const marco = el('div', { class: 'hx-marco' }, [
    ilus,
    cuerpo,
    ...['tl', 'tr', 'bl', 'br'].map(ornamento),
    el('i', { class: 'hx-gema-top', 'aria-hidden': 'true' }),
    destello
  ]);
  raiz.append(marco);

  // ------------------------------------------------------------------ la costura (con destino): la de `crearDecision`
  let capa = null;
  if (variante) {
    capa = crearCostura(lec, {
      mundo, arte, sonido, equiposDe: equiposDelMundo(estado), contenedor: raiz, limite, lateral, margen, variante,
      alAceptar: (o) => abrirPanel(o)
    });
    raiz.prepend(capa.nodo, capa.banda);
    if (lec.aviso) raiz.classList.add('dc-espera');
    lista.addEventListener('pointerleave', () => {
      if (!elegido && !lista.contains(document.activeElement)) capa.soltar();
    });
  }

  contenedor.replaceChildren(raiz);
  apuntar(0);
  // El panel de abajo cambia de alto con la opción apuntada: se reserva el de la más alta (medido en un clon fuera del
  // árbol accesible, como `crearDecision`).
  function fijarAltoDelDetalle() {
    if (!raiz.isConnected || elegido) return;
    detalle.style.minHeight = '';
    const ancho = detalle.offsetWidth;
    let alto = 0;
    if (ancho > 0) {
      const medida = detalle.cloneNode(false);
      medida.removeAttribute('aria-live');
      medida.setAttribute('aria-hidden', 'true');
      Object.assign(medida.style, { position: 'absolute', visibility: 'hidden', pointerEvents: 'none', left: '0', top: '0', width: `${ancho}px`, minHeight: '' });
      detalle.parentNode.append(medida);
      filas.forEach((_, i) => {
        pintarDetalle(i, medida);
        alto = Math.max(alto, medida.offsetHeight);
      });
      medida.remove();
    }
    detalle.style.minHeight = `${alto}px`;
  }
  fijarAltoDelDetalle();
  document.fonts?.ready?.then(fijarAltoDelDetalle, () => {});
  window.addEventListener('resize', fijarAltoDelDetalle);
  const vigiaDeTextos = typeof MutationObserver === 'function' ? new MutationObserver(fijarAltoDelDetalle) : null;
  vigiaDeTextos?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-textos'] });

  // ------------------------------------------------------------------ la entrada
  function entradaPanel(d = 0) {
    animar(marco, [{ opacity: 0, transform: 'translateY(22px) scale(.985)', filter: 'brightness(1.6)' }, { opacity: 1, transform: 'none', filter: 'none' }], { delay: T.marco + d, dur: 620 });
    marco.querySelectorAll('.hx-orn').forEach((o, k) => animar(o, [{ opacity: 0, scale: '.4' }, { opacity: 1, scale: '1' }], { delay: T.orn + d + k * T.ornPaso, dur: 520, easing: EXPO }));
    animar(marco.querySelector('.hx-gema-top'), [{ opacity: 0, transform: 'translateX(-50%) rotate(45deg) scale(0)' }, { opacity: 1, transform: 'translateX(-50%) rotate(45deg) scale(1)' }], { delay: T.orn + d + 4 * T.ornPaso, dur: 480 });
    animar(ilus.querySelector('.hx-ilus-arte'), [{ opacity: 0, transform: 'scale(1.06)' }, { opacity: 1, transform: 'none' }], { delay: T.splash + d, dur: 1100 });
    entrar(rotulo, T.rotulo + d, 10);
    lineasConMascara(titulo).forEach((l, i) => animar(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: T.titulo + d + i * T.tituloPaso, dur: DUR.larga }));
    entrar(planteo, T.planteo + d, 10);
    if (esMatriz) entrar(lista.querySelector('.hx-mx-cab'), T.ops - 40 + d, 8);
    filas.forEach((f, i) => {
      const t = T.ops + d + i * T.opPaso;
      animar(f, [{ opacity: 0, transform: 'translateY(14px)', filter: 'brightness(2.2) saturate(.4)' }, { opacity: 1, transform: 'none', filter: 'none' }], { delay: t, dur: 520 });
      const arcoP = f.querySelector('.hx-anillo-arco');
      if (arcoP) animar(arcoP, [{ strokeDasharray: `0 ${arcoP.dataset.circ}` }, { strokeDasharray: `${arcoP.dataset.largo} ${arcoP.dataset.circ}` }], { delay: T.anillo + d + i * T.opPaso, dur: 900 });
      f.querySelectorAll('.hx-seg.lleno').forEach((s, k) => animar(s, [{ opacity: 0 }, { opacity: 1 }], { delay: T.anillo + d + i * T.opPaso + k * 90, dur: 220 }));
      f.querySelectorAll('.hx-anillo-giro').forEach((g) => animar(g, [{ transform: 'rotate(-90deg)' }, { transform: 'none' }], { delay: T.anillo + d + i * T.opPaso, dur: 900 }));
      f.querySelectorAll('.hx-mx-barra i').forEach((b, k) => animar(b, [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: t + 120 + k * 40, dur: 560 }));
      f.querySelectorAll('.eje-chip').forEach((c, k) => animar(c, [{ opacity: 0, transform: 'translateX(-6px)' }, { opacity: 1, transform: 'none' }], { delay: t + 140 + k * 40, dur: 260 }));
    });
    entrar(detalle, T.detalle + d, 8);
  }
  function abrirPanel({ instantaneo = false } = {}) {
    raiz.classList.remove('dc-espera');
    if (quieto() || instantaneo) {
      if (!elegido) titulo.focus({ preventScroll: true });
      return;
    }
    entradaPanel(capa.retardoAceptar);
    esperar(raiz, capa.focoAceptar).then(() => {
      if (!elegido && raiz.isConnected) titulo.focus({ preventScroll: true });
    });
  }
  capa?.entrar();
  if (!lec.aviso && !quieto()) entradaPanel(0);

  // ------------------------------------------------------------------ elegir: el estallido del crafteo
  const az = azarFx(`hextech-${estado?.seed ?? ''}-${decision.id ?? decision.titulo ?? ''}`);
  function estallar(fila) {
    if (quieto()) return;
    const rm = marco.getBoundingClientRect();
    const ref = fila.querySelector('.hx-anillo') ?? fila;
    const rf = ref.getBoundingClientRect();
    const cx = rf.left + rf.width / 2 - rm.left;
    const cy = rf.top + rf.height / 2 - rm.top;
    const capaSvg = svg('svg', { class: 'hx-estallido', viewBox: `0 0 ${rm.width.toFixed(0)} ${rm.height.toFixed(0)}`, 'aria-hidden': 'true' });
    const alcance = rm.width * ARO.alcance;
    const aro = (clase, retardo, k) => {
      const c = svg('circle', { class: clase, cx: cx.toFixed(1), cy: cy.toFixed(1), r: String(ARO.r0) });
      capaSvg.append(c);
      return animar(c, [
        { r: `${ARO.r0}px`, strokeWidth: `${ARO.trazo0}px`, opacity: 1 },
        { r: `${(alcance * k).toFixed(1)}px`, strokeWidth: `${ARO.trazo1}px`, opacity: 0 }
      ], { delay: T.compresion + retardo, dur: T.aro, easing: EXPO, fill: 'both' });
    };
    const anims = [aro('hx-aro', 0, 1), aro('hx-aro hx-aro-azul', 70, 0.7), aro('hx-aro hx-aro-fino', 140, 1.25)];
    for (let k = 0; k < CHISPAS.n; k++) {
      const ang = az.entre(0, 2 * Math.PI);
      const dist = az.entre(CHISPAS.distMin, CHISPAS.distMax);
      const largo = az.entre(CHISPAS.largoMin, CHISPAS.largoMax);
      const dur = az.entre(T.chispaMin, T.chispaMax);
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      const ch = svg('line', { class: `hx-chispa${k % 3 === 0 ? ' azul' : ''}`, x1: cx.toFixed(1), y1: cy.toFixed(1), x2: (cx + dx * largo).toFixed(1), y2: (cy + dy * largo).toFixed(1) });
      capaSvg.append(ch);
      anims.push(animar(ch, [
        { transform: 'translate(0px, 0px)', opacity: 1 },
        { transform: `translate(${(dx * dist).toFixed(1)}px, ${(dy * dist).toFixed(1)}px)`, opacity: 0 }
      ], { delay: T.compresion + az.entre(0, CHISPAS.retardoMax), dur, easing: EXPO, fill: 'both' }));
    }
    marco.append(capaSvg);
    const vivas = anims.filter(Boolean).map((a) => a.finished.catch(() => {}));
    if (!vivas.length) capaSvg.remove();
    else Promise.all(vivas).then(() => capaSvg.remove());
    animar(destello, [{ opacity: 0 }, { opacity: 1, offset: 0.22 }, { opacity: 0 }], { delay: T.compresion, dur: T.destello, easing: 'ease-out' });
  }

  let respuesta = null;
  function elegir(i) {
    if (elegido) return;
    const o = disponibles[i];
    const fila = filas[i];
    if (!o || !fila || fila.classList.contains('bloqueada')) return;
    if (capa?.avisoAbierto) capa.aceptarYa();
    elegido = true;
    raiz.classList.add('eligiendo');
    apuntar(i);
    fila.setAttribute('aria-pressed', 'true');
    animar(fila, [{ transform: 'none' }, { transform: 'scale(.95)', offset: T.compresion / T.rebote }, { transform: 'scale(1.02)', offset: 0.65 }, { transform: 'none' }], { dur: T.rebote, easing: 'ease-out' });
    estallar(fila);
    fx()?.pulso?.('elegir');
    sonido?.clic?.();
    const tono = capa?.elegir(i) ?? null;
    if (tono) mundo?.tenir?.(tono);
    respuesta = { i, o, fila };
    responder({ opcionId: o.id });
  }

  // Las flechas mueven lo apuntado (arriba/abajo y, en la grilla de dos columnas, izquierda/derecha); 1-4, el shell.
  raiz.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || elegido) return;
    const paso = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!paso || (esMatriz && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))) return;
    if (e.target?.closest?.('.hx-planteo')) return;
    e.preventDefault();
    apuntar(apuntada + paso, true, true);
  });

  // ------------------------------------------------------------------ narrar: el marco cuenta lo que pasó
  async function narrar(ctx) {
    if (!respuesta || !raiz.isConnected) return 0;
    const { i, o } = respuesta;
    const inm = ctx.inmediato?.() ?? null;
    const { tarjeta, cambios, contados } = tarjetaDelResultado(o, i + 1, inm, ctx.logs ?? [], { estado, lector });
    tarjeta.classList.add('hx-resultado');
    const narracion = crearNarracion(ctx, [raiz]);
    try {
      // el estallido se deja ver
      await narracion.esperar(T.estallido);
      if (!raiz.isConnected) return contados;
      // la ilustración se pliega hacia arriba (queda una banda con el rótulo y el título)
      const h0 = ilus.getBoundingClientRect().height;
      const salidaLista = animar(lista, [{ opacity: 1 }, { opacity: 0, transform: 'scale(.98)', filter: 'blur(2px)' }], { dur: DUR.sale, easing: SALE, fill: 'forwards' });
      for (const x of [planteo, detalle]) {
        const a = salir(x, 0);
        if (a) a.finished.then(() => x.classList.add('ln-plegado'), () => x.classList.add('ln-plegado'));
        else x.classList.add('ln-plegado');
      }
      if (salidaLista) await narracion.esperar(DUR.sale);
      raiz.classList.add('hx-con-resultado');
      rotuloTxt.textContent = 'Lo que pasó';
      lista.replaceWith(tarjeta);
      const h1 = ilus.getBoundingClientRect().height;
      animar(ilus, [{ height: `${h0}px` }, { height: `${h1}px` }], { dur: T.plegar, easing: EXPO });
      animar(ilus.querySelector('.hx-ilus-arte'), [{ filter: 'brightness(1.8)' }, { filter: 'none' }], { dur: T.plegar });
      if (!animar(tarjeta, [{ opacity: 0, transform: 'translateY(18px) scale(.98)', filter: 'brightness(1.8)' }, { opacity: 1, transform: 'none', filter: 'none' }], { delay: T.plegar / 3, dur: T.tarjeta, easing: EXPO })) {
        // movimiento reducido: un fundido corto, nunca un corte seco
        animar(tarjeta, [{ opacity: 0 }, { opacity: 1 }], { dur: 120, forzar: true, easing: 'linear' });
      }
      animarResultado(tarjeta, { desde: T.plegar / 3 });
      for (const nodo of ctx.rodarPlaca?.(cambios, T_RESULTADO.numeros + 100) ?? []) narracion.incluir(nodo);
      narracion.esperar(T_RESULTADO.pulso).then(() => fx()?.pulso?.(pulsoDelResultado(cambios)));
      tarjeta.focus({ preventScroll: true });
      await narracion.vistazo();
      await narracion.esperar(T_RESULTADO.sostener);
    } finally {
      narracion.fin();
    }
    return contados;
  }

  return {
    nodo: raiz,
    titulo,
    variante,
    narrar,
    destruir() {
      window.removeEventListener('resize', fijarAltoDelDetalle);
      vigiaDeTextos?.disconnect();
      capa?.destruir();
    }
  };
}
