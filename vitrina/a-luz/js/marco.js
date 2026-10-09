// El marco comun de las paradas: la franja superior (56 px), la trayectoria minima (28 px), el panel de contexto
// ("vos") como placa translucida, y la barra de cuartos del celular.
import { el, num, odometro, entrar } from './util.js';
import { icono, glifoRol, triangulos } from './iconos.js';

const ANIO_INICIO = 2026;

// ---------- franja ----------
export function franja(f, { peor } = {}) {
  const handle = peor?.handle ?? f.quien.handle;
  const org = peor?.org ?? f.club?.org ?? null;
  const n = f.numero ?? {};
  const delta = typeof n.antes === 'number' && typeof n.valor === 'number' && n.tipo !== 'rango' ? Math.round(n.valor) - Math.round(n.antes) : 0;
  const pips = f.cuando?.pips;
  const numero =
    n.tipo === 'rango'
      ? el('b', { class: 'fr-num fr-rango', 'data-campo': 'ranked', text: n.texto })
      : el('b', { class: 'fr-num', 'data-campo': 'nivel', text: num(n.valor ?? 0) });
  return el('header', { class: 'franja', 'aria-label': 'Tu carrera ahora' }, [
    el('div', { class: 'fr-quien' }, [glifoRol(f.quien.rol), el('b', { class: 'fr-handle', text: handle }), el('span', { class: 'fr-rol', text: f.quien.rolEtiqueta })]),
    el('div', { class: 'fr-club' }, [el('span', { class: 'chip-org' + (org ? '' : ' sin-org'), text: org ?? f.club?.fase ?? '—' })]),
    el('div', { class: 'fr-cuando' }, [
      el('span', { text: f.cuando.edadTexto }),
      el('span', { class: 'fr-anio', text: f.cuando.anioEtiqueta }),
      f.cuando.ventana ? el('span', { class: 'fr-ventana', text: f.cuando.ventana.texto }) : null,
      pips ? el('span', { class: 'pips', 'aria-label': `semana ${pips.actual + 1} de ${pips.total}` }, Array.from({ length: pips.total }, (_, i) => el('i', { class: i <= pips.actual ? 'on' : '' }))) : null,
    ]),
    el('div', { class: 'fr-numero' }, [
      el('span', { class: 'fr-rotulo', text: n.tipo === 'rango' ? 'SoloQ' : n.tipo === 'pico' ? 'Pico' : 'Nivel' }),
      numero,
      delta ? el('span', { class: `fr-delta ${delta > 0 ? 'sube' : 'baja'}` }, [triangulos('baja', delta > 0 ? '+' : '-'), String(Math.abs(delta))]) : null,
      n.bandaTexto ? el('span', { class: 'fr-banda', text: n.bandaTexto }) : null,
    ]),
  ]);
}

// ---------- trayectoria minima: de los 15 al presente ----------
export function trayectoria(historia, anioActual, edadActual) {
  const inicio = anioActual - (edadActual - 15);
  const segs = [];
  const primero = historia?.[0]?.desdeAnio ?? anioActual;
  if (primero > inicio) segs.push({ org: 'Amateur', desde: inicio, hasta: Math.min(primero, anioActual), amateur: true });
  for (const h of historia ?? []) {
    if (h.desdeAnio > anioActual) break;
    segs.push({ org: h.org, desde: h.desdeAnio, hasta: Math.min(h.hastaAnio, anioActual), tier: h.tier });
  }
  const total = Math.max(1, anioActual - inicio);
  const nodo = el('nav', { class: 'trayectoria', 'aria-label': `Tu carrera desde los 15: ${segs.map((s) => s.org).join(', ')}` });
  nodo.append(el('span', { class: 'tr-edad', text: '15' }));
  const cinta = el('div', { class: 'tr-cinta' });
  segs.forEach((s, i) => {
    const ancho = Math.max(0.6, s.hasta - s.desde);
    cinta.append(el('span', { class: 'tr-seg' + (i === segs.length - 1 ? ' actual' : '') + (s.amateur ? ' amateur' : ''), style: { flexGrow: String(ancho) }, title: `${s.org} · ${s.desde}–${s.hasta}` }, el('em', { text: s.org })));
  });
  if (segs.length === 0) cinta.append(el('span', { class: 'tr-seg actual amateur', style: { flexGrow: '1' } }, el('em', { text: 'Amateur' })));
  nodo.append(cinta, el('span', { class: 'tr-hoy', text: `${edadActual} · ${anioActual}` }));
  nodo.style.setProperty('--tr-total', String(total));
  return nodo;
}

