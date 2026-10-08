# Diseño técnico del simulador de carrera de LoL

## 1. Visión general

El objetivo del juego es convertir la carrera de un jugador profesional de League of Legends en una experiencia acotada, intensa y rejugable. La partida debe combinar estrategia, gestión de carrera, presión emocional y contexto competitivo.

La experiencia ideal es:

- **acotada: 25 a 40 minutos por partida**, de una sentada;
- determinista: el mismo seed produce el mismo mundo;
- profunda: decisiones con consecuencias reales;
- escalable: agregar contenido sin romper la arquitectura.

> **Corregido el 2026-09-02.** Este documento decía "3 a 5 minutos", que era la estimación
> original y quedó vieja: el Bo5 con Fearless y draft (fase 4), la temporada regular jugable
> (fase 5) y el mercado de pases (fase 9) son sistemas centrales pedidos explícitamente por el
> usuario, no relleno. La duración larga es una decisión tomada — está registrada textual en
> `PLAN.md` ("Decisiones del usuario") y en `CONCEPTO.md` §1. El techo sigue siendo 40 minutos:
> pasarse significa que algo se infló.

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

> **Estado al 2026-09-02**: la fase 9 construyó contratos y sueldos. **Imports, residencia y
> movilidad entre regiones no existen todavía** — el eje `residencia` está clavado en `'local'` y
> `mercado.js` solo genera ofertas de tu propia liga. Es la deuda D29 de `PLAN.md`. Las cláusulas
> están en el modelo (`contrato.clausula`) pero ningún sistema las emite.
>
> Todo esto se reasignó ese mismo día a la **fase 9M — El mercado de pases** (antes iba a la 11),
> que además puebla el mundo de jugadores NPC con carrera propia y saca del dado la escalera
> competitiva. Ver `PLAN.md` §9M.

## 4. Arquitectura técnica

### 4.1 Estructura de carpetas

> Esta sección quedó desactualizada durante las fases 0-4 (los nombres pasaron a español
> rioplatense y aparecieron módulos que este documento no preveía) y se corrige acá. **Última
> sincronización contra el árbol real: 2026-09-02** (fase 9 cerrada), donde se agregaron los tres
> módulos del mercado y los 17 JSON de eventos que faltaban. Es un snapshot: el árbol real siempre
> manda sobre este documento si difieren — para eso está `PLAN.md` como plan vigente.

/src/core
  rng.js · state.js · pipeline.js · selectors.js · log.js · numeros.js · formato.js
  contexto.js · ajusteMeta.js · pool.js · presupuesto.js · plantillas.js · curvas.js
  mundo.js · ranked.js · competicion.js · tier3.js · rutinas.js · serie.js
  temporada.js (fase 5 — calendario, tabla de posiciones, fechas que importan)
  regimen.js (fase 6 — tier list del meta con nombre, boost por coincidencia)
  registro.js (fase 8 — único punto de escritura sobre `career.registro`:
  abrir/cerrar fila de org, registrar fecha/mapa/serie/título/internacional/pico, arraigo)
  ficha.js (fase 8 — lo que la tarjeta permanente pinta: NIVEL, deltas de
  stats, bandas de jerarquía/arraigo, estado internacional; puro, sin RNG)
  **salarios.js** (fase 9 — `salarioDeOferta`: lognormal por liga y rol, `CONCEPTO` §12.6)
  **valorMercado.js** (fase 9 — `valorDeMercado`, `sesgoEtario`, `splitsDeResidencia`; puro)
  **puntaje.js** (FASE K, K1 — `puntajeDeCarrera`: seis componentes, el techo revelado, el nivel por
  hechos y la leyenda más parecida; puro, cero `rng`, falla fuerte ante datos inválidos)
  **desafio.js** (K1 — la seed del desafío del día a partir de la fecha UTC)
  **partido.js** (K2b — `ruidoEfectivo`, `probabilidadDePartido`, `tirarPartido`: el único lugar que lee σ y
  tira un partido) · **previaDePartido.js** (K2d — la previa: desglose y p, pura, la misma fuente que la tirada)
  **barras.js** (K3-A — las barras que no se saturan: la mentalidad y el hype vuelven a su base, el descanso
  topeado en `topeDescanso`; puras, sin `rng`, las leen `atributos`, `practica` y `rendimiento`)
  **perfil.js** (K4-C — el perfil que resuelve los eventos que no son bifurcación; deriva con tus decisiones,
  tabla en `data/perfiles.json`)
  **internacional.js** (K5-A — el Mundial puro: clasificados por `cuposInternacionales`, Swiss de 16 + bracket
  de 8, partidos ajenos por `hashCadena` sin `rng`: si no clasificás, el stream no se mueve)
  **ligas.js** (K5 — `nombreVisibleDeLiga`: la única fuente del nombre de una liga para todo texto del motor y
  de la pantalla)

