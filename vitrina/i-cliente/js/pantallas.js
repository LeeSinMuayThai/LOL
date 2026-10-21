// A · CLIENTE — las cuatro pantallas. Todo el contenido es el de vitrina/ola-i/CONTRATO.md §1, sin agregar texto.
// Cada fabrica devuelve { nodo, mundo, tecla(e) -> bool, seguir(), destruir() }.
import { el, icono, marco, tecla, separador, boton, emblemaDiamante, correr, tramo, cubicOut, expoOut, clamp01 } from './piezas.js';

// Las lineas de tiempo (ms), las de §1.
const T = {
  apagar: 150, // la opcion no elegida baja al 35 %
  apagada: 0.35,
  rueda: [150, 600], // los numeros ruedan en la ficha (150-750)
  linea: [300, 300], // la linea bajo la opcion (300-600)
  seguir: [750, 150],
  selloEntra: 250,
  selloQueda: 1200,
  fila: 120,
  filaDur: 220,
  entradaCartas: 300,
  vuelo: [150, 400],
  ruedaCarta: [450, 600],
  golpe: 350,
  rastro: [600, 450],
};

const LOGO = {
  SEN: 'https://static.lolesports.com/teams/1767769784669_Sentinels_2020_Icon.png',
  LCS: 'https://static.lolesports.com/leagues/1706356907418_LCSNew-01-FullonDark.png',
};
const DDRAGON = 'https://ddragon.leagueoflegends.com/cdn';

// ======================================================================================================================
// La ficha (siempre visible): el rango primero, grande; debajo, chico, los cinco numeros, la edad y la temporada.
// ======================================================================================================================
const STATS = [
  ['mecanica', 'Mecánica', 70],
  ['macro', 'Macro', 58],
  ['laneo', 'Laneo', 66],
  ['cabeza', 'Cabeza', 61],
  ['hype', 'Hype', 34],
];

export function crearFicha() {
  const filas = {};
  const lista = el(
    'ul',
    { class: 'stats' },
    STATS.map(([k, nombre, v]) => {
      const num = el('span', { class: 'stat-num', text: String(v) });
      const delta = el('span', { class: 'stat-delta' }, [icono('sube', 'ico delta-ico'), el('span', { class: 'delta-num' })]);
      const fila = el('li', { class: 'stat', 'data-stat': k }, [el('span', { class: 'stat-nombre', text: nombre }), num, delta]);
      filas[k] = { fila, num, delta, base: v };
      return fila;
    }),
  );
  const nodo = marco('ficha', [
    el('div', { class: 'rango' }, [
      emblemaDiamante(),
      el('div', { class: 'rango-txt' }, [el('span', { class: 'rango-nombre', text: 'DIAMANTE II' }), el('span', { class: 'rango-lp', text: '· 64 LP' })]),
    ]),
    el('div', { class: 'lp', style: { '--lp': '0.64' }, 'aria-hidden': 'true' }, [el('i')]),
    lista,
    el('div', { class: 'ficha-pie', text: 'Edad 17 · Temporada 2026' }),
  ]);
  return {
    nodo,
    fila: (k) => filas[k].fila,
    // cambios: [{ stat, a }]; p: el avance de la rueda (0-1). El ▲ entra al empezar y queda destacado.
    rodar(cambios, p) {
      for (const { stat, a } of cambios) {
        const f = filas[stat];
        const d = a - f.base;
        const k = expoOut(p);
        f.num.textContent = String(Math.round(f.base + d * k));
        f.fila.dataset.cambio = p > 0 ? (d >= 0 ? 'sube' : 'baja') : '';
        f.delta.querySelector('.delta-ico').innerHTML = '';
        f.delta.querySelector('.delta-ico').append(icono(d >= 0 ? 'sube' : 'baja', 'ico').firstChild);
        f.delta.querySelector('.delta-num').textContent = String(Math.abs(d));
        const entra = cubicOut(clamp01(p * 4));
        f.delta.style.opacity = String(entra);
        // el ▲ se destaca: crece y brilla mientras rueda, y se asienta al terminar
        const pulso = p > 0 && p < 1 ? 1 : p >= 1 ? 0.6 : 0;
        f.fila.style.setProperty('--brillo', String(pulso));
        f.delta.style.transform = `scale(${1 + 0.45 * (1 - cubicOut(clamp01(p * 2.5))) * (p > 0 ? 1 : 0)})`;
      }
    },
  };
}

