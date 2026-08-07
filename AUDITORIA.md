# Auditoría: diseño vs implementación

**Fecha: 2026-08-07.** Estado del repo: rama `master`, último commit `464ccf7` (compás de edad), más cambios sin commitear en `selectors.js`, `edadInicio.js`, `edadCierre.js`, `events.js` y `PROGRESO.md`.

Documento de diagnóstico puro. Compara `CLAUDE.md` (reglas invariables), `DISENO.md` (arquitectura) y `CONCEPTO.md` (qué es el juego y por qué) contra el estado real del código. No propone soluciones: solo constata qué existe, qué no, y dónde se rompen las reglas.

**Fuentes revisadas:** los tres documentos completos, lectura directa de los 24 archivos de `/src`, más `index.html` y `server.js`. `PROGRESO.md` se usó como corroboración, no como fuente primaria.

**Evidencia empírica** (corridas reales, no lectura de código):

- `node src/dev/validate.js` → pasan los 5 checks. (`PROGRESO.md` dice "6 checks" en tres entradas del changelog: son 5.)
- `node src/dev/simulate.js 500 30` → 0 crashes. 492/500 carreras (**98.4%**) terminan igual: fichaje y nada más. `mecanica` promedio **99.9/100**, `hype` **99.25/100**. `fracasoSueno: 0` en 500 carreras.
- Traza split a split (seed 7, 18 splits) para ver el comportamiento que los agregados esconden.
- Scan de los 6 JSON de eventos: 20 eventos, 40 opciones, 80 outcomes.

> Diferencia respecto de la versión anterior de este documento: aquella se escribió antes del commit del compás de edad y solo comparó contra `DISENO.md`. Varias de sus afirmaciones hoy son falsas (decía que `ETAPAS_SPLIT` tenía 4 entradas; tiene 6). Se reemplazó entera. Sumar `CONCEPTO.md` a la comparación cambia el diagnóstico de fondo: contra `DISENO.md` el repo cumple bastante bien, porque `DISENO.md` describe una arquitectura y la arquitectura está. Contra `CONCEPTO.md` el hueco es mucho más grande, porque `CONCEPTO.md` describe el juego.

---

## Parte 1 — Qué existe de verdad, qué es placeholder, qué no existe

### Implementados de verdad

Lógica real, no stub. Se ejecutan y hacen lo que dicen.

- **RNG determinista** (`src/core/rng.js`) — `mulberry32(seed)` + `roll`, `gauss`, `chance`, `weightedPick`. El `rng` se inyecta por toda la cadena de sistemas; ninguna función interna genera azar por su cuenta. El determinismo está verificado end-to-end en `validate.js` (dos corridas con la misma seed, `JSON.stringify` idéntico).
- **Selectors** (`src/core/selectors.js`) — `getPath`/`setPath` inmutables por path de string, `cumpleCondiciones` con 6 operadores (`lt`/`lte`/`gt`/`gte`/`eq`/`neq`), `metaDominante`, y el diccionario `etiquetaCampo` para describir efectos en texto legible.
- **Motor de eventos** (`src/systems/events.js`) — filtra candidatos por cooldown + condiciones, elige evento, opción y outcome por peso vía `weightedPick`, y aplica efectos declarativos con rango y clamp. **Cero lógica por id de evento**: cumple `DISENO` §4.3 al pie de la letra. Es la pieza mejor construida del repo.
- **Compás de edad** (`src/systems/edadInicio.js` + `src/systems/edadCierre.js`) — lo más fiel a `CONCEPTO` §2 que hay: cada edad dura 3 splits, se toma un snapshot al abrir, se genera el resumen de temporada por diff al cerrar, se incrementa `age` y se dispara la decisión grande de cierre desde un pool separado (`cierreDeEdad: true`). Verificado en traza: 15→16 al split 3, 16→17 al split 6, 17→18 al split 9. El "1 o 2 decisiones por split" también existe, vía `BALANCE.edad.probSegundaDecision`.
- **Tooling de dev** (`src/dev/guards.js`, `validate.js`, `simulate.js`) — los tres con lógica real: guard estático que escanea `Math.random(` en todo `/src`, validación de esquema de eventos + coherencia de balance + determinismo, y simulación en lote con agregados y desenlaces.
- **Datos de eventos** (`src/data/events/*.json` + `index.js`) — 20 eventos en 6 archivos por categoría narrativa. Todo el texto y todos los números de efecto viven ahí, cero contenido en el código.
- **UI jugable** (`index.html`) — es un juego de verdad: panel de decisión con un botón por opción, stats en vivo, avance split a split. No es un demo auto-simulado. (Sobre dónde vive y qué se lleva puesto, ver más abajo.)

