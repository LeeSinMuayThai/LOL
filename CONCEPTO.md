# CONCEPTO — Cómo funciona el juego

Este documento explica QUÉ ES el juego y POR QUÉ los sistemas están conectados
como están. No explica cómo implementarlo: eso está en `DISENO.md`.

Si vas a tocar el código y no entendés por qué existe un sistema, la respuesta
está acá. Si un cambio rompe alguna de las cadenas causales de la sección 7,
el cambio está mal aunque el código funcione.

---

## 1. Qué es

Un simulador narrativo de carrera de jugador profesional de League of Legends.

Arrancás a los 15 años, siendo un pibe cualquiera grindeando soloQ en su
pieza. Terminás retirándote — o no llegando nunca. En el medio, una carrera
entera construida a partir de decisiones: qué campeones aprendés, cuánto
sacrificás, a qué equipo firmás, cuándo te vas del país, cuándo decís que no.

Dura entre 25 y 40 minutos. Se juega de una sentada, en el navegador, sin
cuenta ni instalación. Al final te da una tarjeta con tu legado.

> Actualizado en la fase 8 del `PLAN.md`: la estimación original (4-10 minutos) era anterior al
> Bo5 con Fearless y draft (fase 4), a la temporada regular jugable (fase 5) y al mercado de pases
> (fase 9) — sistemas que el usuario pidió explícitamente como centrales, no opcionales. La
> duración larga es una decisión tomada, no una regresión de scope.

**La referencia directa son El Ídolo (Potrero Fútbol) y Copero**: historias
interactivas cortas donde un motor simula la carrera y vos solo decidís en los
momentos que importan. El esqueleto es el mismo — motor de simulación, baraja
de eventos, decisiones en momentos bisagra, tarjeta final compartible. Lo que
cambia es que el ecosistema de LoL da sistemas que el fútbol no tiene: el meta
que rota y te deja obsoleto, el champion pool como identidad, los cupos de
import, y carreras que se terminan a los 27-28.

**El jugador siempre quiere ir a más** — como en El Ídolo del Potrero. Ganar el
scrim, subir de liga, ganar el clásico, llegar al internacional, ganarlo. La
carrera empuja hacia arriba todo el tiempo; el techo real lo ponen el talento
que te tocó, el meta y las decisiones. La tarjeta final mide hasta dónde
llegaste contra hasta dónde podías llegar.

---

## 2. La forma de una partida