// ======================================================================================================================
// 1.1 y 1.2 · La decision y su consecuencia
// ======================================================================================================================
const OPCIONES = [
  {
    titulo: 'Denunciarlo',
    icono: 'denunciar',
    efectos: [['Cabeza', '+2'], ['Hype', '+1']],
    linea: 'Soporte lo banea y quedás de incorruptible.',
    cambios: [{ stat: 'cabeza', a: 63 }, { stat: 'hype', a: 35 }],
    consecuencia: null,
  },
  {
    titulo: 'Ignorarlo',
    icono: 'ignorar',
    efectos: [['Cabeza', '+3'], ['Mecánica', '+1']],
    aviso: 'puede insistir',
    linea: 'Subís a pulmón y el LP se siente tuyo.',
    cambios: [{ stat: 'cabeza', a: 64 }, { stat: 'mecanica', a: 71 }],
    consecuencia: 'El DM queda perdido entre cien. Subís a pulmón.',
  },
];

function crearOpcion(n, o, alElegir) {
  const cons = o.consecuencia ? el('div', { class: 'opcion-consecuencia' }, [el('div', { class: 'cons-in' }, [separador(), el('p', { text: o.consecuencia })])]) : null;
  const nodo = el('button', { class: 'opcion', type: 'button', 'data-estado': 'reposo', 'data-n': String(n), onclick: () => alElegir(n) }, [
    marco('opcion-marco', [
      el('div', { class: 'opcion-retrato' }, [icono(o.icono, 'ico retrato-ico')]),
      el('div', { class: 'opcion-cuerpo' }, [
        el('div', { class: 'opcion-cabeza' }, [el('span', { class: 'opcion-titulo', text: o.titulo }), tecla(String(n))]),
        el('div', { class: 'opcion-efectos' }, [
          ...o.efectos.map(([s, v]) => el('span', { class: 'efecto' }, [icono('sube', 'ico efecto-ico'), `${s} ${v}`])),
          o.aviso ? el('span', { class: 'efecto efecto-aviso' }, [icono('aviso', 'ico efecto-ico'), o.aviso]) : null,
        ]),
        el('p', { class: 'opcion-linea', text: o.linea }),
        cons,
      ]),
      el('span', { class: 'opcion-candado' }, [icono('candado', 'ico')]),
    ]),
  ]);
  const apuntar = (si) => {
    if (nodo.dataset.estado === 'reposo' || nodo.dataset.estado === 'apuntado') nodo.dataset.estado = si ? 'apuntado' : 'reposo';
  };
  nodo.addEventListener('pointerenter', () => apuntar(true));
  nodo.addEventListener('pointerleave', () => apuntar(false));
  nodo.addEventListener('focus', () => apuntar(true));
  nodo.addEventListener('blur', () => apuntar(false));
  return { nodo, cons };
}

export function crearDecision({ ficha, elegida = null, t = null, alSeguir }) {
  let cortar = () => {};
  let eleccion = null;
  let terminado = false;
  const seguir = boton('SEGUIR', { clase: 'seguir', iconoFin: 'enter', onclick: () => terminado && alSeguir() });
  const ops = OPCIONES.map((o, i) => crearOpcion(i + 1, o, (n) => elegir(n)));
  const nodo = el('section', { class: 'columna decision' }, [
    el('header', { class: 'evento' }, [
      el('div', { class: 'kicker' }, [el('i', { class: 'gema', 'aria-hidden': 'true' }), el('span', { text: 'UN DM RARO' })]),
      el('p', { class: 'evento-texto', text: 'Una cuenta sin foto te escribe a las tres de la mañana: te sube a Master en una semana por cuarenta lucas. «Nadie se entera, hermano.» Ya le hizo la cuenta a dos de tu server.' }),
      separador(),
    ]),
    el('div', { class: 'opciones' }, ops.map((o) => o.nodo)),
    el('div', { class: 'pie' }, [seguir]),
  ]);

  function elegir(n, congelado = null) {
    if (eleccion) return;
    eleccion = n;
    const o = OPCIONES[n - 1];
    const elegidaN = ops[n - 1];
    const otra = ops[2 - n];
    nodo.dataset.elegida = String(n);
    elegidaN.nodo.dataset.estado = 'elegido';
    otra.nodo.dataset.estado = 'apagado';
    const cons = elegidaN.cons;
    if (cons) cons.style.display = 'grid';
    cortar = correr(
      (ms) => {
        otra.nodo.style.opacity = String(1 - (1 - T.apagada) * tramo(ms, 0, T.apagar));
        ficha.rodar(o.cambios, tramo(ms, ...T.rueda));
        if (cons) {
          const p = cubicOut(tramo(ms, ...T.linea));
          cons.style.gridTemplateRows = `${p}fr`;
          cons.style.opacity = String(p);
        }
        const s = tramo(ms, ...T.seguir);
        seguir.style.opacity = String(s);
        seguir.dataset.visible = s > 0 ? '1' : '';
        terminado = ms >= T.seguir[0];
      },
      T.seguir[0] + T.seguir[1],
      { congelado },
    );
  }
  if (elegida) elegir(elegida, t);

  return {
    nodo,
    ficha: true,
    mundo: { era: 'pieza', arte: 'Ahri' },
    tecla(e) {
      if (!eleccion && (e.key === '1' || e.key === '2')) {
        elegir(Number(e.key));
        return true;
      }
      return false;
    },
    seguir: () => terminado && alSeguir(),
    destruir: () => cortar(),
  };
}

