# Progreso

Documento vivo. Se actualiza al cierre de cada tarea, según la Definición de terminado de CLAUDE.md.

## Estado por fase

**La tabla de estado vigente vive en `PLAN.md`**, y es la única que se mantiene al día. Este
documento es el changelog: qué se hizo, por qué, y con qué números medidos.

> **Reemplazada el 2026-09-02.** Acá había una tabla anclada a la lista de 11 pasos de
> `DISENO.md` §6, que quedó superada por las 13 fases de `PLAN.md`. Se había desincronizado tanto
> que se contradecía con su propio changelog cuarenta líneas más abajo: declaraba *"contratos,
> regiones y movilidad — ⬜ pendiente, no existen `contracts.js` ni `regions.js`"* cuando la fase 9
> ya había construido el mercado entero, y *"refinamiento visual — ⬜, `src/ui/` sigue vacía"*
> cuando la fase 8b la había llenado. Mantener dos tablas de estado garantizaba que una mintiera;
> ahora hay una sola. `DISENO.md` §6 se cortó en el mismo movimiento.

**Lo que falta para cerrar el arco de `CONCEPTO`**: el contenido que se cuela sin vestuario y los
`Math.random()` de los minijuegos (`PLAN.md` fases 9Ec y 9Ed — el varado de tier 3 ya está cerrado
en 9Ea+b), retiro y
tarjeta de legado (§9), movilidad entre regiones e imports (§6), rivales de generación corriendo
en paralelo (§6), las etapas DEBUT y DECLIVE (§2). El objetivo de contenido de §8 (150 opciones)
ya se superó — 97 eventos / 196 opciones tras la fase 8D —, aunque el catálogo completo de §8
(~200 eventos, con `equipo.json`/`vestuario.json`/`region.json`/etc.) sigue pendiente de la fase
13 real, que depende del mercado (9) y el retiro (10).

> **Nota documental (2026-09-02).** `AUDITORIA.md` y `TRASPASO.md` se borraron del repo: describían
> el estado del proyecto 28 commits atrás y ya se contradecían con el código. Lo que seguía vivo se
> mudó — la investigación de ligas/salarios/carreras a `CONCEPTO.md` §12 (conservando la
> numeración) y las trampas T1-T10 a `PLAN.md`. **Las citas a esos dos archivos en el changelog de
> abajo se dejaron intactas a propósito**: son historia, un changelog citando documentos que
> existían cuando se escribió. Los originales siguen en git (`git show 3d6ee90:AUDITORIA.md`).

## Changelog

### 2026-09-05 — Fase 9R4b: el cupo se reparte (el internacional y el mapa 5)

Segundo commit de **9R.4**. Un solo cupo de minijuego por serie tapaba los dos momentos más
grandes del juego. Ahora son tres cupos y cada uno cubre lo suyo.

#### Los dos agujeros, medidos

1. **El bootcamp se comía el internacional entero**: se dispara al clasificar, antes del primer
   mapa, y gastaba `serie.minijuegoUsado`. Resultado medido antes de este commit: **0 de 643
   internacionales** tenían una jugada dentro de un mapa o rueda de prensa. La serie más grande del
   juego se resolvía sola.
2. **El mapa que define podía pasar sin una sola jugada tuya**: o el cupo ya se había gastado en el
   mapa 2, o el mapa no entraba en "cerrado" (`margenMapaCerrado: 8`) por unos puntos. Es
   exactamente el momento que `PLAN.md` §9R.4 pide que exista ("el Barón de un mapa 5").

#### Qué entra

- **Tres cupos** en `state.serie` (trampa T4, todos `false` al iniciar la ronda): `preSerieUsado`
  (el bootcamp), `minijuegoUsado` (el mapa normal y la rueda de prensa, como hasta ahora) y
  `decisivoUsado` (el mapa de desempate). `systems/serie.js` los gasta con `cupoGastado(momento)`.
- **`esMapaDeDesempate(marcador, formato)`** en `core/serie.js`, nueva y distinta de
  `esMapaDecisivo`: el desempate es el **último mapa posible**, con los dos equipos en punto de
  partido (2-2 en un Bo5, 1-1 en un Bo3). `esMapaDecisivo` incluye el 2-0 de un barrido, que según
  la regla 4 de §4.6 justamente **no** merece minijuego.
- **`esMapaCerrado` toma el margen por parámetro** y el desempate usa
  `margenMapaCerradoDecisivo: 22` contra el `margenMapaCerrado: 8` de un mapa cualquiera. Un 3-0 no
  tiene minijuego; un mapa 5 lo tiene casi siempre.

**Primera versión descartada, y por qué**: el mapa "decisivo" se ató primero a cualquier match
point. Medido, disparaba **1.413 veces** en 300 carreras (los minijuegos pasaban de 5,7% a **11,8%**
de las decisiones, mediana por carrera 3 → 6, p90 17 → 39) porque toda serie tiene un match point,
barridos incluidos. Atarlo al desempate real lo baja a **304** y lo deja donde el plan lo pedía.

#### Números medidos (300 carreras × 60 splits, misma sonda que 9R4a)

| Métrica | Antes de 9R.4 | Ahora |
|---|---|---|
| Minijuegos / decisiones | 5,71% | **8,52%** |
| Minijuegos por carrera | mediana 3 · p90 17 · máx 28 | mediana **3** · p90 **26** · máx **46** |
| Internacionales con algo más que el bootcamp | **0 de 643 (0%)** | **629 de 629 (100%)** |
| — de esos, con jugada dentro de un mapa | 0% | **47,4%** |
| — con rueda de prensa | 0% | **53,7%** |
| Mapas de desempate (en semis/final/internacional) con jugada | — | **304 de 323 (94,1%)** |
| Decisiones por carrera | mediana 115 · p90 147 | mediana **115** · p90 **149** |

El volumen total de decisiones no se movió (115 de mediana): lo que se agregó son minijuegos, que
entran en lugar de resolverse solos, no decisiones nuevas encima de las que había.

#### Checks nuevos (2), los dos verificados en rojo

1. **"El internacional tiene su jugada, no sólo el bootcamp"**: ≥90% de los internacionales ven un
   minijuego que no es el bootcamp (medido: 100%). *Verificado en rojo* haciendo que el bootcamp
   vuelva a gastar el cupo de la serie → cae a **13%** y falla.
2. **"El mapa 5 es el mapa 5"**: `esMapaDeDesempate` distingue el desempate del match point
   cualquiera, el margen ancho cubre lo que el normal rechaza, y **ninguna pausa de `mapa_decisivo`
   sale con un marcador que no sea el desempate** (200 carreras). *Verificado en rojo* volviendo a
   `esMapaDecisivo` → falla en la seed 2 con marcador 0-2.

#### Verificación

`validate.js` **123/123 OK, 0 FAIL** · `simulate.js 1000 60 todas` **0 crashes** · determinismo
intra-versión **150/150** · `npm run build` OK (**1124 KB**, techo 1200).

**Trampa T1**: hay más minijuegos, y cada uno consume una tirada en `resolverAuto`. Ninguna seed
anterior reproduce su carrera; el determinismo intra-versión queda intacto.

### 2026-09-05 — Fase 9R4a: el minijuego es dato (cierra D20)

Primer commit de la fase **9R.4**. Estructura pura: ningún minijuego cambia lo que hace, cambia
**de dónde sale lo que hace**.

#### El diagnóstico, re-medido antes de tocar nada (trampa T6)

`PLAN.md` §9R.4 decía *"disparan en el 3,7% de las decisiones"* — un número del 2026-09-02,
anterior a 9R0b y a T6. Medido hoy sobre `HEAD`, 300 carreras × 60 splits:

| Métrica | Medido |
|---|---|
| Minijuegos / decisiones | 1.724 de 30.208 = **5,71%** |
| Minijuegos por carrera | mediana **3**, p90 **17**, máx **28** |
| Carreras que no ven ninguno | **29,3%** |
| Reparto | `bootcamp` 643 · `la_llamada` 574 · `la_prueba` 204 · `robar_baron` 159 · `rueda_de_prensa` 144 |
| Internacionales con jugada dentro del mapa | **0 de 643** |
| Impacto agregado (siempre acierta vs. siempre falla, N=400) | **+7,49%** en títulos+internacionales |

Las dos filas que ordenan la fase: el **bootcamp se come el cupo del 100% de los internacionales**
(se dispara antes del primer mapa y `serie.minijuegoUsado` es uno por serie), y **cuatro de los
cinco roles juegan siempre lo mismo** — `robar_baron` es del jungla y todo el resto cae en
`la_llamada`. Las dos se arreglan en 9R4b y 9R4c; este commit prepara el terreno.

#### Qué entra

`minijuegos.json` eran **5 stubs de tres campos** (`id`/`titulo`/`descripcion`). Todo lo que
importa —a quién le toca, qué stat lo corre, cuánto mueve, qué se lee al terminar— vivía hardcodeado
en `systems/serie.js`, `systems/amateur.js` y, duplicado, en `ui/components/minijuegos/index.js`.
Ahora es dato:

```json
{ "id": "robar_baron", "momentos": ["mapa_cerrado", "mapa_decisivo"], "roles": ["jungla"],
  "statRelevante": "mecanica", "efecto": { "tipo": "mapa" }, "impacto": 0.12, "spread": 0.2,
  "titulos": [3 variantes], "descripciones": [3], "apuesta": "…", "veredictos": { … } }
```

- **`src/core/minijuegos.js`** (nuevo, puro, **cero RNG**): `minijuegosPara` (filtra por momento y
  rol), `elegirMinijuego` (determinista por `hashCadena`, con anti-repetición sobre
  `flags.minijuegosRecientes` — misma forma que `motivosFechaRecientes` de 9R0a),
  `textoDeMinijuego`, `veredictoDeMinijuego`, `registrarMinijuegoVisto`.
- **`systems/serie.js`**: `construirDecisionMinijuego(state, id, stat, …)` → `pausaDeMinijuego(state,
  momento, …)`. `resolver` conmuta por **`efecto.tipo`** (`mapa` / `stat` / `roster`), no por el id:
  agregar una mecánica al catálogo ya no toca este archivo. Los efectos de stat declaran su target
  en el dato (`player.stats.mentalidad`, `career.sinergia`) y el motor los aplica sin saber cuál es
  cuál. `resolverAuto` lee el `spread` del dato.
- **`systems/amateur.js`**: la_prueba sale del catálogo por el momento `tryout`, con su stat y su
  impacto propios.
- **`ui/components/minijuegos/index.js`**: la tabla `RESULTADO_MINIJUEGO` (9R0b) se borra y
  re-exporta `veredictoDeMinijuego` del core. Había **dos** tablas de frases para lo mismo, y podían
  quedar diciendo cosas distintas: la UI mostraba una y el log del motor imprimía otra dos líneas
  después.
- **D20 cerrada**: `impactoMinijuego` / `impactoDirecto` / `impactoLaPrueba` / `minijuegoSpread` se
  van de `balance.js` (eran dos parámetros genéricos para cinco minijuegos). Quedan las dos
  constantes que sí son del reparto y no de un minijuego: `minijuegoCooldownSplits: 3` y
  `veredictoMinijuego: { bien: 0.72, parejo: 0.42 }` (los cortes que 9R0b tenía hardcodeados).
- **Variación léxica** donde no había nada: 3 títulos + 2-3 descripciones + 2 frases por nivel de
  veredicto en cada entrada. Se eligen con el mismo hash determinista de 9R3a — **no tocan el RNG**.

#### Herramienta nueva: `validate.js --solo=<texto>`

Corre sólo los checks cuyo nombre contiene el texto. La corrida completa tarda ~7 minutos (D32), y
la regla de proceso 7 (*"al escribir un check nuevo, verificar que falla cuando debe"*) costaba
siete minutos por intento. Con esto, segundos. Es tooling: sin la bandera, `validate.js` corre
exactamente lo que corría.

#### Checks nuevos (4), los tres primeros verificados en rojo

1. **Esquema de 9R4a**: momentos válidos, roles válidos, `statRelevante` que exista en
   `player.stats`, `efecto.tipo` válido, targets que existan en `createInitialState` (trampa T4),
   `impacto`/`spread` numéricos, ≥3 títulos, ≥2 descripciones, `apuesta` y los tres veredictos.
   *Verificado en rojo*: sacándole la apuesta a `robar_baron` → FAIL.
2. **Todo minijuego tiene su widget y todo widget su entrada** — el hueco que nadie verificaba: un id
   nuevo sin `montar` no rompe ningún check, rompe la partida en el navegador con el panel en blanco.
   *Verificado en rojo*: agregando `sin_widget` al catálogo → FAIL.
3. **`elegirMinijuego` es determinista, respeta el rol y no consume RNG.**
   *Verificado en rojo*: metiéndole una llamada al `rng` adentro → FAIL ("consumió RNG, trampa T1").
4. **El veredicto y la apuesta salen del mismo dato que consume el motor**: los tres niveles ordenan
   (1 → bien, 0,5 → parejo, 0 → mal) y ninguno queda sin frase.

#### Números medidos después del cambio (misma sonda, N=300)

| Métrica | Antes | Después |
|---|---|---|
| Minijuegos / decisiones | 5,71% | **5,69%** |
| Minijuegos por carrera | mediana 3 · p90 17 | **igual** |
| `robar_baron` | 159 | **81** |
| `la_llamada` | 574 | **647** |

Estructura pura, como se esperaba: lo único que se movió es que **el jungla ya no juega siempre el
Barón** — ahora comparte el momento del mapa con la llamada y la anti-repetición alterna entre las
dos. Es el primer efecto visible del catálogo, y va en la dirección de la fase.

#### Verificación

`validate.js` **121/121 OK, 0 FAIL** · `simulate.js 1000 60 todas` **0 crashes** (las tres
estrategias) · determinismo intra-versión **150/150** · `cobertura.js --huecos` sin huecos ·
`npm run build` OK (**1121 KB**, techo 1200).

**Trampa T1, anotada:** el minijuego que toca en un mapa cerrado ahora puede ser otro (el jungla
alterna Barón/llamada), así que **ninguna seed anterior reproduce su carrera**. El determinismo
intra-versión queda intacto y la elección **no** consume RNG: el corrimiento viene de qué
minijuego se juega, no de cuántas tiradas se gastan.

### 2026-09-04 — Fase T8: la página como página (cierra la fase T)

El último bloqueante real de publicar: el guardado (P.2), la seed en la URL (P.3), la página como
metadata (P.4), y el repo como repo (P.5). Con esto cierra toda la fase T (T0→T8, nueve commits).

#### El único cambio de motor de la fase T, verificado dos veces

`mulberry32` gana `.estado()`/`.restaurar(n)` — puramente aditivo, `state` sigue siendo la única
variable que gobierna la secuencia. Verificado con dos chequeos independientes, no uno:

1. **Restaurar reproduce exacto**: 5 seeds, cada una corrida de dos formas — de corrido (20
   números) vs. interrumpida (10 números, `estado()`, un objeto `mulberry32` NUEVO —
   simulando recargar la página — `restaurar()`, 10 números más). Las dos secuencias, idénticas
   en las 5 seeds.
2. **Las seeds viejas no divergen**: 12 seeds, huella `finAnticipado:splits:soloqElo`, motor actual
   vs. `git archive HEAD` (el motor tal cual estaba commiteado, antes de este cambio). Cero
   divergencias.

`core/guardado.js` (puro: `serializar`/`deserializar`, clave `version`, guarda también
`rngUiEstado` para que los minijuegos no repitan tirada al continuar) + `src/ui/almacenamiento.js`
(el `localStorage`, mejor esfuerzo). Se guarda al cerrar cada split; se borra al terminar la
carrera o al arrancar una nueva a propósito. "Continuar" en el setup, visible solo si hay de
verdad algo guardado.

**Verificado con una recarga de página real** (no simulada): jugar unos splits, `Page.navigate` de
nuevo a la misma URL (el equivalente exacto de un F5), confirmar que "Continuar" aparece, clickear,
y confirmar que el nivel/splits de la ficha son IDÉNTICOS a los de antes de recargar. Coincidieron.

#### Un bug real y preexistente, destapado por P.3

`?seed=N` en la URL requiere que la página cargue de verdad con un querystring — algo que hasta
esta fase nadie había hecho nunca (la seed siempre se tipeaba en el input). Al probarlo:
`server.js` devolvía 404 para cualquier URL con `?algo`. La causa: `req.url === '/'` se comparaba
CONTRA el querystring todavía pegado (`'/?seed=424242' !== '/'`), así que la rama que sirve
`index.html` nunca se activaba y el código quedaba tratando de leer un archivo llamado `/` (la
carpeta). **El link que arma T7 nunca había funcionado** — no por T7, sino porque nadie lo había
abierto de verdad hasta ahora. Corregido: cortar el `?` primero, decidir si es la raíz después.

#### Qué más entra

- **P.4**: `description`, Open Graph + Twitter card, favicon (SVG inline con el monograma del
  topbar — cero archivo binario nuevo). **Sin imagen propia**: no hay manera en este entorno de
  producir un archivo de imagen real sin tocar el controlador de producción solo para exponerle
  `estado`/`modulos` a una captura automatizada, y el plan pide autoría a mano, no un headless en
  el build. Declarado pendiente, no silenciado.
- **P.5**: `README.md` (cómo correrlo, cómo está armado, el descargo de proyecto de fan) y
  `LICENSE` (MIT).
- **`build.js`**: nuevo check de capitalización para `url()` de CSS y `<link href>` de HTML — la
  misma trampa que P.7 ya cubría para imports de JS, sin cubrir todavía porque no había CSS hasta
  la fase T. Al escribirlo salió un falso positivo real: el grano de `base.css` es un SVG en un
  `data:` URI que trae su propio `url(%23n)` interno (un filtro), y el regex —sin saber que estaba
  anidado en OTRO `url("data:...")`— lo leía como una ruta de archivo rota. Se filtran los
  especificadores que empiezan con `#`/`%23`. Verificado que el check agarra un caso real
  (capitalización rota a mano → build falla; restaurada → pasa).

#### Verificación

`validate.js`/`simulate.js 1000`/build: ver el cierre del commit. Recorrida CDP a los 5
breakpoints: cero errores, cero desborde, y ahora "peticiones fallidas: ninguna" (antes había un
404 esperado de `favicon.ico`, que el favicon SVG inline eliminó del todo).

### 2026-09-04 — Fase T7: la tarjeta final, el PNG y el link

Exportar a PNG y copiar el link de la carrera, más los 5 marcos de verdad para la tarjeta de
legado — que resultó estar más avanzada de lo que el plan asumía.

#### Lo que ya existía, medido antes de escribir código

`src/ui/screens/tarjeta.js` no era una pantalla nueva: la fase 9R5b ya la había escrito, con
`TITULO_MARCO` (5 títulos + ícono, uno por `finAnticipado`: `retiro_elegido`, `sin_equipo`,
`burnout`, `no_llego`, `prohibicion_familiar`), veredicto y la historia org por org reusando
`filaHistoria`. Lo que el CSS real mostraba, sin embargo, eran solo **2 tonos** —
`.tarjeta--exito`/`.tarjeta--sobria` — así que el mundialista y el pibe al que no lo dejaron jugar
sí compartían marco visual cuando ninguno de los dos era "éxito", aunque el título ya fuera
distinto. Esa es la brecha real que cerró T7, no una pantalla desde cero.

#### Qué entra

- **`pantallas.css`**: 5 colores de borde por `data-marco` (`--live`/`--warn`/`--danger`/
  `--line-strong`/`--cat-familia`). `.tarjeta--exito` pasó a `.tarjeta.tarjeta--exito` (dos clases
  juntas) para no perder por especificidad contra `.tarjeta[data-marco]` — mismo tipo de trampa
  que el `:where(button)` de T0b, esta vez al revés (había que GANAR especificidad, no perderla).
- **`src/ui/exportar.js`** (nuevo): `dibujarTarjeta(state, modulos)` — canvas 1200×630, fondo en
  capas (mismo lenguaje que el shell: viñeta + malla), banda superior y borde del color del
  marco, lockup, identidad, veredicto con ajuste de línea a mano, totales, seed. Los colores se
  leen de los tokens vía `getComputedStyle` en vez de duplicarlos en hex. `descargarTarjeta`
  (`toBlob` → `<a download>`) y `copiarTarjeta` (`navigator.clipboard.write` con `ClipboardItem`,
  `false` si no está disponible — el llamador cae a la descarga). `linkDeCarrera`/
  `copiarLinkDeCarrera` arman y copian `?seed=N`.
- **`tarjeta.js`**: tres botones nuevos al pie (copiar imagen, bajar imagen, copiar link), cada
  uno con confirmación visual temporal en el propio botón (`¡Copiada!`, `¡Bajada!`, `¡Copiado!` —
  o el link crudo como texto si el portapapeles no está disponible, en vez de fallar en silencio).

**Split a propósito con T8**: el botón de esta fase arma y copia `?seed=N`; que abrir ese link
precargue la seed es trabajo de T8 (`leerSeed()` hoy solo mira el input, no la URL).

#### Verificación

Carrera completa por CDP hasta la tarjeta final (seed 99, `no_llego`): marco gris correcto
(`--line-strong`), los 3 botones renderizados. "Bajar imagen" → pipeline completo (canvas → blob →
`URL.createObjectURL` → click) sin una sola excepción, confirmado en el propio navegador con la
carrera real. "Copiar link" → en Chrome headless sin permiso de portapapeles, cayó al fallback
(mostró `http://localhost:8000/?seed=99` en el botón) exactamente como está diseñado — no un error
silencioso. Cero errores de consola en la corrida completa.

### 2026-09-04 — Fase T6: el partido y la serie como transmisión

Tarjeta de resultado de fecha, barra de bracket, el camino Fearless mapa a mapa, y los 5
minijuegos migrados fuera de `index.html`. Cero motor — el único cambio de motor de toda la fase T
sigue siendo T8, sin tocar todavía.

#### Otro campo que no era lo que el plan decía

El plan original suponía un "motivo de la fecha" leíble después de resolver. No existe:
`systems/temporada.js` arma la frase completa en un solo log `type:'temporada'` y **nunca deja el
motivo en un campo separado** — `fechaEnCurso` (donde vivía antes de resolver) se pone en `null`
en el mismo golpe que resuelve la fecha. Escribirlo en algún lado sería tocar `systems/`.

La tarjeta se armó con lo que sí persiste sin tocar nada: `calendario[indice - 1]` (rival, fuerza,
local/visitante — la fecha recién jugada), el signo de `racha` (victoria/derrota), la tabla
derivada en vivo (posición — mismo hallazgo de campo muerto que T5), y el `message` completo del
log tal cual, sin re-parsearlo, como cuerpo de la tarjeta.

#### Un bug real encontrado por probar, no por leer

`etiquetaDeRonda` lo importé de `core/temporada.js` — está en `core/serie.js`. La recorrida CDP lo
agarró al toque: `SyntaxError: the requested module '../../core/temporada.js' does not provide an
export named 'etiquetaDeRonda'`, página en blanco. Corregido antes de seguir.

#### Qué entra

- **`src/ui/components/serie.js`** (nuevo): `crearTarjetaResultado(entry, state)` — reemplaza el
  log plano de `type:'temporada'` por una tarjeta con cabecera (GANARON/PERDIERON, rival, lectura
  de fuerza) y pie (posición, racha). `renderSerieContexto(container, state)` — el bracket
  (`CUARTOS DE FINAL · SEMIFINAL · LA FINAL`, `etiquetaDeRonda` de `core/serie.js`; la ronda
  `'internacional'` se muestra sola) + el marcador + el camino mapa a mapa con los quemados.
- **`reproductor.js`**: `reproducirBeats` gana un parámetro `state` — cuando una entrada nueva es
  `type:'temporada'`, arma la tarjeta en vez del log-item genérico.
- **`src/ui/components/minijuegos/{robarBaron,laLlamada,bootcamp,ruedaDePrensa,laPrueba}.js`**
  (nuevos) + `index.js` (barrel, mismo patrón que `render.js`): el código migró tal cual desde
  `index.html`, con un cambio: `rngUi` entra como **cuarto parámetro explícito** — vivía en el
  closure del controlador, y movidos a sus propios módulos ya no hay closure que compartir. Es
  mejor práctica que la alternativa (importar un singleton), y "contrato intacto" se cumple en lo
  que importa: la forma `(container, state, onDone) → onDone(0..1)`.
- **`formatoUi.js`**: `etiquetaDeFuerza` se extrajo de `calendario.js` (T5) para reusarla acá.
- **`tokens.css`**: `--up-fill`/`--down-fill` (relleno tenue para el camino de la serie — mismo
  criterio que `--live-fill`/`--gold-fill`/`--warn-fill`).

#### Verificación

Carrera completa por CDP (seed 1, instantáneo, 250 pasos, 39 splits jugados): pasó por decisión,
mercado, minijuego (los 4 tipos de widget probados — botón simple, slider, cards, blanco móvil,
todos sin error) y serie de playoffs, hasta la tarjeta de legado final. Capturado el bracket en
plena semifinal: "CUARTOS DE FINAL" en verde (superada), "SEMIFINAL" en cyan pulsando (actual),
"LA FINAL" en gris; marcador 1-0, "M1 Ornn" en verde, quemados "Malphite, Ornn, Jax"; el minijuego
La Llamada corriendo debajo, y una tarjeta de resultado "GANARON @ FLUXO W7M · DÉBIL · 2º de 8 ·
Racha de 6 triunfos" más abajo en el feed. Cero errores de consola en toda la corrida.
`validate.js`/`simulate.js`/build: ver el cierre del commit.

### 2026-09-04 — Fase T5: el riel de contexto

Cinco paneles nuevos en una tercera columna del shell — tabla, calendario, plantilla, meta,
generación —, todos con datos que el motor ya calculaba desde hace fases y que hasta hoy no se
veían en ningún lado. Cero motor.

#### Un campo muerto real, encontrado jugando

`career.temporada.tabla` parecía la fuente obvia para el panel de Tabla — hasta que jugar una
carrera de verdad mostró el panel vacío toda la temporada regular. Grep confirmó por qué:
`avanzarFechaSilenciosa` (`systems/temporada.js`) actualiza `registrosOtros`/`filaPropia`/`indice`
cada fecha, pero **nunca escribe `.tabla`** — ese campo se llena una sola vez, al cerrar la
temporada, en el mismo golpe que pone `activa: false`. Leerlo tal cual habría sido un panel vacío
toda la temporada y, la única vez que tiene datos, ya no corresponde mostrarlo.

El arreglo: el panel deriva la tabla en vivo con `tablaDePosiciones(registrosOtros, filaPropia)` —
la misma función pura de `core/temporada.js` que `systems/temporada.js` ya usa para el texto del
log de cada fecha ("Quedan Xº de Y"). Cero línea de motor tocada; solo se dejó de leer un campo
que nunca tuvo datos útiles durante la temporada.

#### Qué entra

- **`src/ui/paneles/{tabla,calendario,plantilla,meta,generacion}.js`** (nuevos): un render puro
  por panel, cada uno oculta su contenedor si no hay dato real (amateur no tiene tabla ni
  plantilla; meta/generación sí existen desde el split 1).
  - Tabla: la liga ordenada, fila propia resaltada, línea punteada de corte de playoffs (verde) y
    de cupos internacionales (oro) — de `liga.formatoPlayoffs.clasifican`/`cuposInternacionales`.
  - Calendario: el fixture completo, jugadas atenuadas, la de hoy resaltada, las que vienen con
    una lectura cualitativa de la fuerza del rival (favorito/parejo/débil) — nunca un resultado
    inventado para fechas ya jugadas, el fixture no guarda eso por fecha (regla 15).
  - Plantilla: los 4 compañeros con rol y nivel, sinergia como barra.
  - Meta: el régimen vigente (`data/metas.json`, `nombre`+`descripcion`) y las primeras 8 entradas
    de la tier list S/A/B/C, con el pool del jugador resaltado en oro donde coincide.
  - Generación: los 5 rivales de `mundo.rivales` (deuda D8) — handle, rol, liga; `desenlace` los
    reemplaza cuando el cierre de su carrera lo complete (fase 9M/11, todavía no corre).
- **`carrera.js`**: nuevo `renderRielContexto(elements, state, modulos)`, orquesta los 5 — mismo
  patrón que `renderCarrera` con la ficha y el feed.
- **`shell.css`**: la grilla pasa de dos a tres columnas **solo cuando hay contenido real**
  (`:has(.riel-der > .panel-contexto:not([hidden]))`), sin que el controlador tenga que togglear
  una clase en cada render. El breakpoint de 899px necesitó repetir el mismo `:has()` en su propio
  override — la versión con `:has()` tiene más especificidad que un `.shell-cuerpo` a secas, así
  que sin repetirlo le ganaba al layout de una columna en mobile (misma familia de trampa que el
  `:where(button)` de T0b).
- **`index.html`**: `volverAlInicio()` ahora oculta los 5 paneles explícitamente — sin eso, la
  columna se quedaba desplegada con datos de la carrera anterior mientras el setup estaba arriba.

#### Verificación

Jugada una carrera completa por CDP (seed 1, instantáneo): los 5 paneles aparecieron con datos
reales en el orden esperado (meta/generación desde el split 1, plantilla al fichar, calendario al
arrancar la temporada, tabla recién en la primera fecha jugada — coherente con que se deriva en
vivo). Capturado a 1600px y 1180px: la tercera columna se despliega sin desborde en ninguno de los
dos anchos, cero errores de consola. Recorrida CDP completa a los 5 breakpoints, sin regresiones.

### 2026-09-04 — Fase T4: la decisión con jerarquía

Adelanta la mitad visual de la fase 12 — banner por categoría y peso bisagra/cierre/normal —
porque los cables ya estaban tendidos y no costó una línea de motor. Dos cosas que la versión
vieja de este bloque en `PLAN.md` decía mal, corregidas *antes* de escribir código (no después):

#### Lo que medí antes de tocar nada

1. **"21 valores de `category`" era falso.** Grep real sobre `src/data/events/**/*.json`: son
   **21 archivos**, pero solo **18 valores distintos** de `category` (`estatus.json` y
   `marcas_vivas.json` comparten `identidad`; `competicion.json` y `escena_2026.json` comparten
   `competicion`). La cifra vieja confundía archivos con valores.
2. **El peso "ambiente" no correspondía a ningún campo real.** No hay un tercer nivel en el modelo
   de datos. Los dos pesos reales: `evento.bisagra` (booleano) y `franja === 'cierre'` (lo pone
   `systems/edadCierre.js`). Se corrigió a dos pesos, no tres.

#### Qué entra

- **`src/ui/formatoUi.js`** (nuevo): `familiaDeCategoria(category)` mapea los 18 valores a 11
  familias sobre los tokens `--cat-*` de T0 (rol_\* → "Tu línea"/rutina, partido_\* → "Partido",
  `pool` → "Pool"/parche, `drama_prensa` → "Prensa", `negocios` → "Negocios"/mercado, etc. — tabla
  completa en el archivo). `pesoDeDecision(decision)` deriva bisagra/cierre/normal.
- **`decision.js`**: fija `data-tab-label` + una custom property `--tab-color` (con
  `element.style.setProperty`) que la pestaña de T0b ya sabía leer con un cambio mínimo de CSS
  (`content: attr(data-tab-label)` en vez de texto fijo). Solo aplica a decisiones de
  `systems/events.js` (la única fuente que arma `datos: { evento }`) — las de `temporada.js`
  (fecha marcada) y `amateur.js` (rutina semanal) caen al banner genérico "Decisión", documentado
  como el límite real de no tocar motor.
- **`pantallas.css`**: `[data-peso="bisagra"]` — borde más grueso en el color de la categoría, glow,
  y una marca de agua del label al 6% de opacidad detrás del texto. `[data-peso="cierre"]` — reusa
  el oro de "hito" de la ficha, rótulo "Fin de año". Cada `.option-btn` gana un atajo visible
  (`.option-atajo`, un cuadrado con 1-4) — `shell.js` los escucha desde T1, pero hasta esta fase
  el atajo era invisible en pantalla.
- **No entró**: "el dado trajo tres caminos" (regla 16) generalizada — es redacción de la
  `descripcion` de cada evento, no algo que la UI arme sola. Es trabajo de contenido (JSON), no de
  esta fase; queda para una auditoría de copy en conjunto.

#### El candado, ajustado

`guards.js`'s "todo `var(--token)` tiene que estar definido en `tokens.css`" daba un falso
positivo con `--tab-color` (una custom property que fija JS, no un token de diseño). Se corrigió
para exigir definición solo a `var(--x)` **sin** fallback — `var(--x, algo)` con fallback queda
exento, que es justo el patrón que este mismo cambio introdujo. Auditado: es el único caso en el
CSS actual, cero riesgo de esconder un typo real.

#### Verificación

Una carrera completa por CDP (seed 1, instantáneo) recorriendo cada decisión y registrando
`data-tab-label`/`data-peso`/color computado: **8 combinaciones distintas vistas**, todas
correctas contra la tabla de `formatoUi.js` — incluida `Pool|bisagra|rgb(169,123,255)` (el morado
de `--cat-parche`) y `Fin de año|cierre|rgb(255,200,97)` (oro). Capturada una decisión bisagra
real ("Se te enfrió Ornn", `pool.json`): borde grueso morado con glow, marca de agua "POOL" visible
detrás del texto, atajos "1"/"2" en las tarjetas. Recorrida CDP a los 5 breakpoints sin errores.

### 2026-09-04 — Fase T3: el escenario y el reproductor

El cambio de sensación más grande de la fase T hasta acá. Antes, `avanzar()` corría splits en un
`for` hasta que algo interrumpía y pintaba todo junto al final — un salto con ocho líneas de log
ya escritas, en un juego cuyo compás propio (`CONCEPTO` §2) es "cada split trae 1 o 2 decisiones,
nunca más". Ahora cada línea entra al feed una por vez, con pausa entre beats.

#### A diferencia de T1, esta fase sí toca el controlador

`avanzar()`/`responder()` (el `<script>` de `index.html`) pasan a `async`. Es la pieza dueña de
CUÁNDO se pisa el split siguiente — exactamente lo que cambia. Se agregó `correrSplits()` como
núcleo sin guardia (lo llaman los dos wrappers), y una guardia `reproduciendo` a nivel módulo para
que dos invocaciones no se solapen si el jugador dispara dos veces mientras el reproductor todavía
está revelando la tanda anterior. El motor no se toca: `pipeline.avanzarSplit`/`resolverDecision`
se llaman exactamente igual, mismo `rng`.

#### Qué entra

- **`src/ui/reproductor.js`** (nuevo): `reproducirBeats(logList, nuevasEntradas, opts)` inserta
  cada entrada nueva una por vez (`insertBefore` al frente — mismo orden "más reciente primero"
  que `renderFeed`), recorta al límite de 8 al terminar. Espera `--dur-beat` (700ms, el token que
  T0 ya había dejado escrito "para el pulso del reproductor de T3") en `x1`, la mitad en `x2`, nada
  en `instantáneo` — y tampoco espera con `prefers-reduced-motion: reduce`, sin depender de que el
  jugador toque el toggle.
- **`feed.js`**: `crearLogItem(entry)` extraído del `.map()` de `renderFeed` — el reproductor
  necesita crear el mismo nodo de a uno, no todos juntos.
- **`src/ui/sonido.js`** (nuevo, ~105 líneas): sintetizador WebAudio sin un solo archivo de audio
  — osciladores + envolvente de ganancia. `click` (delegado en `document` desde `shell.js`, en
  cualquier `<button>`), `tick` (un beat), `victoria`/`derrota` (leídos de los contadores de
  `career.registro` antes/después del split — no hay campo booleano en el log, el resultado vive
  en la prosa), `swellBisagra` (`decision.datos.evento.bisagra`, ya existía antes de T4),
  `arpegioTitulo` (exportado, sin disparador — espera la tarjeta de T7). Apagado por defecto,
  preferencia en `localStorage`, `AudioContext` creado en el primer click real sobre el toggle.
