# Progreso

Documento vivo. Se actualiza al cierre de cada tarea, según la Definición de terminado de CLAUDE.md.

## Estado por fase (DISENO.md §6 "Orden de construcción")

| # | Fase | Estado |
|---|---|---|
| 1 | Andamiaje (state, rng, pipeline, guards, validate) | ✅ Completa |
| 2 | Jugador inicial, etapa amateur y loop de splits | ✅ Completa (ver changelog 2026-08-06 — Paso 2) |
| 3 | Atributos, rendimiento y progresión básica | 🔶 Parcial — `attributes.js` existe pero no está enganchado en `ETAPAS_SPLIT`; falta `performance.js` |
| 4 | Champion pool, meta y ajuste al meta | 🔶 Parcial — `meta.js` mueve pesos por patch; no existe `champions.js` |
| 5 | Práctica dirigida entre splits | ⬜ Pendiente |
| 6 | Motor de eventos y validación | ✅ Completa (adelantada — ver changelog 2026-08-06). Las opciones ya son decisiones jugables reales en `index.html`, no auto-resueltas. |
| 7 | Roster, sinergia y jerarquía | ⬜ Pendiente |
| 8 | Contratos, regiones y movilidad | ⬜ Pendiente |
| 9 | Rivales de generación y scoring final | ⬜ Pendiente |
| 10 | Simulación masiva y balance fino | 🔶 Base lista (`simulate.js` con N corridas); falta usarla para tunear balance |
| 11 | Refinamiento visual | ⬜ Pendiente — no existe `src/ui/` |

## Changelog

### 2026-08-07 — Paso 5: champion pool vivo y Ajuste al Meta real

`AUDITORIA.md`: *"el Ajuste al Meta de `CONCEPTO` §6 no existe. En su lugar, `pipeline.js:148`
usa el peso de un solo tag arbitrario (`early_game`) como proxy del meta entero. Los `tags` del
campeón nunca se cruzan con los pesos del meta. **Ni siquiera comparten vocabulario**."

- **`src/core/ajusteMeta.js`** (nuevo): el Ajuste al Meta de verdad. Cruza los tags de cada
  campeón del pool contra el vector de pesos, **ponderando por maestría** (un campeón que el meta
  pide pero que no dominás no te salva el split), y devuelve un número de 0 a 100 **con desglose
  por campeón**. `multiplicadorDeMeta` lo convierte en el 0.75x–1.25x que pide `CONCEPTO` §6.
- **`src/systems/campeones.js`** (nuevo): el pool está vivo. El campeón que terminás jugando se
  elige por maestría (sesgada, para que la especialización sea posible) cruzada con la afinidad
  al meta; **jugar afila con rendimientos decrecientes y no jugar oxida**. Sin ese oxidado se
  podrían mantener diez campeones a punto y el pool dejaría de ser una elección. La **signature**
  emerge sola cuando un campeón junta maestría ≥85 y ≥12 partidas.
- **`src/systems/meta.js`**: además de la deriva calma de cada parche, ahora existe el
  **sacudón** (7% por split): el meta se da vuelta entero y deja obsoleto medio pool. Es el
  mecanismo que `CONCEPTO` §7 describe como capaz de costarte un año de carrera.
- **El orden del split ahora es el de `CONCEPTO` §5**: llega el parche → se recalcula el ajuste →
  se juega → caen los eventos → se mueven los atributos → cierra la temporada.
- **El ajuste está conectado al rendimiento**: en la etapa amateur multiplica el LP por bloque, y
  queda listo para `performance.js`. Jugar lo que el meta pide rinde hasta 1.7x más que jugar
  contra el meta.
- **`validate.js`**: check nuevo que corre 720 splits y exige que el ajuste tome valores variados
  y que se aleje del neutro en las dos direcciones. **Existe por el bug real que encontró la
  auditoría**: si el pool y el meta vuelven a hablar idiomas distintos, el ajuste sería siempre
  50 y nadie se enteraría.
- Medido sobre 600 carreras × 30 splits: **ajuste al meta 26-88** (neutro 50, promedio 51.6),
  maestría máxima 44-96, **signature en 20.5% de las carreras** — rara y ganada.

### 2026-08-07 — Paso 4: atributos con forma de carrera, declive, rachas y economía de la mentalidad

