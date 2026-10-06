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
    // `probabilidadPorSigma` (la p de cada partido y mapa desde K2b, y el
    // draft de 9Rd).
    factorLogisticoNormal: 1.702
  },

  // K2b (PLAN.md "K2 — lo que midió la investigación", viñeta K2b.3): el
  // presupuesto de ruido de un partido, en UN solo lugar. Cada partido (fecha
  // de temporada regular, cruce ajeno de la tabla) y cada mapa de una serie se
  // decide con UNA tirada contra p = Φ((F − f)/σ), y σ lo lee únicamente
  // `ruidoEfectivo` (`core/partido.js`). Es el σ COMBINADO de los dos lados.
  // Valores iniciales = el comportamiento de hoy (regla 2: la estructura se
  // mide sola; K2c los mueve, K3 conecta σ a la mentalidad):
  partido: {
    // √(7² + 12²) = 13,89: el `ruidoFecha` (7) y el `ruidoRivalFecha` (12) que
    // tiraban dos gauss por fecha. La tirada del rendimiento del split (σ 7,
    // compartida por todas las fechas) desaparece: era la "una sola tirada"
    // que pesaba 4 pp de la varianza de la posición.
    sigmaFecha: 13.9,
    // El σ efectivo de un mapa hasta K2a, medido mapa a mapa (35.649 mapas de
    // `criterio`, 400 seeds × 60 splits, punta de K2a): √(σ_mapa² + σ_rival² +
    // (peso·sinergia·σ_rend)²) con el tope de 100 aplicado al rendimiento de
    // cada mapa = 14,22 (sin el tope serían 14,35; solo mapa y rival, 13,89).
    // Cada mapa tiraba tres gauss: `ruidoMapa` 7, `ruidoRivalSerie` 12 y el
    // `ruidoRendimiento` 7 del rendimiento de ese mapa, que entra a la fuerza
    // por `pesoJugadorEnEquipo` × la sinergia del equipo.
    // K2c (PLAN.md "Cómo se hace K2c", paso 1): el σ de mapa del candidato
    // medido, simétrico y con combinado ~18: √(12,5² + 12,5²) = 17,68 (hasta
    // K2b, 14,2 = el comportamiento de antes).
    sigmaMapa: 17.7
  },

  // K3-A (PLAN.md "K3 — decisiones de spec", K3-A.1): la mentalidad gobierna
  // la consistencia. `ruidoEfectivo` multiplica su σ por
  // g(m) = 1 + k·(mRef − m)/100, acotado a [gMin, gMax]
  // (`core/partido.js#factorDeConsistencia`). Con `k = 0` g vale 1 siempre y
  // el juego era el de antes. K3c (PLAN.md "Paso 2, el barrido"): `k` = 0,5.
  // k = 0,25 cumplía en el borde (brecha de sorpresas mentalidad 20 contra 80
  // de 2,2 pp, la meta pide >= 2 pp *clara*, y un check duro en el borde es
  // frágil); con 0,5 la brecha mide 4,3 pp.
  consistencia: {
    k: 0.5,
    // La mentalidad a la que el σ es el de `partido`: la mediana pro que pide
    // la meta de K3 (45-75).
    mRef: 60,
    // Las cotas de g. Con la cabeza perfecta el σ no baja de la mitad (el
    // azar de un mapa no desaparece nunca); tilteado no pasa del doble (tu
    // fuerza todavía pesa). Con `k = 1` las cotas no muerden en 0-100
    // (g va de 0,6 a 1,6); con `k` ≥ 2,5 empiezan a hacerlo.
    gMin: 0.5,
    gMax: 2
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
    // J4 (aplicado en K4-C): la bisagra deja de ser filtro y pasa a ser un multiplicador del peso — sigue ganando
    // casi siempre, pero con tirada. Y la categoría reciente cuenta: un evento de una categoría que salió en los
    // últimos `categoriasRecientesMax` eventos compite con su peso × `factorCategoriaReciente`.
    factorBisagra: 6,
    factorCategoriaReciente: 0.3,
    categoriasRecientesMax: 2,
    // Fase 9Ra: el cooldown de un evento se cuenta en SPLITS, no en "próximos N
    // eventos resueltos". Este es el piso para los 8 eventos que declaran
    // `cooldown: 0` o lo omiten — sin él podían repetir en el mismo split.
    // 1 = "nunca dos veces en el mismo split". No se retunea acá (regla 2): el
    // ajuste fino de los cooldown del catálogo es 9Rg.
    cooldownMinimoSplits: 1,

    // Fase 12d (PLAN.md §12.3, `core/previa.js`): terciles medidos con una
    // sonda de una sola vez sobre los 1416 efectos reales del catálogo,
    // agrupados por familia — no se inventan (regla de proceso 2). Cada
    // familia vive en su propia escala (stat = puntos sobre 100, ladder = LP,
    // pool = campeones/maestría, partido = fracción del resultado): una
    // banda única hubiera dado "alta" a todo LP y "baja" a todo pool.
    // `pool_aprender` da p33 === p66 (1.5) porque los 21 efectos reales de
    // "aprender" del catálogo usan todos el mismo rango [1,2] — no es un
    // error de la sonda, es que esa familia hoy no tiene variación real.
    magnitudBandas: {
      stat: { p33: 2, p66: 3 },
      ladder: { p33: 13, p66: 22.5 },
      pool_aprender: { p33: 1.5, p66: 1.5 },
      pool_maestria: { p33: 4.5, p66: 6 },
      partido: { p33: 0.075, p66: 0.105 }
    },
    // Terciles de la dispersión normalizada (desvío estándar del payoff de
    // cada outcome, ponderado por peso, con cada efecto dividido por el
    // corte "alta" de `magnitudBandas` de su propia familia para que outcomes
    // de escalas distintas sean comparables) sobre las 442 opciones reales.
    // `core/previa.js` la deriva de la DISPERSIÓN de los outcomes, nunca de
    // sus pesos: dos outcomes 50/50 con efectos idénticos dan desvío 0
    // ("seguro"), no "ruleta" — esa es la corrección a la fórmula que traía
    // PLAN.md §12.3 antes de esta fase (ver la nota ahí).
    riesgoBandas: { p33: 0.653, p66: 1.143 }
  },

  // Valores de arranque del jugador. Son las bases sobre las que el mundo
  // generado (paso siguiente del roadmap) aplica su dispersion.
  // K4-C: el perfil que resuelve los eventos que no son bifurcación (`core/perfil.js`, tabla en
  // `data/perfiles.json`). `pesoMagnitud` traduce la magnitud cualitativa de la previa a un número para el
  // encaje; `derivaPorBifurcacion` es α en `pesos ← (1 − α)·pesos + α·[afinidad de la opción tomada]`: con 0,2
  // hacen falta 4 bifurcaciones seguidas hacia otro perfil para que cambie la palabra de la ficha.
  perfil: {
    pesoInicialElegido: 1,
    derivaPorBifurcacion: 0.2,
    pesoMagnitud: { baja: 1, media: 2, alta: 3 }
  },
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
    //
    // Fase 10a (§10.1): se extiende 20/21 en vez de cortar seco en
    // `edadLimite` — la ventana sigue cerrandose, pero nunca a cero (el caso
    // Calix es raro, no imposible). `scoutingSesgoEtarioMinimo` cubre 22+.
    // K5c (no-pro, decisión del usuario "total ~20% y brecha acotada"): 18-20 se ablandan (0,55/0,28/0,06 ->
    // 0,6/0,33/0,08) junto con el piso de soloQ de los perfiles (`pisoSoloQ`, data/perfiles.json). Medido en
    // `criterio` 300 x 60: solo el piso, 23,0%; el piso con esta tabla, ~20% (ver PROGRESO.md).
    scoutingSesgoEtario: { 15: 1, 16: 1, 17: 0.85, 18: 0.6, 19: 0.33, 20: 0.08, 21: 0.03 },
    scoutingSesgoEtarioMinimo: 0.015,
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

    // K6a-A: lo que mueven la charla con los viejos y el "no" a una oferta. Antes vivían como literales en
    // `systems/amateur.js`; ahora la carta los dice antes de elegir (regla 15: la misma cifra que aplica el motor).
    negociacionBienTrustMin: 6,
    negociacionBienTrustMax: 14,
    negociacionMalTrustMin: 8,
    negociacionMalTrustMax: 16,
    rechazoOfertaHypeMin: 2,
    rechazoOfertaHypeMax: 6,
    // K6a-A (D-B): "Cómo vivís la semana" la resuelve tu perfil y frena solo si lo que elegiría te mete en un riesgo
    // que otra de las opciones evita. Bandas de magnitud de la previa de la semana (la proyección sin dado de
    // `aplicarReparto`): en LP para el ranked, en puntos de barra para el resto.
    semanaMagnitud: { ladder: { p33: 150, p66: 300 }, barra: { p33: 3, p66: 7 } },
    // Cuánto más riesgo en casa (chance de confiscación o corte, 0-1) tiene que sumar lo que elegiría tu perfil, contra
    // la opción más segura de la semana, para que la semana frene.
    semanaRiesgoEvitable: 0.05,
    // K6c-fix ("la propuesta del perfil no te quema", PLAN.md §K6c, reglas del supervisor 2026-10-06): el plan del año que
    // propone tu perfil (el que acepta `resolverAuto`) no puede mostrar un riesgo evitable. Lo es si su chance en casa en el año
    // (`riesgoDelPlan`, la que dice la carta) pasa la del plan más seguro por al menos esto, o si arma el riesgo de lesión o
    // burnout en el año (`semanaRiesgoFisico`, las cuentas de `salud.js` y `atributos.js`) y otro plan no; la deuda de sueño que no
    // llega ahí es un costo del plan (tercera pasada: con cualquier deuda, el automático no se lesionaba nunca). Entonces la propuesta pasa al plan que tu perfil elegiría entre los que no lo muestran. Medido con
    // `resolverAuto` (1000 × 60, finales del amateur por cada 1000 carreras; K6b `58db231`: burnout 7, castigo 38, no-pro 23,0):
    // sin la regla 60 / 78 / 28,0 (con la vara en 0); con 0,05 0 / 8 / 28,1 (planes tan seguros que no llegan: "no llegó" 142 →
    // 273); con 0,15 0 / 10 / 26,6; con 0,3 0 / 15 / 26,5. 0,15 es además la tolerancia de `criterio` (`RIESGO_TOLERADO_PLAN_CRITERIO`).
    planRiesgoEvitable: 0.15,
    // K6c, segunda pasada ("la semana frena solo con riesgo nuevo"): con un plan del año elegido, que ya mostró su riesgo
    // semana por semana (`riesgoDelPlan`), la semana frena solo si su chance en casa supera la que el plan mostró para esa
    // semana por más que esto (o si la deuda de sueño llega antes de lo anunciado). Lo que ya aceptaste no vuelve a frenar.
    semanaRiesgoNuevo: 0.05,
    // K6c ("pasaste = firmás", decisión del usuario 2026-10-05): la vara de la prueba del amateur, sobre el `resultado`
    // 0-1 del minijuego. Sin dado: con el resultado en la vara o arriba firmás seguro; abajo, no firmás. Antes era la
    // probabilidad de `serie.probFirmaTryout` (una prueba perfecta no firmaba 1 de cada 20). La previa la dice antes de
    // jugar, con este mismo número. La prueba del mercado (`systems/mercado.js`) sigue con `serie.probFirmaTryout`.
    // K6c, segunda pasada ("el nivel manda"): la vara fija de 0,6 ignoraba el nivel (`malas`, que juega la prueba al 0,15,
    // no firmaba nunca, y un crack con una prueba floja no firmaba ni en tier 3). Ahora
    // `vara = clamp(base − pendiente × (nivel − calibre), minimo, maximo)`, con tu `nivelDelJugador` contra el calibre del
    // club (`org.fuerza`, 5-35 en tier 3). Medido en las ofertas de tier 3 (200 carreras por bot): la diferencia
    // nivel − calibre va de ~22 (el 5% más justo) a ~55-63 (el 5% más crack), con la mediana en ~37.
    // K6c-fix ("el club firma tu nivel, no tu día", PLAN.md §K6c): el mínimo pasa a 0. Con piso 0,1 el que fallaba toda prueba no
    // firmaba nunca, aunque fuera un crack: acertar siempre los minijuegos rendía +1149% contra fallarlos (tope +42%). La vara llega
    // a 0 con 31 de diferencia (`base / pendiente`) y a 0,8 con 15 o menos; en el medio, 5 puntos de vara por punto de nivel (a 20
    // de diferencia pide 55%, a 25 pide 30%). Medido (1000 × 60, sonda con las mismas seeds del check): el impacto de los
    // minijuegos +29,2% (vara siempre 0: +25%; cero a los 35: +44%, a los 30: +26%); `equilibrado` no-pro 29,1 (vara siempre 0:
    // 28,0; la de K6c: 31,2); `malas` 46,5. `criterio` (0,85) pasa toda prueba con cualquier máximo <= 0,85.
    varaPrueba: { base: 1.55, pendiente: 0.05, minimo: 0, maximo: 0.8 },

    // Fase 10a (§10.1): deja de ser el corte duro ("cumpliste 20, se acabó").
    // La ventana real ya la cierra el sesgo etario del scouting (arriba); esto
    // ahora es la RED anti-loop — nadie se queda en soloQ para siempre — y
    // ademas el techo que usa `secundario.js` para congelar su flag (D10: el
    // significado real, "la edad en la que ya no sos amateur pase lo que
    // pase", no cambió, solo el valor).
    edadLimite: 24,
    // Desde esta edad, el cierre de temporada te ofrece la decision real:
    // seguir peleandola en soloQ o dejarlo por tu cuenta (antes de que
    // `edadLimite` lo decida por vos). Antes de esto no hay nada en juego
    // todavia (regla 1: el motor no para si la decision no cambia nada).
    edadOfertaDeSalida: 19,

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
    // K5c paso 3 (Final2): 8 → 3, la caída después del pico es más corta. Buscaba las carreras de ~4-6 años de §K.3b; medido al
    // cerrar K5c (`criterio` 1500 × 60): carrera pro mediana 8,83 años (p10 4, p90 12). La meta se re-basó a lo medido (D80).
    anchoBajada: 3,
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
      // K5c paso 3 (Final2): los tres declives × 2 (0,6/0,36/0,27 → 1,2/0,72/0,54): la edad vuelve a pesar en las manos.
      mecanica: { declive: 1.2, velocidad: 0.3, ruido: 1.7 },
      laneo: { declive: 0.72, velocidad: 0.22, ruido: 1.5 },
      teamfight: { declive: 0.54, velocidad: 0.2, ruido: 1.5 }
    },
    // K3-B (PLAN.md, "K3 — decisiones de spec"): la fracción de cada efecto de evento o decisión sobre un stat de
    // curva que se vuelve permanente (`player.bonusPermanente`: la curva de edad converge a `objetivo + bonus`).
    // 0 = neutro (el juego de antes). K3c: 0,3, la fracción más chica de {0,3, 0,4, 0,5} que conserva >= 40% de un
    // efecto a 4 splits en la sonda de retención (PLAN.md "La sonda de retención"); una regla sola para eventos y
    // práctica, y la práctica que deja marca no infla el juego (los títulos y la llegada a tier 1 casi no se mueven).
    fraccionPermanente: 0.3,
    // K3-B 2b (PLAN.md, "K3 — decisiones de spec"): la misma regla para lo que mueve la práctica — las rutinas de
    // offseason de `systems/practica.js` (el bootcamp) —, con su propia fracción porque su volumen es muy distinto
    // al de un evento. 0 = neutro. K3c: 0,3, la misma que `fraccionPermanente` (una regla sola; ver arriba).
    fraccionPermanentePractica: 0.3,

    // --- Stats que se acumulan (el macro no declina: sostiene a los veteranos) ---
    acumulativos: {
      macro: { ganancia: 1.15, spread: 0.6, permiteBajar: false },
      shotcalling: { ganancia: 0.95, spread: 0.8, permiteBajar: true },
      adaptabilidad: { ganancia: 0.55, spread: 0.9, permiteBajar: true }
    },
    techoAcumulativoBonus: 12,

    // --- K5c-E: el desgaste (PLAN.md, "K5c: decisiones de spec de la estructura") ---
    // Pasado el pico (`oculto.edadPico`) más una gracia, los años se cobran lo que construiste: los stats
    // acumulativos pierden un término determinista por split (sin `rng`) y el bonus permanente de la práctica
    // decae una fracción por split. TODAS las perillas salen en 0 (neutro: el juego queda idéntico, la huella no
    // se mueve); las fija el barrido del paso 3. Se leen en el momento de usarlas (un override en memoria las pisa).
    desgaste: {
      // Años después de `edadPico` antes de que el desgaste empiece a morder: muerde con `edad > edadPico + gracia`.
      graciaAnios: 0,
      // Puntos que pierde cada acumulativo POR SPLIT apenas empieza a morder. Ojo: el acumulativo se recupera solo
      // (`ganancia` × margen contra el techo), así que no se va hasta cero: se asienta cuando lo que recupera iguala lo
      // que pierde, a `perdida / ganancia × 100` puntos por debajo del techo (con macro: 0,1 de pérdida ~ 9 puntos).
      // K5c paso 3 (Final2): 0 → 1,5 / 1,5 / 0,9 (encendido).
      perdidaPorSplit: { macro: 1.5, shotcalling: 1.5, adaptabilidad: 0.9 },
      // La pérdida por split crece con los años pasados de `edadPico + gracia`: perdida × (1 + aceleracion × años).
      // 0 = constante (lineal); más de 0 = cae cada vez más rápido, como los reflejos de verdad.
      // K5c paso 3 (Final2): 0 → 1 (la pérdida crece con los años pasados del pico).
      aceleracionPorAnio: 1,
      // Fracción del bonus permanente (mecánica, laneo y teamfight) que se gasta por split pasado el pico más la
      // gracia. Solo decae el bonus positivo (una cicatriz de lesión no se cura con la edad). Lo perdido se anota
      // como marca negativa del registro ("Los años"), así que bonus = Σ marcas sigue valiendo.
      // K5c paso 3 (Final2): 0 → 0,08 por split.
      fraccionBonusPorSplit: 0.08
    },

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
    maxCaidaMentalPorSplit: 12,
    // K3-A (PLAN.md "K3 — decisiones de spec", K3-A.2 y 3), en
    // `core/barras.js`. Cada split la mentalidad vuelve a una base:
    // m ← m + r·(base − m), con r = `mentalidadRetornoBase` (0 = el juego de
    // antes). No hay rasgo de personalidad en el motor que la module
    // (`player.oculto` trae potencial, edad pico y forma), así que la base es
    // esta constante: la mediana pro que pide la meta de K3.
    // K3c (PLAN.md "Paso 2, el barrido"): r = 0,2 deja la mediana pro de
    // `criterio` en 72 y el 2,3% de los splits con mentalidad >= 90 (metas:
    // mediana 45-75 y < 20%); sin la vuelta eran 97,8 y 77,7%.
    mentalidadBase: 60,
    mentalidadRetornoBase: 0.2,
    // K3c (PLAN.md "Lo que rompen los valores elegidos", punto 1): la vuelta es
    // asimétrica. `mentalidadRetornoBase` baja una mentalidad que está por
    // ENCIMA de la base; esta la sube desde ABAJO (más lento o nada), para que
    // la vuelta no perdone gratis las malas decisiones ni borre el burnout.
    // Igual a la bajada = la vuelta simétrica. K3c: 0,05, medido con `malas`,
    // `azar` y `criterio` (200 × 60): simétrica (0,2) la brecha malas−azar en
    // "no llega a pro" cae a 8,5 pp y baja el burnout de 565 a 170 cada 1000
    // con `malas`, y deja sin muestra el check del burnout; con 0,05 la brecha
    // es 16,5 pp (mínimo 10), el burnout vuelve (430 con `malas`, 0 con
    // `criterio`) y la mentalidad de `criterio` sigue en 72,3 / 2,6% >= 90.
    // 0,1 cumplía en el borde; 0 se pasa de duro.
    mentalidadRetornoBaseSubida: 0.05,
    // Toda recuperación de mentalidad por descanso (el sueño por encima del
    // confortable en `atributos.js`, el "descansar" del receso en
    // `practica.js`) llega hasta acá y no más; si ya estabas arriba, descansar
    // no te baja. 100 = sin tope (el juego de antes). K3c: 70, va con
    // `mentalidadRetornoBase`: sin tope el descanso reponía una mentalidad
    // saturada por encima de lo que la vuelta a la base deja (PLAN.md, barrido).
    topeDescanso: 70
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
    // un split sin tocarlo no es óxido; al segundo split seguido sin jugarlo empieza.
    splitsSinJugarParaOxido: 2,
    maestriaMinima: 18,
    // Cuanto sesga la maestria la eleccion del campeon: con sesgo alto te
    // especializas y aparece la signature; con sesgo bajo rotas y no domina ninguno.
    sesgoMaestriaEnPick: 2,
    // Signature: mucha maestria Y muchas partidas encima. Va a la tarjeta final.
    signatureMaestria: 85,
    signaturePartidas: 12,
    // 50 = tu pool es exactamente promedio para este meta.
    ajusteNeutro: 50,
    // K2c: el meta se acota a 0,9-1,1 (hasta K2b, 0,75-1,25). Medido en el
    // motor integrado (200 seeds `criterio` × 60 splits, splits pro de ligas
    // modeladas): el ajuste medio de un pro es ~41,5, así que el factor medio
    // queda en ~0,983. No tiene referencia propia: 50 es el pool promedio
    // para el parche (y el ajuste por defecto de `state`/`regimen`).
    multiplicadorMin: 0.9,
    multiplicadorMax: 1.1,

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
    ventanaDescenso: 4,
    // J4 (aplicado en K4-C): `main_muerto` es una TRANSICIÓN — se prende cuando tu main cae de S/A a B/C de un
    // parche al otro (`systems/meta.js` estampa `flags.splitMainMuerto`) y dura estos splits mientras siga caído.
    ventanaMainMuerto: 2,
    // Fase 10a (D30): cuántos puntos de NIVEL por debajo de tu propio pico
    // cuentan como declive biológico real (una de las tres puertas de
    // `etapa: 'declive'`, junto con estar libre o banqueado).
    margenDeclive: 10
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

  // Fase 12e (PLAN.md §12.4): corte común/rara de las decisiones de mejora.
  // Medido sobre el catálogo real, no inventado (regla de proceso 2).
  // Offseason: max(pulir, nuevo, mecanica, macro) — 7 rutinas dan
  // [0,1,2,3,3,4,4]; el corte en 4 es el +4 contra +3 de la imagen 3 y
  // ya existía en los repartos. Amateur: bloques de ranked
  // [1,2,2,3,4,4,5,5,6,6,6,6,7,8,9]; p80 = 7, hueco natural antes del
  // terceto 7/8/9 (3/15 = 20% rara). Eventos de mejora: se deriva de
  // magnitud `alta` de 12d, sin umbral propio.
  rareza: {
    eventosDeMejora: ['pool_a_cual_le_metes'],
    umbral: {
      offseason: 4,
      amateur: 7
    }
  },

  roster: {
    // K4-C2: el cambio de línea de una bifurcación (`systems/roster.js:cambiarDeRol`) rearma el pool con esta
    // cantidad de campeones de la línea nueva, con la maestría de recién aprendidos.
    cambioDeRol: { tamanoPool: 3 },
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
    //
    // 9Mh: 6 → 3. Medido tras 9Md, el mercado abierto a 6 ligas hace que el
    // primer fichaje sea, mas seguido, a un equipo mas fuerte — `esperado`
    // sube, `brecha` se hace mas negativa, y la jerarquia real termina ~3
    // POR DEBAJO de la proyeccion inflada con +6 (sesgo pasó de +6,45 a
    // ~-3,0). Con +3 el `esperada` del check vuelve a centrarse en el real.
    //
    // K4c (validacion): 3 → 6 otra vez. Con la prueba y el mundo de K4c el sesgo
    // volvio a +3,3 (real arriba de lo prometido; n = 279, error estandar 0,31);
    // con 6 queda en +0,32. Sigue siendo cosmetico: solo mueve la tarjeta y la
    // frase de `proyeccionPicks`, no el motor (la huella no cambia).
    // El valor es puramente cosmetico: `roster.js` asigna el crudo, no toca
    // esta constante, asi que bajarla no corre el stream (D35).
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

    // Nivel de los companeros inventados (tier 3 y tier 2 sin plantel):
    // orbita la fuerza de la org.
    nivelCompaneroSpread: 8,
    // Cada tanto se va alguien y el roster se sacude. K2b: SOLO en las orgs
    // sin plantel modelado (tier 3, tier 2 fuera de tu región); en las ligas
    // modeladas los compañeros son los del plantel vivo (`mundo.planteles`) y
    // el roster cambia cuando cambia el plantel, sin dado (`systems/roster.js`).
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
    umbralFlecha: 1,
    // K3-B, "Lo que construiste": una marca (stat + origen + año, con lo acumulado) se muestra si su bonus
    // redondea a esto o más en valor absoluto, y se muestran como mucho `marcasVisibles` (las más grandes).
    marcaMinimaVisible: 1,
    marcasVisibles: 6
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

    // Rendimiento = atributos ponderados por rol, corridos por meta, maestria
    // y jerarquia (`core/fuerza.js#rendimientoBase`). K2b: sin dado — el azar
    // del partido vive solo en la p de `core/partido.js`.
    // K2c: 0,3 → 0,1 (el candidato medido): la amplitud de la maestría era la
    // que el Fearless te quemaba mapa a mapa (la asimetría del Bo5).
    maestriaPesoEnRendimiento: 0.1,
    // K2b (PLAN.md "K2 — lo que midió la investigación"): cada multiplicador de
    // tu rendimiento vale 1,0 en una REFERENCIA declarada, no en un 50
    // implícito. K2b las dejó en 50 (el comportamiento de antes, bit a bit);
    // K2c las lleva al valor típico de un pro, que es lo que inflaba tu fuerza
    // contra la de los rivales. Medido en el motor integrado (K1 + K2b, 200
    // seeds `criterio` × 60 splits, el split donde corre la temporada, ligas
    // modeladas), con un paso de punto fijo porque centrar cambia el juego:
    // maestría 85 (centra el factor de campeón ENTERO, afinidad incluida),
    // jerarquía 60 (la media cae de 71,5 a ~60 al centrar).
    maestriaReferencia: 85,
    jerarquiaReferencia: 60,
    // Fase 9Rc: la afinidad del campeon al meta pesa la MITAD que la maestria
    // (CONCEPTO §6). Antes `calcularRendimiento` la ignoraba (0 implicito) y el
    // meta solo tocaba el rendimiento via `multiplicadorDeMeta`; ahora tambien
    // via el campeon que terminas jugando (`factorDeCampeon`). Se calibra en 9Rg.
    afinidadPesoEnRendimiento: 0.15,
    jerarquiaPesoEnRendimiento: 0.12,
    // K2b: la sinergia es química COLECTIVA (`roster`: "distinta del estatus
    // personal") y se cuenta UNA vez, sobre la fuerza del equipo entero
    // (`fuerzaDelEquipo`), no en tu rendimiento personal. Antes se contaba dos
    // veces: ×(1+(s−0,5)·0,4) en tu rendimiento y ×(1+(s−0,5)·0,2) en el
    // equipo. 0,27 es el peso que reproduce la fuerza de equipo de antes:
    // mínimos cuadrados de la fuerza determinista vieja contra la nueva sobre
    // 13.628 temporadas de `criterio` (400 seeds × 60 splits, punta de K2a),
    // error medio +0,04 y RMSE 1,5 (con 0,4, la suma "ingenua" de los dos
    // pesos, el RMSE daba 2,4 y el sesgo +1,2: con el tope de 100, la sinergia
    // de tu rendimiento no pesaba en los splits que lo tocaban).
    // Factor = 1 + (s − referencia)/100 · peso.
    sinergiaPesoEnEquipo: 0.27,
    // K2c: la sinergia media de un pro es ~55 (medida como las de arriba).
    sinergiaReferencia: 55,
    // K2b: el rendimiento del split que leen las consecuencias (hype,
    // jerarquía, arraigo, el "Tu rendimiento: N/100") ya no sale de un dado
    // propio: lo cuentan los partidos. Rendimiento = base + este valor × z,
    // con z = (ganados − esperados)/desvío de tus fechas de temporada regular
    // contra la p declarada (`core/temporada.js#rendimientoDeLaTemporada`).
    // 7 = el σ del `gauss` que hacía de rendimiento del split hasta K2a: la
    // lectura conserva la dispersión de antes, pero ahora la explican tus
    // resultados.
    puntosPorDesvioDeResultados: 7,

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
    // K3-A (PLAN.md "K3 — decisiones de spec", K3-A.4), en
    // `core/barras.js#baseDeHype`: el hype decae hacia una base,
    // h ← h + rH·(baseH − h), con
    // baseH = h0 + a·z + b·visibilidad. z es la de tus resultados de la
    // temporada regular del split (K2b, `career.temporada.resultadosPropios`);
    // visibilidad = prestigio de tu liga / 100 + `hypeVisibilidadPorInternacional`
    // si jugaste un internacional en los últimos `hypeAniosInternacional` años
    // calendario (el internacional se juega al cierre del año: te hace visible
    // el año siguiente). `hypeRetornoBase` = rH = 0 es el juego de hoy; h0, a
    // y b son de estructura (rH = 0 los apaga). K3c (PLAN.md "Paso 2, el
    // barrido"): rH = 0,6 deja el 20-22% de los splits pro con hype >= 90
    // (meta < 25%); con 0,5 daba 27% y con 0,7, 15,8%. Los demás (h0, a, b y
    // `hypeDecaimiento`) no hizo falta tocarlos.
    hypeRetornoBase: 0.6,
    hypeBaseInicial: 40,
    hypeBasePorDesvio: 6,
    hypeBasePorVisibilidad: 30,
    hypeVisibilidadPorInternacional: 0.5,
    hypeAniosInternacional: 1,
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
    // K5c paso 3 (Final2): 11 → 6, los clubes de una liga se parecen más a su prestigio. Con él, en leagues.json
    // (el JSON no lleva comentarios), `prestigio` LCK 95 → 97, LEC 80 → 73 y LCS 70 → 62; y LPL 93 → 91, fuera de Final2:
    // la LCK primera en el reparto del Mundial del mundo con margen, por la fuerza de los planteles y no por cupos.
    fuerzaOrgSpread: 6,
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
    //
    // 9Mh (probado, NO se movió): subirlo a 0,6 sí achica la deriva, pero como
    // efecto lateral sube la `fuerzaDePlantel` de cada org y con eso el bar
    // de `seVaDelMundo` (fuerzaOrg − retiroNivelBajoOrg) — más veteranos caen
    // por debajo, el mundo rota más y se hace MÁS JOVEN (check "El mundo NPC
    // envejece" en seed 7: 0,37 → 0,23). La deriva de `org.fuerza` que ablanda
    // el mundo se ataca de raíz en 9Mi (la escalera con competencia real), no
    // con esta palanca.
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

    // --- Fase 9Mi (PLAN.md §9M.12): la escalera cuesta. Estar "en banda" no
    // alcanza — el asiento se DISPUTA contra la mejor alternativa real de la
    // org (su titular, el mejor libre de tu rol, o el canterano que subiría).
    // Valores por criterio, medidos en 9Mj (regla 2). ---
    // Cuánto por encima de esa alternativa tenés que estar para que la oferta
    // llegue: "sos claramente la elección, no una moneda al aire" — el mismo
    // criterio que `mercado.margenImport`.
    margenSobreAlternativa: 4,
    // El piso de la alternativa: una org no baja de `max(liga.prestigio,
    // org.fuerza)` menos esto para un titular. El canterano
    // (`nivelAnclaReemplazo − canteraNivelBajoOrg`) es el último recurso, no lo
    // que la org apunta.
    alternativaPisoFuerza: 2,
    // Revisión de K5 (D78): el calibre de una liga en la disputa del asiento es este cuantil de la fuerza de sus
    // clubes (0 = el colista, 1 = el mejor), y cada org pide `max(org.fuerza, calibre)`. Punto de partida: el cuarto
    // de abajo de la liga. K5c lo calibra contra cuántos coreanos y chinos con nivel llegan a su liga.
    // K5c paso 3 (Final2): 0,25 → 0,5, el calibre es la mediana de la liga.
    cuantilCalibreDeLiga: 0.5,
    // K5c-N, el local juega en casa (PLAN.md, "El barrido"): en un club de la liga de tier 1 de tu región de origen
    // (`mundo.regionIdOrigen`), el término de calibre de la alternativa del asiento (`core/demanda.js:
    // nivelAlternativaAsiento`) es `fuerza + fraccion · (max(calibre, fuerza) − fuerza)`: el nativo paga esta fracción
    // del cuantil de su liga; el import (club de otra región) lo paga entero, como siempre. 1 = idéntico (neutra); 0 = el
    // nativo solo pide la fuerza del club. Ojo: solo mueve los clubes con `fuerza` debajo del calibre (con el cuantil
    // 0,25, el cuarto de abajo de la liga); por encima, `max(calibre, fuerza)` ya es la fuerza. Lo fija el barrido.
    fraccionCalibreLocal: 1,
    // K5c-A, el ascenso: en la disputa de una oferta de un tier mejor que el tuyo (`ofertaPosible`), el castigo etario se
    // multiplica por esto. Las renovaciones y las ofertas de tu tier o de uno peor no lo usan. 1 = idéntico (neutra).
    fraccionCastigoAscenso: 1,
    // K5c-V, el veterano de tier 2: desde esta edad, el mercado de tier 2 te trata como a un fichaje. Si perdés la disputa
    // del asiento (con el castigo etario), tu club de tier 2 no te renueva (factor 0 en vez de `factorRenovacionDeclive`)
    // y el piso de franquicia de una liga de tier 2 (`systems/mercado.js`) tampoco te hace lugar. 99 = nunca (neutra).
    edadCastigoRenovacionTier2: 99,
    // El enfriamiento etario, en puntos de nivel que se te descuentan en la
    // disputa (`core/valorMercado.js:castigoEtario`). 0 a los ≤22, ~10 a los 27,
    // ~16 a los 30 — un veterano en declive cae bajo la vara de su liga y el
    // mercado de primera deja de llamarlo (gancho del retiro de la fase 10).
    // 9Mj: 18 → 20 (junto con `factorRenovacionDeclive`) empuja las caídas
    // tier 1 → tier 2 hacia banda (check 8, quedó en ~14% — ver §9M.12.4).
    // K5c paso 3 (Final2): 20 → 100 (el castigo etario de la disputa, con el `sesgoEtario` de abajo).
    castigoEtarioNivel: 100,
    // Tu propio club también se enfría: un veterano pasado el declive Y bajo la
    // banda de su liga tiene la renovación castigada por este factor (el club
    // prefiere rejuvenecer). Un 30 que sigue claramente mejor que la camada
    // joven se renueva normal. Es lo que convierte "renovado para siempre en
    // CBLOL" en "quedó libre a los 31, sólo ofertas de tier 2, se retiró ahí".
    // 9Mj: 0,35 → 0,30 (junto con `castigoEtarioNivel` 18→20) para el check 8.
    // K5c paso 3 (Final2): 0,30 → 0: el veterano bajo la banda de su liga no se renueva.
    factorRenovacionDeclive: 0,

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
    // K5c paso 3 (Final2): 3 → 2 (más ventanas de mercado por carrera).
    aniosContratoMax: 2,
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
    // (CONCEPTO §7). `margenBombazoFuerza` es el piso de la heurística de
    // negociación (`systems/mercado.js`). K6a-U: ya NO decide el texto de `riesgo`
    // de la carta: ese sale de la banda del plantel (`plantelEnLiga`), el mismo
    // dato que la línea "Plantel: ..." de la misma carta.
    bombazoMultiplo: 1.4,
    margenBombazoFuerza: 10,

    // Fase 9d (medido): con el sigma completo de la liga, una renovación con
    // tu PROPIA org caía por debajo de la mitad del contrato anterior en un
    // 34.8% de los casos (y hasta 4.5x para arriba) — ruido de una oferta
    // nueva, no la lectura que tendría un club que ya te conoce. Renovar
    // sigue moviéndose con la jerarquía/hype actuales (esa señal no se toca),
    // pero el ruido lognormal se achica: la org que ya te tiene no tira los
    // dados de cero cada vez.
    //
    // 9Mh: 0,35 → 0,27. El corrimiento de stream de la demanda (9Mb) y del
    // mercado del mundo (9Mc) concentró las renovaciones donde el ruido pesa
    // más y la fracción que caía bajo la mitad del contrato anterior drifteó
    // a ~43,7% (parche: tope del check 40% → 45%). Con 0,27 vuelve por debajo
    // del 40% original.
    renovacionSigmaFactor: 0.27,

    // --- Fase 9R0e: la demanda del mercado sale de tu NIVEL contra la liga,
    // no de `roll(0, techo)` a secas — adelanto quirúrgico de 9M.3 (sin el sim
    // NPC). La fórmula original de 9R0e (`demanda = clamp(...)`, un piso/techo
    // de CANTIDAD de ofertas, orgs laterales por afinidad de fuerza — ver
    // PLAN.md §9R0e / PROGRESO.md) quedó reemplazada del todo cuando 9M trajo
    // el mundo con planteles reales: `core/demanda.js` (`asientoAbierto`,
    // `ofertaPosible`, `orgsQueTeFicharian`) decide oferta por oferta, org por
    // org, si hay asiento — no una cantidad calculada de antemano. Sus 5
    // constantes propias (`brechaNivelRango`, `ofertasPisoPorDemanda`,
    // `techoDemandaBase`, `techoDemandaPeso`, `afinidadOfertaRango`) se
    // borraron acá (D-nueva, auditoría de constantes muertas, mismo criterio
    // que D31): ningún archivo de `src/` las leía. Las dos que siguen abajo
    // sobrevivieron porque 9M las reusó con otro sentido. ---
    // Nivel de liga por defecto cuando `liga.prestigio` no existe (zonas tier 3).
    nivelLigaPorDefecto: 60,
    // Brecha nivel−prestigio a partir de la cual sos "una franquicia" para tu
    // liga: el mercado nunca te deja sin al menos una oferta (9R0e/9Mi), ni
    // siquiera con el sesgo etario en contra.
    // K5c paso 3 (Final2): 10 → 40, casi nadie es "franquicia" con el castigo etario nuevo.
    brechaFranquicia: 40,

    // --- K5c-M, la élite se busca (PLAN.md "K5c — decisiones de spec de la estructura"): los clubes fuertes le
    // ofrecen a la élite. Estructura con perillas NEUTRAS (con `pesoFuerzaOrden`, `rebajaMerito` y `rebajaDisputa` en 0 el
    // motor es idéntico, huella incluida); las fija el barrido del paso 3 de K5c. Se leen en el momento de usarlas
    // (`core/demanda.js:factorElite` y `asientoAbierto`, `systems/mercado.js:generarOfertas`), así que un override en
    // memoria las pisa.
    //  - `f(nivel) = clamp((nivel − umbralNivel) / anchoNivel, 0, 1)`: 0 por debajo del umbral de élite, sube en
    //    línea recta y vale 1 desde `umbralNivel + anchoNivel`. Lineal a propósito: una perilla de forma menos para
    //    el barrido, y la élite "a medias" pesa a medias. El umbral arranca dos puntos arriba del borde de
    //    `ficha.nivelBandas.elite` (78, desde donde la ficha dice "clase mundial").
    //  - `pesoFuerzaOrden` (k): USD de orden de la mano por punto de `org.fuerza` con f = 1. El orden de la mano es
    //    `presupuesto + nudge de región + k · f(nivel) · org.fuerza`: con k > 0 los clubes fuertes van primero.
    //  - `rebajaMerito` y `rebajaDisputa`: puntos que se le perdonan a la élite, con f = 1, en los dos márgenes del asiento,
    //    cada uno con su perilla y su tope (revisión de K5c, regla 15: una sola perilla sobre los dos márgenes, con un valor
    //    mayor que `margenSobreAlternativa`, fichaba a una estrella peor que la alternativa del club y abría el asiento "por
    //    mérito" para quien no le gana a su titular):
    //      · `rebajaMerito` se resta de `demanda.forzarAsientoSobreNpc` (el club banca a su titular por una estrella aunque
    //        no le saque tanto). Topeada en ese margen: tu nivel nunca queda por debajo del NPC al que reemplazás.
    //      · `rebajaDisputa` se resta de `demanda.margenSobreAlternativa` (el club se estira por una estrella aunque no le
    //        gane claramente a su alternativa). Topeada en ese margen: nunca sos peor que la alternativa del club.
    //    Las dos van porque abrir solo el asiento no sumaba ningún club fuerte (medido en K5c-M: `core/demanda.js`). Las
    //    reglas duras no se tocan.
    elite: {
      umbralNivel: 80,
      anchoNivel: 10,
      // K5c paso 3 (Final2): encendido: 0 → 100000 / 4 / 4.
      pesoFuerzaOrden: 100000,
      rebajaMerito: 4,
      rebajaDisputa: 4
    },
    // --- K6b-M, el mercado premia el mérito (PLAN.md "K6b"). El bug de K6 (seed 39): Fnatic, campeón de la LEC y del
    // Mundial con el #3 del mundo a los 27, no le renovaba, y la única carta era el club más débil de la LEC. Con Final2 el
    // castigo etario de la disputa (`demanda.castigoEtarioNivel` 100 · (1 − `sesgoEtario`)) vale ~70 puntos a los 27: perdía
    // la disputa de la renovación y la de todos los fichajes, y solo quedaba el piso de franquicia, que prueba primero el
    // club más débil de tu liga. Medido sobre 150 carreras de `criterio` (25f7b0d): de 135 mercados que venían de una
    // temporada de élite, 108 sin renovación, 71 de una sola carta y 39 de una sola carta de un club de abajo.
    // "Una temporada de élite" es la que acaba de cerrar (`calendario.anio − 1`) con un título de liga de tier ≤
    // `tierMaximoTitulo`, el Mundial ganado, o el cierre dentro del top `rankMundialMaximo` del mundo
    // (`flags.rankMundialActual`). Se gana año por año: el veterano que no la repite vuelve al mercado de su edad.
    //  - `fraccionCastigo`: con mérito, el castigo etario de la disputa (la de la renovación y la de cada fichaje) y el
    //    adelgazamiento de la mano por la edad (`sesgoEtario`) pesan esta fracción. 1 = idéntico (neutra); 0 = el mercado
    //    mira tu temporada y no tu edad. Con 0,5 un campeón de 27 todavía pierde ~35 puntos y con ellos toda disputa.
    //  - `probRenovacion`: con mérito, si tu club no tiene una alternativa mejor para el puesto (la disputa de la renovación,
    //    con el castigo de arriba), te renueva con esta probabilidad. Si la tiene, no renueva y el aviso dice por qué.
    //  - Si igual no hay asiento y te toca el piso de franquicia, el club que te hace lugar es el que te corresponde por nivel
    //    (el más fuerte con fuerza ≤ tu nivel), no el más débil de la liga (`systems/mercado.js:generarOfertas`).
    merito: {
      tierMaximoTitulo: 1,
      rankMundialMaximo: 10,
      fraccionCastigo: 0,
      probRenovacion: 1
    },
    // K5c-M, lo que ve la carta: el puesto del plantel por fuerza dentro de su liga (`core/demanda.js:plantelEnLiga`).
    // "Arriba" son los primeros `fraccionArriba` de la liga (redondeado para arriba; el 1.º se dice aparte), "abajo"
    // los últimos `fraccionAbajo`, y lo del medio es mitad de tabla. Con 10 clubes: 1.º, 2.º-3.º, 4.º-7.º, 8.º-10.º.
    plantelEnLiga: {
      fraccionArriba: 0.3,
      fraccionAbajo: 0.3
    },
    // --- K5c-H, cada uno juega en su casa (PLAN.md "K5c-H"): la escalera por nivel desde tu región. Tu "nivel para tu
    // liga" es tu nivel menos `fraccionCastigo` del castigo etario de la disputa de un fichaje (`core/demanda.js:
    // nivelParaTuLiga`). Si llega al calibre de la liga de tier 1 de tu región (`calibreDeLiga`, la misma vara del asiento)
    // más `margenAlcanza`, "alcanzás tu liga": sus clubes van primero en la mano y, si ninguno te ofrece, uno te hace lugar
    // (como el piso de franquicia: salta asiento, presupuesto, banda y disputa, nunca las reglas duras). Es el más fuerte
    // cuya fuerza no pasa ese nivel (el club que te corresponde), o el más débil si todos lo pasan. Si no alcanzás, el
    // mercado es el de siempre: el tier 2 de tu región o un import a la liga de tier 1 que te corresponde.
    //  - `margenAlcanza` NEUTRO = 99: ningún nivel llega al calibre + 99, así que el motor es idéntico (huella incluida).
    //  - `fraccionCastigo`: 1 = el castigo etario entero, el de la disputa (con el castigo de la base de calibración G0, ~22
    //    puntos a los 23 y ~60 a los 26, solo alcanza un pibe de 20-21: medido en K5c-H); 0 = tu nivel sin la edad. Con
    //    `margenAlcanza` neutro no mueve nada.
    // Los fija el barrido de K5c. Se leen en cada llamada (`core/demanda.js:alcanzaTuLiga`): un override en memoria las pisa.
    //  - `cuposImportElite` y `nivelImportElite` (arreglo de K5c-H, "desde una región débil, un jugador de élite sube como
    //    import a una liga más fuerte"): cuando alcanzás tu liga, después del primer club de casa la mano reserva hasta
    //    `cuposImportElite` lugares para clubes de ligas de tier 1 más fuertes que la tuya (calibre mayor) a las que tu nivel
    //    llega, si tu nivel es de élite (`nivelImportElite`, el mismo umbral que `NIVEL_ELITE_CRITERIO` del bot `criterio`,
    //    dev/estrategias.js). Sin esto, con 6+ clubes de casa ningún import llegaba a la mano (en Final2, 5 de 18 carreras de
    //    élite de Brasil jugaron alguna vez en una liga más fuerte). Solo actúan con la casa encendida: con `margenAlcanza`
    //    neutro no mueven nada (`systems/mercado.js:generarOfertas`).
    //  - `margenImportElite` (arreglo del revisor): "más fuerte" es CLARAMENTE más fuerte, no un punto de calibre. Sin esto, con
    //    la casa encendida a un coreano de élite le saltaban los cupos de clubes de la LPL (el calibre de la LPL le gana al de la
    //    LCK por poco en una parte de los mundos) y `criterio` los tomaba: su % de splits de tier 1 en la LCK bajó del 72% (sin
    //    cupos) al 64% (G0, 200 carreras, pico >= 85). Una liga cuenta como "más fuerte" si su calibre (`calibreDeLiga`) pasa el
    //    de tu casa MÁS este margen; el mismo lo usa `criterio` (dev/estrategias.js:claseDeLigaCriterio). Calibres medios de
    //    G0 / Final2 (40 mundos): LCK 88,7 / 95,1, LPL 86,8 / 92,9, LEC 73,8 / 73,1, LCS 63,1 / 62,3, LCP 54,0 / 59,7,
    //    CBLOL 49,4 / 55,6 (desvío entre mundos 4-5 / 1-3). LCK contra LPL (2) y la LCP contra la CBLOL (4-5) quedan por debajo
    //    del margen; la LEC contra la LCP o la CBLOL (14-24), la LCK/LPL contra la LEC (15-20) y la LEC contra la LCS (11) arriba.
    casa: {
      // K5c paso 3 (Final2): la casa encendida: margen 99 → -4 y castigo etario 1 → 0.
      margenAlcanza: -4,
      fraccionCastigo: 0,
      cuposImportElite: 2,
      nivelImportElite: 85,
      margenImportElite: 8
    },

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
    // K5c paso 3 (Final2): la tabla corrida dos años antes (el mercado mira la edad desde los 21); de los 29 en adelante, el mínimo.
    sesgoEtario: {
      15: 1, 16: 1, 17: 1, 18: 1, 19: 1, 20: 1,
      21: 0.95, 22: 0.88, 23: 0.78, 24: 0.66, 25: 0.52, 26: 0.40, 27: 0.30, 28: 0.22
    },
    sesgoEtarioMinimo: 0.15, // 31+

    // --- presupuestoDeDemanda (antes valorDeMercado): cuánto pesa cada insumo antes del sesgo etario ---
    valorRendimientoPeso: 0.5,
    valorJerarquiaPeso: 0.3,
    valorHypePeso: 0.25,
    // Splits sostenidos en la misma región (CONCEPTO §12: 12 splits/4 años =
    // "residencia", salto de valor de mercado) y tener un campeón de firma.
    valorResidenciaSplits: 12,
    valorResidenciaBonus: 0.15,
    valorSignatureBonus: 0.20,
    // Fase 9Wb: estar en el Top 20 del mundo (§9W.4). Escala con el rank —
    // pleno para el #1, ~0,05× para el #20: `bonus · (tamano − rank + 1) / tamano`.
    // Espeja `valorSignatureBonus`. Por criterio; retune en 9Wd.
    valorTopMundialBonus: 0.40,

    // --- Fase 9Me: negociar, no aceptar (PLAN.md §9M.6). Tres acciones DENTRO
    // de la misma decisión de mercado (trampa T9: la interrupción no se
    // multiplica) — `resolver` devuelve otra vez la decisión, como el
    // representante. Valores por criterio, retune 9Mh (regla 2). ---
    // Cuántas veces se puede "pedir más" por oferta antes de que el club corte
    // la charla. Red anti-loop propia; el pipeline capa a `maxDecisionesPorSplit`
    // igual.
    escalonesNegociacionMax: 2,
    // Cada escalón sube el pedido este % del salario de la oferta.
    escalonNegociacionFactor: 0.12,
    // Si el club NO acepta el escalón entero pero tampoco se levanta, contraoferta
    // con esta fracción del escalón.
    contraofertaFactor: 0.45,
    // Probabilidad de que el club se levante de la mesa al pedir más: base, menos
    // cuánto te quieren (tu nivel sobre su mejor alternativa para ese asiento),
    // más cuántos escalones ya pediste. Clampeada a [min, max].
    rupturaNegociacionBase: 0.30,
    rupturaPorBrechaNivel: 0.015,
    rupturaPorEscalonPedido: 0.18,
    rupturaNegociacionMin: 0.03,
    rupturaNegociacionMax: 0.80,
    // Si NO se rompe: con esta probabilidad acepta el escalón entero; si no,
    // contraoferta (`contraofertaFactor`).
    probAceptaEscalonEntero: 0.55,
    // La brecha de nivel (vos − su mejor alternativa) a partir de la cual el
    // texto de riesgo pasa de "sos su plan B" a "te quieren mucho".
    brechaNegociacionComoda: 8,
    // La cláusula de salida cuesta este % del salario de la oferta (se paga con
    // sueldo). A cambio, un club grande te puede sacar a mitad de contrato (9Mf).
    precioClausulaSalida: 0.10,
    // Cuántos clubes "que te miran sin haber ofertado" revela el representante.
    clubesInteresadosMax: 4,

    // --- Fase 9Mf: traspasos a mitad de contrato, y el banquillo (PLAN.md
    // §9M.7). Cada pretemporada con el contrato corriendo, un club grande
    // puede intentar sacarte: con cláusula te vas y tu club cobra, sin
    // cláusula tu club decide. Y si tu nivel cae por debajo del suplente,
    // perdés la titularidad — la puerta al declive. Valores por criterio,
    // retune 9Mh (regla de proceso 2). ---
    // El sueldo se cobra por split: `salarioAnualUSD / splitsPorEdad` va a
    // `registro.dineroTotalUSD` (antes NUNCA se incrementaba — el check de
    // monotonía pasaba trivialmente sobre 0). No hay constante nueva: el año
    // son `BALANCE.edad.splitsPorEdad` splits.
    //
    // Probabilidad de que aparezca un pretendiente a mitad de contrato, si hay
    // alguno que califica (asiento abierto en tu rol + te puede pagar + entra
    // en su banda + es bastante más fuerte que tu org). Baja: la mano viene de
    // `orgsQueTeFicharian`, así que un club grande con tu asiento abierto
    // aparece seguido — el dado sólo decide si además viene a buscarte ESTA
    // ventana.
    probTraspasoMitadContrato: 0.35,
    // El pretendiente tiene que ser al menos esto más fuerte que tu org actual
    // (un club grande, no una salida lateral).
    traspasoBrechaFuerzaMin: 5,
    // El club que te saca a mitad de contrato mejora el sueldo: piso sobre el
    // contrato vigente.
    traspasoSalarioMinFactor: 1.05,
    // `traspasoUSD` = valor de mercado · factor · (1 + añosRestantes · porAnio).
    // Lo cobra tu club, no vos: no entra a `dineroTotalUSD`.
    traspasoBaseFactor: 1.1,
    traspasoPorAnioRestante: 0.35,
    // El auto-resolver (headless / simulate.js) toma el traspaso —un club más
    // fuerte— salvo que el sueldo caiga por debajo de esta fracción del actual.
    traspasoAutoRecorteMax: 0.85,
    // Sin cláusula: probabilidad base de que tu club NO te suelte ("aceptar la
    // oferta"), más lo que sube por cada punto que superás su fuerza (te
    // retienen más), menos el empujón de "pedir salir". Clampeada a [0, 1].
    // Baja: un club chico suele cobrar el traspaso — es cómo se financia.
    clubRetieneBase: 0.3,
    clubRetienePorBrechaNivel: 0.015,
    pedirSalirBonusSalida: 0.35,
    // "Pedir salir" que sale mal: el vestuario se resiente. Arraigo y jerarquía
    // se multiplican por (1 − esto).
    pedirSalirCastigoArraigo: 0.5,
    pedirSalirCastigoJerarquia: 0.15,
    // El banquillo: perdés la titularidad si tu nivel cae este umbral por
    // debajo del promedio del plantel (el suplente que el club tiene o puede
    // fichar). No es automático — un mal split bajo esa brecha lo puede
    // gatillar (`probBanquilloPorBrecha`).
    umbralBanquillo: 16,
    probBanquilloPorBrecha: 0.55,
    // Al sentarte: la jerarquía se derrumba a esta fracción, el arraigo cae a
    // esta otra, y la pretemporada te cede a la liga de desarrollo de tu región.
    banquilloJerarquiaFactor: 0.4,
    banquilloArraigoFactor: 0.6
  },

  // K6b-C2 (PLAN.md §K6b, "la cola de verdad"; D-B en la cola). Desde los `edadDesde` años o desde el aviso de declive
  // (`etapa === 'declive'`, `core/contexto.js`), lo que llegue primero, el cierre de año y el momento de una fecha marcada
  // frenan solo si es un hito, si algo cambió (el club, el tier, una lesión o el declive) o si su tipo tiene palanca. Si no,
  // los resuelve tu perfil y se narran en una línea (`core/cola.js`).
  cola: {
    // La misma edad con la que el instrumento mide la cola (`EDAD_COLA_DE_CARRERA`, `src/dev/simulate.js`).
    edadDesde: 28,
    // "Su tipo tiene palanca": el % de paradas de ese tipo con efecto en su horizonte (la columna "en su horizonte" de
    // `node src/dev/agencia.js --carreras=12 --reps=30 --cuota=2 --splits=70`, el head de K6b-C, `8368570`) contra el
    // umbral. El umbral es la fracción ponderada de ese mismo reporte: un tipo por debajo baja el promedio, así que
    // resolverlo solo en la cola no le saca agencia al juego; uno por encima la sube, y sigue frenando.
    umbralPalancaPct: 47.4,
    palancaMedidaPct: {
      cierre: 3.3,
      momento: 95
    }
  },

  // Fase 9R5a: la carrera termina. Fase 10a la reescribe (PLAN.md §10.1):
  // antes, la edad de declive era un piso FIJO (nadie se retiraba antes de
  // los 27 sin importar cómo le fuera) — eso contradecía el pedido del
  // usuario ("si llegás a tier 1 y la hacés mal, que te puedas retirar a los
  // dos años; si venís para arriba, que puedas seguir subiendo"). Ahora el
  // reloj es `contexto.etapa === 'declive'` (`core/contexto.js`, D30): sin
  // equipo, banqueado, o por debajo de tu propio pico de nivel — presión de
  // mercado real, no una edad. Mientras sigas subiendo o sostenido, esto no
  // te toca (salvo la línea Faker). Y la decisión es del JUGADOR, no un
  // dado: `systems/retiro.js` pausa y pregunta en vez de tirar `chance()` —
  // cero RNG en todo este sistema.
  retiro: {
    // Antes de esta edad, `etapa` nunca lee 'declive' por esta vía (un
    // debut flojo no es un retiro): la carrera recién empieza.
    edadMinimaDeclive: 19,
    // Cuántas pretemporadas SEGUIDAS en declive antes de que se te pregunte
    // en serio. 2 ≈ dos años del "más o menos 2 años" que pidió el usuario.
    // `factorSeguirPeleandola` (abajo) hace que elegir seguir no resetee el
    // contador entero — compra tiempo, no borra la presión.
    splitsDeclivePorAviso: 2,
    factorSeguirPeleandola: 0.5,
    // La línea Faker: pasada esta edad te retirás sí o sí, sin pregunta (no
    // hay nada que elegir — regla 1). Alta a propósito — Faker sigue activo
    // a los 29-30 (CONCEPTO §12.4), es la excepción, no la regla.
    edadRetiroForzoso: 34,
    // El retiro por decisión propia o por el mercado (no el burnout, no la
    // familia, no `no_llego`) abre una ventana de vuelta — Bjergsen y
    // Doublelift se retiraron y volvieron dos veces cada uno (CONCEPTO
    // §12.4). `ventanaDeVueltaSplits` son pretemporadas de gracia (2, a
    // splitsPorEdad=3) antes de que se cierre sola si no la usás.
    vueltasMaximas: 2,
    ventanaDeVueltaSplits: 6,
    // Revisión de K6b (el "sin equipo" de la vuelta): volver de free agent es volver al mercado de esa pretemporada
    // (`systems/retiro.js`). La previa del "¿Volvés?" dice la chance de que te llame alguien, con la demanda de hoy: si
    // algún club te ficharía hoy (`core/demanda.js:orgsQueTeFicharian`, con la edad con la que volverías), o si ninguno.
    // Medida (revisión de K6b, PROGRESO.md): todas las vueltas de free agent de `criterio` y del bot por defecto, 300 × 60
    // cada uno, forzando la vuelta: sin demanda, 19 de 210 recibieron al menos una oferta en ese mercado (9%); con
    // demanda, 9 de 28 (32%), sin que crezca con el número de clubes (el mundo se mueve antes y llena asientos). El
    // automático (y `criterio`, que le delega la vuelta) no vuelve de free agent con la chance debajo de
    // `umbralChanceVueltaPct`: sin nadie que hoy te fiche, no vuelve.
    vuelta: {
      pctLlamadoSinDemanda: 9,
      pctLlamadoConDemanda: 32,
      umbralChanceVueltaPct: 20
    },
    // K5-C (PLAN.md K5, "el final lo decide el mercado"): cuántas pretemporadas SEGUIDAS con el mercado abierto
    // (contrato vencido o sin equipo) sin una sola oferta de tu tier o mejor antes de que `systems/mercado.js` frene
    // con la bifurcación "bajás de tier o colgás el mouse". Se cuenta igual que `mercado.splitsSinOfertaParaLibre`
    // (un split de mercado = una pretemporada). 99 = nunca dispara: la estructura sale con el valor que reproduce
    // hoy; el valor de verdad (y con él la longevidad, §K.3b) lo fija K5c.
    // K5c paso 3 (Final2): 99 → 1 (una pretemporada sin oferta de tu tier y frena).
    splitsSinOfertaEnTierParaBifurcar: 1,
    // K5c-R (PLAN.md K5c, "la presión de retiro"): el que se queda en tier 2. `systems/retiro.js` cuenta cada split
    // jugado en tier 2 (con club, con contrato corriendo también) desde `edadDesde` años; solo lo vuelve a cero una
    // oferta de TIER 1 (`systems/mercado.js`: una mano, un traspaso o un import firmado), aunque no la firmes. Al llegar
    // a `splitsSinOfertaTier1`, la próxima ventana de mercado abierta frena con la bifurcación del final por mercado
    // (variante `presion_tier2`: seguís en tier 2 o colgás el mouse). Se leen en el momento de usarlas (un override en
    // memoria las pisa). 99 y 99 = nunca dispara: la estructura sale neutra; los valores los fija el barrido de K5c.
    presionTier2: {
      // K5c paso 3 (Final2): encendida: desde los 20, a los 4 splits sin oferta de tier 1.
      edadDesde: 20,
      splitsSinOfertaTier1: 4
    },
    // `resolverAuto` de esa bifurcación (el headless y el bot `criterio`): antes de esta edad bajás de tier (o
    // seguís buscando, si nadie ofrece); desde esta edad aceptás el veredicto y te retirás — mismo criterio que
    // `retiro_declive` ("no te renuevan" es la causa modal de retiro real, `CONCEPTO` §12.4).
    // K5c paso 3 (Final2): 27 → 22.
    edadAutoAceptaVeredicto: 22
  },

  // Fase 10c (PLAN.md §10.4.2): la cadena causal de D9. `player.deudaSueno`
  // (0-4, `amateur.deudaMaxima`) nunca se resetea al pasar a profesional —
  // acá por fin tiene un consumidor. Cero RNG en el disparo salvo el `chance`
  // final, mismo armado que `probabilidadDeBurnout` de `atributos.js`.
  salud: {
    // `deudaSueno` a partir de acá empieza a sumar riesgo físico sostenido.
    deudaUmbralRiesgo: 2,
    // Splits seguidos de riesgo antes de que el tier leve pueda pinchar.
    splitsParaLesionLeve: 6,
    probLesionLeveBase: 0.05,
    probLesionLevePorDeuda: 0.02,
    // Corte de techo del tier leve (túnel carpiano): un aviso, no una condena.
    penalizacionLeveMin: 2,
    penalizacionLeveMax: 5,
    // Splits seguidos de riesgo DESPUÉS del leve antes de que el grave pueda
    // pinchar (tendinitis de muñeca / hombro crónico, PLAN.md §12.4).
    splitsParaLesionGrave: 5,
    probLesionGraveBase: 0.06,
    probLesionGravePorDeuda: 0.03,
    // "Jugás lesionado": baja corta, techo se corta fuerte.
    penalizacionGraveJugarMin: 5,
    penalizacionGraveJugarMax: 9,
    fechasBajaJugarLesionadoMin: 2,
    fechasBajaJugarLesionadoMax: 3,
    // "Parás a tratarte": baja larga, el techo se cuida más.
    penalizacionGravePararMin: 2,
    penalizacionGravePararMax: 4,
    fechasBajaPararATratarteMin: 4,
    fechasBajaPararATratarteMax: 6,
    // Cuánto rinde el equipo mientras jugás de baja (`systems/temporada.js`,
    // `continuarTemporada`): sin vos, con el suplente.
    factorFuerzaLesionado: 0.85,
    // Recaída: con `lesionGraveSplit` ya seteado, cuánto riesgo sostenido más
    // hace falta para que la MISMA decisión ofrezca el retiro.
    splitsParaReLesion: 6,
    probReLesionBase: 0.08,
    probReLesionPorDeuda: 0.03
  },

  // Fase 10c (PLAN.md §10.4.1, CONCEPTO §12.4): "determinista, no
  // probabilístico" — cero RNG en el disparo. Solo aplica a
  // `mundo.regionIdOrigen === 'KR'`.
  servicioMilitar: {
    // Edad límite para enlistarse (ley 2020). 30 si sos figura de élite
    // reconocida (estuviste en el Top 20 del ranking mundial alguna vez,
    // `registro.picos.rankMundial` — reusa 9W).
    edadLimiteServicio: 28,
    edadLimiteServicioElite: 30
  },

  // Fase 11 (PLAN.md §11.1): el resumen anual. `notaDeLaTemporada` compone un
  // 0-10 de cinco señales que ya existen en el motor — nunca inventa una
  // nueva. Los pesos de `pesos` (profesional) suman 1; cada componente entra
  // normalizado a 0-1 antes de ponderar.
  temporadaResumen: {
    // Recalibrado (fase 11, medido en 400 carreras): con 0.30/0.20 la nota
    // correlacionaba r=0,896 con la posición — casi el techo de 0,9 del check
    // (§11.3: "correlaciona pero no determina"). `posicion` y `playoffs` son
    // casi la misma señal cuantizada distinto, así que juntas pesaban 0,50 de
    // una sola cosa. Se corre peso hacia `rendimientoPropio` (tiene ruido
    // propio, split a split) y `jerarquiaArraigo` (no depende de la tabla).
    pesos: {
      posicion: 0.20,
      playoffs: 0.15,
      rendimientoPropio: 0.30,
      internacional: 0.15,
      jerarquiaArraigo: 0.20
    },
    // Sin cupo/clasificación a internacional este año: ni castiga ni premia
    // de más — la mayoría de los años de la mayoría de las carreras no tienen
    // internacional, así que un 0 duro hundiría la nota de un año por lo
    // demás bueno.
    scoreInternacionalNeutro: 0.4,
    // Llegaste al internacional y perdiste tu serie: ya es mejor año que no
    // llegar (`scoreInternacionalNeutro`), pero no tan bueno como el buen
    // papel (1.0).
    scoreInternacionalEliminado: 0.7,
    // El componente `playoffs` (distinto de `internacional`: éste mide cuán
    // lejos llegaste en TU liga, no cómo te fue afuera) sin un número de
    // ronda persistido — el motor no guarda en qué ronda te eliminaron, sólo
    // si jugaste playoffs y si llegaste al internacional (que ya implica
    // haber cruzado tu bracket doméstico). Bandas de mejor esfuerzo con la
    // señal que sí existe.
    scorePlayoffs: {
      sinLigaReal: 0.3,       // tier 3, o etapa amateur (no aplica el peso)
      noClasificado: 0.15,
      clasificado: 0.5,
      llegoAlInternacional: 0.9,
      campeon: 1.0
    },
    // La jerarquía y el arraigo raramente se mueven ±100 en un solo año: la
    // escala achica el delta antes de centrarlo en 0.5 (sin movimiento = nota
    // neutra en ese componente).
    escalaJerarquiaArraigo: 60,
    // Cuánto tiene que caer el nivel en un año para que `titularDelAnio` lo
    // titule como `caida` en vez de dejarlo pasar como ruido. Medido sobre
    // 1137 cierres de edad (60 seeds × 60 splits): el delta de nivel real
    // cae en [-6.4, 9.7] con media +1.35 — un piso de 8 nunca se alcanzaba
    // (0 casos), y con 4 (el 1% peor) `caida` casi nunca gana el desempate
    // contra `main_muerto`/`titulo_liga`, que dominan la mayoría de los años
    // (medido: 0 en 50 carreras). 3 (el 3.6% peor) sigue siendo un año malo
    // de verdad y se observa de verdad (medido: ~6 en 50 carreras).
    umbralCaida: 3,
    // `sequia` no mide el shotcalling (medido: nunca baja más de -0.5 en un
    // año bajo juego automático, así que un umbral de delta nunca dispara) —
    // mide el RESULTADO del año (`rendimientoPropioMedio`, 0-100): un año
    // donde el rendimiento medio se hunde aunque el nivel no haya caído es
    // la sequía real ("¿y el shotcalling?", jugás bien y no te sale nada).
    // Medido: ≤30 cae en ~5% de los años profesionales.
    umbralSequiaRendimiento: 30,
    // Sin carrera competitiva todavía (etapa amateur): la nota compone otra
    // cosa — el ladder de soloQ y el cuidado del cuerpo/estudios/familia en
    // vez de liga/playoffs/internacional, que no existen antes del debut.
    pesosAmateur: {
      soloq: 0.40,
      estudios: 0.20,
      familia: 0.20,
      sueno: 0.20
    },
    // Cuánto soloQ (puntos absolutos, `core/ranked.js`) hace falta subir en
    // un año para que ese componente sature en 1. No calibrado contra datos
    // reales de LP anual — es una escala de arranque, documentada para poder
    // revisarla si el check de fase 11 la encuentra plana.
    escalaSoloqAnual: 300,
    // Bandas de color de la nota (PLAN.md §11.1).
    bandas: { rojo: 5.5, gris: 6.9, ambar: 7.9 },
    // La ventana que mira el check de repetición de §11.3 (10 años) menos el
    // año actual, que todavía no está guardado en `registro.temporadas`
    // cuando `titularDelAnio` la consulta.
    ventanaRacha: 9
  },

  // La temporada regular (fase 5): antes era una sola tirada (`gauss` contra
  // cada rival) escupiendo una posición sin fechas ni tabla. Ahora es un
  // calendario real, con 2-3 fechas por split que el jugador juega de verdad.
  temporada: {
    // K2b: el ruido de cada fecha se mudó a `partido.sigmaFecha` (lo lee solo
    // `ruidoEfectivo`, `core/partido.js`).
    //
    // Cuántas vueltas tiene el fixture de la temporada regular: 1 = cada par
    // de equipos se cruza una vez (hasta K2b), 2 = ida y vuelta (la LCK real).
    // K2c: 2. Elegido por barrido (`criterio` 400 × 60, vueltas 1/2 × σ de
    // fecha 10/13,9/17/20): con 2 vueltas la r de la misma liga sube de 0,524
    // (1 vuelta, mismo σ de fecha) a 0,582, con R² sin ruido 0,549, y el Bo5
    // con Δ0≈10 queda en 81,0 para el jugador favorito y 88,4 para el rival
    // favorito. El σ de fecha no mueve el Bo5 de forma sistemática (es σ de
    // mapa; solo cambia qué cruces se dan), así que no se toca. PLAN.md, K2c.
    vueltas: 2,
    // Fase 9Re: cuántas fechas del split frenan al jugador. Bajó de "2 a 3"
    // (roll) a UNA: con 2-3 por split × ~23 splits competitivos la temporada
    // regular era ~108 de las 248 decisiones de la carrera, casi todas sacadas
    // del mismo mazo de 24 cartas. K4-A: esa una es la que DECIDE algo (la
    // clasificación, el archirrival, el clásico, la revancha), no la primera con
    // cualquier motivo; el resto del split pasa resumido.
    fechasMarcadasPorSplit: 1,
    // K4-A: en cuántas de las ÚLTIMAS fechas de un split se mira si la fecha
    // define la clasificación (`core/temporada.js`, `defineClasificacion`). Antes
    // de eso la proyección del resto del fixture es una cuenta de esperanzas muy
    // abierta (la previa lo dice con "con la tabla como viene", no como un hecho).
    // Medido (`criterio`, 100 × 60, tier 1 con playoffs, una liga de 10 equipos
    // juega 18 fechas): con 4 sale 1 de cada 4,1 splits, con 8 uno de cada 3,0 (justo
    // en el piso de PLAN.md K4, "≥ 1 cada 3"), con 10 uno de cada 2,7 (37%) y con 12
    // uno de cada 2,3. Elegido 10: margen sobre el piso sin dejar que cualquier
    // fecha del split diga "esto decide".
    // K4c: 10 -> 4. Solo la ventana (con `criterio`, 300 × 60, de a una perilla) baja las interrupciones de 109 a 105; con las
    // otras perillas de cA (umbral 6, prensa [], las tres mecánicas en `mapa_decisivo`) la mediana llega a 89 (PLAN.md, "Paso 2 —
    // lo que midieron los barridos"). Con 4 la fecha marcada "define la clasificación" una de cada ~4,1 splits: la fecha
    // vuelve a ser una excepción, no el 37% de los splits.
    // K4c (paso 3a): 4 -> 6. Con las constantes del 3a, 4 daba 1 cada 3,6 splits de tier 1 con playoffs, debajo del piso de
    // K4-A (1 cada 3). Medido con el check "K4-A define_clasificacion es alcanzable" (`criterio`, 100 carreras, con la prueba
    // en 0,65 / 0,8 / 0,95): 5 da 998 de 3126 (1 cada 3,13, no llega), 6 da 1089 de 3068 (1 cada 2,82) y 7 da 1066 de 3040
    // (1 cada 2,85: más ventana no da más margen). Se queda la más chica que cumple el piso: es la fecha con más en juego.
    // K4c (integración con el cierre de año): 6 -> 7. Con el contenido nuevo del cierre, 6 dio 975 de 2999 (1 cada 3,1), justo
    // debajo del piso: con ~3000 splits el error es ±0,9 pp y 6 queda sobre la línea. 7 lo pasa con margen.
    ventanaDefineClasificacion: 7,
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

  // La serie de playoffs (fase 4): Bo5 con Fearless draft, jugada mapa a mapa
  // reusando la fuerza de partido de `core/fuerza.js` (K2b: determinista).
  serie: {
    // K4-B (PLAN.md "K4 — decisiones de spec", K4-B): la serie como plan. Reemplaza al umbral de pausa del draft
    // mapa a mapa (`puntosEnJuegoParaPreguntar`, D63: preguntaba justo cuando la respuesta era obvia) y a los márgenes
    // de "mapa cerrado" de los minijuegos (`margenMapaCerrado` y su decisivo): ahora el minijuego de serie va solo en
    // el mapa decisivo de semis, final e internacional, y una serie sin nada en juego no pregunta nada.
    // Valores de arranque (bloque B, los calibra K4c). Los `empuje*`/`desgaste*` son fracciones de la fuerza propia
    // del mapa, la misma escala que el ajuste de un minijuego (`impacto` 0,09-0,16).
    plan: {
      // |fuerzaInicial − fuerza del rival| por encima de esto: serie sin nada en juego (juega el coach, no frena).
      // 15 puntos con σ de mapa 14,2: un mapa de ~0,85 y un Bo5 de ~0,97 para el favorito (sin el Fearless). Deja
      // ~30% de las series sin nada en juego (criterio, 30 × 60).
      // K4c: 15 -> 6. Medido (criterio, 300 × 60, de a una perilla): las interrupciones bajan de 109 a 98 y el p90 de las paradas de
      // playoffs, de 7 (36% con más de 4) a 5 (17%); el del internacional, de 7 (49%) a 5 (22%). Con cA entera: 89 interrupciones,
      // 5 (11%) y 5 (12%) (PLAN.md, "Paso 2 — lo que midieron los barridos").
      // K6a-M (D-B): el umbral ya no se aplica a una serie de eliminación (`esSerieDeEliminacion`, core/serie.js), y hoy
      // todas lo son: los playoffs y el bracket del Mundial frenan siempre. En el ensayo de K6 una final del CBLOL y unos
      // cuartos se habían resuelto solos por esta regla.
      umbralSinNadaEnJuego: 6,
      // K6a-R (PLAN.md, "Decisión del supervisor (K6a-R, el ritmo de la eliminación)"): una serie de eliminación que no es
      // final frena en el plan solo si está abierta, con la p de serie del plan del coach entre esto y 1 − esto. Afuera de esa
      // franja está cantada: el coach arma el plan, el feed dice si sos favorito o no, y frena solo en el mapa decisivo si llega.
      // Ninguna final se mira con esto: frena siempre.
      // Medido (criterio, 400 × 60; con 0,2 el instrumento dio p90 6 / 6 en playoffs / internacional y Δp de plan 5,59 pp), con
      // una sonda que le saca a cada split el plan de las series no finales que este valor dejaría cantadas: el % de splits de
      // playoffs con más de 5 paradas es 11,6 (0,2), 10,0 (0,25: el p90 justo en el borde), 8,0 (0,3) y 6,2 (0,35). 0,3 es el
      // primero con margen. El internacional no baja de p90 6 con ningún valor (12% de splits con más de 5 aun con 0,4): el
      // cierre de año, la final doméstica y el tope T9 del Mundial (4) ya suman 6 sin una sola serie abierta.
      pAbiertaEliminacion: 0.3,
      // Salir con todo: tus mejores picks y más intensidad en los primeros `mapasConTodo` mapas; después lo pagás.
      mapasConTodo: 2,
      // K4c, los cinco `empuje*`/`desgaste*` ×3 (barrido con `criterio`, 300 × 60, escalando todos juntos; PLAN.md, "El barrido del
      // plan de serie"): el Δp de las decisiones de plan, mediana, sube de 1,9 pp (×1; 10% de las paradas con Δp ≥ 5 pp) a 5,1 pp
      // (×3; 52%), contra 3,5 (×2) y 7,2 (×4). `criterio` contra `azar` en series ganadas mide la palanca del plan. Con `criterio` el
      // Bo5 del bloque A da 86,9 ± 2,1 con el ×3 (banda 75-85, 83,9 con ×1): ese check se mide ahora con el plan neutro ("K3c meta
      // de K2 (criterio con plan neutro ...)", regla 17).
      // `empujeConTodo`: 0,05 -> 0,15; `desgasteConTodo`: 0,03 -> 0,09.
      empujeConTodo: 0.15,
      desgasteConTodo: 0.09,
      // Guardar tu mejor campeón para el mapa decisivo: si llega, lo jugás con lo que no te vieron en toda la serie.
      // K4c: `empujeGuardado` 0,03 -> 0,09 (el ×3 de arriba).
      empujeGuardado: 0.09,
      // Por mapa antes del decisivo, la chance de que el rival te lea el guardado y te lo queme (te frena una vez).
      pLeenElGuardado: 0.12,
      // La sorpresa: el mapa 1 con un pick que el rival no preparó.
      // K4c: `empujeSorpresa` 0,05 -> 0,15 (el ×3 de arriba).
      empujeSorpresa: 0.15,
      // La charla del coach: un comodín por temporada que empuja el mapa decisivo.
      // K4c: `empujeCharla` 0,05 -> 0,15 (el ×3 de arriba).
      empujeCharla: 0.15,
      // El rival también quema campeones: su campeón del mapa i (0 el primero) juega con maestría
      // `maestriaRivalTope − i·caidaMaestriaRivalPorMapa` (piso `maestriaComodin`), con la misma regla que el tuyo.
      maestriaRivalTope: 80,
      caidaMaestriaRivalPorMapa: 8
    },
    // K4-C: después de qué rondas sale la rueda de prensa (`post_serie`). La otra mitad —tras un escándalo— la
    // pone `systems/events.js` (`escandalo: true` en el dato).
    // K4c: ['final'] -> []: la prensa sale solo tras un escándalo. Medido (criterio, 300 × 60, de a una perilla): la prensa era el
    // 55% de los minijuegos (11 por carrera) y pasa a 5 por carrera; las interrupciones bajan de 109 a 102,5 y el p90 de playoffs
    // y del internacional, de 7 a 6. Con cA entera la prensa es el 28% del banco que compite por un momento (banda ≤ 35%)
    // (PLAN.md, "Paso 2 — lo que midieron los barridos" y decisiones del paso 2, punto 4).
    rondasConPrensa: [],
    // K4-B: en qué rondas el mapa decisivo trae su minijuego (con la charla del coach en la misma pausa). En las demás
    // el mapa decisivo frena igual, pero solo con la charla (`motivo: 'decisivo'`).
    // K4c: `last_hit`, `la_vision` y `el_kite` (`data/minijuegos.json`) solo tenían el momento `mapa_cerrado`, que K4-B apagó: no
    // salían nunca. Suman `mapa_decisivo` a sus `momentos` (antes: solo `mapa_cerrado`) y con cA entera salen las 10 mecánicas del
    // catálogo, 4 minijuegos por carrera en vez de 11 (criterio, 300 × 60; PLAN.md, "Paso 2 — lo que midieron los barridos").
    rondasConMinijuegoDecisivo: ['semis', 'final', 'internacional'],
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
    // K4c-S: la prueba decide el contrato (regla 15: lo que el minijuego del tryout promete es lo que el motor hace). La
    // probabilidad de firmar sube con el `resultado` 0-1 de la prueba, interpolada entre estos tres puntos: un resultado
    // malo (0) firma pocas veces, uno regular (0,5) a veces y uno bueno (1) casi siempre. Si no firmás, en el mercado se
    // cae esa oferta y seguís con el respaldo que anuncia la prueba (tu club o la mejor sin prueba); en el amateur la firma
    // se posterga y seguís en la escalera. El crédito de jerarquía (`bonusJerarquiaTryout`) no cambia.
    // K4c (paso 3a): 0,15 / 0,55 / 0,95 -> 0,65 / 0,8 / 0,95. Con el arranque, "siempre acierta" sobre "siempre falla" daba
    // +171% (el que falla todo casi nunca llegaba a pro) contra el tope de +35% de "El impacto de los minijuegos está
    // acotado". Medido con la cuenta de ese check (1000 seeds), cuando la prueba fallida todavía re-abría el mercado:
    // 0,35 / 0,65 / 0,95 da +64%, 0,5 / 0,75 / 0,95 da +31% y 0,65 / 0,8 / 0,95 da +21%; PLAN.md eligió 0,5. Pero el
    // arreglo de K4-D (la prueba fallida sigue con el respaldo, no con otra prueba en otra oferta) le quita al que falla
    // todo los reintentos: re-medido con la ventana de `define_clasificacion` en 4, 0,5 / 0,75 / 0,95 da +47% (falla 4640,
    // acierta 6831) y 0,65 / 0,8 / 0,95 da +26% (falla 5411, acierta 6831); con la ventana en 6 (la de abajo), +31% (falla
    // 5330, acierta 6984). Se queda el que cumple el tope con el mismo criterio: 30 pp de firma entre una prueba mala y una
    // buena.
    probFirmaTryout: { malo: 0.65, regular: 0.8, bueno: 0.95 },
    // 9R4d: los cortes con los que se le pone palabras al stat que corre el
    // minijuego ("tu mecanica, 71: te abre la ventana"). Sin esto el numero
    // se muestra sin referente, que es justo lo que prohibe la regla 13.
    bandasVentanaMinijuego: { ancha: 70, normal: 45 },
    // "la_llamada": con jerarquia baja no te siguen aunque tengas razon — el
    // impacto del minijuego se amortigua fuerte por debajo de este umbral.
    jerarquiaMinimaParaSeguirLlamada: 60,
    factorLlamadaSinJerarquia: 0.35,
    // K2b: `ruidoMapa`/`ruidoRivalSerie` se mudaron a `partido.sigmaMapa`.
    // Maestria del campeon "fuera del pool" cuando el Fearless te quema todo (4.5).
    maestriaComodin: 20,
    // Fase 12f (§12.5): dificultad del minijuego que escala por ronda.
    dificultadMinijuegoPorRonda: {
      cuartos: 1.0,
      semis: 1.0,
      final: 1.2,
      internacional: 1.4
    },
    // Fase 12f: cuánto de `dificultadMinijuegoPorRonda` pasa a mecánicas que
    // escalan una VELOCIDAD en vez de una ventana (last_hit, robar_baron) —
    // aplicar el factor entero ahí se sentía desproporcionado contra el mismo
    // 1.4x en una ventana de tiempo.
    amortiguacionDificultadMinijuego: 0.35,
    // Fase 12f: piso de `ventanaPorStat` como fracción del mínimo declarado,
    // para que la dificultad de "internacional" nunca deje una ventana
    // injugable.
    pisoVentanaMinijuego: 0.7,
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
  },

  // Fase 9W: el ranking vivo de los mejores del mundo — el equivalente de las
  // listas "Top 20 players" que se publican cada pretemporada. Se computa sin
  // tocar `rng` (regla de oro de §9W): el puntaje es nivel + bonus por
  // resultado del año + un ruido determinista por `hashCadena`. Constantes
  // calibradas en 9Wd contra los umbrales de §9W.6 (medido n=300-400 × 60):
  // entrás al Top 20 en el 51% de las carreras con éxito y en el ~1% de las que
  // se lavaron; ~96 handles distintos y ~13 cambios del corte #20 por carrera
  // larga; un rival de generación asoma en el 35-37%.
  topMundial: {
    // Cuántos entran a la lista. 20 = la conversación completa; el Top 5 es lo
    // que se ve en el riel, el Top 20 el reveal de cierre de temporada.
    tamano: 20,
    // Peso del bono por resultado deportivo sobre el nivel crudo. Con
    // `pesoResultado 1` un `bonusInternacional` pesa exactamente ese número de
    // puntos de nivel. 9Wd: 1 → 1.30 — escala todo el aporte por resultado
    // (año actual + el decay del año previo). Junto con `bonusCampeonLiga` es
    // el lever de la vara §9W.6 (la mitad de las carreras con éxito tocan el
    // Top 20); más arriba empuja al rival de generación fuera de su banda.
    pesoResultado: 1.30,
    // El resultado del año pasado todavía cuenta, pero menos: un campeón no
    // desaparece del top al día siguiente de perder la final.
    decayResultado: 0.4,
    // Ganar la liga doméstica, ganar el internacional, ser finalista del
    // internacional. En puntos de nivel (0-100), sumados al puntaje.
    // 9Wd: subidos de 6/10/4 — con los originales un campeón de liga con nivel
    // de titular entraba al Top 20 sólo 1 de cada 8 veces. La mayoría de las
    // carreras con éxito son campeón doméstico sin internacional, así que
    // `bonusCampeonLiga` es el que mueve la aguja de §9W.6.
    bonusCampeonLiga: 13,
    bonusInternacional: 16,
    bonusInternacionalFinalista: 8,
    // La perilla del churn ("que rote bastante"): amplitud del ruido
    // determinista `hashCadena(seed + handle + anio)`, en ± puntos de nivel.
    // Constante dentro de un año, se re-tira en el borde de año — así el corte
    // #20 se mueve sin que nadie tire un dado. 9Wd: 5 → 4, gastando parte del
    // margen de rotación (medido holgado) para que el corte siga al mérito.
    ruidoSpread: 4,
    // Fase 9Wc: cuánto más allá del corte #20 sigue contando como "estuviste
    // cerca". Si quedaste rankeable pero afuera y a menos de `margenReveal`
    // puestos, el reveal de cierre dice "quedaste #23" en vez de sólo "no
    // entraste" — el "porque quizás estuviste cerca" del pedido de §9W. Es un
    // umbral de presentación: no toca el ranking ni ninguna distribución.
    margenReveal: 10
  },

  // K1 — El número (PLAN.md §K1): el puntaje de `core/puntaje.js`. Puro y sin
  // `rng`. Los seis componentes son >= 0 y crecen con el logro (la monotonía
  // que vigila `validate.js`). PROVISORIO: K5c lo vuelve a medir con el Mundial
  // real.
  // K5-A (PLAN.md "K5 — decisiones de spec", K5-A): el Mundial de verdad (`core/internacional.js`,
  // `systems/internacional.js`). Formato del real: Swiss de 16 (3 victorias pasás, 3 derrotas quedás afuera: 8 y 8)
  // y después cuartos, semis y final al Bo5. Los 16 salen de `cuposInternacionales` de cada liga (3/3/3/3/2/2).
  mundial: {
    participantes: 16,
    // Revisión de K5 (P4): el hype que te deja el Mundial según hasta dónde llegaste. Antes era binario (pasar el Swiss
    // = `rendimiento.hypePorTitulo`, 9; quedar afuera = `hypePorPodio`, 4): un campeón del mundo y un cuartofinalista
    // salían con el mismo hype. Escalonado alrededor del 9 de antes; el eliminado sigue en 4.
    hypePorResultado: { eliminado: 4, cuartos: 7, semis: 9, final: 11, campeon: 14 },
    victoriasParaAvanzar: 3,
    derrotasParaQuedarAfuera: 3,
    clasificanAlBracket: 8,
    // Los partidos del Swiss son Bo1 (una tirada, K2b); el bracket, Bo5 con las reglas de K4.
    boSwiss: 1,
    boBracket: 5,
    // La siembra del bracket (índices 0-based de los 8, ordenados por récord y fuerza): 1-8, 4-5, 2-7, 3-6.
    crucesDeCuartos: [[0, 7], [3, 4], [1, 6], [2, 5]],
    // La tabla de una liga que no jugaste: fuerza de la org más un ruido uniforme de este ancho (puntos de fuerza),
    // por hash. Con 0 viajarían siempre las mismas; con mucho, la tabla sería un sorteo.
    ruidoDeTabla: 10,
    // T9 (PLAN.md K5, riesgo 6): un split de Mundial no frena más de 4 veces por el Mundial. Las paradas que pasan el
    // tope las resuelve el coach (el mismo criterio que el camino headless). Antes de la final se guardan 2 para la
    // final (su plan de Fearless y su mapa decisivo): el 2-2, los cuartos y las semis frenan solo hasta 4 - 2.
    maxInterrupciones: 4,
    reservaParaLaFinal: 2,
    // K5c-H: ¿cuenta tu jerarquía en el Mundial? Con `false`, tu rendimiento en el Swiss y en el bracket no lo corre el
    // factor de jerarquía (`core/fuerza.js:fuerzaDeMundial`), igual que al rival NPC, que vale el promedio de sus niveles.
    // `true` es NEUTRO (el motor de siempre). La previa lo dice cuando está en `false` (regla 12). Se lee en cada llamada.
    // K5c paso 3 (Final2): true → false, tu jerarquía no corre en el Mundial (igual que al NPC).
    jerarquiaCuenta: false
  },

  puntaje: {
    // 1. Trayectoria: puntos por split jugado con contrato, según el tier en
    // que se jugó (`registro.porOrg[].splitsPorTier`, D76): más pesado arriba.
    trayectoria: {
      porSplit: { 1: 5, 2: 2, 3: 1 }
    },
    // 2. Títulos domésticos: puntos por título según el tier de su liga, ×
    // `prestigio / prestigioReferencia` de esa liga (una LCK pesa más que una
    // LCS, como en la realidad). La vara es la de `rendimiento.prestigioReferencia`:
    // una liga de prestigio 70 (LCS) vale 1×. Tier 3 no es una liga: usa el
    // prestigio sintético de su zona (`tier3.fuerzaMedia`, el mismo que le da
    // `core/competicion.js`).
    titulos: {
      porTitulo: { 1: 40, 2: 12, 3: 4 },
      prestigioReferencia: 70
    },
    // 3. Internacional: por participar y, además, por el resultado; todo × la
    // `dificultad` de la liga que representaste (`leagues.json`: cuán difícil es
    // ganar el Mundial saliendo de ahí — LCK 1, CBLOL 1,9). `porResultado` es
    // también la lista de resultados que existen (`serie.js` escribe estos dos):
    // un internacional con otro resultado hace fallar al puntaje en vez de
    // valer "participar" en silencio.
    internacional: {
      participacion: 20,
      // K5-A: el Mundial dice hasta dónde llegaste. `eliminado` = afuera en el Swiss (0, como antes); `cuartos`
      // vale lo que valía `buen_papel` (pasar de fase); cada ronda más suma, y ser campeón del mundo vale más que
      // cuatro títulos de liga tier 1 (40 c/u). `buen_papel` queda para registros anteriores a K5. Provisorios: K5c.
      porResultado: { eliminado: 0, cuartos: 50, semis: 80, final: 120, campeon: 180, buen_papel: 50 }
    },
    // 4. El mundo: el pico de rank mundial por bandas (#1, hasta `corteTop5`, el
    // resto del Top 20) más cada temporada cerrada adentro del Top 20
    // (`registro.splitsEnTopMundial`). Individual: × `pesoRol`.
    mundo: {
      numeroUno: 150,
      top5: 90,
      corteTop5: 5,
      top20: 40,
      porTemporadaEnTop20: 6
    },
    // 5. La generación: el puesto entre vos y los rivales de `mundo.rivales` por
    // el mejor rank mundial de cada uno (`0` = nunca entró, va último; los
    // empates no te superan). Suma por cada rival que superaste, más un bono si
    // nadie te superó y vos sí entraste al Top 20. Individual: × `pesoRol`.
    generacion: {
      porRivalSuperado: 12,
      bonoPrimero: 20
    },
    // 6. El que no llegó también suma: el pico de soloQ (`registro.picos.rankedPuntos`,
    // puntos absolutos de la escalera; Máster 0 LP = 2.800) reparte de 0 a
    // `tope`, lineal entre `puntosDesde` y `puntosHasta`. Chico a propósito:
    // alcanza para comparar dos desafíos sin fichaje, nunca para empatarle a
    // una carrera pro.
    soloQ: {
      puntosDesde: 2800,
      puntosHasta: 5400,
      tope: 30
    },
    // Por rol (CONCEPTO §9): multiplica los componentes individuales (4 y 5).
    // Se compensa un rol solo si su mediana ENTRE LOS QUE LLEGARON A PRO se
    // aparta más de ±10% de la de todos los pros, con `criterio` y >= 800 seeds
    // (revisión de K1-A: la distribución completa es bimodal y 400 seeds son
    // muestra). Medido en la revisión (seeds 1-800, 60 splits, 623 pros, el
    // bloque `puntaje` de `simulate.js`): mid −5,8% · adc +1,6% · support +3,0%
    // · jungla −1,0% · top +0,4%. Ninguno se compensa.
    pesoRol: { top: 1, jungla: 1, mid: 1, adc: 1, support: 1 },
    // Potencial contra logro: el subtotal se multiplica por un factor lineal en
    // `oculto.potencial`, de `factorConPotencialMinimo` (con `mundo.potencialMin`)
    // a `factorConPotencialMaximo` (con `mundo.potencialMax`): el mismo logro con
    // menos techo vale más.
    potencial: {
      factorConPotencialMinimo: 1.25,
      factorConPotencialMaximo: 0.85,
      // El texto del techo alto según hasta dónde llegaste: desde
      // `nivelAprovechado`, "lo hiciste rendir"; desde `nivelAMedias`, "daba
      // para más"; abajo, "se esperaba más".
      nivelAprovechado: 'campeon',
      nivelAMedias: 'profesional'
    },
    // Niveles, de abajo hacia arriba (nombres en `core/puntaje.js`, `NIVELES`).
    // Se ganan con HECHOS, no con puntos (PLAN.md "K1 — lo que cambió la
    // revisión de K1-A"): gana el más alto cuyo `requisito` se cumple entero.
    // Cada clave es un hecho de `hechosDeCarrera` con su mínimo (`rankPicoHasta`:
    // el mejor rank de la vida, este o mejor). "El que no llegó" es el piso;
    // "Fijo en primera" son tres años en primera (3 × `edad.splitsPorEdad`);
    // desde K5, "El GOAT" pide también 2 o más Mundiales.
    // K5c fija estos cortes como definitivos y "El GOAT" como nombre definitivo del nuevo Faker de §K.3b: #1 del mundo al
    // cierre de 3 o más temporadas, o (`alternativa`, otra lista que también gana el nivel) 2 o más Mundiales. Medido con los
    // valores de K5c (seeds 1-1500, 60 splits, `node --max-old-space-size=12288 src/dev/simulate.js 1500 60 <bot>
    // --bloque=puntaje`), el % de carreras que llega a cada nivel o más alto, criterio / azar / malas:
    // pasó por el circuito 78,6 / 75,9 / 62,7 · un profesional más 74,5 / 65,4 / 47,1 · fijo en primera 70,6 / 55,4 / 35,2 ·
    // campeón 57,0 / 42,7 / 23,6 · figura mundial 36,5 / 23,4 / 11,1 · leyenda 8,8 / 3,2 / 0,7 · El GOAT 1,3 / 0,2 / 0.
    // Cada nivel separa a los tres bots en el orden de sus decisiones. Los cortes por hechos no se mueven con el balance:
    // lo que se movió con K5 es cuántos llegan (§K.3b re-basado, PLAN.md §K5c).
    niveles: [
      { id: 'no_llego', requisito: {} },
      { id: 'circuito', requisito: { splitsJugados: 1 } },
      { id: 'profesional', requisito: { splitsTier1: 1 } },
      { id: 'fijo', requisito: { splitsTier1: 9 } },
      { id: 'campeon', requisito: { titulosTier1: 1 } },
      { id: 'figura', requisito: { cierresEnTop20: 1 } },
      { id: 'leyenda', requisito: { titulosTier1: 3, rankPicoHasta: 5 } },
      { id: 'goat', requisito: { cierresNumeroUno: 3 }, alternativa: { mundialesGanados: 2 } }
    ],
    // El referente del número (regla 13): "mejor que el X% de las carreras".
    // Pares [percentil, puntaje] medidos con `criterio` (seeds 1-800, 60 splits,
    // el bloque `puntaje` de `simulate.js`); entre dos pares se interpola y el
    // último es el techo de lo que se dice. El salto entre el p20 y el p30 es el
    // borde entre los que no llegaron (~23%) y los pros.
    // K3c re-midió con los valores del bloque A (la consistencia, la vuelta a la
    // base y los efectos que duran bajaron el número: p50 1172 → 989, p90 1800
    // → 1622, p99 2169 → 1993). K4c (paso 3b) re-midió con los del bloque B (el
    // ritmo: la serie como plan, la prueba que decide el contrato, el plan anual;
    // `criterio`, seeds 1-800, 60 splits, `node src/dev/simulate.js 800 60 criterio
    // --bloque=puntaje`): p50 989 → 933, p90 1622 → 1663, p99 1993 → 2243. El borde
    // entre los que no llegaron y los pros pasa a estar entre el p25 (124) y el p30
    // (436). Los cortes de nivel no se tocan: son por hechos.
    // K5c (paso 3b-3) la re-midió con los valores del bloque C (el mundo: el Mundial
    // real, cada uno en su casa, el desgaste; `criterio`, seeds 1-1500, 60 splits,
    // `node --max-old-space-size=12288 src/dev/simulate.js 1500 60 criterio
    // --bloque=puntaje`): p50 933 → 259, p90 1663 → 876, p99 2243 → 1290. El número
    // bajó porque el mundo es más duro (menos títulos, Top 20 y años pro por
    // carrera). Al cerrar K5c se re-midió sobre el head final (después de las
    // cartas de cierre del declive, que corrieron el stream; mismo comando): p50
    // 259 → 260, p90 876 → 876, p99 1290 → 1315; el borde entre los que no
    // llegaron (21,5%) y los pros cae entre el p20 (26) y el p25 (39). Definitiva
    // para el cierre de K5c.
    cuantiles: [
      [0, 0], [5, 11], [10, 16], [15, 21], [20, 26], [25, 39], [30, 80], [35, 110], [40, 153], [45, 208],
      [50, 260], [55, 316], [60, 378], [65, 450], [70, 517], [75, 592], [80, 659], [85, 763],
      [90, 876], [95, 1025], [97, 1150], [99, 1315]
    ],
    // La leyenda comparada (`data/leyendas.json`): la más cercana por distancia
    // euclídea sobre el perfil normalizado (cada eje dividido por su `escala`),
    // más `penalizacionRolDistinto` si no es de tu rol. Empate: el `id` menor.
    // El eje del ranking es `topMundial.tamano + 1 - rank` (0 si nunca entró).
    leyendas: {
      escala: { anios: 15, titulos: 10, internacionales: 12, rank: 20 },
      penalizacionRolDistinto: 0.3
    }
  }
};
