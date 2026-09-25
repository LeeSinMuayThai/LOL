# AUDITORIA.md — Auditoría de "Un Split Más" y plan a seguir

> **Qué es este documento.** Una auditoría externa e independiente del proyecto — motor, UI,
> herramientas, y el camino que llevan entre sí — con un plan de acción al final. No es una
> sección más de `PLAN.md`: es una lectura de afuera, hecha una vez, que termina en
> recomendaciones concretas.
>
> **Por qué existe con este nombre otra vez.** `CLAUDE.md` documenta que un `AUDITORIA.md`
> anterior (junto con `TRASPASO.md`) se borró el 2026-09-02 porque describía un estado 28 commits
> viejo y ya se contradecía con el código. Este documento nace con la misma vida útil corta —
> **es una foto, no se actualiza sola** — pero se estructura para no repetir el motivo de aquel
> borrado: en vez de replanificar lo que `PLAN.md` ya planea, lo **cita por nombre** (§J0-J9,
> §P.6) y solo agrega lo que `PLAN.md` todavía no tiene. Si en algún momento este documento
> empieza a contradecir a `PLAN.md`, gana `PLAN.md` — y este archivo se borra o se vuelve a
> escribir, igual que la vez pasada.
>
> **Medido contra** el commit `3fc6ea5` (2026-09-19, rama `fase-9r-que-el-juego-se-juegue`) más
> el árbol de trabajo sucio de esa fecha (`PLAN.md`, `PROGRESO.md`, `src/data/balance.js`,
> `src/dev/guards.js`, `src/dev/validate.js`, `src/ui/app.js`, `src/ui/core/reconciliar.js`
> modificados; `src/ui/graficos/` sin trackear). Escrita por un auditor externo (Claude), a pedido
> del usuario, sin tocar una sola línea de `src/`.
>
> **Metodología.** Tres agentes de exploración en paralelo (motor `core/`+`systems/`+`data/`, UI
> `src/ui/`, herramientas `src/dev/`) más verificación directa del auditor sobre el árbol real —
> no sobre `PROGRESO.md`. `validate.js`, `simulate.js 1000` y `cobertura.js --huecos` se
> corrieron de verdad en esa sesión (trampa T6 del propio proyecto: medir ahora, no citar de
> memoria). Toda afirmación de este documento lleva `archivo:línea` o la salida de un comando.

---

## Veredicto en una frase

**El motor es de calidad profesional y el aparato que lo verifica es más grande que el motor
mismo — pero los dos midieron todo menos si el juego se deja jugar, y el proyecto lo descubrió
recién el día 45, cuando una sola persona lo jugó una sola vez.** Nada de esto es difícil de
arreglar; nada de esto se va a arreglar solo.

---

## 1. Retrato cuantitativo (medido en la sesión de auditoría)

| | |
|---|---|
| Commits | 130 (47 días, 2026-08-06 → 2026-09-19) |
| Motor (`core/`+`systems/`) | 11.680 líneas en 62 archivos |
| Datos (`data/`, sin JSON) | 2.003 líneas · JSON de eventos: 250 eventos / 517 opciones / 1.034 outcomes / 1.606 efectos |
| UI (`src/ui/`) | 9.247 líneas comprometidas (JS+CSS) + 1.235 sin commitear (`graficos/`, 7 archivos) |
| Verificación (`src/dev/`) | 8.333 líneas — **más grande que `core/`+`systems/` juntos** |
| CSS | 3.830 líneas, 8 hojas |
| Checks en `validate.js` | 194 (79 rápidos, 115 `checkLento`) |
| Dependencias | 0 |
| `Math.random()` fuera del RNG inyectado | 0 |
| Tests unitarios | 0 — `validate.js` es el único arnés |
| CI | 0 — no existe `.github/` |
| `validate.js` completo, corrido en la auditoría | **194/194 OK, 0 FAIL**, ~55 min de reloj |
| `simulate.js 1000`, corrido en la auditoría | **0 crashes**; 77,2% llega a pro, 0,0% varada, 74,9% termina "en carrera" |
| `cobertura.js --huecos`, corrido en la auditoría | **vacío** — 517/150 opciones del objetivo (3,4×) |
| `dist/` | 1.657 KB contra un techo de 1.700 — **3 días desactualizado** al momento de medir, le falta `graficos/` entero |
| Fases cerradas | 0-13, T, 9E, 9M, 9W, D |
| Fases abiertas | **V** (congelada en V1, no commiteada) · **J** (planificada, sin empezar) |