`AUDITORIA.md` medía `mecanica` en **99.9/100 de promedio** a los 30 splits: sólo subía, con un
`Math.max(1, ...)` que garantizaba +1 por split para siempre. No había pico, ni meseta, ni
declive, ni rachas. Y la mentalidad, que `CONCEPTO` §3 define como "la moneda con la que pagás",
**se reponía gratis todos los splits** y en cero no pasaba nada.

- **`src/core/curvas.js`** (nuevo): la forma de carrera, en una función. La comparten la
  generación del mundo y el sistema de atributos, así no se contradicen. El nivel objetivo sube
  hacia **la edad de pico propia de cada jugador** (sorteada, no fija) y después cae con la
  intensidad de su forma (`precoz`, `estandar`, `meseta_larga`, `tardia`, `erratica`).
- **`src/systems/atributos.js`** (nuevo, reemplaza a `progresion.js`):
  - `mecanica`, `laneo` y `teamfight` **convergen** hacia su curva en vez de saltar: el declive
    nunca se anuncia, se nota recién cuando ya lleva un par de splits pasando.
  - `macro` **no declina nunca** (es lo que sostiene a los veteranos); `shotcalling` y
    `adaptabilidad` acumulan con rendimientos decrecientes contra el techo.
  - **`teamfight`, `laneo` y `shotcalling` dejaron de ser stats muertos**: los tres se movían
    cero en todo el repo.
  - **Rachas y slumps**: la `forma` oculta deriva con memoria (`formaPersistencia`), así una
    racha dura varios splits en vez de titilar. No se le explica nunca al jugador.
  - **La mentalidad ya cuesta**: se desgasta todos los splits, más si dormís poco o arrastrás
    deuda de sueño. El único descuento es dormir de verdad: por encima del descanso normal el
    balance se da vuelta. Esa es la razón mecánica para gastar bloques en dormir en vez de en LP.
  - **Burnout**: por debajo del umbral la probabilidad crece hasta volverse segura. Es una curva,
    no un acantilado.
- **Los stats iniciales salen de la curva**, no de una constante: un `precoz` arranca fuerte a
  los 15 y un `tardio` arranca flojo. Antes todos empezaban en 55 de mecánica sin importar el
  potencial que les tocara.
- **Fix de raíz encontrado midiendo**: en fase profesional `sleep` quedaba **congelado para
  siempre** en el valor con el que saliste de amateur, así que un fichaje con el sueño bajo
  condenaba la carrera entera. Ahora, fuera de la etapa amateur, el descanso vuelve solo hacia lo
  normal (hay horarios y gaming house) y la moneda pasa a ser sólo la mentalidad.
- `validate.js`: el check de balance ahora verifica invariantes de diseño, no rangos sueltos —
  entre otras, que **`macro.permiteBajar` sea `false`** (`CONCEPTO` §6) y que
  `formaPersistencia < 1` (con 1 una racha sería eterna).

**Balance medido** (1500 carreras por estrategia). La etapa amateur quedó calibrada y la trampa
del sueño ahora tiene precio:

| etapa amateur (11 splits) | llega a pro | no llegó | prohibición | burnout |
|---|---|---|---|---|
| equilibrado | 57.8% | 40.5% | 1.5% | 0.3% |
| ranked | 3.5% | 0% | 10.4% | **86.1%** |
| prudente | 58.6% | 41.3% | 0% | 0.1% |

Robarle 3 horas al sueño todas las semanas durante tres años funde al 86%: es exactamente lo que
`CONCEPTO` §4 llama "la trampa". `mecanica` pasó de 99.9/100 de promedio a **65.5**, con rango
real 22-100 según el potencial y la forma que te tocaron.

- **Pendiente conocido**: en carrera completa (45 splits) el burnout se lleva ~55% de las
  carreras, porque **la etapa profesional todavía no tiene ninguna forma de recuperar
  mentalidad**. Eso llega en el paso 6 con los puntos de preparación y la opción de descansar
  entre splits. No se tunea antes: bajar el desgaste ahora sería tapar el agujero equivocado.

### 2026-08-07 — Paso 3: la etapa amateur de verdad (bucle de atención, bandas de riesgo, tres salidas)

`AUDITORIA.md` marcaba que `amateur.js` decidía éxito y fracaso pero **no implementaba el bucle
central del juego**: el jugador no repartía nada, los estudios iban al revés (subían), la
confianza familiar estaba desacoplada, y de las tres salidas de `CONCEPTO` §4 existía una sola,
como umbral duro. Este paso construye la etapa entera.

