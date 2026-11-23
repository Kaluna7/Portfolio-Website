// Musik latar ambient yang dibuat langsung dengan Web Audio API:
// pad akor lembut + nada lonceng ala kotak musik + gema.
// Jika `src` diisi, file audio itu yang diputar (berulang) sebagai gantinya.

type Theme = {
  progression: { bass: number; pad: number[] }[];
  melody: number[];
  bar: number; // detik per akor
  rhythm: number[];
  noteChance: number;
  cutoff: number; // kecerahan pad
  bellLevel: number;
  crackle: boolean; // desis piringan hitam
};

const DEFAULT_THEME: Theme = {
  progression: [
    { bass: 38, pad: [50, 54, 57, 61] }, // Dmaj7
    { bass: 35, pad: [47, 50, 54, 57] }, // Bm7
    { bass: 43, pad: [50, 54, 55, 59] }, // Gmaj7
    { bass: 45, pad: [52, 57, 59, 62] }, // Asus
  ],
  melody: [74, 76, 78, 81, 83, 86, 88], // pentatonik D
  bar: 8,
  rhythm: [0.75, 1.5, 1.5, 2.25, 3],
  noteChance: 0.6,
  cutoff: 1000,
  bellLevel: 0.2,
  crackle: false,
};

/** Dunia kenangan: minor, lebih lambat dan redup, kotak musik, dan desis piringan hitam. */
export const MEMORY_THEME: Theme = {
  progression: [
    { bass: 33, pad: [45, 52, 57, 60] }, // Am
    { bass: 29, pad: [45, 48, 53, 57] }, // Fmaj7
    { bass: 36, pad: [48, 52, 55, 59] }, // Cmaj7
    { bass: 28, pad: [47, 52, 55, 59] }, // Em7
  ],
  melody: [69, 72, 74, 76, 79, 81, 84], // pentatonik A minor
  bar: 10,
  rhythm: [0.9, 1.8, 1.8, 2.7],
  noteChance: 0.8,
  cutoff: 620,
  bellLevel: 0.3,
  crackle: true,
};

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export type Music = {
  readonly playing: boolean;
  start(): void;
  stop(): void;
};

export function createMusic(opts: { src?: string; volume?: number; theme?: Theme } = {}): Music {
  const volume = opts.volume ?? 0.5;
  return opts.src ? fileMusic(opts.src, volume) : ambientMusic(volume, opts.theme ?? DEFAULT_THEME);
}

function fileMusic(src: string, volume: number): Music {
  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = 0;
  let playing = false;
  let fade = 0;

  const fadeTo = (target: number, done?: () => void) => {
    cancelAnimationFrame(fade);
    const step = () => {
      const d = target - audio.volume;
      if (Math.abs(d) < 0.01) {
        audio.volume = target;
        done?.();
        return;
      }
      audio.volume = Math.min(1, Math.max(0, audio.volume + Math.sign(d) * 0.01));
      fade = requestAnimationFrame(step);
    };
    step();
  };

  return {
    get playing() {
      return playing;
    },
    start() {
      playing = true;
      audio.play().catch(() => (playing = false));
      fadeTo(volume);
    },
    stop() {
      playing = false;
      fadeTo(0, () => audio.pause());
    },
  };
}

