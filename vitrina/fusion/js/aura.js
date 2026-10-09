// El foco de campeon ("el aura"). Un solo mecanismo para todo el juego: cualquier cosa que represente a un campeon
// lleva `data-campeon="<clave de Data Dragon>"`. Apuntarla (hover o foco de teclado) lleva el ambiente a ese campeon:
// su splash en el duotono de la era, con el cruce de luz del ambiente. Al salir, vuelve al campeon de la pantalla.
// - entrada con retardo (barrer el mouse sobre una grilla no dispara diez transiciones);
// - cruce de T_AURA ms; la vuelta, un rato despues de salir;
// - con movimiento reducido o INST el cambio es directo (el ambiente no cruza);
// - en las paradas el ambiente sigue quieto: el aura es respuesta a tu mano, no movimiento ambiental.
// `pegajosa`: el ultimo apuntado queda como campeon de la pantalla (la seleccion del inicio).
import { reducido, inst } from './util.js';
import { T_AURA } from './ambiente.js';

const ENTRA = 120;
const VUELVE = 600;

// Las claves de Data Dragon son solo letras (MonkeyKing, KSante): se saca todo lo demas antes de armar la URL.
export const claveCampeon = (k) => String(k ?? '').replace(/[^A-Za-z]/g, '') || null;

export function crearAura(amb) {
  let base = null;
  let actual = null;
  let pegajosa = false;
  let tEntra = 0;
  let tVuelve = 0;
  const raiz = document.documentElement;
  // quien muestra el nombre del campeon apuntado (el escenario del draft) se suscribe: el nombre y la luz cambian juntos
  const oyentes = new Set();

  function ir(key) {
    if (key === actual) return;
    actual = key;
    if (key) raiz.dataset.aura = key;
    else delete raiz.dataset.aura;
    amb.ambiente({ arte: key, cruce: T_AURA });
    oyentes.forEach((f) => f(key));
  }
  function apuntar(nodo) {
    const key = claveCampeon(nodo.dataset.campeon);
    clearTimeout(tEntra);
    clearTimeout(tVuelve);
    if (!key) return;
    const ya = () => {
      if (pegajosa) base = key;
      ir(key);
    };
    if (inst() || reducido()) ya();
    else tEntra = setTimeout(ya, ENTRA);
  }
  function soltar() {
    clearTimeout(tEntra);
    clearTimeout(tVuelve);
    if (pegajosa) return;
    if (inst() || reducido()) ir(base);
    else tVuelve = setTimeout(() => ir(base), VUELVE);
  }
  const de = (n) => (n instanceof Element ? n.closest('[data-campeon]') : null);
  const sobre = (e) => {
    const n = de(e.target);
    if (n) apuntar(n);
  };
  const fuera = (e) => {
    const n = de(e.target);
    const a = de(e.relatedTarget);
    if (n && n !== a && !a) soltar();
  };
  document.addEventListener('pointerover', sobre);
  document.addEventListener('pointerout', fuera);
  document.addEventListener('focusin', sobre);
  document.addEventListener('focusout', fuera);

  return {
    // Cada pantalla declara su campeon (el que vuelve al soltar). No toca el ambiente: lo hace el montaje.
    pantalla(key, opciones = {}) {
      clearTimeout(tEntra);
      clearTimeout(tVuelve);
      base = claveCampeon(key);
      actual = base;
      pegajosa = Boolean(opciones.pegajosa);
      delete raiz.dataset.aura;
    },
    // (fusion) avisa cada vez que la luz va a otro campeon; devuelve como desuscribirse
    alCambiar(f) {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    // (fusion) lleva la luz a un campeon desde el codigo (el pick inicial del draft), igual que apuntarlo
    ir,
    get actual() {
      return actual;
    },
  };
}
