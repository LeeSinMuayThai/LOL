// Los logos reales de las orgs y las ligas (PLANUI §4.7). Un solo mapa para toda la fusion: el mercado, el marcador de
// la serie y del Swiss, la carrera y la trayectoria.
//
// De donde salen: la API publica de LoL Esports (esports-api.lolesports.com/persisted/gw/getTeams y getLeagues, hl=en-US),
// que devuelve el logo oficial y actual de cada equipo y liga en su CDN, static.lolesports.com. Verificados el
// 2026-10-09: cada URL responde 200 con una imagen (PNG o WebP; algunas llegan como binary/octet-stream y el navegador
// las decodifica igual). Se eligio la version para fondo oscuro ("FullonDark", blanca o a color) porque toda la
// interfaz es oscura.
//
// Reglas:
// - se enlazan con <img> (nunca en un canvas, nunca versionados en el repo) y no hace falta CORS;
// - una org inventada por la simulacion (o un logo que no carga) lleva el escudo-monograma del sistema: las iniciales y
//   el filete de la luz;
// - pintarLogo() nunca aborta una carga: si la imagen falla, `onerror` la cambia por el escudo y la pagina sigue.
import { el, svg } from './util.js';

const CDN = 'https://static.lolesports.com';
const equipo = (archivo) => `${CDN}/teams/${archivo}`;
const liga = (archivo) => `${CDN}/leagues/${archivo}`;

// Las orgs reales que aparecen en muestras.json (mercado, serie, Swiss, Mundial, carrera, trayectoria, peor caso), con su
// liga de hoy. El nombre es el de la simulacion; la clave se compara sin mayusculas.
const ORGS = {
  // `tinta: 'oscura'`: el logo es negro (sobre la noche no se ve): donde va a color, se pasa a la tinta clara
  FURIA: { src: equipo('FURIA---black.png'), liga: 'CBLOL', tinta: 'oscura' },
  LOUD: { src: equipo('Logo-LOUD-Esports_Original.png'), liga: 'CBLOL' },
  'RED Canids Kalunga': { src: equipo('1631820575924_red-2021-worlds.png'), liga: 'CBLOL' },
  'Fluxo W7M': { src: equipo('1766161431111_LogoColorida.png'), liga: 'CBLOL' },
  'Vivo Keyd Stars': { src: equipo('1670542079678_vks.png'), liga: 'CBLOL' },
  'paiN Gaming': { src: equipo('1674657011011_pain_logo_white.png'), liga: 'CBLOL' },
  'Leviatán': { src: equipo('1643795049372_LEV-CLAROWhite.png'), liga: 'CBLOL' },
  // Los Grandes hoy compite como LØS (el mismo club; Leaguepedia redirige su logo al de LØS)
  'Los Grandes': { src: equipo('1784013312149_LOS-OLaranja.png'), liga: 'CBLOL' },
  'Karmine Corp': { src: equipo('1704714951336_KC.png'), liga: 'LEC' },
  'Movistar KOI': { src: equipo('1734012609283_MKOI_FullColor_Blue.png'), liga: 'LEC' },
  'G2 Esports': { src: equipo('G2-FullonDark.png'), liga: 'LEC' },
  Fnatic: { src: equipo('1631819669150_fnc-2021-worlds.png'), liga: 'LEC' },
  GIANTX: { src: equipo('1765897105091_GIANTX-logotype-white.png'), liga: 'LEC' },
  'Natus Vincere': { src: equipo('1752746833620_NAVI_FullColor.png'), liga: 'LEC' },
  // (PLANUI §4.10, D) T1 y KT Rolster no aparecen en muestras.json: los suma la pared de escudos de la LCK (getTeams,
  // 2026-10-10: los dos `active` con homeLeague LCK)
  T1: { src: equipo('1726801573959_539px-T1_2019_full_allmode.png'), liga: 'LCK' },
  'KT Rolster': { src: equipo('kt_darkbackground.png'), liga: 'LCK' },
  'Gen.G': { src: equipo('1773829250929_GENGLOGO_GOLD.png'), liga: 'LCK' },
  'Dplus KIA': { src: equipo('1673260049703_DPlusKIALOGO11.png'), liga: 'LCK' },
  'Hanwha Life Esports': { src: equipo('1631819564399_hle-2021-worlds.png'), liga: 'LCK' },
  'KIWOOM DRX': { src: equipo('1774247803537_horizontal_EN_Wh.png'), liga: 'LCK' },
  'Nongshim RedForce': { src: equipo('NSFullonDark.png'), liga: 'LCK' },
  'Hanjin Brion': { src: equipo('1716454325887_Nowyprojekt.png'), liga: 'LCK' },
  'BNK FearX': { src: equipo('1734691810721_BFXfullcolorfordarkbg.png'), liga: 'LCK' },
  'DN SOOPers': { src: equipo('1767340467921_DN_SOOPerslogo_profile.webp'), liga: 'LCK' },
  'Top Esports': { src: equipo('1592592064571_TopEsportsTES-01-FullonDark.png'), liga: 'LPL' },
  'Ninjas in Pyjamas': { src: equipo('1673425724696_NIP-Symbol-RGB-NeonYellow1.png'), liga: 'LPL' },
  'Invictus Gaming': { src: equipo('1634762917340_300px-Invictus_Gaming_logo.png'), liga: 'LPL' },
  'Bilibili Gaming': { src: equipo('1682322954525_Bilibili_Gaming_logo_20211.png'), liga: 'LPL' },
  "Anyone's Legend": { src: equipo('1641199582689_.png'), liga: 'LPL' },
  'ThunderTalk Gaming': { src: equipo('TT-FullonDark.png'), liga: 'LPL' },
  'Team WE': { src: equipo('1634763008788_220px-Team_WE_logo.png'), liga: 'LPL' },
  'Oh My God': { src: equipo('1686821355861_OMG_2023_logo-01.png'), liga: 'LPL' },
  'LGD Gaming': { src: equipo('LGD-FullonDark-1.png'), liga: 'LPL' },
  'Edward Gaming': { src: equipo('1631819297476_edg-2021-worlds.png'), liga: 'LPL' },
  'JD Gaming': { src: equipo('1627457924722_29.png'), liga: 'LPL' },
  'Ultra Prime': { src: equipo('ultraprime.png'), liga: 'LPL' },
  FlyQuest: { src: equipo('flyquest-new-on-dark.png'), liga: 'LCS' },
  'Team Liquid': { src: equipo('1769357207762_TLAlienware_Minimal_Bug-White.png'), liga: 'LCS' },
  'Shopify Rebellion': { src: equipo('1701424227458_Teams204_Shopify_1632869404072.png'), liga: 'LCS' },
  Sentinels: { src: equipo('1767769784669_Sentinels_2020_Icon.png'), liga: 'LCS' },
  Disguised: { src: equipo('1731496922454_Disguised-Wordmark-Yellow-Main.png'), liga: 'LCS' },
  'Team Secret Whales': { src: equipo('1774598000328_White_EyeText_600p.png'), liga: 'LCP' },
  'Deep Cross Gaming': { src: equipo('1785400397160_LCP_DCG_Full_W1.png'), liga: 'LCP' },
  'Ground Zero Gaming': { src: equipo('1766395585595_LCP_TEAMLogo_GZ_Full_B.png'), liga: 'LCP' },
  'Fukuoka SoftBank HAWKS gaming': { src: equipo('1725885083108_SHG_White_Main.png'), liga: 'LCP' },
  'CTBC Flying Oyster': { src: equipo('1656307849320_CFO_Logo.png'), liga: 'LCP' },
};