- **El bucle de atención** (`CONCEPTO` §3): **10 bloques de tiempo por periodo** repartidos entre
  rankeds, estudiar, dormir y familia, más **hasta 3 bloques robados al sueño**. Es la primera
  decisión que no es un evento: se agregó el tipo de decisión `reparto` y la UI ganó un panel con
  steppers por destino que no deja cerrar la semana con bloques sin asignar.
- **Robarle al sueño es la trampa**: el costo en mentalidad es **acumulativo** — dos periodos
  seguidos y el segundo pesa más (`penalRoboConsecutivo`); a los 3 entrás en **deuda de sueño**,
  que te baja el LP por bloque hasta un 50%.
- **Los estudios ahora decaen solos** cada periodo, escalados por la `exigenciaColegio` que te
  tocó de cuna, y **la confianza familiar quedó acoplada a los estudios** (cae más rápido cuanto
  más lejos estés del umbral). Las dos contradicciones 1 y 2 del apéndice de `AUDITORIA.md`.
- **Bandas de riesgo en vez de escalones** (contradicción 3): tres curvas de probabilidad
  —aviso, confiscación de la PC, corte definitivo— que crecen a medida que los estudios bajan,
  multiplicadas por lo estrictos que salieron los viejos y por la confianza que queda. **No hay
  un número exacto donde pincha**: se puede zafar con la barra por el piso y se puede pinchar con
  la barra a medias. La confiscación te hace **perder el periodo entero**.
- **Las tres salidas** (contradicción 4): fichaje por scouting (probabilidad creciente por LP y
  hype, con la org sorteada de tu liga y sesgada a que las más fuertes no se fijen en soloQ),
  **negociación con los viejos al llegar a Máster** (los stats corren los pesos, no los eliminan:
  puede salir mal), y **pasarte a nocturno** (2 bloques más por periodo y el colegio deja de
  pesar, a cambio de confianza familiar).
- **`src/systems/secundario.js`** (nuevo, contradicción 5): a los 18 —o al firmar, lo que pase
  primero— la barra de estudios **se congela en un flag permanente** (`terminado` / `lo_dejo`)
  que acompaña el resto de la carrera. Va **antes** de `amateur` en el registro a propósito: si
  la carrera se corta en ese mismo split, el flag ya quedó congelado y entra en la tarjeta final.
- **Escalera de soloQ por LP** (`BALANCE.rangos` + `rangoDeElo`), sin series de promoción.
- **Decisiones normalizadas**: toda decisión —evento o sistema— se presenta igual (`titulo`,
  `descripcion`, `opciones` o `reparto`), así la UI tiene un solo camino de render.
- **`src/dev/estrategias.js`** (nuevo) + `avanzarSplitAuto(state, rng, responder)`: la simulación
  masiva ahora corre **tres formas de jugar** sobre el mismo pipeline del navegador —
  `equilibrado` (reacciona a las barras en rojo), `ranked` (todo al LP) y `prudente` (cuida el
  colegio). Medir una sola forma de jugar no dice nada del balance.

**Balance medido** (1500 carreras × 11 splits por estrategia). La tensión que pide `CONCEPTO` §7
existe y se puede ver:

| | llega a pro | prohibición familiar | no llegó | dejó el secundario |
|---|---|---|---|---|
| equilibrado | 48.5% | 1.9% | 49.7% | 6.9% |
| ranked | 56.3% | **17.5%** | 26.1% | **47.7%** |
| prudente | 54.9% | 0% | 45.1% | 0% |

El que se juega todo al ranked llega antes (split 3.5 vs 4.6 de promedio) y con más LP, pero uno
de cada seis pierde la PC y la mitad deja el colegio. El prudente nunca pierde la PC y siempre se
recibe, pero casi la mitad se queda sin que lo llamen.

- Verificado: `validate.js` pasa los 10 checks; determinismo confirmado; traza del camino
  interactivo (seed 3) de punta a punta con reparto, robo al sueño, aviso del colegio y final
  `no_llego` con el secundario congelado en `terminado`.
- **Pendiente conocido**: la mentalidad todavía llega a 0 sin consecuencia (`CONCEPTO` §3 dice que
  es el fin de la carrera) y `progresion.js` la repone gratis todos los splits. Se arregla en el
  paso 4, junto con las formas de carrera. La tasa global de fracaso amateur (~45-50%) se
  recalibra en el paso 10, cuando exista el arco completo: tunearla ahora, sin etapa profesional
  ni tarjeta de legado, sería prematuro.

