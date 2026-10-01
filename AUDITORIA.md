# AUDITORIA.md — Auditoría completa de "Un Split Más" (2026-10-01)

> **Qué es este documento.** Una auditoría de experto del proyecto entero, hecha a pedido del
> usuario: cómo vamos contra lo que se quiere, cómo son los juegos de referencia (El Ídolo de
> Potrero y Copero) y por qué este no se siente así, qué se hizo bien, qué se hizo mal y cómo está
> de salud el código. Es la base para generar el próximo plan; **no es el plan**.
>
> **Ciclo de vida.** Igual que la anterior: es una foto, no se actualiza sola. Si en algún momento
> contradice a `PLAN.md`, gana `PLAN.md` y este archivo se borra o se vuelve a escribir. La auditoría
> anterior (2026-09-25, contra `3fc6ea5`) sigue en git: `git show 2c63c4f:AUDITORIA.md`.
>
> **Medido contra** el commit `2c63c4f` (rama `fase-9r-que-el-juego-se-juegue`, árbol limpio).
> Escrita sin tocar una línea de `src/`.
>
> **Método.** Todo se midió en la sesión de auditoría; nada se citó de `PROGRESO.md` (trampa T6).
> - Lectura directa del motor (`core/`, `systems/`), datos, UI y herramientas.
> - `validate.js --rapido` (83 OK / 117 lentos salteados / 0 FAIL) y `simulate.js 300 60 todas` (0 crashes).
> - Sondas propias sobre 300-400 carreras: volumen de decisiones, saturación de stats, veredictos, retiro.
> - **Experimento contrafáctico de agencia** (nuevo): en 1.444 decisiones de 40 carreras, se clonó el
>   estado y se probó cada opción con 8 réplicas y números aleatorios comunes, hasta el final de la
>   carrera. Mide directamente "¿lo que elijo cambia cómo termina mi carrera?".
> - Una carrera completa **jugada en Chromium** (instantáneo y a velocidad 1×), más la vista de
>   celular a 390 px.
> - Investigación web de El Ídolo y Copero (fuentes al final).
>
> Los scripts de cada medición están en el **Apéndice A**, para reproducirlas.

---

## 1. Veredicto

**Construiste un simulador excelente de una carrera de LoL, pero no un juego como El Ídolo o
Copero. Las referencias son partidas de 2 a 5 minutos con pocas decisiones grandes, consecuencias que
se ven y un puntaje al final para compararte. "Un Split Más" es una sesión de 45 a 60 minutos con unas
190 interrupciones: alrededor del 80% de ellas no cambian cómo termina tu carrera, nada te dice qué tan
bien jugaste y 8 de cada 10 terminan campeones.**

El motor es lo mejor del proyecto y no hace falta tirarlo: el problema es de **diseño de la
experiencia**, no de calidad de código. Dicho corto: se priorizó simular el mundo por encima de lo que
siente quien juega.

Los cinco números que lo resumen:

| | Medido | Referencia / lo que pide tu propio diseño |
|---|---|---|
| Interrupciones por carrera | **mediana 191** (p90 221) | Copero/El Ídolo: ~10-40 · `CONCEPTO` §2: "1 o 2 por split, nunca más" |
| Tiempo de sesión | **17,4 min solo de tiempo-máquina a 1×** (sin leer nada) → **~45-60 min** con lectura real | Copero 2-3 min · El Ídolo ~5 min · tu techo (`CONCEPTO` §11): 40 min |
| Interrupciones sin efecto medible en el final | **~80%** | `CONCEPTO` §1: "decidís en los momentos que importan" |
| Mentalidad / hype en etapa pro | **mediana 97 / 100** (75% de los splits ≥ 90) | `CONCEPTO` §3: "la mentalidad es la moneda con la que pagás" |
| Carreras pro que terminan en el retiro forzoso de los 34 | **72,6%** (mediana de carrera pro: 16,7 años) | `CONCEPTO` §12.4: carrera media real 2,1 años · tu decisión: "si no sos bueno no tenés ofertas" |

---

## 2. Cómo son los juegos de referencia, y por qué funcionan

### 2.1 Copero
- Simulador de carrera de fútbol en el navegador, **sin cuenta ni descarga**: una carrera de ~20 años
  se juega en **2-3 minutos** (algunas notas dicen "menos de dos").
- Creás al jugador (apellido, nacionalidad, número, pie, posición) y te asignan un club.
- **Elegís el ritmo**: *Intenso* (una decisión por temporada), *Normal* (cada 2), *Express* (cada 3).
- Las decisiones son **de carrera**: renovar, cambiar de club, aceptar un préstamo, pelear el puesto,
  irte al exterior; y de vida: dieta, entrenamiento, estudios, incluso la tentación de doparte.
- En pantalla: **OVR, POT**, edad, partidos, goles, asistencias, trofeos (un número que crece).
- Al retiro: **puntaje (~400-800, OVR máximo 99)** y una tarjeta para compartir con tres momentos
  (el primer salto, el traspaso que te definió, la carrera completa).
- Se hizo viral en X después del Mundial con la "fórmula Wordle": partida corta, reglas simples,
  resultado impredecible y fácil de compartir.

### 2.2 El Ídolo (Potrero)
- ~5 minutos (v1). Arrancás a los 16 en el ascenso argentino o uruguayo; la v2 suma nacionalidad,
  liga y equipo iniciales. Hay **más de 300 eventos**, pero cada carrera ve una fracción.
- Las decisiones mueven **reputación y relación con los hinchas**: irte al rival te vuelve traidor,
  rechazar plata te da lealtad. "Una sola elección puede abrir una transferencia o romper con los
  hinchas."
- En la pretemporada usás **cartas de mejora** para darle forma a tu estilo; la v2.1 suma una
  "**clase de jugador**" que cambia cómo se juega toda la carrera.
- **Minijuegos para definir finales y partidos decisivos** (ta-te-ti en una final de Libertadores,
  clickear íconos en una pelea por el descenso) y una **arenga**: un comodín que podés usar **una
  vez** para asegurar una fase (no sirve en finales). Ganar el Mundial es "casi imposible", a
  propósito.
- Un **rival permanente** que te compite goles, asistencias y títulos.
- Al retiro: balance completo, **comparación con una figura histórica**, **puntaje y ranking global**.
- **Desafío diario** (el mismo arranque para todos), duelos 1 contra 1, copa de clubes.
- 4,9 estrellas en App Store (1.200 calificaciones). Lo que piden los usuarios: más posiciones y
  dificultad según la fuerza del equipo. La queja principal: minijuegos de arquero imposibles.

### 2.3 Por qué funcionan (los principios que tienen en común)
1. **Brevedad que invita a rejugar**: como la partida es corta, rejugar es el juego, y lo que cambia
   entre una partida y otra (la varianza) se vuelve el contenido.
2. **Pocas decisiones, grandes y de carrera**, cada una con una consecuencia que se ve al toque
   (cambiás de club, sube el OVR, reaccionan los hinchas).
3. **Un número final y alguien con quien compararlo** (ranking, mismo arranque para todos, duelos).
4. **La simulación queda escondida**: ves resultados, no procesos.
5. **Rareza**: la cima es casi imposible, y por eso, cuando llega, se cuenta.
6. **Una progresión que es tuya**: el OVR sube, elegís cartas, elegís clase.
7. **Una cosa por vez en pantalla**, pensado para el celular.
8. **Minijuegos solo en el clímax**, más un comodín de un solo uso para tener control en el momento
   clave.

(El género entero funciona igual — Reigns, BitLife: decisiones binarias que funcionan *porque*
mueven medidores visibles y los finales son frecuentes y rápidos.)

---

## 3. Qué querés vos — la vara, y cómo estamos

Leído de `CLAUDE.md`, `CONCEPTO.md` y las decisiones textuales de `PLAN.md`.

