import * as THREE from 'three';
import gsap from 'gsap';
import grapeShape from '../data/grape-logo-shape.json';
import mokabiShape from '../data/mokabi-logo-shape.json';
import slarkShape from '../data/slark-logo-shape.json';
import finlyShape from '../data/finly-logo-shape.json';
import kiasShape from '../data/kias-logo-shape.json';
import { sfx } from './sfx';
import { createMusic, MEMORY_THEME } from './music';

// "Perjalanan ke masa lalu": logo pop-up di halaman buku diklik → kunang-kunang berkumpul,
// logo 3D berputar & memancarkan cahaya (evolve) → lorong waktu dengan jam berputar mundur
// → screenshot muncul seperti foto kenangan yang menjadi berwarna, bisa Next/Previous.

export type MemoryImage = { src: string; caption: string };

type LogoShape = { aspect: number; shapes: { outer: number[][]; holes: number[][][] }[] };
type LogoSpec = {
  shape: LogoShape;
  /** PNG berwarna; dipetakan ke muka depan sesuai bentuk hasil pelacakan. */
  texture: string;
  /** Warna sisi tebal hasil extrude. */
  side: number;
  sideGlow: number;
  /** Ketebalan per bentuk (bentuk terakhir dipakai untuk sisanya). */
  depths: number[];
};

// Bentuk dilacak dari kanal alpha PNG logo (lihat komentar di data/portfolio.ts).
const LOGOS = {
  grape: { shape: grapeShape, texture: '/projects/grape/logo.png', side: 0x6d17c4, sideGlow: 0x3a0a78, depths: [0.14, 0.2] },
  mokabi: { shape: mokabiShape, texture: '/projects/mokabi/logo.png', side: 0x7b3fe4, sideGlow: 0x40137f, depths: [0.16] },
  kias: { shape: kiasShape, texture: '/projects/kias/logo.webp', side: 0x9c7a35, sideGlow: 0x3d2a0a, depths: [0.12] },
  finly: { shape: finlyShape, texture: '/projects/finly/logo.webp', side: 0x1466d6, sideGlow: 0x0a3a6e, depths: [0.14, 0.18] },
  slark: { shape: slarkShape, texture: '/projects/slark/logo.webp', side: 0x9e1b1b, sideGlow: 0x3a0808, depths: [0.16] },
} satisfies Record<string, LogoSpec>;

export type MemoryLogo = keyof typeof LOGOS;

const FOV = 35;
const FIREFLIES = 240;
const RINGS = 16;
const RING_GAP = 2.4;
const STREAKS = 260;

type Three = ReturnType<typeof buildScene>;

