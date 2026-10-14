// La ficha fija (W1, PLANUI §0.7: "que se sienta el avance"). Debajo de la franja, en TODAS las anchuras, los números que
// hacen sentir el avance, cada uno con su próximo escalón con nombre (la ficha de El Ídolo):
//   1. el nivel con su ▲▼ del año;
//   2. el arraigo con tu org como escalera (Uno más → Querido → Ídolo → Leyenda), con su barra y "→ Ídolo 60";
//   3. el puntaje de la carrera en vivo y su escalón ("te falta…");
//   4. la jerarquía y el hype con su próximo escalón;
//   5. el chip del cupo internacional;
//   6. los títulos, con una vitrina mini (una copa por título, agrupadas por tier);
//   7. la plata ganada en la carrera.
// En el celular es una tira (nivel, arraigo y títulos: `data-tira`) que al tocarla abre la ficha completa como hoja; en
// el escritorio la tira lleva todo y la hoja suma los textos largos. La crea y la pinta `franja.js`, SOLO desde la `vista`
// (lo que la pantalla ya contó): mientras el relato cuenta un split, no cambia.
//
// Los datos salen de los helpers puros de `core/ficha.js` (sin rng). Cuando un número cambia entre una `vista` y la
// siguiente (la misma carrera), rueda (`moverNumero`), en todas las velocidades; cuando la vitrina suma un título, la copa nueva entra con el kit
// (`animar`: con movimiento reducido aparece quieta).
import {
  nivelDelAnio, escaleraDeArraigo, escaleraDeJerarquia, escaleraDeHype, puntajeEnVivo, vitrinaDeTitulos, dineroGanado,
  estadoInternacional
} from '../core/ficha.js';
import { plata, faltan } from '../core/formato.js';
import { moverNumero } from './core/delta.js';
import { icono, triangulos } from './fx/iconos.js';
import { num } from './fx/movimiento.js';
import { animar as animarNodo, DUR, RESORTE, EXPO } from './fx/util.js';

const LABEL_BANDA = { prospecto: 'Prospecto', titular: 'Competitivo', elite: 'Élite', clase_mundial: 'Clase mundial' };
const LABEL_INTERNACIONAL = { sin_chance: 'sin chance', en_carpeta: 'en carpeta', clasificado: 'clasificado', jugando: 'jugándolo' };
const LABEL_TIER = { 1: 'De primera', 2: 'De la liga de desarrollo', 3: 'Del circuito chico' };
// Las copas que entran en la tira; el resto se cuenta en el número (la hoja las muestra todas).
const COPAS_EN_LA_TIRA = 6;
// La copa nueva entra desde arriba y más grande, con el resorte del kit; si entran varias, en escalera.
const COPA_DESDE = 'translateY(-12px) scale(1.9)';
const COPA_PASO_MS = 120;
// Cuando un número cambia entre una `vista` y la siguiente: rueda, la barra del arraigo se llena y el ▲▼ entra con un
// pulso. En TODAS las velocidades (RÁPIDO con las duraciones cortas); con movimiento reducido, directo (lo resuelven
// `moverNumero` y `animar` del kit). Las duraciones son tokens (`--fj-dur-*`, bloque W1-H de tokens.css).
const PULSO_DESDE = 'scale(1.8)';
const PULSO_RETARDO = 0.45; // el pulso entra cuando el número ya va rodando (fracción de su duración)

function duracionDeToken(nombre) {
  if (typeof document === 'undefined') return DUR.entra;
  const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(nombre));
  return Number.isFinite(ms) && ms > 0 ? ms : DUR.entra;
}

function duraciones(rapido) {
  return {
    numero: duracionDeToken(rapido ? '--fj-dur-numero-rapido' : '--fj-dur-numero'),
    barra: duracionDeToken(rapido ? '--fj-dur-barra-rapido' : '--fj-dur-barra'),
    pulso: duracionDeToken(rapido ? '--fj-dur-pulso-rapido' : '--fj-dur-pulso')
  };
}

