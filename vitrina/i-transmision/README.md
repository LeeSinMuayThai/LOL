# B · Transmisión (vitrina de la ola I)

**La idea:** la carrera se ve como si la estuviera pasando la transmisión de LCK, LEC o Worlds. Son placas planas y opacas, sin un solo borde de 1 px, con cortes en diagonal, Archivo condensada en mayúsculas y barras de color de equipo. Vos sos el azul.
El contrato está en `../ola-i/CONTRATO.md`. El fondo y el arte son los de la fusión, reutilizados tal cual: `../fusion/js/ambiente.js` y `../fusion/estilos/ambiente.css`.

Servir: `node vitrina/servir.mjs --puerto 8142` y abrir `http://127.0.0.1:8142/i-transmision/index.html`.
`?pantalla=decision|consecuencia|minijuego|mano`, `&paso=previa|hud|resultado` (minijuego), `&t=<ms>` congela la línea de tiempo.
Teclas: 1-4 cambian de pantalla. Si la pantalla espera una elección, los números eligen (1-2 en la decisión, 1-3 en la mano). Shift+1-4 cambia de pantalla siempre. Enter sigue (en el minijuego: previa → HUD → resultado).

## De qué parte de la transmisión sale cada pieza

| Pieza | De dónde sale |
|---|---|
| La ficha | El marcador de arriba del espectador. El rango va en el centro alto; los stats, en las alas; la temporada, en la pestaña del reloj. La consecuencia rueda ahí: el número cambia como un odómetro y le cuelga una bandera verde con ▲N. |
| La opción | Un zócalo (lower third): la tecla, la placa del titular con sus efectos y la tira de la línea. Al elegir, la tira se vuelve la del resultado, en el azul del equipo. |
| El evento | La placa del segmento, con la pestaña `UN DM RARO` como "breaking". |
| La previa | El gráfico de cruce, SEN vs CK, con los dos lados en diagonal; los casilleros del Bo5; la vara como zócalo, con su tecla en ámbar. |
| El HUD | El overlay del espectador: el marcador arriba con `5 / 8` como reloj y el frame del jugador abajo (retrato, vida con una marca cada 100, Flash con su barrido, la charla y el poder). |
| El resultado | El sello cae al centro y sube; después, la serie con una fila por mapa: gana el lado que se pinta. |
| Las cartas | Las placas de pick del draft, con el número enorme. La rareza está en el material del marco: acero, azul metálico con brillo, violeta y oro con un brillo más rápido. |

Una familia: los mismos cortes (`--corte`), la misma tecla, la misma escala (≤ 3 tamaños por componente) y los mismos cuatro estados: reposo; apuntado (se corre y se prende el azul); elegido (la tecla en azul y la barra abajo); apagado (al 35 %, sin color).
Los colores están solo en `estilos/tokens.css`. La fuente es Archivo, de `../comun/fuentes`; no se sumó ninguna. Los íconos son SVG inline. No se usa `Math.random`: las piedras del campo salen de `comun/azar.js`.

## Qué falta

- El HUD es una captura quieta: no se juega.
- CK no tiene logo real, así que lleva un escudo plano.
- A 390 px, la bandera de Cabeza tapa en parte la pestaña "Temporada 2026".
- La carta elegida vuela a la ficha y deja su hueco: no hay un "siguiente".
- Elegir "Denunciarlo" rueda la ficha, pero no tiene línea de resultado, porque el contrato no la escribe.
