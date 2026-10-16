# PLANUI — la UI nueva de Un Split Más

> **Este documento es el plan vigente de la interfaz.** `PLAN.md` terminó (FASE V cerrada el 2026-10-08) y sigue siendo
> la fuente de las reglas de proceso, las trampas T1-T10 y la tabla de deuda técnica; este plan las respeta y continúa su
> numeración (deudas D102 en adelante). Lo que quedaba de V8b (D98, D99) se pliega acá.
>
> **Estado del documento: BORRADOR (2026-10-09).** Se cierra en dos compuertas del usuario: la **compuerta 1** (elige una
> dirección mirando la vitrina) fija §5; la **compuerta 2** (aprueba este documento) habilita la producción. Antes de la
> compuerta 2 no se toca `src/`, `index.html` ni `server.js`.
>
> Orden de lectura: §1 (por qué) → §3 (la vara) → §4 (la vitrina) → §5-§8 (qué) → §9-§11 (cómo) → §12 (cómo se verifica).

---

## 0. Estado

| Paso | Qué | Estado |
|---|---|---|
| **U0 · ola 0** | El andamio de la vitrina: datos reales (`vitrina/datos/`), panel, cargador de arte, PRNG decorativo, fuentes, verificador, capturas, "hoy", índice | ✅ 2026-10-09 (`a7126d1`, `dacbec8`, `dcb741f`; merge en `u-integracion`) |
| **U0 · ronda 1** | Las tres direcciones (A · LUZ, B · NOCTURNO, C · PANTALLAS): inicio, decisión, cumbre, tira de eras, celular | ✅ 2026-10-09 (3 × Opus xhigh en paralelo + una ronda de observaciones cada una; merge `c1d88f5`) |
| **Compuerta 1** | El usuario elige (o mezcla) mirando la vitrina; su reacción en frío queda textual en `PROGRESO.md` | 🔶 2026-10-09: finalistas **A y C** (B archivada); pidió ampliarlas para decidir (§4.2) |
| **U0 · ronda 1b** | A y C ampliadas: `partido` (serie con Fearless, Swiss 2-2) y `mercado` (ofertas + firma); A profundiza el aura y los fondos animados, C lo clásico tipo cliente (§4.3) | ✅ 2026-10-09 (2 × Opus xhigh; merges `6f145e1`, `3c790c2`; referencias en `vitrina/referencia/ronda-1b/`) |
| **Compuerta 1 (final)** | El usuario elige A, C o una mezcla | ✅ 2026-10-09: una mezcla: serie y Swiss de C, mercado de A, y "que sigan una misma línea" (§4.4) |
| **U0 · fusión** | Una sola dirección: la interfaz de C dentro del mundo de A, con 7 reglas de una misma línea (§4.5) | ✅ 2026-10-09 (1 × Opus xhigh, `f35fcb4`; merge `d7622e9`; referencias en `vitrina/referencia/fusion/`) |
| **Compuerta 1b** | El usuario mira la fusión | 🔶 2026-10-09: "está bien", pero el duotono "blanco y negro + violeta" de los campeones se vuelve repetitivo después del inicio; pidió tres variantes (§4.6) |
| **U0 · intensidad** | Una página con tres variantes de color del campeón (a color, mitad, fondo en duotono y retratos a color) y el espacio "un poco" menos (§4.6) | ✅ 2026-10-09 (`899ed27`, merge `81993d4`); el usuario respondió con capturas (§4.7) |
| **U0 · opciones** | La serie con la receta de color y el fondo nítido; tres opciones por pantalla para el partido (la competición), la decisión y el mercado (logos reales) (§4.7) | ✅ 2026-10-09 (merges `66c6cc4`, `4c2de5f`, `67764bd`, `94dc50a`); el usuario eligió y combinó (§4.8) |
| **U0 · demostración final** | Una versión por pantalla (`op=final`): serie con las pantallas del stage, Swiss como stream, decisión B+C, mercado A+C sin campeón de fondo; `final.html` (§4.8) | ✅ 2026-10-10 (merges `b45543c`, `fcd297b`, `5a8c891`, `c0297b7`); el usuario la miró y pidió correcciones (§4.9) |
| **U0 · una línea** | La mini auditoría y la corrección (`op=linea`): el bitono del inicio como gradación de todo, el segundo tono por contexto, la costura, la ceremonia del LoL, los momentos con beats y la copa en 3D (§4.9) | ✅ 2026-10-10 (merge `f7b2e7d`: K, M, A, B, C y la unificación); superada por §4.10 |
| **U0 · las últimas correcciones** | La última ronda del usuario sobre `op=linea` (§4.10), con la perilla `var=`: el champ select del inicio, las costuras `copas` y `liga` de la bisagra, VICTORIA verde y el suspenso del mapa decisivo, el stream casi negro, las ofertas que llegan con `camiseta`/`plantel`/`ofertas` y el título con el campeón, la liga y el equipo | ✅ 2026-10-10 (merge `24d9009`: I, D, T, E); esperando que el usuario mire `final.html` en el 8095 |
| **U0 · ronda 2** | La ganadora completa la estrella del norte: serie, Swiss, mercado, celular, trayectoria y PNG | ⏭️ 2026-10-10: salteada. La fusión con `op=linea` ya cubre serie, Swiss y mercado; el celular, la trayectoria y el PNG se diseñan en U2/U3 con el mismo kit |
| **Compuerta 2** | El usuario aprueba este documento (incluida la enmienda de la regla 1, §2) | ✅ 2026-10-10: "Aprobar y migrar", después de ver que lolero.lol salió con la UI vieja. La especificación es la fusión con `op=linea` y las variantes de §4.10 (§2) |
| **U1 + U1k + U1a** | Cimientos (tokens, fuentes, shell, era, transiciones, guards) + el kit `src/ui/fx/` + andamio liviano | ✅ 2026-10-10 (merges en `u-integracion`; ver §11 "Ola 1 cerrada") |
| **C1** | El usuario prueba luz, tipografía, ritmo y rendimiento en su máquina | ⬜ movida a después de U2 |
| **U2 + U2c** | Las pantallas del norte (inicio + decisión; partido + mercado) + franja, cuartos y contenedor de minijuegos | ❌ 2026-10-11, hecha por fuera del plan y descartada el 2026-10-13 (§0.2): el inicio quedaba pintado encima de todas las piezas y las pantallas no seguían la vitrina. `src/ui` volvió al cierre de la ola 1 (`1a63b63`) |
| **U2 rehecha** | La ola 2 portada de la vitrina con `op=linea` sobre tres contratos nuevos: el marco, el mundo de cada parada y narrar la respuesta en el lugar (§0.2) | 🔶 2026-10-13 |
| **C1 (adelantada)** | Lo que dijo el usuario jugando lolero.lol: colores por eje, el relato con forma, sin cortes en frío, la firma tras la prueba, el mapa decisivo narrado y la regla del movimiento reducido (§0.3) | ✅ 2026-10-13: mergeada y publicada (`c4f9e55`); el usuario la jugó (§0.4) |
| **P1 · previas** | La decisión en tres direcciones (cartas, champ select, hextech) y el stream en dos, para elegir en `lolero.lol/previa.html`; INST deja de apagar el movimiento; la serie equipo contra equipo (§0.4) | ✅ 2026-10-14: 5 workers Opus high + 1 revisor Sonnet ("OK con menores", arreglados); publicada. El usuario eligió cartas + predicción (§0.5) |
| **P2** | La dirección elegida queda; se borran las otras y las perillas; las cartas sin campeones de decoración y el stream lleno (§0.5) | ✅ 2026-10-14: 2 workers Opus high + 1 revisor Sonnet (1 bloqueante, arreglado); publicada |
| **U3a (adelantada)** | Lo que dijo el usuario jugando P2 (§0.6): la copa y el resumen de la temporada, "Mientras tanto" en rápido y la firma de una sola coreografía | ✅ 2026-10-14: 2 workers (Opus high + Opus xhigh) + scout + revisor Sonnet; publicada |
| **W · ola W1** | "Que se sienta el avance" (§0.7): la ficha en todas las anchuras, el diario con "Última hora" y el ascenso, "tan cerca" y la vitrina, la tarjeta final con el duelo y el arraigo | ✅ 2026-10-14: 3 workers Opus high + revisor Sonnet (0 bloqueantes, 3 para arreglar, arreglados en una ronda); publicada. Falta que el usuario la juegue en RÁPIDO |
| **Arreglo · la firma en todas las firmas** | El usuario (2026-10-14): "se vio bien… pero solo se vio una vez. Y probé dos". El fichaje (el mapa con tu línea, el escudo, la firma trazada y el jersey) solo lo montaban el mercado y la prueba con contrato. Faltaba en el primer club (la oferta directa del amateur o la prueba con un tier 3 no crean contrato: `fichajeDe` devolvía null), en el equipo chico que te levanta y en las firmas que el motor hace solas en el relato (la mudanza pendiente, la academia). Ahora `fichajeDe` cuenta el club nuevo sin contrato (placas "Primer equipo" y "Tu línea", sin sueldo) y el relato monta como momento la firma que ninguna parada mostró (`fichajeDelRelato`, sin repetir ni al recargar). Muestras `?previa=primer-club` y `?previa=mudanza`. El "20 % más" de la firma queda para cuando diga qué parte | ✅ 2026-10-14 |
| **W · olas W2-W3** | La carta de pretemporada y ¿gloria o billetera? (motor chico, medido); después, la final sin tirada y la plata (§0.7) | ⬜ el usuario jugó la W1 ("se nota un poquito"); W4 lo reemplaza F4, W5/W7/W8 quedan después de F. Con la ola G: W5 → G3c, W7 → G1, W8 → G5 (§0.9) |
| **F · ola F** | Lolero jugado seis años (§0.8): el Mundial se juega y se ve (Swiss y bracket con "vos"), ningún año muerto, la consecuencia en el momento y el diario que titula lo que pasó, la carta que mueve un número que ves | ✅ 2026-10-14: el usuario eligió "los 4 juntos"; 2 workers Opus high + 2 Sonnet high + revisor Sonnet (0 bloqueantes, 2 para arreglar + 5 menores, arreglados); huella 433142448 ('F'), guardado VERSION 16; publicada. Falta que el usuario la juegue en RÁPIDO |
| **G · ola G** | El Ídolo contra Lolero, jugados (§0.9): las finales con las manos y sin tirada, el perfil que no decide, siempre en un equipo, el mercado como dilema, el diario que no se repite y el final como ceremonia. Dos entregas | 🔶 2026-10-15: la auditoría (`AUDITORIA.md`) y el plan, aprobados; **las dos entregas publicadas**: la 1 (el control: G1, G2a, G3a, G3b) y la 2 (lo que se ve y el mundo: G2b, G2c, G3c, G4, más el Bo1 con las manos de D118) (PROGRESO 2026-10-15); falta que el usuario las juegue; G5 queda opcional |
| **H · ola H** | "Cada carrera, distinta" (§0.10): el mazo de eventos (la forma de elegir y el cupo propio), el mazo de cartas con rareza (solo stats), el arcade (minijuegos de verdad; el Play-In y el Swiss por tandas), la voz corta, lo raro (~190 eventos) y el álbum. Tres entregas | ✅ 2026-10-16: **las tres entregas publicadas**. La 2 trae las 12 mecánicas en canvas (10 rehechas, una nueva: `el_gancho`), el Play-In y las tandas del Swiss, la vara dicha en la ficción, los 257 eventos en voz corta y la mano de cartas nueva. La 3, lo raro (229 eventos, 484 en total), el mazo de 240 cartas y el álbum: 17 raros o más y 2,3 legendarios por carrera, Jaccard 0,09. Queda que juegue el usuario y las deudas D146-D153 (PROGRESO 2026-10-16) |
| **U3** | El resto de los momentos (banners, ceremonias, primer contrato) + la carta, el PNG y la trayectoria | ⬜ |
| **C2** | El usuario juega una carrera completa | ⬜ |
| **U4** | Pulido y cierre (D98, D99, contraste, celular, rendimiento, docs) | ⬜ |

---

### 0.1 Traspaso (2026-10-10): dónde quedó y cómo seguir

- **Rama:** `master` y `u-integracion` en `ae21e94`, pusheadas. lolero.lol y www sirven este build (Wrangler `9580fe8a-fc0a-4592-acff-46199a3761e8`, 2026-10-11). Las olas 3 y 4 no están.
- **El juego hoy:** la ola 2 está mergeada. Inicio con champ select, decisión con franjas e inspector, partido y mercado
  con la firma y el número de camiseta, franja de textos, cuartos y minijuegos. El siguiente paso es C1: mirarlo.
- **Para seguir, leer:**
  - `CLAUDE.md`;
  - la cabecera de `src/ui/escena.js` (el contrato de las familias);
  - `src/ui/fx/README.md` (la API del kit, que no se cambia);
  - §2 (las decisiones del usuario, sobre todo las filas "Compuerta 2");
  - §11 ("Ajuste de la ola 1" y "Ola 1 cerrada");
  - `vitrina/fusion/LINEA.md`;
  - el apéndice B (los briefs de la ola 2).
- **La referencia visual:** `node vitrina/servir.mjs --puerto 8095` → `http://localhost:8095/fusion/final.html`. La
  vitrina con `op=linea` es la especificación.
- **Herramientas:**
  - `node src/dev/estrella.mjs --muestras a,b --salida dir`: capturas juego | vitrina en el mismo estado;
  - `node src/dev/recorrido.mjs`: con la regla f2 nueva;
  - `node src/dev/validate.js --rapido`;
  - `node src/dev/build.js`: techo de 3150 KB, hoy 3061.
- **Orden:**
  1. la ola 2 (U2a, U2b y U2c) — mergeada el 2026-10-11;
  2. C1, el usuario mira;
  3. la ola 3 (U3a momentos, U3b la carta);
  4. C2;
  5. la ola 4 (pulido y la Definición de terminado de `CLAUDE.md`).
- **Publicar:** primero el merge a `master`; después `npm run build && npx wrangler deploy`. La config está en
  `wrangler.jsonc`: Worker `lolero`, dominios lolero.lol y www.
- **Invariantes:**
  - el motor no cambia (`HUELLA_JUEGO` 79304237, `VERSION` 15, `node src/dev/huella.js` = 1844448410);
  - cero `Math.random`;
  - colores literales solo en `tokens.css`;
  - `index.html` ≤ 200 líneas;
  - en `tokens.css`, `formatoUi.js` y `almacenamiento.js`, solo se agrega al final.

### 0.2 La ola 2, rehecha (2026-10-13)

**Qué pasó.** El 2026-10-10 y 10-11 la ola 2 se hizo con otros modelos, por fuera de este plan, y se publicó en
lolero.lol. La auditoría (capturas lado a lado con `estrella.mjs`, las 9 muestras a 1440 y 390):
- **Rota.** `#setup { display: grid }` (`inicio.css`) le gana por especificidad (un id) a la regla de piezas de
  `shell.css`: el inicio queda pintado encima de todas las piezas, y la decisión, el partido, el mercado y la final
  caen debajo, fuera de la vista. `validate.js` no lo ve (no mira la pantalla).
- **No sigue la vitrina.** El inicio sin la grilla de retratos, sin las cartas de carga ni el campeón apuntado; la
  decisión sin la costura ni el aviso; el partido sin el cara a cara, sin el stream del Swiss ni el suspenso; el mercado
  sin el flujo de la compuerta 2. Lo que se ve son chips y cajas de la UI vieja con las fuentes nuevas.
- **Lo rescatable** son ideas sueltas (el número de camiseta en `lolcs-vista`, la preferencia de textos), que se
  vuelven a escribir.
- **Decisión:** `src/ui` vuelve al cierre de la ola 1 (`2aba2c1`, en el commit `1a63b63`) y la ola 2 se rehace.

**Cómo** (reemplaza al apéndice B):
1. **Se porta la vitrina, no se reinterpreta.** Las fábricas de `vitrina/fusion/js/` con `op=linea` (inicio,
   decisión con la costura, la serie y el Swiss `linea`, las ofertas y la firma `linea`, la cumbre) pasan a las
   familias con sus hojas. Cambia de dónde salen los datos: de la `vista` y la `decision` vivas, con los mismos helpers
   puros que usó `vitrina/datos/` (franja, ficha, previas, página, "antes"), no de `muestras.json`.
2. **El marco de la vitrina.** La franja arriba (quién, club, cuándo, el número, y los controles al final), la barra de
   cuartos **abajo** con sus íconos y la trayectoria mínima, y el acompañante como la placa "Vos" (los otros tipos, en la
   misma placa). El partido y el mercado van a pantalla completa, sin acompañante (como en la vitrina).
3. **El mundo de cada parada.** La familia declara lo suyo (`arte`, `tono`, `costura`, `escena`, `lightsticks`,
   `encuadre`, `velo`) y el puente de `shell.js` lo aplica (lo guarda si el ambiente todavía no montó). La era la sigue
   escribiendo solo el director.
4. **Narrar la respuesta en el lugar** (el "elegir → resultado" de la vitrina). La vista de una parada puede exponer
   `narrar(logs, ctx)`: `app.js` se la llama con los logs de la respuesta, antes del relato. La decisión transforma la
   elegida en su resultado con los números rodando (el resultado inmediato se calcula como en la vitrina:
   `sistema.resolver` sobre una copia con el rng restaurado, sin tocar el motor ni el rng de la carrera); el partido
   juega los mapas en el cara a cara, con el suspenso del decisivo; el mercado firma. Lo narrado entra a la página del
   relato sin volver a contarse. Espacio salta, un cuarto abierto pausa, INST y movimiento reducido van al cuadro final.
5. **El relato** en el mismo sistema: el cartel de la página, los beats con su ícono, la tarjeta de cierre, y la placa
   "Vos" al costado.
6. **Guards.** `color-mix()` se permite en las hojas solo `in srgb` (el navegador lo computa a `color(srgb …)`, que
   `contraste.mjs` lee); `oklab`/`oklch`/`lab`/`lch` siguen solo en `fx.css`.

**Orden:** (a) el marco, el mundo, narrar, el inicio, la decisión y el relato; (b) el partido y el mercado sobre esos
contratos, y los cuartos y los minijuegos; (c) los momentos y la final (U3); (d) la verificación (U4) y el deploy.

### 0.3 C1: lo que dijo el usuario jugando lolero.lol (2026-10-13, textual)

La ola 2 rehecha se publicó en lolero.lol (Wrangler `68a0015b`, master `8761e6f`). El usuario jugó y mandó cinco
capturas. Esto funciona como C1 (§0) adelantada.

> "imagen 1 necesita algo mas para distinguir entre las distintas cosas que ganas, un color no se, casa, soloq, etc etc,
> lo mismo en imagen 2 para saber que ganaste mas facilmente y no tener que sentarte a leer, esta parte de puro texto de
> imagen 3 es la peor, cuando llegas a imagen 4 no hay ninguna animacion ni transcicion, te aparece de una full frio de
> un frame a otro, firme y pase la prueba y no se vio ni la animacion de firma ni nada, y me sale imagen 5 asi de cara
> dura sin animacion de nuevo, en "la serie", eso de perder o ganar el mapa que estaba en el preview del planui no esta,
> planea bien y fijate como arreglar esto"

Las capturas: (1) la planilla del plan del año; (2) "lo que pasó" de esa decisión; (3) el relato del split (parche,
la semana, dos eventos resueltos por el perfil, el cierre); (4) el mercado de agente libre ("Elegí tu equipo"); (5) la
bienvenida después de la prueba (escudo, el nombre, la camiseta con el número).

**El eje (memoria: confirmar el eje antes de hacer variantes).** En 1 y 2 el usuario nombra el eje: **color por cosa que
ganás** ("un color no se, casa, soloq"). El objetivo es el que dice él: saber qué ganaste sin leer. En 3 el problema es la
cantidad de texto, no un color. 4, 5 y la serie son movimiento que falta. No se hacen variantes: una versión por punto, y
el usuario la juega antes del deploy.

#### Los seis puntos y cómo se arreglan

1. **La planilla (captura 1): un color por eje.** Hoy todas las barras son verdes (sube) o rojas (baja): se ve el signo
   pero no qué se movió. Contrato nuevo `src/ui/core/ejes.js` (escrito por el Supervisor): `ejeDe(campo)` →
   `soloq | estudios | sueno | casa | cabeza | juego | fama | equipo`, con su glifo y su nombre corto. Los colores son
   `--eje-<id>` y `--eje-<id>-fill`, al final de `tokens.css`. **El color dice qué se movió; el signo lo dicen los
   triángulos y el número** (--up / --down, como siempre). Ningún eje es verde ni rojo puro. En la planilla:
   - la cabecera de cada columna (glifo y nombre) va en el color de su eje;
   - las barras de esa columna se pintan en ese color: llenas si sube, en el relleno tenue si baja;
   - la celda de la ganancia más grande de cada fila se marca en su color (un brillo o un fondo `-fill`). Así "Aparecer
     en casa" se lee "casa" y "Bootcamp" se lee "SoloQ" sin leer los números.
   - El inspector de abajo usa los mismos chips de eje.
2. **"Lo que pasó" (captura 2): ganaste y perdiste, de un vistazo.**
   - Arriba, una fila de chips de eje en dos grupos: "GANASTE" (▲ SoloQ +90 LP) y "TE COSTÓ" (▼ Sueño −17 · Cabeza −11 ·
     …), ordenados por magnitud.
   - Las tarjetas grandes de cada número van en el color de su eje: glifo, rótulo y una barra 0-100 que va del antes al
     después. Las que suben, primero y plenas; las que bajan, después y atenuadas.
   - SoloQ, con su escalón (el emblema o el rango) en grande.
   - El texto repetido se va de la vista. Hoy el plan se cuenta tres veces: "Tu plan para este año…", "Tu plan,
     'Bootcamp…': 14 bloques…" y "estudios -3, sueño -17, confianza -3". Queda una línea (la de los bloques y el LP); lo
     demás va a "más" y a textos completos (§7.5: nada se pierde).
3. **El relato del split (captura 3): menos texto, más forma.** Cada beat se vuelve una tarjeta con forma propia:
   - **Los efectos en chips.** "estudios -7, sueño -5, confianza -2", "Mecánica +1, Laneo +3", "Sylas +2 maestría" y la
     tira técnica ("Split 6: mecánica -1…") pasan a chips con el glifo y el color del eje, y el signo en --up/--down. Se
     leen del texto del motor con `ejeDe` (el motor no cambia). Una palabra que no es eje queda como chip neutro.
   - **La semana:** los bloques como una tira de cuadraditos (ranked en el color de SoloQ, dormir en el de sueño,
     robados al sueño rayados) y el LP como "Diamante I · 70 → 83 LP" con la barra del escalón.
   - **El parche:** cada cambio de campeón en un chip ("LeBlanc A→B ▼", "Viktor B→A ▲") y el ajuste al meta como un
     medidor de 0 a 100.
   - **El evento que resolvió tu perfil:** el título; el planteo en una línea (el resto en "más"); la elección como cita
     con la placa del perfil ("COMO LEAL → Agarrar solo lo que te sirve"), su resultado en una línea, y los chips.
   - **El beat que corta** (por ejemplo "No da más la cabeza. Te bajás: esto se terminó acá"): una tarjeta de alerta,
     más grande y con el acento rojo.
   - Con `html[data-textos="completos"]` vuelve toda la prosa. El reproductor mantiene la entrada beat a beat y los
     números que ruedan (`animarEfectos`).
4. **La entrada al mercado (captura 4): no más cortes en frío.** `mostrarLaParada` (`app.js`) pide la View Transition
   solo para `partido` (§6.3 la limitaba a tres lugares). §6.3 se amplía: también entran con transición el mercado, la
   decisión (el panel sube sobre el relato) y el minijuego. Además la parada misma tiene su entrada coreografiada (en el
   mercado: el título, las cifras, los escudos y el mazo de ofertas en cascada, como en la vitrina `ofertas`).
5. **La firma después de la prueba (captura 5).** Pasar la prueba tiene que llevar a la firma sobre el contrato, la
   línea que cae sobre el mapa y la bienvenida con su entrada (el nombre, el escudo, la camiseta y el confeti, con
   tiempo). Es la ruta del commit `26a82ef`. La causa sale del diagnóstico de abajo.
6. **La serie: ganar o perder cada mapa.** El mapa a mapa existe (`caraACara.js`, `narrar` → `secuenciaSerie`, con
   VICTORIA/DERROTA por mapa y el suspenso del decisivo), pero el usuario no lo vio. La causa sale del diagnóstico.

**Diagnóstico de 4, 5 y 6** (scout Sonnet, 2026-10-13). Jugó el build en Chromium con capturas en secuencia, con y sin
`prefers-reduced-motion` (si Windows tiene apagados los "Efectos de animación", Chrome reporta *reduce*). Con *reduce*
(o con la velocidad INST) los tres reportes se reproducen tal cual. Sin *reduce*, el 4 se reproduce igual, y el 5 y el 6
tienen huecos propios:

- **4 · los cortes en frío** (pasa a velocidad normal). Solo tres cambios llevan View Transition:
  - parada → relato tras elegir (`app.js:490`);
  - relato → `partido` (`app.js:252`, `transicion: ['partido']`);
  - la final (`app.js:322`).

  Son cortes secos: relato → decisión, relato → mercado, relato → minijuego, entrar al juego y volver al inicio. Con
  *reduce*, `fx/transicion.js` (`puedeAnimar`) corta todo.
- **5 · la firma después de la prueba.** A velocidad normal la bienvenida corre entera: el mapa con "tu línea cae", la
  camiseta, Seguir. Pero falta un paso: después de pasar la prueba nunca se ve el contrato sellado como firmado.
  `paradas/minijuego.js:63-69` salta directo a `narrarFichaje`. `narrarContrato` solo corre antes del minijuego
  (`mercado.js:821`), con el sello "A prueba", y dura ~150 ms en pantalla. Además esa ruta llama a `narrarFichaje` sin
  `valor` ni `tono`. Con *reduce*, `fx/beats.js` (estado "quieto") dibuja la bienvenida al instante y
  `narracion.saltada = ctx.rapido` la deja de golpe: es la captura 5 exacta.
- **6 · la serie mapa a mapa.** A velocidad normal, en una serie con parada de plan, se ve bien: cartas, VICTORIA,
  pips, la quema de Fearless. Los huecos son tres:
  1. El mapa decisivo de semis, final e internacional no usa el cara a cara: es un minijuego
     (`balance.js:1894` `rondasConMinijuegoDecisivo`, `systems/serie.js:326-340`). Después del veredicto no se narra
     ni ese mapa ni el cierre de la serie: va directo al relato ("¡CAMPEONES!" en una línea). Pasa también a velocidad
     normal, y es el momento más importante.
  2. Las series cantadas y las que no tienen nada en juego no frenan (`systems/serie.js:267-289`, `:388-389`): sus
     mapas son líneas `adjunto` del relato, solo texto.
  3. Con *reduce* o INST el cara a cara no se ve. `.tx-mapa`, `.tx-charla` y `.tx-cierre` nacen `visibility:hidden`
     (`transmision.css:85`) y solo los muestran las WAAPI, que con movimiento reducido no corren (`fx/util.js:37`).
     Además `narracion.saltada = ctx.rapido`: dura 150 ms y no muestra nada.

**La regla nueva del movimiento reducido.** Hoy *reduce* e INST hacen lo mismo: saltear. Eso borra información, no
movimiento. Desde ahora:
- **INST** (la velocidad que el jugador eligió) va al cuadro final, pero ese cuadro tiene que ser visible y completo:
  los mapas con su resultado y la placa de cierre.
- **Movimiento reducido** (una preferencia del sistema operativo) cuenta lo mismo sin desplazamientos: cada paso
  aparece como cuadro fijo, con un fundido corto (≤150 ms) y su tiempo de lectura. Un mapa con su VICTORIA o DERROTA,
  el contrato sellado, la bienvenida. Enter o Espacio adelantan, como siempre.
- Los cambios de pantalla con *reduce* también usan ese fundido corto, nunca un corte seco.

#### Las subfases (ola C1, WF-011: dueño por archivo)

| Sub | Qué | Archivos (dueño) | Worker |
|---|---|---|---|
| **C1a · ejes** | Puntos 1 y 2: la planilla y "lo que pasó" con los ejes; la placa "Vos" con los mismos colores; ajuste fino de `--eje-*` (contraste y separación) | `components/decision.js`, `estilos/decision.css`, `acompanante.js` (+ su css), el bloque `--eje-*` de `tokens.css` | Opus xhigh |
| **C1b · relato** | Punto 3: los beats con forma (chips, la semana, el parche, la crónica, la alerta). También el 6.2: los mapas de una serie sin parada como una fila de mapas con su VICTORIA o DERROTA (y el campeón), no como líneas de texto | `components/feed.js`, `estilos/feed.css`, `components/cierre.js` si hace falta; un helper de chips en `components/chipsEje.js` (nuevo, lo pueden usar los demás) | Opus xhigh |
| **C1c · movimiento** | Puntos 4, 5 y 6.1/6.3 según el diagnóstico. Todas las entradas a una parada con transición (no al retomar). Después de la prueba, el contrato sellado "Firmado" y luego la bienvenida (con `valor` y `tono`). Después del minijuego del mapa decisivo, ese mapa y el cierre de la serie en el cara a cara. La regla nueva del movimiento reducido | `app.js`, `escena.js`, `fx/transicion.js`, `narracion.js`, `estilos/shell.css`, `components/mercado.js`, `components/fichaje.js`, `components/caraACara.js`, `components/transmisionComun.js`, `estilos/transmision.css`, `paradas/minijuego.js` (y `fx/beats.js` por dentro, sin cambiar su API) | Opus xhigh |

Las tres en paralelo, cada una en su worktree desde `master`. `core/ejes.js` y los tokens base son del Supervisor
(commit antes del despacho). Un token nuevo va en un bloque propio al final de `tokens.css`, con el nombre de la
subfase. Después: un revisor con navegador (capturas de los seis puntos, a 1440 y a 390). Luego el usuario juega el
build local (memoria: playtest antes de cerrar), y recién entonces el deploy. El motor no cambia: `HUELLA_JUEGO`
79304237 y `huella.js` 1844448410 iguales.

### 0.4 P: lo que dijo el usuario jugando C1 (2026-10-13, textual) y las previas

> "siento que hicimos todo lo otro muy avanzado, pero la parte donde elegís las cosas es como full HTML, ¿me entendés?
> Cero avanzado, cero profesional, que era lo que yo había pedido en el primer plan, tipo que sea algo totalmente
> avanzado, increíble, eh, profesional […] Tipo, re sorprendente y esto es re simple. Yo las animaciones las tengo
> activadas en Windows, pero aparte no tienen nada que ver porque esto es en Chrome. […] Y no veo ninguna animación.
> Ahora, por ejemplo, jugando una serie, me aparecía Silas contra Loud. No entiendo el sentido que tiene, sobre ser Los,
> que era el equipo en el que yo estaba firmado, contra Loud. Aparte me mostró el mismo campeón las tres partidas. […]
> cuando es el coso del stream, en un partido que es el overlay, como que estás viendo un stream, es muy difícil
> encontrar la poll, o sea, el chat, como que te perdés […] Hay varias cosas del juego que hay que solucionar y por eso
> quiero tener la UI lista para poder solucionar lo otro."

Sus respuestas en la misma sesión:
- **La decisión:** elige "cartas tipo aumentos", pero *"me gustaría tener una preview de las 3 opciones, si podés
  buildearla y subirla a una página y así elijo"* (cartas, champ select, hextech).
- **El stream:** *"dame una preview"* (la predicción es la decisión / pausa de transmisión).
- **INST:** *"yo saqué INST e igual no veo animaciones, checkealo"*.
- **El costo:** *"que salgan re bien las previews, re avanzadas, profesionales y todo, pero intentá que no gasten 10
  millones de tokens cada uno"*.
- **El flujo:** *"pusheá todo siempre, o sea, se prueba en la página"*: cada entrega va a master, se pushea y se
  publica en lolero.lol. El usuario no prueba en local.

#### El diagnóstico (medido)

- **Cero animación = INST.** En el Chrome del usuario, en lolero.lol: `lolcs-velocidad-reproductor = "instantaneo"`,
  `<html data-inst>`, `prefers-reduced-motion: reduce` falso. INST apaga **todo**, no solo las esperas:
  - `animar()` devuelve null (`fx/util.js:37`);
  - las reglas `html[data-inst]` de siete hojas;
  - sin View Transition (`app.js:139`, `escena.js:117`);
  - la narración va al cuadro final (`reproductor.js:150`);
  - la serie solo muestra la placa de cierre (`caraACara.js:397`).

  El botón muestra el estado ("INST") y se lee como una acción: el usuario creía haberlo sacado.
- **A 1× el movimiento se nota poco:**
  - entradas de 280 ms y 12 px (`util.js:31`);
  - cortes secos al continuar, al empezar y de relato a relato (`app.js:779, 885, 888`);
  - `escenario-entrar` y `.eligiendo` sin CSS;
  - el hover es un tinte de 140 ms.
- **El rendimiento no es.** Con la GPU de la máquina del usuario (RTX 2060, Chromium con `--use-angle=d3d11`) el
  juego anda a 240 fps. Con SwiftShader (como medían los revisores) da 0,4-3 fps: las capturas de movimiento de las
  olas anteriores eran pases de diapositivas. Desde ahora el movimiento se mide con GPU.
- **"Sylas contra LOUD":**
  - el cara a cara pone en grande el nombre del campeón (`caraACara.js:158`, `text: n || org`), y LOS va chico;
  - en las fechas el rival siempre es el org (`:115`).
- **El mismo campeón tres veces.** El motor respeta Fearless y guarda el campeón de cada mapa
  (`systems/serie.js:373-397`). Pero:
  - en INST el mapa a mapa no se ve;
  - el fondo es siempre el campeón del split (`core/mundo.js:20-39`);
  - en el celular los nombres por mapa se ocultan (`transmision.css:202`).

  Lo que es del motor va a la deuda (D103-D105).