// ======================================================================================================================
// 1.3 · El minijuego: la previa, el HUD y el resultado
// ======================================================================================================================
function logoImg(src, clase) {
  const img = el('img', { class: clase, src, alt: '', decoding: 'async', draggable: 'false', referrerpolicy: 'no-referrer' });
  img.addEventListener('error', () => img.replaceWith(escudo(clase)), { once: true });
  return img;
}
// El escudo de CK (una org sin logo en la vitrina): el blason hextech, sin letras.
function escudo(clase = '') {
  return el('span', {
    class: `escudo ${clase}`,
    'aria-hidden': 'true',
    html: '<svg viewBox="0 0 40 46"><path d="M20 1.6 37.4 7.2V21.8C37.4 32.6 30.2 40.4 20 44.4 9.8 40.4 2.6 32.6 2.6 21.8V7.2Z" fill="var(--c-noche-3)" stroke="var(--c-oro)" stroke-width="2"/><path d="M20 10 29 23 20 36 11 23Z" fill="var(--c-hex-medio)"/><path d="M20 10 24.5 23 20 36Z" fill="var(--c-hex-claro)" opacity=".6"/></svg>',
  });
}
const logoDe = (tag, clase) => (LOGO[tag] ? logoImg(LOGO[tag], clase) : escudo(clase));

function crearPrevia(alJugar) {
  const casilleros = el('div', { class: 'bo-casilleros', 'aria-hidden': 'true' }, Array.from({ length: 5 }, () => el('i')));
  return marco('previa', [
    el('div', { class: 'previa-rotulo' }, [logoImg(LOGO.LCS, 'logo-liga'), el('span', { text: 'LCS · SPLIT 2 · CUARTOS' })]),
    el('div', { class: 'cruce' }, [
      el('div', { class: 'equipo' }, [logoDe('SEN', 'logo-equipo'), el('span', { class: 'equipo-tag', text: 'SEN' })]),
      el('span', { class: 'vs', text: 'vs' }),
      el('div', { class: 'equipo' }, [logoDe('CK', 'logo-equipo'), el('span', { class: 'equipo-tag', text: 'CK' })]),
    ]),
    el('div', { class: 'serie-bo' }, [el('span', { class: 'bo', text: 'Bo5' }), casilleros]),
    separador(),
    el('div', { class: 'previa-fila' }, [
      el('p', { class: 'previa-que', text: 'Esquivá los skillshots. Flash con F.' }),
      el('div', { class: 'vara' }, [
        el('span', { class: 'vara-num', text: '6 de 8' }),
        el('span', { class: 'vara-que', text: 'oleadas' }),
        el('span', { class: 'vara-porque', text: 'CK es 2.º de la tabla' }),
      ]),
    ]),
    el('div', { class: 'previa-pie' }, [boton('JUGAR', { clase: 'jugar', onclick: alJugar })]),
  ]);
}