/src/systems
  contexto.js · edadInicio.js · meta.js · roster.js · competitivo.js · campeones.js
  secundario.js · amateur.js · rendimiento.js · serie.js · events.js · atributos.js
  practica.js · edadCierre.js · registro.js (el registro declarativo de `ETAPAS_SPLIT`)
  temporada.js (fase 5 — se inserta en el registro antes de `rendimiento`)
  **mercado.js** (fase 9 — contratos que vencen, ofertas, el año muerto; va justo
  después de `competitivo`: ese decide SI ascendés, este decide A QUÉ ORG vas)
  **internacional.js** (K5-A — el Mundial en el split: entre `serie` y `events` en `ETAPAS_SPLIT`; tus partidos
  del Swiss se tiran solos salvo el 2-2, el knockout se juega como serie con las reglas de K4)

/src/data
  balance.js · champions.json · leagues.json · meta-tags.js · roles.js · ranked.js
  servidores.js · contextos.js · minijuegos.json
  **version.js** (K1 — `VERSION_JUEGO` y `HUELLA_JUEGO`: la huella del juego entero, 40 seeds × 60 splits)
  **leyendas.json** (K1 — 20 pros inventados contra los que se compara una carrera)
  metas.json (fase 6 — los nueve regímenes de meta)
  **perfiles.json** (K4-C — los perfiles y la afinidad de cada opción)
  /events — index.js + un JSON por categoría:
    cierre_edad · competicion · debut_academy · drama_prensa · negocios ·
    pool · salud_vida · soloq_precarrera
    caminos (K4-C2 — las bifurcaciones: import, línea, retiro con staff, sponsor…; dejan `flags.caminos`
    y usan efectos de carrera reales: `ofertaDeImport`, `cambiarRol`, `retirarse`)
    escena_2026 · estatus · marcas_vivas · registro_cita (fase 8D — contenido vivo)
    /rol (top, jungla, mid, adc, support: lo que solo ve tu línea)
    /partido (fase 5 — presion.json, clasico.json, dentro_del_mapa.json,
    postpartido.json: el contenido de las fechas marcadas de la temporada)
  /rutinas (amateur.json, planes.json)

/src/ui — dejó de estar vacía en la fase 8 (cierra D7). `index.html` declara el DOM del shell (sin
  lógica: el controlador es `app.js`); la arquitectura de la pantalla de FASE V está en §4.5.
  app.js — el controlador: el pipeline (`avanzar`/`responder`), los dos stores y la página por split
  escena.js — el director de escena (el único que escribe `data-pieza` y la `vista`) + el contrato de las familias
  franja.js · cuartos.js (+ /cuartos) · acompanante.js — el chrome de V2-C (§4.5)
  teclado.js — Enter/Espacio nativos, 1-4, las letras de los cuartos, `?`; Esc nunca navega
  shell.js — el clic audible y la luz de estudio · reproductor.js — los beats del relato (y su pausa)
  render.js — orquestador de los renderers de hoy
  resultado.js (K1 — copiar resultado, link del desafío e historial local; el storage puede tirar)
  /core — lo puro de la UI: `escena.js` (`piezaDe`, `acompananteDe`, el cierre de split), `store.js`, `reconciliar.js`,
    `delta.js` (V4: `crearDelta` y `moverNumero`, los números que se mueven), `trayectoria.js` (V5: lo que dibuja Carrera, el
    escalón y la medalla del Golden Road; puro)
  /graficos — la capa de dibujo (V1/V5): cinta, línea, barras, escalera, hexa, bala; todo color sale de `tokens.css`
  /paradas — las familias de parada (decisión, partido, mercado, minijuego): `mostrar` + `acompanante`
  /paneles — tabla, calendario, plantilla, meta, generación, top mundial (los pintan los cuartos y el acompañante)
  /components
    ficha.js — la ficha entera (desde V2-C, en el cuarto Vos y en el acompañante; ya no está siempre a la vista)
    barra.js — barra de progreso con hitos con nombre (arraigo, jerarquía)
    statRow.js — los 6 atributos de rol con flechas ▲▼ y el destacado en color
    decision.js — la tarjeta de decisión (opciones; los minijuegos se desvían antes)
    cierre.js (V2-B/V4/V5) — la tarjeta de cierre de un split y del año, con el escalón y el Golden Road
    previaPartido.js (K2d) — la tarjeta de la previa: tu fuerza desglosada contra el rival y la p
    mundial.js (K5-A) — el Swiss resumido (tu récord y tus cruces) y el bracket con tu camino
    feed.js — el log, con los logs `tecnico: true` atenuados
    **mercado.js** (fase 9) — la tarjeta de oferta: sueldo, jerarquía proyectada,
    coste de arraigo y el riesgo, todo antes de firmar
  /screens
    inicio.js — rol + mains (dueño de su propio estado de selección)
    tarjeta.js — la tarjeta final, con la medalla del Golden Road (`carrera.js` se fue en V2-C con los rieles)