// ---------- panel de contexto: "vos" ----------
function fila(campo, rotulo, valor, estado, { delta = 0, piso, techo, max = 100, ico } = {}) {
  const meter = el('span', { class: 'medidor', 'aria-hidden': 'true' }, [
    piso != null ? el('i', { class: 'banda', style: { left: `${(piso / max) * 100}%`, width: `${((techo - piso) / max) * 100}%` } }) : null,
    el('i', { class: 'valor', style: { width: `${Math.min(100, (valor / max) * 100)}%` } }),
  ]);
  return el('div', { class: 'ctx-fila', 'data-campo': campo }, [
    el('span', { class: 'ctx-rotulo' }, [ico ? icono(ico) : null, rotulo]),
    el('b', { class: 'ctx-valor', text: num(valor) }),
    el('span', { class: 'ctx-estado' }, [
      estado ?? '',
      delta ? el('span', { class: `ctx-delta ${delta > 0 ? 'sube' : 'baja'}` }, [triangulos('baja', delta > 0 ? '+' : '-'), String(Math.abs(delta))]) : null,
      piso != null ? el('span', { class: 'ctx-rango', text: `${piso}–${techo}` }) : null,
    ]),
    meter,
  ]);
}

export function contexto(m, { peor } = {}) {
  const f = m.ficha;
  const j = f.jugador ?? {};
  const amateur = j.fase === 'amateur';
  const placa = el('aside', { class: 'contexto', id: 'contexto', 'aria-label': 'Contexto: vos' });
  placa.append(el('p', { class: 'ctx-kicker' }, [el('span', { text: 'Vos' }), el('span', { text: `${j.edad ?? m.edad} años · ${m.anio}` })]));
  // La cabeza de la placa dice lo que la franja NO dice: si la franja ya muestra el nivel, aca va la jerarquia.
  const nivelEnFranja = m.franja?.numero?.tipo === 'nivel';
  const jer = f.jerarquia;
  const cab = nivelEnFranja
    ? el('div', { class: 'ctx-cabeza' }, [
        el('div', { class: 'ctx-grande', 'data-campo': 'jerarquia' }, [el('span', { class: 'ctx-rotulo', text: 'Jerarquía' }), el('b', { class: 'ctx-numero', text: num(jer.valor) })]),
        el('div', { class: 'ctx-lado' }, [
          el('span', { class: 'ctx-banda', text: jer.label }),
          el('span', { class: 'ctx-sub', text: `en ${peor?.org ?? j.org} · banda ${jer.piso}–${jer.techo}` }),
        ]),
        el('span', { class: 'medidor ctx-medidor', 'aria-hidden': 'true' }, [el('i', { class: 'banda', style: { left: `${jer.piso}%`, width: `${jer.techo - jer.piso}%` } }), el('i', { class: 'valor', style: { width: `${jer.valor}%` } })]),
      ])
    : el('div', { class: 'ctx-cabeza' }, [
        el('div', { class: 'ctx-grande', 'data-campo': 'nivel' }, [el('span', { class: 'ctx-rotulo', text: 'Nivel' }), el('b', { class: 'ctx-numero', text: num(f.nivel) })]),
        el('div', { class: 'ctx-lado' }, [el('span', { class: 'ctx-banda', text: amateur ? 'Amateur' : f.jerarquia.label }), el('span', { class: 'ctx-sub', text: 'tu nivel de juego, de 100' })]),
      ]);
  placa.append(cab);
  const filas = el('div', { class: 'ctx-filas' });
  if (amateur) {
    filas.append(
      fila('studies', 'Estudios', j.estudios, null, { ico: 'studies' }),
      fila('sleep', 'Sueño', j.sueno, null, { ico: 'sleep' }),
      fila('familyTrust', 'Casa', j.confianzaFamiliar, 'confianza', { ico: 'familyTrust' }),
      fila('mentalidad', 'Cabeza', f.mentalidad.valor, f.mentalidad.label, { delta: f.mentalidad.delta, ico: 'mentalidad' }),
      fila('hype', 'Hype', f.hype.valor, f.hype.label, { delta: f.hype.delta, ico: 'hype' }),
    );
  } else {
    filas.append(
      fila('hype', 'Hype', f.hype.valor, f.hype.label, { delta: f.hype.delta, ico: 'hype' }),
      fila('mentalidad', 'Cabeza', f.mentalidad.valor, f.mentalidad.label, { delta: f.mentalidad.delta, ico: 'mentalidad' }),
      fila('arraigo', 'Arraigo', f.arraigo.valor, f.arraigo.label, { piso: f.arraigo.piso, techo: f.arraigo.techo, ico: 'arraigo' }),
    );
  }
  placa.append(filas);
  const pie = el('div', { class: 'ctx-pie' });
  if (f.duelo) {
    pie.append(el('p', { class: 'ctx-duelo' }, [el('span', { class: 'ctx-rotulo', text: 'Duelo' }), el('b', { text: `${f.duelo.tuyos}–${f.duelo.suyos}` }), el('span', { text: `vs ${f.duelo.handle} · ${f.duelo.org}` })]));
  }
  if (j.contrato?.org) {
    const r = j.contrato.aniosRestantes;
    pie.append(el('p', { class: 'ctx-duelo' }, [el('span', { class: 'ctx-rotulo', text: 'Contrato' }), el('b', { text: String(r) }), el('span', { text: `${r === 1 ? 'año más' : 'años más'} en ${peor?.org ?? j.contrato.org}` })]));
  }
  if (j.campeonDelSplit) pie.append(el('p', { class: 'ctx-duelo' }, [el('span', { class: 'ctx-rotulo', text: 'Split' }), el('b', { class: 'campeon-foco', 'data-campeon': j.campeonDelSplit, tabindex: '0', text: j.campeonDelSplit }), el('span', { text: 'tu campeón de este split' })]));
  if (pie.childElementCount) placa.append(pie);
  return placa;
}

