// El sintetizador WebAudio (fase T3, PLAN.md "T3 — El escenario y el
// reproductor"). Sin un solo archivo de audio: todo son osciladores con una
// envolvente de ganancia. Apagado por defecto — se prende con el toggle 🔊
// del topbar — y el `AudioContext` se crea recién en el primer gesto real
// del usuario, porque los navegadores lo exigen: uno creado antes de una
// interacción queda `suspended` y nunca suena.

const CLAVE_HABILITADO = 'lolcs-sonido-habilitado';

let ctx = null;
let habilitado = leerPreferencia();

function leerPreferencia() {
  try {
    return localStorage.getItem(CLAVE_HABILITADO) === '1';
  } catch {
    // localStorage puede no estar disponible (navegación privada, política
    // del navegador). El sonido simplemente arranca apagado.
    return false;
  }
}

function guardarPreferencia() {
  try {
    localStorage.setItem(CLAVE_HABILITADO, habilitado ? '1' : '0');
  } catch { /* ver leerPreferencia */ }
}

function asegurarContexto() {
  if (!ctx) {
    const Impl = window.AudioContext || window.webkitAudioContext;
    if (!Impl) return null;
    ctx = new Impl();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

export function estaHabilitado() {
  return habilitado;
}

// Llamado desde el toggle del topbar: es un gesto real del usuario, el
// único momento en que un `AudioContext` nuevo puede arrancar sonando.
export function alternar() {
  habilitado = !habilitado;
  guardarPreferencia();
  if (habilitado) {
    asegurarContexto();
  }
  return habilitado;
}

// Un tono con envolvente simple: ataque instantáneo, decaimiento
// exponencial. `freqFin` desliza el tono (para el swell y los stingers).
function tono({ freq, duracion = 0.12, tipo = 'sine', volumen = 0.09, freqFin = null }) {
  if (!habilitado) return;
  const audio = asegurarContexto();
  if (!audio) return;

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  if (freqFin) {
    osc.frequency.exponentialRampToValueAtTime(freqFin, audio.currentTime + duracion);
  }

  gain.gain.setValueAtTime(volumen, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duracion);

  osc.connect(gain).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duracion);
}

// --- Los cinco sonidos del plan ------------------------------------------

export function click() {
  tono({ freq: 720, duracion: 0.05, tipo: 'square', volumen: 0.05 });
}

// Un beat del reproductor: una línea de log entrando.
export function tick() {
  tono({ freq: 480, duracion: 0.07, tipo: 'sine', volumen: 0.06 });
}

export function victoria() {
  tono({ freq: 440, freqFin: 880, duracion: 0.35, tipo: 'triangle', volumen: 0.11 });
}

export function derrota() {
  tono({ freq: 300, freqFin: 120, duracion: 0.4, tipo: 'sawtooth', volumen: 0.09 });
}

// Cuando se abre una decisión bisagra (T4 le da la forma visual; el sonido
// no necesita esperar a T4 — `datos.evento.bisagra` ya existe hoy).
export function swellBisagra() {
  tono({ freq: 220, freqFin: 330, duracion: 0.6, tipo: 'triangle', volumen: 0.08 });
}

// El arpegio de título: para T7 (la tarjeta de legado), ya escrito acá para
// no volver a tocar este archivo cuando llegue esa fase.
export function arpegioTitulo() {
  if (!habilitado) return;
  const notas = [523.25, 659.25, 783.99, 1046.5]; // C5 · E5 · G5 · C6
  notas.forEach((freq, i) => {
    setTimeout(() => tono({ freq, duracion: 0.25, tipo: 'triangle', volumen: 0.08 }), i * 90);
  });
}
