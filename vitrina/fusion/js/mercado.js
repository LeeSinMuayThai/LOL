// El Mercado.
// `mercado`: las ofertas como franjas alineadas (una matriz chica): el club (su color SOLO en el chip) y su liga, el
// sueldo en mono con tu valor de referente, los anos como pips, la jerarquia proyectada como barra, y el plantel al que
// llegas como icono + nombre corto (sale de plantelEnLiga, no de la prosa). La prosa, al inspector.
// Elegir -> "la prueba de ingreso en <club>" (es lo que dice el motor para TODAS). Con LOUD, lo que paso de verdad:
// encadena a la firma. Para las otras no se inventa como salio la prueba.
// `firma`: el takeover del primer contrato (<= 2,4 s, salteable, Repetir lo vuelve a pasar): la luz de la pieza se
// abre en la de la sala de practica, LOUD grande, CBLOL 2029, 1 ano, USD 40.000 en mono, y tu handle trazado como
// firma de luz.
import { el, svg, entrar, animar, esperar, lineasConMascara, primeraOracion, num, reducido, inst, celular, odometro, plegar, EXPO, DUR } from './util.js';
import { icono, glifoRol } from './iconos.js';
import { franja, trayectoria, cuartos } from './marco.js';
import { pintarLogo, tonoOrg, logoOrg, escudo, iniciales } from './logos.js';
import { crearAzar } from '../../comun/azar.js';
import { cargarImagen, urlCentrada } from '../../comun/arte.js';
// PLANUI §4.9 (op=linea): el kit de la linea (K) y los momentos (M), sin cambiarlos
import { tonoOrg as tonoOrgLinea, tonoEra, aplicarTono, paletaDe } from './tono.js';
import { bloquear } from './ceremonia.js';
import { cinta, placaInferior } from './transmision.js';
import { crearBeats } from './beats.js';
import { crearConfeti } from './confeti.js';

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
  // `op=linea` (PLANUI §4.9): una linea. El mercado es tu segunda seleccion; la firma, el anuncio (un walkout)
  if (ctx.op === 'linea') return ctx.muestra === 'firma' ? crearFirmaLinea(ctx) : crearOfertasLinea(ctx);
  // `op=final` (PLANUI §4.8): la ultima demostracion, la mesa (A) + los logos de C, con el fichaje de fondo
  if (ctx.op === 'final') return ctx.muestra === 'firma' ? crearFirmaFinal(ctx) : crearOfertasFinal(ctx);
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

// ================================================================================================= la demostracion final (§4.8)
// El usuario: "el mercado el A y el C estan muy buenos eso de que se firme con animacion […] y tambien una mini animacion
// de como van entrando las ofertas en pantalla […] lo que no me copa tanto es el campeon atras, se podria hacer algo mas
// que represente el mercado de pases". `op=final` es la mesa (A) + los logos de C, y el fondo es el fichaje:
// - LA PARED (sin campeon). En reposo, EL TABLERO de la ventana de pases: los traspasos reales de "Mientras tanto" y los
//   asientos abiertos, en paletas cuyas letras caen. Al apuntar una org, SU TELON DE PRENSA (el step-and-repeat: su logo
//   en patron, sus colores, la luz de una sala de conferencias). Al firmar, LA CONFERENCIA: flashes de camara
//   (decorativos, del PRNG, <= 3 por segundo) y el telon de la elegida queda.
// - LA ENTRADA. Las ofertas llegan una por una a la pared, como los logos de C (tamaño = sueldo, altura = jerarquia
//   proyectada; de la de menos sueldo a la de mas), y despues cada una baja a su fila de la tabla. ~2,4 s; Espacio la
//   saltea; con INST o movimiento reducido no existe.
// - EL CONTRATO de A, a la derecha. Enter firma: el mundo se aquieta, la firma se traza, el sello cae con un golpe y
//   arranca la conferencia. Despues, la prueba de ingreso; con LOUD, la firma (el takeover con el telon de LOUD).
// Todo se programa de una vez (animaciones con retardo): congelar(t) fotografia cualquier instante de la entrada
// (repetir() la vuelve a pasar en el lugar), de la firma (elegir) y del takeover.
const T_FIN = {
  llega: 240, llegaPaso: 150, llegaDur: 560, // las ofertas llegan a la pared, de lejos y desenfocadas
  baja: 1520, bajaPaso: 64, bajaDur: 480, // y bajan a su fila, en el orden de la tabla
  tablero: 1380, tableroFila: 56, tableroCelda: 7, flapPaso: 62, // el tablero se despierta: las letras caen
  contrato: 1640, // el documento se apoya en la mesa
  fin: 2450, // fin de la entrada
  aura: 120, vuelta: 600, // el telon entra a los 120 ms y vuelve al tablero a los 600 (como el aura de los campeones)
  selloDur: 380, golpe: 1916, // el sello cae en T_FIRMA.sello y toca el papel al 70 % de su caida
  sacude: 220, onda: 620, flash: 160,
  resultado: 2300, encadena: 3900,
};
// la llegada: tamaño por sueldo (px, lineal contra el mas alto); el alto de la etiqueta; el margen dentro de la pared
const LLEGADA = { tamMin: 60, tamMax: 150, gap: 34, etiqueta: 46, margen: 12, desde: 18, escala: 0.42, blur: 14 };
// el tablero: el ancho de cada columna en paletas, cuantas letras pasan antes de la justa y cuantas filas entran
const TABLERO = { handle: 9, rol: 3, org: 15, liga: 3, estado: 8, flaps: 3, filas: 8 };
const FLAP_ABC = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'];
const ROL_CORTO = { top: 'TOP', jungla: 'JNG', mid: 'MID', adc: 'ADC', support: 'SUP' };
// el telon de prensa: la grilla del patron (px) y el logo
const TELON = { celdaX: 150, celdaY: 120, tam: 50, columnas: 14, filas: 8 };
// la conferencia: los flashes (ms entre uno y otro, >= 340: <= 3 por segundo) y donde caen (% de la pantalla)
const FLASH = { gapMin: 360, gapMax: 640, dur: 200, x: [3, 60], y: [9, 46], hasta: 3700 };
// el takeover de la firma: la luz que se abre sobre el telon, el logo en el foco y los flashes mientras firmas
const T_FM = { abre: 160, abreDur: 1300, heroe: 300, heroeDur: 1250, flash: 1750, flashHasta: 3400 };

// "Hanwha Life Esports" -> "HANWHA LIFE": el tablero abrevia como los de verdad
const enTablero = (s, n) => String(s ?? '').replace(/\s+esports$/i, '').toUpperCase().slice(0, n);

// ---------- el tablero de la ventana de pases (aria-hidden: el lector tiene la lista "Mientras tanto") ----------
function crearTablero(mundo, { anio, ventana, semilla }) {
  const azar = crearAzar(`tablero-${semilla}`);
  const todas = [
    ...(mundo.traspasosMundo ?? []).map((t) => ({ org: t.org, handle: t.handle, rol: ROL_CORTO[t.rol] ?? '', liga: t.liga, estado: t.desde === 'cantera' ? 'ACADEMIA' : 'FIRMÓ', tipo: t.desde === 'cantera' ? 'academia' : 'firmo', texto: t.motivo })),
    ...(mundo.asientosAbiertos ?? []).map((a) => ({ org: a.org, handle: 'VACANTE', rol: '', liga: a.liga, estado: 'ABIERTO', tipo: 'abierto', texto: `${a.org} (${a.liga}): un asiento abierto` })),
  ];
  const filas = todas.slice(0, TABLERO.filas);
  const tiras = [];
  // cada letra es una paleta: una tira [la justa, las que pasan, en blanco] que cae hasta la justa
  const paletas = (txt, n, fila, col0, clase) => {
    const t = enTablero(txt, n).padEnd(n, ' ');
    return el('span', { class: `tb-grupo ${clase}` }, [...t].map((ch, k) => {
      const tira = el('span', { class: 'tb-tira' }, [ch, ...Array.from({ length: TABLERO.flaps - 1 }, () => azar.elegir(FLAP_ABC)), ' '].map((c) => el('i', { text: c })));
      tiras.push({ tira, fila, col: col0 + k });
      return el('span', { class: 'tb-c' }, tira);
    }));
  };
  const c = { rol: TABLERO.handle, org: TABLERO.handle + TABLERO.rol + 1 };
  c.liga = c.org + TABLERO.org;
  c.estado = c.liga + TABLERO.liga;
  const nodo = el('div', { class: 'mk-tablero', 'aria-hidden': 'true' }, [
    el('header', { class: 'tb-cab' }, [el('i', { class: 'punto-luz' }), el('span', { class: 'tb-titulo', text: 'Ventana de pases' }), el('span', { text: `${ventana} ${anio}` }), el('span', { class: 'tb-mundo', text: 'Fichajes del mundo' })]),
    el('div', { class: 'tb-rejilla' }, [
      el('div', { class: 'tb-fila tb-rotulos' }, [el('span'), el('span', { text: 'Jugador' }), el('span', { text: 'Rol' }), el('span'), el('span', { text: 'Club' }), el('span', { text: 'Liga' }), el('span', { text: 'Estado' })]),
      ...filas.map((f, i) => el('div', { class: 'tb-fila', 'data-tipo': f.tipo }, [
        pintarLogo(f.org, { tam: 20, alt: '' }),
        paletas(f.handle, TABLERO.handle, i, 0, 'tb-g-handle'),
        paletas(f.rol, TABLERO.rol, i, c.rol, 'tb-g-rol'),
        icono('flecha'),
        paletas(f.org, TABLERO.org, i, c.org, 'tb-g-org'),
        paletas(f.liga, TABLERO.liga, i, c.liga, 'tb-g-liga'),
        paletas(f.estado, TABLERO.estado, i, c.estado, 'tb-g-estado'),
      ])),
    ]),
  ]);
  return {
    nodo,
    // todos los movimientos (el tablero muestra los primeros; el lector los tiene todos)
    todas,
    // las letras caen desde `t0`: fila por fila, de izquierda a derecha, cada paleta pasa por sus letras (steps)
    caer(t0) {
      const sube = `translateY(-${(TABLERO.flaps / (TABLERO.flaps + 1)) * 100}%)`;
      for (const { tira, fila, col } of tiras) animar(tira, [{ transform: sube }, { transform: 'none' }], { delay: t0 + fila * T_FIN.tableroFila + col * T_FIN.tableroCelda, dur: TABLERO.flaps * T_FIN.flapPaso, easing: `steps(${TABLERO.flaps}, end)` });
    },
  };
}

// ---------- el telon de prensa de una org: su logo en patron (step-and-repeat), sus colores, la luz de la sala ----------
function crearTelon(org, tono = tonoOrg(org)) {
  const filas = Array.from({ length: TELON.filas }, () => el('div', { class: 'mk-telon-fila' }, Array.from({ length: TELON.columnas }, () => pintarLogo(org, { tam: TELON.tam, alt: '' }))));
  return el('div', { class: 'mk-telon', 'data-tono': tono, 'data-org': org, style: { '--telon-x': `${TELON.celdaX}px`, '--telon-y': `${TELON.celdaY}px`, '--telon-tam': `${TELON.tam}px` } }, [
    el('div', { class: 'mk-telon-patron' }, filas),
    el('span', { class: 'mk-telon-luz' }),
  ]);
}

// ---------- la conferencia: flashes de camara (decorativos, PRNG; <= 3 por segundo; nada con movimiento reducido) ----------
function programarFlashes(capa, t0, semilla, hasta = FLASH.hasta) {
  capa.textContent = '';
  if (quieto()) return;
  const azar = crearAzar(`flashes-${semilla}`);
  for (let t = t0; t < hasta; t += azar.entre(FLASH.gapMin, FLASH.gapMax)) {
    const f = el('i', { class: 'mk-flash', style: { left: `${azar.entre(...FLASH.x)}%`, top: `${azar.entre(...FLASH.y)}%` } });
    capa.append(f);
    animar(f, [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0 }], { delay: Math.round(t), dur: FLASH.dur, easing: 'ease-out' });
  }
}

