import gsap from 'gsap';
import { SINGLE_QUERY } from './scene';

const BLANK = '<div class="pg"></div>';

export function createReader(opts: {
  onClose: () => void;
  onFlip?: (duration: number, volume: number) => void;
  /** Logo proyek diklik. */
  onMemory?: (project: number, from: HTMLElement) => void;
  /** Layar lain sedang menangani keyboard. */
  keysBlocked?: () => boolean;
}) {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const root = $('reader');
  const book = $('book');
  const left = $('page-left');
  const right = $('page-right');
  const leaf = $('leaf'); // cetakan lembar kertas; disalin setiap kali halaman dibalik
  const prevBtn = $<HTMLButtonElement>('prev-btn');
  const nextBtn = $<HTMLButtonElement>('next-btn');
  const indicator = $('page-indicator');

  const pages = [...document.querySelectorAll<HTMLTemplateElement>('#page-store template')]
    .sort((a, b) => Number(a.dataset.page) - Number(b.dataset.page))
    .map((t) => t.innerHTML);
  const last = pages.length - 1;

  const mq = window.matchMedia(SINGLE_QUERY);
  let single = mq.matches;
  let cur = 0; // dua halaman: indeks halaman kiri (genap) · satu halaman: indeks halaman
  let busy = false;
  let isOpen = false;

  const html = (i: number) => (i >= 0 && i <= last ? pages[i] : BLANK);
  const norm = (i: number) => {
    const c = Math.min(Math.max(i, 0), last);
    return single ? c : c - (c % 2);
  };
  const step = () => (single ? 1 : 2);

  // Isi halaman. `settled`: pop-up langsung berdiri tanpa animasi.
  function put(page: HTMLElement, content: string, settled = false) {
    page.classList.toggle('pop-settled', settled);
    page.innerHTML = content;
  }

  function paint() {
    book.classList.toggle('single', single);
    put(left, html(cur));
    put(right, single ? '' : html(cur + 1));
    updateNav();
  }

  // Tandai halaman yang isinya lebih panjang dari halaman (dapat di-scroll)
  function markScrollable(body: Element) {
    const scrollable = body.scrollHeight > body.clientHeight + 2;
    body.classList.toggle('is-scrollable', scrollable);
    body.classList.toggle('at-end', scrollable && body.scrollTop + body.clientHeight >= body.scrollHeight - 4);
  }
  const markAll = () => book.querySelectorAll('.pg-body').forEach(markScrollable);

  function updateNav() {
    requestAnimationFrame(markAll);
    prevBtn.disabled = cur <= 0;
    nextBtn.disabled = cur + step() > last;
    indicator.textContent = single
      ? `${cur + 1} / ${pages.length}`
      : `${cur + 1}–${Math.min(cur + 2, pages.length)} / ${pages.length}`;
  }

  function reveal(...els: HTMLElement[]) {
    const items = els.flatMap((el) => [...el.querySelectorAll('.reveal')]);
    gsap.fromTo(
      items,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, delay: 0.25, ease: 'power2.out' },
    );
  }

  // Buat satu lembar kertas (salinan #leaf) dengan isi depan & belakang.
  // Pop-up di lembar tetap berdiri, kecuali sisi `rising`: lembar yang kembali membawa pop-up
  // terlipat rata, lalu berdiri membesar begitu halamannya mendarat.
  function makeLeaf(
    cls: string,
    frontSide: 'sheet-right' | 'sheet-left',
    frontHtml: string,
    backHtml: string,
    rising?: 'front' | 'back',
  ) {
    const el = leaf.cloneNode(true) as HTMLElement;
    el.removeAttribute('id');
    el.className = `leaf ${cls}`;
    const f = el.querySelector<HTMLElement>('.leaf-front')!;
    const b = el.querySelector<HTMLElement>('.leaf-back')!;
    f.className = `leaf-face leaf-front sheet ${frontSide}`;
    b.className = `leaf-face leaf-back sheet ${frontSide === 'sheet-right' ? 'sheet-left' : 'sheet-right'}`;
    f.innerHTML = frontHtml;
    b.innerHTML = backHtml;
    if (rising) (rising === 'front' ? f : b).classList.add('pop-rising');
    el.style.display = 'block';
    book.appendChild(el);
    return el;
  }

  // Bayangan paling gelap saat lembaran tegak (90°)
  const shade = (el: HTMLElement) => {
    const deg = Math.abs(Number(gsap.getProperty(el, 'rotateY')));
    el.style.setProperty('--shade', String(Math.sin((deg / 180) * Math.PI) * 0.4));
    return deg;
  };

  /**
   * Balik beberapa lembar berurutan. `count` = jumlah lembar yang dilewati;
   * bila lebih dari MAX_SHEETS, lembar di tengah diwakili sampelnya saja.
   * `sheet(i)` mengembalikan [isi depan, isi belakang] untuk lembar ke-i (0 = lembar pertama).
   */
  const MAX_SHEETS = 10;
  async function riffle(opts2: {
    count: number;
    cls: string;
    frontSide: 'sheet-right' | 'sheet-left';
    sheet: (i: number) => [string, string];
    from: number;
    to: number;
    ease: string;
    duration: number;
    stackOnLand?: boolean; // lembar yang mendarat menumpuk di atas yang sebelumnya
    rising?: 'front' | 'back';
  }) {
    const n = Math.min(opts2.count, MAX_SHEETS);
    const pick = (j: number) => (n === 1 ? 0 : Math.round((j * (opts2.count - 1)) / (n - 1)));
    const duration = n === 1 ? opts2.duration : opts2.duration * 0.75;
    const stagger = n === 1 ? 0 : Math.min(0.14, 0.75 / (n - 1));

    const leaves = Array.from({ length: n }, (_, j) => {
      const [f, b] = opts2.sheet(pick(j));
      const el = makeLeaf(opts2.cls, opts2.frontSide, f, b, opts2.rising);
      el.style.zIndex = String(opts2.stackOnLand ? 10 + j : 10 + n - j);
      return el;
    });
    markAll();

    const tl = gsap.timeline();
    leaves.forEach((el, j) => {
      let landed = false;
      tl.fromTo(
        el,
        { rotateY: opts2.from },
        {
          rotateY: opts2.to,
          duration,
          ease: opts2.ease,
          onStart: () => opts.onFlip?.(duration, n === 1 ? 1 : 0.5),
          onUpdate: () => {
            const deg = shade(el);
            // Setelah melewati 90°, lembar ini berada di atas lembar yang sudah mendarat
            if (!landed && deg > 90 && !opts2.stackOnLand) {
              landed = true;
              el.style.zIndex = String(40 + j);
            }
          },
        },
        j * stagger,
      );
    });
    await tl;
    leaves.forEach((el) => el.remove());
  }

  async function goTo(target: number) {
    target = norm(target);
    if (busy || !isOpen || target === cur) return;
    busy = true;
    const fwd = target > cur;
    const from = cur;

    if (single) {
      const count = Math.abs(target - from);
      if (fwd) {
        // Halaman demi halaman terangkat dan menghilang ke kiri
        put(left, html(target));
        reveal(left);
        await riffle({
          count,
          cls: 'leaf-single',
          frontSide: 'sheet-right',
          sheet: (i) => [html(from + i), BLANK],
          from: 0,
          to: -90,
          ease: 'power2.in',
          duration: 0.7,
        });
      } else {
        // Halaman berdatangan kembali; halaman tujuan mendarat paling akhir
        await riffle({
          count,
          cls: 'leaf-single',
          frontSide: 'sheet-right',
          sheet: (i) => [html(from - 1 - i), BLANK],
          from: -90,
          to: 0,
          ease: 'power2.out',
          duration: 0.7,
          stackOnLand: true,
          rising: 'front',
        });
        put(left, html(target));
      }
    } else {
      const count = Math.abs(target - from) / 2;
      if (fwd) {
        put(right, html(target + 1));
        reveal(right);
        await riffle({
          count,
          cls: 'leaf-right',
          frontSide: 'sheet-right',
          sheet: (i) => [html(from + 1 + 2 * i), html(from + 2 + 2 * i)],
          from: 0,
          to: -180,
          ease: 'power2.inOut',
          duration: 1.05,
        });
        put(left, html(target), true);
      } else {
        put(left, html(target));
        reveal(left);
        await riffle({
          count,
          cls: 'leaf-left',
          frontSide: 'sheet-left',
          sheet: (i) => [html(from - 2 * i), html(from - 1 - 2 * i)],
          from: 0,
          to: 180,
          ease: 'power2.inOut',
          duration: 1.05,
          rising: 'back',
        });
        put(right, html(target + 1));
      }
    }

    cur = target;
    updateNav();
    busy = false;
  }

  const next = () => goTo(cur + step());
  const prev = () => goTo(cur - step());

  // ── Event ──────────────────────────────────────────────
  book.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    const memory = el.closest<HTMLElement>('[data-memory]');
    if (memory) return opts.onMemory?.(Number(memory.dataset.memory), memory);
    const goto = el.closest<HTMLElement>('[data-goto]');
    if (goto) return void goTo(Number(goto.dataset.goto));
    if (el.closest('[data-action="close"]')) opts.onClose();
  });
  book.addEventListener(
    'scroll',
    (e) => {
      const el = e.target as Element;
      if (el.classList?.contains('pg-body')) markScrollable(el);
    },
    true,
  );
  window.addEventListener('resize', markAll);
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  $('toc-btn').addEventListener('click', () => goTo(1));
  $('close-btn').addEventListener('click', () => opts.onClose());

  window.addEventListener('keydown', (e) => {
    if (!isOpen || opts.keysBlocked?.()) return;
    if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'Escape') opts.onClose();
  });

  // ── Seret halaman dengan mouse (desktop, mode dua halaman) ──
  // Lembar mengikuti kursor; dilepas setelah lewat COMPLETE_AT → halaman berbalik,
  // jika belum → lembar kembali ke tempatnya. Di layar HP navigasi memakai tombol.
  const DRAG_START = 6; // px sebelum seret dimulai, agar klik biasa tetap berfungsi
  const COMPLETE_AT = 0.33;
  type Drag = { fwd: boolean; startX: number; pointerId: number; el: HTMLElement | null; p: number };
  let drag: Drag | null = null;

  function beginDrag(d: Drag) {
    busy = true;
    book.classList.add('dragging');
    window.getSelection()?.removeAllRanges();
    if (d.fwd) {
      d.el = makeLeaf('leaf-right', 'sheet-right', html(cur + 1), html(cur + 2));
      put(right, html(cur + 3));
    } else {
      d.el = makeLeaf('leaf-left', 'sheet-left', html(cur), html(cur - 1), 'back');
      put(left, html(cur - 2));
    }
    d.el.style.zIndex = '10';
    markAll();
  }

  async function endDrag(d: Drag) {
    const el = d.el!;
    const done = d.p > COMPLETE_AT;
    const duration = 0.25 + 0.5 * (done ? 1 - d.p : d.p);
    if (done) opts.onFlip?.(duration, 0.8);
    await gsap.to(el, {
      rotateY: done ? (d.fwd ? -180 : 180) : 0,
      duration,
      ease: 'power2.out',
      onUpdate: () => void shade(el),
    });
    el.remove();
    book.classList.remove('dragging');
    if (done) {
      if (d.fwd) put(left, html(cur + 2), true);
      else put(right, html(cur - 1));
      cur += d.fwd ? 2 : -2;
    } else if (d.fwd) {
      put(right, html(cur + 1), true);
    } else {
      put(left, html(cur), true);
    }
    updateNav();
    busy = false;
  }

  book.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || single || busy || !isOpen) return;
    const target = e.target as HTMLElement;
    if (target.closest('a, button')) return;
    const side = target.closest('#page-left, #page-right');
    if (!side) return;
    const fwd = side === right;
    if (fwd ? cur + 2 > last : cur - 2 < 0) return;
    drag = { fwd, startX: e.clientX, pointerId: e.pointerId, el: null, p: 0 };
  });

  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.startX;
    if (!drag.el) {
      // Mulai hanya bila bergerak ke arah membalik (kiri untuk maju, kanan untuk mundur)
      if (Math.abs(dx) < DRAG_START || (drag.fwd ? dx > 0 : dx < 0)) return;
      beginDrag(drag);
    }
    const width = book.getBoundingClientRect().width;
    drag.p = Math.min(1, Math.max(0, (drag.fwd ? -dx : dx) / width));
    gsap.set(drag.el!, { rotateY: (drag.fwd ? -180 : 180) * drag.p });
    shade(drag.el!);
  });

  const releaseDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    if (d.el) void endDrag(d);
  };
  window.addEventListener('pointerup', releaseDrag);
  window.addEventListener('pointercancel', releaseDrag);

  mq.addEventListener('change', () => {
    single = mq.matches;
    cur = norm(cur);
    if (isOpen && !busy) paint();
  });

  return {
    show() {
      single = mq.matches;
      cur = single ? 1 : 0;
      isOpen = true;
      paint();
      gsap.set(root, { visibility: 'visible' });
      gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power2.out' });
      gsap.fromTo(book, { scale: 0.985 }, { scale: 1, duration: 1.2, ease: 'power3.out' });
      gsap.fromTo('.reader-ui', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.5, stagger: 0.1 });
      reveal(left, right);
    },
    hide() {
      isOpen = false;
      return gsap
        .to(root, { opacity: 0, duration: 0.55, ease: 'power2.in' })
        .then(() => {
          gsap.set(root, { visibility: 'hidden' });
        });
    },
  };
}
