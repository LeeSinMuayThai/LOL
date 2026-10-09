// Eras: la MISMA composicion (franja + titulo de parada + ambiente + arte) en las cinco eras. Arriba, la pagina entera
// en la era activa (el panel la cambia); abajo, la tira de las cinco a escala, una al lado de la otra. Cada foto de la
// tira es el mismo shader dibujado con el equipo de luz de su era y el campeon que el jugador jugaba en ese momento.
import { ERAS, fotografiar, crearAmbiente } from './ambiente.js';
import { el, entrar, animar, reducido, inst } from './util.js';
import { franja } from './marco.js';

const ESCENAS = {
  pieza: 'De noche en tu cuarto',
  academia: 'La sala de práctica',
  escenario: 'El escenario de la liga',
  mundial: 'El estadio del Mundial',
  leyenda: 'Lo que quedó',
};
const MINI = { ancho: 1440, alto: 900 };

export function crearEras({ datos, estado, amb }) {
  const eras = datos.eras;
  const titulo = datos.evento?.decision?.titulo ?? 'Una parada';
  let era = estado.eraEfectiva;
  const raiz = el('section', { class: 'eras-pantalla', 'data-pieza': 'eras' });
  const frSlot = el('div', { class: 'eras-franja' });
  const rotulo = el('p', { class: 'rotulo-cat' }, [el('i', { class: 'punto-luz' }), el('span', { class: 'er-escena' }), el('span', { class: 'bisagra er-anio' })]);
  const h1 = el('h1', { class: 'titulo-parada', 'data-foco': '', tabindex: '-1', text: titulo });
  const bajada = el('p', { class: 'er-bajada', text: 'La misma parada, la misma franja, el mismo campeón de ese año. Cambia la luz: el juego cambia de mundo a lo largo de la carrera.' });
  const cabeza = el('div', { class: 'er-cabeza' }, [rotulo, h1, bajada]);

  const tira = el('ol', { class: 'er-tira', 'aria-label': 'Las cinco eras' });
  const fondos = {};
  const minis = {};
  for (const e of ERAS) {
    const foto = eras[e];
    const fondo = el('div', { class: 'er-fondo' });
    fondos[e] = fondo;
    const comp = el('div', { class: 'er-comp', 'aria-hidden': 'true', 'data-era': e }, [
      franja(foto.franja),
      el('div', { class: 'er-comp-cuerpo' }, [
        el('p', { class: 'rotulo-cat' }, [el('i', { class: 'punto-luz' }), ESCENAS[e]]),
        el('p', { class: 'titulo-parada', text: titulo }),
        el('div', { class: 'er-comp-opcion' }, [el('span', { class: 'op-tecla', text: '1' }), el('span', { class: 'op-label', text: datos.evento?.decision?.opciones?.[0]?.label ?? '' })]),
        el('div', { class: 'er-comp-opcion apagada' }, [el('span', { class: 'op-tecla', text: '2' }), el('span', { class: 'op-label', text: datos.evento?.decision?.opciones?.[1]?.label ?? '' })]),
      ]),
    ]);
    const boton = el('button', { type: 'button', class: 'er-mini', 'data-era': e, 'aria-pressed': String(e === era), 'aria-label': `Ver la era ${e}: ${ESCENAS[e]}` }, [
      el('div', { class: 'er-marco' }, [fondo, el('div', { class: 'er-escala' }, comp)]),
      el('span', { class: 'er-pie' }, [
        el('span', { class: 'er-luces', 'data-era': e }, [el('i', { class: 'l1' }), el('i', { class: 'l2' })]),
        el('b', { text: e }),
        el('span', { text: `${foto.edad} · ${foto.anio}` }),
      ]),
      el('span', { class: 'er-pie-escena', text: `${ESCENAS[e]} · ${foto.main}` }),
    ]);
    boton.addEventListener('click', () => window.vitrina?.era(e));
    minis[e] = boton;
    tira.append(el('li', {}, boton));
  }
  raiz.append(frSlot, cabeza, tira);

  function pintarEra(e) {
    era = e;
    const foto = eras[e];
    frSlot.textContent = '';
    frSlot.append(franja(foto.franja));
    rotulo.querySelector('.er-escena').textContent = ESCENAS[e];
    rotulo.querySelector('.er-anio').textContent = `${foto.etiquetaDeAnio} · ${foto.org ?? foto.fase}`;
    for (const [k, b] of Object.entries(minis)) b.setAttribute('aria-pressed', String(k === e));
  }
  pintarEra(era);

  // fotos de la tira: WebGL de una vez (mismo shader), o respaldo CSS vivo dentro de cada miniatura
  const respaldos = [];
  const artePorEra = Object.fromEntries(ERAS.map((e) => [e, eras[e].main]));
  const carga = (async () => {
    const sinGL = document.documentElement.hasAttribute('data-sin-webgl');
    const fotos = sinGL ? null : await fotografiar(ERAS, { ancho: 480, alto: 300, meta: datos.meta, artePorEra });
    for (const e of ERAS) {
      if (fotos?.[e]) {
        fotos[e].classList.add('er-foto');
        fondos[e].append(fotos[e]);
      } else {
        const a = crearAmbiente(fondos[e], { meta: datos.meta });
        a.pausar?.();
        respaldos.push(a);
        await a.ambiente({ era: e, arte: artePorEra[e], encuadre: 'eras', velo: 0.4 });
      }
    }
  })();

  let ro = null;
  const medir = () => {
    const m = tira.querySelector('.er-marco');
    if (m?.clientWidth) tira.style.setProperty('--er-k', String(m.clientWidth / MINI.ancho));
  };
  function entrada() {
    medir();
    ro = new ResizeObserver(medir);
    ro.observe(tira);
    entrar(frSlot.firstChild, 0, -10);
    entrar(rotulo, 120, 10);
    animar(h1, [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }], { delay: 180, dur: 420 });
    entrar(bajada, 300, 10);
    tira.querySelectorAll('li').forEach((li, i) => animar(li, [{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }], { delay: 360 + i * 70, dur: 480 }));
  }

  return {
    nodo: raiz,
    entrar: entrada,
    alCambiarEra(e) {
      pintarEra(e);
      amb.ambiente({ arte: eras[e].main });
      if (!(inst() || reducido())) entrar(rotulo, 0, 6);
    },
    listo: () => carga,
    destruir() {
      ro?.disconnect();
      respaldos.forEach((a) => a.destruir());
    },
    arte: eras[era]?.main ?? null,
    animo: 'normal',
    encuadre: 'eras',
    velo: 0.5,
  };
}
export { MINI };
