// El controlador (fase V, PLAN.md "V0 — El kernel"): hasta esta fase vivía
// entero como un `<script type="module">` de ~520 líneas dentro de
// `index.html`. `estado`/`rng`/`rngUi` seguían en un closure que no se
// exponía a propósito, con un costo ya medido: la dependencia se había
// invertido (`components/ficha.js` importaba `shell.js` para empujarle
// `state` al chrome global, porque era el único sitio fuera de este closure
// que lo tenía a mano). Acá `estado` pasa a vivir en un `store` (`core/store.js`)
// que sí se puede pasar a cualquier pantalla nueva — y con eso disponible,
// el chrome (desde V2-C: la franja, el acompañante y la luz de estudio) se pinta
// desde acá, no desde adentro de la ficha.
//
// `index.html` sigue siendo el único lugar donde se declara el DOM del
// juego (regla de la fase T: "si algo de acá explota, el juego de abajo
// sigue jugable") — este módulo solo lo lee con `document.getElementById`,
// nunca lo construye.
import { mostrarParada } from './paradas/index.js';
import { crearEscena } from './escena.js';
import { fotoDeSplit, cierreDeSplit } from './core/escena.js';
import { iconoSonido } from './components/iconos.js';
import { aplicarEstudio, limpiarEstudio } from './shell.js';
import { crearFranja } from './franja.js';
import { crearCuartos } from './cuartos.js';
import { crearAcompanante } from './acompanante.js';
import { crearStore } from './core/store.js';
import {
  almacenamientoLocal, leerHistorial, guardarHistorial, agregarAlHistorial, entradaDeResultado,
  lineaDeHistorial, mejorDelDesafio, fechaUTC, desafioDeBusqueda
} from './resultado.js';
import { VERSION_JUEGO } from '../data/version.js';
import { iniciarDesafio } from '../core/desafio.js';
import { interpretarSeed } from '../core/numeros.js';
import { previaDeDecision } from '../core/previaDePartido.js';
import { fichaCompleta } from '../core/ficha.js';

