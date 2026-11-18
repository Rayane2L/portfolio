// Rail de gauche : piste ondulée et repères de sections qui s'allument au fil de la lecture.
// Dessine aussi un serpent vectoriel, utilisé seulement si le serpent 3D ne peut pas s'afficher.

const NS = 'http://www.w3.org/2000/svg';

export interface RailGeometry {
  width: number;
  height: number;
  cx: number;
  amp: number;
  lambda: number;
  half: number;
  length: number;
}

export interface RailFrame {
  geo: RailGeometry;
  /** position du rail dans la fenêtre (px) */
  rect: DOMRect;
  /** tête du serpent, en px depuis le haut du rail */
  headY: number;
  /** 0 à 1 : la tête est à hauteur d'un repère de section */
  focus: number;
  xAt: (y: number) => number;
}

export interface Rail {
  frame: () => RailFrame;
  subscribe: (cb: () => void) => () => void;
  setVectorVisible: (visible: boolean) => void;
  destroy: () => void;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const fmt = (n: number) => n.toFixed(1);
const smooth = (t: number) => {
  const u = clamp(t, 0, 1);
  return u * u * (3 - 2 * u);
};

function make<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string>, parent?: Element) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

export interface RailOptions {
  /** affiche le serpent vectoriel dès le départ (sinon seulement via setVectorVisible) */
  vector?: boolean;
}

