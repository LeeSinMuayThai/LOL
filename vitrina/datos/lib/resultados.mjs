// El resultado REAL de cada opción de una parada: desde el mismo punto (estado + rng.estado()), se resuelve la opción en un clon
// y se guardan los logs que produce y los números antes/después. El clon no toca el estado ni el rng de la corrida principal:
// el estado se copia por JSON y el rng se re-crea con la seed y se restaura al estado del original (`.restaurar`).
import { mulberry32 } from '../../../src/core/rng.js';
import { resolverDecision } from '../../../src/core/pipeline.js';
import { sistemaPorId } from '../../../src/systems/registro.js';
import { nivelDelJugador } from '../../../src/core/ficha.js';
import { etiquetaDeRanked, servidorDeLaPartida } from '../../../src/core/ranked.js';
import { ESTRATEGIAS } from '../../../src/dev/estrategias.js';
import { clonar } from './comun.mjs';
import { fichaBasicaDe } from './vista.mjs';

const MAX_PARADAS_EN_SERIE = 40;
const redondear = (n) => Math.round(n * 100) / 100;

function rngRestaurado(state, rng) {
  const copia = mulberry32(state.seed);
  copia.restaurar(rng.estado());
  return copia;
}

// Hojas numéricas de un objeto (sin arrays), con su ruta.
function hojas(valor, ruta, salida) {
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    salida[ruta] = redondear(valor);
  } else if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
    for (const [k, v] of Object.entries(valor)) hojas(v, `${ruta}.${k}`, salida);
  }
}

// Los números que una opción puede mover y que la ficha / el cuarto Vos muestran.
export function numerosDe(state) {
  const n = {};
  const { oculto, splitCount, ...jugador } = state.player;
  hojas({ ...jugador, championPool: undefined }, 'player', n);
  // Maquinaria interna que ninguna pantalla muestra: los pesos del perfil, el bonus permanente y el desgaste.
  for (const campo of Object.keys(n)) {
    if (/^player.(perfil.pesos|bonusPermanente|desgaste)./.test(campo)) delete n[campo];
  }
  n.nivel = Math.round(nivelDelJugador(state));
  for (const campo of ['jerarquia', 'arraigo', 'sinergia']) {
    if (typeof state.career?.[campo] === 'number') n[`career.${campo}`] = redondear(state.career[campo]);
  }
  const t = {};
  if (state.player.ranked) t.ranked = etiquetaDeRanked(state.player.ranked, servidorDeLaPartida(state));
  t.pool = state.player.championPool.map((c) => c.name).join(', ');
  t.org = state.career?.currentOrg ?? null;
  t.liga = state.career?.liga ?? null;
  t.contrato = state.career?.contrato?.org ? `${state.career.contrato.org} (${state.career.contrato.tipo}, ${state.career.contrato.salarioAnualUSD} USD)` : null;
  return { numeros: n, textos: t };
}

// Los campos que cambiaron entre dos fotos de `numerosDe`.
export function diferencias(antes, despues) {
  const cambios = [];
  for (const campo of new Set([...Object.keys(antes.numeros), ...Object.keys(despues.numeros)])) {
    const a = antes.numeros[campo];
    const d = despues.numeros[campo];
    if (a !== d) cambios.push({ campo, antes: a ?? null, despues: d ?? null, delta: Number.isFinite(a) && Number.isFinite(d) ? redondear(d - a) : null });
  }
  for (const campo of new Set([...Object.keys(antes.textos), ...Object.keys(despues.textos)])) {
    if (antes.textos[campo] !== despues.textos[campo]) cambios.push({ campo, antes: antes.textos[campo] ?? null, despues: despues.textos[campo] ?? null, delta: null });
  }
  return cambios.sort((x, y) => x.campo.localeCompare(y.campo));
}

function resumenDeParada(state) {
  if (!state.pendiente) return null;
  const { sistemaId, decision } = state.pendiente;
  return { sistema: sistemaId, motivo: decision.datos?.motivo ?? decision.presentacion ?? null, titulo: decision.titulo, opciones: decision.opciones?.length ?? 0 };
}

