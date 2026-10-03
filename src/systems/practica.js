import { gauss } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { clamp, clampStat } from '../core/numeros.js';
import { campeonesAprendibles, pulirCampeon, aprenderCampeones } from '../core/pool.js';
import { recuperarPorDescanso } from '../core/barras.js';
import { conMarcasDeRutina, conTechoDeLesion } from '../core/curvas.js';
import { BALANCE } from '../data/balance.js';
import { ofrecerRutinas, rutinaPorId, elegirRutinaAutomatica } from '../core/rutinas.js';
import { opcionDesdeRutina, descripcionDeSorteo, EJE_OFFSEASON } from '../core/rareza.js';
import { statsDeCurva } from '../core/curvas.js';
import { calcularContexto } from '../core/contexto.js';

export const id = 'practica';

// La version profesional del recurso escaso de CONCEPTO §3. En la etapa amateur
// la atencion son bloques de tiempo; aca son puntos de preparacion entre
// splits. Es tambien la unica forma de recuperar mentalidad una vez que ya no
// administras tus propias horas de sueño.

const DESTINOS = [
  { id: 'pulir', label: 'Pulir tu campeón principal' },
  { id: 'nuevo', label: 'Aprender un campeón nuevo' },
  { id: 'mecanica', label: 'Entrenar mecánica' },
  { id: 'macro', label: 'Estudiar macro' },
  { id: 'descansar', label: 'Descansar' }
];

const IDS_DESTINO = DESTINOS.map((destino) => destino.id);

// K4-D: el receso se juega en la pretemporada, en la misma parada que el mercado (T9). Antes la práctica frenaba al
// final del último split del año; ahora lo hace al empezar el siguiente. `splitCount` no cambia entre uno y otro
// (lo sube `atributos`, después), así que es el mismo año de cuenta.
export function esPreparacion(state) {
  return state.phase === 'profesional' && calcularContexto(state).ventana === 'pretemporada';
}

// La preparación de este año ya se resolvió (en la parada del mercado o en la propia). El valor es el `splitCount`
// de la pretemporada, así que no hay que apagarlo después: el año que viene es otro número.
export function preparacionResuelta(state) {
  return state.flags.preparacionDeSplit === state.player.splitCount;
}

function normalizar(respuesta, puntos) {
  const pedido = respuesta?.reparto ?? {};
  const crudo = Object.fromEntries(IDS_DESTINO.map((destino) => [destino, Math.max(0, Math.round(pedido[destino] ?? 0))]));
  const total = IDS_DESTINO.reduce((suma, destino) => suma + crudo[destino], 0);

  if (total === 0) {
    return { ...crudo, descansar: puntos };
  }

  const escala = puntos / total;
  const ajustado = Object.fromEntries(IDS_DESTINO.map((destino) => [destino, Math.floor(crudo[destino] * escala)]));

  let sobrante = puntos - IDS_DESTINO.reduce((suma, destino) => suma + ajustado[destino], 0);
  const porPrioridad = [...IDS_DESTINO].sort((a, b) => crudo[b] - crudo[a]);
  for (let i = 0; sobrante > 0; i = (i + 1) % porPrioridad.length, sobrante -= 1) {
    ajustado[porPrioridad[i]] += 1;
  }

  return ajustado;
}

const ETIQUETAS_EFECTO = { mecanica: 'mecánica', macro: 'macro', mentalidad: 'consistencia' };

// El reparto de una rutina tal como lo aplica `resolverPreparacion`: la carta y el motor leen el mismo.
export function repartoDeRutina(rutina) {
  return normalizar({ reparto: rutina.reparto }, BALANCE.practica.puntos);
}

