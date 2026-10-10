// La raiz de los efectos (PLANUI §9.2, LINEA.md §4). INTERFAZ FIJADA por el supervisor para la ola 1:
//   - U1 (cimientos) la monta y la alimenta; U1k (el kit) reemplaza este stub por la implementacion real.
//   - Importar este modulo no toca el DOM (corre en Node). Todo fallo adentro degrada a "sin efectos", nunca frena el juego.
//
// montarFx(contenedor) -> api | null
//   `contenedor`: el nodo donde vive el canvas del ambiente (`#fx-ambiente`, detras del contenido, lo pone U1 en index.html).
//   Devuelve null si no hay DOM. U1 lo llama una vez, despues de idle, dentro de un try/catch.
//
// api.ambiente(opciones)   parcial: { era, animo, arte, paleta, cruce, costura, suspenso } (LINEA.md §4.2); lo que no viene se mantiene
// api.pulso(tipo)          un golpe de luz corto ('gloria' | 'peligro' | 'golpe')
// api.congelar(ms)         fija el reloj del ambiente (capturas del recorrido)
// api.pausar() / api.reanudar()   minijuego, cuarto abierto o pestana oculta
// api.aquietar()           la enmienda de la regla 1 (§2): una parada aparecio; el ambiente se aquieta en <= 1 s
// api.destruir()
export function montarFx(contenedor) {
  if (!contenedor) return null;
  const nada = () => {};
  return { ambiente: nada, pulso: nada, congelar: nada, pausar: nada, reanudar: nada, aquietar: nada, destruir: nada };
}
