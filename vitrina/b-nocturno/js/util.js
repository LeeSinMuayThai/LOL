// Herramientas de B · NOCTURNO: DOM, formato, glifos (ejes, riesgo, flechas), el trazo del marcador y los movimientos
// (revelado de tinta, máquina de escribir, odómetro). Todo movimiento es WAAPI con fill 'backwards': al terminar sale de
// document.getAnimations() y lo que queda es el estado final del CSS (las capturas congeladas no lo rebobinan).

export const html = document.documentElement;
export const reducido = () => html.hasAttribute('data-reducido') || matchMedia('(prefers-reduced-motion: reduce)').matches;
export const instantaneo = () => html.hasAttribute('data-inst');
export const quieto = () => reducido() || instantaneo();

// h('p.clase#id', { attrs }, ...hijos)
export function h(sel, attrs, ...hijos) {
  const [, tag = 'div', resto = ''] = sel.match(/^([a-z0-9-]+)?(.*)$/i);
  const el = document.createElement(tag);
  for (const m of resto.matchAll(/([.#])([\w-]+)/g)) {
    if (m[1] === '.') el.classList.add(m[2]);
    else el.id = m[2];
  }
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
    hijos.unshift(attrs);
    attrs = null;
  }
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of hijos.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const NUM = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
export const fmt = (n) => NUM.format(Math.round(n));
export const signo = (n) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(Math.abs(n))}` : '±0');
export const dos = (n) => String(n).padStart(2, '0');
export const mayus = (s) => String(s ?? '').toLocaleUpperCase('es-AR');

// ——— glifos ———
// Íconos de eje: pictogramas propios, trazo 1,6 en un cuadro de 20. Sin emojis ni íconos genéricos.
const EJES = {
  mecanica: '<path d="M4 16 L10 4 L16 16"/><path d="M7 11h6"/>',
  macro: '<rect x="3" y="3" width="14" height="14"/><path d="M3 10h14M10 3v14"/>',
  shotcalling: '<path d="M4 8v4h3l5 4V4L7 8z"/><path d="M15 7c1.2 1.6 1.2 4.4 0 6"/>',
  adaptabilidad: '<path d="M4 7h9l-3-3M16 13H7l3 3"/>',
  mentalidad: '<circle cx="10" cy="10" r="6.5"/><path d="M10 3.5v13"/>',
  laneo: '<path d="M3 17L17 3"/><path d="M3 11l6 6"/>',
  teamfight: '<circle cx="6" cy="7" r="2.4"/><circle cx="14" cy="7" r="2.4"/><path d="M2.5 16c.8-3 6.2-3 7 0M10.5 16c.8-3 6.2-3 7 0"/>',
  arraigo: '<path d="M10 3v9"/><path d="M10 12l-5 5M10 12l5 5M10 12v5"/>',
  sinergia: '<circle cx="7.5" cy="10" r="4.5"/><circle cx="12.5" cy="10" r="4.5"/>',
  ranked: '<path d="M3 17h14"/><path d="M5 17v-5M10 17V8M15 17V3"/>',
  studies: '<path d="M3 5l7-2 7 2-7 2z"/><path d="M5 6v6c2 2 8 2 10 0V6"/>',
  sleep: '<path d="M14.5 13.5A6.5 6.5 0 0 1 7 4a6.5 6.5 0 1 0 7.5 9.5z"/>',
  familyTrust: '<path d="M3 9l7-6 7 6"/><path d="M5 8v9h10V8"/><path d="M8.5 17v-4h3v4"/>',
  hype: '<path d="M10 3l2 5h5l-4 3 1.5 5L10 13l-4.5 3L7 11 3 8h5z"/>',
  jerarquia: '<path d="M10 3v14M5 8h10M7 13h6"/>',
};
const ALIAS = {
  'player.ranked': 'ranked',
  'player.studies': 'studies',
  'player.sleep': 'sleep',
  'player.familyTrust': 'familyTrust',
  'career.arraigo': 'arraigo',
  'career.sinergia': 'sinergia',
  'career.hype': 'hype',
  'career.jerarquia': 'jerarquia',
};
export function claveEje(campo) {
  if (ALIAS[campo]) return ALIAS[campo];
  const ultimo = String(campo ?? '').split('.').pop();
  return EJES[ultimo] ? ultimo : 'macro';
}
export function iconoEje(campo) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 20 20');
  s.setAttribute('class', 'ico');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = EJES[claveEje(campo)];
  return s;
}

// Riesgo: un dial de tres cuartos. seguro = vacío con centro; incierto = medio; ruleta = lleno y partido.
const RIESGOS = {
  seguro: { nombre: 'Seguro', svg: '<circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="2.2" class="lleno"/>' },
  incierto: { nombre: 'Incierto', svg: '<circle cx="10" cy="10" r="7"/><path d="M10 3a7 7 0 0 1 0 14z" class="lleno"/>' },
  ruleta: { nombre: 'Ruleta', svg: '<circle cx="10" cy="10" r="7" class="lleno"/><path d="M10 3v14M3 10h14M5 5l10 10M15 5L5 15" class="corte"/>' },
};
export function iconoRiesgo(riesgo) {
  const r = RIESGOS[riesgo] ?? RIESGOS.incierto;
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 20 20');
  s.setAttribute('class', 'ico ico-riesgo');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = r.svg;
  return s;
}
export const nombreRiesgo = (riesgo) => (RIESGOS[riesgo] ?? { nombre: riesgo ?? '—' }).nombre;

// ▲ / ▲▲ / ▲▲▲ o ▼: la magnitud por cantidad (baja 1, media 2, alta 3), nunca por opacidad.
const CANT = { baja: 1, media: 2, alta: 3 };
export function flechas(signoTxt, magnitud) {
  const n = CANT[magnitud] ?? 1;
  const baja = signoTxt === '-';
  const cont = h(`span.fl${baja ? '.fl-baja' : '.fl-sube'}`, { 'aria-hidden': 'true', 'data-n': n });
  for (let i = 0; i < n; i++) cont.append(h('i'));
  return cont;
}

// Un glifo de previa: ícono del eje + flechas (+ etiqueta y número en "textos completos").
export function glifoPrevia(p) {
  return h(
    `span.glifo${p.signo === '-' ? '.glifo-baja' : ''}`,
    { title: p.texto },
    iconoEje(p.campo),
    h('span.glifo-etq.solo-completo', p.etiqueta),
    flechas(p.signo, p.magnitud),
    h('span.glifo-num.solo-completo', p.valor !== undefined ? signo(p.valor) : ''),
  );
}

// ——— el trazo del marcador ———
// Un subrayado de marcador hecho a mano: dos pasadas apenas onduladas. Determinista por semilla.
export function trazoMarcador(azar, ancho = 400, alto = 22) {
  const y0 = alto * 0.55;
  const j = () => azar.entre(-alto * 0.12, alto * 0.12);
  const ida = `M ${azar.entre(2, 8).toFixed(1)} ${(y0 + j()).toFixed(1)} C ${(ancho * 0.3).toFixed(1)} ${(y0 + j() - 3).toFixed(1)}, ${(ancho * 0.65).toFixed(1)} ${(y0 + j() + 2).toFixed(1)}, ${(ancho - azar.entre(4, 14)).toFixed(1)} ${(y0 + j() - 1).toFixed(1)}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'marcador');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', ida);
  p.setAttribute('pathLength', '100');
  svg.append(p);
  return svg;
}
export function dibujarMarcador(svg, { delay = 0 } = {}) {
  if (quieto()) return;
  svg.animate([{ clipPath: 'inset(-50% 100% -50% 0%)' }, { clipPath: 'inset(-50% -2% -50% -2%)' }], {
    duration: 300,
    delay,
    easing: 'cubic-bezier(0.3, 0.6, 0.2, 1)',
    fill: 'backwards',
  });
}

