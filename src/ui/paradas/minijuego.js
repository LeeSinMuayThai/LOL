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
import { crearCaminoG1, crearMesaG1, marcarMapaG1, crearVeredictoG1, marcarPartidoSwiss, crearTandaG1 } from '../components/finales.js';
import { omitirDemoDeLaProxima } from '../arcade/kit.js';
import { tension } from '../sonido.js';

// La tecla de "¡Vamos!". Ningún minijuego la usa (Enter y Espacio sí, y un Enter sostenido se contaría como jugada).
const TECLA_VAMOS = 'V';
// Hasta cuántas opciones de la charla llevan atajo (las teclas 1-4 del teclado).
const OPCIONES_CON_ATAJO = 4;
// G1: lo que el veredicto de una final queda a la vista antes de que la parada se vaya (con el "tan cerca", hay una línea
// más que leer que en los 1600 ms de siempre).
const LECTURA_VEREDICTO_G1_MS = 2300;
// H3u: la transición entre los partidos de una tanda (el resultado del anterior y el rival que viene): 1,2 s como mucho.
const TRANSICION_TANDA_MS = 1100;
const TRANSICION_TANDA_REDUCIDA_MS = 500;

// H3k (PLANUI §0.10, "La salida"): el suspenso antes del sello. Una pista que se llena despacio (y frena al final) hasta lo que
// sacaste, con la vara marcada si la hay y el número que sube; recién después, el sello. Con motion reducido, un instante.
// El cierre corre por reloj además de por cuadros (G-fix G: con cuadros frenados `requestAnimationFrame` no llega).
const SUSPENSO_MS = 1300;
const SUSPENSO_REDUCIDO_MS = 300;
const PORCIENTO = 100;
function suspenso(widget, resultado, vara, alSellar) {
  const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const caja = nodo('div', 'mj-suspenso');
  caja.setAttribute('role', 'status');
  const pista = nodo('div', 'mj-suspenso-pista');
  const relleno = nodo('div', 'mj-suspenso-relleno');
  pista.append(relleno);
  if (vara !== null) {
    const linea = nodo('div', 'mj-suspenso-vara');
    linea.style.left = `${Math.min(1, vara) * PORCIENTO}%`;
    pista.append(linea);
  }
  const numero = nodo('div', 'mj-suspenso-numero', '0');
  caja.append(nodo('div', 'mj-suspenso-rotulo', vara !== null ? 'Midiendo contra la vara…' : 'Midiendo…'), pista, numero);
  widget.replaceChildren(caja);
  const dura = reducido ? SUSPENSO_REDUCIDO_MS : SUSPENSO_MS;
  if (!reducido) tension(dura / 1000);
  let sellado = false;
  const sellar = () => {
    if (sellado) return;
    sellado = true;
    alSellar();
  };
  const inicio = performance.now();
  const cuadro = (ahora) => {
    if (sellado) return;
    const u = Math.min(1, (ahora - inicio) / dura);
    const v = resultado * (reducido ? 1 : 1 - (1 - u) ** 3);
    relleno.style.width = `${v * PORCIENTO}%`;
    numero.textContent = String(Math.round(v * PORCIENTO));
    if (vara !== null) caja.toggleAttribute('data-supera', v >= vara);
    if (u < 1) requestAnimationFrame(cuadro);
    else sellar();
  };
  requestAnimationFrame(cuadro);
  setTimeout(sellar, dura + SUSPENSO_REDUCIDO_MS);
}