### Placeholder o a medio construir

Existe el nombre y algo de código, pero no el sistema que el diseño describe.

- **Meta** (`src/systems/meta.js`) — mueve los 8 pesos por parche con ruido gaussiano, y el movimiento es calmo como pide `CONCEPTO` §2. Pero **el "Ajuste al Meta" de `CONCEPTO` §6 no existe**. En su lugar, `pipeline.js:148` usa el peso de **un solo tag arbitrario** (`early_game`) como proxy del meta entero para modular la ganancia de mecánica. Los `tags` del campeón nunca se cruzan con los pesos del meta. Ni siquiera comparten vocabulario: el único campeón del pool tiene tag `mago_burst` y el meta tiene una categoría `mago_control`. Nunca se conectaron.
- **Etapa amateur** (`src/systems/amateur.js`) — decide éxito y fracaso, y por eso `PROGRESO.md` la da por completa. Pero **no implementa el bucle central del juego**. `CONCEPTO` §3 define el único recurso escaso de toda la partida —la atención— y en la etapa amateur lo hace literal: 10 bloques de tiempo por periodo repartidos entre ranked, estudiar, dormir y familia, más la opción de robarle hasta 3 bloques al sueño con costo acumulativo. Nada de eso está. El split aplica cuatro tiradas fijas y el jugador no reparte nada. La única decisión que toma en la etapa amateur es la de los eventos.
- **Atributos** (`src/systems/attributes.js`) — 20 líneas, huérfano: no está en `ETAPAS_SPLIT`, ningún archivo lo importa, nunca se ejecuta. Quien realmente mueve los stats es `aplicarSplitBase`, una función inline dentro de `pipeline.js`. Y lo que hace es sumar mecánica y mentalidad, sin nada de lo que pide `CONCEPTO` §6.
- **Mentalidad** — `CONCEPTO` §3 la define como "la moneda con la que pagás" y dice que en cero se termina la carrera. En el código **no es condición de fin en ningún lugar**, y `pipeline.js:150` se la **suma** al jugador todos los splits (`gauss(1, 1.2)` con piso en 0), así que su deriva neta es hacia arriba. Baja en ~12 de los 20 eventos, pero el split base la repone gratis. La moneda no cuesta nada.
- **balance.js** — existe y es la fuente de verdad para `amateur`, `split`, `meta` y `edad`, pero no cubre todos los números (detalle en Parte 2, regla 3) y tiene una clave muerta: `meta.baseWeight` (`balance.js:25`) no se usa en ningún lado.
- **UI fuera de lugar** (`index.html`) — funciona, pero vive en la raíz y no en `/src/ui`, y se lleva adentro cosas que son lógica de juego: el tope de carrera (`MAX_PASOS_DE_SEGURIDAD = 60`, línea 187) y la creación de la seed (`Date.now()`, línea 313). Además el panel de logs va **un split atrasado**: `state.logs` recién se fusiona al cerrar el split, así que mientras hay una decisión en pantalla la lista muestra el split anterior.

### No existen

El diseño los pide y no hay ningún código relacionado.

**Archivos que `DISENO` §4.1 lista y no están:**

- 8 sistemas: `champions.js`, `practice.js`, `roster.js`, `performance.js`, `contracts.js`, `regions.js`, `rivals.js`, `scoring.js`.
- 3 archivos de datos: `champions.json`, `leagues.json`, `meta-tags.js`. Las 8 etiquetas de meta están hardcodeadas como objeto literal en `state.js`.
- `/src/ui/` — la carpeta existe y está vacía. No hay `render.js`, `/screens` ni `/components`.

