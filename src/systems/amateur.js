import { gauss, roll, chance, weightedPick } from '../core/rng.js';
import { BALANCE } from '../data/balance.js';
import { crearLog } from '../core/log.js';
import { deltaCorto, entero, lista } from '../core/formato.js';
import { clamp, clampStat } from '../core/numeros.js';
import { probabilidadDeFirmarTrasPrueba } from '../core/serie.js';
import { aplicarLPAlEstado, etiquetaDeRanked, servidorDeLaPartida, rangoAproximado, esApice, bandaDeLadder } from '../core/ranked.js';
import { multiplicadorDeMeta } from '../core/ajusteMeta.js';
import { registrarEnHistorial } from '../core/contexto.js';
import { resolverTexto } from '../core/plantillas.js';
import { ofrecerRutinas, rutinaPorId, elegirRutinaAutomatica } from '../core/rutinas.js';
import { opcionDesdeRutina, descripcionDeSorteo, EJE_AMATEUR } from '../core/rareza.js';
import { elegirOrgTier3, asignarOrgTier3 } from '../core/tier3.js';
import { elegirMinijuego, minijuegoPorId, textoDeMinijuego, registrarMinijuegoVisto } from '../core/minijuegos.js';
import { conMarcasDeRutina } from '../core/curvas.js';
import { esCierreDeEdad } from './edadCierre.js';
import { nombreVisibleDeLiga } from '../core/ligas.js';
import { opcionDelPerfil, nombreDePerfil } from '../core/perfil.js';
import { etiquetaCampo } from '../core/selectors.js';

export const id = 'amateur';

const DESTINOS = [
  { id: 'ranked', label: 'Rankeds' },
  { id: 'estudiar', label: 'Estudiar' },
  { id: 'dormir', label: 'Dormir' },
  { id: 'familia', label: 'Familia' }
];

const IDS_DESTINO = DESTINOS.map((destino) => destino.id);

// Cuanto más arriba estás, más te cuesta subir: arriba te toca gente mejor.
// El freno no es un tope arbitrario — es la distancia entre tu nivel real y el
// que exige el rango donde estás parado. Por eso el potencial oculto termina
// decidiendo tu techo de ladder sin que se le diga nunca al jugador: lo intuye
// cuando el LP deja de moverse.
function factorDeAltura(state) {
  const a = BALANCE.amateur;
  const exigido = (state.player.soloqElo / a.puntosEscaleraCompleta) * BALANCE.stats.max;
  const holgura = (state.player.stats.mecanica - exigido) / a.escalaNivelLadder;

  return clamp(a.alturaFactorBase + holgura, a.alturaFactorMin, a.alturaFactorMax);
}

// K6a-A: la parte sin dado de un bloque de ranked (la misma que usa `lpDeUnBloque`): con ella la carta de la semana
// dice cuánto LP rinde cada opción antes de elegir.
function factorDeBloque(state) {
  const a = BALANCE.amateur;
  const { mecanica, mentalidad } = state.player.stats;

  const factorMecanica = a.lpFactorMecanicaBase + (mecanica / BALANCE.stats.max) * a.lpFactorMecanicaRango;
  const factorMentalidad = a.lpFactorMentalidadBase + (mentalidad / BALANCE.stats.max) * a.lpFactorMentalidadRango;
  const penalDeuda = 1 - Math.min(a.lpPenalPorDeudaMax, state.player.deudaSueno * a.lpPenalPorDeuda);
  // Si el meta pide lo que dominás, el mismo grindeo rinde el doble de LP.
  const factorMeta = multiplicadorDeMeta(state.meta.ajuste);

  return factorMecanica * factorMentalidad * penalDeuda * factorMeta * factorDeAltura(state);
}

function lpDeUnBloque(state, rng) {
  const a = BALANCE.amateur;
  return gauss(a.lpPorBloque, a.lpPorBloqueSpread, rng) * factorDeBloque(state);
}

// La probabilidad de cada banda crece a medida que los estudios bajan, y se
// multiplica por lo estrictos que salieron los viejos y por la confianza que
// queda. No hay un numero exacto donde pincha: se puede zafar con la barra por
// el piso y se puede pinchar con la barra a medias.
function probBanda(estudios, umbral, pendiente, techo) {
  if (estudios >= umbral) {
    return 0;
  }
  return Math.min(techo, (umbral - estudios) / pendiente);
}

function multiplicadorFamiliar(state) {
  const a = BALANCE.amateur;
  const estrictez = (BALANCE.stats.max - state.origen.toleranciaViejos) / a.toleranciaReferencia;
  const modTrust = clamp(
    1 + (a.trustReferencia - state.player.familyTrust) * a.trustPesoEnRiesgo,
    a.trustModMin,
    a.trustModMax
  );
  return estrictez * modTrust;
}

function textoDeSituacion(state) {
  const a = BALANCE.amateur;
  const partes = [];

  if (state.player.deudaSueno >= a.robosParaDeuda) {
    partes.push('Arrastrás deuda de sueño: los reflejos no responden igual.');
  } else if (state.flags.robosConsecutivos > 0) {
    partes.push('Venís durmiendo de menos y el cuerpo lo empieza a marcar.');
  }

  if (state.player.studies < a.confiscacionUmbral) {
    partes.push('En casa el boletín ya es tema de conversación.');
  } else if (state.player.studies < a.avisoUmbral) {
    partes.push('El colegio te empieza a quedar grande.');
  }

  if (state.flags.nocturno) {
    partes.push('Con el nocturno te sobra tiempo de día.');
  }

  return partes.length > 0 ? partes.join(' ') : 'Semana normal: colegio, casa y la compu esperando.';
}

function bloquesDisponibles(state) {
  return BALANCE.amateur.bloquesBase + (state.flags.nocturno ? BALANCE.amateur.nocturnoBloquesExtra : 0);
}

// --- K6a-A (D-B): la semana la resuelve tu perfil ---
//
// "Cómo vivís la semana" era la parada de cada semana (22 de las 38 de una carrera del ensayo de K6). Ahora la elige tu
// perfil con la misma regla que un evento chico (`opcionDelPerfil`, sobre la previa de cada opción) y queda en la
// crónica; frena solo si lo que elegiría tu perfil te mete en un riesgo que otra de las opciones evita.

