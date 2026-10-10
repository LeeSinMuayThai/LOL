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
import { icono, glifoRol } from './iconos.js';
import { franja, trayectoria, cuartos } from './marco.js';
import { pintarLogo, tonoOrg } from './logos.js';
import { crearAzar } from '../../comun/azar.js';
import { cargarImagen, urlCentrada } from '../../comun/arte.js';

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

// `op=mesa|anuncio|orgs` (PLANUI §4.7): la opcion de diseño. Sin `op` (o con uno ajeno), el mercado y la firma de hoy.
export function crearMercado(ctx) {
  const op = OPCIONES.includes(ctx.op) ? ctx.op : null;
  if (ctx.muestra === 'firma') return op ? crearFirmaOp(ctx, op) : crearFirma(ctx);
  return op ? crearOfertasOp(ctx, op) : crearOfertas(ctx);
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

// ================================================================================================= las opciones (§4.7)
// El usuario: "le falta representar lo que esta pasando, falta ese peso de decision importante o formal, y los logos
// actuales de los equipos". Las tres llevan logos (js/logos.js) y dejan la tabla de ofertas:
// - `mesa`: la oferta que lees es UN CONTRATO (logo grande, liga, clausulas en mono, numeros grandes, la linea de firma).
//   Enter firma: el mundo se aquieta, la firma se traza y cae el sello. Despues, la prueba de ingreso (o LOUD -> la firma).
// - `anuncio`: cada oferta es la placa de fichaje que publicaria la org (con su logo, sus colores, tu main y tu rol).
//   Elegir la publica: entra al mundo y llegan los likes y el chat (decorativo, PRNG; no son numeros del motor).
// - `orgs`: los logos flotan en la luz alrededor tuyo (tamaño = sueldo, cerca = jerarquia proyectada); apuntar uno lleva
//   el mundo a sus colores (el aura de las orgs); elegir lo acerca y entra al contrato.
// Todo lo de elegir se programa de una vez (animaciones con retardo): congelar(t) fotografia cualquier instante.
const OPCIONES = ['mesa', 'anuncio', 'orgs'];
const T_FIRMA = { silencio: 380, boton: 160, trazo: 420, trazoDur: 1050, rubrica: 1300, rubricaDur: 420, sello: 1650, selloDur: 320, resultado: 2050, encadena: 3600 };
const T_ANUNCIO = { placa: 520, likes: 640, likesDur: 1300, chat: 900, chatPaso: 240 };
const T_ORGS = { viaje: 1150, contrato: 620, firma: 900, aura: 120, vuelta: 600 };
const LARGO_TRAZO = 2200;
const LARGO_RUBRICA = 700;
const SALE_MK = 'cubic-bezier(0.7, 0, 0.84, 0)';
// "te llaman": el cielo de logos. Tamaño por sueldo (px); el centro es tu campeon (% del area); `jitter` en % del area.
const CIELO = { tamMin: 52, tamMax: 148, cx: 47.6, jitter: 1.5, flotaMin: 4200, flotaMax: 6800, flota: 5, respiro: 10 };
// los asientos alrededor tuyo, por jerarquia proyectada de mayor a menor: los dos de adentro (al lado de tu campeon), los
// dos de arriba y los dos de afuera. dx: distancia al centro (% del ancho); y: altura (% del area).
const ASIENTOS = [{ dx: 17, y: 63 }, { dx: -17, y: 63 }, { dx: -26, y: 27 }, { dx: 26, y: 27 }, { dx: 38, y: 60 }, { dx: -38, y: 60 }];
// el anuncio: el estilo de cada org (las inventadas, por hash) y los likes decorativos por tier
const ESTILO_ANUNCIO = { loud: 'welcome', furia: 'nosso' };
const LIKES = { 1: [14000, 38000], 2: [600, 2600] };
const COMENTARIOS_N = { 1: [180, 900], 2: [14, 70] };
const CHAT_LINEAS = 4;
const USUARIOS = ['lobo_mid', 'baronfeed', 'tiltada', 'wardounada', 'gankdojg', 'flash_d', 'kitedobr', 'pinkward'];
const COMENTARIOS = [
  (c) => `bem-vindo, ${c.handle}!`,
  (c) => `${c.rol} diff vem aí`,
  (c) => `que contratação, ${c.org}`,
  () => 'confio demais',
  (c) => (c.main ? `vi jogar de ${c.main} na solo, assistam` : null),
  () => 'quem?',
  (c) => `${c.org} acertou`,
  () => 'agora vai',
];
const fmt1 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
const sueldoDe = (o) => o.salarioAnualUSD ?? o.negociacion?.salarioBase ?? 0;
const jerDe = (o) => o.proyeccionJerarquia ?? (o.datos?.jerarquiaProyectada != null ? { hasta: Math.round(o.datos.jerarquiaProyectada), etiqueta: '' } : null);
const aniosTxt = (n) => `${n} ${n === 1 ? 'año' : 'años'}`;
const periodo = (anio, n) => (n > 1 ? `${anio}–${anio + n - 1}` : String(anio));
const ligaLarga = (l) => LIGA_CORTA[l] ?? l;
// en la tabla con logos el nombre largo no entra: el logo de la liga ya la nombra (el completo, en el title)
const LIGA_TABLA = { CD: 'Desafiante' };

// Una oferta del motor, en los campos que usan las tres opciones (y la firma, que trae su propio contrato).
function normalizar(o, extra = {}) {
  return {
    id: o.id ?? o.org,
    org: o.org,
    liga: o.liga,
    tier: o.tier,
    sueldo: sueldoDe(o),
    anios: o.anios ?? 1,
    jer: jerDe(o),
    plantel: o.plantelEnLiga ?? null,
    tipo: extra.tipo ?? o.datos?.tipo ?? null,
    clausula: Boolean(extra.clausula ?? o.datos?.clausula ?? o.negociacion?.clausula),
    riesgo: o.riesgo ?? null,
    riesgoTexto: o.negociacionInfo?.riesgoTexto ?? null,
    tag: o.tag,
    prosa: [o.descripcion, o.motivoDemanda ? `${o.motivoDemanda}.` : '', o.arraigoInicial?.etiqueta, o.proyeccionPicks].filter(Boolean).join(' '),
  };
}

// La firma trazada (como la del takeover): el handle en un <text> con trazo y la rubrica.
function svgFirma(handle, clase = 'mk-firma') {
  const NS = 'http://www.w3.org/2000/svg';
  const nodo = document.createElementNS(NS, 'svg');
  nodo.setAttribute('class', clase);
  nodo.setAttribute('viewBox', '0 0 640 150');
  nodo.setAttribute('role', 'img');
  nodo.setAttribute('aria-label', `Firma: ${handle}`);
  const texto = document.createElementNS(NS, 'text');
  texto.setAttribute('x', '8');
  texto.setAttribute('y', '104');
  texto.setAttribute('class', clase === 'mk-firma' ? 'mk-trazo' : 'fm-trazo');
  texto.textContent = handle;
  texto.style.strokeDasharray = String(LARGO_TRAZO);
  const rubrica = document.createElementNS(NS, 'path');
  rubrica.setAttribute('class', clase === 'mk-firma' ? 'mk-rubrica' : 'fm-rubrica');
  rubrica.setAttribute('d', 'M14 128 C 140 112, 300 140, 420 120 S 600 96, 628 112');
  nodo.append(texto, rubrica);
  return { nodo, texto, rubrica };
}

// ---------- el contrato (mesa; "te llaman" entra a el; la firma de la mesa lo trae firmado) ----------
function crearContrato(x, yo, { n, total, valor, maxSueldo } = {}) {
  const pl = PLANTEL[x.plantel?.banda] ?? null;
  const clausula = (k, nombre, grande, unidad, ref, medida) =>
    el('li', { class: 'mk-cl' }, [
      el('span', { class: 'mk-cl-n', text: `§${k} · ${nombre}` }),
      el('span', { class: 'mk-cl-v' }, [el('b', { class: 'num', text: grande }), unidad ? el('span', { class: 'mk-cl-u', text: unidad }) : null]),
      medida != null ? el('span', { class: 'mx-barra' }, el('i', { class: 'sube', style: { width: `${Math.max(0, Math.min(100, medida * 100))}%` } })) : null,
      ref ? el('span', { class: 'mk-cl-ref', text: ref }) : null,
    ]);
  let k = 0;
  const cl = el('ol', { class: 'mk-ct-cl' }, [
    clausula(++k, 'Sueldo', num(x.sueldo), 'USD / año', valor ? `${fmt1.format(x.sueldo / valor)}× tu valor (${num(valor)})` : null, maxSueldo ? x.sueldo / maxSueldo : null),
    clausula(++k, 'Duración', String(x.anios), x.anios === 1 ? 'año' : 'años', periodo(yo.anio, x.anios), null),
    x.jer ? clausula(++k, 'Jerarquía proyectada', String(x.jer.hasta), 'de 100', x.jer.etiqueta || null, x.jer.hasta / 100) : null,
    x.plantel ? clausula(++k, 'Plantel', `${x.plantel.puesto}.º`, `de ${x.plantel.de}`, pl?.largo ?? null, null) : null,
  ]);
  const notas = el('ul', { class: 'mk-ct-notas' }, [
    x.tipo ? el('li', {}, [icono('firma'), `${x.tipo[0].toUpperCase()}${x.tipo.slice(1)} · ${x.clausula ? 'con' : 'sin'} cláusula de salida`]) : null,
    x.riesgo ? el('li', {}, [icono(pl?.ico ?? 'parejo'), x.riesgo]) : null,
    x.riesgoTexto ? el('li', { class: 'insp-riesgo' }, [icono('incierto'), x.riesgoTexto]) : null,
  ]);
  const doc = el('article', { class: 'mk-contrato', 'data-tono': tonoOrg(x.org), 'aria-label': `Contrato con ${x.org}` });
  const prosa = x.prosa ? el('p', { class: 'mk-ct-prosa', id: `mk-prosa-${String(x.id).replace(/[^a-z0-9]/gi, '')}`, text: x.prosa }) : null;
  const masProsa = prosa ? el('button', { type: 'button', class: 'btn-mas mk-ct-mas', 'aria-expanded': 'false', 'aria-controls': prosa.id, text: 'más' }) : null;
  masProsa?.addEventListener('click', (e) => {
    e.stopPropagation();
    const a = !doc.classList.contains('prosa-abierta');
    doc.classList.toggle('prosa-abierta', a);
    masProsa.setAttribute('aria-expanded', String(a));
    masProsa.textContent = a ? 'menos' : 'más';
  });
  const logo = pintarLogo(x.org, { tam: 84, alt: '', clase: 'mk-ct-logo' });
  const cab = el('header', { class: 'mk-ct-cab' }, [
    logo,
    el('div', { class: 'mk-ct-quien' }, [
      el('p', { class: 'mk-ct-k', text: 'Contrato de jugador profesional' }),
      el('h2', { class: 'mk-ct-org', text: x.org }),
      el('p', { class: 'mk-ct-liga' }, [pintarLogo(x.liga, { liga: true, tam: 18, alt: '' }), el('span', { text: [ligaLarga(x.liga), x.tier ? `tier ${x.tier}` : null].filter(Boolean).join(' · ') })]),
    ]),
    n ? el('p', { class: 'mk-ct-n' }, [el('span', { text: 'Oferta' }), el('b', { text: `${n}/${total}` })]) : null,
  ]);
  const partes = el('p', { class: 'mk-ct-partes' }, [el('span', { text: 'Entre' }), el('b', { text: x.org }), el('span', { text: 'y' }), el('b', { text: yo.handle }), yo.rolEtiqueta ? el('span', { text: `· ${yo.rolEtiqueta}` }) : null, masProsa]);
  const firma = svgFirma(yo.handle);
  const boton = el('button', { type: 'button', class: 'boton boton-pri mk-ct-firmar' }, [icono('firma'), 'Firmar', el('kbd', { text: 'Enter' })]);
  const sello = el('span', { class: 'mk-firmado', 'aria-hidden': 'true' }, [el('b', { text: 'Firmado' }), el('span', { text: `${yo.ventana} ${yo.anio}` })]);
  const pie = el('footer', { class: 'mk-ct-firmas' }, [
    el('div', { class: 'mk-ct-parte' }, [el('span', { class: 'mk-sello', 'aria-hidden': 'true' }, pintarLogo(x.org, { tam: 30, alt: '' })), el('i', { class: 'mk-ct-linea' }), el('span', { class: 'mk-ct-firmante', text: `Por ${x.org}` })]),
    el('div', { class: 'mk-ct-parte mk-ct-vos' }, [firma.nodo, boton, sello, el('i', { class: 'mk-ct-linea' }), el('span', { class: 'mk-ct-firmante', text: `${yo.handle} · el jugador` })]),
  ]);
  doc.append(el('span', { class: 'mk-agua', 'aria-hidden': 'true' }, pintarLogo(x.org, { tam: 340, alt: '' })), cab, partes, prosa, cl, notas, pie);
  return {
    nodo: doc,
    boton,
    logo,
    // Programa la firma desde `t0` (ms): el boton se va, el handle se traza, la rubrica, el sello. El estado final es el
    // de CSS (.firmado): con movimiento reducido o INST queda firmado sin esperas.
    firmar(t0 = 0) {
      doc.classList.add('firmado');
      animar(boton, [{ opacity: 1, transform: 'none', visibility: 'visible' }, { opacity: 0, transform: 'scale(.96)', visibility: 'visible' }], { delay: t0, dur: T_FIRMA.boton, easing: SALE_MK, fill: 'backwards' });
      animar(firma.texto, [{ strokeDashoffset: LARGO_TRAZO, fillOpacity: 0 }, { strokeDashoffset: 0, fillOpacity: 0, offset: 0.78 }, { strokeDashoffset: 0, fillOpacity: 1 }], { delay: t0 + T_FIRMA.trazo, dur: T_FIRMA.trazoDur, easing: 'cubic-bezier(.45,0,.2,1)' });
      animar(firma.rubrica, [{ strokeDashoffset: LARGO_RUBRICA }, { strokeDashoffset: 0 }], { delay: t0 + T_FIRMA.rubrica, dur: T_FIRMA.rubricaDur, easing: EXPO });
      animar(sello, [{ opacity: 0, transform: 'rotate(-7deg) scale(1.8)' }, { opacity: 1, transform: 'rotate(-7deg)' }], { delay: t0 + T_FIRMA.sello, dur: T_FIRMA.selloDur, easing: EXPO });
    },
  };
}

// ---------- el anuncio: la placa de fichaje que publicaria la org ----------
function estiloDe(org) {
  const k = String(org ?? '').toLowerCase();
  if (ESTILO_ANUNCIO[k]) return ESTILO_ANUNCIO[k];
  return Number(tonoOrg(org).slice(1)) % 2 ? 'nosso' : 'welcome';
}
function crearPost(x, yo, meta, { boton = true } = {}) {
  const tono = tonoOrg(x.org);
  const estilo = estiloDe(x.org);
  const arte = el('span', { class: 'mk-placa-arte', 'aria-hidden': 'true' });
  if (yo.main?.ddragon) cargarImagen(urlCentrada(yo.main.ddragon, meta)).then((img) => img && arte.append(img.cloneNode()));
  const textos = estilo === 'welcome'
    ? [el('p', { class: 'mk-placa-grito', text: 'Welcome' }), el('p', { class: 'mk-placa-handle', text: yo.handle })]
    : [el('p', { class: 'mk-placa-k', text: `Nosso novo ${yo.rolEtiqueta}` }), el('p', { class: 'mk-placa-grito mk-placa-grito-h', text: yo.handle })];
  const borrador = el('span', { class: 'mk-placa-sello', 'aria-hidden': 'true' }, [el('b', { text: 'Borrador' }), el('span', { text: 'si pasás la prueba' })]);
  const placa = el('figure', { class: `mk-placa mk-placa-${estilo}`, 'data-tono': tono, 'data-campeon': yo.main?.ddragon ?? null, 'aria-label': `Anuncio de ${x.org}: ${yo.handle}, ${yo.rolEtiqueta}` }, [
    el('span', { class: 'mk-placa-banda', 'aria-hidden': 'true' }),
    arte,
    el('span', { class: 'mk-placa-velo', 'aria-hidden': 'true' }),
    pintarLogo(x.org, { tam: 60, alt: '', clase: 'mk-placa-logo' }),
    el('div', { class: 'mk-placa-txt' }, [...textos, el('p', { class: 'mk-placa-rol' }, [glifoRol(yo.rol), el('span', { text: yo.rolEtiqueta })])]),
    el('p', { class: 'mk-placa-pie' }, [pintarLogo(x.liga, { liga: true, tam: 20, alt: '' }), el('span', { text: `${ligaLarga(x.liga)} ${yo.anio}` }), el('span', { text: aniosTxt(x.anios) })]),
    el('span', { class: 'mk-placa-barrido', 'aria-hidden': 'true' }),
    borrador,
  ]);
  const estado = el('span', { class: 'mk-post-estado', text: 'Vista previa' });
  const likes = el('b', { class: 'mk-likes num', text: '—' });
  const nCom = el('b', { class: 'mk-ncom num', text: '—' });
  const btn = boton ? el('button', { type: 'button', class: 'boton boton-pri mk-publicar' }, [icono('firma'), 'Firmar y publicar', el('kbd', { text: 'Enter' })]) : null;
  const chat = el('ol', { class: 'mk-chat', 'aria-label': 'Comentarios' });
  const nodo = el('article', { class: 'mk-post', 'data-tono': tono, 'aria-label': `La placa de ${x.org}` }, [
    el('header', { class: 'mk-post-cab' }, [pintarLogo(x.org, { tam: 26, alt: '' }), el('b', { text: x.org }), el('span', { class: 'mk-post-k', text: 'anuncio oficial' }), estado]),
    placa,
    el('footer', { class: 'mk-post-pie' }, [el('span', { class: 'mk-post-dato' }, [icono('hype'), likes]), el('span', { class: 'mk-post-dato' }, [icono('chat'), nCom]), btn]),
    chat,
  ]);
  return {
    nodo,
    placa,
    btn,
    // `real`: la oferta que de verdad se firmo en esta carrera (LOUD) se publica; el resto queda en borrador (el motor no
    // jugo esa prueba: no se inventa que salio bien).
    publicar(t0 = 0, { real = true } = {}) {
      nodo.classList.add(real ? 'publicado' : 'borrador');
      estado.textContent = real ? 'Publicado · ahora' : 'Borrador';
      animar(placa, [{ transform: 'none' }, { transform: 'scale(1.045) translateY(-6px)', offset: 0.45 }, { transform: 'scale(1.02)' }], { delay: t0, dur: T_ANUNCIO.placa + 380, easing: EXPO });
      animar(placa.querySelector('.mk-placa-barrido'), [{ transform: 'translateX(-120%) skewX(-16deg)', opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: 'translateX(160%) skewX(-16deg)', opacity: 0 }], { delay: t0 + 120, dur: 900, easing: 'cubic-bezier(.5,0,.2,1)' });
      if (btn) animar(btn, [{ opacity: 1, visibility: 'visible' }, { opacity: 0, visibility: 'visible' }], { delay: t0, dur: T_FIRMA.boton, fill: 'backwards' });
      if (!real) {
        animar(borrador, [{ opacity: 0, transform: 'translate(-50%, -50%) rotate(-9deg) scale(1.8)' }, { opacity: 1, transform: 'translate(-50%, -50%) rotate(-9deg)' }], { delay: t0 + T_ANUNCIO.placa, dur: T_FIRMA.selloDur, easing: EXPO });
        return;
      }
      const azar = crearAzar(`anuncio-${x.org}-${yo.handle}`);
      const [lMin, lMax] = LIKES[x.tier] ?? LIKES[2];
      const [cMin, cMax] = COMENTARIOS_N[x.tier] ?? COMENTARIOS_N[2];
      odometro(likes, 0, azar.entero(lMin, lMax), { delay: t0 + T_ANUNCIO.likes, dur: T_ANUNCIO.likesDur });
      odometro(nCom, 0, azar.entero(cMin, cMax), { delay: t0 + T_ANUNCIO.likes + 120, dur: T_ANUNCIO.likesDur });
      const c = { handle: yo.handle, rol: (yo.rolEtiqueta || '').toLowerCase(), org: x.org, main: yo.main?.name ?? '' };
      const pool = COMENTARIOS.map((f) => f(c)).filter(Boolean);
      const usados = new Set();
      chat.textContent = '';
      for (let i = 0; i < CHAT_LINEAS && pool.length; i++) {
        const linea = pool.splice(azar.entero(0, pool.length - 1), 1)[0];
        const libres = USUARIOS.filter((u) => !usados.has(u));
        const u = azar.elegir(libres.length ? libres : USUARIOS);
        usados.add(u);
        const li = el('li', {}, [el('b', { text: u }), el('span', { text: linea })]);
        chat.append(li);
        entrar(li, t0 + T_ANUNCIO.chat + i * T_ANUNCIO.chatPaso, 10);
      }
    },
  };
}

// ---------- la tabla con logos (las tres opciones) ----------
function tablaConLogos(ofertas, { muestra, vos, maxSueldo }) {
  const tabla = el('div', { class: 'mk-tabla mk-tabla-op', role: 'group', 'aria-label': 'Ofertas' });
  tabla.append(el('div', { class: 'mk-cab', 'aria-hidden': 'true' }, [
    el('span', { class: 'mk-c-club', text: 'Club · liga' }),
    el('span', {}, [icono('hype'), 'Sueldo / año', el('b', { class: 'mx-ref', text: `tu valor ${num(vos.valorUSD ?? 0)}` })]),
    el('span', {}, [icono('temporada'), 'Años']),
    el('span', {}, [icono('jerarquia'), 'Jerarquía', el('b', { class: 'mx-ref', text: 'proyectada, de 100' })]),
    el('span', {}, [icono('teamfight'), 'Plantel']),
  ]));
  const filas = ofertas.map((o, i) => {
    const sueldo = sueldoDe(o);
    const pj = jerDe(o) ?? { hasta: 0, etiqueta: '' };
    const pl = PLANTEL[o.plantelEnLiga?.banda] ?? PLANTEL.medio;
    const desc = el('span', { class: 'sr', id: `desc-op-${muestra}-${i}` }, [o.descripcion, ' ', o.motivoDemanda ?? '', '. ', o.riesgo ?? '', ' ', o.arraigoInicial?.etiqueta ?? '']);
    const b = el('button', { type: 'button', class: 'opcion mk-fila', 'data-atajo': String(i + 1), 'data-id': o.id, 'data-tono': tonoOrg(o.org), 'aria-describedby': desc.id }, [
      el('span', { class: 'mk-club' }, [
        el('span', { class: 'op-tecla', text: String(i + 1) }),
        pintarLogo(o.org, { tam: 34, alt: '' }),
        el('span', { class: 'mk-club-t' }, [
          el('b', { class: 'mk-org', text: o.org }),
          el('span', { class: 'mk-liga', title: ligaLarga(o.liga) }, [pintarLogo(o.liga, { liga: true, tam: 14, alt: '' }), LIGA_TABLA[o.liga] ?? o.liga, o.tier ? ` · tier ${o.tier}` : '']),
        ]),
      ]),
      el('span', { class: 'mk-sueldo' }, [el('b', {}, [num(sueldo), o.tag === 'bombazo' ? el('span', { class: 'tag tag-rara mk-bombazo', text: 'bombazo' }) : null]), el('span', { class: 'mx-barra' }, el('i', { class: 'sube', style: { width: `${(sueldo / maxSueldo) * 100}%` } }))]),
      el('span', { class: 'mk-anios', 'aria-label': aniosTxt(o.anios) }, [...Array.from({ length: 3 }, (_, k) => el('i', { class: k < o.anios ? 'on' : '' })), el('b', { text: String(o.anios) })]),
      el('span', { class: 'mk-jer' }, [el('span', { class: 'mx-barra' }, el('i', { class: 'sube', style: { width: `${Math.min(100, pj.hasta)}%` } })), el('b', { text: String(pj.hasta) }), el('span', { class: 'mk-jer-et', text: pj.etiqueta })]),
      el('span', { class: 'mk-plantel', 'data-banda': o.plantelEnLiga?.banda ?? 'medio', title: o.riesgo }, [icono(pl.ico), el('b', { text: pl.corto }), o.plantelEnLiga ? el('span', { text: `${o.plantelEnLiga.puesto}.º de ${o.plantelEnLiga.de}` }) : null]),
      desc,
    ]);
    tabla.append(b);
    return b;
  });
  return { tabla, filas };
}

// "Mientras tanto": el mundo que se mueve, en logos (el handle al lado; la frase entera en el title y para el lector).
function mientrasTanto(mundo) {
  const t = (mundo.traspasosMundo ?? []).slice(0, 4);
  if (!t.length) return null;
  const asientos = mundo.asientosAbiertos ?? [];
  return el('div', { class: 'mk-tira' }, [
    el('p', { class: 'ctx-rotulo' }, [icono('mundo'), 'Mientras tanto']),
    el('ol', { class: 'mk-tira-l' }, t.map((x) => el('li', { title: x.motivo, 'aria-label': x.motivo }, [pintarLogo(x.org, { tam: 22, alt: '' }), el('b', { text: x.handle }), el('span', { text: x.liga })]))),
    asientos.length ? el('span', { class: 'mk-tira-mas', text: `+${asientos.length} asientos en ${asientos[0].liga === 'CD' ? 'el CD' : asientos[0].liga}` }) : null,
  ]);
}

// Las capturas esperan a que los logos terminen (o fallen y queden en escudo). Tope: 6 s.
function logosListos(raiz) {
  const imgs = [...raiz.querySelectorAll('.logo img, .mk-placa-arte img')];
  const una = (i) => (i.complete ? null : new Promise((r) => (i.addEventListener('load', r, { once: true }), i.addEventListener('error', r, { once: true }))));
  return Promise.race([Promise.all(imgs.map(una)), new Promise((r) => setTimeout(r, 6000))]);
}

// ================================================================================================= las ofertas, con op
function crearOfertasOp({ datos, muestra, amb, sonido, peor }, op) {
  const m = datos[muestra];
  const pc = peor ? datos.peorCaso : null;
  const ofertas = m.decision.opciones;
  const resultados = Object.fromEntries((m.resultados ?? []).map((r) => [r.opcionId, r]));
  const vos = m.vosEnElMercado ?? {};
  const mundo = m.mercadoDelMundo ?? {};
  const maxSueldo = Math.max(1, ...ofertas.map(sueldoDe));
  const botElige = (m.resultados ?? []).find((r) => r.eligioElBot)?.opcionId;
  const yo = {
    handle: pc?.handle ?? m.franja?.quien?.handle ?? datos.inicio?.jugador?.handle ?? '',
    rol: m.franja?.quien?.rol ?? '',
    rolEtiqueta: m.franja?.quien?.rolEtiqueta ?? '',
    anio: m.anio,
    ventana: m.franja?.cuando?.ventana?.texto ?? 'Pretemporada',
    main: datos.inicio?.jugador?.mains?.[0] ?? null,
  };
  const norm = ofertas.map((o) => normalizar(o));

  const raiz = el('section', { class: `parada parada-decision mercado mk-op mk-op-${op}`, 'data-pieza': 'decision', 'data-forma': 'mercado', 'data-muestra': muestra, 'data-op': op });
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
  const rotulo = el('p', { class: 'rotulo-cat' }, [el('i', { class: 'punto-luz' }), el('span', { text: 'Mercado' }), el('span', { class: 'bisagra', text: `${yo.ventana} ${m.anio}` }), el('span', { class: 'bisagra', text: `${ofertas.length} ofertas` })]);
  const titulo = el('h1', { class: 'titulo-parada', 'data-foco': '', tabindex: '-1', text: m.decision.titulo });
  const cabeza = el('header', { class: 'panel-cab' }, [rotulo, titulo, planteo]);
  const { tabla, filas } = tablaConLogos(ofertas, { muestra, vos, maxSueldo });
  const tira = mientrasTanto(mundo);
  const cuerpo = el('div', { class: 'panel-cuerpo' }, [tabla]);
  const col = el('div', { class: 'parada-col' }, [m.antes?.log ? el('p', { class: 'sr', text: m.antes.mensaje }) : null, cabeza, cuerpo, op === 'orgs' ? null : tira]);
  // el mundo propio de la pantalla: capas a pantalla completa, detras de los paneles y delante del lienzo
  const silencio = el('div', { class: 'mk-silencio' });
  const capas = el('div', { class: 'mk-mundo-op', 'aria-hidden': 'true' }, [silencio]);
  const hueco = el('div', { class: 'mk-hueco' });

  // ---- "te llaman": el cielo de logos, sus tintes (el aura de las orgs) y un inspector de una linea
  let cielo = null;
  let astros = [];
  let tintes = [];
  let inspector = null;
  if (op === 'orgs') {
    const azar = crearAzar(`cielo-${muestra}-${yo.handle}`);
    const rango = ofertas.map((o, i) => i).sort((a, b) => (jerDe(ofertas[b])?.hasta ?? 0) - (jerDe(ofertas[a])?.hasta ?? 0));
    astros = ofertas.map((o, i) => {
      const s = sueldoDe(o) / maxSueldo;
      const tam = Math.round(CIELO.tamMin + (CIELO.tamMax - CIELO.tamMin) * s);
      const asiento = ASIENTOS[rango.indexOf(i) % ASIENTOS.length];
      const x = CIELO.cx + asiento.dx + azar.entre(-CIELO.jitter, CIELO.jitter);
      const y = asiento.y + azar.entre(-CIELO.jitter, CIELO.jitter);
      const nodo = el('button', { type: 'button', class: 'mk-astro', tabindex: '-1', 'data-tono': tonoOrg(o.org), 'aria-label': `${o.org}: USD ${num(sueldoDe(o))} al año, jerarquía ${jerDe(o)?.hasta ?? '—'}`, style: { left: `${x}%`, top: `${y}%`, '--tam': `${tam}px` } }, [
        el('span', { class: 'mk-astro-halo' }),
        pintarLogo(o.org, { tam, alt: '' }),
        el('span', { class: 'mk-astro-dato' }, [el('b', { text: o.org }), el('span', { text: `USD ${num(sueldoDe(o))}` })]),
      ]);
      return { nodo, x, y, tam, fase: azar.entre(0, CIELO.flotaMax), dur: azar.entre(CIELO.flotaMin, CIELO.flotaMax) };
    });
    const ref = Math.round(CIELO.tamMin + (CIELO.tamMax - CIELO.tamMin) * ((vos.valorUSD ?? 0) / maxSueldo));
    cielo = el('div', { class: 'mk-cielo' }, [
      ...astros.map((a) => a.nodo),
      tira,
      el('p', { class: 'mk-leyenda', 'aria-label': `Tamaño: sueldo por año. Más cerca: más jerarquía proyectada. Tu valor: USD ${num(vos.valorUSD ?? 0)}` }, [
        el('span', {}, [el('i', { class: 'mk-ley-tam', 'aria-hidden': 'true' }), 'tamaño = sueldo']),
        el('span', {}, [el('i', { class: 'mk-ley-ref', 'aria-hidden': 'true', style: { '--tam': `${ref}px` } }), `tu valor ${num(vos.valorUSD ?? 0)}`]),
        el('span', {}, [icono('jerarquia'), 'más cerca = más jerarquía']),
      ]),
    ]);
    tintes = ofertas.map((o, i) => el('div', { class: 'mk-tinte', 'data-tono': tonoOrg(o.org), style: { '--tx': `${astros[i].x}%`, '--ty': `${astros[i].y / 100}` } }));
    capas.prepend(...tintes);
    inspector = el('div', { class: 'inspector mk-insp-orgs', 'aria-live': 'polite' });
    cabeza.after(inspector);
  }
  raiz.append(...[capas, fr, cielo, col, hueco, cuartos('mundo', null, trayectoria(datos.final?.tarjeta?.historia ?? [], m.anio, m.edad))].filter(Boolean));

  // ---- el lector: el contrato (mesa), la placa (anuncio) o una linea (orgs) de la oferta apuntada
  let lector = null;
  let elegido = false;
  let asentado = true;
  function pintarLector(i) {
    const x = norm[i];
    if (op === 'mesa') {
      lector = crearContrato(x, yo, { n: i + 1, total: ofertas.length, valor: vos.valorUSD, maxSueldo });
      lector.boton.addEventListener('click', (e) => (e.stopPropagation(), elegir(i + 1)));
      hueco.replaceChildren(lector.nodo);
    } else if (op === 'anuncio') {
      lector = crearPost(x, yo, datos.meta);
      lector.btn.addEventListener('click', (e) => (e.stopPropagation(), elegir(i + 1)));
      hueco.replaceChildren(lector.nodo);
    } else {
      const o = ofertas[i];
      inspector.replaceChildren(
        el('div', { class: 'mk-lee' }, [
          el('p', { class: 'insp-kicker' }, [pintarLogo(o.org, { tam: 24, alt: '' }), el('b', { text: o.org }), el('span', { class: 'mk-lee-liga', text: ligaLarga(o.liga) })]),
          el('button', { type: 'button', class: 'boton boton-pri mk-firmar', onclick: () => elegir(i + 1) }, [icono('firma'), 'Al contrato', el('kbd', { text: 'Enter' })]),
        ]),
        el('p', { class: 'insp-texto', text: `${o.descripcion} ${o.motivoDemanda ?? ''}.` }),
        x.riesgoTexto ? el('p', { class: 'insp-previa insp-riesgo' }, [icono('incierto'), x.riesgoTexto]) : null,
      );
    }
  }
  let apuntada = -1;
  function apuntar(i, { mover = false, animado = true } = {}) {
    i = Math.max(0, Math.min(filas.length - 1, i));
    if (i === apuntada) return;
    apuntada = i;
    filas.forEach((f, k) => f.classList.toggle('apuntada', k === i));
    astros.forEach((a, k) => a.nodo.classList.toggle('leido', k === i));
    pintarLector(i);
    // hojear: el contrato nuevo entra corto; la placa nueva se barre
    if (animado && op === 'mesa') animar(lector.nodo, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { dur: DUR.entra });
    if (animado && op === 'anuncio') animar(lector.placa, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { dur: DUR.larga });
    if (mover) filas[i].focus({ preventScroll: true });
  }
  // el aura de las orgs, como la de los campeones: entra a los 120 ms, vuelve a los 600
  let tAura = 0;
  function auraOrg(i) {
    if (op !== 'orgs' || elegido) return;
    clearTimeout(tAura);
    const ya = () => {
      tintes.forEach((t, k) => t.classList.toggle('on', k === i));
      astros.forEach((a, k) => a.nodo.classList.toggle('apuntado', k === i));
      raiz.classList.toggle('con-aura', i >= 0);
    };
    if (quieto()) ya();
    else tAura = setTimeout(ya, i >= 0 ? T_ORGS.aura : T_ORGS.vuelta);
  }
  const sobre = (i) => {
    if (elegido) return;
    if (i !== apuntada) amb.pulso('apuntar');
    apuntar(i);
    auraOrg(i);
  };
  filas.forEach((f, i) => {
    f.addEventListener('pointerenter', () => !celular() && sobre(i));
    f.addEventListener('pointerleave', () => auraOrg(-1));
    f.addEventListener('focus', () => (apuntar(i), auraOrg(i)));
    f.addEventListener('blur', () => auraOrg(-1));
    f.addEventListener('click', () => elegir(i + 1));
  });
  astros.forEach((a, i) => {
    a.nodo.addEventListener('pointerenter', () => sobre(i));
    a.nodo.addEventListener('pointerleave', () => auraOrg(-1));
    a.nodo.addEventListener('click', () => elegir(i + 1));
  });
  apuntar(0, { animado: false });

  // el cielo ocupa lo que deja el panel de abajo (se mide: el panel cambia de alto con el texto)
  function medirCielo() {
    if (op === 'orgs' && col.isConnected) raiz.style.setProperty('--mk-cielo-alto', `${Math.max(0, col.offsetTop - fr.offsetHeight - CIELO.respiro)}px`);
  }
  addEventListener('resize', medirCielo);

  function entrada() {
    medirCielo();
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
      animar(f.querySelector('.logo'), [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'none' }], { delay: 540 + i * 50, dur: 360 });
    });
    if (tira) entrar(tira, 820, 8);
    if (op === 'mesa') {
      // el documento se apoya en la mesa: sube, y despues su contenido de arriba abajo
      animar(lector.nodo, [{ opacity: 0, transform: 'translateY(26px) rotate(.6deg)' }, { opacity: 1, transform: 'none' }], { delay: 360, dur: 520 });
      [...lector.nodo.children].forEach((c, k) => entrar(c, 520 + k * 60, 8));
    } else if (op === 'anuncio') {
      animar(lector.nodo, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { delay: 360, dur: 420 });
      animar(lector.placa, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], { delay: 480, dur: 640 });
    } else {
      // los logos llegan de la luz (de lejos y desenfocados) y despues flotan
      astros.forEach((a, i) => {
        animar(a.nodo.querySelector('.logo'), [{ opacity: 0, transform: 'scale(.4)', filter: 'blur(14px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { delay: 240 + i * 90, dur: 760 });
        animar(a.nodo.querySelector('.mk-astro-dato'), [{ opacity: 0 }, { opacity: 1 }], { delay: 700 + i * 90, dur: 360 });
        if (!quieto()) a.nodo.animate([{ translate: `0 -${CIELO.flota}px` }, { translate: `0 ${CIELO.flota}px` }], { duration: a.dur, delay: -a.fase, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
      });
      entrar(cielo.querySelector('.mk-leyenda'), 1100, 6);
      entrar(inspector, 820, 8);
    }
  }

  // ---- elegir: cada opcion pone su peso; despues, la prueba de ingreso (o, con LOUD, la firma)
  function saltear() {
    for (const a of raiz.getAnimations({ subtree: true })) {
      try {
        if (a.effect?.getTiming?.().iterations !== Infinity) a.finish();
      } catch {
        /* sin fin */
      }
    }
    asentado = true;
  }
  function elegir(n) {
    if (elegido) return;
    const o = ofertas[n - 1];
    if (!o) return;
    clearTimeout(tAura);
    apuntar(n - 1, { animado: false });
    elegido = true;
    asentado = false;
    const x = norm[n - 1];
    const esLaReal = o.id === botElige && Boolean(datos.firma);
    raiz.classList.add('eligiendo');
    amb.aquietar(true);
    amb.pulso('elegir');
    sonido?.clic();
    // el silencio: el mundo baja antes de firmar y la tabla se aparta
    animar(silencio, [{ opacity: 0 }, { opacity: 1 }], { dur: T_FIRMA.silencio, easing: 'linear' });
    // lo apartado queda inerte (no se elige dos veces): fuera del foco y del lector; la tarjeta del resultado lo reemplaza
    [tabla, tira, inspector].forEach((nn) => nn && (nn.setAttribute('inert', ''), nn.setAttribute('aria-hidden', 'true'), animar(nn, [{ opacity: 1 }, { opacity: 0.22 }], { dur: T_FIRMA.silencio })));
    let tFin = T_FIRMA.resultado;
    if (op === 'mesa') {
      animar(lector.nodo, [{ transform: 'none' }, { transform: 'translateY(-6px) scale(1.012)' }], { dur: T_FIRMA.silencio });
      lector.firmar(0);
      esperar(raiz, T_FIRMA.sello).then(() => (amb.pulso('logro'), sonido?.acorde()));
    } else if (op === 'anuncio') {
      lector.publicar(0, { real: esLaReal });
      esperar(raiz, T_ANUNCIO.placa).then(() => (amb.pulso('logro'), sonido?.barrido()));
    } else {
      // el logo se acerca (crece en la luz) y entra al contrato
      raiz.classList.remove('con-aura');
      tintes.forEach((t, k) => t.classList.toggle('on', k === n - 1));
      const a = astros[n - 1];
      const r0 = a.nodo.querySelector('.logo').getBoundingClientRect();
      a.nodo.classList.add('elegido');
      const ct = crearContrato(x, yo, { n, total: ofertas.length, valor: vos.valorUSD, maxSueldo });
      hueco.replaceChildren(ct.nodo);
      lector = ct;
      const r1 = ct.logo.getBoundingClientRect();
      const viaje = pintarLogo(o.org, { tam: Math.round(r0.width), alt: '', clase: 'mk-viaje' });
      Object.assign(viaje.style, { left: `${r0.left}px`, top: `${r0.top}px` });
      raiz.append(viaje);
      const c0 = { x: r0.left + r0.width / 2, y: r0.top + r0.height / 2 };
      const medio = { x: innerWidth * 0.5 - c0.x, y: innerHeight * 0.42 - c0.y, s: Math.max(1.3, 220 / r0.width) };
      const fin = { x: r1.left + r1.width / 2 - c0.x, y: r1.top + r1.height / 2 - c0.y, s: r1.width / r0.width };
      animar(viaje, [
        { transform: 'none', opacity: 1 },
        { transform: `translate(${medio.x}px, ${medio.y}px) scale(${medio.s})`, opacity: 1, offset: 0.5 },
        { transform: `translate(${fin.x}px, ${fin.y}px) scale(${fin.s})`, opacity: 1, offset: 0.94 },
        { transform: `translate(${fin.x}px, ${fin.y}px) scale(${fin.s})`, opacity: 0 },
      ], { dur: T_ORGS.viaje, easing: 'cubic-bezier(.5,0,.15,1)' });
      astros.forEach((b, k) => k !== n - 1 && animar(b.nodo.querySelector('.logo'), [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(.5)', filter: 'blur(10px)' }], { dur: 520, delay: k * 30 }));
      animar(cielo.querySelector('.mk-leyenda'), [{ opacity: 1 }, { opacity: 0 }], { dur: 300 });
      animar(ct.nodo, [{ opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'none' }], { delay: T_ORGS.contrato, dur: 460 });
      animar(ct.logo, [{ opacity: 0 }, { opacity: 1 }], { delay: T_ORGS.viaje - 80, dur: 120 });
      ct.firmar(T_ORGS.firma);
      tFin = T_ORGS.firma + T_FIRMA.resultado;
      esperar(raiz, T_ORGS.firma + T_FIRMA.sello).then(() => (amb.pulso('logro'), sonido?.acorde()));
    }
    // a donde lleva: la prueba de ingreso (lo que dice el motor para TODAS); con LOUD, lo que paso de verdad
    const enc = resultados[o.id]?.inmediato?.encadenaOtraParada;
    const laReal = ofertas.find((z) => z.id === botElige);
    const tarjeta = el('div', { class: 'resultado mk-res mk-res-op', 'data-pieza': 'resultado', tabindex: '-1', 'aria-label': `Resultado: ${o.label}` }, [
      el('div', { class: 'res-cab' }, [el('span', { class: 'op-tecla', text: String(n) }), pintarLogo(o.org, { tam: 30, alt: '' }), el('b', { class: 'mk-org', text: o.org })]),
      el('p', { class: 'mk-sigue' }, [icono('flecha'), el('span', { text: enc?.titulo ?? 'La prueba de ingreso' }), el('b', { text: `en ${o.org}` })]),
      el('p', { class: 'mk-res-datos', text: `${ligaLarga(o.liga)} · ${usd(sueldoDe(o))} / año · ${aniosTxt(o.anios)}` }),
      el('p', { class: 'res-texto', text: esLaReal ? 'En esta carrera, esta fue la elección. La prueba salió así:' : `Hasta acá llega esta muestra: el motor no jugó esta prueba, y no se inventa cómo salía. En esta carrera, la elección fue ${laReal?.org ?? 'otra'}.` }),
      el('div', { class: 'mk-res-botones' }, [
        datos.firma && laReal ? el('button', { type: 'button', class: 'mk-seguir', onclick: () => window.vitrina?.muestra('firma') }, [icono('firma'), esLaReal ? 'La firma' : `Ver lo que pasó en ${laReal.org}`, el('kbd', { text: 'Espacio' })]) : null,
        el('button', { type: 'button', class: 'res-otra', onclick: () => window.vitrina?.repetir() }, ['Volver a decidir', el('kbd', { text: 'R' })]),
      ]),
    ]);
    cuerpo.append(tarjeta);
    animar(tarjeta, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { delay: tFin, dur: DUR.larga });
    [...tarjeta.children].forEach((c, k) => entrar(c, tFin + 80 + k * 70, 8));
    if (quieto()) {
      asentado = true;
      tarjeta.focus({ preventScroll: true });
    } else esperar(raiz, tFin + 200).then(() => ((asentado = true), tarjeta.focus({ preventScroll: true })));
    if (esLaReal && !quieto()) esperar(raiz, (op === 'orgs' ? T_ORGS.firma : 0) + T_FIRMA.encadena).then(() => raiz.isConnected && window.vitrina?.muestra('firma'));
  }

  function tecla(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (elegido && !asentado && (e.key === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      saltear();
    } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= ofertas.length) {
      e.preventDefault();
      elegir(Number(e.key));
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !elegido) {
      e.preventDefault();
      apuntar(apuntada + (e.key === 'ArrowDown' ? 1 : -1), { mover: true });
    } else if (e.key === 'Enter' && !elegido && !(e.target instanceof HTMLButtonElement && !e.target.classList.contains('mk-fila'))) {
      // Enter firma la oferta que estas leyendo: el contrato, la placa o el logo apuntado
      e.preventDefault();
      elegir(apuntada + 1);
    } else if (e.code === 'Space' && elegido) {
      e.preventDefault();
      window.vitrina?.muestra('firma');
    } else if ((e.key === 'r' || e.key === 'R') && elegido) window.vitrina?.repetir();
  }
  raiz.addEventListener('click', (e) => {
    if (elegido && !asentado && !e.target.closest('button')) saltear();
  });

  return {
    nodo: raiz,
    entrar: entrada,
    elegir,
    tecla,
    listo: () => logosListos(raiz),
    destruir: () => (clearTimeout(tAura), removeEventListener('resize', medirCielo)),
    arte: yo.main?.ddragon ?? 'Yone',
    animo: 'normal',
    encuadre: op === 'orgs' ? 'centro' : 'derecha',
    velo: 0.6,
  };
}

// ================================================================================================= la firma, con op
// mesa: el contrato se firma en la luz; anuncio: la placa se publica (likes y chat); orgs: el logo llega de la luz y el
// mundo toma sus colores, con el takeover de siempre.
function crearFirmaOp({ datos, muestra, amb, sonido, peor }, op) {
  const f = datos[muestra];
  const pc = peor ? datos.peorCaso : null;
  const handle = pc?.handle ?? f.franja?.handle ?? f.franja?.quien?.handle ?? datos.inicio?.jugador?.handle;
  const org = pc?.org?.nombre ?? f.org;
  const c = f.contrato ?? {};
  const oferta = datos.mercado?.decision?.opciones?.find((o) => o.org === org) ?? { org, liga: c.liga ?? f.liga, tier: c.tier ?? f.tier };
  const x = normalizar({ ...oferta, salarioAnualUSD: c.salarioAnualUSD ?? f.sueldoAnualUSD ?? sueldoDe(oferta), anios: c.anios ?? f.anios ?? oferta.anios, liga: c.liga ?? f.liga ?? oferta.liga }, { tipo: c.tipo ?? f.tipoDeContrato, clausula: c.clausula });
  const yo = {
    handle,
    rol: f.franja?.rol ?? datos.inicio?.jugador?.rol ?? '',
    rolEtiqueta: f.franja?.rolEtiqueta ?? datos.inicio?.jugador?.rolEtiqueta ?? '',
    anio: f.anio,
    ventana: datos.mercado?.franja?.cuando?.ventana?.texto ?? 'Pretemporada',
    main: datos.inicio?.jugador?.mains?.[0] ?? null,
  };
  const valor = datos.mercado?.vosEnElMercado?.valorUSD;
  const raiz = el('section', { class: `firma takeover mk-firma-op mk-firma-${op}`, 'data-pieza': 'cumbre', 'data-fase': 'firma', 'data-op': op, 'aria-labelledby': 'fm-org' });
  const kicker = el('p', { class: 'fm-k' }, [el('i', { class: 'punto-luz' }), el('span', { text: 'Primer contrato' }), el('span', { text: `tier ${c.tier ?? f.tier}` }), el('span', { text: `${f.edad} años` })]);
  const nombre = el('h1', { class: 'fm-org', id: 'fm-org', 'data-foco': '', tabindex: '-1', 'aria-label': `Firmás con ${org}` }, org.split('').map((l) => el('span', { class: 'fm-letra', 'aria-hidden': 'true', text: l })));
  const linea = el('p', { class: 'fm-log', text: f.log?.message ?? '' });
  const otros = el('ul', { class: 'sr', 'aria-label': 'El resto del mercado' }, (f.logsDelMercado ?? []).slice(2).map((l) => el('li', { text: l.message })));
  const seguir = el('button', { type: 'button', class: 'tk-seguir fm-seguir', onclick: (e) => (e.stopPropagation(), window.vitrina?.repetir()) }, ['Otra vez', el('kbd', { text: 'R' })]);
  const tinte = el('div', { class: 'mk-tinte on', 'data-tono': tonoOrg(org), style: { '--tx': '63%', '--ty': '52%' } });
  const capas = el('div', { class: 'mk-mundo-op', 'aria-hidden': 'true' }, op === 'orgs' ? [tinte] : []);
  let pieza;
  let bloque;
  let astro = null;
  if (op === 'mesa') {
    pieza = crearContrato(x, yo, { valor });
    bloque = el('div', { class: 'fm-bloque mk-fm-mesa' }, [kicker, el('div', { class: 'mk-fm-cabeza' }, [pintarLogo(org, { tam: 132, alt: '' }), nombre]), pieza.nodo, linea, otros, seguir]);
  } else if (op === 'anuncio') {
    pieza = crearPost(x, yo, datos.meta, { boton: false });
    bloque = el('div', { class: 'fm-bloque mk-fm-anuncio' }, [kicker, el('div', { class: 'mk-fm-cabeza' }, [pintarLogo(org, { tam: 84, alt: '' }), nombre]), el('div', { class: 'mk-fm-post' }, [pieza.nodo, el('div', { class: 'mk-fm-lado' }, [linea, seguir])]), otros]);
  } else {
    const sueldo = el('p', { class: 'fm-sueldo' }, [el('span', { class: 'fm-usd', text: 'USD' }), el('b', { class: 'fm-monto', text: num(x.sueldo) }), el('span', { class: 'fm-anio', text: '/ año' })]);
    const datosC = el('dl', { class: 'fm-datos' }, [['Liga', `${x.liga} ${f.anio}`], ['Contrato', aniosTxt(x.anios)], ['Tipo', x.tipo === 'transferencia' ? 'Transferencia' : x.tipo ?? '']].map(([k, v]) => el('div', {}, [el('dt', { text: k }), el('dd', { text: v })])));
    const firma = svgFirma(handle, 'fm-firma');
    pieza = { firma, sueldo, datosC };
    astro = el('div', { class: 'mk-fm-astro', 'data-tono': tonoOrg(org), 'aria-hidden': 'true' }, [el('span', { class: 'mk-astro-halo' }), pintarLogo(org, { tam: 280, alt: '' })]);
    bloque = el('div', { class: 'fm-bloque' }, [kicker, nombre, sueldo, datosC, firma.nodo, linea, otros, seguir]);
  }
  raiz.append(...[capas, astro, bloque].filter(Boolean));

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
    amb.ambiente({ era: 'pieza', animo: 'normal', instantaneo: true });
    amb.ambiente({ era: 'academia', retardo: quieto() ? 0 : 260 });
    amb.pulso('logro', 700);
    sonido?.barrido();
    if (op === 'mesa') pieza.firmar(1000);
    else if (op === 'anuncio') pieza.publicar(900, { real: true });
    if (quieto()) {
      asentado = true;
      return;
    }
    esperar(raiz, 500).then(() => sonido?.acorde());
    entrar(kicker, 120, 10);
    nombre.querySelectorAll('.fm-letra').forEach((l, i) => animar(l, [{ opacity: 0, transform: 'translateY(30%)', filter: 'blur(12px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { delay: 260 + i * 70, dur: 560 }));
    const logoCab = bloque.querySelector('.mk-fm-cabeza .logo');
    if (logoCab) animar(logoCab, [{ opacity: 0, transform: 'scale(.6)', filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { delay: 200, dur: 620 });
    if (op === 'mesa') animar(pieza.nodo, [{ opacity: 0, transform: 'translateY(30px) rotate(.8deg)' }, { opacity: 1, transform: 'none' }], { delay: 560, dur: 560 });
    else if (op === 'anuncio') animar(pieza.nodo, [{ opacity: 0, transform: 'translateY(30px) scale(.97)' }, { opacity: 1, transform: 'none' }], { delay: 480, dur: 560 });
    else {
      animar(tinte, [{ opacity: 0 }, { opacity: 1 }], { delay: 300, dur: 1100, easing: 'linear' });
      animar(astro.querySelector('.logo'), [{ opacity: 0, transform: 'scale(.3)', filter: 'blur(24px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { delay: 200, dur: 1300, easing: EXPO });
      animar(astro.querySelector('.mk-astro-halo'), [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'none' }], { delay: 300, dur: 1400, easing: EXPO });
      animar(pieza.sueldo, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { delay: 700, dur: 380 });
      odometro(pieza.sueldo.querySelector('.fm-monto'), 0, x.sueldo, { delay: 760, dur: 1000 });
      pieza.datosC.querySelectorAll('div').forEach((d, i) => entrar(d, 900 + i * 70, 8));
      animar(pieza.firma.texto, [{ strokeDashoffset: LARGO_TRAZO, fillOpacity: 0 }, { strokeDashoffset: 0, fillOpacity: 0, offset: 0.78 }, { strokeDashoffset: 0, fillOpacity: 1 }], { delay: 1080, dur: 1100, easing: 'cubic-bezier(.45,0,.2,1)' });
      animar(pieza.firma.rubrica, [{ strokeDashoffset: LARGO_RUBRICA }, { strokeDashoffset: 0 }], { delay: 1700, dur: 600, easing: EXPO });
    }
    entrar(linea, 2000, 8);
    entrar(seguir, 2300, 6);
    esperar(raiz, TOMA + 600).then(() => (asentado = true));
  }

  return {
    nodo: raiz,
    entrar: entrada,
    repetir() {
      for (const a of raiz.getAnimations({ subtree: true })) a.cancel();
      raiz.querySelectorAll('.firmado, .publicado, .borrador').forEach((n) => n.classList.remove('firmado', 'publicado', 'borrador'));
      asentado = false;
      entrada();
    },
    tecla(e) {
      if ((e.code === 'Space' || e.key === 'Enter') && !asentado) {
        e.preventDefault();
        saltear();
      } else if (e.key === 'r' || e.key === 'R') window.vitrina?.repetir();
    },
    listo: () => logosListos(raiz),
    arte: datos.inicio?.jugador?.mains?.[0]?.ddragon ?? 'Yone',
    animo: 'normal',
    encuadre: 'firma',
    velo: 0.5,
  };
}
