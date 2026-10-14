// La decisión (PLANUI U2a punto 3; portado de `crearDecision` de vitrina/fusion/js/decision.js con `op=linea`). La
// parada es UN panel: la cabecera (el rótulo, el título ancho y el planteo en una línea, con su "más") y abajo las
// opciones por glifos (cada eje con su magnitud por cantidad de triángulos, el riesgo como ícono + nombre, la p con su
// medidor) con el inspector al costado: una sola prosa a la vez, la de la opción apuntada. El plan del año del amateur
// es la planilla (opciones × ejes) con el inspector abajo. Con destino (`ui/core/bisagra.js`), el mundo es la costura de
// la bisagra (`components/costura.js`).
//
// Elegir: la fila se marca, la luz pulsa y se responde al motor. Lo que pasó lo cuenta la misma fila (`narrar`, PLANUI
// §0.2 punto 4): la opción se vuelve la tarjeta de SU resultado inmediato (el primer paso del motor, `ui/core/inmediato.js`)
// con los números rodando en la tarjeta y en la placa "Vos". Lo que viene después (el resto del split) lo cuenta el
// relato: la tarjeta no lo adelanta (regla 4 de §V.3).
//
// Nada del texto del motor se pierde (§7.5): la descripción de cada opción, sus efectos, el riesgo, la propuesta de tu
// perfil y el plan que fija (`opcion.plan.texto`, tal cual lo arma el motor) están en el inspector y, para los lectores,
// en la descripción de cada botón; con `html[data-textos="completos"]` van a la vista en cada fila.
//
// Los ejes (PLANUI §0.3, puntos 1 y 2; `ui/core/ejes.js`): cada cosa que se mueve (SoloQ, Estudios, Sueño, Casa,
// Cabeza…) lleva el color de su eje en `--eje` / `--eje-f` (inline, con `tokenDeEje`), el mismo en la planilla, en la
// tarjeta de "lo que pasó", en los chips y en la placa "Vos". El color dice QUÉ se movió; el signo lo dicen los
// triángulos y el número (--up / --down).
import { el, animar, quieto, celular, EXPO, DUR } from '../fx/util.js';
import { entrar, salir, esperar, lineasConMascara, num } from '../fx/movimiento.js';
import { icono, glifoDeCampo, triangulos, ABREVIATURA } from '../fx/iconos.js';
import { rotuloDeDecision } from '../formatoUi.js';
import { porcentaje } from '../../core/previaDePartido.js';
import { crearCostura, equiposDelMundo } from './costura.js';
import { crearNarracion } from '../narracion.js';
import { ejeDe } from '../core/ejes.js';
import { leerDecision, partirDescripcion, estiloEje, campoCorto, conSigno, RIESGO, T_RESULTADO, tarjetaDelResultado, animarResultado, pulsoDelResultado, riesgoNodo as nodoDeRiesgo } from './decision/comun.js';

// La lectura de la decisión y la tarjeta de "lo que pasó" viven en `decision/comun.js` (las comparten las variantes de
// la previa, PLANUI §0.4). Estas dos se siguen exportando desde acá (las usa `transmisionComun.js`).
export { partirDescripcion, formaDeDecision } from './decision/comun.js';

// Los tiempos de la entrada del panel (ms; los de la vitrina). Los de "lo que pasó" son `T_RESULTADO` (`decision/comun.js`).
const T = {
  titulo: 780, // el título entra por línea
  tituloPaso: 70,
  col: 640,
  rotulo: 740,
  planteo: 900,
  filas: 950,
  filaPaso: 50,
  inspector: 1120,
  // sin el pre-roll del relato, el panel entra 600 ms antes que en la vitrina
  sinPreroll: -600
};

