// Sintetizador de SFX con Web Audio — sin archivos, sin red.
// Estilo "gamificado" 8-bit/UI arcade. Los navegadores no permiten audio
// antes del primer gesto del usuario, así que el contexto se crea lazy
// la primera vez que se llama a un sonido (que será un click).

let audioCtx: AudioContext | null = null;
let muted = false;
let masterVolume = 0.7;

const STORAGE_KEY = "kb_sfx_muted";

// Inicializa muted desde localStorage (solo en cliente).
if (typeof window !== "undefined") {
  try {
    muted = window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // ignore
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  // Algunos browsers suspenden el contexto; lo reanudamos en el gesto.
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

type ToneOpts = {
  freq: number;
  freqEnd?: number;
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  attack?: number;
  release?: number;
  delay?: number;
};

function tone({
  freq,
  freqEnd,
  duration = 0.08,
  type = "sine",
  volume = 0.18,
  attack = 0.004,
  release = 0.04,
  delay = 0,
}: ToneOpts) {
  const ctx = getCtx();
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(0.0001, freqEnd), t + duration);
  }
  const peak = volume * masterVolume;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration + release);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + release + 0.02);
}

function noise({
  duration = 0.08,
  volume = 0.15,
  highpass = 600,
  delay = 0,
}: {
  duration?: number;
  volume?: number;
  highpass?: number;
  delay?: number;
}) {
  const ctx = getCtx();
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = highpass;
  const gain = ctx.createGain();
  const peak = volume * masterVolume;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.connect(hp).connect(gain).connect(ctx.destination);
  src.start(t);
  src.stop(t + duration + 0.02);
}

export const sfx = {
  // Click genérico — botones primarios/ghost.
  click() {
    tone({ freq: 880, duration: 0.04, type: "triangle", volume: 0.12 });
  },
  // Tap sutil — chips, celdas, tabs.
  tap() {
    tone({ freq: 1320, duration: 0.025, type: "square", volume: 0.07 });
  },
  // Pop con sweep ascendente — selección, acciones positivas.
  pop() {
    tone({
      freq: 520,
      freqEnd: 1100,
      duration: 0.07,
      type: "sine",
      volume: 0.13,
    });
  },
  // Toggle on/off — switches.
  toggle(on: boolean) {
    if (on) {
      tone({ freq: 600, freqEnd: 1400, duration: 0.05, type: "triangle", volume: 0.1 });
    } else {
      tone({ freq: 900, freqEnd: 450, duration: 0.05, type: "triangle", volume: 0.08 });
    }
  },
  // Bloop — tap en celda del tablero.
  bloop() {
    tone({ freq: 440, freqEnd: 880, duration: 0.07, type: "sine", volume: 0.12 });
  },
  // Éxito — validación correcta, casilla marcada, win condition pequeña.
  success() {
    tone({ freq: 660, duration: 0.08, type: "square", volume: 0.13 });
    tone({ freq: 880, duration: 0.08, type: "square", volume: 0.13, delay: 0.08 });
    tone({ freq: 1320, duration: 0.16, type: "square", volume: 0.14, delay: 0.16 });
  },
  // Falló — validación incorrecta.
  fail() {
    tone({ freq: 320, freqEnd: 140, duration: 0.18, type: "sawtooth", volume: 0.12 });
  },
  // Start fanfare — botón "Comenzar" del splash. Arpegio + whoosh.
  start() {
    // Whoosh
    noise({ duration: 0.35, volume: 0.08, highpass: 800 });
    // Arpegio C-E-G-C ascendente (C major triad + octava)
    tone({ freq: 523, duration: 0.1, type: "square", volume: 0.13, delay: 0 });
    tone({ freq: 659, duration: 0.1, type: "square", volume: 0.13, delay: 0.09 });
    tone({ freq: 784, duration: 0.1, type: "square", volume: 0.13, delay: 0.18 });
    tone({ freq: 1046, duration: 0.2, type: "square", volume: 0.16, delay: 0.27, release: 0.12 });
  },
  // Cierre — modal/sheet close, cancelar.
  close() {
    tone({ freq: 700, freqEnd: 360, duration: 0.08, type: "triangle", volume: 0.1 });
  },
};

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }
}

export function setMasterVolume(v: number): void {
  masterVolume = Math.max(0, Math.min(1, v));
}
