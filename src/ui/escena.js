// El director de escena, la mitad del DOM (FASE V, V2-B; PLAN.md §V.5; PLANUI U1). `revelar` es el ÚNICO lugar que
// escribe `.shell[data-pieza]`, el único que escribe la `vista` (lo que la pantalla ya contó) y el único escritor de la
// luz: `data-era`/`data-animo` en <html> (los lee tokens.css: el equipo de luz, el tono) y en `.shell`, más el ambiente
// (`ambiente.aplicar`). La franja, el acompañante, los cuartos, la luz y el marcador de serie se pintan desde `vista`,
// nunca desde el estado del motor (regla 4 de §V.3: nada adelanta el resultado; la era queda quieta mientras el relato
// cuenta). Qué nodos se ven en cada pieza lo dice `index.html` (`data-piezas="…"`) y lo aplica `estilos/shell.css`: este
// módulo no toca `hidden`. El mapa de la pantalla entera está en `DISENO.md` §4.5.
//
// ---------------------------------------------------------------------------------------------------------------------
// EL CONTRATO DE LAS FAMILIAS (§V.5; actualizado en PLANUI U1, §11; lo leen los workers de las olas 2 y 3)
//
// Una familia de parada (`src/ui/paradas/{decision,partido,mercado,minijuego}.js`; la elige `familiaDeParada` de
// `ui/core/escena.js`):
//   - exporta `mostrar(contenedor, decision, ctx)` y `acompanante(contenedor, estado, modulos)`;
//   - no cambia nada fuera de su contenedor ni lee ids ajenos;
//   - pone `data-atajo="n"` (1-4) en sus opciones y `data-foco` (con `tabindex="-1"`) en su encabezado: el teclado
//     (`ui/teclado.js`) hace clic en `[data-atajo=n]` de la pieza activa y este director lleva el foco al `[data-foco]`,
//     nunca a la opción 1 (el que venía apretando Espacio no elige sin querer);
//   - su CSS va en su hoja (`estilos/<familia>.css`);
//   - nunca edita `index.html`, `app.js`, `ui/escena.js`, `teclado.js`, `shell.js`, `shell.css`, `base.css` ni
//     `primitivos.css`;
//   - mantiene los ids que lee `src/dev/recorrido.mjs` o lo actualiza en el mismo commit;
//   - en `formatoUi.js` y `tokens.css`, solo agrega al final (y en tokens.css nada que choque con el check temporal
//     contra la vitrina, §9.3).
// Desde la UI nueva (PLANUI §11), además:
//   - usa el sistema: los tokens de `tokens.css` (sin colores propios: #rrggbb/#rrggbbaa, nunca oklch ni color-mix) y
//     las piezas de `primitivos.css` (UN panel, `.rotulo`, `.titulo-parada`, `.opcion`, `.boton`, `.inspector`…);
//     ninguna hoja define otra superficie;
//   - los efectos son de `fx/` (el ambiente, el arte, los momentos, el jugo): nunca efectos propios, nunca `rngUi` para
//     decorar (guard), nunca escribe `data-era`/`data-animo` (la luz es de este director: `ui/core/era.js`) ni llama a
//     `startViewTransition` (las transiciones son de `revelar`, opción `transicion`, solo en los 3 lugares de §6.3);
//   - respeta ≤ 2 niveles de contenedor visible, títulos de parada ≤ 56 px (Mona Sans ancha) y "leer menos" (§7);
//   - nada de lo prohibido (§5.9: el chaflán, ticks/escuadras, scanlines, la grilla de fondo, Barlow, el cyan de la fase T);
//   - entrega sus capturas contra la estrella del norte (la vitrina, `src/dev/estrella.mjs`).
// `ctx` trae lo que la familia necesita del controlador (`estado`, `responder`, `ui`, `pintarPrevia`, el stream de los
// minijuegos, los elementos de su contenedor): la familia no importa `app.js`. El `acompanante` de la familia reemplaza
// al stub de su tipo en `ui/acompanante.js`.
// ---------------------------------------------------------------------------------------------------------------------
import { piezaDe, PIEZAS_DE_PARADA } from './core/escena.js';
import { luzDe } from './core/era.js';
import { mundoBase } from './core/mundo.js';
import { transicionar } from './fx/transicion.js';

function esVisible(el) {
  if (!el) return false;
  if (typeof el.checkVisibility === 'function') return el.checkVisibility();
  return el.offsetParent !== null;
}

const AMBIENTE_NULO = Object.freeze({ aplicar() {}, fondo() {}, aquietar() {}, pausa() {}, declarar() {}, costura() {}, geometria: () => ({ k: 0 }), tenir() {}, momento() {}, soltarMomento() {} });

