// Génère les SVG décoratifs du portfolio : réseau de noeuds, vague, favicon.
// Usage : node tools/generer-assets.js assets
// (Le serpent, lui, est dessiné en direct par js/snake.js.)
const fs = require('fs');
const path = require('path');
const out = process.argv[2] || 'assets';
const r1 = (n) => Math.round(n * 10) / 10;

const BLUE = '#58a6ff';
const BLUE_MID = '#1f6feb';
const BLUE_DEEP = '#0c2d6b';

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
const circles = (r) => nodes.map((p) => `<circle cx="${Math.round(p[0])}" cy="${Math.round(p[1])}" r="${r}"/>`).join('');
fs.writeFileSync(path.join(out, 'nodes.svg'),
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${NW} ${NH}">
<path d="${lines}" fill="none" stroke="${BLUE_MID}" stroke-width="1" opacity=".3"/>
<g fill="${BLUE}" opacity=".12">${circles(8)}</g>
<g fill="${BLUE}" opacity=".75">${circles(3)}</g>
</svg>
`);

/* ---------- vague ---------- */
const WW = 1440, WH = 180;
function wave(base, amp, len, phase) {
  let d = '';
  for (let x = 0; x <= WW; x += 24) {
    const y = base + amp * Math.sin((x / len) * Math.PI * 2 + phase) +
      amp * 0.4 * Math.sin((x / (len * 0.47)) * Math.PI * 2 + phase * 1.7);
    d += (x === 0 ? 'M' : 'L') + x + ' ' + r1(y);
  }
  return d;
}
const w1 = wave(70, 16, 900, 0.4), w2 = wave(96, 13, 700, 2.1), w3 = wave(120, 10, 1100, 4.0);
const close = `L${WW} ${WH}L0 ${WH}Z`;
fs.writeFileSync(path.join(out, 'wave.svg'),
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WW} ${WH}" preserveAspectRatio="none">
<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${BLUE_MID}" stop-opacity=".22"/><stop offset="1" stop-color="${BLUE_DEEP}" stop-opacity="0"/>
</linearGradient></defs>
<path d="${w1}${close}" fill="url(#w)"/>
<path d="${w2}${close}" fill="url(#w)"/>
<path d="${w3}${close}" fill="url(#w)"/>
<path d="${w1}" fill="none" stroke="${BLUE}" stroke-width="1.5" opacity=".7" vector-effect="non-scaling-stroke"/>
<path d="${w2}" fill="none" stroke="${BLUE_MID}" stroke-width="1" opacity=".7" vector-effect="non-scaling-stroke"/>
<path d="${w3}" fill="none" stroke="${BLUE_DEEP}" stroke-width="1" opacity=".9" vector-effect="non-scaling-stroke"/>
</svg>
`);

/* ---------- favicon : un serpent en S ---------- */
fs.writeFileSync(path.join(out, 'favicon.svg'),
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" rx="7" fill="#0d1117"/>
<path d="M5 24c4 3 9 2 9-3 0-5-1-11 4-13 3-1 6 0 9 2" fill="none" stroke="${BLUE}" stroke-width="3.4" stroke-linecap="round"/>
<circle cx="24.4" cy="8.6" r="1.1" fill="#0d1117"/>
</svg>
`);
console.log('SVG générés dans', out);