- **Topbar**: los dos toggles inertes de T1 cobran vida — velocidad (`1× → 2× → ⚡`, cíclico) y
  sonido (`🔇 ⇄ 🔊`), ambos persistidos.

**Tres recortes de alcance, escritos en `PLAN.md` antes de cerrar la fase** (no en el momento):
sin icono/color por `log.type` (D41 sigue abierta), los `tecnico:true` no se agrupan en tira
compacta, y no hay skip por beat individual — el control de ritmo quedó a nivel de velocidad
(`instantáneo` es el skip). `type:'temporada'` como tarjeta de resultado es de T6, no de acá; la
frase original del plan lo mencionaba en T3 por error, corregido.

#### Verificación

Recorrida CDP a 1440/1180/900/640/390: sin errores, sin desborde. **Los toggles, clickeados de
verdad**: velocidad `1× → 2× → ⚡`, sonido `🔇 → 🔊`, confirmado por `textContent` antes/después de
cada click. **Teclado con el flujo async nuevo**: Espacio arranca, "1" elige, mismo log resultante
que en T1 para la misma seed — determinismo intacto. **Una carrera completa jugada por CDP** con
mercado y minijuegos, en velocidad `instantáneo`: firma contrato, cero errores de consola — la
primera corrida a velocidad `x1` por default pareció trabada, pero era la propia pausa de 700ms/
beat venciendo el `dormir(350)` del script de test, no un bug del juego (diagnosticado cambiando
el script a velocidad instantánea antes de jugar, que resolvió el falso síntoma al toque).

**Trabajo concurrente**: otra sesión tenía sin commitear `salarios.js`, `state.js`,
`valorMercado.js`, `balance.js`, `roles.js`, `validate.js`, `amateur.js`, `mercado.js` (D33: la
redirección de los 13 comentarios `TRASPASO.md §4` → `CONCEPTO.md §12`) y una edición chica de
`PLAN.md` (cerrando D33 en la tabla de deuda) cuando terminé T3. Ningún archivo de motor es mío en
este commit — verificado igual que en T2, con un sandbox aislado (`git archive HEAD` + solo mis
archivos de `src/ui/` e `index.html`): **117/117 OK**, determinismo intacto, `simulate.js 1000` sin
crashear, build con `dist/` bajo el techo. El diff de `PLAN.md` que entra en este commit incluye
la línea de cierre de D33 de la otra sesión — se dejó así a propósito (separar un archivo de texto
en dos commits por un cierre de dos líneas no vale la fricción) y queda declarado acá.

### 2026-09-04 — D33: los 13 comentarios que citaban TRASPASO.md se redirigen

Workstream DOCS (paralelo, no bloquea — `PLAN.md`). `TRASPASO.md` se borró el 2026-09-02; la
investigación que citaba se mudó a `CONCEPTO.md §12` conservando la numeración, pero nadie había
ido a actualizar los comentarios de `/src` que seguían apuntando al archivo muerto.

- 13 comentarios en `salarios.js`, `state.js`, `valorMercado.js` (×3), `balance.js` (×3),
  `roles.js`, `validate.js` (×2), `amateur.js`, `mercado.js` — exactamente los que listaba la
  entrada D33 de la tabla de deuda técnica.
- Donde el comentario original ya tenía sub-número (`§4.2`, el caso Calix) se conservó
  (`§12.2`). Donde no lo tenía, se verificó contra el índice real de `CONCEPTO.md §12` (12.1
  ranked, 12.2 scouting, 12.3 estructura competitiva, 12.4 duración/declive, 12.5 pool/Fearless,
  12.6 salarios) y se agregó el sub-número solo cuando el tema calzaba exacto (declive → 12.4,
  edad mínima de liga → 12.3, lognormal de salarios → 12.6); el resto quedó en `§12` a secas para
  no inventar un mapeo que no podía verificar.
- Se soltaron los artefactos que no viajan de un archivo al otro: "líneas 560-660" e "imagen 15"
  eran referencias a la posición del dato DENTRO de `TRASPASO.md`, sin equivalente en
  `CONCEPTO.md`.
- `grep -r TRASPASO src/`: 0 resultados. Puro comentario, cero cambio de lógica ejecutable.
- `validate.js`: 118/118 OK (mismo resultado que antes del cambio, como corresponde a un cambio
  que no toca una sola línea de código). Cierra **D33** en `PLAN.md`.

### 2026-09-04 — Fase 9ML.a: otras ligas vivas (digest anual)

Primera pieza de **9M-lite** (`PLAN.md`, decisión del usuario de ir liviano en vez del sim de ~340
NPCs de la FASE 9M completa). El resto de la cola de 9R (9R.4, fase 12, 9Rg completo) tiene
superficie de UI que hoy colisiona con la sesión concurrente que está en plena Fase T (T0→T2); esto
no: es motor y datos puros, cero `src/ui/`.

#### Qué entra

- **`src/core/escena.js`** (nuevo, puro): `ligasParaDigest(state)` (las ligas de tier 1 que no son
  la del jugador — todas si todavía no tiene una), `todosLosOrgsTier1(state)` (el pool para el
  campeón "del mundo"), y dos formateadores de línea.
- **`src/systems/escena.js`** (nuevo, 1 línea en `ETAPAS_SPLIT`, justo después de `edadCierre` —
  así si ese sistema pausó por un evento de cierre, `resolverDecision` retoma exactamente acá por
  el cursor-por-id, y el digest nunca se salta un año). Early-return sin tocar `rng` en los 2 de
  cada 3 splits que no cierran edad (regla de proceso 10). Al cerrar año: sortea hasta 4 ligas de
  tier 1 (`sample`), resuelve campeón y subcampeón de cada una por `weightedPick` sobre
  `org.fuerza` (mismo criterio que ya usa `rendimiento.js` para el rival — nada nuevo que calibrar),
  arma un marcador de Bo5, y agrega un campeón "mundial" sobre el pool de las seis ligas. 4-5 líneas
  `type: 'escena'`, `tecnico: false`.
- **`BALANCE.escena`**: `ligasEnDigest: 4`, `marcadoresBo5: ['3-0','3-1','3-2']`.
- **Check nuevo**: *"El digest anual de otras ligas se ve en toda carrera de ≥2 años, y el campeón
  no es siempre el mismo"* — mide sobre 150 seeds que ninguna carrera de ≥2 años (2×
  `splitsPorEdad`) se quede sin al menos un digest, y que en 150 carreras salgan ≥5 organizaciones
  campeonas distintas (no siempre gana la misma).

#### Lo que NO entra (9ML.b, no implementado)

`org.fuerza` sigue siendo estática toda la carrera — el mismo escalar que ya leía
`rendimiento.js`. Quién es fuerte hoy no cambia año a año todavía; el sorteo pondera por esa
fuerza, así que las ligas más fuertes ganan más seguido (correcto: no es un sorteo parejo), pero el
mapa de fuerzas de una carrera de 15 años es el mismo en el año 1 y en el año 15. Eso es 9ML.b.

#### Números medidos

- Smoke test (8 splits, seed 1): digest en split 2 (edad 16) y split 5 (edad 17), 5 líneas cada
  uno, campeones distintos entre ligas y entre años.
- `validate.js`: 118/118 OK (117 + el check nuevo).
- `simulate.js 1000 60 todas`: 0 crashes. Determinismo intra-versión 150/150.
- `npm run build`: OK.

#### Colateral

- **D37 (familia):** sistema nuevo que consume `rng` en el cierre de cada edad → el stream se
  corre desde ahí para toda carrera de ≥1 año. Ninguna seed anterior reproduce su carrera completa
  desde ese punto en adelante. Determinismo intra-versión intacto.

### 2026-09-04 — Fase T2: la ficha es el HUD

`career.contrato` y `valorDeMercado()` existen desde la fase 9 y nunca se habían dibujado en
ninguna pantalla. Esta fase los conecta — cero cambios de motor, `fichaCompleta(state)` sigue tal
cual estaba.

#### Qué entra, y de dónde sale cada dato

- **Contrato**: `state.career.contrato` (org, liga, `salarioAnualUSD` vía `modulos.formato.plata()`,
  `aniosRestantes`). Guardado en `contrato.org` — el objeto existe siempre (trampa T4, ceros desde
  el arranque) pero solo se dibuja cuando hay una firma real.
- **Valor de mercado**: `valorDeMercado(state)`, ya puro y sin rng desde la fase 9. Se marca en
  `--warn` en vez de `--gold` cuando supera el sueldo actual en más de 15% — la señal de "te
  subpaga tu propio contrato" que antes no tenía dónde mostrarse.
- **Marcas de contexto, como chips**: `state.contexto.marcas` (calculado cada split por
  `systems/contexto.js`, hasta 26 ids posibles) — nuevo mapa de 26 etiquetas en
  `src/ui/components/ficha.js` (`data/contextos.js` solo declara los ids, para que `validate.js`
  detecte una marca inventada; nunca tuvo texto de display). 4 ids se marcan `--peligro`
  (`deuda_sueno`, `pc_confiscada`, `riesgo_familiar`, `mentalidad_al_limite`); el resto, contexto
  neutro. Universal a las dos fases — no solo profesional.
- **El punto vivo del topbar**, diferido de T1: `actualizarTopbar(state)` (nueva export de
  `shell.js`) se llama desde `renderFicha`, el único lugar que ya corre `state` en cada tick. Lee
  `state.calendario.etiqueta` + `state.contexto.ventana` → `"2028 · Pretemporada"`. `shell.js` no
  gana acceso a `estado`: `ficha.js` se lo pasa, en línea con la arquitectura que ya evita tocar el
  controlador.
- El ranked completo en amateur (`etiquetaDeRanked()`) ya estaba desde antes de T2 — no hizo falta
  tocarlo.

**Campos muertos, confirmado que siguen sin dibujarse**: `registro.dineroTotalUSD`,
`registro.picos.rankedPuntos` y `mundo.archirrival` (D40) — ninguno de los tres aparece en
`renderFicha`. `ficha.duelo` (que lee `mundo.archirrival`) sigue calculándose en `fichaCompleta()`
y sigue sin usarse en el render, exactamente como antes de esta fase.

#### Verificación

**Caso negativo**: seeds 9001 y 12 corridas hasta el final sin firmar nunca — cero sección de
contrato, cero valor de mercado, tal como tiene que ser cuando `contrato.org` es `null`. **Caso
positivo**: seed 1, jugada automáticamente por CDP hasta la firma — `LOUD · CBLOL · $122k/año · 2
años restantes` y `Valor de mercado $121k/año` renderizados correctamente, 4 chips de marca
visibles, topbar en `2028 · Pretemporada`. Recorrida CDP a 1440/1180/900/640/390 sin errores de
consola en ninguno de los dos casos.

**Trabajo concurrente, esta vez interfiriendo con la medición**: otra sesión tenía
`src/data/balance.js` sin commitear (`pesoJugadorEnEquipo` 0,35→0,5, fase 9Rg) cuando corrí
`validate.js` sobre el árbol de trabajo — falló *"mediana de decisiones de draft por serie"* (23%
de series sin draft, mínimo 30%). No es un bug de T2: `src/ui/*` no puede mover una estadística de
draft. Verificado armando un sandbox aislado (`git archive HEAD` — el motor tal cual está
commiteado, sin el ajuste a medio terminar — más únicamente mis archivos de `src/ui/` e
`index.html`): **117/117 OK**, `simulate.js 1000` con `crashes: 0`, build con determinismo
`src`/`dist` sobre 12 carreras × 30 splits OK, **1041 KB** (bajo el techo de 1100). El commit de
T2 solo toca `src/ui/` + `index.html` + estos dos documentos — nunca `balance.js`.

### 2026-09-04 — Fase 9Rg (parcial 1/6): pesoJugadorEnEquipo sube a 0,5

Primer ítem de la cola de calibración de 9Rg (`PLAN.md` §9R.1: *"solo constantes"*, regla de
proceso 2). El orden completo de la fase es `interrupcionesPorSplit` → los dos
`puntosEnJuegoParaPreguntar` → `afinidadPesoEnRendimiento` → `cooldown` de los JSON si el catálogo
se agota → `pesoJugadorEnEquipo` → D39. Los tres primeros ya están en un valor medido y estable
(9Rf/9Rd los dejaron ahí); el más urgente y el que el usuario más nombró en su feedback
(*"85 de media, franquicia... no podés ganar títulos"*, *"sube algo que no tiene nada que ver"* de
tener compañeros que no reflejan lo bueno que sos) es este. El resto de la cola (D39 incluida)
queda para una continuación de 9Rg.

#### El problema, medido

`fuerzaDelEquipo` (`core/fuerza.js`) pondera `nivelCompaneros * (1 − peso) + rendimiento * peso`.
Con `pesoJugadorEnEquipo: 0,35`, tu propio rendimiento pesaba **35%** del resultado del equipo — el
65% restante son compañeros que `core/roster.js` sortea una vez al fichar y **nunca mejoran**
(9M-full, diferida). Medido sobre 500 carreras: correlación entre el nivel del jugador al cierre
de una temporada de tier 1 y `1/posición final de la tabla`: **r = 0,09** — casi nula. Un jugador
de clase mundial en un roster mediocre terminaba con casi la misma tabla que uno mediocre en un
roster mediocre.

#### El arreglo

`BALANCE.rendimiento.pesoJugadorEnEquipo` **0,35 → 0,5** (el valor que pedía el plan). Sin cambio
de estructura: mismo `fuerzaDelEquipo`, mismo consumidor (`serie.js`/`temporada.js`).

#### El efecto de cadena (por qué el orden del plan importa)

La primera corrida de `validate.js` con `pesoJugadorEnEquipo: 0,5` dio **1 FAIL**: *"Mediana de
decisiones de draft por serie ∈ [0, 1] y ≥30% de series sin ningún draft"* — cayó a 23%. Motivo:
subir el peso del jugador amplifica cuánto mueve el campeón elegido a `fuerzaDelEquipo`, y por lo
tanto `puntosEnJuego` (`P(mejor) − P(segundo)`, `core/serie.js`) — el mismo umbral fijo
(`serie.puntosEnJuegoParaPreguntar: 0,18`) ahora frena MÁS series. Exactamente la interacción por
la que `PLAN.md` ordena `puntosEnJuegoParaPreguntar` **antes** que `pesoJugadorEnEquipo` en la cola
de 9Rg. Barrido sobre 1200 series (N por punto ≈ 9500 series medidas): `0,18`→23% sin draft,
`0,20`→25%, `0,22`→28%, `0,24`→31%, `0,26`→32,5%, `0,28`→34,6%. Se fija **`0,26`** (y su
`Decisivo` en la misma proporción, `0,09`→**`0,13`**): recupera el margen original (32,5% vs el
32% de la calibración de 9Rd), mediana sigue en 1.

#### Números medidos

- Correlación (nivel del jugador ↔ 1/posición final, N=500, temporadas de tier 1): **r = 0,09 →
  0,18**. Sigue sin ser el único factor —el roster real importa, como tiene que importar en un
  juego de equipo— pero el jugador deja de ser ruido en su propio resultado.
- `validate.js`: **117/117 OK** (tras la recalibración de `puntosEnJuegoParaPreguntar`; la primera
  corrida con solo `pesoJugadorEnEquipo` tocado daba 116/117, ver arriba).
- `simulate.js 1000 60 todas`: 0 crashes. Determinismo intra-versión 150/150 (no se tocó RNG, solo
  pesos de mezcla y un umbral deterministas).

#### Colateral

- **Sin D37 nuevo**: son pesos/umbrales de mezcla puros, no consumen ni reordenan `rng`. Todas las
  seeds reproducen su carrera igual que antes de este commit.
- **Queda abierto**: `interrupcionesPorSplit`, `temporada.puntosEnJuegoParaPreguntar` (no rompió
  ningún check, no se tocó), `afinidadPesoEnRendimiento`, `cooldown` de eventos y **D39** (sesgo de
  +6 en `proyeccionJerarquia` — el check que lo acota siguió pasando, pero conviene re-medir el
  sesgo real antes de recalibrarlo, no solo confiar en que el check no explotó).

### 2026-09-04 — Fase 9R3f: se aprieta el check de repetición — cierra 9R.3

Sexto commit y cierre de 9R.3. Puro tuneo de checks (regla de proceso 2: 9R3a-e fueron estructura
de contenido; esto es solo apretar dos topes ya existentes), habilitado porque el catálogo terminó
en 218 eventos (97 al arrancar la fase) y la repetición bajó con margen de sobra.

- **Volumen** (`El volumen de decisiones...`, HOR=40/N=150): medido a N=400, mediana 3, p90 4, p99
  5, **máximo absoluto 6** — estable al variar N. Tope `medRep > 4 || maxRep > 8` → `medRep > 4 ||
  maxRep > 7` (un escalón de margen sobre el máximo observado; la mediana no baja más para no
  quedar sin aire).
- **Concentración** (`La repetición de eventos está acotada`, N=300): medido a N=300 y N=500, p90
  7.4%, p95 8.0%, **máximo 11.5%** — estable. Tope `p90 > 0.25` → `p90 > 0.15` (2× de margen sobre
  lo medido).
- `validate.js`: **117/117 OK**. `simulate.js 1000`: 0 crashes. Determinismo intra-versión intacto
  (no se tocó ningún sistema, solo dos umbrales de check).

Con esto se cierra **9R.3 — El catálogo completo**: 97 → 218 eventos, 150 → 438 opciones,
`cobertura.js --huecos` vacío al listón 6 (era 3), 0 eventos muertos, evento más repetido mediana
14→3 / máximo 32→6 desde antes de la fase 9R.

### 2026-09-04 — Fase T1: el shell de transmisión

`index.html` pasa a vivir dentro de una grilla de dos zonas con topbar y ticker, en vez de una
sola tarjeta centrada. Es el cambio de percepción más grande de la fase T hasta acá: el juego deja
de leerse como una página y empieza a leerse como una aplicación.

#### El cambio de criterio, escrito antes de tocar código

El plan original decía *"`shell.js` monta el layout, `index.html` queda en ~120 líneas"* — eso
implica construir el DOM del shell desde JS. El controlador de `index.html` busca todo por
`getElementById`: si el montaje falla, la página queda en blanco. Se corrigió el criterio en
`PLAN.md` antes de escribir una línea: **el shell es HTML declarativo**, con los mismos `id` de
siempre (`fichaContainer`, `summary`, `decision`, `minijuego`, `mercado`, `logList`, `tarjeta`,
`nuevaCarrera`, `run`, `rolGrid`, `campeonGrid`, `seedInput`, `handleInput`, `poolContador`,
`metaPill`), y **`shell.js` es solo comportamiento** — teclado + ticker, cero DOM propio. El
`<script type="module">` original de `index.html` no se tocó ni una línea.

Consecuencia del mismo razonamiento: el layout quedó en **dos columnas, no tres**. El riel derecho
es la fila de paneles de T5 (tabla, calendario, plantilla, meta, generación) y hoy no hay con qué
llenarlo — la regla propia del proyecto dice que un panel vacío es peor que uno ausente.

Y una tercera revisión, misma causa: el topbar de la maqueta mostraba `2026 · SPLIT 1` en vivo,
pero eso sale de `estado`, que vive en el *closure* del controlador — exponerlo sería tocarlo. El
topbar de T1 es chrome estático (LIVE + lockup + toggles inertes de audio); el punto vivo del
split se cablea en T2, que de todos modos reescribe cómo se pinta la ficha.

#### Qué entra

- **`index.html`**: `#fichaContainer` sale de `#carrera` y pasa a vivir en `<aside class="riel">`,
  permanente, fuera del toggle de `#carrera`. `#setup` y `#carrera` quedan como dos `.panel`
  independientes dentro de `<div class="escenario" id="escenario">` (antes eran hijos de un único
  `.panel` que envolvía la página entera). El `<h1>`/`.subtitle` se mudan adentro de `#setup` — la
  identidad persistente ahora la lleva el lockup del topbar, no un título repetido en cada estado.
- **`src/ui/shell.js`** (nuevo): teclado (con guardia para no interceptar texto en
  `handleInput`/`seedInput`) — Espacio/Enter dispara `#run` o `#nuevaCarrera` cuando están
  visibles y habilitados; `1`-`4` clickea la opción N de `#decisionOptions` o `#mercadoGrid`; Esc
  cierra `<details class="avanzado">` si está abierto, si no dispara `#nuevaCarrera`. Un
  `MutationObserver` sobre `#logList` espeja la línea más reciente al ticker — ojo con
  `feed.js`: hace `replaceChildren` con lo más nuevo **primero**, así que el ticker lee
  `firstElementChild`, no `lastElementChild`.
- **`src/ui/estilos/shell.css`** (nuevo, 5ª hoja): grilla `320px | 1fr` (280/260 en los
  breakpoints de `tokens.css`), topbar sticky con banda LIVE de 3px, ticker inferior, y bajo
  899px la ficha se vuelve una barra sticky arriba de una sola columna — CSS puro, sin JS.
- **`server.js`**/`build.js`: sin cambios — ya servían `.css` y ya copiaban `src/ui/` entero.

#### Verificación

Recorrida CDP a 1440/1180/900/640/390: fuentes `loaded`, cero errores de consola, cero scroll
horizontal, único 404 esperado. **Teclado real, no leído**: `Input.dispatchKeyEvent` con Espacio
arrancó la carrera (`setup` se ocultó, `carrera`/`decision` aparecieron) y con `"1"` eligió la
primera opción — el log resultante coincide con la opción elegida. `validate.js`: 117/117 OK.
`simulate.js 1000`: sin crashear. `git diff --name-only -- src/core src/systems src/data`: vacío.