### 2026-08-07 — Paso 2: el mundo se genera desde la seed

Cierra el hueco más grande que marcaba `AUDITORIA.md`: `createInitialState` era una constante
salvo por la seed, así que **dos seeds distintas arrancaban el mismo mundo idéntico**. Esa es
la capa sobre la que `CONCEPTO` §8 apoya toda la rejugabilidad.

- **`src/core/mundo.js`** (nuevo): `generarMundo(rng)` sortea de la seed el **rol** (antes fijo
  en `'mid'` y decorativo), la **liga y región de origen**, el **handle** del jugador (inventado
  por sílabas), la **dispersión de los stats iniciales**, el **pool inicial de 3 campeones** del
  rol que te tocó, el **sorteo de cuna** (`exigenciaColegio`, `toleranciaViejos`,
  `apoyoEconomico`), lo **oculto** (`potencial`, `formaCarrera`, `edadPico` propia, `forma` para
  rachas), el **vector de meta inicial**, la **fuerza de cada org** orbitando el prestigio de su
  liga, la **región dominante** de la generación y los **5 rivales de generación**.
- **`createInitialState(seed, rng)`**: el `rng` ahora se inyecta también acá, a propósito. La
  generación del mundo consume del **mismo stream** que después consume el pipeline, así una
  seed reproduce la partida entera y no solo la mitad.
- **Datos nuevos** (los tres que `DISENO` §4.1 pedía y no existían): `src/data/champions.json`
  (50 campeones, 10 por rol, con tags de arquetipo), `src/data/leagues.json` (8 ligas reales con
  prestigio, cupo de imports, dificultad de adaptación y orgs) y `src/data/meta-tags.js` (los
  arquetipos, que estaban hardcodeados como objeto literal en `state.js`). Se sumó `enchanter`
  a los arquetipos, que `CONCEPTO` §6 nombra y faltaba, y `src/data/roles.js` con los pesos de
  atributos y la visibilidad de cada rol (`DISENO` §3.2).
- `src/core/rng.js`: `pick` y `sample` (sorteo sin reposición), reusados por la generación.
- **`src/dev/validate.js`**: 2 checks nuevos. Uno verifica que **cada tag de campeón exista en
  `ARQUETIPOS`** — si el pool y el meta no hablan el mismo vocabulario, el Ajuste al Meta sería
  siempre 0 y nadie se enteraría (era exactamente el bug que tenía el repo) — que los pesos de
  cada rol sumen 1 y que cada liga sea coherente. El otro corre 60 seeds y exige que produzcan
  mundos distintos y que aparezcan los 5 roles.
- Medido sobre 2000 seeds: roles 386-425 cada uno (uniforme), ligas 227-282, formas de carrera
  en la proporción de sus pesos (`estandar` 38%, `erratica` 9%), potencial promedio 62.2 con
  rango completo 30-100.
- Verificado: `validate.js` pasa los 10 checks; `simulate.js 1000 30` da 0 crashes;
  determinismo confirmado.

### 2026-08-07 — Paso 1: cimientos (pipeline unificado, estado único, registro de sistemas)

Punto de partida: `AUDITORIA.md` del 2026-08-07, que encontró violaciones a las reglas
invariables 3, 5, 6, 7 y 9. Este paso las cierra todas y desbloquea el resto del roadmap:
sin una sola fuente de verdad para el avance del split, cada sistema nuevo duplicaba la deuda.

- **`src/systems/registro.js`** (nuevo): `ETAPAS_SPLIT` pasa de ser una lista de strings
  despachada por una cadena de `if/else` a un registro declarativo de módulos. Agregar un
  sistema es ahora, literalmente, un archivo nuevo y **una línea** (regla 6). El pipeline no
  conoce ningún sistema por nombre.
- **`src/core/pipeline.js`** reescrito. **Los dos caminos divergentes (headless e interactivo)
  desaparecen: ahora hay uno solo.** Un sistema puede devolver `decision` desde `aplicar` y el
  pipeline congela el split ahí, guardando el cursor en `state.pendiente`. `resolverDecision`
  lo reanuda desde la etapa siguiente. `avanzarSplitAuto` es el mismo camino con las decisiones
  contestadas por el propio sistema (`resolverAuto`), así que **`simulate.js` y `validate.js`
  miden exactamente lo que se juega en el navegador** (regla 5).
