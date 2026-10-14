// Los momentos (PLANUI §6.5 y §0.6, U3a): el takeover del título (y del Mundial, su variante dorada) y la pantalla del
// resumen de la temporada. Qué momento toca lo decide `ui/core/momentos.js` (puro); esto solo lo monta.
//
// El título, a 1× (ms; `escala` los multiplica: ×0,35 en rápido, nunca 0):
//   0-260      apagón
//   240-860    golpe de luz en el tono de tu org (oro en el Mundial)
//   300-1500   la copa 3D (`trofeo.js`) sube y gira; desde 1250, el confeti en los colores del equipo
//   640-1500   CAMPEONES letra por letra (Mona Sans condensada, <= 214 px), la liga, el año y los logos
//   2000-2400  "Continuar" y asentarse: queda en el cuadro final (la copa sigue girando) hasta Enter, Espacio o clic.
// Espacio o clic antes de asentarse van al cuadro final; un cuarto abierto lo pausa (`controlar`, el `narrar` del
// reproductor). Con movimiento reducido: el cuadro final con un fundido corto, y espera igual.
//
// Importarlo no toca el DOM. Cero colores literales: todo sale de los tokens (`estilos/momentos.css`).
import { el, animar, reducido, celular, EXPO } from './util.js';
import { crearBeats } from './beats.js';
import { crearTrofeo, copaDe, SUBIDA, TONOS_DEF } from './trofeo.js';
import { crearConfeti } from './confeti.js';
import { tonoOrg, TONO_ORO, aplicarTono } from './tono.js';
import { logoOrg, logoComp, COMPETICIONES } from './competicion.js';
import { logoLiga } from './logos.js';
import { icono } from './iconos.js';
import { odometro, num } from './movimiento.js';
import { chipEje } from '../components/chipsEje.js';
import { nombreVisibleDeLiga } from '../../core/ligas.js';

const T = {
  apagonDur: 260,
  golpe: 240,
  golpeDur: 620,
  copa: 300,
  letras: 640,
  letraPaso: 50,
  letraDur: 420,
  liga: 1150,
  ligaDur: 380,
  confeti: 1250,
  cortina: 1450,
  lluvia: 1900,
  seguir: 2000,
  asentarse: 2400
};
// El resumen: los bloques entran escalonados; el número rueda.
const T_RES = { paso: 90, entra: 420, numero: 520, numeroDur: 900, asentarse: 1500, sello: 260, selloDur: 520 };
// W1-D: el glifo del kit de cada escalón que se sube
const ICONO_DE_ASCENSO = { arraigo: 'arraigo', carrera: 'nivel', jerarquia: 'jerarquia', hype: 'hype' };
const CONFETI = { cantidad: 220, celular: 0.55, alfa: 0.35, calma: 500 };
const FUNDIDO = 120; // ms: el fundido corto de movimiento reducido (--dur-fundido)
const SALIDA = 240;
// la letra de la placa: una fracción de su alto, con un mínimo legible
const PLACA = { letra: 0.42, min: 8 };
const LETRA_CAE = 'translateY(-70%) scale(1.04, 1.24)';

// PLANUI §0.6 (arreglo): la copa WebGL compila su shader al crearse (en Windows puede tardar más de 1 s) y hasta su primer
// cuadro no se ve. `precalentarCopa` la crea apenas se sabe que viene el título (antes del relato del tramo) y
// `mostrarTitulo` la adopta; si igual no llegó, el takeover espera su primer cuadro (hasta `CALENTAR_MAX` ms) con la capa
// todavía transparente. Nunca se revela una copa sin dibujar ni una placa que flota sola.
const CALENTAR_MAX = 2500;
let calentada = null; // { clave, copa }
// (una clave interna, nunca se pinta)
const claveDeCopa = (m) => JSON.stringify([m.tipo, m.liga, m.nombre, m.org]);

