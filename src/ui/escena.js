// El director de escena, la mitad del DOM (FASE V, V2-B; PLAN.md §V.5). `revelar` es el ÚNICO lugar que escribe
// `.shell[data-pieza]`, y el único que escribe la `vista` (lo que la pantalla ya contó): la franja, el acompañante, los
// cuartos, la luz de estudio y el marcador de serie se pintan desde `vista`, nunca desde el estado del motor (regla 4 de
// §V.3: nada adelanta el resultado). Qué nodos se ven en cada pieza lo dice `index.html` (`data-piezas="…"`) y lo aplica
// `estilos/shell.css`: este módulo no toca `hidden`. El mapa de la pantalla entera está en `DISENO.md` §4.5.
//
// ---------------------------------------------------------------------------------------------------------------------
// EL CONTRATO DE LAS FAMILIAS (§V.5; lo leen los workers de V3)
//
// Una familia de parada (`src/ui/paradas/{decision,partido,mercado,minijuego}.js`; la elige `familiaDeParada` de
// `ui/core/escena.js`):
//   - exporta `mostrar(contenedor, decision, ctx)` y `acompanante(contenedor, estado, modulos)`;
//   - no cambia nada fuera de su contenedor ni lee ids ajenos;
//   - pone `data-atajo="n"` (1-4) en sus opciones y `data-foco` (con `tabindex="-1"`) en su encabezado: el teclado
//     (`ui/teclado.js`) hace clic en `[data-atajo=n]` de la pieza activa y este director lleva el foco al `[data-foco]`,
//     nunca a la opción 1 (el que venía apretando Espacio no elige sin querer);
//   - su CSS va en su hoja (`estilos/<familia>.css`);
//   - nunca edita `index.html`, `app.js`, `ui/escena.js`, `teclado.js`, `shell.css` ni `primitivos.css`;
//   - mantiene los ids que lee `src/dev/recorrido.mjs` o lo actualiza en el mismo commit;
//   - en `formatoUi.js` y `tokens.css`, solo agrega al final.
// `ctx` trae lo que la familia necesita del controlador (`estado`, `responder`, `ui`, `pintarPrevia`, `rngUi`, los
// elementos de su contenedor): la familia no importa `app.js`. (`lowerThird` sigue en `ctx` y no hace nada desde V2-C:
// la barra de abajo se fue; la familia que lo llama puede dejar de hacerlo.) El `acompanante` de la familia reemplaza al
// stub de su tipo en `ui/acompanante.js`.
// ---------------------------------------------------------------------------------------------------------------------
import { piezaDe, PIEZAS_DE_PARADA } from './core/escena.js';

function esVisible(el) {
  if (!el) return false;
  if (typeof el.checkVisibility === 'function') return el.checkVisibility();
  return el.offsetParent !== null;
}

// `shell`: el `.shell` de `index.html`. `vista`: el store de lo ya mostrado (`ui/core/store.js`).
export function crearEscena({ shell, vista }) {
  function pieza() {
    return shell.dataset.pieza ?? null;
  }

  // El encabezado de la parada activa: el primer `[data-foco]` visible del escenario.
  function encabezadoActivo() {
    return [...shell.querySelectorAll('.escenario [data-foco]')].find(esVisible) ?? null;
  }

  // `estado`: el del motor (o `null`: el inicio). `reproduciendo`: el relato está por contar esta llamada al pipeline;
  // la pieza es `relato` y la `vista` NO cambia (la ficha sigue mostrando lo que ya se contó). Sin `reproduciendo`, la
  // pantalla ya contó `estado`: la `vista` pasa a ser `estado`. `pintar` (opcional) llena la pieza nueva con la pieza
  // ya visible y antes de mover el foco (una parada marca su `[data-foco]` al pintarse).
  function revelar(estado, { reproduciendo = false, pintar = null } = {}) {
    const nueva = piezaDe(estado, { reproduciendo });
    const anterior = pieza();
    shell.dataset.pieza = nueva;
    if (!reproduciendo) {
      vista.escribir(estado);
    }
    const esParada = nueva !== 'relato' && nueva !== 'inicio' && nueva !== 'final';
    if (esParada || (nueva !== anterior && nueva !== 'relato')) {
      window.scrollTo?.({ top: 0, behavior: 'instant' });
    }
    if (typeof pintar === 'function') {
      pintar();
    }
    if (esParada) {
      const encabezado = encabezadoActivo();
      if (encabezado) {
        if (!encabezado.hasAttribute('tabindex')) {
          encabezado.setAttribute('tabindex', '-1');
        }
        encabezado.focus({ preventScroll: true });
      }
    }
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