- **Regla 9 cerrada**: `logsAcumulados` y `pendingDecision` ya no viven en variables de módulo
  de `index.html`. Todo está en `state.pendiente` y `state.logs`, así que una partida a medio
  split es serializable y reanudable. Efecto secundario: se arregló el panel de logs, que iba
  un split atrasado.
- **`src/systems/progresion.js`** (nuevo): `aplicarSplitBase` deja de ser una función privada
  escondida adentro de `core` y pasa a ser un sistema de verdad. Se borró
  `src/systems/attributes.js`, que era huérfano (nunca corría) y hacía lo mismo peor; el
  sistema de atributos real (formas de carrera, potencial, declive) se construye en el paso 4.
- **Regla 3**: `src/core/numeros.js` (nuevo) centraliza `clamp`/`clampStat`; el techo `100`
  dejó de estar hardcodeado en 4 archivos. Los valores iniciales del jugador, los pesos
  iniciales del meta, los pisos de las gaussianas y el tope de carrera de la UI se movieron a
  `BALANCE`. `meta.baseWeight` (clave muerta) ahora se usa como `meta.pesoInicial`.
- **Regla 7**: los efectos `push` pasan de `value` fijo a `values: [...]` con sorteo por RNG
  (nombres de org y de hito variados). Se quitaron los rangos degenerados `min:1,max:1` de
  `player.titles`: los títulos son resultado de competir, no de un evento, y los va a otorgar
  `competicion.js` en el paso 6.
- **`src/dev/validate.js`**: de 5 checks a 8. Nuevos: contrato de los sistemas del registro,
  que ningún split deje una decisión colgada (50 seeds × 12 splits), y que dos seeds distintas
  produzcan carreras distintas. El check de esquema ahora **verifica que cada `path` de efecto
  y de condición exista de verdad en el estado** (antes un typo creaba una propiedad nueva en
  silencio), rechaza rangos degenerados y exige ≥2 outcomes por opción.
- **`index.html`**: adaptado al contrato nuevo y **la seed pasó a ser visible y elegible**
  (`CONCEPTO` §9 apoya toda la difusión del juego en compartir seeds; antes se generaba con
  `Date.now()` y no se mostraba).
- Verificado: `node src/dev/validate.js` pasa los 8 checks; `node src/dev/simulate.js 1000 30`
  da 0 crashes; determinismo confirmado; traza del camino interactivo (seed 7, clickeando
  siempre la primera opción) confirma el compás — 1-2 decisiones por split y cierre de edad
  cada 3 splits.
- **Deuda conocida, no tocada en este paso** (es el objetivo de los pasos 2-10): el balance
  sigue roto según el criterio de `CONCEPTO` §11 — `mecanica` promedia 99.9/100 y 98.6% de las
  carreras terminan igual. Se arregla cuando existan las formas de carrera (paso 4) y el ciclo
  profesional (paso 6).

### 2026-08-06 — Fix: los logs de evento no tenían relación con lo que pasó

- **Bug reportado por el usuario**: el log de cada evento mostraba siempre `título: descripción (elegiste "opción")` — el mismo texto fijo sin importar qué outcome se hubiera sorteado. Dos resultados completamente distintos de la misma opción (el bueno con weight alto, el malo con weight bajo) generaban exactamente la misma frase, porque el log nunca miraba los `effects` realmente aplicados.
- **`src/core/selectors.js`**: nuevo diccionario `etiquetaCampo(path)` (ej. `player.stats.hype` → "Hype") para poder describir cualquier path de efecto en texto legible, reusado por eventos y por el resumen de edad.
- **`src/systems/events.js`**: `aplicarEfecto` ahora devuelve también una `descripcion` del cambio efectivo (post-clamp, no el rango declarado). `resolverOpcion` arma el log a partir de esas descripciones reales (`"Meme de la prensa — Subirse a la ola: Hype +6, Mentalidad -3."`) en vez de repetir la descripción estática del evento.
- **`src/systems/edadCierre.js`**: el resumen de temporada ahora filtra los campos que no cambiaron (antes listaba los 7 siempre, en el mismo orden, aunque algunos quedaran en +0).
- Verificado: `npm run validate` sigue pasando los 6 checks; `simulate.js 1000` da exactamente los mismos agregados numéricos que antes (el fix es solo de texto, no toca balance); log detallado de una carrera confirma que dos disparos del mismo evento ("Meme de la prensa") ahora muestran texto distinto según el outcome real.

### 2026-08-06 — Compás de edad: 3 splits, 1-2 decisiones, cierre de temporada