/src/dev
  simulate.js · validate.js · guards.js · cobertura.js · estrategias.js
  huella.js (K0 — la huella T1 de 40 × 30 y, desde K1, la del juego entero) · agencia.js (K0)
  build.js (P.6 — `dist/` con techo de peso duro)
  recorrido.mjs (V2-A — la carrera en Chromium que mide la pantalla) · contraste.mjs (V7 — la regla de contraste, §4.6)

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
- cobertura.js para saber qué contenido falta por contexto;
- guards.js para bloquear Math.random() en desarrollo.

> **Estado al 2026-09-02**: `guards.js` solo escanea archivos `.js` dentro de `/src`, así que los
> 5 `Math.random()` de `index.html` le quedan fuera por dos motivos a la vez. Deuda D28. Y
> `cobertura.js` saltea los momentos marcados `pendiente`, que fue por donde se coló el bug D25.
> Una herramienta que mira para otro lado da peor información que no tenerla: los dos huecos se
> cierran en la fase 9E.

### 4.5 La pantalla (FASE V)

> Mapa de archivos al cierre de V7 (`PLAN.md` §V.3 a §V.6 son la fuente; el contrato de las familias de
> parada está en la cabecera de `src/ui/escena.js`). Es un mapa, no un changelog. La regla de fondo:
> **una sola cosa pide atención** — el escenario muestra una pieza por vez y lo demás está a un toque.

**Las cuatro zonas** (todas declaradas en `index.html`; ninguna se monta desde JS):

| Zona | Qué es | Dónde |
|---|---|---|
| **Franja** (`header.franja`) | ≤ 64 px (dos líneas en el celular): handle · rol, club, edad · año · ventana, el número (nivel con banda y el delta del split en curso, que se mueve al final del relato; en amateur, rango/LP), velocidad, sonido, `?` y la barra de cuartos (en el celular, abajo y fija) | `franja.js`; CSS en `shell.css` y `cuartos.css` |
| **Escenario** (`#escenario`) | Una columna de ~720 px, centrada. `.shell[data-pieza]` ∈ {inicio, relato, decision, partido, mercado, minijuego, final}: cada nodo declara sus piezas en `data-piezas` y `shell.css` esconde lo que no es de la activa | `escena.js` (el director) + las familias de `paradas/` |
| **Acompañante** (`aside#acompanante`) | UN panel, desde 1180 px. `data-acompanante` = su tipo; vacío = no ocupa lugar y el escenario se centra. Debajo de 1180 px, el chip `#verContexto` de la parada abre el cuarto equivalente | `acompanante.js` |
| **Cuartos** (`dialog#cuarto`) | Vos · Temporada · Equipo · Mundo · Carrera · Crónica con `showModal()` (foco atrapado, fondo inerte, Esc nativo). Se pintan solo al abrirse, leyendo la `vista`; con uno abierto el relato se pausa y al cerrar el foco vuelve a la parada | `cuartos.js` + `cuartos/*.js`, `cuartos.css` |

**Las piezas del escenario.** `relato` (la página del split en curso, `#logList`), `decision` (la parada genérica: eventos,
cierre de año con su plan, plan amateur, retiro y vuelta, salud, servicio, cabeza), `partido` (fecha marcada, plan de
Fearless, mapa decisivo, Swiss y bracket), `mercado`, `minijuego` (con su fase previa: la charla del coach y "¡Vamos!"),
`inicio` y `final` (la tarjeta). Cada parada abre con `#paradaAntes` (`.parada-antes`, de las piezas decision/partido/mercado):
una línea con el último beat que el relato ya contó y un desplegable "ver la página (n)" con el resto de la página; oculto
si la parada abre el split (`renderParadaAntes`, `components/feed.js`).

