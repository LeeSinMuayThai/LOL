# Progreso

Documento vivo. Se actualiza al cierre de cada tarea, según la Definición de terminado de CLAUDE.md.

## Estado por fase (DISENO.md §6 "Orden de construcción")

| # | Fase | Estado |
|---|---|---|
| 1 | Andamiaje (state, rng, pipeline, guards, validate) | ✅ Completa |
| 2 | Jugador inicial, etapa amateur y loop de splits | 🔶 Parcial — la etapa amateur nunca termina (falta éxito/fracaso temprano y transición de `phase`) |
| 3 | Atributos, rendimiento y progresión básica | 🔶 Parcial — `attributes.js` existe pero no está enganchado en `ETAPAS_SPLIT`; falta `performance.js` |
| 4 | Champion pool, meta y ajuste al meta | 🔶 Parcial — `meta.js` mueve pesos por patch; no existe `champions.js` |
| 5 | Práctica dirigida entre splits | ⬜ Pendiente |
| 6 | Motor de eventos y validación | ✅ Completa (adelantada — ver changelog 2026-08-06) |
| 7 | Roster, sinergia y jerarquía | ⬜ Pendiente |
| 8 | Contratos, regiones y movilidad | ⬜ Pendiente |
| 9 | Rivales de generación y scoring final | ⬜ Pendiente |
| 10 | Simulación masiva y balance fino | 🔶 Base lista (`simulate.js` con N corridas); falta usarla para tunear balance |
| 11 | Refinamiento visual | ⬜ Pendiente — no existe `src/ui/` |

## Changelog

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
