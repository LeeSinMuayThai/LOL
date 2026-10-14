// La decisión en la variante `draft` de la previa (`?dc=draft`, PLANUI §0.4): el champ select de tu vida. El contrato es
// el de `crearDecision` (`components/decision.js`, la referencia de comportamiento: la costura, el teclado, el panel de
// la apuntada, elegir y `narrar`); lo que se lee de la decisión y la tarjeta de "lo que pasó" son de `decision/comun.js`.
//
// La pantalla habla el idioma del champ select del inicio (`inicio.css` `.in-cs-*`, `fx.css` `.ln-bloquear`):
//   - la cabecera es la fase del draft: el rótulo mono, el título grande centrado y una barra fina que se llena UNA vez
//     al entrar (decorativa: no hay tiempo límite);
//   - cada opción es una franja de pick (como las cinco del equipo): el arte de un campeón de tu pool en un recorte
//     biselado, gris hasta que se apunta; el número, el label en display y, a la derecha, los ejes, el riesgo y la p (en
//     el plan del año, las barras por eje en fila, bajo la cabecera de ejes con su valor de hoy);
//   - apuntar: el arte entra desde la izquierda y se colorea, el filo toma el color del eje de la opción, aparece
//     "APUNTADO", el BLOQUEAR asoma bajo la franja y la prosa va al panel lateral (el de las runas / la skin);
//   - elegir (un solo gesto: el número, un clic en la franja o Enter) es el lock-in: el BLOQUEAR destella, la franja hace
//     el barrido de luz y lleva el sello; las otras se apagan, se pliegan, y la franja se vuelve "lo que pasó".
//
// Nada del texto del motor se pierde (§7.5): la descripción, los efectos, el riesgo, la p, la propuesta del perfil y el
// plan (`o.plan.texto`, tal cual) van al panel; los lectores reciben `lector.lectores(o)`; con
// `html[data-textos="completos"]` la prosa va también a cada franja.
import { el, animar, quieto, celular, EXPO, RESORTE, DUR } from '../../fx/util.js';
import { entrar, salir, esperar, lineasConMascara, num } from '../../fx/movimiento.js';
import { icono, glifoDeCampo, triangulos, ABREVIATURA } from '../../fx/iconos.js';
import { urlTile, urlCentrada, cargarImagen } from '../../fx/arte.js';
import { claveDe } from '../../core/mundo.js';
import { rotuloDeDecision } from '../../formatoUi.js';
import { crearCostura, equiposDelMundo } from '../costura.js';
import { crearNarracion } from '../../narracion.js';
import { ejeDe } from '../../core/ejes.js';
import { leerDecision, partirDescripcion, estiloEje, campoCorto, conSigno, porcentaje, RIESGO, T_RESULTADO, tarjetaDelResultado, animarResultado, pulsoDelResultado, riesgoNodo as nodoDeRiesgo } from './comun.js';

// Los tiempos (ms). La entrada: la del panel de siempre (sin el pre-roll de la vitrina), con la barra de la fase.
const T = {
  rotulo: 140,
  titulo: 180,
  tituloPaso: 70,
  barra: 260,
  barraDur: 1200, // la barra de la fase se llena una vez (decorativa: no es un reloj)
  planteo: 340,
  franjas: 380,
  franjaPaso: 70,
  franjaDur: 460,
  arte: 120, // el arte de cada franja entra un poco después que su franja
  datos: 200,
  datoPaso: 30,
  panel: 620,
  // el lock-in: el destello del BLOQUEAR, el barrido, el sello; y cuánto se lee antes de volverse "lo que pasó"
  onda: 560,
  barrido: 640,
  sello: 120,
  selloDur: 360,
  lectura: 620,
  pliegue: 380,
  plieguePaso: 50
};

