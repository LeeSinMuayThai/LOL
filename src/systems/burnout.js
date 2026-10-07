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
// la chance (`probabilidadDeBurnout`, la misma que tira `atributos.js`) no es 0. Corre también en el split de la firma.
//
// Qué reusa: la cuenta del dado (`riesgoDeBurnoutAlCierre`), el camino del descanso del receso (`recuperarPorDescanso`, con su tope)
// para lo que sube la mentalidad, y `conPermanencia` (el de los eventos y las decisiones) para lo que cuesta en mecánica.
//
// Vuelve a frenar solo con riesgo nuevo (revisión de K6d-B): cada aviso cubre los cierres que mostró, con su mentalidad y su %
// (`flags.mentalAvisadaPro`: la carta de la oferta que firmaste cubre dos, el de la firma y el siguiente; esta parada, el de su
// split). Un cierre con el dado vivo que ningún aviso cubrió con su % es riesgo nuevo y frena, aunque vengas de otra parada o de la
// carta de la firma: una racha larga en rojo frena en cada cierre con el dado vivo. Dentro de lo cubierto, vuelve a frenar solo si
// la mentalidad proyectada queda más de `burnout.mentalNueva` por debajo de lo mostrado. Los cierres ya pasados se olvidan.
//
// Frena con o sin club: el dado del cierre tira igual para un agente libre. Sin club no hay staff a quien pedirle días: la opción
// que cuida en serio es desconectarte, y cuesta en las manos.
export const id = 'burnout';

const media = (min, max) => (min + max) / 2;

// Lo que mueve cada opción que cuida la cabeza (los rangos de `BALANCE.burnout`) y qué cuesta (`mecanica` o `jerarquia`).
function efectoDe(opcionId) {
  const b = BALANCE.burnout;
  if (opcionId === 'bajar_carga') {
    return { rango: b.bajarCarga, costo: 'mecanica', min: b.bajarCarga.mecanicaMin, max: b.bajarCarga.mecanicaMax };
  }
  if (opcionId === 'pedir_descanso') {
    return { rango: b.pedirDescanso, costo: 'jerarquia', min: b.pedirDescanso.jerarquiaMin, max: b.pedirDescanso.jerarquiaMax };
  }
  return { rango: b.desconectar, costo: 'mecanica', min: b.desconectar.mecanicaMin, max: b.desconectar.mecanicaMax };
}

// Las tres opciones, con su cierre proyectado (la media de lo que mueve cada una). La carta las ordena de menos a más costo: a igual
// chance, `opcionQueNoQuema` se queda con la primera. Con club, la tercera es pedirle días al staff; sin club, desconectarte.
export function opcionesDeLaParada(state) {
  const m = state.player.stats.mentalidad;
  const conMedia = (opcionId) => {
    const { rango } = efectoDe(opcionId);
    return riesgoDeBurnoutAlCierre(state, { mentalidad: recuperarPorDescanso(m, media(rango.mentalidadMin, rango.mentalidadMax)) });
  };
  const descanso = state.career.currentOrg ? 'pedir_descanso' : 'desconectar';
  return [
    { id: 'seguir', cierre: riesgoDeBurnoutAlCierre(state) },
    { id: 'bajar_carga', cierre: conMedia('bajar_carga') },
    { id: descanso, cierre: conMedia(descanso) }
  ];
}

// Los cierres que ya te avisaron (`flags.mentalAvisadaPro`): [{ split, mentalidad, probabilidad }], con `split` el `player.splitCount`
// del split que cierra y lo que el aviso mostró para la opción que elegiste. Un guardado de antes de la revisión puede no traerlo.
export function cierresAvisados(state) {
  const avisos = state.flags.mentalAvisadaPro;
  return Array.isArray(avisos) ? avisos : [];
}

// El aviso que cubre el cierre de este split, si lo hay.
export function avisoDelCierre(state) {
  return cierresAvisados(state).find((aviso) => aviso.split === state.player.splitCount) ?? null;
}