- **El stream:**
  - la decisión es un panel chico arriba de la barra de 360 px (`stream.js:177-182`);
  - la "predicción" parece votable y no lo es (`stream.js:186-207`);
  - el pie del chat parece un campo de texto (`stream.js:778`).
- **La decisión:**
  - la vitrina nunca diseñó las decisiones comunes ni la planilla: son filas transparentes y una hoja de cálculo
    sobre el campeón esfumado;
  - §4.8 prometía "las decisiones comunes llevan C atenuado" y `op=linea` lo dejó caer.

#### Cómo se hace

**Paso 0 (Supervisor).** Primero estos documentos. Después la base compartida:
- **El modo previa:** `?previa=<muestra>` cambia `localStorage` por un almacén en memoria sembrado con una muestra
  (`src/ui/previa/almacen.js`, un script clásico antes del módulo). La carrera guardada del usuario no se toca.
- **La página** `previa.html`.
- **Las perillas** `?dc=cartas|draft|hextech` (la decisión) y `?sw=prediccion|pausa` (el stream). Sin perilla, el
  juego de siempre.
- **Las piezas puras** de `components/decision.js`, exportadas para las variantes.

**Ola P1.** Cinco workers en paralelo, dueño por archivo:
- **M · movimiento:**
  - INST pasa a "Rápido": el relato no espera y las narraciones se aceleran, pero el movimiento nunca se apaga;
  - el botón dice el estado sin ambigüedad;
  - fuera los cortes secos;
  - 1× con más cuerpo.
- **D-A · cartas:** cartas de aumento (Arena/TFT) con el color del eje. Al apuntar, se inclinan siguiendo el mouse.
  Al elegir, la carta gira y se vuelve el resultado.
- **D-B · champ select:** la fase del draft. Las opciones son franjas de pick; al elegir, BLOQUEAR con el lock-in.
- **D-C · hextech:** el evento del cliente, con su ilustración y el marco dorado. La chance va en un anillo y al
  elegir hay un estallido de crafteo.
- **P · partido:**
  - la serie equipo contra equipo (logos), con el duelo de campeones por mapa y el fondo por mapa;
  - los mapas, visibles en el celular;
  - el stream con sus dos variantes.

Después: un solo revisor con GPU, los arreglos al mismo worker, merge a master, push, deploy y el enlace
`lolero.lol/previa.html` al usuario.

**Ola P2.** Queda lo que el usuario elige. Se borran las otras variantes, las perillas y las reglas `[data-inst]`
muertas, y hay una ronda de pulido con sus notas.

**El costo** (pedido explícito). Workers Opus 5.5 · high (no xhigh), con tope duro de llamadas (70; partido 80). El
brief trae los archivos a leer y la coreografía en ms. Sin validate completo, ≤ 12 capturas y una entrega de ≤ 10
líneas. Meta: ~150-250K por worker; las olas anteriores, 400-540K.

### 0.5 P2: lo que eligió el usuario (2026-10-14, textual) y cómo queda

> "el de las tarjetas me gustó. ¿Qué es lo que pasa? Que tenga el campeón atrás no pega mucho atrás de la tarjeta. O
> sea, me refiero en la tarjeta. Que haya un campeón random. Entonces, a lo que me refiero, estamos abusando el recurso
> del campeón. ¿Qué sé yo? ¿Qué otra cosa podríamos poner ahí? No se me ocurre. Pero no quiero que haya campeones en
> todos lados donde no tienen nada que ver. […] me gustó el de la predicción del stream, pero quiero que arregles la
> pantalla del stream. […] está el chat, está el stream, pero la pantalla queda un poco vacía […] entre el espacio que
> hay en el chat y el stream ahí está vacío después a la izquierda del stream no hay nada se podría poner algo a la
> izquierda centrar un poco más el stream y rellenar […] que quede más lleno no tan fake […] quizás con streamers o
> transmisiones falsas […] un overlay […] sé creativo y soluciona estos problemas. Y ya está."

**Lo medido** (capturas con GPU, 1440 y 1920):
- Cada carta lleva en su ventana un campeón del pool por índice (`cartas.js`, `claveDeArte`): Ashe, Kalista y Varus
  en "El coach que también es el dueño".
- Además, detrás de toda la decisión está el campeón del split (`paradas/decision.js`, `mainDe`). Sivir aparece
  enorme detrás de una decisión sobre el coach.
- El stream a 1920: el video (16:9) termina en x≈1313 y el chat empieza en 1512. Quedan ~200 px vacíos en el medio y,
  a la izquierda, solo el margen. Abajo, la fila "Ronda 5 · los cruces" es una banda medio vacía.
- El chat usa `///` como emote, y eso se lee como un error.

**La regla nueva (vale para todo lo que sigue):** un campeón aparece solo cuando la pantalla habla de él. Es decir,
cuando:
- es tu campeón jugando (la serie, el stream, el relato de tus partidas);
- o la decisión lo nombra.

Nunca va como decoración. Se queda como está en el relato y en la luz de la era: ahí es tu campeón del split jugando.

**Cómo queda:**
1. **La decisión de siempre son las cartas** (`components/decision/cartas.js`).
   - Se borran `components/decision.js`, las variantes `draft` y `hextech` con sus hojas, y la perilla `dc`.
   - De `decision.css` queda solo lo que usan la costura y los demás.
   - El arte de cada carta, por prioridad:
     1. el campeón que la opción o el evento nombra;
     2. el logo del equipo o de la liga adonde lleva la opción (las ofertas, el destino);
     3. si no, **el emblema del aumento**: una ilustración vectorial propia por eje (8 motivos, en el color del eje,
        con profundidad). Es el ícono de un aumento de Arena o TFT, que no son splashes.
   - El fondo de la decisión sigue la misma regla: el campeón solo si la decisión lo nombra; si no, la luz de la era
     sin campeón. La costura del destino no cambia.
2. **El stream de siempre es la predicción.** Se borran la pausa, el panel chico y la perilla `sw`.
   - La pantalla se llena como una plataforma de streaming de verdad, en tres columnas sin bandas vacías:
     - a la izquierda, un riel "EN VIVO";
     - el player al centro, ocupando lo que queda;
     - el chat pegado a la derecha.
   - El riel tiene:
     - los otros cruces de la ronda como canales en vivo (con logos, marcador y espectadores), que reemplazan la
       fila de abajo;
     - co-streamers inventados que miran tu partida (los nombres del chat).
   - Los números salen de `fx/azar.js`, sembrados. Nada del riel parece un botón.
   - A 390, el riel pasa a ser una tira bajo la info, sin scroll horizontal de página.
   - Fuera los `///`.
3. **Limpieza** (Supervisor):
   - las reglas `[data-inst]` muertas y la rama `'inst'` de `mercado.js`;
   - `perillas.js`;
   - la página de la previa, con las muestras sin variantes;
   - el techo de peso, re-medido y bajado.

**Cómo se hace:** el Supervisor hace la limpieza. Dos workers Opus 5.5 · high, cada uno con un tope de ~70 llamadas
y un brief cerrado:
- **cartas:** la decisión y su fondo;
- **stream:** el stream.

Después, un revisor Sonnet con GPU. Al final: merge, push, deploy y el enlace al usuario.

### 0.6 Lo que dijo el usuario jugando P2 (2026-10-14, textual): el relato que pasa volando, la firma y la copa

> "[el relato] hay que fixear eso […] o hacer que esté en otro lado, o que no aparezca después de la respuesta […] se
> ve dos segundos, una banda de texto, no tiene sentido, no se puede leer […] Supongo que eso es más tema de motor […]
> pero fíjate, si se te ocurre alguna maravilla con la UI […] [la firma] me gustaría que en el papel de la derecha
> también se ponga la firma o que se ponga el papel […] enfrente de todo como más grande y que ahí también se ponga la
> firma. Y después […] que de ahí caiga como desde arriba superpuesto la línea […] Y de ahí se vaya para la izquierda de
> última y aparezca o se esfume o quede, pero que aparezca después el logo del equipo y la remera. […] hacelo bien, que
> quede bien hecho, full avanzado, profesional y sé creativo. También te quiero decir que gané el [EMEA] Master y no
> vino el resumen de la season ni la copa ni nada."

