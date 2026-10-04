import { gauss } from '../core/rng.js';
import { crearLog, adjuntar } from '../core/log.js';
import { clampStat } from '../core/numeros.js';
import { pulirCampeon, aprenderCampeones } from '../core/pool.js';
import { recuperarPorDescanso } from '../core/barras.js';
import { conMarcasDeRutina } from '../core/curvas.js';
import { BALANCE } from '../data/balance.js';
import { rutinaPorId, planPorId, PLAN_POR_DEFECTO } from '../core/rutinas.js';
import { opcionDesdeRutina } from '../core/rareza.js';
import { statsDeCurva, conTechoDeLesion } from '../core/curvas.js';

export const id = 'practica';

// La version profesional del recurso escaso de CONCEPTO §3. En la etapa amateur
// la atencion son bloques de tiempo; aca son puntos de preparacion entre
// splits. Es tambien la unica forma de recuperar mentalidad una vez que ya no
// administras tus propias horas de sueño.
//
// K4c (plan anual, decisión del usuario 2026-10-03): la práctica ya no frena. El cierre de año fija el plan del año
// siguiente (`player.planAnual`, uno de `data/rutinas/planes.json`: el juego, la cabeza o la marca) y cada split pro
// entrena solo según ese plan: los `BALANCE.practica.puntos` del año, repartidos entre los
// `BALANCE.edad.splitsPorEdad` splits (`tramoDelPlan`). El total del año es el mismo reparto que antes elegía el
// jugador en la pretemporada; lo que cambia es quién lo decide (el cierre) y cuándo se aplica (de a tramos).

const DESTINOS = [
  { id: 'pulir', label: 'Pulir tu campeón principal' },
  { id: 'nuevo', label: 'Aprender un campeón nuevo' },
  { id: 'mecanica', label: 'Entrenar mecánica' },
  { id: 'macro', label: 'Estudiar macro' },
  { id: 'descansar', label: 'Descansar' }
];

const IDS_DESTINO = DESTINOS.map((destino) => destino.id);

// El plan vigente. Un guardado anterior al plan anual no trae el campo: entrena con el de por defecto.
export function planVigente(state) {
  return planPorId(state.player.planAnual) ?? planPorId(PLAN_POR_DEFECTO);
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

// K4c (plan anual): el tramo de un split. El reparto del año del plan (normalizado a `BALANCE.practica.puntos`) se
// despliega en una secuencia de puntos, de a uno por destino en ronda (el destino con más puntos primero; en empate, el
// orden de `DESTINOS`), y el split en la posición `posicion` del año (0 = la pretemporada) toma su parte de esa
// secuencia. La suma de los tramos de un año es exactamente el reparto del plan. Puro, sin rng.
export function tramoDelPlan(plan, posicion) {
  const puntos = BALANCE.practica.puntos;
  const splits = BALANCE.edad.splitsPorEdad;
  const anual = repartoDeRutina(plan);
  const restantes = { ...anual };
  const orden = [...IDS_DESTINO].sort((a, b) => anual[b] - anual[a]);
  const secuencia = [];
  while (secuencia.length < puntos) {
    for (const destino of orden) {
      if (restantes[destino] > 0) {
        secuencia.push(destino);
        restantes[destino] -= 1;
      }
    }
  }
  const tramo = Object.fromEntries(IDS_DESTINO.map((destino) => [destino, 0]));
  for (const destino of secuencia.slice(Math.round((posicion * puntos) / splits), Math.round(((posicion + 1) * puntos) / splits))) {
    tramo[destino] += 1;
  }
  return tramo;
}

// K4c (plan anual): lo que la carta del cierre dice de un plan, en una línea (regla 15: sale de `cartaDeRutina`, la
// misma cuenta que el motor aplica). Lo pinta `components/decision.js` debajo de cada opción del cierre.
export function lineaDePlan(state, planId) {
  const plan = planPorId(planId);
  if (!plan) {
    return null;
  }
  const carta = cartaDeRutina(state, plan);
  // K4c (revisión): una stat que ya está en su tope (o a menos de medio punto) no promete "~+0": dice que no hay más para sumar.
  const partes = carta.efectos.map((efecto) => (Math.round(efecto.esperado) >= 1 ? `${efecto.etiqueta} ~+${Math.round(efecto.esperado)}` : `${efecto.etiqueta} ya en su tope`));
  if (carta.pulir > 0) partes.push('pulir tu main');
  if (carta.nuevo > 0) partes.push(carta.nuevo > 1 ? `${carta.nuevo} campeones nuevos` : 'un campeón nuevo');
  return { id: plan.id, titulo: plan.titulo, texto: `Plan del año que viene: ${plan.titulo} (${partes.join(', ')}).` };
}

// K4c (plan anual): cada split pro entrena solo, con el tramo del plan vigente. No frena nunca: la pretemporada queda
// para el mercado. La línea es `adjunto` (legible, sin beat propio): es el resumen del split el que la dice.
export function aplicar(state, rng) {
  if (state.phase !== 'profesional') {
    return { state, logs: [] };
  }
  const plan = planVigente(state);
  const posicion = state.player.splitCount % BALANCE.edad.splitsPorEdad;
  const hecho = entrenar(state, tramoDelPlan(plan, posicion), plan, rng);
  const detalle = hecho.partes.length > 0 ? hecho.partes.join(', ') : 'nada que se note';
  // K4c (revisión): el renglón dice que es un tramo del plan del año, no el plan entero ("tramo 1 de 3").
  const tramo = `tramo ${posicion + 1} de ${BALANCE.edad.splitsPorEdad}`;
  return {
    state: hecho.state,
    logs: [adjuntar(crearLog('practica', `Entrenaste según el plan del año: ${plan.titulo} (${tramo}: ${detalle}).`))]
  };
}

// Un guardado de VERSION 10 puede estar parado en la pausa de la pretemporada que el plan anual quitó (`core/guardado.js`,
// `migrarDe10`, la reemplaza por un solo botón). Seguir cierra esa pausa entrenando el tramo de este split, que es lo que
// la pausa dejaba pendiente. `aplicar` ya no devuelve nunca una decisión: esto solo contesta la que traía el guardado viejo.
export function resolver(state, decision, respuesta, rng) {
  return aplicar(state, rng);
}

export function resolverAuto() {
  return { opcionId: 'seguir' };
}

// El reparto anual entero de una rutina (o de un plan), de una vez: la vara de la carta (regla 15) y de los checks de K3.
// El motor aplica el plan de a tramos con `entrenar`; sin ruido, la suma de los tramos es esto mismo.
export function resolverPreparacion(state, rutinas, rutinaId, rng) {
  const rutina = rutinaPorId(rutinas, rutinaId);
  const hecho = entrenar(state, repartoDeRutina(rutina), rutina, rng);
  return {
    state: hecho.state,
    logs: [crearLog('practica', `Offseason: ${hecho.partes.length > 0 ? hecho.partes.join(', ') : 'no aprovechaste el receso'}.`, { tecnico: true })]
  };
}

// Un reparto de puntos ya entero (sin normalizar), aplicado. `rutina` es la rutina o el plan: su título es el nombre
// visible de la marca que deja.
export function entrenar(state, reparto, rutina, rng) {
  const p = BALANCE.practica;
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
  // permanente, con la marca a nombre de la rutina (o del plan). Lo que un techo de lesión recorta no es una pérdida
  // de la práctica: solo cuentan las ganancias.
  const conStats = { ...state, player: { ...state.player, championPool: aprendido.pool, stats } };
  return { state: conMarcasDeRutina(conStats, state.player.stats, rutina.titulo), partes };
}