---

## 2. Lo que se hizo bien

No es un proyecto con problemas de calidad. Es un proyecto con un problema de **puntería**: cada
pieza que construyó está bien construida, y aun así el conjunto no se dejaba jugar. Esto importa
para el diagnóstico completo — el remedio no es "escribir mejor código", es "medir lo que todavía
no se medía".

**Disciplina de proceso que no tiene la mayoría de los equipos profesionales.** 16 reglas de
proceso no negociables (`PLAN.md`, "Reglas de proceso"), 10 trampas nombradas y numeradas (T1-T10,
cada una con su historia real de cuándo costó tiempo), 53 filas de deuda técnica (D1-D53) con su
fase de resolución declarada por adelantado. La regla de proceso 7 — *"al escribir un check nuevo,
verificar que falla cuando debe"* — nace de un bug real (T5: un check con una clave inexistente
pasaba siempre) y desde entonces se aplica: cada check nuevo del historial reciente se documenta
"verificado en rojo primero".

**Honestidad documental real, no aspiracional.** El changelog reporta números que empeoran, no
solo los que mejoran (regla de proceso 4): *"check 8 (caídas tier 1 → tier 2) quedó en ~14% (piso
15%)"* (D16), *"el residual quedó en ~14%"*. Filas enteras de la tabla de deuda dicen literalmente
*"esta fila nunca se había actualizado"* (D7, D41) — el proyecto se corrige a sí mismo en público
en vez de dejar que la documentación mienta calladamente.

**Las tres reglas invariables duras se sostienen con guards automáticos, no con buena
voluntad.** Verificado por grep propio, no citado: cero `Math.random()` fuera del RNG inyectado en
todo `src/` (los 4 hits son comentarios que lo prohíben), cero acceso a `document`/`window`/
`localStorage` en `core/`+`systems/`, los 25 sistemas de `ETAPAS_SPLIT` conformes a
`aplicar(state, rng) -> {state, logs}`. Y en los datos: de **1.606 efectos**, cero tienen
`min === max` (rango degenerado disfrazado de valor fijo); de **517 opciones**, cero tienen menos
de 2 outcomes o una distribución degenerada. Es un nivel de disciplina de datos poco habitual.

**Determinismo real y usado como herramienta de trabajo, no como promesa.** La técnica "huella de
40 seeds contra `git archive HEAD`" (trampa T1) se aplicó antes y después de cada fase riesgosa del
historial reciente. `build.js` va más lejos que la mayoría de los pipelines de deploy: corre 12
seeds × 30 splits en `src/` y en `dist/` y falla el build si diverge un solo campo del fingerprint.

**Contenido a escala real, medido, no estimado.** 517 opciones sobre un objetivo declarado de 150
(3,4×). `cobertura.js --huecos`, corrido en la sesión de auditoría: **vacío**. La celda peor de
"split mudo" mide 3,7% contra un techo de 25% (T10, cerrada como check real). La investigación de
dominio (`CONCEPTO.md` §12) es genuinamente rigurosa — cutoffs de ranked reales por servidor, la
fusión y disolución real de la LTA en 2025, la corrección de que las series de promoción no
existen desde 2023 — fechada, con la fuente del método declarada, y separada explícitamente del
resto del documento como "no hay que volver a investigarlo".

**La decisión de congelar la fase V e insertar la fase J es la decisión correcta, tomada rápido,
con diagnóstico medido y no por gusto.** Cuando el usuario jugó una carrera completa el
2026-09-20 y dijo que era "un simulador de clics de mierda", el proyecto no lo tomó como una queja
de sensación: auditó cada afirmación contra el código (§J.0 de `PLAN.md`) y encontró un número real
detrás de cada una. Frenar una fase de pulido visual para atacar la causa de fondo, con el trabajo
de la fase anterior guardado como librería reutilizable en vez de tirado, es madurez de producto.

---

## 3. Lo que se hizo mal — hallazgos priorizados

### 🔴 Crítico

