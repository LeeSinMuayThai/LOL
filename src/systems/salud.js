import { chance, gauss, roll, weightedPick } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { clampStat } from '../core/numeros.js';
import { registrarMomento } from '../core/registro.js';
import { BALANCE } from '../data/balance.js';

export const id = 'salud';

// Fase 10c (PLAN.md §10.4.2): la cadena causal de D9, por fin con un
// consumidor. `player.deudaSueno` (0-4, `amateur.deudaMaxima`) nunca se
// resetea al pasar a profesional — acá es lo que convierte años de robarle
// horas al sueño en la etapa amateur en una lesión real, más tarde. Cero RNG
// salvo el `chance()` final de cada tier, mismo armado que
// `probabilidadDeBurnout` de `atributos.js`: no hay nada que sortear hasta
// que el riesgo lleva sostenido lo suficiente.
//
// Tres tiers, todos sobre el mismo `flags.splitsRiesgoFisico`:
//   1. leve (túnel carpiano) — automática, un aviso: corta el techo de
//      mecánica pero no pide nada.
//   2. grave (tendinitis / hombro crónico) — decisión real: jugás lesionado
//      (baja corta, techo se corta fuerte) o parás a tratarte (baja larga,
//      techo se cuida más). La baja se mide en FECHAS de temporada regular
//      (`flags.fechasBajaLesion`, consumida en `systems/temporada.js`), nunca
//      en splits enteros — no hay pausa de motor.
//   3. recaída — la MISMA decisión, pero con la salida: seguís arriesgando o
//      te retirás (`retiro_por_lesion`, terminal, sin ventana de vuelta).

const NOMBRES_LESION_GRAVE = [
  { id: 'tendinitis_muneca', label: 'tendinitis de muñeca', peso: 6 },
  { id: 'hombro_cronico', label: 'hombro crónico', peso: 4 }
];
const LABEL_LESION_GRAVE = Object.fromEntries(NOMBRES_LESION_GRAVE.map((n) => [n.id, n.label]));

function riesgoSostenido(state) {
  const s = BALANCE.salud;
  const enRiesgo = state.player.deudaSueno >= s.deudaUmbralRiesgo;
  return enRiesgo
    ? state.flags.splitsRiesgoFisico + 1
    : Math.max(0, state.flags.splitsRiesgoFisico - 1);
}

// Cuánto extra de `deudaSueno` por encima del umbral empuja la probabilidad
// de ese split — más deuda acumulada en la etapa amateur, más rápido pincha.
function probabilidad(base, porDeuda, state) {
  return base + Math.max(0, state.player.deudaSueno - BALANCE.salud.deudaUmbralRiesgo) * porDeuda;
}

function rangoGauss(min, max, rng) {
  return Math.max(0, gauss((min + max) / 2, (max - min) / 4, rng));
}

// El techo solo puede bajar, nunca subir de nuevo (`?? Infinity`: sin lesión
// previa, no hay tope todavía).
function techoTrasPenalizacion(state, penalizacion) {
  const techoActual = state.player.techoLesionMecanica ?? Infinity;
  const propuesto = clampStat(state.player.stats.mecanica - penalizacion);
  return Math.min(techoActual, propuesto);
}

function lesionLeve(state, rng) {
  const s = BALANCE.salud;
  const techoLesionMecanica = techoTrasPenalizacion(state, rangoGauss(s.penalizacionLeveMin, s.penalizacionLeveMax, rng));
  const registro = registrarMomento(state.career.registro, {
    tipo: 'lesion_leve',
    anio: state.calendario.anio,
    edad: state.age,
    org: state.career.currentOrg,
    texto: 'El primer aviso físico: dolor de muñeca que no se va (túnel carpiano)'
  });

  return {
    state: {
      ...state,
      player: { ...state.player, techoLesionMecanica },
      career: { ...state.career, registro }
    },
    logs: [crearLog('salud', 'Empezás a sentir la muñeca. No es grave todavía, pero el cuerpo avisó primero.')]
  };
}

// Los textos de la lesión grave en el amateur: no hay equipo ni fechas; lo que se pierde es soloQ (regla 15).
const TEXTOS_AMATEUR = {
  descripcion: 'Esto ya no se va con hielo ni con un par de días de descanso. Seguís jugando la soloQ con dolor, o parás a tratarte en serio.',
  jugar: { label: 'Seguís jugando con dolor', descripcion: 'La soloQ no espera. Perdés menos turnos de ranked, pero el techo de tu mecánica se corta más.' },
  parar: { label: 'Parás a tratarte', descripcion: 'Kinesiología en serio. Perdés más turnos de ranked, pero la mano te dura más.' },
  recaida: 'Volvió, y esta vez pega distinto. ¿Seguís arriesgando el cuerpo, o dejás el sueño de ser pro acá?',
  retirarte: { label: 'Lo dejás acá', descripcion: 'No todo se juega con dolor. Te bajás antes de llegar a pro.' }
};