// ——— movimientos ———
// Revelado de tinta: una máscara que barre de izquierda a derecha (240-400 ms).
export function revelar(el, { delay = 0, dur = 340, desde = 'izq' } = {}) {
  if (!el || quieto()) return;
  const ini = desde === 'arriba' ? 'inset(0 0 100% 0)' : 'inset(0 100% 0 0)';
  el.animate([{ clipPath: ini, opacity: 0.2 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }], {
    duration: dur,
    delay,
    easing: 'cubic-bezier(0.2, 0.7, 0.1, 1)',
    fill: 'backwards',
  });
}
// Aparecer en el lugar (la crónica entrando): sube 8 px y entra la tinta.
export function entrar(el, { delay = 0, dur = 300 } = {}) {
  if (!el || quieto()) return;
  el.animate([{ transform: 'translateY(8px)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
    duration: dur,
    delay,
    easing: 'cubic-bezier(0.2, 0.7, 0.1, 1)',
    fill: 'backwards',
  });
}

// Máquina de escribir: cada letra es un span que aparece en su turno. El texto completo está en el DOM desde el
// principio (aria-label en el contenedor). Devuelve la duración total.
export function maquina(el, texto, { delay = 0, porLetra = 34 } = {}) {
  el.textContent = '';
  el.setAttribute('aria-label', texto);
  const letras = [...texto];
  const frag = document.createDocumentFragment();
  letras.forEach((c) => frag.append(h('span.letra', { 'aria-hidden': 'true' }, c)));
  const cursor = h('span.cursor', { 'aria-hidden': 'true' });
  frag.append(cursor);
  el.append(frag);
  if (quieto()) return 0;
  [...el.querySelectorAll('.letra')].forEach((s, i) =>
    s.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: delay + i * porLetra, fill: 'backwards' }),
  );
  return delay + letras.length * porLetra;
}

