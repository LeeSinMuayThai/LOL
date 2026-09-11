import { gauss } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { clampStat } from '../core/numeros.js';
import { calcularContexto } from '../core/contexto.js';
import { registrarMomento } from '../core/registro.js';
import { BALANCE } from '../data/balance.js';

export const id = 'servicioMilitar';

// Fase 10c (PLAN.md §10.4.1, CONCEPTO §12.4): "determinista, no
// probabilístico" — cero RNG en el disparo. Solo aplica a jugadores de
// `mundo.regionIdOrigen === 'KR'`.
//
// Dos decisiones del usuario, tomadas en el momento (regla de proceso 2/7):
// la lesión grave del sistema hermano cuesta partidos, no splits — acá el
// equivalente es que el servicio NO modela tiempo que pasa. Nada de splits
// vacíos ni de un salto narrativo con años que corren solos: son 3
// decisiones encadenadas (mismo patrón que `decisionDeclive`/
// `decisionVuelta` de `retiro.js`, o el draft de fecha marcada de
// `temporada.js`) que resuelven DENTRO del split en curso —
// `player.splitCount` solo lo mueve `atributos.js`, más abajo en
// `ETAPAS_SPLIT`, así que la cadena entera pasa antes de que el split
// "avance" en ningún sentido medible. Y hay un skip real: ganar un
// internacional siendo coreano es, a estos efectos, la medalla de los Asian
// Games — te exime (hecho real: el oro de 2022 eximió al plantel coreano).

function rangoGauss(min, max, rng) {
  return gauss((min + max) / 2, (max - min) / 4, rng);
}

function esFiguraDeElite(state) {
  // Reusa 9W: estuviste en el Top 20 del ranking mundial alguna vez. `0` =
  // nunca rankeado (`core/registro.js` → `registrarPicoRank`).
  return state.career.registro.picos.rankMundial > 0;
}

function edadLimite(state) {
  const s = BALANCE.servicioMilitar;
  return esFiguraDeElite(state) ? s.edadLimiteServicioElite : s.edadLimiteServicio;
}

function decisionTeVas() {
  return {
    tipo: 'opciones',
    bisagra: true,
    titulo: 'Te vas al servicio militar',
    descripcion: 'Te llegó la fecha. Dieciocho a veintiún meses fuera del circuito, sin vuelta atrás sobre el hecho — solo sobre cómo te vas.',
    opciones: [
      { id: 'despedida_publica', label: 'Despedida pública', descripcion: 'Un comunicado, una foto con el plantel. El club lo agradece; a vos te cuesta un poco más soltarlo.' },
      { id: 'salida_discreta', label: 'Salida discreta', descripcion: 'Cerrás la puerta sin ruido. Menos despedida, menos vueltas en la cabeza.' }
    ],
    datos: { motivo: 'servicio_te_vas' }
  };
}

function decisionAdentro() {
  return {
    tipo: 'opciones',
    bisagra: true,
    titulo: 'Adentro',
    descripcion: 'El cuartel tiene sus huecos. ¿Qué hacés con ellos?',
    opciones: [
      { id: 'te_mantenes_afilado', label: 'Te mantenés afilado a escondidas', descripcion: 'Cada minuto libre es para no perder la mano. Es agotador y no siempre alcanza.' },
      { id: 'te_desconectas', label: 'Te desconectás en serio', descripcion: 'Dejás el juego de lado del todo. Cuando vuelvas, vas a tener que reconstruir desde ahí.' }
    ],
    datos: { motivo: 'servicio_adentro' }
  };
}

function decisionVolver() {
  return {
    tipo: 'opciones',
    bisagra: true,
    titulo: 'Volver',
    descripcion: 'Estás de vuelta. Tu lugar en el vestuario se sintió ocupado todo este tiempo — un rookie viene ganando terreno.',
    opciones: [
      { id: 'insistis_con_tu_lugar', label: 'Insistís con tu lugar', descripcion: 'Volvés a pelearlo desde el día uno, sin dar nada por perdido.' },
      { id: 'dejas_que_se_acomode', label: 'Dejás que se acomode solo', descripcion: 'Le bajás el volumen a la pelea de entrada. Menos fricción, menos terreno recuperado.' }
    ],
    datos: { motivo: 'servicio_volver' }
  };
}