// Lo que una rutina mueve en una semana, sin el dado: la media de cada término de `aplicarReparto`.
function proyeccionDeSemana(state, rutina) {
  const a = BALANCE.amateur;
  const { reparto, extra } = normalizarReparto(state, { reparto: rutina.reparto, extra: rutina.extra });
  const factorColegio = state.origen.exigenciaColegio / a.exigenciaColegioReferencia;
  const factorNocturno = state.flags.nocturno ? a.nocturnoFactorDecaeEstudio : 1;
  const estudios = reparto.estudiar * a.estudioPorBloque - a.estudioDecae * factorColegio * factorNocturno;
  const brecha = Math.max(0, a.confianzaEstudioUmbral - (state.player.studies + estudios));
  const robos = extra > 0 ? (state.flags.robosConsecutivos ?? 0) + 1 : 0;
  const penalAcumulada = 1 + Math.max(0, robos - 1) * a.penalRoboConsecutivo;
  return {
    extra,
    robos,
    lp: reparto.ranked * a.lpPorBloque * factorDeBloque(state),
    estudios,
    sueno: reparto.dormir * a.suenoPorBloque - a.suenoDecae - extra * a.suenoPorBloqueRobado,
    confianza: reparto.familia * a.familiaPorBloque - a.confianzaDecae - brecha * a.confianzaEstudioPenal,
    mentalidad: -extra * a.mentalidadPorBloqueRobado * penalAcumulada
  };
}

function magnitudDeSemana(valorAbsoluto, banda) {
  if (valorAbsoluto < banda.p33) return 'baja';
  if (valorAbsoluto < banda.p66) return 'media';
  return 'alta';
}

// La previa de una opción de la semana, con el número que el motor ya conoce ("SoloQ ~+180 LP", "Estudios ~-8"): la
// misma forma que la de un evento (`core/previa.js`), así la lee el perfil y la pinta la carta.
function previaDeSemana(proy) {
  const { ladder, barra } = BALANCE.amateur.semanaMagnitud;
  const filas = [
    ['player.ranked', proy.lp, ladder, ' LP'],
    ['player.studies', proy.estudios, barra, ''],
    ['player.sleep', proy.sueno, barra, ''],
    ['player.familyTrust', proy.confianza, barra, ''],
    ['player.stats.mentalidad', proy.mentalidad, barra, '']
  ];
  return filas
    .filter(([, valor]) => Math.round(valor) !== 0)
    .map(([campo, valor, banda, unidad]) => ({
      campo,
      etiqueta: etiquetaCampo(campo),
      signo: valor >= 0 ? '+' : '-',
      magnitud: magnitudDeSemana(Math.abs(valor), banda),
      valor: Math.round(valor),
      texto: `${etiquetaCampo(campo)} ~${deltaCorto(valor)}${unidad}`
    }));
}

// Robarle horas al sueño es la única fuente de varianza propia de la semana (deuda, mentalidad): sin robo, seguro.
function riesgoDeSemana(proy) {
  return proy.extra > 0 ? 'incierto' : 'seguro';
}

// Qué arriesga una opción: la chance de que en casa te saquen la PC o te corten el ranked después de esta semana (la
// misma cuenta que `evaluarRiesgoFamiliar`, con el colegio proyectado) y si suma deuda de sueño. Con la negociación
// ganada, el colegio deja de pesar en casa.
function riesgoDeCasa(state, estudios) {
  const a = BALANCE.amateur;
  const multiplicador = multiplicadorFamiliar(state);
  const corte = Math.min(a.riesgoTotalTecho, probBanda(estudios, a.corteUmbral, a.cortePendiente, a.corteTecho) * multiplicador);
  const confiscacion = Math.min(
    a.riesgoTotalTecho,
    probBanda(estudios, a.confiscacionUmbral, a.confiscacionPendiente, a.confiscacionTecho) * multiplicador
  );
  return corte + (1 - corte) * confiscacion;
}

function peligrosDeSemana(state, proy) {
  const estudiosDespues = state.player.studies + proy.estudios;
  return {
    casa: state.flags.negociacionGanada ? 0 : riesgoDeCasa(state, estudiosDespues),
    deuda: proy.robos >= BALANCE.amateur.robosParaDeuda,
    estudiosDespues
  };
}

function opcionesDeSemana(state, rutinas) {
  return rutinas.map((rutina) => {
    const proy = proyeccionDeSemana(state, rutina);
    return { rutina, proy, previa: previaDeSemana(proy), riesgo: riesgoDeSemana(proy), peligro: peligrosDeSemana(state, proy) };
  });
}

// Lo que está en juego, dicho con los números de la regla: por qué esta semana te frena.
function textoDeLoQueEstaEnJuego(elegida, masSegura) {
  const partes = [];
  if (elegida.peligro.casa > masSegura.peligro.casa) {
    partes.push(`te deja el colegio en ~${entero(elegida.peligro.estudiosDespues)}: ${porcentaje(elegida.peligro.casa)} de que en casa te saquen la PC o te corten el ranked, contra ${porcentaje(masSegura.peligro.casa)} con "${masSegura.rutina.titulo}"`);
  }
  if (elegida.peligro.deuda) {
    partes.push(`sería la semana ${elegida.proy.robos} seguida robándole horas al sueño: empezás a sumar deuda y el LP lo nota`);
  }
  return `Tu perfil iba a ir por "${elegida.rutina.titulo}", y eso ${partes.join('; y ')}.`;
}

function decisionDeRutina(state, rutinas, opciones, elegida, masSegura) {
  return {
    tipo: 'opciones',
    titulo: `Cómo vivís la semana — ${etiquetaDeRanked(state.player.ranked, servidorDeLaPartida(state))}`,
    descripcion: descripcionDeSorteo(rutinas.length, EJE_AMATEUR, `${textoDeLoQueEstaEnJuego(elegida, masSegura)} ${textoDeSituacion(state)}`),
    opciones: opciones.map((opcion) => ({
      ...opcionDesdeRutina(opcion.rutina, 'amateur'),
      previa: opcion.previa
    })),
    datos: { motivo: 'reparto', rutinas }
  };
}

