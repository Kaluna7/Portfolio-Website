// Emblem "pena bulu & buku": buku terbuka, pena bulu, kilau bintang, sapuan tinta.
// Digambar dalam kotak 200×200 sebagai path SVG, sehingga dipakai bersama oleh
// halaman judul (komponen Emblem.astro) dan sampul 3D (Path2D di textures.ts).

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Cerminkan path terhadap garis tengah vertikal (x = 100). Path harus berupa pasangan "x y". */
const mirror = (d: string) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${r2(200 - Number(x))} ${y}`);

const star = (x: number, y: number, s: number) =>
  `M${x} ${y - s}L${r2(x + s * 0.25)} ${r2(y - s * 0.25)}L${x + s} ${y}L${r2(x + s * 0.25)} ${r2(y + s * 0.25)}` +
  `L${x} ${y + s}L${r2(x - s * 0.25)} ${r2(y + s * 0.25)}L${x - s} ${y}L${r2(x - s * 0.25)} ${r2(y - s * 0.25)}Z`;

// ── Buku terbuka ─────────────────────────────────────────
const leftPage = 'M100 136C84 126 60 124 36 130L36 164C60 158 84 160 100 170Z';
const pageEdges = 'M36 164L39 170C61 164 84 166 100 176C116 166 139 164 161 170L164 164';
const leftLines = ['M46 140C61 135 78 135 91 141', 'M46 148C61 143 78 143 91 149', 'M46 156C59 151 72 151 82 155'];

// ── Pena bulu (dari ujung pena di bawah ke pucuk bulu di kanan atas) ──
const NIB = { x: 100, y: 134 };
const TIP = { x: 138, y: 14 };
const onShaft = (y: number) => NIB.x + ((NIB.y - y) * (TIP.x - NIB.x)) / (NIB.y - TIP.y);
const vane = `M${r2(onShaft(116))} 116C90 84 104 42 ${TIP.x} ${TIP.y}C150 50 132 96 ${r2(onShaft(116))} 116Z`;
const barbs = [34, 46, 58, 70, 82, 94, 104]
  .map((y) => {
    const x = onShaft(y);
    const spread = y < 50 ? 6 : y > 96 ? 5 : 9;
    return `M${r2(x)} ${y}L${r2(x - spread)} ${y - 7}M${r2(x)} ${y}L${r2(x + spread)} ${y - 3}`;
  })
  .join('');
const nib = `M${r2(onShaft(126))} 126L${NIB.x - 4} 142L${r2(onShaft(126)) + 4} 128Z`;

// ── Sapuan tinta di bawah buku ─────────────────────────────
const swash = 'M58 186C82 194 118 194 142 186';
const curlLeft = 'M58 186C51 183 51 176 57 176C61 176 62 181 58 182';

export const EMBLEM = {
  /** Bidang yang diisi warna latar (kertas & bulu), lalu digaris emas */
  panels: [leftPage, mirror(leftPage), vane],
  /** Garis: [path, tebal] */
  strokes: [
    [leftPage, 1.8],
    [mirror(leftPage), 1.8],
    ['M100 136L100 170', 1.4],
    [pageEdges, 1.2],
    ...leftLines.map((d) => [d, 0.9] as const),
    ...leftLines.map((d) => [mirror(d), 0.9] as const),
    [vane, 1.5],
    [`M${NIB.x} ${NIB.y}L${TIP.x} ${TIP.y}`, 1.6],
    [barbs, 0.8],
    [swash, 1.4],
    [curlLeft, 1.2],
    [mirror(curlLeft), 1.2],
  ] as [string, number][],
  /** Bidang emas penuh */
  fills: [nib, star(60, 64, 9), star(76, 38, 4.5), star(160, 84, 6), star(44, 100, 3.5), star(168, 46, 3)],
  /** Titik kecil: [x, y, jari-jari] */
  dots: [
    [100, 196, 1.8],
    [150, 112, 1.5],
    [52, 120, 1.4],
    [88, 18, 1.4],
  ] as [number, number, number][],
};