// Suma los cierres que un aviso acaba de mostrar (pisan al aviso viejo del mismo cierre) y olvida los que ya pasaron.
export function conCierresAvisados(state, nuevos) {
  const actual = state.player.splitCount;
  const quedan = cierresAvisados(state).filter((aviso) => aviso.split >= actual && !nuevos.some((nuevo) => nuevo.split === aviso.split));
  const mentalAvisadaPro = [...quedan, ...nuevos].sort((a, b) => a.split - b.split);
  return { ...state, flags: { ...state.flags, mentalAvisadaPro } };
}

const ETIQUETAS = {
  seguir: 'Seguir como venís',
  bajar_carga: 'Bajar la carga',
  pedir_descanso: 'Pedirle unos días al staff',
  desconectar: 'Desconectarte unos días'
};

function descripcionDe(state, opcionId, cierre) {
  const alCierre = `Cerrás el split con la mentalidad en ${textoDelCierre(cierre)}.`;
  if (opcionId === 'seguir') {
    return `No cambia nada: le seguís metiendo como hasta ahora. ${alCierre}`;
  }
  const { rango: r, min, max } = efectoDe(opcionId);
  const sube = `mentalidad +${r.mentalidadMin} a +${r.mentalidadMax}`;
  if (opcionId === 'bajar_carga') {
    const que = state.career.currentOrg ? 'Menos scrims y menos soloQ' : 'Menos soloQ';
    return `${que} hasta el cierre: la cabeza respira (${sube}) y las manos pierden ritmo (mecánica -${min} a -${max}). ${alCierre}`;
  }
  if (opcionId === 'pedir_descanso') {
    return `Un par de días afuera del equipo: la cabeza se acomoda en serio (${sube}), pero te perdés scrims y el suplente las juega por vos (jerarquía -${min} a -${max}). ${alCierre}`;
  }
  return `Sin club no hay staff a quien pedirle días: apagás la PC y te desconectás. La cabeza se acomoda en serio (${sube}) y las manos se oxidan (mecánica -${min} a -${max}). ${alCierre}`;
}

function textoDelAviso(aviso) {
  if (!aviso) {
    return '';
  }
  return aviso.probabilidad > 0
    ? ` Ya lo habías visto (~${entero(aviso.mentalidad)}) y la cabeza siguió cayendo.`
    : ` La última carta te mostró este cierre en ~${entero(aviso.mentalidad)}, sin burnout en el sorteo; la cabeza siguió cayendo y ahora el dado puede pinchar.`;
}

function decisionDeLaParada(state, opciones, aviso) {
  const { burnoutMentalBajo, burnoutSplitsMinimos } = BALANCE.atributos;
  const racha = state.flags.splitsMentalBajo ?? 0;
  const splits = racha === 1 ? 'el último split' : `los últimos ${racha} splits`;
  const seguir = opciones[0].cierre;
  return {
    tipo: 'opciones',
    titulo: `La cabeza en rojo — mentalidad ${entero(state.player.stats.mentalidad)}`,
    descripcion: `Cerraste ${splits} con la mentalidad en zona roja (${burnoutMentalBajo} o menos). Con ${burnoutSplitsMinimos} splits seguidos en rojo `
      + `el dado del burnout entra al sorteo al cierre: si seguís así, cerrás con ${textoDelCierre(seguir)}.${textoDelAviso(aviso)}`,
    opciones: opciones.map((opcion) => ({
      id: opcion.id,
      label: ETIQUETAS[opcion.id],
      descripcion: descripcionDe(state, opcion.id, opcion.cierre),
      riesgoBurnout: opcion.cierre.probabilidad,
      mentalidadAlCierre: opcion.cierre.mentalidad
    })),
    datos: {
      motivo: 'burnout_pro',
      split: state.player.splitCount,
      mostrado: Object.fromEntries(opciones.map((opcion) => [opcion.id, opcion.cierre.mentalidad]))
    }
  };
}

