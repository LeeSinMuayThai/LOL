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
| **9M** | **El mercado de pases**: el mundo se puebla de jugadores, la demanda existe, alguien compite por tu asiento, la escalera deja de ser un dado | 🔶 **9Ma+9Mb hechas** (planteles NPC · la demanda) · faltan 9Mc→9Mh |
| **10** | El final: retiro emergente + la tarjeta de legado | ⬜ |
| **11** | El año: calendario, la nota de la temporada, el archirrival | ⬜ |
| **12** | La jerarquía de la decisión: categorías, rareza, consecuencia previa, el dado | ⬜ |
| **13** | Contenido a escala (150+ opciones) | ⬜ |
| **P** | Publicar: build, guardado en el navegador, seed en la URL, el repo y el host | 🔶 **build y pre-flight hechos** (P.7, P.10) · D28 cerrada · falta **P.2, el guardado**, que es el último bloqueante |

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
| **El mundo del mercado** (2026-09-02) | **Rosters NPC reales**, no un modelo de demanda liviano. Cada org de tier 1 y de tu tier 2 tiene 5 jugadores con edad, nivel, contrato y carrera propia: envejecen, se retiran, se mueven. Es lo que hace real al mercado, al vestuario y al retiro de una sola vez |
| **Orden mercado / retiro** (2026-09-02) | **El mercado primero.** La fase 10 define el retiro como emergente ("te retirás cuando el mercado deja de llamarte"); con el mercado de hoy eso vuelve a ser un dado. Se hace bien a la primera o se hace dos veces |
| **La escalera** (2026-09-02) | **Sí a reescribirla.** El ascenso deja de sortearse: subís porque un club tiene un hueco en tu rol y te puede pagar. Aparece el descenso de tier 1 (D16) y los cupos de import y la residencia empiezan a existir (D29). Se asume el corrimiento del stream de RNG (D35) |

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
`dist/` ≤ **1200 KB**. Historial de la trampa T6 en esta sola línea, porque cada vez
que se citó un número viejo estaba mal: 576 KB (fase P) → 725 KB (T0) → 950 KB
(re-medido en T0b, otra sesión había sumado 9R3c/9R3d) → 1041 KB (T2) → 1080 KB (T5)
→ **1092 KB medido en T6**. El techo subió de 1100 a 1200 acá mismo: quedaban 8 KB de
margen y todavía faltan T7 (canvas de exportación) y T8 (guardado + `almacenamiento.js`
+ meta/OG), que van a sumar código aunque sea liviano. Re-medir en T7/T8, no citar 1200
como si fuera el número final
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
| 9Mc | `fase 9Mc: alguien mas quiere tu asiento` | 9M.4 |
| 9Md | `fase 9Md: la escalera deja de ser un dado` | 9M.5 |
| 9Me | `fase 9Me: negociar, no aceptar` | 9M.6 |
| 9Mf | `fase 9Mf: traspasos a mitad de contrato` | 9M.7 |
| 9Mg | `fase 9Mg: la pantalla del mercado` | 9M.8 |
| 9Mh | `fase 9Mh: calibrar el mercado` | solo constantes |

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

> **Deuda de calibrado para 9Mh** (anotada al implementar): `renovacionSigmaFactor` (constante de
> 9d) drifteó a **43,7%** de renovaciones cayendo bajo la mitad del contrato anterior (estable a
> n=3000/4500/6000) por el corrimiento de stream de la demanda. El check subió su tope a 45% como
> parche; 9Mh tiene que bajarlo de vuelta. También revisar `demanda.presupuestoOrgFactor` (8,5,
> puesto por criterio en 9Mb) y la banda `bandaNivelAbajo`/`bandaNivelArriba`.

## 9M.10 — Checks de la fase

Cada uno verificado en rojo antes de darlo por bueno (regla 7 / trampa T5).

