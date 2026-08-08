> **NOTA DE ESTADO (2026-08-08).** La **PARTE 6 de este documento (los pasos 10 a 13) quedó
> superada por `PLAN.md`**, que es el plan vigente y cubre las fases 0 a 8. El usuario cambió tres
> decisiones después de escribir esto: la partida pasa a ser de 25-40 min, el Bo5 mapa a mapa entra
> como sistema central, y la duración de la carrera pasa a ser emergente del mercado en vez de
> tener topes de edad.
>
> **Lo que sigue vigente y NO está en ningún otro lado es la PARTE 4 (datos de la investigación):**
> ligas y rosters 2026, salarios, duración de carreras, Fearless Draft, servicio militar, lesiones.
> Esos datos no hay que volver a investigarlos. Las PARTES 7 (trampas) y 8 (proceso) también siguen
> vigentes y están resumidas en `PLAN.md`.

# Traspaso — Simulador de carrera de LoL: pasos 10 a 13

> **Este documento es un handoff completo.** Está escrito para que una IA que abre el proyecto
> por primera vez pueda continuar sin haber visto nada de las sesiones anteriores. Incluye el
> estado real medido, los datos de investigación que no están en el repo, las decisiones del
> usuario textuales, y las trampas que ya costaron tiempo. Leelo entero antes de tocar código.

---

# PARTE 0 — Arranque en frío

**Repo**: `c:\Users\Ignacio\Desktop\LOLadvancecareersimulator` · rama `master` · último commit
`626392c`. Sin dependencias: JavaScript vanilla, ES modules, corre en Node y en navegador.

Lo primero, en este orden:

```bash
node src/dev/validate.js          # 21 checks, todos tienen que pasar
node src/dev/simulate.js 1500 16 todas
node src/dev/cobertura.js         # la matriz de contenido por momento de carrera
git log --oneline -12
```

Después leé, en este orden: `CLAUDE.md` (reglas duras) → `CONCEPTO.md` (qué es el juego) →
`PROGRESO.md` (changelog, de arriba hacia abajo) → `DISENO.md` → `AUDITORIA.md` (diagnóstico
histórico, ya tiene nota de estado).

**`PROGRESO.md` es la fuente de verdad del historial.** Cada entrada del changelog explica no
solo qué se hizo sino por qué y qué se midió. Si algo en este documento contradice a
`PROGRESO.md`, gana `PROGRESO.md`.

---

# PARTE 1 — Qué es el proyecto

Simulador narrativo de carrera de jugador profesional de LoL, en navegador. Arrancás a los 15
grindeando soloQ en tu pieza y terminás retirándote — o no llegando nunca. Dura 4-10 minutos,
se juega de una sentada, termina en una tarjeta de legado compartible.

**La referencia declarada (`CONCEPTO.md` §1) es El Ídolo y Copero**: historias interactivas
cortas donde un motor simula la carrera y vos solo decidís en los momentos que importan. Esa
frase es un criterio de diseño operativo, no decoración — ya se usó una vez para justificar
eliminar el panel de reparto de bloques (paso 9).

**El objetivo del jugador no es ganar Worlds**, es descubrir qué carrera le tocó. Un ídolo
regional que nunca salió de su país es un final tan bueno como un campeón mundial.

## Las 9 reglas invariables (`CLAUDE.md`) — no se negocian

1. Nunca usar `Math.random()`. Todo el azar viene del RNG inyectado.
2. El motor no toca el DOM. La lógica corre en Node.
3. No hay números mágicos en la lógica. Todas las constantes van en `src/data/balance.js`.
4. Los eventos son datos y viven en `src/data/events/*.json`.
5. Cada sistema exporta `aplicar(state, rng) -> { state, logs }`.
6. Agregar un sistema = un archivo nuevo + una línea en `ETAPAS_SPLIT`.
7. Los efectos de eventos son rangos `[min, max]`, nunca valores fijos.
8. Los resultados de opciones son distribuciones con pesos, no resultados únicos.
9. Todo el juego reside en un único objeto `state`.

**Precisión de dominio** (también de `CLAUDE.md`): la promoción por series ya no existe, el
ascenso es por LP · los roles son top, jungla, mid, adc, support · el tono tiene que sonar a
alguien que conoce LoL, no a una traducción · **las ligas y organizaciones pueden ser reales;
los compañeros y rivales deben ser inventados**.

## Definición de terminado (`CLAUDE.md`) — se cumple en CADA paso

Un cambio no está completo hasta que: `node src/dev/validate.js` corre sin errores · el
determinismo se verifica con la misma seed en dos ejecuciones · `node src/dev/simulate.js 1000`
corre sin crashear · se hizo commit · se actualizó `PROGRESO.md`.

El idioma del código, los comentarios, los logs y los commits es **español rioplatense**. El
usuario escribe así y el juego también.

---

# PARTE 2 — Arquitectura actual (pasos 1 a 9, ya construidos)

## 2.1 El pipeline resumible — `src/core/pipeline.js` (116 líneas)

Un solo camino de ejecución. No hay versión "headless" separada: `simulate.js` y `validate.js`
corren **exactamente el mismo código** que el navegador.

```js
avanzarSplit(state, rng) -> { state, logs }
  // corre las etapas desde 0; si un sistema devuelve `decision`, congela el split

resolverDecision(state, respuesta, rng) -> { state, logs }
  // aplica la respuesta y reanuda desde la etapa siguiente

avanzarSplitAuto(state, rng, responder?) -> { state, logs }
  // el mismo camino con las decisiones contestadas por `sistema.resolverAuto`
  // `responder(sistema, state, decision, rng)` permite inyectar estrategias
```

El cursor de reanudación vive **adentro del estado**:

```js
state.pendiente = { sistemaId: 'eventos', decision: {...} } | null
```

Se resuelve por `sistemaId`, **nunca por índice** (ver Trampa T3).

## 2.2 Contrato de un sistema

```js
export const id = 'nombre';
export function aplicar(state, rng)                        -> { state, logs, decision? }
export function resolver(state, decision, respuesta, rng)  -> { state, logs, decision? }
export function resolverAuto(state, decision, rng)         -> respuesta
```

`resolver` y `resolverAuto` solo son obligatorios si el sistema puede devolver una `decision`.

**Regla de oro no escrita pero crítica**: un sistema que no aplica tiene que hacer *early return
sin tocar `rng`*. Si consume una tirada cuando no corresponde, corre el stream de todo lo que
viene después (ver Trampa T1).

## 2.3 El registro — `src/systems/registro.js`

`ETAPAS_SPLIT` es una lista de módulos importados con `await import(...)`, una línea por
sistema. **El orden ES el orden del split** y sigue el ciclo de `CONCEPTO.md` §5.

Orden actual (12 sistemas):

