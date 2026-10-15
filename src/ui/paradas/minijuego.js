// La parada del minijuego (FASE V). V2-A mudó el flujo que vivía en `app.js` — la consigna, la charla del coach, el botón
// "¡Vamos!", el minijuego en sí y el veredicto — a este archivo, tal cual. V3d (PLAN.md §V.4/§V.7) lo lleva a la gramática:
// antes de "¡Vamos!" se ve, sin scrollear, el título (con el foco), qué se juega en una línea, la caja de apuesta compacta (o la
// charla del coach) y el botón; la pestaña dice qué parada es (`rotuloDeMinijuego`, D93: la prueba y la prensa ya no son "en el
// mapa"); y hay atajos donde no le roban teclas al juego (D94): mientras el contenedor lleva `data-fase="previa"`, 1-n eligen la
// charla y V es "¡Vamos!" (`ui/teclado.js`); en cuanto arranca el minijuego la fase pasa a `juego` y todas las teclas vuelven a
// ser de él (1-5, Q/W/E/R, A/D, A/S). Las fases de `#minijuego[data-fase]`:
//   previa        la charla del coach o "¡Vamos!" (el reloj todavía no corre);
//   juego         el minijuego en marcha;
//   resultado     el veredicto, hasta que la parada se va;
//   transmision   el mapa decisivo (semis, final, internacional) después del veredicto: el panel le deja el lugar al cara a
//                 cara, que cuenta ese mapa y el cierre de la serie (PLANUI §0.3, punto 6.1; estilos/transmision.css);
//   firma         la prueba que salió: el panel muestra el contrato que se firma (§0.3, punto 5; estilos/mercado.css).
//
// Los minijuegos (fase 4) se migraron a `src/ui/components/minijuegos/` en la fase T6 — PLAN.md §8.5 los dejó sin mover a
// propósito "porque la fase 12 les cambia la presentación". Import estático: son livianos y no necesitan el manejo de
// error de `cargarModulos()` (esa ruta existe por si `location.protocol === 'file:'`, que ya rompe mucho antes).
import { montadorDe, g1 as G1, veredictoDeMinijuego, crearApuesta, primeraOracion, marcarHit, marcarMiss } from '../components/minijuegos/index.js';
import { previaDeDecision } from '../../core/previaDePartido.js';
import { probabilidadDeFirmarTrasPrueba, veredictoDeLaPrueba } from '../../core/serie.js';
import { porcentaje } from '../../core/formato.js';
import { marcarFoco, marcarAtajo } from '../escena.js';
import { rotuloDeMinijuego } from '../formatoUi.js';
import { fichajeDe, narrarFichaje } from '../components/fichaje.js';
import { narrarContratoFirmado, firmaDeLaPrueba } from '../components/mercado.js';
import { crearCaraACaraDeNarracion } from '../components/caraACara.js';
import { fundirCuadro } from '../narracion.js';
import { crearCaminoG1, crearMesaG1, marcarMapaG1, crearVeredictoG1 } from '../components/finales.js';

// La tecla de "¡Vamos!". Ningún minijuego la usa (Enter y Espacio sí, y un Enter sostenido se contaría como jugada).
const TECLA_VAMOS = 'V';
// Hasta cuántas opciones de la charla llevan atajo (las teclas 1-4 del teclado).
const OPCIONES_CON_ATAJO = 4;
// G1: lo que el veredicto queda a la vista antes de que la parada se vaya (con el "tan cerca", hay una línea más que leer).
const LECTURA_VEREDICTO_MS = 1600;
const LECTURA_VEREDICTO_G1_MS = 2300;

// El acompañante: el minijuego no tiene (§V.4: "inicio, final o minijuego → nada").
export function acompanante() {
  return null;
}

