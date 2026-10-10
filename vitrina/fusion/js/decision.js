// La Decision (fusion): la estructura del cliente de C dentro de la luz de A. El relato del split entra de a un beat y
// se pliega en la linea "antes"; la parada es UN panel: la cabecera (rotulo, titulo ancho, planteo en una linea) y
// abajo las opciones por glifos (eje + magnitud por cantidad, riesgo como icono + nombre) con el inspector al costado
// (una sola prosa a la vez). El plan amateur es la planilla (opciones x ejes) con el inspector abajo. A la derecha, el
// panel "vos"; arriba a la derecha queda libre la cara del campeon. Elegir transforma la opcion en la tarjeta de SU
// resultado real, con los numeros rodando en la tarjeta, en el panel "vos" y en la franja.
import { el, entrar, salir, animar, esperar, lineasConMascara, primeraOracion, num, conSigno, odometro, reducido, inst, celular, EXPO, DUR } from './util.js';
import { icono, glifoDeCampo, triangulos, ABREVIATURA } from './iconos.js';
import { franja, trayectoria, contexto, rodarContexto, cuartos, entrarPanel } from './marco.js';
import { leerEvento, crearEscena, crearInvitacion, crearPeso, crearFinal, crearCostura, cargados } from './escena.js';

const ETIQUETAS = {
  mecanica: 'Mecánica', macro: 'Macro', laneo: 'Laneo', teamfight: 'Teamfight', shotcalling: 'Shotcalling',
  adaptabilidad: 'Adaptabilidad', mentalidad: 'Consistencia', sleep: 'Sueño', studies: 'Estudios',
  familyTrust: 'Confianza familiar', hype: 'Hype', nivel: 'Nivel', arraigo: 'Arraigo', sinergia: 'Sinergia', ranked: 'SoloQ',
};
const OCULTOS = new Set(['player.ranked.division', 'player.ranked.escudo', 'player.ranked.lp', 'player.ranked.partidas', 'player.soloqElo']);
const RIESGO = { seguro: 'seguro', incierto: 'incierto', ruleta: 'ruleta', alto: 'alto', peligroso: 'alto' };
const CATEGORIA = { mercado: 'Mercado', caminos: 'Caminos', vida: 'Vida', equipo: 'Equipo', competencia: 'Competencia', amateur: 'Amateur' };
const MAX_BEATS = 5;
const CORTO = { 'Confianza familiar': 'Casa', Consistencia: 'Cabeza', Adaptabilidad: 'Adapt.', Shotcalling: 'Calls' };

const campoCorto = (campo) => campo.split('.').pop();
const etiquetaDe = (campo, mapa) => mapa[campo] ?? ETIQUETAS[campoCorto(campo)] ?? campoCorto(campo);
const textoDeBeat = (log) => (log.titulo ? log.titulo : log.message);
// Las opciones de diseño de esta pantalla (PLANUI §4.7, `op=` en el hash; js/escena.js). Sin `op`, la de hoy.
// `final` (PLANUI §4.8) es la ultima demostracion: la invitacion como portal (cliente) que abre el capitulo con destinos.
// `linea` (PLANUI §4.9): la bisagra como ¡OFERTA ENCONTRADA! que abre la costura con los dos destinos; las comunes, simples.
const OPCIONES = ['escena', 'cliente', 'bisagra', 'final', 'linea'];
// (PLANUI §4.10) las costuras de la bisagra con `op=linea` (`var=` en el hash; sin var o desconocida, la de §4.9)
const VARIANTES = ['campeones', 'copas', 'liga'];