**El acompañante, por tipo** (`acompananteDe(estado, pieza)`, pura, en `ui/core/escena.js`; también devuelve el cuarto
equivalente). En este orden: inicio, final o minijuego → nada · amateur → `vos` (rango y barras) · mercado → `mercado` (el
mercado del mundo; tu contrato y tu valor ya están en la parada) · cierre de año, retiro o vuelta → `carrera` (el escalón, el
Golden Road vivo y una mini trayectoria) · serie → `serie` (bracket, marcador y Fearless) · Swiss → `swiss` · fecha marcada →
`previa` (la previa completa) · temporada activa → `tabla` · con club → `vos`.

**Los seis cuartos.** Vos (la ficha entera; en la final, los picos de la carrera) · Temporada (la tabla en vivo y el calendario;
entre splits, la tabla cerrada del último) · Equipo (la plantilla) · Mundo (el meta, tu generación, el top mundial) · Carrera
(`cuartos/carrera.js`: la cinta de clubes, la curva fina de nivel, la nota de cada año, los hitos, el archirrival, el escalón y el
Golden Road) · Crónica (lo que pasó, por año y por split). `cuartos/ayuda.js` es la ayuda de `?`.

**La página por split y el cierre de año.** El relato cuenta solo el split en curso (`pagina.desde` en `app.js`); al terminar
entra una **tarjeta de cierre** como último beat (`components/cierre.js`; sus datos salen de `cierreDeSplit` y `deltaDeCierre` de
`ui/core/escena.js`): el resultado y el número que se movió. No frena: usa la espera de ese beat. Si el split cerró un año y el
motor no frenó en el cierre (`edadCierre`), la tarjeta es "Cierre de 2031": suma la nota del año, el escalón y el Golden Road, y
el reproductor la sostiene `ESPERA_CIERRE_ANIO_MS` (x1 2400 ms, x2 1200, INST 0; una por año como máximo, nunca junto a la
parada del motor; Espacio la salta). Al responder una parada vuelve el relato con la misma página. La línea
`crearLineaSplitAnterior` abre la página siguiente cuando la tarjeta no llegó a verse (INST o movimiento reducido).

**Los dos stores** (`ui/core/store.js`). `store` es el estado del motor: lo escribe `app.js` después de cada llamada al
pipeline. `vista` es lo que la pantalla **ya contó**: lo escribe solo el director (`escena.revelar`) al terminar los beats, al
retomar, al arrancar y en la final. Franja, acompañante, cuartos y luz de estudio leen `vista`, nunca `store`: mientras el
relato cuenta un split nada de eso cambia (regla 4 de §V.3: nada adelanta el resultado). Lo mide `src/dev/recorrido.mjs`.

**El teclado** (`teclado.js`; no ve `estado`, solo el DOM). Enter y Espacio activan lo nativo del foco (Espacio con el foco en el
body saltea un beat del relato). **1-4** hacen clic en `[data-atajo=n]` de la pieza activa (en el mercado llevan el foco al
"Firmar" de esa oferta y Enter firma). **V/T/E/M/C/R** abren los cuartos (con uno abierto, cambian de pestaña); `?` abre la
ayuda. Esc nunca navega: cierra el cuarto abierto o el "Avanzado" del inicio. En el minijuego los cuartos y `?` están apagados
(son dueños de Q/W/E/R, A/D, A/S y 1-5); solo en su fase **previa** valen **V** ("¡Vamos!") y **1-n** (la charla del coach).

**Quién es dueño de qué** (los archivos de abajo no se editan desde otra familia):

| Archivo(s) | Dueño |
|---|---|
| `index.html`, `app.js`, `ui/escena.js`, `teclado.js`, `shell.css`, `primitivos.css`, `ui/core/escena.js`, `ui/core/store.js`, `ui/core/reconciliar.js`, `ui/core/delta.js` | compartidos: ninguna familia los edita |
| `paradas/decision.js`, `components/decision.js`, `decision.css` | la parada genérica |
| `paradas/partido.js`, `components/{serie,previaPartido,mundial}.js`, `serie.css` | el partido (su `acompanante` pinta `serie`, `swiss` y `previa`) |
| `paradas/mercado.js`, `components/mercado.js`, `mercado.css` | el mercado (su `acompanante` pinta `mercado`) |
| `paradas/minijuego.js`, `components/minijuegos/*`, `minijuegos.css` | los minijuegos, la prueba y la prensa |
| `franja.js`, `cuartos.js`, `cuartos/*.js` (salvo `carrera.js`), `acompanante.js`, `components/ficha.js`, `paneles/*`, `cuartos.css`, `ficha.css`, `paneles.css` | la franja y los cuartos |
| `ui/core/trayectoria.js`, `cuartos/carrera.js`, `components/cierre.js`, `graficos/*` | la carrera: lo puro de lo que dibuja Carrera, la medalla y el escalón (`trayectoriaDeCarrera`, `seguimientoParaMostrar`, `goldenRoadsDeEstado`, `medallaDeGoldenRoad`); regla 15: lo dibujado es el registro |

