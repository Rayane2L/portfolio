// Génère les SVG décoratifs du portfolio : serpent, réseau de noeuds, vague, favicon.
const fs = require('fs');
const path = require('path');
const out = process.argv[2];
const r1 = (n) => Math.round(n * 10) / 10;

/* ---------- serpent ---------- */
function catmull(P, n) {
  const Q = [P[0], ...P, P[P.length - 1]];
  const pts = [];
  for (let i = 1; i < Q.length - 2; i++) {
    const [p0, p1, p2, p3] = [Q[i - 1], Q[i], Q[i + 1], Q[i + 2]];
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      pts.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t +
        (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
        (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  pts.push(P[P.length - 1]);
  return pts;
}
function resample(pts, step) {
  const res = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let a = pts[i - 1];
    const b = pts[i];
    let d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (acc + d >= step) {
      const t = (step - acc) / d;
      a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      res.push(a);
      d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      acc = 0;
    }
    acc += d;
  }
  return res;
}

const ctrl = [
  [18, 262], [62, 284], [108, 262], [138, 200], [160, 128], [196, 72], [244, 56],
  [288, 84], [316, 150], [338, 226], [368, 292], [414, 322], [460, 300],
  [490, 242], [512, 182], [542, 142], [582, 128], [624, 134],
];
const STEP = 2;
const C = resample(catmull(ctrl, 40), STEP);
const N = C.length;
const L = (N - 1) * STEP;
const tan = C.map((p, i) => {
  const a = C[Math.max(0, i - 2)], b = C[Math.min(N - 1, i + 2)];
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
});
const nor = tan.map(([x, y]) => [-y, x]);

const keys = [
  [0, 0.6], [130, 6.5], [330, 18], [520, 22.5], [L - 124, 21.5],
  [L - 82, 16.5], [L - 46, 25], [L - 18, 19], [L, 0],
];
function width(s) {
  for (let i = 1; i < keys.length; i++) {
    if (s <= keys[i][0]) {
      const [s0, w0] = keys[i - 1], [s1, w1] = keys[i];
      const u = (s - s0) / (s1 - s0);
      if (i === keys.length - 1) return w0 * Math.sqrt(Math.max(0, 1 - u * u));
      const e = (1 - Math.cos(Math.PI * u)) / 2;
      return w0 + (w1 - w0) * e;
    }
  }
  return 0;
}
const W = C.map((_, i) => width(i * STEP));
const left = C.map((p, i) => [p[0] - nor[i][0] * W[i], p[1] - nor[i][1] * W[i]]);
const right = C.map((p, i) => [p[0] + nor[i][0] * W[i], p[1] + nor[i][1] * W[i]]);
const fmt = (p) => `${r1(p[0])} ${r1(p[1])}`;
const body = 'M' + left.map(fmt).join('L') + 'L' + right.slice().reverse().map(fmt).join('L') + 'Z';

// écailles : deux familles de diagonales qui suivent le corps
let scales = '';
const K = 9;
const iEnd = Math.round((L - 76) / STEP);
for (let i = 26; i + K <= iEnd; i += 6) {
  scales += `M${fmt(left[i])}L${fmt(right[i + K])}M${fmt(right[i])}L${fmt(left[i + K])}`;
}

const at = (s, off) => {
  const i = Math.min(N - 1, Math.max(0, Math.round(s / STEP)));
  return [C[i][0] + nor[i][0] * off, C[i][1] + nor[i][1] * off];
};
const headAngle = (Math.atan2(tan[N - 1][1], tan[N - 1][0]) * 180) / Math.PI;
const eye = at(L - 36, -10.5);
const m0 = at(L - 1, 4), m1 = at(L - 26, 13), m2 = at(L - 54, 13);
const tip = C[N - 1];
const tdir = tan[N - 1];
const rot = (v, deg) => {
  const a = (deg * Math.PI) / 180;
  return [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
};
const t0 = [tip[0] + tdir[0] * 1 + nor[N - 1][0] * 2, tip[1] + tdir[1] * 1 + nor[N - 1][1] * 2];
const t1 = [t0[0] + tdir[0] * 18, t0[1] + tdir[1] * 18 + 4];
const f1 = rot(tdir, -22), f2 = rot(tdir, 34);
const ta = [t1[0] + f1[0] * 13, t1[1] + f1[1] * 13];
const tb = [t1[0] + f2[0] * 13, t1[1] + f2[1] * 13];

const snake = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 670 380" role="img" aria-label="Serpent néon">
<defs>
<linearGradient id="g" x1="0" y1="40" x2="0" y2="340" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#1c6e33"/><stop offset="1" stop-color="#0a2c17"/>
</linearGradient>
<filter id="glow" x="-10%" y="-25%" width="120%" height="150%"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="soft" x="-10%" y="-25%" width="120%" height="150%"><feGaussianBlur stdDeviation="2"/></filter>
<path id="b" d="${body}"/><clipPath id="c"><use href="#b"/></clipPath>
</defs>
<use href="#b" fill="none" stroke="#39ff14" stroke-width="10" opacity=".55" filter="url(#glow)"/>
<use href="#b" fill="none" stroke="#39ff14" stroke-width="4" opacity=".8" filter="url(#soft)"/>
<use href="#b" fill="url(#g)"/>
<path d="${scales}" fill="none" stroke="#39d353" stroke-width="1" opacity=".5" clip-path="url(#c)"/>
<use href="#b" fill="none" stroke="#96ff6e" stroke-width="2" stroke-linejoin="round"/>
<path d="M${fmt(m0)}Q${fmt(m1)} ${fmt(m2)}" fill="none" stroke="#06200f" stroke-width="2" stroke-linecap="round"/>
<g transform="rotate(${r1(headAngle)} ${fmt(eye)})">
<ellipse cx="${r1(eye[0])}" cy="${r1(eye[1])}" rx="6.2" ry="4.8" fill="#d9ff4a" stroke="#06200f" stroke-width="1"/>
<ellipse cx="${r1(eye[0])}" cy="${r1(eye[1])}" rx="1.6" ry="4.2" fill="#06200f"/>
</g>
<path d="M${fmt(t0)}L${fmt(t1)}L${fmt(ta)}M${fmt(t1)}L${fmt(tb)}" fill="none" stroke="#39ff14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
fs.writeFileSync(path.join(out, 'snake.svg'), snake);

/* ---------- réseau de noeuds ---------- */
let seed = 20261114;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const NW = 1400, NH = 800;
const nodes = [];
while (nodes.length < 22) {
  const p = [40 + rnd() * (NW - 80), 30 + rnd() * (NH - 60)];
  if (nodes.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 120)) nodes.push(p);
}
let lines = '';
nodes.forEach((a, i) => {
  nodes.forEach((b, j) => {
    if (j > i && Math.hypot(a[0] - b[0], a[1] - b[1]) < 300) {
      lines += `M${Math.round(a[0])} ${Math.round(a[1])}L${Math.round(b[0])} ${Math.round(b[1])}`;
    }
  });
});
const dots = nodes.map((p) => `<circle cx="${Math.round(p[0])}" cy="${Math.round(p[1])}" r="3"/>`).join('');
const halos = nodes.map((p) => `<circle cx="${Math.round(p[0])}" cy="${Math.round(p[1])}" r="8"/>`).join('');
fs.writeFileSync(path.join(out, 'nodes.svg'),
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${NW} ${NH}">
<path d="${lines}" fill="none" stroke="#26a641" stroke-width="1" opacity=".28"/>
<g fill="#39d353" opacity=".12">${halos}</g>
<g fill="#39d353" opacity=".75">${dots}</g>
</svg>
`);

/* ---------- vague ---------- */
const WW = 1440, WH = 180;
function wave(base, amp, len, phase) {
  let d = '';
  for (let x = 0; x <= WW; x += 24) {
    const y = base + amp * Math.sin((x / len) * Math.PI * 2 + phase) + amp * 0.4 * Math.sin((x / (len * 0.47)) * Math.PI * 2 + phase * 1.7);
    d += (x === 0 ? 'M' : 'L') + x + ' ' + r1(y);
  }
  return d;
}
const w1 = wave(70, 16, 900, 0.4), w2 = wave(96, 13, 700, 2.1), w3 = wave(120, 10, 1100, 4.0);
const close = `L${WW} ${WH}L0 ${WH}Z`;
fs.writeFileSync(path.join(out, 'wave.svg'),
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WW} ${WH}" preserveAspectRatio="none">
<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#26a641" stop-opacity=".22"/><stop offset="1" stop-color="#0e4429" stop-opacity="0"/>
</linearGradient></defs>
<path d="${w1}${close}" fill="url(#w)"/>
<path d="${w2}${close}" fill="url(#w)"/>
<path d="${w3}${close}" fill="url(#w)"/>
<path d="${w1}" fill="none" stroke="#39d353" stroke-width="1.5" opacity=".7" vector-effect="non-scaling-stroke"/>
<path d="${w2}" fill="none" stroke="#26a641" stroke-width="1" opacity=".6" vector-effect="non-scaling-stroke"/>
<path d="${w3}" fill="none" stroke="#0e4429" stroke-width="1" opacity=".9" vector-effect="non-scaling-stroke"/>
</svg>
`);

/* ---------- favicon ---------- */
fs.writeFileSync(path.join(out, 'favicon.svg'),
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" rx="7" fill="#0d1117"/>
<path d="M5 24c4 3 9 2 9-3 0-5-1-11 4-13 3-1 6 0 9 2" fill="none" stroke="#39ff14" stroke-width="3.4" stroke-linecap="round"/>
<circle cx="24.4" cy="8.6" r="1.1" fill="#0d1117"/>
</svg>
`);
console.log('ok', { N, L });