// El HUD: una captura quieta del juego en curso.
const VIDA_MAX = 1100;
const VIDA_ANTES = 760;
const VIDA_AHORA = 520;
function crearHud(meta) {
  const v = meta?.ddragon?.version ?? '16.19.1';
  const base = meta?.ddragon?.base ?? DDRAGON;
  const retrato = el('img', { class: 'hud-retrato-img', src: `${base}/${v}/img/champion/Orianna.png`, alt: 'Orianna', decoding: 'async', draggable: 'false' });
  const flash = el('img', { class: 'hechizo-img', src: `${base}/${v}/img/spell/SummonerFlash.png`, alt: 'Flash', decoding: 'async', draggable: 'false' });
  const relleno = el('i', { class: 'vida-relleno' });
  const rastro = el('i', { class: 'vida-rastro' });
  const vidaNum = el('span', { class: 'barra-num' });
  const golpe = el('div', { class: 'golpe', 'aria-hidden': 'true' });
  const campo = el('div', {
    class: 'campo',
    'aria-hidden': 'true',
    html: `<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="hexa" width="56" height="97" patternUnits="userSpaceOnUse" patternTransform="scale(.9)"><path d="M28 0 56 16v32L28 64 0 48V16ZM28 64v33" fill="none" stroke="var(--c-campo-linea)" stroke-width="1.5"/></pattern>
        <radialGradient id="suelo" cx=".5" cy=".46" r=".7"><stop offset="0" stop-color="var(--c-campo-1)"/><stop offset="1" stop-color="var(--c-campo-2)"/></radialGradient>
        <linearGradient id="tele" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--c-skill)" stop-opacity=".05"/><stop offset="1" stop-color="var(--c-skill)" stop-opacity=".32"/></linearGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#suelo)" opacity=".9"/>
      <rect width="1440" height="900" fill="url(#hexa)"/>
      <ellipse cx="720" cy="430" rx="430" ry="250" fill="none" stroke="var(--c-oro-oscuro)" stroke-width="2" stroke-dasharray="4 10" opacity=".55"/>
      <g class="skillshots">
        <g transform="rotate(-16 720 430)"><rect x="430" y="417" width="660" height="26" rx="13" fill="url(#tele)" stroke="var(--c-skill-borde)" stroke-opacity=".55" stroke-width="1.5"/><circle cx="1050" cy="430" r="10" fill="var(--c-skill)"/><circle cx="1050" cy="430" r="22" fill="var(--c-skill)" opacity=".2"/></g>
        <g transform="rotate(8 720 600)"><rect x="330" y="590" width="700" height="22" rx="11" fill="var(--c-skill-fondo)" stroke="var(--c-skill-borde)" stroke-opacity=".4" stroke-width="1.5"/><circle cx="470" cy="601" r="9" fill="var(--c-skill)"/></g>
        <circle cx="940" cy="250" r="74" fill="var(--c-skill-fondo)" stroke="var(--c-skill-borde)" stroke-opacity=".5" stroke-width="1.5"/><circle cx="940" cy="250" r="40" fill="none" stroke="var(--c-skill)" stroke-opacity=".5" stroke-width="1.5" stroke-dasharray="3 6"/>
      </g>
      <g class="flash-rastro" opacity=".8"><circle cx="604" cy="470" r="34" fill="none" stroke="var(--c-bola)" stroke-width="2" stroke-dasharray="3 7"/><path d="M630 456 690 424" stroke="var(--c-bola)" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/></g>
      <circle cx="728" cy="408" r="46" fill="none" stroke="var(--c-vida)" stroke-width="3" opacity=".8"/>
      <circle cx="790" cy="372" r="12" fill="var(--c-bola)"/><circle cx="790" cy="372" r="24" fill="var(--c-bola)" opacity=".18"/>
    </svg>`,
  });
  const unidad = el('div', { class: 'unidad', 'aria-hidden': 'true' }, [el('img', { src: retrato.src, alt: '', decoding: 'async', draggable: 'false' })]);
  const marcador = marco('hud-marcador', [logoDe('SEN', 'logo-mini'), el('span', { class: 'oleadas' }, [icono('oleada', 'ico oleada-ico'), el('span', { text: '5 / 8' })]), logoDe('CK', 'logo-mini')]);
  const panel = marco('hud-panel', [
    el('div', { class: 'hud-retrato' }, [retrato, el('span', { class: 'hud-nivel', text: '11' })]),
    el('div', { class: 'hud-barras' }, [
      el('div', { class: 'barra barra-vida' }, [rastro, relleno, el('i', { class: 'vida-marcas' }), vidaNum]),
      el('div', { class: 'barra barra-mana' }, [el('i', { class: 'mana-relleno' })]),
    ]),
    el('div', { class: 'hud-hechizos' }, [
      el('div', { class: 'hechizo', 'data-usado': '1', style: { '--cd': '0.78' } }, [flash, el('i', { class: 'barrido' }), el('span', { class: 'hechizo-cd', text: '238' }), el('span', { class: 'hechizo-tecla', text: 'F' })]),
      el('div', { class: 'hud-icono', 'data-estado': 'guardada', 'aria-label': 'Charla del coach' }, [icono('charla', 'ico')]),
      el('div', { class: 'hud-icono', 'data-estado': 'listo', 'aria-label': 'Poder' }, [icono('poder', 'ico')]),
    ]),
  ]);
  const nodo = el('section', { class: 'hud' }, [campo, unidad, golpe, marcador, panel]);
  return {
    nodo,
    pintar(ms) {
      const g = ms >= T.golpe;
      const vida = g ? VIDA_AHORA : VIDA_ANTES;
      const r = g ? VIDA_ANTES - (VIDA_ANTES - VIDA_AHORA) * cubicOut(tramo(ms, ...T.rastro)) : VIDA_ANTES;
      relleno.style.width = `${(vida / VIDA_MAX) * 100}%`;
      rastro.style.width = `${(r / VIDA_MAX) * 100}%`;
      vidaNum.textContent = `${vida} / ${VIDA_MAX}`;
      const f = g ? 1 - tramo(ms, T.golpe, 400) : 0;
      golpe.style.opacity = String(f * 0.9);
      unidad.dataset.golpe = f > 0 ? '1' : '';
    },
    fin: T.rastro[0] + T.rastro[1],
  };
}