| Lo que pediste | Estado | Evidencia |
|---|---|---|
| Carrera de los 15 años al retiro, en el navegador | ✅ | 0 crashes en más de 900 carreras; 0 errores de consola en una carrera completa jugada en el navegador |
| Arquitectura limpia, determinista, escalable | ✅ | §6 y §8 |
| "La experiencia debe ser **breve**, profunda y rejugable" (`CLAUDE.md`, línea 1) | ❌ breve · 🔶 profunda · ❌ rejugable | Contradicción interna: `CLAUDE.md` dice "breve"; `CONCEPTO` §1 la llevó a 25-40 min (originalmente decía 4-10) |
| "Decidís en los momentos que importan" (`CONCEPTO` §1) | ❌ | ~80% de las interrupciones no tienen efecto medible (§4.3) |
| Cadenas causales de `CONCEPTO` §7 | 🔶 | La espiral central y la trampa del equipo grande funcionan. "El precio de todo" está muerta (mentalidad saturada). "Fama ≠ talento" está aplastada (hype en 100 para casi todos) |
| Cada partida distinta (§8) | 🔶 | Hay variedad de historia, pero los finales convergen: ~61% termina en dinastía, bicampeón, leyenda o top 5 del mundo |
| "Una partida ve unos 25 eventos" (§8) | ❌ | ~39 eventos + 15 de fin de año + 24 momentos de partido por carrera |
| Tarjeta final con puntaje por rol, puesto en tu generación y "hasta dónde llegaste vs. hasta dónde podías" (§1, §9) | 🔶 | Hay veredicto y PNG compartible; **no hay puntaje, ni comparación con el potencial, ni puesto en la generación, ni signature, ni secundario en la tarjeta** |
| Misma seed = misma historia, "para comparar quién la jugó mejor" (§9) | 🔶 | El link con la seed existe; **no hay ninguna métrica con la que comparar** |
| Duración 25-40 min (decisión tuya) | ⚠️ cumplida en el papel, pasada en la práctica | ~45-60 min reales; el propio §11 dice que pasar de 40 "es que algo se infló" |
| Retiro emergente: "si no sos bueno no tenés ofertas; si sos muy bueno, como Peanut o Faker" | ❌ | 72,6% de las carreras pro llega a los 34; solo el 0,3% dura menos de 4 años |
| Minijuegos "sin que todo sea gambling" | 🔶 | 26 por carrera; uno solo no mueve nada; todos perfectos vs. todos mal: +1,5 títulos en toda la carrera |
| "No sí o sí draftear cada partida" | ✅ en cantidad · ❌ en sentido | El draft te para justo cuando la respuesta es obvia (§5, B6) |
| Ligas 2026 exactas, tier 3 corto, sin decay, mercado con planteles reales | ✅ | Investigación (§12) sólida y aplicada |
| Tono de alguien que conoce LoL | 🔶 | La prosa es excelente, pero se filtra vocabulario de fútbol (§5, B9) |
| Región = dificultad · internacional como torneo real (FASE J) | ❌ pendiente | J10 y J7 sin empezar |
| Publicar | ❌ | Falta el paso manual del host (P.6); decidiste que no hay apuro |

---

## 4. El juego, medido

### 4.1 Volumen y ritmo (400 carreras, estrategia `equilibrado` · 1 carrera jugada en el navegador)
- **Interrupciones por carrera**: media 169, mediana 191, p90 221. Jugada en el navegador: 223
  (velocidad instantánea) y 241 (a 1×).
- **Por split profesional**: media 3,6, mediana 2, p90 9, máximo 23. **El 41% de los splits pro trae
  más de 2**, contra el "1 o 2, nunca más" de `CONCEPTO` §2.
- **A qué se va el tiempo**: eventos 23% · minijuegos de serie 15% · drafts de serie 15% · momentos
  de partido 14% · fin de año 9% · rutina de offseason 8% · rutina amateur 6% · **mercado 3,6%**.
- **Líneas de log por split**: 16,4 (12,9 narrativas; p90: 45). El reproductor muestra cada una
  durante 700 ms.
- **Lectura**: ~96 palabras por tarjeta de evento, más ~22 por resultado. El 94% de los eventos
  (236 de 250) tiene solo 2 opciones.
- **Tiempo-máquina a 1× sin leer nada**: 17,4 min (hueco mediano entre interrupciones: 3,1 s; p90:
  8,8 s). Con lectura real se estima **45-60 min**.
- **Duración**: mediana de 57 splits (19 años de carrera).

### 4.2 Economía y dificultad
- **Mentalidad en pro**: mediana 97; el 75% de los splits está en 90 o más. **Hype en pro**: mediana
  100; el 77% en 90 o más. El 47% de los efectos del catálogo apunta a estos dos stats, así que cae
  sobre una barra que ya está llena.
- **El éxito es lo normal**: el 79,5% llega a tier 1, un promedio de 5 títulos por carrera, y el 79%
  gana al menos uno. Veredictos: "La dinastía" 21% · "El que no llegó" 17% · "De los mejores del
  mundo" 15% · "El bicampeón" 10,5% · "Leyenda de X" 10% · "El mejor del mundo" 4,8%.
- **El retiro es un reloj, no el mercado**: de 321 carreras pro, el 72,6% termina en la línea forzosa
  de los 34 (`balance.js` `edadRetiroForzoso: 34`). Mediana de carrera pro: 16,7 años; p10: 13,3;
  menos de 4 años: 0,3%. La realidad que vos mismo investigaste: 2,1 años de media y menos del 20%
  sigue activo al cuarto año.
- **Tu nivel casi no decide la tabla**: la correlación entre tu nivel y la posición del equipo en cada
  split es r = 0,05. Los compañeros pesan el 50% (`core/fuerza.js:45`) y su nivel queda congelado al
  fichar.
- **El amateur sí tiene tensión**: con estrategias consistentes, `ranked` termina en burnout el 49,7%
  de las veces y `prudente` en "no llegó" el 29,7%. Ahí elegir importa. **El problema empieza al pasar
  a profesional**, que es el ~90% de la sesión.

### 4.3 Agencia: el experimento contrafáctico (1.444 decisiones, 40 carreras, 8 réplicas)
"Palanca" = cuánto cambia el puntaje final de carrera entre la mejor y la peor opción, en desvíos
estándar de toda la población. El puntaje es una suma de títulos, internacionales, top mundial,
splits en tier 1 y si llegaste a pro (σ = 101,5). Una palanca de ~0,1 σ es del orden del ruido del
propio método, así que la columna que decide es "% significativo" (prueba t pareada, p < 0,05):
**si una decisión no importa, igual da ~5% por azar.**

| Tipo de decisión | n | Palanca mediana | % significativo | Lectura |
|---|---|---|---|---|
| Oferta de equipo (amateur) | 43 | 0,41 σ | 21% | importa |
| **Mercado: qué oferta firmás** | 64 | **0,40 σ** | **42%** | **la decisión que más importa del juego** |
| Rutina amateur | 79 | 0,37 σ | 13% | importa algo (cambia unos 290 LP) |
| Rutina de offseason | 64 | 0,26 σ | 19% | importa algo |
| Eventos (todos) | 504 | 0,10 σ | **3%** | **ruido** |
| Fin de año ("LA decisión de la edad") | 255 | 0,10 σ | **4%** | **ruido** |
| Momento de partido (temporada) | 64 | 0,07 σ | 6% | ruido |
| Draft de serie (Fearless) | 64 | 0,06 σ | 5% | ruido |
| Minijuego de serie (jugarlo **mal vs. bien**) | 64 | 0,04 σ | **0%** | ruido |
| Draft de fecha (temporada) | 49 | **0,00** σ | 0% | literalmente nulo |

- Ponderado por frecuencia: **~80% de las interrupciones no tienen efecto detectable en el final**,
  ~13% tienen un efecto moderado y **~4% (las ofertas) lo deciden**.
- Ni siquiera **jugar siempre igual** sirve: siempre la primera opción, siempre la última, siempre
  la más arriesgada o siempre la más segura, en *todos* los eventos, fines de año y momentos de partido
  (300 carreras cada una), deja el puntaje medio entre 146 y 155 contra 151 de base. Es el mismo
  número, dentro del ruido. **Las 517 opciones del catálogo no le dan forma a la carrera.**
- Minijuegos: jugar los 26 perfectos contra los 26 mal da 159 contra 134 de puntaje (0,27 σ, +1,5
  títulos en toda la carrera). Importan un poco en el agregado y nada uno por uno.
- Desde cualquier decisión, el azar que viene después dispersa el final en 0,35-0,55 σ. **En la
  mayoría de las decisiones, ese azar pesa entre 4 y 10 veces más que lo que elegiste** (en el
  mercado, más o menos lo mismo). Por eso se siente que "es todo RNG": mecánicamente, así es.
- Aclaración justa: parte del catálogo es color a propósito, y una decisión puede importar en el corto
  plazo sin cambiar el final. Pero los efectos de corto plazo también son mínimos (un split después:
  nivel ±0,2, mentalidad ±1, puesto en la tabla ±0,25), y `CONCEPTO` §7-§8 promete que las decisiones
  le dan forma a la carrera.

---

## 5. Por qué no se siente como El Ídolo o Copero — las brechas de fondo

### B1 — Es otro formato: una novela, no una partida rápida
Las referencias duran 2-5 min y rejugar es el juego. Acá: ~190 interrupciones, 57 splits, 16 líneas
de log por split, ~96 palabras por tarjeta, 45-60 min. Nadie rejuega cinco veces seguidas algo de una
hora, así que la promesa de `CONCEPTO` §11 ("rejugar con otra seed es donde está el juego") no puede
cumplirse. Tiene **dos causas**:
- **Densidad**: demasiadas paradas por split (series con draft y minijuego mapa a mapa, momentos,
  segundo evento, fin de año, offseason, mercado).
- **Longitud**: carreras irrealmente largas (B5). Con carreras pro realistas, la partida sería sola
  unas 2-3 veces más corta.

