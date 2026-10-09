// La doble página de la decisión. Izquierda: el split hasta ahora como crónica (foto en halftone, capitular, breves,
// "ÚLTIMO MOMENTO" a máquina y la cita destacada). Derecha: LA DECISIÓN, con las opciones numeradas a lo grande, los
// glifos de la previa, la nota al margen (el inspector) y, al elegir, la posdata con el resultado real.
// El plan amateur se dibuja como una tabla de almanaque (opciones en filas, ejes en columnas).

import { crearAmbiente } from './halftone.js';
import { crearAzar } from '../../comun/azar.js';
import {
  h, fmt, signo, dos, mayus, glifoPrevia, iconoEje, iconoRiesgo, nombreRiesgo, flechas, trazoMarcador, dibujarMarcador,
  revelar, entrar, maquina, odometro, primeraOracion, quieto,
} from './util.js';
import { folioArriba, folioAbajo, numeroFranja } from './folio.js';

const MAX_OPCIONES = 4;
const MAX_BREVES = 3; // breves a la vista en la crónica (el resto sigue en el DOM)

// Campos de la previa ↔ campos de los cambios del resultado real.
const CAMPO_RESULTADO = { 'player.ranked': 'player.soloqElo' };

function preparar(datos, muestra, peor, ctx = {}) {
  const M = structuredClone(datos[muestra]);
  if (ctx.franja) M.franja = structuredClone(ctx.franja);
  if (ctx.anio) {
    M.anio = ctx.anio;
    if (M.pagina?.cartel) M.pagina.cartel.anio = ctx.anio;
  }
  const P = datos.peorCaso;
  if (peor && P) {
    M.franja.quien.handle = P.handle;
    M.franja.club = { ...M.franja.club, org: P.org?.nombre ?? M.franja.club.org };
    const largos = P.textosMasLargos ?? {};
    if (largos['decision.titulo']) M.decision.titulo = largos['decision.titulo'].texto;
    if (largos['decision.descripcion']) M.decision.descripcion = largos['decision.descripcion'].texto;
    if (largos['opcion.descripcion'] && M.decision.opciones[0]) M.decision.opciones[0].descripcion = largos['opcion.descripcion'].texto;
  }
  return M;
}

function esMatriz(ops) {
  return ops.length >= 3 && ops.every((o) => o.previa?.some((p) => p.valor !== undefined));
}