const MAPAS = [
  { r: 'gana', marcador: '1-0' },
  { r: 'gana', marcador: '2-0' },
  { r: 'pierde', marcador: '2-1' },
  { r: 'gana', marcador: '3-1' },
];
function crearResultado() {
  const filas = MAPAS.map((m, i) =>
    el('li', { class: 'mapa', 'data-r': m.r }, [el('span', { class: 'mapa-n', text: String(i + 1) }), icono(m.r, 'ico mapa-ico'), el('span', { class: 'mapa-marcador', text: m.marcador })]),
  );
  const sello = el('div', { class: 'sello' }, [
    el('span', { class: 'sello-alas', 'aria-hidden': 'true', html: '<svg viewBox="0 0 400 120"><path d="M200 8 232 60 200 112 168 60Z" fill="var(--c-oro-medio)"/><path d="M200 22 222 60 200 98Z" fill="var(--c-oro-claro)" opacity=".7"/><path d="M160 60H20l40-16H150M160 60H40l34 16H152M240 60h140l-40-16H250M240 60h120l-34 16H248" fill="none" stroke="var(--c-oro)" stroke-width="3" stroke-linejoin="round"/></svg>' }),
    marco('sello-marco', [el('span', { class: 'sello-txt', text: 'PASASTE' }), el('span', { class: 'sello-num', text: '· 7 / 8' })]),
  ]);
  const serie = marco('serie', [
    el('div', { class: 'serie-cabeza' }, [
      logoDe('SEN', 'logo-equipo'),
      el('span', { class: 'equipo-tag', text: 'SEN' }),
      el('span', { class: 'serie-marcador', text: '3-1' }),
      el('span', { class: 'equipo-tag', text: 'CK' }),
      logoDe('CK', 'logo-equipo'),
    ]),
    el('ol', { class: 'mapas' }, filas),
  ]);
  const nodo = el('div', { class: 'resultado' }, [sello, serie]);
  const inicioSerie = T.selloEntra + T.selloQueda;
  return {
    nodo,
    pintar(ms) {
      const p = expoOut(tramo(ms, 0, T.selloEntra));
      sello.style.opacity = String(p);
      sello.style.setProperty('--escala', String(1.35 - 0.35 * p));
      // el sello queda solo en el centro 1200 ms y despues sube a su lugar, sobre la serie
      sello.style.setProperty('--sube', String(cubicOut(tramo(ms, inicioSerie, 300))));
      serie.style.opacity = String(cubicOut(tramo(ms, inicioSerie, 200)));
      filas.forEach((f, i) => {
        const q = cubicOut(tramo(ms, inicioSerie + i * T.fila, T.filaDur));
        f.style.opacity = String(q);
        f.style.transform = `translateX(${(1 - q) * -14}px)`;
      });
    },
    fin: inicioSerie + (MAPAS.length - 1) * T.fila + T.filaDur,
  };
}