// ================================================================================================= las ofertas, final
function crearOfertasFinal({ datos, muestra, amb, sonido, peor }) {
  const m = datos[muestra];
  const pc = peor ? datos.peorCaso : null;
  const ofertas = m.decision.opciones;
  const resultados = Object.fromEntries((m.resultados ?? []).map((r) => [r.opcionId, r]));
  const vos = m.vosEnElMercado ?? {};
  const mundo = m.mercadoDelMundo ?? {};
  const maxSueldo = Math.max(1, ...ofertas.map(sueldoDe));
  const maxJer = Math.max(1, ...ofertas.map((o) => jerDe(o)?.hasta ?? 0));
  const botElige = (m.resultados ?? []).find((r) => r.eligioElBot)?.opcionId;
  const laReal = ofertas.find((z) => z.id === botElige);
  const yo = {
    handle: pc?.handle ?? m.franja?.quien?.handle ?? datos.inicio?.jugador?.handle ?? '',
    rol: m.franja?.quien?.rol ?? '',
    rolEtiqueta: m.franja?.quien?.rolEtiqueta ?? '',
    anio: m.anio,
    ventana: m.franja?.cuando?.ventana?.texto ?? 'Pretemporada',
    main: datos.inicio?.jugador?.mains?.[0] ?? null,
  };
  const norm = ofertas.map((o) => normalizar(o));
  // el color de cada org en la pared: el suyo para las reales; las inventadas, uno distinto cada una (en el orden de la
  // tabla), para que sus telones no se confundan (el hash de tonoOrg le da el mismo a tres de las cuatro de la muestra)
  const inventadas = ofertas.filter((o) => !logoOrg(o.org).src).map((o) => o.org);
  const tonoDe = (org) => (inventadas.includes(org) ? `p${(inventadas.indexOf(org) % 4) + 1}` : tonoOrg(org));
  const raiz = el('section', { class: 'parada parada-decision mercado mk-op mk-final', 'data-pieza': 'decision', 'data-forma': 'mercado', 'data-muestra': muestra, 'data-op': 'final' });

  // Lo de cada montaje: repetir() reconstruye la pantalla y vuelve a pasar la entrada desde cero. `vez` invalida lo que
  // quedo programado del montaje anterior (las esperas resuelven tambien al cancelarse).
  let s = null;
  let vez = 0;
  let elegido = false;
  let asentado = true;
  let entrando = false;
  let apuntada = -1;
  let tAura = 0;

  function construir() {
    clearTimeout(tAura);
    vez++;
    elegido = false;
    asentado = true;
    entrando = false;
    apuntada = -1;
    raiz.classList.remove('eligiendo', 'con-telon');
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
    const cuerpo = el('div', { class: 'panel-cuerpo' }, [tabla]);
    const tablero = crearTablero(mundo, { anio: m.anio, ventana: yo.ventana, semilla: `${muestra}-${yo.handle}` });
    const mientras = el('ol', { class: 'sr', 'aria-label': 'Mientras tanto, en el mercado' }, tablero.todas.map((f) => el('li', { text: f.texto })));
    const col = el('div', { class: 'parada-col' }, [m.antes?.log ? el('p', { class: 'sr', text: m.antes.mensaje }) : null, cabeza, cuerpo, mientras]);
    const telones = ofertas.map((o) => crearTelon(o.org, tonoDe(o.org)));
    const silencio = el('div', { class: 'mk-silencio' });
    const flashes = el('div', { class: 'mk-flashes' });
    const pared = el('div', { class: 'mk-mundo-op mk-pared', 'aria-hidden': 'true' }, [...telones, silencio, flashes]);
    const hueco = el('div', { class: 'mk-hueco' });
    const viajeros = el('div', { class: 'mk-viajeros', 'aria-hidden': 'true' });
    raiz.replaceChildren(pared, fr, tablero.nodo, col, hueco, viajeros, cuartos('mundo', null, trayectoria(datos.final?.tarjeta?.historia ?? [], m.anio, m.edad)));
    s = { fr, rotulo, titulo, planteo, tabla, filas, cuerpo, tablero, col, telones, silencio, flashes, hueco, viajeros, lector: null };
    filas.forEach((f, i) => {
      f.addEventListener('pointerenter', () => !celular() && sobre(i));
      f.addEventListener('pointerleave', () => auraOrg(-1));
      f.addEventListener('focus', () => (apuntar(i), auraOrg(i)));
      f.addEventListener('blur', () => auraOrg(-1));
      f.addEventListener('click', () => elegir(i + 1));
    });
    apuntar(0, { animado: false });
  }

  // ---- el contrato de la oferta apuntada (A): apuntar otra fila cambia de hoja
  function apuntar(i, { mover = false, animado = true } = {}) {
    i = Math.max(0, Math.min(s.filas.length - 1, i));
    if (i === apuntada) return;
    apuntada = i;
    s.filas.forEach((f, k) => f.classList.toggle('apuntada', k === i));
    s.lector = crearContrato(norm[i], yo, { n: i + 1, total: ofertas.length, valor: vos.valorUSD, maxSueldo });
    s.lector.nodo.dataset.tono = tonoDe(norm[i].org);
    s.lector.boton.addEventListener('click', (e) => (e.stopPropagation(), elegir(i + 1)));
    s.hueco.replaceChildren(s.lector.nodo);
    if (animado) animar(s.lector.nodo, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { dur: DUR.entra });
    if (mover) s.filas[i].focus({ preventScroll: true });
  }
  // ---- la pared: el tablero en reposo, el telon de la org apuntada (entra a los 120 ms, vuelve a los 600)
  function ponerTelon(i) {
    s.telones.forEach((t, k) => t.classList.toggle('on', k === i));
    s.tablero.nodo.classList.toggle('apagado', i >= 0);
    raiz.classList.toggle('con-telon', i >= 0);
  }
  function auraOrg(i) {
    if (elegido) return;
    clearTimeout(tAura);
    if (quieto()) ponerTelon(i);
    else tAura = setTimeout(() => ponerTelon(i), i >= 0 ? T_FIN.aura : T_FIN.vuelta);
  }
  function sobre(i) {
    if (elegido) return;
    if (i !== apuntada) amb.pulso('apuntar');
    apuntar(i);
    auraOrg(i);
  }

  // ---- la entrada: las ofertas llegan a la pared y bajan a su fila; despues el tablero y el contrato
  // Devuelve, por fila, cuando aterriza su logo (ms). Mide todo antes de animar (los destinos son las cajas quietas).
  function programarLlegadas() {
    const { tablero, filas, viajeros } = s;
    const pared = tablero.nodo.getBoundingClientRect();
    const orden = ofertas.map((_, i) => i).sort((a, b) => sueldoDe(ofertas[a]) - sueldoDe(ofertas[b]) || a - b);
    const tam = ofertas.map((o) => LLEGADA.tamMin + (LLEGADA.tamMax - LLEGADA.tamMin) * (sueldoDe(o) / maxSueldo));
    const ancho = tam.reduce((a, b) => a + b, 0) + LLEGADA.gap * (ofertas.length - 1);
    const k = Math.min(1, (pared.width - 2 * LLEGADA.margen) / ancho);
    const alto = pared.height - 2 * LLEGADA.margen - LLEGADA.etiqueta;
    let x = pared.left + (pared.width - ancho * k) / 2;
    const aterriza = [];
    viajeros.textContent = '';
    orden.forEach((i, paso) => {
      const o = ofertas[i];
      const lado = Math.round(tam[i] * k);
      const cx = x + lado / 2;
      x += lado + LLEGADA.gap * k;
      const arriba = pared.top + LLEGADA.margen + (1 - (jerDe(o)?.hasta ?? 0) / maxJer) * Math.max(0, alto - lado);
      const cy = arriba + lado / 2;
      const slot = filas[i].querySelector('.logo').getBoundingClientRect();
      const t0 = T_FIN.llega + paso * T_FIN.llegaPaso;
      const tA = t0 + T_FIN.llegaDur;
      const tB = Math.max(tA + DUR.sale, T_FIN.baja + i * T_FIN.bajaPaso);
      const tC = tB + T_FIN.bajaDur;
      aterriza[i] = tC;
      const dato = el('span', { class: 'mk-llega-dato' }, [el('b', { text: o.org }), el('span', { text: usd(sueldoDe(o)) })]);
      const halo = el('span', { class: 'mk-llega-halo' });
      const v = el('div', { class: 'mk-llega', 'data-tono': tonoDe(o.org), style: { left: `${cx - lado / 2}px`, top: `${arriba}px`, width: `${lado}px`, height: `${lado}px` } }, [halo, pintarLogo(o.org, { tam: lado, alt: '' }), dato]);
      viajeros.append(v);
      const d = tC - t0;
      const f = (ms) => Math.min(1, Math.max(0, (ms - t0) / d));
      animar(v, [
        { offset: 0, opacity: 0, transform: `translateY(${LLEGADA.desde}px) scale(${LLEGADA.escala})`, filter: `blur(${LLEGADA.blur}px)`, easing: EXPO },
        { offset: f(tA), opacity: 1, transform: 'none', filter: 'blur(0px)', easing: 'linear' },
        { offset: f(tB), opacity: 1, transform: 'none', filter: 'blur(0px)', easing: 'cubic-bezier(.55,0,.2,1)' },
        { offset: 1, opacity: 1, transform: `translate(${slot.left + slot.width / 2 - cx}px, ${slot.top + slot.height / 2 - cy}px) scale(${slot.width / lado})`, filter: 'blur(0px)' },
      ], { delay: t0, dur: d, easing: 'linear' });
      // la etiqueta (nombre y sueldo) y el halo de su color se van antes de bajar: a la fila llega solo el logo
      const lleva = [{ opacity: 0, offset: 0 }, { opacity: 0, offset: f(t0 + DUR.entra) }, { opacity: 1, offset: f(tA) }, { opacity: 1, offset: f(tB - DUR.sale) }, { opacity: 0, offset: f(tB) }, { opacity: 0, offset: 1 }];
      animar(dato, lleva, { delay: t0, dur: d, easing: 'linear' });
      animar(halo, lleva, { delay: t0, dur: d, easing: 'linear' });
    });
    return aterriza;
  }
  function terminarEntrada() {
    entrando = false;
    s.viajeros.textContent = '';
  }
  // Espacio (o elegir) saltea la entrada: todo a su estado final
  function saltarEntrada() {
    if (!entrando) return;
    for (const a of raiz.getAnimations({ subtree: true })) {
      try {
        if (a.effect?.getTiming?.().iterations !== Infinity) a.finish();
      } catch {
        /* sin fin */
      }
    }
    terminarEntrada();
  }
  function entrada() {
    const { fr, titulo, rotulo, planteo, tabla, filas, col, tablero } = s;
    const mia = vez;
    lineasConMascara(titulo).forEach((l, i) => animar(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: 280 + i * 70, dur: 420 }));
    entrar(fr, 0, -10);
    esperar(raiz, 700).then(() => mia === vez && amb.aquietar(true));
    if (quieto()) {
      amb.aquietar(true);
      return;
    }
    entrando = true;
    animar(col, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { delay: 80, dur: 320 });
    entrar(rotulo, 140, 10);
    entrar(planteo, 420, 10);
    entrar(tabla.querySelector('.mk-cab'), 460, 8);
    const llegan = !celular() && tablero.nodo.offsetParent ? programarLlegadas() : null;
    filas.forEach((f, i) => {
      const t = llegan ? llegan[i] : 500 + i * 50;
      // con la llegada, la fila ya esta (su tecla y su linea: el lugar que espera la oferta) y se llena cuando aterriza
      if (llegan) f.querySelectorAll('.mk-club-t, .mk-sueldo, .mk-anios, .mk-jer, .mk-plantel').forEach((x) => entrar(x, Math.max(0, t - DUR.sale), 8));
      else entrar(f, t - DUR.sale, 12);
      f.querySelectorAll('.mx-barra i').forEach((b) => animar(b, [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: t, dur: 560 }));
      animar(f.querySelector('.logo'), [{ opacity: 0 }, { opacity: 1 }], llegan ? { delay: t - 40, dur: 60, easing: 'linear' } : { delay: t, dur: 360 });
    });
    if (llegan) {
      // mientras las ofertas estan en la pared, el tablero espera en penumbra; cuando bajan, se despierta
      animar(tablero.nodo, [{ opacity: 0.38 }, { opacity: 0.38, offset: 0.62 }, { opacity: 1 }], { dur: T_FIN.baja + T_FIN.bajaDur, easing: 'linear' });
      tablero.caer(T_FIN.tablero);
    }
    // el documento se apoya en la mesa: sube, y despues su contenido de arriba abajo
    animar(s.lector.nodo, [{ opacity: 0, transform: 'translateY(26px) rotate(.6deg)' }, { opacity: 1, transform: 'none' }], { delay: T_FIN.contrato, dur: 520 });
    [...s.lector.nodo.children].forEach((c, k) => entrar(c, T_FIN.contrato + 140 + k * 55, 8));
    esperar(raiz, T_FIN.fin).then(() => mia === vez && terminarEntrada());
  }

  // ---- firmar: el silencio, el trazo, el sello que cae con un golpe, y la conferencia
  function elegir(n) {
    if (elegido) return;
    const o = ofertas[n - 1];
    if (!o) return;
    saltarEntrada();
    clearTimeout(tAura);
    apuntar(n - 1, { animado: false });
    elegido = true;
    asentado = false;
    const mia = vez;
    const esLaReal = o.id === botElige && Boolean(datos.firma);
    const { tabla, cuerpo, silencio, flashes, hueco } = s;
    const doc = s.lector.nodo;
    raiz.classList.add('eligiendo');
    ponerTelon(n - 1);
    amb.aquietar(true);
    amb.pulso('elegir');
    sonido?.clic();
    // el silencio: la pared se apaga mientras firmas; con el golpe del sello se prende la conferencia (y queda tenue)
    const dS = T_FIN.golpe + T_FIN.onda;
    animar(silencio, [{ opacity: 0, easing: 'linear' }, { opacity: 1, offset: T_FIRMA.silencio / dS }, { opacity: 1, offset: T_FIN.golpe / dS, easing: EXPO }, { opacity: getComputedStyle(silencio).opacity }], { dur: dS, easing: 'linear' });
    tabla.setAttribute('inert', '');
    tabla.setAttribute('aria-hidden', 'true');
    animar(tabla, [{ opacity: 1 }, { opacity: 0.22 }], { dur: T_FIRMA.silencio });
    // el documento se levanta y se firma
    doc.classList.add('firmado');
    animar(doc, [{ transform: 'none' }, { transform: 'translateY(-6px) scale(1.012)' }], { dur: T_FIRMA.silencio, fill: 'forwards' });
    const sello = doc.querySelector('.mk-firmado');
    animar(doc.querySelector('.mk-ct-firmar'), [{ opacity: 1, transform: 'none', visibility: 'visible' }, { opacity: 0, transform: 'scale(.96)', visibility: 'visible' }], { dur: T_FIRMA.boton, easing: SALE_MK });
    animar(doc.querySelector('.mk-trazo'), [{ strokeDashoffset: LARGO_TRAZO, fillOpacity: 0 }, { strokeDashoffset: 0, fillOpacity: 0, offset: 0.78 }, { strokeDashoffset: 0, fillOpacity: 1 }], { delay: T_FIRMA.trazo, dur: T_FIRMA.trazoDur, easing: 'cubic-bezier(.45,0,.2,1)' });
    animar(doc.querySelector('.mk-rubrica'), [{ strokeDashoffset: LARGO_RUBRICA }, { strokeDashoffset: 0 }], { delay: T_FIRMA.rubrica, dur: T_FIRMA.rubricaDur, easing: EXPO });
    // el sello cae: acelera hasta el papel, se aplasta un poco y se asienta
    animar(sello, [
      { opacity: 0, transform: 'rotate(-15deg) scale(2.5)', easing: 'cubic-bezier(.55,0,1,.45)' },
      { opacity: 1, transform: 'rotate(-7deg) scale(.9)', offset: (T_FIN.golpe - T_FIRMA.sello) / T_FIN.selloDur, easing: EXPO },
      { opacity: 1, transform: 'rotate(-7deg)' },
    ], { delay: T_FIRMA.sello, dur: T_FIN.selloDur, easing: 'linear' });
    // el golpe: la onda del sello y la mesa que tiembla
    const onda = el('i', { class: 'mk-onda', 'aria-hidden': 'true' });
    sello.append(onda);
    animar(onda, [{ opacity: 0.9, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(2.8)' }], { delay: T_FIN.golpe, dur: T_FIN.onda, easing: EXPO });
    animar(hueco, [{ transform: 'none' }, { transform: 'translate(0, 4px)', offset: 0.18 }, { transform: 'translate(-3px, -1px)', offset: 0.42 }, { transform: 'translate(2px, 1px)', offset: 0.7 }, { transform: 'none' }], { delay: T_FIN.golpe, dur: T_FIN.sacude, easing: 'linear' });
    esperar(raiz, T_FIN.golpe).then(() => mia === vez && (amb.pulso('logro'), sonido?.acorde()));
    // la conferencia: los flashes arrancan apenas cae el sello (cuando el silencio ya se levanta)
    programarFlashes(flashes, T_FIN.golpe + T_FIN.flash, `${o.org}-${yo.handle}`);
    // a donde lleva: la prueba de ingreso (lo que dice el motor para TODAS); con LOUD, lo que paso de verdad
    const enc = resultados[o.id]?.inmediato?.encadenaOtraParada;
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
    animar(tarjeta, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { delay: T_FIN.resultado, dur: DUR.larga });
    [...tarjeta.children].forEach((c, k) => entrar(c, T_FIN.resultado + 80 + k * 70, 8));
    if (quieto()) {
      asentado = true;
      tarjeta.focus({ preventScroll: true });
    } else esperar(raiz, T_FIN.resultado + 200).then(() => mia === vez && ((asentado = true), tarjeta.focus({ preventScroll: true })));
    if (esLaReal && !quieto()) esperar(raiz, T_FIN.encadena).then(() => mia === vez && raiz.isConnected && window.vitrina?.muestra('firma'));
  }
  // Enter, Espacio o un clic durante la firma la saltean (los flashes, que son decorativos, terminan con ella)
  function saltearFirma() {
    for (const a of raiz.getAnimations({ subtree: true })) {
      try {
        if (a.effect?.getTiming?.().iterations !== Infinity) a.finish();
      } catch {
        /* sin fin */
      }
    }
    asentado = true;
  }

  function tecla(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (entrando && !elegido && e.code === 'Space') {
      e.preventDefault();
      saltarEntrada();
    } else if (elegido && !asentado && (e.key === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      saltearFirma();
    } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= ofertas.length) {
      e.preventDefault();
      elegir(Number(e.key));
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !elegido) {
      e.preventDefault();
      apuntar(apuntada + (e.key === 'ArrowDown' ? 1 : -1), { mover: true });
    } else if (e.key === 'Enter' && !elegido && !(e.target instanceof HTMLButtonElement && !e.target.classList.contains('mk-fila'))) {
      // Enter firma el contrato que estas leyendo
      e.preventDefault();
      elegir(apuntada + 1);
    } else if (e.code === 'Space' && elegido) {
      e.preventDefault();
      window.vitrina?.muestra('firma');
    } else if ((e.key === 'r' || e.key === 'R') && elegido) window.vitrina?.repetir();
  }
  raiz.addEventListener('click', (e) => {
    if (elegido && !asentado && !e.target.closest('button')) saltearFirma();
  });

  construir();
  return {
    nodo: raiz,
    entrar: entrada,
    elegir,
    tecla,
    // vuelve a pasar la pantalla en el lugar (sincrono: la tira de capturas congela la entrada desde el cuadro 0)
    repetir() {
      for (const a of raiz.getAnimations({ subtree: true })) a.cancel();
      construir();
      amb.aquietar(false);
      entrada();
    },
    listo: () => logosListos(raiz),
    destruir: () => clearTimeout(tAura),
    // sin campeon: el fondo es el fichaje (la pared)
    arte: null,
    animo: 'normal',
    encuadre: 'derecha',
    velo: 0.6,
  };
}

// ================================================================================================= la firma, final
// El takeover de siempre (la luz de la pieza se abre en la de la academia, LOUD, el sueldo, el handle trazado en luz),
// con la escenografia del fichaje: el telon de LOUD en lugar de tu campeon, que aparece cuando la luz se abre; su logo
// en el foco; y los flashes de la conferencia mientras firmas.
function crearFirmaFinal({ datos, muestra, amb, sonido, peor }) {
  const f = datos[muestra];
  const pc = peor ? datos.peorCaso : null;
  const handle = pc?.handle ?? f.franja?.quien?.handle ?? datos.inicio?.jugador?.handle;
  const org = pc?.org?.nombre ?? f.org;
  const c = f.contrato ?? {};
  const anios = c.anios ?? f.anios;
  const monto = c.salarioAnualUSD ?? f.sueldoAnualUSD;
  const raiz = el('section', { class: 'firma takeover mk-firma-op mk-firma-final', 'data-pieza': 'cumbre', 'data-fase': 'firma', 'data-op': 'final', 'aria-labelledby': 'fm-org' });
  const kicker = el('p', { class: 'fm-k' }, [el('i', { class: 'punto-luz' }), el('span', { text: 'Primer contrato' }), el('span', { text: `tier ${c.tier ?? f.tier}` }), el('span', { text: `${f.edad} años` })]);
  const nombre = el('h1', { class: 'fm-org', id: 'fm-org', 'data-foco': '', tabindex: '-1', 'aria-label': `Firmás con ${org}` }, org.split('').map((l) => el('span', { class: 'fm-letra', 'aria-hidden': 'true', text: l })));
  const sueldo = el('p', { class: 'fm-sueldo' }, [el('span', { class: 'fm-usd', text: 'USD' }), el('b', { class: 'fm-monto', text: num(monto) }), el('span', { class: 'fm-anio', text: '/ año' })]);
  const datosC = el('dl', { class: 'fm-datos' }, [
    ['Liga', `${c.liga ?? f.liga} ${f.anio}`],
    ['Contrato', aniosTxt(anios)],
    ['Tipo', c.tipo === 'transferencia' ? 'Transferencia' : c.tipo ?? f.tipoDeContrato],
  ].map(([k, v]) => el('div', {}, [el('dt', { text: k }), el('dd', { text: v })])));
  const firma = svgFirma(handle, 'fm-firma');
  const linea = el('p', { class: 'fm-log', text: f.log?.message ?? '' });
  const otros = el('ul', { class: 'sr', 'aria-label': 'El resto del mercado' }, (f.logsDelMercado ?? []).slice(2).map((l) => el('li', { text: l.message })));
  const seguir = el('button', { type: 'button', class: 'tk-seguir fm-seguir', onclick: (e) => (e.stopPropagation(), window.vitrina?.repetir()) }, ['Otra vez', el('kbd', { text: 'R' })]);
  const telon = crearTelon(org);
  telon.classList.add('on');
  const heroe = el('div', { class: 'mk-fm-heroe', 'data-tono': tonoOrg(org) }, [el('span', { class: 'mk-fm-foco' }), pintarLogo(org, { tam: 250, alt: '' })]);
  const flashes = el('div', { class: 'mk-flashes' });
  const pared = el('div', { class: 'mk-mundo-op mk-pared', 'aria-hidden': 'true' }, [telon, heroe, el('div', { class: 'mk-pared-velo' }), flashes]);
  const bloque = el('div', { class: 'fm-bloque' }, [kicker, nombre, sueldo, datosC, firma.nodo, linea, otros, seguir]);
  raiz.append(pared, bloque);

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
    programarFlashes(flashes, T_FM.flash, `firma-${org}-${handle}`, T_FM.flashHasta);
    if (quieto()) {
      asentado = true;
      return;
    }
    esperar(raiz, 500).then(() => sonido?.acorde());
    // la luz se abre: el telon aparece desde una rendija de luz sobre el logo, y el logo llega al foco
    animar(telon, [{ clipPath: 'inset(0 30% 0 70%)', opacity: 0.5 }, { clipPath: 'inset(0 0% 0 0%)', opacity: 1 }], { delay: T_FM.abre, dur: T_FM.abreDur, easing: EXPO });
    animar(heroe.querySelector('.mk-fm-foco'), [{ opacity: 0, transform: 'translate(-50%, -50%) scale(.3)' }, { opacity: 1, transform: 'translate(-50%, -50%)' }], { delay: T_FM.abre, dur: T_FM.abreDur, easing: EXPO });
    animar(heroe.querySelector('.logo'), [{ opacity: 0, transform: 'scale(.6)', filter: 'blur(18px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], { delay: T_FM.heroe, dur: T_FM.heroeDur, easing: EXPO });
    entrar(kicker, 120, 10);
    nombre.querySelectorAll('.fm-letra').forEach((l, i) => animar(l, [{ opacity: 0, transform: 'translateY(30%)', filter: 'blur(12px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { delay: 260 + i * 70, dur: 560 }));
    animar(sueldo, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { delay: 700, dur: 380 });
    odometro(sueldo.querySelector('.fm-monto'), 0, monto, { delay: 760, dur: 1000 });
    datosC.querySelectorAll('div').forEach((d, i) => entrar(d, 900 + i * 70, 8));
    animar(firma.texto, [{ strokeDashoffset: LARGO_TRAZO, fillOpacity: 0 }, { strokeDashoffset: 0, fillOpacity: 0, offset: 0.78 }, { strokeDashoffset: 0, fillOpacity: 1 }], { delay: 1080, dur: 1100, easing: 'cubic-bezier(.45,0,.2,1)' });
    animar(firma.rubrica, [{ strokeDashoffset: LARGO_RUBRICA }, { strokeDashoffset: 0 }], { delay: 1700, dur: 600, easing: EXPO });
    entrar(linea, 1900, 8);
    entrar(seguir, 2200, 6);
    esperar(raiz, TOMA + 600).then(() => (asentado = true));
  }

  return {
    nodo: raiz,
    entrar: entrada,
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
    listo: () => logosListos(raiz),
    arte: null,
    animo: 'normal',
    encuadre: 'firma',
    velo: 0.5,
  };
}

// ================================================================================================= una linea (§4.9)
// El usuario: "'el mercado' esta aceptable, pero creo que se podria hacer un concepto mejor y mas original"; "'la firma'
// es muy basica y simple no como el disseño avanzado que yo habia pedido"; de antes, "eso de que se firme con
// animacion", "una mini animacion de como que van entrando las ofertas en pantalla", y nada de "el campeon random
// atras", sino algo que "represente mas lo del fichaje".
// `op=linea`, EL MERCADO ES TU SEGUNDA SELECCION. A los 15 elegiste tus campeones; ahora elegis tu equipo, con el mismo
// gesto del inicio:
//   - la entrada es LA LLEGADA de §4.10 (beats.js, <= 6 s, Espacio salta; ver T_LL): el bumper VENTANA DE PASES ABIERTA,
//     el reloj de la ventana que corre los dias y cada oferta que cae a la grilla en el suyo;
//   - apuntar una org (mouse, foco, 1-6) es el aura: el mundo cruza a su tono (ambiente({ paleta, cruce })) y la derecha
//     (§4.10: la camiseta, el plantel o la carta; con var=campeon, TU MAIN en su bitono) cruza a esa org. Encima, el logo
//     monumental, el nombre gigante y los terminos como numeros grandes con referente. Sin apuntar, el reposo en el tono
//     de la era: vos en el mercado;
//   - la comparacion es la grilla (cada escudo con sus barras de sueldo y jerarquia) y el detalle va al inspector: los
//     numeros grandes estan una sola vez, en el aura;
//   - FIRMAR es el BLOQUEAR del inicio (ceremonia.js): el contrato sube, la firma se traza y cae el sello. Con LOUD (la
//     unica que el motor jugo) encadena a la firma; con las otras, "hasta aca llega esta muestra";
//   - "Mientras tanto" (los fichajes del resto del mundo) es la cinta de la transmision, abajo.
// Todo lo que se mueve en la entrada y en la firma va por UN reloj (beats.js): congelar(t) es fiel.
const T_MS = {
  borde: 620, // el borde encendido en el acento de la org cuando cae su oferta, que se asienta
  aura: 120, vuelta: 600, cruce: 350, // el aura de las orgs: entra a los 120 ms, vuelve a los 600, el mundo cruza en 350
};
const T_FIRMAR = {
  duracion: 4000, asentarse: 2400,
  apaga: 300, sube: 120, subeDur: 480, trazo: 520, trazoDur: 1050, rubrica: 1420, rubricaDur: 420,
  sello: 1650, selloDur: 380, golpe: 1916, onda: 620, sacude: 220, resultado: 2150, encadena: 3900,
};
const T_LETRA_AURA = 26; // la entrada del nombre en el aura, letra por letra (ms)
// el nombre gigante del aura y el handle de la firma achican la letra hasta entrar en su ancho (px)
const LETRA_MIN = 34;
// los tonos de las orgs de la grilla: el medido de su logo (js/tono.js) y, para las inventadas, una paleta distinta para
// cada una en el orden de la grilla (con el hash de tonoOrg, tres de las cuatro de la muestra caian en la misma)
const PALETAS_ORG = 4;
const CAMPOS_TONO = ['luz', 'contra', 'acento', 'noche', 'vacio'];
const tonoPaleta = (k) => Object.freeze({ id: `org-p${k}`, ...Object.fromEntries(CAMPOS_TONO.map((c) => [c, `--tono-org-p${k}-${c}`])) });
// un texto del motor con la org del caso peor en lugar de la real (peor=1: los textos siguen a esa org)
const conOrg = (texto, de, a) => (de && a && typeof texto === 'string' ? texto.replaceAll(de, a) : texto);
function tonosDeGrilla(ofertas) {
  const inventadas = ofertas.filter((o) => !logoOrg(o.org).src).map((o) => o.org);
  return ofertas.map((o) => (inventadas.includes(o.org) ? tonoPaleta((inventadas.indexOf(o.org) % PALETAS_ORG) + 1) : tonoOrgLinea(o.org)));
}
// una animacion WAAPI con iteraciones (util.animar no las tiene: el loop vivo); nada con INST o movimiento reducido
const animarLoop = (nodo, cuadros, opciones) => (!nodo || inst() || reducido() ? null : nodo.animate(cuadros, opciones));
// la letra mas grande con la que `nodo` entra en su ancho (sin pasar de la del CSS)
function ajustarLetra(nodo, { min = LETRA_MIN } = {}) {
  if (!nodo?.isConnected) return;
  nodo.style.fontSize = '';
  const ancho = nodo.clientWidth;
  const largo = nodo.scrollWidth;
  if (!ancho || largo <= ancho) return;
  const base = parseFloat(getComputedStyle(nodo).fontSize);
  nodo.style.fontSize = `${Math.max(min, Math.floor(base * (ancho / largo) * 0.98))}px`;
}
// la firma trazada en la linea: el handle con trazo (y la letra apretada si es largo) y la rubrica
const FIRMA_ANCHO = 640;
const FIRMA_LARGA = 11; // desde estas letras, el handle se aprieta al ancho de la firma (textLength)
function firmaLinea(handle, clase) {
  const texto = svg('text', { x: '8', y: '104', class: `${clase}-trazo` }, document.createTextNode(handle));
  if (String(handle).length >= FIRMA_LARGA) {
    texto.setAttribute('textLength', String(FIRMA_ANCHO - 30));
    texto.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }
  texto.style.strokeDasharray = String(LARGO_TRAZO);
  const rubrica = svg('path', { class: `${clase}-rubrica`, d: 'M14 128 C 140 112, 300 140, 420 120 S 600 96, 628 112' });
  const nodo = svg('svg', { class: clase, viewBox: `0 0 ${FIRMA_ANCHO} 150`, role: 'img', 'aria-label': `Firma: ${handle}` }, [texto, rubrica]);
  return { nodo, texto, rubrica };
}
const trazar = (f, t0, dur) => animar(f.texto, [{ strokeDashoffset: LARGO_TRAZO, fillOpacity: 0 }, { strokeDashoffset: 0, fillOpacity: 0, offset: 0.78 }, { strokeDashoffset: 0, fillOpacity: 1 }], { delay: t0, dur, easing: 'cubic-bezier(.45,0,.2,1)' });
const rubricar = (f, t0, dur) => animar(f.rubrica, [{ strokeDashoffset: LARGO_RUBRICA }, { strokeDashoffset: 0 }], { delay: t0, dur, easing: EXPO });
// la region de una liga (CBLOL -> BR), del catalogo del inicio
const regionDe = (datos, liga) => datos.inicio?.catalogos?.regiones?.find((r) => r.liga === liga)?.regionId ?? '';

// Los terminos de una oferta como numeros grandes con su referente (regla 13).
function terminosDe(x, yo, valor) {
  const pl = PLANTEL[x.plantel?.banda] ?? null;
  return [
    { k: 'Sueldo', n: num(x.sueldo), u: 'USD / año', ref: valor ? `${fmt1.format(x.sueldo / valor)}× tu valor (${num(valor)})` : null },
    { k: 'Contrato', n: String(x.anios), u: x.anios === 1 ? 'año' : 'años', ref: periodo(yo.anio, x.anios) },
    x.jer ? { k: 'Jerarquía', n: String(x.jer.hasta), u: 'de 100', ref: ['proyectada', x.jer.etiqueta ? x.jer.etiqueta.toLowerCase() : null].filter(Boolean).join(' · ') } : null,
    x.plantel ? { k: 'Plantel', n: `${x.plantel.puesto}.º`, u: `de ${x.plantel.de}`, ref: pl?.largo ?? null } : null,
  ].filter(Boolean);
}
const terminoNodo = (t) =>
  el('div', { class: 'ms-termino', 'data-t': t.id ?? null }, [
    el('dt', { class: 'ms-termino-k', text: t.k }),
    el('dd', { class: 'ms-termino-v' }, [el('b', { class: 'ms-num', text: t.n }), t.u ? el('span', { class: 'ms-unidad', text: t.u }) : null]),
    t.ref ? el('dd', { class: 'ms-ref', text: t.ref }) : null,
  ]);

// ================================================================================================= §4.10 (E): la llegada y la derecha
// PLANUI §4.10, el usuario: "que te van llegando las ofertas… momento por momento" y "no es representativo de elegir un
// equipo que esté el campeón atrás". Dos cosas sobre el mercado de §4.9 (la grilla, la comparacion y FIRMAR quedan):
//   1. LA LLEGADA: la ventana de pases como tiempo que pasa. Un reloj de VENTANA_DIAS dias avanza y cada oferta CAE a su
//      lugar en su dia (cae, toca con un golpe sordo, rebota y se asienta), con su aviso (el ding del kit) y el color de
//      su org. El orden y los dias salen de los datos (diasDeLlegada). La pantalla se usa mientras llegan (las que ya
//      estan se apuntan y se eligen); Espacio, un clic afuera o elegir una que no llego: llegan todas.
//   2. LA DERECHA (var=): algo que diga "estas fichando con un equipo", sin campeon. El heroe cambia con la org apuntada
//      (un cruce, no un corte) y la luz del mundo cruza a su tono, como siempre:
//        camiseta (sin var): tu camiseta de espaldas, con tu handle y tu dorsal, en los colores de la org y su escudo;
//        plantel: la formacion de la org en la Grieta, con tu lugar esperandote;
//        ofertas: las ofertas como cartas formales que se apilan al llegar; apuntar una la trae al frente.
//      var=campeon deja la derecha de §4.9 (tu main) para comparar.
const VARIANTES_MS = ['camiseta', 'plantel', 'ofertas', 'campeon'];
const VENTANA_DIAS = 14;
const T_LL = {
  bumperDur: 800, abre: 0.3, cierra: 0.72,
  panel: 160, panelDur: 460,
  heroe: 200, heroeDur: 900,
  reloj: 760, // el dia 1 de la ventana
  dia: 335, // ms por dia: una llegada por dia como mucho, y >= la separacion de destellos de beats.js (334)
  cae: 280, // del aviso (el ding) al golpe
  asienta: 340, // del golpe al reposo (el rebote)
  final: 20, // lo que espera el reloj despues de que se asienta la ultima
  cola: 200, // de asentarse al final del reloj
  caidaMax: 230, // px que cae una oferta en la grilla (desde arriba de su lugar), tope
  caidaSobre: 70, // y cuanto por encima del borde del panel arranca
  reposo: 880, cinta: 1150,
  cruceHeroe: 380, // el cruce del heroe al apuntar otra org
};
const LLEGADA_PESO = { min: 0.7, max: 1.3 }; // el peso de cada salto entre dias (PRNG decorativo, sembrado por los datos)

// El dia de la ventana en que llega cada oferta (por indice de la grilla) y el orden de llegada. El orden sale de los
// datos: los clubes chicos (tier mas alto en numero) se mueven primero y, en su tier, de menor a mayor sueldo; el bombazo
// cierra la ventana. Los saltos entre dias, del PRNG decorativo sembrado con la seed de la muestra y las orgs: el mismo
// calendario en cada visita y en cada captura. La ultima llega el dia VENTANA_DIAS - 1.
function diasDeLlegada(ofertas, semilla) {
  const orden = ofertas.map((_, i) => i).sort((a, b) => {
    const A = ofertas[a];
    const B = ofertas[b];
    return (A.tag === 'bombazo') - (B.tag === 'bombazo') || (B.tier ?? 0) - (A.tier ?? 0) || sueldoDe(A) - sueldoDe(B) || a - b;
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

// El dorsal: los digitos del final del handle (Elurah89 -> 89); si no tiene, uno del PRNG decorativo sembrado con el handle.
const DORSAL = { min: 1, max: 99 };
function dorsalDe(handle) {
  const m = /(\d{1,2})$/.exec(String(handle ?? ''));
  if (m && Number(m[1]) >= DORSAL.min) return String(Number(m[1]));
  return String(crearAzar(`dorsal|${handle}`).entero(DORSAL.min, DORSAL.max));
}
// Las variables de color de un heroe para un tono (nombres de token: el hex vive en tokens.css)
const varsDeTono = (t) => ({ '--h-luz': `var(${t.luz})`, '--h-contra': `var(${t.contra})`, '--h-acento': `var(${t.acento})`, '--h-noche': `var(${t.noche})` });
const estiloSvg = (o) => Object.entries(o).map(([k, v]) => `${k}: ${v}`).join('; ');
let serieHeroe = 0;

// ---------------------------------------------------------------------------------------------- la camiseta
// SVG en capas dentro de un grupo aislado: el COLOR (plano, una capa por org: es lo que cruza), la LUZ (difusa, multiply)
// y el BRILLO (especular + el filo de la luz del mundo, screen). La luz y el brillo salen de un mapa de alturas (los
// pliegues de una camiseta colgada de los hombros, ondas de feTurbulence y la trama fina) y se dibujan una sola vez:
// todas las orgs comparten la tela, solo cambia el tinte. El escudo (la nuca) y el parche de la liga (la manga) son <img>.
const CAM = { w: 600, h: 660, nombreLargo: 10, nombreAncho: 268 };
const CAM_CAJA = `0 0 ${CAM.w} ${CAM.h}`;
const CAM_SILUETA = 'M 248 52 Q 300 68 352 52 C 384 60 420 70 448 84 C 488 110 526 150 554 196 L 494 264 C 476 254 460 246 442 240 C 436 300 432 360 434 420 C 436 490 442 560 446 606 C 400 618 352 624 300 624 C 248 624 200 618 154 606 C 158 560 164 490 166 420 C 168 360 164 300 158 240 C 140 246 124 254 106 264 L 46 196 C 74 150 112 110 152 84 C 180 70 216 60 248 52 Z';
const CAM_MANGAS = ['M 448 84 C 488 110 526 150 554 196 L 494 264 C 476 254 460 246 442 240 C 452 190 454 130 448 84 Z', 'M 152 84 C 112 110 74 150 46 196 L 106 264 C 124 254 140 246 158 240 C 148 190 146 130 152 84 Z'];
const CAM_VIVOS = [
  'M 554 196 L 494 264 L 482 253 L 542 186 Z', 'M 46 196 L 106 264 L 118 253 L 58 186 Z', // los punos
  'M 536 176 L 476 245 L 471 240 L 531 171 Z', 'M 64 176 L 124 245 L 129 240 L 69 171 Z', // el filete de la manga
  'M 244 50 Q 300 66 356 50 L 360 61 Q 300 82 240 61 Z', // el cuello
];
const CAM_LATERALES = ['M 442 240 C 436 300 432 360 434 420 C 436 490 442 560 446 606 L 426 609 C 420 520 414 420 412 330 C 412 300 418 270 428 246 Z', 'M 158 240 C 164 300 168 360 166 420 C 164 490 158 560 154 606 L 174 609 C 180 520 186 420 188 330 C 188 300 182 270 172 246 Z'];
const CAM_ESQUIRLAS = ['M 448 84 L 470 100 L 330 360 L 300 380 Z', 'M 152 84 L 130 100 L 270 360 L 300 380 Z']; // el grafico sublimado
const CAM_INTERIOR = 'M 248 52 Q 300 22 352 52 Q 300 68 248 52 Z'; // el cuello por dentro
const CAM_ARCO = 'M 170 180 Q 300 164 430 180'; // el handle, en arco sobre los hombros
const CAM_DORSAL = { x: 300, y: 452 };
// el mapa de alturas: las crestas (los pliegues que bajan de los hombros, los de las mangas y los de los costados) y los
// valles al lado de cada una (el pliegue tiene un filo y una sombra)
const CAM_CRESTAS = [
  ['M 444 98 C 414 150 384 220 354 296', 16], ['M 156 98 C 186 150 216 220 246 296', 16], ['M 300 84 C 302 116 300 150 298 182', 8],
  ['M 424 262 C 418 360 416 470 422 598', 12], ['M 176 262 C 182 360 184 470 178 598', 12],
  ['M 476 118 C 488 160 496 200 502 250', 10], ['M 124 118 C 112 160 104 200 98 250', 10],
  ['M 332 330 C 352 400 354 480 342 592', 8], ['M 266 340 C 250 410 248 490 260 592', 8],
  ['M 380 300 C 392 330 396 352 398 380', 6], ['M 220 300 C 208 330 204 352 202 380', 6],
];
const CAM_VALLES = [
  ['M 432 104 C 404 156 376 222 346 300', 10], ['M 168 104 C 196 156 224 222 254 300', 10],
  ['M 410 270 C 406 360 404 470 408 598', 8], ['M 190 270 C 194 360 196 470 192 598', 8],
  ['M 488 130 C 498 170 504 210 508 252', 7], ['M 112 130 C 102 170 96 210 92 252', 7],
];
const CAM_LUZ = {
  blur: 8, onda: '0.007 0.012', ondaOctavas: 2, ondaK: 0.035, semillaOnda: 11, fino: '0.85', finoK: 0.05, semillaFino: 4,
  relieve: 12, kd: 1.22, ks: 0.8, exp: 14, azimut: 235, elev: 54, elevBrillo: 38, filo: 6, filoDx: -3,
};
// las sombras de forma (multiply): el cuerpo como cilindro (los costados se van) y la luz clave de arriba a la izquierda
const CAM_CILINDRO = [[0, 0.5], [0.28, 0.05], [0.5, 0], [0.8, 0.18], [1, 0.62]];
const CAM_CLAVE = [[0, 0], [0.55, 0.12], [1, 0.5]];
const SOLO_ALFA = '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0';
const CAM_BARRIDO = { antes: 120, dur: 620 }; // la luz de la org que cruza la camiseta cuando llega su oferta
const CAM_VAIVEN = { giro: 0.5, dur: 7000 }; // el loop vivo: la camiseta colgada se mece apenas
const mascaraSilueta = () => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='${CAM_CAJA}'><path d='${CAM_SILUETA}'/></svg>`)}")`;

function heroeCamiseta({ ofertas, tonos, yo, tonoReposo }) {
  const id = `ms-cam-${++serieHeroe}`;
  const dorsal = dorsalDe(yo.handle);
  const nombre = String(yo.handle || '').toUpperCase();
  let serieCapa = 0;
  // ---- la tela: el mapa de alturas y sus dos luces (una sola vez)
  const mapa = () => [
    svg('rect', { class: 'ms-cam-base', x: '0', y: '0', width: String(CAM.w), height: String(CAM.h) }),
    ...CAM_CRESTAS.map(([d, a]) => svg('path', { class: 'ms-cam-cresta', d, 'stroke-width': String(a) })),
    ...CAM_VALLES.map(([d, a]) => svg('path', { class: 'ms-cam-valle', d, 'stroke-width': String(a) })),
  ];
  const alturas = (p) => [
    svg('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: String(CAM_LUZ.blur), result: `${p}p` }),
    svg('feTurbulence', { type: 'fractalNoise', baseFrequency: CAM_LUZ.onda, numOctaves: String(CAM_LUZ.ondaOctavas), seed: String(CAM_LUZ.semillaOnda), result: `${p}o` }),
    svg('feComposite', { in: `${p}p`, in2: `${p}o`, operator: 'arithmetic', k1: '0', k2: '1', k3: String(CAM_LUZ.ondaK), k4: '0', result: `${p}h` }),
  ];
  const filtro = (fid, hijos) => svg('filter', { id: fid, x: '0', y: '0', width: String(CAM.w), height: String(CAM.h), filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' }, hijos);
  const recorte = (cid) => svg('clipPath', { id: cid }, svg('path', { d: CAM_SILUETA }));
  const degrade = (gid, attrs, paradas) => svg('linearGradient', { id: gid, ...attrs }, paradas.map(([o, a]) => svg('stop', { class: 'ms-cam-sombra-stop', offset: String(o), 'stop-opacity': String(a) })));
  const luz = svg('svg', { class: 'ms-cam-luz', viewBox: CAM_CAJA, 'aria-hidden': 'true' }, [
    svg('defs', {}, [
      recorte(`${id}-l`),
      filtro(`${id}-tela`, [
        ...alturas('a'),
        svg('feTurbulence', { type: 'fractalNoise', baseFrequency: CAM_LUZ.fino, numOctaves: '1', seed: String(CAM_LUZ.semillaFino), result: 'af' }),
        svg('feComposite', { in: 'ah', in2: 'af', operator: 'arithmetic', k1: '0', k2: '1', k3: String(CAM_LUZ.finoK), k4: '0', result: 'aa' }),
        svg('feColorMatrix', { in: 'aa', type: 'matrix', values: SOLO_ALFA, result: 'am' }),
        svg('feDiffuseLighting', { class: 'ms-cam-difusa', in: 'am', surfaceScale: String(CAM_LUZ.relieve), diffuseConstant: String(CAM_LUZ.kd) }, svg('feDistantLight', { azimuth: String(CAM_LUZ.azimut), elevation: String(CAM_LUZ.elev) })),
      ]),
      degrade(`${id}-cil`, { x1: '0', y1: '0', x2: '1', y2: '0' }, CAM_CILINDRO),
      degrade(`${id}-clave`, { x1: '0.15', y1: '0', x2: '0.85', y2: '1' }, CAM_CLAVE),
    ]),
    svg('g', { 'clip-path': `url(#${id}-l)` }, [
      svg('g', { filter: `url(#${id}-tela)` }, mapa()),
      svg('rect', { x: '40', y: '0', width: String(CAM.w - 80), height: String(CAM.h), fill: `url(#${id}-cil)` }),
      svg('rect', { x: '0', y: '0', width: String(CAM.w), height: String(CAM.h), fill: `url(#${id}-clave)` }),
    ]),
  ]);
  const brillo = svg('svg', { class: 'ms-cam-brillo', viewBox: CAM_CAJA, 'aria-hidden': 'true' }, [
    svg('defs', {}, [
      recorte(`${id}-b`),
      filtro(`${id}-esp`, [
        ...alturas('b'),
        svg('feColorMatrix', { in: 'bh', type: 'matrix', values: SOLO_ALFA, result: 'bm' }),
        svg('feSpecularLighting', { class: 'ms-cam-especular', in: 'bm', surfaceScale: String(CAM_LUZ.relieve), specularConstant: String(CAM_LUZ.ks), specularExponent: String(CAM_LUZ.exp) }, svg('feDistantLight', { azimuth: String(CAM_LUZ.azimut), elevation: String(CAM_LUZ.elevBrillo) })),
      ]),
      svg('filter', { id: `${id}-filo` }, svg('feGaussianBlur', { stdDeviation: String(CAM_LUZ.filo) })),
    ]),
    svg('g', { 'clip-path': `url(#${id}-b)` }, [
      svg('g', { filter: `url(#${id}-esp)` }, mapa()),
      svg('path', { class: 'ms-cam-filo', d: CAM_SILUETA, filter: `url(#${id}-filo)`, transform: `translate(${CAM_LUZ.filoDx} 0)` }),
    ]),
  ]);
  const sombra = svg('svg', { class: 'ms-cam-sombra', viewBox: CAM_CAJA, 'aria-hidden': 'true' }, svg('path', { d: CAM_SILUETA }));
  const capas = el('div', { class: 'ms-cam-capas' });
  const barridos = el('div', { class: 'ms-cam-barridos', style: { maskImage: mascaraSilueta(), webkitMaskImage: mascaraSilueta() } });
  const caja = el('div', { class: 'ms-cam' }, [sombra, capas, luz, brillo, barridos]);
  const pie = el('div', { class: 'ms-cam-pie' });
  const nodo = el('div', { class: 'ms-heroe-in ms-h-camiseta' }, [caja, pie]);

  // ---- el color de una org (o el de tu camiseta sin club): una capa plana
  function capaColor(i) {
    const o = i == null ? null : ofertas[i];
    const cid = `${id}-c${++serieCapa}`;
    const num = (clase) => svg('text', { class: `ms-cam-num ${clase}`, x: String(CAM_DORSAL.x), y: String(CAM_DORSAL.y), 'text-anchor': 'middle' }, document.createTextNode(dorsal));
    const tramo = svg('textPath', { href: `#${cid}-arco`, startOffset: '50%' }, document.createTextNode(nombre));
    if (nombre.length > CAM.nombreLargo) {
      tramo.setAttribute('textLength', String(CAM.nombreAncho));
      tramo.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    }
    const s = svg('svg', { class: 'ms-cam-color', viewBox: CAM_CAJA, 'aria-hidden': 'true' }, [
      svg('defs', {}, [
        recorte(`${cid}-r`),
        svg('linearGradient', { id: `${cid}-lat`, x1: '0', y1: '0', x2: '0', y2: '1' }, [svg('stop', { class: 'ms-cam-lat-a', offset: '0' }), svg('stop', { class: 'ms-cam-lat-b', offset: '1' })]),
        svg('linearGradient', { id: `${cid}-esq`, x1: '0', y1: '0', x2: '0', y2: '1' }, [svg('stop', { class: 'ms-cam-esq-a', offset: '0' }), svg('stop', { class: 'ms-cam-esq-b', offset: '1' })]),
        svg('path', { id: `${cid}-arco`, d: CAM_ARCO }),
      ]),
      svg('g', { 'clip-path': `url(#${cid}-r)` }, [
        svg('path', { class: 'ms-cam-cuerpo', d: CAM_SILUETA }),
        ...CAM_ESQUIRLAS.map((d) => svg('path', { d, fill: `url(#${cid}-esq)` })),
        svg('path', { class: 'ms-cam-interior', d: CAM_INTERIOR }),
        ...CAM_MANGAS.map((d) => svg('path', { class: 'ms-cam-manga', d })),
        ...CAM_LATERALES.map((d) => svg('path', { d, fill: `url(#${cid}-lat)` })),
        ...CAM_VIVOS.map((d) => svg('path', { class: 'ms-cam-vivo', d })),
        svg('text', { class: 'ms-cam-nombre', 'text-anchor': 'middle' }, tramo),
        num('ms-cam-num-borde'),
        num('ms-cam-num-hueco'),
        num('ms-cam-num-tinta'),
      ]),
    ]);
    const tono = o ? tonos[i] : tonoReposo();
    return el('div', { class: 'ms-cam-capa', 'data-reposo': o ? null : '', style: varsDeTono(tono) }, [
      s,
      o ? el('span', { class: 'ms-cam-escudo' }, pintarLogo(o.org, { tam: 40, alt: '' })) : null,
      o ? el('span', { class: 'ms-cam-parche' }, pintarLogo(o.liga, { liga: true, tam: 36, alt: '' })) : null,
    ]);
  }
  function pintarPie(i) {
    const o = i == null ? null : ofertas[i];
    pie.replaceChildren(
      el('p', { class: 'ms-cam-pie-k' }, o ? [pintarLogo(o.liga, { liga: true, tam: 14, alt: '' }), `${o.org} · temporada ${yo.anio}`] : [`Agente libre · ${yo.anio}`]),
      el('p', { class: 'ms-cam-pie-t' }, [el('b', { text: yo.handle }), ` · dorsal ${dorsal}${yo.rolEtiqueta ? ` · ${yo.rolEtiqueta}` : ''}`]),
    );
  }
  let actual;
  function mostrar(i, { animado = true, forzar = false } = {}) {
    const clave = i ?? -1;
    if (clave === actual && !forzar) return;
    actual = clave;
    const nueva = capaColor(i);
    const viejas = [...capas.children];
    capas.append(nueva);
    pintarPie(i);
    const a = animado ? animar(nueva, [{ opacity: 0, transform: 'scale(1.012)', filter: 'brightness(1.5)' }, { opacity: 1, transform: 'none', filter: 'none' }], { dur: T_LL.cruceHeroe }) : null;
    if (!a) return viejas.forEach((v) => v.remove());
    animar(pie, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { dur: DUR.entra });
    a.finished.then(() => viejas.forEach((v) => v.remove())).catch(() => {});
  }
  // La llegada: la luz de cada org cruza la camiseta en el momento en que cae su oferta.
  function llegada({ w, tToca }) {
    const bs = ofertas.map((_, i) => el('i', { class: 'ms-cam-barrido', style: { '--ms-luz': `var(${tonos[i].luz})` } }));
    barridos.replaceChildren(...bs);
    bs.forEach((b, i) => w(animar(b, [{ opacity: 0, transform: 'translateX(-60%)' }, { opacity: 1, transform: 'translateX(0%)', offset: 0.4 }, { opacity: 0, transform: 'translateX(60%)' }], { delay: tToca[i] - CAM_BARRIDO.antes, dur: CAM_BARRIDO.dur, easing: 'linear' })));
    w(animar(caja, [{ opacity: 0, filter: 'brightness(.2)' }, { opacity: 1, filter: 'none' }], { delay: T_LL.heroe, dur: T_LL.heroeDur }));
    w(entrar(pie, T_LL.heroe + 300, 8));
  }
  mostrar(null, { animado: false });
  animarLoop(caja, [{ transform: `rotate(${-CAM_VAIVEN.giro}deg)` }, { transform: `rotate(${CAM_VAIVEN.giro}deg)` }], { duration: CAM_VAIVEN.dur, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
  return { nodo, mostrar, llegada, alCambiarEra: () => actual === -1 && mostrar(null, { animado: false, forzar: true }) };
}

// ---------------------------------------------------------------------------------------------- el plantel
// La formacion de la org sobre la Grieta (el mapa de los glifos de rol, en grande): los 5 roles en su lugar del mapa y tu
// lugar iluminado, con el logo de la org de marca en el piso. El motor no trae el plantel de las orgs que ofertan: los
// otros cuatro van con su rol y "por anunciar". De tu lugar, lo unico que dice el motor: el parentesis de motivoDemanda
// ("mejorás claramente sobre <el mid de hoy>"), tal cual.
const ROLES_PL = ['top', 'jungla', 'mid', 'adc', 'support'];
const ROL_NOMBRE = { top: 'Top', jungla: 'Jungla', mid: 'Mid', adc: 'ADC', support: 'Support' };
const PL_POS = { top: [18, 16], jungla: [25, 44], mid: [50, 47], adc: [70, 89], support: [87, 67] }; // % del mapa
const PL_PING = { dur: 900, escala: 2.6 };
function heroePlantel({ ofertas, tonos, yo }) {
  const rol = ROLES_PL.includes(yo.rol) ? yo.rol : 'mid';
  const parentesis = (o) => /\(([^)]+)\)/.exec(String(o?.motivoDemanda ?? ''))?.[1] ?? null;
  const cabs = el('div', { class: 'ms-pl-cabs' });
  const marcas = el('div', { class: 'ms-pl-marcas', 'aria-hidden': 'true' });
  const grieta = svg('svg', { class: 'ms-pl-grieta', viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [
    svg('path', { class: 'ms-pl-borde', d: 'M2.5 2.5h19v19h-19z' }),
    svg('path', { class: 'ms-pl-rio', d: 'M4.6 4.6L19.4 19.4' }),
    svg('path', { class: 'ms-pl-carril', d: 'M4.6 19.4V4.6h14.8' }),
    svg('path', { class: 'ms-pl-carril', d: 'M4.6 19.4h14.8V4.6' }),
    svg('path', { class: 'ms-pl-carril ms-pl-carril-vos', d: 'M4.6 19.4L19.4 4.6' }),
    svg('path', { class: 'ms-pl-base', d: 'M2.5 18a3.5 3.5 0 0 1 3.5 3.5' }),
    svg('path', { class: 'ms-pl-base', d: 'M21.5 6a3.5 3.5 0 0 1 -3.5 -3.5' }),
  ]);
  const textos = {};
  const pos = ROLES_PL.map((r) => {
    const [x, y] = PL_POS[r];
    const vos = r === rol;
    const quien = el('span', { class: vos ? 'ms-pl-hoy' : 'ms-pl-quien' });
    textos[r] = quien;
    return el('div', { class: `ms-pl-pos${vos ? ' ms-pl-vos' : ''}`, 'data-rol': r, style: { left: `${x}%`, top: `${y}%` } }, [
      el('span', { class: 'ms-pl-nodo' }, [glifoRol(r, 'glifo-rol ms-pl-glifo'), vos ? el('i', { class: 'ms-pl-halo' }) : null]),
      el('span', { class: 'ms-pl-txt' }, vos ? [el('span', { class: 'ms-pl-rol', text: `${ROL_NOMBRE[r]} · tu lugar` }), el('b', { class: 'ms-pl-handle', text: yo.handle, style: { '--ms-n': String(Math.max(1, String(yo.handle).length)) } }), quien] : [el('span', { class: 'ms-pl-rol', text: ROL_NOMBRE[r] }), quien]),
    ]);
  });
  const pings = el('div', { class: 'ms-pl-pings', 'aria-hidden': 'true', style: { left: `${PL_POS[rol][0]}%`, top: `${PL_POS[rol][1]}%` } });
  const mapa = el('div', { class: 'ms-pl-mapa' }, [marcas, grieta, pings, ...pos]);
  const nodo = el('div', { class: 'ms-heroe-in ms-h-plantel' }, [cabs, mapa]);
  const cruzar = (cont, nuevo, animado) => {
    const viejos = [...cont.children];
    cont.append(nuevo);
    const a = animado ? animar(nuevo, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { dur: T_LL.cruceHeroe }) : null;
    if (!a) return viejos.forEach((v) => v.remove());
    viejos.forEach((v) => animar(v, [{ opacity: 1 }, { opacity: 0 }], { dur: T_LL.cruceHeroe, easing: 'linear', fill: 'forwards' }));
    a.finished.then(() => viejos.forEach((v) => v.remove())).catch(() => {});
  };
  let actual;
  function mostrar(i, { animado = true } = {}) {
    const clave = i ?? -1;
    if (clave === actual) return;
    actual = clave;
    const o = i == null ? null : ofertas[i];
    nodo.toggleAttribute('data-reposo', !o);
    cruzar(cabs, el('header', { class: 'ms-pl-cab' }, [
      el('p', { class: 'ms-pl-k' }, o ? [pintarLogo(o.liga, { liga: true, tam: 14, alt: '' }), `${ligaLarga(o.liga)}${o.tier ? ` · tier ${o.tier}` : ''} · plantel ${yo.anio}`] : [`Agente libre · ${yo.anio}`]),
      el('p', { class: 'ms-pl-org', text: o ? o.org : 'Tu lugar, sin equipo' }),
    ]), animado);
    cruzar(marcas, el('span', { class: 'ms-pl-marca' }, o ? pintarLogo(o.org, { tam: 320, alt: '' }) : escudo('?')), animado);
    for (const r of ROLES_PL) textos[r].textContent = r === rol ? (o ? (parentesis(o) ?? 'te espera') : 'elegí un equipo') : o ? 'por anunciar' : '—';
  }
  // La llegada: cada oferta es un ping en tu lugar, en el color de su org (el aviso del mapa).
  function llegada({ w, tToca }) {
    const ps = ofertas.map((_, i) => el('i', { class: 'ms-pl-ping', style: { '--ms-acento': `var(${tonos[i].acento})` } }));
    pings.replaceChildren(...ps);
    ps.forEach((p, i) => w(animar(p, [{ opacity: 0.95, transform: 'translate(-50%, -50%) scale(.35)' }, { opacity: 0, transform: `translate(-50%, -50%) scale(${PL_PING.escala})` }], { delay: tToca[i], dur: PL_PING.dur, easing: EXPO, fill: 'none' })));
    w(animar(mapa, [{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { delay: T_LL.heroe, dur: T_LL.heroeDur }));
    w(entrar(cabs, T_LL.heroe + 120, 10));
    pos.forEach((p, k) => w(animar(p, [{ opacity: 0 }, { opacity: 1 }], { delay: T_LL.heroe + 260 + k * 70, dur: DUR.entra, easing: 'linear' })));
  }
  mostrar(null, { animado: false });
  return { nodo, mostrar, llegada };
}

// ---------------------------------------------------------------------------------------------- las cartas
// Las ofertas como cartas formales: el membrete (la banda en la noche de la org, con su escudo), a quien va, los
// terminos y el sello. Caen sobre la pila en el orden en que llegan (la ultima, arriba); apuntar una org la saca de la pila
// y la pone al frente; al soltar vuelve a su lugar. Los giros y corrimientos de la pila, del PRNG decorativo.
const CARTA = { giro: 6, dx: 16, dy: 12, caida: 300, giroCaida: 10, frente: 60, sale: { x: 12, y: -40, giro: 7 }, alFrente: { x: 1, y: -2, giro: -1.2, escala: 1.03 }, mueve: 440, corte: 0.45 };
const CARTA_SELLO = { r: 38, giro: -12 };
function heroeOfertas({ ofertas, tonos, norm, yo, dias, orden, semilla }) {
  const id = `ms-carta-${++serieHeroe}`;
  const azar = crearAzar(`cartas|${semilla}`);
  const altura = ofertas.map(() => 0);
  orden.forEach((i, k) => (altura[i] = k + 1)); // la pila: la que llega despues queda arriba
  const pila = ofertas.map(() => ({ r: azar.entre(-CARTA.giro, CARTA.giro), dx: azar.entre(-CARTA.dx, CARTA.dx), dy: azar.entre(-CARTA.dy, CARTA.dy) }));
  const enPila = (i, extra = {}) => `translate(${(pila[i].dx + (extra.dx ?? 0)).toFixed(1)}px, ${(pila[i].dy + (extra.dy ?? 0)).toFixed(1)}px) rotate(${(pila[i].r + (extra.r ?? 0)).toFixed(2)}deg) scale(${extra.s ?? 1})`;
  const sale = (i) => `translate(${CARTA.sale.x}%, ${CARTA.sale.y}%) rotate(${(pila[i].r + CARTA.sale.giro).toFixed(2)}deg)`;
  const frente = `translate(${CARTA.alFrente.x}%, ${CARTA.alFrente.y}%) rotate(${CARTA.alFrente.giro}deg) scale(${CARTA.alFrente.escala})`;
  const fila = (k, v) => el('div', { class: 'ms-carta-fila' }, [el('dt', { text: k }), el('dd', { text: v })]);
  const cartas = ofertas.map((o, i) => {
    const x = norm[i];
    const t = tonos[i];
    const anillo = svg('svg', { class: 'ms-carta-anillo', viewBox: '0 0 100 100', 'aria-hidden': 'true' }, [
      svg('defs', {}, svg('path', { id: `${id}-sello-${i}`, d: `M 50 ${50 - CARTA_SELLO.r} a ${CARTA_SELLO.r} ${CARTA_SELLO.r} 0 1 1 -0.01 0` })),
      svg('circle', { class: 'ms-carta-aro', cx: '50', cy: '50', r: String(CARTA_SELLO.r + 8) }),
      svg('circle', { class: 'ms-carta-aro', cx: '50', cy: '50', r: String(CARTA_SELLO.r - 8) }),
      svg('text', { class: 'ms-carta-sello-txt' }, svg('textPath', { href: `#${id}-sello-${i}`, startOffset: '0' }, document.createTextNode(`${o.org} · ${o.liga} · ${yo.anio} · `.toUpperCase()))),
      svg('text', { class: 'ms-carta-sello-ini', x: '50', y: '57', 'text-anchor': 'middle' }, document.createTextNode(iniciales(o.org))),
    ]);
    return el('article', { class: 'ms-carta', 'data-i': String(i), style: { ...varsDeTono(t), zIndex: String(altura[i]), transform: enPila(i) } }, [
      el('header', { class: 'ms-carta-membrete' }, [
        el('span', { class: 'ms-carta-escudo' }, pintarLogo(o.org, { tam: 44, alt: '' })),
        el('div', { class: 'ms-carta-quien' }, [el('b', { class: 'ms-carta-org', text: o.org }), el('span', { class: 'ms-carta-liga' }, [pintarLogo(o.liga, { liga: true, tam: 12, alt: '' }), `${ligaLarga(o.liga)}${o.tier ? ` · tier ${o.tier}` : ''}`])]),
        el('span', { class: 'ms-carta-dia', text: `Día ${dias[i]}` }),
      ]),
      el('div', { class: 'ms-carta-cuerpo' }, [
        el('p', { class: 'ms-carta-k', text: `Oferta de contrato · ${yo.ventana} ${yo.anio}` }),
        el('p', { class: 'ms-carta-para' }, ['Para ', el('b', { text: yo.handle }), yo.rolEtiqueta ? ` · ${yo.rolEtiqueta}` : '']),
        o.descripcion || o.motivoDemanda ? el('p', { class: 'ms-carta-texto', text: [o.descripcion, o.motivoDemanda ? `${o.motivoDemanda}.` : null].filter(Boolean).join(' ') }) : null,
        el('dl', { class: 'ms-carta-terminos' }, [
          fila('Sueldo', `USD ${num(x.sueldo)} / año`),
          fila('Contrato', `${aniosTxt(x.anios)} · ${periodo(yo.anio, x.anios)}`),
          x.tipo ? fila('Modalidad', `${x.tipo}${x.clausula ? ', con cláusula' : ''}`) : null,
          x.jer ? fila('Jerarquía', `${x.jer.hasta} de 100, proyectada`) : null,
          x.plantel ? fila('Plantel', `${x.plantel.puesto}.º de ${x.plantel.de} en ${ligaLarga(x.plantel.liga ?? o.liga)}`) : null,
        ]),
        el('footer', { class: 'ms-carta-pie' }, [el('div', { class: 'ms-carta-firma' }, [el('i'), el('span', { text: `Por ${o.org}` })]), el('span', { class: 'ms-carta-sello' }, anillo)]),
      ]),
    ]);
  });
  const bandeja = el('div', { class: 'ms-cartas-bandeja' }, el('span', { text: 'La bandeja de ofertas' }));
  const mesa = el('div', { class: 'ms-cartas' }, [bandeja, ...cartas]);
  const nodo = el('div', { class: 'ms-heroe-in ms-h-ofertas' }, mesa);
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
  // La llegada: cada carta cae sobre la pila en su dia (acelera, golpea, se asienta); la bandeja vacia se va con la primera.
  function llegada({ w, tCae, tToca }) {
    const D = T_LL.cae + T_LL.asienta;
    const toca = T_LL.cae / D;
    cartas.forEach((c, i) => w(animar(c, [
      { opacity: 0, transform: enPila(i, { dy: -CARTA.caida, r: -CARTA.giroCaida, s: 1.05 }), easing: 'cubic-bezier(.5,0,.85,.4)' },
      { opacity: 1, transform: enPila(i, { dy: -CARTA.caida * 0.8, r: -CARTA.giroCaida * 0.8, s: 1.05 }), offset: 0.14, easing: 'cubic-bezier(.5,0,.85,.4)' },
      { opacity: 1, transform: enPila(i, { dy: 3, s: 0.99 }), offset: toca, easing: EXPO },
      { opacity: 1, transform: enPila(i) },
    ], { delay: tCae[i], dur: D, easing: 'linear' })));
    w(animar(bandeja, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { delay: T_LL.heroe, dur: Math.max(DUR.larga, Math.min(...tToca) - T_LL.heroe), easing: 'linear', fill: 'none' }));
  }
  // FIRMAR: la carta de la org elegida (al frente) recibe su sello de firmada con el golpe.
  function firmar(i, { w, t }) {
    const c = cartas[i];
    if (!c) return;
    c.querySelector('.ms-carta-firmada')?.remove();
    const f = el('span', { class: 'ms-carta-firmada', 'aria-hidden': 'true', text: 'Firmada' });
    c.append(f);
    w(animar(f, [{ opacity: 0, transform: 'rotate(-14deg) scale(2.4)', easing: 'cubic-bezier(.55,0,1,.45)' }, { opacity: 1, transform: 'rotate(-9deg) scale(.92)', offset: 0.7, easing: EXPO }, { opacity: 1, transform: 'rotate(-9deg)' }], { delay: t - T_FIRMAR.selloDur * 0.7, dur: T_FIRMAR.selloDur, easing: 'linear' }));
  }
  return { nodo, mostrar, llegada, firmar };
}

// ================================================================================================= el mercado, linea
function crearOfertasLinea({ datos, muestra, amb, sonido, peor, estado, variante }) {
  const m = datos[muestra];
  const pc = peor ? datos.peorCaso : null;
  const botElige = (m.resultados ?? []).find((r) => r.eligioElBot)?.opcionId;
  // con peor=1 la oferta que se juega pasa a ser la org del caso peor (el nombre mas largo): su logo, su tono y sus textos
  const orgPeor = pc?.org?.nombre;
  const ofertas = m.decision.opciones.map((o) => (orgPeor && o.id === botElige
    ? { ...o, org: orgPeor, liga: pc.org.liga ?? o.liga, descripcion: conOrg(o.descripcion, o.org, orgPeor), motivoDemanda: conOrg(o.motivoDemanda, o.org, orgPeor) }
    : o));
  const resultados = Object.fromEntries((m.resultados ?? []).map((r) => [r.opcionId, r]));
  const vos = m.vosEnElMercado ?? {};
  const mundo = m.mercadoDelMundo ?? {};
  const maxSueldo = Math.max(1, ...ofertas.map(sueldoDe));
  const laReal = ofertas.find((z) => z.id === botElige);
  const yo = {
    handle: pc?.handle ?? m.franja?.quien?.handle ?? datos.inicio?.jugador?.handle ?? '',
    rol: m.franja?.quien?.rol ?? '',
    rolEtiqueta: m.franja?.quien?.rolEtiqueta ?? '',
    anio: m.anio,
    edad: m.edad,
    ventana: m.franja?.cuando?.ventana?.texto ?? 'Pretemporada',
  };
  const norm = ofertas.map((o) => normalizar(o));
  const tonos = tonosDeGrilla(ofertas);
  const valor = vos.valorUSD ?? 0;
  const html = document.documentElement;
  // PLANUI §4.10 (E): la variante de la derecha y el calendario de la llegada (los dias salen de los datos)
  const v = VARIANTES_MS.includes(variante) ? variante : VARIANTES_MS[0];
  const conHeroe = v !== 'campeon';
  const semilla = m.seed ?? muestra;
  const { dias, orden } = diasDeLlegada(ofertas, semilla);
  const tCae = dias.map((d) => T_LL.reloj + (d - 1) * T_LL.dia);
  const tToca = tCae.map((t) => t + T_LL.cae);
  const diaFinal = Math.max(...dias);
  const asentarseLl = Math.max(...tToca) + T_LL.asienta + T_LL.final;
  const raiz = el('section', { class: 'ms-mercado', 'data-pieza': 'decision', 'data-forma': 'mercado', 'data-muestra': muestra, 'data-op': 'linea', 'data-var': v, 'data-heroe': conHeroe ? '' : null });

  // Lo de cada montaje: repetir() reconstruye la pantalla y vuelve a pasar la entrada desde cero.
  let s = null;
  let heroe = null; // la derecha (camiseta, plantel u ofertas); null con var=campeon
  let beats = null; // el reloj vigente: el de la entrada o el de la firma (congelar va a este)
  let vivo = true;
  let elegido = false;
  let asentado = true;
  let entrando = false;
  let elegida = -1; // la org elegida (clic, foco, 1-6): la que firma FIRMAR y la que vuelve al soltar el mouse
  let mostrada = null; // la que muestra el aura ahora (null: el reposo)
  let tAura = 0;
  let ultDia = -1; // lo ultimo que pinto el reloj (el dia y cuantas llegaron)
  let ultN = -1;
  // El tiempo de la llegada: el del reloj mientras entra; fuera de la entrada, todas llegaron.
  const tLlegada = () => (entrando && beats && !beats.quieto ? beats.ahora() : Infinity);
  const llego = (i) => tToca[i] <= tLlegada();
  const llegadas = (t = tLlegada()) => ofertas.map((_, i) => i).filter((i) => tToca[i] <= t);

  // ---------------------------------------------------------------------------------------------- armar
  function construir() {
    clearTimeout(tAura);
    beats?.destruir();
    beats = null;
    elegido = false;
    asentado = true;
    entrando = false;
    elegida = -1;
    mostrada = null;
    raiz.classList.remove('ms-firmando');
    const fr = franja(m.franja, { peor: pc ? { handle: pc.handle, org: pc.org?.nombre } : null });

    // ---- el bumper y la linea de luz (decorativos: el rotulo del panel dice lo mismo)
    const bumper = el('div', { class: 'ms-bumper', 'aria-hidden': 'true' }, [
      el('i', { class: 'ms-bumper-banda' }),
      el('p', { class: 'ms-bumper-txt' }, [el('span', { text: 'Ventana de pases' }), el('b', { text: 'abierta' })]),
      el('p', { class: 'ms-bumper-sub', text: `${yo.ventana} ${m.anio} · ${VENTANA_DIAS} días · buscan ${yo.rolEtiqueta || 'tu rol'}` }),
    ]);
    const lineaLuz = el('i', { class: 'ms-linea-luz', 'aria-hidden': 'true' });

    // ---- el reloj de la ventana (decorativo: la grilla y el rotulo dicen cuantas llegaron): el dia que corre, los
    // VENTANA_DIAS dias (cada oferta marca el suyo en el color de su org) y la ultima que llego
    const celdas = Array.from({ length: VENTANA_DIAS }, (_, k) => el('li', { class: 'ms-reloj-d' }, ofertas.map((o, i) => (dias[i] === k + 1 ? el('i', { class: 'ms-reloj-marca', 'data-i': String(i), style: { '--ms-acento': `var(${tonos[i].acento})` } }) : null))));
    const relojN = el('b', { class: 'ms-reloj-n', text: '01' });
    const relojUlt = el('p', { class: 'ms-reloj-ult' });
    const reloj = el('div', { class: 'ms-reloj', 'aria-hidden': 'true' }, [
      el('p', { class: 'ms-reloj-k' }, [el('span', { text: 'Ventana de pases' }), el('span', { class: 'ms-reloj-de', text: `${VENTANA_DIAS} días` })]),
      el('div', { class: 'ms-reloj-fila' }, [el('p', { class: 'ms-reloj-dia' }, [el('span', { text: 'Día' }), relojN]), el('ol', { class: 'ms-reloj-dias' }, celdas)]),
      relojUlt,
    ]);
    // ---- la derecha (PLANUI §4.10): el heroe de la variante, sin campeon
    heroe = !conHeroe ? null : v === 'plantel' ? heroePlantel({ ofertas, tonos, yo }) : v === 'ofertas' ? heroeOfertas({ ofertas, tonos, norm, yo, dias, orden, semilla }) : heroeCamiseta({ ofertas, tonos, yo, tonoReposo });
    const heroeNodo = heroe ? el('aside', { class: 'ms-heroe', 'aria-hidden': 'true' }, heroe.nodo) : null;

    // ---- el aura: el escudo monumental, el nombre gigante y los terminos (o el reposo: vos en el mercado)
    const velo = el('div', { class: 'ms-velo', 'aria-hidden': 'true' });
    const aura = el('section', { class: 'ms-aura', 'aria-live': 'polite', 'aria-label': 'La oferta apuntada' });

    // ---- el panel: la grilla de escudos (la comparacion), el inspector (el detalle) y FIRMAR
    const [primera, resto] = primeraOracion(m.decision.descripcion);
    const btnMas = resto ? el('button', { type: 'button', class: 'btn-mas', 'aria-expanded': 'false', text: 'más' }) : null;
    const planteo = el('p', { class: 'planteo ms-planteo' }, [el('span', { class: 'planteo-1', text: primera }), resto ? el('span', { class: 'planteo-resto', text: ' ' + resto }) : null, btnMas]);
    btnMas?.addEventListener('click', () => {
      const a = !planteo.classList.contains('abierto');
      planteo.classList.toggle('abierto', a);
      btnMas.setAttribute('aria-expanded', String(a));
      btnMas.textContent = a ? 'menos' : 'más';
    });
    const rotulo = el('p', { class: 'rotulo-cat' }, [el('i', { class: 'punto-luz' }), el('span', { text: 'Mercado' }), el('span', { class: 'bisagra', text: `${yo.ventana} ${m.anio}` }), el('span', { class: 'bisagra ms-rot-n', text: `${ofertas.length} ofertas` })]);
    const titulo = el('h1', { class: 'ms-titulo', id: 'ms-titulo', 'data-foco': '', tabindex: '-1', text: m.decision.titulo });
    const cab = el('header', { class: 'ms-cab' }, [
      el('div', { class: 'ms-cab-t' }, [rotulo, titulo, planteo]),
      el('div', { class: 'ms-cab-der' }, [
        reloj,
        el('p', { class: 'ms-leyenda', 'aria-hidden': 'true' }, [el('span', {}, [el('i', { class: 'ms-ley-sueldo' }), el('span', { text: 'sueldo / año' })]), el('span', {}, [el('i', { class: 'ms-ley-jer' }), el('span', { text: 'jerarquía proyectada' })])]),
      ]),
    ]);
    const escudos = ofertas.map((o, i) => {
      const x = norm[i];
      const t = tonos[i];
      const desc = el('span', { class: 'sr', id: `ms-desc-${i}` }, [
        `USD ${num(x.sueldo)} por año, ${aniosTxt(x.anios)}`,
        x.jer ? `, jerarquía proyectada ${x.jer.hasta} de 100` : '',
        x.plantel ? `, ${x.plantel.puesto}.º de ${x.plantel.de} en su liga` : '',
        '.',
      ]);
      return el('button', { type: 'button', class: 'ms-op', 'data-atajo': String(i + 1), 'data-tono': t.id, 'aria-pressed': 'false', 'aria-keyshortcuts': String(i + 1), 'aria-label': `${o.org}, ${ligaLarga(o.liga)}${o.tier ? `, tier ${o.tier}` : ''}`, 'aria-describedby': desc.id, style: { '--ms-acento': `var(${t.acento})`, '--ms-luz': `var(${t.luz})` } }, [
        el('span', { class: 'ms-op-vacio', 'aria-hidden': 'true' }, escudo('?')),
        el('span', { class: 'ms-op-tecla', 'aria-hidden': 'true', text: String(i + 1) }),
        o.tag === 'bombazo' ? el('span', { class: 'ms-op-tag', text: 'bombazo' }) : null,
        el('span', { class: 'ms-op-cresta' }, pintarLogo(o.org, { tam: 54, alt: '' })),
        el('span', { class: 'ms-op-txt' }, [
          el('b', { class: 'ms-op-org', text: o.org }),
          el('span', { class: 'ms-op-liga' }, [pintarLogo(o.liga, { liga: true, tam: 13, alt: '' }), LIGA_TABLA[o.liga] ?? o.liga, o.tier ? ` · T${o.tier}` : '']),
        ]),
        el('span', { class: 'ms-op-barras', 'aria-hidden': 'true' }, [
          el('i', { class: 'ms-op-barra ms-op-sueldo', style: { '--v': (x.sueldo / maxSueldo).toFixed(3) } }),
          el('i', { class: 'ms-op-barra ms-op-jer', style: { '--v': ((x.jer?.hasta ?? 0) / 100).toFixed(3) } }),
        ]),
        el('i', { class: 'ms-op-borde', 'aria-hidden': 'true' }),
        el('i', { class: 'ms-op-estela', 'aria-hidden': 'true' }),
        el('i', { class: 'ms-op-polvo', 'aria-hidden': 'true' }),
        desc,
      ]);
    });
    const grilla = el('div', { class: 'ms-grilla', role: 'group', 'aria-label': 'Ofertas: elegí tu equipo (1 a 6)' }, escudos);
    const ranura = el('div', { class: 'ms-ranura' });
    const inspector = el('div', { class: 'ms-insp', 'aria-live': 'polite' });
    const boton = bloquear({ texto: 'Firmar', sonido, alBloquear: () => firmar(elegida) });
    boton.habilitar(false);
    const cierre = el('footer', { class: 'ms-cierre' }, [ranura, inspector, el('div', { class: 'ms-firmar' }, [boton.nodo, el('span', { class: 'ms-firmar-k' }, [el('kbd', { text: 'Enter' }), 'firma'])])]);
    const panel = el('section', { class: 'panel ms-panel', 'aria-labelledby': 'ms-titulo' }, [cab, grilla, cierre]);

    // ---- "mientras tanto": la cinta de la transmision (los fichajes reales del resto del mundo)
    const items = [
      ...(mundo.traspasosMundo ?? []).map((t) => ({ texto: t.motivo, logo: pintarLogo(t.org, { tam: 22, alt: '' }) })),
      ...(mundo.asientosAbiertos ?? []).map((a) => ({ texto: `${a.org} (${ligaLarga(a.liga)}) tiene un asiento abierto`, logo: pintarLogo(a.org, { tam: 22, alt: '' }) })),
    ];
    const tira = items.length ? el('div', { class: 'ms-cinta' }, cinta({ rotulo: 'Mientras tanto', items })) : null;

    raiz.replaceChildren(...[velo, fr, aura, heroeNodo, panel, tira, cuartos('mundo', null, trayectoria(datos.final?.tarjeta?.historia ?? [], m.anio, m.edad)), bumper, lineaLuz].filter(Boolean));
    s = { fr, bumper, lineaLuz, velo, aura, panel, cab, rotulo, titulo, planteo, grilla, escudos, ranura, inspector, boton, cierre, tira, reloj, relojN, relojUlt, celdas, heroeNodo };
    ultDia = -1;
    ultN = -1;

    escudos.forEach((b, i) => {
      b.addEventListener('pointerenter', () => !celular() && previsualizar(i));
      b.addEventListener('pointerleave', () => !celular() && soltar());
      // el foco (Tab) solo elige una que ya llego; el clic en una que no llego hace llegar todas (elegir1)
      b.addEventListener('focus', () => llego(i) && elegir1(i));
      b.addEventListener('click', () => elegir1(i));
    });
    pintarAura(null, { animado: false });
    pintarCierre(-1);
  }

  // ---------------------------------------------------------------------------------------------- el aura
  // El aura en el DOM: el reposo (vos en el mercado) o la org i. `animado`: la entrada corta (expo-out, 320 ms).
  function pintarAura(i, { animado = true } = {}) {
    const { aura } = s;
    aura.dataset.estado = i == null ? 'reposo' : 'org';
    let escudoNodo;
    let nombre;
    let kicker;
    let terminos;
    if (i == null) {
      escudoNodo = el('span', { class: 'ms-aura-escudo ms-aura-vacio' }, escudo('?'));
      kicker = [el('span', { text: m.franja?.club?.fase ?? 'Agente libre' }), el('span', { text: `${yo.edad} años` }), el('span', { text: yo.rolEtiqueta })];
      nombre = 'Elegí tu equipo';
      // (§4.10) cuentan solo las que ya llegaron: mientras corre la ventana, el reloj los va actualizando
      terminos = [{ k: 'Tu valor', n: num(valor), u: 'USD', ref: vos.contrato ? 'con contrato' : 'sin contrato: agente libre' }, ...terminosLlegadas(llegadas())];
    } else {
      const o = ofertas[i];
      const x = norm[i];
      escudoNodo = el('span', { class: 'ms-aura-escudo' }, pintarLogo(o.org, { tam: 172, alt: '' }));
      kicker = [el('span', {}, [pintarLogo(o.liga, { liga: true, tam: 16, alt: '' }), ligaLarga(o.liga)]), o.tier ? el('span', { text: `tier ${o.tier}` }) : null, x.tipo ? el('span', { text: `${x.tipo}${x.clausula ? ', con cláusula' : ''}` }) : null, el('span', { text: `oferta ${i + 1} de ${ofertas.length}` }), o.tag === 'bombazo' ? el('span', { class: 'ms-aura-tag', text: 'bombazo' }) : null];
      nombre = o.org;
      terminos = terminosDe(x, yo, valor);
    }
    const nom = el('h2', { class: 'ms-aura-nombre' }, String(nombre).split('').map((c) => el('span', { class: 'ms-aura-letra', text: c })));
    nom.setAttribute('aria-label', nombre);
    const k = el('p', { class: 'ms-aura-k' }, kicker.filter(Boolean));
    const dl = el('dl', { class: 'ms-terminos' }, terminos.map(terminoNodo));
    aura.replaceChildren(el('div', { class: 'ms-aura-cab' }, [escudoNodo, el('div', { class: 'ms-aura-t' }, [k, nom])]), dl);
    ajustarLetra(nom);
    if (!animado) return;
    animar(escudoNodo, [{ opacity: 0, transform: 'scale(.86)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], { dur: 360 });
    nom.querySelectorAll('.ms-aura-letra').forEach((l, j) => animar(l, [{ opacity: 0, transform: 'translateY(34%)' }, { opacity: 1, transform: 'none' }], { delay: 40 + j * T_LETRA_AURA, dur: 300 }));
    animar(k, [{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }], { delay: 60, dur: 280 });
    dl.querySelectorAll('.ms-termino').forEach((t, j) => animar(t, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay: 120 + j * 50, dur: 300 }));
  }
  // Los terminos del reposo que dependen de cuantas llegaron: cuantos te llaman y la mas alta.
  function terminosLlegadas(ya) {
    const mejor = ya.reduce((a, i) => (a == null || sueldoDe(ofertas[i]) > sueldoDe(ofertas[a]) ? i : a), null);
    const o = mejor == null ? null : ofertas[mejor];
    return [
      { id: 'llaman', k: 'Te llaman', n: String(ya.length), u: ya.length === 1 ? 'club' : 'clubes', ref: `buscan ${yo.rolEtiqueta || 'tu rol'}` },
      { id: 'alta', k: 'La más alta', n: o ? num(sueldoDe(o)) : '—', u: 'USD / año', ref: !o ? 'esperando ofertas' : valor ? `${fmt1.format(sueldoDe(o) / valor)}× tu valor · ${o.org}` : o.org },
    ];
  }
  // El reloj pinta las llegadas en t: los escudos que ya se pueden apuntar, las marcas de los dias, la ultima que llego,
  // el rotulo y los terminos del reposo (si el aura esta en reposo).
  function pintarLlegadas(t) {
    const ya = llegadas(t);
    s.escudos.forEach((b, i) => {
      const si = ya.includes(i);
      b.dataset.llego = si ? '1' : '0';
      if (si) b.removeAttribute('aria-disabled');
      else b.setAttribute('aria-disabled', 'true');
    });
    s.reloj.querySelectorAll('.ms-reloj-marca').forEach((x) => x.classList.toggle('llego', ya.includes(Number(x.dataset.i))));
    s.rotulo.querySelector('.ms-rot-n').textContent = `${ya.length} ${ya.length === 1 ? 'oferta' : 'ofertas'}`;
    const ult = ya.length ? ya.reduce((a, i) => (tToca[i] > tToca[a] ? i : a)) : null;
    s.relojUlt.replaceChildren(...(ult == null ? [el('span', { text: 'Esperando ofertas' })] : ya.length === ofertas.length ? [el('b', { text: `${ya.length} ofertas` }), ` en ${diaFinal} días`] : [pintarLogo(ofertas[ult].org, { tam: 16, alt: '' }), el('span', { text: 'Llegó ' }), el('b', { text: ofertas[ult].org })]));
    if (mostrada != null || s.aura.dataset.estado !== 'reposo') return;
    for (const x of terminosLlegadas(ya)) {
      const nodo = s.aura.querySelector(`[data-t='${x.id}']`);
      if (!nodo) continue;
      nodo.querySelector('.ms-num').textContent = x.n;
      const u = nodo.querySelector('.ms-unidad');
      if (u) u.textContent = x.u;
      const r = nodo.querySelector('.ms-ref');
      if (r) r.textContent = x.ref;
    }
  }
  // El cierre del panel: la ranura ("tu equipo"), el inspector (la prosa de la oferta) y FIRMAR.
  function pintarCierre(i) {
    const { ranura, inspector, boton } = s;
    if (i < 0) {
      ranura.replaceChildren(el('span', { class: 'ms-ranura-cara ms-ranura-libre', 'aria-hidden': 'true' }, escudo('?')), el('span', { class: 'ms-ranura-t' }, [el('span', { class: 'ms-ranura-k', text: 'Tu equipo' }), el('b', { text: 'Libre' })]));
      inspector.replaceChildren(el('p', { class: 'ms-insp-texto', text: 'Apuntá un escudo para verte en ese equipo. 1 a 6 eligen; Enter firma.' }));
      boton.habilitar(false);
      return;
    }
    const o = ofertas[i];
    const x = norm[i];
    const pl = PLANTEL[x.plantel?.banda] ?? PLANTEL.medio;
    ranura.replaceChildren(el('span', { class: 'ms-ranura-cara' }, pintarLogo(o.org, { tam: 40, alt: '' })), el('span', { class: 'ms-ranura-t' }, [el('span', { class: 'ms-ranura-k', text: 'Tu equipo' }), el('b', { text: o.org })]));
    inspector.replaceChildren(
      el('p', { class: 'ms-insp-texto', text: [o.descripcion, o.motivoDemanda ? `${o.motivoDemanda}.` : null].filter(Boolean).join(' ') }),
      el('ul', { class: 'insp-previa ms-insp-previa' }, [
        x.riesgo ? el('li', {}, [icono(pl.ico), x.riesgo]) : null,
        o.arraigoInicial ? el('li', {}, [icono('arraigo'), o.arraigoInicial.etiqueta]) : null,
        x.riesgoTexto ? el('li', { class: 'insp-riesgo' }, [icono('incierto'), x.riesgoTexto]) : null,
      ]),
    );
    boton.habilitar(true);
  }
  // La luz: el mundo cruza al tono (la paleta tiñe la luz, la noche y las sombras de tu main) y el CSS lo sigue.
  function ponerTono(tono) {
    aplicarTono(html, tono);
    amb.ambiente({ paleta: paletaDe(tono), cruce: T_MS.cruce });
  }
  const tonoReposo = () => tonoEra(html.dataset.era);
  // Mostrar la org i (o el reposo, null) en el aura y en la luz.
  function mostrar(i) {
    if (i === mostrada || !vivo) return;
    mostrada = i;
    s.escudos.forEach((b, k) => b.classList.toggle('apuntada', k === i));
    raiz.dataset.aura = i == null ? 'reposo' : tonos[i].id;
    pintarAura(i);
    heroe?.mostrar(i);
    ponerTono(i == null ? tonoReposo() : tonos[i]);
    if (i != null) amb.pulso('apuntar');
  }
  // el que se va (la pantalla sale) no toca la luz de la que entra: main.js le saca los eventos al nodo viejo
  const sigue = () => vivo && raiz.isConnected && raiz.style.pointerEvents !== 'none';
  // Pasar el mouse: el aura entra a los 120 ms (barrer la grilla no dispara seis cruces).
  function previsualizar(i) {
    if (elegido || !llego(i)) return;
    clearTimeout(tAura);
    if (quieto()) return mostrar(i);
    tAura = setTimeout(() => sigue() && mostrar(i), T_MS.aura);
  }
  // Soltar: a los 600 ms vuelve a la elegida (o al reposo).
  function soltar() {
    if (elegido) return;
    clearTimeout(tAura);
    const base = elegida >= 0 ? elegida : null;
    if (quieto()) return mostrar(base);
    tAura = setTimeout(() => sigue() && mostrar(base), T_MS.vuelta);
  }
  // Elegir (clic, foco, 1-6): queda como la de la pantalla; FIRMAR la firma. `mover`: el foco va a su escudo.
  function elegir1(i, { mover = false } = {}) {
    if (elegido || i < 0 || i >= ofertas.length) return;
    // (§4.10) elegir una que todavia no llego hace llegar todas (como Espacio); las que ya estan se eligen sin cortar
    if (entrando && !llego(i)) saltarEntrada();
    clearTimeout(tAura);
    if (i !== elegida) {
      elegida = i;
      s.escudos.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
      pintarCierre(i);
      sonido?.clic?.();
    }
    mostrar(i);
    if (mover && document.activeElement !== s.escudos[i]) s.escudos[i].focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------------------------------------- la entrada
  // (PLANUI §4.10) La entrada es la LLEGADA: el bumper abre la ventana, el panel sube con la grilla vacia y el reloj corre
  // los dias; cada oferta cae en el suyo. Todo por un reloj (beats.js): congelar(t) muestra la ventana en t.
  function entrada() {
    const { bumper, lineaLuz, aura, panel, rotulo, titulo, planteo, escudos, cierre, tira, fr, cab, reloj, relojN, celdas } = s;
    const bt = crearBeats({ duracion: asentarseLl + T_LL.cola, asentarse: asentarseLl });
    beats = bt;
    entrando = !quieto();
    const w = (a) => bt.waapi(a);
    // el golpe de luz del bumper (un destello, por beats)
    const td = bt.destello(60);
    if (td != null) amb.pulso('elegir', td);
    // ---- el bumper: la banda se abre, el rotulo entra apretandose, y la banda se cierra en una linea de luz que se apaga
    const D = T_LL.bumperDur;
    w(animar(bumper, [{ opacity: 1 }, { opacity: 1, offset: 0.97 }, { opacity: 0 }], { dur: D, easing: 'linear' }));
    w(animar(bumper.querySelector('.ms-bumper-banda'), [
      { transform: 'scaleY(0)', easing: EXPO },
      { transform: 'scaleY(1)', offset: T_LL.abre, easing: 'linear' },
      { transform: 'scaleY(1)', offset: T_LL.cierra, easing: 'cubic-bezier(.7,0,.3,1)' },
      { transform: 'scaleY(.01)' },
    ], { dur: D, easing: 'linear' }));
    w(animar(bumper.querySelector('.ms-bumper-txt'), [
      { opacity: 0, letterSpacing: '0.42em', filter: 'blur(8px)', easing: EXPO },
      { opacity: 1, letterSpacing: '0em', filter: 'blur(0px)', offset: 0.36, easing: 'linear' },
      { opacity: 1, letterSpacing: '0em', transform: 'none', filter: 'blur(0px)', offset: T_LL.cierra - 0.04, easing: 'cubic-bezier(.7,0,.3,1)' },
      { opacity: 0, letterSpacing: '0em', transform: 'scaleY(.2)', filter: 'blur(4px)', offset: 0.9 },
      { opacity: 0, letterSpacing: '0em', transform: 'scaleY(.2)', filter: 'blur(4px)' },
    ], { dur: D, easing: 'linear' }));
    w(animar(bumper.querySelector('.ms-bumper-sub'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none', offset: 0.45 }, { opacity: 1, transform: 'none', offset: T_LL.cierra - 0.06 }, { opacity: 0, transform: 'none', offset: 0.82 }, { opacity: 0, transform: 'none' }], { delay: 120, dur: D - 120, easing: 'linear' }));
    w(animar(lineaLuz, [{ opacity: 0, transform: 'scaleX(.6)' }, { opacity: 1, transform: 'none', offset: 0.2 }, { opacity: 0, transform: 'scaleX(1.06)' }], { delay: D * T_LL.cierra, dur: D * (1 - T_LL.cierra) + 240, easing: 'linear' }));
    // ---- el panel sube con la grilla vacia; adentro, el orden de siempre (luz -> rotulo -> titulo -> opciones)
    w(animar(panel, [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' }], { delay: T_LL.panel, dur: T_LL.panelDur }));
    w(entrar(fr, 0, -10));
    w(entrar(rotulo, T_LL.panel + 120, 10));
    w(animar(titulo, [{ opacity: 0, transform: 'translateY(40%)' }, { opacity: 1, transform: 'none' }], { delay: T_LL.panel + 200, dur: 420 }));
    w(entrar(planteo, T_LL.panel + 300, 10));
    w(entrar(cab.querySelector('.ms-leyenda'), T_LL.panel + 380, 6));
    w(entrar(cierre, T_LL.panel + 520, 10));
    w(entrar(reloj, T_LL.reloj - 220, 8));
    // ---- el reloj: el dia que corre, las celdas que pasan y las llegadas (un participante de beats: congelar lo mueve)
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
      },
    });
    // ---- las ofertas caen a su lugar, cada una en su dia (medido: la grilla esta quieta en su lugar final)
    const techo = panel.getBoundingClientRect().top - T_LL.caidaSobre;
    const dur = T_LL.cae + T_LL.asienta;
    const toca = T_LL.cae / dur;
    escudos.forEach((b, i) => {
      const t0 = tCae[i];
      const tt = tToca[i];
      const cresta = b.querySelector('.ms-op-cresta');
      const r = cresta.getBoundingClientRect();
      const alto = Math.round(Math.max(0, Math.min(T_LL.caidaMax, r.top + r.height / 2 - techo)));
      // la estela: un haz del acento de la org sobre su lugar, mientras cae
      const estela = b.querySelector('.ms-op-estela');
      estela.style.height = `${Math.max(0, Math.round(alto - (r.top - b.getBoundingClientRect().top)))}px`;
      w(animar(estela, [{ opacity: 0, transform: 'scaleY(.2)' }, { opacity: 1, transform: 'scaleY(1)', offset: 0.3 }, { opacity: 0.7, transform: 'scaleY(1)', offset: toca }, { opacity: 0, transform: 'scaleY(.05)' }], { delay: t0, dur, easing: 'linear' }));
      // la caida: acelera, toca aplastandose, rebota y se asienta
      w(animar(cresta, [
        { opacity: 0, transform: `translateY(${-alto}px) scale(.62)`, filter: 'blur(5px)', easing: 'cubic-bezier(.5,0,.9,.4)' },
        { opacity: 1, transform: `translateY(${Math.round(-alto * 0.86)}px) scale(.7)`, filter: 'blur(3px)', offset: 0.08, easing: 'cubic-bezier(.5,0,.9,.4)' },
        { opacity: 1, transform: 'translateY(7%) scale(1.18, .8)', filter: 'blur(0px)', offset: toca, easing: 'cubic-bezier(.2,.7,.3,1)' },
        { opacity: 1, transform: 'translateY(-9%) scale(.95, 1.06)', filter: 'blur(0px)', offset: toca + (1 - toca) * 0.45, easing: 'ease-in-out' },
        { opacity: 1, transform: 'none', filter: 'blur(0px)' },
      ], { delay: t0, dur, easing: 'linear' }));
      // el lugar vacio se va cuando la oferta toca; el texto y las barras entran; el polvo y el borde en su acento
      w(animar(b.querySelector('.ms-op-vacio'), [{ opacity: 1 }, { opacity: 0 }], { delay: tt - 40, dur: 140, easing: 'linear' }));
      w(animar(b.querySelector('.ms-op-txt'), [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { delay: tt + 40, dur: 300 }));
      b.querySelectorAll('.ms-op-barra').forEach((x, k) => w(animar(x, [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: tt + 100 + k * 50, dur: 480 })));
      const tag = b.querySelector('.ms-op-tag');
      if (tag) w(animar(tag, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { delay: tt + 160, dur: 260 }));
      w(animar(b.querySelector('.ms-op-polvo'), [{ opacity: 0.9, transform: 'scaleX(.3)' }, { opacity: 0, transform: 'scaleX(1.7)' }], { delay: tt, dur: 520, fill: 'none' }));
      w(animar(b.querySelector('.ms-op-borde'), [{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 0 }], { delay: tt - 20, dur: T_MS.borde, easing: 'ease-out' }));
      // el golpe sordo: la carta se hunde y vuelve; el aviso suena cuando arranca a caer
      w(animar(b, [{ transform: 'none' }, { transform: 'translateY(4px)', offset: 0.25 }, { transform: 'none' }], { delay: tt, dur: 260, easing: 'ease-out' }));
      bt.esperar(t0).then((ya) => ya && sonido?.ding?.());
      bt.esperar(tt).then((ya) => ya && sonido?.golpe?.());
      const tp = bt.destello(tt);
      if (tp != null) amb.pulso('apuntar', tp);
    });
    // ---- la derecha: entra y recibe cada llegada (la luz de la org en la camiseta, el ping en tu lugar, la carta)
    heroe?.llegada({ w, tCae, tToca });
    // ---- el aura en reposo (vos en el mercado) y la cinta (el mundo se mueve mientras esperas)
    w(animar(aura, [{ opacity: 0 }, { opacity: 1 }], { delay: T_LL.reposo, dur: 200, easing: 'linear' }));
    w(animar(aura.querySelector('.ms-aura-escudo'), [{ opacity: 0, transform: 'scale(.8)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], { delay: T_LL.reposo, dur: 380 }));
    w(animar(aura.querySelector('.ms-aura-k'), [{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }], { delay: T_LL.reposo + 40, dur: 300 }));
    aura.querySelectorAll('.ms-aura-letra').forEach((l, j) => w(animar(l, [{ opacity: 0, transform: 'translateY(34%)' }, { opacity: 1, transform: 'none' }], { delay: T_LL.reposo + 60 + j * 16, dur: 300 })));
    aura.querySelectorAll('.ms-termino').forEach((t, j) => w(entrar(t, T_LL.reposo + 140 + j * 50, 10)));
    if (tira) w(animar(tira, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { delay: T_LL.cinta, dur: 420 }));
    bt.esperar(asentarseLl).then(() => {
      if (beats !== bt) return;
      entrando = false;
      amb.aquietar(true);
    });
    if (quieto()) amb.aquietar(true);
    bt.iniciar();
  }
  function saltarEntrada() {
    if (!entrando) return;
    entrando = false;
    beats?.saltar();
  }

  // ---------------------------------------------------------------------------------------------- firmar
  // FIRMAR (el BLOQUEAR del inicio): el contrato sube, la firma se traza, el sello cae con un golpe. El aura queda arriba
  // (los terminos ya estan ahi: el contrato no los repite).
  function firmar(i) {
    if (elegido || i < 0 || !ofertas[i]) return;
    saltarEntrada();
    clearTimeout(tAura);
    elegido = true;
    asentado = false;
    mostrar(i);
    const o = ofertas[i];
    const x = norm[i];
    const tono = tonos[i];
    const esLaReal = o.id === botElige && Boolean(datos.firma);
    const enc = resultados[o.id]?.inmediato?.encadenaOtraParada;
    const { panel, cab, grilla, cierre, inspector } = s;
    raiz.classList.add('ms-firmando');
    // el contrato tapa la cabeza y la grilla; abajo queda FIRMAR, ya en su estado de ceremonia (bloqueado)
    panel.style.setProperty('--ms-cierre', `${cierre.offsetHeight}px`);
    for (const n of [cab, grilla, inspector]) {
      n.setAttribute('inert', '');
      n.setAttribute('aria-hidden', 'true');
    }
    // ---- el contrato: quien firma con quien, la firma, el sello y a donde lleva
    const f = firmaLinea(yo.handle, 'ms-ct-firma');
    const onda = el('i', { class: 'ms-onda', 'aria-hidden': 'true' });
    const sello = el('span', { class: 'ms-sello', 'aria-hidden': 'true' }, [el('b', { text: 'Firmado' }), el('span', { text: `${yo.ventana} ${yo.anio}` }), onda]);
    const res = el('div', { class: 'ms-res', tabindex: '-1', 'aria-label': `Resultado: ${o.label}` }, [
      el('p', { class: 'ms-res-sigue' }, [icono('flecha'), el('span', { text: enc?.titulo ?? 'La prueba de ingreso' }), el('b', { text: `en ${o.org}` })]),
      el('p', { class: 'ms-res-texto', text: esLaReal ? 'En esta carrera, esta fue la elección. La prueba salió así:' : `Hasta acá llega esta muestra: el motor no jugó esta prueba, y no se inventa cómo salía. En esta carrera, la elección fue ${laReal?.org ?? 'otra'}.` }),
      el('div', { class: 'ms-res-botones' }, [
        datos.firma && laReal ? el('button', { type: 'button', class: 'mk-seguir', onclick: () => window.vitrina?.muestra('firma') }, [icono('firma'), esLaReal ? 'La firma' : `Ver lo que pasó en ${laReal.org}`, el('kbd', { text: 'Espacio' })]) : null,
        el('button', { type: 'button', class: 'res-otra', onclick: () => window.vitrina?.repetir() }, ['Volver a decidir', el('kbd', { text: 'R' })]),
      ]),
    ]);
    const contrato = el('article', { class: 'ms-contrato', 'data-tono': tono.id, 'aria-label': `Contrato con ${o.org}`, style: { '--ms-acento': `var(${tono.acento})`, '--ms-luz': `var(${tono.luz})` } }, [
      el('header', { class: 'ms-ct-cab' }, [
        el('span', { class: 'ms-ct-logo' }, pintarLogo(o.org, { tam: 54, alt: '' })),
        el('div', { class: 'ms-ct-quien' }, [
          el('p', { class: 'ms-ct-k', text: 'Contrato de jugador profesional' }),
          el('h2', { class: 'ms-ct-t' }, [el('span', { text: o.org }), el('i', { text: '×' }), el('span', { text: yo.handle })]),
          el('p', { class: 'ms-ct-sub', text: [ligaLarga(o.liga), periodo(yo.anio, x.anios), x.tipo ? `${x.tipo}${x.clausula ? ', con cláusula' : ''}` : null].filter(Boolean).join(' · ') }),
        ]),
      ]),
      el('div', { class: 'ms-ct-firmas' }, [
        el('div', { class: 'ms-ct-parte' }, [el('span', { class: 'ms-ct-sello-org', 'aria-hidden': 'true' }, pintarLogo(o.org, { tam: 34, alt: '' })), el('i', { class: 'ms-ct-linea' }), el('span', { class: 'ms-ct-firmante', text: `Por ${o.org}` })]),
        el('div', { class: 'ms-ct-parte ms-ct-vos' }, [f.nodo, sello, el('i', { class: 'ms-ct-linea' }), el('span', { class: 'ms-ct-firmante', text: `${yo.handle} · el jugador` })]),
      ]),
      res,
    ]);
    panel.append(contrato);
    // ---- un reloj para todo el momento
    beats?.destruir();
    const bt = crearBeats({ duracion: T_FIRMAR.duracion, asentarse: T_FIRMAR.asentarse });
    beats = bt;
    const w = (a) => bt.waapi(a);
    amb.aquietar(true);
    // lo apartado se apaga; el contrato sube y se llena de arriba abajo
    for (const n of [cab, grilla]) w(animar(n, [{ opacity: 1 }, { opacity: 0 }], { dur: T_FIRMAR.apaga, easing: 'linear' }));
    w(animar(inspector, [{ opacity: 1, visibility: 'visible' }, { opacity: 0, visibility: 'visible' }], { dur: T_FIRMAR.apaga, easing: 'linear' }));
    w(animar(contrato, [{ opacity: 0, transform: 'translateY(46px) scale(.98)' }, { opacity: 1, transform: 'none' }], { delay: T_FIRMAR.sube, dur: T_FIRMAR.subeDur }));
    [...contrato.querySelectorAll('.ms-ct-cab, .ms-ct-parte')].forEach((n, k) => w(entrar(n, T_FIRMAR.sube + 120 + k * 70, 8)));
    // la firma se traza y la rubrica
    w(trazar(f, T_FIRMAR.trazo, T_FIRMAR.trazoDur));
    w(rubricar(f, T_FIRMAR.rubrica, T_FIRMAR.rubricaDur));
    // el sello cae: acelera hasta el papel, se aplasta un poco y se asienta; el golpe: la onda y el papel que tiembla
    w(animar(sello, [
      { opacity: 0, transform: 'rotate(-15deg) scale(2.6)', easing: 'cubic-bezier(.55,0,1,.45)' },
      { opacity: 1, transform: 'rotate(-7deg) scale(.9)', offset: (T_FIRMAR.golpe - T_FIRMAR.sello) / T_FIRMAR.selloDur, easing: EXPO },
      { opacity: 1, transform: 'rotate(-7deg)' },
    ], { delay: T_FIRMAR.sello, dur: T_FIRMAR.selloDur, easing: 'linear' }));
    w(animar(onda, [{ opacity: 0, transform: 'scale(1)' }, { opacity: 0.9, transform: 'scale(1)', offset: 0.02 }, { opacity: 0, transform: 'scale(2.8)' }], { delay: T_FIRMAR.golpe, dur: T_FIRMAR.onda }));
    w(animar(contrato, [{ translate: '0 0' }, { translate: '0 4px', offset: 0.18 }, { translate: '-3px -1px', offset: 0.42 }, { translate: '2px 1px', offset: 0.7 }, { translate: '0 0' }], { delay: T_FIRMAR.golpe, dur: T_FIRMAR.sacude, easing: 'linear' }));
    const td = bt.destello(T_FIRMAR.golpe);
    if (td != null) amb.pulso('logro', td);
    bt.esperar(T_FIRMAR.golpe).then((llego) => llego && (sonido?.golpe?.(), sonido?.acorde?.()));
    // (§4.10) la derecha firma con el mismo golpe (la carta de la org recibe su sello)
    heroe?.firmar?.(i, { w, t: T_FIRMAR.golpe });
    // a donde lleva: la prueba de ingreso (lo que dice el motor para TODAS); con LOUD, lo que paso de verdad
    w(animar(res, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay: T_FIRMAR.resultado, dur: DUR.larga }));
    [...res.children].forEach((c, k) => w(entrar(c, T_FIRMAR.resultado + 80 + k * 70, 8)));
    bt.esperar(T_FIRMAR.asentarse).then(() => {
      if (beats !== bt) return;
      asentado = true;
      res.focus({ preventScroll: true });
    });
    if (esLaReal) bt.esperar(T_FIRMAR.encadena).then((llego) => llego && beats === bt && raiz.isConnected && window.vitrina?.muestra('firma'));
    bt.iniciar();
    if (quieto()) {
      asentado = true;
      res.focus({ preventScroll: true });
    }
  }
  function saltarFirma() {
    if (!elegido || asentado) return;
    beats?.saltar();
    asentado = true;
    raiz.querySelector('.ms-res')?.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------------------------------------- teclado
  // 1-6 eligen (y apuntan), Tab recorre la grilla, Enter firma (lo escucha el boton de ceremonia.js), Espacio saltea.
  // Las flechas izquierda y derecha son de final.html: aca no se usan.
  function tecla(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (entrando && !elegido && e.code === 'Space') {
      e.preventDefault();
      saltarEntrada();
    } else if (elegido && !asentado && !e.repeat && (e.key === 'Enter' || e.code === 'Space')) {
      // el Enter que firma lo consume el boton (js/ceremonia.js): ese mismo evento no llega aca; el siguiente saltea
      e.preventDefault();
      saltarFirma();
    } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= ofertas.length && !elegido) {
      e.preventDefault();
      elegir1(Number(e.key) - 1, { mover: true });
    } else if (e.code === 'Space' && elegido && asentado && laReal && datos.firma) {
      e.preventDefault();
      window.vitrina?.muestra('firma');
    } else if ((e.key === 'r' || e.key === 'R') && elegido) window.vitrina?.repetir();
  }
  raiz.addEventListener('click', (e) => {
    if (elegido && !asentado && !e.target.closest('button')) saltarFirma();
    // (§4.10) un clic afuera de los escudos y los botones mientras llegan: llegan todas
    else if (entrando && !elegido && !e.target.closest('button, a, input, select, summary')) saltarEntrada();
  });
  const alRedimensionar = () => {
    const nom = s?.aura.querySelector('.ms-aura-nombre');
    if (nom) ajustarLetra(nom);
  };
  addEventListener('resize', alRedimensionar);

  construir();
  return {
    nodo: raiz,
    entrar() {
      ajustarLetra(s.aura.querySelector('.ms-aura-nombre'));
      entrada();
    },
    // elegir(n) (el panel de la vitrina, las tiras): elige la oferta n y la firma
    elegir(n) {
      if (elegido || !ofertas[n - 1]) return;
      elegir1(n - 1);
      s.boton.bloquear();
    },
    tecla,
    // vuelve a pasar la pantalla en el lugar (sincrono: la tira de capturas congela la entrada desde el cuadro 0)
    repetir() {
      construir();
      ponerTono(tonoReposo());
      amb.aquietar(false);
      entrada();
    },
    // la era cambia (el panel): el reposo la sigue; una org apuntada se queda con su tono
    alCambiarEra(era) {
      if (mostrada == null) aplicarTono(html, tonoEra(era));
      heroe?.alCambiarEra?.();
    },
    congelar: (ms) => beats?.congelar(ms),
    pausar: () => beats?.pausar(),
    reanudar: () => beats?.reanudar(),
    listo: () => logosListos(raiz),
    destruir() {
      vivo = false;
      clearTimeout(tAura);
      removeEventListener('resize', alRedimensionar);
      beats?.destruir();
    },
    // (§4.10) sin campeon en el mercado: la derecha es el heroe de la variante y el mundo es solo luz en el tono. Con
    // var=campeon, el arte de §4.9 (TU MAIN, teñido del tono de la org apuntada)
    arte: conHeroe ? null : datos.inicio?.jugador?.mains?.[0]?.ddragon ?? 'Yone',
    tono: tonoEra(estado?.eraEfectiva),
    animo: 'normal',
    encuadre: 'derecha',
    velo: 0.55,
  };
}

// ================================================================================================= la firma, linea
// EL ANUNCIO: un walkout de ~4,5 s con un solo reloj (beats.js). Espacio salta al asentarse; con INST o movimiento
// reducido, el cuadro final.
//   0-620      apagon, y un haz de luz que baja
//   300-1150   en el haz, la region y el logo de la liga; despues el glifo del rol, que gira
//   1150-1430  la liga, la region y el rol suben al rotulo
//   1440       EL GOLPE: el logo de la org entra con una onda de choque y la pantalla se inunda de su tono (la paleta del
//              mundo cruza en 260 ms; un destello, por beats); el apagon se barre en diagonal y aparece tu main en su
//              bitono (el 70 % de color lo pone la politica del momento)
//   1840-2360  el logo viaja a su lugar
//   1990-2800  el handle gigante, letra por letra con peso; 2500-3580 la firma se traza encima
//   2950-3750  los terminos como placas de transmision (placaInferior)
//   3450-4300  "LOUD DA LA BIENVENIDA A …", el confeti en los colores de la org y el loop vivo (la lluvia, el halo del
//              logo, el haz que se mece y el brillo que cruza el handle)
const T_FL = {
  duracion: 4600, asentarse: 4300,
  haz: 60, hazDur: 560,
  liga: 300, ligaDur: 420,
  rol: 600, rolDur: 320, giro: 650, giroDur: 560,
  sube: 1150, subeDur: 280,
  rotulo: 1300,
  golpe: 1440, cruce: 260, inundaDur: 1300, ondaDur: 720, ondaPaso: 110,
  barre: 1480, barreDur: 640,
  logoDur: 920, logoLlega: 0.14, logoQueda: 0.43,
  handle: 1990, letraPaso: 55, letraDur: 400, impacto: 0.6,
  trazo: 2500, trazoDur: 950, rubrica: 3200, rubricaDur: 380,
  placas: 2950, placaPaso: 170, placaDur: 460,
  bienvenida: 3450, bienvenidaDur: 520,
  confeti: 3500, cortina: 3620, lluvia: 4300,
  log: 3750, seguir: 3900,
  lsCruce: 900,
  halo: 2420, haloPeriodo: 3200, mecer: 2200, mecerPeriodo: 7000, brillo: 4400, brilloPeriodo: 5600,
};
// La escena del mundo en la firma: la de la era del Mundial (el abanico de haces mas abierto y las brasas que suben). Solo la
// escena: los colores son los del tono de la org (la paleta). Medido contra el escenario, la pieza, la academia y la
// leyenda: con el verde de LOUD, el escenario lavaba la cara de tu main; el Mundial la deja leer y da profundidad.
const ERA_FIRMA = 'mundial';
// el logo en el centro del haz (fraccion del alto de la pantalla) y cuanto crece ahi
const LOGO_CENTRO = 0.46;
const LOGO_ESCALA = 2.2;
// el confeti de la bienvenida: "un poco" (en el celular, menos)
const CONFETI_FIRMA = 130;
const CONFETI_CELULAR = 0.6;
const CALMA_FIRMA = { dur: 600, alfa: 0.16 };

function crearFirmaLinea({ datos, muestra, amb, sonido, peor, estado }) {
  const f = datos[muestra];
  const pc = peor ? datos.peorCaso : null;
  const handle = pc?.handle ?? f.franja?.quien?.handle ?? datos.inicio?.jugador?.handle ?? '';
  const org = pc?.org?.nombre ?? f.org;
  const c = f.contrato ?? {};
  const liga = pc?.org?.liga ?? c.liga ?? f.liga;
  const anios = c.anios ?? f.anios;
  const monto = c.salarioAnualUSD ?? f.sueldoAnualUSD;
  const tipo = c.tipo ?? f.tipoDeContrato;
  const rol = f.franja?.quien?.rol ?? datos.inicio?.jugador?.rol ?? 'mid';
  const rolEtiqueta = f.franja?.quien?.rolEtiqueta ?? datos.inicio?.jugador?.rolEtiqueta ?? '';
  const region = regionDe(datos, liga);
  const valor = datos.mercado?.vosEnElMercado?.valorUSD;
  const tono = tonoOrgLinea(org);
  const tonoAntes = tonoEra(estado?.eraEfectiva);
  const bienvenida = `${org} da la bienvenida a ${handle}`;

  const raiz = el('section', { class: 'takeover ms-firma', 'data-pieza': 'cumbre', 'data-fase': 'firma', 'data-op': 'linea', 'aria-labelledby': 'ms-fm-handle' });
  aplicarTono(raiz, tono);
  // ---- las capas: el apagon, la inundacion, el haz, la onda, el confeti y el velo de lectura
  const negro = el('div', { class: 'ms-fm-negro', 'aria-hidden': 'true' });
  const inunda = el('div', { class: 'ms-fm-inunda', 'aria-hidden': 'true' });
  const haz = el('div', { class: 'ms-fm-haz', 'aria-hidden': 'true' });
  const ondas = [0, 1].map(() => el('i', { class: 'ms-fm-onda', 'aria-hidden': 'true' }));
  const velo = el('div', { class: 'ms-fm-velo', 'aria-hidden': 'true' });
  // ---- en el haz: la liga, la region y el rol (decorativos: el rotulo los dice)
  const introLiga = el('div', { class: 'ms-fm-intro-liga' }, [pintarLogo(liga, { liga: true, tam: 120, alt: '' }), el('b', { class: 'ms-fm-region', text: region || liga }), el('span', { class: 'ms-fm-region-k', text: `${ligaLarga(liga)} ${f.anio}` })]);
  const introRol = el('div', { class: 'ms-fm-intro-rol' }, [glifoRol(rol, 'glifo-rol ms-fm-glifo'), el('span', { text: rolEtiqueta })]);
  const intro = el('div', { class: 'ms-fm-intro', 'aria-hidden': 'true' }, [introLiga, introRol]);
  // ---- el bloque: el rotulo, el logo, el handle con la firma, la bienvenida, las placas
  const kicker = el('p', { class: 'ms-fm-k' }, [
    el('span', { class: 'ms-fm-k-liga' }, [pintarLogo(liga, { liga: true, tam: 20, alt: '' }), region ? el('b', { text: region }) : null, el('span', { text: `${ligaLarga(liga)} ${f.anio}` })]),
    el('span', { class: 'ms-fm-k-rol' }, [glifoRol(rol), el('span', { text: rolEtiqueta })]),
    el('span', { text: 'Primer contrato' }),
  ]);
  const halo = el('i', { class: 'ms-fm-halo', 'aria-hidden': 'true' });
  const logo = el('div', { class: 'ms-fm-logo' }, [halo, pintarLogo(org, { tam: 150, alt: org })]);
  const letras = handle.split('').map((ch) => el('span', { class: 'ms-fm-letra', text: ch }));
  const brillo = el('span', { class: 'ms-fm-brillo', 'aria-hidden': 'true', text: handle });
  const firma = firmaLinea(handle, 'ms-fm-firma');
  firma.nodo.setAttribute('aria-hidden', 'true');
  const nombre = el('h1', { class: 'ms-fm-handle', id: 'ms-fm-handle', 'data-foco': '', tabindex: '-1', 'aria-label': bienvenida }, [el('span', { class: 'ms-fm-letras', 'aria-hidden': 'true' }, letras), brillo]);
  const cabeza = el('div', { class: 'ms-fm-cabeza' }, [nombre, firma.nodo]);
  const linea = el('p', { class: 'ms-fm-bienvenida', 'aria-hidden': 'true' }, el('span', { text: bienvenida }));
  const placas = el('div', { class: 'ms-fm-placas' }, [
    placaInferior({ rotulo: 'Primer contrato', titulo: `USD ${num(monto)} / año`, sub: valor ? `${fmt1.format(monto / valor)}× tu valor de mercado (${num(valor)})` : '', tono }),
    placaInferior({ rotulo: `${ligaLarga(liga)} ${f.anio}`, titulo: aniosTxt(anios), sub: [tipo ? `${tipo[0].toUpperCase()}${tipo.slice(1)}` : null, c.clausula ? 'con cláusula de salida' : 'sin cláusula de salida'].filter(Boolean).join(' · '), tono }),
  ]);
  const log = el('p', { class: 'ms-fm-log', text: conOrg(f.log?.message ?? '', pc ? f.org : null, org) });
  const otros = el('ul', { class: 'sr', 'aria-label': 'El resto del mercado' }, (f.logsDelMercado ?? []).slice(2).map((l) => el('li', { text: conOrg(l.message, pc ? f.org : null, org) })));
  const seguir = el('button', { type: 'button', class: 'tk-seguir ms-fm-seguir', onclick: (e) => (e.stopPropagation(), window.vitrina?.repetir()) }, ['Otra vez', el('kbd', { text: 'R' })]);
  const bloque = el('div', { class: 'ms-fm-bloque' }, [kicker, logo, cabeza, linea, placas, log, otros, seguir]);
  // ---- el confeti de la bienvenida: los colores de la org (y el blanco), desde abajo a los costados
  const confeti = crearConfeti(el('canvas', { class: 'cu-confeti ms-fm-confeti', 'aria-hidden': 'true' }), {
    colores: [tono.luz, tono.contra, '--luz-blanca'],
    semilla: `firma-${org}-${handle}`,
    cantidad: Math.round(CONFETI_FIRMA * (celular() ? CONFETI_CELULAR : 1)),
    calma: { desde: T_FL.bienvenida, dur: CALMA_FIRMA.dur, alfa: CALMA_FIRMA.alfa, zonas: () => [bloque.getBoundingClientRect()] },
    origenes: [
      { tipo: 'canon', x: 0, y: 1.02, angulo: 24, t: T_FL.confeti },
      { tipo: 'canon', x: 1, y: 1.02, angulo: -24, t: T_FL.confeti },
      { tipo: 'cortina', t: T_FL.cortina },
      { tipo: 'lluvia', t: T_FL.lluvia },
    ],
  });
  raiz.append(negro, haz, inunda, velo, ...ondas, confeti.nodo, intro, bloque);

  let beats = null;
  let asentado = false;
  // el handle entra en su ancho (un handle de 16 letras no puede romper la pantalla)
  const ajustar = () => ajustarLetra(nombre, { min: LETRA_MIN });
  addEventListener('resize', ajustar);

  function secuencia() {
    beats?.destruir({ participantes: false });
    const bt = crearBeats({ duracion: T_FL.duracion, asentarse: T_FL.asentarse });
    beats = bt;
    asentado = false;
    const w = (a) => bt.waapi(a);
    bt.agregar(confeti);
    ajustar();
    // ---- el mundo: a oscuras en el tono de antes; en el golpe, el tono de la org y el publico
    amb.ambiente({ era: ERA_FIRMA, animo: 'normal', paleta: paletaDe(tonoAntes), lightsticks: 0, instantaneo: true });
    amb.ambiente({ paleta: paletaDe(tono), cruce: T_FL.cruce, retardo: T_FL.golpe });
    amb.ambiente({ lightsticks: 1, cruce: T_FL.lsCruce, retardo: T_FL.golpe });
    const golpe = bt.destello(T_FL.golpe);
    if (golpe != null) amb.pulso('golpe', golpe);
    const sonar = (ms, fn) => bt.esperar(ms).then((llego) => llego && fn());
    if (!inst() && !reducido()) {
      sonido?.barrido?.();
      sonar(T_FL.golpe, () => (sonido?.golpe?.(), sonido?.flash?.()));
      sonar(T_FL.confeti, () => sonido?.confeti?.());
      sonar(T_FL.bienvenida, () => sonido?.acorde?.());
    }
    // ---- 0: el apagon, y el haz que baja
    w(animar(negro, [
      { opacity: 1, clipPath: 'polygon(-40% 0, 140% 0, 140% 100%, -60% 100%)', easing: 'linear' },
      { opacity: 1, clipPath: 'polygon(-40% 0, 140% 0, 140% 100%, -60% 100%)', offset: T_FL.barre / (T_FL.barre + T_FL.barreDur), easing: 'cubic-bezier(.6,0,.3,1)' },
      { opacity: 1, clipPath: 'polygon(140% 0, 140% 0, 140% 100%, 120% 100%)' },
    ], { dur: T_FL.barre + T_FL.barreDur, easing: 'linear' }));
    w(animar(haz, [
      { opacity: 0, transform: 'translateX(-50%) scaleY(0)', easing: EXPO },
      { opacity: 1, transform: 'translateX(-50%) scaleY(1)', offset: T_FL.hazDur / T_FL.golpe, easing: 'linear' },
      { opacity: 1, transform: 'translateX(-50%) scaleY(1)', offset: 0.97, easing: 'ease-out' },
      { opacity: 0.16, transform: 'translateX(-50%) scaleY(1)' },
    ], { delay: T_FL.haz, dur: T_FL.golpe - T_FL.haz + 200, easing: 'linear' }));
    // ---- la liga y la region en el haz; el rol que gira; despues suben al rotulo
    const sube = { opacity: 0, transform: 'translateY(-26vh) scale(.3)', filter: 'blur(6px)' };
    w(animar(introLiga, [
      { opacity: 0, transform: 'scale(.82)', filter: 'blur(10px)', easing: EXPO },
      { opacity: 1, transform: 'none', filter: 'blur(0px)', offset: T_FL.ligaDur / (T_FL.sube + T_FL.subeDur - T_FL.liga), easing: 'linear' },
      { opacity: 1, transform: 'none', filter: 'blur(0px)', offset: (T_FL.sube - T_FL.liga) / (T_FL.sube + T_FL.subeDur - T_FL.liga), easing: 'cubic-bezier(.6,0,.4,1)' },
      sube,
    ], { delay: T_FL.liga, dur: T_FL.sube + T_FL.subeDur - T_FL.liga, easing: 'linear' }));
    w(animar(introRol, [
      { opacity: 0, transform: 'translateY(14px)', easing: EXPO },
      { opacity: 1, transform: 'none', offset: T_FL.rolDur / (T_FL.sube + T_FL.subeDur - T_FL.rol), easing: 'linear' },
      { opacity: 1, transform: 'none', offset: (T_FL.sube - T_FL.rol) / (T_FL.sube + T_FL.subeDur - T_FL.rol), easing: 'cubic-bezier(.6,0,.4,1)' },
      sube,
    ], { delay: T_FL.rol, dur: T_FL.sube + T_FL.subeDur - T_FL.rol, easing: 'linear' }));
    w(animar(introRol.querySelector('.ms-fm-glifo'), [{ transform: 'perspective(400px) rotateY(-180deg)' }, { transform: 'perspective(400px) rotateY(360deg)' }], { delay: T_FL.giro, dur: T_FL.giroDur, easing: 'cubic-bezier(.3,.6,.25,1)' }));
    w(animar(kicker, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { delay: T_FL.rotulo, dur: 360 }));
    kicker.querySelectorAll(':scope > span').forEach((x, k) => w(entrar(x, T_FL.rotulo + 60 + k * 70, -6)));
    // ---- 1500: EL GOLPE. El logo entra en el centro del haz (medido: su lugar final es el del bloque) y viaja a su lugar
    const r = logo.getBoundingClientRect();
    const dx = Math.round(innerWidth / 2 - (r.left + r.width / 2));
    const dy = Math.round(innerHeight * LOGO_CENTRO - (r.top + r.height / 2));
    const enCentro = (k) => `translate(${dx}px, ${dy}px) scale(${k})`;
    w(animar(logo, [
      { opacity: 0, transform: enCentro(LOGO_ESCALA * 1.6), filter: 'blur(12px)', easing: 'cubic-bezier(.2,.9,.25,1)' },
      { opacity: 1, transform: enCentro(LOGO_ESCALA), filter: 'blur(0px)', offset: T_FL.logoLlega, easing: 'linear' },
      { opacity: 1, transform: enCentro(LOGO_ESCALA * 0.96), filter: 'blur(0px)', offset: T_FL.logoQueda, easing: 'cubic-bezier(.6,0,.2,1)' },
      { opacity: 1, transform: 'none', filter: 'blur(0px)' },
    ], { delay: T_FL.golpe, dur: T_FL.logoDur, easing: 'linear' }));
    ondas.forEach((o, k) => w(animar(o, [{ opacity: 0, transform: 'translate(-50%, -50%) scale(.2)' }, { opacity: 0.95, transform: 'translate(-50%, -50%) scale(.24)', offset: 0.02 }, { opacity: 0, transform: 'translate(-50%, -50%) scale(4.6)' }], { delay: T_FL.golpe + 60 + k * T_FL.ondaPaso, dur: T_FL.ondaDur - k * 120, easing: 'cubic-bezier(.15,.7,.3,1)' })));
    if (golpe != null) w(animar(inunda, [{ opacity: 0 }, { opacity: 0.92, offset: 0.06 }, { opacity: 0.34, offset: 0.4 }, { opacity: 0 }], { delay: golpe, dur: T_FL.inundaDur, easing: 'ease-out' }));
    // ---- el handle gigante, letra por letra con peso, y la firma que se traza encima
    letras.forEach((l, i) => {
      const t0 = T_FL.handle + i * T_FL.letraPaso;
      w(animar(l, [
        { opacity: 0, transform: 'translateY(-70%) scale(1.06, 1.3)', filter: 'blur(6px)', easing: 'cubic-bezier(.55,0,.9,.4)' },
        { opacity: 1, transform: 'translateY(3%) scale(1.1, .82)', filter: 'blur(0px)', offset: T_FL.impacto, easing: 'cubic-bezier(.2,.7,.3,1)' },
        { opacity: 1, transform: 'translateY(-2%) scale(.98, 1.04)', filter: 'blur(0px)', offset: 0.82 },
        { opacity: 1, transform: 'none', filter: 'blur(0px)' },
      ], { delay: t0, dur: T_FL.letraDur, easing: 'linear' }));
    });
    const golpeLetra = T_FL.handle + T_FL.letraDur * T_FL.impacto;
    sonar(golpeLetra, () => sonido?.golpe?.());
    sonar(golpeLetra + (letras.length - 1) * T_FL.letraPaso, () => sonido?.golpe?.());
    w(trazar(firma, T_FL.trazo, T_FL.trazoDur));
    w(rubricar(firma, T_FL.rubrica, T_FL.rubricaDur));
    // ---- los terminos como placas de transmision, la bienvenida, el registro del motor y "otra vez"
    [...placas.children].forEach((p, k) => w(animar(p, [{ opacity: 0, clipPath: 'inset(0 100% 0 0)', transform: 'translateX(-14px)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'none' }], { delay: T_FL.placas + k * T_FL.placaPaso, dur: T_FL.placaDur })));
    w(animar(linea.firstElementChild, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: T_FL.bienvenida, dur: T_FL.bienvenidaDur }));
    w(entrar(log, T_FL.log, 8));
    w(entrar(seguir, T_FL.seguir, 6));
    // ---- el loop vivo: el halo del logo respira, el haz se mece, el brillo cruza el handle (y la lluvia del confeti)
    w(animarLoop(halo, [{ opacity: 0.55, transform: 'scale(.94)' }, { opacity: 1, transform: 'scale(1.06)' }], { delay: T_FL.halo, duration: T_FL.haloPeriodo, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));
    w(animarLoop(haz, [{ rotate: '-2.2deg' }, { rotate: '2.2deg' }], { delay: T_FL.mecer, duration: T_FL.mecerPeriodo, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));
    w(animarLoop(brillo, [{ backgroundPosition: '160% 0', opacity: 1 }, { backgroundPosition: '-60% 0', opacity: 1, offset: 0.2 }, { backgroundPosition: '-60% 0', opacity: 1 }], { delay: T_FL.brillo, duration: T_FL.brilloPeriodo, iterations: Infinity, easing: 'cubic-bezier(.4,0,.2,1)' }));
    bt.esperar(T_FL.asentarse).then(() => {
      if (beats === bt) asentado = true;
    });
    bt.iniciar();
    if (bt.quieto) asentado = true;
  }
  // Espacio: al asentarse. Si el golpe todavia no llego, el mundo va ya al tono de la org (la paleta ya iba hacia ese
  // tono, programada: con la misma no cambia nada, por eso va con una presencia apenas distinta)
  function saltar() {
    if (asentado || !beats) return;
    if (beats.ahora() < T_FL.golpe) {
      amb.ambiente({ paleta: paletaDe(tono, 0.999), instantaneo: true });
      amb.ambiente({ lightsticks: 1, cruce: T_FL.lsCruce });
    }
    beats.saltar();
    asentado = true;
  }
  raiz.addEventListener('click', () => (asentado ? null : saltar()));

  return {
    nodo: raiz,
    entrar: secuencia,
    repetir: secuencia,
    tecla(e) {
      if ((e.code === 'Space' || e.key === 'Enter') && !asentado) {
        e.preventDefault();
        saltar();
      } else if (e.key === 'r' || e.key === 'R') window.vitrina?.repetir();
    },
    congelar: (ms) => beats?.congelar(ms),
    pausar: () => beats?.pausar(),
    reanudar: () => beats?.reanudar(),
    listo: () => logosListos(raiz),
    destruir() {
      removeEventListener('resize', ajustar);
      beats?.destruir({ participantes: false });
      confeti.destruir?.();
    },
    arte: datos.inicio?.jugador?.mains?.[0]?.ddragon ?? 'Yone',
    // el CSS va en el tono de la org desde el principio (el apagon lo tapa); el mundo arranca en el de antes y se inunda
    tono,
    paleta: paletaDe(tonoAntes),
    era: ERA_FIRMA,
    animo: 'normal',
    encuadre: 'firma',
    velo: 0.45,
  };
}