| # | sistema | qué hace |
|---|---|---|
| 1 | `contexto` | recalcula "dónde estás parado". No consume RNG |
| 2 | `edadInicio` | foto de stats al abrir la edad (para el resumen de temporada) |
| 3 | `meta` | llega el parche: mueve los pesos del meta, a veces con sacudón |
| 4 | `roster` | arma/actualiza el vestuario, sinergia y jerarquía |
| 5 | `campeones` | draft + maestrías + Ajuste al Meta + signature |
| 6 | `secundario` | congela el flag del secundario. **Va antes de `amateur` a propósito** |
| 7 | `amateur` | la etapa amateur: rutina semanal, riesgo familiar, las tres salidas |
| 8 | `rendimiento` | el split competitivo: performance, posición, títulos, jerarquía |
| 9 | `eventos` | 1 o 2 eventos del split |
| 10 | `atributos` | curvas de carrera, rachas, desgaste de mentalidad, burnout |
| 11 | `practica` | offseason: rutina de preparación |
| 12 | `edadCierre` | resumen de temporada + decisión grande de cierre de edad |

## 2.4 El objeto `state`

```js
{
  seed, age, phase: 'amateur'|'profesional'|'retirado', terminado, finAnticipado,
  splitFichaje, pendiente, contexto,           // contexto = caché para UI/logs
  origen: { exigenciaColegio, toleranciaViejos, apoyoEconomico },
  mundo: {
    ligas[], ligaOrigen, regionOrigen, regionIdOrigen, servidorOrigen,
    servidores{}, regionDominante, metaInicial{}, rivales[]
  },
  player: {
    name, role, stats: { mecanica, macro, teamfight, laneo, shotcalling,
                         adaptabilidad, mentalidad, hype },
    oculto: { potencial, formaCarrera, edadPico, forma },   // NUNCA se le muestra al jugador
    studies, familyTrust, sleep, deudaSueno,
    ranked: { servidor, tier, division, lp, escudo, partidas },   // fuente de verdad
    soloqElo,                                  // ESPEJO derivado de solo lectura
    splitCount, titles, worlds, signatureChampion, campeonDelSplit, championPool[]
  },
  career: {
    orgs[], contracts[], hitos[], currentOrg, currentSplit, liga, rosterDeOrg,
    companeros[], jerarquia, sinergia, historial[], posicion,
    titulos, podios, internacionales
  },
  meta: { patch, weights{}, ajuste },
  flags: { cooldowns{}, robosConsecutivos, pcConfiscada, avisos, nocturno,
           negociacionGanada, secundario },
  logs: []
}
```

## 2.5 El modelo de contexto (paso 7) — **el corazón del sistema de contenido**

`src/core/contexto.js` + `src/data/contextos.js`. `calcularContexto(state)` es **pura, derivada
y sin RNG**. `state.contexto` es solo caché para UI y logs.

**9 ejes**: `etapa` (amateur/debut/profesional/declive/retirado) · `edadBanda`
(temprana≤16/joven17-19/pico20-23/tardia24-26/veterana27+) · `nivel`
(soloq/tier3/tier2/tier1/libre) · `estatus` (ninguno/rookie/titular/referente/franquicia) ·
`momentum` (crisis/slump/estable/racha) · `mercado`
(sin_contrato/contrato_firme/ultimo_ano/sin_renovacion) · `region` · `residencia` ·
`ventana` (pretemporada/regular/playoffs/internacional/offseason). Más una lista de `marcas`.

**`momento`**: una etiqueta canónica única resuelta por tabla de patrones ordenada por
prioridad. **25 declarados, 10 alcanzables hoy.** Los 15 restantes tienen marca
`pendiente: 'pasoN'` y cada paso activa los suyos:

| pendiente | momentos |
|---|---|
| **paso 10** | `espera_edad_minima`, `tier3_recien_llegado`, `tier3_probandose`, `tier2_rookie`, `tier2_titular` |
| **paso 11** | `sin_equipo`, `sin_renovacion`, `import_recien_llegado`, `veterano_util`, `veterano_al_margen` |
| **paso 12** | `servicio_militar`, `retirado_reciente`, `vuelta_del_retiro`, `lesionado`, `retirado` |

Alcanzables hoy: `amateur_arranque`, `amateur_prometedor`, `amateur_al_limite`,
`amateur_sin_pc`, `tier1_debut`, `tier1_rookie`, `tier1_titular`, `tier1_referente`,
`tier1_franquicia`, `tier1_slump`.

**Gating del contenido** — bloque `contexto` en cada evento/rutina/opción:

```json
"contexto": {
  "etapa": ["profesional", "declive"],
  "nivel": ["tier1"],
  "ventana": ["offseason"],
  "marcas": ["!lesion_cronica"],
  "edadMin": 24, "edadMax": 29
}
```

AND entre claves, OR adentro; `!` niega una marca; clave ausente = sin restricción.

> **REGLA DURA, verificada por validate**: el gating grueso va SIEMPRE en `contexto`. Las
> `conditions` solo pueden estrechar con números sobre paths del estado. **Está prohibido poner
> `conditions` sobre `phase` o `age`.** Si el gating grueso se pudiera esconder adentro de una
> condición numérica, la matriz de cobertura mentiría y todo el sistema de autoría se cae.

**`src/dev/cobertura.js`** — la herramienta que responde "¿qué aparece dónde?":

```bash
node src/dev/cobertura.js                        # matriz momento × ventana
node src/dev/cobertura.js --huecos                # celdas bajo el mínimo
node src/dev/cobertura.js --momento tier1_debut   # qué contenido cae ahí
node src/dev/cobertura.js --evento team_drama     # la pregunta inversa
```

Cada celda muestra **a/b**: `a` eventos pasan el contexto, `b` de ellos **nunca llegan a
disparar** por sus condiciones numéricas. El segundo número es el detector de huecos
disfrazados.

**`src/core/plantillas.js`** — tokens para que el contenido nombre tu carrera real:
`{handle} {rol} {org} {liga} {region} {campeon} {signature} {top} {jungla} {mid} {adc}
{support} {rival}`. `"{jungla} no camina más para vos"` → `"Zenvex no camina más para vos"`.
Validate exige que todo token usado exista.

## 2.6 La escalera de ranked (paso 8)

`src/data/ranked.js` (10 tiers), `src/data/servidores.js` (8 servidores con cupos y cutoffs
reales), `src/core/ranked.js` (selectores puros).

Modelo: **puntos absolutos**. Hierro IV con 0 LP = punto 0; cada división vale 100 LP; los 7
tiers con división ocupan 2800 puntos; el ápice arranca ahí y acumula LP sin techo.

```js
puntosAbsolutos(ranked) · desdePuntos(puntos, servidor) · etiquetaDeRanked(ranked, servidor)
rangoAproximado(ranked, servidor)   // puesto en la ladder, interpolación log
esApice(ranked) · percentil(ranked)
aplicarLP(ranked, deltaLP, servidor, rng)      // la ÚNICA que mueve la escalera
aplicarLPAlEstado(state, deltaLP, rng)         // + mantiene el espejo sincronizado
servidorDeLaPartida(state) · conRanked(state, ranked) · rankedInicial(servidorId, puntos)
```