// La semana con estas rutinas: la que elige tu perfil y si frena. Frena si la elegida sube el riesgo en casa al menos
// `semanaRiesgoEvitable` por encima de la opción más segura, o si suma deuda de sueño y otra opción no. Exportada
// para que `validate.js` la pruebe con rutinas fijas (sin depender de qué ofreció el sorteo).
export function planDeSemana(state, rutinas) {
  const opciones = opcionesDeSemana(state, rutinas);
  const { id: elegidaId } = opcionDelPerfil(state.player.perfil, opciones.map((opcion) => ({
    id: opcion.rutina.id, previa: opcion.previa, riesgo: opcion.riesgo
  })));
  const elegida = opciones.find((opcion) => opcion.rutina.id === elegidaId);
  const masSegura = opciones.reduce((mejor, opcion) => (opcion.peligro.casa < mejor.peligro.casa ? opcion : mejor));
  const casaEvitable = elegida.peligro.casa - masSegura.peligro.casa >= BALANCE.amateur.semanaRiesgoEvitable;
  const deudaEvitable = elegida.peligro.deuda && opciones.some((opcion) => !opcion.peligro.deuda);
  const frena = casaEvitable || deudaEvitable;
  return {
    elegida: elegida.rutina,
    frena,
    decision: frena ? decisionDeRutina(state, rutinas, opciones, elegida, masSegura) : null
  };
}

// La semana de la etapa amateur: la que elige tu perfil, o una parada si eso te mete en un riesgo evitable.
function semanaAmateur(state, rng) {
  const rutinas = ofrecerRutinas(state, rng, { pool: 'amateur' });
  const plan = planDeSemana(state, rutinas);
  if (plan.frena) {
    return { state, logs: [], decision: plan.decision };
  }
  return vivirLaSemana(state, plan.elegida, rng, { cronica: state.player.perfil.actual });
}

// El reparto de una rutina, el riesgo familiar y la búsqueda de una salida: lo mismo si la elegiste vos (la parada) o
// tu perfil (`cronica`: la línea de la semana pasa a la crónica, con quién la eligió).
function vivirLaSemana(state, rutina, rng, { cronica = null } = {}) {
  // `normalizarReparto` sigue corriendo: es la red que garantiza que una
  // rutina mal declarada no invente ni pierda bloques, y la que adapta un
  // reparto de 10 a los 12 bloques del nocturno.
  const { reparto, extra } = normalizarReparto(state, { reparto: rutina.reparto, extra: rutina.extra });
  const rRepartoCrudo = aplicarReparto(state, reparto, extra, rng, { cronica, opcion: rutina.titulo });
  // K3-B 2b: la semana amateur también deja marca, por el mismo camino que el receso (`conMarcasDeRutina`: la
  // fracción de la práctica, el título visible de la rutina, la ganancia real). Hoy ningún reparto mueve un stat de
  // curva, así que no anota nada; el día que uno lo mueva, la marca sale sola.
  const rReparto = { ...rRepartoCrudo, state: conMarcasDeRutina(rRepartoCrudo.state, state.player.stats, rutina.titulo) };
  const rRiesgo = evaluarRiesgoFamiliar(rReparto.state, rng);
  const logs = [...rReparto.logs, ...rRiesgo.logs];

  if (rRiesgo.state.terminado) {
    return { state: rRiesgo.state, logs };
  }

  const salida = buscarSalida(rRiesgo.state, rng);
  return salida ? { state: rRiesgo.state, logs, decision: salida } : { state: rRiesgo.state, logs };
}

// `pesoAuto` es lo que elegiria alguien con criterio: lo usa la simulacion
// masiva para medir el juego en vez del ruido. No se muestra al jugador.
//
// `datosExtra` viaja junto al motivo hasta `resolver`: sin esto, una decision
// que nombra una org en el titulo ("Fulano Gaming te quiere") y la vuelve a
// sortear al resolverse puede terminar firmando con una org DISTINTA de la
// que le mostró al jugador — dos tiradas de rng para lo que tendría que ser
// una sola elección.
function decisionDeOpciones(titulo, descripcion, opciones, motivo, datosExtra = {}) {
  return { tipo: 'opciones', titulo, descripcion, opciones, datos: { motivo, ...datosExtra } };
}

// --- El periodo con la PC confiscada: perdes el periodo entero ---

function periodoSinPC(state, rng) {
  const a = BALANCE.amateur;

  return {
    state: {
      ...state,
      player: {
        ...state.player,
        studies: clampStat(state.player.studies + roll(a.sinPCEstudioMin, a.sinPCEstudioMax, rng)),
        familyTrust: clampStat(state.player.familyTrust + roll(a.sinPCTrustMin, a.sinPCTrustMax, rng)),
        sleep: clampStat(state.player.sleep + roll(a.sinPCSuenoMin, a.sinPCSuenoMax, rng)),
        stats: {
          ...state.player.stats,
          mentalidad: clampStat(state.player.stats.mentalidad + roll(a.sinPCMentalidadMin, a.sinPCMentalidadMax, rng))
        },
        deudaSueno: 0
      },
      flags: { ...state.flags, pcConfiscada: state.flags.pcConfiscada - 1, robosConsecutivos: 0 }
    },
    logs: [crearLog('amateur', 'Sin PC en casa: el periodo se te fue en colegio y sobremesas. Descansaste, pero no tocaste el ranked.')]
  };
}

// --- Reparto de bloques ---

