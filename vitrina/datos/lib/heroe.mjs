// Re-juega la seed héroe con `criterio` y, en el camino, fotografía las muestras: la primera ocurrencia que cumple (o la de mayor
// prioridad, ver `ofrecer`). Cada parada fotografiada trae la decisión cruda, las previas, la franja, la ficha, el acompañante,
// la página del relato, "lo último que pasó" y la pieza, más el guardado exacto (`serializar` + marcador `lolcs-vista`).
import { serializar, deserializar } from '../../../src/core/guardado.js';
import { mulberry32 } from '../../../src/core/rng.js';
import { cierreDeSplit } from '../../../src/ui/core/escena.js';
import { seguimientoGoldenRoad, ventanaVisibleDe } from '../../../src/core/vistaDeCarrera.js';
import { goldenRoadsDeEstado, trayectoriaDeCarrera } from '../../../src/ui/core/trayectoria.js';
import { escalonDeCarrera } from '../../../src/core/puntaje.js';
import { textoParaCompartir } from '../../../src/ui/resultado.js';
import { VERSION_JUEGO } from '../../../src/data/version.js';
import { jugarCarrera, marcadorDeVista } from './partida.mjs';
import { motivoDe, esBo5DeLiga, esLlamativo, observadorDeCobertura } from './cobertura.mjs';
import { clonar, GUARDADO_EN_FIJO } from './comun.mjs';
import {
  franjaDe, fichaDe, fichaBasicaDe, paginaDe, antesDe, previaGeneral, acompananteDatos, piezaDe, escalonTexto, seguimientoDe, jugadorDe
} from './vista.mjs';
import { resultadosDeOpciones } from './resultados.mjs';

const CATEGORIAS_LLAMATIVAS = ['golpe_duro', 'oportunidad', 'mercado', 'salud'];
const PRIORIDAD_RONDA = { final: 3, semis: 2, cuartos: 1 };
const ORDEN_RESULTADO_MUNDIAL = ['eliminado', 'buen_papel', 'cuartos', 'semis', 'final', 'campeon'];
const HREF_DE_EJEMPLO = 'http://localhost:8000/';

// El guardado tal como lo escribe el juego: `lolcs-carrera-guardada` (string de `serializar`) y `lolcs-vista` (el marcador). El
// `guardadoEn` de `serializar` es Date.now(): se fija para que la salida sea determinista.
export function guardadoDe(state, rng, rngUi, pagina) {
  const datos = JSON.parse(serializar(state, rng, rngUi));
  datos.guardadoEn = GUARDADO_EN_FIJO;
  return {
    claves: { carrera: 'lolcs-carrera-guardada', vista: 'lolcs-vista' },
    carrera: JSON.stringify(datos),
    vista: marcadorDeVista(state, clonar(pagina))
  };
}

// Las condiciones de `src/ui/app.js` (`paginaAlRetomar`, líneas 375-390) más el viaje de ida y vuelta por `deserializar`.
export function validarGuardado(guardado) {
  const problemas = [];
  const datos = deserializar(guardado.carrera);
  if (!datos) {
    return ['deserializar devolvió null'];
  }
  const crudo = JSON.parse(guardado.carrera);
  if (JSON.stringify(datos.state) !== JSON.stringify(crudo.state)) problemas.push('el estado deserializado difiere del serializado');
  const rng = mulberry32(datos.seed);
  rng.restaurar(datos.rngEstado);
  // `.estado()` devuelve el acumulador sin envolver a 32 bits y `.restaurar` lo envuelve: se compara módulo 2^32.
  if (rng.estado() !== (datos.rngEstado >>> 0)) problemas.push('el rng no se restaura al mismo estado');
  const m = guardado.vista;
  const estado = datos.state;
  if (!(m && m.seed === estado.seed)) problemas.push('marcador: seed distinta');
  if (!(Number.isInteger(m?.inicioDePagina) && m.inicioDePagina >= 0 && m.inicioDePagina <= estado.logs.length)) problemas.push('marcador: inicioDePagina fuera de rango');
  if (!(m?.logs == null || m.logs === estado.logs.length)) problemas.push('marcador: logs no coincide con state.logs.length');
  if (typeof m?.cierreVisto !== 'boolean') problemas.push('marcador: cierreVisto no es booleano');
  return problemas;
}