function ambientMusic(volume: number, theme: Theme): Music {
  const { progression: PROGRESSION, melody: MELODY, bar: BAR, rhythm: RHYTHM } = theme;
  let ctx: AudioContext | null = null;
  let master: GainNode;
  let padBus: GainNode;
  let bellBus: GainNode;
  let timer = 0;
  let stopTimer = 0;
  let nextChord = 0;
  let nextNote = 0;
  let chordIdx = 0;
  let noteIdx = 2;
  let playing = false;

  function impulse(c: AudioContext, seconds: number, decay: number) {
    const len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
    }
    return buf;
  }

  function setup() {
    const c = new AudioContext();
    ctx = c;

    master = c.createGain();
    master.gain.value = 0;
    const comp = c.createDynamicsCompressor();
    master.connect(comp).connect(c.destination);

    const reverb = c.createConvolver();
    reverb.buffer = impulse(c, 5, 2.5);
    const wet = c.createGain();
    wet.gain.value = 0.6;
    reverb.connect(wet).connect(master);

    // Pad: disaring lembut, filternya "bernapas" pelan
    padBus = c.createGain();
    padBus.gain.value = 0.5;
    const padFilter = c.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = theme.cutoff;
    padFilter.Q.value = 0.3;
    padBus.connect(padFilter);
    padFilter.connect(master);
    padFilter.connect(reverb);
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoDepth = c.createGain();
    lfoDepth.gain.value = 350;
    lfo.connect(lfoDepth).connect(padFilter.frequency);
    lfo.start();

    // Lonceng: dengan delay bergema
    bellBus = c.createGain();
    bellBus.gain.value = theme.bellLevel;
    bellBus.connect(master);
    bellBus.connect(reverb);
    const delay = c.createDelay(2);
    delay.delayTime.value = 0.6;
    const feedback = c.createGain();
    feedback.gain.value = 0.35;
    const tone = c.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2400;
    const delayOut = c.createGain();
    delayOut.gain.value = 0.5;
    bellBus.connect(delay);
    delay.connect(tone).connect(feedback).connect(delay);
    tone.connect(delayOut);
    delayOut.connect(master);
    delayOut.connect(reverb);

    if (theme.crackle) {
      // Piringan hitam tua: desis halus + letupan kecil acak, diulang terus
      const len = c.sampleRate * 6;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.012;
      for (let n = 0; n < 70; n++) {
        const at = Math.floor(Math.random() * (len - 200));
        const amp = 0.15 + Math.random() * 0.6;
        for (let k = 0; k < 90; k++) data[at + k] += (Math.random() * 2 - 1) * amp * Math.exp(-k / 14);
      }
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 900;
      const level = c.createGain();
      level.gain.value = 0.2;
      src.connect(hp).connect(level).connect(master);
      src.start();
    }
  }

  function pad(chord: (typeof PROGRESSION)[number], t: number) {
    const c = ctx!;
    const dur = BAR + 3;
    const voices = [...chord.pad.map((m) => ({ m, v: 0.06 })), { m: chord.bass, v: 0.09 }];
    for (const { m, v } of voices) {
      for (const [type, detune] of [
        ['sine', -6],
        ['triangle', 6],
      ] as const) {
        const o = c.createOscillator();
        o.type = type;
        o.frequency.value = hz(m);
        o.detune.value = detune;
        const g = c.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(v, t + 3);
        g.gain.setValueAtTime(v, t + dur - 4);
        g.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(g).connect(padBus);
        o.start(t);
        o.stop(t + dur + 0.1);
      }
    }
  }

  function bell(m: number, t: number, v: number) {
    const c = ctx!;
    for (const [ratio, amp] of [
      [1, 1],
      [2, 0.25],
      [3.01, 0.08],
    ]) {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = hz(m) * ratio;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(v * amp, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2 / ratio);
      o.connect(g).connect(bellBus);
      o.start(t);
      o.stop(t + 3.5 / ratio);
    }
  }

  function schedule() {
    const c = ctx!;
    const ahead = c.currentTime + 1.5;
    while (nextChord < ahead) {
      pad(PROGRESSION[chordIdx % PROGRESSION.length], nextChord);
      chordIdx++;
      nextChord += BAR;
    }
    while (nextNote < ahead) {
      if (Math.random() < theme.noteChance) {
        noteIdx = Math.min(MELODY.length - 1, Math.max(0, noteIdx + Math.round(Math.random() * 4 - 2)));
        bell(MELODY[noteIdx], nextNote, 0.5 + Math.random() * 0.5);
      }
      nextNote += pick(RHYTHM);
    }
  }

  return {
    get playing() {
      return playing;
    },
    start() {
      if (!ctx) setup();
      const c = ctx!;
      clearTimeout(stopTimer);
      c.resume();
      if (!timer) {
        nextChord = Math.max(nextChord, c.currentTime + 0.1);
        nextNote = Math.max(nextNote, c.currentTime + 2);
        schedule();
        timer = window.setInterval(schedule, 250);
      }
      master.gain.cancelScheduledValues(c.currentTime);
      master.gain.setTargetAtTime(volume, c.currentTime, 1.2);
      playing = true;
    },
    stop() {
      if (!ctx) return;
      const c = ctx;
      playing = false;
      master.gain.cancelScheduledValues(c.currentTime);
      master.gain.setTargetAtTime(0, c.currentTime, 0.4);
      stopTimer = window.setTimeout(() => {
        clearInterval(timer);
        timer = 0;
        c.suspend();
      }, 2000);
    },
  };
}