// La parada frena si el dado del cierre puede pinchar y ningún aviso cubrió este cierre con su % (o la mentalidad cayó más de
// `mentalNueva` debajo de lo que mostró). Con o sin club. Puro, sin `rng` (T1: el early return no lo toca).
export function paradaDelBurnout(state) {
  if (state.phase !== 'profesional') {
    return null;
  }
  const opciones = opcionesDeLaParada(state);
  const seguir = opciones[0].cierre;
  if (seguir.probabilidad === 0) {
    return null;
  }
  const aviso = avisoDelCierre(state);
  if (aviso && aviso.probabilidad > 0 && seguir.mentalidad >= aviso.mentalidad - BALANCE.burnout.mentalNueva) {
    return null;
  }
  return decisionDeLaParada(state, opciones, aviso);
}

// El contrato del registro pide `(state, rng)`: la parada no tira nada (T1).
// eslint-disable-next-line no-unused-vars
export function aplicar(state, rng) {
  // Los cierres ya pasados se olvidan: lo que cubrían ya se tiró.
  const pasados = cierresAvisados(state).some((aviso) => aviso.split < state.player.splitCount);
  const base = pasados || !Array.isArray(state.flags.mentalAvisadaPro) ? conCierresAvisados(state, []) : state;
  const decision = paradaDelBurnout(base);
  return decision ? { state: base, logs: [], decision } : { state: base, logs: [] };
}

// El efecto de cada opción es el que dice la carta (regla 15): el rango se tira acá (regla 7), y lo que se mostró para la opción
// elegida cubre el cierre de este split.
export function resolver(state, decision, respuesta, rng) {
  const opcion = decision.opciones.find((op) => op.id === respuesta.opcionId) ?? decision.opciones[0];
  const split = decision.datos.split ?? state.player.splitCount;
  const conAviso = conCierresAvisados(state, [{ split, mentalidad: opcion.mentalidadAlCierre, probabilidad: opcion.riesgoBurnout }]);

  if (opcion.id === 'seguir') {
    return {
      state: conAviso,
      logs: [crearLog('salud', 'Seguís como venías, con la cabeza en rojo: el dado del burnout queda en el sorteo del cierre.')]
    };
  }

  const { rango, costo, min, max } = efectoDe(opcion.id);
  const mentalidad = conAviso.player.stats.mentalidad;
  const sube = roll(rango.mentalidadMin, rango.mentalidadMax, rng);
  const pierde = roll(min, max, rng);
  const stats = { ...conAviso.player.stats, mentalidad: recuperarPorDescanso(mentalidad, sube) };
  const cabeza = `mentalidad ${entero(mentalidad)} → ${entero(stats.mentalidad)}`;

  if (costo === 'jerarquia') {
    return {
      state: {
        ...conAviso,
        player: { ...conAviso.player, stats },
        career: { ...conAviso.career, jerarquia: clampStat(conAviso.career.jerarquia - pierde) }
      },
      logs: [crearLog('salud', `Le pediste unos días al staff y te los dieron: la cabeza se acomoda (${cabeza}), pero el suplente jugó las scrims por vos (jerarquía -${pierde}).`)]
    };
  }

  const mecanica = conAviso.player.stats.mecanica;
  const conMecanica = { ...stats, mecanica: clampStat(mecanica - pierde) };
  const movido = { ...conAviso, player: { ...conAviso.player, stats: conMecanica } };
  const texto = opcion.id === 'bajar_carga'
    ? `Bajaste la carga hasta el cierre: la cabeza respira (${cabeza}) y las manos lo notan (mecánica -${pierde}).`
    : `Apagaste la PC unos días: la cabeza se acomoda (${cabeza}) y las manos se oxidan (mecánica -${pierde}).`;
  return {
    state: conPermanencia(movido, 'mecanica', conMecanica.mecanica - mecanica, ETIQUETAS[opcion.id]),
    logs: [crearLog('salud', texto)]
  };
}

// Tu perfil elige la opción que no quema (la de menos burnout; a igual chance, la de menos costo), como en el amateur.
// eslint-disable-next-line no-unused-vars
export function resolverAuto(state, decision, rng) {
  return { opcionId: opcionQueNoQuema(decision) };
}
