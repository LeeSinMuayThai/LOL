# Un Split Más

Un simulador narrativo de la carrera de un jugador profesional de League of
Legends. Arrancás a los 15 años grindeando soloQ en tu pieza. Terminás
retirándote — o no llegando nunca. En el medio, una carrera entera construida
a partir de decisiones: qué campeones aprendés, cuánto sacrificás, a qué
equipo firmás, cuándo decís que no.

Ninguna carrera se ve igual. Con la misma seed, sí — cada carrera es
determinista y reproducible, y se puede compartir con un link (`?seed=N`).

## Correrlo local

Node 18+, sin instalar nada más — el proyecto no tiene una sola dependencia.

```bash
npm start
```

Y abrir `http://localhost:8000`. Abrir `index.html` con doble clic no
funciona: el juego usa módulos ES, que los navegadores no cargan desde
`file://`.

## Cómo está armado

- **`src/core/`** — las reglas del juego: stats, ranked, mercado, temporada,
  series de playoffs. Puro, determinista, corre en Node sin tocar el DOM.
- **`src/systems/`** — lo que avanza el estado split a split. Cada uno
  exporta `aplicar(state, rng) -> { state, logs }`.
- **`src/data/`** — las constantes de balance y el catálogo de eventos, como
  datos declarativos (JSON), no como lógica.
- **`src/ui/`** — todo lo que toca `document`. El motor nunca lo hace.
- **`src/dev/`** — las herramientas que mantienen todo lo anterior honesto:
  `validate.js` (contratos y propiedades del motor), `simulate.js` (miles de
  carreras de una, para medir en agregado), `build.js` (el build estático).

Todo el azar sale de un RNG inyectado (`mulberry32`, sembrado desde una
seed) — nunca de `Math.random()`. Es lo que hace posible que una carrera sea
reproducible: la misma seed, restaurada en cualquier punto, sigue produciendo
exactamente la misma historia.

## El resto de la documentación

| Documento | Qué es |
|---|---|
| `CLAUDE.md` | Las reglas duras del proyecto |
| `CONCEPTO.md` | Qué es el juego y por qué los sistemas están conectados así |
| `PLAN.md` | El plan de desarrollo, fase por fase |
| `PROGRESO.md` | El changelog: qué se hizo, por qué, y con qué números medidos |
| `DISENO.md` | La arquitectura de archivos |

## Sobre las ligas y organizaciones

Este es un proyecto de fan, sin ningún vínculo con Riot Games. Las ligas y
algunas organizaciones que aparecen en el juego son reales (LCK, LEC, LCS,
LPL, CBLOL, y otras) porque forman parte del contexto competitivo real de
League of Legends — pero los compañeros de equipo, los rivales, y el
jugador que manejás son inventados, y ningún resultado, decisión o hecho
narrado acá representa a una persona real ni a un evento que haya ocurrido.
League of Legends es una marca registrada de Riot Games, Inc.

## Licencia

MIT — ver `LICENSE`.