export function crearDecision({ datos, muestra, amb, sonido, peor, op, variante }) {
  const opDec = OPCIONES.includes(op) ? op : null;
  const varDec = opDec === 'linea' && VARIANTES.includes(variante) ? variante : 'campeones';
  let capa = null; // la escena o el peso (segun la opcion)
  let invitacion = null; // el momento del cliente (solo en la bisagra)
  const m = datos[muestra];
  const pc = peor ? datos.peorCaso : null;
  const largos = pc?.textosMasLargos ?? {};
  const dec = { ...m.decision, opciones: m.decision.opciones.map((o) => ({ ...o })) };
  if (pc) {
    dec.titulo = largos['decision.titulo']?.texto ?? dec.titulo;
    dec.descripcion = largos['decision.descripcion']?.texto ?? dec.descripcion;
    dec.opciones[0].label = largos['opcion.label']?.texto ?? dec.opciones[0].label;
    dec.opciones[0].descripcion = largos['opcion.descripcion']?.texto ?? dec.opciones[0].descripcion;
  }
  const peorDatos = pc ? { handle: pc.handle, org: pc.org?.nombre } : null;
  const previas = Object.fromEntries((m.previas?.porOpcion ?? []).map((p) => [p.id, p]));
  const resultados = Object.fromEntries((m.resultados ?? []).map((r) => [r.opcionId, r]));
  const etiquetas = {};
  for (const o of dec.opciones) for (const p of o.previa ?? []) etiquetas[p.campo] = p.etiqueta;
  const esMatriz = dec.datos?.motivo === 'plan_amateur' || (dec.opciones.length >= 3 && dec.opciones.every((o) => (o.previa ?? []).every((p) => typeof p.valor === 'number')));
  const j = m.ficha?.jugador ?? {};
  const main = j.campeonDelSplit ?? datos.inicio?.jugador?.mains?.[0]?.ddragon ?? null;

  // ------------------------------------------------------------------ nodos
  const raiz = el('section', { class: 'parada parada-decision', 'data-pieza': 'decision', 'data-forma': esMatriz ? 'matriz' : 'lista', 'data-muestra': muestra, 'data-op': opDec, 'data-bisagra': opDec && m.esBisagra ? '' : null, 'data-var': opDec === 'linea' ? varDec : null });
  const fr = franja(m.franja, { peor: peorDatos });
  const col = el('div', { class: 'parada-col' });
  const beats = (m.pagina?.beats ?? []).filter((b) => !b.log.tecnico).slice(-MAX_BEATS);

  // relato del split (pre-roll) — solo con movimiento
  const relato = el('div', { class: 'relato', 'aria-hidden': 'true' }, [
    el('p', { class: 'relato-cartel', text: m.pagina?.cartel?.texto ?? '' }),
    el('ol', { class: 'relato-beats' }, beats.map((b) => el('li', { class: b.beat ? 'beat' : 'adjunto' }, [icono(b.log.type), el('span', { text: textoDeBeat(b.log) })]))),
  ]);

  // la linea "antes" + el split completo a un toque
  const antesLog = m.antes?.log;
  const splitLista = el('ol', { class: 'split-lista', id: `split-${muestra}`, hidden: true }, [
    el('li', { class: 'split-cartel', text: m.pagina?.cartel?.texto ?? '' }),
    ...(m.pagina?.beats ?? []).filter((b) => !b.log.tecnico).map((b) => el('li', {}, [icono(b.log.type), el('span', { text: b.log.message })])),
  ]);
  const btnSplit = el('button', { type: 'button', class: 'btn-split', 'aria-expanded': 'false', 'aria-controls': splitLista.id }, [`El split · ${splitLista.childElementCount - 1}`]);
  btnSplit.addEventListener('click', () => {
    const abierto = splitLista.hidden;
    splitLista.hidden = !abierto;
    btnSplit.setAttribute('aria-expanded', String(abierto));
    if (abierto) splitLista.querySelectorAll('li').forEach((li, i) => entrar(li, i * 30, 6));
  });
  const antes = el('p', { class: 'antes' }, [
    icono(antesLog?.type ?? 'temporada'),
    antesLog
      ? el('span', { class: 'antes-texto' }, [el('b', { text: antesLog.titulo ?? '' }), antesLog.efectos ? el('span', { class: 'antes-efectos', text: antesLog.efectos }) : null])
      : el('span', { class: 'antes-texto' }, [el('b', { text: m.pagina?.cartel?.texto ?? '' }), beats.length ? el('span', { class: 'antes-efectos', text: beats[beats.length - 1].log.message }) : null]),
    btnSplit,
  ]);

  const categoria = dec.datos?.evento?.categoria ?? m.categoria ?? (esMatriz ? 'amateur' : null);
  const rotulo = el('p', { class: 'rotulo-cat' }, [
    el('i', { class: 'punto-luz' }),
    el('span', { text: esMatriz ? 'El plan del año' : CATEGORIA[categoria] ?? 'La parada' }),
    m.esBisagra ? el('span', { class: 'bisagra', text: 'Decisión bisagra' }) : null,
    esMatriz ? el('span', { class: 'bisagra', text: '3 semanas · el plan corre solo' }) : null,
  ]);
  const titulo = el('h1', { class: 'titulo-parada', 'data-foco': '', tabindex: '-1', text: dec.titulo });
  const [primera, resto] = primeraOracion(dec.descripcion);
  const btnMas = resto ? el('button', { type: 'button', class: 'btn-mas', 'aria-expanded': 'false', text: 'más' }) : null;
  const planteo = el('p', { class: 'planteo', id: `planteo-${muestra}` }, [el('span', { class: 'planteo-1', text: primera }), resto ? el('span', { class: 'planteo-resto', text: ' ' + resto }) : null, btnMas]);
  btnMas?.addEventListener('click', () => {
    const a = !planteo.classList.contains('abierto');
    planteo.classList.toggle('abierto', a);
    btnMas.setAttribute('aria-expanded', String(a));
    btnMas.textContent = a ? 'menos' : 'más';
  });

  // ------------------------------------------------------------------ opciones
  const disponibles = dec.opciones;
  const filas = [];
  const descId = (o) => `desc-${muestra}-${o.id}`;
  const descOculta = (o) => {
    const pv = previas[o.id] ?? o;
    return el('span', { class: 'sr', id: descId(o) }, [
      o.descripcion,
      ' ',
      (o.previa ?? []).map((p) => p.texto).join('. '),
      pv.riesgoTexto ? `. Riesgo: ${pv.riesgoTexto}.` : '',
      o.propuesta ? ` ${o.propuesta}.` : '',
    ]);
  };
  const pDe = (o) => {
    const pv = previas[o.id];
    const p = pv?.pSerie ?? pv?.pMapas ?? null;
    return typeof p === 'number' ? p : null;
  };
  const riesgoNodo = (o) => {
    const r = previas[o.id]?.riesgo ?? o.riesgo;
    if (!r) return null;
    const k = RIESGO[r] ?? 'incierto';
    return el('span', { class: 'riesgo', 'data-riesgo': k }, [icono(k), r]);
  };
  const medidorP = (p) => el('span', { class: 'medidor-p', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(p * 100)) }, [el('i', { style: { width: `${p * 100}%` } }), el('b', { text: `${Math.round(p * 100)}%` })]);
  const masMovil = (o, i) => {
    const b = el('button', { type: 'button', class: 'op-mas', 'aria-label': `Más sobre ${o.label}`, text: 'más' });
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      apuntar(i, true, true);
    });
    return b;
  };

  let lista;
  if (!esMatriz) {
    lista = el('div', { class: 'opciones', role: 'group', 'aria-label': 'Opciones' });
    disponibles.forEach((o, i) => {
      const glifos = el('span', { class: 'op-glifos' }, [
        ...(o.previa ?? []).map((p) => el('span', { class: `eje ${p.signo === '-' ? 'baja' : 'sube'}`, title: p.texto }, [icono(glifoDeCampo(p.campo)), el('span', { class: 'eje-nom', text: ABREVIATURA[glifoDeCampo(p.campo)] ?? p.etiqueta }), triangulos(p.magnitud, p.signo)])),
        riesgoNodo(o),
        pDe(o) != null ? medidorP(pDe(o)) : null,
      ]);
      const b = el('button', { type: 'button', class: 'opcion', 'data-atajo': String(i + 1), 'data-id': o.id, 'aria-describedby': descId(o) }, [
        el('span', { class: 'op-tecla', text: String(i + 1) }),
        el('span', { class: 'op-cuerpo' }, [el('span', { class: 'op-label', text: o.label }), glifos]),
        masMovil(o, i),
        descOculta(o),
      ]);
      filas.push(b);
      lista.append(b);
    });
    for (const bq of dec.opcionesBloqueadas ?? []) {
      const b = el('div', { class: 'opcion bloqueada', tabindex: '0', 'aria-disabled': 'true', 'data-gate': bq.gate }, [
        el('span', { class: 'op-tecla' }, icono('candado')),
        el('span', { class: 'op-cuerpo' }, [el('span', { class: 'op-label', text: bq.label }), el('span', { class: 'op-glifos' }, el('span', { class: 'gate', text: 'cerrada' }))]),
        el('span', { class: 'sr', text: `Bloqueada: ${bq.gate}` }),
      ]);
      filas.push(b);
      lista.append(b);
    }
  } else {
    // matriz: columnas = ejes en orden de aparicion; cada celda alinea barra + numero + magnitud
    const ejes = [];
    for (const o of disponibles) for (const p of o.previa ?? []) if (!ejes.includes(p.campo)) ejes.push(p.campo);
    const referente = {
      'player.ranked': j.rankedTexto,
      'player.studies': j.estudios,
      'player.sleep': j.sueno,
      'player.familyTrust': j.confianzaFamiliar,
      'player.stats.mentalidad': m.ficha?.mentalidad?.valor,
    };
    const stats = Object.fromEntries(ejes.map((c) => {
      const vals = disponibles.map((o) => (o.previa ?? []).find((p) => p.campo === c)?.valor ?? 0);
      return [c, { max: Math.max(1, ...vals.map(Math.abs)), mixto: vals.some((v) => v < 0) && vals.some((v) => v > 0) }];
    }));
    lista = el('div', { class: 'matriz', role: 'group', 'aria-label': 'Plan del año: opciones por eje', style: { '--ejes': String(ejes.length), '--cols': String(ejes.length + 1) } });
    lista.append(el('div', { class: 'mx-cab', 'aria-hidden': 'true' }, [
      el('span', { class: 'mx-op', text: 'Plan · por semana' }),
      ...ejes.map((c) => el('span', { class: 'mx-eje', 'data-campo': campoCorto(c) }, [icono(glifoDeCampo(c)), el('span', { class: 'mx-eje-nom', text: CORTO[etiquetaDe(c, etiquetas)] ?? etiquetaDe(c, etiquetas) }), referente[c] != null ? el('b', { class: 'mx-ref', text: typeof referente[c] === 'number' ? num(referente[c]) : String(referente[c]).replace(' LP', '') }) : null])),
      el('span', { class: 'mx-eje mx-riesgo-cab' }, [icono('familyTrust'), el('span', { class: 'mx-eje-nom', text: 'Riesgo · año' })]),
    ]));
    disponibles.forEach((o, i) => {
      const celdas = ejes.map((c) => {
        const p = (o.previa ?? []).find((x) => x.campo === c);
        if (!p) return el('span', { class: 'mx-celda vacia' }, el('i', { class: 'mx-nada' }));
        const st = stats[c];
        const ancho = (Math.abs(p.valor) / st.max) * (st.mixto ? 50 : 100);
        const barra = el('span', { class: 'mx-barra' + (st.mixto ? ' mixta' : '') }, el('i', { class: p.signo === '-' ? 'baja' : 'sube', style: { width: `${ancho}%` } }));
        return el('span', { class: `mx-celda ${p.signo === '-' ? 'baja' : 'sube'}`, title: p.texto }, [barra, el('b', {}, [conSigno(p.valor), campoCorto(c) === 'ranked' ? el('span', { class: 'mx-u', text: ' LP' }) : null]), triangulos(p.magnitud, p.signo)]);
      });
      const pv = previas[o.id] ?? {};
      const marcas = [];
      if (o.semanaDeuda) marcas.push(el('span', { class: 'mx-marca', title: `deuda de sueño desde la semana ${o.semanaDeuda}` }, [icono('sleep'), `s${o.semanaDeuda}`]));
      if (o.semanaMentalRoja) marcas.push(el('span', { class: 'mx-marca', title: `cabeza en rojo desde la semana ${o.semanaMentalRoja}` }, [icono('mentalidad'), `s${o.semanaMentalRoja}`]));
      if (o.semanaRiesgoFisico) marcas.push(el('span', { class: 'mx-marca', title: `riesgo físico desde la semana ${o.semanaRiesgoFisico}` }, [icono('alto'), `s${o.semanaRiesgoFisico}`]));
      const casa = typeof o.riesgoCasa === 'number' ? o.riesgoCasa : null;
      const riesgo = el('span', { class: 'mx-celda mx-riesgo', 'data-riesgo': RIESGO[pv.riesgo ?? o.riesgo] ?? 'incierto' }, [
        casa != null ? el('span', { class: 'mx-casa' }, [el('span', { class: 'mx-barra' }, el('i', { class: 'riesgo', style: { width: `${casa}%` } })), el('b', { text: `${casa}%` })]) : null,
        ...marcas,
      ]);
      const tags = el('span', { class: 'op-tags' }, [
        o.propuesta ? el('span', { class: 'tag tag-perfil', text: 'Tu perfil' }) : null,
        o.rareza && o.rareza !== 'comun' ? el('span', { class: 'tag tag-rara', text: o.rareza }) : null,
      ]);
      const b = el('button', { type: 'button', class: 'opcion mx-fila', 'data-atajo': String(i + 1), 'data-id': o.id, 'aria-describedby': descId(o) }, [
        el('span', { class: 'mx-op' }, [el('span', { class: 'op-tecla', text: String(i + 1) }), el('span', { class: 'op-label', text: o.label }), tags]),
        ...celdas,
        riesgo,
        masMovil(o, i),
        descOculta(o),
      ]);
      filas.push(b);
      lista.append(b);
    });
  }

  // ------------------------------------------------------------------ inspector (una sola prosa a la vez)
  const inspector = el('div', { class: 'inspector', 'aria-live': 'polite' });
  let apuntada = 0;
  function pintarInspector(i) {
    const f = filas[i];
    if (!f) return;
    inspector.textContent = '';
    if (f.classList.contains('bloqueada')) {
      inspector.append(el('p', { class: 'insp-kicker' }, [icono('candado'), 'Cerrada']), el('p', { class: 'insp-texto', text: f.dataset.gate }));
      return;
    }
    const o = disponibles[i];
    const pv = previas[o.id] ?? o;
    inspector.append(
      el('p', { class: 'insp-kicker' }, [el('span', { class: 'insp-n', text: String(i + 1) }), o.label]),
      el('p', { class: 'insp-texto', text: o.descripcion }),
      el('ul', { class: 'insp-previa' }, [
        ...(o.previa ?? []).map((p) => el('li', { class: p.signo === '-' ? 'baja' : 'sube' }, [icono(glifoDeCampo(p.campo)), p.texto])),
        pv.riesgoTexto ? el('li', { class: 'insp-riesgo' }, [icono(RIESGO[pv.riesgo] ?? 'incierto'), pv.riesgoTexto]) : null,
        o.propuesta ? el('li', { class: 'insp-perfil' }, [icono('hype'), o.propuesta]) : null,
      ]),
    );
  }
  function apuntar(i, mover = false, usuario = false) {
    apuntada = Math.max(0, Math.min(filas.length - 1, i));
    filas.forEach((f, k) => f.classList.toggle('apuntada', k === apuntada));
    pintarInspector(apuntada);
    if (mover) filas[apuntada].focus({ preventScroll: true });
    inspector.classList.toggle('expandido', mover);
    // (op) la escena / el peso siguen a la opcion que apunta el jugador (no a la apuntada por defecto)
    if (usuario && !elegido) capa?.apuntar(apuntada);
  }
  filas.forEach((f, i) => {
    f.addEventListener('pointerenter', () => {
      if (celular()) return;
      // la luz responde sutil a la opcion apuntada (un pulso leve), sin moverse
      if (i !== apuntada) amb.pulso('apuntar');
      apuntar(i, false, true);
    });
    f.addEventListener('focus', () => apuntar(i, false, !!capa));
    if (!f.classList.contains('bloqueada')) f.addEventListener('click', () => elegir(i + 1));
  });

  const cab = el('header', { class: 'panel-cab' }, [rotulo, titulo, planteo]);
  const cuerpo = el('div', { class: 'panel-cuerpo' }, [lista, inspector]);
  col.append(cab, cuerpo);
  const antesFila = el('div', { class: 'antes-fila' }, [antes, splitLista]);
  const chipSlot = el('div', { class: 'chip-slot' });
  antesFila.prepend(chipSlot);
  const placa = contexto(m, { peor: peorDatos });
  const chipCtx = el('button', { type: 'button', class: 'chip-contexto', 'aria-controls': 'contexto', 'aria-expanded': 'false' }, [icono('nivel'), 'ver contexto']);
  const abrirCtx = () => {
    const a = !raiz.classList.contains('ctx-abierto');
    raiz.classList.toggle('ctx-abierto', a);
    chipCtx.setAttribute('aria-expanded', String(a));
  };
  chipCtx.addEventListener('click', abrirCtx);
  chipSlot.append(chipCtx);
  const historia = datos.final?.tarjeta?.historia ?? [];
  const tray = trayectoria(historia, m.anio, m.edad);
  raiz.append(fr, relato, antesFila, col, placa, cuartos('vos', abrirCtx, tray));
  apuntar(0);

  // ------------------------------------------------------------------ las opciones de diseño (PLANUI §4.7)
  const lec = opDec ? leerEvento(m, dec) : null;
  if (opDec === 'escena') capa = crearEscena(lec, { placa });
  if (opDec === 'bisagra') capa = crearPeso(lec, { col, antesFila });
  if (opDec === 'final') {
    capa = crearFinal(lec, dec, { col, antesFila, placa, alAceptar: (o) => abrirPanel(o) });
    invitacion = capa.invitacion;
    if (invitacion) {
      raiz.classList.add('en-espera');
      raiz.append(invitacion.nodo);
    }
  }
  if (opDec === 'cliente' && lec.bisagra) {
    invitacion = crearInvitacion(lec, dec, { alAceptar: () => abrirPanel() });
    raiz.classList.add('en-espera');
    raiz.append(invitacion.nodo);
  }
  // (op=linea, PLANUI §4.9) con destino, la costura; si es bisagra, llega como ¡OFERTA ENCONTRADA! y el panel espera.
  // Sin destino (el plan, una decision de vida) no hay capa: la pantalla de siempre dentro de la linea.
  const esperaAviso = opDec === 'linea' && !!lec.destino && lec.bisagra;
  if (opDec === 'linea' && lec.destino) {
    capa = crearCostura(lec, { amb, arte: main, sonido, contenedor: raiz, limite: antesFila, lateral: placa, alAceptar: (o) => abrirPanelLinea(o), variante: varDec });
    antesFila.before(capa.banda);
    if (esperaAviso) raiz.classList.add('dc-espera');
  }
  if (capa) {
    raiz.prepend(capa.nodo);
    // soltar la lista devuelve la escena a su reposo (salvo que el foco siga adentro)
    lista.addEventListener('pointerleave', () => {
      if (!elegido && !lista.contains(document.activeElement)) capa.soltar();
    });
  }

  // ------------------------------------------------------------------ entrada
  let elegido = false;
  const quieto = () => inst() || reducido();
  function entrada() {
    // (op cliente, bisagra) el panel espera la invitacion: el titulo se mide igual, pero entra al aceptar
    if (!invitacion && !esperaAviso) lineasConMascara(titulo).forEach((l, i) => animar(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: 780 + i * 70, dur: 420 }));
    entrar(fr, 0, -10);
    capa?.entrar();
    // (op=linea) el aviso llega enseguida, sin el relato: tapa la pantalla (atenuada e inerte) hasta que se acepta
    if (esperaAviso) {
      relato.remove();
      fondoInerte(true);
      if (quieto()) amb.aquietar(true);
      else esperar(raiz, 700).then(() => amb.aquietar(true));
      return;
    }
    if (quieto()) {
      relato.remove();
      amb.aquietar(true);
      invitacion?.entrar();
      return;
    }
    // el relato: cartel, beats de a uno, y se pliega en la linea "antes"
    animar(relato.firstChild, [{ opacity: 0, transform: 'translateY(10px)', letterSpacing: '0.3em' }, { opacity: 1, transform: 'none', letterSpacing: '0.14em' }], { dur: 420 });
    relato.querySelectorAll('li').forEach((li, i) => animar(li, [{ opacity: 0, transform: 'translateX(-18px)', clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' }], { delay: 110 + i * 95, dur: 320 }));
    const fuera = salir(relato, 700);
    fuera?.finished.then(() => relato.remove(), () => {});
    esperar(raiz, 700).then(() => amb.aquietar(true));
    if (invitacion) invitacion.entrar();
    else entradaPanel(capa?.retardoPanel ?? 0);
  }
  // la entrada del panel (antes, columna, rotulo, opciones, inspector, "vos", la barra); `d` corre todo el orden.
  // `conMarco` en false: la linea "antes" y "vos" ya estan (op=linea: se vieron atenuados detras del aviso)
  function entradaPanel(d, conCuartos = true, conMarco = true) {
    if (conMarco) entrar(antes, 700 + d, 10);
    animar(col, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { delay: 640 + d, dur: 320 });
    entrar(rotulo, 740 + d, 10);
    entrar(planteo, 900 + d, 10);
    filas.forEach((f, i) => {
      entrar(f, 950 + d + i * 50, 16);
      f.querySelectorAll('.eje, .riesgo, .mx-celda').forEach((g, k) => animar(g, [{ opacity: 0, transform: 'translateX(-6px)' }, { opacity: 1, transform: 'none' }], { delay: 1010 + d + i * 50 + k * 25, dur: 240 }));
    });
    if (esMatriz) {
      entrar(lista.querySelector('.mx-cab'), 920 + d, 8);
      lista.querySelectorAll('.mx-barra i').forEach((b, k) => animar(b, [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: 1040 + d + k * 12, dur: 520 }));
    }
    entrar(inspector, 1120 + d, 8);
    if (conMarco) entrarPanel(placa, 1060 + d);
    if (conCuartos) animar(raiz.querySelector('.cuartos'), [{ transform: 'translateY(100%)' }, { transform: 'none' }], { delay: 1100 + d });
  }
  // (op cliente, final) aceptar la invitacion abre el panel de siempre, con su orden de entrada (en final, despues de
  // que se abre el portal)
  function abrirPanel({ instantaneo = false } = {}) {
    raiz.classList.remove('en-espera');
    if (quieto() || instantaneo) return;
    const d = capa?.retardoAceptar ?? -620;
    lineasConMascara(titulo).forEach((l, i) => animar(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: 780 + d + i * 70, dur: 420 }));
    entradaPanel(d, false);
  }
  // (op=linea) mientras esta el aviso, lo de atras es la pantalla atenuada: se ve, pero no se usa
  function fondoInerte(si) {
    for (const n of [fr, antesFila, col, placa, raiz.querySelector('.cuartos')]) n?.toggleAttribute('inert', si);
  }
  // (op=linea) aceptar el aviso: se abre la costura y el panel entra con su orden (despues de que crece el portal);
  // el foco pasa al titulo de la parada
  function abrirPanelLinea({ instantaneo = false } = {}) {
    raiz.classList.remove('dc-espera');
    fondoInerte(false);
    if (t0Doc != null) raiz.dataset.dcAceptado = String(Math.round(document.timeline.currentTime - t0Doc));
    if (quieto() || instantaneo) {
      if (!elegido) titulo.focus({ preventScroll: true });
      registrar();
      return;
    }
    const d = capa.retardoAceptar;
    lineasConMascara(titulo).forEach((l, i) => animar(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: 780 + d + i * 70, dur: 420 }));
    entradaPanel(d, false, false);
    esperar(raiz, capa.focoAceptar).then(() => {
      if (!elegido && raiz.isConnected) titulo.focus({ preventScroll: true });
    });
    registrar();
  }

  // (op=linea) congelar(ms): main.js congela el ambiente y window.vitrina pone TODAS las animaciones en `ms` (como si
  // hubieran nacido al entrar). Las que nacieron despues (la apertura al aceptar, la eleccion) se corrigen a su propio
  // reloj en un microtask, que corre despues del bucle de window.vitrina.congelar. `data-dc-aceptado` dice cuando se
  // acepto (ms desde la entrada), para las tiras de la apertura.
  let t0Doc = null;
  const nacidas = new Map();
  function registrar() {
    if (t0Doc == null) return;
    const ahora = document.timeline.currentTime - t0Doc;
    for (const a of document.getAnimations()) {
      const t = a.effect?.target;
      if (nacidas.has(a) || !t || !raiz.contains(t)) continue;
      nacidas.set(a, a.startTime != null ? a.startTime - t0Doc : ahora - (a.currentTime ?? 0));
    }
  }
  function congelarLinea(ms) {
    capa?.congelar?.(ms);
    queueMicrotask(() => {
      for (const [a, t] of nacidas) {
        try {
          a.pause();
          a.currentTime = ms - t;
        } catch {
          /* animacion sin linea de tiempo valida */
        }
      }
    });
  }

  // ------------------------------------------------------------------ elegir -> la opcion se vuelve su resultado
  function tarjetaResultado(o, n, res) {
    const inm = res?.inmediato ?? { logs: [], cambios: [] };
    const logs = inm.logs ?? [];
    const conCuerpo = logs.find((l) => l.cuerpo) ?? logs[logs.length - 1];
    const kicker = logs.find((l) => l !== conCuerpo);
    const cambios = (inm.cambios ?? []).filter((c) => !OCULTOS.has(c.campo) && (c.campo === 'ranked' || Math.round(c.despues) !== Math.round(c.antes)));
    const elo = (inm.cambios ?? []).find((c) => c.campo === 'player.soloqElo');
    const numeros = el('div', { class: 'res-numeros' });
    for (const c of cambios) {
      if (c.campo === 'ranked') {
        numeros.append(el('div', { class: 'res-num res-rango', 'data-campo': 'ranked' }, [
          el('span', { class: 'rn-rotulo' }, [icono('ranked'), 'SoloQ']),
          el('span', { class: 'rn-fila' }, [
            el('span', { class: 'rn-antes', text: c.antes }),
            icono('flecha'),
            el('b', { class: 'rn-valor rn-texto' }, el('span', { class: 'rn-nuevo', text: c.despues })),
            elo ? el('span', { class: `rn-delta ${elo.delta >= 0 ? 'sube' : 'baja'}` }, [triangulos(Math.abs(elo.delta) > 500 ? 'alta' : 'media', elo.delta >= 0 ? '+' : '-'), `${conSigno(elo.delta)} LP`]) : null,
          ]),
        ]));
        continue;
      }
      const a = Math.round(c.antes);
      const b = Math.round(c.despues);
      numeros.append(el('div', { class: 'res-num', 'data-campo': campoCorto(c.campo) }, [
        el('span', { class: 'rn-rotulo' }, [icono(glifoDeCampo(c.campo)), etiquetaDe(c.campo, etiquetas)]),
        el('span', { class: 'rn-fila' }, [
          el('span', { class: 'rn-antes', text: num(a) }),
          icono('flecha'),
          el('b', { class: 'rn-valor', 'data-desde': String(a), 'data-hasta': String(b), text: num(b) }),
          el('span', { class: `rn-delta ${b > a ? 'sube' : 'baja'}` }, [triangulos(Math.abs(b - a) >= 8 ? 'alta' : Math.abs(b - a) >= 3 ? 'media' : 'baja', b > a ? '+' : '-'), conSigno(b - a)]),
        ]),
      ]));
    }
    const hasta = (res?.hastaLaProximaParada?.cambios ?? []).filter((c) => !OCULTOS.has(c.campo) && typeof c.antes === 'number' && Math.round(c.despues) !== Math.round(c.antes));
    const nivel = hasta.find((c) => c.campo === 'nivel');
    const otros = hasta.filter((c) => c.campo !== 'nivel').sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)).slice(0, 3);
    const despues = hasta.length
      ? el('div', { class: 'res-despues' }, [
          el('span', { class: 'res-kicker', text: 'Hasta la próxima parada' }),
          nivel ? el('span', { class: 'rd-nivel' }, ['nivel ', el('b', { text: num(nivel.antes) }), icono('flecha'), el('b', { class: Math.round(nivel.despues) >= Math.round(nivel.antes) ? 'sube' : 'baja', text: num(nivel.despues) })]) : null,
          ...otros.map((c) => el('span', { class: `rd-otro ${c.delta > 0 ? 'sube' : 'baja'}` }, [icono(glifoDeCampo(c.campo)), etiquetaDe(c.campo, etiquetas), ' ', conSigno(Math.round(c.despues) - Math.round(c.antes))])),
        ])
      : null;
    return el('div', { class: 'resultado', 'data-pieza': 'resultado', tabindex: '-1', 'aria-label': `Resultado: ${o.label}` }, [
      el('div', { class: 'res-cab' }, [el('span', { class: 'op-tecla', text: String(n) }), el('span', { class: 'op-label', text: o.label }), el('span', { class: 'res-tag', text: 'Elegiste' })]),
      kicker ? el('p', { class: 'res-plan', text: kicker.message }) : null,
      el('p', { class: 'res-texto', text: conCuerpo?.cuerpo ?? conCuerpo?.message ?? '' }),
      conCuerpo?.efectos ? el('p', { class: 'sr', text: `Efectos: ${conCuerpo.efectos}` }) : null,
      numeros,
      despues,
      el('button', { type: 'button', class: 'res-otra', onclick: () => window.vitrina?.repetir() }, ['Volver a decidir', el('kbd', { text: 'R' })]),
    ]);
  }

  function elegir(n) {
    if (elegido) return;
    const i = n - 1;
    const o = disponibles[i];
    const fila = filas[i];
    if (!o || !fila || fila.classList.contains('bloqueada')) return;
    if (invitacion?.abierta) invitacion.aceptar({ instantaneo: true });
    if (capa?.avisoAbierto) capa.aceptarYa();
    elegido = true;
    raiz.classList.add('eligiendo');
    amb.pulso('elegir');
    sonido?.clic();
    const res = resultados[o.id];
    const r0 = fila.getBoundingClientRect();
    const c0 = lista.getBoundingClientRect();
    // fantasma de las otras filas: se apagan en su lugar
    const fantasma = lista.cloneNode(true);
    fantasma.classList.add('fantasma');
    fantasma.setAttribute('aria-hidden', 'true');
    fantasma.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
    fantasma.querySelectorAll('.opcion')[i]?.classList.add('oculta');
    Object.assign(fantasma.style, { position: 'absolute', left: `${lista.offsetLeft}px`, top: `${lista.offsetTop}px`, width: `${c0.width}px`, margin: '0' });
    const tarjeta = tarjetaResultado(o, n, res);
    lista.replaceWith(tarjeta);
    col.append(fantasma);
    const r1 = tarjeta.getBoundingClientRect();
    const dy = r0.top - r1.top;
    const altoFila = r0.height;
    const salida = animar(fantasma, [{ opacity: 1 }, { opacity: 0, filter: 'blur(2px)' }], { dur: DUR.sale, fill: 'forwards', easing: 'linear' });
    if (salida) salida.finished.then(() => fantasma.remove(), () => {});
    else fantasma.remove();
    for (const x of [planteo, inspector]) {
      const a = salir(x, 0);
      if (a) a.finished.then(() => x.classList.add('plegado'), () => {});
      else x.classList.add('plegado');
    }
    rotulo.querySelector('span').textContent = 'Lo que pasó';
    animar(tarjeta, [
      { transform: `translateY(${dy}px)`, clipPath: `inset(0 0 calc(100% - ${altoFila}px) 0)` },
      { transform: 'none', clipPath: 'inset(0 0 0 0)' },
    ], { dur: DUR.larga, easing: EXPO });
    animar(tarjeta.querySelector('.res-cab'), [{ backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0' }], { dur: 700, easing: EXPO });
    const cuerpo = [...tarjeta.children].filter((x) => !x.classList.contains('res-cab'));
    cuerpo.forEach((x, k) => entrar(x, 220 + k * 70, 12));
    tarjeta.querySelectorAll('.rn-valor[data-desde]').forEach((v) => odometro(v, Number(v.dataset.desde), Number(v.dataset.hasta), { delay: 420, dur: 1100 }));
    tarjeta.querySelectorAll('.rn-delta, .rd-otro, .rd-nivel').forEach((d, k) => animar(d, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { delay: 640 + k * 60, dur: 320 }));
    const rango = tarjeta.querySelector('.rn-texto');
    if (rango) {
      animar(rango.querySelector('.rn-nuevo'), [{ opacity: 0, transform: 'translateY(100%)' }, { opacity: 1, transform: 'none' }], { delay: 560, dur: 460 });
      const frr = fr.querySelector('.fr-rango');
      const nuevo = (res?.inmediato?.cambios ?? []).find((c) => c.campo === 'ranked');
      if (frr && nuevo) {
        frr.textContent = '';
        const viejo = el('span', { class: 'fr-viejo', 'aria-hidden': 'true', text: nuevo.antes });
        const nuevoN = el('span', { text: nuevo.despues });
        frr.append(viejo, nuevoN);
        if (!animar(viejo, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-60%)' }], { delay: 600, dur: 220, fill: 'both' })) viejo.remove();
        animar(nuevoN, [{ opacity: 0, transform: 'translateY(60%)' }, { opacity: 1, transform: 'none' }], { delay: 700, dur: 420 });
      }
    }
    rodarContexto(raiz, res?.inmediato?.cambios ?? [], 520);
    capa?.elegir(i, res);
    const n2 = (res?.inmediato?.cambios ?? []).some((c) => c.delta < 0) ? 'golpe' : 'logro';
    esperar(raiz, 420).then(() => amb.pulso(n2 === 'golpe' ? 'elegir' : 'logro'));
    if (quieto()) tarjeta.focus({ preventScroll: true });
    else esperar(raiz, 500).then(() => tarjeta.focus({ preventScroll: true }));
    registrar();
  }

  function tecla(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    // (op=linea) con el aviso abierto solo vale Enter, y la escucha el aviso (js/ceremonia.js)
    if (capa?.avisoAbierto) return;
    // (op cliente) con la invitacion abierta: Enter o Espacio aceptan; 1-9 aceptan y eligen
    if (invitacion?.abierta && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      invitacion.aceptar();
      return;
    }
    if (invitacion?.abierta && !/^[1-9]$/.test(e.key)) return;
    if (/^[1-9]$/.test(e.key)) {
      const n = Number(e.key);
      if (n <= disponibles.length) {
        e.preventDefault();
        elegir(n);
      }
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !elegido) {
      e.preventDefault();
      apuntar(apuntada + (e.key === 'ArrowDown' ? 1 : -1), true, true);
    } else if ((e.key === 'r' || e.key === 'R') && elegido) {
      window.vitrina?.repetir();
    } else if (e.key === 'Escape') {
      raiz.classList.remove('ctx-abierto');
    }
  }

  return {
    nodo: raiz,
    entrar: opDec === 'linea'
      ? () => {
          t0Doc = document.timeline.currentTime;
          entrada();
          registrar();
        }
      : entrada,
    elegir,
    tecla,
    // (op escena, final) con geografia, el fondo es la escena: sin campeon. (op=linea, PLANUI §4.10) las costuras copas y
    // liga tampoco llevan campeon: ni detras del aviso ni en la costura
    arte: ((opDec === 'escena' || opDec === 'final') && lec.destino) || (opDec === 'linea' && lec.destino && varDec !== 'campeones') ? null : main,
    animo: 'normal',
    encuadre: 'derecha',
    listo: opDec ? () => Promise.all([cargados(raiz), capa?.listo?.()]) : undefined,
    destruir: opDec ? () => capa?.destruir() : undefined,
    congelar: opDec === 'linea' ? congelarLinea : undefined,
    pausar: opDec === 'linea' ? () => capa?.pausar?.() : undefined,
    reanudar: opDec === 'linea' ? () => capa?.reanudar?.() : undefined,
  };
}
