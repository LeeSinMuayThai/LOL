// Las perillas de la previa (PLANUI §0.4): `?dc=cartas|draft|hextech` (la decisión) y `?sw=prediccion|pausa` (el
// stream del Swiss). Una pantalla pregunta por la suya; sin perilla (o con un valor que no conoce), el juego de siempre.
// Se leen de la URL en cada llamada: el juego no cambia la URL al navegar, así que la perilla dura toda la visita. En Node
// (los checks) no hay `location`: devuelve null.
export function perilla(nombre, validas) {
  try {
    const valor = new URLSearchParams(globalThis.location?.search ?? '').get(nombre);
    return validas.includes(valor) ? valor : null;
  } catch {
    return null;
  }
}