- **CONCEPTO.md**: se documentó formalmente el compás que rige toda partida (sección nueva "El compás: edad, split y decisión" en §2, más un párrafo en §4): cada edad (año) dura 3 splits, cada split trae 1 o 2 decisiones y es en sí mismo un parche que mueve el meta suavemente, y el tercer split de cada edad cierra con el resumen de la temporada más una decisión más grande. Implementado primero en la etapa amateur; el resto de las etapas lo hereda cuando se construyan.
- **`src/systems/edadInicio.js`** (nuevo, agregado a `ETAPAS_SPLIT`): al primer split de cada edad, guarda una foto (`flags.edadSnapshot`) de los stats trackeados (soloQ LP, sueño, estudios, confianza familiar, mecánica, mentalidad, hype) para poder calcular el resumen al cierre.
- **`src/systems/edadCierre.js`** (nuevo, agregado a `ETAPAS_SPLIT`): en el split que cierra la edad (`splitCount % BALANCE.edad.splitsPorEdad === 0`), genera el log de resumen (diff contra la foto de `edadInicio`), suma 1 a `state.age` (antes quedaba muerto en 15 toda la partida — bug de arrastre, ahora se corrigió como efecto secundario) y dispara la decisión de cierre si hay alguna disponible para la fase actual.
- **`src/systems/events.js`**: `elegirEvento` ahora acepta excluir un id (para no repetir el mismo evento como segunda decisión del split); nuevo `elegirEventoCierre` (filtra por `cierreDeEdad: true`, separado del pool normal); nuevo `resolverEventoAutomatico` (extraído de `aplicar`, reusado por el camino headless y por `edadCierre.js`). `aplicar` (modo headless) ahora intenta una segunda decisión con probabilidad `BALANCE.edad.probSegundaDecision`.
- **`src/data/events/cierre_edad.json`** (nuevo, 2 eventos con `cierreDeEdad: true`, fase amateur): "Fin de temporada: balance" y "Revisión familiar de fin de año", registrados en `data/events/index.js`.
- **`src/data/balance.js`**: nueva sección `edad` (`splitsPorEdad: 3`, `probSegundaDecision: 0.4`); `meta.maxDelta` bajó de `0.25` a `0.15` para que el parche por split se sienta calmo, como pide el concepto.
- **`src/core/pipeline.js`**: `ETAPAS_SPLIT` pasó a `['aplicarInicioEdad', 'aplicarEtapaAmateur', 'aplicarMeta', 'aplicarEventos', 'aplicarSplitBase', 'aplicarCierreEdad']`. El camino interactivo (`avanzarSplitHastaDecision`/`resolverDecisionYContinuar`) se reescribió para poder pausar hasta 2 veces por split (decisión normal 1, decisión normal 2) más una tercera pausa opcional (decisión de cierre) antes de finalizar — `resolverDecisionYContinuar` ahora recibe el objeto `pendingDecision` completo (con `tipo`/`slot`) en vez del evento suelto, para saber cómo seguir.
- **`index.html`**: nueva stat-card "Edad"; `mostrarDecision`/`elegirOpcion` adaptados al nuevo contrato de `pendingDecision`.
- **Bug encontrado y corregido durante la prueba en navegador real**: `elegirOpcion` llamaba a `avanzar()` sin revisar si `resolverDecisionYContinuar` ya había devuelto una nueva `pendingDecision` (la segunda decisión del split o la de cierre) — la descartaba en silencio y arrancaba un split nuevo desde cero por encima, duplicando etapas de amateur/meta. Se arregló para que, si hay `pendingDecision`, se muestre directamente en vez de seguir avanzando. Encontrado clickeando la carrera real en Chrome headless (CDP crudo, perfil aislado), no solo con `simulate.js`.
- **`src/dev/validate.js`**: nuevo check de coherencia para `BALANCE.edad` (`splitsPorEdad` entero positivo, `probSegundaDecision` entre 0 y 1) y check de que exista al menos un evento con `cierreDeEdad: true`.
- Verificado: `npm run validate` pasa los 6 checks; determinismo confirmado (misma seed, mismo resultado); `node src/dev/simulate.js 1000` da 0 crashes (985/1000 llegan a profesional, 15 fracasan por familia); log detallado de una carrida de 9 splits confirma 1-2 decisiones por split, el resumen de temporada, la decisión de cierre, y `age` subiendo 15→16→17→18 en el momento justo. Probado además en navegador real (Chrome headless vía CDP, perfil aislado): 13 decisiones clickeadas de punta a punta, 0 errores de consola, comportamiento idéntico al headless tras el fix.