// `shell`: el `.shell` de `index.html`. `vista`: el store de lo ya mostrado (`ui/core/store.js`). `ambiente`: el puente
// al ambiente (`shell.js`: `aplicar({ era, animo })`, `fondo(contexto)`, `declarar(mundo)`, `aquietar(si)`,
// `pausa(motivo, activa)`).
// `sinTransicion()`: `true` si el reproductor va sin espera (INST o movimiento reducido): ahí todo es síncrono.
export function crearEscena({ shell, vista, ambiente = AMBIENTE_NULO, sinTransicion = () => true }) {
  // La última pieza pedida (no la del DOM): con una transición esperando su cuadro, el DOM todavía muestra la anterior.
  let ultimaPedida = shell.dataset.pieza ?? null;
  let luzActual = null;
  // Lo que el director le dice al mundo según la pieza: el inicio tiene su política de fondo (el bitono entero).
  const contextoDe = (p) => (p === 'inicio' ? 'inicio' : 'juego');
  ambiente.fondo(contextoDe(ultimaPedida ?? 'inicio'));
  ambiente.declarar(mundoBase(ultimaPedida ?? 'inicio', vista.leer()), { reemplazar: true });

  function pieza() {
    return shell.dataset.pieza ?? null;
  }

  // El encabezado de la parada activa: el primer `[data-foco]` visible del escenario.
  function encabezadoActivo() {
    return [...shell.querySelectorAll('.escenario [data-foco]')].find(esVisible) ?? null;
  }

  function enfocarEncabezado() {
    const encabezado = encabezadoActivo();
    if (encabezado) {
      if (!encabezado.hasAttribute('tabindex')) {
        encabezado.setAttribute('tabindex', '-1');
      }
      encabezado.focus({ preventScroll: true });
    }
  }

  // La luz sale de la `vista` (ui/core/era.js). Un fallo acá deja la luz como estaba: nunca frena el juego.
  function aplicarLuz() {
    let luz;
    try {
      luz = luzDe(vista.leer());
    } catch (error) {
      console.error('No se pudo calcular la luz de la pantalla:', error);
      return;
    }
    if (luzActual && luz.era === luzActual.era && luz.animo === luzActual.animo) return;
    luzActual = luz;
    const raiz = shell.ownerDocument.documentElement;
    raiz.dataset.era = luz.era;
    raiz.dataset.animo = luz.animo;
    shell.dataset.era = luz.era;
    ambiente.aplicar(luz);
  }
  aplicarLuz();

  // `estado`: el del motor (o `null`: el inicio). `reproduciendo`: el relato está por contar esta llamada al pipeline;
  // la pieza es `relato` y la `vista` NO cambia (la ficha y la luz siguen mostrando lo que ya se contó). Sin
  // `reproduciendo`, la pantalla ya contó `estado`: la `vista` pasa a ser `estado`. `pintar` (opcional) llena la pieza
  // nueva con la pieza ya visible y antes de mover el foco (una parada marca su `[data-foco]` al pintarse).
  // `transicion` (PLANUI §6.3): `true`, o la lista de piezas que entran con View Transition; solo la piden los tres
  // lugares (elegir -> resultado, -> partido, -> final). Es síncrona igual en INST, sin soporte, con movimiento reducido,
  // en la misma pieza o al retomar (quien retoma no la pide).
  function revelar(estado, { reproduciendo = false, pintar = null, transicion = false } = {}) {
    const nueva = piezaDe(estado, { reproduciendo });
    const anterior = ultimaPedida;
    ultimaPedida = nueva;
    const pedida = transicion === true || (Array.isArray(transicion) && transicion.includes(nueva));
    const animar = pedida && nueva !== anterior && !sinTransicion();
    const esParada = nueva !== 'relato' && nueva !== 'inicio' && nueva !== 'final';
    transicionar(() => {
      shell.dataset.pieza = nueva;
      if (!reproduciendo) {
        vista.escribir(estado);
        aplicarLuz();
      }
      if (esParada || (nueva !== anterior && nueva !== 'relato')) {
        window.scrollTo?.({ top: 0, behavior: 'instant' });
      }
      // El mundo de la pieza (PLANUI §0.2): el de por defecto (tu campeón en la luz de la era) cada vez que cambia la
      // pieza o entra una parada; la familia declara lo suyo encima al pintarse.
      if (nueva !== anterior || esParada) {
        ambiente.declarar(mundoBase(nueva, vista.leer()), { reemplazar: true });
      }
      if (typeof pintar === 'function') {
        pintar();
      }
      // La enmienda de la regla 1 (PLANUI §2): una parada apareció, el ambiente se aquieta; vuelve a moverse en el
      // relato. Con minijuego, en pausa.
      if (nueva !== anterior) {
        ambiente.aquietar(esParada);
        ambiente.fondo(contextoDe(nueva));
      }
      ambiente.pausa('minijuego', nueva === 'minijuego');
    }, { animar, alTerminar: esParada ? enfocarEncabezado : null });
    return nueva;
  }

  // V2-C: al cerrar un cuarto el foco vuelve a la parada (a su encabezado, como cuando entró), no al botón que lo abrió:
  // así Espacio no reabre el cuarto. `false` si no hay una parada a la vista.
  function enfocar() {
    if (!PIEZAS_DE_PARADA.includes(pieza())) {
      return false;
    }
    const encabezado = encabezadoActivo();
    if (!encabezado) {
      return false;
    }
    encabezado.focus({ preventScroll: true });
    return true;
  }

  return { revelar, pieza, enfocar };
}

// Las dos marcas del contrato, para que las familias no las escriban cada una a su manera.
export function marcarFoco(encabezado) {
  if (!encabezado) return;
  encabezado.dataset.foco = '';
  encabezado.setAttribute('tabindex', '-1');
}

export function marcarAtajo(boton, numero) {
  if (boton) boton.dataset.atajo = String(numero);
}
