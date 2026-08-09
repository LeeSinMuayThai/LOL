# Progreso

Documento vivo. Se actualiza al cierre de cada tarea, según la Definición de terminado de CLAUDE.md.

## Estado por fase (DISENO.md §6 "Orden de construcción")

| # | Fase | Estado |
|---|---|---|
| 1 | Andamiaje (state, rng, pipeline, guards, validate) | ✅ Completa — reconstruida en el paso 1 del 2026-08-07 |
| 2 | Jugador inicial, etapa amateur y loop de splits | ✅ Completa — bucle de atención, bandas de riesgo y tres salidas (paso 3) |
| 3 | Atributos, rendimiento y progresión básica | ✅ Completa — `atributos.js` con formas de carrera y `rendimiento.js` (pasos 4 y 6) |
| 4 | Champion pool, meta y ajuste al meta | ✅ Completa — `campeones.js` + `ajusteMeta.js` (paso 5) |
| 5 | Práctica dirigida entre splits | ✅ Completa — `practica.js` con puntos de preparación (paso 6) |
| 6 | Motor de eventos y validación | ✅ Completa |
| 7 | Roster, sinergia y jerarquía | ✅ Completa — `roster.js` + draft condicionado por jerarquía (paso 6) |
| 8 | Contratos, regiones y movilidad | ⬜ Pendiente — no existen `contracts.js` ni `regions.js` |
| 9 | Rivales de generación y scoring final | 🔶 Parcial — los 5 rivales se generan de la seed, pero no corren su carrera ni existe `scoring.js`; **falta el retiro y la tarjeta de legado** |
| 10 | Simulación masiva y balance fino | 🔶 En curso — `simulate.js` corre 3 estrategias sobre el pipeline real y se usó para calibrar cada paso; falta la pasada final con el arco completo |
| 11 | Refinamiento visual | ⬜ Pendiente — `src/ui/` sigue vacía y la UI vive en `index.html` |

**Lo que falta para cerrar el arco de `CONCEPTO`**: la temporada regular como partidos jugables y
el meta con nombre (`PLAN.md` fases 5 y 6, insertadas el 2026-08-09 antes del mercado — ver esa
tabla de estado), retiro y tarjeta de legado (§9), contratos y movilidad entre regiones (§6),
rivales de generación corriendo en paralelo (§6), las etapas DEBUT y DECLIVE (§2), y contenido de
eventos (44 de los ~200 que pide §8, con 90 de las 150 opciones objetivo).

## Changelog

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
