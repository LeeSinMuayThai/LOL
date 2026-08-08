# PLAN — de simulador roto a modo carrera de LoL

> **Este documento es el plan completo, fase por fase, hasta el juego terminado.**
> Nada se planea en el momento: si algo no está acá, no se hace hasta escribirlo acá.
> `PROGRESO.md` cuenta lo que ya pasó y con qué números; este documento cuenta lo que falta.
> Los datos de investigación (ligas 2026, salarios, duración de carreras, Fearless) viven en
> `TRASPASO.md` PARTE 4 y **no hay que volver a investigarlos**.

Orden de lectura para quien abre el proyecto: `CLAUDE.md` (reglas duras) → `CONCEPTO.md` (qué es
el juego) → este documento → `PROGRESO.md` (changelog) → `TRASPASO.md` (datos de investigación).

---

## Estado

| Fase | Qué resuelve | Estado |
|---|---|---|
| **0** | Higiene: números, gating, texto narrativo | ✅ commit `cac4af2` |
| **1** | Identidad: elegís rol y mains, y eso importa | ✅ ver `PROGRESO.md` |
| **2** | Que las decisiones pesen: pesos dinámicos, densidad | ✅ ver `PROGRESO.md` |
| **2** | Que las decisiones pesen: pesos dinámicos, densidad | ⬜ |
| **3** | Escalera competitiva: tier3 → tier2 → tier1, ligas 2026 | ⬜ |
| **4** | Competición jugable: series Bo5, Fearless, draft, minijuegos | ⬜ |
| **5** | Mercado: ofertas, contratos, salarios, imports | ⬜ |
| **6** | Final emergente: retiro, servicio militar, lesiones, vuelta | ⬜ |
| **7** | Contenido a escala (150+ opciones) | ⬜ |
| **8** | Legado, rivales y UI | ⬜ |

---

## Decisiones del usuario (textuales — respetarlas, no volver a preguntar)

| Tema | Decisión |
|---|---|
| **Duración / profundidad** | **La larga: 25-40 min.** El Bo5 mapa a mapa es sistema central, no opcional |
| **Duración de la carrera** | *"para mí los splits no tienen que estar fixed, si no sos bueno no tenés ofertas, si sos muy bueno tu carrera dura como la de Peanut o Faker"* → **emergente del mercado, nunca de un reloj** |
| **Minijuegos** | *"tiene que haber minijuegos, porque si está solo determinado por las stats es muy predecible, pero que tampoco todo sea un gambling a los minijuegos"* → varianza controlada por el jugador, dentro de las competiciones |
| **Draft** | *"yo jamás dije que sí o sí tenés que draftear cada partida"* → el motor elige solo; te para cuando la elección deja de ser obvia |
| **Champion pool** | *"elegías tu champion pool, POR EJEMPLO, si elegías jg, Lee Sin, Wukong, Elise eran tus mejores champs elegidos por vos, y que quizás el meta en la season ficticia era Sejuani, Nidalee y Jarvan y que te salían eventos o preguntas de si practicar más, o eventos tipo: salió un nuevo champ y jugás en 2 semanas — practicarlo a full para ir con más pool, o pulir los de ahora y aprenderlo después del match"* |
| **Alcance** | Agresivo donde haga falta: esquema de eventos, ejes de contexto, `leagues.json` y UI se reescriben. Los checks se mantienen y se agregan; el balance se re-mide desde cero |
| **Ligas** | *"ligas 2026 exactas, y que puedas arrancar en equipos ficticios de tier3 pero máximo que eso dure muy poco usualmente, y recordá que haya eventos del equipo"* |
| **Ranked** | Escalera visible completa. **Sin decay**: *"si sos pro player vas a tener siempre que jugar soloq así que decaer no tendría mucho sentido"* |
| **Seed vs. elección** | *"lo podemos ver después"* → **parkeado**. Mientras tanto: el mundo sale de la seed, tu identidad la elegís vos |
| **La plata** | No es gastable (`CONCEPTO` §11: no es un manager). Es métrica de la tarjeta final, gate de eventos y peso en las ofertas |

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
- **La cuota coreana de soloQ** — dato real de `TRASPASO` §4.5, prometido en `CONCEPTO` §7 y nunca
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
> no el volumen total, que se vuelve a medir en la fase 8.

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