// Cierre de la serie en curso: los logs por mapa y el cierre (`postSerie`).
export function caminoDeSerie(logs) {
  const quemados = [];
  const mapas = [];
  for (const log of logs) {
    if (log.type === 'serie' && Number.isInteger(log.mapa)) {
      quemados.push(log.campeon);
      if (log.rivalJuega) quemados.push(log.rivalJuega);
      mapas.push({
        mapa: log.mapa,
        campeon: log.campeon,
        rivalJuega: log.rivalJuega ?? null,
        resultado: log.resultado,
        marcador: log.marcador,
        cierre: log.cierre,
        p: log.p ?? null,
        plan: log.plan ?? null,
        charla: log.charla ?? null,
        quemadosDespues: [...quemados]
      });
    }
  }
  const post = logs.find((l) => l.type === 'serie' && l.postSerie) ?? null;
  return { mapas, resultado: post ? clonar(post) : null };
}

// `ctx`: { state, decision, rng } de la parada. `{ seguirSerie }`: después de elegir, se sigue jugando el clon con `criterio`
// hasta que cierre la serie (camino mapa a mapa). Devuelve un array, una entrada por opción.
export function resultadosDeOpciones(ctx, { seguirSerie = false } = {}) {
  const { state, decision, rng } = ctx;
  // Qué contestaría el bot en esta parada (con un rng restaurado: no gasta el de la corrida).
  const opcionElegidaPorElBot = ESTRATEGIAS.criterio(sistemaPorId(state.pendiente.sistemaId), clonar(state), decision, rngRestaurado(state, rng))?.opcionId ?? null;
  return decision.opciones.map((opcion) => {
    const respuesta = { opcionId: opcion.id };

    // 1) El efecto inmediato: lo que devuelve `resolver` del sistema, sin seguir el pipeline.
    const directo = clonar(state);
    const antes = numerosDe(directo);
    const sistema = sistemaPorId(directo.pendiente.sistemaId);
    const rDirecto = sistema.resolver(directo, directo.pendiente.decision, respuesta, rngRestaurado(state, rng));
    const despues = numerosDe(rDirecto.state);

    // 2) Hasta la próxima parada (o el final del split): `resolverDecision`, el camino real del pipeline.
    const clon = clonar(state);
    const rngClon = rngRestaurado(state, rng);
    let paso = resolverDecision(clon, respuesta, rngClon);
    let estado = paso.state;
    const logsTodos = [...paso.logs];
    const paradasIntermedias = [];

    if (seguirSerie) {
      const yaCerro = () => logsTodos.some((l) => l.type === 'serie' && l.postSerie);
      for (let i = 0; i < MAX_PARADAS_EN_SERIE && !yaCerro() && estado.pendiente && estado.serie?.activa; i += 1) {
        const parada = estado.pendiente;
        const resp = ESTRATEGIAS.criterio(sistemaPorId(parada.sistemaId), estado, parada.decision, rngClon);
        paradasIntermedias.push({ ...resumenDeParada(estado), respuesta: resp });
        paso = resolverDecision(estado, resp, rngClon);
        estado = paso.state;
        logsTodos.push(...paso.logs);
      }
    }

    // La serie se corta en su cierre (lo que viene después, la próxima ronda o el split, es otra parada).
    const idxPost = logsTodos.findIndex((l) => l.type === 'serie' && l.postSerie);
    const logsDeLaSerie = seguirSerie && idxPost >= 0 ? logsTodos.slice(0, idxPost + 1) : null;

    const salida = {
      opcionId: opcion.id,
      label: opcion.label,
      eligioElBot: opcionElegidaPorElBot === opcion.id,
      inmediato: {
        logs: clonar(rDirecto.logs),
        cambios: diferencias(antes, despues),
        fichaAntes: fichaBasicaDe(state),
        fichaDespues: fichaBasicaDe(rDirecto.state),
        encadenaOtraParada: rDirecto.decision ? { titulo: rDirecto.decision.titulo, opciones: rDirecto.decision.opciones?.length ?? 0 } : null
      },
      hastaLaProximaParada: {
        cantidadDeLogs: logsTodos.length,
        proximaParada: resumenDeParada(estado),
        cambios: diferencias(antes, numerosDe(estado)),
        terminoLaCarrera: Boolean(estado.terminado)
      }
    };
    if (seguirSerie) {
      salida.serie = {
        ...caminoDeSerie(logsDeLaSerie ?? logsTodos),
        paradasIntermedias: clonar(paradasIntermedias),
        quemadosFinales: clonar(estado.serie?.quemados ?? []),
        marcadorFinal: clonar(estado.serie?.marcador ?? null)
      };
      salida.logsDeLaSerie = clonar(logsDeLaSerie ?? logsTodos);
    }
    return salida;
  });
}
