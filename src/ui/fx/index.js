// La raiz de los efectos (PLANUI §9.2, LINEA.md §4). INTERFAZ FIJADA por el supervisor para la ola 1 (4e3ff8a):
//   - U1 (cimientos) la monta y la alimenta; U1k (el kit) la implementa (este archivo).
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
//
// Lo que suma U1k (aditivo; el detalle de cada campo esta en src/ui/fx/README.md):
//   api.ambiente(o) tambien acepta { encuadre, velo, lightsticks, apuntado, retardo, instantaneo } (los de la vitrina).
//   api.pulso(tipo, retardo) vale para todos los PULSOS de ambiente.js (elegir, logro, golpe, peligro, gloria, cambio,
//     apuntar), con <= 3 destellos por segundo (se superponen, separados >= 335 ms).
//   api.aquietar(si = true)  aquietar(false): vuelve a moverse (el relato)
//   api.fondo({ contexto, escena, instantaneo, dur })  la politica del mundo de la pantalla (fondo.js + color.js):
//     contexto 'inicio' | 'juego' | 'momento' (la curva del bitono) y escena 'costura' (dos mundos enfrentados)
//   api.momento({ retardo, dura })  un momento: el mundo sube al estado `momento` y vuelve a la base en ~2 s
//   api.takeover(retardo)    AFUERA, la firma, el titulo: el mundo va al 100 % y se queda
//   api.costura()            la geometria de la costura ahora ({ k, posicion, angulo, vertical, a: {x,y}, b: {x,y} }),
//                            para ubicar el DOM encima (el logo del lado solo tono)
//   api.quiebre(retardo)     la luz que se quiebra un instante ("te leyeron")
//   api.tono(tono, { paleta = true, k = 1 })  el segundo tono (tono.js) en <html> (--tono-*) y, si `paleta`, en el mundo
//   api.aura                 el foco de campeon (aura.js): aura.pantalla(clave, { pegajosa }), aura.ir(clave), aura.alCambiar(fn)
//   api.inst()               PLANUI §0.4: INST ya no es un camino quieto; solo saca un <html data-inst> viejo (compatibilidad)
//   api.reloj(), api.cuadros(), api.intensidad(), api.impl ('webgl' | 'css')
import { crearAmbiente } from './ambiente.js';
import { crearAura } from './aura.js';
import { politica } from './fondo.js';
import { fijarColor } from './color.js';
import { aplicarTono, paletaDe } from './tono.js';
import { raizHtml, seguro } from './util.js';

const nada = () => {};
// La api sin efectos (sin WebGL ni CSS posibles, o un fallo al montar): el juego sigue igual.
function apiNula() {
  const aura = { pantalla: nada, ir: nada, alCambiar: () => nada, destruir: nada, actual: null };
  return {
    impl: 'nada',
    ambiente: () => Promise.resolve(),
    pulso: nada,
    congelar: nada,
    pausar: nada,
    reanudar: nada,
    aquietar: nada,
    destruir: nada,
    fondo: nada,
    momento: nada,
    takeover: nada,
    costura: () => ({ k: 0 }),
    quiebre: nada,
    tono: nada,
    aura,
    inst: nada,
    reloj: () => 0,
    cuadros: () => 0,
    intensidad: () => null,
  };
}

export function montarFx(contenedor, opciones = {}) {
  if (!contenedor || typeof document === 'undefined') return null;
  const amb = seguro(() => crearAmbiente(contenedor, opciones));
  if (!amb) return apiNula();
  // cada llamada envuelta: si un efecto tira, degrada a nada (sin error de consola, sin frenar el juego)
  const envolver = (fn, def) => (...args) => seguro(() => fn(...args), def);
  const promesa = (p) => (p && typeof p.then === 'function' ? p.catch(nada) : Promise.resolve());
  const api = {
    get impl() {
      return seguro(() => amb.impl, 'nada');
    },
    ambiente: (o = {}) => promesa(seguro(() => amb.ambiente(o))),
    pulso: envolver((tipo, retardo = 0) => amb.pulso(tipo, retardo)),
    congelar: envolver((ms = 0) => amb.congelar(ms)),
    pausar: envolver(() => amb.pausar()),
    reanudar: envolver(() => amb.reanudar()),
    aquietar: envolver((si = true) => amb.aquietar(si)),
    fondo: envolver(({ contexto, escena = null, instantaneo = false, dur } = {}) => {
      const c = fijarColor(contexto);
      // las piezas que leen el color de la politica desde el CSS (los quemados) lo toman de aca
      raizHtml()?.style.setProperty('--pieza-color', String(c.pieza));
      amb.fondo({ politica: politica({ contexto, escena }), instantaneo, ...(dur != null ? { dur } : {}) });
    }),
    momento: envolver((o = {}) => amb.momento(o)),
    takeover: envolver((retardo = 0) => amb.takeover(retardo)),
    costura: envolver(() => amb.costura(), { k: 0 }),
    quiebre: envolver((retardo = 0) => amb.quiebre(retardo)),
    tono: envolver((tono, { paleta = true, k = 1 } = {}) => {
      aplicarTono(raizHtml(), tono ?? null);
      if (paleta) promesa(amb.ambiente({ paleta: paletaDe(tono, k) }));
    }),
    inst: envolver(() => raizHtml()?.removeAttribute('data-inst')),
    reloj: envolver(() => amb.reloj(), 0),
    cuadros: envolver(() => amb.cuadros(), 0),
    intensidad: envolver(() => amb.intensidad(), null),
    destruir: envolver(() => {
      api.aura.destruir?.();
      amb.destruir();
    }),
    aura: null,
  };
  api.aura = seguro(() => crearAura(api)) ?? apiNula().aura;
  return api;
}