export function iniciar() {
  const shellEl = document.querySelector('.shell');
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
  const logList = document.getElementById('logList');
  const decisionPanel = document.getElementById('decision');
  const decisionTitle = document.getElementById('decisionTitle');
  const decisionDesc = document.getElementById('decisionDesc');
  const decisionOptions = document.getElementById('decisionOptions');
  const minijuegoPanel = document.getElementById('minijuego');
  const previaEl = document.getElementById('previa');
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
  // K6a-U: el aviso de "se está jugando el split" que ocupa el lugar de la decisión mientras el feed reproduce. V2-B: es
  // parte de la pieza `relato` (se ve con el relato, sin togglear `hidden`).
  const esperaEl = document.createElement('div');
  esperaEl.className = 'reproduciendo-aviso';
  esperaEl.setAttribute('role', 'status');
  esperaEl.textContent = 'Se está jugando el split… (Espacio para pasar las líneas más rápido)';
  esperaEl.dataset.piezas = 'relato';
  decisionPanel.after(esperaEl);
  const continuarBtn = document.getElementById('continuarBtn');
  const desafioDia = document.getElementById('desafioDia');
  const historialEl = document.getElementById('historial');
  const serieContextoEl = document.getElementById('serieContexto');
  const toggleVelocidad = document.getElementById('toggleVelocidad');
  const toggleSonido = document.getElementById('toggleSonido');
  // La franja (V2-C): reemplaza a la topbar. Se crea cuando cargan los módulos (necesita `etiquetaRol`); publica su alto
  // real como `--franja-alto-real` (antes, `--topbar-alto-real` desde acá: en el celular son dos o tres líneas).
  const franjaEl = document.getElementById('franja');
  const franjaEstadoEl = document.getElementById('franjaEstado');
  let franja = null;
  // Los cuartos (V2-C): el `<dialog id="cuarto">` y su barra en la franja. Se crean cuando cargan los módulos (pintan con
  // los renderers de hoy) y leen la `vista`.
  const ayudaTeclas = document.getElementById('ayudaTeclas');
  let cuartos = null;
  // El acompañante (V2-C): reemplaza al riel derecho (T5), cuyos paneles se mudaron a los cuartos.
  let acompanante = null;

  // El contrato de elementos que `src/ui/render.js` necesita para pintar
  // la pantalla de decisión (fase 8, §8.5; fase 9c suma la pantalla de ofertas).
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
  // FASE V (V2-B; PLAN.md §V.5 "Dos stores"): `vista` es lo que la pantalla YA contó. La escribe solo el director de
  // escena (`escena.revelar`): al terminar los beats de cada llamada al pipeline, al retomar, al arrancar una carrera y
  // en la final. La franja, el acompañante, la luz de estudio y el marcador de serie se pintan desde acá
  // (`pintarDesdeVista`), y los cuartos la leen al abrirse; nunca desde `store`: mientras el relato cuenta un split, la
  // pantalla sigue en el estado de antes (regla 4 de §V.3, D89: antes se pintaban con el estado final ANTES de los beats y
  // adelantaban el resultado).
  const vista = crearStore(null);
  const escena = crearEscena({ shell: shellEl, vista });
  vista.suscribir(pintarDesdeVista);
  // La página del relato (§V.5 "Una página por split"): `desde` es `inicioDePagina` (el `logs.length` de cuando se
  // llamó a `avanzarSplit`; NUNCA se mueve al resolver una decisión: al responder vuelve la misma página con los beats
  // nuevos abajo). `fotoInicio` es `fotoDeSplit` del estado de ese momento (con ella `cierreDeSplit` cuenta qué se
  // movió). `ultimoCierre`: el cierre del split anterior; `cierreVisto`: si su tarjeta se vio (se anota al reproducirla, con
  // la velocidad de ESE momento, o al reabrirla al retomar); `anterior`: ese mismo cierre si la página abre con la línea
  // "Split anterior: …" (la tarjeta no llegó a verse: INST o movimiento reducido).
  let pagina = { desde: 0, fotoInicio: null, ultimoCierre: null, cierreVisto: false, anterior: null };
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
      franja = crearFranja({
        franja: franjaEl,
        estadoEl: franjaEstadoEl,
        etiquetaRol: modulos.etiquetaRol,
        // El delta del número es el del split en curso: contra la foto de la página (la misma que usa la tarjeta de cierre).
        fotoDeLaPagina: () => pagina.fotoInicio
      });
      cuartos = crearCuartos({
        dialog: document.getElementById('cuarto'),
        barra: document.getElementById('cuartosBarra'),
        cuerpo: document.getElementById('cuartoCuerpo'),
        titulo: document.getElementById('cuartoTitulo'),
        botonAyuda: ayudaTeclas,
        escena,
        vista,
        contexto: { ui, modulos }
      });
      acompanante = crearAcompanante({
        aside: document.getElementById('acompanante'),
        chip: document.getElementById('verContexto'),
        contexto: { ui, modulos },
        abrirCuarto: (id) => cuartos.abrir(id)
      });
      reproductor = reproductorModulo;
      sonido = sonidoModulo;
      almacenamiento = almacenamientoModulo;
    }
    return modulos;
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

  // Una parada: el director pone la pieza de su familia (`familiaDeParada`) y la familia la pinta (`paradas/`). Reemplaza
  // a los `hidden` que `mostrarDecision` prendía y apagaba en cada panel: qué nodo se ve lo decide `data-pieza`.
  function mostrarLaParada(estado) {
    escena.revelar(estado, {
      pintar: () => mostrarParada(estado.pendiente, {
        estado,
        ui,
        rngUi,
        responder,
        pintarPrevia,
        elementos: { decision: decisionElements, mercado: mercadoElements },
        contenedores: { decision: decisionPanel, partido: decisionPanel, mercado: mercadoPanel, minijuego: minijuegoPanel }
      })
    });
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

  // La final: la pieza `final` muestra la tarjeta y "Nueva carrera" (y nada del relato ni de las paradas).
  function mostrarFinal(state) {
    escena.revelar(state, {
      pintar: () => {
        if (state.terminado && state.tarjeta) {
          ui.renderTarjeta(tarjetaPanel, state, modulos, { lineaHistorial: registrarEnHistorial(state) });
        }
      }
    });
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

  // Lo que se pinta desde `vista` (FASE V, V2-B; V2-C): la franja, el acompañante, la luz de estudio y el marcador de la
  // serie. Antes era `pintarChrome`, llamado con el estado del motor ANTES de los beats (D89). Con la `vista` en `null`
  // (el inicio) se limpia. La ficha ya no está siempre a la vista: vive en el cuarto Vos y, en el escritorio, en el
  // acompañante cuando le toca.
  function pintarDesdeVista(estado) {
    franja?.pintar(estado);
    // La pieza ya es la nueva: el director la escribe antes que la `vista`.
    acompanante?.pintar(estado, escena.pieza());
    if (!estado) {
      limpiarEstudio();
      return;
    }
    aplicarEstudio(estado, fichaCompleta(estado));
    ui.renderSerieContexto(serieContextoEl, estado);
  }

  // Una página nueva: la abre `avanzarSplit`, nunca `resolverDecision`.
  function abrirPagina(antes) {
    let fotoInicio = null;
    try {
      fotoInicio = fotoDeSplit(antes);
    } catch (error) {
      console.error('No se pudo sacar la foto del split:', error);
    }
    pagina = {
      desde: antes.logs.length,
      fotoInicio,
      ultimoCierre: pagina.ultimoCierre,
      cierreVisto: pagina.cierreVisto,
      // Lo que importa es si la tarjeta del split anterior SE VIO (la velocidad de cuando se reprodujo), no la de ahora.
      anterior: pagina.ultimoCierre && !pagina.cierreVisto ? pagina.ultimoCierre : null
    };
  }

  // Lo que se guarda en `lolcs-vista` junto con la carrera (`almacenamiento.guardarVista`).
  function marcadorDeVista(estado) {
    return {
      seed: estado.seed,
      inicioDePagina: pagina.desde,
      fotoInicio: pagina.fotoInicio,
      ultimoCierre: pagina.ultimoCierre,
      cierreVisto: pagina.cierreVisto,
      logs: estado.logs.length
    };
  }

  // La página al retomar: la del marcador si es de esta carrera; si no, los últimos beats y un cierre sin delta (la foto
  // se saca ahora, a mitad del split, y va marcada `parcial`). `coincide`: el marcador es de esta carrera.
  function paginaAlRetomar(marcador, estado) {
    const valido = Boolean(marcador)
      && marcador.seed === estado.seed
      && Number.isInteger(marcador.inicioDePagina)
      && marcador.inicioDePagina >= 0
      && marcador.inicioDePagina <= estado.logs.length
      && (marcador.logs == null || marcador.logs === estado.logs.length);
    if (valido) {
      const ultimoCierre = marcador.ultimoCierre ?? null;
      // Un marcador sin la marca (de antes de anotarla) cuenta como la velocidad de ahora, como se decidía antes.
      const cierreVisto = typeof marcador.cierreVisto === 'boolean' ? marcador.cierreVisto : !reproductor.sinEspera();
      return {
        desde: marcador.inicioDePagina,
        fotoInicio: marcador.fotoInicio ?? null,
        ultimoCierre,
        cierreVisto,
        anterior: ultimoCierre && !cierreVisto ? ultimoCierre : null,
        coincide: true
      };
    }
    let fotoInicio = null;
    try {
      fotoInicio = { ...fotoDeSplit(estado), parcial: true };
    } catch (error) {
      console.error('No se pudo sacar la foto del split:', error);
    }
    return { desde: ui.desdeDeUltimosBeats(estado.logs), fotoInicio, ultimoCierre: null, cierreVisto: false, anterior: null, coincide: false };
  }

  // Fase T3: el feed se revela de a un beat por `reproductor.reproducirBeats`. FASE V (V2-B): mientras tanto la pieza es
  // el relato y la `vista` no cambia (la ficha y el chrome muestran lo que ya se contó); recién al terminar los beats el
  // director revela la parada (o el relato quieto) y escribe la `vista`. Si la llamada volvió sin pausa, el split cerró:
  // su tarjeta de cierre entra con el último beat de la página (usa su espera).
  async function reproducirLlamada(logsAntes, registroAntes) {
    const estadoActual = store.leer();
    // K6a-U: mientras el feed reproduce, la parada no está y el aviso "Se está jugando el split…" sí (es de la pieza
    // `relato`).
    escena.revelar(estadoActual, { reproduciendo: true });
    const bisagra = estadoActual.pendiente?.decision?.datos?.evento?.bisagra ?? false;
    let cierre = null;
    if (!estadoActual.pendiente && !estadoActual.terminado) {
      try {
        cierre = cierreDeSplit(pagina.fotoInicio, estadoActual);
      } catch (error) {
        console.error('No se pudo armar el cierre del split:', error);
      }
    }
    // La tarjeta se ve si el relato espera entre beats: la velocidad se lee ACÁ, la de la llamada que la reproduce.
    const tarjetaSeVe = Boolean(cierre) && !reproductor.sinEspera();
    await reproductor.reproducirBeats(logList, estadoActual.logs.slice(logsAntes), {
      registroAntes,
      registroDespues: estadoActual.career.registro,
      bisagra,
      state: estadoActual,
      offset: logsAntes,
      pagina: { desde: pagina.desde, anterior: pagina.anterior, cierre }
    });
    if (cierre) {
      pagina.ultimoCierre = cierre;
      pagina.cierreVisto = tarjetaSeVe;
    }

    // Fase T8 (P.2): se guarda al cerrar cada split, siga de largo o
    // pare en una decisión — las dos son "una pausa" desde el punto de
    // vista de "¿qué pasa si recargás acá?". Si ya terminó no hay nada
    // que continuar: se borra en vez de dejar un guardado que
    // apuntaría a un `estado.terminado`. V2-B: el marcador de la página
    // va junto, en su propia clave (`lolcs-vista`).
    if (estadoActual.terminado) {
      almacenamiento.borrarCarreraGuardada();
      almacenamiento.borrarVista();
    } else {
      almacenamiento.guardarCarrera(estadoActual, rng, rngUi);
      almacenamiento.guardarVista(marcadorDeVista(estadoActual));
    }

    if (estadoActual.pendiente) {
      mostrarLaParada(estadoActual);
      return true;
    }
    if (!estadoActual.terminado) {
      escena.revelar(estadoActual);
    }
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
      abrirPagina(antes);
      store.escribir(pipeline.avanzarSplit(antes, rng).state);

      if (await reproducirLlamada(logsAntes, registroAntes)) {
        return;
      }
      if (store.leer().terminado) {
        break;
      }
    }

    mostrarFinal(store.leer());
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
      const antes = store.leer();
      const logsAntes = antes.logs.length;
      const registroAntes = antes.career.registro;
      store.escribir(pipeline.resolverDecision(antes, respuesta, rng).state);

      // La parada se va sola: `reproducirLlamada` pone el relato (antes, cuatro `hidden = true` acá). La página es la
      // misma: los beats de la respuesta entran abajo.
      if (await reproducirLlamada(logsAntes, registroAntes)) {
        return;
      }
      const despues = store.leer();
      if (despues.terminado) {
        mostrarFinal(despues);
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

  // La entrada del escenario al arrancar o retomar una carrera. Qué se ve ya lo puso el director (`escena.revelar`):
  // acá solo la animación.
  function animarEntradaDelEscenario() {
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
    mostrarAviso(TEXTO_AVISO_DE_GUARDADO);
  }

  // V2-C: el mismo lugar sirve para el error al arrancar una carrera, que antes se escribía en `#summary` (dentro de
  // `#carrera`, escondido en el inicio: el jugador no lo veía).
  function mostrarAviso(texto) {
    const existente = setupPanel.querySelector('.setup-aviso');
    if (existente) {
      existente.textContent = texto;
      return;
    }
    const aviso = document.createElement('p');
    aviso.className = 'setup-aviso';
    aviso.setAttribute('role', 'status');
    aviso.textContent = texto;
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
    tarjetaPanel.replaceChildren();
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
      almacenamiento.borrarVista();

      // La ficha arranca con el estado inicial: el primer split se cuenta antes de moverla.
      pagina = { desde: 0, fotoInicio: null, ultimoCierre: null, cierreVisto: false, anterior: null };
      escena.revelar(store.leer());
      animarEntradaDelEscenario();

      // `avanzar()` es async desde la fase T3 (el reproductor pausa
      // entre beats): si no se espera acá, un error en el primer split
      // se pierde como rechazo de promesa sin manejar en vez de caer en
      // este catch.
      await avanzar();
    } catch (error) {
      const esArchivoLocal = location.protocol === 'file:';
      console.error(error);
      escena.revelar(null);
      mostrarAviso(esArchivoLocal
        ? 'Este juego usa módulos ES y no puede correr abriendo el HTML directo con doble clic: corré "npm start" en la terminal y abrí la URL que te muestra (http://localhost:8000).'
        : `No se pudo cargar el juego (${error.message}). Revisá la consola del navegador.`);
      runButton.disabled = false;
      for (const boton of desafioDia.querySelectorAll('button')) {
        boton.disabled = false;
      }
    }
  }

  function volverAlInicio() {
    // La pieza `inicio` esconde el escenario de la carrera (antes, `hidden` en cada panel del riel derecho, en el marcador
    // y en el escenario); la `vista` en `null` limpia la franja, el acompañante y la luz de estudio.
    escena.revelar(null);
    // Ya se borró en `reproducirLlamada` cuando `estado.terminado`
    // se puso en true — esto es la red de seguridad, no el borrado
    // principal. Refresca el botón por si el estado cambió mientras
    // tanto (debería estar oculto: no queda nada que continuar).
    almacenamiento.borrarCarreraGuardada();
    almacenamiento.borrarVista();
    continuarBtn.hidden = true;
    quitarAvisoDeGuardado();
    pantallaInicio.reset();
    renderInicioK1();
  }

  // Fase T3: refleja el estado de `reproductor`/`sonido` en los dos
  // toggles de la franja. Se llama al cargar los módulos y en cada click.
  function actualizarToggles() {
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

      // D45: el feed se pinta al retomar (antes `#logList` arrancaba vacío). V2-B: es la página del split en curso, con
      // el marcador de `lolcs-vista`; la ficha y el chrome los pinta la `vista`, que escribe el director.
      pagina = paginaAlRetomar(almacenamiento.cargarVista(), estadoRetomado);
      // Sin parada, el guardado es de justo después de cerrar un split: si el marcador es de esta carrera, esa página
      // vuelve con su tarjeta de cierre (a cualquier velocidad). `cierreVisto` no cambia: lo que se vio al jugarlo es lo que
      // cuenta (la tarjeta de acá dura hasta el primer beat de la página siguiente), y si no se vio, la línea "Split
      // anterior" de la página siguiente sigue ahí.
      const reabreElCierre = !estadoRetomado.pendiente && pagina.coincide && Boolean(pagina.ultimoCierre);
      if (reabreElCierre) {
        pagina = { ...pagina, anterior: null };
      }
      ui.renderPagina(logList, estadoRetomado, {
        desde: pagina.desde,
        anterior: pagina.anterior,
        cierre: reabreElCierre ? pagina.ultimoCierre : null
      });

      if (estadoRetomado.pendiente) {
        mostrarLaParada(estadoRetomado);
        animarEntradaDelEscenario();
      } else {
        escena.revelar(estadoRetomado);
        animarEntradaDelEscenario();
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
      ayudaTeclas.disabled = false;
      actualizarToggles();

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
    actualizarToggles();
  });
  // El click audible de este mismo botón lo dispara la delegación
  // global de `shell.js` (dispara DESPUÉS de este handler: la fase de
  // burbujeo llega al `document` una vez que el listener del propio
  // botón ya corrió, así que `sonido.alternar()` ya habilitó todo).
  toggleSonido.addEventListener('click', () => {
    sonido.alternar();
    actualizarToggles();
  });
  iniciarSetup();
}