Rosters exactos en `TRASPASO` §4.3. Esquema ampliado por liga: `edadMinima`, `cupoImports: 2`,
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
  completo llega en la fase 5; el movimiento entre tiers ya es una decisión desde acá).
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
   │     (solo con relación ≥70 — necesita la fase 7)  −tuyo +del equipo  │
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

`CONCEPTO.md` §5 y §11 hay que actualizarlos: §5 describe los playoffs sin serie y §11 dice que los
minijuegos "aparecen solo en momentos bisagra" sin definir la cuota.

---

# FASE 5 — Mercado: ofertas, contratos, salarios, imports

**Acá es donde la carrera deja de tener duración fija.**

## 5.1 — `src/core/salarios.js` — lognormal

Mediana muy por debajo de la media: LEC media €240k, **mediana ~€165k**, rookie ~€115k.
Por rol: Mid €345k · Jungla €250k · ADC €240k · Top €192k · Support €168k. Ningún LEC supera €1M
desde 2024; solo LCK/LPL habilitan los $6-8M de Faker. Premios marginales a propósito: Doublelift
acumuló ~$300k en premios **en toda su carrera**.

```js
salarioDeOferta(liga, { rol, jerarquia, hype, edad, esImport }, rng)
  base  = liga.salario.medianaUSD
  mult  = exp(gauss(0, liga.salario.sigma))          // mediana << media
  mult *= factorRol[rol]
  mult *= 0.6 + (jerarquia / 100) * 1.1
  mult *= 0.85 + (hype / 100) * 0.45
  return max(liga.salario.minimoUSD, base * mult)
```

## 5.2 — `src/core/valorMercado.js` — la pieza clave

```
valorDeMercado = f(rendimientoReciente, jerarquia, hype, residencia, signature) × sesgoEtario

sesgoEtario:  ≤22 → 1.00 · 23 → 0.95 · 24 → 0.88 · 25 → 0.78 · 26 → 0.66
              27 → 0.52 · 28 → 0.40 · 29 → 0.30 · 30 → 0.22 · 31+ → 0.15
```

Un jugador de 28 con la hoja idéntica a la de uno de 21 recibe **40% de las ofertas**. No juega
peor: el mercado dejó de mirarlo.

> **El hallazgo que gobierna todo esto:** el declive casi **no es biológico**. El tiempo de reacción
> cae ~1 ms/año después de los 25, contra **90 ms** de brecha entre un casual y un pro. Es ruido.
> La causa modal de retiro es **que no te renuevan**, sistemáticamente sub-reportada porque nadie
> anuncia "me retiro porque nadie me contrata". → Se modela **presión de mercado, no decadencia de
> stats**.

Reusar la forma de `BALANCE.amateur.scoutingSesgoEtario`, que ya hace exactamente esto en la etapa
amateur, para que el juego tenga **un solo modelo** de "el mercado prefiere jóvenes".

`atributos.js`: la curva de declive **no se borra** (`CONCEPTO` §6 la pide y es la razón mecánica
para invertir en macro) pero se **suaviza ~40%**: sigue perceptible, deja de ser lo que te retira.

## 5.3 — `src/systems/mercado.js` (nuevo, offseason)

1. Calcula `valorDeMercado`.
2. Renovación o no → `contexto.mercado = 'sin_renovacion'` con contenido propio.
3. **0-3 ofertas**, filtradas por cupo de imports y edad mínima, con la **trampa del equipo grande
   visible** (`CONCEPTO` §7: firmar con un gigante resetea tu jerarquía → volvés a ser uno más →
   no te dan tus picks → rendís peor → y en la fase 4 eso significa que **no elegís en el mapa 5**).
4. Sin ofertas por N splits → `nivel: 'libre'` → `finAnticipado: 'sin_equipo'`.

**Contratos:** `career.contrato = { org, liga, tier, salarioUSD, años, añosRestantes, clausula,
tipo, firmadoAEdad }`, inicializado como **objeto completo de ceros, nunca `null`** (trampa T4).