function crearCopaDe(momento) {
  const mundial = momento.tipo === 'mundial';
  const tono = mundial ? TONO_ORO : tonoOrg(momento.org);
  const { material, perfil } = copaDe(compDe(momento.liga) ?? compDe(momento.nombre) ?? '');
  return crearTrofeo(document.createElement('canvas'), {
    material, perfil, tonos: mundial ? TONOS_DEF : { luz: tono.luz, contra: tono.contra, noche: tono.noche }
  });
}

function soltarCalentada() {
  try {
    calentada?.copa?.destruir?.();
  } catch { /* nada que soltar */ }
  calentada = null;
}

export function precalentarCopa(momento) {
  if (typeof document === 'undefined' || !momento) return;
  const clave = claveDeCopa(momento);
  if (calentada?.clave === clave) return;
  soltarCalentada();
  try {
    calentada = { clave, copa: crearCopaDe(momento) };
  } catch (error) {
    console.error('No se pudo precalentar la copa:', error);
  }
}

function tomarCopa(momento) {
  if (calentada?.clave === claveDeCopa(momento)) {
    const { copa } = calentada;
    calentada = null;
    return copa;
  }
  soltarCalentada();
  return crearCopaDe(momento);
}

const sinEscala = (escala) => (Number.isFinite(escala) && escala > 0 ? escala : 1);
const compDe = (liga) => {
  const k = String(liga ?? '').toLowerCase();
  if (k === 'mundial') return 'worlds';
  return COMPETICIONES[k] ? k : null;
};