function normalizarReparto(state, respuesta) {
  const bloques = bloquesDisponibles(state);
  const pedido = respuesta?.reparto ?? {};
  const extra = clamp(Math.round(respuesta?.extra ?? 0), 0, BALANCE.amateur.bloquesExtraMax);

  const crudo = Object.fromEntries(IDS_DESTINO.map((destino) => [destino, Math.max(0, Math.round(pedido[destino] ?? 0))]));
  const pedidos = IDS_DESTINO.reduce((suma, destino) => suma + crudo[destino], 0);
  const disponibles = bloques + extra;

  if (pedidos === 0) {
    // Nadie reparte nada: el tiempo igual pasa, y se va en dormir.
    return { reparto: { ...crudo, dormir: disponibles }, extra };
  }

  // Se respeta la proporcion pedida y se ajusta al total real de bloques, asi
  // una respuesta mal formada nunca inventa ni pierde tiempo.
  const escala = disponibles / pedidos;
  const ajustado = Object.fromEntries(IDS_DESTINO.map((destino) => [destino, Math.floor(crudo[destino] * escala)]));

  let sobrante = disponibles - IDS_DESTINO.reduce((suma, destino) => suma + ajustado[destino], 0);
  const porPrioridad = [...IDS_DESTINO].sort((a, b) => crudo[b] - crudo[a]);
  for (let i = 0; sobrante > 0; i = (i + 1) % porPrioridad.length, sobrante -= 1) {
    ajustado[porPrioridad[i]] += 1;
  }

  return { reparto: ajustado, extra };
}

function aplicarReparto(state, reparto, extra, rng, { cronica = null, opcion = null } = {}) {
  const a = BALANCE.amateur;
  const logs = [];

  const lpGanado = Math.round(
    Array.from({ length: reparto.ranked }, () => lpDeUnBloque(state, rng)).reduce((suma, lp) => suma + lp, 0)
  );

  // Deriva pasiva: los estudios caen solos, y caen mas en un colegio exigente.
  const factorColegio = state.origen.exigenciaColegio / a.exigenciaColegioReferencia;
  const factorNocturno = state.flags.nocturno ? a.nocturnoFactorDecaeEstudio : 1;
  const caidaEstudio = Math.max(0, gauss(a.estudioDecae, a.estudioDecaeSpread, rng)) * factorColegio * factorNocturno;
  const caidaSueno = Math.max(0, gauss(a.suenoDecae, a.suenoDecaeSpread, rng));

  // La confianza familiar esta acoplada a los estudios: cae sola y cae mas
  // rapido cuanto peor va el colegio.
  const estudiosDespues = state.player.studies + reparto.estudiar * a.estudioPorBloque - caidaEstudio;
  const brechaEstudios = Math.max(0, a.confianzaEstudioUmbral - estudiosDespues);
  const caidaTrust = Math.max(0, gauss(a.confianzaDecae, a.confianzaDecaeSpread, rng)) + brechaEstudios * a.confianzaEstudioPenal;

  // Robarle al sueño cuesta mentalidad, y el costo es acumulativo.
  const robosConsecutivos = extra > 0 ? (state.flags.robosConsecutivos ?? 0) + 1 : 0;
  const penalAcumulada = 1 + Math.max(0, robosConsecutivos - 1) * a.penalRoboConsecutivo;
  const costoMentalidad = extra * a.mentalidadPorBloqueRobado * penalAcumulada;
  const deudaSueno = clamp(
    robosConsecutivos >= a.robosParaDeuda ? state.player.deudaSueno + 1 : Math.max(0, state.player.deudaSueno - 1),
    0,
    a.deudaMaxima
  );

  const player = {
    ...state.player,
    studies: clampStat(estudiosDespues),
    sleep: clampStat(state.player.sleep + reparto.dormir * a.suenoPorBloque - caidaSueno - extra * a.suenoPorBloqueRobado),
    familyTrust: clampStat(state.player.familyTrust + reparto.familia * a.familiaPorBloque - caidaTrust),
    deudaSueno,
    stats: {
      ...state.player.stats,
      mentalidad: clampStat(state.player.stats.mentalidad - costoMentalidad)
    }
  };

  // El LP se aplica sobre la escalera real: promociona, desciende y renombra el
  // rango solo. El log dice el rango, no un número abstracto.
  const conEscalera = aplicarLPAlEstado(
    { ...state, player, flags: { ...state.flags, robosConsecutivos } },
    lpGanado,
    rng
  );
  const servidor = servidorDeLaPartida(conEscalera);

  // El pie del periodo: primero donde quedaste en la escalera (que es lo que te
  // importa) y despues que costo. Los deltas van todos con signo — antes los
  // negativos lo tenian y los positivos no, y se leia como una errata.
  const cuerpo = `${deltaCorto(lpGanado)} LP → ${etiquetaDeRanked(conEscalera.player.ranked, servidor)}.`;
  const costos = lista([
    `${reparto.ranked} bloques al ranked`,
    reparto.estudiar > 0 ? `${reparto.estudiar} al colegio` : null,
    reparto.dormir > 0 ? `${reparto.dormir} a dormir` : null,
    reparto.familia > 0 ? `${reparto.familia} a la familia` : null,
    extra > 0 ? `${extra} robados al sueño` : null
  ]);
  const efectos = lista([
    `estudios ${deltaCorto(player.studies - state.player.studies)}`,
    `sueño ${deltaCorto(player.sleep - state.player.sleep)}`,
    `confianza ${deltaCorto(player.familyTrust - state.player.familyTrust)}`
  ]);

  // K6a-A: la semana que eligió tu perfil va a la crónica (la misma forma que un evento chico, `systems/events.js`):
  // quién eligió, qué rutina y lo que pasó.
  if (cronica) {
    const perfil = nombreDePerfil(cronica);
    logs.push(crearLog('amateur', `La semana: Como ${perfil.toLowerCase()}: ${opcion}. ${costos}. ${cuerpo} (${efectos})`, {
      cronica: true, titulo: 'La semana', descripcion: '', opcion, perfil, cuerpo: `${costos}. ${cuerpo}`, efectos
    }));
  } else {
    logs.push(crearLog('amateur', `${costos}. ${cuerpo} (${efectos})`, {
      titulo: 'La semana',
      cuerpo: `${costos}. ${cuerpo}`,
      efectos
    }));
  }

  if (deudaSueno >= a.robosParaDeuda && state.player.deudaSueno < a.robosParaDeuda) {
    logs.push(crearLog('amateur', 'Entraste en deuda de sueño: te cuesta encontrar la ventana, y el LP lo nota.'));
  }

  // En la etapa amateur "cómo te fue" es cuánto LP hiciste contra lo que se
  // espera de un split normal. Alimenta el momentum del contexto.
  const conHistorial = registrarEnHistorial(
    conEscalera,
    (lpGanado / a.lpReferenciaHistorial) * (BALANCE.stats.max / 2)
  );

  return { state: conHistorial, logs };
}