La raíz es la decisión "la larga: 25-40 min" (fase 8), que convirtió el juego en otro género sin dejar
de citar la misma referencia. Copero muestra la salida: **que el jugador elija el ritmo**.

### B2 — Las decisiones que importan están enterradas
En las referencias casi todo es una bifurcación de carrera (club, préstamo, exterior, plata contra
gloria). Acá esas decisiones (mercado y ofertas) son el ~4% de las interrupciones y quedan ahogadas
entre drafts, momentos y eventos que no cambian el final (§4.3). El jugador no puede distinguir qué
importa, porque la UI les da a todas el mismo peso visual.

### B3 — La economía no tiene escasez: las monedas están llenas
`CONCEPTO` §3 diseña la mentalidad como "la moneda con la que pagás" y el hype como la fama separada
del talento. En la etapa pro, las dos viven en 97-100. El 47% de los efectos del catálogo cae sobre una
barra llena, y la previa de la opción ("+ MENTALIDAD") promete algo que no cambia nada. **Consecuencia
para el plan**: J1 (meter mentalidad y hype en la fuerza) no va a mover nada mientras estén saturadas;
su check "mentalidad 20 vs. 80" va a pasar, pero en una partida real la mentalidad está en 97.
**Primero la economía, después el cable.**

### B4 — No hay un número que perseguir ni con quién compararte
La viralidad de las dos referencias se apoya en un puntaje final, un ranking, el mismo arranque para
todos y la comparación con una figura histórica. Acá no hay puntaje: hay una frase de veredicto y
totales. El link de la seed existe, pero no da con qué comparar. `CONCEPTO` §9 lo prometía (puntaje por
rol, puesto en tu generación, potencial contra logro) y no está hecho: `core/legado.js` no lee
`oculto.potencial`, ni la generación, ni la signature. Es la brecha **más barata de cerrar** y la que
más acerca el juego a la referencia.

### B5 — El éxito es la norma y el final es un reloj
El 79,5% llega a tier 1, se ganan 5 títulos de promedio y ~61% de los veredictos son de élite. En El
Ídolo el Mundial es "casi imposible", y por eso emociona. Además, el retiro "emergente del mercado"
casi no ocurre: el 72,6% se retira por edad a los 34. La carrera que se jugó en el navegador terminó
así: retiro forzoso a los 34, con mentalidad en 93 y hype en 100. Sin fracaso posible en la etapa pro
no hay tensión, y los logros no significan nada porque los tiene todo el mundo.

### B6 — Decisiones sin dilema
- El 94% de los eventos es binario y la mayoría de los resultados son empujoncitos de +2 a +9 sobre
  stats saturados o que vuelven solos a su curva (vida media de un efecto sobre mecánica: 1,9 splits).
- **El draft te para cuando la respuesta es obvia**: `core/serie.js:157-175` frena solo si el mejor
  campeón te da al menos 26 puntos más de probabilidad que el segundo, y además la lista viene ordenada
  de mejor a peor. El umbral se calibró para cumplir "mediana ≤ 1 draft por serie y ≥ 30% de series sin
  draft" (`balance.js:1361-1372`): un número interno, no un dilema. La única tensión real de Fearless
  ("¿guardo a mi mejor campeón para el mapa 5?") no está modelada en el criterio para preguntar.
- **El momento de partido** cambia 1 de 7-9 fechas de la temporada regular, muchas veces contra un
  rival que la UI marca "DÉBIL", y cada temporada se juega con **una sola tirada de tu rendimiento**
  (`systems/temporada.js:163`).
- **26 minijuegos por carrera** donde la referencia tiene uno por final; uno solo no mueve nada.

### B7 — La pantalla muestra el motor, no la historia
Es un tablero de transmisión con más de 40 números a la vista: ficha, 6 paneles a la derecha (tabla,
calendario, plantilla, meta, generación, top mundial), un feed de 8 líneas que se revelan de a 700 ms y
la tarjeta de decisión compitiendo por la atención. **La estética es de muy buena calidad; el problema
es de foco.**

En el celular (390 px), que es donde se juegan las referencias: el documento mide 455 px de ancho
(scroll horizontal, el topbar queda cortado), la ficha fija tapa ~40% de la pantalla y las opciones
quedan debajo del pliegue.

### B8 — El jugador no construye a su jugador
Los stats siguen curvas de edad que se comen tus efectos. El pool se pudre hasta maestría 5 (media de
la maestría mínima al final: 5,6). No hay cartas de mejora ni clase de jugador: la identidad son el rol
y 3 mains elegidos al arrancar. En la referencia ves subir el OVR por lo que hiciste, y acá no se siente
la propiedad de la progresión.

