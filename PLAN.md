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
| **3** | Escalera competitiva: tier3 → tier2 → tier1, ligas 2026 | ✅ ver `PROGRESO.md` |
| **4** | Competición jugable: series Bo5, Fearless, draft, minijuegos | ✅ ver `PROGRESO.md` |
| **5** | La temporada existe: la fecha que importa | ✅ ver `PROGRESO.md` |
| **6** | El meta con nombre | ✅ ver `PROGRESO.md` |
| **7** | El prólogo se comprime y la repetición se rompe | ⬜ |
| **8** | Mercado: ofertas, contratos, salarios, imports | ⬜ |
| **9** | Final emergente: retiro, servicio militar, lesiones, vuelta | ⬜ |
| **10** | Contenido a escala (150+ opciones) | ⬜ |
| **11** | Legado, rivales y UI | ⬜ |

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

# FASE 8 — Mercado: ofertas, contratos, salarios, imports

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

## Checks de la fase 8

```
La distribución de salarios es claramente lognormal (mediana << media)
`sin_equipo` es la causa de retiro más frecuente
A un jugador de 28 con la misma hoja le llegan visiblemente menos ofertas que a los 21
Nadie firma violando cupoImports ni edadMinima de la liga
```

---

# FASE 9 — Final emergente: se borran los relojes

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

# FASE 10 — Contenido a escala (150+ opciones)

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
| `pool.json` | marcas de pool (1.4, ampliado en 6.5) | 10 |
| `serie.json` | `ventana: playoffs/internacional` | 10 |
| `declive.json` | `etapa: declive`, `edadBanda: tardia/veterana` | 10 |
| `retiro.json` / `vuelta.json` | `etapa: retirado` | 8 |
| `salud.json` | amplía el actual | +6 |
| `rol/*.json` | eje `rol`, lo que no es específico de un partido puntual | 15 |

> `rol/*.json` ya perdió las quince situaciones que la fase 5 mudó a
> `data/events/partido/dentro_del_mapa.json` reescritas con marcador y rival. Lo que queda acá (y
> lo que se agrega) es contenido de rol que no depende de una fecha concreta: entrenamiento,
> comparaciones con otros del rol, la vida fuera del mapa.

**Flujo de autoría:** `cobertura.js --huecos` → escribir gateado exactamente a esas celdas →
repetir hasta vacío. **El check de cobertura pasa de reporte a check duro acá**, cuando el
contenido existe.

**Usar 3 y 4 opciones.** Al cierre de la fase 0 el catálogo tiene 22 eventos / 46 opciones, y solo
2 eventos usan 3 opciones. `CONCEPTO` §3 dice "2 a 4".

## Checks de la fase 10

```
cobertura.js --huecos vacío
≥150 opciones en el catálogo
Fracción de splits sin evento < 25% EN TODOS los contextos alcanzables, no en promedio (T10)
```

---