// --- Bandas de riesgo familiar ---

function evaluarRiesgoFamiliar(state, rng) {
  const a = BALANCE.amateur;

  if (state.flags.negociacionGanada) {
    return { state, logs: [] };
  }

  const multiplicador = multiplicadorFamiliar(state);
  const estudios = state.player.studies;

  const probCorte = Math.min(a.riesgoTotalTecho, probBanda(estudios, a.corteUmbral, a.cortePendiente, a.corteTecho) * multiplicador);
  if (chance(probCorte, rng)) {
    return {
      state: { ...state, phase: 'retirado', terminado: true, finAnticipado: 'prohibicion_familiar' },
      logs: [crearLog('amateur', 'Se terminó: en tu casa decidieron que el ranked se acabó, y esta vez no hay vuelta atrás.')]
    };
  }

  const probConfiscacion = Math.min(
    a.riesgoTotalTecho,
    probBanda(estudios, a.confiscacionUmbral, a.confiscacionPendiente, a.confiscacionTecho) * multiplicador
  );
  if (chance(probConfiscacion, rng)) {
    return {
      state: {
        ...state,
        player: {
          ...state.player,
          familyTrust: clampStat(state.player.familyTrust - roll(a.confiscacionCostoTrustMin, a.confiscacionCostoTrustMax, rng))
        },
        flags: { ...state.flags, pcConfiscada: a.periodosSinPC }
      },
      logs: [crearLog('amateur', 'Te confiscaron la PC. El próximo periodo lo vas a mirar desde afuera.')]
    };
  }

  const probAviso = Math.min(a.riesgoTotalTecho, probBanda(estudios, a.avisoUmbral, a.avisoPendiente, a.avisoTecho) * multiplicador);
  if (chance(probAviso, rng)) {
    return {
      state: {
        ...state,
        player: {
          ...state.player,
          familyTrust: clampStat(state.player.familyTrust - roll(a.avisoCostoTrustMin, a.avisoCostoTrustMax, rng))
        },
        flags: { ...state.flags, avisos: (state.flags.avisos ?? 0) + 1 }
      },
      logs: [crearLog('amateur', 'Llegó el aviso del colegio y en casa te lo hicieron saber.')]
    };
  }

  return { state, logs: [] };
}

// --- Las tres salidas ---

// A un prospecto no lo fichan por estar "alto de elo": lo fichan por estar
// arriba de la ladder de su servidor, y muy joven. El caso canónico es Calix,
// rank 1 de Corea a los 16. Estar en Challenger #250 a los 22 no te ficha nadie.
//
// Por eso el gate no es un umbral de LP sino la posición: Máster/Gran Máster te
// abre la puerta de un equipo chico, Challenger la de uno serio, y el top de la
// ladder la de una org de primera.
export function nivelDeInteres(state) {
  const a = BALANCE.amateur;
  const servidor = servidorDeLaPartida(state);
  const { ranked } = state.player;

  // La altura pura la resuelve `bandaDeLadder`, que es la misma que gatea el
  // contenido. Acá solo se le suma la condición de edad, que es propia del
  // scouting: el mismo puesto a los 16 y a los 22 no vale lo mismo.
  const banda = bandaDeLadder(ranked, servidor);

  if (banda === 'apice') {
    return 'apice';
  }
  if (banda !== 'elite') {
    return null;
  }

  const puesto = rangoAproximado(ranked, servidor);
  return puesto <= a.puestoParaOrgGrande && state.age <= a.edadParaOrgGrande ? 'elite' : 'challenger';
}

function probabilidadDeScouting(state) {
  const a = BALANCE.amateur;

  if (state.player.splitCount < a.splitMinimoScouting) {
    return 0;
  }

  const base = a.scoutingProbPorNivel[nivelDeInteres(state)];
  if (!base) {
    return 0;
  }

  // El hype corre la probabilidad pero no la crea: sin ladder no hay fichaje.
  const avanceHype = clamp(state.player.stats.hype / a.hypeReferenciaScouting, 0, 1);
  const sesgoEtario = a.scoutingSesgoEtario[state.age] ?? a.scoutingSesgoEtarioMinimo;

  return base * (a.scoutingPesoBase + avanceHype * a.scoutingPesoHype) * sesgoEtario;
}

// A quién te fichan la primera vez (fase 3). Nadie debuta directo en una liga
// real: CONCEPTO §2 dice "sos el rookie, no decidís casi nada", y eso empieza
// acá. La única excepción es el caso Calix (CONCEPTO §12.2): estar en el
// top absoluto de Challenger y todavía joven te salta el tramo de probarte en
// un equipo de tier 3 y te lleva directo a una liga de desarrollo real.
function ligaTier2DeLaRegion(state) {
  return state.mundo.ligas.find((liga) => liga.tier === 2 && liga.regionId === state.mundo.regionIdOrigen) ?? null;
}

function orgQueTeFicha(state, rng) {
  if (nivelDeInteres(state) === 'elite') {
    const ligaTier2 = ligaTier2DeLaRegion(state);
    if (ligaTier2) {
      // Cuanto mas fuerte la org, menos probable que arriesgue el lugar en un
      // pibe sin partidas oficiales todavia.
      const org = weightedPick(ligaTier2.orgs, (candidata) => BALANCE.stats.max - candidata.fuerza, rng);
      return { org, tier: 2, liga: ligaTier2 };
    }
  }

  return { org: elegirOrgTier3(state, rng), tier: 3, liga: null };
}

function porcentaje(p) {
  return `${Math.round(p * BALANCE.stats.max)}%`;
}

// La charla con los viejos: la confianza y las notas inclinan la balanza (CONCEPTO §8: la corren, no la deciden).
function probabilidadDeNegociacion(state) {
  return (state.player.familyTrust + state.player.studies) / (BALANCE.stats.max * 2);
}