// El ▲▼ (o el número, si el cambio no llega a flecha) entra con un pulso.
function pulsar(caja, dur) {
  const visible = (el) => el && el.getClientRects().length > 0;
  const blanco = [caja.querySelector('.fj-delta'), caja.querySelector('.fj-num')].find(visible);
  if (!blanco) return;
  blanco.classList.add('fj-pulso');
  animarNodo(blanco, [{ opacity: 0.25, transform: PULSO_DESDE }, { opacity: 1, transform: 'none' }], { dur: dur.pulso, delay: dur.numero * PULSO_RETARDO, easing: RESORTE });
}

function nodo(etiqueta, clase, texto = null) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== null) el.textContent = texto;
  return el;
}

function deltaNodo(delta, sufijo = '') {
  if (!delta) return null;
  const sube = delta > 0;
  const caja = nodo('span', `fj-delta ${sube ? 'sube' : 'baja'}`);
  caja.append(triangulos('baja', sube ? '+' : '-'), document.createTextNode(String(Math.abs(delta))));
  if (sufijo) caja.append(nodo('em', 'fj-sufijo', sufijo));
  caja.setAttribute('aria-label', `${sube ? 'subió' : 'bajó'} ${Math.abs(delta)} ${sufijo}`.trim());
  return caja;
}

function barra(progreso, clase = 'fj-barra') {
  const b = nodo('span', clase);
  b.setAttribute('aria-hidden', 'true');
  const lleno = nodo('i');
  lleno.style.width = `${Math.round(Math.max(0, Math.min(1, progreso)) * 100)}%`;
  b.append(lleno);
  return b;
}

function copa(tier) {
  const c = icono('copa', { clase: 'ln-ico fj-copa' });
  c.dataset.tier = String(tier ?? 'otro');
  return c;
}

// "Te faltan 15 puntos para Querido (25)".
function faltaPara(siguiente) {
  return `${faltan(siguiente.falta, 'punto', 'puntos', 'Te')} para ${siguiente.label} (${siguiente.umbral})`;
}

// "→ Querido 25": el próximo escalón con su número.
function proximo(siguiente) {
  if (!siguiente) return null;
  const p = nodo('span', 'fj-prox');
  p.append(document.createTextNode(`→ ${siguiente.label} `), nodo('b', null, String(siguiente.umbral)));
  return p;
}

// Todo lo que la ficha dice, leído una sola vez de la `vista`.
export function datosDeLaFicha(estado) {
  const amateur = estado.phase === 'amateur';
  return {
    amateur,
    nivel: nivelDelAnio(estado),
    arraigo: escaleraDeArraigo(estado),
    carrera: puntajeEnVivo(estado),
    jerarquia: escaleraDeJerarquia(estado),
    hype: escaleraDeHype(estado),
    internacional: amateur ? null : estadoInternacional(estado),
    vitrina: vitrinaDeTitulos(estado.career?.registro),
    dinero: dineroGanado(estado.career?.registro)
  };
}

// La ficha se ve mientras hay carrera en juego (amateur o profesional); terminada, la franja dice el pico y manda la carta.
export function hayFicha(estado) {
  return Boolean(estado?.player && !estado.terminado && (estado.phase === 'amateur' || estado.phase === 'profesional'));
}

// --- La tira -------------------------------------------------------------------------------------------------------------

function item(clase, prio, rotulo, ico = null) {
  const caja = nodo('span', `fj-item ${clase}`);
  caja.dataset.prio = String(prio);
  const rot = nodo('span', 'fj-rot');
  if (ico) rot.append(icono(ico));
  rot.append(nodo('span', 'fj-rot-txt', rotulo));
  caja.append(rot);
  return caja;
}

function tiraNivel(d) {
  const caja = item('fj-nivel', 1, 'Nivel', 'nivel');
  caja.dataset.banda = d.nivel.banda;
  const valor = nodo('b', 'fj-num');
  valor.dataset.campo = 'nivel';
  caja.append(valor);
  const delta = deltaNodo(d.nivel.delta);
  if (delta) caja.append(delta);
  const movido = d.nivel.delta ? `, ${d.nivel.delta > 0 ? '+' : ''}${d.nivel.delta} en el año` : '';
  caja.title = `Nivel ${d.nivel.valor}: ${LABEL_BANDA[d.nivel.banda] ?? ''}${movido}`;
  return { caja, valor };
}