#### H1 — El instrumento de verificación no puede medir si el juego se juega bien

**Hallazgo.** `PLAN.md` §V.0 (escrito 2026-09-19) abre con *"El juego está terminado. La carrera no
se ve."* Un día después, §FASE J abre con el veredicto de una carrera jugada de punta a punta:
*"esto es un simulador de clics de mierda"*. Entre esos dos días no cambió una línea de motor.
Cambió que alguien jugó. Los 194 checks estaban en verde los dos días — y seguían en verde al
medir para esta auditoría.

**Causa raíz, verificada en el código.** `src/dev/estrategias.js` define 3 políticas headless
(`equilibrado`/`ranked`/`prudente`) y son la única forma en que `validate.js` y `simulate.js`
"juegan" una carrera. Los 4 sistemas con decisiones (`events.js:429`, `mercado.js:932`,
`serie.js:496`, `temporada.js:471`) exportan `resolverAuto`, que es lo que corre en cada check. De
los 194 checks, **115 son `checkLento`** — bandas agregadas sobre miles de carreras simuladas.
Ninguno de los 194 pregunta "¿esta decisión cambió el resultado del partido para un humano que
mira la pantalla?". El proyecto construyó, sin proponérselo, un instrumento que mide todo excepto
lo único que finalmente importó.

