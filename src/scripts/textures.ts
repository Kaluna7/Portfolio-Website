import { chapters, profile } from '../data/portfolio';
import { EMBLEM } from './emblem';

type Ctx = CanvasRenderingContext2D;
type Layer = 'color' | 'rough' | 'metal';

const INK = '#2a1a10';
const INK_SOFT = '#5d4632';
const GOLD_DEEP = '#8a6a2a';
const WINE = '#6b1d22';

export async function loadFonts() {
  const faces = [
    '400 120px "Great Vibes"',
    '700 60px "Dancing Script"',
    '600 60px "Cinzel"',
    '500 60px "Cinzel"',
    '700 60px "Kalam"',
  ];
  const all = Promise.all(faces.map((f) => document.fonts.load(f, 'Aa'))).catch(() => undefined);
  await Promise.race([all, new Promise((r) => setTimeout(r, 4000))]);
}

// Phones get smaller textures: the full set is too much memory for a phone GPU.
let textureScale = 1;
export function setTextureScale(s: number) {
  textureScale = s;
}

// Drawing code keeps using full size coordinates; the canvas itself is scaled.
function make(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  const s = w <= 64 ? 1 : textureScale;
  c.width = Math.round(w * s);
  c.height = Math.round(h * s);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.scale(c.width / w, c.height / h);
  return [c, ctx];
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function grain(ctx: Ctx, _w: number, _h: number, amount: number) {
  const img = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function leather(ctx: Ctx, w: number, h: number, base = '#4b151a') {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    const x = rand(0, w);
    const y = rand(0, h);
    const r = rand(w * 0.05, w * 0.3);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, Math.random() < 0.6 ? 'rgba(20,4,6,0.2)' : 'rgba(150,60,50,0.1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i < (w * h) / 900; i++) {
    const x = rand(0, w);
    const y = rand(0, h);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rand(-14, 14), y + rand(-14, 14));
    ctx.stroke();
  }
  grain(ctx, w, h, 22);
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

function parchment(ctx: Ctx, w: number, h: number) {
  ctx.fillStyle = '#e6d3ab';
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, Math.max(w, h) * 0.7);
  g.addColorStop(0, '#f5ead0');
  g.addColorStop(0.6, '#ecdcb9');
  g.addColorStop(1, '#d6bf90');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 14; i++) {
    const x = rand(0, w);
    const y = rand(0, h);
    const r = rand(40, 220);
    const s = ctx.createRadialGradient(x, y, 0, x, y, r);
    s.addColorStop(0, 'rgba(150,105,45,0.07)');
    s.addColorStop(1, 'rgba(150,105,45,0)');
    ctx.fillStyle = s;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  grain(ctx, w, h, 12);
}

function goldGradient(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  const stops: [number, string][] = [
    [0, '#7a5a22'],
    [0.22, '#e6c46f'],
    [0.4, '#a17a2c'],
    [0.55, '#fbe6a2'],
    [0.72, '#b48c3b'],
    [1, '#6d4e1b'],
  ];
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function spaced(ctx: Ctx, text: string, x: number, y: number, spacing: number) {
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = `${spacing}px`;
    ctx.fillText(text, x + spacing / 2, y);
    ctx.letterSpacing = '0px';
  } else {
    (ctx as Ctx).fillText(text, x, y);
  }
}

/** Satu pita meander (kunci Yunani) sepanjang sumbu x, tinggi `band`. */
function meanderBand(ctx: Ctx, length: number, band: number) {
  const n = Math.max(1, Math.round(length / (band * 1.6)));
  const s = length / n;
  ctx.lineWidth = band * 0.1;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(0, band * 0.92);
  ctx.lineTo(length, band * 0.92);
  for (let i = 0; i < n; i++) {
    const x = i * s;
    ctx.moveTo(x + s * 0.1, band * 0.92);
    ctx.lineTo(x + s * 0.1, band * 0.08);
    ctx.lineTo(x + s * 0.9, band * 0.08);
    ctx.lineTo(x + s * 0.9, band * 0.7);
    ctx.lineTo(x + s * 0.34, band * 0.7);
    ctx.lineTo(x + s * 0.34, band * 0.32);
    ctx.lineTo(x + s * 0.66, band * 0.32);
    ctx.lineTo(x + s * 0.66, band * 0.5);
  }
  ctx.stroke();
}

