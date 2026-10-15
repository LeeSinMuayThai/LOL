# AUDITORIA.md — Auditoría de gameplay: El Ídolo contra Lolero (2026-10-14)

> **Qué es este documento.** Una auditoría de gameplay hecha a pedido del usuario (2026-10-14, textual): *"el juego es
> tan divertido como el ejemplo [...] tu trabajo sera ver porque es mas divertido, ver todo pero principalmente el
> gameplay, hacer una auditoria completa y detallada de como es jugar la carrera, de porque se siente mas juego, mas
> controlada, etc, despues jugar una en lolero.lol, y hacer la auditoria comparando con la del idolo del potrero, luego
> volver a jugar en el idolo del potrero para terminar la auditoria y ver que se puede mejorar en este juego para que el
> gameplay se sienta mas asi"*. Es la base de la ola G (`PLANUI.md` §0.9). **No es el plan.**
>
> **Ciclo de vida.** Es una foto: no se actualiza sola. Si contradice a `PLANUI.md` o a `PLAN.md`, ganan ellos. La
> auditoría anterior (2026-10-01, contra `2c63c4f`: el contrafáctico de agencia y la salud del código) sigue en git:
> `git show 749b5cf:AUDITORIA.md`.
>
> **Medido contra** lolero.lol en vivo con la ola F (master `7ce3e81`, Wrangler `4153d171`) y El Ídolo de Potrero 2.6.
> Escrita sin tocar `src/`.
>
> **Método.** El detalle y los límites están en el Apéndice 2.
> - Cuatro partidas jugadas:
>   - dos de El Ídolo: Habilidoso en carrera libre (24 temporadas) y Cabulero en la carrera del día (22);
>   - dos de Lolero: LAS, mid, Hambriento (12 años), y EMEA, Profesional (3 años, para ver la parte alta).
> - Lolero se jugó con `?previa=auditoria`, en RÁPIDO como juega el usuario. Ese modo guarda en memoria: la partida
>   guardada del usuario no se tocó.
> - Tres exploradores de solo lectura ubicaron cada problema en `archivo:línea` (§F).
>
> **Cómo se lee.** §A son los números. §B y §C son el corazón: qué hace El Ídolo y qué le falta a Lolero, cada punto
> jugado. §D es el diagnóstico, §E lo que decidió el usuario y §F dónde está cada cosa en el código. Las notas crudas de
> las cuatro partidas, que son la evidencia, están en el Apéndice 1.

## Veredicto

**El Ídolo tiene menos sistemas que Lolero, pero cada número está a la vista, cada decisión es tuya y cada final la
ganás o la perdés con tus manos. Lolero tiene más mundo, pero decide por vos, esconde lo que movés y resuelve el clímax
con una tirada.**

Las olas W y F arreglaron la vitrina: la ficha, el diario y el Mundial visible. Lo que falta es **el control**: quién
decide, qué se ve, quién define la final y que nunca te quedes sin equipo.

## A. Las cuatro partidas, en números

| | El Ídolo 1 (Habilidoso, All Boys) | El Ídolo 2 (Cabulero, del día) | Lolero 1 (LAS, Hambriento) | Lolero 1b (EMEA, piloto) |
|---|---|---|---|---|
| Temporadas | 24 (16→39) | 22 (16→37) | 12 (15→27) | 3 (15→17, cortada) |
| Años sin club/equipo | 0 | 0 | **9** (5 amateur + 4 agente libre) | 2 amateur |
| Partidos que **definí con mi gesto** | ~45 (finales + 3 Mundiales) | ~35 | **0** | **0** (1 minijuego + tirada) |
| Paradas de partido | — | — | 8, todas "elegí un plan y tirada" | 7 (4 del Mundial con 1 sola opción) |
| Eventos que decidió el juego por mí | 0 | 0 | **~5 por año amateur** (perfil) | idem |
| Títulos | 16 | 11 | 1 | 1 |
| Cada elección mueve un número que veo | siempre, en el acto | siempre | casi nunca en el acto (el diario muestra el receso) | idem |
| Final de carrera | escena del 89' + estatua + figurita + palmarés | último baile + 89' + bandera | "el teléfono dejó de sonar" + desglose del puntaje | — |

## B. Por qué El Ídolo se siente más juego y más controlado

No es que tenga más cosas: tiene **menos sistemas, todos a la vista, y el clímax en tus manos**. Doce principios,
todos vistos jugando:

1. **El clímax se juega, no se mira.** Cada final es un juego, y **el resultado es lo que hiciste**: no hay tirada
   después del minijuego. El empate se vuelve a jugar (alargue con tablero nuevo), el "casi" da una sola segunda
   oportunidad por torneo (penal), y la dificultad sube dentro del torneo (barra 34% → 16%, la seña más rápida).
   Hay ~12 minijuegos distintos, y el stat agranda la ventana (zona verde 14% → 21%).
2. **La suerte se toca y se ve.** El Cabulero también decide con un gesto: guarda dados, canta mayor o menor,
   cambia de botines (Monty Hall), carga la ruleta, destapa una celda. Las reglas se conocen (la Generala) y a veces
   hay una jugada inteligente escondida. **Nunca es "apretá y esperá un número".**
3. **Cada elección mueve un número que ves, en el acto.** Carta "+4 Gambeta" segura; el evento cambia la ficha al
   toque; comprar el auto da +3 de fama. La ficha es el marcador de tus decisiones.
4. **Pocos sistemas, todos en pantalla.** Son 5 stats, media, fama, amor, gloria y plata. El stat de la carta es el
   stat de la ficha. No hay nada oculto (el potencial se elige al inicio: "Pibe maravilla").
5. **Escalones con nombre en todos lados.** El amor por club va Uno más → Querido 25 → Referente 50 → Ídolo 75 →
   Leyenda 95, y Leyenda trae "¡Tenés tu estatua!". La fama 100 desbloquea "Pedir club". La Selección va sin chance
   → en carpeta → convocado. Y el escalón entra en las ofertas: "te faltan 20 para Leyenda". Así un mercado se
   vuelve un dilema.
6. **Todo lo que es una decisión la tomás vos.** Hay 0-1 evento por temporada, siempre tuyo, con el riesgo escrito
   (⚠). Hasta el evento de una sola opción tiene consecuencia.
7. **El mercado es el corazón estratégico.** Cada 2-3 años hay 6 ofertas, **nunca cero**, con cuatro ejes a la
   vista: plata, minutos, amor que perdés y amor con el que arrancás. Las etiquetas (RENOVACIÓN, BOMBAZO, TRAICIÓN −30,
   A LA BAJA, VOLVÉ A CASA) cuentan el resto. El amor se guarda por club, y de ahí salen los arcos: descenso →
   lealtad → ascenso → Ídolo → Europa → volver a casa → estatua.
8. **El mundo se acuerda y paga lo que promete.** "Si la rompés estas dos temporadas, los grandes van a venir"
   ocurre dos años después. El ascenso nombra el descenso que causaste. El jeque te cuesta la Eurocopa al año
   siguiente. El rival de los 16 se lleva titulares.
9. **Perder es una historia, no un castigo.** La ÚLTIMA HORA en rojo, el "gallo del estribillo, remix del verano",
   "la próxima timba es tuya", "la noche pedía entre 1.8s y 2.4s".
10. **No hay tiempo muerto.** Siempre estás en un club. Hasta estancado en la B hay copas que se juegan, y el año sin
    nada pasa en 15 s.
11. **El final es una ceremonia.** Primero "El último baile" (seguir o colgarlos). Después el tiro libre del 89' con el
    premio a la vista (arriesgado +10 / seguro +8), la estatua con apodo y la figurita según tu mejor escalón. Al
    final el palmarés club por club: escalón de amor, copas, finales perdidas, premios y duelo eterno.
12. **Una capa de meta.** La carrera del día con objetivos y monedas, el ranking (solo cuenta el retiro natural) y
    "tenés otra chance".