function nodo(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

// La tecla a la izquierda de un botón, como en la fila de opción de las demás paradas.
function crearTecla(texto) {
  const tecla = nodo('kbd', 'minijuego-atajo', texto);
  tecla.setAttribute('aria-hidden', 'true');
  return tecla;
}

// La familia (contrato de `ui/escena.js`). `contenedor` es el panel `#minijuego` (con `#minijuegoTitle`, `#minijuegoDesc`,
// `#minijuegoApuesta` y `#minijuegoWidget` adentro). `ctx` trae lo que llega de `app.js`:
//   estado        el state de la carrera en este momento.
//   rngUi         el RNG de la interfaz (el que ponen los minijuegos; el motor no lo ve).
//   responder     manda la respuesta de la pausa al motor ({ resultado } o { resultado, charla }).
//   pintarPrevia  pinta la previa del partido (K2d) y devuelve la previa (o null).
//   mundo, sonido el puente del ambiente y el sonido del kit (para el fichaje).
// Devuelve la vista con `narrar` (PLANUI §0.2) y `destruir`:
//   - el mapa decisivo (`datos.momento === 'mapa_decisivo'`): después del veredicto, ese mapa y el cierre de la serie en
//     el cara a cara (`crearCaraACaraDeNarracion`), montado en este panel (PLANUI §0.3, punto 6.1);
//   - la prueba que salió: el contrato sellado "Firmado" con el club que te probó, en este panel (`narrarContratoFirmado`,
//     con el tono y tu valor de mercado con que el mercado mostró esa oferta) y después el fichaje
//     (`components/fichaje.js`): tu línea sobre el mapa y la firma con tu jersey y tu número, como cuando se firma
//     directo en el mercado (§0.3, punto 5);
//   - la prueba que no salió y firmó el respaldo: el fichaje, como siempre.
export function mostrar(contenedor, decision, ctx) {
  const { estado, rngUi, responder, pintarPrevia, mundo = null, sonido = null } = ctx;
  // lo que quedó de una narración de la parada anterior (la transmisión o el contrato se quedan hasta que el relato los
  // reemplaza: la foto de la transición los lleva)
  for (const n of contenedor.querySelectorAll(':scope > .mj-transmision, :scope > .mj-firma, :scope > .g1-camino, :scope > .g1-mesa')) n.remove();
  const previa = pintarPrevia(decision, estado);
  montarParada(contenedor, decision, { estado, rngUi, responder, renderPrevia: pintarPrevia });
  marcarFoco(contenedor.querySelector('#minijuegoTitle'));
  let transmision = null;
  return {
    async narrar(ctxNarracion) {
      if (decision.datos?.momento === 'mapa_decisivo') {
        const r = await narrarElDecisivo(contenedor, decision, { estado, previa, mundo, sonido, pintarPrevia }, ctxNarracion);
        transmision = r.vista;
        return r.contados;
      }
      const fichaje = fichajeDe(ctxNarracion.antes, ctxNarracion.despues, ctxNarracion.logs);
      if (!fichaje || fichaje.renovacion) return 0;
      const pasaste = decision.datos?.momento === 'tryout' && decision.datos?.oferta?.org === fichaje.org;
      if (!pasaste) {
        await narrarFichaje(ctxNarracion, fichaje, { mundo, sonido });
        return fichaje.hasta;
      }
      const { tono, valor } = firmaDeLaPrueba(ctxNarracion.antes ?? estado, fichaje.org);
      // el panel le deja el lugar al contrato y el mundo vuelve a moverse (la luz de la org, el golpe de la bienvenida)
      const capa = nodo('div', 'mj-firma');
      contenedor.append(capa);
      contenedor.dataset.fase = 'firma';
      pintarPrevia(null, estado);
      mundo?.pausa?.('minijuego', false);
      await narrarContratoFirmado(ctxNarracion, fichaje, { contenedor: capa, tono, mundo, sonido });
      await narrarFichaje(ctxNarracion, fichaje, { mundo, sonido, valor, tono });
      return fichaje.hasta;
    },
    destruir() {
      transmision?.destruir?.();
    }
  };
}

// El mapa decisivo que se jugó acá: la transmisión se monta en el panel (el resto del panel queda sin verse:
// `data-fase="transmision"`), el mundo vuelve a moverse con la costura del cara a cara y la transmisión cuenta el mapa
// (las cartas, el suspenso, VICTORIA o DERROTA, los pips) y la placa de cierre con los logs de la respuesta. La capa se
// queda a la vista hasta que el relato la reemplaza (la foto de la transición la lleva). Devuelve la vista y cuántos
// logs contó.
async function narrarElDecisivo(contenedor, decision, { estado, previa, mundo, sonido, pintarPrevia }, ctx) {
  const mapa = (ctx.logs ?? []).find((l) => l?.mapa);
  if (!mapa || !contenedor.isConnected) return { vista: null, contados: 0 };
  const antes = ctx.antes ?? estado;
  const capa = nodo('div', 'mj-transmision');
  contenedor.append(capa);
  const vista = crearCaraACaraDeNarracion(capa, decision, {
    estado: antes,
    previa,
    mundo,
    sonido,
    internacional: antes?.pendiente?.sistemaId === 'internacional',
    pMapa: mapa.p
  });
  // la previa del minijuego se va (la chance del mapa está en la transmisión) y el panel le deja el lugar
  pintarPrevia(null, estado);
  contenedor.dataset.fase = 'transmision';
  fundirCuadro(capa);
  mundo?.pausa?.('minijuego', false);
  mundo?.declarar?.(vista.mundo);
  marcarFoco(vista.titulo);
  vista.titulo?.focus?.({ preventScroll: true });
  return { vista, contados: await vista.narrar(ctx) };
}

// G1 (PLANUI §0.9): con `decision.datos.g1` la parada es la de una final que se juega con las manos. Arriba, el camino del
// torneo y la tira de mapas con el marcador escrito (`conCamino`: el stream del Swiss ya tiene su tablero y no lo repite);
// antes del widget, la mesa: la regla con la vara en las unidades del minijuego, el poder de la clase, el rótulo del
// desempate o la revancha y la charla. El veredicto dice PASÓ / CASI / NO SALIÓ con la misma cuenta que el motor
// (`components/minijuegos/g1.js`) y el "tan cerca". La respuesta suma `poder` (contrato de G1).
// `nodos` (el stream la reusa): { titulo, desc, apuesta, widget }; por defecto, los del panel `#minijuego`.
export function montarParada(contenedor, decision, { estado, rngUi, responder, renderPrevia, nodos = null, conCamino = true }) {
  const estadoActual = estado;
  const minijuegoTitle = nodos?.titulo ?? contenedor.querySelector('#minijuegoTitle');
  const minijuegoDesc = nodos?.desc ?? contenedor.querySelector('#minijuegoDesc');
  const minijuegoApuesta = nodos?.apuesta ?? contenedor.querySelector('#minijuegoApuesta');
  const minijuegoWidget = nodos?.widget ?? contenedor.querySelector('#minijuegoWidget');
  const g1 = decision.datos?.g1 ?? null;
  let poderActivo = false;
  let camino = null;
  let mesa = null;

  contenedor.hidden = false;
  contenedor.dataset.fase = 'previa';
  contenedor.dataset.tabLabel = rotuloDeMinijuego(decision);
  minijuegoTitle.textContent = decision.titulo;
  // Qué se juega, en UNA línea (la primera oración); lo que sobra va detrás del "más" de la caja de apuesta.
  const [lineaDesc, restoDesc] = primeraOracion(decision.descripcion);
  minijuegoDesc.textContent = lineaDesc;
  // Fase 9R4d: qué se juega, ANTES de jugarlo.
  minijuegoApuesta.replaceChildren(crearApuesta(decision, estadoActual, { resto: restoDesc }));
  minijuegoWidget.innerHTML = '';
  minijuegoWidget.className = 'minijuego-widget';
  if (g1) {
    contenedor.dataset.g1 = '';
    if (conCamino) {
      camino = crearCaminoG1(g1, estadoActual, decision);
      contenedor.prepend(camino);
    }
    mesa = crearMesaG1(decision, estadoActual, {
      alCambiarPoder: (activo) => {
        poderActivo = activo;
      }
    });
    minijuegoWidget.before(mesa.nodo);
  } else {
    delete contenedor.dataset.g1;
  }

  // K4-B: en el mapa decisivo, si te queda la charla del coach de la temporada, se elige antes de jugar: cada botón
  // dice con cuánto llegás (la previa de arriba cambia con la elección, y es la p que se tira).
  if (decision.datos.charla?.disponible) {
    const conCharla = previaDeDecision(estadoActual, decision, { charla: true });
    const sinCharla = previaDeDecision(estadoActual, decision, { charla: false });
    const eleccion = nodo('div', 'minijuego-charla');
    eleccion.appendChild(nodo('p', 'minijuego-charla-pregunta', 'Te queda la charla del coach de esta temporada. ¿La usás antes de este mapa?'));
    [
      { charla: true, label: 'Que hable el coach ahora', previa: conCharla },
      { charla: false, label: 'Guardarla para después', previa: sinCharla }
    ].forEach((opcion, indice) => {
      const boton = nodo('button', 'minijuego-charla-opcion');
      boton.type = 'button';
      boton.appendChild(crearTecla(String(indice + 1)));
      boton.appendChild(nodo('span', 'minijuego-charla-label', opcion.label));
      if (opcion.previa) {
        boton.appendChild(nodo('span', 'minijuego-charla-p', `${opcion.previa.porcentaje}% de ganar`));
      }
      if (indice < OPCIONES_CON_ATAJO) {
        marcarAtajo(boton, indice + 1);
        boton.setAttribute('aria-keyshortcuts', String(indice + 1));
      }
      boton.addEventListener('click', () => {
        renderPrevia(decision, estadoActual, { charla: opcion.charla });
        minijuegoWidget.innerHTML = '';
        montarMinijuego(opcion.charla);
      });
      eleccion.appendChild(boton);
    });
    minijuegoWidget.appendChild(eleccion);
    return;
  }
  montarMinijuego(false);

  // K6a-U ("hacés un clic y perdiste", y peor, con cero clics): el minijuego NO arranca solo. Mostraba la carta y los
  // blancos de 900 ms ya corrían mientras el jugador leía la consigna. Ahora la consigna queda a la vista y el reloj
  // espera un botón (o la tecla V); el minijuego se monta recién con el clic.
  function montarMinijuego(charla) {
    minijuegoWidget.innerHTML = '';
    const espera = nodo('div', 'minijuego-espera');
    const nota = nodo('p', 'minijuego-espera-nota', 'El reloj no arranca hasta que toques el botón.');
    const boton = nodo('button', 'minijuego-espera-boton');
    boton.type = 'button';
    boton.dataset.vamos = '';
    boton.setAttribute('aria-keyshortcuts', TECLA_VAMOS);
    boton.append(nodo('span', 'minijuego-espera-texto', '¡Vamos!'), crearTecla(TECLA_VAMOS));
    boton.addEventListener('click', () => {
      // La fase pasa a `juego` YA: con la tecla V sostenida, el segundo `keydown` ya no es de la previa.
      contenedor.dataset.fase = 'juego';
      // El arranque va en el turno siguiente: con Enter, el mismo `keydown` que apretó el botón llegaría al
      // listener de teclado que el minijuego instala al montarse y contaría como una jugada.
      setTimeout(() => arrancarMinijuego(charla), 0);
    }, { once: true });
    espera.append(boton, nota);
    minijuegoWidget.appendChild(espera);
  }

  function arrancarMinijuego(charla) {
    contenedor.dataset.fase = 'juego';
    minijuegoWidget.innerHTML = '';
    const montar = montadorDe(decision.datos.minijuego);
    let resuelto = false;
    mesa?.alJugar?.();
    montar(minijuegoWidget, estadoActual, (resultado, detalle) => {
      if (resuelto) {
        return;
      }
      resuelto = true;
      contenedor.dataset.fase = 'resultado';
      const respuesta = {
        resultado,
        ...(decision.datos.charla?.disponible ? { charla } : {}),
        ...(g1?.poder ? { poder: poderActivo } : {})
      };
      if (g1) {
        // la final con las manos: el juicio al toque, con la cuenta del motor; el mapa queda escrito en la tira
        const juicio = G1.juzgar(resultado, g1, poderActivo);
        if (juicio.paso) marcarHit(minijuegoWidget);
        else if (!juicio.casi) marcarMiss(minijuegoWidget);
        marcarMapaG1(camino, juicio.clave);
        mesa?.alTerminar?.(juicio);
        minijuegoWidget.replaceChildren(crearVeredictoG1(decision, estadoActual, { resultado, detalle, juicio, poderActivo }));
        setTimeout(() => responder(respuesta), LECTURA_VEREDICTO_G1_MS);
        return;
      }
      // K2d: la p final del mapa, ya corrida por el minijuego: la que se tira.
      const previaFinal = renderPrevia(decision, estadoActual, { resultadoMinijuego: resultado, charla });
      // K4c-S (regla 15): la prueba decide el contrato, y la pantalla dice con qué probabilidad. K6c: la del amateur trae su vara
      // (`datos.vara`, de tu nivel contra el del club) y no tira dado: la pantalla dice "Te firman" o por cuánto no llegaste, con
      // la misma cuenta y la misma vara que el motor (`veredictoDeLaPrueba`). La del mercado sigue con su probabilidad.
      const conVara = decision.datos.momento === 'tryout' && decision.datos.vara !== undefined;
      const laPrueba = conVara ? veredictoDeLaPrueba(resultado, decision.datos.vara) : null;
      const pFirma = decision.datos.momento === 'tryout' && !conVara ? probabilidadDeFirmarTrasPrueba(resultado) : null;
      // K6c: con la vara el resultado ya está decidido: la frase sale de `veredictosConVara` del dato (sin el "si te firman" de
      // la prueba del mercado) y, si no llegaste, no hay frase: manda la línea de la vara.
      const v = veredictoDeMinijuego(decision.datos.minijuego, resultado, estadoActual, laPrueba ? { pasa: laPrueba.pasa } : {});
      if (resultado >= 0.67) marcarHit(minijuegoWidget);
      else if (resultado <= 0.33) marcarMiss(minijuegoWidget);
      minijuegoWidget.innerHTML =
        '<div class="minijuego-resultado minijuego-resultado--' + v.nivel + '">'
        + '<div class="minijuego-resultado-titulo">' + v.titulo + '</div>'
        + '<div class="minijuego-resultado-detalle">' + v.detalle + '</div>'
        // K2d: la misma p que muestra la tarjeta de la previa (que queda arriba del widget).
        + (previaFinal ? '<div class="minijuego-resultado-p">Con esto: ' + previaFinal.porcentaje + '% de ganar</div>' : '')
        + (pFirma !== null ? '<div class="minijuego-resultado-p">Con esto: ' + porcentaje(pFirma) + ' de que te firmen</div>' : '')
        + (laPrueba ? '<div class="minijuego-resultado-p minijuego-resultado-vara">' + (laPrueba.pasa
          ? (laPrueba.vara === 0
            // K6c-fix: con la vara en 0 tu nivel ya alcanzaba (la misma línea que el log de `resolverLaPrueba`).
            ? 'Te firman: con tu nivel, la vara era 0% (sacaste ' + laPrueba.sacaste + '%).'
            : 'Te firman: sacaste ' + laPrueba.sacaste + '% y la vara era ' + laPrueba.vara + '%.')
          : 'No llegaste: te faltó ' + laPrueba.falta + '% (sacaste ' + laPrueba.sacaste + '%, la vara era ' + laPrueba.vara + '%).') + '</div>' : '')
        + '</div>';
      setTimeout(() => responder(respuesta), LECTURA_VEREDICTO_MS);
    }, rngUi, { ...decision.datos, poderActivo });

    // El widget ya es más grande que la espera: si no entra, que se vea entero (el reloj corre).
    minijuegoWidget.scrollIntoView?.({ block: 'nearest' });
  }
}