// Los planteles de 2026 (CONCEPTO §12, en el orden de src/data/leagues.json): la pared de escudos de la bisagra
// (PLANUI §4.10, `var=liga`). Solo las ligas que hoy dibuja alguna pantalla; cada nombre esta en ORGS.
const PLANTELES = {
  CBLOL: ['Fluxo W7M', 'FURIA', 'Leviatán', 'Los Grandes', 'LOUD', 'paiN Gaming', 'RED Canids Kalunga', 'Vivo Keyd Stars'],
  LCK: ['T1', 'Gen.G', 'Hanwha Life Esports', 'KT Rolster', 'Dplus KIA', 'BNK FearX', 'KIWOOM DRX', 'Nongshim RedForce', 'Hanjin Brion', 'DN SOOPers'],
};

// Las orgs que la simulacion invento (no existen): escudo-monograma. Se listan para que la cobertura se pueda chequear.
export const INVENTADAS = ['Ecos Force', 'Enclave Esports', 'Enclave Collective', 'Espectro Legion', 'Fénix Gaming', 'Onda Collective', 'Vórtice Squad'];

// Las ligas y los torneos. La clave es el id del motor (CBLOL, CD, LCK...) o el torneo (mundial, msi).
const LIGAS = {
  cblol: { src: liga('cblol-logo-symbol-offwhite.png'), nombre: 'CBLOL' },
  cd: { src: liga('1739883216140_CIRCUITO_DESAFIANTE_COLOR_ORANGE.png'), nombre: 'Circuito Desafiante' },
  lec: { src: liga('1592516184297_LEC-01-FullonDark.png'), nombre: 'LEC' },
  lck: { src: liga('lck-color-on-black.png'), nombre: 'LCK' },
  lpl: { src: liga('1592516115322_LPL-01-FullonDark.png'), nombre: 'LPL' },
  lcs: { src: liga('1706356907418_LCSNew-01-FullonDark.png'), nombre: 'LCS' },
  lcp: { src: liga('1733468139601_lcp-color-golden.png'), nombre: 'LCP' },
  lrn: { src: liga('1742461971444_FULL_COLOR_FOR_DARK_BG1.png'), nombre: 'LRN' },
  lrs: { src: liga('1742460115671_FULL_COLOR_FOR_DARK_BG.png'), nombre: 'LRS' },
  mundial: { src: liga('1592594612171_WorldsDarkBG.png'), nombre: 'Mundial' },
  msi: { src: liga('1592594634248_MSIDarkBG.png'), nombre: 'MSI' },
  'first stand': { src: liga('1740042025201_RG_LOL_FIRST_STAND_LOGO_VOLT_ALPHA.png'), nombre: 'First Stand' },
};
const ALIAS_LIGA = { worlds: 'mundial', 'circuito desafiante': 'cd', first_stand: 'first stand' };

