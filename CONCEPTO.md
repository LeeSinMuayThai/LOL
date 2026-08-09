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

Dura entre 4 y 10 minutos. Se juega de una sentada, en el navegador, sin
cuenta ni instalación. Al final te da una tarjeta con tu legado.

**La referencia directa son El Ídolo (Potrero Fútbol) y Copero**: historias
interactivas cortas donde un motor simula la carrera y vos solo decidís en los
momentos que importan. El esqueleto es el mismo — motor de simulación, baraja
de eventos, decisiones en momentos bisagra, tarjeta final compartible. Lo que
cambia es que el ecosistema de LoL da sistemas que el fútbol no tiene: el meta
que rota y te deja obsoleto, el champion pool como identidad, los cupos de
import, y carreras que se terminan a los 25.

**El objetivo del jugador no es ganar Worlds.** Es descubrir qué carrera le
tocó y qué hizo con ella. Un jugador que nunca salió de su región y se volvió
un ídolo local es un final tan bueno como un campeón mundial. Un pibe al que
la madre le prohibió jugar a los 16 también es un final, y de los que más se
comparten.

---

## 2. La forma de una partida

    15-17 años    ETAPA AMATEUR
                  SoloQ, colegio, familia. Podés perder acá.
                  6 periodos. Duración: ~90 segundos.

    17-19 años    DEBUT — TIER 3 → TIER 2 → TIER 1
                  Nadie pisa una liga real de entrada. Fichás con un equipo
                  chico e inventado (tier 3) donde no dura casi nadie —
                  sube a una liga de desarrollo real (NACL, LDL, LCK CL...)
                  o el equipo se disuelve y aparece otro. Desde ahí, si
                  rendís, asciende a una de las seis ligas tier 1 de 2026.
                  La única salida directa es el caso Calix: estar en el
                  top absoluto de Challenger y todavía joven te salta el
                  tramo de tier 3. Sos el rookie, no decidís casi nada.
                  Duración: ~60 segundos.

    19-25 años    CARRERA PROFESIONAL
                  El grueso del juego. Splits, metas, fichajes, torneos.
                  Duración: ~4 minutos.

    23-30 años    DECLIVE Y RETIRO
                  La mecánica baja, el macro no. Última decisión: cómo salís.
                  Duración: ~40 segundos.

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

**1. Llega el parche.** El vector del meta se mueve. Ciertos arquetipos de
campeón suben y otros bajan.

**2. Se recalcula tu Ajuste al Meta.** Un número de 0 a 100 con desglose por
campeón. Te dice, antes de jugar, si este split te toca a favor o en contra.

**3. Draft.** Acá se cruza todo: la probabilidad de que te den el campeón que
querés depende de tu jerarquía en el equipo. Si te dan otro, jugás con menos
maestría.

**4. Temporada regular.** El motor calcula tu rendimiento combinando
atributos, ajuste al meta, maestría del campeón que terminaste jugando,
sinergia del roster, jerarquía y ruido gaussiano.

**5. Playoffs.** Si clasificaste, tu equipo entra a un bracket de 6 (los dos
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

**6. Eventos.** Drama, salud, guita, vida personal. Lo que le pasa a un pibe
de 21 años que de golpe cobra en dólares.

**7. Offseason.** Repartís puntos de preparación. Llegan ofertas. Decidís si
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

**META.** No está escrito, se genera. Es un vector de pesos sobre esos mismos
tags, sorteado al inicio de la temporada, que deriva suave cada parche y a
veces se sacude entero. Tu Ajuste al Meta sale de cruzar tu pool contra ese
vector, ponderando por maestría. Multiplica tu rendimiento entre 0.75x y 1.25x.

**JERARQUÍA.** Tu lugar dentro del equipo, de "el rookie" a "la franquicia".
No es cosmética: define si te dan el pick que querés, si el jungla camina para
vos, si tus llamadas se ejecutan, quién se come la culpa cuando pierden, y
cuánto poder tenés para negociar. Al cambiar de equipo se resetea parcialmente.

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

El retiro llega por edad, por burnout, por lesión, o porque lo elegís vos.

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

**No es largo.** Si una partida se pasa de doce minutos, algo se infló. El
formato corto es lo que hace que la rejugués, y rejugarla es donde está el
juego de verdad.

**No tiene una estrategia ganadora.** Si el simulador de 5000 carreras muestra
que más del 25% termina en el mismo arquetipo, el balance está roto aunque
cada partida individual se sienta variada.