**`player.soloqElo` es un ESPEJO derivado de solo lectura** = `puntosAbsolutos(ranked)`. Todo lo
que lo *lee* sigue funcionando; lo que lo *escribe* usa el tipo de efecto `ladder`:

```json
{ "type": "ladder", "path": "player.ranked", "min": 10, "max": 25 }
```

Un check impide que cualquier efecto escriba `player.soloqElo` directamente.

**Sin decay, en ninguna forma** (decisión del usuario: un pro juega soloQ todos los días).

**Freno por altura**: la ganancia de LP por bloque depende de la distancia entre tu `mecanica` y
el nivel que exige el rango donde estás. Consecuencia buscada: **el potencial oculto decide tu
techo de ladder sin que se le diga nunca al jugador** — lo intuye cuando el LP deja de moverse.

## 2.7 Las rutinas narrativas (paso 9)

`src/data/rutinas/amateur.json` (15) y `offseason.json` (7). Una rutina es **un reparto de
recursos con texto narrativo encima**:

```json
{
  "id": "clase_y_soloq_hasta_las_dos",
  "titulo": "Clase, siesta corta, y de las 8 a las 2",
  "texto": "Volvés del colegio, dormís una hora, y no te levantás hasta que se te cierran los ojos solos.",
  "etiquetas": ["agresiva"],
  "contexto": { "etapa": ["amateur"] },
  "reparto": { "ranked": 6, "estudiar": 1, "dormir": 2, "familia": 1 },
  "extra": 1, "peso": 10, "pesoAuto": 7
}
```

`src/core/rutinas.js` → `ofrecerRutinas(state, rng, { pool, cantidad })` garantiza la **forma**
de la decisión: siempre ≥1 `segura` (nunca se acorrala al jugador) y ≥1 `agresiva` (la trampa de
`CONCEPTO` §4 siempre a mano). Hay un check que lo verifica.

`aplicarReparto` y `normalizarReparto` **no se tocaron**: la economía es la misma, cambió solo
quién produce el reparto. `normalizarReparto` sigue como red — adapta un reparto de 10 a los 12
bloques del nocturno y evita que una rutina mal declarada invente o pierda tiempo.

**Toda decisión del juego es hoy `tipo: 'opciones'`.** La UI tiene un único camino de render.

---

# PARTE 3 — Estado medido HOY (no confiar en memoria, esto se midió)

## 3.1 Los 21 checks de `validate.js`, en orden

```
Sin aleatoriedad nativa fuera del RNG inyectado
Contrato de sistemas del registro
Esquema de eventos válido
Campeones, roles y ligas coherentes
El mundo se genera desde la seed y varía entre seeds
Balance coherente
Hay al menos un evento de cierre de edad por fase amateur
El contenido declara su contexto con vocabulario válido
Todo texto de contenido usa tokens que existen
Todo efecto tiene etiqueta legible para el log
La escalera de ranked se comporta como la del juego
No hay decay: la escalera no se mueve sola
Nadie escribe el espejo de la escalera
La escalera produce una distribución realista al cerrar la etapa amateur
Toda decisión de rutina ofrece una salida segura y la trampa
El contexto de carrera nombra siempre dónde estás parado
El Ajuste al Meta se mueve de verdad
El ciclo profesional produce carreras distintas
El split cierra siempre: no queda ninguna decisión colgada
Pipeline corre y es determinista (misma seed, dos corridas)
Seeds distintas producen carreras distintas
```

## 3.2 Balance actual — `node src/dev/simulate.js 1500 16 todas`

| estrategia | llega a pro | no llegó | prohibición familiar | burnout |
|---|---|---|---|---|
| equilibrado | **40.2%** | 50.7% | 3.7% | 8.3% |
| ranked | 19.9% | 0.7% | 11.2% | **78.9%** |
| prudente | 33.5% | 66.5% | 0% | 0% |

Distribución de rango al cerrar la etapa amateur (1000 carreras): Platino 1.3% · Esmeralda 8.0%
· Diamante 20.5% · **Máster 57.7%** · Gran Máster 9.2% · **Challenger 3.3%**.

> **Contexto histórico importante**: antes del paso 9 llegaba a pro el 54.9%. Bajó a 40.2% y
> **no es un bug**: con rutinas narrativas hay genuinamente menos control que con una planilla,
> así que el mismo rendimiento por bloque rinde menos. Se compensó parcialmente subiendo
> `lpPorBloque` de 34 a 52 y se frenó ahí a propósito, porque seguir subiendo pelea contra el
> freno por altura. **Si el usuario dice que es muy duro, se ajusta después del paso 12**, no
> antes: recalibrar sin el arco completo es tuning a ciegas.

## 3.3 Estado del catálogo de contenido

- **20 eventos, 40 opciones, 80 outcomes.** Todos los eventos tienen exactamente 2 opciones y
  todas las opciones exactamente 2 outcomes. `CONCEPTO.md` §3 dice "2 a 4 opciones": nunca se
  usaron 3 ni 4.
- Objetivo: **150 opciones**. Faltan 110.
- **8 de los 20 eventos no declaran `contexto`**, así que pueden aparecer en cualquier momento
  de la carrera. Es exactamente el problema que el usuario señaló:
  `scout_call` · `ranked_streak` · `media_meme` · `old_rival` · `tendinitis` · `burnout` ·
  `psychologist` · `sponsor_offer`
- `cobertura.js --huecos` sale **vacío**, pero eso es en parte un artefacto de esos 8 eventos
  sin gatear: llenan todas las celdas por igual. **No leerlo como que el catálogo está bien
  segmentado.**

---

# PARTE 4 — DATOS REALES DE LA INVESTIGACIÓN

> Esta parte no está en el repo. Se investigó con búsqueda web y es la base de todo el realismo
> de los pasos 8 a 13. **Sin esto no se puede continuar bien.** Fecha de la investigación:
> agosto 2026.

## 4.1 Sistema de ranked

- 10 tiers: Iron → Bronze → Silver → Gold → Platinum → **Emerald** (agregado 2023) → Diamond,
  cada uno con **4 divisiones** (IV→I) de **0-100 LP**; luego Master → Grandmaster →
  Challenger, **sin divisiones, LP acumulativo sin techo**.
- **Las series de promoción no existen desde 2023** (Split 2, mismo paquete que introdujo
  Emerald). Al llegar a 100 LP se promociona con *rollover* del excedente.