function meanderFrame(ctx: Ctx, inset: number, band: number, w: number, h: number) {
  const sides: [number, number, number, number][] = [
    [inset, inset, 0, w - 2 * inset],
    [w - inset, inset, Math.PI / 2, h - 2 * inset],
    [w - inset, h - inset, Math.PI, w - 2 * inset],
    [inset, h - inset, -Math.PI / 2, h - 2 * inset],
  ];
  for (const [x, y, r, len] of sides) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r);
    meanderBand(ctx, len, band);
    ctx.restore();
  }
}

/**
 * Emblem pena bulu & buku (lihat emblem.ts) berpusat di (cx, cy), `scale` × 200px.
 * `panel` = warna isi halaman buku & bulu pena.
 */
function emblem(ctx: Ctx, cx: number, cy: number, scale: number, ink: string | CanvasGradient, panel: string) {
  ctx.save();
  ctx.translate(cx - 100 * scale, cy - 100 * scale);
  ctx.scale(scale, scale);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.save();
  ctx.fillStyle = panel;
  for (const d of EMBLEM.panels) ctx.fill(new Path2D(d));
  ctx.restore();
  for (const [d, width] of EMBLEM.strokes) {
    ctx.lineWidth = width;
    ctx.stroke(new Path2D(d));
  }
  for (const d of EMBLEM.fills) ctx.fill(new Path2D(d));
  for (const [x, y, r] of EMBLEM.dots) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function divider(ctx: Ctx, x: number, y: number, len: number) {
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - len / 2, y);
  ctx.lineTo(x - 20, y);
  ctx.moveTo(x + 20, y);
  ctx.lineTo(x + len / 2, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - 11);
  ctx.lineTo(x + 11, y);
  ctx.lineTo(x, y + 11);
  ctx.lineTo(x - 11, y);
  ctx.closePath();
  ctx.fill();
}

function diamond(ctx: Ctx, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x, y + s);
  ctx.lineTo(x - s, y);
  ctx.closePath();
  ctx.fill();
}