// Odómetro sobrio: los dígitos de "después" ruedan desde los de "antes".
export function odometro(antes, despues, { delay = 0 } = {}) {
  const a = String(Math.round(Math.abs(antes)));
  const d = String(Math.round(Math.abs(despues)));
  const largo = Math.max(a.length, d.length);
  const A = a.padStart(largo, ' ');
  const D = d.padStart(largo, ' ');
  const cont = h('span.odo', { 'aria-label': fmt(despues) });
  [...D].forEach((dig, i) => {
    const col = h('span.odo-col', { 'aria-hidden': 'true' });
    const tira = h('span.odo-tira');
    for (let k = 0; k <= 9; k++) tira.append(h('span', String(k)));
    col.append(tira);
    const hasta = dig === ' ' ? 0 : Number(dig);
    const desde = A[i] === ' ' ? 0 : Number(A[i]);
    tira.style.transform = `translateY(${-hasta * 10}%)`;
    if (dig === ' ') col.classList.add('odo-vacio');
    if (!quieto() && desde !== hasta) {
      tira.animate([{ transform: `translateY(${-desde * 10}%)` }, { transform: `translateY(${-hasta * 10}%)` }], {
        duration: 420 + i * 60,
        delay,
        easing: 'cubic-bezier(0.25, 0.8, 0.2, 1)',
        fill: 'backwards',
      });
    }
    cont.append(col);
  });
  return cont;
}

// La primera oración (para el planteo en una línea). No extrae números: solo corta para mostrar; el resto queda a un toque.
export function primeraOracion(texto) {
  const m = String(texto ?? '').match(/^(.+?[.!?])(\s|$)/);
  return m ? [m[1], texto.slice(m[1].length).trim()] : [texto ?? '', ''];
}

// Código de barras decorativo a partir de los dígitos de la seed (no codifica nada real).
export function codigoDeBarras(semilla, azar, { ancho = 220, alto = 46 } = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);
  svg.setAttribute('class', 'barras');
  svg.setAttribute('aria-hidden', 'true');
  const digitos = String(semilla).padStart(6, '0').split('').map(Number);
  let x = 4;
  let k = 0;
  const barras = [];
  // guardas + un patrón por dígito (anchos 1-4) + relleno decorativo determinista
  const anchoDe = (d, i) => 1 + ((d * 7 + i * 3) % 4);
  while (x < ancho - 6) {
    const d = digitos[k % digitos.length];
    const w = k < 3 || x > ancho - 14 ? 1.5 : anchoDe(d, k) * 1.2 + azar.entre(0, 0.6);
    if (k % 2 === 0) barras.push(`<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${alto}"/>`);
    x += w + (k % 2 === 0 ? 0 : azar.entre(0.6, 2.2));
    k++;
  }
  svg.innerHTML = barras.join('');
  return svg;
}