- Descenso: perder a 0 LP baja de división con LP en **25 / 50 / 75** según MMR.
- Escudo anti-descenso: 10 partidas tras subir de tier (3 en Máster).
- Placements: 5 partidas, techo alcanzable Diamond III.
- LP baseline ±20; **±30 en tiers ápice** (desde parche 26.9, abril 2026).
- Umbrales ápice desde 26.9: **GM 400 LP, Challenger 800 LP** — pero el filtro real son los
  **cupos**: Challenger tiene **300 plazas** (NA, KR, EUW, VN, PH) o **200** (LAS, LAN, EUNE,
  CN, BR, TW, TR); GM ~700 y ~500 respectivamente. La ladder se reordena cada 24h.
- **Cutoffs reales medidos (ago 2026)**: EUW 2398 · KR 1831 · NA 1528 · LAN 1465 · LAS 1287.
  EUW es hoy más duro que KR.
- **Distribución de la población**: Iron 3-8% · Bronze 16-20% · Silver 20-22% · Gold 19-24% ·
  Platinum 15-18% · Emerald 12% · Diamond 4% · Master ~0,3% steady-state · GM 0,062% ·
  **Challenger 0,025% (1 de cada 4.000)**. Diamante+ = top 5%. Máster+ = top 1%.
- **Decay** (implementado como NO existente por decisión del usuario): Diamond −50 LP/día,
  ápice −75 LP/día tras agotar el banco de días.

## 4.2 A qué rango juegan los pros y cómo se los descubre

- El roster de LCK abarca **desde Diamond I hasta 1.800+ LP**. La mediana está en **700-1.400 LP**
  (Challenger bajo / GM alto). Varios supports y veteranos **no grindean soloQ** y pueden estar
  en Diamond o sin cuenta rankeada. **El rango de soloQ no es proxy directo de ser pro.**
- **El prospecto que ficha está en el top 1-50 de Challenger de su servidor a los 15-17.** Caso
  canónico: **Calix**, rank 1 de Corea a los 16, viral por un outplay en soloQ contra el ADC
  titular de T1, fichado por Nongshim RedForce. **Estar en Challenger #250 a los 22 no te ficha
  nadie.**
- Tres vías reales de descubrimiento: (A) ladder de Challenger — angosta, solo top absoluto y
  muy joven; (B) **circuitos tier 2 — la vía dominante**; (C) scouting grounds/combines — en NA
  probablemente muerto desde 2021.

## 4.3 Estructura competitiva 2026 — **el `leagues.json` actual está mal**

**La LTA duró una sola temporada.** Riot la anunció en junio 2024, arrancó en 2025 (fusionando
LCS + CBLOL + LLA) y la **disolvió en septiembre 2025**, devolviendo LCS y CBLOL como ligas
independientes desde 2026. La **LCP sí sobrevivió**. **La LLA no volvió**: LATAM Norte quedó
absorbida por LCS y LATAM Sur por CBLOL.

**6 ligas tier-1 en 2026:**

| Liga | Región | Equipos | Edad mín. | Servidor |
|---|---|---|---|---|
| LCK | Corea | 10 | 17 | KR |
| LPL | China | 14 (12 en Split 3) | 18 | CN |
| LEC | EMEA | 10 (12 en LEC Versus) | **18** | EUW |
| LCS | Norteamérica + Centroamérica | 8 | 17 | NA |
| CBLOL | Brasil + LATAM Sur | 8 | 17 | BR |
| LCP | Asia-Pacífico | 8 | 17 | TW |

**Rosters exactos 2026:**

- **LCK**: Gen.G · T1 · Hanwha Life Esports · KT Rolster · Dplus KIA · BNK FearX · KIWOOM DRX ·
  Nongshim RedForce · Hanjin Brion · DN SOOPers
- **LPL**: Anyone's Legend · Bilibili Gaming · Edward Gaming · Invictus Gaming · JD Gaming ·
  LGD Gaming · LNG Esports · Ninjas in Pyjamas · Oh My God · Team WE · Top Esports ·
  ThunderTalk Gaming · Ultra Prime · Weibo Gaming
- **LEC**: Fnatic · G2 Esports · GIANTX · Karmine Corp · Movistar KOI · Natus Vincere ·
  Shifters · SK Gaming · Team Heretics · Team Vitality
- **LCS**: Cloud9 KIA · Dignitas · Disguised · FlyQuest · LYON · Sentinels ·
  Shopify Rebellion · Team Liquid
- **CBLOL**: Fluxo w7m · FURIA · Leviatán · Los Grandes · LOUD · paiN Gaming ·
  RED Canids Kalunga · Vivo Keyd Stars
- **LCP**: CTBC Flying Oyster · GAM Esports · Fukuoka SoftBank HAWKS gaming ·
  Team Secret Whales · DetonatioN FocusMe · MVK Esports · Deep Cross Gaming ·
  Ground Zero Gaming

**Tier 2 real por región:**

| Región | Circuito | Detalle |
|---|---|---|
| Norteamérica | **NACL** | equipos independientes (ya no hay academy obligatoria), 10 equipos, torneo de promoción a LCS |
| EMEA | **13 ERLs → EMEA Masters** | LFL (Francia), Prime League (DACH), TCL (Turquía), NLC, Ultraliga, LIT, Arabian League, Hitpoint Masters, Rift Legends, LPLOL, EBL, ROL, y la ERL española. 3 splits/año |
| Brasil | **Circuito Desafiante** | 10 equipos, promoción a CBLOL |
| LATAM | **LRN** (Norte) y **LRS** (Sur) | 8 equipos c/u, organizadas por Liga ACE. LRN alimenta LCS, LRS alimenta CBLOL |
| Corea | **LCK CL** + **LCK Academy Series** | academias de las 10 franquicias, **edad mínima 16**, roster integrado con LCK sin call-up formal |
| China | **LDL** | 24 equipos (17 academy + 7 independientes) |

**Calendario 2026**: 3 splits por año en todas las ligas mayores (coincide con
`BALANCE.edad.splitsPorEdad: 3`, que **no hay que tocar**). Internacionales: **First Stand**
(marzo, 8 equipos), **MSI** (junio-julio, 11 equipos), **Worlds** (octubre-noviembre, **19
equipos: 3 por liga mayor + 2 de CBLOL + 2 bonus por MSI**).

**Imports y residencia**: máximo **2 no residentes** en la alineación titular (mínimo 3
residentes) en todas las tier-1. Residencia por ciudadanía o por **4 años compitiendo en la
región**. En 2026 los jugadores de LATAM (excluyendo Brasil) tienen **doble residencia**: no
cuentan como import ni en LCS ni en CBLOL durante 2026-2027, y **desde 2028 deben elegir región
permanentemente**.

**El año muerto es real**: LEC exige 18 años desde 2024. Un prospecto europeo de 17 puede ser
fichado pero no puede debutar.

## 4.4 Carreras: duración, pico y declive

- **Duración media 2,1 años** en la cohorte nacida en 2002+ (mediana 2,43). **Menos del 20%
  sigue activo al 4º año.** Las carreras modernas son ~50% más cortas que las de generaciones
  anteriores (comparaciones entre cohortes con p < 0,001).