function coverLayer(layer: Layer) {
  const w = 1024;
  const h = 1388;
  const [c, ctx] = make(w, h);
  if (layer === 'color') leather(ctx, w, h);
  else {
    ctx.fillStyle = layer === 'rough' ? '#bdbdbd' : '#000';
    ctx.fillRect(0, 0, w, h);
  }

  const gold = layer === 'color' ? goldGradient(ctx, 0, 0, w, h) : layer === 'rough' ? '#4a4a4a' : '#fff';
  ctx.fillStyle = gold;
  ctx.strokeStyle = gold;
  if (layer === 'color') {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
  }

  ctx.lineWidth = 8;
  ctx.strokeRect(46, 46, w - 92, h - 92);
  ctx.lineWidth = 2.5;
  ctx.strokeRect(64, 64, w - 128, h - 128);
  meanderFrame(ctx, 82, 38, w, h);
  ctx.lineWidth = 2.5;
  ctx.strokeRect(134, 134, w - 268, h - 268);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(146, 146, w - 292, h - 292);
  for (const [x, y] of [
    [146, 146],
    [w - 146, 146],
    [146, h - 146],
    [w - 146, h - 146],
  ]) {
    diamond(ctx, x, y, 14);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 36px "Cinzel", serif';
  spaced(ctx, 'THE BOOK OF WORKS', w / 2, 222, 12);
  ctx.font = '400 190px "Great Vibes", cursive';
  ctx.fillText(profile.name, w / 2, 410);
  divider(ctx, w / 2, 528, 320);

  const panel = layer === 'color' ? '#3a0f13' : layer === 'rough' ? '#bdbdbd' : '#000';
  emblem(ctx, w / 2, 816, 2.4, layer === 'color' ? goldGradient(ctx, -100, 0, 300, 200) : gold, panel);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '600 52px "Cinzel", serif';
  spaced(ctx, 'PORTFOLIO', w / 2, 1110, 18);
  divider(ctx, w / 2, 1172, 220);
  ctx.font = '500 36px "Cinzel", serif';
  spaced(ctx, profile.year, w / 2, 1228, 12);
  return c;
}

export function coverCanvases() {
  return { color: coverLayer('color'), rough: coverLayer('rough'), metal: coverLayer('metal') };
}

export function leatherCanvas(w = 512, h = 512) {
  const [c, ctx] = make(w, h);
  leather(ctx, w, h);
  return c;
}

export function spineCanvas() {
  const w = 192;
  const h = 1388;
  const [c, ctx] = make(w, h);
  leather(ctx, w, h);
  for (const y of [300, h - 300]) {
    const g = ctx.createLinearGradient(0, y - 26, 0, y + 26);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(0.5, 'rgba(255,200,170,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 26, w, 52);
  }
  const gold = goldGradient(ctx, 0, 0, w, h);
  ctx.strokeStyle = gold;
  ctx.fillStyle = gold;
  ctx.lineWidth = 4;
  for (const y of [110, 140, 272, 328, h - 328, h - 272, h - 140, h - 110]) {
    ctx.beginPath();
    ctx.moveTo(16, y);
    ctx.lineTo(w - 16, y);
    ctx.stroke();
  }
  diamond(ctx, w / 2, 205, 16);
  diamond(ctx, w / 2, h - 205, 16);

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '400 104px "Great Vibes", cursive';
  ctx.fillText(profile.name, 0, 4);
  ctx.restore();
  return c;
}

export function endpaperCanvas() {
  const w = 1024;
  const h = 1388;
  const [c, ctx] = make(w, h);
  ctx.fillStyle = '#13233a';
  ctx.fillRect(0, 0, w, h);
  const cols = ['#c9a24c', '#efe1c1', '#7a1f26', '#2f4c70', '#0b1524', '#d9b86a'];
  for (let i = 0; i < 150; i++) {
    ctx.strokeStyle = cols[i % cols.length];
    ctx.globalAlpha = rand(0.08, 0.32);
    ctx.lineWidth = rand(2, 16);
    const y0 = rand(-100, h + 100);
    const f = rand(0.004, 0.012);
    const amp = rand(20, 90);
    const p = rand(0, Math.PI * 2);
    const f2 = rand(0.01, 0.03);
    const amp2 = rand(4, 20);
    ctx.beginPath();
    for (let x = -10; x <= w + 10; x += 8) {
      const y = y0 + Math.sin(x * f + p) * amp + Math.sin(x * f2 + p * 2) * amp2;
      if (x === -10) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  grain(ctx, w, h, 14);

  // Label ex-libris: lebarnya mengikuti teks terpanjang agar tidak meluber
  const heading = 'THIS BOOK BELONGS TO';
  const headingFont = '600 22px "Cinzel", serif';
  const headingSpacing = 5;
  const roleFont = '700 30px "Kalam", cursive';
  ctx.font = headingFont;
  const headingW = ctx.measureText(heading).width + heading.length * headingSpacing;
  ctx.font = roleFont;
  const roleW = ctx.measureText(profile.role).width;
  const lw = Math.min(w - 120, Math.max(470, headingW, roleW) + 110);
  const lh = 260;
  const lx = (w - lw) / 2;
  const ly = (h - lh) / 2;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#efe1c1';
  ctx.fillRect(lx, ly, lw, lh);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = GOLD_DEEP;
  ctx.lineWidth = 3;
  ctx.strokeRect(lx + 14, ly + 14, lw - 28, lh - 28);
  ctx.lineWidth = 1;
  ctx.strokeRect(lx + 22, ly + 22, lw - 44, lh - 44);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = GOLD_DEEP;
  ctx.font = headingFont;
  spaced(ctx, heading, w / 2, ly + 62, headingSpacing);
  ctx.fillStyle = WINE;
  ctx.font = '400 96px "Great Vibes", cursive';
  ctx.fillText(profile.name, w / 2, ly + 138);
  ctx.fillStyle = INK_SOFT;
  ctx.font = roleFont;
  ctx.fillText(profile.role, w / 2, ly + 206);
  return c;
}

/** Halaman kanan pertama — dibuat mirip halaman "Daftar Isi" versi HTML. */
export function firstPageCanvas() {
  const w = 1024;
  const h = 1382;
  const [c, ctx] = make(w, h);
  parchment(ctx, w, h);
  const shade = ctx.createLinearGradient(0, 0, w * 0.14, 0);
  shade.addColorStop(0, 'rgba(60,35,10,0.3)');
  shade.addColorStop(1, 'rgba(60,35,10,0)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w * 0.14, h);

  const u = w / 100;
  ctx.strokeStyle = 'rgba(138,106,42,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(3.5 * u, 3.5 * u, w - 7 * u, h - 7 * u);
  ctx.strokeStyle = 'rgba(138,106,42,0.25)';
  ctx.strokeRect(4.4 * u, 4.4 * u, w - 8.8 * u, h - 8.8 * u);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = GOLD_DEEP;
  ctx.font = `600 ${2.1 * u}px "Cinzel", serif`;
  spaced(ctx, 'INSIDE THIS BOOK', w / 2, 12 * u, 0.6 * u);
  ctx.fillStyle = INK;
  ctx.font = `400 ${12 * u}px "Great Vibes", cursive`;
  ctx.fillText('Contents', w / 2, 25 * u);
  ctx.save();
  ctx.translate(9 * u, 29 * u);
  ctx.strokeStyle = GOLD_DEEP;
  meanderBand(ctx, w - 18 * u, 2.4 * u);
  ctx.restore();

  chapters.forEach((ch, i) => {
    const y = 41 * u + i * 10 * u;
    ctx.textAlign = 'left';
    ctx.fillStyle = GOLD_DEEP;
    ctx.font = `600 ${2.6 * u}px "Cinzel", serif`;
    ctx.fillText(`${ch.numeral}.`, 10 * u, y);
    ctx.fillStyle = INK;
    ctx.font = `700 ${4.4 * u}px "Dancing Script", cursive`;
    ctx.fillText(ch.title, 18 * u, y);
    const tw = ctx.measureText(ch.title).width;
    ctx.fillStyle = INK_SOFT;
    ctx.font = `400 ${2.9 * u}px "Dancing Script", cursive`;
    ctx.fillText(ch.subtitle, 18 * u, y + 3.6 * u);
    ctx.strokeStyle = 'rgba(90,67,48,0.55)';
    ctx.setLineDash([2, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(18 * u + tw + 2 * u, y - 0.6 * u);
    ctx.lineTo(w - 16 * u, y - 0.6 * u);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = 'right';
    ctx.fillStyle = GOLD_DEEP;
    ctx.font = `600 ${3.4 * u}px "Dancing Script", cursive`;
    ctx.fillText(String(ch.page + 1), w - 10 * u, y);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD_DEEP;
  ctx.font = `400 ${2.8 * u}px "Dancing Script", cursive`;
  ctx.fillText('— 2 —', w / 2, h - 6 * u);
  return c;
}

/** Tepi tumpukan kertas. `dir` = arah garis. */
export function pageEdgeCanvas(dir: 'v' | 'h') {
  const w = dir === 'v' ? 256 : 512;
  const h = dir === 'v' ? 512 : 256;
  const [c, ctx] = make(w, h);
  ctx.fillStyle = '#e4d3ae';
  ctx.fillRect(0, 0, w, h);
  const n = dir === 'v' ? w : h;
  for (let i = 0; i < n; i += 2) {
    ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '120,90,50' : '255,248,230'},${rand(0.05, 0.25)})`;
    if (dir === 'v') ctx.fillRect(i, 0, 1, h);
    else ctx.fillRect(0, i, w, 1);
  }
  grain(ctx, w, h, 10);
  return c;
}

export function parchmentCanvas() {
  const [c, ctx] = make(512, 692);
  parchment(ctx, 512, 692);
  return c;
}

export function dustSprite() {
  const [c, ctx] = make(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,230,170,0.7)');
  g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return c;
}