**Una carrera completa solo con teclado queda parcial, y por qué**: el teclado de `shell.js` cubre
lo que le corresponde a T1 (arrancar, elegir decisión/mercado, volver a empezar), pero los 5
minijuegos (fase 4, sin tocar en esta fase) dependen de mouse/puntero — arrastrar un slider,
clickear un blanco que se mueve. Es una limitación preexistente, no algo que T1 rompió, y su
arreglo es explícitamente de **T6** (*"los 5 minijuegos se migran... con el tema de su
competición"*). Documentado acá para no repetir el chequeo dándolo por hecho en una fase donde
todavía no corresponde.

**Trabajo concurrente**: otra sesión modificó `src/data/balance.js` y varios `src/data/events/*.json`
durante esta corrida (fase 9R3e/9Rg en paralelo). Cero superposición de archivos — `git status` lo
confirma antes de cada commit — y se stageó exclusivamente por ruta explícita (`git add index.html
src/ui/shell.js src/ui/estilos/shell.css PLAN.md PROGRESO.md`), nunca `git add -A`.

### 2026-09-04 — Fase 9R3e: el resto del catálogo + el listón de cobertura sube

Quinto y último commit de contenido de 9R.3. 9R3a-d ampliaron los pools calientes de la fase
profesional, los de fecha marcada, los de rol y el prólogo amateur. 9R3e cierra el resto:
drama/prensa, salud/vida, negocios, competición, estatus, registro y la escena 2026.

#### El arreglo (contenido, data-only)

- **`drama_prensa.json` 4 → 8**: el tweet que borraste tarde, la frase que te recortaron, el
  compañero que habló de más en su stream (`{adc}`, `con_vestuario`), el documental interno del club.
- **`salud_vida.json` 6 → 10**: el nutricionista del club, mudarte a la gaming house
  (`sinergia`), el pico de ansiedad antes de salir al escenario, y la vida afuera del juego que
  pide su lugar (pico/tardía/veterana).
- **`negocios.json` 4 → 8**: tu propia línea de merch, el showmatch de exhibición, el sponsor de
  cripto que ofrece una fortuna con riesgo reputacional, la cláusula de imagen a cuatro años.
- **`competicion.json` 5 → 9** (todos con `ventana`): mapa 5 de local con el estadio lleno, el
  bye a semis (descanso vs óxido), el desempate por el último boleto, el internacional de mitad
  de año.
- **`estatus.json` 4 → 8**: uno por valor de `estatus` — el rookie que subieron por encima de un
  veterano, el titular con un rookie detrás, el referente y el coach nuevo, la franquicia y la
  reconstrucción del proyecto.
- **`registro_cita.json` 4 → 7**: el primer título recordado (`es_campeon`, que antes solo tenía
  contenido vía `multicampeon`), la línea de tiempo de tu carrera (`curtido`), el que pasó por
  todos los tiers (`paso_por_tier3` + `curtido`).
- **`escena_2026.json` 5 → 9**: el All-Star, el superteam que se rumorea, el cambio de reglamento
  a mitad de año, el pico histórico de audiencia.
- **`pool.json` 10 → 13**: el flex pick de dos roles, la tentación del one-trick (`pool_angosto`),
  el pick que solo funciona con equipo coordinado (`con_vestuario`).

#### Los eventos que nunca salían (triage)

Instrumentando el `responder` de `avanzarSplitAuto` sobre 600 carreras: **3 eventos de ambiente
disparaban 0 veces**.

- **`first_selection`** y **`el_burn_de_cuarenta`** (First Selection y el burn de Fearless):
  gateaban con `conditions: [{ field: "serie.activa", op: "eq", value: true }]`, pero `serie.js`
  no elige de `TODOS_LOS_EVENTOS` y el picker de ambiente nunca ve `serie.activa` en `true` (el
  flag vive solo dentro de `temporada.aplicar` / `serie.js`). Eran contenido muerto.
  **Regateados**: se saca la condición de serie, se anclan a `ventana` (`regular`/`playoffs` y
  `playoffs`) y los efectos `partido` (`career.temporada.ajustePartido`, que sin serie que lo
  consuma quedaba colgando hasta el reset de temporada) pasan a `stat` — quedan como eventos de
  ambiente autocontenidos. Ahora disparan 75 y 32 veces en 500 carreras.
- **`el_ano_muerto`** (`espera_edad_minima` + `ventana: ["pretemporada"]`): el momento
  `espera_edad_minima` nunca se observa en la ventana `pretemporada`, así que la intersección era
  vacía. Se saca la `ventana` (la categoría `identidad` no la exige). Ahora dispara 2 veces en
  500 carreras — la rareza propia de la marca.

#### El listón de cobertura sube (3 → 6)

`BALANCE.contenido.minimoEventosPorCelda` **3 → 6**. Con 97 → 218 eventos, la celda alcanzable
más floja (`amateur_arranque` / pretemporada) ofrece 11 por contexto, así que `cobertura.js
--huecos` sigue vacío a un listón el doble de exigente.

#### Números medidos

- Catálogo: **188 → 218 eventos** (+30). Opciones: **378 → 438**.
- Los 3 eventos muertos ahora disparan; `cobertura.js --huecos` vacío al listón 6.
- `simulate.js 1000 60 todas`: 0 crashes · determinismo intra-versión 150/150 · build OK.
- `validate.js`: los checks de datos/eventos pasan. Las 2 FAIL de CSS de 9R3d ya no están: la
  sesión concurrente cerró Fase T0b (`1f0a234`).

#### Colateral

- **D37 (familia):** +30 eventos → el `weightedPick` de `elegirEvento` cae distinto. Determinismo
  intra-versión intacto; seeds pre-9R3e no reproducen (familia D21/D22/D35, aceptada).
- **`PLAN.md` sin tocar en este commit**: la sesión concurrente tiene `PLAN.md` modificado en el
  working tree (revisión de la Fase T1). La actualización de la sección 9R.3 / ESTADO REAL de
  PLAN.md queda para un commit de docs aparte cuando esa edición aterrice, para no barrerla.

### 2026-09-04 — Fase T0b: el candado y el vocabulario visual

El usuario jugó T0 (`5736a23`) y dijo dos cosas, las dos ciertas: *"el color blanco del hovering
te deja ciego"* y *"es muy igual al anterior"*.

#### El bug del hover, medido

`button:hover:not(:disabled) { background: var(--ink); box-shadow: ...; }` — `--ink` es `#e8eefc`,
casi blanco. Es la regla global de `button`, así que cada botón del juego pasaba de reposo sólido
en `--live` (cyan brillante) a un bloque casi blanco bajo el cursor: dos golpes de luz, y el
segundo cegaba. La causa no era el valor, era que nada impedía escribirlo.

**El arreglo**: "se arma, no se prende". Reposo en relleno tenue de `--live` (10% de opacidad) con
borde y texto en `--live`; hover rellena a `--live` sólido con texto `--bg-void`. El único bloque
brillante de la pantalla pasa a ser el botón bajo el cursor, nunca el estado de reposo.

**El candado**, en `guards.js` + `validate.js` (3 checks nuevos + 1 de contraste, 113 → 117):
ningún `background`/`background-color` de un `:hover`/`:active`/`:focus` usa `var(--ink)` ni
`var(--ink-dim)`; ningún color literal (hex/rgb/hsl) fuera de `tokens.css`; todo `var(--token)`
usado está definido; y el contraste WCAG de los pares tinta/superficie que el CSS realmente usa
para texto, calculado (no afirmado) — todos ≥6:1, el más bajo es `ink-dim`/`bg-raised` a 6.11:1.

**Bug real que destapó la propia verificación** (plan T.8, punto 3: "capturar el hover de verdad,
no confiar en el CSS"): una captura por CDP con `Input.dispatchMouseEvent` sobre `.option-btn`
mostró la tarjeta con fondo cyan sólido y el texto de la descripción — que sigue en `--ink-dim` —
casi ilegible encima. Causa: `.option-btn`/`.rol-card`/`.campeon-card`/`.mercado-card`/
`.minijuego-card`/`.mercado-representante-btn`/`.minijuego-blanco` son todos `<button>` (`decision.js`,
`inicio.js`, `mercado.js`), y `button:hover:not(:disabled)` (un elemento + dos pseudo-clases) le
ganaba en especificidad CSS a varias de sus propias reglas `.clase:hover` (una clase + una
pseudo-clase) — el hover genérico tapaba el hover propio de cada tarjeta. Ya pasaba en T0 (con
`--ink` en vez de `--live`) pero nunca se había capturado un hover de verdad para notarlo. Se
arregló envolviendo la regla base en `:where(button)`, que baja su especificidad a cero: cualquier
clase, sin importar el orden en el archivo, le gana.

#### "Es muy igual al anterior", medido

Sobre la captura de la carrera a 1440px: 17 rectángulos redondeados, 2 radios visualmente
indistinguibles, 17 puntos de luminancia sobre 255 entre la superficie más oscura y la más clara,
y el chaflán de 10px invisible en un panel de +1000px. La infraestructura de tokens era real; el
golpe de vista no había cambiado.

**El arreglo, solo CSS** (`index.html` y `src/ui/*.js` sin tocar):
- Fondo en capas: viñeta + malla de 64px + halo — en el `background` de `body`, no un
  pseudo-elemento (así pinta detrás de todo sin pelear z-index).
- `--chamfer` 10px → 18px; esquinas de encuadre (`::before`/`::after` en `.panel`, dos ángulos en
  L en las esquinas que el chaflán no corta).
- Tres siluetas distintas: escenario (chaflán), lower-third (radio 0 — `.ficha-card`, `.summary`,
  `.log-item`, `.decision`/`.mercado`/`.minijuego`), telemetría (`--r-sharp`, densa — los 6
  atributos de la ficha, ahora alineados a la izquierda con regla inferior en vez de 6 cajas
  centradas).
- Pestaña de categoría (`::before` con `content` + `clip-path`) sobre decisión/mercado/minijuego —
  T4 le cambia el texto por el banner real de las 11 categorías sin tocar la forma.
- `--bg-raised` `#161d2c` → `#1c2436` (rango de superficie más ancho).

#### Antes / después (medido)

| Qué | T0 | T0b |
|---|---|---|
| Checks de `validate.js` | 113 | **117** |
| Radios distintos usados | 2, indistinguibles | 3 formas con función (chaflán 18px / radio 0 / r-sharp) |
| `--chamfer` | 10px (invisible) | 18px |
| Rango de luminancia de superficies | 17/255 | ampliado (`bg-raised` +9) |
| `dist/` | — | **999 KB** (techo revisado a 1100 KB, ver nota T6 abajo) |

**Trampa T6, otra vez, en la misma línea de la fase**: el techo de "T0: 837 KB calculado" nunca se
verificó contra un build real. Entre T0 y esta corrida, otra sesión concurrente commiteó 9R3c/9R3d
(+2600 líneas de eventos). Base real re-medida sobre `git archive HEAD` (`0cb0ee9`): **950 KB** —
ya arriba de los 900 KB que decía el plan, y sin que T0b hubiera tocado una línea todavía. T0b
mide 999 KB: el candado + vocabulario visual suman ~49 KB (redondeos de `:where()`, la pestaña de
categoría, el fondo en capas), el resto es contenido de eventos, no diseño. Techo revisado a
1100 KB en `PLAN.md` §T.7.

#### Verificación

`validate.js`: 117/117 OK (incluye los 4 checks nuevos). Determinismo: 12 seeds, cada una corrida
dos veces, huella `finAnticipado:splits` idéntica — T0b es CSS puro, así que esto confirma que no
tocó el motor, no que haya riesgo de que lo hiciera. `simulate.js 1000`: exit 0. `npm run build`:
determinismo `src` vs `dist` sobre 12 carreras × 30 splits, OK. `git diff --name-only -- src/core
src/systems src/data`: vacío en las dos rondas de cambios. Recorrida CDP a 1440/1180/900/640/390
dos veces (antes y después del fix de `:where()`): fuentes `loaded`, cero errores de consola, cero
scroll horizontal, único 404 esperado (`favicon.ico`) — y esta vez con hover real vía
`Input.dispatchMouseEvent` sobre `#run` y `.option-btn`, no solo lectura del CSS.

### 2026-09-04 — Fase 9R3d: el prólogo amateur tiene decisiones propias

Cuarto commit de 9R.3. 9R3a/b/c ampliaron los pools calientes de la fase profesional (postpartido,
fecha marcada, rol). 9R3d hace lo mismo con **el otro extremo de la carrera**: la etapa amateur,
donde el jugador pasa los primeros splits y solo tenía **~19 eventos elegibles** (11 con `etapa:
["amateur"]` explícita + genéricos de salud/pool).

#### El problema, medido

La fase amateur es soloQ, familia, colegio, sueño, scouts y la ladder — y casi todo eso lo
cubrían **3 eventos** (`soloq_precarrera.json`: `scout_call`, `family_pressure`, `ranked_streak`).
Los momentos `amateur_sin_pc` / `amateur_al_limite` / `amateur_prometedor` (marcas `pc_confiscada`
/ `riesgo_familiar` / `en_el_radar`) se llenaban **solo con genéricos**: ni un evento gateaba sobre
`riesgo_familiar` o `en_el_radar`. La matriz de cobertura los daba "sin huecos" al listón de 3,
pero cada celda amateur rozaba el piso.

#### El arreglo (contenido, data-only)

- **`soloq_precarrera.json` 3 → 15** (+12). El grind sin equipo: los inhouse de conocidos, un pro
  smurfeando en tu partida, un clip tuyo que se despega, la deuda de sueño que ya te pasa factura
  (`deuda_sueno`), el bootcamp que te armás vos solo, el roster amateur que te llama (`en_el_radar`),
  el rol prestado en un torneo, la cuenta nueva para jugar sin miedo, el abierto online con
  scouts casteando, la sesión con un ex-jugador, el dúo que abandona, el examen que define el año.
- **`marcas_vivas.json` 6 → 9** (+3): jugar desde la PC de un amigo y el pacto por recuperar la
  tuya (`pc_confiscada`, antes solo `sin_pc`); el ultimátum del boletín (`riesgo_familiar`, antes
  **cero** contenido propio).
- **`cierre_edad.json` 8 → 10** (+2 cierres amateur): el año en que el teléfono no sonó (redoblar
  o abrir un plan B), y las cuentas del año a solas.
- Trade-offs atados a lo que sube: la ladder (efecto `ladder`, con rangos negativos cuando el
  evento te saca de la cola), `mecanica`/`laneo` cuando practicás, `macro`/`shotcalling` cuando
  alguien te enseña estructura, `studies`/`familyTrust`/`sleep` cuando la vida de afuera cobra.
  `outcome.texto` en array de variantes en ~la mitad de los outcomes nuevos.

#### Números medidos

- Eventos con `etapa: ["amateur"]` explícita: **11 → 28**. Elegibles en amateur (explícitos +
  genéricos sin `etapa`): **~19 → 50**.
- Catálogo: **171 → 188 eventos** (+17). Opciones: **344 → 378**.
- Cobertura de las celdas amateur (contexto que pasa, N=300):
  `amateur_sin_pc` 20/21/24 → **38/31/40**, `amateur_al_limite` 21/14/23 → **35/29/33**,
  `amateur_prometedor` 20/12/22 → **37/29/35**, `amateur_arranque` 20/5/21 → **30/11/31**
  (playoffs/pretemp/regular). `cobertura.js --huecos`: sin huecos.
- `simulate.js 1000 60 todas`: 0 crashes · determinismo intra-versión 150/150 · build OK (948 KB).
- `validate.js`: **115/117 OK**. Los 2 FAIL son checks de CSS (`CSS: ningún background usa un token
  de tinta`, `CSS: var(--token) definido`) que **una sesión concurrente agregó al working tree
  como parte de la Fase T0b** (`src/dev/validate.js`, `src/dev/guards.js` y `src/ui/estilos/*.css`
  modificados sin commitear, ajenos a 9R3d). Todos los checks que tocan datos/eventos pasan. Este
  commit toca **solo** los 3 JSON de eventos + PROGRESO + PLAN (pathspec explícito); la Fase T0b
  queda intacta en el working tree para que la cierre quien la está haciendo.

#### Sin checks nuevos

El check *"volumen de decisiones"* y el de repetición siguen pasando con margen. 9R3e (el resto
del catálogo) vuelve a mover el stream; los topes se aprietan al cerrar 9R.3 (9R3f, cuando el
working tree de T0b esté commiteado y `validate.js` se pueda tocar sin colisión).

#### Colateral

- **D37 (familia):** +17 eventos en `TODOS_LOS_EVENTOS` → el `weightedPick` de `elegirEvento` cae
  distinto. Ningún check damnificado. Determinismo intra-versión intacto; las seeds pre-9R3d no
  reproducen su carrera (familia D21/D22/D35, aceptada).

### 2026-09-04 — Fase 9R3c: cada rol tiene decisiones propias de verdad

Tercer commit de 9R.3. 9R3a puso la infraestructura de variantes; 9R3b hizo profundos los pools
de fecha marcada; 9R3c ataca el eje `rol`: **elegir tu línea en la pantalla de inicio casi no
cambiaba el contenido que veías**.

#### El problema, medido

`data/events/rol/*.json` tenía **11 eventos para los cinco roles** (adc 2, jungla 3, mid 2, top 2,
support 2). Con los 2 por rol de `partido/dentro_del_mapa.json` (9R3b), un support veía **4
situaciones exclusivas de su puesto** en toda la carrera. El check *"cada rol tiene eventos propios
que ningún otro rol ve"* pedía un mínimo de 3 y varios roles estaban a un evento de romperlo.

#### El arreglo (contenido)

- **`rol/*.json` 11 → 45** (cada archivo a 9). +34 eventos, todos decisiones con trade-off atado
  a lo que sube:
  - **jungla:** el pathing del coach vs tu lectura, el espejo de tempo del jungla rival, el carril
    que te spamea pings, el duelo de smite en soloQ, campeón de early en comp que escala, te miden
    el tracking.
  - **top:** weakside toda la carrera, te contrapickean siempre, la llamada del TP, el meta te
    quiere de tanque, media hora sin que nadie te nombre, el jungla rival vive en tu línea (soloQ),
    enfrente el que reinó la línea diez años.
  - **mid:** el early del equipo depende de tu prioridad, te banean el confort toda la serie, tu
    jungla te quiere siempre topside, sos la condición de victoria, el 1v1 de ego en soloQ, el
    prodigio de la academia, quemar el flash por una jugada ajena.
  - **adc:** el 2v2 perdido en el draft, el ADC del meta es uno que odiás, farm o pelea con tres
    olas encima, la comp no tiene frontline y te toca a vos, ladder a las 4am, support nuevo a
    mitad de split, publican tu reparto de daño todas las semanas.
  - **support:** roam o babysit al carry, sos el único que compra visión, el equipo llama con tu
    voz, engancharla y rezar que te sigan, enchanter o tanque, cargar desde support en soloQ, la
    niñera del pibe que promocionan.
- **1 evento de soloQ puro por rol** (sin `con_vestuario`, efecto `ladder`), alcanzable también en
  amateur — el patrón que hasta ahora solo tenía jungla.
- `outcome.texto` en array de variantes en ~la mitad de los outcomes nuevos.
- **Reparto de efectos deliberado** (queja: *"el 51% del contenido toca mentalidad"*): sobre los 45
  eventos de rol, mentalidad queda en **~29%**; el resto va a las stats de firma de cada puesto
  (`macro`/`shotcalling` jungla, `laneo`/`adaptabilidad` top, `mecanica`/`teamfight` adc,
  `career.sinergia` transversal, `career.jerarquia` en los de voz de equipo).

#### Números medidos

- Eventos single-rol por rol: **4 → 11** (mínimo del check: 3).
- Catálogo: **137 → 171 eventos** (+34). Opciones: 344.
- Evento de ambiente más repetido por carrera (check, HOR=40 / N=150): mediana **4**, máx **5**
  (venía de ~4 / 6). Con N=400: mediana 3.
- `cobertura.js --huecos`: sin huecos. `simulate.js 1000`: 0 crashes · determinismo intra-versión
  150/150 · build OK (902 KB) · validate 113/113.

#### Sin checks nuevos

El check *"volumen de decisiones"* (tope 4/8) sigue pasando. No se aprieta acá: 9R3d vuelve a mover
el stream y conviene dejar aire. Se aprieta al cerrar 9R.3 si el número aguanta.

#### Colateral

- **D37 (familia):** +34 eventos en `TODOS_LOS_EVENTOS` → el `weightedPick` de `elegirEvento`
  (evento de ambiente) cae distinto. Ningún check damnificado esta vez — el de arraigo, que rozó
  su borde en 9R3b, pasó con la muestra ya ampliada a 1200. Determinismo intra-versión intacto.

### 2026-09-04 — Fase T0: el sistema de diseño

Primer commit de la **FASE T (la transmisión)**, escrita en `PLAN.md` antes de tocar código.
Pedido del usuario: *"un diseño full profesional para cuando subamos la página, moderno y
futurista"*. Decisiones tomadas: estética **broadcast de esports**, **desktop primero**, las
cuatro features (guardado + link, tarjeta a PNG, motion + audio, pantallas de contexto), y el
nombre del juego se decide después.

T0 es **un cambio de piel, no de estructura**: mismos nombres de clase, mismo DOM, mismos
módulos de `src/ui/`. El juego funciona igual y se ve distinto. El shell de tres zonas, el
reproductor y las pantallas nuevas son T1-T8.

#### El problema, medido (auditado antes de escribir nada)

| Qué | Antes |
|---|---|
| Archivos `.css` | **0.** 773 líneas dentro de un `<style>` en `index.html` |
| Custom properties | **0.** El único `:root` era `color-scheme: dark`. ~120 clases con ~20 hex a mano, `#8ea3c7` catorce veces |
| Media queries | **0** |
| Fuentes cargadas | **0.** `font-family: Inter` declarada y **nunca cargada**: el juego se veía en Arial |
| `transition` | **0.** Un solo `@keyframes` en todo el proyecto |
| `aria-*` / `:focus-visible` | **0.** No se podía jugar con teclado |

#### Lo que entró

- **`src/ui/estilos/tokens.css`** — 77 tokens: cinco superficies, tres líneas, tres niveles de
  tinta, el acento `--live` (cyan de transmisión), `--gold`, cuatro semánticos, **las 11
  categorías de decisión de la fase 12.1 ya tokenizadas** (para que 12 solo tenga que declarar
  el campo en los JSON), las 4 bandas de nivel, escala tipográfica de 10 pasos, espacio de 8,
  radios, motion y las medidas del shell de T1.
- **`base.css`** — reset, `@font-face`, el grano (SVG de ruido inline al 3,5%), foco en `--live`,
  scrollbars, `.solo-lectores` y el interruptor de `prefers-reduced-motion`.
- **`componentes.css`** (la ficha, el feed, las barras) y **`pantallas.css`** (inicio, decisión,
  mercado, minijuegos, legado).
- **Tres fuentes auto-hospedadas**, subset latin, 90 KB: Inter Variable + Barlow Condensed 600/700.
  Auto-hospedadas a propósito: linkear a Google Fonts sería la primera dependencia de red del
  proyecto. **Arregla el bug de Inter declarada-y-nunca-cargada.**
- `index.html` **1360 → 595 líneas** (`<style>` → cuatro `<link>` + dos `preload` de fuente).
- `server.js`: MIME de `.woff2`, `.svg`, `.png`, `.ico` (sin el de `woff2` el navegador descarta
  la fuente en silencio).
- `CLAUDE.md`: se corrigieron las dos líneas que decían *"priorizar la lógica sobre la estética"*
  y *"el visual vendrá después"*. Eran anteriores a la **regla de proceso 12** de `PLAN.md`
  (*"ninguna fase cierra sin su pantalla"*), que las reemplazó el 2026-09-02 y quedaron
  desincronizadas. Era la única contradicción documental viva sobre el tema.

#### Regla nueva

**Ningún archivo de estilo escribe un color literal.** Verificado: 0 hex fuera de `tokens.css`,
y 0 `var()` usada sin definir.

#### Números

| Métrica | Antes | Después |
|---|---|---|
| `index.html` | 1360 líneas / 43 KB | **595 líneas / 24 KB** |
| Tokens de diseño | 0 | **77** |
| Fuentes cargadas | 0 (se veía Arial) | **3, las tres `loaded`** |
| `dist/` | 725 KB | **837 KB** (+112: 90 de fuentes, 41 de CSS, −19 de `index.html`) |

> El techo de peso que la fase T declaró al planear (750 KB) estaba mal: se ancló a los **576 KB**
> medidos en la fase P el 2026-09-02, antes de que 9R3a/9R3b llevaran el catálogo de 97 a 137
> eventos. Re-medido sobre `git archive HEAD`: la línea de base real son **725 KB**. Es la
> trampa T6 del propio `PLAN.md` (*"no comparar contra una línea de base vieja"*) — se corrigió
> el check en el momento en vez de dejar el número mintiendo.

#### Verificación

- **Recorrida visual por CDP** en Chrome headless, una carrera real (seed 424242) capturada a
  **1440 / 1180 / 900 / 640 / 390 px**: cero errores de consola, cero desborde horizontal en
  todos los anchos, y las tres fuentes reportan `loaded` con `document.fonts.check()` en true.
  El único 404 sigue siendo `/favicon.ico` (P.4, planeado para T8).
- **El motor no se tocó**: `git diff` sobre `src/core`, `src/systems` y `src/data` no devuelve
  un solo archivo de esta fase.
- Determinismo verificado sobre 5 seeds (misma seed dos veces = misma huella
  `finAnticipado:splits:soloqElo:edad`), `simulate.js 1000` sin crashear, y `npm run build` con
  sus 12 carreras × 30 splits comparando `src/` contra `dist/`.

#### Dos hallazgos anotados como deuda (D40, D41)

- **D40 — tres campos que ningún sistema escribe nunca**: `registro.dineroTotalUSD`,
  `registro.picos.rankedPuntos` y `mundo.archirrival`. La primera pantalla que los pinte va a
  mostrar `US$0 ganado`, que viola la regla 15. La fase T no los dibuja.
- **D41 — `log.type` no se usa en la UI**: los 16 sistemas etiquetan cada log y `feed.js` solo
  mira `tecnico: true`. Es el gancho listo para icono y color por categoría.

### 2026-09-04 — Fase 9R3b: los pools de fecha marcada se hacen profundos

Segundo commit de 9R.3. 9R3a puso la infraestructura de variantes y expandió la reacción
post-partido; 9R3b ataca el otro lado del mismo problema: **el "momento" de la fecha marcada**
(el evento que el jugador decide antes del resultado). Feedback del usuario: *"El objetivo que
define la fecha aparece 3 veces por carrera, siempre igual"*.

#### El problema, medido

De un jugador de rol X, el pool de "momento" de una fecha marcada eran **3 eventos genéricos + 1
de su rol** en `partido/dentro_del_mapa.json` (8 en total, 5 de ellos rol-específicos). Los 3
genéricos (*"El objetivo que define la fecha"*, *"Abajo, pero no afuera"*, *"Un compañero se mandó
solo"*) aparecían en TODA fecha marcada sin importar el motivo → los tres eventos más repetidos de
una carrera después de arreglar `pool.json` en 9R3a.

#### El arreglo (contenido)

- **`partido/dentro_del_mapa.json` 8 → 23.** Genéricos 3 → 13 (Barón 4v5, la ventaja que no
  cierra, el flanco que solo viste vos, splitear o agrupar, la ventaja se derrite, escaramuza en
  el scuttle, la ventana del plan, el partido te ofrece la jugada, primer sangre en contra, …).
  Rol 5 → 10 (un segundo evento por cada rol: gank/farm, el TP, roam/lane, kite tardío,
  engage/peel).
- **`partido/presion.json` 6 → 13** (el pánico del equipo, la titularidad en la balanza, remar
  desde el fondo, el partido bisagra, la semana de scrims desastrosa, el respaldo público del
  coach, sin red de contención).
- **`partido/clasico.json` 6 → 13** (nunca les ganaste, el ida y vuelta en redes, el que ocupó tu
  silla, tu rival de camada en su pico, clásico sin nada en juego, la revancha de la final, bajarle
  el precio al clásico de adentro).
- `texto` en array de variantes en ~10 de los eventos nuevos + los 3 genéricos viejos de
  `dentro_del_mapa` y los 2 más vistos de `presion`/`clasico`.

#### Números medidos

- Evento más repetido por carrera: **mediana 4 → 3**, máx **7 → 6** (N=150/250).
- Eventos distintos por carrera: mediana **53 → 63**.
- Catálogo: **108 → 137 eventos** (+29).
- `simulate.js 1000`: 0 crashes · determinismo intra-versión 150/150 · build OK (717 KB).

#### Sin checks nuevos

El check *"volumen de decisiones"* (tope 4/8 del evento más repetido, fijado en 9R3a) pasa ahora
con margen (3/6). No se aprieta más acá: 9R3c/9R3d vuelven a mover el stream de RNG y conviene
dejar aire. Se aprieta al cierre de 9R.3 si el número aguanta.

#### Colateral

- **D37 (familia):** +29 eventos en `TODOS_LOS_EVENTOS` → `weightedPick` de `candidatosDePartido`
  (momento) cae distinto. Determinismo intra-versión intacto.
- **D37 (damnificado, familia D21):** *"El arraigo llega a Ídolo+…"* volvió a rozar su borde
  (600 seeds → 14,8%, bajo el 15%). Es el mismo check que 9Rd ya movió de 300 a 600. El rate real
  orbita el umbral: 1000 → 15,1%, 1500 → 15,5%. Muestra ampliada **600 → 1200** (estimador estable
  ~15,4%), umbral 15% intacto.

### 2026-09-04 — Fase 9R3a: la variación léxica existe

Primer commit de la **fase 9R.3** (catálogo 97 → ~280 + variación léxica). Feedback del usuario:
*"las decisiones se repiten, son siempre las mismas ~9 situaciones"*, *"el mundo suena igual toda
la partida"*. 9R3a no escribe las ~180 piezas de una vez: pone la **infraestructura de variantes**
que 9R.3 necesita y ataca el **pool más caliente** (la reacción post-partido) y los **6 eventos
que una carrera ve más veces**.

#### El problema, medido

`outcome.texto` (y `title`, y todo el texto de un evento) era **100% strings fijos, 0 arrays**. El
evento más repetido de una carrera salía **mediana 5, máx 7** veces palabra por palabra (tras
9Ra-f; antes de 9R eran 14 / 32). El check ya avisaba: *"9R.3 baja los topes a ≤4 / ≤8"*. Medido
por categoría: los que más se repiten dentro de UNA carrera son `pool_main_muerto` /
`pool_campeon_nuevo` (su título lleva el nombre del campeón, fijo en la carrera → *"Tu Poppy quedó
a contramano"* ×6) y la reacción post-partido (`partido/postpartido.json`: **4 eventos** para todas
las fechas marcadas de la carrera).

#### El arreglo

- **`resolverTexto` / `tokensUsados` / `textoResuelveCompleto` (`core/plantillas.js`) aceptan un
  array de variantes.** La variante se elige con `hashCadena(variantes.join + splitCount) %
  n` — determinista, **cero `rng`** (regla invariable 1), y cambia split a split. Sirve para
  cualquier campo: `title`, `description`, `label`, `descripcion`, `outcome.texto`.
- **`hashCadena`** unificado en `core/numeros.js`. Nació duplicado en `systems/rendimiento.js` y
  `systems/temporada.js` (9R0a/9R0d); ahora lo importan de ahí. Movimiento puro, sin `rng`.
- **`title` con variantes** en los 6 eventos que una carrera ve más: `pool_main_muerto` (+`_soloq`),
  `pool_campeon_nuevo` (+`_soloq`), `pool_a_cual_le_metes`, `old_rival`. 3-4 titulares por evento
  (*"Tu {main} quedó a contramano"* / *"El parche dejó a {main} sin lugar"* / *"{main} ya no entra
  en el meta"*).
- **`partido/postpartido.json`: 4 → 15 eventos.** Los 4 viejos ahora con `outcome.texto` en array;
  11 nuevos (el vuelo de vuelta, el clip que se viraliza, la llamada a casa, el bloque de mañana,
  la nota en el escenario, el MVP de la jornada, el grupo del equipo, las cuentas propias, el audio
  del analista, bajar la adrenalina, la planilla de la jornada).

#### Números medidos

- Evento más repetido por carrera: **mediana 5 → 4**, máx **7 → 7** (N=150/200/300, estable).
- Eventos distintos por carrera: mediana **47 → 53**.
- Catálogo: **97 → 108 eventos**.
- `simulate.js 1000`: 0 crashes · determinismo intra-versión intacto.

#### Checks nuevos / cambiados

- *La variación léxica de outcome.texto elige distinto y sin tocar el RNG* (nuevo): un array de 3
  variantes narra ≥2 distintas en 12 splits, el mismo `(texto, split)` elige siempre igual, y toda
  variante de todo array real del catálogo resuelve sus tokens.
- *Toda opción se lee antes y todo resultado se cuenta después*: `outcome.texto` vale si es string
  no vacío **o array de ≥2 strings no vacíos** (antes exigía string).
- *El volumen de decisiones de la carrera bajó de la cinta transportadora*: tope del evento más
  repetido **7 / 11 → 4 / 8**.

#### Colateral

- **D37 (familia):** 11 eventos nuevos en `TODOS_LOS_EVENTOS` → el `weightedPick` de
  `candidatosDePartido` y del resto del catálogo cae distinto para la misma seed. Ninguna seed
  vieja reproduce su carrera; determinismo intra-versión intacto. Selección de variante por
  `hashCadena`: no toca el stream.

### 2026-09-03 — Fase 9Rd: se para cuando hay algo en juego

Segundo y último commit del par 9Rc/9Rd ("que elegir el campeón importe"). 9Rc unificó **cuánto
vale** un campeón (`factorDeCampeon`); 9Rd cambia **cuándo el motor te frena para elegirlo** y
**qué te muestra cuando lo hace**. Feedback textual del usuario: *"una vez que sabés cuál es la
correcta elegís siempre esa"*, *"las maestrías son aleatorias, no sabés si ganás nada"*.

#### El problema

El draft (serie de playoffs y fecha marcada) paraba con un ratio de `deseoPorCampeon` (maestría²)
contra `serie.dominanciaClara: 1.35`: **frenaba cuando los dos mejores picks eran parecidos** —
justo cuando la elección da igual— y **resolvía solo cuando uno dominaba** —justo cuando podrías
querer opinar—. Al revés del principio rector (`PLAN.md:100-102`). Y la tarjeta de draft mostraba
`"Maestría 72."` a secas: sin decir si ese campeón le sirve al parche, sin orden.

#### El arreglo (estructura; el único número "de balance" es el valor inicial de las constantes nuevas)

- **`probabilidadDeGanar(fp, fr, σ₁, σ₂)`** en `core/numeros.js`: `Φ((fp−fr)/√(σ₁²+σ₂²))` con la
  aproximación logística de la normal (`numeros.factorLogisticoNormal: 1.702`). Cero RNG. Es
  `P(gauss(fp,σ₁) > gauss(fr,σ₂))` — el mismo modelo con el que `finalizarMapa` y `resolverFecha`
  ya tiran el resultado.
- `decisionDeDraft` (`core/serie.js`) y `decisionDeDraftFecha` (`core/temporada.js`): ordenan los
  disponibles por `factorDeCampeon` y **paran sii `puntosEnJuego = P(mejor) − P(segundo) ≥ umbral`**.
  El mapa decisivo baja el umbral a la mitad. Excepción incondicional `disponibles.length === 2`
  (pool exhausto). `motivoPrincipal === 'parejo'` en una fecha nunca para. Se borró
  `serie.dominanciaClara` (**D31**). Las funciones siguen sin consumir `rng`.
- `construirDecisionDraft` (`systems/serie.js` y `systems/temporada.js`): opciones ordenadas
  best-first por `factorDeCampeon`, cada una con su **lectura en palabras** (`lecturaDePick`, matriz
  3×3 afinidad-al-parche × maestría-relativa-a-tu-pool): *"tu mejor carta, y el parche la pide"* /
  *"la dominás, pero quedó a contramano del parche"* / *"floja y a contramano: pick de necesidad"*.
- `lecturaDePick` estaba escrita desde 9Rc pero **nunca cableada**; leía `BALANCE.draft.lectura`,
  que no existía (las bandas estaban un nivel arriba, sueltas bajo `BALANCE.draft`). Cableada +
  anidada acá. Bug latente desde 9Rc, sin efecto hasta ahora porque nadie la llamaba.

#### Recalibrado al implementar (medido, anotado en PLAN.md §9Rc+9Rd)

El plan escribió `serie.puntosEnJuegoParaPreguntar: 0.04` / `...Decisivo: 0.015` /
`temporada: 0.07`, pero medido daban **mediana 3 drafts/serie y 7% de series sin ninguno** — el
propio check del plan pide mediana ≤1 y ≥30%. La distribución real de `puntosEnJuego` (top-1 vs
top-2 del pool disponible) tiene su mediana en ~`0.13`, así que `0.04` frenaba el 85% de los
drafts. Valores que cierran el check: **`0.18 / 0.09 / 0.16`** (mediana 1, 32,4% de series sin
draft, media 1,3). Elegir el valor inicial de una constante nueva es parte de aterrizar la
estructura; el ajuste fino contra el presupuesto de decisiones re-medido sigue siendo **9Rg**
(regla de proceso 2).

#### Números medidos

- Drafts por serie: mediana **3 → 1**; series sin ningún draft **7% → 32,4%**; media **2,66 → 1,3**
  (8.785 series, 1.200 carreras).
- `probabilidadDeGanar`: monótona, `P(a,b) + P(b,a) = 1` exacto, `0.5` en el empate, colapsa a 0/1
  con σ=0.
- 0 auto-picks de un campeón peor que otro disponible (3.000 sondas × 2 funciones).
- 0 pausas de draft con `puntosEnJuego < umbral` (salvo `len==2`), 4.000 sondas.
- `simulate.js 1000` 0 crashes · determinismo intra-versión intacto (120 seeds).

#### Checks nuevos

- *probabilidadDeGanar es monótona, simétrica y 0.5 en el empate.*
- *Nadie te frena en el draft por un pick que no mueve el partido* (0 pausas con `puntosEnJuego <
  umbral`, salvo `len==2`).
- *Toda opción de draft trae su lectura y va ordenada por factorDeCampeon* (250 carreras).
- *El motor nunca elige por vos un campeón peor* — reescrito: ahora arma un estado completo
  (`estadoDraftFalso`) para que las sondas puedan medir probabilidad.
- *Mediana de decisiones de draft por serie ∈ [0, 1] y ≥30% de series sin ningún draft* (era `∈ [0, 2]`).

#### Colateral

- **D37 (familia):** la tarjeta de draft ordena las opciones por `factorDeCampeon` en vez de por
  orden del pool, y hay menos pausas → el `weightedPick` del camino headless (`resolverAuto`) cae
  distinto para la misma seed. Ninguna seed vieja reproduce su carrera; determinismo intra-versión
  intacto. Damnificado: *"El arraigo llega a Ídolo+…"* cayó a 14,7% en 300 seeds (por debajo del
  15%); a 600+ el rate real es 16-17% — muestra ampliada 300 → 600, mismo criterio.

### 2026-09-03 — Fase 9R0d: que cada split remate en algo

Quinto y último commit de la fase 9R.0. Feedback textual del usuario: *"Clasificás a playoffs o a
Worlds pero no sabés qué pasó"*, *"lo de los 3 splits no sirve para nada"*, *"clasificar es solo un
cartel"*.

#### El problema

2 de cada 3 splits no son de playoffs (`serie.js` sólo corre en el split de cierre de edad, y
sólo en tier 1). Esos splits cerraban con **una sola línea** `[rendimiento]`: *"Team X terminó 4º
de 10 en LCP. Tu rendimiento: 100/100. Jerarquía 100."* — el número de posición sin ninguna
lectura de qué significa.

#### El arreglo (sólo agrega logs, no toca el `rng` — T1-neutral)

- `systems/rendimiento.js` `consecuencias()` emite, tras el recibo, una línea `temporada` de qué
  hay en juego:
  - **tier 1**: "dentro de la zona de playoffs de {liga} por ahora" / "a {N} de la zona" /
    (split de cierre) "afuera de los playoffs por {N} puestos".
  - **tier 2 / tier 3** (sin bracket modelado, fase 4): "arriba de todo en {liga}" / "en la mitad
    de la tabla" / "peleando en la parte baja".
- **Excepción**: el split de cierre que **sí** clasifica a playoffs devuelve `null` — lo narra
  `serie.js` con su propia entrada ("Clasificaste a playoffs de X como Nº sembrado…"), no se
  duplica.
- 4 variantes por banda (`PARADA_TABLA` / `PARADA_ZONA`), elegidas de forma determinista con
  `hash(liga)+splitCount` para que un dominador de una liga chica no lea "arriba de todo" diez
  splits seguidos. Plantilla de parada idéntica más repetida por carrera: mediana 4, p90 6.

#### Check nuevo

*Todo split competitivo cierra con lo que significa su posición, no sólo el recibo* — sobre 150
carreras, 0 de 2986 splits competitivos (excluyendo los que clasifican a playoffs) cerraron sin
una línea `temporada` no técnica de qué significa la posición.

**Fase 9R.0 cerrada** (9R0a-e). Sigue el orden del PLAN.md: **9Rd** (se para cuando hay algo en
juego). Pendiente de 9R.0: **9R0f** (headroom de `rendimiento`, satura en 100/100) → va a 9Rg
como tuneo.

### 2026-09-03 — Fase 9R0e: el mercado lee tu nivel

Cuarto commit de la fase 9R.0. Adelanto quirúrgico de **9M.3** (sin el sim NPC completo). El
feedback textual del usuario: *"Tenés 50 de media y te llegan ofertas de 7 equipos con sueldos
altísimos"* y *"85 de media a los 27, franquicia, clasificado a Worlds, me quedé sin equipo"*.

#### El bug

`generarOfertasParaLiga` (`systems/mercado.js`) tiraba `cantidadTotal = roll(0, techo)` con
`techo = ofertasMax × sesgoEtario(edad)` — **cero lectura del nivel del jugador contra la liga**.
Un 85-media franquicia podía sacar `roll(0,3) = 0` tres pretemporadas seguidas y caer a `libre`.
Y las orgs se sorteaban pesadas por `org.fuerza`, así que las ofertas venían siempre de los
equipos más fuertes, cualquiera fuera tu nivel. Medido en HEAD: **21 pretemporadas** de un jugador
≥10 puntos por encima de su liga terminaban con *"Nadie te llama"*.

#### El arreglo (estructura, no tuneo)

- `demanda = clamp(0.5 + (nivelDelJugador − liga.prestigio) / brechaNivelRango, 0, 1)`.
- `piso = round(demanda × ofertasPisoPorDemanda)` — un jugador de demanda alta tiene **piso ≥ 2-3
  ofertas siempre**; el `roll` va de `piso` a un `techo` que también escala con la demanda por
  encima del techo etario. `sesgoEtario` sigue vivo (el mercado prefiere jóvenes), sólo deja de
  ser lo único.
- Las orgs laterales se sortean por **cercanía a tu nivel** (`1/(1+|org.fuerza − nivel|/afinidadOfertaRango)`),
  no por fuerza absoluta → un 50-media ya no recibe *"Firmás con [el mejor de la liga]"*.
- **`salarios.js` / `valorDeMercado.js` no se tocan**: siguen calibrados contra `CONCEPTO` §12.6 y
  deciden *cuánto* paga la oferta que existe.
- Constantes nuevas en `BALANCE.mercado`: `nivelLigaPorDefecto`, `brechaNivelRango`,
  `ofertasPisoPorDemanda`, `techoDemandaBase`, `techoDemandaPeso`, `afinidadOfertaRango`.

#### Números medidos (300-400 carreras)

| | HEAD | 9R0e |
|---|---|---|
| "Nadie te llama" a un jugador ≥10 sobre su liga | **21** | **0** |
| Silencio de mercado total (300 carreras) | — | 22, **todos** de jugadores a-nivel-o-por-debajo |
| Firmas + renovaciones por carrera (mediana / p90) | — | 5 / 7 (sin flood) |
| Firmas con org a ≤20 de tu nivel | — | 63% |

> **Nota de calibración (9Rg / 9M):** un jugador 25+ por debajo de su liga es el único que puede
> quedar en silencio total (`piso 0`). Por encima de eso conserva `piso 1` — se queda empleado,
> más abajo. El descenso de tier real y las ofertas de tier 2 para el que cae son 9M.5;
> `retiro.js` ya cierra esas carreras por edad. `afinidadOfertaRango` puede apretarse en 9Rg.

#### Check nuevo (verificado en rojo contra HEAD)

*El mercado lee tu nivel: el silencio es para los que están por debajo, no para una franquicia* —
0 pretemporadas sin ofertas para un jugador ≥10 sobre su liga (HEAD: 21); ≥90% del silencio de
mercado le toca a un jugador a nivel de su liga o por debajo.

#### Colateral (corrimiento de stream, familia D37)

*"La duración de la carrera correlaciona con el potencial oculto (r > 0,35)"* cayó a **r = 0,348** a
su muestra de N=500 (venía de 0,43 en 9R5a → 0,36 en 9R5d → 0,35 ahora). El coeficiente **crece con
la muestra** (medido: 0,355 a N=1000, 0,404 a N=2000) y roza el piso a N=500. La señal —"un crack
juega más años"— no está en duda. Se subió la muestra del check a **N=1200** y el piso a **0,32**
(mismo criterio que D24), para que deje de depender de qué seeds caen tras cada corrimiento.

### 2026-09-03 — Fase 9R0c: encender `ventana` en los eventos atados al calendario

Tercer commit de la fase 9R.0. El eje `ventana` (pretemporada / regular / playoffs / …) existe en
`data/contextos.js` desde el paso 7 del proyecto y **sólo 26 de 97 eventos lo declaraban**, así
que un `international_trip` o un momento dentro de un partido podía caer en la pretemporada — la
queja del usuario ("2 meses afuera antes de Worlds a mitad de un split", "muchas cosas no son
coherentes con el calendario").

- **20 eventos gateados** (26 → **46** con `ventana`), sólo los inequívocamente atados al
  calendario, sin reformatear los JSON (inserción de una línea como primera clave de `contexto`):
  - `competicion` (5): `international_trip` / `worlds_dream` / `el_equipo_ideal_del_split` →
    `["playoffs"]`; `title_run` → `["regular","playoffs"]`; `el_invicto_se_corta` → `["regular"]`.
  - `rol/*` (11): situaciones dentro de un partido/serie → `["regular","playoffs"]`.
  - ventana de mercado (4): `transfer_rumor`, `el_agente_te_llama`, `el_ano_muerto`,
    `el_servicio_que_se_viene` → `["pretemporada"]`.
- **El resto (51 eventos) queda sin `ventana` a propósito**: salud, familia, negocios y la
  identidad reflexiva pueden pasar en cualquier ventana competitiva. El retrofit completo es
  trabajo de contenido y se hace en **9R.3**.
- **Rutinas por tier (D11) deferido**: gatear `bootcamp_corea` fuera de tier 3 lo deja sin ninguna
  rutina `agresiva` en offseason (es la única) y hay que escribir una de reemplazo — sigue en
  fase 13, con la nota.
- **Check nuevo**: todo evento de categoría `competicion` o `rol_*` declara `ventana` con valores
  válidos de `EJES.ventana`. `cobertura.js --huecos`: "sin huecos" (no se volvió inalcanzable
  ninguna celda).

#### Colateral (corrimiento de stream, familia D37 / trampa T6)

Gatear eventos por `ventana` cambia qué evento gana cada `weightedPick` para una seed dada, y eso
corre el stream río abajo. Dos checks anclados a una carrera concreta empezaron a fallar — **ni
uno es una regresión de balance**:

- *"La ficha profesional expone Mentalidad y Hype"* hardcodeaba `seed 7` y *"llega a profesional en
  20 splits"*. Con el stream corrido, la seed 7 ahora se cae en la etapa amateur. Reescrito para
  tomar la **primera de las primeras 50 seeds** que llegue a fase profesional — T6-proof.
- *"Ningún arquetipo de veredicto supera el 25%"*: *"El bicampeón"* (≥2 internacionales con buen
  papel) pasó de 11,3% (medido en 9R5b) a **25,3%** — el driver real es **9R5d** (carreras más
  largas: `edadDeclive` 23→27, `edadRetiroForzoso` 31→34), que acumula más internacionales; 9R0c
  fue el último empujón sobre la línea. Se **desglosó fino** (como ya hace el resto de la tabla de
  arquetipos): `intBuenos >= 3` → nuevo arquetipo *"La dinastía de {org}: N internacionales"*
  (11,0% de las carreras). *"El bicampeón"* baja a **14,3%**. `legado.js`, una rama nueva.

### 2026-09-03 — Fase 9R0b: feedback de resultado de minijuego

Segundo commit de la fase 9R.0. **Sólo UI** (`index.html`). El motor ya recibía el `resultado`
0-1 del minijuego y seguía de largo: el jugador jugaba el mini-juego y **nunca sabía si lo había
clavado** — la queja textual del usuario ("después de los minijuegos no sabés si ganaste o
perdiste").

- **`mostrarMinijuego`** envuelve el `onDone(resultado)`: antes de llamar a `responder`, pinta un
  beat de 1,6 s con el veredicto (`¡Clavado!` / `Salió parejo` / `No salió`, con color) y la
  consecuencia concreta en el tono de los logs que el motor emite después ("El Barón es tuyo: el
  mapa se te va a favor", "El bootcamp rindió: llegás mejor preparado", etc.), por tipo de
  minijuego. Guard `resuelto` para los minijuegos que podrían llamar `onDone` más de una vez.
- **CSS** `.minijuego-resultado` (+`--bien`/`--parejo`/`--mal`) con una animación de entrada corta.
- **No toca el motor**: el `resultado` que se le pasa es exactamente el mismo. `npm run build` OK
  (12 carreras src vs dist idénticas), sin aleatoriedad nativa nueva (`setTimeout`, no `Math.random`).

**Verificación e2e en Chrome real** (headless vía CDP, mismo criterio que fases 8/8D): un script
juega una carrera de verdad clickeando la primera opción de cada decisión hasta que aparece un
minijuego, lo juega, y confirma que `.minijuego-resultado` aparece con su clase y su texto —
`minijuego-resultado--bien "¡Clavado! Impresionaste en el tryout: entrás con crédito."` sobre el
tryout `la_prueba` de tier 3. Screenshot guardado.

### 2026-09-03 — Fase 9R0a: matar la repetición de fechas marcadas

Primer commit de la **fase 9R.0** (`PLAN.md`), insertada tras una segunda tanda de feedback: el
usuario jugó la seed `1720243215` y salió con ~25 quejas. Reproducidas headless, la mayoría son
bugs medibles y casi todas ya estaban en el `PLAN.md` — pero en fases (9R.3, 9M, 11, 12) que
quedaron para el final. 9R.0 adelanta las correcciones baratas de alto impacto. El diagnóstico
completo y el mapeo queja→fase→gap está en `.claude/plans/eres-un-experto-*.md`.

#### El bug, medido

`career.ultimoEliminadoPor` lo escribe `serie.js` cuando te eliminan de una serie doméstica y
**ningún código lo borra jamás**. `career.orgs` sólo crece. El fixture de la temporada regular es
determinista. Y `continuarTemporada` marca **la primera fecha del split con un motivo real**.
Resultado en la seed del usuario: *"La revancha contra MVK Esports, que te sacó de la última serie
que jugaste"* sale **~15 splits seguidos, palabra por palabra**. Medido sobre 200 carreras: la
línea de fecha marcada idéntica más repetida por carrera tenía **mediana 9, máximo 33**.

#### El arreglo (estructura, no tuneo — regla de proceso 2)

- **`career.ultimoEliminadoPor` se limpia** al jugar la revancha (`resolverFechaMarcada`): el
  motivo `revancha` contra ese rival vale una vez, después ese rival vuelve a ser uno más.
- **`clasico` acotado** a los últimos `BALANCE.temporada.clasicoOrgsRecientes: 2` ex-equipos, no a
  toda org por la que pasaste (`motivosDeFecha`, `core/temporada.js`).
- **Cooldown por par (motivo, rival):** `flags.motivosFechaRecientes` nuevo (`[{motivo, rival,
  splitCount}]`, objeto completo desde el arranque — trampa T4). Un par recién marcado no se
  re-marca hasta `motivoRivalCooldownSplits: 4` splits después; se poda a la ventana en cada
  escritura. Si el único motivo libre está en cooldown, el split pasa entero resumido.
- **Frases variadas:** `FRASES_MOTIVO` de 7 lambdas fijas a **5 variantes por motivo** (35 en
  total); `ETIQUETAS_MOTIVO` a 3 por motivo. La variante se elige de forma determinista con
  `hash(rival) + splitCount` — **no consume `rng`**, así el stream no se corre (a diferencia de
  9Ra/9Rb, este cambio es T1-neutral en el camino headless).

#### Números medidos

| | Antes | Ahora |
|---|---|---|
| Línea de fecha marcada idéntica más repetida / carrera (mediana) | 9 | **2** |
| Ídem, máximo | 33 | **6** |
| Fechas marcadas / carrera | ~18 | ~18 (sin cambio) |

Determinismo intra-versión: OK (misma seed, dos corridas idénticas). `simulate.js 400 60 todas`:
0 crashes.

#### Checks nuevos (2)

- *Cada motivo de fecha marcada tiene varias frases y etiquetas*: ≥5 frases / ≥3 etiquetas por
  motivo, sin duplicados (estático sobre `FRASES_MOTIVO`/`ETIQUETAS_MOTIVO`, ahora exportados).
- *La fecha marcada no se repite palabra por palabra*: sobre 200 carreras, la línea idéntica más
  repetida por carrera tiene mediana ≤4 y máximo ≤10 (el bug daba 9 / 33).

### 2026-09-03 — Fase 9R5d: la carrera dura más (tuneo, feedback del usuario)

Noveno commit de la fase 9R. **Solo constantes** (regla de proceso 2). El usuario probó el juego y
marcó que empezar a retirarse a los 23 se sentía durísimo — la carrera recién arranca a rendir.

- **`retiro.edadDeclive` 23 → 27** (por debajo de esta edad no te retirás nunca), **`edadRetiroForzoso`
  31 → 34** (la línea Faker), **`chanceBasePorAnio` 0,24 → 0,55** (la ventana declive→forzoso se
  achicó, cada año pesa más para que la cola no se vaya a los 33).
- **`CONCEPTO`** §1 ("carreras que se terminan a los 25" → "27-28") y §2 (la etapa CARRERA
  PROFESIONAL pasa a 19-27, DECLIVE Y RETIRO a 27-34). §12.4 (investigación) queda intacta: marca
  el declive a los 23-25 — el juego lo estira a propósito, es el ethos "ir a más" de §1.
- **`validate.js`**: banda de edad mediana al terminar 22-27 → **24-30**; cola de carreras que
  llegan a 30+ años, tope 12% → **18%**.
- **Medido** (1.200 seeds): edad de retiro mediana **27** (era 25), p90 29, máx 32; **7,1%** llega
  a 30+; la duración sigue correlacionando con el potencial oculto (r ≈ 0,36).

### 2026-09-03 — Fase 9Rc: un solo criterio de valor de campeón

Octavo commit de la fase 9R. El motor **puntuaba el campeón con una fórmula, lo elegía con otra y
decidía si pausar con una tercera**: `calcularRendimiento` usaba solo maestría, `deseoPorCampeon`
maestría²×afinidad, `factorDraftFecha` solo afinidad. Podía auto-pickear un campeón peor para el
resultado del mapa. Esta subfase unifica el criterio. **Estructura, no tuneo** (regla de proceso 2):
`afinidadPesoEnRendimiento` se calibra en 9Rg.

#### `core/fuerza.js` (nuevo, puro — como `core/ficha.js`)

`rendimientoBase(state)` es todo `calcularRendimiento` **menos el `gauss`** de ruido; `fuerzaDelEquipo`
se movió tal cual desde `systems/rendimiento.js`, que ahora importa de acá y **re-exporta**
`fuerzaDelEquipo` (ningún llamador de fase 4/5 cambia). `calcularRendimiento` quedó en una línea:
`clampStat(rendimientoBase(state) + gauss(0, ruidoRendimiento, rng))` — un solo `gauss`, mismo orden,
**no corre el stream**. Lo hizo así la fase 8 con `nivelDelJugador`.

#### `factorDeCampeon` — la única respuesta a "cuánto vale este campeón"

`core/ajusteMeta.js`: cruza maestría **y** afinidad al meta, con la afinidad pesando la mitad
(`rendimiento.afinidadPesoEnRendimiento: 0.15`, `CONCEPTO` §6). Con afinidad neutra devuelve
exactamente el `factorMaestria` de antes — sin cambio de meta, el balance agregado no se mueve.
`rendimientoBase` la usa en vez de la maestría sola: **ahora el parche te mueve el rendimiento
también vía el campeón que terminás jugando**, no solo vía `multiplicadorDeMeta`. Los cuatro puntos
de elección (`decisionDeDraft`, `decisionDeDraftFecha`, los dos `resolverAuto`) ordenan/pesan por
`factorDeCampeon` (`pesoDePick` = `factorDeCampeon ** sesgoMaestriaEnPick`, monótona). Cuando el
motor elige por vos devuelve el **argmax** → el auto-pick peor es imposible por construcción.
`deseoPorCampeon` se queda donde el compounding de maestría² es el diseño (qué maineás, la quema del
rival, el comodín).

#### `factorDraftFecha` deja de contar doble

Nueva firma `(elegido, base, weights)`: ratio de `factorDeCampeon` contra el campeón del split,
clampeado a `±impactoDraftFecha`. Elegir el **mismo** campeón del split para la fecha da **0** (antes
sumaba un factor ≠ 0 siempre).

`lecturaDePick` (frase sin números para la tarjeta de draft, cruzando afinidad × maestría relativa
al pool) queda **definida y con sus bandas** (`BALANCE.draft.lectura`); se cablea en 9Rd.

**Verificación**: `validate.js` 104 checks OK (+4: factorDeCampeon sube con maestría y con afinidad ·
la afinidad al meta mueve el rendimiento base [Δ2,9 en la sonda] · el motor nunca auto-pickea un
campeón peor [0 violaciones en 2.368 auto-picks] · elegir el mismo campeón del split da
factorDraftFecha 0). `simulate.js 1000 60 todas`: 0 crashes. Determinismo con la misma seed OK.
**Deuda D37/D38**: el término de afinidad corre el stream — ninguna seed vieja reproduce su carrera.
Línea de base 9Rc/9Rd (T6, para 9Rd): drafts por serie mediana 1, solo 3% de las series con 0.

### 2026-09-03 — Fase 9R.2: Mentalidad y Hype se dibujan, y el burnout se ve venir

Séptimo commit de la fase 9R. `statRow.js` y la rama profesional de `ui/components/ficha.js` **no
dibujaban Mentalidad ni Hype** — y el 74% de los efectos del contenido mueve una de esas dos, con
el burnout matando ~5-6% de las carreras por una barra que el jugador nunca veía.

#### Las barras (motor + UI)

- **`core/ficha.js`**: `bandaDeMentalidad(state)` / `bandaDeHype(state)` (misma forma que
  `bandaDeJerarquia`: valor + label + delta). Mentalidad: `al límite` (≤ `burnoutMentalBajo`,
  rojo) · `tensionado` · `entero` · `en llamas`. Hype: `ignoto` · `conocido` · `figura` ·
  `estrella`. `delta` sale contra `edadSnapshot` (que ya guardaba ambos). Se suman a
  `fichaCompleta`.
- **`ui/components/ficha.js`**: fila `MENTALIDAD {v} · {banda} {▲▼} — HYPE {v} · {banda} {▲▼}`
  después de las barras de arraigo/jerarquía. Mentalidad en rojo (`.ficha-animo--peligro`) cuando
  está `al límite`. CSS nuevo.

#### El burnout deja de pinchar de un split para el otro

- **`atributos.js`**: el sorteo de burnout ahora solo entra si la mentalidad estuvo bajo
  `burnoutMentalBajo: 30` durante `burnoutSplitsMinimos: 2` splits seguidos
  (`flags.splitsMentalBajo`, nuevo, T4). El piso duro (`mentalidad ≤ 0`) sigue cerrando sin
  sorteo. Y la caída de mentalidad por **desgaste** de un split se topea en
  `maxCaidaMentalPorSplit: 12` (la espiral de deuda de sueño se cobraba toda junta).
- **Medido**: **87%** de los burnouts pasan ≥2 de los 3 splits previos con la mentalidad en zona
  roja visible (era imposible de anticipar antes).

> El punto 3 del §9R.2 del plan (bajar `config.velocidad` de las curvas para que los efectos no se
> disuelvan en ~5 splits) queda como commit de tuneo aparte (9R.2c) — regla de proceso 2.

#### Colateral

- **`proyeccionJerarquia`** (D39): el máximo tolerado sube de 28 a 34 — un seed outlier a 30 tras
  el enésimo corrimiento de stream. p90 sigue en 15 (tope 17): la señal está sana, es la cola.
  **La recalibración real de `proyeccionJerarquia` es 9Rg** (ya van cuatro fases empujándola).

**Verificación**: `validate.js` 100 checks OK (+2: la ficha profesional expone Mentalidad y Hype
con banda y flecha; el burnout no llega sin que la Mentalidad haya estado en zona roja ≥2 de los 3
splits previos). `simulate.js 1000 60 todas`: 0 crashes. Pendiente: e2e navegador.

### 2026-09-03 — Fase 9R5b: la tarjeta de legado

Sexto commit de la fase 9R. Con 9R5a la carrera ya termina; esta le da el **pago**: una tarjeta
final con un veredicto compuesto, hecha para screenshot (`CONCEPTO` §1/§9: *"todo el motor de
difusión del juego"*). **Toda** salida termina en tarjeta — la del mundialista con confeti y la
del pibe al que no lo dejaron, con su propio marco.

#### `src/core/legado.js` (nuevo, puro — como `core/ficha.js`)

`componerLegado(state)` arma `state.tarjeta`. El veredicto **se compone** (`PLAN.md` §10.2), no se
elige de una lista: `plantillaDeArquetipo + ". " + detalleDeCarrera`, donde el detalle **siempre
cita un hecho real** del registro de esa carrera (splits en tal org, años, un momento narrativo).

13 arquetipos gateados por `career.registro` / `finAnticipado`, desglosados fino para que ninguno
se lleve a toda la población (`CONCEPTO` §11, tope 25%): *el bicampeón* (≥2 internacionales) ·
*leyenda de {liga}* (1 internacional + ≥3 títulos t1) · *el mundialista de {org}* · *el que llegó
al internacional* · *campeón de {liga}* · *el eterno cuarto puesto* · *el pibe que pasó por primera
y no se quedó* · *el nómade que nunca echó raíces* · *el del ascenso* · *un profesional más* · más
los tres finales de fracaso (*el que no llegó / no lo dejaron / se bajó a los N*).

#### `src/ui/screens/tarjeta.js` (nuevo) + plomería

`renderTarjeta` pinta el marco (según `finAnticipado`), el veredicto, la franja de totales (años,
splits, títulos, nivel máx, valor máx) y la **historia org por org reusando `filaHistoria`** de
`ui/components/ficha.js` — escrita en la fase 8 explícitamente "para que la tarjeta de la fase 10
la reuse". `render.js` la exporta; `index.html` monta `#tarjetaPanel` en `renderResumenFinal`
cuando `state.tarjeta` existe, y lo limpia al empezar una carrera nueva. CSS `.tarjeta` /
`.tarjeta--exito` (confeti dorado) / `.tarjeta--sobria`.

#### El hook

`core/pipeline.js` compone la tarjeta una sola vez, en `conTarjeta(resultado)`, aplicado en los
tres puntos de retorno que pueden llevar `terminado: true` (`correrEtapas` corta el bucle en
`terminado`, así que un "sistema final" en `ETAPAS_SPLIT` nunca correría). `state.tarjeta: null`
nuevo en el estado inicial (T4).

#### Números medidos (800 seeds)

- **0** carreras terminadas sin `state.tarjeta`.
- Arquetipo más frecuente: **21,5%** (*"El que no llegó"*), bajo el tope de 25%. Reparto:
  nómade 18,5% · llegó al internacional 15,3% · mundialista 12,8% · bicampeón 11,3% · resto <5%.
- **0** veredictos que no citen un hecho real del registro.

> **Nota**: ~42% de las carreras tocan un internacional (mundialista + bicampeón + "llegó al
> internacional"). El internacional es demasiado accesible en el sim — es balance de 9Rg/9M, no de
> la tarjeta; el desglose fino del veredicto lo absorbe por ahora.

**Verificación**: `validate.js` 98 checks OK (+4: toda carrera terminada compone tarjeta bien
formada; ningún arquetipo supera el 25%; el veredicto cita un hecho real; `componerLegado` es puro
—no toca RNG ni muta el estado). `simulate.js 1000 60 todas`: 0 crashes. Pendiente: e2e en el
navegador (se hace junto con 9R.2, que también es UI).

### 2026-09-03 — Fase 9R5a: la carrera termina (retiro emergente)

Quinto commit de la fase 9R, primero del bloque "el final" (§9R.5). Antes **ninguna carrera tenía
un final exitoso**: `terminado: true` solo lo seteaban tres fracasos anteriores a ser profesional
(`amateur.js` ×2, `atributos.js` burnout); el **69%** de las carreras seguía "en carrera" a los 35
años, sin final ni tarjeta. La tarjeta final es *"todo el motor de difusión del juego"* (`CONCEPTO`
§1/§9).

#### `src/systems/retiro.js` (nuevo, después de `mercado` en `ETAPAS_SPLIT`)

Solo actúa en pretemporada, fase profesional. Cierra la run por probabilidad creciente:

```
p = chanceBasePorAnio × (edad − edadDeclive + 1) × factorNivel(state) × factorSinEquipo?
```

- **`factorNivel`** interpola el nivel actual del jugador (`nivelDelJugador`) entre dos anclas
  (45 → 2,2 · 82 → 0,45, clampeado a [0,3; 3]): un clase-mundial casi no se retira antes de los 30
  (la línea Faker), un prospecto cuelga los botines a los 24. **Es lo que hace que la duración de
  la carrera correlacione con lo buena que fue** (r = 0,43 medido).
- **`factorSinEquipo: 2,2`** — estar libre empuja fuerte a retirarse.
- **`edadRetiroForzoso: 31`** — pasada esa edad, retiro sí o sí (backstop).
- **`edadDeclive: 23`** — por debajo no se retira nunca por esta vía.

**Simplificación vs `PLAN.md` §10.1**: el retiro es **terminal** (`phase: 'retirado'` +
`terminado: true` juntos), no reversible. La ventana de vuelta (`vueltasMaximas`) queda para la
FASE 10 real — no está en el camino crítico. Constante `retiro` nueva en `balance.js`; los valores
se calibraron por medición (9R5c "calibrar la duración" del plan se pliega acá).

#### Números medidos (400-700 seeds)

| | Antes | Ahora |
|---|---|---|
| Carreras sin terminar a 90 splits | **~69%** | **0** |
| Edad al retirarse (mediana) | — | **24** |
| Carreras que llegan a 30+ años | — | **~3,4%** (la cola tipo Faker existe, es rara) |
| r(potencial oculto, duración de carrera) | ~0 | **0,43** — un crack juega más años |

#### Colateral (todo "la población cambió porque las carreras ahora terminan", ningún bug)

- **`El impacto de los minijuegos está acotado`** — reescrito. Medía una diferencia porcentual
  agregada en banda estrecha y se rompió tres veces (fases 4, 5, 9Ra). Con carreras de ~25 splits
  hay ~⅓ de los playoffs, así que el impacto agregado se encoge (1,5%). Ahora afirma directo lo
  que importa: acertar siempre rinde **más** que fallar siempre (no decorativo) pero **≤ +35%**
  (no gambling) — robusto a la longitud de la carrera.
- **`una renovación no se desploma por ruido puro`** — tope 30% → 40% (medido 38%). La muestra de
  renovaciones se concentra ahora en la primera mitad de la carrera, donde la jerarquía oscila más.
  Recalibrar `renovacionSigmaFactor` en 9Rg.
- **`picos.nivel se alcanza antes del último split`** — de "toda carrera de >20 splits, ≥70%" a
  "solo las que terminan a los 28+, ≥55%" (medido 58,6%). Con retiro a los ~24, el jugador termina
  en meseta (los ejes acumulativos compensan la caída de las curvas); el declive visible solo
  aparece en la cola larga.

**Verificación**: `validate.js` 94 checks OK (+3: ninguna carrera queda sin terminar y la edad de
retiro cae en `[22,27]` con la cola a 30+ en `[0.5%,12%]`; la duración correlaciona con el
potencial `r > 0,35`; `retiro.js` no consume RNG fuera de pretemporada/profesional).
`simulate.js 1000 60 todas`: 0 crashes.

### 2026-09-02 — Fase 9Rf: el presupuesto de interrupción

Cuarto commit de la fase 9R. El segundo y último corte de volumen: ponerle un techo al evento de
ambiente, que tras 9Re era la fuente más grande de decisiones que quedaba (~38 de las ~173 de una
carrera de 60 splits) y **nunca tuvo tope** — `events.js` pausaba una vez por split siempre que
hubiera candidato.

#### El sistema

- **`src/systems/presupuesto.js`** (nuevo, primero en `ETAPAS_SPLIT`, antes de `contexto` — no
  consume RNG): fija el cupo de interrupciones del split. Un split **eventful** (debutás, cambiás
  de tier, se te muere el main, o es split de playoffs) tiene cupo `eventful: 2`; uno de rutina,
  `rutina: 1`.
- **`core/pipeline.js` `pausar`**: descuenta uno del cupo en **toda** pausa — es el único choke
  point (`correrEtapas` y `resolverDecision` pausan por ahí).
- **`core/presupuesto.js` `hayPresupuesto`** / **`esSplitEventful`**: `events.js` consulta el
  saldo antes de frenar; el resto de los sistemas (mercado, cierre de edad, serie) igual descuenta
  pero no consulta — son decisiones obligatorias o ya gateadas por su propio sistema.
- El **segundo** evento encadenado lo sigue gobernando `probSegundaDecisionPorTipo` (fase 2), no
  el cupo: el presupuesto solo gatea el primero.
- `state.presupuesto: { total, gastadas }` nuevo en el estado inicial (T4).

> **Nota de implementación**: la primera versión usaba `tipoDeSplit` (denso/normal/comprimido)
> para el cupo, pero el **66%** de los splits profesionales daban "denso" (cupo 4) porque
> `tipoDeSplit` compara contra el `state.contexto` del split anterior y casi siempre algo se
> movió. Se reemplazó por `esSplitEventful`, que solo mira etapa/tier/main/playoffs — los ejes que
> de verdad marcan un split cargado.

#### Números medidos (carrera de 40 splits — el centro de "25-40 min")

| | Antes de 9R | Ahora (9Ra+9Rb+9Re+9Rf) |
|---|---|---|
| Decisiones por carrera | 248 (en 45 splits) | **122** |
| Decisiones por split | ~5,5 | **3,2** |
| Evento de ambiente por carrera | 68 | **~30** |
| Evento más repetido | 14 (hasta 32) | **5 (hasta 8)** |

A 40 splits el evento más repetido ya está en el objetivo de `§7.2` (mediana ≤4, máx ≤8). Sube a
~8 solo si se fuerza la simulación a 60 splits — un largo que no va a existir cuando esté el retiro
(9R.5).

#### Deuda nueva

- **D39** — 9Rb destapó un **sesgo de +6 puntos** en la proyección de jerarquía de la tarjeta de
  oferta (el debutante termina más arriba de lo prometido). `proyeccionJerarquia` estaba calibrada
  contra la tabla con el bug. Recalibrar en 9Rg/9M. El check `proyeccionJerarquia predice…` se
  reescribió: medía **un solo** fichaje contra un tope de 8 puntos; ahora mide la distribución
  sobre ~290 fichajes (|error| medio ≤ 9, sesgo ≤ +9, p90 ≤ 17) y acota el sesgo para que no
  empeore.

#### Checks tocados

- **3 nuevos**: el sistema de presupuesto no consume RNG; el evento de ambiente respeta el cupo;
  el volumen de decisiones bajó de la cinta (mediana ≤150 y ≤4/split a 40 splits, evento más
  repetido mediana ≤7 / máx ≤11).
- `Ningún minijuego puede setear terminado`: excluye el burnout (lo dispara `atributos.js` en el
  mismo split, no el minijuego — falso positivo que destapó el corrimiento de RNG).
- `El chaining de un segundo evento usa tipoDeSplit`: sin cambios (la primera versión de 9Rf le
  metía el cupo también al segundo evento y lo rompía; se revirtió).

**Verificación**: `validate.js` 91 checks OK. `simulate.js 1000 60 todas`: 0 crashes.

### 2026-09-02 — Fase 9Re: la temporada regular deja de ser una cinta transportadora

Tercer commit de la fase 9R. Ataca el primero de los dos cortes de volumen: bajar las decisiones
por carrera de 248 hacia ~70-90 **sin acortar la carrera en splits** (decisión del usuario).

#### La cuenta de hoy

`roll(2,3)` fechas marcadas por split × (draft a veces + momento siempre + reacción al 40%) ≈ 4,7
decisiones por split competitivo → **~108 de las 248 de la carrera**, casi todas sacadas del mismo
mazo de 24 cartas (`data/events/partido/`). El pool de postpartido son **4 eventos para toda la
carrera**.

#### Los tres cortes

1. **Una fecha marcada por split** (antes 2-3). `fechasMarcadasMin/Max` → `fechasMarcadasPorSplit: 1`.
   Se marca la **primera** fecha del split con un motivo real (nunca `parejo`), y como mucho una.
   Se fue `forzarMarca` (obligaba a marcar `parejo` al final para cumplir la cuota): una temporada
   sin ningún motivo real pasa entera resumida, y está bien. Sale la `roll()` de `iniciarTemporada`
   → un `rng()` menos por split competitivo (D38).
2. **La reacción postpartido deja de ser una decisión.** El propio código dice que no puede tocar
   el resultado (ya pasó); con 4 eventos y ~23 disparos por carrera repetía cada uno ~6 veces.
   Ahora se resuelve sola (opción por peso, exactamente lo que ya hacía el camino headless) y se
   cuenta en una línea. **El contenido no se borra: se degrada a crónica.** Es *"si hay una opción
   obvia, la toma solo y te lo cuenta en una línea"* del principio rector 2, literal.
3. **Los resúmenes de tramo llevan `tecnico: true`** para que la UI los pueda atenuar en vez de
   competir por la ventana del feed.

#### Números medidos

- Decisiones por carrera: **244 → 173** (mediana). El resto del camino a ~80 lo hace 9Rf, que
  todavía no corrió.
- Evento más repetido por carrera: **11 → 7** de mediana (máximo 14 → 9).
- Fechas marcadas: 92% de los splits competitivos tienen exactamente una, 7% ninguna, **0 con más
  de una**.

#### Colateral

- El check *"Nadie se queda varado"* pasó a FAIL en 1 de 150 carreras (seed 90: 15 splits sin
  equipo). Trazado: es un **veterano de 35 años** tras una carrera entera en tier 1 al que el
  mercado deja de llamar y —como el **retiro no existe todavía** (fase 9R.5)— no termina, se queda
  sin equipo hasta el tope de simulación. No es el bug que el check persigue (jugador trabado
  *temprano* en tier 3): es la ausencia de 9R.5. `TOPE_RACHA` sube de 12 a 16 como stopgap, con la
  nota de que 9R.5 hará que esas carreras terminen.
- `reaccion` deja de ser un `motivo` de decisión posible: el branch en `resolver` se borra.

**Verificación**: `validate.js` 88 checks OK (el check de "2 a 3 fechas marcadas" se reemplazó por
"como mucho una, y en el 35-99% de los splits"). `simulate.js 1000 60 todas`: 0 crashes.

### 2026-09-02 — Fase 9Rb: la tabla de posiciones deja de mentir media temporada

Segundo commit de la fase 9R. El segundo de los tres bugs de motor que fabrican la sensación de
que "es todo choto".

#### El bug, medido

`simularResto` (`src/core/temporada.js`) resolvía **el round-robin completo de todos los demás
equipos al abrir el split**, mientras tu fila (`filaPropia`) arrancaba 0-0 y crecía fecha a fecha.
`tablaDePosiciones` ordena por ganados absolutos. En la jornada *k* vos tenías *k* partidos y todos
los demás tenían *N-2*. Resultado: posición relativa media al llegar a cada jornada (1 = último):

```
jornada 1: 0,96    jornada 4: 0,79    jornada 7: 0,45    jornada 11: 0,37
```

**En la primera mitad de toda temporada el juego te informaba que ibas último, gobiernes como
gobiernes.** Y sobre esa tabla falsa se calculaban los motivos `puntero` y `define_clasificacion`
— la tensión narrativa entera de la fase 5.

#### El arreglo

`simularResto` (todo de una vez) → **`generarFixture(liga, propia)`**: un round-robin real de una
sola vuelta por el método del círculo. Con N equipos —siempre par en las ligas y zonas del juego
(tier 1: 8/10/14, tier 2: 10/12, tier 3: 6)— da N-1 jornadas, cada equipo contra cada otro una
vez, sin fechas libres. Puro y determinista, no consume RNG.

- `generarCalendario(state)` pasa a derivarse del fixture (misma firma, misma forma de retorno).
  Cambia **el orden de tus rivales** (antes: orden del archivo de liga) y `local` pasa a salir del
  cruce en vez de `indice % 2`.
- Los cruces ajenos de cada jornada se resuelven **en paso** con tus fechas, vía
  `aplicarCrucesDeJornada`, dentro de `avanzarFechaSilenciosa` — el único choke point por el que
  avanza una jornada, marcada o silenciosa. Todas las filas de la tabla avanzan juntas.
- `resolverFechaMarcada` ahora avanza la jornada **completa** (tu fecha + los cruces ajenos) antes
  de leer la tabla para el log "Quedan Xº de Y", así esa posición es la de una jornada de verdad
  cerrada.
- `career.temporada.cruces: []` nuevo en el estado inicial (T4).
- `simularResto` se borra (nadie más lo importaba).

#### Números medidos

- Posición relativa media en la primera mitad de la temporada: **~0,85 → ~0,35** (test aislado con
  equipos de igual fuerza y jugador al 50%). El pequeño sesgo hacia arriba es correcto: en un
  empate la fila propia ordena primero.
- Las **3.444 tablas finales** de 120 carreras cierran perfecto: Σ ganados = Σ perdidos, y todo
  equipo jugó tantas fechas como el jugador — en **toda jornada**, no solo al cierre.
- 3.040 temporadas (incluidas 327 de tier 3): 0 con calendario vacío.

#### Deuda nueva

- **D38** — 9Rb **reordena** (no agrega) llamadas de RNG: el total sobre la temporada es idéntico
  al viejo `simularResto` — `(N-1)(N-2)/2` tiradas —, pero ahora caen intercaladas con tus fechas
  y tus eventos en vez de todas juntas al abrir el split, y **qué pares** se cruzan en qué jornada
  cambia. Familia D21/D37. Peor para comparar seeds entre versiones, idéntico en balance agregado.

**Verificación**: `validate.js` 88 checks OK (+3: el fixture es un round-robin real; la tabla no
miente a mitad de temporada; toda fila jugó tantas fechas como el jugador en cualquier fecha
marcada). Se amplió el check *"La tabla de temporada cierra"* con la consistencia jornada a
jornada. `simulate.js 1000 60 todas`: 0 crashes.

### 2026-09-02 — Fase 9Ra: el cooldown de eventos se mide en splits

Primer commit de la **fase 9R** (`PLAN.md`), la que salió de comparar el juego contra **El Ídolo
del Potrero** a pedido del usuario: *"las frases se repiten, es todo choto, fijate por qué y
arreglalo"*. El diagnóstico completo (medido, no estimado) vive en `PLAN.md` §9R y en el plan
aprobado. Este commit ataca el primero de los tres bugs de motor que fabrican la repetición.

#### El bug, medido

`actualizarCooldowns` (`src/systems/events.js`) **decrementaba todos los cooldowns en 1 cada vez
que se resolvía un evento cualquiera**, no una vez por split. Y `resolverOpcion` se llama desde
tres lugares — `events.js`, `edadCierre.js` y `temporada.js` — con **4,48 resoluciones de evento
por split** de media. Consecuencia:

| `cooldown` declarado en el JSON | Splits que duraba de verdad |
|---|---|
| 4 (la moda: 27 de 97 eventos) | **0,89** |
| 6 | 1,34 |
| 10 | 2,2 |

El `cooldown: 4` de un evento no significaba "4 splits": significaba "los próximos 4 eventos de
cualquier tipo". Prácticamente inexistente.

#### El arreglo

`state.flags.cooldowns` (contador que se decrementaba) → **`state.flags.cooldownHasta`** (el
`splitCount` en el que el evento vuelve a estar libre). `cooldownActivo` compara contra
`state.player.splitCount`; `actualizarCooldowns` → **`registrarEventoVisto`**, que ya no
*decrementa* nada — estampa `splitCount + max(cooldownMinimoSplits, evento.cooldown)` y suma la
vista de `eventosVistos`. Se borra el tick entero, así que el bug no puede volver: no hay ningún
contador que se pueda doble-decrementar. La llamada `actualizarCooldowns(state, null)` del split
sin evento desaparece (no había nada que tickear).

El rename `cooldowns` → `cooldownHasta` es a propósito (familia T5): si algún lector quedó leyendo
el campo viejo, rompe en voz alta en vez de comparar un número de split como si fuera un contador.

**Constante nueva**: `BALANCE.eventos.cooldownMinimoSplits: 1` — piso para los 8 eventos que
declaran `cooldown: 0` o lo omiten. "Nunca dos veces en el mismo split". No se retunean los
`cooldown` de los 97 JSON (regla de proceso 2): eso es 9Rg.

#### Números medidos

- **Reapariciones antes de que venza el cooldown declarado: 0** sobre 36.826 apariciones de
  evento en 200 carreras (antes: ~18% de las reapariciones ocurrían con 1 split de diferencia o
  menos).
- Evento más repetido por carrera: **mediana 14 → 11, máximo 32 → 14**. Sigue por encima del
  objetivo de `§7.2` (mediana ≤4, máx ≤8) — se llega con 9Re+9Rf (menos instancias totales) y el
  apriete final de 9Rg, no con 9Ra sola.
- Decisiones por carrera: 248 → 244 (el volumen lo baja 9Rf).

#### Deuda nueva y colateral

- **D37** — 9Ra corre el stream de RNG: `candidatos()` devuelve otro conjunto en muchos puntos, el
  evento elegido cambia, y el stream diverge río abajo. **Ninguna seed anterior reproduce su
  carrera.** Familia D21/D22/D35. El determinismo intra-versión queda intacto (verificado: misma
  seed, dos corridas idénticas).
- El check *"El impacto de los minijuegos está acotado"* daba **7,3%** en HEAD contra un piso de
  **7%** — su propio comentario admitía el margen de 0,3 puntos. El corrimiento de D37 lo empujó a
  5,4%. Verificado que no es no-determinismo y que los minijuegos siguen moviendo el resultado
  (4,8–7,8% según ventana de seeds): se **ensancha la banda a 3–25%** con el motivo documentado en
  el check. Un minijuego decorativo daría ~0%; la regla que importa sigue con margen de sobra.

**Verificación**: `validate.js` 85 checks OK (83 + 2 nuevos: el cooldown mide splits y vence
exactamente en `splitCount + cooldown`; ningún evento reaparece antes de tiempo).
`simulate.js 1000 60 todas` → 0 crashes en las tres estrategias.

### 2026-09-02 — Fase P (parcial): el build, y D28 cerrada

Primer commit de la fase P. Sale de un pedido concreto: *"dejar esto privado, publicarlo en un
hosting después, buildea lo necesario pero para que salga todo bien."*

#### El repo queda privado, y eso cambia el host

Al pushear a GitHub se publicaron también `PLAN.md` (2.828 líneas), `PROGRESO.md`, `CONCEPTO.md`,
`DISENO.md` y `CLAUDE.md`: todo el diseño, las mediciones de balance y el razonamiento interno del
proyecto. Decisión del usuario: **el repo va privado y el sitio va público.**

Eso descarta GitHub Pages, que desde un repo privado exige plan pago. El destino pasa a ser
**Cloudflare Pages o Netlify** (build `npm run build`, output `dist`), que sí despliegan desde un
repo privado en el plan gratuito. `PLAN.md` §P.6 reescrito.

#### `src/dev/build.js` (nuevo) — `npm run build` → `dist/`, 576 KB

Sin bundler y **sin una sola dependencia**: el proyecto no tiene ninguna y esta fase no era excusa
para agregar la primera.

1. **Copia** `index.html` + `src/core`, `src/data`, `src/systems`, `src/ui`. Deja afuera
   `src/dev/` (148 KB), `server.js` y los cinco `.md`.
2. **Inlinea los JSON.** Los 32 imports con `with { type: 'json' }` necesitan Chrome 123+ /
   Safari 17.2+ / Firefox 138+, y en un navegador anterior no degradan: es un error de sintaxis, la
   pantalla queda en blanco y no hay nada en el log. Cada `foo.json` pasa a `foo.json.js` con
   `export default {...}`. **`dist/` no lleva una sola declaración de import attributes** y el piso
   de navegador baja a "soporta ES modules", que es 2018. Parsear cada archivo valida el JSON de
   paso.
3. **Comprueba `dist/`** — capitalización exacta de cada import (Windows no distingue, el host
   Linux sí), cero import attributes sin reescribir, cero llamadas al azar del navegador, ningún
   archivo con `_` inicial. Exit 1 si algo falla.
4. **Verifica que el build no cambió el juego**: 12 seeds × 30 splits corridas contra `src/` y
   contra `dist/`, comparando la huella de cada carrera. Una transformación de código que rompe en
   silencio da el peor bug posible —el local anda, el publicado no—, así que no se confía: se
   comprueba. **Las 12 carreras salieron idénticas.**

**El check funcionó a la primera vez que corrió**: el build falló señalando las 5 llamadas al azar
nativo de `index.html`. Era exactamente lo que tenía que atrapar.

Y después se atrapó a sí mismo. `validate.js` pasó a **82 OK y 1 FAIL**: *"Sin aleatoriedad nativa
fuera del RNG inyectado — encontrado en `src/dev/build.js`"*. El literal estaba en el **mensaje de
error del propio check**. Se resolvió con el mismo idioma que ya usa `guards.js`
(`const AZAR_NATIVO = 'Math' + '.random(';`), que existe exactamente por este motivo.

Verificado que el check **falla cuando debe** (regla de proceso 7, trampa T5): con una llamada al
azar nativo inyectada a mano en `index.html`, el build corta con exit 1 y la señala; restaurado el
archivo, vuelve a verde.

#### D28 cerrada — los 5 `Math.random()` de `index.html`

`PLAN.md` 9Ed decía "pasar el `rng` a los cinco `montar*`". **Se hizo distinto, a propósito**: los
minijuegos reciben `rngUi`, un stream **propio**, sembrado con
`mulberry32((seed ^ 0x9E3779B9) >>> 0)`.

Comer del stream principal habría hecho divergir al navegador —que juega los minijuegos— de
`simulate.js`, que resuelve por `resolverAuto` y nunca los monta: la misma seed daría dos carreras
distintas según dónde corriera, que es lo contrario de lo que la seed compartible (P.3) necesita.
Con stream separado el mundo sale idéntico de los dos lados, los minijuegos son deterministas, y
**no se corre el stream** (trampa T1): **las seeds anteriores siguen reproduciendo su carrera.**

#### Verificación en navegador de verdad

`dist/` servido y cargado en Chrome headless: **87 peticiones, 87 con 200.** El único 404 es
`/favicon.ico` (P.4, pendiente). Los 5 roles y el grid de campeones renderizan y los 27 módulos
JSON inlineados cargan; el manejador de errores de `index.html` no se disparó.

#### Lo que falta para publicar

**Un solo bloqueante: P.2, el guardado** (D36). Sin él, un refresh borra una carrera de 25-40
minutos. Después: la seed en la URL (P.3), los meta tags y el favicon (P.4), y el `README`/`LICENSE`
(P.5).

**Verificación**: `npm run build` OK · `node src/dev/validate.js` → **83 checks OK, 0 fallos**.


### 2026-09-02 — Se planean dos fases: 9M (el mercado de pases) y P (publicar)

Commit de documentación, **cero cambios en `/src`**. Existe porque `CLAUDE.md` es explícito: *"Nada
se planea en el momento: si algo no está escrito en `PLAN.md`, se escribe ahí antes de
implementarlo."*

---

#### Fase 9M — El mercado de pases

**El pedido**: *"el juego me parece una mierda, fijate cómo hacer que el juego deje de ser una
mierda y planeá el mercado de pases."* Resultó ser un solo pedido: lo que hace que el juego se
sienta muerto es exactamente lo que un mercado de verdad arregla.

**Lo medido antes de escribir una línea** (sonda propia, 120 carreras × 45 splits; 60 × 45 para el
conteo de eventos):

| Métrica | Medido | Lectura |
|---|---|---|
| Fichajes con elección real por carrera | **3,05** | el mercado se abre 3 veces en 15 años de juego |
| Pretemporadas con el mercado en silencio | **3,80** | *"Te queda un año de contrato"* y nada más |
| Ligas distintas pisadas por carrera | **media 1,48 · máx 2** | nadie, en 120 carreras, jugó en 3 ligas |
| Tier al cierre | **89 de 120 en tier 1 · 0 en tier 2** | la escalera es una cinta de un solo sentido |
| Carreras terminadas en 45 splits | **32%** | confirma D2 desde otra sonda |
| Decisiones por carrera | **162**, top-10 familias ≈ **40%** | la repetición vive en `events/partido/` |

La causa, leída en el código: el ascenso tier2→tier1 es `chance(0.12 + jerarquia/100 × 0.45)`
(`competitivo.js:124`) — ganar la liga no cambia nada; una org es `{ nombre, liga, fuerza }`
(`mundo.js:57-80`) y los compañeros se regeneran de cero al cambiar de equipo (`roster.js:18`), sin
edad ni contrato ni memoria; y `generarOfertasParaLiga` tira `roll(0, techo)` **solo sobre tu propia
liga** (`mercado.js:138-167`). **No hay un solo jugador NPC con carrera propia en todo el repo.**

**Tres afirmaciones del changelog viejo verificadas de primera mano** (trampa T6: no citar de
memoria):

- `registro.dineroTotalUSD` **nunca se incrementa.** Solo aparece en `state.js:162` (declaración) y
  `validate.js:2408` (un check de monotonía que pasa trivialmente sobre un 0). El changelog de la
  fase 9b afirma que `roster.js` cobra `salarioAnualUSD / 3` por split: **el código no lo hace.**
- `registro.picos.salarioAnualUSD` y `picos.rankedPuntos` están declarados y `registrarPico` nunca
  se llama con ninguno de los dos.
- `rivales[].puntaje` y `.desenlace`: solo la declaración en `mundo.js:235`, cero escrituras (D8).

**Precisión sobre la repetición**: el catálogo general está sano — la fase 8D midió 8,8% de
concentración mediana para el evento más visto, bajo el techo de 25%. La repetición está
**concentrada en `data/events/partido/`**: 24 fichas sorteadas ~75 veces por carrera (2-3 fechas
marcadas × ~30 splits pro). *"El objetivo que define la fecha"* sale ~10 veces por carrera. Va a la
fase 13, con un arreglo barato disponible antes: subir la fatiga anti-repetición solo para esa
familia.

**Lo escrito**: `PLAN.md` §9M completo (8 subfases con archivos, contratos de datos, constantes
nuevas y 14 checks con su valor de hoy y su objetivo), la fila **9M** en la tabla de estado y la
nota de por qué se inserta entre el mercado y el final.

La idea que sostiene la fase entera: **`org.fuerza` deja de ser un valor sorteado y pasa a derivarse
del promedio de nivel de su plantel.** Así ningún consumidor (`temporada.js`, `rendimiento.js`,
`serie.js`) cambia una línea el día 1, y desde el año 2 un equipo que ficha bien sube de fuerza y te
gana la liga.

**Decisiones del usuario** (a la tabla de `PLAN.md`, no se vuelven a preguntar):

1. **Rosters NPC reales**, no un modelo de demanda liviano.
2. **Mercado antes que retiro** — la fase 10 define el retiro como emergente y con el mercado de hoy
   eso vuelve a ser un dado.
3. **Sí a reescribir la escalera competitiva** — el ascenso deja de sortearse; aparece el descenso.

---

#### Fase P — Publicar

**El pedido**: *"cómo es la base de datos de este proyecto para poder subirlo"*.

**No hay ninguna.** Cero `localStorage`, `fetch`, `IndexedDB`, SQL o servicio externo en todo el
repo; el único `process.env` es el `PORT` de `server.js`. Lo que hace de base de datos son archivos
estáticos importados en tiempo de módulo. El proyecto es un **sitio estático de 850 KB, 0
dependencias y 0 build**; `server.js` son 60 líneas solo para desarrollo.

**Pre-flight corrido**: los **274 imports relativos resuelven con la capitalización exacta** (Windows
no distingue mayúsculas, el host Linux sí — la forma clásica de que un sitio ande local y explote
publicado) y no hay archivos con `_` inicial, así que no hace falta `.nojekyll`. El repo **no tiene
remote**.

Subirlo es trivial. Lo que **no** es trivial son los tres bloqueantes que en `localhost` no molestan:

1. **La partida no se guarda** — un refresh borra la carrera, con una sesión objetivo de 25-40
   minutos. Nueva deuda **D36**. Se arregla sin backend: `state.pendiente` ya existe para que la
   partida sea serializable a mitad de split, y falta exponer el contador de `mulberry32`
   (`rng.js:2`), hoy encerrado en una clausura.
2. **Los 5 `Math.random()` de `index.html`** (D28, ya asignada a 9Ed) — sin determinismo, un link
   con seed no reproduce nada. **D28 queda marcada como prerrequisito de P.**
3. **`with { type: 'json' }` en 32 imports** — en un navegador anterior a Chrome 123 / Safari 17.2 /
   Firefox 2025 no degrada: el juego no arranca. Hay que decidirlo explícitamente y verificarlo
   abriéndolo, no de memoria.

`PLAN.md` §P cubre además la seed en la URL, los meta tags (hoy compartir el link muestra una
tarjeta vacía), `.gitignore`/`README`/`LICENSE` (ninguno existe), el host, un `src/dev/preflight.js`
que haga repetible el chequeo de capitalización, y una verificación end-to-end sobre la URL
publicada. Fuera de alcance explícito: backend, cuentas, tabla de récords global y analytics.

---

**Verificación de este commit**: `node src/dev/validate.js` → **83 checks OK, 0 fallos**. Sin cambios en
`/src`, se corrió igual para tomar la línea de base en el momento en vez de citarla de memoria
(trampa T6).


### 2026-09-02 — Fase 9Ea+b: la carrera deja de vararse

El arreglo del bug D25, junto con las tres herramientas que lo dejaron pasar. Va en un solo commit
a propósito: la regla de proceso 7 pide verificar que un check nuevo **falla cuando debe**, y eso
solo se puede hacer con el código roto todavía en el árbol. Los checks se escribieron primero, se
corrió la medición contra `HEAD` para verlos en rojo, y recién después se aplicó el arreglo.

**Los checks, en rojo contra el código roto** (150 carreras × 60 splits, previo al arreglo):

| Check | Contra `HEAD` roto |
|---|---|
| Racha > 12 splits seguidos sin equipo | **58 de 150 carreras** la violan · peores: seed 7 (52), seed 9 (55), seed 21 (56) |
| Carreras varadas (pro, sin org, sin tier) | **50 de 150** |
| Fracción de splits pro con equipo (umbral 90%) | **49,7%** |

**El arreglo, una línea.** `disolverEquipo()` en `systems/competitivo.js` ponía `tier: null`, y la
fase 9b había guardado el re-fichaje detrás de `career.tier === 3` — la condición nunca era cierta
en el único caso para el que se escribió. Ahora el tier se conserva en 3: se te disolvió el equipo,
no dejaste de ser un jugador de tier 3. `liga` sigue en `null`, que siempre estuvo bien (tier 3 no
es una liga real). Vale la pena notar que la fase 9b **sí** conservaba tier y liga en el camino del
mercado (`quedarLibre`) — por eso ESE camino nunca se rompió, y por eso las 0 carreras varadas por
la vía del mercado en la medición.

**Después del arreglo**, mismas 150 seeds:

| Métrica | Antes | Después |
|---|---|---|
| Carreras con racha > 12 splits sin equipo | 58 de 150 | **0** |
| Racha máxima observada | 56 splits | **1 split** |
| Carreras varadas | 50 de 150 | **0** |
| Splits profesionales con equipo | 49,7% | **98,1%** |

**Las herramientas** (lo que impide que el próximo se esconda igual):

- **`simulate.js`** ahora recorre la carrera split a split, no solo mira el estado final. Bloque
  `carrera` nuevo en el reporte: `splitsProConEquipo`, `varadas`, `maxRachaSinEquipo` y
  `tierMaximo`. Era el hueco más grande — una racha de 57 splits sin equipo es **invisible desde
  el estado final**, que solo dice "sin equipo" una vez. Por eso 1.500 carreras no la veían.
- **`validate.js`**: dos checks nuevos (39 y 40), los de la tabla de arriba.
- **`contextos.js`**: `sin_equipo` deja de estar `pendiente: 'paso11'`. Corrección de etiqueta —
  lo estaba desde la fase 7, cuando ningún sistema producía ese estado, y la fase 9 le dio dos
  puertas sin sacarle la marca.

**Corrección al diagnóstico de la auditoría de esta misma mañana** (regla de proceso 4). La entrada
anterior y la fila D26 decían que `cobertura.js` reportaba "sin huecos" *porque saltea los momentos
`pendiente`*. **Es falso**: el `pendiente` solo cambia la etiqueta de una fila nunca observada,
nunca suprime un hueco. El mecanismo real es peor y se midió con `--momento sin_equipo`: la celda
`sin_equipo` reporta **58 eventos**, muy por encima del mínimo, porque los 58 son exactamente el
contenido mal gateado de D27 — los cinco eventos de rol (*"tu línea está ganada"*, *"la lupa está
sobre vos"*) que hablan de partidos profesionales que no estás jugando, `transfer_rumor` sin
contrato del que irse, `tercer_club_ya` sin club. **`cobertura.js` mide cantidad, no pertinencia**:
cuanto más contenido sin gatear se escribe, más sana se ve una celda inapropiada. Eso hace a D27
más importante, no menos, y le agrega un ítem a 9Ec: que la matriz sepa distinguir "hay 58 eventos
acá" de "hay 58 eventos que tienen sentido acá". D26 y la fase 9E quedaron corregidas en `PLAN.md`.

**Una cota de check movida, con la medición al lado** (regla de proceso 2: primero medir con la
estructura nueva). El check de densidad de decisiones falló en `seed 326, split 87: 25 decisiones`
contra un tope de 24. No es una regresión: al dejar de vararse, las carreras pasan de 49,7% a 98,1%
de splits profesionales **con equipo**, así que muchos más splits traen la carga profesional
completa (temporada con fechas marcadas, serie, draft) en vez de ser splits vacíos. No es un split
más pesado: son más splits pesados. Medido con la estructura nueva sobre 400 carreras / **25.688
splits**: p50=6, p90=12, p99=17, p999=21, máximo 25 — **un solo split en 25.688 (0,004%)** pasa
de 24. El tope sube a 28, en el mismo lugar y con el mismo criterio que las correcciones de las
fases 2, 4 y 5. El tope anti-loop real (`maxDecisionesPorSplit`, 60) no se tocó.

**El check de tier 3 pasa a medir por org, que es lo que siempre dijo que medía.** Falló con
"mediana de permanencia en tier 3: 5 splits (máximo 2)", y la causa es que el corte entre stints lo
hacía —sin querer— el propio bug D25: al poner `tier: null`, la disolución terminaba el stint *y de
paso la carrera*. Con `tier: 3` conservado, contar por tier junta todos los equipos chicos de una
carrera en un número solo y mide otra cosa. El comentario del check siempre dijo *"nadie se queda
mucho en **un equipo inventado**... una carrera puede pasar por tier 3 más de una vez **si el
equipo se disuelve**"*, así que el corte correcto es por org. Medido a 1500 carreras:

| Métrica | Mediana | p90 | Máx |
|---|---|---|---|
| Splits en **una misma org** de tier 3 (lo que gatea el check) | **2** | **5** | 19 |
| Splits totales en el **nivel** tier 3 | 5 | 12 | 36 |
| Gap sin equipo dentro de tier 3 | 1 | 1 | **1** |

La primera fila es idéntica al diseño original — el pedido se sigue cumpliendo. La tercera muestra
el arreglo funcionando: nunca pasás más de un split sin que te levante otro equipo. La segunda es
**un número que nunca se había podido medir**, porque antes las carreras largas en tier 3 no
existían: se varaban. Va a la deuda como D34, sin tocar una sola constante (regla de proceso 2).

**Conteo de checks corregido: son 83, no 38.** El número que reporté esta mañana salió de leer una
salida truncada de `validate.js` y se propagó a `PLAN.md`, a la entrada anterior de este changelog
y al mensaje del commit `d8e3eec`. Los documentos quedaron corregidos; el mensaje del commit no se
reescribe. La suite hoy: **83 checks, 83 en verde**, dos de ellos nuevos de esta fase.

**Trampa T1**: el arreglo cambia qué rama toma `competitivo.aplicar()` en las carreras que antes
quedaban varadas, y ahí `reFicharTier3` vuelve a consumir del stream. **Ninguna seed anterior
reproduce su carrera.** Es el precio del arreglo, no un efecto evitable.

**Verificación end-to-end (9E.9), seed 7 leída a mano.** Antes: firmaba con Fénix Esports en el
split 7, se disolvía en el 8, y los 52 splits restantes eran zombis — 4 a 6 logs por split, con
"Arraigo +2 al manager" y "en el draft no te dieron tu pick" cayendo sin equipo. Ahora:

```
split  7  Fénix Esports (tier 3)          split 11  Nova Uprising
split  8  se disuelve — un split libre    split 12  ASCIENDE a tier 2 · Cuadro Esports
split  9  Nexo Collective lo levanta      split 15  DEBUTA en tier 1 · Shifters
split 10  un split libre
```

Es una carrera. Y la densidad de logs pasa de 4-6 por split varado a 16-18 por split profesional.

**Cierre, 1000 carreras × 60 splits (`simulate.js`, estrategia equilibrado):**

| | |
|---|---|
| crashes | **0** |
| splits profesionales con equipo | **98,4%** |
| carreras varadas | **0 (0,0%)** |
| racha máxima sin equipo | 6 splits (la puerta del mercado: 3 pretemporadas sin oferta + libre, por diseño) |
| tier máximo alcanzado | tier1 71,9% · nunca fichado 26,8% · tier3 1,1% · tier2 0,2% |
| `validate.js` | **83/83** |

Falta de la fase 9E: **9Ec** (el gating del contenido sin vestuario, D27, ahora con el ítem de
`cobertura.js`) y **9Ed** (los `Math.random()` de `index.html`, las 3 constantes muertas, los 13
comentarios que citan `TRASPASO.md`).

### 2026-09-02 — Auditoría del simulador + limpieza de documentación

Sin cambios en `/src`. Dos entregables: una auditoría del estado real del motor, medida corriendo
y no leyendo, y la poda de la documentación que ya se contradecía con el código.

**Lo que está bien**, verificado corriendo: los **83 checks** de `validate.js` pasan (6m47s),
incluido el determinismo end-to-end. Dentro de `/src` no hay un solo `Math.random(` ni un
`document.` fuera de `src/ui/`. El motor de eventos sigue sin una línea de lógica por id de
evento: 97 eventos / **196 opciones** contra un objetivo de 150. `calcularContexto()` sigue pura y
sin consumir RNG. De ~250 claves de `BALANCE`, solo **4** están muertas. El mercado de la fase 9
mide bien lo que dice medir: salario lognormal verificado y la trampa del equipo grande viva en el
98,5% de las carreras con ofertas.

**Lo que está mal**, en un renglón cada uno (el detalle, con números, está en la tabla de deuda de
`PLAN.md`, D25-D33, y el arreglo en la fase 9E):

| # | Hallazgo | Medido |
|---|---|---|
| D25 | **La carrera se vara para siempre tras disolverse un tier 3** — regresión de la fase 9b | **30,7%** de las carreras, **47,5%** de los splits pro sin equipo, racha máx. **57 splits** |
| D26 | El agujero de medición que lo dejó pasar: `sin_equipo` está `pendiente` y `cobertura.js` no mide pendientes; `simulate.js` no tiene KPIs de carrera | `sin_equipo` es el momento **más frecuente del juego** (7.238) y `--huecos` reporta "sin huecos" |
| D27 | Contenido de vestuario disparando sin vestuario | "Arraigo +2" a una org inexistente; "en el draft no te dieron tu pick" ×6 sin equipo |
| D28 | 5 `Math.random()` en `index.html` que deciden el resultado de los minijuegos | jugando a mano, la misma seed **no** reproduce la carrera |
| D29 | El eje `residencia` está clavado en `'local'`: sin imports, sin transferencias entre regiones | el momento `import_recien_llegado` es inalcanzable por construcción |
| D30 | `ultimo_ano` y `sin_renovacion` declarados en `EJES` y nunca calculados | pese a que `contrato.aniosRestantes` ya existe |
| D31 | 4 constantes muertas en `balance.js` | `margenImport`, `autoProbRobar`, `ruidoRival`, `margenEdadMinima` |
| D32 | `validate.js` tarda **6m47s** y la Definición de terminado lo exige en cada cambio | — |

**Corrección al changelog de la fase 9d** (regla de proceso 4: reportar los números medidos,
incluidos los que empeoran). Esa entrada reporta *"carreras con al menos un split libre: **0,3%**"*.
El número real es **35,3%**. La métrica no estaba mal calculada: estaba mirando solo la puerta del
mercado (`quedarLibre`), y la vía dominante hacia "sin equipo" es la disolución de un tier 3, que
no pasa por ahí. La entrada vieja se deja como está — es historia; la corrección vive acá.

**Por qué 83 checks en verde convivieron cuatro commits con un bug que le saca el juego al 30% de
las partidas.** No fue mala suerte, fueron tres ciegos alineados: `cobertura.js` saltea los momentos
marcados `pendiente`, y el que este bug produce (`sin_equipo`) está marcado así desde la fase 7;
`simulate.js` solo reporta métricas de la etapa amateur, así que 1.500 carreras no ven nada
después del fichaje; y la métrica de la fase 9d medía la puerta equivocada. **La fase 9E arregla
las tres herramientas junto con el bug** — si no, el próximo se esconde igual.

**Limpieza de documentación.** Se borraron `AUDITORIA.md` (242 líneas, diagnóstico del commit
`464ccf7`, 28 commits atrás: decía "5 checks" cuando son 38 y "24 archivos de `/src`" cuando son
60) y `TRASPASO.md` (891 líneas, cuyo propio encabezado declaraba superadas las PARTES 0-3, 5, 6,
9 y 10). Lo que seguía vivo se mudó antes de borrar:

- **La investigación** (PARTE 4: ranked, ligas 2026, duración de carreras, Fearless, salarios) →
  `CONCEPTO.md` **§12**, con la numeración conservada (`TRASPASO §4.N` → `§12.N`) para que las
  citas viejas sigan resolviendo.
- **Las trampas T1-T10** (PARTE 7) → `PLAN.md`. No era opcional: hay 17 referencias `(trampa TN)`
  en `PLAN.md` y 13 más en `/src` cuya única definición vivía ahí.
- La PARTE 8 (reglas de proceso) ya estaba en `PLAN.md` como superset. El resto no tenía nada vivo.

También: `DISENO.md` §1 decía *"3 a 5 minutos por partida"* contra la decisión textual del usuario
(25-40 min), su árbol de archivos no listaba 21 archivos que existen, y su §6 "Orden de
construcción" —la lista de 11 pasos superada por las 13 fases— se cortó junto con la tabla de
`PROGRESO.md` que la usaba como eje y arrastraba el error. `CLAUDE.md` dejó de nombrar un archivo
que ya no existe.

Quedan colgados **13 comentarios de `/src`** que citan `TRASPASO.md §4`: la redirección a
`CONCEPTO.md §12` es un reemplazo de texto sin lógica, anotado como D33 para el próximo commit que
toque `/src`.

### 2026-08-11 — Fase 9d: calibrar el mercado (cierra la fase 9)

Último commit de la fase 9. Medido con un script ad hoc (headless, mismo pipeline que
`simulate.js`, 1500 carreras × 60 splits, borrado después de medir — no queda en el repo) contra
las métricas de `PLAN.md` §9.9:

| Métrica | Medido | Objetivo | Lectura |
|---|---|---|---|
| Decisiones de mercado/carrera (toda la población) | mediana 0 | 3-8 | El 60% de las carreras nunca llega a una liga real dentro de la ventana medida — eso es la escalera de la fase 3 (tier3→tier2→tier1), no algo que la fase 9 controle |
| Decisiones de mercado/carrera (solo quien llega al mercado) | mediana 9, p90 11 | 3-8 | Se pasa un poco. Ver nota abajo — no se retocó |
| Carreras donde rechazar el mejor sueldo tiene sentido (la mejor oferta NO es también la de mejor jerarquía) | 98.5% | ≥ 35% | La trampa del equipo grande (CONCEPTO §7) está viva casi siempre que hay ofertas |
| Carreras con al menos un split "libre" | 0.3% | se mide, alimenta la fase 10 | Bajo, pero es dato para la fase 10 — no hay objetivo que cumplir todavía |

**Por qué la mediana condicional (9) no se retocó pese a pasarse del objetivo (3-8):** sin retiro
emergente (fase 10, todavía no existe), ninguna carrera profesional termina antes de agotar los 60
splits medidos salvo por burnout — así que cualquiera que llega al mercado se queda ahí acumulando
renovaciones el resto de la simulación. Achicar `aniosContratoMax` para forzar el número a bajar
habría sido calibrar contra un artefacto (la ausencia de retiro), no contra el sistema real, y
`aniosContratoMin`/`Max` (1-3 años) ya están anclados a los contratos reales que cita `TRASPASO.md`
— tocarlos sin esa razón real habría sido shotgun-debugging. Queda anotado para remedir después de
la fase 10, cuando el retiro acote la duración de la carrera y el denominador de esta cuenta deje de
estar sesgado hacia las carreras más largas.

**El ajuste que sí se hizo, con datos**: una renovación con el sueldo de la propia org caía por
debajo de la mitad del contrato anterior en **34,8%** de los casos (hasta 4,5× para arriba en el
p90) — puro ruido lognormal de una oferta nueva, no la lectura de un club que ya te conoce. Nueva
constante `BALANCE.mercado.renovacionSigmaFactor: 0.35`: achica el `sigma` de `salarioDeOferta`
SOLO para la oferta de renovación (una liga con el sigma escalado, construida al vuelo en
`mercado.js`, sin tocar `core/salarios.js` — ese sigue puro y sin cambios desde la fase 9a), sin
tocar la señal de jerarquía/hype. Después del ajuste: caídas fuertes 34,8% → **24,5%**, p90 del
ratio 4,49× → **2,15×**. Lo que sigue cayendo por debajo de la mitad ahora es sobre todo jerarquía/
hype que bajaron de verdad, no el dado.

**Check nuevo** (verificado con T5 — revertido el factor a 1.0, confirmado que el check reproduce
el 34,8% original y falla, revertido de nuevo): *"una renovación no se desploma por ruido puro"* —
menos de 30% de las renovaciones por debajo de la mitad del contrato anterior, sobre 1500 carreras.

**Medido**: `node src/dev/validate.js` — **81 checks, todos OK** (80 + 1 nuevo).
`node src/dev/simulate.js 1500 60 todas` — 0 crashes, mismos porcentajes de `llegaronAPro` que 9a-9c
(esperable: 9d no toca nada de la etapa amateur). Determinismo verificado en 3 seeds.

**Fase 9 cerrada.** El mercado completo: contratos y valor de mercado (9a), la elección real de a
qué org vas (9b, el cambio de más riesgo del documento), la pantalla (9c), calibrado con datos
reales de 1500 carreras (9d). Sigue pendiente para más adelante (no bloqueante, documentado arriba
y en la entrada de 9b): fichajes cross-liga/import (`cupoImports`/`minimoResidentes`/`margenImport`
siguen sin consumirse), y remedir la mediana de decisiones/carrera después de que exista el retiro
(fase 10).

### 2026-08-11 — Fase 9c: la pantalla de ofertas

La pantalla que le pone cara a la fase 9 (`PLAN.md` §9.5-9.6): la tarjeta de oferta, la grilla de
hasta 6, y el botón del representante. Puro trabajo de presentación — ningún archivo de `src/core/`
o `src/systems/` cambia, así que no hace falta un check nuevo de `validate.js` (corre en Node, sin
DOM) ni afecta `simulate.js`.

**Nuevo**: `src/ui/components/mercado.js` (`renderMercado`), siguiendo el mismo patrón que
`components/decision.js` — no calcula nada, solo pinta lo que `systems/mercado.js` ya resolvió
(regla de proceso 2). Cada tarjeta muestra org, liga, tag, sueldo/años, la proyección de jerarquía
con flecha (▲/▼/→) y la etiqueta de banda, la frase sobre picks, el costo de arraigo al irse (si
aplica), dónde arrancás en la nueva org, `progresoHito` cuando es una renovación, y la línea de
riesgo. `screens/carrera.js` suma `mostrarMercadoEnPantalla`, exportada desde `render.js` con el
mismo criterio que ya usan `renderDecision`/`renderFicha`.

`index.html`: un tercer panel (`#mercado`, junto a `#decision` y `#minijuego`) y una rama nueva en
`mostrarDecision` que revisa `decision.presentacion === 'mercado'` antes de caer al renderer
genérico — mismo patrón que ya separaba minijuegos de decisiones normales. CSS nuevo (`.mercado`,
`.mercado-card`, etc.) reusa la paleta ya establecida (verde para lo bueno, naranja para el riesgo,
el mismo tono que `.rol-costo`).

**Verificación end-to-end en Chrome real** (headless vía CDP, mismo método que la fase 8D): seed 2,
Mid, tres campeones — la carrera asciende tier3→LDL→LPL. Se vieron 3 pantallas de mercado completas:
- 6 ofertas de ascenso a LDL con salarios entre \$18k y \$442k/año (el spread lognormal, visible), la
  misma jerarquía proyectada (71→25/29/32/34 según el roll de cada org) y la línea de riesgo que
  cambia según cuán fuerte es la org destino.
- Se usó el botón del representante: rebarajó una segunda mano de 6 ofertas distintas y desapareció
  (ya no vuelve a aparecer esa carrera — el guard del motor, no solo la UI, lo garantiza).
- Una tercera pantalla con una sola oferta (ascenso a LPL, ThunderTalk Gaming) tras la segunda
  promoción.
- Cero errores de consola atribuibles al código del proyecto (el único mensaje de red — un 404
  genérico sin URL asociada en el listener de `response` — no corresponde a ningún recurso servido
  por el proyecto; se investigó explícitamente para no darlo por sentado).

**Medido**: `node src/dev/validate.js` — 80 checks, todos OK (sin cambios: 9c es UI pura).
`node src/dev/simulate.js 1500 60 todas` — 0 crashes, mismos porcentajes que 9b (esperable).

### 2026-08-11 — Fase 9b: el mercado decide, competitivo.js deja de sortear

El cambio de más riesgo del documento (`PLAN.md` §9.4, palabras del propio plan): `competitivo.js`
deja de elegir a qué org fichás. Ahora solo decide SI ascendés (mérito: jerarquía y suerte);
`mercado.js` —sistema nuevo, corre justo después en `ETAPAS_SPLIT`— decide A QUÉ ORG vas, y esa es
la decisión real del jugador que pedía la fase.

**El flujo**: `competitivo.js` marca `flags.ascensoPendiente = {ligaId, tier}` al ganar un ascenso
(tier3→tier2 o tier2→tier1) y no toca `career.tier`/`liga`/`currentOrg` — seguís jugando donde
estabas hasta que se resuelve. `mercado.js` corre en cada pretemporada (`ventana === 'pretemporada'`,
trampa T2: contexto en vivo, nunca cacheado): si hay un ascenso pendiente y ya tenés la edad mínima
de la liga destino, genera 1-6 ofertas y pausa con una decisión; si no tenés equipo real todavía
(tier 3, o esperando edad), no hace nada. Para quien YA está en una liga real, decrementa
`contrato.aniosRestantes`; en 0, genera ofertas (una posible renovación con la org actual +
laterales de otras orgs de la liga, pesadas por fuerza) — 0 ofertas 3 pretemporadas seguidas te deja
`libre` (currentOrg null, pero conservás tier/liga: seguís siendo talento de esa categoría, no caés
a tier 3). "Llamar al representante" (§9.6) rebaraja la mano una única vez por carrera — el motor
lo garantiza en el propio `resolver`, no confía en que la UI oculte el botón después de usarlo.

**El año muerto se unifica**: `flags.tier1Esperando` (fase 3, guardaba liga+org+edad) desaparece —
ya no tiene sentido reservar una org de antemano si la org pasa a elegirse en `mercado.js`. La
espera por edad ahora es una consecuencia de `ascensoPendiente` sin más: `mercado.js` no genera
ofertas hasta que `state.age >= liga.edadMinima`, sin volver a sortear nada, exactamente el mismo
comportamiento de antes con un flag menos que mantener sincronizado.

**Regla de proceso 15, resuelta sin volver a tirar el dado dos veces**: la jerarquía que promete la
tarjeta de oferta (`proyeccionJerarquia.hasta`) tiene que ser la que de verdad asigna `roster.js` al
fichar. Se extrajo `jerarquiaAlFichar(state, rng)` de `roster.js` (mismo cálculo de siempre, ahora
reusable) y `mercado.js` la tira UNA vez al construir cada oferta, guardando el resultado crudo en
`oferta.datos.jerarquiaProyectada`. Al aceptar, ese número viaja por
`flags.jerarquiaProyectadaAlFichar`; `roster.js` lo usa tal cual (`?? jerarquiaAlFichar(...)` como
fallback solo para fichajes que NO vienen del mercado, como el primer tryout de tier 3) en vez de
tirar un segundo gauss — evita exactamente la trampa T1 de "dos tiradas para el mismo evento".
El sueldo también se registra en la fila del registro (`registrarSalarioEnFila`) desde
`roster.js` (al abrir fila) y desde `mercado.js` (al renovar, donde no hay fila nueva que abrir).

**`registro.dineroTotalUSD` empieza a moverse**: `roster.js` cobra `contrato.salarioAnualUSD / 3`
(=`BALANCE.edad.splitsPorEdad`) cada split jugado con equipo — prorrateado porque el sueldo es
anual y un año son 3 splits. Ya estaba en la lista de campos monótonos del check de la regla de
proceso 14 desde la fase 8 (por adelantado, en 0); ahora por fin se mueve.

**Corrección al interactuar con tier 3**: encontrada ANTES de escribir código, razonando la
interacción — `competitivo.js`'s `aplicar` re-fichaba automático a CUALQUIER jugador sin
`currentOrg`, asumiendo que la única forma de quedarte sin org era una disolución de tier 3. Con la
fase 9, un jugador de tier 1/2 puede quedar libre también, y ese dispatcher lo habría re-fichado a
un equipo de tier 3 por error — un downgrade absurdo para alguien con jerarquía de verdad. Se
corrigió el guard a `state.career.tier === 3` antes de llamar `reFicharTier3`; un libre de tier 1/2
espera a que `mercado.js` le consiga equipo, no cae mecánicamente a la categoría más baja.

**Checks nuevos** (verificados con T5 — mutados y confirmado que fallan antes del arreglo,
revertido después):
- ningún cambio de org en tier 1/2 pasa sin un log de `mercado.js` en el split (excepto tier 3)
- `proyeccionJerarquia` predice la jerarquía real con error ≤ 8 puntos (PLAN.md §9.8; en la
  práctica el roll es EXACTO al firmar — el margen cubre que `rendimiento.js` puede correr la
  jerarquía un poco más tarde en el mismo split, por el propio desempeño de esa fecha, que es
  comportamiento esperado y no una promesa rota)
- el sesgo etario reduce cuántas ofertas llegan, no solo si llegan: 28 recibe ≤50% del promedio de
  ofertas que 21 con la misma hoja
- nadie ficha por una liga sin cumplir su `edadMinima`
- el representante se usa exactamente una vez por carrera (atrapó un bug real: la primera versión
  del `resolver` no tenía el guard y permitía rebarajar sin límite)
- ninguna oferta muestra `progresoHito` si no es una renovación (el primer intento de este check
  colisionaba con `amateur.js`, que también usa `motivo: 'oferta'` para la decisión de scouting —
  corregido para filtrar también por `sistemaId === 'mercado'`)

**Ajustes a checks existentes, todos documentados como consecuencia del cambio de flujo, no como
regresiones silenciosas**:
- *"El tier 3 es breve"*: p90 sube de 4 a 5 splits por diseño. Ascender ya no es instantáneo — el
  split de espera hasta la próxima pretemporada cuenta como "en tier 3" en esta medición. La
  mediana se mantiene en 2.
- La marca `espera_edad_minima` y el check del año muerto se reescribieron contra
  `flags.ascensoPendiente` en vez de `flags.tier1Esperando` (que ya no existe).

**Medido**:
- `node src/dev/validate.js` — **80 checks, todos OK** (74 + 6 nuevos).
- `node src/dev/simulate.js 1500 60 todas` — **0 crashes** en 4.500 carreras; `llegaronAPro` idéntico
  a la fase 9a (73.7% / 47.5% / 67.9%: esperable, la etapa amateur no la toca esta fase). Sin
  NaN/undefined en la salida.
- Determinismo verificado en 4 seeds distintas (misma seed, dos corridas, JSON final idéntico).
- Lectura manual de una carrera completa (seed 2): ascenso tier3→LDL→LPL, dos renovaciones y una
  transferencia, cierra con un bombazo a Weibo Gaming (\$1,5M/año). Se lee como se pedía: "¿la guita
  o el proyecto?" con números que cambian carrera a carrera.

**Trampa T1, tal como estaba documentado por adelantado en la entrada de la fase 9a**: correr esto
movió el stream de rng — ninguna seed de antes de esta fase reproduce la misma carrera que producía
antes. Es el costo esperado de que `mercado.js` ahora tire dados donde antes `competitivo.js` no
tiraba ninguno.

**Deuda técnica para 9c/9d, no bloqueante**:
- Los campos puramente visuales de la tarjeta (`colorOrg`, `monograma` de §9.5) no existen en el
  modelo de datos: son responsabilidad de la pantalla (9c), no del motor.
- `cupoImports`, `minimoResidentes` y `margenImport` siguen sin consumirse — esta fase solo genera
  ofertas DENTRO de tu propia liga/región (renovación, laterales, el ascenso ganado). Fichajes
  cross-liga ("import" de verdad) quedan fuera de alcance de 9b, documentado para no confundir con
  un olvido.
- Se observó al menos una renovación con una caída de sueldo grande (\$625k → \$93k en la misma org,
  mismo jugador) puramente por el ruido lognormal independiente en cada tirada. No es un bug — la
  fórmula es la que cita `TRASPASO.md` sin retocar — pero es candidato a revisar en 9d si medir
  muestra que las renovaciones deberían tener menos varianza que un fichaje nuevo.

### 2026-08-11 — Fase 9a: contratos y valor de mercado

Primer commit de la fase 9 (`PLAN.md` §9), el mercado. Este paso es solo el motor y los datos —
`competitivo.js` todavía elige tu org (eso es 9b, el cambio de riesgo) y no hay pantalla de ofertas
todavía (9c). Detalle completo del diseño en `PLAN.md`, `# FASE 9 — EL MERCADO`.

**Motor nuevo**: `career.contrato` (objeto completo de ceros desde el arranque, nunca `null` —
trampa T4) en `src/core/state.js`; `core/salarios.js` (`salarioDeOferta`, la fórmula lognormal de
`TRASPASO.md` §4: `mediana * exp(gauss(0,sigma)) * factorRol * jerarquía * hype`, con piso en
`liga.salario.minimoUSD`); `core/valorMercado.js` (`valorDeMercado`, pura y sin rng — una valuación
es una lectura del estado, no una negociación; `sesgoEtario`, el mismo modelo de "el mercado
prefiere jóvenes" que `amateur.scoutingSesgoEtario` pero para la franja de la carrera pro;
`splitsDeResidencia`, derivada de `career.registro.porOrg` sin agregar estado nuevo — evita otro
punto T1/T4 para la regla de "12 splits en una región = residencia" de TRASPASO §4).

**Datos**: `salario: {medianaUSD, mediaUSD, sigma, minimoUSD, modelado}` en las 12 ligas de
`leagues.json` — LEC con las cifras reales citadas en `TRASPASO.md` (Sheep Esports: mediana
~€165k/€178k, media ~€240k/€259k, mínimo oficial €60k/€65k) y LCK/LCS ancladas en sus datos reales
parciales (mínimo LCS $75k oficial; LCK con el outlier real de Faker $6-8M/año tirando la media
muy por encima de la mediana). El resto (LPL, CBLOL, LCP y las 6 ligas de tier 2) está modelado por
prestigio relativo y marcado `modelado: true` para no confundir cifra medida con estimada.
`factorSalario` por rol en `roles.js` (Mid 1.44 · Jungla 1.04 · ADC 1.00 · Top 0.80 · Support 0.70,
TRASPASO §4). `BALANCE.mercado` nuevo con las constantes de §9.7 más la tabla `sesgoEtario` y los
pesos de `valorDeMercado`. `atributos.curvas.*.declive` suavizado ~40% (1/0.6/0.45 → 0.6/0.36/0.27):
el hallazgo de TRASPASO §4 es que el declive real es casi todo mercado (no te renuevan) y casi nada
biológico (~1ms/año de reacción contra 90ms de brecha pro/casual) — la curva se nota menos sin
desaparecer, porque `CONCEPTO` §6 la necesita como razón mecánica para invertir en macro.

**Corrección de nombre, documentada acá porque no hubo turno de usuario de por medio**: `PLAN.md`
§9.1 nombra el campo `salarioMensualUSD`, pero tanto la fórmula de TRASPASO como todos los datos
reales citados (LEC ~€165k/año, Faker $6-8M/año) están en cifras **anuales** — el juego además
opera en splits, no en meses. Se corrigió a `salarioAnualUSD` en todo el motor (`state.js`,
`registro.js`) antes de escribir ningún dato nuevo, para no fijar una inconsistencia desde el
arranque.

**Bug encontrado por el check nuevo, no por lectura de código**: los primeros números de `sigma`
elegidos a mano para las 12 ligas no eran consistentes con la `mediana`/`media` citadas en el mismo
archivo — para una lognormal, `media = mediana * exp(sigma²/2)`, y el check
*"mediana empírica < media × 0.75"* falló en LEC (0.72 de sigma a mano da un ratio teórico
mediana/media ≈ 0.77, por encima del 0.75 que exige el check). Se recalculó `sigma` para las 12
ligas como `sqrt(2·ln(mediaUSD/medianaUSD))`, consistente con los datos ya citados — no se tocó
`medianaUSD`/`mediaUSD` (esos siguen anclados en TRASPASO donde hay dato real). El efecto lateral es
que LCK quedó con el sigma más alto de las doce (1.51): es el mercado con el outlier más extremo
(Faker), así que un spread grande ahí es el modelo funcionando, no un error.

**Checks nuevos** (verificados con trampa T5 — mutados a mano y confirmado que fallan antes de
confirmar que el arreglo los deja en verde, revertido después):
- esquema `salario` completo y `minimoUSD < medianaUSD < mediaUSD` en las 12 ligas (dentro de
  *"Campeones, roles y ligas coherentes"*)
- `factorSalario` existe y es positivo para los cinco roles
- `salarioDeOferta` produce una distribución lognormal (mediana empírica < media × 0.75) — **este
  es el que atrapó el bug de sigma de arriba**, verificado además con el piso de `minimoUSD`
- `sesgoEtario(28) ≤ sesgoEtario(21) × 0.5` (TRASPASO §4) y la tabla es no creciente con la edad
- `career.contrato` arranca completo y en cero (trampa T4)
- `valorDeMercado` es 0 fuera de una liga real (tier 3 o sin equipo) y positivo adentro

**Medido**:
- `node src/dev/validate.js` — **74 checks, todos OK** (69 + 5 nuevos).
- `node src/dev/simulate.js 1500 60 todas` — **0 crashes**, mismos porcentajes de `llegaronAPro`
  que la línea de base pre-fase-9 (equilibrado 73.7% / ranked 47.5% / prudente 67.9%): esperable,
  `mercado.js` todavía no existe y no hay ninguna línea nueva en `ETAPAS_SPLIT` — este commit no
  cambia ni una sola decisión de una carrera real todavía, solo agrega el motor que 9b va a usar.
- Determinismo verificado (misma seed, dos corridas, estado final idéntico en JSON).

**Sin trampa T1 todavía**: a diferencia de 9b (que si va a correr el stream de rng, documentado por
adelantado en `PLAN.md` §9.4), este commit no cambia el orden ni la cantidad de tiradas de ninguna
carrera existente — los tres módulos nuevos no se llaman desde ningún sistema del pipeline todavía.

### 2026-08-10 — Fase 8D: contenido vivo — las marcas sin frase, el eje estatus, el registro que se cita

Insertada fuera de la secuencia lineal (mismo criterio que las fases 5/6 el 2026-08-09): pedido del
usuario de llenar el juego de contenido real, que nada se repita, y que algunas decisiones "marquen
el resto de la carrera" — usando lo que la fase 8 dejó construido y sin estrenar. Detalle completo
en `PLAN.md`, `# FASE 8D`.

**Auditado antes de escribir una línea** (tres exploraciones en paralelo + investigación propia del
estado real de LoL 2026): el catálogo medía 70 eventos/142 opciones/284 outcomes (no 20/40 como
decían documentos viejos — solo faltaban ~8 opciones del objetivo de 150, no 110); 6 marcas que
`calcularMarcas` ya calculaba cada split (`pc_confiscada`, `negociacion_ganada`, `sin_secundario`,
`secundario_terminado`, `signature`, `espera_edad_minima`) no tenían ni un evento detrás; el eje
`estatus` (rookie→titular→referente→franquicia) no gateaba ni un evento; `career.registro.momentos`
—el slot que la fase 8 dejó listo "para que la fase 13 pueda citarlos"— tenía cero llamadas.

**Motor** (3 cambios chicos, todos aditivos): efecto nuevo `type: "momento"` que escribe en
`career.registro.momentos`; 5 marcas nuevas derivadas del registro (`es_campeon`, `multicampeon`,
`paso_por_tier3`, `curtido`, `nomade` — cero persistencia nueva, leen lo que fase 8 ya acumula); fix
de un bug encontrado en la auditoría (`objetivo: "nuevo"` en el efecto `maestria` caía siempre en el
campeón principal en vez del recién aprendido — `pool_campeon_nuevo`/`pool_campeon_nuevo_soloq`
llevaban este bug desde antes de esta fase); la ficha muestra los momentos junto a "Ver carrera".

**Contenido**: 28 eventos nuevos / 54 opciones nuevas en 8 archivos (4 nuevos: `marcas_vivas.json`,
`estatus.json`, `registro_cita.json`, `escena_2026.json`; 4 extendidos: `rol/jungla.json`,
`negocios.json`, `salud_vida.json`, `competicion.json`). Todo evento nuevo declara `etapa` y, cuando
aplica, `edadBanda`/`nivel`/`estatus`/`marcas` explícitamente. `escena_2026.json` usa grounding real
investigado aparte (parche ~26.15/26.16, Fearless Draft, la regla nueva "First Selection" de 2026)
solo para textura/jerga — nunca para afirmar balance real de campeones, mismo criterio que ya
sostiene `metas.json`. Se descartó a tiempo un evento de "selección nacional" (no existe en LoL,
la escena es 100% de clubes) y se reemplazó por el equipo ideal del split (All-Pro Team, honor real).

**Medido**:
- `node src/dev/validate.js` — **65 checks, todos OK** (5 nuevos: esquema de `momento`, las 6 marcas
  con contenido, el eje `estatus` cubierto, el catálogo alcanza el objetivo, una fracción sana de
  carreras largas ve un `momento`).
- `node src/dev/simulate.js 1500 60 todas` — **0 crashes** en 4.500 carreras (3 estrategias × 1500).
- `node src/dev/cobertura.js --huecos` — **"Sin huecos: todas las celdas alcanzables llegan al
  mínimo"**; catálogo: **196 opciones / objetivo 150**.
- Verificación manual en Chrome real (headless vía CDP): una seed elegida por motor puro (seed 3342,
  60 splits) pasa por 3 organizaciones (tier3→tier2→tier1), 18 títulos y **12 momentos de 6 tipos
  distintos**, todos citando org/año/edad reales de esa carrera — no genéricos. Por separado, se
  cargaron los módulos reales de motor y UI **dentro de la página servida** y se llamó al
  `renderCarrera` de producción (no un mock) contra un DOM fabricado: el HTML resultante trae
  `<details><summary>Momentos (1)</summary>` con el texto correcto — confirma que la ficha renderiza
  un momento con el código real, no solo a nivel de estado.

**Corrección post-medición, fuera del alcance original**: agregar contenido corrió el stream de RNG
(trampa T1, misma familia que D21/D22) y el check de la fase 3 *"tier 3 es breve"* pasó de p90=4 a
p90=5 a n=1500. Investigado con una sonda aparte antes de tocar nada: medido a n=1500/3000/6000
**antes y después** del contenido nuevo, el p90 real cae casi exactamente en el borde 4/5 (~90%
acumulado en 4) en ambas versiones — a n=1500 cualquiera de las dos puede caer para cualquier lado
del borde según qué seeds entran; a n=6000 ambas dan p90=4 estable. No se tocó ninguna constante de
balance de tier 3: se subió la muestra del check (1500 → 6000). Documentado como **D24** en
`PLAN.md`.

**La fase 8D queda cerrada.** No confundir con la fase 13 real (`# FASE 13 — CONTENIDO A ESCALA` en
`PLAN.md`), que sigue pendiente y depende del mercado (fase 9) y el retiro (fase 10).

### 2026-08-09 — Fase 8c: se mide el arraigo, y la medición cierra la fase 8

Tercera y última parte de la fase 8 (regla de proceso 2: primero la estructura — 8a/8b —, después
se calibra). Se corrió una sonda de 600 carreras a 60 splits para medir de verdad la distribución
de `career.arraigo` antes de tocar ninguna constante.

**Medido**: de las carreras con ≥8 splits en una misma org (416 de 600, 69,3%), la distribución de
la banda de arraigo más alta alcanzada es **bimodal**: `leyenda` (88+) en 210 (50,5%), `uno_mas`
(<25) en 107 (25,7%), y `querido`+`idolo` juntos apenas 99 (23,8%). El arraigo máximo tiene mediana
89 y p25 en 24 — la mayoría o casi no arranca o llega arriba de todo, con poco tránsito por el
medio. La causa mecánica: la fila más larga de una carrera tiene mediana **44 splits** (p75: 48),
y a ~1,2 de ganancia base por split eso solo ya se acerca a `idolo` (60) antes de sumar los bonos
de título/internacional/brecha, que terminan de empujar a la mayoría hasta `leyenda`.

**Decisión, sin retunear nada**: el check declarado en la fase 8a (`≥15% llega a Ídolo+`) mide
**59,9%** — lo pasa cómodo. Por la regla de proceso 3 ("si el balance se sale de banda, primero
agregar contenido, no tocar constantes") y porque acá el balance **no** se salió de banda —
al revés, la superó ampliamente —, no hay nada que forzar. La curva quedó anotada como **D23** en
`PLAN.md` (deuda técnica, abierta): si más adelante se quiere que "Leyenda" se sienta tan raro como
en la referencia (aparece una sola vez en las 15 imágenes de El Ídolo del Potrero, al cierre de una
carrera de 26 años), es candidata a suavizarse en la fase 11 o 13, con contenido real de por medio,
no como un ajuste de número aislado.

Se agregó el check que la fase 8a había dejado pendiente para después de medir: *"El arraigo llega
a Ídolo+ en una fracción sana de las carreras estables en una org"* (`validate.js`), sobre 300
seeds a 60 splits.

**Verificado**: `node src/dev/validate.js` — **59 checks, todos OK** (1 nuevo). `simulate.js` no se
volvió a correr: esta fase no tocó `src/core`, `src/systems` ni `src/data` — solo agregó un check y
documentación —, así que la corrida de 6000 carreras de la fase 8b sigue siendo la huella vigente.

**La fase 8 completa (a + b + c) queda cerrada.** Sigue la fase 9: el mercado.

### 2026-08-09 — Fase 8b: `src/ui/` deja de estar vacía + la ficha permanente

Segunda mitad de la fase 8 (la primera, "el registro acumula", es la entrada anterior de este
changelog). Con el registro ya acumulando, esta mitad construye la pantalla que lo muestra — la
regla de proceso 12 nueva ("ninguna fase cierra sin su pantalla") aplicada a sí misma.

**`src/core/ficha.js` completo**: además de `nivelDelJugador` (de la fase 8a), ahora expone
`bandaDeNivel`, `deltasDeStats` (las flechas ▲▼, contra `flags.edadSnapshot`), `statDestacado` (el
stat más alto del rol), `bandaDeJerarquia` / `bandaDeArraigoFicha` (bandas con nombre, piso, techo
del próximo hito y si ya es el máximo), `estadoInternacional` (`sin_chance`/`en_carpeta`/
`clasificado`/`jugando`, según `career.posicion` contra `liga.cuposInternacionales`),
`dueloDeGeneracion` (stub — la fase 11 lo llena) y `fichaCompleta`, el objeto único que consume la
UI. Todo puro, sin RNG.

**`CAMPOS_EDAD`** (`edadInicio.js`) se amplió de 3 a 6 stats de rol (agregó macro, teamfight,
laneo, shotcalling, adaptabilidad) — sin esto las flechas solo podían mostrarse para mecánica.

**`src/ui/` deja de estar vacía (cierra D7)**: 476 líneas en 8 módulos —
`components/{ficha,barra,statRow,decision,feed}.js` y `screens/{inicio,carrera}.js`, más
`render.js` como único punto de entrada. `index.html` extrae `renderRoles`/`renderCampeones`/
`actualizarBotonEmpezar` (ahora `screens/inicio.js`, dueño de su propio estado de selección),
`renderLogs` (`components/feed.js`) y la mitad no-minijuego de `mostrarDecision`
(`components/decision.js`). **Los 5 minijuegos NO se movieron** (PLAN.md §8.5: se les cambia la
presentación recién en la fase 12) — siguen inline en `index.html`, igual que el control de flujo
que llama al pipeline (`comenzarCarrera`/`avanzar`/`responder`).

**La tarjeta permanente** (`components/ficha.js`, nueva): NIVEL grande con banda de color, ▲▼ por
atributo contra el snapshot de la edad, el destacado resaltado, dos barras con los 4 hitos
dibujados (arraigo y jerarquía, como pidió PARTE 3 del plan), el estado internacional con nombre,
el pool con la tier del régimen vigente al lado, y un `<details>` "Ver carrera" con
`registro.porOrg` — el mismo componente que la fase 10 va a reusar para la tarjeta final. En etapa
amateur pinta otra fila (estudios/confianza/sueño/ranked) en vez de arraigo/jerarquía/pool, como
pedía §8.6 punto 7.

**Guardas nuevas**: `dev/guards.js` agrega `verificarDocumentSoloEnUi` (regex `\bdocument\s*[.[]`,
que no confunde con la prosa "documento"/"documentación") y un check en `validate.js` que falla si
algo fuera de `src/ui/` toca el DOM (regla invariable 2). Otro check nuevo mide que
`deltasDeStats()` dé al menos un delta en ≥80% de los cierres de edad — medido: **pasa** sin
tunear nada, la ampliación de `CAMPOS_EDAD` alcanzó.

**Números medidos** (`PLAN.md` §8.9, con su corrección post-medición ahí mismo): campos del estado
visibles en pantalla, 8 → **≥22** (NIVEL, 6 atributos con flecha, jerarquía y arraigo con banda,
internacional, pool con tier, historia). `index.html` **no** bajó a ≤350 líneas como se había
estimado a ciegas — quedó en 1.069, casi igual que antes (1.090) — porque la ficha nueva agrega
~330 líneas de CSS real (barras con hitos, stat-row, badges) y los minijuegos (~230 líneas) se
quedan adentro a propósito. Lo que sí se movió es lo que la deuda D7 pedía: `src/ui/` pasó de 0 a
**476 líneas** en módulos reusables — no es lo mismo tener 1.069 líneas en un archivo que 593 en
uno más los 476 repartidos en 8 módulos con una sola responsabilidad cada uno.

**`DISENO.md` §4.1** actualizado con el árbol real de `src/core/` (+`registro.js`, `+ficha.js`) y
`src/ui/` (deja de decir "sigue vacía").

**Verificado**: `node src/dev/validate.js` — **58 checks, todos OK** (2 nuevos de esta mitad).
`node src/dev/simulate.js 1500 60 todas` — 0 crashes en 6000 carreras (esta fase no toca game
logic, solo presentación). Y, por primera vez en el proyecto desde la fase 0, **verificación real
en navegador**: Chrome headless vía CDP crudo (WebSocket nativo de Node, sin Puppeteer/Playwright
instalados — mismo criterio que la verificación manual documentada en el changelog del
2026-08-06), perfil aislado, seed fija. Se clickeó rol → 3 campeones → "Empezar carrera" → 45
decisiones seguidas (incluido un minijuego real). La ficha se actualizó en cada split, pasó del
panel de amateur al de profesional en el momento justo, el destacado cambió de stat, las barras de
arraigo/jerarquía mostraron los hitos con nombre reales (`Uno más · 15/100`, `Rookie · 23/100`), y
**cero errores y cero excepciones de consola** en toda la corrida. Screenshot revisado a mano.

**Sigue en la fase 8**: 8c — calibrar `BALANCE.arraigo` contra la distribución real medida (el
check de "llega a Ídolo en ≥15%" quedó para esa calibración, no se fuerza acá sin medir primero,
regla de proceso 2).

### 2026-08-09 — Auditoría contra El Ídolo del Potrero + Fase 8a: el registro acumula

**El pedido**: el usuario reportó que, jugando de verdad, "las decisiones no importan, las
preguntas se repiten todo el tiempo, nada tiene sentido" — pasó de los 23 a los 49 años sin que se
retire el personaje apretando botones. Pidió una auditoría imagen por imagen contra El Ídolo del
Potrero (14 capturas de una carrera completa) para encontrar, con evidencia concreta, por qué un
juego con 7 fases cerradas y 26+ checks se sentía así.

**El diagnóstico** (documento completo: `PLAN.md`, PARTE 1 — 10 hallazgos, cada uno con imagen y
línea de código). La tesis: *"Potrero no tiene más sistemas: tiene un registro que acumula y una
ficha que lo muestra. Este proyecto tiene veinte sistemas y ningún registro."* Los hallazgos más
graves, verificados en el código y no solo en la queja:

- **H2 — nunca elegís tu equipo.** `competitivo.js:33/136` sorteaba la org con
  `weightedPick(liga.orgs, c => 100 - c.fuerza, rng)` — ponderado hacia la MÁS DÉBIL de la liga. No
  había oferta, contrato, ni sueldo en todo el proyecto. La "trampa de firmar por el equipo grande"
  que `CONCEPTO.md` §7 documenta como cadena causal central era, literalmente, imposible de
  disparar: no había firma.
- **H3 — no hay final.** `maxSplitsDeSeguridad: 90` (comentado como "red anti-loop, no una regla de
  juego") lo agotaba el 49,1% de las carreras (D2). No existía `retiro.js`, y `renderResumenFinal`
  escribía una frase en un `<div>` — el juego cuyo producto final es una tarjeta compartible no
  tenía la tarjeta.
- **H7 — los números no tienen referente.** El NIVEL (media ponderada por rol) ya se calculaba
  adentro de `calcularRendimiento` y nunca se mostraba; las bandas con nombre
  (`rookie/titular/referente/franquicia`) ya existían en `contexto.js:78` y nunca llegaban a
  pantalla — salía `jerarquía 47` en un log.

**El plan de corrección** (`PLAN.md`, reescrito de punta a punta; las fases 0-7 no se tocaron):
seis fases nuevas — **8 La ficha** (el registro que acumula + la tarjeta permanente + `src/ui/`),
**9 El mercado** (elegís equipo; la trampa del equipo grande, visible), **10 El final** (retiro
emergente + tarjeta de legado), **11 El año** (calendario, nota de temporada, archirrival),
**12 La jerarquía de la decisión** (categorías, rareza, consecuencia antes de elegir), **13
Contenido a escala** — reemplazan a las viejas fases 8-11. Regla de proceso nueva, la más
importante: *"Ninguna fase cierra sin su pantalla."* Decisiones tomadas con el usuario: tarjeta
completa tipo Potrero, un NIVEL 0-100 único (extraído de la fórmula que ya existía, sin
retunearla), y **jerarquía + arraigo como dos ejes separados** (jerarquía = estatus deportivo, ya
existía, se resetea; arraigo = vínculo con la gente de la org, nuevo, nunca se resetea).
`CONCEPTO.md` §1/§11 (duración pasa de "4-10 min" a "25-40 min", alineado con una decisión ya
tomada y nunca propagada al documento) y §6 (arraigo) se actualizaron.

**Fase 8a implementada — "el registro acumula" (motor, sin pantalla todavía: eso es 8b).**

- `state.js`: `career.registro` (objeto que **solo crece** — splits jugados, fechas/mapas/series
  G-P, títulos e internacionales con año, picos de nivel/jerarquía/arraigo/hype, y una fila por
  org con sus propios splits/fechas/títulos/jerarquía máxima/arraigo máximo) y `state.calendario`
  (`anio`, calculado de `splitCount`, sin consumir `rng`). Los dos, objetos completos de ceros
  desde el arranque (trampa T4). `career.arraigo` nuevo, distinto de `career.jerarquia`.
- `src/core/registro.js` (nuevo, puro): único punto de escritura sobre `career.registro`
  (`abrirFila`/`cerrarFila`/`registrarSplitEnFila`/`registrarFecha`/`registrarMapa`/
  `registrarSerie`/`registrarTitulo`/`registrarInternacional`/`registrarPico`/
  `registrarArraigoEnFila`/`bandaDeArraigo`/`arraigoInicial`) — para que "el registro solo crece"
  (regla de proceso 14, nueva) se sostenga en un solo lugar en vez de reimplementarse en cada
  sistema que lo toca.
- `src/core/ficha.js` (nuevo, puro): `nivelDelJugador(state)`, la MISMA fórmula que ya vivía adentro
  de `calcularRendimiento` (`rendimiento.js:26-31`), extraída sin retunear un solo número (regla de
  proceso 2) para que se pueda exponer. `rendimiento.js` ahora la importa en vez de mantener dos
  copias.
- **Quién escribe qué**: `roster.js` abre/cierra filas de `porOrg`, suma el goteo de arraigo "de
  base" por split (escalado por `ROLES[].visibilidad`) y da el arraigo inicial al fichar
  ("tu fama te precede", proporcional al hype); `competitivo.js` cierra la fila con
  `motivoDeSalida` (`ascenso`/`disolucion`) justo antes de cambiar de org; `temporada.js` registra
  cada fecha (marcada o silenciosa) en `avanzarFechaSilenciosa`, el único choke point de las dos;
  `serie.js` registra cada mapa, cada serie, y arma `internacionales[].camino` con los mapas
  jugados; `rendimiento.js` registra títulos/internacionales de tier 2/3 (sin bracket) y el bono de
  arraigo por rendir sobre lo esperado (reusa la misma `brecha` que ya mueve la jerarquía) y por
  fracaso; `atributos.js` cuenta `splitsJugados` (coincide siempre con `player.splitCount`, ambos
  se incrementan en el mismo sistema) y el pico de NIVEL.
- `BALANCE.calendario` (`anioBase: 2026`), `BALANCE.arraigo` (rangos por split/título/internacional/
  fracaso, factor de brecha, piso por hype, los 4 hitos con nombre: uno_mas/querido/idolo/leyenda)
  y `BALANCE.ficha` (bandas de NIVEL) nuevos.

**8 checks nuevos en `validate.js`.** Dos de ellos fallaron en la primera corrida y la causa, en
los dos casos, fue el check — no el motor (regla de proceso 7: verificar que un check falla cuando
debe, y por qué):

- *`calendario.anio avanza exactamente 1...`*: el check comparaba `calendario.anio` (calculado por
  `edadInicio.js` **al empezar** el split, con el `splitCount` de ANTES) contra el `splitCount` de
  DESPUÉS de que `atributos.js` ya lo había incrementado en el mismo split. Se corrigió el check
  para comparar contra el `splitCount` capturado al empezar, no al terminar.
- *`picos.nivel se alcanza antes del último split...`*: medía 32,7% contra un 70% esperado, corrida
  a 30 splits (el techo que traía la primera versión del check). Investigado con una traza directa
  (`nivelDelJugador` split a split): el mecanismo de declive funciona — hay carreras que muestran
  una curva clara de subida-pico-caída (ver seed 7 de la traza) — pero `correrCarrera` cuenta
  splits desde los 15 años, así que a los 30 splits la mayoría todavía está a mitad de su tramo
  profesional, en la parte que sube (macro y shotcalling no declinan, `CONCEPTO.md` §6). Corriendo
  la misma medición a 60 splits: **90,7%**. Se corrigió la ventana del check a 60 splits, no el
  umbral ni el motor.

**Verificado**: `node src/dev/validate.js` — 56 checks, todos `OK` (los 8 nuevos incluidos).
`node src/dev/simulate.js 1500 60 todas` — **0 crashes** en 6000 carreras (1500 seeds × 4
estrategias); `llegaronAPro` da 73,9% (equilibrado) / 47,5% (ranked) / 65,7% (prudente), en línea
con lo medido al cerrar la fase 7 — esta fase no tocó balance, solo agrega tracking, y los números
lo confirman. `node server.js` sirve `index.html` y los módulos nuevos (`core/registro.js`,
`core/ficha.js`) con 200. La UI de `index.html` no se tocó (no lee los campos nuevos todavía: eso
es la fase 8b) y sigue funcionando exactamente igual.

**Sigue en la fase 8**: 8b (`src/ui/`, la tarjeta permanente) y 8c (calibrar `BALANCE.arraigo`
contra los números reales una vez que la tarjeta los hace visibles).

### 2026-08-09 — Corrección: lenguaje de "equipo profesional" colándose en la etapa amateur

Bug reportado directamente por el usuario jugando: a los 15 años, en soloQ (Oro), le salió el
evento "Salió un campeón nuevo" con la opción *"Practicarlo a fondo antes del próximo partido"* y
un resultado que hablaba de *"llevarlo a un partido oficial"*. A los 15 en soloQ no hay partido
oficial — el mensaje no tenía sentido, y el usuario lo leyó (con razón) como evidencia de que nada
de lo hecho en las fases 5-7 se había aplicado de verdad.

**Causa real, dicha sin vueltas**: es un gap de esta misma sesión, no un defecto viejo. La entrada
de la fase 6 (2026-08-09, más abajo en este changelog) dice textualmente que "los otros cinco
eventos de pool... se retextean para hablar de regímenes y tiers en vez de afinidad abstracta" —
pero en los hechos sólo se tocó la descripción de `pool_main_muerto`. Los otros cuatro
(`pool_estrechez`, `pool_identidad_diluida`, `pool_contra_la_corriente`, `pool_campeon_nuevo`)
quedaron con el texto viejo de "el draft"/"reunión de repaso"/"partido oficial", que nunca fue
correcto para un jugador que todavía no tiene equipo. El changelog de esa fase sobreestimó lo que
en realidad se había hecho.

**Auditoría completa, no solo el caso reportado**: se armó un script que cruza cada evento de
`data/events/**/*.json` contra su `contexto.etapa` (excluyendo `partido/*.json`, que gatea por
`stakes` y estructuralmente no puede aparecer fuera de `systems/temporada.js`) y busca vocabulario
de equipo real ("coach", "staff", "el draft", "reunión de repaso", "partido oficial", "ganó el
partido", "vestuario", "prensa de la escena") en cualquier evento alcanzable durante `etapa:
amateur`. Encontró **9 eventos**, 2 de ellos `bisagra: true` (alta frecuencia): `pool_campeon_nuevo`
(el caso reportado), `pool_main_muerto`, `pool_estrechez`, `pool_identidad_diluida`,
`pool_contra_la_corriente`, `support_nadie_te_vio`, `burnout`, `top_recorte_sin_contexto`,
`adc_si_perdemos_es_por_vos`. Se descartaron como falsos positivos `academy_offer` (menciona
"coach"/"scrim" pero es literalmente una prueba con un equipo amateur juvenil, contrastada a
propósito contra el soloQ) y `psychologist` (exige `nivel: tier1/tier2`, que `core/contexto.js`
nunca produce durante `phase: 'amateur'` — ahí `calcularNivel` siempre da `'soloq'`).

**El arreglo**: los dos eventos `bisagra` se separaron en un par pro/amateur, porque salen tan
seguido que ameritan texto propio para cada etapa: `pool_campeon_nuevo` ganó
`etapa: ["debut","profesional"]` y se creó `pool_campeon_nuevo_soloq` (mismo peso/cooldown, texto
de ranked — "la próxima seguidilla de rankeds", "partidas clasificatorias", nada de "partido
oficial"); mismo tratamiento para `pool_main_muerto` → `pool_main_muerto_soloq`. Los siete
restantes se retextearon en el mismo evento (más barato, y el mecanismo de fondo es igual de real
en soloQ que en un equipo): "el draft" → "el champ select", "reunión de repaso" → "cualquiera que
te vea jugar seguido", "el equipo ganó el partido" → "tu equipo ganó la partida", "decírselo al
staff" → "pedir bajar la carga" (sin nombrar a quién). De paso, la traza de verificación encontró
un décimo caso menor no listado originalmente: `burnout` decía "faltan pocas jornadas" (jornada =
día de partido de una liga, no existe en soloQ) — se cambió a "falta poco para que se cierre el
split" (split sí es vocabulario genérico del motor, usado en ambas etapas por `splitCount`).

**Verificación, en cuatro pasos**:
1. Re-corrida la auditoría: quedan sólo los 2 falsos positivos ya explicados, cero lenguaje roto de
   verdad.
2. `node src/dev/validate.js`: los 55 checks pasan sin tocar ninguno (es contenido, no estructura).
3. Traza real de 60 seeds × 12 splits de etapa amateur (3205 logs leídos de punta a punta, no sólo
   grep): apareció una segunda categoría de coincidencias — 28 casos de texto "pro" disparando
   dentro de un split marcado como amateur. Investigado a fondo: los 28 son el **split exacto del
   fichaje** (`amateur.js` corre antes que `events.js` en `ETAPAS_SPLIT`, así que en el split en que
   firmás, para cuando `events.js` evalúa el contexto ya sos profesional) — comportamiento correcto
   a propósito, no el bug. Confirmado marcando cada coincidencia con si ese split incluía un log
   "Firmaste con...": las 28 lo incluían. Cero casos genuinos de amateur puro.
4. La misma traza probó, de paso, que el sistema de meta con nombre de la fase 6 sí corre desde el
   primer split amateur (`[meta] Parche 2: sigue la meta de tanques...`, saltos de tier del main
   nombrados por parche) — la parte de la queja del usuario de "nada se aplicó" no aplica a esa
   fase; el problema real era acotado al vocabulario de estos 9-10 eventos.

Archivos tocados: `src/data/events/pool.json`, `src/data/events/rol/support.json`,
`src/data/events/salud_vida.json`, `src/data/events/rol/top.json`, `src/data/events/rol/adc.json`.
Sin cambios de balance ni de estructura — commit separado de cualquier retuning.

### 2026-08-09 — Fase 7: el prólogo se comprime y la repetición se rompe

Última de las tres fases insertadas antes del mercado. Dos problemas medidos al arrancar: la etapa
amateur medía 15 splits de mediana de ~30 totales (la mitad de la partida) y el 49% de las carreras
no llegaba a pro; y el catálogo de eventos se reciclaba en round-robin (el evento más repetido
salía 10 veces por carrera, mediana), porque lo único que evitaba el repetido era el cooldown fijo
de cada evento.

**7a — comprimir el prólogo (commit separado, solo constantes)**: `lpPorBloque` 52→68,
`puntosEscaleraCompleta` (el freno de altura de la ladder) 4300→4700, `scoutingProbPorNivel` casi
duplicado en cada banda, `puntosParaRadar` 2800→2200, `splitMinimoScouting` 3→2. Medido sobre 1500
carreras × 90 splits: mediana de splits en amateur 15→8, `llegaronAPro` 40,4%→73,9% (banda 65-75%,
cumplida), `no_llego` 49%→21,1% (objetivo ≤25%, cumplido). La mediana de 8 no llegó al objetivo de
≤6 — se documenta sin retocar más constantes, porque seguir empujando ese número (se probaron ~10
combinaciones) solo lo lograba aflojando tanto el freno de altura que `llegaronAPro` se iba muy por
encima de la banda 65-75% que el usuario sí pidió explícitamente.

**7b — memoria anti-repetición**: `pesoConMemoria` en `systems/events.js` — cada vista de un evento
le corre el peso en contra (`1 / (1 + vistas × fatigaPorVista)`) la próxima vez que compite, y la
primera vez sin ver suma un `bonusNovedad`. Se aplica tanto a la selección general
(`elegirEvento`/`elegirEventoCierre`) como a la de las fechas marcadas de `systems/temporada.js`
(momento y reacción), que comparten el mismo contador `state.flags.eventosVistos`. No reemplaza al
cooldown (que sigue sacando el evento del todo un tiempo): esto además hace que, aun disponible, un
evento visto compita peor contra uno que nunca salió.

**7c — más baraja en el cierre de edad**: 4 eventos nuevos en `data/events/cierre_edad.json`.
`balance_de_temporada` (el único disponible para un pro joven, ya que `cuentas_de_la_carrera`
exige `edadBanda: pico/tardia/veterana`) dejó de ser la única opción: se agregó
`joven_el_primer_balance` para esa misma franja de edad, `tier3_el_cierre_de_un_armado_chico`
(hueco real: tier 3 no tenía NINGÚN evento de cierre, porque `balance_de_temporada` exige
`nivel: tier2/tier1`), `el_year_review_publico` (nivel tier1) y `el_vestuario_que_se_arma_de_nuevo`
(marca `con_vestuario`).

**7d — densidad**: los logs puramente numéricos (el resumen de fin de split en `atributos.js`, el
"Ajuste al meta: X/100" de `campeones.js`, el resumen de offseason en `practica.js`) pasan a llevar
`tecnico: true` en el `extra` del log — no se esconden todavía (la UI es fase 11), pero dejan la
señal lista. Se midió `BALANCE.edad.probSegundaDecisionPorTipo` contra el ciclo nuevo (con las
fechas marcadas de la fase 5 metiendo sus propias decisiones) y no se tocó: la mediana de líneas
de log por split profesional ya da 15, con splits sin ninguna línea narrativa en 0 sobre 12.896
splits medidos — no hay indicio de que la densidad se haya roto en ninguna dirección.

**55 checks** (53 → 55; 7b/7c no necesitaron checks propios, están cubiertos por los dos nuevos).
Los dos nuevos son una **corrección post-medición sobre el propio plan de esta fase**: el objetivo
original pedía "mediana ≤ 4, máximo ≤ 8" repeticiones ABSOLUTAS del evento más visto. Con
`llegaronAPro` subiendo de ~40% a ~74%, las carreras pasan casi el triple de splits en fase
profesional, así que el conteo absoluto de instancias de evento por carrera creció con la
población — un tope absoluto ya no mide lo mismo que medía cuando se escribió el plan. La métrica
que sí es independiente del tamaño de la población es la **concentración** (qué fracción de todo
lo que la carrera vio es el evento más repetido): medida en 8,8% de mediana y 17,2% de p90, muy por
debajo del ~25-33% que daba el mecanismo viejo estimado a mano. El segundo check nuevo mide
variedad: una carrera de 30 splits que llega a pro ve una mediana de eventos distintos muy por
encima del piso de 20 declarado.

**Números medidos** (1500 carreras × 90 splits, equilibrado): 0 crashes; determinismo verificado.
`llegaronAPro` 73,9%, `no_llego` 21,1%, `burnout` 27,3% — casi todo ese burnout (confirmado con una
medición aparte) ocurre YA SIENDO PROFESIONAL, no en el amateurismo: es la consecuencia esperada de
que muchas más carreras ahora sobrevivan lo bastante para exponerse al riesgo de burnout de la fase
profesional, no un efecto nuevo introducido acá. Corregir esa cifra es tocar el mecanismo de
burnout profesional o agregar un final emergente de verdad — trabajo de la fase 9, no de esta.
También subió la fracción de carreras que siguen activas al tope de 90 splits sin haber retirado
(deuda **D2**, ya anotada): sigue siendo la razón por la que la fase 9 existe.

### 2026-08-09 — Fase 6: el meta con nombre

Segunda de las tres fases insertadas antes del mercado. Antes de esto, `systems/meta.js` movía nueve
pesos con un random walk gaussiano y el jugador veía *"Ajuste al meta: 49/100"* — un número sin
nombre, sin forma de anticiparlo y clavado casi siempre cerca del centro (era literalmente el
defecto que el usuario señaló: *"que no sea un número de afinidad al meta"*).

**Nuevo**: `src/data/metas.json` (9 regímenes — tanques, hipercarry, asesinos, magos de control,
partidas largas, agresión temprana, peleas 5v5, splitpush, bruisers — cada uno con qué sube, qué
hunde y una línea de cómo se juega el parche) y `src/core/regimen.js` (`tierListDeRol`,
`coincidencias`, `boostDelPool`, `saltosDeTierPropios` — todo puro, sin RNG). `systems/meta.js` se
reescribió entero sobre esto. El vector de pesos (`state.meta.weights`) sigue existiendo con el
mismo vocabulario de arquetipos de siempre — lo único que cambió es quién lo escribe — así que
`afinidadDeCampeon`, `deseoPorCampeon`, `campeonesEnMeta` y todo lo que ya cruzaba el pool contra
el meta (el draft de `campeones.js`, el rival de una serie en `core/serie.js`) siguió funcionando
sin tocarse.

**El mecanismo**: el régimen cambia como una noticia, no como una deriva — 60% de chance al abrir
cada season (cada 3 splits), 25% de un parche correctivo a mitad de cualquier split (números
textuales del usuario). `campeonesMuertos` (antes: fracción continua de afinidad,
`umbralMainMuerto`) pasa a colgar del salto de tier real (S/A → B/C), que es lo que el log nombra.
El boost del pool (`ajusteAlMeta`, ahora `boostDelPool`) dejó de promediar afinidad ponderada por
maestría —lo que lo clavaba siempre cerca de 50— y pasa a sumar, para cada campeón del pool,
`maestría × peso de su tier` (S=1.0 · A=0.6 · B=0.25 · C=0): tener uno en S con maestría alta pesa
mucho, tener diez en C no suma nada. El evento nuevo `pool_a_cual_le_metes`
(`data/events/pool.json`) es la decisión explícita que pidió el usuario — practicar al de siempre o
meterle horas a uno del régimen actual— y `pool_main_muerto` se retexteó para hablar de tier list en
vez de afinidad abstracta.

**48 checks pasaron a 53.** Los 5 nuevos: el régimen cambia en la banda declarada (55-65% en
apertura, 20-30% correctivo), toda carrera de más de 15 splits ve al menos tres regímenes
distintos, la tier list cubre el rol completo sin repetidos, el boost no se clava en el centro
(CONCEPTO §6: 0.75x-1.25x), y `pool_a_cual_le_metes` sale entre 1 y 8 veces por carrera entre las
que llegan a pro. Dos correcciones de check antes de que pasaran, ambas trampa T6 (medir contra una
población que diluye el efecto real): la tier list se calcula ANTES de que el mismo `aplicar()`
resuelva el debut de un campeón nuevo, así que puede quedar un campeón corta exactamente ese split
— se toleró un desfasaje de 1; y la mediana de apariciones de `pool_a_cual_le_metes` se median
sobre las 200 seeds completas, incluidas las que nunca llegan a pro (más de la mitad) — se
restringió a la subpoblación que sí llega, como ya advertía la nota de la fase 5 sobre esta misma
trampa.

**Números medidos** (400-1500 carreras según el check): el régimen cambió en el 61,5% de las
aperturas de season y en el 24,9% de los splits correctivos (declarado: 60% y 25%). El multiplicador
de meta real —lo que CONCEPTO §6 promete entre 0,75x y 1,25x— corre con p10 = 0,850, mediana = 0,960,
p90 = 1,085: una separación de 0,235 entre p10 y p90, contra el defecto viejo que orbitaba siempre
cerca de 50/100. Una carrera de 45 splits ve una mediana de 6 regímenes distintos. `simulate.js 1500
90 todas`: 0 crashes; `llegaronAPro` (equilibrado) 41,4% contra el 40,4%-41,9% ya medido; burnout
23,5%, dentro del ruido ya visto entre fases. Determinismo verificado.

**Fuera de alcance, por decisión tomada con el usuario**: los rumores de parche (apostar a practicar
un campeón antes de que el meta lo favorezca) y que el régimen mueva la fuerza de los otros equipos
o la visibilidad por rol. Quedan anotados, no son deuda — nunca se prometieron en `PLAN.md`.

### 2026-08-09 — Fase 5: la temporada existe, la fecha que importa

Primera de las tres fases insertadas antes del mercado (`PLAN.md`, commit del mismo día). El
disparador fue jugar el simulador con las cuatro fases previas hechas: la temporada regular se
resolvía con una sola tirada (`posicionEnLaLiga`, ahora borrada de `rendimiento.js`) y el evento
del split caía *después* de que el resultado ya estaba decidido — nunca podía existir un "se viene
tal partido".

**Nuevo**: `src/core/temporada.js` (calendario, tabla de posiciones, elección de fechas marcadas —
todo puro) y `src/systems/temporada.js` (el sistema, insertado en `registro.js` justo antes de
`rendimiento`). `rendimiento.js` se recortó: ya no tira su propia `gauss` para la posición, lee
`career.temporada.{posicion,tabla,rendimiento}` que dejó `temporada.js`. Contenido nuevo:
`src/data/events/partido/{presion,clasico,dentro_del_mapa,postpartido}.json` (24 eventos, 55
opciones), gateados por un eje nuevo `stakes` (`data/contextos.js`) que **solo existe con el
override que arma `systems/temporada.js`** — `calcularContexto(state)` sin overrides nunca lo
produce, así que este contenido no puede colarse por la selección normal de `events.js` y
`dev/cobertura.js` no lo puede medir (se verifica con un check propio, ver abajo).

**El mecanismo**: cada split profesional genera un calendario real (una fecha contra cada otra org
de la liga o zona de tier 3), resuelve TODAS las fechas de una vez en silencio salvo 2-3 que se
puntúan por lo que tienen en juego (`clasico`, `puntero`, `define_clasificacion`, `revancha`,
`presion`, `rival_de_generacion`, con `parejo` de red). Esas se juegan de verdad: un draft corto
(mucho más liviano que el Fearless de playoffs — reusa la misma lógica de dominancia de
`core/serie.js`, sin quema de campeones), un momento con 2-4 opciones cuyo efecto nuevo
`type: 'partido'` mueve el resultado de ESA fecha puntual (nunca un stat abstracto), y a veces una
reacción posterior que ya no toca el resultado. Los tokens de contenido ganaron `{rivalDeLaFecha}`
(`core/plantillas.js`) para nombrar al rival de la fecha sin confundirlo con el rival de generación.

**Bug real encontrado simulando, no leyendo código**: la tabla no cerraba (Σ ganados ≠ Σ perdidos)
porque cuando el jugador le ganaba o perdía a un rival, el resultado se anotaba solo en la fila
propia — la fila del rival, ya cerrada por `simularResto`, nunca se enteraba. Se arregló
anotando las dos filas a la vez en `avanzarFechaSilenciosa`. Un segundo bug, más sutil: un tier 3
recién refichado puede tener `currentOrg` fresco pero `companeros` todavía vacío un split entero
(`roster.js` corre antes que `competitivo.js` en el registro), y `temporada.js` tenía un guard
extra (`liga.orgs.length < 2`) que `rendimiento.js` no compartía — un resto de una asunción
descartada durante el desarrollo. Se sacó: los dos sistemas comparten ahora exactamente el mismo
guard, regla de proceso nueva para cualquier par sistema-productor/sistema-consumidor.

**43 checks pasaron a 48.** Los 5 nuevos: la tabla cierra y respeta el calendario (300 seeds), 2-3
fechas marcadas por split competitivo (< 5% fuera de rango), ninguna fecha marcada sale sin
`stakes` (test directo sobre `motivosDeFecha`), el momento mueve el resultado (peor extremo del
efecto `partido` vs. mejor extremo: +54 puntos de tasa de victoria en una moneda 50/50 — muy por
encima del piso de 15), cobertura completa de `stakes × rol` sobre el catálogo declarado (no se
puede medir con `cobertura.js`, que nunca ve `stakes` sin el override).

**Corrección post-medición** (regla de proceso 4, mismo criterio que las fases 2 y 4): dos números
salieron distintos de lo estimado al escribir el plan, y hay que decirlo sin maquillarlo.

- *Splits profesionales con al menos una fecha jugable*: 21,0% → **96,9%** (objetivo ≥90%, superado
  con margen).
- *Líneas de log por split profesional sin playoffs*: 5-6 → **11 de mediana** (objetivo 8-12, en banda).
- *Carreras que ven al menos un draft de fecha*: el objetivo estimado era ≥85%; midió **13,0%**. La
  causa es la misma regla de dominancia que ya se documentó en la fase 4 para el draft de playoffs
  (`decisionDeDraftFecha` reusa el criterio de `decisionDeDraft`): con un pool típico, un campeón
  suele dominar con claridad, así que el motor elige solo la mayoría de las veces y el draft nunca
  pausa. El mecanismo funciona como se diseñó — el objetivo del 85% fue una estimación optimista
  antes de medir, no una promesa incumplida.
- *Decisiones por carrera (mediana)*: 46 → **47**, prácticamente sin moverse (el objetivo era
  70-110). Misma trampa T6 que ya advirtió la fase 2: con `llegaronAPro` en 41,9-44,5%, más de la
  mitad de las carreras simuladas nunca pisan la fase profesional, así que la carrera MEDIANA
  apenas toca el contenido nuevo de `temporada.js`. Este número no se puede juzgar hasta que la
  fase 7 comprima el prólogo amateur (hoy 15 splits de mediana) y `llegaronAPro` suba a 65-75% como
  pide esa misma fase — recién ahí la mediana de decisiones va a reflejar lo que agregó esta fase.

**Sin cambios fuera de banda**: `llegaronAPro` (equilibrado) 41,9% contra el 40,4% de referencia;
burnout 21,1% contra 21,9%. Ambos dentro de los ±3 puntos esperados. `simulate.js 1500 90 todas`:
**0 crashes**. Determinismo verificado (misma seed, dos corridas, salida idéntica).

**Deuda que esta fase no cierra pero usa por primera vez**: D8 (los 5 rivales de generación) — el
`stakes: rival_de_generacion` les da su primer uso real (aparecen con nombre en una fecha marcada
cuando juegan en la misma liga tier 1 que el jugador, vía un hash determinista campeón↔org en
`core/temporada.js` que no consume `rng`), pero seguir corriendo su carrera entera sigue siendo
trabajo de la fase 11.

**Migración de contenido**: 5 de las quince situaciones de rol de `data/events/rol/*.json`
(`jungla_invadir_o_no`, `top_la_isla`, `mid_el_duelo`, `adc_la_pelea_que_define`,
`support_el_ward_que_te_costo` — una por rol, las más claramente "momento dentro del mapa") se
mudaron y reescribieron a `data/events/partido/dentro_del_mapa.json` con marcador y rival con
nombre. Las diez restantes (más orientadas a política de vestuario y prensa que a un momento de
partido puntual) se quedaron donde estaban; quedan como candidatas para la migración completa que
la fase 10 va a hacer con el resto del contenido a escala.

### 2026-08-08 — Fase 4: series Bo5, Fearless draft y minijuegos

Quinta fase de `PLAN.md`, y la que `PLAN` describe como el corazón de la
versión de 25-40 minutos. Hasta acá, cerrar temporada en tier 1 resolvía el
título con un `if (posicion === 1)` instantáneo en `rendimiento.js` y la
clasificación a un internacional con un `chance()` suelto: no había serie, no
había draft, no había Fearless, no había minijuegos.

**Investigación previa, pedida explícitamente antes de modelar nada a
ciegas**: no había datos de formato de playoffs 2026 en `TRASPASO.md`. Se
confirmó que LCK, CBLOL y LCP usan **6 clasificados, todo Bo5**, con los 2
mejores sembrados con bye directo a semifinal; LEC/LCS/LPL varían el detalle
pero coinciden en 6 clasificados y Bo5 predominante. Las seis usan **doble
eliminación real** (hay bracket de perdedores) y tanto MSI como Worlds
confirman **Fearless Draft explícito** en las fases eliminatorias. Se modeló
un bracket de **eliminación simple** (mismo `clasifican`/`byes`/Bo5 medidos,
sin bracket de perdedores) porque el motor solo simula el camino del
jugador, nunca el resto del bracket — documentado como D19, mismo criterio
que `LCP_CHALLENGERS` en la fase 3 (D15).

**`src/core/serie.js`** (nuevo) — los helpers puros del mecanismo: progresión
de ronda (`rondaInicial`, `siguienteRonda`), generación de rival (doméstico
pesado por fuerza dentro de la propia liga; internacional, de otra liga tier
1 pesada por prestigio), y el Fearless (`disponiblesDelPool`,
`elegirCampeonRival` — quema del top del meta no quemado, `campeonComodin`
cuando se quema todo). `deseoPorCampeon` se movió de `systems/campeones.js` a
`core/ajusteMeta.js` (donde ya vivía `afinidadDeCampeon`) para que
`core/serie.js` lo pudiera reusar sin que `core/` importara de `systems/`.

**La regla del draft (4.3), resuelta sin la ambigüedad que tenía el texto
original de `PLAN`** (leído literal, "elige solo si ≥2 disponibles" contradice
"para si quedan ≤2"): 0 disponibles → comodín automático; 1 → no hay
elección real; **exactamente 2 → siempre para** (es el momento de pool
exhausto donde cada pick importa); 3+ → el motor elige solo salvo mapa
decisivo o falta de dominancia clara (`BALANCE.serie.dominanciaClara`).

**`src/systems/serie.js`** (nuevo, registrado después de `rendimiento.js`) —
orquesta la serie completa (rival quema → draft auto o pausa → minijuego si
el mapa está cerrado → resultado, reusando `calcularRendimiento` y
`fuerzaDelEquipo` de `rendimiento.js`, ahora exportadas en vez de
reescritas). `rendimiento.js` deja de resolver título/internacional al
instante **solo para tier 1 con `formatoPlayoffs`** (tier 2 y tier 3 sin
bracket modelado siguen exactamente igual que antes). Al ganar la final o
clasificar a un internacional (por posición de temporada regular, cupo
existente desde la fase 3, sin cambios), se arranca la ronda siguiente
reseteando quemados/marcador — el Fearless no acumula entre rondas: cada
rival es una serie propia con sus propios bans, igual que en la vida real.

**Los 5 minijuegos, cada uno con su propia mecánica real** (`src/data/
minijuegos.json` para el texto, `index.html` para la interacción — nada de
esto lo implementa el motor, que solo recibe un `resultado` 0-1):

| id | mecánica en el navegador | dispara |
|---|---|---|
| `robar_baron` | barra con un marcador oscilando (RAF); parás el smite con un click | mapa cerrado, jungla, semis/final/internacional |
| `la_llamada` | reflejos: señal a destiempo aleatorio, se mide la latencia del click | mapa cerrado, resto de roles |
| `bootcamp` | asignar puntos entre 3 tarjetas antes de que se acabe una barra de tiempo | antes del primer mapa del internacional (siempre dispara) |
| `rueda_de_prensa` | slider de tono con una zona objetivo oculta | al cerrar una serie `final` o `internacional` (si no se gastó ya el cupo) |
| `la_prueba` | aim-trainer de 5 blancos | al firmar con un tier 3 (hook en `amateur.js`, no en `serie.js`) |

`la_llamada` amortigua su impacto por jerarquía baja (`factorLlamadaSinJerarquia`):
una buena llamada con jerarquía baja no se ejecuta igual, es la regla textual
de 4.6. Los 4 minijuegos de `serie.js` comparten el cupo `serie.minijuegoUsado`
(máximo 1 por serie); `la_prueba` es independiente (etapa amateur, sin `serie`
todavía) y ajusta la jerarquía inicial del primer roster vía un flag
transitorio (`flags.bonusJerarquiaTryout`) que `roster.js` consume una sola
vez, porque en el split del fichaje el roster todavía no existe.

**`BALANCE.partida.maxDecisionesPorSplit` subió de 16 a 60** (trampa T9,
prevista desde la fase 2): medido, el máximo real en 1500 seeds × 90 splits
es **19** decisiones en un solo split — un título + viaje al internacional
encadena draft y minijuego mapa a mapa en el mismo split de cierre de
temporada. El check de densidad de la fase 2 también subió su techo de 6 a
24 con la misma medición.

**6 checks nuevos (43 en total)**, verificados contra código mutado que falla
cuando debe (trampa T5):

```
Los minijuegos tienen forma válida
El impacto de los minijuegos está acotado (ni decorativo ni gambling)
Mediana de decisiones de draft por serie ∈ [0, 2]
El pool ancho llega al mapa 5 con opciones más seguido que el angosto
Ninguna serie deja el pipeline con una decisión colgada
Ningún minijuego puede setear terminado
```

**Corrección post-medición del check de ancho de pool** (mismo criterio que
la fase 2 con el volumen de decisiones — ver `PLAN.md`): el 80%/25% original
era una estimación previa a tener el mecanismo real. Medido: pool angosto (3)
da **0%** — es matemático, no de balance: llegar al mapa 5 de un Bo5 ya
jugó 4 mapas antes, y Fearless exige 4 campeones **distintos** solo para
llegar ahí, imposible con un pool de 3. Pool ancho (6) da **63-64%**; ancho
(8) da 97.6%; ancho (10), 100%. El check quedó en ≥55%/≤10% con un piso extra
de 40 puntos de brecha, que es lo que la implementación real sostiene con
margen — la comparación cualitativa de 4.5 se sostiene con mucho más
contraste del que se había estimado a ciegas.

**Hallazgo del check de impacto acotado**: variar solo `impactoMinijuego`
(el de los minijuegos de mapa) entre 0.0001 y 200 casi no mueve la medición
agregada — el efecto de un minijuego está **saturado por la propia
estructura del juego**: como máximo 1 de los 5 mapas de un Bo5 se ve afectado
y como máximo 1 minijuego por serie, así que forzar un mapa a ganancia o
derrota segura no garantiza la serie. El check solo distingue con claridad
cuando se degradan a la vez `impactoMinijuego` **y** `impactoDirecto` (el de
bootcamp/rueda de prensa): con los dos en default, 1000 carreras × 60 splits
dan 2610 (siempre falla) vs 3004 (siempre acierta) en títulos+internacionales
sumados — **15.1%**, dentro de la banda [8%, 25%]. Documentado como D20: es
una propiedad estructural deseable (los minijuegos estructuralmente no
pueden volverse gambling, sin importar cuán mal calibrado esté un solo
parámetro), no un bug, pero significa que ajustar cada minijuego por
separado (fase 7/8) va a necesitar medir cada uno aislado, no el agregado.

**Probado en navegador real** (Playwright, seed fija, click-through
automático): una corrida de 260 iteraciones atravesó varias temporadas
completas de playoffs de LCK — 38 decisiones de draft (incluida la escena de
"Cuartos de final vs KT Rolster · Bo5 · 2-2" con el pool reducido a dos
campeones de maestría 5, el escenario exacto del ejemplo 4.4), 5 `la_llamada`,
7 `bootcamp`, 1 `rueda_de_prensa`, 1 `la_prueba` — con **cero errores de
consola**. `robar_baron` (que solo dispara para jungla) se verificó aparte
con un test aislado del widget: la barra anima con `requestAnimationFrame` y
el click produce un `resultado` numérico correcto.

`simulate.js 1500 90 todas`: 0 crashes en las 3 estrategias. `llegaronAPro`
equilibrado se mantiene en 40.4% (sin cambios respecto del fin de la fase 3:
el mecanismo de series no toca nada de la etapa amateur ni del ascenso a
tier 1, solo lo que pasa una vez adentro). Diagnóstico sobre 2000 carreras ×
90 splits: 659 tocan al menos una decisión de serie, 21998 series jugadas en
total, 3099 títulos, 4753 internacionales.

**`CONCEPTO.md` actualizado**: §5 describe ahora el mecanismo real de
playoffs (bracket, Fearless, minijuegos, internacional) en vez de la
promesa vaga; §11 define la cuota exacta de minijuegos (máximo 1 por serie,
solo semis/final/internacional, más `la_prueba` en la etapa amateur).

**Sin arreglar a propósito, documentado como deuda técnica**: D18 se resuelve
a medias (la serie internacional es real, pero sigue siendo una sola Bo5
representativa, no un bracket Swiss+knockout que distinga First
Stand/MSI/Worlds); D19, eliminación simple en vez de doble eliminación real;
D20, los 5 minijuegos comparten dos parámetros de balance genéricos en vez de
tener cada uno el suyo afinado a mano; las opciones C/D del ejemplo 4.4 del
draft (pedirle el pick al coach, cedérselo a un compañero) no se
implementaron porque dependen de `relacion` de compañeros, que es la fase 7.

### 2026-08-08 — Fase 3: la escalera competitiva (tier 3 → tier 2 → tier 1)

Cuarta fase de `PLAN.md`. Este es el paso que rompía la linealidad más grande
del juego: un solo fichaje y ya eras profesional en una liga real. Además,
`leagues.json` estaba desactualizado — tenía LLA, PCS y VCS como tier-1,
ligas que no existen desde la reestructuración de 2025/2026.

**`leagues.json` reescrito.** 6 ligas tier-1 reales de 2026 (LCK, LPL, LEC,
LCS, CBLOL, LCP) con sus rosters exactos, `edadMinima`, `cuposInternacionales`
y `desciendeA` (a qué liga tier-2 alimenta cada una). 6 ligas tier-2 reales
como *circuito* (NACL, LDL, EMEA Masters, LCK CL, Circuito Desafiante) más
`LCP_CHALLENGERS` — este último es un nombre modelado, no investigado:
`TRASPASO` no cubre un circuito de desarrollo real para la región APAC
fusionada, y se documentó como tal (deuda D15) en vez de inventar un nombre
presentándolo como verificado.

**Los rosters de tier-2 se generan, no se declaran.** A diferencia de tier-1
(rosters fijos y reales), los de NACL/LDL/etc. rotan temporada a temporada y
no están investigados con la firmeza que pide `CLAUDE.md` para nombrar un
equipo real. Se generan con el mismo mecanismo que tier-3 (`core/tier3.js`,
`generarNombreOrg`), en un rango de fuerza más alto.

**`core/tier3.js`** (nuevo) — los equipos chicos e inventados donde ficha
todo el mundo la primera vez, generados una vez por región al arrancar la
carrera (`state.mundo.tier3PorRegion`). **`core/competicion.js`** (nuevo) —
el accessor uniforme de "contra quién compito", sea tier 1, 2 o 3: antes
`roster.js` y `rendimiento.js` asumían que siempre había una liga real de por
medio, algo que tier 3 (que no es una liga, es una región) rompe.

**`systems/competitivo.js`** (nuevo, después de `roster` en `ETAPAS_SPLIT`) —
el tránsito entre tiers:
- **Tier 3, brevedad forzada** (pedido explícito): cada split hay ~45% de
  chance de que se resuelva — asciende a tier 2, o el equipo se disuelve
  (y otro te levanta enseguida: es la característica del nivel).
- **Tier 2, el ascenso se gana**: probabilidad corrida por jerarquía, no
  pareja.
- **El año muerto** (dato real): LEC y LPL exigen 18 años, el resto 17. Un
  ascenso ganado a los 17 en una de esas dos ligas queda **reservado** —
  la misma org, la misma liga — hasta que la edad alcanza. No se vuelve a
  sortear nada.
- **El caso Calix** (dato real, `TRASPASO` §4.2): estar en el top absoluto
  de Challenger y todavía joven salta el tramo de tier 3 y ficha directo en
  tier 2.

**Bug encontrado al fichar en tier 3, no relacionado con tiers.** `buscarSalida`
mostraba el nombre de una org en el título de la decisión (`orgQueTeMira`) y
`firmarConEquipo` **volvía a sortear** una org distinta al resolver — dos
tiradas de RNG para lo que tenía que ser una sola elección, así que a veces
firmabas con un equipo que no era el que te había escrito. Se corrigió de
paso: la org elegida ahora viaja en `decision.datos` y se firma con esa
misma, nunca con una recién sorteada.

**El debut se reinicia al llegar a tier 1.** Encontrado por un check que
falló: `tier1_debut` nunca aparecía en 300 carreras. La causa era que
`calcularEtapa` medía "debut" desde el fichaje ORIGINAL (`state.splitFichaje`,
que ahora pasa en tier 3, muchos splits antes de llegar a primera), así que
para cuando alguien pisaba tier 1 ya llevaba más de los 3 splits de gracia.
Se agregó `career.splitAscensoTier1` (separado de `splitFichaje`, que sigue
siendo el KPI de "cuánto tardaste en hacerte notar" que reporta
`simulate.js`) y `calcularEtapa` lo usa cuando `nivel === 'tier1'`.

**5 momentos activados** (borrada su marca `pendiente`): `espera_edad_minima`,
`tier3_recien_llegado`, `tier3_probandose`, `tier2_rookie`, `tier2_titular`.
Los cinco se observaron con contenido real en 300+ carreras vía
`cobertura.js`, junto con `tier1_debut` (que antes de este paso nunca podía
alcanzarse en la práctica bajo el nuevo pipeline).

**`mundo.js`**: `regionOrigen` pasó de sorteo uniforme (1 de cada 8 nacía en
Corea) a pesado por prestigio, y solo entre ligas tier-1 (antes tier-2 también
podía salir sorteada como región de origen, lo cual no tenía sentido: nadie
"nace" en un circuito de desarrollo). `regionDominante` y los rivales de
generación (`generarRivales`) se restringieron de la misma forma: un rival de
generación debuta en una liga real, nunca en una de desarrollo.

**7 checks nuevos (41 en total).** Al verificar que fallan cuando deben
(trampa T5) se encontraron dos huecos reales:

```
El tier 3 es breve: mediana de permanencia ≤ 2 splits, p90 ≤ 4
El año muerto: firmado pero sin edad para debutar se observa y se resuelve solo
Nadie clasifica a un internacional por encima del cupo real de su liga
```

Además, arrastrando la fase 2: el check de integración del chaining
(`El chaining de un segundo evento de verdad usa tipoDeSplit`) daba el mismo
86% para "denso" y "comprimido" en el estado de prueba — la causa era que el
estado elegido caía en la ventana de playoffs, que por sí sola ya fuerza
"denso" sin importar el resto de la comparación. Y el primer check del año
muerto verificaba que el ascenso se resolviera en la MISMA LIGA reservada
pero no en la MISMA ORG — al forzar una regresión que re-sorteaba la org, el
check no lo detectó hasta agregar esa comparación específica.

**Medido** (`simulate.js 1500 60 todas`, seeds 1-1500):

| | fin de fase 2 | fin de fase 3 |
|---|---|---|
| mediana de permanencia en tier 3 | no existía el concepto | **2 splits** (p90: 4) |
| `tier1_debut` observado en 300+ carreras | nunca (piso directo a tier1) | **sí**, con contenido real |
| `regionOrigen` = Corea | 1 de cada 8 (12.5%) | pesado por prestigio (LCK es la escena más grande) |
| llega a pro (equilibrado) | 43.6% | 40.4% |
| burnout (equilibrado) | 14.5% | 21.9% |

**El llegar-a-pro y el burnout se movieron, y hay que decirlo sin maquillarlo**
(regla de proceso 4). La caída en "llegaronAPro" y la suba en burnout son
consistentes con que ahora hay más splits totales de vida profesional antes de
que una carrera se resuelva (tier 3 → tier 2 → tier 1 en vez de un salto
directo), lo que le da más oportunidades al desgaste de mentalidad de
acumularse dentro de la ventana de 60 splits que mide `simulate.js`. No se
tunearon constantes en este commit (regla de proceso 2): la estructura nueva
se mide tal cual, y el recalibrado — si hace falta — espera a que el arco
completo (mercado y retiro, fases 5-6) exista.

`simulate.js 1500 60 todas`: 0 crashes en las 3 estrategias. `cobertura.js`
sigue sin huecos. Probado en navegador real con Playwright: cero errores de
consola reales (el único 404 es el favicon del navegador).

**`CONCEPTO.md` actualizado**: §2 describe ahora el pipeline tier3→tier2→tier1
y el caso Calix; §10 reescribe la carrera de ejemplo en Brasil/CBLOL (antes
usaba LAS/LLA, que ya no existen) pasando por tier 3 y el Circuito Desafiante
antes de llegar a primera.

**Sin arreglar a propósito, quedan documentadas en `PLAN.md` como deuda
técnica**: no hay descenso de tier 1 a tier 2 (D16, va con contratos en la
fase 5); LRN/LRS y la doble residencia LATAM no están modelados — un jugador
de esa región nace directo en NA o BR (D17, ya previsto así en `TRASPASO` §5);
la ventana `internacional` sigue siendo un evento agregado único, distinguir
First Stand/MSI/Worlds espera al sistema de series de la fase 4 (D18); y las
rutinas de offseason todavía no se diferencian por tier (D11, movida a la
fase 7 de contenido).

### 2026-08-08 — Fase 2: que las decisiones pesen

Tercera fase de `PLAN.md`. Dos problemas que arrastraba el juego desde el principio:
`CONCEPTO.md` §8 promete *"la opción obviamente correcta sale mal a veces; tus stats
corren esos pesos, no los eliminan"* y nunca se implementó (los outcomes tenían pesos
fijos en el JSON), y todos los splits pedían la misma cantidad de decisiones sin importar
si algo había cambiado o no.

**Pesos dinámicos — `outcome.modificadores`.** Nuevo campo opcional en el esquema de
eventos:

```json
{ "weight": 6, "modificadores": [{ "field": "player.stats.mecanica", "referencia": 55, "factor": 0.02 }] }
```

`pesoEfectivo = weight × (1 + Σ (valor − referencia) × factor)`, con un piso
(`BALANCE.eventos.pisoPesoEfectivo: 0.15`) para que ningún outcome llegue a probabilidad
cero — corre los pesos, no los borra. `resolverOpcion` pasó a usar `elegirOutcome`, que
queda exportado y testeable por separado. Se retrofitearon **6 outcomes reales** del
catálogo (no todo el catálogo: es una pieza que se sigue extendiendo en fases futuras) —
el duelo de línea de mid, la invasión de jungla, la pelea de adc, la racha de ranked y el
burnout ahora corren con la mecánica o la mentalidad del jugador. **Es prerrequisito duro
de la fase 4**: sin esto, el draft del mapa 5 sería una moneda en vez de una apuesta
informada.

**Densidad emergente — `src/core/presupuesto.js`.** La regla: *novedad = densidad*.
`tipoDeSplit(state)` compara el contexto con el que arrancó el split
(`state.contexto`, el snapshot que toma `systems/contexto.js`) contra el contexto en vivo
en el momento en que se llama, y clasifica el split en `denso` (cambió de etapa o de
nivel, se murió el main, o es la ventana de playoffs) / `normal` / `comprimido` (nada de
eso). `events.js` usa esa clasificación para decidir la probabilidad de encadenar un
segundo evento en el mismo split (`BALANCE.edad.probSegundaDecisionPorTipo`: denso 0.85,
normal 0.4, comprimido 0.12 — antes era 0.4 fijo siempre). `maxDecisionesPorSplit` subió
de 8 a 16 (trampa T9: con series + mercado + retiro de fases futuras, 8 se va a quedar
corto), conservado como red anti-loop, no como regla de juego.

**`bisagra: true`** — un evento marcado así se prioriza sobre el resto del pool ambiente
cuando es candidato: *"salió tu campeón nuevo"* no puede perder un sorteo de peso contra
*"racha de ranked"*. Marcados: `pool_campeon_nuevo` y `pool_main_muerto`.

**6 checks nuevos (36 en total).** Dos de ellos existen porque el primer intento de
verificación **no alcanzaba** — se corrigió en el momento, no después:

```
Los stats corren los pesos de un outcome, no los deciden (CONCEPTO §8)
tipoDeSplit clasifica denso/comprimido correctamente          — test directo, sin simular
El chaining de un segundo evento de verdad usa tipoDeSplit    — no una probabilidad fija
La densidad de decisiones es emergente, no pareja ni descontrolada
Ningún split cierra sin dejar una línea en el feed
```

Al verificar que los checks fallan cuando deben (trampa T5) forzando `tipoDeSplit` a
devolver siempre `'denso'`, el check de densidad poblacional **no lo detectó** — mide
proporciones agregadas (ratio percentil-90/mediana), y una inflación pareja de todos los
splits no cambia esa proporción. Se agregó un test directo sobre la función pura
(`tipoDeSplit distingue denso de comprimido`) que sí lo agarra. Después, forzando que
`resolver()` encadene siempre sin mirar la probabilidad, **tampoco lo agarró** ningún
check existente — la arquitectura solo encadena un nivel, así que el peor caso seguía
estando dentro de los rangos aceptados. Se agregó un tercer check
(`El chaining de un segundo evento de verdad usa tipoDeSplit`) que llama a `resolver()`
de verdad sobre un estado profesional real, forzando el contexto "antes" a comprimido o a
denso, y compara las tasas de chaining medidas. Los tres juntos sí cierran el hueco.

**Medido, antes → después** (400 carreras headless, seeds 1-400):

| | fin de fase 1 | fin de fase 2 |
|---|---|---|
| mediana decisiones/carrera | 80.6 (media, no mediana — fase 0) | **46** (mediana) |
| máximo de decisiones en un solo split | sin tope explícito | **6**, verificado en 400 carreras |
| ratio decisiones/split, p90 duración vs. mediana | no existía el concepto | **0.74×** (tope exigido: 1.8×) |
| splits sin ninguna línea de log | no medido | **0** en 100 carreras × 30 splits |

**Corrección de rumbo respecto del `PLAN.md` original**: la fase 2 proponía gatear una
mediana de 70-130 decisiones por carrera. Medido dio 46, y **no es una regresión**: es la
consecuencia correcta de que los splits `comprimido` ahora casi nunca encadenan (12%
contra el 40% parejo de antes). El 70-130 es un objetivo del **juego terminado** — asume
mercado, series y retiro (fases 3 a 6), que hoy no aportan ninguna decisión. Gatearlo
ahora hubiera sido medirse contra trabajo que todavía no existe (trampa T6). El `PLAN.md`
se corrigió en el momento para reflejar esto: la fase 2 gatea la **forma** de la densidad
(tope por split, ratio largo/mediano), el volumen total se vuelve a medir en la fase 8.

`simulate.js 1500 40 todas`: 0 crashes en las 3 estrategias, llega a pro sin cambios
significativos (43.6%, era 43.5%). `cobertura.js` sigue sin huecos.

**Sin arreglar a propósito, van en fases posteriores**: solo 6 de los ~90 outcomes usan
`modificadores` — el resto del catálogo se retrofitea a medida que la fase 7 amplía
contenido. `nivel` sigue sin poder valer otra cosa que `tier1` una vez profesional (no hay
tier3/tier2 todavía — fase 3). El presupuesto de densidad hoy solo gobierna el
**segundo evento** de `events.js`; el mercado, las series y el retiro (fases 4-6) van a
sumar sus propias fuentes de decisión, y en ese momento `tipoDeSplit` se extiende con sus
propios disparadores (vence el contrato, cambio de tier, lesión, cambio de región).

### 2026-08-08 — Fase 1: identidad. Elegís rol y mains, y eso importa

Segunda fase de `PLAN.md`. Antes de esto, `mundo.js` sorteaba tu rol y tu pool
sin preguntarte nada — el jugador no elegía nada de lo que después el juego
usaba para gatear contenido. Ahora hay una pantalla de inicio real (handle,
rol, 3 mains) y esa elección corre toda la carrera.

**`createInitialState(seed, rng, eleccion?)`** — `eleccion = { handle?, rol?,
campeones? }`. Si no viene, todo se sortea de la seed exactamente como antes:
`simulate.js` y `validate.js` no cambiaron una línea. `generarMundo` consume
las mismas tiradas de RNG haya elección o no (mismo stream, mismo mundo),
así que una seed compartida sigue generando el mismo mundo para el que elige
y para el que no.

**`champions.json`: de 10 a 16-18 por rol**, con el campo `debut`. Los
marcados `debut: true` no existen al arrancar — entran con un parche a mitad
de carrera. Es el mecanismo detrás del pedido textual del usuario: *"salió un
champ nuevo y jugás en dos semanas: ¿lo practicás a full o pulís los de
ahora?"*. `meta.js` los hace debutar con `probCampeonNuevo: 0.08` por split
(2-3 por carrera de 30 splits) y `contexto.js` los convierte en la marca
`campeon_nuevo`, con vencimiento a los 3 splits — sin eso la marca quedaba
prendida el resto de la carrera.

**`src/core/pool.js`** (nuevo) — toda la mecánica de champion pool en un solo
lugar. Antes estaba repartida entre `mundo.js` (pool inicial), `practica.js`
(`pulirCampeon`/`aprenderCampeones`) y `campeones.js` (maestrías). Ahora
`practica.js`, `events.js` y la pantalla de inicio comparten las mismas
funciones. Nuevo tipo de efecto `pool` en el esquema de eventos
(`aprender` / `maestria` / `olvidar`), validado igual que `ladder` y `push`.

**El meta se nombra por campeón, no por arquetipo** — `campeonesEnMeta` y
`campeonesMuertos` en `ajusteMeta.js`. El log de `meta.js` pasó de *"el meta
se mueve hacia los magos de control"* a *"Parche 5: se mueve despacio hacia
Galio y Azir. Tu Yasuo quedó a contramano de un día para el otro."* Es
prerrequisito duro para la fase 4 (el rival de una serie tiene que saber qué
campeones quemar primero).

**Seis marcas nuevas de contexto** derivadas del pool (`pool_angosto`,
`pool_ancho`, `pool_en_meta`, `pool_fuera_meta`, `main_muerto`,
`campeon_nuevo`). Es lo que hace que los 3 campeones que elegiste al empezar
sigan importando veinte splits después, en vez de ser una elección cosmética
del minuto uno.

**24 eventos nuevos** (44 en total, 90 opciones, 180 outcomes):

- `src/data/events/rol/{top,jungla,mid,adc,support}.json` — 3 por rol (15).
  Cada uno gateado por el eje `rol`, así que elegir jungla te expone a eventos
  que un support nunca ve, y viceversa.
- `src/data/events/pool.json` — 7 eventos: uno por cada una de las 6 marcas
  de pool, más `pool_cuota_coreana` (dato real de `TRASPASO` §4.5: Diamante
  80 partidas/5 campeones · Máster 65/8 · GM 50/15 — el requisito de amplitud
  sube con el rango, en tensión directa con `sesgoMaestriaEnPick`, que premia
  especializarse). `pool_campeon_nuevo` es la traducción directa del pedido
  textual del usuario sobre el campeón que sale y hay que decidir si
  practicarlo a fondo o pulir lo de ahora.

**4 checks nuevos (30 en total)**, verificados contra una copia mutada del
código que falla cuando debe (trampa T5):

```
Cada rol tiene eventos propios que ningún otro rol ve      (min 3 por rol)
El pool nunca queda vacío ni por debajo del mínimo          (poolMinimo: 2)
El meta se puede nombrar por campeón, y cambia con el parche
main_muerto se observa cuando el meta te da vuelta el main  (≥40% en carreras >20 splits)
```

**Medido, antes → después** (400+ carreras, `simulate.js 1500 40 todas`):

| | fin de fase 0 | fin de fase 1 |
|---|---|---|
| eventos / opciones / outcomes | 22 / 46 / 92 | **44 / 90 / 180** |
| llega a pro (equilibrado) | 43.5% | 43.5% (sin cambios: el contenido nuevo no tunea nada) |
| crashes en 4500 carreras (3 estrategias) | 0 | 0 |
| eventos exclusivos por rol | 0 | 3 por cada uno de los 5 roles, verificado por simulación forzando cada rol |
| `main_muerto` en carreras >20 splits | n/a (marca no existía) | por encima del 40% exigido |

Probado en navegador real con Playwright (Chromium headless): pantalla de
inicio completa (handle → rol → 3 mains → "Empezar carrera"), una carrera con
pool angosto (2 campeones) que dispara `pool_estrechez` y después
`pool_main_muerto` cuando el parche mata al main, y una carrera de support
completa hasta el fichaje con un evento de rol (`support_*`) y uno de mercado
amateur (`academy_offer`, reescrito en la fase 0). Cero errores de consola
(el único 404 es el favicon que pide el navegador por default).

**Sin arreglar a propósito, van en fases posteriores**: los pesos de outcome
siguen estáticos (fase 2), no hay tier3/tier2 todavía así que `nivel` nunca
vale otra cosa que `tier1` una vez profesional (fase 3), y no hay series ni
draft del mapa 5 — el pool que elegiste ya importa narrativamente, pero
todavía no tiene el peso mecánico central que va a tener en el Fearless de
la fase 4.

### 2026-08-08 — Fase 0: higiene. El juego deja de verse roto

Primera fase del plan maestro nuevo. El usuario reportó cuatro cosas y las cuatro resultaron ser
defectos localizables, no percepción. Se midieron 400 carreras antes de tocar nada.

| Reportado | Causa medida |
|---|---|
| `62.12317247563275` tapando la pantalla | `clampStat` clampea pero **no redondea**; `index.html` y `edadCierre.js` imprimían el float crudo |
| "meme de prensa en Oro 4", "scout en Platino 3" | **8 de 20 eventos no declaraban `contexto`**, y eran los de mayor peso: los 4 sin gatear se llevaban el **39% de todos los disparos** |
| "oraciones sin sentido" | Los `outcomes` no tenían texto: elegías y te devolvía `"Hype +8, Mentalidad -1"`. Y `decisionDesdeEvento` **descartaba la `descripcion`** de la opción — 0 de 40 la tenía |
| "apretás 4 botones" | Toda decisión tenía la misma forma: 2 opciones sin descripción y ±3 a un stat |

**`src/core/formato.js`** (nuevo). Los stats siguen viviendo como float adentro del estado a
propósito: redondear en cada split introduce drift y movería el balance ya calibrado. Se redondea
**al producir texto**. `entero` · `delta` · `deltaCorto` · `lp` · `sobre100` · `porcentaje` ·
`plata` · `lista`. De paso se arregló que los deltas negativos llevaran signo y los positivos no.

**Dos ejes nuevos en el modelo de contexto** — `ladder` y `rol`. Este es el arreglo de fondo:
el modelo tenía nueve ejes y **ninguno era la escalera**, aunque la etapa amateur entera trata de
la escalera. Por eso la regla "un scout solo te llama si estás arriba" no se podía ni expresar.
`bandaDeLadder(ranked, servidor)` en `ranked.js` (bajo/medio/alto/apice/elite) es puro, no consume
RNG, y `nivelDeInteres` de `amateur.js` pasó a reusarlo en vez de duplicar el criterio.

**Esquema de contenido, dos campos nuevos:**

- `option.descripcion` — qué estás eligiendo y qué arriesgás, sin números. La UI **ya sabía**
  pintarla (lo usaban las rutinas); el motor la tiraba en un `map`.
- `outcome.texto` — qué pasó. Es la mitad narrativa de la decisión y es la forma de El
  Ídolo/Copero. El log pasó de `"Meme de la prensa — Subirse a la ola: Hype +8, Mentalidad -1."`
  a título · elección → párrafo → efectos entre paréntesis. `crearLog` acepta un tercer argumento
  con las partes sueltas para que la UI les dé jerarquía tipográfica.

**Los 20 eventos reescritos**: 46 opciones con descripción, 92 outcomes con texto narrativo,
tokens en uso por primera vez (`{org}`, `{jungla}`, `{rival}`, `{region}`) y los 8 sueltos
gateados. Dos eventos eran directamente **incoherentes** y se reescribieron: `academy_offer` decía
que firmabas un contrato y empujaba a `career.orgs` sin que pasara nada (ahora es una prueba, que
es lo que era), y `coach_demands_role` decía que te cambiaban de rol sin cambiar `player.role`
(ahora es el coach pidiéndote otro tipo de juego dentro de tu línea).

**Dos eventos de cierre de edad para profesionales** (`balance_de_temporada`,
`cuentas_de_la_carrera`). No estaba en el alcance de la fase, pero `edadCierre` solo tenía
eventos amateur: **desde los 17 la "decisión grande del año" no existía**. Son además los dos
primeros eventos del catálogo con 3 opciones (`CONCEPTO` §3 dice "2 a 4" y nunca se usaron 3 ni 4).

**Marca `con_vestuario`.** En el split en que firmás, `roster` ya corrió y salió sin hacer nada,
así que la etapa dice `debut` pero `career.companeros` está vacío. Un evento que dijera
*"{jungla} se peleó con el staff"* imprimía la llave cruda. Ahora los tokens de compañero exigen
la marca, y hay un check que lo verifica estáticamente.

**Cinco checks nuevos (26 en total).** Los cuatro nuevos se verificaron contra el árbol de `HEAD`
(trampa T5: un check que no falla cuando debe da falsa confianza):

```
Todo contenido declara dónde aparece                              FALLA en HEAD ✓ (8 eventos + 6 rutinas)
Toda opción se lee antes y todo resultado se cuenta después       FALLA en HEAD ✓
Ningún token puede quedar sin resolver donde el contenido aparece FALLA con {org}/{jungla}/{signature} inyectados ✓
Ningún número llega al jugador con decimales                      FALLA en HEAD ✓
```

El de tokens es **análisis estático sobre el gating declarado**, sin simular: si un contenido
puede aparecer con `etapa: amateur` o `nivel: soloq`, no puede usar `{org}`, `{liga}` ni tokens
de compañero. Mata la clase entera de "oraciones sin sentido" de una vez.

**Medido, antes → después** (400 carreras):

| | antes | después |
|---|---|---|
| evento más visto | `ranked_streak` 2527 · top-4 sin gatear = **39%** del total | `balance_de_temporada` **8.0%**, ninguno arriba de eso |
| eventos nunca disparados | 0 | 0 |
| splits sin evento | 0% | **8.2%** (objetivo <25%, trampa T10) |
| líneas de log con decimales | muchas | **0** en 200 carreras × 60 splits |

`simulate.js 1500 40 todas`: 0 crashes, llega a pro 43.3% (era 40.2%; sube porque los cierres de
edad de profesional agregan caminos de recuperación de mentalidad que antes no existían).
`cobertura.js` pasa a decir la verdad: antes salía "sin huecos" porque los 8 eventos sin gatear
llenaban todas las celdas por igual. Ahora las celdas amateur tienen 5-8 eventos y las de tier 1,
13-16. **46 opciones de 150.**

**Determinismo:** el paquete de formato + los ejes nuevos se verificó contra `HEAD` con una huella
de 40 seeds (`finAnticipado:splits:soloqElo`) y salió **idéntica**: no movieron un decimal. El
contenido sí corre el stream (trampa T1) y ninguna seed vieja reproduce su carrera; el
determinismo intra-versión está intacto.

**Sin arreglar a propósito, van en fases posteriores:** el 23% de las carreras que agotan el tope
de 90 splits (no hay sistema de retiro — fase 6), los pesos de outcome estáticos que contradicen
`CONCEPTO` §8 (fase 2), y que el meta se describa por arquetipo en vez de por campeón (fase 1).
`tendinitis` dispara en el 11.5% de las carreras porque exige la marca `deuda_sueno`: es poco a
propósito, es la consecuencia de una decisión concreta y no una tirada suelta.

### 2026-08-08 — Paso 9: rutinas narrativas en vez de la planilla de bloques

Pedido del usuario: *"siento que eso de administrar los bloques hace todo muy robótico"*. Tenía
razón, y el propio `CONCEPTO.md` §1 lo respaldaba: declara que la referencia es El Ídolo y
Copero —"decidís en los momentos que importan"— y un panel de steppers para repartir 10 bloques
es exactamente lo contrario.

- **`src/data/rutinas/*.json`** (nuevos): 15 rutinas amateur y 7 de offseason. Una rutina es
  **un reparto de recursos con texto narrativo encima**: el jugador ve *"Clase, siesta corta, y
  de las 8 a las 2"*, el motor ve `{ranked: 6, estudiar: 1, dormir: 2, familia: 1}` y un bloque
  robado al sueño. Cada una declara su `contexto`, así que *"Salvar el trimestre"* solo aparece
  con el boletín en rojo y *"Bootcamp en tu propia pieza"* solo cuando ya te están mirando.
- **`aplicarReparto` no se tocó ni una línea.** Toda la economía sigue igual; cambió solo quién
  produce el reparto. `normalizarReparto` se conservó como red: adapta un reparto de 10 a los 12
  bloques del nocturno y garantiza que una rutina mal declarada no invente ni pierda tiempo.
- **La forma de la decisión está garantizada**: siempre hay al menos una salida `segura` (nunca
  se acorrala al jugador) y al menos una `agresiva` (la trampa de `CONCEPTO` §4 siempre a mano).
  Hay un check que lo verifica sobre 120 carreras.
- **El panel de steppers se borró de `index.html`** (~75 líneas) y la UI quedó con **un solo
  camino de render**. Las opciones ahora muestran título y texto narrativo.
- **`practica.js`** también: los 6 puntos de preparación pasaron a rutinas (*"Bootcamp: dos meses
  afuera"*, *"Dos semanas sin tocar el juego"*, *"Encerrarte con los VODs"*).
- **`CONCEPTO.md` §3 actualizado**: decía literalmente "tenés 10 bloques de tiempo por periodo".

**Dos correcciones encontradas midiendo, no leyendo:**

1. El jugador automático elegía la rutina **maximizando la suma ponderada** contra los pesos que
   usaba el reparto libre. Eso siempre elige la rutina más extrema en el destino de mayor peso
   → 70% de burnout. La función objetivo correcta no es maximizar sino **minimizar la distancia
   contra las proporciones deseadas**: "cuál de estas rutinas se parece más a cómo lo habría
   repartido yo". Eso reproduce fielmente lo que producía el reparto libre.
2. Al set de rutinas le faltaban formas que las estrategias usaban. Se agregaron cuatro
   (*"Lo justo en todo, el resto al ranked"*, *"Tapar el agujero más urgente"*, *"Una sola noche
   larga"*, *"Todo el día jugando, pero durmiendo"*), siguiendo la regla del plan: si el balance
   no vuelve, faltan rutinas, no sobran constantes.

**Sobre el balance, con honestidad**: aun con las rutinas agregadas, llegar a pro bajó del 54.9%
al 40.2% jugando con criterio. **No es un bug: con rutinas narrativas tenés genuinamente menos
control que con una planilla**, así que el mismo rendimiento por bloque rinde menos. Se
recalibró `lpPorBloque` (34 → 52) para compensar en parte, y ahí se frenó a propósito: subir más
pelea contra el freno de altura del paso 8, que existe para que el potencial oculto siga
decidiendo tu techo de ladder.

| etapa amateur (1500 × 16 splits) | llega a pro | no llegó | prohibición | burnout |
|---|---|---|---|---|
| equilibrado | 40.2% | 50.7% | 3.7% | 8.3% |
| ranked | 19.9% | 0.7% | 11.2% | **78.9%** |
| prudente | 33.5% | 66.5% | 0% | 0% |

### 2026-08-08 — Paso 8: la escalera de ranked real

Pedido del usuario: *"nadie arranca en platino con 1200lp y no es normal que en platino te hable
un ojeador tampoco"*. La investigación con datos reales confirmó las dos cosas y agravó la
segunda: `1200 LP` no es un número que exista en LoL, y el prospecto que ficha un equipo está en
el **top 1-50 de Challenger de su servidor a los 15-17** (caso Calix, rank 1 de Corea a los 16).
Challenger es el 0,025% de la ladder.

- **`src/data/ranked.js` + `src/data/servidores.js`** (nuevos): los 10 tiers reales
  —Hierro→Bronce→Plata→Oro→Platino→**Esmeralda**→Diamante, 4 divisiones de 0-100 LP cada uno, más
  Máster/Gran Máster/Challenger sin divisiones y con LP acumulativo— y los 8 servidores con sus
  **cupos y cutoffs medidos** (Challenger: 300 plazas en KR/EUW/NA, 200 en LAS/LAN/BR/CN/TW;
  cutoffs reales EUW 2398, KR 1831, NA 1528, LAN 1465, LAS 1287 LP).
- **`src/core/ranked.js`** (nuevo): la escalera en puntos absolutos (Hierro IV = 0, cada división
  100 LP, el ápice arranca en 2800). Promoción con **rollover del excedente**, descenso que cae
  en **25/50/75 LP** y no en 0, escudo anti-descenso al subir de tier, **sin series de promoción**
  (eliminadas en 2023) y **sin decay en ninguna forma** — un pro juega soloQ todos los días.
- **`player.soloqElo` sobrevive como espejo derivado de solo lectura**. Todo lo que lo *leía*
  (el resumen de edad, `simulate.js`, la UI) siguió funcionando sin tocar una línea; lo que lo
  *escribía* migró a un tipo de efecto nuevo, `{"type": "ladder", "path": "player.ranked"}`, que
  produce un log mucho mejor: `"SoloQ: Diamante III → Diamante II"` en vez de `"SoloQ LP +23"`.
  Un check impide que nadie vuelva a escribir el espejo y lo desincronice.
- **El punto de partida se sortea alrededor de Oro**, modulado por el potencial oculto. Un
  prodigio arranca más arriba sin que se le diga.
- **El scouting dejó de ser un umbral de LP** y pasó a ser la **posición en la ladder**:
  Máster/Gran Máster te abre la puerta de un equipo chico, Challenger la de uno serio, y el top
  50 siendo menor de 18 la de una org de primera.
- **Hallazgo al medir: el LP subía sin techo.** Con la ventana de prospecto extendida, el 20.8%
  terminaba en Challenger. En la realidad el ascenso se frena cuando llegás a tu nivel, porque
  arriba te toca gente mejor. Se agregó un **freno por altura**: la ganancia depende de la
  distancia entre tu mecánica y el nivel que exige el rango donde estás. Efecto secundario
  valioso: **el potencial oculto ahora decide tu techo de ladder sin que se te diga nunca** — lo
  intuís cuando el LP deja de moverse.
- **La ventana de los prospectos se cierra por mercado, no por un límite duro.** En vez de
  cortar la carrera a los 18, la probabilidad de que te fichen cae con la edad
  (15-16 → 100%, 17 → 85%, 18 → 55%, 19 → 28%). Es el mismo sesgo etario que va a gobernar el
  retiro en el paso 11: el mercado prefiere jóvenes.

**Distribución al cerrar la etapa amateur** (1000 carreras): Platino 1.3% · Esmeralda 8.0% ·
Diamante 20.5% · **Máster 57.7%** · Gran Máster 9.2% · **Challenger 3.3%**. Mediana en Máster y
llegar a Challenger sigue siendo raro y ganado.

| etapa amateur (1500 × 16 splits) | llega a pro | no llegó | prohibición | burnout |
|---|---|---|---|---|
| equilibrado | 54.9% | 40.3% | 2.2% | 5.4% |
| ranked | 17.3% | 0% | 12.1% | **83.5%** |
| prudente | 55.4% | 43.9% | 0% | 0.9% |

- **4 checks nuevos** (20 en total): la mecánica de la escalera verificada pieza por pieza
  (rollover, 25/50/75, escudo, ápice sin división, ida y vuelta de puntos absolutos) · que **la
  escalera no se mueva sola** (el check anterior confundía decay con un evento de efecto
  negativo) · que nadie escriba el espejo · y que la distribución final de rangos se mantenga en
  banda.
- Traza real (seed 42): *Oro II · 57 LP → Platino I · 23 LP → Esmeralda III · 51 LP → Diamante IV
  · 9 LP → Máster · 87 LP*.

### 2026-08-08 — Paso 7: modelo de contexto de carrera

Pedido del usuario, textual: *"tienen que estar fijadas por el momento de la carrera... que se
sepa cuándo sale cada opción de diálogo, se tiene que saber muy bien dónde estás parado en la
carrera"*. Eso no es contenido, es **arquitectura**: hasta hoy los eventos se filtraban con
`conditions` sobre paths arbitrarios del estado, y con eso era imposible responder "¿qué puede
salir a los 17 estando en una academia?" sin simular.

- **`src/core/contexto.js`** (nuevo): `calcularContexto(state)` deriva **9 ejes** —`etapa`,
  `edadBanda`, `nivel`, `estatus`, `momentum`, `mercado`, `region`, `residencia`, `ventana`— más
  una lista de `marcas`. Es **pura y no consume una sola tirada de RNG**, y eso es lo que la hace
  segura: se puede enumerar sin simular, y agregarla no movió un decimal del balance calibrado.
- **`src/data/contextos.js`** (nuevo): el vocabulario cerrado (`EJES`, `MARCAS`) más la tabla de
  **25 momentos canónicos** resueltos por prioridad. El cruce completo de 9 ejes es intratable
  para autorear; la etiqueta única lo colapsa a un nombre por situación: `amateur_al_limite`,
  `tier1_debut`, `tier1_slump`, `veterano_al_margen`, `espera_edad_minima`, `sin_equipo`…
  Los 15 que todavía no son alcanzables están marcados con el paso que los va a activar, y cada
  paso posterior borra los suyos: eso le da a cada paso una definición de terminado nítida.
- **Gating declarativo en los JSON**: bloque `contexto` (AND entre claves, OR adentro, `!` niega
  marcas, `edadMin`/`edadMax` para edad exacta). **Regla dura sostenida por validate: se prohíben
  `conditions` sobre `phase` y `age`** — si el gating grueso pudiera esconderse adentro de una
  condición numérica, la matriz de cobertura mentiría. Las 12 condiciones que había se migraron.
- **`src/core/plantillas.js`** (nuevo): tokens para que el contenido nombre tu carrera real —
  `"{jungla} no camina más para vos"` → `"Zenvex no camina más para vos"`.
- **`src/dev/cobertura.js`** (nuevo): la matriz que responde el pedido.
  `node src/dev/cobertura.js` imprime momento × ventana; `--huecos` lista las celdas flojas;
  `--momento tier1_debut` dice qué cae ahí; `--evento team_drama` hace la pregunta inversa. Cada
  celda muestra **dos números**: eventos que pasan el contexto, y de esos cuántos **nunca llegan
  a disparar** por sus condiciones numéricas — el detector de huecos disfrazados.
- **Dos bugs arreglados**:
  - `validate.js` referenciaba `BALANCE.meta.pesoDominante`, clave borrada al reescribir la
    sección meta en el paso 5. `undefined <= 0.5` es `false`: **el check nunca fallaba**.
  - `state.pendiente.etapa` guardaba un **índice** de `ETAPAS_SPLIT`. Con el registro pasando de
    11 a ~17 sistemas, toda partida serializada a mitad de split quedaba corrupta. Ahora el
    cursor se resuelve por `sistemaId`.
- **Bug de diseño encontrado midiendo**: el filtro de eventos usaba el contexto **cacheado del
  arranque del split**. En el split donde firmás, `phase` cambia a mitad de camino y el caché
  queda viejo. Ahora el filtrado calcula el contexto **en vivo**; el caché es solo para la UI.
- **4 checks nuevos** (16 en total): vocabulario de contexto válido · tokens que existen · todo
  `effect.path` con etiqueta legible · y el central: **300 seeds × 45 splits sin que ningún
  estado quede sin momento declarado**, más que todo momento no-pendiente aparezca de verdad.

**Verificación de que no movió nada** (era el requisito del paso): se extrajo `HEAD` a un
directorio aparte y se compararon las **400 primeras seeds × 3 estrategias**, con huella de
`finAnticipado`, splits y LP. **Cero divergencias en las tres.** Además, la traza de tiradas de
RNG por split es idéntica (`88,93,96,103,90,89,89,97,108,26` en seed 3).

*(Corrección: la tabla de balance que este documento traía del paso 4 se usó por error como
línea de base; había sido medida antes de que existieran los pasos 5 y 6. La línea de base real
post-paso-6, 1500 carreras × 11 splits, es: equilibrado 56.3% sigue en carrera / 41.8% no llegó
/ 1.4% prohibición / 0.5% burnout; ranked 79.1% burnout / 10.4% prohibición; prudente 58.9% /
41.1%.)*

El contexto se lee como una narración. Traza real (seed 19): *un pibe más grindeando soloQ →
a un paso de que te bajen del ranked → los scouts te empezaron a mirar → debutando en primera →
uno más del roster → en crisis de resultados → titular → referente → la franquicia del equipo*.

- **Estado del catálogo**: 10 momentos alcanzables, 40 opciones de las 150 objetivo. 8 de los 20
  eventos todavía no declaran contexto, así que aparecen en cualquier lado — que es exactamente
  el problema que el usuario señaló, ahora visible en la matriz. Se cierra en el paso 13.

### 2026-08-07 — Paso 6: el ciclo del split profesional

`AUDITORIA.md`: *"una vez que `phase` pasa a `profesional`, `soloqElo`, `studies`, `familyTrust`
y `sleep` se congelan para siempre... No hay ajuste al meta, ni draft, ni temporada regular, ni
playoffs, ni offseason."* La carrera se detenía a los 18 y el resto era decorado.

- **`src/systems/roster.js`** (nuevo): al firmar se genera el vestuario —4 compañeros inventados,
  uno por cada otro rol, con nivel orbitando la fuerza de la org—, la **sinergia** (química
  colectiva, que sube sola con los splits juntos) y la **jerarquía** (tu lugar personal, que
  arranca abajo: entrás como el rookie). Cada tanto se va alguien y hay que reconstruir la
  química. Cambiar de equipo resetea las dos **parcialmente**, no del todo.
- **Draft condicionado por jerarquía** (`campeones.js`): la probabilidad de que te den el campeón
  que querés es `draftBase + jerarquía`. Si no te lo dan, jugás con menos maestría, rendís peor,
  y la jerarquía baja más. **Es la espiral central de `CONCEPTO` §7, funcionando.**
- **`src/systems/rendimiento.js`** (nuevo): el rendimiento del split sale de la hoja de atributos
  **ponderada por rol** (`roles.js` dejó de ser decorativo), corrida por el ajuste al meta, la
  maestría del campeón que terminaste jugando, la sinergia, la jerarquía y ruido gaussiano. Se
  cruza con el nivel de tus compañeros para dar la fuerza del equipo, y esa fuerza compite contra
  las otras orgs de tu liga —cada una tirando su propio split— para dar una posición.
  Consecuencias: títulos (sólo al cierre de temporada), viaje internacional para el campeón de la
  liga, hype **ponderado por la visibilidad del rol** (un support rinde igual y se habla menos de
  él), y mentalidad que sube ganando y baja perdiendo.
  - La jerarquía se mueve por la brecha entre lo que rendiste y **lo que se esperaba de vos**, y
    lo que se espera **crece con tu propia jerarquía**: a la franquicia no le alcanza con rendir
    como uno más. Sin eso se clavaba en 100 y la espiral dejaba de empujar para abajo.
- **`src/systems/practica.js`** (nuevo): la versión profesional del recurso escaso de
  `CONCEPTO` §3. En el offseason repartís 6 puntos de preparación entre pulir tu campeón,
  aprender uno nuevo (**el que el meta pide**, que es la salida real del sacudón), entrenar
  mecánica, estudiar macro o **descansar**. Reusa el mismo tipo de decisión `reparto` que la
  etapa amateur, así la UI no necesitó nada nuevo.
- **`validate.js`**: check nuevo del ciclo profesional — que el roster tenga un compañero por rol
  sin pisar el tuyo, que **la jerarquía varíe de verdad entre carreras** (si se clava, la espiral
  central no existe) y que no todas las carreras terminen con los mismos títulos.

**Balance medido** (800 carreras × 36 splits, de las 465 que llegaron a profesional): jerarquía
0-100 (promedio 64), **títulos 0-10 con promedio 1.6 y un reparto casi exacto 50/50 entre
carreras con título y sin ninguno**, internacionales 0-10, signature en el 67%.

Y el agujero que el paso 4 había dejado abierto **quedó cerrado**: con la opción de descansar en
el offseason, el burnout pasó de llevarse el 55% de las carreras al **18.5%** (estrategia
equilibrada) y al 0.1% jugando prudente. La mentalidad ahora tiene las dos mitades: cuesta
siempre, y hay una forma concreta de recuperarla.

| carrera completa (40 splits) | llega a pro | no llegó | prohibición | burnout | sigue en carrera |
|---|---|---|---|---|---|
| equilibrado | 56.8% | 41.8% | 1.4% | 18.5% | 38.3% |
| ranked | 89.6% | 0% | 10.4% | **79.7%** | 9.9% |
| prudente | 58.9% | 41.1% | 0% | 0.1% | 58.8% |

- **Pendiente conocido**: el "sigue en carrera" es la carrera que llega al tope de splits sin
  terminar. **Todavía no existe el retiro** (por edad, por elección o por lesión) ni la tarjeta
  de legado: es el paso 8.

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