export function montarDecision(raiz, ctx) {
  const { datos, muestra, meta } = ctx;
  const M = preparar(datos, muestra, ctx.peor, ctx);
  const dec = M.decision;
  const ops = dec.opciones.slice(0, MAX_OPCIONES);
  const cerradas = dec.opcionesBloqueadas ?? [];
  const porOpcion = M.previas?.porOpcion ?? [];
  const matriz = esMatriz(ops);
  const uid = `${muestra}-${ctx.miniatura ? `mini-${ctx.era}` : 'pag'}`;
  const azar = crearAzar(`marcador-${muestra}`);
  const franja = M.franja;
  const anio = M.pagina?.cartel?.anio ?? M.anio;
  const campeon = ctx.campeon ?? M.ficha?.jugador?.campeonDelSplit ?? datos.inicio?.jugador?.mains?.[0]?.ddragon;

  // el pliego lleva su propia era: los tratamientos se anclan a él (en las eras hay cinco pliegos con cinco eras)
  const pliego = h(`article.pliego${matriz ? '.pliego-matriz' : ''}`, { 'data-pieza': 'decision', 'data-muestra': muestra, 'data-era': ctx.era });

  // ——— página izquierda: la crónica ———
  const foto = h('figure.foto', { 'aria-hidden': 'true' });
  const pieFoto = h('figcaption.pie-foto', h('b', mayus(campeon ?? '')), ' · tu campeón del split');
  const cartel = M.pagina?.cartel;
  const cabeza = h(
    'header.cronica-cabeza',
    h('p.kicker', 'La crónica del split'),
    h('h2.cartel', h('span.placa', cartel?.nuevoAnio ? `Arranca ${anio}` : `${anio}`), ' ', h('span.placa.placa-tenue', cartel?.ventana ? mayus(franja.cuando?.ventana?.texto ?? '') : '')),
  );
  const beats = M.pagina?.beats ?? [];
  const msgAntes = M.antes?.log?.message;
  const resto = beats.filter((b) => b.log?.message !== msgAntes);
  let lead = resto.filter((b) => b.beat);
  if (!lead.length) lead = resto.filter((b) => !b.log?.tecnico).slice(0, 1);
  const breves = resto.filter((b) => !lead.includes(b)).sort((a, b) => Number(Boolean(a.log?.tecnico)) - Number(Boolean(b.log?.tecnico)));
  const notas = [...lead.slice(1), ...breves];
  const listaBreves = h(
    'ul.breves',
    { 'aria-label': 'Breves del split' },
    notas.map((b, i) =>
      h(
        `li${i >= MAX_BREVES ? '.extra' : ''}`,
        h(
          'button.breve',
          { type: 'button', 'aria-expanded': 'false', onclick: (e) => { const li = e.currentTarget.parentElement; const si = li.classList.toggle('abierto'); e.currentTarget.setAttribute('aria-expanded', String(si)); } },
          h('span.breve-tipo', mayus(b.log.type ?? '')),
          h('span.breve-txt', b.log.message),
        ),
      ),
    ),
  );
  const masBreves = notas.length > MAX_BREVES
    ? h('button.mas.breves-mas', { type: 'button', onclick: (e) => { listaBreves.classList.add('todas'); e.currentTarget.remove(); } }, `${notas.length - MAX_BREVES} breves más`)
    : null;
  const cronica = h(
    'div.cronica',
    lead[0] ? h('p.beat.capitular', lead[0].log.message) : null,
    notas.length ? listaBreves : null,
    masBreves,
  );
  const izquierda = h('section.pagina.pagina-izq', foto, cabeza, h('div.cols', cronica));
  izquierda.append(pieFoto);

  let ultimo = null;
  let titularMaquina = null;
  if (M.antes?.log) {
    const L = M.antes.log;
    titularMaquina = h('h3.maquina');
    ultimo = h(
      'div.ultimo',
      h('p.kicker.kicker-acento', 'Último momento'),
      titularMaquina,
      L.descripcion ? h('p.ultimo-bajada', L.descripcion) : null,
      L.cuerpo ? h('blockquote.cita', h('p', L.cuerpo), L.opcion ? h('footer', `— ${L.opcion}${L.perfil ? ` · como ${L.perfil.toLowerCase()}` : ''}`) : null) : null,
      L.efectos ? h('p.efectos', L.efectos) : null,
    );
    izquierda.querySelector('.cols').append(ultimo);
  } else {
    izquierda.classList.add('sin-ultimo');
  }

  // ——— página derecha: la decisión ———
  const [planteo1, planteoResto] = primeraOracion(dec.descripcion);
  const btnMas = h('button.mas', { type: 'button', 'aria-expanded': 'false', 'aria-controls': `planteo-${uid}` }, 'seguir leyendo');
  const restoPlanteo = h('span.planteo-resto', { id: `planteo-${uid}` }, ` ${planteoResto}`);
  btnMas.addEventListener('click', () => {
    const abierto = pliego.classList.toggle('planteo-abierto');
    btnMas.setAttribute('aria-expanded', String(abierto));
    btnMas.textContent = abierto ? 'menos' : 'seguir leyendo';
  });
  const kicker = h(
    'p.kicker.kicker-decision',
    h('span.kicker-acento', 'La decisión'),
    h('span.kicker-filete'),
    h('span', [M.categoria, M.esBisagra ? 'bisagra de carrera' : null, matriz ? `${ops.length} planes` : null].filter(Boolean).join(' · ')),
  );
  const titulo = h('h1.parada-titulo', h('span.tt', dec.titulo));
  const planteo = h('p.planteo', h('span.planteo-1', planteo1), planteoResto ? restoPlanteo : null, planteoResto ? btnMas : null);
  const cabezaDer = h('header.decision-cabeza', { 'data-foco': '' }, kicker, titulo, planteo);

  const nota = h('aside.nota', { 'aria-live': 'polite' });
  const posdata = h('section.posdata', { 'aria-live': 'polite', hidden: true });
  const margen = h('div.margen', nota, posdata);

  const lista = matriz ? tablaAlmanaque() : listaOpciones();
  const derecha = h('section.pagina.pagina-der', cabezaDer, lista, margen);

  const chip = h(
    'p.chip-contexto',
    h('b', franja.club?.org ?? franja.club?.fase ?? ''),
    h('span', franja.cuando?.edadTexto ?? ''),
    h('span', String(anio)),
    numeroFranja(franja.numero),
  );
  pliego.append(folioArriba(M, datos, { anio, muestra }), chip, izquierda, h('div.lomo', { 'aria-hidden': 'true' }), derecha, folioAbajo(ops.length));
  raiz.append(pliego);

  // ——— opciones (lista) ———
  function descripcionCompleta(op, i) {
    const extra = porOpcion.find((p) => p.id === op.id);
    return h(
      'div.sr',
      { id: `d-${uid}-${i + 1}` },
      `${op.descripcion} `,
      (op.previa ?? []).map((p) => `${p.texto}. `),
      op.riesgoTexto ? `Riesgo: ${op.riesgoTexto}. ` : '',
      extra?.pSerie != null ? `Serie: ${Math.round(extra.pSerie * 100)}%. ` : '',
      op.propuesta ? `${op.propuesta}.` : '',
    );
  }
  function botonMas(i) {
    return h('button.op-mas', { type: 'button', 'aria-label': `Más sobre la opción ${i + 1}`, onclick: (e) => { e.stopPropagation(); apuntar(i, true); nota.classList.add('abierta'); } }, 'más');
  }
  function medidorP(op) {
    const extra = porOpcion.find((p) => p.id === op.id);
    const p = extra?.pSerie ?? extra?.pMapas;
    if (p == null) return null;
    const pct = Math.round(p * 100);
    return h('span.medidor', { title: `${pct}% de ganar` }, h('span.medidor-barra', h('i', { style: { width: `${pct}%` } })), h('b', `${pct}%`));
  }
  function listaOpciones() {
    const ol = h('ol.opciones', { role: 'list' });
    ops.forEach((op, i) => {
      const marcador = trazoMarcador(azar);
      const btn = h(
        'button.op',
        { type: 'button', 'data-atajo': i + 1, 'data-id': op.id, 'aria-describedby': `d-${uid}-${i + 1}` },
        h('span.op-num', dos(i + 1)),
        h(
          'span.op-cuerpo',
          h('span.op-label', h('span.op-label-txt', op.label), marcador),
          h(
            'span.op-glifos',
            (op.previa ?? []).map(glifoPrevia),
            op.riesgo ? h('span.riesgo', { title: op.riesgoTexto ?? '' }, iconoRiesgo(op.riesgo), h('span.riesgo-nombre', nombreRiesgo(op.riesgo))) : null,
            medidorP(op),
          ),
        ),
      );
      ol.append(h('li.op-fila', btn, botonMas(i), descripcionCompleta(op, i)));
    });
    cerradas.forEach((c, j) => {
      ol.append(
        h(
          'li.op-fila.op-cerrada',
          h('span.op-num', dos(ops.length + j + 1)),
          h('span.op-cuerpo', h('s.op-label', c.label), h('span.op-gate', h('b', 'Cerrada · '), c.gate)),
        ),
      );
    });
    return ol;
  }

  // ——— el plan amateur como tabla de almanaque ———
  function tablaAlmanaque() {
    const ejes = [];
    for (const op of ops) for (const p of op.previa ?? []) if (!ejes.some((e) => e.campo === p.campo)) ejes.push({ campo: p.campo, etiqueta: p.etiqueta });
    const ejeBarra = ejes.find((e) => e.campo === 'player.ranked');
    const otros = ejes.filter((e) => e !== ejeBarra);
    const maxBarra = Math.max(1, ...ops.map((o) => o.previa.find((p) => p.campo === ejeBarra?.campo)?.valor ?? 0));
    const jug = M.ficha?.jugador ?? {};
    const hoy = { 'player.studies': jug.estudios, 'player.sleep': jug.sueno, 'player.familyTrust': jug.confianzaFamiliar, 'player.stats.mentalidad': jug.stats?.mentalidad };
    const corto = { 'Confianza familiar': 'Confianza', Consistencia: 'Consist.' };
    const tabla = h('div.almanaque', { role: 'group', 'aria-label': 'Los planes, comparados' });
    tabla.style.setProperty('--ejes', otros.length);
    tabla.append(
      h(
        'div.alm-cabeza',
        { 'aria-hidden': 'true' },
        h('span.alm-c.alm-c-num', 'Nº'),
        h('span.alm-c.alm-c-plan', 'El plan'),
        ejeBarra ? h('span.alm-c.alm-c-barra', iconoEje(ejeBarra.campo), h('span', `${ejeBarra.etiqueta} · LP por semana`), h('small.corto', ejeBarra.etiqueta)) : null,
        otros.map((e) =>
          h('span.alm-c.alm-c-eje', iconoEje(e.campo), h('span', corto[e.etiqueta] ?? e.etiqueta), hoy[e.campo] != null ? h('em', `hoy ${fmt(hoy[e.campo])}`) : null, h('small.corto', (corto[e.etiqueta] ?? e.etiqueta).slice(0, 5))),
        ),
        h('span.alm-c.alm-c-casa', iconoRiesgo('incierto'), h('span', 'Riesgo en casa · en el año'), h('small.corto', 'Casa')),
      ),
    );
    const ol = h('ol.opciones.alm-filas', { role: 'list' });
    ops.forEach((op, i) => {
      const barra = op.previa.find((p) => p.campo === ejeBarra?.campo);
      const marcador = trazoMarcador(azar);
      const btn = h(
        'button.op.alm-fila',
        { type: 'button', 'data-atajo': i + 1, 'data-id': op.id, 'aria-describedby': `d-${uid}-${i + 1}` },
        h('span.alm-c.alm-c-num.op-num', dos(i + 1)),
        h(
          'span.alm-c.alm-c-plan',
          h('span.op-label', h('span.op-label-txt', op.label), marcador),
          h(
            'span.alm-tags',
            op.propuesta ? h('span.tag.tag-perfil', 'Tu perfil iría por esta') : null,
            op.rareza && op.rareza !== 'comun' ? h('span.tag', mayus(op.rareza)) : null,
          ),
        ),
        ejeBarra
          ? h(
              'span.alm-c.alm-c-barra',
              h('b.barra-num', barra ? signo(barra.valor) : '—', h('small', ' LP')),
              h('span.barra', h('i', { style: { width: `${((barra?.valor ?? 0) / maxBarra) * 100}%` } })),
            )
          : null,
        otros.map((e) => {
          const p = op.previa.find((x) => x.campo === e.campo);
          return h(
            `span.alm-c.alm-c-eje${p ? (p.signo === '-' ? '.baja' : '.sube') : '.nada'}`,
            { title: p?.texto ?? `${e.etiqueta}: sin cambio` },
            p ? [flechas(p.signo, p.magnitud), h('b', signo(p.valor))] : h('span.raya', '—'),
          );
        }),
        h(
          'span.alm-c.alm-c-casa',
          { title: op.riesgoTexto ?? '' },
          h('span.casa-dial', iconoRiesgo(op.riesgo), h('b', `${fmt(op.riesgoCasa ?? 0)}%`)),
          op.semanaDeuda ? h('span.deuda', `deuda de sueño · sem. ${op.semanaDeuda}`) : h('span.deuda.deuda-no', nombreRiesgo(op.riesgo)),
        ),
      );
      ol.append(h('li.op-fila', btn, botonMas(i), descripcionCompleta(op, i)));
    });
    tabla.append(ol);
    return tabla;
  }

  // ——— la nota al margen (inspector) ———
  let apuntada = -1;
  function apuntar(i, forzar = false) {
    if ((i === apuntada && !forzar) || !ops[i]) return;
    nota.classList.remove('abierta');
    apuntada = i;
    const op = ops[i];
    pliego.querySelectorAll('.op').forEach((b, k) => b.classList.toggle('apuntada', k === i));
    nota.replaceChildren(...[
      h('p.kicker.nota-kicker', h('span.nota-num', dos(i + 1)), h('span', 'Nota al margen')),
      h('p.nota-titulo', op.label),
      h('p.nota-txt', op.descripcion),
      h('button.mas.nota-mas', { type: 'button', onclick: () => nota.classList.toggle('abierta') }, 'más'),
      h(
        'ul.nota-previa.solo-completo',
        (op.previa ?? []).map((p) => h(`li${p.signo === '-' ? '.baja' : ''}`, p.texto)),
        op.riesgoTexto ? h('li.nota-riesgo', `Riesgo · ${op.riesgoTexto}`) : null,
      ),
      op.propuesta ? h('p.nota-perfil', op.propuesta) : null,
    ].filter(Boolean));
  }
  pliego.addEventListener('pointerover', (e) => {
    const b = e.target.closest?.('.op');
    if (b) apuntar(Number(b.dataset.atajo) - 1);
  });
  pliego.addEventListener('focusin', (e) => {
    const b = e.target.closest?.('.op');
    if (b) apuntar(Number(b.dataset.atajo) - 1);
  });
  pliego.addEventListener('click', (e) => {
    const b = e.target.closest?.('.op');
    if (b) elegir(Number(b.dataset.atajo));
  });
  pliego.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const botones = [...pliego.querySelectorAll('.op')];
    const k = botones.indexOf(document.activeElement);
    const sig = k < 0 ? 0 : (k + (e.key === 'ArrowDown' ? 1 : -1) + botones.length) % botones.length;
    botones[sig]?.focus();
    e.preventDefault();
  });
  apuntar(0);

  // ——— elegir: el trazo del marcador y la posdata con el resultado real ———
  function elegir(n) {
    const op = ops[n - 1];
    if (!op) return;
    const res = (M.resultados ?? []).find((r) => r.opcionId === op.id);
    pliego.classList.add('hay-eleccion');
    pliego.querySelectorAll('.op').forEach((b, k) => {
      b.classList.toggle('elegida', k === n - 1);
      b.setAttribute('aria-pressed', String(k === n - 1));
    });
    const btn = pliego.querySelector(`.op[data-atajo="${n}"]`);
    dibujarMarcador(btn.querySelector('.marcador'));
    posdata.replaceChildren(...contenidoPosdata(op, n, res).filter(Boolean));
    posdata.hidden = false;
    nota.hidden = true;
    revelar(posdata.querySelector('.pd-cabeza'), { delay: 180, dur: 320 });
    revelar(posdata.querySelector('.pd-txt'), { delay: 260, dur: 380 });
    posdata.querySelectorAll('.sello').forEach((s, i) => entrar(s, { delay: 380 + i * 70, dur: 260 }));
    amb.pulso('elegir');
  }
  function contenidoPosdata(op, n, res) {
    const logs = res?.inmediato?.logs ?? [];
    const conCuerpo = [...logs].reverse().find((l) => l.cuerpo) ?? logs[logs.length - 1];
    const cambios = res?.inmediato?.cambios ?? [];
    const sellos = [];
    for (const p of op.previa ?? []) {
      const campo = CAMPO_RESULTADO[p.campo] ?? p.campo;
      const c = cambios.find((x) => x.campo === campo);
      if (!c) continue;
      const delta = Math.round(c.despues) - Math.round(c.antes);
      const esLp = campo === 'player.soloqElo';
      sellos.push(
        h(
          `div.sello${delta < 0 ? '.baja' : delta > 0 ? '.sube' : ''}`,
          h('span.sello-etq', p.etiqueta),
          esLp
            ? h('span.sello-num', h('span.sello-signo', delta >= 0 ? '+' : '−'), odometro(0, Math.abs(c.delta), { delay: 420 }), h('small', ' LP'))
            : h('span.sello-num', h('span.sello-antes', fmt(c.antes)), h('span.sello-flecha', '→'), odometro(c.antes, c.despues, { delay: 420 })),
          h('span.sello-delta', delta === 0 ? '±0' : [flechas(delta < 0 ? '-' : '+', 'baja'), ` ${signo(esLp ? c.delta : delta)}`]),
          h('span.sello-previsto', 'previsto ', flechas(p.signo, p.magnitud), p.valor !== undefined ? ` ${signo(p.valor)}` : ''),
        ),
      );
    }
    return [
      h('p.kicker.pd-cabeza', h('span.kicker-acento', 'P. D.'), h('span', `Elegiste ${dos(n)} · ${op.label}`)),
      h('p.pd-txt', conCuerpo?.cuerpo ?? conCuerpo?.message ?? 'Sin novedades.'),
      sellos.length ? h('div.sellos', sellos) : null,
      conCuerpo?.efectos && !sellos.length ? h('p.efectos', conCuerpo.efectos) : null,
    ];
  }

  // ——— ambiente: el splash en halftone, en la foto de la izquierda ———
  // leyenda imprime la crónica en papel: la trama pasa a tinta oscura sobre papel (se recrea al cruzar ese borde)
  const modoDe = (era) => (era === 'leyenda' ? 'papel' : 'noche');
  let modo = modoDe(ctx.era);
  const nuevoAmb = () =>
    crearAmbiente(foto, {
      meta,
      modo,
      fade: matriz ? [0.5, 1.0, 0.86, 1.0] : [0.58, 1.0, 0.88, 1.0],
      recorte: 'centrada',
      celdas: matriz ? 92 : 112,
      zoom: 1.0,
      estatico: ctx.miniatura,
      semilla: muestra,
      respira: modo === 'noche',
    });
  let amb = nuevoAmb();
  const listo = amb.ambiente({ era: ctx.era, animo: 'normal', arte: campeon ?? null }).then(() => amb.listo());

  // ——— la entrada: la crónica entra, ÚLTIMO MOMENTO a máquina, la decisión se revela; el ambiente se aquieta ———
  let tAquietar = 0;
  function entrada() {
    if (ctx.miniatura) {
      if (titularMaquina) titularMaquina.textContent = M.antes.log.titulo ?? '';
      amb.respirar(false);
      return;
    }
    amb.respirar(true);
    clearTimeout(tAquietar);
    tAquietar = setTimeout(() => amb.respirar(false), quieto() ? 0 : 250);
    revelar(cabeza.querySelector('.cartel'), { delay: 0, dur: 360 });
    pliego.querySelectorAll('.cronica > *, .ultimo > .kicker').forEach((el, i) => entrar(el, { delay: 60 + i * 70 }));
    if (titularMaquina) maquina(titularMaquina, M.antes.log.titulo ?? M.antes.mensaje ?? '', { delay: 320, porLetra: 30 });
    pliego.querySelectorAll('.ultimo > :not(.kicker):not(.maquina)').forEach((el, i) => entrar(el, { delay: 1000 + i * 80 }));
    revelar(kicker, { delay: 120, dur: 300 });
    revelar(titulo, { delay: 180, dur: 400 });
    revelar(planteo, { delay: 300, dur: 340 });
    pliego.querySelectorAll('.op-fila, .alm-cabeza').forEach((el, i) => revelar(el, { delay: 380 + i * 80, dur: 340 }));
    revelar(nota, { delay: 700, dur: 340 });
  }
  entrada();

  return {
    elegir,
    listo,
    repetir() {
      pliego.classList.remove('hay-eleccion');
      pliego.querySelectorAll('.op').forEach((b) => b.classList.remove('elegida'));
      posdata.hidden = true;
      nota.hidden = false;
      entrada();
    },
    congelar(ms) {
      amb.congelar(ms);
    },
    alEra(era) {
      pliego.dataset.era = era;
      if (modoDe(era) !== modo) {
        modo = modoDe(era);
        amb.destruir();
        amb = nuevoAmb();
        amb.respirar(false);
        amb.ambiente({ era, animo: 'normal', arte: campeon ?? null });
      } else amb.ambiente({ era });
    },
    destruir() {
      clearTimeout(tAquietar);
      amb.destruir();
      pliego.remove();
    },
  };
}