function decisionLesionGrave(rng, { recaida, amateur = false }) {
  const nombre = weightedPick(NOMBRES_LESION_GRAVE, (n) => n.peso, rng);

  if (amateur) {
    const t = TEXTOS_AMATEUR;
    const opciones = recaida
      ? [
          { id: 'seguir', label: 'Seguís arriesgando', descripcion: 'Una vez más. El cuerpo no avisa una tercera vez de la misma forma.' },
          { id: 'retirarte', ...t.retirarte }
        ]
      : [{ id: 'jugar_lesionado', ...t.jugar }, { id: 'parar_a_tratarte', ...t.parar }];
    return {
      tipo: 'opciones',
      bisagra: true,
      titulo: recaida ? `Otra vez la ${nombre.label}` : `Lesión: ${nombre.label}`,
      descripcion: recaida ? t.recaida : t.descripcion,
      opciones,
      datos: { motivo: 'lesion_grave', nombreLesion: nombre.id, recaida }
    };
  }

  if (!recaida) {
    return {
      tipo: 'opciones',
      bisagra: true,
      titulo: `Lesión: ${nombre.label}`,
      descripcion: 'Esto ya no se va con hielo ni con un par de días de descanso. Jugás lesionado, o parás a tratarte en serio.',
      opciones: [
        { id: 'jugar_lesionado', label: 'Jugás lesionado', descripcion: 'El equipo no puede esperar. Menos partidos perdidos, más daño acumulado.' },
        { id: 'parar_a_tratarte', label: 'Parás a tratarte', descripcion: 'Kinesiología en serio. Perdés más partidos, pero la mano te dura más.' }
      ],
      datos: { motivo: 'lesion_grave', nombreLesion: nombre.id, recaida: false }
    };
  }

  return {
    tipo: 'opciones',
    bisagra: true,
    titulo: `Otra vez la ${nombre.label}`,
    descripcion: 'Volvió, y esta vez pega distinto. ¿Seguís arriesgando el cuerpo, o cortás la carrera acá?',
    opciones: [
      { id: 'seguir', label: 'Seguís arriesgando', descripcion: 'Una vez más. El cuerpo no avisa una tercera vez de la misma forma.' },
      { id: 'retirarte', label: 'Cortás la carrera', descripcion: 'No todo se juega con dolor. Cerrás acá.' }
    ],
    datos: { motivo: 'lesion_grave', nombreLesion: nombre.id, recaida: true }
  };
}

// K6c-fix, sexta pasada (PLAN.md `3b8e034`, "K6c-fix, quinta pasada": para que "la lesión, solo en el amateur" sea verdad):
// la cadena corre también en el amateur, con los mismos umbrales. La deuda de sueño solo se escribe en el amateur y vuelve a 0 al
// firmar (`firmarConEquipo`), así que hoy la lesión es del que grindea sin dormir de amateur (la del pro, D83). En el amateur no
// hay fechas: la baja se cuenta en turnos de soloQ que se van a kinesiología y descanso (`amateur.js`, `conBajaPorLesion`), y el
// retiro por lesión es el fin del amateur, como el burnout o el castigo de la familia.
export function aplicar(state, rng) {
  if (state.phase !== 'profesional' && state.phase !== 'amateur') {
    return { state, logs: [] };
  }

  const s = BALANCE.salud;
  const splitsRiesgoFisico = riesgoSostenido(state);
  const conRiesgo = { ...state, flags: { ...state.flags, splitsRiesgoFisico } };

  const yaLesionLeve = conRiesgo.player.techoLesionMecanica != null;
  const yaLesionGrave = conRiesgo.flags.lesionGraveSplit != null;

  if (!yaLesionLeve) {
    if (splitsRiesgoFisico < s.splitsParaLesionLeve || !chance(probabilidad(s.probLesionLeveBase, s.probLesionLevePorDeuda, conRiesgo), rng)) {
      return { state: conRiesgo, logs: [] };
    }
    return lesionLeve(conRiesgo, rng);
  }

  if (!yaLesionGrave) {
    const umbral = s.splitsParaLesionLeve + s.splitsParaLesionGrave;
    if (splitsRiesgoFisico < umbral || !chance(probabilidad(s.probLesionGraveBase, s.probLesionGravePorDeuda, conRiesgo), rng)) {
      return { state: conRiesgo, logs: [] };
    }
    return { state: conRiesgo, logs: [], decision: decisionLesionGrave(rng, { recaida: false, amateur: state.phase === 'amateur' }) };
  }

  if (splitsRiesgoFisico < s.splitsParaReLesion || !chance(probabilidad(s.probReLesionBase, s.probReLesionPorDeuda, conRiesgo), rng)) {
    return { state: conRiesgo, logs: [] };
  }
  return { state: conRiesgo, logs: [], decision: decisionLesionGrave(rng, { recaida: true, amateur: state.phase === 'amateur' }) };
}