**Sistemas de `CONCEPTO` que no tienen ni un campo de estado:**

- **Mundo generado** (`CONCEPTO` §8). `createInitialState` es una constante salvo por la seed. La exigencia del colegio, la tolerancia de los viejos, la fuerza de cada org, quién gana Worlds, la región dominante, los cinco rivales de generación: nada se sortea. **Dos seeds distintas arrancan el mismo mundo idéntico.** La seed alimenta el stream de azar, no la generación del mundo. Esto es lo que sostiene "por qué cada partida es distinta", y es la capa que falta entera.
- **Formas de carrera, potencial oculto y declive** (`CONCEPTO` §6 y §8). `mecanica` solo sube: `pipeline.js:149` tiene un `Math.max(1, ...)` que garantiza al menos +1 por split, para siempre. Resultado medido: **99.9/100 de promedio** a los 30 splits, contra un techo de 100. No hay pico, no hay meseta, no hay declive por edad, no hay rachas ni slumps. `hype` está igual (99.25/100). Lo que `CONCEPTO` §6 describe como el corazón de la progresión —cinco formas de carrera sorteadas, sin edad de pico fija— no está empezado.
- **Roles diferenciados** (`DISENO` §3.2, `CONCEPTO` §6). `player.role` está fijo en `'mid'` y **ningún archivo del repo lo lee**. Ningún evento condiciona por rol, ningún cálculo lo pondera. El campo es decorativo.
- **Champion pool** (`DISENO` §3.3, `CONCEPTO` §6). `player.championPool` es un array con un objeto hardcodeado (`{ name: 'Ahri', mastery: 35, tags: ['mago_burst'] }`). No se lee en ningún lado. No hay maestría que suba ni que decaiga, no hay campeones nuevos, no hay signature.
- **Roster, sinergia y jerarquía** (`DISENO` §3.6, `CONCEPTO` §6). Cero campos de estado, cero sistema. `career.orgs` es un array de strings de nombres. Sin jerarquía **caen tres de las cinco cadenas causales que `CONCEPTO` §7 declara innegociables**: la espiral central (jerarquía → pick → maestría → rendimiento → jerarquía), la espiral del meta y la trampa de firmar por el equipo grande.
- **Contratos, regiones, imports** (`DISENO` §3.7, `CONCEPTO` §6). `career.contracts` se inicializa en `[]` y nunca se lee ni se escribe. No hay sueldos, cláusulas, cupos de import ni residencia. El único rastro es el evento `visa_delay`, que solo mueve mentalidad.
- **Etapas DEBUT y DECLIVE/RETIRO** (`CONCEPTO` §2). Solo existen `amateur` y `profesional`. La etapa de debut, donde el rookie casi no decide, y la de declive, con la última decisión sobre cómo se sale, no están.
- **El ciclo del split profesional** (`CONCEPTO` §5, siete pasos). Existen el paso 1 (llega el parche) y a medias el 6 (eventos). No hay ajuste al meta, ni draft, ni temporada regular, ni playoffs, ni offseason con reparto de puntos de preparación. La evidencia más dura está en la traza: **una vez que `phase` pasa a `profesional`, `soloqElo`, `studies`, `familyTrust` y `sleep` se congelan para siempre** (`amateur.js:8` corta si la fase no es amateur, y nada lo reemplaza). En la traza de 18 splits, el LP queda clavado en 1748 desde el split 10.
- **Cierre de carrera y tarjeta de legado** (`CONCEPTO` §9). **La carrera no termina nunca.** No hay retiro por edad, ni por burnout, ni por lesión, ni por elección. `age` sube sin techo (llega a 21 y sigue en la traza) y la partida solo se corta cuando el loop de `index.html` toca su tope de 60 pasos. No hay veredicto compuesto, ni métricas finales, ni puesto en la generación.
- **Stats muertos**: `teamfight`, `laneo` y `shotcalling` se inicializan en `state.js` y **ningún sistema ni ningún evento los modifica jamás**. Solo aparecen además en el diccionario de etiquetas de `selectors.js`.
- **Baraja de eventos**: 20 eventos contra los "más de 200" de `CONCEPTO` §8. Faltan enteras tres categorías que pide `DISENO` §5: in-game por rol, draft y series, y retiro/legado.
- **Distribuciones moduladas por stats** (`CONCEPTO` §8: "Tus stats corren esos pesos, no los eliminan"). Los pesos de outcome son constantes en el JSON. Ningún stat corre ningún peso: el motor los lee tal cual.

