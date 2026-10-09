// Sonido opcional de A · LUZ (apagado por defecto; se prende desde el panel). WebAudio sintetizado, sin archivos:
// un clic, un barrido para la cumbre, una multitud (ruido filtrado) y un acorde de titulo. El ruido sale del PRNG comun.
import { crearAzar } from '../../comun/azar.js';

export function crearSonido() {
  let prendido = document.documentElement.hasAttribute('data-sonido');
  let ctx = null;
  let ruido = null;
  const azar = crearAzar('a-luz-sonido');
  function audio() {
    if (!prendido) return null;
    if (!ctx) {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = ruido.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = azar.siguiente() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function envolvente(g, t, a, s, r, pico) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(pico, t + a);
    g.gain.setValueAtTime(pico, t + a + s);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + s + r);
  }
  return {
    activar(si) {
      prendido = Boolean(si);
      if (!prendido && ctx) ctx.suspend().catch(() => {});
    },
    clic() {
      const c = audio();
      if (!c) return;
      const t = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(1800, t);
      o.frequency.exponentialRampToValueAtTime(600, t + 0.05);
      envolvente(g, t, 0.003, 0.01, 0.06, 0.08);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 0.1);
    },
    barrido() {
      const c = audio();
      if (!c) return;
      const t = c.currentTime;
      const s = c.createBufferSource();
      s.buffer = ruido;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 6;
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(6000, t + 0.9);
      const g = c.createGain();
      envolvente(g, t, 0.4, 0.2, 0.5, 0.18);
      s.connect(f).connect(g).connect(c.destination);
      s.start(t);
      s.stop(t + 1.2);
    },
    multitud(segundos = 2.4) {
      const c = audio();
      if (!c) return;
      const t = c.currentTime;
      const s = c.createBufferSource();
      s.buffer = ruido;
      s.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1400;
      const g = c.createGain();
      envolvente(g, t, 0.5, segundos - 1.2, 0.7, 0.12);
      s.connect(f).connect(g).connect(c.destination);
      s.start(t);
      s.stop(t + segundos);
    },
    acorde() {
      const c = audio();
      if (!c) return;
      const t = c.currentTime;
      for (const [i, hz] of [261.63, 329.63, 392, 523.25].entries()) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = i % 2 ? 'sine' : 'triangle';
        o.frequency.value = hz;
        envolvente(g, t + i * 0.04, 0.04, 0.5, 1.4, 0.05);
        o.connect(g).connect(c.destination);
        o.start(t + i * 0.04);
        o.stop(t + 2.2);
      }
    },
  };
}
