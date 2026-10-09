// El inicio: la portada del Nº 1. La cabecera enorme, la foto del main en halftone, el perfil como una frase para
// completar, los roles como palabras, los campeones como una hoja de contactos (marcados con lápiz graso ácido) y
// el índice "En este número" (continuar, el desafío, el historial). La intro: la portada se imprime (salteable).

import { crearAmbiente, tramaEstatica, leerTokens } from './halftone.js';
import { cargarImagen, urlIcono } from '../../comun/arte.js';
import { crearAzar } from '../../comun/azar.js';
import { h, fmt, mayus, revelar, entrar, quieto, dos } from './util.js';
import { folio } from './folio.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const ELEGIR = 3;

function fechaLarga(iso) {
  const [a, m, d] = String(iso ?? '').split('-').map(Number);
  if (!a) return '';
  const f = new Date(Date.UTC(a, m - 1, d));
  return `${DIAS[f.getUTCDay()]} ${d} de ${MESES[m - 1]} de ${a}`;
}

// Un círculo de lápiz graso: dos vueltas que no cierran igual. Determinista por semilla.
function circuloLapiz(azar) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'lapiz');
  svg.setAttribute('aria-hidden', 'true');
  const pts = [];
  const vueltas = 1.18;
  const n = 26;
  const r0 = azar.entre(44, 47);
  const fase = azar.entre(0, Math.PI * 2);
  for (let i = 0; i <= n; i++) {
    const a = fase + (i / n) * Math.PI * 2 * vueltas;
    const r = r0 + Math.sin(i * 0.9) * 2.2 + azar.entre(-1.4, 1.4);
    pts.push([50 + Math.cos(a) * r * 1.04, 50 + Math.sin(a) * r * 0.96]);
  }
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  svg.append(p);
  return svg;
}

