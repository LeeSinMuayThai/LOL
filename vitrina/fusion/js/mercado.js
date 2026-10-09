// El Mercado.
// `mercado`: las ofertas como franjas alineadas (una matriz chica): el club (su color SOLO en el chip) y su liga, el
// sueldo en mono con tu valor de referente, los anos como pips, la jerarquia proyectada como barra, y el plantel al que
// llegas como icono + nombre corto (sale de plantelEnLiga, no de la prosa). La prosa, al inspector.
// Elegir -> "la prueba de ingreso en <club>" (es lo que dice el motor para TODAS). Con LOUD, lo que paso de verdad:
// encadena a la firma. Para las otras no se inventa como salio la prueba.
// `firma`: el takeover del primer contrato (<= 2,4 s, salteable, Repetir lo vuelve a pasar): la luz de la pieza se
// abre en la de la sala de practica, LOUD grande, CBLOL 2029, 1 ano, USD 40.000 en mono, y tu handle trazado como
// firma de luz.
import { el, entrar, animar, esperar, lineasConMascara, primeraOracion, num, reducido, inst, celular, odometro, plegar, EXPO, DUR } from './util.js';
import { icono } from './iconos.js';
import { franja, trayectoria, cuartos } from './marco.js';

const PLANTEL = {
  abajo: { ico: 'margen', corto: 'Margen', largo: 'plantel flojo' },
  medio: { ico: 'parejo', corto: 'Parejo', largo: 'plantel parejo' },
  primero: { ico: 'pelea', corto: 'A pelear', largo: 'el más fuerte' },
};
const LIGA_CORTA = { CD: 'Circuito Desafiante' };
const TOMA = 2400;
const quieto = () => inst() || reducido();
// El color de cada club vive en tokens.css (--org-*): uno propio para los reales, una paleta para los inventados.
const ORG = { LOUD: 'loud', FURIA: 'furia' };
function tonoDeOrg(nombre) {
  if (ORG[nombre]) return ORG[nombre];
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return `p${(h % 4) + 1}`;
}
const usd = (n) => `USD ${num(n)}`;

export function crearMercado(ctx) {
  return ctx.muestra === 'firma' ? crearFirma(ctx) : crearOfertas(ctx);
}

