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

  // La escalera de soloQ real. El ascenso es por LP: no hay series de promocion
  // desde 2023. Sin decay: un pro juega soloQ todos los dias.
  ranked: {
    lpPorDivision: 100,
    divisionesPorTier: 4,
    // Al descender de division no caes en 0 LP.
    lpDescenso: [25, 50, 75],
    // En el juego son 10 partidas de proteccion; a escala de split, un split.
    escudoSplits: 1,
    // El cutoff de Gran Master orbita el de Challenger.
    proporcionCutoffGM: 0.62,
    cutoffSpread: 0.08,

    // Donde arranca un pibe de 15. No es Platino: la mediana de la ladder esta
    // en Plata/Oro, y el potencial oculto corre el punto de partida.
    puntosInicialesBase: 300,
    puntosInicialesPorPotencial: 12,
    puntosInicialesSpread: 180,
    puntosInicialesMin: 200,

    // Percentil de la playerbase por debajo de cada tier (distribucion real).
    percentilPorTier: {
      iron: 3, bronze: 19, silver: 41, gold: 65,
      platinum: 83, emerald: 95, diamond: 99,
      master: 99.9, grandmaster: 99.97, challenger: 99.98
    }
  },

  amateur: {
    // --- El bucle central: 10 bloques de atencion por periodo ---
    bloquesBase: 10,
    bloquesExtraMax: 3,

    // Rendimiento por bloque de ranked. El factor de mecanica y el de mentalidad
    // van de "tiltrado" a "en llamas"; la deuda de sueño te frena aunque juegues.
    lpPorBloque: 52,
    lpPorBloqueSpread: 12,
    lpFactorMecanicaBase: 0.7,
    lpFactorMecanicaRango: 0.6,
    lpFactorMentalidadBase: 0.55,
    lpFactorMentalidadRango: 0.6,
    lpPenalPorDeuda: 0.15,
    lpPenalPorDeudaMax: 0.5,
    // El freno del ascenso: cuanto mas arriba estas, mejor es la gente que te
    // toca. `puntosEscaleraCompleta` es el punto de la escalera que se considera
    // nivel 100 (Challenger de un servidor grande), y la ganancia depende de la
    // distancia entre tu mecanica y el nivel que exige el rango donde estas.
    puntosEscaleraCompleta: 4300,
    escalaNivelLadder: 26,
    alturaFactorBase: 0.72,
    alturaFactorMin: 0.05,
    alturaFactorMax: 1.7,

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
    // El gate no es un umbral de LP: es la posicion en la ladder del servidor.
    // 'apice' = Master/Gran Master, 'challenger' = adentro de los cupos,
    // 'elite' = arriba de todo y todavia joven (el caso Calix).
    scoutingProbPorNivel: { apice: 0.26, challenger: 0.5, elite: 0.82 },
    puestoParaOrgGrande: 50,
    edadParaOrgGrande: 17,
    scoutingPesoBase: 0.65,
    // El mercado prefiere jovenes, y esto es lo que cierra la ventana de los
    // prospectos: no es un limite de edad duro, es que a los 19 ya casi nadie
    // te mira aunque tengas el mismo rango que a los 16. Es el mismo sesgo
    // etario que despues gobierna el retiro.
    scoutingSesgoEtario: { 15: 1, 16: 1, 17: 0.85, 18: 0.55, 19: 0.28 },
    scoutingSesgoEtarioMinimo: 0.12,
    scoutingPesoHype: 0.35,
    hypeReferenciaScouting: 60,
    splitMinimoScouting: 3,
    // Master arranca el radar de los scouts.
    puntosParaRadar: 2800,

    // --- Salida 2: la negociacion con los viejos al llegar a Master ---
    negociacionTrustMinimo: 38,

    // --- Salida 3: pasarte a nocturno ---
    nocturnoEstudiosUmbral: 52,
    nocturnoCostoTrustMin: 8,
    nocturnoCostoTrustMax: 16,
    nocturnoBloquesExtra: 2,
    nocturnoFactorDecaeEstudio: 0.35,

    // Tope duro de la etapa. La ventana real se cierra antes, por el sesgo
    // etario del scouting: esto es solo la red que impide una etapa infinita.
    edadLimite: 20,

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
    secundarioAprobadoUmbral: 45,

    // LP de un split "normal": es la vara contra la que se mide si venís en
    // racha o en slump durante la etapa amateur.
    lpReferenciaHistorial: 190
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

  // Umbrales que convierten el estado en contexto de carrera. Son las fronteras
  // de las bandas: todo el contenido se declara contra ellas, asi que moverlas
  // mueve que contenido aparece cuando.
  contexto: {
    // Techo de cada banda de edad; por encima de la ultima, 'veterana'.
    edadBandas: { temprana: 16, joven: 19, pico: 23, tardia: 26 },
    // Techo de cada banda de jerarquia; por encima de la ultima, 'franquicia'.
    estatusBandas: { rookie: 35, titular: 60, referente: 82 },
    splitsDeDebut: 3,
    // Ventana movil con la que se calcula el momentum.
    historialMaximo: 3,
    // Percentil de posicion en la liga; por encima del ultimo, 'crisis'.
    momentumBandas: { racha: 0.22, estable: 0.55, slump: 0.8 },
    margenMentalidadAlLimite: 12
  },

  contenido: {
    minimoEventosPorCelda: 3,
    objetivoOpciones: 150
  },

  rutinas: {
    // Cuantas formas de vivir el periodo se ofrecen por decision. Tres es el
    // maximo que se puede leer de un vistazo sin que se sienta un formulario.
    ofrecidas: 4,
    // Cuanto castiga el jugador automatico robarle horas al sueño al comparar rutinas.
    penalRoboEnAuto: 0.06
  },

  roster: {
    // Al entrar a un equipo sos el rookie: la jerarquia arranca abajo y hay que
    // ganarsela split a split. Cambiar de equipo la resetea parcialmente.
    jerarquiaInicial: 22,
    jerarquiaInicialSpread: 7,
    jerarquiaRetenidaAlCambiar: 0.35,
    jerarquiaVelocidad: 0.4,
    // Lo que se espera de vos crece con tu propia jerarquia: a la franquicia no
    // le alcanza con rendir como uno mas.
    exigenciaBase: 0.86,
    exigenciaPorJerarquia: 0.3,
    jerarquiaRuido: 2.5,
    // Cuanto rendimiento por encima de lo esperado hace falta para subir.
    jerarquiaReferenciaRendimiento: 12,

    // Sinergia: quimica colectiva, distinta del estatus personal. Sube sola con
    // los splits juntos y se resetea parcialmente cuando cambia el roster.
    sinergiaInicial: 40,
    sinergiaInicialSpread: 10,
    sinergiaObjetivo: 82,
    sinergiaVelocidad: 0.18,
    sinergiaRuido: 3.5,
    sinergiaRetenidaAlCambiar: 0.55,

    // Nivel de los companeros: orbita la fuerza de la org.
    nivelCompaneroSpread: 8,
    // Cada tanto se va alguien y el roster se sacude.
    probCambioDeRoster: 0.1
  },

  rendimiento: {
    // El draft: la probabilidad de que te den el campeon que queres depende de
    // tu jerarquia. Es el primer eslabon de la espiral central de CONCEPTO §7.
    draftBase: 0.35,
    draftPorJerarquia: 0.55,

    // Rendimiento = atributos ponderados por rol, corridos por meta, maestria,
    // sinergia, jerarquia y ruido gaussiano.
    maestriaPesoEnRendimiento: 0.3,
    sinergiaPesoEnRendimiento: 0.2,
    jerarquiaPesoEnRendimiento: 0.12,
    ruidoRendimiento: 7,

    // Como se traduce a resultado del equipo.
    pesoJugadorEnEquipo: 0.35,
    ruidoRival: 13,

    // Consecuencias
    hypePorTitulo: 9,
    hypePorPodio: 4,
    hypePorRendimiento: 0.08,
    hypeDecaimiento: 1.2,
    mentalidadPorTitulo: 7,
    mentalidadPorPodio: 3,
    mentalidadPorFracaso: -4,
    posicionFracaso: 0.6,

    // Internacionales: al cierre de temporada, el campeon de la liga viaja.
    posicionParaInternacional: 1,
    prestigioReferencia: 70
  },

  practica: {
    // La version profesional del recurso escaso: entre splits repartis puntos
    // de preparacion. Es tambien la unica forma de recuperar mentalidad.
    puntos: 6,
    gananciaPulir: 7,
    gananciaMecanica: 2.2,
    gananciaMacro: 1.8,
    gananciaDescanso: 4.5,
    maestriaCampeonNuevo: 30,
    maestriaCampeonNuevoSpread: 6,
    poolMaximo: 6,
    ruidoPractica: 0.8,
    // Como reparte el jugador automatico en la simulacion masiva.
    autoPesoPulir: 2.4,
    autoPesoNuevo: 1.1,
    autoPesoMecanica: 1.6,
    autoPesoMacro: 1.3,
    autoPesoDescanso: 1.5,
    autoReaccionMentalidad: 5,
    autoMentalidadObjetivo: 55
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
