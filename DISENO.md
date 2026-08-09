# Diseño técnico del simulador de carrera de LoL

## 1. Visión general

El objetivo del juego es convertir la carrera de un jugador profesional de League of Legends en una experiencia breve, intensa y rejugable. La partida debe combinar estrategia, gestión de carrera, presión emocional y contexto competitivo.

La experiencia ideal es:

- breve: 3 a 5 minutos por partida;
- determinista: el mismo seed produce el mismo mundo;
- profunda: decisiones con consecuencias reales;
- escalable: agregar contenido sin romper la arquitectura.

## 2. Principios de diseño

### 2.1 Determinismo

El juego debe ser reproducible. Cada partida parte de una semilla y utiliza un RNG inyectado.

### 2.2 Motor puro

El núcleo del juego no debe depender del DOM. La lógica debe poder ejecutarse en Node y devolver logs que luego procesa la interfaz.

### 2.3 Datos sobre lógica

Los eventos, campeones, ligas y balance deben vivir en archivos de datos. El código no debe tener lógica hardcodeada para cada caso de evento.

### 2.4 Un solo estado

Todo el progreso del juego debe residir en un objeto state único. No deben existir variables globales dispersas.

### 2.5 Cero números mágicos

Ninguna constante numérica debe escribirse en la lógica. Todo debe estar nombrado en data/balance.js.

## 3. Sistema de carrera

### 3.1 Atributos

Los atributos principales son:

- Mecánica
- Macro
- Teamfight
- Laneo
- Shotcalling
- Adaptabilidad
- Mentalidad
- Hype

Cada atributo debe evolucionar con ruido, contexto y decisiones. Ninguno debe ser completamente fijo ni completamente predecible.

### 3.2 Roles

Cada rol tiene distinta identidad y afecta la forma en que se desarrolla la carrera:

- Top: laneo, macro y presión por recursos.
- Jungla: mapas, objetivos y jerarquía.
- Mid: mecánica, prio y hype.
- ADC: daño, posicionamiento y fragilidad.
- Support: impacto indirecto, shotcalling y visibilidad limitada.

### 3.3 Champion pool y meta

El champion pool es un sistema central. El jugador debe elegir campeones, desarrollar maestría y adaptarse a la meta que cambia de parche en parche.

El ajuste al meta debe afectar tanto el rendimiento como la percepción de la carrera.

### 3.4 Etapa amateur

La etapa amateur no es una pantalla introductoria. Es un sistema propio con barras de estudio, sueño, familia y progreso en soloQ. Puede terminar en éxito o en fracaso temprano.

### 3.5 Mentalidad y burnout

La mentalidad es un recurso vivo. Baja por desgaste, presión, derrotas y drama; sube con descanso, victorias y estabilidad.

### 3.6 Roster, sinergia y jerarquía

El roster debe poseer dos ejes diferenciados:

- sinergia: química colectiva;
- jerarquía: peso del jugador dentro del equipo.

Ambos deben afectar el rendimiento, el draft y la capacidad de negociar.

### 3.7 Contratos, regiones y movilidad

La carrera debe incluir contratos, sueldos, cláusulas, imports, residencia, adaptación a nuevas regiones y eventos de visa.

## 4. Arquitectura técnica

### 4.1 Estructura de carpetas

> Esta sección quedó desactualizada durante las fases 0-4 (los nombres pasaron a español
> rioplatense y aparecieron módulos que este documento no preveía) y se corrige acá, más el
> agregado de lo que `PLAN.md` fases 5, 6 y 8 suman. Es un snapshot: el árbol real siempre manda
> sobre este documento si difieren — para eso está `PLAN.md` como plan vigente.

/src/core
  rng.js · state.js · pipeline.js · selectors.js · log.js · numeros.js · formato.js
  contexto.js · ajusteMeta.js · pool.js · presupuesto.js · plantillas.js · curvas.js
  mundo.js · ranked.js · competicion.js · tier3.js · rutinas.js · serie.js
  temporada.js (fase 5 — calendario, tabla de posiciones, fechas que importan)
  regimen.js (fase 6 — tier list del meta con nombre, boost por coincidencia)
  **registro.js** (fase 8, nuevo — único punto de escritura sobre `career.registro`:
  abrir/cerrar fila de org, registrar fecha/mapa/serie/título/internacional/pico, arraigo)
  **ficha.js** (fase 8, nuevo — lo que la tarjeta permanente pinta: NIVEL, deltas de
  stats, bandas de jerarquía/arraigo, estado internacional; puro, sin RNG)