- LCK: carrera promedio 2,8 años; 53% tiene menos de 3 años de experiencia; solo 3,9% llega a
  4-5 años.
- **Pico de rendimiento ~21 años, desvío estándar 2,7.** Ventana biológica 16-26, pero la
  mayoría no la agota ni de lejos. Framework de 5 etapas: Entry (≤17) → Growth (17-19) →
  Maturity (19-23) → Decline (23-25) → Transition (25+).
- **EL HALLAZGO MÁS IMPORTANTE — el declive casi no es biológico.** El tiempo de reacción cae
  **~1 ms/año después de los 25**, contra una brecha de **90 ms** entre un casual (280 ms) y un
  pro (190 ms). Es ruido. Lo que sí explica el declive observado: las orgs prefieren jóvenes
  (más baratos, más entrenables), y a los mayores de 25 se les dice que están acabados →
  profecía autocumplida. **La causa modal de retiro es que no te renuevan**, sistemáticamente
  sub-reportada porque nadie anuncia "me retiro porque nadie me contrata".
  → **Consecuencia de diseño: modelar presión de mercado, no decadencia de stats.**
- **El retiro es reversible**: Bjergsen y Doublelift se retiraron y volvieron **dos veces cada
  uno**. Faker sigue activo a los 29-30 con 13+ años de carrera.
- **Servicio militar coreano: determinista, no probabilístico.** Obligatorio, 18-21 meses, hay
  que enlistarse **antes de los 28** (30 si sos figura de élite, por la ley de 2020). Es la
  razón por la que la LCK tiene literalmente cero jugadores en la segunda mitad de los veinte.
- **Lesiones documentadas**: túnel carpiano (Toyz), tendinitis de muñeca (Hai, "la muñeca solo
  me permite un split más"), hombro crónico (Uzi, un médico le dijo que **tenía brazos de
  persona de 50 años**).
- Burnout: 38,3% de los jugadores activos en riesgo alto — **es prevalencia, no tasa de
  retiro**. No leerlo como "38% se retira por burnout".

## 4.5 Champion pool y Fearless Draft

- **Fearless Draft es estándar en todas las tier-1 desde 2025**: cada campeón elegido queda
  bloqueado para ambos equipos el resto de la serie. En el mapa 5 de un Bo5 puede haber **hasta
  40 campeones quemados**.
- Efecto medido: MSI 2023 → 81 campeones únicos; MSI 2024 → 88; **MSI 2025 → 109 en 80 juegos**.
  Worlds 2025: 102 únicos, 75 solo en Swiss. **Faker jugó 14 campeones distintos** en Worlds
  2025 (récord del torneo).
- Pool individual: **post-Fearless típico 10-15 por split, los más anchos 24** (Chovy, Knight).
  Pre-Fearless el típico era 5-8.
- **Requisitos de trainees coreanos, por rango** — dato precioso y todavía sin usar:
  **Diamante 80 partidas/semana y 5 campeones · Máster 65/8 · Gran Máster 50/15.**
  El requisito de **amplitud de pool sube con el rango**. Es una tensión real contra
  `sesgoMaestriaEnPick`, que premia especializarse.

## 4.6 Salarios — distribución lognormal, mediana muy por debajo de la media

- **Mínimos oficiales**: LEC €60.000/año · LCS $75.000/año. LCK tiene piso de gasto por equipo
  (70% del ingreso 2022) y **salary cap con luxury tax** sobre los 5 mejor pagos. LPL tiene soft
  cap de 10M CNY (~$1,4M) por equipo, con tiers S y A que permiten excederlo.
- **LEC** (Sheep Esports, ±€20k): media **€240.000**, **mediana ~€165.000**, rookie ~€115.000.
  Por rol: **Mid €345k · Jungla €250k · ADC €240k · Top €192k · Support €168k**. Imports
  coreanos €160k de promedio. **Ningún jugador de LEC supera €1M desde 2024.**
- **LCK 2018**: media 175M won (~$155k) pero **37,2% ganaba $18-44k** y **más de la mitad menos
  de $89k**. 91,1% generaba ingreso extra.
- **Faker: $6-8M USD/año** estimado. LPL pre-cap llegaba a 30-45M RMB ($4-6,6M).
- **Los premios son marginales**: Doublelift acumuló **poco más de $300.000 en premios en toda
  su carrera** — mucho menos que un solo año de salario.
- Streaming ex-pro top: ~$378.000/año — comparable a un salario de LCS, sin techo de edad ni
  riesgo de no renovación.

---

# PARTE 5 — Decisiones del usuario (textuales)

Respetarlas. Están tomadas y no hay que volver a preguntarlas.

| Tema | Decisión |
|---|---|
| **Duración de carrera** | *"a ver que no sea fijo eso, tipo si te va bien que puedas llegar a los 32 como Faker, EN ALGUNOS CASOS pero que no sea facil, que tengas que tomar las decisiones correctas y todo eso"* |
| **Ranked** | Escalera visible completa (tiers + divisiones + LP). **Sin decay**: *"si sos pro player vas a tener siempre que jugar soloq asi que decaer no tendria mucho sentido"* |
| **Rutinas** | *"si rutinas narrativas, el juego tiene que tener calculo yo mas de 150 opciones tipo en total de dialogo y cosas asi, pero el tema es que tienen que estar fijadas por el momento de la carrera no?, y por si estas en un equipo y todo eso, siento que falta eso, que se sepa cuando sale cada opcion de dialogo, se tiene que saber muy bien donde estas parado en la carrera"* |
| **Ligas** | *"si, ligas 2026 exactas, y que puedas arrancar en equipos ficticios de tier3 pero maximo que eso dure muy poco usualmente, si las, y recorda que haya eventos del equipo y todo"* |

Decisiones de diseño derivadas, ya acordadas:

- **La plata no es un recurso gastable** (`CONCEPTO` §11: "no es un manager"). Es métrica de la
  tarjeta final, gate de eventos, y peso en la decisión de ofertas.
- **Después del retiro se sigue jugando**, con una ventana de ~3 splits para volver.
- Objetivo numérico de duración: mediana **6-10 splits como pro** (2-3,3 años), <20% activo al
  4º año, **0,8%-4% llega a 30+**.

---

# PARTE 6 — Los pasos que faltan

## Paso 10 — Ligas 2026, pipeline tier3→tier2→tier1, DEBUT

**Riesgo: medio.** Es el paso que más datos toca y el que activa 5 momentos pendientes.

**`src/data/leagues.json` reescrito** con el esquema ampliado:

```json
{
  "id": "LEC", "tier": 1, "region": "EMEA", "regionId": "EMEA", "servidor": "EUW",
  "prestigio": 82, "equipos": 10, "edadMinima": 18,
  "cupoImports": 2, "minimoResidentes": 3, "dificultadAdaptacion": 45,
  "cuposInternacionales": 3,
  "salario": { "medianaUSD": 178000, "mediaUSD": 259000, "sigma": 0.72, "minimoUSD": 65000 },
  "desciendeA": "ERL",
  "orgs": [...]
}
```

Las 6 tier-1 con sus rosters exactos (Parte 4.3) + las tier-2 reales (NACL, ERL, Circuito
Desafiante, LRN, LRS, LCK CL, LDL). **Borrar LLA, PCS y VCS como ligas de primer nivel.**

**`src/core/tier3.js`** (nuevo): genera orgs inventadas por región (las tier-3 reales son
efímeras; `CLAUDE.md` permite ligas reales pero los equipos de este nivel deben inventarse).
Reusar `generarHandle` de `src/core/mundo.js`.

**`src/systems/competitivo.js`** (nuevo, va después de `roster` en el registro):
- En qué tier competís; ascensos y descensos.
- **Brevedad forzada del tier 3** (pedido explícito del usuario): `probSalida` ~0.45 por split,
  con dos salidas — subís a tier 2, o el equipo se disuelve y volvés a `nivel: 'libre'`.
  **Check: mediana de permanencia en tier 3 ≤ 2 splits, p90 ≤ 4.**
- **El año muerto**: si firmás pero no tenés la edad mínima de la liga, `career.nivelEfectivo`
  se fuerza a la academia y aparece la marca `espera_edad_minima`, con su momento y su
  contenido.

**DEBUT y DECLIVE no necesitan sistema propio** — y eso valida el diseño del paso 7. DEBUT ya
es `contexto.etapa === 'debut'` y está mecánicamente implementado (`estatus: 'rookie'` →
`draftBase + jerarquía` baja → no te dan tus picks → *"sos el rookie, no decidís casi nada"* de
`CONCEPTO` §2). Solo falta contenido gateado.

**Ajuste a `src/systems/rendimiento.js`**: `posicionParaInternacional: 1` está mal para 2026
(Worlds toma 3 por liga mayor, 2 de CBLOL) → usar `liga.cuposInternacionales`. Distinguir
**First Stand / MSI / Worlds** por `contexto.ventana`.

**Ajuste a `src/core/mundo.js`**: `regionOrigen` hoy se sortea uniforme entre 8 ligas (1/8 de
nacer en Corea). Pesarlo por tamaño de escena.

**Momentos a activar (borrar su `pendiente`)**: `espera_edad_minima`, `tier3_recien_llegado`,
`tier3_probandose`, `tier2_rookie`, `tier2_titular`.

**Actualizar `CONCEPTO.md` §2 y §10**: §10 usa una carrera de ejemplo en LAS/LLA, que ya no
existen.

## Paso 11 — Contratos, mercado, salarios, imports

**Riesgo: medio.** Es donde entra la corrección de fondo sobre el declive.

**`career.contrato`** (org, liga, tier, salarioUSD, años, añosRestantes, cláusula, tipo,
firmadoAEdad) inicializado como **objeto completo de ceros, nunca `null`** (ver Trampa T4).

**`src/core/salarios.js`** (nuevo) — **lognormal**:

```js
salarioDeOferta(liga, { rol, jerarquia, hype, edad, esImport }, rng)
  base = liga.salario.medianaUSD
  mult = exp(gauss(0, liga.salario.sigma))            // mediana << media
  mult *= factorRol[rol]     // Mid 1.44 · Jungla 1.04 · ADC 1.00 · Top 0.80 · Support 0.70
  mult *= 0.6 + (jerarquia/100) * 1.1
  mult *= 0.85 + (hype/100) * 0.45
  return max(liga.salario.minimoUSD, base * mult)
```

Techo blando por liga (ningún LEC pasa €1M; solo LCK/LPL habilitan los 6-8M de Faker). Premios
marginales a propósito.

**`src/core/valorMercado.js`** (nuevo) — **la pieza clave del paso**:

```
valorDeMercado = f(rendimientoReciente, jerarquia, hype, residencia, signature) × sesgoEtario

sesgoEtario:  ≤22 → 1.00 · 23 → 0.95 · 24 → 0.88 · 25 → 0.78 · 26 → 0.66
              27 → 0.52 · 28 → 0.40 · 29 → 0.30 · 30 → 0.22 · 31+ → 0.15
```

Un jugador de 28 con la hoja idéntica a la de uno de 21 recibe **40% de las ofertas**. No juega
peor: el mercado dejó de mirarlo. **Esto es lo que hace funcionar el pedido del usuario**: para
sobrevivir a un sesgo de 0.22 a los 30 hay que tener jerarquía de franquicia, hype alto y
rendimiento sostenido — o sea, haber tomado las decisiones correctas durante diez años.

> **Nota**: el mismo mecanismo ya existe en la etapa amateur
> (`BALANCE.amateur.scoutingSesgoEtario`), donde cierra la ventana de los prospectos. Reusar la
> forma para que el juego tenga un solo modelo de "el mercado prefiere jóvenes".

**`atributos.js`**: la curva de declive **no se borra** (`CONCEPTO` §6 la pide y es la razón
mecánica para invertir en macro) pero se **suaviza ~40%**: sigue perceptible, deja de ser lo que
te retira.

**`src/systems/mercado.js`** (nuevo, corre en offseason):
1. Calcula `valorDeMercado`.
2. Renovación o no → `contexto.mercado = 'sin_renovacion'` con contenido propio.
3. 0-3 ofertas, filtradas por cupo de imports y edad mínima, con la **trampa del equipo grande**
   visible (firmar con un gigante resetea tu jerarquía — `CONCEPTO` §7).
4. Sin ofertas por N splits → `nivel: 'libre'` → `finAnticipado: 'sin_equipo'`.
   **Tiene que ser la causa de retiro más frecuente en la medición.**

**Residencia**: `player.residencias = { KR: 0, EMEA: 0, ... }` en splits. 12 splits (4 años) =
residencia y salto de valor de mercado. La **doble residencia LATAM 2026-2027** es una decisión
única y con fecha: vale un evento dedicado.

**Momentos a activar**: `sin_equipo`, `sin_renovacion`, `import_recien_llegado`,
`veterano_util`, `veterano_al_margen`.

**Actualizar `CONCEPTO.md` §6**: el declive como fenómeno de mercado, no biológico.

## Paso 12 — Retiro emergente, servicio militar, lesiones, vuelta

**Riesgo: ALTO — cambia la semántica de `terminado`.**

Hoy `avanzarSplit` es no-op si `state.terminado`, y `phase: 'retirado'` siempre viene con
`terminado: true`. **El retiro reversible no puede funcionar así.** Separar:

- `phase: 'retirado'` = **estado jugable**, ventana de vuelta abierta, `terminado: false`.
- `state.terminado = true` = la run terminó, mostrá la tarjeta. Lo setea **solo** `retiro.js` al
  agotarse la ventana, o los finales terminales que ya existen.