Lo que **no** hay que copiarle:
- Al final regala finales (tres en un año, 16 títulos).
- Titulares repetidos ("BARRO, RUTA Y APRENDIZAJE" ×5) y textos viejos ("la estatua está cada vez más cerca" con
  la estatua ya puesta).
- "Vas a jugar menos" y jugaste 42.
- Los mismos minijuegos durante 24 años.
- Publicidad para mejorar cartas.

## C. Por qué Lolero se siente menos juego (cada punto, jugado)

1. **El clímax se mira.**
   - El título de LRS salió de un clic que movía ±1% ("Guardar a Ahri" 86% contra 84-85%), en un equipo al que
     llegaste esa semana.
   - El combo perfecto del mapa 5 dejó un 28% de perder (W7).
   - El Swiss del Mundial son cuatro "A jugarlo" de una sola opción.
   - La copa 3D y la serie mapa por mapa son hermosas, pero celebran algo que no hiciste.
2. **La suerte está escondida.**
   - Ves un porcentaje y una tirada invisible.
   - En los Bo1 ni siquiera ves cuánto mueve tu opción ("tenías 31%" después de elegir; 36% → 63% en otro).
   - Perder no tiene relato: "Pierden. Quedan 8º de 8".
3. **Lo que elegís mueve números que no están en pantalla.**
   - Consistencia, macro, mecánica, pool, shotcalling, adaptabilidad y sinergia no están en la ficha.
   - Las cartas dicen "~+8" o "RULETA".
   - F4 sumó el receso al diario, pero el número no se mueve en el acto.
4. **Demasiados números por decisión.** El plan del año son 4-5 cartas × 5 barras + % de riesgo + "s3" + rombos de
   certeza. En El Ídolo es un número grande por carta.
5. **El juego decide por vos lo que más importa.** El perfil resolvió ~5 eventos por año: la charla del comedor,
   la PC confiscada, el examen, el meme. Quedaron en un cajón, y ninguno fue titular.
6. **Las paradas están donde no pesa.**
   - Las temporadas corren solas y frenan en el último Bo1.
   - El primer año pro no tuvo un solo partido.
   - Un torneo ganado ("1.º de 6") apareció en el cajón, sin copa.
7. **Tiempo muerto.**
   - Cinco años amateur sin equipo, sin partidos y con puntaje 0.
   - "¿Seguís?" a los 19 sin haber tenido equipo.
   - Después, cuatro pretemporadas sin una sola oferta con nivel 69-75, hasta el retiro forzado a los 27.
8. **El mercado no es un dilema.**
   - Faltan el arraigo que perdés y con el que arrancás, la traición y volver a casa.
   - Una oferta paga más que su propio techo ($511k con "hasta $348k").
   - Puede no haber ninguna oferta.
9. **Los escalones existen pero no empujan decisiones.** El arraigo no pasó de "Uno más" en 7 años y 4 orgs. Ninguna
   oferta dice "te faltan X para Querido".
10. **El diario se repite y se contradice.**
    - "UN AÑO MÁS EN LA GRIETA" ×3, "WORLDS, POR TWITCH" ×2, "El parche te dejó sin Ahri" ×5.
    - "¡SOS UNA ESTRELLA!" siendo "El que no llegó".
    - "El día que dejaste tu país" sin haber salido de LAS.
11. **El final es una auditoría, no una ceremonia.** El puntaje viene desglosado, el potencial oculto se revela recién
    ahí y el apodo es "el nómade que nunca echó raíces". No hay último partido ni monumento.

Lo que Lolero hace **mejor** y hay que conservar:
- La firma con escudo, camiseta y número.
- La serie mapa por mapa con el Fearless.
- El stream del Mundial con el tablero suizo.
- **La charla del coach como recurso único por temporada** (lo más El Ídolo de Lolero).
- Los parches y el meta, las noticias del mundo y las revanchas.
- "De dónde sale el número" y el duelo eterno.

## D. El diagnóstico en una línea

El Ídolo tiene menos sistemas, pero **cada número está a la vista, cada decisión es tuya y cada final la ganás o la
perdés con tus manos**. Lolero tiene más mundo, pero **decide por vos, esconde lo que movés y resuelve el clímax con
una tirada**. Las olas W y F arreglaron la vitrina (ficha, diario, Mundial visible). Lo que falta es **el control**:

- quién decide;
- qué se ve;
- quién define la final;
- que nunca te quedes sin equipo.

## E. Decisiones del usuario (2026-10-14, textual; no volver a preguntar)

1. **Finales**: "O sea que la clase sí tenga peso, pero más para las estadísticas. Si bien puede ser como que te marque
   que si elegiste el cabulero, por poner un ejemplo, te ponga un dadito o algo así extra o algún coso especial, pero
   por lo general, mecánico, minijuegos, habilidades, ¿me entendés? Como dijiste en el primero."
   → Las finales se definen con minijuegos de habilidad para todos. La clase inclina los stats y da **un poder
   especial de un uso** (el "dadito" del cabulero).
2. **El perfil**: "Que no decida nada". Todo evento con elección frena y lo decidís vos, con tope por split; lo que
   no entra no pasa. El perfil queda como sugerencia marcada.
3. **Amateur**: "Corta y siempre con equipo". De 15 a 16 en soloQ, con copas amateur jugables. A los 17, equipo
   seguro (tier 3 como mínimo). Nunca más de una pretemporada sin club: siempre hay ofertas, aunque sean a la baja.


## F. Dónde está cada cosa en el código (contra `749b5cf`)

Lo ubicaron tres exploradores de solo lectura. Cada pieza de la ola G parte de acá.

### F.1 Las finales y las series (G1)

- **La tirada después del minijuego (W7).**
  - El mapa se tira en `systems/serie.js:358`: `finalizarMapa` → `tirarPartido` (`core/partido.js:69-71`), contra
    `probabilidadDeMapa` (`core/serie.js:371-377`).
  - El minijuego solo corre esa p: `ajusteDeMinijuegoDeMapa` (`core/serie.js:388-394`), con un impacto de 0,09 a 0,16
    según el minijuego (`data/minijuegos.json`). Después se tira igual.
- **Dónde hay minijuego.**
  - `pausaDecisiva` (`systems/serie.js:326-342`) lo ofrece solo en el mapa decisivo y solo en
    `rondasConMinijuegoDecisivo: ['semis','final','internacional']` (`balance.js:1918`).
  - En cuartos hay solo la pausa del coach (`serie.js:112-136`).
  - Los Bo1 y los cuartos domésticos nunca tienen minijuego.
- **El camino sin pantalla (Node).** `resolverAuto` (`systems/serie.js:643-665`) simula el minijuego con
  `gauss(stat/100, spread)`.
- **La pantalla.** `ui/paradas/minijuego.js:226,243`, con `previaDeMapa` (`core/previaDePartido.js:120-156`), y
  `caraACara.js:306-312`.
- **Las perillas.**
  - `sigmaMapa` 17,7 (`balance.js:55`);
  - `empujeCharla` 0,15 (:1900);
  - `dificultadMinijuegoPorRonda` (:1965-1970);
  - `veredictoMinijuego` (:1937).
- **La charla del coach.** Una por año calendario.
  - Se guarda en `career.charlaUsadaEn` (`core/state.js:203`).
  - `charlaDisponible` está en `core/serie.js:197-200` y `gastarCharla` en `systems/serie.js:344-352`.
- **Los Bo1 que frenan.**
  - La parada la arma `construirDecisionMomento` (`systems/temporada.js:277-295`).
  - La p base es `probabilidadDeFechaMarcada` (`core/temporada.js:365-368`), y la tirada está en
    `systems/temporada.js:352`.
  - Los efectos de cada opción vienen del dato (por ejemplo, `data/events/partido/dentro_del_mapa.json:1088-1157`),
    con dos sorteos. Por eso una opción no tiene una p única.
  - La regla de `core/previa.js:87` prohíbe mostrar un número.
  - La UI muestra el % solo si existe `o.pSerie ?? pOpc` (`caraACara.js:232,247`), y el "tenías X%" aparece después
    (:771).
