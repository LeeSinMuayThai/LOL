// El controlador (fase V, PLAN.md "V0 — El kernel"): hasta esta fase vivía
// entero como un `<script type="module">` de ~520 líneas dentro de
// `index.html`. `estado`/`rng`/`rngUi` seguían en un closure que no se
// exponía a propósito, con un costo ya medido: la dependencia se había
// invertido (`components/ficha.js` importaba `shell.js` para empujarle
// `state` al chrome global, porque era el único sitio fuera de este closure
// que lo tenía a mano). Acá `estado` pasa a vivir en un `store` (`core/store.js`)
// que sí se puede pasar a cualquier pantalla nueva — y con eso disponible,
// `actualizarTopbar`/`aplicarEstudio` se llaman desde acá, en el mismo punto
// donde se pinta la ficha, no desde adentro de la ficha.
//
// `index.html` sigue siendo el único lugar donde se declara el DOM del
// juego (regla de la fase T: "si algo de acá explota, el juego de abajo
// sigue jugable") — este módulo solo lo lee con `document.getElementById`,
// nunca lo construye.
import { MONTAR_MINIJUEGO, veredictoDeMinijuego, crearApuesta, marcarHit, marcarMiss } from './components/minijuegos/index.js';
import { iconoSonido } from './components/iconos.js';
import { actualizarTopbar, aplicarEstudio, limpiarEstudio } from './shell.js';
import { crearStore } from './core/store.js';
import {
  almacenamientoLocal, leerHistorial, guardarHistorial, agregarAlHistorial, entradaDeResultado,
  lineaDeHistorial, mejorDelDesafio, fechaUTC, desafioDeBusqueda
} from './resultado.js';
import { VERSION_JUEGO } from '../data/version.js';
import { iniciarDesafio } from '../core/desafio.js';
import { interpretarSeed } from '../core/numeros.js';
import { previaDeDecision } from '../core/previaDePartido.js';
import { probabilidadDeFirmarTrasPrueba, veredictoDeLaPrueba } from '../core/serie.js';
import { porcentaje } from '../core/formato.js';