class Muestras {
  constructor() { this.slots = new Map(); }
  // Reemplaza solo si la prioridad es estrictamente mayor (la primera ocurrencia gana los empates).
  ofrecer(nombre, prioridad, construir) {
    const actual = this.slots.get(nombre);
    if (!actual || prioridad > actual.prioridad) {
      this.slots.set(nombre, { prioridad, ...construir() });
    }
  }
  get(nombre) { return this.slots.get(nombre) ?? null; }
}

// La parada completa: lo que cualquier prototipo necesita para mostrarla.
function paradaCompleta(ctx, extras = {}) {
  const { sistema, state, decision, pagina } = ctx;
  const pag = clonar(pagina);
  return {
    sistema: sistema.id,
    motivo: motivoDe(decision),
    seed: state.seed,
    edad: state.age,
    anio: state.calendario?.anio ?? null,
    fase: state.phase,
    org: state.career?.currentOrg ?? null,
    decision: clonar(decision),
    previas: {
      general: previaGeneral(state, decision),
      // La previa por opción que cada opción trae en su propia ficha (efectos, riesgo, p).
      porOpcion: (decision.opciones ?? []).map((o) => ({ id: o.id, previa: clonar(o.previa ?? null), riesgo: o.riesgo ?? null, riesgoTexto: o.riesgoTexto ?? null, pSerie: o.pSerie ?? null, pMapas: o.pMapas ?? null }))
    },
    franja: franjaDe(state, pag.fotoInicio),
    ficha: fichaDe(state),
    acompanante: acompananteDatos(state, decision),
    pagina: { desde: pag.desde, cartel: pag.cartel, beats: paginaDe(state, pag.desde) },
    antes: antesDe(state, pag.desde),
    pieza: piezaDe(state),
    ...extras
  };
}

const sinPrivados = ({ prioridad, guardado, ...resto }) => resto;