export function crearMinijuego({ paso = 'previa', t = null, meta, alSeguir, alPaso }) {
  let cortar = () => {};
  let actual = null;
  let terminado = false;
  const seguir = boton('SEGUIR', { clase: 'seguir', iconoFin: 'enter', onclick: () => terminado && alSeguir() });
  const nodo = el('section', { class: 'columna minijuego' });
  const api = {
    nodo,
    ficha: true,
    mundo: { era: 'escenario', arte: 'Orianna' },
    tecla(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        if (actual === 'previa') ir('hud');
        else if (actual === 'hud') ir('resultado');
        else if (terminado) alSeguir();
        return true;
      }
      return false;
    },
    seguir() {
      if (actual === 'previa') ir('hud');
      else if (actual === 'hud') ir('resultado');
      else if (terminado) alSeguir();
    },
    destruir: () => cortar(),
  };
  function ir(p, congelado = null) {
    cortar();
    actual = p;
    terminado = false;
    nodo.replaceChildren();
    nodo.dataset.paso = p;
    document.documentElement.dataset.paso = p;
    alPaso?.(p);
    if (p === 'previa') {
      nodo.append(crearPrevia(() => ir('hud')));
    } else if (p === 'hud') {
      const h = crearHud(meta);
      h.nodo.addEventListener('click', () => ir('resultado'));
      nodo.append(h.nodo);
      cortar = correr(h.pintar, h.fin, { congelado });
    } else {
      const r = crearResultado();
      seguir.style.opacity = '0';
      nodo.append(r.nodo, el('div', { class: 'pie' }, [seguir]));
      cortar = correr(
        (ms) => {
          r.pintar(ms);
          const s = tramo(ms, r.fin, T.seguir[1]);
          seguir.style.opacity = String(s);
          seguir.dataset.visible = s > 0 ? '1' : '';
          terminado = ms >= r.fin;
        },
        r.fin + T.seguir[1],
        { congelado },
      );
    }
  }
  ir(paso, t);
  return api;
}

// ======================================================================================================================
// 1.4 · La mano del año: tres cartas boca arriba, de una
// ======================================================================================================================
const CARTAS = [
  { material: 'acero', nombre: 'SOLOQ DE MADRUGADA', mas: ['+2', 'Mecánica'], costo: null, cambios: [{ stat: 'mecanica', a: 72 }] },
  { material: 'raro', nombre: 'BOOTCAMP EN COREA', mas: ['+4', 'Laneo'], costo: ['−1', 'Cabeza'], cambios: [{ stat: 'laneo', a: 70 }, { stat: 'cabeza', a: 60 }] },
  { material: 'epico', nombre: 'PSICÓLOGO DEL EQUIPO', mas: ['+6', 'Cabeza'], costo: ['−2', 'Hype'], cambios: [{ stat: 'cabeza', a: 67 }, { stat: 'hype', a: 32 }] },
];

function crearCarta(n, c, alElegir) {
  const nodo = el('button', { class: 'carta', type: 'button', 'data-estado': 'reposo', 'data-material': c.material, onclick: () => alElegir(n) }, [
    marco(
      'carta-marco',
      [
        el('i', { class: 'carta-gema', 'aria-hidden': 'true' }),
        el('div', { class: 'carta-num' }, [el('span', { class: 'carta-mas', text: c.mas[0] }), el('span', { class: 'carta-stat', text: c.mas[1] })]),
        c.costo ? el('div', { class: 'carta-costo' }, [el('span', { class: 'carta-costo-num', text: c.costo[0] }), el('span', { class: 'carta-stat', text: c.costo[1] })]) : el('div', { class: 'carta-costo carta-costo-vacio' }),
        el('div', { class: 'carta-nombre', text: c.nombre }),
        tecla(String(n)),
      ],
      { material: c.material },
    ),
  ]);
  const apuntar = (si) => {
    if (nodo.dataset.estado === 'reposo' || nodo.dataset.estado === 'apuntado') nodo.dataset.estado = si ? 'apuntado' : 'reposo';
  };
  nodo.addEventListener('pointerenter', () => apuntar(true));
  nodo.addEventListener('pointerleave', () => apuntar(false));
  nodo.addEventListener('focus', () => apuntar(true));
  nodo.addEventListener('blur', () => apuntar(false));
  return nodo;
}