// K4-D: la carta de mejora de una rutina de receso. Dice lo que el motor va a aplicar (regla 15), con la ganancia
// media —sin el ruido— de cada stat, ya con el tope de descanso, el clamp y el techo de lesión, y cuánto de eso se
// queda para siempre: `fraccionPermanentePractica` sobre lo que mueve un stat de curva, el mismo cálculo que hace
// `conMarcasDeRutina` -> `conPermanencia`. Puro, sin rng.
export function cartaDeRutina(state, rutina) {
  const p = BALANCE.practica;
  const reparto = repartoDeRutina(rutina);
  const stats = state.player.stats;
  const techoLesion = state.player.techoLesionMecanica;
  const medias = [];

  if (reparto.mecanica > 0) {
    const tope = clampStat(stats.mecanica + p.gananciaMecanica * reparto.mecanica);
    medias.push(['mecanica', (techoLesion != null ? Math.min(tope, techoLesion) : tope) - stats.mecanica]);
  }
  if (reparto.macro > 0) {
    medias.push(['macro', clampStat(stats.macro + p.gananciaMacro * reparto.macro) - stats.macro]);
  }
  if (reparto.descansar > 0) {
    medias.push(['mentalidad', recuperarPorDescanso(stats.mentalidad, p.gananciaDescanso * reparto.descansar) - stats.mentalidad]);
  }

  const deCurva = statsDeCurva();
  const efectos = medias.map(([stat, esperado]) => ({
    stat,
    etiqueta: ETIQUETAS_EFECTO[stat],
    esperado: Math.max(0, esperado),
    permanente: deCurva.includes(stat) ? BALANCE.atributos.fraccionPermanentePractica * Math.max(0, esperado) : 0
  }));

  return {
    ...opcionDesdeRutina(rutina, 'offseason'),
    efectos,
    pulir: reparto.pulir,
    nuevo: reparto.nuevo,
    permanenteTotal: efectos.reduce((suma, efecto) => suma + efecto.permanente, 0)
  };
}

// K4-D: lo que se ofrece como preparación del año, o `null` si el catálogo no trae nada para este contexto. Consume
// el `rng` del sorteo de rutinas (igual que antes el sistema solo). La usa la parada del mercado y la parada propia.
export function ofrecerPreparacion(state, rng) {
  const rutinas = ofrecerRutinas(state, rng, { pool: 'offseason' });
  if (rutinas.length === 0) {
    return null;
  }
  const aprendibles = campeonesAprendibles(state).length;
  const hayCupo = state.player.championPool.length < BALANCE.practica.poolMaximo && aprendibles > 0;
  const extra = 'Lo que hagas en el receso es lo que llevás al año que viene.'
    + (hayCupo ? '' : ' Tu pool ya está lleno: no entra ningún campeón nuevo.');

  return {
    descripcion: descripcionDeSorteo(rutinas.length, EJE_OFFSEASON, extra),
    rutinas,
    cartas: rutinas.map((rutina) => cartaDeRutina(state, rutina)),
    elegida: null
  };
}

function decisionDePractica(preparacion) {
  return {
    tipo: 'opciones',
    presentacion: 'pretemporada',
    titulo: 'La pretemporada',
    descripcion: preparacion.descripcion,
    opciones: preparacion.cartas.map(({ id, label, descripcion, rareza }) => ({ id, label, descripcion, rareza })),
    datos: { motivo: 'practica', rutinas: preparacion.rutinas, preparacion }
  };
}

// K4-D: si el mercado ya paró este año, la preparación vino adentro de esa decisión y acá no hay nada que preguntar.
// Si no (tier 3, contrato firme, sin ofertas, libre), la pretemporada frena una sola vez, solo con la preparación.
export function aplicar(state, rng) {
  if (!esPreparacion(state) || preparacionResuelta(state)) {
    return { state, logs: [] };
  }
  const preparacion = ofrecerPreparacion(state, rng);
  if (!preparacion) {
    return { state, logs: [] };
  }
  return { state, logs: [], decision: decisionDePractica(preparacion) };
}

export function resolver(state, decision, respuesta, rng) {
  return resolverPreparacion(state, decision.datos.rutinas, respuesta.opcionId, rng);
}

