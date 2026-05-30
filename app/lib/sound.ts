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

/* ---------- Música de fondo del splash ----------
 * Loop chiptune (I-V-vi-IV en C mayor) con bajo + melodía + arpegio.
 * Web Audio puro: agendamos N loops por adelantado y los enrutamos a un
 * único GainNode master para poder fadear/cortar al cerrar el splash.
 */
let musicMaster: GainNode | null = null;
let musicOscs: OscillatorNode[] = [];

function scheduleNote(
  ctx: AudioContext,
  master: GainNode,
  opts: {
    freq: number;
    startAt: number;
    duration: number;
    type: OscillatorType;
    gain: number;
  },
) {
  const { freq, startAt, duration, type, gain } = opts;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  g.gain.setValueAtTime(0, startAt);
  g.gain.linearRampToValueAtTime(gain, startAt + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0008, startAt + duration);
  osc.connect(g).connect(master);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
  musicOscs.push(osc);
}

export function startSplashMusic(): void {
  const ctx = getCtx();
  if (!ctx || muted || musicMaster) return;
  // Si el contexto no logró arrancar (autoplay bloqueado), retry vendrá del
  // próximo gesto via attachSplashMusicUnlock().
  if (ctx.state !== "running") return;

  const master = ctx.createGain();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(0.22 * masterVolume, ctx.currentTime + 0.6);
  master.connect(ctx.destination);
  musicMaster = master;

  const bpm = 138;
  const beat = 60 / bpm;
  const bar = beat * 4;
  const t0 = ctx.currentTime + 0.08;

  // Progresión I-V-vi-IV en C mayor.
  // Cada acorde: bajo (pulso por beat) + melodía de 8 corcheas.
  const progression: {
    bass: number;
    melody: number[];
  }[] = [
    // C major: bass C3, melody C5-E5-G5-E5-G5-E5-C5-G4
    { bass: 130.81, melody: [523.25, 659.25, 783.99, 659.25, 783.99, 659.25, 523.25, 392.0] },
    // G major: bass G2, melody D5-G5-B5-G5-B5-G5-D5-B4
    { bass: 98.0, melody: [587.33, 783.99, 987.77, 783.99, 987.77, 783.99, 587.33, 493.88] },
    // A minor: bass A2, melody A4-C5-E5-C5-E5-C5-A4-G4
    { bass: 110.0, melody: [440.0, 523.25, 659.25, 523.25, 659.25, 523.25, 440.0, 392.0] },
    // F major: bass F2, melody F4-A4-C5-A4-C5-A4-F4-C5
    { bass: 87.31, melody: [349.23, 440.0, 523.25, 440.0, 523.25, 440.0, 349.23, 523.25] },
  ];

  // Loops: ~7s cada uno → 6 loops ≈ 42s, suficiente margen.
  const LOOPS = 6;
  for (let loop = 0; loop < LOOPS; loop++) {
    for (let i = 0; i < progression.length; i++) {
      const barT = t0 + (loop * progression.length + i) * bar;
      const { bass, melody } = progression[i];
      // Bajo: 4 negras
      for (let b = 0; b < 4; b++) {
        scheduleNote(ctx, master, {
          freq: bass,
          startAt: barT + b * beat,
          duration: beat * 0.65,
          type: "triangle",
          gain: 0.32,
        });
      }
      // Melodía: 8 corcheas
      for (let m = 0; m < melody.length; m++) {
        scheduleNote(ctx, master, {
          freq: melody[m],
          startAt: barT + m * (beat / 2),
          duration: beat * 0.42,
          type: "square",
          gain: 0.16,
        });
      }
    }
  }
}

export function stopSplashMusic(): void {
  if (!musicMaster || !audioCtx) return;
  const ctx = audioCtx;
  const master = musicMaster;
  const oscs = musicOscs;
  musicMaster = null;
  musicOscs = [];
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(Math.max(0.0008, master.gain.value), t);
  master.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  setTimeout(() => {
    oscs.forEach((o) => {
      try {
        o.stop();
      } catch {
        // ignore
      }
    });
    master.disconnect();
  }, 400);
}

/* Para vencer el autoplay policy: registra un listener one-shot global que
 * arranca la música apenas haya un gesto del usuario. Devuelve un cleanup. */
export function attachSplashMusicUnlock(): () => void {
  if (typeof window === "undefined") return () => {};
  const events: (keyof WindowEventMap)[] = [
    "pointerdown",
    "touchstart",
    "keydown",
  ];
  const handler = () => {
    startSplashMusic();
    events.forEach((ev) =>
      window.removeEventListener(ev, handler, { capture: true } as EventListenerOptions),
    );
  };
  events.forEach((ev) =>
    window.addEventListener(ev, handler, { capture: true, passive: true }),
  );
  return () => {
    events.forEach((ev) =>
      window.removeEventListener(ev, handler, { capture: true } as EventListenerOptions),
    );
  };
}