function tiraArraigo(a) {
  const caja = item('fj-arraigo', 2, 'Arraigo', 'arraigo');
  caja.dataset.escalon = a.id;
  const escalon = nodo('b', 'fj-escalon', a.esMaxima ? `Leyenda de ${a.org}` : a.label);
  caja.dataset.campo = 'arraigo';
  caja.append(escalon, barra(a.progreso));
  const prox = proximo(a.siguiente);
  if (prox) caja.append(prox);
  const delta = deltaNodo(a.delta);
  if (delta) caja.append(delta);
  caja.title = a.esMaxima
    ? `Arraigo ${Math.round(a.valor)} con ${a.org}: sos Leyenda del club`
    : `Arraigo ${Math.round(a.valor)} con ${a.org}: ${a.label}. ${faltaPara(a.siguiente)}`;
  return caja;
}

function tiraCarrera(c) {
  const caja = item('fj-carrera', 3, 'Carrera', 'temporada');
  let valor = null;
  if (c.total !== null) {
    valor = nodo('b', 'fj-num fj-pts');
    valor.dataset.campo = 'puntaje';
    caja.append(valor);
  }
  if (c.actual) caja.append(nodo('span', 'fj-escalon', c.actual.nombre));
  if (c.siguiente) caja.append(nodo('span', 'fj-prox fj-prox-carrera', `→ ${c.siguiente.nombre}`));
  caja.title = [c.actual?.nombre, c.siguiente?.enPresente].filter(Boolean).join('. ');
  return { caja, valor };
}

function tiraBanda(clase, rotulo, ico, b) {
  const caja = item(clase, 4, rotulo, ico);
  caja.append(nodo('b', 'fj-num fj-chico', num(b.valor)), nodo('span', 'fj-escalon', b.label));
  caja.dataset.campo = clase === 'fj-jer' ? 'jerarquia' : 'hype';
  const prox = proximo(b.siguiente);
  if (prox) caja.append(prox);
  const delta = deltaNodo(b.delta);
  if (delta) caja.append(delta);
  caja.title = b.siguiente
    ? `${rotulo} ${num(b.valor)}: ${b.label}. ${faltaPara(b.siguiente)}`
    : `${rotulo} ${num(b.valor)}: ${b.label}, lo más alto`;
  return caja;
}

function tiraInternacional(estadoInt) {
  const caja = item('fj-int', 5, 'Internacional', 'mundo');
  caja.dataset.estado = estadoInt;
  caja.append(nodo('span', 'fj-chip', LABEL_INTERNACIONAL[estadoInt] ?? estadoInt));
  return caja;
}

function tiraTitulos(v) {
  const caja = item('fj-titulos', 6, 'Títulos', null);
  const copas = nodo('span', 'fj-vitrina');
  copas.setAttribute('aria-hidden', 'true');
  const todas = v.grupos.flatMap((g) => g.titulos.map((t) => ({ ...t, tier: g.tier })));
  if (todas.length === 0) {
    const vacia = copa('vacia');
    copas.append(vacia);
  }
  for (const t of todas.slice(0, COPAS_EN_LA_TIRA)) {
    const c = copa(t.tier);
    c.dataset.indice = String(t.indice);
    copas.append(c);
  }
  caja.append(copas, nodo('b', 'fj-num fj-chico', String(v.total)));
  caja.title = v.total === 0 ? 'Todavía sin títulos: la vitrina espera' : `${v.total} ${v.total === 1 ? 'título' : 'títulos'}`;
  return caja;
}

function tiraPlata(dinero) {
  const caja = item('fj-plata', 7, 'Ganado', null);
  caja.dataset.campo = 'dinero';
  caja.append(nodo('b', 'fj-num fj-chico', `US${plata(dinero)}`));
  caja.title = `Ganaste US${plata(dinero)} en toda la carrera`;
  return caja;
}