export function fotografiarHeroe(seed) {
  const cobObs = observadorDeCobertura();
  const m = new Muestras();
  const eras = {};
  const momentos = { firma: null, titulo: null, mundial: null };
  let cierrePendiente = null; // el slot de cierreAnio del split en curso
  let serieDelSplit = null;
  let ultimaPagina = null;

  const ofrecerEra = (nombre, ctx) => {
    if (eras[nombre]) return;
    const s = ctx.state;
    eras[nombre] = {
      motivoDeLaFoto: `${ctx.sistema.id}:${motivoDe(ctx.decision)}`,
      franja: franjaDe(s, ctx.pagina.fotoInicio),
      ficha: fichaBasicaDe(s),
      edad: s.age,
      anio: s.calendario?.anio ?? null,
      etiquetaDeAnio: s.calendario?.etiqueta ?? null,
      fase: s.phase,
      org: s.career?.currentOrg ?? null,
      liga: s.career?.liga ?? null,
      tier: s.career?.tier ?? null,
      main: s.player.campeonDelSplit ?? s.player.championPool.reduce((a, c) => (c.mastery > a.mastery ? c : a)).name,
      handle: s.player.name,
      rol: s.player.role
    };
  };

  const alParar = (ctx) => {
    cobObs.alParar(ctx);
    const { sistema, state, decision, rng, rngUi, pagina } = ctx;
    const motivo = motivoDe(decision);
    const nOpc = decision.opciones?.length ?? 0;

    // Eras (un estado representativo por era).
    if (state.phase === 'amateur' && !state.career.currentOrg) ofrecerEra('pieza', ctx);
    if (state.phase === 'profesional' && [2, 3].includes(state.career.tier) && state.career.currentOrg) ofrecerEra('academia', ctx);
    if (state.phase === 'profesional' && state.career.tier === 1 && state.career.currentOrg) ofrecerEra('escenario', ctx);
    if (ventanaVisibleDe(state) === 'internacional') ofrecerEra('mundial', ctx);

    const foto = (extras = {}, conResultados = null) => () => {
      const parada = paradaCompleta(ctx, extras);
      if (conResultados) {
        parada.resultados = resultadosDeOpciones(ctx, conResultados);
      }
      return { parada, guardado: guardadoDe(state, rng, rngUi, pagina) };
    };

    if (sistema.id === 'eventos' && nOpc === 2 && !decision.presentacion) {
      const ev = decision.datos?.evento;
      const prioridad = 1 + (decision.peso === 'bisagra' ? 4 : 0) + (ev?.bifurcacion ? 2 : 0) + (CATEGORIAS_LLAMATIVAS.includes(ev?.categoria) ? 1 : 0);
      m.ofrecer('evento', prioridad, foto({ categoria: ev?.categoria ?? null, peso: decision.peso ?? null, esBisagra: esLlamativo(decision) }, { seguirSerie: false }));
    }
    if (sistema.id === 'amateur' && motivo === 'plan_amateur' && nOpc === 4) {
      m.ofrecer('planAmateur', 1, foto({}, { seguirSerie: false }));
    }
    if (sistema.id === 'edadCierre') {
      const seg = seguimientoGoldenRoad(state);
      const prioridad = 1 + (state.phase === 'profesional' ? 2 : 0) + (seg && [...seg.splits, seg.liga, seg.mundial].includes('si') ? 2 : 0) + (decision.opciones?.some((o) => o.plan) ? 1 : 0);
      const previo = m.get('cierreAnio');
      m.ofrecer('cierreAnio', prioridad, foto({ cierreDelAnio: { anio: state.calendario?.anio ?? null } }, { seguirSerie: false }));
      // Solo se completa al cerrar el split si esta parada fue la que quedó como muestra.
      cierrePendiente = m.get('cierreAnio') !== previo ? m.get('cierreAnio') : null;
    }
    if (sistema.id === 'serie' && motivo === 'plan' && esBo5DeLiga(state)) {
      const extras = {
        serieEnCurso: clonar(state.serie),
        quemadosAlParar: clonar(state.serie.quemados),
        esReplan: Boolean(decision.datos?.replan)
      };
      const construir = foto(extras, { seguirSerie: true });
      if (decision.datos?.replan) {
        m.ofrecer('serieReplan', 1, construir);
      } else {
        m.ofrecer('serie', (PRIORIDAD_RONDA[state.serie.ronda] ?? 0) + 1, construir);
      }
      serieDelSplit = true;
    }
    if (sistema.id === 'internacional' && motivo === 'swiss') {
      m.ofrecer('swiss', 1, foto({ internacional: clonar(state.internacional) }, { seguirSerie: false }));
    }
    if (sistema.id === 'mercado' && motivo === 'oferta' && nOpc >= 3) {
      const prioridad = 1 + (nOpc >= 4 ? 1 : 0) + (decision.opciones.some((o) => o.tier === 1) ? 2 : 0) + (state.career.contrato?.org ? 0 : 1);
      m.ofrecer('mercado', prioridad, foto({ vosEnElMercado: clonar(decision.datos?.vos ?? null), mercadoDelMundo: { traspasosMundo: clonar(decision.datos?.traspasosMundo ?? []), asientosAbiertos: clonar(decision.datos?.asientosAbiertos ?? []), clubesInteresados: clonar(decision.datos?.clubesInteresados ?? []) } }, { seguirSerie: false }));
    }
    ultimaPagina = pagina;
  };

  let firmaCapturada = false;
  let titulosVistos = 0;
  let intlVistos = 0;
  const alCerrarSplit = (ctx) => {
    cobObs.alCerrarSplit(ctx);
    const { antes, despues, pagina, cierre } = ctx;
    ultimaPagina = pagina;
    const logsDelSplit = despues.logs.slice(pagina.desde);

    // cierreAnio: se completa con lo que sale al cerrar el split (el log `edad`, el escalón, el seguimiento del Golden Road).
    if (cierrePendiente) {
      if (cierrePendiente === m.get('cierreAnio')) {
        const edadLog = logsDelSplit.filter((l) => l.type === 'edad').pop() ?? null;
        const tarjeta = cierreDeSplit(pagina.fotoInicio, despues, { cierreFrenado: false, fotoAnio: pagina.fotoAnio });
        cierrePendiente.parada.cierre = {
          resumenDelAnio: clonar(edadLog),
          tarjetaDelAnio: clonar(tarjeta.anio),
          resultadoDelSplit: clonar(tarjeta.resultado),
          escalon: clonar(escalonDeCarrera(despues)),
          escalonTexto: escalonTexto(despues),
          seguimientoGoldenRoad: seguimientoDe(despues),
          seguimientoParaLaTarjeta: clonar(tarjeta.goldenRoad)
        };
      }
      cierrePendiente = null;
    }
    serieDelSplit = null;

    // firma: el primer contrato.
    const c = despues.career?.contrato;
    if (!firmaCapturada && c?.org && c.tipo !== 'ninguno') {
      firmaCapturada = true;
      const logsFirma = logsDelSplit.filter((l) => l.type === 'mercado' && !l.tecnico && /Firm|Renov/i.test(l.message));
      momentos.firma = {
        org: c.org,
        liga: c.liga,
        tier: c.tier,
        sueldoAnualUSD: c.salarioAnualUSD,
        anios: c.anios,
        tipoDeContrato: c.tipo,
        edad: despues.age,
        anio: despues.calendario?.anio ?? null,
        log: clonar(logsFirma[0] ?? null),
        logsDelMercado: clonar(logsDelSplit.filter((l) => l.type === 'mercado' && !l.tecnico).slice(0, 8)),
        contrato: clonar(c),
        franja: franjaDe(despues, pagina.fotoInicio)
      };
    }

    // titulo: el primer título de liga de tier 1.
    const titulos = despues.career.registro.titulos;
    if (titulos.length > titulosVistos) {
      const nuevo = titulos[titulos.length - 1];
      if (!momentos.titulo && nuevo.tier === 1) {
        const logFinal = [...logsDelSplit].reverse().find((l) => l.type === 'serie' && l.postSerie && l.ronda === 'final' && l.gano === true) ?? null;
        momentos.titulo = {
          titulo: clonar(nuevo),
          liga: nuevo.liga,
          anio: nuevo.anio,
          org: nuevo.org,
          edad: despues.age,
          log: clonar(logFinal),
          plantel: [
            { handle: despues.player.name, rol: despues.player.role, esJugador: true, nivel: Math.round(jugadorDe(despues).nivel) },
            ...clonar(despues.career.companeros ?? []).map((cp) => ({ handle: cp.handle, rol: cp.role, nivel: cp.nivel, edad: cp.edad, aniosContrato: cp.aniosContrato, esJugador: false }))
          ],
          serieFinal: clonar(despues.serie),
          logsDelSplit: clonar(logsDelSplit.filter((l) => !l.tecnico && ['serie', 'escena', 'temporada', 'event', 'hype'].includes(l.type)).slice(-12)),
          franja: franjaDe(despues, pagina.fotoInicio)
        };
      }
      titulosVistos = titulos.length;
    }

    // mundial: el mejor resultado (el campeón si lo hay).
    const intls = despues.career.registro.internacionales;
    if (intls.length > intlVistos) {
      const nueva = intls[intls.length - 1];
      const rango = (e) => ORDEN_RESULTADO_MUNDIAL.indexOf(e?.resultado ?? 'eliminado');
      if (!momentos.mundial || rango(nueva) > rango(momentos.mundial.entrada)) {
        momentos.mundial = {
          ganado: nueva.resultado === 'campeon',
          entrada: clonar(nueva),
          edad: despues.age,
          org: nueva.org,
          anio: nueva.anio,
          logs: clonar(logsDelSplit.filter((l) => l.type === 'internacional')),
          internacional: clonar(despues.internacional),
          franja: franjaDe(despues, pagina.fotoInicio)
        };
      }
      intlVistos = intls.length;
    }
    void antes; void cierre;
  };

  const { state: final, rng, rngUi } = jugarCarrera(seed, { alParar, alCerrarSplit });
  cobObs.alTerminar(final);
  eras.leyenda = {
    motivoDeLaFoto: 'final',
    franja: franjaDe(final, ultimaPagina.fotoInicio),
    ficha: fichaBasicaDe(final),
    edad: final.age,
    anio: final.calendario?.anio ?? null,
    etiquetaDeAnio: final.calendario?.etiqueta ?? null,
    fase: final.phase,
    org: final.career?.currentOrg ?? null,
    liga: final.career?.liga ?? null,
    tier: final.career?.tier ?? null,
    main: final.player.campeonDelSplit ?? final.player.championPool.reduce((a, c) => (c.mastery > a.mastery ? c : a)).name,
    handle: final.player.name,
    rol: final.player.role
  };

  // Las paradas con su resultado marcan cuál habría elegido el bot: se compara con la respuesta real del bot en esa parada.
  return { cob: cobObs.cob, muestras: m, eras, momentos, final, rng, rngUi, ultimaPagina };
}

