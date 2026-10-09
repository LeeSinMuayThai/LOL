# Inventario "leer menos" (generado por vitrina/datos/generar.mjs; seeds 1-40, bot `criterio`)

Paradas: 1878 · opciones: 5122 · con datos estructurados (previa, riesgo, rareza, plan o p): 76% de las opciones · con un "%" SOLO en prosa (sin campo numérico): 143 opciones (3%) en 135 paradas; 50 paradas con "%" en el título/descripción de la decisión sin campo p en `datos`.

| tipo de parada | veces | opc. | previa | riesgo | rareza | plan | p num. | % solo prosa | motor |
|---|--:|--:|--:|--:|--:|--:|--:|--:|---|
| edadCierre:x | 394 | 3 | 100% | 100% | 0% | 63% | 0% | 0% | src/systems/events.js:448 |
| temporada:momento | 279 | 2 | 0% | 0% | 0% | 0% | 0% | 2% | src/systems/temporada.js:249 |
| eventos:x | 218 | 2/3/4 | 100% | 100% | 0% | 0% | 0% | 0% | src/systems/events.js:448 |
| amateur:plan_amateur | 175 | 4 | 100% | 100% | 100% | 0% | 100% | 0% | src/systems/amateur.js:602 |
| serie:plan | 169 | 2/3/4 | 0% | 0% | 0% | 0% | 100% | 0% | src/systems/serie.js:108 |
| mercado:oferta | 142 | 1/2/3/4/5/6 | 0% | 93% | 0% | 0% | 0% | 0% | src/systems/mercado.js:515 |
| amateur:salida_amateur | 52 | 2 | 0% | 0% | 0% | 0% | 0% | 0% | src/systems/amateur.js:1532 |
| serie:minijuego | 50 | 0 | 0% | 0% | 0% | 0% | 0% | 0% | src/systems/serie.js:171 |
| retiro:retiro_vuelta | 47 | 2 | 0% | 0% | 0% | 0% | 0% | 35% | src/systems/retiro.js:276 |
| amateur:negociacion | 45 | 2 | 0% | 0% | 0% | 0% | 0% | 50% | src/systems/amateur.js:1071 |
| amateur:oferta | 44 | 2 | 0% | 0% | 0% | 0% | 0% | 48% | src/systems/mercado.js:515 |
| mercado:minijuego | 44 | 0 | 0% | 0% | 0% | 0% | 0% | 0% | src/systems/mercado.js:1557 |
| amateur:minijuego | 29 | 0 | 0% | 0% | 0% | 0% | 0% | 0% | src/systems/amateur.js:1367 |
| amateur:nocturno | 29 | 2 | 0% | 0% | 0% | 0% | 0% | 0% | src/systems/amateur.js:1093 |
| serie:decisivo | 28 | 2 | 0% | 0% | 0% | 0% | 0% | 0% | src/systems/serie.js:129 |
| mercado:fin_mercado | 27 | 2 | 0% | 0% | 0% | 0% | 0% | 0% | src/systems/mercado.js:959 |
| internacional:plan | 21 | 2/3/4 | 0% | 0% | 0% | 0% | 100% | 0% | src/systems/serie.js:108 |
| internacional:swiss | 19 | 1/2 | 0% | 0% | 0% | 0% | 0% | 0% | src/systems/internacional.js:78 |
| retiro:evento_ventana | 18 | 3 | 100% | 100% | 0% | 0% | 0% | 0% | src/systems/events.js:448 |
| eventos:minijuego | 16 | 0 | 0% | 0% | 0% | 0% | 0% | 0% | src/systems/events.js:560 |
| retiro:retiro_declive | 14 | 2 | 0% | 0% | 0% | 0% | 0% | 0% | src/systems/retiro.js:171 |
| internacional:minijuego | 7 | 0 | 0% | 0% | 0% | 0% | 0% | 0% | src/systems/amateur.js:1367 |
| (6 tipos más en el JSON) | | | | | | | | | |

Ejemplos de "%" solo en prosa (texto tal cual sale al jugador):
- amateur:negociacion (opcion, seed 1): "76% de que salga bien: te bancan el intento y el colegio deja de ser motivo para sacarte la PC (confianza +6 a"
- amateur:oferta (opcion, seed 1): "Antes de firmar hay una prueba, pero con tu nivel te firman aunque la prueba salga mal: la vara es 0% (tu nive"
- retiro:retiro_vuelta (opcion, seed 1): "De free agent, al mercado de esta pretemporada: hoy no te ficharía ningún club, ~9% de que te llame alguien."
- temporada:momento (opcion, seed 9): "La jugada de highlight tiene 30% de salir. La jugada aburrida tiene 70%. Elegís la aburrida."
Líneas del motor que escriben un "%" en un texto de parada:
- src/systems/amateur.js:526  return `${oferta.org} (no llegaste a la vara de la prueba: te faltó ${oferta.falta}%)`;
- src/systems/amateur.js:1029  return `${Math.round(p * BALANCE.stats.max)}%`;
- src/systems/amateur.js:1335  ? `Antes de firmar hay una prueba, pero ${TEXTO_VARA_CERO}: la vara es 0% (${textoDeLaVara
- src/systems/amateur.js:1336  : `Antes de firmar hay una prueba: necesitás ${vara}% para que te firmen (${textoDeLaVara(
