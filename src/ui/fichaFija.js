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
  estadoInternacional, statsQueMuevenLasCartas, promesaAbierta, ROTULO_DE_BANDA
} from '../core/ficha.js';
import { plata, faltan } from '../core/formato.js';
import { etiquetaDeRanked, servidorDeLaPartida } from '../core/ranked.js';
import { moverNumero } from './core/delta.js';
import { icono, triangulos } from './fx/iconos.js';
import { num } from './fx/movimiento.js';
import { countUp } from './components/countUp.js';
import { animar as animarNodo, DUR, RESORTE, EXPO } from './fx/util.js';

const LABEL_BANDA = ROTULO_DE_BANDA;
// G2b-ficha: cuánto vive el ▲▼ "en el acto" de un stat que acaba de cambiar.
const FLASH_MS = 2600;
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
// Orden en que la tira se achica (D161): primero la plata, el internacional, el "→ próximo" de jerarquía y hype; recién después
// esos dos, los títulos, la carrera y el arraigo. `data-prio` mayor se esconde antes.
const PRIO_PROXIMOS = 5;
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

// I1c (D161): el rango de soloQ del amateur es lo primero que dice la ficha: el escalón en grande y el LP al lado.
function rangoDeLaFicha(estado) {
  const ranked = estado.player?.ranked;
  if (!ranked?.tier) return null;
  const [escalon, ...resto] = etiquetaDeRanked(ranked, servidorDeLaPartida(estado)).split(' · ');
  return { tier: ranked.tier, escalon, lp: resto.join(' · ') };
}