| # | Check | Hoy | Objetivo |
|---|---|---|---|
| 1 | Ninguna org termina la pretemporada con ≠5 jugadores o dos del mismo rol | — | 0 violaciones |
| 2 | Nadie viola `cupoImports` / `minimoResidentes` / `edadMinima` — ni vos ni un NPC | no se comprueba | 0 violaciones |
| 3 | Ningún plantel gasta más que su presupuesto | — | 0 violaciones |
| 4 | Ligas distintas pisadas por carrera | media 1,48 · máx 2 | mediana ≥ 2 y ≥15% pisa 3+ |
| 5 | Fichajes con elección real por carrera | 3,05 | 4-8 |
| 6 | Carreras con ≥1 traspaso a mitad de contrato | 0% | ≥25% |
| 7 | Tier al cierre = tier 1 | 74% (89/120) | ≤65% |
| 8 | Carreras que caen de tier 1 a tier 2 al menos una vez | 0% | ≥15% |
| 9 | Correlación nivel ↔ mejor liga alcanzada | el dado la rompe | r > 0,5 |
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

Se implementa lo investigado en `CONCEPTO.md` §12.4 (relojes, semántica de
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

Se implementa lo investigado en `CONCEPTO.md` §12.4 sin cambios:
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
mediana de splits como pro ∈ [6, 10]   (2-3,3 años — el dato real de `CONCEPTO` §12.4)
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

# FASE P — PUBLICAR

> No es una fase de juego: es la fase que convierte el repo en algo que otra persona puede abrir.
> Va acá porque `CLAUDE.md` no admite planear en el momento, y porque publicar destapa tres cosas
> que jugando en `localhost` no molestan y en público rompen el juego.

## P.0 — El estado, medido

Auditado el 2026-09-02, antes de escribir nada:

| Qué | Estado |
|---|---|
| Base de datos | **No hay ninguna.** Cero `localStorage`, `fetch`, `IndexedDB`, SQL o servicio externo |
| "Los datos" | Archivos estáticos: `src/data/*.json` + `balance.js`, importados en tiempo de módulo |
| Dependencias | **0.** `package.json` no tiene un solo `dependencies` |
| Build | **Ninguno.** ES modules nativos, sin bundler ni transpilación |
| Peso a servir | **850 KB** (`index.html` + `src/core` + `src/data` + `src/systems` + `src/ui`) |
| `server.js` | 60 líneas de servidor estático **solo para desarrollo**. No hace falta en producción |
| Imports relativos | **274, todos resuelven en un filesystem case-sensitive** (verificado; Windows no distingue mayúsculas, el host sí) |
| Archivos con `_` inicial | Ninguno → no hace falta `.nojekyll` para GitHub Pages |
| Remote de git | **No hay.** El repo es local, rama `master` |
| Persistencia de la partida | **Ninguna.** Un refresh borra la carrera |

**Conclusión**: subirlo es arrastrar una carpeta a cualquier host estático. Lo que hay que arreglar
no es el hosting, son las tres cosas de P.1.

## P.1 — Los tres bloqueantes, por gravedad

1. **No se guarda nada, y la sesión objetivo son 25-40 minutos.** Es el bloqueante real: en
   `localhost` uno no recarga; un desconocido sí, y pierde dos horas de carrera. Se resuelve en P.2
   **sin backend**.
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

## P.2 — El guardado, sin base de datos (`src/core/guardado.js`, nuevo)

La arquitectura ya está preparada y nadie la usó: `state.pendiente` guarda
`{ sistemaId, decision }` **justamente para que la partida sea serializable a mitad de split**, y
`state` es todo objetos planos. Falta una sola pieza.

`mulberry32` guarda su contador en una variable de clausura (`core/rng.js:2`) y no lo expone, así
que hoy no se puede restaurar el punto del stream. El estado interno es un uint32 que avanza por
una constante fija por llamada: exponerlo son ~5 líneas y no cambia una tirada.

- `mulberry32` devuelve la función con un `.estado()` / `.restaurar(n)` (o se agrega
  `mulberry32Desde(seed, llamadas)`). **Check obligatorio**: la misma seed con `n` llamadas
  restauradas produce exactamente la misma secuencia que correrla de corrido — si no, el guardado
  miente y es peor que no tenerlo (regla 15).
- `guardar(state, rng)` → `localStorage` al cerrar cada split y en cada `pausar()`.
- `cargar()` → si hay partida, la pantalla de inicio ofrece **Continuar** además de **Empezar**.
- Versionado del guardado: una clave `version` que se compara contra la del build. Si no coincide,
  se avisa y se descarta en vez de cargar un estado que ningún sistema actual entiende (los
  cambios de forma del `state` son constantes en este proyecto).

Esto no necesita servidor, cuenta ni base de datos. Todo vive en el navegador del jugador.

## P.3 — La seed en la URL

`leerSeed()` (`index.html:1103`) solo lee el input; no mira la URL. Con determinismo real (P.1.2):

- `?seed=42` precarga la seed.
- Botón **copiar link de esta carrera** en la tarjeta final.

Es barato y es la función social que el juego pide: `CONCEPTO` §1 dice que *"el objetivo del
jugador no es ganar Worlds, es descubrir qué carrera le tocó"* — poder pasarle esa carrera a otro
es la consecuencia natural.

## P.4 — La página como página

Hoy `index.html` tiene `lang`, `charset`, `viewport` y `<title>`, y **nada más**. Compartir el link
muestra una tarjeta vacía. Falta:

- `<meta name="description">`.
- Open Graph + Twitter card (`og:title`, `og:description`, `og:image`) con una imagen propia.
- Favicon.
- Un `<title>` con el nombre real del juego, no `LOL Career Simulator`.

## P.5 — El repo

- Crear el remote y pushear (`master` no tiene ninguno hoy).
- `.gitignore` — no existe. Mínimo: `node_modules/` y `package-lock.json` (un lockfile sin una sola
  dependencia es ruido; hoy está sin trackear).
- `README.md` — no existe. Qué es, cómo correrlo (`npm start`), cómo correr los checks.
- `LICENSE` — decisión del usuario, pendiente.
- **Marcas**: `CLAUDE.md` habilita ligas y organizaciones reales, y `leagues.json` tiene 58 orgs
  reales con nombre. Local es una cosa y público es otra: conviene una línea de descargo de
  proyecto de fan y revisar la política de contenido de fans de Riot antes de difundirlo. No es un
  bloqueante técnico; es una decisión a tomar a ojos abiertos.

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

## P.7 — El pre-flight ✅

Hecho, y no como script aparte: **vive dentro de `src/dev/build.js`** y corre en cada build, sobre
`dist/` — que es lo que realmente se sube, no sobre las fuentes. El build falla con exit 1 si algo
no da.

Verifica: cada import relativo resuelve con la capitalización exacta (Windows no distingue, el host
Linux sí) · no quedó ningún import attribute sin reescribir · no hay llamadas al azar del navegador
· ningún archivo empieza con `_` (Jekyll los ignora) · todo `.json` parsea.

~~Queda pendiente de 9Ed extender `guards.js` a `.html`~~ — hecho (commit `fase 9Ec+9Ed`): el
guard suma `.html` y recorre el primer nivel de la raíz del repo, así que `verificarSinMathRandom`
caza un `Math.random()` que vuelva a `index.html`. El build cubría el camino del deploy; ahora el
guard cubre el repo.

## P.8 — Verificación end-to-end

1. Abrir la **URL publicada** (no `localhost`) en Chrome, Firefox y Safari, y en un móvil.
2. Jugar hasta mitad de carrera, **recargar la pestaña** y confirmar que continúa donde estaba.
3. Abrir el mismo `?seed=N` en dos navegadores distintos y confirmar que la carrera es idéntica.
4. Consola sin errores en toda la partida (ya se hizo así en la fase 8b, con Chrome headless
   vía CDP).

## P.10 — El build ✅ (`src/dev/build.js`)

`npm run build` → `dist/`, **576 KB**. Sin bundler y sin una sola dependencia: el proyecto no tiene
ninguna y esta fase no es excusa para agregar la primera.

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
peticiones, 87 con 200**; el único 404 es `/favicon.ico` (P.4). Los 5 roles y el grid de campeones
renderizan, y los 27 módulos JSON inlineados cargan. El módulo de errores de `index.html` no se
disparó.

## P.9 — Qué queda explícitamente afuera

Backend, cuentas de usuario, tabla de récords global, guardado en la nube y analytics. Todo eso
deja de ser un sitio estático y trae servidor, base de datos y datos personales. Si alguna vez se
quiere, es una decisión de producto nueva — **no un requisito para publicar**.

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
| D8 | Los 5 rivales de generación se generan y no corren su carrera. La fase 5 les da su primer uso real (aparecen con nombre como `stakes: rival_de_generacion` en una fecha marcada). **9Ma**: ahora ocupan una casilla de plantel real (la que `orgDelRival` les asigna por hash) y `systems/plantel.js` los envejece como NPCs de carrera larga. Falta la ficha de archirrival con `desenlace` | 🔶 **9Ma (viven en planteles)** / 11 (la ficha) |
| D9 | `player.deudaSueno` no se resetea al pasar a profesional y `atributos.js` la sigue cobrando toda la carrera. **Es útil**: es media cadena causal del sistema de lesiones, ya construida | 10 |
| D10 | `secundario.js` usa `amateur.edadLimite` para congelar el flag. Al borrar ese tope hay que darle su propio umbral | 10 |
| D11 | Las rutinas de offseason siguen gateadas solo por etapa, no por tier (un bootcamp en Corea no lo paga un tier 3). Deferido de la fase 3 por alcance: cuidar el check de segura/agresiva al diferenciar | 13 |
| D12 | ~~El eje `region` tenía `LATAM`~~ — resuelto: sacado, ya no hay tier-1 ahí | ✅ 3 |
| D13 | ~~`academy_offer` empujaba a `career.orgs` sin fichar~~ — resuelto: el fichaje real lo hace `amateur.js`/`competitivo.js`, `academy_offer` quedó como la prueba narrativa que siempre fue | ✅ 3 |
| D14 | Solo 2 eventos del catálogo usan 3 opciones; ninguno usa 4 | 13 |
| D15 | LCP no tiene un circuito de desarrollo real investigado (`CONCEPTO` §12.3 no lo cubre). Se modeló como `LCP_CHALLENGERS`, generado igual que el resto de tier 2 — nombre plausible, no verificado como real. Si aparece la investigación real, reemplazar el id | 3 (abierto) |
| D16 | Tier 1 es un piso: no hay descenso de tier1 a tier2 todavía. Una relegación real existe en las ligas de 2026 pero modelarla es más natural junto con contratos (fase 9) | **9M** |
| D17 | LRN/LRS (los circuitos tier 2 de LATAM que alimentan LCS/CBLOL) y la doble residencia LATAM 2026-2027 no están modelados: un jugador de la región nace directamente en NA o BR. Es la simplificación explícita que ya preveía la investigación ("la doble residencia... vale un evento dedicado") | **9M** |
| D18 | ~~La ventana `internacional` era un único evento agregado (`chance()`)~~ — resuelto a medias en la fase 4: ahora es una serie Bo5 real de verdad contra un rival de otra región, con Fearless y minijuegos. Sigue **sin distinguir** First Stand/MSI/Worlds ni modelar un bracket Swiss+knockout: es una sola serie representativa, no el torneo real completo | ✅ 4 (parcial) |
| D19 | El bracket de playoffs de tier 1 es de **eliminación simple** (6 clasificados, bye para los 2 mejores sembrados, Bo5 parejo). Las 6 ligas 2026 investigadas usan doble eliminación real (hay bracket de perdedores). Simplificación deliberada: el motor solo simula TU camino por el bracket, nunca el resto — una derrota ya cuenta una historia completa ("eliminado en cuartos") sin necesitar una corrida paralela por el lado de perdedores | 4 (abierto) |
| D20 | ~~Los 5 minijuegos comparten dos parámetros de balance genéricos (`impactoMinijuego`, `impactoDirecto`) en vez de tener cada uno el suyo~~ — **cerrada en 9R4a**: cada entrada de `data/minijuegos.json` trae su `impacto` y su `spread`, y `balance.js` se queda solo con lo que es del reparto (`minijuegoCooldownSplits`, los cortes del veredicto). El diagnóstico viejo decía que la estructura del juego satura el efecto de cualquiera de los dos parámetros mucho antes de que su valor importe; sigue siendo cierto y por eso el calibrado fino es 9R4e | ✅ 9R4a |
| D21 | La temporada regular de la fase 5 corre el stream de RNG respecto de cualquier seed anterior a esa fase (trampa T1: es un sistema nuevo que consume `rng` en el medio del registro). Ninguna seed de antes de la fase 5 reproduce la misma carrera después. Documentado, no es un bug | ✅ 5 (aceptado) |
| D22 | La fase 9 (`competitivo.js` deja de sortear tu org) va a correr el stream de RNG: ninguna seed anterior a esa fase va a reproducir su carrera. Mismo criterio que D21 — anotado de antemano para no descubrirlo tarde | 9 (anticipado, no implementado aún) |
| D23 | Medido al calibrar el arraigo (fase 8c, 300 carreras a 60 splits): la distribución es bimodal — de las carreras con ≥8 splits en una misma org, 50,5% termina en `leyenda` (88+) y 25,7% se queda en `uno_mas` (<25); `querido` e `idolo` juntos son solo el 23,8%. El check declarado (≥15% llega a Ídolo+) pasa cómodo (59,9%), así que no fuerza retunear nada — pero si en la fase 11/13 se quiere que "Leyenda" se sienta tan raro como en la referencia (aparece una sola vez en las 15 imágenes, al cierre de una carrera de 26 años), la curva de ganancia por split es candidata a suavizarse recién ahí, con contenido real de por medio (regla de proceso 3: agregar contenido antes que tocar constantes) | 11/13 (abierto) |
| D24 | El check de la fase 3 "tier 3 es breve" (`p90 ≤ 4`) era frágil a n=1500: la fase 8D midió que el p90 real cae casi exactamente en el borde 4/5 (~90% acumulado en 4) tanto antes como después de agregar contenido — cualquier cambio que reordene qué evento gana un sorteo para una seed dada (trampa T1, misma familia que D21/D22) puede empujar el resultado para cualquier lado del borde a esa muestra. Confirmado con una sonda aparte a n=3000/6000: ambas versiones (con y sin el contenido nuevo) dan p90=4 estable. Resuelto subiendo la muestra del check a 6000 — no se tocó ninguna constante de balance de tier 3 | ✅ 8D |
| D25 | ~~**La carrera se vara para siempre tras disolverse un tier 3.**~~ — resuelto en 9Ea+b: `disolverEquipo` conserva `tier: 3`. Regresión de la fase 9b (`9a163b6`), que guardó el re-fichaje detrás de `career.tier === 3` mientras `disolverEquipo` ponía `tier: null` — la condición nunca era cierta en el único caso para el que se escribió. Medido antes: **30,7% de carreras varadas**, **47,5% de los splits profesionales sin equipo**, racha máxima **57 splits**. Después: **0 varadas**, racha máxima **1 split**, **98,1%** de los splits pro con equipo | ✅ 9E |
| D26 | **El agujero de medición que dejó pasar D25.** Tres herramientas mirando para otro lado a la vez: (a) `simulate.js` no tenía **ningún** KPI posterior al fichaje, así que 1.500 carreras no veían una racha de 57 splits sin equipo — desde el estado final eso se lee como un solo split libre (**resuelto en 9Ea+b**: bloque `carrera` con recorrido split a split); (b) `validate.js` no tenía ningún check sobre el estado "sin equipo" (**resuelto**: checks 39 y 40); (c) **`cobertura.js` mide cantidad, no pertinencia**: la celda `sin_equipo` reporta **58 eventos** —bien por encima del mínimo— y por eso sale "sin huecos", pero esos 58 son exactamente el contenido mal gateado de D27. Cuanto más contenido sin gatear se escribe, más sana se ve una celda inapropiada. Misma familia que la trampa T5 — la herramienta no falla, mira para otro lado. **(c) cerrado en 9Ec**: `cobertura.js` reporta, por cada celda de estado excepcional (`prioridad ≥ 80`), la partición anclados (declaran `nivel`/`marcas`) vs. sin gatear. `sin_equipo` pasó de `16 sin gatear` a `10` (los 10 restantes son soloQ y reflexión vital, apropiados pero declarados por omisión — anclarlos es un pase de contenido futuro) | ✅ 9E |
| D27 | ~~**Contenido de vestuario disparando sin vestuario.**~~ — cerrado en 9Ec. `campeones.js` gatea el draft por `career.currentOrg` (no `phase`): un libre profesional elige el campeón como en soloQ, sin loguear "en el draft no te dieron tu pick" (medido: 65 logs `[campeones]` sin equipo → 0). Nueve eventos declararon `marcas: ["con_vestuario"]` (5 de rol del plan + `jungla_el_tracking_publico` + `transfer_rumor`/`tercer_club_ya`/`el_secundario_que_sirvio`); los 6 eventos de rol enmarcados en soloQ se dejaron sin gatear a propósito. Check nuevo en `validate.js` verificado en rojo contra el HEAD previo | ✅ 9E |
| D28 | ~~**`Math.random()` × 5 en `index.html`**~~ — resuelto en la fase P: pasaron a `rngUi`, un stream propio sembrado desde la seed (`mulberry32((seed ^ 0x9E3779B9) >>> 0)`), separado del `rng` del motor para no correr el stream (T1) ni desincronizar el navegador de `simulate.js`. `src/dev/build.js` falla el build si vuelve a aparecer una llamada al azar del navegador. **9Ed**: `guards.js` ahora suma `.html` y recorre la raíz del repo — `verificarSinMathRandom` caza un `Math.random()` que vuelva a `index.html`, verificado en rojo. Cerrado | ✅ **P** + 9Ed |
| D29 | **El eje `residencia` está muerto entero.** `contexto.js` escribía `residencia: 'local'` fijo. **9Mb**: `residenciaEn(state, regionId)` la calcula (`local`/`residente`/`import`) desde `splitsDeResidencia`; `core/demanda.js` lee `cupoImports`/`minimoResidentes`/`margenImport` en `ofertaPosible`. Falta que 9Md abra el mercado entre regiones para que `import` se dé en juego real (hoy: alcanzable con estado sintético, 0% en carreras normales) | 🔶 **9Mb (el eje vive)** · 9Md (la transferencia entre regiones) |
| D30 | **Valores de eje que la fase 9 debía llenar y no llenó.** `calcularMercado()` devuelve solo `contrato_firme`/`sin_contrato`; `ultimo_ano` y `sin_renovacion` están declarados en `EJES` y nunca se calculan, pese a que `contrato.aniosRestantes` ya existe y es exactamente el dato que hace falta. `etapa: 'declive'` tampoco se computa | **9M** / 10 |
| D31 | ✅ **Cerrada.** Constantes muertas en `balance.js`: **9Ec** borró `amateur.autoProbRobar`, `rendimiento.ruidoRival` y `competitivo.margenEdadMinima`; **9Mb** encendió `mercado.margenImport` en `core/demanda.js` (`ofertaPosible`: como import tenés que estar `margenImport` por encima de la fuerza de la org). 0 constantes mintiendo | ✅ 9Ec + 9Mb |
| D32 | **`node src/dev/validate.js` tarda 6m47s** y la Definición de terminado lo exige en cada cambio. Candidato a partirse en `--rapido` (esquema, contratos, determinismo) y `--completo` (los checks estadísticos de n grande, que son los que se comen el tiempo) | 12 (abierto) |
| D34 | **Cuánto se tarda en SALIR del nivel tier 3 nunca se había podido medir**, porque el bug D25 mataba la carrera en la primera disolución: las carreras largas en tier 3 no existían, se varaban. Con D25 cerrado, medido a 1500 carreras: por org la permanencia sigue clavada en el diseño (**mediana 2, p90 5** — el pedido "nadie se queda mucho en un equipo inventado" se cumple), pero el tiempo total en el NIVEL da **mediana 5, p90 12, máximo 36 splits**. El 98,3% de las carreras que pisan tier 3 igual escapan a tier 2 o 1, así que no es una trampa — pero un p90 de 12 splits (4 años) dando vueltas por equipos chicos es candidato a revisar `probAscensoBaseDesdeTier3`. **No se tocó ninguna constante**: regla de proceso 2, primero medir con la estructura nueva. El check gatea la métrica por org, que es la que responde el pedido | 10 (abierto) |
| D33 | ✅ **Cerrada (2026-09-04).** 13 comentarios de `/src` citaban `TRASPASO.md §4` — redirigidos a `CONCEPTO.md §12`, con sub-número (`§12.N`) donde el tema calza con una subsección real (Calix/scouting → 12.2, edad mínima de liga → 12.3, declive → 12.4, lognormal de salarios → 12.6) y bare `§12` donde no había un mapeo 1:1 verificable. Se soltaron los artefactos propios de TRASPASO que no viajan (rangos de línea, "imagen N"). 0 archivos con `TRASPASO` restantes en `/src` | 9E |
| D35 | **La fase 9M corre el stream de RNG y mueve el balance agregado entero**: los planteles NPC consumen `rng` en `generarMundo` y en cada offseason, y la escalera deja de sortearse. Ninguna seed anterior a 9M reproduce su carrera. Misma familia y mismo criterio que D21/D22. **9Ma**: el shift está — verificado que la distribución agregada de `org.fuerza` casi no se mueve el día 1 (`mean 77,5→76,9`), pero tocó 2 checks estadísticos al borde (afinidad-al-meta, que leía un `metaInicial` crudo, y "≥30% de series sin draft" → 28%). El resto del balance se remide en 9Mh (trampa T6) | 🔶 **9Ma (shift aceptado y medido)** · retune 9Mh |
| D40 | **Tres campos del estado declarados que ningún sistema escribe nunca.** Verificado por grep sobre `/src/core` y `/src/systems` el 2026-09-04: `career.registro.dineroTotalUSD` (0 escrituras — el comentario de `state.js` dice "la fase 9 lo alimenta", y no lo alimentó), `career.registro.picos.rankedPuntos` (0) y `mundo.archirrival` (0; lo espera `dueloDeGeneracion` en `core/ficha.js:179`, que devuelve `null` siempre). No es un bug de motor: es un bug de confianza esperando a pasar, porque la primera pantalla que los pinte va a mostrar `US$0 ganado` y eso viola la regla 15. La fase T **no los dibuja**; oculta el panel hasta que alguien los alimente | 9M (dinero) / 11 (archirrival) |
| D41 | **`log.type` no se usa en la UI.** Los 16 sistemas emisores etiquetan cada log (`amateur`, `serie`, `mercado`, `temporada`, …) y `feed.js` solo distingue `tecnico: true`. Es el gancho listo para icono, color y filtro por categoría, gratis. Lo consume la fase T | T |
| D36 | **La partida no se guarda: un refresh borra la carrera.** Cero `localStorage` en todo el repo. Irrelevante en `localhost`, bloqueante en público con una sesión objetivo de 25-40 minutos. La arquitectura ya está lista —`state.pendiente` existe justamente para que la partida sea serializable a mitad de split y `state` es todo objetos planos—; falta exponer el contador de `mulberry32` (`core/rng.js:2`), que hoy vive en una clausura, para poder restaurar el punto del stream. No necesita backend | **P** |

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
