import { roll } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { entero } from '../core/formato.js';
import { clampStat } from '../core/numeros.js';
import { recuperarPorDescanso } from '../core/barras.js';
import { conPermanencia } from '../core/curvas.js';
import { riesgoDeBurnoutAlCierre, textoDelCierre, opcionQueNoQuema } from './atributos.js';
import { BALANCE } from '../data/balance.js';

// K6d-B (D77, "el pro frena con la mentalidad en rojo", decisión del usuario 2026-10-07). Es la regla del amateur de K6c-fix
// (quinta pasada, `mentalEnRojoDeLaSemana` de `systems/amateur.js`) llevada a la carrera pro.
//
// Dónde frena: justo antes de `atributos` en `ETAPAS_SPLIT`, después de `events`. El dado del burnout corre al cierre, en
// `atributos.js`, y acá ya se movió todo lo que mueve la mentalidad en el split (los resultados en `rendimiento` y `serie`, el
// Mundial, los eventos): la proyección (`riesgoDeBurnoutAlCierre`, sin el dado) es la más cercana a lo que el dado va a tirar. Frena
// cuando ese dado puede pinchar: la racha en rojo (`flags.splitsMentalBajo`) llega al mínimo con la mentalidad proyectada al cierre y
// la chance (`probabilidadDeBurnout`, la misma que tira `atributos.js`) no es 0. Corre también en el split de la firma: un amateur
// que firma con el riesgo a la vista dejó su vara en `flags.mentalAvisadaPro`.
//
// Qué reusa: la cuenta del dado (`riesgoDeBurnoutAlCierre`), el camino del descanso del receso (`recuperarPorDescanso`, con su tope)
// para lo que sube la mentalidad, y `conPermanencia` (el de los eventos y las decisiones) para lo que cuesta en mecánica.
//
// Vuelve a frenar solo con riesgo nuevo: con algo ya visto en esta racha (`flags.mentalAvisadaPro`, lo que la carta mostró para la
// opción que elegiste), frena si la mentalidad proyectada queda más de `burnout.mentalNueva` por debajo. Si la mentalidad sale de
// rojo (la racha vuelve a 0), lo visto se olvida.
export const id = 'burnout';

const media = (min, max) => (min + max) / 2;

// Las tres opciones, con su cierre proyectado (la media de lo que mueve cada una). La carta las ordena de menos a más costo: a igual
// chance, `opcionQueNoQuema` se queda con la primera.
export function opcionesDeLaParada(state) {
  const b = BALANCE.burnout;
  const m = state.player.stats.mentalidad;
  return [
    { id: 'seguir', cierre: riesgoDeBurnoutAlCierre(state) },
    {
      id: 'bajar_carga',
      cierre: riesgoDeBurnoutAlCierre(state, { mentalidad: recuperarPorDescanso(m, media(b.bajarCarga.mentalidadMin, b.bajarCarga.mentalidadMax)) })
    },
    {
      id: 'pedir_descanso',
      cierre: riesgoDeBurnoutAlCierre(state, { mentalidad: recuperarPorDescanso(m, media(b.pedirDescanso.mentalidadMin, b.pedirDescanso.mentalidadMax)) })
    }
  ];
}

const ETIQUETAS = {
  seguir: 'Seguir como venís',
  bajar_carga: 'Bajar la carga',
  pedir_descanso: 'Pedirle unos días al staff'
};

function descripcionDe(opcionId, cierre) {
  const { bajarCarga: c, pedirDescanso: d } = BALANCE.burnout;
  const alCierre = `Cerrás el split con la mentalidad en ${textoDelCierre(cierre)}.`;
  if (opcionId === 'bajar_carga') {
    return `Menos scrims y menos soloQ hasta el cierre: la cabeza respira (mentalidad +${c.mentalidadMin} a +${c.mentalidadMax}) y las manos pierden ritmo (mecánica -${c.mecanicaMin} a -${c.mecanicaMax}). ${alCierre}`;
  }
  if (opcionId === 'pedir_descanso') {
    return `Un par de días afuera del equipo: la cabeza se acomoda en serio (mentalidad +${d.mentalidadMin} a +${d.mentalidadMax}), pero te perdés scrims y el suplente suma minutos (jerarquía -${d.jerarquiaMin} a -${d.jerarquiaMax}). ${alCierre}`;
  }
  return `No cambia nada: le seguís metiendo como hasta ahora. ${alCierre}`;
}

