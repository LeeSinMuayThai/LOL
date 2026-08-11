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
| **7** | El prólogo se comprime y la repetición se rompe | ✅ ver `PROGRESO.md` |
| **8** | La ficha: el registro que acumula + la tarjeta permanente + `src/ui/` | ✅ ver `PROGRESO.md` |
| **9** | El mercado: ofertas, contratos, salarios, la trampa del equipo grande visible | 🔶 9a hecha (motor y datos) — ver `PROGRESO.md` |
| **10** | El final: retiro emergente + la tarjeta de legado | ⬜ |
| **11** | El año: calendario, la nota de la temporada, el archirrival | ⬜ |
| **12** | La jerarquía de la decisión: categorías, rareza, consecuencia previa, el dado | ⬜ |
| **13** | Contenido a escala (150+ opciones) | ⬜ |

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
export function dueloDeGeneracion(state)      // -> { rival, tuyos, suyos } | null   (fase 11 lo llena)

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
> import. **Esos números están investigados en `TRASPASO.md` §4 y no se vuelven a investigar ni a
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

Las fórmulas y los números investigados viven en `TRASPASO.md` §4 (líneas 560-660) y **no se
vuelven a investigar ni a discutir** — es la misma cita que hacía la vieja fase 8 de este
documento, ahora apuntada a la fuente original en vez de a una sección que este mismo plan
reemplaza:

```js
// TRASPASO.md §4 — salarios: lognormal, mediana << media (LEC mediana ~€165k, media €240k)
salarioDeOferta(liga, { rol, jerarquia, hype, edad, esImport }, rng)
  base  = liga.salario.medianaUSD
  mult  = exp(gauss(0, liga.salario.sigma))          // mediana << media
  mult *= factorRol[rol]                             // Mid > Jungla > ADC > Top > Support
  mult *= 0.6 + (jerarquia / 100) * 1.1
  mult *= 0.85 + (hype / 100) * 0.45
  return max(liga.salario.minimoUSD, base * mult)

// TRASPASO.md §4 — valor de mercado, con sesgo etario (el jugador de 28 recibe ~40% de las
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
**Residencia:** `player.residencias = { KR: 0, EMEA: 0, … }` en splits (ya definido en TRASPASO §4);
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

# FASE 10 — EL FINAL

## 10.0 — Commits

| # | Commit | Contenido |
|---|---|---|
| 10a | `fase 10a: se borran los relojes` | 10.1 |
| 10b | `fase 10b: la tarjeta de legado` | 10.2, 10.3 |
| 10c | `fase 10c: lesiones y servicio militar` | 10.4 |
| 10d | `fase 10d: calibrar la duración de la carrera` | solo constantes |

## 10.1 — `src/systems/retiro.js` — la carrera termina cuando el mercado deja de llamarte

Se implementa lo investigado en `TRASPASO.md` §4-5 (líneas 670-680: relojes, semántica de
`terminado`/`retirado`, `vueltasMaximas`):

| Reloj | Hoy | Pasa a ser |
|---|---|---|
| `amateur.edadLimite: 20` | corte automático → `no_llego` | **se borra.** `scoutingSesgoEtario` se extiende (20→0.06, 21→0.03, 22+→0.015: nunca cero) y desde los 19 el cierre de edad te **ofrece la decisión** de seguir o dejarlo |
| guard de 90 splits | **lo agota el 49,1%** | pasa a ser un **error**: si una carrera lo agota, es un bug |
| edad de retiro | no existe | **no se agrega** |

Semántica nueva (riesgo alto — cambia el significado de un campo del motor):

- `phase: 'retirado'` = estado **jugable**, ventana de vuelta abierta, `terminado: false`.
- `state.terminado = true` = la run terminó. Lo setea **solo** `retiro.js`.
- Terminales: `burnout`, `prohibicion_familiar`, `no_llego`.
- Reversibles: `sin_equipo`, `retiro_elegido`, `retiro_por_lesion`. `vueltasMaximas: 2`.

> **Trampa documentada (D10):** [`secundario.js`](src/systems/secundario.js) usa
> `BALANCE.amateur.edadLimite` para congelar el flag del secundario. Al borrar el tope hay que
> darle su propio umbral o **el flag nunca se congela** y no entra en la tarjeta final.

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

## 10.4 — Lesiones y servicio militar

Se implementa lo investigado en `TRASPASO.md` §4-5 (líneas 682-690) sin cambios:
`servicioMilitar.js` (determinista, coreano, 18-21 meses, antes de los 28 — 30 si es figura de
élite) y `salud.js` (`tunel_carpiano`, `tendinitis_muneca`, `hombro_cronico`, escalados por
`player.deudaSueno`).

> **La cadena causal más valiosa del juego, y está medio construida:** `player.deudaSueno` **no se
> resetea** al pasar a profesional (D9) y `atributos.js` la sigue cobrando toda la carrera.
> **Robarle horas al sueño a los 16 te cuesta la muñeca a los 23.** Y con la fase 8, por primera
> vez lo ves: el techo de `mecanica` aparece como un ▼ que no se recupera.

## 10.5 — Checks de la fase 10

```
CERO carreras agotan maxSplitsDeSeguridad (hoy: 49,1%)
mediana de splits como pro ∈ [6, 10]   (2-3,3 años — el dato real de TRASPASO)
activo al 4º año como pro < 20%
llega a age >= 30 ∈ [0.8%, 4%]         (Peanut / Faker: posible, difícil)
causa de retiro más frecuente = 'sin_equipo'
la estrategia 'carrera' llega a 30+ al menos 2.5× más seguido que 'ranked'
la duración de la carrera correlaciona con el potencial oculto (r > 0.45)
ninguna carrera coreana llega a 30 en 'profesional' sin el flag de servicio resuelto
Ningún final —incluidos los amateur— sale sin tarjeta
Ningún arquetipo de veredicto supera el 25% (CONCEPTO §11)
El veredicto cita al menos un hecho real del registro de ESA carrera
```

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

Cada evento declara `categoria` en su JSON. La UI la pinta como banner con color y tono:

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

Un check estático exige `categoria` en todo evento del catálogo.

## 12.2 — El peso visual sale del motor (cero código nuevo)

`core/presupuesto.js` ya clasifica `denso/normal/comprimido`; el contenido ya declara
`bisagra: true`; [`events.js:173`](src/systems/events.js#L173) ya le da prioridad absoluta.

`decisionDesdeEvento` agrega **un campo**: `peso: 'bisagra'|'normal'|'ambiente'`. La UI lo lee:

- `bisagra` → ocupa la pantalla, marca de agua, banner grande, animación de entrada.
- `normal` → tarjeta estándar.
- `ambiente` → tarjeta compacta, sin banner.

**Es conectar un cable que ya está tendido.** Y es la respuesta directa a *"las preguntas se
repiten todo el tiempo"* (H5).

## 12.3 — La consecuencia, antes de elegir

`decisionDesdeEvento` ([events.js:262](src/systems/events.js#L262)) pasa a mandar, por opción:

```js
{
  id, label, descripcion,
  // Dirección y magnitud CUALITATIVA, nunca el número: la regla invariable 7
  // exige rangos, y mostrar "+7" sería mentir sobre un [4,11].
  previa: [{ campo: 'mecanica', signo: '+', magnitud: 'alta' }],   // -> "+ MECÁNICA"
  // Derivado de la dispersión REAL de outcomes de esta opción. Se calcula,
  // no se escribe a mano, así nunca miente. (Imagen 4: "un abrazo o un incendio".)
  riesgo: 'seguro'|'incierto'|'ruleta',
  // Ya existe como option.contexto; solo hay que mostrarlo.
  gate: 'Solo con jerarquía ≥60'
}
```

`magnitud` se deriva de `(min+max)/2` contra bandas en `BALANCE.eventos.magnitudBandas`.
`riesgo` se deriva del coeficiente de variación de los `weight` de los outcomes.

## 12.4 — Rareza y el dado

- Las decisiones de mejora (pretemporada, práctica, `pool_a_cual_le_metes`) muestran **rareza**
  (`común` / `rara`) con payoff acorde. Imagen 3: `RARA` da `+4` contra `+3`.
- **Todo menú generado por sorteo se encabeza diciéndolo** (H10):
  *"El dado trajo tres caminos. Elegí uno."*
- **Toda pantalla de decisión grande nombra el eje del dilema**: `¿la guita o el proyecto?` ·
  `¿Qué clase de jungla sos?` · `Leé la sala.`

## 12.5 — Los torneos, con identidad

- Barra de progreso del bracket siempre visible (`CUARTOS · SEMI · FINAL`), etapas superadas en
  verde. Imágenes 11-14.
- Un minijuego con identidad y nombre **por competición**, con intro narrativa que explica la regla
  en ficción, y dificultad que escala por ronda. Los 5 minijuegos existentes se migran a
  `src/ui/components/minijuegos/` y se les da tema.
- **El camino se guarda**: post-serie, la pantalla muestra cada mapa con su marcador y su cierre
  narrativo, y se persiste en `registro.internacionales[].camino` (imagen 12) para que la tarjeta
  final lo pueda citar.

## 12.6 — Checks de la fase 12

```
Todo evento del catálogo declara `categoria` (check estático)
Toda opción manda `previa` con ≥1 campo, o declara `previa: []` explícitamente
El `riesgo` declarado coincide con la dispersión medida de outcomes (2000 resoluciones/opción)
Una bisagra y una de ambiente producen `peso` distinto en el 100% de los casos
Toda serie internacional deja su camino guardado en registro.internacionales
Ningún minijuego puede setear `terminado` (ya existe, no puede regresionar)
```

---

# FASE 13 — CONTENIDO A ESCALA

## 13.0 — El catálogo, por archivo

`roster.js` enriquece a cada compañero: `edad`, `nacionalidad`, `esImport`, `personalidad`
(`veterano_cinico | rookie_ansioso | estrella_egocentrica | soldado_callado | carismatico`) y
**`relacion` 0-100**, que deriva con los splits juntos y se mueve con los eventos. Es la variable
más barata del juego: el mismo evento de vestuario se lee distinto con el jungla que te banca que
con el que te odia — **y habilita la opción D del draft** (ver 4.4 en las fases ya cerradas).

| archivo | contexto principal | ~eventos |
|---|---|---|
| `equipo.json` | `nivel: tier1/tier2` | 12 |
| `vestuario.json` | por `relacion` y `personalidad` | 10 |
| `mercado.json` | eventos narrativos alrededor del mercado (fase 9), `ventana: offseason` | 10 |
| `region.json` | `residencia: import` | 8 |
| `soloq_pro.json` | la cuota coreana, `nivel: tier2/tier3` | 6 |
| `pool.json` | marcas de pool (1.4, ampliado en fase 6) | 10 |
| `serie.json` | `ventana: playoffs/internacional` | 10 |
| `declive.json` | `etapa: declive`, `edadBanda: tardia/veterana` | 10 |
| `retiro.json` / `vuelta.json` | `etapa: retirado` (fase 10) | 8 |
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
2 eventos usan 3 opciones. `CONCEPTO` §3 dice "2 a 4" (D14).

**Objetivo de escala:** ≥150 opciones en el catálogo total, `cobertura.js --huecos` vacío.

**Con tres agregados obligatorios** que salen del diagnóstico y no estaban en la especificación
original de esta fase:

1. Todo evento nuevo declara `categoria` (12.1) y `previa` (12.3). El check los exige desde acá.
2. **Contenido que cita el registro.** Es lo que la fase 8 hace posible y **lo único que produce la
   sensación de que la carrera se acuerda de vos**:
   - *"Volvés a jugar contra {org que te dejó libre} — la que te soltó a los 19."*
   - *"El {rol} rival es {handle}, al que le ganaste la final de {anio}."*
   - *"Hace {n} splits que no levantás un trofeo. En {org} se empieza a notar."*
   - *"Cumplís {n} años en {org}. Del vestuario que te recibió no queda nadie."*
3. Se cierra D11: las 6 rutinas de offseason se diferencian por tier (un bootcamp en Corea no lo
   paga un tier 3), **cuidando** que siempre quede al menos una `segura` y una `agresiva` por nivel
   o el check de rutinas falla.

## Checks de la fase 13

```
cobertura.js --huecos vacío
≥150 opciones en el catálogo
Fracción de splits sin evento < 25% EN TODOS los contextos alcanzables, no en promedio (T10)
Todo evento nuevo declara categoria y previa (regla de proceso 12/13)
≥10% de las carreras de ≥25 splits ven al menos un evento que cita el registro (13.0, punto 2)
```

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
| D2 | El 23% de las carreras agota el tope de 90 splits: no hay retiro. Remedido tras la fase 7 (que hace que muchas más carreras lleguen a pro y se sostengan): **49,1%** — ver PROGRESO.md, changelog de la fase 7 | 10 |
| D3 | ~~`maxDecisionesPorSplit: 8` queda corto~~ — resuelto: subió a 16, luego a 60 | ✅ 2 |
| D4 | ~~`posicionParaInternacional: 1` estaba mal para 2026~~ — resuelto: `liga.cuposInternacionales` | ✅ 3 |
| D5 | ~~`regionOrigen` se sorteaba uniforme entre 8 ligas~~ — resuelto: pesado por prestigio, solo tier 1 | ✅ 3 |
| D6 | ~~El meta se describía por arquetipo, no por campeón~~ — resuelto: `campeonesEnMeta` | ✅ 1 |
| D7 | `src/ui/` está vacía; los 1.090 renglones de UI viven en `index.html` (creció de 416 a 1.090 entre la fase 0 y la fase 4, sobre todo por los 5 minijuegos) | 8 |
| D8 | Los 5 rivales de generación se generan y no corren su carrera. La fase 5 les da su primer uso real (aparecen con nombre como `stakes: rival_de_generacion` en una fecha marcada) sin cerrar la deuda: seguir corriendo su carrera entera es esta fase | 11 |
| D9 | `player.deudaSueno` no se resetea al pasar a profesional y `atributos.js` la sigue cobrando toda la carrera. **Es útil**: es media cadena causal del sistema de lesiones, ya construida | 10 |
| D10 | `secundario.js` usa `amateur.edadLimite` para congelar el flag. Al borrar ese tope hay que darle su propio umbral | 10 |
| D11 | Las rutinas de offseason siguen gateadas solo por etapa, no por tier (un bootcamp en Corea no lo paga un tier 3). Deferido de la fase 3 por alcance: cuidar el check de segura/agresiva al diferenciar | 13 |
| D12 | ~~El eje `region` tenía `LATAM`~~ — resuelto: sacado, ya no hay tier-1 ahí | ✅ 3 |
| D13 | ~~`academy_offer` empujaba a `career.orgs` sin fichar~~ — resuelto: el fichaje real lo hace `amateur.js`/`competitivo.js`, `academy_offer` quedó como la prueba narrativa que siempre fue | ✅ 3 |
| D14 | Solo 2 eventos del catálogo usan 3 opciones; ninguno usa 4 | 13 |
| D15 | LCP no tiene un circuito de desarrollo real investigado (TRASPASO no lo cubre). Se modeló como `LCP_CHALLENGERS`, generado igual que el resto de tier 2 — nombre plausible, no verificado como real. Si aparece la investigación real, reemplazar el id | 3 (abierto) |
| D16 | Tier 1 es un piso: no hay descenso de tier1 a tier2 todavía. Una relegación real existe en las ligas de 2026 pero modelarla es más natural junto con contratos (fase 9) | 9 |
| D17 | LRN/LRS (los circuitos tier 2 de LATAM que alimentan LCS/CBLOL) y la doble residencia LATAM 2026-2027 no están modelados: un jugador de la región nace directamente en NA o BR. Es la simplificación explícita que ya preveía `TRASPASO` §5 ("la doble residencia... vale un evento dedicado") | 9 |
| D18 | ~~La ventana `internacional` era un único evento agregado (`chance()`)~~ — resuelto a medias en la fase 4: ahora es una serie Bo5 real de verdad contra un rival de otra región, con Fearless y minijuegos. Sigue **sin distinguir** First Stand/MSI/Worlds ni modelar un bracket Swiss+knockout: es una sola serie representativa, no el torneo real completo | ✅ 4 (parcial) |
| D19 | El bracket de playoffs de tier 1 es de **eliminación simple** (6 clasificados, bye para los 2 mejores sembrados, Bo5 parejo). Las 6 ligas 2026 investigadas usan doble eliminación real (hay bracket de perdedores). Simplificación deliberada: el motor solo simula TU camino por el bracket, nunca el resto — una derrota ya cuenta una historia completa ("eliminado en cuartos") sin necesitar una corrida paralela por el lado de perdedores | 4 (abierto) |
| D20 | Los 5 minijuegos comparten dos parámetros de balance genéricos (`impactoMinijuego` para los de mapa, `impactoDirecto` para bootcamp/rueda de prensa) en vez de tener cada uno el suyo ajustado a mano. Medido: el efecto agregado de CUALQUIERA de los dos lo satura la propia estructura del juego (máximo 1 minijuego por serie, un mapa de cinco) mucho antes de que el valor del parámetro importe — ver PROGRESO | 12 (abierto) |
| D21 | La temporada regular de la fase 5 corre el stream de RNG respecto de cualquier seed anterior a esa fase (trampa T1: es un sistema nuevo que consume `rng` en el medio del registro). Ninguna seed de antes de la fase 5 reproduce la misma carrera después. Documentado, no es un bug | ✅ 5 (aceptado) |
| D22 | La fase 9 (`competitivo.js` deja de sortear tu org) va a correr el stream de RNG: ninguna seed anterior a esa fase va a reproducir su carrera. Mismo criterio que D21 — anotado de antemano para no descubrirlo tarde | 9 (anticipado, no implementado aún) |
| D23 | Medido al calibrar el arraigo (fase 8c, 300 carreras a 60 splits): la distribución es bimodal — de las carreras con ≥8 splits en una misma org, 50,5% termina en `leyenda` (88+) y 25,7% se queda en `uno_mas` (<25); `querido` e `idolo` juntos son solo el 23,8%. El check declarado (≥15% llega a Ídolo+) pasa cómodo (59,9%), así que no fuerza retunear nada — pero si en la fase 11/13 se quiere que "Leyenda" se sienta tan raro como en la referencia (aparece una sola vez en las 15 imágenes, al cierre de una carrera de 26 años), la curva de ganancia por split es candidata a suavizarse recién ahí, con contenido real de por medio (regla de proceso 3: agregar contenido antes que tocar constantes) | 11/13 (abierto) |
| D24 | El check de la fase 3 "tier 3 es breve" (`p90 ≤ 4`) era frágil a n=1500: la fase 8D midió que el p90 real cae casi exactamente en el borde 4/5 (~90% acumulado en 4) tanto antes como después de agregar contenido — cualquier cambio que reordene qué evento gana un sorteo para una seed dada (trampa T1, misma familia que D21/D22) puede empujar el resultado para cualquier lado del borde a esa muestra. Confirmado con una sonda aparte a n=3000/6000: ambas versiones (con y sin el contenido nuevo) dan p90=4 estable. Resuelto subiendo la muestra del check a 6000 — no se tocó ninguna constante de balance de tier 3 | ✅ 8D |

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
   de definición (fase 6) · §6 otra vez, contratos (fase 9) · §8 (fase 1) · §2 otra vez, se borran
   los relojes (fase 10) · §1 y §11, duración de la partida (fase 8) · §6 otra vez, se agrega
   ARRAIGO (fase 8).
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
- **13** — `--huecos` vacío, ≥150 opciones, ningún contexto alcanzable con >25% de splits mudos.

**La prueba final, la que importa y la que hoy falla:** jugar una carrera completa de la pantalla
de inicio a la tarjeta final, y poder contarla como una historia — dónde empezaste, qué elegiste,
qué perdiste, cuándo te llegó el bombazo, si lo tomaste, qué te costó, y cómo terminó. **Si al
final la carrera se puede narrar en cinco frases sin mirar el log, el juego está.**
