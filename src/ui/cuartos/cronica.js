// El cuarto Crónica (FASE V, V2-C; stub, lo rediseña V3e): la crónica entera de hoy (`renderFeed`), lo más nuevo arriba.
// Lee la `vista` (lo que la pantalla ya contó). A mitad de un relato la `vista` sigue en la parada anterior: por eso suma
// los beats que la página en curso YA mostró (`contadoDelRelato`, de `app.js`), cortando el feed donde el reproductor se
// quedó. Nunca uno por contar (regla 4 de §V.3).
export function pintar(cuerpo, estado, { ui, contadoDelRelato }) {
  const lista = document.createElement('div');
  lista.className = 'log-list cuarto-cronica';
  cuerpo.appendChild(lista);
  const enCurso = contadoDelRelato?.() ?? null;
  if (enCurso) {
    ui.renderFeed(lista, enCurso.estado, { hasta: enCurso.hasta });
  } else {
    ui.renderFeed(lista, estado);
  }
}