- **El Mundial.**
  - `avanzarSwiss` (`systems/internacional.js:138-156`) frena en cada ronda (`frenaCadaRondaSwiss`,
    `balance.js:2141-2145`).
  - `construirDecisionSwiss` (:88-123) arma una sola opción, "jugar", salvo en el 2-2. La tirada está en `resolverSwiss`
    (:193).
  - El stream (`stream.js:201-218`) dice "cambia con cada una" aunque haya una sola opción.
  - El bracket usa la ronda 'internacional' (Bo5). La parada del plan se saltea si la p queda fuera de 30-70%
    (`pAbiertaEliminacion` 0,3), y el tope es de 4 paradas (`puedeFrenar`, :267-271).
- **Los minijuegos.**
  - Son 10 en `data/minijuegos.json`, registrados en `minijuegos/index.js:21-32`.
  - De mapa, mid y support tienen 4; los otros roles, 5.
  - Se eligen por hash (`elegirMinijuego`, `core/minijuegos.js:47-62`), y la ventana por stat está en
    `minijuegos/comun.js:42-47`.
  - La rueda de prensa nunca sale: `rondasConPrensa` está vacío (`balance.js:1912`).

### F.2 El perfil, los eventos y la carta (G2)

- **Un evento frena solo si su JSON trae `"bifurcacion": true`** (`presentarOResolver`, `systems/events.js:528-540`).
  - Si no, lo resuelve el perfil: `opcionDelPerfilPara` (:440-442) y `resolverOpcion` (:381-417). Las cadenas pasan por
    `encadenar` (:617-622).
  - Solo 28 eventos, en 11 archivos, son bifurcación. En `soloq_precarrera.json`, solo `scout_call`.
- **La elección del perfil** está en `core/perfil.js:90-105`.
  - Los pesos vienen de `data/perfiles.json`: Profesional, Hambriento, Showman y Leal.
  - Cada bifurcación corre el perfil (:127-134).
- **Las perillas.**
  - `perfil` (`balance.js:140-144`);
  - `presupuesto.interrupcionesPorSplit` (:685-687, solo pro; se lee en `events.js:509`);
  - `edad.probSegundaDecisionPorTipo` (:673);
  - `cola` (:1554-1566): desde los 28 o desde el declive, `core/cola.js:77-91` resuelve solo.
- **"Te confiscaron la PC"** es una línea de dado (`systems/amateur.js:919-929`) que solo deja una bandera. La
  continuación sí es un evento (`data/events/marcas_vivas.json:3-12`).
- **El cajón** se dibuja en `ui/components/feed.js:480-486`.
- **El plan del año amateur.**
  - La parada: `decisionDePlan` (`systems/amateur.js:566-604`).
  - El riesgo: `riesgoDelPlan` (:479-522). La propuesta: :302-320.
  - `planRiesgoEvitable` vale 0,15 (`balance.js:353`).
  - La parada semanal es `planDeSemana` (:333-357), con `semanaRiesgoEvitable` y `semanaRiesgoNuevo` en 0,05
    (`balance.js:344`).
  - La UI: `ui/components/decision/comun.js:91`.
- **La carta del cierre.**
  - Son 10 eventos en `data/events/cierre_edad.json`, y el flujo está en `systems/edadCierre.js:18-40,79-86`.
  - La etiqueta RULETA sale de `core/previa.js:127-145` (`eventos.riesgoBandas`, `balance.js:131`) y se dibuja en
    `ui/components/decision/cartas.js:153-156`.
- **La ficha** (`ui/fichaFija.js`).
  - Las piezas: nivel (:143-154), arraigo (:156-170), carrera (:172-184), jerarquía y hype (:186-198), Mundial
    (:200-205), títulos (:207-224) y ganado (:226-232).
  - La hoja "Tu juego" (:267-284) tiene Mecánica, Macro, Laneo, Calls, Adapt. y Cabeza (`core/ficha.js:444-458`).
  - "Élite" vale 63-78 en la ficha (`core/ficha.js:27-39`) y más de 80 en el mercado (`core/demanda.js:29-58`).

### F.3 El amateur y el mercado (G3)

- **La primera oferta.**
  - El flujo: `buscarSalida` (`systems/amateur.js:1037-1046`), `probabilidadDeScouting` (:981-998), `nivelDeInteres`
    (:960-979) y `orgQueTeFicha` (:1012-1026; `core/tier3.js:73`).
  - La decisión: `decisionDeOferta` (:1190-1231), con `varaPrueba` (`balance.js:377`).
- **El "¿seguís?".**
  - `decisionSalidaAmateur` (:1522-1534) frena desde los 19 (`edadOfertaDeSalida`, `balance.js:390`).
  - A los 24 (`edadLimite`, :385) la carrera termina en 'no_llego'.
  - Las perillas: `scoutingSesgoEtario` (:311-312), `scoutingProbPorNivel` (:296), `splitMinimoScouting` 2 (:315) y
    `edad.splitsPorEdad` 3 (:668).
  - `EDAD_INICIAL` 15 está fijo en `core/state.js:18`.
- **"No llega a pro"** se mide como `splitFichaje === null` (`src/dev/simulate.js:1200`).
- **La causa más probable de las cero ofertas: la penalidad de edad** `(1−sesgoEtario(edad))×100`.
  - Está en `core/valorMercado.js:25-27`, con `balance.js:1226` y la tabla de :1437-1441.
  - Vale ~−48 a los 25 y ~−70 a los 27. Los comentarios dicen ~10.
  - La exención por mérito es solo por Mundial, título de tier 1 o top 10 (`core/demanda.js:345-368`).
  - La de "casa" (`systems/mercado.js:386-413`) nunca aplica en la LCK ni en la LPL, y LATAM no tiene liga de casa.
  - Con `career.liga` en null no hay renovación.
  - La mano se ralea con `round(n×sesgo)` (`mercado.js:420-423`).
- **El bucle "El mercado ya habló"** está en `systems/mercado.js:907-1075` (3 esperas, `balance.js:1268`), y
  `quedarLibre` en :545-563.
- **El retiro.**
  - `sin_equipo`: `systems/retiro.js:125-129`, con el texto en :74-79.
  - Forzado solo a los 34 (:352-356).
  - El "¿la seguís?" llega después de dos pretemporadas sin club (:362-396).
- **"Hasta $X"** es el presupuesto del asiento (`core/demanda.js:144-164`; el texto en :579). Nunca topea el sueldo
  (`core/salarios.js:12-22`). La UI está en `ui/components/mercado.js:79,380`.
- **La oferta.**
  - Los campos están en `mercado.js:183-212`.
  - Irte cuesta todo el arraigo actual (:135-141).
  - El arraigo inicial es el hype × 0,15 (`core/registro.js:454-456`, `balance.js:837`), aplicado en
    `roster.js:209,224`.
  - El arraigo solo aparece en la lista de detalle (`components/mercado.js:724-725`).
  - No hay traición, ni castigo por el clásico, ni volver a casa. "Clásico" es solo un rótulo de partido
    (`core/temporada.js:258-267`).
- **La pieza F2.**
  - Las perillas `paradasMinimasPorSplit` 1 y `paradaGarantizadaHastaTier` 2 (`balance.js:1779-1786`).
  - `necesitaParadaGarantizada` (`systems/temporada.js:123-129`) no aplica a tier 3 ni al amateur, y saltea el split de
    playoffs.
  - La ventana de tier 2 a mitad de año es una sola llamada (`conLlamadaDeTier2`, `systems/competitivo.js:169-188`;
    `competitivo.llamadaTier2`, `balance.js:1100-1105`).
  - El mercado entero corre solo en la pretemporada.

### F.4 El diario y el final (G4)