---

## Parte 2 — Dónde se viola cada una de las 9 reglas invariables

### Regla 1 — Nunca usar `Math.random()`

**Sin violaciones.** Cero coincidencias en todo `/src`. El RNG se inyecta de verdad y `src/dev/guards.js` lo verifica por escaneo estático desde `validate.js`.

Salvedad de cobertura, no violación: `guards.js` solo recorre archivos `.js` bajo `/src`. No ve `index.html`, que es donde vive el único azar no seedeado del proyecto (`seed = Date.now()`, línea 313). Ese uso es legítimo —es la seed— pero queda fuera del guard.

### Regla 2 — El motor no debe tocar el DOM

**Sin violaciones.** Cero referencias a `document`, `window`, `innerHTML`, `querySelector`, `addEventListener` o `localStorage` en `core/`, `systems/`, `data/` o `dev/`. El motor corre en Node sin problemas, que es lo que la regla busca.

### Regla 3 — No deben existir números mágicos en la lógica

**Violada.**

- `src/core/state.js:13-30` — **todos** los valores iniciales del jugador como literales: `mecanica: 55`, `macro: 50`, `teamfight: 50`, `laneo: 50`, `shotcalling: 45`, `adaptabilidad: 50`, `mentalidad: 70`, `hype: 40`, `studies: 70`, `familyTrust: 60`, `sleep: 75`, `soloqElo: 1200`, `mastery: 35`.
- `src/core/state.js:40-49` — los 8 pesos iniciales del meta en `1`, mientras `BALANCE.meta.baseWeight` existe justo para eso y no se usa.
- `src/systems/attributes.js:5` — `roll(2, 5, rng)`.
- `src/systems/attributes.js:13-14` — el `+1` fijo a macro y el techo `100` dos veces.
- `src/systems/meta.js:8` — el piso `0.5` y la media `0` de la gaussiana (`maxDelta` sí viene de `BALANCE`).
- `src/core/pipeline.js:148` — el divisor `2` y el fallback `?? 1` del `metaMultiplier`.
- `src/core/pipeline.js:149` — el piso `1` del `Math.max`.
- `src/core/pipeline.js:150` — el piso `0` del `Math.max`.
- `src/core/pipeline.js:159-160` — el techo `100`, dos veces.
- `src/systems/amateur.js:5` — `clamp100` con `100` y `0` literales.
- `index.html:187` — `MAX_PASOS_DE_SEGURIDAD = 60`, que en la práctica es el largo máximo de una carrera.

El techo de stat `100` está hardcodeado sin constante nombrada en 4 archivos distintos.

`edadInicio.js` y `edadCierre.js` están limpios: toman todo de `BALANCE.edad`.

### Regla 4 — Los eventos son datos y deben vivir en `data/events/*.json`

**Sin violaciones.** Los 6 JSON contienen la totalidad de títulos, descripciones, opciones, outcomes y efectos. `index.js` solo concatena. `events.js` no tiene ni un texto de evento ni una rama por id.

### Regla 5 — Cada sistema debe exportar `aplicar(state, rng) -> { state, logs }`

**Violada parcialmente.**

Las 6 funciones exportadas como `aplicar` cumplen la firma en el papel (`amateur.js:7`, `meta.js:6`, `attributes.js:4`, `events.js:96`, `edadInicio.js:18`, `edadCierre.js:36`). Pero:

- `src/systems/events.js` exporta además cuatro funciones fuera de la firma: `elegirEvento` (línea 54, devuelve un evento o `null`), `elegirEventoCierre` (línea 62, ídem), `resolverOpcion` (línea 72, **4 parámetros**) y `resolverEventoAutomatico` (línea 91, 3 parámetros).
- `src/systems/edadCierre.js` exporta `esCierreDeEdad` (línea 26, devuelve un booleano) y `prepararCierre` (línea 30, no recibe `rng`).
- **El camino que el juego usa de verdad no llama a `aplicar` en ninguno de los dos casos.** `pipeline.js:85`, `:97`, `:116` y `:127` llaman directo a `elegirEvento`, `elegirEventoCierre` y `resolverOpcion`; `pipeline.js:111-112` llama directo a `esCierreDeEdad` y `prepararCierre`. La firma canónica solo se usa en el camino headless (`avanzarSplit`), que corren `simulate.js` y `validate.js` — es decir, se valida un camino y se juega otro.
- `edadInicio.js:18` recibe `rng` y no lo usa: cumple la forma, no el fondo.

### Regla 6 — Agregar un sistema implica un archivo nuevo y una línea en `ETAPAS_SPLIT`

**Violada, y de las cuatro formas posibles.**

`ETAPAS_SPLIT` (`pipeline.js:10-17`) es hoy `['aplicarInicioEdad', 'aplicarEtapaAmateur', 'aplicarMeta', 'aplicarEventos', 'aplicarSplitBase', 'aplicarCierreEdad']`.

1. **La lista no basta: son strings despachados por un `if/else`.** `pipeline.js:30-42` mapea cada string a su función con una cadena de seis `else if`. Agregar un sistema exige **dos** ediciones en el mismo archivo, no una. La regla describe un registro declarativo que el código no implementa.
2. **Una entrada de la lista no es un archivo de systems.** `'aplicarSplitBase'` figura en `ETAPAS_SPLIT` pero es una función interna sin exportar, definida en `pipeline.js:146-172`. Es el sistema que más stats mueve de todo el juego y vive escondido dentro de `core`.
3. **Un archivo de systems no figura en la lista.** `src/systems/attributes.js` no está y nadie lo importa. Nunca corre.
4. **El camino real no lee la lista.** `avanzarSplitHastaDecision` y `resolverDecisionYContinuar` (`pipeline.js:61-144`), que es lo que ejecuta `index.html`, hardcodean la secuencia de etapas en el cuerpo de las funciones. Peor: **nunca invocan `aplicarEventos` ni `aplicarCierreEdad`**. Dos de las seis etapas declaradas están muertas en el juego real, y agregar un sistema exige una tercera edición, con otra forma, en este camino paralelo.

### Regla 7 — Los efectos de eventos deben ser rangos `[min, max]`, nunca valores fijos

**Violada.** Cuatro efectos sobre 80 outcomes revisados:

- `src/data/events/competicion.json:20` y `:38` — `player.titles` con `"min": 1, "max": 1`. Rango degenerado: siempre da lo mismo.
- `src/data/events/debut_academy.json:20` y `:24` — efectos `"type": "push"` sobre `career.orgs` con `"value": "Academy prospecto"` fijo, sin `min`/`max`.
- `src/dev/validate.js:90-93` **institucionaliza la excepción**: el validador exime explícitamente a los efectos `push` de tener rango, y no detecta rangos degenerados donde `min === max`.

### Regla 8 — Los resultados de opciones deben ser distribuciones con pesos

**Sin violaciones formales.** Las 40 opciones de los 6 JSON tienen 2 outcomes cada una, todos con `weight` numérico positivo, resueltos por `weightedPick` en tres niveles (evento, opción, outcome). `validate.js:70-84` lo valida activamente.

Nota, no violación de esta regla: los pesos son constantes. `CONCEPTO` §8 pide que los stats del jugador corran esas distribuciones sin eliminarlas, y eso no está implementado (ver Parte 1).