- **Terminales** (no cambian): `burnout`, `prohibicion_familiar`, `no_llego`.
- **Reversibles**: `sin_equipo`, `retiro_elegido`, `retiro_por_lesion`.
- `vueltasMaximas: 2` sale del dato (Bjergsen y Doublelift). Volver: jerarquía a cero,
  re-placement en la ladder, marca `vuelta_del_retiro` con contenido propio.

**Servicio militar coreano** — `src/systems/servicioMilitar.js`: si la nacionalidad es coreana,
al llegar a los 28 (30 si élite) **no hay tirada**: la decisión es *cuándo*, no *si*. ~5 splits
fuera. Check: ninguna carrera coreana llega a 30 en `profesional` sin el flag resuelto.

**Lesiones** — `src/systems/salud.js`: `tunel_carpiano`, `tendinitis_muneca`, `hombro_cronico`.
Riesgo escalado por **deuda de sueño acumulada**, splits jugados e intensidad de la rutina. Una
crónica pone **techo permanente** sobre `mecanica` (multiplicador en `techoDeCarrera` de
`src/core/curvas.js`) y agrega la marca `lesion_cronica`.

> Esto crea una cadena causal nueva y valiosa: **robarle horas al sueño a los 16 te puede costar
> la muñeca a los 23.** Hoy la trampa del sueño solo cuesta en el momento; con esto la factura
> llega años después, que es lo que pasa de verdad.

**El check que mide la decisión #1 del usuario** — 2000 carreras × 60 splits, 4 estrategias:

```
mediana de splits como pro ∈ [6, 10]              (2-3,3 años — el dato real)
activo al 4º año como pro < 20%                    (el dato real)
llega a age >= 30 ∈ [0.8%, 4%]                     (posible, difícil)
causa de retiro más frecuente = 'sin_equipo'       (el hallazgo de la investigación)
la estrategia 'carrera' llega a 30+ al menos 2.5x más seguido que 'ranked'
```

**El último renglón es la traducción falsable de *"que tengas que tomar las decisiones
correctas"*.** Si llegar a los 32 no depende de las decisiones, el check falla y el paso no
cierra. Requiere una **cuarta estrategia** en `src/dev/estrategias.js`: `carrera` (prioriza
mentalidad, salud, jerarquía y estabilidad contractual sobre el pico de rendimiento).

**Momentos a activar**: `servicio_militar`, `retirado_reciente`, `vuelta_del_retiro`,
`lesionado`, `retirado`.

## Paso 13 — Eventos de equipo y expansión a 150+ opciones

**Riesgo: bajo. Es el paso que cierra el pedido original del usuario.**

**`src/systems/roster.js`** enriquece cada compañero: `edad`, `nacionalidad`, `esImport`,
`personalidad` (`veterano_cinico | rookie_ansioso | estrella_egocentrica | soldado_callado |
carismatico`) y **`relacion` 0-100** que deriva con los splits juntos y se mueve con los
eventos. Variable barata que multiplica el contenido: el mismo evento de vestuario se lee
distinto con el jungla que te banca que con el que te odia.

**JSONs nuevos, todos gateados por contexto:**

| archivo | contexto principal | ~eventos |
|---|---|---|
| `equipo.json` | `nivel: tier1/tier2` | 12 |
| `vestuario.json` | gateados por `relacion` y `personalidad` | 10 |
| `mercado.json` | `ventana: offseason`, `mercado: ultimo_ano/sin_renovacion` | 10 |
| `region.json` | `residencia: import`, `import_recien_llegado` | 8 |
| `soloq_pro.json` | la cuota coreana, `nivel: tier2/tier3` | 6 |
| `declive.json` | `etapa: declive`, `edadBanda: tardia/veterana` | 10 |
| `retiro.json` / `vuelta.json` | `etapa: retirado` | 8 |
| `salud.json` | amplía el actual, marcas de lesión | +6 |
| `draft.json` | Fearless: pool angosto castigado en el mapa 5 | 6 |

**Además: gatear los 8 eventos que hoy no declaran contexto** (`scout_call`, `ranked_streak`,
`media_meme`, `old_rival`, `tendinitis`, `burnout`, `psychologist`, `sponsor_offer`). Hasta que
eso pase, `--huecos` da una lectura optimista falsa.

**La cuota coreana de soloQ** (Diamante 80 partidas/5 campeones · Máster 65/8 · GM 50/15) es un
mecanismo hermoso: el requisito de amplitud de pool **sube con el rango**, lo que empuja contra
`sesgoMaestriaEnPick` y conecta con el Fearless Draft. `CONCEPTO` §7 ya lo promete y no existe.

**Flujo de autoría**: `cobertura.js --huecos` → escribir eventos gateados exactamente a esas
celdas → repetir hasta que salga vacío. **El check de cobertura pasa de reporte a check duro en
este paso**, cuando el contenido existe.

**Guarda contra inflar la partida** (`CONCEPTO` §11: no más de 12 minutos): 150+ opciones es
tamaño de **catálogo**, no de partida. Check: sobre 500 carreras, decisiones por carrera entre
25 y 40, y por split entre 1 y 2. Agregar contenido tiene que aumentar la variedad **entre**
partidas, nunca la duración de una.

**Oportunidad**: hoy los 20 eventos tienen exactamente 2 opciones. `CONCEPTO` §3 dice "2 a 4".
El contenido nuevo debería usar 3 y 4 donde tenga sentido.

---

# PARTE 7 — Trampas conocidas (esto ya costó tiempo)

### T1 — Desplazamiento del stream de RNG
Todo sistema nuevo que consuma `rng()` corre el stream de todo lo que viene después. Los
agregados se sostienen pero **ninguna seed reproduce la misma carrera entre versiones**.
**Mitigación**: early return sin tocar `rng` cuando el sistema no aplica. El determinismo
intra-versión (lo que validate mide) sigue intacto; la pérdida de comparabilidad entre versiones
es aceptable y se documenta en `PROGRESO.md`.

**Técnica útil para verificar que un paso no movió nada**: extraer `HEAD` a un directorio aparte
con `git archive HEAD | tar -x -C <dir>` y comparar una huella de N seeds
(`finAnticipado:splits:soloqElo`) entre ambas versiones. Así se comprobó que el paso 7 no movió
un decimal.

### T2 — El contexto se calcula EN VIVO, no se lee del caché
`state.contexto` es una foto del **arranque** del split. La fase puede cambiar a mitad de split
(el split en el que firmás, sin ir más lejos). **Todo filtrado de contenido tiene que llamar a
`calcularContexto(state)`**, no leer `state.contexto`. Este bug ya se cometió una vez y movió
los agregados sin motivo aparente.