- **El diario** (`core/temporadaResumen.js:386-417`).
  - Los candidatos están en :348-363 y los puntajes en :177-197.
  - El titular de respaldo es "UN AÑO MÁS EN LA GRIETA" (:389). "WORLDS, POR TWITCH" es el titular de la ausencia.
  - La anti-repetición es mínima: el "OTRA VEZ —" aparece desde la cuarta repetición (:371-374, :384, :405-408;
    `balance.js:1772`).
  - El renglón "El parche te dejó sin X" (:478-481) no mira si es el primer año, y `ui/core/momentos.js:203-213` lo
    conserva.
  - No hay candidatos de familia ni del amateur.
  - El flujo: `systems/resumenAnio.js:27-39` → `momentos.js` → `ui/fx/momento.js:343-345`.
- **La tarjeta final** (`ui/screens/tarjeta.js:338-422`). Sus partes:
  - el título (:20-27);
  - el puntaje (:72-89);
  - "de dónde sale" (:127-145), con el potencial revelado (:141-142);
  - "se parece" (:153-180);
  - org por org (:254-278, :395-405);
  - "las que se escaparon" (:281-297);
  - el duelo (:299-334).
- **No hay último partido ni ceremonia**: el juego va directo a la tarjeta (`ui/app.js:331-340`). No hay botón de
  retiro.

## Apéndice 1. Las notas crudas de las cuatro partidas

Escritas mientras se jugaba, en el orden en que se jugó. Son la evidencia de §A-§D.

### Notas crudas — El Ídolo, partida 1 (Carrera libre: Argentina, Primera Nacional, All Boys, 10 Enganche)

Versión 2.6. Modos: Carrera (del día con objetivos / libre), Ultra, Duelo, Sin reglas, Modo historia (Messi…),
Ranking, Copa de clubes, Entrenamiento, Tienda.

**Arranque (~8 clics).** Nacionalidad, país de la liga, liga, equipo, nombre, puesto (9/10/1), "Pibe maravilla".
Después, dos elecciones que te definen para siempre:
1. **La clase** ("define cómo se juegan TODAS las finales"): Cabulero (suerte y cábala) / Mixto / **Habilidoso**
   ("todo en tus manos: minijuegos de memoria, puntería, timing"). → **El jugador elige cuánto control quiere en el
   clímax.** Elegí Habilidoso.
2. **El arquetipo** ("¿Qué clase de 10 sos? El dado trajo tres destinos"): Cerebro (+8 Liderazgo +2 Pegada) / El
   Distinto (+3 a cuatro) / Media punta (+5 Pegada +4 Velocidad). La ficha sube en el acto con ▲ y el valor de
   mercado también (400K → 500K).

**La ficha (siempre arriba, idéntica en todas las pantallas).** MEDIA grande · nombre "· LA 10" · año y edad · fama ·
club y liga con escudo · "Selección: sin chance" · barra de amor con el club "UNO MÁS 0/100 → QUERIDO 25" ·
partidos/goles/asistencias/títulos · los 5 stats (Pegada, Velocidad, Gambeta, Liderazgo, Resistencia) con ▲▼ y el
mejor en dorado · Valor / Ganado / **Gloria** · botones Tienda, Pedir salida, Pedir club, Ver carrera, Retirarme.
Vitrina a la izquierda, trayectoria club por club a la derecha. **Debajo, una sola tarjeta.**

**El ciclo de una temporada (2-4 clics, ~15-25 s):**
1. Cambio de año: crecimiento por edad automático, +1-2 en cada stat, visible con ▲ (MEDIA 57→59→61→63...).
2. **Pretemporada: "El dado trajo tres mejoras. Elegí una."** 3 cartas, cada una +2..+5 a UN stat, seguro, con
   rareza (común/RARA). Texto de entrenamiento de 1 línea + el número grande. Publicidad: "cambiá las tres cartas por
   MEJORES" (3 veces por carrera).
