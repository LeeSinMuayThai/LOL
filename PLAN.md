# PLAN — de simulador roto a modo carrera de LoL

> **Este documento es el plan completo, fase por fase, hasta el juego terminado.**
> Nada se planea en el momento: si algo no está acá, no se hace hasta escribirlo acá.
> `PROGRESO.md` cuenta lo que ya pasó y con qué números; este documento cuenta lo que falta.
> Los datos de investigación (ligas 2026, salarios, duración de carreras, Fearless) viven en
> `CONCEPTO.md` §12 y **no hay que volver a investigarlos**.

Orden de lectura para quien abre el proyecto: `CLAUDE.md` (reglas duras) → `CONCEPTO.md` (qué es
el juego, con los datos de la investigación en §12) → este documento → `PROGRESO.md` (changelog).

---

## Estado

| Fase | Qué resuelve | Estado |
|---|---|---|
| **0** | Higiene: números, gating, texto narrativo | ✅ commit `cac4af2` |
| **1** | Identidad: elegís rol y mains, y eso importa | ✅ ver `PROGRESO.md` |
| **2** | Que las decisiones pesen: pesos dinámicos, densidad | ✅ ver `PROGRESO.md` |
| **3** | Escalera competitiva: tier3 → tier2 → tier1, ligas 2026 | ✅ ver `PROGRESO.md` |
| **4** | Competición jugable: series Bo5, Fearless, draft, minijuegos | ✅ ver `PROGRESO.md` |
| **5** | La temporada existe: la fecha que importa | ✅ ver `PROGRESO.md` |
| **6** | El meta con nombre | ✅ ver `PROGRESO.md` |
| **7** | El prólogo se comprime y la repetición se rompe | ✅ ver `PROGRESO.md` |
| **8** | La ficha: el registro que acumula + la tarjeta permanente + `src/ui/` | ✅ ver `PROGRESO.md` |
| **9** | El mercado: ofertas, contratos, salarios, la trampa del equipo grande visible | ✅ ver `PROGRESO.md` |
| **9E** | El varado: la carrera vuelve a tener juego después del primer equipo | ✅ 9Ea→9Ed, ver `PROGRESO.md` |
| **9R** | **Que el juego se juegue**: el cooldown mide splits, la tabla deja de mentir, la interrupción vuelve a ser escasa, y elegir cambia el resultado | ✅ 9Ra→9Rg y 9R.0→9R.5, ver `PROGRESO.md` |
| **T** | **La transmisión**: el sistema de diseño, el shell, el ritmo del split, y las pantallas que faltaban. Fue antes de 9M para que 9M/10/11/12/13 tengan dónde enchufar su pantalla | ✅ T0→T8, ver `PROGRESO.md` |
| **9M** | **El mercado de pases**: el mundo se puebla de jugadores, la demanda existe, alguien compite por tu asiento, la escalera deja de ser un dado | ✅ **9Ma→9Mj** (10 commits). El asiento se **disputa** contra el calibre de la liga (`max(liga.prestigio, org.fuerza)`); el mercado y la renovación se **enfrían con la edad** (`castigoEtario`, en puntos). check 9 `r 0,40 → 0,815`. Checks 7 y 9Mi-1 redefinidos a "liga mayor (prestigio ≥ 70)" (§9M.12.4). Pirámide (punto 3) evaluada y diferida. **9Mj** devolvió "La dinastía" (25%) y "series sin draft" (28%) a su tope original. **Residual**: check 8 (caídas tier 1 → tier 2) quedó en ~14% (piso 15%) — §9M.12.4. `validate.js` 148/148 |
| **9W** | **El mejor del mundo**: ranking vivo de los mejores del momento (Top 5 a la derecha siempre, Top 20 al cierre de temporada). Se entra y se sale por mérito, rota mucho, de cualquier edad; distinto de los rivales de generación. Cero RNG (determinista por `hashCadena`) | ✅ **cerrada** (9Wa→9Wd). Ranking en el estado (r(nivel,rank)=0,96, cero-stream) + 6 ganchos (valor de mercado, piso de franquicia, legado, ficha, marcas/momento/eventos, `rivales[].puntaje` vivo) + pantalla (panel Top 5 permanente + reveal del Top 20 en el feed, con "quedaste #23") + calibrado (§9W.6: entrás al Top 20 en el 51% de las carreras con éxito, ~1% de las lavadas; rival de generación ~37%). Ver §9W |
| **10** | El final: retiro emergente + la tarjeta de legado | ✅ **10a** (el retiro real, ver §10.1) · **10b** ya estaba cerrada desde 9R5b · **10c** (lesiones + servicio militar, ver §10.4) — cierra la fase. **10d** (calibrar) no hizo falta como commit aparte: los números de 10a/10c ya caen en banda a la primera medición |
| **11** | El año: calendario, la nota de la temporada, el archirrival | ✅ **cerrada** (§11.1+§11.2, cierra D8). El archirrival corre su carrera (contador en la ficha) y el cierre de edad tiene nota (0-10), titular por peso emocional (10 tipos + racha para condiciones sostenidas) y 6 viñetas fijas, reemplazando el diff plano de antes. Ver `PROGRESO.md` |
| **12** | La jerarquía de la decisión: categorías, rareza, consecuencia previa, el dado | ✅ **cerrada** (12a→12f). **12a** (`validate.js --rapido/--completo`, cierra D32) · **12b** (`categoria` en los 220 eventos + `formatoUi.js` + check) · **12c** (`peso: 'ambiente'` + tarjeta compacta) · **12d** (`core/previa.js`: previa, riesgo, gate + corrección de §12.3) · **12e** (`core/rareza.js`: rareza común/rara en las decisiones de mejora + el dado nombra el eje) · **12f** (bracket siempre visible, minijuego con identidad por competición + dificultad por ronda, camino de serie persistido en `registro.internacionales`) |
| **P** | Publicar: build, guardado en el navegador, seed en la URL, el repo y el host | 🔶 **P.2/P.3/P.4/P.5 ✅** — el guardado, la seed en la URL, el repo y la página como página (nombre del juego + `og:image` propia, cerrado 2026-09-19) ya existen · **P.7/P.10 ✅**. **P.6 casi ✅ (2026-09-15)**: `origin/master` mergeado y al día, techo de `dist/` re-medido (1636 KB con el `og:image` nuevo) y convertido en check duro (1700 KB). **Conectar la cuenta del host** (Cloudflare Pages/Netlify) es del usuario, no algo para hacer de oficio — queda como el único paso manual de todo el proyecto. **Queda**: ese paso manual y **P.8** (verificación en la URL publicada una vez conectado) |
| **D** | Los campos que la ficha promete y el motor no escribe: `ultimo_ano`/`sin_renovacion` (D30), `registro.picos.rankedPuntos` (D40) y `career.liga` sin limpiar al quedar libre (D42) | ✅ **cerrada (2026-09-15)**: D.1+D.3 por Grok, D.2 por Gemini, en worktrees paralelos, auditados por un tercer agente antes del merge — ver nota de la fase para el detalle del proceso. Los 5 checks en verde; el T1 declarado no llegó a ocurrir (huella idéntica en 40 seeds) |
| **13** | Contenido a escala | ✅ **cerrada (2026-09-18, 13a→13e)**. Los 8 puntos de §13.1 resueltos: el hueco de cobertura, los 3 momentos `pendiente` obsoletos activados (+ `MOMENTOS` reordenada con check nuevo), D11 (rutinas por tier), servicio militar como bisagra alcanzable, declive con contenido propio (`declive.json`), D34 (`tier3.json`, 9 eventos), D17 (`latam.json`, narrativo), D14 (rango 2-4 opciones) y el check T10 que faltaba. Catálogo: 226→246 eventos, 442→**508 opciones**. `cobertura.js --huecos` vacío. Ejecutada por esta sesión sin delegar (excepción puntual, decisión del usuario) |
| **V** | **Que la carrera se vea**: cero gráficos en todo el juego, la UI solo habla en presente, nada puede animarse entre estados. Sucede a la fase T y construye sobre su sistema de diseño (V0→V10, ver detalle abajo) | 🔶 **congelada en V0b (2026-09-20)**. **V0 ✅**: el controlador vive en `src/ui/app.js` (710→194 líneas de `index.html`), `store.js`/`reconciliar.js`/`delta.js` nuevos, la inversión `ficha.js → shell.js` resuelta, D45 cerrado de paso. **V0b ✅**: `reconciliar` adoptado en las 5 listas de clave natural (feed, tabla, plantilla, Top 5, mercado) vía el helper nuevo `reemplazarEnElLugar`. `validate.js` 189/189, `simulate.js` 0 crashes, huella anti-T1 idéntica en 40 seeds, `dist/` 1657 KB, verificado en navegador real. 🔶 **V1: librería completa, sin consumidor en la UI (auditoría 2026-09-25) — la pantalla es V2.** La capa de gráficos (`src/ui/graficos/`, 6 primitivos SVG) + el guard de color literal en JS existen y validan solas, pero ningún archivo de `src/ui/` fuera de `graficos/` la importa todavía. **Se congela acá a propósito**: jugando la carrera completa apareció un diagnóstico más urgente que "verse" — casi todo lo que rompe la experiencia es motor, no UI, y V se prohíbe tocarlo. Entra **FASE J** antes de V2. Ver su nota de apertura · V2→V10 después de J. **2026-10-01**: J se reorganiza en FASE K, y V se retoma después de K, re-escrita con "una cosa por vez en pantalla" (`AUDITORIA.md` B7) |
| **J** | **Que la partida se juegue**: agencia real, la selección de eventos deja de forzar, te dejan draftear y jugar minijuegos, el internacional es un torneo de verdad, y elegís de dónde sos. Motivada por una carrera jugada de punta a punta el 2026-09-20 con diagnóstico medido, no de gusto (ver la nota de apertura de la fase) | 🔶 **Reorganizada en FASE K (2026-10-01)**: lo que quedaba se reparte en K0-K5 o se reemplaza (§K.6). **J0 ✅ (2026-09-25, AUDITORIA.md AUD-2)**: el instrumento — `simulate.js` bloque `jugabilidad` + `cobertura.js --categorias`, línea de base remedida en §J.0b. Resto del primer tramo (J3, J4, J5, J6, J-previa, J9) y segundo tramo (J1, J2, J7, J8, J10) sin empezar — ver detalle abajo. Workflow de delegación: grok/agy implementan en worktrees, un Claude fresco revisa, Sonnet arregla si hace falta |
| **K** | **El nivel manda**: que el resultado lo decida tu nivel, que tu nivel lo construyan tus decisiones, que el juego te frene solo cuando algo grande está en juego, y que todo termine en un número. Sale de `AUDITORIA.md` (2026-10-01) y de las decisiones D-A..D-D del usuario (§K.1) | 🔶 **K0 ✅ (2026-10-02, sin corrimiento)**: J3 integrada, el instrumento (`huella.js`, bots `criterio`/`azar`/`malas`, bloques de KPIs, `agencia.js` con test corregido), la higiene de motor y servidor y el pase de vocabulario LoL; la línea de base está medida en §K.0b y cambia cinco metas de §K.3. `validate.js` 251/251, `simulate.js` 0 crashes, huella de 40 seeds idéntica. D72 cerrada con la confirmación del usuario (push, archivo y borrado de `faseV-V1-grok`, worktrees limpios). **K1 ✅ (2026-10-02, sin corrimiento, merge `0954fb5`)**: el puntaje de la carrera (`core/puntaje.js`, seis componentes + techo revelado), el nivel con nombre por hechos, la leyenda comparada, la tarjeta, el desafío del día, compartir e historial local; D66/D75/D76 cerradas; `validate.js` 274/274, `simulate.js` 0 crashes, `dist/` 1802 KB (techo 1900). **K2a + K2b ✅ (2026-10-02, merge `25d9f55`)**: el instrumento corregido y la estructura del bloque A (una tirada por partido contra la p declarada, `ruidoEfectivo`, rendimiento por z, sinergia una vez, compañeros en vivo); `validate.js` 288/288 + 1 PENDIENTE (`proyeccionJerarquia`, K3c), `dist/` 1823 KB. **K2c ✅ (2026-10-02, merge `26209b4`)**: factores centrados en un pro, meta 0,9-1,1, maestría 0,1, σ de mapa 17,7, `vueltas` 2 → r misma liga 0,582, Bo5 favorito 81,0/88,4 (juntos 83,5), tope de rendimiento 5,2% de las temporadas; 1 PENDIENTE (umbral de pausa del draft → K3c). **K2d ✅ (2026-10-03, merge `80c9ae5`)**: la previa con la p que el motor tira (una sola fuente, `core/previaDePartido.js`), guardado `VERSION` 6, `validate.js` 293/293 + 1 PENDIENTE, `dist/` 1847 KB. **K2 cerrada.** **K3 ✅ (2026-10-03, estructura neutra, huella idéntica)**: consistencia por mentalidad, barras que vuelven a una base, descanso topeado, efectos que duran (`bonusPermanente`, `registro.marcas`, "Lo que construiste"); `validate.js` 311/311 + 1 PENDIENTE, `dist/` 1867 KB, guardado `VERSION` 7. **K3c ✅ (2026-10-03, merge `4d2e950`) — bloque A cerrado**: r misma liga 0,59, R² sin ruido 0,52, mentalidad pro 72 (2,6% ≥ 90), hype ≥ 90 19%, `criterio` ×3,3 sobre `azar` en #1 3+ temporadas; vuelta a la base asimétrica (la agencia no se re-basea); tabla "después del bloque A" en §K.0c; 2 PENDIENTE del bloque B (draft, Bo5 conjunto). **K4 + K4-C2 + K5 ✅ estructura (2026-10-03, merge `094ece2`)**: te frena solo lo importante (momentos 27,9 → 18,3, pausas de serie 51,2 → 24,9, eventos 35,8 → 2,0), bifurcaciones con efectos de carrera reales (5,4 por carrera), el Mundial de verdad (Swiss + bracket, ajenos por hash, campeón del torneo), la región elegida, D78, el final por mercado; revisión de motor y navegador (bug crítico del hash, ids crudos, dos crashes de registro) cerrada; `validate.js` 374 + 2 PENDIENTE, `simulate.js 1000` 0 crashes, `dist/` 2074 KB (techo 2100), guardado `VERSION` 10. **K4c ✅ (2026-10-04, merge `23400cd`) — bloque B cerrado**: palanca por horizonte 22,4 → 48,8%, interrupciones `criterio` 111 → 84, minijuegos 11 → 4, tiempo-máquina 8,1 → 5,9 min, la prueba que decide el contrato, la fecha marcada y el cierre de año como intercambios, el plan anual; metas de §K.3c como checks duros; `validate.js` 423 + 1 PENDIENTE C, `simulate.js 1000` 0 crashes, `dist/` 2125 KB (techo 2200), guardado `VERSION` 11. **K5c 🔶 en curso**: la estructura (E desgaste, R+T presión de retiro y título que cuenta, M la élite se busca) integrada y revisada; siguen el barrido y el paso 3. Siguiente: K5c → K6. Orden: K0 (higiene + instrumento) → K1 (el número) → K2/K3/K3c (bloque A, el nivel) → K4/K4c (bloque B, el ritmo) → K5/K5c (bloque C, el Mundial, la región, el final) → K6 (jugarlo). Ver §K.5 **K5c ✅ (2026-10-05, merge `ef3509b`)**: el bloque C con estructura (E/R/T/M/N/A/V/H) y calibrado (Final2 + LPL 91), K6a integrada, los arreglos de dos cazabugs y no-pro con piso de soloQ por perfil. La validación completa da 495 OK / 0 FAIL; las metas de §K.3b que no llegan quedan re-basadas por la decisión del usuario "cerrar y que K6 juzgue" (D80). **Sigue K6** |

> **Por qué estas tres fases se insertaron antes del mercado.** Jugando el juego con las cuatro
> fases hechas aparecieron cuatro defectos medibles: la temporada regular se resuelve con una
> tirada y una línea de log (nunca hay un partido con nombre, tabla ni marcador), la decisión de
> un evento cae **después** de que el split ya se resolvió (nunca hay un "se viene tal partido"),
> el meta es un número invisible (nadie sabe qué significa "Ajuste al meta: 49/100"), y la mitad
> de la partida es la etapa amateur con un catálogo de eventos tan chico que se recicla en
> round-robin. Las tres fases nuevas atacan esas cuatro cosas en el orden en que se necesitan una
> a la otra: primero existe el partido (5), después el meta se puede mostrar sobre ÉL (6), y recién
> ahí tiene sentido calibrar cuánto dura el prólogo y afinar la repetición (7). El detalle completo,
> con los números medidos que motivan cada decisión, está en las tres secciones que siguen.
>
> **Por qué las fases 8-11 originales se reescribieron por completo (agosto 2026).** Comparando el
> juego contra su referencia directa (El Ídolo del Potrero) imagen por imagen, con auditoría de
> código contra cada diferencia observada, apareció un diagnóstico distinto del que se venía
> siguiendo: el problema no era falta de motor — 7 fases y 14.020 líneas ya estaban— sino que **no
> existe un registro que acumule la carrera y no existe una pantalla que lo muestre.** Sin
> `career.registro` no hay mercado posible (las ofertas necesitan tu hoja), sin mercado no hay
> retiro emergente con sentido (te retirás cuando el mercado deja de llamarte), y sin retiro no hay
> tarjeta final. Las fases 8-11 se reordenaron por esa dependencia dura y se agregó una fase 12
> dedicada exclusivamente a conectar a la pantalla lo que el motor ya calcula y nunca muestra. El
> diagnóstico completo, con evidencia imagen-por-imagen y línea-de-código, vive en el historial de
> `PROGRESO.md` (entrada "Auditoría contra El Ídolo del Potrero"). **Regla de proceso 12, nueva:
> ninguna fase cierra sin su pantalla** — es la lección de las fases 0-7.
>
> **Por qué la 9M se insertó entre el mercado y el final (2026-09-02).** Midiendo el juego con la
> fase 9 cerrada: el mercado se abre **3,05 veces por carrera**, deja **3,80 pretemporadas en
> silencio**, y en 120 carreras nadie pisó más de **2 ligas** (media 1,48). El **74%** termina en
> tier 1 y **nadie** cae de vuelta a tier 2, porque el ascenso es `chance(0.12 + jerarquia × 0.45)`
> y no existe el descenso. La causa es la misma en los tres casos: **el mercado no tiene un mundo
> del otro lado** — una org es `{ nombre, liga, fuerza }`, los compañeros se inventan de cero cada
> vez que cambiás de equipo, y nadie más compite por tu asiento. La fase 9M puebla ese mundo y
> convierte la oferta en una consecuencia legible en vez de un dado. Va **antes de la 10** por
> dependencia dura, la misma que ordenó las fases 8-11: la 10 define el retiro como emergente
> ("te retirás cuando el mercado deja de llamarte") y con el mercado de hoy eso vuelve a ser un
> dado. Se hace bien a la primera, o se hace dos veces.

---

## Decisiones del usuario (textuales — respetarlas, no volver a preguntar)

| Tema | Decisión |
|---|---|
| **Duración / profundidad** | **La larga: 25-40 min.** El Bo5 mapa a mapa es sistema central, no opcional · *(2026-10-01, D-A: sigue un solo modo, el largo. D-B: el Bo5 sigue, pero ya no se decide mapa a mapa — plan de Fearless por serie, §K4)* |
| **Duración de la carrera** | *"para mí los splits no tienen que estar fixed, si no sos bueno no tenés ofertas, si sos muy bueno tu carrera dura como la de Peanut o Faker"* → **emergente del mercado, nunca de un reloj** |
| **Minijuegos** | *"tiene que haber minijuegos, porque si está solo determinado por las stats es muy predecible, pero que tampoco todo sea un gambling a los minijuegos"* → varianza controlada por el jugador, dentro de las competiciones · *(2026-10-01, D-B: solo en el clímax — mapa decisivo, la prueba en cada salto, la rueda de prensa tras una final o un escándalo — con tope de 4-8 por carrera, §K4)* |
| **Draft** | *"yo jamás dije que sí o sí tenés que draftear cada partida"* → el motor elige solo; te para cuando la elección deja de ser obvia · *(2026-10-01, D-B: "draft no sí o sí" en playoffs, partidos importantes, tryouts e internacionales → un plan de Fearless por serie, y el motor te frena solo si se rompe el plan o en el mapa decisivo, §K4)* |
| **Champion pool** | *"elegías tu champion pool, POR EJEMPLO, si elegías jg, Lee Sin, Wukong, Elise eran tus mejores champs elegidos por vos, y que quizás el meta en la season ficticia era Sejuani, Nidalee y Jarvan y que te salían eventos o preguntas de si practicar más, o eventos tipo: salió un nuevo champ y jugás en 2 semanas — practicarlo a full para ir con más pool, o pulir los de ahora y aprenderlo después del match"* |
| **Alcance** | Agresivo donde haga falta: esquema de eventos, ejes de contexto, `leagues.json` y UI se reescriben. Los checks se mantienen y se agregan; el balance se re-mide desde cero |
| **Ligas** | *"ligas 2026 exactas, y que puedas arrancar en equipos ficticios de tier3 pero máximo que eso dure muy poco usualmente, y recordá que haya eventos del equipo"* |
| **Ranked** | Escalera visible completa. **Sin decay**: *"si sos pro player vas a tener siempre que jugar soloq así que decaer no tendría mucho sentido"* |
| **Seed vs. elección** | *"lo podemos ver después"* → **parkeado**. Mientras tanto: el mundo sale de la seed, tu identidad la elegís vos |
| **La plata** | No es gastable (`CONCEPTO` §11: no es un manager). Es métrica de la tarjeta final, gate de eventos y peso en las ofertas |
| **El mundo del mercado** (2026-09-02) | **Rosters NPC reales**, no un modelo de demanda liviano. Cada org de tier 1 y de tu tier 2 tiene 5 jugadores con edad, nivel, contrato y carrera propia: envejecen, se retiran, se mueven. Es lo que hace real al mercado, al vestuario y al retiro de una sola vez |
| **Orden mercado / retiro** (2026-09-02) | **El mercado primero.** La fase 10 define el retiro como emergente ("te retirás cuando el mercado deja de llamarte"); con el mercado de hoy eso vuelve a ser un dado. Se hace bien a la primera o se hace dos veces |
| **La escalera** (2026-09-02) | **Sí a reescribirla.** El ascenso deja de sortearse: subís porque un club tiene un hueco en tu rol y te puede pagar. Aparece el descenso de tier 1 (D16) y los cupos de import y la residencia empiezan a existir (D29). Se asume el corrimiento del stream de RNG (D35) |
| **El nivel manda** (2026-10-01) | *"no es tanto de probabilidades a veces sino de nivel, por eso te digo que a veces el juego se siente un rng clicker"* · *"más de dos mundiales que no sea tan imposible porque si ya ganaste uno es porque sos muy bueno"* → **el resultado lo decide tu nivel; las metas de población salen de cuánta gente llega a cada nivel, nunca de agregar dado** (FASE K) |
| **Ritmo, partido, puntaje y dificultad** (2026-10-01) | D-A (*"no"* al modo corto) · D-B (dónde te frena el juego) · D-C (*"dale"* al puntaje + desafío diario) · D-D (buenas carreras accesibles, el nuevo Faker difícil pero no imposible, Mundial ≥ 7% según la región, no llegar a pro ~20%) — textuales en §K.1 |

---

## Principio rector: "que todo tenga un sentido"

Tres reglas duras. Cualquier feature que las rompa se rechaza aunque funcione.

1. **Nada aparece sin que el contexto lo justifique.** Todo contenido declara `contexto`. Un scout
   no te llama en Platino. Un psicólogo del club no existe si no tenés club.
2. **Nada te para si no hay nada en juego.** El motor solo interrumpe cuando la decisión cambia
   algo. Si hay una opción obvia, la toma solo y te lo cuenta en una línea. **La interrupción es un
   recurso escaso, igual que tu atención.**
3. **Todo número que ves es legible y todo resultado tiene una frase.** Si el juego dice `Hype +8`
   sin decir qué pasó, el sistema falló.

---

# FASE 0 — Higiene ✅

Cerrada en `cac4af2`. El detalle completo con los números medidos está en `PROGRESO.md`.
Resumen de lo que quedó construido y que las fases siguientes usan:

- **`src/core/formato.js`** — `entero` · `delta` · `deltaCorto` · `lp` · `sobre100` ·
  `porcentaje` · `plata` · `lista`. Los stats siguen siendo float en el estado; se redondea al
  producir texto.
- **Ejes `ladder` y `rol`** en el modelo de contexto. `bandaDeLadder(ranked, servidor)` en
  `ranked.js` (bajo/medio/alto/apice/elite), puro y sin RNG.
- **Marca `con_vestuario`** — hay compañeros con nombre (falso en el split del fichaje).
- **`option.descripcion`** y **`outcome.texto`** en el esquema de contenido.
- **`crearLog(type, message, extra)`** — `extra` lleva `{ titulo, cuerpo, efectos }` para que la
  UI les dé jerarquía tipográfica.
- **26 checks**, cinco nuevos.

---

# FASE 1 — Identidad: elegís rol y mains, y eso importa

**Objetivo:** que la primera pantalla sea una decisión y que esa decisión gatee contenido durante
toda la carrera.

## 1.1 — `src/data/champions.json`: de 10 a ~18 por rol

Elegir 3 de 10 es flaco. Campo nuevo:

```json
{ "name": "...", "role": "jungla", "tags": ["engage", "tanque"], "debut": false }
```

Los `debut: true` **no** aparecen en la elección inicial: entran con un parche a mitad de carrera.
Es el evento del campeón nuevo que pidió el usuario, con campeones reales y sin inventar nada.
Reservar 2-3 por rol.

Los tags salen del vocabulario cerrado de `src/data/meta-tags.js` (`ARQUETIPOS`): hoy son
`bruiser, early_game, tanque, engage, splitpush, escalado, mago_control, asesino, enchanter`.
Un check ya exige que todo tag exista ahí.

## 1.2 — La elección entra al motor

```js
createInitialState(seed, rng, eleccion?)        // eleccion = { handle?, rol?, campeones? }
generarMundo(rng, edadInicial, eleccion?)
```

Si `eleccion` viene `undefined`, sortea como hoy → **`simulate.js` y `validate.js` no cambian una
línea**. `generarMundo` usa `eleccion.rol` en lugar de `pick(IDS_ROL, rng)` y `eleccion.campeones`
en lugar de `generarPoolInicial`.

> **Trampa T1:** corre el stream de RNG y ninguna seed vieja reproduce su carrera. Aceptable, se
> documenta en `PROGRESO.md`. El determinismo intra-versión queda intacto.

## 1.3 — El meta con nombre y apellido

Hoy `meta.weights` es un vector sobre 9 arquetipos y el log dice *"el meta se mueve hacia los
magos de control"*. El usuario lo describe por campeón. En `src/core/ajusteMeta.js`, que ya tiene
`afinidadDeCampeon`:

```js
campeonesEnMeta(weights, rol, cantidad)   // -> ["Sejuani", "Nidalee", "Jarvan IV"]
campeonesMuertos(pool, weights)           // los tuyos que quedaron abajo del corte
```

Tokens nuevos en `plantillas.js`: `{metaTop}`, `{metaSegundo}`, `{mainMuerto}`.
El log de `meta.js` pasa a: *"Parche 14: Sejuani y Nidalee se comieron la jungla. Tu Lee Sin quedó
a contramano."*

> **Prerrequisito duro de la fase 4:** sin saber qué campeones están en meta no se puede modelar
> qué quema el rival en la serie.

## 1.4 — Marcas derivadas del pool

En `calcularMarcas` (`core/contexto.js`), agregar a `MARCAS` y derivar:

| marca | condición |
|---|---|
| `pool_angosto` | `championPool.length <= 3` |
| `pool_ancho` | `championPool.length >= 6` |
| `pool_en_meta` | `meta.ajuste >= 62` |
| `pool_fuera_meta` | `meta.ajuste <= 38` |
| `main_muerto` | tu campeón de mayor maestría cayó fuera del corte del meta |
| `campeon_nuevo` | salió un `debut` este split y todavía no lo tenés |

Umbrales a `BALANCE.campeones` (regla 3: sin números mágicos).

## 1.5 — Tipo de efecto `pool`

Caso nuevo en `aplicarEfecto` (`systems/events.js`), al lado de `ladder` y `push`:

```json
{ "type": "pool", "accion": "aprender", "criterio": "meta|debut|tag", "min": 1, "max": 1 }
{ "type": "pool", "accion": "maestria", "objetivo": "principal|jugado|nuevo", "min": 6, "max": 12 }
{ "type": "pool", "accion": "olvidar",  "objetivo": "peor" }
```

**Mover `aprenderCampeones` y `pulirCampeon` de `practica.js` a `src/core/pool.js`** para que las
compartan `practica.js`, `events.js` y la fase 4. `etiquetaCampo` necesita una entrada para
`player.championPool` o el check de etiquetas falla.

## 1.6 — Pantalla de inicio

Tres pasos en `index.html`:

1. **Handle** (opcional; vacío = lo sortea la seed).
2. **Rol** — 5 cartas con identidad real: qué pondera (`ROLES[].pesos` ya existe), cuánta prensa
   genera (`ROLES[].visibilidad` ya existe) y una línea de tono.
3. **Tus 3 mains** — el roster del rol con los tags visibles.

La tensión que hay que hacer legible: **ancho aguanta el sacudón de meta y sobrevive al Fearless;
angosto rinde más mientras el meta te acompaña.** Es real desde la fase 4.

## 1.7 — Contenido de identidad

- **≥3 eventos por rol** (15 en total), gateados por el eje `rol`.
- **≥6 eventos de pool** gateados por las marcas de 1.4: el campeón nuevo que sale a dos semanas
  del partido, el main que se murió con el parche, el coach que te pide ampliar.
- **La cuota coreana de soloQ** — dato real de `CONCEPTO` §12.5, prometido en `CONCEPTO` §7 y nunca
  implementado: Diamante 80 partidas/**5 campeones** · Máster 65/**8** · GM 50/**15**. El requisito
  de amplitud **sube con el rango** y empuja contra `sesgoMaestriaEnPick`, que premia
  especializarse.

## Checks de la fase 1

```
Cada rol tiene ≥3 eventos alcanzables que ningún otro rol ve
En 300 carreras, `main_muerto` aparece en ≥40% de las que pasan de 20 splits
   (si el meta nunca te mata un main, el sistema de pool es decorativo)
El pool elegido sobrevive: ningún efecto `pool` deja el championPool en 0
`campeonesEnMeta` devuelve nombres distintos en parches distintos
```

## Verificación end-to-end

Arrancar tres carreras eligiendo jungla / mid / support y confirmar que los eventos que salen son
distintos. Ver el meta nombrado por campeón y un main muriéndose con un parche.

---

# FASE 2 — Que las decisiones pesen

## 2.1 — Pesos dinámicos (la promesa incumplida de `CONCEPTO` §8)

`resolverOpcion` (`systems/events.js`) hace `weightedPick(opcion.outcomes, out => out.weight)`:
**estático**. `CONCEPTO` §8 dice *"La opción obviamente correcta sale mal a veces. **Tus stats
corren esos pesos, no los eliminan.**"* Nunca se implementó.

```json
{
  "weight": 6,
  "modificadores": [
    { "field": "player.stats.mecanica", "referencia": 60, "factor": 0.03 },
    { "field": "career.jerarquia",      "referencia": 50, "factor": 0.02 }
  ]
}
```

`pesoEfectivo = weight * (1 + Σ (valor − referencia) × factor)`, con **piso** para que ningún
outcome llegue a 0 (*corre los pesos, no los elimina*). El piso va a `BALANCE`.

> **Sin esto la fase 4 no puede existir:** el draft del mapa 5 sería una moneda en vez de una
> apuesta informada.

El check del esquema de eventos tiene que validar que todo `field` de `modificadores` exista en
`createInitialState` (misma regla que `conditions`, trampa T4).

## 2.2 — Densidad emergente, no densidad fija

Hoy: 80.6 decisiones/carrera, 2.18 por split, todas de la misma forma. En la versión de 25-40 min
no alcanza con "más decisiones": una carrera tipo Faker son ~50 splits y a densidad plana sería
agotadora.

**La regla: novedad = densidad.** `src/core/presupuesto.js` (nuevo) calcula cuánto puede gastar el
split según cuánto cambió respecto del anterior.

| tipo de split | qué pasó | decisiones |
|---|---|---|
| **denso** | debutás, cambiás de equipo/tier/región, playoffs, se te muere un main, vence el contrato, lesión | 3-6 |
| **normal** | temporada regular, mismo equipo | 1-2 |
| **comprimido** | mismo equipo, media tabla, nada cambió | 0-1 + un párrafo |

- El contenido declara `bisagra: true`; una bisagra **siempre** pasa, una normal compite.
- Subir `maxDecisionesPorSplit` de 8 a **16** — con serie Bo5 + mercado + rutina + evento + cierre
  ya se pasa (trampa T9). Conservar el tope como red anti-loop.
- Los splits comprimidos **no pueden quedar mudos**: hoy escupen *"Un split tranquilo, sin eventos
  destacados"*. Pasan a un párrafo compuesto de el parche (con nombres de campeones), cómo te fue,
  y una línea de vestuario o de ladder.

> **Consecuencia buscada, hay que decirla:** la duración de la partida es emergente igual que la
> carrera. Un `no_llego` son 5 minutos. Una carrera mediana, 25-35. Una de leyenda, 50-60 — y eso
> **se gana**, es la recompensa.

## Checks de la fase 2

```
Con el stat en el percentil 10 vs. el 90 (2000 resoluciones cada uno), la distribución
   de outcomes cambia ≥15 puntos porcentuales y NINGÚN outcome baja de 5%
tipoDeSplit clasifica denso/comprimido correctamente (test directo, sin simular)
El chaining de un segundo evento usa tipoDeSplit de verdad, no una probabilidad fija
   (denso encadena ≥30 puntos porcentuales más seguido que comprimido)
Decisiones por split ∈ [0, 6]
Las carreras del percentil 90 de duración no superan 1.8× la mediana en decisiones POR SPLIT
   (las carreras largas son largas por durar más, no por ser más pesadas)
Ningún split queda sin ninguna línea de log
```

> **Corrección post-medición**: la mediana original apuntaba a `[70, 130]` decisiones por
> carrera. Medido en la fase 2 dio **46** — no es una regresión, es la consecuencia
> correcta de que los splits `comprimido` ahora encadenan casi nunca (12% contra el 40%
> parejo de antes). El `[70, 130]` es un objetivo del juego **terminado** (fases 3 a 7
> agregan mercado, series y retiro, que son fuentes de decisiones que hoy no existen):
> gatearlo en la fase 2 sería medirse contra trabajo que todavía no se hizo (trampa T6).
> El check de la fase 2 gatea la FORMA de la densidad (tope por split, ratio largo/mediano),
> no el volumen total, que se vuelve a medir en la fase 11.

---

# FASE 3 — La escalera competitiva: tier3 → tier2 → tier1

**Este es el que rompe la linealidad.** Riesgo medio.

## 3.1 — `src/data/leagues.json` reescrito

El archivo actual está **mal para 2026**: tiene LLA, PCS y VCS como tier-1. La LTA duró una sola
temporada (disuelta en septiembre 2025); LCS y CBLOL volvieron independientes; la LLA no volvió —
LATAM Norte quedó absorbida por LCS y LATAM Sur por CBLOL.

| Liga | Región | Equipos | Edad mín. | Servidor | Cupos int. |
|---|---|---|---|---|---|
| LCK | Corea | 10 | 17 | KR | 3 |
| LPL | China | 14 | 18 | CN | 3 |
| LEC | EMEA | 10 | **18** | EUW | 3 |
| LCS | NA + Centroamérica | 8 | 17 | NA | 3 |
| CBLOL | Brasil + LATAM Sur | 8 | 17 | BR | 2 |
| LCP | Asia-Pacífico | 8 | 17 | TW | 2 |

Rosters exactos en `CONCEPTO` §12.3. Esquema ampliado por liga: `edadMinima`, `cupoImports: 2`,
`minimoResidentes: 3`, `cuposInternacionales`, `desciendeA`,
`salario: { medianaUSD, mediaUSD, sigma, minimoUSD }`, y **`formatoPlayoffs`** (cuántos clasifican,
Bo3/Bo5 por ronda) que consume la fase 4.

**Tier 2 real:** NACL · 13 ERLs → EMEA Masters · Circuito Desafiante · LRN y LRS ·
LCK CL + LCK Academy Series (edad mín. **16**) · LDL.

El eje `region` de `contextos.js` tiene que perder `LATAM` cuando esto entre.

## 3.2 — `src/core/tier3.js` (nuevo)

Orgs inventadas por región: las tier-3 reales son efímeras y `CLAUDE.md` permite ligas reales pero
exige equipos inventados a este nivel. **Reusar `generarHandle`** de `core/mundo.js`.

## 3.3 — `src/systems/competitivo.js` (nuevo, después de `roster` en `ETAPAS_SPLIT`)

- En qué tier competís, ascensos y descensos, y **la oferta cuando cambiás de tier** (el mercado
  completo llega en la fase 8; el movimiento entre tiers ya es una decisión desde acá).
- **Brevedad forzada del tier 3** (pedido explícito): `probSalida` ~0.45 por split, con dos
  salidas — subís a tier 2, o el equipo se disuelve y volvés a `nivel: 'libre'`.
- **El año muerto:** LEC exige 18 desde 2024. Un europeo de 17 puede firmar pero no debutar →
  `career.nivelEfectivo` = academia + marca `espera_edad_minima`.

## 3.4 — Ajustes pendientes que entran acá

- `rendimiento.js`: `posicionParaInternacional: 1` está **mal** para 2026 → usar
  `liga.cuposInternacionales`. Distinguir **First Stand** (marzo) / **MSI** (junio) / **Worlds**
  (octubre, 19 equipos) por `contexto.ventana`.
- `core/mundo.js`: `regionOrigen` se sortea **uniforme entre 8 ligas** — 1 de cada 8 carreras nace
  en Corea. Pesar por tamaño de escena.
- Activar los momentos `espera_edad_minima`, `tier3_recien_llegado`, `tier3_probandose`,
  `tier2_rookie`, `tier2_titular` (borrar su `pendiente` en `data/contextos.js`).
- Las 6 rutinas de offseason están gateadas a `{ etapa: ['debut','profesional'] }`. Cuando existan
  los tiers, diferenciar (un bootcamp en Corea no te lo paga un tier 3) — **cuidando** que siempre
  quede al menos una `segura` y una `agresiva` en cada nivel, o el check de rutinas falla.
- Actualizar `CONCEPTO.md` §2 y §10: la carrera de ejemplo usa LAS/LLA, que ya no existen.

## Checks de la fase 3

```
Mediana de permanencia en tier 3 ≤ 2 splits, p90 ≤ 4
Un europeo fichado a los 17 vive el año muerto (marca espera_edad_minima observada)
Los 5 momentos del paso aparecen en cobertura.js
Nadie clasifica a un internacional por encima de liga.cuposInternacionales
```

---

# FASE 4 — Competición jugable: series Bo5, Fearless, draft y minijuegos

Es el corazón de la versión de 25-40 min y la respuesta a *"eso del draft en los playoffs no sé
cómo lo vas a hacer"*.

## 4.1 — Qué NO es

- **No es un manager.** No armás el draft de los 5: elegís **tu** pick (`CONCEPTO` §11).
- **No simula jugada por jugada.** Cada mapa se resuelve con `calcularRendimiento`
  (`systems/rendimiento.js`), evaluada por mapa en vez de por split. Se **reusa**, no se reescribe.
- **No drafteás cada partida.** El motor elige solo cuando la elección es obvia.

## 4.2 — La serie

Temporada regular: igual que hoy, una tirada por split. Los playoffs son otra cosa. Al clasificar
se crea `state.serie`, **inicializado como objeto completo de ceros en `createInitialState`**
(trampa T4):

```js
serie: {
  ronda: 'cuartos'|'semi'|'final'|'internacional',
  rival: { org, fuerza },
  formato: 5,              // sale de liga.formatoPlayoffs
  marcador: [0, 0],
  mapas: [],
  quemados: []             // Fearless: tuyos Y del rival, acumulados en la serie
}
```

**Fearless Draft es estándar en todas las tier-1 desde 2025**: cada campeón elegido queda bloqueado
para ambos equipos el resto de la serie. En el mapa 5 puede haber **hasta 40 campeones quemados**.
MSI 2025 vio **109 campeones únicos en 80 juegos**; Faker jugó **14 distintos** en Worlds 2025.

## 4.3 — Cuándo el motor decide y cuándo te para

Por mapa, `disponibles = pool − quemados`.

**Elige solo** (log de una línea) si hay ≥2 disponibles y uno domina claramente por
`deseoPorCampeon` (maestría × afinidad al meta), que **ya existe** en `systems/campeones.js`.

**Te para** si:
- quedan **≤2** disponibles del pool, o
- el mejor disponible está **fuera del meta** y hay una alternativa fuera del pool, o
- es el **mapa decisivo** (mapa 5, o el que cierra la serie).

Así la decisión aparece **exactamente cuando el pool angosto duele**, que es la promesa de
`CONCEPTO` §7: *"la razón por la que el draft fearless del mapa 5 importa: castiga directamente a
los pools angostos."*

## 4.4 — Ejemplo trabajado

```
SEMIFINAL — vs paiN Gaming (Bo5)
Tu pool:  Lee Sin (78) · Wukong (64) · Elise (71) · Sejuani (41, aprendida hace 2 splits)
Parche 14: Sejuani ▲▲ · Nidalee ▲ · Jarvan ▲ · Lee Sin ▼

Mapa 1  el motor elige Elise (mejor cruce maestría × meta). Ganan.        1-0
Mapa 2  el motor elige Sejuani. Pierden.                                   1-1
Mapa 3  el motor elige Lee Sin. Ganan.                                     2-1
Mapa 4  te queda Wukong y nada más del pool. El motor NO decide:

   ┌─ MAPA 4 · 2-1 arriba · se te quemó el pool ─────────────────────────┐
   │  A) Wukong.  Lo tenés, no está en meta.        maestría 64 · meta 38 │
   │  B) Vi.      La jugaste en scrims, nunca en oficial. maestría 22·71  │
   │  C) Pedirle el pick al coach y que el equipo se acomode a vos.       │
   │     (solo con jerarquía ≥60)                  +rendimiento −sinergia │
   │  D) Cederle el pick a {jungla} y jugar de segunda opción.            │
   │     (solo con relación ≥70 — necesita la fase 10)  −tuyo +del equipo │
   └──────────────────────────────────────────────────────────────────────┘
```

**Las opciones se generan del estado, no de un JSON.** Cada una lleva `modificadores` (fase 2.1)
sobre maestría real, ajuste al meta, jerarquía y sinergia. Con un pool de 8, este mapa lo resolvía
el motor solo y no te enterabas.

## 4.5 — El rival quema el meta primero

El rival no sortea al azar: quema campeones tomados de `campeonesEnMeta` (fase 1.3). Propiedad
emergente y realista: **si tu pool es todo meta picks, se te quema rápido y llegás al mapa 5
desnudo; si tenés comfort picks off-meta, sobrevivís.** Sale gratis del modelo.

Si el pool queda **completamente** quemado, te toca un campeón fuera del pool con maestría mínima.
Ese es el castigo del pool angosto, y `CONCEPTO` §7 ya lo prometía.

## 4.6 — Los minijuegos

Cinco reglas, todas derivadas de *"que tampoco todo sea un gambling a los minijuegos"*:

1. **Corren el resultado, no lo deciden.** Mueven el rendimiento del mapa un ±X%. Nunca ganan ni
   pierden una serie solos, y **nunca terminan una carrera**.
2. **Los stats corren sus odds.** Mecánica alta = ventana más grande. Entrenar sigue importando;
   el minijuego decide qué hacés con lo que entrenaste.
3. **Máximo 1 por serie**, y solo en semis, finales e internacionales.
4. **Solo disparan en mapas cerrados** — cuando el mapa se resuelve con diferencia chica. Un 3-0
   no tiene minijuego: no lo merece.
5. **Determinismo sin sacrificar interacción.** El motor **no implementa** el minijuego: recibe un
   `resultado` 0-1 como respuesta. La UI lo juega de verdad; Node lo simula en `resolverAuto` con
   `gauss` corrido por los stats. Así el navegador es interactivo, `simulate.js` puede medir el
   impacto, y el check de determinismo sigue pasando. **La seed reproduce el mundo, no tu
   habilidad.**

| id | dónde | qué se decide |
|---|---|---|
| `draft_decisivo` | mapa 5 / mapa que cierra | 4.4 |
| `robar_baron` | mapa cerrado, jungla | Esperar / smitear ya / el flash-smite. Ventana corrida por mecánica |
| `la_llamada` | mapa cerrado, teamfight final | La llamada bajo reloj. Corrida por shotcalling **y jerarquía**: con jerarquía baja **no te siguen** aunque tengas razón |
| `rueda_de_prensa` | post-título o post-derrota grande | Tono. Mueve hype y relación con el vestuario |
| `bootcamp` | antes de un internacional | Qué scrimear bajo presión |
| `la_prueba` | amateur: tryout con un tier 3 | El único de la etapa amateur. Es la bisagra de esa etapa |

Archivos: `src/systems/serie.js` + `src/data/minijuegos/*.json`. `presentacion: 'minijuego'` en la
decisión — **no** un `tipo` nuevo: la UI la dresa distinto, el motor ve el mismo contrato. Los
pasos múltiples usan el encadenado que el pipeline **ya soporta** (`resolver` devuelve otra
`decision`).

## Checks de la fase 4

```
Dos poblaciones de 1000 carreras — una que SIEMPRE falla los minijuegos y otra que
   SIEMPRE acierta — difieren en puntaje final entre 8% y 25%
   (abajo de 8% son decorativos; arriba de 25% el juego es gambling)
Mediana de decisiones de draft por serie ∈ [0, 2]
El pool ancho (≥6) llega al mapa 5 con opciones el ≥80% de las veces,
   contra ≤25% del pool angosto (≤3)
Ninguna serie deja el pipeline con una decisión colgada
Ningún minijuego puede setear `terminado`
```

> **Corrección post-medición** (mismo criterio que la fase 2 con el volumen de decisiones): el
> 80%/25% de arriba era una estimación previa a tener el mecanismo de quema real. Medido:
> pool angosto (3) da **0%** — es matemático, no de balance: un Bo5 que llega al mapa 5 ya jugó
> 4 mapas antes, y Fearless exige 4 campeones **distintos** solo para llegar ahí, imposible con
> un pool de 3. Pool ancho (6) da **63-64%**. El check quedó en ≥55%/≤10% (con un piso extra de
> 40 puntos de brecha entre los dos), que es lo que la implementación real sostiene con margen.
> La comparación cualitativa de 4.5 — "el pool ancho aguanta, el angosto no" — se sostiene con
> muchísimo más contraste que el que se había estimado a ciegas.

`CONCEPTO.md` §5 y §11 hay que actualizarlos: §5 describe los playoffs sin serie y §11 dice que los
minijuegos "aparecen solo en momentos bisagra" sin definir la cuota.

---

# FASE 5 — La temporada existe: la fecha que importa

## 5.0 — El problema, medido

Se corrió el motor 300-400 carreras (semillas 1..N, estrategia `equilibrado`) para no opinar de
memoria sobre por qué el juego "se siente como apretar botones". Los números:

```
Splits en fase profesional con una serie de playoffs jugable .... 21,0%
   (el otro 79% resuelve la temporada regular con UNA tirada y una línea de log)
Carreras que ven al menos un draft en toda la carrera ............ 33,5%
Carreras que ven al menos un minijuego en toda la carrera ........ 29,8%
Líneas de log en un split profesional sin playoffs ................ 5-6
   (de las cuales 1-2 son decisiones; el resto son recibos numéricos)
```

La causa es estructural, no de contenido. `posicionEnLaLiga` en `systems/rendimiento.js` hace
`rivales.filter(org => gauss(org.fuerza, 13, rng) > fuerza).length` y escupe *"RED Canids Kalunga
terminó 1º de 8 en CBLOL"*. No hay fechas, ni rival con nombre, ni marcador, ni tabla. Y en
`systems/registro.js`, `rendimiento` y `serie` corren **antes** que `events`: cuando el evento
aparece en pantalla, el split ya se jugó entero. Por diseño no puede existir un *"se viene tal
partido"* — la decisión es un recibo de algo que ya pasó, nunca una apuesta sobre algo que va a
pasar. Esa es la referencia directa que pidió el usuario contra El Ídolo del Potrero y Copero: en
esos juegos el partido se vive antes de saber el resultado, acá se narra después.

La solución no es simular jugada por jugada — `CONCEPTO.md` §11 lo prohíbe explícitamente y con
razón, y no hace falta para resolver esto. La solución es **simular la temporada regular completa
en silencio, con una tabla de posiciones de verdad por debajo, y hacer que el jugador juegue solo
los 2 o 3 partidos de esa temporada que tienen algo en juego.** La temporada pasa entera; el
jugador cae adentro de los momentos que importan. Es, literalmente, cómo funciona la referencia:
nadie juega los 38 partidos de una liga de fútbol en Potrero Fútbol, juega los que definen algo.

## 5.1 — `src/core/temporada.js` (nuevo, puro, sin RNG en el calendario)

Sigue el mismo patrón que `core/serie.js`: funciones puras, sin tocar el DOM, testeables sin
simular una carrera entera.

- **`generarCalendario(state)`** — un round-robin simple contra cada otra org de
  `ligaOZonaDeCarrera(state)` (`core/competicion.js`, que ya resuelve tier 1, tier 2 y tier 3 con
  la misma forma). Las ligas tienen 8 a 10 orgs, así que salen 7 a 9 fechas por split. Cada fecha:
  `{ jornada, rival, fuerzaRival, local }`. **No consume `rng`**: el calendario es determinista
  dado el estado, así se puede enumerar y testear sin tirar un dado.
- **`resolverFecha(fuerzaPropia, fuerzaRival, rng)`** — booleano. Reusa exactamente la matemática
  de `finalizarMapa` en `systems/serie.js`: `gauss(fuerzaPropia, ruidoFecha) > gauss(fuerzaRival,
  ruidoRivalFecha)`. **No se reescribe la fórmula de rendimiento**: `calcularRendimiento` y
  `fuerzaDelEquipo` de `systems/rendimiento.js` ya están exportadas justamente para reusarse así
  (el comentario en ese archivo lo dice: la fase 4 ya las reusa mapa a mapa dentro de una serie).
- **`simularResto(liga, calendario, rng)`** — resuelve los partidos entre los OTROS equipos, para
  que la tabla no sea inventada. Con 10 orgs son 45 partidos por split, una tirada cada uno:
  trivial en costo.
- **`tablaDePosiciones(resultados)`** — array ordenado `{ org, ganados, perdidos, racha,
  diferencia }`. Esta es la estructura que la fase 11 va a pintar como tabla de verdad.
- **`fechasQueImportan(state, calendario, tabla, rng)`** — elige 2 o 3 índices del calendario. Es
  el corazón de la fase y **no es aleatorio**: cada fecha se puntúa por qué tiene en juego, y se
  eligen las de puntaje más alto (desempate por `rng`).

  | `stakes` | Cuándo dispara |
  |---|---|
  | `clasico` | el rival está en `career.orgs` (jugaste ahí antes) o te dejó libre |
  | `puntero` | el rival va 1º de la tabla |
  | `define_clasificacion` | es la última fecha del split y estás en el borde del cupo de playoffs |
  | `revancha` | el rival te eliminó en la última serie de playoffs que jugaste |
  | `presion` | venís de dos o más derrotas seguidas en este split |
  | `rival_de_generacion` | en el roster rival juega uno de los 5 de `mundo.rivales` |
  | `parejo` | fallback: `|fuerzaRival − fuerzaPropia|` mínimo — "se define por detalles" |

  `rival_de_generacion` es la primera vez que los cinco rivales generados desde la seed **hacen
  algo**: hoy se generan en `core/mundo.js` y no corren su carrera (deuda **D8**, que sigue
  abierta y se resuelve recién en la fase 11). Esto no cierra D8 — no les da una carrera propia —
  pero les da su primer uso real: aparecen con nombre en una fecha marcada.

## 5.2 — `src/systems/temporada.js` (nuevo sistema)

Se agrega **una línea** al registro de `ETAPAS_SPLIT` (regla invariable 6), justo antes de
`rendimiento`:

```
contexto, edadInicio, meta, roster, competitivo, campeones, secundario, amateur,
temporada,     ← NUEVO: juega el calendario y pausa en las fechas marcadas
rendimiento,   ← ahora SOLO aplica consecuencias, leyendo career.temporada.posicion
serie, events, atributos, practica, edadCierre
```

`rendimiento.js` se parte en dos: `posicionEnLaLiga` se borra (la posición ahora sale de la
tabla), y `consecuencias` **se queda exactamente igual**, salvo que lee `state.career.temporada`
en vez de calcular la posición ella misma. Esto **no toca la fórmula de rendimiento, ni la de
jerarquía, ni la de hype** — solo cambia de dónde viene el número de posición. Es deliberado: esas
fórmulas ya están calibradas y no se retunean en el mismo commit que cambia la estructura (regla
de proceso 2).

El flujo de `aplicar`:

1. Si no hay equipo o `phase !== 'profesional'`, **early return sin tocar `rng`** — mitigación de
   la trampa **T1**: todo sistema que consume RNG cuando no le toca corre el stream de todo lo que
   viene después.
2. Genera el calendario, calcula `fuerzaPropia` una vez con `calcularRendimiento` +
   `fuerzaDelEquipo`, y elige las 2-3 fechas marcadas con `fechasQueImportan`.
3. Juega las fechas NO marcadas en silencio, acumulando W/L contra la tabla simulada del resto de
   la liga. **No emite un log por fecha** — nueve líneas de *"Fecha 4 vs FURIA: ganan"* es
   exactamente la planilla que esta fase existe para evitar. Emite una sola línea de resumen al
   cierre del tramo silencioso.
4. Al llegar a una fecha marcada, **pausa** y devuelve una decisión. El estado del calendario en
   curso vive en `state.career.temporada` — **objeto completo de ceros al inicializar en
   `createInitialState`, nunca `null`** (trampa T4) — así `resolverDecision` reanuda exactamente
   donde quedó, igual que ya hace `serie.js`.

## 5.3 — La fecha marcada: qué ve el jugador

Tres beats, en este orden, y el orden es el punto — primero se apuesta, después se sabe:

**1. El draft corto.** Solo si hay equipo y el pool tiene más de dos campeones. Se elige entre las
opciones del pool, con la maestría al lado y — desde la fase 6 — la tier list del meta al lado.
Reusa `decisionDeDraft` y `disponiblesDelPool` de `core/serie.js`, con la regla ya desambiguada en
la fase 4 (4.3): *"0 disponibles → comodín automático; 1 → no hay elección real; exactamente 2 →
siempre para; 3+ → el motor elige solo salvo falta de dominancia clara"*. Si la jerarquía es baja,
a veces no se lo dan: se reusa la probabilidad `draftBase + jerarquia × draftPorJerarquia` que ya
vive en `campeonDelSplit` (`systems/campeones.js`).

**2. El momento.** Una situación del pool de contenido nuevo en `src/data/events/partido/*.json`,
gateada por `stakes`, por rol, por el marcador de la temporada y por el eje `ventana`. De 2 a 4
opciones. Y acá está el cambio que hace que toda la fase valga la pena:

> **Un tipo de efecto nuevo, `type: 'partido'`, mueve el resultado de ESE partido, no un stat
> abstracto.** Se agrega en `aplicarEfecto` (`systems/events.js`) al lado de `ladder`, `pool` y
> `push`, con `min`/`max` en rango como manda la regla invariable 7:
>
> ```json
> { "type": "partido", "min": -0.18, "max": 0.22 }
> ```
>
> El valor tirado se suma como fracción a `fuerzaPropia` antes de resolver la fecha con
> `resolverFecha`. Hoy elegir "ir a matar al jungla enemigo" da `Mentalidad -2, Hype +3` sobre un
> partido que ya estaba resuelto. Con esto, elegir mueve si se gana o se pierde esa fecha en
> concreto, y se ve en la línea inmediata siguiente. Esa es la diferencia entre un recibo y una
> apuesta.

**3. El resultado, inmediato.** *"Ganan. Quedan 3º de 8, a un partido del segundo."* Con la tabla
actualizada por debajo (la fase 11 la va a pintar; hasta entonces es una línea de log de tipo
`temporada`).

## 5.4 — Contenido nuevo de la fase

`src/data/events/partido/` con cuatro archivos, ~24 eventos y ~55 opciones. **Todos declaran
`stakes` y `ventana`** — el eje `ventana` (pretemporada/regular/playoffs) existe en
`core/contexto.js` desde el paso 7 del proyecto y hoy **cero de los 44 eventos del catálogo lo
usan**, que es parte de por qué el contenido existente se siente flotando fuera del calendario.

- **`presion.json`** (~6) — el partido que se juega con algo colgando: *"si pierden hoy quedan
  afuera de playoffs"*, *"el coach dijo en la previa que este es el partido de la temporada"*.
- **`clasico.json`** (~6) — contra el ex equipo, contra el que dejó libre al jugador, contra el
  equipo del rival de generación. Usan tokens de compañero/rival y por lo tanto exigen la marca
  `con_vestuario` (el check estático de la fase 0 ya la verifica).
- **`dentro_del_mapa.json`** (~8) — el momento adentro del partido, por rol. Acá se **mudan y se
  reescriben** las quince situaciones de rol que hoy viven en `data/events/rol/*.json` flotando
  sin partido — *"el jungla enemigo está solo"*, *"ves la jugada y nadie te sigue"*. La misma
  situación, pero ahora con un marcador, un rival con nombre y un resultado que cambia según lo
  que se elige.
- **`postpartido.json`** (~4) — la reacción inmediata: prensa, vestuario, el clip que se hizo
  viral. Estos sí mueven stats y no el resultado, porque el partido ya terminó.

## 5.5 — Riesgos y trampas conocidas

- **T1, desplazamiento del stream de RNG.** Este cambio corre el stream: **ninguna seed reproduce
  la carrera vieja.** Es inevitable con un cambio de esta forma y hay que decirlo en `PROGRESO.md`
  sin maquillarlo, no descubrirlo después. El early return de 5.2.1 limita el daño a las carreras
  que llegan a profesional.
- **T2, el contexto se calcula en vivo.** Las fechas marcadas gatean contenido por `ventana`, así
  que tienen que llamar a `calcularContexto(state, { ventana: '...' })` y nunca leer el caché
  `state.contexto`. Este bug ya se cometió una vez en el proyecto y movió agregados sin motivo
  aparente.
- **T9 y el techo de decisiones.** `maxDecisionesPorSplit` está en 60 y el máximo real medido es
  19. Tres fechas marcadas suman como mucho 6 decisiones más — no hace falta tocar el tope, pero
  hay que medirlo y reportarlo.
- **La inundación de logs es el riesgo real de diseño de esta fase, no un detalle.** Ya está
  medido: una serie de playoffs sola escupe **42 líneas seguidas** sin una sola decisión (traza de
  seed 1, split 11). Si las fechas NO marcadas emiten un log cada una, el split pasa de 6 líneas a
  50 y el juego se siente **más** a planilla, no menos. El resumen comprimido de 5.2.3 no es
  cosmética: es un requisito de la fase, no un detalle de UI.

## Checks de la fase 5

Recordando la regla de proceso 7: **al escribir un check nuevo, verificar que falla cuando debe**
(la trampa T5 ya costó dos pasos de falsa confianza, porque `undefined <= 0.5` es `false` y el
check pasaba siempre sin medir nada).

```
La tabla cierra: en cada split, Σ ganados === Σ perdidos sobre toda la liga
Todo equipo de la liga juega la misma cantidad de fechas que el jugador
La posición derivada de la tabla coincide con career.posicion en el 100% de los splits
El jugador ve entre 2 y 3 fechas marcadas por split competitivo (medido poblacionalmente)
Ninguna fecha marcada sale sin un `stakes` declarado ('parejo' cuenta como declarado)
El momento mueve el resultado: forzando el outcome de percentil 10 contra el de percentil 90,
   el % de victorias de la fecha cambia dentro de [8%, 25%] — la misma banda con la que se
   validó el impacto de los minijuegos en la fase 4
Cobertura: toda combinación alcanzable de stakes × rol tiene al menos un evento
```

## Números a medir al cerrar

| Métrica | Antes de esta fase | Objetivo |
|---|---|---|
| Splits profesionales con al menos un partido jugable | 21,0% | **≥ 90%** |
| Carreras que ven al menos un draft | 33,5% | **≥ 85%** |
| Líneas de log por split profesional sin playoffs | 5-6 | 8-12 |
| Decisiones por carrera (mediana) | 46 | 70-110 |
| `llegaronAPro` (equilibrado) | 40,4% | sin cambios (± 3 puntos) |
| Burnout (equilibrado) | 21,9% | sin cambios (± 3 puntos) |
| Crashes en `simulate.js 1500 90 todas` | 0 | 0 |

---

# FASE 6 — El meta con nombre

## 6.0 — El problema

El pedido del usuario, textual: *"que no sea un número de afinidad al meta, que quizás la season
diga meta de tanques, y que haya un 25% de chance de que cambie a mitad del split y un 60% de que
cambie para la otra season, que diga tu champion pool y aparezcan tus champs, y otro que diga
champions en el meta en tu rol y aparezcan los que están en el meta, y si coincide alguno tenés un
boost, y que haya eventos que cada tanto te dejen elegir practicar más un champ para ir cambiando
tu pool."*

Hoy `systems/meta.js` mueve nueve pesos flotantes con `gauss(0, 0.15)` por split (más un
`probSacudon: 0.07` que es lo mismo sin nombre), y `core/ajusteMeta.js` los promedia contra el
pool para dar un escalar 0-100 que multiplica el rendimiento entre 0,75x y 1,25x. El jugador ve
*"Ajuste al meta: 49/100"*. No hay régimen con nombre, no hay tier list, no hay forma de
anticipar el cambio ni de decidir nada al respecto, y como los pesos derivan poco, el mismo par de
campeones lidera muchos parches seguidos (en una traza real, el parche 11 y el parche 14 dicen
ambos *"se mueve despacio hacia Yone y Yasuo"*).

**Quedan fuera de alcance de esta fase**, por decisión explícita tomada con el usuario: los
rumores de parche (apostar a practicar un campeón antes de que el meta lo favorezca) y que el
meta mueva la fuerza de los otros equipos y la visibilidad por rol. Quedan anotados para una fase
de contenido futura si se los quiere retomar; no están en la deuda técnica porque nunca se
prometieron antes de este documento.

## 6.1 — `src/data/metas.json` (nuevo)

Nueve regímenes, definidos sobre los `ARQUETIPOS` que ya existen en `src/data/meta-tags.js`, para
no tener que retaguear los 16-18 campeones por rol de `champions.json`:

| id | Se anuncia como | Sube | Hunde |
|---|---|---|---|
| `tanques` | Meta de tanques | `tanque`, `engage` | `asesino`, `splitpush` |
| `hipercarry` | Meta de hipercarry | `escalado`, `enchanter` | `early_game`, `splitpush` |
| `asesinos` | Meta de asesinos | `asesino`, `early_game` | `escalado`, `enchanter` |
| `control` | Meta de magos de control | `mago_control`, `enchanter` | `splitpush`, `early_game` |
| `escalado` | Meta de partidas largas | `escalado`, `tanque` | `early_game`, `asesino` |
| `agresion` | Meta de agresión temprana | `early_game`, `asesino` | `escalado`, `mago_control` |
| `peleas` | Meta de peleas 5v5 | `engage`, `tanque`, `mago_control` | `splitpush` |
| `splitpush` | Meta de splitpush | `splitpush`, `bruiser` | `engage`, `enchanter` |
| `bruisers` | Meta de bruisers | `bruiser`, `early_game` | `mago_control`, `enchanter` |

Cada régimen trae además su texto de anuncio y una línea de "cómo se juega este parche", para que
el log tenga prosa y no una etiqueta.

El régimen **fija** los pesos en vez de derivarlos: lo que sube va a ~2,0, lo que hunde a ~0,6, el
resto a 1,0, más un `gauss(0, 0.12)` chico por split para que dos splits del mismo régimen no sean
idénticos. Los pesos siguen existiendo por debajo para que `afinidadDeCampeon` no cambie de
contrato: lo que cambia es quién los escribe.

## 6.2 — El cambio de régimen es una noticia, no una deriva

Los números son los que dio el usuario, sin redondear para el otro lado:

- **Al abrir cada season** (cada 3 splits, cuando `player.splitCount % BALANCE.edad.splitsPorEdad
  === 0`): `chance(0.60, rng)` de que el régimen cambie a otro sorteado. Log: *"Pretemporada. Se
  dio vuelta el juego: se viene el meta de asesinos. Los magos de control quedaron atrás."*
- **A mitad de split**: `chance(0.25, rng)` de un parche correctivo que puede virar el régimen. Log:
  *"Parche 14.9 a mitad de split: nerfean a los tanques. El meta vira a peleas 5v5."*
- **`BALANCE.meta.probSacudon: 0.07` se elimina.** El sacudón de hoy era exactamente este cambio de
  régimen, pero sin nombre y con una probabilidad tan baja que casi nunca se sentía.

## 6.3 — Los dos paneles y el boost por coincidencia

Lo que el usuario pidió, textual: un panel que diga tu champion pool con tus campeones, otro que
diga los campeones en meta de tu rol, y que si coincide alguno tengas un boost.

`src/core/regimen.js` (nuevo, puro):

- **`tierListDeRol(state)`** — los ~16 campeones del rol ordenados por `afinidadDeCampeon` contra
  los pesos del régimen vigente, cortados en **S / A / B / C**.
- **`coincidencias(pool, tierList)`** — qué campeones del pool caen en qué tier.
- **`boostDelPool(pool, tierList)`** — reemplaza a `ajusteAlMeta`. En vez de promediar afinidades
  (que es lo que hace que el resultado orbite siempre 50), suma sobre los campeones del pool
  `maestría/100 × pesoTier`, con **S = 1,0 · A = 0,6 · B = 0,25 · C = 0**, y lo mapea al rango
  [0,75x, 1,25x] que `CONCEPTO.md` §6 ya promete. Es legible de un vistazo: *"tengo uno de los tres
  en S con maestría 80"* en vez de un número de afinidad abstracto.

`state.meta` pasa a tener `regimen`, `tierList` (array `{ name, tier, enTuPool }`),
`coincidencias` y `tierListAnterior` — todos inicializados con un valor real en
`createInitialState`, nunca `null` (trampa T4). **La UI sigue siendo fase 11**: hasta entonces el
motor imprime los dos paneles como dos columnas de texto en un log de tipo `meta`. Esta fase deja
la estructura de datos lista y un log legible; la fase 11 la pinta como paneles de verdad.

## 6.4 — La tier list con memoria

`tierListAnterior` guarda la tier list del parche pasado. Cuando el régimen cambia, el log dice
los saltos — pero **solo los que tocan al jugador**: los campeones del pool más los tres primeros
del rol. Escupir dieciséis líneas de tier list cada parche es ruido, no información.

> *"Zed: B → S. Katarina: A → S. Tu Sylas: S → C."*

Ver al main propio caerse dos tiers de un parche al otro es el sistema entero en una línea, y es
lo que hoy no pasa porque el ajuste se mueve de 51 a 49 y nadie se entera.

## 6.5 — Los eventos de practicar

Pedido textual del usuario: *"que haya eventos que cada tanto te dejen elegir practicar más un
champ para ir cambiando tu pool."* Se agrega a `src/data/events/pool.json`:

- **`pool_a_cual_le_metes`** (nuevo) — *"¿A cuál le metés las próximas semanas?"* Las opciones se
  arman con dos campeones del pool y uno o dos del meta actual que todavía no se tienen. Usa el
  efecto `pool` que ya existe (`accion: 'maestria'` y `accion: 'aprender'` con `criterio`, en
  `systems/events.js`). Cooldown alto para que salga cada 5-6 splits: es una bisagra, no ambiente.
- **`pool_main_muerto`** se reescribe: hoy cuelga de `umbralMainMuerto`, una fracción continua de
  afinidad. Pasa a colgar del **salto de tier** (S/A → B/C), y el texto nombra el salto. La marca
  `main_muerto` en `core/contexto.js` se recalcula sobre el mismo criterio nuevo.
- Los otros cinco eventos de pool (`pool_estrechez`, `pool_identidad_diluida`,
  `pool_viento_a_favor`, `pool_contra_la_corriente`, `pool_campeon_nuevo`) se retextean para hablar
  de regímenes y tiers en vez de afinidad abstracta.

## Checks de la fase 6

```
El régimen cambia entre seasons en el 55-65% de las transiciones (banda alrededor
   del 0,60 declarado), medido sobre 1500 carreras
El parche correctivo de mitad de split dispara en el 20-30%
Toda carrera de más de 15 splits ve al menos tres regímenes distintos
La tier list cubre siempre todos los campeones del rol, sin repetidos ni faltantes
El boost está en [0,75, 1,25] y su distribución poblacional no se clava en el centro:
   p10 y p90 separados por al menos 0,20 (hoy el ajuste orbita 50, que es el defecto)
`pool_a_cual_le_metes` sale entre 3 y 8 veces por carrera de 30 splits
Determinismo: misma seed, dos corridas, huella idéntica
```

---

# FASE 7 — El prólogo se comprime y la repetición se rompe

## 7.1 — Comprimir la etapa amateur

Medido: la etapa amateur dura **15 splits de mediana**, de unos 30 totales — la mitad de la
partida — eligiendo entre 4 de 15 rutinas, y el **49%** de las carreras termina ahí con *"nadie
llamó"*. El juego que el usuario pidió está en la carrera profesional; el prólogo tiene que ser un
prólogo, no la mitad de la partida.

Las palancas están todas en `BALANCE.amateur` y ninguna es estructural: `lpPorBloque` (52),
`puntosParaRadar` (2800), `splitMinimoScouting` (3), `scoutingProbPorNivel` (`apice: 0.26,
challenger: 0.5, elite: 0.82`) y `scoutingSesgoEtario`.

**Esto va en su propio commit, separado de todo lo demás de esta fase.** Es la regla de proceso 2
del proyecto (*"nunca cambiar la estructura y retunear las constantes en el mismo commit"*), y es
también la razón por la que esta fase va al final del bloque nuevo y no al principio: calibrar el
amateur contra un ciclo de split que todavía se está terminando de mover (fases 5 y 6) es medir
ruido, no señal.

| Métrica | Antes de esta fase | Objetivo |
|---|---|---|
| Splits en etapa amateur (mediana) | 15 | **≤ 6** |
| `llegaronAPro` (equilibrado) | 40,4% | **65-75%** |
| `no_llego` | 49,0% | **≤ 25%** |
| Burnout (equilibrado) | 21,9% | ≤ 15% |
| Rutinas distintas elegidas por carrera | 7 | ≥ 4 (menos splits, menos rutinas, pero no cero) |

## 7.2 — Romper la repetición de eventos

`elegirEvento` (`systems/events.js`) usa pesos estáticos, y lo único que evita el repetido es el
`cooldown` (2 a 6 splits). Medido: el evento más repetido de una carrera sale **10 veces**
(mediana), hasta 15. Se le agrega **memoria**:

```
pesoConMemoria(state, evento) =
    evento.weight
  × 1 / (1 + vistos[evento.id] × BALANCE.eventos.fatigaPorVista)
  × (vistos[evento.id] ? 1 : BALANCE.eventos.bonusNovedad)
```

con `state.flags.eventosVistos` (objeto vacío al inicializar, nunca `null` — trampa T4),
`fatigaPorVista: 0.8` y `bonusNovedad: 2.5`. Son ~15 líneas de código y el objetivo es bajar la
mediana de repeticiones de 10 a ≤4 **sin escribir un solo evento nuevo** — el mejor retorno por
línea de todo este documento.

Dos arreglos puntuales más de la misma queja:

- **Los eventos de cierre de edad salen literalmente en orden** porque hay exactamente dos
  (`balance_de_temporada`, `cuentas_de_la_carrera`) para todas las edades. Se agregan cuatro más,
  gateados por banda de edad, para que haya baraja de verdad.
- **El eje `ventana` se enciende.** Cero de 44 eventos del catálogo original lo declaran. Se
  retrofitea el catálogo existente (además de todo el contenido nuevo de la fase 5, que ya lo
  declara desde que se escribió). Un evento de pretemporada no puede caer en medio de playoffs.

## 7.3 — Densidad: que un split no cierre con puro recibo

Medido: un split profesional sin playoffs son 5-6 líneas, de las cuales cuatro son recibos
numéricos (*"Split 13: mecánica +0, macro 54, mentalidad 99"*). Dos cambios:

- Los logs puramente numéricos (`split`, parte de `campeones`, parte de `practica`) pasan a llevar
  una marca `tecnico: true` en el `extra` de `crearLog`, para que la fase 11 los pueda esconder o
  achicar tipográficamente. No se borran: siguen siendo útiles para depurar y para `simulate.js`.
- `BALANCE.edad.probSegundaDecisionPorTipo` (`denso 0.85, normal 0.4, comprimido 0.12`) se
  recalibra contra el ciclo nuevo. Con las fechas marcadas de la fase 5 metiendo decisiones
  propias, el presupuesto de `core/presupuesto.js` cambia de forma y hay que volver a medirlo, no
  asumir que sigue igual.

## Checks de la fase 7

```
Repeticiones del evento más repetido por carrera: mediana ≤ 4, máximo ≤ 8
Eventos distintos vistos por carrera de 30 splits: ≥ 28
Ningún evento de categoría "de temporada" declara `ventana` vacía
Splits sin ninguna línea narrativa: 0 (ya se cumple hoy, no puede regresionar)
Fracción de splits sin evento < 25% en todos los contextos alcanzables (trampa T10,
   ya existe como check; verificar que sigue pasando con el gating nuevo)
```

---

# FASE 8 — LA FICHA

> **La fase más importante del documento. Todo lo demás la lee.**
> Sin `registro`, la fase 9 no puede valuarte, la 10 no puede narrarte y la 11 no puede compararte.

## 8.0 — Commits

Por la regla de proceso 2 (nunca estructura + tuning en el mismo commit):

| # | Commit | Contenido |
|---|---|---|
| 8a | `fase 8a: el registro acumula` | 8.1, 8.2, 8.4 (motor) + checks |
| 8b | `fase 8b: src/ui/ y la ficha permanente` | 8.3, 8.5, 8.6 (pantalla) |
| 8c | `fase 8c: calibrar arraigo` | solo constantes, después de medir 8a/8b |

## 8.1 — `state.career.registro` (nuevo)

Objeto que **solo crece**. Inicializado completo en
[createInitialState](src/core/state.js#L15) — nunca `null` (trampa T4):

```js
registro: {
  // --- Contadores de por vida ---
  splitsJugados: 0,
  splitsConEquipo: 0,
  fechasGanadas: 0,        // temporada regular (systems/temporada.js)
  fechasPerdidas: 0,
  mapasGanados: 0,         // series de playoffs (systems/serie.js)
  mapasPerdidos: 0,
  seriesGanadas: 0,
  seriesPerdidas: 0,
  dineroTotalUSD: 0,       // fase 9 lo alimenta; hasta entonces queda en 0

  // --- Picos (imagen 15: "93 MEDIA MÁX", "US$95,6M VALOR MÁS ALTO") ---
  picos: {
    nivel: 0, edadDelPicoDeNivel: 0,
    jerarquia: 0, arraigo: 0, hype: 0,
    valorMercadoUSD: 0, salarioMensualUSD: 0,
    rankedPuntos: 0
  },

  // --- La historia, org por org (imagen 15, "TU HISTORIA, CLUB POR CLUB") ---
  // Se abre una fila al firmar y se cierra al irse. La fila NUNCA se borra:
  // volver a la misma org abre una fila nueva (dos etapas, dos filas), que es
  // como lo cuenta la referencia.
  porOrg: [/* {
    org, liga, tier,
    desdeAnio, hastaAnio,          // null mientras sigue activa
    desdeSplit, hastaSplit,
    splits, fechasG, fechasP,
    jerarquiaMaxima, arraigoFinal, arraigoMaximo,
    titulos: [{ nombre, anio }],
    salarioMensualUSD,             // fase 9
    motivoDeSalida                 // 'transferencia'|'sin_renovacion'|'disolucion'|'ascenso'|'retiro'
  } */],

  // --- Trofeos de por vida, para agrupar "5× LCK 2030 2031 2033..." ---
  titulos: [/* { nombre, anio, org, liga } */],
  internacionales: [/* {
    torneo, anio, org, resultado,
    camino: [{ ronda, rival, marcador, ganado }]   // imagen 12: "EL CAMINO"
  } */],

  // --- Hitos narrativos con fecha, para que el contenido pueda citarlos ---
  momentos: [/* { tipo, anio, edad, org, texto } */]
}
```

**Regla dura nueva:** ningún sistema borra ni sobrescribe una entrada de `registro`. Solo `append`
e incremento monótono. Se verifica con un check estático sobre `src/`.

**Dónde escribe cada sistema** (una línea por sistema, sin sistemas nuevos):

| Sistema | Qué incrementa |
|---|---|
| [`systems/temporada.js`](src/systems/temporada.js) | `fechasGanadas` / `fechasPerdidas`, y las de la fila de org |
| [`systems/serie.js`](src/systems/serie.js) | `mapasGanados/Perdidos`, `seriesGanadas/Perdidas`, `internacionales[].camino` |
| [`systems/rendimiento.js`](src/systems/rendimiento.js) | `titulos[]` (hoy empuja un string a `career.hitos`, línea 112) |
| [`systems/roster.js`](src/systems/roster.js) | abre y cierra la fila de `porOrg`; `arraigo` |
| [`systems/competitivo.js`](src/systems/competitivo.js) | cierra fila con `motivoDeSalida` |
| [`systems/atributos.js`](src/systems/atributos.js) | `picos.nivel`, `picos.edadDelPicoDeNivel` |

## 8.2 — `state.calendario` (nuevo — chico, y de altísimo retorno)

Hoy no existe el año. Con `BALANCE.edad.splitsPorEdad: 3` y
[`calcularVentana`](src/core/contexto.js#L101) ya mapeando `pretemporada / regular / playoffs`,
alcanza con:

```js
calendario: {
  anioBase: 2026,
  anio: 2026,          // anioBase + floor(splitCount / splitsPorEdad)
  temporada: 1,        // 1 + floor(splitCount / splitsPorEdad)
  etiqueta: '2026'     // formato.js: "2026" en tier1, "2026/27" si se quiere el split-year
}
```

Se calcula en [`systems/edadInicio.js`](src/systems/edadInicio.js), que ya corre en el momento
justo. **Desbloquea:** trofeos fechados · `TEMPORADA 7` · `2026–2035` en la tarjeta final ·
`Worlds 2033` · y la sensación de época. Cuesta ~10 líneas y lo consumen las fases 10 y 11.

## 8.3 — `src/core/ficha.js` (nuevo, puro, cero RNG)

La única función que la UI llama para pintar. Todo derivado, nada duplicado en el estado:

```js
// El número único. ESTA ES LA EXTRACCIÓN CLAVE:
// las líneas 26-31 de systems/rendimiento.js se mueven acá y rendimiento.js
// las importa. La fórmula NO se reescribe ni se retunea (regla de proceso 2).
export function nivelDelJugador(state)        // -> 0-100
export function bandaDeNivel(nivel)           // -> 'prospecto'|'titular'|'elite'|'clase_mundial'

// Las flechas ▲▼. Requiere ampliar CAMPOS_EDAD (ver 8.3.1).
export function deltasDeStats(state)          // -> { mecanica: +2, laneo: -1, ... }
export function statDestacado(state)          // -> 'macro'  (el más alto ponderado por rol)

// Las barras. bandaDeJerarquia REUSA bandaPorTecho + BALANCE.contexto.estatusBandas,
// que ya producen rookie/titular/referente/franquicia en contexto.js:78.
export function bandaDeJerarquia(state)       // -> { id, label, valor, techoDelHito, siguiente }
export function bandaDeArraigo(state)         // -> { id, label, valor, techoDelHito, siguiente }

// Los estados con nombre en vez de contadores.
export function estadoInternacional(state)    // -> 'sin_chance'|'en_carpeta'|'clasificado'|'jugando'
export function dueloDeGeneracion(state)      // 9Wb: -> { rivalHandle, rivalRol, rivalRank, tuRank, vasGanando } | null  (fase 11: mundo.archirrival tiene prioridad)

// El objeto único que consume src/ui/components/ficha.js
export function fichaCompleta(state)
```

### 8.3.1 — Ampliar `CAMPOS_EDAD` (prerrequisito de las flechas)

[`edadInicio.js:6`](src/systems/edadInicio.js#L6) hoy fotografía **7 campos** y solo 3 son stats
(`mecanica`, `mentalidad`, `hype`). Para las ▲▼ de los 6 atributos de rol hay que agregar:

```js
'player.stats.macro', 'player.stats.teamfight',
'player.stats.laneo', 'player.stats.shotcalling', 'player.stats.adaptabilidad'
```

> **Trampa:** `generarTextoResumen` en [`edadCierre.js:14`](src/systems/edadCierre.js#L14) itera
> `CAMPOS_EDAD` para el log de cierre. Ampliarlo hace ese log más largo — pero ese log **se
> reemplaza entero en la fase 11**, así que en la 8 se acota a los campos que ya listaba, y en la
> 11 se borra la función.

### 8.3.2 — Constantes nuevas

```js
BALANCE.ficha = {
  // Bandas del NIVEL. Calibrar en 8c contra la distribución medida.
  nivelBandas: { prospecto: 45, titular: 62, elite: 78 },  // por encima: clase_mundial
  // Un delta menor a esto no dibuja flecha: una deriva de 0,4 no es una noticia.
  umbralFlecha: 1
};
```

## 8.4 — `career.arraigo` y su sistema

El segundo eje decidido en la PARTE 3. **No es un sistema nuevo**: vive en
[`systems/roster.js`](src/systems/roster.js), que ya maneja jerarquía y sinergia (regla invariable
6 respetada: no hace falta una línea nueva en `ETAPAS_SPLIT`).

| Fuente | Efecto |
|---|---|
| cada split en la org | `+[0.8, 1.6]`, escalado por `ROLES[].visibilidad` |
| título | `+[8, 14]` |
| rendir por encima de lo esperado | `+brecha × factor` (reusa la `brecha` de [rendimiento.js:90](src/systems/rendimiento.js#L90)) |
| clasificar a un internacional | `+[4, 7]` |
| split de fracaso (`posicion > equipos × posicionFracaso`) | `−[1, 3]` |

**Al cambiar de org:** se cierra la fila de `porOrg` con `arraigoFinal` y `arraigoMaximo`, y el
arraigo nuevo arranca en `hype × BALANCE.arraigo.pisoPorHype` — que es literalmente la línea *"tu
fama te precede"* de la imagen 6.

```js
BALANCE.arraigo = {
  porSplitMin: 0.8, porSplitMax: 1.6,
  porTituloMin: 8, porTituloMax: 14,
  porInternacionalMin: 4, porInternacionalMax: 7,
  porFracasoMin: -3, porFracasoMax: -1,
  factorBrechaRendimiento: 0.35,
  pisoPorHype: 0.15,
  hitos: { uno_mas: 0, querido: 25, idolo: 60, leyenda: 88 }
};
```

Los cuatro hitos son los de Potrero (👍 Uno más → ❤️ Querido → ⭐ Ídolo → 🗿 Leyenda), traducidos.
`Leyenda` habilita en la tarjeta final el detalle único *"tenés tu lugar en la base de la org"*.

## 8.5 — `src/ui/` — la extracción (cierra D7)

`index.html` tiene 1.090 líneas y `src/ui/` está **vacía**. La ficha permanente fuerza la
extracción que `DISENO.md` §4.1 pide desde el arranque del proyecto:

```
src/ui/render.js                  orquestador: state -> pantalla; único punto de entrada
src/ui/components/ficha.js        LA TARJETA (vive en TODAS las pantallas)
src/ui/components/barra.js        barra con hitos dibujados y etiqueta (arraigo, jerarquía)
src/ui/components/statRow.js      atributos con ▲▼ y destacado
src/ui/components/decision.js     tarjeta de decisión (la fase 12 la enriquece)
src/ui/components/feed.js         el log, con `tecnico: true` colapsado
src/ui/screens/inicio.js          rol + mains (lo que hoy es #setup, index.html:425-453)
src/ui/screens/carrera.js         ficha + decisión + feed
```

`index.html` queda como shell + `<style>`. **Los minijuegos NO se mueven en esta fase**
(index.html:741-905): se migran en la fase 12, cuando se les cambia la presentación. Mover código
que igual se va a reescribir es trabajo tirado.

> **Regla invariable 2 (el motor no toca el DOM):** `src/ui/` es la única carpeta que puede. El
> check estático de `dev/guards.js` se amplía para prohibir `document` fuera de `src/ui/`.

## 8.6 — La tarjeta permanente

```
┌────────────────────────────────────────────────────────────────┐
│  77   🇰🇷 THONOR26 · JUNGLA                            [T1]   │
│ NIVEL   T1 Esports · LCK · 2032 · 22 AÑOS · FAMA 25            │
│ élite   🌍 INTERNACIONAL   EN CARPETA                           │
├────────────────────────────────────────────────────────────────┤
│    3.8 KDA  │  12 MVP  │  47 SPLITS  │  2 TÍTULOS              │
├────────────────────────────────────────────────────────────────┤
│ MEC 81▲  MACRO 81▲  TF 71▲  LANEO 55▲  SHOT 62  ADAPT 58       │
│          ^^^^^^^^ destacado en color                            │
├────────────────────────────────────────────────────────────────┤
│ VALOR US$1,2M │ GANADO US$430K │ 83-136 vs DRAKKEN             │
├────────────────────────────────────────────────────────────────┤
│ ARRAIGO    ▓▓▓▓▓▓░░░░░░░░  QUERIDO · 26/100                    │
│            👍        ❤️        ⭐        🗿                      │
│ JERARQUÍA  ▓▓▓▓▓▓▓▓░░░░░░  REFERENTE · 71                      │
├────────────────────────────────────────────────────────────────┤
│ POOL  Lee Sin 78 [S] · Wukong 64 [C] · Elise 71 [A]            │
│                                          ▸ VER CARRERA          │
└────────────────────────────────────────────────────────────────┘
```

**Los detalles que NO son opcionales** (son los que hacen el trabajo, ver H7):

1. **▲▼ por stat**, contra `flags.edadSnapshot`. Sin esto el declive es invisible y toda la
   inversión en `curvas.js` y las formas de carrera no se percibe.
2. **El destacado en color** — qué sos, de un vistazo.
3. **Las barras con los 4 hitos dibujados**, no solo el número. Y **doradas** al llegar al último.
4. **El NIVEL grande a la izquierda**, con color por banda.
5. **`VER CARRERA`** abre `registro.porOrg` — **el mismo componente que reusa la tarjeta final de
   la fase 10.** Se escribe una vez.
6. **El pool con la tier del régimen vigente al lado** (`meta.tierList` ya existe en
   [`core/regimen.js`](src/core/regimen.js) y hoy solo sale como texto en un log).
7. En etapa amateur la ficha muestra otras filas (estudios, confianza, sueño, ranked) — **misma
   estructura, campos distintos**, no una pantalla aparte.

## 8.7 — Documentos a actualizar (regla de proceso 5)

- `CONCEPTO.md` §1 y §11: la duración pasa a 25-40 min (ver PARTE 3).
- `CONCEPTO.md` §6: se agrega `ARRAIGO` a la lista de sistemas, y se aclara que `JERARQUÍA` es el
  eje deportivo y `ARRAIGO` el afectivo.
- `DISENO.md` §4.1: la estructura de `src/ui/` deja de ser un plan y pasa a ser el mapa real.

## 8.8 — Checks de la fase 8

```
registro.splitsJugados === player.splitCount en el 100% de las carreras
Σ registro.porOrg[].splits === registro.splitsConEquipo (la hoja cierra)
Ningún campo de registro decrece nunca en una carrera (check dinámico, 500 carreras)
Ningún archivo fuera de src/ui/ referencia `document` (check estático, amplía guards.js)
nivelDelJugador() da exactamente la `base` de calcularRendimiento() (no se retuneó nada)
En carreras >20 splits, picos.nivel se alcanza antes del último split en ≥70%
   (si el nivel nunca baja, el declive no existe y hay que decirlo en PROGRESO)
El arraigo llega a 'idolo' en ≥15% de las carreras con ≥8 splits en una misma org
calendario.anio avanza exactamente 1 cada splitsPorEdad splits
deltasDeStats devuelve al menos un delta ≠ 0 en ≥80% de los cierres de edad
Determinismo: misma seed, dos corridas, huella idéntica
```

> Regla de proceso 7: al escribir cada check, **verificar que falla cuando debe** (trampa T5).

## 8.9 — Números a medir al cerrar

| Métrica | Antes | Objetivo |
|---|---|---|
| Campos del estado visibles en pantalla | 8 | ≥ 22 — logrado: NIVEL, 6 atributos con ▲▼, jerarquía y arraigo con banda con nombre, estado internacional, pool con tier, historia por org |
| Líneas de UI en `index.html` | 1.090 | medido: **1.069** (no ≤350 — corrección post-medición abajo) |
| Líneas reales en `src/ui/` (antes: 0, carpeta vacía) | 0 | medido: **476**, en 8 módulos reusables |
| Carreras que alcanzan el hito `idolo` de arraigo | — | 15-30% |
| `llegaronAPro`, burnout, splits medianos | — | **sin cambios** (± 3 pts): esta fase no toca balance |

> **Corrección post-medición (mismo criterio que la fase 2 con la densidad de decisiones).**
> El ≤350 era una estimación a ciegas de "shell + estilos" antes de saber cuánto CSS iba a
> necesitar la ficha nueva. Medido: la nueva tarjeta permanente agrega **~330 líneas de `<style>`**
> (barras con hitos, stat-row con destacado, badges, historia) — CSS real, no relleno — y los 5
> minijuegos (~230 líneas) se quedan adentro de `index.html` a propósito, tal como dice §8.5 ("no
> se mueven en esta fase"). La suma de las dos cosas explica casi toda la distancia entre 1.069 y
> 350. La métrica que sí importa —y que el ≤350 quería decir sin saberlo todavía— es la otra fila
> de esta tabla: `src/ui/` pasó de una carpeta vacía (D7) a **476 líneas reales en 8 módulos
> reusables**, y eso es lo que hoy hace posible reusar `renderFicha` en la tarjeta final de la
> fase 10 sin escribirla de nuevo.

## 8.10 — Verificación end-to-end

Jugar 12 splits a mano y confirmar: la ficha está en todas las pantallas · las flechas se mueven al
cerrar la edad · el NIVEL sube · el arraigo cruza un hito con nombre y la barra cambia · `VER
CARRERA` muestra la fila de la org con sus splits y su título · cero errores de consola.

**Hecho** (verificado en Chrome real, headless vía CDP, no solo con `validate.js`/`simulate.js`):
elegir rol y 3 mains, arrancar una carrera, jugar 45 decisiones seguidas con seed fija — la ficha
se actualiza en cada split, muestra el panel de amateur (estudios/confianza/sueño/ranked) y después
el de profesional (arraigo/jerarquía/pool/internacional/ver carrera) en el momento justo, el
destacado cambia de stat cuando corresponde, y **cero errores y cero excepciones de consola** en
toda la corrida.

---

# FASE 8D — CONTENIDO VIVO: LAS MARCAS SIN CONTENIDO, EL EJE ESTATUS, EL REGISTRO QUE SE CITA

> Insertada fuera de la secuencia lineal (mismo criterio que las fases 5/6 el 2026-08-09): pedido
> del usuario de llenar el juego de contenido real, que nada se repita, y que algunas decisiones
> "marquen el resto de la carrera" — usando exactamente lo que la fase 8 dejó construido y sin
> estrenar. **No es la fase 13** (`§ FASE 13 — CONTENIDO A ESCALA` más abajo): esa depende de
> sistemas que todavía no existen (`mercado.js` de la fase 9, `declive.js`/`retiro.js` de la 10,
> `relacion`/`personalidad` de compañeros). Esta fase solo toca lo que fase 8 ya construyó.

## 8D.1 — El diagnóstico (auditoría antes de escribir una línea)

Tres exploraciones en paralelo sobre el catálogo, la memoria anti-repetición y los mecanismos de
persistencia, más investigación propia del estado real de League of Legends en 2026 (parche
~26.15/26.16, Fearless Draft vigente en toda tier-1, la regla nueva "First Selection", los
arquetipos de campeón que dominan hoy). Hallazgos:

1. **El catálogo real medía 70 eventos / 142 opciones / 284 outcomes** — no 20/40 como decían
   documentos viejos. El objetivo declarado (`BALANCE.contenido.objetivoOpciones`) era 150:
   faltaban ~8, no 110. La fase 7 (memoria anti-repetición) mide bien (concentración del evento más
   visto: 8,8% mediana / 17,2% p90, muy por debajo del techo del 25%) — la sensación de repetición
   no era un fallo del mecanismo, era que el catálogo es angosto en zonas concretas.
2. **Seis marcas vivas, cero contenido detrás**: `calcularMarcas` calcula `pc_confiscada`,
   `negociacion_ganada`, `sin_secundario`, `secundario_terminado`, `signature` y
   `espera_edad_minima` cada split, activas y calculadas — pero ningún evento las leía.
3. **El eje `estatus`** (rookie → titular → referente → franquicia, 4 momentos con nombre en
   `contextos.js`) **no tenía un solo evento** gateando por él.
4. **`career.hitos` es un sumidero de solo escritura**: dos outcomes empujan ahí y nada en el
   proyecto lo lee — ni la UI, ni una condición, ni un token. Queda así (deuda anotada, no se migra
   en esta pasada: tocar `rendimiento.js`/`serie.js` está fuera de alcance de una pasada de
   contenido).
5. **`career.registro.momentos` — el lugar correcto — tenía cero llamadas.** La fase 8 construyó
   `registrarMomento(registro, momento)` en `core/registro.js` con el comentario *"para que la fase
   13 pueda citarlos"*, sin un solo evento que lo usara. Es la pieza que falta para que una decisión
   "marque el resto de la carrera": el registro solo crece (regla de proceso 14) y nunca se resetea.
6. **`outcome.modificadores`** (CONCEPTO §8: los stats corren los pesos de un outcome) se usaba en
   el 2,8% de los outcomes (8 de 284). Nunca se había usado `career.jerarquia` ni `career.arraigo`.

**Decisión explícita: no se escribe contra balance real de parche.** El meta que vive el jugador
sigue siendo el régimen ficticio con nombre de `metas.json` (9 regímenes, ya balanceado); lo real de
2026 se usa solo como textura/jerga (First Selection, Fearless, arquetipos), nunca para afirmar la
fuerza real de un campeón — es la misma convención que ya sostiene el proyecto, y evita contenido
que caduque en semanas.

## 8D.2 — Motor: tres cambios chicos, todos aditivos

- **El efecto `momento`** (`systems/events.js`): `{ type: "momento", tipo, values }` arma
  `{ tipo, anio: state.calendario.anio, edad: state.age, org: state.career.currentOrg, texto }` y
  llama `registrarMomento`. Caso de esquema nuevo en `validate.js` (mismo criterio que `push`: ≥2
  `values`, `tipo` no vacío).
- **Cinco marcas nuevas derivadas de `career.registro`** (`core/contexto.js`, cero persistencia
  nueva — leen lo que la fase 8 ya acumula): `es_campeon` (`titulos.length >= 1`), `multicampeon`
  (`>= 3`), `paso_por_tier3` (`porOrg.some(f => f.tier === 3)`), `curtido`
  (`splitsJugados >= 30`), `nomade` (`porOrg.length >= 3`). Umbrales nuevos en
  `BALANCE.registro`.
- **Fix de un bug encontrado en la auditoría**: `pool_campeon_nuevo`/`pool_campeon_nuevo_soloq`
  usaban `objetivo: "nuevo"` en un efecto `maestria` para bonificar al campeón recién aprendido,
  pero `aplicarAlPool` nunca reconocía ese valor y caía silenciosamente a `principalDelPool` — el
  bono caía en el campeón equivocado. Arreglado con `state.flags.ultimoAprendidoPool` (T4-safe,
  scratch de un split): la rama `aprender` lo escribe, la rama `maestria` con `objetivo: "nuevo"` lo
  lee (con el mismo fallback de antes si está vacío).
- **La ficha muestra los momentos** (`ui/components/ficha.js`): segundo `<details>` al lado de "Ver
  carrera", mismo patrón (`filaMomento`, texto + año + edad).

## 8D.3 — Contenido nuevo (28 eventos / 54 opciones nuevas en 8 archivos)

Cada evento nuevo declara explícitamente `etapa` y, cuando aplica, `edadBanda`/`nivel`/`estatus`/
`marcas` — nada librado al default (regla dura de esta pasada). Los marcados **[momento]** escriben
en `career.registro.momentos`; son "algunas" decisiones, no todas — el resto es ambiente, a
propósito.

| archivo | qué cubre |
|---|---|
| `marcas_vivas.json` (nuevo, 6 eventos) | las 6 marcas de 8D.1.2 — PC confiscada, negociación ganada, título secundario (sin/con), signature consolidado **[momento]**, año muerto esperando edad |
| `estatus.json` (nuevo, 4 eventos) | el arco rookie → titular → referente **[momento]** → franquicia **[momento]** |
| `registro_cita.json` (nuevo, 4 eventos) | las 5 marcas derivadas del registro (8D.2): multicampeón, origen tier3 **[momento]**, curtido, tercera org **[momento]** |
| `escena_2026.json` (nuevo, 5 eventos) | First Selection (regla 2026 real), el burn de 40 campeones con Fearless, una camada de veteranos que se retira **[momento]**, el sueldo filtrado de un compañero, el servicio militar coreano **[momento]** |
| `rol/jungla.json` (+1) | jungla era el único rol sin contenido alcanzable desde soloQ amateur (los otros 2 eventos exigen `con_vestuario`) |
| `negocios.json` (+3) | tenía 1 solo evento en todo el archivo |
| `salud_vida.json` (+2) | túnel carpiano (antebrazo, distinto de la tendinitis de muñeca) y hombro crónico (desgaste de años, no de un split) |
| `competicion.json` (+2) | cortarse una racha invicta, el equipo ideal del split (All-Pro Team — honor real de la escena, no "selección nacional": eso no existe en LoL, es fútbol coló) **[momento]** |

> Se descartó un evento de cruce de región (`residencia: import`): `residencia` está hardcodeada a
> `'local'` en `calcularContexto` — terreno de una fase futura de movilidad, no de esta. Gatear
> contenido ahí sería escribir algo que nunca puede disparar; queda como deuda ya conocida, no nueva.

## 8D.4 — Checks nuevos en `validate.js`

```
El efecto `momento` exige ≥2 values y un `tipo` no vacío (mismo criterio que `push`)
Las 6 marcas antes sin contenido tienen ≥1 evento cada una
El eje `estatus` tiene contenido en sus 4 valores alcanzables
El catálogo alcanza el objetivo de opciones declarado (BALANCE.contenido.objetivoOpciones)
En carreras de ≥25 splits, una fracción sana ve al menos un evento que escribe un momento
registro.momentos solo crece (extensión del check de la fase 8, regla de proceso 14)
```

## 8D.5 — Verificación end-to-end

```
node src/dev/validate.js               → 65 checks, todos OK
node src/dev/simulate.js 1500 60 todas → 0 crashes (3 estrategias × 1500 carreras)
node src/dev/cobertura.js --huecos     → "Sin huecos: todas las celdas alcanzables llegan al mínimo"
                                          catálogo: 196 opciones / objetivo 150
```

**Verificación manual en Chrome real (headless vía CDP, mismo criterio que la fase 8)**: se
construyó una carrera completa por motor puro (sin UI) hasta encontrar una seed rica en momentos —
seed 3342, 60 splits: 3 organizaciones (tier3 → tier2 → tier1), 18 títulos, 12 momentos de 6 tipos
distintos (`signature_consolidado`, `origen_tier3`, `equipo_ideal`, `penso_en_retirarse`,
`tercera_org`, `referente_del_vestuario`), todos citando org/año/edad reales de esa carrera
específica, no genéricos. Por separado, se cargaron los módulos reales de motor y UI **dentro de la
página servida** (no un mock) y se llamó al `renderCarrera` de producción contra un contenedor de
DOM fabricado con el estado de la seed 71 (momento a los 16 años, "Cuando decidiste que el papel
dejara de perseguirte"): el HTML resultante contiene `<details><summary>Momentos (1)</summary>...`
con el texto y el año correctos — confirma que A.2 (ui/components/ficha.js) funciona con el
renderer real, no solo a nivel de estado.

**Corrección post-medición, fuera del alcance original de esta fase**: al agregar contenido nuevo,
el check de la fase 3 *"El tier 3 es breve: mediana ≤ 2 splits, p90 ≤ 4"* empezó a fallar
(p90 medido: 5). Investigado con una sonda aparte antes de tocar nada: el fallo es ruido de
corrimiento de stream de RNG (misma familia que D21/D22, trampa T1) — agregar eventos nuevos cambia
qué evento gana cada sorteo de `elegirEvento` para una seed dada (mismo número de llamadas a
`rng()`, resultado distinto), lo que corre en cascada el resto de esa carrera simulada, incluida la
tirada de `probSalidaTier3` varios splits después. Confirmado con una medición aparte a n=1500/3000/
6000, **antes y después** del contenido nuevo: en ambas versiones el p90 real cae casi exactamente en
el borde entre 4 y 5 (~90% acumulado en el valor 4) — a n=1500 cualquiera de las dos versiones puede
caer para cualquier lado del borde según qué seeds se muestreen, pero a n=6000 ambas dan p90=4 de
forma estable. No se tocó ninguna constante de balance de tier 3: se subió el tamaño de muestra del
check (1500 → 6000), la medida mínima para que deje de depender de en qué lado del borde cae una
seed puntual. Ver D24.

---

# FASE 9 — EL MERCADO

> Implementa `salarios.js` lognormal y `valorMercado.js` con sesgo etario, residencia y cupos de
> import. **Esos números están investigados en `CONCEPTO.md` §12 y no se vuelven a investigar ni a
> discutir** (ver 9.2). Lo que agrega esta fase es que la oferta sea una decisión de verdad, con la
> pantalla de la imagen 6.

## 9.0 — Commits

| # | Commit | Contenido |
|---|---|---|
| 9a | `fase 9a: contratos y valor de mercado` | 9.1, 9.2 (motor), sin quitarle nada a `competitivo.js` |
| 9b | `fase 9b: el mercado decide, competitivo deja de sortear` | 9.3, 9.4 — **el cambio de riesgo** |
| 9c | `fase 9c: la pantalla de ofertas` | 9.5, 9.6 |
| 9d | `fase 9d: calibrar el mercado` | solo constantes |

## 9.1 — El contrato existe

```js
career.contrato = {
  org: null, liga: null, tier: null,
  salarioMensualUSD: 0,
  anios: 0, aniosRestantes: 0,
  clausula: null,                 // 'salida'|'rescision'|null
  tipo: 'ninguno',                // 'rookie'|'renovacion'|'transferencia'|'import'
  firmadoAEdad: 0, firmadoEnAnio: 0
}
```

Objeto completo de ceros, nunca `null` (T4). `registro.dineroTotalUSD` se incrementa cada split
profesional. **Es la primera vez en el proyecto que `career.contracts` deja de ser `[]`.**

## 9.2 — `src/core/salarios.js` y `src/core/valorMercado.js`

Las fórmulas y los números investigados viven en `CONCEPTO.md` §12.6 y **no se
vuelven a investigar ni a discutir** — es la misma cita que hacía la vieja fase 8 de este
documento, ahora apuntada a la fuente original en vez de a una sección que este mismo plan
reemplaza:

```js
// CONCEPTO.md §12.6 — salarios: lognormal, mediana << media (LEC mediana ~€165k, media €240k)
salarioDeOferta(liga, { rol, jerarquia, hype, edad, esImport }, rng)
  base  = liga.salario.medianaUSD
  mult  = exp(gauss(0, liga.salario.sigma))          // mediana << media
  mult *= factorRol[rol]                             // Mid > Jungla > ADC > Top > Support
  mult *= 0.6 + (jerarquia / 100) * 1.1
  mult *= 0.85 + (hype / 100) * 0.45
  return max(liga.salario.minimoUSD, base * mult)

// CONCEPTO.md §12.4 — valor de mercado, con sesgo etario (el jugador de 28 recibe ~40% de las
// ofertas que uno de 21 con la hoja idéntica)
valorDeMercado = f(rendimientoReciente, jerarquia, hype, residencia, signature) × sesgoEtario
sesgoEtario:  ≤22 → 1.00 · 23 → 0.95 · 24 → 0.88 · 25 → 0.78 · 26 → 0.66
              27 → 0.52 · 28 → 0.40 · 29 → 0.30 · 30 → 0.22 · 31+ → 0.15
```

**Reusar la forma de `BALANCE.amateur.scoutingSesgoEtario`**, que ya hace exactamente esto en la
etapa amateur, para que el juego tenga **un solo modelo** de "el mercado prefiere jóvenes" en vez
de dos curvas parecidas mantenidas por separado.

**El hallazgo que gobierna todo esto:** el declive casi **no es biológico**. El tiempo de reacción
cae ~1 ms/año después de los 25, contra **90 ms** de brecha entre un casual y un pro — es ruido. La
causa modal de retiro es que no te renuevan, sistemáticamente sub-reportada porque nadie anuncia
"me retiro porque nadie me contrata". Se modela **presión de mercado, no decadencia de stats**: el
declive no es lo que te retira, es el mercado dejando de mirarte.

`atributos.js`: la curva de declive **no se borra** (`CONCEPTO` §6 la pide y es la razón mecánica
para invertir en macro) pero se **suaviza ~40%**: sigue perceptible — y la fase 8 recién la hizo
visible con las ▲▼, sería absurdo borrarla el mismo mes que se puede ver — pero deja de ser lo que
te retira.

`valorMercado` alimenta `registro.picos.valorMercadoUSD` → imagen 15, `US$95,6M VALOR MÁS ALTO`.
**Residencia:** `player.residencias = { KR: 0, EMEA: 0, … }` en splits (ya definido en `CONCEPTO` §12.3);
12 splits (4 años) = residencia y salto de valor de mercado. La doble residencia LATAM 2026-2027
queda en D17, abierta (ver PARTE 8 / Deuda técnica).

## 9.3 — `src/systems/mercado.js` (nuevo)

**Una línea nueva** en [`ETAPAS_SPLIT`](src/systems/registro.js#L20), después de `competitivo`:

```
contexto, edadInicio, meta, roster, competitivo,
mercado,          ← NUEVO
campeones, secundario, amateur, temporada, rendimiento, serie, events,
atributos, practica, edadCierre
```

Flujo de `aplicar`:

1. **Early return sin tocar `rng`** si `phase !== 'profesional'` o `ventana !== 'pretemporada'`
   (regla de proceso 10, trampa T1).
2. Calcula `valorDeMercado`, actualiza `picos`.
3. Decrementa `contrato.aniosRestantes`. Si queda >0 y no hay bombazo, **no interrumpe**: emite una
   línea (*"Te queda un año de contrato"*) y sigue.
4. Genera **0 a 6 ofertas**, filtradas por `cupoImports`, `edadMinima` de la liga, y sesgo etario.
5. Si hay ofertas → **pausa y devuelve la decisión** (9.5).
6. Si hay 0 ofertas por `BALANCE.mercado.splitsSinOfertaParaLibre` splits seguidos →
   `nivel: 'libre'`, marca `sin_equipo`. **Esta es la puerta por la que se termina la carrera**, y
   por eso el mercado va antes que el retiro.

## 9.4 — `competitivo.js` deja de sortear tu org

**Este es el cambio de más riesgo del documento.** Se borran las líneas
[33](src/systems/competitivo.js#L33) y [136](src/systems/competitivo.js#L136).

| Responsabilidad | Antes | Después |
|---|---|---|
| ¿ascendés de tier? | `competitivo.js` | `competitivo.js` (**sin cambios**) |
| ¿a qué org vas? | `weightedPick` hacia la más débil | **`mercado.js`, elegís vos** |
| tier 3 se disuelve | `competitivo.js` | `competitivo.js` (sin cambios) |
| tier 3 te vuelve a levantar | `competitivo.js` | `competitivo.js` (sin cambios — a ese nivel no se negocia, y es la característica del nivel) |

Al ascender, `competitivo.js` marca `flags.ascensoPendiente = { ligaId, tier }` y **`mercado.js`
genera las ofertas de esa liga**. El ascenso sigue siendo mérito; el destino pasa a ser elección.

> **Trampa T1:** este cambio corre el stream de RNG. Ninguna seed anterior a la fase 9 reproduce su
> carrera. Documentar en `PROGRESO.md` sin maquillarlo (igual que D21 con la fase 5).

## 9.5 — La tarjeta de oferta (contrato de datos exacto)

Cada oferta se genera del estado y declara **todo antes de que elijas**:

```js
{
  id, org, liga, tier, region, colorOrg, monograma,
  tag: 'renovacion'|'salto'|'lateral'|'bombazo'|'import'|'descenso',

  salarioMensualUSD, anios,

  // LA TRAMPA DEL EQUIPO GRANDE (CONCEPTO §7), hecha texto. Imagen 6, campo 44.
  proyeccionJerarquia: {
    desde: 71, hasta: 25,
    etiqueta: 'Vas a ser un titular más',   // de bandaDeJerarquia(hasta)
    flecha: 'baja'                           // 'sube'|'igual'|'baja'
  },
  // La consecuencia de la consecuencia — la espiral de CONCEPTO §7:
  proyeccionPicks: 'Con esa jerarquía casi nunca vas a elegir tu campeón',

  // El coste de irse. Imagen 6, campo 45.
  costeArraigo: { pierde: 64, etiqueta: 'Dejás T1: perdés Querido (64/100)' },
  // Dónde arrancás. Imagen 6, campo 46.
  arraigoInicial: { valor: 13, etiqueta: 'Allá arrancás: Uno más — tu fama te precede' },

  // Solo en la renovación: el motivo para quedarte. Imagen 6, campo 47.
  progresoHito: { faltan: 25, hacia: 'Ídolo', actual: 63 },

  // Una línea de riesgo, generada del roster real de la org destino.
  riesgo: 'Vas a ser el 4º nombre de un vestuario con tres estrellas'
}
```

> **`proyeccionJerarquia` NO es cosmética.** Es el valor real que va a escribir
> [`roster.js:39`](src/systems/roster.js#L39), calculado antes y mostrado. `jerarquiaRetenidaAlCambiar`
> **ya existe** — solo hay que evaluarlo antes y enseñarlo. Si el jugador acepta el bombazo, ve
> caer **exactamente** lo que le avisaron. Esa coherencia es lo que hace que la decisión se sienta
> real, y es la regla de proceso 15.

## 9.6 — La pantalla y el representante

Encabezado, copy exacto (H10, imagen 6):

> **MERCADO DE PASES**
> *El dado trajo estas ofertas. Elegí: ¿la guita o el proyecto?*

Grilla de hasta 6 tarjetas + un botón al pie:

> **📞 LLAMAR A TU REPRESENTANTE Y PEDIR OTRAS OFERTAS · 1 VEZ POR CARRERA**

`flags.llamadaRepresentante: false` inicial. Rebaraja las ofertas una única vez en toda la partida.
Recurso escaso, memorable, y da agencia sobre una mano mala **sin romper el azar** — no elimina la
tirada, te da una segunda.

## 9.7 — Constantes nuevas

```js
BALANCE.mercado = {
  ofertasMax: 6,
  probRenovacionBase: 0.55,
  probRenovacionPorJerarquia: 0.35,
  splitsSinOfertaParaLibre: 3,
  aniosContratoMin: 1, aniosContratoMax: 3,
  // Cuánto mejor tenés que ser que el mejor local para entrar como import
  // (CONCEPTO §6: "claramente mejor, no apenas mejor").
  margenImport: 8
};
```

## 9.8 — Checks de la fase 9

```
Ningún split profesional cambia de org sin una decisión del jugador de por medio
   (excepto tier 3, que es explícitamente automático)
La distribución de salarios es lognormal: mediana < media × 0.75
proyeccionJerarquia predice la jerarquía real post-fichaje con error ≤ 8 puntos
   (si la tarjeta miente, la decisión vuelve a ser ruido — regla de proceso 15)
A los 28 con la misma hoja llegan ≤50% de las ofertas que a los 21
Nadie firma violando cupoImports ni edadMinima de la liga
El representante se puede usar exactamente una vez por carrera, nunca dos
registro.dineroTotalUSD es monótono creciente
Ninguna oferta muestra un progresoHito si no es una renovación
```

## 9.9 — Números a medir

| Métrica | Antes | Objetivo |
|---|---|---|
| Decisiones de mercado por carrera | 0 | 3-8 |
| % de carreras donde el jugador rechaza el mejor sueldo al menos una vez | — | ≥ 35% (si nadie rechaza, el dilema no existe) |
| % de carreras con al menos un `sin_equipo` | 0 | se mide, alimenta la fase 10 |

## 9.10 — Verificación end-to-end

Llegar a una pretemporada con contrato venciendo, ver 4-6 ofertas, **aceptar un bombazo**, y
confirmar en el split siguiente que la jerarquía cayó **al número exacto que la tarjeta prometió**
y que el arraigo arrancó en el valor que decía. Después, en el draft de la serie, comprobar que
efectivamente ya casi no elegís tu campeón — la espiral de `CONCEPTO` §7, cerrada de punta a punta
y por primera vez.

---

# FASE 9E — EL VARADO

> **Fase de corrección, no de features.** Nace de la auditoría del 2026-09-02 (ver deuda D25-D28,
> D31, D33). No agrega un solo sistema: arregla un bug que hace que **el 30,7% de las carreras no
> tengan juego después del primer equipo**, y tapa el agujero de medición por el que ese bug
> convivió con 83 checks en verde.
>
> Va antes de la fase 10 por dependencia dura: el retiro emergente se define como *"te retirás
> cuando el mercado deja de llamarte"*, y hoy el estado "sin equipo" está tan roto que no se puede
> usar como señal de nada.

## 9E.0 — El diagnóstico, medido

Sonda headless sobre el mismo pipeline que corre el navegador, 400 carreras × 60 splits, estrategia
por defecto:

| Métrica | Medido | Debería ser |
|---|---|---|
| Carreras que terminan varadas (`tier=null`, sin org) | **30,7%** | ~0% |
| Splits profesionales jugados sin equipo | **47,5%** (7.100 de 14.938) | unos pocos, entre contratos |
| Racha máxima sin equipo | **57 splits** | 1-2 (`competitivo.splitsLibrePromedioTier3`) |
| Apariciones del momento `sin_equipo` | **7.238** — el más frecuente del juego | marginal |
| Carreras varadas por la vía del mercado | **0** | — |

La última fila es la que cierra el diagnóstico: **no es el mercado, es tier 3.**

Traza de la seed 7: firma con Fénix Esports en el split 7, el equipo se disuelve en el 8, y los 52
splits restantes son zombis — sin equipo, sin liga, sin tier, sin ofertas, hasta el tope.

## 9E.1 — La causa

`disolverEquipo()` (`systems/competitivo.js`) deja el estado en `tier: null, liga: null,
currentOrg: null`. La fase 9b (`9a163b6`) cambió el re-fichaje de incondicional a:

```js
// antes (fase 3):
if (!state.career.currentOrg) return reFicharTier3(state, rng);
// después (fase 9b):
if (!state.career.currentOrg) {
  return state.career.tier === 3 ? reFicharTier3(state, rng) : { state, logs: [] };
}
```

El guard es correcto en intención — un libre de tier 1/2 lo tiene que resolver `mercado.js`, no
este sistema — pero se apoya en un `tier` que `disolverEquipo` acaba de anular tres funciones más
arriba. **La condición nunca es cierta en el único caso para el que se escribió.**

Y `mercado.js` tampoco rescata: hace early return porque `ligaDeCarrera()` devuelve `null` con
`career.liga` en null. Las dos puertas cerradas, ninguna de las dos por su cuenta equivocada.

## 9E.2 — El arreglo

**`disolverEquipo` conserva `tier: 3`.** Se te disolvió el equipo, no dejaste de ser un jugador de
tier 3. Es verdad semántica, mantiene `ligaOZonaDeCarrera()` funcionando, y hace que el guard de
`aplicar()` diga exactamente lo que quería decir sin tocarlo.

Descartado: ampliar el guard a `tier === 3 || tier === null`. Arregla el síntoma y deja el estado
mintiendo — un jugador sin tier que sin embargo compite en tier 3.

`liga` sigue en `null`: tier 3 no es una liga real, eso ya estaba bien.

> Trampa T1: esto **no** agrega ni saca consumo de `rng` en el camino feliz, pero sí cambia qué
> rama toma `competitivo.aplicar()` en las carreras varadas, y ahí `reFicharTier3` vuelve a tirar.
> Ninguna seed anterior reproduce su carrera. Es el precio del arreglo, no un efecto colateral
> evitable: anotarlo en `PROGRESO.md` y no intentar preservar la huella.

## 9E.3 — Que el agujero no se vuelva a abrir

Los cambios de tooling importan tanto como el arreglo, porque el bug vivió cuatro commits debajo
de 83 checks en verde.

1. **KPIs de carrera en `simulate.js`.** Era el hueco más grande: el reporte solo tenía métricas
   de la etapa amateur (`soloqElo`, `estudios`, `familyTrust`, `mecanica`, `mentalidad`, `hype`,
   `splitFichaje`), así que 1.500 carreras no veían nada de lo que pasa después de firmar. Y una
   racha de 57 splits sin equipo es **invisible desde el estado final**, que solo dice "sin
   equipo" una vez — hay que recorrer la carrera split a split. Agregar: fracción de splits con
   equipo, racha máxima sin equipo, distribución de tier alcanzado, y carreras varadas.
2. **Checks nuevos en `validate.js`**: ninguna carrera pasa más de N splits seguidos sin equipo
   estando en `phase: 'profesional'`, y la fracción de splits profesionales con equipo se mantiene
   alta. Regla de proceso 7 — **verificar que fallan contra el `HEAD` actual antes de arreglar
   nada**; si pasan en verde sobre el código roto, el check está mal escrito.
3. **`sin_equipo` deja de estar `pendiente`** en `data/contextos.js`. Es corrección de etiqueta:
   lo estaba desde la fase 7, cuando ningún sistema producía ese estado, y la fase 9 le dio dos
   puertas sin sacarle la marca.

> **Corrección al diagnóstico original (medido el 2026-09-02, después de escribir esta fase).**
> Acá decía que `cobertura.js` reportaba "sin huecos" *porque saltea los pendientes*. **Es falso**:
> el `pendiente` solo cambia la etiqueta de una fila nunca observada, nunca suprime un hueco. El
> mecanismo real es peor. `sin_equipo` fue observado siempre, y la celda reporta **58 eventos** —
> muy por encima de `minimoEventosPorCelda`— porque los 58 son el contenido mal gateado de D27:
> eventos de rol que hablan de partidos que no jugás, `transfer_rumor` sin contrato del que
> irse, `tercer_club_ya` sin club. **`cobertura.js` mide cantidad, no pertinencia**, así que
> cuanto más contenido sin gatear se escribe, más sana se ve una celda inapropiada. Eso hace a
> D27 más importante, no menos, y agrega un ítem propio: que la matriz sepa distinguir "hay 58
> eventos acá" de "hay 58 eventos que tienen sentido acá".

## 9E.4 — El contenido que se cuela sin vestuario (D27)

Con el varado arreglado, `nivel: 'libre'` pasa de ser el estado dominante a una ventana de 1-2
splits. Pero el contenido sigue sin gatearse, y ahí ya se observó lo peor que puede pasar: **Arraigo
+2 al manager de una org que no existe** (y se pierde, porque `cerrarFila` es no-op sin fila
abierta), y *"en el draft no te dieron tu pick"* seis veces sin equipo ni serie.

Medido con `cobertura.js --momento sin_equipo`: **20 eventos** caen en la pretemporada sin equipo,
y los peores son los cinco de rol (`mid_roamear_o_no` — *"tu línea está ganada"*,
`adc_si_perdemos_es_por_vos`, `support_nadie_te_vio`, `jungla_el_mapa_es_tuyo`,
`top_recorte_sin_contexto`), que hablan de partidos profesionales que no estás jugando. Más
`transfer_rumor` sin contrato del que irse, `tercer_club_ya` sin club, y `el_secundario_que_sirvio`
dando Arraigo a un manager inexistente.

Tres cambios:

- **`campeones.js`**: el draft se gatea por `career.currentOrg`, no por `phase === 'profesional'`.
  Sin equipo no hay draft; elegís vos, como en soloQ.
- **Los eventos que nombran vestuario, manager, staff o partido declaran `marcas:
  ["con_vestuario"]`** (o `nivel` explícito). La marca ya existe desde la fase 0 y ya se usa para
  esto mismo; lo que falta es aplicarla al contenido escrito después. Los 5 de rol son el caso
  claro: son eventos de partido, no de identidad.
- **`cobertura.js` tiene que distinguir cantidad de pertinencia.** Hoy una celda con 58 eventos
  mal gateados se ve más sana que una con 6 bien gateados. Mínimo viable: marcar las celdas donde
  la mayoría del contenido llega **sin declarar `nivel` ni `marcas`** — contenido que cae ahí por
  omisión, no por decisión.

## 9E.5 — Los `Math.random()` de `index.html` (D28)

Cinco usos (zona del Smite en "Robar Barón", espera de "La Llamada", posición de los blancos)
deciden el `resultado` que el minijuego le devuelve al motor — que entra a la serie y cambia el
mapa. **Jugando a mano, la misma seed no reproduce la misma carrera.** La regla invariable 1 no
tiene asterisco para la UI.

- Extender `guards.js` a `.html` (hoy filtra por `EXTENSIONES_A_REVISAR = new Set(['.js'])` dentro
  de `/src`, así que `index.html` le queda fuera dos veces).
- Pasarle el `rng` de la partida a los cinco `montar*`. El módulo ya viaja hasta ahí: `index.html`
  importa `mulberry32` y arma el stream — es cuestión de pasarlo, no de crear nada.
- Ojo trampa T1: consumir tiradas del stream principal adentro del minijuego lo corre. Si molesta,
  derivar un stream aparte desde la seed y el número de split.

## 9E.6 — Limpieza de constantes (D31)

Borrar o usar, sin dejarlas mintiendo: `amateur.autoProbRobar`, `rendimiento.ruidoRival` (resto de
la fase 5, cuando `temporada.js` le sacó a `rendimiento.js` la resolución de la temporada) y
`competitivo.margenEdadMinima`. `mercado.margenImport` **no** se toca acá: es D29 y se resuelve
junto con el eje `residencia` en la fase 11.

Redirigir los 13 comentarios de `/src` que citan `TRASPASO.md §4` a `CONCEPTO.md §12` (D33): la
numeración se conservó al mover la investigación, así que es reemplazo de texto, sin lógica. **✅
Cerrado 2026-09-04** (D33, ver tabla de deuda técnica).

## 9E.7 — Checks de la fase

- Ninguna carrera de 60 splits pasa más de `N` splits seguidos sin equipo en `phase: 'profesional'`.
- Fracción de splits profesionales con equipo **≥ 90%** (hoy: 52,5%).
- Carreras varadas (`tier === null` y sin org al cerrar) **= 0%** (hoy: 30,7%).
- `cobertura.js --huecos` mide `sin_equipo` — y si no hay contenido, lo dice.
- `guards.js` falla sobre el `index.html` actual y pasa después de inyectar el `rng`.
- Cero apariciones de "draft" o "manager" en los logs de un split sin `currentOrg`.

## 9E.8 — Números a medir al cerrar

Los cuatro de 9E.0, remedidos con la misma sonda y el mismo `n`. Más el que la fase 9d midió mal:
**carreras con al menos un split libre** — reportado 0,3%, real 35,3%. Es el número que dice si el
estado "sin equipo" volvió a ser lo que tiene que ser: una transición, no un destino.

Y D2 (`% de carreras que agotan el tope de splits`) se remide después de esto y **antes** de
empezar la fase 10: hoy da 65,5% a 60 splits, pero una parte de ese número son carreras varadas,
no carreras largas. La fase 10 necesita la lectura limpia.

## 9E.9 — Verificación end-to-end

Jugar la seed 7 a mano de punta a punta. Hoy: firmás en el split 7, el equipo se disuelve en el 8,
y quedan 52 splits de nada con eventos de vestuario cayendo igual. Después: te levanta otro equipo
chico en uno o dos splits y la escalera de la fase 3 sigue su curso.

---

# FASE 9R — QUE EL JUEGO SE JUEGUE

> **Por qué esta fase se insertó entre 9E y 9M (2026-09-02).** Comparando el juego contra su
> referencia directa (**El Ídolo del Potrero**) a pedido del usuario — *"fijate lo divertido que es
> y comparalo con el mío, las frases se repiten, es todo choto, fijate por qué y arreglalo"* — y
> auditando el código contra cada diferencia, salió un diagnóstico aritmético, no estético.
>
> **El Ídolo**: carrera completa en 5-10 min, 300+ eventos, un archirrival con nombre toda la
> partida, y una tarjeta final comparándote contra leyendas hecha para screenshot.
>
> **Este juego, medido** (headless sobre el mismo `avanzarSplitAuto` que corre el navegador):
>
> | Métrica | Medido | Objetivo |
> |---|---|---|
> | Decisiones por carrera | **248** | ~70-90 |
> | Baraja elegible por turno (profesional) | **22** de 97 | ≥45 |
> | Baraja elegible en amateur | **3,09** de 97 | ≥12 |
> | Repeticiones del evento más repetido | **14 mediana, hasta 32** | mediana ≤4, máx ≤8 |
> | Líneas de log por carrera | **615 mediana** (67% relleno técnico) | — |
> | Carreras sin final a los 35 años | **69%** | 0 |
>
> 248 decisiones sacadas de una baraja de 22 son 11 pasadas completas por el mazo: la repetición es
> aritmética, no balance. Y el check de la fase 7 (`§7.2`, *"mediana ≤ 4, máximo ≤ 8"*) es una
> **regresión** — hoy mide 14 y 22. Además elegir casi no cambia nada: aportás el **35%** de la
> fuerza de tu equipo, la decisión más frecuente mueve la probabilidad de ganar **4,5 puntos**,
> `mid_el_duelo` tiene dos opciones **idénticas**, `modificadores` (la promesa de `CONCEPTO` §8)
> está en **11 de 392 outcomes**, y **Mentalidad/Hype no se dibujan** aunque el 74% de los efectos
> del contenido las mueva y el 12,5% de las carreras muera de burnout por esas barras.
>
> Va **antes de 9M** por dependencia dura: 9M valúa al jugador por su posición en la liga, y esa
> posición sale de una tabla que miente media temporada (R1.2); y 9M ya declara que corre el stream
> de RNG (D35), así que el corrimiento de esta fase se paga una sola vez si van juntas en el orden.

El plan completo, fase por fase, vive en `.claude/plans/escuchame-posta-*.md` (aprobado por el
usuario). Resumen ejecutable:

## Decisiones del usuario (textuales — respetarlas)

| Tema | Decisión |
|---|---|
| **Formato** | *"cortar el relleno, mantener la larga"* → la carrera sigue durando 25-40 min en splits; baja de 248 a ~70-90 decisiones. Se respeta la decisión previa de PLAN.md:78 |
| **Contenido** | *"catálogo completo en full thinking, llamando agents para no escribir boludeces y checkeando todo a esta season"* → se escribe con agentes, en tandas por archivo, cada una verificada contra `CONCEPTO` §12 y contra `cobertura.js --huecos` |
| **Ganchos de El Ídolo** | **la tarjeta final compartible** y **los minijuegos en momentos clave**. El archirrival y las cartas de pretemporada **no** entran (siguen en la fase 11 donde están) |

## 9R.1 — Los tres bugs de motor (subfases 9Ra-9Rg)

**Orden de commits** (regla de proceso 2: estructura y retuneo separados):

| # | Commit | Qué entra | Estado |
|---|---|---|---|
| **9Ra** | `el cooldown mide splits` | `flags.cooldowns` → `flags.cooldownHasta` (split de expiración). `actualizarCooldowns` → `registrarEventoVisto`: se borra el tick. Constante `eventos.cooldownMinimoSplits: 1`. **Deuda D37** (corre el stream). | ✅ `3cce01c` — 0 reapariciones antes de tiempo en 36.826 eventos |
| **9Rb** | `la tabla deja de mentir` | `simularResto` → `generarFixture` (round-robin real por método del círculo) + `aplicarCrucesDeJornada` en paso con tus fechas. `career.temporada.cruces`. **Deuda D38** (reordena el stream) + **D39** (sesgo +6 en `proyeccionJerarquia`). | ✅ `7c07f49` — posición relativa media jornada 1: 0,96 → ~0,35 |
| **9Re** | `la temporada regular deja de ser una cinta` | `fechasMarcadasMin/Max` → `fechasMarcadasPorSplit: 1`; se marca la primera fecha con `motivos.some(m !== 'parejo')`, `forzarMarca` borrado. La reacción postpartido se resuelve sola (`weightedPick` por peso, igual que el camino headless) y se cuenta en una línea. Resúmenes de tramo con `tecnico: true`. | ✅ `5e3099f` — temporada 108 → ~35 decisiones/carrera |
| **9Rf** | `el presupuesto de interrupción` | `src/systems/presupuesto.js` (primero en `ETAPAS_SPLIT`, **no toca RNG**): cupo `esSplitEventful(state) ? interrupcionesPorSplit.eventful : .rutina`. `pipeline.pausar()` descuenta (choke point único). Solo `events.js` consulta `hayPresupuesto`; el resto descuenta pero no consulta. El 2º evento lo sigue gobernando `probSegundaDecisionPorTipo`. Constante `presupuesto.interrupcionesPorSplit: { eventful: 2, rutina: 1 }`. | ✅ `6ebc268` — **248 → 122 decisiones/carrera** (40 splits), evento más repetido **14 → 5 (máx 8)** |
| **9Rc** | `un solo criterio de valor de campeón` | Tres fórmulas que no se hablan (`calcularRendimiento` solo maestría, `deseoPorCampeon` maestría²×afinidad, `factorDraftFecha` solo afinidad) → una sola `factorDeCampeon(campeon, weights)`. `core/fuerza.js` nuevo: `rendimientoBase(state)` (puro, sin el `gauss` — T1-neutral) + `fuerzaDelEquipo` movida. `factorDraftFecha(elegido, base, weights)` relativo al campeón del split. Constante `rendimiento.afinidadPesoEnRendimiento: 0.15`, bloque `draft.lectura`. | ✅ `277584e` — 104 checks OK, 0 crashes, auto-pick peor imposible (0/2368) |
| **9R5d** | `la carrera dura más` (tuneo, feedback del usuario) | Retirar a los 23 se sentía durísimo. `retiro.edadDeclive` 23 → **27**, `edadRetiroForzoso` 31 → **34**, `chanceBasePorAnio` 0,24 → **0,55**. `CONCEPTO` §1/§2 al día. Checks de duración recalibrados: edad mediana al terminar 22-27 → **24-30**, cola 30+ tope 12% → **18%**. La investigación (`CONCEPTO` §12.4) marca el declive a los 23-25 — el juego lo estira a propósito (ethos "ir a más"). | ✅ (este commit) |
| **9Rd** | `se para cuando hay algo en juego` | Criterio de pausa **invertido**: hoy pausa cuando `dominancia < 1.35` (empate). Nuevo: `probabilidadDeGanar(fp, fr, σ₁, σ₂)` (Φ logística sobre `rendimientoBase`, cero RNG), pausa sii `puntosEnJuego ≥ umbral`; excepción incondicional `disponibles.length === 2`. Constantes `numeros.factorLogisticoNormal: 1.702`, `serie.puntosEnJuegoParaPreguntar: 0.04`, `temporada.puntosEnJuegoParaPreguntar: 0.07`. Se borra `serie.dominanciaClara` (D31) | ⬜ |
| **9Rg** | `calibrar el volumen` ✅ (2026-09-05) | **solo constantes**, línea de base re-medida (T6). Orden: `interrupcionesPorSplit` → los dos `puntosEnJuegoParaPreguntar` → `afinidadPesoEnRendimiento` (último) → `cooldown` de los JSON si el catálogo se agota → `pesoJugadorEnEquipo` 0,35→~0,5 → **D39** recalibrar `proyeccionJerarquia`. Cierra con `npm run build` (regenerar `dist/`) | 🔶 `pesoJugadorEnEquipo` 0,35→**0,5** hecho (correlación nivel↔posición r 0,09→0,18); efecto de cadena: subir ese peso amplificó `puntosEnJuego` de `serie.js` y rompió el mínimo de 30% series-sin-draft (cayó a 23%), así que `serie.puntosEnJuegoParaPreguntar` 0,18→**0,26** (y su Decisivo 0,09→**0,13**) también se recalibraron para sostener el 32,5% original — falta `interrupcionesPorSplit`, `temporada.puntosEnJuegoParaPreguntar`, `afinidadPesoEnRendimiento`, `cooldown` de JSON y D39. **Cerrado el 2026-09-05**: las tres palancas se midieron y **ninguna se tocó** (bajar `eventful` a 1 corta 11 decisiones y borra la distinción que 9Rf construyó; subir el umbral de temporada SUBE el volumen, porque libera presupuesto que `events.js` consume; la afinidad separa 2,93 contra un mínimo de 0,5). Lo que sí entró: **D39 cerrada** (`roster.derivaPrimerSplit: 6`, sesgo +6,45 → +0,45) y el objetivo de volumen corregido con su justificación |

Dependencias: 9Rc → 9Rd. 9Ra/9Rb/9Re/9Rf independientes y **ya hechas**. **Medir entre 9Rf y 9Rg.**

> **Orden de trabajo revisado (2026-09-03).** Tras cerrar 9Ra/9Rb/9Re/9Rf (el corte de volumen:
> 248 → 122 decisiones, evento más repetido 14 → 5), el resto va en este orden por impacto y
> dependencia: **9R.5** (el final + la tarjeta — cierra el loop, alto pago visible, destraba medir
> carreras a su largo real) → **9R.2** (Mentalidad/Hype se dibujan — bug real: 12,5% de burnout por
> una barra invisible) → **9Rc + 9Rd** (agencia) → **9R.3 + 9R.4** (catálogo a escala + minijuegos,
> con agentes) → **9Rg** (calibrar + `dist`).

## 9R.2 — Que elegir importe (contenido + UI, después de medir 9Rf)

1. `modificadores` de 2,8% → **≥60%** de los outcomes (el motor ya lo soporta, `events.js:245`).
2. Check nuevo: **ninguna opción puede ser gratis** — toda opción que declare mover un eje se
   separa de sus hermanas por ≥3 pts de valor esperado. Hoy `mid_el_duelo` tiene dos con 0,0.
3. `pesoJugadorEnEquipo` 0,35 → ~0,5 (commit de tuneo separado).
4. **Mentalidad y Hype se dibujan** en `statRow.js` y la rama profesional de `ficha.js`.
5. Los efectos dejan de disolverse: `atributos.js` converge `mecanica`/`laneo`/`teamfight` a
   `velocidad: 0.3` — un `+3` desaparece en ~5 splits. Redistribuir hacia los stats que acumulan.

## 9R.3 — El catálogo completo: 97 → 218 eventos ✅ (2026-09-04)

Absorbe y amplía la **FASE 13**, cuyo objetivo (*"≥150 opciones"*) ya está cumplido (hay 196) y aun
así el juego se repite: la métrica correcta es **baraja elegible por turno**, no opciones totales.

| Pool | Antes | Final | Subfase |
|---|---|---|---|
| `partido/postpartido.json` | ~~4~~ **15** | 15 | ✅ 9R3a |
| `partido/dentro_del_mapa.json` | ~~8~~ **23** | 22 | ✅ 9R3b |
| `partido/presion.json` / `clasico.json` | ~~6 / 6~~ **13 / 13** | 13 / 13 | ✅ 9R3b |
| `rol/*.json` (5 archivos) | ~~11~~ **45** | 45 | ✅ 9R3c |
| elegibles en amateur | ~~19~~ **50** (28 con `etapa` amateur) | 45 | ✅ 9R3d |
| resto (drama/salud/negocios/competición/estatus/registro/escena/pool) | ~~62~~ **91** | ~95 | ✅ 9R3e |
| listón de `cobertura.js --huecos` | ~~3~~ **6** | — | ✅ 9R3e |
| check de repetición apretado | ~~4/8 · 25%~~ **4/7 · 15%** | — | ✅ 9R3f |

Y **variación léxica, que hoy no existe** (0 arrays de frases, 100% strings fijos):
`outcome.texto` acepta array de variantes; `FRASES_MOTIVO` (7 frases fijas narran 79 fechas/carrera)
pasa a ~40; los pools de nombres (30×30 sílabas de handle, 20×10 de org) se amplían para que el
mundo no suene igual en toda partida; los 3 eventos que nunca salían se regatearon (0 borrados).

**Catálogo final: 97 → 218 eventos, 150 → 438 opciones.** Cierra 9R.3. Sigue **9R.4**.

### 9R3f — se aprieta el check de repetición, cierra 9R.3 ✅ (2026-09-04)

- Puro tuneo de checks (regla 2): tope de volumen `4/8` → `4/7` (medido a N=400: mediana 3, p90 4,
  máximo absoluto 6, estable); tope de concentración `25%` → `15%` (medido a N=500: p90 7.4%,
  máximo 11.5%, estable).
- validate 117/117, simulate 1000 sin crashes, determinismo intacto (no se tocó ningún sistema).

### 9R3e — el resto del catálogo + el listón de cobertura sube ✅ (2026-09-04)

- `drama_prensa` 4→8, `salud_vida` 6→10, `negocios` 4→8, `competicion` 5→9 (todos con `ventana`),
  `estatus` 4→8 (uno por valor de `estatus`), `registro_cita` 4→7, `escena_2026` 5→9, `pool` 10→13.
  +30 eventos, data-only.
- Triage de eventos muertos (0/600 carreras): `first_selection` y `el_burn_de_cuarenta` gateaban
  con `serie.activa==true`, un flag que el picker de ambiente nunca ve (vive dentro de
  `temporada`/`serie.js`, que no elige de `TODOS_LOS_EVENTOS`) — contenido estructuralmente muerto.
  Regateados: se saca la condición de serie, se anclan a `ventana`, sus efectos `partido` pasan a
  `stat` (autocontenidos). `el_ano_muerto` pedía `ventana: pretemporada` para un momento
  (`espera_edad_minima`) que solo se observa en `playoffs`; se saca la `ventana`. Los 3 disparan
  ahora (75 / 32 / 2 en 500 carreras).
- `BALANCE.contenido.minimoEventosPorCelda` 3 → 6: con 218 eventos la celda alcanzable más floja
  ofrece 11, `cobertura.js --huecos` sigue vacío al doble de exigente.
- **Medido:** catálogo 188 → 218, opciones 378 → 438. validate 117/117 (0 FAIL de datos/eventos;
  las 2 FAIL de CSS que aparecían eran de la Fase T0b concurrente, ya cerrada). simulate 1000 sin
  crashes, determinismo 150/150.

### 9R3d — el prólogo amateur tiene decisiones propias ✅ (2026-09-04)

- `soloq_precarrera.json` **3 → 15**, `marcas_vivas.json` **6 → 9** (depth de `pc_confiscada` +
  primer contenido propio de `riesgo_familiar`), `cierre_edad.json` **8 → 10** (cierres amateur).
  +17 eventos, data-only.
- **Medido:** eventos con `etapa: ["amateur"]` 11 → **28**; elegibles en amateur ~19 → **50**;
  catálogo **171 → 188**, opciones **344 → 378**; celdas amateur de cobertura ~x2; `--huecos`
  vacío; validate 113/113; simulate 1000 sin crashes; determinismo 150/150.
- Sin checks nuevos: 9R3e mueve el stream otra vez, se aprieta al cerrar 9R.3.

### 9R3c — cada rol tiene decisiones propias de verdad ✅ (2026-09-04)

- `rol/*.json` **11 → 45** (cada archivo 2-3 → 9). +34 eventos, decisiones con trade-off atado a
  la stat que sube; 1 evento soloQ puro por rol (sin `con_vestuario`, efecto `ladder`); `texto` en
  array en ~la mitad de los outcomes nuevos.
- Reparto de efectos deliberado: sobre los 45 eventos de rol, mentalidad **~29%** (la queja era
  51% del catálogo); el resto en las stats de firma de cada puesto + `career.sinergia`/`jerarquia`.
- **Medido:** eventos single-rol por rol **4 → 11** (mínimo del check: 3); catálogo **137 → 171**;
  evento de ambiente más repetido/carrera mediana **4**, máx **5** (venía ~4 / 6); `cobertura.js
  --huecos` vacío. El check *"volumen de decisiones"* (4/8) pasa; no se aprieta hasta cerrar 9R.3.

### 9R3b — los pools de fecha marcada se hacen profundos ✅ (2026-09-04)

- `partido/dentro_del_mapa.json` **8 → 23** (genéricos 3→13, +1 evento por rol), `presion.json`
  **6 → 13**, `clasico.json` **6 → 13**. `texto` en array en ~15 outcomes.
- **Medido:** evento más repetido por carrera mediana **4 → 3**, máx **7 → 6**; eventos distintos
  **53 → 63**; catálogo **108 → 137**. El check *"volumen de decisiones"* (tope 4/8) pasa con
  margen; no se aprieta hasta cerrar 9R.3.

### 9R3a — la infraestructura de variantes + el pool más caliente ✅ (2026-09-04)

- `resolverTexto` / `tokensUsados` / `textoResuelveCompleto` (`core/plantillas.js`) aceptan un
  **array de variantes** en cualquier campo de texto. Selección por `hashCadena(join + splitCount)`
  — determinista, **cero `rng`**. `hashCadena` unificado en `core/numeros.js` (estaba duplicado en
  `rendimiento.js` y `temporada.js`).
- `title` con 3-4 variantes en los 6 eventos que una carrera ve más: `pool_main_muerto` (+`_soloq`),
  `pool_campeon_nuevo` (+`_soloq`), `pool_a_cual_le_metes`, `old_rival`.
- `partido/postpartido.json` **4 → 15** (los 4 viejos con `outcome.texto` en array).
- **Medido:** evento más repetido por carrera mediana **5 → 4**; eventos distintos **47 → 53**;
  catálogo **97 → 108**. Check *"volumen de decisiones"*: tope del más repetido **7/11 → 4/8**.
  Check nuevo *"La variación léxica de outcome.texto elige distinto y sin tocar el RNG"*.
- **Nota:** `FRASES_MOTIVO` (7 → ~40) y los pools de nombres (30×30 / 20×10) **ya estaban hechos**
  desde 9R0a — el texto de arriba es del plan viejo. Lo que falta de "variación léxica" es
  convertir más `outcome.texto` de eventos existentes a arrays (va saliendo con cada subfase).

## 9R.4 — Los minijuegos de verdad ✅ (2026-09-05)

> **Reescrita el 2026-09-05.** El texto original de esta sección eran cinco líneas del 2026-09-02,
> anteriores a **9R0b** (el feedback de resultado) y a **T6** (los 5 minijuegos migrados de
> `index.html` a `src/ui/components/minijuegos/`). Decía *"disparan en el 3,7% de las decisiones"*;
> re-medido antes de escribir una línea de código (trampa T6), da otra cosa.

**El diagnóstico, medido en HEAD** (300 carreras × 60 splits, responder por defecto):

| Métrica | Medido |
|---|---|
| Minijuegos / decisiones | **1.724 de 30.208 = 5,71%** |
| Minijuegos por carrera | mediana **3**, p90 **17**, máx **28** |
| Carreras que no ven ninguno | **29,3%** |
| Reparto | `bootcamp` 643 · `la_llamada` 574 · `la_prueba` 204 · `robar_baron` 159 · `rueda_de_prensa` 144 |
| Internacionales con jugada dentro del mapa | **0 de 643** |
| Impacto agregado (siempre acierta vs. siempre falla, N=400) | **+7,49%** en títulos+internacionales |

Los cuatro defectos que salen de esos números:

1. **El cupo de la serie se lo come el bootcamp.** `serie.minijuegoUsado` es uno por serie y el
   bootcamp dispara **antes del primer mapa, siempre** (643/643 internacionales): la serie más
   grande del juego nunca tiene una jugada dentro del mapa ni rueda de prensa.
2. **Cuatro de los cinco roles juegan siempre lo mismo.** `robar_baron` es sólo jungla; el resto cae
   en `la_llamada` sin excepción.
3. **`minijuegos.json` son 5 stubs** (`id`/`titulo`/`descripcion`): el stat, el impacto, el disparo y
   los veredictos están hardcodeados en `systems/serie.js`, `systems/amateur.js` y
   `ui/components/minijuegos/index.js`. Rompe la regla invariable 4 (el contenido es dato) y es la
   causa directa de **D20**.
4. **Cero variación léxica**: cinco títulos fijos que una carrera larga ve hasta 28 veces — justo lo
   que 9R.3 corrigió en todo el resto del catálogo.

**Decisión del usuario (textual, 2026-09-05):** *"1 por rol sería muy repetitivo, tienen que ser
varios, desde last hit de minions fast, hasta dodgear, smite, y que se te ocurran cosas del lol,
apretar teclas en orden tipo combo etc"* → **un banco de mecánicas de LoL**, elegidas por rol y
momento con anti-repetición, no una mecánica fija por puesto.

Lo que **no** cambia: `PLAN.md:80` (*"que tampoco todo sea un gambling a los minijuegos"*). El cupo
sigue siendo **uno de mapa por serie**; lo que cambia es cuál te toca, y que el internacional y el
mapa que cierra dejen de quedarse sin el suyo.

**Orden de commits:**

| # | Commit | Qué entra | Estado |
|---|---|---|---|
| **9R4a** | `el minijuego es dato` | Esquema completo en `minijuegos.json` (`momentos`, `roles`, `statRelevante`, `efecto`, `impacto`, `spread`, `titulos[]`, `descripciones[]`, `apuesta`, `veredictos`). `src/core/minijuegos.js` nuevo (puro, **cero RNG**): `minijuegosPara` / `elegirMinijuego` (determinista por `hashCadena`, con anti-repetición vía `flags.minijuegosRecientes`) / `textoDeMinijuego` / `veredictoDeMinijuego`. `systems/serie.js` y `systems/amateur.js` dejan de hardcodear id, stat e impacto; `resolver` conmuta por `efecto.tipo`, no por `id`. **Cierra D20.** Impactos iniciales = los de hoy (regla de proceso 2) | ✅ (2026-09-05) |
| **9R4b** | `el cupo se reparte` | El bootcamp deja de consumir el cupo de la serie (`serie.preSerieUsado` propio): el internacional recupera su jugada de mapa y su rueda de prensa. El **mapa que cierra la serie** ofrece la jugada aunque no sea parejo — constante nueva `serie.margenMapaCerradoDecisivo`, atada al mapa de DESEMPATE (2-2), no a cualquier match point | ✅ (2026-09-05) |
| **9R4c** | `el banco de mecánicas` | Seis mecánicas nuevas de UI, contrato intacto `montar(container, state, onDone, rngUi)`, más `comun.js` (motion reducido, teclado, ventana por stat) y el retrofit de `bootcamp`/`robarBaron`, que animaban sin mirar `prefers-reduced-motion` | ✅ (2026-09-05) |
| **9R4d** | `la apuesta antes, el veredicto después` | El panel dice **qué se juega antes de jugarlo** (principio rector 3, reglas de proceso 13 y 16): `lecturaDeVentana` en el core, `crearApuesta` en la UI, más el ajuste visual que salió de mirar las capturas | ✅ (2026-09-05) |
| **9R4e** | `calibrar el banco` | Sólo constantes: impacto y spread propios por minijuego (impacto agregado +11,94% → **+12,56%**, banda 0,3%-35%). El cooldown se midió en 3/4/6 y no cambia nada: la repetición que queda es de los momentos con una sola mecánica | ✅ (2026-09-05) |

### El esquema de `minijuegos.json`

```json
{
  "id": "robar_baron",
  "momentos": ["mapa_cerrado", "mapa_decisivo"],
  "roles": ["jungla"],
  "statRelevante": "mecanica",
  "efecto": { "tipo": "mapa" },
  "impacto": 0.12,
  "spread": 0.2,
  "titulos": ["El Barón está bajo", "…", "…"],
  "descripciones": ["…", "…"],
  "apuesta": "Si sale, el mapa se te va a favor; si no, se complica.",
  "veredictos": { "bien": ["…"], "parejo": ["…"], "mal": ["…"] }
}
```

`efecto.tipo` ∈ `mapa` (corre el resultado del mapa vía `impacto`) · `stat` (`target`:
`mentalidad` / `hype` / `sinergia`) · `roster` (`flags.bonusJerarquiaTryout`). `roles: []` = todos.
`momentos` ∈ `mapa_cerrado` · `mapa_decisivo` · `pre_internacional` · `post_serie` · `tryout`.

### El banco de mecánicas (9R4c)

| id | mecánica | stat | roles | momento |
|---|---|---|---|---|
| `last_hit` | 5-6 minions con la vida bajando: rematar en la ventana de ejecución, que abre `laneo` | `laneo` | top, mid, adc | mapa cerrado |
| `el_combo` | la secuencia Q-W-E-R se muestra 1,5 s y hay que repetirla con el teclado | `mecanica` | todos | mapa cerrado / decisivo |
| `dodge` | esquivar 3-4 skillshots moviéndose con flechas o WASD | `mecanica` | todos | mapa cerrado |
| `la_vision` | plantar N wards en las zonas correctas antes de que corra el reloj | `macro` | support, jungla | mapa cerrado |
| `el_kite` | alternar mover/atacar en ritmo contra una barra de tempo | `mecanica` | adc | mapa cerrado |
| `el_teleport` | elegir el momento del TP sobre una barra que corre: tarde no llega, temprano lo tirás | `macro` | top | mapa cerrado / decisivo |

Con los 5 de hoy quedan **11 minijuegos** y cada rol tiene 4-5 elegibles: `la_llamada` deja de ser el
default de cuatro roles, y la anti-repetición de 9R4a hace el resto.

Requisitos duros que vienen de la fase T y ya son checks vigentes: cero color literal fuera de
`tokens.css` · cero `Math.random()` (todo por `rngUi`) · **teclado** (toda mecánica se termina sin
mouse) · **`prefers-reduced-motion: reduce`** (nada que dependa de una animación para ser jugable) ·
`dist/` ≤ 1200 KB (1092 KB medidos en T6, re-medir).

### Checks de la fase 9R.4

```
Esquema: todo minijuego declara momentos, statRelevante, efecto válido, impacto,
   ≥3 títulos y los tres veredictos; statRelevante existe en player.stats
MONTAR_MINIJUEGO tiene exactamente una entrada por id del JSON, y al revés
   (hoy nadie lo verifica: un id sin widget rompe el navegador y no validate.js)
elegirMinijuego es determinista y no consume RNG
Todo minijuego declara su apuesta, y la apuesta se ve ANTES de jugarlo
El internacional ve su jugada dentro del mapa (hoy 0 de 643)
Ninguna mecánica se lleva más del ~35% de los minijuegos jugados
El impacto sigue acotado: acertar siempre rinde más que fallar siempre, y menos de +35%
```

### Deudas

- **D20 — cerrada por 9R4a**: cada minijuego pasa a tener su `impacto`/`spread` propio, en el dato.
- **Deuda nueva, familia D37**: más minijuegos = más tiradas de `resolverAuto` ⇒ el stream se corre.
  Ninguna seed anterior reproduce su carrera; el determinismo intra-versión queda intacto.

## 9R.5 — El final y la tarjeta compartible (gancho de El Ídolo, adelanta la FASE 10)

Hoy la carrera **no tiene un final exitoso**: `terminado: true` existe en tres lugares y los tres
son fracasos anteriores a ser profesional; el 69% de las carreras sigue "en_carrera" a los 35. La
tarjeta final es *"todo el motor de difusión del juego"* (`CONCEPTO` §1/§9) y no existe. Además
cierra el falso positivo D37 del check "Nadie se queda varado" (el veterano de 35 que no se retira).

Versión acotada de la **FASE 10** de `PLAN.md` (§10.1-10.3). **Sin** 10.4 (lesiones / servicio
militar) — eso queda para la FASE 10 real.

**Orden de commits:**

| # | Commit | Qué entra |
|---|---|---|
| **9R5a** | `retiro.js: la carrera termina` | `src/systems/retiro.js` nuevo, una línea en `ETAPAS_SPLIT` **después de `mercado`**. Semántica nueva (riesgo alto, `PLAN.md` §10.1): `phase: 'retirado'` = `terminado: false`, ventana de vuelta abierta; `state.terminado = true` lo setea **solo** este sistema. Terminales: `burnout`, `prohibicion_familiar`, `no_llego`. Reversibles: `sin_equipo`, `retiro_elegido`, `retiro_por_lesion`; `vueltasMaximas: 2`. Los tres `terminado: true` actuales pasan a marcar `finAnticipado` y dejar que `retiro.js` cierre. Disparador provisional (sin 9M): mercado sin llamar `splitsSinOfertaParaRetiro` (~2) pretemporadas seguidas **y** `etapa === 'declive'` o `age >= edadDeclive`; **o** el jugador se baja en el evento de cierre de edad desde `edadRetiroOfrecible` (~26). Red anti-loop: 24 años en `amateur` → `no_llego`. **Trampa D10**: `secundario.js` usa `BALANCE.amateur.edadLimite` para congelar su flag — si se toca, darle umbral propio |
| **9R5b** | `la tarjeta de legado` | `src/systems/legado.js` (puro): `veredicto = plantillaDeArquetipo(registro) + modificador + detalleÚnico` (`PLAN.md` §10.2), 8 arquetipos gateados por `registro.porOrg`/`registro.titulos`/`finAnticipado`. `src/ui/screens/tarjeta.js`: la pantalla, **reusa `filaHistoria`** de `ui/components/ficha.js:43` y `crearBarra`/bandas de `core/ficha.js`. Marco distinto por final (confeti / sobrio). **Toda salida es una tarjeta** (§10.3). `state.tarjeta` (objeto nuevo, poblado por `legado.js`). `index.html`: `renderResumenFinal` monta `#tarjetaPanel` vía `ui.renderTarjeta`; `render.js` exporta `renderTarjeta` |
| **9R5c** | `calibrar la duración` | **solo constantes**: `splitsSinOfertaParaRetiro`, `edadRetiroOfrecible`, `edadDeclive`, hasta que los checks de duración caigan en banda |

**Checks 9R.5** (de `PLAN.md` §10.5, los alcanzables sin 9M):

```
CERO carreras agotan maxSplitsDeSeguridad                          (hoy 69% sigue "en carrera" a 60 splits)
mediana de splits como pro ∈ [8, 18]                               (banda ancha sin el mercado de 9M)
llega a age >= 30 ∈ [1%, 8%]
la duración de la carrera correlaciona con el potencial oculto (r > 0.4)
Ningún final —incluidos los amateur— sale sin `state.tarjeta` poblado
Ningún arquetipo de veredicto supera el 25% de las carreras (CONCEPTO §11)
El veredicto cita al menos un hecho real del registro de ESA carrera
`phase: 'retirado'` con `terminado: false` es alcanzable; la vuelta funciona y respeta `vueltasMaximas`
```

## 9R.2 (bis) — Que la barra que te mata se vea

> Esta es la parte de UI de la §9R.2 de arriba, separada porque va **después de 9R.5** en el orden
> revisado. El punto 3 (`pesoJugadorEnEquipo`) y el punto 1 (`modificadores` a escala) se mudan a
> 9Rg y 9R.3 respectivamente.

- **`core/ficha.js`**: `bandaDeMentalidad(state)` / `bandaDeHype(state)` (misma forma que
  `bandaDeJerarquia`). Mentalidad: `al límite` (cerca de `atributos.burnoutUmbral`) · `tensionado`
  · `entero` · `en llamas`. Hype: reusa las bandas del eje `estatus`/`hype` de `core/contexto.js`.
  Se suman a `fichaCompleta`.
- **`ui/components/ficha.js`** rama profesional: fila `MENTALIDAD {v} · {banda} — HYPE {v} · {banda}`
  después de las barras, con flecha ▲▼ contra `edadSnapshot` (misma mecánica que `deltasDeStats`;
  `CAMPOS_EDAD` ya incluye ambos). Mentalidad en rojo bajo `burnoutUmbral` — el aviso que no existe.
- **`atributos.js` `moverStatsDeCurva`** (commit de tuneo aparte): bajar `config.velocidad` de las
  curvas para que un bump de evento tarde ~10-12 splits en diluirse, no ~5.

**Checks 9R.2 (bis):**

```
Mentalidad y Hype aparecen en el objeto que consume la ficha profesional
Un +N de evento a un stat de curva sigue medible ≥ 10 splits después (hoy ~5)
El burnout no puede pasar sin que la banda de Mentalidad haya estado en `al límite` ≥ 2 splits antes
```

## 9Rc + 9Rd — Que elegir el campeón importe

> Detalle de las dos filas `9Rc`/`9Rd` de la tabla de §9R.1. El plan completo, con los tramos de
> código citados, quedó en el archivo de plan mode aprobado el 2026-09-03. **Regla de proceso 2**:
> 9Rc estructura, 9Rd estructura, el tuneo de `afinidadPesoEnRendimiento` y los tres
> `puntosEnJuegoParaPreguntar` va a 9Rg.

**El problema, medido:** el motor puntúa el campeón con una fórmula (`calcularRendimiento`, solo
maestría), lo elige con otra (`deseoPorCampeon`, maestría²×afinidad) y lo pausa con una tercera
(`factorDraftFecha`, solo afinidad). Puede auto-pickear un campeón peor, y para cuando la elección
da igual (`dominancia < 1.35`) — al revés del principio rector (`PLAN.md:100-102`).

**9Rc — un solo criterio:**

- **`core/fuerza.js`** (nuevo, puro, sin RNG): `rendimientoBase(state)` (todo `calcularRendimiento`
  menos el `gauss`) y `fuerzaDelEquipo` **movida tal cual** desde `systems/rendimiento.js`, que las
  re-exporta. `calcularRendimiento` queda en `clampStat(rendimientoBase(state) + gauss(…))` — un
  solo `gauss`, mismo orden: **T1-neutral**. Mismo movimiento que la fase 8 con `nivelDelJugador`.
- **`factorDeCampeon(campeon, weights)`** en `core/ajusteMeta.js`: maestría **y** afinidad, reusa
  `afinidadDeCampeon`. Constante nueva **`rendimiento.afinidadPesoEnRendimiento: 0.15`** (la mitad
  de `maestriaPesoEnRendimiento`, `CONCEPTO` §6). Con afinidad neutra = el `factorMaestria` de hoy.
  `rendimientoBase` la usa en vez de `factorMaestria`.
- Los cuatro puntos de elección (`decisionDeDraft`, `decisionDeDraftFecha`, los dos `resolverAuto`)
  ordenan/pesan por `factorDeCampeon`, no `deseoPorCampeon`. `pesoDePick = factorDeCampeon **
  sesgoMaestriaEnPick` (monótona, no invierte el orden). Cuando el motor elige por vos: argmax, no
  sorteo → el auto-pick peor se vuelve imposible por construcción.
- `factorDraftFecha(elegido, base, weights)` cambia de firma: `clamp(ratio de factorDeCampeon − 1,
  ±impactoDraftFecha)`. Elegir el mismo campeón del split da **exactamente 0** (hoy suma siempre —
  doble conteo).
- `deseoPorCampeon` **se queda** donde el compounding de maestría² es diseño: `campeones.js`,
  `elegirCampeonRival`, `campeonComodin`.

**9Rd — se para cuando hay algo en juego:**

- **`probabilidadDeGanar(fp, fr, σ₁, σ₂)`** en `core/numeros.js`: `Φ((fp−fr)/√(σ₁²+σ₂²))` logística
  sobre `rendimientoBase`, cero RNG. Constante **`numeros.factorLogisticoNormal: 1.702`**.
- `puntosEnJuego` = `P(con el mejor) − P(con el segundo)`. Pausa **sii `puntosEnJuego ≥ umbral`**.
  Constantes nuevas `serie.puntosEnJuegoParaPreguntar`,
  `serie.puntosEnJuegoParaPreguntarDecisivo` (el mapa decisivo **baja** el umbral a la mitad, no lo
  saltea), `temporada.puntosEnJuegoParaPreguntar`. Excepción incondicional
  `disponibles.length === 2`. Se **borra `serie.dominanciaClara`** (D31). `motivoPrincipal ===
  'parejo'` en una fecha nunca pausa.
  - **Recalibrado al implementar (2026-09-03):** el plan escribió `0.04 / 0.015 / 0.07`, pero medido
    daban **mediana 3 drafts/serie y 7% de series sin draft** — el propio check pide `≤1` y `≥30%`.
    La distribución real de `puntosEnJuego` tiene su mediana en ~`0.13` (un umbral de `0.04` frena el
    85% de los drafts). Valores que cierran el check: **`0.18 / 0.09 / 0.16`** (mediana 1, 32% de
    series sin draft). Elegir el valor inicial de una constante nueva es parte de aterrizar la
    estructura; el ajuste fino contra el presupuesto de decisiones re-medido sigue siendo 9Rg.
- **`lecturaDePick(campeon, weights, pool)`** en `core/ajusteMeta.js` (pura, sin números): matriz
  3×3 afinidad-al-parche × maestría-relativa-a-tu-pool → frase que suena a LoL ("la tenés verde y
  el parche la pide", "la dominás pero quedó a contramano"). `construirDecisionDraft` (en
  `systems/serie.js` y `systems/temporada.js`) la muestra por opción, ordenadas por
  `factorDeCampeon` desc. Bandas en `BALANCE.draft.lectura`.

**Checks 9Rc+9Rd** (regla de proceso 7 — verificar que fallan contra `HEAD` antes de arreglar):

```
probabilidadDeGanar: monótona, simétrica (P(a,b) = 1 − P(b,a)) y exactamente 0.5 en el empate
El motor nunca elige por vos un campeón peor que otro disponible: 0 violaciones en 300 carreras
Nadie te para por un pick que no mueve el partido: 0 pausas con puntosEnJuego < umbral (salvo len==2)
Elegir el mismo campeón del split en una fecha marcada da factorDraftFecha == 0
La afinidad al meta mueve el rendimiento (pool en meta vs a contramano, dos poblaciones)
Toda opción de draft trae su lectura, y su orden coincide con factorDeCampeon
Mediana de decisiones de draft por serie ∈ [0, 1], y ≥30% de series con 0 drafts
```

## Checks nuevos de la fase 9R (para que nada regresione)

```
Decisiones por carrera completa: mediana ∈ [95, 130], p90 ≤ 165        (248 antes de 9R; 115/153 al cerrarla)
   ↑ corregido en 9Rg (2026-09-05). El [60, 85] se escribió comparando contra El Ídolo del Potrero
     —que resuelve una carrera en 5-10 minutos— y ANTES de que existieran los minijuegos de 9R.4,
     las fechas marcadas de 9Re y el retiro de 9R.5. Contradice PLAN.md:80 ("la larga: 25-40 min").
     Medido: las tres palancas de 9Rg no cierran esa brecha y dos ni apuntan ahí; bajar de 95 exige
     BORRAR una categoría entera de decisión (práctica, rutina de offseason o cierre de edad), que
     es diseño y no calibración. Si se quiere, se elige cuál — no se deriva. Ver PROGRESO.md 9Rg
Ningún sistema aporta > 35% de las decisiones de la carrera mediana   (hoy temporada 44%)
Repeticiones del evento más repetido: mediana ≤ 4, máximo ≤ 8         (hoy 14 / 32; check de §7.2 recuperado)
El cooldown se mide en splits: expira EXACTAMENTE en splitCount+cooldown
Ningún evento reaparece antes de que expire su cooldown declarado: 0 violaciones
El fixture es un round-robin real: N-1 jornadas, cada par una vez
La tabla no miente: posición relativa media en la jornada 1 ∈ [0.35, 0.65]
Cada fila de la tabla cumple ganados+perdidos === jornada, en TODA jornada
Nadie te para por un pick que no mueve el partido: 0 pausas con puntosEnJuego < umbral
El motor nunca auto-pickea un campeón peor que otro disponible: 0 violaciones
Mediana de decisiones de draft por serie ∈ [0, 1], y ≥30% de series con 0 drafts
El jugador ve ≤ 1 fecha marcada por split competitivo, y 1 en el 40-75% de ellos
La reacción postpartido no repite: máximo 6 apariciones del mismo evento por carrera
El presupuesto de interrupción no consume RNG: 0 llamadas
Ningún split gasta más interrupciones de las que su presupuesto permite
Outcomes con `modificadores`: ≥ 60%
Separación en valor esperado entre opciones de un mismo evento: ≥ 3 pts
Eventos que nunca salen en 200 carreras: 0                            (hoy 4)
Carreras sin final a los 35 años: 0                                   (hoy 69%)
```

## Deudas nuevas

- **D37** — 9Ra corre el stream de RNG: ninguna seed anterior reproduce su carrera. Familia
  D21/D22/D35. Determinismo intra-versión intacto.
- **D38** — 9Rb reordena (no agrega) llamadas de RNG al intercalar los resultados ajenos con las
  fechas del jugador. Familia D21.
- **D39** — ~~9Rb destapó un **sesgo de +6 puntos** en la proyección de jerarquía de la tarjeta de
  oferta~~ — **cerrada en 9Rg (2026-09-05)**. La causa real no era la calibración de
  `jerarquiaAlFichar` sino QUÉ promete la tarjeta: mostraba la jerarquía del instante de firmar, y
  el jugador la lee al cerrar ese mismo split, cuando `rendimiento.js` ya la movió. Medido sobre
  438 fichajes: el real terminaba +6,45 arriba (mediana +6). `BALANCE.roster.derivaPrimerSplit: 6`
  se suma a la proyección; `roster.js` sigue asignando el valor crudo al firmar. Después: sesgo
  **+0,45**, error medio 7,45 → 5,19, p90 16 → 11. El check pasa a acotar el sesgo a **±3** y los
  outliers a 14/28.
- **D26(c)** reaparece: con 9Re la celda `stakes: parejo` queda alcanzable-y-casi-nunca-alcanzada;
  `cobertura.js` la va a reportar. Anotar, no arreglar acá (cobertura mide cantidad, no pertinencia).

---

# FASE 9R.0 — COHERENCIA Y VARIEDAD

> **Insertada el 2026-09-03** tras una segunda tanda de feedback del usuario: jugó una partida
> (seed `1720243215`) y salió con ~25 quejas. Reproducidas headless, la mayoría son **bugs
> medibles**, no sensación — y casi todas ya estaban en el PLAN.md, pero en fases que quedaron para
> el final. Esta fase adelanta las correcciones baratas y de alto impacto en cómo se siente el
> juego. El diagnóstico completo y el mapeo queja→fase→gap vive en
> `.claude/plans/eres-un-experto-*.md` (aprobado por el usuario). Orden de commits:
>
> | # | Commit | Gap que tapa |
> |---|---|---|
> | **9R0a** | `matar la repetición de fechas marcadas` | `career.ultimoEliminadoPor` nunca se limpiaba + `career.orgs` sticky + fixture determinista → la MISMA línea de fecha marcada ("la revancha contra tal") salía hasta 15 splits seguidos. El PLAN.md sólo preveía "más frases" (9R.3), no el bug de selección. |
> | **9R0b** | `feedback de resultado de minijuego` | `onDone(resultado)` → `responder` y sigue de largo. El jugador no ve si clavó el minijuego. UI pura. |
> | **9R0c** | `encender ventana en todo el catálogo` | La fase 7.2 se dio por cerrada con `ventana` gateando 26/97 eventos → bootcamp de pretemporada cae en playoffs. |
> | **9R0d** | `que cada split remate en algo` | 2 de cada 3 splits terminan en una línea `[rendimiento]` técnica. Ninguna fase le da un cierre legible al split que no es de playoffs. |
> | **9R0e** | `el mercado lee tu nivel` | Adelanto quirúrgico de 9M.3 (sin el sim NPC): `roll(0, techo)` ignora que sos el mejor de la liga → "franquicia, clasificado a Worlds, me quedé sin equipo". |
>
> Hallazgo anotado, tuneo a 9Rg: **9R0f** — `rendimiento` satura en 100/100 (~20× en la seed del
> usuario); un jugador de élite debería orbitar ~85-95 con techo real.

## 9R0a — matar la repetición de fechas marcadas ✅

**Archivos:** `core/temporada.js` (`motivosDeFecha`), `systems/temporada.js` (`FRASES_MOTIVO`,
`ETIQUETAS_MOTIVO`, `continuarTemporada`, `resolverFechaMarcada`), `core/state.js`
(`flags.motivosFechaRecientes`), `data/balance.js`, `dev/validate.js`.

- **`career.ultimoEliminadoPor` se limpia** al jugar la revancha (`resolverFechaMarcada`, cuando el
  motivo principal es `revancha` contra ese rival). Antes: sólo lo escribía `serie.js`, nadie lo
  borraba → la revancha se marcaba cada split para siempre.
- **`clasico` acotado a los últimos `clasicoOrgsRecientes: 2` ex-equipos** (`motivosDeFecha`), no a
  toda org por la que pasaste alguna vez.
- **Cooldown por par (motivo, rival):** `flags.motivosFechaRecientes` (`[{motivo, rival, splitCount}]`,
  T4). Un par recién marcado no se re-marca hasta `motivoRivalCooldownSplits: 4` splits después. Si
  el único motivo libre está en cooldown, el split pasa resumido, y está bien.
- **Frases variadas:** `FRASES_MOTIVO` de 7 lambdas fijas a **5 variantes por motivo**;
  `ETIQUETAS_MOTIVO` a 3. Elección determinista por `hash(rival) + splitCount` — **no toca el `rng`**,
  no corre el stream.
- **Medido (200 carreras):** línea de fecha marcada idéntica más repetida por carrera — mediana
  **9 → 2**, máx **33 → 6**. Determinismo intra-versión intacto. `simulate.js 400 60 todas`: 0 crashes.
- **Checks nuevos:** cada motivo tiene ≥5 frases / ≥3 etiquetas sin duplicados; la línea de fecha
  marcada más repetida por carrera tiene mediana ≤4 y máx ≤10.

## 9R0b — feedback de resultado de minijuego ✅

`index.html` (`mostrarMinijuego`). El motor ya recibía el `resultado` 0-1 y seguía de largo. Ahora
el `onDone` pinta un beat de 1,6 s — `¡Clavado! / Salió parejo / No salió` + la consecuencia
concreta por tipo de minijuego — antes de llamar a `responder`. No toca el motor. e2e en Chrome
real (CDP).

## 9R0c — encender `ventana` en los eventos atados al calendario ✅

**Archivos:** `data/events/{competicion,rol/*,drama_prensa,negocios,marcas_vivas,escena_2026}.json`,
`dev/validate.js`. **`data/contextos.js` describe `ventana` desde el paso 7 y sólo 26/97 eventos lo
declaraban** → un `international_trip` o un momento dentro de un partido caía en pretemporada igual.

- **20 eventos gateados** (26 → 46 con `ventana`): los 5 de `competicion` (`international_trip` /
  `worlds_dream` / `el_equipo_ideal_del_split` → `['playoffs']`, `title_run` →
  `['regular','playoffs']`, `el_invicto_se_corta` → `['regular']`), los 11 de `rol/*` (momentos
  dentro de un partido → `['regular','playoffs']`), y 4 de ventana de mercado (`transfer_rumor`,
  `el_agente_te_llama`, `el_ano_muerto`, `el_servicio_que_se_viene` → `['pretemporada']`).
- El resto del catálogo (salud, familia, negocios, identidad reflexiva) **puede pasar en cualquier
  ventana** y no se fuerza: el retrofit completo de los 51 restantes es contenido, va a **9R.3**.
- **Rutinas por tier (D11):** deferido — gatear `bootcamp_corea` a tier 1/2 deja al tier 3 sin
  `agresiva` en offseason y hay que escribir una de reemplazo. Sigue en fase 13, con la nota.
- **Check nuevo:** todo evento de categoría `competicion` o `rol_*` declara `ventana` con valores de
  `EJES.ventana`. `cobertura.js --huecos`: sin huecos nuevos.

## 9R0e — el mercado lee tu nivel ✅

**Archivos:** `systems/mercado.js` (`generarOfertasParaLiga`), `data/balance.js`, `dev/validate.js`.
Adelanto quirúrgico de 9M.3 sin el sim NPC: sólo cambia **cuántas** ofertas llegan y **de qué
orgs**, no cuánto pagan (`salarios.js` intacto).

- `roll(0, techo)` con sesgo etario a secas → `demanda = clamp(0.5 + (nivelDelJugador − liga.prestigio)
  / brechaNivelRango, 0, 1)`; `piso = round(demanda × ofertasPisoPorDemanda)`; `techo` escala con
  la demanda por encima del techo etario. Un jugador claramente por encima de su liga tiene
  **piso ≥ 2-3 ofertas siempre**.
- Las ofertas laterales vienen de orgs a `afinidadOfertaRango` de tu nivel (peso `1/(1+|fuerza−nivel|/rango)`),
  no siempre de las más fuertes → un 50-media no firma con el mejor equipo de la liga.
- **Medido (300-400 carreras):** "Nadie te llama" a un jugador ≥10 sobre su liga: **21 → 0**;
  el silencio de mercado que queda (22/300) es **todo de jugadores a nivel de su liga o por
  debajo**. Firmas/renovaciones por carrera: mediana 5, p90 7 (sin flood). 63% de las firmas son
  con org a ≤20 de tu nivel.
- **Check nuevo:** 0 pretemporadas sin ofertas para un jugador ≥10 sobre su liga; ≥90% del
  silencio le toca a un jugador a-nivel-o-por-debajo. (Verificado en rojo contra HEAD: 21 casos.)

## 9R0d — que cada split remate en algo ✅

**Archivos:** `systems/rendimiento.js`, `dev/validate.js`. 2 de cada 3 splits no son de playoffs y
cerraban con una sola línea `[rendimiento]` "terminó 4º de 10" — sin decir qué significa ese 4º
("los 3 splits no sirven para nada, clasificar es un cartel").

- `consecuencias()` emite una línea `temporada` de **qué hay en juego** tras el recibo de
  rendimiento: tier 1 → "dentro de la zona de playoffs" / "a N de la zona" / "afuera por N";
  tier 2/3 (sin bracket, fase 4) → "arriba de todo" / "en la mitad de la tabla" / "peleando abajo".
- **La excepción**: el split de cierre que clasifica a playoffs devuelve `null` — lo narra
  `serie.js` con su propia fanfarria, no se duplica.
- 4 variantes por banda, elegidas por `hash(liga)+splitCount` — **no toca el `rng`**, T1-neutral.
- **Check nuevo:** todo split competitivo que no clasifica a playoffs cierra con una línea
  `temporada` no técnica de qué significa la posición (0 de 2986 sin ella).

> **9R.3 cerrada** (9R3a-f, 2026-09-04). Catálogo: 97 → **218** eventos, 150 → **438** opciones.
> `rol/*` 11 → **45**; amateur 3 → **28** con `etapa` propia; 0 eventos muertos; `cobertura.js
> --huecos` vacío al listón 6 (era 3); evento más repetido mediana 14→3 / máximo 32→6 desde antes
> de 9R. Sigue el orden de PLAN.md: **9R.4** (los minijuegos de verdad). Nota de proceso: la fase
> **T** (transmisión, UI) corre en paralelo en otra sesión — T0/T0b/T1 cerradas, siguiendo con T2+.
> 9R.4 tiene una superficie de UI (feedback de minijuego, ya resuelta en 9R0b) pequeña; el resto
> de la cola (9Rg, 9M-lite) es motor/datos puro y no colisiona con `src/ui/`.

---

## FASE 9M-lite — el mundo tiene escena

> No es el sim de ~340 NPCs de la FASE 9M completa (planteles de 5 con edad/contrato/retiro,
> `core/plantel.js`, alguien-te-saca-el-asiento-con-nombre, descenso con contrato que viaja). Eso
> es **9M-full**, diferida (decisión del usuario de ir liviano). Esto da la *sensación* de escena
> viva por una fracción del costo — y es motor/datos puro, sin superficie de `src/ui/`, así que
> puede avanzar en paralelo de la Fase T sin colisionar.

| # | Qué entra | Estado |
|---|---|---|
| **9ML.a** | Otras ligas vivas (digest anual): `src/systems/escena.js` + `src/core/escena.js`, una línea en `ETAPAS_SPLIT` justo después de `edadCierre`. Al cerrar cada año, sortea hasta 4 ligas de tier 1 ajenas y resuelve su campeón/subcampeón por `weightedPick` sobre `org.fuerza` (el mismo escalar que ya usa `rendimiento.js`) + un campeón "mundial" sobre las seis ligas. 4-5 líneas `type: 'escena'`, `tecnico: false`. | ✅ (2026-09-04) — validate 118/118 (check nuevo incluido), simulate 1000 sin crashes, determinismo 150/150 |
| **9ML.b** | `org.fuerza` deriva año a año (`gauss` chico + empujón por resultado del digest de 9ML.a). Sin esto, el mapa de fuerzas de una carrera de 15 años es idéntico en el año 1 y en el año 15 — hoy así es. | ⬜ |
| **9ML.c** | El archirrival corre su carrera (`src/systems/rival.js`, adelanto acotado de la fase 11.2): uno de los 5 `mundo.rivales` se promueve a `mundo.archirrival` y le corren nivel/org/títulos en silencio. Aparece en la ficha, en el digest de 9ML.a, y en el `stakes: 'rival_de_generacion'` que ya existe. | ⬜ |
| **9ML.d** | Transferencia de región: `mercado.js` puede ofertar desde otra liga tier 1; `contexto.js` deja de fijar `residencia: 'local'` (usa `splitsDeResidencia`, ya existe en `core/valorMercado.js`). Cierra D29 parcialmente. | ⬜ |
| **9ML.e** | Calibrar (solo constantes). | ⬜ |

### 9ML.a — otras ligas vivas (digest anual) ✅ (2026-09-04)

- `core/escena.js` (puro): `ligasParaDigest`, `todosLosOrgsTier1`, dos formateadores de línea.
  `systems/escena.js`: early-return sin `rng` fuera del cierre de edad (regla de proceso 10);
  va después de `edadCierre` en el registro para que `resolverDecision` retome ahí si ese sistema
  pausó — el digest nunca se salta un año.
- Check nuevo: *"El digest anual de otras ligas se ve en toda carrera de ≥2 años, y el campeón no
  es siempre el mismo"* — 150 seeds, 0 carreras de ≥2 años sin digest, ≥5 organizaciones campeonas
  distintas.
- **Medido:** validate 118/118, simulate 1000 sin crashes, determinismo intra-versión 150/150,
  build OK.
- **Colateral D37:** sistema nuevo con `rng` en el cierre de cada edad — el stream se corre para
  toda carrera de ≥1 año. Determinismo intra-versión intacto.

---

# FASE T — LA TRANSMISIÓN

> El juego está terminado por dentro y roto por fuera. Esta fase no inventa nada de juego: conecta
> a la pantalla lo que el motor ya calcula, y le pone encima un sistema de diseño para que las
> fases que faltan tengan dónde enchufar su pantalla.
>
> Estética **broadcast de esports**, **desktop primero**, cero dependencias nuevas.

## T.0 — El estado, medido

Auditado el 2026-09-04, antes de escribir nada:

| Qué | Estado real |
|---|---|
| Hojas de estilo | **0 archivos `.css`.** Las 773 líneas de CSS viven en un `<style>` dentro de `index.html` (líneas 7-780) |
| Custom properties | **0.** El único `:root` es `color-scheme: dark`. ~120 clases con ~20 hex repetidos a mano, `#8ea3c7` catorce veces |
| Media queries | **0.** El layout aguanta por el `auto-fit` de los grids; no hay diseño pensado para ningún tamaño |
| Fuentes cargadas | **0.** `font-family: Inter` está declarada y **Inter nunca se carga** → hoy el juego se ve en Arial |
| `transition` en CSS | **0.** Un solo `@keyframes` en todo el proyecto, de 180ms, dentro de un minijuego |
| `aria-*` / `role=` | **0.** Cero `:focus-visible`, cero `prefers-reduced-motion` |
| `<svg>` / iconos | **0.** La iconografía entera son 5 emojis y los glifos `▲ ▼ ·` |
| Pantallas | **2** (`#setup` / `#carrera`) + 3 paneles que se prenden con el atributo `hidden` |
| Meta de la página | `lang`, `charset`, `viewport` y `<title>`. Nada más (P.4 sigue abierta) |
| `src/ui/` | 670 líneas en 10 módulos — la extracción de la fase 8b, correcta y sin estilo propio |

Y del otro lado, **el motor calcula un montón de cosas que no se muestran en ningún lado**:
`career.temporada.tabla` (la tabla de posiciones completa, ordenada), `career.temporada.calendario`
(el fixture round-robin con rival y fuerza), `career.temporada.cruces`, `serie.mapas` (el camino
mapa a mapa con los quemados del Fearless), `meta.tierList`, `meta.regimen`, `career.companeros`
(4 compañeros con nombre y nivel), `career.contrato` entero, `valorDeMercado()`, `mundo.rivales`
(los 5 rivales de generación), `registro.picos`, `contexto.marcas` (26 posibles), y los 16 valores
de `log.type`, que la UI hoy **no usa para nada**.

## T.1 — Por qué esta fase existe, y por qué no contradice la regla 12

`PLAN.md` borró a propósito la fase de "refinamiento visual" el 2026-09-02 y la reemplazó por la
**regla de proceso 12** (*"ninguna fase cierra sin su pantalla"*), con la justificación de que el
modelo de dejar lo visual para el final ya había producido *"siete fases correctas hundidas en un
feed de logs"*.

**Esta fase no es ese pulido diferido: es el sustrato.** Hoy cada fase nueva paga el costo de
inventar su estilo desde cero — la fase 8 midió **+330 líneas de `<style>`** solo por la ficha. Si
T entra antes, las pantallas que 9M.8, 10.2, 11 y 12 ya tienen escritas salen del sistema en vez de
sumar otras cuatro tandas de CSS suelto que después hay que unificar igual.

**Por eso va después de que cierre 9R y antes de 9M.**

> **Contradicción documental a arreglar en esta fase.** `CLAUDE.md:9` (*"priorizar la lógica de
> juego y el balance sobre la estética inicial"*) y `CLAUDE.md:73` (*"construir primero el motor y
> los sistemas de datos; el visual vendrá después"*) quedaron sin sincronizar cuando se instauró la
> regla 12. Se actualizan en T0.

## T.2 — Decisiones del usuario (textuales — respetarlas, no volver a preguntar)

- **Estética: broadcast de esports.** Lower-thirds, scoreboard, telemetría. Números grandes en
  condensada, un acento cyan de "en vivo" más oro para logros.
- **Desktop primero.** Layout de aplicación con paneles; el celular es la versión reducida.
- **El nombre del juego se decide después.** El sistema de identidad se diseña con un lockup
  tipográfico que funcione con cualquier nombre corto.
- **Entran las cuatro features**: guardado + link de carrera · tarjeta final a PNG ·
  motion + audio · pantallas nuevas de contexto.

## T.3 — Restricciones duras

1. **Cero dependencias.** Sin framework, sin bundler. `build.js` ya lo dice: *"el proyecto no tiene
   ninguna y esta fase no es excusa para agregar la primera"*. Las fuentes se **auto-hospedan**; no
   se linkea a Google Fonts (sería la primera dependencia de red del proyecto).
2. **Cero `Math.random()`**, tampoco en efectos visuales (regla invariable 1). Lo que necesite azar
   usa `rngUi`, el stream separado que ya existe.
3. **El motor no toca el DOM** (regla invariable 2). `core/guardado.js` es **puro**
   (`serializar`/`deserializar`); el `localStorage` vive en `src/ui/almacenamiento.js`, para que
   `validate.js` y `simulate.js` sigan corriendo en Node.
4. **No se retunea una sola fórmula** (regla de proceso 2). Esta fase expone, no recalcula.
5. **No se inventan datos.** El motor **no tiene KDA, oro, torres ni duración**: un partido es
   victoria/derrota + `rendimiento` 0-100 + campeón + posición. Dibujar un box score inventado
   violaría la regla 15.
6. **Sin escudos reales de las orgs** (decidido en "fuera de alcance": licencias). Monograma + color
   derivado del nombre con `hashCadena`, que ya existe.

## T.4 — Commits

| # | Commit | Qué entrega |
|---|---|---|
| **T0** | el sistema de diseño | `src/ui/estilos/` + fuentes auto-hospedadas. El juego se ve distinto sin mover una sola pantalla |
| **T0b** | el candado y el vocabulario visual | El usuario probó T0: `button:hover` ponía `--ink` (casi blanco) de fondo sobre un reposo ya sólido — dos golpes de luz, el segundo cegaba — y "se parece al anterior" (T0 tokenizó color pero no cambió una sola forma: 17 rectángulos redondeados iguales). Se arregla el hover ("se arma, no se prende": reposo tenue, hover sólido) con candado en `validate.js`; se rompe la silueta con fondo en capas, esquinas de encuadre en el escenario, lower-thirds a radio 0, telemetría densa en los 6 atributos, y una pestaña de categoría en decisión/mercado/minijuego. Solo CSS + `guards.js`/`validate.js`, ni una línea de `index.html` ni de `src/ui/*.js` |
| **T1** | el shell de transmisión | Grid de dos zonas (riel izq + escenario; el riel der llega vacío hasta T5 — "un panel vacío es peor que un panel ausente") desktop-first + breakpoints + teclado. El shell se escribe en `index.html` como HTML declarativo con los mismos `id` de siempre — no un DOM armado desde `shell.js` — para que el controlador existente no se toque y una corrida desatendida no pueda dejar la página en blanco por un error de montaje |
| **T2** | la ficha es el HUD | El riel izquierdo permanente, con contrato, valor de mercado y marcas que hoy no se ven |
| **T3** | el escenario y el reproductor | El split se resuelve en beats, no de un salto. Audio sintetizado, apagado por defecto |
| **T4** | la decisión con jerarquía | Banner por categoría (18 valores reales medidos, agrupados a 11 familias) y peso bisagra/cierre/normal (dos campos reales, no el "ambiente" inventado que decía una versión vieja de este plan) — sin motor |
| **T5** | el riel de contexto | Tabla, calendario, plantilla, meta y generación. Cinco paneles, cero motor — la tabla se deriva en vivo (`career.temporada.tabla` es un campo muerto durante toda la temporada, ver T5) |
| **T6** | el partido y la serie | Tarjeta de resultado (derivada, sin tocar `systems/`), barra de bracket, el camino mapa a mapa, los 5 minijuegos migrados con `rngUi` explícito |
| **T7** | la tarjeta final y el PNG | El legado de fase 9R5b ya traía marco+veredicto+historia; T7 suma 5 marcos por color (no 2), export a canvas 1200×630 y copiar link/imagen |
| **T8** | la página como página | P.2 (guardado, único cambio de motor de la fase), P.3 (seed en la URL — destapó un bug real en `server.js`), P.4 (meta y OG, sin imagen propia todavía), P.5 (repo) |

## T0 — El sistema de diseño

```
src/ui/estilos/
  tokens.css        color, tipografía, espacio, radios, motion, colores de categoría
  base.css          reset, foco, scrollbar, grano, prefers-reduced-motion
  componentes.css   ficha, barras, botones, banners, tarjetas, feed
  fuentes/          inter-var-latin.woff2, barlow-condensed-600.woff2, -700.woff2
```

`src/ui/` **ya está** en el `A_COPIAR` de `build.js` → estilos y fuentes se copian a `dist/` solos.
Solo hay que sumar `.css`, `.woff2`, `.svg` y `.png` a los `mimeTypes` de `server.js`.

**Paleta** (reemplaza los ~20 hex sueltos de hoy):

```css
:root{
  --bg-void:#05070d; --bg-chrome:#0a0e17; --bg-surface:#0f1420;
  --bg-raised:#161d2c; --bg-sunken:#070a11;
  --line-faint:rgba(148,176,255,.08); --line:rgba(148,176,255,.15);
  --line-strong:rgba(148,176,255,.28);
  --ink:#e8eefc; --ink-dim:#93a3c4; --ink-mute:#5b6883;
  --live:#2ee8ff; --live-glow:rgba(46,232,255,.35);   /* el acento de transmisión */
  --gold:#ffc861;                                      /* logro, hito máximo, título */
  --up:#3ddc97; --down:#ff5f56; --warn:#ffab4a; --danger:#ff3355;
  /* las 11 categorías de decisión de la fase 12.1, como tokens desde el día uno */
  --cat-rutina:#6b7a99;  --cat-golpe:#ff4d4d;  --cat-oportunidad:#3ddc97;
  --cat-mercado:#ffc861; --cat-parche:#a97bff; --cat-vestuario:#4d8dff;
  --cat-prensa:#48d6ff;  --cat-familia:#ff9646; --cat-salud:#c1272d;
  --cat-partido:#e8402a;
}
```

**Tipografía.** Dos familias auto-hospedadas, subset latin, ~85 KB en total:

- `--font-display`: **Barlow Condensed** 600/700 — banners, marcadores, el nivel grande. Es la voz
  de broadcast. Fallback `"Arial Narrow", system-ui`.
- `--font-ui`: **Inter Variable** — todo lo demás. Arregla de paso el bug de hoy. Con
  `font-variant-numeric: tabular-nums` en todo número: sin eso, un contador que sube tiembla.

Escala tipográfica `11 12 13 15 17 21 28 40 64 96` · espacio `4 8 12 16 24 32 48 64` ·
radios `--r-sharp:2px --r:8px --r-lg:14px --r-pill:999px` + `--chamfer:10px` (corte de esquina por
`clip-path` en los paneles hero: es la firma visual de la fase).

**Motion:**

```css
--dur-fast:120ms; --dur:220ms; --dur-slow:420ms; --dur-beat:700ms;
--ease:cubic-bezier(.16,1,.3,1);   /* expo-out */
@media (prefers-reduced-motion:reduce){
  *{animation-duration:1ms!important;transition-duration:1ms!important}
}
```

**Los cinco detalles que hacen el trabajo:** la banda LIVE de 3px con punto que pulsa · el grano
(un SVG de ruido inline al 3%, `position:fixed`, `pointer-events:none`) · el chaflán · los números
tabulares con conteo animado · el anillo de foco en `--live`.

**Nuevo — `src/ui/formatoUi.js`**: monograma y color de org (`hashCadena(nombre) % 360` → hue;
determinista, cero rng — resuelve la restricción de "sin escudos reales"), e icono + color por cada
uno de los 16 `log.type`.

## T1 — El shell de transmisión

**Revisado en la corrida de T0b/T1** (2026-09-04): el criterio original de este bloque decía
*"`shell.js` monta el layout, `index.html` queda en ~120 líneas"*. Eso implica construir el DOM
del shell desde JS — y el controlador de `index.html` busca todo por `getElementById`: si algo
falla al montar, la página queda en blanco. Mal negocio en una corrida sin supervisión. En cambio:
**el shell se escribe como HTML declarativo**, conservando cada `id` que el controlador ya usa
(`fichaContainer`, `summary`, `decision`, `minijuego`, `mercado`, `logList`, `tarjeta`,
`nuevaCarrera`, `run`, `rolGrid`, `campeonGrid`, `seedInput`, `handleInput`, `poolContador`,
`metaPill`), y **`shell.js` queda solo con comportamiento** (teclado + ticker), importado como
módulo. El controlador no se toca ni una línea: cero riesgo de página en blanco por un fallo de
montaje, y de paso mejor arquitectura para un proyecto sin bundler.

Consecuencia de lo mismo: **el layout es de dos zonas, no tres.** El riel derecho es la fila de
paneles de T5, y hoy no hay con qué llenarlo — la propia regla del proyecto dice *"un panel vacío
es peor que un panel ausente"*. La grilla se declara a dos columnas; T5 agrega la tercera cuando
tenga contenido real.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ●LIVE │ ⌗ NOMBRE │        (el estado del split llega en T2)     ⚙ 🔊 │
├───────────────────┬──────────────────────────────────────────────────┤
│  RIEL IZQUIERDO   │              ESCENARIO                           │
│  #fichaContainer  │  #setup  →  #decision / #minijuego / #mercado /  │
│  (HUD, T2)        │  #tarjeta + #logList                             │
├───────────────────┴──────────────────────────────────────────────────┤
│ TICKER: la última línea de #logList, en marquesina                    │
└──────────────────────────────────────────────────────────────────────┘
```

**Otra revisión, misma causa**: el topbar de la maqueta original mostraba `2033 · SPLIT 2 ·
PLAYOFFS ▓▓▓▓▓░░` en vivo. Esa lectura sale de `estado`, que vive en el *closure* del
`<script type="module">` del controlador — `shell.js`, un módulo aparte, no tiene forma de leerlo
sin que el controlador lo exponga, y exponerlo es tocarlo. En T1 el topbar es **chrome estático**:
la banda LIVE, el punto que pulsa, el lockup (monograma + nombre, diseñado para cualquier nombre
corto — el nombre del juego se decide después) y los toggles ⚙/🔊 **inertes** (`disabled`, con
`title` explicando que llegan con el audio de T3). El estado dinámico del split se cablea en
**T2**, que ya reescribe cómo se pinta la ficha y es el lugar natural para sumar una llamada más
al mismo `pintar()` sin romper la promesa de "controlador intacto" de T1.

| Ancho | Layout |
|---|---|
| ≥1440 | `320px \| 1fr`, escenario máx 860px, centrado en el espacio sobrante |
| 1180–1439 | `280px \| 1fr` |
| 900–1179 | `260px \| 1fr` |
| 640–899 | Una columna; la ficha se vuelve una barra HUD compacta y pegajosa arriba (CSS puro:
  `position: sticky` bajo el breakpoint, sin JS) |
| <640 | Igual, con la escala tipográfica un paso abajo (ya está en `tokens.css` desde T0) |

**Teclado desde el arranque** (`shell.js`, con guardia para no interceptar texto en
`handleInput`/`seedInput`): `Espacio`/`Enter` dispara `#run` o `#nuevaCarrera` cuando están
visibles y habilitados — el sentido de "saltear un beat" llega en T3, cuando el reproductor tenga
algo que saltear; `1`-`4` clickea la opción N de `#decisionOptions` o `#mercadoGrid`, la que esté
visible; `Esc` cierra `<details class="avanzado">` si está abierto, si no dispara `#nuevaCarrera`
cuando está visible. `aria-live="polite"` en `#logList` (atributo estático en el HTML, no hace
falta JS). `role="dialog"` en `#decision` queda para cuando T4 le dé sentido real (categoría +
peso bisagra); ponerlo antes sin esa semántica sería un dialog que no se comporta como uno.

## T2 — La ficha es el HUD

Reusa `fichaCompleta(state)` de `core/ficha.js` **tal cual está** — ya devuelve todo semantizado con
`id`+`label`+banda, y es el único view-model real del proyecto. Cero cambios de motor.

Rediseña lo que ya hay (§8.6: nivel grande por banda, los 6 atributos con ▲▼, las barras con los 4
hitos dibujados, mentalidad/hype, badge internacional, pool con tier) y **suma lo calculado que no
se ve en ningún lado**: el contrato (org, liga, sueldo con `plata()`, años restantes), el valor de
mercado (`valorDeMercado()`, distinto del sueldo), el ranked completo en amateur
(`etiquetaDeRanked()` ya devuelve `"Challenger · 1997 LP (#1 de Brasil)"`), y las marcas de
contexto como chips.

Regla 13 sin excepción: ningún número sale sin banda con nombre, sin flecha o sin comparación.

> **Campos muertos — no dibujarlos (deuda nueva, ver abajo).** `registro.dineroTotalUSD`,
> `registro.picos.rankedPuntos` y `mundo.archirrival` están declarados y **ningún sistema los
> escribe nunca**. Pintar "US$0 ganado" sería mentir. Los paneles que los usarían se ocultan hasta
> que 9M/11 los alimenten.

## T3 — El escenario y el reproductor

**El cambio de sensación más grande de la fase.**

Hoy `avanzar()` corre splits en un `for` hasta que algo interrumpe y **pinta una sola vez al
final**: el jugador ve un salto con ocho líneas de log ya escritas. En un juego cuyo compás es
*"cada split trae 1 o 2 decisiones, nunca más"* (`CONCEPTO` §2), eso tira a la basura el ritmo que
el motor construye.

`src/ui/reproductor.js` toma los `logs` que devuelve **un** `avanzarSplit` y los revela como beats,
uno por uno, en vez de que `renderFeed` los reemplace todos juntos de un `replaceChildren`.

**A diferencia de T1, esta fase SÍ toca el controlador** (`avanzar()`/`responder()` pasan a async,
con una guardia `reproduciendo` para que dos invocaciones no se solapen si el jugador dispara dos
veces mientras el reproductor todavía está revelando la tanda anterior) — es la pieza responsable
de CUÁNDO se pisa el split siguiente, así que es exactamente lo que hay que cambiar. El motor no
se toca: `pipeline.avanzarSplit`/`resolverDecision` se llaman igual que siempre, mismo `rng`, mismo
resultado — solo cambia cuándo el DOM se entera.

**Revisado contra lo implementado (2026-09-04) — tres recortes de alcance, a propósito:**

1. *"Cada log entra con icono y color por `type`"* y **D41** (`log.type` sin usar en la UI) siguen
   **sin resolver**. El reproductor solo lee `entry.tecnico` (ya existía) para decidir si suena el
   tick — no diferencia los 16 `type` emisores visualmente. D41 sigue abierta.
2. *"Los `tecnico:true` se agrupan en una tira compacta"* — no entró. Se revelan igual que el resto,
   dimmed (`.log-item--tecnico`, ya existía desde antes de T3).
3. *"Saltear con click / Espacio / botón ▸ SEGUIR"* — no hay un skip por beat. El control de
   ritmo quedó a nivel de **velocidad**, no de beat individual: pasar a `instantáneo` (el toggle
   del topbar) es el skip — reproduce el comportamiento de antes de T3 sin pausas. Un skip fino
   por beat queda para si hace falta más adelante, no se inventó una interacción que nadie pidió.

Lo que **sí** entró tal cual el plan: `type:'temporada'` sigue siendo una línea de texto (la
tarjeta de resultado real es de **T6**, como corresponde — la frase original del plan la
mencionaba acá, corregido). Velocidad `x1/x2/instantáneo` cíclica desde el topbar, persistida en
`localStorage`. `instantáneo` **y** `prefers-reduced-motion: reduce` saltan la espera entre beats.

**Impacto de motor: cero**, verificado (no solo asumido): sandbox aislado con el motor tal cual
commiteado + solo los archivos de `src/ui/`, `validate.js` 117/117, determinismo intacto. El tope
`maxSplitsDeSeguridad` se mantiene intacto.

`src/ui/sonido.js` — sintetizador WebAudio (~105 líneas), **sin un solo archivo de audio**: click
(delegado en `document` desde `shell.js`, cualquier `<button>`), tick de beat, stinger de
victoria/derrota (leído de los contadores de `career.registro`, no de texto del log — no hay un
campo booleano en ningún log), swell de bisagra (`decision.datos.evento.bisagra`, ya existe desde
antes de T4 — el sonido no necesitaba esperar la parte visual), y arpegio de título (exportado,
sin disparador todavía: espera la tarjeta de legado de **T7**). **Apagado por defecto**, toggle en
la topbar, `AudioContext` creado recién en el primer click real sobre ese mismo toggle.

## T4 — La decisión con jerarquía

Adelanta **la mitad visual de la fase 12**, porque los cables ya están tendidos y no cuesta una
línea de motor.

**Re-medido antes de implementar (2026-09-04), dos correcciones sobre la versión anterior de este
bloque:**

1. Los eventos declaran `category` en **18 valores reales** (medido con grep sobre
   `src/data/events/**/*.json`, no los "21 valores" que decía la versión vieja — esa cifra
   confundía **21 archivos** con valores distintos; hay repetidos, ej. `estatus.json` y
   `marcas_vivas.json` comparten `identidad`). Se agrupan a 11 familias sobre los tokens `--cat-*`
   de T0 en `src/ui/formatoUi.js` — tabla completa ahí, con la fuente de cada mapeo.
2. El tercer peso **"ambiente" no corresponde a ningún campo real** — no existe en el modelo de
   datos. Los dos pesos reales son `evento.bisagra` (booleano, ya usado en `pool.json`) y
   `franja === 'cierre'` (lo pone `systems/edadCierre.js`, distinto de `'normal'`). `pesoDeDecision`
   en `formatoUi.js` deriva de esos dos, nada más.

- **Banner por categoría** (12.1): `familiaDeCategoria(category)` en `formatoUi.js`. Solo aplica a
  decisiones que vienen de `decisionDesdeEvento` (`systems/events.js`) — es la única función que
  arma `datos: { evento }`. Las de `systems/temporada.js` (fecha marcada) y `systems/amateur.js`
  (la rutina semanal) no traen el evento completo en `datos`, así que caen al banner genérico
  "Decisión" — **no es un bug, es el límite real de "T4 no toca motor"**: sumarles el evento
  completo a esos `datos` es tocar `systems/`, y no correspondía a esta fase.
- **Peso visual** (12.2): `bisagra` engorda el borde, agrega glow del color de categoría y una
  marca de agua enorme (`content: attr(data-tab-label)`) al 6% de opacidad — no un velo de pantalla
  completa (eso pide un overlay aparte); `cierre` reusa el oro de "hito" que ya significa lo mismo
  en toda la ficha desde T0b, con el rótulo "Fin de año" en vez de la categoría.
- Opciones como tarjetas con label, descripción y el atajo de teclado **visible** (`.option-atajo`,
  un cuadradito con el número 1-4 — `shell.js` los escucha desde T1, pero hasta esta fase el atajo
  era invisible).
- **"El dado trajo tres caminos"** (12.4, regla 16) — **no entró.** Es una convención de
  *redacción* de la `descripcion` de cada decisión (`mercado.js` la escribe a mano), no algo que
  la UI pueda generar sola sin inventar texto. Generalizarla es reescribir la `descripcion` de
  decenas de eventos JSON — trabajo de contenido, no de esta fase. Queda para cuando se audite el
  copy en conjunto.

**Verificado jugando de verdad, no solo leyendo el código**: una carrera completa por CDP mostró
los 8 colores de categoría resolviendo bien contra `getComputedStyle` (incluida la propiedad
`--tab-color` anidada, `var(--tab-color, var(--live))` con el color real fijado por JS), un peso
`bisagra` real (`pool.json`, "Se te enfrió Ornn") y ocho `cierre` ("Fin de año", dorado).

**Lo que sigue siendo de la fase 12** (necesita motor de verdad, no se toca acá): `previa`, `riesgo`
derivado de la dispersión medida de outcomes, `gate`, `rareza`, y el campo `categoria` **declarado**
en el JSON con su check estático — T4 usa una tabla de derivación como puente y la fase 12 la
reemplaza por el campo real.

## T5 — El riel de contexto

Cinco paneles, **todos con datos que el motor ya calcula. Cero motor.**

| Panel | Fuente | Qué muestra |
|---|---|---|
| **Tabla** | `tablaDePosiciones(registrosOtros, filaPropia)`, derivada en vivo | La liga ordenada, tu fila resaltada, la línea de corte de playoffs y la de cupos internacionales |
| **Calendario** | `career.temporada.calendario` + `.indice` | El fixture: jugadas, la de hoy, las que vienen, con rival y fuerza |
| **Plantilla** | `career.companeros` + `sinergia` | Los 4 compañeros con nombre, rol y nivel; sinergia como barra |
| **Meta** | `meta.regimen` + `meta.tierList` | El régimen con nombre y tu pool marcado contra la tier list del parche |
| **Generación** | `mundo.rivales` | Los 5 rivales con los que arrancaste. Hoy se generan y no se ven nunca (deuda D8) |

Los paneles **se ocultan** cuando no hay dato (el amateur no tiene tabla ni plantilla). Nunca se
muestran en cero: un panel vacío es peor que un panel ausente. El colapso de la tercera columna
del riel es CSS puro (`:has()`), sin que el controlador tenga que togglear una clase por render.

> **`career.temporada.tabla` es un campo muerto — descubierto jugando, no leyendo el código.**
> Este bloque decía "Fuente: `career.temporada.tabla`" y ese campo existe, pero
> `avanzarFechaSilenciosa` (`systems/temporada.js`) nunca lo escribe: actualiza
> `registrosOtros`/`filaPropia`/`indice` cada fecha y deja `.tabla` en `[]` toda la temporada regular.
> Se llena una única vez, al CERRAR la temporada, en el mismo golpe que pone `activa: false` — leerlo
> tal cual habría mostrado el panel vacío toda la temporada y con datos reales justo cuando ya no
> corresponde mostrarlo. La fuente real que usa el panel es `tablaDePosiciones(registrosOtros,
> filaPropia)` — la misma función pura que `systems/temporada.js` ya llama para el texto del log de
> cada fecha —, derivada en el momento sobre los dos campos que sí se actualizan. Cero motor: ninguna
> línea de `systems/` se tocó, solo se dejó de leer un campo que nunca tuvo datos útiles en vivo.

## T6 — El partido y la serie como transmisión

**La tarjeta de resultado de fecha.** Revisado antes de implementar: el plan original decía "sale
de `motivo` con sus 7 `stakes`" como si fuera un campo leíble después de resolver — no lo es.
`systems/temporada.js` arma la frase completa (`fraseDeMotivo` + resultado + posición + campeón)
en un solo log `type:'temporada'`, pero **nunca la deja en campos separados**, y `fechaEnCurso`
(donde vivía el `motivo` antes de resolver) se resetea a `null` en el mismo golpe que resuelve la
fecha. Guardar el motivo estructurado ahí sería tocar `systems/temporada.js` — y **T6, como T4 y
T5, es cero motor** (el único cambio de motor de toda la fase T es T8).

La tarjeta usa en cambio lo que **sí** persiste sin tocar nada:
- `career.temporada.calendario[indice - 1]` → rival, fuerza del rival, local/visitante (la fecha
  recién jugada, disponible porque `indice` ya avanzó).
- El signo de `career.temporada.racha` → victoria/derrota (siempre correcto post-resolución, no
  hace falta re-derivarlo).
- `tablaDePosiciones(registrosOtros, filaPropia)` derivada en vivo (mismo hallazgo que T5) →
  posición nueva.
- El `message` completo del log, tal cual, como cuerpo de la tarjeta — no se re-parsea (frágil:
  un cambio de redacción rompería el parser en silencio) ni se inventa un campo que no existe.

**Sin KDA inventado** (T.3.5): el motor no tiene esos números y la tarjeta no los muestra.

**La barra de bracket** (12.5): `CUARTOS DE FINAL · SEMIFINAL · LA FINAL` (etiquetas de
`core/serie.js:etiquetaDeRonda`, no `core/temporada.js` — ojo con el import), superadas en `--up`,
la actual pulsando en `--live`. Sale de `serie.ronda`; la ronda `'internacional'` (fuera del
bracket de 3 pasos) se muestra sola, con su propio título.

**El camino de la serie**: `serie.mapas` (`[{campeon, resultado:'W'|'L'}]`) y `serie.quemados`, tal
cual estaban. Marcador mapa a mapa, quemados tachados.

**Los 5 minijuegos se migraron** de `index.html` a `src/ui/components/minijuegos/`, uno por
archivo + un `index.js` de barrel (mismo patrón que `render.js`). Contrato:
`montar(container, state, onDone, rngUi)` → `onDone(0..1)`. `rngUi` entró como **cuarto parámetro
explícito**, no como el closure implícito que tenían dentro de `index.html` — moverlos a módulos
propios significa que ya no hay closure que compartir, y pasar la dependencia explícita es mejor
práctica que la alternativa (un import de un singleton). "Contrato intacto" se cumple en lo que
importa: la forma `(container, state, onDone) → onDone(0..1)` y que siguen comiendo de `rngUi`,
nunca del `rng` del motor.

## T7 — La tarjeta final, el PNG y el link

**Revisado antes de implementar**: la pantalla de legado **ya existía**, escrita en la fase 9R5b
(`src/ui/screens/tarjeta.js`) — no era una pantalla nueva, tenía marco por `TITULO_MARCO` (5
títulos+ícono, uno por `finAnticipado`), veredicto, franja de totales y la historia org por org
(reusando `filaHistoria` de `core/ficha.js`, tal como decía el plan). Lo que **de verdad** faltaba,
medido contra el CSS real: el marco visual (borde/color) solo distinguía 2 tonos —
`.tarjeta--exito`/`.tarjeta--sobria` — así que el mundialista y el pibe al que no lo dejaron jugar
**sí compartían marco** cuando ninguno de los dos era "éxito" (§10.3 incumplida en la práctica,
aunque el título ya fuera distinto). T7 sube esos 2 tonos a 5 colores reales, uno por
`finAnticipado` (`data-marco` en el DOM), con `--live`/`--warn`/`--danger`/`--line-strong`/
`--cat-familia`; el dorado de éxito sigue ganando cuando aplica (necesitó `.tarjeta.tarjeta--exito`
— dos clases juntas — para no perder por especificidad contra `.tarjeta[data-marco]`).

**Exportar a PNG** — `src/ui/exportar.js`, canvas 2D a mano, **1200×630** (medida de OG, así la
misma rutina sirve para las dos cosas):

- `await document.fonts.ready` **antes** de dibujar.
- Los colores se leen de los tokens vía `getComputedStyle` en vez de duplicarlos en hex — una sola
  fuente de verdad entre el CSS y el canvas.
- `canvas.toBlob()` → `<a download>`.
- `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])` para copiarla, con la
  descarga como fallback donde no esté disponible (`ClipboardItem` con imágenes no está en todos
  los navegadores) — verificado: en Chrome headless sin permiso de portapapeles, el fallback
  entra solo, sin que el jugador vea un error.

**Copiar link de esta carrera** (P.3): `?seed=N`. Es la función social que `CONCEPTO` §9 llama
*"todo el motor de difusión del juego"*. **Solo la mitad del círculo**: esta fase agrega el botón
que arma y copia el link; que ABRIR ese link precargue la seed es T8 (`leerSeed()` today solo mira
el input, no la URL) — split a propósito entre las dos fases, no un olvido.

## T8 — La página como página

Cierra los bloqueantes que quedan de la **FASE P**. El detalle completo vive allá; acá va lo que
esta fase ejecuta, y lo que cambió al implementarla.

- **P.2 — El guardado** (deuda D36, el último bloqueante real). `mulberry32` gana
  `.estado()`/`.restaurar(n)` — puramente aditivo, `state` sigue siendo la única variable que
  gobierna la secuencia. `core/guardado.js` puro (`serializar`/`deserializar`, clave `version`,
  guarda también `rngUiEstado` para que los minijuegos no repitan la misma tirada al continuar);
  `src/ui/almacenamiento.js` hace el `localStorage` (mejor esfuerzo: si falla, la carrera sigue
  jugándose igual, solo que sin red de seguridad). La pantalla de inicio ofrece **Continuar**,
  visible solo si `hayCarreraGuardada()` es real. Se guarda al cerrar cada split (siga de largo o
  pare en una decisión — las dos son "una pausa"); se borra si la carrera termina o si se arranca
  una nueva a propósito. **Es el único cambio de motor de toda la fase**, verificado con dos
  chequeos (no uno): `.restaurar()` reproduce exacto sobre 5 seeds (corrida interrumpida vs.
  corrida de corrido) **y** 12 seeds viejas siguen dando la misma huella `finAnticipado:splits:
  soloqElo` contra el motor pre-T8 vía `git archive HEAD`. Cero divergencias en los dos.
- **P.3 — La seed en la URL.** `?seed=N` precarga el input (`leerSeedDeUrl()`), sin arrancar la
  carrera sola. **Esto destapó un bug real y preexistente en `server.js`**: `req.url === '/'` se
  comparaba CONTRA el querystring todavía pegado, así que `/?seed=N` nunca calzaba con `'/'` y cada
  visita con seed caía derecho al 404 — el link que arma T7 nunca había funcionado, porque hasta
  esta fase nadie había visitado la página con un querystring real. Corregido: cortar el `?`
  primero, decidir la raíz después.
- **P.4 — La página.** `description`, Open Graph + Twitter card, favicon (SVG inline — el mismo
  monograma cyan del topbar, cero archivo binario nuevo), `<title>` (el nombre del juego sigue
  siendo el placeholder: decidirlo era explícitamente "después", T.2). **Sin imagen propia**: no
  hay forma en este entorno de generar un archivo de imagen real sin tocar el controlador de
  producción solo para exponerle `estado`/`modulos` a una captura automatizada — y el plan pide
  autoría a mano, no un headless en el build. Queda declarado como pendiente, no silenciado.
- **P.5 — El repo.** `README.md`, `LICENSE` (MIT) y la línea de descargo de proyecto de fan.
- **`build.js`** gana un check de pre-flight: `url()` de CSS y `<link href>` de HTML, misma
  verificación de capitalización exacta que P.7 ya hacía para los imports de JS. Encontró un falso
  positivo real al escribirlo: el grano de `base.css` es un SVG en un `data:` URI que trae su
  propio `url(%23n)` (un filtro interno) — el regex, sin saber que estaba anidado en OTRO `url(
  "data:...")`, lo leía como una ruta rota. Se filtran los especificadores que empiezan con `#`/
  `%23` antes de resolverlos. Verificado además que el check agarra un caso real (capitalización
  cambiada a mano, build falla; restaurada, pasa).

## T.5 — Archivos

**Nuevos**

```
src/ui/estilos/{tokens,base,componentes,pantallas,shell}.css + fuentes/*.woff2
src/ui/shell.js  reproductor.js  sonido.js  formatoUi.js  exportar.js  almacenamiento.js
src/ui/components/{banner,resultado,bracket}.js
src/ui/components/minijuegos/{robarBaron,laLlamada,bootcamp,ruedaDePrensa,laPrueba}.js
src/ui/paneles/{tabla,calendario,plantilla,meta,generacion}.js
src/ui/screens/{decision,mercado,serie,temporada,legado}.js
src/core/guardado.js
```

**Modificados**

```
index.html            1360 → ~120 líneas: shell + <link> + el bucle de control
src/ui/render.js      el barrel crece
src/ui/components/*   los 6 actuales, reescritos sobre los tokens
src/ui/screens/*      los 3 actuales, reescritos
src/core/rng.js       .estado()/.restaurar() — el ÚNICO cambio de motor
src/dev/build.js      check de capitalización en CSS
server.js             mimeTypes: .css .woff2 .svg .png
CLAUDE.md             líneas 9 y 73 (la contradicción con la regla 12)
DISENO.md             §4.1, el árbol de src/ui/
```

**Reusar, no reescribir**: `fichaCompleta()`, `filaHistoria`/`filaMomento`, `crearBarra`,
`crearStatRow`, todo `core/formato.js`, `etiquetaDeRanked`/`rangoAproximado`/`percentil`,
`describirContexto`, `etiquetaDeRonda`, `hashCadena` y `rngUi`.

## T.6 — Fuera de alcance

Framework, bundler, cualquier dependencia · backend, cuentas, tabla de récords, analytics (P.9) ·
box scores de partida (el motor no tiene los datos) · escudos reales de las orgs · retunear
cualquier fórmula · mecánicas nuevas · `previa`/`riesgo`/`rareza` (siguen siendo fase 12).

## T.7 — Checks de la fase T

```
Cero `Math.random()` en todo `src/ui/` (el guard de build.js ya lo verifica)
Cero `document` fuera de `src/ui/` (guards.js; `core/guardado.js` NO puede tocar localStorage)
Ningún color literal (hex/rgb/hsl) fuera de `tokens.css`, y ningún `background`/`background-color`
de un `:hover`/`:active`/`:focus` usa un token de tinta (`guards.js`, candado de T0b)
Toda la UI corre con `prefers-reduced-motion: reduce` sin perder información
Una carrera completa se termina solo con teclado
Contraste ≥4.5:1 en todo par (texto, fondo) de los tokens
~~`dist/` ≤ **1200 KB**~~ — **techo re-fijado en P.6 (2026-09-15).** Historial de la trampa T6 en
esta sola línea, porque cada vez que se citó un número viejo estaba mal: 576 KB (fase P) → 725 KB
(T0) → 950 KB (re-medido en T0b, otra sesión había sumado 9R3c/9R3d) → 1041 KB (T2) → 1080 KB (T5)
→ 1092 KB (T6) → 1561 KB (2026-09-13, sobre un build del 9/9 anterior a 10c/11/12) → **1482 KB
(2026-09-15, build de hoy, con 10c/11/12 completas)**. La causa de fondo ya no existe:
`build.js:301` solo reportaba el peso y nunca lo hacía fallar, así que subía sin que ningún check
lo marcara; ahora `PESO_MAXIMO_KB = 1700` en `build.js` hace fallar el build si `dist/` lo supera —
no vuelve a hacer falta re-medir a mano para saber si se rompió el techo
T8: la misma seed con N llamadas restauradas produce la misma secuencia que correrla de corrido
T8: las seeds anteriores a T8 siguen reproduciendo su carrera (huella idéntica)
```

## T.8 — Verificación end-to-end

Por cada subfase, la Definición de terminado de `CLAUDE.md` completa (`validate.js`, determinismo,
`simulate.js 1000`, commit, `PROGRESO.md`), más `npm run build` — que ya compara 12 seeds × 30
splits entre `src/` y `dist/`.

Específico de esta fase:

1. **Determinismo con lupa en T8.** Antes y después de tocar `rng.js`, huella
   `finAnticipado:splits:soloqElo` sobre ≥12 seeds contra `git archive HEAD` (trampa T1). Cero
   divergencias, o no entra.
2. **Recorrida visual en Chrome headless por CDP** (el método de 8b y P.10): una carrera entera
   capturando cada pantalla a **1440 / 1180 / 900 / 640 / 390 px**. Consola limpia, cero 404, y el
   body sin scroll horizontal en ningún ancho.
3. **Una carrera completa sin tocar el mouse.**
4. **Una carrera con `prefers-reduced-motion: reduce`** y otra en velocidad `instantáneo`.
5. **T8 en la URL publicada, no en localhost** (P.8): jugar hasta la mitad, **recargar la pestaña**
   y confirmar que sigue donde estaba; abrir el mismo `?seed=N` en dos navegadores y confirmar que
   la carrera es idéntica; probar en Chrome, Firefox, Safari y un móvil.

---

# FASE 9M — EL MERCADO DE PASES

> La fase 9 construyó **el contrato**. Esta construye **el mercado**: el mundo se puebla de
> jugadores con carrera propia, las orgs pasan a tener huecos y presupuesto, alguien más compite por
> tu asiento, y la escalera competitiva deja de ser un dado. Va **antes de la fase 10** porque el
> retiro que esa fase promete ("te retirás cuando el mercado deja de llamarte") solo es honesto si
> existe un mercado que pueda dejar de llamarte.

## 9M.0 — El diagnóstico, medido

Sonda propia sobre 120 carreras × 45 splits (más 60 × 45 para el conteo de eventos), 2026-09-02:

| Síntoma | Medido | Qué significa |
|---|---|---|
| Fichajes con elección real | **3,05 por carrera** | El mercado se abre 3 veces en 15 años de juego |
| Pretemporadas con el mercado en silencio | **3,80 por carrera** | *"Te queda un año de contrato"* y nada más |
| Ligas distintas pisadas por carrera | **media 1,48 · máximo 2** | Nadie, en 120 carreras, jugó en 3 ligas |
| Tier al cierre | **89 de 120 en tier 1 · 0 en tier 2** | La escalera es una cinta de un solo sentido |
| Carreras que terminan en 45 splits | **32%** | El 68% sigue apretando botones a los 30 (D2) |
| Decisiones por carrera | **162**, top-10 familias ≈ **40%** | La repetición vive en `events/partido/` |

Y la causa, leída en el código:

1. **El jugador es un pasajero.** El ascenso tier2→tier1 es `chance(0.12 + jerarquia/100 × 0.45)`
   (`systems/competitivo.js:124`). Ganar la liga no cambia nada; perderla tampoco. La forma de la
   carrera la decide un dado sobre una stat, no los resultados.
2. **El mundo es de cartón.** Una org es literalmente `{ nombre, liga, fuerza }`
   (`core/mundo.js:57-80`) — sin presupuesto, sin plantel, sin historia. Los compañeros son
   `{ handle, role, nivel }` **regenerados de cero cada vez que cambiás de equipo**
   (`systems/roster.js:18`): sin edad, sin contrato, sin memoria. Los 5 rivales de generación
   tienen `puntaje: 0` y `desenlace: null` y **nadie los escribe nunca** (D8). No existe un solo
   jugador NPC con carrera propia en todo el repo.
3. **El mercado no tiene demanda.** `generarOfertasParaLiga` tira `roll(0, techo)` y reparte entre
   las orgs de **tu liga solamente**, pesado por `org.fuerza` (`systems/mercado.js:138-167`). Nadie
   compite por tu asiento; nadie te puede echar; no se puede negociar, ni esperar, ni rechazar todo.
   `contrato.clausula` está en el modelo y **siempre vale `null`**; `cupoImports`,
   `minimoResidentes` y `margenImport` están en los datos y **no los lee nadie**.

Deuda que esta fase absorbe: **D8** (a medias), **D16**, **D17**, **D29**, **D30**, **D31** (la
mitad de `margenImport`).

## 9M.1 — Commits

| # | Commit | Contenido |
|---|---|---|
| 9Ma | `fase 9Ma: el mundo tiene gente` | 9M.2 — ✅ 2026-09-06, ver `PROGRESO.md` |
| 9Mb | `fase 9Mb: la demanda existe` | 9M.3 — ✅ 2026-09-06, ver `PROGRESO.md` |
| 9Mc | `fase 9Mc: alguien mas quiere tu asiento` | 9M.4 — ✅ 2026-09-06, ver `PROGRESO.md` |
| 9Md | `fase 9Md: la escalera deja de ser un dado` | 9M.5 — ✅ 2026-09-09, ver `PROGRESO.md` |
| 9Me | `fase 9Me: negociar, no aceptar` | 9M.6 — ✅ 2026-09-09, ver `PROGRESO.md` |
| 9Mf | `fase 9Mf: traspasos a mitad de contrato` | 9M.7 — ✅ 2026-09-09, ver `PROGRESO.md` |
| 9Mg | `fase 9Mg: la pantalla del mercado` | 9M.8 — ✅ 2026-09-09, ver `PROGRESO.md` |
| 9Mh | `fase 9Mh: calibrar el mercado` | solo constantes. **Alcance recortado al medir** (2026-09-10): `derivaPrimerSplit` 6→3 y `renovacionSigmaFactor` 0,35→0,27 despinchan *proyección jerarquía* (±3) y *renovación se desploma* (40%). **Checks 7, 9, "La dinastía" y "series sin draft" NO se cierran con constantes** — la causa es estructural (el asiento de tier 1 siempre está disponible; el mundo se ablanda porque nadie disputa los asientos). Van a 9Mi. Medición en `PROGRESO.md` |
| 9Mi | `fase 9Mi: la escalera cuesta` | ✅ 2026-09-10. Estructural: `ofertaPosible` disputa el asiento contra `nivelAlternativaAsiento` (subida a `core/`, anclada a `max(liga.prestigio, org.fuerza) − alternativaPisoFuerza`); `castigoEtario(edad)` descuenta nivel en la disputa (en puntos, no multiplicativo); `factorRenovacionEtario` corre la misma disputa para tu propio club. **check 9 `r=0,815`** (baseline 0,40). Checks 7 y 9Mi-1 **redefinidos** a "liga mayor (prestigio ≥ 70)" (§9M.12.4) — el original era inalcanzable por estructura (CBLOL/LCP son tier 1, retiro a los 28 empleado). Pirámide (punto 3) **evaluada y diferida**. Corre el stream (D35). `validate.js` 148/148. Ver `PROGRESO.md` |
| 9Mj | `fase 9Mj: recalibrar la escalera` | ✅ 2026-09-10. Solo constantes/topes. "La dinastía" 22,8% → **tope devuelto a 25%**; "series sin draft" 29,8% → **piso devuelto a 28%** (ambos volvieron solos, como preveía §9M.12.3). `castigoEtarioNivel` 18→20 + `factorRenovacionDeclive` 0,35→0,30: check 8 subió a **~14%** (piso 15%, residual — §9M.12.4). check 5 = 5,26. `validate.js` 148/148. Ver `PROGRESO.md` |

**Prerrequisito**: ~~cerrar 9Ec y 9Ed primero~~ — hecho (commit `fase 9Ec+9Ed`, 2026-09-06). El
azar de `index.html` ya vivía en `rngUi` desde la fase P; 9Ed puso el candado en `guards.js`. El
determinismo jugando a mano —cómo hay que verificar la pantalla de mercado (regla 12)— está.

## 9M.2 — El mundo tiene gente

**Archivos**: `src/core/plantel.js` (nuevo, puro) · `src/systems/plantel.js` (nuevo, una línea en
`ETAPAS_SPLIT` de `systems/registro.js:20`) · `src/core/mundo.js` · `src/systems/roster.js`.

`state.mundo.planteles = { [orgNombre]: { top, jungla, mid, adc, support } }`, cada casilla:

```js
{ handle, role, edad, regionId, nivel, potencial, formaCarrera, edadPico,
  contrato: { anios, salarioAnualUSD },
  splitsEnRegion: { KR: 0, CN: 0, ... },
  rivalDeGeneracion: false }
```

Se genera **una sola vez** en `generarMundo`, en posición fija del stream (después de
`generarLigas`, antes de `generarRivales` — trampa T1). Reusa lo que ya existe: `generarHandle`
(`core/mundo.js:27`), `BALANCE.formasCarrera`, `nivelDeCurva` (`core/curvas.js`), y **la misma
escala 0-100 que `nivelDelJugador`** de `core/ficha.js`: un NPC y vos se miden con la misma regla,
que es lo que después deja comparar candidatos para un asiento.

**El cambio que le da vida al mundo sin mover el balance**: `org.fuerza` deja de ser un valor
sorteado y **pasa a derivarse** del promedio de nivel de su plantel, recalculado al cerrar cada
mercado. Al generar el mundo el plantel se sortea *alrededor* del `fuerza` de hoy, así que el día 1
la distribución agregada es idéntica y ningún consumidor (`temporada.js`, `rendimiento.js`,
`serie.js`, `mercado.js`) cambia una línea. Desde el año 2, **un equipo que ficha bien sube de
fuerza y te gana la liga el año que viene.**

`generarCompaneros` (`systems/roster.js:18`) **deja de inventar gente** y pasa a leer
`mundo.planteles[org]`. Ese solo cambio le da memoria al vestuario: si volvés a una org cinco años
después, están o no están los mismos, y ahora tienen edad y contrato.

Los 5 rivales de generación se generan como NPCs normales con `rivalDeGeneracion: true` y viven en
planteles reales — **empieza a cerrar D8**; la ficha del archirrival sigue siendo fase 11.

`systems/plantel.js` corre **solo en offseason** (early return sin tocar `rng`, regla 10):
envejece, mueve `nivel` por la curva, decrementa contratos, retira al que nadie quiere y sube
canteranos de 17-19 desde tier 2/3.

**Presupuesto de cómputo, declarado por adelantado** (D32 ya duele: `validate.js` tarda 6m47s): se
simulan en detalle las 6 ligas tier 1 (~58 orgs) más la tier 2 de tu región (~10 orgs) ≈ **340
NPCs**. El resto de tier 2 sigue con `fuerza` escalar. Si `simulate.js 1500 60 todas` más que
duplica su tiempo base, se recorta el alcance a tier 1.

**Pantalla**: panel de plantel en la ficha — los 5 con nombre, rol, edad y años de contrato.

## 9M.3 — La demanda existe (se acabó el dado)

**Archivos**: `src/core/demanda.js` (nuevo, puro, sin rng) · `src/systems/mercado.js` ·
`src/core/contexto.js` · `src/data/balance.js`.

`asientosAbiertos(state, liga)` → por org y por rol hay asiento si el NPC de ese rol tiene contrato
vencido, se retiró, o el club lo quiere reemplazar. `presupuestoDeOrg(org, liga)` acota lo que la
org puede pagar por ese asiento, descontando lo que ya gasta en los cuatro que se quedan.

`ofertaPosible(state, asiento)` devuelve **bool + el motivo**, y es donde se enciende todo lo que
hoy está muerto en los datos:

- `liga.edadMinima` — hoy solo se mira en la rama del ascenso.
- **`cupoImports` / `minimoResidentes`** — contar cuántos no residentes quedarían en el plantel si
  te firman. Nunca los leyó nadie.
- **`margenImport`** — como import tenés que ser *claramente* mejor que el mejor local disponible
  para ese asiento (`CONCEPTO` §6: "claramente mejor, no apenas mejor"). Constante muerta que pasa
  a estar viva (mitad de D31).
- Presupuesto ≥ tu `valorDeMercado`, y banda de nivel: una org no ficha muy por debajo de su fuerza
  ni puede pagar muy por encima.

`core/contexto.js` deja de escribir `residencia: 'local'` fijo y la calcula con
`splitsDeResidencia`, que **ya existe** en `core/valorMercado.js:20`. Con eso el momento
`import_recien_llegado` deja de ser inalcanzable por construcción y `contrato.tipo: 'import'` se
produce por primera vez. **Cierra D29.**

`sesgoEtario` **no se toca**: sigue decidiendo a quién prefiere el club entre dos candidatos
parecidos. Lo que muere es `roll(0, techo)`. Una oferta deja de ser un dado y pasa a ser una
consecuencia legible: *"Gen.G busca ADC (se les va Nyxel, 27) y te puede pagar $410k."*

**No se tocan** `core/salarios.js` ni `core/valorMercado.js`: están calibrados contra la
investigación de `CONCEPTO` §12.6 y siguen respondiendo *cuánto* paga la oferta que existe.

## 9M.4 — Alguien más quiere tu asiento

**Archivos**: `src/systems/mercado.js` · `src/core/demanda.js`.

En la pretemporada, **antes** de mostrarte nada, el mercado del mundo se resuelve por rondas de
arriba hacia abajo: las orgs más fuertes eligen primero y cada una toma el mejor candidato que
puede pagar y que las cuotas permiten. Los asientos donde vos calificás quedan **congelados** hasta
que respondas.

Si rechazás todo, o esperás, el asiento se cierra con un NPC y el log lo dice con nombre:
*"Karmine Corp firmó a Drakken (mid, 21) para el puesto que te ofrecían."*

Es el cambio que convierte *"elegí una tarjeta"* en **"decidí, y el mundo siguió sin vos"**.
Regla de proceso 16: el azar grande se declara — la pantalla cuenta los 4-6 traspasos que movieron
el mercado.

## 9M.5 — La escalera deja de ser un dado

**Archivos**: `src/systems/competitivo.js` (reescritura parcial) · `src/systems/mercado.js` ·
`src/data/balance.js`.

- **`flags.ascensoPendiente` desaparece.** No hay "ascenso": hay asientos. Si un club de tier 1
  tiene hueco en tu rol, tu nivel entra en su banda y te pueden pagar, te llega la oferta. Si no,
  seguís en tier 2 — y eso es información, no castigo.
- `competitivo.js` queda **solo con tier 3**, que no cambia ("a ese nivel no se negocia"). Se
  borran `probAscensoBaseDesdeTier2` y `probAscensoPorJerarquiaDesdeTier2`.
- **Descenso (cierra D16)**: la org que termina última de una liga con `desciendeA` baja de
  categoría; tu contrato viaja con ella salvo cláusula. Y caer deja de ser imposible por la vía
  natural: si el mercado de tier 1 no te da asiento, el de tier 2 sí.
- **Tu liga deja de ser una jaula**: los asientos son de las 6 ligas tier 1, no solo la tuya. Recién
  ahí `mundo.regionDominante`, `liga.dificultadAdaptacion` y `player.residencias` significan algo.

**Riesgo asumido, anotado como D35**: esto corre el stream de RNG y mueve el balance agregado
entero. Misma familia que D21/D22. Regla de proceso 2: este commit **no retunea ninguna constante**
— primero se mide con la estructura nueva (9Mh).

## 9M.6 — Negociar, no aceptar

**Archivos**: `src/systems/mercado.js` · `src/ui/components/mercado.js` · `src/data/balance.js`.

Tres acciones nuevas, todas **dentro de la misma decisión** (trampa T9: la interrupción es un
recurso escaso, no se multiplica):

- **Pedir más** — subís el pedido un escalón. El club acepta, contraoferta o se levanta de la mesa,
  pesado por cuánto te quieren (la brecha entre vos y su mejor alternativa). El riesgo se declara
  antes de apretar: *"Te quieren mucho: es difícil que se caiga"* / *"Sos su plan B: si apretás, se
  van a otro"*.
- **Pedir cláusula de salida** — `contrato.clausula` deja de valer `null` por primera vez. Se paga
  con sueldo, y a cambio un club grande te puede sacar a mitad de contrato sin que el tuyo opine.
- **Esperar** — no firmás nada esta ventana. Los asientos se cierran. Puede salir bien, o podés
  quedarte libre.

El **representante** deja de ser un reroll de dados y pasa a ser información: te dice qué clubes te
están mirando sin haber ofertado todavía. El check de "una sola vez por carrera"
(`validate.js:1599`) se reescribe con él.

Regla 15 intacta: lo que la tarjeta promete, el motor lo cumple — el patrón `jerarquiaAlFichar` +
`flags.jerarquiaProyectadaAlFichar` se extiende a todo lo que se negocie.

## 9M.7 — Traspasos a mitad de contrato, y el banquillo

**Archivos**: `src/systems/mercado.js` · `src/core/registro.js` · `src/systems/rendimiento.js`.

Hoy, con contrato corriendo, el mercado imprime una línea y no pasa nada: **3,80 pretemporadas por
carrera desperdiciadas**. A partir de acá:

- **Con cláusula**: te vas, tu club cobra, no opina.
- **Sin cláusula**: el comprador ofrece un `traspasoUSD`; tu club acepta o no según cuánto te
  necesita. Vos podés **pedir salir**, y cuesta arraigo y jerarquía si sale mal.
- **Banquillo**: si tu nivel cae por debajo del suplente que tu club tiene o puede fichar, perdés la
  titularidad. La jerarquía se derrumba, jugás la liga de desarrollo y el mercado te tasa peor.
  **Es la puerta al declive que hoy no existe**, y es de donde la fase 10 va a sacar el retiro
  (`CONCEPTO` §12.4: "la causa modal de retiro es que no te renuevan").

Dos cosas rotas que se arreglan acá, encontradas auditando: `registro.dineroTotalUSD` **nunca se
incrementa** (`PROGRESO.md` afirma que `roster.js` cobra `salarioAnualUSD/3` por split; el código no
lo hace, y el check de monotonía pasa trivialmente sobre un 0), y `registro.picos.salarioAnualUSD`
nunca se escribe.

## 9M.8 — La pantalla (regla de proceso 12)

Cada subfase entrega su pedazo; el destino es una pantalla de mercado de tres bloques, montada
sobre el `presentacion: 'mercado'` que la UI y el pipeline headless **ya entienden**:

1. **Vos en el mercado** — valor, banda con nombre (regla 13: ningún número sin referente), quién te
   mira, tu contrato y los años que quedan.
2. **Las ofertas** — las tarjetas de hoy más las acciones de negociación.
3. **El mercado del mundo** — los traspasos cerrados y los asientos que siguen abiertos en tu rol.
   Con esto el jugador entiende *por qué* le llegó lo que le llegó.

Y en la ficha permanente: **sueldo, contrato y valor de mercado**, que hoy no se muestran en ningún
lado pese a estar los tres calculados.

## 9M.9 — Constantes nuevas

Bloque `BALANCE.plantel`: tamaño de plantel, edad de cantera, spread de nivel inicial, velocidad de
retiro NPC, ritmo de reemplazo. Extensión de `BALANCE.mercado`: presupuesto por org, banda de nivel
aceptable, escalones de negociación y su probabilidad de ruptura, precio de la cláusula, fórmula de
traspaso, umbral de banquillo.

**Valores puestos por criterio y medidos después** — regla de proceso 2: nunca cambiar estructura y
retunear constantes en el mismo commit. El retune vive en 9Mh.

> **Deuda de calibrado para 9Mh** (anotada al implementar):
> - `renovacionSigmaFactor` (constante de 9d) drifteó a **43,7%** de renovaciones cayendo bajo la
>   mitad del contrato anterior (estable a n=3000/4500/6000) por el corrimiento de stream de la
>   demanda. El check subió su tope a 45% como parche; 9Mh tiene que bajarlo de vuelta. También
>   revisar `demanda.presupuestoOrgFactor` (8,5, puesto por criterio en 9Mb) y la banda
>   `bandaNivelAbajo`/`bandaNivelArriba`.
> - **9Mc**: dos checks parcheados por el shift de `core/mercadoMundial.js`. (a) El arquetipo de
>   veredicto "La dinastía" pasó a **~27% estable** (tope 25% → 28%). (b) "≥N% de series sin ningún
>   draft" (el mismo que 9Ma bajó a 28%) cayó a **~27,6%** (piso 28% → 26%). La causa de (a) es la
>   deriva agregada de `org.fuerza` de tier 1 (media −3,5 en 60 splits — dentro de la banda
>   pre-9Mc, pero el mundo un poco más blando produce más internacionales). 9Mh: subir
>   `plantel.reemplazoRegresionALiga` (0,4) o bajar la rotación (`demanda.probNoRenovarNpc` 0,04 /
>   `probNoRenovarNpcFlojo` 0,18) para achicar la deriva; devolver los dos topes a su valor
>   (25% / 28-30%).
> - **9Md**: un check más parcheado por el mercado abierto a 6 ligas. `proyeccionJerarquia` — el
>   primer fichaje cae más seguido a un equipo fuerte (`nivelEquipo` alto → `esperado` alto →
>   `brecha` más negativa), y el sesgo de la proyección pasó a **~−3,0** (tope ±3 → ±3,5). El
>   retune de `roster.js` / `core/valorMercado.js` (la deriva del primer split) que ese check ya
>   difería es 9Mh: devolver el tope a ±3. Y las bandas `bandaNivelAbajo`/`bandaNivelArriba`, el
>   `presupuestoOrgFactor` y `mercado.factorDificultadImport` (0,6) para que **check 7** (tier 1 al
>   cierre **77,8%**, tope 65%) y **check 9** (correlación nivel↔mejor liga **r=0,22**, piso 0,5)
>   entren en objetivo — hoy la escalera ya no es jaula ni dado, pero el mercado abierto reparte
>   asientos de primera con demasiada mano blanda.
> - **9Mg** (no es deuda nueva, es algo que la pantalla ahora deja ver): el bloque "Vos en el
>   mercado" pone `valorDeMercado` al lado del sueldo, y en tier 2 la brecha se lee enorme
>   (`sobreSueldoPct` de −70/−80% no es raro) — `valorDeMercado` tasa por el mejor postor de tu
>   liga y `salarioDeOferta` no. Cuando 9Mh toque `core/valorMercado.js` para el **check 9**, mirar
>   que esa línea quede legible: un sueldo muy por encima del valor es una señal válida (contrato
>   heredado, banquillo), pero −80% constante en toda una liga es la fórmula, no el jugador.

## 9M.10 — Checks de la fase

Cada uno verificado en rojo antes de darlo por bueno (regla 7 / trampa T5).

| # | Check | Hoy | Objetivo |
|---|---|---|---|
| 1 | Ninguna org termina la pretemporada con ≠5 jugadores o dos del mismo rol | — | 0 violaciones |
| 2 | Nadie viola `cupoImports` / `minimoResidentes` / `edadMinima` — ni vos ni un NPC | no se comprueba | 0 violaciones |
| 3 | Ningún plantel gasta más que su presupuesto | — | 0 violaciones |
| 4 | Ligas distintas pisadas por carrera | media 1,48 · máx 2 | mediana ≥ 2 y ≥15% pisa 3+ |
| 5 | Fichajes con elección real por carrera | **5,26 (9Mj)** | 4-8 ✅ |
| 6 | Carreras con ≥1 traspaso a mitad de contrato | **24,4% (9Wd)** | ≥24% ✅. Piso bajado 25→24 en 9Wd (mismo criterio que 9Ma 30→28, 9Mc 25→28): más jugadores en el Top 20 mundial (§9W.6) = más franquicias protegidas del traspaso a media temporada. Efecto ~1,6 pp; el check viaja pegado al 25% (±2 pp por seed set) |
| 7 | ~~Tier al cierre = tier 1 ≤65%~~ → **cierre en liga mayor (prestigio ≥70)** | ~33% (9Mi) | ≤45% ✅ 9Mi. **Redefinido** (§9M.12.4): el original era inalcanzable por estructura — CBLOL/LCP son tier 1 y el retiro cae a los ~28 con el jugador empleado en primera |
| 8 | Carreras que caen de tier 1 a tier 2 al menos una vez | **~14% (9Mj)** | ≥15% — **residual** (§9M.12.4). 9Md ~22% → 9Mi 13,5% (stream shift) → 9Mj ~14% con `castigoEtarioNivel`/`factorRenovacionDeclive`. El punto que falta necesita que el piso de franquicia (9R0e) se enfríe con la edad — fuera del "solo constantes" de 9Mj. Sólo métrica de sonda, no hay `check()` |
| 9 | Correlación nivel ↔ mejor liga alcanzada | **r = 0,815 (9Mi)** | r > 0,5 ✅ 9Mi. Anclar la disputa a `liga.prestigio` la creó. Medida: `nivelPico ↔ prestigio de la mejor liga` |
| 10 | Oferta rechazada que sigue disponible sin log de quién la tomó | — | 0 casos |
| 11 | `registro.dineroTotalUSD` > 0 y monótono en toda carrera con contrato | siempre 0 | 100% |
| 12 | `contexto.residencia === 'import'` alcanzable | inalcanzable | ≥10% de las carreras |
| 13 | Determinismo: misma seed → mismo mundo, planteles y traspasos incluidos | — | idéntico |
| 14 | `simulate.js 1500 60 todas` | base a medir en 9Ma | ≤ 2× el base |

## 9M.11 — Verificación end-to-end

```bash
node src/dev/validate.js
node src/dev/simulate.js 1500 60 todas    # 0 crashes
node src/dev/cobertura.js --huecos
node server.js                            # y jugar una carrera entera a mano
```

Aplicada a esta fase, la prueba final del proyecto ("si al final la carrera se puede narrar en cinco
frases sin mirar el log, el juego está"): después de 9M, dos de esas cinco frases tienen que poder
ser sobre el mercado — **a qué club le dijiste que no, y quién te sacó el puesto.**

## 9M.12 — La escalera cuesta (9Mi + 9Mj)

> **Por qué esto se separó de 9Mh (2026-09-10).** 9Mh estaba escrita como "solo constantes" para
> cerrar los checks 7 (tier al cierre = tier 1 ≤ 65%) y 9 (correlación nivel ↔ mejor liga r > 0,5),
> que 9Md dejó fuera de banda. **Midiendo con sondas aisladas se descubrió que ninguna constante los
> mueve** (`bandaNivelAbajo` 14→6: check 7 sin cambio; `probRenovacionBase` 0,55→0,35: sin cambio;
> bandas + `factorDificultadImport` juntos: empeora). El modelo de §9M.9 —"el mercado abierto
> reparte asientos con la mano blanda"— era incompleto: el problema no es *cuántas* ofertas llegan,
> es que **el asiento de tier 1 siempre está disponible**. Con ~58 orgs tier 1 × contratos de 1-3
> años, todos los offseasons hay un hueco en tu rol en alguna liga, y `ofertaPosible` te lo da por
> estar "en banda" (`org.fuerza − 14 ≤ nivel ≤ org.fuerza + 22`) — que no es "sos el mejor
> candidato", es "no sos un desastre". Cualquiera que llega a nivel ~62 (y con `potencialMedia` 74
> casi todos lo cruzan) tiene asiento de primera, todos los años, hasta el retiro forzoso. Medido:
> **el 99% de las carreras que fichan alcanzan tier 1**, y el **74,6%** termina ahí. El usuario lo
> confirmó como defecto: *"que el 95% lleguen a mucho... debería costar más, no todas deberían
> hacerlo"*. Eso es estructural, no de calibrado — de ahí 9Mi.

### 9M.12.1 — El diagnóstico, medido (2026-09-10, probe `_probe_9m_baseline.mjs` n=500 × 60)

| Síntoma | Medido | Objetivo |
|---|---|---|
| Carreras que fichan y alcanzan tier 1 | ~99% | que subir cueste |
| Tier al cierre = tier 1 | 74,6% | ≤ 65% (check 7) |
| Correlación `nivelPico ↔ prestigio de la mejor liga` | r ≈ 0,40 | r > 0,5 (check 9) |
| Carreras que caen de tier 1 a tier 2 alguna vez | ~22% | ≥ 15% (check 8, ya pasa) |
| Fichajes con elección real / carrera | ~4,1 | 4-8 (check 5, cuidar el piso) |

### 9M.12.2 — 9Mi: el cambio (estructural — corre el stream, D35)

**Archivos**: `src/core/demanda.js` · `src/core/mercadoMundial.js` · `src/data/balance.js`
(constantes nuevas) · `src/systems/competitivo.js` (sólo si hace falta el punto 3).

**1. El asiento se DISPUTA.** `ofertaPosible` deja de aceptarte por estar "en banda": ahora exige
que le ganes a la **mejor alternativa real de la org para ese asiento** — el NPC que ya lo ocupa (si
no se va), el mejor agente libre del offseason para tu rol (`mercadoPretemporada.libresRestantes`),
o el canterano que subiría (`nivelAnclaReemplazo − canteraNivelBajoOrg`). Tenés que estar
`demanda.margenSobreAlternativa` (~3, por criterio) por encima de ese nivel — "sos claramente la
elección, no una moneda al aire", el mismo criterio que `margenImport`. Reusa
`nivelAlternativaAsiento` (ya existe en `systems/mercado.js`, se sube a `core/`). El piso de
franquicia (9R0e) sigue salteando esto: una estrella genuina siempre tiene asiento. **Efecto**: un
jugador de nivel 63 que compite por un asiento donde la org podía firmar a un libre de 67 no recibe
la oferta → se queda en tier 2 hasta que de verdad es mejor. La correlación nivel↔liga (check 9)
sube porque el tier pasa a medir "¿le ganás a la competencia de tier 1?", que es lo que el check
quiere.

**2. El mercado se ENFRÍA con la edad.** El `sesgoEtario` hoy sólo adelgaza la mano que ves
(`cupoEtario` en `generarOfertas`), nunca decide si el asiento existe. Ahora también descuenta tu
nivel efectivo en la disputa del punto 1: `nivel · sesgoEtario(edad) ≥ nivelAlternativa + margen`.
Un club que te evalúa a los 29 contra un libre de 21 de nivel parecido se queda con el pibe. Un
veterano en declive que ya no es *claramente* mejor que la camada joven consigue **cero** asientos
congelados → tier 2 o retiro. Es lo que mueve check 7 "al cierre", y es el gancho explícito del
retiro de la fase 10 ("te retirás cuando el mercado deja de llamarte" — hoy eso vuelve a ser un
dado porque el mercado nunca deja de llamar).

**3. La pirámide completa releva (cierra D16 del todo) — sólo si 1+2 no alcanzan.**
`resolverDescenso` hoy sólo baja a TU org si terminás último. Se generaliza: cada offseason, cada
liga tier 1 con `desciendeA` releva a su última (por `org.fuerza`) y su tier-2 más fuerte
promociona — swap en `mundo.ligas`, planteles viajan por nombre (la mecánica del swap ya existe en
`competitivo.js`). Da churn real al mapa de fuerzas: la org de un jugador mid-pack tiene, en una
carrera de 15 años, chance concreta de irse a pique y arrastrarlo (el contrato ya viaja). Se
implementa **después de medir 1+2**: si con el asiento disputado + el enfriamiento etario el check 7
ya cae en banda, la pirámide queda como mejora futura anotada, no se fuerza en 9Mi.

> **9Mi (2026-09-10): evaluada y DIFERIDA.** Midiendo 1+2: el check 7 *original* ("`tierCierre === 1`
> ≤ 65%") no cae porque el retiro se dispara a los ~28 (mediana de diseño de `retiro.js`) con el
> jugador todavía empleado en primera, **antes** de que el enfriamiento etario (que pega fuerte a
> los 30+) pueda echarlo — y `career.tier` nunca se anula, así que "cierre en tier 1" es "tu último
> club fue de tier 1". La pirámide no arregla eso: un jugador bueno relegado rebota a tier 1 al año
> siguiente. Y generalizar el relevo metería ~90 orgs sin plantel a tier 1 en 15 años (rompe el
> supuesto "tier 1 siempre simulado" de §9M.2). En vez de eso se **redefinieron los checks 7 y
> 9Mi-1** a "liga mayor (prestigio ≥ 70)" (decisión del usuario) — mide el mismo *intent* ("subir
> cuesta, no todos terminan arriba") de forma alcanzable. La pirámide queda como texture de mundo
> futura, fuera de 9M.

**Riesgo a vigilar**: que subir deje de ser posible para carreras buenas (check 5 fichajes < 4,
check 4 ligas pisadas, "nunca_fichado" se dispara). El `resolverAuto` headless tiene que seguir
resolviendo (los helpers de `libresRestantes` ya están en el estado cuando corre `ofertaPosible`,
porque `mercadoMundial` corre primero en el split). D35: se acepta el corrimiento de stream, igual
que 9Ma-9Mf.

### 9M.12.3 — 9Mj: recalibrar (solo constantes)

Todo lo que 9Mi corra + despinchar los checks que 9Ma-9Mc dejaron parcheados y 9Mh no pudo cerrar
con constantes limpias: **"La dinastía"** (tope 25%, hoy parcheado a 28%) y **"series sin ningún
draft"** (piso 28%, hoy 26%). Ambos son síntomas de un mundo que se ablanda porque nadie disputa los
asientos — con 9Mi los NPCs pelean por su lugar y `org.fuerza` deja de desangrarse, así que deberían
volver solos; 9Mj confirma y ajusta. Palancas candidatas si no vuelven: `demanda.margenSobreAlternativa`,
`plantel.probNoRenovarNpc*`.

> **9Mj (2026-09-10): hecho.** Los dos **volvieron solos** — "La dinastía" 22,8% (sonda n=500),
> "series sin draft" 29,8%: topes devueltos a 25% / 28% y confirmados con la corrida completa de
> `validate.js` (n=800 / n=1200 × 90). El único que no cerró es el **check 8** (caídas tier 1 →
> tier 2): `castigoEtarioNivel` 18 → 20 + `factorRenovacionDeclive` 0,35 → 0,30 lo subieron de
> 13,5% a **~14%** y ahí se estabiliza. El punto que falta no sale con constantes: la disputa de
> 9Mi hace que un veterano al que el mercado deja de llamar **quede libre y se retire desde tier 1**
> en vez de bajar a tier 2 — porque el piso de franquicia de 9R0e no mira la edad y le sostiene una
> oferta de su propia liga. Cerrarlo pide que ese piso también use `nivelEfectivo` (con
> `castigoEtario`) — un toque de una línea en `mercado.js:generarOfertas`, fuera del alcance "solo
> constantes" de 9Mj. Anotado como residual; la movilidad descendente existe (14% + banquillo +
> retiro desde libre) y el check no tiene `check()` que falle.

### 9M.12.4 — Checks

> **Redefinidos en 9Mi (2026-09-10).** CBLOL (prestigio 55) y LCP (60) **son** tier 1, y la peor
> carrera que ficha llega a `nivelPico` 65 → toda carrera que ficha cruza la vara de CBLOL tarde o
> temprano: "% que alcanza `career.tier === 1`" es ~100% por estructura, y "% que cierra en tier 1"
> es ~75% por estructura (retiro a los 28 empleado + `career.tier` no se anula). La vara pasa a ser
> **una liga MAYOR — prestigio ≥ 70: LCK / LPL / LEC / LCS**. CBLOL/LCP son el tier 1 accesible; a la
> elite se sube. Decisión del usuario.

Barrido memoizado de n=300 × 60 en `validate.js` (precedente de muestra grande: la correlación
potencial↔duración corre n=1200 × 90). Los cuatro leen del mismo resultado.

- **check 7 (redefinido)**: no todas las carreras terminan arriba — **≤ 45% cierra en una liga
  mayor** (medido 9Mi ~33%). Denominador: todas las carreras.
- **check 9**: `r(nivelPico, prestigio de la mejor liga) > 0,5` — medido 9Mi **0,815** (baseline
  0,40). El ancla `liga.prestigio` en la disputa lo creó.
- **9Mi-1 (redefinido)**: subir cuesta — de las carreras que fichan, **≤ 90% alcanza una liga
  mayor**, y las que no llegan tienen `nivelPico` menor (no es un dado).
- **9Mi-2**: el mercado deja de llamar — **ninguna carrera recibe una oferta FRESCA (no renovación)
  de una liga mayor** pasada `edadRetiroForzoso − 3` con el nivel bajo la banda de esa liga
  (tolerancia < 5% por el piso de franquicia).
- **9Mi-3**: determinismo intacto — ya cubierto por el check 13 de §9M.10.
- **9Mj** (hecho): "La dinastía" ≤ 25% ✅ (22,8%), "series sin draft" ≥ 28% ✅ (29,8%), check 5 ∈
  [4, 8] ✅ (5,26), `simulate.js 1500 60 todas` sin crash ✅ (2m24s). **check 8 ≥ 15%: quedó en
  ~14%** — residual documentado arriba (§9M.12.3); necesita un toque en el piso de franquicia,
  fuera del alcance de 9Mj.

---

# FASE 9W — EL MEJOR DEL MUNDO

> **Por qué esta fase existe (2026-09-10, pedido del usuario).** El juego tiene el mundo de NPCs
> (9Ma) y la escena (9ML.a: quién gana cada liga y Worlds cada año), pero **no hay un ranking vivo
> de los mejores jugadores del momento** — el equivalente de las listas "Top 20 players" que se
> publican cada pretemporada, y del discurso "el mejor del mundo". Es un eje de prestigio que hoy no
> existe: los títulos miden al equipo, la jerarquía tu estatus dentro de la org, el arraigo tu
> vínculo con la org, la ladder tu soloQ. Ninguno responde *"¿fuiste de los mejores del mundo
> alguna vez?"*. Pedido textual: *"algo tipo top players aparte de lo de la generación... que se
> pueda entrar o salir de ahí, que quizás entre uno de tu generación, que entren players más viejos
> o más jóvenes, que rote bastante, y que tenga sentido entrar ahí"* · *"top 5 a la derecha a
> medida que vas jugando, y el top 20 a final de temporada, porque quizás estuviste cerca"*.
>
> **Va entre 9M y 10** por dependencia: la fase 10 lee "eras top 20 y te caíste" para un desenlace
> de retiro, y la fase 11 construye la narrativa del archirrival sobre el ranking. Depende de 9Ma
> (planteles) y 9ML.a (escena), ambos hechos. Refuerza 9Mi (un top 20 es franquicia: el mercado
> siempre le tiene asiento).

## 9W.1 — Regla de oro: cero RNG

El **cómputo del ranking** se hace **determinísticamente sin tocar `rng`**, con `hashCadena`
(`src/core/numeros.js`, ya usado por `core/minijuegos.js` y `core/plantillas.js`).
`core/topMundial.js`, `systems/topMundial.js` y las adiciones a `escena.js` nunca llaman `rng` —
hay un check que le pasa un rng que revienta si se lo toca.

> **Matiz medido en 9Wb.** 9Wa es cero-stream de punta a punta: `simulate.js` da agregados
> **byte-idénticos** antes y después. 9Wb agrega *ganchos de juego*, y uno —el piso de franquicia
> para un top 20 en silencio de mercado (§9W.4 gancho 2)— genera una oferta forzada que antes no
> existía y consume `rng`. Eso corre el stream levemente (≈1-3 carreras de 1000; familia D35), como
> cualquier cambio de balance. La regla de oro es sobre el ranking, no sobre que la fase entera
> deje el stream intacto.

## 9W.2 — Commits

| # | Commit | Contenido |
|---|---|---|
| 9Wa ✅ | `fase 9Wa: el mundo tiene ranking` | `src/core/topMundial.js` (`puntajeRanking` / `rankearPoblacion` / `rankearMundo` / `diffDeRanking` / `bonusResultadoDelAnio` / `ruidoDeterminista`, puro sin `rng`) + `src/systems/topMundial.js` (1 línea en `ETAPAS_SPLIT`, después de `escena`) + `systems/escena.js`/`core/escena.js` (`campeonDeterminista` / `construirEscenaAnual`) persisten `mundo.escenaAnual` (campeones/subcampeones/internacional, las 6 ligas + la del jugador) + estado nuevo en `core/state.js` (poblado desde el arranque, T4). Sin UI, sin ganchos. **Cero stream verificado**: `simulate.js` byte-idéntico pre/post. 5 checks nuevos (rojo-primero). El merit-check se mide sobre `rankearPoblacion` (sin cortar), no el Top 20 (ahí el nivel está comprimido a propósito) |
| 9Wb ✅ | `fase 9Wb: entrar cuesta y se siente` | 6 ganchos: `valorDeMercado` (`bonoTopMundial`, escala con rank), piso de franquicia en `systems/mercado.js` (top 20 → `claramenteArriba`), `legado.js` (`totales.rankMundialMax` / `splitsEnTopMundial` + 3 ramas de arquetipo antes de los títulos), `ficha.js` (`fichaCompleta` expone `rankMundial`/`rankMundialPico`; `dueloDeGeneracion` devuelve `{rivalHandle,rivalRol,rivalRank,tuRank,vasGanando}`), marcas `top_mundial`/`mejor_del_mundo` + momento `top_del_mundo` (activo) / `el_mejor_del_mundo` (`pendiente:'paso9Wd'` — el #1 sale 1/300×45 con constantes por criterio) + 2 eventos semilla (`data/events/top_mundial.json`). `mundo.rivales[].puntaje` = mejor rank en el Top 20 (D8/D40). **9Wb corre el stream levemente** (gancho 2, ver §9W.1) |
| 9Wc ✅ | `fase 9Wc: la pantalla` | regla de proceso 12. Panel **Top 5** (`src/ui/paneles/topMundial.js`, nuevo — `<div id="panelTopMundial">` + 1 línea en `render.js` + 1 en `renderRielContexto`): se ve siempre (el norte al que se apunta), tu fila `--propia` si estás en el 5, fila `--pie` con tu puesto si estás rankeado más abajo, leyenda "Tu pico: #N" si te caíste. **Reveal del Top 20** en el feed al cierre (`crearRevealTop20` en `components/feed.js`): el log `top_mundial` con `entry.top20` se abre en tabla; acento oro (`log-item--top-mundial`, `ACENTO_LOG.top_mundial`). **"Quedaste #23 — cerca"**: `systems/topMundial.js` emite `rankJugadorGlobal` (de `rankearPoblacion`, puro) sólo si quedaste rankeable, afuera y a ≤ `margenReveal` (10) del corte. **Cero-stream verificado byte a byte** pre/post. Sin checks nuevos (rotación/entrada son de 9Wd). Falta jugar a mano en el navegador |
| 9Wd ✅ | `fase 9Wd: calibrar` | sólo constantes (`BALANCE.topMundial`, sin cambio de modelo): `bonusCampeonLiga` 6→13, `bonusInternacional` 10→16, `bonusInternacionalFinalista` 4→8, `pesoResultado` 1→1,30, `ruidoSpread` 5→4. Medido: entrás al Top 20 en el **51%** de las carreras con éxito (era 12%) y en el **~1%** de las lavadas; rotación ~96 handles / ~13 cambios de corte; rival de generación en **~37%** de las carreras (arriba de la estimación 15-40% de §9W-8 — el rival cobra el mismo `bonusCampeonLiga` que vos, acople que rompe la fase 11). 3 checks nuevos rojo-primero (9W-6 daba 10,1% con las constantes de 9Wa). Momento `el_mejor_del_mundo` **activado** (9/300 carreras). `valorTopMundialBonus` no se tocó |

## 9W.3 — El modelo

**Estado nuevo** (`core/state.js`, objetos completos desde el arranque — trampa T4):
- `mundo.topMundial`: array de largo `BALANCE.topMundial.tamano` (20), reescrito **cada split**
  (barato: ~290 NPCs de tier 1 + el jugador, aritmética + un sort). Entrada:
  `{ handle, org, liga, regionId, rol, edad, nivel, puntaje, rivalDeGeneracion, esJugador, entroAnio, bonusResultado }`.
- `mundo.mejorDelMundo`: espejo de `topMundial[0]`.
- `mundo.escenaAnual` / `escenaAnualPrevia`: `{ campeones: {ligaId: org}, subcampeones, campeonMundial, finalistasMundo }`.
  Un año de memoria para el decay del bonus.
- `career.registro.picos.rankMundial`: mejor (**menor**) rank de la vida; `0` = nunca. Mínimo
  monótono → helper propio `registrarPicoRank` en `core/registro.js`.
- `career.registro.splitsEnTopMundial`: contador monótono.
- `flags.rankMundialActual` (number|null) / `flags.rankMundialAnterior`: el rank absoluto del
  jugador ahora y al cierre del año pasado (suben y bajan — son flags). `null` si no es
  **rankeable**: sólo `career.tier === 1` califica (el Top 20 es conversación de tier 1 — refuerza
  9Mi: "no estás en la conversación hasta que llegás a primera").

**`puntajeRanking(entidad)`** (puro):
```
nivel
  + pesoResultado       · bonusResultadoDelAnio(entidad, escenaAnual, career)
  + pesoResultadoPrevio · bonusResultadoDelAnio(entidad, escenaAnualPrevia)   // decay
  + ruidoDeterminista(handle, anio)
```
- `nivel`: `npc.nivel` / `nivelDelJugador(state)` — misma escala 0-100 (garantizado por
  `core/plantel.js`).
- `bonusResultadoDelAnio`: la org de la entidad ganó su liga (`+bonusCampeonLiga`), ganó Worlds
  (`+bonusInternacional`), fue finalista (`+bonusInternacionalFinalista`). NPCs: de `escenaAnual`.
  Jugador: de deltas de `career` este año (`titulos`, `internacionales`, `posicion`).
- `ruidoDeterminista(handle, anio)`: `hashCadena(seed + handle + anio)` normalizado a
  `[-ruidoSpread, +ruidoSpread]`. **Constante dentro de un año, se re-tira en el borde** — el motor
  del churn ("que rote bastante") sin consumir `rng`.
- **La edad NO es un término.** La diversidad etaria es emergente: `nivelNpc` sigue la curva de
  carrera (pico ~20-26, declive después), así que el Top 20 tiene trepadores de 18-20, pico de
  21-26 y algún veterano de 27-30. `retiroEdadDura` (30) lo tapa por arriba.

**El sistema** (`systems/topMundial.js`, después de `escena` en `registro.js`): cada split
recomputa `topMundial` sin logs (mid-season sólo se mueve el jugador, según sube su nivel — sentís
que trepás). Al **cierre de edad** (`esCierreDeEdad`), difea contra `flags.rankMundialAnterior` y
emite los beats (entrás / te caés después de N splits / llegás al #1 / un rival de generación entra
o sale / el reveal del Top 20), escribe `picos.rankMundial` / `splitsEnTopMundial` / un `momento`,
y guarda `rankMundialAnterior` + `escenaAnualPrevia`. Nunca consume `rng`.

## 9W.4 — Los ganchos ("que tenga sentido entrar ahí")

1. **Valor de mercado** (`core/valorMercado.js`): `+ mercado.valorTopMundialBonus · escala(rank)`
   al `factor` — espeja `valorSignatureBonus` / `valorResidenciaBonus`.
2. **Piso de franquicia** (`core/demanda.js`, 9R0e / 9Mi): top 20 = franquicia, el mercado siempre
   te tiene asiento de tier 1.
3. **Contenido** (`data/contextos.js`): marcas `top_mundial` (rank ≤ 20) / `mejor_del_mundo`
   (rank === 1) + momento `el_mejor_del_mundo` (prioridad alta). El catálogo de eventos que lo usa
   (sponsor bomba, "defendé el #1", la prensa que te corona/destrona, el rookie que va por tu
   lugar, el archirrival que te pasa) es **fase 13**; 9W deja 2-3 semilla.
4. **Tarjeta de legado** (`core/legado.js`): `picos.rankMundial` en `totales` ("Nº3 EN EL MUNDO",
   "14 splits en el Top 20") y ramas de `elegirArquetipo` (#1 → "El mejor del mundo (año 20XX)";
   ≤ 5 → "De los mejores del mundo"; breve → "El que tocó el Top 20"). El dato más evocador de la
   tarjeta final.
5. **Retiro** (fase 10, gancho): `picos.rankMundial > 0 && flags.rankMundialActual == null` para un
   desenlace propio.
6. **Rivales de generación vivos** (D8 / D40): `mundo.rivales[].puntaje` deja de ser 0 muerto y
   pasa a ser "mejor rank mundial alcanzado" en vivo; `dueloDeGeneracion` (`core/ficha.js`, hoy
   siempre `null`) empieza a devolver `{ tuRank, rivalRank, rivalHandle }`.

## 9W.5 — Constantes nuevas — `BALANCE.topMundial`

`tamano: 20` · `pesoResultado` · `decayResultado: 0.4` · `bonusCampeonLiga` · `bonusInternacional` ·
`bonusInternacionalFinalista` · `ruidoSpread` (**la perilla del churn**). En `BALANCE.mercado`:
`valorTopMundialBonus`. Valores por criterio, retune en 9Wd.

**9Wc** sumó `margenReveal: 10` — umbral de *presentación*, no de balance: cuántos puestos más allá
del corte #20 siguen contando como "estuviste cerca" para el "quedaste #23" del reveal. No toca el
ranking ni ninguna distribución (cero-stream verificado).

## 9W.6 — Checks (cada uno en rojo primero, regla 7)

Umbrales entre `X/Y/Z/P/Q` marcados **9Wd** = medidos en ese commit, no antes (regla de proceso 2).
Los valores finales (barrido `barrido9W()`, n=180 × 60):

- `topMundial` largo `tamano`, sin handles repetidos, ordenado por `puntaje` desc. *(9Wa ✅)*
- **Determinismo + cero stream**: misma seed → mismo `topMundial` cada año, y `simulate.js` pre/post
  da agregados **idénticos** para el cómputo del ranking (9W no consume `rng`; el corrimiento
  agregado de 9Wb/9Wd viene del gancho 2, no del ranking — §9W.1). *(9Wa ✅)*
- **Rota**: piso **45** handles distintos por carrera y **10** cambios del corte #20. Medido tras
  9Wd: **~96 / ~13**. *(9Wd ✅)*
- **Diversidad etaria**: sub-20 y > 27 aparecen en el Top 20 en ≥ 20% de las carreras cada uno.
  Medido: sub-20 96%, > 27 100%, rango etario ~12 años. *(9Wa estructura ✅)*
- **Mérito, no lotería**: correlación `nivel` ↔ rank sobre `rankearPoblacion`, r > 0,6. Medido
  **0,96**. *(9Wa ✅)*
- **"Cuesta / tiene sentido"**: el jugador entra al Top 20 en ≥ **45%** (piso; vara §9W.6 = 50%) de
  las carreras con éxito y en ≤ 5% de las lavadas. Medido tras 9Wd: **51% / ~1%** (era 12% / 0% con
  las constantes de 9Wa — el rojo del check). *(9Wd ✅)*
- `picos.rankMundial` monótono (número no creciente), escrito, y en la tarjeta de legado. *(9Wa ✅)*
- Un rival de generación aparece en el Top 20 en **[15%, 45%]** de las carreras. Medido tras 9Wd:
  **~37%** (n=300) / 40% (n=180) — al tope de la estimación original "15-40%" porque el rival cobra
  el mismo `bonusCampeonLiga` que el jugador cuando su org sale campeona; las dos varas están
  acopladas por esa constante y desacoplarlas es la ficha de archirrival de la **fase 11** (D40).
  *(9Wd ✅)*
- Perf: `simulate.js 1500 60 todas` ≤ 2× base (check 14 existente). *(✅ cada commit)*

## 9W.7 — Fuera de alcance (anotado)

- El catálogo completo de eventos `top_mundial` → **fase 13**.
- La ficha del archirrival con `desenlace` y el duelo de ranks como eje narrativo completo →
  **fase 11** (9W deja `mundo.rivales[].puntaje` vivo y `dueloDeGeneracion` devolviendo algo).
- `escena.js` simulando de verdad un split ajeno → sigue siendo mundo de cartón con una capa de
  vida (9ML.a); 9W no lo cambia.

---

# FASE 10 — EL FINAL

## 10.0 — Commits

| # | Commit | Contenido |
|---|---|---|
| 10a | `fase 10a: se borran los relojes` | ✅ 10.1 (ver abajo, reescrito al implementar) |
| 10b | `fase 10b: la tarjeta de legado` | ✅ **ya cerrado en 9R5b** — `core/legado.js` + `ui/screens/tarjeta.js` existen desde la fase 9R con 13 arquetipos (más finos que los 8 originales de §10.2) y marco por final (§10.3). No queda nada por hacer acá |
| 10c | `fase 10c: lesiones y servicio militar` | ✅ 10.4 (ver abajo, reescrito al implementar) |
| 10d | `fase 10d: calibrar la duración de la carrera` | no hizo falta como commit aparte — 10a ya había fijado la banda y 10c cayó en banda a la primera medición, ver §10.4 |

## 10.1 — `src/systems/retiro.js` — la carrera termina cuando el mercado deja de llamarte ✅ (2026-09-11)

**Reescrito al implementar** (regla de proceso 2/7): el plan original pedía una edad de declive fija
(`edadDeclive`) con una probabilidad `chance()` creciente — la misma forma que 9R5a, solo con
`vueltasMaximas` sumado encima. Jugándolo así (con las constantes de 9R5d, `edadDeclive: 27`) el
usuario lo objetó en el momento: *"si llegás a tier 1 y te equivocás bastante, que te retires a los
2 años sí; si no, mínimo 23, y de ahí si venís para arriba que puedas seguir subiendo"* — un piso de
edad fijo no puede expresar eso, porque no distingue al que asciende del que se cae. Se cambió el
reloj completo:

| Reloj | 9R5a/9R5d | Pasa a ser (10a) |
|---|---|---|
| Disparador del retiro | edad fija (`edadDeclive: 27`) × `chance()` | `contexto.etapa === 'declive'` (D30, presión de mercado real: banqueado, caíste de tier 1 y no volviste, o tu nivel cayó ≥`margenDeclive` de tu propio pico) **o** estar sin equipo — nunca una edad. Alguien que sigue ascendiendo no entra en esta cuenta pase lo que pase |
| La decisión | dado silencioso (`chance()`) | **decisión real**, sin RNG: al segundo año consecutivo (neto — un año bueno no borra dos malos) de presión, se pausa y se pregunta "¿la seguís o colgás los botines?" |
| `amateur.edadLimite: 20` | corte automático → `no_llego` | pasa a ser la **red anti-loop** (subida a **24**, no se borra: D10 la sigue necesitando con el mismo significado). `scoutingSesgoEtario` se extiende (20→0.06, 21→0.03, 22+→0.015: nunca cero) y **desde los 19** el cierre de temporada de la etapa amateur ofrece la misma decisión real: seguir o dejarlo |
| edad de retiro forzoso | no existía | `edadRetiroForzoso: 34` (línea Faker) — el único disparador que sigue siendo una edad dura, sin pregunta (no hay nada que elegir, regla 1) y **sin ventana de vuelta** (ver trampa abajo) |
| guard de 90 splits | lo agotaba el 49,1% en 9R2 (0% ya en 9R5a) | se mantiene en 0%, verificado (`validate.js`) |

Semántica de estado (riesgo alto, tal como preveía el plan):

- `phase: 'retirado'` + `terminado: false` = la ventana de vuelta (`retiro_elegido`/`sin_equipo`,
  si `vueltasUsadas < vueltasMaximas: 2`). Reloj propio (`flags.splitsEnVentana`), NO
  `player.splitCount`: `core/pipeline.js` corta el resto de `ETAPAS_SPLIT` mientras dure (nuevo
  helper `splitTerminaAca`, misma familia que el corte por `terminado`), así que ese contador queda
  congelado.
- `phase: 'retirado'` + `terminado: true` = la run terminó de verdad. Lo setea **solo** `retiro.js`
  (vía `terminar()`) — salvo los tres terminales de siempre (`burnout`/`atributos.js`,
  `no_llego`/`prohibicion_familiar`/`amateur.js`), que no pasan por acá.
- **Trampa nueva, encontrada al implementar**: la línea Faker (`edadRetiroForzoso`) NO puede abrir
  ventana de vuelta — si la abre, alguien con `vueltasUsadas < 2` rebota de vuelta contra la MISMA
  edad una y otra vez, corriendo el retiro "de verdad" varios años de más (medido: mediana de
  retiro saltaba de 34 a 35 con esto mal). `reversible: false` fijo en ese branch.
- **Trampa nueva D30-bis**: el check estático de `validate.js` ("Ningún token puede quedar sin
  resolver...") ya asumía que `etapa: 'declive'` garantiza tener equipo (`CON_EQUIPO` la incluye
  junto a `debut`/`profesional`, para que el contenido use `{org}`/`{liga}` sin blindaje extra). Por
  eso `enDeclive` (`core/contexto.js`) **no** incluye "sin equipo" — ese cruce se suma aparte, solo
  adentro de `systems/retiro.js`, leyendo `career.currentOrg` directo.
- **Trampa nueva, offseason vacío**: `data/rutinas/offseason.json` declaraba `etapa: ["debut",
  "profesional"]` en sus 6 rutinas — con 'declive' ahora alcanzable, un jugador banqueado o caído de
  tier 1 llegaba a `practica.js` con CERO rutinas candidatas y `elegirRutinaAutomatica` reventaba en
  un `reduce` de array vacío. Se agregó `"declive"` a las 6 (¿qué hacés en el receso estando en la
  cuerda floja? es, si acaso, más relevante ahí). Cualquier fase futura que introduzca un valor
  nuevo de `etapa` tiene que barrer el contenido existente por la misma razón.
- `retiro_por_lesion` **no existe todavía** (es 10.4/10c, lesiones — abierto). Reversibles hoy:
  `sin_equipo`, `retiro_elegido`. Terminales: `burnout`, `prohibicion_familiar`, `no_llego`, y el
  retiro forzoso de la línea Faker.

> **D10 cerrada distinto de lo previsto**: no hizo falta darle a `secundario.js` un umbral propio.
> `edadLimite` no se borró — cambió de rol (de corte duro a red anti-loop) pero el significado que
> `secundario.js` necesita ("la edad en la que definitivamente ya no sos amateur") no cambió, solo
> el valor (20→24). Sigue leyendo el mismo campo.

Red única que queda: si a los 24 seguís en `amateur`, se fuerza `no_llego`. Es una red anti-loop,
no una regla de juego, y se documenta como tal.

## 10.2 — `src/systems/legado.js` + `src/ui/screens/tarjeta.js`

```
┌─── 🏆 FIGURITA BRILLANTE · LEYENDA ──────────────────────────┐
│                   TE RETIRASTE A LOS 29                       │
│           THONOR26 · JUNGLA · 🎀 SHOTCALLER                   │
│                                                               │
│              "EL MUNDIALISTA DE T1"                           │
│                                                               │
│                 LEYENDA DE T1  🗿                             │
│         Tenés tu lugar en la pared de la base                 │
├───────────────────────────────────────────────────────────────┤
│ TU HISTORIA, ORG POR ORG                                      │
│                                                               │
│ ▌ Hanwha Life Esports    Uno más 18/100  ▓░░░░               │
│   42 splits · 118-94 · 2026–2029                              │
│                                                               │
│ ▌ T1                     Leyenda 100/100 ▓▓▓▓▓  ⭐            │
│   88 splits · 301-121 · 2029–2038                             │
│   🏆 Worlds 2033 · 🥇 5× LCK 2030 2031 2033 2035 2037        │
│   🌍 MSI 2031 (2º) · First Stand 2034 (semis)                 │
├───────────────────────────────────────────────────────────────┤
│  12 AÑOS │ 130 SPLITS │ 6 TÍTULOS │ NIVEL MÁX 93              │
│  NOTA GENERAL 8.0 │ VALOR MÁX US$4,1M │ 3º DE TU GENERACIÓN   │
└───────────────────────────────────────────────────────────────┘
```

**El veredicto se compone** (`CONCEPTO` §9), no se elige de una lista. La fórmula sale de la
imagen 15 (`"El mundialista de Bayern Múnich"` = mayor logro + mayor org):

```
veredicto = plantillaDeArquetipo(registro) + modificador(registro) + detalleÚnico(registro)
```

| Arquetipo | Condición sobre `registro` |
|---|---|
| `El mundialista de {org}` | ganó un internacional |
| `Leyenda de {liga}` | ≥3 títulos, nunca ganó internacional, una sola región |
| `El eterno cuarto puesto` | ≥4 podios sin títulos |
| `El que se fue a {region} y volvió peor` | cambió de región y `picos.nivel` fue antes del cambio |
| `El pibe que no fue` | debutó en tier 1 antes de los 18 y no pasó de 3 splits ahí |
| `El que no llegó` | `no_llego` |
| `El que se bajó` | `burnout` |
| `El que no lo dejaron` | `prohibicion_familiar` |

**Todo esto sale de `registro.porOrg` y `registro.titulos`** — por eso la fase 8 va primero. Sin el
registro, esta pantalla es literalmente imposible de escribir.

**Reusa** el componente `VER CARRERA` de 8.6 punto 5: se escribió una vez, se usa dos veces.

## 10.3 — Toda salida es una tarjeta

`no_llego`, `burnout`, `prohibicion_familiar` y `sin_equipo` también terminan en tarjeta, con su
propio marco (la imagen 15 tiene confeti; la del pibe al que le prohibieron jugar, no — pero tiene
tarjeta, con su elo máximo, los scouts que lo miraron y qué fue de los cinco de su generación,
exactamente como promete `CONCEPTO` §4).

Es el motor de difusión del juego (`CONCEPTO` §9) y hoy **no existe para ningún final**.

## 10.4 — Lesiones y servicio militar ✅ (2026-09-11)

**Reescrito al implementar** (regla de proceso 2/7, mismo criterio que 10a): el usuario objetó las
dos formas por defecto en el momento (congelar splits enteros para la lesión grave, y un salto
narrativo o splits vacíos para el servicio) y pidió dos cosas puntuales: *"que puedas skippearlo si
ganás la medalla en los Asian Games también, que tengan uno que otro evento así como 3 que se vean
distintos que estás en el servicio militar y tomás 3 decisiones con respecto a eso y nada que pase
el tiempo"* para el servicio, y que la lesión grave cueste **partidos, no splits**, para la salud.
Se rediseñaron los dos sistemas antes de escribir una línea.

> **La cadena causal más valiosa del juego, y está medio construida:** `player.deudaSueno` **no se
> resetea** al pasar a profesional (D9) y `atributos.js` la sigue cobrando toda la carrera.
> **Robarle horas al sueño a los 16 te cuesta la muñeca a los 23.** Y con la fase 8, por primera
> vez lo ves: el techo de `mecanica` aparece como un ▼ que no se recupera.

### 10.4.1 — `src/systems/servicioMilitar.js` (nuevo)

Aplica solo a `state.mundo.regionIdOrigen === 'KR'` (la región de origen ya existe y es el proxy de
nacionalidad del juego; no hace falta un `player.pais` nuevo).

**La exención (Asian Games, hecho real: el oro de 2022 eximió a los jugadores coreanos del
plantel).** Cada split, si `career.registro.internacionales` tiene una entrada
`resultado === 'buen_papel'` y todavía no está `flags.exentoServicio`, se prende
`flags.exentoServicio = true` con un log/momento dedicado. Reusa `registro.internacionales` (fase
8); cero estado nuevo salvo el booleano.

**El disparador (determinista — `CONCEPTO §12.4`: "no probabilístico"), en pretemporada** (trampa
T2, `calcularContexto(state)` en vivo): si no está exento y no `flags.servicioCumplido`,
`state.age >= edadLimiteServicioElite` (30) si `registro.picos.rankMundial` estuvo alguna vez en
el Top 20 (reusa 9W: "figura de élite reconocida"), si no `state.age >= edadLimiteServicio` (28).
Sin pregunta de si ir: mismo criterio que la línea Faker de `retiro.js` — no hay nada que elegir
sobre el hecho (regla 1), solo sobre cómo se vive.

**La cadena de 3 decisiones**, inline (mismo patrón que `decisionDeclive`/`decisionVuelta` de
`retiro.js` — no son eventos JSON, son decisiones estructurales con opciones fijas y consecuencias
deterministas; encadenan sin salir de la etapa, igual que ya hace `temporada.js` con el draft de
fecha marcada): **"Te vas"** (despedida pública vs. salida discreta → nudge en
`career.arraigo`/hype), **"Adentro"** (te mantenés afilado a escondidas vs. te desconectás en
serio → tradeoff mecánica/mentalidad al volver), **"Volver"** (tu lugar se sintió ocupado por un
rookie → nudge narrativo de jerarquía/mentalidad; no se toca `career.currentOrg`, porque no pasa
tiempo no hay razón mecánica para que el club te suelte). Al resolver la 3ª: `flags.
servicioCumplido = true`, se apaga `flags.enServicioMilitar`, `registrarMomento` (`core/
registro.js`) dejó la cita para la tarjeta final.

**Por qué no hace falta tocar `phase`, `pipeline.js` ni `EJES.etapa`:** las 3 decisiones resuelven
dentro de `resolverDecision` sin que `avanzarSplit` vuelva a llamarse entre medio —
`player.splitCount` solo lo mueve `atributos.js`, más abajo en `ETAPAS_SPLIT` — así que la cadena
entera pasa dentro del split en curso. Cero splits perdidos, cero valor de `phase` nuevo, cero
necesidad de barrer `data/rutinas/offseason.json` (la trampa que documentó 10a para un `etapa`
nuevo no aplica acá). `flags.enServicioMilitar` alimenta la marca `servicio_militar` mientras dura
la cadena (un solo split).

### 10.4.2 — `src/systems/salud.js` (nuevo)

Corre para todo profesional (`phase === 'profesional'`, sin requerir `currentOrg`: el desgaste es
del cuerpo). `player.deudaSueno` (0-4, nunca se resetea, D9) es el motor de riesgo.

**Acumulación determinista** (mismo patrón que `splitsMentalBajo` de `atributos.js`):
`flags.splitsRiesgoFisico` sube mientras `deudaSueno >= BALANCE.salud.deudaUmbralRiesgo`, baja de a
uno si no.

**Tier 1 — leve (túnel carpiano, automático, sin decisión):** con `splitsRiesgoFisico >=
splitsParaLesionLeve`, un `chance()` (base + extra por `deudaSueno`, mismo armado que
`probabilidadDeBurnout`) puede pinchar. Efecto: `player.techoLesionMecanica` (nuevo, `null` al
arrancar) pasa a `min(techoActual ?? Infinity, mecánicaActual − gauss(rango leve))`. Solo aviso: no
para nada.

**Tier 2 — grave (tendinitis de muñeca / hombro crónico, decisión real, nombre elegido por peso
entre las dos):** con el riesgo sostenido `splitsParaLesionGrave` más después del leve, decisión
inline: **"Jugás lesionado"** (baja corta 2-3 fechas, corte de techo grande) vs. **"Parás a
tratarte"** (baja larga 4-6 fechas — "la muñeca solo te permite un split más", Hai — corte de techo
menor). Prende `lesion_cronica` (permanente, como `es_campeon`/`nomade`).

**Reincidencia:** con una lesión grave previa (`flags.lesionGraveSplit` seteado) y el riesgo otra
vez sostenido, la misma decisión cambia sus opciones a incluir la salida: **"Seguís"** (corte de
techo otra vez) vs. **"Te retirás"** (`finAnticipado: 'retiro_por_lesion'`, terminal, sin ventana de
vuelta — mismo criterio que burnout).

**La baja se mide en partidos, no en splits — el único touch a `systems/temporada.js`:**
`flags.fechasBajaLesion` (entero). En `continuarTemporada` (el loop que resuelve el calendario
fecha por fecha), mientras `fechasBajaLesion > 0` para la fecha en curso: se fuerza a no marcarla,
se resuelve con `t.fuerzaPropia * BALANCE.salud.factorFuerzaLesionado` en vez de `t.fuerzaPropia`,
se decrementa el contador. No corre el stream de RNG (trampa T1): `resolverFecha` ya consumía
`rng` para esa fecha sea cual sea la fuerza que se le pasa — cambia el valor, no la cantidad de
tiradas. **Fuera de alcance a propósito:** `serie.js` (playoffs/internacional) no replica la baja
— cruzar una lesión con un Bo5 es un caso raro y la serie ya tiene su propia varianza vía
minijuegos.

**Estado nuevo** (trampa T4, todo con valor completo): `player.techoLesionMecanica: null`;
`flags.splitsRiesgoFisico: 0`, `flags.lesionGraveSplit: null`, `flags.fechasBajaLesion: 0`,
`flags.enServicioMilitar: false`, `flags.servicioCumplido: false`, `flags.exentoServicio: false`.

**`systems/atributos.js`:** en `moverStatsDeCurva`, solo para `stat === 'mecanica'` (no
laneo/teamfight — la lesión es de manos, no de lectura de juego; por eso no se toca
`techoDeCarrera`, que hoy comparte un solo techo entre los tres): si `techoLesionMecanica != null`,
topea el valor movido. Una línea. El resto de la convergencia de edad sigue igual — el techo solo
la topea por abajo, y por eso la caída queda (la flecha ▼ genérica de `core/ficha.js`, cero UI
nueva).

**`core/legado.js` + `ui/screens/tarjeta.js`:** rama nueva en `elegirArquetipo` para
`retiro_por_lesion` (nivel de `burnout`, `esExito: false`); `TITULO_MARCO` +
`.tarjeta[data-marco="retiro_por_lesion"]` en `pantallas.css` (reusa `--cat-salud`, ya definido en
`tokens.css`).

**`core/contexto.js` → `calcularMarcas`:** `lesion_cronica` si `flags.lesionGraveSplit != null`;
`servicio_militar` si `flags.enServicioMilitar`. `data/contextos.js`: los dos momentos ya
declarados (`lesionado`, `servicio_militar`) dejan de estar `pendiente: 'paso12'` (regla de proceso
6).

## 10.5 — Checks de la fase 10

**Reescritos al implementar 10a (2026-09-11).** Los siete originales (abajo, tachados) suponían la
carrera corta de `CONCEPTO` §12.4 (mediana 2,1-2,4 años como pro). Puesto a jugar, el usuario pidió
explícitamente lo contrario — *"si venís haciendo las cosas bien y para arriba, que puedas
subir"* — y hay que elegir uno: **gana el pedido del usuario**, documentado como una decisión de
diseño consciente (mismo criterio que 9R5d, que ya había estirado `edadDeclive` 23→27 por el mismo
motivo). `CONCEPTO` §12.4 queda intacta como el dato de investigación — el juego lo estira a
propósito, ídem nota de §1/§2.

```
CERO carreras agotan maxSplitsDeSeguridad                                          ✅ (0%, medido)
edad mediana al retirarse ∈ [30, 34]      (la mayoría sostiene hasta la línea Faker) ✅ (34)
carreras que llegan a age ≥ 30 ∈ [50%, 90%]                                         ✅ (78%)
de los retiros por mercado/decisión, [15%, 45%] cortan ANTES de la línea Faker       ✅ (24%)
  — la variación real: "si la hacés mal, te retirás mucho antes" sigue siendo cierto
la ventana de vuelta se usa en ≥10% de las carreras y nadie excede vueltasMaximas    ✅ (38%, 0)
la duración de la carrera correlaciona con el potencial oculto (r > 0.32)           ✅ (r=0,44)
Ningún final —incluidos los amateur— sale sin tarjeta                        ✅ (ya cerrado, 9R5b)
Ningún arquetipo de veredicto supera el 25% (CONCEPTO §11)                   ✅ (ya cerrado, 9R5b)
El veredicto cita al menos un hecho real del registro de ESA carrera         ✅ (ya cerrado, 9R5b)
```

Cerrados con **10c** (2026-09-11):

```
ninguna carrera coreana llega a la edad límite en 'profesional' sin el servicio resuelto  ✅ (0%)
```

El segundo quedó **descartado, no confirmado** — medido con datos de lesión reales (1500 seeds):
`retiro_elegido` domina de lejos (707) sobre cualquier otra causa; acotado a la comparación real que
lo motivó (`sin_equipo` vs. `retiro_por_lesion`), **`retiro_por_lesion` (18) ya es MÁS frecuente que
`sin_equipo` (4)** — la hipótesis "sin_equipo es la causa más frecuente entre los que declinan" no
se sostiene una vez que el cuerpo tiene una consecuencia real: termina más carreras por decisión
propia que el silencio del mercado. Se documenta como hallazgo (regla de proceso 4), no se fuerza un
check con una banda artificial.

```
~~causa de retiro más frecuente entre los que declinan = 'sin_equipo'~~ — descartado, ver arriba
```

Descartados (no hay un concepto `estrategia: 'carrera'|'ranked'` en el motor — ninguna fase lo
construyó nunca; el check original lo daba por sentado sin que existiera):

```
~~la estrategia 'carrera' llega a 30+ al menos 2.5× más seguido que 'ranked'~~
```

<details>
<summary>Los siete originales, preservados para no perder el historial</summary>

```
mediana de splits como pro ∈ [6, 10]   (2-3,3 años — el dato real de `CONCEPTO` §12.4)
activo al 4º año como pro < 20%
llega a age >= 30 ∈ [0.8%, 4%]         (Peanut / Faker: posible, difícil)
causa de retiro más frecuente = 'sin_equipo'
la estrategia 'carrera' llega a 30+ al menos 2.5× más seguido que 'ranked'
la duración de la carrera correlaciona con el potencial oculto (r > 0.45)
```
</details>

## 10.6 — Verificación end-to-end

Dos trazas completas, leídas como historias: una carrera tipo Faker (30+ años) y un `no_llego` a
los 19. Las dos tienen que cerrar con una tarjeta que se pueda mandar por WhatsApp y se entienda
sola.

---

# FASE 11 — EL AÑO

## 11.1 — `src/core/temporadaResumen.js` (nuevo, puro)

Reemplaza `generarTextoResumen` de [`edadCierre.js:10-29`](src/systems/edadCierre.js#L10-L29),
que se **borra**.

### `notaDeLaTemporada(state)` → 0-10 con un decimal

Compuesto ponderado de: posición en la liga · resultado de playoffs · rendimiento propio medio ·
internacional · movimiento de jerarquía y arraigo. Bandas de color: `<5.5` rojo · `5.5-6.9` gris ·
`7.0-7.9` ámbar · `≥8.0` verde. Se guarda en `registro` para que el año siguiente pueda comparar.

### `titularDelAnio(state)` → `{ titular, bajada, tipo }`

**El corazón de la fase.** Cada candidato puntúa por **peso emocional, no por magnitud numérica** —
esa es la lección de la imagen 5, donde un año de 10 goles y 2º puesto lo titula un torneo que no
jugó.

| Tipo | Puntaje base | Ejemplo de titular | Bajada |
|---|---|---|---|
| `titulo_internacional` | 100 | `CAMPEONES DEL MUNDO` | — |
| `titulo_liga` | 80 | `CAMPEONES DE LA LCK` | — |
| `ausencia` | **75** | `WORLDS, POR TWITCH` | *"Worlds se jugó sin vos. La espina más grande de tu carrera."* |
| `main_muerto` | 70 | `EL PARCHE QUE TE MATÓ EL LEE SIN` | — |
| `debut` | 70 | `EL PIBE DE LA LCK` | — |
| `sequia` | 65 | `¿Y EL SHOTCALLING?` | *"Año seco: las llamadas no salieron."* |
| `rival` | 60 | `DRAKKEN LEVANTÓ LA COPA` | — |
| `caida` | 60 | `EL AÑO QUE SE TE CAYÓ LA MANO` | — |
| `transferencia` | 55 | `TE FUISTE A COREA` | — |
| `eliminacion` | 50 | `AFUERA EN CUARTOS, OTRA VEZ` | — |
| `estable` | 10 | fallback | — |

> **El `75` de `ausencia` está arriba de casi todo a propósito.** Es lo que hace que el juego
> tenga memoria emocional en vez de un boletín de notas.

### `vinetasDelAnio(state)` → array

Una viñeta **por sistema distinto**, con icono, en este orden fijo:

1. 📊 tus números del año (KDA, MVPs, splits)
2. 🏆 posición del equipo y resultado de playoffs
3. 🌍 el internacional (o su ausencia)
4. ⚡ el archirrival: sus números, su org actual, el duelo acumulado
5. 🎯 el meta: si un régimen te mató un main o te lo revivió
6. 🎀 **siempre: qué está en juego el año que viene** ← el gancho

Ejemplo del punto 6, generado del estado: *"Quedaron 3º: el año que viene arrancan con cupo a First
Stand."* / *"Se te vence el contrato: en la pretemporada vas a tener que decidir."*

### La marca del medio

`POTRERO DEPORTIVO` → se inventa el equivalente. Propuesta: **`LA GRIETA`**, con la etiqueta
`{anio}/{anio+1} · TEMPORADA {n}` a la derecha.

## 11.2 — El archirrival (cierra D8)

De los 5 de `mundo.rivales`, **uno se promueve a archirrival**: se elige el de tu rol, y si no hay,
el de tu región. **Corre su carrera** con la `formaCarrera` que ya tiene sorteada.

```js
mundo.archirrival = {
  handle, rol, org, liga, nivel,
  titulos: 0, internacionales: 0,
  duelo: { tuyos: 0, suyos: 0 },     // títulos+internacionales acumulados
  historial: [/* { anio, org, nivel, titulos } */]
}
```

`src/systems/rivales.js` (nuevo, una línea en `ETAPAS_SPLIT`): corre la carrera del archirrival en
silencio, sin logs propios. Aparece en **exactamente tres lugares** y en ninguno más:

1. el contador de la ficha (`83-136 vs DRAKKEN`),
2. la viñeta ⚡ del resumen anual,
3. el `stakes: 'rival_de_generacion'` de la fase 5, **que ya existe**.

Los otros 4 siguen siendo color para la tarjeta final (`3º de tu generación`).

## 11.3 — Checks de la fase 11

```
Toda carrera de ≥6 splits ve al menos 2 resúmenes con titular y nota
Los titulares de una carrera de 30 splits no repiten `tipo` más de 3 veces
   (si repiten, el catálogo de titulares es chico y hay que ampliarlo, no bajar el check)
La nota correlaciona con la posición en liga (r > 0.6) pero no la determina (r < 0.9)
Toda viñeta 6 nombra algo del año que viene
`ausencia` titula al menos una vez en ≥30% de las carreras que pasan de 15 splits
El duelo con el archirrival cambia de signo al menos una vez en ≥40% de las carreras
El archirrival nunca consume RNG cuando el jugador no está en fase profesional (T1)
```

## 11.4 — Verificación end-to-end

Jugar 4 años seguidos y confirmar: cuatro titulares **distintos**, cuatro notas distintas, el rival
apareciendo con números que cambian y con su org cambiando, y cada año cerrando con una frase que
te dice qué se juega el año que viene.

---

# FASE 12 — LA JERARQUÍA DE LA DECISIÓN

> Acá se conecta a la pantalla todo lo que el motor ya sabe y no dice. **Es la fase con mejor
> relación resultado/esfuerzo del documento: casi no tiene código de motor.**

## 12.1 — La categoría (dato, no código)

✅ **Cerrada en 12b.** Cada evento declara `categoria` en su JSON. La UI la pinta como banner con color y tono:

| id | Color | Ejemplo de banner |
|---|---|---|
| `rutina` | gris | `LA SEMANA` |
| `golpe_duro` | rojo | `GOLPE DURO` |
| `oportunidad` | verde | `TE LLAMARON` |
| `mercado` | dorado | `MERCADO DE PASES` |
| `parche` | violeta | `PARCHE 14.9` |
| `vestuario` | azul | `VESTUARIO` |
| `prensa` | celeste | `SALA DE PRENSA` |
| `familia` | naranja | `EN TU CASA` |
| `salud` | rojo oscuro | `EL CUERPO` |
| `partido` | rojo LoL | `SE VIENE {rival}` |
| `serie` | rojo LoL | `SEMIFINAL · MAPA 4` |

Un check estático exige `categoria` en todo evento del catálogo (verificado en rojo contra la
data sin el campo, regla de proceso 7, antes de commitear).

Vocabulario en `src/data/categorias.js` (`CATEGORIAS_EVENTO`), fuente única para el check y para el
mapa de banner de `formatoUi.js`. `serie` reusa el token `--cat-partido` y `golpe_duro` el token
`--cat-golpe` (decisión de estructura: un token nuevo por un color repetido sería ruido) — los 10
`--cat-*` de `tokens.css` no crecieron. `formatoUi.js` dejó de derivar de `category` (19 valores
libres, que se queda en el JSON por su otro consumidor real, `systems/temporada.js`) y lee
`evento.categoria` directo; se borró la tabla-puente `FAMILIA_POR_CATEGORIA` de la fase T4.

**220/220 eventos** con `categoria` correcta: 148 por regla mecánica fija (13 archivos, un
`category` = una `categoria`, delegado a **Gemini/agy**) y 72 por mapa explícito id→categoria (9
archivos donde había que leer cada evento, delegado a **Grok**) — ambos auditados por un subagente
Claude aparte contra el mapa completo antes de este commit. Prueba anti-T1: huella
`finAnticipado:splitCount:soloqElo` de 40 seeds, idéntica entre el HEAD previo y el árbol con 12b
— nada de esto corrió el stream de RNG.

## 12.2 — El peso visual sale del motor (cero código nuevo)

✅ **Cerrada en 12c.** `core/presupuesto.js` ya clasifica `denso/normal/comprimido`; el contenido ya
declara `bisagra: true`; [`events.js:173`](src/systems/events.js#L173) ya le da prioridad absoluta.

`decisionDesdeEvento` agrega **un campo**: `peso: 'bisagra'|'normal'|'ambiente'`
(`evento.bisagra ? 'bisagra' : (evento.categoria === 'rutina' ? 'ambiente' : 'normal')`). La UI lo
lee (`formatoUi.js`'s `pesoDeDecision`, que ahora prioriza `franja === 'cierre'` sobre todo lo
demás — un cierre no compite por atención con la categoría — y después `decision.peso` si vino):

- `bisagra` → ocupa la pantalla, marca de agua, banner grande, animación de entrada.
- `normal` → tarjeta estándar.
- `ambiente` → tarjeta compacta, sin banner: `padding: var(--s-3)`, `border-left-color:
  var(--line)`, `::before { display: none }` — CSS delegado a Gemini/agy contra el patrón ya
  existente de `[data-peso="bisagra"/"cierre"]`, verificado a mano (diff de 4 líneas, sin tokens
  nuevos) antes de commitear.

**Es conectar un cable que ya está tendido.** Y es la respuesta directa a *"las preguntas se
repiten todo el tiempo"* (H5). Check nuevo (§12.6) verificado en rojo (sin el campo `peso`) y en
verde, regla de proceso 7.

## 12.3 — La consecuencia, antes de elegir

✅ **Cerrada en 12d.** `decisionDesdeEvento` ([events.js](src/systems/events.js)) manda, por opción:

```js
{
  id, label, descripcion,
  // Dirección y magnitud CUALITATIVA, nunca el número: la regla invariable 7
  // exige rangos, y mostrar "+7" sería mentir sobre un [4,11].
  previa: [{ campo: 'player.stats.mecanica', etiqueta: 'Mecánica', signo: '+', magnitud: 'alta' }],
  // Derivado de la dispersión REAL de outcomes de esta opción. Se calcula,
  // no se escribe a mano, así nunca miente. (Imagen 4: "un abrazo o un incendio".)
  riesgo: 'seguro'|'incierto'|'ruleta',
  peso: 'bisagra'|'normal'|'ambiente'   // 12c
}
```

`magnitud` se deriva de `(min+max)/2` (valor absoluto) contra bandas en
`BALANCE.eventos.magnitudBandas`, **una banda por familia de efecto** (`stat`, `ladder`,
`pool_aprender`, `pool_maestria`, `partido` — una sola tabla hubiera dado "alta" a todo LP y "baja"
a todo pool, escalas que no son comparables). `previa` se calcula en `core/previa.js`
(`previaDeOpcion`, puro, nuevo) con el peso **efectivo** de cada outcome (`pesoEfectivo`, exportada
desde `systems/events.js` en esta fase) para respetar `modificadores` — la previa no puede mostrar
lo mismo sin importar tus stats (CONCEPTO §8).

**Corrección a este documento (2026-09-12, fase 12d).** Este párrafo decía antes: *"`riesgo` se
deriva del coeficiente de variación de los `weight` de los outcomes"*. Eso estaba mal: dos outcomes
50/50 con efectos idénticos darían "ruleta" siendo perfectamente seguros (la tirada es pareja, pero
el resultado es previsible), y el propio check de §12.6 ("el riesgo declarado coincide con la
dispersión medida") fallaría por construcción apenas se implementara. `riesgoDeOpcion` deriva el
riesgo del **desvío estándar del PAYOFF normalizado entre los outcomes** (cada efecto dividido por
el corte "alta" de su familia en `magnitudBandas`, para que un efecto de `ladder` y uno de `stat` —
escalas distintas — aporten en términos comparables), ponderado por peso efectivo, contra
`BALANCE.eventos.riesgoBandas` (terciles medidos sobre las 442 opciones reales, no inventados). Un
50/50 de efectos idénticos da desvío 0 → "seguro", correcto. Confirmado sobre contenido real: las
opciones de mayor desvío medido son narrativamente apuestas (*"tirarte a la jugada"*, *"agarrar la
plata"* del sponsor cripto); las de menor desvío son las conservadoras (*"cerrar la app"*, *"seguir
grindeando"*).

`gateDeOpcion` (`core/previa.js`) traduce `opcion.conditions` (mismo esquema que
`evento.conditions`) a texto — *"Solo con Jerarquía ≥ 60"*. Hoy ningún evento del catálogo gatea
una opción propia (0/442): el cable queda tendido, sin contenido que lo ejercite todavía.
`decisionDesdeEvento` agrega además `opcionesBloqueadas: [{ label, gate }]` con las opciones que no
pasaron `disponibleEn` — no entran a `opcionesVivas`, no las ve `elegirOpcionAutomatica`, cero
consumo de `rng` (trampa T1).

## 12.4 — Rareza y el dado

- Las decisiones de mejora (pretemporada, práctica, `pool_a_cual_le_metes`) muestran **rareza**
  (`común` / `rara`) con payoff acorde. Imagen 3: `RARA` da `+4` contra `+3`.
- **Todo menú generado por sorteo se encabeza diciéndolo** (H10):
  *"El dado trajo tres caminos. Elegí uno."*
- **Toda pantalla de decisión grande nombra el eje del dilema**: `¿la guita o el proyecto?` ·
  `¿Qué clase de jungla sos?` · `Leé la sala.`

## 12.5 — Los torneos, con identidad

✅ **Cerrada en 12f.**

- Barra de progreso del bracket siempre visible (`CUARTOS · SEMI · FINAL` + `INTERNACIONAL` cuando
  corresponde), etapas superadas en verde (`crearBarraBracket`, `ui/components/serie.js`) — la ronda
  post-serie recién concluida también pinta según `gano`, no solo la ronda "actual".
- Un minijuego con identidad y nombre **por competición** (`nombresPorCompeticion` en
  `data/minijuegos.json`, con `internacional` y una entrada por liga tier 1, y `default` de resto),
  con intro narrativa que explica la regla en ficción (`reglaEnFiccion`) y dificultad que escala por
  ronda (`BALANCE.serie.dificultadMinijuegoPorRonda`: 1.0 en cuartos/semis, 1.2 en la final, 1.4 en
  el internacional — amortiguada por `amortiguacionDificultadMinijuego` en las dos mecánicas de
  velocidad, con un piso `pisoVentanaMinijuego` para que la ventana nunca sea injugable). Los 5
  minijuegos originales ya estaban migrados a `src/ui/components/minijuegos/` desde la fase T6; 12f
  les dio el tema.
- **El camino se guarda**: post-serie, la pantalla muestra cada mapa con su marcador y su cierre
  narrativo (`generarCierreMapa`, determinista por `hashCadena`, cero RNG), y se persiste en
  `registro.internacionales[].camino` para que la tarjeta final lo pueda citar
  (`ui/screens/tarjeta.js`).

## 12.6 — Checks de la fase 12

```
✅ Todo evento del catálogo declara `categoria` (check estático) — 12b
✅ Toda opción manda `previa` con ≥1 campo, o declara `previa: []` explícitamente — 12d
✅ El `riesgo` declarado coincide con la dispersión medida de outcomes (2000 resoluciones/opción) — 12d
✅ Una bisagra y una de ambiente producen `peso` distinto en el 100% de los casos — 12c
✅ Las decisiones de mejora (pretemporada, práctica, pool_a_cual_le_metes) declaran rareza con payoff acorde — 12e
✅ Toda serie internacional deja su camino guardado en registro.internacionales — 12f
✅ Ningún minijuego puede setear `terminado` (ya existe, no puede regresionar) — 12f
```

---

# FASE P — PUBLICAR

> No es una fase de juego: es la fase que convierte el repo en algo que otra persona puede abrir.
> Va acá porque `CLAUDE.md` no admite planear en el momento, y porque publicar destapa tres cosas
> que jugando en `localhost` no molestan y en público rompen el juego.

**Reordenada antes de la fase 13 el 2026-09-13.** La tabla de Estado la tenía como *"falta P.2, el
guardado, que es el último bloqueante"*. Auditado contra el código: P.2/P.3/P.5 los cerró la fase
T8 hace nueve commits (2026-09-04) y nadie vino a tacharlos acá — el documento seguía describiendo
un guardado y un repo que ya existían. Lo que de verdad falta es deploy y verificación (P.6, P.8),
no motor: por eso pasa a ser la fase activa, antes que el contenido de la 13.

## P.0 — El estado, medido

**Auditoría original del 2026-09-02.** Tres de sus filas quedaron falsas después de T8; se dejan
tachadas en vez de borrarlas, porque el resto del razonamiento de la fase (P.1, P.6) se apoya en
ellas y una auditoría vieja que se borra es una auditoría que se puede repetir de cero (trampa T6):

| Qué | Estado al 2026-09-02 | Re-medido 2026-09-13 |
|---|---|---|
| Base de datos | No hay ninguna | Sigue sin haber — `guardado.js`/`almacenamiento.js` usan `localStorage`, no una base |
| "Los datos" | Archivos estáticos | Sin cambios |
| Dependencias | 0 | Sin cambios |
| Build | Ninguno | Lo agregó **P.10**, dentro de esta misma fase |
| Peso a servir | 850 KB | `dist/` pesa **1561 KB** hoy (build del 2026-09-09, anterior a 10c/11/12 — ver P.6) |
| `server.js` | 60 líneas, solo dev | Sin cambios |
| Imports relativos | 274, case-sensitive | Sin cambios |
| Archivos con `_` inicial | Ninguno | Sin cambios |
| ~~Remote de git~~ | ~~No hay~~ | **Existe**: `origin → github.com/LeeSinMuayThai/LOL.git` (P.5) — pero desactualizado, ver P.5 |
| ~~Persistencia de la partida~~ | ~~Ninguna~~ | **Existe** desde T8: `core/guardado.js` + `ui/almacenamiento.js` (P.2) |

**Conclusión, vigente**: subirlo sigue siendo arrastrar una carpeta a un host estático. De las tres
cosas de P.1, dos quedaron cerradas del todo y la tercera (el guardado) también — lo que resta es
P.6/P.8, que nunca se habían intentado.

## P.1 — Los tres bloqueantes, por gravedad

1. ~~**No se guarda nada, y la sesión objetivo son 25-40 minutos.**~~ — **cerrado en P.2** (fase
   T8, 2026-09-04).
2. ~~**Los 5 `Math.random()` de `index.html`**~~ (D28) — **cerrado.** Pasaron a `rngUi`, un stream
   propio sembrado con `mulberry32((seed ^ 0x9E3779B9) >>> 0)`. Se le dio stream **separado** del
   `rng` del motor a propósito: si comieran del principal, el navegador (que juega los minijuegos)
   y `simulate.js` (que resuelve por `resolverAuto` y nunca los monta) divergirían para la misma
   seed — justo lo contrario de lo que P.3 necesita. Así el mundo sale idéntico de los dos lados,
   los minijuegos son deterministas, y **no se corre el stream** (trampa T1): las seeds anteriores
   siguen reproduciendo su carrera.
3. ~~**`with { type: 'json' }` en 32 imports**~~ — **cerrado por el build** (P.10), que los inlinea.
   `dist/` no lleva una sola declaración de import attributes y el piso de navegador baja de
   "Chrome 123 / Safari 17.2 / Firefox 138" a "soporta ES modules", que es 2018.

`file://` ya está cubierto: `index.html` detecta `location.protocol` y muestra un mensaje que
explica que hay que servirlo. No hace falta tocarlo.

## P.2 — El guardado, sin base de datos ✅ (fase T8, 2026-09-04)

`src/core/guardado.js` (puro: `serializar`/`deserializar`, clave `version`, guarda también
`rngUiEstado` para que los minijuegos no repitan la misma tirada al continuar) +
`src/ui/almacenamiento.js` (el `localStorage` real, mejor esfuerzo: si falla, la carrera sigue
jugándose igual, solo que sin red de seguridad). `core/rng.js:18-19` expone `.estado()` /
`.restaurar(n)`, que era la única pieza de motor que faltaba. Se guarda al cerrar cada split; se
borra si la carrera termina o si se arranca una nueva a propósito. La pantalla de inicio ofrece
**Continuar**, visible solo si `hayCarreraGuardada()` es real.

Verificado con dos chequeos, no uno (regla 15): `.restaurar()` reproduce exacto sobre 5 seeds
(corrida interrumpida vs. de corrido) **y** 12 seeds viejas siguen dando la misma huella
`finAnticipado:splits:soloqElo` contra el motor pre-T8 vía `git archive HEAD`. Cero divergencias en
los dos. Detalle completo en §T8 y `PROGRESO.md`.

## P.3 — La seed en la URL ✅ (fase T8, 2026-09-04)

`leerSeedDeUrl()` precarga el input desde `?seed=N`, sin arrancar la carrera sola. Destapó un bug
real y preexistente en `server.js`: `req.url === '/'` se comparaba contra el querystring todavía
pegado, así que `/?seed=N` nunca calzaba con `'/'` y cada visita con seed caía derecho al 404 — el
link que arma T7 nunca había funcionado. Corregido de paso. Detalle en §T8.

## P.4 — La página como página ✅ (2026-09-19)

Lo que T8 cerró: `<meta name="description">`, Open Graph + Twitter card (`og:title`,
`og:description`), favicon (SVG inline, el monograma cyan del topbar — cero archivo binario nuevo).

**Los dos pendientes de T8, cerrados:**
- **El nombre: "Un Split Más".** Diferido explícitamente desde T.2. Sale del vocabulario del
  juego mismo (el split es la unidad de tiempo de toda la partida, "El compás", más arriba) y de la
  sensación central que persigue todo el diseño (`CLAUDE.md`: "breve, profunda y rejugable" — el
  impulso de jugar "uno más"). Propagado a los 6 lugares donde vivía el placeholder: `<title>`,
  `og:title`/`twitter:title`, el lockup del topbar (`index.html`), el `<h1>` de accesibilidad, el
  label de la tarjeta final (`exportar.js`) y `README.md`. Monograma nuevo, `S+` (Split, "uno más")
  en vez de `LC` (`LoL Career`) — mismo tratamiento visual, favicon incluido.
- **`og:image` propia.** Autoría a mano, como pedía el plan (nada de headless en el build):
  `assets/og-image.svg` (fuente, mismo lenguaje visual que la tarjeta de fin de carrera de
  `exportar.js` — banda superior, marco, monograma, grilla) rasterizado a `assets/og-image.png`
  (1200×630) con ImageMagick + librsvg (`magick -background none og-image.svg -resize 1200x630
  og-image.png`, ya instalado en esta máquina), usando las fuentes del sistema que ya son el
  fallback declarado de `--font-display` (Bahnschrift SemiBold Condensed) — así que el render sin
  las webfonts del juego igual sale fiel a la identidad. `src/dev/build.js` copia el PNG puntual
  (no el `.svg` de autoría) a `dist/assets/`, y un check nuevo (`META_IMAGEN`) verifica que
  `og:image`/`twitter:image` resuelvan con capitalización exacta, igual que ya hacía con `<link
  href>` — verificado en rojo primero (renombrando la ruta a mayúsculas) y en verde después. Peso
  de `dist/`: 1482 → **1636 KB** (techo 1700 KB, con margen).

## P.5 — El repo ✅ (fase T8, 2026-09-04) — con un hallazgo nuevo

Cerrado lo del alcance original: `.gitignore`, `README.md` (qué es, cómo correrlo, cómo correr los
checks), `LICENSE` (MIT) y la línea de descargo de proyecto de fan sobre las ligas y organizaciones
reales. El remote existe: `origin → github.com/LeeSinMuayThai/LOL.git`.

~~**Hallazgo de la auditoría 2026-09-13**~~ — **cerrado 2026-09-15**: `master` estaba clavado en
`db3c82e` ("fase P parcial", el commit con el que T8 arrancó) mientras la rama de trabajo llevaba 72
commits sin subir (9Ec, 9M, 9W, 10, 11, 12 y P.6 punto 2 existían solo en este disco). Se optó por
mergear a `master` (fast-forward limpio, sin merge commit — `master` era ancestro directo de la
rama) en vez de apuntar el host a la rama de trabajo, porque es lo que un host sirve por default sin
configuración extra. `origin/master` y `origin/fase-9r-que-el-juego-se-juegue` ya tienen el estado
real del juego.

## P.6 — El host

**Decisión tomada (2026-09-02): el repo queda privado y el sitio es público.** Publicar el repo
publicaba también `PLAN.md`, `PROGRESO.md`, `CONCEPTO.md`, `DISENO.md` y `CLAUDE.md` — todo el
diseño, las mediciones de balance y el razonamiento interno. Eso descarta **GitHub Pages**, que
desde un repo privado exige plan pago.

**Cloudflare Pages o Netlify**, que sí despliegan desde un repo privado en el plan gratuito:

| Campo | Valor |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | cualquiera ≥ 18 |
| Variables de entorno | ninguna |

No hay dependencias que instalar: `npm ci` sobre un `package.json` sin `dependencies` no hace nada
y el build es Node puro.

**Sin conectar el repo**: `npm run build` y arrastrar `dist/` a Netlify Drop o a Cloudflare Pages
("Direct Upload"). Es el camino de un minuto para que lo pruebe alguien.

**Pendiente real, agregado en la auditoría 2026-09-13:**
1. ~~Pushear la rama actual (o mergearla a `master` — ver P.5)~~ — **cerrado 2026-09-15**: mergeado
   (fast-forward) y pusheado. `origin/master` en `84923c1`.
2. ~~**El techo de `dist/` de §T.7 (`≤ 1200 KB`) ya está roto**~~ — **cerrado 2026-09-15**.
   Re-medido con un build de hoy (incluye 10c/11/12 completas): **1482 KB**, menos que los 1561 KB
   del 9-13 pese a tener más contenido — el build de esa fecha corría sobre commits del 9/9, antes
   de que el paso 12f simplificara los fallbacks duplicados de `dificultadMinijuegoPorRonda`. En vez
   de solo subir el número (que era exactamente el bug: nadie lo hacía fallar), `build.js` ahora
   declara `PESO_MAXIMO_KB = 1700` y **hace fallar el build si `dist/` lo supera** — el reporte pasó
   a ser un check duro, para que este agujero no se vuelva a abrir en silencio.

## P.7 — El pre-flight ✅

Hecho, y no como script aparte: **vive dentro de `src/dev/build.js`** y corre en cada build, sobre
`dist/` — que es lo que realmente se sube, no sobre las fuentes. El build falla con exit 1 si algo
no da.

Verifica: cada import relativo resuelve con la capitalización exacta (Windows no distingue, el host
Linux sí) · no quedó ningún import attribute sin reescribir · no hay llamadas al azar del navegador
· ningún archivo empieza con `_` (Jekyll los ignora) · todo `.json` parsea · (13e/P.4) `<meta
og:image|twitter:image content>` resuelve con la misma capitalización exacta, mismo criterio que
`<link href>`.

~~Queda pendiente de 9Ed extender `guards.js` a `.html`~~ — hecho (commit `fase 9Ec+9Ed`): el
guard suma `.html` y recorre el primer nivel de la raíz del repo, así que `verificarSinMathRandom`
caza un `Math.random()` que vuelva a `index.html`. El build cubría el camino del deploy; ahora el
guard cubre el repo.

## P.8 — Verificación end-to-end

**Sigue pendiente — es lo próximo a hacer, junto con P.6.** No se puede completar hasta que el
sitio esté desplegado en una URL real:

1. Abrir la **URL publicada** (no `localhost`) en Chrome, Firefox y Safari, y en un móvil.
2. Jugar hasta mitad de carrera, **recargar la pestaña** y confirmar que continúa donde estaba.
3. Abrir el mismo `?seed=N` en dos navegadores distintos y confirmar que la carrera es idéntica.
4. Consola sin errores en toda la partida (ya se hizo así en la fase 8b, con Chrome headless
   vía CDP).

## P.9 — Qué queda explícitamente afuera

Backend, cuentas de usuario, tabla de récords global, guardado en la nube y analytics. Todo eso
deja de ser un sitio estático y trae servidor, base de datos y datos personales. Si alguna vez se
quiere, es una decisión de producto nueva — **no un requisito para publicar**.

## P.10 — El build ✅ (`src/dev/build.js`)

`npm run build` → `dist/`. Sin bundler y sin una sola dependencia: el proyecto no tiene ninguna y
esta fase no es excusa para agregar la primera.

1. **Copia** `index.html` + `src/core`, `src/data`, `src/systems`, `src/ui`. Deja afuera
   `src/dev/` (148 KB), `server.js` y los cinco `.md`.
2. **Inlinea los JSON**: cada `foo.json` pasa a `foo.json.js` con `export default {...}` y los 32
   imports se reescriben, incluido el dinámico de `index.html`. Parsear cada archivo valida el JSON
   de paso: uno roto revienta en el build y no en la pantalla del jugador.
3. **Comprueba** `dist/` (P.7).
4. **Verifica que el build no cambió el juego**: corre 12 seeds × 30 splits contra `src/` y contra
   `dist/` y compara la huella de cada carrera. Una transformación de código que rompe en silencio
   produce el peor bug posible —el juego local anda y el publicado no—, así que no se confía en que
   salió bien: se comprueba. Si una sola carrera difiere, el build falla.

**Verificación real hecha** (2026-09-02): `dist/` servido y cargado en Chrome headless. **87
peticiones, 87 con 200**; el único 404 es `/favicon.ico` (P.4, cerrado desde). Los 5 roles y el
grid de campeones renderizan, y los 27 módulos JSON inlineados cargan. El módulo de errores de
`index.html` no se disparó.

**Peso histórico** (trampa T6: no citar un número viejo sin re-medir): 576 KB (esta fase, parcial,
2026-09-02) → serie completa hasta 1092 KB en §T.7 → 1561 KB medido el 2026-09-13 (build anterior a
10c/11/12) → **1482 KB** medido el 2026-09-15 sobre un build de hoy, con techo duro de 1700 KB
fijado en `build.js` (P.6).

## Checks de la fase P

```
✅ mulberry32.restaurar() reproduce exacto: 5 seeds interrumpidas == corridas de corrido (P.2)
✅ 12 seeds pre-T8 dan la misma huella finAnticipado:splits:soloqElo tras el guardado (P.2, T1)
✅ npm run build compara 12 seeds × 30 splits entre src/ y dist/, 0 divergencias (P.10)
✅ dist/ ≤ techo declarado (1700 KB), y el build falla si lo supera — 1482 KB medidos hoy (P.6)
✅ Rama mergeada (fast-forward) y pusheada a origin/master (P.6 punto 1)
⬜ P.8 completo sobre la URL publicada (no localhost), en 4 navegadores
```

---

# FASE D — LOS CAMPOS QUE NADIE ESCRIBE ✅ (2026-09-15)

> Agrupa D30, D40 y D42 (auditoría 2026-09-13): tres campos que el motor declara y que el mercado,
> el registro o la ficha necesitan, y que ningún sistema llega a escribir nunca. Comparten síntoma
> (regla 15: lo que la tarjeta promete, el motor lo cumple) y tamaño — cada uno son pocas líneas —
> así que se cierran juntos, en un commit, **antes** que el contenido de la 13 dependa de ellos
> (el momento `sin_renovacion` no puede escribirse sin D.1).
>
> **Primera fase de este proyecto implementada por completo vía workers delegados** (regla del
> usuario: el supervisor escribe specs y revisa, nunca implementa). D.1+D.3 los hizo **Grok**
> (`grok-4.6`, `--reasoning-effort high`) en `git worktree` aislado; D.2 lo hizo **Gemini** vía
> `agy` (`gemini-3.8-flash-high`), en otro worktree, en paralelo. Un tercer agente (Opus) auditó
> los dos diffs de cero —sin confiar en los reportes de los workers— antes del merge: corrió
> `validate.js` completo, `simulate.js 1500 60 todas` y la sonda anti-T1 él mismo. Encontró 3
> defectos menores en el reporte de Grok (no en su código): una atribución causal falsa sobre un
> número que en realidad había mejorado, un comentario que afirmaba que una guarda "antes tiraba"
> sin haberlo medido, y un flag que quedaba prendido para siempre. Grok corrigió los 3 en una
> ronda; Gemini pasó sin corrección. Los dos diffs mergearon limpios (archivos disjuntos salvo
> `validate.js`, sin conflicto).
>
> **El T1 declarado de antemano no ocurrió.** La sospecha original era que D.3 (limpiar
> `career.liga`) iba a correr el stream de RNG en el camino de queda-libre. Medido por el revisor y
> reconfirmado por el supervisor con una sonda propia de 40 seeds: el consumo de `rng()` es
> **idéntico seed por seed** contra `a99d985` (el HEAD previo a la fase). La huella
> `finAnticipado:splits:soloqElo` no cambió ni una sola vez en las 40 seeds — la única diferencia
> observable es el propio campo que D.3 arregla (`career.liga` pasa de conservar la última liga a
> `null` en la seed 8, que atraviesa free agency). D.3 cambia un dato del estado, no una decisión
> del motor, así que no había ninguna tirada nueva que correr.

## D.1 — `ultimo_ano` y `sin_renovacion` (D30) ✅

`calcularMercado` (`core/contexto.js:137-139`) hoy solo distingue `contrato_firme`/`sin_contrato`.
`contextos.js:17` ya declara los cuatro valores del eje completo, y `contrato.aniosRestantes` ya
existe en el estado — la información está, falta leerla:

- `ultimo_ano`: `currentOrg` existe y `contrato.aniosRestantes` es el último año antes del vencimiento.
- `sin_renovacion`: el club ya avisó que no renueva — el gancho narrativo que el momento
  `sin_renovacion` (`contextos.js:146`) necesita para dejar de estar `pendiente: 'paso11'`.

Desbloquea ese momento y dos de los `pendiente` de §13.1 punto 2.

**Cerrado.** `calcularMercado` (`core/contexto.js`) devuelve los 4 valores. `ultimo_ano` reusa el
mismo criterio que ya usaba `temporadaResumen.js` (`aniosRestantes <= 1`). `sin_renovacion` necesitó
una señal nueva que no existía: `career.contrato.avisoNoRenovacion` (inicializado en `false` en
`state.js`, trampa T4), que `systems/mercado.js` prende/apaga cada pretemporada según si
`generarOfertas` trajo o no una oferta con `tag: 'renovacion'` — **sin tirada nueva de RNG**, esa
decisión ya se sorteaba adentro de `generarOfertas`. Se le sacó `pendiente: 'paso11'` al momento.
**Medido** (400 seeds × 60 splits, split-starts): `sin_contrato` 24.3%, `contrato_firme` 35.6%,
`ultimo_ano` 39.7% (tan alto porque `aniosContratoMin` es 1 — un contrato de un año entra directo a
último año), `sin_renovacion` 0.36% (74 splits; el momento en sí se vio en 41 de esos, el resto lo
tapó algo de más prioridad).

## D.2 — `registro.picos.rankedPuntos` (D40) ✅

Declarado en `state.js:211`, **0 escrituras** en todo `/src` (verificado por grep). Es la mitad de
D40 que sigue abierta — la otra mitad (`mundo.archirrival`) la cerró la fase 11. Escribir el pico
donde ya se registran los demás (`core/registro.js`, junto a `registrarPico`), o borrar el campo si
no hay pantalla que lo vaya a mostrar todavía — cualquiera de las dos cierra el bug de confianza;
dejarlo declarado y en cero es lo único que no vale.

**Cerrado: se escribe** (no se borró). `conRanked` (`core/ranked.js`) llama a `registrarPico(...,
'rankedPuntos', puntosAbsolutos(ranked))` en el mismo lugar donde ya actualiza el espejo derivado
`player.soloqElo` — sin escribir un máximo a mano, reusando la función genérica que ya usan
`jerarquia`/`arraigo`/`hype`/`valorMercadoUSD`/`salarioAnualUSD`. No toca `player.soloqElo` (sigue
prohibido escribirlo desde fuera de esta función, `validate.js` lo aserta). **Medido** (300 seeds ×
60 splits): **300/300 carreras que pisaron ranked terminan con el pico > 0**, máximo observado
**6082**, **0 violaciones de monotonía**.

## D.3 — `career.liga` no se limpia al quedar libre (D42) ✅

`quedarLibre` (`systems/mercado.js:363-379`) limpia `currentOrg`/`rosterDeOrg`/`companeros`/
`sinergia` pero no `liga`. Un free agent sigue "perteneciendo" a su última liga mientras entrena y
sube de nivel. `career.liga` se lee en 12+ lugares (`ficha.js`, `competitivo.js`, `escena.js`,
`topMundial.js`...) — auditar cada call site antes de limpiarlo, no es un fix de una línea. Impacto
ya medido: infla el check "el silencio del mercado es para los que están por debajo" (72% contra un
piso que ya se bajó 90%→60% para absorber el ruido en vez de tocar la causa).

**Cerrado.** `quedarLibre` y `resolverBanquillo` (mismo síntoma, mismo fix) ahora limpian
`career.liga` a `null` junto con lo demás. De los 13 lectores de `career.liga` en `/src`, 12 ya
toleraban `null`; el único que no (`core/serie.js`, rival doméstico: `ligas.find(...)` seguido de
`liga.orgs.filter(...)` sin guarda) ahora tira un error explícito con contexto en vez de devolver un
rival fantasma de fuerza 0 — medido: 0/300 seeds × 60 splits lo alcanzan hoy, es una guarda
defensiva para el futuro, no un camino real (**trampa T6**: el comentario original decía que ese
camino "antes tiraba" sin haberlo medido; se corrigió a la vez).

**El "72%" del párrafo de arriba estaba obsoleto** (trampa T6, encontrado en la revisión): era un
comentario de la fase 10c/11 nunca vuelto a medir. El baseline real contra `a99d985` (n=1500, mismo
check) es **61.111% (44/72)**; con D.3, **61.290% (38/62)** — el número **subió**, no bajó, y no se
tocó el piso del check (sigue en 60%). Lo que cambió es el denominador: D.3 hace que los free agents
salgan del conteo (el check ya excluía splits sin `career.liga`), no que el mercado se comporte
distinto.

## Checks de la fase D — los 5 en verde

```
✅ calcularMercado() devuelve los 4 valores del eje mercado en carreras reales, no solo 2
✅ El momento sin_renovacion deja de estar pendiente en cobertura.js
✅ registro.picos.rankedPuntos > 0 en toda carrera que pisó ranked
✅ career.liga es null en todo split con career.currentOrg null (regla 15)
✅ Huella finAnticipado:splits:soloqElo idéntica contra a99d985 en 40 seeds — el T1 declarado no
   ocurrió (D.3 cambia un dato del estado, no una decisión del motor; ver nota de arriba)
```

---

# FASE 13 — CONTENIDO A ESCALA

> **Reescrita el 2026-09-13.** Se escribió cuando el catálogo tenía 22 eventos / 46 opciones; hoy
> tiene **220 / 442**, y `cobertura.js --huecos` reporta un solo hueco. La mitad de esta fase ya
> pasó sola, empujada por el contenido que fue entrando fase a fase (8D, 9R.3, 12b). Lo que sigue
> es más chico que "escala": son las puntas sueltas reales, medidas hoy.

## 13.0b — Commits (2026-09-18)

**Ejecutada íntegramente por esta sesión (Sonnet), sin delegar a grok/agy** — excepción puntual al
workflow de delegación habitual del proyecto, decidida por el usuario para esta tanda.

| Sub-fase | Qué resuelve |
|---|---|
| 13a | Puntos 1, 2 y 5 de §13.1 (ya estaban en el árbol sin commitear) + 2 defectos encontrados al auditarlos: los 2 eventos de servicio militar quedaron gateados a una marca inalcanzable (`marcas: ['servicio_militar']` vive y muere dentro de un split), y `MOMENTOS` dejó de estar ordenada por `prioridad` |
| 13b | D11 — rutinas de offseason por tier |
| 13c | Servicio militar como bisagra alcanzable + contenido propio de declive |
| 13d | D34 (tier 3 tiene historia), D17 (LATAM narrativo), D14 (rango de opciones 2-4) |
| 13e | Check T10 (densidad por celda), remedición completa, D43 (deuda documental) |
| 13f (2026-09-19) | El catálogo de la cima que la fase 9Wb dejó prometido y ninguna versión de §13.1 llegó a listar: `top_mundial.json` tenía 2 eventos "semilla" con un comentario explícito ("el catálogo real... es fase 13") que nadie reclamó. 4 eventos nuevos: `el_sponsor_bomba`, `defender_el_trono` (marca `mejor_del_mundo`, la más específica — ser el #1, no solo top 20), `la_prensa_te_destrona` (combina `marcas: top_mundial` + `momentum: crisis/slump`) y `el_rival_que_te_pasa` (usa el token `{rival}` ya existente). Encontrado auditando comentarios de código que citaban "fase 13" después de cerrar 13a-13e — la misma clase de deuda no reclamada que D43/D7/D41, pero en un comentario de código en vez de una tabla |

- **Objetivo de escala**: `cobertura.js` lo confirma solo —
  `opciones totales del catálogo: 442 / objetivo 150 ✔`. No hace falta escribir más por volumen.
- **`categoria` en todo evento nuevo**: 220/220 desde 12b, con check estático (`validate.js:329`,
  "Todo evento del catálogo declara categoria válida").
- **Contenido que cita el registro** (punto 2 de la especificación original): ya existe
  `data/events/registro_cita.json` (7 eventos, fase 8D) con su propio check
  ("una fracción sana ve al menos un evento que escribe un momento").

**Corrección a la especificación original**: decía *"todo evento nuevo declara `categoria` (12.1)
y `previa` (12.3)"*. Eso ya no es así ni debería serlo — 12d hizo `previa` **derivada**
(`core/previa.js`, `previaDeOpcion`) justamente para que no pueda mentir sobre el rango real de un
outcome; ningún evento la trae en el JSON (0/220, correcto). El check vigente (`validate.js:359`,
"Toda opción manda previa…") verifica la derivada, no una declaración.

**La tabla de archivos por escribir** (`equipo.json`, `vestuario.json`, `mercado.json`,
`region.json`, `soloq_pro.json`, `serie.json`, `declive.json`, `retiro.json`/`vuelta.json`)
describía un plan que no es el que se siguió: **ninguno de esos ocho archivos existe.** El
contenido equivalente se escribió en otros archivos a medida que cada fase lo necesitó
(`estatus.json`, `marcas_vivas.json`, `negocios.json`, `competicion.json`, `escena_2026.json`,
`drama_prensa.json`, `partido/*`). No hay una tabla de archivos que escribir: hay huecos puntuales
(13.1).

**El roster enriquecido** de la apertura original quedó medio hecho: desde 9Ma, un compañero que
sale de un plantel NPC ya trae `edad` y `aniosContrato` (`systems/roster.js:30-37`). Faltan
`nacionalidad`, `esImport`, `personalidad` (`veterano_cinico | rookie_ansioso |
estrella_egocentrica | soldado_callado | carismatico`) y `relacion` 0-100 — sigue siendo la
variable más barata del juego para dar variedad al mismo evento de vestuario, y sigue habilitando
la opción D del draft (4.4).

## 13.1 — Lo que queda de verdad

1. ✅ **Cerrado (13a).** El único hueco de cobertura: `retirado_reciente / pretemporada` tenía 2
   eventos contra un mínimo de 6. `data/events/retiro_y_vuelta.json` (4 eventos nuevos) lo cierra
   — medido: `cobertura.js --huecos` → "Sin huecos", catálogo 442 → 455 opciones.
2. ✅ **Cerrado (13a).** Los momentos `pendiente` que citaban fases ya cerradas (regla de proceso 6
   incumplida por las fases 11 y 12):
   - `import_recien_llegado`: se le sacó `pendiente: 'paso11'`. Alcanzable, ya ejercitado por el
     catálogo existente.
   - `veterano_util` / `veterano_al_margen`: se les sacó `pendiente: 'paso11'` y se reordenaron
     antes de los catch-all de tier 1 (que no filtran `etapa` y se comían el match). Medido: pasan
     de "nunca observados" a observados en 300 carreras — sí eran alcanzables, solo mal ordenados.
   - `sin_renovacion`: seguía bloqueado por motor hasta D.1 (fase D, cerrada 2026-09-15). Ya no
     aplica la restricción.
   - `retirado`: borrado — superado por `retirado_reciente` (10a, prioridad 95), nunca se
     muestreaba.
   Defecto encontrado al auditar el reorden: `MOMENTOS.find()` (`core/contexto.js:368`) resuelve
   por **orden del array**, no por el número de `prioridad` — el reorden dejó `20/18` antes de
   `30/28`, funcional pero silenciosamente inconsistente. Se renumeró a `33/32` y se agregó un
   check que exige la tabla monótona decreciente, para que nadie vuelva a confiar en el número.
3. ✅ **Cerrado (13b).** D11 — las 7 rutinas de `data/rutinas/offseason.json` ahora declaran
   `nivel`/tier (antes 0 de 7). `bootcamp_corea` (la única agresiva original) quedó reservada a
   tier1/tier2; se sumó una rutina agresiva propia de tier 3 para no dejarlo sin ninguna. Check
   ampliado: cada tier ofrece segura **y** agresiva en corrida real (antes solo lo exigía en
   tier1/tier2).
4. ✅ **Cerrado (13d).** D14 — de 223 eventos de 2 opciones / 3 de 3 / 0 de 4 (sobre 226), el
   contenido nuevo de 13c/13d usa el rango completo que pide `CONCEPTO` §3.
5. ✅ **Cerrado (13a).** El gateo de `sin_equipo`: `cobertura.js` reportaba mayoría sin gatear en
   playoffs y regular. `retiro_y_vuelta.json` ancla contenido apropiado a la celda — medido: 0 sin
   gatear en las tres ventanas.
6. ✅ **Cerrado (13d), como narrativo.** D17 — LRN/LRS no se modeló como `leagues.json` nuevo (la
   decisión original se respetó): 2-3 eventos para un jugador de origen NA/BR con lore de la escena
   LATAM (doble residencia, el viaje, la liga regional que no clasifica a nada).
7. ✅ **Cerrado (13c).** Servicio militar como bisagra: además del único evento de anticipación que
   ya existía (`el_servicio_que_se_viene`), se escribió contenido de vuelta/adaptación gateado por
   `region: ['KR']` + `flags.servicioCumplido`/`exentoServicio` — reemplaza los 2 eventos que
   habían quedado gateados a una marca que nunca sobrevive entre splits (ver 13a).
8. ✅ **Cerrado (13d).** D34 — tier 3 pasa de 1 evento exclusivo (`tier3_el_cierre_de_un_armado_chico`)
   a un catálogo propio (`data/events/tier3.json`): sueldo tardío, coach-dueño, gaming house real,
   line-up que se disuelve, scrim contra una academia, torneo regional como única vidriera. No se
   tocó `probAscensoBaseDesdeTier3` (`balance.js`) — regla de proceso 3, contenido primero. Si el
   p90 de 12 splits en el nivel sigue leyéndose largo después de esto, ese es el próximo commit,
   aparte.

## Checks de la fase 13

```
cobertura.js --huecos vacío                                              ✅ (13a) — 508 opciones
0 momentos alcanzables marcados pendiente citando una fase ya cerrada     ✅ (13a)
  (regla de proceso 6)
"MOMENTOS: el array manda, pero nunca en contra de lo que dice           ✅ (13a) — check nuevo
  prioridad" (verificado en rojo: seed 1 lo agarra en split 34
  con la prioridad vieja de veterano_al_margen)
"Las rutinas de offseason declaran nivel y cada tier mantiene su         ✅ (13b) — check
  segura+agresiva propias (D11, 13b)" — las 8 declaran nivel,             ampliado, en rojo 2x
  cada tier ofrece agresiva propia en corrida real
sin_equipo/playoffs, /pretemporada y /regular: 0 sin gatear (D26c)        ✅ (13a)
"T10: ninguna celda alcanzable pasa el 25% de splits sin evento"          ✅ (13e) — check nuevo,
  — peor celda real medida: 3,7% (sin_equipo/playoffs)                    verificado en rojo al 2%
D14: ≥6 eventos de 3 opciones y ≥3 de 4 (CONCEPTO §3, "2 a 4")            ✅ (13d) — 10 y 3
```

---

# FASE V — Que la carrera se vea

> Sucede a la fase T ("La transmisión") y es su escalón siguiente: T dio al juego un sistema de
> diseño serio; V lo usa para mostrar lo que el motor ya calcula y hoy nunca se ve.

## V.0 — Contexto

**El juego está terminado. La carrera no se ve.**

Con las fases 0→13 cerradas el motor simula una carrera completa de los 15 años al retiro:
`career.registro` acumula 10-25 años de historia real (`porOrg`, `temporadas`, `titulos`,
`internacionales`, `momentos`, `picos`), y `state` tiene ~40 sub-objetos vivos. La fase T le dio
al juego un sistema de diseño serio: `tokens.css` con **102 custom properties** (contadas
2026-09-19, `grep -oE '^\s*--[a-z0-9_-]+:' tokens.css | sort -u | wc -l`), 4 candados estáticos en
`validate.js` (cero color literal, cero token sin definir, cero tinta de fondo en hover, contraste
WCAG ≥ 4.5:1), fuentes auto-hospedadas, `prefers-reduced-motion` respetado en CSS y en JS, foco
visible, shell de transmisión con topbar/ticker/dos rieles, y un reproductor de beats que revela
el log con pulso.

Tres hechos medidos sobre el repo en `HEAD` (`400f6b6`, 2026-09-19):

1. **No hay un solo gráfico en todo el juego.** `grep -rn "createElementNS" src/ui/` devuelve
   **cero**. Los únicos SVG son los 4 iconos de [iconos.js](src/ui/components/iconos.js) y el
   grano de fondo; el único canvas es el PNG de [exportar.js](src/ui/exportar.js). Un simulador
   cuyo tema **es una trayectoria de 25 años** no dibuja la trayectoria en ningún lado.
2. **La UI solo sabe hablar en presente.** Todo lo que se ve es el valor de ahora: el LP de ahora,
   el nivel de ahora, la tabla de ahora. `registro.porOrg` — que es literalmente un dataset de
   cinta temporal (`org, liga, tier, desdeAnio, hastaAnio, splits, fechasG/P, jerarquiaMaxima,
   arraigoMaximo/Final, titulos[], salarioAnualUSD, motivoDeSalida`, [registro.js:20-34](src/core/registro.js#L20-L34))
   y `registro.temporadas` — una nota 0-10 por año ([resumenAnio.js:32](src/systems/resumenAnio.js#L32))
   — se muestran **una sola vez, al final, como texto**.
3. **Nada puede animarse entre estados.** Cada tick repinta con `replaceChildren`: los nodos se
   destruyen, así que no hay identidad que animar. `countUp.js` existe pero solo sirve donde el
   nodo sobrevive. La consecuencia es que **la regla de proceso 13** (*"todo número en pantalla
   lleva referente"*) hoy se cumple con texto (`▲3`) y nunca con movimiento — el delta se cuenta,
   no se ve.

Hay además un hilo visual **sin cerrar** (D48): cuatro commits `wip: pasada de HUD y chrome`
(`059b6c6`, `b56cfe8`, `53881c2`, `9b83478`) que se commitearon a medias para no bloquear otras
fases, con sus propios rótulos internos **F0/F1** que no corresponden a ninguna fase de este
documento (`tokens.css:24` *"F0 saca el navy"*, [material.css:2](src/ui/estilos/material.css#L2)
*"MATERIAL — primitivos de HUD (F1)"*). El último de los cuatro dice el diagnóstico solo: *"el
corte de 10px y el hielo al 7 por ciento no se leían a un metro"*. `material.css` quedó con la
clase `.ticks` declarada y **nunca usada** (D47) — sus reglas están copiadas a mano sobre una
lista de 11 selectores ([material.css:15-82](src/ui/estilos/material.css#L15-L82)).

**Esta fase adopta ese track como línea de base**, no lo reabre ni lo deshace: es el estado real
de `tokens.css`/`material.css`/`hud.css`/`overlay.css` en `HEAD`, ya mergeado a `master`, y todo lo
que sigue construye encima (paleta grafito/obsidiana, `--ice`, `--chamfer: 40px`, `.corte`/`.bisel`).
Lo único que hereda como deuda explícita es cerrarlo con una regla medible en vez de "a ojo" — eso
es **V8** (D47+D48).

**Resultado buscado.** Que la prueba final de este documento (*"si al final la carrera se puede
narrar en cinco frases sin mirar el log, el juego está"*) se pueda pasar **mirando la pantalla**,
no reconstruyendo la historia de memoria. Y que la UI deje de ser "una página oscura muy bien
hecha" para ser un producto que se lee como una transmisión de esports de verdad: con telemetría
viva, gráficos propios, escenografía entre escenas y una vitrina de la carrera.

## V.1 — Restricciones duras (esta fase no las negocia)

| Restricción | De dónde sale | Qué implica para esta fase |
|---|---|---|
| **Cero dependencias** | `package.json` no tiene `dependencies`; [base.css:10-12](src/ui/estilos/base.css#L10-L12) es explícito | Sin React, sin D3, sin librería de charts. Todo SVG a mano con `createElementNS` |
| **Cero color literal** | `verificarSinColorLiteral`, [guards.js:99](src/dev/guards.js#L99) | Hoy solo escanea `estilos/*.css`. **Un `fill="#2ee8ff"` en JS hoy pasa el candado** (D44) → esta fase extiende el guard a `src/ui/**/*.js` |
| **El motor no toca el DOM** | regla invariable 2; `verificarDocumentSoloEnUi`, [guards.js:41](src/dev/guards.js#L41) | Los gráficos leen `state`, nunca lo escriben. Ningún selector nuevo en `/core` que necesite el DOM |
| **Cero `Math.random()`** | regla invariable 1; el guard cubre `.js` y `.html` | Toda animación es por tiempo/`performance.now()`, nunca por azar. Si algo necesita variación, sale de `rngUi` |
| **Determinismo intacto** | trampa T1 | Esta fase **no debe mover un byte del motor**. Se verifica con huella de N seeds antes/después |
| **El shell no se monta desde JS** | [shell.js:1-13](src/ui/shell.js#L1-L13) | *"si algo de acá explota, el juego de abajo sigue jugable"*. El DOM base sigue declarado en `index.html`; lo nuevo se monta **dentro** de contenedores que ya existen |
| **Techo de `dist/`** | `PESO_MAXIMO_KB = 1700`, [build.js:51](src/dev/build.js#L51); medido 2026-09-19: **1647 KB** (D49) | **Margen real: 53 KB.** Esta fase lo va a superar → se re-mide y se sube el techo **con número**, en su propio commit (regla 2) |
| **Ninguna fase cierra sin su pantalla** | regla de proceso 12 | Cada subfase de acá entrega pantalla **y** su check en `validate.js`, verificado en rojo (regla 7) |
| **`prefers-reduced-motion`** | [base.css:202-215](src/ui/estilos/base.css#L202-L215) + [reproductor.js:77](src/ui/reproductor.js#L77) | Todo lo nuevo que se mueva tiene que tener su camino quieto, en CSS **y** en JS |

**Fuera de alcance, ya decidido** (ver "Fuera de alcance" más abajo): tienda/activos/staff,
selección nacional como track propio, escudos reales de las orgs (monograma + color), simular el
resto del bracket, doble eliminación. **Esta fase no los reabre** — y en particular no propone
ningún gráfico que necesite datos que el motor decidió no simular.

### Campos que parecen serie y no lo son (verificado leyendo el motor, no asumido)

| Campo | Qué parece | Qué es de verdad |
|---|---|---|
| `career.historial` | Historial de carrera | **Ventana móvil de 3** (`BALANCE.contexto.historialMaximo`, recortada en [contexto.js:411](src/core/contexto.js#L411)). Sirve para "cómo venís" del HUD, no para una curva |
| `career.temporada.tabla` | Tabla de posiciones ya lista | **Vacía toda la temporada**, se llena solo al cerrar. La fuente viva es `tablaDePosiciones(registrosOtros, filaPropia)` — ya la usa [paneles/tabla.js](src/ui/paneles/tabla.js) |
| `career.contracts` | Historial de contratos | **Campo muerto**: se inicializa y nadie lo escribe nunca. No usar |
| `mundo.rivales[].desenlace` | Cómo terminó cada rival de generación | **Siempre `null`**, ya documentado como tal en [paneles/generacion.js:33-36](src/ui/paneles/generacion.js#L33-L36) |
| Curva de nivel/LP/jerarquía por split | Un array `porSplit` | **No existe.** El único rastro fino vive desperdigado en `state.logs` (`type:'split'` trae mecánica/macro/mentalidad, `type:'amateur'` trae LP/rango) |

**La consecuencia para V2/V3.** Las capas centrales de LA TRAYECTORIA (`registro.porOrg`,
`registro.temporadas`, `registro.momentos`, `registro.picos`, `mundo.archirrival.historial`) son
arrays completos, reales, que nunca se recortan — no dependen de nada de esta tabla. Una curva
*fina* (nivel en cada uno de los ~50 splits, no solo el resumen anual) es deseable pero
**secundaria**, y solo se puede construir parseando `state.logs` en la capa de UI — nunca agregando
un array nuevo a `career.registro` (eso sería tocar el motor, exactamente lo que la tabla de
restricciones de arriba prohíbe). Queda marcada como técnica disponible para V2, no como bloqueo:
la pantalla insignia se entrega completa con los arrays que ya existen.

## V.2 — El principio de esta fase

Tres reglas propias, del mismo tipo que el "principio rector" de este documento. Cualquier
pantalla que las rompa se rechaza aunque se vea bien.

1. **Un gráfico solo existe si responde una pregunta que el jugador se hace.** "¿Estoy mejorando?"
   "¿Fue este mi mejor año?" "¿Cuánto me queda?" "¿Este equipo me sirvió?" Un gráfico decorativo
   es peor que ninguno: enseña que los gráficos de esta pantalla no significan nada.
2. **El delta se ve, no se lee.** La regla 13 pide referente; esta fase pide que el referente sea
   visual. Si el nivel subió 3, el número se mueve y la barra crece desde donde estaba. El texto
   `▲3` queda como refuerzo, no como el único portador.
3. **Todo gráfico se puede leer sin ver.** `role="img"` + `aria-label` con los números reales, y
   tabla `.solo-lectores` donde haya serie. Un SVG sin nombre accesible es un sistema que el
   jugador no puede ver — regla 12, aplicada a sí misma.

## V.3 — Commits

> Orden por dependencia dura, igual que las fases 8-11. **V0 va primero y no cambia un pixel**:
> es el desbloqueo sin el cual V3/V5 no pueden animar nada (regla de proceso 2 — no se
> reestructura y se ajusta en el mismo commit).

| # | Commit | Qué entrega |
|---|---|---|
| **V0** | el kernel | El store, el reconciliador y el delta — refactor puro, cero cambio visual |
| **V1** | la capa de gráficos | `src/ui/graficos/`, seis primitivos SVG inline, cero deps, el guard de color literal en JS |
| **V2** | LA TRAYECTORIA | La pantalla insignia: la carrera entera en una vista, sobre datos que ya existen |
| **V3** | la ficha viva | El HUD deja de repintarse y empieza a moverse |
| **V4** | la previa y la serie | Tale of the tape, el Fearless como tablero, el marcador de transmisión |
| **V5** | el mundo | Los rieles apretados se vuelven pantallas completas |
| **V6** | la escenografía | El director de escena: transiciones, lower-thirds, title cards |
| **V7** | navegación | La app tiene cuartos: modelo de navegación teclado-primero, cierra D46 |
| **V8** | el metro y el teléfono | Cierra el hilo WIP (D47+D48) + responsive real hasta 360px |
| **V9** | el candado | Los checks estáticos nuevos + el techo de `dist/` re-medido (D49) |
| **V10** | calibrar | Duraciones, curvas, escalonados y densidades — solo constantes |

## V0 — El kernel: el store, el reconciliador y el delta *(refactor puro, cero cambio visual)* ✅ (2026-09-19)

**El problema.** El controlador son ~520 líneas de `<script type="module">` dentro de
`index.html:184-708`, con `estado`/`rng`/`rngUi` en un closure que no se expone a propósito. Eso
estuvo bien hasta acá, pero tiene un costo ya medido: **la dependencia se invirtió**.
[components/ficha.js:11](src/ui/components/ficha.js#L11) importa `../shell.js` y en cada render
llama `actualizarTopbar(state)` + `aplicarEstudio(state, ficha)`
([ficha.js:303-304](src/ui/components/ficha.js#L303-L304)) — el chrome global (topbar, luz de
estudio) se actualiza **desde un componente hoja**, porque es el único sitio fuera del closure que
tiene `state` a mano. Ninguna pantalla nueva puede suscribirse a nada, y cada tick repinta por
`replaceChildren` (nodo destruido = animación imposible).

**Qué entra.**

| Archivo | Qué es |
|---|---|
| `src/ui/app.js` (nuevo) | El controlador, movido tal cual desde `index.html`. Exporta `iniciar()`. `index.html` queda en markup + `<script type="module">import {iniciar} from './src/ui/app.js'; iniciar();</script>` |
| `src/ui/core/store.js` (nuevo) | `crearStore(inicial)` → `{ leer(), escribir(next), suscribir(fn) }`. Sin globals: `app.js` lo crea y lo pasa. Es la única vía por la que una pantalla nueva ve `state` |
| `src/ui/core/reconciliar.js` (nuevo, ~90 líneas) | `reconciliar(contenedor, items, claveDe, crear, actualizar)`. Parchea en el lugar por clave en vez de reemplazar. Con salida FLIP opcional para reordenamientos (tabla de posiciones, Top 20) |
| `src/ui/core/delta.js` (nuevo) | `crearDelta(paths)` → `{ medir(state) }` devuelve `{ path: [antes, despues] }` para el set de paths declarado al crearlo. Es lo que vuelve visual la regla 13 |

**Lo que NO cambia.** Ni un selector, ni un token, ni un texto. Las funciones de
[render.js](src/ui/render.js) mantienen su firma exacta; `reconciliar` se adopta **solo** en las
listas con clave natural (feed, tabla, plantilla, Top 5, mercado) y en un commit aparte del de la
mudanza (**V0b**, no incluido en el commit de V0 — ver Estado). La inversión `ficha.js → shell.js`
se resuelve de paso: con `state` disponible en el closure de `app.js`, `actualizarTopbar`/
`aplicarEstudio` pasan a llamarse desde `app.js` en el mismo punto donde hoy se llama
`renderFicha`/`renderCarrera`, no desde adentro de la ficha — `renderFicha` devuelve la `ficha` ya
calculada (antes devolvía `undefined`, sin consumidores) para que `app.js` no tenga que recalcularla.

**De paso, dos bugs reales que aparecieron al mapear este mismo camino de código (no se buscaban,
se encontraron mirando lo que V0 tiene que tocar de todos modos):**
- **D45.** `continuarCarrera()` (`index.html:604-644`) nunca llama a `renderFeed`: al retomar una
  carrera guardada, `#logList` arranca vacío aunque `estado.logs` tenga la historia completa, y si
  además hay una decisión pendiente se queda vacío indefinidamente. Se resuelve solo: con el store
  centralizado, "retomar" y "avanzar" convergen en el mismo camino de pintado (`ui.renderCarrera`).
- **D46.** Los atajos de teclado 1-4 en el mercado son inertes
  ([shell.js:184-192](src/ui/shell.js#L184-L192) espera `mercadoGrid.children[i]` como botón, pero
  [mercado.js:50](src/ui/components/mercado.js#L50) pinta un `div.mercado-card`). Se anota para
  **V7** (navegación), que es donde el modelo de teclado se revisa entero.

**Checks (verificados en rojo antes de arreglar, regla 7).**
- ✅ `index.html` ≤ 200 líneas y **cero** `function`/`const` de lógica de juego (710 → **194
  líneas**). Guard nuevo `verificarSinLogicaEnIndexHtml`, verificado en rojo inyectando una función
  de prueba y confirmando que el check la caza.
- ✅ `reconciliar` preserva identidad de nodo: mismo `claveDe` en dos pasadas ⇒ `nodo === nodo` (test
  unitario en `validate.js`, sin DOM real — con un doble mínimo de `Element`/`Node`).
- ✅ **Huella de determinismo idéntica** en 40 seeds antes/después (`git archive HEAD | tar -x`,
  `finAnticipado:splitCount:soloqElo`). Confirmado además con la misma seed corrida dos veces
  (`state` serializado idéntico bit a bit).
- ✅ `verificarDocumentSoloEnUi` sigue en verde (nada de esto se filtró a `/core`).
- ✅ Suite completa: `validate.js` **189/189 OK, 0 FAIL**. `simulate.js 1500 60 todas`: **0
  crashes** (4500 carreras, 3 estrategias). `build.js`: **1653 KB** (techo 1700, margen 47 KB).

### V0b — Adoptar `reconciliar` en las cinco listas de clave natural ✅ (2026-09-19)

El commit aparte que V0 dejó pendiente. `reconciliar`/`delta` existían pero no los llamaba nadie
fuera de sus propios checks; V0b los conecta a las únicas cinco listas del juego con clave natural:
`feed.js` (índice absoluto en `state.logs`, que solo crece — nunca se recorta ni reordena, así que
es una clave estable), `paneles/tabla.js` (`fila.org`), `paneles/plantilla.js` (`handle`),
`paneles/topMundial.js` (`handle`) y `components/mercado.js` (`oferta.id`, la misma clave que ya usa
`onElegir`).

**Cómo se evitó reescribir cada `crear` a mano.** En vez de escribir un `actualizar(nodo, item)`
distinto por lista que mute cada campo (riesgo real de divergir del render de siempre — regla de
proceso 2), `core/reconciliar.js` ganó un segundo export, `reemplazarEnElLugar(nodo, nodoFresco)`:
arma el nodo con la MISMA función `crear` de siempre y lo injerta (clase, dataset, hijos) sobre el
nodo cacheado. El nodo fresco es descartable; el cacheado es el que persiste. Las cinco listas
comparten este único patrón.

**El esqueleto tiene que sobrevivir para que haya algo que reconciliar.** `tabla.js`/`plantilla.js`/
`topMundial.js` hacían `container.replaceChildren()` en cada render — el título y el `div.xxx-lista`
se destruían junto con las filas. Ahora el esqueleto (título + lista, cacheados en el propio nodo
vía `container.__xRefs`) se arma una sola vez; de ahí en más solo se actualiza texto y se llama
`reconciliar` sobre la lista. `feed.js` y `mercadoGrid` no necesitaron esto: ya eran contenedores
persistentes pasados desde afuera.

**El caso conocido que no se fuerza.** En `feed.js`, la clave de un beat es el índice del último log
que incorpora (narrativa o su técnico más reciente). Cuando una narrativa suelta gana su primer
técnico, esa clave cambia (de "índice de la narrativa" a "índice del técnico") y el nodo se recrea
en vez de mutarse — visualmente idéntico, pero sin identidad en esa transición puntual. Es la única
excepción; se documentó en el código en vez de forzar una clave más compleja para un caso que hoy no
tiene ninguna animación colgando (V3 es la que le va a dar uso real a esta identidad).

**Verificación.** `validate.js` **189/189 OK, 0 FAIL**. `simulate.js 1500 60 todas`: **0 crashes**
(motor no tocado). `build.js`: **1657 KB** (margen 43 KB, D49 sigue abierta para V9). Huella
anti-T1 idéntica en 40 seeds + misma seed corrida dos veces (`state` bit a bit idéntico) — el motor
no se tocó, esto era esperable. Verificación real en navegador (Playwright + Chromium cacheado,
sin `chromium-cli`): (1) llamadas aisladas a las 5 funciones de render con datos sintéticos/reales
confirmando `nodo === nodo` tras un segundo render con datos distintos, en las 5 listas; (2) una
carrera real jugada un split, marcando nodos con una propiedad JS arbitraria (no un atributo DOM) y
confirmando que sobrevive tras resolver una decisión — 5/5 en Top Mundial, feed acorde al caso
conocido de arriba; tabla/plantilla no aplicables en split 1 (amateur, sin equipo todavía). Cero
errores de consola en ambas corridas.

## V1 — La capa de gráficos *(`src/ui/graficos/`, inline SVG, cero deps)*

**Qué entra.** Seis primitivos, cada uno una función que devuelve un `<svg>` ya accesible. Todos
toman su color por `var(--token)` desde CSS, nunca por literal en JS.

| Primitivo | Para qué, con el dato que ya existe |
|---|---|
| `linea.js` | Serie temporal: sparkline / escalón / área. `registro.temporadas[].nota` (una fila por año, ~19 en una carrera mediana), `mundo.archirrival.historial[]` (misma forma, en paralelo) |
| `hexa.js` | Radar de 6 ejes para los atributos, con el frame anterior **fantasma** detrás |
| `cinta.js` | Cinta temporal (Gantt) para `registro.porOrg` — una banda por org, color de org, alto por tier |
| `barras.js` | Columnas comparables: fechas G/P por año, dinero por año |
| `escalera.js` | La escalera ranked y el Top 20: posición como peldaño, con FLIP al moverse |
| `bala.js` | Bullet chart: valor vs. objetivo vs. banda — es la forma correcta de "29/100 con referente" |

**El candado nuevo (importante, D44).** `verificarSinColorLiteral` hoy solo mira `estilos/*.css`
([guards.js:99-114](src/dev/guards.js#L99-L114)). Con gráficos construidos en JS, un
`fill="#2ee8ff"` entra sin que nada chille. Esta subfase agrega `verificarSinColorLiteralEnJs(uiDir)`
— mismo patrón de color literal sobre `src/ui/**/*.js` — pero con **dos excepciones reales que ya
existen en el repo y que el guard tiene que conocer o rompe en su propio primer commit**:

1. **`components/orgChip.js:14-16`** usa `hsl(${hue} ...)` a propósito — el comentario del archivo
   lo dice: *"Los hsl van INLINE — `validate.js` caza `hsl(` en cualquier CSS fuera de
   tokens.css"*. Es hue **calculado en runtime** (`hashCadena` del nombre de la org), no un color
   fijo: no hay forma de tokenizarlo sin perder el propósito (un color por org). El guard nuevo
   permite `hsl(` con una expresión de template (backtick + `${`) e igual prohíbe un `hsl(` con
   los tres números literales.
2. **`exportar.js:22-24`** (`leerToken`) lee colores por `getComputedStyle(...).getPropertyValue`
   — cero literal, ya es el patrón correcto; el guard no debe tocarlo.

**Se verifica en rojo** metiendo un hex fijo (no una expresión) a propósito, y confirmando que los
dos casos de arriba siguen pasando.

**Al implementar: cargar la skill `dataviz` antes de escribir la primera línea de gráfico** —
forma, paleta categórica accesible, especificación de marcas y reglas de interacción. La paleta
ya existe (`--cat-*`, `--rank-*`, `--nivel-*`); lo que aporta es el método para no romperla.

**Checks.**
- Todo factory de `graficos/` devuelve un nodo con `role="img"` y `aria-label` **no vacío** que
  contiene al menos un dígito (recorrido por archivo, no por lista blanca).
- Cero color literal en `src/ui/**/*.js` (guard nuevo, en rojo primero).
- **Contraste de marca gráfica, medido sobre `tokens.css` (mismo método que el check de contraste
  WCAG existente, extendido a las 29 familias que el check actual no toca — `--cat-*`, `--rank-*`,
  `--nivel-*`, `--up`/`--down`/`--warn`/`--danger`/`--ice` contra `--bg-surface`/`--bg-sunken`/
  `--bg-raised`, 87 pares):** las 29 familias pasan el piso gráfico de **3:1** (WCAG 1.4.11, el que
  aplica a una marca no textual, no el 4.5:1 de texto) — **cero pares por debajo de 3:1**. 5 de los
  87 pares caen entre 3:1 y 4.5:1, los cinco de una sola familia (`--cat-salud` contra `--bg-raised`
  3,07:1 / `--bg-surface` 3,33:1 / `--bg-sunken` 3,47:1; `--cat-rutina` contra `--bg-raised` 4,16:1;
  `--cat-partido` contra `--bg-raised` 4,44:1). Hoy `--cat-salud` solo se usa como `border-color`
  ([pantallas.css:1086](src/ui/estilos/pantallas.css#L1086)), nunca como texto — el check nuevo se
  escribe con **dos pisos, no uno**: 3:1 para toda marca gráfica (relleno de barra, trazo de línea,
  celda), 4.5:1 solo si esa familia se usa para pintar un label o un número encima. Verificado en
  rojo bajando el piso a mano antes de fijarlo.
- Con `prefers-reduced-motion`, ningún primitivo programa `requestAnimationFrame`.

## V2 — LA TRAYECTORIA *(la pantalla insignia)*

**La pregunta que responde.** *"¿Cómo fue mi carrera?"* — y por primera vez se puede contestar
mirando, en cualquier momento de la partida, no solo al final.

Una pantalla a todo el ancho, construida **enteramente sobre datos que ya existen** — los cinco
arrays de la tabla de §V.1 que nunca se recortan:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ LA TRAYECTORIA                                          THONOR26 · JUNGLA │
├──────────────────────────────────────────────────────────────────────────┤
│ 2026   2027    2028      2029       2030   2031      2032    2033   2034 │
│ ├───────┼───────┼──────────┼──────────┼───────┼──────────┼───────┼──────┤ │
│ │ SOLOQ │ REVEN │   REVENANT (tier 2)  │ DRAKKEN (tier 1)      │ DRAKK. ││ vos
│ └───────┴───────┴──────────┴──────────┴───────┴──────────┴───────┴──────┘ │
│                              ▲lesión            ★título        ★título   │
│   4.2    5.8      6.1        3.9        7.4      8.1★titular    8.4      │ nota/año
│ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│ ╌╌╌╌╌╌╌╌╲___╱‾╲___╱‾‾‾╲___________________╱‾‾╲______╱‾‾‾‾‾‾╲____________  │ archirrival
├──────────────────────────────────────────────────────────────────────────┤
│ PICO: nivel 88 a los 24 años · #4 del mundo · US$1,2M/año                │
└──────────────────────────────────────────────────────────────────────────┘
```

- **La cinta de clubes** (`registro.porOrg`): una banda por org sobre un eje de años, con el color
  y el monograma de la org (`hueDeOrg`/`inicialesDeOrg` de
  [formatoUi.js:114-134](src/ui/formatoUi.js#L114-L134) — ya existen, se reusan), alto o carril
  según `tier`, y una muesca de salida con su `motivoDeSalida` (los 6 valores reales:
  `disolucion`/`ascenso`/`descenso`/`transferencia`/`banquillo`/`libre`).
- **La nota del año** (`registro.temporadas[].nota`, 0-10, ~19 filas en una carrera mediana):
  columnas bajo la cinta, con la banda de nombre de `bandaDeNota`
  ([temporadaResumen.js:148](src/core/temporadaResumen.js#L148)).
- **Los hitos**: `titulos` (`{nombre, anio, org}`) como marcas oro, `internacionales` con su
  `resultado`, `momentos` (`{tipo, anio, edad, org, texto}`, confirmado en
  [salud.js:63-69](src/systems/salud.js#L63-L69)) como muescas citables — la lesión y el servicio
  militar quedan ahí adentro por `tipo`, sin necesitar un carril propio.
- **Los picos** (`registro.picos`): líneas de referencia — el nivel máximo y a qué edad
  (`edadDelPicoDeNivel`), el mejor rank mundial, el salario más alto, y `registro.dineroTotalUSD`
  como el acumulado de por vida.
- **El archirrival** (`mundo.archirrival.historial[]`, confirmado: una fila `{anio, org, nivel,
  titulos}` por año, el mismo largo que `registro.temporadas`): su línea en paralelo a la tuya, en
  el mismo eje de años. El duelo de generación que hoy es un contador en la ficha
  (`dueloDeGeneracion`, [ficha.js:181](src/core/ficha.js#L181)), como trayectoria comparada de
  verdad — dos carreras, un eje, la misma escala.

**Reuso, no reinvención.** [core/legado.js:141-168](src/core/legado.js#L141-L168)
(`componerLegado`) ya lee exactamente estos cinco campos para componer el veredicto de la tarjeta
final. LA TRAYECTORIA no es una pantalla nueva con datos nuevos: es el **mismo insumo que ya arma
el veredicto**, dibujado en vez de resumido en una frase — así que si el gráfico y la tarjeta
alguna vez dijeran cosas distintas, sería la misma clase de bug que la regla 15 ya nombra.

**Checks.**
- Sobre 1500 carreras de `simulate.js`: toda carrera con ≥1 fichaje produce ≥1 banda, **cero**
  geometría `NaN`/negativa, y cero solapamiento de bandas en el mismo carril.
- **Regla 15 aplicada al gráfico**: la suma de `splits` de las bandas dibujadas ==
  `registro.splitsConEquipo`, y los títulos dibujados == `registro.titulos.length`. Si la pantalla
  miente, es bug de confianza.
- Carrera corta (`no_llego` a los 19) y carrera larga (30+) dibujan las dos sin desbordar ni
  colapsar: se verifica el rango de años usado contra el ancho disponible.

## V3 — La ficha viva *(el HUD deja de repintarse y empieza a moverse)*

Con V0 y V1 listos, [ficha.js](src/ui/components/ficha.js) (406 líneas, el componente más visto
del juego) pasa de repintado a telemetría:

- Los 6 atributos como `hexa` con el frame anterior fantasma: **se ve** qué cambió este split.
- Todo valor que cambió entra por `delta.js` y se mueve: `countUp` en el número, la barra crece
  desde el valor viejo, con escalonado (stagger) para que se lean de a uno y no como un parpadeo.
- El ranked como `escalera` con tu peldaño deslizándose.
- Todo `n/100` pasa a `bala` con su banda con nombre — regla 13, cumplida por forma y no por texto.

**Checks.** Ningún `n/100` sin banda/objetivo en el DOM de la ficha (recorrido del árbol
renderizado); con motion reducido la ficha llega al valor final en un frame; la ficha no repinta
nodos con clave estable entre dos ticks con el mismo `state`.

## V4 — La previa y la serie, como transmisión de verdad

- **Tale of the tape** antes de la serie: vos vs. la org rival, cara a cara, con `serie.rival.fuerza`,
  la tabla, el head-to-head y la revancha (`career.ultimoEliminadoPor`). Es el gráfico más
  reconocible del género y hoy no existe.
- **El Fearless como tablero**: `serie.quemados` + `serie.mapas` como grilla visual de campeones
  quemados mapa a mapa, en vez de una lista.
- **El marcador** como marcador de transmisión, con el camino de la serie ya persistido en
  `registro.internacionales[].camino`.

## V5 — El mundo *(los rieles apretados se vuelven pantallas)*

Los 6 paneles del riel derecho (`paneles/*.js`, 43-92 líneas cada uno) son buenos pero viven en
320px. Esta subfase les da una pantalla completa a los que la merecen: la tabla de posiciones con
reordenamiento FLIP real, el Top 20 como escalera, los rivales de generación, y el mercado como
tablero de asientos. Los paneles del riel quedan como su **resumen**, linkeando a la pantalla.

## V6 — La escenografía *(el director de escena)*

Hoy las pantallas se prenden y apagan con `hidden`. Entra `src/ui/escenografia.js`: transición
entre ventanas (pretemporada → regular → playoffs → internacional → offseason) con stinger corto,
lower-third que entra y sale en vez de aparecer, y **title card** a pantalla en los momentos
bisagra (`evento.bisagra` ya existe y ya dispara `sonido.swellBisagra()`,
[reproductor.js:128](src/ui/reproductor.js#L128) — la parte visual es la que falta). Todo con su
camino quieto bajo motion reducido.

## V7 — Navegación *(la app tiene cuartos)*

Con V2/V5 hay pantallas de verdad y hace falta cómo moverse: modelo de navegación teclado-primero
(el juego ya usa 1-4/Espacio/Esc, [shell.js:194-231](src/ui/shell.js#L194-L231)), sin romper
ninguno de esos atajos, y sin que navegar pueda perder una decisión pendiente. Cierra acá D46: los
atajos 1-4 no responden en la pantalla de mercado porque `opcionVisible()` espera un botón y recibe
un `div.mercado-card` — se arregla junto con el resto del modelo de teclado, no antes, para no
tocar `shell.js` dos veces.

## V8 — El metro y el teléfono *(cierra el hilo WIP + responsive real)*

- **El metro**: cierra el hilo de los 4 commits `wip: pasada de HUD y chrome` (D48) con una regla
  escrita y medible en vez de "subir el volumen" a ojo. Incluye limpiar la duplicación de
  `.ticks` en [material.css](src/ui/estilos/material.css) (D47, declarada y nunca usada).
- **El teléfono**: hasta 360px. Los dos rieles pasan a hojas invocables; el escenario manda.

## V9 — El candado *(los checks estáticos nuevos + el presupuesto)*

Cierra la fase convirtiendo en error de build lo que esta fase aprendió, mismo criterio que T0b:
nombre accesible en todo SVG, contraste de toda la paleta realmente usada, cobertura de motion
reducido, el guard de color literal en JS, y **el techo de `dist/` re-medido y subido con número**
en su propio commit (D49). De paso, evaluar D50 (`pantallas.css`, 1815 líneas): dividir solo si el
criterio de corte es claro.

## V10 — Calibrar *(solo constantes)*

Duraciones, curvas, escalonados y densidades, después de jugarlo. Regla de proceso 2: nunca en el
mismo commit que la estructura.

## V.4 — Verificación

Cada subfase cierra con la Definición de terminado de `CLAUDE.md`:

```bash
node src/dev/validate.js                 # los checks viejos + los nuevos de la subfase
node src/dev/simulate.js 1500 60 todas   # 0 crashes
node src/dev/build.js                    # guards + techo de dist/
node server.js                            # jugar a mano, cero errores de consola
```

Y, por ser una fase de UI, dos verificaciones que el resto del proyecto no necesitaba:

- **Huella de determinismo** antes/después de V0 y de cada subfase que toque el orquestador:
  `git archive HEAD | tar -x -C <dir>` + comparar `finAnticipado:splitCount:soloqElo` en 40 seeds.
  Una fase de UI que mueva el motor es un bug, no un efecto secundario.
- **End-to-end de la fase V**: jugar una carrera completa y, **sin abrir el log**, contar la
  historia leyendo solo LA TRAYECTORIA. Si las cinco frases de la prueba final de este documento
  salen de mirar esa pantalla, la fase está.

---

# FASE J — QUE LA PARTIDA SE JUEGUE

> **Reorganizada en FASE K (2026-10-01).** J0 queda hecha. Lo que seguía se repartió en K0-K5 o
> se reemplazó (tabla en §K.6). J5/J6 en particular se reemplazan: sus metas (150-280 decisiones por
> carrera, más drafts) contradicen la decisión D-B del usuario. Esta sección queda como registro del
> diagnóstico (§J.0 sigue siendo correcto) y de lo que K reusa.

> Se inserta antes de V2 (2026-09-20). Motivo: el usuario jugó una carrera completa de punta a
> punta y el veredicto fue *"esto es un simulador de clics de mierda"*. No es una queja de gusto —
> las nueve cosas que señaló tienen, cada una, una causa medible en el código. Investigación
> completa contra HEAD (`400f6b6`), no impresiones.

## J.0 — El diagnóstico, medido

Nueve quejas citadas (corregido 2026-09-25, auditoría: este documento decía "diez" en dos lugares
— acá y en la verificación de cierre de la fase — y la tabla siempre tuvo nueve filas con queja no
vacía; las filas sin queja son evidencia adicional de la de arriba, no quejas nuevas).

| Queja | Causa medida |
|---|---|
| "es todo RNG, mi skill no importa" | r(nivel, posición final) = **0,18**. Los compañeros son el 50% de la fuerza (`pesoJugadorEnEquipo: 0.5`, `core/fuerza.js:45`) y su `nivel` es una **foto congelada al fichar** (`systems/roster.js:29-36`) que nunca se refresca mientras seguís en la org |
| "las opciones no afectan nada" | **47,2%** de los efectos del catálogo (758/1606) van a `mentalidad`/`hype`, que **no se leen** en `core/fuerza.js` ni en `systems/rendimiento.js`. Un efecto típico mueve 0,58 puntos de nivel contra `ruidoRendimiento: 7` → **0,083σ**, invisible por construcción |
| | **130 de 280** efectos sobre stats de rol caen en stats de curva (mecánica/laneo/teamfight) que `systems/atributos.js:20-46` regresa al objetivo biológico: vida media **1,9 splits** |
| | Solo **23 de 1034** outcomes (2,2%) declaran `modificadores`. La promesa de `CONCEPTO §8` ("tus stats corren esos pesos") se cumple en el 2,2% del catálogo |
| "siempre salen los mismos" | `systems/events.js:228-231` (`conPrioridadDeBisagra`) es un filtro **exclusivo**: el **16,4%** de los splits tiene ≥1 bisagra elegible y en el **96,4%** de esos casos queda UNA sola opción — se descartan **42 eventos elegibles** de media. Solo 4 de 250 eventos son bisagra y los 4 son `categoria: "parche"`. Esa categoría se lleva **14,2%** de la pantalla con **5,6%** del catálogo |
| | La marca `main_muerto` está activa el **52,2% de los splits por construcción**: `core/ajusteMeta.js:116-122` la prende si tu main está en tier B o C, y `corteB: 0.75` (`balance.js:408`) hace que B+C sea el 55% inferior del rol, **siempre** |
| | **Ninguna** de las 2 opciones de `pool_main_muerto` (`data/events/pool.json:246-315`) apaga la marca: `buscar_reemplazo` mete el reemplazo con maestría 30, por debajo del main muerto; `apostar_que_vuelve` **sube** la maestría del main muerto. El evento (top 1 del juego, 2,8/carrera) se re-dispara indefinidamente cada 6 splits |
| "dos veces seguidas lo del meta" | `evento.categoria` (11 valores) existe desde 12b y **la selección nunca la lee**. Medido: **31,9%** de los pares de eventos consecutivos comparten categoría |
| "hacés un clic y perdiste" | `puntosEnJuegoParaPreguntar: 0.26` (`balance.js:1377`) → **32,5% de las series sin un solo draft**, mediana 1 por Bo5. `systems/serie.js:205` excluye a `cuartos` de las rondas con minijuego: los seeds 3-6 arrancan su bracket 100% automático. El bracket completo (hasta 20 mapas) puede resolverse dentro de un único `avanzarSplit`, cero clics |
| "Worlds es una basofia" | El internacional es **UNA Bo5 contra UNA org sorteada** (`systems/serie.js:424-437` + `core/serie.js:65-71`) de otra liga tier 1 — ni siquiera es la campeona de su liga. Sin Swiss, sin grupos, sin bracket. Worlds/MSI/First Stand no se distinguen (D18). `systems/escena.js:45` sortea el campeón del mundo con un `weightedPick` **independiente que nunca mira tu serie**: se puede ganar tu Bo5 y el log decir que ganó otra org |
| "Maestría 5, antes tenía más" | `systems/campeones.js:44-66`: todo campeón no jugado pierde `gauss(1.5, 1)` por split contra piso `maestriaMinima: 5`. Con un pool de 6 y 1 jugado por split, los otros 5 se pudren hasta el piso |
| "no podés elegir región ni dificultad" | `core/mundo.js:310`: `weightedPick(ligasTier1, prestigio)`, sin input del jugador. El concepto de dificultad no existe en el motor |
| "¿qué me importa el parche?" | `state.meta.patch` es un contador `+1` por split (`systems/meta.js:93`) que **nadie lee** salvo para imprimirlo |

### J.0b — remedido con el instrumento (AUD-2, 2026-09-25)

T6: la tabla de arriba se cita tal cual quedó escrita — es historia, y es lo que disparó la fase.
Estos números son la primera corrida real del instrumento que J0 instaló (`simulate.js` bloque
`jugabilidad`, 200 carreras × 3 estrategias, 60 splits; `cobertura.js --categorias`), no una
repetición de los de arriba citada de memoria. Donde coinciden, es señal de que el instrumento mide
lo mismo que midió el diagnóstico original. Donde no, gana este número — es J3-J6 quienes van a
leerlo para saber si su fix movió algo.

| Causa de §J.0 | Cita original | Remedido ahora (equilibrado / ranked / prudente) |
|---|---|---|
| r(nivel, jerarquía) | 0,18 | **0,02 / 0,40 / -0,07** (equilibrado / ranked / prudente) — no es un número solo: depende muchísimo de cómo se juega, y ninguna de las tres estrategias por separado reproduce la cita original. La dispersión en sí es el hallazgo nuevo, no cuál de las tres "es" el 0,18 |
| % efectos → mentalidad/hype | 47,2% | **47,2%** — exacto |
| outcomes con `modificadores` | 2,2% | **2,2%** — exacto |
| vida media efecto de curva (mecánica) | 1,9 splits | **1,94** — coincide. Analítico, no simulado: sale directo de `velocidad: 0.3` de `mecanica` en `BALANCE.atributos.curvas`, así que no hace falta volver a medirlo con ruido — laneo 2,79, teamfight 3,11 |
| retención a 4 splits | "hoy ~10%" (cita de J2, no de J.0) | **24% mecánica / 37% laneo / 41% teamfight** — bien arriba del ~10% citado. Mismo cálculo analítico; la cita original puede haber sido una medición empírica que además capturaba el objetivo biológico moviéndose en esos 4 splits, no solo la convergencia — a revisar cuando J2 lo toque, no antes |
| % splits con `main_muerto` | 52,2% | **54,4% / 52,5% / 52,8%** — coincide |
| `pool_main_muerto` por carrera | 2,8 | **3,32 / 1,71 / 2,76** — el rango lo contiene |
| p95 descartados por bisagra | "hoy 42" (J4 lo llama p95; J.0 lo llama media — los dos textos del plan no coinciden entre sí) | **60** en las tres estrategias. El número de J4 puede haber sido la media, no el p95 — anotado, no resuelto: J4 va a medir de nuevo al escribir el fix |
| % pares consecutivos misma categoría | 31,9% | **29,1% / 27,0% / 34,6%** — el rango lo contiene |
| % pantalla `categoria: parche` | 14,2% | **28,7% / 30,1% / 27,7%** — cerca del doble. Definición distinta, no error: acá es "% de las decisiones del sistema `eventos` reveladas que son parche"; el 14,2% original probablemente incluía todo el feed (series, mercado, resúmenes), no solo eventos — J4/J5 deberían fijar UNA definición antes de calibrar contra este número |
| % series sin draft | 32,5% | **31,0% / 28,8% / 31,2%** — coincide |
| mediana drafts/Bo5 | 1 | **1** en las tres — exacto |

**Terminado cuando** (criterio propio de J0, `PLAN.md:5068`): los KPIs devuelven finitos sobre
200×3, 0 crashes — cumplido, son los tres checks nuevos de `validate.js` ("J0: ..."). El resto de
esta tabla es lectura para J3-J6, no un gate de J0.

## J.1 — Por qué se insertó acá (y por qué FASE V se congela)

`FASE V` se prohíbe explícitamente tocar el motor (*"esta fase no debe mover un byte del motor"*,
§V.1) — y el 70% de lo medido arriba **es motor**. Terminar V1→V10 tal cual producía un simulador
de clics más lindo, no un juego. Se congela en **V0b + V1** (el kernel de render y la capa de
gráficos SVG, que J reusa para la previa de serie y el bracket de Worlds) y se retoma en **V2** una
vez que la partida de abajo valga la pena mirar.

## J.2 — Decisiones del usuario (textuales — respetarlas, no volver a preguntar)

| Tema | Decisión |
|---|---|
| **Orden** | FASE V se congela en V0b/V1. FASE J (motor) va primero. V2→V10 después |
| **Arte de campeones** | **Data Dragon de Riot** (CDN). Íconos en draft/pool + splash difuminado con transición en el inicio. Se acepta perder el offline puro, con fallback al tile geométrico actual |
| **Internacional** | **Torneo real**: Worlds/MSI/First Stand con nombre, clasificados reales de cada liga, Swiss + knockout, rivales nombrados. El campeón del mundo sale de ESE torneo. Revisa **D19 solo para el internacional** — los playoffs domésticos siguen siendo solo tu camino |
| **Dificultad** | **La región ES la dificultad.** Sin selector aparte |
| **LATAM** (textual) | *"elegís la región pero te sirve hasta tier2, tier1 tenés que tener ofertas de otras"* → tu región de origen te da su escena hasta tier 2; para tier 1 necesitás que te fichen desde otra liga. LATAM (sin tier 1 en 2026) es, por construcción, el modo difícil. **Reabre D17 como estructural** (venía cerrada "como narrativo" en 13d) |
| **El parche** | Deja de ser un contador y pasa a ser un **diff**: qué campeón subió, cuál cayó, qué le hizo a tu pool |
| **Primer tramo** | Lo barato y visible primero: sentir la diferencia jugando antes de tocar la fórmula de fuerza |
| **Workflow** | Delegación real: grok/agy implementan cada subfase en su propio worktree; un subagente Claude fresco revisa contra `CLAUDE.md` y el spec; Sonnet aplica el fix si hace falta; el supervisor mergea y actualiza `PROGRESO.md` |

## J.3 — El principio de esta fase

1. **Una decisión que no cambia el resultado no es una decisión.** Si lo que el motor pregunta no
   mueve la probabilidad del partido más que `ruidoRendimiento`, la resuelve él y lo cuenta en una
   línea.
2. **Ningún evento entra sin tirada.** El filtro exclusivo está prohibido. La prioridad se expresa
   como peso, nunca como descarte.
3. **El motor no te miente sobre el mundo.** Si ganás tu serie, el campeón del mundo sos vos
   (regla de proceso 15 aplicada al mundo, no solo a la tarjeta de oferta).

## J.4 — Los tres bloques de corrimiento (trampa T1)

Toda subfase de motor corre el stream de RNG. Lo acotable es cuántas veces se paga re-medir la
tabla de KPIs y re-basear los ~190 checks — mismo patrón que 9Ma→9Mj.

| Bloque | Subfases | Cierra con |
|---|---|---|
| **A — agencia** | J1, J2 | **J2c** (recalibración completa) |
| **B — densidad** | J4, J5, J6 | J5 y J6 **son** la calibración |
| **C — el mundo** | J7, J8 | **J8c** |
| **sin corrimiento** | J0, J9, J10 | J3 se midió aparte (D74): 35/40 seeds mueven la huella. No es bloque A/B/C y no se falsea el RNG |

Dentro de un bloque, un check fuera de banda se anota con su número medido y se re-basea en el
commit de calibración, no en el acto (regla 2 + T6). Un check que *crashea* se arregla en el acto.

**D52** (tabla de deuda, abajo): declarada una sola vez — *ninguna seed anterior a FASE J
reproduce su carrera* — y no se vuelve a discutir por commit, misma familia que D21/D22/D35.

## Primer tramo — lo barato y visible

Siete commits (corregido 2026-09-25, auditoría: decía "seis" y siempre listó siete — J0, J3, J4,
J5, J6, J-previa, J9). Cero sistemas nuevos, cero recalibración de bloque A. Que se sienta la
diferencia jugando antes de tocar la fórmula de fuerza.

### J0 — El instrumento *(cero motor)*

Lección de D26: tres herramientas mirando para otro lado dejaron pasar una carrera varada el 30,7%
de las veces. No se abre una fase de jugabilidad sin poder medir jugabilidad. Toca `src/dev/simulate.js`
(bloque `jugabilidad` nuevo) y `src/dev/cobertura.js` (partición por `categoria`, no solo por celda
`momento × ventana` — hoy cuenta por **unión** de 12 muestras y por eso dijo "sin huecos" mientras
1 de cada 6 splits forzaba el mismo evento de parche).

Mide la línea de base completa de J.0 (T6: medida ahora, no citada de `PROGRESO.md`). Check: los
KPIs devuelven finitos sobre 200 carreras × 3 estrategias, 0 crashes. *Excepción declarada a la
regla 12: la "pantalla" de J0 es la tabla de `PROGRESO.md`.*

### J3 — El pool deja de pudrirse *(2 constantes y una condición)*

`systems/campeones.js:44-66` (`moverMaestrias`). El óxido gana gracia (`splitsSinJugarParaOxido`
splits antes de empezar a decaer, con `campeon.ultimoSplitJugado` nuevo, T4: inicializado en
`entradaDePool`, nunca `null`); `maestriaMinima: 5 → 18` ("lo sabés jugar aunque no lo toques"); el
óxido escala inverso al tamaño del pool, para que `pool_ancho` signifique algo. Pantalla: el panel
de pool muestra el pronóstico de óxido. Checks: pool de 6 con juego normal no cae bajo 18 en 10
splits (hoy cae a 5); maestría mínima del pool al retiro ≥ 18.

### J4 — La selección deja de forzar · la de mayor valor por unidad de trabajo

Tres cambios, ~60 líneas de motor:

**(a)** La bisagra deja de ser filtro: `conPrioridadDeBisagra` (`events.js:228-231`) pasa a ser un
multiplicador dentro de `pesoConMemoria` (`evento.bisagra ? factorBisagra : 1`) — los 42 eventos
descartados vuelven al sorteo, la bisagra sigue ganando casi siempre, pero **con tirada**.
**(b)** `categoria` entra en la selección: `flags.categoriasRecientes` (ventana de 2), mismo patrón
que `flags.minijuegosRecientes` en `core/minijuegos.js`. **(c)** `main_muerto` pasa de ESTADO a
TRANSICIÓN: se prende cuando un campeón **cae** de S/A a B/C respecto del parche anterior (no
mientras *está* en B/C), y dura `ventanaMainMuerto` splits — mismo patrón que `descenso`/
`ventanaDescenso` (`core/contexto.js:212`). Necesita `flags.tierListPrevia` (T4: `[]` inicial), que
de paso alimenta el parche-como-diff de J.2. **(d)** Al menos una opción de `pool_main_muerto` deja
el pool sin campeón caído al split siguiente.

Constantes: `eventos.factorBisagra`, `eventos.factorCategoriaReciente`,
`eventos.categoriasRecientesMax`, `contexto.ventanaMainMuerto`. Checks (los cinco en rojo hoy): p95
de descartados por bisagra ≤ 3 (hoy 42); < 15% de pares consecutivos comparten categoría (hoy
31,9%); `main_muerto` activa en < 25% de los splits (hoy 52,2%); `pool_main_muerto` ≤ 1,2/carrera
(hoy 2,8); existe ≥1 opción que apaga la marca (hoy ninguna).

> Efecto lateral esperado y bueno: `core/temporadaResumen.js:173` puntúa `main_muerto: 70` para el
> titular del año — redefinirla mueve los titulares (hoy los domina). Re-medir en J5.

### J5 — El presupuesto se reparte · libera lo que J6 y J7 gastan

Que se te muera el main deja de marcar el split `'denso'` (`core/presupuesto.js:27,54`) — con
`probSegundaDecisionPorTipo.denso: 0.85` eso era un bucle de realimentación con el 52% de J4.
`denso: 0.85 → 0.35`, `normal: 0.4 → 0.30`. `interrupcionesPorSplit` gana buckets por ventana
(`{ rutina: 1, eventful: 2, playoffs: 5, internacional: 14 }`).

El presupuesto es de suma cero (por carrera, sobre la base de J0): se recorta ≈50 de eventos de
ambiente, segunda decisión y `parche`; se gasta ≈48 en draft doméstico, minijuego en cuartos,
fechas de playoffs y Worlds. Neto ~0, **redistribuido**: sale de los splits de rutina, donde era
ruido, entra en los de competición, donde es el juego.

Checks: decisiones por carrera en banda [150, 280]; `categoria: parche` < 8% de las tarjetas (hoy
14,2%); ningún split de rutina gasta más de 1 interrupción.

### J6 — Te dejan jugar *(casi todo constantes)*

`puntosEnJuegoParaPreguntar: 0.26 → 0.10`, `Decisivo: 0.13 → 0.05` — el 0,26 se puso para cumplir
un presupuesto que J5 acaba de rehacer. `rondasConMinijuego` sale del código a `balance.js`, con
**`cuartos` adentro** (`systems/serie.js:205`). `fechasMarcadasPorSplit` pasa a
`{ regular: 1, playoffs: 2 }`. La tarjeta de draft (`systems/serie.js:43-61`) **muestra la
probabilidad** que el motor ya calculó (regla 13: *"62% con Sejuani · 54% con Maokai"*, nunca
`29/100` sin referente). `generarRival` doméstico (`core/serie.js:85-87`) excluye orgs ya
enfrentadas en el bracket y pesa por la tabla real, no solo `org.fuerza`.

Checks (rojos hoy): series sin draft < 10% (32,5%); mediana drafts/Bo5 ≥ 2 (1); estático
`rondasConMinijuego ⊇ ORDEN_RONDAS`; ningún bracket repite rival; la tarjeta declara la misma
probabilidad que el motor usó (regla 15).

### J-previa — LA PREVIA *(la mitad de UI de J1, adelantada)*

`core/previa.js` gana `previaDeSerie(state)` (pura, sin `rng` — hoy el archivo es solo para
opciones de eventos); `src/ui/screens/previa.js` + `src/ui/paneles/previa.js` nuevos, consumiendo
los primitivos de V1. Antes del primer mapa de cada ronda: tale of the tape — tu fuerza desglosada,
la del rival, el head-to-head, la revancha (`career.ultimoEliminadoPor`) y **la probabilidad de
ganar la serie** que el motor ya calcula y hoy tira a la basura. Check: la previa declara la misma
probabilidad que usa `finalizarMapa` (regla 15, exacto).

### J9 — Los campeones tienen cara *(cero motor, cero corrimiento)*

`ui/components/campeonTile.js:6-8` (el comentario "sin splash, Riot IP" se reemplaza por Data
Dragon); `data/champions.json` gana un campo `ddragon` **explícito por campeón** (la key no es el
`name`: `Wukong→MonkeyKing`, `Nunu & Willump→Nunu`, `Renata Glasc→Renata`…), no un heurístico de
string. Íconos 48×48 en draft/pool; splash difuminado con transición en `ui/screens/inicio.js`.
**Fallback obligatorio**: `img.onerror` → el tile geométrico actual — el juego sigue jugable con la
red caída, y `dist/` no sube un byte (las imágenes son CDN). La versión del CDN va en dato
(`data/ddragon.js`), nunca hardcodeada. De paso: `ui/app.js:508` no le pasa `handleInput` ni
`seedInput` a `inicio.js` — el handle **sí** se puede elegir (`index.html:86`) y el jugador no lo
vio; se sube al primer paso con jerarquía visual real.

Checks: estático — toda entrada de `champions.json` declara `ddragon`; `crearCampeonTile` con
`onerror` devuelve el tile geométrico; `build.js` ≤ 1800 KB (techo re-medido en AUD-1, 2026-09-25);
`verificarSinColorLiteralEnJs` verde.

## Segundo tramo — lo caro

Se planifica ahora, se ejecuta después de volver a jugar el primer tramo.

### J1 — La fuerza te incluye · bloque A · el commit más peligroso

`core/fuerza.js:20-34` (`rendimientoBase`) suma `factorMentalidad`, misma forma que
`factorSinergia`/`factorJerarquia`. `core/fuerza.js:40-47` (`fuerzaDelEquipo`) suma `factorHype` y
**lee el nivel de los compañeros en vivo** de `state.mundo.planteles[org.nombre]`, con fallback al
snapshot para tier 3 / tier 2 no modelada — cero `rng`, cero estado nuevo (`systems/roster.js:29-36`
ya sabe leer de ahí). `pesoJugadorEnEquipo: 0.5` no se toca acá (regla 2 — es J2c).

Checks: mentalidad 20 vs 80 ⇒ `fuerzaDelEquipo` difiere ≥ 8% (hoy 0%); r(nivel, posición) ≥ 0,45
sobre 600 carreras (hoy 0,18); en ≥8 splits en la misma org el nivel medio de compañeros cambia al
menos una vez (hoy constante por construcción).

> Esperar 20-40 de los ~190 checks fuera de banda: `fuerzaDelEquipo` alimenta posición → playoffs →
> títulos → mercado → retiro → `topMundial`. No parchear en el acto (T5): anotar y re-basear en J2c.

### J2 — El efecto sobrevive al split · bloque A

Problema estructural, no de magnitud: subir los `[min,max]` no sirve porque la curva se los come
igual. `systems/atributos.js:20-46` converge hacia `objetivo + player.bonusPermanente[stat]` en vez
de hacia `objetivo` — un punto único. `player.bonusPermanente` a `createInitialState` completo con
ceros (T4). Pasada de contenido sobre `events/rol/*.json` y los efectos de `mentalidad`/`hype`
(ahora que J1 los lee, valen), y `modificadores` sobre outcomes de eventos bisagra y de mejora.

Checks: un efecto sobre stat de curva conserva ≥40% de su delta a 4 splits (hoy ~10%); estático —
ningún efecto `type:'stat'` sobre curva evita `bonusPermanente`; ≥25% de outcomes de eventos
bisagra declaran `modificadores` (hoy 2,2% global).

### J2c — Calibrar agencia · solo constantes

Re-medición completa (T6) de J0 + los ~190 checks. Acá entra `pesoJugadorEnEquipo` si J1 lo dejó
torcido. `simulate.js 1500 60 todas`.

### J7 — El internacional existe · bloque C · el commit más caro (3-4× cualquier otro)

Revisa D19 **solo para el internacional**; los playoffs domésticos siguen siendo solo tu camino.

Vive en `core/internacional.js` (nuevo, puro: clasificados, siembra, emparejamiento Swiss, bracket,
resolución determinista de ajenos) + `systems/internacional.js` (nuevo: `aplicar(state, rng) ->
{state, logs, decision?}`, regla invariable 5) + una línea nueva en `systems/registro.js`, entre
`serie` (`:63`) y `events` (`:64`) — necesita `career.posicion` fresco de `serie.js` y tiene que
correr antes de `escena.js` (`:71`), que hoy inventa el campeón del mundo y ahora lo va a leer.
`intentarInternacional` (`systems/serie.js:424-437`) y la rama `'internacional'` de `generarRival`
se borran; `serie.js` termina en la final doméstica.

**Los clasificados, sin tocar `rng`.** `liga.cuposInternacionales` ya existe (3/3/3/3/2/2) = 16
participantes, el tamaño exacto del Swiss real. Tu liga sale de `tablaDePosiciones`; las otras 5 por
`clasificadosDeterministas(orgs, n, clave)` — extensión de `campeonDeterminista`
(`core/escena.js:41-58`), que **ya existe y ya pondera por `org.fuerza` con `hashCadena`**. El
número de participantes no corre el stream.

**El Swiss sin volverlo caro.** 16 × 5 rondas ≈ 40 partidos/torneo × ~15 años ≈ 600 partidos; con
`gauss` serían 1200+ tiradas. Los partidos **ajenos** se resuelven con
`hashCadena(seed, torneo, año, ronda, orgA, orgB)` ponderado por fuerza — determinista, nombrado,
mostrable, cero `rng`. Solo **tus** partidos consumen `rng` (los únicos con draft/Fearless/
minijuego) — la filosofía de D19, pero con el bracket real y completo. Formato: Swiss 16, 5
rondas, 3-0 clasifica / 0-3 elimina, 8 al bracket; tus Swiss son Bo1 salvo avance/eliminación
(récord 2-2, Bo3); bracket Bo5 reusando `systems/serie.js` entero. Emparejamiento: mismo récord,
sin revancha, sin cruce de misma liga mientras haya alternativa. Fearless dentro de cada serie (no
del torneo entero, o un pool de 6 se agota en 3 mapas); persiste `penalizacionCampeonVisto`.

**El campeón del mundo sale del torneo:** `systems/escena.js:45` borra su `weightedPick` y lee
`state.internacional.campeon`. **Enciende una puerta muerta**: `ventana: 'internacional'` existe en
`data/contextos.js:23` y `calcularVentana` nunca la devuelve — el torneo la enciende gratis vía
`overrides`.

Checks (rojos hoy): el campeón del mundo del log **es** el campeón del torneo (hoy falla el 100% —
dos sorteos independientes); 16 participantes distintos, ≥1 por liga tier 1; el Swiss siempre
termina (8 y 8); ningún emparejamiento repite cruce; `registro.internacionales[]` guarda
`torneo + record + camino` en el 100%; un split de internacional nunca encadena más de
`maxDecisionesPorSplit` (T9, vivo); si no clasificás, cero tiradas consumidas.

### J8 — Worlds, MSI y First Stand · bloque C · primera candidata a cortar

Cierra D18. `splitsPorEdad: 3` da una sola regular y unos solos playoffs por año, así que solo
Worlds cabe como torneo completo; **First Stand** (pretemporada, bracket de 6 Bo3, campeones del
año anterior) y **MSI** (regular, bracket de 8 Bo5, los 1-2 de cada liga) son cortos. Usa
`nombresPorCompeticion` de `data/minijuegos.json`, que 12f ya escribió y hoy casi no se dispara.
Check: `ventana: 'internacional'` alcanzable (hoy inalcanzable en `cobertura.js`); los tres
torneos aparecen ≥1 vez en 300 carreras.

### J8c — Calibrar el mundo

Ojo con la distribución de campeones del mundo por liga a 15 años: el Swiss determinista por hash
podría colapsar en una org si dos comparten `fuerza`. Check: ninguna org > 25%.

### J10 — Elegís de dónde sos *(cero corrimiento si se hace bien)*

Textual del usuario: *"elegís la región pero te sirve hasta tier2, tier1 tenés que tener ofertas de
otras"*. Reabre **D17 como estructural** (venía "como narrativo" en 13d): `data/events/latam.json`
ya tiene 3 eventos esperando `region: ['NA','BR']`, y la maquinaria de imports ya existe desde
9Mb/9Md (`residenciaEn`, `cupoImports`, `minimoResidentes`, `margenImport`, `dificultadAdaptacion`).

`data/leagues.json` gana **LRN y LRS** como tier 2 (servidores LAN/LAS), sin tier 1 encima — los
circuitos que D17 ya nombraba. Campo `dificultad` por liga tier 1, con check de que su orden
coincide con `prestigio`. `core/mundo.js:310` (`weightedPick(ligasTier1, prestigio)`) **se sigue
llamando siempre**, y su resultado se descarta si el jugador eligió — regla de oro del archivo
(`mundo.js:199-203`): cada tirada se consume igual haya elección o no, o `simulate.js`/`validate.js`
headless dejan de reproducir. El contrato `eleccion` (`core/state.js:13-15` + `mundo.js:294-300`)
gana `regionOrigen?`.

Checks: elegir región no corre el stream (huella de 40 seeds idéntica entre `eleccion: null` y
`eleccion: { regionOrigen: <la que el sorteo habría dado> }` — protege la regla de oro); cada
región produce una dificultad distinta y monótona (% que llega a tier 1 ordenado igual que
`prestigio`, 300 carreras por región); desde LATAM se llega a tier 1 **solo por oferta de import**,
y se llega en > 0% de las carreras (si es 0%, el modo difícil es un callejón sin salida).

### J11 — Calibrar · solo constantes

Re-medición completa de la tabla de J0.

## Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | Guardados viejos: `state.internacional`, `player.bonusPermanente`, `flags.tierListPrevia`, `campeon.ultimoSplitJugado` no existen en un save pre-J | T4 cubre `createInitialState`, **no los saves**. `core/guardado.js`/`ui/almacenamiento.js` necesitan defaulting explícito — eje que el repo nunca tocó |
| 2 | T9 vivo en J7: un split de Worlds son 15-22 decisiones; `maxDecisionesPorSplit: 60` es la única red | Check del máximo real en 1500 carreras. Si pasa de 35, el Swiss auto-resuelve las rondas donde ya estás 2-0 o 0-2 |
| 3 | Leer el plantel en vivo (J1) puede regalar/robar dificultad de golpe si `plantel.js` sube el nivel medio con los años | Medir `org.fuerza` medio por año antes/después. Si driftea, el fix es en `plantel.js`, no en `fuerza.js` |
| 4 | Data Dragon envejece: versión del CDN, keys que cambian, se pierde el offline puro | Versión en dato. `onerror` → tile geométrico siempre. Check estático de keys declaradas |
| 5 | Regla 3: si el balance se sale de banda tras J1/J4, primero contenido, no constantes | Por eso J2 (que es contenido) va pegada a J1, y J5/J6 pegadas a J4 |
| 6 | J4 mueve los titulares del año (`core/temporadaResumen.js:173`) | Esperado y deseable — hoy `main_muerto` los domina. Re-medir en J5 |

## Verificación

```bash
node src/dev/validate.js                 # los checks viejos + los nuevos, en rojo primero (regla 7)
node src/dev/simulate.js 1500 60 todas   # 0 crashes
node src/dev/build.js                    # guards + techo de dist/
node src/dev/cobertura.js --huecos       # vacío
node server.js                            # jugar a mano, cero errores de consola
```

Más, por mover el motor: huella de determinismo en 40 seeds antes/después de cada subfase (el
corrimiento se espera y se declara en A/B/C; en J0/J9/J10 la huella tiene que ser idéntica y es
un check; J3 se midió el 2026-09-27, 35/40 seeds cambian, D74, porque la maestría entra a
`fuerza.js`); end-to-end: volver a jugar la carrera que disparó todo esto — ninguna de las nueve quejas
de J.0 se puede repetir textualmente.

**El corte mínimo:** J0 + J3 + J4 + J5 + J6 + J-previa + J9 ya arregla la partida que se jugó. Sin
sistemas nuevos, sin recalibración de bloque A. El internacional (J7/J8) y la agencia real (J1/J2)
quedan para el segundo tramo. **J8 es la primera que se corta** de todo el plan.

---

# FASE K — EL NIVEL MANDA

> Escrita el 2026-10-01 a partir de `AUDITORIA.md` (medida contra `2c63c4f`) y de las cuatro
> decisiones que el usuario tomó sobre ella (§K.1). **Reorganiza lo que quedaba de la FASE J** (§K.6)
> y va antes de que se retome la FASE V.

## K.0 — Por qué esta fase existe

El usuario lo dijo así: *"no es tanto de probabilidades a veces sino de nivel, por eso te digo que a
veces el juego se siente un rng clicker"*. La auditoría encontró un número detrás de cada parte de
esa frase:

| Lo que se siente | Lo que se midió (`AUDITORIA.md` §4) |
|---|---|
| "mi nivel no decide" | r(nivel, posición en la tabla) por split = **0,05**. Los compañeros pesan el 50% y su nivel queda congelado al fichar. La temporada se juega con **una sola tirada** de tu rendimiento (`systems/temporada.js:163`). El meta solo ya mueve ±25% (`campeones.multiplicadorMin/Max: 0,75/1,25`) |
| "elijo y no pasa nada" | ~**80%** de las interrupciones no tiene efecto detectable en el final (contrafáctico, 1.444 decisiones). Ni una estrategia consistente en todos los eventos cambia el puntaje. Desde cualquier decisión, el azar posterior pesa **4-10×** más que lo elegido |
| "la moneda no existe" | mentalidad y hype en pro: mediana **97 / 100**. El 47% de los efectos del catálogo cae sobre esas barras llenas |
| "todo es largo y todo es éxito" | ~**190** interrupciones por carrera, ~45-60 min. **79,5%** llega a tier 1. **72,6%** de las carreras pro termina en la línea forzosa de los 34 |
| "no sé qué tan bien jugué" | no hay puntaje final ni nada con qué comparar una seed |

La FASE J atacaba los síntomas uno por uno. Esta fase ataca la causa: **que el resultado lo decida
tu nivel, que tu nivel lo construyan tus decisiones y que el juego te frene solo cuando algo grande
está en juego.**

### K.0b — Línea de base *(medida en K0, 2026-10-02)*

**Cómo se midió (T6: se volvió a medir, no se copió de `AUDITORIA.md`).** Instrumento de K0-A en `634b9e0`
(`k0-instrumento`), sobre un motor idéntico al de `5548c00`: la huella de 40 seeds × 30 splits da la misma
tupla `finAnticipado:splitCount:soloqElo` y el mismo estado con los strings enmascarados (K0-B y K0-C solo
cambian textos y etiquetas de UI). Comando: `node src/dev/simulate.js 400 60 todas` (seeds 1-400, 60 splits,
6 estrategias, 0 crashes, 206 s). Las cifras de las tablas son de `criterio` salvo que se diga otra cosa. Con
n = 400 una tasa de ~77% tiene ±4 pp (95%) y una de ~1,5% tiene ±1,2 pp: las diferencias menores que eso no se
leen. La palanca se midió aparte con `node src/dev/agencia.js` (seeds 1-40, 12 réplicas por opción, 2
decisiones por tipo y carrera, 60 splits; 1.476 decisiones, σ_pob(puntaje) = 104,28; 1.051 s en 4 procesos).
Todo corrió en una sola máquina (Windows 11, Node 24).

| Métrica (§K.3) | "Hoy" que decía este plan | **Medido en K0** (`criterio`) | Objetivo | Qué cambia |
|---|---|---|---|---|
| r(nivel relativo a la liga, posición) en la misma liga | 0,05 | **0,37** en las ligas que el motor modela (14.377 splits con tabla; otros 943, de tier 3, no tienen liga modelada y se excluyen); **0,15** si se mezclan | ≥ 0,5 | La brecha es 0,37 → 0,5, no 0,05 → 0,5. El 0,05 era la r cruda con los splits de tier 3 |
| Favorito claro de un Bo5 (Δ ≈ 10) gana la serie | a medir | **91,9%** analítico (91,1% por Monte Carlo de 400.000 series con `mulberry32`); a Δ = 4: 71,7%; Δ = 6: 80,4%; Δ = 8: 87,1%; Δ = 12: 95,2% | ~80% (75-85) | ⚠ La banda ya se cumple a Δ ≈ 6. Para 80% a Δ = 10 hace falta un σ combinado de ~22-24 contra 13,9 de hoy: es una decisión de K2 (qué Δ es "claro"), no un faltante de la serie |
| Varianza de la posición explicada por tu nivel + el de tu equipo | a medir | R² = **0,079 ± 0,009** (todos los splits con tabla) y **0,175 ± 0,011** (solo ligas modeladas). **Con el ruido de resultados apagado:** 0,099 y 0,233 | mayoría (≥ 0,5); ruido puro ≤ 25% | ⚠ Ver "Lo que la línea de base cambia" (1) |
| Llega a tier 1 | 79,5% | **76,8%** (`equilibrado` 80,5%) | ~55-65% | |
| No llega a pro | ~20% | **23,0%** (`equilibrado` 18,8%; `azar` 23,5%) | ~20% | |
| Se estanca en tier 2/3 | ~0,7% | **0,3%** (`azar` 2,0%; `malas` 22,8%) | ~10% más, por malas decisiones | `malas` ya lo produce; `criterio` y `azar` no |
| Gana un título doméstico | 79% | **77,0%** | ~30% | |
| Top 20 del mundo alguna vez | ~51% de las exitosas | **56,3%** de todas · **73,3%** de las que llegan a tier 1 | ~15% | El denominador de "exitosas" tiene que quedar escrito (K2): según cuál se use da 56% o 73% |
| #1 del mundo alguna vez · en 3 o más temporadas | — | **7,0%** · **1,5%** (`azar` 9,5% · 0,5%) | (parte del "nuevo Faker") | |
| Gana un Mundial · "nuevo Faker" · P(2 o más \| 1) | no existe | **proxies, no miden eso**: ≥ 1 buen papel internacional 71,0%; "nuevo Faker" 63,5%; P(otro \| uno) 0,894. Salen de `buen_papel` (3,2 por carrera, mediana 3), no de títulos mundiales | ≥ 7% · ~2-3% · ≥ 35-40% | Hasta K5 no hay Mundial real: estas tres filas no tienen línea de base. El instrumento las marca `proxyAntesDeK5` |
| Carrera pro mediana | 16,7 años | **16,7** (p10 14,3 · p90 18; `malas` 11,7) | ~4-6 | |
| Llega a la línea forzosa de los 34 | 72,6% | **76,0%** (`equilibrado` 73,5%) | < 5% | |
| Interrupciones por carrera (mediana) | 191 | **185,5** (p90 210; `equilibrado` 187) | ≤ 80 | |
| Interrupciones por split pro | p90 9, máx 23 | todos: p50 2 · p90 9 · máx 17. **Regular:** p50 2 · p90 4 (20,7% pasan de 2). **Playoffs:** p50 5 · p90 8 (100% pasan de 2; 62,8% de 4). **Internacional:** p50 8 · p90 11 (99,6% pasan de 4) | ≤ 2; ≤ 4 en playoffs/internacional | La meta no se cumple en ningún tipo de split; el peor es el internacional |
| Minijuegos por carrera | 26 | **promedio 31,2 · mediana 38** (`equilibrado` 28,2 · 33) | 4-8 | |
| Tiempo-máquina a 1×, sin leer (mediana) | 17,4 min (Chromium real) | **9,9 min** por la definición del instrumento (logs no técnicos × 700 ms; p90 11,7); **11,1 min** si se suman las esperas del reproductor (+1.600 ms por minijuego) | ≤ 8 min | ⚠ **No comparable** con los 17,4 de la auditoría (otro método). La meta se re-basea en K4c: en proporción, 8/17,4 ≈ 46% de lo de hoy ≈ **4,6 min** por esta definición |
| Interrupciones con palanca medible | ~17% | Con la **definición y el test de la auditoría: 19,6%** (reproduce el ~17%). Con el **test corregido por comparaciones múltiples: 5,2%** (todo-o-nada) y **3,9%** (ponderado por la fracción significativa de cada tipo) | ≥ 60% | ⚠ Ver "Lo que la línea de base cambia" (3) |
| Sensibilidad a la habilidad: `criterio` contra `azar` | a medir | tier 1: 76,8% contra 74,0% · título doméstico: 77,0% contra 75,3% · #1 alguna vez: 7,0% contra 9,5% · proxy ≥ 1 buen papel: 71,0% contra 65,0% (×1,09) · proxy "nuevo Faker": 63,5% contra 54,5% (×1,17) | P(Mundial) ≥ 2× · P(nuevo Faker) ≥ 3× | Hoy **no hay sensibilidad**: ver (2) |
| Mentalidad en pro: mediana · % de splits ≥ 90 | 97 · 75% | **98,4 · 87,3%** (`equilibrado` 97,2 · 76,8%) | 45-75 · < 20% | |
| Hype en pro: % de splits ≥ 90 | 77% | **77,8%** (`equilibrado` 78,2%) | < 25% | |

#### K.0c — Después del bloque A *(medido por el supervisor al cerrar K3c, 2026-10-03)*

`node src/dev/simulate.js 1500 60 todas` sobre `7735e74`: 1500 carreras por estrategia, 0 crashes. La palanca
sale de `node src/dev/agencia.js`, con sus valores por defecto: 371 decisiones, medidas ya contra
`puntajeDeCarrera`. Cifras de `criterio` salvo que se diga otra cosa.

| Métrica | K0 | **Después del bloque A** | Objetivo | Lo resuelve |
|---|---|---|---|---|
| r nivel–posición, misma liga (corregida) | 0,37 | **0,589** | ≥ 0,5 | ✅ bloque A |
| R² sin ruido, ligas modeladas | 0,233 | **0,52** (K3c meta, 800 × 60) | ≥ 0,5 | ✅ bloque A |
| Bo5, favorito claro (Δ0 ≈ 10) | 91,9% analítico | jugador **82%** · rival 94% · conjunto 86% (en el motor) | 75-85 | jugador ✅; el rival es el Fearless de K4 |
| Mentalidad pro: mediana · % ≥ 90 | 98,4 · 87,3% | **72,1 · 2,6%** | 45-75 · < 20% | ✅ bloque A |
| Hype pro: % ≥ 90 | 77,8% | **19,3%** | < 25% | ✅ bloque A |
| `criterio` contra `azar`: #1 del mundo alguna vez | 7,0 contra 9,5 | **11,1 contra 6,9 (×1,6)** | — | ✅ bloque A |
| `criterio` contra `azar`: #1 en 3 o más temporadas | 1,5 contra 0,5 | **2,0 contra 0,6 (×3,3)** | — | ✅ bloque A |
| `criterio` contra `azar`: mediana del puntaje | — | **994 contra 716 (×1,39)** | — | ✅ bloque A |
| `malas` contra `azar`: no llega a pro | 49,8 contra 23,5 | **42,1 contra 22,4** | `malas` claramente peor | ✅ |
| `malas`: estancado en tier 2/3 | 22,8% | **26,4%** | lo producen las malas decisiones | ✅ |
| Llega a tier 1 | 76,8% | 79,1% | ~55-65% | K5c (mercado, región) |
| Título doméstico | 77,0% | 78,7% | ~30% | K5c |
| Carrera pro mediana · llega a los 34 | 16,7 años · 76% | 17 años · 81% | ~4-6 · < 5% | K5 (retiro por mercado) |
| Interrupciones por carrera · minijuegos | 185,5 · 38 | 188 · 32 | ≤ 80 · 4-8 | K4 |
| Tiempo-máquina (mediana) | 9,9 min | 10,0 min | ≤ ~4,6 (re-base) | K4c |
| Palanca (test corregido, ponderado · todo-o-nada) | 3,9% · 5,2% | **2,7% · 3,4%** | ≥ 60% | K4c (ver abajo) |

**Lo que dice esta tabla.** El bloque A cumplió lo suyo:
- **el nivel decide el resultado**: r 0,59 y R² 0,52;
- **las barras ya no están saturadas**;
- **jugar bien se nota arriba**: el #1 en 3 o más temporadas sale ×3,3 contra `azar`, y la mediana del puntaje
  ×1,39.

Lo que no se movió es del ritmo (K4) o del mundo (K5): la llegada a tier 1, los títulos, la carrera de 17 años y
las 188 interrupciones. **La palanca casi no cambia**, y es esperable: se mide sobre las mismas ~185 interrupciones,
la mayoría chicas. La meta de K.3c ("≥ 60% de las interrupciones con palanca") **se re-especifica así** (lo pedía
§K.0b, punto 3):
- **Sobre qué se mide.** Sobre las interrupciones que **sobreviven a K4**, con el test corregido por
  comparaciones múltiples.
- **Con cuánta potencia.** Las réplicas tienen que alcanzar para detectar una palanca de 0,3 σ_pob con 80% de
  potencia: con el ruido medido dentro de la opción, de 0,5 σ_pob, son ≥ 30 réplicas.
- **Dónde se mide.** En K4c. Medirla antes no informa, porque el 60% es una meta sobre cuándo te frena el juego,
  no sobre el nivel.

**Las seis estrategias** (n = 400 cada una; `ranked` y `prudente` son las de J0):

| | equilibrado | ranked | prudente | **criterio** | azar | malas |
|---|---|---|---|---|---|---|
| No llega a pro % | 18,8 | 45,3 | 28,5 | **23,0** | 23,5 | 49,8 |
| Estancado T2/T3 % | 0,5 | 10,0 | 0,5 | **0,3** | 2,0 | 22,8 |
| Llega a tier 1 % | 80,5 | 40,0 | 71,0 | **76,8** | 74,0 | 18,5 |
| Título doméstico % | 80,8 | 42,8 | 71,3 | **77,0** | 75,3 | 33,3 |
| #1 alguna vez % | 6,8 | 5,5 | 10,8 | **7,0** | 9,5 | 1,5 |
| Interrup. por carrera (mediana) | 187 | 27 | 186 | **185,5** | 186 | 23 |
| Minijuegos por carrera (mediana) | 33 | 1 | 34 | **38** | 31,5 | 0 |
| Años pro (mediana) | 16,7 | 16,3 | 16,3 | **16,7** | 16,7 | 11,7 |

**Por región de origen** (`criterio`; n = 48 a 85 por región, o sea ±9-12 pp al 95%: nada de esto se distingue
del azar): llega a tier 1 — Brasil 79,2% · China 81,0% · Corea 71,8% · Norteamérica 76,5% · Europa 77,3% ·
Asia-Pacífico 75,5%. **Hoy no hay una estructura regional en el resultado** (Corea no es más fácil que
Norteamérica: 72% contra 77%); la que pide §K.3b la tiene que producir K5.

**Palanca por tipo de decisión** (test corregido, % de las decisiones medidas con efecto significativo; 12
réplicas). Por encima del 10%: `amateur:oferta` 28,6% (n = 42) · `mercado:oferta` 18,2% (66) ·
`retiro:retiro_declive` 67,9% (28) · `retiro:retiro_vuelta` 52,2% (23) · `eventos:golpe_duro` 12,5% (24).
**Todo lo demás está en 0-9%, que con este test es lo esperable por azar**: los eventos (513 decisiones,
2,7%), el draft de serie (0%), el minijuego de serie (1,5%), la práctica (9,1%), el parche (5,1%), la
elección de la rutina (0%), el cierre por edad (257 decisiones, 2,7%). Ruido dentro de la opción: 0,3-0,7 σ_pob
(la misma decisión repetida da resultados que difieren más de lo que una buena opción mejora a una mala).

#### Lo que la línea de base cambia del plan

1. **El ruido no es el cuello de botella de §K.3a: lo es cómo el nivel entra en la tabla.** Con el ruido de
   resultados en cero, tu nivel + el de tu equipo explican solo R² = 0,099 de la posición (0,233 en las ligas
   modeladas): el 90% de la varianza no la produce el dado sino factores que esta ablación no apaga (cuáles
   son no se midió todavía; K2 empieza por ahí). Por eso `ruidoPuro` (la fracción que el ruido agrega)
   sale `null` y el instrumento no lo interpreta: con R² sin ruido < 0,3, "ruido ≤ 25%" **ya se cumple y no
   informa nada**. La fila de §K.3a pasa a ser **R² con el ruido apagado, en ligas modeladas: 0,23 → ≥ 0,5**.
   K2 tiene que reestructurar cómo el nivel entra en la tabla, no bajar σ.
2. **El juego castiga jugar muy mal, pero no premia jugar bien.** `criterio` y `azar` dan lo mismo dentro del
   error (tier 1: 76,8% y 74,0%; título: 77,0% y 75,3%); `malas` es lo único que se despega (18,5% y 33,3%).
   Los proxies de Mundial dan ×1,09 y ×1,17 de `criterio` sobre `azar`, contra el ×2 y el ×3 que pide §K.3c.
   Esta es la medición del "se siente un rng clicker": las decisiones buenas casi no mueven el resultado.
3. **La meta de "≥ 60% de interrupciones con palanca" se escribió con un test que no controla el error.** El
   test de la auditoría compara la mejor opción con la peor *de la misma muestra* al 5%: con 3 opciones acepta
   ~11% de falsos positivos, con 4 ~16% y con 6 ~26% (medido bajo la hipótesis nula; `validate.js` lo fija con
   un check). Con el test corregido (Bonferroni sobre todos los pares) el 19,6% que reproduce la auditoría
   baja a **5,2%**, y la palanca real está en dos lugares: las ofertas (amateur y mercado) y el retiro. Es una
   medición con 12 réplicas, así que el test tiene poca potencia (`amateur:reparto` tiene una palanca mediana de
   0,36 σ_pob con un ruido dentro de la opción de 0,62 σ_pob y solo el 2,5% de sus decisiones sale
   significativo): la cifra es una cota inferior, no "exactamente 4-5%". **K3c
   re-especifica la meta con el test válido**; el ≥ 60% no se puede fijar sin decidir qué cuenta como palanca.
4. **Dos metas de §K.3 estaban planteadas sobre una medición distinta de la que da el instrumento:** el
   tiempo-máquina (17,4 min de Chromium contra 9,9 min por beats; se re-basea en K4c) y la r de la misma
   liga (0,05 era la cruda; la que importa es 0,37).
5. **Casi todo lo de §K.3b que depende del Mundial no tiene línea de base hasta K5.** `ganaMundial`,
   `nuevoFaker` y `pOtroMundialDadoUno` son proxies triviales (≥ 1 o ≥ 2 `buen_papel`, que se reparte ~3 veces
   por carrera): 63,5% de "nuevo Faker" no es un dato sino la definición. Lo único medible hoy en esa familia es
   **#1 del mundo en 3 o más temporadas: 1,5%** (n = 400, ±1,2 pp al 95%).
6. **Lo que sí mide el instrumento y no cambia:** carrera pro mediana 16,7 años y 76% llegando a la línea de
   los 34 (el retiro emergente de K5); mentalidad e hype saturados (mediana 98; ~78% de los splits ≥ 90); las
   interrupciones y los minijuegos por carrera (185 y 31-38).

**Limitaciones de esta línea de base.** (a) Los tres proxies de Mundial no se pueden leer como Mundial. (b)
`carrera.tierMaximo` del observador cuenta el estado "agente libre de tier 2" que sigue a un ascenso, mientras
`registro.porOrg` solo tiene orgs en las que se fichó; discrepa en 5 de 400 carreras de `malas` y en 1 de 200
de `ranked`, sin cambiar ninguna categoría del embudo (D75). (c) `agencia.js` usa 12 réplicas y 40 carreras: la
potencia es baja (punto 3 de arriba). (d) Los números por región tienen n de 48-85. (e) Una sola máquina y una
sola corrida por estrategia; la simulación es determinista, así que repetirla da lo mismo, pero otro conjunto de
seeds daría tasas distintas dentro de los márgenes de arriba.

## K.1 — Decisiones del usuario (2026-10-01, textuales — respetarlas, no volver a preguntar)

| Tema | Decisión |
|---|---|
| **D-A — Modo corto** | *"no"* → **un solo modo, el largo.** La sesión se achica como consecuencia (menos interrupciones con K4, carreras realistas con K5), no por un modo aparte |
| **D-B — Dónde te frena el juego** | *"en playoffs, partidos importantes, tryouts, internacionales, draft no sí o sí en todos estos, y también en eventos importantes no relacionados tanto a los partidos quizás, no sé, pensalo y decime qué opinás"*. Se aprobó (*"dale escribilo"*) la propuesta: plan de Fearless por serie en vez de pick mapa a mapa, minijuegos solo en el clímax, la prueba en cada salto grande, eventos chicos resueltos por tu perfil y la charla del coach como comodín (§K4) |
| **D-C — El número** | *"dale"* → puntaje final, desafío diario (misma seed para todos) y comparación, sin backend (§K1) |
| **D-D — Dificultad** | *"que tener buenas carreras no sea muy muy difícil pero que ser el nuevo Faker sí, pero tampoco muy imposible"*. Precisado: *"menos lo de 20-30 no llega a pro, ese 10% extra quizás si toman malas decisiones en tier 2"* · *"gana un mundial mínimo 7%, pero depende la región, si sos coreano más fácil, si sos de NA que te dé más puntos ganar un mundial"* · *"el de el nuevo Faker fijate que ese 1% no termine siendo imposible, más de dos mundiales que no sea tan imposible porque si ya ganaste uno es porque sos muy bueno"* · *"no es tanto de probabilidades a veces sino de nivel"* |
| **Pendiente** | El nombre visible del nivel máximo. *"El nuevo Faker"* usa el nombre de una persona real (`CLAUDE.md` / README). Si el usuario no lo confirma literal, va un nombre inventado. Internamente se llama "el nuevo Faker" |

## K.2 — El principio

1. **El nivel manda, el azar condimenta.** El mejor equipo gana casi siempre, pero no siempre: hay
   batacazos. Las metas de población (§K.3b) **no se calibran agregando dado**: salen de cuánta gente
   llega a cada nivel (potencial, decisiones, mercado).
2. **Tus decisiones construyen tu nivel.** Lo que elegís deja marca que dura y se ve en la ficha, con
   su porqué.
3. **El juego te frena solo cuando algo grande está en juego.** Lo demás se resuelve solo y se cuenta
   en una línea.
4. **Todo termina en un número.** Un puntaje que se puede comparar y que premia la dificultad.

## K.3 — Las metas (propuestas; K0 mide la línea de base y cada calibración las fija)

> **K0 ya midió la línea de base (§K.0b).** La columna "Hoy" de estas tablas es la de la auditoría y se deja
> como estaba; lo medido está en §K.0b. Cinco metas de esta sección cambian de forma al medirlas, y la
> subfase que las calibra las re-escribe con su número: (1) la r de la misma liga parte de **0,37**, no de
> 0,05; (2) la varianza explicada se mide **con el ruido apagado y en ligas modeladas (0,23 → ≥ 0,5)**:
> "ruido puro ≤ 25%" ya se cumple y no informa; (3) el Bo5 de Δ ≈ 10 ya da **92%**, y el ~80% corresponde
> a Δ ≈ 6: K2 decide qué Δ es "claro"; (4) el tiempo-máquina se re-basea en K4c por la definición del
> instrumento (9,9 min hoy, no 17,4); (5) la palanca "≥ 60%" se re-especifica en K3c con el test corregido
> (5,2% hoy, no 17%). Las filas de Mundial y "nuevo Faker" no tienen línea de base hasta K5.

### K.3a — Nivel → resultado (el corazón de la fase)

| Métrica | Hoy | Objetivo |
|---|---|---|
| r(tu nivel relativo a la liga, posición final) en la misma liga | 0,05 | **≥ 0,5** |
| El favorito claro de un Bo5 (Δ fuerza ≈ 10) gana la serie | a medir (K0) | **~80%** (75-85) |
| Tu equipo es claramente el más fuerte del Mundial y lo gana | — | **~50%** |
| El Mundial del mundo (uno por año, lo juegues o no) lo gana la LCK *(usuario, 2026-10-05)* | — | **≥ 25% y la liga que más gana**. Sale de la fuerza de los planteles, no de cupos: cualquier liga con el equipo más fuerte puede ganar |
| Ganaste un Mundial y ganás otro: P(2 o más \| 1) | — | **≥ 35-40%** |
| Varianza del resultado de temporada explicada por tu nivel + el de tu equipo (por ablación) | a medir (K0) | **mayoría (≥ 50%)**; ruido puro ≤ 25% |

### K.3b — El embudo de carrera (jugando "normal", bot `criterio`)

| Nivel | Hoy | Objetivo |
|---|---|---|
| No llega a pro | ~20% | **~20% (como hoy)** — el amateur sigue siendo el filtro |
| Se estanca en tier 2/3 | ~0,7% | **~10% más, y lo producen las malas decisiones** (con `criterio` bastante menos, con `malas` bastante más) |
| Llega a tier 1 | 79,5% | ~55-65% |
| Gana al menos un título doméstico | 79% | ~30% |
| Top 20 del mundo alguna vez | ~51% de las exitosas | ~15% |
| Gana al menos un **Mundial** (el torneo real de K5) | no existe | **≥ 7%** en promedio. **Depende de la región**: desde Corea, más fácil (~12-15%); desde NA, más difícil (~3-5%). El puntaje compensa (§K1) |
| **"El nuevo Faker"** (2 o más Mundiales, o #1 del mundo en 3 o más temporadas) | ~25% de veredictos de cima, regalados | **~2-3% en promedio, pero ≥ 30% entre los de nivel pico de élite** (top 3% de nivel): si llegás a ese nivel, llegás a la cima. No es una lotería |
| Carrera pro mediana | 16,7 años | ~4-6 años; las buenas 7-10; las leyendas 12 o más |
| Llega a la línea forzosa de los 34 | 72,6% | < 5% |

### K.3c — Ritmo y agencia

| Métrica | Hoy | Objetivo |
|---|---|---|
| Interrupciones por carrera (mediana) | 191 | **≤ 80** |
| Interrupciones por split pro | p90 9, máx 23 | ≤ 2; ≤ 4 en splits de playoffs o internacional |
| Minijuegos por carrera | 26 | 4-8 |
| Tiempo-máquina a 1× sin leer (mediana) | 17,4 min | ≤ 8 min (sesión real ~20-35 min: corta si fracasás, ~40 si sos leyenda) |
| Interrupciones con palanca medible (contrafáctico) | ~17% | **≥ 60%** |
| Sensibilidad a la habilidad: `criterio` contra `azar` | a medir (K0) | P(Mundial) ≥ 2× · P(nuevo Faker) ≥ 3× |
| Mentalidad en pro: mediana · % de splits ≥ 90 | 97 · 75% | 45-75 · < 20% |
| Hype en pro: % de splits ≥ 90 | 77% | < 25% |

## K.4 — Bloques de corrimiento (trampa T1)

| Bloque | Subfases | Cierra con |
|---|---|---|
| **sin corrimiento** | K0, K1 | huella de 40 seeds idéntica (salvo lo que declare J3 al mergearse) |
| **A — el nivel** | K2, K3 | **K3c** |
| **B — el ritmo** | K4 | **K4c** |
| **C — el mundo** | K5 | **K5c** |

Igual que en J: dentro de un bloque, un check fuera de banda se anota con su número y se re-basea en
la calibración, no en el acto (regla 2 + T6). Cada check de banda que se reemplace lleva su línea de
"reemplaza a X, que exigía lo contrario" (regla 17; D56 es el primero). **D52 sigue vigente**:
ninguna seed anterior reproduce su carrera.

**Cómo se anota un check fuera de banda dentro de un bloque** *(2026-10-02, antes de K2b, el primer commit de K
con corrimiento)*. `validate.js` lee un registro único, `src/dev/bandasPendientes.js`: una entrada por check de
banda que el bloque abierto sacó de banda, con el nombre exacto del check, el bloque (`A`, `B`, `C`), el valor
medido y la banda, el commit que lo sacó y la subfase que lo re-basea (`K3c`, `K4c`, `K5c`). Un check registrado que
falla se reporta **PENDIENTE**, no FAIL, y no rompe la corrida. Solo entran checks **de banda** (la regla 17: los
que protegen "lo que el juego hace hoy"); un check estructural, de determinismo o de pureza nunca entra. Tres checks
custodian el registro: (1) una entrada cuyo check pasa es un error (hay que borrarla: el registro no acumula
basura); (2) una entrada de un bloque cerrado es un error (la calibración de K3c, K4c o K5c tiene que vaciar su
bloque); (3) una entrada sin valor medido o sin subfase es un error.

## K.5 — Subfases

### K0 — Higiene y el instrumento *(sin corrimiento)*

**Higiene** (D62-D73, todo lo que no consume `rng`):
- Mergear J3 (rama `j3-pool-oxido`, `76338ae`) después de la revisión del workflow, y medir su huella.
- Borrar la rama `faseV-V1-grok` y pushear la rama de trabajo, **con confirmación del usuario** (es
  destructivo / sale de la máquina).
- Guardado: check estático que obliga a subir `VERSION` (`core/guardado.js:13`) cuando cambia la
  forma de `createInitialState`. Un guardado de otra versión ya se descarta solo.
- `mercado.js:91`: siendo agente libre (sueldo 0), toda oferta sale "bombazo". Se compara contra la
  mediana salarial de la liga, no contra 0.
- `server.js`: escuchar en `127.0.0.1` y rechazar paths fuera de la raíz.
- Desborde en celular (documento de 455 px a 390 px): arreglarlo y verificarlo con la receta de navegador.
- Pase de vocabulario LoL (B9; solo texto, grepear después — T8): "colgás los botines", "cancha",
  "hinchas", "camiseta", "filial" → academia, "Selección: …" → "Internacional: …", y bajar "vestuario"
  donde suene a fútbol.
- "Titular" significa dos cosas en la ficha: renombrar las bandas de NIVEL para que no choquen con
  las de jerarquía.

**El instrumento** (lo que va a decir si K2-K5 funcionaron):
- `src/dev/agencia.js`: el contrafáctico de `AUDITORIA.md` §4.3 como herramienta permanente.
  Reporta palanca y % significativo por tipo de decisión, y % de interrupciones con palanca.
- `src/dev/estrategias.js` suma tres bots. `criterio` elige con la previa y la probabilidad del
  propio motor, y juega bien los minijuegos. `azar` elige uniforme. `malas` elige lo peor por la
  misma previa.
- `simulate.js` suma bloques:
  - `embudo`: los niveles de §K.3b, con P(2 o más | 1).
  - `nivel`: la r de la misma liga, la tasa de victoria del favorito por Δ y la atribución de
    varianza por ablación (se apaga un factor por vez con overrides de `BALANCE` en el proceso de la
    sonda, nunca en el motor).
  - `economia`: percentiles de mentalidad y hype en pro.
  - `longevidad`: años de carrera pro y % que llega a los 34.
  - `ritmo`: interrupciones por carrera y por split, y tiempo-máquina estimado como beats × 700 ms.
  - Todo, también por región de origen.
- La línea de base completa se mide y se escribe en §K.0b (T6).

Checks: los KPIs dan valores finitos sobre 200 carreras × 3 bots, con 0 crashes · huella de 40 seeds
idéntica · el check de `VERSION` falla en rojo si se agrega un campo sin subirla (regla 7).

### K1 — El número *(sin corrimiento: puro, cero `rng`)*

- `core/puntaje.js` (nuevo, puro). El puntaje de carrera suma:
  - logros ponderados por rol (`CONCEPTO` §9);
  - un multiplicador por la **dificultad de la liga** donde los conseguiste (dato `dificultad` en
    `leagues.json`, el mismo que usa K5): ganar un Mundial con una org de NA vale más que con una de
    Corea, tal como lo pidió el usuario;
  - **potencial contra logro** ("hasta dónde llegaste contra hasta dónde podías", `oculto.potencial`);
  - tu **puesto en la generación**.
- **Niveles con nombre**, desde "El que no llegó" hasta el nuevo Faker. Los cortes son provisorios y
  se fijan en K5c con las distribuciones medidas.
- **Leyendas inventadas para compararte** (`data/leyendas.json`), elegidas por cercanía de perfil y
  sin `rng`: la "figura histórica" de El Ídolo, respetando `CLAUDE.md`.
- **Tarjeta final**: el número arriba, compacta (los mapas de cada internacional pasan a un
  desplegable), el PNG con el puntaje y un texto para compartir.
- **Desafío diario**: la seed sale de la fecha, y la seed fija **también** el rol, la región y el pool
  (`eleccion: null`, el camino que ya usa `simulate.js`), así todos arrancan igual. Se comparte con
  fecha, puntaje, nivel y versión del juego. Historial local de puntajes (`localStorage`, conveniencia).

Pantalla: la tarjeta final nueva y el botón del desafío en el inicio. Checks: el puntaje es puro y
determinista · es monótono (más logros, más puntaje) · el mismo Mundial vale más desde una liga de
menor `dificultad` · dos desafíos con la misma fecha arrancan idénticos · huella de 40 seeds idéntica.

#### K1 — decisiones de spec *(supervisor, 2026-10-02; el usuario pidió no frenar con preguntas: se deciden acá y se pueden revisar)*

**D75 y D76 se resuelven antes del puntaje, sin corrimiento (cero `rng`, huella idéntica).**
- **D76 — aditivo, no se reescribe la fila.** `fila.tier`/`fila.liga` pasan a significar, documentado, *"tier y liga
  al firmar"* (un descenso o ascenso en el lugar no cierra la fila: el contrato viaja, como hasta hoy). Lo que el
  puntaje y `core/legado.js` necesitan sale de dos campos nuevos que solo crecen (regla 14): `fila.splitsPorTier`
  (`{ 1: 0, 2: 0, 3: 0 }`, completo desde `abrirFila` — T4) que `registrarSplitEnFila` incrementa con el
  `career.tier` **del split jugado**, y `liga` + `tier` en cada entrada de `registro.titulos` y `liga` en cada
  `registro.internacionales` (los escriben `rendimiento.js` y `serie.js` al registrar). `splitsDeTier`,
  `titulosDeTier` y `ligaInsignia` de `legado.js` leen de ahí. Sube `VERSION` de `core/guardado.js` (cambia la
  forma de lo que se guarda: un guardado a mitad de carrera tendría títulos sin liga).
- **D75 — "llegó a tier N" = jugó al menos un split con contrato en tier N** (`splitsPorTier[N] > 0` en alguna
  fila), no "ganó el salto". El estado "agente libre de tier 2" que sigue a un ascenso no cuenta. El observador de
  `simulate.js` (`carrera.tierMaximo`) se alinea a esa definición y el puntaje usa la misma.

**`dificultad` (dato nuevo en `leagues.json`, ligas tier 1 y tier 2).** Significa **cuán difícil es ganar el
Mundial saliendo de esa liga** (más alto = más difícil), que es como lo dijo el usuario (*"si sos coreano más
fácil, si sos de NA que te dé más puntos ganar un mundial"*) y como lo usa K5 (*"la región ES la dificultad"*).
Corrección de redacción: el check de K1 que decía *"el mismo Mundial vale más desde una liga de menor
`dificultad`"* se lee **"de mayor `dificultad`"** (con este significado son la misma frase del usuario; la
anterior suponía que `dificultad` medía la fuerza de la liga). En K5 el check *"la dificultad de cada región es
monótona con su `dificultad`"* es: P(ganar el Mundial) **decrece** con `dificultad`. Valores provisorios
(multiplicador directo de los logros internacionales; K5c los calibra con el Mundial real): LCK 1,0 · LPL 1,1 ·
LEC 1,4 · LCP 1,6 · LCS 1,7 · CBLOL 1,9; cada tier 2 hereda el de la liga a la que asciende.
- **Qué multiplica qué.** Los logros **internacionales** (participar, buen papel; el título mundial cuando K5 lo
  cree) se multiplican por la `dificultad` de la liga que representaste. Los **títulos domésticos** se ponderan
  por el `prestigio` de su liga, que ya existe (un título de LCK vale más que uno de LCS, como en la realidad). Así
  el puntaje premia la dificultad en los dos sentidos sin contradecirse.

**`core/puntaje.js` (puro: sin `rng`, sin DOM, sin `Date`; todas las constantes en `BALANCE.puntaje`).**
`puntajeDeCarrera(state)` → `{ total, componentes: [{ id, etiqueta, puntos, detalle }], nivel, percentil,
leyenda }`. Componentes, todos ≥ 0 y crecientes en el logro (eso da la monotonía):
1. **Trayectoria**: splits jugados por tier (`splitsPorTier`), más pesados cuanto más alto.
2. **Títulos domésticos**: por tier, × `prestigio / prestigioReferencia` de su liga.
3. **Internacional**: participación y buen papel, × `dificultad`.
4. **El mundo**: pico de rank mundial por bandas (#1, top 5, top 20) + splits en el Top 20.
5. **La generación**: puesto entre vos y los rivales de `mundo.rivales` por el mismo dato que ya usa
   `dueloDeGeneracion` (mejor rank mundial; `0` = nunca, va último; los empates no te superan).
6. **El que no llegó también suma**: el pico de soloQ (`registro.picos.rankedPuntos`) da un piso chico, para que
   dos desafíos diarios sin fichaje se puedan comparar.
- **Por rol** (`CONCEPTO` §9): `BALANCE.puntaje.pesoRol` multiplica los componentes individuales (4 y 5). Arranca
  en 1 para los cinco roles; el worker **mide** la mediana del puntaje por rol (bot `criterio`, 400 seeds) y, si
  algún rol se aparta más de ±10% de la mediana general, lo compensa ahí. El número medido va a `PROGRESO.md`.
- **Potencial contra logro**: el total se multiplica por un factor que crece cuanto **menor** era tu
  `oculto.potencial` (acotado, p. ej. 0,85-1,25): el mismo logro con menos techo vale más. La tarjeta revela el
  potencial ("tu techo era 64, oculto hasta hoy").
- **Niveles con nombre** (cortes provisorios en `BALANCE.puntaje.niveles`, se fijan en K5c), de abajo hacia
  arriba: *El que no llegó* (nunca fichó, por definición, no por puntaje) · *Pasó por el circuito* · *Un
  profesional más* · *Fijo en primera* · *Campeón* · *Figura mundial* · *Leyenda* · **"El GOAT"**. Este último es
  el nombre visible provisorio del nivel "el nuevo Faker" (§K.1: inventado mientras el usuario no confirme el
  literal; "GOAT" es jerga de la escena, no el nombre de una persona). Los cortes intermedios se ponen sobre la
  distribución medida (bot `criterio`, 400 seeds) y quedan escritos con su percentil.
- **Referente del número** (regla 13): nivel con nombre + percentil contra una tabla provisoria de cuantiles
  medida con `criterio` y guardada en `BALANCE.puntaje.cuantiles` ("mejor que el 72% de las carreras").
  Provisoria como los cortes; K5c la vuelve a medir.

**Leyendas (`data/leyendas.json`)**: 16-24 leyendas **inventadas** (handle, rol, región, años de carrera, títulos,
internacionales, pico de rank, una línea de historia con tono de escena). Se elige la más cercana por distancia
normalizada sobre el perfil de tu carrera, desempate por `id` (cero `rng`). Ningún handle puede ser el de un pro
real (`validate.js` lo chequea contra una lista de handles reales conocidos, y contra los que genera el motor).

**Desafío diario.** `core/desafio.js` (puro): `seedDelDia('YYYY-MM-DD')` por `hashCadena` (fecha **UTC**, la
misma para todos); el desafío arranca con `eleccion: null` (rol, región y pool salen de la seed, como en
`simulate.js`) y deja `state.desafio = { fecha }` (`null` fuera del desafío; completo desde
`createInitialState`, T4). `?desafio=YYYY-MM-DD` en la URL lo reproduce. **Versión del juego**: constante
`VERSION_JUEGO` en `src/data/version.js` junto con el hash de la huella de 40 seeds; un check de `validate.js`
falla si la huella cambia y el hash no se actualiza, así "misma versión" garantiza "mismo juego" para comparar un
desafío (el bloque A/B/C sube la versión al mergear su corrimiento). Historial local en `localStorage` (envuelto
en try/catch; si falla, la tarjeta se ve igual).

**Pantalla.** Tarjeta final: el número arriba, grande, con nivel y percentil; el desglose de los componentes con
su porqué; la leyenda comparada; el potencial revelado; el veredicto de siempre; los mapas de cada internacional
en un desplegable cerrado. El PNG (`exportar.js`) lleva puntaje, nivel y fecha del desafío si lo es. Botón
"Copiar resultado" con el texto para compartir (juego, fecha si es desafío, puntaje, nivel, versión, link). En el
inicio, el botón **"Desafío del día"** y el historial de tus últimos puntajes.

**Orden de trabajo.** K1-A (motor: D75/D76, `dificultad`, `puntaje.js`, `leyendas.json`, `desafio.js`,
`version.js`, bloque `puntaje` de `simulate.js` con la distribución por rol y por estrategia, checks) y K1-B
(pantalla). Checks de §K1 más: `puntaje.js` no importa `rng.js` ni usa `Date`/`Math.random` (estático) · cada
componente ≥ 0 · el potencial más bajo nunca puntúa menos con el mismo registro · `splitsPorTier` suma
`fila.splits` en cada fila · la huella de 40 seeds idéntica a la de `ffdf648`.

#### K1 — lo que cambió la revisión de K1-A *(supervisor, 2026-10-02)*

La revisión independiente de K1-A (`b0b544b`) no encontró corrimiento: estado, `rng` y logs idénticos en 610
carreras contra `8e36105`, y `validate.js` completo en 266/266. Sí encontró que tres cosas de la spec no
aguantaban, y que siete de sus mutantes sobrevivían a la suite. Decisiones:

- **Los niveles se ganan con hechos, no con cortes de puntaje.** Con los cortes sobre la distribución de hoy, el
  59% de las carreras con un título de primera quedaba debajo de "Campeón". Un #4 del mundo con 36 splits en tier
  1 y dos títulos de LCP salía "Pasó por el circuito", con el veredicto de la misma tarjeta diciendo "De los
  mejores del mundo": la tarjeta se contradecía (regla 15). Además, cualquier corte de puntaje se invalida con
  cada calibración del bloque A/B/C. Cada nivel declara su **requisito de hecho** en `BALANCE.puntaje.niveles`;
  gana el más alto que se cumple:

  | Nivel | Requisito |
  |---|---|
  | *El que no llegó* | nunca jugó un split con contrato |
  | *Pasó por el circuito* | jugó, pero nunca en tier 1 |
  | *Un profesional más* | ≥ 1 split en tier 1 |
  | *Fijo en primera* | ≥ N splits en tier 1 (N en `BALANCE`, del orden de 3 años) |
  | *Campeón* | ≥ 1 título de liga de tier 1 |
  | *Figura mundial* | cerró al menos una temporada en el Top 20 del mundo |
  | *Leyenda* | ≥ 3 títulos de tier 1 y top 5 del mundo alguna vez |
  | **El GOAT** | #1 del mundo en ≥ 3 cierres de temporada (desde K5, también 2 o más Mundiales) |

  El **número** sigue siendo lo que se compara; su referente es el percentil (regla 13). El nivel siguiente dice
  el **hecho** que faltó ("te faltó un título de primera"), no una cantidad de puntos. Con el motor generoso de hoy,
  la distribución de niveles va a ser generosa: es la verdad del motor, y K2-K5 la cambian sin tocar los nombres.
- **"Tu generación" se compara simétrico.** `mundo.rivales[].puntaje` se actualizaba en cada split y tu
  `picos.rankMundial` solo en el cierre de temporada: un rival con un pico de mitad de año te ganaba en falso
  (11 de 100 carreras, con texto falso en la tarjeta). Los dos se toman **al cierre de temporada**.
- **La versión del juego cubre el juego entero.** La huella de 30 splits no ve la segunda mitad de la carrera (un
  `rng()` extra desde los 26 años pasaba), y no incluía el puntaje (`porTitulo` ×2 pasaba la suite completa).
  `HUELLA_JUEGO` pasa a ser el hash de 40 seeds × **60 splits** con
  `seed:fin:splitCount:elo:total:nivel:leyenda`. La huella de `huella.js` (30 splits, T1) queda como estaba.
- **D76 se verifica contra el split real.** El check lento exige que cada título nuevo lleve el `career.liga` y
  el `career.tier` del split en que se ganó, y cada internacional el `career.liga` de ese momento. Antes alcanzaba
  con que fuera coherente consigo mismo, y anotar el título con la liga de la fila pasaba la suite. **El split se
  cuenta en el tier y la fila donde se juega** (después del mercado y del ascenso o descenso), no al arrancar: hoy
  el 2% de los splits se contaba en el otro tier y el split de firma de un agente libre no se contaba en ninguna
  fila.
- **Decisiones del worker que se aceptan y quedan escritas:**
  - `pesoRol` = 1 en los cinco roles. El desvío por rol de las seeds 1-400 se invierte con las 401-800 y con 800
    queda en ±3,7%: es muestra. La regla de "±10% de la mediana" se corrige: se compara la mediana **entre los
    que llegaron a pro** (la distribución completa es bimodal, con 23% de no-pros cerca de 0) y con ≥ 800 seeds.
  - Los títulos de tier 3 van con `liga: null` y valen con la fuerza media de tier 3.
  - El bono de "primero de tu generación" solo cuenta si entraste al Top 20.
  - La leyenda se elige por distancia euclídea sobre (años pro, títulos de primera, internacionales, rank), con
    penalización por otro rol; el perfil cuenta **solo títulos de tier 1**, igual que las leyendas.
  - En el desafío no se elige ni el handle: el handle entra en el ruido del Top 20.
- **`agencia.js` sigue midiendo contra `puntajeProvisorio`** hasta K3c. Ahí pasa a `puntajeDeCarrera` y su línea de
  base se vuelve a medir (T6).
- Además: el puntaje falla fuerte, con un error claro, ante una liga desconocida, un título sin tier o un potencial
  faltante (no da NaN en silencio). Ningún texto muestra ids crudos de liga. El detalle del potencial habla según
  hasta dónde llegaste. Las leyendas que calcaban a pros reales (una mid coreana de 15 años con tres Mundiales, un
  ADC longevo de NA) se reescriben, y se corrigen dos incoherencias (títulos de LCP de una figura histórica previa
  a 2025, una academia de "tres splits" en una carrera de 3 años). Se agregan checks para los mutantes que
  sobrevivían: empates en la generación, eje de rank de la leyenda, logros de tier 2 en la monotonía.

#### K1 — cierre de la segunda revisión *(supervisor, 2026-10-02)*

Dos revisores independientes, uno del motor (mutantes) y otro de la pantalla (navegador real, 375 px), dieron
"OK con observaciones". Todo lo que se arregla antes del merge:

- **Validación simétrica.** El `puntaje` de cada rival se valida igual que tu pico: un entero entre 0 y
  `BALANCE.topMundial.tamano`. Un NaN en un rival hoy cuenta como "no te superó".
- **Contadores enteros.** Los contadores enteros (`splitsEnTopMundial`, `cierresComoNumeroUno`) piden
  `Number.isInteger`.
- **Mensajes de error.** Los mensajes imprimen el valor con `String()`, para que un NaN no aparezca como "null".
- **Resultados de internacionales.** Un `resultado` de internacional fuera del conjunto conocido falla en vez de
  puntuar como participación.
- **Generación en una carrera sin fichar.** "Quedaste 2º de 6 en tu generación" no se dice como logro cuando el
  componente vale 0: el texto nombra a quien llegó más lejos y dice que vos no entraste al Top 20.
- **Potencial sin contrato.** El detalle del potencial no dice "cada cosa que lograste pesa un 7% más" cuando nunca
  jugaste un split con contrato.
- **Año de fin en la historia.** La fila de la historia de la ficha no deja un año de fin vacío (`2030–·`): el último
  equipo cierra en el año del retiro.
- **Techo de `dist/`.** Medido en 1799,81 KB contra un techo de 1800 KB, el mismo margen que se cerró en silencio
  dos veces. Se re-mide después de estos arreglos y se sube a **1900 KB** en su propio commit (regla 2), con el
  número medido en el comentario de `build.js`. El margen es para las pantallas que faltan en FASE K: la previa de
  K2d y las de K4/K5.
- **Huella en `huella.js`.** `calcularHuellaJuego` vive en `huella.js` junto a `calcularHuella`, que no se tocó: su
  hash de 30 splits es el mismo en b0b544b y en 360f237 (2128736563). Se acepta así.

### K2 — El nivel manda *(bloque A — estructura; los valores se fijan en K3c)*

- **Compañeros en vivo**: `core/fuerza.js` lee el nivel actual de `state.mundo.planteles` (la mitad
  de J1), con fallback al snapshot de `systems/roster.js` para tier 3 o tier 2 no modelada.
- **La temporada deja de ser una sola tirada**: la forma se sortea por fecha con un desvío chico, en
  vez de un `gauss` por split que decide las 7-9 fechas juntas.
- **Presupuesto de ruido en un solo lugar**: `ruidoEfectivo(state)` reemplaza los σ sueltos
  (`ruidoRendimiento`, `ruidoFecha`/`ruidoRivalFecha`, `ruidoMapa`/`ruidoRivalSerie`). Hoy el rival
  tiene casi el doble de ruido que vos (12 contra 7): se simetriza. K3 lo conecta a la mentalidad.
- **El meta empuja, no tira la moneda**: se acotan `multiplicadorDeMeta` y `factorDeCampeon`
  (propuesta: rango ~0,9-1,1, se mide).
- **Tu peso en el equipo** puede escalar con la jerarquía (la franquicia pesa más). Se decide midiendo.
- **Pantalla — la previa** (absorbe J-previa): antes de cada partido importante o serie, tu fuerza
  desglosada (vos / tus compañeros / el meta) contra la del rival, y **la probabilidad de ganar**. "Se
  ve que tu nivel decide."

Checks (rojos hoy): r(nivel relativo, posición) misma liga ≥ 0,5 · favorito con Δ ≈ 10 gana el Bo5
75-85% · por ablación, nivel más equipo explican ≥ 50% de la varianza · la previa declara la misma
probabilidad que usa el motor (regla 15, exacto).

#### K2 — lo que midió la investigación y la spec que sale de ahí *(supervisor, 2026-10-02)*

**La investigación** (solo lectura, copia aislada de `8e36105`, 400 seeds `criterio` × 60 splits, ligas modeladas;
sondas en el scratchpad de la sesión, `k2inv/`) respondió la pregunta abierta de §K.0b punto 1. **El 77% que el
nivel no explicaba no es azar: es una inflación de tu fuerza que los rivales no tienen.** Los multiplicadores que
afectan tu rendimiento (meta × campeón × sinergia × jerarquía) promedian **×1,30**, sobre todo el de campeón, que
vale 1,0 con maestría 50 cuando un pro anda en 85. Además, el rendimiento choca contra el tope de 100 en el 50% de
los splits. Con eso tu equipo queda +15,5 sobre la media de los rivales (el desvío entre ellos es 7,7) y, con el
ruido apagado, sale 1º en el **65%** de los splits: la posición se satura y ningún R² lineal puede subir. La
atribución exacta (Shapley sobre re-simulación completa) de lo que se gana al poner cada multiplicador en 1 es:
**campeón 57% · sinergia 28% · jerarquía 11% · meta 4%**. Con los cuatro en 1, el R² sin ruido pasa de 0,257 a
0,717. Otros hallazgos:
- **El instrumento de K0 subestima la meta en 0,04-0,19.** El 5,2% de sus filas son splits pro sin temporada que
  arrastran la posición del split anterior. Además lee el nivel después del split y los compañeros del snapshot,
  no los que usó el motor.
- **La "una sola tirada" pesa 4 pp de la varianza** (con ruido: nivel + equipo lineal 19%, fuerza determinista
  completa 54%, + la tirada del split 58%, ruido por fecha ~36-42%). La forma por fecha no mueve nada (r 0,375
  contra 0,369).
- **Bo5.** El 91,9% de K0 era analítico y omitía el Fearless. En el motor, el favorito con Δ≈10 ya gana **76,7%**,
  pero es asimétrico: medido por el Δ del mapa 1 (Δ1), el jugador favorito gana 67,5% y el rival favorito
  98,3%; por el Δ al empezar la serie (Δ0, la definición de las metas), 71,4% y 94,9% (K2a). La causa es que el Fearless
  degrada solo tu fuerza (−6,2 en el mapa 2, −10,1 en el 3, −12,9 en el 4: la amplitud de la maestría) y la del
  rival queda constante. Δ típico entre orgs de una liga tier 1: 1º−2º 5,4 · **1º−4º 11,8** · 1º−último ~25.
- **Compañeros**: en el 91% de los cambios de liga, el primer split en la org nueva se juega con los compañeros
  de la anterior (`roster` corre antes que `mercado` y el traspaso no limpia `career.companeros`). Fuera de eso,
  el snapshot se desvía del plantel vivo en −1,2 ± 6,7: leerlos en vivo es neutro en las métricas, pero corrige
  ese error.
- **Peso por jerarquía** (tu peso en el equipo escalando con tu estatus): **empeora** el R² (0,210) y el Bo5
  (65%). No se hace.
- **Simetrizar los σ sin cambiar el σ combinado no hace nada** (7/12 → 9,83/9,83: idéntico, como dice la
  matemática). Lo que importa es el σ combinado y separar el de la fecha del de la serie.
- **Candidato medido** (centrar los cuatro multiplicadores + meta 0,9-1,1 + maestría 0,1 + doble vuelta + σ de
  serie 12,5/12,5): R² sin ruido **0,502** con la definición corregida (0,530 fuera de muestra) · r **0,535**
  (0,580 corregida; 0,563 con fecha 7/7) · favorito de un Bo5 con Δ0≈10: **82,1% ± 2,9** (jugador 80,7 · rival
  84,4) · % de llegar a tier 1 sin cambio (78,3) · ≥ 1 título sin cambio (77,8), pero los títulos por carrera
  bajan de 6,54 a 4,38 · jerarquía media 71,7 → 55,9 · mentalidad ≥ 90: 87% → 71%. El bot `azar` pasa de r
  0,340 a 0,502.
- **Riesgos medidos sobre el candidato** (`validate.js`): 245 OK / 6 FAIL. (1) "El boost del pool no se clava en
  el centro (0,75-1,25)" falla por diseño al acotar el meta: necesita su línea de la regla 17. (2) "generarFixture
  produce un round-robin real" falla por diseño con la doble vuelta. (3) "Nadie te frena en el draft" da 0
  pausas: choca con K4, se re-basea en K4c. (4) Subir `VERSION`. (5) "Duración de la carrera ~ potencial (r >
  0,32)" da 0,30: banda, se re-basea en K3c. (6) "J3 pronóstico" (seed 1, split 11, Akali): resultó un falso positivo del check, no del motor (**D79**); se
  reescribe en K2a.
- **D78 (nuevo):** en 400 carreras de `criterio` hay **0 splits en LCK y en LPL**. El tier 1 se juega en CBLOL
  (5.734 splits), LCP (3.767), LCS (1.525) y LEC (345), salgas de la región que salgas, Corea incluida. Es un
  problema del mercado y de la región, no de K2: va a K5.

**Spec de K2 (bloque A).** Reemplaza las viñetas de §K2 donde las contradice. Va en tres commits, por la regla 2:

- **K2a — el instrumento, sin corrimiento (cero `rng`, solo `src/dev/`).** El observador de `simulate.js`
  registra, en el split donde corre la temporada, el nivel y los compañeros que usó el motor, y descarta los splits
  pro sin temporada. La r de la misma liga y el R² sin ruido se reportan con la **definición corregida** y, al
  lado, con la de K0 por continuidad. Los checks de K2 se escriben sobre la corregida. Huella idéntica. También
  reescribe el check "J3 pronóstico" como propiedad sin trayectoria (D79), que si no se pone en rojo en falso con
  cualquier corrimiento del bloque A.
- **K2b — estructura** (corre el stream: bloque A, T1 aceptado; las constantes nuevas arrancan en el valor que
  reproduce el comportamiento de hoy, para que el commit mida la estructura sola):
  1. **Centrar los multiplicadores de tu rendimiento.** Cada factor vale 1,0 en el valor típico de un pro, no en
     50: referencia de maestría en `factorDeCampeon`, de sinergia y de jerarquía, todas en `BALANCE` (hoy:
     maestría 50, peso 0,3). La **sinergia deja de contarse dos veces** (`rendimientoBase` y `fuerzaDelEquipo`):
     queda en un solo lugar. El tope de 100 del rendimiento no puede volver a saturar la fuerza de partido: se
     mide cuántos splits tocan el tope antes y después.
  2. **Compañeros en vivo**: `core/fuerza.js` lee el nivel actual de `state.mundo.planteles` en las ligas
     modeladas (fallback al snapshot de `systems/roster.js` en tier 3 y en las tier 2 no modeladas).
     `career.companeros` se refresca al cambiar de org en el mismo split (cierra el 91% de traspasos jugados con
     el plantel viejo), y `probCambioDeRoster` deja de inventar compañeros en las ligas modeladas.
  3. **El partido se decide con una tirada contra la probabilidad declarada.** Un solo módulo de ruido,
     `ruidoEfectivo(state, tipo)` con `tipo` = `'fecha'` o `'mapa'`, reemplaza los σ sueltos (`ruidoRendimiento`
     en la fuerza de partido, `ruidoFecha`/`ruidoRivalFecha`, `ruidoMapa`/`ruidoRivalSerie`). Su σ es el combinado
     y queda separado por tipo; K3 lo conecta a la mentalidad. `p = probabilidadDeGanar(F, f, σ)` y el resultado
     es `rng() < p`: **una tirada por partido o mapa** (hoy son cuatro), y lo que la previa muestra es
     exactamente lo que el motor usa (regla 15). La fuerza de partido **no lleva tirada por split** (la "una sola
     tirada" pesaba 4 pp): el azar del partido vive solo en p. No hay forma por fecha (medida: no mueve nada).
  4. **`BALANCE.temporada.vueltas`** (1 = hoy, 2 = doble vuelta; real en LCK) y el check de fixture
     generalizado a N vueltas. El valor se decide en K2c.
  5. **El tope del meta y de la maestría** quedan como están (`multiplicadorMin/Max`,
     `maestriaPesoEnRendimiento`); K2c los mueve.
  - **No se hace**: peso por jerarquía (medido, empeora) ni forma por fecha (medida, neutra). El Fearless que solo
    te degrada a vos (la asimetría del Bo5) se achica con la amplitud de la maestría en K2c y se resuelve de raíz
    en K4, con el plan de Fearless (el rival también quema).
- **K2c — solo constantes, valores iniciales del candidato medido** (K3c los recalibra con todo el bloque A):
  referencias centradas en la media de un pro (los factores medios: meta 0,983 · campeón 1,075 · sinergia
  1,050/1,025 · jerarquía 1,051), meta 0,9-1,1, peso de maestría 0,1, σ de mapa simétrico con combinado ~18
  (12,5/12,5), σ de fecha y vueltas según lo que dé r ≥ 0,5 con la definición corregida. **"Favorito claro" = Δ
  de fuerza ≈ 10 al empezar la serie (≈ 1º contra 4º de una liga, 11,8)**, medido **en el motor**, de los dos
  lados, no con la tabla analítica. Cada check de banda que se rompa lleva su línea de la regla 17;
  `CONCEPTO` §6 se reescribe si el meta se acota.

  **Cómo se hace K2c** *(supervisor, 2026-10-02)*. Son dos pasos, para que ningún worker quede esperando corridas
  largas.

  **(1) Un worker** hace tres cosas:
  - Mide en el motor integrado (K1 + K2b) las medias de los cuatro factores, en splits pro con `criterio`. La
    sinergia ahora se cuenta una sola vez, con peso 0,27 en `fuerzaDelEquipo`, así que su referencia se re-deriva:
    no se copia el 1,050/1,025 de la investigación.
  - Fija las constantes que no dependen del barrido: referencias centradas, meta 0,9-1,1, peso de maestría 0,1, σ
    de mapa con combinado ~18.
  - Deja un script de barrido que aplica overrides de `BALANCE` en memoria y reporta, para cada combinación, el
    mismo bloque `nivel` de `simulate.js`.

  **(2) El supervisor** corre el barrido en background con el bot `criterio`, 400 seeds × 60 splits. La grilla es
  σ de fecha × `vueltas` ∈ {1, 2}. El criterio de elección, en orden:
  1. r misma liga corregida ≥ 0,5;
  2. favorito con Δ0≈10 en el Bo5 lo más cerca posible de 75-85% de los dos lados;
  3. a igualdad, `vueltas` 2 (es lo real en LCK);
  4. a igualdad, el σ de fecha más cercano al de hoy.

  Los títulos por carrera y la jerarquía media **no** entran en la elección: son bandas del bloque A y van a
  `bandasPendientes.js` hasta K3c. Lo que se rompe por diseño se anota con su línea de la regla 17, no como
  PENDIENTE: el boost del pool fuera de 0,75-1,25 al acotar el meta. Un segundo worker fija los valores elegidos y
  registra esas líneas. `VERSION_JUEGO` pasa a 'K2c' y `HUELLA_JUEGO` se recalcula. Constantes solas no cambian la
  forma del guardado.

  **Paso (1), hecho** (`3c5f359`). Las medias de los factores se midieron con `criterio`, 200 × 60, splits pro
  con temporada:

  | | M | C | J | S | producto | splits en el tope de 100 |
  |---|---|---|---|---|---|---|
  | antes | 0,958 | 1,216 | 1,052 | 1,014 | 1,251 | 43% |
  | después | 0,984 | 1,003 | 1,013 | 1,002 | 1,005 | 7% |

  Las referencias quedaron así:
  - maestría 85: centra el factor de campeón entero, afinidad incluida, por eso no es la maestría media de 82,9;
  - jerarquía 60, sinergia 55;
  - meta 0,9-1,1, peso de maestría 0,1, `sigmaMapa` 14,2 → 17,7 (√(12,5² + 12,5²)).

  La meta no tiene clave de referencia: queda en 0,984 sin tocar el motor y se acepta así.

  **Paso (2), el barrido** (supervisor, `criterio` 400 × 60, sobre `3c5f359`, 0 crashes). Las columnas son r misma
  liga corregida, R² sin ruido corregido, y el Bo5 con Δ0≈10 para el jugador favorito y para el rival favorito:

  | vueltas | σ fecha | r | R² | jugador | rival |
  |---|---|---|---|---|---|
  | 1 | 10 | 0,573 | 0,539 | 79,7 | 90,2 |
  | 1 | 13,9 | 0,524 | 0,539 | 81,1 | 94,4 |
  | 1 | 17 | 0,495 | 0,539 | 82,4 | 87,5 |
  | 1 | 20 | 0,477 | 0,539 | 80,0 | 92,3 |
  | 2 | 10 | 0,600 | 0,549 | 80,0 | 89,3 |
  | 2 | 13,9 | 0,582 | 0,549 | 81,0 | 88,4 |
  | 2 | 17 | 0,568 | 0,549 | 78,4 | 85,9 |
  | 2 | 20 | 0,525 | 0,549 | 81,3 | 89,0 |

  El error estándar del Bo5 es ±1,8-2,2, y el σ de fecha no mueve el Bo5 de forma sistemática: es σ de mapa; lo
  único que cambia es qué cruces se dan. Las diferencias del criterio 2 entre σ de fecha, con la misma `vueltas`,
  están dentro del ruido, así que deciden los criterios 3 y 4.

  **Elegido: `vueltas` 2 y σ de fecha 13,9 (sin cambio).** Da r 0,582 · R² 0,549 · Bo5 jugador 81,0 ± 1,8, rival
  88,4 ± 2,0, juntos 83,5 · títulos por carrera 5,10 · 78% llega a tier 1. El rival favorito sigue por encima de
  85: es la asimetría del Fearless, que se resuelve en K4, como ya estaba escrito.

  **Lo que rompe K2c** (corrida completa del supervisor, `3c5f359` + `vueltas` 2: 284 OK / 5 FAIL). Qué se hace
  con cada uno:
  - **La huella del juego cambió** (esperado). `VERSION_JUEGO` pasa a 'K2c' y `HUELLA_JUEGO` se recalcula.
  - **`proyeccionJerarquia` volvió a su banda.** Con las referencias centradas, la jerarquía ya no crece de más en
    el primer split. Se borra su entrada de `bandasPendientes.js`.
  - **"El boost del pool no se clava en el centro (0,75-1,25)" se rompe por diseño.** Mide p10 0,944 y p90 1,026:
    una separación de 0,082 contra un mínimo de 0,2 que suponía el rango viejo. Va con su línea de la regla 17.
    La separación mínima pasa a ser la misma fracción del rango que antes (0,2 / 0,5 = 40%), calculada desde
    `BALANCE.campeones.multiplicadorMin/Max` y no escrita a mano: hoy da 0,08. `CONCEPTO` §6 se reescribe con el
    meta acotado.
  - **"Nadie te frena en el draft por un pick que no mueve el partido" da 0 pausas en 4000 sondas.** Con el meta
    en 0,9-1,1 y la maestría en 0,1, ningún pick mueve la p lo suficiente para el umbral de pausa del draft. Es una
    banda, la de cuánto te frena el draft, y la sacó un cambio del bloque A: entra en `bandasPendientes.js`
    (bloque A, re-basea K3c). **K3c tiene que re-fijar el umbral de pausa del draft contra la dispersión nueva de
    la p**, para que elegir campeón vuelva a frenarte cuando importa. K4 decide el ritmo del resto.
  - **"K2a Bo5 del motor" queda vacío**: 0 filas `draftDelPrimerMapa`, porque sin pausas de draft no hay log de
    draft. No es una banda: es un check que dependía de que el draft pausara. Se reescribe para que no dependa de
    la frecuencia de pausas: la fuerza al arrancar la serie se compara con una fuente que existe siempre, o se
    fuerza la pausa en la sonda.

- **K2d — la previa (pantalla).** Antes de la fecha marcada y antes de cada mapa de serie, tu fuerza desglosada
  (vos / tus compañeros / el meta / el campeón) contra la del rival, y **la probabilidad de ganar**, la misma p
  que el motor tira. La probabilidad de la serie completa espera a K4 (depende del plan de Fearless).

  **K2d — decisiones de spec** *(supervisor, 2026-10-02)*.
  - **Una sola fuente.** Un selector puro en `src/core/` arma la previa, sin `rng` y sin mutar el estado:
    `previaDePartido(state, …)`, que devuelve el desglose y la p. El motor obtiene la p **llamando a esa misma
    función**, o a la misma función interna que ella. Lo que la pantalla muestra y lo que el motor tira no pueden
    divergir por construcción: la previa no lleva una segunda copia de la fórmula.
  - **El desglose.** Tu lado muestra vos / tus compañeros / el meta / el campeón y el total que usa el motor. El
    rival muestra su fuerza total, y su desglose solo si el motor lo tiene; no se inventan componentes que el motor
    no calcula. La p va en porcentaje entero.
  - **Antes de un mapa de serie**, la previa muestra la p **antes** del minijuego y dice en una línea que el
    minijuego la mueve. Después del minijuego, la pantalla del mapa muestra la p final, que es la que se tira (ver
    la nota de K2b).
  - **Antes de una fecha marcada**, en la pausa que el juego ya hace por la fecha, la p de la fecha incluye
    `ajustePartido` si se conoce antes de tirar. Si depende de una decisión de esa misma pausa, se muestra la p
    antes de decidir, y la de después junto al resultado.
  - **La previa solo muestra.** No agrega pausas nuevas ni `rng`: la huella del juego no cambia. Es una tarjeta
    compacta, una cosa por vez en pantalla, legible a 375 px. `dist/` tiene que quedar por debajo del techo de
    1900 KB.
  - **Checks.**
    1. La p de la previa es exactamente la que tira el motor (`===`), en fechas y en mapas, con el minijuego
       neutro. Se prueba sobre los partidos reales de carreras simuladas, no con un caso armado a mano.
    2. La p final mostrada en el mapa es la tirada.
    3. El desglose reproduce el total de la fuerza que usa el motor.
    4. La previa no toca el estado ni llama a `rng`.
    5. La huella es idéntica.
    6. Ningún texto muestra ids crudos.
  - **Tal como quedó** *(dos revisiones independientes: motor y navegador real, 2026-10-02)*.
    - **Mapas sin pausa.** Un mapa que se juega sin pausa (pick automático, sin minijuego) **no muestra la previa
      en vivo**, porque la previa no agrega pausas. Su p aparece en la línea del feed: "Salieron con N% de ganar".
      Se acepta así; K4 decide cuándo te frena el juego.
    - **Medido en el navegador.** La p de la pausa de fecha coincide con el `pSinMomento` del log 29 de 29 veces.
      La p mostrada después del minijuego es la tirada 22 de 22 veces.
    - **Arreglos de la revisión.** La p de cada opción del draft de fecha ahora se compara contra la tirada: un
      mutante que la ignoraba pasaba. El umbral de pausa del draft de fecha usa el mismo campeón que la tirada. La
      cuenta del minijuego vive en un solo lugar. La p final también se muestra en el resultado del minijuego. Los
      nombres no se cortan a 375 px.

- **K2a, tal como quedó** *(revisión independiente, 2026-10-02)*. Se aceptan dos desvíos de la viñeta de arriba:
  (1) además de `src/dev/`, K2a **expone** datos del motor sin cambiar ningún cálculo (`career.temporada.nivelJugador`
  y `nivelCompaneros`, `serie.fuerzaInicial`, y `formato`/`fuerzaInicial`/`fuerzaRival` en el log de cierre de
  cada serie); verificado sin movimiento en 1.506 carreras (estado, `rng` por split y logs idénticos). Sube
  `VERSION` y descarta los guardados en curso: aceptable antes de publicar. (2) "El tercer sesgo" de la
  investigación (compañeros del snapshot) mide cero dentro del split: la r corregida sale de descartar los splits
  sin temporada y de leer el nivel del arranque. Medido: r misma liga 0,398 (K0: 0,369) · R² sin ruido en ligas
  modeladas 0,257 (K0: 0,233) · Bo5 con |Δ0| en [9, 11): jugador favorito 71,4%, rival favorito 94,9%, juntos
  76,7%. **Cuando `nivel.metasK2` pase de reporte a check, se fija el bot `criterio`**: `malas` ya da r 0,51 (con
  pocas decisiones buenas, el nivel relativo varía más y la r sube por eso, no porque el nivel mande).
- **`VERSION` de guardado entre ramas paralelas**: la rama que se mergea segunda toma el siguiente número libre
  (max + 1), recalcula el hash de la forma sobre el árbol mergeado y deja el número de la primera; un número nunca
  tiene dos formas.
- **K2b, tal como quedó** *(revisión independiente, 2026-10-02: "OK con observaciones")*. La estructura cumple los
  puntos 1-5. Las constantes nuevas (referencias 50, sinergia 0,27 en `fuerzaDelEquipo`, σ fecha 13,9 / mapa 14,2,
  `base + 7·z`, `vueltas` 1) reproducen el comportamiento de antes, así que respetan la regla 2. El revisor
  re-midió los números del worker y coinciden: r 0,398 → 0,407, R² 0,257 → ~0,31, Bo5 Δ0 jugador favorito
  71,4 → 62,8 y rival favorito 94,9 → 96,7. La caída del favorito no esconde un bug: el contrafáctico con la
  sinergia devuelta a tu rendimiento da 68,1. Unos 5 pp vienen de haber sacado la sinergia de tu rendimiento
  (menos margen bajo el tope); el resto es ruido.

  Se arregla antes del merge:
  1. **Estado inicial completo (T4).** `career.temporada` nace con `rendimientoBase` y `resultadosPropios`.
  2. **Sinergia en un traspaso.** El split del traspaso juega con el plantel nuevo **y** con la sinergia del
     plantel nuevo. La sinergia se resetea al firmar, con la misma regla que `armarRoster` (regla 15: la previa va
     a mostrar a esos compañeros).
  3. **Checks para los mutantes que sobrevivían.**
     - Una fecha de lesión no cuenta en `resultadosPropios`. Va con un caso sintético, porque en carreras reales
       pasa en 7 de 13.759 temporadas.
     - La p del draft (`probabilidadConCampeon`) es exactamente la p que tira el mapa.
     - `ruidoEfectivo` por tipo coincide con `BALANCE.partido`.
     - `rendimientoBase` no depende de `career.sinergia`.
  4. **Código muerto.** `probabilidadDeGanar` (`core/numeros.js`) quedó muerto en el motor: se borra y su check
     se porta a `probabilidadDePartido`.
  5. **La PENDIENTE de `proyeccionJerarquia` tiene causa aislada.** Al sacar la sinergia de tu rendimiento, éste
     sube justo en el primer split en una org nueva, donde la sinergia es mínima. La jerarquía crece más de lo
     que proyecta `derivaPrimerSplit`. Se re-basea en K3c, como ya estaba anotado. La entrada de
     `bandasPendientes.js` lleva esa causa y el valor re-medido después del arreglo 2.

  Se anota para después:
  - **K2d.** El minijuego de la serie (`systems/serie.js`, `gauss`) y el `ajustePartido` de la fecha mueven la p
    **después** del draft. La previa muestra la p **antes** del minijuego y dice que el minijuego la mueve; la
    pantalla del mapa muestra la p final. El check de K2d: la p de la previa es exactamente la que tira el motor
    cuando el minijuego aporta 0, y la p final mostrada es exactamente la tirada.
  - **K3c.** La z de tu rendimiento se mide contra la p **con** draft, así que un buen draft sube Σp y baja el
    crédito por las mismas victorias. Se mide en K3c, comparando el hype entre los bots `criterio` y `azar`. Si
    draftear bien castiga el hype, la z pasa a medirse contra la p antes del draft. Es solo una constante y una
    elección de lectura; la estructura no cambia.

**Checks de K2** (rojos hoy; las bandas finales se fijan en K3c): r(nivel relativo, posición) en la misma liga ≥
0,5 y R² sin ruido ≥ 0,5, los dos con la definición corregida · favorito con Δ≈10 gana el Bo5 75-85%, medido en
el motor y por lado · la p de la previa es la p que el motor tira (exacto, regla 15) · un traspaso juega su primer
split con el plantel nuevo · una tirada de `rng` por partido y por mapa · `ruidoEfectivo` es el único lugar que
lee σ de partido (estático).

### K3 — Tus decisiones construyen tu nivel *(bloque A — estructura)*

- **La mentalidad es lo que hace que tu nivel se note**: gobierna la consistencia. Con la cabeza
  bien, jugás a tu nivel; tilteado, el resultado se vuelve moneda (el σ de `ruidoEfectivo` crece al
  bajar la mentalidad). Es "el precio de todo" (`CONCEPTO` §7) cerrado de punta a punta y atado a la
  queja del azar. Para que valga, **tiene que poder bajar**: costos reales por exigirte, retorno a
  una base, y que el descanso no la llene gratis.
- **Hype que no se satura**: decae hacia una base que fijan tus resultados y tu visibilidad. Mueve
  ofertas, sueldo y presión.
- **Efectos que duran** (J2): `player.bonusPermanente` (completo con ceros, T4). Las curvas de edad
  convergen a `objetivo + bonus`, así el bootcamp o la decisión grande dejan marca; hoy la vida media
  sobre mecánica es de 1,9 splits.
- Pantalla: la ficha cuenta lo que construiste ("▲ +3 mecánica — bootcamp 2028") y la barra de
  mentalidad se lee como **consistencia**.

Checks: mentalidad en pro con mediana 45-75 y < 20% de splits ≥ 90 · hype ≥ 90 en < 25% de los
splits pro · un efecto sobre stat de curva conserva ≥ 40% a 4 splits · con mentalidad 20 contra 80,
el desvío del resultado del mapa difiere de forma medible (con la cabeza mal, más varianza).

#### K3 — decisiones de spec *(supervisor, 2026-10-03; sin preguntas, revisables)*

**El patrón es el de K2.** K3 es **estructura con las constantes nuevas en el valor que reproduce el juego de
hoy**: la huella del juego queda **idéntica**, y eso prueba que el commit es solo estructura. Los valores los fija
K3c con todo el bloque A medido junto. Los checks de K3 se escriben como **reporte** en `simulate.js` (bloque
`metasK3`, con la meta al lado, igual que `metasK2`) y pasan a checks duros en K3c.

Va en dos piezas paralelas, cada una en su worktree.

- **K3-A — las barras que no se saturan** (motor).
  1. **La mentalidad gobierna la consistencia.** `ruidoEfectivo(state, tipo)` multiplica su σ por
     `g(m) = 1 + k·(mRef − m)/100`, acotado a `[gMin, gMax]`. Las constantes van en `BALANCE`: `k` arranca en 0
     (neutro), `mRef` en la mediana pro que pide la meta (60). Sigue siendo el único lugar que lee σ.
  2. **La mentalidad vuelve a una base.** Cada split, `m ← m + r·(base − m)`. `r` arranca en 0 y `base` es una
     constante; si el motor ya tiene un rasgo de personalidad que la module, se lee de ahí y no se inventa uno.
  3. **El descanso no la llena gratis.** Toda recuperación por descanso u offseason queda topeada en
     `topeDescanso` (que arranca en 100, neutro). K3c lo baja a la base. Los costos por exigirte son los que el
     contenido ya trae (rangos negativos de mentalidad en eventos y rutinas). Con la vuelta a la base y el tope,
     esos costos empiezan a pesar, sin escribir contenido nuevo.
  4. **El hype decae hacia una base.** `h ← h + rH·(baseH − h)`, con
     `baseH = h0 + a·(resultados) + b·(visibilidad)`. Resultados es la z de tu rendimiento de la temporada (K2b).
     Visibilidad sale de lo que el motor ya tiene: el prestigio de la liga y si jugaste un internacional. `rH`
     arranca en 0. Los consumidores de hype (ofertas, sueldo, presión) no se tocan.
- **K3-B — los efectos que duran y la pantalla.**
  1. **`player.bonusPermanente`.** Un campo por cada stat de curva, completo con ceros desde el estado inicial
     (T4). Las curvas de edad convergen a `objetivo + bonus`.
  2. **Qué se vuelve permanente.** Una fracción `fraccionPermanente` de cada efecto de evento o decisión sobre un
     stat de curva va a `bonusPermanente`. Es una regla global, sin marcar contenido a mano. Arranca en 0 (neutro)
     y K3c la fija para que un efecto conserve ≥ 40% a 4 splits.
  2b. *(2026-10-03, después de K3-B)* **La práctica y las rutinas también dejan marca.** El bootcamp del ejemplo
     vive en las rutinas de offseason (`data/rutinas/`) y el entrenamiento semanal en `systems/practica.js`, no en
     los eventos. Las dos son decisiones del jugador, y son el corazón de "tus decisiones construyen tu nivel".
     Llevan su propia fracción, `fraccionPermanentePractica`, que arranca en 0 (neutra), porque su volumen es muy
     distinto al de un evento. K3c calibra las dos fracciones. La marca de práctica tiene como origen el nombre
     visible de la rutina o del foco de entrenamiento, y en la ficha se agrupa por año.
  3. **Cada marca queda en el registro.** Va a `registro.marcas`, que solo crece (regla 14), como
     `{ stat, delta, origen, anio }`. `origen` es el nombre visible del evento o de la decisión.
  4. **La ficha.** Muestra "Lo que construiste" (▲ +3 mecánica — bootcamp 2028), solo con las marcas cuyo bonus
     acumulado redondea a ≥ 1. La barra de mentalidad se rotula **Consistencia**. En el bloque abierto eso promete
     algo que `k = 0` todavía no hace: se acepta porque no se publica en medio de un bloque, y K3c cierra la
     promesa con su check duro (regla 15).
- **K3, tal como quedó y lo que se decide al integrar** *(2026-10-03)*.
  - **La previa con `k ≠ 0`.** K3-A midió que, con `k ≠ 0`, el momento de una fecha marcada cambia la mentalidad
    entre la previa y la tirada, y la previa deja de ser la p tirada. Se decide así:
    - **Cuenta la mentalidad de después del momento.** Decidir tiene consecuencias reales.
    - **La previa muestra la p antes de decidir.** El motor **guarda esa p en la pausa**, y el log la reporta como
      `pSinMomento`.
    - **La p final es la tirada.** Incluye todo lo que movió la decisión (`ajustePartido` y mentalidad) y se
      muestra con el resultado ("el momento la movió desde X%"). Es el mismo patrón que K2d ya usa para el
      `ajustePartido`.
    - **Los checks de K2d pasan también con `consistencia.k = 1`**, probado en memoria. Una pieza neutra no puede
      esconder un check que se rompe con el valor real.
  - **El log dice lo que pasó.** La línea "mentalidad +N" del descanso muestra la ganancia real, ya con el tope,
    no la nominal. Los logs no entran en la huella.
  - **La revisión independiente de K3** *("Requiere corrección", 2026-10-03)*.
    - **El motor está bien con las perillas encendidas.** Se probó con k=1, r=0,3, tope 60, rH=0,3 y fracciones
      0,3: 0 crashes, 0 NaN, 0 ids crudos, y la previa sigue siendo la tirada con k=1. En 578 pausas la p
      guardada coincide, y la pausa sobrevive a guardar y cargar byte a byte.
    - **Lo que falla son checks que solo pasan con las constantes neutras.** Una pieza neutra no puede esconder
      eso, así que se arregla antes del merge. Los checks estructurales de K3, y el de σ de K2b, pasan también con
      las perillas encendidas: o fijan en memoria lo que necesitan, o comparan contra la fórmula con la perilla
      incluida.
    - **La forma del guardado incluye una marca.** `FORMAS_CONOCIDAS[7]` se re-registra con un estado que trae al
      menos una marca, para que K3c pueda subir las fracciones sin tocar `VERSION` (K3c es solo constantes).
    - **Un solo nombre en pantalla.** Las líneas generadas que muestran el delta de la barra dicen
      **Consistencia**, no "Mentalidad".
    - **Las rutinas amateur también dejan marca** (`amateur.js`, por ejemplo `bootcamp_casero`), igual que las de
      offseason.
    - **Los logs de práctica muestran la ganancia real**, ya con el clamp y el techo de lesión.
    - **Un solo aplicador de stats.** El aplicador de stats del minijuego (`serie.js`, `aplicarStatsDeMinijuego`)
      pasa por el mismo helper de permanencia que los eventos.
    - **Los checks de fixture que dependen de una seed fija** (el D75 de K1 con su seed, el de la p del draft
      sobre el tope de K2b) buscan sus casos en un rango de seeds y fallan solo si no encuentran ninguno. Así no
      se vacían cuando K3c cambie las carreras.
  - **Para K3c.**
    - Las opciones de los eventos que suben la mentalidad **no** se topean: son decisiones con su costo, no
      descanso.
    - Pista de la revisión, con las perillas encendidas (60 × 40, `criterio`):

      | Meta | Medido | Meta pedida |
      |---|---|---|
      | Mentalidad pro, mediana | 64,5 | 45-75 ✓ |
      | Splits con mentalidad ≥ 90 | 0,1% | ✓ |
      | Splits con hype ≥ 90 | 28,9% | < 25%: rH 0,3 no alcanza |
      | Sorpresas, mentalidad 20 contra 80 | +8,2 pp | ✓ |
      | Retención a 4 splits | 0,317 | ≥ 0,4: la fracción ronda 0,4 |
    - Al calibrar `hypeRetornoBase`, K3c decide si el decaimiento fijo `hypeDecaimiento` pasa a 0.
- **Para las dos piezas.**
  - Sin `rng` nuevo.
  - **Huella idéntica**: `node src/dev/huella.js --contra=` y el check "K1 versión".
  - Si cambia la forma del guardado, sube `VERSION`: la rama que se mergea segunda toma max + 1.
  - Mutantes rojos primero, con los mismos checks estructurales de siempre:
    - `ruidoEfectivo` sigue siendo el único lector de σ;
    - `g(mRef) = 1`;
    - el descanso no supera el tope;
    - `bonusPermanente` completo;
    - `registro.marcas` solo crece.
- **`metasK3` reporta:**
  - la mediana de mentalidad pro y el % de splits ≥ 90;
  - el % de splits pro con hype ≥ 90;
  - cuánto conserva un efecto a 4 splits (sonda que aplica un delta conocido y lo sigue);
  - el desvío del resultado de mapa con mentalidad 20 contra 80, a fuerza igual.

### K3c — Calibrar bloque A *(solo constantes)*

Re-medición completa (T6) de K0 y de los ~200 checks. Se fijan los valores de ruido, meta, peso y
economía contra §K.3a y §K.3c. `simulate.js 1500 60 todas`.

#### K3c — cómo se hace *(supervisor, 2026-10-03)*

Mismo patrón que K2c: ningún worker espera corridas largas.

**Qué entra.** Lo de §K.3a y §K.3c que vive en el bloque A. Las interrupciones, los minijuegos y el tiempo son de
K4c; el Mundial y el embudo, de K5c. Las perillas y sus metas:

| Perilla | Meta |
|---|---|
| k (consistencia) | la brecha de sorpresas entre mentalidad 20 y 80 se mide y es clara (≥ 2 pp) |
| r, base y `topeDescanso` (mentalidad) | mediana pro 45-75 · < 20% de splits ≥ 90 |
| rH, h0, a, b y `hypeDecaimiento` (hype) | < 25% de splits pro con hype ≥ 90 |
| `fraccionPermanente` y `fraccionPermanentePractica` | un efecto conserva ≥ 40% a 4 splits |
| umbral de pausa del draft (la PENDIENTE de K2c) | el draft vuelve a frenarte cuando un pick mueve la p de verdad |

El umbral del draft se re-deriva contra la dispersión nueva de la p, con la misma frecuencia de pausa que tenía
antes de K2c en la sonda de su check. K4 rediseña igual el draft (plan de Fearless).

**Paso 1 — un worker:**
- Escribe un script de barrido, como `k2c/barrido.mjs`, que aplica overrides de esas perillas en memoria y
  reporta `metasK2` y `metasK3` con `criterio`.
- Re-deriva el umbral del draft con una sonda.
- Pasa `agencia.js` a medir contra `puntajeDeCarrera` (T6).
- Mide la duda de la z: con la z medida contra la p con draft, ¿draftear bien castiga el hype? Se compara el hype
  de `criterio` contra el de `azar`.

**Paso 2 — el supervisor** corre los barridos en background y elige. El criterio: cumplir cada meta con el
valor más cercano a neutro. Si la z castiga el buen draft, se pasa a la p antes del draft.

**Paso 3 — un worker:**
- Fija los valores elegidos.
- `metasK2` y `metasK3` pasan a **checks duros** con `criterio`.
- Re-mide los cuantiles del percentil del puntaje (K1); los cortes de nivel son por hechos, no se tocan.
- Vacía `bandasPendientes.js` del bloque A y marca `BLOQUES_DE_CORRIMIENTO.A.cerrado = true`.
- `HUELLA_JUEGO` 'K3c'.
- Lo que se rompe por diseño lleva su línea de la regla 17.

**Paso 1, hecho** (`e2e84b4`). Tres resultados:
- **El umbral del draft.** Está en unidades de p (P(mejor) − P(segundo)). Antes de K2c la sonda de su check daba
  152 pausas sobre 4000, todas en mapas decisivos, y hoy da 0.
- **La z.** Medirla contra la p con draft **no** castiga el buen draft: la z de `criterio` y la de `azar` quedan
  cerca de 0 (−0,044 y +0,011), con el mismo Δp de draft por fecha (0,028). Pasarla a la p antes del draft solo
  sumaría +0,013 a todos. **Se queda como está.**
- **`agencia.js`.** Ahora mide contra `puntajeDeCarrera`.

**Paso 2, el barrido** (supervisor, `criterio` 200 × 60, 26 corridas variando una perilla por vez; refinado
después a 600 seeds; 0 crashes en todas). Lo elegido:

| Perilla | Antes | Elegido | Resultado / por qué |
|---|---|---|---|
| `consistencia.k` | 0 | **0,5** | brecha de sorpresas 4,3 pp |
| `atributos.mentalidadRetornoBase` | 0 | **0,2** | mediana pro 72, 2,3% de splits ≥ 90 |
| `atributos.topeDescanso` | 100 | **70** | (va con la de arriba) |
| `rendimiento.hypeRetornoBase` | 0 | **0,6** | hype ≥ 90 en el 20-22% de los splits pro |
| `rendimiento.hypeDecaimiento` | 1,2 | 1,2, sin cambio | ver abajo |
| `serie.puntosEnJuegoParaPreguntar` (normal) | 0,26 | **0,0818** | 152 pausas, las mismas que antes de K2c |
| `serie.puntosEnJuegoParaPreguntarDecisivo` | 0,13 | **0,0409** | (va con la de arriba) |

- **k = 0,25 cumplía en el borde** (brecha 2,2 pp). La meta pide una brecha *clara*, y un check duro en el borde
  es frágil, así que se eligió 0,5.
- **El hype.** Con `rH` 0,5 daba 27% y con 0,7, 15,8%. El decaimiento fijo no hace falta tocarlo.
- **El umbral del draft** se re-escaló por el mismo factor (0,3145) que se achicó la dispersión de la p, y
  mantiene la proporción 2:1 entre normal y decisivo.
- **Con todo esto, las metas de K2 siguen en pie:** r misma liga ~0,60, R² sin ruido ~0,52, Bo5 favorito ~82.
  Los títulos por carrera y la llegada a tier 1 casi no se mueven con las fracciones de permanencia: la práctica
  que deja marca no infla el juego.
- **La sonda de retención no sirve como está.** Con la fracción en 0,3, 0,4 y 0,5 dio 0,424, 0,286 y 0,475: no
  es monótona, y no mejora al pasar de 200 a 600 seeds, porque su muestra es fija (~39 casos). El paso 3 la
  agranda (≥ 400 casos) y verifica que crezca con la fracción. Si no crece, es un bug y se arregla antes de
  calibrar. Después se elige la fracción más chica de {0,3, 0,4, 0,5} que conserve ≥ 0,4. Es la misma para
  eventos y para práctica: una regla sola, y la práctica no infla.

**Lo que rompen los valores elegidos** (corrida completa del supervisor con esos valores sobre `e2e84b4`, con
fracción provisoria 0,4: 305 OK / 7 FAIL).

**1. Dos FAIL con la misma causa, y es de diseño:**
- **"K0 los bots separan".** Con `malas`, la brecha contra `azar` en "no llega a pro" cae de ≥ 10 pp a 8 pp
  (29,5% contra 21,5%).
- **"El burnout no llega sin aviso".** Queda sin muestra: 1 burnout en 1000 carreras.

La vuelta a la base es simétrica: también **sube** gratis una mentalidad hundida. Eso perdona las malas decisiones
y borra el burnout, contra K.2 punto 2 ("tus decisiones construyen tu nivel") y contra la spec de K3 ("costos
reales por exigirte"). **Se decide:**
- **La vuelta a la base es asimétrica.** `mentalidadRetornoBase` baja una mentalidad saturada hacia la base, y
  `mentalidadRetornoBaseSubida` (nueva) la sube desde abajo, más lento o nada. Desde abajo se sube descansando
  (topeado) o decidiendo.
- **Va en dos commits** (regla 2). La estructura sale primero, con la subida igual a la bajada: comportamiento
  idéntico al actual. Después las constantes.
- **El valor de la subida** se elige midiendo `malas`, `azar` y `criterio`: la brecha de "no llega a pro" tiene
  que volver a ≥ 10 pp, el burnout tiene que existir con `malas`, y las metas de mentalidad se tienen que
  sostener con `criterio`.
- **Los dos checks no se re-basean**, porque son la agencia que FASE K vino a construir. A lo sumo, el del burnout
  muestrea `malas`, que es donde el burnout tiene que aparecer.

**La subida medida** (estructura en `49e1bc6`, comportamiento idéntico). Lote de "K0 los bots separan", 200 × 60;
burnouts cada 1000 carreras:

| subida | brecha malas−azar en "no llega a pro" | burnouts criterio / azar / malas | mentalidad de criterio (mediana / % ≥ 90) |
|---|---|---|---|
| 0,2 (simétrica) | 8,5 pp | 0 / 0 / 170 | 72,6 / 2,7% |
| 0,1 | 12,5 pp | 0 / 10 / 355 | 72,3 / 2,7% |
| **0,05** | **16,5 pp** | 0 / 25 / 430 | 72,3 / 2,6% |
| 0 | 24,5 pp | 5 / 50 / 595 | 72,0 / 2,8% |
| neutro (K3) | 22,5 pp | 0 / 40 / 565 | 97,8 / 77,7% |

**Elegido: `mentalidadRetornoBaseSubida` = 0,05.**
- Cumple todo con margen: la brecha queda 6,5 pp sobre el mínimo, el burnout vuelve con `malas` y no aparece con
  `criterio`, y las metas de mentalidad se sostienen.
- El check del burnout tendría ~39 casos en sus 3000 seeds, contra 20 pedidos, así que no hay que cambiarlo.
- 0,1 cumplía en el borde y 0 se pasaba de duro.

**El Bo5 con los valores finales** (400 × 60). El favorito claro gana el 87,3% en conjunto. El lado del jugador
favorito da 83,8%, dentro de 75-85; el del rival favorito, 93,9%.
- **Por qué el rival se va de banda.** Es la asimetría del Fearless (solo te degrada a vos), que ya estaba asignada
  a K4.
- **Se decide así:** el check duro del bloque A mide **el lado del jugador**, que es lo que el bloque A controla
  (tu nivel → tu resultado). El check del conjunto ∈ [75, 85] existe con su nombre y entra en
  `bandasPendientes.js` como **bloque B** (re-basea K4c), porque lo resuelve el plan de Fearless de K4.

**2. Fuera del bloque A — "≥ 28% de series sin ningún draft" da 27%.** El umbral re-fijado devolvió las pausas de
draft. Es ritmo, y K4 rediseña el draft entero (plan de Fearless), así que entra en `bandasPendientes.js` como
**bloque B** (re-basea K4c), con `commit` K3c y el porqué. Es el único caso de una entrada que saca de banda un
check de otro bloque, y queda escrito acá.

**3. "El mundo NPC envejece" depende de la trayectoria de una carrera:** 22,1 → 22,4 en 30 splits. Igual que los
checks de fixture de K3, pasa a promediar varias seeds o a medir el mundo entero en vez de los planteles que tocó
la carrera. Si la edad media del mundo sube, el check pasa; si no sube, es un bug.

**4. Lo esperado:**
- `HUELLA_JUEGO` pasa a 'K3c'.
- La entrada del draft del bloque A se borra, porque volvió a su banda.
- La guarda "K3-B neutro" se reemplaza por un check del valor calibrado: un efecto deja `fraccionPermanente`
  del delta real, y no 0.

**Después — el supervisor:**
- Corre la validación completa y `simulate.js 1500 60 todas`, y escribe la tabla "después del bloque A" al lado
  de §K.0b.
- Re-especifica la meta de palanca con el test corregido (§K.0b, punto 3).
- Lanza una revisión independiente.

### K4 — Te frena solo lo importante *(bloque B — D-B)*

- **Partidos importantes** (`systems/temporada.js`): se marca la fecha **que decide algo**, no la
  primera con cualquier motivo. Hoy el cupo se gasta en "contra el puntero" o "venís de dos derrotas",
  y el partido que define la clasificación sale **0,1 veces por carrera** (D62). Cuentan: define la
  clasificación, la revancha, el clásico contra tu ex equipo, el cruce con tu archirrival.
  `puntero`/`presion` dejan de marcar. Como máximo uno por split, sin draft y con la probabilidad a la vista.
- **Series** (playoffs e internacional) — reemplaza a J6:
  - El pick mapa a mapa se reemplaza por el **plan de Fearless** al empezar la serie: guardar tu mejor
    campeón para el mapa decisivo, salir con todo, la sorpresa, o "lo que diga el coach". Cada camino
    muestra su probabilidad por mapa.
  - El motor juega el plan y te frena solo si el rival te quema el campeón que guardabas, o en el
    mapa decisivo.
  - Una serie sin nada en juego (por ejemplo, contra un rival muy inferior) no pregunta.
  - El umbral actual pregunta justo cuando la respuesta es obvia (D63); esto lo reemplaza.
- **Minijuegos solo en el clímax**: el mapa decisivo de semis, final e internacional; **la prueba en
  cada salto grande** (el tryout de tier 3 → 2 → 1 y el de import); la rueda de prensa solo tras una
  final o un escándalo. Tope de 4-8 por carrera. Como idea a medir, el "clip viral" en soloQ (el
  outplay contra un pro que te hace conocido, la vía Calix de `CONCEPTO` §12.2).
- **La charla del coach entre mapas**: un comodín por temporada que empuja un mapa. El dilema es
  gastarlo en semis o guardarlo para la final (la "arenga" de El Ídolo, en versión LoL).
- **Eventos**: solo frenan las **bifurcaciones de carrera**, marcadas en el dato: cambio de región,
  jugar lesionado o parar, oferta de streaming, escándalo, conflicto que te puede banquear, retiro o
  vuelta, servicio militar.
  - El resto se resuelve según tu **perfil** (el profesional / el hambriento / el showman / el
    leal). Se elige al arrancar y se corre con tus decisiones grandes. Mapeo automático por la previa
    de cada opción (familia de efecto + riesgo), con override opcional por opción. Se cuenta en una
    línea de crónica: los textos no se pierden, pasan a ser la historia.
  - J4 se aplica a las que siguen frenando: la bisagra como peso y no como filtro, la categoría
    reciente y `main_muerto` como transición.
  - Pase de contenido sobre las bifurcaciones: efectos que duran (K3) y caminos que se abren y cierran.
- **La pretemporada en una sola parada** por año (T9): mercado (si abre) + preparación (las rutinas
  de offseason como cartas de mejora) en la misma pantalla.
- **El fin de año** sigue siendo la decisión grande, pero tiene que tener palanca medida (hoy 4%
  significativo, igual que el ruido).
- Pantallas: la tarjeta del plan de Fearless · el partido importante con su probabilidad · el clímax ·
  la línea de crónica de los eventos resueltos por perfil · el perfil en el inicio · la pretemporada
  unificada.

Checks (rojos hoy): interrupciones por carrera con mediana ≤ 80 · por split pro ≤ 2 (≤ 4 en playoffs
o internacional) · `define_clasificacion` alcanzable (≥ 1 cada 3 temporadas de tier 1 con playoffs) ·
minijuegos por carrera en [4, 8] · ≥ 60% de las interrupciones con palanca medible (`agencia.js`) ·
tiempo-máquina a 1× ≤ 8 min de mediana · el plan de Fearless declara las probabilidades que el motor
usa (regla 15).

#### K4 — decisiones de spec *(supervisor, 2026-10-03; sin preguntas, revisables)*

**De dónde salen las interrupciones hoy** (`criterio`, 1500 carreras, §K.0c), en promedio por carrera, con su
porcentaje del total:

| Tipo | Por carrera | % | Lo ataca |
|---|---|---|---|
| eventos | 36,7 | 22% | K4-C |
| momento de fecha marcada | 27,2 | 16% | K4-A |
| minijuego de serie | 26,8 | 16% | K4-B |
| draft de serie | 22 | 13% | K4-B |
| fin de año | 15,4 | 9% | se queda |
| práctica | 13,4 | 8% | K4-D |
| amateur | ~13 | — | sin cambio |
| ofertas de mercado | 6,2 | 4% | K4-D |

Por split pro, el internacional da una mediana de 9. Sumando lo que se espera de cada pieza (eventos → ~7,
momentos → ~8, minijuegos → ~6, plan de Fearless → ~10, fin de año 15, pretemporada ~13, amateur ~13, el resto
~4) la cuenta da ~76: la meta de ≤ 80 pide **todas** las piezas.

**Bloque B, corrimiento aceptado (T1).** A diferencia de K2b y K3, acá no hay "estructura neutra": dejar de
frenar en un evento ya cambia quién decide. Las bandas que se rompan van a `bandasPendientes.js` (bloque B,
re-basea K4c); las que ya están ahí (las series sin draft y el Bo5 conjunto) las resuelve esta fase. Los checks
estructurales, de determinismo y de regla 15 no pueden quedar rojos. Lo primero, en su propio commit: el techo
de `dist/` se re-mide (1870 KB contra 1900) y sube a **2000 KB**, con margen para las pantallas de K4 y K5.

Cuatro piezas en worktrees paralelas, con archivos mayormente disjuntos; las integra un worker al final.

**K4-A — el partido que importa** (`systems/temporada.js`, `core/temporada.js`).
- **Qué marca.** Se marca la fecha que **decide algo**, en este orden de prioridad:
  1. `define_clasificacion`: la tabla dice que el resultado cambia si entrás a playoffs o tu seed. Se calcula con
     la tabla, no se sortea.
  2. El cruce con el equipo de tu archirrival.
  3. El clásico contra tu ex equipo.
  4. La revancha contra quien te eliminó la última vez.

  `puntero` y `presion` dejan de marcar.
- **Cómo frena.** Como máximo una por split. Sin draft (desaparece el `temporada:draft` de la fecha marcada).
  Frena una sola vez, con la previa y la p a la vista y el momento, si lo hay. La previa de K2d ya existe.
- **Check.** `define_clasificacion` aparece ≥ 1 cada 3 temporadas de tier 1 con playoffs.

**K4-B — la serie como plan** (`core/serie.js`, `systems/serie.js`, pantalla de serie). Reemplaza a J6 y a D63.
- **El plan.** Al empezar una serie de playoffs o de internacional elegís **el plan de Fearless**: guardar tu
  mejor campeón para el mapa decisivo / salir con todo / la sorpresa / lo que diga el coach.
  - Cada plan muestra **su p por mapa**, y es la p que el motor usa (regla 15, con una sola fuente, como K2d).
  - **El rival también quema campeones.** Su fuerza se degrada con el Fearless igual que la tuya: así se resuelve
    de raíz la asimetría del Bo5, la PENDIENTE del conjunto.
- **El motor juega el plan.** Te frena solo en dos casos:
  - el rival te quema el campeón que guardabas;
  - llega el **mapa decisivo**, el que puede cerrar la serie para cualquiera de los dos.
- **Serie sin nada en juego.** Si |Δ fuerza| supera un umbral (constante en BALANCE), no pregunta: juega "lo que
  diga el coach" y lo cuenta en una línea.
- **Minijuegos de serie solo en el clímax**: el mapa decisivo de semis, de la final y del internacional. El tope
  de 4-8 por carrera tiene que salir solo, no de un contador que corte.
- **La charla del coach.** Un comodín por temporada: empuja la p de un mapa (constante en BALANCE), y se ofrece
  en el mapa decisivo. El dilema es gastarlo en semis o guardarlo para la final.
- **Pantallas.** La tarjeta del plan, con la p por mapa de cada camino, y el mapa decisivo con la previa.

**K4-C — solo frenan las bifurcaciones; lo demás lo resuelve tu perfil** (`systems/events.js`,
`data/events/*.json`, inicio, feed).
- **Las bifurcaciones se marcan en el dato** con `bifurcacion: true`: cambio de región, jugar lesionado o parar,
  oferta de streaming, escándalo, conflicto que te puede banquear, retiro o vuelta, servicio militar. Solo esas
  frenan.
- **El perfil.** Profesional / hambriento / showman / leal. Lo elegís en el inicio y se corre con tus decisiones
  grandes, las bifurcaciones (la regla, en BALANCE).
- **Cómo resuelve el perfil.** Un evento que no es bifurcación elige la opción que mejor encaja con tu perfil. El
  encaje sale de la **previa de cada opción** (familia de efecto + riesgo), con una tabla perfil × familia en
  `data/`, sin escribir a mano 220 eventos. Una opción puede traer `perfil: '<id>'` en el dato para forzar el
  encaje. **Sigue habiendo `rng`**: la opción elegida resuelve su distribución con pesos (CLAUDE.md, regla 8).
- **La crónica.** El evento resuelto se cuenta en **una línea de crónica** en el feed, con el texto del evento y
  la opción tomada: los textos no se pierden.
- **J4 en las que siguen frenando.** La bisagra pesa en vez de filtrar, la categoría reciente cuenta, y
  `main_muerto` es una transición (ver J4).
- **Los minijuegos de prensa y de tryout**:
  - la rueda de prensa, solo después de una final o de un escándalo;
  - la prueba, en cada salto grande (tryout de tier 3 → 2 → 1 y el de import).
- **El pase de contenido** sobre las bifurcaciones (efectos que duran, caminos que se abren y se cierran) queda
  para una subfase propia, **K4-C2**, después de integrar, para no mezclar estructura con contenido.

**K4-D — la pretemporada en una sola parada** (T9; `systems/practica.js`, `systems/mercado.js`, su pantalla).
- **Una parada por año.** Mercado (si abre) + preparación en la misma pantalla. Las rutinas de offseason son
  cartas de mejora, con el efecto que duran (K3) a la vista. La práctica deja de frenar por separado.
- **El fin de año** sigue siendo la decisión grande, y su palanca se mide en K4c.

**Las cuatro piezas, tal como quedaron** *(2026-10-03; cada una midió con `criterio`, 100 × 60)*.

| Pieza | Qué bajó | Antes | Después | Además |
|---|---|---|---|---|
| K4-A | momentos por carrera | 27,9 | 18,3 | el draft de fecha desapareció; `define_clasificacion` sale en el 37% de los splits elegibles |
| K4-B | pausas de serie | 51,2 | 24,9 | minijuegos por carrera: mediana 5; Bo5 favorito, jugador 82,7 y rival 75,0: la asimetría se resolvió y las dos PENDIENTE del bloque B se borraron |
| K4-C | pausas de eventos | 35,8 | 2,0 | solo frenan 16 bifurcaciones |
| K4-D | práctica + mercado | 21,3 | 13,0 | — |

**Decisiones al integrar:**
- **La rueda de prensa.** Va solo después de una final o de un escándalo (gana K4-C). K4-B la había sacado
  después de cada serie. El bootcamp previo al internacional queda afuera.
- **El tryout de un salto o de un import** se resuelve dentro de la parada única de la pretemporada (K4-D), como
  mucho con una pantalla extra. No es una pausa aparte.
- **El archirrival casi nunca marca fecha.** Su equipo está en tu liga en ~4% de los splits pro. Se acepta como
  caso raro.
- **El cambio de región no tiene evento en el dato** hoy, y las bifurcaciones frenan ~2 veces por carrera (se
  estimaron ~7). Las dos cosas son de **K4-C2**, el pase de contenido.
- **Las interrupciones todavía no llegan a ≤ 80** sumando las piezas. Eso es de K4c: el umbral de "sin nada en
  juego", la ventana de `define_clasificacion` y lo que cuesta cada parada.

**K4-C2 — el pase de contenido sobre las bifurcaciones** *(spec del supervisor, 2026-10-03)*. Hoy frenan ~2
bifurcaciones por carrera y el cambio de región no tiene evento.
- **Meta: ~5-7 bifurcaciones por carrera** con `criterio`. Lo que se suma tiene que ser decisión de carrera, no
  relleno.
- **Eventos nuevos con `bifurcacion: true`**, en el esquema de `data/events/*.json`: efectos como rangos,
  resultados con pesos, condiciones de aparición, categoría y texto con tono de alguien que conoce LoL. Al menos:
  - **Cambio de región:** una oferta de import a otra liga. Plata y techo contra idioma, familia y arraigo; el
    caso de Corea hacia afuera y el de afuera hacia Corea o China.
  - **Contenido a tiempo completo:** dejar de competir por el streaming.
  - **El cambio de rol:** el coach te pide jugar otra línea.
  - **Jugar los playoffs infiltrado o parar.**
  - **El conflicto con el sponsor o la org** que te puede banquear.
  - **El retiro con oferta de staff:** coach o analista.
  - **El servicio militar** para los coreanos, si el existente no lo cubre.
- **Los efectos que duran** salen solos por la fracción de K3: no hace falta escribirlos aparte.
- **Caminos que se abren y se cierran.** Cada bifurcación deja un flag (en `state.flags`, completo desde el
  inicio, T4) que habilita o cierra eventos futuros, y al menos dos eventos de seguimiento leen esos flags.
- **Afinidad de perfil.** Cada opción tiene su afinidad (K4-C), para que el perfil derive con lo que decidís.
- **Lo que no cambia:** ningún número del motor, solo dato y, si hace falta, una condición nueva en el
  selector. `validate.js` cubre el esquema de eventos; los checks de K4-C siguen en verde.

**K4-C2, tal como quedó** (`1f2256f`, `5cebbd0`). Las bifurcaciones pasaron de 2,0 a 5,4 por carrera: 9
eventos nuevos y 6 de seguimiento que leen `flags.caminos`. Pero **el cambio de región, el cambio de línea y
"dejar de competir" eran narrativa más stats y flags**: ningún evento podía cambiarte de liga, de línea ni
retirarte. Eso rompe la regla 15 (la tarjeta promete una mudanza que el motor no hace). **Se decide:**
- **Los eventos pasan a tener efectos de carrera reales**, declarados en el dato:
  - `ofertaDeImport`: crea una oferta real de esa liga, que pasa por el mercado con sus reglas: contrato,
    residencia, idioma;
  - `cambiarRol`: tu línea pasa a ser otra, con el pool y la maestría que eso implica;
  - `retirarse`: con su motivo, por el camino del retiro.
- **Cada opción de bifurcación que promete eso usa el efecto**, y un check verifica que la promesa del texto y el
  efecto coincidan.
- **`la_llamada_del_manager` quedó muerta**, porque el pipeline corta los eventos durante la ventana de vuelta. Se
  revive o se borra con su línea.

**Para las cuatro piezas.**
- Regla 15 en cada pantalla nueva: lo que muestra es lo que el motor usa.
- Sin ids crudos.
- Una cosa por vez en pantalla, legible a 375 px.
- Mutantes rojos primero.
- El guardado sube de `VERSION` si cambia la forma: la integración deja un solo número.
- El reporte de ritmo de `simulate.js` se mantiene comparable con §K.0c.

### K4c — Calibrar bloque B *(solo constantes)*

Contra §K.3c. **Reemplaza a las bandas de J5/J6** (150-280 decisiones por carrera, "más drafts"): se
borran con su línea de "reemplaza a…" (regla 17).

#### K4c — cómo se hace *(supervisor, 2026-10-03)*

Se calibra sobre la estructura final: K4 + K4-C2 + K5 integradas, con los arreglos de la revisión de K5
(`26450d5`).

**Línea de base** (`simulate.js 400 60 criterio` sobre `26450d5`, 0 crashes):

| Métrica | Medido | Meta (§K.3c) |
|---|---|---|
| Interrupciones por carrera | mediana **111** · p90 127 | ≤ 80 |
| Por split pro, regular | p50 1 · p90 2 (5,7% pasan de 2) | ≤ 2 ✅ |
| Por split pro, playoffs | p50 4 · p90 7 (33,1% pasan de 4) | ≤ 4 |
| Por split pro, internacional | p50 4 · p90 7 (47,1% pasan de 4) | ≤ 4 |
| Minijuegos por carrera | mediana **11** | 4-8 |
| Tiempo-máquina (definición del instrumento) | mediana **8,1 min** · p90 9,3 | ≤ ~4,6 (re-base de §K.0b) |

**De dónde salen las 111.** Por carrera, en orden:

| Tipo | Por carrera |
|---|---|
| `temporada:momento` | 19,2 |
| `edadCierre` (el fin de año) | 15,5 |
| `serie:plan` | 13,9 |
| `amateur:reparto` | 9,9 |
| `serie:minijuego` | 7,8 |
| `eventos` | 6,0 |
| `mercado:oferta` | 6,0 |
| `practica` | 5,5 |
| `internacional:swiss` + `internacional:plan` | 4,0 |
| resto | < 1,2 cada uno |

**El criterio para recortar es la palanca.** El juego te frena cuando algo grande está en juego (D-B). Un tipo de
parada cuya palanca medida es ~0 es una parada sin nada en juego, así que se recorta primero: se vuelve más rara
o se resuelve sola. Un tipo con palanca alta se conserva aunque sea frecuente. La meta de palanca es la
re-especificada en §K.0c: ≥ 60% de las interrupciones que sobreviven, con el test corregido por comparaciones
múltiples y ≥ 30 réplicas por decisión.

**Las perillas** (bloque B; el paso 1 confirma los nombres en `balance.js`):

| Perilla | Qué mueve |
|---|---|
| `serie.plan.umbralSinNadaEnJuego` | series en las que no te frena el plan |
| `serie.rondasConMinijuegoDecisivo` · `serie.rondasConPrensa` | minijuegos y prensa de serie |
| `temporada.ventanaDefineClasificacion` y cuándo la fecha marcada "tiene algo en juego" | `temporada:momento` |
| frecuencia del reparto amateur y de la práctica | `amateur:reparto`, `practica` |
| pesos del banco de minijuegos (`data/minijuegos.json`) | la PENDIENTE B del banco: ninguna mecánica > 35%, y las tres que no salen nunca (`last_hit`, `la_vision`, `el_kite`) vuelven a tener momento |
| frecuencia de las bifurcaciones (K4-C2) | ~5-7 por carrera con la regla nueva de `criterio` |

**Paso 1 — un worker (instrumento, sin tocar el motor):**
- **Un script de barrido** (`k4c/barrido.mjs`, sin trackear, como el de K3c) que aplica overrides de esas
  perillas en memoria y reporta, con `criterio`, el bloque `ritmo` (incluido el desglose por tipo), los
  minijuegos por mecánica y las bifurcaciones por carrera.
- **`agencia.js` con potencia.** ≥ 30 réplicas por decisión, la palanca **por tipo de parada** y la fracción
  ponderada sobre las paradas que quedan, para que el paso 2 recorte con el dato.
- **El tiempo-máquina por fuente.** Qué sistema escribe cuántos logs no técnicos por carrera. Si el tiempo no
  baja con constantes, el paso 2 lo decide y lo escribe acá antes de tocar estructura.
- **`criterio` en las bifurcaciones.** Hoy acepta casi todo cambio de línea (el 52% de sus carreras cambia de
  línea) y nunca se muda ni se retira, porque puntúa la previa de las stats. La regla nueva es la de un jugador que
  lee la carrera:
  - acepta un **import** si la liga de destino tiene más **calibre** (`calibreDeLiga`) que la actual y su nivel
    lo alcanza. *(Corregido en el paso 1: la spec decía "más `dificultad`", pero en `leagues.json` la `dificultad`
    mide lo difícil que es ganar el Mundial **desde** esa región, y LCK es la mínima. Con esa regla `criterio`
    nunca iba a LCK y no aceptaba ningún import.)*
  - acepta un **cambio de línea** solo si no queda peor (su pool y su maestría en la línea nueva contra la
    actual);
  - **no se retira** mientras el mercado le ofrezca su tier.

  `malas` hace lo contrario y `azar` sigue al azar. Se mide antes y después: % de carreras que cambian de línea y
  que se mudan, por estrategia.
- **El código muerto del draft.** `lecturaDePick` ya no tiene quien lo llame fuera de `validate.js`. Se borran la
  función, su check y `BALANCE.draft.lectura`, con la línea de la regla 17.

**Paso 2 — el supervisor.**
- Corre los barridos en background.
- Elige, con el mismo criterio de K3c: cumplir cada meta con el valor más cercano al actual, y recortar
  primero lo que tiene menos palanca.
- Escribe acá la tabla de lo elegido.

**Paso 3 — un worker.**
- Fija los valores elegidos.
- Las metas de ritmo pasan a **checks duros** con `criterio`.
- Vacía `bandasPendientes.js` del bloque B y marca `BLOQUES_DE_CORRIMIENTO.B.cerrado = true`.
- Re-mide los cuantiles del percentil del puntaje (K1).
- Fija `HUELLA_JUEGO` 'K4c'.
- Lo que se rompe por diseño lleva su línea de la regla 17.

**Paso 1, hecho** (`k4cal-instrumento`: `92ad371`..`c55f381`, revisado: "OK con observaciones menores", las
observaciones cerradas en `c55f381`).
- **El barrido** está en `k4c/barrido.mjs`.
- **`agencia.js`** gana `--procesos`, la palanca por tipo y una tabla de recorte. Una réplica que revienta queda
  registrada y no tira la corrida.
- **El tiempo-máquina** sale ahora por fuente.
- **`criterio`** ya no cambia de línea (antes lo hacía el 47%) y se muda por bifurcación en el 27% de las
  carreras.
- **`lecturaDePick`**, borrado.

La primera corrida de agencia encontró un crash real: el banquillo te cedía a tu propio club. Se arregló en
`c3945ac`, con un check y una guarda nueva de split pendiente.

**Paso 2 — lo que midieron los barridos** (`criterio` 300 × 60, de a una perilla y combinadas):

| Configuración | Interrupciones (mediana) | Playoffs · internacional (p90, % > 4) | Minijuegos | Tiempo |
|---|---|---|---|---|
| actual | 109 | 7 (36%) · 7 (49%) | 11; la prensa, 55% | 7,9 |
| `umbralSinNadaEnJuego` 6 | 98 | 5 (17%) · 5 (22%) | 10 | 7,9 |
| `rondasConPrensa` [] (prensa solo tras escándalo) | 102,5 | 6 · 6 | 5 | 7,7 |
| `ventanaDefineClasificacion` 4 | 105 | 7 · 7 | 11 | 7,8 |
| **cA** = umbral 6 + prensa [] + ventana 4 + las 3 mecánicas en `mapa_decisivo` | **89** | 5 (11%) · 5 (12%) | **4**, las 10 mecánicas salen | 7,7 |
| cA sin fecha marcada | 73 | 4 · 4 | 4 | 7,2 |

- **Las constantes solas no llegan a 80.**
- **Sacar la fecha marcada no es la salida.** Sin ella, los eventos ocupan su lugar (bifurcaciones 6 → 12) y
  se pierde el "una fecha que decide algo" de K4-A.
- **Las dos paradas más grandes no tienen constante.** `edadCierre` (15) y `amateur:reparto` (10) son
  estructura.
- **El tiempo no se mueve con ninguna perilla.** Sale del feed:
  - `escena`: 80 logs por carrera;
  - `serie:mapa`: 66;
  - `meta`: 51;
  - los renglones de efecto de los eventos: 43.

**La palanca, medida** (`agencia.js`, 24 carreras × 30 réplicas, 748 decisiones, contra el puntaje de la carrera).
**El 8,6% de las paradas tiene palanca**, ponderado:

| | Paradas por carrera | % significativo | Mediana |
|---|---|---|---|
| `mercado:oferta` | 5,3 | 37% | 0,34 σ |
| `retiro` | 1,7 | 37-67% | — |
| `eventos` | 5,4 | 14% | — |
| `temporada:momento` | 20 | 7,5% | 0,06 σ |
| `edadCierre` | 14 | 7,3% | 0,06 σ |
| `practica` | 6 | 7,5% | — |
| `serie:plan` | 14 | 2,7% | — |
| `serie:minijuego` | 5 | 2,8% | — |
| `amateur:reparto` | 7,8 | 0% | — |
| `serie:decisivo` | 1,4 | 0% | — |
| `mercado:minijuego` (la prueba) | 0,9 | 0% | — |

En la tabla de recorte, resolver solas todas las paradas de 0% deja 77 por carrera, y de esas solo el 10% tiene
palanca. Ni dejando únicamente los seis tipos de más palanca se llega al 60%: queda 54%, con 2,3 paradas por
carrera.

**Decisiones del paso 2** *(supervisor, 2026-10-03)*:

1. **La meta de palanca se mide en el horizonte de cada parada.**
   - **Por qué cambia.** Contra el puntaje de la carrera, el 60% es inalcanzable por construcción: con ~80
     paradas, una decisión de serie mueve la carrera ~0,06 σ aunque decida la serie. Esa medición confunde "esta
     decisión no importa" con "esta decisión importa para algo más chico que la carrera".
   - **Qué se le pregunta a cada parada.** Si cambia lo que dice que se juega (la queja del usuario es "las
     opciones no afectan nada"):

     | Horizonte | Paradas | Qué se mide |
     |---|---|---|
     | **serie** | `serie:*`, `internacional:*` | el resultado de esa serie, o el avance en el 2-2 del Swiss |
     | **partido** | `temporada:momento` | el resultado de ese partido |
     | **split** | `practica`, `eventos`, `amateur:reparto`, `amateur:nocturno` | la posición final del split, o el LP del bloque en el amateur |
     | **carrera** | `mercado`, `edadCierre`, bifurcaciones, `retiro`, `amateur:oferta`, `amateur:salida`, `amateur:negociacion` | el puntaje |

   - **Las metas:**
     - **≥ 60%** de las paradas que sobreviven con palanca **en su horizonte**, ponderado y con el mismo test
       corregido;
     - **la fracción contra la carrera** se sigue reportando y **no puede bajar** de 8,6%.

   Lo reemplazado (la meta de §K.0c "≥ 60% contra la carrera") lleva su línea de la regla 17.
2. **Estructura del bloque B, antes de las constantes** (regla 2). Cada punto va en su propio commit y con
   comportamiento medido.
   - **Paradas sin nada en juego.** Toda parada con 0% de palanca **también en su horizonte** (n ≥ 20) deja de
     frenar: se resuelve sola con la elección anterior o con el perfil, y se ve en el resumen. Candidatas, según
     la tabla:
     - `amateur:reparto` (el reparto se mantiene hasta que lo cambiás en el cierre de año);
     - `serie:decisivo` (la charla del coach pasa a la tarjeta del plan);
     - `amateur:nocturno`.

     Las confirma la medición por horizonte.
   - **La prueba que no decide nada (regla 15).** `mercado:minijuego` (`la_prueba`) da 0% contra la carrera: se
     verifica que el resultado del tryout mueva la probabilidad de fichar. Si no la mueve, la pantalla miente y se
     arregla. No se recorta.
   - **El feed.** Va por el tiempo; la meta es ≤ ~5 min por la definición del instrumento:
     - los renglones de efecto de un evento van dentro del beat del evento;
     - `escena` cuenta solo lo de tu liga, tus ex-orgs y rivales, y los internacionales;
     - `meta`, un renglón por parche;
     - `serie:mapa`, de las series en las que no frenaste, un renglón por serie.

     El historial completo sigue en la pestaña de historia: nada se borra del estado, solo se deja de reproducir
     como beat.
3. **Las constantes.** El punto de partida es cA. Se re-mide después del punto 2 y se elige con el criterio de
   K3c.
4. **El check del banco de minijuegos (9R4c)** mide las mecánicas que compiten por un momento: las del mapa
   decisivo y la prensa. `la_prueba` es el único minijuego del tryout y no compite con nadie, así que queda
   afuera. Con cA, la prensa es el 28% de ese banco (banda ≤ 35%). Va con su línea de la regla 17.

**Cómo se ejecuta.** Dos workers en paralelo:
- **K4c-H.** El instrumento por horizonte en `agencia.js`, más la verificación de `la_prueba`.
- **K4c-F.** El feed.

**K4c-H, hecho** (`k4c-horizonte`: `df0a8ef`, `74ba17b`; 11 mutantes rojos). Dos hallazgos que cambian la
medición y una decisión de diseño:
- **Los horizontes binarios no tienen potencia.** Ganar o perder la serie o el partido, con 30 réplicas, solo da
  significativo con efectos de ~20 pp. **Se decide** medirlos sin ruido:
  - **Cómo.** Esas paradas ya declaran la p de cada opción, la de la previa de K2d, que es la que el motor tira.
    Su palanca en horizonte es **Δp = p de la mejor opción − p de la peor**, sobre el estado en el que se
    decide.
  - **El umbral.** Cuenta como palanca si Δp ≥ **5 pp**: una elección que cambia una de cada veinte series. Es
    una constante del instrumento (`agencia.js`), no del juego.
  - **El binario** se sigue reportando.
- **`amateur:reparto`** dio palanca en su horizonte (los LP) en corridas chicas. La medición grande decide si
  sigue frenando: no se recorta por la tabla contra la carrera.
- **`la_prueba` no decide nada.** P(fichar | resultado 0) = P(fichar | 1) = 1,000 en 294 tryouts: los dos tryouts
  firman siempre (`mercado.js:~1198`, `amateur.js:~505`). El resultado solo mueve `bonusJerarquiaTryout` (±6),
  que casi no llega al juego. Sin embargo dos textos (`minijuegos.json`: "mostrar que valés el contrato mínimo",
  "con eso alcanza para firmar") prometen que el contrato está en juego.

  **Se decide** que el motor cumpla la promesa (regla 15) y que el tryout tenga algo en juego:
  - **La prueba decide el contrato**, como distribución con pesos y no con un corte. P(firmar) sube con el
    resultado. Hay tres constantes de bloque B que calibra K4c: un resultado malo firma pocas veces, uno regular
    a veces y uno bueno casi siempre.
  - **Si fallás en el mercado**, la oferta se cae y seguís con las otras o con tu contrato. **En el amateur**, la
    firma se posterga: seguís en la escalera y puede llegar otra oferta.
  - **El crédito de jerarquía se queda** como está.
  - **El texto** dice lo que está en juego: el contrato y el crédito.

  Es una decisión del supervisor con el usuario ausente, revisable. Mueve el embudo (llegar a pro), que calibra
  K5c.

**K4c-F, hecho** (`k4c-feed`: `c632ca3`..`3cb88a4`).
- **El mecanismo.** Un log con `adjunto: true` viaja dentro del beat anterior. Hay una sola regla,
  `formaBeat` en `core/log.js`, y la leen el reproductor y el instrumento.
- **La definición nueva de `tiempoMaquinaMin`** va con su línea de la regla 17.
- **Qué bajó.** El tiempo-máquina pasó de **7,6 a 6,5 min** de mediana (`criterio` 30 × 60):
  - `escena`: 80 → 25 beats por carrera;
  - `serie:mapa`: 66 → 49;
  - `meta` casi no se movió (ya iba uno por parche): 51 → 49;
  - los efectos de evento ya eran un beat por evento.
- **Lo que no cambió.**
  - Los logs del estado siguen siendo 747 por carrera.
  - La huella es idéntica.
  - La forma del guardado cambió (`adjunto`). Se re-registró `FORMAS_CONOCIDAS[10]`, pero como K5 ya va a main
    con `VERSION` 10, **el paso 3 sube `VERSION` a 11**.
  - `dist/`: 2075 KB.
- **Lo que queda por encima de ~5 min:**
  - `meta`: 49;
  - los mapas de las series en las que frenás: 49;
  - los eventos: 47;
  - `serie`: 40;
  - `rendimiento`: 37;
  - `mercado`: 34.

  **Se decide** un corte más, en el worker de las paradas: el renglón de parche va como **adjunto salvo que toque
  tu pool o tu main**. El tiempo real lo mide K6 en el navegador, y esa es la medida que manda.
- **El bot de Playwright se trabó en las cartas de preparación de la pretemporada** (2030). Puede ser el bot o la
  pantalla. Lo verifica la revisión de navegador de K4c.

**La palanca en su horizonte, medida** (H + F integrados, 24 carreras × 30 réplicas, 747 decisiones). Da
**22,4%** ponderado, contra el 60% de la meta; contra la carrera, 8,9%, que no baja del piso. Por tipo:

| Parada | Por carrera | Palanca en su horizonte |
|---|---|---|
| minijuegos del mapa decisivo | — | 100% (Δp mediana 20 pp) |
| `amateur:reparto` | — | 100% |
| 2-2 del Swiss | — | 88% |
| charla del decisivo | — | 64% |
| `mercado:oferta` | — | 34% |
| `temporada:momento` | 20,4 | **15%** (Δp mediana 1,4 pp) |
| `serie:plan` | 14,2 | **2,7%** (Δp 1,4 pp) |
| `edadCierre` | 13,9 | 5% |
| `practica` | 6,4 | 0% |
| tryouts | — | 0% (ya decidido arriba) |

- **Lo que hunde el promedio** son las paradas frecuentes cuyas opciones casi no se distinguen.
- **La regla de "sin nada en juego"** (0% en la carrera y en el horizonte, n ≥ 20) solo marca los dos tryouts.
  Recortar hasta llegar al 60% obligaría a sacar la fecha marcada, el plan de serie y el cierre de año, que son
  el corazón de K4.

**Se decide que las paradas pesen, en vez de recortarlas:**
- **El plan de serie**, por constantes. Los `empuje*` y los `desgaste*` de `serie.plan` se barren hasta que el Δp
  mediano de las decisiones de plan llegue a ~5 pp, sin romper la banda del Bo5 del bloque A (jugador favorito
  75-85). Para eso el barrido reporta el Δp de cada decisión de plan, desde la `pSerie` declarada por opción.
- **La fecha marcada, por contenido.** Las opciones de `data/events/partido/*.json` dan todas un efecto `partido`
  parecido, por ejemplo +0,04/+0,18. Pasan a ser **intercambios**:
  - en cada evento, la mejor y la peor opción difieren en ≥ 0,10 en el punto medio de su efecto `partido`;
  - la de menos partido trae una compensación real en otro eje (mentalidad, hype, sinergia o descanso).

  Así es una decisión y no una trampa, y un check lo exige.
- **`edadCierre` y la práctica** se re-miden después. Si siguen cerca de 0, la ronda siguiente decide si se
  vuelven más raros o se rehacen.
- **La meta de palanca se fija en el paso 3 con lo medido** (§K.3: "cada calibración las fija"). Lo que no se
  logre queda escrito acá, con su número.

**Cómo se ejecuta** (dos workers en paralelo sobre `k4cal-instrumento`):
- **K4c-S** (motor):
  - el tryout que decide el contrato;
  - el parche como adjunto;
  - el Δp de plan en el barrido.
- **K4c-M** (dato): el pase de contenido de la fecha marcada, con su check.

Después, el barrido del supervisor (plan y cA) y el paso 3.

**K4c-S, hecho** (`k4c-s`: `7bc2186`..`3297f2b`).
- **La prueba decide el contrato.** `BALANCE.serie.probFirmaTryout` vale malo 0,15 · regular 0,55 · bueno 0,95,
  interpolado. Medido: P(firmar | 0) = 0,10-0,13 contra P(firmar | 1) = 0,94-0,95. Con eso `malas` llega a pro
  en el 23% de las carreras (antes 60%) y `criterio` sigue en 83%.
- **El parche como adjunto casi no recorta.** El 81% de los parches toca algún campeón de tu pool.
- **La PENDIENTE B de las bifurcaciones (4,15 contra [4,5, 7,5])**, por los splits pro que se pierden en la
  prueba. Se re-basea acá.

**El barrido del plan de serie** (`criterio` 300 × 60, escalando todos los `empuje*` y `desgaste*` de
`serie.plan`):

| Escala | Δp de plan, mediana | % ≥ 5 pp | Bo5 favorito claro, lado del jugador |
|---|---|---|---|
| ×1 | 1,9 pp | 10% | 83,9 ± 2,2 |
| ×2 | 3,5 | 30% | 89,0 ± 1,8 |
| **×3** | **5,1** | **52%** | 86,9 ± 2,1 |
| ×4 | 7,2 | 78% | 89,4 ± 1,8 |

**Se decide:**
- **Plan ×3.** Los valores quedan:

  | Constante | Valor |
  |---|---|
  | `empujeConTodo` | 0,15 |
  | `desgasteConTodo` | 0,09 |
  | `empujeGuardado` | 0,09 |
  | `empujeSorpresa` | 0,15 |
  | `empujeCharla` | 0,15 |

- **El check del Bo5 del bloque A mide con el plan neutro.** Contesta cada plan con la opción de p mediana. Hoy
  `criterio` siempre elige el mejor plan, así que el check suma la agencia del plan al nivel: cualquier plan que
  pese lo saca de 75-85 por construcción. El bloque A controla nivel → resultado. La palanca del plan se mide
  como palanca (bloque B), y `criterio` contra `azar` en series ganadas lo muestra. No es re-abrir el bloque A:
  la banda no cambia, cambia lo que se le pide medir. Va con su línea de la regla 17.
- **El parche se angosta.** Va como adjunto salvo que **mueva a tu main de S/A a B/C o al revés**; eso deja el
  ~26% como beat. Es lo que importa: el parche que te saca o te devuelve el main.

**La integración de K4c-S y K4c-M** (`32dc66a` → `c1b4ddd`) destapó dos caminos del registro con un split
esperando fila. Los dos son D76.
- **El arreglado.** Te retirás por una bifurcación en el split del pase y volvés: la fila no se abría al volver.
  Se arregló en `5183e93`, con un check que busca seeds.
- **El que queda.** Te retirás en el split del pase y **no volvés**, así que la carrera cierra con ese split sin
  asentar. **Se decide:** al cerrar la carrera, un split que espera fila se asienta abriendo y cerrando la fila de
  esa org con ese split adentro. D76 dice que un split jugado cuenta siempre, en la org y el tier donde se jugó.
  El check de D76 tiene que verlo también con `malas`.
- **Los checks que dependían de seeds fijas** ahora buscan seeds con tope.

**Paso 3a — un worker (estructura y constantes, regla 2: commits separados):**
- **Estructura:**
  - el parche angosto;
  - el check del Bo5 del bloque A con plan neutro (regla 17);
  - el check del banco de minijuegos sin `la_prueba` (regla 17);
  - el split pendiente que se asienta al cerrar la carrera.
- **Constantes:**
  - cA: `umbralSinNadaEnJuego` 6, `rondasConPrensa` [] y `ventanaDefineClasificacion` 4;
  - las tres mecánicas con `mapa_decisivo`;
  - el plan ×3.

**Después, el supervisor mide** con `simulate.js 400 60 todas` y `agencia.js` (24 × 30).

**Paso 3a, hecho** (`15c1b64`..`bb13d1c`). Barrido `criterio` 30 × 60:

| Métrica | Medido | Meta |
|---|---|---|
| Interrupciones | **86,5** | ≤ 80 |
| Playoffs | p90 4 | ≤ 4 ✅ |
| Internacional | p90 5 (13,5% pasan de 4) | ≤ 4 |
| Minijuegos | 3,8 | 4-8 |
| Tiempo-máquina | 5,4 min | ~5 |
| Δp de plan | mediana 6,4 pp (67% ≥ 5 pp) | ~5 pp ✅ |

Quedan tres cosas:
1. **"El impacto de los minijuegos está acotado (≤ +35%)" da +171%.** Lo causa la prueba que decide el contrato:
   el que falla todos los minijuegos casi nunca llega a pro. Medido (siempre falla contra siempre acierta, 1000
   seeds):

   | `probFirmaTryout` (malo / regular / bueno) | Siempre acierta sobre siempre falla |
   |---|---|
   | 0,15 / 0,55 / 0,95 | +171% |
   | 0,35 / 0,65 / 0,95 | +64% |
   | **0,5 / 0,75 / 0,95** | **+31%** |
   | 0,65 / 0,8 / 0,95 | +21% |

   **Se decide 0,5 / 0,75 / 0,95.** La prueba sigue pesando (45 pp de firma entre una prueba mala y una buena),
   pero no decide la carrera sola. El tope del +35% no se toca.
2. **"K4-D: la pretemporada frena una sola vez" falla** (seed 5, split 18: el mercado y la práctica por separado).
   Ya fallaba antes de las constantes del 3a. Es un bug de estructura: se busca el commit que lo trajo y se
   arregla. La regla de K4-D no se relaja.
3. **`define_clasificacion` sale en 1 de cada 3,6 splits** con `ventanaDefineClasificacion` 4, contra el piso de
   K4-A de 1 cada 3. Es la fecha con más en juego (decide la clasificación). **Se decide** la ventana más chica
   que cumpla el piso, midiendo 6 y 7.

**El cierre de año, re-medido: 14 paradas por carrera con 5% de palanca.** Son 10 eventos de reflexión ("balance
de fin de año", "revisión familiar"…) con efectos chicos. Es la parada sin palanca más grande que queda, y la que
separa las 86,5 interrupciones de las 80. **Se decide rehacerlo por contenido**, igual que la fecha marcada:
- cada evento de cierre es una decisión de carrera con intercambio, del tipo invertir en el juego, cuidar la
  cabeza y la familia, o la plata y la marca;
- los efectos se notan y duran (la fracción de K3 los vuelve permanentes);
- ninguna opción domina a otra, con un check como el de K4c-M.

La frecuencia (una vez por año) no cambia: es "la decisión grande". **Si después de eso las interrupciones siguen
arriba de 80, la meta se fija en lo medido en 3b**, con la cuenta de qué paradas quedan y su palanca (§K.3: la
calibración fija las metas).

**Los arreglos y el cierre, hechos** (`bb13d1c` → `6ce46a0`, `--rapido` verde).
- **K4-D.** Lo trajo `7bc2186`: una prueba fallida re-abría el mercado y encadenaba otra prueba (oferta → prueba →
  oferta → prueba). **Se decide** que la prueba anuncie en su apuesta un **respaldo**: tu renovación, o la oferta
  mejor pagada que no pide prueba. Si fallás, firmás el respaldo en la misma parada. Es la regla de K4 ("el
  tryout se resuelve dentro de la parada única") y reemplaza al "seguís con las otras" de K4c-S, con su línea de
  la regla 17.
- **La prueba.** Con el respaldo, el que falla pierde los reintentos, y 0,5 / 0,75 / 0,95 subió a +47%. Queda en
  **0,65 / 0,8 / 0,95**, que da +31%.
- **La ventana.** Pasó a 6 y, con el cierre nuevo, a **7**: 6 daba 1 cada 3,1, sobre la línea del piso con
  ±0,9 pp de error.
- **El cierre de año.** Diez eventos con tres opciones cada uno: el juego, la cabeza y la familia, y la marca. Los
  efectos van de 4 a 8 puntos de stat, o de 30 a 50 LP, con costo en otro eje y riesgos en los outcomes. El
  check "K4c el cierre de año es una decisión" daba rojo con el dato viejo (19 problemas).
- **El Bo5 conjunto** también mide con plan neutro.

**Medición después de los arreglos** (`6ce46a0`; `simulate.js 400 60 todas`, 0 crashes en las seis estrategias;
`criterio` 300 × 60; `agencia.js` 24 × 30):

| Métrica | Antes de K4c | Ahora | Meta |
|---|---|---|---|
| Palanca en su horizonte (ponderada) | 22,4% | **48,8%** | ≥ 60% |
| Palanca contra la carrera | 8,9% | 10,3% | no bajar de 8,6% ✅ |
| `temporada:momento` | 15% | **94%** (Δp mediana 13,9 pp) | — |
| `serie:plan` | 2,7% | **66%** (Δp mediana 6,6 pp) | — |
| Interrupciones, mediana (`criterio`) | 111 | **91** | ≤ 80 |
| Interrupciones, mediana (`azar`) | — | 78 | — |
| Interrupciones, mediana (`equilibrado`) | — | 85 | — |
| Playoffs e internacional | p90 7 | **p90 5** (14% pasan de 4) | ≤ 4 |
| Minijuegos | 11 | **4** | 4-8 ✅ |
| Tiempo-máquina | 8,1 min | **5,8 min** | ~5 |
| Llega a pro | — | `criterio` 75% · `azar` 73% · `malas` 48% | — |

**Lo que queda sin pesar:**
- **`edadCierre`:** 6,2% en 12,6 paradas, aunque ya se rehízo.
- **`practica`:** 3,3% en su horizonte, en 5,1 paradas.

Son las paradas de "invertir en vos": mueven el nivel de a poco, y una sola decisión casi no se nota en el
resultado (bloque A: el nivel se construye lento).

**Decisión del usuario (2026-10-03): el plan anual.** La práctica se decide **dentro del cierre de año**, en una
sola parada por año con más peso.
- **El cierre de año fija el plan del año siguiente.** La opción que elegís (el juego, la cabeza y la familia, o
  la marca) define el foco de práctica de los splits de ese año. Cada split se entrena solo según ese plan, y el
  resumen del split lo dice ("Entrenaste según el plan del año: …").
- **La pretemporada queda para el mercado.** Deja de existir la parada de práctica (`practica:practica`). Si el
  mercado frena, frena por el mercado.
- **El primer año**, antes de cualquier cierre, usa el plan del perfil (K4-C) o uno por defecto, que se ve en el
  inicio.
- **Lo que no cambia:** el reparto amateur (`amateur:reparto`, con 100% de palanca) sigue como está.
- **Las reglas que cambian van con su línea de la regla 17:** "K4-D, la preparación del año queda resuelta" y
  los checks de práctica.
- **Lo esperado:** ~85 interrupciones y palanca de ~52-55%. Se mide, y las metas de §K.3c se fijan en 3b con lo
  medido.

**El plan anual, hecho** (`7c440a9`, `96cc7bf`, `c6f098f`).
- **Dónde vive.** `state.player.planAnual` vale `juego`, `cabeza` o `marca` (`data/rutinas/planes.json`, 6 puntos
  por año). Cada split entrena 2 de los 6, rotando: el año suma justo el plan, sin triplicar la práctica.
- **Lo que se reemplazó.** Los cinco checks de K4-D, con su línea de la regla 17.

**La medición final de K4c** (`c6f098f`; `simulate.js 400 60 todas`, corridas de a una por memoria; 0 crashes):

| | `criterio` | `azar` | `equilibrado` | `malas` |
|---|---|---|---|---|
| Interrupciones (mediana · p90) | **84** · 100 | 72,5 · 97 | 78 · 100 | 15 · 49 |
| Split regular (p90) | 2 | 2 | 2 | 2 |
| Playoffs (p90 · % > 4) | 5 · 12,6% | 5 · 14,1% | 5 · 13,6% | 4 · 9,3% |
| Internacional (p90 · % > 4) | 5 · 15,6% | 5 · 21,7% | 5 · 20,6% | 5 · 10,8% |
| Minijuegos (mediana) | 4 | 4 | 4 | 1 |
| Tiempo-máquina (mediana) | 5,9 min | 4,7 | 5,2 | 0,5 |
| Llega a pro | 75,3% | 72,5% | 72,3% | 48,0% |

Además:
- **Bifurcaciones:** mediana 9, promedio 7,8.
- **Banco sin `la_prueba`:** la prensa queda en 23%.

**Las metas de §K.3c, fijadas en lo medido** (§K.3: la calibración las fija). Cada una va con su línea de
"reemplaza a…":

| Meta | Propuesta | Fijada | Por qué |
|---|---|---|---|
| Interrupciones por carrera (`criterio`) | ≤ 80 | **≤ 90** (medido 84) | Lo que queda arriba de 80 es el cierre de año, que el usuario decidió conservar con más peso, y el reparto amateur, con 100% de palanca |
| Por split | ≤ 2 regular · ≤ 4 playoffs e internacional | **≤ 2 · ≤ 5** (p90) | Una serie de playoffs con plan, mapa decisivo y minijuego son 4-5 paradas con palanca |
| Minijuegos (mediana) | 4-8 | **3-8** (medido 4) | El piso en 3 es margen de muestra; que no sean decorativos lo cubre "El impacto de los minijuegos" |
| Tiempo-máquina | ≤ ~4,6 | **≤ 6,5 min** (medido 5,9) | El tiempo real lo mide K6 en el navegador |
| Δp de plan (mediana) | — | **≥ 5 pp** (medido ~6,5) | — |
| Palanca en su horizonte | ≥ 60% | **≥ 45%** (medido 48,8%) | Medida con `agencia.js`, que no entra en `validate.js` por tiempo. Re-medir en K5c y K6. Lo que falta para 60 es el cierre de año (6%), que mueve el nivel de a poco por diseño del bloque A |
| Bifurcaciones por carrera | 4,5-7,5 | **5-9** (promedio 7,8) | — |

**Revisión de K4c** (`b33ff0c`). Motor: "Requiere corrección". Navegador: "Requiere corrección". En el navegador hubo
cero errores de consola, y los guardados VERSION 10 de main cargan y siguen. Los errores van en dos workers:
- **Motor:**
  - **El cierre amateur promete un plan que no se aplica.** El 79% no entrena nada porque sigue amateur.
    **Se decide** que en la etapa amateur el cierre no fija ni muestra plan: al debutar vale el del perfil, igual
    que el primer año.
  - **Una prueba fallida sin respaldo se cuenta como "Nadie te ofrece nada".** Suma a los contadores de silencio y
    de declive, y una bifurcación de retiro llegó a decir "el mercado te venía diciendo que no" con seis ofertas en
    la mesa. **Se decide** que "probaste y no alcanzó" es un caso propio: no suma a `splitsSinOfertaConsecutivos`
    y tiene su texto. El declive lo cuenta como lo que es.
  - **El check del respaldo** recalcula la regla por su cuenta (rojo con el mutante "cualquier oferta").
  - **Los guardados 10 parados en la prueba o en un cierre** se migran con el respaldo y el plan.
  - **La prueba amateur fallida** decía "[object Object] no te firma", y además no anunciaba qué pasa si falla.
- **Textos y datos** (casi todo ya estaba en main):
  - el token `{jungla}` sin resolver;
  - "CAMPEONES DEL MUNDO" con un papel de cuartos;
  - "El primer balance en serio" dos años seguidos;
  - "~+0" con la stat topeada;
  - el resumen del split que no dice que es un tramo del plan;
  - las colas de consuelo repetidas en la fecha marcada.

  El supervisor sumó un ajuste. El titular del año pesa el papel internacional según hasta dónde llegaste: final
  90, semis 82, cuartos 78. Así, una final del Mundial le gana a un título de liga (80) y unos cuartos no.

**La validación completa de K4c** (`b33ff0c`: 405 OK + 1 PENDIENTE C + 4 FAIL; `simulate.js 1000` 0 crashes; build
OK). Los cuatro FAIL eran checks que asumían algo que K4c cambió. Ninguno era un bug del juego. Se arreglaron en
`c171155`..`10bbb52`.
- **9Me.** Una prueba fallida deja el contrato viejo, sin la cláusula negociada.
- **"lesionado".** Ahora sale en 7 de 1200 carreras, contra 14 de 900 antes. El check busca seeds hasta 1200.
- **`tiempoMaquinaPorFuenteSobre`** entra al recuento independiente.
- **9Mf, un corrimiento real.** Los traspasos a mitad de contrato bajaron de 26,3% a 21,1% (seeds 1-960), porque
  hay menos carreras pro y más cortas: 693 contra 736 llegan a pro, y 31,9 contra 36,0 splits pro. Se re-basea el
  piso de 0,24 a 0,16 (≈ 2σ debajo de lo medido), con su línea de la regla 17. Queda debajo del 25% de diseño de
  9M: **lo vuelve a mirar K5c** cuando calibre el embudo.

**Paso 3b — un worker:**
- los checks duros con lo medido;
- vaciar el bloque B de `bandasPendientes.js` y cerrarlo;
- guardado `VERSION` 11, con `FORMAS_CONOCIDAS[10]` igual al de main (`7128c450fa6c`) y `[11]` nuevo;
- `HUELLA_JUEGO` 'K4c';
- los cuantiles del percentil de K1;
- borrar las bandas de J5/J6 (regla 17).

Después, un worker para las paradas sin nada en juego, con la lista confirmada por K4c-H. Luego el barrido final
del supervisor y el paso 3.

### K5 — El Mundial de verdad, la región y el final por mercado *(bloque C — D-D)*

- **El Mundial** (J7 comprimido):
  - `core/internacional.js` (puro: clasificados reales por `cuposInternacionales`, Swiss de 16,
    bracket de 8, ajenos por `hashCadena`, cero `rng`) + `systems/internacional.js` + una línea en
    `ETAPAS_SPLIT` entre `serie` y `events`.
  - **El Swiss se resuelve solo** salvo que llegues 2-2 (partido de vida o muerte). El knockout se
    juega como serie, con las reglas de K4.
  - **El campeón del mundo sale de ese torneo**: hoy `systems/escena.js:45` lo sortea aparte y puede
    contradecir tu serie.
  - MSI y First Stand (J8) quedan afuera.
- **La región se elige en el inicio** (J10), salvo en el desafío diario. Decisión textual de J.2: *"la
  región ES la dificultad"* y LATAM llega hasta tier 2 (LRN/LRS). `leagues.json` gana `dificultad`
  (el dato que también usa el puntaje de K1). Desde Corea es más fácil ganar el Mundial y desde NA más
  difícil; el puntaje lo compensa.
- **El final lo decide el mercado**: con K2 el nivel se nota, y el retiro llega cuando tu nivel ya no
  alcanza para tu liga. La línea de los 34 vuelve a ser excepción.
- **Tier 2 castiga las malas decisiones**: el ~10% que se estanca tiene que salir de mercados mal
  elegidos, pretemporadas malas o la mentalidad rota, no del dado. Se mide con `criterio` contra `malas`.
- Pantallas: el Mundial (el Swiss resumido + el bracket, con tu camino) · la región en el inicio con
  su dificultad dicha · el retiro con su motivo.

Checks (rojos hoy): el campeón del mundo del log es el del torneo · el Swiss siempre termina 8 y 8 ·
ningún cruce se repite · un split de Mundial no pasa de 4 interrupciones · si no clasificás, cero
tiradas · elegir región no corre el stream (huella con la elección igual al sorteo) · la dificultad de
cada región es monótona con su `dificultad`.

#### K5 — decisiones de spec *(supervisor, 2026-10-03; se ejecutan después de K4c)*

Bloque C, con corrimiento aceptado. Las bandas que se rompan van a `bandasPendientes.js` como bloque C, re-basea
K5c. Son tres piezas en worktrees paralelas y una integración.

**K5-A — el Mundial de verdad** (`core/internacional.js` nuevo y puro, `systems/internacional.js`, una línea en
`ETAPAS_SPLIT` entre `serie` y `events`).
- **Clasificados.** Salen de `cuposInternacionales` de cada liga (dato).
- **El formato.** Un Swiss de 16, que se gana con 3 victorias y se pierde con 3 derrotas, y del que salen 8 y 8.
  Después cuartos, semis y final al Bo5.
- **Los partidos ajenos se resuelven con `hashCadena`** (seed + equipos + ronda) contra la p de su cruce, sin
  consumir `rng`: si no clasificás, el stream no se mueve.
- **Tus partidos del Swiss** se tiran solos (una tirada contra la p declarada, K2b). Frena solo el **2-2**, el de
  vida o muerte, con la previa.
- **El knockout se juega como serie**, con las reglas de K4: plan de Fearless, mapa decisivo y charla del coach.
- **El campeón del mundo del log es el del torneo.** Se borra el sorteo aparte de `systems/escena.js:45`.
- **Afuera:** MSI y First Stand.
- **Pantalla:** el Swiss resumido (tu récord y tus cruces) y el bracket con tu camino.
- **Checks:**
  - el campeón del log es el del torneo;
  - el Swiss termina 8 y 8;
  - ningún cruce se repite;
  - un split de Mundial no pasa de 4 interrupciones;
  - si no clasificás, cero tiradas, con la huella idéntica a "no hay Mundial".

**K5-B — la región se elige y es la dificultad** (inicio, `leagues.json`, mercado).
- **Se elige en el inicio.** Ahí elegís tu región de origen, salvo en el desafío diario. Cada región dice su
  dificultad en una línea (la `dificultad` de K1 ya está en `leagues.json`). Elegir la misma región que la seed
  habría sorteado da una huella **idéntica**: la elección no corre el stream.
- **LATAM llega hasta tier 2** (LRN/LRS). Para llegar a primera hay que emigrar, y para eso está la bifurcación
  de cambio de región de K4-C2.
- **D78: con `criterio` nunca se juega LCK ni LPL.** Se busca la causa en el mercado (qué orgs ofrecen y a quién) y
  se corrige: un coreano o un chino con nivel tiene que poder jugar su liga.
- **Checks:**
  - la elección igual al sorteo da la huella idéntica;
  - la dificultad de cada región es monótona con su `dificultad` (en una corrida, % que llega a ganar algo
    importante);
  - hay splits de LCK y de LPL con `criterio`.

**K5-C — el final lo decide el mercado** (`systems/mercado.js`, `systems/retiro.js`, curvas de edad).
- **El retiro.** Llega cuando tu nivel ya no alcanza para tu liga: el mercado deja de ofrecerte contrato en tu
  tier durante N splits (constante). Te queda bajar de tier o retirarte, y eso es una bifurcación. La línea de los
  34 pasa a ser excepción, sin desaparecer.
- **Tier 2 castiga las malas decisiones.** El ~10% que se estanca tiene que salir de mercados mal elegidos,
  pretemporadas malas o la mentalidad rota, no del dado. Se mide con `criterio` contra `malas`.
- **La estructura sale con constantes que reproducen hoy** donde se pueda. Los valores de longevidad (mediana pro
  ~4-6 años; las buenas 7-10; las leyendas 12 o más) los fija **K5c**.
- **Pantalla:** el retiro con su motivo ("ninguna org de LCK te ofreció contrato en dos splits").

**Orden decidido el 2026-10-03:** la estructura de K5 se integra sobre K4 **antes** de K4c. K4c calibra el ritmo sobre la estructura final, ya con el Mundial y sus pausas; calibrarlo antes obligaba a rehacerlo. Después va K5c, que calibra el mundo. Los bloques siguen separados en `bandasPendientes.js`.

**Después de K5:** integración, revisión de motor y de navegador, y K5c, que fija con barridos del supervisor el
embudo, el Mundial por región, P(2 o más | 1), el nuevo Faker por nivel, la longevidad y los cortes definitivos
de los niveles de K1. Después, K6.

### K5c — Calibrar bloque C y los niveles del puntaje *(solo constantes)*

Contra §K.3a y §K.3b: el embudo, el Mundial por región, P(2 o más | 1), el nuevo Faker por nivel,
la longevidad, `criterio` contra `azar` y contra `malas`. Acá se fijan los cortes definitivos de los
niveles de K1.

#### K5c — cómo se hace *(supervisor, 2026-10-03)*

**La línea de base** sale de la medición final de K4c (`criterio` 400 × 60, sobre `c6f098f`). El mundo es
demasiado fácil y la carrera demasiado larga:

| Métrica (§K.3b) | Hoy | Meta |
|---|---|---|
| No llega a pro | 24,8% | ~20% |
| Se estanca en tier 2/3 | **0%** | ~10%, por malas decisiones (`malas` ≫ `criterio`) |
| Llega a tier 1 | 75,3% | 55-65% |
| Gana un título doméstico | **74,3%** | ~30% |
| Top 20 alguna vez | **65,8%** | ~15% |
| Gana un Mundial (real) | el instrumento todavía mide un proxy (pasar el Swiss: 64%) | ≥ 7%, por región: Corea ~12-15%, NA ~3-5% |
| Nuevo Faker (2+ Mundiales o #1 en 3+ temporadas) | proxy (54%) | ~2-3%, pero ≥ 30% en el top 3% de nivel pico |
| P(2 o más \| 1) | proxy | ≥ 35-40% |
| Carrera pro mediana | **16,7 años** | ~4-6; las buenas 7-10; las leyendas 12+ |
| Llega a la línea de los 34 | **79%** | < 5% |
| r(potencial, duración) | 0,18 (PENDIENTE C) | > 0,32 |
| Traspasos a mitad de contrato (9Mf) | 21% | el 25% de diseño de 9M, o su re-base |

- **La causa principal es la longevidad.** El nivel mediano no cae con la edad (80-83 de los 24 a los 34), así
  que el mercado nunca deja de ofrecerte y el final por mercado de K5-C no llega. En 17 años cualquiera gana todo:
  títulos, top 20 y algún Mundial.
- **Lo que hay que mover primero** es la curva de edad del nivel y el umbral del mercado que te retira. Con
  carreras de 4-10 años, las tasas de títulos y de top 20 bajan solas. Lo que no baje se ajusta después:
  - la fuerza de los clubes de tier 1 que te ofrecen;
  - el calibre por cuantil de D78;
  - la dificultad por región.

**Paso 1 — un worker (instrumento):**
- **Las métricas reales del Mundial** reemplazan a los proxies (`proxyAntesDeK5`):
  - gana un Mundial (títulos reales en `registro.internacionales`);
  - nuevo Faker real;
  - P(2 o más | 1) real;
  - "tu equipo es claramente el más fuerte del Mundial y lo gana" (§K.3a, ~50%).

  Todas por región y por nivel pico (el top 3%).
- **El embudo por estrategia y por región**, con el nivel mediano por edad (la curva que hoy es plana).
- **Un barrido de bloque C** (`k5c/barrido.mjs`, sin trackear). Aplica overrides en memoria de:
  - las curvas de edad;
  - el umbral de splits sin oferta en tu tier;
  - `cuantilCalibreDeLiga`;
  - la oferta de los clubes de tier 1;
  - la `dificultad` por región;
  - la edad de retiro forzoso.

  Reporta el embudo de §K.3b, la longevidad y el Mundial real para `criterio`, `azar` y `malas`.
- **Los nombres reales de esas perillas en `balance.js`**, y cuáles son estructura.

**Paso 2 — el supervisor.** Corre los barridos de a uno (la máquina anda justa de memoria) y elige. La longevidad
va primero, después el resto, con el criterio de K3c: cumplir con el valor más cercano al actual.

**Paso 3 — un worker:**
- fija los valores;
- las metas de §K.3a y §K.3b pasan a checks duros;
- vacía la PENDIENTE C de longevidad y cierra `BLOQUES_DE_CORRIMIENTO.C`;
- **fija los cortes definitivos de los niveles de K1** con la distribución nueva;
- re-mide los cuantiles del percentil;
- `HUELLA_JUEGO` 'K5c';
- sube el guardado si cambia la forma.

**Después, K6.** Tres carreras jugadas en el navegador.

**Paso 1, hecho** (`k5c-instrumento`: `1f0f7eb`).
- **Lo que mide nuevo.** El Mundial real (total, por región y por nivel pico), la curva de nivel por edad y el
  barrido `k5c/barrido.mjs`.
- **Hallazgos:**
  - `retiro.splitsSinOfertaEnTierParaBifurcar` vale **99**, o sea que el final por mercado de K5-C está apagado;
  - la `dificultad` no mueve la simulación (la mueve el `prestigio`);
  - tu equipo nunca es "claramente el más fuerte" del Mundial: el margen contra el mejor rival tiene mediana
    −16;
  - un bug del motor: al volver del retiro el calendario se rebobinaba y se jugaban dos Mundiales con el mismo
    año. Se arregló en `ccdd2dd` y `c4db90a`: volvés con la edad y el año reales, y si volverías con 34 o más, la
    ventana se cierra sola.

**Paso 2a, el análisis** (un Opus con el barrido; `criterio` 300 × 60). **Con constantes solas la carrera pro
mediana no baja de ~10 años.** Por qué hoy dura 17:
- **Cómo terminan las carreras:**
  - el 59% llega a la línea de los 34;
  - el 15% se retira por el aviso de declive, a los 32;
  - el veredicto del mercado no se dispara nunca.
- **El nivel no cae.**
  - Los stats acumulativos (macro, shotcalling, adaptabilidad) pesan entre el 34% y el 60% del nivel según el
    rol, no tienen declive y llegan a 100.
  - El bonus permanente de la práctica (15,6 puntos de mecánica a los 34) compensa el declive del resto.
- **El mercado nunca te deja sin ofertas.** Los veteranos se van de import a ligas de calibre ~50, y la red de
  franquicia los rescata.
- **Nadie se estanca.** Con 17 años de carrera todos llegan a tier 1.
- **El título doméstico cuenta también los de tier 2.**

La mejor configuración de constantes ("D") deja:

| Métrica | Valor |
|---|---|
| Carrera pro (mediana) | 10,3 años |
| Llega a los 34 | 9,3% |
| r(potencial, duración) | 0,38 |
| Estancados (`malas` 25%, `criterio` 9%) | 9,3% |
| Llega a tier 1 | 66% |
| Título | 74% |
| Top 20 | 46% |
| Gana el Mundial | 3,7% |

**Decisión del usuario (2026-10-03): estructura y después calibrar.** Una ronda de estructura del bloque C antes de
las constantes (regla 2), en cuatro piezas:
- **K5c-E, el desgaste.** Pasado el pico, los stats acumulativos y el bonus permanente se gastan con la edad: el
  techo de cada stat acumulativo sigue la curva de edad, o el bonus decae una fracción por año. Sale con
  constantes neutras (comportamiento idéntico) y las fija el paso 3.
- **K5c-R, la presión de retiro.** Un jugador que se queda en tier 2 recibe la bifurcación de retiro cuando pasa N
  años sin ofertas de tier 1 desde cierta edad, con el motivo dicho. El veredicto del mercado deja de estar
  apagado. Los años pro se cuentan desde el primer contrato de tier 2 o tier 1, no desde tier 3: en el
  instrumento y en la tarjeta, con su línea de la regla 17.
- **K5c-M, la élite se busca.** Las orgs fuertes le ofrecen a los jugadores de élite: la fuerza del club que te
  ofrece crece con tu nivel. Hoy te ofrecen clubes de tier 1 débiles de cualquier región. Así tu equipo puede ser
  el más fuerte del Mundial cuando sos el mejor, que es la meta de §K.3a (~50%). Va **por el mercado**, no
  cambiando la fórmula de fuerza del bloque A.
- **K5c-T, el título que cuenta.** "Gana un título doméstico" cuenta solo los de tier 1 (§K.3b: "~30%").
  Los de tier 2 se reportan aparte. Es solo instrumento, con su línea de la regla 17.

Después, el barrido del supervisor con la configuración D como punto de partida, y el paso 3.

**Guardado:** K4c va a main con `VERSION` 11. Si las piezas cambian la forma, el paso 3 de K5c sube a **12**,
con `FORMAS_CONOCIDAS[11]` igual al de main.

#### K5c — decisiones de spec de la estructura *(supervisor, 2026-10-04; revisables)*

**Antes, K4c a main.** La validación completa final de K4c (`a37cb56`) dio 421 OK, 1 PENDIENTE C y **2 FAIL**;
`simulate.js 1000` dio 0 crashes y el build quedó en 2125/2200 KB. Los dos FAIL estaban en verde en `b33ff0c` y
ninguno de los dos checks cambió: son corrimiento de muestra en el borde de la banda, causado por los arreglos de
la revisión (`3882039`, el enfriamiento del cierre de año, cambia las tiradas del resto de la carrera; `17c11e5`, la
prueba fallida; `4732e1b`, sin plan amateur).
- **`proyeccionJerarquia`:** sesgo de 3,3 contra un tope de ±3 (n = 279, error estándar 0,31; las dos mitades de
  seeds dan 3,47 y 2,92). Si la deriva que suma la proyección (`BALANCE.roster.derivaPrimerSplit`) solo mueve lo que
  muestra la carta, se recentra (regla 15: la carta promete lo que hace el motor), con la huella idéntica. Si mueve
  el motor, se re-basea la banda con su línea de la regla 17.
- **El boost del pool no se clava en el centro:** separación de 0,078 contra un piso de 0,080 (K2c midió 0,082;
  cada mitad de seeds da 0,080 y el valor salta de a ~0,002). El piso baja a 0,35 × el rango, con su línea de la
  regla 17.

**El nombre del nivel más alto es "El GOAT", definitivo** (confirmado por el usuario el 2026-10-04). Se borra la
marca de provisorio.

**Las cuatro piezas** salen de `c4db90a` (`k5c-instrumento`) en worktrees paralelas. Cada perilla nueva sale
**neutra**, con la huella del motor idéntica a 992471283, y se lee en el momento de usarla, no al importar el
módulo, para que `k5c/barrido.mjs` la pueda pisar en memoria. Las fija el paso 3 con el barrido.

- **K5c-E, el desgaste** (`systems/atributos.js`, `core/curvas.js`, `BALANCE.atributos.desgaste`).
  - **Los acumulativos.** Pasado `oculto.edadPico` más una gracia, macro, shotcalling y adaptabilidad pierden un
    término determinista por split, sin `rng`. Va después del `max(0, …)` de `moverStatsAcumulativos`, para que
    `permiteBajar: false` no se lo coma.
  - **El bonus permanente** (mecánica, laneo y teamfight) decae una fracción por split pasado el pico. Lo que se
    pierde se escribe como marca de desgaste, para que siga valiendo bonus = Σ marcas.
  - **Se ve** en la ficha ("Lo que construiste": lo que te sacaron los años) y en una línea del resumen del split
    la primera vez que muerde.
  - **Checks:** nadie se gasta antes del pico más la gracia; un veterano baja; el invariante de las marcas se
    mantiene; el texto aparece. Todos con la perilla encendida en memoria.
- **K5c-R, la presión de retiro, y K5c-T, el título que cuenta** (una sola pieza: las dos tocan el mismo bloque
  del instrumento).
  - **El contador.** Splits jugados en tier 2 desde `retiro.presionTier2.edadDesde`, que solo resetea una oferta de
    **tier 1**. Avanza también con contrato; la bifurcación llega en la próxima ventana de mercado abierta, con su
    motivo ("Tenés N años, llevás X en <liga> y ninguna org de primera te llamó"). Las opciones son retirarte o
    seguir en tier 2, y seguir resetea el contador. Reusa la bifurcación del final por mercado de K5-C. Perillas
    neutras en 99. El contador entra al guardado con su check de forma.
  - **Los años pro** se cuentan desde el primer contrato de tier 2 o tier 1, no desde tier 3: en el instrumento,
    en sus recuentos independientes, en el puntaje (`aniosProDe`) y en la caja "Años" de la tarjeta, con su línea
    de la regla 17. Es lo único que puede mover `HUELLA_JUEGO` (porque entra al puntaje), en su propio commit y
    con la razón dicha.
  - **El título doméstico** del embudo cuenta solo los de tier 1. Los de tier 2 se reportan aparte.
  - **Checks:** con la perilla encendida, la bifurcación llega con el motivo en el log, el estado y la tarjeta; una
    oferta de tier 1 resetea el contador; los años pro no cuentan tier 3; un título de tier 2 no cuenta como
    doméstico. Los checks de K5-C siguen en verde.
- **K5c-M, la élite se busca** (`systems/mercado.js`, `core/demanda.js`, `dev/estrategias.js`).
  - **La fuerza ordena la mano.** El orden de la mano de ofertas suma un término `k × f(nivel) × fuerza del club`:
    con nivel de élite, los clubes fuertes van primero. Con `k = 0`, la mano y las tiradas quedan idénticas.
  - **Los clubes fuertes abren asiento** para la élite, si hace falta. Solo si con la perilla neutra es un no-op
    exacto: esa ruta congela asientos y correría el stream.
  - **No se toca la fórmula de fuerza del bloque A.**
  - **El bot `criterio`**, entre ofertas del mismo tier, prefiere el club más fuerte cuando su nivel es de élite
    (es instrumento).
  - **Se ve:** la carta de oferta dice dónde está el plantel ("el más fuerte de LCK", "mitad de tabla"), con datos
    del motor.
  - **Checks:** con `k > 0` en memoria, la fuerza mediana de los clubes de tier 1 que le ofrecen a la élite sube y la
    del jugador medio casi no cambia; la carta coincide con el motor.

**Después:** se integran las piezas sobre `k5c-instrumento` (con K4c ya mergeado), hay una revisión de motor que
incluye el arreglo del calendario (`ccdd2dd`, `c4db90a`, que no tuvo revisión independiente), y sigue el barrido
del supervisor desde la configuración D. Orden de las perillas: la longevidad, la élite, el Mundial por región, y
los títulos y el top 20.

**K4c, mergeada** (`23400cd`). `2ff21e3` cerró los dos FAIL de borde: `derivaPrimerSplit` 3 → 6, que es cosmético
(sesgo +0,3, huella idéntica; el mutante en 10 da −3,7), y el piso del pool en 0,35. La validación completa del
supervisor dio 423 OK, 1 PENDIENTE C y 0 FAIL; `simulate.js 1000` dio 0 crashes y el build 2125 KB.

**La estructura, hecha e integrada** (`k5c-instrumento` @ `ccbaf14`: E `330a67d`; R+T `b9bd140`, `8d6a049`, `f7b7ffc`;
M `b57a9de`, `a26fe1b`).
- **El guardado** pasa a `VERSION` 12. `FORMAS_CONOCIDAS[11]` vuelve a `13dd79e086e2`, el de main: `c4db90a` lo había
  cambiado sin campos nuevos, porque el hash depende de las carreras de la muestra.
- **`HUELLA_JUEGO`** pasa a 579585404, solo por el eje de años pro de la leyenda.
- **M midió que hacía falta abrir asientos.** Con k solo, un club top-5 del mundo aparecía en 1 de 112 manos de
  élite. Con k más la rebaja, en 24 de 106. El jugador medio no se mueve (56 → 56).

**La revisión de motor: OK con observaciones menores.**
- **Neutralidad:** 60 seeds × carrera entera, idénticas split por split contra `c4db90a` (rng, edad, año, tier,
  org, stats y logs).
- **Mutantes:** 21 de 24 en rojo.
- **Se arregla, por decisión del supervisor:**
  - la guarda de los 34 en la vuelta tiene su check;
  - los años pro no cuentan la ventana de retiro: `relojAlVolver` la sumaba;
  - un import de tier 1 que te ofrecen resetea la cuenta de la presión aunque lo rechaces (regla 15);
  - r(potencial, duración) se cuenta desde tier 2;
  - **la rebaja de M se parte en dos perillas topeadas.** Con el mérito nunca quedás debajo del NPC; con la
    disputa, nunca peor que la alternativa. "El club se estira por una estrella" vale hasta la paridad, y el texto
    del motivo lo dice;
  - dos checks que no daban rojo.
- **Notas para el barrido:**
  - la presión de tier 2 solo muerde en carreras estancadas: en carreras normales siempre llega una oferta de
    tier 1;
  - su umbral tiene que quedar por encima de `splitsPorEdad` (3), o la bifurcación sale todos los años.

**El barrido** (supervisor, dos lotes; después un analista Opus con unas 50 corridas y 3 finalistas, cada una con
`criterio` 1200 y `azar`/`malas` 300). La mejor finalista, F2, sale de D más: el desgaste (0,5 / 0,5 / 0,3, aceleración
0,3, bonus 0,08), la presión de tier 2 (20 / 4), M (k = 1e5, rebaja 4), `castigoEtarioNivel` 100,
`factorRenovacionDeclive` 0, `aniosContratoMax` 2, `pesoJugadorEnEquipo` 0,8 y `fuerzaOrgSpread` 6.

| Métrica | Hoy (base) | F2 | Meta |
|---|---|---|---|
| No llega a pro | 24,7 | 21,6 | ~20 ✅ |
| Estancados (`azar` / `malas`) | 0 | 12,9 (27 / 29) | ~10, `malas` ≫ `criterio` ✅ (a medias) |
| Tier 1 | 75 | 65 | 55-65 ✅ |
| Título de tier 1 | 71 | 61 | ~30 |
| Top 20 | 63 | 41 | ~15 |
| Años pro (mediana · p10 · p90) | 14,5 · 11 · 17 | 8 · 4 · 12 | ~4-6 |
| Llega a los 34 (`malas`) | 80 | 1,6 (27) | < 5 ✅ en `criterio` |
| r(potencial, duración) | 0,22 | 0,59 | > 0,32 ✅ |
| Gana un Mundial (`azar`) · Corea / NA | 12 | 6,2 (3,0) · 7,1 / 4,1 | ≥ 7 · 12-15 / 3-5 |
| Nuevo Faker · en la élite | 3 | 1,0 · 14 | ~2-3 · ≥ 30 |
| P(2 o más \| 1) | 0,25 | 0,15 | ≥ 0,35-0,40 |

**Por qué no llega cada meta** (medido por el analista):
- **La duración.** El primer contrato llega a los 19 (no a los 17) y el debut en tier 1 a los 19-20. El castigo etario
  también muerde en la disputa del ascenso: por eso es hoy *la* fuente de los estancados, y acortar la carrera con él
  vacía el tier 1. Con contratos de 1 a 3 años se juega 1-2 años más después de que el mercado se cierra.
- **El título de tier 1 en ~30% es imposible por estructura.** Hay un título por liga y por año, y el equipo del
  protagonista gana entre 4 y 5 veces lo que un equipo promedio de 10. Aun con la tasa justa, 6 años en tier 1 dan
  47%.
- **El top 20** es un "alguna vez" y sigue a los años en tier 1. Solo baja si se vacía el tier 1.
- **El Mundial** es apariciones × la tasa por aparición. La tasa es de 1,2-2,5%, contra el 6,25% justo (1 de 16),
  porque los mejores clubes de LCK y LPL están cerca del tope de 99 y tu equipo queda entre 17 y 24 puntos abajo.
  Acortar la carrera saca apariciones.
  - Lo que lo mueve es `pesoJugadorEnEquipo` (0,5 → 0,8: tu nivel pesa más en tu equipo). Es una constante del
    bloque A, que está cerrado.
  - M no alcanza: las reglas de import bloquean 2 de cada 3 pares, y con k = 3e5 no cambia nada.
- **P(2 o más \| 1).** El que llega al Mundial como el más fuerte por 0-10 lo gana el 23-27% de las veces, por la
  varianza del formato (`sigmaMapa` 17,7, del bloque A). No hay dinastías.
- **"Claramente el más fuerte gana ~50%"** pasa en el 0,1% de los Mundiales (3 de ~2.300) y ganó 3 de 3. No es un
  problema real.

**Decisiones** *(supervisor, 2026-10-04)*.
- **Se fijan en lo medido** (eran propuestas de §K.3, que dice "cada calibración las fija"; cada una va a su check
  duro con su línea de la regla 17):
  - carrera pro mediana **~7 años** (del contrato a los 19 al retiro a los 26, con unos 6 en tier 1), p10 ≥ 3 y
    p90 ≤ 13;
  - título de tier 1 **~55-60%**, por la razón de arriba;
  - top 20 **~40%**;
  - P(2 o más \| 1) **~15%**, por la varianza del formato del bloque A;
  - "claramente el más fuerte" se reporta, pero no es check.
- **El Mundial ≥ 7% es una decisión del usuario (D-D): no se baja a lo medido.** Primero se agotan los medios:
  1. `pesoJugadorEnEquipo` 0,8 entra **solo si las metas duras del bloque A siguen en verde** (r de la misma liga, R²
     sin ruido, Bo5 del favorito, mentalidad y hype). Va con su línea: "el nivel manda" pesa más.
  2. **K5c-N, el local juega en casa** (estructura, perilla neutra). En su propia liga el nativo no paga el cuantil de
     calibre en la alternativa del asiento; el import sí. Así un coreano de élite entra a un club fuerte de LCK, y la
     región separa el Mundial (Corea más, NA menos) sin abrir el tier 1 al resto.
- **K5c-A, el ascenso** (estructura, perilla neutra). El castigo etario en la disputa del ascenso a tier 1 se multiplica
  por su propia fracción, para poder acortar la carrera sin vaciar el tier 1 ni inflar los estancados.
- **K5c-V, el veterano de tier 2** (estructura, perilla neutra). Con `malas`, entre el 20% y el 34% de las carreras
  siguen en tier 2 hasta los 34: el mercado de tier 2 renueva para siempre. Desde una edad, el mercado de tier 2 le
  aplica el castigo etario también a la renovación. La sesión de una carrera fallida tiene que ser corta (§K.3c).

#### K6a — el ensayo de K6 y lo que hay que arreglar antes *(supervisor, 2026-10-04)*

**El ensayo.** Un agente jugó en el navegador dos carreras sobre `75e7ed5`, con las perillas neutras y el ritmo de K4c:
- **A**, a mano en lo importante: 92 paradas, 7 Mundiales, 854 puntos, "Figura Mundial", retiro a los 34;
- **B**, siempre la primera opción: 38 paradas, nunca firmó, 16 puntos.

Cero errores de consola. Lo que funciona: la previa desglosa la p y la p sube con el nivel; las derrotas con p declarada se
sienten justas; el 2-2 del Swiss (42% guardando la charla del coach contra 67% usándola) es "la mejor decisión del juego";
A le saca 854 a 16 a B.

**Lo que haría fallar a K6, por queja:**
- **"Hacés un clic y perdiste" (peor: con cero clics).** El minijuego de la prueba arranca apenas aparece la carta
  (blancos de 900 ms) y se pierde mientras leés. Además, una prueba clavada ("95% de que te firmen") termina en "SIN
  EQUIPO · 0 partidos" sin ninguna explicación, y el cierre dice "ya jugaste una temporada entera como profesional". La
  charla familiar "salió mal" sin ninguna p.
- **"Te frena solo en lo importante", incumplido.** Dos títulos de LRS con cero paradas. La final del CBLOL perdida 0-3
  sin frenar. Unos cuartos de playoffs presentados como "Serie sin nada en juego".
- **"RNG clicker" (en parte).** El amateur abre con "El dado trajo cuatro caminos", el cierre de año etiqueta todo como
  RULETA sin ninguna p, y una sola semana dio +613 LP.
- **"Las opciones no afectan nada" (en parte).** El perfil decide solo cosas grandes: rechazó los dos proyectos juveniles
  de B, que nunca firmó con nivel 74 y Gran Máster. Hay bifurcaciones sin descripción ni efectos ("Pasarte a
  nocturno", "Máster: la charla"), y resultados que nunca aparecen en el feed (los tryouts abiertos, el receso de VODs).
- **Credibilidad (regla 15).**
  - La previa era contra RED Canids y el resultado dice "GANARON vs PAIN GAMING".
  - "Si ganás, entrás a playoffs" y después "7º de 8".
  - "Clasificaron al torneo de mitad de año" con el equipo 7.º.
  - Las 6 cartas de oferta repiten líneas que se contradicen ("casi nunca vas a elegir tu campeón" junto a "margen para
    mandar vos").
- **Bugs:**
  - "Mirfin90: 0 trofeos contra tus 0 — vas ganando el duelo", todos los años;
  - el LP crudo en el cierre de año (en vez del rango);
  - la barra de arriba dice "PRETEMPORADA" durante partidos decisivos;
  - el panel de la serie muestra la final doméstica durante el Swiss;
  - "te faltan 1 puesto";
  - "hace años de eso" sobre el año anterior;
  - las fichas de campeón solo con las iniciales;
  - `?seed=` con texto se ignora sin avisar.
- **El amateur es una carta.** "Cómo vivís la semana" sale en 22 de 38 paradas en B.

**Decisiones.** Se arregla todo antes de K6, en tres piezas paralelas sobre `k5c-instrumento`, que se integran antes
del paso 3 de K5c (así el barrido final mide el juego que se va a jugar):
- **K6a-M, motor y ritmo** (Opus):
  - **Toda serie de playoffs y toda final frena** (D-B: los playoffs son lo importante), en tier 1 y en tier 2. El
    umbral de "sin nada en juego" no puede aplicarse a una serie de eliminación.
  - **La prueba:** si la clavaste y no firmaste, se dice por qué; si firmaste, se juega.
  - **La previa nombra al rival que se juega.**
  - **"Clasificaron"/"si ganás entrás"** solo con la tabla que lo respalda.
  - **Los checks:** ninguna final ni serie de eliminación sin parada; la previa con el rival del resultado; la
    prueba clavada con su desenlace dicho.
  - **Las metas de ritmo de §K.3c** se vuelven a medir con su línea de la regla 17, si cambian.
- **K6a-U, UI y textos** (Sonnet):
  - **El minijuego espera un "¡Vamos!"**: no arranca solo;
  - la barra de fase dice la fase real;
  - el panel de la serie se limpia en el Mundial;
  - las fichas de campeón muestran el nombre;
  - `?seed=` con texto se convierte en un número por hash y lo dice;
  - el rango en lugar del LP crudo;
  - plurales;
  - "hace años" según la distancia real;
  - el archirrival en 0-0 no "va ganando";
  - las líneas de la carta de oferta son coherentes entre sí.
- **K6a-A, el amateur y las decisiones** (Opus):
  - "Cómo vivís la semana" deja de ser la parada de cada semana: se resuelve por perfil, y frena solo cuando hay
    una decisión con algo en juego (D-B);
  - fuera los textos de "el dado" y "RULETA": la opción muestra qué arriesga y qué gana, igual que el cierre de
    año;
  - una oferta (proyecto juvenil, scout, tryout) nunca la resuelve el perfil: frena como bifurcación;
  - toda bifurcación con descripción y con efectos dichos;
  - el resultado de cada decisión aparece en el feed;
  - la primera opción no puede ser retirarte (orden).

**K6a-U, hecho** (`k6a-ui` `87c7a3f`, huella intacta, 17 mutantes en rojo).
- El minijuego espera un "¡Vamos!".
- La fase se toma de `core/vistaDeCarrera.js`.
- El Mundial tiene su propio panel de Swiss.
- `?seed=` con texto pasa por `hashCadena`.
- Hay rangos, plurales y "hace N años".
- Las líneas de la carta de oferta salen del mismo dato del plantel, y la carta muestra el "por qué te quieren", así que
  la pieza M se ve.
- La revisión de navegador de la estructura dio "OK con observaciones menores", y sus textos entraron acá.
- **Deuda (D80):** la ficha dice "ÉLITE" desde nivel 62 y el mercado trata como élite desde 80. Es vocabulario, no un
  bug. Se revisa con los cortes definitivos de los niveles en el paso 3.

**K6a-M, hecho** (`k6a-motor` `6dd29d0`).
- **Las causas:**
  - el umbral de "sin nada en juego" (6) se tragaba finales y cuartos;
  - la prueba clavada sí firmaba, pero el tier 3 se disolvía antes de jugar un partido;
  - la previa leía `calendario[i-1]` del estado del momento de dibujar;
  - "si ganás, entrás" se prometía en splits que no siembran playoffs.
- **Decisiones del supervisor:**
  - **el tier 2 tiene final:** el top 2 juega un Bo5 con plan, y el título de tier 2 deja de ser el primero de la
    tabla;
  - **el tope de T9 del Mundial se queda:** el plan de cuartos y semis lo puede elegir el coach, y la final siempre
    frena;
  - **las metas de ritmo que rompe** (interrupciones 95 contra ≤ 90, playoffs p90 6 contra ≤ 5, internacional p90 7
    contra ≤ 5, Δp de plan 4,7 contra ≥ 5) **no se re-basean todavía.** K6a-A saca la carta semanal del amateur, que
    era la mayoría de las paradas tempranas, y se miden juntas después de integrar. Lo que siga roto se decide con lo
    medido y con su línea de la regla 17;
  - el check K5c-M (a2), "al menos el doble", es frágil a la muestra (20 → 30 con el stream nuevo): se arregla en la
    integración.

**La integración de K6a** (`k5c-instrumento` @ `dd0758a`).
- **Lo que trae:** los tres merges, la huella y la forma juntas, los checks de muestra en ronda y la ventana de retiro
  una vez por año.
- **Lo que verificó el supervisor:**
  - `--rapido` 311 OK y 0 FAIL, con la huella OK;
  - el ritmo junto (`criterio` 400 × 60): mediana de interrupciones ≤ 90 OK, minijuegos, tiempo y bifurcaciones OK.
- **Lo que rompe:** splits de playoffs p90 **7** e internacionales **8** (meta ≤ 5), y Δp de plan **4,71 pp** (meta
  ≥ 5).
- **La causa:** ahora frena toda serie de eliminación, también la cantada, donde el plan casi no mueve la p. Eso es la
  queja "las opciones no afectan nada".

**Decisión del supervisor (K6a-R, el ritmo de la eliminación)** — una serie de eliminación frena en lo que decide:
- **Toda final** (doméstica, de tier 2 o del Mundial) frena en el plan.
- **Una serie de eliminación abierta** (p de serie entre `pAbierta` y 1 − `pAbierta`) frena en el plan.
- **Una serie de eliminación cantada no frena en el plan.** El coach lo arma y el feed lo dice sin mentir: "sos amplio
  favorito: el coach arma el plan; si se aprieta, te llamamos". Sí frena en el mapa decisivo si la serie llega a él.
  Ninguna serie de eliminación se dice "sin nada en juego".
- **El tope de un split con Mundial** (T9) sigue.
- **Se mide de nuevo.** Si una corrida profunda legítima (cuartos, semis y final abiertos, con mapas decisivos) no
  entra en ≤ 5, se fija en lo medido con su línea de la regla 17.

**K6a-R, hecho** (`k6a-ritmo` `5a0b7fd`).
- **El valor:** `pAbiertaEliminacion` 0,3. Es el primero con margen: con 0,25, el 10,0% de los splits de playoffs pasa
  de 5 paradas, justo en el borde.
- **El ritmo** (`criterio` 400 × 60):
  - mediana de interrupciones 72;
  - p90 por split 2 / **5** / 6 (regular / playoffs / Mundial);
  - Δp de plan **5,7 pp**;
  - minijuegos 5;
  - tiempo-máquina 5,6 min.
- **El split de Mundial no entra en ≤ 5 con ningún valor razonable.** Ni con todas las series cantadas (7,9% de los
  splits pasan de 5). Suma el cierre de año, el plan de la final doméstica y hasta 4 paradas del Mundial bajo T9.
- **Decisión del supervisor: la meta del split internacional queda en ≤ 6**, lo medido, con su línea de la regla 17.
  Es coherente con K5: el Mundial solo no pasa de 4, y lo que se suma son la final doméstica y el cierre de año, dos
  paradas importantes por derecho propio. La aplica el paso 3.

#### K5c-H — cada uno juega en su casa *(decisión del usuario, 2026-10-04)*

**Por qué.** Con F2 sin el `pesoJugadorEnEquipo` 0,8 (que rompe el R² del bloque A desde 0,6), el Mundial queda en
1-3%, y ni N, ni A, ni V lo mueven. Una investigación (sonda de 400 carreras y 799 Mundiales) encontró la causa:
- **La fórmula no es.** En un club de fuerza F, tus compañeros valen F+1 y tu equipo vale F+13,7.
- **Es dónde jugás.** El 78% de las temporadas de tier 1 son en CBLOL o LCP, y solo el 18% en la liga de tu región. Un
  coreano juega el 12% de sus temporadas en LCK y el 54% en CBLOL. Desde CBLOL y LCP se ganaron 0 de 672 Mundiales;
  desde LCK, 13%; desde LPL, 23%.
- **Encima, en un club de élite tu jerarquía es baja (~20)**, el factor queda en 0,904 y jugás 9 puntos debajo de tu
  nivel. El rival NPC vale el promedio de sus niveles, sin jerarquía.
- **Con la jerarquía neutra en el Mundial** (medido con un hack): el Mundial pasa de 1,9 a 3,1%; en el mejor club del
  mundo, "el más fuerte" pasa de 17 a 41%; la élite gana de 13 a 24%. La meta del bloque A sigue en verde (R² 0,549).

**Decisión del usuario (textual):** *"si sos coreano y bueno debutás en tu liga, si no sos tan bueno te vas a otra
dependiendo de qué tan bueno seas, también eso se ve un toque en LCK Challengers"*. Es la opción "cada uno juega en su
casa", frente a fijar la meta del Mundial en lo medido. Confirma la decisión de J.2: *"la región ES la dificultad"*.

**La spec.**
- **La escalera por nivel, desde tu región.**
  - **Alcanza para tu liga de tier 1:** jugás en casa. Los clubes de tu liga te ofrecen antes que a un import, y un
    jugador que alcanza su liga no termina en una más débil.
  - **No alcanza:** la de tier 2 de tu región (LCK CL para un coreano), o un import a la liga de tier 1 que le
    corresponde a tu nivel ("dependiendo de qué tan bueno seas"). Un coreano que no llega a LCK puede ir a LCK CL, a
    LCS o a CBLOL.
  - **Desde una región débil:** un jugador de élite sube como import a una liga más fuerte. Es la puerta de K4-C2.
- **El bot `criterio`.** Toma tier 1 en casa si se la ofrecen. No deja su liga de tier 1 por una más débil. Va de
  import a una liga más fuerte por el calibre, como hoy.
- **En el Mundial la jerarquía no cuenta,** igual que para el rival NPC. Es una sola función de fuerza de Mundial para la
  previa, el Swiss y el bracket, con su perilla `mundial.jerarquiaCuenta`. La previa lo dice (regla 12).
- **Primero el diagnóstico con sondas:** ¿por qué un coreano de nivel X termina en CBLOL? ¿Falta oferta de LCK, o es
  una elección? El arreglo va donde está la causa: el mercado, el bot o los dos.
- **Las métricas nuevas del instrumento:** el % de temporadas de tier 1 en casa, por región y por nivel, y el Mundial
  por región.
- **Checks:**
  - un coreano de nivel alto juega la mayoría de sus temporadas de tier 1 en LCK;
  - uno de nivel medio, en LCK CL o afuera;
  - uno de élite de una región débil puede subir como import;
  - el Mundial con la previa, el Swiss y el bracket pasa por la misma función.

  Todos con su mutante.
- **Bloque C, con corrimiento declarado.** Lo que se mueva en el embudo lo fija el barrido final.

**K5c-H, hecho** (`2c61ed5`; las perillas son neutras y la huella no cambia, salvo por el bot, que es instrumento).

*El diagnóstico (es el mercado, no el bot).* Un coreano de nivel 85-90 ve una oferta de LCK en el 18% de las ventanas.
De 620 chequeos de club, en 273 no había asiento y en 314 perdió la disputa. Lo que decide la disputa es el castigo
etario de la configuración D: 12 puntos a los 22 y 60 a los 26. A los 21 o menos el coreano está en 62-71, contra
una vara de LCK de ~83. Cuando llega a 88, a los 24 o más, el castigo lo deja afuera. CBLOL (vara ~55) lo toma, y
ahí se queda.

*Lo que cambió:*
- **El mercado:** `ligaDeCasa`, `alcanzaTuLiga` y `clubDeCasaQueTeHaceLugar`.
- **El Mundial:** `fuerzaDeMundial` para la entrada, el Swiss, la previa y el bracket, con la perilla
  `mundial.jerarquiaCuenta`.
- **El bot `criterio`:** prefiere una liga más fuerte a la que llega (solo la élite), después la casa, después una no
  más débil.
- **Las perillas:** `mercado.casa.margenAlcanza` (neutra 99) y `mercado.casa.fraccionCastigo` (neutra 1).

*Medido* (G0 + `criterio`, 600 × 60):

| | G0 | casa 0 / castigo 0 / jerarquía off | casa 0 / castigo 0,25 / jerarquía off |
|---|---|---|---|
| % de tier 1 en casa | 16 | 77 | 59 |
| Mundial total · KR/NA/EU/CN | 1,7 · 3/0/1/3 | **8,0** · 9/7/13/10 | 2,8 · 4/1/4/2 |
| Años pro, mediana (p90, % a los 34) | 7 (11, 1) | 11 (15, 21) | 8 (13, 5) |

Con la casa encendida, el Mundial llega al 7%, pero en parte porque la carrera se alarga. El barrido final busca la
frontera: un castigo etario menor con la casa encendida, y la carrera acortada por el desgaste y la presión. Si el
Mundial ≥ 7% fuera incompatible con una carrera de ≤ 9 años, el compromiso lo decide el usuario, con la frontera
medida.

**La integración final de la estructura** (`k5c-instrumento` @ `2d8eec2`: K5c-H + K6a-R, sin conflictos). `--rapido` 315
OK y 0 FAIL, `HUELLA_JUEGO` 860000955, `FORMAS_CONOCIDAS[12]` '403b78edfe30'.

**El barrido final** (analista, `criterio` 1500 × 60; las seeds 1-600 salen "con suerte": 7,2% en 600 dio 5,4% en
1500). Las dos finalistas son G0 + casa (margen −4 / castigo 0 / jerarquía off) + desgaste (pérdida 1,5 / 1,5 / 0,9,
aceleración 1,0) + `anchoBajada` 3 + prestigio LCK 97, y difieren en el oeste: Final1 lleva LEC 75 / LCS 65 y Final2,
LEC 73 / LCS 62. Los JSON completos están en `scratchpad/sw4/k5c/cfgFinal1.json` y `cfgFinal2.json`.

| | Final1 | Final2 | Meta |
|---|---|---|---|
| Mundial total | 7,7 | 7,0 | ≥ 7 ✅ |
| KR / NA / EU / CN / BR / APAC | 10,5 / 7,1 / 8,9 / 10,3 / 2,2 / 3,3 | 10,0 / 3,1 / 10,6 / 8,6 / 1,1 / 4,2 | KR 12-15, NA 3-5 |
| Nuevo Faker | 1,5 | 1,1 | ~2-3, posible ✅ |
| No llega a pro | 32,3 | 32,3 | **~20 ❌** |
| Estancados (`malas`) | 3,9 (15,3) | 3,3 (15,5) | ~10, `malas` ≫ `criterio` |
| Tier 1 | 63,7 | 64,4 | 55-65 ✅ |
| Título de tier 1 / top 20 | 47,7 / 31 | 48,3 / 32,3 | (se fijan en lo medido) |
| Años pro, mediana (p90) / llega a los 34 | 9 (13) / 4,7 | 9 (13) / 5,5 | ≤ 9 / < 5 |
| r(potencial, duración) | 0,39 | 0,40 | > 0,32 ✅ |
| Sensibilidad Mundial (`criterio` / `azar`) | 3,3× | 3,0× | ≥ 2× ✅ |

Cada número por región tiene ±2 puntos de ruido (200-340 carreras por región).

*Lo que encontró el analista:*
- **La frontera.** Las carreras más cortas bajan el Mundial. Con la casa sola, una mediana de 11 años da 7,7%; con
  desgaste y castigo, 8 años dan 4,4%; con `anchoBajada` 3 y LCK 97, 9 años dan 7,7%. La mediana de 8 años con
  `anchoBajada` y prestigio no se midió.
- **El Mundial lo ganan jugadores de 25-29 años que juegan en casa,** así que cualquier castigo etario en casa le
  saca 2-3 puntos.
- **El prestigio ordena las regiones.** Un coreano en LCK gana el ~26% de los Mundiales que juega.
  `edadCastigoRenovacionTier2` y `rebajaMerito`/`rebajaDisputa` en 8 no cambian nada.
- **"No llega a pro" da ~32%** en todas las variantes, G0 incluida. Ninguna perilla del bloque C lo mueve: se decide en
  el amateur. La sonda del propio K6a-A ya marcaba 40 de 60 firmas (~33%), pero el analista anterior medía 21,6 con
  1200. **Hay que averiguar qué lo subió** (¿K6a-A? ¿el reloj de la vuelta? ¿la región?). Es una meta del usuario (D-D).
- **`k5c/barrido.mjs` de la copia sw4 está desactualizado** (sin `splitPrimerContratoTier2` ni `splitsRetirado`). El
  analista usó `barrido_sw2.mjs`. El paso 3 tiene que medir con el instrumento del repo.

**Decisiones del usuario (2026-10-05)** *(el usuario había pedido frenar acá; estas son sus respuestas)*:
- **Final2, por ahora.** Se confirma re-midiendo con el instrumento del repo, después de los arreglos.
- **Corea: la meta nueva es el reparto de los Mundiales del mundo, no la chance por carrera.** Textual: *"estas cosas
  no tienen que ser fijas, sino que gana el que mejor players tenga, usualmente es Corea, pero si el rng hace que haya
  un muy buen team de LEC entonces LEC, solo que 10% me parece poquísimo […] tendría que ser al menos 25%
  naturalmente"*.
  - El ~10% de la tabla es otra cosa: la chance de que un jugador coreano gane un Mundial en su carrera. Queda como
    medida.
  - La meta nueva: en el mundo simulado (un Mundial por año, lo juegues o no: `systems/escena.js`, `torneo.campeon`),
    **la LCK gana ≥ 25% de los Mundiales y es la liga que más gana**. Cualquier liga con el equipo más fuerte puede
    ganar.
  - Sale de la fuerza de los planteles (prestigio, calidad de los rosters), **nunca de cupos por región**. Pasa a
    check duro en el paso 3, junto con "el más fuerte gana" de §K.3a.
- **"No llega a pro" en ~32%: se investiga y se arregla antes del paso 3** (meta D-D: ~20%). Primero se compara
  commit por commit, con las mismas seeds, desde `c6f098f` hasta `2d8eec2`, y se revisa si cambió la definición
  (K5c-R).

**Antes del paso 3, en paralelo** *(supervisor, 2026-10-05)*:
- Dos cazabugs (motor y navegador) sobre `2d8eec2`.
- La investigación de no-pro (`k5c-nopro`).
- El medidor del reparto del Mundial por liga (`k5c-mundo`, solo instrumento).

Los arreglos que salgan se mergean en `k5c-instrumento` antes de medir. Recién entonces el paso 3 re-mide Final2 a
1500 carreras con el instrumento del repo, fija los valores y cierra el bloque C. Si una meta choca con otra, lo
decide el usuario con la frontera medida.

**Lo que encontraron** *(2026-10-05; los números los re-mide el paso 3 con el instrumento del repo, regla T6)*:
- **El medidor** (`k5c-mundo`, solo `simulate.js`: bloque `mundoMundial`).
  - La LCK pasa el 25% de los Mundiales del mundo con holgura, en G0 y con Final2.
  - Pero no es "la que más gana": la LPL la empata, porque los planteles de las dos valen lo mismo.
  - Con Final2, la LEC casi nunca tiene al más fuerte del campo, así que "un muy buen team de LEC" casi no aparece.
- **El cazabugs de motor:** determinismo, guardado (ida y vuelta en cada pausa), NaN, reloj y fuerza del Mundial
  limpios. Encontró, con las perillas de Final2 encendidas:
  - **alto:** en el Mundial, la jerarquía todavía amortigua "la llamada" del mapa decisivo (`core/serie.js`, regla 15);
  - **medio:** "la casa primero" llena la mano de 6 ofertas, y la élite de una región débil no ve los imports;
  - **bajo:** el traspaso a mitad de contrato no respeta K5c-H;
  - **bajo, sospecha:** los años pro pierden un split después de una vuelta;
  - **bajo, sospecha:** la previa de la semana del amateur promete otro riesgo de casa que el que tira el motor.
- **El cazabugs de navegador:** 0 errores de consola, nada trabado, y recargar retoma bien. Bugs de texto y números:
  - el "valor" de mercado no cuadra con los contratos;
  - "tu techo era 73" con nivel máximo 82;
  - concordancia: "DE LA CIRCUITO", "título(s)";
  - la tarjeta usa la liga equivocada en el segundo internacional;
  - el chip del archirrival 0-0 desde el amateur;
  - "Internacional: sin chance" que no cambia;
  - el cierre de quien no llegó a pro.

  Y un caso para mirar: 11 años trabado en tier 2 con "no te suelta".
- **Los arreglos:** el motor va en `k5c-arreglos`, la UI y los textos en `k5c-ui2`, y el riesgo del amateur con la
  investigación de no-pro (`k5c-nopro`).
- **La causa de "no llega a pro" en ~32%** (`k5c-nopro`, bisect con las mismas seeds): es K6a-A. Desde que el perfil
  elige la semana del amateur, `leal` y `profesional` casi no juegan soloQ, y llegan tarde a la escalera alta, cuando
  el sesgo etario del scouting ya dejó de mirarlos. No es un bug ni un cambio de definición.
  - **Decisión del usuario:** el total en ~20% con una brecha acotada entre perfiles, con un piso de soloQ en
    `perfiles.json` y `scoutingSesgoEtario`. La pantalla de perfil dice cuánto grindea cada uno.
- **La validación completa de `2d8eec2` dio 8 FAIL:**
  - **dos eran de medición, arreglados en `k5c-valbugs`:** la fila de una serie después de una vuelta a mitad de
    split, y la final de tier 2 que el check no reconocía;
  - **cuatro son del paso 3:** el tier 3 dura 3 splits; el favorito gana el 86%; la monotonía por región, que cambió
    con K5c-H y se re-basa con su línea; el split internacional ≤ 6;
  - **dos dependen de no-pro:** "El que no llegó" es el 30,5%, y `malas` no queda 10 puntos peor que `azar`.
- **Corrimiento declarado (regla 17).** El split de un retiro con la temporada jugada ahora cuenta (`k5c-arreglos`,
  `retiro.js`).
  - Con las perillas neutras no cambia `criterio` ni el jugador automático, así que la huella es idéntica.
  - Sí cambia las trayectorias de `azar` y `malas` que toman la bifurcación de retiro. Una explicación probable: llegan
    un split antes a la marca de "curtido".
  - Los números de `azar` y `malas` anteriores a este arreglo (por ejemplo, la fila de estancados del barrido final)
    no son comparables. El paso 3 los re-mide.
- **La revisión de los arreglos encontró un caso:** los cupos de import de élite también saltaban para Corea, porque
  la LPL tiene a veces más calibre que la LCK. Se arregla con un margen de "claramente más fuerte", el mismo para el
  bot (`k5c-fix2`). Anotado, sin arreglar:
  - el precio de traspaso sale de `presupuestoDeDemanda`, que descuenta la edad, y el valor que se muestra no la
    descuenta;
  - el bloque `mundoMundial` cuenta los Mundiales solo mientras la carrera vive, así que pesan más los primeros años.

**El paso 3, concreto** *(supervisor, 2026-10-05)*. Base: `k5c-instrumento` con `k5c-mundo`, `k5c-arreglos`,
`k5c-nopro` y `k5c-ui2` mergeadas.
1. **Re-medir Final2 con el instrumento del repo**, no con la copia de sw4: `criterio` 1500 × 60, más `azar` y
   `malas`.
2. **El reparto del Mundial:** la LCK ≥ 25% y la primera con un margen claro sobre la segunda (≥ 5 puntos). La mejor
   del oeste puede ganar (> 0, reportado). Se mueve con la fuerza de los planteles (el prestigio de LPL/LEC), nunca
   con cupos. Si eso rompe la meta por región de la carrera, se reporta la frontera y decide el usuario.
3. **Lo que ya estaba en el paso 3:**
   - fijar los valores;
   - pasar las metas a checks duros, con bandas de ruido. Incluye la del reparto del Mundial y la del split
     internacional ≤ 6;
   - vaciar la PENDIENTE C y cerrar `BLOQUES_DE_CORRIMIENTO.C`;
   - los cortes de K1 con "El GOAT";
   - los cuantiles del percentil;
   - `HUELLA_JUEGO` 'K5c';
   - subir el guardado si cambia la forma.

**Paso 3a, hecho** (`k5c-paso3`: `44d4ab4`).
- Final2 queda fijado en `balance.js` y `leagues.json`. Además, la **LPL baja a prestigio 91**: con 93, la LCK y la
  LPL empataban el reparto del Mundial. Las variantes LPL 92-87 se barrieron, y 91 es la más cercana a Final2 que
  pone a la LCK primera con margen sin romper las metas por carrera.
- Se cumplen:
  - las metas del usuario: Mundial ≥ 7% (justo) y no-pro ~20%;
  - la LCK primera, con más del 25% de los Mundiales del mundo;
  - NA 3-5; llegar a los 34 < 5%; r(potencial, duración); los estancados de `malas` ≫ `criterio`.
- No se cumplen las de §K.3b: llegar a tier 1, el título, el top 20, P(2+ | 1), el nuevo Faker de élite, el favorito
  de un Bo5 (por arriba) y la carrera mediana (~9 años).
- Los números exactos los fija la corrida del supervisor al cerrar (regla T6).

**Decisión del usuario (2026-10-05): "cerrar y que K6 juzgue".**
- K5c cierra con estos valores. Las metas de §K.3b que no llegan se re-basan a lo medido, con su línea de la regla 17,
  y pasan a la tabla de deuda.
- Las 3 carreras jugadas de K6 dicen cuáles importan de verdad.
- Endurecer el acceso a tier 1 bajaría el Mundial, que ya está justo en 7%: es la frontera que se mide.

**Paso 3b, en tres partes:**
- **3b-1, hecho** (`873fc80`): los checks escritos con las perillas neutras como base.
  - Los de neutralidad fijan la neutra en memoria; los de efecto usan los valores reales. Cada uno tiene su mutante en
    rojo.
  - **Hallazgo:** con Final2, K5c-M (la élite se busca) no tiene efecto medible, porque "la casa primero" de K5c-H
    (la decisión del usuario) ordena antes. Su check pasa a probar el mecanismo con la casa neutra en memoria.
  - **La forma del guardado:** cambió por la muestra, no por campos nuevos. La `VERSION` 12 nunca salió de la rama,
    así que se re-registra `FORMAS_CONOCIDAS[12]` sin subir la versión.
- **3b-2:** los FAIL de comportamiento.
  - la dinastía de K5-A;
  - los años sin carta de cierre de K4c;
  - "probaste y no alcanzó";
  - las marcas de la ficha de K3-B;
  - la semana amateur que no frena con riesgo (K6a-A);
  - la muestra del check de la presión.

  Cada uno se arregla, o se re-basa con su razón.
- **3b-3:** las metas de §K.3a y §K.3b pasan a checks duros, re-basadas según la decisión. Además: la PENDIENTE C,
  `BLOQUES_DE_CORRIMIENTO.C`, los cortes de K1 con "El GOAT" y los cuantiles del percentil.
- **Al final:** `HUELLA_JUEGO` 'K5c' y la forma, la validación completa del supervisor, la revisión, el merge a
  `fase-9r`, el push y K6.

### K6 — Jugarlo *(la prueba que importa)*

Tres carreras completas en el navegador: una que se estanca en tier 2 por malas decisiones, una buena
y una de leyenda. Se leen como historias y se mide su duración. Ninguna de las quejas del usuario se
puede repetir textualmente: *"rng clicker"*, *"las opciones no afectan nada"*, *"hacés un clic y
perdiste"*, *"Worlds es una basofia"*.

**K6, jugado** (2026-10-05, sobre `76269ff`). Un agente jugó por Playwright con una heurística que solo lee la
pantalla: previas, % y cartas. Los logs, las capturas y el script están en el scratchpad de la sesión `01d16e01`,
carpeta `k6/`. Los 0 errores de consola son del juego.

| Carrera | Frenadas (decisiones / mercados / minijuegos) | Humano estimado | Resultado |
|---|---|---|---|
| "Estancada" (siempre lo peor de la previa, leal) | 86 (73/7/6) | 27-49 min | 669 · Figura mundial: 3 LEC, 3 Mundiales jugados |
| Estancada estricta (además "Esperar" ante el salto) | 67 (52/9/6) | 23-40 min | 349 · Figura mundial: 26 splits en tier 2, 0 internacionales |
| Buena (3.er intento; los dos primeros no llegaron a pro) | 75 (66/4/5) | 25-44 min | 1081 · Figura mundial: Mundial 2035 |
| Leyenda (KR, Mid) | 88 (72/5/11) | 28-50 min | 1031 · El GOAT: Mundiales 2036 y 2038 |

**Las quejas del usuario:**
- **"rng clicker": no.** Cada partido muestra su probabilidad y el desglose. La excepción es el minijuego
  `rueda_de_prensa`: el objetivo es azar sin ninguna pista.
- **"Las opciones no afectan nada": en parte.** Afectan mucho: la semana del amateur da 31 contra 1081 puntos con la
  misma seed, y la carrera con `criterio` contra jugar mal da 1147 contra 349. Pero hay cosas que dan esa sensación:
  - los mercados de **una sola carta** deciden por vos (5 seguidos);
  - el campeón del mundo al que no renuevan;
  - jugar mal igual termina en "Figura mundial";
  - los cierres de año y los "¿seguís?" de la cola son relleno.
- **"Hacés un clic y perdiste": en parte.** Un #5 del mundo pierde un año entero por un solo minijuego de prueba
  (estaba avisado).
- **"Worlds es una basofia": no.** El Swiss y el bracket se ven completos, la serie frena con el plan, el mapa 5 con su
  minijuego, y "TE LEYERON" obliga a re-planear.

**Las metas re-basadas (D80), según cómo se sienten jugando:**
- **Importan:**
  - llegar a tier 1 es demasiado fácil: hasta jugando siempre lo peor se llega a la LEC;
  - la cola de la carrera: los últimos 5-7 años en clubes del fondo, con hasta 7 frenadas de "EL MERCADO YA HABLÓ";
  - los títulos y el top 20 son demasiado comunes.
- **D81 se ve:** la élite termina en clubes que se derrumban.
- **No se notan:** el favorito del Bo5 y el nuevo Faker de élite.
- **D-B ("te frena solo lo importante")** se cumple en los partidos, pero no en la cola (15-28 frenadas después de los
  28 años, con poco en juego). La leyenda pasa la meta de frenadas: 88 contra ≤ 80, y 11 minijuegos contra 4-8.

**Bugs encontrados** (cada uno con su reproducción en `k6/`):
- **Alto, regla 15:** Fnatic, campeón del Mundial con el #3 del mundo, no le renueva. La única carta es un club del
  fondo a $60k, con récord 1-35 (seed 39). El patrón se repite en las colas de todas las carreras.
- **Alto:** "NO TE RENOVARON / De free agent", pero seguís jugando en el club y descendés con él (seed 25, 2043-44).
- **Medio:**
  - el titular de la tarjeta nombra al club de la caída ("12 SPLITS EN DPLUS KIA") y no a los Mundiales;
  - "Figura mundial" y "#5 del mundo" para una carrera de tier 2 sin internacionales;
  - el tag "PC confiscada" todavía a los 27, en la final del Mundial;
  - de dominio: hay descenso en la LEC, que es franquiciada.
- **Bajo:**
  - resúmenes de temporada que se contradicen ("Sin equipo" con "Quedaron dentro de playoffs");
  - en el duelo, "tus 6 trofeos" contra "TÍTULOS 2" en la tarjeta;
  - "Copa de la Invocación" por "Copa del Invocador";
  - un Challenger #19 con nivel 88 que nunca firma, sin que la historia lo explique.

**Lo que sigue lo decide el usuario** con este reporte: qué se arregla y qué se persigue de D80.

**Decisión del usuario (2026-10-05): la ronda K6b tiene dos partes, los bugs de K6 y la cola de la carrera.** Tier 1
más difícil y el minijuego de prensa quedan para después. Al cerrar, se vuelve a jugar K6 para comparar.

#### K6b — los bugs de K6 y la cola de la carrera *(supervisor, 2026-10-05)*

**K6b-M, el mercado premia el mérito** (los bugs altos de renovación y la carta única):
- Un jugador que viene de una temporada de élite **recibe la renovación de su club**, salvo un motivo que se dice:
  campeón de su liga o del Mundial, o top 10 del mundo al cierre. El castigo etario de la demanda no le saca la
  renovación ni lo manda a una carta de fondo. Las ofertas de los demás reflejan su nivel y su temporada.
- Constantes nuevas en `balance.js`. Los checks, con mutante: el campeón del Mundial que sigue en nivel de élite
  recibe la renovación o una oferta de su calibre, y nunca una sola carta de un club del fondo.
- Se re-miden la carrera mediana y la línea de los 34, porque premiar el mérito alarga a los buenos. Si salen de
  banda, se reporta la frontera.

**K6b-F, el contrato y la liga** (bugs alto y medio):
- "No te renovaron / free agent" quiere decir que te vas del club: no podés seguir jugando con él ni descender con
  él. Check de coherencia entre el contrato, el plantel y la ficha, con mutante.
- Las ligas franquiciadas (LCK, LPL, LEC, LCS) no tienen descenso: una marca en `leagues.json`, según
  `CONCEPTO.md` §12. Check con mutante.

**K6b-U, la tarjeta y los textos** (medios y bajos):
- El titular de la tarjeta nombra el pico (el club del Mundial o del título, y los Mundiales), no el club de la caída.
- "Figura mundial" y "#5 del mundo" no salen para una carrera de tier 2 sin internacionales. Si es la fórmula del
  ranking (motor), se reporta.
- El tag "PC confiscada" vence cuando se termina el amateur.
- Los resúmenes de temporada no se contradicen.
- En el duelo, los trofeos coinciden con la tarjeta.
- "Copa del Invocador".

**K6b-C, la cola de la carrera** (D-B en la cola). Hoy hay 15-28 frenadas después de los 28 años, con poco en juego.
- El "¿seguís?" de cada pretemporada frena solo si algo cambió: la presión de retiro, una oferta nueva o una lesión.
  Si no, sigue según el perfil y se narra.
- "EL MERCADO YA HABLÓ" frena la primera vez y cuando hay una elección real. Las repeticiones se narran.
- Un mercado de una sola carta frena solo si aceptar o rechazar se juega algo, y la previa dice qué (por ejemplo,
  rechazar = free agent, con su %). Si no, lo resuelve el perfil y se narra.
- **Meta:** ≤ 8 frenadas después de los 28 en la carrera mediana de `criterio`, y la de leyenda ≤ 80 en total
  (§K.3c). Es una métrica nueva del instrumento de ritmo, con su check.

**Cierre:**
1. La validación completa del supervisor.
2. La revisión.
3. Se re-miden las metas "K5c meta" sobre el head. Lo que se corra se declara (regla 17).
4. `HUELLA_JUEGO` 'K6b'.
5. Se vuelve a jugar K6 con las mismas seeds (25, 39, 152).

**K6b-C, primera pasada, hecha** (`k6b-cola`: `8368570`).
- Las tres reglas están aplicadas: el "¿seguís?" y "¿volvés a competir?" frenan solo si algo cambió; "el mercado ya
  habló" se repite narrado; la carta única frena solo si es una prueba o una bajada de tier. La leyenda queda en ≤ 80.
- **Pero la cola casi no se movió:** de 14 a 13 frenadas después de los 28 (`criterio`, 600 × 60). Lo que queda está
  fuera de las tres reglas, por carrera en la cola:

  | Frenada | Cuántas |
  |---|---|
  | Momentos | 3,3 |
  | Cierre de año | 3,1 |
  | Eventos | 1,9 |
  | Plan de serie | 1,2 |
  | La primera pregunta de la ventana de vuelta | 1,5 |

  K6 ya lo había dicho: "los ~18 cierres de año por carrera repiten tres opciones parecidas".

**K6b-C2, la cola de verdad** *(supervisor, 2026-10-05; dentro del alcance que eligió el usuario, "la cola de la
carrera")*. Desde los 28 años o desde el aviso de declive, lo que llegue primero, el cierre de año y los momentos
frenan solo en estos casos:
- **es un hito:** el primer título, el último año antes del retiro, un récord, o el cierre de un año con un título o
  un Mundial;
- **algo cambió:** el club, el tier, una lesión o el declive;
- **su carta tiene palanca:** en `agencia.js`, ese tipo de decisión mueve el resultado en su horizonte por encima de
  un umbral, que va en `balance.js`.

Si no, lo resuelve el perfil y se narra en una línea. Fuera de la cola no cambia nada. La serie y los eventos de
partido no se tocan (D-B: lo que está en juego).
- **Meta:** ≤ 8 frenadas después de los 28 (mediana de `criterio`).
- **Lo que no puede caer:** la agencia ponderada no baja del check de K4c, y ningún tipo que sigue frenando pierde
  palanca.
- Si ≤ 8 no se alcanza sin romper la agencia, se reporta la frontera y decide el usuario.

**K6b-C2, hecho** (`k6b-cola2`: `a496686`).
- **Qué son las dos frenadas.** Los "momentos" (`temporada:momento`) son el evento previo de un partido marcado:
  clásico, archirrival, revancha o define la clasificación. Su palanca es del 95%, la más alta del juego. El cierre de
  año (`edadCierre`) tiene una palanca de carrera del 3,3%.
- **La regla** está en `core/cola.js`. Con ella la cola pasa de 13 a **12** frenadas. La frontera es 11, y llegar
  ahí rompe la agencia: sin momentos, la ponderada cae del 47 al ~41%, debajo del piso de K4c. Casi todos los cierres
  de la cola tienen un motivo para frenar: un año con título o Mundial, o un cambio de club.
- La agencia ponderada sube del 47,4 al 48,6%.

**Decisión del usuario (2026-10-05): "aceptar 12 y que K6 lo juzgue".**
- El relleno repetido que vio K6 ya no frena: el "¿seguís?" de cada pretemporada, "el mercado ya habló" ×7 y la carta
  única.
- La meta ≤ 8 se re-basa a lo medido, con su línea.
- K6 vuelve a jugar y dice si la cola todavía se siente relleno.

**La integración de K6b:** rama `k6b-integracion` (worktree `wt-k6bi`). Junta las cuatro ramas con `VERSION` 13 y la
migración 12 → 13, por las flags nuevas, y `HUELLA_JUEGO` 'K6b'.

**Efecto declarado de K6b-F:** las carreras que terminan "sin equipo" pasan del 2 al ~45%. El bot vuelve del retiro
como free agent sin su club viejo, que es la regla coherente. Lo mira la revisión.

**La revisión de K6b (2026-10-05, sobre `977b06a`): requiere corrección.** Se arregla en `k6b-integracion`:
- **Alto, regla 15.** La carta única se firma sola aunque cambie de liga o de región: CBLOL → LCK, o LCK → LPL a $62k
  a los 29, narrado como "No había nada que pensar". **Regla:** se firma sola solo si es la misma liga y el mismo
  tier, es decir, una continuidad. Cualquier cambio de liga, región o tier frena, con su previa.
- **Medio, regla 7.** Los checks de la cola solo atrapan que frene de más. Tienen que atrapar también que frene de
  menos: un hito que ya no frena, o una firma que cambió y no se vuelve a preguntar.
- **Medio, la meta de la cola.** Con `criterio`, que se retira temprano, la cola casi no se mueve y el check queda a
  0,09 de la línea. La meta se mide con **el jugador terco de K6**, el que no se retira antes de los 33 y es el que
  sufría el relleno. Va con su banda y con el rojo cuando las reglas de la cola se apagan. Lo de `criterio` se reporta.
- **Medio, el "sin equipo" al ~45% es un artefacto.** El bot siempre vuelve una vez, vuelve como free agent a mitad de
  temporada, se pasa el año sentado y 47 de 56 no firman nunca más. **Regla:**
  - la vuelta se hace efectiva en la próxima ventana de mercado;
  - la previa de "¿Volvés?" dice la chance de que te llamen (regla 15);
  - el perfil o el automático no vuelve si esa chance es baja.

  Se mide la proporción de finales "sin equipo" y cuántos de los que vuelven nunca firman.
- **Bajo:** "Finalista de el Mundial" pasa a "del".
- **Dominio (`CONCEPTO.md` §12):** la NACL tiene promoción a la LCS y el Circuito Desafiante a la CBLOL. Las ligas
  cerradas son **LCK, LPL y LEC**. La LCS sale de la marca de franquicia.

### K6c — Lo que el usuario encontró jugando *(2026-10-05)*

El usuario jugó la versión de K6b. Textual: *"los años pasan volando"* y *"¿querés firmar con Onda Legion? Bueno,
paso los tryouts y después me sale los dos mensajes, ¿querés firmar con Onda Legion? Y a la nada yo tenía 19 y tenía
que arriesgar un año más y ya había pasado los tryouts dos veces"*.

**El diagnóstico** (sonda del supervisor, `scratchpad/tryout.mjs`):
- Después del minijuego de la prueba hay un dado escondido (`probFirmaTryout`: malo 0,65, regular 0,8, bueno 0,95).
  **Una prueba perfecta no te firmó en 5 de 75.** El mismo club puede volver a ofrecer enseguida.
- La pantalla dice "¡Bien! Con esto: 95% de que te firmen", así que no miente. Pero pasar la prueba y no firmar es
  "hacés un clic y perdiste".
- Desde K6a-A el perfil elige la semana del amateur, así que entre los 15 y los 19 casi no se frena y los años se van
  sin que el jugador los viva.
- El agente que jugó K6 no lo vio: para una heurística, un 95% que falla es correcto. **Lección:** K6 tiene que
  incluir que juegue el usuario.

**Decisiones del usuario (2026-10-05):**
- **"Pasaste = firmás".**
  - Antes del minijuego se ve la vara: "necesitás esto para que te firmen".
  - Si el resultado la pasa, firmás seguro. Si no, no firmás, y el juego dice por cuánto no llegaste.
  - Sin dado: la vara es un umbral sobre el resultado, en `balance.js`.
  - El mismo club no vuelve a ofrecer en la misma ventana.
- **"Vos elegís el plan de cada año".**
  - Al cerrar cada año del amateur el juego frena con un resumen: LP y rango al empezar y al terminar, los scouts que
    miraron y las ofertas.
  - Ahí el jugador elige el plan del año siguiente entre las rutinas. El perfil propone y la opción del perfil va
    marcada, pero decide el jugador.
  - Las semanas de ese año siguen ese plan sin frenar, salvo un riesgo evitable (la regla de K6a-A).
  - El piso de soloQ por perfil (`pisoSoloQ`) queda como la propuesta del perfil, no como una restricción, porque
    ahora elige el jugador.
- **Lo que se mide:**
  - no llega a pro con los bots: `criterio` elige bien, `malas` mal;
  - la brecha entre perfiles;
  - las frenadas del amateur (≈ +4-5 por carrera);
  - la palanca de la nueva decisión de plan en `agencia.js`.

  Si se mueven las metas de K5c, se re-basan con la línea de K6c.

**Junto con esto:** los FAIL lentos de K6b que salieron de la validación completa de `58db231` se arreglan en una rama
aparte, antes del merge.

**K6c, primera pasada** (`k6c-amateur`: `bc86165`).
- **La prueba sin dado:** una prueba perfecta no firmaba en 5 de 75; ahora en 0 de 63, y nadie repite la oferta.
- **El plan anual:** frena con el resumen.

Hay dos problemas, y el supervisor decide (sin cambiar las decisiones del usuario):
- **La vara fija de 60% ignora el nivel.** `malas` juega la prueba al 15%, nunca firma y no llega a pro el 94,5%.
  Eso vacía 7 checks que necesitan carreras de `malas`, y un crack con una prueba floja no firmaría ni en tier 3.
  **Regla:** la vara depende de tu nivel contra el calibre del club:
  `vara = clamp(base − pendiente × (nivel − calibre), mínimo, máximo)`, con las constantes en `balance.js`.
  - Si sos mejor que el club, la vara baja ("el nivel manda").
  - Se sigue mostrando antes de la prueba, y sigue sin haber dado.
- **Más frenadas semanales,** no menos: la mediana es 3 contra la meta de ≤ 1. **Regla:** con un plan del año elegido
  (que ya mostró su riesgo), la semana frena solo si su riesgo supera el que mostró el plan, es decir si apareció
  algo nuevo.

**Los FAIL de la validación completa de K6b** (`58db231`: 505 OK, 10 FAIL; `simulate.js 1000` 0 crashes; determinismo
idéntico; build 2285/2300 KB). Se arreglan en `k6b-fix`:
- "sin_renovacion" ya no aparece, en `calcularMercado` y en el contexto;
- la oferta lateral rechazada no nombra al NPC (seed 63);
- el mundo NPC no envejece lo suficiente;
- 9R0e: muestra insuficiente;
- una carrera varada 18 splits (seed 101);
- K0 KPIs anclados: `ritmo.colaDeCarrera` no tiene recuento independiente;
- `criterio` estancado en 5,5% (tope 5);
- el favorito del Bo5 en conjunto, 86% (meta 75-85);
- la meta de la cola, 13,33 contra 12,99: la banda salió de una muestra con suerte, y se re-mide con la muestra del
  check.

**K6b-fix** (`511b6d5`): 9 de los 10 resueltos. Casi todos eran del instrumento (muestras chicas o checks que no veían
el camino nuevo), y la huella no cambia. **El que queda es un hueco de diseño de K6b-C:**
- el "seguir buscando" narrado no vence nunca;
- un free agent sin liga pasa 6 pretemporadas, de los 21 a los 27, sin que el juego le vuelva a preguntar (seed 101).

**Regla (supervisor, dentro del alcance "la cola" que eligió el usuario):** pasar `splitsSinOfertaParaLibre`
pretemporadas sin oferta cuenta como "algo cambió". La pregunta de "el mercado ya habló" vuelve a frenar. Mueve la
huella y la meta de la cola: se declara.

**La región en K6c** (`k6c-region`: `57e68da`). La segunda pasada de K6c había re-basado "más fácil desde Corea" porque en
el lote NA le ganaba a Corea. Ese re-base se rechazó. La investigación no encontró causa en el motor:
- el tier 3 sale igual en todas las regiones;
- `criterio` pasa toda prueba, así que la vara no mueve sus carreras.

Con la región fija (las mismas seeds desde cada región), Corea sigue clara arriba. Lo dio vuelta la submuestra del lote:
194 carreras de NA que salieron con suerte. Aparte, NA ya estaba arriba de su meta de ~3-5% en K6b. Dos tercios de esos
Mundiales se ganan importado a LPL/LCK (K5c-H).

**Decisión del usuario (2026-10-06): "medir bien, aceptar ~7%".**
- Las bandas de Corea y NA y su orden se juzgan con la región fija (check "K6c región fija", 3000 × 60 por región), no
  con la submuestra del lote.
- `ganaMundialNA` se re-basa a lo medido con la región fija: corrimiento declarado de K6c.
- La importación de élite no se toca.

**Integración** (`k6c-integracion`): `k6c-region` + `k6b-fix`. La forma 13 se re-registra sin subir de versión, porque
la 13 no salió. Después, la validación completa del supervisor, el merge a `fase-9r` y la prueba del usuario.

**La validación completa de la integración** (`6dc0ff8`, 2026-10-06; `7a51ed7` sube el techo de `dist/` a 2400 porque
pesa 2310). Resultado: 512 OK, 12 FAIL; `simulate.js 1000` 0 crashes; determinismo idéntico; `agencia.js` OK.
- **Ninguno de los 12 sale de K6b-fix:** el Top 20 de 9Wd, medido en 4 bloques de 180 seeds, da igual que en K6b.
- **Casi todos salen de la vara de K6c.** Con piso 0,1 y techo 0,8, la vara queda en 0,8 salvo que estés 16 o más
  puntos arriba del calibre del club.
- **Lo que mueve:**
  - el jugador que falla toda prueba no firma nunca, aunque sea muy bueno. Acertar siempre los minijuegos rinde
    +1149% contra fallarlos, y el tope del check "ni decorativo ni gambling" es +42%;
  - `equilibrado` pasa de 24,9 a 32,3% de no-pro (`simulate.js 1000`);
  - hay menos carreras con éxito (459 contra 513 de 720), y de esas tocan el Top 20 el 34% contra el 40% de K6b;
  - la edad mediana al terminar baja a 24 (la banda es 25-29);
  - a `malas` le faltan carreras pro, y 4 checks de K0 quedan vacíos.
- **Los otros FAIL:**
  - K6a-M: la prueba clavada no tiene línea de desenlace, y el feed y el estado no coinciden (seeds 1 y 2, +54 más);
  - Fase 11: 2 de 234 carreras de 6+ splits ven menos de 2 resúmenes;
  - el burnout tiene aviso en el 75% de los casos (el piso es 80%);
  - la cobertura de pausas del guardado de K4: faltan `amateur:reparto` y `servicioMilitar:*`;
  - K5-B, la región monótona.

**K6c-fix: la regla (supervisor, dentro de "pasaste = firmás" y "el nivel manda").** La vara puede llegar a 0: si tu
nivel está claramente arriba del calibre del club, firmás aunque la prueba salga mal, porque el club firma tu nivel y no
tu día. Se sigue mostrando antes y después, y sigue sin haber dado. Una prueba clavada siempre firma.

Se calibran `base`, `pendiente` y `max` en `balance.js`, con `min` en 0, para que:
- el check de impacto de los minijuegos vuelva a su banda: ni decorativo ni más de +42%;
- `criterio` quede en la banda de K5c de no-pro;
- `equilibrado` vuelva cerca de K6b (≤ ~26% de no-pro);
- `malas` llegue a pro lo suficiente para que los checks de K0 tengan muestra.

**Los demás FAIL:**
- cada uno se busca hasta su causa;
- un bug de motor se arregla con un check que lo ponga rojo;
- las muestras y la cobertura se arreglan cambiando seeds o agrandando la muestra, nunca sacando el caso;
- un re-base solo va con la línea de corrimiento de K6c y con la causa mostrada, y nunca en un check de dominio del
  usuario (D-D).

**K6c-fix, primera pasada** (`k6c-fix`: `0bb0f9c`, `d0794b6`). La vara queda en base 1,55, pendiente 0,05, mínimo 0 y
máximo 0,8: llega a 0 con 31 puntos de diferencia y pide 0,8 con 15 o menos. Resueltos 10 de 12, y el impacto de los
minijuegos baja a +29%. Quedan abiertos:
- **K5-B región:** el check pide una brecha de llegada de 30 puntos o más entre regiones. Salió de 40 seeds con suerte:
  con 200 por región la brecha es ~22, igual en K6b.
- **La edad mediana al terminar, 24:**
  - `equilibrado` queda en ~29% de no-pro: ni con la vara siempre en 0 baja de ~28;
  - la causa es el plan del año bajo `resolverAuto`, que propone sin mirar el riesgo que muestra;
  - burnouts en el amateur: 7 → 60 por cada 1000 carreras;
  - castigos de la familia: 38 → 78.

**Reglas (supervisor, 2026-10-06; dentro del alcance de K6c, sin cambiar decisiones del usuario):**
- **K5-B se mide bien**, el mismo principio que el usuario eligió para NA: 200 seeds por región, el orden monótono y la
  brecha por encima de Z σ en lugar de 30 puntos fijos. LATAM sigue llegando a primera solo emigrando.
- **La propuesta del perfil no te quema.** "Vos elegís el plan de cada año; el perfil propone." Si el plan que propone
  el perfil muestra un riesgo evitable (burnout o castigo de la familia), la propuesta pasa al plan más cercano sin ese
  riesgo. `resolverAuto` acepta la propuesta. El jugador sigue pudiendo elegir el plan arriesgado, con su riesgo a la
  vista.
- **Meta:** burnouts y castigos del amateur cerca de K6b, `equilibrado` cerca de 25-26% de no-pro, y la edad al terminar
  en su banda.

**K6c-fix, segunda pasada** (`ddf3cb4`). Midió el supervisor:
- `equilibrado` no-pro: 26,6 con 1000 × 60; en `simulate.js 1000` (15 splits), 29,8;
- burnouts del automático: 0.

**Se pasó de largo.** Contó como riesgo evitable *cualquier* deuda de sueño, así que el automático nunca acepta un plan
con deuda. Pasaron dos cosas:
- la lesión grave, que nace de la deuda sostenida sobre el umbral de riesgo físico (`systems/salud.js`), desaparece de
  las carreras automáticas: 46 de 1200 en `6dc0ff8`, 0 de 3600 ahora;
- el check de contexto falla porque "lesionado" no aparece.

La regla decía burnout o castigo, no deuda. **Corrección (supervisor):** la deuda cuenta como evitable solo si la
proyección del propio plan llega al riesgo físico (lesión o burnout) dentro del año, y la carta lo dice. Una deuda que no
llega es un costo aceptado del plan. **Meta:** burnouts y lesiones graves del automático cerca de K6b, no en cero.

**K6c-fix, tercera pasada** (`bc3ddd6`, según el worker; sin verificar por el supervisor):
- la lesión grave y el burnout vuelven, pero quedan muy arriba de K6b;
- lesión grave del automático: 4 → 32 por cada 1000 carreras;
- burnout: 20 → 44.

La deuda de sueño que el automático acepta en el amateur no se resetea y se cobra en el pro.

**Decisión del usuario (2026-10-06): "la deuda se resetea al firmar".**
- Al firmar el primer contrato pro, el club ordena tu rutina: la deuda de sueño del amateur (`deudaSueno`) y su racha de
  riesgo físico (`splitsRiesgoFisico`) vuelven a 0.
- El log lo cuenta (regla 12).
- El plan del amateur sigue pesando en el amateur, pero no se arrastra a la carrera pro.
- **Meta:** lesiones graves y burnouts del automático cerca de K6b.

**K6c-fix, cuarta pasada** (`7d0051d`, según el worker). El reset está hecho, pero la lesión grave del automático quedó
en 0: la deuda solo se escribe en el amateur. Además, el aviso del burnout llega en el 70% de los casos (el piso es 80%):
son amateurs que se caen rápido, con la mentalidad 54 → 38 → 20 → 3, y la semana no frena.

**Decisiones del usuario (2026-10-06):**
- **La lesión, solo en el amateur por ahora.** Se mantiene el reset. Los checks de cobertura ("El contexto de carrera"
  y "lesion_cronica alcanzables") miden la lesión con carreras que grindean: un bot que elige el plan con deuda, no se
  saca el caso. La lesión en el pro va a D83.
- **Frenar con la mentalidad en rojo.** En el amateur, que la mentalidad entre en zona roja cuenta como riesgo nuevo
  (regla de K6c): la semana frena y lo muestra antes del burnout. Si ya estaba en rojo cuando se eligió el plan, frena
  solo si baja más de lo que mostró el plan.
- **Barandas de la pasada** (regla nueva del supervisor: toda pasada de motor mide antes y después, contra
  `7d0051d`):
  - no-pro por bot (con la medida nombrada);
  - burnouts y castigos del amateur;
  - paradas de la semana por carrera (no puede volver a la mediana 3 de K6c);
  - impacto de los minijuegos;
  - edad al terminar;
  - 9Wd.

**K6c-fix, quinta pasada** (`575db0e`, según el worker). El freno con la mentalidad en rojo está hecho: los burnouts con
aviso suben del 70% al 95%, y las paradas de la semana van de 0,13 a 0,18 por carrera.

La lesión no llega con ningún bot porque `systems/salud.js` solo corre con `phase === 'profesional'`. La premisa de la
pregunta al usuario estaba mal ("la lesión le pasa al que grindea de amateur"): la deuda del amateur solo dañaba al
pasar al pro, y con el reset nadie se lesiona en todo el juego.

**Para que la decisión del usuario sea verdad:** `salud.js` corre también en el amateur, y la lesión pasa a ser del que
grindea sin dormir de amateur.
- Los textos de la lesión dicen lo que pasa en el amateur (regla 15): no hay fechas que perderse.
- Los checks de cobertura la buscan con carreras que grindean, con una muestra que no quede al borde.

**K6c-fix, sexta y séptima pasada** (`be17a4e`, `ffa6709`): `salud.js` corre también en el amateur, y
`retiro_por_lesion` se declara inalcanzable en carreras naturales hasta D83, con un check que arma el estado.

#### La noche del 2026-10-06 *(supervisor; el usuario pidió seguir el plan toda la noche sin preguntarle)*

1. **Cerrar K6c-fix.** Validación completa de `ffa6709` sobre una copia `git archive`, y después, uno por uno,
   `simulate.js 1000`, determinismo, `agencia.js` y `build.js`. Se miden con corridas propias, no con los números del
   worker (T6): el no-pro por bot (nombrando la medida), los burnouts y las lesiones del automático, las paradas de la
   semana (mediana ~0) y el impacto de los minijuegos (≤ +42%).
   - **En verde:** merge de `k6c-fix` a `fase-9r` y cierre en `PROGRESO.md`. El cierre de la fase igual espera que el
     usuario juegue el amateur y la prueba (memoria de playtest).
   - **Con FAIL:** se busca la causa. Si es del instrumento (muestra, seeds), se arregla. Si pide otra pasada de motor,
     **no se lanza sin el usuario**: el otro chat se comprometió a preguntarle ("PORQUE TANTAS REVISIONES HOY"). Se deja
     el diagnóstico escrito acá.
2. **J9, las caras de los campeones,** en paralelo. Su spec ya está en FASE J; es cero motor y cero corrimiento, y
   K.6 la deja hacer en cualquier momento. Va en la rama `j9-caras`, desde `ffa6709`, y se mergea después de K6c-fix.
   El techo de `dist/` de su spec (1800) quedó viejo: rige el de `build.js` (2400). Las imágenes son del CDN y `dist/`
   no las suma.
3. **Volver a jugar K6** (paso 5 del cierre de K6b) sobre el head mergeado: el mismo agente heurístico con las seeds 25,
   39 y 152. Se compara contra "K6, jugado" y se reporta acá.
4. **Para la mañana:** la build lista para que juegue el usuario, con qué mirar. Lo que el otro chat marcó como riesgo:
   con la vara 1,55/0,05/0/0,8, el 74-84% de las pruebas del automático piden 0%, así que la prueba decide ~16% de los
   contratos. El usuario todavía no lo vio.

**Decisión del supervisor, a confirmar:** J9 de noche. No toca ninguna decisión del usuario y no corre el stream. Si
no la quiere ahora, la rama queda sin mergear.

**J9, hecho** (`j9-caras`: `dfbd4e8`, `a18af54`): la huella es idéntica, con 4 checks nuevos y mutantes. La revisión
encontró scroll horizontal a 390 y 414 px (el splash escalado reabría D69). Se arregló y se re-midió en 8 anchos.

**K6, re-jugado** (2026-10-06, sobre `a18af54` = K6b + K6c + K6c-fix + J9; el mismo agente heurístico; logs y capturas
en el scratchpad de la sesión `9018f53b`, carpeta `k6r/`):

| Carrera | Antes | Ahora |
|---|---|---|
| Lo peor siempre (seed 25) | 86 frenadas · 669 · Figura mundial | 14 frenadas · 4 · burnout a los 18, en el primer split pro |
| Terca estricta (seed 25; plan del perfil y se cuida en rojo) | 67 · 349 · Figura mundial | 77 · 414 · Figura mundial, 20 splits en tier 1 |
| Buena (seed 39) | 75 · 1081 · Figura mundial | 45 · 187 · "Campeón" |
| Leyenda (seed 152) | 88 · 1031 · El GOAT | 76 · 943 · Leyenda, Mundial 2038 |

- **Las quejas:**
  - "Worlds es una basofia": no.
  - "Las opciones no afectan nada": no (con la misma seed, 4 contra 414).
  - "Rng clicker": no, salvo la rueda de prensa, que sigue a ciegas (diferida por el usuario).
  - **"Hacés un clic y perdiste" vuelve en una forma nueva:** el que ignora todos los avisos del amateur firma y se
    quema en el primer split pro. El pro no tiene ninguna frenada para reaccionar. Es D77.
- **Los bugs de K6:** no se repite ninguno. Lo que sigue: el mercado de una sola carta que firma solo, por
  continuidad (la leyenda, campeona del Mundial en 2038, firma con KT a $45k en 2040 sin que se le pregunte), y el
  tag "Riesgo familiar" en el primer año pro.
- **La prueba:** ningún dado escondido. La vara se ve antes; 11 de 11 pruebas pasadas terminaron en firma.
- **Hallazgos nuevos:**
  - **la carrera buena (seed 39) queda 7 años en tier 3** (de los 17 a los 24), con récords de 49-1 y 29-1 y **cero
    mercados**. Contradice "el nivel manda", y la terca pasa 6 splits ahí;
  - la ficha de un club de tier 3 dice "· LEC ·", mientras la tarjeta dice "circuito chico" (regla 15);
  - los años del amateur del jugador bueno: 6 frenadas en 3 años (3 planes, 2 cierres y 1 evento) y ninguna
    semana. Es lo que decidió el usuario ("las semanas siguen el plan"); que lo juzgue jugando.
- **La cola después de los 28:** la terca frena 29 veces, pero son planes de Bo5 y momentos de un jugador de LEC
  hasta los 34, lo que D-B deja frenar. La leyenda frena 8 y la buena 3.

**Lo que sigue (supervisor, de noche):**
- **Se investiga la causa de la carrera buena varada en tier 3,** con su seed y su frecuencia en un lote. Es solo
  diagnóstico, sin ronda de motor.
- **Se arregla la etiqueta "· LEC ·",** si es de pantalla (es un bug de regla 15, cero motor).
- Las decisiones de motor que salgan, incluido D77 en el pro, las toma el usuario.

**La etiqueta, hecha** (`etiqueta-tier3`: `c3c1721`). Era de pantalla: en tier 3 `career.liga` es null a propósito, y
`lineaDeContextoFicha` caía a la liga de tier 1 de la región. Ahora dice "Prisma Academy · Tier 3 · Europa". El check se
vio en rojo y la huella es idéntica.

**La carrera varada en tier 3, investigada** (sondas en el scratchpad de `9018f53b`, carpeta `t3/`; medida
`criterio`, seeds 1-600, 60 splits):
- **La causa.** Salir de tier 3 es una moneda que no lee el nivel (`systems/competitivo.js` `resolverTier3`):
  - cada split se tira `chance(0,45)` de salida, y después subir contra que el club se disuelva, con
    `0,40 + 0,35 × jerarquía`;
  - la jerarquía vuelve a 0 con cada club disuelto;
  - cada disolución cuesta 2 splits: el split libre y el primero con el club nuevo (la compuerta de K6a-M);
  - tier 3 no tiene mercado (`mercado.js:629`).
- **Los números.** El diseño (`balance.js`) apuntaba a una mediana de 1-2 splits; se mide 5. El 32% de las carreras pasa
  6 splits o más ahí, con nivel 63 contra un calibre de 18 y 80% de victorias. Un caso en Node: la seed 18 pasa 18
  splits en tier 3 con nivel 70-79, 5 disoluciones y 0 ascensos.
- **No es una regresión de K6.** Las cabezas de K5c a K6c-fix dan igual. K6a-M (`6dd29d0`) lo empeoró: 25,7 → 33,5%. El
  problema viene de las fases 3 y 9Md. El 1081 contra 187 de la seed 39 es el dado.
- **La regla propuesta: "el nivel manda" en tier 3.** Si tu nivel supera el calibre de la liga de tier 2 de tu región
  (`calibreDeLiga`) por un margen que va en `balance.js`, subís seguro. Si no, sigue la moneda de hoy.
  - Contrafáctico con margen 15: 6 splits o más, 32,3 → 7,7%; mediana 5 → 2; llegan a tier 1 71,3 → 73,0%; Mundial
    10,5 → 9,8 (ruido con 600 carreras); no-pro igual.
  - Con margen 0, tier 3 queda en 2 splits fijos.
  - Corre el stream: la huella se mueve y es un corrimiento a declarar.
- **D34 deja esta perilla al usuario.** **Decisión del supervisor, a confirmar:** se prepara la regla en la rama
  `tier3-nivel` (desde `c3c1721`), **sin mergear**. Va con su check con mutante y su validación completa, y con las
  barandas medidas antes y después:
  - no-pro por bot;
  - Mundial con la región fija;
  - Top 20;
  - edad al terminar;
  - frenadas;
  - llegada a tier 1.

  A la mañana el usuario dice sí o no sobre números, no sobre una promesa.
- **D77, medido.** El dado del burnout corre al final de cada split, después de `amateur.js`. `firmarConEquipo` te pasa a
  profesional en ese mismo split, y la racha en rojo del amateur (`splitsMentalBajo`) no se resetea al firmar. Pasa así:
  - `malas`, 400 × 60: 11 carreras firman y se queman en el mismo split, con mentalidad 3-29;
  - en ninguna la oferta o la prueba nombra la mentalidad;
  - el freno del amateur no vuelve a frenar en el piso.

  Opciones para el usuario, sin implementar:
  - la oferta dice el riesgo y deja esperar;
  - la racha se resetea al firmar, como la deuda;
  - el pro frena con la mentalidad en rojo.

**El merge** (`99927be`, `ed95728`, `8bea57a`): `k6c-fix`, `j9-caras` y `etiqueta-tier3` entran a `fase-9r`, con la
verificación en `PROGRESO.md`. No se pusheó. K6c sigue esperando que el usuario juegue.

**D82, que estaba anotado "después de K6"** (supervisor; la rama `d82` sale del head mergeado):
- **(a) El valor que se muestra tiene que ser el que paga el mercado (regla 15).**
  - Si el valor visible sale de otra fórmula que el precio de traspaso (`presupuestoDeDemanda`, que descuenta la edad),
    la pantalla muestra el número que usa el motor, y dice por qué baja con la edad cuando la diferencia se nota.
  - Si es solo pantalla, la huella queda idéntica. Si el número visible lo lee el motor, se reporta sin cambiarlo.
- **(b) Medir bien el Mundial del mundo** (`simulate.js`, bloque `mundoMundial`). Cada año del mundo tiene que pesar
  igual, no solo los años en que la carrera vive.
  - Se reporta lo medido con el bloque viejo y con el nuevo.
  - Si cambia el veredicto de una meta del usuario (LCK ≥ 25% y la liga más fuerte), **no se re-basa**: se reporta y
    decide el usuario.

## K.6 — Qué pasa con FASE J y FASE V

| Pieza | Destino |
|---|---|
| J0 | ✅ hecha; K0 la extiende |
| J3 | hecha en la rama `j3-pool-oxido` → se mergea en K0 |
| J4 | → K4 (para los eventos que siguen frenando) |
| J-previa | → K2 (la previa con la probabilidad) |
| J1 / J2 | → K2 / K3 |
| J5 / J6 | **reemplazadas por K4**: sus metas (150-280 decisiones, más drafts) contradicen D-B |
| J7 | → K5, comprimida |
| J8 | fuera de alcance |
| J9 (caras de campeón, Data Dragon) | se mantiene, sin motor ni corrimiento: se puede hacer en paralelo en cualquier momento |
| J10 / J11 | → K5 / K5c |
| FASE V | sigue congelada. Se retoma después de K, re-escrita con el principio "una cosa por vez en pantalla" (`AUDITORIA.md` B7). Reescribirla no es parte de esta fase |

Workflow (sin cambios): grok/agy implementan cada subfase en su propio worktree, un Claude fresco
revisa contra `CLAUDE.md` y este documento, Sonnet aplica los arreglos y el supervisor mergea y
escribe `PROGRESO.md`.

## K.7 — Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | El nivel manda tanto que el juego se vuelve previsible | El favorito gana ~80%, no 100%. La varianza que importa la controla el jugador (mentalidad, minijuegos, charla del coach) |
| 2 | 20-40 checks de banda fuera de banda por bloque | Esperado. Se anotan y se re-basean en K3c/K4c/K5c, con la línea de la regla 17 |
| 3 | Guardados viejos | El check de `VERSION` de K0. Se descartan con aviso, no se cargan a medias |
| 4 | Los cortes del puntaje dependen del balance final | Son provisorios en K1 y definitivos en K5c |
| 5 | Resolver eventos por perfil "esconde" contenido | Pasa a crónica, no se borra. Las bifurcaciones siguen frenando |
| 6 | El Mundial suma interrupciones | El Swiss se resuelve solo y el tope es de 4 por split de Mundial |

## K.8 — Fuera de alcance

Un modo corto o selector de ritmo (D-A: no) · MSI / First Stand (J8) · un ranking global online
(necesita backend: la comparación es por texto y link) · el rediseño completo de UI (FASE V).

## K.9 — Verificación

```bash
node src/dev/validate.js                  # en rojo primero cada check nuevo (regla 7)
node src/dev/simulate.js 1500 60 todas    # 0 crashes + los bloques nuevos de K0
node src/dev/agencia.js                   # la palanca por tipo de decisión
node src/dev/build.js                     # guards + techo de dist/
node server.js                            # jugar a mano (receta de navegador), cero errores de consola
```

Más la huella de 40 seeds antes y después de cada subfase: idéntica en K0/K1, y corrimiento
declarado en los bloques A/B/C.

---

# Fuera de alcance (visto en las imágenes, decidido que no)

| Qué | Dónde se ve | Por qué no |
|---|---|---|
| Tienda, `ACTIVOS`, `STAFF` | El Ídolo del Potrero | La plata no es gastable — decisión ya registrada arriba. Es la capa de monetización de la referencia y `CONCEPTO` §11 la prohíbe explícitamente ("no es un manager") |
| Selección nacional como track propio | El Ídolo del Potrero | En LoL el equivalente es el circuito internacional, que ya existe. Se porta el **estado con nombre** (`SIN CHANCE → EN CARPETA → CLASIFICADO`), no un segundo equipo |
| Escudos reales de las orgs | El Ídolo del Potrero | `CLAUDE.md` permite ligas reales; los escudos son un problema de licencias. Se usa monograma + color de la org |
| Simular el resto del bracket de playoffs | El Ídolo del Potrero | D19, simplificación deliberada ya documentada: el motor simula **tu** camino, y una derrota ya cuenta una historia completa |
| Doble eliminación real en playoffs | — | ídem D19 |
| Rumores de parche (apostar antes de que el meta gire) | — | Ya excluido explícitamente en la fase 6. Sigue excluido |

---

# Deuda técnica y hallazgos anotados (no perder)

Cosas encontradas midiendo el código, con la fase donde se resuelven.

| # | Hallazgo | Fase |
|---|---|---|
| D1 | ~~Los pesos de outcome son estáticos~~ — resuelto: `outcome.modificadores` | ✅ 2 |
| D2 | ✅ **Cerrada (9R5a, reconfirmada 10a).** El 23% de las carreras agotaba el tope de 90 splits: no había retiro. Remedido tras la fase 7: **49,1%** — ver PROGRESO.md, changelog de la fase 7. 9R5a lo bajó a 0%; 10a (el retiro real, sin edad fija) lo reconfirma en 0% sobre 400/1500 seeds | ✅ 9R5a + 10a |
| D3 | ~~`maxDecisionesPorSplit: 8` queda corto~~ — resuelto: subió a 16, luego a 60 | ✅ 2 |
| D4 | ~~`posicionParaInternacional: 1` estaba mal para 2026~~ — resuelto: `liga.cuposInternacionales` | ✅ 3 |
| D5 | ~~`regionOrigen` se sorteaba uniforme entre 8 ligas~~ — resuelto: pesado por prestigio, solo tier 1 | ✅ 3 |
| D6 | ~~El meta se describía por arquetipo, no por campeón~~ — resuelto: `campeonesEnMeta` | ✅ 1 |
| D7 | ✅ **Cerrada (8.5), la fila nunca se había actualizado.** Auditada el 2026-09-19: `src/ui/` tiene 52 archivos, 4.567 líneas de JS; `index.html` bajó a 710 líneas (markup + orquestación mínima). La extracción que 8.5 prometía ("cierra D7") ocurrió de verdad — mismo patrón que D41: la fase cerró el punto y esta tabla se quedó con la foto vieja | ✅ 8 (8.5) |
| D8 | ✅ **Cerrada (11), reconfirmado 2026-09-13.** Los 5 rivales de generación se generan y corren su carrera: **9Ma** los puso en una casilla de plantel real (la que `orgDelRival` les asigna por hash) y los envejece como NPCs de carrera larga; **9Mc** los mueve/renueva con el resto del mundo (`seVaDelMundo` los protege de irse antes de tiempo); **9Wb** les da `mundo.rivales[].puntaje` vivo (mejor rank en el Top 20) y `dueloDeGeneracion` en `core/ficha.js`. **11** cerró lo que faltaba: `mundo.archirrival` se escribe de verdad (`core/mundo.js:358`, `elegirArchirrival`) y trae la ficha con `desenlace` | ✅ 9Ma + 9Mc + 9Wb + 11 |
| D9 | ✅ **Cerrada (10c).** `player.deudaSueno` no se resetea al pasar a profesional; `systems/salud.js` es el consumidor que le faltaba — el riesgo de lesión escala con la deuda arrastrada de la etapa amateur (medido: `retiro_por_lesion` va de 1,2% con juego prudente a 8,8% con grindeo agresivo de soloQ) | ✅ 10c |
| D10 | ✅ **Cerrada (10a), distinto de lo previsto.** `secundario.js` usa `amateur.edadLimite` para congelar el flag. No hizo falta darle un umbral propio: `edadLimite` no se borró (10a lo convirtió en la red anti-loop, 20→24) — el significado que `secundario.js` necesita no cambió, solo el valor | ✅ 10a |
| D11 | ✅ **Cerrada (13b, 2026-09-18).** Las 7 rutinas de offseason declaran `nivel` (antes 0/7); `bootcamp_corea` queda reservado a tier1/tier2 y `grindeo_de_madrugada` (nueva) le da a tier 3 su propia agresiva, para no dejarlo sin la trampa que CONCEPTO §4 exige siempre disponible | ✅ 13 (13b) |
| D12 | ~~El eje `region` tenía `LATAM`~~ — resuelto: sacado, ya no hay tier-1 ahí | ✅ 3 |
| D13 | ~~`academy_offer` empujaba a `career.orgs` sin fichar~~ — resuelto: el fichaje real lo hace `amateur.js`/`competitivo.js`, `academy_offer` quedó como la prueba narrativa que siempre fue | ✅ 3 |
| D14 | ✅ **Cerrada (13c+13d, 2026-09-18).** De 223 eventos de 2 opciones / 3 de 3 / 0 de 4 (sobre 220), el contenido nuevo usa el rango completo que pide `CONCEPTO` §3: **10 eventos de 3 opciones y 3 de 4** sobre 246 | ✅ 13 (13c/13d) |
| D15 | LCP no tiene un circuito de desarrollo real investigado (`CONCEPTO` §12.3 no lo cubre). Se modeló como `LCP_CHALLENGERS`, generado igual que el resto de tier 2 — nombre plausible, no verificado como real. Si aparece la investigación real, reemplazar el id | 3 (abierto) |
| D16 | ✅ **Cerrada (9Md)** para el jugador. El último de una liga tier 1 con `desciendeA` desciende y su contrato viaja; la org tier-2 más fuerte de la región promociona a taparla (swap en `mundo.ligas`). Caídas tier 1 → tier 2: **21,8% (9Md)** → **13,5% (9Mi**, el stream shift; 9Mj lo devuelve a ≥15%). La **pirámide completa** (todas las ligas relegan cada año) se **evaluó y difirió en 9Mi** (§9M.12.2 punto 3): no arregla el check 7 (el jugador bueno rebota a tier 1) y metería ~90 orgs sin plantel a tier 1 en 15 años. Los checks 7/9Mi-1 se redefinieron a "liga mayor" en su lugar. Pirámide = texture de mundo futura, fuera de 9M | 🔶 9Md · 9Mj devuelve check 8 a banda · pirámide diferida |
| D17 | ✅ **Cerrada como narrativo (13d, 2026-09-18).** LRN/LRS (los circuitos tier 2 de LATAM que alimentan LCS/CBLOL) y la doble residencia LATAM 2026-2027 siguen sin modelarse en el motor — un jugador de la región sigue naciendo directamente en NA o BR, tal como preveía la investigación original. Lo que sí se agregó: `data/events/latam.json` (3 eventos, `region: ['NA','BR']`) le da identidad a ese origen — el trámite de la doble residencia, la final regional que no clasifica a nada, el viaje que te sacó de la escena de origen — sin tocar `leagues.json`. Es la resolución que la investigación ya preveía ("vale un evento dedicado"), no un circuito nuevo | ✅ 13 (13d) |
| D18 | ~~La ventana `internacional` era un único evento agregado (`chance()`)~~ — resuelto a medias en la fase 4: ahora es una serie Bo5 real de verdad contra un rival de otra región, con Fearless y minijuegos. Sigue **sin distinguir** First Stand/MSI/Worlds ni modelar un bracket Swiss+knockout: es una sola serie representativa, no el torneo real completo | ✅ 4 (parcial) |
| D19 | El bracket de playoffs de tier 1 es de **eliminación simple** (6 clasificados, bye para los 2 mejores sembrados, Bo5 parejo). Las 6 ligas 2026 investigadas usan doble eliminación real (hay bracket de perdedores). Simplificación deliberada: el motor solo simula TU camino por el bracket, nunca el resto — una derrota ya cuenta una historia completa ("eliminado en cuartos") sin necesitar una corrida paralela por el lado de perdedores | 4 (abierto) |
| D20 | ~~Los 5 minijuegos comparten dos parámetros de balance genéricos (`impactoMinijuego`, `impactoDirecto`) en vez de tener cada uno el suyo~~ — **cerrada en 9R4a**: cada entrada de `data/minijuegos.json` trae su `impacto` y su `spread`, y `balance.js` se queda solo con lo que es del reparto (`minijuegoCooldownSplits`, los cortes del veredicto). El diagnóstico viejo decía que la estructura del juego satura el efecto de cualquiera de los dos parámetros mucho antes de que su valor importe; sigue siendo cierto y por eso el calibrado fino es 9R4e | ✅ 9R4a |
| D21 | La temporada regular de la fase 5 corre el stream de RNG respecto de cualquier seed anterior a esa fase (trampa T1: es un sistema nuevo que consume `rng` en el medio del registro). Ninguna seed de antes de la fase 5 reproduce la misma carrera después. Documentado, no es un bug | ✅ 5 (aceptado) |
| D22 | ✅ **Ocurrió como se anticipó (fase 9), aceptado.** `competitivo.js` dejó de sortear la org y corrió el stream de RNG, mismo criterio que D21: ninguna seed anterior a la fase 9 reproduce su carrera después. Documentado de antemano, no es un bug | ✅ 9 (aceptado) |
| D23 | Medido al calibrar el arraigo (fase 8c, 300 carreras a 60 splits): la distribución es bimodal — de las carreras con ≥8 splits en una misma org, 50,5% termina en `leyenda` (88+) y 25,7% se queda en `uno_mas` (<25); `querido` e `idolo` juntos son solo el 23,8%. El check declarado (≥15% llega a Ídolo+) pasa cómodo (59,9%), así que no fuerza retunear nada — pero si en la fase 11/13 se quiere que "Leyenda" se sienta tan raro como en la referencia (aparece una sola vez en las 15 imágenes, al cierre de una carrera de 26 años), la curva de ganancia por split es candidata a suavizarse recién ahí, con contenido real de por medio (regla de proceso 3: agregar contenido antes que tocar constantes) | 11/13 (abierto) |
| D24 | El check de la fase 3 "tier 3 es breve" (`p90 ≤ 4`) era frágil a n=1500: la fase 8D midió que el p90 real cae casi exactamente en el borde 4/5 (~90% acumulado en 4) tanto antes como después de agregar contenido — cualquier cambio que reordene qué evento gana un sorteo para una seed dada (trampa T1, misma familia que D21/D22) puede empujar el resultado para cualquier lado del borde a esa muestra. Confirmado con una sonda aparte a n=3000/6000: ambas versiones (con y sin el contenido nuevo) dan p90=4 estable. Resuelto subiendo la muestra del check a 6000 — no se tocó ninguna constante de balance de tier 3 | ✅ 8D |
| D25 | ~~**La carrera se vara para siempre tras disolverse un tier 3.**~~ — resuelto en 9Ea+b: `disolverEquipo` conserva `tier: 3`. Regresión de la fase 9b (`9a163b6`), que guardó el re-fichaje detrás de `career.tier === 3` mientras `disolverEquipo` ponía `tier: null` — la condición nunca era cierta en el único caso para el que se escribió. Medido antes: **30,7% de carreras varadas**, **47,5% de los splits profesionales sin equipo**, racha máxima **57 splits**. Después: **0 varadas**, racha máxima **1 split**, **98,1%** de los splits pro con equipo | ✅ 9E |
| D26 | **El agujero de medición que dejó pasar D25.** Tres herramientas mirando para otro lado a la vez: (a) `simulate.js` no tenía **ningún** KPI posterior al fichaje, así que 1.500 carreras no veían una racha de 57 splits sin equipo — desde el estado final eso se lee como un solo split libre (**resuelto en 9Ea+b**: bloque `carrera` con recorrido split a split); (b) `validate.js` no tenía ningún check sobre el estado "sin equipo" (**resuelto**: checks 39 y 40); (c) **`cobertura.js` mide cantidad, no pertinencia**: la celda `sin_equipo` reporta **58 eventos** —bien por encima del mínimo— y por eso sale "sin huecos", pero esos 58 son exactamente el contenido mal gateado de D27. Cuanto más contenido sin gatear se escribe, más sana se ve una celda inapropiada. Misma familia que la trampa T5 — la herramienta no falla, mira para otro lado. **(c) cerrado en 9Ec**: `cobertura.js` reporta, por cada celda de estado excepcional (`prioridad ≥ 80`), la partición anclados (declaran `nivel`/`marcas`) vs. sin gatear. `sin_equipo` pasó de `16 sin gatear` a `10` (los 10 restantes son soloQ y reflexión vital, apropiados pero declarados por omisión — anclarlos es un pase de contenido futuro) | ✅ 9E |
| D27 | ~~**Contenido de vestuario disparando sin vestuario.**~~ — cerrado en 9Ec. `campeones.js` gatea el draft por `career.currentOrg` (no `phase`): un libre profesional elige el campeón como en soloQ, sin loguear "en el draft no te dieron tu pick" (medido: 65 logs `[campeones]` sin equipo → 0). Nueve eventos declararon `marcas: ["con_vestuario"]` (5 de rol del plan + `jungla_el_tracking_publico` + `transfer_rumor`/`tercer_club_ya`/`el_secundario_que_sirvio`); los 6 eventos de rol enmarcados en soloQ se dejaron sin gatear a propósito. Check nuevo en `validate.js` verificado en rojo contra el HEAD previo | ✅ 9E |
| D28 | ~~**`Math.random()` × 5 en `index.html`**~~ — resuelto en la fase P: pasaron a `rngUi`, un stream propio sembrado desde la seed (`mulberry32((seed ^ 0x9E3779B9) >>> 0)`), separado del `rng` del motor para no correr el stream (T1) ni desincronizar el navegador de `simulate.js`. `src/dev/build.js` falla el build si vuelve a aparecer una llamada al azar del navegador. **9Ed**: `guards.js` ahora suma `.html` y recorre la raíz del repo — `verificarSinMathRandom` caza un `Math.random()` que vuelva a `index.html`, verificado en rojo. Cerrado | ✅ **P** + 9Ed |
| D29 | ✅ **Cerrada (9Mb + 9Md).** `residenciaEn(state, regionId)` la calcula (`local`/`residente`/`import`) desde `splitsDeResidencia`; `core/demanda.js` lee `cupoImports`/`minimoResidentes`/`margenImport` en `ofertaPosible`. **9Md** abrió el mercado entre las 6 ligas tier 1 y `dificultadAdaptacion` escala el `margenImport`: `residencia: 'import'` se produce en el **71,8%** de las carreras (check 12: ≥10%) | ✅ 9Mb + 9Md |
| D30 | ✅ **Cerrada (D.1, 2026-09-15).** `etapa: 'declive'` ya venía cerrada en 10a. `calcularMercado()` ahora devuelve los 4 valores (`sin_contrato`/`contrato_firme`/`ultimo_ano`/`sin_renovacion`), leyendo `contrato.aniosRestantes` y el flag nuevo `contrato.avisoNoRenovacion` — sin tirada de RNG nueva | ✅ 10a + D.1 |
| D31 | ✅ **Cerrada.** Constantes muertas en `balance.js`: **9Ec** borró `amateur.autoProbRobar`, `rendimiento.ruidoRival` y `competitivo.margenEdadMinima`; **9Mb** encendió `mercado.margenImport` en `core/demanda.js` (`ofertaPosible`: como import tenés que estar `margenImport` por encima de la fuerza de la org). 0 constantes mintiendo | ✅ 9Ec + 9Mb |
| D32 | ~~**`node src/dev/validate.js` tarda 6m47s** y la Definición de terminado lo exige en cada cambio.~~ — **cerrada en 12a**: `check(nombre, fn)` se acompaña de `checkLento(nombre, fn)` (mismo cuerpo, misma lógica); criterio mecánico de clasificación (llama `correrCarrera`/`avanzarSplit`/`avanzarSplitAuto`, directo o vía helper de módulo) aplicado a las 173 llamadas existentes: **109 lentas, 64 rápidas**. `--rapido` salta las lentas (`SKIP ... (lento, correr sin --rapido)`); `--solo=` sigue forzando cualquier check puntual sin importar `--rapido` (regla 7 intacta). Medido: `--rapido` **13,7s** (antes 6m47s corriendo todo), suite completa sin flags **173/173 OK, 0 FAIL** — ninguna lógica de check cambió, solo la agrupación. Script nuevo en `package.json`: `validate:rapido` | ✅ 12a |
| D34 | 🔶 **El contenido, cerrado (13d, 2026-09-18); la constante, deliberadamente sin tocar.** Cuánto se tarda en SALIR del nivel tier 3 nunca se había podido medir hasta D25 (la carrera se varaba antes). Medido a 1500 carreras: por org la permanencia está clavada en el diseño (mediana 2, p90 5), pero el tiempo total en el NIVEL da mediana 5, **p90 12, máximo 36 splits** — 4 años dando vueltas por equipos chicos, con un solo evento exclusivo de tier 3 en todo el catálogo. Regla de proceso 3 (contenido antes que constantes): `data/events/tier3.json` (9 eventos nuevos) le da a esos 12 splits una historia propia —el sueldo que llega tarde, el coach-dueño, el lineup que se tambalea, la scrim contra una academia, el torneo regional como vidriera— **sin tocar `probAscensoBaseDesdeTier3`** (sigue en `0.4`, `balance.js:782`). Si el p90 sigue leyéndose largo después de jugarlo con el contenido nuevo, tocar esa constante es la decisión que queda pendiente, aparte, y le corresponde al usuario decidir si hace falta — no es un bug, es un balance de sensación de juego | 🔶 13 (13d, contenido) · constante abierta a criterio |
| D33 | ✅ **Cerrada (2026-09-04).** 13 comentarios de `/src` citaban `TRASPASO.md §4` — redirigidos a `CONCEPTO.md §12`, con sub-número (`§12.N`) donde el tema calza con una subsección real (Calix/scouting → 12.2, edad mínima de liga → 12.3, declive → 12.4, lognormal de salarios → 12.6) y bare `§12` donde no había un mapeo 1:1 verificable. Se soltaron los artefactos propios de TRASPASO que no viajan (rangos de línea, "imagen N"). 0 archivos con `TRASPASO` restantes en `/src` | 9E |
| D35 | **La fase 9M corre el stream de RNG y mueve el balance agregado entero**: los planteles NPC consumen `rng` en `generarMundo` y en cada offseason, y la escalera deja de sortearse. Ninguna seed anterior a 9M reproduce su carrera. Misma familia y mismo criterio que D21/D22. **9Ma**: `org.fuerza` día 1 `mean 77,5→76,9`; 2 checks al borde. **9Mc**: `mercadoMundial` cada offseason; "La dinastía" 25→28% y "series sin draft" 28→26% (parches). **9Md**: el mercado escanea 6 ligas + descenso; **checks 7 (tier1 al cierre 77,8%, tope 65%) y 9 (correlación nivel↔liga r=0,22, piso 0,5) fuera de banda** — el retune de banda de nivel / presupuesto / `dificultadAdaptacion` es 9Mh. **9Mf**: `chance` del traspaso a mitad de contrato (+ `construirOferta` cuando salta) cada pretemporada con contrato corriendo, y `chance` del banquillo en splits de fracaso — shift **casi invisible en agregado** (equilibrado: tier1 al cierre 77,5→77,4%, mentalidad 88,6→89,1, mecánica 75,2→75,1; 0 crashes en 4500 carreras; ningún check parcheado se movió). **9Mh**: `derivaPrimerSplit` 6→3 (cosmético, no corre stream) y `renovacionSigmaFactor` 0,35→0,27 (sólo escala el valor, no corre stream) — despincha *proyección jerarquía* (±3) y *renovación* (40%). **9Mi** vuelve a correr el stream (el asiento se disputa contra el calibre de la liga + la renovación se enfría con la edad): **check 9 `r=0,815`** (baseline 0,40), checks 7/9Mi-1 redefinidos a "liga mayor", `validate.js` 148/148 en verde. **9Mj** (remedición completa, trampa T6): "dinastía" (22,8%) y "series sin draft" (29,8%) **volvieron solos** — topes devueltos a 25%/28%; check 5 = 5,26; check 8 quedó en ~14% (residual, §9M.12.3). `validate.js` 148/148, `simulate.js 1500 60 todas` sin crash | ✅ **9Ma-9Mj (shift aceptado, medido y recalibrado)** |
| D40 | ✅ **Cerrada del todo (D.2, 2026-09-15).** `career.registro.dineroTotalUSD` y `salarioAnualUSD` cerrados en 9Mf; `mundo.archirrival` cerrado en 11. `registro.picos.rankedPuntos` (`state.js:211`, 0 escrituras desde 9-04) ahora se escribe en `conRanked` (`core/ranked.js`) vía `registrarPico`, junto al espejo `player.soloqElo`. Medido (300×60): 300/300 carreras con ranked terminan con el pico > 0, máximo 6082, 0 violaciones de monotonía | ✅ 9Mf + 11 + D.2 |
| D41 | ✅ **Cerrada (T3), la fila nunca se había actualizado.** Auditada el 2026-09-19: `formatoUi.js:163` tiene `acentoDeLog(type)` (`ACENTO_LOG`, 13 tipos mapeados a un acento visual — `mercado`→mercado, `escena`/`top_mundial`/`edad`→gold, `split`→danger, etc.) y el comentario en el propio código dice "cierra D41, recortado en T3". `feed.js` además distingue `entry.type` para `top_mundial`/`edad`/`meta`/`escena` con clases propias (`log-item--breaking`, `log-item--escena`, etc.). Encontrada al auditar la tabla completa tras cerrar la fase 13 — mismo patrón que D43: una fase cerró el punto y esta tabla se quedó con la foto vieja | ✅ T (T3) |
| D36 | ✅ **Cerrada (fase T8, 2026-09-04).** *"La partida no se guarda: un refresh borra la carrera"* — resuelto exactamente como preveía esta fila: `core/rng.js:18-19` expone `.estado()`/`.restaurar(n)`, `src/core/guardado.js` serializa (`state.pendiente` cumplió su función: la partida era serializable a mitad de split desde antes), y `src/ui/almacenamiento.js` hace el `localStorage`. Verificado sin `localStorage` desde ninguna otra parte del repo. Ver P.2 | ✅ P (T8) |
| D42 | ✅ **Cerrada (D.3, 2026-09-15).** `quedarLibre` y `resolverBanquillo` (`systems/mercado.js`) limpian `career.liga` a `null` junto con lo demás. Los 12 lectores que ya toleraban `null` no se tocaron; el único que no toleraba (`core/serie.js`, rival doméstico) ahora tira un error explícito (medido: guarda no alcanzada, 0/300×60). El check de silencio no empeoró: baseline real remedido 61.111% (no el 72% viejo, ya obsoleto) → 61.290% con el fix, piso 60% sin tocar | ✅ D.3 |
| D43 | ✅ **Las dos contradicciones concretas cerradas (13e, 2026-09-18).** §2 describía "27-34 años DECLIVE Y RETIRO" como etapa con reloj de edad fijo y sumaba duraciones parciales (~7 min) que contradecían la decisión del usuario ("la larga: 25-40 min", línea 81). Reescrito: el tramo de declive/retiro ahora dice "EMERGENTE, NUNCA UN RELOJ FIJO" citando el mecanismo real de 10a (mercado, no edad) y §12.4 (el declive es percepción, no biología); se sacaron las duraciones parciales que no sumaban. **Residual, fuera de esta fase**: la regla de proceso 5 sigue acumulando otros pendientes de `CONCEPTO.md` sin reclamar (§5/§11 fase 4, §5 fase 5, §6 fases 6 y 9, §8 fase 1, §1/§11 fase 8, §6-ARRAIGO fase 8) — no eran la contradicción que bloqueaba el diagnóstico de esta fase, quedan para cuando alguna fase futura los reclame de verdad | ✅ 13 (13e) — residual sin fase asignada |
| D44 | `verificarSinColorLiteral` (`guards.js:99`) solo escanea `estilos/*.css`: un `fill="#2ee8ff"` en un gráfico SVG construido en JS evade el candado del sistema de diseño por completo. Encontrado al diagnosticar la fase V (medido: `grep -rn "createElementNS" src/ui/` → cero, así que hoy el guard nunca se ejerció contra JS) | V1 (`verificarSinColorLiteralEnJs`, con las 2 excepciones reales ya en el repo: `orgChip.js` hsl calculado, `exportar.js` `getComputedStyle`) |
| D45 | `continuarCarrera()` (`index.html:604-644`) nunca llama a `renderFeed`/`renderCarrera`: al retomar una carrera guardada, `#logList` arranca vacío aunque `estado.logs` tenga la historia completa — indefinidamente si además hay una decisión pendiente, porque nada vuelve a pintar el feed después | ✅ **V0**, se resuelve solo con el store centralizado: "retomar" y "avanzar" convergen en el mismo camino de pintado (`ui.renderCarrera`) |
| D46 | Atajos de teclado 1-4 inertes en la pantalla de mercado: `shell.js:184-192` (`opcionVisible`) espera `mercadoGrid.children[i]` como el elemento clickeable, pero `mercado.js:50` pinta un `div.mercado-card` sin listener propio — los botones reales (`Firmar`/`Pedir más`) viven anidados adentro | V7 (se arregla junto con el resto del modelo de teclado, no antes, para no tocar `shell.js` dos veces) |
| D47 | `.ticks` de `material.css` (líneas 15-82) declarada y **nunca usada**: sus reglas quedaron copiadas a mano sobre una lista de 11 selectores en vez de aplicarse por la clase | V8 |
| D48 | Hilo `wip: pasada de HUD y chrome` (4 commits: `059b6c6`, `b56cfe8`, `53881c2`, `9b83478`) sin cerrar con una regla medible — quedó a medio commitear para no bloquear otras fases, con rótulos internos F0/F1 que no corresponden a ninguna fase de este documento. El último de los cuatro deja el diagnóstico sin resolver: *"el corte de 10px y el hielo al 7 por ciento no se leían a un metro"* | V8 (con una regla escrita y medible, no "a ojo") |
| D49 | Techo de `dist/` con **53 KB de margen** sobre 1700 KB (medido 2026-09-19, `node src/dev/build.js` → 1647 KB). La fase V va a superarlo con la capa de gráficos + las pantallas nuevas | V9 (re-medido y subido con número, en su propio commit — regla de proceso 2) |
| D50 | `pantallas.css` son **1815 líneas** en un solo archivo — no es un bug, pero la fase V le va a sumar CSS nuevo encima | V9 (a evaluar: dividir solo si el criterio de corte es claro, no dividir por dividir) |
| D51 | El validador de accesibilidad de color de la skill `dataviz` (`scripts/validate_palette.js`) falla sobre las dos paletas categóricas que ya existen en `tokens.css`: `--cat-*` (10 familias) y `--rank-*` (10 tiers) — banda de luminosidad, piso de croma y separación CVD, las tres en rojo. El peor par de cada una queda debajo del piso de visión normal (ΔE 9,3, piso 15 para pasar): `--cat-partido` ↔ `--cat-salud` y `--rank-bronze` ↔ `--rank-iron`. Medido 2026-09-19 corriendo el validador contra los hex reales de `tokens.css` (modo dark, superficie `--bg-surface`). No es un bug — ambas paletas ya se usan hoy sin depender de que un lector distinga dos vecinos sin apoyo de texto — pero cualquier primitivo de V1 que codifique identidad SOLO por uno de estos dos hues, sin etiqueta de texto al lado, hereda el problema | V1 (mitigación, no rediseño: todo primitivo que use `--cat-*`/`--rank-*` para identidad lleva etiqueta de texto junto al color, nunca el hue solo — regla que la skill `dataviz` ya exige y que la UI de ranked cumple hoy por accidente, `crearRankedHero` siempre muestra el nombre del tier. Retonar los hex de la paleta en sí queda fuera de alcance de V1: no está en su checklist) |
| D52 | La FASE J corre el stream de RNG en tres bloques (agencia: J1/J2 · densidad: J4/J5/J6 · el mundo: J7/J8): planteles leídos en vivo, selección de eventos reponderada, el internacional como sistema nuevo en `ETAPAS_SPLIT`. **Ninguna seed anterior a FASE J reproduce su carrera después.** Misma familia y mismo criterio que D21/D22/D35 — declarado una sola vez acá, no se vuelve a discutir por commit | J (aceptado) |
| D53 | ✅ **Cerrada (auditoría de código, 2026-09-22).** 5 constantes muertas en `BALANCE.mercado`, sobrantes de la fórmula original de 9R0e (`demanda = clamp(...)`, un piso/techo de CANTIDAD de ofertas, afinidad por fuerza) que 9M reemplazó del todo por el mecanismo de asiento de `core/demanda.js` sin borrarlas: `brechaNivelRango`, `ofertasPisoPorDemanda`, `techoDemandaBase`, `techoDemandaPeso`, `afinidadOfertaRango`. Mismo criterio que D31. `nivelLigaPorDefecto`/`brechaFranquicia` (mismo bloque) sobrevivieron porque 9M las reusa con otro sentido — no se tocaron | ✅ auditoría |
| D54 | ✅ **Cerrada (`AUDITORIA.md` H8, 2026-09-25).** `reproductor.js:101` insertaba/borraba nodos directo en `#logList` (`insertBefore`/`removeChild`), invisible al `WeakMap` de `reconciliar.js` — que nunca mira `contenedor.children`, solo su propio mapa. Al reanudar una carrera guardada (`renderFeed` puebla el mapa) el feed podía terminar con hasta el doble de filas, y una carrera nueva (`logList.innerHTML = ''`) podía reenganchar nodos desprendidos de la anterior (mismas claves absolutas, reindexadas desde 0). Corregido: `reproducirBeats` pasa por la misma `renderFeed` que el resto de la UI (con un `hasta` que crece de a un beat) y `reconciliar.js` gana `olvidarContenedor` para el caso de carrera nueva. 3 checks nuevos, verificados en rojo primero | ✅ auditoría |
| D55 | ✅ **Cerrada (`AUDITORIA.md` H10, 2026-09-25).** `validate.js:78` decía "la corrida completa tarda ~7 minutos (D32)" — la trampa T6 que el propio archivo advierte, dentro del archivo que la advierte. La propia auditoría lo había medido en ~55 minutos; remedido acá **dos veces en la misma sesión da 31:01 y 31:04** — T6 aplica incluso a re-medir un número que otro ya midió, no solo a los que quedaron viejos | ✅ auditoría |
| D56 | `AUDITORIA.md` H4: un `checkLento` de banda agregada es un trinquete — convierte "lo que el juego hace hoy" en "lo que debe seguir haciendo". El de `validate.js:4313` (*"Mediana de decisiones de draft por serie ∈ [0, 1] y ≥28% de series sin ningún draft"*) exige hoy, textualmente, lo contrario de lo que J6 va a escribir (*"series sin draft < 10%"*) | J6 (lo reemplaza — dejar en el commit o en `validate.js` el comentario de "reemplaza al check de tal fecha, que exigía lo contrario") |
| D57 | `AUDITORIA.md` H7: `store.suscribir` (`core/store.js`) y `crearDelta` (`core/delta.js`) tienen cero consumidores en producción fuera de sus propios checks — groundwork de V0 correctamente construido pero sin usar todavía. La rama `{ flip: true }` de `reconciliar.js` tampoco tiene consumidor en producción (su único caller, `graficos/escalera.js`, no está montado — ver D57 mismo, `graficos/` en general) | V2/V3 |
| D58 | `AUDITORIA.md`, hallazgos bajos H14/H15/H16: `src/dev/_probe_9m_baseline.mjs` (181 líneas) autodeclarado *"TEMPORAL, se borra tras 9Ma"* y nunca se borró · `index.html` a 194/200 líneas contra su propio candado (mismo patrón de margen que se cierra en silencio que ya le pasó a `dist/`, D49) · `README.md` dice "Node 18+" pero `with { type: 'json' }` pide Node 20.10+/22+ | higiene, cuando se toque cada archivo por otro motivo |
| D59 | `AUDITORIA.md`, hallazgos bajos H17/H18/H19/H20: ciclo de import real `core/plantel.js:5 ↔ core/mundo.js:11` (por `generarHandle`, único ciclo en todo `core/`+`systems/`) · 6 campos de estado vestigiales (`career.contracts` muerto del todo, `career.hitos` escribe-y-nadie-lee, `player.titles`/`player.worlds` duplican `career.titulos`/`internacionales`) · 84 números mágicos residuales en `systems/*.js`, concentrados en `servicioMilitar.js` · `systems/mercado.js` a 945 líneas, el archivo más grande del proyecto | la próxima fase que toque cada archivo |
| D60 | `AUDITORIA.md`, hallazgos bajos H11/H12/H13: `--rapido` cubre 41% de los checks (79/194) y salta todo lo estadístico/conductual · cero CI (no existe `.github/`, los 194 checks dependen de correrlos a mano) · cero tests unitarios (`validate.js` es el único arnés, un solo archivo) | sin fase — decisión pendiente del usuario, no deuda de código |
| D61 | `AUDITORIA.md` H22: `reemplazarEnElLugar` (`reconciliar.js`) solo copia `className`+`dataset`, no `title`/`aria-*`/`style` — correcto hoy por accidente (ningún consumidor de V0b los usa), no por diseño | V3 |
| D62 | `AUDITORIA.md` (2026-10-01): el partido que **define la clasificación** sale 0,1 veces por carrera. `motivosDeFecha` solo lo detecta en la última fecha (`core/temporada.js:178`), pero `continuarTemporada` gasta el único cupo (`fechasMarcadasPorSplit: 1`) en la primera fecha con cualquier motivo: puntero 23%, presión 22%, clásico 21% | K4 |
| D63 | El draft frena solo si el mejor campeón da ≥ 26 puntos de probabilidad más que el segundo (`core/serie.js:157-175`): pregunta justo cuando la respuesta es obvia. El umbral se calibró contra una meta interna ("≥ 30% de series sin draft", `balance.js:1361-1372`). Contrafáctico: draft de serie en ruido (5% significativo), draft de fecha en 0 | K4 (plan de Fearless por serie) |
| D64 | Mentalidad y hype saturadas en pro (mediana 97 / 100; 75% / 77% de los splits ≥ 90): el 47% de los efectos del catálogo cae sobre barras llenas, y meter mentalidad en la fuerza (J1) sería inerte | K3 |
| D65 | El retiro "emergente" casi no ocurre: el 72,6% de las carreras pro termina en `edadRetiroForzoso: 34`. Mediana de carrera pro: 16,7 años (la real es ~2,1, `CONCEPTO` §12.4) | K5 |
| D66 | No hay puntaje final ni métrica para comparar una seed (`core/legado.js` no lee `oculto.potencial`, ni la generación, ni la signature), contra lo que promete `CONCEPTO` §1/§9 | ✅ **cerrada en K1** (2026-10-02, merge `0954fb5`) |
| D67 | ✅ **Cerrada en K0-B (2026-10-02).** El tag compara contra el sueldo vigente y, si es 0 (agente libre), contra la mediana salarial de la liga de la oferta (`salarioReferencia` en `systems/mercado.js`; sin `?.` ni `?? 0` a propósito: si faltara la mediana el error tiene que verse). El check `K0-B mercado` es de dos lados (ofertas de sueldo controlado y un barrido de seeds × ligas × sueldos vigentes) y se probó contra mutantes del código. Era: siendo agente libre (sueldo 0), toda oferta salía "bombazo" (`systems/mercado.js:91`: sueldo > 0 × `bombazoMultiplo`) | K0 |
| D68 | ✅ **Cerrada en K0-B (2026-10-02).** `server.js` escucha solo en `127.0.0.1`, decodifica y resuelve la ruta, exige quedar dentro de la raíz (403) y sirve únicamente `index.html`, `src/**` y `assets/**`; lo demás, y `.git`/`node_modules` a cualquier profundidad y en cualquier variante (mayúsculas, `\`, `%2F`, nombres 8.3, flujos `::$DATA`, punto o espacio final), da 404. `createServer({ raiz })` está exportado y `node server` arranca. El check `K0-B server` levanta el servidor contra una raíz temporal con un secreto afuera y se probó contra mutantes de cada capa; en Linux/macOS algunas sondas (8.3, flujos, mayúsculas) no muerden porque esas rutas no existen. Era: `server.js` escuchaba en `0.0.0.0` y no normalizaba el path: mientras corría, se podían leer archivos fuera del repo desde la red local (solo dev) | K0 |
| D69 | ✅ **Cerrada en K0-B (2026-10-02).** Medido en Chromium real: `scrollWidth` igual al ancho del viewport (320, 360, 390, 414 y 1440 px) en setup, decisión, mercado, minijuego y fin. Causas: el panel central sin `minmax(0,1fr)`, el topbar sin `wrap` en ≤639 px, la tarjeta final clavada en una columna de 260 px por `body[data-legado="on"] .shell-cuerpo` y sin `overflow-wrap`, y el topbar sticky tapando la ficha (ahora `--topbar-alto-real`, que sigue su alto real). Solo Chromium: Firefox y Safari sin medir. Era: en celular (390 px) el documento medía 455 px de ancho: scroll horizontal y topbar cortado | K0 |
| D70 | ✅ **Cerrada en K0-C (2026-10-01).** Pasaron a vocabulario de LoL 18 JSON de eventos, `minijuegos.json` y los `.js` de retiro, mercado, rendimiento, roster, temporada, servicioMilitar, plantel, mercadoMundial, contextos y ficha; "vestuario" en texto visible: 0 (los ids no se tocan); la ficha dice "Internacional: sin chance / en carpeta". El check `K0-C vocabulario` filtra `botines|cancha|hincha|camiseta|filial|Selección:|canterano|dirigencia|pelota` sobre el texto sin comentarios de `src/` e `index.html` y sobre todos los strings de los `.json` (salvo claves `id`); **"vestuario" no está en el patrón** (hay usos legítimos en ids y código). Solo texto: la huella de 40 seeds es idéntica a la base y el estado con los strings enmascarados también. Era — vocabulario de fútbol en texto visible: "colgás los botines" (`systems/retiro.js:55`), "cancha" ×10, "hinchas" ×3, "camiseta" ×3, "filial" ×3, "Selección: …" en la ficha, "vestuario" ×168 | K0 |
| D71 | ✅ **Cerrada en K0-B (2026-10-02).** `VERSION = 2` (exportada) y el check `K0-B guardado` compara el hash de la FORMA del estado (unión recursiva de las formas de todos los elementos de cada array, sobre 10 seeds con carreras completas, independiente de la seed) contra `FORMAS_CONOCIDAS[VERSION]` en `validate.js`: cambiar la forma sin subir `VERSION` falla, y subirla sin que cambie la forma también. Puntos ciegos documentados: los campos `null` al inicio solo registran `?`, y los campos que solo aparecen en eventos raros pueden no verse en las 10 seeds. Un guardado viejo, roto o de versión futura muestra un aviso en la pantalla de inicio y se borra. Era: `VERSION` del guardado nunca subió (`core/guardado.js:13`): un cambio de forma del estado cargaría guardados incompatibles | K0 (check estático) |
| D72 | ✅ **Cerrada en K0 (2026-10-02), con la confirmación del usuario.** La rama de trabajo se pusheó a `origin` (`400f6b6..b5088da`, fast-forward, sin force); `faseV-V1-grok` se borró **después de archivar su único commit** (`d543149`, otra implementación de los primitivos SVG `linea`, `hexa` y `cinta`, distinta de la que sí está en la rama de trabajo) como el tag local `archivo/faseV-V1-grok`, que no se pusheó; los worktrees y ramas `j3-pool-oxido`, `k0-instrumento`, `k0-higiene-motor` y `k0-vocabulario` se quitaron (las cuatro estaban mergeadas y sin cambios). Era: higiene de ramas: la rama de trabajo con commits sin pushear, J3 commiteada en `j3-pool-oxido` (`76338ae`) sin mergear, `faseV-V1-grok` todavía existe | K0 (push y borrado con confirmación del usuario) |
| D73 | ✅ **Cerrada en K0-C (2026-10-01).** La banda de nivel dice "Competitivo" (`LABEL_NIVEL.titular` en `ui/components/ficha.js`) y la de jerarquía conserva "Titular". Era: "Titular" nombraba dos bandas distintas en la ficha (la de NIVEL y la de JERARQUÍA) | K0 |
| D74 | J3 estaba en la fila "sin corrimiento". Medido el 2026-09-27, 40 seeds × 30 splits, `createInitialState` + `avanzarSplitAuto`, tupla `finAnticipado:splitCount:soloqElo` redondeado: **35/40 distintas** (seed 1: `1:en_carrera:30:4139` → `1:en_carrera:30:4156`; seeds 4 y 5 idénticas). La maestría entra a `rendimientoBase` en `core/fuerza.js`, así que el piso 5→18 mueve partidos y elo. No se agregan tiradas para clavar la huella vieja. Determinismo intra-versión intacto | J (aceptado, misma familia que D52) |
| D75 | `carrera.tierMaximo` del observador de `simulate.js` cuenta el estado "agente libre de tier 2" que sigue a un ascenso (`competitivo.js:58-78`, `saltarATier2` deja `tier = 2` y `currentOrg = null`), pero `registro.porOrg` solo tiene orgs en las que se fichó. Medido en K0 (seeds 1-400 × 60 splits): discrepa en 5 de 400 carreras de `malas` y en 1 de 200 de `ranked`; en `equilibrado`, `prudente`, `criterio` y `azar` no discrepa. Ninguna categoría del embudo cambia (las 5 pasan de tier 2 a tier 3 y las dos caen en "estancado"). Hay que decidir qué es "llegó a tier N" (jugó en N, o ganó el salto) y alinear el observador o documentar la definición | ✅ **cerrada en K1** (2026-10-02, merge `0954fb5`) |
| D76 | `registro.porOrg[].tier` queda desfasado tras un descenso en el lugar: `resolverDescenso` (`competitivo.js:135-181`) pasa `career.tier` y `liga` a 2 sin cerrar ni abrir fila, así que la fila sigue diciendo tier 1 y `core/legado.js` (`splitsDeTier`, `titulosDeTier`) y `agencia.js` cuentan splits de Challengers como tier 1. Medido en K0: 37 de 400 carreras de `equilibrado` (168 splits) y 5 de 400 de `malas` (33 splits); ejemplo, seed 70 de `malas`: la fila de MVK Esports dice `tier: 1, liga: LCP` aunque desde el split 24 juega en `LCP_CHALLENGERS`. No se sabe si es deliberado ("el contrato viaja"). El puntaje de K1 (`core/puntaje.js`) lee de esas filas: se decide antes | ✅ **cerrada en K1** (2026-10-02, merge `0954fb5`) |
| D77 | `proSinTierNunca` no significa "pro sin tier": son carreras que fichan y se retiran por burnout en el mismo split (1 de 400 `equilibrado`, 36 de 400 `malas`; todas con `fin = burnout`, `splitCount = splitFichaje + 1` y `porOrg` vacío): el pipeline corta con `retirado` antes de `armarRoster`, y `career.tier` final sí es 3 (o 2). No se investigó por qué el burnout cae justo en el split del fichaje | K5 (retiro emergente) |
| D78 | **El jugador nunca juega en LCK ni en LPL.** Medido en la investigación de K2 (2026-10-02, `8e36105`, 400 carreras de `criterio` × 60 splits): 0 splits en LCK y en LPL; el tier 1 se juega en CBLOL (5.734 splits), LCP (3.767), LCS (1.525) y LEC (345), salgas de la región que salgas, Corea incluida. Nivel contra la media de su liga: CBLOL 75 contra 55 · LCP 79 contra 61 · LCS 85 contra 70 · LEC 89 contra 76. Es el mercado (y la región de origen), no la fuerza: K5 tiene que hacer que salir de Corea sea jugar en Corea | K5 |
| D79 | **No es un bug del pronóstico: es un falso positivo del check "J3 pronóstico"** (investigado el 2026-10-02 sobre `8e36105` y el candidato de K2). El pronóstico (`core/pool.js:110-118`) es la misma regla que aplica el motor (`systems/campeones.js:66`); pero el óxido aplicado es `max(0, gauss(1,5, 1))`, que da 0 el 6,68% de las veces aunque la gracia haya vencido, y el check (`validate.js:7859-7938`) mira la maestría (el efecto) y no la decisión, con a veces un solo futuro "conclusivo" por par. Resultado: falla ~25-30% de las veces que cambia el stream (en `8e36105` con otras seeds, 16 fallos de 60 juegos contra 16,9 esperados por el modelo; en ~648.000 pares de verdad ficha/motor, 0 divergencias salvo re-entradas al pool). Arreglo, solo en `validate.js`: reemplazar la observación por **propiedades sobre pools armados a mano** (ley G: en gracia nunca baja; ley P: en el piso nunca baja; ley O: "oxida" baja en al menos una de 64 seeds) más el cursor `splitCountDeLaProximaCorrida` verificado sin tiradas. Prototipo y mutantes en el scratchpad de la sesión (`d79/prop.mjs`) | ✅ se arregla en K2a, antes de que K2b corra el stream |
| D80 | **Metas de §K.3b re-basadas a lo medido al cerrar K5c** (decisión del usuario 2026-10-05: "cerrar y que K6 juzgue"). Con Final2 + LPL 91 no llegan: llega a tier 1 (meta 55-65), título de tier 1 (~30), top 20 (~15), P(2+ \| 1) (≥ 35-40%), nuevo Faker entre los de élite (≥ 30%), favorito de un Bo5 (75-85, queda arriba) y carrera mediana (4-6, queda en ~9). Los checks `K5c meta …` llevan su banda de ruido y su línea de la regla 17. La frontera conocida: endurecer el acceso a tier 1 baja el Mundial, que está justo en 7%. "Claramente el más fuerte" (margen ≥ 10) casi no ocurre (4 de ~3000 Mundiales): la meta de ~50% se mide sobre "el más fuerte". Los números exactos están en `PROGRESO.md` (K5c paso 3) | K6 juzga cuáles importan |
| D81 | **K5c-M (la élite se busca) no tiene efecto medible con la casa encendida.** Con Final2, "la casa primero" de K5c-H ordena la mano antes que la fuerza de la org. Las manos de élite son chicas (~2 ofertas), y `mercado.elite` no cambia la fuerza mediana del club que te ofrece. Su check prueba el mecanismo con la casa neutra en memoria. Si en K6 la élite no termina en los mejores clubes de su liga, el lugar es el orden dentro de los clubes de casa | K6 |
| D82 | **Anotados en la revisión de los arreglos de K5c (2026-10-05), sin arreglar:** (a) el precio de traspaso sale de `presupuestoDeDemanda`, que descuenta la edad, y el valor que se muestra no la descuenta, así que un veterano "vale" $430k/año y su traspaso cuesta ~$60k; (b) el bloque `mundoMundial` cuenta los Mundiales solo mientras la carrera vive, y pesan más los primeros años del mundo | después de K6 |
| D83 | **Lesiones en el pro** (decisión del usuario 2026-10-06: "solo en el amateur por ahora"). La deuda de sueño (`deudaSueno`) solo se escribe en el amateur; en el pro queda congelada. Con el reset al firmar (K6c-fix), la lesión grave solo le pasa a quien grindea sin dormir de amateur. Pendiente: que la rutina pro genere su propia deuda (scrims + soloQ a la noche), así la lesión de muñeca es algo real de un pro. **Mientras tanto, el final por lesión (`retiro_por_lesion`) no se alcanza en carreras naturales**: la recaída pide 17 splits seguidos con deuda en el amateur, y el burnout llega antes. Su check de cobertura queda declarado inalcanzable hasta D83 (el patrón de `servicio_militar`), con un check propio que arma el estado y verifica que el final se dispara y se narra bien. Cuando se haga D83, vuelve la cobertura natural | después de que el usuario pruebe K6c |
| D84 | **Salir de tier 3 es una moneda que no lee el nivel** (`resolverTier3`: cada disolución resetea la jerarquía; tier 3 no tiene mercado). El 32% de las carreras de `criterio` pasa 6 splits o más en tier 3, con nivel 63 contra calibre 18. El diseño era una mediana de 1-2 y se miden 5. Es la "constante abierta a criterio" de D34, medida. Se propone "el nivel manda" en tier 3, con un margen sobre el calibre de tier 2. Investigación y contrafáctico en K6c, "La noche del 2026-10-06" | decide el usuario (rama `tier3-nivel`, preparada sin mergear) |

---

# Trampas conocidas (esto ya costó tiempo)

> Vienen de `TRASPASO.md` PARTE 7, borrado el 2026-09-02. Se mudan acá enteras porque este
> documento y varios comentarios de `/src` las citan por número: sin esta tabla, cada `(trampa
> TN)` del repo queda colgado.

## T1 — Desplazamiento del stream de RNG

Todo sistema nuevo que consuma `rng()` corre el stream de todo lo que viene después. Los
agregados se sostienen pero **ninguna seed reproduce la misma carrera entre versiones**.
**Mitigación**: early return sin tocar `rng` cuando el sistema no aplica. El determinismo
intra-versión (lo que validate mide) sigue intacto; la pérdida de comparabilidad entre versiones
es aceptable y se documenta en `PROGRESO.md`.

**Técnica útil para verificar que un paso no movió nada**: extraer `HEAD` a un directorio aparte
con `git archive HEAD | tar -x -C <dir>` y comparar una huella de N seeds
(`finAnticipado:splits:soloqElo`) entre ambas versiones. Así se comprobó que el paso 7 no movió
un decimal.

## T2 — El contexto se calcula EN VIVO, no se lee del caché

`state.contexto` es una foto del **arranque** del split. La fase puede cambiar a mitad de split
(el split en el que firmás, sin ir más lejos). **Todo filtrado de contenido tiene que llamar a
`calcularContexto(state)`**, no leer `state.contexto`. Este bug ya se cometió una vez y movió
los agregados sin motivo aparente.

## T3 — El cursor de reanudación va por `sistemaId`, no por índice

`state.pendiente` guardaba un índice de `ETAPAS_SPLIT`. Agregar un sistema corre todos los
índices y corrompe cualquier partida serializada a mitad de split. Ya está arreglado — **no
volver a introducirlo**.

## T4 — Paths que no existen en `createInitialState`

`validate.js` exige que todo `field` de condición y todo `path` de efecto exista en el estado
inicial. Entonces `career.contrato`, `player.lesion`, `player.residencias` tienen que
inicializarse como **objetos completos con ceros, nunca `null`**.

## T5 — Un check que referencia una clave inexistente nunca falla

`validate.js` tenía `if (BALANCE.meta.pesoDominante <= BALANCE.meta.pesoMinimo)` después de que
esa clave se borrara. `undefined <= 0.5` es `false`: **el check pasaba siempre y daba falsa
confianza durante dos pasos.** Al escribir un check nuevo, verificar que falla cuando debe.

## T6 — No comparar contra una línea de base vieja

El balance de un changelog viejo puede haber sido medido antes de que existieran sistemas
posteriores. Ya pasó: se comparó el paso 7 contra una tabla del paso 4 y pareció una regresión
que no existía. **Medir la línea de base en el momento, no citarla de memoria.**

## T7 — Elegir por argmax sobre suma ponderada siempre da el extremo

El jugador automático elegía la rutina maximizando la suma ponderada contra los pesos → siempre
la más extrema → 70% de burnout. La función correcta es **minimizar la distancia contra las
proporciones deseadas**: "cuál de estas se parece más a cómo lo habría repartido yo".

## T8 — Verificar que las ediciones de HTML/JSON por script realmente aplicaron

Un reemplazo de texto que no matchea falla en silencio. Ya pasó: se borró `mostrarReparto` pero
quedó la llamada, y el reemplazo del render de opciones no se aplicó, así que las rutinas se
mostraban **sin su texto narrativo** — la mitad de la decisión. **Después de editar por script,
grepear el resultado.**

## T9 — `maxDecisionesPorSplit: 8` va a quedar corto

Con mercado + rutina + evento + evento + cierre de edad ya son 5, y el paso 12 agrega retiro y
vuelta. Subirlo **conservando el tope**: es la única red contra un loop infinito.
Y ojo con `CONCEPTO` §2, que dice **1-2 decisiones por split**: la oferta de mercado y la rutina
de offseason deberían ser la misma decisión cuando ambas caen, o alternarse.

## T10 — El pool de eventos se vacía con gating fino

`events.js` loguea *"Un split tranquilo, sin eventos destacados"* cuando no hay candidatos. Con
`contexto` estrechando, eso va a pasar más hasta que exista el contenido. **Medirlo**: fracción
de splits sin evento < 25% en todos los contextos alcanzables.

**Cerrada como check real en 13e** (`validate.js`, "T10: ninguna celda alcanzable pasa el 25% de
splits sin evento"): `events.js` exporta `SPLIT_SIN_EVENTO_MSG` y el check mide su frecuencia real
sobre los logs de `avanzarSplitAuto`, por celda momento×ventana, con muestra mínima de 30. Medido
con el catálogo de 517 opciones: peor celda real 3,7%.

---

# Reglas de proceso (no negociables)

1. **Una fase por commit**, cerrando la Definición de terminado completa de `CLAUDE.md`.
2. **Nunca cambiar la estructura y retunear las constantes en el mismo commit.** Primero medir con
   la estructura nueva, después tunear.
3. **Si el balance se sale de banda tras un cambio estructural, primero agregar contenido**, no
   tocar constantes. Y decir en `PROGRESO.md` cuándo se tunea y por qué.
4. **Reportar los números medidos, no los esperados.** Incluidos los que empeoran.
5. **Actualizar `CONCEPTO.md` cuando el código lo contradiga.**
   ~~Pendientes: §2 y §10 (fase 3) · §5 y §11 (fase 4) · §5 otra vez, el loop de split cambia de
   forma (fase 5) · §6, el meta cambia de definición (fase 6) · §6 otra vez, contratos (fase 9) ·
   §8 (fase 1) · §1 y §11, duración de la partida (fase 8) · §6 otra vez, se agrega ARRAIGO
   (fase 8) · §2 otra vez, se borran los relojes (fase 10)~~ — **auditados todos el 2026-09-19
   (13e): ya estaban resueltos.** `CONCEPTO.md` sí se había venido actualizando en el camino (la
   última edición databa de la fase 9R5d, posterior a las fases 3-9 que esta lista cita) — lo que
   nunca pasó fue tachar la lista. Verificado línea por línea contra el documento real: §5/§6 ya
   describen Fearless/temporada regular/meta con nombre/ARRAIGO/contratos tal como están
   implementados hoy, §10 ya usa CBLOL (no LAS/LLA), §1/§11 ya dicen "25-40 min". El reloj de
   declive/retiro de §2 se cerró en la primera pasada de 13e (D43, más arriba). Único hallazgo
   nuevo en esta auditoría, corregido en el mismo commit: **§9** ("Cómo termina") seguía listando
   "por edad" como causa de retiro en pie de igualdad con las demás, sin mencionar la causa modal
   real (el mercado deja de llamarte, §12.4) — reescrito.
6. Cada fase **activa sus momentos pendientes** en `data/contextos.js` y lo verifica con
   `cobertura.js`.
7. **Al escribir un check nuevo, verificar que falla cuando debe** (trampa T5: un check que
   referencia una clave inexistente pasa siempre y dio falsa confianza durante dos pasos).
8. **Después de editar por script, grepear el resultado** (trampa T8).
9. **El contexto se calcula EN VIVO** con `calcularContexto(state)`, nunca leyendo `state.contexto`
   (trampa T2: es una foto del arranque del split, y la fase cambia a mitad de split).
10. **Un sistema que no aplica hace early return sin tocar `rng`** (trampa T1): si consume una
    tirada cuando no corresponde, corre el stream de todo lo que viene después.
11. **El cursor de reanudación va por `sistemaId`, no por índice** (trampa T3).
12. **Ninguna fase cierra sin su pantalla.** Un sistema que el jugador no puede ver no está
    terminado. Es la lección de las fases 0-7: siete fases correctas hundidas en un feed de logs.
13. **Todo número en pantalla lleva referente.** `29/100` a secas está prohibido: va con banda con
    nombre, con flecha contra el valor anterior, o con comparación explícita. Si no se le puede dar
    referente, el número no se muestra.
14. **El registro solo crece.** Ningún sistema borra ni sobrescribe `career.registro`. Solo
    `append` e incremento.
15. **Lo que la tarjeta promete, el motor lo cumple.** Si una oferta dice `jerarquía 71 → 25`, el
    valor real post-fichaje es ese. Cualquier divergencia es un bug de confianza, no de balance — y
    es peor que un bug de balance, porque enseña al jugador a no leer.
16. **El azar grande se declara; el azar chico se esconde.** Si el motor sortea algo que el jugador
    va a sentir (una mano de ofertas, tres mejoras, un parche), la pantalla lo dice: *"el dado
    trajo…"*. Si sortea ruido (±2 de sinergia), no. El azar visible se siente justo; el invisible se
    siente roto.
17. **Un `checkLento` de banda agregada es un trinquete.** Convierte "lo que el juego hace hoy" en
    "lo que debe seguir haciendo" — protege contra regresión accidental y, en el mismo movimiento,
    encarece cualquier cambio deliberado de diseño. Al escribirlo, dejar en una línea junto al check
    qué comportamiento específico protege y desde cuándo — para que el día que ese comportamiento
    deba cambiar a propósito, el check que hay que tocar se encuentre en 10 segundos, no en una
    auditoría externa (nace de `AUDITORIA.md` H4/D56: un check de 12b exigía textualmente lo
    contrario de lo que J6 iba a escribir, y nada lo señalaba).

---

# Verificación

Cada fase cierra con:

```bash
node src/dev/validate.js                 # los checks viejos + los nuevos de la fase
node src/dev/simulate.js 1500 60 todas   # 0 crashes
node src/dev/cobertura.js --huecos       # qué contenido falta
node server.js                            # jugar a mano, cero errores de consola
git commit                                # + PROGRESO.md con los números medidos
```

Para comprobar que un cambio no movió el balance, extraer `HEAD` aparte y comparar una huella de
N seeds (`finAnticipado:splits:soloqElo`):

```bash
git archive HEAD | tar -x -C <dir>
```

End-to-end por fase:

- **0** ✅ traza sin un solo decimal; cero `scout_call` después de firmar; cero `media_meme` en
  amateur; toda opción con descripción y todo resultado con texto.
- **1** — tres carreras eligiendo jungla / mid / support dan eventos distintos. El meta se nombra
  por campeón y un main se muere con un parche.
- **2** — la misma opción con mecánica 30 y con 90 da distribuciones visiblemente distintas. Los
  splits comprimidos se leen sin quedar mudos.
- **3** — traza tier3 → tier2 → tier1; mediana de tier 3 ≤ 2 splits; un europeo fichado a los 17
  vive el año muerto.
- **4** — jugar una semifinal completa a mano: ver el marcador, los campeones quemándose mapa a
  mapa, y que el mapa 4-5 te pare **solo si el pool se agotó**. Un pool de 8 y uno de 3 producen
  series visiblemente distintas.
- **5** — jugar una temporada regular completa a mano: ver la tabla de posiciones moverse, caer en
  una fecha marcada con `stakes` legible, elegir el momento y ver el resultado de ESE partido
  cambiar según la elección. Confirmar que el split ya no cierra con seis líneas de recibo.
- **6** — ver un cambio de régimen anunciado por nombre al abrir una season, con la tier list
  propia moviéndose y un main cayendo de tier. Elegir `pool_a_cual_le_metes` al menos una vez en
  una carrera de 20+ splits.
- **7** — jugar una carrera entera de punta a punta desde la pantalla de inicio: la etapa amateur
  dura unos pocos splits, no la mitad de la partida, y el mismo evento no se repite todo el tiempo.
- **8** — la ficha está en todas las pantallas; las flechas ▲▼ se mueven al cerrar la edad; el
  NIVEL sube; el arraigo cruza un hito con nombre y la barra cambia; `VER CARRERA` muestra la fila
  de la org con sus splits y su título; cero errores de consola.
- **9** — llegar a una pretemporada con contrato venciendo, ver 4-6 ofertas, **aceptar un bombazo**,
  y confirmar en el split siguiente que la jerarquía cayó al número exacto que la tarjeta prometió
  y que el arraigo arrancó en el valor que decía. Comprobar en el draft de la serie siguiente que
  efectivamente ya casi no elegís tu campeón — la espiral de `CONCEPTO` §7, cerrada de punta a
  punta por primera vez.
- **10** — dos trazas completas, leídas como historias: una carrera tipo Faker (30+ años) y un
  `no_llego` a los 19. Las dos cierran con una tarjeta que se pueda mandar por WhatsApp y se
  entienda sola. **Cero carreras que agoten el tope de splits** (hoy: 49,1%).
- **11** — jugar 4 años seguidos: cuatro titulares distintos, cuatro notas distintas, el rival
  apareciendo con números que cambian y con su org cambiando, y cada año cerrando con una frase que
  dice qué se juega el año que viene.
- **12** — jugar una serie completa a mano viendo la categoría de cada decisión con su color, la
  consecuencia previa (dirección y magnitud, nunca el número exacto) antes de elegir, y un menú
  sorteado que se declara como tal ("el dado trajo...").
- **13** — el objetivo de opciones ya se superó 3× (442 vs. 150); lo que queda a jugar a mano es el
  hueco real (`retirado_reciente/pretemporada`) y los momentos que dejan de estar `pendiente`.
  `--huecos` vacío, ningún contexto alcanzable con >25% de splits mudos.

**La prueba final, la que importa y la que hoy falla:** jugar una carrera completa de la pantalla
de inicio a la tarjeta final, y poder contarla como una historia — dónde empezaste, qué elegiste,
qué perdiste, cuándo te llegó el bombazo, si lo tomaste, qué te costó, y cómo terminó. **Si al
final la carrera se puede narrar en cinco frases sin mirar el log, el juego está.**
