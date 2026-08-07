# Auditoría: diseño vs implementación

Documento de diagnóstico puro. Compara `CLAUDE.md` (reglas invariables) y `DISENO.md` (diseño técnico y de contenido) contra el estado real del código en `/src` a la fecha de esta auditoría. No propone soluciones ni cambios: solo constata qué existe, qué no, y dónde se violan las reglas.

Fuentes revisadas: `DISENO.md` completo, `CLAUDE.md` completo, `PROGRESO.md` (usado como corroboración, no como fuente primaria), y lectura directa de todo `/src` (`core/`, `systems/`, `data/`, `data/events/*.json`, `dev/`; `/src/ui` está vacío), más `index.html` y `server.js` en la raíz.

---

## Parte 1 — Sistemas del diseño: qué existe de verdad, qué es placeholder, qué no existe

### Implementados de verdad (lógica real, no stub)

- **RNG determinista** (`src/core/rng.js`) — `mulberry32(seed)` + `roll`, `gauss`, `chance`, `weightedPick`. Toda la cadena de sistemas recibe `rng` como parámetro y lo reenvía; ninguna función interna llama `Math.random`.
- **Estado único inicial** (`src/core/state.js`) — `createInitialState(seed)` arma un único objeto con todos los campos de player/career/meta/flags/logs.
- **Pipeline headless** (`src/core/pipeline.js`) — `avanzarSplit` itera `ETAPAS_SPLIT` con ramas reales (corta el split si `state.terminado`).
- **Selectors** (`src/core/selectors.js`) — `getPath`/`setPath` inmutables, `cumpleCondiciones` (operadores lt/lte/gt/gte/eq/neq), `metaDominante`.
- **Etapa amateur** (`src/systems/amateur.js`) — mueve `soloqElo`, `sleep`, `studies`, `familyTrust` cada split con `roll`/`gauss`; resuelve a éxito (fichaje, `phase → 'profesional'`) o a dos variantes de fracaso (`fracaso_familia` si `familyTrust<=15`, `fracaso_sueno` si `sleep<=10`). Es el sistema más fiel a DISENO §3.4 ("no es una pantalla introductoria... puede terminar en éxito o en fracaso temprano"). `PROGRESO.md` documenta una corrida de 1000 carreras que valida el balance de estos umbrales.
- **Motor de eventos** (`src/systems/events.js`) — `candidatos()` filtra por cooldown + condiciones; elección de evento, opción y outcome por peso vía `weightedPick`; `aplicarEfecto` resuelve rangos vía `roll(min,max,rng)`. Sin ningún `if (id === ...)` — cumple DISENO §4.3 literalmente.
- **Meta** (`src/systems/meta.js`) — mueve los pesos de 8 categorías por patch con ruido gaussiano, y el peso de `early_game` sí modula la ganancia de mecánica en `aplicarSplitBase` (DISENO §3.3: "el ajuste al meta debe afectar... el rendimiento").
- **Tooling de dev** (`src/dev/guards.js`, `validate.js`, `simulate.js`) — los tres con lógica real: guard estático de `Math.random(`, validación de esquema de eventos + coherencia de balance + determinismo end-to-end (dos corridas, misma seed, `JSON.stringify` idéntico), simulación en lote con agregados y desenlaces.
- **Datos de eventos** (`src/data/events/*.json`, 18 eventos en 6 archivos, agregados por `index.js`) — todo el contenido narrativo vive ahí, no en código.

### Placeholder / a medio construir

- **`src/systems/attributes.js`** — tiene lógica real (`roll(2,5,rng)` para mecánica, `+1` fijo a macro), pero es código huérfano: no tiene entrada en `ETAPAS_SPLIT` y ningún otro archivo lo importa ni lo invoca. `PROGRESO.md` lo admite explícitamente ("existe pero no está enganchado").
- **Atributos `macro` y `adaptabilidad`** — se mueven solo desde 2-3 eventos sueltos (`burnout`, `worlds_dream`, `coach_demands_role`, `international_trip`); no tienen sistema propio ni cobertura sistemática.
- **Mentalidad y burnout** (DISENO §3.5) — la mecánica descrita existe (baja en ~12 de 18 eventos por desgaste/drama, sube con descanso/estabilidad, hay un evento `id: "burnout"`), pero está repartida entre `amateur.js`, `pipeline.js` y datos de eventos sin un archivo `systems/` dedicado.
- **`src/data/balance.js`** — existe y se usa en `amateur`/`split`/`meta`, pero no cubre todo: deja fuera los stats iniciales del jugador (`state.js`) y varios literales de `attributes.js`, `meta.js` y `pipeline.js` (detalle en Parte 2, regla 3).
- **Camino interactivo del pipeline** (`avanzarSplitHastaDecision` / `resolverDecisionYContinuar`, `pipeline.js:48-99`) — es lo que realmente usa `index.html` para jugar split a split, y funciona, pero duplica y hardcodea la secuencia de etapas por fuera de `ETAPAS_SPLIT` en vez de leerla (detalle en Parte 2, regla 6).
- **UI** (`index.html`, raíz del repo) — es un juego jugable de verdad (panel de decisión con botones por opción, no auto-resuelto; stat-cards; resumen de desenlace), pero vive fuera de `/src`, no en `/src/ui` como describe la estructura de carpetas de DISENO §4.1.