### Regla 9 — Todo el juego debe residir en un único objeto `state`

**Violada, en la UI.**

El motor está limpio: `createInitialState` arma un solo objeto y todos los sistemas son puros respecto de él (spread, sin mutación, sin globales). Pero el juego que se juega no es solo el motor:

- `index.html:190-193` mantiene `estado`, `rng` y **`logsAcumulados`** en variables de módulo.
- `logsAcumulados` no es una variable de presentación: son los logs del split **en curso**, que hay que devolverle al motor como segundo parámetro de `resolverDecisionYContinuar` para que el split cierre bien.
- `pendingDecision` viaja también como objeto suelto fuera de `state`, con el `tipo` y el `slot` de la decisión.

Consecuencia concreta: **el estado de un split a medio resolver no vive en `state`**, así que una partida en curso no es serializable ni reanudable a partir del objeto de estado. El `rng` afuera es correcto y lo exige la regla 5; los otros dos no.

### Resumen

| Regla | Estado |
|---|---|
| 1 — Sin `Math.random()` | Sin violaciones (el guard no cubre `index.html`) |
| 2 — Motor sin DOM | Sin violaciones |
| 3 — Cero números mágicos | **Violada** — 6 archivos |
| 4 — Eventos como JSON | Sin violaciones |
| 5 — Firma `aplicar(state, rng)` | **Violada parcialmente** — el camino jugable no la usa |
| 6 — Un archivo + una línea en `ETAPAS_SPLIT` | **Violada** — de las cuatro formas posibles |
| 7 — Efectos como rangos | **Violada** — 4 efectos, más la excepción en el validador |
| 8 — Distribuciones con pesos | Sin violaciones |
| 9 — Un único `state` | **Violada** — estado de split en curso fuera de `state` |

---

## Parte 3 — Qué se conserva y qué hay que rehacer

Clasificación diagnóstica: describe el estado de cada archivo, no cómo corregirlo.

### Se conservan sin reservas

Lógica correcta, sin violaciones, y sirven tal cual para lo que viene:

- `src/core/rng.js`
- `src/core/log.js`
- `src/core/selectors.js`
- `src/dev/guards.js`
- `src/dev/simulate.js`
- `src/data/events/index.js`
- `server.js`

### Se conservan, con deuda ya identificada

Funcionan y la estructura es la correcta, pero cargan alguna de las violaciones de arriba:

- `src/systems/edadInicio.js` + `src/systems/edadCierre.js` — lo más sano del repo y lo único que implementa un pedazo de `CONCEPTO` tal como está escrito. Deuda menor: `edadCierre` duplica el trabajo entre `aplicar` y `prepararCierre` para servir a los dos caminos del pipeline, y `edadInicio.aplicar` recibe un `rng` que no usa.
- `src/systems/events.js` — el motor es correcto y genérico. La deuda es de firmas (regla 5) y de que sus funciones sueltas son las que el juego usa realmente.
- `src/data/events/*.json` — el esquema es el adecuado. La deuda es de contenido (20 de 200) y de dos violaciones puntuales de la regla 7.
- `src/dev/validate.js` — buena base, pero valida el camino que no se juega, exime a `push` de la regla 7, no detecta rangos con `min === max`, y no chequea que los `path` de efecto existan de verdad en `state` (hoy un typo en un path crea una propiedad nueva en silencio, vía `setPath`).
- `src/systems/meta.js` — el movimiento de pesos sirve; le falta todo lo que lo conecta con campeones.
- `src/data/balance.js` — el archivo es el correcto; está incompleto y tiene una clave muerta.
- `index.html` — es un juego jugable de verdad. La deuda es de ubicación (`/src/ui` está vacía), de lógica de juego adentro de la vista, del estado fuera de `state` (regla 9) y del panel de logs atrasado un split.

### Huérfano

- `src/systems/attributes.js` — tiene lógica real pero no se ejecuta nunca. Además de no estar enganchado, lo que hace no se parece a lo que `CONCEPTO` §6 pide de un sistema de atributos.

### Hay que rehacer