function radialTexture(stops: [number, string][], size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function raysTexture(size = 1024) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.translate(size / 2, size / 2);
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = 'blur(9px)'; // tepi sinar lembut
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 + Math.random() * 0.1;
    const w = 0.02 + Math.random() * 0.05;
    const len = size * (0.32 + Math.random() * 0.18);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
    g.addColorStop(0, 'rgba(255,240,255,0.75)');
    g.addColorStop(0.45, 'rgba(255,120,235,0.3)');
    g.addColorStop(1, 'rgba(160,60,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a - w) * len, Math.sin(a - w) * len);
    ctx.lineTo(Math.cos(a + w) * len, Math.sin(a + w) * len);
    ctx.closePath();
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Cincin jam: garis menit, angka Romawi, lingkaran ganda. */
function clockTexture(size = 1024) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.translate(size / 2, size / 2);
  ctx.strokeStyle = ctx.fillStyle = '#fff';
  const R = size * 0.47;
  [[R, 8], [R * 0.95, 2], [R * 0.74, 2]].forEach(([r, w]) => {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  for (let i = 0; i < 60; i++) {
    ctx.save();
    ctx.rotate((i / 60) * Math.PI * 2);
    const major = i % 5 === 0;
    ctx.lineWidth = major ? 7 : 2;
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.95);
    ctx.lineTo(0, -R * (major ? 0.88 : 0.92));
    ctx.stroke();
    ctx.restore();
  }
  ctx.font = `600 ${size * 0.06}px Cinzel, Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((n, i) => {
    ctx.save();
    ctx.rotate((i / 12) * Math.PI * 2);
    ctx.fillText(n, 0, -R * 0.81);
    ctx.restore();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 100);

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2, 3, 5);
  const fill = new THREE.PointLight(0xff4fd8, 14, 12, 1.6);
  fill.position.set(-2, -1, 2);
  scene.add(key, fill);

  // ── Logo: bentuk hasil pelacakan, di-extrude; warna dari PNG asli ──
  const whiteMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const logo = new THREE.Group(); // wadah: berisi logo proyek yang sedang dibuka
  scene.add(logo);
  const built = new Map<MemoryLogo, { group: THREE.Group; faceMat: THREE.MeshStandardMaterial }>();

  function buildLogo(key: MemoryLogo) {
    const spec: LogoSpec = LOGOS[key];
    const map = new THREE.TextureLoader().load(spec.texture);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const faceMat = new THREE.MeshStandardMaterial({
      map,
      emissive: 0xffffff,
      emissiveMap: map,
      emissiveIntensity: 0.5,
      roughness: 0.35,
      metalness: 0.15,
    });
    const sideMat = new THREE.MeshStandardMaterial({ color: spec.side, emissive: spec.sideGlow, roughness: 0.3, metalness: 0.55 });
    const group = new THREE.Group();
    const { aspect, shapes } = spec.shape;
    const vec = (pts: number[][]) => pts.map(([u, v]) => new THREE.Vector2(u * aspect, v));
    shapes.forEach((s, i) => {
      const shape = new THREE.Shape(vec(s.outer));
      s.holes.forEach((h) => shape.holes.push(new THREE.Path(vec(h))));
      const depth = spec.depths[Math.min(i, spec.depths.length - 1)];
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth,
        curveSegments: 1,
        bevelEnabled: true,
        bevelThickness: 0.014,
        bevelSize: 0.005,
        bevelSegments: 2,
      });
      // Petakan tekstur sesuai posisi sebenarnya di gambar logo
      const pos = geo.attributes.position;
      const uv = geo.attributes.uv;
      for (let k = 0; k < pos.count; k++) uv.setXY(k, pos.getX(k) / aspect, pos.getY(k));
      geo.translate(-aspect / 2, -0.5, -depth / 2);
      group.add(new THREE.Mesh(geo, [faceMat, sideMat]));
      const glow = new THREE.Mesh(geo, whiteMat);
      glow.renderOrder = 2;
      group.add(glow);
    });
    return { group, faceMat };
  }

  /** Pasang logo proyek ke wadah; dibuat sekali lalu disimpan. */
  function useLogo(key: MemoryLogo) {
    let entry = built.get(key);
    if (!entry) built.set(key, (entry = buildLogo(key)));
    logo.clear();
    logo.add(entry.group);
    return entry.faceMat;
  }

  // ── Cahaya ──
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: radialTexture([
        [0, 'rgba(255,250,255,1)'],
        [0.22, 'rgba(255,140,240,0.75)'],
        [0.55, 'rgba(150,60,255,0.22)'],
        [1, 'rgba(90,0,200,0)'],
      ]),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  );
  halo.renderOrder = -1;
  scene.add(halo);

  const rays = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: raysTexture(),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  );
  rays.renderOrder = -1;
  scene.add(rays);

  // ── Kunang-kunang ──
  const fly = new THREE.BufferGeometry();
  const flyPos = new Float32Array(FIREFLIES * 3);
  const phase = new Float32Array(FIREFLIES);
  const sizes = new Float32Array(FIREFLIES);
  for (let i = 0; i < FIREFLIES; i++) {
    flyPos[i * 3] = THREE.MathUtils.randFloatSpread(7);
    flyPos[i * 3 + 1] = THREE.MathUtils.randFloatSpread(4.4);
    flyPos[i * 3 + 2] = THREE.MathUtils.randFloat(-2, 1.4);
    phase[i] = Math.random();
    sizes[i] = THREE.MathUtils.randFloat(0.5, 1.5);
  }
  fly.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
  fly.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  fly.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const flyMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uGather: { value: 0 },
      uBurst: { value: 0 },
      uOpacity: { value: 0 },
      uSize: { value: 40 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime, uGather, uBurst, uSize;
      attribute float aPhase, aSize;
      varying float vTwinkle;
      varying float vPhase;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.5 + aPhase * 6.28) * 0.35;
        p.y += cos(uTime * 0.4 + aPhase * 9.0) * 0.3;
        p.z += sin(uTime * 0.3 + aPhase * 4.0) * 0.25;
        float a = aPhase * 6.283 + uTime * (0.8 + uGather * 3.2);
        float r = mix(1.3, 0.62, uGather) * (0.8 + 0.45 * fract(aPhase * 7.0));
        vec3 orbit = vec3(cos(a) * r, sin(a) * r, sin(a * 2.0 + aPhase * 6.0) * 0.3);
        p = mix(p, orbit, smoothstep(0.0, 1.0, uGather));
        p += normalize(p + 0.001) * uBurst * (2.0 + aPhase * 5.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vPhase = aPhase;
        vTwinkle = 0.3 + 0.7 * pow(0.5 + 0.5 * sin(uTime * (2.0 + aPhase * 3.0) + aPhase * 40.0), 2.0);
        gl_PointSize = uSize * aSize * (1.0 + uGather * 0.4) / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity, uGather;
      varying float vTwinkle;
      varying float vPhase;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float core = exp(-d * d * 14.0);
        float glow = exp(-d * d * 3.0) * 0.5;
        vec3 warm = mix(vec3(1.0, 0.9, 0.42), vec3(0.72, 1.0, 0.45), step(0.6, vPhase));
        vec3 col = mix(warm, vec3(1.0, 0.45, 0.95), uGather * 0.8);
        float a = (core + glow) * smoothstep(1.0, 0.7, d) * vTwinkle * uOpacity;
        gl_FragColor = vec4(col * (1.0 + core), a);
      }
    `,
  });
  const flies = new THREE.Points(fly, flyMat);
  flies.frustumCulled = false;
  flies.renderOrder = 3;
  scene.add(flies);

  // ── Lorong waktu: cincin jam & garis cahaya ──
  const tunnel = new THREE.Group();
  tunnel.visible = false;
  const clockMap = clockTexture();
  const handGeoH = new THREE.PlaneGeometry(0.018, 0.27).translate(0, 0.135, 0);
  const handGeoM = new THREE.PlaneGeometry(0.01, 0.4).translate(0, 0.2, 0);
  const rings: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; spin: number; hands: THREE.Mesh[] }[] = [];
  for (let i = 0; i < RINGS; i++) {
    const mat = new THREE.MeshBasicMaterial({
      map: clockMap,
      color: i % 3 === 0 ? 0xffd27a : 0xc98a3a,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.scale.setScalar(2.6 + (i % 4) * 0.7);
    mesh.position.z = -i * RING_GAP;
    const hands: THREE.Mesh[] = [];
    if (i % 2 === 0) {
      [handGeoH, handGeoM].forEach((g) => {
        const h = new THREE.Mesh(g, mat);
        h.position.z = 0.001;
        mesh.add(h);
        hands.push(h);
      });
    }
    tunnel.add(mesh);
    rings.push({ mesh, mat, spin: 0.7 + (i % 3) * 0.45, hands });
  }
  const streakPos = new Float32Array(STREAKS * 6);
  const streakData = Array.from({ length: STREAKS }, () => {
    const a = Math.random() * Math.PI * 2;
    const r = THREE.MathUtils.randFloat(0.7, 3);
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, z: -Math.random() * RINGS * RING_GAP, len: THREE.MathUtils.randFloat(0.3, 1.8) };
  });
  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
  const streakMat = new THREE.LineBasicMaterial({
    color: 0xffdf9e,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  const streaks = new THREE.LineSegments(streakGeo, streakMat);
  streaks.frustumCulled = false;
  tunnel.add(streaks);
  scene.add(tunnel);

  return { renderer, scene, camera, logo, useLogo, whiteMat, halo, rays, flies, flyMat, tunnel, rings, streakData, streakPos, streakGeo, streakMat };
}

export function createMemory(opts: {
  soundOn: () => boolean;
  /** Masuk dunia kenangan: lagu utama perlu diam. */
  onEnter: () => void;
  /** Kembali ke masa kini: lagu utama boleh menyala lagi. */
  onLeave: () => void;
}) {
  const ambience = createMusic({ volume: 0.55, theme: MEMORY_THEME });
  const $ =<T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const root = $('memory');
  const stage = $('memory-stage');
  const flash = $('memory-flash');
  const whisper = $('memory-whisper');
  const viewer = $('memory-viewer');
  const photo = $('memory-photo');
  const img = $<HTMLImageElement>('memory-img');
  const count = $('memory-count');
  const caption = $('memory-caption');
  const prevBtn = $<HTMLButtonElement>('memory-prev');
  const nextBtn = $<HTMLButtonElement>('memory-next');
  const skipBtn = $<HTMLButtonElement>('memory-skip');
  const closeBtn = $<HTMLButtonElement>('memory-close');

  const canvas = document.createElement('canvas');
  canvas.className = 'memory-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t3: Three | null = null;
  let webglFailed = false;
  let raf = 0;
  let last = 0;
  let time = 0;
  let host: HTMLElement | null = null;
  let isOpen = false;
  let sequence: gsap.core.Timeline | null = null;
  let images: MemoryImage[] = [];
  let faceMat: THREE.MeshStandardMaterial | null = null;
  let index = 0;
  let returnFocus: HTMLElement | null = null;

  const fx = {
    spin: 0,
    sway: 1,
    glow: 0.5,
    white: 0,
    halo: 0,
    haloSize: 1.6,
    rays: 0,
    raysSize: 2.2,
    gather: 0,
    burst: 0,
    flies: 0,
    logo: 1,
    tunnel: 0,
    speed: 0,
    clock: 0,
  };
  const FX_REST = { ...fx };

  const sound = (play: () => void) => {
    if (opts.soundOn()) play();
  };

  function ensure3D() {
    if (t3 || webglFailed) return t3;
    try {
      t3 = buildScene(canvas);
    } catch {
      webglFailed = true;
    }
    return t3;
  }

  function fit() {
    if (!t3 || !host) return;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    t3.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    t3.renderer.setSize(w, h, false);
    t3.camera.aspect = w / h;
    t3.camera.updateProjectionMatrix();
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const span = 2.1; // tinggi area terlihat; logo tetap muat di layar sempit
    t3.camera.position.set(0, 0, Math.max(span / (2 * tan), (span * 0.8) / (2 * tan * t3.camera.aspect)));
    t3.flyMat.uniforms.uSize.value = 44 * t3.renderer.getPixelRatio() * (h / 900);
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (!t3) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;

    const { logo, whiteMat, halo, rays, flyMat, tunnel, rings } = t3;
    logo.visible = fx.logo > 0.01;
    logo.scale.setScalar(fx.logo);
    logo.position.y = Math.sin(time * 0.9) * 0.025 * fx.sway;
    logo.rotation.x = Math.sin(time * 0.6) * 0.07 * fx.sway;
    if (fx.spin > 0) logo.rotation.y += fx.spin * dt;
    else logo.rotation.y = Math.sin(time * 0.55) * 0.55;
    if (faceMat) faceMat.emissiveIntensity = fx.glow;
    whiteMat.opacity = fx.white;

    (halo.material as THREE.SpriteMaterial).opacity = fx.halo;
    halo.scale.setScalar(fx.haloSize * (1 + Math.sin(time * 5) * 0.03));
    (rays.material as THREE.MeshBasicMaterial).opacity = fx.rays;
    rays.scale.setScalar(fx.raysSize);
    rays.rotation.z -= dt * (0.35 + fx.spin * 0.05);

    flyMat.uniforms.uTime.value = time;
    flyMat.uniforms.uGather.value = fx.gather;
    flyMat.uniforms.uBurst.value = fx.burst;
    flyMat.uniforms.uOpacity.value = fx.flies;

    tunnel.visible = fx.tunnel > 0.001;
    if (tunnel.visible) {
      const camZ = t3.camera.position.z;
      const span = RINGS * RING_GAP;
      for (const r of rings) {
        r.mesh.position.z += fx.speed * dt;
        if (r.mesh.position.z > camZ) r.mesh.position.z -= span;
        if (r.mesh.position.z < camZ - span) r.mesh.position.z += span;
        r.mesh.rotation.z += r.spin * fx.clock * dt; // positif = berlawanan arah jarum jam (mundur)
        const [hourH, minuteH] = r.hands;
        if (hourH) {
          hourH.rotation.z += fx.clock * dt * 0.8;
          minuteH.rotation.z += fx.clock * dt * 4;
        }
        const d = camZ - r.mesh.position.z;
        r.mat.opacity = fx.tunnel * THREE.MathUtils.smoothstep(d, 0.3, 2.2) * (1 - THREE.MathUtils.smoothstep(d, span * 0.55, span));
      }
      t3.streakData.forEach((s, i) => {
        s.z += fx.speed * 1.25 * dt;
        if (s.z > camZ) s.z -= span;
        if (s.z < camZ - span) s.z += span;
        const stretch = s.len * (0.3 + Math.abs(fx.speed) * 0.09);
        t3!.streakPos.set([s.x, s.y, s.z, s.x, s.y, s.z - stretch], i * 6);
      });
      t3.streakGeo.attributes.position.needsUpdate = true;
      t3.streakMat.opacity = fx.tunnel * 0.75;
    }

    t3.renderer.render(t3.scene, t3.camera);
  }

  const startLoop = () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stopLoop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  function attach(target: HTMLElement) {
    if (!ensure3D()) return false;
    host = target;
    target.appendChild(canvas);
    fit();
    startLoop();
    return true;
  }

  window.addEventListener('resize', fit);

  // ── Foto kenangan ─────────────────────────────────────
  function show(i: number, dir: number) {
    index = i;
    gsap.killTweensOf(photo);
    img.onload = () => photo.classList.toggle('is-tall', img.naturalHeight > img.naturalWidth * 1.2);
    img.src = images[i].src;
    img.alt = images[i].caption;
    caption.textContent = images[i].caption;
    count.textContent = `Memory ${i + 1} of ${images.length}`;
    prevBtn.disabled = i === 0;
    const atEnd = i === images.length - 1;
    nextBtn.textContent = atEnd ? 'Back to the present' : 'Next memory ›';
    sound(() => sfx.memory());
    if (reduced) return;
    gsap.fromTo(flash, { opacity: 0.45 }, { opacity: 0, duration: 0.7, ease: 'power2.out' });
    gsap.fromTo(
      photo,
      { opacity: 0, scale: 1.045, x: dir * 34, rotate: dir * 1.2, filter: 'sepia(1) blur(9px) brightness(1.6) contrast(0.8)' },
      { opacity: 1, scale: 1, x: 0, rotate: 0, filter: 'sepia(0) blur(0px) brightness(1) contrast(1)', duration: 1.5, ease: 'power2.out' },
    );
    gsap.fromTo([count, caption], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.7, delay: 0.5, stagger: 0.1 });
  }

  function enterViewer() {
    sequence?.kill();
    sequence = null;
    root.dataset.stage = 'viewer';
    skipBtn.hidden = true;
    whisper.textContent = '';
    gsap.killTweensOf(fx);
    Object.assign(fx, FX_REST, { logo: 0, flies: 0.55, sway: 0, spin: 0.01 });
    if (t3) t3.tunnel.visible = false;
    gsap.set(stage, { filter: 'sepia(0.75) brightness(0.8)' });
    viewer.hidden = false;
    closeBtn.hidden = false;
    sound(() => ambience.start()); // musik dunia kenangan
    show(0, 0);
    nextBtn.focus();
  }

  function finishClose() {
    sequence?.kill();
    sequence = null;
    gsap.killTweensOf([fx, flash, photo, count, caption, root, stage]);
    Object.assign(fx, FX_REST);
    if (t3) {
      t3.logo.rotation.set(0, 0, 0);
      t3.flyMat.uniforms.uBurst.value = 0;
    }
    gsap.set(stage, { clearProps: 'filter' });
    gsap.set(flash, { opacity: 0 });
    root.hidden = true;
    root.dataset.stage = 'closed';
    hideViewer();
    img.removeAttribute('src');
    isOpen = false;
    if (ambience.playing) ambience.stop();
    sound(() => sfx.arrive());
    opts.onLeave();
    stopLoop();
    canvas.remove();
    host = null;
    returnFocus?.focus();
  }

  // Foto harus benar-benar hilang sebelum style pudarnya dihapus, agar tidak menimpa lorong waktu
  function hideViewer() {
    viewer.hidden = true;
    gsap.set(viewer, { clearProps: 'opacity,scale,transform' });
  }

  function back() {
    if (!isOpen || root.dataset.stage === 'returning') return;
    if (reduced || !t3 || root.dataset.stage !== 'viewer') return finishClose();
    root.dataset.stage = 'returning';
    if (ambience.playing) ambience.stop();
    sound(() => sfx.timeWarp(1.1));
    gsap.killTweensOf(photo);
    gsap
      .timeline({ onComplete: finishClose })
      .to(viewer, { opacity: 0, scale: 0.94, duration: 0.3, ease: 'power2.in', onComplete: hideViewer }, 0)
      .to(fx, { flies: 0, duration: 0.3 }, 0)
      .to(fx, { tunnel: 1, duration: 0.3 }, 0.1)
      .fromTo(fx, { speed: 4, clock: -2 }, { speed: -26, clock: -9, duration: 1.1, ease: 'power2.in' }, 0.1)
      .to(flash, { opacity: 1, duration: 0.25, ease: 'power2.in' }, 1.0)
      .to(root, { opacity: 0, duration: 0.4 }, 1.25)
      .set(root, { clearProps: 'opacity' });
  }

  function open(list: MemoryImage[], logoKey: MemoryLogo, from: HTMLElement) {
    if (isOpen || !list.length) return;
    isOpen = true;
    images = list;
    returnFocus = from;
    list.forEach((m) => {
      new Image().src = m.src; // muat lebih dulu agar foto langsung tampil
    });
    root.hidden = false;
    viewer.hidden = true;
    closeBtn.hidden = true;
    skipBtn.hidden = false;
    root.dataset.stage = 'evolve';
    opts.onEnter();
    sound(() => sfx.logoTouch());

    if (reduced || !attach(stage)) {
      gsap.set(root, { opacity: 1 });
      return enterViewer();
    }
    faceMat = t3!.useLogo(logoKey);
    skipBtn.focus();

    const say = (text: string) =>
      gsap.fromTo(whisper, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, onStart: () => void (whisper.textContent = text) });

    Object.assign(fx, FX_REST, { sway: 0.4, spin: 0.5 });
    sound(() => sfx.evolve(3.4));

    const pulses = [0.55, 0.05, 0.8, 0.1, 1, 0.2, 1, 0.3, 1];
    const tl = gsap.timeline({ onComplete: enterViewer });
    sequence = tl;
    tl.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0)
      .to(fx, { flies: 1, duration: 1, ease: 'power1.out' }, 0.2)
      .add(say('The fireflies remember…'), 0.4)
      // Kunang-kunang berkumpul, logo makin cepat & makin terang
      .to(fx, { gather: 1, duration: 2.4, ease: 'power2.inOut' }, 0.9)
      .to(fx, { spin: 16, duration: 2.5, ease: 'power3.in' }, 0.9)
      .to(fx, { glow: 2.2, duration: 2.5, ease: 'power2.in' }, 0.9)
      .to(fx, { halo: 0.85, haloSize: 2.8, duration: 2.5, ease: 'power2.in' }, 0.9)
      .to(fx, { rays: 0.7, raysSize: 3.8, duration: 2.1, ease: 'power2.in' }, 1.3)
      .add(say('…and the light opens a door to the past.'), 2.0);
    // Denyut putih seperti evolve, makin lama makin rapat
    let at = 1.3;
    pulses.forEach((v, i) => {
      const d = Math.max(0.09, 0.3 - i * 0.026);
      tl.to(fx, { white: v, duration: d, ease: 'sine.inOut' }, at);
      at += d;
    });
    // Ledakan cahaya → masuk lorong waktu
    tl.addLabel('burst', 3.45)
      .call(() => {
        root.dataset.stage = 'tunnel';
        whisper.textContent = '';
        gsap.set(whisper, { opacity: 0 });
        sound(() => sfx.timeWarp(2.3));
      }, undefined, 'burst')
      .to(flash, { opacity: 1, duration: 0.14, ease: 'power2.in' }, 'burst')
      .to(fx, { white: 1, burst: 1, duration: 0.14 }, 'burst')
      .set(fx, { logo: 0, halo: 0, rays: 0, flies: 0, burst: 0, gather: 0, tunnel: 1, speed: 3, clock: 2 }, 'burst+=0.16')
      .set(stage, { filter: 'sepia(0.9) saturate(1.3) brightness(1.1)' }, 'burst+=0.16')
      .to(flash, { opacity: 0, duration: 0.5, ease: 'power2.out' }, 'burst+=0.17')
      .add(say('Going back in time…'), 'burst+=0.3')
      .to(fx, { speed: 34, clock: 11, duration: 2, ease: 'power2.in' }, 'burst+=0.16')
      .to(flash, { opacity: 1, duration: 0.3, ease: 'power2.in' }, 'burst+=1.95')
      .set({}, {}, 'burst+=2.3');
  }

  // ── Kontrol ───────────────────────────────────────────
  prevBtn.addEventListener('click', () => {
    if (index > 0) show(index - 1, -1);
  });
  nextBtn.addEventListener('click', () => {
    if (index < images.length - 1) show(index + 1, 1);
    else back();
  });
  skipBtn.addEventListener('click', enterViewer);
  closeBtn.addEventListener('click', back);

  window.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      if (root.dataset.stage === 'viewer') back();
      else if (root.dataset.stage !== 'returning') enterViewer();
    } else if (root.dataset.stage === 'viewer') {
      if (e.key === 'ArrowRight' && index < images.length - 1) show(index + 1, 1);
      else if (e.key === 'ArrowLeft' && index > 0) show(index - 1, -1);
    }
  });

  return { open, isOpen: () => isOpen };
}