// "Movistar KOI (LEC)" -> "movistar koi": sin mayusculas, sin la aclaracion entre parentesis.
const clave = (nombre) => String(nombre ?? '').replace(/\s*\(.*?\)\s*$/, '').trim().toLowerCase();
const PORCLAVE = new Map(Object.entries(ORGS).map(([n, x]) => [clave(n), { ...x, nombre: n }]));

// Las iniciales del escudo: la primera letra de las dos primeras palabras ("Vórtice Squad" -> "VS"); una sola palabra,
// sus dos primeras letras.
export function iniciales(nombre) {
  const palabras = String(nombre ?? '').replace(/\(.*?\)/g, '').split(/[\s.\-_]+/).filter((p) => /\p{L}/u.test(p));
  if (!palabras.length) return '?';
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  return (palabras[0][0] + palabras[1][0]).toUpperCase();
}

// { src, iniciales, liga } para una org real; { src: null, iniciales } para una inventada (o desconocida).
export function logoOrg(nombre) {
  const x = PORCLAVE.get(clave(nombre));
  return x ? { src: x.src, iniciales: iniciales(nombre), liga: x.liga, ...(x.tinta ? { tinta: x.tinta } : {}) } : { src: null, iniciales: iniciales(nombre) };
}

// Los equipos de una liga ('CBLOL', 'LCK'), en orden: [{ nombre, src, iniciales, tinta? }]. Una liga sin plantel, [].
export function equiposDe(liga) {
  const k = String(liga ?? '').toUpperCase();
  return (PLANTELES[k] ?? []).map((nombre) => ({ nombre, ...logoOrg(nombre) }));
}

// { src, iniciales, nombre } para una liga o un torneo ("Mundial 2036" -> el del Mundial).
export function logoLiga(id) {
  let k = clave(id);
  k = ALIAS_LIGA[k] ?? k;
  if (k.startsWith('mundial')) k = 'mundial';
  const x = LIGAS[k];
  return x ? { src: x.src, iniciales: iniciales(x.nombre), nombre: x.nombre } : { src: null, iniciales: iniciales(id), nombre: String(id ?? '') };
}

// El escudo-monograma del sistema: un escudo con el filete de la luz y las iniciales.
export function escudo(ini) {
  return svg('svg', { class: 'escudo', viewBox: '0 0 40 46', 'aria-hidden': 'true', focusable: 'false' }, [
    svg('path', { class: 'escudo-forma', d: 'M20 1.6 L37.4 7.2 V21.8 C37.4 32.6 30.2 40.4 20 44.4 C9.8 40.4 2.6 32.6 2.6 21.8 V7.2 Z' }),
    svg('path', { class: 'escudo-canto', d: 'M20 5.4 L33.8 9.9 V21.8 C33.8 30.4 28.2 36.8 20 40.4' }),
    svg('text', { class: 'escudo-ini', x: '20', y: '27.6', 'text-anchor': 'middle' }, document.createTextNode(ini)),
  ]);
}

// El logo pintado: <span class="logo"> con el <img> (o el escudo). `tam`: el lado de la caja en px. `liga`: true para
// pintar una liga o un torneo. `alt`: '' si el nombre ya esta escrito al lado (el logo es decorativo).
export function pintarLogo(nombre, { tam = 32, liga: esLiga = false, alt, clase = '' } = {}) {
  const info = esLiga ? logoLiga(nombre) : logoOrg(nombre);
  const caja = el('span', { class: ['logo', esLiga ? 'logo-liga' : 'logo-org', clase].filter(Boolean).join(' '), 'data-logo': String(nombre ?? ''), style: { '--logo-tam': `${tam}px` } });
  const texto = alt ?? (esLiga ? info.nombre : String(nombre ?? ''));
  const aEscudo = () => {
    caja.classList.add('sin-logo');
    if (texto) {
      caja.setAttribute('role', 'img');
      caja.setAttribute('aria-label', texto);
    }
    return escudo(info.iniciales);
  };
  if (!info.src) {
    caja.append(aEscudo());
    return caja;
  }
  const img = el('img', { src: info.src, alt: texto, decoding: 'async', draggable: 'false', referrerpolicy: 'no-referrer' });
  img.addEventListener('error', () => img.replaceWith(aEscudo()), { once: true });
  caja.append(img);
  return caja;
}

// El tono de una org (el token --org-<tono>): el suyo para las reales que tienen color de marca en tokens.css, uno de la
// paleta (por hash del nombre) para el resto. El color de una org aparece solo junto a su logo.
const TONO = { loud: 'loud', furia: 'furia' };
export function tonoOrg(nombre) {
  const k = clave(nombre);
  if (TONO[k]) return TONO[k];
  let h = 0;
  for (const c of String(nombre ?? '')) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return `p${(h % 4) + 1}`;
}