function buscarSalida(state, rng) {
  const a = BALANCE.amateur;

  if (chance(probabilidadDeScouting(state), rng)) {
    const { org, tier, liga } = orgQueTeFicha(state, rng);
    const descripcion = tier === 2
      ? `Te vieron en la ladder: ${etiquetaDeRanked(state.player.ranked, servidorDeLaPartida(state))}. Estás tan arriba que ${nombreVisibleDeLiga(liga.id)} te ofrece saltearte el tramo de probarte en un equipo chico.`
      : `Te vieron en la ladder: ${etiquetaDeRanked(state.player.ranked, servidorDeLaPartida(state))}. Es un equipo de tier 3, chico y de paso: contrato mínimo, mudanza a la gaming house y dejar el colegio a mitad de camino.`;

    // K6a-A: cada opción dice qué arriesga y qué gana (la prueba antes de firmar en tier 3, el hype del "no").
    return decisionDeOpciones(
      `${org.nombre} te quiere`,
      descripcion,
      [
        {
          id: 'firmar',
          label: `Firmar con ${org.nombre}`,
          descripcion: tier === 2
            ? `Firmás directo en ${nombreVisibleDeLiga(liga.id)}: se termina la etapa amateur.`
            : 'Antes de firmar hay una prueba: si te sale, firmás y se termina la etapa amateur; si no, seguís en la escalera.',
          pesoAuto: 7
        },
        {
          id: 'esperar_mejor_oferta',
          label: 'Agradecer y seguir grindeando por algo más grande',
          descripcion: 'Te quedás en la ladder esperando una oferta mejor, que puede no llegar: cada año te miran menos.',
          pesoAuto: 3
        }
      ],
      'oferta',
      { org, tier, liga: liga?.id ?? null }
    );
  }

  // Llegar a Master con la confianza familiar todavia en pie abre la
  // negociacion: es la unica salida que no depende de que alguien te elija.
  // Llegar a Máster con la confianza familiar en pie abre la negociación: es la
  // única salida que no depende de que alguien te elija.
  if (!state.flags.negociacionGanada && esApice(state.player.ranked) && state.player.familyTrust >= a.negociacionTrustMinimo) {
    const p = probabilidadDeNegociacion(state);
    return decisionDeOpciones(
      'Máster: la charla que venías pateando',
      `Llegaste a Máster y en tu casa lo saben. Es el momento de sentarte a negociar en serio, o de dejarlo pasar una vez más. Sale bien con ${porcentaje(p)}: lo deciden tu confianza familiar (${entero(state.player.familyTrust)}) y tus notas (${entero(state.player.studies)}).`,
      [
        {
          id: 'plantear_el_tema',
          label: 'Sentarte a plantearlo de una vez',
          descripcion: `${porcentaje(p)} de que salga bien: te bancan el intento y el colegio deja de ser motivo para sacarte la PC (confianza +${a.negociacionBienTrustMin} a +${a.negociacionBienTrustMax}). Si sale mal, confianza -${a.negociacionMalTrustMin} a -${a.negociacionMalTrustMax}.`,
          pesoAuto: 7
        },
        {
          id: 'no_arriesgar',
          label: 'No arriesgar la paz de casa todavía',
          descripcion: 'No cambia nada: la charla queda para más adelante y el colegio sigue pesando en casa.',
          pesoAuto: 3
        }
      ],
      'negociacion'
    );
  }

  if (!state.flags.nocturno && state.player.studies < a.nocturnoEstudiosUmbral) {
    return decisionDeOpciones(
      'Pasarte a nocturno',
      `Con estas notas (${entero(state.player.studies)}), el turno noche te libera las tardes enteras. En casa lo van a leer como una rendición.`,
      [
        {
          id: 'pasarse',
          label: 'Pasarte al nocturno',
          descripcion: `${a.nocturnoBloquesExtra} bloques más por semana y el colegio cae mucho más lento, pero en casa cae mal (confianza -${a.nocturnoCostoTrustMin} a -${a.nocturnoCostoTrustMax}).`,
          pesoAuto: 4
        },
        {
          id: 'aguantar',
          label: 'Aguantar el turno de siempre',
          descripcion: 'No cambia nada: los mismos bloques por semana y la misma paz en casa.',
          pesoAuto: 6
        }
      ],
      'nocturno'
    );
  }

  return null;
}

// El org y el tier ya se decidieron cuando se armó la decisión
// (`orgQueTeFicha`, en `buscarSalida`): acá no se vuelve a sortear nada, se
// firma con la misma org que le mostró el título al jugador.
function firmarConEquipo(state, decision) {
  const { org, tier, liga } = decision.datos;
  const base = { ...state, phase: 'profesional', splitFichaje: state.player.splitCount };

  // K5c-R: si el primer contrato ya es de tier 2, los años pro (`career.splitPrimerContratoTier2`) arrancan acá.
  const conCareer = tier === 2
    ? {
        ...base,
        career: {
          ...base.career, tier: 2, liga, currentOrg: org.nombre, orgs: [...base.career.orgs, org.nombre],
          splitPrimerContratoTier2: base.career.splitPrimerContratoTier2 ?? state.player.splitCount
        }
      }
    : asignarOrgTier3(base, org);

  const texto = tier === 2
    ? `Firmaste con ${org.nombre}, directo en ${nombreVisibleDeLiga(liga)}. Te salteaste el tramo de probarte en un equipo chico: se terminó el soloQ de pieza.`
    : `Firmaste con ${org.nombre}. Se terminó el soloQ de pieza: a partir de acá te pagan por jugar.`;

  return { state: conCareer, logs: [crearLog('amateur', texto)] };
}

// "la_prueba" (fase 4): el único minijuego de la etapa amateur, la bisagra del
// tryout con un tier 3. K4c-S: decide el contrato (`probabilidadDeFirmarTrasPrueba`: un resultado malo firma pocas
// veces, uno bueno casi siempre) y, si firmás, cuánto crédito te llevás de entrada, vía el bonus que `roster.js` suma
// una sola vez al armar el primer roster.
// Fase 9R4a: sale del catálogo por momento (`tryout`), con su texto y su stat
// en el dato — igual que los de la serie. Devuelve la pausa entera porque el id
// elegido se anota en `flags.minijuegosRecientes`.
const TEXTO_SI_NO_ALCANZA = 'Si no alcanza, seguís en la escalera: puede llegar otra oferta.';

