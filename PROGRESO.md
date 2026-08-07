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