export function resolver(state, decision, respuesta, rng) {
  const { nombreLesion, recaida } = decision.datos;
  const label = LABEL_LESION_GRAVE[nombreLesion];
  const s = BALANCE.salud;

  const amateur = state.phase === 'amateur';

  if (recaida && respuesta.opcionId === 'retirarte') {
    const registro = registrarMomento(state.career.registro, {
      tipo: 'retiro_por_lesion',
      anio: state.calendario.anio,
      edad: state.age,
      org: state.career.currentOrg,
      texto: amateur
        ? `El cuerpo dijo basta: la ${label} te saca antes de llegar a pro`
        : `El cuerpo dijo basta: la ${label} te termina la carrera`
    });
    return {
      state: {
        ...state,
        phase: 'retirado',
        terminado: true,
        finAnticipado: 'retiro_por_lesion',
        career: { ...state.career, registro }
      },
      logs: [crearLog('salud', amateur
        ? `No da más. La ${label} te saca del juego a los ${state.age}: el sueño de ser pro se termina acá.`
        : `No da más. La ${label} te cierra la carrera a los ${state.age}.`)]
    };
  }

  const jugar = respuesta.opcionId === 'jugar_lesionado' || respuesta.opcionId === 'seguir';
  const penalizacion = jugar
    ? rangoGauss(s.penalizacionGraveJugarMin, s.penalizacionGraveJugarMax, rng)
    : rangoGauss(s.penalizacionGravePararMin, s.penalizacionGravePararMax, rng);
  const fechasBaja = jugar
    ? roll(s.fechasBajaJugarLesionadoMin, s.fechasBajaJugarLesionadoMax, rng)
    : roll(s.fechasBajaPararATratarteMin, s.fechasBajaPararATratarteMax, rng);

  const techoLesionMecanica = techoTrasPenalizacion(state, penalizacion);
  const registro = registrarMomento(state.career.registro, {
    tipo: 'lesion_grave',
    anio: state.calendario.anio,
    edad: state.age,
    org: state.career.currentOrg,
    texto: `${label[0].toUpperCase()}${label.slice(1)}: ${jugar ? 'seguiste jugando lesionado' : 'paraste a tratarte'}`
  });
  const turnos = `${fechasBaja} ${fechasBaja === 1 ? 'turno' : 'turnos'} de soloQ`;

  return {
    state: {
      ...state,
      player: { ...state.player, techoLesionMecanica },
      flags: {
        ...state.flags,
        // Se resetea: la recaída se mide desde ACÁ, no desde el arranque de
        // la carrera (trampa T6 en miniatura — no comparar contra un reloj
        // viejo).
        splitsRiesgoFisico: 0,
        lesionGraveSplit: state.player.splitCount,
        fechasBajaLesion: state.flags.fechasBajaLesion + fechasBaja
      },
      career: { ...state.career, registro }
    },
    logs: [crearLog('salud', amateur
      ? (jugar
        ? `Seguís jugando con ${label}. La soloQ no espera, pero igual se te van ${turnos} en hielo y descanso; el techo de tu mecánica paga el resto.`
        : `Parás a tratarte la ${label} en serio: ${turnos} de las próximas semanas se van a kinesiología y descanso. La mano te va a durar más.`)
      : (jugar
        ? `Decidís jugar con ${label}. El equipo te necesita ahora; el cuerpo cobra después.`
        : `Parás a tratarte la ${label} en serio. Perdés partidos, pero la mano te va a durar más.`))]
  };
}

export function resolverAuto(state, decision) {
  // Alguien con criterio no juega con el cuerpo roto sin necesidad (mismo
  // espíritu que `retiro.js`: acepta el veredicto físico en vez de negarlo).
  return { opcionId: decision.datos.recaida ? 'retirarte' : 'parar_a_tratarte' };
}
