export const BALANCE = {
  // Rango universal de cualquier stat de 0 a 100.
  stats: {
    min: 0,
    max: 100
  },

  // Topes de seguridad del motor. No son reglas de juego: evitan loops infinitos
  // si un sistema queda mal configurado.
  partida: {
    maxSplitsDeSeguridad: 90,
    maxDecisionesPorSplit: 8
  },

  // Valores de arranque del jugador. Son las bases sobre las que el mundo
  // generado (paso siguiente del roadmap) aplica su dispersion.
  inicial: {
    stats: {
      mecanica: 55,
      macro: 50,
      teamfight: 50,
      laneo: 50,
      shotcalling: 45,
      adaptabilidad: 50,
      mentalidad: 70,
      hype: 40
    },
    studies: 70,
    familyTrust: 60,
    sleep: 75,
    soloqElo: 1200
  },

  // Escalera de soloQ. El ascenso es por LP: no hay series de promocion.
  rangos: [
    { nombre: 'Oro', lp: 0 },
    { nombre: 'Platino', lp: 1150 },
    { nombre: 'Esmeralda', lp: 1450 },
    { nombre: 'Diamante', lp: 1750 },
    { nombre: 'Máster', lp: 2200 },
    { nombre: 'Gran Máster', lp: 2600 },
    { nombre: 'Challenger', lp: 2950 }
  ],

  amateur: {
    // --- El bucle central: 10 bloques de atencion por periodo ---
    bloquesBase: 10,
    bloquesExtraMax: 3,

    // Rendimiento por bloque de ranked. El factor de mecanica y el de mentalidad
    // van de "tiltrado" a "en llamas"; la deuda de sueño te frena aunque juegues.
    lpPorBloque: 19,
    lpPorBloqueSpread: 7,
    lpFactorMecanicaBase: 0.7,
    lpFactorMecanicaRango: 0.6,
    lpFactorMentalidadBase: 0.55,
    lpFactorMentalidadRango: 0.6,
    lpPenalPorDeuda: 0.15,
    lpPenalPorDeudaMax: 0.5,

    estudioPorBloque: 3.4,
    suenoPorBloque: 4.5,
    familiaPorBloque: 2.8,

    // --- Deriva pasiva del periodo (pase lo que pase) ---
    // Los estudios decaen solos: es LA barra que genera la tension de la etapa.
    estudioDecae: 8.5,
    estudioDecaeSpread: 2,
    exigenciaColegioReferencia: 50,
    suenoDecae: 4,
    suenoDecaeSpread: 1.2,
    // La confianza familiar esta acoplada a los estudios: cae sola, y cae mas
    // rapido cuanto peor te va en el colegio.
    confianzaDecae: 1.6,
    confianzaDecaeSpread: 0.8,
    confianzaEstudioUmbral: 55,
    confianzaEstudioPenal: 0.06,

    // --- Robarle horas al sueño: la trampa ---
    suenoPorBloqueRobado: 6,
    mentalidadPorBloqueRobado: 1.4,
    // Cada periodo consecutivo robando pesa mas que el anterior.
    penalRoboConsecutivo: 0.55,
    robosParaDeuda: 3,
    deudaMaxima: 4,

    // --- Bandas de riesgo (no hay un numero exacto donde pincha) ---
    // Probabilidad = (umbral - estudios) / pendiente, con techo, multiplicada
    // por lo estrictos que salieron los viejos y por la confianza que queda.
    avisoUmbral: 72,
    avisoPendiente: 90,
    avisoTecho: 0.55,
    confiscacionUmbral: 55,
    confiscacionPendiente: 70,
    confiscacionTecho: 0.32,
    corteUmbral: 38,
    cortePendiente: 60,
    corteTecho: 0.22,
    riesgoTotalTecho: 0.45,
    toleranciaReferencia: 50,
    trustReferencia: 50,
    trustPesoEnRiesgo: 0.01,
    trustModMin: 0.5,
    trustModMax: 1.6,
    avisoCostoTrustMin: 2,
    avisoCostoTrustMax: 6,
    confiscacionCostoTrustMin: 4,
    confiscacionCostoTrustMax: 9,
    // El periodo con la PC confiscada: no jugas, pero recuperas otras cosas.
    periodosSinPC: 1,
    sinPCEstudioMin: 6,
    sinPCEstudioMax: 12,
    sinPCTrustMin: 3,
    sinPCTrustMax: 8,
    sinPCSuenoMin: 5,
    sinPCSuenoMax: 11,
    sinPCMentalidadMin: -7,
    sinPCMentalidadMax: -2,

    // --- Salida 1: te ficha un equipo ---
    eloMinimoScouting: 1880,
    eloScoutingRango: 700,
    scoutingProbMax: 0.46,
    scoutingPesoElo: 0.6,
    scoutingPesoHype: 0.4,
    hypeReferenciaScouting: 60,
    splitMinimoScouting: 3,

    // --- Salida 2: la negociacion con los viejos al llegar a Master ---
    negociacionTrustMinimo: 38,

    // --- Salida 3: pasarte a nocturno ---
    nocturnoEstudiosUmbral: 52,
    nocturnoCostoTrustMin: 8,
    nocturnoCostoTrustMax: 16,
    nocturnoBloquesExtra: 2,
    nocturnoFactorDecaeEstudio: 0.35,

    // --- Fin de la etapa: a los 18 se termina el margen ---
    edadLimite: 18,

    // --- Como reparte el jugador automatico (simulacion masiva) ---
    // No reparte al azar: reacciona a las barras que tiene en rojo, como haria
    // alguien con criterio. Es la unica forma de que simulate.js mida el juego
    // y no el ruido.
    autoPesoRanked: 4.6,
    autoPesoEstudiar: 0.9,
    autoPesoDormir: 0.7,
    autoPesoFamilia: 0.6,
    autoReaccionColegio: 3.2,
    autoReaccionFamilia: 2.6,
    autoReaccionSueno: 1.8,
    autoSuenoObjetivo: 70,
    autoRuido: 0.3,
    autoPesoMinimo: 0.15,
    autoProbRobar: 0.4,

    // Umbral de estudios con el que se congela el flag del secundario.
    secundarioAprobadoUmbral: 45
  },

  atributos: {
    // --- Curva de carrera ---
    // El nivel objetivo de un stat "de manos" es techo * (piso + (1-piso)*f),
    // donde f sube hacia la edad de pico propia y despues cae. No hay edad de
    // pico fija ni declive anunciado: cada jugador tiene la suya.
    pisoJuvenil: 0.55,
    anchoSubida: 8,
    anchoBajada: 8,
    factorMinimo: -0.4,

    // El techo real sube un poco con los splits jugados: la experiencia corre
    // el potencial, no lo reemplaza.
    bonusPorSplit: 0.3,
    bonusMaximo: 15,

    // --- Rachas y slumps ---
    // La forma deriva sola y no se le explica nunca al jugador: la siente en
    // los resultados. Persistencia alta = las rachas duran varios splits.
    formaPersistencia: 0.72,
    formaShock: 0.26,
    formaAmplitud: 0.13,
    formaMax: 0.9,

    // --- Stats que siguen la curva (suben y bajan) ---
    // `declive` modula cuanto les pega la caida: el laneo y el teamfight son
    // en parte conocimiento, asi que se caen menos que las manos.
    curvas: {
      mecanica: { declive: 1, velocidad: 0.3, ruido: 1.7 },
      laneo: { declive: 0.6, velocidad: 0.22, ruido: 1.5 },
      teamfight: { declive: 0.45, velocidad: 0.2, ruido: 1.5 }
    },

    // --- Stats que se acumulan (el macro no declina: sostiene a los veteranos) ---
    acumulativos: {
      macro: { ganancia: 1.15, spread: 0.6, permiteBajar: false },
      shotcalling: { ganancia: 0.95, spread: 0.8, permiteBajar: true },
      adaptabilidad: { ganancia: 0.55, spread: 0.9, permiteBajar: true }
    },
    techoAcumulativoBonus: 12,

    // --- La mentalidad es la moneda: siempre cuesta, nunca se repone sola ---
    desgasteBase: 1.2,
    desgasteSpread: 0.9,
    suenoConfortable: 65,
    // Fuera de la etapa amateur el sueño deja de administrarse a mano y vuelve
    // solo hacia un descanso normal: hay horarios y gaming house.
    suenoRegresionPro: 0.35,
    suenoRuidoPro: 3,
    suenoPesoEnDesgaste: 0.07,
    recuperacionPorSuenoAlto: 0.13,
    deudaPesoEnDesgaste: 1,

    // --- Burnout: no es un acantilado, es una probabilidad que crece ---
    burnoutUmbral: 20,
    burnoutPendiente: 60,
    burnoutTecho: 0.4
  },

  meta: {
    pesoInicial: 1,
    pesoMinimo: 0.5,
    pesoMaximo: 2.6,
    derivaMedia: 0,
    maxDelta: 0.15,
    // Casi siempre el parche es calmo. Cada tanto el meta se sacude entero y
    // deja obsoleto medio pool: es lo que puede costarte un año de carrera.
    probSacudon: 0.07,
    sacudonDelta: 0.55
  },

  campeones: {
    // Jugar un campeon lo afila con rendimientos decrecientes; no jugarlo lo
    // oxida. Por eso no se pueden mantener diez a punto.
    maestriaGanancia: 8,
    maestriaGananciaSpread: 2.2,
    maestriaDecaimiento: 1.5,
    maestriaDecaimientoSpread: 1,
    maestriaMinima: 5,
    // Cuanto sesga la maestria la eleccion del campeon: con sesgo alto te
    // especializas y aparece la signature; con sesgo bajo rotas y no domina ninguno.
    sesgoMaestriaEnPick: 2,
    // Signature: mucha maestria Y muchas partidas encima. Va a la tarjeta final.
    signatureMaestria: 85,
    signaturePartidas: 12,
    // 50 = tu pool es exactamente promedio para este meta.
    ajusteNeutro: 50,
    multiplicadorMin: 0.75,
    multiplicadorMax: 1.25
  },

  edad: {
    splitsPorEdad: 3,
    probSegundaDecision: 0.4
  },

  // Generacion del mundo: todo lo que se sortea una sola vez, al empezar, y que
  // hace que dos seeds no arranquen la misma partida (CONCEPTO §8).
  mundo: {
    dispersionStats: 7,
    dispersionBarras: 9,
    exigenciaColegioMin: 20,
    exigenciaColegioMax: 95,
    toleranciaViejosMin: 15,
    toleranciaViejosMax: 90,
    apoyoEconomicoMin: 10,
    apoyoEconomicoMax: 90,
    potencialMedia: 74,
    potencialSpread: 13,
    potencialMin: 42,
    potencialMax: 100,
    pesoMetaInicialMin: 0.6,
    pesoMetaInicialMax: 1.6,
    fuerzaOrgSpread: 11,
    fuerzaOrgMin: 20,
    fuerzaOrgMax: 99,
    campeonesIniciales: 3,
    maestriaInicialMin: 25,
    maestriaInicialMax: 55,
    cantidadRivales: 5,
    rivalPotencialMedia: 66,
    rivalPotencialSpread: 15,
    formaInicialSpread: 0.35,
    probHandleConNumero: 0.25,
    numeroHandleMin: 1,
    numeroHandleMax: 99
  },

  // Las cinco formas de carrera de CONCEPTO §6. `picoEdad` es la MEDIA de la
  // edad de pico, no la edad de pico: cada jugador sortea la suya alrededor.
  // `caida` es cuanto pesa el declive despues del pico (el macro no la usa).
  formasCarrera: {
    precoz: { peso: 2, picoEdad: 20, picoSpread: 1.2, amplitud: 1.15, caida: 1.5 },
    estandar: { peso: 4, picoEdad: 23, picoSpread: 1.5, amplitud: 1.0, caida: 1.0 },
    meseta_larga: { peso: 2, picoEdad: 24, picoSpread: 1.5, amplitud: 0.92, caida: 0.45 },
    tardia: { peso: 2, picoEdad: 26, picoSpread: 1.8, amplitud: 1.05, caida: 0.9 },
    erratica: { peso: 1, picoEdad: 23, picoSpread: 3.0, amplitud: 1.1, caida: 1.2 }
  }
};
