# La voz corta: guía para escribir eventos y cartas

PLANUI §0.10, H4. El jugador dijo: *"el juego te dice todo, las cartas tienen descripciones muy largas"*.
Hoy una pantalla de cartas muestra ~100 palabras (mediana; hasta 185) y una parada de evento ~77. La meta es
**<= 70 la pantalla de cartas y <= 60 la de evento**. El juego insinúa; el jugador completa.

Se mide con `node src/dev/voz.js`. Se controla con `node src/dev/validate.js --solo=voz-corta`.

## Los límites

Se cuentan palabras sueltas (`{org}` cuenta una; un guion largo solo, ninguna).

| Texto | Campo en el JSON | Límite |
|---|---|---|
| Descripción | `description` | 30 palabras y 2 oraciones |
| Opción | `options[].label` | 6 palabras |
| Pista | primera oración de `options[].descripcion` | 10 palabras |
| Aviso ⚠ | `options[].aviso` | 10 palabras, solo con riesgo, nunca con % |
| Título de carta | `titulo` | 4 palabras |
| Línea de carta | `linea` | 10 palabras |
| Resultado | `options[].outcomes[].texto` | 25 palabras, gracioso si sale mal |

- La pista es la primera oración de `descripcion`. Lo que siga en esa misma cadena no se muestra como pista.
- El `aviso` va solo en opciones con riesgo (dos o más resultados). El % lo calcula el juego, no se escribe.
- Sin `aviso`, el juego saca el aviso del peor resultado (`avisoDeOpcion`, `events.js`): que el peor
  `texto` sea corto y se lea solo.
- Sacá el "más": "más rápido", "más fuerte". Decí qué pasa, no cuánto.

## El tono

- Rioplatense, voseo, alguien que juega: soloQ, draft, Fearless, scrims, ladder, VOD, bootcamp, LCK, LPL, LEC, CBLOL, LLA.
  Nunca una traducción literal ("hacer una decisión", "tomar una charla").
- Las ligas y las orgs pueden ser reales. Los compañeros, rivales y periodistas son inventados.
- Segunda persona, presente. Frases cortas, un dato concreto por frase (el consulado, el mostrador, el CS).
- Cuando sale mal, que haga reír antes de doler.

## Lo que no va

- Explicar mecánicas ("esto mueve tu consistencia porque..."): los números ya los muestra la pantalla.
- El porcentaje, en cualquier texto.
- Repetir en la pista lo que ya dice la opción ("Responder en una entrevista" / "Respondés en una entrevista...").
- Contar el desenlace en la descripción o en la pista: eso es del resultado.
- Una segunda oración que solo repite la primera.

## Seis ejemplos reales: antes / después

**1. `la_oferta_del_staff`** (caminos.json), descripción de 82 palabras.
- Antes: *Ya sos de los veteranos del vestuario y el manager te pide una charla: el contrato se acerca al final y {org} te ofrece un lugar en el staff para cuando cuelgues el mouse, o antes, de a poco. Puede ser de coach asistente [...] Los dos te mantienen cerca del juego y los dos te sacan de la ladder.*
- Después (25): *Ya sos de los veteranos y {org} te ofrece un lugar en el staff: coach asistente o analista. Los dos te sacan de la ladder.*
- Pista de "Anotarte de coach asistente": *Horas en la silla del scrim, armando el draft.* (9)

**2. `visa_delay`** (salud_vida.json).
- Antes: *El trámite para viajar con {org} se trabó en el consulado. El calendario no espera y hay una fecha en la que tenés que estar del otro lado.*
- Después (15): *El trámite de la visa se trabó en el consulado y la fecha no espera.*
- Pista de "Apretar a la organización": antes *Les caés al manager todos los días. Puede destrabarse, o podés quedar como el jugador problemático por algo que no depende de nadie.* Después (7): *Le caés al manager todos los días.*
- Aviso: antes *Si el trámite no se mueve, perdés semanas y cabeza*. Después (6): *Perdés semanas peleando con un mostrador*.
- Resultado: antes *El trámite no se mueve un centímetro y vos gastaste tres semanas de energía peleando con un mostrador. Viajás igual, tarde y fundido.* Después (17): *El trámite no se mueve y gastaste tres semanas peleando con un mostrador. Viajás tarde y fundido.*