// Todo lo que la ficha dice, leído una sola vez de la `vista`.
export function datosDeLaFicha(estado) {
  const amateur = estado.phase === 'amateur';
  return {
    amateur,
    rango: amateur ? rangoDeLaFicha(estado) : null,
    nivel: nivelDelAnio(estado),
    juego: statsQueMuevenLasCartas(estado),
    promesa: promesaAbierta(estado),
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

// I1c (D164): la consecuencia de una decisión rueda ACÁ, en la ficha, y se queda hasta que el jugador sigue. La decisión no
// conoce la ficha: pide (`ficha:rodar`) y la ficha, si está a la vista, rueda los stats que cambiaron con su ▲▼ y devuelve cómo
// soltarlos (`detail.soltar`). `cambios`: los de `ui/core/inmediato.js` ({ campo, antes, despues }).
export const EVENTO_RODAR = 'ficha:rodar';
export const RODAR_MS = 600;
export function rodarEnLaFicha(cambios) {
  if (typeof document === 'undefined') return () => {};
  const detail = { cambios, soltar: null };
  document.dispatchEvent(new CustomEvent(EVENTO_RODAR, { detail }));
  return detail.soltar ?? (() => {});
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

function tiraRango(r) {
  const caja = item('fj-rango', 0, 'SoloQ', 'ranked');
  caja.dataset.tier = r.tier;
  caja.dataset.campo = 'ranked';
  caja.append(nodo('b', 'fj-rango-escalon', r.escalon));
  if (r.lp) caja.append(nodo('span', 'fj-rango-lp', r.lp));
  caja.title = `SoloQ: ${r.escalon}${r.lp ? ` · ${r.lp}` : ''}`;
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
  const caja = item('fj-titulos', 3.5, 'Títulos', null);
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

// G2b-ficha (PLANUI §0.9): los cinco stats que mueven las cartas (Mecánica, Macro, Laneo, Calls, Cabeza), SIEMPRE a la vista, a
// todo ancho, en su propia fila bajo la tira. Se crea una vez y se actualiza en el lugar: así el ▲▼ "en el acto" (el cambio contra
// el valor que el jugador ya vio) vive un par de segundos aunque la tira se repinte por otra cosa.
function crearFilaDeJuego() {
  const lista = nodo('ul', 'fj-juego-fija');
  lista.setAttribute('aria-label', 'Tu juego');
  const promesa = nodo('li', 'fj-promesa');
  promesa.hidden = true;
  lista.append(promesa);
  const celdas = new Map();
  const timers = new Map();

  function celdaDe(stat) {
    let c = celdas.get(stat.id);
    if (!c) {
      c = nodo('li', 'fj-stat');
      c.dataset.stat = stat.id;
      const rot = nodo('span', 'fj-stat-rot', stat.corto);
      const valor = nodo('b', 'fj-stat-valor');
      const flash = nodo('span', 'fj-stat-flash');
      flash.setAttribute('aria-live', 'polite');
      c.append(rot, valor, flash);
      celdas.set(stat.id, c);
      lista.insertBefore(c, promesa);
    }
    return c;
  }

  // `antes`: { [id]: valor } que el jugador vio en la vista anterior (o null: sin flecha). Devuelve el mapa de ahora.
  function pintar(juego, antes, promesaAbierta, dur) {
    const ahora = {};
    for (const stat of juego) {
      const c = celdaDe(stat);
      const valor = c.querySelector('.fj-stat-valor');
      const flash = c.querySelector('.fj-stat-flash');
      ahora[stat.id] = stat.valor;
      c.title = `${stat.rotulo} ${stat.valor}${stat.delta ? `, ${stat.delta > 0 ? '+' : ''}${stat.delta} en el año` : ''}`;
      const a = antes?.[stat.id];
      if (Number.isFinite(a) && a !== stat.valor) {
        moverNumero(valor, a, stat.valor, { formato: num, duracion: dur.numero, animar: true });
        const d = stat.valor - a;
        flash.replaceChildren(triangulos('baja', d > 0 ? '+' : '-'), document.createTextNode(String(Math.abs(d))));
        flash.dataset.signo = d > 0 ? 'sube' : 'baja';
        flash.setAttribute('aria-label', `${stat.rotulo} ${d > 0 ? 'subió' : 'bajó'} ${Math.abs(d)}`);
        animarNodo(flash, [{ opacity: 0.25, transform: PULSO_DESDE }, { opacity: 1, transform: 'none' }], { dur: dur.pulso, easing: RESORTE });
        clearTimeout(timers.get(stat.id));
        timers.set(stat.id, setTimeout(() => { flash.replaceChildren(); delete flash.dataset.signo; flash.removeAttribute('aria-label'); }, FLASH_MS));
      } else if (!valor.textContent || !Number.isFinite(a)) {
        valor.textContent = num(stat.valor);
      }
    }
    // G4b: la promesa abierta, un chip.
    promesa.hidden = !promesaAbierta;
    promesa.replaceChildren();
    if (promesaAbierta) {
      promesa.append(nodo('b', 'fj-promesa-texto', promesaAbierta.texto), nodo('span', 'fj-promesa-prog', promesaAbierta.progreso));
      promesa.title = `${promesaAbierta.texto} ${promesaAbierta.progreso}`.trim();
    }
    return ahora;
  }
  return { lista, pintar };
}

function pintarHoja(hoja, d) {
  const filas = [];
  const nivel = fila('Nivel', 'nivel', num(d.nivel.valor), [LABEL_BANDA[d.nivel.banda] ?? '', deltaNodo(d.nivel.delta, 'en el año')]);
  nivel.dataset.banda = d.nivel.banda;
  filas.push(nivel);
  if (d.promesa) filas.push(fila('Promesa', null, '', [nodo('b', 'fj-fuerte', `${d.promesa.texto} `), d.promesa.progreso]));
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
  const juegoFijo = crearFilaDeJuego();
  seccion.append(tira, juegoFijo.lista, hoja);

  // Lo que la ficha mostraba en la `vista` anterior de la MISMA carrera: desde ahí ruedan los números y se sabe qué copa
  // es nueva.
  let antes = null;

  function abrir(si) {
    hoja.hidden = !si;
    tira.setAttribute('aria-expanded', si ? 'true' : 'false');
    seccion.dataset.abierta = si ? 'si' : '';
    if (si) animarNodo(hoja, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { dur: DUR.entra });
  }
  // I1c: rueda lo que cambió una decisión y deja el ▲▼ a la vista hasta `soltar()`; lo que ya mostró no vuelve a rodar cuando la
  // `vista` se repinte (`antes` queda en el valor nuevo).
  // Dónde cae cada campo de la decisión en la ficha: el número que rueda (si lo tiene), la caja que muestra el ▲▼ y, para los
  // stats del juego, la celda con su flash. Todo lo que la ficha muestra rueda: stats, hype, arraigo, jerarquía, nivel y LP.
  const itemDe = (campo) => tira.querySelector(`.fj-item[data-campo="${campo}"]`);
  function blancoDe(campo, id) {
    if (campo.startsWith('player.stats.')) {
      const celda = seccion.querySelector(`.fj-stat[data-stat="${id}"]`);
      const caja = id === 'hype' ? itemDe('hype') : null;
      return { valor: celda?.querySelector('.fj-stat-valor') ?? caja?.querySelector('.fj-num') ?? null, flash: celda?.querySelector('.fj-stat-flash') ?? null, caja, previo: id };
    }
    if (campo === 'nivel') return { valor: tira.querySelector('.fj-num[data-campo="nivel"]'), flash: null, caja: tira.querySelector('.fj-nivel'), previo: 'nivel' };
    if (campo === 'career.jerarquia') { const caja = itemDe('jerarquia'); return { valor: caja?.querySelector('.fj-num') ?? null, flash: null, caja, previo: 'jerarquia' }; }
    if (campo === 'career.arraigo') return { valor: null, flash: null, caja: itemDe('arraigo'), previo: null };
    if (campo === 'player.ranked.lp') return { valor: tira.querySelector('.fj-rango-lp'), flash: null, caja: itemDe('ranked'), previo: null, formato: true };
    return { valor: null, flash: null, caja: null, previo: null };
  }
  document.addEventListener(EVENTO_RODAR, (e) => {
    const flashes = [];
    const escondidos = [];
    if (seccion.hidden) { e.detail.soltar = () => {}; return; }
    for (const c of e.detail.cambios ?? []) {
      const a = Math.round(c.antes);
      const b = Math.round(c.despues);
      if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) continue;
      const id = c.campo.split('.').pop();
      const d = b - a;
      const t = blancoDe(c.campo, id);
      if (antes && t.previo) {
        if (t.previo in (antes.juego ?? {})) antes.juego[t.previo] = b;
        else if (t.previo in antes) antes[t.previo] = b;
      }
      if (t.valor) {
        const resto = t.formato ? (t.valor.textContent.match(/^\d+(.*)$/)?.[1] ?? '') : '';
        const formato = t.formato ? (n) => `${n}${resto}` : num;
        if (!t.formato || /^\d/.test(t.valor.textContent)) countUp(t.valor, a, b, { dur: RODAR_MS, format: formato });
      }
      let flash = t.flash;
      if (!flash && t.caja) {
        // la caja de la tira no trae un lugar para el ▲▼ (o trae el del año): este lo cubre hasta `soltar()`
        for (const viejo of t.caja.querySelectorAll('.fj-delta:not([data-flash])')) { viejo.hidden = true; escondidos.push(viejo); }
        flash = nodo('span', 'fj-delta');
        flash.dataset.flash = 'si';
        t.caja.append(flash);
        flashes.push(flash);
        flash.dataset.propio = 'si';
      } else if (flash) flashes.push(flash);
      if (!flash) continue;
      flash.classList.toggle('sube', d > 0);
      flash.classList.toggle('baja', d < 0);
      flash.replaceChildren(triangulos('baja', d > 0 ? '+' : '-'), document.createTextNode(String(Math.abs(d))));
      flash.dataset.signo = d > 0 ? 'sube' : 'baja';
      flash.setAttribute('aria-label', `${id} ${d > 0 ? 'subió' : 'bajó'} ${Math.abs(d)}`);
      animarNodo(flash, [{ opacity: 0.25, transform: PULSO_DESDE }, { opacity: 1, transform: 'none' }], { dur: DUR.entra, easing: RESORTE });
    }
    e.detail.soltar = () => {
      for (const f of flashes) {
        if (f.dataset.propio) { f.remove(); continue; }
        f.replaceChildren(); delete f.dataset.signo; f.removeAttribute('aria-label');
      }
      for (const v of escondidos) v.hidden = false;
    };
  });
  // I1c (D161): la tira no recorta a ningún ancho. Si no entra, se esconden los ítems de menos prioridad, el último primero
  // (`data-prio`: 7 la plata … 2 el arraigo; el rango y el nivel quedan siempre; todo sigue en la hoja).
  function ajustar() {
    const items = [...tira.querySelectorAll('.fj-item')];
    for (const i of items) delete i.dataset.oculto;
    delete tira.dataset.sinProx;
    if (!tira.clientWidth) return;
    const cabe = () => tira.scrollWidth <= tira.clientWidth;
    const candidatos = items.filter((i) => i.getClientRects().length > 0 && Number(i.dataset.prio) > 1).sort((a, b) => Number(b.dataset.prio) - Number(a.dataset.prio));
    for (const i of candidatos) {
      if (cabe()) break;
      // antes de esconder la jerarquía, el hype, los títulos o lo que sigue, se les saca el "→ próximo" (sigue en la hoja)
      if (Number(i.dataset.prio) < PRIO_PROXIMOS && !tira.dataset.sinProx) {
        tira.dataset.sinProx = 'si';
        if (cabe()) break;
      }
      i.dataset.oculto = 'si';
    }
  }
  if (typeof ResizeObserver === 'function') {
    let ancho = 0;
    new ResizeObserver(() => { if (seccion.clientWidth !== ancho) { ancho = seccion.clientWidth; ajustar(); } }).observe(seccion);
  }
  document.fonts?.ready?.then(ajustar, () => {});
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
    if (d.rango) items.push(tiraRango(d.rango));
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
    tira.querySelector('.fj-rango')?.setAttribute('data-tira', 'si');

    const abre = nodo('span', 'fj-abre');
    abre.setAttribute('aria-hidden', 'true');
    tira.setAttribute('aria-label', `Tu ficha: nivel ${d.nivel.valor}${d.arraigo ? `, ${d.arraigo.label} en ${d.arraigo.org}` : ''}${d.amateur ? '' : `, ${d.vitrina.total} títulos`}. Abrir el detalle`);
    tira.replaceChildren(...items, abre);
    ajustar();

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

    const juego = juegoFijo.pintar(d.juego, previo?.juego ?? null, d.promesa, dur);
    pintarHoja(hoja, d);
    antes = { seed: estado.seed, ...ahora, juego, titulos: d.vitrina.total, firma };
  }

  return { pintar };
}