// La tarjeta final tal como la arma el juego (src/ui/screens/tarjeta.js lee todo de `state`).
const TITULO_MARCO = {
  retiro_elegido: 'SE CIERRA UNA CARRERA',
  sin_equipo: 'EL TELÉFONO DEJÓ DE SONAR',
  burnout: 'NO DABA MÁS',
  no_llego: 'SE CERRÓ LA VENTANA',
  prohibicion_familiar: 'EN CASA DIJERON QUE NO',
  retiro_por_lesion: 'EL CUERPO DIJO BASTA'
};
const RESULTADO_INTL = {
  campeon: 'Campeón del mundo', final: 'Subcampeón', semis: 'Semifinal', cuartos: 'Cuartos', eliminado: 'Afuera', buen_papel: 'Buen papel'
};

export function muestraFinal(final, rng, rngUi, ultimaPagina) {
  const t = final.tarjeta;
  const reg = final.career.registro;
  const anios = goldenRoadsDeEstado(final);
  return {
    seed: final.seed,
    fotoDeLaFranja: franjaDe(final, ultimaPagina.fotoInicio),
    tarjeta: clonar(t),
    marco: { id: t.finAnticipado ?? 'retiro_elegido', titulo: TITULO_MARCO[t.finAnticipado] ?? 'FIN DE LA CARRERA' },
    identidad: `${final.player.name} · ${final.player.role} · se retiró a los ${t.edadRetiro}`,
    jugador: jugadorDe(final),
    puntaje: clonar(t.puntaje),
    escalon: clonar(escalonDeCarrera(final)),
    goldenRoads: anios,
    registro: {
      porOrg: clonar(reg.porOrg),
      titulos: clonar(reg.titulos),
      internacionales: clonar(reg.internacionales),
      internacionalesTexto: reg.internacionales.map((i) => ({ ...clonar(i), resultadoTexto: RESULTADO_INTL[i.resultado] ?? i.resultado })),
      picos: clonar(reg.picos),
      momentos: clonar(reg.momentos)
    },
    trayectoria: clonar(trayectoriaDeCarrera(final)),
    textoParaCompartir: textoParaCompartir(final, HREF_DE_EJEMPLO),
    versionDelJuego: VERSION_JUEGO,
    guardado: guardadoDe(final, rng, rngUi, ultimaPagina)
  };
}

export { sinPrivados };