// --- La hoja (la ficha completa) -------------------------------------------------------------------------------------

function fila(rotulo, ico, valor, texto, extra = null) {
  const f = nodo('div', 'fj-fila');
  const rot = nodo('span', 'fj-rot');
  if (ico) rot.append(icono(ico));
  rot.append(document.createTextNode(rotulo));
  const v = nodo('b', 'fj-fila-valor');
  if (valor instanceof Node) v.append(valor);
  else v.textContent = valor;
  const t = nodo('span', 'fj-fila-texto');
  for (const parte of [].concat(texto)) {
    if (parte == null) continue;
    t.append(parte instanceof Node ? parte : document.createTextNode(parte));
  }
  f.append(rot, v, t);
  if (extra) f.append(extra);
  return f;
}

// La escalera entera con el escalón actual marcado (la del arraigo: Uno más · Querido · Ídolo · Leyenda).
function escalones(a) {
  const lista = nodo('span', 'fj-escalones');
  lista.setAttribute('aria-hidden', 'true');
  for (const [i, nombre] of ['Uno más', 'Querido', 'Ídolo', 'Leyenda'].entries()) {
    const paso = nodo('i', null, nombre);
    if (i + 1 < a.paso) paso.dataset.paso = 'hecho';
    if (i + 1 === a.paso) paso.dataset.paso = 'actual';
    lista.append(paso);
  }
  return lista;
}

function pintarHoja(hoja, d) {
  const filas = [];
  const nivel = fila('Nivel', 'nivel', num(d.nivel.valor), [LABEL_BANDA[d.nivel.banda] ?? '', deltaNodo(d.nivel.delta, 'en el año')]);
  nivel.dataset.banda = d.nivel.banda;
  filas.push(nivel);
  if (d.arraigo) {
    const a = d.arraigo;
    const texto = a.esMaxima
      ? `Sos Leyenda de ${a.org}. Tu nombre ya es parte del club.`
      : `${a.label} en ${a.org}. ${faltaPara(a.siguiente)}.`;
    const f = fila('Arraigo', 'arraigo', num(a.valor), [texto, deltaNodo(a.delta, 'en el año')], escalones(a));
    f.dataset.escalon = a.id;
    filas.push(f);
  }
  if (d.carrera.actual) {
    const c = d.carrera;
    const texto = c.siguiente ? `${c.actual.nombre}. Para ${c.siguiente.nombre}: ${c.siguiente.enPresente.charAt(0).toLowerCase()}${c.siguiente.enPresente.slice(1)}` : `${c.actual.nombre}: no hay escalón más alto.`;
    filas.push(fila('Carrera', 'temporada', c.total === null ? '—' : num(c.total), texto));
  }
  for (const [rotulo, ico, b] of [['Jerarquía', 'jerarquia', d.jerarquia], ['Hype', 'hype', d.hype]]) {
    if (!b) continue;
    const texto = b.siguiente
      ? `${b.label}. ${faltaPara(b.siguiente)}.`
      : `${b.label}: lo más alto.`;
    filas.push(fila(rotulo, ico, num(b.valor), [texto, deltaNodo(b.delta, 'en el año')]));
  }
  if (d.internacional) {
    const textos = {
      sin_chance: 'con esta tabla, el cupo internacional de tu liga queda lejos.',
      en_carpeta: 'a un par de puestos del cupo internacional de tu liga.',
      clasificado: 'hoy estás adentro del cupo internacional de tu liga.',
      jugando: 'estás jugando el internacional.'
    };
    const estadoInt = LABEL_INTERNACIONAL[d.internacional];
    filas.push(fila('Cupo', 'mundo', '', [nodo('b', 'fj-fuerte', `${estadoInt.charAt(0).toUpperCase()}${estadoInt.slice(1)}: `), textos[d.internacional] ?? '']));
  }
  if (!d.amateur) {
    const vitrina = nodo('div', 'fj-vitrina-hoja');
    for (const g of d.vitrina.grupos) {
      const grupo = nodo('p', 'fj-grupo');
      grupo.dataset.tier = String(g.tier ?? 'otro');
      grupo.append(nodo('span', 'fj-grupo-rot', LABEL_TIER[g.tier] ?? 'Otros'));
      for (const t of g.titulos) {
        const c = copa(g.tier);
        c.dataset.indice = String(t.indice);
        const linea = nodo('span', 'fj-titulo');
        linea.append(c, document.createTextNode(`${t.nombre} ${t.anio}`));
        linea.title = `${t.nombre} ${t.anio} con ${t.org}`;
        grupo.append(linea);
      }
      vitrina.append(grupo);
    }
    const texto = d.vitrina.total === 0 ? 'Todavía nada. La vitrina espera la primera.' : null;
    filas.push(fila('Títulos', 'copa', String(d.vitrina.total), texto, d.vitrina.total ? vitrina : null));
    filas.push(fila('Ganado', null, '', [nodo('b', 'fj-fuerte', `US${plata(d.dinero)}`), ' en toda la carrera, sueldo a sueldo.']));
  }
  hoja.replaceChildren(...filas);
}