// La capa común: el overlay, Continuar, el teclado (Enter/Espacio en captura: saltear antes de asentarse, seguir
// después), el clic y la salida. `armar(capa)` devuelve `{ saltar, pausar, reanudar, destruir, alAsentarse }`.
// `clicCierra`: el clic en cualquier lado sigue (el takeover); si no, solo Continuar (el resumen se lee y se scrollea: un toque
// para leer no lo cierra). Antes de asentarse, el clic saltea igual.
function montarCapa({ clase, etiqueta, armar, controlar, clicCierra = true }) {
  return new Promise((resolver) => {
    const anterior = document.activeElement;
    const raiz = el('section', { class: `mo ${clase}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': etiqueta, tabindex: '-1' });
    const seguir = el('button', { type: 'button', class: 'mo-seguir' }, ['Continuar', el('kbd', { text: 'Enter' })]);
    let asentado = false;
    let cerrado = false;
    let partes = null;
    let soltar = null;
    const cerrar = () => {
      if (cerrado) return;
      cerrado = true;
      document.removeEventListener('keydown', tecla, true);
      soltar?.();
      const fin = () => {
        try {
          partes?.destruir?.();
        } catch { /* nada que soltar */ }
        raiz.remove();
        if (anterior?.isConnected) anterior.focus?.({ preventScroll: true });
        resolver();
      };
      let salida = null;
      try {
        salida = raiz.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reducido() ? FUNDIDO : SALIDA, easing: 'ease-in', fill: 'forwards' });
      } catch { /* sin WAAPI */ }
      if (salida) salida.finished.then(fin, fin);
      else fin();
    };
    const asentar = () => {
      if (asentado || cerrado) return;
      asentado = true;
      raiz.dataset.asentado = '';
      seguir.focus({ preventScroll: true });
    };
    const accion = () => {
      if (cerrado) return;
      if (!asentado) {
        partes?.saltar?.();
        asentar();
      } else {
        cerrar();
      }
    };
    function tecla(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (document.querySelector('dialog[open]')) return; // un cuarto abierto es dueño del teclado
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) accion();
    }
    raiz.addEventListener('click', (e) => {
      e.stopPropagation();
      if (asentado && !clicCierra && !seguir.contains(e.target)) return;
      accion();
    });
    raiz.append(seguir);
    // sobre todo el juego, la franja y la barra incluidas (un takeover; los cuartos, en la capa superior, lo tapan y lo pausan)
    document.body.append(raiz);
    try {
      partes = armar(raiz, seguir);
    } catch (error) {
      console.error('No se pudo armar el momento:', error);
    }
    document.addEventListener('keydown', tecla, true);
    soltar = controlar?.({ saltar: () => accion(), pausar: () => partes?.pausar?.(), reanudar: () => partes?.reanudar?.() }) ?? null;
    raiz.focus({ preventScroll: true });
    if (reducido()) {
      try {
        raiz.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FUNDIDO, easing: 'linear' });
      } catch { /* sin WAAPI */ }
    }
    if (partes?.alAsentarse) partes.alAsentarse.then(asentar, asentar);
    else asentar();
  });
}

// El takeover del título o del Mundial. `momento`: `{ tipo: 'titulo'|'mundial', nombre, anio, org, liga }`. Resuelve al
// Continuar.
export function mostrarTitulo(momento, { escala = 1, sonido = null, controlar = null } = {}) {
  if (typeof document === 'undefined') return Promise.resolve();
  const k = sinEscala(escala);
  const E = (ms) => Math.round(ms * k);
  const mundial = momento.tipo === 'mundial';
  const tono = mundial ? TONO_ORO : tonoOrg(momento.org);
  const nombre = mundial ? 'Mundial' : (momento.nombre ?? '');
  return montarCapa({
    clase: mundial ? 'mo-titulo mo-mundial' : 'mo-titulo',
    etiqueta: mundial ? `¡Campeones del Mundo ${momento.anio ?? ''}!` : `¡Campeones de ${nombre}!`,
    controlar,
    armar(raiz, seguir) {
      aplicarTono(raiz, tono);
      const negro = el('div', { class: 'mo-negro', 'aria-hidden': 'true' });
      const golpe = el('div', { class: 'mo-golpe', 'aria-hidden': 'true' });
      const copa = tomarCopa(momento);
      // la placa del pedestal, grabada con la competición y el año (se ubica sobre la que dibuja la copa)
      const placa = el('span', { class: 'mo-placa', 'aria-hidden': 'true', text: `${mundial ? 'Worlds' : nombre} ${momento.anio ?? ''}`.trim() });
      const sube = el('div', { class: 'mo-copa-sube' }, [copa.nodo, placa]);
      const ubicarPlaca = () => {
        const p = copa.placa?.();
        if (!p) return;
        Object.assign(placa.style, { left: `${p.x}px`, top: `${p.y}px`, width: `${p.ancho}px`, height: `${p.alto}px`, fontSize: `${Math.max(PLACA.min, p.alto * PLACA.letra)}px` });
      };
      const caja = el('div', { class: 'mo-copa', 'aria-hidden': 'true' }, [sube]);
      const confeti = crearConfeti(el('canvas', { class: 'cu-confeti mo-confeti', 'aria-hidden': 'true' }), {
        colores: mundial ? ['--gold', '--carta-oro-a', '--luz-blanca'] : [tono.luz, tono.contra, '--gold', '--luz-blanca'],
        semilla: `momento-${momento.tipo}-${momento.anio}-${momento.org}`,
        cantidad: Math.round(CONFETI.cantidad * (celular() ? CONFETI.celular : 1)),
        calma: { desde: E(T.seguir), dur: CONFETI.calma, alfa: CONFETI.alfa, zonas: () => [bloque.getBoundingClientRect()] },
        origenes: [
          { tipo: 'canon', x: 0, y: 1.02, angulo: 22, t: E(T.confeti) },
          { tipo: 'canon', x: 1, y: 1.02, angulo: -22, t: E(T.confeti) },
          { tipo: 'cortina', t: E(T.cortina) },
          { tipo: 'lluvia', t: E(T.lluvia) }
        ]
      });
      const letras = 'CAMPEONES'.split('').map((c) => el('span', { class: 'mo-letra', text: c }));
      const titulo = el('h2', { class: 'mo-campeones', 'aria-hidden': 'true' }, letras);
      // el logo de la competición, si tiene uno (un torneo de tier 3 no: va solo su nombre)
      const compInfo = { logo: logoLiga(mundial ? 'mundial' : (momento.liga ?? momento.nombre)).src, nombre };
      const liga = el('p', { class: 'mo-liga' }, [
        ...(compInfo.logo ? [logoComp(compInfo, { clase: 'mo-logo-comp' })] : []),
        el('span', { class: 'mo-liga-txt' }, [el('b', { text: mundial ? 'Campeones del Mundo' : nombre }), el('span', { text: String(momento.anio ?? '') })])
      ]);
      const equipo = el('p', { class: 'mo-equipo' }, [logoOrg(momento.org, { clase: 'mo-logo-org' }), el('b', { text: momento.org ?? '' })]);
      const bloque = el('div', { class: 'mo-bloque' }, [liga, titulo, equipo]);
      raiz.prepend(negro, golpe, caja, confeti.nodo, bloque);
      copa.redimensionar?.();
      ubicarPlaca();

      // la copa: su reloj corre comprimido por `escala` hasta asentarse y después a velocidad normal (sigue girando)
      const corte = E(T.asentarse);
      const reloj = (t) => (t <= corte ? t / k : t - corte + T.asentarse);
      const bt = crearBeats({ duracion: corte, asentarse: corte });
      bt.agregar({
        en: (t, fijo) => copa.en(reloj(t), fijo),
        fps: copa.fps,
        saltar: () => copa.saltar?.(),
        destruir: () => copa.destruir?.()
      });
      bt.agregar(confeti);
      let arrancado = false;
      let saltarAlArrancar = false;
      let destruido = false;
      let timerCalentar = null;
      const arrancar = () => {
      copa.entrar?.(T.copa);
      bt.waapi(animar(negro, [{ opacity: 0 }, { opacity: 0.97, offset: 0.4 }, { opacity: 0.95 }], { dur: E(T.apagonDur), easing: 'ease-out', fill: 'both' }));
      const fogonazo = bt.destello(E(T.golpe));
      if (fogonazo != null) {
        bt.waapi(animar(golpe, [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'scale(1)', offset: 0.2 }, { opacity: 0.32, transform: 'scale(1.25)' }], { delay: fogonazo, dur: E(T.golpeDur), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' }));
      }
      bt.waapi(animar(sube, [{ transform: 'translateY(115%)' }, { transform: 'translateY(-2%)', offset: 0.84 }, { transform: 'none' }], { delay: E(T.copa), dur: E(SUBIDA), easing: 'cubic-bezier(.22,.8,.3,1)', fill: 'backwards' }));
      letras.forEach((letra, i) => {
        bt.waapi(animar(letra, [
          { opacity: 0, transform: LETRA_CAE, filter: 'blur(6px)' },
          { opacity: 1, transform: 'translateY(3%) scale(1.08, 0.84)', filter: 'blur(0px)', offset: 0.6 },
          { opacity: 1, transform: 'none', filter: 'blur(0px)' }
        ], { delay: E(T.letras + i * T.letraPaso), dur: E(T.letraDur), easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'backwards' }));
      });
      bt.waapi(animar(liga, [{ opacity: 0, transform: 'translateY(-10px)', filter: 'blur(8px) brightness(2)' }, { opacity: 1, transform: 'none', filter: 'none' }], { delay: E(T.liga), dur: E(T.ligaDur), easing: EXPO, fill: 'backwards' }));
      bt.waapi(animar(equipo, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { delay: E(T.liga + T.letraPaso * 2), dur: E(T.ligaDur), easing: EXPO, fill: 'backwards' }));
      bt.waapi(animar(seguir, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { delay: E(T.seguir), dur: E(T.ligaDur), easing: EXPO, fill: 'backwards' }));
      const sonar = (ms, fn) => bt.esperar(ms).then((llego) => llego && fn());
      sonar(E(T.golpe), () => sonido?.golpe?.());
      sonar(E(T.confeti), () => sonido?.confeti?.());
      bt.iniciar();
      };
      // la capa queda transparente (sin apagón ni bloque) hasta que la copa dibujó su primer cuadro
      raiz.dataset.calentando = '';
      const tope = new Promise((r) => {
        timerCalentar = setTimeout(r, CALENTAR_MAX);
      });
      const alAsentarse = Promise.race([Promise.resolve(copa.listo), tope]).then(() => {
        clearTimeout(timerCalentar);
        if (destruido) return new Promise(() => {});
        copa.redimensionar?.();
        ubicarPlaca();
        delete raiz.dataset.calentando;
        arrancar();
        arrancado = true;
        if (saltarAlArrancar) bt.saltar();
        return bt.esperar(corte);
      });
      const observador = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
        copa.redimensionar?.();
        ubicarPlaca();
      }) : null;
      observador?.observe(caja);
      return {
        alAsentarse,
        saltar: () => {
          if (arrancado) bt.saltar();
          else saltarAlArrancar = true;
        },
        pausar: () => bt.pausar(),
        reanudar: () => bt.reanudar(),
        destruir() {
          destruido = true;
          clearTimeout(timerCalentar);
          observador?.disconnect();
          bt.destruir();
        }
      };
    }
  });
}

function bloqueDe(titulo, hijos, clase = '') {
  return el('section', { class: `mo-r-bloque ${clase}`.trim() }, [el('h3', { class: 'mo-r-rotulo', text: titulo }), ...hijos]);
}

// La pantalla del resumen de la temporada. `datos`: lo que arma `resumenDelTramo` (`ui/core/momentos.js`). Resuelve al
// Continuar. Todas las velocidades la muestran; `escala` acorta la entrada.
export function mostrarResumen(datos, { escala = 1, controlar = null } = {}) {
  if (typeof document === 'undefined' || !datos) return Promise.resolve();
  const k = sinEscala(escala);
  const E = (ms) => Math.round(ms * k);
  return montarCapa({
    clase: 'mo-resumen',
    etiqueta: `Resumen de la temporada ${datos.anio ?? ''}`,
    controlar,
    clicCierra: false,
    armar(raiz, seguir) {
      const cabeza = el('header', { class: 'mo-r-cabeza' }, [
        el('p', { class: 'mo-r-marca' }, [el('b', { text: 'LA GRIETA' }), el('span', { text: `${datos.anio}/${datos.anio + 1} · Temporada ${datos.temporada ?? ''}` })]),
        el('div', { class: `mo-r-nota mo-r-nota--${datos.banda ?? 'gris'}` }, [
          el('span', { class: 'mo-r-nota-rotulo', text: 'Nota' }),
          el('b', { class: 'mo-r-nota-valor', text: Number(datos.nota).toFixed(1) }),
          el('span', { class: 'mo-r-nota-banda', text: datos.bandaTexto ?? '' })
        ])
      ]);
      const titular = el('div', { class: 'mo-r-titular' }, [
        el('h2', { text: datos.titular }),
        ...(datos.bajada ? [el('p', { class: 'mo-r-bajada', text: datos.bajada })] : [])
      ]);
      const vinetas = el('ul', { class: 'mo-r-vinetas' }, datos.vinetas.map((v) => el('li', {}, [icono(v.glifo ?? 'punto'), el('span', { text: v.texto })])));
      // W1-D (PLANUI §0.7, W2): el diario. El escalón que subiste (uno fuerte, los demás en chips), la decisión del año y los
      // números con su "antes".
      const ascensos = datos.ascensos ?? [];
      const ascenso = ascensos.length ? el('div', { class: `mo-r-ascenso mo-r-ascenso--${ascensos[0].eje}` }, [
        el('p', { class: 'mo-r-ascenso-rotulo' }, [icono(ICONO_DE_ASCENSO[ascensos[0].eje] ?? 'margen'), el('span', { text: ascensos[0].rotulo ?? 'Subiste de escalón' })]),
        el('h3', { class: 'mo-r-ascenso-texto', text: ascensos[0].texto }),
        ...(ascensos.length > 1 ? [el('ul', { class: 'mo-r-ascenso-chips' }, ascensos.slice(1).map((a) => el('li', {}, [icono(ICONO_DE_ASCENSO[a.eje] ?? 'margen'), el('span', { text: a.chip ?? a.texto })])))] : [])
      ]) : null;
      const uh = datos.ultimaHora;
      const ultima = uh ? el('div', { class: `mo-r-ultima mo-r-ultima--${uh.tipo}` }, [
        el('p', { class: 'mo-r-ultima-rotulo' }, [el('b', { text: 'Última hora' }), el('span', { text: uh.rotulo })]),
        el('p', { class: 'mo-r-ultima-texto' }, [el('strong', { text: uh.eleccion }), ...(uh.salio ? [' ', el('span', { text: uh.salio })] : [])])
      ]) : null;
      const odos = [];
      const datoDe = ({ rotulo, antes, despues, delta, banda, texto = null, eje = null }) => {
        // las columnas del odómetro son decorado (aria-hidden): el valor real lo lee el lector de pantalla
        const valor = el('b', { class: 'mo-r-dato-valor', 'aria-hidden': 'true', text: num(despues) });
        if (Number.isFinite(antes)) odos.push({ valor, antes, despues });
        const sube = Number.isFinite(delta) && delta > 0;
        const baja = Number.isFinite(delta) && delta < 0;
        const cambio = sube ? `subió ${num(delta)}` : baja ? `bajó ${num(-delta)}` : Number.isFinite(delta) ? 'igual' : '';
        return el('li', { class: 'mo-r-dato', 'data-eje': eje }, [
          el('span', { class: 'mo-r-dato-rotulo', text: rotulo }),
          el('span', { class: 'mo-r-dato-fila' }, [
            el('span', { class: 'solo-lectores', text: `${num(despues)}${cambio ? `, ${cambio}` : ''}` }),
            valor,
            ...(Number.isFinite(delta) ? [el('span', { class: `mo-r-dato-delta${baja ? ' baja' : sube ? '' : ' igual'}`, 'aria-hidden': 'true', text: `${sube ? '▲' : baja ? '▼' : '='} ${sube || baja ? num(Math.abs(delta)) : ''}`.trim() })] : [])
          ]),
          ...(banda || texto ? [el('span', { class: 'mo-r-dato-banda', text: banda ?? texto })] : [])
        ]);
      };
      const datosDelAnio = [];
      // el nivel del año sale de la ficha (`deltas`, eje 'nivel'): la foto de la página queda solo para el rango (amateur) o
      // si la ficha no tiene el delta
      const nivelDeLaFicha = (datos.deltas ?? []).some((d) => d.eje === 'nivel');
      if (datos.numero && Number.isFinite(datos.numero.despues) && (datos.numero.etiqueta === 'rango' || !nivelDeLaFicha)) {
        const n = datos.numero;
        datosDelAnio.push(datoDe({ eje: 'nivel', rotulo: n.etiqueta === 'rango' ? 'Tu rango' : 'Tu nivel', antes: n.antes, despues: n.despues, delta: Number.isFinite(n.antes) ? Math.round(n.despues - n.antes) : null, texto: n.texto ?? null }));
      }
      for (const d of datos.deltas ?? []) datosDelAnio.push(datoDe(d));
      const numeros = datosDelAnio.length ? el('ul', { class: 'mo-r-datos' }, datosDelAnio) : null;
      const bloques = [];
      if (datos.splits.length) {
        bloques.push(bloqueDe('Tus splits', [el('ol', { class: 'mo-r-splits' }, datos.splits.map((s) => el('li', {}, [
          // la liga por su nombre visible, nunca el id crudo (K5); en tier 3 no hay liga, es una zona
          el('b', { text: `${s.liga ? nombreVisibleDeLiga(s.liga) : s.tier === 3 ? 'Tier 3' : 'Liga'}` }),
          el('span', { text: s.org ?? '' }),
          el('span', { class: 'mo-r-pos', text: s.posicion != null ? `${s.posicion}.º${s.equipos ? ` de ${s.equipos}` : ''}` : '—' })
        ])))]));
      }
      const copas = [...datos.titulos.map((t) => t.nombre), ...(datos.mundial ? ['Mundial'] : [])];
      if (copas.length) {
        bloques.push(bloqueDe(copas.length === 1 ? 'El título' : 'Los títulos', [el('ul', { class: 'mo-r-copas' }, copas.map((n) => el('li', {}, [icono('copa', { clase: 'ln-ico mo-r-copa' }), el('b', { text: n })])))], 'mo-r-bloque--copas'));
      }
      // lo que sobra para leer el año en cinco segundos va plegado al final: lo que más se movió y "En el mundo"
      const plegados = [];
      if (datos.ejes.length) {
        plegados.push(bloqueDe('Lo que más se movió', [el('div', { class: 'eje-chips mo-r-ejes' }, datos.ejes.map((x) => chipEje({ eje: x.eje, valor: x.valor, cambio: true, sufijo: x.sufijo })))]));
      }
      if (datos.mundo && (datos.mundo.campeones.length || datos.mundo.campeonMundial)) {
        const filas = datos.mundo.campeones.map((c) => el('li', {}, [logoOrg(c.org, { clase: 'mo-r-logo' }), el('b', { text: c.org }), el('span', { text: `${nombreVisibleDeLiga(c.liga)}` })]));
        if (datos.mundo.campeonMundial) {
          filas.push(el('li', { class: 'mo-r-mundial' }, [logoOrg(datos.mundo.campeonMundial, { clase: 'mo-r-logo' }), el('b', { text: datos.mundo.campeonMundial }), el('span', { text: 'Mundial' })]));
        }
        plegados.push(bloqueDe('En el mundo', [el('ul', { class: 'mo-r-mundo' }, filas)], 'mo-r-bloque--mundo'));
      }
      const mas = plegados.length ? el('details', { class: 'mo-r-mas' }, [el('summary', { text: 'Más del año' }), el('div', { class: 'mo-r-grilla' }, plegados)]) : null;
      // el cuerpo scrollea solo y el pie (Continuar) queda debajo, afuera del scroll: el botón nunca tapa una fila
      const grilla = bloques.length ? el('div', { class: 'mo-r-grilla' }, bloques) : null;
      const piezas = [cabeza, titular, ascenso, ultima, numeros, vinetas, grilla, mas].filter(Boolean);
      const cuerpo = el('div', { class: 'mo-r-cuerpo' }, piezas);
      const panel = el('div', { class: 'mo-r-panel' }, [cuerpo, el('div', { class: 'mo-r-pie' }, [seguir])]);
      raiz.prepend(el('div', { class: 'mo-negro mo-r-velo', 'aria-hidden': 'true' }), panel);

      const quieto = reducido();
      const animaciones = [];
      [...piezas, seguir].forEach((nodo, i) => {
        animaciones.push(animar(nodo, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { delay: E(i * T_RES.paso), dur: E(T_RES.entra), easing: EXPO, fill: 'backwards' }));
      });
      // el escalón cae como un sello después de entrar
      const texto = ascenso?.querySelector('.mo-r-ascenso-texto');
      if (texto) {
        animaciones.push(animar(texto, [{ opacity: 0, transform: 'scale(1.35)', filter: 'blur(6px)' }, { opacity: 1, transform: 'scale(0.97)', filter: 'blur(0px)', offset: 0.7 }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], { delay: E(piezas.indexOf(ascenso) * T_RES.paso + T_RES.sello), dur: E(T_RES.selloDur), easing: EXPO, fill: 'backwards' }));
      }
      if (!quieto) {
        for (const o of odos) odometro(o.valor, o.antes, o.despues, { delay: E(T_RES.numero), dur: E(T_RES.numeroDur) });
      }
      let timer = null;
      const alAsentarse = quieto ? null : new Promise((r) => {
        timer = setTimeout(r, E(T_RES.asentarse));
      });
      return {
        alAsentarse,
        saltar() {
          clearTimeout(timer);
          for (const a of animaciones.flat()) {
            try {
              a?.finish?.();
            } catch { /* nada */ }
          }
        },
        destruir: () => clearTimeout(timer)
      };
    }
  });
}