### T3 — El cursor de reanudación va por `sistemaId`, no por índice
`state.pendiente` guardaba un índice de `ETAPAS_SPLIT`. Agregar un sistema corre todos los
índices y corrompe cualquier partida serializada a mitad de split. Ya está arreglado — **no
volver a introducirlo**.

### T4 — Paths que no existen en `createInitialState`
`validate.js` exige que todo `field` de condición y todo `path` de efecto exista en el estado
inicial. Entonces `career.contrato`, `player.lesion`, `player.residencias` tienen que
inicializarse como **objetos completos con ceros, nunca `null`**.

### T5 — Un check que referencia una clave inexistente nunca falla
`validate.js` tenía `if (BALANCE.meta.pesoDominante <= BALANCE.meta.pesoMinimo)` después de que
esa clave se borrara. `undefined <= 0.5` es `false`: **el check pasaba siempre y daba falsa
confianza durante dos pasos.** Al escribir un check nuevo, verificar que falla cuando debe.

### T6 — No comparar contra una línea de base vieja
El balance de un changelog viejo puede haber sido medido antes de que existieran sistemas
posteriores. Ya pasó: se comparó el paso 7 contra una tabla del paso 4 y pareció una regresión
que no existía. **Medir la línea de base en el momento, no citarla de memoria.**

### T7 — Elegir por argmax sobre suma ponderada siempre da el extremo
El jugador automático elegía la rutina maximizando la suma ponderada contra los pesos → siempre
la más extrema → 70% de burnout. La función correcta es **minimizar la distancia contra las
proporciones deseadas**: "cuál de estas se parece más a cómo lo habría repartido yo".

### T8 — Verificar que las ediciones de HTML/JSON por script realmente aplicaron
Un reemplazo de texto que no matchea falla en silencio. Ya pasó: se borró `mostrarReparto` pero
quedó la llamada, y el reemplazo del render de opciones no se aplicó, así que las rutinas se
mostraban **sin su texto narrativo** — la mitad de la decisión. **Después de editar por script,
grepear el resultado.**

### T9 — `maxDecisionesPorSplit: 8` va a quedar corto
Con mercado + rutina + evento + evento + cierre de edad ya son 5, y el paso 12 agrega retiro y
vuelta. Subirlo **conservando el tope**: es la única red contra un loop infinito.
Y ojo con `CONCEPTO` §2, que dice **1-2 decisiones por split**: la oferta de mercado y la rutina
de offseason deberían ser la misma decisión cuando ambas caen, o alternarse.

### T10 — El pool de eventos se vacía con gating fino
`events.js` loguea *"Un split tranquilo, sin eventos destacados"* cuando no hay candidatos. Con
`contexto` estrechando, eso va a pasar más hasta que exista el contenido. **Medirlo**: fracción
de splits sin evento < 25% en todos los contextos alcanzables.

---

# PARTE 8 — Reglas de proceso

1. **Un paso por commit**, cerrando la Definición de terminado completa.
2. **Nunca cambiar la estructura y retunear las constantes en el mismo commit.** Primero medir
   con la estructura nueva, después tunear.
3. **Si el balance no vuelve a banda después de un cambio estructural, primero agregar
   contenido** (rutinas, eventos) antes de tocar constantes. Solo tunear cuando el espacio de
   decisiones ya esté cubierto — y decir explícitamente en `PROGRESO.md` cuando se tunea y por
   qué.
4. **Reportar los números medidos, no los esperados.** Las entradas de `PROGRESO.md` existentes
   incluyen las tablas reales, incluidas las que empeoraron.
5. **Actualizar `CONCEPTO.md` cuando el código lo contradiga**, o deja de ser fuente de verdad.
   Pendientes: §2 y §10 (paso 10), §6 (paso 11).
6. Cada paso debe **activar sus momentos pendientes** en `src/data/contextos.js` (borrar la
   marca `pendiente`) y verificar con `cobertura.js` que aparecen de verdad. El check
   *"El contexto de carrera nombra siempre dónde estás parado"* falla si un momento activo nunca
   se observa en 300 carreras.

---

# PARTE 9 — Verificación

Cada paso cierra con:

```bash
node src/dev/validate.js                  # los 21 checks + los nuevos del paso
node src/dev/simulate.js 1500 40 todas    # 0 crashes
node src/dev/cobertura.js --huecos        # ver qué contenido falta
git commit                                 # + PROGRESO.md actualizado
```

Verificación end-to-end específica por paso:

- **10**: traza de una carrera mostrando tier3 → tier2 → tier1, con mediana de permanencia en
  tier 3 ≤ 2 splits. Un europeo fichado a los 17 vive el año muerto. Los 5 momentos del paso
  aparecen en `cobertura.js`.
- **11**: distribución de salarios claramente lognormal (mediana << media), `sin_equipo`
  apareciendo como final, y una traza donde a un jugador de 28 con buena hoja le llegan
  visiblemente menos ofertas que a los 21.
- **12**: el bloque completo de checks de duración de carrera, incluido que la estrategia
  `carrera` llegue a 30+ al menos 2,5x más seguido que `ranked`.
- **13**: `cobertura.js --huecos` vacío, ≥150 opciones en el catálogo, decisiones por carrera
  entre 25 y 40, y los 8 eventos sin contexto ya gateados.

**Prueba en navegador real** al cerrar el paso 13 (ya se hizo en pasos anteriores): levantar
`node server.js`, abrir `http://localhost:8000`, jugar una carrera completa clickeando, y
confirmar cero errores de consola. El motor no toca el DOM, así que un fallo acá es siempre de
`index.html`.

---

# PARTE 10 — Después de los 13 pasos

Queda fuera de este plan pero es lo que cierra `CONCEPTO.md`:

- **`src/systems/legado.js`** — la tarjeta final (`CONCEPTO` §9). El veredicto **se compone**:
  arquetipo base + modificador + un detalle único de esa partida ("El eterno cuarto puesto",
  "Leyenda regional", "El que se fue a Corea y volvió peor", "El que no llegó"). El puntaje se
  pondera **por rol** (si fuera solo KDA nadie jugaría support). Ya existe `ROLES[].visibilidad`
  en `src/data/roles.js` como base.
- **`src/systems/rivales.js`** — los 5 rivales de generación ya se generan en `mundo.js` pero no
  corren su carrera en paralelo. Falta que lo hagan y que la tarjeta diga tu puesto en la
  generación.
- **`src/ui/`** — la carpeta existe y está **vacía**. `DISENO.md` §4.1 pide `render.js`,
  `/screens` y `/components`; hoy toda la UI vive en `index.html` (416 líneas).
- **Criterio de balance final de `CONCEPTO` §11**: si más del 25% de las partidas termina en el
  mismo arquetipo, el balance está roto. **Ese criterio no se puede evaluar hasta que exista la
  tarjeta de legado**, porque los arquetipos son de la tarjeta. La pasada de balance fina va
  después del sistema de legado, no antes.