No es deuda técnica: la premisa del archivo no coincide con la del diseño.

- `src/core/state.js` — es una constante, no un mundo. `CONCEPTO` §8 apoya la rejugabilidad entera en que el mundo se sortee de la seed (colegio, viejos, orgs, rivales, meta inicial), y este archivo devuelve siempre lo mismo. Además arrastra los stats muertos y un `championPool` de juguete.
- `src/core/pipeline.js` — dos caminos divergentes (headless e interactivo) sin fuente de verdad común, `ETAPAS_SPLIT` decorativo, y un sistema (`aplicarSplitBase`) disfrazado de función privada adentro de `core`. Es donde se concentran las violaciones de las reglas 3, 5 y 6.
- `src/systems/amateur.js` — le falta el bucle central completo, invierte la dirección de los estudios, resuelve por escalones donde el concepto pide bandas de riesgo, e implementa 1 de las 3 salidas.

### No existen — hay que construirlos desde cero

- Systems: `champions.js`, `practice.js`, `roster.js`, `performance.js`, `contracts.js`, `regions.js`, `rivals.js`, `scoring.js`.
- Datos: `champions.json`, `leagues.json`, `meta-tags.js`.
- UI: `src/ui/render.js`, `src/ui/screens/`, `src/ui/components/`.

---

## Apéndice — Contradicciones concretas entre `CONCEPTO.md` y el código

No son sistemas faltantes: son sistemas que existen y hacen lo contrario de lo que el concepto dice.

1. **Los estudios van al revés.** `CONCEPTO` §4: "Estudios decae solo cada periodo". `amateur.js:16,25`: los estudios **suben** `+3±2` por split. En la traza llegan a 100 al split 8 y se quedan ahí. La barra que en el concepto es la fuente de tensión de toda la etapa se resuelve sola a favor del jugador.
2. **La confianza familiar está desacoplada.** `CONCEPTO` §4: "Confianza familiar depende de los estudios pero también de eventos propios". `amateur.js:17`: baja con una tirada independiente que nunca mira los estudios.
3. **Escalones donde el concepto pide curvas.** `CONCEPTO` §4 y §8 piden bandas de riesgo que crecen a medida que la barra baja, multiplicadas por lo estrictos que salieron los viejos, con avisos y confiscación antes del corte. `amateur.js:37-38` corta seco en `familyTrust <= 15` o `sleep <= 10`. Y los estudios, que en el concepto son *la* barra que te saca del juego, no son condición de fin.
4. **Una sola salida de las tres.** De las tres formas de escapar de `CONCEPTO` §4 —negociación con los viejos al llegar a Máster, fichaje temprano, pasarse a nocturno— existe solo el fichaje, y como umbral duro (`soloqElo >= 1600 && hype >= 55`), no como negociación.
5. **El flag del secundario no existe.** `CONCEPTO` §4: a los 18 la barra "se congela" en un flag permanente que cambia los pesos de los eventos de crisis por el resto de la carrera. `state.flags` solo contiene `cooldowns` y `edadSnapshot`.
6. **La mentalidad no cuesta.** `CONCEPTO` §3: "mentalidad en cero es el fin de la carrera". No es condición de fin en ningún archivo, y el split base la repone todos los splits.
7. **La partida no termina.** `CONCEPTO` §2 y §9 definen dos etapas finales y una tarjeta de legado. En la traza, `age` llega a 21 y sigue subiendo sin que pase nada. La carrera se corta por el tope del loop de la UI.
8. **El balance está roto según el criterio del propio proyecto.** `CONCEPTO` §11: "si más del 25% termina en el mismo arquetipo, el balance está roto aunque cada partida individual se sienta variada". Medición sobre 500 carreras: **98.4% termina igual**. Además `fracasoSueno` no disparó ni una sola vez en 500 corridas.
9. **La seed no se puede compartir.** `CONCEPTO` §9 apoya toda la difusión del juego en que dos personas jueguen la misma seed y comparen. `index.html:313` la genera con `Date.now()`, no la muestra y no deja elegirla.