function pausaDeLaPrueba(state, datosOferta) {
  const entrada = elegirMinijuego(state, 'tryout');
  const textos = textoDeMinijuego(entrada, state);
  return {
    state: { ...state, flags: { ...state.flags, minijuegosRecientes: registrarMinijuegoVisto(state, entrada.id) } },
    decision: {
      tipo: 'opciones',
      presentacion: 'minijuego',
      titulo: textos.titulo,
      descripcion: textos.descripcion,
      opciones: [],
      datos: {
        motivo: 'minijuego',
        minijuego: entrada.id,
        momento: 'tryout',
        statRelevante: entrada.statRelevante,
        // K4c (revisión), regla 15: la apuesta dice también qué pasa si no alcanza (lo que hace `resolverLaPrueba`), como la del
        // mercado.
        apuesta: `${textos.apuesta} ${TEXTO_SI_NO_ALCANZA}`,
        oferta: datosOferta
      }
    }
  };
}

function resolverLaPrueba(state, decision, respuesta, rng) {
  const resultado = clamp(respuesta.resultado ?? 0.5, 0, 1);
  // K4c-S: un solo sorteo, siempre (también con p = 0 o 1), para que el stream no dependa del resultado. Si no alcanza,
  // la firma se posterga: seguís en la escalera (la fase no cambia, no queda crédito) y puede llegar otra oferta.
  const alcanza = chance(probabilidadDeFirmarTrasPrueba(resultado), rng);
  if (!alcanza) {
    return {
      state,
      // `oferta.org` es la org entera (`elegirOrgTier3`): el texto lleva su nombre.
      logs: [crearLog('amateur', `La prueba no convence y ${decision.datos.oferta.org.nombre} no te firma. Seguís en la escalera: puede llegar otra oferta.`)]
    };
  }
  const bonus = Math.round((resultado - 0.5) * 2 * minijuegoPorId(decision.datos.minijuego).impacto);
  const conBonus = { ...state, flags: { ...state.flags, bonusJerarquiaTryout: bonus } };
  const { state: firmadoSinMarca, logs } = firmarConEquipo(conBonus, { datos: decision.datos.oferta });
  // K4-C: si esta prueba te firmó directo en tier 2, ese salto ya tuvo la suya (`flags.saltosConPrueba`).
  const firmado = firmadoSinMarca.career.tier === 2
    ? { ...firmadoSinMarca, flags: { ...firmadoSinMarca.flags, saltosConPrueba: [...(firmadoSinMarca.flags.saltosConPrueba ?? []), 'tier2'] } }
    : firmadoSinMarca;

  return {
    state: firmado,
    logs: [
      crearLog('amateur', bonus >= 0
        ? 'La prueba te sale bien: te firman y llegás con algo de crédito ganado de entrada.'
        : 'La prueba es floja, pero alcanza: te firman, sin nada ganado de entrada.'),
      ...logs
    ]
  };
}

function resolverOferta(state, decision, opcionId, rng) {
  if (opcionId === 'firmar') {
    if (decision.datos.tier === 3) {
      const pausa = pausaDeLaPrueba(state, decision.datos);
      return { state: pausa.state, logs: [], decision: pausa.decision };
    }
    return firmarConEquipo(state, decision);
  }

  const hypeGanado = roll(BALANCE.amateur.rechazoOfertaHypeMin, BALANCE.amateur.rechazoOfertaHypeMax, rng);
  return {
    state: {
      ...state,
      player: { ...state.player, stats: { ...state.player.stats, hype: clampStat(state.player.stats.hype + hypeGanado) } }
    },
    logs: [crearLog('amateur', `Dijiste que no. Se comentó en Twitter, y algo de eso te queda (+${hypeGanado} hype).`)]
  };
}

function resolverNegociacion(state, opcionId, rng) {
  if (opcionId !== 'plantear_el_tema') {
    return { state, logs: [crearLog('amateur', 'Dejaste pasar la charla. El tema sigue ahí, esperando.')] };
  }

  // Los stats corren los pesos, no los eliminan: la confianza acumulada y las
  // notas mueven la balanza, pero la charla puede salir mal igual.
  const a = BALANCE.amateur;
  const pesoBien = state.player.familyTrust + state.player.studies;
  const pesoMal = BALANCE.stats.max * 2 - pesoBien;
  const sale = weightedPick([true, false], (bien) => (bien ? pesoBien : pesoMal), rng);
  // K6a-A: el resultado dice con qué p se jugó y qué la decidió.
  const motivo = `(tenías ${porcentaje(probabilidadDeNegociacion(state))}, con confianza ${entero(state.player.familyTrust)} y notas ${entero(state.player.studies)})`;

  if (sale) {
    return {
      state: {
        ...state,
        flags: { ...state.flags, negociacionGanada: true },
        player: { ...state.player, familyTrust: clampStat(state.player.familyTrust + roll(a.negociacionBienTrustMin, a.negociacionBienTrustMax, rng)) }
      },
      logs: [crearLog('amateur', `Salió bien ${motivo}: te bancan el intento. Mientras no abandones del todo el colegio, la PC es tuya.`)]
    };
  }

  return {
    state: {
      ...state,
      player: { ...state.player, familyTrust: clampStat(state.player.familyTrust - roll(a.negociacionMalTrustMin, a.negociacionMalTrustMax, rng)) }
    },
    logs: [crearLog('amateur', `Salió mal ${motivo}. Ahora además de desconfiar, saben exactamente lo que querés hacer.`)]
  };
}

