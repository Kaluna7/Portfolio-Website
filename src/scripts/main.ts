import gsap from 'gsap';
import { createScene, type BookScene } from './scene';
import { createReader } from './reader';
import { createMusic } from './music';
import { sfx } from './sfx';
import { createMemory } from './memory';
import { music as musicConfig, projects } from '../data/portfolio';

const MUSIC_KEY = 'kaluna-music';

function setupMusic() {
  const btn = document.getElementById('music-btn')!;
  const music = createMusic(musicConfig);
  const read = () => {
    try {
      return localStorage.getItem(MUSIC_KEY);
    } catch {
      return null;
    }
  };
  const save = (v: string) => {
    try {
      localStorage.setItem(MUSIC_KEY, v);
    } catch {
      /* penyimpanan tidak tersedia */
    }
  };
  const sync = () => {
    btn.classList.toggle('is-playing', music.playing);
    btn.setAttribute('aria-pressed', String(music.playing));
  };

  btn.addEventListener('click', () => {
    if (music.playing) music.stop();
    else music.start();
    save(music.playing ? 'on' : 'off');
    sync();
  });

  // Browser hanya mengizinkan suara setelah interaksi pertama pengguna
  const firstGesture = (e: Event) => {
    if ((e.target as HTMLElement).closest?.('#music-btn')) return;
    window.removeEventListener('pointerdown', firstGesture);
    window.removeEventListener('keydown', firstGesture);
    if (read() !== 'off' && !music.playing) {
      music.start();
      sync();
    }
  };
  window.addEventListener('pointerdown', firstGesture);
  window.addEventListener('keydown', firstGesture);

  // Lagu utama diam selama di dunia kenangan, lalu lanjut bila tadinya sedang menyala
  let resumeAfterMemory = false;
  return {
    // Efek suara ikut tombol Musik: diam bila pengunjung mematikannya
    soundOn: () => read() !== 'off',
    pauseMusic() {
      resumeAfterMemory = music.playing;
      if (music.playing) music.stop();
      sync();
    },
    resumeMusic() {
      if (resumeAfterMemory) music.start();
      resumeAfterMemory = false;
      sync();
    },
  };
}

export async function init() {
  const canvas = document.getElementById('webgl') as HTMLCanvasElement;
  const hero = document.getElementById('hero')!;
  const loader = document.getElementById('loader')!;
  const openBtn = document.getElementById('open-btn')!;
  const heroEls = hero.querySelectorAll('.hero-reveal');

  let state: 'intro' | 'closed' | 'busy' | 'open' = 'intro';
  let openQueued = false; // klik "Buka Buku" saat intro masih berjalan

  const { soundOn, pauseMusic, resumeMusic } = setupMusic();

  const memory = createMemory({ soundOn, onEnter: pauseMusic, onLeave: resumeMusic });

  const reader = createReader({
    onClose: close,
    onFlip: (duration, volume) => soundOn() && sfx.pageFlip(duration, volume),
    onMemory: (project, from) => {
      const p = projects[project];
      if (p.gallery && p.memory) memory.open(p.gallery, p.memory.logo, from);
    },
    keysBlocked: () => memory.isOpen(),
  });
  // Without WebGL (old phone, GPU blocked) the book still opens, only without the 3D cover.
  const scene: BookScene = await createScene(canvas, { onBookClick: open }).catch((err) => {
    console.warn('3D book unavailable', err);
    canvas.style.display = 'none';
    const done = () => Promise.resolve();
    return { setActive() {}, intro() {}, open: done, close: done };
  });

  async function open() {
    if (state === 'intro') openQueued = true;
    if (state !== 'closed') return;
    state = 'busy';
    document.body.classList.add('opening');
    gsap.to(heroEls, { opacity: 0, y: -12, duration: 0.5, stagger: 0.03, ease: 'power2.in' });
    gsap.set(hero, { visibility: 'hidden', delay: 0.7 });
    if (soundOn()) sfx.bookOpen();
    await scene.open();
    document.body.classList.add('reading');
    reader.show();
    gsap.to(canvas, { opacity: 0, duration: 0.8, delay: 0.2, onComplete: () => scene.setActive(false) });
    state = 'open';
  }

  async function close() {
    if (state !== 'open') return;
    state = 'busy';
    scene.setActive(true);
    gsap.to(canvas, { opacity: 1, duration: 0.4 });
    await reader.hide();
    document.body.classList.remove('reading');
    if (soundOn()) sfx.bookClose();
    await scene.close();
    gsap.set(hero, { visibility: 'visible' });
    document.body.classList.remove('opening');
    gsap.to(heroEls, { opacity: 1, y: 0, duration: 0.8, stagger: 0.06, ease: 'power2.out' });
    state = 'closed';
  }

  openBtn.addEventListener('click', open);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement === document.body) open();
  });

  // Intro
  gsap.set(heroEls, { opacity: 0, y: 18 });
  gsap.to(loader, { opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => loader.remove() });
  scene.intro();
  gsap.to(heroEls, {
    opacity: 1,
    y: 0,
    duration: 1,
    stagger: 0.09,
    delay: 0.9,
    ease: 'power3.out',
    onComplete: () => {
      state = 'closed';
      if (openQueued) open();
    },
  });
}