function decisionDeLaParada(state, opciones, vara) {
  const { burnoutMentalBajo, burnoutSplitsMinimos } = BALANCE.atributos;
  const racha = state.flags.splitsMentalBajo ?? 0;
  const splits = racha === 1 ? 'el último split' : `los últimos ${racha} splits`;
  const seguir = opciones[0].cierre;
  const contra = vara !== null ? ` Ya lo habías visto (~${entero(vara)}) y la cabeza siguió cayendo.` : '';
  return {
    tipo: 'opciones',
    titulo: `La cabeza en rojo — mentalidad ${entero(state.player.stats.mentalidad)}`,
    descripcion: `Cerraste ${splits} con la mentalidad en zona roja (${burnoutMentalBajo} o menos). Con ${burnoutSplitsMinimos} splits seguidos en rojo `
      + `el dado del burnout entra al sorteo al cierre: si seguís así, cerrás con ${textoDelCierre(seguir)}.${contra}`,
    opciones: opciones.map((opcion) => ({
      id: opcion.id,
      label: ETIQUETAS[opcion.id],
      descripcion: descripcionDe(opcion.id, opcion.cierre),
      riesgoBurnout: opcion.cierre.probabilidad,
      mentalidadAlCierre: opcion.cierre.mentalidad
    })),
    datos: {
      motivo: 'burnout_pro',
      mostrado: Object.fromEntries(opciones.map((opcion) => [opcion.id, opcion.cierre.mentalidad]))
    }
  };
}

// La parada frena si el dado del cierre puede pinchar y no es algo que ya viste. Puro, sin `rng` (T1: el early return no lo toca).
export function paradaDelBurnout(state) {
  if (state.phase !== 'profesional' || !state.career.currentOrg) {
    return null;
  }
  const opciones = opcionesDeLaParada(state);
  const seguir = opciones[0].cierre;
  if (seguir.probabilidad === 0) {
    return null;
  }
  const vara = state.flags.mentalAvisadaPro ?? null;
  if (vara !== null && seguir.mentalidad >= vara - BALANCE.burnout.mentalNueva) {
    return null;
  }
  return decisionDeLaParada(state, opciones, vara);
}

// El contrato del registro pide `(state, rng)`: la parada no tira nada (T1).
// eslint-disable-next-line no-unused-vars
export function aplicar(state, rng) {
  // Fuera de la racha en rojo, lo visto se olvida: la próxima entrada en rojo vuelve a ser nueva.
  const base = (state.flags.mentalAvisadaPro ?? null) !== null && (state.flags.splitsMentalBajo ?? 0) === 0
    ? { ...state, flags: { ...state.flags, mentalAvisadaPro: null } }
    : state;
  const decision = paradaDelBurnout(base);
  return decision ? { state: base, logs: [], decision } : { state: base, logs: [] };
}

// El efecto de cada opción es el que dice la carta (regla 15): el rango se tira acá (regla 7), y lo que se mostró para la opción
// elegida queda como la vara del "riesgo nuevo".
export function resolver(state, decision, respuesta, rng) {
  const opcionId = decision.datos.mostrado[respuesta.opcionId] !== undefined ? respuesta.opcionId : 'seguir';
  const conVara = { ...state, flags: { ...state.flags, mentalAvisadaPro: decision.datos.mostrado[opcionId] } };
  const { bajarCarga: c, pedirDescanso: d } = BALANCE.burnout;
  const mentalidad = conVara.player.stats.mentalidad;

  if (opcionId === 'bajar_carga') {
    const sube = roll(c.mentalidadMin, c.mentalidadMax, rng);
    const pierde = roll(c.mecanicaMin, c.mecanicaMax, rng);
    const mecanica = conVara.player.stats.mecanica;
    const stats = { ...conVara.player.stats, mentalidad: recuperarPorDescanso(mentalidad, sube), mecanica: clampStat(mecanica - pierde) };
    const movido = { ...conVara, player: { ...conVara.player, stats } };
    return {
      state: conPermanencia(movido, 'mecanica', stats.mecanica - mecanica, ETIQUETAS.bajar_carga),
      logs: [crearLog('salud', `Bajaste la carga hasta el cierre: la cabeza respira (mentalidad ${entero(mentalidad)} → ${entero(stats.mentalidad)}) y las manos lo notan (mecánica -${pierde}).`)]
    };
  }

  if (opcionId === 'pedir_descanso') {
    const sube = roll(d.mentalidadMin, d.mentalidadMax, rng);
    const pierde = roll(d.jerarquiaMin, d.jerarquiaMax, rng);
    const jerarquia = conVara.career.jerarquia;
    const stats = { ...conVara.player.stats, mentalidad: recuperarPorDescanso(mentalidad, sube) };
    return {
      state: {
        ...conVara,
        player: { ...conVara.player, stats },
        career: { ...conVara.career, jerarquia: clampStat(jerarquia - pierde) }
      },
      logs: [crearLog('salud', `Le pediste unos días al staff y te los dieron: la cabeza se acomoda (mentalidad ${entero(mentalidad)} → ${entero(stats.mentalidad)}), pero el suplente sumó scrims (jerarquía -${pierde}).`)]
    };
  }

  return {
    state: conVara,
    logs: [crearLog('salud', 'Seguís como venías, con la cabeza en rojo: el dado del burnout queda en el sorteo del cierre.')]
  };
}

// Tu perfil elige la opción que no quema (la de menos burnout; a igual chance, la de menos costo), como en el amateur.
// eslint-disable-next-line no-unused-vars
export function resolverAuto(state, decision, rng) {
  return { opcionId: opcionQueNoQuema(decision) };
}