export function iniciar() {
  const setupPanel = document.getElementById('setup');
  const carreraPanel = document.getElementById('carrera');
  const handleInput = document.getElementById('handleInput');
  const rolGrid = document.getElementById('rolGrid');
  const campeonGrid = document.getElementById('campeonGrid');
  const draftSlots = document.getElementById('draftSlots');
  // K4-C: el perfil se elige en el inicio (un control compacto, `screens/inicio.js`).
  const perfilGrid = document.getElementById('perfilGrid');
  const perfilTexto = document.getElementById('perfilTexto');
  const regionGrid = document.getElementById('regionGrid');
  const regionTexto = document.getElementById('regionTexto');
  const poolContador = document.getElementById('poolContador');
  const continuarDetalle = document.getElementById('continuarDetalle');

  const runButton = document.getElementById('run');
  const nuevaCarreraBtn = document.getElementById('nuevaCarrera');
  const fichaContainer = document.getElementById('fichaContainer');
  const summary = document.getElementById('summary');
  const metaPill = document.getElementById('metaPill');
  const logList = document.getElementById('logList');
  const decisionPanel = document.getElementById('decision');
  const decisionTitle = document.getElementById('decisionTitle');
  const decisionDesc = document.getElementById('decisionDesc');
  const decisionOptions = document.getElementById('decisionOptions');
  const minijuegoPanel = document.getElementById('minijuego');
  const previaEl = document.getElementById('previa');
  const minijuegoTitle = document.getElementById('minijuegoTitle');
  const minijuegoDesc = document.getElementById('minijuegoDesc');
  const minijuegoApuesta = document.getElementById('minijuegoApuesta');
  const minijuegoWidget = document.getElementById('minijuegoWidget');
  const mercadoPanel = document.getElementById('mercado');
  const mercadoTitle = document.getElementById('mercadoTitle');
  const mercadoDesc = document.getElementById('mercadoDesc');
  const mercadoGrid = document.getElementById('mercadoGrid');
  const mercadoVos = document.getElementById('mercadoVos');
  const mercadoMundo = document.getElementById('mercadoMundo');
  const mercadoRepresentante = document.getElementById('mercadoRepresentante');
  const mercadoEsperar = document.getElementById('mercadoEsperar');
  const tarjetaPanel = document.getElementById('tarjeta');
  const seedInput = document.getElementById('seedInput');
  const seedAviso = document.getElementById('seedAviso');
  // K6a-U: el aviso de "se está jugando el split" que ocupa el lugar de la decisión mientras el feed reproduce.
  const esperaEl = document.createElement('div');
  esperaEl.className = 'reproduciendo-aviso';
  esperaEl.setAttribute('role', 'status');
  esperaEl.textContent = 'Se está jugando el split… (Espacio para pasar las líneas más rápido)';
  esperaEl.hidden = true;
  decisionPanel.after(esperaEl);
  const continuarBtn = document.getElementById('continuarBtn');
  const desafioDia = document.getElementById('desafioDia');
  const historialEl = document.getElementById('historial');
  // El riel derecho (T5): un objeto solo, para pasarlo entero a
  // ui.renderRielContexto en cada tick — mismo patrón que
  // `carreraElements`.
  const rielElements = {
    panelTabla: document.getElementById('panelTabla'),
    panelCalendario: document.getElementById('panelCalendario'),
    panelPlantilla: document.getElementById('panelPlantilla'),
    panelMeta: document.getElementById('panelMeta'),
    panelGeneracion: document.getElementById('panelGeneracion'),
    panelTopMundial: document.getElementById('panelTopMundial')
  };
  const serieContextoEl = document.getElementById('serieContexto');
  const toggleVelocidad = document.getElementById('toggleVelocidad');
  const toggleSonido = document.getElementById('toggleSonido');

  // H7 de la revisión de K0-B: en un celular la topbar se parte en 2 filas (o 3
  // en 320px) según el ancho y el largo del texto de estado, así que su alto no
  // es un número que el CSS pueda saber: la ficha pegajosa (`.riel`, ≤899px) se
  // colgaba de 56px y la topbar le tapaba de 8 a 30px del borde al scrollear.
  // Se publica el alto REAL como `--topbar-alto-real` y el CSS lo usa (con el
  // token fijo de respaldo si esto no corre, p. ej. sin ResizeObserver).
  const topbarEl = document.querySelector('.topbar');
  if (topbarEl && typeof ResizeObserver !== 'undefined') {
    const publicarAltoDeLaTopbar = () => {
      document.documentElement.style.setProperty('--topbar-alto-real', `${topbarEl.getBoundingClientRect().height}px`);
    };
    new ResizeObserver(publicarAltoDeLaTopbar).observe(topbarEl);
    publicarAltoDeLaTopbar();
  }

  // El contrato de elementos que `src/ui/render.js` necesita para pintar
  // la pantalla de carrera y la de decisión (fase 8, §8.5; fase 9c suma
  // la pantalla de ofertas).
  const carreraElements = { fichaContainer, logList };
  const decisionElements = { decisionPanel, decisionTitle, decisionDesc, decisionOptions };
  const mercadoElements = { mercadoPanel, mercadoTitle, mercadoDesc, mercadoVos, mercadoGrid, mercadoMundo, mercadoRepresentante, mercadoEsperar };

  let modulos = null;
  let ui = null;
  let reproductor = null;
  let sonido = null;
  let almacenamiento = null;
  let pantallaInicio = null;
  // Fase T3: bloquea que avanzar()/responder() se disparen dos veces en
  // paralelo mientras el reproductor está a mitad de una tanda de beats
  // (dos clicks rápidos, una tecla repetida). `correrSplits()` es el
  // núcleo sin guardia — lo llaman los dos wrappers de afuera.
  let reproduciendo = false;
  // El store (fase V, "V0 — El kernel"): la única vía por la que una
  // pantalla nueva ve `state`. Arranca en `null` — nada lo lee hasta que
  // `comenzarCarrera`/`continuarCarrera` escriben el primer estado real,
  // igual que el `estado = null` que reemplaza.
  const store = crearStore(null);
  let rng = null;
  // Regla invariable 1: los minijuegos tampoco pueden usar el azar del
  // navegador. Stream PROPIO, sembrado desde la misma seed pero separado del
  // rng del motor: si comieran del stream principal, el navegador (que juega
  // los minijuegos) y `simulate.js` (que resuelve por `resolverAuto` y nunca
  // los monta) divergirian para la misma seed, y una seed compartida dejaria
  // de reproducir la carrera. Asi el mundo sale igual en los dos lados y los
  // minijuegos siguen siendo deterministas (trampa T1).
  let rngUi = null;

  async function cargarModulos() {
    if (!modulos) {
      const [
        { mulberry32 }, { createInitialState, regionesDeOrigen }, pipeline, { BALANCE },
        rolesModulo, ranked, { describirContexto }, formato, campeonesModulo, render,
        reproductorModulo, sonidoModulo, almacenamientoModulo, perfilModulo, { textoDePlanInicial }
      ] = await Promise.all([
        import('../core/rng.js'),
        import('../core/state.js'),
        import('../core/pipeline.js'),
        import('../data/balance.js'),
        import('../data/roles.js'),
        import('../core/ranked.js'),
        import('../core/contexto.js'),
        import('../core/formato.js'),
        import('../data/champions.json', { with: { type: 'json' } }),
        import('./render.js'),
        import('./reproductor.js'),
        import('./sonido.js'),
        import('./almacenamiento.js'),
        import('../core/perfil.js'),
        import('../core/rutinas.js')
      ]);
      modulos = {
        mulberry32, createInitialState, pipeline, BALANCE, formato,
        etiquetaRol: rolesModulo.etiquetaRol, ROLES: rolesModulo.ROLES,
        atributosClave: rolesModulo.atributosClave, IDS_ROL: rolesModulo.IDS_ROL,
        ranked, describirContexto,
        CAMPEONES: campeonesModulo.default,
        IDS_PERFIL: perfilModulo.IDS_PERFIL, nombreDePerfil: perfilModulo.nombreDePerfil,
        descripcionDePerfil: perfilModulo.descripcionDePerfil,
        soloQDePerfil: perfilModulo.soloQDePerfil,
        // K4c (plan anual): la línea del plan de práctica del primer año (sale del perfil).
        textoDePlanInicial,
        // K5-B: las regiones elegibles con su línea de dificultad (sale de `leagues.json`).
        REGIONES_DE_ORIGEN: regionesDeOrigen()
      };
      ui = render;
      reproductor = reproductorModulo;
      sonido = sonidoModulo;
      almacenamiento = almacenamientoModulo;
    }
    return modulos;
  }

  // Los 5 minijuegos (fase 4) se migraron a
  // `src/ui/components/minijuegos/` en la fase T6 — PLAN.md §8.5 los
  // dejó sin mover a propósito "porque la fase 12 les cambia la
  // presentación". Import estático: son livianos y no necesitan el
  // manejo de error de `cargarModulos()` (esa ruta existe por si
  // `location.protocol === 'file:'`, que ya rompe mucho antes).
  function mostrarMinijuego(decision) {
    const estadoActual = store.leer();
    decisionPanel.hidden = true;
    mercadoPanel.hidden = true;
    minijuegoPanel.hidden = false;
    minijuegoTitle.textContent = decision.titulo;
    minijuegoDesc.textContent = decision.descripcion;
    // Fase 9R4d: qué se juega, ANTES de jugarlo.
    minijuegoApuesta.replaceChildren(crearApuesta(decision, estadoActual));
    minijuegoWidget.innerHTML = '';

    // K4-B: en el mapa decisivo, si te queda la charla del coach de la temporada, se elige antes de jugar: cada botón
    // dice con cuánto llegás (la previa de arriba cambia con la elección, y es la p que se tira).
    if (decision.datos.charla?.disponible) {
      const conCharla = previaDeDecision(estadoActual, decision, { charla: true });
      const sinCharla = previaDeDecision(estadoActual, decision, { charla: false });
      const eleccion = document.createElement('div');
      eleccion.className = 'minijuego-charla';
      const pregunta = document.createElement('p');
      pregunta.className = 'minijuego-charla-pregunta';
      pregunta.textContent = 'Te queda la charla del coach de esta temporada. ¿La usa antes de este mapa?';
      eleccion.appendChild(pregunta);
      [
        { charla: true, label: 'Que hable el coach ahora', previa: conCharla },
        { charla: false, label: 'Guardarla para después', previa: sinCharla }
      ].forEach((opcion) => {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'option-btn';
        boton.textContent = opcion.previa ? `${opcion.label} · ${opcion.previa.porcentaje}% de ganar` : opcion.label;
        boton.addEventListener('click', () => {
          pintarPrevia(decision, estadoActual, { charla: opcion.charla });
          minijuegoWidget.innerHTML = '';
          montarMinijuego(decision, estadoActual, opcion.charla);
        });
        eleccion.appendChild(boton);
      });
      minijuegoWidget.appendChild(eleccion);
      ui.renderLowerThird(summary, metaPill, estadoActual, { modo: 'minijuego' });
      return;
    }
    montarMinijuego(decision, estadoActual, false);
  }

  // K6a-U ("hacés un clic y perdiste", y peor, con cero clics): el minijuego NO arranca solo. Mostraba la carta y los
  // blancos de 900 ms ya corrían mientras el jugador leía la consigna. Ahora la consigna queda a la vista y el reloj
  // espera un botón; el minijuego se monta recién con el clic.
  function montarMinijuego(decision, estadoActual, charla) {
    minijuegoWidget.innerHTML = '';
    const espera = document.createElement('div');
    espera.className = 'minijuego-espera';
    const nota = document.createElement('p');
    nota.className = 'minijuego-espera-nota';
    nota.textContent = 'Leé la consigna. El reloj no arranca hasta que toques el botón.';
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'option-btn minijuego-espera-boton';
    boton.textContent = '¡Vamos!';
    boton.addEventListener('click', () => {
      // El arranque va en el turno siguiente: con Enter, el mismo `keydown` que apretó el botón llegaría al
      // listener de teclado que el minijuego instala al montarse y contaría como una jugada.
      setTimeout(() => arrancarMinijuego(decision, estadoActual, charla), 0);
    }, { once: true });
    espera.append(nota, boton);
    minijuegoWidget.appendChild(espera);
    ui.renderLowerThird(summary, metaPill, estadoActual, { modo: 'minijuego' });
    traerAlaVista(minijuegoWidget);
  }

  // El panel del minijuego puede montarse con la página scrolleada al feed: sin esto el reloj corría fuera de vista.
  function traerAlaVista(elemento) {
    elemento.scrollIntoView?.({ block: 'nearest' });
  }

  function arrancarMinijuego(decision, estadoActual, charla) {
    minijuegoWidget.innerHTML = '';
    const montar = MONTAR_MINIJUEGO[decision.datos.minijuego];
    let resuelto = false;
    montar(minijuegoWidget, estadoActual, (resultado) => {
      if (resuelto) {
        return;
      }
      resuelto = true;
      // K2d: la p final del mapa, ya corrida por el minijuego: la que se tira.
      const previaFinal = pintarPrevia(decision, estadoActual, { resultadoMinijuego: resultado, charla });
      const v = veredictoDeMinijuego(decision.datos.minijuego, resultado, estadoActual);
      // K4c-S (regla 15): la prueba decide el contrato, y la pantalla dice con qué probabilidad. K6c: la del amateur trae su vara
      // (`datos.vara`) y no tira dado: la pantalla dice "Te firman" o por cuánto no llegaste, con la misma cuenta que el motor
      // (`veredictoDeLaPrueba`). La del mercado sigue con su probabilidad.
      const conVara = decision.datos.momento === 'tryout' && decision.datos.vara !== undefined;
      const laPrueba = conVara ? veredictoDeLaPrueba(resultado) : null;
      const pFirma = decision.datos.momento === 'tryout' && !conVara ? probabilidadDeFirmarTrasPrueba(resultado) : null;
      if (resultado >= 0.67) marcarHit(minijuegoWidget);
      else if (resultado <= 0.33) marcarMiss(minijuegoWidget);
      minijuegoWidget.innerHTML =
        '<div class="minijuego-resultado minijuego-resultado--' + v.nivel + '">'
        + '<div class="minijuego-resultado-titulo">' + v.titulo + '</div>'
        // K6c: si no llegaste a la vara, la frase del dato ("si te firman, entrás debiendo algo") no aplica: manda la línea de la vara.
        + '<div class="minijuego-resultado-detalle">' + (laPrueba && !laPrueba.pasa ? '' : v.detalle) + '</div>'
        // K2d: la misma p que muestra la tarjeta de la previa (que queda arriba del widget).
        + (previaFinal ? '<div class="minijuego-resultado-p">Con esto: ' + previaFinal.porcentaje + '% de ganar</div>' : '')
        + (pFirma !== null ? '<div class="minijuego-resultado-p">Con esto: ' + porcentaje(pFirma) + ' de que te firmen</div>' : '')
        + (laPrueba ? '<div class="minijuego-resultado-p minijuego-resultado-vara">' + (laPrueba.pasa
          ? 'Te firman: sacaste ' + laPrueba.sacaste + '% y la vara era ' + laPrueba.vara + '%.'
          : 'No llegaste: te faltó ' + laPrueba.falta + '% (sacaste ' + laPrueba.sacaste + '%, la vara era ' + laPrueba.vara + '%).') + '</div>' : '')
        + '</div>';
      ui.renderLowerThird(summary, metaPill, estadoActual, { modo: 'minijuego' });
      setTimeout(() => responder(decision.datos.charla?.disponible ? { resultado, charla } : { resultado }), 1600);
    }, rngUi);

    ui.renderLowerThird(summary, metaPill, estadoActual, { modo: 'minijuego' });
    traerAlaVista(minijuegoWidget);
  }

  // K2d: la previa solo muestra (sin `rng`, sin tocar el estado). `null` si la
  // pausa no es antes de un partido: la tarjeta se esconde.
  function pintarPrevia(decision, estado, opciones = {}) {
    let previa = null;
    try {
      previa = decision ? previaDeDecision(estado, decision, opciones) : null;
    } catch (error) {
      console.error('No se pudo armar la previa:', error);
    }
    ui.renderPrevia(previaEl, previa);
    return previa;
  }

  function mostrarDecision(decision) {
    const estadoActual = store.leer();
    const previa = pintarPrevia(decision, estadoActual);
    if (decision.presentacion === 'minijuego') {
      mostrarMinijuego(decision);
      return;
    }

    minijuegoPanel.hidden = true;

    if (decision.presentacion === 'mercado') {
      decisionPanel.hidden = true;
      ui.mostrarMercadoEnPantalla(
        mercadoElements, decision, responder,
        () => responder({ representante: true }),
        responder,
        () => responder({ negociar: 'esperar' })
      );
      ui.renderLowerThird(summary, metaPill, estadoActual, { modo: 'mercado', decision });
      return;
    }

    mercadoPanel.hidden = true;
    ui.mostrarDecisionEnPantalla(decisionElements, decision, responder, estadoActual, previa?.opciones);
    ui.renderLowerThird(summary, metaPill, estadoActual, { modo: 'decision', decision });
  }

  // K1-B: la carrera terminada entra al historial local UNA vez (el resumen se
  // puede pintar dos veces con el mismo estado) y la tarjeta recibe la línea
  // contra tu marca. Si el `localStorage` falla, la tarjeta sale sin esa línea.
  let estadoEnHistorial = null;
  let lineaDelHistorial = null;

  function registrarEnHistorial(state) {
    if (!state.tarjeta?.puntaje) {
      return null;
    }
    if (estadoEnHistorial === state) {
      return lineaDelHistorial;
    }
    estadoEnHistorial = state;
    const almacen = almacenamientoLocal();
    const previo = leerHistorial(almacen);
    const entrada = entradaDeResultado(state, fechaUTC(new Date()));
    // Sin historial que funcione no hay "tu mejor" que decir (ni "primer intento").
    const guardado = guardarHistorial(almacen, agregarAlHistorial(previo, entrada));
    lineaDelHistorial = guardado ? lineaDeHistorial(previo, entrada) : null;
    return lineaDelHistorial;
  }

  function renderResumenFinal(state) {
    ui.renderLowerThird(summary, metaPill, state);

    if (state.terminado && state.tarjeta) {
      decisionPanel.hidden = true;
      minijuegoPanel.hidden = true;
      mercadoPanel.hidden = true;
      previaEl.hidden = true;
      logList.hidden = true;
      serieContextoEl.hidden = true;
      ui.renderTarjeta(tarjetaPanel, state, modulos, { lineaHistorial: registrarEnHistorial(state) });
    }
  }

  // K1-B: el desafío del día y tus últimos resultados. La fecha la lee la UI
  // (el motor no toca el reloj); `?desafio=YYYY-MM-DD` válida precarga ese
  // desafío y no arranca solo, igual que `?seed=`.
  function renderInicioK1() {
    const hoy = fechaUTC(new Date());
    const fecha = desafioDeBusqueda(location.search) ?? hoy;
    const historial = leerHistorial(almacenamientoLocal());
    ui.renderDesafio(desafioDia, { fecha, hoy, mejor: mejorDelDesafio(historial, fecha) }, comenzarCarrera);
    ui.renderHistorial(historialEl, historial, { etiquetaRol: modulos.etiquetaRol, version: VERSION_JUEGO });
  }

  // Saneamiento post-V1: el chrome global (topbar, luz de estudio, riel,
  // contexto de serie) se pintaba con el mismo bloque de 5 líneas copiado en
  // `revelarYVerDecision`, al final de `correrSplits` y en `continuarCarrera`
  // — exactamente la clase de copia que dejó pasar D45. No se resuelve
  // cableando `store.suscribir` (V0 lo declaró para V2/V3, mismo criterio
  // que `crearDelta`, todavía sin consumidor): un suscriptor único no puede
  // servir a la vez el camino de acá (`renderFicha` solo, el feed lo revela
  // `reproductor.reproducirBeats` línea a línea) y el de cierre/resume
  // (`renderCarrera`, ficha+feed de una) sin duplicar pintado o adelantarse
  // a la animación del feed. `ficha` es el valor que devuelve `renderFicha`
  // (directo o vía `renderCarrera`, que lo reexporta) — ninguna de las dos
  // llamadas necesita recalcularlo.
  function pintarChrome(ficha, estado) {
    actualizarTopbar(estado);
    aplicarEstudio(estado, ficha);
    ui.renderRielContexto(rielElements, estado, modulos);
    ui.renderSerieContexto(serieContextoEl, estado);
  }

  // Fase T3: antes, `pintar()` volcaba `state.logs` entero de un saque
  // (`renderCarrera` → `renderFeed` → `replaceChildren`). Ahora la ficha
  // sigue siendo instantánea (es un HUD, no un beat) pero el feed se
  // revela de a una línea por `reproductor.reproducirBeats` — mismo
  // `estado`, mismo motor, solo cambia CUÁNDO entra cada línea al DOM.
  async function revelarYVerDecision(logsAntes, registroAntes) {
    const estadoActual = store.leer();
    // V0: el chrome global se actualiza desde acá, no desde adentro de
    // `renderFicha` — es la inversión que arregla esa subfase.
    const ficha = ui.renderFicha(fichaContainer, estadoActual, modulos);
    pintarChrome(ficha, estadoActual);
    const bisagra = estadoActual.pendiente?.decision?.datos?.evento?.bisagra ?? false;
    // K6a-U: mientras el feed reproduce el panel de decisión no está (por diseño: el split se cuenta antes de la próxima
    // parada), y en la ventana de retiro, que vuelve a preguntar cada split, parecía que el clic se había ignorado. Ahora
    // se ve que está esperando, y cómo saltarlo.
    esperaEl.hidden = false;
    try {
      await reproductor.reproducirBeats(logList, estadoActual.logs.slice(logsAntes), {
        registroAntes, registroDespues: estadoActual.career.registro, bisagra, state: estadoActual, offset: logsAntes
      });
    } finally {
      esperaEl.hidden = true;
    }

    // Fase T8 (P.2): se guarda al cerrar cada split, siga de largo o
    // pare en una decisión — las dos son "una pausa" desde el punto de
    // vista de "¿qué pasa si recargás acá?". Si ya terminó no hay nada
    // que continuar: se borra en vez de dejar un guardado que
    // apuntaría a un `estado.terminado`.
    if (estadoActual.terminado) {
      almacenamiento.borrarCarreraGuardada();
    } else {
      almacenamiento.guardarCarrera(estadoActual, rng, rngUi);
    }

    if (estadoActual.pendiente) {
      mostrarDecision(estadoActual.pendiente.decision);
      return true;
    }
    ui.renderLowerThird(summary, metaPill, estadoActual);
    return false;
  }

  // El núcleo sin guardia: lo llaman `avanzar()` y, al final de su
  // propia tanda, `responder()` — directo, no a través de `avanzar()`,
  // para no chocar con la guardia de `reproduciendo` (ver la constante).
  async function correrSplits() {
    const { pipeline, BALANCE } = modulos;

    for (let pasos = 0; pasos < BALANCE.partida.maxSplitsDeSeguridad; pasos += 1) {
      const antes = store.leer();
      const logsAntes = antes.logs.length;
      const registroAntes = antes.career.registro;
      store.escribir(pipeline.avanzarSplit(antes, rng).state);

      if (await revelarYVerDecision(logsAntes, registroAntes)) {
        return;
      }
      if (store.leer().terminado) {
        break;
      }
    }

    const estadoFinal = store.leer();
    const ficha = ui.renderCarrera(carreraElements, estadoFinal, modulos);
    pintarChrome(ficha, estadoFinal);
    renderResumenFinal(estadoFinal);
    nuevaCarreraBtn.hidden = false;
  }

  async function avanzar() {
    if (reproduciendo) return;
    reproduciendo = true;
    try {
      await correrSplits();
    } finally {
      reproduciendo = false;
    }
  }

  async function responder(respuesta) {
    if (reproduciendo) return;
    reproduciendo = true;
    try {
      const { pipeline } = modulos;
      decisionPanel.hidden = true;
      minijuegoPanel.hidden = true;
      mercadoPanel.hidden = true;
      pintarPrevia(null);

      const antes = store.leer();
      const logsAntes = antes.logs.length;
      const registroAntes = antes.career.registro;
      store.escribir(pipeline.resolverDecision(antes, respuesta, rng).state);

      if (await revelarYVerDecision(logsAntes, registroAntes)) {
        return;
      }
      const despues = store.leer();
      if (despues.terminado) {
        renderResumenFinal(despues);
        nuevaCarreraBtn.hidden = false;
        return;
      }

      await correrSplits();
    } finally {
      reproduciendo = false;
    }
  }

  // Fase T8 (P.3): `?seed=N` en la URL precarga el input, para que
  // "copiar link de esta carrera" (T7) de verdad reproduzca la misma
  // carrera al abrirlo — antes de esta fase `leerSeed()` solo miraba
  // el input y el link no hacía nada al visitarlo.
  // K6a-U: un texto en `?seed=` (o en el input) ya no se ignora: `interpretarSeed` (core/numeros.js) lo pasa por el hash
  // del motor y `pintarAvisoDeSeed` dice qué número quedó. Un número sigue siendo la seed de siempre.
  function leerSeedDeUrl() {
    const crudo = new URLSearchParams(location.search).get('seed');
    return crudo === null ? null : crudo;
  }

  function leerSeed() {
    return interpretarSeed(seedInput.value).seed ?? (Date.now() >>> 0);
  }

  function pintarAvisoDeSeed() {
    if (!seedAviso) {
      return;
    }
    const { seed, desdeTexto } = interpretarSeed(seedInput.value);
    seedAviso.textContent = desdeTexto
      ? `"${seedInput.value.trim()}" no es un número: la seed que queda es ${seed}. Con el mismo texto sale siempre la misma carrera.`
      : '';
  }

  function revelarEscenario() {
    setupPanel.hidden = true;
    carreraPanel.hidden = false;
    carreraPanel.classList.remove('escenario-entrar');
    void carreraPanel.offsetWidth;
    carreraPanel.classList.add('escenario-entrar');
  }

  // El aviso de "tu guardado no se pudo recuperar" (K.7 riesgo 3: un guardado
  // que no se puede cargar se descarta CON aviso, no se carga a medias ni se
  // deja un "Continuar" que no hace nada). Vive arriba de todo en el setup:
  // pegado al footer quedaba a más de dos pantallas de scroll en un celular
  // (y debajo del pliegue en escritorio), o sea que el jugador no lo veía. Se
  // saca apenas hay una carrera nueva: si no, reaparecía cada vez que se
  // volvía al inicio aunque el guardado roto ya no existiera (H6).
  const TEXTO_AVISO_DE_GUARDADO = 'Tu partida guardada no se pudo recuperar (era de una versión anterior del juego o estaba dañada).';

  function quitarAvisoDeGuardado() {
    setupPanel.querySelector('.setup-aviso')?.remove();
  }

  function mostrarAvisoDeGuardado() {
    if (setupPanel.querySelector('.setup-aviso')) {
      return;
    }
    const aviso = document.createElement('p');
    aviso.className = 'setup-aviso';
    aviso.setAttribute('role', 'status');
    aviso.textContent = TEXTO_AVISO_DE_GUARDADO;
    const subtitulo = setupPanel.querySelector('.subtitle');
    if (subtitulo) {
      subtitulo.before(aviso);
    } else {
      setupPanel.prepend(aviso);
    }
  }

  // `fechaDesafio` (K1-B): con una fecha, la carrera es el desafío de ese día —
  // seed, rol, región y pool salen de la fecha (`iniciarDesafio`), sin handle
  // ni draft. Sin fecha, la carrera de siempre con lo elegido en el inicio.
  async function comenzarCarrera(fechaDesafio = null) {
    quitarAvisoDeGuardado();
    runButton.disabled = true;
    for (const boton of desafioDia.querySelectorAll('button')) {
      boton.disabled = true;
    }
    decisionPanel.hidden = true;
    minijuegoPanel.hidden = true;
    mercadoPanel.hidden = true;
    previaEl.hidden = true;
    tarjetaPanel.hidden = true;
    tarjetaPanel.replaceChildren();
    nuevaCarreraBtn.hidden = true;
    summary.hidden = false;
    metaPill.hidden = false;
    logList.hidden = false;
    summary.textContent = 'Arrancando la carrera...';
    metaPill.textContent = '';
    logList.innerHTML = '';

    try {
      const { mulberry32, createInitialState } = await cargarModulos();

      // H8 (saneamiento post-V1): `logList.innerHTML = ''` (más arriba)
      // vacía el DOM pero no el mapa de `reconciliar.js` — sin este olvido,
      // sus claves (índices absolutos de `state.logs`, que una carrera
      // nueva vuelve a numerar desde 0) reengancharían nodos desprendidos
      // de la carrera anterior en el primer `renderFeed` de esta.
      ui.olvidarContenedor(logList);

      let seed;
      let eleccion = null;
      let desafio = null;
      if (fechaDesafio) {
        ({ seed, eleccion, desafio } = iniciarDesafio(fechaDesafio));
      } else {
        seed = leerSeed();
        // El input queda con el número que se usó (un texto ya es su hash): es el que va en el link y en la tarjeta.
        seedInput.value = String(seed);
        pintarAvisoDeSeed();
        // La elección de la pantalla de inicio entra como tercer argumento.
        // Si el jugador no eligió nada (camino headless), `createInitialState`
        // sortea todo de la seed exactamente como antes.
        // K5-B: la región también (`null` = la sortea la seed). El desafío diario no pasa por acá.
        const { rol, campeones, perfil, region } = pantallaInicio.getSeleccion();
        eleccion = { handle: handleInput.value, rol, campeones, perfil, regionOrigen: region };
      }
      rng = mulberry32(seed);
      rngUi = mulberry32((seed ^ 0x9E3779B9) >>> 0);
      store.escribir(createInitialState(seed, rng, eleccion, desafio));

      // "Empezar carrera" es una carrera NUEVA — pisa cualquier
      // guardado anterior a propósito, mismo criterio que un jugador
      // que dice "no, esta la abandono" en vez de tocar Continuar.
      almacenamiento.borrarCarreraGuardada();

      revelarEscenario();

      // `avanzar()` es async desde la fase T3 (el reproductor pausa
      // entre beats): si no se espera acá, un error en el primer split
      // se pierde como rechazo de promesa sin manejar en vez de caer en
      // este catch.
      await avanzar();
    } catch (error) {
      const esArchivoLocal = location.protocol === 'file:';
      summary.textContent = esArchivoLocal
        ? 'Este juego usa módulos ES y no puede correr abriendo el HTML directo con doble clic.'
        : 'No se pudo cargar el juego.';
      metaPill.textContent = esArchivoLocal
        ? 'Corré "npm start" en la terminal y abrí la URL que te muestra (http://localhost:8000).'
        : 'Revisa la consola del navegador.';
      logList.innerHTML = `<div class="log-item">${error.message}</div>`;
      console.error(error);
      setupPanel.hidden = false;
      carreraPanel.hidden = true;
      runButton.disabled = false;
      for (const boton of desafioDia.querySelectorAll('button')) {
        boton.disabled = false;
      }
    }
  }

  function volverAlInicio() {
    carreraPanel.hidden = true;
    setupPanel.hidden = false;
    nuevaCarreraBtn.hidden = true;
    // Los paneles del riel derecho (T5) quedan con el `hidden` de la
    // última carrera terminada — sin esto, la columna entera se queda
    // desplegada con datos viejos mientras el setup está arriba.
    for (const panel of Object.values(rielElements)) {
      panel.hidden = true;
    }
    serieContextoEl.hidden = true;
    fichaContainer.replaceChildren();
    limpiarEstudio();
    // Ya se borró en `revelarYVerDecision` cuando `estado.terminado`
    // se puso en true — esto es la red de seguridad, no el borrado
    // principal. Refresca el botón por si el estado cambió mientras
    // tanto (debería estar oculto: no queda nada que continuar).
    almacenamiento.borrarCarreraGuardada();
    continuarBtn.hidden = true;
    quitarAvisoDeGuardado();
    pantallaInicio.reset();
    renderInicioK1();
  }

  // Fase T3: refleja el estado de `reproductor`/`sonido` en los dos
  // toggles del topbar. Se llama al cargar los módulos y en cada click.
  function actualizarTogglesTopbar() {
    toggleVelocidad.textContent = reproductor.labelVelocidad();
    toggleVelocidad.title = `Velocidad del reproductor: ${reproductor.labelVelocidad()} (click para cambiar)`;
    const on = sonido.estaHabilitado();
    toggleSonido.replaceChildren(iconoSonido(on));
    toggleSonido.setAttribute('aria-pressed', on ? 'true' : 'false');
    toggleSonido.title = on ? 'Sonido activado (click para apagar)' : 'Sonido apagado (click para activar)';
  }

  // Fase T8 (P.2): retoma exactamente donde quedó — mismo `rng`/`rngUi`
  // restaurados a su posición exacta (core/rng.js `.restaurar()`), no
  // una carrera nueva con la misma seed. Si hay una decisión pendiente
  // se muestra tal cual; si no, `avanzar()` sigue de largo, mismo
  // camino que arrancar una carrera nueva.
  async function continuarCarrera() {
    continuarBtn.disabled = true;
    try {
      const { mulberry32 } = await cargarModulos();
      const datos = almacenamiento.cargarCarreraGuardada();
      if (!datos) {
        // El guardado cambió desde que se mostró el botón (otra pestaña, o ya
        // no se puede leer): mismo trato que al cargar la página.
        almacenamiento.borrarCarreraGuardada();
        continuarBtn.hidden = true;
        mostrarAvisoDeGuardado();
        return;
      }

      rng = mulberry32(datos.seed);
      rng.restaurar(datos.rngEstado);
      rngUi = mulberry32((datos.seed ^ 0x9E3779B9) >>> 0);
      if (datos.rngUiEstado !== null) {
        rngUi.restaurar(datos.rngUiEstado);
      }
      store.escribir(datos.state);
      const estadoRetomado = store.leer();
      seedInput.value = String(datos.seed);

      revelarEscenario();
      nuevaCarreraBtn.hidden = true;

      // D45: esto llamaba solo a `ui.renderFicha`, así que `#logList`
      // arrancaba vacío al retomar (nunca se llamaba a `renderFeed`) — y se
      // quedaba vacío indefinidamente si además había una decisión
      // pendiente, porque nada más lo iba a pintar. `renderCarrera` pinta
      // ficha + feed juntas, el mismo camino que ya usa `correrSplits`.
      const ficha = ui.renderCarrera(carreraElements, estadoRetomado, modulos);
      pintarChrome(ficha, estadoRetomado);
      ui.renderLowerThird(summary, metaPill, estadoRetomado);

      if (estadoRetomado.pendiente) {
        mostrarDecision(estadoRetomado.pendiente.decision);
      } else {
        await avanzar();
      }
    } catch (error) {
      // H6/H5 de la revisión de K0-B: un guardado con la versión correcta pero
      // el estado roto (`{ version: 2, state: {} }`) pasa `deserializar` y
      // explota recién al pintar. Antes el texto de error se escribía en
      // `#summary`, dentro de `#carrera` (oculto): el jugador no veía nada, el
      // guardado no se borraba y el botón "Continuar" volvía a fallar siempre.
      // Ahora se vuelve al inicio, se descarta el guardado y se avisa en el setup.
      console.error(error);
      volverAlInicio();
      actualizarTopbar(null);
      mostrarAvisoDeGuardado();
    } finally {
      continuarBtn.disabled = false;
    }
  }

  async function iniciarSetup() {
    try {
      await cargarModulos();
      pantallaInicio = ui.crearPantallaInicio(
        { rolGrid, campeonGrid, poolContador, runButton, draftSlots, perfilGrid, perfilTexto, regionGrid, regionTexto },
        modulos
      );
      pantallaInicio.render();

      toggleVelocidad.disabled = false;
      toggleSonido.disabled = false;
      actualizarTogglesTopbar();

      // P.2: el botón "Continuar" solo aparece si hay de verdad algo
      // que continuar. La card muestra handle · rol · edad · org.
      let guardada = null;
      if (almacenamiento.hayCarreraGuardada()) {
        guardada = almacenamiento.cargarCarreraGuardada();
        if (!guardada) {
          almacenamiento.borrarCarreraGuardada();
          mostrarAvisoDeGuardado();
        }
      }
      continuarBtn.hidden = !guardada?.state;
      if (guardada?.state && continuarDetalle) {
        const s = guardada.state;
        continuarDetalle.textContent = [
          s.desafio?.fecha ? `Desafío ${s.desafio.fecha}` : null,
          s.player?.name,
          s.player?.role ? modulos.etiquetaRol(s.player.role) : null,
          s.age != null ? `${s.age} años` : null,
          s.career?.currentOrg,
          s.calendario?.etiqueta
        ].filter(Boolean).join(' · ');
      }

      // P.3: `?seed=N` precarga el input — no arranca la carrera sola
      // (eso seguiría siendo un click en "Empezar carrera"), solo dice
      // con qué seed.
      const seedDeUrl = leerSeedDeUrl();
      if (seedDeUrl !== null) {
        seedInput.value = seedDeUrl;
        // Con una seed en la URL el desplegable se abre: el jugador ve qué seed quedó antes de empezar.
        if (seedAviso) {
          seedAviso.closest('details')?.setAttribute('open', '');
        }
        pintarAvisoDeSeed();
      }
      renderInicioK1();
    } catch (error) {
      const esArchivoLocal = location.protocol === 'file:';
      rolGrid.textContent = esArchivoLocal
        ? 'Este juego usa módulos ES y no puede correr abriendo el HTML directo con doble clic. Corré "npm start" y abrí http://localhost:8000.'
        : `No se pudo cargar el juego: ${error.message}`;
      console.error(error);
    }
  }

  runButton.addEventListener('click', () => comenzarCarrera());
  seedInput.addEventListener('input', pintarAvisoDeSeed);
  continuarBtn.addEventListener('click', continuarCarrera);
  nuevaCarreraBtn.addEventListener('click', volverAlInicio);
  toggleVelocidad.addEventListener('click', () => {
    reproductor.ciclarVelocidad();
    actualizarTogglesTopbar();
  });
  // El click audible de este mismo botón lo dispara la delegación
  // global de `shell.js` (dispara DESPUÉS de este handler: la fase de
  // burbujeo llega al `document` una vez que el listener del propio
  // botón ya corrió, así que `sonido.alternar()` ya habilitó todo).
  toggleSonido.addEventListener('click', () => {
    sonido.alternar();
    actualizarTogglesTopbar();
  });
  iniciarSetup();
}
