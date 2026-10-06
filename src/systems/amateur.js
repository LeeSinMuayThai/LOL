import { gauss, roll, chance, weightedPick } from '../core/rng.js';
import { BALANCE } from '../data/balance.js';
import { crearLog } from '../core/log.js';
import { deltaCorto, entero, lista } from '../core/formato.js';
import { clamp, clampStat } from '../core/numeros.js';
import { veredictoDeLaPrueba, varaDeLaPrueba } from '../core/serie.js';
import { aplicarLPAlEstado, etiquetaDeRanked, servidorDeLaPartida, rangoAproximado, esApice, bandaDeLadder } from '../core/ranked.js';
import { multiplicadorDeMeta } from '../core/ajusteMeta.js';
import { registrarEnHistorial } from '../core/contexto.js';
import { resolverTexto } from '../core/plantillas.js';
import { RUTINAS, ofrecerRutinas, rutinaPorId, elegirRutinaAutomatica } from '../core/rutinas.js';
import { opcionDesdeRutina, descripcionDeSorteo, EJE_AMATEUR } from '../core/rareza.js';
import { elegirOrgTier3, asignarOrgTier3 } from '../core/tier3.js';
import { elegirMinijuego, minijuegoPorId, textoDeMinijuego, registrarMinijuegoVisto } from '../core/minijuegos.js';
import { conMarcasDeRutina } from '../core/curvas.js';
import { esCierreDeEdad } from './edadCierre.js';
import { nombreVisibleDeLiga } from '../core/ligas.js';
import { opcionDelPerfil, nombreDePerfil, pisoSoloQDePerfil } from '../core/perfil.js';
import { etiquetaCampo } from '../core/selectors.js';
import { nivelDelJugador } from '../core/ficha.js';

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

