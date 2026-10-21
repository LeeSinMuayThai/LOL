# Vitrina I · A · Cliente

**La idea:** los componentes hablan como el cliente de LoL, con un solo marco para todos: biselado, con filete y dos
esquinas cortadas. Lo que cambia es el material del filete (oro, hextech, acero, azul, violeta) y el estado: reposo,
apuntado (brillo hextech), elegido (trabado en oro, con candado) y apagado (35 %, sin color).

Servir: `node vitrina/servir.mjs --puerto 8141` y abrir `http://127.0.0.1:8141/i-cliente/index.html`.
Pantallas: teclas 1-4 o `?pantalla=decision|consecuencia|minijuego|mano`. Donde la pantalla elige con 1-3, `Alt+1-4`
cambia igual. Instantes: `&t=<ms>` (consecuencia, `&paso=hud|resultado`, `&carta=1-3` en la mano). Los rombos de abajo
a la derecha son la navegación de la vitrina y no tienen texto.

| Pieza | De dónde sale |
|---|---|
| Ficha | El perfil del cliente: el emblema de Diamante con alas, el nombre del rango en mayúsculas y la barra de LP |
| Opción | La ficha de la selección de campeones: retrato cuadrado, se ilumina en hextech al apuntarla y queda trabada en oro |
| Previa | El lobby: escudos de los equipos, los cinco casilleros del Bo5 y el botón grande, como JUGAR |
| HUD | El del juego: retrato con nivel, la vida con una marca cada 100 (la de 1000 entera) y el rastro claro del golpe, el Flash en su casilla con el barrido y la tecla, las oleadas arriba como el marcador |
| Resultado | El cartel de VICTORIA del post-game (alas y rombo de oro) y el historial de partidas, una fila por mapa |
| Cartas | El loot hextech: el material del marco y la gema (más grande y con más halo) dicen la rareza; la épica tiene el brillo que la cruza |

Fondo y ambiente: `../fusion/js/ambiente.js` con sus tokens y su respaldo CSS, sin cambios (Ahri en la pieza y en
la academia, Orianna en el escenario). Fuentes: Fraunces en mayúsculas en lugar de Beaufort y Geist en lugar de Spiegel,
las dos de `comun/fuentes/`. Colores: solo `estilos/tokens.css`. Íconos: SVG inline.

**Qué falta.** No hay Beaufort (Fraunces se acerca, pero es más blanda). El HUD es una imagen quieta: no se juega. El
escudo de CK es un blasón genérico, porque la vitrina no tiene su logo. El sello no tiene sonido.