### 2026-08-06 — Decisiones jugables reales en el demo

- **Bug de diseño corregido**: el demo de `index.html` apretaba un botón y todo se resolvía solo, sin que el jugador eligiera nada — violaba la regla invariable #8 de CLAUDE.md y el eje central del proyecto ("decisiones estratégicas"). La causa era que `systems/events.js` ya tenía el modelo de opciones+outcomes ponderados (Fase 0) pero lo resolvía en modo automático por no existir todavía ninguna interfaz.
- `src/systems/events.js`: se separó `aplicar` (modo automático, sin cambios de comportamiento — lo siguen usando `simulate.js`/`validate.js`) en dos piezas reusables: `elegirEvento(state, rng)` (elige el evento candidato sin resolverlo) y `resolverOpcion(state, evento, opcionId, rng)` (aplica la opción que se le pasa).
- `src/core/pipeline.js`: dos funciones nuevas para avance interactivo, sin tocar `avanzarSplit`/`ETAPAS_SPLIT` (siguen siendo el camino headless): `avanzarSplitHastaDecision(state, rng)` corre etapa amateur + meta y, si hay un evento candidato, corta el split ahí y devuelve `pendingDecision` en vez de resolverlo; `resolverDecisionYContinuar(state, logsPendientes, evento, opcionId, rng)` aplica la opción elegida y termina el split.
- `index.html`: reescrito para jugarse split a split. Aparecen 3 stat-cards nuevas (Sueño, SoloQ LP, Fase) y un panel de decisión con el texto del evento y un botón por opción; el jugador elige y la carrera sigue hasta la próxima decisión o el desenlace final (fichaje/fracaso/sigue en amateur).
- **Probado en navegador real** (no sólo con Node): se levantó `server.js`, se lanzó Chrome headless en un perfil aislado (sin tocar la sesión de navegador del usuario) manejado por CDP crudo (no había `chromium-cli`/Playwright instalados), se clickeó "Comenzar carrera" y 4 decisiones seguidas. Confirmado: el panel muestra título/descripción/opciones reales de los datos, las stat-cards se actualizan entre decisiones, el botón principal se deshabilita mientras hay una decisión pendiente, y no hubo errores de consola. Screenshot confirma el render.
- `npm run validate` y `node src/dev/simulate.js 1000` dan exactamente los mismos resultados que antes de este cambio (el camino headless no se tocó).

### 2026-08-06 — Paso 2: éxito/fracaso de la etapa amateur + fix de carga

