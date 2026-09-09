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
    // Con densidad emergente un split denso puede encadenar varias decisiones
    // (evento + evento + mercado + cierre, fases 2 y 5). Fase 4 sube el techo
    // de nuevo (trampa T9, prevista desde la fase 2): un título + viaje al
    // internacional puede encadenar draft + minijuego por cada mapa de hasta
    // 4 series (cuartos/semis/final/internacional), y eso solo en el split de
    // cierre de temporada. El tope sigue siendo una red anti-loop, no una
    // regla de juego: si algo lo alcanza, es un bug.
    maxDecisionesPorSplit: 60
  },

  // Constantes puras de `core/numeros.js`: la matemática que otros sistemas
  // consumen, sin efecto de juego propio.
  numeros: {
    // Aproximación logística de la CDF normal: Φ(x) ≈ 1/(1+e^(−1.702·x)). El
    // 1.702 minimiza el error máximo contra la normal. Lo usa
    // `probabilidadDeGanar` (draft de 9Rd).
    factorLogisticoNormal: 1.702
  },

  // Cuánto corren los stats la probabilidad de un outcome (CONCEPTO §8: "la
  // opción obviamente correcta sale mal a veces; tus stats corren esos pesos,
  // no los eliminan"). Ver `modificadores` en el esquema de eventos.
  eventos: {
    // Piso como fracción del peso base: ningún outcome cae por debajo de esto
    // sin importar cuánto empeore el stat. Corre los pesos, no los borra.
    pisoPesoEfectivo: 0.15,
    // Fase 7: memoria anti-repetición. Cada vez que un evento sale, su peso
    // efectivo se divide por (1 + vistas × fatigaPorVista) la próxima vez que
    // compite — y si nunca salió, se multiplica por bonusNovedad. Sin esto,
    // el catálogo se recicla en round-robin (el evento más repetido salía 10
    // veces por carrera, mediana) porque lo único que evitaba el repetido era
    // el cooldown fijo del propio evento.
    fatigaPorVista: 0.8,
    bonusNovedad: 2.5,
    // Fase 9Ra: el cooldown de un evento se cuenta en SPLITS, no en "próximos N
    // eventos resueltos". Este es el piso para los 8 eventos que declaran
    // `cooldown: 0` o lo omiten — sin él podían repetir en el mismo split.
    // 1 = "nunca dos veces en el mismo split". No se retunea acá (regla 2): el
    // ajuste fino de los cooldown del catálogo es 9Rg.
    cooldownMinimoSplits: 1
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

    // Techo de `orden` de tier para cada banda del eje `ladder` del contexto.
    // Por encima de `medio` y sin llegar al apice: 'alto'. Los tiers apice
    // resuelven por cupo, no por orden.
    bandasDeLadder: { bajo: 2, medio: 4 },

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
    // Fase 7 (recalibrado, medido — ver PROGRESO.md): 52 → 68. La etapa
    // amateur medía 15 splits de mediana y el 49% de las carreras no llegaba
    // a pro; con la carrera profesional ahora jugable de verdad (fases 5-6),
    // el prólogo tiene que ser un prólogo, no la mitad de la partida.
    lpPorBloque: 68,
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
    // Fase 7: 4300 → 4700. Aflojar el freno un poco (sin sacarlo) es la otra
    // mitad de comprimir el prólogo: con lpPorBloque más alto pero el mismo
    // freno de siempre, la subida se frenaba igual cerca de la cima.
    puntosEscaleraCompleta: 4700,
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
    // Fase 7: cada nivel casi duplicado (0.26/0.5/0.82 → 0.5/0.72/0.9). Antes
    // de esto, llegar a Máster no significaba llegar a fichar: podías quedar
    // ahí varios splits esperando que un scout tirara los dados.
    scoutingProbPorNivel: { apice: 0.5, challenger: 0.72, elite: 0.9 },
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
    splitMinimoScouting: 2,
    // Master arranca el radar de los scouts. Fase 7: 2800 → 2200, junto con
    // el freno más flojo de arriba, para que el radar se encienda antes.
    puntosParaRadar: 2200,

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
    // Fase 9 (CONCEPTO §12.4): suavizado ~40% desde el valor original (1 / 0.6 /
    // 0.45). El hallazgo que lo motiva es que el declive real es casi todo
    // mercado y casi nada biológico — la curva sigue notándose (`CONCEPTO` §6
    // la necesita: es la razón mecánica para invertir en macro, y la fase 8
    // recién la hizo visible con las ▲▼) pero deja de ser lo que retira.
    curvas: {
      mecanica: { declive: 0.6, velocidad: 0.3, ruido: 1.7 },
      laneo: { declive: 0.36, velocidad: 0.22, ruido: 1.5 },
      teamfight: { declive: 0.27, velocidad: 0.2, ruido: 1.5 }
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
    burnoutTecho: 0.4,
    // Fase 9R.2: el burnout NO puede pinchar de un split para el otro. Solo
    // entra al sorteo si la mentalidad estuvo bajo `burnoutMentalBajo` (la
    // banda `al_limite` / roja de la ficha) durante al menos
    // `burnoutSplitsMinimos` splits seguidos — así el jugador siempre lo ve
    // venir en la barra que la fase 9R.2 hizo visible. El piso duro
    // (`mentalidad <= 0`) sigue cerrando la carrera sin sorteo.
    burnoutMentalBajo: 30,
    burnoutSplitsMinimos: 2,
    // Tope a cuánto puede bajar la mentalidad por el DESGASTE de un split (no
    // cuenta lo que muevan los eventos). Sin esto, la espiral de deuda de
    // sueño se cobraba toda junta. Con el `burnoutSplitsMinimos` de arriba,
    // ~87% de los burnouts pasan ≥2 de los 3 splits previos en zona roja
    // visible.
    maxCaidaMentalPorSplit: 12
  },

  meta: {
    pesoMinimo: 0.5,
    pesoMaximo: 2.6,
    // Cada tanto sale un campeon nuevo de tu rol. Con ~0.08 por split, una
    // carrera de 30 splits ve dos o tres, que es el ritmo real.
    probCampeonNuevo: 0.08,
    // Cuantos splits "salió un campeón nuevo" sigue siendo noticia. Sin fecha de
    // vencimiento la marca queda prendida el resto de la carrera.
    splitsCampeonNuevo: 3
  },

  // El meta con nombre (fase 6). Reemplaza el random walk de nueve pesos por
  // un régimen de `data/metas.json` que fija esos mismos pesos: "meta de
  // tanques" en vez de un ajuste de 49/100 que nadie puede leer.
  regimen: {
    // Lo que el régimen sube, lo neutro, y lo que hunde. El vector de pesos
    // sigue siendo el vocabulario de siempre (ARQUETIPOS); lo único que
    // cambia es quién lo escribe.
    pesoSube: 2.0,
    pesoNeutro: 1.0,
    pesoHunde: 0.6,
    // Ruido chico por split para que dos splits del mismo régimen no sean
    // idénticos, sin que se note como un régimen distinto.
    ruidoPorSplit: 0.12,
    // Al abrir cada season el régimen puede cambiar entero (número textual
    // del usuario). A mitad de cualquier split, un parche correctivo más
    // raro puede virarlo de nuevo.
    probCambioApertura: 0.6,
    probCambioCorrectivo: 0.25,
    // La tier list de tu rol corta por RANGO (fracción del rol ordenado por
    // afinidad), no por afinidad absoluta: así el corte se comporta igual
    // sin importar qué tan extremo sea el régimen vigente.
    corteS: 0.18,
    corteA: 0.45,
    corteB: 0.75,
    // Cuánto pesa cada tier al construir el boost del pool (6.3): un campeón
    // en S con maestría alta pesa mucho, uno en C no suma nada.
    pesoTierS: 1.0,
    pesoTierA: 0.6,
    pesoTierB: 0.25,
    pesoTierC: 0
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
    multiplicadorMax: 1.25,

    // Nadie compite con menos de dos campeones, y un pool vacio rompe el draft.
    poolMinimo: 2,
    // Bandas del pool para gatear contenido (marcas `pool_angosto` / `pool_ancho`).
    poolAngosto: 3,
    poolAncho: 6,
    // Bandas del Ajuste al Meta para las marcas `pool_en_meta` / `pool_fuera_meta`.
    ajusteAFavor: 62,
    ajusteEnContra: 38,
    // Cuantos campeones del rol se consideran "el meta" del parche. Es lo que
    // hace que el meta se pueda NOMBRAR ("manda Sejuani") en vez de describirse
    // por arquetipo, y lo que el rival quema primero en una serie (fase 4).
    campeonesEnMeta: 3,
    // Tu main esta muerto si su afinidad quedo por debajo de esta fraccion de la
    // afinidad del mejor campeon del parche.
    umbralMainMuerto: 0.82
  },

  edad: {
    splitsPorEdad: 3,
    // Probabilidad de que se amontone una segunda decision en el mismo split,
    // segun cuanto cambio el contexto en lo que va del split (fase 2, regla:
    // novedad = densidad; ver core/presupuesto.js). Un split denso casi
    // siempre pide una segunda decision; uno comprimido casi nunca.
    probSegundaDecisionPorTipo: { denso: 0.85, normal: 0.4, comprimido: 0.12 }
  },

  // Fase 9Rf: el presupuesto de interrupción. `events.js` pausaba una vez por
  // split siempre que hubiera candidato (más una segunda por probabilidad), y
  // eso nunca tuvo techo — era la fuente más grande de decisiones que quedaba
  // tras 9Re (~68 de las ~173 de la carrera). Ahora cada split tiene un cupo:
  // uno EVENTFUL (debutás, cambiás de tier, se te murió el main, o es un split
  // de playoffs) te puede frenar `eventful` veces; uno de rutina, `rutina`.
  // Todas las pausas cuentan contra el cupo —incluidas las de mercado, cierre
  // de edad y serie—, pero solo `events` lo consulta antes de frenar; el resto
  // son decisiones obligatorias o ya gateadas por su propio sistema.
  presupuesto: {
    interrupcionesPorSplit: { eventful: 2, rutina: 1 }
  },

  // El año calendario (fase 8, PLAN.md §8.2): no existía. `anio` sale de
  // `anioBase + floor(splitCount / splitsPorEdad)`, calculado en
  // `systems/edadInicio.js`. Desbloquea trofeos fechados y la tarjeta final
  // ("2026-2035"). El motor no consume `rng` para esto: es determinista dado
  // el estado.
  calendario: {
    anioBase: 2026
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
    margenMentalidadAlLimite: 12,
    // Fase 9Md: cuántos splits después de un descenso de tier 1 sigue prendida
    // la marca `descenso`.
    ventanaDescenso: 4
  },

  contenido: {
    // El listón de `cobertura.js --huecos`: cada celda momento×ventana
    // alcanzable tiene que ofrecer al menos esto. Subido 3 → 6 al cerrar 9R.3
    // (9R3e): tras 97 → 218 eventos, la celda más floja alcanzable
    // (`amateur_arranque` / pretemporada) ofrece 11, así que el piso real del
    // catálogo está muy por encima de 6 y el chequeo mide algo exigente.
    minimoEventosPorCelda: 6,
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
    // D39 / 9Rg: la tarjeta de oferta mostraba la jerarquia del INSTANTE de
    // firmar, pero el jugador la lee al cerrar ese mismo split — y para
    // entonces `rendimiento.js` ya la movio. Medido a 438 fichajes: el real
    // termina +6,45 arriba de lo prometido (mediana +6). La tarjeta prometia
    // de menos siempre, que es un bug de confianza al reves pero bug igual
    // (regla de proceso 15). La proyeccion suma esta deriva; `roster.js`
    // sigue asignando el valor crudo al firmar.
    derivaPrimerSplit: 6,
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

  // Arraigo (fase 8, PLAN.md §8.4 y decisión de PARTE 3): distinto de la
  // jerarquia. La jerarquia es tu estatus DEPORTIVO (se resetea al cambiar de
  // equipo, ver `jerarquiaRetenidaAlCambiar` arriba); el arraigo es lo que la
  // gente de una org siente por vos: NUNCA se resetea, se cierra en
  // `career.registro.porOrg` al irte y el nuevo arranca casi en cero, salvo
  // que el hype ya te haya hecho conocido de antes ("tu fama te precede").
  arraigo: {
    porSplitMin: 0.8,
    porSplitMax: 1.6,
    porTituloMin: 8,
    porTituloMax: 14,
    porInternacionalMin: 4,
    porInternacionalMax: 7,
    porFracasoMin: -3,
    porFracasoMax: -1,
    // Cuanto de la brecha de rendimiento (rendimiento.js, misma `brecha` que
    // mueve la jerarquia) se traduce en arraigo cuando rendís por encima de
    // lo esperado.
    factorBrechaRendimiento: 0.35,
    // Con cuanto hype arrancas el arraigo nuevo al cambiar de org (0 a 1,
    // fraccion del hype actual).
    pisoPorHype: 0.15,
    // Los cuatro hitos con nombre (imagen 6 de PLAN.md): Uno mas, Querido,
    // Idolo, Leyenda. Umbral = piso de cada banda.
    hitos: { uno_mas: 0, querido: 25, idolo: 60, leyenda: 88 }
  },

  // Bandas del NIVEL (fase 8): el numero unico 0-100 que resume la hoja de
  // atributos, extraido de la MISMA formula que ya usa calcularRendimiento
  // (core/ficha.js, `nivelDelJugador`). No se retunea la formula, solo se
  // expone.
  ficha: {
    nivelBandas: { prospecto: 45, titular: 62, elite: 78 },
    // Un delta de stat menor a esto no dibuja flecha en la ficha: una deriva
    // de 0,4 no es una noticia.
    umbralFlecha: 1
  },

  // Marcas derivadas de `career.registro` (fase 8D, contenido vivo): leen
  // datos que la fase 8 ya acumula, cero persistencia nueva. `es_campeon` y
  // `paso_por_tier3` son existencia pura (>0), sin umbral que tunear — mismo
  // criterio que ya usa `con_vestuario` en `core/contexto.js`.
  registro: {
    multicampeonUmbral: 3,
    // Splits jugados (con o sin equipo) para contar como "curtido": ya vio de
    // todo, es al que un rookie le pregunta cómo no quemarse.
    curtidoSplitsUmbral: 30,
    // Cuántas organizaciones distintas para leerse como nómade.
    nomadeOrgsUmbral: 3
  },

  rendimiento: {
    // El draft: la probabilidad de que te den el campeon que queres depende de
    // tu jerarquia. Es el primer eslabon de la espiral central de CONCEPTO §7.
    draftBase: 0.35,
    draftPorJerarquia: 0.55,

    // Rendimiento = atributos ponderados por rol, corridos por meta, maestria,
    // sinergia, jerarquia y ruido gaussiano.
    maestriaPesoEnRendimiento: 0.3,
    // Fase 9Rc: la afinidad del campeon al meta pesa la MITAD que la maestria
    // (CONCEPTO §6). Antes `calcularRendimiento` la ignoraba (0 implicito) y el
    // meta solo tocaba el rendimiento via `multiplicadorDeMeta`; ahora tambien
    // via el campeon que terminas jugando (`factorDeCampeon`). Se calibra en 9Rg.
    afinidadPesoEnRendimiento: 0.15,
    sinergiaPesoEnRendimiento: 0.2,
    jerarquiaPesoEnRendimiento: 0.12,
    ruidoRendimiento: 7,

    // Como se traduce a resultado del equipo. 0,35 → 0,5 en 9Rg: medido, un
    // jugador de nivel pico en el cuartil superior de tier1 apenas se
    // distinguía de uno del cuartil inferior (correlación nivel↔posición
    // final de la tabla r=0,09) — "94 de mecánica, franquicia, terminás 8º"
    // porque los compañeros (ruido aleatorio, no mejoran nunca) pesaban el
    // 65% del resultado. A 0,5 la correlación sube a r=0,18: sigue sin ser
    // el único factor (el roster real importa), pero el jugador deja de ser
    // ruido en su propio resultado.
    pesoJugadorEnEquipo: 0.5,

    // Consecuencias
    hypePorTitulo: 9,
    hypePorPodio: 4,
    hypePorRendimiento: 0.08,
    hypeDecaimiento: 1.2,
    mentalidadPorTitulo: 7,
    mentalidadPorPodio: 3,
    mentalidadPorFracaso: -4,
    posicionFracaso: 0.6,

    // Internacionales: al cierre de temporada, viajan los que entren en el
    // cupo de SU liga (fase 3, `liga.cuposInternacionales` en leagues.json —
    // 3 para la mayoría de las tier 1, 2 para CBLOL y LCP). Antes esto estaba
    // hardcodeado a "solo el 1º", que no reflejaba los 19 cupos reales de
    // Worlds 2026.
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
    // Cuantos campeones tiene que ofrecer cada rol en la pantalla de inicio para
    // que elegir 3 sea una decision y no un tramite.
    campeonesElegibles: 12,
    // Campeones marcados `debut` por rol: no estan al arrancar, salen con un
    // parche a mitad de carrera. Con menos de dos, el evento del campeon nuevo se
    // agota en una sola carrera.
    debutsMinimosPorRol: 2,
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
  },

  // Los equipos chicos e inventados donde ficha todo el mundo la primera vez
  // (fase 3). El rango de fuerza es deliberadamente bajo: perder contra un
  // equipo de tier 3 no dice nada de tu techo, perder contra uno de tier 1 sí.
  tier3: {
    cantidadPorRegion: 6,
    fuerzaMedia: 18,
    fuerzaSpread: 6,
    fuerzaMin: 5,
    fuerzaMax: 35
  },

  // El tránsito entre tiers (fase 3 / 9Md). `CLAUDE.md`/el usuario piden que el
  // tier 3 dure poco: `probSalida` alto y sin escalón intermedio, para que la
  // mediana de permanencia quede en 1-2 splits, nunca en una carrera entera.
  competitivo: {
    // Fuerza de los equipos de tier 2: mas que tier 3, bien por debajo de
    // tier 1. Ancla el `prestigio` que ya trae cada liga tier 2 en leagues.json.
    fuerzaOrgTier2Spread: 8,
    fuerzaOrgTier2Min: 15,
    fuerzaOrgTier2Max: 65,

    // Tier 3: cada split hay chance de que se resuelva tu paso por acá. Las
    // dos salidas son subir a tier 2 o que el equipo se disuelva.
    probSalidaTier3: 0.45,
    // De las salidas, cuánto pesa el salto contra la disolución. Corrido por
    // jerarquia: un titular tiene mas para mostrar que un suplente.
    probAscensoBaseDesdeTier3: 0.4,
    probAscensoPorJerarquiaDesdeTier3: 0.35,
    // Si el equipo se disuelve, cuántos splits como libre antes de que otro
    // equipo de tier 3 te levante (siempre alguno te levanta: es tier 3).
    splitsLibrePromedioTier3: 1,

    // Fase 9Md: la escalera de tier 2 y tier 1 deja de sortearse. Se sube y se
    // baja por asientos (`core/demanda.js` / `systems/mercado.js`) y por la
    // tabla (el último de una liga con `desciendeA` desciende, y su org tier-2
    // más fuerte de la región promociona a taparlo). Se borraron
    // `probAscensoBaseDesdeTier2` / `probAscensoPorJerarquiaDesdeTier2`.
    //
    // El "año muerto": sos nivel de tier 1 pero te falta edad para las ligas
    // que la exigen (LEC/LPL: 18). La marca `espera_edad_minima` se prende con
    // esto en tier 2.
    nivelParaTier1: 62,
    edadDebutTardio: 18
  },

  // Los planteles NPC (fase 9M, PLAN.md §9M.2). Valores puestos por criterio
  // y a MEDIR después: regla de proceso 2, el retune de 9M vive en 9Mh. Nadie
  // los toca en el commit que introduce la estructura.
  plantel: {
    tamano: 5,
    // Generación: el nivel de cada casilla orbita la `fuerza` sorteada de su
    // org, así el promedio del plantel ≈ ese valor y la distribución agregada
    // del día 1 no se mueve.
    nivelSpread: 7,
    // Edad de un NPC pro al generar el mundo: mayoría 20-25, algún rookie,
    // algún veterano.
    edadMedia: 22,
    edadSpread: 3,
    edadMin: 17,
    edadMax: 31,
    // Splits ya jugados en la región de su liga al generar (tenencia inicial;
    // lo lee la `residencia` de 9Mb).
    splitsRegionMax: 12,
    // Años de contrato que le quedan al generar.
    contratoAniosMin: 1,
    contratoAniosMax: 3,
    // Sueldo NPC = mediana de su liga · (base + nivel/100 · factor).
    salarioBaseFactor: 0.5,
    salarioNivelFactor: 0.9,
    // Offseason: ruido gaussiano sobre el nivel-de-curva de cada año (rachas).
    ruidoNivelAnual: 3,
    // Un NPC se va del equipo si le venció el contrato, ya pasó su pico por
    // más de `retiroEdadSobrePico` años, y su nivel cayó `retiroNivelBajoOrg`
    // por debajo de la fuerza de la org — o si llegó a `retiroEdadDura`.
    retiroEdadSobrePico: 2,
    retiroNivelBajoOrg: 12,
    retiroEdadDura: 30,
    // Un rival de generación corre una carrera larga (D8): sólo se va de viejo,
    // `rivalRetiroExtra` años más tarde que el resto.
    rivalRetiroExtra: 3,
    // El canterano que sube a cubrir un asiento vacante.
    canteraEdadMin: 17,
    canteraEdadMax: 19,
    canteraNivelBajoOrg: 10,
    // Fase 9Mc: el nivel de un reemplazo (canterano o fichaje del mercado del
    // mundo) regresa un poco hacia el prestigio de su liga en vez de orbitar
    // sólo la `org.fuerza` — que deriva del plantel y, con mucha rotación,
    // se desangra (canterano bajo → fuerza baja → canterano más bajo aún).
    // 0 = puro prestigio de liga, 1 = pura fuerza de la org. En 0,4 la deriva
    // agregada de `org.fuerza` en 20 años queda en ~-3,5 (la misma banda que
    // el mundo pre-9Mc).
    reemplazoRegresionALiga: 0.4
  },

  // La demanda del mercado (fase 9M, PLAN.md §9M.3): reemplaza el `roll(0,
  // techo)` de `systems/mercado.js`. Una oferta llega SI la org tiene un
  // asiento abierto en tu rol, tu nivel entra en su banda y te puede pagar.
  // Valores por criterio, a medir en 9Mh (regla 2).
  demanda: {
    // El NPC de un rol se considera reemplazable si su nivel cayó esto por
    // debajo de la fuerza de la org (aparte de que se le venza el contrato).
    brechaReemplazo: 10,
    // Y el asiento se "abre" si el jugador está claramente por encima del NPC
    // que lo ocupa: la org banca a su titular para ficharte (9R0e — el silencio
    // de mercado no es para una franquicia).
    forzarAsientoSobreNpc: 8,
    // Presupuesto de una org = mediana de su liga · factor · (1 ± fuerza).
    presupuestoOrgFactor: 8.5,
    presupuestoPorFuerza: 0.35,
    // La oferta necesita presupuesto ≥ tu valor de mercado · esto.
    presupuestoMinimoFactor: 0.9,
    // Banda de nivel: una org no ficha muy por debajo de su fuerza ni paga muy
    // por encima de lo que sostiene.
    bandaNivelAbajo: 14,
    bandaNivelArriba: 22,

    // --- Fase 9Mc: la resolución del mercado del mundo (core/mercadoMundial.js).
    // Cada offseason, ANTES de la pantalla del jugador, las orgs con un asiento
    // en juego eligen de arriba hacia abajo. Valores por criterio, retune 9Mh
    // (regla 2). ---
    // Un NPC con contrato vencido que NO se retira: probabilidad de que su org
    // no lo renueve y lo suelte al mercado. Baja (la mayoría renueva); más alta
    // si viene flojo (la org busca upgrade). Sin esto, con contratos de 1-3
    // años el mundo entero rota cada offseason — el grueso del movimiento del
    // mundo son los retiros forzados a los 30 (`plantel.retiroEdadDura`).
    probNoRenovarNpc: 0.04,
    probNoRenovarNpcFlojo: 0.18,
    // El pool de agentes libres sobrantes que viaja en el estado hasta que el
    // jugador responde (sirve para cerrar los asientos congelados con nombre).
    libresRestantesMax: 12,
    // Cuántos traspasos del mundo se le muestran al jugador en la tarjeta de
    // mercado (regla 16: "el dado trajo…"). Los más jugosos primero.
    traspasosEnPantalla: 6
  },

  // El mercado (fase 9, PLAN.md §9.2/§9.7): contratos, sueldos y el sesgo
  // etario que de verdad termina las carreras. CONCEPTO §12.4: el declive de
  // atributos casi no es biológico (~1ms/año de reacción contra 90ms de
  // brecha pro/casual) — lo que retira es que el mercado deja de mirarte, no
  // que bajen tus stats. Constantes que consumen `core/salarios.js` y
  // `core/valorMercado.js`; no se vuelven a investigar (cita ya hecha ahí).
  mercado: {
    ofertasMax: 6,
    probRenovacionBase: 0.55,
    probRenovacionPorJerarquia: 0.35,
    // Splits sin ninguna oferta antes de caer a nivel 'libre' — la puerta por
    // la que se termina la carrera (§9.3 paso 6): mercado.js va antes que el
    // retiro (fase 10) justamente por esto.
    splitsSinOfertaParaLibre: 3,
    aniosContratoMin: 1,
    aniosContratoMax: 3,
    // Cuánto mejor tenés que ser que el mejor local para entrar como import
    // (CONCEPTO §6: "claramente mejor, no apenas mejor"). Lo evalúa
    // `mercado.js` al filtrar ofertas, no `salarioDeOferta`.
    margenImport: 8,
    // Fase 9Md: la escalera deja de ser una jaula — el mercado escanea las 6
    // ligas tier 1. `dificultadAdaptacion` (leagues.json) sube el `margenImport`
    // efectivo: un import a LCK (85) tiene que ser MUCHO mejor que el local; a
    // CBLOL (30), apenas. `margenImportEfectivo = margenImport · (1 +
    // dificultadAdaptacion/100 · factorDificultadImport)`.
    factorDificultadImport: 0.6,
    // `regionDominante` (mundo): las orgs de esa región suben en el orden de la
    // mano (nudge sobre el presupuesto al ordenar, en USD).
    nudgeRegionDominante: 60000,

    // Una oferta lateral se etiqueta 'bombazo' cuando paga bastante más que
    // el contrato vigente — la tarjeta que hace sentir la decisión real
    // (CONCEPTO §7). `margenBombazoFuerza` decide el texto de `riesgo`: si la
    // org destino es bastante más fuerte que el promedio de su liga, avisa
    // que vas a competir por lugar en vez de mandar.
    bombazoMultiplo: 1.4,
    margenBombazoFuerza: 10,

    // Fase 9d (medido): con el sigma completo de la liga, una renovación con
    // tu PROPIA org caía por debajo de la mitad del contrato anterior en un
    // 34.8% de los casos (y hasta 4.5x para arriba) — ruido de una oferta
    // nueva, no la lectura que tendría un club que ya te conoce. Renovar
    // sigue moviéndose con la jerarquía/hype actuales (esa señal no se toca),
    // pero el ruido lognormal se achica: la org que ya te tiene no tira los
    // dados de cero cada vez.
    renovacionSigmaFactor: 0.35,

    // --- Fase 9R0e: la demanda del mercado sale de tu NIVEL contra la liga,
    // no de `roll(0, techo)` a secas. Antes un 85-media franquicia podía sacar
    // roll(0,3)=0 tres pretemporadas y quedarse sin equipo ("clasificado a
    // Worlds y me quedé libre"). Adelanto quirúrgico de 9M.3 (sin el sim NPC):
    // sólo cambia CUÁNTAS ofertas llegan y de qué orgs, no cuánto pagan. ---
    // Nivel de liga por defecto cuando `liga.prestigio` no existe (zonas tier 3).
    nivelLigaPorDefecto: 60,
    // Rango de la brecha nivel−prestigio que mapea a demanda [0,1]: ±25 puntos
    // de nivel = demanda 1.0 / 0.0.
    brechaNivelRango: 50,
    // Brecha nivel−prestigio a partir de la cual sos "una franquicia" para tu
    // liga: el mercado nunca te deja sin al menos una oferta (9R0e), ni
    // siquiera con el sesgo etario en contra.
    brechaFranquicia: 10,
    // Piso de ofertas para un jugador de demanda máxima (claramente arriba de
    // su liga): nunca se queda sin mercado.
    ofertasPisoPorDemanda: 3,
    // El techo de ofertas escala con la demanda por encima del techo etario:
    // demanda 0 → 0,7× · demanda 1 → 1,4× (después lo capa `ofertasMax`).
    techoDemandaBase: 0.7,
    techoDemandaPeso: 0.7,
    // Las ofertas laterales vienen de orgs a ~esta distancia de fuerza de tu
    // nivel — así un 50-media no recibe "firmás con [el mejor de la liga]".
    afinidadOfertaRango: 15,

    // --- salarioDeOferta: mult = exp(gauss(0,sigma)) * factorRol * jerarquía * hype ---
    salarioJerarquiaBase: 0.6,
    salarioJerarquiaPeso: 1.1,
    salarioHypeBase: 0.85,
    salarioHypePeso: 0.45,

    // --- sesgoEtario: mismo modelo que `amateur.scoutingSesgoEtario` (lookup
    // por edad + piso), pero para la franja de la carrera pro en vez de la
    // ventana de fichaje amateur — un jugador de 28 recibe ~40% de las
    // ofertas que uno de 21 con la hoja idéntica. Un solo concepto ("el
    // mercado prefiere jóvenes"), dos tablas porque cubren edades distintas.
    sesgoEtario: {
      15: 1, 16: 1, 17: 1, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1,
      23: 0.95, 24: 0.88, 25: 0.78, 26: 0.66, 27: 0.52, 28: 0.40, 29: 0.30, 30: 0.22
    },
    sesgoEtarioMinimo: 0.15, // 31+

    // --- valorDeMercado: cuánto pesa cada insumo antes del sesgo etario ---
    valorRendimientoPeso: 0.5,
    valorJerarquiaPeso: 0.3,
    valorHypePeso: 0.25,
    // Splits sostenidos en la misma región (CONCEPTO §12: 12 splits/4 años =
    // "residencia", salto de valor de mercado) y tener un campeón de firma.
    valorResidenciaSplits: 12,
    valorResidenciaBonus: 0.15,
    valorSignatureBonus: 0.20
  },

  // Fase 9R5a: la carrera termina. Antes NADA seteaba `terminado` en fase
  // profesional — el 69% de las carreras seguía "en carrera" a los 35, sin
  // final ni tarjeta. `systems/retiro.js` la cierra: pasada la edad de declive,
  // cada pretemporada hay una probabilidad creciente de retirarse, modulada por
  // cómo te trata el mercado (sin equipo empuja fuerte; una franquicia aguanta).
  //
  // Fase 9R5d: `edadDeclive` 23 → 27. Empezar a retirar a los 23 se sentía
  // durísimo — la carrera recién empieza a rendir. La investigación (CONCEPTO
  // §12.4) marca el declive a los 23-25, pero el juego lo estira a propósito:
  // el ethos es "ir a más" (CONCEPTO §1) y una carrera que cierra a los 27-28
  // se juega mejor que una que cierra a los 24. Mediana de retiro objetivo: ~27.
  retiro: {
    // Por debajo de esta edad no te retirás nunca (salvo los finales de
    // `amateur.js`/`atributos.js`): la carrera todavía tiene recorrido.
    edadDeclive: 27,
    // La línea Faker: pasada esta edad te retirás sí o sí. Alta a propósito
    // — Faker sigue activo a los 29-30 (CONCEPTO §12.4), es la excepción.
    edadRetiroForzoso: 34,
    // Probabilidad base por año pasado el declive: p = base × (edad − declive)
    // × factorNivel × factorSinEquipo, evaluada cada pretemporada. Subió de
    // 0,24 con `edadDeclive` — la ventana declive→forzoso es más corta ahora,
    // así que cada año pesa más para que la cola no se vaya a los 33.
    chanceBasePorAnio: 0.55,
    // El nivel actual del jugador (`nivelDelJugador`) modula fuerte: un
    // clase-mundial casi no se retira antes de los 30 (Faker), un prospecto
    // cuelga a los 24. Es lo que hace que la duración correlacione con lo buena
    // que fue la carrera. Se interpola linealmente entre estos dos anclas y se
    // clampea a [min, max].
    nivelAncla: { bajo: 45, alto: 82 },
    factorNivelEnBajo: 2.2,
    factorNivelEnAlto: 0.45,
    factorNivelMin: 0.3,
    factorNivelMax: 3,
    // Estar sin equipo empuja aparte, multiplicativo.
    factorSinEquipo: 2.2
  },

  // La temporada regular (fase 5): antes era una sola tirada (`gauss` contra
  // cada rival) escupiendo una posición sin fechas ni tabla. Ahora es un
  // calendario real, con 2-3 fechas por split que el jugador juega de verdad.
  temporada: {
    // Ruido de cada fecha individual. Mismo orden de magnitud que
    // `rendimiento.ruidoRendimiento` (7) y el `ruidoMapa`/`ruidoRivalSerie`
    // de una serie de playoffs (7 y 12): una fecha de temporada regular es
    // tan volátil como un mapa de playoffs, ni más ni menos.
    ruidoFecha: 7,
    ruidoRivalFecha: 12,
    // Fase 9Re: cuántas fechas del split frenan al jugador. Bajó de "2 a 3"
    // (roll) a UNA: con 2-3 por split × ~23 splits competitivos la temporada
    // regular era ~108 de las 248 decisiones de la carrera, casi todas sacadas
    // del mismo mazo de 24 cartas. Ahora se marca a lo sumo la primera fecha
    // del split con un motivo real (nunca `parejo`); el resto pasa resumido.
    fechasMarcadasPorSplit: 1,
    // Racha de derrotas propias (dentro del split) que dispara `presion`.
    derrotasParaPresion: 2,
    // Fase 9R0a: la fecha marcada dejaba de mentir pero se repetía sola.
    // `career.ultimoEliminadoPor` no se limpiaba nunca y `career.orgs` sólo
    // crece, así que "la revancha contra tal" o "el clásico contra tal"
    // salían idénticos split tras split (medido: hasta 15 seguidos en la
    // seed 1720243215). Dos topes:
    //   - `clasicoOrgsRecientes`: sólo tus últimos N ex-equipos cuentan como
    //     clásico, no toda org por la que pasaste alguna vez.
    //   - `motivoRivalCooldownSplits`: un par (motivo, rival) recién marcado
    //     no se vuelve a marcar hasta N splits después. Un split entero sin
    //     ningún motivo libre pasa resumido, y está bien.
    clasicoOrgsRecientes: 2,
    motivoRivalCooldownSplits: 4,
    // Cuánto puede mover el draft corto de una fecha marcada la fuerza de
    // ESA fecha puntual. Acotado a propósito: no reemplaza a `campeones.js`,
    // que ya elige el campeón del split entero antes de que esto corra.
    impactoDraftFecha: 0.08,
    // Fase 9Rd: mismo criterio que la serie (`probabilidadDeGanar` sobre la
    // fuerza de la fecha corrida por `factorDraftFecha`), un poco más bajo que
    // el 0,18 de la serie — una fecha de temporada regular se gana mucho menos
    // en el draft (`impactoDraftFecha` ya acota su efecto a ±0,08). El plan
    // escribió 0,07; al recalibrar la serie se subió en proporción. Ajuste
    // fino en 9Rg (regla 2).
    puntosEnJuegoParaPreguntar: 0.16,
    // Rango del efecto `type: 'partido'`: lo que el momento de la fecha
    // marcada le suma o resta a la fuerza propia de ESE partido puntual.
    partidoMin: -0.18,
    partidoMax: 0.22,
    // Con el resultado ya resuelto, a veces hay una reacción — prensa,
    // vestuario, el clip que se viralizó (`data/events/partido/postpartido.json`).
    // No mueve el resultado (ya pasó): mueve hype, mentalidad o sinergia.
    // Probabilístico y no siempre, para que una fecha marcada no sea siempre
    // tres decisiones seguidas.
    probReaccion: 0.4
  },

  // El draft, de la serie y de la fecha marcada (fase 9Rc/9Rd).
  draft: {
    // `lecturaDePick` (core/ajusteMeta.js) cruza dos ejes en una frase sin
    // numeros para la tarjeta de draft (9Rd).
    lectura: {
      // Afinidad al meta (`afinidadDeCampeon`, 1 = campeon promedio del parche):
      afinidadAFavor: 1.06,
      afinidadEnContra: 0.95,
      // Maestria del campeon normalizada al rango [peor, mejor] de TU pool:
      maestriaAlta: 0.8,
      maestriaFloja: 0.35
    }
  },

  // La serie de playoffs (fase 4): Bo5 con Fearless draft, jugada mapa a mapa
  // reusando calcularRendimiento/fuerzaDelEquipo de rendimiento.js.
  serie: {
    // Fase 9Rd: el motor sólo te frena en el draft si el mejor campeón
    // disponible te da bastante más probabilidad de ganar el mapa que el
    // segundo (`puntosEnJuego` = P(mejor) − P(segundo), vía
    // `probabilidadDeGanar`). Por debajo de esto la elección no cambia el
    // partido y se resuelve sola. El mapa decisivo BAJA el umbral (la mitad),
    // no lo saltea.
    //
    // El plan escribió 0,04 / 0,015, pero al medir daban mediana 3
    // drafts/serie y sólo 7% de series sin ninguno — el objetivo del propio
    // plan es mediana ≤1 y ≥30% de series sin draft. La distribución real de
    // `puntosEnJuego` (top-1 vs top-2 del pool disponible) tiene su mediana en
    // ~0,13, así que un umbral de 0,04 frenaba el 85% de los drafts. 0,18
    // (≈4,5×) dejaba mediana 1 y 32% de series sin draft.
    // 9Rg: subir `pesoJugadorEnEquipo` (0,35→0,5) amplificó cuánto mueve el
    // campeón elegido a `fuerzaDelEquipo`, y con eso `puntosEnJuego` — a 0,18
    // el sinDraft cayó a 23%. Re-medido (N=1200 series): 0,26 devuelve el
    // margen original (32,5% sin draft, mediana 1). Misma proporción
    // decisivo/base (~0,5) que antes.
    puntosEnJuegoParaPreguntar: 0.26,
    puntosEnJuegoParaPreguntarDecisivo: 0.13,
    // |rendimiento base del jugador - fuerza del rival| <= esto: "mapa cerrado",
    // condicion necesaria para que dispare un minijuego (regla 4 de 4.6).
    margenMapaCerrado: 8,
    // 9R4b: el mapa de DESEMPATE (2-2 en un Bo5) juega con un margen mucho mas
    // ancho y con cupo propio. Antes el mapa 5 podia pasar sin una sola jugada
    // tuya —el minijuego ya se habia gastado en el mapa 2, o el mapa no era
    // "cerrado" por diez puntos— y es justo el momento que PLAN.md §9R.4 pide
    // que exista ("el Baron de un mapa 5"). No aplica a cualquier match point:
    // el 2-0 de un barrido no lo merece (regla 4 de §4.6).
    margenMapaCerradoDecisivo: 22,
    // Fase 9R4a: cuanto mueve cada minijuego (`impacto`) y con cuanta
    // dispersion lo simula el camino headless (`spread`) ya NO viven aca: cada
    // entrada de `data/minijuegos.json` trae los suyos. Es el cierre de D20
    // ("los 5 minijuegos comparten dos parametros genericos en vez de tener
    // cada uno el suyo"). Lo que queda aca es lo que no es de un minijuego en
    // particular sino de como se reparten:
    //
    // Un minijuego recien jugado se saltea mientras haya otro elegible para ese
    // momento (misma forma que `motivoRivalCooldownSplits` en 9R0a).
    //
    // 9R4e, medido a 200 carreras: subirlo a 4 o a 6 no cambia nada (mas
    // repetido: mediana 3, p90 7, maximo 11 -> 10). La repeticion que queda no
    // es de los momentos con varias mecanicas sino de los que tienen UNA sola
    // (bootcamp, rueda de prensa, la prueba), donde el cooldown no puede hacer
    // nada: la unica cura es escribirles competencia, y eso es contenido.
    minijuegoCooldownSplits: 3,
    // Los cortes del veredicto 0-1 que lee el jugador al terminar (9R0b): de
    // aca para arriba "Clavado", de aca para abajo "No salio".
    veredictoMinijuego: { bien: 0.72, parejo: 0.42 },
    // 9R4d: los cortes con los que se le pone palabras al stat que corre el
    // minijuego ("tu mecanica, 71: te abre la ventana"). Sin esto el numero
    // se muestra sin referente, que es justo lo que prohibe la regla 13.
    bandasVentanaMinijuego: { ancha: 70, normal: 45 },
    // "la_llamada": con jerarquia baja no te siguen aunque tengas razon — el
    // impacto del minijuego se amortigua fuerte por debajo de este umbral.
    jerarquiaMinimaParaSeguirLlamada: 60,
    factorLlamadaSinJerarquia: 0.35,
    ruidoMapa: 7,
    ruidoRivalSerie: 12,
    // Maestria del campeon "fuera del pool" cuando el Fearless te quema todo (4.5).
    maestriaComodin: 20,
    // 9R4a: `impactoLaPrueba` e `impactoDirecto` se mudaron al dato
    // (`impacto` de cada entrada de minijuegos.json), igual que impactoMinijuego
  },

  // 9M-lite: el mundo tiene escena. El digest anual de las otras ligas
  // (systems/escena.js) — nunca simula un split ajeno, solo resuelve en
  // silencio quién ganó.
  escena: {
    // Con 5-6 ligas de tier 1 en juego, resumir todas cada año es ruido;
    // una muestra sostiene la sorpresa de "quién ganó este año".
    ligasEnDigest: 4,
    // Marcadores plausibles de una final a Bo5 (CONCEPTO: Fearless, series largas).
    marcadoresBo5: ['3-0', '3-1', '3-2']
  }
};
