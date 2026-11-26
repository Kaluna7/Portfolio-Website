import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import * as T from './textures';

// Ukuran buku (unit dunia)
const W = 3.1; // lebar sampul
const H = 4.2; // tinggi sampul
const C = 0.06; // tebal sampul
const PW = 3.0; // lebar kertas
const PH = 4.05; // tinggi kertas
const PD = 0.45; // tebal tumpukan kertas
const SPINE_X = -PW / 2;
const FOV = 35;
export const SINGLE_QUERY = '(max-width: 820px)';

type Vec = { x: number; y: number; z: number };
type Layout = { pos: Vec; rot: Vec; cam: Vec };

export type BookScene = {
  setActive(v: boolean): void;
  intro(): void;
  open(): Promise<unknown>;
  close(): Promise<unknown>;
};

// Phones and small laptops: fewer pixels, smaller textures, less dust.
const nav = navigator as Navigator & { deviceMemory?: number };
export const LOW_POWER =
  window.matchMedia('(pointer: coarse)').matches ||
  (nav.deviceMemory ?? 8) <= 4 ||
  (navigator.hardwareConcurrency ?? 8) <= 4;

export async function createScene(canvas: HTMLCanvasElement, opts: { onBookClick: () => void }): Promise<BookScene> {
  await T.loadFonts();
  T.setTextureScale(LOW_POWER ? 0.5 : 1);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !LOW_POWER,
    alpha: true,
    powerPreference: LOW_POWER ? 'default' : 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, LOW_POWER ? 1.5 : 2));

  // If the phone takes the GPU away (memory, app switch), show the dark page instead of a broken
  // canvas, and come back when the browser gives it back.
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    canvas.style.visibility = 'hidden';
  });
  canvas.addEventListener('webglcontextrestored', () => {
    canvas.style.visibility = '';
  });
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environmentIntensity = 0.45;

  const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 100);

  // ── Cahaya ──────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffe6c7, 0.35));
  const key = new THREE.DirectionalLight(0xffd7a1, 2.4);
  key.position.set(-4, 5, 6);
  const rim = new THREE.DirectionalLight(0x7f9cff, 1.1);
  rim.position.set(5, 2, -4);
  const candle = new THREE.PointLight(0xff9a4a, 5, 14, 1.6);
  candle.position.set(2.5, -1.5, 3.2);
  scene.add(key, rim, candle);

  // ── Material ────────────────────────────────────────────
  const aniso = Math.min(renderer.capabilities.getMaxAnisotropy(), LOW_POWER ? 2 : 8);
  const tex = (c: HTMLCanvasElement, srgb = true) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
  };

  const cover = T.coverCanvases();
  const metalTex = tex(cover.metal, false);
  const coverMat = new THREE.MeshStandardMaterial({
    map: tex(cover.color),
    roughnessMap: tex(cover.rough, false),
    metalnessMap: metalTex,
    bumpMap: metalTex,
    bumpScale: 1.2,
    roughness: 1,
    metalness: 1,
  });
  const leatherMat = new THREE.MeshStandardMaterial({ map: tex(T.leatherCanvas()), roughness: 0.72, metalness: 0.05 });
  const spineMat = new THREE.MeshStandardMaterial({ map: tex(T.spineCanvas()), roughness: 0.6, metalness: 0.25 });
  const endMat = new THREE.MeshStandardMaterial({ map: tex(T.endpaperCanvas()), roughness: 0.85 });
  const firstPageMat = new THREE.MeshStandardMaterial({ map: tex(T.firstPageCanvas()), roughness: 0.95 });
  const paperMat = new THREE.MeshStandardMaterial({ map: tex(T.parchmentCanvas()), roughness: 0.95 });
  const edgeSideMat = new THREE.MeshStandardMaterial({ map: tex(T.pageEdgeCanvas('v')), roughness: 0.9 });
  const edgeTopMat = new THREE.MeshStandardMaterial({ map: tex(T.pageEdgeCanvas('h')), roughness: 0.9 });

  // ── Buku ────────────────────────────────────────────────
  // root: dikendalikan GSAP · floatG: melayang & parallax mouse
  const root = new THREE.Group();
  const floatG = new THREE.Group();
  root.add(floatG);
  scene.add(root);

  const pages = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, PD), [
    edgeSideMat,
    edgeSideMat,
    edgeTopMat,
    edgeTopMat,
    firstPageMat,
    paperMat,
  ]);
  floatG.add(pages);

  const coverGeo = new RoundedBoxGeometry(W, H, C, 2, 0.02);
  const back = new THREE.Mesh(coverGeo, [leatherMat, leatherMat, leatherMat, leatherMat, endMat, leatherMat]);
  back.position.set(SPINE_X + W / 2, 0, -(PD / 2 + C / 2));
  floatG.add(back);

  const spine = new THREE.Mesh(new RoundedBoxGeometry(C, H, PD + C * 2, 2, 0.02), [
    leatherMat,
    spineMat,
    leatherMat,
    leatherMat,
    leatherMat,
    leatherMat,
  ]);
  spine.position.set(SPINE_X - C / 2, 0, 0);
  floatG.add(spine);

  // Sampul depan berputar pada engsel di punggung buku
  const pivot = new THREE.Group();
  pivot.position.set(SPINE_X, 0, PD / 2 + C / 2 + 0.002);
  const front = new THREE.Mesh(coverGeo, [leatherMat, leatherMat, leatherMat, leatherMat, coverMat, endMat]);
  front.position.x = W / 2;
  pivot.add(front);
  floatG.add(pivot);

  // ── Debu emas ──────────────────────────────────────────
  const N = LOW_POWER ? 140 : 380;
  const dustPos = new Float32Array(N * 3);
  const dustSpeed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    dustPos[i * 3] = THREE.MathUtils.randFloat(-10, 10);
    dustPos[i * 3 + 1] = THREE.MathUtils.randFloat(-6, 6);
    dustPos[i * 3 + 2] = THREE.MathUtils.randFloat(-6, 3);
    dustSpeed[i] = THREE.MathUtils.randFloat(0.002, 0.008);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    size: 0.07,
    map: tex(T.dustSprite()),
    color: 0xf3cf7a,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.Points(dustGeo, dustMat));

  // ── Tata letak ─────────────────────────────────────────
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const isSingle = () => window.matchMedia(SINGLE_QUERY).matches;

  function idleLayout(): Layout {
    const aspect = window.innerWidth / window.innerHeight;
    const wide = aspect > 1.05;
    const dH = H / (wide ? 0.7 : 0.5) / (2 * tanHalf);
    const dW = W / (wide ? 0.36 : 0.66) / (2 * tanHalf * aspect);
    const dist = Math.max(dH, dW);
    const visH = 2 * tanHalf * dist;
    const visW = visH * aspect;
    return {
      pos: { x: wide ? Math.min(visW * 0.19, visH * 0.36) : 0, y: wide ? visH * 0.015 : -visH * 0.035, z: 0 },
      rot: { x: -0.08, y: wide ? 0.32 : 0.42, z: 0.04 },
      cam: { x: 0, y: 0.15, z: dist },
    };
  }

  // Zoom hingga buku memenuhi layar (cocok dengan ukuran buku HTML)
  function openLayout(single: boolean): Layout {
    const aspect = window.innerWidth / window.innerHeight;
    const w = single ? W : W * 2;
    const mh = single ? 0.76 : 0.8;
    const mw = single ? 0.9 : 0.92;
    const dist = Math.max(H / mh / (2 * tanHalf), w / mw / (2 * tanHalf * aspect)) + PD / 2 + C;
    return {
      pos: { x: single ? -(W - PW) / 2 : -SPINE_X, y: 0, z: 0 },
      rot: { x: 0, y: 0, z: 0 },
      cam: { x: 0, y: 0, z: dist },
    };
  }

  function apply(L: Layout) {
    root.position.set(L.pos.x, L.pos.y, L.pos.z);
    root.rotation.set(L.rot.x, L.rot.y, L.rot.z);
    camera.position.set(L.cam.x, L.cam.y, L.cam.z);
  }

  // ── Interaksi ──────────────────────────────────────────
  let mode: 'closed' | 'busy' | 'open' = 'busy';
  const params = { float: 1, peek: 0 };
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  let pointerActive = false;
  let hovered = false;

  const hitBook = (x: number, y: number) => {
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    return raycaster.intersectObject(floatG, true).length > 0;
  };

  window.addEventListener('pointermove', (e) => {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    pointerActive = e.pointerType === 'mouse';
  });
  canvas.addEventListener('click', (e) => {
    if (mode !== 'closed') return;
    if (hitBook((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)) opts.onBookClick();
  });

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    if (mode === 'closed') apply(idleLayout());
    else if (mode === 'open') apply(openLayout(isSingle()));
  });

  // ── Loop render ────────────────────────────────────────
  const clock = new THREE.Clock();
  const origin = new THREE.Vector3();
  let active = true; // dimatikan saat buku HTML menutupi kanvas
  renderer.setAnimationLoop(() => {
    if (!active) return;
    const t = clock.getElapsedTime();

    hovered = mode === 'closed' && pointerActive && hitBook(pointer.x, pointer.y);
    canvas.style.cursor = hovered ? 'pointer' : '';
    params.peek += ((hovered ? 1 : 0) - params.peek) * 0.08;
    if (mode === 'closed') pivot.rotation.y = -0.22 * params.peek;

    const f = params.float;
    const px = pointerActive ? pointer.x : 0;
    const py = pointerActive ? pointer.y : 0;
    floatG.position.y = (Math.sin(t * 0.9) * 0.07 + params.peek * 0.08) * f;
    floatG.rotation.x += (-py * 0.12 * f - floatG.rotation.x) * 0.05;
    floatG.rotation.y += (px * 0.22 * f - floatG.rotation.y) * 0.05;
    floatG.rotation.z = Math.sin(t * 0.6) * 0.015 * f;

    candle.intensity = 5 + Math.sin(t * 7.3) * 0.6 + Math.sin(t * 13.1) * 0.4;

    for (let i = 0; i < N; i++) {
      dustPos[i * 3] += Math.sin(t * 0.3 + i) * 0.0015;
      dustPos[i * 3 + 1] += dustSpeed[i];
      if (dustPos[i * 3 + 1] > 6) dustPos[i * 3 + 1] = -6;
    }
    dustGeo.attributes.position.needsUpdate = true;

    camera.lookAt(origin);
    renderer.render(scene, camera);
  });

  return {
    setActive(v: boolean) {
      active = v;
    },

    intro() {
      const L = idleLayout();
      apply(L);
      gsap
        .timeline({ onComplete: () => void (mode = 'closed') })
        .from(root.position, { y: L.pos.y - 5, duration: 2.2, ease: 'power3.out' }, 0)
        .from(root.rotation, { x: 0.6, y: L.rot.y + Math.PI * 1.2, duration: 2.6, ease: 'power3.out' }, 0)
        .from(camera.position, { z: L.cam.z + 4, duration: 2.6, ease: 'power2.out' }, 0)
        .from(dustMat, { opacity: 0, duration: 2 }, 0.3);
    },

    open() {
      mode = 'busy';
      const L = openLayout(isSingle());
      return gsap
        .timeline({ defaults: { ease: 'power3.inOut' }, onComplete: () => void (mode = 'open') })
        .to(params, { float: 0, peek: 0, duration: 1.2 }, 0)
        .to(root.rotation, { ...L.rot, duration: 1.4 }, 0)
        .to(root.position, { ...L.pos, duration: 1.8 }, 0.15)
        .to(pivot.rotation, { y: -Math.PI, duration: 1.9, ease: 'power2.inOut' }, 0.5)
        .to(camera.position, { ...L.cam, duration: 2.1 }, 0.6)
        .to(dustMat, { opacity: 0.25, duration: 1.6 }, 0.4)
        .then();
    },

    close() {
      mode = 'busy';
      const L = idleLayout();
      return gsap
        .timeline({ defaults: { ease: 'power3.inOut' }, onComplete: () => void (mode = 'closed') })
        .to(camera.position, { ...L.cam, duration: 1.9 }, 0)
        .to(pivot.rotation, { y: 0, duration: 1.6, ease: 'power2.inOut' }, 0.15)
        .to(root.position, { ...L.pos, duration: 1.8 }, 0.35)
        .to(root.rotation, { ...L.rot, duration: 1.8 }, 0.45)
        .to(params, { float: 1, duration: 1.2 }, 1)
        .to(dustMat, { opacity: 0.85, duration: 1.5 }, 0.6)
        .then();
    },
  };
}