export function createRail(rail: HTMLElement, options: RailOptions = {}): Rail {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const svg = make('svg', { 'aria-hidden': 'true', focusable: 'false', class: 'absolute inset-0 h-full w-full overflow-visible pointer-events-none' }, rail);
  const defs = make('defs', {}, svg);
  const shape = make('path', { id: 'snake-shape' }, defs);
  const clip = make('clipPath', { id: 'snake-clip' }, defs);
  make('use', { href: '#snake-shape' }, clip);

  const track = make('path', { class: 'rail-track' }, svg);
  const nodeLayer = make('g', {}, svg);
  const snake = make('g', { class: 'transition-opacity duration-500' }, svg);
  const tongue = make('path', { class: 'snake-tongue' }, snake);
  make('use', { href: '#snake-shape', class: 'snake-fill' }, snake);
  const scales = make('path', { class: 'snake-scales', 'clip-path': 'url(#snake-clip)' }, snake);
  make('use', { href: '#snake-shape', class: 'snake-edge' }, snake);
  const eyes = [0, 1].map(() => ({ white: make('circle', { class: 'snake-eye' }, snake), pupil: make('circle', { class: 'snake-pupil' }, snake) }));

  const geo: RailGeometry = { width: 0, height: 0, cx: 0, amp: 0, lambda: 1, half: 0, length: 0 };
  const view = { railTop: 0, height: 0, maxScroll: 0 };
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-node]'));
  let nodes: { y: number; el: SVGRectElement; on: boolean }[] = [];
  let vectorVisible = options.vector ?? true;
  snake.style.opacity = vectorVisible ? '1' : '0';
  const listeners = new Set<() => void>();

  const xAt = (y: number) => geo.cx + geo.amp * Math.sin((y / geo.lambda) * 2 * Math.PI);

  function measure() {
    const box = rail.getBoundingClientRect();
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    geo.width = box.width;
    geo.height = box.height;
    geo.cx = box.width / 2;
    geo.amp = box.width * 0.22;
    geo.half = clamp(box.width * 0.08, 4.5, 13);
    geo.lambda = clamp(box.width * 2.1, 150, 320);
    view.railTop = box.top + window.scrollY;
    view.height = window.innerHeight;
    view.maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    geo.length = clamp(view.height * 0.62, 260, 640);

    const positions = targets.map((el) => {
      const r = el.getBoundingClientRect();
      if (el.dataset.node === 'mid') return r.top - box.top + r.height / 2;
      return r.top - box.top + parseFloat(getComputedStyle(el).paddingTop) + 0.75 * rem;
    });

    svg.setAttribute('viewBox', `0 0 ${fmt(geo.width)} ${fmt(geo.height)}`);
    let d = '';
    for (let y = 0; y <= geo.height; y += 6) d += `${y ? 'L' : 'M'}${fmt(xAt(y))} ${y}`;
    track.setAttribute('d', d);

    const size = clamp(geo.width * 0.11, 7, 14);
    nodeLayer.replaceChildren();
    nodes = positions.map((y) => {
      const el = make('rect', { class: 'rail-node', x: fmt(xAt(y) - size / 2), y: fmt(y - size / 2), width: fmt(size), height: fmt(size), rx: fmt(size * 0.22) }, nodeLayer);
      return { y, el, on: false };
    });
  }

  /* ---------- serpent vectoriel ---------- */
  function halfWidth(fromTail: number, total: number) {
    const h = geo.half;
    const keys: [number, number][] = [
      [0, 0.05 * h], [0.42 * total, h], [total - 7.5 * h, h], [total - 5.4 * h, 0.74 * h],
      [total - 3 * h, 1.22 * h], [total - 1.1 * h, 0.95 * h], [total, 0],
    ];
    for (let i = 1; i < keys.length; i++) {
      if (fromTail <= keys[i][0]) {
        const span = keys[i][0] - keys[i - 1][0];
        const u = span > 0 ? (fromTail - keys[i - 1][0]) / span : 1;
        if (i === keys.length - 1) return keys[i - 1][1] * Math.sqrt(Math.max(0, 1 - u * u));
        return keys[i - 1][1] + ((keys[i][1] - keys[i - 1][1]) * (1 - Math.cos(Math.PI * u))) / 2;
      }
    }
    return 0;
  }

  function drawVector(headY: number) {
    const h = geo.half;
    const pts: [number, number, number][] = [];
    let y = headY;
    let px = xAt(y);
    let dist = 0;
    pts.push([px, y, 0]);
    while (dist < geo.length && y > 0) {
      const step = dist < 1.4 * h ? 0.8 : 2.5;
      y -= step;
      const nx = xAt(y);
      dist += Math.hypot(nx - px, step);
      px = nx;
      pts.push([nx, y, dist]);
    }
    const total = dist;
    const count = pts.length;
    if (count < 4) return;

    const left: [number, number][] = [];
    const right: [number, number][] = [];
    const frames: [number, number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(count - 1, i + 1)];
      const tx = a[0] - b[0];
      const ty = a[1] - b[1];
      const len = Math.hypot(tx, ty) || 1;
      const nx = -ty / len;
      const ny = tx / len;
      const w = halfWidth(total - pts[i][2], total);
      frames.push([nx, ny, tx / len, ty / len]);
      left.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
      right.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
    }
    let d = `M${fmt(left[0][0])} ${fmt(left[0][1])}`;
    for (let i = 1; i < count; i++) d += `L${fmt(left[i][0])} ${fmt(left[i][1])}`;
    for (let i = count - 1; i >= 0; i--) d += `L${fmt(right[i][0])} ${fmt(right[i][1])}`;
    shape.setAttribute('d', `${d}Z`);

    const every = Math.max(2, Math.round(h / 3.4));
    const reach = Math.max(2, Math.round(h / 2.4));
    let s = '';
    for (let i = 0; i + reach < count; i += every) {
      if (pts[i][2] < 5.6 * h || total - pts[i + reach][2] < 0.08 * total) continue;
      s += `M${fmt(left[i][0])} ${fmt(left[i][1])}L${fmt(right[i + reach][0])} ${fmt(right[i + reach][1])}`;
      s += `M${fmt(right[i][0])} ${fmt(right[i][1])}L${fmt(left[i + reach][0])} ${fmt(left[i + reach][1])}`;
    }
    scales.setAttribute('d', s);

    let e = 0;
    while (e < count - 1 && pts[e][2] < 2.7 * h) e++;
    [1, -1].forEach((side, index) => {
      const ex = pts[e][0] + frames[e][0] * 0.62 * h * side;
      const ey = pts[e][1] + frames[e][1] * 0.62 * h * side;
      for (const [el, r] of [[eyes[index].white, 0.24], [eyes[index].pupil, 0.11]] as const) {
        el.setAttribute('cx', fmt(ex));
        el.setAttribute('cy', fmt(ey));
        el.setAttribute('r', fmt(r * h));
      }
    });

    const [, , dirX, dirY] = frames[1];
    const [tipX, tipY] = pts[0];
    const midX = tipX + dirX * 1.3 * h;
    const midY = tipY + dirY * 1.3 * h;
    const cos = Math.cos(0.5);
    const sin = Math.sin(0.5);
    const fork = 0.8 * h;
    tongue.setAttribute(
      'd',
      `M${fmt(tipX)} ${fmt(tipY)}L${fmt(midX)} ${fmt(midY)}` +
        `L${fmt(midX + (dirX * cos - dirY * sin) * fork)} ${fmt(midY + (dirX * sin + dirY * cos) * fork)}` +
        `M${fmt(midX)} ${fmt(midY)}L${fmt(midX + (dirX * cos + dirY * sin) * fork)} ${fmt(midY + (-dirX * sin + dirY * cos) * fork)}`,
    );
  }

  /* ---------- suivi du scroll ---------- */
  let headY = 0;
  let focus = 0;

  function target() {
    const end = geo.height - 1.2 * geo.half - 6;
    const start = Math.min(end, Math.max(view.height * 0.42 - view.railTop, 140));
    const progress = view.maxScroll > 8 ? clamp(window.scrollY / view.maxScroll, 0, 1) : 1;
    return reduceMotion ? start : start + (end - start) * progress;
  }

  function update() {
    scheduled = false;
    if (!geo.height) return;
    headY = target();
    let nearest = Infinity;
    for (const node of nodes) {
      nearest = Math.min(nearest, Math.abs(headY - node.y));
      const on = headY >= node.y - 2;
      if (on !== node.on) {
        node.on = on;
        node.el.setAttribute('class', on ? 'rail-node on' : 'rail-node');
      }
    }
    focus = 1 - smooth((nearest - 18) / 70);
    if (vectorVisible) drawVector(headY);
    listeners.forEach((cb) => cb());
  }

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };
  const refresh = () => {
    measure();
    schedule();
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', refresh);
  const observer = new ResizeObserver(refresh);
  observer.observe(rail);
  document.fonts?.ready.then(refresh);
  refresh();

  return {
    frame: () => ({ geo, rect: rail.getBoundingClientRect(), headY, focus, xAt }),
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    setVectorVisible(visible) {
      vectorVisible = visible;
      snake.style.opacity = visible ? '1' : '0';
      if (visible) schedule();
    },
    destroy() {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', refresh);
      observer.disconnect();
      listeners.clear();
      svg.remove();
    },
  };
}