/src/systems
  contexto.js · edadInicio.js · meta.js · roster.js · competitivo.js · campeones.js
  secundario.js · amateur.js · rendimiento.js · serie.js · events.js · atributos.js
  practica.js · edadCierre.js · registro.js (el registro declarativo de `ETAPAS_SPLIT`)
  temporada.js (fase 5 — se inserta en el registro antes de `rendimiento`)

/src/data
  balance.js · champions.json · leagues.json · meta-tags.js · roles.js · ranked.js
  servidores.js · contextos.js · minijuegos.json
  metas.json (fase 6 — los nueve regímenes de meta)
  /events (index.js + los JSON por categoría, incluido /rol)
    /partido (fase 5 — presion.json, clasico.json, dentro_del_mapa.json,
    postpartido.json: el contenido de las fechas marcadas de la temporada)
  /rutinas (amateur.json, offseason.json)

/src/ui — deja de estar vacía en la fase 8 (cierra D7). `index.html` queda como shell +
  `<style>` + los minijuegos (que la fase 8 no mueve, PLAN.md §8.5) + el control de flujo
  que llama al pipeline (`comenzarCarrera`/`avanzar`/`responder`).
  render.js — orquestador, único punto de entrada que importa `index.html`
  /components
    ficha.js — LA TARJETA permanente (vive en todas las pantallas de carrera)
    barra.js — barra de progreso con hitos con nombre (arraigo, jerarquía)
    statRow.js — los 6 atributos de rol con flechas ▲▼ y el destacado en color
    decision.js — la tarjeta de decisión (opciones; los minijuegos se desvían antes)
    feed.js — el log, con los logs `tecnico: true` atenuados
  /screens
    inicio.js — rol + mains (dueño de su propio estado de selección)
    carrera.js — orquesta ficha + feed; la decisión se pinta aparte

/src/dev
  simulate.js · validate.js · guards.js · cobertura.js · estrategias.js

### 4.2 Pipeline

El avance del split debe orquestarse desde pipeline.js mediante una lista de etapas. Cada etapa expone la misma firma y se ejecuta en orden.

La arquitectura debe permitir agregar sistemas nuevos sin modificar los viejos.

### 4.3 Motor de eventos

El motor de eventos debe:

1. filtrar candidatos por condiciones;
2. elegir un evento por peso;
3. presentar opciones con resultados ponderados;
4. aplicar efectos como rangos;
5. registrar flags y cooldowns.

No debe haber lógica específica por id de evento en el motor.

### 4.4 Validación y balance

El proyecto debe incluir:

- validate.js para verificar integridad de datos;
- simulate.js para correr muchas partidas y medir patrones;
- guards.js para bloquear Math.random() en desarrollo.

## 5. Contenido narrativo

Los eventos deben cubrir:

- in-game por rol;
- draft y series;
- soloQ y pre-carrera;
- debut y academy;
- drama, prensa y redes;
- negocios, salud y vida personal;
- fichajes, retiro y legado.

Todos los eventos deben ser datos y no lógica hardcodeada.

## 6. Orden de construcción

1. Andamiaje: state, rng, pipeline y guards.
2. Jugador inicial, etapa amateur y loop de splits.
3. Atributos, rendimiento y progresión básica.
4. Champion pool, meta y ajuste al meta.
5. Práctica dirigida entre splits.
6. Motor de eventos y validación.
7. Roster, sinergia y jerarquía.
8. Contratos, regiones y movilidad.
9. Rivales de generación y scoring final.
10. Simulación masiva y balance fino.
11. Refinamiento visual.

## 7. Criterios de calidad

- El juego funciona sin UI.
- El mismo seed produce resultados idénticos.
- El balance mejora a través de simulación, no intuición aislada.
- Agregar eventos y sistemas no rompe el motor.
- Cada carrera ofrece múltiples finales y caminos posibles.