// La rutina elegida, aplicada. La llaman las dos paradas (la del mercado y la propia) y deja marcado el año.
export function resolverPreparacion(state, rutinas, rutinaId, rng) {
  const p = BALANCE.practica;
  const rutina = rutinaPorId(rutinas, rutinaId);
  const reparto = repartoDeRutina(rutina);
  const partes = [];

  const pulido = pulirCampeon(state.player.championPool, reparto.pulir, rng);
  if (pulido.texto) {
    partes.push(pulido.texto);
  }

  const aprendido = aprenderCampeones(state, pulido.pool, reparto.nuevo, rng);
  if (aprendido.texto) {
    partes.push(aprendido.texto);
  }

  const stats = { ...state.player.stats };

  if (reparto.mecanica > 0) {
    const ganancia = Math.max(0, gauss(p.gananciaMecanica * reparto.mecanica, p.ruidoPractica * reparto.mecanica, rng));
    stats.mecanica = clampStat(stats.mecanica + ganancia);
    // Fase 10c: el techo de lesión topea la ganancia (K4 revisión 2: por el mismo helper que eventos y minijuegos,
    // `conTechoDeLesion` — `edadCierre.js` también mueve mecánica después de `atributos.js`).
    stats.mecanica = conTechoDeLesion(state.player, 'mecanica', state.player.stats.mecanica, stats.mecanica);
    // El log dice lo que de verdad subió, ya con el clamp y el techo de lesión (no la ganancia nominal).
    partes.push(`mecánica +${Math.round(stats.mecanica - state.player.stats.mecanica)}`);
  }

  if (reparto.macro > 0) {
    const ganancia = Math.max(0, gauss(p.gananciaMacro * reparto.macro, p.ruidoPractica * reparto.macro, rng));
    stats.macro = clampStat(stats.macro + ganancia);
    stats.shotcalling = clampStat(stats.shotcalling + ganancia / 2);
    partes.push(`macro +${Math.round(stats.macro - state.player.stats.macro)}`);
  }

  if (reparto.descansar > 0) {
    const ganancia = Math.max(0, gauss(p.gananciaDescanso * reparto.descansar, p.ruidoPractica * reparto.descansar, rng));
    // K3-A: el descanso del receso pasa por el tope (`core/barras.js`). El log dice lo que de verdad subió, ya
    // con el tope, no la ganancia nominal (PLAN.md "K3, tal como quedó": el log dice lo que pasó).
    const antes = stats.mentalidad;
    stats.mentalidad = recuperarPorDescanso(antes, ganancia);
    partes.push(`consistencia +${Math.round(stats.mentalidad - antes)}`);
  }

  // K3-B 2b: la práctica también deja marca. Una fracción de lo que la rutina movió DE VERDAD sobre cada stat de
  // curva (ya con el clamp y el techo de lesión; `conPermanencia` ignora los que no son de curva) va al bonus
  // permanente, con la marca a nombre de la rutina. Lo que un techo de lesión recorta no es una pérdida de la
  // práctica: solo cuentan las ganancias.
  const conStats = { ...state, player: { ...state.player, championPool: aprendido.pool, stats } };
  const marcado = conMarcasDeRutina(conStats, state.player.stats, rutina.titulo);

  return {
    state: { ...marcado, flags: { ...marcado.flags, preparacionDeSplit: marcado.player.splitCount } },
    logs: [crearLog(
      'practica',
      `Offseason: ${partes.length > 0 ? partes.join(', ') : 'no aprovechaste el receso'}.`,
      { tecnico: true }
    )]
  };
}

export function resolverAuto(state, decision, rng) {
  return { opcionId: elegirRutinaAuto(state, decision.datos.rutinas, rng).id };
}

// La rutina que elige el jugador automático (el mismo criterio de siempre); la usa también la parada del mercado.
export function elegirRutinaAuto(state, rutinas, rng) {
  const p = BALANCE.practica;
  const urgenciaMental = clamp((p.autoMentalidadObjetivo - state.player.stats.mentalidad) / p.autoMentalidadObjetivo, 0, 1);
  const hayCupo = state.player.championPool.length < p.poolMaximo && campeonesAprendibles(state).length > 0;

  const pesos = {
    pulir: p.autoPesoPulir,
    nuevo: hayCupo ? p.autoPesoNuevo : 0.0001,
    mecanica: p.autoPesoMecanica,
    macro: p.autoPesoMacro,
    descansar: p.autoPesoDescanso + urgenciaMental * p.autoReaccionMentalidad
  };

  return elegirRutinaAutomatica(rutinas, pesos, rng);
}