export function aplicar(state, rng) {
  if (state.mundo.regionIdOrigen !== 'KR' || state.phase !== 'profesional') {
    return { state, logs: [] };
  }

  // La exención se revisa siempre, no solo en pretemporada: ganar un
  // internacional puede pasar en cualquier ventana, y una vez exento no
  // tiene sentido seguir corriendo el resto de este sistema ningún split más.
  if (!state.flags.exentoServicio && !state.flags.servicioCumplido) {
    const ganoInternacional = state.career.registro.internacionales.some((entrada) => entrada.resultado === 'buen_papel');
    if (ganoInternacional) {
      const registro = registrarMomento(state.career.registro, {
        tipo: 'exento_servicio',
        anio: state.calendario.anio,
        edad: state.age,
        org: state.career.currentOrg,
        texto: 'La medalla de los Asian Games te exime del servicio militar'
      });
      return {
        state: { ...state, flags: { ...state.flags, exentoServicio: true }, career: { ...state.career, registro } },
        logs: [crearLog('servicioMilitar', 'Ganaste con la selección en los Asian Games: la medalla te exime del servicio.')]
      };
    }
  }

  if (state.flags.exentoServicio || state.flags.servicioCumplido || state.flags.enServicioMilitar) {
    return { state, logs: [] };
  }

  // Trampa T2: el contexto se calcula en vivo, nunca se confía en el cache.
  if (calcularContexto(state).ventana !== 'pretemporada') {
    return { state, logs: [] };
  }

  if (state.age < edadLimite(state)) {
    return { state, logs: [] };
  }

  // Sin pregunta sobre el hecho de ir — mismo criterio que la línea Faker de
  // `retiro.js`: no hay nada que elegir ahí (regla 1). La cadena de 3
  // decisiones arranca acá.
  return {
    state: { ...state, flags: { ...state.flags, enServicioMilitar: true } },
    logs: [crearLog('servicioMilitar', `A los ${state.age} te llega la citación. Servicio militar obligatorio: te vas.`)],
    decision: decisionTeVas()
  };
}

export function resolver(state, decision, respuesta, rng) {
  const { motivo } = decision.datos;

  if (motivo === 'servicio_te_vas') {
    const publico = respuesta.opcionId === 'despedida_publica';
    const stats = {
      ...state.player.stats,
      mentalidad: clampStat(state.player.stats.mentalidad + rangoGauss(publico ? -3 : -1, publico ? -1 : 1, rng))
    };
    const career = { ...state.career, arraigo: clampStat(state.career.arraigo + rangoGauss(publico ? 1 : 0, publico ? 3 : 1, rng)) };
    return {
      state: { ...state, player: { ...state.player, stats }, career },
      logs: [crearLog('servicioMilitar', publico
        ? 'El club te hace una despedida en condiciones. Se agradece, aunque cortar así cuesta más.'
        : 'Te vas sin vueltas. Menos ceremonia, más liviano.')],
      decision: decisionAdentro()
    };
  }

  if (motivo === 'servicio_adentro') {
    const afilado = respuesta.opcionId === 'te_mantenes_afilado';
    const stats = {
      ...state.player.stats,
      mecanica: clampStat(state.player.stats.mecanica + rangoGauss(afilado ? -3 : -7, afilado ? -1 : -4, rng)),
      mentalidad: clampStat(state.player.stats.mentalidad + rangoGauss(afilado ? -4 : 2, afilado ? -1 : 5, rng))
    };
    return {
      state: { ...state, player: { ...state.player, stats } },
      logs: [crearLog('servicioMilitar', afilado
        ? 'Cada minuto libre lo gastás intentando no perder la mano. Te cuesta la cabeza, pero volvés menos oxidado.'
        : 'Dejás el juego de lado del todo. Descansás de verdad; la mano la vas a tener que reconstruir.')],
      decision: decisionVolver()
    };
  }

  // motivo === 'servicio_volver' — cierra la cadena.
  const insistis = respuesta.opcionId === 'insistis_con_tu_lugar';
  const career = {
    ...state.career,
    jerarquia: clampStat(state.career.jerarquia + rangoGauss(insistis ? 1 : -3, insistis ? 4 : -1, rng)),
    registro: registrarMomento(state.career.registro, {
      tipo: 'servicio_militar',
      anio: state.calendario.anio,
      edad: state.age,
      org: state.career.currentOrg,
      texto: 'Volviste del servicio militar'
    })
  };
  const stats = { ...state.player.stats, mentalidad: clampStat(state.player.stats.mentalidad + rangoGauss(insistis ? -2 : 1, insistis ? 1 : 3, rng)) };

  return {
    state: {
      ...state,
      player: { ...state.player, stats },
      career,
      flags: { ...state.flags, enServicioMilitar: false, servicioCumplido: true }
    },
    logs: [crearLog('servicioMilitar', insistis
      ? 'Volvés a pelear tu lugar desde el primer día. No te lo regalan, pero tampoco te resignás.'
      : 'Dejás que la pelea por el puesto se acomode sola. Vas a tener que recuperar terreno después.')]
  };
}

export function resolverAuto(state, decision) {
  // Alguien con criterio prioriza sostener la carrera por sobre el gesto: la
  // salida discreta, mantenerse afilado, e insistir por el lugar.
  const { motivo } = decision.datos;
  if (motivo === 'servicio_te_vas') {
    return { opcionId: 'salida_discreta' };
  }
  if (motivo === 'servicio_adentro') {
    return { opcionId: 'te_mantenes_afilado' };
  }
  return { opcionId: 'insistis_con_tu_lugar' };
}