**Lo medido** (scout + capturas con GPU):
- **El relato en RÁPIDO** (el valor guardado `instantaneo`; el usuario juega así).
  - `sinPulso()` pone la espera entre beats en 0 (`reproductor.js:144`, `:222`): `renderPagina` pinta cada beat en el
    mismo tick y la parada siguiente entra enseguida.
  - Medido en `?previa=evento`, eligiendo 1: a los 1,5 s ya estaba en pantalla la decisión siguiente ("Cierre de
    2029"), y el tramo entero del split pasó como una página que se ve un instante.
  - Eso es "la banda de texto". Lo único que queda es la línea mono de "lo último que pasó" (`renderParadaAntes`,
    `feed.js:962`).
- **El resumen de la temporada existe y en rápido se saltea.**
  - `tarjetaSeVe = cierre && !sinPulso()` (`app.js:514`) y `ESPERA_CIERRE_ANIO_MS.instantaneo = 0`.
  - El resumen del año (`crearRevealResumenAnio`, `feed.js:89`, el log `edad`) llega recién después de responder "Fin
    de año", y en rápido pasa volando como el resto.
- **La copa no existe en el juego.**
  - `fx/trofeo.js` (la copa 3D del kit) no lo importa nadie.
  - No hay `ui/core/momentos.js` ni `fx/momento.js`: los momentos de §6.5 (U3a) nunca se construyeron.
  - El título se registra (`systems/serie.js` `aplicarTitulo` y `rendimiento.js:202-216`, en `registro.titulos`), y la
    UI solo lo detecta como texto (`resultadoDelSplit`, `ui/core/escena.js:166`).
- **La firma** es una sola escena con awaits:
  1. `narrarContrato`: la hoja de la izquierda sube, la firma se traza en ella (`.ms-ct-vos`) y cae el sello.
  2. `narrarFichaje`: un overlay `.fj` con el mapa de la Grieta (`escenaDelMapa`, `T_MAPA`) y después el walkout
     (`laFirma`, la camiseta y el número).
  - En el papel de la derecha (`pilaDeCartas`) solo cae el sello "Firmado". Con `top: 46%`, el sello tapa la fila
    "2 años 2030-2031" (`mercado.css:364-367`).
  - Ningún check de `validate.js` fija la firma.

**Cómo queda.**

1. **La firma, una sola coreografía** (1×, en ms desde FIRMAR; en rápido, escala 0,35; Espacio salta al walkout).
   | ms | Qué pasa |
   |---|---|
   | 0-450 | Se apagan la grilla y la hoja. El papel de arriba de la pila se despega, gira a plano y viaja al centro: es grande (~min(560 px, 44vw)) y va adelante de todo, sobre un velo. Los otros papeles caen. |
   | 450-1500 | Tu firma se traza en el papel: la misma letra de `trazarFirma`, en una línea nueva "[NICK] · EL JUGADOR", al lado de la del club. |
   | 1500-1800 | El sello FIRMADO cae al pie del papel (nunca sobre los términos), con el golpe. |
   | 1800-2300 | Se sostiene. |
   | 2300-3300 | El mapa de la Grieta con las cinco líneas y el escudo cae desde arriba, superpuesto al papel. El papel se va atrás: escala .9, blur y apagado. |
   | 3300-4300 | Tu línea cae y se enciende (lo de hoy). |
   | 4300-5100 | El mapa se va a la izquierda y se achica (FLIP) hasta el lugar del escudo del walkout. El mapa se funde en el logo del equipo: el escudo del mapa es el logo. El papel se esfuma. |
   | 5100- | El walkout de hoy: nombre, bienvenida, contrato, la camiseta que entra con el cono de luz, el confeti y el número. |

   - Con movimiento reducido, tres cuadros fijos: el papel firmado, el mapa y el walkout.
   - Archivos: `components/mercado.js`, `components/fichaje.js` y `estilos/mercado.css`.
2. **Los momentos: la copa y el resumen** (U3a adelantada, solo lo que pidió el usuario).
   - **El título** (liga o torneo) y **el Mundial** (variante dorada) son un takeover, con la secuencia de §6.5:
     1. apagón;
     2. golpe de luz en el tono de tu org;
     3. "CAMPEONES" enorme, la liga y el año, y el logo;
     4. la copa 3D de `fx/trofeo.js` que sube y gira, con confeti en los colores del equipo;
     5. asentarse.
   - Dura ≤ 2,4 s a 1× (×0,35 en rápido, nunca 0). Después queda en el cuadro final hasta Continuar (Enter o clic).
   - La señal sale de la UI, sin tocar el motor: `registro.titulos` crece entre la foto y la vista, o un log
     `internacional` `campeon`. `momentosVistos` va al final de `almacenamiento.js`: retomar no los repite.
   - **El resumen de la temporada se ve en todas las velocidades** y espera a Continuar. Una pantalla con:
     - la nota y la banda, la titular y las viñetas (`temporadaResumen.js`);
     - tus splits (liga, posición y récord);
     - los títulos;
     - el rango o los LP de antes → después, con el odómetro;
     - los ejes que se movieron, como chips;
     - "En el mundo": los campeones de las ligas y del Mundial (`mundo.escenaAnual`), con logos.
3. **El relato en rápido: "Mientras tanto".** En rápido, el tramo no se pinta como página que pasa volando. La parada
   siguiente abre con una franja "Mientras tanto" en lugar de la línea mono de `renderParadaAntes`.
   - **La franja tiene:**
     - cuántas cosas pasaron;
     - los ejes sumados del tramo, como chips de color;
     - 2-3 titulares (primero tus resultados y los eventos con elección; el mundo al final).
   - **Clic o una tecla** la abren como un cajón sobre la parada, con la página entera del tramo y scroll. Esc la
     cierra.
   - A 1× y 2× el relato sigue como hoy, y la franja aparece igual, como repaso.
   - En rápido no se muestra la pista "Espacio pasa las líneas".
   - Las constantes `x1` no cambian (los espejos de `simulate.js`, "K0 espejos").
   - Los checks V4 y H8 se actualizan a la regla nueva, sin aflojarlos.

**Cómo se hace.**
- Dos workers en paralelo, con worktrees desde master:
  - **F · la firma** (Opus 5.5 · high, tope 80);
  - **M · momentos + relato** (Opus 5.5 · xhigh, tope 110), porque es lo más acoplado: el reproductor, los checks de
    tiempos y el espejo de `simulate.js`.
- Después, un revisor Sonnet con GPU, una ronda de arreglos por worker, merge, push, deploy y el enlace.
- Muestras nuevas para probarlo, en `previa/generar.mjs`:
  - `final` (la final de playoffs que se gana);
  - `firma` (el mercado con una oferta de otro club).

### 0.7 W · "que se sienta el avance": lo que tiene El Ídolo (2026-10-14, el usuario textual + una carrera jugada)

> "el juego no se siente como el objetivo del inicio […] no hay que hacer grandes cambios de motor […] ese fue
> nuestro problema por un montón de tiempo […] la season pasa muy rápido, no sentís un avance […] podés jugar varias
> temporadas […] viendo qué es lo que hace que ese juego sea más divertido, la esencia. Compararlo con el nuestro,
> que quizás no haya que hacer tantos cambios." · "fijate cuando termina el otro claude y ahí arranca"

**Lo que se hizo.** El supervisor jugó en Chrome una carrera entera de El Ídolo (Potrero): 22 temporadas, de los 16 a
los 38 años, clase Habilidoso, con decisiones de verdad. Hubo club chico, pase a un grande, Europa, pedido de salida,
lealtad hasta ser Leyenda, traición al clásico rival y el jeque. Después un scout comparó con master `b7397c7`. El
análisis completo está en `~/.claude/plans/mira-te-voy-a-scalable-liskov.md`.

**Lo visto en El Ídolo:**
- **Cada temporada son 2-4 clics:**
  1. la carta de pretemporada ("el dado trajo tres mejoras, elegí una": +3 a un stat, rareza común, rara o icónica);
  2. a veces, una decisión de ~30 palabras con el riesgo escrito ("⚠ Fútbol lotería");
  3. cada 1-3 años, el mercado;
  4. si llegás, la final;
  5. el diario.
  **Pasa más rápido que la nuestra, y sin embargo se siente avanzar.**
- **La ficha fija, siempre igual:**
  - la MEDIA (63 → 99) y los stats con ▲▼; las rojas recién a los 30;
  - **el amor por club**: Uno más → Querido → Referente → Ídolo → Leyenda, con barra y "→ próximo N". En Leyenda:
    "tenés tu estatua";
  - la escalera de la selección;
  - los partidos, goles y títulos;
  - la plata;
  - **la Gloria (el puntaje), que se mueve a la vista y bajó 140 mil al traicionar**;
  - la vitrina que se llena;
  - la trayectoria club por club.
- **El mercado es LA decisión, y se lee de un vistazo.**
  - Cada oferta muestra el sueldo, los años, "vas a jugar más o menos", "dejás X: −8 de idolatría" y "allá arrancás:
    Querido (29) — tu fama te precede".
  - Las etiquetas son BOMBAZO, RENOVACIÓN, A LA BAJA ("ya sos leyenda acá") y TRAICIÓN en rojo.
  - Lo resume la pregunta "¿Gloria o billetera?".
- **La consecuencia te persigue.** Fui Leyenda (96) en Marsella y me fui al PSG por 4× la plata:
  - Marsella quedó "Querido 49 🐍" y el diario dijo "tu nombre es mala palabra";
  - la carrera terminó titulada **"EL TRAIDOR DE PSG — Te quedaste a un paso de la eternidad"**.
- **El diario de cada temporada:**
  - un titular por lo más saliente ("EL RIVAL LE PASÓ EL TRAPO", "¡CAMPEONES!");
  - tu club y tu puesto, y 5 números;
  - **"Última hora", que cita tu decisión**;
  - viñetas que te nombran;
  - "¡AHORA SOS ÍDOLO!".
- **El clímax es raro y está en tus manos.**
  - La final se juega con un minijuego, sin tirada después.
  - Ganar trae la copa grande, "Eterno" y la vitrina. Perder trae "TAN CERCA… leíste bien la jugada y se fue rozando el
    palo".
  - El Mundial es cada 4 años y se juega entero ("a esperar cuatro años").
  - El primer título llegó en la temporada 7.
- **El rival de toda la vida:** sale en los titulares, y al final aparece "EL DUELO ETERNO".
- **La plata sirve:** compra staff (el declive llega más tarde) y lujos (estatus).
- **El final:** figurita, apodo, club por club con su escalón y sus copas, finales perdidas, el duelo y compartir.
- **Lo flojo** (no copiar):
  - el power creep (99 a los 27);
  - las finales demasiado seguidas (hasta 3 por temporada, los mismos 7 minijuegos);
  - eventos de color sin peso.

**La esencia.** El Ídolo **no tiene más sistemas que nosotros: tiene menos**. Lo que tiene es que sus ~5 números
importantes:
1. están siempre en pantalla;
2. **se mueven cada temporada por algo que elegiste vos**;
3. **tienen un próximo escalón con nombre**;
4. **el juego te los cuenta de vuelta** (el diario, la copa, el apodo).

De ahí sale "sentís un avance", no de cuánto dura la temporada. Y todas las mecánicas sirven a un tema (ser ídolo de un
club: ¿gloria o billetera?).

**Lolero contra eso** (master `f510c3d`, con U3a). **Casi todas las piezas ya existen; el problema es que no se ven o
no se mueven a la vista.**

| El Ídolo | Lolero hoy | Brecha |
|---|---|---|
| El amor por club con barra y "→ próximo" | **El arraigo, con los mismos escalones:** Uno más 0, Querido 25, Ídolo 60, Leyenda 88 (`balance.js:822-840`) | Escondido: solo en la placa "Vos" desde 1180 px (`acompanante.js:22`) y en la carta de renovación |
| La escalera de la selección | El chip del cupo internacional: sin chance, en carpeta, clasificado (`core/ficha.js:153-182`) | Escondido en la placa |
| La Gloria siempre a la vista | Puntaje y escalón con "te falta…" (`core/puntaje.js:49-57`) | Solo en la tarjeta final |
| La carta de pretemporada | No existe. El cierre de año elige un plan que se aplica solo (`systems/edadCierre.js:55-86`); los stats suben por una curva oculta | **Falta el delta propio** |
| El diario, siempre | ✅ U3a: el resumen se ve en todas las velocidades | Falta "Última hora" (no cita ninguna decisión, `temporadaResumen.js:469-478`), el ascenso de escalón y los deltas de arraigo, hype y puntaje |
| La copa grande | ✅ U3a: el takeover del título con la copa 3D | Falta "tan cerca" en la final perdida, y la vitrina |
| La final se gana jugando | El minijuego mueve la probabilidad y **después hay una tirada** (`serie.js:354-358`) | El mismo "un clic y perdiste" de §0.3 |
| La oferta con −idolatría, "allá arrancás" y TRAICIÓN | Sueldo, años, jerarquía y plantel al frente; el arraigo en el panel de detalle (`components/mercado.js:564-606`, `:674-689`) | Lo que pesa no está al frente. **No hay traición** |
| El duelo eterno al final | El archirrival corre su carrera y está en la placa y en el resumen | No está en la tarjeta final (`screens/tarjeta.js:238-300`) |
| La plata sirve | `dineroTotalUSD` se acumula (`systems/roster.js:236-242`) | **Ninguna pantalla lo muestra** |

La cadencia (~45 paradas por carrera, ~4 por año) **no es el problema**. Falta que el cierre del año entregue un delta.

**El plan.** No se agregan eventos ni minijuegos, ni cambia la cantidad de paradas (D-A). El motor solo se toca en W4,
W5 y W7.

- **Ola W1, solo UI:**
  - **W1 · La ficha.** La placa "Vos" pasa a todas las anchuras, celular incluido:
    - el nivel con ▲▼ del año;
    - **la escalera del arraigo con tu org** (barra, escalón, "→ Ídolo en 60");
    - la jerarquía y el hype con su próximo escalón;
    - el chip internacional;
    - los títulos y una vitrina mini;
    - el puntaje en vivo;
    - la plata acumulada.
  - **W2 · El diario** (sobre el resumen de U3a):
    - "Última hora": la decisión más pesada del año y lo que pasó;
    - el ascenso de escalón ("¡Ahora sos Ídolo de T1!");
    - los deltas de arraigo, hype y puntaje.
  - **W3 · "Tan cerca"** (sobre la copa de U3a): la final perdida cuenta qué tan cerca estuviste ("jugaste bien la
    jugada… y no alcanzó"), y el trofeo ganado cae en la vitrina de W1.
  - **W6 · El final cuenta la historia** (una parte de U3b): el duelo con el archirrival, el escalón de arraigo por
    org, las finales perdidas, y el apodo con prioridad a la lealtad ("Leyenda de T1").
- **Ola W2, motor chico y medido** (solo después de que el usuario juegue la W1):
  - **W4 · La carta de pretemporada.** El cierre de año pasa a ser "elegí 1 de 3 mejoras": un +N permanente a un eje,
    con rareza.
    - Rangos en `balance.js` y el pozo en `data/`.
    - La misma cantidad de paradas.
    - Se mide contra D-D con `simulate.js`.
  - **W5 · ¿Gloria o billetera?** La oferta muestra al frente:
    - el sueldo y los años;
    - los minutos (más, igual o menos);
    - "dejás T1: −N";
    - "allá arrancás: Querido".
    Lleva las etiquetas RENOVACIÓN, A LA BAJA y **TRAICIÓN**. TRAICIÓN es ir al clásico de tu org (datos nuevos por
    liga): castigo extra de arraigo, 🐍 en la trayectoria, una línea en el diario y el apodo.
- **Ola W3, a decidir después de jugar:**
  - **W7 · La final se gana jugando:** sin la tirada de `serie.js:358` tras ganar el minijuego, medido contra D-D.
  - **W8 · La plata sirve:** staff que tuerce curvas existentes y lujos que dan hype (sistema nuevo).

**Cómo se hace la ola W1.** Tres workers Opus high en worktrees desde master, con tope de ~70-90 llamadas, dueños de
archivos disjuntos:
- **H · la ficha** (W1);
- **D · el diario y "tan cerca"** (W2+W3);
- **T · la tarjeta final** (W6).

Después, un revisor Sonnet con GPU para toda la ola, una ronda de arreglos al mismo worker, merge, push, deploy, y **el
usuario juega en RÁPIDO**.

### 0.8 F · "que se sienta más divertido": Lolero jugado (2026-10-14, el usuario textual + seis años jugados)

> "se nota un poquito, un poquito. Después hay cosas que hay que cambiar un poco. […] hay cosas que faltan, como ver
> cómo va el torneo, ver un Swiss Stage simulado con los brackets simulados y ver dónde estás vos. Todo eso falta, no sé
> si es la UI o la Info. […] eso es para más adelante. Pero ahora quiero que veas si el juego se puede sentir más
> divertido."

**Lo que se hizo.** El supervisor jugó Lolero en RÁPIDO sobre master local (`ef5fa87`, con `8194a94` entrando a
mitad), con el ojo de §0.7. Fueron dos carreras: mid en LAS, perfil Hambriento, decidiendo de verdad.
- La primera fue en Chrome y llegó a los 17. Se cortó porque Windows marca la ventana tapada como oculta y las
  animaciones no avanzan.
- La segunda fue en un Chromium propio y duró seis años, de los 15 a los 21:
  - un tier 3 a los 15;
  - RED Canids (CBLOL) entre 2028 y 2030, con dos finales perdidas y el título en 2030;
  - la renovación contra un bombazo de US$1,2M de la LCP;
  - el salto a paiN a mitad de contrato;
  - tres títulos en total y cuatro Mundiales.
- Los minijuegos los jugó un bot, así que su dificultad no se juzga acá.

**Lo que funciona (no tocar).**
- El mercado: la decisión más legible y linda del juego.
- La firma con el número de camiseta.
- La serie: el mapa decisivo en 2-2 con la chance en vivo, y el "te leyeron, quemaron a Azir: ¿con qué plan seguís?".
- El diario del año con título: "CAMPEONES DE LA CBLOL", "¡Ahora sos Querido de RED!", con nivel ▲8, arraigo ▲22, hype
  ▲28 y puntaje ▲72. Ahí sí se siente El Ídolo.
- Las revanchas ("FURIA te eliminó la última vez").

**Lo que no.** Cada punto tiene evidencia jugada:
1. **El año muerto.** En las dos carreras, el año de los 16 pasó en un clic: "Agente libre", "Sin equipo esta
   temporada", y una nota 7,4 "bueno" sin haber jugado.
   - La causa: el salto de tier 3 a tier 2 te deja agente libre **hasta la pretemporada siguiente**
     (`systems/competitivo.js:62-84`).
   - Sin mercado y sin decisiones en todo el año.
2. **Splits sin parada.** En 2028, de la firma en la pretemporada a los cuartos de final no hubo ninguna parada: el
   split regular no se vio.
   - Los partidos clave del split regular ("Cuentas pendientes", "Todo o nada", "La revancha") salen 2-3 veces en
     los años siguientes, pero **no están garantizados**.
3. **El Mundial pasa en el log.**
   - 2029 y 2030: 0-3 en el Swiss, cero paradas. Fueron tres líneas en "Mientras tanto" y una tarjeta en el relato
     (`components/mundial.js`).
   - El motor frena **solo en el 2-2** (`systems/internacional.js:92-111`).
   - El Swiss de 16 con los récords por ronda y el bracket de 8 ya se simulan enteros en `state.internacional`.
   - **Respuesta a "no sé si es la UI o la info": la info está, falta la pantalla** (y frenar en cada ronda tuya).
4. **Las paradas están al revés.**
   - El split regular tiene 2-3 Bo1 con parada por año.
   - Lo que más importa no tiene ninguna: tu primer Mundial, el Swiss, el año que esperás un llamado.
   - El Ídolo hace lo contrario: la liga es un clic, y el Mundial se juega partido por partido.
5. **La decisión de partido es una cuenta.**
   - "Forzar el cierre 24% / la paciencia 35%"; en la serie, "71% / 73% / 68%".
   - Gana el número más grande. La otra opción no te da nada que veas.
   - Los planes de Fearless son los mismos tres en cada serie.
6. **La consecuencia no se ve.**
   - Ejemplos: "Te confiscaron la PC" (salió el 36% de riesgo) o "el coach se lo tomó como un cuestionamiento a su
     autoridad".
   - Son una línea en "Mientras tanto", arriba de la decisión siguiente, y en RÁPIDO se pasan.
   - El diario cita una sola decisión por año.
7. **El diario titula lo que no pasó.**
   - 2028: final de CBLOL perdida → titular "WORLDS, POR TWITCH — la espina más grande de tu carrera", a los 18.
   - 2029: segunda final perdida y primer Mundial → titular "EL PARCHE QUE TE MATÓ EL AZIR".
   - No hay candidato para la final doméstica perdida (D106), ni para el primer Mundial o el Swiss.
     `candidatoPapelInternacional` cuenta desde cuartos (`core/temporadaResumen.js:189-214`).
8. **La carta del cierre ya existe; §0.7 se equivocó.** El cierre del año son 3 cartas que mueven stats en el acto
   ("Mecánica ~+5, Macro ~+2, Consistencia ~-6") y fijan el plan del año siguiente. Contra la de El Ídolo le falta:
   - **el stat que mueve no está en ninguna pantalla**: la ficha muestra el nivel, nunca la mecánica ni la macro;
   - casi todas dicen RULETA;
   - los tres ejes se repiten todos los años: juego, cabeza y stream.
9. **Un bug de la W1:** la ficha se rompía sin club (`fichaFija.js:429`, `previo` nulo). Lo arregló `8194a94` en
   paralelo.

**La esencia, leyendo entre líneas.** Lolero no tiene pocas paradas: tiene ~10 por año a mitad de carrera. **Las gasta
en lo que menos pesa y saltea lo que más pesa.** Y lo que elegís **mueve una probabilidad que no ves, no un número que
ves**. El Ídolo hace las dos cosas al revés:
- la liga es un clic y el Mundial se juega entero;
- cada elección mueve un número de la ficha en el acto.

**La propuesta: ola F.** Es UI más motor chico y medido, **a confirmar con el usuario**. F1 adelanta "el torneo" que el
usuario dejó para después, porque jugando resultó ser un problema de diversión: el clímax del año pasa fuera de
pantalla.
- **F1 · El Mundial se juega.**
  - La pantalla del Swiss: los 16 equipos con sus récords por ronda (1-0, 0-1…), **vos marcado** y tu próximo rival.
  - **Cada ronda tuya es una parada**, un Bo1 con el formato del partido clave.
  - Después, el bracket de 8 con tu camino. Los playoffs de tu liga usan el mismo cuadro: "dónde estás vos".
  - Motor: `avanzarSwiss` frena en cada ronda tuya (una perilla en `balance.js`).
  - UI: un componente que lee `state.internacional`.
- **F2 · Ningún año muerto.**
  - El salto a tier 2 abre el mercado ahí mismo, en una ventana de mitad de año, en vez de esperar la pretemporada
    siguiente.
  - Cada split garantiza al menos una parada donde jugás.
  - Motor chico. Con `simulate.js`, base contra cambio, se miden las paradas por carrera y los objetivos D-D.
- **F3 · La consecuencia en el momento, y el diario titula lo que pasó.**
  - El resultado de tu última decisión abre la pantalla siguiente como bloque propio (tu elección, lo que pasó y los
    deltas), no como una línea de "Mientras tanto".
  - Titulares nuevos:
    - "SE ESCAPÓ LA FINAL" (hace falta D106: guardar las finales domésticas en el registro);
    - "TU PRIMER MUNDIAL" / "AFUERA EN EL SWISS".
- **F4 · La carta mueve un número que ves.** Reemplaza a W4.
  - Los stats (mecánica, macro, laneo, cabeza, sinergia) con ▲▼ en la hoja de la ficha y en el diario: "elegiste el
    receso: mecánica 51 → 56".
  - El stat principal de cada carta es seguro (el mínimo de su rango, mayor a 0, en `balance.js`). Lo incierto queda
    para lo secundario.
- Quedan para después: W5 (la traición; se jugó un salto a paiN a mitad de contrato sin chequear qué marcó), W7 y W8.

**Cómo se haría.** Cuatro workers Opus high en worktrees, dueños de archivos disjuntos (F1, F2, F3, F4), y un revisor
Sonnet. Como F1-F3 tocan el motor, el validate completo corre en segundo plano. Después, deploy, y el usuario juega en
RÁPIDO.

### 0.9 G · "que se sienta juego": El Ídolo contra Lolero, jugados (2026-10-14, el usuario textual + cuatro partidas)

> "eres un experto, el juego es tan divertido como el ejemplo, tu trabajo va a ser abrir claude in chrome y jugar en
> potrero futbol […] tu trabajo sera ver porque es mas divertido, ver todo pero principalmente el gameplay, hacer una
> auditoria completa y detallada de como es jugar la carrera, de porque se siente mas juego, mas controlada, etc […] la
> auditoria tiene que ser completa y detallada como para poder sacar un plan, mi idea no es un plan que dure 3 meses
> pero que si sea completo y arregle completamente el tema del gameplay."

**Lo que se hizo.** El supervisor jugó cuatro carreras: dos de El Ídolo (Potrero 2.6) y dos de Lolero en vivo (ola F).
La auditoría completa está en **`AUDITORIA.md` (2026-10-14)**. **Las referencias §A-§F de esta sección son de ese
archivo.**
- §A tiene los números. En Lolero:
  - 9 años sin equipo en una carrera de 12;
  - 0 partidos definidos con un gesto tuyo, contra ~35-45 en El Ídolo;
  - ~5 eventos por año amateur que decidió el perfil, contra 0.
- §B son los 12 principios de El Ídolo y §C los 11 problemas de Lolero, cada uno jugado.
- §D es el diagnóstico y §F dice dónde está cada cosa en el código.

**El diagnóstico (§D).**
- El Ídolo tiene menos sistemas, pero cada número está a la vista, cada decisión es tuya y cada final la ganás o la
  perdés con tus manos.
- Lolero decide por vos, esconde lo que movés y resuelve el clímax con una tirada.
- W y F arreglaron la vitrina. Lo que falta es **el control**.

**Lo que eligió el usuario (2026-10-14, textual; no volver a preguntar).**

| Tema | Decisión |
|---|---|
| Las finales | *"O sea que la clase sí tenga peso, pero más para las estadísticas. Si bien puede ser como que te marque que si elegiste el cabulero, por poner un ejemplo, te ponga un dadito o algo así extra o algún coso especial, pero por lo general, mecánico, minijuegos, habilidades, ¿me entendés? Como dijiste en el primero."* → Las finales se definen con minijuegos de habilidad para todos. La clase inclina los stats y da un poder especial de un uso |
| El perfil | Eligió *"Que no decida nada"* → Todo evento con elección frena y lo decidís vos, con un tope por split. Lo que no entra no pasa. El perfil queda como sugerencia marcada |
| El amateur | Eligió *"Corta y siempre con equipo"* → De 15 a 16 en soloQ, con copas amateur jugables. A los 17, equipo seguro (tier 3 como mínimo). Nunca más de una pretemporada sin club: siempre hay ofertas, aunque sean a la baja |
| El plan | Aprobado el 2026-10-15, como está abajo |

**Los documentos (G.0), antes del código: ✅ 2026-10-15.**
- `AUDITORIA.md`, reescrita.
- Esta sección.
- Las deudas D111-D117, en la tabla del final.
- En `PLAN.md`:
  - la fila de §K.1 que deja escrito qué reemplazan estas decisiones: lo de D-B sobre minijuegos y perfil, y la
    definición de "no llega a pro" de D-D;
  - una nota en la decisión "Minijuegos".
- `PROGRESO.md`.

#### El plan: ola G

> Son cuatro piezas en dos entregas. Cada pieza nombra:
> - el principio de El Ídolo que trae (§B.n);
> - el problema de Lolero que cierra (§C.n);
> - la decisión del usuario que la manda (§E.n).
>
> Escala: ~1-2 semanas, contando que el usuario juega entre entregas. No son meses.
>
> **Entrega 1, "el control":** quién decide, quién define la final y que nunca te quedes sin equipo (G1, G2a, G3a,
> G3b).
> **Entrega 2, "lo que se ve y el mundo":** la carta y la ficha, el mercado como dilema, el diario y la ceremonia (G2b,
> G2c, G3c, G4).


#### G1 · Las finales se juegan con las manos *(§E.1 · trae §B.1-2 · cierra §C.1-2 y W7)*

**El contrato nuevo.** Un mapa o un partido con minijuego **se decide por el minijuego, sin tirada**.
- El motor calcula la p del mapa como hoy: fuerza, rival, plan y charla.
- Esa p se convierte en una **dificultad** de 0 a 1.
- El minijuego traduce la dificultad a su regla visible ("necesitás 4 de 5", "zona verde 18%") y devuelve
  `{ paso, casi }`.
- La regla en palabras sale de una función pura de `core/`. La usan la previa y el minijuego, así el texto y el juego
  dicen lo mismo.
- En Node, el bot pasa con probabilidad p, más el ajuste medio que hoy le da el minijuego (con `resultado = stat/100`).
  Así las tasas D-D no se mueven por construcción.
- Es la regla 8: en Node, el resultado es una distribución pesada [p, 1−p].

**Motor (G1a).**
- **Sin tirada.**
  - `finalizarMapa` (`systems/serie.js:356-358`): con minijuego, `gano = paso`; sin minijuego, la tirada de siempre.
  - Lo mismo en el Swiss (`resolverSwiss`, `systems/internacional.js:193`) y en el Bo1 que frena
    (`systems/temporada.js:352`).
  - `ajusteDeMinijuegoDeMapa` (`core/serie.js:388-394`) sale del camino del mapa.
- **Dónde hay minijuego.** Reemplaza a `rondasConMinijuegoDecisivo` (`balance.js:1918`).
  - **Toda final, en cada mapa**: la doméstica de cualquier tier, las copas amateur de G3 y la final internacional.
  - **Cuartos y semis, en cada mapa que puede cerrar la serie** (el que está a un mapa de ganarla o de perderla),
    domésticos y del bracket internacional. Nunca perdés una serie sin haber jugado el mapa que la cierra.
  - **El Swiss del Mundial y del MSI, en cada Bo1 tuyo**, en lugar de "A jugarlo" (`construirDecisionSwiss`, :88-123).
  - **El Bo1 que frena en la temporada regular** (`construirDecisionMomento`, `temporada.js:277-295`; la parada
    garantizada de F2):
    - primero elegís cómo lo encarás, con el premio a la vista: **🎲 ARRIESGADO** (más difícil, más premio) o
      **🧊 SEGURO** (más fácil, menos premio), como el tiro libre del 89' de El Ídolo;
    - después se juega el minijuego;
    - los efectos del dato se reparten en "si sale" y "si no sale": rangos, con el número seguro a la vista (la regla
      de F4). Se revisa la regla de `core/previa.js:87` ("nunca un número mostrado").
- **Una mecánica por torneo, cada vez más difícil.**
  - `elegirMinijuego` (`core/minijuegos.js:47-62`) elige una vez por serie o torneo.
  - Cada mapa o partido siguiente es más difícil (`g1.escalada`: la ventana más chica, todo más rápido), como "cada
    partido, más larga y más rápida" de La seña del DT.
- **El casi.** Errar por poco (`g1.margenCasi`) da **un desempate por torneo**, más corto y más difícil: los penales
  de El Ídolo. El bot también lo tiene (`g1.pCasiBot`).
- **La clase.** Es el perfil del arranque, fijo para toda la carrera: `career.clase`, con VERSION 17 y `migrarDe16`.
  - Inclina los stats iniciales: `inclinacion` en `data/perfiles.json`, chica (por ejemplo +3/+2/−2).
  - Da **un poder de un uso por torneo**, a la vista en la pantalla del minijuego:

    | Clase | Poder | Qué hace |
    |---|---|---|
    | Profesional | **El VOD** | ver la secuencia o el patrón otra vez |
    | Hambriento | **Revancha** | rejugar un mapa perdido |
    | Showman | **El escenario** | en una final, la vara de un mapa baja un escalón |
    | Leal | **El vestuario** | la charla del coach dos veces por temporada |

  - El bot usa su poder con una regla fija: el primero que le sirve.
- **Variedad.**
  - `la_llamada` y `la_prueba` tienen que leer su stat en la ventana (`ventanaPorStat`, `minijuegos/comun.js:42-47`).
  - Mid y support tienen solo 4 mecánicas de mapa. Se suman **dos mecánicas universales**, cada una con su stat: una
    barra de timing tipo "La corrida" y un memotest de "la pizarra del rival".
- **La charla del coach** sigue siendo el recurso único de la temporada, lo mejor de Lolero. Se puede usar en
  cualquier mapa con minijuego.
- **La prueba de ingreso del mercado** deja de tirar: pasa o no pasa por la vara, como la del amateur (K6c). Lo hace
  G3ab, que es dueño de `mercado.js`.

**Pantalla (G1b).**
- **La parada del minijuego** (`ui/paradas/minijuego.js`):
  - arriba, **el camino del torneo** (el Swiss 1-0/0-1…, o CUARTOS ✓ · SEMIS ▶ · FINAL);
  - debajo, **la tira de mapas** (MAPA 1 ✓ · MAPA 2 ✗ · MAPA 3 ▶), donde el marcador queda escrito;
  - la regla con la vara: "necesitás 4 de 5 · tu mecánica 71 te abre la ventana";
  - los chips del poder, del desempate y de la charla, con los usos que quedan.
- **Después de cada ronda**:
  - el resultado, con una línea específica, graciosa si perdés (los `veredictos` por nivel de `data/minijuegos.json`
    ya existen);
  - el "tan cerca" que revela la ventana: "la zona era 41-58, frenaste en 61".
- **El stream del Mundial** (`stream.js:201-218`):
  - cada ronda del Swiss lanza el minijuego;
  - se saca "cambia con cada una" (D115);
  - la previa muestra el campeón del plan (D104).
- **La pantalla de inicio**: el perfil pasa a ser **la clase**, con su inclinación de stats y su poder. Se saca
  "decide por vos lo chico", que con G2 ya no es verdad.

**Medición.**
- Rondas de minijuego por año (mediana 3-8; un año de Mundial, ≤ 25) y por carrera.
- Títulos y Mundial por región, en banda (D-D).
- El supervisor juega 10 finales **con las manos** en el Chromium con GPU, no con el script que lee la posición. Si se
  ganan más de ~p + 20 puntos, se endurece `g1.vara`.

#### G2 · Decidís vos, y lo ves *(§E.2 · trae §B.3, B.4, B.6 · cierra §C.3-5)*

**G2a · El perfil no decide nada (entrega 1).**
- **Todo evento con dos opciones o más frena** (`presentarOResolver`, `systems/events.js:528-540`), tenga o no
  `bifurcacion` en el dato.
- **El tope es 1 por split, en amateur y en pro**: `presupuesto.interrupcionesPorSplit` (`balance.js:685-687`,
  `events.js:509`; hoy solo pro).
  - Si el split ya gastó su parada, **el evento no se sortea**: lo que no entra no pasa. Nada se resuelve por el
    perfil.
  - La continuación de una cadena (`encadenar`, :617-622) tiene prioridad en el split siguiente.
  - Con más de un candidato gana el de más peso (golpe duro > bifurcación > el resto), de forma determinista.
- **La cola** (`core/cola.js:77-91`, desde los 28) deja de resolver por el perfil: el tope baja a 1 por año.
- `edad.probSegundaDecisionPorTipo` (`balance.js:673`) se pliega al tope.
- En Node no cambia nada: el bot es un jugador con ese perfil (`opcionDelPerfil`, `core/perfil.js:90-105`).
- **La parada de evento, con el formato de El Ídolo** (`ui/components/decision/`):
  - el rótulo: PASAN COSAS, DECISIÓN DIFÍCIL o GOLPE DURO;
  - un texto de ~30 palabras;
  - opciones de ≤ 6 palabras, cada una con una línea de pista;
  - **⚠ con el riesgo en palabras**, y el número seguro de cada opción (el mínimo del rango principal, la regla de F4);
  - el chip "TU PERFIL" en la opción que elegiría tu perfil: es una sugerencia, nunca una decisión.
- **"Mientras tanto"** (`feed.js:480-486`) queda para el mundo, no para tus decisiones.

**G2b · Una carta por año, y la ficha que la muestra (entrega 2).**
- **Una sola decisión al arrancar el año.** Hoy son dos:
  - el plan del año amateur (`decisionDePlan`, `amateur.js:566-604`): 4-5 cartas × 5 barras;
  - la carta del cierre (`data/events/cierre_edad.json`, `systems/edadCierre.js`).
- Se funden en **tres cartas**. Cada una tiene:
  - **un número grande y seguro** en un stat de la ficha ("+4 MECÁNICA");
  - a veces, un costo a la vista ("−2 CABEZA");
  - una rareza;
  - el color de tu situación: el soloQ, el bootcamp, la gaming house de tu org.
- **La rutina amateur deja de ser una decisión**: la arma el motor desde tu perfil (`planInicial`). Sus dilemas (el
  examen, la familia, la PC) llegan como eventos de G2a.
- **La ficha** (`ui/fichaFija.js`) muestra **siempre** los cinco stats que mueven las cartas, con ▲▼ en el acto:
  Mecánica, Macro, Laneo, Calls y Cabeza. Hoy están en la hoja "Tu juego" (`core/ficha.js:444-458`).
- **"Élite"** se arregla (D113): la ficha llama así a 63-78 (`core/ficha.js:27-39`) y el mercado a más de 80
  (`demanda.js:29-58`).

**G2c · El texto de las opciones (entrega 2; Sonnet, solo datos).** En los ~60 eventos más frecuentes, medidos con
`simulate.js`:
- el campo `aviso` (el ⚠);
- opciones de ≤ 6 palabras.

#### G3 · Siempre en un equipo, y el mercado es un dilema *(§E.3 · trae §B.5, B.7, B.10 · cierra §C.6-9 y W5)*

**G3a · La etapa amateur, corta (entrega 1).**
- **De 15 a 16, en soloQ, con una copa amateur jugable por año** (la Clash, el LAN, el torneo del instituto).
  - La copa entra por la misma puerta que una final: una serie de `systems/serie.js` con ronda 'final'.
  - G3a la arma con la API de hoy. Cuando entre G1, se vuelve minijuego sin tocar `amateur.js`.
  - Deja la copa en la vitrina y un titular.
- **A los 17, equipo seguro, tier 3 como mínimo.**
  - `buscarSalida` (`amateur.js:1037-1046`) firma en la primera pretemporada de los 17, con `orgQueTeFicha`
    (`core/tier3.js:73`) y la firma de siempre.
  - Los prodigios pueden seguir firmando antes, por scouting (`probabilidadDeScouting`, :981-998).
- **Se sacan** el "¿seguís?" de los 19 (`decisionSalidaAmateur`, :1522-1534) y `edadLimite` 24 → 'no_llego'.
- **Las tiradas que te cambian la vida pasan a ser eventos con parada** (GOLPE DURO) en `data/events/`. Ejemplo: "Te
  confiscaron la PC" (`amateur.js:919-929`), que hoy es solo una bandera.
- **Los torneos de tier 3 tienen final jugable y copa.** Hoy el "1.º de 6" se ve solo en el cajón.

**G3b · Nunca sin equipo (entrega 1).**
- **La causa de las cero ofertas (D111)** es la penalidad de edad, `(1−sesgoEtario(edad))×100`
  (`core/valorMercado.js:25-27`; `balance.js:1226`, tabla :1437-1441):
  - vale −48 a los 25 y −70 a los 27;
  - el comentario dice ~10;
  - se lleva a ese ~10, con tope.
- **Piso de ofertas.** Si `ofertaPosible` (`core/demanda.js:520-581`) deja menos de 3, el mercado completa hasta 3
  (`mercado.ofertasMinimas`) con ofertas **A LA BAJA**: tu liga, la de abajo, tier 3.
- **Desaparece el bucle "El mercado ya habló"** (`mercado.js:907-1075`).
  - Podés rechazar todo **una** pretemporada; la ventana de mitad de año de F2 te vuelve a llamar.
  - A la segunda, firmás o cerrás la carrera (G4c).
- **`sin_equipo` deja de ser un final** (`retiro.js:125-129`). Quedan el cuerpo, la edad y tu decisión.
- **En `simulate.js`**:
  - `noLlegaAPro` (:1200) pasa a contar "nunca jugó en tier 2 o tier 1" (§E.3);
  - métrica nueva: años sin equipo.

**G3c · El mercado como dilema (entrega 2, con W5).**
- **Cuatro ejes en el frente de cada oferta**, como El Ídolo:
  - **la plata**: el sueldo, topeado por su "hasta" (D112: hoy $511k con "hasta $348k", `core/salarios.js:12-22`);
  - **los minutos**: "vas a jugar MÁS / MENOS que ahora", de la jerarquía proyectada;
  - **el arraigo que perdés**: "−N con RED";
  - **el arraigo con el que arrancás**: "allá arrancás Uno más (6/100)"; en la renovación, "te faltan 21 para Querido".
- **El arraigo se guarda por org** (`career.arraigoPorOrg`). Hoy se pierde entero al irte (`mercado.js:135-141`).
- **Las etiquetas:**
  - **RENOVACIÓN**;
  - **BOMBAZO**: el doble de tu sueldo o más;
  - **TRAICIÓN**: el clásico de tu org, de un `data/clasicos.json` nuevo (hoy "clásico" es solo un rótulo de partido,
    `core/temporada.js:258-267`). Cuesta −30 de arraigo y sale en el diario;
  - **VOLVÉ A CASA**: una org donde llegaste a Querido. Arrancás con lo guardado menos la salida;
  - **A LA BAJA**.

#### G4 · El mundo se acuerda, y el final es una ceremonia *(trae §B.8, B.9, B.11 · cierra §C.10-11)* — entrega 2

**G4a · El diario** (`core/temporadaResumen.js`).
- **Nunca el mismo titular dos años seguidos**, con tres redacciones o más por familia. Hoy el "OTRA VEZ —" aparece
  recién a la cuarta (:371-374, `balance.js:1772`).
- "El parche te dejó sin X" (:478-481) sale solo el año del parche.
- **Titulares nuevos:**
  - GOLPE DURO: la PC, la familia, la lesión;
  - la copa amateur;
  - la primera firma;
  - TRAICIÓN y VOLVISTE A CASA;
  - **"EL RIVAL TE PASÓ EL TRAPO"**: el duelo eterno se lleva el titular el año que te gana.
- **Se sacan las contradicciones** (D116, D117):
  - "¡SOS UNA ESTRELLA!" sin equipo;
  - "el día que dejaste tu país" sin haber emigrado;
  - "ni un scout te escribió" después de "tres personas preguntan por vos".

**G4b · Promesas que se pagan.**
- Un `data/events/promesas.json` nuevo con 4-6 promesas, cada una con plazo, condición y pago.
- Ejemplo, el prodigio: "si llegás a Máster antes de los 16, te vienen a buscar de tier 2". Se paga, o se cuenta que
  no.
- Consecuencias de un año al siguiente en el diario: "tu ex equipo ganó la liga sin vos".

**G4c · La ceremonia.**
- **El último split.** Frena una decisión cuando el declive se ve o a la segunda pretemporada sin firmar: "colgarlo
  con la frente alta" o "un año más ⚠ (podés terminar en el banco… o eterno)".
- **El último partido.** Un mapa de despedida con minijuego y el premio a la vista: 🎲 la jugada para el clip o 🧊 el
  farm para el rookie. Salga bien o mal, es un buen recuerdo.
- **El monumento**, según tu escalón más alto de arraigo:
  - Leyenda: **retiran tu camiseta** (el número que elegiste en la firma) en esa org;
  - Ídolo: cuelgan tu bandera;
  - y el apodo de esa org: "EL HÉROE DE RED CANIDS".
- **La tarjeta** (`ui/screens/tarjeta.js`) pasa a ser un palmarés:
  - el tipo de carta, según tu escalón más alto;
  - org por org, con su escalón (ya está);
  - las finales perdidas (`registro.finales`, de F3);
  - **premios con nombre**, sacados del registro: El hijo pródigo, Cruzó el charco, Matador de clásicos…;
  - el duelo.
- "De dónde sale el número" baja al final. "Tu potencial, revelado" (:141-142) se pliega en "trayectoria": al final no
  hay sorpresa oculta.

#### G5 · Opcional, después de que el usuario juegue las dos entregas

- **W8, la plata pesa** (§0.7: "¿gloria o billetera?").
  - Sin tienda. Una tienda como la de El Ídolo choca con la decisión "La plata no es gastable" de `PLAN.md`.
  - La tienda entra solo si la pide el usuario.
- **El desafío diario, con objetivos con estrella.** El desafío ya existe (D-C); le faltan los objetivos.
- **La rueda de prensa vuelve** después de una final (`rondasConPrensa`, `balance.js:1912`).

#### Lo que no se toca

- La firma.
- La serie mapa por mapa con el Fearless y el "te leyeron".
- El stream del Mundial con el tablero suizo.
- La charla del coach como recurso único.
- Los parches y el meta, las noticias y las revanchas.
- El duelo eterno.
- La huella y el determinismo (regla 1).
- Los eventos como datos con rangos (reglas 4 y 7).

#### Entregas y workers

El método es WF-001: worker en worktree, revisor independiente, y el validate completo lo corre el supervisor en
segundo plano. Los workers son Opus high, con ~70 llamadas.

| Entrega | Worker | Dueño de |
|---|---|---|
| **1 · El control** | G1a, motor | `systems/serie.js`, `core/serie.js`, `systems/internacional.js`, `systems/temporada.js`, `core/minijuegos.js`, `data/minijuegos.json`, `data/perfiles.json`, `core/state.js` (VERSION 17: el único que la sube) |
| | G1b, pantalla | `ui/paradas/minijuego.js`, `ui/components/minijuegos/*`, `ui/paradas/caraACara.js`, el stream, la pantalla de inicio |
| | G2a | `systems/events.js`, `core/cola.js`, `ui/components/decision/*`, `ui/components/feed.js` |
| | G3ab | `systems/amateur.js`, `core/tier3.js`, `core/valorMercado.js`, `core/demanda.js`, `systems/mercado.js`, `systems/retiro.js`, las métricas de `src/dev/simulate.js` |
| **2 · Lo que se ve y el mundo** | G2b | la carta del año (el plan de `amateur.js`, `edadCierre.js`, `cierre_edad.json`, `cartas.js`), `ui/fichaFija.js`, `core/ficha.js` |
| | G2c (Sonnet) | el texto de `data/events/*.json` |
| | G3c | `systems/mercado.js`, `core/demanda.js`, `core/salarios.js`, `ui/components/mercado.js`, `data/clasicos.json` |
| | G4ab | `core/temporadaResumen.js`, `ui/core/momentos.js`, `data/events/promesas.json` |
| | G4c | `systems/retiro.js`, `ui/screens/tarjeta.js`, `ui/app.js`, `core/legado.js` |

- **El contrato del minijuego** (los `datos`: dificultad, regla, poder, desempate, camino) lo escribe el supervisor en
  los dos briefs de G1. Así G1a y G1b trabajan en paralelo.
- **`balance.js`** tiene una sección por worker (`g1`, `eventos`, `amateur`/`mercado`), y el supervisor integra.
- **Un revisor por entrega.**
- **La integración**, en orden:
  1. validate `--rapido`;
  2. `simulate.js 1000` dos veces, con la huella idéntica;
  3. base contra cambio;
  4. el validate completo, en segundo plano;
  5. el deploy: merge → push → build → `npx wrangler deploy` → md5;
  6. **el usuario juega en RÁPIDO**.
- Al terminar, el workflow se registra en `~/.claude/workflows.md`.

#### Verificación

Base `749b5cf` contra cada entrega, con `simulate.js` y jugando:

| Medida | Hoy (esta auditoría) | Meta |
|---|---|---|
| Años sin equipo desde los 17 | 6 (LAS: 17-18 amateur, 24-27 libre) | 0, y nunca más de una pretemporada libre seguida |
| Eventos que decide el perfil en el navegador | ~5 por año amateur | 0 |
| Paradas de evento | 0-2 por año amateur; el resto, el perfil | ≤ 1 por split (en la cola, 1 por año), todas tuyas |
| Partidos definidos con tus manos | 0 | toda final, todo mapa que cierra una serie, todo Bo1 del Swiss |
| Tirada después de un minijuego | siempre | nunca |
| Rondas de minijuego de mapa | 0-1 por carrera | mediana 3-8 por año; un año de Mundial, ≤ 25 |
| Ofertas por pretemporada | 0, cuatro seguidas | 3 o más, siempre |
| Titular repetido en años seguidos | 3 seguidos | 0 |
| D-D | en banda | en banda, con "no llega a pro" redefinido (~20%) |
| El final de la carrera | "el teléfono dejó de sonar" | el último split, el último partido, el monumento y el palmarés |

- **La definición de terminado:**
  - el validate: el rápido lo corren los workers; el completo, el supervisor en segundo plano;
  - dos corridas con la misma seed, idénticas;
  - `simulate.js 1000` sin crash;
  - el commit y PROGRESO.
- **Jugado.** El supervisor juega una carrera entera por entrega en el Chromium con GPU (`--use-angle=d3d11`). Juega
  los minijuegos de verdad, no leyendo la posición, y anota los tiempos y las rondas. Después juega el usuario.

#### Riesgos

- **Fatiga de minijuegos.** Las perillas de `g1` (dónde y cuántos) se ajustan después de jugar.
- **Ganar demasiado con las manos.** La vara y la escalada por ronda se calibran jugando, no por script.
- **G3 alarga las carreras.** Más años pueden traer más títulos: la inflación de El Ídolo. Se mide la duración y se
  cuidan las bandas D-D.
- **El peso del build** está en 3904 de 4000 KB. Dos mecánicas nuevas pueden obligar a subir el techo.


**Las deudas nuevas** (D111-D117) están en la tabla del final de este documento.

### 0.10 H · "Cada carrera, distinta": el mazo, el arcade y la voz corta (2026-10-15, el usuario textual + 150 carreras medidas)

#### Lo que dijo el usuario

El usuario jugó la ola G (master `6f2773a`) y dijo (2026-10-15, textual):

> "los minijuegos se sienten muy chotos, me sorprende que puedas hacer juegos enteros pero solo esos minijuegos, el
> juego te dice todo osea las cartas tienen descripciones muy largas [...] no existen las 'normales' o 'raras' porque
> siempre salen las mismas [...] yo lo que dije que queria es que tenga muchisimas cartas distintas y muchisimos eventos
> raros y unicos que influyan en la carrera para que esta se sienta distinta [...] todavia se siente simple, facil,
> poco divertido, y poco parecido al juego de ejemplo"

Y después: *"fijate que no se quede en sumar cartas y eventos. Tiene que cambiar también ese tope o esa forma de
elegir"*.

El pedido es viejo. `CONCEPTO.md` §8 hace de la rejugabilidad "el requisito número uno": "una partida ve unos 25
eventos de más de 200". Las olas W, F y G se hicieron sin agregar contenido.

#### Diagnóstico (medido sobre `6f2773a`: 150 carreras sin pantalla, código y una crítica contra el código)

**Eventos.** Son 265, sin rareza, y 239 pesan entre 4 y 8.
- **El cupo.** El evento corre último y usa la parada que sobra: el 57% de los splits pro lo pierde.
- **El escalón** (`events.js:335`, cadena > golpe > bifurcación > resto, sin tirada) deja una mediana de 2 candidatos
  por sorteo.
- **El resultado:**
  - 48 eventos se llevan el 58% de lo que se ve;
  - el 37% del pozo no apareció nunca;
  - dos carreras comparten el 41% de sus eventos.

**Cartas.** Son 10 manos fijas de 3 (`cierre_edad.json`).
- Tres manos se llevan el 67% de las vistas.
- El 90% de las cartas dice +3.
- La "rara" es una etiqueta fija en 3 cartas.

**Minijuegos.** Son 12 widgets de DOM de 41 a 134 líneas, sin dibujo de LoL ni sonido.
- El dodge pasa el 82% sin tocar nada.
- A 144 Hz van 2,4 veces más rápido.
- El suspenso llega después del sello.
- Hay ~70 rondas por carrera, con la misma mecánica hasta 15 veces seguidas.
- Un humano pasa ~75-80% a la vara mediana, contra el 50% del bot: por eso se siente fácil.

**Texto.** Una pantalla de cartas muestra ~190 palabras. El aviso automático suma ~17 palabras más un %.

**Ritmo.** Hay ~148 paradas por carrera y solo 22 son eventos. La temporada regular frena ~38 veces con la misma
forma.

#### Lo que decidió el usuario (2026-10-15, textual; no volver a preguntar)

| Tema | Decisión |
|---|---|
| **Minijuegos** | *"tambien cuartos, semis, final, swiss cuando es worlds, o si jugas desde el play IN, pero el playin puede ser como esos minijuegos del potrero que vas haciendo click y pasando de ronda por cada uno de los partidos osea con 1 minijuego podes pasar del play in, ahora depende del equipo si es bueno o malo que pase lo mismo en el swiss, que podes pasar varios partidos con un minijuego si tu equipo es bueno, y si no lo es tanto entonces que sea unico por partido, a partir de cuartos se juegan todos"* |
| **Rasgos** | *"No, solo stats"*: las cartas solo mueven stats |
| **Volumen** | ~455 eventos (+190 raros, épicos y legendarios) y ~240 cartas |
| **Tienda** | *"No por ahora"* |

#### El plan: seis piezas (H1 primero: sin la forma de elegir, el contenido nuevo no se ve)

#### H1 · El mazo de eventos: la forma de elegir y el cupo (motor)

1. **Un solo sorteo con rareza.**
   - El peso de cada elegible es `probRareza[r] / Σpeso(rareza r) × pesoConMemoria`. Es una sola llamada a `rng()`
     (T1), y las rarezas vacías se renormalizan.
   - Punto de partida para `probRareza`: común .62 / rara .26 / épica .09 / legendaria .03.
   - El filtro `escalonDeEvento` (`events.js:335`) se va.
   - Quedan dos prioridades duras:
     - la continuación de cadena que vence (check `validate:19873`);
     - un flag de dato `obligatorio` para los golpes que cuentan un cambio de estado (`lesionado`, `lesion_cronica`).
2. **El campo `rarezaEvento`** (comun/rara/epica/legendaria) es distinto de la `rareza` de opción.
   - Los 265 de hoy arrancan como comunes.
   - Una pasada de datos re-etiqueta ~50 (caminos, golpes, top mundial). El servicio militar es un sistema y no entra.
3. **Sin repetición.**
   - Rara para arriba sale una vez por carrera: se lee de `flags.eventosVistos`.
   - Una común tiene un cooldown mínimo de `splitsPorEdad`.
   - El decaimiento nuevo es una perilla solo del split. No se toca `fatigaPorVista`, que comparten la fecha marcada y la
     carta.
4. **El piso.**
   - `flags.sorteosSinRara` ≥ `eventos.pisoRara` (~4) → el próximo sorteo es rara+.
   - Es el único estado nuevo de H1.
5. **El cupo propio** (reemplaza G2a, PLANUI:880: "si el split ya gastó su parada, el evento no se sortea").
   - Se borra `|| hayPresupuesto(state)` (`events.js:361`).
   - Se borran las perillas muertas `total`, `interrupcionesPorSplit` y `hayPresupuesto` (T5), y `validate:4771` pasa
     a leer `eventos.paradasPorSplit`.
   - **La cola:**
     - se agrega `'evento'` a `TIPOS_DE_LA_COLA` (`core/cola.js:16`), con `cola.eventosPorAnio`;
     - se frena con `frenaEnLaCola(state,'evento',null)`;
     - se firma con `conFirmaDeLaCola` dentro de `conParadaDeEvento`.
   - No hay evento en el split del cierre de edad, que ya tiene la carta y las finales. Quedan ~2 por año, ~30 por
     carrera.
   - Con el pozo vacío se relaja "común una vez por año" antes de devolver null. D135 sigue abierta.
6. **Temporada regular sin paradas de partido** (el usuario no la puso entre los lugares con minijuego).
   - Salen:
     - la parada garantizada de F2 (`temporada.js:117-133`, `balance.js:1904-1911`);
     - el Bo1 🎲/🧊 con minijuego (D118, `temporada.js:302-534`);
     - las fechas marcadas.
   - Las 64 de fecha marcada pasan al mazo del split con contexto de partido. H1b adapta los efectos que tocaban la p del
     Bo1 a forma, hype o cabeza.
   - Checks a reescribir: 6329, 29667, 20766 y los KPI de ritmo 11379, 14087 y 14314.
   - Meta: ningún año sin parada (lo asegura el evento) y ≤ 100 paradas por carrera.
7. **`simulate.js --bloque=variedad`**, sobre 1000 carreras:

   | Medida | Hoy | Meta |
   |---|---|---|
   | Pozo nunca visto | 37% | 0, salvo marcas raras documentadas |
   | Lo que se llevan los 10 más vistos | 44% | ≤ 15% |
   | Jaccard entre carreras | 0,41 | ≤ 0,15 |
   | Rara o más por carrera | 0 | ≥ 8, después de H5 |
   | Carreras con una legendaria o más | 0 | 60-80% |

   Contra "escrito y nunca visto": cada común aparece en ≥ 10% de las carreras elegibles, cada rara en ≥ 3% y cada
   legendaria en ≥ 0,5%.

#### H2 · El mazo de cartas, solo stats (motor, datos y pantalla)

- **El dato.** Va en `src/data/events/cartas/*.json` (regla 4; fuera de `TODOS_LOS_EVENTOS`, como `promesas.json`), por
  etapa: amateur, tier 3, tier 2, tier 1, emigrado y veterano.
  - Cada carta tiene id, `rareza`, contexto, `titulo` (≤ 4 palabras), `linea` (≤ 10), `stats` [{stat, valor
    [min,max]}], `costo` opcional y `plan`.
  - Tiene dos salidas, normal y extra, y el stat es ≥ min en las dos (reglas 7 y 8). El número es seguro: no hay aviso.
- **Los valores:**

  | Rareza | Valor |
  |---|---|
  | Común | +2/+3 en un stat |
  | Rara | +4/+5, o +3/+2 en dos stats |
  | Épica | +6, o +4/+3 |
  | Legendaria | +8, o +5/+4, a veces con costo |

- **La mano se arma sorteando.** `edadCierre.js` deja de elegir 1 de 10.
  - Arma un evento sintético con id estable `mano_del_anio` y `categoria` neutra.
  - Cada opción lleva `weight` (el bot, T7), `conditions: []`, `carta`, `plan` (sin él se congela `planAnual`,
    `validate:20895`), `rareza` y outcomes con rangos.
  - **El sorteo:** cada lugar sortea rareza (.68/.22/.08/.02):
    - piso: dos manos sin rara → el lugar 3 es rara+;
    - una legendaria como máximo por mano;
    - tres stats distintos;
    - rara para arriba no se repite en la carrera.
  - **"Otra mano"**: 2 por carrera.
  - **Los checks:**
    - 29495 cuenta por `datos.motivo`;
    - 24943 se reescribe: en una mano, misma rareza → ninguna domina, y el orden de rareza es el orden de valor.
  - **La migración:**
    - `cierre_edad.json` se retira y sus 30 cartas pasan al formato nuevo;
    - un guardado pausado en una mano vieja sigue resolviendo, porque la decisión guarda su evento;
    - VERSION 19, con `migrarDe18` (`core/guardado.js:83-84,295-322`) y las rutas nuevas en `createInitialState` (T4).
- **La pantalla** (`decision/cartas.js` y su CSS):
  - el marco por rareza: gris, azul, violeta, dorado;
  - el número grande, el título, una línea y el chip de costo;
  - se sacan la descripción, la situación, "(fin de temporada)" y el aviso con %.
- **Las metas:**
  - ~240 cartas: 110 comunes, 70 raras, 40 épicas, 20 legendarias;
  - ≥ 35 cartas distintas de las ~42 que ve una carrera;
  - Jaccard ≤ 0,15;
  - una legendaria en ~25% de las carreras.

#### H3 · El arcade: minijuegos de verdad (pantalla y una pieza de motor)

**El motor (H3e).**
- **Dónde hay minijuego** (la decisión del usuario):

  | Momento | Cómo se juega |
  |---|---|
  | Cuartos, semis y final domésticos | La regla de G1: en cuartos y semis, cada mapa que puede cerrar la serie; en la final, cada mapa |
  | **Play-In del Mundial** (etapa nueva, para los sembrados bajos) | Se resuelve con **una sola tanda** |
  | **Swiss** | En tandas cuyo tamaño sale de la fuerza del equipo, `g1.tanda`: un equipo fuerte pasa hasta 3 partidos con un minijuego; uno débil, 1 por partido |
  | Desde los cuartos del Mundial | Se juegan todos |
  | Temporada regular | Nunca |

- **La tanda:**
  - `datos.tanda` trae k partidos, cada uno con su vara;
  - la mecánica juega k fases que escalan, y cada fase es un partido (`onEtapa(i, resultado)`);
  - "EL CAMINO" escribe cada resultado;
  - el bot resuelve cada partido con su p, así que las bandas no se mueven por construcción.
- **La forma de la regla, en el dato.** `minijuegos.json` declara `regla: conteo{pasos} | latencia | distancia{escala} |
  continuo`.
  - La leen `techoDeVara`, `unidadesDeLaRegla` y `bajaDeCharla` (`core/minijuegos.js:196-255`), y `varaG1.js`, que
    deja de tener su copia de los conteos.
- **La rotación.** Nunca más de 5 rondas seguidas de la misma mecánica (`minijuegoDelTorneo`, :323).
- **Los ids no cambian**, porque los guardados los tienen. Cambian solo los títulos.
- **Lo que fija H3e** (plan de la pieza, 2026-10-16):
  - **El Play-In:** lo juega el último sembrado de una liga con ≥ `mundial.playIn.cuposMinimos` (3) cupos, como el 4º de la LCK
    y la LPL en 2025. Una sola parada y una sola tanda: los rivales son el primer no clasificado de cada otra liga con ≥ 3 cupos
    (hoy 3), de menor a mayor fuerza; `victoriasParaPasar` 2 y `derrotasParaQuedarAfuera` 2. Si pasás, al Swiss en tu cupo; si
    no, el Mundial se juega sin vos (tu lugar lo toma el siguiente de tu liga), con hito y sin hype.
  - **Los umbrales de `g1.tanda`:** la p de tu equipo contra la fuerza media del campo (los otros 15, la misma
    `probabilidadDeCruceSwiss`): desde .65 la tanda es de 3 partidos, desde .55 de 2, y abajo de 1. Nunca más que las victorias
    que te faltan para pasar (el 2-2 es siempre de a 1, con su charla).
  - **El corte de la tanda del Swiss:** corta en la primera derrota (`derrotasParaQuedarAfuera` 1 de la tanda) o al llegar a las
    victorias de la tanda. Los rivales salen del emparejamiento suponiendo que ganás los anteriores (los cruces ajenos son por
    hash: el rival es exacto). La derrota pasa por el desempate y la revancha de siempre, en una tanda de 1. Una tanda es una
    ronda del torneo (un escalón), y la rotación cuenta tandas.
- **Lo que corrige el usuario** (2026-10-16, textual: *"si vos ves en el potrero hay minijuegos que son simplemente hacer
  un clic y es como suerte. Tipo, si pasaste o no los partidos y supongo que eso depende de tu skill. Tipo, de la calidad
  de tu equipo"*; y *"quedar afuera del play-in [...] lo tiene que decir"*). Reemplaza a "cada partido monta la mecánica
  de nuevo" de H3u (`paradas/minijuego.js`):
  - **La tanda es un minijuego y después clics.** El primer partido se juega con la mecánica; cada uno de los que siguen es
    un clic ("Jugar el partido") con un suspenso corto, y sale con la p de ese partido: tu nivel y el de tu equipo contra el
    rival. La tirada es por hash de la seed, el año, la etapa y la ronda (`ganaElClic`, `core/internacional.js`): la UI la
    muestra antes de responder y el motor la repite igual al completar la respuesta corta. El bot no cambia (manda todos
    sus resultados), así que esto no mueve ni la huella ni las bandas. La rotación sigue contando minijuegos: una tanda, una
    vez.
  - **El Play-In, también para las ligas chicas.** Arranca ahí el último sembrado de toda liga con ≥
    `mundial.playIn.cuposParaEntrar` (2) cupos: entran el 2º del CBLOL y el de la LCP. Los rivales siguen siendo el primer no
    clasificado de cada otra liga grande (≥ `cuposMinimos`, 3), los 3 más flojos.
  - **Quedar afuera se dice.** El Play-In perdido es una fila de `registro.internacionales` con `resultado: 'playin'`, su
    récord y sus partidos; el ganado queda en la fila del Mundial (`playIn: '2-1'`, y sus partidos al principio del
    camino). Cuenta como Mundial jugado y puntúa 0, como el Swiss perdido.
  - **El color, por lo que se esperaba de tu liga** (grande = ≥ 3 cupos: LCK, LPL, LEC y LCS; `esLigaGrande`):
    - pasar el Play-In desde una liga chica (CBLOL, LCP) es una hazaña: un color más picado;
    - quedar afuera desde una liga chica, gris;
    - quedar afuera desde una liga grande, "medio pinchado".

**El kit (`src/ui/arcade/`).**
- Canvas 2D con paso fijo de tiempo: arregla el bug de 144 Hz.
- Teclado, mouse y toque.
- **Jugo**: partículas, sacudida, hit-stop, cámara lenta en el momento decisivo, números que saltan, combo. El azar sale
  de `rngUi`.
- LoL dibujado por código: minions, torre, skillshots, Barón, wards, y el retrato de tu main (`fx/arte.js`).
- Efectos con `sonido.js`.
- **La entrada:** una línea, una demostración animada de 2 s y 3-2-1.
- **La salida:** el suspenso **antes** del sello, "tan cerca" con la medida y tu mejor marca.
- La apuesta a la vista mientras jugás.
- La lógica separada del dibujo, en `simular(params, humano, rng)`, con las constantes en `minijuegos.json` o
  `BALANCE.g1`.
- **La vara de calidad:** "si la sacás del juego, se juega sola", 15-40 s.

**Las mecánicas.**

| Mecánica | Rol | Qué se juega |
|---|---|---|
| `robar_baron` | jungla | El pozo del Barón y el smite rival que se ve venir |
| `last_hit` | top / mid / adc | La oleada, el cañón y la torre |
| `el_kite` | adc | El orbwalk contra un bruiser |
| `el_gancho` *(nueva)* | support | Gancho con lead entre minions |
| `dodge` | todos | Arena 2-D, skillshots y Flash una vez |
| `el_combo` | mid | Notas QWER+F |
| `el_teleport` | top | La pelea en el minimapa |
| `la_vision` | support / jungla | La ruta del jungla rival |
| `la_llamada` | todos | Cantar el objetivo correcto a tiempo |
| `la_corrida` | todos | El engage: la R en el área |
| `la_pizarra` | todos | Memotest de draft |
| `la_prueba` | prueba de ingreso | Aim de skillshots |

- `rueda_de_prensa` queda igual.
- `el_gancho` se registra en:
  - `minijuegos.json`;
  - `MONTAR_MINIJUEGO`;
  - el mapa de `varaG1`;
  - `g1.conteo`;
  - el CSS;
  - `dev/recorrido.mjs`;
  - las listas de validate.

**Las pruebas de aceptación**, en cada brief, contra `src/dev/arcade-humano.js`:
- sin tocar nada pasa ≤ 5% a vara .6, y tocando al azar ≤ 20%;
- un humano de 250 ± 60 ms pasa ~80% a .5, ~60% a .7 y ~35% a .85;
- de stat 40 a 85 la ventana crece ≥ 25%;
- a la vara mediana el humano queda a ±10 puntos de la p del bot;
- a 60 Hz y a 144 Hz da lo mismo.

**La compuerta.** `lolero.lol/arcade` (`arcade.html` en `A_COPIAR_PREVIA`, fuera del techo). El usuario juega el kit con
`robar_baron` y `dodge` antes de que se hagan las otras diez.

#### H4 · La voz corta (datos y pantalla)

| Texto | Largo máximo |
|---|---|
| Descripción | 30 palabras, 2 oraciones |
| Opción | 6 palabras |
| Pista | 10 palabras |
| Aviso ⚠ | 10 palabras, solo con riesgo, sin % |
| Título de carta | 4 palabras |
| Línea de carta | 10 palabras |
| Resultado | 25 palabras, gracioso si sale mal |

- El aviso automático (`events.js:530`) usa el `aviso` escrito a mano o un `titular` corto.
- Se reescriben los 265 eventos: solo el texto, con ids y efectos intactos.
- Se saca el "más".
- Metas: la pantalla de cartas muestra ≤ 70 palabras y la de evento ≤ 60.
- Check `validate --solo=voz-corta`.

#### H5 · Lo raro: eventos que cambian la carrera (datos)

- **~190 nuevos**: ~90 raros, ~60 épicos y ~40 legendarios.
- Todo evento de rara para arriba deja algo que dura:
  - una bandera que abre otros eventos;
  - stats;
  - un cambio de camino: rol, org, región o quedarte sin equipo.
- Cada legendaria abre un arco (una cadena de 2-3 pasos o una promesa) y tiene su momento en dorado
  (`ui/fx/momento.js`).
- **La rareza, a la vista** (2026-10-16): hoy la pantalla del evento no lee `rarezaEvento`. Su marco la dice como en las
  cartas (gris, azul, violeta, dorado), y el legendario sale con `mostrarLegendaria`. Lo hace la pieza de H6.
- **Las bifurcaciones no se diluyen** (medido en la integración, 2026-10-16): con los 229 de lo raro en el mazo, las
  bifurcaciones (mudanza, cambio de línea, retiro: lo que cambia la carrera de verdad) bajaron de 9,0 a 1,9 por carrera,
  porque comparten el cupo de su rareza con muchos más. `eventos.pesoBifurcacion` multiplica su `weight` en el sorteo del
  split (`pesoDelSorteo`, `systems/events.js`) hasta volver a la banda de K4c (5-9). Además, el arco de la LPL de
  `raros/llamado.json` firma una mudanza real (`ofertaDeImport`, regla 15).
- **Lo raro no regala** (medido en la integración, 2026-10-16): los 229 daban +2,67 de stats netos por opción, contra +1,40
  de los eventos viejos, y la carrera se ponía más fácil (`llegaATier1` de 40,3 a 43). Los positivos de `player.stats` de
  `raros/` se escalan por 0,75 (redondeado, mínimo 1; los negativos no se tocan): queda en ~+1,8, lo raro pesa un poco más
  que lo común sin inflar la carrera. Es una pasada de datos (`escala-raros.mjs`), no una perilla del motor.
- **Los temas:**
  - soloQ;
  - stream y redes;
  - la escena (la org que quiebra, el rookie que te saca el puesto);
  - la LCK o la LPL que te llama;
  - el parche que te hace dios;
  - la salud;
  - la familia;
  - la plata;
  - el legado;
  - lo oscuro (el amaño, el ban).
- Las personas son inventadas.
- **La meta por carrera:** ≥ 8 raras o más, ≥ 2 épicas o más, y ~1 legendaria.

#### H6 · El álbum (solo pantalla)

- Guarda en `localStorage` las cartas y los eventos descubiertos.
- El chip "NUEVO" marca lo que ves por primera vez.
- Tiene una pantalla por rareza.
- La tarjeta final dice "descubriste 9 cosas nuevas, 2 legendarias".
- El motor no lo lee (regla 1).

**Fuera:** los rasgos y la tienda (decisión del usuario).

#### Entregas y workers (frugal: WF-001)

Las reglas de los workers:
- piezas de ≤ 50-70 pasos, con la prueba de aceptación en el brief;
- los workers corren solo `--solo`, y el supervisor corre `--rapido` y `simulate 1000` una vez;
- un revisor Sonnet por entrega.

| Entrega | Workers | Compuerta |
|---|---|---|
| **1 · La forma de elegir y el kit** | **H1a**, el sorteo, el cupo, la cola, el piso y VERSION 19 (Opus high) · **H1b**, la temporada sin paradas de partido, las 64 re-alojadas, `--bloque=variedad` y los checks (Sonnet xhigh) · **H2a**, el motor de la mano, el formato, las 30 migradas y 60 semilla (Sonnet xhigh) · **H3k**, el kit, `robar_baron`, `dodge` y `/arcade` (Opus high) · **H4a**, la guía y el check (Sonnet high) | El usuario juega `/arcade` y una carrera |
| **2 · El arcade y la voz** | **H3e**, el motor: regla en dato, rotación, Play-In y tandas (Opus high) · **H3**, 10 mecánicas: 4 × Opus high · **H4b**, la reescritura de 265: 4 × Sonnet high · **H2b**, la pantalla de cartas y el momento legendario (Sonnet high) | El usuario juega en RÁPIDO |
| **3 · Lo raro** | **H5a-c**, 3 escritores por tema × ~63 (Sonnet high; 2026-10-16, por el consumo: tres en vez de cinco y sin editor aparte, el supervisor mide el alcance y lee una muestra) · **H2c + H6**, ~150 cartas, el álbum y la rareza del evento a la vista (Sonnet high) | El usuario juega 2-3 carreras |

- **Antes del código:**
  - PLANUI §0.10 con estas decisiones y las líneas "reemplaza a" (G2a PLANUI:880, la frecuencia de G1
    `core/serie.js:215-218`, F2 y D118);
  - las deudas D136+;
  - PROGRESO;
  - la fila de PLAN §K.1;
  - el commit.
- Después se para, para que el usuario baje el effort.
- La huella pasa a `'H'` con un solo re-baseline anunciado (T1/T6). Las bandas D-D se reportan, no se persiguen.

#### Verificación

- **La definición de terminado:**
  - el validate: los workers corren `--solo`; el supervisor, `--rapido` y el completo en segundo plano;
  - la misma seed dos veces, idéntica;
  - `simulate.js 1000` sin crash;
  - el commit y PROGRESO.
- `--bloque=variedad`, base contra cambio: las tablas de H1 y H2 y las metas de H5.
- `arcade-humano.js` con todas las pruebas de aceptación. El supervisor juega las 12 mecánicas en el Chromium con GPU,
  a 60 y a 144 Hz.
- Una carrera jugada por entrega. Después, el deploy (merge → push → build → `npx wrangler deploy` → md5) y juega el
  usuario.

#### Riesgos

- **La calidad del contenido a escala.** Se cubre con la guía, el editor y la cobertura medida: lo que nadie ve se
  arregla o se borra.
- **El peso del build.** Suma ~+500 KB: se sube el techo, porque `import()` no baja lo que se mide.
- **La temporada sin paradas de partido.** El evento de cada split la cubre; se mide "años sin parada" = 0.
- **El Play-In y las tandas son motor nuevo.** El bot por partido mantiene las bandas.

**Las deudas nuevas** (D136-D142) están en la tabla del final de este documento.

## 1. Por qué un tercer plan

### 1.1 Cómo se ve hoy

Medido sobre las capturas del recorrido de V8a (seed 25, 1440×900 y 390×844; copias en `vitrina/hoy/`):

- **El vacío.** Fondo casi negro con una grilla tenue y escuadras en las esquinas de la ventana. El escenario es una
  columna de ~720 px flotando en el medio; a 1440 px, más de la mitad de la pantalla es negro plano.
- **Cajas dentro de cajas.** Panel achaflanado → caja con escuadras → tarjeta de opción achaflanada → chip con borde. Tres
  y cuatro niveles de marco para decir una sola cosa.
- **Una sola voz tipográfica.** Barlow Condensed en mayúsculas para títulos, rótulos, botones y números; Inter para el
  resto. Sin contraste de escala: el título de una parada y el rótulo de una pestaña se leen casi igual.
- **Cero imagen.** El splash de Data Dragon existe (J9) pero solo aparece borroso en el inicio; los íconos de campeón,
  en el inicio, el pool y el tablero de Fearless. Ni el resultado de un mapa, ni la carta final, ni un título tienen arte.
- **Movimiento mínimo.** Beats de texto de 700 ms, conteos y fundidos. Ganar el Mundial es una línea más del relato y una
  tarjeta dorada.
- **Una pared de texto.** El plan amateur muestra 4 opciones × (label + 2 líneas + 4-5 chips de texto + nota del perfil).
  El 2-2 del Swiss del Mundial —"vida o muerte"— es una cajita con un botón "A JUGARLO" y 700 px de negro debajo.

### 1.2 Por qué los dos planes anteriores salieron iguales

Lo midió un explorador de historia sobre `PLAN.md`, `PROGRESO.md`, `AUDITORIA.md` y el git log:

1. **Los briefs eran de estructura y foco.** FASE T ("La transmisión", 2026-09-04) armó el sistema de diseño y el shell;
   FASE V ("Una cosa por vez", 2026-10-07/08) reordenó la pantalla. La auditoría de 2026-10-01 protegía el look a
   propósito: *"la estética es de muy buena calidad; el problema es de foco"*, *"pintar la casa antes de mover las
   paredes"*.
2. **Nunca hubo dirección de arte.** Ni referencias ni maquetas más allá de ASCII. "Broadcast de esports" se volvió un set
   de tokens y cada pasada recoloreó lo mismo: cyan `#2ee8ff`, oro `#ffc861`, Inter + Barlow Condensed **idénticos desde
   T0**. El único brief visual del usuario —*"un diseño full profesional para cuando subamos la página, moderno y
   futurista"* (2026-09-04)— nunca se tradujo a una imagen. Tras T0 el usuario dijo *"es muy igual al anterior"*.
3. **Las herramientas re-imponen lo viejo.** Los guards empujan cada cambio por los mismos acentos, fuentes y fondo; y el
   recorrido **exige** la columna centrada de ≤ 720 px (`src/dev/recorrido.mjs:668-687`, la regla f2).
4. **Se aprobaron por métricas, no mirando.** Cada plan se construyó en horas con workers baratos en las familias de
   pantalla (Sonnet high) y se cerró por números de layout (números a la vista, opciones arriba del pliegue, contraste).
   Las pruebas del usuario C1 y C2 de FASE V no tienen feedback registrado.

### 1.3 Qué cambia esta vez (proceso, no intención)

- **La imagen antes que las palabras.** La dirección se elige mirando prototipos que funcionan sobre datos reales (§4).
- **El prototipo es la especificación.** Los tokens, el movimiento y los efectos de la ganadora se copian **textuales** a
  `src/ui/` (con un check temporal de que siguen iguales); los renderers se reescriben limpios (§9).
- **La estrella del norte en el mismo estado exacto.** Cada muestra de la vitrina trae su guardado real; el recorrido lo
  inyecta en el juego y compara las dos capturas (§12).
- **Lo viejo, prohibido por guard** (§5.9) y **la regla f2 reescrita primero** (U1a).
- **Gusto con modelo caro.** Opus xhigh en lo visual; Sonnet en lo mecánico (§11).
- **Un crítico que no construyó** con una rúbrica de señales de plantilla (§3.3).
- **El usuario mira tres veces antes del merge**: la vitrina, C1 y C2.

---

## 2. Decisiones del usuario (textuales — respetarlas, no volver a preguntar)

| Tema | Decisión |
|---|---|
| El pedido (2026-10-09) | *"una UI mucho más avanzada y profesional […] esto va a estar en un portfolio […] quiero que entres a jugar y que sea de esas páginas que digas wow"* · *"es la 3era vez que hago un plan de UI y todos terminaron muy parecidos"* · *"no quiero algo que tome muchísimo tiempo"* · *"buildeá varios ejemplos y ponelos en una página para mostrarme opciones, funciones etc como quedaría antes de aprobar"* |
| Leer menos (2026-10-09) | *"intentá que la UI minimice o resuma un poco el texto de las opciones porque a veces parece un juego de lectura, intentá que aunque sea un poco lo haga, tampoco que se pierda info"* → §7 |
| El brief visual de antes (2026-09-04) | *"un diseño full profesional para cuando subamos la página, moderno y futurista"* |
| Siguen vigentes (§V.1 de `PLAN.md`) | **"Escenario + un panel"** (una pieza + un panel de contexto; en el celular, sin el panel) · **"Una página por split"** · el escalón en el cierre de año · **Golden Road** "Todo el año" como **"Logro aparte"** |
| Reemplazada | T.2 "broadcast de esports, desktop primero": la estética la decide la compuerta 1 |
| **Compuerta 1** | La fusión (§4.5), corregida por "una línea" (§4.9) y "las últimas correcciones" (§4.10): la vitrina con `op=linea` es la especificación de producción |
| **Compuerta 2 (2026-10-10): la bisagra** | *"Según el contexto"*: con dos ligas en juego, `liga`; con una copa en juego, `copas`; si no, `campeones` |
| **Compuerta 2 (2026-10-10): el mercado** | *"ofertas, cuando elegís que se apriete, salga la animación de la firma sobre el contrato, después que haya una transición animación donde cae de arriba tu línea sobre el mapa con las líneas, después de eso y la camiseta que aparezca en la parte siguiente que es 'la firma' y que te deje elegir el número"* → atrás va `ofertas` (las cartas formales que se apilan). Al elegir: (1) la carta se aprieta y la firma se dibuja sobre el contrato; (2) transición: tu línea (el glifo de tu rol) cae desde arriba sobre el mapa de la Grieta con las cinco líneas (el `plantel`); (3) la pantalla siguiente, "la firma" (el walkout), muestra la camiseta de espaldas con tu nick y **te deja elegir el número**. El número es cosmético: vive en el marcador `lolcs-vista` (como `momentosVistos`), no en el `state` del motor (huella y `VERSION` intactas), y lo pueden leer la carta y el PNG |
| **Compuerta 2 (2026-10-10): el andamio** | Liviano: U1a reescribe la regla f2 y arma las capturas lado a lado contra la vitrina; las métricas automáticas de §12 (vacío plano, cobertura, histograma, palabras, cuadro) quedan fuera. Se juzga mirando (el usuario: "no te hagas tan fan de los checks") |
| **Aprobada en la compuerta 2 (2026-10-10): enmienda de la regla 1 de §V.3** | Hoy: *"mientras hay una parada, nada más se anima"*. Propuesta: **el ambiente se aquieta en ≤ 1 s cuando aparece una parada** y solo vuelve a moverse en el relato; nada más se anima durante una parada |

---

## 3. La vara

### 3.1 Qué significa "wow" acá

Tres pruebas que juzgan personas y cinco que mide el recorrido.

- **Los 5 segundos** (la juzga el usuario): alguien que nunca vio el juego, en los primeros 5 s del inicio, ve
  movimiento, el arte de un campeón, un título que impone, y entiende que es la carrera de un pro de LoL.
- **La captura** (la juzgan el supervisor y el revisor): cualquier captura de cualquier parada tiene **3 capas de
  profundidad** (ambiente, arte, contenido), **un punto focal ≥ 3× el cuerpo de texto**, y la identidad se reconoce sin
  el logo.
- **La carrera entera** (la juzga el usuario en C2): el wow no se gasta en el primer cuadro; cambia con las eras y explota
  en los momentos.

### 3.2 Lo que mide el recorrido (§12 tiene el detalle)

1. Dentro de **±15% de la estrella del norte**, en los mismos guardados: proporción de vacío plano, cobertura de arte y
   efectos, relación tipografía grande/cuerpo, histograma de tono, anidamiento de contenedores.
2. **Pisos**: anidamiento ≤ 2; cero prohibidos (§5.9); ≥ 4 cambios de era en una carrera completa de `criterio`; todo
   cambio de pieza animado entre 180 y 320 ms (salvo INST o movimiento reducido); `data-era` quieto durante el relato.
3. **Leer menos**: −50% de palabras visibles por parada en escritorio, cada dato a ≤ 1 interacción.
4. **Rendimiento**: p95 de cuadro ≤ 20 ms con navegador visible en la máquina del usuario; tareas largas < 50 ms en las
   transiciones.
5. **Lo de siempre**: las metas de FASE V (≤ 45 números a la vista en escritorio, ≤ 25 en el celular, la opción 1 arriba
   del pliegue, cero scroll horizontal, cero errores de consola), teclado, retomar, contraste, motor intacto.

### 3.3 La rúbrica del crítico (señales de plantilla de IA)

El revisor de cada ola y el supervisor la pasan sobre las capturas. Cada "sí" es una observación:

- ¿Todos los radios son iguales? ¿Todo está adentro de una caja? ¿Hay cajas dentro de cajas?
- ¿Las pilas están centradas por defecto, sin una decisión de composición?
- ¿Hay degradados violeta-azul genéricos, vidrio esmerilado en todo, brillos sin fuente de luz?
- ¿Hay más de dos acentos compitiendo? ¿Gris sobre gris?
- ¿Los íconos son de un set genérico o emojis?
- ¿El título y el cuerpo tienen casi el mismo tamaño?
- ¿La pantalla se entiende igual sin el arte? (Si sí, el arte es decoración, no ambiente.)
- ¿Se parece a lo de hoy (§1.1)?

---

## 4. La vitrina y la elección

`vitrina/` vive fuera de `src/` y de `dist/` (`build.js` copia solo `index.html`, `src/{core,data,systems,ui}` y el
og-image) y se sirve con su propio servidor (`node vitrina/servir.mjs`, puerto 8095), no con `server.js` (el check K0-B
prueba su lista blanca con mutantes).

- **Datos reales** (`vitrina/datos/generar.mjs`): el bot `criterio` juega cientos de carreras headless con
  `avanzarSplitAuto` (`src/core/pipeline.js:180`); se elige una seed héroe por cobertura (plan amateur de 4 opciones, Bo5
  con quemados, Swiss 2-2, título, mercado con ≥ 3 ofertas, primer contrato; deseables: Mundial, lesión, cierre con
  parada, Golden Road). Cada muestra guarda las salidas de los helpers puros del juego, la página del relato, el
  resultado real de **cada** opción (resuelta en un clon desde el mismo estado) y **su guardado real** (`serializar` + el
  marcador `lolcs-vista`). Correr dos veces da el mismo archivo.
  **Medido (2026-10-09)**: barrido de 2500 seeds sin errores; la seed héroe es la **61** (Elurah89, mid, BR: Enclave
  Collective → LOUD → RED Canids Kalunga → FURIA, 4 CBLOL → Karmine Corp, LEC 2035 y **Golden Road 2036**; retiro
  elegido a los 33, puntaje 1494, percentil 99): cumple los 6 obligatorios y todos los deseables menos la lesión (no hay
  una seed en 2500 que tenga lesión grave y los 6 obligatorios a la vez). `muestras.json` pesa 426 KB y 9 guardados
  reales validados (`vitrina/datos/guardados/`). El atajo `--seed 61` difiere de la corrida completa solo en las 3 filas
  del historial del inicio: la canónica es la completa.
- **La era de cada muestra** (`comun/catalogo.js`, `ERA_DE_MUESTRA`): inicio y plan amateur → `pieza`; mercado y firma
  → `academia`; evento, serie, cierre y título → `escenario`; Swiss y Mundial → `mundial`; final → `leyenda`. Es el
  primer borrador de la regla que va a vivir en `ui/core/era.js` (§9.2), que la deriva de la `vista`.
- **El andamio común** (`vitrina/comun/`): el panel (pantalla, muestra, era, repetir, sonido, celular, movimiento
  reducido, INST, WebGL sí/no, FPS, textos breves/completos, peor caso, "hoy"), el cargador CORS de Data Dragon, el PRNG
  decorativo, el contrato del ambiente, las fuentes OFL, el verificador (las reglas de `guards.js` + la lista de
  prohibidos) y las capturas (escritorio, celular, reloj congelado, tiras de cuadros, con y sin WebGL).
- **Ronda 1**: las tres direcciones en paralelo, mismas pantallas y mismos datos: **inicio** con intro · **decisión**
  (un evento de 2 opciones y el plan amateur de 4, con "leer menos" y elegir → resultado real) · **la cumbre** (el título
  que desemboca en la carta) · **la tira de eras** (la misma pantalla en las 5 eras) · **celular**.
- **El índice**: las tres con su inicio vivo, el **modo lado a lado** (A|B|C sobre la misma pantalla y muestra), la matriz
  de funciones, antes/después contra `hoy/`, la recomendación y **"Copiar mi elección"**.
- **Compuerta 1** → **ronda 2** (solo la ganadora): serie (la pared de retratos de Fearless, el Swiss 2-2, la serie mapa
  a mapa), mercado (ofertas + la firma), celular de ambas, trayectoria + PNG.

### 4.1 La ronda 1: cómo son las tres (2026-10-09)

Las tres corren sobre la seed 61, con las mismas pantallas (inicio, decisión del evento y del plan amateur, la cumbre del
título → la final, la tira de eras, el celular). Cada una se construyó con un Opus xhigh en paralelo y tuvo una ronda de
observaciones del supervisor (rúbrica de §3.3, mirando todas las capturas y las tiras). Las tres pasan `verificar.mjs`
y su captura completa, con 0 errores de consola y 0 `requestfailed`. El código vive en `vitrina/<dir>/` (con su
`README.md`: tokens, efectos y qué se traslada). Las capturas de referencia están en `vitrina/referencia/ronda-1/` (8
por dirección: inicio, evento, plan amateur, el momento del título, la final, eras, el resultado al elegir, celular). Las
capturas completas no se versionan: se regeneran con `comun/capturar.mjs`.

**A · LUZ** (`vitrina/a-luz/`, commits `bfecc59` → `5a63908`).
- *El mundo.* Un ambiente WebGL2 propio (`js/ambiente.js`): haces, bruma, polvo, bokeh, tubos y el resplandor del
  monitor, con 5 equipos de luz por era:
  - `pieza`: azul de monitor + ámbar de velador;
  - `academia`: fluorescente verde agua;
  - `escenario`: haces cruzados de estadio + rim magenta + público en bokeh;
  - `mundial`: oro;
  - `leyenda`: atardecer.
  El splash del campeón vive dentro de la luz, en duotono de la era, encuadrado por la cara (no en un recuadro). Todo
  depende de un reloj: `congelar(t)` dibuja ese instante, así las tiras son fieles.
- *Tipografía.* Mona Sans condensada 800 en títulos (≤ 56 px en las paradas, 96-214 px en el inicio y la cumbre),
  expandida 900 en los números; Geist en el cuerpo; Geist Mono 11-13 px en los rótulos. El contraste de escala es la
  herramienta.
- *Inicio.* Intro de ~3 s ("15 años. Una pieza.") y la selección: al apuntar un campeón, su splash reemplaza al
  anterior en el ambiente con una transición (**lo que más le gustó al usuario**, §4.2). Servidor como selector,
  BLOQUEAR que se enciende con 3 mains.
- *Decisión.* Las opciones son franjas con glifos (eje + ▲/▲▲/▲▲▲ por cantidad, riesgo con ícono) y un inspector con la
  prosa de a una. El plan amateur es una matriz con el valor actual de cada eje en el encabezado. Al elegir, la franja
  crece y se vuelve la tarjeta del resultado real, con los números rodando ("75 → 76", "64 → 61"). La placa de
  contexto queda a la derecha, sin repetir el nivel de la franja.
- *Cumbre.* Takeover de 2,4 s: la luz sube a oro, "CAMPEONES" letra por letra con un barrido especular, los créditos
  del plantel y polvo dorado. Desemboca en la carta holográfica 5:7 (puntaje grande, LEYENDA, Golden Road, banda
  iridiscente) con la trayectoria dibujada.
- *Contraste medido* con un script de píxeles: peor caso por era entre 4,59 y 5,56 en las paradas.
- *Débil:* en el celular el ambiente queda bastante tapado por los velos que hacen falta para el contraste.

**B · NOCTURNO** (`vitrina/b-nocturno/`, commits `1a717ad` → `5b9b8f2`). *Queda archivada después de la compuerta 1
(§4.2): sus ideas se pueden importar.*
- *El mundo.* Una revista que sale de noche: negro, una tinta ácida `#C8FF2E`, Archivo variable con violencia
  tipográfica, IBM Plex Mono en los folios ("UN SPLIT MÁS · EDICIÓN 2032 · PRETEMPORADA · P. 283") y Fraunces itálica
  solo en la cita destacada.
- *El arte.* El splash en semitono por shader, con niveles por histograma antes del tramado.
- *Cada era es otra imprenta:*
  - `pieza`: fotocopia de fanzine de 1 bit;
  - `academia`: la revista de la liga;
  - `escenario`: el ácido pleno;
  - `mundial`: oro como segunda tinta;
  - `leyenda`: papel.
- *Lo mejor:*
  - la doble página de la decisión (la crónica con capitular, ÚLTIMO MOMENTO a máquina y la cita, a la izquierda; LA
    DECISIÓN con números grandes y la "nota al margen" como inspector, a la derecha);
  - el plan amateur como tabla de almanaque;
  - el ¡EXTRA! en papel que entra girando;
  - la edición de colección con el almanaque de la carrera (curva, cinta de clubes, nota de cada año, los 8
    Mundiales).
- *Débil:* el arte en semitono se lee a medias en tamaño grande.

**C · PANTALLAS** (`vitrina/c-pantallas/`, commits `8cfc45e` → `bb3ddfe`).
- *El mundo.* Un sistema operativo inventado, **FARO**, cuya versión es el año del juego (FARO 26 en la pieza, FARO 32
  en FURIA, FARO 44 al retiro). Los mismos componentes se re-tematizan por era:
  - 2026: oscuro con violeta;
  - 2028: la PC clara del equipo;
  - escenario: la estación de pro monocroma;
  - mundial: el stream;
  - 2040s: sin marcos, con el dock flotante.
  La ventana enfocada es el escenario, el widget acoplado es el acompañante, el dock son los 6 cuartos, y la bandeja
  del sistema es tu cuerpo (batería = sueño/cabeza, señal = jerarquía).
- *Inicio.* BIOS → logo → pantalla de bloqueo con un reloj gigante "2026" → el login como "nueva carrera". La
  selección de campeones vive en la ventana "Cliente".
- *Decisión.* La ventana enfocada con glifos e inspector. Las notificaciones son un stack real de FARO. El plan amateur
  es una planilla con el escudo de rango en SVG propio. Al elegir, la opción vuela y se vuelve tu mensaje, después
  "escribiendo…", y la respuesta real llena la ventana mientras los números ruedan en el widget.
- *Cumbre.* El título como **stream** a pantalla completa con el chat cayendo (PRNG decorativo, armado con datos reales
  de la serie). Termina con un apagado CRT y el **salón de la fama**: la carta con el splash a sangre y `carrera.log`
  con la curva.
- *Contraste medido:* 0 fallas en 879 textos.
- *Débil:* la decisión se lee un poco más "app" que juego, y no hay WebGL: el wow descansa en el concepto y el
  movimiento.

### 4.2 Compuerta 1: lo que dijo el usuario (2026-10-09, textual)

> uffff, me gustaron el A y el C,
>
> Primero que nada, quiero que quede anotado cómo son estos tres para que después salga bien, ¿no? O sea, que no quede
> en tu memoria y te vayas olvidando. Lo que más me gustó del A es como... Es que tiene como aura que cuando jovereas un
> champ cambia el fondo y es como que entra en transición, eh, que tenga como esas animaciones, eso está bueno. Es más,
> hasta se podría poner fondos animados, pero no sé si se consiguen fácil. Pero me parece que está bastante bueno. Eh,
> quizás el fondo retro ese, o sea, está bueno, está bueno, eso no te lo voy a negar. Pero hay que ver. Y después del C,
> que es la segunda opción, me gustó que es como clásico. ¿Me entendés? O sea, ¿a qué voy con esto? Es, es simple del
> LOL. Tipo, a ver, cuando jovereas no se cambia nada. Eh, pero está bueno, es como del LOL, me explico. O sea, es como
> lo más fácil de entender. Ahora, ¿yo sabes qué te diría? Lo que yo te voy a decir que vos hagas es... El A y el C,
> expandilos. Pensalos un poco más, mejorarlos. Como para que yo pueda ver un poquito más. No te digo que hagas mucho,
> pero un poquito más de ellos y me pueda decidir mejor. Que sea una demostración un poco más alta de ambos.

Lo que se lee (sin sobre-interpretar):
- **Finalistas: A y C. B queda archivada.**
- De A le gusta el **aura**: que el fondo cambie con transición cuando apuntás un campeón, y las animaciones en
  general. Propone **fondos animados** si se consiguen.
- De C le gusta que es **clásico, "como del LoL"**: simple, lo más fácil de entender, aunque al apuntar no cambia nada.
- "El fondo retro" queda **ambiguo**: puede ser el semitono de B o el escritorio de 2026 de C. No se actúa sobre esa
  frase sin preguntar.
- Pide **ampliar A y C un poco** para decidir mejor. No pide mucho.

### 4.3 Ronda 1b: A y C ampliadas (el plan, escrito antes de implementarlo)

**Las mismas pantallas nuevas para las dos**, para que la comparación sea justa. Son las que esta sección ya preveía para
la ronda 2 de la ganadora, así que la ronda 2 se achica:
- **`partido`**:
  - la serie Bo5 con Fearless: el plan de 3 opciones con la p de cada mapa, los quemados, el replan cuando "te
    leyeron" (`serieReplan`), la serie jugada mapa a mapa con VICTORIA/DERROTA;
  - el **Swiss 2-2 del Mundial**, "vida o muerte", con su resultado real.
- **`mercado`**: las 6 ofertas (sueldo, años, arraigo, jerarquía proyectada, riesgo) y **la firma** como momento.
- Los datos: la ola de datos agrega `resultados[]` al Swiss y al mercado (rama `u-vitrina-datos2`).

**Cada una profundiza lo que le gustó al usuario:**
- **A, el aura.**
  - Que **todo lo que muestra un campeón** reaccione al apuntarlo con la transición del ambiente: la selección, la pared
    de retratos de Fearless, el plantel, los picks de la serie. En las opciones, la luz responde sutil al eje apuntado.
  - **Fondos animados**: el splash pasa a ser un plano vivo, animado por el shader (profundidad 2,5D, deriva lenta,
    partículas de la era, barridos de luz), sin assets nuevos ni dependencias. Los splash animados reales existen solo
    para algunos skins y no están en Data Dragon. El worker puede sondear CommunityDragon (≤ 5 llamadas) para
    informarlo, pero el juego no depende de eso.
  - Transiciones de luz entre pantallas en vez de cortes.
- **C, lo clásico.** Que se sienta **como el cliente del LoL**, sin clonarlo:
  - la serie como una ventana de draft, con los picks y los quemados de Fearless en gris;
  - el fin de cada mapa como la pantalla de VICTORIA/DERROTA;
  - el Swiss como el stream;
  - el mercado como la **bandeja de contratos**, donde la firma se dibuja (su firma 4, que había quedado para la
    ronda 2).
  La vara de C: simple, se entiende de un vistazo.

**Resultado (2026-10-09).** Las dos cumplieron todo el orden de prioridades: 102 capturas cada una, 0 errores, contraste
medido por píxeles.

**A** (`0726c8d`):
- El **aura** es un solo mecanismo (`js/aura.js`, por `data-campeon`) en la selección, los mains, la pared de Fearless,
  los picks de cada mapa, los quemados, el campeón del split y el plantel del título. Entra a los 120 ms, cruza en
  750 ms y no salta si llega otro campeón mientras cruza.
- El **splash vivo** sale del shader (profundidad 2,5D, parallax, deriva, flujo en las luces, barrido de luz cada
  11 s, polvo y brasas por era) y respira en las paradas.
- Transiciones de luz entre pantallas.
- CommunityDragon: solo 12 de 2167 skins tienen splash animado (ninguna base, ninguna de esta carrera, ~2,8 MB cada
  una). Descartado: el splash vivo procedural es el camino.
- Las pantallas nuevas:
  - la serie con la pared de retratos que se apaga al quemarse y la serie jugada mapa a mapa;
  - el replan con la luz que se quiebra;
  - el Swiss 2-2 en oro, que termina en DERROTA → AFUERA, con el récord rodando a 2-3;
  - el mercado como tabla de ofertas;
  - la firma de LOUD como takeover: la luz de la pieza se abre en la de la academia y el handle se traza en luz.

**C** (`ee7e33e`):
- El **hover-pick del cliente** (`js/campeones.js`): apuntar un campeón cruza su splash y muestra su nombre en la
  ventana Cliente, como el champ select, sin aura de ambiente. Además, el feedback clásico: una barra de luz en la
  opción, teclas que se hunden.
- La serie es **un draft**:
  - los dos equipos a los costados con 5 ranuras y la p de cada mapa contra el 50%;
  - los quemados como baneados;
  - un **post-game** VICTORIA/DERROTA con emblema propio en cada mapa ("tenías 78%").
- El replan entra como notificación.
- El Swiss va en la **Tribuna**, con la banda VIDA O MUERTE y el chat nervioso. Termina en "Fin de la transmisión", con
  las dos p (42% con la charla, 19% sin) y lo que quedó.
- El mercado es la **bandeja de contratos**: el color del club solo en su ícono, Enter firma.
- La **firma se dibuja**, y la PC de la pieza se cierra y queda la del equipo.

**Lo que ninguna resolvió del todo** (queda para la ronda 2 de la ganadora):
- A: la columna derecha de la serie compite un poco con la decisión, y un cuadro del odómetro de la firma muestra un
  "." suelto.
- C: el toast del replan tapa la cabecera del rival ~3 s, y entre mapa y mapa asoma el hover-pick.

**Proceso.**
- Dos Opus xhigh nuevos en paralelo, uno por dirección; leen el `README.md` y el código de su dirección en vez de
  continuar a los de la ronda 1, que tienen contextos de ~500K.

### 4.4 Compuerta 1, segunda vuelta: lo que dijo el usuario sobre A y C ampliadas (2026-10-09, textual)

Recorrió en orden los enlaces directos que se le pasaron: la serie, el Swiss, el mercado y la firma.

> En el, en el primero me gusta más el del C. Un toque más. El A está bueno, pero el C es más de juego, siento yo. O
> sea, el A está bueno, pero el C me gusta un poquitito más. En el segundo... En el segundo... Me gusta más el de A. En
> el tercero... Me gusta más el de A. pero noto que aveces los diseños no siguen una misma linea no se, Para que sepas
> las combinaciones que tenés que hacer y eso, me gusta más el de C en el primero. Por un poquito. En el segundo me
> gusta más el de C porque siento que es más de juego. El de A está bueno, pero el de C tiene mejor interfaz. Y en el
> tercero también creo que se ve un poco mejor el de... El de A y aparte tiene mejor interfaz. En el segundo la
> interfaz del del A También está buena, pero el del C es un poquito mejor. O sea, tampoco... Tampoco es un re cambio.

Lo que se lee:
- **La serie: C, por poco** ("es más de juego").
- **El Swiss: C, por poco.** En la primera vuelta dijo A y en la segunda C ("tiene mejor interfaz"); vale la segunda,
  que es la que justificó.
- **El mercado: A** ("se ve un poco mejor y aparte tiene mejor interfaz").
- **La firma:** no la comparó.
- **Las diferencias son chicas** ("tampoco es un re cambio").
- **El pedido de fondo: "los diseños no siguen una misma línea".** La respuesta no puede ser un collage de pantallas de
  A y de C, porque eso empeoraría justo lo que marcó. Tiene que ser **una dirección nueva y única** que combine las dos
  según sus preferencias, con un solo sistema de diseño (§4.5).
- Esto se suma a la primera vuelta (§4.2): de A le encantó el aura y las animaciones; de C, que es "clásico, como del
  LoL, lo más fácil de entender".

### 4.5 La fusión: la interfaz de C dentro del mundo de A (el plan, escrito antes de implementarlo)

**La idea en una línea:** *el cliente de tu carrera, iluminado.* Hay dos capas, y cada una viene de una sola dirección:
- **El mundo, de A.** El ambiente WebGL con los 5 equipos de luz por era, el splash vivo, el **aura** (apuntar un
  campeón lleva la luz a él), las transiciones de luz entre pantallas, los takeovers (título, firma, AFUERA) y la carta
  holográfica.
- **La interfaz, de C.** Paneles claros "de cliente", la jerarquía de lectura, el draft de la serie con los quemados
  como baneados, el post-game de cada mapa, la Tribuna con el chat para los partidos internacionales, la planilla, el
  feedback clásico de cliente (la barra en la opción apuntada, la tecla que se hunde) y la barra de cuartos abajo.

**Las reglas de "una misma línea"** (se miden en la revisión y después son guards de producción):
1. **Una sola superficie.** Un tipo de panel (fondo oscuro translúcido de token, sin desenfoque sobre el canvas, filete
   de 1 px teñido por la luz de la era), una escala de radios (panel, control, chip) y ≤ 2 niveles de contenedor.
2. **Una sola jerarquía tipográfica.**
   - La interfaz habla como C: Geist en el cuerpo; Mona Sans ancha y en minúsculas en los títulos de pantalla (≤ 56 px
     en las paradas); Geist Mono 11-13 px en los rótulos.
   - Los momentos gritan como A: Mona Sans condensada en mayúsculas, 96-214 px, solo en takeovers y cierres.
   - Los números: Mona Sans expandida 900, tabulares.
3. **Un solo color.** Tintas, semánticos (`--up`/`--down`/`--warn`) y oro, de A. **El único acento es la luz de la era**:
   el violeta de C desaparece. El color de una org vive solo en su chip.
4. **Las eras cambian la luz y el arte, nunca la interfaz.** Se acaba la ventana clara de 2028 y el cambio de chrome por
   era de C: es lo que más rompe la línea. El paso del tiempo lo cuentan la luz, el arte y los datos.
5. **Una sola gramática de movimiento.** La de A: expo-out 180-320 ms, el orden luz → rótulo → título → opciones,
   quieto en las paradas. Encima va el micro-feedback de cliente de C.
6. **El hover, igual en todos lados.** Todo lo que representa a un campeón dispara el aura. Todo lo interactivo tiene el
   feedback de cliente.
7. **Un solo sistema de momentos.** El takeover de A para título, firma, AFUERA y Mundial. La Tribuna de C (el "video"
   es el splash vivo en la luz de la era) para los partidos internacionales.

**Pantalla por pantalla** (de dónde sale cada una; todas reescritas con las reglas de arriba):

| Pantalla | Base | Qué se suma |
|---|---|---|
| Inicio | A (la selección con el aura, la intro) | los paneles y controles de C (servidor, perfil, roles) |
| Decisión (evento, plan amateur) | la estructura de C (un panel con opciones + inspector, el widget de contexto, la planilla) | la luz y el arte de A, con la cara del campeón libre |
| Serie y replan | **C** (el draft, los quemados como baneados, el post-game por mapa) | el aura en cada retrato y pick, y la luz que cae en DERROTA o sube en VICTORIA |
| Swiss 2-2 | **C** (la Tribuna, VIDA O MUERTE, el chat, "Fin de la transmisión") | el video del stream es el splash vivo en la luz del Mundial; AFUERA como takeover de A |
| Mercado | **A** (la tabla de ofertas sobre la luz de la academia) | el panel de lectura de una oferta por vez de C, y Enter firma |
| Firma | A (la luz de la pieza se abre en la de la academia, el handle trazado en luz) | — |
| Cumbre: título | A (el takeover CAMPEONES) | — |
| Cumbre: final | A (la carta holográfica + la trayectoria) | la vitrina de trofeos de `carrera.log` de C, como lista |
| Eras | A (la misma pantalla en las 5 luces) | — |
| Celular | la barra de cuartos de C y las hojas de A | — |

**Proceso.**
- Un solo Opus xhigh construye la fusión en una carpeta nueva, `vitrina/fusion/`, partiendo del código de A y de C.
  Uno solo, porque el requisito central es la coherencia, y dos workers en paralelo la romperían.
- A y C quedan como están, como referencia.
- Una ronda de observaciones del supervisor, con la rúbrica + las 7 reglas de arriba.
- Se sirve en el 8095 y el usuario la mira. Si la aprueba, **la fusión es la dirección elegida**: §5 se reescribe con
  sus tokens y la producción la traslada textual.

**Resultado (2026-10-09, `f35fcb4`).** Cubre el catálogo entero (inicio, evento, plan, serie, replan, Swiss, mercado,
firma, título, final, eras, celular), con el resultado real al elegir en todas las paradas. Parte del código de A.

Qué se armó:
- `js/partido.js` reescribe el draft y la Tribuna de C sobre los helpers de A. El centro del draft queda abierto al
  mundo. El aura responde en cada libre, pick y quemado, y el nombre del campeón sigue a la luz (`aura.alCambiar`). Cada
  mapa se juega como pantalla de carga en duotono → VICTORIA/DERROTA. En el Swiss, el video es el splash vivo en oro y
  AFUERA llega como takeover.
- La decisión es el panel de C anclado abajo, con la cara del campeón libre.
- El mercado es la tabla de A con el panel de lectura de C.
- La final suma la vitrina de trofeos de C.

Verificación:
- Una sola superficie, una barra arriba y una abajo en todas las pantallas de cliente, títulos en Mona ancha minúscula,
  la luz de la era como único acento, ninguna hoja de interfaz que cambie por era.
- La hoja de contactos de las 10 pantallas (`vitrina/referencia/fusion/fusion-hoja-de-contactos.jpg`) lo confirma.
- 102 capturas, 0 errores.
- Contraste medido: 1911 textos en 30 casos, 0 debajo de 4,5:1.

Pendiente de pulido (para la ronda con lo que diga el usuario):
- el draft está denso;
- queda una fila "Tu plan · 91%" después del resultado de la serie;
- el nombre del campeón en el draft habla con la voz de título, y el champ select real lo grita;
- las transiciones dentro de la página se revisaron cuadro a cuadro, nadie las vio en vivo.
- Mismas reglas de `comun.md`, una ronda de observaciones del supervisor, y la vitrina se vuelve a servir en el 8095.
- **Compuerta 1 (final):** el usuario elige A, C o una mezcla. Después, la ronda 2 de la ganadora es solo lo que falte
  (trayectoria + PNG y los celulares de la serie y el mercado), y se cierra §5.

### 4.6 Compuerta 1b: lo que dijo el usuario sobre la fusión (2026-10-09, textual), y las tres intensidades

> Está bien, pero ¿sabes qué siento que pasa en la fusión? Por ejemplo, en la serie. Yo dije que me gustaba más tipo el,
> la interfaz. Pero está todo como así oscuro de la luz los champions. Y eso está bueno cuando arrancás la carrera,
> elegís tus main todo. Y está bueno que se mantenga esa estética, pero no tan heavy después, ¿me entendés? O sea, sí
> está bien un poco, pero no tan heavy. Tipo, quiero que la mantengas, la esencia, pero no tan fuerte. Por ejemplo, que
> no estén todo el tiempo los campeones. Quizás sí un poco, pero no tanto. Escúchame, hace otra página de cómo sería eso
> de un poco como no tanto. Mostrando solo un poquito. Tipo, mostrando, por ejemplo, la serie o eso sí, pero tipo... Un
> poco, mostrando tipo variaciones de cómo sería un poquito. Tipo, manteniendo el coso de la luz, pero no al 100%
> después de la pantalla inicial. Hace una demostración. O sea, hace una página que tenga tres variantes.
>
> Intenta entender a lo que me refiero.

Lo que se lee:
- **La fusión está bien** ("está bien, pero…"), y la interfaz de C en la serie sigue siendo la elegida.
- **Lo que pesa es el mundo.** Hoy el splash del campeón ocupa toda la pantalla, en la luz de la era, en todas las
  pantallas y todo el tiempo. En `vitrina/referencia/fusion/fusion-serie.jpg` y `fusion-decision-evento.jpg`, el Sylas en
  violeta es lo más grande de la pantalla.
- **En el inicio está bien al 100%**: al arrancar la carrera y elegir los mains. Ahí no se toca.
- **Después: la esencia, "no tan heavy".** Se queda la luz de la era. Los campeones, "quizás sí un poco, pero no tanto",
  y "que no estén todo el tiempo".
- **Pide ver variantes antes de decidir**: una página con tres, mostrando la serie "o eso".

**Las tres variantes.** Cada una baja el campeón por un eje distinto, para que la diferencia se vea de un vistazo:
1. **Tenue: el mismo mundo, a bajo volumen.** El campeón sigue de fondo siempre, pero a un tercio de presencia:
   - fundido en la luz de la era, con más bruma y viñeta y menos contraste;
   - sin la cara en primer plano;
   - el aura sigue cruzando de campeón, igual de tenue.
   - La pantalla se lee primero como luz y después como campeón.
2. **De paso: el campeón aparece cuando importa y se va.** El fondo de reposo es solo la luz de la era (haces, bruma,
   polvo). El campeón entra:
   - con el aura, al apuntar un campeón;
   - en la pantalla de carga de cada mapa y en VICTORIA/DERROTA;
   - al elegir.
   - Después se funde de vuelta a la luz en ~2 s.
   - En la decisión y el mercado no hay campeón salvo con el hover.
3. **En su lugar: el campeón vive en un lugar fijo de la interfaz, como en el cliente.** El fondo de pantalla completa
   es solo luz. El campeón aparece contenido y recortado en lugares fijos:
   - el escenario del draft (la ventana del medio);
   - la cara en el panel "vos" de la decisión;
   - los retratos y las ranuras.
   - El aura cambia ese lugar y tiñe la luz, pero no inunda la pantalla.

**Lo mismo en las tres:**
- **la interfaz no cambia**: es la misma fusión, solo cambia el mundo;
- **el inicio queda al 100%**: es la referencia de "así arranca";
- **los takeovers (CAMPEONES, la firma, AFUERA) quedan al 100%**, porque son los momentos. Es una decisión del
  supervisor; si el usuario los quiere también atenuados, se cambia;
- la luz de la era y su cambio entre eras siguen;
- el contraste sigue en ≥ 4,5:1.

**Cómo se construye:**
- **Una perilla en la fusión.** `fondo=pleno|tenue|paso|lugar` en el hash. Por defecto queda `pleno`, que es la de hoy.
  El panel de la vitrina tiene el selector.
- **Una página nueva, `vitrina/fusion/variantes.html`**, con las tres variantes lado a lado sobre la misma pantalla:
  - pestañas para la serie, el Swiss, la decisión y el mercado;
  - el inicio al 100% como referencia;
  - clic (o 1-3) en una variante para abrirla grande e interactiva;
  - un enlace desde la sección de la fusión del índice.
- **Un solo worker**, Opus xhigh, en `vitrina/fusion/**` (más el enlace del índice).
- **El pulido pendiente de §4.5 espera** a que el usuario elija la intensidad, y entra en la misma ronda.

**Primera versión (`abb6734`).**
- **La perilla `fondo`** vive en `js/fondo.js`.
- **Hojas de contactos** de 4 pantallas × 4 variantes.
- **Lo que mostraron las hojas:** en la serie, `lugar` casi no se distinguía de `pleno`, porque el campeón ya vivía en el
  escenario. Se pidió una corrección.

**La aclaración del usuario (2026-10-09, textual), que cambia el eje:**

> Yo no iba tanto al espacio, aunque sí un poco, pero, pero un poco nomás. Me refería, por ejemplo, más al, al blanco y
> negro, violeta ese que tienen, que a veces, o sea, estaba bien para el inicio eso, pero si estaba siempre iba a ser
> como un estilo repetitivo. Que estaba bueno, que esté presente, pero no tan fuerte siempre. No sé si llegaste a
> entender eso.

**Lo que se lee:**
- **Lo repetitivo es el color, no el tamaño.** Es el **duotono de la era**, que deja a cada campeón en "blanco y negro +
  violeta". Está en el fondo, en el escenario, en los libres, ranuras y picks, en las cartas de carga y en el video de la
  Tribuna.
- **En el inicio está bien.**
- **Después tiene que seguir presente, pero no tan fuerte siempre.**
- **El espacio baja "un poco nomás".**

**Las tres variantes, rehechas sobre el color.** Es una perilla nueva, `color=duotono|real|mitad|capas`, en un solo
lugar, como `fondo.js`.
- **`duotono`** es la de hoy. Es el valor por defecto y queda siempre en el inicio y en los takeovers.
- **1 · A color (`real`).** Después del inicio, todo campeón va con sus colores reales. La era queda en la luz (haces,
  bruma, polvo, filete) y en un lavado leve (≤ ~20%) sobre el arte de fondo, para integrarlo a la escena.
- **2 · Mitad (`mitad`).** Una mezcla de ~50% entre el color real y el duotono, en todos lados: los colores del campeón
  se reconocen, desaturados y llevados hacia la paleta de la era.
- **3 · Fondo en duotono, retratos a color (`capas`).**
  - El fondo de pantalla completa conserva el duotono, más suave.
  - Todo campeón que es pieza de interfaz (retratos, libres, picks, ranuras, quemados, cartas de carga, la banda de "vos")
    va a color, como en el cliente del LoL.

**El espacio, "un poco nomás":**
- Un nivel nuevo, `fondo=menos`: la composición de `pleno` con el campeón de fondo a ~70% y sin derrame fuera de los
  paneles.
- Las tres variantes de color se muestran con `fondo=menos`.
- Las variantes de espacio de la primera versión (tenue, de paso, en su lugar) quedan como selector secundario en el
  modo grande de `variantes.html`.

**Resultado (2026-10-09, `899ed27`, merge `81993d4`).**
- **La política vive en dos tablas.** `js/color.js` tiene la de color y `js/fondo.js` la de espacio, que suma `menos`.
  Las leen el ambiente, el aura y `partido.js`, que solo declara "momento" y "takeover".
- **Sin perillas, la fusión no cambia.** La diferencia es de 6 a 9 niveles, lo mismo que da el grano del reloj del
  código contra sí mismo.
- **`variantes.html`** muestra tres iframes vivos lado a lado, con pestañas para la serie, el Swiss, la decisión y el
  mercado. El modo grande se cambia con 1-3 (0 vuelve a "como hoy") y tiene el espacio como selector secundario. Rinde
  a 30 fps por mundo; con una variante abierta en grande, las otras dos se pausan.
- **Contraste:** 2565 textos, 0 debajo de 4,5:1 (el peor da 5,77). `verificar.mjs` está en verde y el smoke en el 8095
  no da errores.
- **Lo que se ve:**
  - con Sylas (la serie y la decisión), `real` y `mitad` se parecen al duotono, porque su splash ya es pálido y violáceo;
    la diferencia está en los retratos y en el aura sobre otros campeones;
  - en el Swiss, el mercado y las cartas de carga, las tres se distinguen de un vistazo;
  - el Yone rojo del mercado en `real` es lo que más "pegado" queda.
- **Lo que falta:**
  - la carta de la final sigue en el duotono de su rareza;
  - sin WebGL, `lugar` muestra solo luz.

### 4.7 Compuerta 1b, tercera vuelta: color fino, la competición, y que la pantalla cuente lo que pasa (2026-10-09, textual)

Mandó cuatro capturas de `variantes.html`, en el orden de las pestañas: la serie, el Swiss, la decisión y el mercado.
La cuarta se adjuntó repetida: llegó otra vez la de la decisión. Por el orden y por "los logos de los equipos", el
comentario 4 es del mercado.

> los campeones ahi estan bien que sean medio bitono y el fondo tambien, pero yo intentaria que el fondo tenga mas
> calidad y que los campeones tengan un 15% mas de color mientras que el fondo un 10% mas, eso en la primera foto […] la
> imagen 2 esta bien pero deberia ser un 20% menos amarilla y mas estetica de la competicion (LEC WORLDS MSI LO QUE SE
> ESTE JUGANDO) […] despues la imagen 3 me gusta como esta diseñada pero siento que es muy aburrida, interactua poco con
> el fondo, y principalmente, representa poco lo que esta pasando, o no se si eso pero es un poco "simple" "poco
> original" "aburrida" "sin escencia del lol" […] y la imagen 4 siento que le falta un poco representar lo que esta
> pasando, falta ese aspecto de peso de decision importante o formal, y tambien se deberian añadir los logos actuales de
> los equipos etc, pensalo bien y empeza a buildear directo las preview con opciones

**Lo que se lee, pantalla por pantalla:**
- **Serie: la receta de color, con números.**
  - La base es `mitad`. Los campeones (retratos, libres, picks) suben un 15% de color, a ~65% color / 35% duotono.
  - El campeón de fondo sube un 10%, a ~60/40.
  - **El fondo tiene que tener "más calidad".** Hoy el splash sale blando y con bordes pixelados (el rosa en la cara de
    Sylas), porque el shader pinta a escala ≤ 0,5 y el "vivo" desplaza la imagen. Tiene que verse nítido, como el splash
    del champ select.
- **Swiss: un 20% menos amarillo, y con la estética de la competición.**
  - Hoy el Mundial es "oro" genérico de la era. Cada pantalla de partido tiene que verse como **lo que se está jugando**:
    Worlds, MSI, LEC, LCK, CBLOL, con su identidad, su logo y su paleta.
  - Es un eje nuevo: **la identidad de la competición** se monta sobre la luz de la era en las pantallas de partido.
- **Decisión: el diseño gusta; el problema es que es aburrida.** Interactúa poco con el fondo, no cuenta lo que está
  pasando, y le falta originalidad y "esencia del LoL".
  - El ejemplo es "Un equipo coreano te quiere en su cupo de import". El fondo es tu campeón y nada más: Corea, el
    equipo y la LCK no aparecen.
- **Mercado: no cuenta lo que pasa y no tiene peso formal.** Firmar con un equipo tiene que sentirse una decisión
  importante. Faltan **los logos actuales de los equipos**.
- **"Empezá a buildear directo las preview con opciones"**: varias opciones por pantalla, para elegir mirando.

**Decisiones del supervisor:**
- **Los logos reales de los equipos y de las ligas entran.** Esto revierte el recorte "colores reales de org" de §14, por
  pedido del usuario.
  - En la vitrina se enlazan desde el CDN oficial (`<img>`, nunca en un canvas ni versionados). Si no cargan, queda el
    chip de hoy.
  - Las orgs inventadas de la simulación llevan un escudo-monograma del sistema.
  - Antes de publicar (§15) se revisa la política de uso.
- **Rige la regla 3 de §4.5, con una excepción.** El color de una org entra solo con su logo, en el mercado y en el
  marcador.

**Las opciones.** Hay una perilla nueva, `op=<id>`, en el hash de la fusión. Cada pantalla interpreta sus ids y sin
`op` es la de hoy. La serie lleva la receta de color en todas sus opciones.

| Pantalla | Opción | Qué es |
|---|---|---|
| Serie y Swiss | `luz` · **La luz del evento** | la luz del mundo toma la paleta oficial de la competición (sin el oro genérico); el logo del torneo y los de los equipos en el marcador |
| | `transmision` · **La transmisión oficial** | la Tribuna y el draft vestidos como la transmisión de esa competición: el marcador con logos, las placas inferiores, una cortina de entrada "WORLDS 2033 · SWISS · RONDA 5" |
| | `escenario` · **El escenario** | el fondo es la arena del evento (luces de escenario en la paleta del torneo, la pantalla gigante con el campeón, siluetas de público); la interfaz flota adelante |
| Decisión | `escena` · **La escena** | el fondo cuenta la situación: la org que te llama con su logo, la región (Seúl, la LCK) y el arco de tu liga a la de ellos. Al apuntar una opción, la escena cruza a ese camino (el "aura" de las decisiones) |
| | `cliente` · **El momento del cliente** | la decisión bisagra llega como una invitación del cliente del LoL (el logo del equipo, "te invita", el anillo de Aceptar con su reloj) y se abre en el panel; vocabulario hextech solo en la bisagra |
| | `bisagra` · **El peso** | la decisión grande como capítulo: el mundo se oscurece, rótulo de capítulo, lo que arriesgás antes/después y los dos caminos abiertos en la luz, a izquierda y derecha; apuntar uno tira la luz a su lado |
| Mercado | `mesa` · **La mesa de firma** | cada oferta es un contrato: el logo grande de la org, la liga, los términos y la línea de firma con tipografía formal. Enter firma y la firma se dibuja |
| | `anuncio` · **El anuncio** | cada oferta se previsualiza como la placa oficial de fichaje que publicaría la org ("WELCOME Elurah89", con su logo, sus colores y tu main). Elegir la publica |
| | `orgs` · **Te llaman** | los logos de las orgs flotan en la luz alrededor tuyo, con tamaño por sueldo o interés. Apuntar una lleva el mundo a sus colores (el aura de las orgs) y la tabla queda abajo |

**Cómo se construye:**
- **Tres Opus xhigh en paralelo**, en ramas separadas sobre `vitrina/fusion/`:
  - **partido**: el color, la calidad del fondo, la competición y sus 3 opciones;
  - **decisión**: sus 3 opciones;
  - **mercado**: sus 3 opciones y `js/logos.js`, el mapa de logos de equipos.
- **Cada worker toca solo sus archivos.**
  - Los tokens van en su bloque marcado de `tokens.css`.
  - La plomería de `op` ya está en `main.js` (la hizo el supervisor).
- **Después del merge**, el supervisor arma `opciones.html`, una página con pestañas por pantalla y las opciones lado a
  lado, con "como hoy" para comparar. También conecta los logos de equipo al marcador de la serie y del Swiss.

**Resultado (2026-10-09; merges `66c6cc4`, `4c2de5f`, `67764bd`, `94dc50a`).** Tres Opus xhigh en paralelo y un Sonnet
para `opciones.html`. Cero choques de código: solo el README, que se resolvió a mano.

**Partido:**
- `color=receta` (piezas 65/35, fondo 60/40) es la base cuando hay `op`.
- **La causa de la "poca calidad":** el shader entero pintaba a 0,5 y la textura no tenía mipmaps. El "vivo" desplazaba
  cada píxel por su brillo y rompía los bordes.
- **El arreglo:** dos pasadas, con la luz a 0,5 y el arte a resolución completa con mipmaps. El "vivo" bajó de 0,016 a
  0,007. Esto cambia también "como hoy", a propósito.
- **`js/competicion.js`:** paletas tomadas de los logos oficiales (no hay guías de marca públicas con hex) y 22 logos.
- El Swiss quedó **sin** oro en `luz` y `transmision`. El usuario pidió −20%; si lo quiere literal, la perilla es
  `K_PALETA`.

**Decisión:**
- `js/escena.js`: CBLOL y FURIA ↔ la LCK sobre Seúl, con el arco. Apuntar cruza la escena.
- `cliente`: "partida encontrada" con el anillo de 12 s.
- `bisagra`: el capítulo, los dos caminos y las cartas de lo que arriesgás.
- La tabla "campo del evento → elemento de la escena" está en el README.

**Mercado:**
- `js/logos.js`: 45 orgs reales y 12 ligas de `static.lolesports.com`, las 53 URLs con 200. Las 7 orgs inventadas llevan
  monograma.
- `mesa`: el contrato con la firma trazada y el sello FIRMADO.
- `anuncio`: el post de fichaje de la org. Solo LOUD se "publica": es la única prueba que el motor jugó; las otras quedan
  en BORRADOR.
- `orgs`: los logos flotan por sueldo y su aura tiñe el mundo.

**Verificación:**
- **El supervisor:** las 32 combinaciones de pantalla × opción y `opciones.html` (4 pestañas) en el 8095 sin errores ni
  avisos; `verificar.mjs` en verde.
- **Los workers:** contraste con 0 textos debajo de 4,5:1 (2514 + 985 + 876).

**Pendiente:**
- los logos de equipo en el marcador de la serie y del Swiss ya los pone `competicion.js`; queda unificar sus URLs en
  `logos.js`;
- los estilos `.logo`/`.escudo` viven en `mercado.css`;
- sin WebGL no hay paleta ni arena.

### 4.8 La elección por pantalla y la última demostración (2026-10-10, textual)

> bueno en la serie el 1 tiene mucho de las luces de escenario, el 3 esta bueno si se hiciese mas como las pantallas del
> stage, aunque tambien se podria hacer tipo el draft mostrando el champ de los otros jugadores, queda a tu criterio, en
> el swiss, que se sienta mas como pantalla de stream si tenes el chat no?, tipo que este como el broadcast viendolo
> desde un stream, porque esta el chat pero el champ detras, en la decision, el b y el c estan bien pero el b esta medio
> vacio, se podria hacer algo ahi mas original o mejorar el c, el mercado el A y el C estan muy buenos eso de que se
> firme con animacion y cosas asi, se podria hacer una combinacion, y tambien una mini animacion de como que van
> entrando las ofertas en pantalla, me gusto lo del C algo asi, lo que no me copa tanto es el campeon atras, se podria
> hacer algo mas que represente el mercado de pases en vez del campeon random ahi, un equipo, algo no se, se creativo,
> pero que represente mas lo del fichaje, bueno buildea la ultima demostracion y listo

**La última demostración es una versión por pantalla, `op=final`, sin más opciones.**

- **Serie: el escenario (`escenario`), pero con las pantallas del stage en vez de las luces de recital.**
  - Las luces móviles bajan mucho: la opción 1 "tiene mucho de las luces de escenario".
  - Las pantallas LED del escenario muestran la serie como en el estadio: tu pick contra el del rival en grande, los
    quemados de Fearless, el marcador y los logos.
  - **El draft de los 10 no se dibuja.** El usuario lo dejó a criterio, y el motor solo simula tu campeón y el del rival
    por mapa (regla 15: lo dibujado es el motor). Los compañeros aparecen con su nombre si los datos lo traen, sin
    campeón inventado.
- **Swiss: verlo como un stream.**
  - El chat ya está, así que el "video" deja de ser un campeón de fondo. Pasa a ser **la transmisión oficial dentro de
    un reproductor de stream**: el feed es el escenario del torneo con los gráficos de `transmision` (marcador, placas,
    identidad de la competición) y el reproductor lleva EN VIVO, espectadores y controles.
  - El chat queda al costado. La decisión y AFUERA siguen como están.
- **Decisión: B (`cliente`) + C (`bisagra`), y C mejorado.**
  - La bisagra llega como "partida encontrada", con el anillo y Aceptar. Esa invitación deja de estar vacía: atrás se ve
    la escena del que llama (la liga, la región), atenuada.
  - Aceptar abre el capítulo de C. Cada camino muestra **su destino** (el bootcamp: Seúl y la LCK; seguir: tu liga y tu
    club; la cerrada, apagada), con lo que arriesgás.
  - Las decisiones comunes llevan C atenuado.
- **Mercado: A (`mesa`) + C (`orgs`), y sin campeón de fondo.**
  - **La entrada:** las ofertas entran a la pantalla una por una, como los logos de C (una mini animación de llegada).
  - **El contrato:** el de A, con la firma animada y el sello.
  - **El fondo** representa el fichaje, no un campeón:
    - en reposo, el tablero de la ventana de pases con los movimientos reales del mercado ("Mientras tanto");
    - al apuntar una org, el telón de prensa de esa org, con su logo en patrón y sus colores;
    - al firmar, la conferencia (los flashes).
    El worker tiene libertad creativa dentro de "que represente el fichaje".
- **La firma (LOUD)** sigue la misma línea: el telón de LOUD en lugar del campeón.

**Cómo se construye:**
- **Tres Opus xhigh nuevos en paralelo** (partido, decisión, mercado), con el mismo reparto de archivos que en §4.7.
- **Un Sonnet** arma `final.html`: una pantalla grande por pestaña (serie, Swiss, decisión, mercado, firma), con 0 para
  "como hoy".
- Después: revisión de las capturas, merge, servir, y el usuario mira **la última demostración**. Con su visto bueno,
  la fusión + `op=final` es la especificación. Se cierran §5, §8 y §11, y queda la compuerta 2.

**Resultado (2026-10-10; merges `b45543c` página, `fcd297b` mercado, `5a8c891` partido, `c0297b7` decisión).**

- **Serie (`op=final`).**
  - **El escenario:** el estadio del CBLOL arriba. La pantalla LED central muestra el matchup de mid (tu pick contra el
    del rival) con los logos y el marcador. Las laterales, inclinadas, llevan el logo de cada equipo y tu plantel
    (handle y rol, sin campeón).
  - **Fearless y el público:** una faja LED muestra los quemados, y el público va en siluetas.
  - **Luces:** las de recital quedaron al 30% y casi quietas.
  - **El aura** pone el campeón en la pantalla central.
  - **Cada mapa:** su carga y VICTORIA/DERROTA en la LED. Al final, CAMPEONES o "FX GANA LA FINAL".
  - El draft queda delante, compactado.
- **Swiss (`op=final`).**
  - **El reproductor:** la página entera de un stream, con pausa, volumen, EN VIVO, calidad y pantalla completa.
  - **Adentro**, el escenario de Worlds con el marcador, la placa del jugador y el camino R1-R5.
  - **Abajo:** el título del stream, el canal, los espectadores y **los cruces reales de la ronda**
    (`partidoEnCurso.cruces`).
  - El chat va al costado. La parada está arriba del chat.
- **Decisión (`op=final`).**
  - **La invitación es un portal:** atrás, `escena` atenuada (São Paulo con CBLOL y FURIA, Seúl con la LCK), y a través
    del anillo, Seúl nítida.
  - **Aceptar** agranda el anillo y abre el capítulo. Cada camino termina en su destino, encima de su carta de lo que
    arriesgás.
  - **Apuntar** mueve la luz y la cámara. **Elegir** abre el destino y los números ruedan.
  - Las comunes llevan el capítulo atenuado. El plan amateur cae a la versión simple.
- **Mercado (`op=final`).**
  - **La entrada:** las ofertas entran una por una (2,45 s, salteable).
  - **Sin campeón:** en reposo, el tablero de pases con letras que caen y los 6 fichajes reales de "Mientras tanto" más
    2 cupos abiertos.
  - **Al apuntar:** el telón de prensa de la org.
  - **Al firmar:** el trazo, el sello con golpe y la conferencia con flashes (≤ 3/s).
  - **La firma de LOUD:** su telón en vez del campeón.
- **`final.html`:** 7 pestañas con una pantalla grande viva, 0 para "como estaba" y R para repetir.

**Verificación:**
- **El supervisor:** 39 combinaciones de pantalla × opción (sin `op`, §4.7 y `final`) más `final.html`,
  `opciones.html` y `variantes.html`, en el 8095, sin errores ni avisos. `verificar.mjs` en verde. Capturas
  post-merge revisadas.
- **Los workers:** contraste medido, incluidas las capas `aria-hidden`, con 0 textos debajo de 4,5:1 (864 + 399 + 1066
  + 1296 + 1147).
- **Lo que no se probó:** nadie vio el movimiento en vivo, solo tiras cuadro a cuadro.

**Lo que no convence o falta (para la producción):**
- en el celular no hay tablero, telón, caminos ni pantallas laterales;
- solo Seúl tiene sus hitos dibujados;
- el público es una fila pareja;
- sin WebGL, el estadio queda en la luz de la era;
- los colores de las orgs inventadas difieren entre `final` y las opciones de §4.7.

### 4.9 La mini auditoría y "una línea" (2026-10-10, textual)

> quiero que siga un poco la linea bitono del inicio, pero no tanto, osea al inicio seria 100% y despues que la siga un
> poco, pero siento que son como varios estilos distintos en el mismo juego, quiero correcciones, en "la decision" el
> circulito podria ser el famoso coso de aceptar partida algo asi, "la serie" quedo peor que antes en mi opinion, el
> stage se ve muy falso, parece poco avanzado y poco original, ademas de que sea todo negro y dorado lo hace muy aburrido
> y minimalista para ser un simulador de lol, con el swiss pasa algo parecido, un poco muy sobrio y el stream no se logra
> tan bien, "el mercado" esta aceptable, pero creo que se podria hacer un concepto mejor y mas original, "la firma" es muy
> basica y simple no como el disseño avanzado que yo habia pedido, "el titulo" esta bien pero se podria poner la copa,
> hacer que sea mas animacion aunque sea un poco y no tanto transicion simple, pensalo bien, hacelo avanzado y creativo y
> hace un buen plan acorde a lo que yo quiero

**Dos preguntas del supervisor, con las respuestas textuales:**
- *La serie: el motor solo simula tu campeón y el del rival en cada mapa. ¿Cara a cara o draft de 10 (8 decorativos)?*
  → **"Cara a cara"**.
- *Los momentos (firma, título, AFUERA): ¿bitono al 100% como el inicio, o "un poco" como el resto?* → **"los campeones
  con 70% de su color real"**.

**La auditoría** (capturas de las 7 pestañas de `final.html`, seed 61).

La causa de "varios estilos distintos": en §4.7 y §4.8 tres Opus en paralelo inventaron cada uno su escenario, y eso
rompió la regla con la que nació la fusión (§4.5: *"uno solo, porque el requisito central es la coherencia"*). Quedaron
cinco formas de dibujar el mundo:
- **el inicio y el título**: arte fotográfico en bitono con luz volumétrica, que es "la línea";
- **la serie y el Swiss**: un estadio de CSS (rectángulos inclinados y una fila de cabezas iguales);
- **la decisión**: un skyline en silueta SVG con un anillo-medalla dorado;
- **el mercado**: una planilla con un tablero de aeropuerto;
- **la firma**: una placa tipográfica sobre un patrón de logos.

Cada pantalla tiene su paleta, todas son "negro + un acento", y el arte desapareció de cinco de las siete.

Pantalla por pantalla:
- **Decisión.** El anillo se lee como medalla y no como el aviso de partida: no se ve el reloj y no hay un ¡ACEPTAR!
  grande. El capítulo es un tablero denso, con el título repetido.
- **Serie.** El estadio se ve armado con cajas y el público son siluetas idénticas, en marrón y negro. Hay tres
  columnas de números. La versión anterior (el draft con el Sylas grande) era mejor.
- **Swiss.** El video es el mismo estadio, la página es gris y el chat es texto plano.
- **Mercado.** Es una planilla, y el contrato repite los datos de la fila elegida.
- **Firma.** A los 0,9 s queda quieta.
- **Título.** No tiene copa, y después de la entrada no pasa nada.
- **Además:** el odómetro deja ver los dígitos vecinos mientras rueda.

**Las 8 reglas de "una línea"** (amplían las 7 de §4.5; después son guards de producción):

1. **Una imagen héroe por pantalla, siempre "fotográfica"**: arte de Data Dragon, logos reales o la copa en 3D.
   - Prohibido el decorado dibujado como héroe: estadios de CSS, skylines o público en silueta, tableros split-flap.
   - Una silueta solo puede quedar como atmósfera lejana (desenfocada, ≤ 15% de contraste).
2. **El bitono es la gradación de todo el arte**, con la curva del usuario (perilla de color `linea`):

   | Dónde | Color real del campeón | Bitono |
   |---|---|---|
   | Inicio (y la tira de eras) | 0% | 100% |
   | Pantallas de juego: piezas (retratos, libres, cartas, la costura) | 65% | 35% |
   | Pantallas de juego: fondo | 60% | 40% |
   | Momentos (firma, título, AFUERA) | 70% | 30% |

3. **El segundo tono dice dónde estás.** El bitono es noche + un tono, y el tono sale del contexto: la era (inicio,
   decisiones comunes), el destino (la bisagra), la competición (serie, Swiss), la org (mercado, firma) o el oro
   (título).
   - El oro queda solo para la ceremonia.
   - Los negros se tiñen del tono: ningún fondo gris o negro neutro.
4. **La misma luz.** El único decorado es el ambiente WebGL. El público son lightsticks en bokeh, nunca cabezas.
5. **Un hover, el aura, en todos lados**: el campeón, el camino de una decisión o la org.
6. **La costura.** Dos mundos enfrentados (el cara a cara de la serie, el video del Swiss, los dos destinos de la
   bisagra) son una diagonal de luz, con cada mitad en su tono. La dibuja el shader del ambiente, no el DOM: con un
   `duotono()` por CPU quedaría plana, sin la luz del inicio, y sería otra vez "otro estilo".
7. **La ceremonia del LoL, un solo estilo.** El aro de ¡ACEPTAR!, BLOQUEAR/FIRMAR, VICTORIA/DERROTA y el quemado de
   Fearless comparten un estilo de inspiración hextech: filete de oro, un turquesa propio y azul petróleo. Es un patrón
   propio, no assets de Riot.
8. **Los momentos son secuencias de beats, no fundidos.** El orden es apagón → golpe de luz → revelación → asentarse →
   loop vivo.
   - Un solo helper (`beats.js`): un reloj, ≤ 3 destellos/s y Espacio salta al asentarse.
   - Con movimiento reducido o INST se ve el cuadro final.

**Enmiendas que trae** (las decide el supervisor; el usuario las puede revertir):
- **§6.5:** el tope de 2,4 s por takeover sube a ≤ 5 s para la firma y el título, salteables.
- **§4.6:** el contrato "el inicio y los takeovers siempre en duotono" pasa a valer solo para el inicio y las eras. Con
  `linea`, los momentos van al 70% de color.

**Pantalla por pantalla** (perilla nueva `op=linea`; `final`, §4.7 y "sin op" quedan para comparar):

- **Decisión: ¡OFERTA ENCONTRADA!**
  - La bisagra llega como el aviso del cliente sobre la pantalla atenuada: el escudo del que llama en un círculo, el
    aro que se vacía en 12 s como reloj, un ¡ACEPTAR! grande y un "ding".
  - El reloj nunca decide por vos: si llega a cero, entra solo. En INST o con movimiento reducido queda lleno y quieto.
  - Aceptar abre la costura: tu main en dos tonos (CBLOL | LCK), con sus logos y lo que arriesgás. Apuntar una opción
    corre la costura hacia su lado.
- **Serie: el cara a cara.**
  - El marcador de transmisión arriba.
  - La costura en el medio: tu campeón contra el del rival, cada mitad en el tono de su equipo.
  - Abajo, el plan como barras de transmisión, los libres como cartas de carga (el aura) y la tira de quemados.
  - Cada mapa es una secuencia de beats: las cartas de carga, VICTORIA/DERROTA, el pip y el quemado.
  - Se van el estadio, las pantallas laterales y las siluetas.
- **Swiss: el stream de verdad.**
  - El video es la misma transmisión: la costura (tu campeón contra el logo del rival) con la gráfica de Worlds y un
    movimiento de cámara.
  - La página va teñida de Worlds, con la previa como predicción del stream (el número del motor), la racha de hype y
    el clip.
  - El chat está vivo: insignias y emotes propios en SVG, y ráfagas sincronizadas.
  - AFUERA va con beats.
- **Mercado: "tu segunda selección".** A los 15 elegiste campeones; ahora elegís equipo, con el gesto del inicio:
  - las ofertas llegan a una grilla de escudos tipo champ select;
  - apuntar una org vuelve la pantalla su "splash": tu main en su bitono, el logo y los términos grandes;
  - FIRMAR es el BLOQUEAR del inicio: el contrato con la firma y el sello;
  - "Mientras tanto" pasa a ser una cinta de noticias.
- **Firma: el anuncio (walkout).** Unos 4,5 s:
  - el haz, la liga y el rol;
  - el logo de LOUD con su onda de choque, y la pantalla se inunda de su tono;
  - tu main en el bitono de LOUD al 70%;
  - el handle gigante, sobre el que se traza la firma;
  - "LOUD DA LA BIENVENIDA A ELURAH89".
- **Título: levantar la copa.** Unos 5 s:
  - la luz sube a oro y salta el confeti;
  - la copa sube: WebGL2 por raymarching, metal con los reflejos del tono;
  - "CAMPEONES" letra por letra con impacto, y los créditos;
  - se asienta con la copa girando.
  - La Copa del Invocador es de plata; la de cada liga sale de una tabla investigada. Sin WebGL, una copa en SVG.

**Cómo se construye.**
- **Ola 0:** el supervisor deja el andamio (archivos, enlaces, bloques de tokens, subsecciones del README, prefijos de
  clase) y el archivo de hechos con las interfaces fijadas.
- **Ola 1:** dos Opus xhigh en paralelo.
  - **K, el kit:** el color, el tono, la costura en el shader, la ceremonia, la transmisión y `final.html`. Es dueño de
    los archivos compartidos, que quedan congelados para la ola 2.
  - **M, los momentos:** `beats.js`, la copa, el confeti y el título.
- **Ola 2:** tres Opus xhigh en paralelo.
  - **A:** la serie y el Swiss.
  - **B:** la decisión.
  - **C:** el mercado y la firma.
- **Ola 3:** el supervisor arma la hoja de contactos de las 7 (la prueba de "una línea"). Un Opus high nuevo aplica las
  observaciones cruzadas, en ≤ 2 rondas.

**La lección de proceso** (va a `workflows.md`): workers en paralelo por pantalla con libertad creativa producen estilos
divergentes. El remedio es el kit primero, los conceptos fijados por el supervisor y una pasada de unificación.

**Resultado (2026-10-10; merge `f7b2e7d` en `u-integracion`, rama de la ronda `u-linea`).**
- **Ola 1.**
  - **K, el kit:**
    - la política `linea`;
    - el segundo tono, con 43 orgs medidas de sus logos;
    - la costura en el shader, con 3 texturas y partida en vertical en el celular;
    - la ceremonia, la transmisión y 7 sonidos;
    - el odómetro, que ya no deja ver los dígitos vecinos;
    - `linea.html`, y `final.html` con `{ op, antes }` y "Las 7 juntas".
  - **M, los momentos:**
    - `beats.js`;
    - la copa por raymarching (perfil en textura, GGX, 30 fps), con su copa SVG de respaldo;
    - el confeti como función pura del tiempo;
    - el título, en unos 5 s.
    - La tabla de copas salió de una investigación:
      - de plata: Worlds, LEC y LPL;
      - CBLOL: plata con rojo cromado;
      - LCS: dorada, en forma de reloj de arena;
      - el resto, una copa genérica.
- **Ola 2.**
  - **A, la transmisión:**
    - la serie como cara a cara, con 25 números en reposo y cada mapa en 2,4 s de beats;
    - el Swiss como stream, con `costura.marco` para que el video quede adentro del reproductor.
  - **B, la decisión:** ¡OFERTA ENCONTRADA! con el aro de 12 s, el portal y la costura CBLOL | LCK.
  - **C, el mercado y la firma:** "tu segunda selección" (ELEGÍ TU EQUIPO) y el walkout de 4,6 s.
  - Un límite de uso cortó a A y a B, y se retomaron con su contexto.
- **Ola 3, la unificación.**
  - La caída ahora tiene color (`animoConColor`): la saturación de AFUERA pasó de 0,24 a 0,54.
  - `costura.caras`.
  - Siete arreglos del kit:
    - el Enter de `bloquear()`;
    - los pulsos que se superponen;
    - el velo del aviso;
    - `ARO`;
    - las caras sin WebGL;
    - `.escudo` acotado;
    - el ambiente quieto con INST.
  - El contraste de la franja era un error de medición: el glifo da 13,5:1.
- **Verificación.**
  - `verificar.mjs` en verde.
  - 0 errores de consola y 0 `requestfailed` en todas las combinaciones de pantalla y op, más `webgl=0`, INST,
    390×844 y `final.html` en el 8095.
  - Contraste medido por píxeles: ningún texto debajo de 4,5:1.
  - Sin op, `final` y las opciones de §4.7: dentro del ruido.
  - `src/` intacto.
  - La hoja de contactos queda en `vitrina/referencia/linea/hoja-de-contactos.jpg`.
- **Lo que queda.**
  - En 1280×720, las caras de la costura de la decisión quedan chicas.
  - Nadie vio el movimiento en vivo en la GPU de un usuario. La excepción es la costura, que K midió con una RTX 2060.

### 4.10 Las últimas correcciones (2026-10-10, textual)

> Bueno, si te soy sincero, eh, me gustó bastante el resultado y creo que nos estamos acercando a la versión final. Mirá,
> te voy a hacer unas pequeñas correcciones. El inicio está bien, aunque se podría trabajar un poco más la parte donde
> elegís los campeones y eso quizás es muy simple. La decisión está buena. Ahora, cuando te aparece para elegir la liga,
> te aparece dos campeones y eso. Quiero ver otra opción. Esta está buena, así con los dos campeones de distinto color.
> Está buena, pero se podría poner algo tipo la liga, el trofeo, no sé qué. Probar. Para este se podría ver otras
> cosas, aunque los campeones está bueno. O sea, por eso no quiero que descartes esta full. pero que estén dos sylas s
> atrás de distintos colores, eh, no es tan copado, o sea, no, no es tan representativo, pero está bien. Ahora, la
> serie, este está muy bueno, este está muy bueno. Eh, cuando vas al Swiss, está muy bueno. Este te felicito. El del
> stream, aunque si bien siento que el color gris medio azulado del fondo no está tan bueno, pero este del... Del Swiss,
> hasta si encontrás algo para mejorarle me sorprendería. Pero ese está muy bueno, te felicito. El mercado. El mercado
> está bueno. Yo quería un poco más tipo una animación de que como que te van llegando las ofertas. Como que las
> ofertas van cayendo momento por momento. Que representaban una animación. Pero está bueno igual este. Si podés
> encontrar una manera de hacer lo que te digo, te entiendo. Pero igual este está bueno. Eh, solo que lo que no, no te
> digo y te digo que no, para mí no es representativo de elegir un equipo es que esté el campeón atrás no sé qué se
> podría poner atrás a la derecha que represente más que estás fichando con un equipo eh, ¿me explico? tipo los equipos
> que es formal, que es una decisión de fichar que las ofertas van llegando ¿me explico? como esa sensación el título
> está bueno Solo que ahí podrías poner tipo el campeón, la liga y el, y el equipo, una cosa así, pero está bueno. Y
> nada. Las animaciones también, pero a veces. Eh, cosa. Nada, fíjate si encontrás para esas cosas. Si podés encontrar
> algo para mejorarles, me sorprendería. Pero están bastante bien. Serían las últimas correcciones.

**Tres preguntas del supervisor, con las respuestas textuales:**
- *"Las animaciones… a veces": ¿qué pasa?* → *"No, nada, me confundí. Una cosa que me olvidé decirte y me gustaría
  corregir es que como estaba antes, la victoria me gustaría que sea verde. Y sabes que cuando te vas al quinto mapa y
  no se sabe si es victoria o derrota, me gustaría que haya como una animación de que se buildea, así como un
  suspensito, ¿me explico? Como unos segunditos de animación antes de saber eh, si ganaste o perdiste el quinto mapa
  que genera un suspensito."*
- *El mercado: ¿qué va atrás a la derecha en lugar del campeón?* → **"Probá las tres"** (la camiseta con tu nombre, el
  plantel con tu lugar, las ofertas que llegan).
- *El Swiss: ¿hacia dónde va el fondo?* → **"Más oscuro, casi negro"**.

**Lo que se lee:**
- **Va bien:** la serie y el Swiss (*"te felicito"*). La decisión y el mercado *"están buenos"*, el título *"está
  bueno"*, y es la última ronda.
- **Inicio.** La línea queda igual, pero **la elección de campeones es "muy simple"** y hay que trabajarla.
- **Decisión.** La costura con dos Sylas de distinto color *"no es tan representativo"*, pero no se descarta. Hay que
  probar **otras opciones que representen la liga**: *"la liga, el trofeo"*.
- **Serie y Swiss.**
  - **VICTORIA vuelve a ser verde** (como en la fusión); el oro queda para la copa y el ¡ACEPTAR!.
  - **En el mapa decisivo, suspenso**: unos segundos que se van construyendo antes de saber el resultado.
- **Swiss.** La página del stream va **casi negra**; el color, solo en el video y los acentos.
- **Mercado.**
  - **Las ofertas van llegando "momento por momento"**: una animación con tiempo, no un golpe de 2,5 s.
  - **Atrás a la derecha, algo que represente fichar con un equipo**, no el campeón. Se prueban las tres opciones.
- **Título.** Hay que sumar **el campeón, la liga y el equipo**.

**Pantalla por pantalla.** Las variantes van con la perilla nueva `var=` sobre `op=linea`, y `final.html` tiene un
selector de variantes por pestaña.

- **Inicio: la selección de campeones como un champ select.** La luz del inicio y su bitono al 100% no se tocan.
  - Los retratos son más grandes, con el rol filtrado por pestañas y el nombre del campeón apuntado bien grande sobre
    su arte (el aura que ya existe).
  - Las tres ranuras pasan a ser **cartas de carga verticales** (308×560) que se llenan con una animación.
  - BLOQUEAR es el gesto de la ceremonia: una carta que se trava y un destello.
- **Decisión: tres variantes de la costura de la bisagra.**
  - **`campeones`:** la de hoy.
  - **`copas`:** cada lado lleva **la copa 3D de su liga**, con `trofeo.js`: la del CBLOL, de plata y rojo cromado,
    contra la de la LCK. Van en el tono de su destino, con el logo en la placa.
  - **`liga`:** cada lado lleva la identidad de su liga: el logo monumental, la ciudad y una pared con los escudos de
    los equipos reales de esa liga (`logos.js`), en su tono. Tu equipo actual va marcado del lado CBLOL y "el que te
    llama" del lado LCK.
- **Serie y Swiss.**
  - **VICTORIA en verde**, en la ceremonia del kit (`victoriaDerrota`): un verde metálico con el emblema alado.
  - **El suspenso del mapa decisivo** dura ~3 s, se puede saltar y respeta ≤ 3 destellos/s. Arranca cuando el mapa
    puede cerrar la serie empatada: el quinto de un Bo5, o el Bo1 de vida o muerte del Swiss.
    - la costura late y empuja de un lado al otro;
    - la luz titila entre los dos tonos;
    - los lightsticks se encienden;
    - la p del mapa queda a la vista;
    - el pulso se acelera;
    - después, el golpe de VICTORIA o DERROTA.
  - **El stream del Swiss va casi negro**, con el tono de Worlds solo en los acentos y en el video.
- **Mercado: las ofertas llegan con el tiempo, y tres variantes atrás a la derecha.**
  - **La llegada**: un reloj de la ventana de pases que avanza ("día 1", "día 4"…), y cada oferta **cae** a su lugar
    con peso y aviso. Es salteable.
  - **`camiseta`:** la camiseta de la org apuntada, de espaldas, con **ELURAH89** y un número, en sus colores y con su
    escudo. Va dibujada con cuidado: tela, pliegues y luz.
  - **`plantel`:** la formación de la org, los 5 roles, con tu lugar de mid esperándote y el logo grande.
  - **`ofertas`:** las ofertas como **cartas formales** con el membrete y el sello de cada org, que se apilan a medida
    que llegan. Apuntar una la trae al frente.
  - En las tres, sin campeón atrás.
- **Título.** Suma **el campeón** (su nombre y su retrato de carga), **la liga** (el logo grande, no solo en la placa)
  y **el equipo** (el escudo de FURIA grande).

**Cómo se construye.**
- El supervisor deja la perilla `var=` en `main.js`.
- Cuatro Opus xhigh en paralelo, con dueños disjuntos:
  - **I · inicio y título:** `inicio.*`, `cumbre.*`, y además `final.*` para el selector de variantes.
  - **D · decisión:** `decision.*`, `escena.js`.
  - **T · serie y Swiss:** `partido.*`, y `ceremonia.*` para VICTORIA en verde.
  - **E · mercado:** `mercado.*`.
- Después, la hoja de contactos y la revisión del supervisor.

**El resultado (2026-10-10, merge `24d9009` en `u-integracion`, sin push).** Cuatro Opus xhigh en paralelo (I, D, T,
E), con dueños disjuntos y el contrato de `LINEA.md` §11. No hizo falta una pasada de unificación: todos usaron el kit
y la hoja de contactos se lee como una línea.

- **I · el inicio.** Con `op=linea`, la elección de campeones es un champ select:
  - las pestañas de rol con sus glifos;
  - el nombre del campeón apuntado, grande sobre su arte;
  - las tres ranuras como cartas de carga que se llenan, con el fantasma del campeón apuntado;
  - BLOQUEAR con el gesto de la ceremonia.
  Sin `op`, el inicio no cambia (0,00% de píxeles distintos). No hay filtro por otros roles, porque el motor solo deja
  elegir mains de tu rol.
- **I · el título.** En los mismos 5 s suma el logo de la liga, que encabeza el bloque, el golpe del escudo de la org
  campeona y la carta de carga del campeón que cerró la final.
- **I · `final.html`.** Tiene el selector de variantes de la decisión y el mercado (tecla V, `#p=…&v=…`), y la pestaña
  del inicio compara contra sin op.
- **D · la decisión.** `copas` muestra las copas 3D de CBLOL y LCK, cada una en el tono de su competición. `liga`
  muestra el logo, la ciudad y la pared de escudos reales de cada liga. `campeones` queda intacta.
  - Sin campeón detrás en las dos variantes nuevas: `a.arte = null` ya andaba y `ambiente.js` no cambió.
  - `trofeo.js` suma la opción `foco`. `logos.js` suma `equiposDe(liga)`, T1, KT y la tinta oscura de FURIA.
  - Del material de la copa de la LCK no hay fuentes. La tabla la deja en oro, y está anotado en el README.
- **T · la serie y el Swiss.**
  - **VICTORIA** usa el verde metálico de la fusión.
  - **El suspenso del mapa decisivo** dura 3 s:
    - la placa "En juego";
    - el tira y afloje de la costura, que se acelera;
    - la luz que va de un tono al otro;
    - los lightsticks que se encienden;
    - 6 latidos, con ≤ 3 por segundo y 0 destellos WCAG.
    Se dispara en el mapa 5 de un Bo5 a 2-2 y en el Bo1 de vida o muerte del Swiss. La API es `ambiente({ suspenso })`,
    aditiva (`LINEA.md` §4.2).
  - **El stream del Swiss** pasa de `#162133` a `#040a13`.
- **E · el mercado.**
  - **La llegada:** un reloj de la ventana de 14 días en el que cada oferta cae en su día (5,6 s, salteable, usable
    mientras llegan). Los días son deterministas: primero los tiers bajos y el bombazo al final.
  - **Atrás, sin campeón:** `camiseta` (de espaldas, ELURAH89 89, en SVG con pliegues de luz), `plantel` (la formación
    en la Grieta con tu lugar) y `ofertas` (cartas formales con membrete y sello, que se apilan).
  - `var=campeon` deja la derecha de §4.9 para comparar.
- **Lo medido:**
  - el verificador en verde;
  - 0 errores de consola y 0 requestfailed en todas las combinaciones de cada worker, más una pasada del supervisor
    por las pestañas de `final.html` con las variantes, sin op, `op=final` y `webgl=0`;
  - el contraste ≥ 4,5:1 en todo lo nuevo;
  - `src/` intacto.
- **La hoja de contactos** (`vitrina/referencia/linea/hoja-de-contactos.jpg`, la pestaña "Las 7 juntas") muestra las
  7 pantallas y las variantes.
- **Lo que queda:**
  - **El plantel de las orgs que ofertan.** El motor no lo trae, así que los otros 4 lugares dicen "por anunciar". El
    campo que falta es `opcion.plantel: [{ rol, handle }]` (deuda para cuando se escriba el plan de producción).
  - **El celular.** La llegada del mercado pasa casi toda fuera de pantalla.
  - **1280×720.** Las copas y la liga de la bisagra quedan chicas (~110 px), y la pared de escudos se cae.
  - **El sub de VICTORIA.** Baja a 2,3:1 en el 1% de los píxeles sobre arte claro.

---

## 5. La dirección

> **Se fija en la compuerta 1.** Abajo, A completa (la recomendada) y B/C en resumen; si el usuario elige otra o una
> mezcla, esta sección se reescribe con su prototipo y sus tokens, y las ideas importadas se traducen al idioma de la
> ganadora (se importan ideas, no estilos).

### 5.1 A · LUZ — *"Tu carrera, iluminada."*

Una carrera de LoL se vive de noche: el monitor de la pieza, la sala de práctica, el escenario, el estadio del Mundial.
A cuenta esa historia con **luz**. El fondo es un ambiente WebGL de haces volumétricos, bruma y polvo que cambia de
"equipo de luz" con la era; el campeón que importa en cada pantalla está **en el ambiente** (su splash, en duotono de la
era, enmascarado en la luz), no en un recuadro; el contenido se apoya sobre la luz sin cajas; la tipografía hace el
resto.

Palabras: cinemático · nocturno · eléctrico · preciso · cinético. Vocabulario de referencia: la luz de escenario de las
ceremonias de Worlds, la escala tipográfica de las páginas de producto de Apple, los títulos de documentales deportivos.

### 5.2 Color: las eras

| Era | Cuándo (desde `vista`) | Luz principal | Luz de contra | Sensación |
|---|---|---|---|---|
| `pieza` | amateur sin club | `#2F6BFF` (monitor) | `#FFB45A` (velador) | de noche en tu cuarto |
| `academia` | tier 3 o tier 2 | `#43E6C3` (fluorescente frío) | `#E8F6FF` | sala de práctica |
| `escenario` | tier 1 | `#7FA8FF` (estadio) | `#FF3DA8` (rim) | el escenario de la liga |
| `mundial` | en un internacional | `#FFC94D` (oro) | `#FFF3D6` | el estadio del Mundial |
| `leyenda` | final / retirado | `#FF9A5A` (atardecer) | `#FF4F7A` | lo que quedó |

Base: vacío `#04050A`, noche `#0A0D16`; tintas `#F4F6FB` / `#A9B3C7` / `#7C879C`; semánticos `#3DF2A0` (sube) /
`#FF5468` (baja) / `#FFB547` (riesgo). El color de la org vive **solo** en su chip y en las barras del marcador: no
compite con la luz de la era ni con las 11 categorías. Ánimos: `peligro` desatura y baja la luz (pulso ≤ 1 Hz), `gloria`
sube el bloom unos segundos.

### 5.3 Tipografía

- **Mona Sans** variable (ancho 75-125, peso 200-900): títulos de parada condensados peso 800, **≤ 56 px** (regla 2:
  primero lo que se decide); titulares de momento, cierre e inicio 96-140 px; números expandidos peso 900, tabulares.
- **Geist** 16-18 px para el cuerpo; **Geist Mono** 11-13 px, +0,14em, para rótulos y telemetría.
- Presupuesto: la display ≤ 70 KB (si el subset variable no entra, 2-3 instancias estáticas); sale Barlow.

### 5.4 Grilla y composición

12 columnas, márgenes de 96 px a 1440. El contenido a la izquierda (7 columnas) y el acompañante a la derecha (4): se
cumple "Escenario + un panel" sin columna centrada en un vacío. La franja es una banda translúcida de 56 px; abajo, la
trayectoria mínima de 28 px (de 15 años al presente). En el celular, una columna y el acompañante en su hoja.

### 5.5 Profundidad y textura

Tres capas siempre: ambiente (canvas) → arte (splash en duotono, enmascarado) → contenido. Las placas para legibilidad
son translúcidas **sin `backdrop-filter`** sobre el canvas (costo de GPU). Polvo y brasas como únicas partículas.

### 5.6 Iconografía

Un set propio en SVG (`components/iconos.js`): los 5 roles (ya existen), los ejes de la previa (mecánica, macro,
mentalidad, estudios, sueño, confianza familiar, LP…), el riesgo, la rareza, los escudos de rango (Hierro → Challenger,
propios, no los de Riot).

### 5.7 Movimiento

Entradas expo-out 180-320 ms, salidas 160 ms; orden de entrada: luz → rótulo → título (máscara por línea) → cuerpo →
opciones (escalonadas 50 ms) → panel. Resortes con `linear()` en los números y la carta. Takeovers ≤ 2,4 s. Como mucho
2 stingers. Todo con camino quieto en CSS **y** JS, también para `::view-transition-*`.

### 5.8 Sonido

Sintetizado (WebAudio, sin archivos): el clic de siempre, un stinger, la multitud (ruido filtrado), el acorde de título
(`arpegioTitulo`, escrito en T3 y nunca usado). Apagado por defecto, con invitación en el inicio ("mejor con sonido").

### 5.9 La lista de prohibidos (guard)

Falla el build si aparece: `--clip-corte` (el chaflán), ticks/escuadras (`--tick*`, `escuadra`), `--scanline`, la grilla
de fondo con `linear-gradient` repetido, la familia Barlow, el cyan `#2ee8ff` como color principal, más de 2 niveles de
contenedor visible (lo mide el recorrido), y la columna centrada en un vacío (la regla f2 nueva).

### 5.10 Las otras dos (resumen; ver el apéndice A)

- **B · NOCTURNO** — *"Tu carrera, impresa de noche."* Fondo negro, una tinta ácida (`#C8FF2E`), Archivo variable + IBM
  Plex Mono, grilla editorial con filetes y folios, splash en halftone por shader; papel solo en las tapas (la del año
  con la seed como código de barras, el "¡EXTRA!", la edición de colección); la cita destacada como beat decisivo.
- **C · PANTALLAS** — *"Todo pasa en tus pantallas."* El escritorio de tu PC a los 15, la estación del equipo de pro y el
  stream del Mundial; los aparatos envejecen con el calendario (2026 → 2040s). Ventana enfocada = escenario, widget =
  acompañante, dock = cuartos, teléfono = celular. Tres firmas: el escritorio amateur, la bandeja de contratos que se
  firman con Enter, el stream con el chat cayendo.

---

## 6. Sistemas firma

### 6.1 El ambiente

WebGL2 a media resolución con un fallback CSS de la **misma API**: `ambiente({ era, animo, arte })`, `pulso(tipo)`,
`congelar(t)`, `pausar()`, `reanudar()`. Lee los colores de los tokens (§9.5). Lo alimentan solo la `vista` (vía
`ui/core/era.js`) y los ganchos de los momentos: **nunca el `store`** (regla 4). Se aquieta en ≤ 1 s cuando aparece una
parada (enmienda de la regla 1, §2). Presupuesto: escala ≤ 0,5, ≤ 2 texturas, 30 fps, render a demanda, en pausa con
minijuego, cuarto abierto o pestaña oculta, maneja la pérdida de contexto y se degrada solo.

### 6.2 El arte

Un solo cargador CORS de Data Dragon (verificado el 2026-10-09: splash 1215×717, carga 308×560, centrada, tiles e íconos
responden `Access-Control-Allow-Origin: *`) para `<img>`, textura WebGL y el PNG. Sin `url()` de CSS para el arte (un
cacheo mixto contamina el canvas del PNG); nunca aborta una carga (el recorrido cuenta `requestfailed` como error); sin
red, se degrada a nada y el tile cae a las iniciales (ya existe). Qué arte va en cada pantalla: tu main en la pieza y la
academia; tu campeón del mapa en la serie; el rival en el cruce; el arte de carga en la carta.

### 6.3 Las transiciones

View Transitions (Baseline desde octubre de 2025: Chrome/Edge, Safari 18, Firefox 144) **solo** en tres lugares:
elegir → resultado, → partido y → final. El resto entra con la coreografía de CSS. El envoltorio está en §9.4.

### 6.4 El número que rueda

Odómetro por dígito con su delta (▲3), montado sobre `moverNumero` (`ui/core/delta.js`) y `countUp`. En INST o con
movimiento reducido aparece en su valor final.

### 6.5 Los momentos

Un solo componente de takeover con **3 variantes** —la firma, el título, el Mundial (Golden Road es su estado dorado)—,
banners para lo mediano y ceremonias cortas para lo chico. Topes: ≤ 1 takeover por página, ≤ 8 por carrera, ≤ 2,4 s cada
uno; Espacio los saltea; un cuarto abierto los pausa; 0 s en INST o con movimiento reducido. `momentosVistos` va en el
marcador `lolcs-vista` para que retomar no los repita.

| Momento | Peso | Señal (sin tocar el motor) |
|---|---|---|
| Primer contrato (pieza → academia) | takeover "firma" | `phase` amateur→`profesional` + log `amateur` "Firmaste con X" |
| Título de liga | takeover "título" | log `serie` con `postSerie`, `ronda:'final'`, `gano` |
| Campeón del Mundo / Golden Road | takeover "Mundial" (dorado) | log `internacional` `{resultado:'campeon'}` / `seguimientoGoldenRoad().completo` al cierre del año |
| Retiro | transición lenta a la final | `phase:'retirado'` + `finAnticipado` |
| Debut tier 1 · ascenso/descenso · clasificar · Top 20 · bombazo/traspaso | banner | `splitAscensoTier1`, log `competitivo`, log `internacional`, log `top_mundial`, oferta `bombazo`/log de traspaso |
| Ascenso de rango (Diamante → Challenger) | ceremonia corta | `player.ranked.tier` entre `fotoInicio` y la `vista` |
| Lesión grave · burnout · servicio militar | ánimo `peligro` + banner sobrio | `lesion_grave`, `burnout_pro`, log `servicioMilitar` |
| Cierre de año | la tarjeta de cierre | log `edad` `{nota, banda, tipo, bajada, vinetas}` |
| VICTORIA / DERROTA por mapa | cartel | `serie.mapas[]` (`campeon`, `rivalJuega`, `resultado`, `cierre`) |

Frecuencias con `criterio` (para calibrar cuánto se ve cada uno): 71% llega a tier 1, 52% gana un título, 37% entra al
Top 20, 10% gana el Mundial, 2,6% hace el Golden Road. No existe MVP, KDA, oro, torres ni duración: no se dibujan.

### 6.6 La carta

La tarjeta final como objeto: inclinación con el puntero, brillo y foil; **no se da vuelta** (recorte). La rareza sale
del escalón del puntaje (`escalonDeCarrera`); el Golden Road es una variante. La cara se dibuja **una vez en un canvas**
y ese canvas es el PNG: lo que se ve es lo que se baja (reemplaza el dibujo aparte de `exportar.js`).

### 6.7 La trayectoria

No es un sistema nuevo: es la trayectoria de V5 (`ui/core/trayectoria.js`, `cuartos/carrera.js`: cinta de clubes, curva
fina de nivel, notas por año, hitos, archirrival) re-dibujada con el sistema nuevo; aparece en la final y de fondo en el
PNG. Regla 15: lo dibujado es el registro.

### 6.8 La intro

~3 s la primera vez (brillo de monitor → "15 años. Una pieza." → la luz → el título), salteable con cualquier tecla o
clic; después, solo con "ver intro".

### 6.9 Gestos nativos de LoL (patrones, no assets de Riot)

"Aceptar" con anillo para las paradas de una sola opción y el "¡Vamos!" de los minijuegos; la selección de campeones con
"BLOQUEAR"; VICTORIA/DERROTA por mapa; la ceremonia de ascenso de rango con escudo propio; la región como selector de
servidor.

---

## 7. Leer menos, sin perder nada

El motor da casi todo estructurado: `previa[]` con `signo`, `magnitud` (`baja|media|alta`) y `texto` ("Mecánica ~+4");
`riesgo`/`riesgoTexto`; `rareza`; `plan.texto`; la p de cada plan y mapa a mapa (`components/decision.js:190-248`). La UI
lo **dibuja** en vez de escribirlo.

1. **La opción es su label + glifos.** Ícono del eje + ▲/▲▲/▲▲▲ o ▼ (la magnitud por cantidad de flechas, no por
   opacidad: cierra D99a); el riesgo como ícono + nombre corto; el % como medidor con su número (regla 13); el plan de
   Fearless como 5 barritas + el % de la serie grande.
2. **La prosa, de a una.** En escritorio, la descripción aparece en **un** inspector cuando apuntás una opción (hover,
   flechas, Tab); 1-4 sigue eligiendo directo. En el celular, una línea + "más". Nunca tres descripciones a la vez.
3. **El planteo en una línea**: la primera oración de la descripción de la parada; el resto, a un toque.
4. **Las paradas de plan** (plan amateur, plan del año, plan de Fearless) **como matriz**: opciones en filas, ejes en
   columnas, barras y flechas alineadas. Se compara de un vistazo.
5. **Nada se pierde.** Todo texto del motor sigue en el DOM a ≤ 1 interacción, con `aria-describedby`; un ajuste
   "Textos: breves | completos" en la franja. **El texto del motor no se reescribe** y **nunca se parsea prosa**: los %
   que solo viven dentro de una descripción armada (p. ej. `systems/amateur.js:1061`, "66% de que salga bien…") quedan
   en el inspector.
6. **El inventario** de la vitrina (`vitrina/datos/INVENTARIO.md`) dice cuántas paradas traen datos estructurados y
   cuántas solo prosa. Si las solo-prosa pesan, se propone una subfase aditiva chica (**U-m**: campos estructurados
   junto a la prosa, sin `rng`, huella idéntica, como fue GR-m) para aprobar aparte. **Medido (2026-10-09)**: el 76% de
   las opciones de la carrera héroe ya trae datos estructurados y solo el **3%** tiene un % que vive únicamente en la
   prosa (`amateur:negociacion` 50%, `amateur:oferta` 48%, `retiro:retiro_vuelta` 35%). No pesan: **U-m no hace falta**
   por ahora (queda como deuda chica si C2 la pide).
7. **Meta**: −50% de palabras visibles por parada en escritorio con "breves", contra la línea de base de hoy (U1a).

---

## 8. Pantalla por pantalla

> Escrito para A; la ronda 2 y la compuerta 1 lo ajustan. Cada pantalla nombra su estrella del norte (captura de la
> vitrina) y lo que tiene que estar sí o sí.

- **Inicio.** La intro (§6.8); el título que impone; la selección de campeones: cinco glifos de rol grandes, la grilla de
  retratos del rol, el splash del campeón apuntado como ambiente, tres ranuras que se llenan con transición y "BLOQUEAR"
  que se enciende con tres mains. Nombre de invocador, región como selector de servidor, perfil en una línea. Continuar
  como placa con el arte de tu main; el desafío del día y el historial, chicos y abajo. *Sí o sí*: el arte vivo detrás
  de la selección, el "BLOQUEAR", el ambiente de la era `pieza`.
- **Relato (la página del split).** Cada beat entra con su ícono por `log.type` (cierra de paso D41) y su peso; los
  técnicos, en una tira tenue; los que ya tienen tarjeta propia (resultado de fecha, serie, ranking, año, Mundial,
  parche) se re-dibujan como gráficos del sistema. *Sí o sí*: `data-era` quieto mientras cuenta (regla 4).
- **Cierre de split y de año.** El resultado grande ("3.º DE 10"), el número que se movió rodando, la banda; en el año,
  la nota (0-10) grande, el titular, las 6 viñetas como íconos, el escalón ("Vas por Campeón · para Figura mundial te
  falta…") y el Golden Road vivo como 5 marcas. D98 (la espera de 2,4 s) se calibra en U4 con lo que diga el usuario.
- **Decisión.** Rótulo de categoría, título ≤ 56 px, primera oración, las opciones como franjas anchas con glifos y
  medidor, el inspector; la elegida se transforma en su resultado (View Transition) y los números ruedan. *Sí o sí*: §7.
- **Plan amateur y plan del año.** La matriz de §7.4.
- **Partido.** Fecha marcada: el cruce como gráfico (tu org vs la rival, la p grande, el porqué de la fecha). Plan de
  Fearless: la **pared de retratos de carga** del pool (308×560) que se apagan al quemarse, las cartas de plan con sus 5
  barritas y el % de la serie. Mapa decisivo: la previa del clutch y el "Aceptar". Swiss 2-2: **entrada a pantalla
  completa de "vida o muerte"** con el récord en 5 marcas, la p y el "Aceptar". Bracket como cinta. Cada mapa con su
  cartel VICTORIA/DERROTA y los dos campeones del cruce.
- **Mercado.** Las ofertas como contratos lado a lado (org, sueldo grande rodando, años, liga, jerarquía desde → hasta,
  la etiqueta Bombazo/Ascenso/…); comparar resalta lo mejor de cada una; firmar es el momento "firma" (la firma se
  dibuja). El mercado del mundo, en el acompañante.
- **Minijuegos.** Las 10 mecánicas no se tocan; cambian el contenedor (la previa con la apuesta en una placa, el
  "¡Vamos!" como "Aceptar") y el jugo (destello, sacudón ≤ 4 px, chispas), desde `fx/jugo.js` (el check de conteo de
  `components/minijuegos/` no admite archivos extra).
- **Prueba y prensa.** Como los minijuegos, con su rótulo propio.
- **Retiro y vuelta.** La luz baja hacia `leyenda`; la decisión con el mismo sistema.
- **Final.** La luz `leyenda`; la carta (§6.6) a la izquierda; el veredicto, los totales en números grandes y la
  trayectoria (§6.7); compartir (copiar imagen, bajar, copiar link, nueva carrera).
- **Franja.** Banda translúcida de 56 px: handle · glifo de rol · chip de org · edad · año · ventana · el número con su
  banda y su delta (odómetro); velocidad, sonido, textos breves/completos, `?`; las pestañas de cuartos.
- **Acompañante.** Una placa translúcida a la derecha con el contexto de la pieza (`acompananteDe`, sin cambios de
  lógica): rango y barras, tabla, bracket y Fearless, previa, mercado del mundo, escalón y Golden Road.
- **Cuartos.** El `<dialog>` de siempre con el sistema nuevo: Vos (la ficha con el radar de 6 atributos de
  `graficos/hexa.js`, hoy sin usar), Temporada (tabla y fixture), Equipo, Mundo, Carrera (la trayectoria), Crónica.
- **Celular.** El mismo sistema en una columna; el ambiente a menor resolución o el fallback CSS; los takeovers
  adaptados; el acompañante en su hoja.

---

## 9. Arquitectura

### 9.1 Lo que se queda

El motor entero. En la UI: `app.js`, el director (`ui/escena.js` + `ui/core/escena.js`), los dos stores (`store` y
`vista`), `reproductor.js`, `teclado.js`, las familias por dueño (`paradas/*`), el guardado y el marcador `lolcs-vista`
(que suma `momentosVistos`). Los ids que lee el recorrido se conservan o se actualizan en el mismo commit.

### 9.2 Lo nuevo

- **`src/ui/fx/`** — una raíz aparte (como `teclado.js`), montada después de idle, un solo canvas, cada efecto envuelto
  para que un fallo degrade a nada y nunca frene el juego; sin DOM al importar:
  `ambiente.js` (WebGL2 + fallback), `arte.js` (el cargador CORS), `transicion.js` (§9.4), `movimiento.js` (revelar,
  escalonar, odómetro, resortes), `momento.js` (el takeover), `azar.js` (`mulberry32(hash(seed + ':fx'))`, el PRNG
  decorativo), `jugo.js` (el de los minijuegos).
- **Puros, corren en Node**: `ui/core/era.js` (era y ánimo desde la `vista`; **reemplaza a `aplicarEstudio`**,
  `shell.js:37`, para que haya un solo escritor de la luz) y `ui/core/momentos.js` (qué momento trae un beat, por su
  clave y las diferencias del registro).
- **El gancho del reproductor**: `reproductor.js` se importa en Node; recibe un `alBeat` inyectado por `app.js` y nunca
  importa `fx/`. Las esperas de los momentos van por su `dormir` (Espacio saltea, un cuarto abierto pausa).

### 9.3 Cómo se trasladan los prototipos

Se copian **textuales** los tokens, el movimiento y los efectos de la ganadora (con un check temporal que compara el
`tokens.css` del juego contra el de la vitrina hasta U4); los renderers de las familias se reescriben sobre el sistema
(no se pega HTML del prototipo).

### 9.4 El envoltorio de View Transitions

`revelar` (`ui/escena.js:48`) es síncrono y `app.js` depende de eso (`:442→456` pinta beats enseguida; `:678-679` fuerza
un reflow para la entrada). `startViewTransition` difiere el cambio un cuadro, su overlay se traga los clics, una
segunda llamada rechaza `ready` con AbortError (ensucia la consola del recorrido en INST) y un nombre de transición
duplicado la aborta. Por eso el envoltorio:

- es **síncrono** (como hoy) en INST, sin espera, sin soporte, en la misma pieza o al retomar;
- junta llamadas seguidas y atrapa las tres promesas (`ready`, `updateCallbackDone`, `finished`);
- usa nombres únicos, `pointer-events: none` en el overlay, el canvas con nombre propio y `animation: none` (para que el
  ambiente no se congele), y movimiento reducido también en `::view-transition-*` (la regla `*` de `base.css` no los
  alcanza);
- enfoca el encabezado en `updateCallbackDone`.

### 9.5 Colores al shader y guards

Los colores del shader salen de los tokens con `leerToken` (`exportar.js:25`), normalizados por un canvas de 1×1.
`guards.js` se extiende: atrapa `oklch|oklab|lab|lch|color(|color-mix(` en las hojas y tripletes de color en GLSL; las
tintas y placas siguen en `#rrggbb` (los parsers de contraste no leen oklch). Guard nuevo: `rngUi` aparece solo en
`components/minijuegos/`, `paradas/minijuego.js` y `app.js` (un uso decorativo correría los minijuegos humanos sin que
ningún bot lo note). Guard nuevo: la lista de prohibidos (§5.9).

### 9.6 Contraste sobre arte

`contraste.mjs` compone solo los `background-color` de los ancestros: un canvas detrás del texto pasa en falso. Dos
checks nuevos: (1) **la regla de la placa**, estática: toda tinta × toda placa ≥ 4,5:1, con la placa compuesta sobre
blanco; (2) **píxeles** para la tipografía grande sobre arte: se oculta el texto, se captura, se decodifica en la página
y se exige ≥ 3:1 contra el p90 de luminancia bajo cada caja. Anillo de foco doble (claro y oscuro).

### 9.7 Presupuestos

`index.html` (196/200 líneas) suma un solo `<link>` (`fx.css`) y recorta comentarios. Fuentes: sale Barlow; Mona Sans
(95 KB el subset variable, medido) entra si se compensa o va en instancias; Geist 28 KB y Geist Mono 22 KB (medidos).
`dist/` (2617/2700 KB): si se pasa, el techo sube con su número en su propio commit (regla 2).

---

## 10. Restricciones duras

- **El motor no cambia**: `HUELLA_JUEGO` 79304237 idéntica y `VERSION` del guardado 15 en cada subfase. (Única excepción
  posible: U-m, §7.6, aditiva y con aprobación aparte.)
- **Guards actuales** (`src/dev/guards.js`): cero `Math.random(` en `src/**/*.js` (aun en comentarios); color literal
  solo en `tokens.css` (en JS de `src/ui`, hex prohibido aun en comentarios, `rgb()/hsl()` solo en template literal);
  todo `var(--x)` sin fallback definido en `tokens.css`; `index.html` ≤ 200 líneas y su script inline sin
  `function`/`const`; `shell.css` con el selector literal de las 7 piezas; 42 módulos de UI importados en Node; el
  contrato de `graficos/*.js`; `components/minijuegos/` sin archivos extra; los checks de texto literal en
  `paradas/minijuego.js`, `ficha.js`, `decision.js`, `inicio.js`, `app.js`, `reproductor.js`; los de Data Dragon
  (iniciales, `<img>` que se saca en error, dos capas de splash).
- **El contraste de `validate.js`** (243-301) y `TONOS_CONOCIDOS` (8873) leen tokens por nombre en `#rrggbb`: los tokens
  nuevos conservan esos nombres (cambian los valores) o el check se actualiza en el mismo commit con los mismos umbrales.
- **Una sola pieza visible en el DOM** (`checkVisibility()` ignora opacidad).
- **Espejos de tiempo** de `simulate.js` (700 / 1600 / 2400 ms; check "K0 espejos"): toda espera nueva actualiza el
  espejo en el mismo commit.
- **Reglas de proceso** 13 (todo número con referente), 15 (lo dibujado es el motor), 16 (el azar grande se declara).
- Teclado (1-4, Espacio, letras de cuartos, Esc), retomar a mitad de parada, `prefers-reduced-motion`, ≤ 3 destellos por
  segundo, sonido apagado por defecto.
- **Workers**: solo `validate.js --rapido` y `--solo=`; nunca la validación completa; matan solo su PID; no tocan el
  puerto 8090 ni el 8095; el supervisor re-corre sus números sobre una copia exacta.

---

## 11. Subfases y olas

Cuatro olas, ≤ 3 workers por ola, ramas desde `u-integracion`, un worktree por subfase, un revisor Sonnet con
navegador por ola (tope ~30-40 tool calls) y el supervisor comparando capturas contra la estrella del norte en los
mismos guardados.

| Ola | Subfase | Entrega | Dueño de | Worker |
|---|---|---|---|---|
| 1 | **U1 · cimientos** | Tokens nuevos y fuentes copiados de la ganadora; shell sin columna centrada (franja, escenario, acompañante) conservando los ids; `fx/` entero; `ui/core/era.js` reemplazando `aplicarEstudio`; el envoltorio de transiciones dentro de `revelar`; la lista de prohibidos y los guards nuevos (§9.5); el check temporal de tokens | `tokens.css`, `base.css`, `shell.css`, `primitivos.css`, `index.html`, `ui/escena.js`, `shell.js`, `fx/**`, `ui/core/era.js`, `guards.js` | Opus xhigh |
| 1 | **U1a · andamio** | La regla f2 reescrita desde la estrella del norte; el modo de captura con movimiento y reloj congelado; pasadas con swiftshader y sin WebGL; las métricas nuevas (palabras visibles, anidamiento, transiciones corridas, vacío plano, cobertura de arte, relación título/cuerpo, histograma de tono); la inyección de los guardados de la vitrina y las composiciones lado a lado; los checks de placas y de píxeles; la línea de base medida sobre la UI de hoy | `src/dev/recorrido.mjs`, `src/dev/contraste.mjs`, `src/dev/estrella.mjs` (nuevo) | Sonnet high |
| — | **C1** | El usuario prueba la luz, la tipografía, el ritmo y el rendimiento en su máquina; se sigue sin esperar | — | supervisor |
| 2 | **U2a · inicio y decisión** | Inicio (intro, selección de campeones), relato y cierre, decisión genérica, plan amateur y plan del año como matriz, leer menos completo | `screens/inicio.js`, `paradas/decision.js`, `components/{decision,feed,cierre}.js` y sus hojas | Opus xhigh |
| 2 | **U2b · partido y mercado** | Fecha marcada, plan de Fearless con la pared de retratos, decisivo, Swiss 2-2, bracket, VICTORIA/DERROTA; mercado con la firma | `paradas/{partido,mercado}.js`, `components/{serie,previaPartido,mundial,mercado}.js` y sus hojas | Opus xhigh |
| 2 | **U2c · franja, cuartos, minijuegos** | Franja, acompañante, los 6 cuartos y la ayuda; el contenedor de minijuegos, prueba y prensa con su jugo | `franja.js`, `acompanante.js`, `cuartos*`, `components/ficha.js`, `paneles/*`, `paradas/minijuego.js`, hojas propias | Sonnet xhigh |
| 3 | **U3a · momentos** | `ui/core/momentos.js`, `fx/momento.js` con las 3 variantes, banners y ceremonias; el gancho `alBeat`; sonido; `momentosVistos`; espejo de `simulate.js` y "K0 espejos" | `ui/core/momentos.js`, `fx/momento.js`, `reproductor.js` (gancho), `sonido.js`, `simulate.js` (espejo) | Opus xhigh |
| 3 | **U3b · la carta** | La carta (canvas único = PNG), la final, la trayectoria re-dibujada, `exportar.js` | `screens/tarjeta.js`, `exportar.js`, `cuartos/carrera.js`, `ui/core/trayectoria.js`, `graficos/*` | Opus xhigh |
| — | **C2** | El usuario juega una carrera completa; lo que encuentre abre una ronda corta | — | supervisor |
| 4 | **U4 · pulido y cierre** | D98 (la espera del cierre de año), D99 (contraste), lo nuevo del contraste, el celular, el rendimiento, el CSS muerto, `DISENO.md` §4.5-4.6 y `CONCEPTO.md`; el cierre: `--rapido`, `simulate.js 1000`, determinismo, build, recorrido con 3 seeds × 2 tamaños, merge en `fase-9r`, `PROGRESO.md`; push solo con OK nuevo | lo que quede | Sonnet high + supervisor |

**Ajuste de la ola 1 (2026-10-10, después de la compuerta 2).** La especificación pasó de A a la fusión con `op=linea`,
que trae un kit entero (`vitrina/fusion/js/`: ambiente con costura y suspenso, tono, color, fondo, aura, ceremonia,
transmisión, beats, trofeo, confeti, logos). Portarlo junto con el shell es demasiado para un solo worker, así que U1 se parte:
- **U1 · cimientos** (Opus xhigh): lo de la tabla, menos `fx/` (solo `fx/transicion.js`, pegado a `revelar`). Copia el
  `tokens.css` de la fusión **entero**, también los tokens del kit, para que U1k use los mismos nombres.
- **U1k · el kit** (Opus xhigh): `src/ui/fx/**` (salvo `transicion.js`), `estilos/fx.css` y lo aditivo de `sonido.js`.
  Solo la política `linea` y las variantes elegidas; las ops de comparación de la vitrina no se portan.
- **U1a · andamio** (Sonnet high, liviano según la compuerta 2): la regla f2 y las capturas lado a lado.
- La interfaz entre U1 y U1k es `src/ui/fx/index.js` (`montarFx(contenedor) -> api`), que fijó el supervisor (`4e3ff8a`).

**Ola 1 cerrada (2026-10-10).** Merges de `u1-cimientos`, `u1k-kit` y `u1a-andamio` en `u-integracion`. Build en 3061 KB
contra un techo de 3150, huella intacta. **C1 se corre después de la ola 2**: con solo los cimientos, las familias todavía
tienen el layout viejo, y lo que se vería es "la UI vieja con otras fuentes", que no sirve para juzgar la luz ni el ritmo.
**Ajuste de la ola 2:**
- **U2b** se queda con el flujo entero del mercado de la compuerta 2: las ofertas, la firma sobre el contrato, la caída
  sobre el mapa y la pantalla "la firma" con la camiseta y la elección del número. El número se guarda con un agregado
  en `almacenamiento.js`, al final.
- **U3a** reusa esa pantalla de firma para el takeover del primer contrato.

**Tamaño**: 7 workers en 4 olas (FASE V fueron 12 subfases en ~2 días); estimado ~1,5-2 días de agentes y ~3-4M tokens.

**El contrato de las familias** se actualiza en la cabecera de `ui/escena.js` en U1: además de lo de V (`mostrar`,
`acompanante`, `data-atajo`, `data-foco`, su hoja, no editar los archivos compartidos), cada familia usa los tokens y
`fx/` (nunca efectos propios), respeta ≤ 2 niveles de contenedor, títulos ≤ 56 px, "leer menos", y entrega sus capturas
contra la estrella del norte.

---

## 12. Verificación

**Cada subfase**: `validate.js --rapido`; `huella.js` contra la base (`HUELLA_JUEGO` idéntica); `build.js` (guards,
techo y huella de `src/` contra `dist/`); el recorrido con las seeds 25, 39 y 152 a 390×844, 1024×768 y 1440×900, más
los guardados de la vitrina (estrella del norte). El revisor de la ola mira las composiciones lado a lado y pasa la
rúbrica (§3.3).

**Las métricas nuevas** (U1a las construye y mide la línea de base sobre la UI de hoy):

| Métrica | Cómo | Meta |
|---|---|---|
| Vacío plano | % de píxeles casi uniformes y oscuros en la captura | ±15% de la estrella del norte |
| Cobertura de arte/efectos | diferencia de píxeles con y sin las capas de ambiente y arte | ±15% |
| Relación título/cuerpo | tamaño computado del mayor texto visible ÷ el cuerpo | ±15%, y ≥ 3 en los momentos y cierres |
| Histograma de tono | histograma de matiz de la captura | ±15% (distancia) |
| Anidamiento | ancestros con borde o fondo visible entre el viewport y el texto de una opción | ≤ 2 |
| Palabras visibles | conteo en el viewport, con "breves" | −50% contra la línea de base |
| Transiciones | cambios de pieza que pasaron por el envoltorio o la coreografía | 100% (salvo INST/reducido), 180-320 ms |
| Eras | cambios de `data-era` en una carrera completa de `criterio` | ≥ 4; quieto durante el relato |
| Cuadro | p95 con navegador visible en la máquina del usuario (`?fps=1`) | ≤ 20 ms |

**Robustez**: una corrida INST sin errores de consola; martillar "1" produce exactamente un `responder`; retomar en cada
tipo de parada no repite un momento.

**Accesibilidad**: contraste de placas y de píxeles en verde; una carrera solo con teclado; una con movimiento reducido.

**El cierre** (U4): la Definición de terminado de `CLAUDE.md` entera, y el usuario juega antes del merge (C2).

---

## 13. Riesgos

| Riesgo | Mitigación |
|---|---|
| A termina pareciéndose a lo de hoy (mismo concepto, mismo nombre de pieza) | brief de luz, arte y tipografía; la lista de prohibidos como guard; tokens textuales de la ganadora; composiciones en los mismos guardados; la regla f2 reescrita primero; la reacción en frío del usuario |
| Texto ilegible sobre arte con los checks en verde | la regla de la placa + el check de píxeles + revisión de capturas |
| View Transitions rompe teclado, retomar o el recorrido | el envoltorio de §9.4, transiciones solo en 3 lugares, corrida INST y prueba de martilleo |
| Costo de GPU y batería | presupuestos, quieto en las paradas, degradación automática, dos pasadas del recorrido |
| El ambiente o la era adelantan el resultado (leen `store`) | `era.js` puro sobre la `vista` y el check de `data-era` quieto en el relato |
| Atajos del prototipo que se cuelan a producción | guards sobre la vitrina, la API fija del ambiente, renderers reescritos |
| Los takeovers alargan la partida o se repiten al retomar | topes, salto, `momentosVistos`, espejo de `simulate.js` |
| Presupuestos (fuentes, 4 líneas de `index.html`, checks de texto literal) | presupuesto de fuentes, un solo `<link>`, las regex actualizadas en el mismo commit |
| El usuario elige una mezcla | se traduce al idioma de la ganadora en la ronda 2 |
| Data Dragon caído o sin red | el arte se degrada a nada; tiles con iniciales; PNG sin splash |

---

## 14. Fuera de alcance

Cambios de comportamiento o de balance del motor (salvo U-m, si se aprueba) · contenido nuevo o reescribir el texto de
los eventos · las mecánicas internas de los 10 minijuegos · los colores reales de las orgs y sus escudos (licencias) ·
física de página y dar vuelta la carta · layouts de celular a medida (el celular es el mismo sistema) · tablas de
almanaque en el escenario · dependencias, frameworks, bundler · el host (P.6, §15).

---

## 15. Después: publicar

Con el OK del usuario (es hacia afuera): P.6 (el host: Cloudflare Pages o Netlify, conectar la cuenta es del usuario) y
P.8 (verificar en la URL publicada). Para el portfolio: el README con un GIF de 20-30 s (la intro, una decisión, un
título, la carta), un og-image nuevo sacado de la carta, y una sección "cómo está hecho" (motor determinista, cero
dependencias, WebGL a mano). Idea anotada, no planificada: un **modo tráiler** ("mirá una carrera en 90 segundos") para
el visitante que no va a jugar 30 minutos.

---

## Deuda nueva (D102 en adelante)

Son del **motor**. Van a la etapa "arreglar el juego" que pidió el usuario (§0.4). Esta UI no las toca.

| # | Qué | Estado |
|---|---|---|
| D103 | **Las fechas de temporada no tienen pick por partido:** todas se juegan con el campeón del split (`systems/temporada.js:286-291`), sin Fearless ni variedad. El usuario lo nota como "el mismo campeón en todas las partidas" (§0.4) | ⬜ |
| D104 | **El Swiss no tiene campeón:** sus logs no dicen con qué jugaste (`systems/internacional.js:82-89`). El stream muestra el campeón del split | ✅ 2026-10-15 (G1b: la previa del Swiss muestra el campeón del plan) |
| D105 | **El campeón del rival por mapa no se guarda en `serie.mapas[]`:** solo va en el log del mapa (`rivalJuega`, `systems/serie.js:396-397`). La post-serie y el retomar tienen que reconstruirlo del relato | ⬜ |
| D106 | ✅ ola F (F3, `registro.finales`) · **Las finales de liga perdidas no se guardan en el registro:** solo quedan como texto en `career.hitos`. La tarjeta final cuenta solo las del Mundial (`finalesPerdidas`, `core/legado.js`), y el "tan cerca" de la final de liga no llega al final de la carrera. Es un dato del motor: año, liga, rival y marcador (§0.7, W6) | ⬜ |
| D107 | **La decisión del año no queda en el estado:** la "Última hora" del diario la reconstruye de los logs del año, cruzando el título del evento con las banderas `bifurcacion` / `cierreDeEdad` de los datos (`ultimaHoraDelAnio`, `ui/core/momentos.js`). Funciona, pero se rompe si un título cambia; el motor debería guardar las decisiones del año (§0.7, W2) | ⬜ |
| D108 | **El puntaje del arranque del año vive solo en la foto de la UI** (`fotoDeSplit`, `ui/core/escena.js`): en una partida retomada a mitad de año el diario no muestra el delta del puntaje. Si se quiere siempre, va `puntaje` en `CAMPOS_EDAD` (motor) (§0.7, W2) | ⬜ |
| D109 | **Los playoffs de tu liga no tienen cuadro:** `systems/serie.js` genera el rival de cada ronda (`generarRival(state, ronda, rng)`) y no guarda el bracket, así que "dónde estás vos" en los playoffs domésticos no se puede mostrar sin inventarlo (F1 lo reportó y no lo inventó; el Mundial sí tiene su cuadro de 8). Pedido del usuario en §0.8 | ⬜ |
| D110 | **El validate completo de la ola F (7ce3e81): 564 OK, 7 FAIL**, ninguno perseguido. Dos son de la llamada de F2 o del lote: (a) "La tabla de temporada cierra" revienta en 2 de 300 seeds (182 y 249) porque, después de firmar con la llamada de tier 2, hasta el split siguiente `career.temporada.tabla` es la de tier 3 y tu org nueva no está; en la UI, el panel de la tabla muestra esas filas bajo la liga de tier 2 y sin tu fila marcada (no crashea: `posicionEnTabla` cubre el caso); (b) V5 no encontró en su lote de 20 una carrera con todo junto (curva, títulos de tier 2/3, Mundial y Golden Road): falta de cobertura, no un error. Los otros cinco son bandas que F movió a propósito: K4c p90 de interrupciones en el split internacional 10 (meta ≤ 6: F1 frena cada ronda del Swiss), K4c bifurcaciones por carrera 4.68 (meta 5-9), K5c el azar se estanca en tier 2/3 el 8.3% (banda 8.58-13.92: la llamada saca gente del tier 3), K6b-C frenadas desde los 28 17.98 (≤ 14.1) y la del terco 14.08 (≤ 10.93). Se re-basan o se corrigen después de que el usuario juegue F | ⬜ |
| D111 | **La penalidad de edad del mercado no es la que dice su comentario:** `(1−sesgoEtario(edad))×100` (`core/valorMercado.js:25-27`; `balance.js:1226`, tabla :1437-1441) vale ~−48 a los 25 y ~−70 a los 27, y el comentario dice ~10. Es la causa más probable de las cuatro pretemporadas sin una sola oferta que tuvo la auditoría (§0.9, G3b) | ✅ 2026-10-15 (G3ab: la penalidad vuelve a ~10, con tope; toda ventana trae 3 ofertas o más) |
| D112 | **El sueldo supera el "hasta" de la oferta:** "hasta $X" es el presupuesto del asiento (`core/demanda.js:144-164`) y nunca topea el sueldo (`core/salarios.js:12-22`). Se jugó una oferta de $511k con "hasta $348k" (§0.9, G3c) | ✅ 2026-10-15 (G3c: el sueldo de la oferta y el de "pedir más" topeados por el "hasta") |
| D113 | **"Élite" no significa lo mismo en la ficha que en el mercado:** la ficha llama élite a 63-78 (`core/ficha.js:27-39`), y el mercado empuja recién desde 80 (`core/demanda.js:29-58`) (§0.9, G2b) | ✅ 2026-10-15 (G2b-ficha: "Élite" es más de 80, como en el mercado; 63-80 es "Alto nivel") |
| D114 | **El diario se repite:** "UN AÑO MÁS EN LA GRIETA" salió tres años seguidos y "El parche te dejó sin Ahri", cinco. El "OTRA VEZ —" llega recién a la cuarta repetición (`core/temporadaResumen.js:371-374`, `balance.js:1772`), y el renglón del parche no mira el año (:478-481) (§0.9, G4a) | ✅ 2026-10-15 (G4a y G-fix C2: tres redacciones que rotan por aparición, el parche solo el año del parche; 0 repetidos en años seguidos en 100 carreras) |
| D115 | **"Tu chance cambia con cada una" con una sola opción**, en las rondas del Swiss (`stream.js:201-218`) (§0.9, G1b) | ✅ 2026-10-15 (G1b: cada ronda del Swiss es un minijuego; la frase salió) |
| D116 | **"¡SOS UNA ESTRELLA!" sin equipo:** el titular del hype sale cuando la ficha dice "El que no llegó" (§0.9, G4a) | ✅ 2026-10-15 (G4a: el titular y el banner de estrella piden equipo) |
| D117 | **"El día que dejaste tu país" sin haber emigrado:** el evento del viaje salió en una carrera que nunca dejó LAS (§0.9, G4a) | ✅ 2026-10-15 (G-fix A: el viaje pide residencia import o residente; "ni un scout" pide ladder medio) |
| D118 | **El Bo1 de la temporada regular todavía se tira:** la parada de F2 (`construirDecisionMomento`) no tiene el 🎲 ARRIESGADO / 🧊 SEGURO ni el minijuego de G1, porque los efectos de los eventos de partido tendrían que partirse en "si sale" y "si no sale" (§0.9, G1; entrega 2) | ✅ 2026-10-15 (G1c y G-fix C1: 🎲/🧊 con el premio a la vista y el minijuego decide la fecha, sin tirada; 🎲 siempre paga más) |
| D119 | **El MSI no existe en el motor:** G1 juega cada Bo1 del Swiss del Mundial; el del MSI espera a que exista el MSI (§0.9, G1) | ⬜ |
| D120 | **El embudo después de la entrega 1:** `llegaATier1` 35,2 contra 44,6 de la base (el tope de G2a saca eventos amateur que sumaban LP y stats, 44,6 → 38,0; la final de tier 3 pasa títulos de los primeros más fuertes a quien gana la final, 38,0 → 35,2; `amateur.lpPorBloque` 68→74 solo sumó 1,4 y se revirtió) y "no llega a pro" 10,4% contra el ~20% de D-D (con equipo seguro a los 17, casi todos juegan tier 2). Se decide con el usuario después de jugar | ⬜ |
| D121 | **Lo que todavía resuelve el peso y no vos:** la reacción después del partido (`systems/temporada.js`, cerca de :404) y la crónica semanal del amateur salen por peso o por perfil; el número seguro de la tarjeta de evento no mira los efectos de pool (§0.9, G2a) | ⬜ |
| D122 | **La charla casi nunca cambia el número:** baja la vara 0,08 (`datos.charla.bajaVara`) y con 4 unidades el "necesitás 3 de 4" no se mueve: solo cambia el margen del casi. La pantalla lo dice; la charla tendría que valer al menos una unidad (§0.9, G1) | ✅ 2026-10-15 (G1c: la charla baja la regla visible al menos una unidad, "con la charla: 2 de 4") |
| D123 | **El rápido de la entrega 1: 374 OK, 8 FAIL**, ninguno perseguido. Vacíos: K1 puntaje (sin carrera de referencia en la banda baja) y K6c "el mismo club no vuelve a ofrecer". Sin mordida: K6b-C2 (el mutante de la cola ya no muerde). Bandas y reglas que movieron el tope, el piso y la final de tier 3: K4-A define_clasificacion (1 cada 3,5; meta 1 cada 3), K4c textos (23,7% de años sin carta de cierre; máximo 15%), K6b-M (b) (el veterano sin mérito se renueva por el piso), K5c-H (la élite de Brasil: apareció con la final de tier 3), K4c guardado de VERSION 10 (la prueba migrada no es la de hoy) | ⬜ |
| D124 | **El embudo después de la entrega 2** (`simulate.js 1000`, base `1b52224`): `llegaATier1` 35,2 → 38,5 (la carta del año con número seguro sube la ganancia media de stats por carta de 0,89 a 1,62), "no llega a pro" 10,4 → 11,1, título doméstico 14,3 → 12,9, Mundial 3,9 → 4,5. Va hacia el 44,6 de antes de la entrega 1; se decide con el usuario junto con D120 (§0.9) | ⬜ |
| D125 | **El "¿la seguís?" frena 2,8 veces por carrera** (base 1,7). Cada parada coincide con un cambio real (club, tier o el nivel que cae 2 escalones más, `retiro.caidasParaVolverAPreguntar`), pero puede cansar. Se calibra jugando (§0.9, G4c) | ⬜ |
| D126 | **Las promesas se rompen más de lo que se cumplen:** 321 rotas contra 204 cumplidas en 200 carreras; `idolo_de_la_casa` 13/86, `titulo_con_club` 58/120. Ya no castigan, pero un chip que casi nunca se cumple promete de más. Se calibra jugando (§0.9, G4b) | ⬜ |
| D127 | **El Bo1 que frena, sin calibrar a mano:** el bot elige 🎲 el 64%; premio esperado 🎲 0,40 contra 🧊 0,30 con su p (a favor de 🎲 porque con 🎲 se gana menos la fecha: 44% contra 57%). Las varas y los multiplicadores (`g1.bo1`) se ajustan jugando (§0.9, G1) | ⬜ |
| D128 | **El rápido de la entrega 2: 380 OK, 7 FAIL.** De la base (D123): K4-A define_clasificacion, K4c guardado de VERSION 10, K6b-M (b), K6c "el mismo club". Nuevos: K5c-M (a2 armado) (falla también sin el tope del sueldo; sospecha: el escenario armado se corrió con el stream), K6b-F contrato (1 caso) y K4c observación (muestra vacía), a G-fix D | ⬜ |
| D129 | **`src/dev/recorrido.mjs` estaba roto contra el draft de hoy** (`#campeonGrid`/`#regionGrid` contra `.in-cs-rol`/`.in-cs-retrato`). 🔶 2026-10-15 (G-play): vuelve a armar el draft, leer las cartas, apretar los momentos con Continuar, confirmar el fichaje con clic real, jugar La pizarra y firmar en el mercado nuevo (`.ms-op` + FIRMAR, `.ms-camino`). Seed 25 llega a los 23 años (233 paradas, 0 errores de consola). Ahí se queda: en el mercado de 2034 el bot firma una import "A PRUEBA" y vuelve a la ventana animada sin llegar a la prueba; con clic real (G-fix G, una docena de variantes) siempre pasa. Falta enseñarle al bot esa ventana para recorrer hasta el retiro. La regla f2 ("posición") es vieja contra el layout de hoy | ⬜ |
| D130 | **"Worlds se miró desde el sofá" casi no titula** (29% → 0,4%): se bajó a propósito para que no sea el titular de cada año sin Mundial. Si se extraña, su puntaje sube un escalón (`core/temporadaResumen.js`) | ⬜ |
| D131 | **Código muerto del plan amateur:** `decisionDePlan` sigue armando textos que nadie ve y `respuestaDePlanAmateur` (`src/dev/estrategias.js`) ya no se llama; la entrada `amateur:plan_amateur` de `HORIZONTE_POR_TIPO` queda mientras el literal siga en `amateur.js` | ⬜ |
| D132 | **Casi nadie emigra:** el bot `criterio` firma una mudanza en ~5% de las seeds (7 de 150, igual en master `1b52224` y con la entrega 2: no es regresión). Bajó en dos escalones antes: F2 "sin año muerto" (16% → 9%) y el bot de G1 que juega los minijuegos fiel a la p (gana menos finales, recibe menos ofertas de import). Lo que lo frena es el listón de import y el cupo. Subirlo a ~15% es una decisión de balance (la historia de cruzar el charco), medible con `S/mud/medir.mjs` de la sesión 1fc157bc; el check K4c observación (60 seeds) queda en riesgo de vaciarse | ⬜ |
| D133 | **El validate completo después de la ola G (las dos entregas; el de la entrega 1 nunca corrió): 50 FAIL** (`6d74c01`). G-fix E cerró 6 (la promesa del manager que no tenés era bug; el resto, checks del mundo de antes de G). Quedan, sin perseguir: **metas y bandas que movió el diseño elegido** — K4c meta del ritmo (160 interrupciones por carrera contra ≤90; 66 minijuegos por carrera contra 3-8, que por año son ~5, dentro de la meta nueva de §0.9; 11,7 bifurcaciones contra 5-9), K5c embudo/estancados/Mundial/longevidad (carrera pro mediana 11,3 años), K6c región fija, el retiro (edad mediana 30, 89,7% antes de la línea Faker, r potencial-duración 0,25), el burnout con aviso 75%, el impacto de los minijuegos (+679%: es la decisión del usuario de que las finales se ganen con las manos), 9Wd Top 20 18,4%, la densidad de un split (29 contra 28), el mundo NPC (+0,06 años); **checks que codifican el mundo de antes** — el segundo evento encadenado y `pool_a_cual_le_metes` (el tope de 1 parada por split de G2a), "lesionado" y `lesion_cronica` en 0 de 1200 (los eventos que el tope saca), K0 cierre de año (la carta frena todos los años), K0 KPIs y K0 delegación (las paradas nuevas y "no llega a pro" redefinido), K2a Bo5 y K4-B (cada mapa que cierra abre minijuego), K4 guardado (ya no existe la salida amateur), K6b-fix y K6d-B (vacíos: nunca más sin equipo), la oferta lateral rechazada y 9Mi-2 (el piso de ofertas A LA BAJA), el cooldown de un evento (el respaldo de G2b para que no falte la carta), V5 carrera dibujada (falta una carrera de muestra con curva, título de tier 2/3, Mundial y Golden Road a la vez); **y los de la base** (D123/D128). Se re-basan cuando el usuario juegue y fije los números | ⬜ |
| D134 | **La cola frena mucho más:** desde los 28, el promedio de frenadas es 33,6 (meta vieja de K6b ≤14,1; el terco, 53,6 contra ≤10,9). Lo suman la carta del año, el Bo1 que frena de cada split, el "¿la seguís?" y las finales con minijuego. Va en la dirección que pidió el usuario (que la temporada no pase volando), pero la cola de K6b se pensó rápida. Se calibra jugando | ⬜ |
| D135 | **El split del salto de tier 3 a tier 2 se juega sin temporada:** con el agente libre que firma en ese split, `systems/temporada.js` corre con los compañeros vacíos y salta; el plantel aparece recién al cierre, así que `career.temporada` queda con la foto del club anterior (G-fix E lo encontró en la seed 20; el check de la tabla ahora lo saltea). Es el resto del "año muerto" de F2 (169 de 1000 carreras con un split sin parada) | ⬜ |
| D136 | **El mazo de eventos escondía el catálogo:** el escalón sin tirada (`events.js:335`) dejaba una mediana de 2 candidatos por sorteo pro, y el cupo que sobra sacaba el evento del 57% de los splits pro. En 150 carreras, el 37% del pozo no salió nunca, 48 eventos se llevaron el 58% de las vistas y el Jaccard entre carreras fue 0,41 (§0.10, H1) | ✅ 2026-10-15 (H1a: un sorteo con rareza y el cupo propio; 300 carreras: Jaccard 0,41 → 0,18, los 10 más vistos 44% → 17%, nunca vistos del split 37% → 7%) |
| D137 | **La carta del año eran 10 manos fijas:** tres se llevaban el 67% de las vistas, el 90% de las cartas decía +3 y la "rara" era una etiqueta fija en 3 cartas (`edadCierre.js:135`, `carta.rarezaDesde`) (§0.10, H2) | ✅ 2026-10-15 (H2a: el mazo de 90 cartas; 38 distintas por carrera, mezcla 68/23/7/1,4) |
| D138 | **Minijuegos que se pasan solos y que dependen del monitor:** el dodge sin tocar nada pasa el 82%, `la_vision` al azar el 50%, el kite no mide el timing y la escalada de `last_hit` es código muerto (`lastHit.js:43`, pisado en :91). El Barón y la corrida avanzan por cuadro (`robarBaron.js:75-80`, `laCorrida.js:88-93`): a 144 Hz van 2,4× más rápido (§0.10, H3) | ✅ 2026-10-16 (M1-M4 y Cal: las 12 en canvas con paso fijo; quieto 0%, azar ≤ 16%, 60 = 144 Hz en todas; las bandas que faltan, D148) |
| D139 | **El suspenso del minijuego llega después del sello** (`paradas/minijuego.js:292-293`), y la apuesta se esconde mientras jugás (`data-fase="juego"` en `minijuegos.css`) (§0.10, H3) | ✅ 2026-10-15 (H3k: el suspenso antes del sello y la apuesta a la vista) |
| D140 | **Los 64 eventos de fecha marcada piden `contexto.stakes`**, que `calcularContexto()` nunca emite: `events.js` no los puede sortear, solo `temporada.js` (§0.10, H1.6) | ✅ 2026-10-15 (H1b: sin `stakes`; los 64 entran al mazo del split) |
| D141 | **Caminos muertos:** con el cupo de 1, `encadenar` (`events.js:714`) y `edad.probSegundaDecisionPorTipo` (`balance.js:699`) nunca dan un segundo evento; `g1.vestuarioCharlas` (`balance.js:2487`) no tiene lector (`core/serie.js:200-206` lo fija a mano); `rueda_de_prensa` declara adaptabilidad y no la lee | ⬜ |
| D142 | **La meta de rondas de minijuego de G1 (PLANUI:868) nunca se reportó.** Medido 2026-10-15: 69,7 por carrera (mediana 65), ~4,5 por año, y hasta 15 rondas seguidas de la misma mecánica en un torneo (§0.10, H3e) | ⬜ H3e |
| D143 | **La tarjeta "Cierre de año" (V4) casi no sale:** aparece solo en los años en que el cierre no frena, y ahora la mano de cartas frena todos los años (H-fix: 0 años sin parada contra 4 en master). El usuario decide si sale del producto | ✅ 2026-10-16: se queda como está (el usuario: *"la tarjeta del cierre de año no me parece mala"*) |
| D144 | **`--bloque=variedad` imprime `cartas: n/a`:** busca la mano por un id que no coincide con cómo la registra `edadCierre` (`edadCierre:mano`). La medida de cartas de H2a (38 distintas por carrera) salió de su propio script | ✅ 2026-10-16 (H2b: el bloque lee `edadCierre` con `motivo: mano`) |
| D145 | **`dev/recorrido.mjs` no juega el Barón ni el dodge nuevos:** busca el DOM viejo (`.minijuego-barra`, `.minijuego-carriles`). La raíz del canvas trae `data-arcade=<id>` para un bot | ✅ 2026-10-16 (H3u: `?bot` en `montadorDe` termina cualquier mecánica de canvas; el recorrido abre con `&bot`) |
| D146 | **Paradas por carrera: 137** (mediana 134,5; p90 189), contra ≤ 100 del plan. Los eventos suben a 37 a propósito. Lo que sobra son partidos: serie con minijuego 27,8, Swiss 13,9 y plan 7,3; las tandas de H3e los compactan | 🔶 2026-10-16 (H3e: con las tandas el Swiss baja de 12,7 a 10,1 paradas, pero el Play-In y las series suben; el total queda en 133,2 (antes 133,4) y la mediana en 126 (antes 132,5). Sigue lejos de ≤ 100) |
| D147 | **"K1 D75" queda vacío:** en 600 carreras de `malas`, ninguna termina como agente libre de tier 2 sin jugar en tier 2 (G3 y H casi no dejan agentes libres). Es falta de muestra, no un error | ⬜ |
| D148 | **Dos mecánicas quedan un poco fáciles arriba:** a vara .85, `el_kite` da 22,3 y `el_gancho` 23,0, contra un piso de 25 (Cal, 1000 corridas). El bruiser del kite se dibuja como una dona | ⬜ |
| D149 | **Detalles de la tanda en pantalla** (revisor):<br>• el HUD de cada mecánica queda tapado por la banda de instrucción durante la demo y el 3-2-1 (`ui/arcade/kit.js`);<br>• en el Play-In el CASI corta, pero el sello dice "ni ganás ni perdés".<br>"Tu mejor" con un solo partido y el ✓/✗ antes del suspenso se fueron con la tanda de clics (2026-10-16) | 🔶 |
| D150 | **Para confirmar con el usuario:**<br>• la rotación (≤ 5 seguidas) cuenta tandas, no partidos;<br>• quedar afuera en el Play-In deja un hito, pero no una fila en `registro.internacionales` | ✅ 2026-10-16: la rotación cuenta minijuegos; el Play-In perdido se dice, con color (§0.10 H3, "Lo que corrige el usuario") |
| D151 | **`PLAN.md:6398`**, la tabla de horizontes por tipo de parada, no tiene `internacional:playin`. Sí la tienen `agencia.js` y el check K4c-H | ⬜ |
| D152 | **El aviso automático todavía dice el %** (visto en la integración de la entrega 3): sin `aviso` escrito, `avisoDeOpcion` (`systems/events.js`) cae en la primera oración del peor resultado con su chance ("⚠ 30%: …"), y H4 pedía "solo con riesgo, sin %". No traen `aviso` 259 de las 327 opciones viejas ni ninguna de lo raro | ⬜ |
| D153 | **El botón del álbum no responde hasta que carga el juego:** es HTML estático y su listener se pega cuando cargan los módulos, así que un clic temprano se pierde (en Chromium no abre recién cargada la página; sí 3 s después) | ⬜ |

---

## Apéndice A — los briefs de dirección (ronda 1)

Común a las tres: vara "sitio del día" de Awwwards; la prueba de la captura (§3.1); ≤ 2 niveles de contenedor; leer
menos (§7); números con referente; texto sobre arte sobre placa; la lista de prohibidos (§5.9); la rúbrica (§3.3); datos
solo de `vitrina/datos/muestras.json`; tokens con los nombres de producción en `#rrggbb`; cero `Math.random`; camino
quieto en CSS y JS; respetar `data-pieza`, `data-atajo`, `data-foco` y los ids que lee el recorrido; el contrato del
ambiente de `vitrina/comun/`.

**A · LUZ** — ver §5.1-§5.9.

**B · NOCTURNO** — *"Tu carrera, impresa de noche."* Palabras: editorial, gráfico, ácido, tipográfico, con oficio.
Vocabulario: Bloomberg Businessweek, tapas de revistas deportivas, pósters suizos, The Players' Tribune. Paleta: negro
`#0B0B0C`, tinta `#ECE8E1`, una tinta ácida `#C8FF2E`, papel solo en las tapas (`#F1ECE2` con tinta `#121212`). Tipos:
Archivo variable (ancho 62-125: titulares condensados extremos, números anchos), IBM Plex Mono (folios y datos), Fraunces
itálica solo para la cita destacada. Grilla editorial de 12 columnas con filetes y folios ("UN SPLIT MÁS · EDICIÓN 2037 ·
SPLIT 2 · P. 14"), márgenes de 120 px. El splash en halftone por shader. Movimiento: revelados de tinta, máquina de
escribir para "ÚLTIMO MOMENTO", el "¡EXTRA!" girando (≤ 900 ms); el resto, quieto. Pantallas: inicio (la portada del Nº 1,
el perfil como frase para completar, la hoja de contactos con los mains marcados) · decisión (el split con capitular y la
cita destacada a la izquierda; "LA DECISIÓN" con opciones numeradas, glifos al margen y el inspector como nota al margen a
la derecha) · cumbre (el "¡EXTRA! ¡CAMPEONES!" en papel que desemboca en la tapa de colección) · tira de eras (cambian la
tinta y la tapa) · celular.

**C · PANTALLAS** — *"Todo pasa en tus pantallas."* Palabras: íntimo, auténtico, con humor; futurista porque los
aparatos envejecen con el calendario. Vocabulario: Emily is Away, Hypnospace Outlaw, Her Story, A Normal Lost Phone, el
pulido de un sistema operativo actual. Por era: pieza (wallpaper = tu main en splash, ventanas de vidrio `#15171C`, acento
`#7C5CFF`), academia y escenario (la estación del equipo), mundial (el stream `#0E0E10`), leyenda (la PC que se apaga).
Tipos: Geist, Geist Mono, Mona Sans ancha para los momentos. Mapa: ventana enfocada = escenario, widget = acompañante,
dock = cuartos, teléfono = celular. Pantallas: inicio (arranque → login con nombre de invocador y selector de servidor →
la ventana de selección) · decisión (la ventana de la decisión al frente, el cliente de ranked como widget, la
notificación con lo último que pasó; elegir → el resultado como notificación del sistema; el plan amateur como planilla)
· cumbre (el stream a pantalla completa con el chat cayendo y "CAMPEONES", que desemboca en el salón de la fama con la
carta) · tira de eras (el mismo escritorio de 2026 a 2040) · celular (el teléfono).

---

## Apéndice B — los briefs de la ola 2 (listos para despachar)

**Común a los tres:**
- Una rama y un worktree por subfase, desde `u-integracion`.
- Leer lo de §0.1. El contrato de las familias de `ui/escena.js` es ley. El kit `fx/` se usa sin modificarlo.
- No se tocan `fx/**`, `index.html`, `app.js`, `ui/escena.js`, `teclado.js`, `shell.*`, `primitivos.css`, `base.css`,
  `guards.js` ni el motor.
- En `tokens.css`, `formatoUi.js` y `almacenamiento.js` solo se agrega al final, con un rótulo `/* U2x */`.
- Prefijos de clase propios; nada genérico.
- Verificar con:
  - `validate.js --rapido` y `build.js` (si se pasa el techo, se sube en un commit propio con el número);
  - `recorrido.mjs` con 1 seed y `--max-paradas 25`;
  - `estrella.mjs` sobre las muestras de cada uno, mirando las composiciones;
  - el navegador a 1440×900 y 390×844, con INST y movimiento reducido, y 0 errores de consola.
- Matar solo el PID propio. No tocar los puertos 8090, 8095 ni 8120.
- ≤ 2 niveles de contenedor. Títulos ≤ 56 px.

### U2a · inicio y decisión

**Dueño de:** `screens/inicio.js`, `estilos/inicio.css`, `components/{feed,cierre,decision}.js`,
`estilos/{feed,decision}.css`, `paradas/decision.js`.
**Referencia:** `vitrina/fusion/js/{inicio,decision,escena}.js` y sus hojas.
**Muestras:** `inicio,evento,planAmateur,cierreAnio`.

1. **Inicio.**
   - La intro de §6.8.
   - El champ select de §4.10 I: pestañas de rol con glifos, el campeón apuntado grande en bitono 100% (era `pieza`),
     tres ranuras como cartas de carga y BLOQUEAR con `ceremonia.bloquear`.
   - Handle, región como selector de servidor y perfil en una línea; el desafío y el historial, chicos.
   - Los textos literales que exigen los guards de `inicio.js` se conservan o se actualizan en el mismo commit.
2. **Relato y cierres** (§8): íconos por `log.type`, el odómetro de `fx/movimiento.js` y la nota del año grande.
   `data-era` queda quieto mientras cuenta.
3. **Decisión.**
   - Rótulo, título ≤ 56 px y primera oración.
   - Franjas con ▲/▲▲/▲▲▲ y ▼ (la magnitud por cantidad de flechas) y un medidor con su %.
   - **Un** inspector con la prosa de la opción apuntada, y el aura.
   - La elegida se transforma en su resultado (el envoltorio de `revelar`).
   - Nada del texto del motor se pierde (§7.5). Con `html[data-textos="completos"]`, la prosa va entera.
4. **La bisagra:** la costura del ambiente (`api.ambiente({ costura })`), con la variante **según el contexto**:
   - dos ligas en juego → `liga` (`fx/logos.js`);
   - una copa en juego → `copas` (`fx/trofeo.js`);
   - si no, `campeones`.
   El contexto sale de datos estructurados de la decisión, **nunca de parsear prosa**.
5. **Plan amateur y plan del año** como matriz (§7.4).

### U2b · partido y mercado

**Dueño de:** `paradas/{partido,mercado}.js`, `components/{serie,previaPartido,mundial,mercado}.js`,
`estilos/{serie,mercado}.css` y un agregado al final de `almacenamiento.js`.
**Referencia:** `vitrina/fusion/js/{partido,mercado}.js` y sus hojas.
**Muestras:** `serie,serieReplan,swiss,mercado`.

1. **Partido.**
   - La fecha como cruce, con la p grande.
   - Fearless: la pared de retratos de carga y `ceremonia.quemar`, y las cartas de plan con 5 barritas y el % de la
     serie.
   - El decisivo con `ambiente({ suspenso })`: el Bo5 2-2 y el Bo1 de vida o muerte del Swiss.
   - El Swiss 2-2 a pantalla completa como stream: `transmision.*`, el récord en 5 marcas y Aceptar con anillo.
   - El bracket como cinta.
   - VICTORIA/DERROTA por mapa con `ceremonia.victoriaDerrota` y la costura cara a cara.
   - Sin MVP, KDA, oro ni torres.
2. **Mercado: el flujo de la compuerta 2 (§2).**
   - **a.** Las ofertas llegan con el reloj de la ventana: días deterministas, el bombazo al final, 5,6 s, salteable y
     usable mientras llegan. Atrás va la variante **`ofertas`**: cartas formales con membrete y sello que se apilan, y
     apuntar una la trae al frente. Sin campeón.
   - **b.** Al elegir, la carta se aprieta y **la firma se dibuja sobre el contrato**, con `beats`.
   - **c.** **Tu línea cae desde arriba sobre el mapa de la Grieta con las cinco líneas** (el `plantel` de la vitrina).
     Los otros 4 lugares dicen "por anunciar" (D102).
   - **d. "La firma".** La camiseta de la org de espaldas, en SVG con pliegues, con sus colores, su escudo, el handle
     y **un número que el jugador elige**: 1-99, con teclado y con un valor por defecto determinista. Se guarda con
     `leerNumeroCamiseta`/`guardarNumeroCamiseta`, al final de `almacenamiento.js`, junto a `lolcs-vista` y nunca en
     el `state`. Retomar lo conserva.
   - Todo se saltea con Espacio. INST y reducido muestran el cuadro final. **Un solo `responder`.**
   - Si una espera cambia los espejos de `simulate.js` ("K0 espejos"), se actualizan en el mismo commit.

### U2c · franja, acompañante, cuartos y minijuegos

**Dueño de:** `franja.js`, `acompanante.js`, `paneles/*`, `cuartos.js`, `cuartos/*` (menos `carrera.js`),
`components/ficha.js`, `paradas/minijuego.js`, `estilos/{paneles,cuartos,ficha,minijuegos,hud,overlay}.css`. No toca
las mecánicas de `components/minijuegos/*.js`.
**Referencia:** `vitrina/fusion/js/marco.js`, `estilos/{base,linea}.css`, `vitrina/comun/{panel,celular}.*`.

1. **Franja** translúcida de 52 px, con el ajuste **"Textos: breves | completos"** → `html[data-textos]`.
   - Se guarda como preferencia de la vista; "breves" por defecto.
   - Se conservan los ids del recorrido y las teclas de los cuartos.
2. **Acompañante** en una sola placa translúcida, sin cambios de lógica en `acompananteDe`.
3. **Cuartos.**
   - El `<dialog>` con el sistema nuevo.
   - Vos suma el radar de `graficos/hexa.js`. Carrera queda para U3b.
   - Al abrir un cuarto, `window.__fx?.pausar?.()`; al cerrarlo, `reanudar`. Solo si el shell no lo hace ya.
4. **Minijuegos, prueba y prensa.**
   - La previa con la apuesta en una placa, y "¡Vamos!" como el anillo de `ceremonia`.
   - El jugo: destello, sacudón ≤ 4 px y chispas.
   - **Sacar las escuadras** de `minijuegos.css`.
   - Se conservan los checks de texto literal de `paradas/minijuego.js`.
5. **Celular:** franja compacta, acompañante en su hoja y cuartos a pantalla completa.

### Después

- **Ola 3, U3a · momentos** (§6.5, §11).
  - `ui/core/momentos.js` y `fx/momento.js` (la base `.takeover`) con las 3 variantes, más banners y ceremonias.
  - El gancho `alBeat` en `reproductor.js`, el sonido, `momentosVistos` en `lolcs-vista` y el espejo de `simulate.js`.
  - El takeover del primer contrato reusa la pantalla "la firma" de U2b.
- **Ola 3, U3b · la carta** (§6.6, §6.7): un canvas único que también es el PNG, la final, la trayectoria redibujada y
  `exportar.js`. Puede mostrar el número de camiseta.
- **Ola 4:** pulido (D98, D99), contraste, celular, rendimiento, CSS muerto y docs. Después, la Definición de terminado
  de `CLAUDE.md`, el merge a `master` y el deploy.
