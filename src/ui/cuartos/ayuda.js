// La ayuda de teclas (FASE V, V2-C; `?`): lo que hace `src/ui/teclado.js`, dicho para el jugador.
const TECLAS = [
  ['Enter · Espacio', 'Activan lo que tiene el foco. En el relato, Espacio pasa a la línea siguiente.'],
  ['1 · 2 · 3 · 4', 'Eligen la opción con ese número. En el mercado llevan al "Firmar" de esa oferta: Enter firma.'],
  ['V · T · E · M · C · R', 'Abren Vos, Temporada, Equipo, Mundo, Carrera y Crónica (con uno abierto, cambian de pestaña). No andan en el inicio ni en los minijuegos, que usan sus propias teclas.'],
  ['?', 'Esta ayuda.'],
  ['Esc', 'Cierra el cuarto y te deja en la misma parada. Nunca te saca de una pantalla.']
];

export function pintar(cuerpo) {
  const lista = document.createElement('dl');
  lista.className = 'panel-contexto cuarto-ayuda';
  for (const [tecla, texto] of TECLAS) {
    const dt = document.createElement('dt');
    dt.textContent = tecla;
    const dd = document.createElement('dd');
    dd.textContent = texto;
    lista.append(dt, dd);
  }
  cuerpo.appendChild(lista);
}