- **Fix**: `index.html` tiraba `Failed to fetch dynamically imported module` porque se estaba abriendo como `file://` en vez de servido por `server.js` (los navegadores bloquean `import()` dinámico sobre `file://`). El `catch` del demo ahora detecta `location.protocol === 'file:'` y explica cómo correrlo (`npm start` → `http://localhost:8000`) en vez de mostrar el error críptico.
- **Nuevo stat `player.sleep`** (`src/core/state.js`, inicial 75), pedido explícitamente por DISENO.md §3.4 ("barras de estudio, sueño, familia y progreso en soloQ") y ausente hasta ahora.
- **Nuevo sistema `src/systems/amateur.js`**, saca la lógica que vivía hardcodeada en `pipeline.js` (regla #6 de CLAUDE.md). Cada split en fase `'amateur'` mueve `soloqElo` (+), `sleep` (-), `studies` (+) y `familyTrust` (- por defecto, compensable vía eventos), y evalúa condición de salida:
  - **Éxito**: `soloqElo >= 1600` y `hype >= 55` → te ficha un equipo, `phase` pasa a `'profesional'`, se guarda `state.splitFichaje`.
  - **Fracaso** (fin de carrera legítimo, no error — DISENO §7 pide finales múltiples): `familyTrust <= 15` → `finAnticipado: 'fracaso_familia'`; `sleep <= 10` → `finAnticipado: 'fracaso_sueno'`. `phase` pasa a `'retirado'` y `state.terminado = true`.
- `pipeline.js`: `avanzarSplit` ahora es no-op si `state.terminado`, y corta el resto de las etapas del split en curso si la carrera termina a mitad de camino (no tiene sentido loguear un evento el mismo split en que te bajaron del ranked).
- **Eventos gateados por fase**: `academy_offer` ahora requiere `phase: 'amateur'` (es el puente hacia el debut); `redemption_game`, `coach_demands_role`, `team_drama`, `transfer_rumor`, `visa_delay`, `title_run`, `international_trip` y `worlds_dream` ahora requieren `phase: 'profesional'` (su lore asume que ya estás en un roster). Sin cambios al motor — usa el mecanismo de `conditions` que ya existía.
- `simulate.js` reporta `phase`/`terminado`/`finAnticipado`/`splitFichaje`/`sleep`/`soloqElo`, corta el loop por carrera si `terminado`, y en modo lote agrega desenlaces (`llegaronAPro`, `splitFichaje` promedio, `fracasos` por motivo, `siguenAmateur`). Default de splits subido de 8 a 15 para que el reporte de una sola corrida normalmente alcance a mostrar un desenlace.
- **Balance validado por simulación** (CLAUDE.md §7): 1000 carreras de hasta 20 splits → 96.6% llega a profesional (promedio 8.33 splits hasta el fichaje, rango 5-14), 3.4% termina en fracaso temprano (2.7% familia, 0.7% burnout), 0% se queda trabado en amateur. Los umbrales de la primera estimación quedaron bien calibrados, no hizo falta retunear.
- `index.html`: el resumen ahora refleja el desenlace real (fichado / fracaso por familia / fracaso por burnout / sigue en amateur) en vez de un texto fijo; el loop de demo corre hasta 20 splits o hasta que termine la carrera, lo que pase primero.
- Verificado: `npm run validate` pasa, determinismo confirmado, `node src/dev/simulate.js 1000` sin crashes, servidor sirve `index.html` con 200 OK.

### 2026-08-06 — Cierre de andamiaje + motor de eventos data-driven

- Se agregaron `src/core/selectors.js` (`getPath`/`setPath` inmutables, `cumpleCondiciones`, `metaDominante`) y `src/core/log.js` (`crearLog`), previstos en DISENO.md §4.1 y ausentes hasta ahora.
- Se agregó `weightedPick` a `src/core/rng.js`, reusado por el motor de eventos en sus tres niveles de selección ponderada (evento / opción / outcome).
- Se agregaron `src/dev/guards.js` (bloquea `Math.random()` en todo `src/` vía escaneo estático) y `src/dev/validate.js` (valida guardia RNG, esquema de eventos, coherencia de `balance.js` y determinismo end-to-end). `npm run validate` corre ambos.
- **Se migraron los 18 eventos** de `src/systems/events.js` (antes hardcodeados como funciones JS) a datos en `src/data/events/*.json`, agrupados por categoría narrativa, agregados vía `src/data/events/index.js`. Se eliminó el duplicado obsoleto `src/data/events.json` (no se importaba desde ningún lado).
- **Se agregaron opciones y outcomes ponderados a cada evento** (regla invariable #8 de CLAUDE.md, antes inexistente — los eventos se auto-aplicaban sin decisión). `systems/events.js` es ahora un motor genérico sin lógica por id: filtra por condiciones + cooldown, elige evento/opción/outcome por peso, y aplica efectos declarativos (`type: "stat"` con rango+clamp opcional, `type: "push"` para listas). Mientras no exista UI (Fase 11), la opción se resuelve en modo automático usando el mismo RNG inyectado — determinista, listo para que la futura pantalla de decisión reemplace el auto-pick sin tocar el esquema de datos.
- Se agregaron cooldowns por evento (`state.flags.cooldowns`) para evitar repetición inmediata.
- Se movió el número mágico de influencia del meta en `aplicarSplitBase` (`0.8` / `0.2`) a `BALANCE.split.metaInfluenceBase` / `metaInfluenceRange`.
- `src/dev/simulate.js` ahora acepta `[corridas] [splits]`: con `corridas=1` da el reporte detallado de siempre; con `corridas>1` corre carreras independientes con seeds `1..corridas` y agrega min/promedio/max + conteo de crashes. `node src/dev/simulate.js 1000` corre sin crashear (verificado).
- Verificado: `npm run validate` pasa, dos corridas con la misma seed producen el mismo estado, `node src/dev/simulate.js 1000` da 0 crashes, y la demo de `index.html` (llamada directa a `avanzarSplit`) sigue funcionando sin cambios de código en la UI.
- **Observación de balance para una futura pasada de tuning** (no se tocó en este cambio): en la corrida de 1000 carreras de 8 splits, `mecanica` promedia 97.75/100 — el stat llega casi siempre al techo. Candidato a revisar cuando se ataque la Fase 10.
