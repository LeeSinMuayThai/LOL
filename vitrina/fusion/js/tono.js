// EL SEGUNDO TONO (PLANUI §4.9, LINEA.md §3 y §4.1). El usuario: "que sea todo negro y dorado lo hace muy aburrido". El
// bitono del arte es noche + luz, y el tono dice DONDE ESTAS: la era (el inicio, las decisiones comunes, el reposo del
// mercado), el destino (cada mitad de la costura de la bisagra), la competicion (la serie, el Swiss), la org (el mercado
// al apuntar, la firma, cada mitad del cara a cara) o el oro (el titulo; la plata en Worlds).
//
// Un tono es un objeto de NOMBRES de token, nunca hex (el hex vive solo en estilos/tokens.css):
//   { id, luz, contra, acento, noche, vacio }   p. ej. luz: '--tono-cblol-luz'
//   luz     la luz del mundo (haces, bruma, polvo, las luces del bitono)
//   contra  la luz de contra (el filo del campeon)
//   acento  el acento de la interfaz (se lee sobre el panel: >= 6,5:1 medido para las orgs)
//   noche   las sombras del bitono y el fondo del mundo: un oscuro teñido del matiz del tono
//   vacio   el fondo mas hondo (abajo del gradiente del mundo)
// De donde sale cada uno: las eras y las competiciones usan sus tokens de siempre (--luz-<era>, --comp-<id>-*) y suman
// la noche y el vacio; las orgs reales, el color dominante de su logo medido por pixeles (offline: los valores y su
// procedencia estan anotados en tokens.css); las inventadas, las paletas del sistema (--org-p1...p4, por hash del nombre,
// como js/logos.js).
//
// Quien lo usa: ambiente({ paleta: paletaDe(tono) }) tiñe la luz y la noche del mundo; ambiente({ costura: { a: { tono },
// b: { tono } } }) pinta cada mitad; aplicarTono(nodo, tono) pone --tono-luz/-contra/-acento/-noche/-vacio en un nodo
// para el CSS (con su valor por defecto en tokens.css: la era).
import { leerColor } from './util.js';
import { logoOrg as logoDeOrg } from './logos.js';

const ERAS = ['pieza', 'academia', 'escenario', 'mundial', 'leyenda'];
const COMPETICIONES = ['worlds', 'msi', 'firststand', 'cblol', 'lec', 'lck', 'lpl', 'lcs', 'lcp'];
const CAMPOS = ['luz', 'contra', 'acento', 'noche', 'vacio'];
// Dos tonos se "parecen" si el matiz de sus luces esta a menos de esto (grados). Dos blancos siempre se parecen.
const UMBRAL_MATIZ = 38;
// Debajo de este croma (max - min, 0-1) una luz es blanca: su matiz sale de la contra.
const CROMA_BLANCO = 0.25;
// Las paletas de las orgs inventadas (--org-p1...p4), elegidas por hash del nombre como en js/logos.js.
const PALETAS = 4;

const deId = (id) => Object.freeze({ id, ...Object.fromEntries(CAMPOS.map((k) => [k, `--tono-${id}-${k}`])) });

export const TONO_ORO = deId('oro');
export const TONO_PLATA = deId('plata');

export function tonoEra(era) {
  return deId(`era-${ERAS.includes(era) ? era : 'pieza'}`);
}
export function tonoCompeticion(idComp) {
  const id = String(idComp ?? '').toLowerCase().replace(/[^a-z]/g, '');
  return deId(COMPETICIONES.includes(id) ? id : id === 'mundial' ? 'worlds' : 'cblol');
}
// La liga de un destino ('CBLOL', 'LCK', 'Mundial'...) -> el tono de su competicion. Si la luz de la competicion es
// blanca (el CBLOL, la LCK, la LCS) y su contra no, la contra pasa a ser la luz: en la bisagra cada mitad tiene que
// leerse por su color (el rojo del CBLOL contra el azul de la LCK), no por dos blancos.
export function tonoDestino(liga) {
  const t = tonoCompeticion(liga);
  if (!esBlanca(t.luz) || esBlanca(t.contra)) return t;
  return Object.freeze({ ...t, id: `destino-${t.id}`, luz: t.contra, contra: t.luz });
}