// Hace rodar en el panel (y en la franja) los numeros que el resultado cambio.
export function rodarContexto(raiz, cambios, delay) {
  for (const c of cambios) {
    const campo = c.campo.split('.').pop();
    const nodo = raiz.querySelector(`.contexto [data-campo="${campo}"] .ctx-valor, .contexto [data-campo="${campo}"] .ctx-numero`);
    if (!nodo || typeof c.antes !== 'number') continue;
    const a = Math.round(c.antes);
    const b = Math.round(c.despues);
    if (a === b) continue;
    odometro(nodo, a, b, { delay });
    const filaN = nodo.closest('[data-campo]');
    filaN.classList.add(b > a ? 'cambio-sube' : 'cambio-baja');
    const barra = filaN.querySelector('.medidor .valor');
    if (barra) barra.style.width = `${Math.min(100, b)}%`;
  }
}

// ---------- barra de cuartos (celular) ----------
export function cuartos(activo = 'vos', alVos) {
  const items = ['Vos', 'Temporada', 'Equipo', 'Mundo', 'Carrera', 'Crónica'];
  return el(
    'nav',
    { class: 'cuartos', 'aria-label': 'Cuartos' },
    items.map((t) =>
      el('button', { type: 'button', class: 'cuarto' + (t.toLowerCase() === activo ? ' activo' : ''), 'aria-current': t.toLowerCase() === activo ? 'page' : null, onclick: t === 'Vos' ? alVos : null }, [el('i'), t]),
    ),
  );
}

export function entrarPanel(placa, delay) {
  entrar(placa, delay, 0);
  placa.querySelectorAll('.ctx-fila, .ctx-cabeza, .ctx-pie').forEach((f, i) => entrar(f, delay + 60 + i * 40, 8));
}
