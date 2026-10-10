// Sonido opcional de A · LUZ (apagado por defecto; se prende desde el panel). WebAudio sintetizado, sin archivos:
// un clic, un barrido para la cumbre, una multitud (ruido filtrado) y un acorde de titulo. El ruido sale del PRNG comun.
// PLANUI §4.9 (LINEA.md §4.7) suma los de la ceremonia y los momentos, todos mudos con el sonido apagado:
//   ding      el aviso de PARTIDA ENCONTRADA: dos campanas (Mi y Si) sobre un colchon suave
//   golpe     el impacto de una letra o un logo: un bombo que cae de tono + un chasquido de ruido
//   quemado   la brasa del Fearless: un siseo que baja + chispas (rafagas cortas del PRNG)
//   confeti   el estallido: un soplo agudo + destellos de campanita a alturas del PRNG
//   victoria  un acorde mayor que sube, con un brillo arriba
//   derrota   dos notas menores que caen, oscuras
//   flash     el golpe de luz: un barrido de ruido brillante + un ping agudo
// PLANUI §4.10 (T) suma los del suspenso del mapa decisivo, mudos igual con el sonido apagado:
//   tension   un colchon grave que sube de a poco (dos sierras desafinadas, un filtro que se abre y un brillo que trepa)
//             y se corta seco antes del golpe. Devuelve { parar() } (Espacio o repetir lo cortan ya)
//   latido    el corazon: dos golpes sordos (lub-dub), el segundo mas suave
import { crearAzar } from '../../comun/azar.js';