**Residencia:** `player.residencias = { KR: 0, EMEA: 0, … }` en splits. 12 splits (4 años) =
residencia y salto de valor de mercado. La **doble residencia LATAM 2026-2027** (no contás como
import ni en LCS ni en CBLOL, y **desde 2028 elegís región para siempre**) es una decisión única y
con fecha: vale un evento dedicado.

Activar `sin_equipo`, `sin_renovacion`, `import_recien_llegado`, `veterano_util`,
`veterano_al_margen`. Actualizar `CONCEPTO.md` §6.

## Checks de la fase 5

```
La distribución de salarios es claramente lognormal (mediana << media)
`sin_equipo` es la causa de retiro más frecuente
A un jugador de 28 con la misma hoja le llegan visiblemente menos ofertas que a los 21
Nadie firma violando cupoImports ni edadMinima de la liga
```

---

# FASE 6 — Final emergente: se borran los relojes

> *"para mí los splits no tienen que estar fixed: si no sos bueno no tenés ofertas, si sos muy
> bueno tu carrera dura como la de Peanut o Faker."*

## 6.1 — Los relojes que se van

| reloj | hoy | pasa a ser |
|---|---|---|
| `amateur.edadLimite: 20` | corte automático → `no_llego` | **se borra.** El `scoutingSesgoEtario` se extiende (20→0.06, 21→0.03, 22+→0.015: nunca cero, existen los tardíos) y desde los 19 el cierre de edad te ofrece **la decisión** de seguir o dejarlo. Que la ventana se cierre lo tenés que **sentir**, no leer en un cartel |
| guard de 90 splits | **lo agota el 23% de las carreras** | pasa a ser un **error**: si una carrera lo agota, es un bug |
| edad de retiro | no existe | no se agrega. **La carrera termina cuando el mercado deja de llamarte** |

Red única que queda: si a los 24 seguís en `amateur`, se fuerza `no_llego`. Es una red anti-loop,
no una regla de juego, y se documenta como tal.

> Ojo: `secundario.js` usa `BALANCE.amateur.edadLimite` para congelar el flag del secundario.
> Al borrar el tope hay que darle su propio umbral o el flag nunca se congela por edad.

## 6.2 — `terminado` deja de significar `retirado`

**Riesgo ALTO: cambia la semántica del motor.** Hoy `avanzarSplit` es no-op si `state.terminado`, y
`phase: 'retirado'` siempre viene con `terminado: true`.

- `phase: 'retirado'` = **estado jugable**, ventana de vuelta abierta, `terminado: false`.
- `state.terminado = true` = la run terminó. Lo setea **solo** `retiro.js`.
- **Terminales:** `burnout`, `prohibicion_familiar`, `no_llego`.
- **Reversibles:** `sin_equipo`, `retiro_elegido`, `retiro_por_lesion`.
- `vueltasMaximas: 2` (Bjergsen y Doublelift volvieron dos veces cada uno). Volver cuesta:
  jerarquía a cero, re-placement en la ladder, marca `vuelta_del_retiro`.

## 6.3 — Servicio militar coreano — `src/systems/servicioMilitar.js`

**Determinista, no probabilístico:** obligatorio, 18-21 meses, hay que enlistarse antes de los 28
(30 si sos figura de élite, por la ley de 2020). Es la razón por la que la LCK tiene literalmente
cero jugadores en la segunda mitad de los veinte. **La decisión es cuándo, no si.** Hace que una
carrera coreana tipo Faker sea un logro distinto a una europea.

## 6.4 — Lesiones — `src/systems/salud.js`

`tunel_carpiano` (Toyz) · `tendinitis_muneca` (Hai: *"la muñeca solo me permite un split más"*) ·
`hombro_cronico` (a Uzi un médico le dijo que tenía brazos de persona de 50 años). Riesgo escalado
por **deuda de sueño acumulada**, splits jugados e intensidad de rutina. Una crónica pone techo
permanente sobre `mecanica` vía `techoDeCarrera` (`core/curvas.js`) y agrega `lesion_cronica`.

