# Simulador de carrera de LoL

Este proyecto implementa un simulador de carrera profesional de League of Legends en navegador, con foco en narrativa, decisiones estratégicas y progresión realista. La experiencia debe ser breve, profunda y rejugable.

## Objetivo del proyecto

- Simular la carrera de un jugador profesional desde los 15 años hasta el retiro.
- Mantener una arquitectura limpia, determinista y escalable.
- Priorizar la lógica de juego y el balance sobre la estética inicial.

## Reglas invariables

1. Nunca usar Math.random(). Todo el azar debe provenir del RNG inyectado.
2. El motor no debe tocar el DOM. La lógica debe poder correr en Node.
3. No deben existir números mágicos en la lógica. Todas las constantes van en data/balance.js.
4. Los eventos son datos y deben vivir en data/events/*.json.
5. Cada sistema debe exportar la firma aplicar(state, rng) -> { state, logs }.
6. Agregar un sistema implica un archivo nuevo y una línea en ETAPAS_SPLIT.
7. Los efectos de eventos deben ser rangos [min, max], nunca valores fijos.
8. Los resultados de opciones deben ser distribuciones con pesos, no resultados únicos.
9. Todo el juego debe residir en un único objeto state.

## Precisión de dominio

- La promoción por series ya no existe. El ascenso es por LP.
- Los roles válidos son: top, jungla, mid, adc y support.
- El tono debe sonar a alguien que conoce LoL, no a una traducción literal.
- Las ligas y organizaciones pueden ser reales; los compañeros y rivales deben ser inventados.

## Estructura del proyecto

/src
  /core
  /systems
  /data
  /ui
  /dev

## Definición de terminado

Un cambio no está completo hasta que:

- node src/dev/validate.js corre sin errores.
- El determinismo se verifica con la misma seed en dos ejecuciones idénticas.
- node src/dev/simulate.js 1000 corre sin crashear.
- Se hizo commit del cambio.
- Se actualizó PROGRESO.md.

## Documentos del proyecto

Orden de lectura al abrir el proyecto:

| Documento | Qué es |
|---|---|
| `CLAUDE.md` | este archivo: las reglas duras |
| `CONCEPTO.md` | qué es el juego y por qué los sistemas están conectados así. **§12 es el archivo de investigación**: ligas 2026, salarios, duración de carreras, Fearless — no hay que volver a investigarlo |
| **`PLAN.md`** | **el plan vigente, fase por fase, hasta el juego terminado.** Incluye la tabla de deuda técnica, las trampas conocidas (T1-T10) y las reglas de proceso |
| `PROGRESO.md` | changelog: qué se hizo, por qué, y con qué números medidos |
| `DISENO.md` | arquitectura de archivos |

> `TRASPASO.md` y `AUDITORIA.md` se borraron el 2026-09-02: describían un repo de 28 commits
> atrás y ya se contradecían con el código. Lo que seguía vivo se mudó — la investigación a
> `CONCEPTO.md` §12 (conservando la numeración: `TRASPASO §4.N` → `§12.N`) y las trampas a
> `PLAN.md`. Los originales siguen en git: `git show 3d6ee90:TRASPASO.md`.

## Workflow recomendado

- Trabajar una fase a la vez, en el orden de `PLAN.md`.
- **Nada se planea en el momento**: si algo no está escrito en `PLAN.md`, se escribe ahí antes de
  implementarlo. Lo que se descubre midiendo va a la tabla de deuda técnica del mismo documento.
- Si un concepto no está claro, pedir aclaración antes de implementar.
- No agregar funcionalidad fuera del alcance.
- Construir primero el motor y los sistemas de datos; el visual vendrá después.