# FASE 11 — Legado, rivales y UI

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
| D1 | ~~Los pesos de outcome son estáticos~~ — resuelto: `outcome.modificadores` | ✅ 2 |
| D2 | El 23% de las carreras agota el tope de 90 splits: no hay retiro | 9 |
| D3 | ~~`maxDecisionesPorSplit: 8` queda corto~~ — resuelto: subió a 16, luego a 60 | ✅ 2 |
| D4 | ~~`posicionParaInternacional: 1` estaba mal para 2026~~ — resuelto: `liga.cuposInternacionales` | ✅ 3 |
| D5 | ~~`regionOrigen` se sorteaba uniforme entre 8 ligas~~ — resuelto: pesado por prestigio, solo tier 1 | ✅ 3 |
| D6 | ~~El meta se describía por arquetipo, no por campeón~~ — resuelto: `campeonesEnMeta` | ✅ 1 |
| D7 | `src/ui/` está vacía; los 1.090 renglones de UI viven en `index.html` (creció de 416 a 1.090 entre la fase 0 y la fase 4, sobre todo por los 5 minijuegos) | 11 |
| D8 | Los 5 rivales de generación se generan y no corren su carrera. La fase 5 les da su primer uso real (aparecen con nombre como `stakes: rival_de_generacion` en una fecha marcada) sin cerrar la deuda: seguir corriendo su carrera entera es esta fase | 11 |
| D9 | `player.deudaSueno` no se resetea al pasar a profesional y `atributos.js` la sigue cobrando toda la carrera. **Es útil**: es media cadena causal del sistema de lesiones, ya construida | 9 |
| D10 | `secundario.js` usa `amateur.edadLimite` para congelar el flag. Al borrar ese tope hay que darle su propio umbral | 9 |
| D11 | Las rutinas de offseason siguen gateadas solo por etapa, no por tier (un bootcamp en Corea no lo paga un tier 3). Deferido de la fase 3 por alcance: cuidar el check de segura/agresiva al diferenciar | 10 |
| D12 | ~~El eje `region` tenía `LATAM`~~ — resuelto: sacado, ya no hay tier-1 ahí | ✅ 3 |
| D13 | ~~`academy_offer` empujaba a `career.orgs` sin fichar~~ — resuelto: el fichaje real lo hace `amateur.js`/`competitivo.js`, `academy_offer` quedó como la prueba narrativa que siempre fue | ✅ 3 |
| D14 | Solo 2 eventos del catálogo usan 3 opciones; ninguno usa 4 | 10 |
| D15 | LCP no tiene un circuito de desarrollo real investigado (TRASPASO no lo cubre). Se modeló como `LCP_CHALLENGERS`, generado igual que el resto de tier 2 — nombre plausible, no verificado como real. Si aparece la investigación real, reemplazar el id | 3 (abierto) |
| D16 | Tier 1 es un piso: no hay descenso de tier1 a tier2 todavía. Una relegación real existe en las ligas de 2026 pero modelarla es más natural junto con contratos (fase 8) | 8 |
| D17 | LRN/LRS (los circuitos tier 2 de LATAM que alimentan LCS/CBLOL) y la doble residencia LATAM 2026-2027 no están modelados: un jugador de la región nace directamente en NA o BR. Es la simplificación explícita que ya preveía `TRASPASO` §5 ("la doble residencia... vale un evento dedicado") | 8 |
| D18 | ~~La ventana `internacional` era un único evento agregado (`chance()`)~~ — resuelto a medias en la fase 4: ahora es una serie Bo5 real de verdad contra un rival de otra región, con Fearless y minijuegos. Sigue **sin distinguir** First Stand/MSI/Worlds ni modelar un bracket Swiss+knockout: es una sola serie representativa, no el torneo real completo | ✅ 4 (parcial) |
| D19 | El bracket de playoffs de tier 1 es de **eliminación simple** (6 clasificados, bye para los 2 mejores sembrados, Bo5 parejo). Las 6 ligas 2026 investigadas usan doble eliminación real (hay bracket de perdedores). Simplificación deliberada: el motor solo simula TU camino por el bracket, nunca el resto — una derrota ya cuenta una historia completa ("eliminado en cuartos") sin necesitar una corrida paralela por el lado de perdedores | 4 (abierto) |
| D20 | Los 5 minijuegos comparten dos parámetros de balance genéricos (`impactoMinijuego` para los de mapa, `impactoDirecto` para bootcamp/rueda de prensa) en vez de tener cada uno el suyo ajustado a mano. Medido: el efecto agregado de CUALQUIERA de los dos lo satura la propia estructura del juego (máximo 1 minijuego por serie, un mapa de cinco) mucho antes de que el valor del parámetro importe — ver PROGRESO | 10/11 (abierto) |
| D21 | La temporada regular de la fase 5 corre el stream de RNG respecto de cualquier seed anterior a esa fase (trampa T1: es un sistema nuevo que consume `rng` en el medio del registro). Ninguna seed de antes de la fase 5 reproduce la misma carrera después. Documentado, no es un bug | ✅ 5 (aceptado) |

---

# Reglas de proceso (no negociables)

1. **Una fase por commit**, cerrando la Definición de terminado completa de `CLAUDE.md`.
2. **Nunca cambiar la estructura y retunear las constantes en el mismo commit.** Primero medir con
   la estructura nueva, después tunear.
3. **Si el balance se sale de banda tras un cambio estructural, primero agregar contenido**, no
   tocar constantes. Y decir en `PROGRESO.md` cuándo se tunea y por qué.
4. **Reportar los números medidos, no los esperados.** Incluidos los que empeoran.
5. **Actualizar `CONCEPTO.md` cuando el código lo contradiga.** Pendientes: §2 y §10 (fase 3) ·
   §5 y §11 (fase 4) · §5 otra vez, el loop de split cambia de forma (fase 5) · §6, el meta cambia
   de definición (fase 6) · §6 otra vez, contratos (fase 8) · §8 (fase 1) · §2 otra vez, se borran
   los relojes (fase 9).
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
- **5** — jugar una temporada regular completa a mano: ver la tabla de posiciones moverse, caer en
  una fecha marcada con `stakes` legible, elegir el momento y ver el resultado de ESE partido
  cambiar según la elección. Confirmar que el split ya no cierra con seis líneas de recibo.
- **6** — ver un cambio de régimen anunciado por nombre al abrir una season, con la tier list
  propia moviéndose y un main cayendo de tier. Elegir `pool_a_cual_le_metes` al menos una vez en
  una carrera de 20+ splits.
- **7** — jugar una carrera entera de punta a punta desde la pantalla de inicio: la etapa amateur
  dura unos pocos splits, no la mitad de la partida, y el mismo evento no se repite todo el tiempo.
- **8** — salarios lognormales; `sin_equipo` como final más frecuente; a un jugador de 28 con buena
  hoja le llegan visiblemente menos ofertas que a los 21.
- **9** — el bloque completo de checks de duración. **Cero carreras que agoten el tope.** Una traza
  de una carrera tipo Faker (30+) y una de un `no_llego` a los 19, y que las dos se lean como
  historias completas.
- **10** — `--huecos` vacío, ≥150 opciones, ningún contexto alcanzable con >25% de splits mudos.
- **11** — ningún arquetipo de la tarjeta final por encima del 25%.