> Crea la cadena causal más valiosa del juego: **robarle horas al sueño a los 16 te puede costar la
> muñeca a los 23.** Media construida ya: `player.deudaSueno` **no se resetea** al pasar a
> profesional y `atributos.js` la sigue cobrando toda la carrera. El evento `tendinitis` ya está
> gateado a esa marca desde la fase 0 y dispara en el 11.5% de las carreras.

## 6.5 — El bloque de checks que mide el pedido del usuario

2000 carreras × 4 estrategias. Requiere una **cuarta estrategia** en `src/dev/estrategias.js`:
`carrera` (prioriza mentalidad, salud, jerarquía y estabilidad contractual sobre el pico de
rendimiento).

```
mediana de splits como pro ∈ [6, 10]              (2-3,3 años — el dato real)
activo al 4º año como pro < 20%                    (el dato real)
llega a age >= 30 ∈ [0.8%, 4%]                     (Peanut / Faker: posible, difícil)
causa de retiro más frecuente = 'sin_equipo'
la estrategia 'carrera' llega a 30+ al menos 2.5x más seguido que 'ranked'
CERO carreras agotan el tope de splits
la duración de la carrera correlaciona con el potencial oculto (r > 0.45)
ninguna carrera coreana llega a 30 en 'profesional' sin el flag del servicio resuelto
```

Las dos anteúltimas son la traducción falsable de *"si no sos bueno no tenés ofertas, si sos muy
bueno tu carrera dura"*. `CONCEPTO.md` §2 hay que actualizarlo: las etapas dejan de tener rango de
edad fijo.

---

# FASE 7 — Contenido a escala (150+ opciones)

`roster.js` enriquece a cada compañero: `edad`, `nacionalidad`, `esImport`, `personalidad`
(`veterano_cinico | rookie_ansioso | estrella_egocentrica | soldado_callado | carismatico`) y
**`relacion` 0-100**, que deriva con los splits juntos y se mueve con los eventos. Es la variable
más barata del juego: el mismo evento de vestuario se lee distinto con el jungla que te banca que
con el que te odia — **y habilita la opción D del draft** (4.4).

| archivo | contexto principal | ~eventos |
|---|---|---|
| `equipo.json` | `nivel: tier1/tier2` | 12 |
| `vestuario.json` | por `relacion` y `personalidad` | 10 |
| `mercado.json` | `ventana: offseason`, `mercado: ultimo_ano/sin_renovacion` | 10 |
| `region.json` | `residencia: import` | 8 |
| `soloq_pro.json` | la cuota coreana, `nivel: tier2/tier3` | 6 |
| `pool.json` | marcas de pool (1.4) | 10 |
| `serie.json` | `ventana: playoffs/internacional` | 10 |
| `declive.json` | `etapa: declive`, `edadBanda: tardia/veterana` | 10 |
| `retiro.json` / `vuelta.json` | `etapa: retirado` | 8 |
| `salud.json` | amplía el actual | +6 |
| `rol/*.json` | eje `rol` | 15 |

**Flujo de autoría:** `cobertura.js --huecos` → escribir gateado exactamente a esas celdas →
repetir hasta vacío. **El check de cobertura pasa de reporte a check duro acá**, cuando el
contenido existe.

**Usar 3 y 4 opciones.** Al cierre de la fase 0 el catálogo tiene 22 eventos / 46 opciones, y solo
2 eventos usan 3 opciones. `CONCEPTO` §3 dice "2 a 4".

## Checks de la fase 7

```
cobertura.js --huecos vacío
≥150 opciones en el catálogo
Fracción de splits sin evento < 25% EN TODOS los contextos alcanzables, no en promedio (T10)
```

---

# FASE 8 — Legado, rivales y UI

- **`src/systems/legado.js`** — la tarjeta final (`CONCEPTO` §9). El veredicto **se compone**:
  arquetipo base + modificador + un detalle único de esa partida ("El eterno cuarto puesto",
  "Leyenda regional", "El que se fue a Corea y volvió peor", "El que no llegó"). Puntaje ponderado
  **por rol** (si fuera KDA nadie jugaría support): `ROLES[].visibilidad` ya está.
- **`src/systems/rivales.js`** — los 5 rivales de generación **ya se generan** en `core/mundo.js` y
  no corren su carrera. Que la corran, y que la tarjeta diga tu puesto en la generación.