### No existen (el diseño los menciona; cero archivo, cero referencia en el código)

- `src/systems/champions.js`, `practice.js`, `roster.js`, `performance.js`, `contracts.js`, `regions.js`, `rivals.js`, `scoring.js` — ninguno de los 8 existe.
- `src/data/champions.json`, `leagues.json`, `meta-tags.js` — ninguno existe. Las etiquetas de meta (`tanque`, `bruiser`, `asesino`, `mago_control`, `escalado`, `early_game`, `engage`, `splitpush`) están hardcodeadas como objeto literal dentro de `state.js`, no en un archivo de datos dedicado.
- **`/src/ui/`** — carpeta vacía, sin `render.js`, `/screens` ni `/components`.
- **Roles diferenciados** (DISENO §3.2) — `player.role` existe en el estado pero está fijo en `'mid'` en `createInitialState`; ningún evento condiciona por `player.role`, ninguna rama de ningún sistema lo lee. El campo es decorativo.
- **Champion pool real** (DISENO §3.3) — `player.championPool` es un array con un único objeto hardcodeado (`{ name: 'Ahri', mastery: 35, tags: ['mago_burst'] }`); no hay lógica de selección, crecimiento de maestría, ni cruce entre `tags` del campeón y `meta.weights`. Hay además una inconsistencia de vocabulario entre `mago_burst` (tag del campeón) y `mago_control` (categoría de meta) — nunca se conectaron.
- **Roster, sinergia, jerarquía** (DISENO §3.6) — cero campo de estado (`sinergia`/`jerarquía` no aparecen en ningún archivo), cero sistema. `career.orgs` es solo un array de strings de nombres de organización, no un roster con compañeros individuales.
- **Contratos, regiones, movilidad** (DISENO §3.7) — `career.contracts` se inicializa como `[]` y nunca se llena ni se lee en ningún otro lugar. No hay `contracts.js` ni `regions.js`. El único rastro es el evento narrativo `visa_delay`, que solo mueve `mentalidad`, sin lógica de residencia, sueldos ni cláusulas.
- **Categorías narrativas de DISENO §5 sin cobertura**: "in-game por rol" (cero eventos condicionan por rol), "draft y series" (cero eventos, sin sistema), "fichajes, retiro y legado" (no hay evento de retiro ni mecanismo de legado/scoring final — coherente con que `scoring.js` tampoco existe).
- **Stats muertos**: `teamfight`, `laneo`, `shotcalling` existen en `state.js` (inicializados en 50, 50, 45) pero ningún otro archivo del repo los modifica jamás durante una carrera completa.
- **Desenlace de la etapa profesional** — una vez `phase === 'profesional'` no existe ningún mecanismo de cierre de carrera (retiro, scoring, "múltiples finales" que pide DISENO §7); la carrera simplemente corre hasta un tope de splits y se detiene sin conclusión diferenciada.

---

## Parte 2 — Violaciones de las 9 reglas invariables de CLAUDE.md, por archivo

**Regla 1 — Nunca usar Math.random().** Sin violaciones. Cero coincidencias de `Math.random` en todo `/src`. El RNG se inyecta de verdad (`mulberry32`, pasado como parámetro por toda la cadena) y está verificado por `src/dev/guards.js` (escaneo estático) ejecutado desde `src/dev/validate.js`.

**Regla 2 — El motor no debe tocar el DOM.** Sin violaciones. Cero referencias a `document.`, `window.`, `innerHTML`, `querySelector` o `addEventListener` en `core/`, `systems/`, `data/` o `dev/`. Todo el uso de DOM está en `index.html`, fuera de `/src`. (Nota: esto no es una violación de la regla 2, pero sí una desviación de la estructura de carpetas declarada, ya que `/src/ui` — donde debería vivir la interfaz según CLAUDE.md/DISENO §4.1 — está vacío.)