> **Corregido en la fase 13** (2026-09-18): este diagrama traía dos residuos de antes de las fases
> 4/5/9/10 — duraciones parciales que sumaban ~7 minutos (contradiciendo la línea 21, "25-40
> minutos", vigente desde la fase 8) y un tramo final con edad de corte fija ("27-34 años DECLIVE Y
> RETIRO"), que 10a reemplazó por el retiro emergente ("te retirás cuando el mercado deja de
> llamarte", nunca por cumplir años — regla de proceso 5, pendiente desde la fase 10 y saldada acá).

    15-17 años    ETAPA AMATEUR
                  SoloQ, colegio, familia. Podés perder acá.
                  6 periodos.

    17-19+ años   DEBUT — TIER 3 → TIER 2 → TIER 1
                  Nadie pisa una liga real de entrada. Fichás con un equipo
                  chico e inventado (tier 3) donde no dura casi nadie —
                  sube a una liga de desarrollo real (NACL, LDL, LCK CL...)
                  o el equipo se disuelve y aparece otro. Desde ahí, si
                  rendís, asciende a una de las seis ligas tier 1 de 2026.
                  La única salida directa es el caso Calix: estar en el
                  top absoluto de Challenger y todavía joven te salta el
                  tramo de tier 3. Sos el rookie, no decidís casi nada.

    19+ años      CARRERA PROFESIONAL
                  El grueso del juego. Splits, metas, fichajes, torneos,
                  el mercado de pases (fase 9M) y el ranking mundial (9W).

    Edad variable DECLIVE Y RETIRO — EMERGENTE, NUNCA UN RELOJ FIJO (fase 10a)
                  No hay corte por edad: entrás en declive cuando el
                  MERCADO deja de preferirte —te banquean, caíste de tier 1
                  y no volviste, tu nivel se alejó de tu propio pico
                  (`CONCEPTO` §12.4: "el declive casi no es biológico")—, no
                  cuando cumplís años. El retiro es reversible (10a): la
                  decisión real es cómo salís, o si volvés. Una carrera
                  corta puede cerrarse a los 20; una larga llega a los
                  29-30, como la de Faker.

    FIN           TARJETA DE LEGADO
                  Veredicto compuesto, métricas, tu puesto en tu generación.

Cada etapa tiene su propia forma de decisión. No es el mismo juego a los 16
que a los 24, y eso es deliberado: mantiene la partida fresca de punta a punta.

### El compás: edad, split y decisión

Bajando un nivel, toda etapa late con el mismo compás, sin importar si estás
en la etapa amateur o ya sos profesional:

**Cada edad (cada año que cumplís) dura exactamente 3 splits.** Un split es
la unidad mínima de avance del motor. Tres splits por edad es lo que le da
ritmo a la etapa amateur: dos edades (15 y 16 años) son los 6 periodos de los
que habla la sección anterior.

**Cada split trae 1 o 2 decisiones**, nunca más. La mayoría de los splits
tiene una sola interrupción — un evento con opciones — pero a veces la vida
se amontona y aparece una segunda antes de que el split cierre. Nunca hay un
split sin nada en juego y nunca hay tantas decisiones que se sienta tarea.

**Cada split es, además, un parche.** El meta se mueve un poco en cada uno —
nunca un volantazo, un parche calmo que reacomoda pesos entre arquetipos de
campeón. El jugador no lo elige ni lo controla: lo nota en cómo le rinde el
pool que tiene armado.

**El tercer split de cada edad cierra la temporada.** Ahí no hay una decisión
más — hay LA decisión de la edad: la más grande de las tres, la que pesa
distinto porque llega después de haber visto un año entero de resultados.
Justo antes aparece el resumen de la season: un vistazo a cómo cambiaste vos
(elo, sueño, estudios, confianza familiar, stats) desde que arrancó la edad.
Es el momento en el que el jugador respira, mira para atrás, y decide con
más información que en cualquier otro punto del split.

Este compás (edad = 3 splits, 1-2 decisiones por split, parche por split,
cierre de edad con decisión grande + resumen) es el que gobierna toda la
partida. Hoy está construido en la etapa amateur; el resto de las etapas lo
va a heredar a medida que se implementen.

---

## 3. El bucle central

Hay UN solo recurso escaso en todo el juego, y cambia de disfraz según la
etapa: **tu atención**. Nunca alcanza para todo.

**Nunca se reparte el tiempo con una planilla.** El recurso existe adentro del
motor —en la etapa amateur son bloques de tiempo entre rankeds, estudiar,
dormir y familia; en la profesional son puntos de preparación entre pulir
campeones, aprender campeones nuevos, entrenar mecánica, estudiar macro o
descansar— pero el jugador nunca lo ve así. Lo que ve son **rutinas**: tres o
cuatro formas concretas de vivir ese periodo, con nombre y con voz.

*"Clase, siesta corta, y de las 8 a las 2"* es un reparto de bloques con la
cara puesta. *"Dos semanas sin tocar el juego"* también. Elegir una rutina es
elegir un reparto, pero se lee como una decisión de vida y no como un
formulario — que es la única forma de que el juego se parezca a su referencia
(sección 1) en vez de a un manager.

Esa es también la razón de que el reparto no sea libre: **no siempre está
disponible la rutina que querrías**. Lo que sí está garantizado en cada
decisión es que haya al menos una salida segura —nunca se te acorrala en una
mala elección— y al menos una agresiva, porque la trampa tiene que estar
siempre a mano aunque convenga no tomarla.

**La mentalidad es la moneda con la que pagás.** Casi todo lo que te hace
mejor jugador te cuesta mentalidad, y la mentalidad en cero es el fin de la
carrera. No hay forma de maximizar todo. El juego es elegir qué sacrificás.

Sobre ese bucle se apoyan los eventos: interrupciones con 2 a 4 opciones que
aparecen entre medio y que pueden mover cualquier barra. Los eventos no
reemplazan las decisiones de reparto, las contaminan.

---

## 4. Etapa amateur: de dónde arranca todo

Esta etapa existe por tres razones: pone una decisión importante en los
primeros diez segundos, es la única parte del juego donde podés perder de
verdad, y genera el final más compartible de todos.

Sigue el compás general de la sección 2: dos edades (15 y 16 años), 3 splits
cada una. Cada split trae su decisión (a veces dos), y el tercer split de
cada edad cierra con el resumen de la temporada y una decisión más grande —
acá suelen aparecer los momentos bisagra del año: cómo administrás el receso,
qué les decís a tus viejos después de ver los números.

**Tres barras en tensión.** Estudios decae solo cada periodo. Confianza
familiar depende de los estudios pero también de eventos propios. SoloQ LP es
tu progreso hacia que te vean.

**Robarle al sueño es la trampa.** Podés tomar hasta 3 bloques extra por
periodo sacándoselos a las horas de dormir. Es la única forma de tener todo
a la vez, y cuesta mentalidad. El costo es acumulativo: dos periodos seguidos
y el segundo pesa más; tres y entrás en deuda de sueño, que te frena la
progresión y habilita eventos de agotamiento.

**Si los estudios se caen, se termina.** Pero no hay un número exacto donde
pincha: hay bandas de riesgo que crecen a medida que la barra baja,
multiplicadas por lo estrictos que te tocaron los viejos. Primero llegan los
avisos, después crece la chance de que te confisquen la PC y pierdas un
periodo entero, y más abajo la chance de corte definitivo. Podés zafar con
la barra por el piso y podés comértela con la barra a medias. Si pasa: tarjeta especial con el veredicto "El que no
llegó", tu elo máximo, los scouts que te habían mirado, y qué fue de los cinco
pibes de tu generación que sí llegaron.

**Hay tres formas de escapar**, y todas dependen de haber construido algo
antes: llegar a Máster con la confianza familiar todavía en pie y disparar la
negociación con tus viejos; que un equipo te fiche antes de que caigas; o
pasarte a nocturno, que cuesta confianza familiar pero te salva a largo plazo.

**A los 18 la barra no desaparece, se congela.** Se convierte en un flag
permanente que te acompaña toda la carrera. El que terminó el secundario tiene
mejores pesos en los eventos de crisis y más salidas al retirarse. El que lo
dejó tiene eventos exclusivos, miedo al retiro, y acepta peores contratos por
seguridad. Ninguno de los dos es el camino correcto.

---

## 5. El ciclo de un split profesional

Una vez que sos pro, la partida avanza en splits. Cada split corre siempre en
el mismo orden, y entender ese orden es entender el juego:

**1. Llega el parche.** Cada tres splits (al abrir la season) hay 60% de
chance de que cambie el **régimen de meta** vigente — "meta de tanques",
"meta de asesinos", "meta de hipercarry"— y a mitad de cualquier split hay 25%
de un parche correctivo que puede virarlo de nuevo. El cambio se anuncia con
nombre, nunca como una deriva silenciosa.

**2. Se recalcula tu lugar en el meta.** Dos paneles, no un número: tu
champion pool con sus maestrías al lado de la tier list (S/A/B/C) de tu rol
para el régimen vigente. Si alguno de tus campeones coincide con la tier
alta, tenés un boost — legible de un vistazo, no un promedio abstracto. La
tier list tiene memoria: cuando cambia el régimen, el log dice los saltos que
te tocan a vos ("tu Sylas: S → C").

**3. Se juega la temporada regular — pero no partido por partido.** El motor
corre el calendario completo contra el resto de tu liga en silencio y arma
una tabla de posiciones real. De esas 7 a 9 fechas, elige las 2 o 3 que
tienen algo en juego —contra el puntero, un clásico contra tu ex equipo,
la fecha que define la clasificación, la revancha— y esas sí las jugás: un
draft corto si tu pool lo permite, un momento con 2 a 4 opciones que **mueve
el resultado de ESE partido**, y el resultado inmediato con la tabla
actualizada. El resto del calendario pasa resumido en una línea. La decisión
llega antes del resultado, nunca después: es la diferencia entre apostar a un
partido y leer su crónica.

**4. Playoffs.** Si clasificaste, tu equipo entra a un bracket de 6 (los dos
mejores sembrados con bye directo a semifinal) y tu camino se juega serie por
serie, mapa a mapa, con **Fearless draft**: cada campeón que jugás vos o el
rival queda bloqueado el resto de esa serie. El rival quema primero, y quema
del meta — por eso un pool todo-meta se te agota rápido y uno con comfort
picks aguanta. El motor elige tu campeón solo cuando la elección es obvia; te
para cuando quedan dos opciones, cuando el mapa es decisivo, o cuando se
quemó todo y te toca un comodín fuera del pool. En semis, la final y el
internacional, un mapa cerrado puede disparar un minijuego —robar el Barón si
sos jungla, la llamada bajo reloj si no— que corre el resultado del mapa un
puñado de puntos, nunca lo decide solo. Ganar la final te hace campeón de tu
liga; clasificar además a un internacional (por posición de temporada
regular, no por el resultado del bracket) te pone una serie más, contra un
rival de otra región.

**5. Eventos.** Drama, salud, guita, vida personal. Lo que le pasa a un pibe
de 21 años que de golpe cobra en dólares. Cada tanto, un evento te deja
elegir a qué campeón meterle horas las próximas semanas: así el pool se
mueve durante la carrera, en vez de quedar clavado en lo que elegiste a los
15 años.

**6. Offseason.** Repartís puntos de preparación. Llegan ofertas. Decidís si
te quedás o te vas. El roster cambia y la sinergia se resetea parcialmente.

Y vuelve a empezar. Entre 8 y 20 veces según cuánto dure tu carrera.

---

## 6. Los sistemas, uno por uno

**ATRIBUTOS.** Mecánica (sube y baja siguiendo una forma de carrera sorteada
—precoz, estándar, meseta larga, tardía o errática— sin edad de pico fija ni
declive anunciado), Macro (crece toda la vida y no declina — es lo que
sostiene a los veteranos), Teamfight,
Laneo, Shotcalling, Adaptabilidad y Mentalidad. Cada rol los pondera distinto.
Además tenés un potencial oculto que nunca ves: solo lo intuís por cómo crecés.

**CHAMPION POOL.** Arrancás con 3 campeones. Cada uno tiene maestría de 0 a
100 y tags de arquetipo (tanque, asesino, escalado, engage, enchanter...).
Los campeones que no jugás pierden maestría. No podés mantener diez a punto.
Cuando uno pasa maestría 85 con muchas partidas encima, se vuelve tu signature
y va a la tarjeta final: "el mejor Azir de Occidente".

**META.** No es un número, es un **régimen con nombre**: meta de tanques, de
asesinos, de hipercarry, de splitpush, de peleas 5v5, y así — nueve en total,
cada uno sube ciertos arquetipos de campeón y hunde otros. Cambia como una
noticia, no como una deriva: 60% de chance al abrir cada season, 25% de un
parche correctivo a mitad de cualquier split. Contra ese régimen se arma la
tier list de tu rol (S/A/B/C), y tu boost sale de cruzarla contra tu pool
ponderando por maestría — cuantos más campeones tuyos caen en tier alta, más
te favorece el parche. Multiplica tu rendimiento entre 0.75x y 1.25x.

**JERARQUÍA.** Tu lugar dentro del equipo, de "el rookie" a "la franquicia".
No es cosmética: define si te dan el pick que querés, si el jungla camina para
vos, si tus llamadas se ejecutan, quién se come la culpa cuando pierden, y
cuánto poder tenés para negociar. Al cambiar de equipo se resetea parcialmente.

**ARRAIGO.** Distinto de la jerarquía y no confundirlo con ella: la jerarquía
es tu estatus *deportivo* dentro del roster (se resetea al cambiar de equipo);
el arraigo es lo que la gente de una organización siente por vos, y **no se
resetea nunca** — se acumula mientras estás, y queda registrado para siempre
en tu historia con esa org. Sube con los splits jugados, los títulos y rendir
por encima de lo esperado. Tiene cuatro hitos con nombre (uno más → querido →
ídolo → leyenda) y es el costo emocional, hecho número, de aceptar la oferta
del equipo grande: te vas con el arraigo que construiste tirado, y arrancás de
nuevo casi en cero en el lugar nuevo — salvo que tu fama ya te haya precedido.

**SINERGIA.** La química colectiva del roster, distinta de tu estatus personal.
Un equipo con sinergia alta rinde por encima de la suma de sus partes.

**HYPE.** Fama pública, completamente separada del skill. Un clip viral te
sube hype sin subirte un punto de mecánica. El hype define quién te ficha,
cuánto te pagan y cuánto vale tu carrera de streamer después.

**REGIONES E IMPORTS.** Cada equipo tiene cupo limitado de jugadores no
residentes. Para que te fichen como import tenés que ser claramente mejor que
el mejor local disponible, no apenas mejor. Después de varios splits en una
región ganás residencia y dejás de ocupar cupo, y tu valor de mercado pega un
salto. Mudarte de región te penaliza el primer split, más fuerte a Corea o
China, y te resetea la jerarquía.

**CONTRATOS.** Duración, sueldo, cláusula de salida, letra chica. Firmar tres
años en un equipo mediano te da estabilidad y te clava si en el año 2 aparece
la oferta de tu vida.

**RIVALES DE GENERACIÓN.** Cinco pibes que debutan tu mismo año y corren toda
la carrera en paralelo. Uno se retira a los 20, otro gana Worlds, otro se
vuelve streamer y factura más que todos. En un seed sos el mejor de una
generación floja; en otro sos el cuarto de una generación histórica.

---

## 7. Cómo se enganchan (esto es lo importante)

Los sistemas sueltos no son el juego. El juego son las cadenas causales que
forman entre ellos. Si tocás el código y rompés una de estas, rompiste el
juego aunque los tests pasen.

### La espiral central

    jerarquía baja  →  no te dan tu pick  →  jugás con maestría baja
        →  rendís peor  →  la jerarquía baja más

Es un bucle de retroalimentación en las dos direcciones. Un buen split te
sube la jerarquía, lo que te da tus picks, lo que te hace rendir mejor.
Un mal split te empuja hacia abajo. Por eso los primeros splits en un equipo
nuevo pesan tanto más de lo que parecen.

### La espiral del meta

    rota el meta  →  tu ajuste cae  →  rendís peor  →  cae la jerarquía
        →  menos control sobre tu draft  →  rendís todavía peor

La salida existe pero llega tarde: aprender campeones del meta nuevo cuesta
puntos de preparación y la maestría arranca baja, así que el split siguiente
todavía rendís mal. Un cambio de meta te puede costar un año entero.

Esa es la razón mecánica para invertir en un pool ancho aunque hoy no lo
necesites. Y es la razón por la que el draft fearless del mapa 5 importa:
castiga directamente a los pools angostos.

### El precio de todo

    cualquier mejora  →  cuesta mentalidad  →  mentalidad en cero = burnout

La mentalidad es lo que convierte cada decisión de reparto en un dilema real.
Sin ella, siempre convendría entrenar al máximo.

### Fama y talento son cosas distintas

    rendir bien   →  sube hype  →  mejores ofertas
    clip viral    →  sube hype  →  mejores ofertas (sin subir nada más)

Que el hype tenga dos fuentes es lo que permite el arquetipo del jugador
sobrevalorado —carrera millonaria con skill medio— y su inverso, el jugador
respetadísimo por los que saben que nunca cobró lo que valía.

### La trampa de firmar por el equipo grande

    fichás a un gigante  →  se resetea tu jerarquía  →  volvés a ser
        "un titular más"  →  no te dan tus picks  →  rendís peor
        →  en un vestuario con tres estrellas, no hay margen

Por eso ir al equipo más fuerte nunca es la decisión obvia. Ser la franquicia
de un equipo mediano puede darte mejor carrera que ser el cuarto nombre de un
gigante.

### La cadena de la etapa amateur

    robarle horas al sueño  →  más bloques  →  más elo y más estudios
        →  pero baja la mentalidad, y el costo se acumula
        →  entrás en deuda de sueño justo cuando te empiezan a mirar

Y en paralelo:

    priorizar ranked  →  caen los estudios  →  cae la confianza familiar
        →  se acerca la prohibición  →  pero si llegás a Máster antes,
           se abre la negociación y te salvás

Es una carrera contra el reloj entre dos barras que se mueven en direcciones
opuestas.

---

## 8. Por qué cada partida es distinta

Es el requisito número uno del proyecto, y se sostiene en cuatro capas
simultáneas, todas alimentadas por la misma seed:

**Rangos en vez de valores.** Ningún efecto es un número fijo. Todo es un
sorteo dentro de un rango, y el rango se modula por contexto.

**Curvas en vez de escalones.** Ninguna transición es abrupta y ningún umbral
es una puerta: son probabilidades que crecen. No existe la edad en la que
empezás a declinar ni el número exacto donde te prohíben jugar. Además cada
jugador tiene una forma de carrera sorteada y un modificador de forma oculto
que genera rachas y slumps sin explicación. Nada de esto se le anuncia al
jugador: lo siente en los resultados.

**Distribuciones en vez de resultados.** Cada opción de cada evento tiene
varios desenlaces posibles con pesos. La opción "obviamente correcta" sale
mal a veces. Tus stats corren esos pesos, no los eliminan.

**Mundo generado.** El meta, la fuerza de cada org, quién gana Worlds, qué
región domina, quiénes son tus rivales, la exigencia de tu colegio, la
tolerancia de tus viejos: todo sorteado al inicio y evolucionando solo.

**Baraja filtrada.** Una partida ve unos 25 eventos de más de 200, filtrados
por edad, rol, región, liga, stats y lo que ya pasó antes.

El resultado buscado: podés jugar dos partidas con exactamente la misma
estrategia y terminar en Challenger en una y con la PC adentro del placard en
la otra. La consecuencia técnica es que **todo el azar pasa por un RNG
seedeado**, sin excepción, para que una seed compartida reproduzca el mundo
entero.

---

## 9. Cómo termina

> **Corregido en la fase 13** (2026-09-19): esta línea listaba "por edad" primero, como si
> compitiera en pie de igualdad con las demás causas — pero §12.4 documenta que **"el declive casi
> no es biológico"** y que la causa modal real es que no te renuevan (10a: "te retirás cuando el
> mercado deja de llamarte"). Esta sección nunca lo decía. La edad sigue existiendo como un límite
> duro (la "línea Faker", antiloop), pero es el último recurso, no el motivo típico.

El retiro llega, sobre todo, porque el mercado deja de llamarte: te quedás sin equipo y sin
ofertas, o te avisan que no te renuevan. Se suma que lo elijas vos, el burnout o una lesión. Hay
una edad límite dura como red de seguridad —nadie juega para siempre— pero rara vez es la que
dispara la salida de una carrera real.

La tarjeta final no elige un veredicto de una lista: lo **compone**. Arquetipo
base, más un modificador, más un detalle único de esa partida. "El eterno
cuarto puesto", "Leyenda regional", "El que se fue a Corea y volvió peor",
"El streamer millonario", "El prodigio que no fue", "El que no llegó".

Muestra tu KDA histórico, splits jugados, títulos, apariciones a Worlds, MVPs,
sueldo pico, orgs, campeón signature, jerarquía máxima, si terminaste el
secundario, y tu puesto dentro de tu generación.

El puntaje se pondera **por rol**. Si fuera solo KDA nadie jugaría support ni
jungla: un support que ganó tres títulos y capitaneó cinco años tiene que
puntuar como lo que es.

Y como el mundo entero sale de la seed, dos personas con la misma seed juegan
la misma historia y pueden comparar quién la jugó mejor. Eso, más la tarjeta,
es todo el motor de difusión del juego.

---

## 10. Una carrera de ejemplo

Para que se vea cómo encaja todo.

*Mid, Brasil, 15 años. Colegio exigente, viejos estrictos: mal sorteo.*

Roba dos bloques al sueño tres periodos seguidos para llegar a Máster.
Funciona: sube el elo, pero entra en deuda de sueño y los estudios caen a 34.
Cae un aviso de boletín. Está a un periodo de que le confisquen la PC.

A los 16 y medio lo contacta un scout. Como la confianza familiar todavía está
en 44, se dispara la negociación: el coach habla con la madre. Sale bien.
La barra de estudios queda congelada en 34 — flag "lo dejó" — y firma con un
equipo de tier 3: chico, inventado, de paso.

Dura tres splits ahí. Al cuarto, el equipo se disuelve — es lo normal a este
nivel — pero antes de que termine el periodo otro armado chico lo levanta.
Rinde mejor esta vez: a los seis splits de fichado, asciende al Circuito
Desafiante. Debuta a los 18 con jerarquía 22: es el rookie, le dan los picks
que sobran. Rinde tibio dos splits.

Tercer split en el Circuito: el meta rota hacia magos de control y su pool de
asesinos queda muerto. Ajuste al meta 31. Rinde mal, la jerarquía cae a 15.
Gasta todos los puntos de preparación en aprender dos magos, que entran con
maestría 38.

Cuarto split: los magos siguen fuertes y la maestría sube a 61. Rinde bien.
Asciende a CBLOL. Firma con un equipo mediano. Jerarquía se resetea
parcialmente: entra de nuevo como uno más, pero con algo de crédito.

Un año después gana CBLOL. Va al internacional y queda 1-5. Hype 68.
Ofertas: la LEC lo quiere como import, pero tendría que ser claramente mejor
que un europeo. Un equipo top de CBLOL le ofrece ser la franquicia.
Elige quedarse. Jerarquía 71.

Tres años como el mejor mid de su región. Dos títulos más. Nunca pasa de
octavos en Worlds. A los 24 la mecánica empieza a caer y el macro lo compensa.
A los 25 le ofrecen ser suplente en Europa. Dice que no.

Se retira a los 26 en el mismo equipo.

**Veredicto: LEYENDA REGIONAL.** *"Nunca cruzó el charco. No le hizo falta
para que lo quisieran."* Tercero de su generación. Signature: Orianna.
Flag: lo dejó el secundario — a los 27 vuelve a estudiar, y aparece en el
epílogo.

---

## 11. Lo que el juego NO es

Es tan importante como lo que sí es. Si alguna vez el proyecto se desvía
hacia acá, hay que frenar.

**No es un manager.** No dirigís un equipo, no armás rosters, no fichás
jugadores. Sos UN jugador y solo controlás tus decisiones.

**No simula partidas jugada por jugada.** El motor resuelve splits con
fórmulas y ruido. Los eventos in-game son momentos narrativos puntuales, no
una simulación táctica.

**No es un juego de habilidad mecánica.** Los minijuegos son condimento, no
el juego: mueven el rendimiento de un mapa un puñado de puntos, nunca ganan
ni pierden una serie solos y nunca terminan una carrera. La cuota es
explícita — como máximo uno por serie, y solo cuando el mapa está cerrado en
semis, la final o el internacional (más "la prueba", el tryout único de la
etapa amateur). Si aparecieran siempre, se volverían tarea.

**No es un juego largo para lo que cuenta.** Si una carrera completa (inicio → tarjeta final) se
pasa de 40 minutos, algo se infló — pero la vara ya no son doce minutos: el Bo5 con Fearless y
draft, la temporada regular jugable y el mercado de pases son sistema central, no relleno. Lo que
sigue vigente es el espíritu de la regla: nada se agranda porque sí, y rejugar con otra seed —no
alargar la misma partida— es donde está el juego de verdad.

**No tiene una estrategia ganadora.** Si el simulador de 5000 carreras muestra
que más del 25% termina en el mismo arquetipo, el balance está roto aunque
cada partida individual se sienta variada.

---

## 12. Datos de la investigación (2026)

> **Archivo de investigación. Estos datos no hay que volver a investigarlos.** Se relevaron con
> búsqueda web en agosto 2026 y son la base de todo el realismo del juego: la escalera de ranked,
> las ligas 2026, la duración real de una carrera, el Fearless Draft y los salarios. Vivían en
> `TRASPASO.md`, borrado el 2026-09-02 cuando el resto de ese documento quedó superado por
> `PLAN.md`; la numeración se conservó (`TRASPASO §4.N` → `§12.N`) para que las citas del código
> sigan resolviendo.
>
> A diferencia del resto de `CONCEPTO.md`, esta sección describe **el mundo real**, no el juego.
> Donde el código se aparta de acá es una simplificación deliberada, y como tal está anotada en la
> tabla de deuda técnica de `PLAN.md`.

### 12.1 Sistema de ranked

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

### 12.2 A qué rango juegan los pros y cómo se los descubre

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

### 12.3 Estructura competitiva 2026

> Cuando se relevó esto, `leagues.json` estaba mal. La fase 3 lo reescribió contra esta tabla.

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

### 12.4 Carreras: duración, pico y declive

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

### 12.5 Champion pool y Fearless Draft

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

### 12.6 Salarios — distribución lognormal, mediana muy por debajo de la media

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