export function crearMano({ ficha, carta = null, t = null, alSeguir }) {
  let cortar = () => {};
  let eleccion = null;
  let terminado = false;
  let otraUsada = false;
  const seguir = boton('SEGUIR', { clase: 'seguir', iconoFin: 'enter', onclick: () => terminado && alSeguir() });
  const cartas = CARTAS.map((c, i) => crearCarta(i + 1, c, (n) => elegir(n)));
  const otra = boton('OTRA MANO', { clase: 'otra', primario: false, onclick: () => repartir(true) });
  const nodo = el('section', { class: 'columna mano' }, [el('div', { class: 'cartas' }, cartas), el('div', { class: 'pie pie-mano' }, [otra, seguir])]);

  function repartir(deNuevo = false) {
    if (deNuevo) {
      if (otraUsada || eleccion) return;
      otraUsada = true;
      otra.dataset.estado = 'apagado';
      otra.disabled = true;
    }
    cortar();
    cortar = correr((ms) => {
      cartas.forEach((c, i) => {
        const p = cubicOut(tramo(ms, i * 50, T.entradaCartas - 100));
        c.style.opacity = String(p);
        c.style.transform = `translateY(${(1 - p) * 14}px)`;
      });
    }, T.entradaCartas);
  }

  function elegir(n, congelado = null) {
    if (eleccion) return;
    eleccion = n;
    cortar();
    const c = CARTAS[n - 1];
    const nodoC = cartas[n - 1];
    cartas.forEach((x, i) => {
      x.style.opacity = '1';
      x.style.transform = '';
      x.dataset.estado = i === n - 1 ? 'elegido' : 'apagado';
    });
    otra.dataset.estado = 'apagado';
    otra.disabled = true;
    // la carta va a la ficha: un fantasma vuela desde la carta hasta la fila del numero que cambia
    const desde = nodoC.getBoundingClientRect();
    const hasta = ficha.fila(c.cambios[0].stat).getBoundingClientRect();
    const fantasma = nodoC.querySelector('.marco').cloneNode(true);
    fantasma.classList.add('fantasma');
    Object.assign(fantasma.style, { left: `${desde.left}px`, top: `${desde.top}px`, width: `${desde.width}px`, height: `${desde.height}px` });
    fantasma.dataset.material = c.material;
    document.body.append(fantasma);
    const dx = hasta.left + hasta.width / 2 - (desde.left + desde.width / 2);
    const dy = hasta.top + hasta.height / 2 - (desde.top + desde.height / 2);
    const escala = Math.min(1, hasta.height / desde.height);
    cortar = correr(
      (ms) => {
        cartas.forEach((x, i) => {
          if (i !== n - 1) x.style.opacity = String(1 - (1 - T.apagada) * tramo(ms, 0, T.apagar));
        });
        const v = tramo(ms, ...T.vuelo);
        const k = cubicOut(v);
        fantasma.style.opacity = String(v > 0 && v < 1 ? 1 - v * v : 0);
        fantasma.style.transform = `translate(${dx * k}px, ${dy * k}px) scale(${1 - (1 - escala) * k})`;
        ficha.rodar(c.cambios, tramo(ms, ...T.ruedaCarta));
        const s = tramo(ms, T.ruedaCarta[0] + T.ruedaCarta[1], T.seguir[1]);
        seguir.style.opacity = String(s);
        seguir.dataset.visible = s > 0 ? '1' : '';
        terminado = s > 0;
      },
      T.ruedaCarta[0] + T.ruedaCarta[1] + T.seguir[1],
      { congelado },
    );
    const quitar = cortar;
    cortar = () => {
      quitar();
      fantasma.remove();
    };
  }

  return {
    nodo,
    ficha: true,
    mundo: { era: 'academia', arte: 'Ahri' },
    montado() {
      if (carta) elegir(carta, t);
      else repartir();
    },
    tecla(e) {
      if (!eleccion && ['1', '2', '3'].includes(e.key)) {
        elegir(Number(e.key));
        return true;
      }
      return false;
    },
    seguir: () => terminado && alSeguir(),
    destruir: () => cortar(),
  };
}