3. 0-1 evento, ~30 palabras, 2 opciones de 4-6 palabras + 1 línea de pista ("Dos butacas... Llegás entero" / "El
   plantel te adopta. Las piernas, no."). Las arriesgadas llevan ⚠ con el riesgo escrito ("Si el árbitro te ve, te
   vas expulsado y te comés varias fechas"). Rótulos: PASAN COSAS / DECISIÓN DIFÍCIL.
4. Cada 2-3 años (fin de contrato) el **mercado**, 6 ofertas.
5. Si está en juego algo grande, **el partido clave con minijuego** (Habilidoso).
6. **El diario** ("POTRERO DEPORTIVO · 2029 · Temporada 4"): titular, tu equipo y su puesto, 5 números (PJ, goles,
   asist., ganaste, nota), "ÚLTIMA HORA" con lo que pasó con tu decisión, viñetas. Continuar.
- **La consecuencia de cada elección se ve en la ficha al toque** (Truco → Liderazgo 50→52 ▲, Resistencia 62→61 ▼;
  Poner la tira → −3K, Liderazgo +2; Dormir temprano → Resistencia +3).

**Lo jugado.**
- 16-20 años en All Boys (B Nacional): 11°, 15°, 12°, 10°, 14°. **El mismo titular cinco veces** ("BARRO, RUTA Y
  APRENDIZAJE"). La primera etapa es repetitiva, pero dura 5 × 20 s.
- 19: mercado (fin de contrato), 6 ofertas todas de la B: RENOVACIÓN All Boys 3K "te faltan 21 para Querido",
  **TRAICIÓN** Nueva Chicago 5K "−30 de idolatría, te vas al clásico rival: traición imperdonable", y 4 de 4K con
  "−8 de idolatría · minutos parecidos · allá arrancás Uno más (6/100) — tu fama te precede". Renové.
- 20: el clásico **es contra Nueva Chicago** (el mundo es coherente con la etiqueta TRAICIÓN del mercado).
- 21: **"EL SALTO A PRIMERA — De la B no se vuelve: elegí bien dónde caés."** BOMBAZO Västerås (Suecia) 17K,
  BOMBAZO Gimnasia de Mendoza (Primera) 15K, renovación 3K, tres de la B a 5K. Fui a Gimnasia (Primera).
- Primera temporada en Primera: evento eSports (⚠ "podés perder la inversión", invertí, salió +90K) → **"MANO A MANO ·
  LA PERMANENCIA"**: "Quedaste solo contra el arquero. Te tira un amague: se perfila a tu derecha. Definí al lado
  libre (más Definición = mejor le leés la tendencia)". Tres botones. Pateé al lado libre, el arquero se tiró ahí:
  **"SE CONSUMÓ EL DESCENSO"**. Un solo clic decidió el descenso. Se sintió duro pero mío: lo elegí yo y la pista era
  probabilística (el stat la hace más confiable).
- Diario: "EL SOCIO DE TODOS — 22 asistencias" (titular por el número saliente), 27° en la Liga, nota 8,4, "Última
  hora: tu equipo de eSports explotó", "1 gol en el clásico", "Se consumó el descenso… te toca bancar y devolverlo a
  Primera". Valor 8,3M → 4,8M.
- 22-23 en la B con Gimnasia: titular repetido otra vez. Mercado a los 23: renovación 16K "te faltan 6 para Querido"
  contra cinco de la B a 5K: **acá no hubo dilema** (la renovación domina). Evento "Cancha pesada": elegí lo seguro
  ("medirte y salir vivo") y salió mal: "ÚLTIMA HORA" en **rojo**, "te comieron los caudillos", fama −1. **Lo seguro
  también puede salir mal, y se cuenta igual de claro.**
- **La tienda** (siempre a un clic): staff permanente que tuerce curvas (cocinero 8M: menos fatiga; kinesiólogo 11M:
  menos lesiones; psicólogo 9M: la mala racha dura menos; preparador 14M: el declive llega más tarde; súper
  representante 12M: mejores ofertas), consumibles de 1-2 temporadas (botines: más goles; analista de video: más
  asistencias; la cábala: suerte en la pelea por el título; asesor de prensa: la próxima rueda de prensa con las
  respuestas sopladas) y lujos con escalera de precios (auto 500K +3 fama … isla 48M +12 … el potrero de tu barrio 75M
  recupera idolatría … accionista de un club 200M). "La plata no cuenta para la gloria: los boosts la cambian por
  carrera deportiva." Compré el auto: fama 52 → 55 en el acto.
- **"Pedir club"**: "Se desbloquea con fama 100 (tenés 63). Ahí vas a poder pedir cualquier club para el próximo
  mercado, una vez por carrera." → la fama es una moneda con un desbloqueo nombrado.
- 24: evento de una sola opción ("El perro": lo alzás). Igual tuvo consecuencia (el club adoptó al perro con tu
  nombre).
- **La final de la Copa Argentina** (Gimnasia, de la B, contra Vélez): "LA DEFINICIÓN · LA CORRIDA — El marcador
  recorre la barra. Tocá Frenar justo cuando esté sobre la zona verde. Con más Definición, la zona es más grande."
  Frené en la zona → "Frenaste justo en la zona" → **"¡CAMPEÓN! LA COPA ARGENTINA ES TUYA. Levantaste la Copa
  Argentina y fuiste la figura de la final. Eterno."** con la copa. **Sin tirada después: el minijuego ES la final.**
  (Nota de método: la ventana de Chrome está oculta y el rAF no corre; frené la barra leyendo su posición entre
  capturas, o sea jugué "perfecto".)
- Diario con confeti: "¡LA COPA SE QUEDA EN CASA!", chip "Copa Argentina · CAMPEÓN", "¡AHORA SOS QUERIDO 👏!".
  La ficha en el acto: títulos 1, la copa aparece en la vitrina, "🏆1" en la trayectoria, amor 24 → 31 (→ Referente
  50), **Gloria 75.654 → 144.547** (casi el doble por un título), fama 64 → 74.
- 25: mercado otra vez sin Primera (renovación 18K contra cinco de la B a 6K). **Estancado en la B con MEDIA 86**:
  El Ídolo también tiene mesetas sin salida, pero cuestan 2 clics por año. Evento "El de la popular" (un veedor de un
  grande): jugar para la libreta ⚠ → salió mal ("quisiste de rabona un pase de cinco metros, el veedor cerró la
  libreta"). **La salida del pozo existe como evento, y se puede perder.**
- **La Supercopa** (por haber ganado la Copa): "EL SAQUE RÁPIDO · LOS ALCANZAPELOTAS — Van 1-1 y la pelota se fue
  afuera": el trile, 4 camisetas, seguí cuál tiene la pelota. Acerté → "¡La seguiste perfecto!" → "¡CAMPEÓN! LA
  SUPERCOPA ES TUYA". Diario "ACÁ LA PONE ÉL — 11 goles".
- 26: carta con costo: "INVIERNO DE PESAS — te pusiste enorme, el pique ya no es lo que era: +4 Gambeta −2
  Velocidad". Año sin evento: 2 clics.
- 27: **"EL ASCENSO · EL CÓDIGO"**: el DT canta la jugada en 5 dígitos; memorizala y marcala en el teclado. **Tres
  señas, cada una visible menos tiempo (2 s → 1,3 s → 0,8 s); "errar UNA sola te mata la jugada"**. Entre una y otra:
  "¡La cantaste! El rival ya sospecha: la próxima va más rápido." **La tensión sube dentro del minijuego.** Las tres
  perfectas → "el gol del ascenso llegó de pizarra: Liga Argentina te espera".
- Diario: **"¡ASCENSO! … Sufriste el descenso y lo devolviste a Primera, donde tiene que estar."** (el juego se acuerda
  del descenso que causé yo a los 21) + "¡AHORA SOS ÍDOLO ⭐!": **amor 38 → 76 de golpe** (Querido → Ídolo →
  Leyenda 95), Gloria +86k. Un arco de 6 años (descenso → lealtad → ascenso → Ídolo) que nadie escribió entero:
  salió de tres sistemas (descenso, renovaciones, minijuego del ascenso) contados por el diario.
- 28, mercado en Primera: **el dilema de verdad**: RENOVACIÓN 88K "te faltan 20 para ser Leyenda 🗿" contra
  BOMBAZO Valencia 608K, Al Wasl 492K, Huracán 383K… todas "VAS A JUGAR MENOS QUE AHORA · −8 de idolatría · allá
  arrancás Uno más (20/100)". Me fui a Valencia.
- **El Mundial 2038 apenas firmé** (convocado): "LA SEÑA DEL DT" = Simón dice en una grilla 4×4. "La clavás y ganás el
  partido (cada partido, más larga y más rápida). En grupos sumás puntos (necesitás 4); en eliminatorias un error te
  deja afuera: no hay empate ni penales." Barra GRUPOS→16AVOS→8VOS→CUARTOS→SEMI→FINAL, "Fecha 1/3 · 0 pts", **un solo
  "ver la seña de nuevo" por torneo**, cada resultado queda escrito en la celda que tocaste y en "EL CAMINO". Gané 3-1
  a Corea, perdí con Catar y Guatemala → **"SE TERMINÓ EL SUEÑO… El Mundial no perdona. A esperar cuatro años."**
  (Perdí por la ventana oculta: los toques no entran bien. No representativo.)
- Diario "ILUSIÓN ROTA — Argentina quedó en el camino en el Mundial" (el titular eligió el Mundial, no los 25 goles),
  "Tu torneo: 3 partidos y 1 gol", nominado al Puskás. "Vas a jugar menos" y jugué 42 partidos: la etiqueta no se
  cumplió.
- **La gala del Puskás**: "Tenés 6 clips, elegí 3. Tu editor averiguó dos cosas del jurado" (un clip "el presidente lo
  odia", otro "al jurado le encantó"). El sobre muestra 👏/😐 por clip; lo ganó un invento ("Gunnar «el Vikingo»
  Þórsson … aplaudiste de pie"). Un minijuego de deducción con información parcial.
- 29: Conference League con "LA JUGADA PERSONAL" (esquivar defensores en 3 carriles, 10 s). La "gané" sin jugar (la
  ventana oculta salteó el reloj). No representativo. Diario "UNA MÁQUINA DE GOL — 28 gritos", Balón de Oro nominado
  ("se lo llevó Agustín Figueroa, del Napoli").
- **30: el declive se ve**: Pegada 94▼, Velocidad 91▼, Gambeta 79▼ en rojo; valor 113M → 103M. Las cartas pasan a
  frenar la caída (+4 Resistencia). Mercado peor: Valencia renovación 1 año, Atalanta, Braga, Rennes, Crystal Palace,
  Köln ("vas a jugar MÁS" en los chicos, "allá arrancás Querido (34) — tu fama te precede"). Evento del fisco (⚠
  pelearla = pagás el doble y salís en los diarios).
- **Copa América** con la Selección: "LA JUGADA ENSAYADA · TA-TE-TI: hacé 4 en línea (vos ✖) antes que el rival (⭕)
  y sale el gol", 5×5. Por turnos: la jugué de verdad, armé 3 con las dos puntas libres y gané. "¡ARGENTINA, CAMPEÓN
  DE LA COPA AMÉRICA!"
- **La rueda de prensa**: 3 preguntas, 4 tonos (humilde, canchero, personalidad, formal), "leé la sala vos" (sin el
  asesor de prensa de la tienda no hay pista). Al final: "LO QUE BUSCABA: viene filoso, le cierra la HUMILDAD", la
  transcripción con la capciosa marcada, "ZAFASTE — leíste bien 2 de 3 · +1 Fama".
- **31: "VOLVÉ A CASA"**: entre Lazio 687K, Bologna, Ipswich… aparece Gimnasia "VOLVÉ A CASA · 44K · vas a jugar MÁS ·
  allá arrancás: **Referente (68/100)**" (era Ídolo 76, −8 al irme: **el amor se guarda por club y te espera**). Volví
  por 16 veces menos plata. Al firmar: Referente 73 → Ídolo 75.
- **La Finalissima** (Selección): "LA PIZARRA DEL DT": memotest de 16 cartas (8 jugadas ensayadas), máx. 5 errores.
  Ganada con 1 error: **"Finalissima para la vitrina, ganada de memoria y no de suerte."** (el juego te dice que
  fue habilidad).
- Diario: "Volviste a casa: Gimnasia de Mendoza te recibe con los brazos abiertos", "¡AHORA SOS ÍDOLO ⭐!".
- 32: Copa Argentina contra Boca (la barra de timing otra vez, **la zona verde ahora 21% contra 14% a los 24**: el
  stat se nota en el minijuego) y **el Mundial 2042 con otro minijuego**: "LA DEFINICIÓN AL LÍMITE — frená la barra en
  la zona verde y ganás el partido (cada partido va más rápida y la zona más chica)… en eliminatorias fallar por poco
  te manda a penales con una barra chica y endemoniada (una sola vez por torneo); fallar lejos te deja afuera."
  **8 partidos, zona 34% → 16%, velocidad 1196 → ~700 ms**. Australia 1-0, Canadá 3-0, Corea 2-1, Austria 3-0,
  Serbia 4-0, Alemania 3-2, Portugal 2-0, Francia 4-0 → **"¡CAMPEÓN DEL MUNDO! Argentina levantó la Copa y vos fuiste
  parte. Eterno."** (jugado perfecto por el método de las capturas: no mide la dificultad.)
- Diario "¡CAMPEONES DEL MUNDO! … Esto no se olvida más", Ídolo 88 → Leyenda en 95, Gloria +143k.
- **El Mundial 2046, tercer minijuego distinto para el mismo torneo**: "LA DEFINICIÓN AL ARQUERO" (el arquero se mueve
  por el arco, tocás 1 de 5 zonas; en eliminatorias, si te ataja, un penal único por torneo; desde semis el arquero
  amaga). Cabo Verde 3-1, Egipto 4-0, Túnez 2-1, Turquía 3-0, Escocia 2-1, **Alemania 1-1 ✗ en cuartos** → "SE
  TERMINÓ EL SUEÑO".
- 36: diario "¡LA COPA SE QUEDA EN CASA!" + "⬆️ ¡AHORA SOS LEYENDA 🗿!" → la ficha dice "LEYENDA 96/100 · **¡Tenés tu
  estatua en la puerta del estadio!**" (el último escalón tiene premio con nombre). "🔋 El físico ya no es el de
  antes: el DT te cuida y jugás menos minutos" (el declive se cuenta, no solo se ve en ▼).
- 37: las cartas toman el color del club ("ensayado **en la altura**", "referente en silencio **en la montaña**":
  Mendoza). El evento sigue al título del año anterior ("El micrófono del festejo": el cantante te pasa el micrófono)
  → elegí lo ⚠ ("cantás como un lavarropas") → ÚLTIMA HORA "🐓 El gallo del estribillo quedó grabado en 4K desde
  ochenta ángulos. Sos el remix del verano." **El castigo es un chiste, no una pérdida**: −0,7M de valor.
- Diario de los 37: **"EL RIVAL LE PASÓ EL TRAPO — Damián Ibarra metió 6 goles y este año le ganó la pulseada a
  Tomás Rivero. La bronca es buena consejera."** aunque gané la Supercopa ese año: el archirrival (inventado, "tu
  sombra desde los 16") se lleva el titular cuando te gana el año. La Gloria muestra el delta en la ficha (+36,6k).
- **"Retirarme"**: "¿COLGAR LOS BOTINES? … un retiro voluntario NO se sube al ranking y PERDÉS los títulos y logros
  de esta carrera". El juego empuja a jugar hasta el final natural. "Ver carrera" da vuelta la ficha: tabla por
  temporada (edad, club, división, PJ, G, A, nota).
- 38: mercado "A LA BAJA" Gimnasia 14K "Ya sos leyenda acá 🗿" contra dos TRAICIÓN a 27K (el doble) y un 25K. A los
  38 la traición sigue tentando con plata.
- **Copa América: el ta-te-ti terminó empatado → "¡SE LLENÓ LA PIZARRA! EMPATE… ALARGUE. TABLERO NUEVO. SACA EL
  OTRO."** Ni el empate se resuelve con una tirada: se juega otra vez, ahora empezando de atrás. Ganada en el
  alargue. Ese año también la Sudamericana (mano a mano). Diario con dos chips CAMPEÓN, Leyenda 100/100. Texto
  viejo que no se actualiza: "La estatua está cada vez más cerca" con la estatua ya ganada.
- 39: **tres finales en un año** (Finalissima con el trile, Recopa con ta-te-ti + alargue, Copa Argentina con mano a
  mano), las tres ganadas. 16 títulos. Al final de la carrera el juego regala finales (el defecto ya anotado: la
  inflación de finales).
- **El retiro llega solo a los 39, con escena**: "89' · TU ÚLTIMO PARTIDO · LA DESPEDIDA — El estadio de pie,
  pancartas con tu nombre, tus viejos en la platea. Minuto 89: tiro libre al borde del área." Dos opciones **con el
  premio a la vista**: "BUSCARLA CON COMBA · 🎲 ARRIESGADO · +6 Fama +10 Idolatría" / "DÁRSELA AL PIBE DE LA
  RESERVA · 🧊 SEGURO · +3 Fama +8 Idolatría" · "Cuanto más arriesgada la jugada, más gloria si sale. Vos sabrás."
  Fui por la comba: "SE FUE AFUERA. Pegó en la barrera, pero el estadio igual coreó tu nombre hasta el final… sale en
  andas de la cancha por última vez." **Hasta el fallo final es un buen recuerdo.**
- "¡LEYENDA! Gimnasia de Mendoza devela tu estatua en la puerta del estadio. Las próximas generaciones van a
  preguntar quién fuiste. Y les van a contar. **“EL HÉROE DE GIMNASIA DE MENDOZA”**" → VER MI PALMARÉS.
- **El palmarés** ("FIGURITA BRILLANTE · LEYENDA"): apodo, clase (🧠 HABILIDOSO), "te retiraste a los 39", MEDIA pico
  97, 1,05M de Gloria, 893 PJ / 213 G / 370 A / 16 títulos; **"TU HISTORIA, CLUB POR CLUB"**: cada etapa con su
  escalón de amor y su barra (All Boys Uno más 12, Gimnasia Leyenda 100 con ▼▲ por el descenso y el ascenso,
  Valencia Querido 33, Gimnasia otra vez Leyenda 100, Selección Ídolo 90), años, PJ/G/A y las copas de esa etapa;
  "Equipo de la temporada ×3"; copiar imagen; **💔 FINALES PERDIDAS 1** (2045, Finalissima contra Chequia);
  **PREMIOS DE ESTA CARRERA 32** (Matador de clásicos, El Mago, Eterno, El de la final, El Duelo Eterno "le ganaste
  la carrera a Damián Ibarra, tu sombra desde los 16", El de Hierro, Cruzó el charco, El hijo pródigo, Campeón del
  Mundo…); **⚔️ EL DUELO ETERNO** (vos contra Ibarra: 213-183 goles, 353-324 asistencias, 16-6 títulos);
  "Esta carrera no se guardó: entrá y la próxima cuenta"; compartir; otra carrera.
- **Tiempo total**: 24 temporadas. Sin minijuegos, una temporada son 2-4 clics; con minijuegos, 1-3 min. Los años con
  final son los que se recuerdan; los otros pasan en 15 s y no molestan.

### Notas crudas — Lolero, partida 1 (lolero.lol en vivo, wave F; LAS, Mid, Hambriento, Azir/Orianna/Ahri, RÁPIDO, seed 1025974653)

Método: `?previa=auditoria` (almacén en memoria: no toca la partida guardada del usuario). Años 15-20 en el Chrome
oculto (los momentos 3D lo congelan: 34 canvas); desde ahí la misma seed y las mismas decisiones en el Chromium de
Playwright con GPU (`--use-angle=d3d11`), que reprodujo la carrera idéntica. RÁPIDO como el usuario.

**Arranque (~10 clics).** Invocador, servidor ("la región es la dificultad"; LAS: "llegás hasta segunda; a primera se
llega emigrando"), perfil ("decide por vos lo chico; lo grande lo decidís vos"), rol y 3 mains. Sin clase/arquetipo
que te defina el clímax.

**La ficha (franja fija).** Nivel · Carrera (escalón "El que no llegó → Pasó por el circuito") · Hype (→ Figura 56) y,
ya en un equipo, Arraigo (Uno más → Querido 25) · Jerarquía (Rookie → Titular 36) · Selección/Mundial ("SIN CHANCE",
"EN CARPETA") · títulos · Ganado. A la derecha, en etapa amateur, Estudios/Sueño/Casa/Cabeza/Hype. **Los números
que mueven las cartas (Consistencia, Macro, Mecánica, Pool, Shotcalling, Adaptabilidad, Sinergia) no están en la
ficha**: la carta dice "Consistencia ~+8" y la ficha dice "Cabeza".

**Etapa amateur, 15-19 años (5 años, ~3 clics por año).**
- Cada año: "El plan del año" = 4-5 cartas con 5 barras y números (+541 LP, −7 estudios, −11 sueño, riesgo "en casa
  43%", ◆◆◇ INCIERTO, "TU PERFIL") → el año corre solo ("el juego frena únicamente si una semana te mete en un
  riesgo que otra opción evita") → 0-2 paradas → "Fin de año" (3 cartas RULETA, "resultado muy abierto") → diario.
- **El perfil decidió por mí ~5 eventos por año** ("COMO HAMBRIENTO → Decirles la verdad: el ranked va primero",
  confianza −10; ampliar el pool; el 1v1 de ego; la racha; el campeón nuevo; **"Te confiscaron la PC"**, "Jugás desde
  lo de un amigo", **"Se viene el examen que define el año"**). Son exactamente los "DECISIÓN DIFÍCIL/GOLPE DURO" que
  El Ídolo te pone delante, y acá quedan en un cajón ("Mientras tanto · 13 cosas pasaron", tecla L).
- Diario: "EL PARCHE QUE TE MATÓ EL AHRI", después **"UN AÑO MÁS EN LA GRIETA" tres años seguidos** y "El parche te
  dejó sin Ahri" repetido 5 años. La PC confiscada no fue titular. Puntaje 0 cuatro años.
- Mensajes que se contradicen: "¡SOS UNA ESTRELLA!" (hype) siendo "El que no llegó" sin equipo; "Otro año y el
  teléfono no sonó… ni un scout te escribió" justo después de "ahora hay tres personas que preguntan por vos";
  "El viaje que te cambió la carrera: el día que dejaste tu país" sin haber salido nunca de LAS.
- 19: "RETIRO · ¿seguís?" antes de haber tenido equipo. Seguí. **Primer equipo a los 19** (Rasgo Collective, tier 3)
  vía "La prueba de ingreso": un aim de 5 blancos de 900 ms, la vara era 5%. La firma (escudo, camiseta, número) es
  hermosa. En El Ídolo estás en un club desde el minuto uno.

**Etapa pro, 20-27 años.**
- 2030 tier 3: firmé en playoffs; el año se cerró sin un partido. Rasgo salió 1.º de 6 en "un torneo chico" y me
  enteré en el cajón (sin parada, sin copa, títulos 0).
- 2031: salto a LRS → Cenit me ficha "para lo que queda del año" → **primera parada: la final de LRS**, Bo5 Fearless,
  4 planes con **84-86%** ("Guardar a Ahri para el mapa decisivo" 86%) → un clic → 3-0 → "CAMPEONES" con la copa 3D.
  El título más importante de la carrera se ganó con un clic que movía ±1%, en un equipo al que llegué la semana
  anterior. Diario "CAMPEONES DE LA LRS" + "TU CARRERA SUBE UN ESCALÓN «PASÓ POR EL CIRCUITO»" (bien).
- Mercado 2032 (ventana de 14 días, ofertas que llegan): Fluxo w7m USD 511k "te puede pagar hasta $348k" (la oferta
  supera su propio techo), LOUD 144k, Los Grandes, Leviatán (CBLOL) y dos de LRS. Cada oferta: sueldo, años,
  "jerarquía proyectada", puesto del plantel. **No dice cuánto arraigo perdés ni con cuánto arrancás, no hay
  traición ni "volvé a casa"**. Después de firmar, otra "prueba de ingreso" (el mismo aim).
- 2032 Fluxo (CBLOL): la temporada regular corrió sola (1-6) y las **únicas 2 paradas del año** fueron dos Bo1 al
  cierre: "El flanco que solo viste vos" (39% "así como llegan"; elegí ir solo y bajó a **31%: no se ve antes de
  elegir**) y "TODO O NADA" (21%→24%). Perdí las dos: 7.º y 8.º de 8. Diario "WORLDS, POR TWITCH". Hype −30.
- 2033 LOUD: 4 paradas buenas: "Abajo, pero no afuera vs Fluxo, tu ex equipo"; "La ventana del plan es ahora" (36%
  → **63%** al llamar la jugada: acá la elección sí pesó, pero tampoco se veía antes); **"Mapa 5 · 2-2: que hable el
  coach ahora 82% / guardar la charla 71% — es la única de la temporada"** (un recurso por temporada: lo más El
  Ídolo de Lolero); semifinal Bo5 "el plan de Fearless" 51-56%, perdida 1-3 mapa por mapa (se ve muy bien). Diario
  otra vez "WORLDS, POR TWITCH".
- 2034 LOUD 3.º (en piloto automático). **2035-2038: agente libre cuatro pretemporadas seguidas con nivel 69-75**
  ("El mercado ya habló": solo "Seguís buscando" o "Colgás el mouse"; sin ofertas de LRS ni de nada). Tres años
  muertos con eventos de cuerpo y cabeza ("Se te hizo trabajo", "La cabeza en rojo — mentalidad 17").
- **Retiro a los 27**: "¿Volvés a competir? ~9% de que te llame alguien" → "EL TELÉFONO DEJÓ DE SONAR".
- **La tarjeta final**: puntaje 64 "FIJO EN PRIMERA · mejor que el 28%", "siguiente escalón: Campeón — te faltó un
  título de liga de primera", **"de dónde sale el número"** (trayectoria +48, títulos +5, internacionales 0, el
  mundo 0, tu generación 0, soloQ +4, **"tu potencial, revelado: era 61, oculto hasta hoy" ×1,12**), "se parece a
  la de… Picapiedra", apodo "EL NÓMADE QUE NUNCA ECHÓ RAÍCES", org por org (todas "UNO MÁS", 9-22 de arraigo),
  "EL DUELO ETERNO: se lo llevó Grutas" (1-2 títulos, pico 75-88). Es una auditoría de la carrera; no hay
  ceremonia, ni último partido, ni estatua, ni premios.
- **Cuenta de la carrera**: 12 años, ~40 clics de decisión, **8 partidos donde elegí algo** (ninguno se juega con las
  manos: todos son 2-4 opciones y una tirada), 1 título, 0 internacionales, 4 años sin equipo.

**Lolero, partida 1b (EMEA, Profesional, seed al azar, piloto automático salvo mercado e internacional)** — para ver
la parte alta que LAS no mostró.
- Prodigio: nivel 57 a los 15, Máster 811 LP a los 16, tier 3 a los 16. Mercado a los 17: seis ofertas, **ninguna de
  la LEC** (todas import: LCS, LCP, CBLOL). RED Canids (CBLOL, 4.º, jerarquía 41).
- **La final de CBLOL 2028**: plan de Fearless 27%, 2-2, "que hable el coach ahora" 57%, y en el mapa 5 **"O combo do
  CBLOL"** (minijuego: memorizar 5 teclas QWER y repetirlas; la mecánica alarga la ventana). Lo hice 5/5 → "TU
  CHANCE EN EL MAPA 72% CON LO DEL MINIJUEGO" → **y después una tirada al 72%** (ganada, 3-2). El minijuego
  perfecto deja 28% de perder: W7 sigue abierta.
- **Worlds 2028 (la ola F)**: pantalla de stream con canales en vivo, chat, tablero suizo con los 8 cruces, "a
  cuartos/afuera", y la tarjeta de predicción. **Cada ronda tiene una sola opción, "A jugarlo"** (42%, 7%, 57%, 9%),
  "apuntá una opción: tu chance cambia con cada una" con una sola opción, y "la charla del coach se guarda para el
  2-2 o el bracket". 0-1, 0-2, 1-2, 1-3: afuera. Se ve como un Mundial; se juega como cuatro tiradas.

### Notas crudas — El Ídolo, partida 2 (Carrera del día: Juventud Esquipulteca, enganche francés, clase CABULERO)

Jugada en el Chromium con GPU, en piloto automático salvo finales (eventos: la opción sin ⚠; cartas: la primera;
mercados: la renovación). La pregunta era **cómo hace El Ídolo para que la suerte se sienta juego**, porque las
finales de Lolero son suerte.

- **"Carrera del día"**: equipo, puesto y nacionalidad fijos para todos, con **objetivos con monedas** ("Terminá la
  carrera" 5, "Hacé 490 goles" 10, "Ganá 28 títulos" 15) y "tenés otra chance" al final.
- La clase: **"🎲 CABULERO — El Ídolo de siempre: las finales se definen a pura suerte y cábala."** El Ídolo
  original era todo suerte; el Habilidoso se agregó después.
- Al arrancar, un evento raro con promesa a plazo: **"🌟 NACIÓ UN PIBE MARAVILLA… Si la rompés estas dos
  temporadas, los grandes de tu país van a venir a buscarte juntos."** Dos años después se cumple: "🌟 LOS GRANDES
  DE TU PAÍS TE QUIEREN — llamaron la misma semana. Directo desde la B a un grande." El juego planta y cosecha.
- Mercado: el francés arranca "Querido (36)" en los clubes franceses: la nacionalidad pesa en el amor inicial.
- **Las finales de un Cabulero, todas de suerte y ninguna invisible:**
  - **La Generala** (Oro Olímpico): 5 dados, guardás los que querés, 3 tiradas; escalera/full/póker/generala = campeón.
    Saqué 6-6-6, guardé, "¡PÓKER! ¡CAMPEONES!".
  - **La corazonada** (Eurocopa): 3 pares de botines, "uno trae el gol"; elegís, el utilero da vuelta uno "mufado" y
    pregunta "¿te quedás o cambiás?" = **Monty Hall**: cambiar da 2/3. "Cambiaste a tiempo: ahí estaba el gol. Ojo de
    bicho."
  - **La ruleta del potrero** (Nations League): "mantené apretado para cargar fuerza y soltá — más vueltas. Lo demás
    ya está escrito." Rueda GOL/PALO/ATAJÓ/AFUERA girando a la vista.
  - **La timba** (Copa del Rey): cartas del 1 al 12 sin repetir, ¿mayor o menor? tres veces (se puede contar cartas).
    Perdida: "La carta vino cruzada… la próxima timba es tuya."
  - **La pelota loca** (Conference): elegís el carril y la pelota baja rebotando entre piernas (un plinko). Perdida:
    "Justo ahí había uno parado. Media cancha de piernas y fue a dar a la única que no era."
  - **El fierrazo** (Copa del Rey): mantener apretado y soltar; la ventana es secreta y te la dicen después: "Soltaste
    al 1.1s… la noche pedía entre 1.8s y 2.4s. Hoy no estaba. TAN CERCA…".
  - **El Mundial del Cabulero**: "elegí una celda tapada: el marcador que salga es tu partido" (25 celdas, la grilla
    queda escrita), más **"📣 Arenga del capitán: necesitás +75 de Liderazgo · una por torneo · no vale en la final"**.
    En el Mundial siguiente el formato cambió a elegir la jugada (pelotazo, por la banda, córner, tiro libre, pared,
    contragolpe). Afuera en cuartos el primero; **campeón del mundo** el segundo.
  - **En resumen, la suerte de El Ídolo siempre es un gesto tuyo con el azar a la vista**: un dado que guardás, una
    carta que cantás, un botín que cambiás, una rueda que cargás, una celda que destapás. Nunca es "apretá y
    esperá un número". Y el resultado se cuenta con una línea específica y graciosa, sobre todo cuando perdés.
- La decisión de seguir tiene consecuencias de carrera: tomé "La oferta del jeque" (US$ 6M/mes) → al año
  siguiente el diario dice **"LA EUROCOPA, POR TV — se jugó sin Alan Villalba. La espina más grande de su
  carrera."** (irte a Arabia te sacó de la Selección).
- Otros eventos: "Guerra de botines", "El amigo que se mandó una", "La cábala" (la remera gastada), "Problemas con
  tu representante" (si lo echás, "esta ventana no habrá ofertas grandes"), **"Se apareció en el entrenamiento: el
  pibe del suburbio"**, "Rotura de ligamentos → SE ROMPIÓ TODO: el fútbol sabe esperar a los que vuelven".
- **El retiro también es una decisión con drama**: a los 37, "EL ÚLTIMO BAILE — Hull City te ofrece la 10 hasta que
  el cuerpo aguante… Nadie te lo va a reprochar si decís que no": "Colgar los botines — retirate con la frente alta"
  / "Jugar hasta que el cuerpo aguante ⚠️ podés terminar en camilla… o eterno". Después la misma despedida del 89'.
- Final: **"FIGURITA DORADA · ÍDOLO"** (la partida 1 fue "BRILLANTE · LEYENDA": el tipo de figurita sale del escalón
  más alto), "EL MEJOR DEL PLANETA DE REAL BETIS", "tu bandera cuelga en la popular", 1018 PJ / 369 G / 11 títulos,
  club por club con su escalón, **9 finales perdidas**, 34 premios, Balón de Oro.
- 22 temporadas en ~25 min de piloto automático: El Ídolo también se puede "pasar rápido"; los minutos los ponen las
  finales.


## Apéndice 2. Método y límites

- **La ventana oculta.** El Chrome del usuario marca la ventana como oculta cuando queda tapada (`visibilityState`
  hidden). Con eso no corre `requestAnimationFrame` y los momentos 3D de Lolero (34 canvas) congelan las capturas.
  - Los años 15-20 de Lolero 1 se jugaron ahí.
  - Desde ese punto se reprodujo la carrera con la misma seed y las mismas decisiones en el Chromium de Playwright con
    GPU (`--use-angle=d3d11`), manejado por un servidor de control local. Salió idéntica: el determinismo funcionó.
  - El Ídolo 2 se jugó entero en ese Chromium.
- **Los minijuegos no miden dificultad.**
  - En El Ídolo 1 las barras se frenaron leyendo su posición entre capturas, o sea que se jugaron perfecto.
  - Dos quedaron arruinados por la ventana oculta y no son representativos: la seña del Mundial 2038 y la jugada
    personal.
  - En Lolero, la prueba de ingreso y el combo se jugaron por script.
  - Lo que se mide es **cómo se juega**, no cuánto cuesta ganar.
- **El piloto automático.**
  - El Ídolo 2 y Lolero 1b se jugaron en piloto automático salvo lo que interesaba medir: las finales en El Ídolo 2; el
    mercado y el Mundial en Lolero 1b.
  - Lolero 1 se jugó decidiendo de verdad hasta el retiro. La excepción: en el tramo de agente libre, el piloto eligió
    "Seguís buscando", y eso alargó los años sin equipo. Aun así, en cuatro pretemporadas no hubo **ninguna** oferta
    para rechazar.
- **La partida del usuario.** Se jugó en lolero.lol con `?previa=auditoria`, que guarda en memoria:
  `lolcs-carrera-guardada` no se tocó.