// ================================================================================================= las ofertas
function crearOfertas({ datos, muestra, amb, sonido, peor }) {
  const m = datos[muestra];
  const pc = peor ? datos.peorCaso : null;
  const ofertas = m.decision.opciones;
  const resultados = Object.fromEntries((m.resultados ?? []).map((r) => [r.opcionId, r]));
  const vos = m.vosEnElMercado ?? {};
  const mundo = m.mercadoDelMundo ?? {};
  const maxSueldo = Math.max(1, ...ofertas.map((o) => o.salarioAnualUSD ?? o.negociacion?.salarioBase ?? 0));
  const botElige = (m.resultados ?? []).find((r) => r.eligioElBot)?.opcionId;

  const raiz = el('section', { class: 'parada parada-decision mercado', 'data-pieza': 'decision', 'data-forma': 'mercado', 'data-muestra': muestra });
  const fr = franja(m.franja, { peor: pc ? { handle: pc.handle, org: pc.org?.nombre } : null });
  const [primera, resto] = primeraOracion(m.decision.descripcion);
  const btnMas = resto ? el('button', { type: 'button', class: 'btn-mas', 'aria-expanded': 'false', text: 'más' }) : null;
  const planteo = el('p', { class: 'planteo' }, [el('span', { class: 'planteo-1', text: primera }), resto ? el('span', { class: 'planteo-resto', text: ' ' + resto }) : null, btnMas]);
  btnMas?.addEventListener('click', () => {
    const a = !planteo.classList.contains('abierto');
    planteo.classList.toggle('abierto', a);
    btnMas.setAttribute('aria-expanded', String(a));
    btnMas.textContent = a ? 'menos' : 'más';
  });
  const antes = m.antes?.log ? el('p', { class: 'antes' }, [icono('mercado'), el('span', { class: 'antes-texto' }, [el('b', { text: m.franja?.club?.fase ?? 'Agente libre' }), el('span', { class: 'antes-efectos', text: primeraOracion(m.antes.mensaje)[0] })])]) : null;
  const rotulo = el('p', { class: 'rotulo-cat' }, [el('i', { class: 'punto-luz' }), el('span', { text: 'Mercado' }), el('span', { class: 'bisagra', text: `${m.franja?.cuando?.ventana?.texto ?? 'Pretemporada'} ${m.anio}` }), el('span', { class: 'bisagra', text: `${ofertas.length} ofertas` })]);
  const titulo = el('h1', { class: 'titulo-parada', 'data-foco': '', tabindex: '-1', text: m.decision.titulo });

  // ---- la tabla de ofertas
  const tabla = el('div', { class: 'mk-tabla', role: 'group', 'aria-label': 'Ofertas' });
  tabla.append(el('div', { class: 'mk-cab', 'aria-hidden': 'true' }, [
    el('span', { class: 'mk-c-club', text: 'Club · liga' }),
    el('span', {}, [icono('hype'), 'Sueldo / año', el('b', { class: 'mx-ref', text: `tu valor ${num(vos.valorUSD ?? 0)}` })]),
    el('span', {}, [icono('temporada'), 'Años']),
    el('span', {}, [icono('jerarquia'), 'Jerarquía', el('b', { class: 'mx-ref', text: 'proyectada, de 100' })]),
    el('span', {}, [icono('teamfight'), 'Plantel']),
  ]));
  const filas = ofertas.map((o, i) => {
    const sueldo = o.salarioAnualUSD ?? o.negociacion?.salarioBase ?? 0;
    const pj = o.proyeccionJerarquia ?? { hasta: Math.round(o.datos?.jerarquiaProyectada ?? 0), etiqueta: '' };
    const pl = PLANTEL[o.plantelEnLiga?.banda] ?? PLANTEL.medio;
    const liga = LIGA_CORTA[o.liga] ?? o.liga;
    const desc = el('span', { class: 'sr', id: `desc-${muestra}-${i}` }, [o.descripcion, ' ', o.motivoDemanda ?? '', '. ', o.riesgo ?? '', ' ', o.arraigoInicial?.etiqueta ?? '']);
    const b = el('button', { type: 'button', class: 'opcion mk-fila', 'data-atajo': String(i + 1), 'data-id': o.id, 'aria-describedby': desc.id }, [
      el('span', { class: 'mk-club' }, [
        el('span', { class: 'op-tecla', text: String(i + 1) }),
        el('span', { class: 'mk-club-t' }, [
          el('span', { class: 'mk-chip', 'data-tono': tonoDeOrg(o.org), text: o.org }),
          el('span', { class: 'mk-liga' }, [liga, o.tier ? ` · tier ${o.tier}` : '', o.tag === 'bombazo' ? el('span', { class: 'tag tag-rara', text: ' bombazo' }) : null]),
        ]),
      ]),
      el('span', { class: 'mk-sueldo' }, [el('b', { text: num(sueldo) }), el('span', { class: 'mx-barra' }, el('i', { class: 'sube', style: { width: `${(sueldo / maxSueldo) * 100}%` } }))]),
      el('span', { class: 'mk-anios', 'aria-label': `${o.anios} ${o.anios === 1 ? 'año' : 'años'}` }, [...Array.from({ length: 3 }, (_, k) => el('i', { class: k < o.anios ? 'on' : '' })), el('b', { text: String(o.anios) })]),
      el('span', { class: 'mk-jer' }, [el('span', { class: 'mx-barra' }, el('i', { class: 'sube', style: { width: `${Math.min(100, pj.hasta)}%` } })), el('b', { text: String(pj.hasta) }), el('span', { class: 'mk-jer-et', text: pj.etiqueta })]),
      el('span', { class: 'mk-plantel', 'data-banda': o.plantelEnLiga?.banda ?? 'medio', title: o.riesgo }, [icono(pl.ico), el('b', { text: pl.corto }), o.plantelEnLiga ? el('span', { text: `${o.plantelEnLiga.puesto}.º de ${o.plantelEnLiga.de}` }) : null]),
      el('button', { type: 'button', class: 'op-mas', 'aria-label': `Más sobre ${o.label}`, text: 'más' }),
      desc,
    ]);
    tabla.append(b);
    return b;
  });

  // ---- inspector: la prosa de la oferta apuntada
  const inspector = el('div', { class: 'inspector', 'aria-live': 'polite' });
  let apuntada = 0;
  function pintar(i) {
    const o = ofertas[i];
    inspector.textContent = '';
    inspector.append(
      el('div', { class: 'mk-lee' }, [
        el('p', { class: 'insp-kicker' }, [el('span', { class: 'insp-n', text: String(i + 1) }), el('span', { class: 'mk-chip', 'data-tono': tonoDeOrg(o.org), text: o.org }), el('span', { class: 'mk-lee-liga', text: LIGA_CORTA[o.liga] ?? o.liga })]),
        el('button', { type: 'button', class: 'boton boton-pri mk-firmar', onclick: () => elegir(i + 1) }, [icono('firma'), 'Firmar', el('kbd', { text: 'Enter' })]),
      ]),
      el('p', { class: 'insp-texto', text: `${o.descripcion} ${o.motivoDemanda ?? ''}.` }),
      el('ul', { class: 'insp-previa' }, [
        o.riesgo ? el('li', {}, [icono((PLANTEL[o.plantelEnLiga?.banda] ?? PLANTEL.medio).ico), o.riesgo]) : null,
        o.arraigoInicial ? el('li', {}, [icono('arraigo'), o.arraigoInicial.etiqueta]) : null,
        o.negociacionInfo?.riesgoTexto ? el('li', { class: 'insp-riesgo' }, [icono('incierto'), o.negociacionInfo.riesgoTexto]) : null,
      ]),
    );
  }
  function apuntar(i, mover = false) {
    apuntada = Math.max(0, Math.min(filas.length - 1, i));
    filas.forEach((f, k) => f.classList.toggle('apuntada', k === apuntada));
    pintar(apuntada);
    if (mover) filas[apuntada].focus({ preventScroll: true });
    inspector.classList.toggle('expandido', mover);
  }
  filas.forEach((f, i) => {
    f.addEventListener('pointerenter', () => {
      if (celular()) return;
      if (i !== apuntada) amb.pulso('apuntar');
      apuntar(i);
    });
    f.addEventListener('focus', () => apuntar(i));
    f.addEventListener('click', (e) => {
      if (e.target.closest('.op-mas')) {
        e.stopPropagation();
        apuntar(i, true);
        return;
      }
      elegir(i + 1);
    });
  });

  // ---- a la derecha: vos en el mercado y el mundo que se mueve
  const placa = el('aside', { class: 'contexto mk-mundo', id: 'contexto', 'aria-label': 'El mercado' }, [
    el('p', { class: 'ctx-kicker' }, [el('span', { text: 'Vos, en el mercado' }), el('span', { text: `${m.edad} · ${m.anio}` })]),
    el('div', { class: 'ctx-cabeza' }, [
      el('div', { class: 'ctx-grande' }, [el('span', { class: 'ctx-rotulo', text: 'Tu valor' }), el('b', { class: 'ctx-numero mk-valor', text: num(vos.valorUSD ?? 0) })]),
      el('div', { class: 'ctx-lado' }, [el('span', { class: 'ctx-banda', text: vos.contrato ? 'Con contrato' : 'Sin contrato' }), el('span', { class: 'ctx-sub', text: `USD · nivel ${m.franja?.numero?.valor ?? ''}` })]),
    ]),
    el('p', { class: 'ctx-rotulo mk-mundo-k' }, [icono('mundo'), 'Mientras tanto']),
    el('ol', { class: 'mk-traspasos' }, (mundo.traspasosMundo ?? []).slice(0, 4).map((t) => el('li', {}, [el('b', { text: t.handle }), el('span', { text: `${t.org} · ${t.liga}` })]))),
    (mundo.asientosAbiertos ?? []).length ? el('p', { class: 'ctx-sub mk-asientos', text: `${mundo.asientosAbiertos.length} asientos más abiertos en ${mundo.asientosAbiertos[0].liga === 'CD' ? 'el Circuito Desafiante' : mundo.asientosAbiertos[0].liga}` }) : null,
  ]);
  // la franja ya dice "agente libre": el beat previo queda en el DOM, no en la vista
  const col = el('div', { class: 'parada-col' }, [
    antes ? el('p', { class: 'sr', text: m.antes.mensaje }) : null,
    el('header', { class: 'panel-cab' }, [rotulo, titulo, planteo]),
    el('div', { class: 'panel-cuerpo' }, [tabla, inspector]),
  ]);
  raiz.append(fr, col, placa, cuartos('mundo', null, trayectoria(datos.final?.tarjeta?.historia ?? [], m.anio, m.edad)));
  apuntar(0);

  function entrada() {
    lineasConMascara(titulo).forEach((l, i) => animar(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: 280 + i * 70, dur: 420 }));
    entrar(fr, 0, -10);
    esperar(raiz, 700).then(() => amb.aquietar(true));
    if (quieto()) amb.aquietar(true);
    animar(col, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { delay: 80, dur: 320 });
    entrar(rotulo, 140, 10);
    entrar(planteo, 420, 10);
    entrar(tabla.querySelector('.mk-cab'), 460, 8);
    filas.forEach((f, i) => {
      entrar(f, 500 + i * 50, 14);
      f.querySelectorAll('.mx-barra i').forEach((b) => animar(b, [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: 600 + i * 50, dur: 560 }));
      animar(f.querySelector('.mk-chip'), [{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'none' }], { delay: 540 + i * 50, dur: 360 });
    });
    entrar(inspector, 820, 8);
    entrar(placa, 700, 0);
    placa.querySelectorAll('.ctx-cabeza, .mk-mundo-k, .mk-traspasos li, .mk-asientos').forEach((x, i) => entrar(x, 760 + i * 40, 8));
  }

  // ---- elegir: la fila crece y dice a donde lleva (la prueba de ingreso)
  let elegido = false;
  function elegir(n) {
    if (elegido) return;
    const o = ofertas[n - 1];
    if (!o) return;
    elegido = true;
    amb.pulso('elegir');
    sonido?.clic();
    const res = resultados[o.id];
    const enc = res?.inmediato?.encadenaOtraParada;
    const esLaReal = o.id === botElige && Boolean(datos.firma);
    const cuerpo = esLaReal
      ? [
          el('p', { class: 'res-texto', text: `En esta carrera, esta fue la elección. La prueba salió así:` }),
          el('button', { type: 'button', class: 'mk-seguir', onclick: () => window.vitrina?.muestra('firma') }, [icono('firma'), 'La firma', el('kbd', { text: 'Espacio' })]),
        ]
      : [
          el('p', { class: 'res-texto', text: `Hasta acá llega esta muestra: el motor no jugó esta prueba, y no se inventa cómo salía. En esta carrera, la elección fue ${ofertas.find((x) => x.id === botElige)?.org ?? 'otra'}.` }),
          botElige && datos.firma ? el('button', { type: 'button', class: 'mk-seguir', onclick: () => window.vitrina?.muestra('firma') }, [icono('firma'), `Ver lo que pasó en ${ofertas.find((x) => x.id === botElige)?.org}`]) : null,
        ];
    const tarjeta = el('div', { class: 'resultado mk-res', 'data-pieza': 'resultado', tabindex: '-1', 'aria-label': `Resultado: ${o.label}` }, [
      el('div', { class: 'res-cab' }, [el('span', { class: 'op-tecla', text: String(n) }), el('span', { class: 'mk-chip', 'data-tono': tonoDeOrg(o.org), text: o.org }), el('span', { class: 'res-tag', text: 'Elegiste' })]),
      el('p', { class: 'mk-sigue' }, [icono('flecha'), el('span', { text: enc?.titulo ?? 'La prueba de ingreso' }), el('b', { text: `en ${o.org}` })]),
      el('p', { class: 'mk-res-datos', text: `${LIGA_CORTA[o.liga] ?? o.liga} · ${usd(o.salarioAnualUSD ?? 0)} / año · ${o.anios} ${o.anios === 1 ? 'año' : 'años'}` }),
      ...cuerpo,
      el('button', { type: 'button', class: 'res-otra', onclick: () => window.vitrina?.repetir() }, ['Volver a decidir', el('kbd', { text: 'R' })]),
    ]);
    const r0 = filas[n - 1].getBoundingClientRect();
    plegar(col, { fantasma: [planteo, tabla, inspector], plegar: [planteo, inspector], oculta: filas[n - 1] });
    tabla.replaceWith(tarjeta);
    const r1 = tarjeta.getBoundingClientRect();
    animar(tarjeta, [{ transform: `translateY(${r0.top - r1.top}px)`, clipPath: `inset(0 0 calc(100% - ${r0.height}px) 0)` }, { transform: 'none', clipPath: 'inset(0 0 0 0)' }], { dur: DUR.larga });
    [...tarjeta.children].slice(1).forEach((x, k) => entrar(x, 220 + k * 80, 10));
    animar(tarjeta.querySelector('.mk-sigue .ico'), [{ transform: 'translateX(-12px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { delay: 260, dur: 500 });
    esperar(raiz, 420).then(() => amb.pulso('logro'));
    if (quieto()) tarjeta.focus({ preventScroll: true });
    else esperar(raiz, 500).then(() => tarjeta.focus({ preventScroll: true }));
    // con la oferta que de verdad se eligio, encadena al momento de la firma
    if (esLaReal && !quieto()) esperar(raiz, 1900).then(() => raiz.isConnected && window.vitrina?.muestra('firma'));
  }

  function tecla(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^[1-9]$/.test(e.key) && Number(e.key) <= ofertas.length) {
      e.preventDefault();
      elegir(Number(e.key));
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !elegido) {
      e.preventDefault();
      apuntar(apuntada + (e.key === 'ArrowDown' ? 1 : -1), true);
    } else if (e.key === 'Enter' && !elegido && !(e.target instanceof HTMLButtonElement)) {
      // Enter firma la oferta que estas leyendo (como en el cliente: el boton primario del panel de lectura)
      e.preventDefault();
      elegir(apuntada + 1);
    } else if (e.code === 'Space' && elegido) {
      e.preventDefault();
      window.vitrina?.muestra('firma');
    } else if ((e.key === 'r' || e.key === 'R') && elegido) window.vitrina?.repetir();
  }

  return { nodo: raiz, entrar: entrada, elegir, tecla, arte: datos.inicio?.jugador?.mains?.[0]?.ddragon ?? 'Yone', animo: 'normal', encuadre: 'derecha', velo: 0.6 };
}

// ================================================================================================= la firma
function crearFirma({ datos, muestra, amb, sonido, peor }) {
  const f = datos[muestra];
  const pc = peor ? datos.peorCaso : null;
  const handle = pc?.handle ?? f.franja?.quien?.handle ?? datos.inicio?.jugador?.handle;
  const org = pc?.org?.nombre ?? f.org;
  const c = f.contrato ?? {};
  const raiz = el('section', { class: 'firma takeover', 'data-pieza': 'cumbre', 'data-fase': 'firma', 'aria-labelledby': 'fm-org' });
  const barrido = el('div', { class: 'fm-barrido', 'aria-hidden': 'true' });
  const kicker = el('p', { class: 'fm-k' }, [el('i', { class: 'punto-luz' }), el('span', { text: 'Primer contrato' }), el('span', { text: `tier ${c.tier ?? f.tier}` }), el('span', { text: `${f.edad} años` })]);
  const nombre = el('h1', { class: 'fm-org', id: 'fm-org', 'data-foco': '', tabindex: '-1', 'aria-label': `Firmás con ${org}` }, org.split('').map((l) => el('span', { class: 'fm-letra', 'aria-hidden': 'true', text: l })));
  const datosC = el('dl', { class: 'fm-datos' }, [
    ['Liga', `${f.liga} ${f.anio}`],
    ['Contrato', `${c.anios ?? f.anios} ${(c.anios ?? f.anios) === 1 ? 'año' : 'años'}`],
    ['Tipo', c.tipo === 'transferencia' ? 'Transferencia' : c.tipo ?? f.tipoDeContrato],
  ].map(([k, v]) => el('div', {}, [el('dt', { text: k }), el('dd', { text: v })])));
  const sueldo = el('p', { class: 'fm-sueldo' }, [el('span', { class: 'fm-usd', text: 'USD' }), el('b', { class: 'fm-monto', text: num(c.salarioAnualUSD ?? f.sueldoAnualUSD) }), el('span', { class: 'fm-anio', text: '/ año' })]);
  // tu handle trazado como firma de luz (SVG: el trazo se dibuja, despues se llena de luz)
  const NS = 'http://www.w3.org/2000/svg';
  const firma = document.createElementNS(NS, 'svg');
  firma.setAttribute('class', 'fm-firma');
  firma.setAttribute('viewBox', '0 0 640 150');
  firma.setAttribute('role', 'img');
  firma.setAttribute('aria-label', `Firma: ${handle}`);
  const texto = document.createElementNS(NS, 'text');
  texto.setAttribute('x', '8');
  texto.setAttribute('y', '104');
  texto.setAttribute('class', 'fm-trazo');
  texto.textContent = handle;
  const rubrica = document.createElementNS(NS, 'path');
  rubrica.setAttribute('class', 'fm-rubrica');
  rubrica.setAttribute('d', 'M14 128 C 140 112, 300 140, 420 120 S 600 96, 628 112');
  firma.append(texto, rubrica);
  const linea = el('p', { class: 'fm-log', text: f.log?.message ?? '' });
  const otros = el('ul', { class: 'fm-otros', 'aria-label': 'El resto del mercado' }, (f.logsDelMercado ?? []).slice(2).map((l) => el('li', { text: l.message })));
  const seguir = el('button', { type: 'button', class: 'tk-seguir fm-seguir', onclick: (e) => (e.stopPropagation(), window.vitrina?.repetir()) }, ['Otra vez', el('kbd', { text: 'R' })]);
  const bloque = el('div', { class: 'fm-bloque' }, [kicker, nombre, sueldo, datosC, firma, linea, otros, seguir]);
  raiz.append(barrido, bloque);

  let asentado = false;
  function saltear() {
    for (const a of raiz.getAnimations({ subtree: true })) {
      try {
        a.finish();
      } catch {
        /* sin fin */
      }
    }
    amb.ambiente({ era: 'academia', animo: 'normal', instantaneo: true });
    asentado = true;
  }
  raiz.addEventListener('click', () => (asentado ? null : saltear()));

  function entrada() {
    // la pieza (el monitor) se abre en la sala de practica: los tubos de academia se encienden por primera vez
    amb.ambiente({ era: 'pieza', animo: 'normal', instantaneo: true });
    amb.ambiente({ era: 'academia', retardo: quieto() ? 0 : 260 });
    amb.pulso('logro', 700);
    sonido?.barrido();
    if (quieto()) {
      asentado = true;
      return;
    }
    esperar(raiz, 500).then(() => sonido?.acorde());
    animar(barrido, [{ transform: 'translateX(-110%) skewX(-16deg)', opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: 'translateX(140%) skewX(-16deg)', opacity: 0 }], { delay: 300, dur: 1000, easing: 'cubic-bezier(.5,0,.2,1)' });
    entrar(kicker, 120, 10);
    nombre.querySelectorAll('.fm-letra').forEach((l, i) => animar(l, [{ opacity: 0, transform: 'translateY(30%)', filter: 'blur(12px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { delay: 260 + i * 70, dur: 560 }));
    animar(sueldo, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { delay: 700, dur: 380 });
    odometro(sueldo.querySelector('.fm-monto'), 0, c.salarioAnualUSD ?? f.sueldoAnualUSD, { delay: 760, dur: 1000 });
    datosC.querySelectorAll('div').forEach((d, i) => entrar(d, 900 + i * 70, 8));
    const largo = 2200;
    texto.style.strokeDasharray = `${largo}`;
    animar(texto, [{ strokeDashoffset: largo, fillOpacity: 0 }, { strokeDashoffset: 0, fillOpacity: 0, offset: 0.78 }, { strokeDashoffset: 0, fillOpacity: 1 }], { delay: 1080, dur: 1100, easing: 'cubic-bezier(.45,0,.2,1)' });
    animar(rubrica, [{ strokeDashoffset: 700 }, { strokeDashoffset: 0 }], { delay: 1700, dur: 600, easing: EXPO });
    entrar(linea, 1900, 8);
    otros.querySelectorAll('li').forEach((li, i) => entrar(li, 2000 + i * 50, 6));
    entrar(seguir, 2200, 6);
    esperar(raiz, TOMA).then(() => (asentado = true));
  }

  return {
    nodo: raiz,
    entrar: entrada,
    // Repetir vuelve a pasar el momento en el lugar (sincrono: la tira de capturas lo congela desde el cuadro 0)
    repetir() {
      for (const a of raiz.getAnimations({ subtree: true })) a.cancel();
      asentado = false;
      entrada();
    },
    tecla(e) {
      if ((e.code === 'Space' || e.key === 'Enter') && !asentado) {
        e.preventDefault();
        saltear();
      } else if (e.key === 'r' || e.key === 'R') window.vitrina?.repetir();
    },
    arte: datos.inicio?.jugador?.mains?.[0]?.ddragon ?? 'Yone',
    animo: 'normal',
    encuadre: 'firma',
    velo: 0.5,
  };
}