// `contenedor`: el `#decision`. `decision`: la del motor. `opciones`:
//   estado      el estado de la parada (lo que la pantalla ya contó)
//   previa      `previaDeDecision` (la p de cada opción de un partido) o null
//   mundo       el puente del ambiente (`ctx.mundo`: declarar, costura, geometria, tenir, fx)
//   sonido      los sonidos del kit (opcional)
//   responder   `responder({ opcionId })` del controlador
//   arte        tu main (la clave de Data Dragon)
//   limite      la línea "antes" (`#paradaAntes`) · lateral: la placa "Vos" (`#acompanante`) · margen(): px
// Devuelve { nodo, titulo, variante, narrar(ctx), destruir() }.
export function crearDecision(contenedor, decision, { estado, previa = null, mundo, sonido = null, responder, arte = null, limite = null, lateral = null, margen = () => 0 }) {
  const lector = leerDecision(decision, { estado, previa });
  const { forma, esMatriz, disponibles, bloqueadas, lec, variante, previas, chipDePrevia, pDe } = lector;
  const fx = () => mundo?.fx?.() ?? null;

  // ------------------------------------------------------------------ la cabecera
  const raiz = el('section', { class: 'parada parada-decision', 'data-forma': forma, 'data-bisagra': lec.bisagra ? '' : null, 'data-costura': variante });
  const col = el('div', { class: 'parada-col' });
  const rotuloCat = rotuloDeDecision(decision, estado);
  const rotulo = el('p', { class: 'rotulo-cat' }, [
    el('i', { class: 'punto-luz' }),
    el('span', { text: esMatriz ? 'El plan del año' : rotuloCat.label }),
    lec.bisagra ? el('span', { class: 'bisagra', text: 'Decisión bisagra' }) : null,
    esMatriz ? el('span', { class: 'bisagra', text: 'el plan corre solo' }) : null
  ]);
  const titulo = el('h1', { class: 'titulo-parada', id: 'decisionTitle', 'data-foco': '', tabindex: '-1', text: decision.titulo });
  const [primera, resto] = partirDescripcion(decision.descripcion);
  const btnMas = resto ? el('button', { type: 'button', class: 'btn-mas', 'aria-expanded': 'false', text: 'más' }) : null;
  const planteo = el('p', { class: 'planteo', id: 'decisionDesc' }, [el('span', { class: 'planteo-1', text: primera }), resto ? el('span', { class: 'planteo-resto', text: ' ' + resto }) : null, btnMas]);
  btnMas?.addEventListener('click', () => {
    const abrir = !planteo.classList.contains('abierto');
    planteo.classList.toggle('abierto', abrir);
    btnMas.setAttribute('aria-expanded', String(abrir));
    btnMas.textContent = abrir ? 'menos' : 'más';
  });

  // ------------------------------------------------------------------ las opciones
  const filas = [];
  const descId = (i) => `decision-desc-${i}`;
  // Para los lectores (y la búsqueda del navegador): todo lo que el motor dice de la opción.
  const descOculta = (o, i) => el('span', { class: 'solo-lectores', id: descId(i) }, [lector.lectores(o)]);
  const riesgoNodo = (o) => nodoDeRiesgo(o, lector);
  const medidorP = (p) => el('span', { class: 'medidor-p', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(porcentaje(p)) }, [el('i', {}, el('i', { style: { width: `${p * 100}%` } })), el('b', { text: `${porcentaje(p)}%` })]);
  const masMovil = (o, i) => {
    const b = el('button', { type: 'button', class: 'op-mas', 'aria-label': `Más sobre ${o.label}`, text: 'más' });
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      apuntar(i, true, true);
    });
    return b;
  };
  const tags = (o) => {
    const hay = o.propuesta || (o.rareza && o.rareza !== 'comun');
    return hay ? el('span', { class: 'op-tags' }, [
      o.propuesta ? el('span', { class: 'tag tag-perfil', text: 'Tu perfil' }) : null,
      o.rareza && o.rareza !== 'comun' ? el('span', { class: 'tag tag-rara', text: o.rareza }) : null
    ]) : null;
  };
  // La prosa de la opción, a la vista solo con "Textos: completos".
  const opDesc = (o) => (o.descripcion ? el('span', { class: 'op-desc', text: o.descripcion }) : null);
  // El plan que fija la opción del cierre de año: su nombre en la fila; la línea del motor, en el inspector.
  const opPlan = (o) => (o.plan?.texto ? el('span', { class: 'op-plan', title: o.plan.texto }, [icono('practica'), el('span', { text: o.plan.titulo ?? o.plan.texto })]) : null);

  let lista;
  if (!esMatriz) {
    lista = el('div', { class: 'opciones', id: 'decisionOptions', role: 'group', 'aria-label': 'Opciones' });
    disponibles.forEach((o, i) => {
      const glifos = el('span', { class: 'op-glifos' }, [
        ...(o.previa ?? []).map((p) => el('span', { class: `eje ${p.signo === '-' ? 'baja' : 'sube'}`, 'data-eje': ejeDe(p.campo), style: estiloEje(ejeDe(p.campo)), title: p.texto }, [icono(glifoDeCampo(p.campo)), el('span', { class: 'eje-nom', text: ABREVIATURA[glifoDeCampo(p.campo)] ?? p.etiqueta }), triangulos(p.magnitud, p.signo)])),
        riesgoNodo(o),
        pDe(o) != null ? medidorP(pDe(o)) : null
      ]);
      const b = el('button', { type: 'button', class: 'opcion', 'data-atajo': i < 4 ? String(i + 1) : null, 'data-id': o.id, 'aria-describedby': descId(i) }, [
        el('span', { class: 'op-tecla', 'aria-hidden': 'true', text: String(i + 1) }),
        el('span', { class: 'op-cuerpo' }, [el('span', { class: 'op-label' }, [o.label, tags(o)]), opDesc(o), glifos, opPlan(o)]),
        descOculta(o, i)
      ]);
      filas.push(b);
      lista.append(el('div', { class: 'op-caja' }, [b, masMovil(o, i)]));
    });
  } else {
    // la planilla: columnas = ejes en orden de aparición; cada celda alinea barra + número + magnitud
    const { ejes, referente, stats, mejorGanancia } = lector.matriz;
    const nombreDeEje = lector.nombreDeEje;
    lista = el('div', { class: 'matriz', id: 'decisionOptions', role: 'group', 'aria-label': 'El plan del año: opciones por eje', style: { '--ejes': String(ejes.length), '--cols': String(ejes.length + 1) } });
    lista.append(el('div', { class: 'mx-cab', 'aria-hidden': 'true' }, [
      el('span', { class: 'mx-op', text: 'Plan · por semana' }),
      ...ejes.map((c) => el('span', { class: 'mx-eje', 'data-campo': campoCorto(c), 'data-eje': ejeDe(c), style: estiloEje(ejeDe(c)) }, [
        icono(glifoDeCampo(c)),
        el('span', { class: 'mx-eje-nom', text: nombreDeEje(c) }),
        referente[c] != null ? el('b', { class: 'mx-ref', text: typeof referente[c] === 'number' ? num(referente[c]) : String(referente[c]) }) : null
      ])),
      // el riesgo no es un eje: lleva el glifo del riesgo (el de la casita es del eje Casa)
      el('span', { class: 'mx-eje mx-riesgo-cab' }, [icono('incierto'), el('span', { class: 'mx-eje-nom', text: 'Riesgo · año' })])
    ]));
    disponibles.forEach((o, i) => {
      const mejor = mejorGanancia(o);
      const celdas = ejes.map((c) => {
        const p = (o.previa ?? []).find((x) => x.campo === c);
        if (!p) return el('span', { class: 'mx-celda vacia' }, el('i', { class: 'mx-nada' }));
        const st = stats[c];
        const ancho = (Math.abs(p.valor) / st.max) * (st.mixto ? 50 : 100);
        const barra = el('span', { class: 'mx-barra' + (st.mixto ? ' mixta' : '') }, el('i', { class: p.signo === '-' ? 'baja' : 'sube', style: { width: `${ancho}%` } }));
        const eje = ejeDe(c);
        return el('span', { class: `mx-celda ${p.signo === '-' ? 'baja' : 'sube'}${c === mejor ? ' mx-mejor' : ''}`, 'data-eje': eje, style: estiloEje(eje), title: p.texto }, [barra, el('b', {}, [conSigno(p.valor), campoCorto(c) === 'ranked' ? el('span', { class: 'mx-u', text: ' LP' }) : null]), triangulos(p.magnitud, p.signo)]);
      });
      const marcas = [];
      if (o.semanaDeuda != null) marcas.push(el('span', { class: 'mx-marca', title: `deuda de sueño desde la semana ${o.semanaDeuda}` }, [icono('sleep'), `s${o.semanaDeuda}`]));
      if (o.semanaMentalRoja != null) marcas.push(el('span', { class: 'mx-marca', title: `cabeza en rojo desde la semana ${o.semanaMentalRoja}` }, [icono('mentalidad'), `s${o.semanaMentalRoja}`]));
      if (o.semanaRiesgoFisico != null) marcas.push(el('span', { class: 'mx-marca', title: `riesgo físico desde la semana ${o.semanaRiesgoFisico}` }, [icono('alto'), `s${o.semanaRiesgoFisico}`]));
      const casa = Number.isFinite(o.riesgoCasa) ? porcentaje(o.riesgoCasa) : null;
      const riesgo = el('span', { class: 'mx-celda mx-riesgo', 'data-riesgo': RIESGO[o.riesgo] ?? 'incierto' }, [
        casa != null ? el('span', { class: 'mx-casa', title: 'que en casa te saquen la PC en el año' }, [el('span', { class: 'mx-barra' }, el('i', { class: 'riesgo', style: { width: `${casa}%` } })), el('b', { text: `${casa}%` })]) : null,
        ...marcas
      ]);
      const b = el('button', { type: 'button', class: 'opcion mx-fila', 'data-atajo': i < 4 ? String(i + 1) : null, 'data-id': o.id, 'aria-describedby': descId(i) }, [
        el('span', { class: 'mx-op' }, [el('span', { class: 'op-tecla', 'aria-hidden': 'true', text: String(i + 1) }), el('span', { class: 'op-label', text: o.label }), tags(o)]),
        ...celdas,
        riesgo,
        descOculta(o, i)
      ]);
      filas.push(b);
      lista.append(el('div', { class: 'op-caja' }, [b, masMovil(o, i)]));
    });
  }
  // Las cerradas se muestran con su motivo, no desaparecen.
  bloqueadas.forEach((bq, k) => {
    const b = el('div', { class: `opcion bloqueada${esMatriz ? ' mx-fila' : ''}`, tabindex: '0', 'aria-disabled': 'true', 'data-gate': bq.gate ?? '' }, [
      el('span', { class: esMatriz ? 'mx-op' : 'op-tecla' }, esMatriz ? [el('span', { class: 'op-tecla' }, icono('candado')), el('span', { class: 'op-label', text: bq.label })] : icono('candado')),
      esMatriz ? null : el('span', { class: 'op-cuerpo' }, [el('span', { class: 'op-label', text: bq.label }), el('span', { class: 'op-glifos' }, el('span', { class: 'gate', text: 'cerrada' }))]),
      el('span', { class: 'solo-lectores', text: `Cerrada: ${bq.gate ?? ''}` })
    ]);
    b.dataset.cerrada = String(k);
    filas.push(b);
    lista.append(el('div', { class: 'op-caja' }, b));
  });

  // ------------------------------------------------------------------ el inspector (una sola prosa a la vez)
  const inspector = el('div', { class: 'inspector', 'aria-live': 'polite' });
  let apuntada = 0;
  let elegido = false;
  // `destino`: dónde se pinta (el inspector vivo, o el clon fuera del árbol accesible con el que se mide: ver `fijarAltoDelInspector`).
  function pintarInspector(i, destino = inspector) {
    const f = filas[i];
    if (!f) return;
    destino.textContent = '';
    if (f.classList.contains('bloqueada')) {
      destino.append(el('p', { class: 'insp-kicker' }, [icono('candado'), 'Cerrada']), el('p', { class: 'insp-texto', text: f.dataset.gate }));
      return;
    }
    const o = disponibles[i];
    destino.append(
      el('p', { class: 'insp-kicker' }, [el('span', { class: 'insp-n', text: String(i + 1) }), o.label]),
      el('p', { class: 'insp-texto', text: o.descripcion ?? '' }),
      // los efectos como chips de eje (la planilla); el texto del motor de cada uno, abajo con "Textos: completos"
      (o.previa ?? []).length ? el('div', { class: 'eje-chips insp-ejes' }, o.previa.map(chipDePrevia)) : null,
      el('ul', { class: 'insp-previa' }, [
        ...(o.previa ?? []).map((p) => el('li', { class: `insp-efecto ${p.signo === '-' ? 'baja' : 'sube'}` }, [icono(glifoDeCampo(p.campo)), p.texto])),
        o.riesgoTexto ? el('li', { class: 'insp-riesgo' }, [icono(RIESGO[o.riesgo] ?? 'incierto'), o.riesgoTexto]) : null,
        previas[o.id]?.texto ? el('li', { class: 'insp-p' }, [icono('rendimiento'), previas[o.id].texto]) : null,
        o.propuesta ? el('li', { class: 'insp-perfil' }, [icono('hype'), o.propuesta]) : null,
        o.plan?.texto ? el('li', { class: 'insp-plan' }, [icono('practica'), textoDelPlan(o)]) : null
      ])
    );
  }
  function apuntar(i, mover = false, usuario = false) {
    apuntada = Math.max(0, Math.min(filas.length - 1, i));
    filas.forEach((f, k) => f.classList.toggle('apuntada', k === apuntada));
    pintarInspector(apuntada);
    if (mover) filas[apuntada].focus({ preventScroll: true });
    inspector.classList.toggle('expandido', mover);
    // la fila i del panel es el camino i de la costura (las disponibles primero, las cerradas al final: el mismo orden)
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

  const cab = el('header', { class: 'panel-cab' }, [rotulo, titulo, planteo]);
  const cuerpo = el('div', { class: 'panel-cuerpo' }, [lista, inspector]);
  col.append(cab, cuerpo);
  raiz.append(col);

  // ------------------------------------------------------------------ la costura (con destino)
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
  // El inspector cambia de alto con la opción apuntada; con el panel apoyado abajo eso corre las filas debajo del
  // puntero (y el puntero pasa a apuntar otra). Se reserva el alto de la opción más alta.
  //
  // Se mide en un clon (`aria-hidden`, sin `aria-live`, invisible y fuera del flujo, con el ancho del inspector vivo): el
  // inspector vivo es una región `aria-live="polite"` y repintarlo N+1 veces (al montar, en `fonts.ready`, en cada resize y
  // al cambiar Textos) hacía que un lector de pantalla anunciara cada opción. Al vivo solo se le toca el `minHeight`.
  function fijarAltoDelInspector() {
    if (!raiz.isConnected || elegido) return;
    inspector.style.minHeight = '';
    const ancho = inspector.offsetWidth;
    let alto = 0;
    if (ancho > 0) {
      const medida = inspector.cloneNode(false);
      medida.removeAttribute('aria-live');
      medida.removeAttribute('id');
      medida.setAttribute('aria-hidden', 'true');
      Object.assign(medida.style, { position: 'absolute', visibility: 'hidden', pointerEvents: 'none', left: '0', top: '0', width: `${ancho}px`, minHeight: '' });
      inspector.parentNode.append(medida);
      filas.forEach((_, i) => {
        pintarInspector(i, medida);
        alto = Math.max(alto, medida.offsetHeight);
      });
      medida.remove();
    }
    inspector.style.minHeight = `${alto}px`;
  }
  fijarAltoDelInspector();
  document.fonts?.ready?.then(fijarAltoDelInspector, () => {});
  window.addEventListener('resize', fijarAltoDelInspector);
  // "Textos: completos" cambia lo que entra en el inspector: se vuelve a medir
  const vigiaDeTextos = typeof MutationObserver === 'function' ? new MutationObserver(fijarAltoDelInspector) : null;
  vigiaDeTextos?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-textos'] });

  // ------------------------------------------------------------------ la entrada
  function entradaPanel(d = 0) {
    lineasConMascara(titulo).forEach((l, i) => animar(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: T.titulo + d + i * T.tituloPaso, dur: DUR.larga }));
    animar(col, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { delay: T.col + d, dur: 320 });
    entrar(rotulo, T.rotulo + d, 10);
    entrar(planteo, T.planteo + d, 10);
    filas.forEach((f, i) => {
      entrar(f, T.filas + d + i * T.filaPaso, 16);
      f.querySelectorAll('.eje, .riesgo, .mx-celda').forEach((g, k) => animar(g, [{ opacity: 0, transform: 'translateX(-6px)' }, { opacity: 1, transform: 'none' }], { delay: T.filas + 60 + d + i * T.filaPaso + k * 25, dur: 240 }));
    });
    if (esMatriz) {
      entrar(lista.querySelector('.mx-cab'), T.filas - 30 + d, 8);
      lista.querySelectorAll('.mx-barra i').forEach((b, k) => animar(b, [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: T.filas + 90 + d + k * 12, dur: 520 }));
    }
    entrar(inspector, T.inspector + d, 8);
  }
  // aceptar el aviso: la costura se abre y el panel entra con su orden; el foco pasa al título
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
  // La parada entra después del relato (que ya pasó por el mundo): el panel con su orden, sin el pre-roll de la vitrina
  // (el relato del split que se plegaba en la línea "antes": en el juego ese relato es la pieza anterior).
  capa?.entrar();
  if (!lec.aviso && !quieto()) entradaPanel(T.sinPreroll);

  // ------------------------------------------------------------------ elegir
  let respuesta = null; // { i, o, fila, r0 }
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
    fx()?.pulso?.('elegir');
    sonido?.clic?.();
    const tono = capa?.elegir(i) ?? null;
    if (tono) mundo?.tenir?.(tono);
    respuesta = { i, o, fila };
    responder({ opcionId: o.id });
  }

  // Las flechas mueven lo apuntado (el foco); 1-4 los pone el teclado del shell (`data-atajo`).
  raiz.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || elegido) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      apuntar(apuntada + (e.key === 'ArrowDown' ? 1 : -1), true, true);
    }
  });

  // ------------------------------------------------------------------ narrar: la opción se vuelve su resultado
  // La tarjeta y su coreografía de adentro son de `decision/comun.js` (PLANUI §0.3, punto 2); acá, de dónde viene: la
  // fila elegida crece hasta la tarjeta mientras las otras se apagan y el planteo y el inspector se pliegan.
  // `ctx` (app.js, `narrarRespuesta`): { logs, inmediato(), escala, rapido, controlar, rodarPlaca }. Devuelve cuántos de
  // los logs nuevos contó (desde el primero): esos no se vuelven a contar en el relato.
  async function narrar(ctx) {
    if (!respuesta || !raiz.isConnected) return 0;
    const { i, o, fila } = respuesta;
    const inm = ctx.inmediato?.() ?? null;
    const { tarjeta, cambios, contados } = tarjetaDelResultado(o, i + 1, inm, ctx.logs ?? [], { estado, lector });
    const narracion = crearNarracion(ctx, [raiz]);
    try {
      const r0 = fila.getBoundingClientRect();
      // lo que se va: las otras filas se apagan en su lugar (un fantasma), el planteo y el inspector se pliegan
      const c0 = lista.getBoundingClientRect();
      const fantasma = lista.cloneNode(true);
      fantasma.classList.add('ln-fantasma');
      fantasma.setAttribute('aria-hidden', 'true');
      fantasma.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
      fantasma.removeAttribute('id');
      fantasma.querySelectorAll(':scope > .op-caja')[i]?.classList.add('oculta');
      Object.assign(fantasma.style, { position: 'absolute', left: `${lista.offsetLeft}px`, top: `${lista.offsetTop}px`, width: `${c0.width}px`, margin: '0' });
      lista.replaceWith(tarjeta);
      cuerpo.classList.add('con-resultado');
      col.append(fantasma);
      const r1 = tarjeta.getBoundingClientRect();
      const salida = animar(fantasma, [{ opacity: 1 }, { opacity: 0, filter: 'blur(2px)' }], { dur: DUR.sale, fill: 'forwards', easing: 'linear' });
      if (salida) salida.finished.then(() => fantasma.remove(), () => fantasma.remove());
      else fantasma.remove();
      for (const x of [planteo, inspector]) {
        const a = salir(x, 0);
        if (a) a.finished.then(() => x.classList.add('ln-plegado'), () => x.classList.add('ln-plegado'));
        else x.classList.add('ln-plegado');
      }
      rotulo.querySelector('span').textContent = 'Lo que pasó';
      animar(tarjeta, [
        { transform: `translateY(${r0.top - r1.top}px)`, clipPath: `inset(0 0 calc(100% - ${r0.height}px) 0)` },
        { transform: 'none', clipPath: 'inset(0 0 0 0)' }
      ], { dur: DUR.larga, easing: EXPO });
      animarResultado(tarjeta);
      // los mismos números ruedan en la placa "Vos" (y en la franja)
      for (const nodo of ctx.rodarPlaca?.(cambios, T_RESULTADO.numeros + 100) ?? []) narracion.incluir(nodo);
      narracion.esperar(T_RESULTADO.pulso).then(() => fx()?.pulso?.(pulsoDelResultado(cambios)));
      tarjeta.focus({ preventScroll: true });
      // INST: el cuadro final de "lo que pasó" se sostiene un instante (como el de la serie y el contrato); Enter o un clic lo pasan
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
      window.removeEventListener('resize', fijarAltoDelInspector);
      vigiaDeTextos?.disconnect();
      capa?.destruir();
    }
  };
}

// La línea del plan que fija una opción del cierre de año, tal cual la arma el motor (`lineaDePlan`): la pantalla no
// calcula nada.
function textoDelPlan(opcion) {
  return opcion.plan.texto;
}