### 4.6 El contraste (D48)

> Escrito en V7. "Se lee a un metro" dejó de ser una opinión: es una regla con un script.

**La regla.** (1) Todo texto visible tiene un contraste WCAG de **al menos 4,5:1** contra su fondo real; **3:1** si es texto
grande (≥ 24 px, o ≥ 18,66 px en negrita). (2) Los adornos que transmiten estado (el borde de una opción elegida, el anillo
o el cambio de borde del foco) llevan **al menos 3:1** contra lo que tienen alrededor.

**La medida** (a mano; **no** es un check de `validate.js`, para no sumar un check que se pelee con el diseño):

```
node server.js                      # en otro terminal (PORT=8xxx si el 8000 está ocupado)
node src/dev/contraste.mjs --puerto 8000 --seed 25 [--anchos 1440x900,390x844] [--salida <dir>]
```

Juega una carrera corta en Chromium (elige la primera opción de cada parada) y audita cada pieza distinta, cada acompañante, el
relato a 1× y los seis cuartos, a 1440 y a 390. Por cada nodo de texto visible calcula, con `getComputedStyle`, el color del
texto (con su alfa y el `opacity` de los ancestros) y el fondo efectivo (las capas de `background-color` de los ancestros,
componiendo alfas), y reporta los que no llegan, agrupados por selector y colores. Sale con código 1 si hay fallos. No mide
texto sobre una imagen ni sobre un degradado (usa solo el color de fondo), ni `::before/::after`, ni el `::backdrop` del
`<dialog>`; los controles deshabilitados o con `pointer-events: none` están exentos (WCAG). Los colores se arreglan **en
`tokens.css`**: se corre el script cada vez que se toca uno.

**Lo medido** (seed 25): antes, 286 nodos (41 patrones) en 1440 y 239 (32) en 390 no llegaban; casi todos eran `--ink-mute`
(#5e6a78, 3,25:1 sobre `--bg-raised`), que el juego usa para etiquetas, atajos y notas que sí se leen. Ahora `--ink-mute` es
#7a8a9c (misma tonalidad; 5,07:1 sobre `--bg-raised`) y quedan **76 nodos en 8-9 patrones**, todos de dos causas que un token
no arregla: (a) la magnitud de los chips de la previa (`.option-previa-kicker--magnitud-baja/media`, decision.css) se codifica
con `opacity` 0,55 y 0,8, y (b) el rojo `--danger` como texto (`--baja`, `.option-riesgo--ruleta`) sobre el relleno cian de la opción
en hover o elegida da 3,28:1 incluso a opacidad plena (más `.campeon-tile-ini` oxidado, `opacity` 0,45). Arreglarlo es una
decisión de diseño (otra codificación de la magnitud y un rojo de texto más claro), no un retoque de token. Los adornos de estado
(36 medidos a 1440) llegan todos.

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

**El orden vigente es la tabla de estado de `PLAN.md`** (fases 0 a 13), que es el único lugar que
se mantiene al día. Este documento describe la arquitectura, no el cronograma.

> **Actualizado el 2026-09-02.** Acá vivía la lista original de 11 pasos, escrita antes de que
> existiera `PLAN.md`. Quedó superada: agrupaba en un solo paso ("contratos, regiones y
> movilidad") lo que terminó siendo la fase 9 entera, y ponía el refinamiento visual al final
> cuando la regla de proceso 12 de `PLAN.md` dice lo contrario — *ninguna fase cierra sin su
> pantalla*. `PROGRESO.md` la usaba como eje y arrastraba el error, así que se cortó de raíz en
> los dos documentos a la vez.

## 7. Criterios de calidad

- El juego funciona sin UI.
- El mismo seed produce resultados idénticos.
- El balance mejora a través de simulación, no intuición aislada.
- Agregar eventos y sistemas no rompe el motor.
- Cada carrera ofrece múltiples finales y caminos posibles.