// `confianza`: la confianza familiar con la que se evalúa (por defecto, la de hoy). La previa de la semana la pasa
// proyectada, la misma que va a leer `evaluarRiesgoFamiliar` después del reparto (regla 15).
function multiplicadorFamiliar(state, confianza = state.player.familyTrust) {
  const a = BALANCE.amateur;
  const estrictez = (BALANCE.stats.max - state.origen.toleranciaViejos) / a.toleranciaReferencia;
  const modTrust = clamp(
    1 + (a.trustReferencia - confianza) * a.trustPesoEnRiesgo,
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

// Las dos chances de la casa (corte del ranked y confiscación de la PC) con un colegio y una confianza dados. Es la
// cuenta de `evaluarRiesgoFamiliar` (que la llama con las barras de después de la semana) y de la previa de la semana
// (que la llama con las barras proyectadas): una sola fuente, así la carta dice lo que el motor tira (regla 15).
// Exportada para el check de `validate.js`.
export function probabilidadesDeCasa(state, estudios, confianza) {
  const a = BALANCE.amateur;
  const multiplicador = multiplicadorFamiliar(state, confianza);
  const corte = Math.min(a.riesgoTotalTecho, probBanda(estudios, a.corteUmbral, a.cortePendiente, a.corteTecho) * multiplicador);
  const confiscacion = Math.min(
    a.riesgoTotalTecho,
    probBanda(estudios, a.confiscacionUmbral, a.confiscacionPendiente, a.confiscacionTecho) * multiplicador
  );
  return { corte, confiscacion };
}

// Qué arriesga una opción: la chance de que en casa te saquen la PC o te corten el ranked después de esta semana (la
// misma cuenta que `evaluarRiesgoFamiliar`, con el colegio Y la confianza proyectados: antes usaba la confianza de
// antes de la semana y el motor tiraba con la de después) y si suma deuda de sueño. Con la negociación ganada, el
// colegio deja de pesar en casa.
function riesgoDeCasa(state, estudios, confianza) {
  const { corte, confiscacion } = probabilidadesDeCasa(state, estudios, confianza);
  return corte + (1 - corte) * confiscacion;
}

function peligrosDeSemana(state, proy) {
  const estudiosDespues = state.player.studies + proy.estudios;
  const confianzaDespues = clampStat(state.player.familyTrust + proy.confianza);
  return {
    casa: state.flags.negociacionGanada ? 0 : riesgoDeCasa(state, estudiosDespues, confianzaDespues),
    deuda: proy.robos >= BALANCE.amateur.robosParaDeuda,
    estudiosDespues
  };
}

export function opcionesDeSemana(state, rutinas) {
  return rutinas.map((rutina) => {
    const proy = proyeccionDeSemana(state, rutina);
    return { rutina, proy, previa: previaDeSemana(proy), riesgo: riesgoDeSemana(proy), peligro: peligrosDeSemana(state, proy) };
  });
}

// Lo que está en juego, dicho con los números de la regla: por qué esta semana te frena.
function textoDeLoQueEstaEnJuego(elegida, masSegura, conPlan, proyectada = null) {
  const partes = [];
  if (elegida.peligro.casa > masSegura.peligro.casa) {
    partes.push(`te deja el colegio en ~${entero(elegida.peligro.estudiosDespues)}: ${porcentaje(elegida.peligro.casa)} de que en casa te saquen la PC o te corten el ranked, contra ${porcentaje(masSegura.peligro.casa)} con "${masSegura.rutina.titulo}"`);
  }
  if (elegida.peligro.deuda) {
    partes.push(`sería la semana ${elegida.proy.robos} seguida robándole horas al sueño: empezás a sumar deuda y el LP lo nota`);
  }
  // K6c: con el plan del año, lo que iba a pasar es tu plan (lo elegiste vos), no tu perfil.
  const quien = conPlan ? `Tu plan del año es "${elegida.rutina.titulo}"` : `Tu perfil iba a ir por "${elegida.rutina.titulo}"`;
  // K6c (segunda pasada): con plan, la semana frena por algo que el plan no mostró: se dice contra qué.
  const cambio = proyectada !== null && elegida.peligro.casa > proyectada + BALANCE.amateur.semanaRiesgoNuevo
    ? ` Es más de lo que mostraba el plan para esta semana (${porcentaje(proyectada)} en casa): algo cambió.`
    : '';
  return `${quien}, y eso ${partes.join('; y ')}.${cambio}`;
}

function decisionDeRutina(state, rutinas, opciones, elegida, masSegura, conPlan = false, proyectada = null) {
  return {
    tipo: 'opciones',
    titulo: `Cómo vivís la semana — ${etiquetaDeRanked(state.player.ranked, servidorDeLaPartida(state))}`,
    descripcion: descripcionDeSorteo(rutinas.length, EJE_AMATEUR, `${textoDeLoQueEstaEnJuego(elegida, masSegura, conPlan, proyectada)} ${textoDeSituacion(state)}`),
    opciones: opciones.map((opcion) => ({
      ...opcionDesdeRutina(opcion.rutina, 'amateur'),
      previa: opcion.previa
    })),
    datos: { motivo: 'reparto', rutinas }
  };
}

// La opción que propone tu perfil entre estas (K5c, no-pro): el piso de soloQ de tu perfil (`pisoSoloQ` en
// `data/perfiles.json`, mezclado por sus pesos) deja solo las rutinas que rinden al menos esa fracción del LP proyectado de la
// mejor, y entre ellas elige `opcionDelPerfil`. Sin piso, el leal y el profesional casi no grindeaban (2,9 y 3,4 bloques de
// ranked por semana) y la mitad no llegaba a pro. K6c: desde que el plan del año lo elegís vos, esto es la PROPUESTA del
// perfil (la opción marcada en la carta del plan), no una restricción.
function propuestaDelPerfil(state, opciones) {
  const lpMaximo = Math.max(...opciones.map((opcion) => opcion.proy.lp));
  const piso = pisoSoloQDePerfil(state.player.perfil.pesos) * lpMaximo;
  const elegibles = opciones.filter((opcion) => opcion.proy.lp >= piso);
  const { id: elegidaId } = opcionDelPerfil(state.player.perfil, elegibles.map((opcion) => ({
    id: opcion.rutina.id, previa: opcion.previa, riesgo: opcion.riesgo
  })));
  return opciones.find((opcion) => opcion.rutina.id === elegidaId);
}

// K6c-fix ("la propuesta del perfil no te quema", PLAN.md §K6c, reglas del supervisor 2026-10-06): con el plan del año bajo
// `resolverAuto` la propuesta del perfil no miraba el riesgo que la propia carta mostraba, y los amateurs del automático se
// quemaban (burnout 7 → 60 por cada 1000 carreras contra K6b) o los castigaban en casa (38 → 78). Un plan muestra un riesgo
// evitable si su chance en casa en el año pasa la del plan más seguro por `amateur.planRiesgoEvitable`, o si arma el riesgo de
// lesión o burnout en el año y otro plan no (los números de la carta: `riesgoDelPlan`, `semanaRiesgoFisico`). Si la propuesta del
// perfil lo muestra, la propuesta pasa al plan que tu perfil elegiría entre los que no (`propuestaDelPerfil` sobre esos); si
// ninguno está libre, al menos riesgoso (primero sin riesgo físico, después la chance en casa más baja). Vos podés elegir el arriesgado igual: la carta lo
// dice. Puro, sin `rng`. Exportada para `validate.js`.
// K6c-fix (tercera pasada): la deuda de sueño cuenta como evitable solo si el plan llega al riesgo físico en el año
// (`semanaRiesgoFisico`) y otro plan no. Con cualquier deuda el automático no aceptaba nunca un plan con deuda y las lesiones
// graves desaparecían de sus carreras (el momento `lesionado`: 0 de 3600, contra 46 de 1200 en K6c).
export function riesgoEvitableDelPlan(riesgo, riesgos) {
  const minimo = Math.min(...riesgos.map((otro) => otro.casa));
  const casa = riesgo.casa - minimo >= BALANCE.amateur.planRiesgoEvitable;
  const fisico = riesgo.semanaRiesgoFisico !== null && riesgos.some((otro) => otro.semanaRiesgoFisico === null);
  return casa || fisico ? { casa, fisico } : null;
}

export function propuestaDelPlan(state, opciones) {
  const riesgos = new Map(opciones.map((opcion) => [opcion.rutina.id, riesgoDelPlan(state, opcion.rutina)]));
  const todos = [...riesgos.values()];
  const delPerfil = propuestaDelPerfil(state, opciones);
  const evitable = riesgoEvitableDelPlan(riesgos.get(delPerfil.rutina.id), todos);
  if (!evitable) {
    return { propuesta: delPerfil, delPerfil, evitable: null };
  }
  const libres = opciones.filter((opcion) => !riesgoEvitableDelPlan(riesgos.get(opcion.rutina.id), todos));
  const menosRiesgoso = (a, b) => {
    const [ra, rb] = [riesgos.get(a.rutina.id), riesgos.get(b.rutina.id)];
    const [da, db] = [ra.semanaRiesgoFisico === null ? 0 : 1, rb.semanaRiesgoFisico === null ? 0 : 1];
    return da !== db ? da < db : ra.casa < rb.casa;
  };
  const propuesta = libres.length > 0
    ? propuestaDelPerfil(state, libres)
    : opciones.reduce((mejor, opcion) => (menosRiesgoso(opcion, mejor) ? opcion : mejor));
  return { propuesta, delPerfil, evitable };
}

// La semana con estas rutinas: cuál se vive y si frena. Frena si la que se vive sube el riesgo en casa al menos
// `semanaRiesgoEvitable` por encima de la opción más segura, o si suma deuda de sueño y otra opción no (K6a-A). Exportada
// para que `validate.js` la pruebe con rutinas fijas (sin depender de qué ofreció el sorteo).
//
// K6c ("vos elegís el plan de cada año"): con `plan` (la rutina del plan del año) se vive el plan, y las rutinas del sorteo
// de la semana son las alternativas contra las que se mide el riesgo evitable (en la parada, el plan va primero). Sin
// `plan`, se vive la propuesta de tu perfil (la regla de K6a-A, la que usan los checks con rutinas fijas).
export function planDeSemana(state, rutinas, plan = null) {
  const ofrecidas = plan && !rutinas.some((rutina) => rutina.id === plan.id) ? [plan, ...rutinas] : rutinas;
  const opciones = opcionesDeSemana(state, ofrecidas);
  const elegida = plan ? opciones.find((opcion) => opcion.rutina.id === plan.id) : propuestaDelPerfil(state, opciones);
  const masSegura = opciones.reduce((mejor, opcion) => (opcion.peligro.casa < mejor.peligro.casa ? opcion : mejor));
  const casaEvitable = elegida.peligro.casa - masSegura.peligro.casa >= BALANCE.amateur.semanaRiesgoEvitable;
  const deudaEvitable = elegida.peligro.deuda && opciones.some((opcion) => !opcion.peligro.deuda);
  const nuevo = plan ? riesgoNuevoDeLaSemana(state, elegida) : { casa: true, deuda: true, proyectada: null };
  const frena = (casaEvitable && nuevo.casa) || (deudaEvitable && nuevo.deuda);
  return {
    elegida: elegida.rutina,
    frena,
    decision: frena ? decisionDeRutina(state, ofrecidas, opciones, elegida, masSegura, plan !== null, nuevo.proyectada) : null
  };
}

// K6c, segunda pasada ("la semana frena solo con riesgo nuevo"): el plan del año ya mostró su riesgo, semana por semana
// (`anioAmateur.riesgoMostrado`, la proyección de `riesgoDelPlan` al elegirlo). Lo que aceptaste al elegir el plan no vuelve
// a frenar: la semana frena solo si su riesgo en casa supera el que el plan mostró para esa semana por más de
// `amateur.semanaRiesgoNuevo`, o si entrás en deuda de sueño antes de la semana que el plan anunciaba (o sin que la
// anunciara). Un plan sin riesgo mostrado (un guardado de antes) frena con la regla de K6a-A. Puro, sin `rng`.
function riesgoNuevoDeLaSemana(state, elegida) {
  const anio = state.flags.anioAmateur;
  const mostrado = anio?.riesgoMostrado;
  if (!mostrado) {
    return { casa: true, deuda: true, proyectada: null };
  }
  const semana = anio.semanas + 1;
  const proyectada = mostrado.semanal[Math.min(semana, mostrado.semanal.length) - 1];
  return {
    casa: elegida.peligro.casa > proyectada + BALANCE.amateur.semanaRiesgoNuevo,
    deuda: mostrado.semanaDeuda === null || semana < mostrado.semanaDeuda,
    proyectada
  };
}

// La semana de la etapa amateur: la del plan del año (K6c), o una parada si eso te mete en un riesgo evitable.
function semanaAmateur(state, rng) {
  const rutinas = ofrecerRutinas(state, rng, { pool: 'amateur' });
  const plan = rutinaDelPlan(state);
  const semana = planDeSemana(state, rutinas, plan);
  if (semana.frena) {
    return { state, logs: [], decision: semana.decision };
  }
  return vivirLaSemana(state, semana.elegida, rng, plan ? { plan: true } : { cronica: state.player.perfil.actual });
}

// --- K6c: el plan del año ("vos elegís el plan de cada año", decisión del usuario 2026-10-05) ---
//
// Desde K6a-A el perfil elegía cada semana y entre los 15 y los 19 casi no se frenaba: "los años pasan volando". Ahora, al
// arrancar cada año del amateur (el primero y después de cada cierre de edad), el juego frena con el resumen del año que
// terminó y vos elegís el plan del siguiente entre las rutinas de la semana; tu perfil propone (la opción marcada) y las
// semanas de ese año siguen el plan sin frenar, salvo el riesgo evitable de K6a-A. Todo vive en `flags.anioAmateur`: el
// plan, la foto del arranque (rango y LP) y lo que pasó en el año (semanas, semanas en el radar de los scouts, ofertas). Las
// ofertas del año son también la ventana del amateur: un club que ya te ofreció no vuelve a ofrecer este año.

function rutinaDelPlan(state) {
  const id = state.flags.anioAmateur?.rutinaId;
  return id ? RUTINAS.amateur.find((rutina) => rutina.id === id) ?? null : null;
}

function necesitaPlan(state) {
  return state.flags.anioAmateur?.edad !== state.age;
}

// Los clubes que ya te ofrecieron en esta ventana (el año del plan).
function clubesQueYaOfrecieron(state) {
  return (state.flags.anioAmateur?.ofertas ?? []).map((oferta) => oferta.org);
}

function conOfertaDelAnio(state, oferta) {
  const anio = state.flags.anioAmateur;
  if (!anio) {
    return state;
  }
  return { ...state, flags: { ...state.flags, anioAmateur: { ...anio, ofertas: [...anio.ofertas, oferta] } } };
}

// Lo que arriesga un plan en el año: la proyección media de la semana (`proyeccionDeSemana`, sin dado) repetida las
// `edad.splitsPorEdad` semanas del año, con el colegio, la confianza, el sueño, la mentalidad y los robos al sueño corridos
// semana a semana. `casa`: la chance de que en casa te saquen la PC o te corten el ranked en algún momento del año (la cuenta
// de `evaluarRiesgoFamiliar`, semana por semana); `semanaDeuda`: la semana en la que entrás en deuda de sueño, o `null`. Es
// lo que dice la carta y lo que leen los bots (regla 15). Exportada para `validate.js`.
//
// K6c-fix (tercera pasada): `semanaRiesgoFisico`, la semana en la que el plan arma el riesgo físico, con las mismas cuentas del
// motor: la deuda de sueño en `salud.deudaUmbralRiesgo` o más, sostenida hasta `salud.splitsParaLesionLeve` splits
// (`flags.splitsRiesgoFisico`, la de `systems/salud.js`), o la mentalidad en `atributos.burnoutMentalBajo` o menos durante
// `atributos.burnoutSplitsMinimos` splits seguidos (`flags.splitsMentalBajo`, la de `systems/atributos.js`); `null` si en el año no
// llega. La deuda que no llega ahí es un costo del plan, no un riesgo evitable (`riesgoEvitableDelPlan`).
export function riesgoDelPlan(state, rutina) {
  const a = BALANCE.amateur;
  let st = state;
  let sinNada = 1;
  let semanaDeuda = null;
  let semanaRiesgoFisico = null;
  let splitsRiesgoFisico = state.flags.splitsRiesgoFisico ?? 0;
  let splitsMentalBajo = state.flags.splitsMentalBajo ?? 0;
  const semanal = [];
  for (let semana = 1; semana <= BALANCE.edad.splitsPorEdad; semana += 1) {
    const proy = proyeccionDeSemana(st, rutina);
    const peligro = peligrosDeSemana(st, proy);
    sinNada *= 1 - peligro.casa;
    semanal.push(peligro.casa);
    if (peligro.deuda && semanaDeuda === null) {
      semanaDeuda = semana;
    }
    st = {
      ...st,
      player: {
        ...st.player,
        studies: clampStat(peligro.estudiosDespues),
        familyTrust: clampStat(st.player.familyTrust + proy.confianza),
        sleep: clampStat(st.player.sleep + proy.sueno),
        deudaSueno: clamp(peligro.deuda ? st.player.deudaSueno + 1 : Math.max(0, st.player.deudaSueno - 1), 0, a.deudaMaxima),
        stats: { ...st.player.stats, mentalidad: clampStat(st.player.stats.mentalidad + proy.mentalidad) }
      },
      flags: { ...st.flags, robosConsecutivos: proy.robos }
    };
    splitsRiesgoFisico = st.player.deudaSueno >= BALANCE.salud.deudaUmbralRiesgo ? splitsRiesgoFisico + 1 : Math.max(0, splitsRiesgoFisico - 1);
    splitsMentalBajo = st.player.stats.mentalidad <= BALANCE.atributos.burnoutMentalBajo ? splitsMentalBajo + 1 : 0;
    if (semanaRiesgoFisico === null
      && (splitsRiesgoFisico >= BALANCE.salud.splitsParaLesionLeve || splitsMentalBajo >= BALANCE.atributos.burnoutSplitsMinimos)) {
      semanaRiesgoFisico = semana;
    }
  }
  return { casa: 1 - sinNada, semanaDeuda, semanaRiesgoFisico, semanal };
}

function textoDeOfertaDelAnio(oferta) {
  if (oferta.desenlace === 'prueba') {
    return `${oferta.org} (no llegaste a la vara de la prueba: te faltó ${oferta.falta}%)`;
  }
  return `${oferta.org} (le dijiste que no)`;
}

// El resumen del año que terminó: rango y LP al empezar y al terminar, los scouts y las ofertas.
function resumenDelAnio(state) {
  const servidor = servidorDeLaPartida(state);
  const ahora = etiquetaDeRanked(state.player.ranked, servidor);
  const anio = state.flags.anioAmateur;
  if (!anio) {
    return `Arranca tu año en soloQ: ${ahora}.`;
  }
  const scouts = anio.semanasEnRadar > 0
    ? `te tuvieron en el radar ${anio.semanasEnRadar} de ${anio.semanas} semanas`
    : 'ninguno te tuvo en el radar (miran la punta de la ladder)';
  const ofertas = anio.ofertas.length > 0 ? lista(anio.ofertas.map(textoDeOfertaDelAnio)) : 'ninguna';
  return `Tu año de los ${anio.edad}: arrancaste en ${etiquetaDeRanked(anio.rankedInicio, servidor)} y lo cerraste en ${ahora}. `
    + `Scouts: ${scouts}. Ofertas: ${ofertas}.`;
}

function textoDeRiesgoDelPlan(riesgo) {
  const partes = [`en casa: ${porcentaje(riesgo.casa)} en el año`];
  if (riesgo.semanaDeuda !== null) {
    partes.push(`deuda de sueño desde la semana ${riesgo.semanaDeuda}`);
  }
  // K6c-fix (tercera pasada): la semana en que el plan arma el riesgo de lesión o burnout (regla 15: lo que mira la propuesta).
  if (riesgo.semanaRiesgoFisico !== null) {
    partes.push(`riesgo de lesión o burnout desde la semana ${riesgo.semanaRiesgoFisico}`);
  }
  return partes.join(' · ');
}

// La parada del plan del año. Las opciones salen del mismo sorteo de rutinas que la semana (una tirada de `ofrecerRutinas`,
// siempre, antes de frenar: el stream no depende de lo que elijas). Cada una trae lo que da por semana (la previa de K6a-A,
// con su número) y lo que arriesga en el año (`riesgoDelPlan`); la propuesta de tu perfil va marcada.
function decisionDePlan(state, rng) {
  const rutinas = ofrecerRutinas(state, rng, { pool: 'amateur' });
  const opciones = opcionesDeSemana(state, rutinas);
  // K6c-fix: la propuesta es la de tu perfil, salvo que muestre un riesgo evitable (`propuestaDelPlan`); la carta lo dice.
  const { propuesta, delPerfil, evitable } = propuestaDelPlan(state, opciones);
  const perfil = nombreDePerfil(state.player.perfil.actual).toLowerCase();
  const semanas = BALANCE.edad.splitsPorEdad;
  const queArriesga = evitable
    ? [evitable.casa ? 'un castigo en casa' : null, evitable.fisico ? 'una lesión o un burnout' : null].filter(Boolean).join(' y ')
    : null;
  const textoPropuesta = evitable
    ? `Tu perfil (${perfil}) iría por "${delPerfil.rutina.titulo}", pero arriesga ${queArriesga} y otro plan lo evita: te propone "${propuesta.rutina.titulo}", lo más parecido sin ese riesgo.`
    : `Tu perfil (${perfil}) iría por "${propuesta.rutina.titulo}".`;
  return {
    tipo: 'opciones',
    titulo: `El plan del año, ${state.age} años — ${etiquetaDeRanked(state.player.ranked, servidorDeLaPartida(state))}`,
    descripcion: `${resumenDelAnio(state)} Elegí cómo vas a vivir las ${semanas} semanas de este año: el plan corre solo y el `
      + 'juego frena únicamente si una semana te mete en un riesgo que otra opción evita. Lo que da, por semana; lo que '
      + `arriesgás, en el año. ${textoPropuesta}`,
    opciones: opciones.map((opcion) => {
      const riesgo = riesgoDelPlan(state, opcion.rutina);
      const esPropuesta = opcion.rutina.id === propuesta.rutina.id;
      return {
        ...opcionDesdeRutina(opcion.rutina, 'amateur'),
        previa: opcion.previa,
        riesgo: riesgo.casa > 0 || riesgo.semanaDeuda !== null ? 'incierto' : 'seguro',
        riesgoTexto: textoDeRiesgoDelPlan(riesgo),
        // Lo que lee un bot, los mismos números de la carta: el LP por semana y el riesgo del año.
        lpSemana: Math.round(opcion.proy.lp),
        riesgoCasa: riesgo.casa,
        semanaDeuda: riesgo.semanaDeuda,
        semanaRiesgoFisico: riesgo.semanaRiesgoFisico,
        ...(esPropuesta ? { propuesta: evitable ? `Tu perfil (${perfil}) iría por esta: lo más parecido a lo suyo sin ${queArriesga}` : `Tu perfil (${perfil}) iría por esta` } : {})
      };
    }),
    datos: { motivo: 'plan_amateur', propuesta: propuesta.rutina.id, ofrecidas: rutinas.map((rutina) => rutina.id) }
  };
}

function resolverPlan(state, decision, opcionId, rng) {
  const { propuesta, ofrecidas } = decision.datos;
  const rutinaId = ofrecidas.includes(opcionId) ? opcionId : propuesta;
  const rutina = RUTINAS.amateur.find((candidata) => candidata.id === rutinaId);
  // K6c (segunda pasada): el riesgo que mostró la carta del plan (la misma cuenta, sobre el mismo estado), semana por semana:
  // la vara contra la que la semana decide si lo que aparece es nuevo (`riesgoNuevoDeLaSemana`).
  const { semanal, semanaDeuda } = riesgoDelPlan(state, rutina);
  const anioAmateur = {
    edad: state.age,
    rutinaId,
    riesgoMostrado: { semanal, semanaDeuda },
    rankedInicio: { ...state.player.ranked },
    semanas: 0,
    semanasEnRadar: 0,
    ofertas: []
  };
  const conPlan = { ...state, flags: { ...state.flags, anioAmateur } };
  const deQuien = rutinaId === propuesta ? ', la que proponía tu perfil' : '';
  const log = crearLog('amateur', `Tu plan para este año: "${rutina.titulo}"${deQuien}. Las semanas corren solas con ese plan; el juego frena si una te mete en un riesgo evitable.`);
  const sigue = continuarElSplit(conPlan, rng);
  return { ...sigue, logs: [log, ...sigue.logs] };
}

// Lo que queda del split del amateur una vez que hay plan: el periodo sin PC o la semana.
function continuarElSplit(state, rng) {
  if ((state.flags.pcConfiscada ?? 0) > 0) {
    return periodoSinPC(state, rng);
  }
  return semanaAmateur(state, rng);
}

// El reparto de una rutina, el riesgo familiar y la búsqueda de una salida: lo mismo si la elegiste vos (la parada), tu
// perfil (`cronica`: la línea de la semana pasa a la crónica, con quién la eligió) o tu plan del año (`plan`, K6c).
function vivirLaSemana(state, rutina, rng, { cronica = null, plan = false } = {}) {
  // `normalizarReparto` sigue corriendo: es la red que garantiza que una
  // rutina mal declarada no invente ni pierda bloques, y la que adapta un
  // reparto de 10 a los 12 bloques del nocturno.
  const { reparto, extra } = normalizarReparto(state, { reparto: rutina.reparto, extra: rutina.extra });
  const rRepartoCrudo = aplicarReparto(state, reparto, extra, rng, { cronica, plan, opcion: rutina.titulo });
  // K3-B 2b: la semana amateur también deja marca, por el mismo camino que el receso (`conMarcasDeRutina`: la
  // fracción de la práctica, el título visible de la rutina, la ganancia real). Hoy ningún reparto mueve un stat de
  // curva, así que no anota nada; el día que uno lo mueva, la marca sale sola.
  const rReparto = { ...rRepartoCrudo, state: conMarcasDeRutina(rRepartoCrudo.state, state.player.stats, rutina.titulo) };
  const rRiesgo = evaluarRiesgoFamiliar(rReparto.state, rng);
  const logs = [...rReparto.logs, ...rRiesgo.logs];

  if (rRiesgo.state.terminado) {
    return { state: rRiesgo.state, logs };
  }

  // K6c: el año del plan cuenta sus semanas y en cuántas estuviste en el radar de los scouts (para el resumen del año). Sin
  // `rng`: la misma chance que `buscarSalida` tira a continuación.
  const anio = rRiesgo.state.flags.anioAmateur;
  const conAnio = anio
    ? {
        ...rRiesgo.state,
        flags: {
          ...rRiesgo.state.flags,
          anioAmateur: {
            ...anio,
            semanas: anio.semanas + 1,
            semanasEnRadar: anio.semanasEnRadar + (probabilidadDeScouting(rRiesgo.state) > 0 ? 1 : 0)
          }
        }
      }
    : rRiesgo.state;
  const salida = buscarSalida(conAnio, rng);
  return salida ? { state: conAnio, logs, decision: salida } : { state: conAnio, logs };
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

function aplicarReparto(state, reparto, extra, rng, { cronica = null, plan = false, opcion = null } = {}) {
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
  } else if (plan) {
    // K6c: la semana del plan del año que elegiste: la línea dice qué plan se vivió.
    logs.push(crearLog('amateur', `La semana, con tu plan ("${opcion}"): ${costos}. ${cuerpo} (${efectos})`, {
      titulo: 'La semana', cuerpo: `Tu plan, "${opcion}": ${costos}. ${cuerpo}`, efectos, plan: opcion
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

  const estudios = state.player.studies;
  const multiplicador = multiplicadorFamiliar(state);
  const { corte: probCorte, confiscacion: probConfiscacion } = probabilidadesDeCasa(state, estudios, state.player.familyTrust);
  if (chance(probCorte, rng)) {
    return {
      state: { ...state, phase: 'retirado', terminado: true, finAnticipado: 'prohibicion_familiar' },
      logs: [crearLog('amateur', 'Se terminó: en tu casa decidieron que el ranked se acabó, y esta vez no hay vuelta atrás.')]
    };
  }

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

//
// K6c: un club que ya te ofreció en esta ventana (el año del plan, `flags.anioAmateur.ofertas`) no vuelve a ofrecer: se lo
// saca del sorteo (si no queda ninguno, se sortea entre todos). Una sola tirada igual: el stream no cambia.
function orgQueTeFicha(state, rng) {
  const excluidas = clubesQueYaOfrecieron(state);
  if (nivelDeInteres(state) === 'elite') {
    const ligaTier2 = ligaTier2DeLaRegion(state);
    if (ligaTier2) {
      const libres = ligaTier2.orgs.filter((candidata) => !excluidas.includes(candidata.nombre));
      // Cuanto mas fuerte la org, menos probable que arriesgue el lugar en un
      // pibe sin partidas oficiales todavia.
      const org = weightedPick(libres.length > 0 ? libres : ligaTier2.orgs, (candidata) => BALANCE.stats.max - candidata.fuerza, rng);
      return { org, tier: 2, liga: ligaTier2 };
    }
  }

  return { org: elegirOrgTier3(state, rng, excluidas), tier: 3, liga: null };
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
    // K6c (segunda pasada): la vara de la prueba de tier 3 sale de tu nivel de hoy contra el calibre del club, una vez, acá:
    // la oferta la anuncia y viaja en `datos.vara` a la previa, al motor y a la pantalla. Sin `rng`.
    const vara = tier === 3 ? varaDeLaPruebaDelClub(state, org) : null;
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
            : anuncioDeLaVara(state, org, vara),
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
      { org, tier, liga: liga?.id ?? null, ...(vara !== null ? { vara } : {}) }
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

// "la_prueba" (fase 4): el único minijuego de la etapa amateur, la bisagra del tryout con un tier 3. Decide el contrato y,
// si firmás, cuánto crédito te llevás de entrada, vía el bonus que `roster.js` suma una sola vez al armar el primer roster.
// Fase 9R4a: sale del catálogo por momento (`tryout`), con su texto y su stat en el dato — igual que los de la serie.
// Devuelve la pausa entera porque el id elegido se anota en `flags.minijuegosRecientes`.
//
// K6c ("pasaste = firmás", decisión del usuario 2026-10-05): la prueba ya no tira dado después del minijuego. Hay una vara
// (`amateur.varaPrueba`, de tu nivel contra el del club; `veredictoDeLaPrueba` en `core/serie.js`): con el resultado en la vara o arriba firmás seguro;
// abajo, no firmás, y el juego dice por cuánto no llegaste. La previa la dice antes de jugar (`datos.regla` y la apuesta)
// con el mismo número que usa el motor (regla 15).
const TEXTO_SI_NO_ALCANZA = 'Si no alcanza, seguís en la escalera: puede llegar otra oferta, de otro club.';

// K6c (segunda pasada): la vara de la prueba con este club, de tu nivel de hoy contra su calibre (`varaDeLaPrueba`).
function varaDeLaPruebaDelClub(state, org) {
  return varaDeLaPrueba(nivelDelJugador(state), org.fuerza);
}

// Por qué la vara está donde está, en palabras: tu nivel contra el del club (los dos números, regla 13).
function textoDeLaVara(state, org) {
  const nivel = Math.round(nivelDelJugador(state));
  return `tu nivel ${nivel} contra el ${org.fuerza} del club: cuanto más los superás, menos te piden`;
}

// K6c-fix ("el club firma tu nivel, no tu día"): la vara puede ser 0 (tu nivel claramente arriba del club). Entonces firmás
// aunque la prueba salga mal, y los textos lo dicen así en vez de "necesitás 0%" (regla 15: la tarjeta promete lo que hace
// `resolverLaPrueba`). Lo que la prueba sigue decidiendo es el crédito de entrada (`bonusJerarquiaTryout`).
const TEXTO_VARA_CERO = 'con tu nivel te firman aunque la prueba salga mal';

function anuncioDeLaVara(state, org, vara) {
  return vara === 0
    ? `Antes de firmar hay una prueba, pero ${TEXTO_VARA_CERO}: la vara es 0% (${textoDeLaVara(state, org)}). Firmás seguro y se termina la etapa amateur; la prueba decide con cuánto crédito entrás.`
    : `Antes de firmar hay una prueba: necesitás ${vara}% para que te firmen (${textoDeLaVara(state, org)}). Si llegás, firmás seguro y se termina la etapa amateur; si no, seguís en la escalera.`;
}

function pausaDeLaPrueba(state, datosOferta) {
  const entrada = elegirMinijuego(state, 'tryout');
  const textos = textoDeMinijuego(entrada, state);
  // La vara viene armada de la oferta (`buscarSalida`); un guardado con la oferta pendiente de antes la recalcula igual.
  const vara = datosOferta.vara ?? varaDeLaPruebaDelClub(state, datosOferta.org);
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
        // K4c (revisión), regla 15: la apuesta dice también qué pasa si no alcanza (lo que hace `resolverLaPrueba`).
        apuesta: vara === 0
          // Sin la apuesta del dato ("decide si te firman"), que con la vara en 0 no es cierta.
          ? `Con tu nivel te firman aunque la prueba salga mal (la vara es 0%): lo que hagas acá decide cuánto crédito traés el primer día en el equipo.`
          : `${textos.apuesta} Necesitás ${vara}% para que te firmen. ${TEXTO_SI_NO_ALCANZA}`,
        // K6c: la vara, a la vista antes del minijuego (la línea de la regla de la previa) y en número para la pantalla.
        regla: vara === 0
          ? `La vara: 0% (${textoDeLaVara(state, datosOferta.org)}). Firmás seguro: ${TEXTO_VARA_CERO}, el club firma tu nivel y no tu día.`
          : `La vara: ${vara}% (${textoDeLaVara(state, datosOferta.org)}). Si llegás, firmás seguro; si no, no firmás.`,
        vara,
        oferta: datosOferta
      }
    }
  };
}

// K6c (T1, declarado): sin dado, la prueba ya no consume `rng` (antes tiraba un `chance` siempre, también con p 0 o 1).
// Se saca la tirada en vez de dejarla consumida sin uso: el plan del año (más abajo) ya corre el stream de toda carrera
// amateur, así que conservarlo no salvaba ninguna seed, y una tirada que no decide nada sería una trampa para el próximo.
function resolverLaPrueba(state, decision, respuesta) {
  const resultado = clamp(respuesta.resultado ?? 0.5, 0, 1);
  const veredicto = veredictoDeLaPrueba(resultado, decision.datos.vara);
  const { org } = decision.datos.oferta;
  if (!veredicto.pasa) {
    // La firma se posterga: seguís en la escalera (la fase no cambia, no queda crédito) y puede llegar otra oferta, de otro
    // club: este queda en el año (`conOfertaDelAnio`) y no vuelve a ofrecer en esta ventana.
    return {
      state: conOfertaDelAnio(state, { org: org.nombre, tier: 3, desenlace: 'prueba', falta: veredicto.falta }),
      // `oferta.org` es la org entera (`elegirOrgTier3`): el texto lleva su nombre.
      logs: [crearLog('amateur', `No llegaste: sacaste ${veredicto.sacaste}% y la vara era ${veredicto.vara}%, te faltó ${veredicto.falta}%. ${org.nombre} no te firma. Seguís en la escalera: puede llegar otra oferta, de otro club.`)]
    };
  }
  const bonus = Math.round((resultado - 0.5) * 2 * minijuegoPorId(decision.datos.minijuego).impacto);
  const conBonus = { ...state, flags: { ...state.flags, bonusJerarquiaTryout: bonus } };
  const { state: firmadoSinMarca, logs } = firmarConEquipo(conBonus, { datos: decision.datos.oferta });
  // K4-C: si esta prueba te firmó directo en tier 2, ese salto ya tuvo la suya (`flags.saltosConPrueba`).
  const firmado = firmadoSinMarca.career.tier === 2
    ? { ...firmadoSinMarca, flags: { ...firmadoSinMarca.flags, saltosConPrueba: [...(firmadoSinMarca.flags.saltosConPrueba ?? []), 'tier2'] } }
    : firmadoSinMarca;
  const credito = bonus >= 0 ? 'con algo de crédito ganado de entrada' : 'sin nada ganado de entrada';

  return {
    state: firmado,
    logs: [
      crearLog('amateur', veredicto.vara === 0
        ? `Te firman: con tu nivel, la vara era 0% (sacaste ${veredicto.sacaste}%). Entrás ${credito}.`
        : `Te firman: sacaste ${veredicto.sacaste}% y la vara era ${veredicto.vara}%. Entrás ${credito}.`),
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
  // K6c: el "no" queda en el año (el resumen y la ventana: ese club no vuelve a ofrecer este año).
  const conRechazo = conOfertaDelAnio(state, { org: decision.datos.org.nombre, tier: decision.datos.tier, desenlace: 'rechazada' });
  return {
    state: {
      ...conRechazo,
      player: { ...conRechazo.player, stats: { ...conRechazo.player.stats, hype: clampStat(conRechazo.player.stats.hype + hypeGanado) } }
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

  // K6c: arranca un año (el primero, o el que sigue a un cierre de edad): frena con el resumen y el plan del año.
  if (necesitaPlan(state)) {
    return { state, logs: [], decision: decisionDePlan(state, rng) };
  }

  return continuarElSplit(state, rng);
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

  if (motivo === 'plan_amateur') {
    return resolverPlan(state, decision, respuesta.opcionId, rng);
  }

  if (motivo === 'minijuego') {
    return resolverLaPrueba(state, decision, respuesta);
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
  // K6c: el plan del año, sin elegir: la propuesta de tu perfil (la opción marcada). Sin `rng`.
  if (decision.datos.motivo === 'plan_amateur') {
    return { opcionId: decision.datos.propuesta };
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