// Una sola prosa a la vez: el arte del panel es el centrado del campeón de la franja.
function arteNodo(clave, url, clase) {
  const img = el('img', { class: `${clase}-img`, alt: '', decoding: 'async', crossorigin: 'anonymous', draggable: 'false' });
  const caja = el('span', { class: clase, 'aria-hidden': 'true', 'data-cargando': '' }, [img, el('i', { class: `${clase}-velo` })]);
  if (!clave) {
    caja.dataset.vacio = '';
    return caja;
  }
  cargarImagen(url(clave)).then((ok) => {
    if (!ok) {
      caja.dataset.vacio = '';
      return;
    }
    img.src = ok.src;
    delete caja.dataset.cargando;
  });
  return caja;
}

export function crear(contenedor, decision, { estado, previa = null, mundo, sonido = null, responder, arte = null, limite = null, lateral = null, margen = () => 0 }) {
  const lector = leerDecision(decision, { estado, previa });
  const { forma, esMatriz, disponibles, bloqueadas, lec, variante, previas, chipDePrevia, pDe } = lector;
  const fx = () => mundo?.fx?.() ?? null;

  // Los campeones del pool (de más a menos maestría): uno por franja, en orden; sin pool, tu main.
  const pool = [...(estado?.player?.championPool ?? [])]
    .sort((a, b) => (b.mastery ?? 0) - (a.mastery ?? 0))
    .map((c) => claveDe(c.name))
    .filter(Boolean);
  if (!pool.length && arte) pool.push(arte);
  const claveDeFranja = (i) => (pool.length ? pool[i % pool.length] : null);
  // El eje de una opción (el color de su filo): en la planilla, donde más gana; si no, el primero que sube.
  const ejeDeOpcion = (o) => {
    if (esMatriz) {
      const c = lector.matriz.mejorGanancia(o);
      if (c) return ejeDe(c);
    }
    const p = (o.previa ?? []).find((x) => x.signo !== '-') ?? (o.previa ?? [])[0];
    return p ? ejeDe(p.campo) : null;
  };

  // ------------------------------------------------------------------ la cabecera: la fase del draft
  const raiz = el('section', { class: 'parada dr-raiz', 'data-forma': forma, 'data-bisagra': lec.bisagra ? '' : null, 'data-costura': variante });
  const col = el('div', { class: 'parada-col dr-col' });
  const rotuloCat = rotuloDeDecision(decision, estado);
  const rotuloTexto = el('span', { class: 'dr-fase-txt', text: esMatriz ? 'El plan del año' : rotuloCat.label || 'Tu decisión' });
  const rotulo = el('p', { class: 'dr-fase' }, [
    el('i', { class: 'dr-fase-punto', 'aria-hidden': 'true' }),
    rotuloTexto,
    lec.bisagra ? el('span', { class: 'dr-fase-tag', text: 'Decisión bisagra' }) : null,
    esMatriz ? el('span', { class: 'dr-fase-tag', text: 'el plan corre solo' }) : null
  ]);
  const titulo = el('h1', { class: 'dr-titulo', id: 'decisionTitle', 'data-foco': '', tabindex: '-1', text: decision.titulo });
  const barra = el('div', { class: 'dr-barra', 'aria-hidden': 'true' }, [el('i', { class: 'dr-barra-llena' })]);
  const [primera, resto] = partirDescripcion(decision.descripcion);
  const btnMas = resto ? el('button', { type: 'button', class: 'dr-mas-planteo', 'aria-expanded': 'false', text: 'más' }) : null;
  const planteo = el('p', { class: 'dr-planteo', id: 'decisionDesc' }, [el('span', { class: 'dr-planteo-1', text: primera }), resto ? el('span', { class: 'dr-planteo-resto', text: ' ' + resto }) : null, btnMas]);
  btnMas?.addEventListener('click', () => {
    const abrir = !planteo.classList.contains('abierto');
    planteo.classList.toggle('abierto', abrir);
    btnMas.setAttribute('aria-expanded', String(abrir));
    btnMas.textContent = abrir ? 'menos' : 'más';
  });

  // ------------------------------------------------------------------ las franjas de pick
  const filas = [];
  const cajas = [];
  const descId = (i) => `decision-desc-${i}`;
  const descOculta = (o, i) => el('span', { class: 'solo-lectores', id: descId(i) }, [lector.lectores(o)]);
  const medidorP = (p) => el('span', { class: 'dr-p', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(porcentaje(p)), title: 'chance de ganar' }, [el('i', {}, el('i', { style: { width: `${p * 100}%` } })), el('b', { text: `${porcentaje(p)}%` })]);
  const tags = (o) => {
    const hay = o.propuesta || (o.rareza && o.rareza !== 'comun');
    return hay ? el('span', { class: 'dr-tags' }, [
      o.propuesta ? el('span', { class: 'dr-tag dr-tag-perfil', text: 'Tu perfil' }) : null,
      o.rareza && o.rareza !== 'comun' ? el('span', { class: 'dr-tag dr-tag-rara', text: o.rareza }) : null
    ]) : null;
  };
  const numero = (n) => el('span', { class: 'dr-n', 'aria-hidden': 'true' }, [el('small', { text: 'Pick' }), el('b', { text: String(n) })]);
  // lo que la franja lleva a la vista con "Textos: completos"
  const opDesc = (o) => (o.descripcion ? el('span', { class: 'dr-desc', text: o.descripcion }) : null);
  const opPlan = (o) => (o.plan?.texto ? el('span', { class: 'dr-plan', title: o.plan.texto }, [icono('practica'), el('span', { text: o.plan.titulo ?? o.plan.texto })]) : null);
  // el BLOQUEAR del kit (su mismo lenguaje: `ln-bloquear`), colgando bajo la franja apuntada; el gesto es de la franja
  const pastilla = (i) => {
    const p = el('span', { class: 'ln-bloquear encendido dr-bloquear', 'aria-hidden': 'true' }, [el('span', { class: 'ln-bq-txt', text: 'Bloquear' }), el('i', { class: 'ln-bq-onda' })]);
    p.addEventListener('click', () => elegir(i));
    return p;
  };
  const masMovil = (o, i) => {
    const b = el('button', { type: 'button', class: 'dr-mas', 'aria-label': `Más sobre ${o.label}`, text: 'más' });
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      apuntar(i, true, true);
      panel.scrollIntoView?.({ block: 'nearest' });
    });
    return b;
  };
  const adornos = () => [el('i', { class: 'dr-filo', 'aria-hidden': 'true' }), el('i', { class: 'dr-barrido', 'aria-hidden': 'true' }), el('span', { class: 'dr-sello', 'aria-hidden': 'true', text: 'Bloqueado' })];
  const centro = (o) => el('span', { class: 'dr-centro' }, [
    el('span', { class: 'dr-apuntado', 'aria-hidden': 'true', text: 'Apuntado' }),
    el('span', { class: 'dr-label' }, [el('span', { class: 'dr-label-txt', text: o.label }), tags(o)]),
    opDesc(o),
    opPlan(o)
  ]);

  const lista = el('div', { class: `dr-franjas${esMatriz ? ' dr-matriz' : ''}`, id: 'decisionOptions', role: 'group', 'aria-label': esMatriz ? 'El plan del año: opciones por eje' : 'Opciones' });
  if (!esMatriz) {
    disponibles.forEach((o, i) => {
      const datos = el('span', { class: 'dr-datos' }, [
        ...(o.previa ?? []).map((p) => el('span', { class: `dr-eje ${p.signo === '-' ? 'baja' : 'sube'}`, 'data-eje': ejeDe(p.campo), style: estiloEje(ejeDe(p.campo)), title: p.texto }, [icono(glifoDeCampo(p.campo)), el('span', { class: 'dr-eje-nom', text: ABREVIATURA[glifoDeCampo(p.campo)] ?? p.etiqueta }), triangulos(p.magnitud, p.signo)])),
        nodoDeRiesgo(o, lector),
        pDe(o) != null ? medidorP(pDe(o)) : null
      ]);
      const b = el('button', { type: 'button', class: 'opcion dr-franja', 'data-atajo': i < 4 ? String(i + 1) : null, 'data-id': o.id, 'aria-describedby': descId(i), style: estiloEje(ejeDeOpcion(o)) }, [
        arteNodo(claveDeFranja(i), urlTile, 'dr-arte'), numero(i + 1), centro(o), datos, ...adornos(), descOculta(o, i)
      ]);
      filas.push(b);
      const caja = el('div', { class: 'dr-caja' }, [b, pastilla(i), masMovil(o, i)]);
      cajas.push(caja);
      lista.append(caja);
    });
  } else {
    // la planilla: la cabecera de ejes (el glifo, el nombre y el valor de hoy) y, en cada franja, las barras en fila
    const { ejes, referente, stats, mejorGanancia } = lector.matriz;
    lista.style.setProperty('--ejes', String(ejes.length));
    lista.append(el('div', { class: 'dr-mx-cab', 'aria-hidden': 'true' }, [
      el('span', { class: 'dr-mx-cab-op', text: 'Plan · por semana' }),
      ...ejes.map((c) => el('span', { class: 'dr-mx-eje', 'data-eje': ejeDe(c), style: estiloEje(ejeDe(c)) }, [
        icono(glifoDeCampo(c)),
        el('span', { class: 'dr-mx-eje-nom', text: lector.nombreDeEje(c) }),
        referente[c] != null ? el('b', { class: 'dr-mx-ref', text: typeof referente[c] === 'number' ? num(referente[c]) : String(referente[c]) }) : null
      ])),
      el('span', { class: 'dr-mx-eje dr-mx-riesgo-cab' }, [icono('incierto'), el('span', { class: 'dr-mx-eje-nom', text: 'Riesgo · año' })])
    ]));
    disponibles.forEach((o, i) => {
      const mejor = mejorGanancia(o);
      const celdas = ejes.map((c) => {
        const p = (o.previa ?? []).find((x) => x.campo === c);
        if (!p) return el('span', { class: 'dr-mx-celda vacia' }, el('i', { class: 'dr-mx-nada' }));
        const st = stats[c];
        const ancho = (Math.abs(p.valor) / st.max) * (st.mixto ? 50 : 100);
        const eje = ejeDe(c);
        return el('span', { class: `dr-mx-celda ${p.signo === '-' ? 'baja' : 'sube'}${c === mejor ? ' dr-mx-mejor' : ''}`, 'data-eje': eje, style: estiloEje(eje), title: p.texto }, [
          el('span', { class: 'dr-mx-glifo' }, icono(glifoDeCampo(c))),
          el('span', { class: 'dr-mx-barra' + (st.mixto ? ' mixta' : '') }, el('i', { class: p.signo === '-' ? 'baja' : 'sube', style: { width: `${ancho}%` } })),
          el('b', {}, [conSigno(p.valor), campoCorto(c) === 'ranked' ? el('span', { class: 'dr-mx-u', text: ' LP' }) : null]),
          triangulos(p.magnitud, p.signo)
        ]);
      });
      const marcas = [];
      if (o.semanaDeuda != null) marcas.push(el('span', { class: 'dr-mx-marca', title: `deuda de sueño desde la semana ${o.semanaDeuda}` }, [icono('sleep'), `s${o.semanaDeuda}`]));
      if (o.semanaMentalRoja != null) marcas.push(el('span', { class: 'dr-mx-marca', title: `cabeza en rojo desde la semana ${o.semanaMentalRoja}` }, [icono('mentalidad'), `s${o.semanaMentalRoja}`]));
      if (o.semanaRiesgoFisico != null) marcas.push(el('span', { class: 'dr-mx-marca', title: `riesgo físico desde la semana ${o.semanaRiesgoFisico}` }, [icono('alto'), `s${o.semanaRiesgoFisico}`]));
      const casa = Number.isFinite(o.riesgoCasa) ? porcentaje(o.riesgoCasa) : null;
      const riesgo = el('span', { class: 'dr-mx-celda dr-mx-riesgo', 'data-riesgo': RIESGO[o.riesgo] ?? 'incierto' }, [
        casa != null ? el('span', { class: 'dr-mx-casa', title: 'que en casa te saquen la PC en el año' }, [el('span', { class: 'dr-mx-barra' }, el('i', { class: 'riesgo', style: { width: `${casa}%` } })), el('b', { text: `${casa}%` })]) : null,
        ...marcas
      ]);
      const b = el('button', { type: 'button', class: 'opcion dr-franja', 'data-atajo': i < 4 ? String(i + 1) : null, 'data-id': o.id, 'aria-describedby': descId(i), style: estiloEje(ejeDeOpcion(o)) }, [
        arteNodo(claveDeFranja(i), urlTile, 'dr-arte'), numero(i + 1), centro(o), el('span', { class: 'dr-datos dr-mx-datos' }, [...celdas, riesgo]), ...adornos(), descOculta(o, i)
      ]);
      filas.push(b);
      const caja = el('div', { class: 'dr-caja' }, [b, pastilla(i), masMovil(o, i)]);
      cajas.push(caja);
      lista.append(caja);
    });
  }
  // Las cerradas: la franja vacía del pick que no se puede tomar, con su candado y su motivo.
  bloqueadas.forEach((bq, k) => {
    const b = el('div', { class: 'opcion bloqueada dr-franja', tabindex: '0', 'aria-disabled': 'true', 'data-gate': bq.gate ?? '' }, [
      el('span', { class: 'dr-arte', 'aria-hidden': 'true', 'data-vacio': '' }, el('span', { class: 'dr-candado' }, icono('candado'))),
      el('span', { class: 'dr-n', 'aria-hidden': 'true' }, [el('small', { text: 'Pick' }), el('b', { text: '—' })]),
      el('span', { class: 'dr-centro' }, [el('span', { class: 'dr-label' }, [el('span', { class: 'dr-label-txt', text: bq.label })]), el('span', { class: 'dr-gate', text: bq.gate ? `Cerrada · ${bq.gate}` : 'Cerrada' })]),
      el('i', { class: 'dr-filo', 'aria-hidden': 'true' }),
      el('span', { class: 'solo-lectores', text: `Cerrada: ${bq.gate ?? ''}` })
    ]);
    b.dataset.cerrada = String(k);
    filas.push(b);
    const caja = el('div', { class: 'dr-caja' }, b);
    cajas.push(caja);
    lista.append(caja);
  });

  // ------------------------------------------------------------------ el panel lateral (una sola prosa a la vez)
  const panel = el('aside', { class: 'dr-panel', 'aria-live': 'polite' });
  let apuntada = 0;
  let elegido = false;
  function pintarPanel(i, destino = panel) {
    const f = filas[i];
    if (!f) return;
    destino.textContent = '';
    if (f.classList.contains('bloqueada')) {
      destino.append(
        el('p', { class: 'dr-panel-k' }, [icono('candado'), 'Cerrada']),
        el('p', { class: 'dr-panel-nombre', text: f.querySelector('.dr-label-txt')?.textContent ?? '' }),
        el('p', { class: 'dr-panel-texto', text: f.dataset.gate })
      );
      return;
    }
    const o = disponibles[i];
    destino.append(
      destino === panel ? arteNodo(claveDeFranja(i), urlCentrada, 'dr-panel-arte') : el('span', { class: 'dr-panel-arte' }),
      el('p', { class: 'dr-panel-k' }, [el('span', { class: 'dr-panel-n', text: `Pick ${i + 1}` }), o.propuesta ? el('span', { class: 'dr-tag dr-tag-perfil', text: 'Tu perfil' }) : null]),
      el('p', { class: 'dr-panel-nombre', text: o.label }),
      el('p', { class: 'dr-panel-texto', text: o.descripcion ?? '' }),
      (o.previa ?? []).length ? el('div', { class: 'eje-chips dr-panel-ejes' }, o.previa.map(chipDePrevia)) : null,
      // lo que la opción fija (el plan) y lo que te propone tu perfil, arriba; después la p, el riesgo y los efectos
      el('ul', { class: 'dr-panel-lista' }, [
        o.plan?.texto ? el('li', { class: 'dr-panel-plan' }, [icono('practica'), o.plan.texto]) : null,
        o.propuesta ? el('li', { class: 'dr-panel-perfil' }, [icono('hype'), o.propuesta]) : null,
        previas[o.id]?.texto ? el('li', { class: 'dr-panel-p' }, [icono('rendimiento'), previas[o.id].texto]) : null,
        o.riesgoTexto ? el('li', { class: 'dr-panel-riesgo' }, [icono(RIESGO[o.riesgo] ?? 'incierto'), o.riesgoTexto]) : null,
        ...(o.previa ?? []).map((p) => el('li', { class: `dr-panel-efecto ${p.signo === '-' ? 'baja' : 'sube'}` }, [icono(glifoDeCampo(p.campo)), p.texto]))
      ])
    );
  }
  function apuntar(i, mover = false, usuario = false) {
    const antes = apuntada;
    apuntada = Math.max(0, Math.min(filas.length - 1, i));
    filas.forEach((f, k) => f.classList.toggle('apuntada', k === apuntada));
    cajas.forEach((c, k) => c.classList.toggle('dr-apuntada', k === apuntada));
    if (antes !== apuntada || !panel.childElementCount) {
      pintarPanel(apuntada);
      if (antes !== apuntada) animar(panel, [{ opacity: 0.4, transform: 'translateX(10px)' }, { opacity: 1, transform: 'none' }], { dur: DUR.entra });
    }
    if (mover) filas[apuntada].focus({ preventScroll: true });
    panel.classList.toggle('expandido', mover);
    // la franja i es el camino i de la costura (las disponibles primero, las cerradas al final: el mismo orden)
    if (usuario && !elegido) capa?.apuntar(apuntada);
  }
  filas.forEach((f, i) => {
    f.addEventListener('pointerenter', () => {
      if (celular() || elegido) return;
      if (i !== apuntada) fx()?.pulso?.('apuntar');
      apuntar(i, false, true);
    });
    f.addEventListener('focus', () => {
      if (!elegido) apuntar(i, false, Boolean(capa));
    });
    if (!f.classList.contains('bloqueada')) f.addEventListener('click', () => elegir(i));
  });

  const cab = el('header', { class: 'dr-cab' }, [rotulo, titulo, barra, planteo]);
  const cuerpo = el('div', { class: 'dr-cuerpo' }, [lista, panel]);
  col.append(cab, cuerpo);
  raiz.append(col);

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
  // El panel cambia de alto con la apuntada; con la parada apoyada abajo eso correría las franjas debajo del puntero.
  // Se reserva el alto de la opción más alta, medido en un clon fuera del árbol accesible (el vivo es `aria-live`).
  function fijarAltoDelPanel() {
    if (!raiz.isConnected || elegido) return;
    panel.style.minHeight = '';
    // al costado (`contain: size`, decision-draft.css) el panel ya no empuja: no hay nada que reservar
    if (getComputedStyle(panel).contain.includes('size')) return;
    const ancho = panel.offsetWidth;
    let alto = 0;
    if (ancho > 0) {
      const medida = panel.cloneNode(false);
      medida.removeAttribute('aria-live');
      medida.setAttribute('aria-hidden', 'true');
      Object.assign(medida.style, { position: 'absolute', visibility: 'hidden', pointerEvents: 'none', left: '0', top: '0', width: `${ancho}px`, minHeight: '' });
      panel.parentNode.append(medida);
      filas.forEach((_, i) => {
        pintarPanel(i, medida);
        alto = Math.max(alto, medida.offsetHeight);
      });
      medida.remove();
    }
    panel.style.minHeight = `${alto}px`;
  }
  fijarAltoDelPanel();
  document.fonts?.ready?.then(fijarAltoDelPanel, () => {});
  window.addEventListener('resize', fijarAltoDelPanel);
  const vigiaDeTextos = typeof MutationObserver === 'function' ? new MutationObserver(fijarAltoDelPanel) : null;
  vigiaDeTextos?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-textos'] });

  // ------------------------------------------------------------------ la entrada: la fase del draft arranca
  function entradaPanel(d = 0) {
    entrar(rotulo, T.rotulo + d, 8);
    lineasConMascara(titulo).forEach((l, i) => animar(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: T.titulo + d + i * T.tituloPaso, dur: DUR.larga }));
    animar(barra.querySelector('.dr-barra-llena'), [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: T.barra + d, dur: T.barraDur, easing: 'cubic-bezier(0.3, 0.1, 0.2, 1)' });
    entrar(planteo, T.planteo + d, 8);
    const cab = lista.querySelector('.dr-mx-cab');
    if (cab) entrar(cab, T.franjas - 40 + d, 6);
    cajas.forEach((c, i) => {
      const t = T.franjas + d + i * T.franjaPaso;
      animar(c, [{ opacity: 0, transform: 'translateX(-28px)', clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' }], { delay: t, dur: T.franjaDur });
      animar(c.querySelector('.dr-arte-img'), [{ opacity: 0, transform: 'translateX(-30%) scale(1.2)' }, { opacity: 1, transform: 'none' }], { delay: t + T.arte, dur: T.franjaDur });
      c.querySelectorAll('.dr-eje, .riesgo, .dr-p, .dr-mx-celda').forEach((g, k) => animar(g, [{ opacity: 0, transform: 'translateX(-8px)' }, { opacity: 1, transform: 'none' }], { delay: t + T.datos + k * T.datoPaso, dur: DUR.entra }));
      c.querySelectorAll('.dr-mx-barra i').forEach((b, k) => animar(b, [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: t + T.datos + k * T.datoPaso, dur: T.franjaDur }));
    });
    animar(panel, [{ opacity: 0, transform: 'translateX(24px)' }, { opacity: 1, transform: 'none' }], { delay: T.panel + d, dur: T.franjaDur });
  }
  // aceptar el aviso: la costura se abre y la fase entra con su orden; el foco pasa al título
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
  if (!lec.aviso && !quieto()) entradaPanel();

  // ------------------------------------------------------------------ elegir: el lock-in
  let respuesta = null;
  function elegir(i) {
    if (elegido) return;
    const o = disponibles[i];
    const fila = filas[i];
    if (!o || !fila || fila.classList.contains('bloqueada')) return;
    if (capa?.avisoAbierto) capa.aceptarYa();
    elegido = true;
    apuntar(i);
    raiz.classList.add('eligiendo', 'dr-lock');
    fila.classList.add('dr-elegida');
    cajas[i].classList.add('dr-elegida');
    fila.setAttribute('aria-pressed', 'true');
    const pill = cajas[i].querySelector('.dr-bloquear');
    if (pill) {
      pill.classList.remove('encendido');
      pill.dataset.estado = 'bloqueado';
      animar(pill.querySelector('.ln-bq-onda'), [{ opacity: 0.95, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.7, 2.6)' }], { dur: T.onda, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' });
      animar(pill, [{ transform: 'translateX(-50%) scale(0.92)' }, { transform: 'translateX(-50%)' }], { dur: DUR.entra, easing: RESORTE });
    }
    animar(fila.querySelector('.dr-barrido'), [{ opacity: 1, transform: 'translateX(-100%) skewX(-18deg)' }, { opacity: 1, transform: 'translateX(260%) skewX(-18deg)' }], { dur: T.barrido, easing: EXPO });
    animar(fila.querySelector('.dr-sello'), [{ opacity: 0, transform: 'translateY(-50%) scale(1.8) rotate(-10deg)' }, { opacity: 1, transform: 'translateY(-50%) rotate(-4deg)' }], { delay: T.sello, dur: T.selloDur, easing: RESORTE });
    animar(fila, [{ transform: 'scale(1.015)' }, { transform: 'none' }], { dur: T.selloDur, easing: RESORTE });
    fx()?.pulso?.('elegir');
    if (sonido?.golpe) sonido.golpe();
    else sonido?.clic?.();
    const tono = capa?.elegir(i) ?? null;
    if (tono) mundo?.tenir?.(tono);
    respuesta = { i, o, fila };
    responder({ opcionId: o.id });
  }

  raiz.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || elegido) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      apuntar(apuntada + (e.key === 'ArrowDown' ? 1 : -1), true, true);
    }
  });

  // ------------------------------------------------------------------ narrar: la franja bloqueada se vuelve lo que pasó
  async function narrar(ctx) {
    if (!respuesta || !raiz.isConnected) return 0;
    const { i, o, fila } = respuesta;
    const inm = ctx.inmediato?.() ?? null;
    const { tarjeta, cambios, contados } = tarjetaDelResultado(o, i + 1, inm, ctx.logs ?? [], { estado, lector });
    tarjeta.classList.add('dr-resultado');
    Object.assign(tarjeta.style, estiloEje(ejeDeOpcion(o)) ?? {});
    tarjeta.prepend(arteNodo(claveDeFranja(i), urlCentrada, 'dr-res-arte'));
    tarjeta.querySelector('.res-tag')?.replaceChildren('Bloqueado');
    const narracion = crearNarracion(ctx, [raiz]);
    try {
      // el lock-in se lee (el destello, el barrido y el sello) antes de que la franja se abra
      await narracion.esperar(T.lectura);
      if (!raiz.isConnected) return contados;
      const r0 = fila.getBoundingClientRect();
      const c0 = lista.getBoundingClientRect();
      // las otras franjas se apagan y se pliegan en su lugar (un fantasma); el planteo y el panel se van
      const fantasma = lista.cloneNode(true);
      fantasma.classList.add('ln-fantasma', 'dr-fantasma');
      fantasma.setAttribute('aria-hidden', 'true');
      fantasma.removeAttribute('id');
      fantasma.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
      const fCajas = [...fantasma.querySelectorAll(':scope > .dr-caja')];
      fCajas[i]?.classList.add('dr-oculta');
      Object.assign(fantasma.style, { position: 'absolute', left: `${lista.offsetLeft}px`, top: `${lista.offsetTop}px`, width: `${c0.width}px`, margin: '0' });
      lista.replaceWith(tarjeta);
      cuerpo.classList.add('dr-con-resultado');
      col.append(fantasma);
      const r1 = tarjeta.getBoundingClientRect();
      const salidas = [fantasma.querySelector('.dr-mx-cab'), ...fCajas.filter((_, k) => k !== i)].filter(Boolean).map((c, k) =>
        animar(c, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-40px) scaleY(0.4)', filter: 'grayscale(1)' }], { delay: k * T.plieguePaso, dur: T.pliegue, easing: EXPO, fill: 'forwards' })
      ).filter(Boolean);
      if (salidas.length) Promise.all(salidas.map((a) => a.finished)).then(() => fantasma.remove(), () => fantasma.remove());
      else fantasma.remove();
      for (const x of [planteo, panel, barra]) {
        const a = salir(x, 0);
        if (a) a.finished.then(() => x.classList.add('ln-plegado'), () => x.classList.add('ln-plegado'));
        else x.classList.add('ln-plegado');
      }
      rotuloTexto.textContent = 'Lo que pasó';
      animar(tarjeta, [
        { transform: `translateY(${r0.top - r1.top}px)`, clipPath: `inset(0 0 calc(100% - ${r0.height}px) 0)` },
        { transform: 'none', clipPath: 'inset(0 0 0 0)' }
      ], { dur: DUR.larga, easing: EXPO });
      animar(tarjeta.querySelector('.dr-res-arte-img'), [{ opacity: 0, transform: 'translateX(-12%) scale(1.15)' }, { opacity: 1, transform: 'none' }], { dur: T_RESULTADO.odometro, easing: EXPO });
      animarResultado(tarjeta);
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
      window.removeEventListener('resize', fijarAltoDelPanel);
      vigiaDeTextos?.disconnect();
      capa?.destruir();
    }
  };
}