**Regla 3 — No deben existir números mágicos en la lógica.** **Violada.**
- `src/core/state.js:12-30` — todos los stats iniciales del jugador (`mecanica: 55`, `macro: 50`, `teamfight: 50`, `laneo: 50`, `shotcalling: 45`, `adaptabilidad: 50`, `mentalidad: 70`, `hype: 40`, `studies: 70`, `familyTrust: 60`, `sleep: 75`, `soloqElo: 1200`, `mastery: 35`) están escritos como literales, no importados de `BALANCE`.
- `src/systems/attributes.js:5` — `roll(2, 5, rng)` con límites hardcodeados.
- `src/systems/attributes.js:13-14` — `+1` fijo a macro y techo `100` hardcodeado dos veces.
- `src/systems/meta.js:8` — piso `0.5` y media `0` de la gaussiana hardcodeados (aunque `maxDelta` sí viene de `BALANCE`).
- `src/core/pipeline.js:103` — divisor `2` y fallback `1` hardcodeados en el cálculo de `metaMultiplier`.
- `src/core/pipeline.js:104` — piso `1` hardcodeado en `Math.max(1, ...)`.
- `src/core/pipeline.js:114-115` — techo `100` hardcodeado (dos veces).
- `src/systems/amateur.js:5` — `clamp100` con `100`/`0` literales.
- El techo de stat `100` aparece hardcodeado sin una constante nombrada en al menos cuatro archivos distintos (`amateur.js`, `attributes.js`, `pipeline.js` ×2).