export function montarInicio(raiz, ctx) {
  const { datos, meta } = ctx;
  const I = datos.inicio;
  const J = I.jugador;
  const cat = I.catalogos;
  const azar = crearAzar('inicio-lapiz');
  const estado = {
    handle: ctx.peor ? datos.peorCaso?.handle ?? J.handle : J.handle,
    rol: J.rol,
    region: J.regionId,
    mains: J.mains.map((m) => m.ddragon),
  };

  const pagina = h('article.portada', { 'data-pieza': 'inicio' });
  const foto = h('figure.portada-foto', { 'aria-hidden': 'true' });
  const fecha = I.desafio?.fecha;

  // ——— la frase ———
  const inHandle = h('input.campo.campo-handle', { value: estado.handle, 'aria-label': 'Tu nombre de invocador', spellcheck: 'false', maxlength: 16 });
  const ajustar = () => (inHandle.style.width = `${Math.max(4, inHandle.value.length + 0.6)}ch`);
  if (!CSS.supports('field-sizing', 'content')) {
    inHandle.addEventListener('input', ajustar);
    ajustar();
  }
  const campoRol = h('button.campo.campo-rol', { type: 'button', onclick: () => pagina.querySelector('.rol.activo')?.focus() });
  const selRegion = h(
    'select.campo.campo-region',
    { 'aria-label': 'Servidor' },
    cat.regiones.map((r) => h('option', { value: r.regionId, selected: r.regionId === estado.region ? '' : null }, r.regionId)),
  );
  const camposMain = [0, 1, 2].map((i) => h('button.campo.campo-main', { type: 'button', onclick: () => hoja.querySelector('.contacto')?.focus() }));
  const frase = h(
    'p.frase',
    'Me llamo ', inHandle, ', juego ', campoRol, ' en el servidor ', selRegion, ' y mis mains son ', camposMain[0], ', ', camposMain[1], ' y ', camposMain[2], '.',
  );

  // ——— roles ———
  const roles = h(
    'div.roles',
    { role: 'radiogroup', 'aria-label': 'Rol' },
    cat.roles.map((r) =>
      h('button.rol', { type: 'button', role: 'radio', 'data-rol': r.id, title: r.tono, onclick: () => cambiarRol(r.id) }, r.etiqueta),
    ),
  );
  const tonoRol = h('p.tono-rol');

  // ——— hoja de contactos ———
  const hoja = h('ol.hoja', { 'aria-label': 'Campeones: elegí 3' });
  const cuentaHoja = h('span');
  function pintarHoja() {
    hoja.replaceChildren();
    const lista = cat.campeonesPorRol[estado.rol] ?? [];
    lista.forEach((c, i) => {
      const lienzo = h('canvas.contacto-trama', { width: 152, height: 152, 'aria-hidden': 'true' });
      const elegido = estado.mains.includes(c.ddragon);
      const li = h(
        `li.contacto-fila`,
        h(
          `button.contacto${elegido ? '.elegido' : ''}`,
          { type: 'button', 'aria-pressed': String(elegido), 'data-key': c.ddragon, onclick: () => alternar(c.ddragon) },
          h('span.contacto-cuadro', lienzo, circuloLapiz(azar)),
          h('span.contacto-pie', h('span.contacto-n', `${dos(i + 1)}A`), h('span.contacto-nombre', c.name)),
        ),
      );
      hoja.append(li);
      cargarImagen(c.iconoUrl ?? urlIcono(c.ddragon, meta)).then((img) => {
        const t = leerTokens(pagina, 'noche');
        tramaEstatica(lienzo, img, { tokens: { ...t, celda: 6.2, grano: t.grano * 0.5, contraste: 1.25 }, zoom: 1.06 });
      });
    });
    cuentaHoja.textContent = `${lista.length} campeones · ${MAYUS_ROL()}`;
  }
  const MAYUS_ROL = () => mayus(cat.roles.find((r) => r.id === estado.rol)?.etiqueta ?? estado.rol);
  function alternar(key) {
    const i = estado.mains.indexOf(key);
    if (i >= 0) estado.mains.splice(i, 1);
    else {
      if (estado.mains.length >= ELEGIR) estado.mains.shift();
      estado.mains.push(key);
    }
    pintarElegidos();
  }
  function pintarElegidos() {
    hoja.querySelectorAll('.contacto').forEach((b) => {
      const si = estado.mains.includes(b.dataset.key);
      b.classList.toggle('elegido', si);
      b.setAttribute('aria-pressed', String(si));
    });
    camposMain.forEach((c, i) => {
      const key = estado.mains[i];
      const todos = Object.values(cat.campeonesPorRol).flat();
      c.textContent = key ? todos.find((x) => x.ddragon === key)?.name ?? key : '___';
      c.classList.toggle('vacio', !key);
    });
  }
  function cambiarRol(id) {
    if (id !== estado.rol) {
      estado.rol = id;
      const deEste = new Set((cat.campeonesPorRol[id] ?? []).map((c) => c.ddragon));
      estado.mains = estado.mains.filter((k) => deEste.has(k));
      pintarHoja();
    }
    roles.querySelectorAll('.rol').forEach((b) => {
      const si = b.dataset.rol === id;
      b.classList.toggle('activo', si);
      b.setAttribute('aria-checked', String(si));
    });
    const r = cat.roles.find((x) => x.id === id);
    campoRol.textContent = r?.etiqueta?.toLowerCase() ?? id;
    tonoRol.replaceChildren(h('b', r?.viveDe ?? ''), ' ', r?.tono ?? '');
    pintarElegidos();
  }

  // ——— índice "En este número" ———
  const D = I.desafio ?? {};
  const mejor = D.conMejor ?? {};
  const hist = I.historial ?? {};
  const indice = h(
    'nav.indice',
    { 'aria-label': 'En este número' },
    h('p.kicker.indice-kicker', h('span.kicker-acento', 'En este número'), h('span.kicker-filete')),
    h(
      'a.entrada',
      { href: '#', onclick: (e) => { e.preventDefault(); ctx.irA('decision', 'evento'); } },
      h('span.entrada-n.t-ancha', I.continuar?.partes?.anio ?? ''),
      h('span.entrada-cuerpo', h('b', I.continuar?.texto ?? 'Continuar'), h('span', I.continuar?.detalle ?? '')),
    ),
    h(
      'a.entrada',
      { href: '#', onclick: (e) => e.preventDefault() },
      h('span.entrada-n.t-ancha', mejor.mejor ? fmt(mejor.mejor.total) : '—'),
      h('span.entrada-cuerpo', h('b', mejor.kicker ?? 'Desafío del día'), h('span', mejor.texto ?? ''), mejor.textoMejor ? h('em', mejor.textoMejor) : null),
    ),
    h(
      'div.entrada.entrada-historial',
      h('span.entrada-n.t-ancha', hist.carreras?.length ? fmt(Math.max(...hist.carreras.map((c) => c.puntaje))) : '—'),
      h(
        'span.entrada-cuerpo',
        h('b', 'Tus últimas carreras'),
        h('ul.historial', (hist.filas ?? []).map((f) => h('li', h('span', f.detalle), h('em', f.pts)))),
      ),
    ),
  );

  const cta = h(
    'button.cta',
    { type: 'button', onclick: () => ctx.irA('decision', 'planAmateur') },
    h('span.cta-txt', 'Empezar la nota'),
    h('span.cta-flecha', { 'aria-hidden': 'true' }, '→'),
  );

  const cabecera = h('h1.cabecera', { 'aria-label': 'Un Split Más' }, [...'UN SPLIT MÁS'].map((c) => h(`span.letra-cab${c === ' ' ? '.esp' : ''}`, { 'aria-hidden': 'true' }, c)));
  const bajadaCab = h(
    'p.bajada-cab',
    h('span', 'Nº 1'),
    h('span', fechaLarga(fecha)),
    h('span', 'Tu carrera, de los 15 al retiro'),
    h('span', `Seed del día ${D.seedDelDia ?? ''}`),
  );

  pagina.append(
    folio(['Un Split Más', 'Nº 1', fecha ? `Edición del ${fecha}` : null], ['La revista de tu carrera', 'Se imprime de noche']),
    foto,
    h('header.portada-cabeza', cabecera, bajadaCab),
    h(
      'section.portada-nota',
      h('p.kicker', h('span.kicker-acento', 'Nota de tapa'), ' · Completá la frase'),
      frase,
      roles,
      tonoRol,
      h('div.hoja-wrap', h('p.kicker.hoja-kicker', h('span', 'Hoja de contactos'), cuentaHoja, h('span', `Marcá ${ELEGIR}`)), hoja),
      h('div.portada-acciones', cta, h('p.texto-pool', cat.textoDelPool ?? '')),
    ),
    h('aside.portada-indice', indice, h('p.pie-foto-portada', h('b', mayus(J.mains[0]?.name ?? '')), ' · en la tapa: tu main')),
  );
  raiz.append(pagina);

  selRegion.addEventListener('change', () => (estado.region = selRegion.value));
  cambiarRol(estado.rol);
  pintarHoja();
  pintarElegidos();

  const amb = crearAmbiente(foto, { meta, fade: [0.62, 1.0, 0.14, 0.0], recorte: 'centrada', foco: [0.47, 0.36], celdas: 104, zoom: 1.3, semilla: 'portada' });
  const listo = amb.ambiente({ era: ctx.era, animo: 'normal', arte: J.mains[0]?.ddragon ?? null });

  // ——— la intro: la portada se imprime ———
  let anims = [];
  let porRepetir = false;
  function anim(el, kf, op) {
    if (!el) return;
    anims.push(el.animate(kf, { fill: 'backwards', easing: 'cubic-bezier(0.2, 0.7, 0.1, 1)', ...op }));
  }
  function imprimir() {
    anims.forEach((a) => a.cancel());
    anims = [];
    amb.respirar(true);
    if (quieto()) return;
    amb.imprimir(1500);
    const letras = [...cabecera.querySelectorAll('.letra-cab:not(.esp)')];
    const orden = letras.map((_, i) => i);
    for (let i = orden.length - 1; i > 0; i--) {
      const j = Math.floor(azar.siguiente() * (i + 1));
      [orden[i], orden[j]] = [orden[j], orden[i]];
    }
    orden.forEach((k, j) =>
      anim(letras[k], [{ clipPath: 'inset(-40% 0 100% 0)', opacity: 0.4 }, { clipPath: 'inset(-40% 0 0 0)', opacity: 1 }], { duration: 300, delay: 120 + j * 55 }),
    );
    anim(bajadaCab, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 820 });
    [...pagina.querySelectorAll('.portada-nota > *')].forEach((el, i) =>
      anim(el, [{ clipPath: 'inset(0 100% 0 0)', opacity: 0.3 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }], { duration: 380, delay: 1000 + i * 140 }),
    );
    [...pagina.querySelectorAll('.lapiz')].forEach((el, i) =>
      anim(el, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 300, delay: 1900 + i * 90 }),
    );
    anim(pagina.querySelector('.portada-indice'), [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 420, delay: 1700 });
  }
  function saltar() {
    const vivas = anims.filter((a) => a.playState === 'running' || a.playState === 'pending');
    vivas.forEach((a) => a.finish());
    if (vivas.length) amb.sinImpresion();
    return vivas.length > 0;
  }
  pagina.addEventListener('pointerdown', () => saltar());
  imprimir();

  return {
    listo,
    repetir() {
      porRepetir = true;
      imprimir();
    },
    saltar,
    congelar(ms) {
      // en una captura quieta (sin "repetir") la portada ya está impresa
      if (!porRepetir) {
        saltar();
        amb.sinImpresion();
      }
      amb.congelar(ms);
    },
    alEra: (era) => amb.ambiente({ era }),
    destruir() {
      amb.destruir();
      pagina.remove();
    },
  };
}