**Por qué es crítico.** No es un bug puntual — es la razón estructural por la que **45 días de
checks en verde convivieron con un juego no divertido**, y por la que el mismo patrón puede volver
a pasar en la próxima fase si nadie lo nombra. Es la misma familia que D26 ("tres herramientas
mirando para otro lado a la vez"), un nivel más arriba: ya no es una celda de contenido sin gatear,
es la categoría entera de "agencia del jugador" sin instrumento.

**Plan.** Ya asignado — es `PLAN.md` §J0 ("el instrumento"), primer commit de FASE J, y es
correcto que vaya primero. Ver §5 de este documento, paso AUD-2.

---

#### H2 — Tres días de trabajo terminado sin commitear, y la documentación ya lo da por cerrado

**Hallazgo.** Último commit al momento de auditar: `3fc6ea5`, 2026-09-19. El árbol de trabajo
tenía sin commitear: toda la capa de gráficos SVG de la fase V1 (`src/ui/graficos/`, 7 archivos,
~40 KB, sin trackear por git), 4 checks nuevos y el guard de color literal en JS
(`src/dev/validate.js` +301, `src/dev/guards.js` +52), la fase J entera (`PLAN.md` +328 líneas),
el changelog del saneamiento del 22-09 (`PROGRESO.md` +55) y una limpieza de constantes muertas
(`src/data/balance.js`).

`PLAN.md` línea 39 ya declara **"V1 ✅ (2026-09-20)"**. `PROGRESO.md` no tenía ninguna entrada de
V1 — la entrada más reciente (22-09) *menciona* V1 al pasar como "hecho pero sin commitear". La
Definición de terminado de `CLAUDE.md` exige, sin excepción: `validate.js` en verde, determinismo
verificado, `simulate.js 1000` sin crash, **commit del cambio**, y **`PROGRESO.md`
actualizado**. Las dos últimas no se cumplieron, y la tabla de estado ya dice que sí se cumplieron.

**Agravante encontrado en esta auditoría, no anotado en `PLAN.md`.** Había tres worktrees de git
más, además del principal:

- `faseV-V1-agy` — misma rama que ya está mergeada en `HEAD`, con el **mismo diff sin commitear
  duplicado en dos directorios físicos** (mismo hash de archivo, verificado con `md5sum`).
- `faseV-V1-grok` — rama propia (`d543149`), **committeada pero nunca mergeada**: entregó una
  versión más vieja de solo 3 de los 6 primitivos (`linea`/`hexa`/`cinta`), ya reemplazada por la
  versión de `agy` que está en uso. Nadie la borró ni la documentó como descartada.
- `frigatebird` — worktree de Orca, huérfano desde 2026-09-02 (época de la fase P), sin relación
  con el trabajo actual.

El workflow de delegación (Grok/Gemini implementan en worktrees; Claude revisa; Sonnet arregla)
funcionó — pero dejó una rama entera committeada y abandonada sin que ningún documento la
mencione, más tres directorios de trabajo sueltos en el filesystem.

**Por qué es crítico.** Es el único riesgo del proyecto que no tiene red. Todas las demás
invariantes tienen un guard automático (`Math.random()`, DOM en el motor, contraste, color
literal). Esta no: una pérdida del árbol de trabajo local —falla de disco, `git clean -f` mal
apuntado, un `checkout` descuidado en el worktree equivocado— borra V1 completa y el plan de J
entero, y deja `PLAN.md` afirmando un ✅ que ya no existe en ningún lado.

**Plan.** Ver §5, paso AUD-1 — higiene inmediata, sin dependencias.

---

### 🟠 Alto

#### H3 — El juego está listo para publicarse y sigue sin URL

**Hallazgo.** `PLAN.md` §P.6 marca "conectar Cloudflare Pages/Netlify" como *"el único paso manual
de todo el proyecto"* desde el 2026-09-15. `dist/` compila, el pre-flight de `build.js` verifica
capitalización de imports, import attributes reescritos, ausencia de azar de navegador, y el
fingerprint de 12 seeds contra `src/` — todo en verde la última vez que se corrió. No hace falta
cuenta, ni pago, ni configuración: `npm run build` y arrastrar `dist/` a Netlify Drop.

**La conexión con H1 es real y vale la pena entenderla, aunque no se actúe todavía.** El defecto
más grande del proyecto (la fase J entera, diez quejas medidas) se descubrió cuando **una**
persona jugó **una** carrera completa, el día 45 — porque no había manera de que nadie más lo
jugara: el repo nunca salió de la máquina del autor. Publicar es, estructuralmente, la forma más
barata de conseguir una segunda, tercera y cuarta fuente de la misma señal.

**Nota del usuario, respetada.** El usuario indicó explícitamente que no hay apuro en publicar.
Ese es un criterio legítimo — la fase J (§AUD-3 más abajo) no depende de que el sitio esté
publicado para arrancar, así que no publicar hoy no bloquea nada del resto del plan. Este hallazgo
se mantiene documentado porque el diagnóstico es real y va a seguir siendo cierto cuando llegue el
momento de publicar, pero **sale de la lista de acciones con orden de ejecución** y pasa a
"disponible cuando se quiera" (§5, paso AUD-5).

---

#### H4 — Un check del propio suite exige lo contrario de lo que la fase siguiente va a construir

**Hallazgo.** `validate.js` tiene:
```
checkLento('Mediana de decisiones de draft por serie ∈ [0, 1] y ≥28% de series sin ningún draft')
```
`PLAN.md` §J.0 lista *"32,5% de las series sin un solo draft"* como una de las diez quejas medidas,
y §J6 declara el check de reemplazo: *"series sin draft < 10%"*. **El check que hoy pasa en verde
exige, textualmente, lo contrario del check que J6 va a escribir.**

**Por qué importa más que un caso aislado.** De los 194 checks, 115 son `checkLento` — bandas
agregadas sobre el comportamiento actual de la simulación. Una banda agregada, por construcción,
convierte "lo que el juego hace hoy" en "lo que el juego debe seguir haciendo": es un trinquete.
Protege contra regresión accidental y, en el mismo movimiento, encarece cualquier cambio
deliberado de diseño. `PLAN.md` §J.4 ya anticipa el costo ("esperar 20-40 checks fuera de banda")
pero lo trata como fricción de ejecución, no como un patrón del propio diseño de la suite que vale
la pena nombrar una vez y recordar la próxima vez que se escriba un check de banda.

**Plan.** Ninguna acción nueva — J6 ya lo reemplaza (`PLAN.md`). Al escribirlo, dejar un
comentario explícito de "este check reemplaza al de tal fecha, que exigía lo contrario" — ver
§5, nota dentro de AUD-3.

---

#### H5 — La cadena causal que `CONCEPTO.md` declara "no negociable" está cerrada a medias

**Hallazgo.** `CONCEPTO.md` §7 dice, en su propia voz: *"Si tocás el código y rompés una de estas
[cadenas], rompiste el juego aunque los tests pasen."* La cadena **"El precio de todo"**
(`cualquier mejora → cuesta mentalidad → mentalidad en cero = burnout`) está construida solo a
medias: pagás mentalidad (`stats.mentalidad` se descuenta en `amateur.js`, `servicioMilitar.js`,
`serie.js`, etc.), pero pagarla **no te cuesta partidos** — solo gatea eventos
(`core/contexto.js:198`) y limita cuánto puede caer un split (`systems/atributos.js:111`). Nunca
llega a `core/fuerza.js`, que es donde se decide el rendimiento.

En cambio, las otras dos cadenas centrales de la misma sección **sí** están cerradas de punta a
punta, verificado: la espiral central (jerarquía → pick → maestría → rendimiento,
`core/fuerza.js:25-27`) y "fama y talento son cosas distintas" (`core/valorMercado.js:78`).

**Matiz que el propio `PLAN.md` §J.0 no dice, y que cambia el remedio.** La queja "las opciones no
afectan nada" atribuye el problema a que `mentalidad`/`hype` "no se leen" fuera de
`rendimiento.js`. Es inexacto: **sí se leen** — en `core/valorMercado.js:78`,
`systems/mercado.js:86,128`, `systems/amateur.js:369`, `systems/roster.js:105`,
`core/contexto.js:198`, `systems/atributos.js:111`. El problema real no es la ausencia de lectura,
es que **se leen en sitios donde el jugador nunca ve el número moverse**. J1 (meter
mentalidad/hype en `fuerza.js`) es la corrección correcta, pero tratarla solo como "conectar un
cable que falta" es media verdad — la otra mitad es un problema de **legibilidad**, no de
conexión.

**Plan.** Cubierto por `PLAN.md` §J1/J2. Este hallazgo pide que J1 se cierre midiendo
explícitamente "¿el jugador puede ver que gastó mentalidad y perdió por eso?", no solo "¿el
rendimiento ahora depende de mentalidad?" — ver §5, nota dentro de AUD-4.

---

#### H6 — `dist/` está a menos de 3 KB de su propio techo duro, y ya quedó desactualizado

**Hallazgo.** El último `dist/` compilado al momento de medir pesaba **1.657 KB** contra un techo
de **1.700 KB** (`build.js:51`, `PESO_MAXIMO_KB`). Desde que se compiló, 10 archivos de `src/`
habían cambiado y faltaba la carpeta `graficos/` entera (+39 KB sin commitear) — el próximo build
real iba a acercarse mucho al techo, o superarlo.

**Por qué importa junto con H2.** Es el mismo patrón que ya le costó tiempo al proyecto una vez
(el techo de `dist/` pasó de reporte a check duro recién el 2026-09-13, después de haberse
superado en silencio). Cuanto más tiempo pase sin commitear y compilar, más sorpresivo va a ser
el momento en que el build falle por peso.

**Plan.** Se resuelve solo con AUD-1 (commitear) seguido de un `npm run build` real y, si hace
falta, subir el techo con número medido, en su propio commit — regla de proceso 2 del proyecto.

---

### 🟡 Medio

#### H7 — El HUD más visto del juego es el que menos se benefició de la fase V

**Hallazgo.** `src/ui/components/ficha.js:302` (403 líneas, el componente que está en pantalla en
todo momento de la carrera) sigue destruyéndose y reconstruyéndose entero en cada split
(`replaceChildren`). La migración al reconciliador cubrió 5 de 6 paneles del riel derecho, pero no
llegó a la ficha — que es exactamente el objetivo declarado de V3 ("deltas animados") y hoy no
puede tenerlos porque no conserva identidad de nodo entre splits.

**Dato adicional, no en `PLAN.md`.** `src/ui/core/store.js` (`suscribir`) y
`src/ui/core/delta.js` (`crearDelta`) tienen **cero consumidores en todo el repo** fuera de sus
propios checks — groundwork correctamente construido y documentado como tal, pero conviene decirlo
con números: el "kernel" de la fase V0 es, hoy, un `reconciliar` real usado en 6 lugares y dos
piezas más que todavía no hacen nada.

**Plan.** Ya es exactamente el alcance declarado de `PLAN.md` §V3. Sin acción nueva — confirmación
cuantificada de que V3 tiene trabajo real pendiente, no una formalidad.

---

#### H8 — Bug latente: el reproductor de beats esquiva al reconciliador en el feed

**Hallazgo, no documentado en `PLAN.md`.** `src/ui/reproductor.js:101-115` inserta líneas del feed
directamente en `#logList` con `insertBefore`/`removeChild` manuales, **sin pasar por
`reconciliar`** — invisible al `WeakMap` que el reconciliador usa para no duplicar nodos, y sin el
parámetro `offset` que `src/ui/components/feed.js:234` sí pasa para mantener claves estables. En
el camino normal esto queda enmascarado porque coincide con `logList.hidden = true` al cerrar la
carrera (`app.js:213`) — pero en la salida por `maxSplitsDeSeguridad` (el tope anti-loop), el feed
puede terminar con hasta el doble de filas de las que corresponden.

**Por qué es medio y no alto.** No se ha observado en producción (el camino que lo dispara es raro
por diseño) y no corrompe el estado del juego, solo la vista.

**Plan.** Ver §5, paso AUD-1 (higiene chica, sin dependencias) — pasar el `offset` correcto en
`reproductor.js:101` y hacer que el trimming pase por el mismo contenedor que conoce
`reconciliar`. Una tarde, con su propio check de regresión.

---

#### H9 — La documentación de arquitectura tiene semanas de atraso y sigue en la ruta de lectura obligatoria

**Hallazgo.** `DISENO.md` §4.1 declaraba su última sincronización el 2026-09-02. No conoce
`src/ui/core/` (el kernel de V0), `src/ui/graficos/`, `src/ui/paneles/`, `src/ui/app.js`, ni ~20
módulos nuevos de `core/`/`systems/`. Sigue describiendo el control de flujo como si viviera
dentro de `index.html` — que es exactamente lo que V0 (2026-09-19) deshizo. `CLAUDE.md` lo pone
primero en el orden de lectura recomendado al abrir el proyecto.

**Coste compuesto.** `PLAN.md` (5.538 líneas) + `PROGRESO.md` (6.599 líneas) = **12.137 líneas de
documento** contra 28.487 de código, y `PROGRESO.md` es append-only: nunca se poda.

**Plan.** Ver §5, paso AUD-6 (en paralelo, sin bloquear nada).

---

### 🟢 Bajo (higiene, sin urgencia)

| # | Hallazgo | Evidencia |
|---|---|---|
| H10 | `validate.js` completo tarda ~55 min medido; el comentario del propio archivo dice "~7 min (D32)" | `validate.js:75` — el archivo que advierte contra citar líneas de base viejas (T6) cita la suya |
| H11 | `--rapido` cubre 41% de los checks (79/194) y salta todo lo estadístico/conductual | valida esquema y CSS, nunca comportamiento |
| H12 | Cero CI — los 194 checks dependen de que alguien corra el checklist a mano | no existe `.github/` |
| H13 | Cero tests unitarios — un check rojo no dice qué función se rompió | `validate.js` es el único arnés, 7.068 líneas, un solo archivo |
| H14 | `src/dev/_probe_9m_baseline.mjs` — 181 líneas auto-declaradas "TEMPORAL, se borra tras 9Ma" | nunca se borró |
| H15 | `index.html` a 194/200 líneas contra su propio candado | mismo patrón de margen que se cierra en silencio que `dist/` |
| H16 | `README.md` dice "Node 18+"; `with { type: 'json' }` requiere Node 20.10+/22+ | piso publicado incorrecto |
| H17 | Ciclo de import real: `core/plantel.js ↔ core/mundo.js` (por `generarHandle`) | único ciclo en todo `core/`+`systems/`, fácil de cortar |
| H18 | 6 campos de estado vestigiales: `career.contracts` (muerto del todo), `career.hitos` (escribe-y-nadie-lee), `player.titles`/`player.worlds` (duplican `career.titulos`/`internacionales`) | regla invariable 9 ("un solo state") cumplida en forma, no en contenido |
| H19 | 84 números mágicos residuales en `systems/*.js`, concentrados en `servicioMilitar.js` (la fase más nueva) | deuda de recencia, no de diseño — `balance.js` ya tiene 605 constantes |
| H20 | `systems/mercado.js` a 945 líneas, el archivo más grande del proyecto | candidato natural a partirse en su próxima fase de contacto |
| H21 | 11 clases CSS muertas (`material.css` ~75% sin uso) y 13 selectores duplicados entre hojas de "override" | ya anotado como D47/D50 para V8/V9 |
| H22 | `reemplazarEnElLugar` del reconciliador solo copia `className`+`dataset`, no `title`/`aria-*`/`style` | correcto hoy por accidente, no por diseño |

---

## 4. Análisis estratégico

### 4.1 — Hacia dónde va el proyecto ahora mismo

El camino real, no el declarado, es: **motor → verificación → contenido → (recién ahora) UI →
(recién ahora, mid-fase) jugabilidad real**. Es un orden defendible para construir un simulador
determinista con garantías fuertes, y produjo exactamente lo que ese orden produce bien: un motor
limpio, datos consistentes, cero deuda de las invariantes duras. El costo de ese orden es el que
el propio `PLAN.md` ya se cobró una vez con la regla de proceso 12 (*"ninguna fase cierra sin su
pantalla — siete fases correctas hundidas en un feed de logs"*) y se lo está cobrando una segunda
vez, un nivel más arriba, con la fase J: el motor puede estar completo y el juego puede no jugarse
bien, porque "completo" se midió contra contratos y bandas, nunca contra un jugador.

### 4.2 — Hacia dónde parece que el proyecto quiere ir

La intención declarada es clara y consistente en los tres documentos rectores: un simulador
narrativo, corto por sesión (25-40 min), determinista, rejugable, con una carrera que se pueda
contar en cinco frases sin mirar el log. La fase J es la primera fase del proyecto escrita
enteramente al revés del resto — parte de una queja humana, no de una medición agregada — y es la
señal más fuerte de que el proyecto está corrigiendo su propio rumbo antes de que alguien externo
tuviera que decírselo. Esa es la dirección correcta.

### 4.3 — Por qué camino va de verdad, hoy

Por el camino de **"terminado según el instrumento, no terminado según el jugador"**, y lo sabe:
es literalmente el título en el que se resume la fase J. El riesgo real no es esa distancia — ya
fue medida y tiene plan — es que **el instrumento que la detectó fue un jugador, no una
herramienta**, y el proyecto todavía no tiene una segunda fuente de esa señal. Publicar sigue
siendo, a la larga, la forma más barata de conseguirla — pero eso es una decisión del usuario, y
la de no apurarla hoy es tan legítima como cualquier otra mientras no bloquee lo que sigue.

### 4.4 — Qué cambiar y qué no cambiar

**No cambiar:** el orden motor-primero para lo que queda de contenido nuevo; el criterio de
"contenido antes que constantes" (regla de proceso 3); la disciplina de medir antes de tunear
(regla de proceso 2); el aparato de determinismo; la costumbre de escribir la deuda en una tabla en
vez de dejarla en comentarios sueltos.

**Cambiar:** (1) tratar "¿un humano jugándolo lo describiría distinto que hace tres carreras
atrás?" como una pregunta que se hace **antes** de escribir cada fase de contenido/UI nueva, no
solo cuando algo sale mal; (2) la próxima vez que se agregue un `checkLento` de banda agregada,
escribir junto a él, en una línea, qué comportamiento específico protege y desde cuándo — para que
el próximo H4 se encuentre en 10 segundos, no en una auditoría externa; (3) commitear con más
frecuencia en fases de UI/gráficos — es donde se acumuló el único riesgo del proyecto sin red
(H2).

---

## 5. Plan a seguir

Fases en orden de **dependencia real**, no de urgencia de calendario — ninguna tiene fecha, y
publicar (antes AUD-5) se movió deliberadamente fuera del camino crítico por decisión del usuario.

### AUD-1 — Higiene inmediata *(no depende de nada, es la base de todo lo demás)*

- Commitear lo que ya está verde: `src/ui/graficos/` + los 4 checks nuevos de `validate.js`/
  `guards.js` (V1) en un commit; el saneamiento post-V1 (`comun.js`, D53, `pintarChrome`, el
  guard de `reconciliar.js`) en otro si se quiere separar por tema; `PLAN.md` (FASE J) y
  `PROGRESO.md` documentados como ya lo están.
- Corregir `PLAN.md` línea 39: V1 no es "✅" mientras no tenga consumidor en la UI — pasa a 🔶
  *"librería completa, sin pantalla; la pantalla es V2"*.
- Borrar los worktrees huérfanos: `git worktree remove faseV-V1-grok` (y `git branch -d
  faseV-V1-grok` si no se quiere conservar su historial — ya está superado por la versión de
  `agy`), `git worktree remove frigatebird`.
- Arreglar H8 (`reproductor.js:101`, el `offset` de `agruparBeats`), si se quiere aprovechar el
  mismo movimiento — es chico e independiente.
- **Terminado cuando:** `git status` limpio, `node src/dev/validate.js` en 194/194 (o más, si se
  suma el fix de H8 con su check), `PROGRESO.md` tiene una entrada real de V1, `PLAN.md` no
  afirma nada que el árbol no sostenga.

### AUD-2 — El instrumento *(= `PLAN.md` §J0, primer commit de FASE J)*

- No se reinventa acá — es la referencia. Ejecutar J0 tal como está especificado: el bloque
  `jugabilidad` en `simulate.js`, la partición por `categoria` en `cobertura.js`, la línea de
  base completa de §J.0 medida de nuevo (no citada).
- **Terminado cuando:** los checks que J0 mismo declara pasan.

### AUD-3 — El corte mínimo de FASE J *(= `PLAN.md` J3 + J4 + J5 + J6 + J-previa + J9)*

- En ese orden. Sin sistemas nuevos, sin recalibración de bloque A — es lo que el propio `PLAN.md`
  ya identifica como suficiente para arreglar la partida que se jugó el 2026-09-20.
- Al cerrar J6 (que reemplaza el check de H4), dejar el comentario de "reemplaza al check de
  tal fecha" en el commit o en `validate.js`, para que quede rastreable.
- **Terminado cuando:** las diez quejas de §J.0 de `PLAN.md` no se repiten jugando la carrera que
  las disparó.

### AUD-4 — Decidir el segundo tramo, con datos reales

- Recién acá se elige entre el segundo tramo de FASE J (J1/J2 — agencia real, cierra H5 midiendo
  legibilidad además de conexión — y J7/J8 — el internacional, el commit más caro de todo el
  plan) y retomar V2.
- El criterio no es el orden en que quedó escrito `PLAN.md`: es el feedback de quienes hayan
  jugado la build más reciente, publicada o no.
- **Terminado cuando:** hay una decisión tomada y anotada en `PLAN.md`, con la razón.

### AUD-5 — Publicar *(disponible en cualquier momento después de AUD-1, sin apuro)*

- `npm run build` + arrastrar `dist/` a Netlify Drop o Cloudflare Pages — `PLAN.md` §P.6 ya tiene
  el detalle completo (build command, output directory, sin variables de entorno).
- No bloquea AUD-2, AUD-3 ni AUD-4. Es la manera más barata de conseguir una segunda fuente de la
  señal que hoy solo dio una carrera jugada una vez (H1/H3) — vale la pena hacerlo eventualmente,
  sin que sea una acción con fecha.
- **Terminado cuando:** hay una URL, y §P.8 de `PLAN.md` (verificación end-to-end en la URL real)
  se corre una vez.

### AUD-6 — Deuda de documentación *(en paralelo, sin bloquear nada de lo anterior)*

- Resincronizar `DISENO.md` §4.1 contra el árbol real, o borrarla y regenerarla como se hizo con
  `DISENO.md` §6 en su momento (H9).
- Evaluar podar `PROGRESO.md` a un archivo separado para las fases anteriores a la 9 — mismo
  criterio que ya se usó para borrar los `AUDITORIA.md`/`TRASPASO.md` originales.
- **Terminado cuando:** `DISENO.md` no describe nada que ya no exista en `src/`.

---

## Apéndice — comandos corridos en la sesión de auditoría (para reproducir)

```bash
node src/dev/validate.js              # 194/194 OK, 0 FAIL, ~55 min
node src/dev/simulate.js 1000         # 0 crashes, 77.2% llega a pro
node src/dev/cobertura.js --huecos    # vacío
git status --short && git diff --stat
git worktree list && git branch -a
git rev-list --left-right --count origin/master...HEAD   # 0  3
```