// --- La ficha ------------------------------------------------------------------------------------------------------------

// `seccion`: el `<section class="ficha-fija">` que crea la franja. Devuelve `{ pintar(estado, { rapido }) }`.
export function crearFichaFija(seccion) {
  const tira = nodo('button', 'fj-tira');
  tira.type = 'button';
  tira.id = 'fichaTira';
  tira.setAttribute('aria-expanded', 'false');
  tira.setAttribute('aria-controls', 'fichaHoja');
  const hoja = nodo('div', 'fj-hoja');
  hoja.id = 'fichaHoja';
  hoja.hidden = true;
  hoja.setAttribute('role', 'region');
  hoja.setAttribute('aria-label', 'Tu ficha completa');
  seccion.append(tira, hoja);

  // Lo que la ficha mostraba en la `vista` anterior de la MISMA carrera: desde ahí ruedan los números y se sabe qué copa
  // es nueva.
  let antes = null;

  function abrir(si) {
    hoja.hidden = !si;
    tira.setAttribute('aria-expanded', si ? 'true' : 'false');
    seccion.dataset.abierta = si ? 'si' : '';
    if (si) animarNodo(hoja, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { dur: DUR.entra });
  }
  tira.addEventListener('click', () => abrir(hoja.hidden));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !hoja.hidden) abrir(false);
  });
  document.addEventListener('pointerdown', (e) => {
    if (!hoja.hidden && !seccion.contains(e.target)) abrir(false);
  });

  // `rapido`: el reproductor va en RÁPIDO (las duraciones cortas). La ficha anima igual.
  function pintar(estado, { rapido = false } = {}) {
    if (!hayFicha(estado)) {
      seccion.hidden = true;
      tira.replaceChildren();
      abrir(false);
      antes = null;
      return;
    }
    let d;
    try {
      d = datosDeLaFicha(estado);
    } catch (error) {
      console.error('No se pudo armar la ficha:', error);
      seccion.hidden = true;
      return;
    }
    const previo = antes?.seed === estado.seed ? antes : null;
    // La misma `vista` repintada (el director repinta sin que nada cambie): no se toca el DOM, así no se corta lo que está
    // rodando.
    const firma = JSON.stringify(d);
    if (previo && previo.firma === firma && !seccion.hidden) return;
    seccion.hidden = false;
    seccion.dataset.fase = d.amateur ? 'amateur' : 'pro';

    const items = [];
    const nivel = tiraNivel(d);
    items.push(nivel.caja);
    const arraigo = d.arraigo ? tiraArraigo(d.arraigo) : null;
    if (arraigo) items.push(arraigo);
    const carrera = tiraCarrera(d.carrera);
    items.push(carrera.caja);
    if (d.jerarquia) items.push(tiraBanda('fj-jer', 'Jerarquía', 'jerarquia', d.jerarquia));
    const hype = tiraBanda('fj-hype', 'Hype', 'hype', d.hype);
    items.push(hype);
    if (d.internacional) items.push(tiraInternacional(d.internacional));
    const titulos = d.amateur ? null : tiraTitulos(d.vitrina);
    if (titulos) items.push(titulos);
    if (!d.amateur && d.dinero > 0) items.push(tiraPlata(d.dinero));
    // La tira del celular: el nivel, el arraigo (o el escalón de la carrera, sin club) y los títulos (o el hype, amateur).
    for (const el of [nivel.caja, arraigo ?? carrera.caja, titulos ?? hype]) el.dataset.tira = 'si';

    const abre = nodo('span', 'fj-abre');
    abre.setAttribute('aria-hidden', 'true');
    tira.setAttribute('aria-label', `Tu ficha: nivel ${d.nivel.valor}${d.arraigo ? `, ${d.arraigo.label} en ${d.arraigo.org}` : ''}${d.amateur ? '' : `, ${d.vitrina.total} títulos`}. Abrir el detalle`);
    tira.replaceChildren(...items, abre);

    const dur = duraciones(rapido);
    const conPlata = (n) => `US${plata(n)}`;
    const ahora = {
      nivel: d.nivel.valor,
      puntaje: d.carrera.total,
      jerarquia: d.jerarquia ? Math.round(d.jerarquia.valor) : null,
      hype: d.hype.valor,
      dinero: d.dinero,
      arraigo: d.arraigo ? { org: d.arraigo.org, valor: Math.round(d.arraigo.valor), paso: d.arraigo.paso, progreso: d.arraigo.progreso } : null
    };
    const mover = (caja, numero, campo, formato = num) => {
      if (!caja || !numero) return;
      const a = previo?.[campo] ?? null;
      moverNumero(numero, a, ahora[campo], { formato, duracion: dur.numero, animar: true });
      if (Number.isFinite(a) && a !== ahora[campo]) pulsar(caja, dur);
    };
    mover(nivel.caja, nivel.valor, 'nivel');
    mover(carrera.caja, carrera.valor, 'puntaje');
    for (const campo of ['jerarquia', 'hype', 'dinero']) {
      const caja = tira.querySelector(`.fj-item[data-campo="${campo}"]`);
      mover(caja, caja?.querySelector('.fj-num'), campo, campo === 'dinero' ? conPlata : num);
    }
    // El arraigo: la barra se llena desde donde estaba (si subiste de escalón, desde el piso del nuevo) y el ▲ pulsa.
    const antesArraigo = previo?.arraigo && previo.arraigo.org === ahora.arraigo?.org ? previo.arraigo : null;
    if (arraigo && antesArraigo && antesArraigo.valor !== ahora.arraigo.valor) {
      const desde = antesArraigo.paso === ahora.arraigo.paso ? antesArraigo.progreso : antesArraigo.paso < ahora.arraigo.paso ? 0 : 1;
      const lleno = arraigo.querySelector('.fj-barra i');
      animarNodo(lleno, [{ width: `${Math.round(desde * 100)}%` }, { width: lleno.style.width }], { dur: dur.barra, easing: EXPO });
      pulsar(arraigo, dur);
    }

    // La copa nueva entra a la vitrina (en la tira y en la hoja): los títulos con índice mayor al total que había.
    if (previo && d.vitrina.total > previo.titulos) {
      const nuevas = [...tira.querySelectorAll('.fj-copa[data-indice]')].filter((c) => Number(c.dataset.indice) >= previo.titulos);
      nuevas.forEach((c, i) => {
        c.classList.add('fj-copa-nueva');
        animarNodo(c, [{ opacity: 0, transform: COPA_DESDE }, { opacity: 1, transform: 'none' }], { dur: DUR.larga * 2, delay: i * COPA_PASO_MS, easing: RESORTE });
      });
    }

    pintarHoja(hoja, d);
    antes = { seed: estado.seed, ...ahora, titulos: d.vitrina.total, firma };
  }

  return { pintar };
}