### B9 — El tono se va al fútbol (menor)
La prosa es de lo mejor del proyecto ("No hay gritos: es peor, es la conversación tranquila de los
que ya lo pensaron"), pero se filtra la referencia futbolera, contra lo que pide `CLAUDE.md`:
"Colgás los botines" en la decisión de retiro (`systems/retiro.js:55`), "cancha" ×10, "hinchas" ×3,
"camiseta" ×3, "filial" ×3, "Selección: sin chance" en la ficha y "vestuario" ×168.

---

## 6. Lo que se hizo bien (no tocar)

1. **Arquitectura del motor**: puro, determinista, guiado por datos, un solo `state`, registro
   declarativo de 26 sistemas, reanudable a mitad de split (cursor por id), guardado con el estado del
   RNG y corre en Node. Es de nivel profesional.
2. **Disciplina de determinismo**: cero `Math.random()`, un stream separado `rngUi` para los
   minijuegos y una huella de 12 seeds de `src/` contra `dist/` en el build.
3. **Investigación de dominio** (`CONCEPTO` §12): ligas 2026, disolución de la LTA, ranked
   post-2023, salarios, duración de carreras, Fearless. Rigurosa y fechada.
4. **Escritura**: voz rioplatense con personalidad; 250 eventos, 517 opciones y 1.034 resultados, con
   tokens y variantes.
5. **Identidad visual**: sistema de diseño con tokens, lenguaje de transmisión y cuidado de
   accesibilidad (movimiento reducido, atajos 1-4, `role="img"`, guard de contraste).
6. **La etapa amateur**: es la parte que más se parece a la referencia (tres barras en tensión,
   deuda de sueño, familia) y donde elegir de verdad cambia tu destino.
7. **La pantalla de mercado**: muestra la consecuencia antes de firmar (jerarquía proyectada,
   arraigo, riesgo, negociación) y hace visible la trampa del equipo grande. Es la decisión con más
   peso del juego (contrafáctico: 42% significativo) y la más parecida a las bifurcaciones de El Ídolo.
8. **Honestidad y autocorrección**: tabla de deuda, trampas, números que empeoran reportados. El
   diagnóstico de la FASE J (§J.0) se confirma con estas mediciones: bisagra exclusiva, `main_muerto`
   en el 54% de los splits, 31% de series sin draft, pool podrido.
9. **Robustez y despliegue**: 0 crashes, 0 errores de consola, estado de 350-400 KB (entra cómodo en
   `localStorage`), cero dependencias, `dist/` estático listo para subir.

---

## 7. Lo que se hizo mal (estrategia y proceso)

1. **Se construyó el mundo antes que el juego.** Más de 13 fases de sistemas (planteles NPC, ranking
   mundial, servicio militar, lesiones, archirrival, nota anual, negociación, ventana de vuelta)
   antes de validar con una persona que el bucle central divierte. Cada sistema sumó interrupciones y
   texto; casi ninguno sumó agencia.
2. **El instrumento midió la simulación, no la experiencia.** Los 200 checks son contratos y bandas
   agregadas jugadas por bots. Ninguno medía cuánto pesa una decisión, cuánto dura la sesión o si los
   stats se saturan (J0 recién empezó). Las bandas se volvieron trinquetes (regla 17), y calibrar contra
   metas internas produjo diseños al revés, como el draft que pregunta lo obvio.
3. **Se cambió de referencia sin decirlo.** El Ídolo y Copero duran 2-5 min. El proyecto pasó a 25-40
   min en la fase 8 y siguió citándolos. Se perdió lo central de la referencia (brevedad, rejugar,
   compartir) mientras la UI y los sistemas seguían creciendo.
4. **Arreglos con parches.** El presupuesto de interrupción, los cooldowns, la fatiga, el filtro de
   bisagra y la reacción postpartido degradada a crónica atacan síntomas de "demasiadas paradas y
   demasiado contenido" en vez de reducir los puntos de decisión.
5. **Balance por promedios.** Las bandas agregadas esconden distribuciones: nadie miró que la
   mentalidad viviera en 97 ni que el 72,6% se retirara a los 34, porque como promedios "pasaban".
6. **Sobrecarga de documentación.** `PLAN.md` (5.587 líneas) más `PROGRESO.md` (6.785) suman ~900 KB,
   casi lo mismo que todo el JS de `src/`, y hay 929 referencias a fases, deudas y trampas dentro de
   comentarios del código. Cada sesión nueva gasta más contexto en documentos que en código, y
   `PLAN.md` ni siquiera se puede leer de una sola pasada (supera el límite de lectura), así que se
   entiende por partes y aparece la deriva.

---

## 8. Salud del código

| Área | Estado | Detalle |
|---|---|---|
| Arquitectura, pureza, determinismo | 🟢 excelente | `ETAPAS_SPLIT`, `aplicar(state, rng)`, cero DOM en el motor, cero azar nativo |
| Rendimiento | 🟢 | ~64 ms por carrera de 60 splits; estado final de 350-400 KB |
| Suite de verificación | 🟡 | `validate.js` es un monolito de 7.307 líneas con 200 checks (117 lentos de banda), ~31 min completo (medido el 2026-09-25; acá solo se corrió `--rapido`), sin tests unitarios ni CI. Un check rojo no dice qué función se rompió |
| Legibilidad | 🟡 | Comentarios como changelog: 25% de densidad en `core/` y 929 referencias a fases y deudas. La historia debería vivir en git, no en el código |
| Archivos grandes | 🟡 | `systems/mercado.js` 945 líneas, `amateur.js` 717, `balance.js` 1.490 (con mucha narrativa adentro) |
| Estado vestigial / ciclo | 🟡 | `career.contracts`/`hitos`, `player.titles`/`worlds` duplicados, ciclo `core/plantel.js ↔ core/mundo.js` (D59, sigue abierto) |
| Guardado | 🟡 | `VERSION = 1` nunca subió (`core/guardado.js:13`); los campos nuevos de FASE J van a cargar guardados incompatibles (riesgo 1 de J) |
| Higiene del repo | 🟡 | **9 commits sin pushear**; J3 hecho en la rama `j3-pool-oxido` (`76338ae`, worktree de Orca) sin mergear; queda la rama `faseV-V1-grok`; `DISENO.md` desactualizado desde el 2026-09-02; el `AUDITORIA.md` del 09-25 quedó superado por este |
| UI | 🟡 | `store.suscribir` y `crearDelta` sin consumidores (D57); 3.830 líneas de CSS (`pantallas.css`: 1.815) con clases muertas (D47); desborde en celular |
| Bugs menores encontrados | 🔵 | Siendo agente libre (sueldo 0), **todas las ofertas salen "BOMBAZO"** (`mercado.js:91`, sueldo > 0 × múltiplo) · "Titular" significa dos cosas distintas en la ficha (banda de NIVEL y banda de JERARQUÍA) · "Colgás los botines" |
| `server.js` (solo dev) | 🔵 | Escucha en `0.0.0.0` y no normaliza el path: mientras corre, cualquiera en tu red local puede leer archivos fuera de la carpeta con `..`. Riesgo bajo (no se despliega), arreglo de 3 líneas |

---

## 9. El plan vigente (FASE J / FASE V) frente a esto

**Qué acierta J**: J4 (la bisagra pasa a ser peso y `main_muerto` pasa a ser una transición), J3
(el pool deja de pudrirse; ya está hecho en `j3-pool-oxido`), J-previa (mostrar la probabilidad), J9
(caras de campeón), J7 (el internacional real y que el campeón del mundo salga de ese torneo:
`systems/escena.js:45` hoy lo sortea aparte) y J10 (elegir región). El diagnóstico §J.0 es correcto.

**Qué no ve o contradice J**:
1. **J5 fija "decisiones por carrera en [150, 280]"**: institucionaliza el problema de B1.
2. **J1 sin economía es inerte** (B3): mentalidad y hype saturadas hacen que el factor sea constante.
3. **J6 pide más drafts** (umbral de 0,26 a 0,10) **sin crear dilema** (B6): más clics con
   respuestas obvias o irrelevantes. El contrafáctico da el draft de serie en ruido y el de fecha en 0.
4. **J7/J8 suman interrupciones**: el propio plan estima 15-22 decisiones por split de Worlds. Es la
   pieza más cara y aleja todavía más de la brevedad. Si se hace, que el Swiss se resuelva solo y se
   decida solo en las eliminatorias.
5. **Nada en J ataca**: el puntaje y la comparación (B4), la rareza y la dificultad (B5), la
   longevidad irreal, la duración de la sesión, el celular (B7) ni la propiedad de la progresión (B8).
6. **El cierre de J se verifica con "las 9 quejas no se repiten"**, que es una prueba cualitativa de
   una sola persona. Debería tener un gate cuantitativo de agencia (la palanca de §4.3).

FASE V (el pulido visual) está bien congelada: pulir esta experiencia antes de cambiarla es pintar la
casa antes de mover las paredes.

---

## 10. Qué tendría que resolver el próximo plan (dirección, no el plan)

**Principio rector propuesto**: *menos decisiones, más grandes, que se noten, con un número al
final*. Volver a anclar el juego en la referencia sin tirar el motor.

**Decisiones que te tocan a vos antes de planificar** (cambian todo lo que sigue). D-A y D-B
reabren dos decisiones textuales tuyas de `PLAN.md` ("la larga: 25-40 min" y "el Bo5 mapa a mapa es
sistema central"). La auditoría no las cambia: muestra que son la raíz de la distancia con la
referencia, y decidir sigue siendo tuyo.
- **D-A Duración.** ¿Se mantiene "la larga: 25-40 min" como único modo, o se suma un modo corto
  (5-10 min) / selector de ritmo tipo Copero? *Recomendación: modo corto por defecto y el largo como
  opción.*
- **D-B El partido.** ¿Draft, momentos y minijuegos mapa a mapa siguen siendo centrales, o se
  reservan para finales e internacional, como en El Ídolo? *Recomendación: reservarlos y resolver el
  resto en una línea.*
- **D-C Meta social.** ¿Puntaje final + desafío diario (misma seed para todos) + comparación?
  *Recomendación: sí; es lo más barato con más impacto.* (Comparar con figuras históricas reales
  choca con `CLAUDE.md`, "rivales inventados": usar arquetipos o leyendas inventadas.)
- **D-D Dificultad objetivo.** Por ejemplo: ~35-45% llega a tier 1, título en ~25-35%, internacional
  ganado < 10%, carrera pro mediana de ~3-5 años y que menos del 5% llegue a la línea de los 34.

**Frentes candidatos** (de mayor a menor impacto por costo):
1. **El instrumento de agencia**: convertir el contrafáctico de §4.3 en herramienta permanente de
   `src/dev/` y usarlo como gate (% de interrupciones con palanca, interrupciones por carrera, minutos
   de sesión). Es barato y habilita todo lo demás.
2. **Economía con escasez**: sumideros reales de mentalidad y hype (costo por acción, retorno a una
   base, techos por contexto); retargetear el 47% de los efectos; recién después J1.
3. **Poda de interrupciones**: lo que tiene poca palanca se resuelve solo y se cuenta en una línea.
   Como máximo ~1 decisión por split, y la grande a fin de año. Minijuegos solo en finales o mapas
   decisivos (~3-6 por carrera) más un comodín tipo "arenga".
4. **Decisiones con dilema**: arquetipos de decisión como intercambios entre ejes de carrera (plata
   contra gloria, lealtad contra ambición, salud contra rendimiento, pool ancho contra maestría), con
   consecuencias que duran (`bonusPermanente` de J2, flags que abren y cierran caminos).
5. **Dificultad y longevidad realistas**: que la cima sea rara y el retiro lo decida el mercado.
   Fracasar en pro tiene que ser común y estar narrado.
6. **Meta y difusión**: puntaje por rol (`CONCEPTO` §9), potencial contra logro, puesto en la
   generación, seed diaria y el puntaje en el texto para compartir. Sin backend.
7. **Una cosa por vez en pantalla**: mobile-first, una tarjeta y un número que se mueve, paneles
   plegados en pestañas, arreglar el desborde.
8. **Progresión propia**: cartas de mejora en la pretemporada sobre las rutinas de offseason y una
   clase de jugador al arrancar.
9. **Higiene**: pushear, mergear o cerrar J3, borrar `faseV-V1-grok`, subir `VERSION` del guardado
   con migración, partir `validate.js` y sumar una capa unitaria rápida, limpiar
   comentarios-changelog, y una dieta de documentos (archivar `PROGRESO` previo a J, dejar `PLAN` con
   solo lo vivo).

**De la FASE J**: conservar J3, J4, J-previa y J9 · repensar J5 (menos decisiones, no una banda de
150-280), J6 (dilema, no cantidad) y J7/J8 (comprimidos) · J1 recién después de la economía.

---

## Apéndice A — Reproducir las mediciones

Comandos del repo que se corrieron tal cual:

```bash
node src/dev/validate.js --rapido        # 83 OK · 117 SKIP (lentos) · 0 FAIL
node src/dev/simulate.js 300 60 todas    # 0 crashes en las 3 estrategias
```

Las sondas de abajo **no viven en el repo** (corrieron desde una carpeta temporal): importan el motor
por URL absoluta (`const R = 'file:///C:/Users/Ignacio/Desktop/LOLadvancecareersimulator/src/'`) —
si el repo se mueve, cambiar esa línea. Usan solo el motor público (`createInitialState`,
`avanzarSplit`, `resolverDecision`, `avanzarSplitAuto`, `sistemaPorId`) y el `resolverAuto` de cada
sistema, igual que `simulate.js`. Seeds fijas: 1-400 en las sondas, 1-40 en el contrafáctico,
1001-1300 para la σ poblacional, `12345` y `777` en el navegador.

Las dos de navegador siguen la receta de Chromium en caché de esta máquina: `playwright-core` desde
el caché de `npx`, cargado con `createRequire`, y el `chrome.exe` de `ms-playwright/chromium-1234`
pasado por `executablePath`. Necesitan el servidor levantado en el puerto 8123: `PORT=8123 node server.js`.

<details>
<summary><b>Volumen de decisiones, saturación de stats y veredictos (§4.1, §4.2)</b> — <code>panorama.mjs</code></summary>

Cómo se corrió: `node panorama.mjs 400`

```js
const R = 'file:///C:/Users/Ignacio/Desktop/LOLadvancecareersimulator/src/';
const { mulberry32 } = await import(R + 'core/rng.js');
const { createInitialState } = await import(R + 'core/state.js');
const { avanzarSplit, resolverDecision } = await import(R + 'core/pipeline.js');
const { sistemaPorId } = await import(R + 'systems/registro.js');
const { nivelDelJugador } = await import(R + 'core/ficha.js');
const N = Number(process.argv[2] || 400);
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) * p)] : null; };
const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
const arquetipos = {}; const fines = {}; const durSplits = []; const decisPorTipo = {}; let decisTot = 0; const decisPorCarrera = [];
const mentPro = []; const hypePro = []; const decPorSplitPro = []; const decPorSplitAm = [];
const maxDecSplit = []; const titulos = []; const llegaT1 = []; const edadesRetiro = []; const splitsT1 = [];
const nivelPro = []; const posFinal = []; const nivelVsPos = [];
const logsPorSplit = []; const logsNoTecPorSplit = [];
for (let seed = 1; seed <= N; seed++) {
  const rng = mulberry32(seed); let st = createInitialState(seed, rng); let n = 0; let dc = 0;
  while (!st.terminado && n < 90) {
    const logsAntes = st.logs.length;
    let res = avanzarSplit(st, rng); st = res.state; let dSplit = 0;
    while (st.pendiente) {
      const { sistemaId, decision } = st.pendiente; const sis = sistemaPorId(sistemaId);
      const tipo = sistemaId + ':' + (decision.datos?.motivo ?? decision.presentacion ?? 'x');
      decisPorTipo[tipo] = (decisPorTipo[tipo] ?? 0) + 1; dSplit++; dc++;
      st = resolverDecision(st, sis.resolverAuto(st, decision, rng), rng).state;
    }
    const nuevos = st.logs.slice(logsAntes);
    logsPorSplit.push(nuevos.length); logsNoTecPorSplit.push(nuevos.filter((l) => !l.tecnico).length);
    if (st.phase === 'profesional') { mentPro.push(st.player.stats.mentalidad); hypePro.push(st.player.stats.hype); decPorSplitPro.push(dSplit); nivelPro.push(nivelDelJugador(st));
      if (st.career.posicion && st.career.temporada?.tabla?.length) { nivelVsPos.push([nivelDelJugador(st), 1 - (st.career.posicion - 1) / (st.career.temporada.tabla.length - 1)]); } }
    else if (st.phase === 'amateur') decPorSplitAm.push(dSplit);
    maxDecSplit.push(dSplit);
    n++;
  }
  decisTot += dc; decisPorCarrera.push(dc);
  const t = st.tarjeta; const arq = t ? t.veredicto.split(/[:.(]/)[0].replace(/\d+/g, 'N').replace(/ de [A-Z][\w .]+$/, ' de X').trim() : 'SIN_TARJETA';
  arquetipos[arq] = (arquetipos[arq] ?? 0) + 1; fines[st.finAnticipado ?? 'ninguno'] = (fines[st.finAnticipado ?? 'ninguno'] ?? 0) + 1;
  durSplits.push(st.career.registro.splitsJugados); titulos.push(st.career.registro.titulos.length);
  llegaT1.push(st.career.registro.porOrg.some((f) => f.tier === 1) ? 1 : 0); edadesRetiro.push(st.age);
  splitsT1.push(st.career.registro.porOrg.filter((f) => f.tier === 1).reduce((s, f) => s + f.splits, 0));
}
const corr = (xy) => { const mx = mean(xy.map((p) => p[0])), my = mean(xy.map((p) => p[1])); let a = 0, b = 0, c = 0; for (const [x, y] of xy) { a += (x - mx) * (y - my); b += (x - mx) ** 2; c += (y - my) ** 2; } return a / Math.sqrt(b * c); };
const ord = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v} (${(100 * v / N).toFixed(1)}%)`);
console.log(JSON.stringify({
  N, decisionesPorCarrera: { media: mean(decisPorCarrera).toFixed(1), p10: pct(decisPorCarrera, .1), p50: pct(decisPorCarrera, .5), p90: pct(decisPorCarrera, .9) },
  decisionesPorTipo: Object.entries(decisPorTipo).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${(v / N).toFixed(1)}/carrera (${(100 * v / decisTot).toFixed(1)}%)`),
  decPorSplitPro: { media: mean(decPorSplitPro).toFixed(2), p50: pct(decPorSplitPro, .5), p90: pct(decPorSplitPro, .9), max: Math.max(...decPorSplitPro), pctSplitsConMasDe2: (100 * decPorSplitPro.filter((d) => d > 2).length / decPorSplitPro.length).toFixed(1) },
  decPorSplitAmateur: { media: mean(decPorSplitAm).toFixed(2), max: Math.max(...decPorSplitAm) },
  logsPorSplit: { media: mean(logsPorSplit).toFixed(1), noTecnicosMedia: mean(logsNoTecPorSplit).toFixed(1), p90: pct(logsPorSplit, .9) },
  mentalidadEnPro: { media: mean(mentPro).toFixed(1), p10: pct(mentPro, .1), p50: pct(mentPro, .5), pctMayor90: (100 * mentPro.filter((m) => m >= 90).length / mentPro.length).toFixed(1) },
  hypeEnPro: { media: mean(hypePro).toFixed(1), p10: pct(hypePro, .1), p50: pct(hypePro, .5), pctMayor90: (100 * hypePro.filter((m) => m >= 90).length / hypePro.length).toFixed(1) },
  rNivelPosicionSplit: corr(nivelVsPos).toFixed(3),
  duracionSplits: { media: mean(durSplits).toFixed(1), p10: pct(durSplits, .1), p50: pct(durSplits, .5), p90: pct(durSplits, .9) },
  edadRetiro: { media: mean(edadesRetiro).toFixed(1), p50: pct(edadesRetiro, .5) },
  pctLlegaTier1: (100 * mean(llegaT1)).toFixed(1), splitsTier1Medio: mean(splitsT1).toFixed(1),
  titulos: { media: mean(titulos).toFixed(2), pctConAlMenos1: (100 * titulos.filter((x) => x > 0).length / N).toFixed(1) },
  finales: ord(fines), arquetipos: ord(arquetipos)
}, null, 1));
```

</details>

<details>
<summary><b>Longevidad y retiro forzoso (§4.2)</b> — <code>retiro.mjs</code></summary>

Cómo se corrió: `node retiro.mjs`

```js
const R = 'file:///C:/Users/Ignacio/Desktop/LOLadvancecareersimulator/src/';
const { mulberry32 } = await import(R + 'core/rng.js');
const { createInitialState } = await import(R + 'core/state.js');
const { avanzarSplitAuto } = await import(R + 'core/pipeline.js');
const N = 400; let forzoso = 0, pro = 0, declive = 0; const edadesPro = {}; let vuelta = 0; const aniosCarreraPro = [];
for (let seed = 1; seed <= N; seed++) {
  const rng = mulberry32(seed); let st = createInitialState(seed, rng); let n = 0; let preguntaDeclive = false;
  while (!st.terminado && n < 90) { const r = avanzarSplitAuto(st, rng); if (r.logs.some((l) => /el mercado te está diciendo|Decidís seguir|retirás a los/.test(l.message))) preguntaDeclive = true; st = r.state; n++; }
  if (st.splitFichaje === null) continue;
  pro++;
  edadesPro[st.age] = (edadesPro[st.age] ?? 0) + 1;
  if (st.age >= 34) forzoso++;
  if (st.flags.vueltasUsadas > 0) vuelta++;
  aniosCarreraPro.push((st.player.splitCount - st.splitFichaje) / 3);
}
aniosCarreraPro.sort((a, b) => a - b);
console.log({ carrerasPro: pro, pctTerminaEnLineaFaker34: (100 * forzoso / pro).toFixed(1), pctUsoVuelta: (100 * vuelta / pro).toFixed(1),
  aniosDeCarreraProMediana: aniosCarreraPro[Math.floor(aniosCarreraPro.length / 2)].toFixed(1), p10: aniosCarreraPro[Math.floor(aniosCarreraPro.length * 0.1)].toFixed(1),
  pctMenosDe4Anios: (100 * aniosCarreraPro.filter((a) => a < 4).length / pro).toFixed(1), edadesRetiroPro: edadesPro });
```

</details>

<details>
<summary><b>Carga de lectura del catálogo (§4.1)</b> — <code>lectura.mjs</code></summary>

Cómo se corrió: `node lectura.mjs`

```js
const R = 'file:///C:/Users/Ignacio/Desktop/LOLadvancecareersimulator/src/';
const { TODOS_LOS_EVENTOS } = await import(R + 'data/events/index.js');
const w = (t) => (Array.isArray(t) ? t[0] : (t ?? '')).split(/\s+/).filter(Boolean).length;
let tarjeta = [], resultado = [];
let nOps = 0, ops2 = 0, ops3 = 0, ops4 = 0;
for (const e of TODOS_LOS_EVENTOS) {
  const ops = e.options ?? [];
  nOps += ops.length; if (ops.length === 2) ops2++; else if (ops.length === 3) ops3++; else if (ops.length >= 4) ops4++;
  tarjeta.push(w(e.title) + w(e.description) + ops.reduce((s, o) => s + w(o.label) + w(o.descripcion), 0));
  for (const o of ops) for (const oc of o.outcomes ?? []) resultado.push(w(oc.texto));
}
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
console.log({ eventos: TODOS_LOS_EVENTOS.length, opciones: nOps, eventosCon2: ops2, con3: ops3, con4: ops4,
  palabrasPorTarjetaMedia: mean(tarjeta).toFixed(0), palabrasPorResultadoMedia: mean(resultado).toFixed(0) });
```

</details>

<details>
<summary><b>Experimento contrafáctico de agencia (§4.3)</b> — <code>agencia.mjs</code></summary>

Cómo se corrió: `8 procesos en paralelo: node agencia.mjs 5 8 2 70 <desde>, con desde = 1, 6, 11, … 36 → agencia_s0.json … agencia_s7.json`

```js
const R = 'file:///C:/Users/Ignacio/Desktop/LOLadvancecareersimulator/src/';
const { mulberry32 } = await import(R + 'core/rng.js');
const { createInitialState } = await import(R + 'core/state.js');
const { avanzarSplit, resolverDecision, avanzarSplitAuto } = await import(R + 'core/pipeline.js');
const { sistemaPorId } = await import(R + 'systems/registro.js');
const { nivelDelJugador } = await import(R + 'core/ficha.js');

const [,, NCARR = "40", REPS = "6", CUOTA = "2", MAXSPLITS = "70", DESDE = "1"] = process.argv;
const nCarr = Number(NCARR), reps = Number(REPS), cuota = Number(CUOTA), maxSplits = Number(MAXSPLITS);

function hash(...xs) { let h = 2166136261 >>> 0; for (const x of xs.join('|')) { h ^= x.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }

function score(st) {
  const r = st.career.registro;
  const intBuenos = r.internacionales.filter((i) => i.resultado === 'buen_papel').length;
  const intTot = r.internacionales.length;
  const t1 = r.porOrg.filter((f) => f.tier === 1).reduce((s, f) => s + f.splits, 0);
  const rank = r.picos.rankMundial ?? 0;
  return 10 * r.titulos.length + 15 * intBuenos + 5 * (intTot - intBuenos) + (rank > 0 ? (21 - rank) * 2 : 0) + t1 + (st.splitFichaje !== null ? 10 : 0);
}
function metricas(st) {
  const r = st.career.registro;
  return {
    score: score(st),
    titulos: r.titulos.length,
    t1: r.porOrg.some((f) => f.tier === 1) ? 1 : 0,
    splits: r.splitsJugados,
    rank: r.picos.rankMundial ?? 0
  };
}
function corto(st) {
  return {
    pos: st.career.posicion ?? null,
    nivel: nivelDelJugador(st),
    jer: st.career.jerarquia,
    ment: st.player.stats.mentalidad,
    hype: st.player.stats.hype,
    elo: st.player.soloqElo
  };
}
function resolverAutoDefault(sistema, st, decision, rng) { return sistema.resolverAuto(st, decision, rng); }

function terminarCarrera(st, rng, splitsHechos) {
  let s = st; let n = splitsHechos; let corto1 = null;
  while (s.pendiente) {
    const { sistemaId, decision } = s.pendiente; const sis = sistemaPorId(sistemaId);
    s = resolverDecision(s, sis.resolverAuto(s, decision, rng), rng).state;
  }
  const splitAlDecidir = st.player.splitCount;
  while (!s.terminado && n < maxSplits) {
    s = avanzarSplitAuto(s, rng).state; n += 1;
    if (corto1 === null && s.player.splitCount >= splitAlDecidir + 1) corto1 = corto(s);
  }
  return { fin: metricas(s), c1: corto1 ?? corto(s) };
}

function opcionesDe(decision) {
  const esMini = decision.presentacion === 'minijuego' || decision.datos?.motivo === 'minijuego';
  if (esMini) return [{ resultado: 0.15, _l: 'mal' }, { resultado: 0.85, _l: 'bien' }];
  if (decision.presentacion === 'mercado' || (decision.opciones?.[0]?.salarioAnualUSD !== undefined && decision.datos?.motivo !== 'traspaso')) {
    const ops = (decision.opciones ?? []).map((o) => ({ opcionId: o.id, _l: o.org ?? o.id }));
    return [...ops, { negociar: 'esperar', _l: 'esperar' }];
  }
  return (decision.opciones ?? []).map((o) => ({ opcionId: o.id, _l: o.id }));
}
function tipoDe(sistemaId, decision) {
  const m = decision.datos?.motivo ?? decision.presentacion ?? 'x';
  const cat = decision.datos?.evento?.categoria;
  return `${sistemaId}:${m}${cat ? ':' + cat : ''}`;
}

const resultados = [];
const baseline = [];
for (let seed = Number(DESDE); seed < Number(DESDE) + nCarr; seed++) {
  const rng = mulberry32(seed);
  let st = createInitialState(seed, rng);
  let splits = 0; const usados = {};
  while (!st.terminado && splits < maxSplits) {
    let res = avanzarSplit(st, rng); st = res.state;
    while (st.pendiente) {
      const { sistemaId, decision } = st.pendiente;
      const tipo = tipoDe(sistemaId, decision);
      const ops = opcionesDe(decision);
      if (ops.length >= 2 && (usados[tipo] ?? 0) < cuota) {
        usados[tipo] = (usados[tipo] ?? 0) + 1;
        const porOpcion = ops.map(() => []);
        for (let r = 0; r < reps; r++) {
          ops.forEach((op, i) => {
            const rr = mulberry32(hash(seed, splits, tipo, r));
            const clon = structuredClone(st);
            const { _l, ...resp } = op;
            let s2;
            try { s2 = resolverDecision(clon, resp, rr).state; } catch (e) { porOpcion[i].push(null); return; }
            porOpcion[i].push(terminarCarrera(s2, rr, splits));
          });
        }
        resultados.push({ seed, split: splits, tipo, labels: ops.map((o) => o._l), porOpcion });
      }
      const sis = sistemaPorId(sistemaId);
      st = resolverDecision(st, sis.resolverAuto(st, decision, rng), rng).state;
    }
    splits += 1;
  }
  baseline.push(metricas(st));
  process.stderr.write(`seed ${seed} ok (${resultados.length} decisiones medidas)\n`);
}
console.log(JSON.stringify({ baseline, resultados }));
```

</details>

<details>
<summary><b>Análisis del contrafáctico (§4.3)</b> — <code>analisis.mjs</code></summary>

Cómo se corrió: `node analisis.mjs  (en la carpeta de los agencia_s*.json)`

```js
import fs from 'fs';
const R = 'file:///C:/Users/Ignacio/Desktop/LOLadvancecareersimulator/src/';
const { mulberry32 } = await import(R + 'core/rng.js');
const { createInitialState } = await import(R + 'core/state.js');
const { avanzarSplitAuto } = await import(R + 'core/pipeline.js');
function score(st) {
  const r = st.career.registro;
  const intBuenos = r.internacionales.filter((i) => i.resultado === 'buen_papel').length;
  const intTot = r.internacionales.length;
  const t1 = r.porOrg.filter((f) => f.tier === 1).reduce((s, f) => s + f.splits, 0);
  const rank = r.picos.rankMundial ?? 0;
  return 10 * r.titulos.length + 15 * intBuenos + 5 * (intTot - intBuenos) + (rank > 0 ? (21 - rank) * 2 : 0) + t1 + (st.splitFichaje !== null ? 10 : 0);
}
const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1)); };
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
// sigma poblacional
const pop = []; const popT = [];
for (let seed = 1001; seed <= 1300; seed++) { const rng = mulberry32(seed); let st = createInitialState(seed, rng); let n = 0; while (!st.terminado && n < 70) { st = avanzarSplitAuto(st, rng).state; n++; } pop.push(score(st)); popT.push(st.career.registro.titulos.length); }
const sPop = sd(pop), sPopT = sd(popT);
const archivos = fs.readdirSync('.').filter((f) => /^agencia_s\d+\.json$/.test(f) && fs.statSync(f).size > 0);
const res = archivos.flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')).resultados);
const TCRIT = 2.365; // df=7, p<0.05 bilateral
const porTipo = {};
for (const d of res) {
  const vals = d.porOpcion.map((reps) => reps.filter(Boolean));
  if (vals.some((v) => v.length < 4)) continue;
  const medias = vals.map((v) => mean(v.map((x) => x.fin.score)));
  const iMax = medias.indexOf(Math.max(...medias)), iMin = medias.indexOf(Math.min(...medias));
  const spread = medias[iMax] - medias[iMin];
  const n = Math.min(vals[iMax].length, vals[iMin].length);
  const dif = Array.from({ length: n }, (_, r) => vals[iMax][r].fin.score - vals[iMin][r].fin.score);
  const t = mean(dif) / (sd(dif) / Math.sqrt(n) || 1e-9);
  const dentro = mean(vals.map((v) => sd(v.map((x) => x.fin.score))));
  const mT = vals.map((v) => mean(v.map((x) => x.fin.titulos)));
  const mT1 = vals.map((v) => mean(v.map((x) => x.fin.t1)));
  const corto = (k) => { const m = vals.map((v) => mean(v.map((x) => x.c1[k] ?? 0))); return Math.max(...m) - Math.min(...m); };
  const tipo = d.tipo.replace(/:x:/, ':').replace(/^eventos:.*/, (s) => s).replace(/^edadCierre:.*/, 'edadCierre:*');
  const clave = tipo.startsWith('eventos:') ? 'eventos:*' : tipo;
  for (const k of [clave, tipo !== clave ? tipo : null].filter(Boolean)) {
    (porTipo[k] ??= []).push({ L: spread / sPop, sig: Math.abs(t) > TCRIT, dentroRel: dentro / sPop, dTit: Math.max(...mT) - Math.min(...mT), dT1: Math.max(...mT1) - Math.min(...mT1),
      dPos: corto('pos'), dNivel: corto('nivel'), dJer: corto('jer'), dMent: corto('ment'), dHype: corto('hype'), dElo: corto('elo') });
  }
}
const filas = Object.entries(porTipo).filter(([, v]) => v.length >= 4).sort((a, b) => med(b[1].map((x) => x.L)) - med(a[1].map((x) => x.L)));
console.log(`decisiones medidas: ${res.length} | sigma_pob(score)=${sPop.toFixed(1)} media=${mean(pop).toFixed(1)} | sigma_pob(titulos)=${sPopT.toFixed(2)}`);
console.log('tipo | n | palanca mediana (Δscore/σ) | % con efecto significativo | ruido dentro de la opción (σ/σpob) | Δtítulos med | ΔP(tier1) med | Δpos 1 split | Δnivel | Δjer | Δment | Δhype | Δelo');
for (const [k, v] of filas) {
  console.log([k, v.length, med(v.map((x) => x.L)).toFixed(2), (100 * mean(v.map((x) => (x.sig ? 1 : 0)))).toFixed(0) + '%', med(v.map((x) => x.dentroRel)).toFixed(2), med(v.map((x) => x.dTit)).toFixed(2), med(v.map((x) => x.dT1)).toFixed(2), med(v.map((x) => x.dPos)).toFixed(2), med(v.map((x) => x.dNivel)).toFixed(1), med(v.map((x) => x.dJer)).toFixed(1), med(v.map((x) => x.dMent)).toFixed(1), med(v.map((x) => x.dHype)).toFixed(1), med(v.map((x) => x.dElo)).toFixed(0)].join(' | '));
}
```

</details>

<details>
<summary><b>Estrategias consistentes y minijuegos perfectos vs. fallados (§4.3)</b> — <code>estrategia.mjs</code></summary>

Cómo se corrió: `node estrategia.mjs`

```js
const R = 'file:///C:/Users/Ignacio/Desktop/LOLadvancecareersimulator/src/';
const { mulberry32 } = await import(R + 'core/rng.js');
const { createInitialState } = await import(R + 'core/state.js');
const { avanzarSplitAuto } = await import(R + 'core/pipeline.js');
function score(st) { const r = st.career.registro; const ib = r.internacionales.filter((i) => i.resultado === 'buen_papel').length; const it = r.internacionales.length;
  const t1 = r.porOrg.filter((f) => f.tier === 1).reduce((s, f) => s + f.splits, 0); const rank = r.picos.rankMundial ?? 0;
  return 10 * r.titulos.length + 15 * ib + 5 * (it - ib) + (rank > 0 ? (21 - rank) * 2 : 0) + t1 + (st.splitFichaje !== null ? 10 : 0); }
const esNarrativa = (sistema, d) => ['eventos', 'edadCierre'].includes(sistema.id) || (sistema.id === 'temporada' && d.datos?.motivo === 'momento');
function pol(nombre) {
  return (sistema, st, d, rng) => {
    if (esNarrativa(sistema, d) && d.opciones?.length) {
      if (nombre === 'primera') return { opcionId: d.opciones[0].id };
      if (nombre === 'ultima') return { opcionId: d.opciones[d.opciones.length - 1].id };
      if (nombre === 'riesgo') { const o = [...d.opciones].sort((a, b) => ({ ruleta: 2, medio: 1, seguro: 0 }[b.riesgo] ?? 1) - ({ ruleta: 2, medio: 1, seguro: 0 }[a.riesgo] ?? 1))[0]; return { opcionId: o.id }; }
      if (nombre === 'seguro') { const o = [...d.opciones].sort((a, b) => ({ ruleta: 2, medio: 1, seguro: 0 }[a.riesgo] ?? 1) - ({ ruleta: 2, medio: 1, seguro: 0 }[b.riesgo] ?? 1))[0]; return { opcionId: o.id }; }
    }
    if ((d.presentacion === 'minijuego' || d.datos?.motivo === 'minijuego') && (nombre === 'mini_bien' || nombre === 'mini_mal')) return { resultado: nombre === 'mini_bien' ? 1 : 0 };
    return sistema.resolverAuto(st, d, rng);
  };
}
const N = 300; const out = {};
for (const nombre of ['default', 'primera', 'ultima', 'riesgo', 'seguro', 'mini_bien', 'mini_mal']) {
  const sc = []; let tit = 0; let t1 = 0;
  for (let seed = 1; seed <= N; seed++) { const rng = mulberry32(seed); let st = createInitialState(seed, rng); let n = 0;
    while (!st.terminado && n < 70) { st = avanzarSplitAuto(st, rng, nombre === 'default' ? undefined : pol(nombre)).state; n++; }
    sc.push(score(st)); tit += st.career.registro.titulos.length; t1 += st.career.registro.porOrg.some((f) => f.tier === 1) ? 1 : 0; }
  const m = sc.reduce((s, x) => s + x, 0) / N; const sd = Math.sqrt(sc.reduce((s, x) => s + (x - m) ** 2, 0) / (N - 1));
  out[nombre] = { scoreMedio: m.toFixed(1), sd: sd.toFixed(1), titulosMedios: (tit / N).toFixed(2), pctTier1: (100 * t1 / N).toFixed(1) };
}
console.log(out);
```

</details>

<details>
<summary><b>Carrera completa jugada en Chromium (§4.1, B7)</b> — <code>play.mjs</code></summary>

Cómo se corrió: `node play.mjs instantaneo <carpeta> 12345 9   y   node play.mjs x1 <carpeta> 12345 44`

```js
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Ignacio/AppData/Local/npm-cache/_npx/e058441c325e062a/node_modules/playwright-core');
const EXE = 'C:/Users/Ignacio/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const [,, velocidad = 'instantaneo', outDir = '.', seed = '12345', maxMin = '40'] = process.argv;
const t0 = Date.now();
const el = () => ((Date.now() - t0) / 1000).toFixed(1);
let s = 7; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errores = [];
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
page.on('pageerror', (e) => errores.push('PAGEERROR ' + e.message));
await page.addInitScript((v) => { try { localStorage.clear(); localStorage.setItem('lolcs-velocidad-reproductor', v); } catch {} }, velocidad);
await page.goto(`http://localhost:8123/?seed=${seed}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/00_setup.png` });
// rol
const roles = page.locator('#rolGrid button, #rolGrid [role="button"], #rolGrid > *');
const nRoles = await roles.count();
await roles.nth(2 % Math.max(1, nRoles)).click();
await page.waitForTimeout(300);
for (let i = 0; i < 3; i++) { await page.locator('#campeonGrid .campeon-tile:not(.campeon-tile--elegido)').nth(0).click(); await page.waitForTimeout(150); }
await page.screenshot({ path: `${outDir}/01_setup_lleno.png` });
await page.locator('#run').click();
const log = []; const tiposVistos = new Set(); let n = 0; let shotsMain = 0;
const visible = async (sel) => page.locator(sel).isVisible().catch(() => false);
while (true) {
  if ((Date.now() - t0) / 60000 > Number(maxMin)) { log.push({ t: el(), tipo: 'TIMEOUT' }); break; }
  if (await visible('#tarjeta')) { await page.waitForTimeout(800); await page.screenshot({ path: `${outDir}/zz_tarjeta.png`, fullPage: true }); log.push({ t: el(), tipo: 'TARJETA' }); break; }
  if (await visible('#decision')) {
    const titulo = (await page.locator('#decisionTitle').textContent().catch(() => '')) || '';
    const tab = await page.locator('#decision').getAttribute('data-tab-label').catch(() => '');
    const opts = page.locator('#decisionOptions .option-btn:not([disabled])');
    const k = await opts.count();
    n++;
    const tipo = 'decision:' + (tab || '?');
    if (!tiposVistos.has(tipo) || n % 25 === 0) { tiposVistos.add(tipo); await page.screenshot({ path: `${outDir}/d${String(n).padStart(3,'0')}_${(tab||'x').replace(/[^a-z0-9]/gi,'_')}.png` }); }
    log.push({ t: el(), n, tipo, titulo: titulo.slice(0, 90), opciones: k });
    if (k > 0) await opts.nth(Math.floor(rnd() * k)).click();
    await page.waitForTimeout(120);
    continue;
  }
  if (await visible('#mercado')) {
    n++;
    const titulo = (await page.locator('#mercadoTitle').textContent().catch(() => '')) || '';
    if (!tiposVistos.has('mercado') || n % 25 === 0) { tiposVistos.add('mercado'); await page.screenshot({ path: `${outDir}/d${String(n).padStart(3,'0')}_mercado.png`, fullPage: true }); }
    const firmar = page.locator('#mercadoGrid button', { hasText: /Firmar|Aceptar|Renovar/i });
    const kf = await firmar.count();
    log.push({ t: el(), n, tipo: 'mercado', titulo: titulo.slice(0, 90), opciones: kf });
    if (kf > 0) await firmar.nth(Math.floor(rnd() * kf)).click();
    else if (await visible('#mercadoEsperar')) await page.locator('#mercadoEsperar').click();
    else { const any = page.locator('#mercadoGrid button'); if (await any.count()) await any.first().click(); }
    await page.waitForTimeout(120);
    continue;
  }
  if (await visible('#minijuego')) {
    n++;
    const titulo = (await page.locator('#minijuegoTitle').textContent().catch(() => '')) || '';
    if (!tiposVistos.has('mini:' + titulo)) { tiposVistos.add('mini:' + titulo); await page.screenshot({ path: `${outDir}/d${String(n).padStart(3,'0')}_minijuego.png` }); }
    log.push({ t: el(), n, tipo: 'minijuego', titulo: titulo.slice(0, 90) });
    for (let i = 0; i < 40; i++) {
      if (await page.locator('#minijuegoWidget .minijuego-resultado').count()) break;
      if (!(await visible('#minijuego'))) break;
      const b = page.locator('#minijuegoWidget button:visible');
      if (await b.count()) { await b.nth(Math.floor(rnd() * (await b.count()))).click({ timeout: 500 }).catch(() => {}); }
      await page.keyboard.press('Space').catch(() => {});
      await page.waitForTimeout(250 + Math.floor(rnd() * 300));
    }
    await page.waitForTimeout(1800);
    continue;
  }
  if (await visible('#nuevaCarrera')) { log.push({ t: el(), tipo: 'FIN_SIN_TARJETA' }); await page.screenshot({ path: `${outDir}/zz_fin.png`, fullPage: true }); break; }
  if (shotsMain < 3 && n > 0 && n % 10 === 0) { shotsMain++; await page.screenshot({ path: `${outDir}/main_${n}.png` }); }
  await page.waitForTimeout(150);
}
const ficha = await page.locator('#fichaContainer').innerText().catch(() => '');
console.log(JSON.stringify({ velocidad, seed, segundos: Number(el()), decisiones: n, errores, log, fichaFinal: ficha.slice(0, 1500) }, null, 1));
await browser.close();
```

</details>

<details>
<summary><b>Vista de celular a 390 px (B7)</b> — <code>movil.mjs</code></summary>

Cómo se corrió: `node movil.mjs <carpeta>`

```js
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Ignacio/AppData/Local/npm-cache/_npx/e058441c325e062a/node_modules/playwright-core');
const EXE = 'C:/Users/Ignacio/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('lolcs-velocidad-reproductor', 'instantaneo'); } catch {} });
await page.goto('http://localhost:8123/?seed=777', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/m0_setup.png` });
await page.locator('#rolGrid > *').nth(1).click();
for (let i = 0; i < 3; i++) { await page.locator('#campeonGrid .campeon-tile:not(.campeon-tile--elegido)').nth(0).click(); await page.waitForTimeout(100); }
await page.locator('#run').click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/m1_primera.png` });
const scrollH = await page.evaluate(() => document.documentElement.scrollHeight);
const anchoDoc = await page.evaluate(() => document.documentElement.scrollWidth);
console.log(JSON.stringify({ scrollH, anchoDoc }));
// avanzar unas decisiones
for (let k = 0; k < 25; k++) {
  const opt = page.locator('#decisionOptions .option-btn:not([disabled])');
  if (await opt.count()) { await opt.first().click(); await page.waitForTimeout(250); continue; }
  const f = page.locator('#mercadoGrid button', { hasText: /Firmar/ }); if (await f.count()) { await f.first().click(); await page.waitForTimeout(250); continue; }
  const b = page.locator('#minijuegoWidget button:visible'); if (await b.count()) { await b.first().click().catch(()=>{}); await page.waitForTimeout(2200); continue; }
  await page.waitForTimeout(300);
}
await page.screenshot({ path: `${out}/m2_luego.png` });
await page.screenshot({ path: `${out}/m3_luego_full.png`, fullPage: true });
await browser.close();
```

</details>

---

## Fuentes de la investigación (§2)

- [El Ídolo: el juego viral que crea tu carrera como futbolista en minutos (MDZ)](https://www.mdzol.com/tendencias/el-idolo-el-juego-viral-que-crea-tu-carrera-como-futbolista-minutos-n1573937)
- [Potrero estrenó la nueva versión de El Ídolo (Bardeo)](https://bardeo.news/entretenimiento/potrero-estreno-la-nueva-version-de-el-idolo--que-trae-y-como-jugar_a6a6a240272ebf7a48e45fc96)
- [Furor en las redes: cómo se juega El Ídolo (El Destape)](https://www.eldestapeweb.com/tecnologia/furor-redes-juega-idolo-simulador-futbolero-momento-2026730184550)
- [App Potrero – El Ídolo (App Store)](https://apps.apple.com/ar/app/potrero-el-%C3%ADdolo/id6775603816)
- [POTRERO en X: El Ídolo 2.1](https://x.com/potrero_app/status/2083318696978870572)
- [Si te gustó Copero, te va a encantar El Ídolo (ABC Color)](https://www.abc.com.py/espectaculos/videojuegos/2026/08/14/fan-de-los-futbol-managers-si-te-gusto-copero-te-va-encantar-el-idolo-de-potrero/)
- [Qué son Copero y El Ídolo (Diario Huarpe)](https://www.diariohuarpe.com/nota/que-son-copero-y-el-idolo-los-juegos-de-futbol-que-son-furor-en-redes-202672616120)
- [Copero Game — Free Football Career Simulator](https://copero.me/en)
- [Qué es Copero (TV Azteca)](https://www.tvazteca.com/aztecadeportes/que-es-copero-juego-viral-internet-simulador-carrera-futbol/)
- [Gratuito y adictivo: cómo es Copero (Rosario3)](https://www.rosario3.com/tecnologia/gratuito-y-adictivo-como-es-copero-el-videojuego-tendencia-que-simula-una-carrera-futbolistica-20260724-0029.html)
- [Qué es y cómo jugar Copero (LM Neuquén)](https://www.lmneuquen.com/deportes/que-es-y-como-jugar-copero-el-videojuego-virtual-futbol-viral-gratis-y-adictivo-n1247823)
- [Minijuegos de fútbol que se volvieron tendencia (Canal 26)](https://www.canal26.com/deportes/2026/07/28/los-minijuegos-de-futbol-gratuitos-que-se-volvieron-tendencia-al-igual-que-copero-de-que-tratan-7-0-y-el-idolo/)