- **`src/ui/`** — la carpeta existe y está **vacía**; toda la UI vive en `index.html`.
  `DISENO.md` §4.1 pide `render.js`, `/screens` y `/components`. Pantallas: inicio (rol + mains) ·
  carrera (quién sos, dónde estás, contrato, el split en curso, el feed narrativo) · decisión ·
  **serie** (marcador, campeones quemados, el draft) · minijuego · tarjeta final.
- **El criterio de balance final de `CONCEPTO` §11** (si >25% de las partidas termina en el mismo
  arquetipo, el balance está roto) **no se puede evaluar hasta que exista la tarjeta**, porque los
  arquetipos son de la tarjeta. La pasada de balance fina va acá, no antes.

---

# Deuda técnica y hallazgos anotados (no perder)

Cosas encontradas midiendo el código, con la fase donde se resuelven.

| # | Hallazgo | Fase |
|---|---|---|
| D1 | Los pesos de outcome son estáticos y contradicen `CONCEPTO` §8 (*"tus stats corren esos pesos"*) | 2 |
| D2 | El 23% de las carreras agota el tope de 90 splits: no hay retiro | 6 |
| D3 | `maxDecisionesPorSplit: 8` queda corto con serie + mercado + rutina + evento + cierre | 2 |
| D4 | `posicionParaInternacional: 1` está mal para 2026 (Worlds toma 3 por liga mayor, 2 de CBLOL) | 3 |
| D5 | `regionOrigen` se sortea uniforme entre 8 ligas: 1 de cada 8 carreras nace en Corea | 3 |
| D6 | El meta se describe por arquetipo, no por campeón | 1 |
| D7 | `src/ui/` está vacía; los 416 renglones de UI viven en `index.html` | 8 |
| D8 | Los 5 rivales de generación se generan y no corren su carrera | 8 |
| D9 | `player.deudaSueno` no se resetea al pasar a profesional y `atributos.js` la sigue cobrando toda la carrera. **Es útil**: es media cadena causal del sistema de lesiones, ya construida | 6 |
| D10 | `secundario.js` usa `amateur.edadLimite` para congelar el flag. Al borrar ese tope hay que darle su propio umbral | 6 |
| D11 | Las 6 rutinas de offseason están gateadas solo por etapa. Diferenciar por tier cuando los tiers existan, cuidando el check de segura/agresiva | 3 |
| D12 | El eje `region` de `contextos.js` todavía tiene `LATAM`, que desaparece con las ligas 2026 | 3 |
| D13 | `academy_offer` empujaba a `career.orgs` sin fichar. Se sacó en la fase 0; cuando exista el tier 3 real, el fichaje lo hace `competitivo.js` | 3 |
| D14 | Solo 2 eventos del catálogo usan 3 opciones; ninguno usa 4 | 7 |

---

# Reglas de proceso (no negociables)

1. **Una fase por commit**, cerrando la Definición de terminado completa de `CLAUDE.md`.
2. **Nunca cambiar la estructura y retunear las constantes en el mismo commit.** Primero medir con
   la estructura nueva, después tunear.
3. **Si el balance se sale de banda tras un cambio estructural, primero agregar contenido**, no
   tocar constantes. Y decir en `PROGRESO.md` cuándo se tunea y por qué.
4. **Reportar los números medidos, no los esperados.** Incluidos los que empeoran.
5. **Actualizar `CONCEPTO.md` cuando el código lo contradiga.** Pendientes: §2 y §10 (fase 3) ·
   §5 y §11 (fase 4) · §6 (fase 5) · §8 (fase 1) · §2 otra vez (fase 6).
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
- **5** — salarios lognormales; `sin_equipo` como final más frecuente; a un jugador de 28 con buena
  hoja le llegan visiblemente menos ofertas que a los 21.
- **6** — el bloque completo de checks de duración. **Cero carreras que agoten el tope.** Una traza
  de una carrera tipo Faker (30+) y una de un `no_llego` a los 19, y que las dos se lean como
  historias completas.
- **7** — `--huecos` vacío, ≥150 opciones, ningún contexto alcanzable con >25% de splits mudos.
- **8** — ningún arquetipo de la tarjeta final por encima del 25%.