const SIN_SONIDO = Object.freeze({ parar() {} });

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
    ding() {
      const c = audio();
      if (!c) return;
      const t = c.currentTime;
      for (const [i, [hz, pico]] of [[1318.5, 0.07], [1975.5, 0.05]].entries()) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.value = hz;
        envolvente(g, t + i * 0.09, 0.006, 0.04, 1.3, pico);
        o.connect(g).connect(c.destination);
        o.start(t + i * 0.09);
        o.stop(t + 1.6);
      }
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = 659.25;
      envolvente(g, t, 0.02, 0.1, 0.9, 0.035);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 1.2);
    },
    golpe() {
      const c = audio();
      if (!c) return;
      const t = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.28);
      envolvente(g, t, 0.004, 0.03, 0.32, 0.32);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 0.45);
      const s = c.createBufferSource();
      s.buffer = ruido;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 2400;
      const gr = c.createGain();
      envolvente(gr, t, 0.002, 0.01, 0.09, 0.12);
      s.connect(f).connect(gr).connect(c.destination);
      s.start(t);
      s.stop(t + 0.15);
    },
    quemado() {
      const c = audio();
      if (!c) return;
      const t = c.currentTime;
      const s = c.createBufferSource();
      s.buffer = ruido;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 2.5;
      f.frequency.setValueAtTime(2600, t);
      f.frequency.exponentialRampToValueAtTime(500, t + 0.55);
      const g = c.createGain();
      envolvente(g, t, 0.02, 0.18, 0.4, 0.16);
      s.connect(f).connect(g).connect(c.destination);
      s.start(t);
      s.stop(t + 0.7);
      for (let i = 0; i < 7; i++) {
        const tc = t + 0.05 + azar.siguiente() * 0.5;
        const ch = c.createBufferSource();
        ch.buffer = ruido;
        const fh = c.createBiquadFilter();
        fh.type = 'highpass';
        fh.frequency.value = 3000 + azar.siguiente() * 3000;
        const gh = c.createGain();
        envolvente(gh, tc, 0.001, 0.004, 0.02, 0.09);
        ch.connect(fh).connect(gh).connect(c.destination);
        ch.start(tc, azar.siguiente());
        ch.stop(tc + 0.04);
      }
    },
    confeti() {
      const c = audio();
      if (!c) return;
      const t = c.currentTime;
      const s = c.createBufferSource();
      s.buffer = ruido;
      const f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 4000;
      const g = c.createGain();
      envolvente(g, t, 0.01, 0.05, 0.35, 0.08);
      s.connect(f).connect(g).connect(c.destination);
      s.start(t);
      s.stop(t + 0.5);
      for (let i = 0; i < 9; i++) {
        const tc = t + 0.04 + azar.siguiente() * 0.7;
        const o = c.createOscillator();
        const go = c.createGain();
        o.type = 'sine';
        o.frequency.value = 2200 + azar.siguiente() * 2600;
        envolvente(go, tc, 0.002, 0.01, 0.16, 0.025);
        o.connect(go).connect(c.destination);
        o.start(tc);
        o.stop(tc + 0.2);
      }
    },
    victoria() {
      const c = audio();
      if (!c) return;
      const t = c.currentTime;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(900, t);
      f.frequency.exponentialRampToValueAtTime(3200, t + 0.6);
      f.connect(c.destination);
      for (const [i, hz] of [261.63, 329.63, 392, 523.25, 659.25].entries()) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sawtooth';
        o.frequency.value = hz;
        envolvente(g, t + i * 0.06, 0.03, 0.7, 1.4, 0.03);
        o.connect(g).connect(f);
        o.start(t + i * 0.06);
        o.stop(t + 2.6);
      }
    },
    derrota() {
      const c = audio();
      if (!c) return;
      const t = c.currentTime;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(1400, t);
      f.frequency.exponentialRampToValueAtTime(380, t + 1.6);
      f.connect(c.destination);
      for (const [i, [hz, hz2]] of [[220, 207.65], [174.61, 164.81]].entries()) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(hz, t + i * 0.42);
        o.frequency.linearRampToValueAtTime(hz2, t + i * 0.42 + 0.9);
        envolvente(g, t + i * 0.42, 0.05, 0.5, 0.9, 0.04);
        o.connect(g).connect(f);
        o.start(t + i * 0.42);
        o.stop(t + i * 0.42 + 1.6);
      }
    },
    flash() {
      const c = audio();
      if (!c) return;
      const t = c.currentTime;
      const s = c.createBufferSource();
      s.buffer = ruido;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 1.2;
      f.frequency.setValueAtTime(1200, t);
      f.frequency.exponentialRampToValueAtTime(9000, t + 0.25);
      const g = c.createGain();
      envolvente(g, t, 0.01, 0.04, 0.3, 0.14);
      s.connect(f).connect(g).connect(c.destination);
      s.start(t);
      s.stop(t + 0.4);
      const o = c.createOscillator();
      const go = c.createGain();
      o.type = 'sine';
      o.frequency.value = 2637;
      envolvente(go, t + 0.03, 0.003, 0.02, 0.5, 0.04);
      o.connect(go).connect(c.destination);
      o.start(t + 0.03);
      o.stop(t + 0.7);
    },
    tension(segundos = 3) {
      const c = audio();
      if (!c) return SIN_SONIDO;
      const t = c.currentTime;
      const fin = t + Math.max(0.5, segundos);
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.Q.value = 4;
      f.frequency.setValueAtTime(160, t);
      f.frequency.exponentialRampToValueAtTime(1500, fin);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.055, fin - 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, fin);
      f.connect(g).connect(c.destination);
      const fuentes = [];
      for (const hz of [55, 55.7, 110.4]) {
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = hz;
        o.connect(f);
        fuentes.push(o);
      }
      // el brillo que trepa (una octava, de La a La)
      const b = c.createOscillator();
      const gb = c.createGain();
      b.type = 'sine';
      b.frequency.setValueAtTime(440, t);
      b.frequency.exponentialRampToValueAtTime(880, fin);
      gb.gain.setValueAtTime(0.0001, t);
      gb.gain.exponentialRampToValueAtTime(0.018, fin - 0.08);
      gb.gain.exponentialRampToValueAtTime(0.0001, fin);
      b.connect(gb).connect(c.destination);
      fuentes.push(b);
      for (const o of fuentes) {
        o.start(t);
        o.stop(fin + 0.02);
      }
      return {
        parar() {
          const ahora = c.currentTime;
          for (const x of [g, gb]) {
            x.gain.cancelScheduledValues(ahora);
            x.gain.setTargetAtTime(0.0001, ahora, 0.03);
          }
          for (const o of fuentes) {
            try {
              o.stop(ahora + 0.15);
            } catch {
              /* ya parado */
            }
          }
        },
      };
    },
    latido(k = 1) {
      const c = audio();
      if (!c) return;
      const t = c.currentTime;
      for (const [i, pico] of [0.3, 0.18].entries()) {
        const ti = t + i * 0.15;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(62, ti);
        o.frequency.exponentialRampToValueAtTime(38, ti + 0.16);
        envolvente(g, ti, 0.006, 0.02, 0.17, Math.max(0.0002, pico * Math.min(1, k)));
        o.connect(g).connect(c.destination);
        o.start(ti);
        o.stop(ti + 0.24);
      }
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