// H3k: la página del arcade (`arcade.html`, `ui/arcade/pagina.js`) monta la parada con el marco real: esta es su puerta, así
// el azar de la interfaz sigue entrando solo por acá.
export function montarEnArcade(contenedor, decision, { estado, azar, responder }) {
  montarParada(contenedor, decision, { estado, rngUi: azar, responder, renderPrevia: () => null, conCamino: false });
}

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
  // G1: el detalle de la jugada (dónde frenaste, a cuánto caíste) para la placa de cierre del mapa decisivo
  const registro = { detalle: null };
  montarParada(contenedor, decision, { estado, rngUi, responder, renderPrevia: pintarPrevia, registro });
  marcarFoco(contenedor.querySelector('#minijuegoTitle'));
  let transmision = null;
  return {
    async narrar(ctxNarracion) {
      if (decision.datos?.momento === 'mapa_decisivo') {
        const r = await narrarElDecisivo(contenedor, decision, { estado, previa, mundo, sonido, pintarPrevia, detalle: registro.detalle }, ctxNarracion);
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
async function narrarElDecisivo(contenedor, decision, { estado, previa, mundo, sonido, pintarPrevia, detalle = null }, ctx) {
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
    pMapa: mapa.p,
    detalle
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
// (`components/varaG1.js`) y el "tan cerca". La respuesta suma `poder` (contrato de G1).
// `nodos` (el stream la reusa): { titulo, desc, apuesta, widget }; por defecto, los del panel `#minijuego`.
export function montarParada(contenedor, decision, { estado, rngUi, responder, renderPrevia, nodos = null, conCamino = true, registro = null }) {
  const estadoActual = estado;
  const minijuegoTitle = nodos?.titulo ?? contenedor.querySelector('#minijuegoTitle');
  const minijuegoDesc = nodos?.desc ?? contenedor.querySelector('#minijuegoDesc');
  const minijuegoApuesta = nodos?.apuesta ?? contenedor.querySelector('#minijuegoApuesta');
  const minijuegoWidget = nodos?.widget ?? contenedor.querySelector('#minijuegoWidget');
  const g1 = decision.datos?.g1 ?? null;
  let poderActivo = false;
  // G1: la charla del coach elegida para este mapa (baja la vara; el juicio de la UI cuenta con ella, como el motor)
  let charlaElegida = false;
  const bajaCharla = () => (charlaElegida && decision.datos.charla?.disponible ? (decision.datos.charla.bajaVara ?? 0) : 0);
  const textosDeLaCharla = [];
  let camino = null;
  let mesa = null;
  // H3u: la tanda (el Swiss de a varios, el Play-In): un partido por mecánica, cada uno con su vara
  const tanda = g1 && decision.datos.tanda?.partidos?.length > 1 ? decision.datos.tanda : null;
  let tandaVista = null;

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
        // el poder (el escenario) también baja la vara: lo que dicen los botones de la charla cuenta con él
        textosDeLaCharla.forEach((pintar) => pintar());
      }
    });
    minijuegoWidget.before(mesa.nodo);
    if (tanda) {
      tandaVista = crearTandaG1(tanda);
      minijuegoWidget.before(tandaVista.nodo);
      mesa.fijarVara(tanda.partidos[0].vara);
    }
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
      if (g1) {
        // G1: la charla no mueve la p (el mapa lo decide el minijuego): baja la vara, y eso es lo que se ve, en las
        // unidades del minijuego ("la charla baja la vara: necesitás 3 de 5 ...")
        const efecto = nodo('span', 'minijuego-charla-p minijuego-charla-vara');
        boton.classList.add('minijuego-charla-opcion--vara');
        const pintar = () => {
          const baja = opcion.charla ? (decision.datos.charla.bajaVara ?? 0) : 0;
          const regla = G1.reglaDeVara(decision.datos.minijuego, G1.varaEfectiva(g1, poderActivo, baja), estadoActual, decision.datos);
          const enFrase = regla.charAt(0).toLowerCase() + regla.slice(1);
          // D122: la charla vale al menos una unidad de la regla (el motor la calcula así, `bajaDeCharla`): "con la charla: 2 de 4"
          efecto.textContent = opcion.charla ? `con la charla: ${enFrase}` : `sin la charla: ${enFrase}`;
        };
        pintar();
        textosDeLaCharla.push(pintar);
        boton.appendChild(efecto);
      } else if (opcion.previa) {
        boton.appendChild(nodo('span', 'minijuego-charla-p', `${opcion.previa.porcentaje}% de ganar`));
      }
      if (indice < OPCIONES_CON_ATAJO) {
        marcarAtajo(boton, indice + 1);
        boton.setAttribute('aria-keyshortcuts', String(indice + 1));
      }
      boton.addEventListener('click', () => {
        renderPrevia(decision, estadoActual, { charla: opcion.charla });
        charlaElegida = opcion.charla;
        mesa?.fijarCharla?.(opcion.charla);
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
    if (tanda) {
      arrancarTanda(charla);
      return;
    }
    const montar = montadorDe(decision.datos.minijuego);
    let resuelto = false;
    mesa?.alJugar?.();
    // el widget recibe `decision.datos` (el tono de la prensa, la `g1` de la final); con el poder activado, una copia que
    // lo dice (`poderActivo`: el VOD hace la ronda más lenta, `dificultadDe`)
    const jugar = (decision) => montar(minijuegoWidget, estadoActual, (resultado, detalle) => {
      if (resuelto) {
        return;
      }
      resuelto = true;
      if (registro) registro.detalle = detalle ?? null;
      contenedor.dataset.fase = 'resultado';
      if (g1) {
        const respuesta = { resultado, ...(decision.datos.charla?.disponible ? { charla } : {}), ...(g1.poder ? { poder: poderActivo } : {}) };
        // la final con las manos: el juicio al toque, con la cuenta del motor; el mapa queda escrito en la tira
        const juicio = G1.juzgar(resultado, g1, poderActivo, bajaCharla());
        // H3k: el suspenso va ANTES del sello (la medida sube hasta lo que sacaste, con la vara marcada)
        suspenso(minijuegoWidget, resultado, juicio.vara, () => {
          if (juicio.paso) marcarHit(minijuegoWidget);
          else if (!juicio.casi) marcarMiss(minijuegoWidget);
          marcarMapaG1(camino, juicio.clave);
          mesa?.alTerminar?.(juicio);
          minijuegoWidget.replaceChildren(crearVeredictoG1(decision, estadoActual, { resultado, detalle, juicio, poderActivo }));
          setTimeout(() => responder(respuesta), LECTURA_VEREDICTO_G1_MS);
        });
        return;
      }
      // H3k: también acá, el suspenso antes del veredicto
      suspenso(minijuegoWidget, resultado, null, () => {
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
        setTimeout(() => responder(decision.datos.charla?.disponible ? { resultado, charla } : { resultado }), 1600);
      });
    }, rngUi, decision.datos);
    jugar(g1 ? { ...decision, datos: { ...decision.datos, poderActivo, charlaActiva: charlaElegida } } : decision);

    // El widget ya es más grande que la espera: si no entra, que se vea entero (el reloj corre).
    minijuegoWidget.scrollIntoView?.({ block: 'nearest' });
  }

  // H3u: la tanda. Cada partido monta la mecánica de nuevo con su vara (la demo solo antes del primero); entre uno y otro, una
  // transición de poco más de un segundo con el resultado del anterior. Se corta al llegar a las victorias que pasan o a las
  // derrotas que dejan afuera. La respuesta es `{ resultados }`: el motor juzga cada partido con su vara.
  function arrancarTanda(charla) {
    const { partidos, victoriasParaPasar, derrotasParaQuedarAfuera } = tanda;
    const montar = montadorDe(decision.datos.minijuego);
    const resultados = [];
    let victorias = 0;
    let derrotas = 0;
    mesa?.alJugar?.();
    const jugarPartido = (i) => {
      contenedor.dataset.fase = 'juego';
      minijuegoWidget.innerHTML = '';
      const g1Partido = { ...g1, vara: partidos[i].vara };
      mesa?.fijarVara?.(partidos[i].vara);
      tandaVista.actual(i);
      if (i > 0) omitirDemoDeLaProxima();
      let resuelto = false;
      montar(minijuegoWidget, estadoActual, (resultado, detalle) => {
        if (resuelto) return;
        resuelto = true;
        resultados.push(resultado);
        if (registro) registro.detalle = detalle ?? null;
        const juicio = G1.juzgar(resultado, g1Partido, poderActivo, bajaCharla());
        if (juicio.paso) victorias += 1;
        else derrotas += 1;
        tandaVista.marcar(i, juicio.clave);
        marcarPartidoSwiss(camino, juicio.paso);
        const termina = victorias >= victoriasParaPasar || derrotas >= derrotasParaQuedarAfuera || i === partidos.length - 1;
        if (!termina) {
          transicionDeTanda(i + 2, partidos.length, tandaVista.rivalDe(i + 1), juicio.clave, () => jugarPartido(i + 1));
          return;
        }
        contenedor.dataset.fase = 'resultado';
        suspenso(minijuegoWidget, resultado, juicio.vara, () => {
          if (juicio.paso) marcarHit(minijuegoWidget);
          else if (!juicio.casi) marcarMiss(minijuegoWidget);
          mesa?.alTerminar?.(juicio);
          minijuegoWidget.replaceChildren(crearVeredictoG1(decision, estadoActual, { resultado, detalle, juicio, poderActivo }));
          const respuesta = { resultados, ...(decision.datos.charla?.disponible ? { charla } : {}), ...(g1.poder ? { poder: poderActivo } : {}) };
          setTimeout(() => responder(respuesta), LECTURA_VEREDICTO_G1_MS);
        });
      }, rngUi, { ...decision.datos, g1: g1Partido, poderActivo, charlaActiva: charlaElegida });
      minijuegoWidget.scrollIntoView?.({ block: 'nearest' });
    };
    jugarPartido(0);
  }

  // "Partido 2 de 3 · vs {rival}", con cómo salió el anterior.
  function transicionDeTanda(numero, total, rival, claveAnterior, siguiente) {
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const caja = nodo('div', 'mj-transicion');
    caja.setAttribute('role', 'status');
    caja.dataset.juicio = claveAnterior;
    caja.append(
      nodo('b', 'mj-transicion-previo', `Partido ${numero - 1}: ${G1.TITULO_JUICIO[claveAnterior]}`),
      nodo('span', 'mj-transicion-sig', `Partido ${numero} de ${total}${rival ? ` · vs ${rival}` : ''}`)
    );
    minijuegoWidget.replaceChildren(caja);
    setTimeout(siguiente, reducido ? TRANSICION_TANDA_REDUCIDA_MS : TRANSICION_TANDA_MS);
  }
}