**3. `balance_de_temporada`** (cierre_edad.json).
- Antes: *Última reunión del año en {org}. Sale el VOD de las jornadas malas, se habla de lo que no funcionó, y en algún momento la mesa se queda callada esperando que hables vos.*
- Después (19): *Última reunión del año en {org}: sale el VOD de las jornadas malas y todos esperan que hables vos.*
- Opción: antes *Pedir que el equipo juegue más para vos*, después *Pedir más protagonismo* (3), con pista *Cargás con más: referente o el que se creyó algo.* (10)
- Resultado malo: *Lo planteás y el silencio dura un segundo de más. Nadie te contradice, pero el scrim se pone tenso.* (19)

**4. `el_sesgo_por_la_edad`** (declive.json), descripción de 51 palabras.
- Después (17): *Tus números no bajaron, pero la prensa ya no habla de tu nivel: habla de tu edad.*
- Opción *Responder con estadísticas* (3), pista *Mostrás el CS y la participación.* (6)
- Resultado: *Sonás a la defensiva. Nadie que ya decidió que estás de salida se convence con planillas.* (16)

**5. `la_prensa_te_destrona`** (top_mundial.json).
- Antes: *Hace un mes eras la portada de la lista de los mejores del mundo. Dos semanas de resultados flojos después, el mismo medio publica una nota preguntándose si "ya se te acabó el momento". El ciclo de la fama es así de corto cuando el rendimiento afloja.*
- Después (19): *Hace un mes eras portada. Dos semanas flojas después, una nota pregunta si "ya se te acabó el momento".*
- Opción *Responder en una entrevista* (4), pista *Que dos semanas flojas no borran un año.* (8)
- Resultado: *Responder le da más vida a la nota: mañana el titular es tu respuesta, no la racha.* (17)

**6. `el_rookie_que_te_ocupo_el_asiento`** (salud_vida.json).
- Después (20): *Volviste y el titular ahora es el pibe de dieciocho que te cubrió. La scrim de hoy es una audición.*
- Opción *Retarlo a soloQ* (3), pista *Lo buscás en el cliente hasta que quede claro.* (9)
- Resultado: *Parejo. Dieciocho meses afuera te dejaron más cerca de un rookie de lo que querés admitir.* (16)

## El schema

Un evento (`src/data/events/**/*.json`, una lista por archivo). Solo se reescribe **texto**: ids, pesos, condiciones y
efectos quedan intactos.

```json
{
  "id": "visa_delay",
  "voz": "corta",
  "title": "La visa no sale",
  "description": "Hasta 30 palabras y 2 oraciones. Admite {org} y otras variables.",
  "options": [{
    "id": "apretar_a_la_organizacion",
    "label": "Hasta 6 palabras",
    "descripcion": "La pista va primero (<= 10 palabras). Lo demás no se muestra.",
    "aviso": "Opcional, <= 10 palabras, sin %",
    "outcomes": [{ "weight": 7, "texto": "Hasta 25 palabras.", "effects": [] }]
  }]
}
```

- `"voz": "corta"` marca un evento ya reescrito. Solo existe ese valor. Con la marca, `voz-corta` exige todos los límites
  de la tabla; sin ella, no mira el evento. Quien reescribe pone la marca en el mismo commit.
- Un evento con la marca que se pasa de un límite rompe el validate: acortá el texto, no saques la marca.

Una carta (`src/data/events/cartas/*.json`, la define H2a): `titulo` <= 4 palabras y `linea` <= 10. La carta no explica:
el título nombra y la línea insinúa.

## Antes de commitear

1. `node src/dev/validate.js --solo=voz-corta` en verde.
2. `node src/dev/voz.js`: tu archivo debe mostrar 100% dentro de los límites.
3. Releé en voz alta: si suena a traducción o a cartel de ayuda, está mal.
