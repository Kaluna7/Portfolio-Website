// Efek suara buku yang disintesis dengan Web Audio API (tanpa file):
// desir kertas saat halaman dibalik, dan bunyi sampul saat buku dibuka/ditutup.

let ctx: AudioContext | null = null;
let out: GainNode;
let noise: AudioBuffer;

function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

type Burst = {
  at: number; // detik dari sekarang
  dur: number;
  type: BiquadFilterType;
  from: number; // frekuensi filter awal
  to?: number; // frekuensi filter akhir
  q?: number;
  gain: number;
  peak?: number; // posisi puncak volume (0–1)
};

/** Semburan derau yang disaring — bahan dasar semua bunyi kertas & kulit. */
function burst({ at, dur, type, from, to = from, q = 1, gain, peak = 0.1 }: Burst) {
  const c = audio();
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.max(0.005, dur * peak));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(out);
  src.start(t, Math.random() * 1.5);
  src.stop(t + dur + 0.05);
}

function thud(at: number, freq: number, gain: number) {
  const c = audio();
  const t = c.currentTime + at;
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.25);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.35);
}

/** Nada lonceng kecil. */
function ping(at: number, freq: number, gain: number, dur = 1.2) {
  const c = audio();
  const t = c.currentTime + at;
  for (const [ratio, amp] of [
    [1, 1],
    [2.01, 0.3],
  ]) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq * ratio;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * amp, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur / ratio);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur / ratio + 0.05);
  }
}

// Tangga nada pentatonik untuk kilau cahaya
const SPARKLE = [880, 988, 1175, 1319, 1480, 1760, 1976, 2349];

export const sfx = {
  /** Logo disentuh: denting kaca berkilau. */
  logoTouch() {
    [1319, 1760, 2349].forEach((f, i) => ping(i * 0.07, f, 0.16 - i * 0.03, 1.5));
    burst({ at: 0, dur: 0.5, type: 'highpass', from: 5000, q: 0.7, gain: 0.04, peak: 0.1 });
  },

  /** Logo berevolusi: nada naik, kilau makin rapat, lalu dentuman cahaya di akhir. */
  evolve(duration: number) {
    const c = audio();
    const t = c.currentTime;
    for (const [mult, type, level] of [
      [1, 'sine', 0.14],
      [1.5, 'triangle', 0.05],
    ] as const) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(130 * mult, t);
      o.frequency.exponentialRampToValueAtTime(1050 * mult, t + duration);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(level, t + duration * 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration + 0.1);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + duration + 0.15);
    }
    burst({ at: duration * 0.2, dur: duration * 0.8, type: 'bandpass', from: 600, to: 6000, q: 0.8, gain: 0.09, peak: 0.92 });
    // Kilau kunang-kunang: makin lama makin rapat
    let at = 0.3;
    let gap = 0.34;
    while (at < duration) {
      ping(at, SPARKLE[Math.floor(Math.random() * SPARKLE.length)], 0.03 + (at / duration) * 0.05, 0.9);
      at += gap;
      gap = Math.max(0.05, gap * 0.9);
    }
    // Dentuman saat cahaya meledak
    thud(duration, 70, 0.55);
    burst({ at: duration, dur: 1.1, type: 'lowpass', from: 5000, to: 200, q: 0.5, gain: 0.32, peak: 0.02 });
  },

  /** Lorong waktu: angin melesat dan detak jam yang makin cepat. */
  timeWarp(duration: number) {
    burst({ at: 0, dur: duration, type: 'bandpass', from: 240, to: 2600, q: 0.7, gain: 0.26, peak: 0.85 });
    burst({ at: 0, dur: duration, type: 'lowpass', from: 150, to: 500, q: 0.5, gain: 0.3, peak: 0.8 });
    let at = 0;
    let gap = 0.34;
    let tock = false;
    while (at < duration) {
      burst({ at, dur: 0.035, type: 'bandpass', from: tock ? 1500 : 2300, q: 7, gain: 0.32, peak: 0.1 });
      tock = !tock;
      at += gap;
      gap = Math.max(0.05, gap * 0.87);
    }
  },

  /** Foto kenangan muncul: dua nada lembut dan desir tipis. */
  memory() {
    ping(0, 784, 0.07, 1.8);
    ping(0.11, 1175, 0.05, 2);
    burst({ at: 0, dur: 0.6, type: 'highpass', from: 3500, q: 0.7, gain: 0.025, peak: 0.3 });
  },

  /** Tiba kembali di masa kini. */
  arrive() {
    [1175, 880, 659].forEach((f, i) => ping(i * 0.09, f, 0.09, 1.6));
    thud(0, 95, 0.2);
  },

  /** Desir halaman dibalik; `duration` = lama animasi balik (detik), `volume` 0–1. */
  pageFlip(duration: number, volume = 1) {
    const v = volume;
    // Kertas terangkat: gesekan halus
    burst({ at: 0, dur: duration * 0.25, type: 'highpass', from: 2500, q: 0.7, gain: 0.05 * v, peak: 0.5 });
    // Desir utama saat halaman melayang
    burst({ at: duration * 0.08, dur: duration * 0.75, type: 'bandpass', from: 700, to: 2600, q: 0.9, gain: 0.32 * v, peak: 0.45 });
    // Kerisik kertas kecil
    for (let i = 0; i < 3; i++) {
      burst({ at: duration * (0.15 + Math.random() * 0.4), dur: 0.05, type: 'highpass', from: 3500, q: 1, gain: 0.04 * v });
    }
    // Halaman mendarat
    burst({ at: duration * 0.88, dur: 0.16, type: 'lowpass', from: 900, to: 300, q: 0.7, gain: 0.25 * v, peak: 0.08 });
  },

  /** Sampul kulit terbuka lalu rebah. Waktu disesuaikan dengan animasi di scene.ts. */
  bookOpen() {
    burst({ at: 0.45, dur: 0.5, type: 'bandpass', from: 1800, to: 900, q: 2, gain: 0.05, peak: 0.6 });
    burst({ at: 0.6, dur: 1.6, type: 'bandpass', from: 300, to: 1400, q: 0.8, gain: 0.18, peak: 0.55 });
    burst({ at: 2.3, dur: 0.3, type: 'lowpass', from: 500, to: 150, q: 0.7, gain: 0.45, peak: 0.05 });
    thud(2.3, 85, 0.35);
  },

  bookClose() {
    burst({ at: 0.15, dur: 1.4, type: 'bandpass', from: 1400, to: 300, q: 0.8, gain: 0.16, peak: 0.5 });
    burst({ at: 1.65, dur: 0.3, type: 'lowpass', from: 500, to: 150, q: 0.7, gain: 0.5, peak: 0.05 });
    thud(1.65, 80, 0.4);
  },
};