function resolverNocturno(state, opcionId, rng) {
  if (opcionId !== 'pasarse') {
    return { state, logs: [crearLog('amateur', 'Te quedaste en el turno de siempre. Menos tiempo, menos ruido en casa.')] };
  }

  const a = BALANCE.amateur;
  const costo = roll(a.nocturnoCostoTrustMin, a.nocturnoCostoTrustMax, rng);

  return {
    state: {
      ...state,
      flags: { ...state.flags, nocturno: true },
      player: { ...state.player, familyTrust: clampStat(state.player.familyTrust - costo) }
    },
    logs: [crearLog('amateur', `Te pasaste al nocturno: ${a.nocturnoBloquesExtra} bloques más por periodo y el colegio deja de pesar tanto. En casa cayó como un balde de agua fría (-${costo} confianza).`)]
  };
}

// Fase 10a (§10.1): antes de esto, `edadLimite` cortaba en silencio a los 20
// — un dado sin que el jugador eligiera nada. Ahora `edadLimite` es la red
// anti-loop (24: nadie se queda en soloQ para siempre) y, desde
// `edadOfertaDeSalida` (19), cada cierre de temporada pregunta de verdad:
// ¿la seguís peleando, sabiendo que la ventana se sigue cerrando (el sesgo
// etario de `scoutingSesgoEtario` ya lo dice), o la dejás vos antes de que
// lo decida la edad?
function decisionSalidaAmateur(state) {
  return {
    tipo: 'opciones',
    bisagra: true,
    titulo: `Fin de temporada, ${state.age} años: ¿seguís?`,
    descripcion: 'Los scouts miran cada vez menos. ¿La seguís peleando en soloQ o la dejás vos, antes de que se cierre sola?',
    opciones: [
      { id: 'seguir', label: 'La seguís peleando', descripcion: 'Un año más de grindeo. Cada vez entra menos gente por esta puerta.' },
      { id: 'dejar', label: 'La dejás acá', descripcion: 'Cerrás la etapa amateur por tu cuenta.' }
    ],
    datos: { motivo: 'salida_amateur' }
  };
}

// --- Contrato del sistema ---

export function aplicar(state, rng) {
  if (state.phase !== 'amateur') {
    return { state, logs: [] };
  }

  if (state.age >= BALANCE.amateur.edadLimite) {
    return {
      state: { ...state, phase: 'retirado', terminado: true, finAnticipado: 'no_llego' },
      logs: [crearLog('amateur', `Cumpliste ${state.age} y nadie te llamó. La ventana de los prospectos se cerró.`)]
    };
  }

  if (state.age >= BALANCE.amateur.edadOfertaDeSalida && esCierreDeEdad(state)) {
    return { state, logs: [], decision: decisionSalidaAmateur(state) };
  }

  if ((state.flags.pcConfiscada ?? 0) > 0) {
    return periodoSinPC(state, rng);
  }

  return semanaAmateur(state, rng);
}

export function resolver(state, decision, respuesta, rng) {
  if (decision.datos.motivo === 'salida_amateur') {
    if (respuesta.opcionId === 'dejar') {
      return {
        state: { ...state, phase: 'retirado', terminado: true, finAnticipado: 'no_llego' },
        logs: [crearLog('amateur', `A los ${state.age} la dejás vos, antes de que se cierre sola.`)]
      };
    }
    return { state, logs: [crearLog('amateur', 'Decidís seguir. La ventana se sigue cerrando igual.')] };
  }

  if (decision.datos.motivo === 'reparto') {
    return vivirLaSemana(state, rutinaPorId(decision.datos.rutinas, respuesta.opcionId), rng);
  }

  const { motivo } = decision.datos;

  if (motivo === 'minijuego') {
    return resolverLaPrueba(state, decision, respuesta, rng);
  }

  const { opcionId } = respuesta;

  if (motivo === 'oferta') {
    return resolverOferta(state, decision, opcionId, rng);
  }
  if (motivo === 'negociacion') {
    return resolverNegociacion(state, opcionId, rng);
  }
  return resolverNocturno(state, opcionId, rng);
}

// El jugador automatico no reparte al azar: mira que barras tiene en rojo y
// reacciona, como haria alguien con criterio. Es la unica forma de que la
// simulacion masiva mida el juego y no el ruido.
function pesosAutomaticos(state, rng) {
  const a = BALANCE.amateur;
  const conRuido = (peso) => Math.max(a.autoPesoMinimo, peso * gauss(1, a.autoRuido, rng));

  const riesgoColegio = clamp((a.avisoUmbral - state.player.studies) / a.avisoUmbral, 0, 1);
  const riesgoFamilia = clamp((a.trustReferencia - state.player.familyTrust) / a.trustReferencia, 0, 1);
  const riesgoSueno = clamp((a.autoSuenoObjetivo - state.player.sleep) / a.autoSuenoObjetivo, 0, 1);

  return {
    ranked: conRuido(a.autoPesoRanked),
    estudiar: conRuido(a.autoPesoEstudiar + riesgoColegio * a.autoReaccionColegio),
    dormir: conRuido(a.autoPesoDormir + riesgoSueno * a.autoReaccionSueno),
    familia: conRuido(a.autoPesoFamilia + riesgoFamilia * a.autoReaccionFamilia)
  };
}

export function resolverAuto(state, decision, rng) {
  // El jugador automático no abandona por su cuenta: sigue peleándola hasta
  // que la red anti-loop (`edadLimite`) decida por él, igual que antes de
  // que esta decisión existiera — la agencia es para el humano.
  if (decision.datos.motivo === 'salida_amateur') {
    return { opcionId: 'seguir' };
  }
  if (decision.datos.motivo === 'minijuego') {
    // Regla 5 de 4.6: el motor no implementa el minijuego, lo simula con
    // gauss corrido por el stat relevante.
    const entrada = minijuegoPorId(decision.datos.minijuego);
    const valor = state.player.stats[decision.datos.statRelevante] ?? 50;
    return { resultado: clamp(gauss(valor / 100, entrada.spread, rng), 0, 1) };
  }
  if (decision.datos.motivo !== 'reparto') {
    return { opcionId: weightedPick(decision.opciones, (opcion) => opcion.pesoAuto ?? 1, rng).id };
  }

  // Elige la rutina que mejor se alinea con las barras que tiene en rojo.
  return { opcionId: elegirRutinaAutomatica(decision.datos.rutinas, pesosAutomaticos(state, rng), rng).id };
}