**Regla 4 — Los eventos son datos y deben vivir en data/events/*.json.** Sin violaciones. Los 6 JSON de `src/data/events/` contienen la totalidad de títulos, descripciones, opciones, outcomes y efectos. `src/data/events/index.js` solo concatena esos JSON. `src/systems/events.js` no contiene ningún texto de evento ni rama por id.

**Regla 5 — Cada sistema debe exportar `aplicar(state, rng) -> { state, logs }`.** **Violada parcialmente.**
- Las 4 funciones exportadas como `aplicar` (`amateur.js:7`, `meta.js:6`, `attributes.js:4`, `events.js:61`) cumplen la firma en el papel.
- Pero `src/systems/events.js` también exporta `elegirEvento(state, rng)` (línea 41, retorna un evento o `null`, no `{state, logs}`) y `resolverOpcion(state, evento, opcionId, rng)` (línea 49, 4 parámetros) — ninguna de las dos sigue la firma canónica.
- El camino de juego real —el que usa `index.html`— no llama a `aplicar()` de `events.js`: `src/core/pipeline.js:68` llama directo a `elegirEvento`, y `src/core/pipeline.js:86` llama directo a `resolverOpcionEvento` (alias de `resolverOpcion`). Solo el camino headless (`avanzarSplit`, usado por `simulate.js`/`validate.js`) invoca `aplicarEventos` con la firma canónica.

**Regla 6 — Agregar un sistema implica un archivo nuevo y una línea en ETAPAS_SPLIT.** **Violada.**
- `ETAPAS_SPLIT` (`src/core/pipeline.js:8`) = `['aplicarEtapaAmateur', 'aplicarMeta', 'aplicarEventos', 'aplicarSplitBase']`.
- `src/systems/attributes.js` existe como archivo de sistema y no tiene entrada ahí; nada del pipeline lo importa ni lo llama. Confirmado también en `PROGRESO.md`.
- `'aplicarSplitBase'` sí figura en `ETAPAS_SPLIT`, pero no es un archivo de `/src/systems`: es una función interna sin exportar, definida en `src/core/pipeline.js:101-127`.
- `avanzarSplitHastaDecision` y `resolverDecisionYContinuar` (`pipeline.js:48-99` — el camino que usa `index.html`) no leen `ETAPAS_SPLIT` en absoluto: hardcodean la secuencia de etapas directamente en el cuerpo de la función. `PROGRESO.md` lo documenta ("dos funciones nuevas... sin tocar `avanzarSplit`/`ETAPAS_SPLIT`").

**Regla 7 — Los efectos de eventos deben ser rangos [min, max], nunca valores fijos.** **Violada.**
- `src/data/events/competicion.json:20` y `:38` — efecto sobre `player.titles` con `"min": 1, "max": 1`: un rango degenerado que siempre produce el mismo valor, equivalente a un valor fijo.
- `src/data/events/debut_academy.json:20` y `:24` — efectos `"type": "push"` sobre `career.orgs` con `"value": "Academy prospecto"` fijo, sin `min`/`max`.
- `src/dev/validate.js:90-93` institucionaliza esta excepción: el validador exime explícitamente a los efectos `type: "push"` de tener rango, exigiendo solo `value !== undefined`.

**Regla 8 — Los resultados de opciones deben ser distribuciones con pesos, no resultados únicos.** Sin violaciones. Cada opción revisada en los 6 JSON tiene un array `outcomes` con al menos 2 entradas, cada una con su propio `weight`, resuelto vía `weightedPick` (`src/core/rng.js`) en tres niveles (evento, opción, outcome). `src/dev/validate.js:70-84` valida activamente que cada opción tenga outcomes no vacíos con `weight` numérico positivo.

**Regla 9 — Todo el juego debe residir en un único objeto state.** Sin violaciones. `createInitialState` (`src/core/state.js`) arma un único objeto que anida todo el estado narrativo y numérico. Todos los sistemas y `pipeline.js` son puros respecto al estado (spread, sin mutación ni variables globales de juego). El único dato fuera de `state` es el propio generador `rng` (closure de `mulberry32`), que es justamente lo que la regla 5 exige mantener inyectado aparte — consistente con el diseño, no una violación.

### Resumen de la Parte 2

| Regla | Estado |
|---|---|
| 1 — Math.random() | Sin violaciones |
| 2 — Motor sin DOM | Sin violaciones |
| 3 — Cero números mágicos | **Violada** |
| 4 — Eventos como JSON | Sin violaciones |
| 5 — Firma aplicar(state, rng) | **Violada parcialmente** |
| 6 — ETAPAS_SPLIT | **Violada** |
| 7 — Efectos como rangos [min,max] | **Violada** |
| 8 — Distribuciones con pesos | Sin violaciones |
| 9 — Un único state | Sin violaciones |

---

## Parte 3 — Qué archivos se conservan y cuáles hay que rehacer

*(Clasificación diagnóstica: no describe cómo corregir nada, solo el estado actual de cada archivo.)*

### Se conservan sin reservas
Lógica real, sin violaciones de ninguna regla invariable:
- `src/core/rng.js`
- `src/core/selectors.js`
- `src/core/log.js`
- `src/dev/guards.js`
- `src/dev/validate.js`
- `src/dev/simulate.js`
- `src/systems/meta.js`
- `src/data/events/*.json` + `src/data/events/index.js`

### Se conservan, pero con deuda técnica ya identificada
Funcionan y tienen lógica real, pero cargan alguna de las violaciones listadas en la Parte 2:
- `src/core/state.js` — números mágicos en stats iniciales (regla 3).
- `src/data/balance.js` — incompleto: no cubre todos los números que la regla 3 exige centralizar.
- `src/systems/amateur.js` — constante `100`/`0` hardcodeada en `clamp100` (regla 3).
- `src/core/pipeline.js` — mezcla: la ruta headless (`avanzarSplit` + `ETAPAS_SPLIT`) está bien; la ruta interactiva (`avanzarSplitHastaDecision`/`resolverDecisionYContinuar`) hardcodea la secuencia de etapas (regla 6), y `aplicarSplitBase` es una función de sistema que vive inline en vez de en `/src/systems` (regla 6) con números mágicos propios (regla 3).
- `src/systems/events.js` — firma inconsistente entre `aplicar` (cumple regla 5) y `elegirEvento`/`resolverOpcion` (no cumplen regla 5, y son las que realmente usa el juego interactivo).

### Huérfano / no enganchado
- `src/systems/attributes.js` — tiene lógica real pero no se ejecuta nunca porque no está en `ETAPAS_SPLIT` (regla 6); además tiene números mágicos propios (regla 3).

### Fuera de la estructura declarada
- `index.html`, `server.js` (raíz del repo) — funcionan y son jugables de verdad, pero la interfaz debería vivir en `/src/ui` según CLAUDE.md/DISENO §4.1, y esa carpeta está vacía.

### No existen — hay que construirlos desde cero
El diseño los pide explícitamente y no hay ningún código relacionado:
- `src/systems/champions.js`
- `src/systems/practice.js`
- `src/systems/roster.js`
- `src/systems/performance.js`
- `src/systems/contracts.js`
- `src/systems/regions.js`
- `src/systems/rivals.js`
- `src/systems/scoring.js`
- `src/data/champions.json`
- `src/data/leagues.json`
- `src/data/meta-tags.js`
- `src/ui/render.js`, `src/ui/screens/`, `src/ui/components/`