// "Movistar KOI (LEC)" -> "movistar-koi": sin acentos ni la aclaracion entre parentesis.
const slug = (n) =>
  String(n ?? '')
    .replace(/\s*\(.*?\)\s*$/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const medidas = new Map();
// true si tokens.css trae el tono medido de esta org (las reales de js/logos.js)
function medida(s) {
  if (!medidas.has(s)) medidas.set(s, getComputedStyle(document.documentElement).getPropertyValue(`--tono-org-${s}-luz`).trim() !== '');
  return medidas.get(s);
}
// La paleta del sistema de una org inventada: el mismo hash que js/logos.js (tonoOrg), asi el chip y el tono coinciden.
function paleta(nombre) {
  let h = 0;
  for (const c of String(nombre ?? '')) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return `p${(h % PALETAS) + 1}`;
}
// El tono de una org: el medido de su logo si es real, la paleta del sistema si la simulacion la invento.
export function tonoOrg(nombreOrg) {
  const s = slug(nombreOrg);
  if (s && logoDeOrg(nombreOrg).src && medida(s)) return deId(`org-${s}`);
  return deId(`org-${paleta(nombreOrg)}`);
}

// El tono de una pantalla. `contexto` (opcional) manda: { tipo: 'era'|'destino'|'competicion'|'org'|'oro'|'plata', clave }.
// Sin contexto: el titulo va en oro y el resto en la era de <html data-era> (o `era`, si viene).
export function tonoDe({ pantalla, muestra, contexto, era } = {}) {
  const { tipo, clave } = contexto ?? {};
  if (tipo === 'era') return tonoEra(clave);
  if (tipo === 'destino') return tonoDestino(clave);
  if (tipo === 'competicion') return tonoCompeticion(clave);
  if (tipo === 'org') return tonoOrg(clave);
  if (tipo === 'oro') return TONO_ORO;
  if (tipo === 'plata') return TONO_PLATA;
  if (pantalla === 'cumbre' && muestra === 'titulo') return TONO_ORO;
  return tonoEra(era ?? document.documentElement.dataset.era);
}

// ---------- el matiz (para parecidos) ----------
function matiz([r, g, b]) {
  const mx = Math.max(r, g, b);
  const d = mx - Math.min(r, g, b);
  if (d === 0) return { h: 0, croma: 0 };
  let h;
  if (mx === r) h = ((g - b) / d) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, croma: d };
}
const esBlanca = (token) => matiz(leerColor(token)).croma < CROMA_BLANCO;
// El matiz que se ve de un tono: el de su luz o, si la luz es blanca, el de su contra. null si los dos son blancos.
function matizDe(t) {
  const l = matiz(leerColor(t.luz));
  if (l.croma >= CROMA_BLANCO) return l.h;
  const c = matiz(leerColor(t.contra));
  return c.croma >= CROMA_BLANCO ? c.h : null;
}
// true si los dos tonos se confundirian en una costura (matiz a < UMBRAL_MATIZ grados, o los dos blancos).
export function parecidos(t1, t2) {
  if (!t1 || !t2) return false;
  if (t1.id === t2.id) return true;
  const a = matizDe(t1);
  const b = matizDe(t2);
  if (a == null || b == null) return a == null && b == null;
  const d = Math.abs(a - b);
  return Math.min(d, 360 - d) < UMBRAL_MATIZ;
}
// (extra) Si dos tonos se parecen, el lado B toma como luz la contra de la competicion (LINEA §3). Si esa tambien se
// parece al lado A (el rojo del CBLOL contra una org roja), prueba la contra del propio B y despues la luz de la
// competicion. Devuelve el tono B que hay que usar: el mismo, o uno con la luz cambiada (id con sufijo '-alterno').
export function separar(tA, tB, tComp) {
  if (!parecidos(tA, tB)) return tB;
  for (const luz of [tComp?.contra, tB.contra, tComp?.luz].filter(Boolean)) {
    const prueba = { ...tB, id: `${tB.id}-alterno`, luz, acento: luz };
    if (!parecidos(tA, prueba)) return Object.freeze(prueba);
  }
  return tB;
}

// ---------- al CSS y al mundo ----------
// Pone --tono-luz/-contra/-acento/-noche/-vacio en el elemento (como var(--tono-<id>-x)). `null` las saca (vuelve al
// valor por defecto de tokens.css: la luz de la era sobre la noche de siempre).
export function aplicarTono(elemento, tono) {
  if (!elemento) return;
  for (const k of CAMPOS) {
    if (tono?.[k]) elemento.style.setProperty(`--tono-${k}`, `var(${tono[k]})`);
    else elemento.style.removeProperty(`--tono-${k}`);
  }
  if (tono?.id) elemento.dataset.tono = tono.id;
  else delete elemento.dataset.tono;
}
// (extra) La paleta que entiende ambiente({ paleta }): la luz, la contra, la noche y el vacio del tono, con presencia k.
export const paletaDe = (tono, k = 1) => (tono ? { luz: tono.luz, contra: tono.contra, noche: tono.noche, vacio: tono.vacio, k } : null);
