// Le serpent du rail : il descend le long de la page au fil de la lecture
// et allume le repère de chaque section qu'il atteint.
(function () {
  'use strict';

  var rail = document.getElementById('rail');
  if (!rail || !window.requestAnimationFrame) return;

  var NS = 'http://www.w3.org/2000/svg';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function make(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    for (var key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  }
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function fmt(n) {
    return n.toFixed(1);
  }

  /* ---------- éléments SVG ---------- */
  var svg = make('svg', { 'aria-hidden': 'true', focusable: 'false' }, rail);
  var defs = make('defs', {}, svg);
  var shape = make('path', { id: 'snake-shape' }, defs);
  var clip = make('clipPath', { id: 'snake-clip' }, defs);
  make('use', { href: '#snake-shape' }, clip);

  var track = make('path', { class: 'rail-track' }, svg);
  var nodeLayer = make('g', {}, svg);
  var snake = make('g', {}, svg);
  var tongue = make('path', { class: 'snake-tongue' }, snake);
  make('use', { href: '#snake-shape', class: 'snake-fill' }, snake);
  var scales = make('path', { class: 'snake-scales', 'clip-path': 'url(#snake-clip)' }, snake);
  make('use', { href: '#snake-shape', class: 'snake-edge' }, snake);
  var eyes = [0, 1].map(function () {
    return {
      white: make('circle', { class: 'snake-eye' }, snake),
      pupil: make('circle', { class: 'snake-pupil' }, snake)
    };
  });

  /* ---------- mesures (recalculées au redimensionnement seulement) ---------- */
  var geo = { width: 0, height: 0, cx: 0, amp: 0, lambda: 1, half: 0, length: 0 };
  var view = { railTop: 0, height: 0, maxScroll: 0 };
  var targets = Array.prototype.slice.call(document.querySelectorAll('[data-node]'));
  var nodes = [];

  function xAt(y) {
    return geo.cx + geo.amp * Math.sin((y / geo.lambda) * 2 * Math.PI);
  }

  function measure() {
    var box = rail.getBoundingClientRect();
    var rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

    geo.width = box.width;
    geo.height = box.height;
    geo.cx = box.width / 2;
    geo.amp = box.width * 0.27;
    geo.half = clamp(box.width * 0.08, 4.5, 13);
    geo.lambda = clamp(box.width * 2.1, 150, 320);
    view.railTop = box.top + window.scrollY;
    view.height = window.innerHeight;
    view.maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    geo.length = clamp(view.height * 0.62, 260, 640);

    var positions = targets.map(function (el) {
      var r = el.getBoundingClientRect();
      if (el.getAttribute('data-node') === 'mid') return r.top - box.top + r.height / 2;
      // section : repère à la hauteur de la première ligne du titre
      return r.top - box.top + parseFloat(getComputedStyle(el).paddingTop) + 0.75 * rem;
    });

    svg.setAttribute('viewBox', '0 0 ' + fmt(geo.width) + ' ' + fmt(geo.height));

    var d = '';
    for (var y = 0; y <= geo.height; y += 6) d += (y ? 'L' : 'M') + fmt(xAt(y)) + ' ' + y;
    track.setAttribute('d', d);

    var size = clamp(geo.width * 0.11, 7, 14);
    while (nodeLayer.firstChild) nodeLayer.removeChild(nodeLayer.firstChild);
    nodes = positions.map(function (y) {
      var rect = make('rect', {
        class: 'rail-node',
        x: fmt(xAt(y) - size / 2),
        y: fmt(y - size / 2),
        width: fmt(size),
        height: fmt(size),
        rx: fmt(size * 0.22)
      }, nodeLayer);
      return { y: y, el: rect, on: false };
    });
  }

  /* ---------- dessin du serpent, tête à la hauteur headY ---------- */
  function halfWidth(fromTail, total) {
    var h = geo.half;
    var keys = [
      [0, 0.05 * h], [0.42 * total, h], [total - 7.5 * h, h], [total - 5.4 * h, 0.74 * h],
      [total - 3 * h, 1.22 * h], [total - 1.1 * h, 0.95 * h], [total, 0]
    ];
    for (var i = 1; i < keys.length; i++) {
      if (fromTail <= keys[i][0]) {
        var span = keys[i][0] - keys[i - 1][0];
        var u = span > 0 ? (fromTail - keys[i - 1][0]) / span : 1;
        if (i === keys.length - 1) return keys[i - 1][1] * Math.sqrt(Math.max(0, 1 - u * u));
        return keys[i - 1][1] + (keys[i][1] - keys[i - 1][1]) * (1 - Math.cos(Math.PI * u)) / 2;
      }
    }
    return 0;
  }

  function draw(headY) {
    var h = geo.half;
    // points de la tête vers la queue, avec la distance parcourue depuis la tête
    var pts = [];
    var y = headY;
    var px = xAt(y);
    var dist = 0;
    pts.push([px, y, 0]);
    while (dist < geo.length && y > 0) {
      var step = dist < 1.4 * h ? 0.8 : 2.5;
      y -= step;
      var nx = xAt(y);
      dist += Math.sqrt((nx - px) * (nx - px) + step * step);
      px = nx;
      pts.push([nx, y, dist]);
    }
    var total = dist;
    var count = pts.length;
    if (count < 4) return;

    var left = [];
    var right = [];
    var normals = [];
    for (var i = 0; i < count; i++) {
      var a = pts[Math.max(0, i - 1)];
      var b = pts[Math.min(count - 1, i + 1)];
      var tx = a[0] - b[0];
      var ty = a[1] - b[1];
      var len = Math.sqrt(tx * tx + ty * ty) || 1;
      var nxn = -ty / len;
      var nyn = tx / len;
      var w = halfWidth(total - pts[i][2], total);
      normals.push([nxn, nyn, tx / len, ty / len]);
      left.push([pts[i][0] + nxn * w, pts[i][1] + nyn * w]);
      right.push([pts[i][0] - nxn * w, pts[i][1] - nyn * w]);
    }

    var d = 'M' + fmt(left[0][0]) + ' ' + fmt(left[0][1]);
    for (i = 1; i < count; i++) d += 'L' + fmt(left[i][0]) + ' ' + fmt(left[i][1]);
    for (i = count - 1; i >= 0; i--) d += 'L' + fmt(right[i][0]) + ' ' + fmt(right[i][1]);
    shape.setAttribute('d', d + 'Z');

    // écailles : deux familles de diagonales qui suivent le corps
    var every = Math.max(2, Math.round(h / 3.4));
    var reach = Math.max(2, Math.round(h / 2.4));
    var s = '';
    for (i = 0; i + reach < count; i += every) {
      if (pts[i][2] < 5.6 * h || total - pts[i + reach][2] < 0.08 * total) continue;
      s += 'M' + fmt(left[i][0]) + ' ' + fmt(left[i][1]) + 'L' + fmt(right[i + reach][0]) + ' ' + fmt(right[i + reach][1]);
      s += 'M' + fmt(right[i][0]) + ' ' + fmt(right[i][1]) + 'L' + fmt(left[i + reach][0]) + ' ' + fmt(left[i + reach][1]);
    }
    scales.setAttribute('d', s);

    // yeux, vus du dessus
    var e = 0;
    while (e < count - 1 && pts[e][2] < 2.7 * h) e++;
    [1, -1].forEach(function (side, index) {
      var ex = pts[e][0] + normals[e][0] * 0.62 * h * side;
      var ey = pts[e][1] + normals[e][1] * 0.62 * h * side;
      eyes[index].white.setAttribute('cx', fmt(ex));
      eyes[index].white.setAttribute('cy', fmt(ey));
      eyes[index].white.setAttribute('r', fmt(0.24 * h));
      eyes[index].pupil.setAttribute('cx', fmt(ex));
      eyes[index].pupil.setAttribute('cy', fmt(ey));
      eyes[index].pupil.setAttribute('r', fmt(0.11 * h));
    });

    // langue fourchue
    var dirX = normals[1][2];
    var dirY = normals[1][3];
    var tipX = pts[0][0];
    var tipY = pts[0][1];
    var midX = tipX + dirX * 1.3 * h;
    var midY = tipY + dirY * 1.3 * h;
    var cos = Math.cos(0.5);
    var sin = Math.sin(0.5);
    var fork = 0.8 * h;
    tongue.setAttribute('d',
      'M' + fmt(tipX) + ' ' + fmt(tipY) + 'L' + fmt(midX) + ' ' + fmt(midY) +
      'L' + fmt(midX + (dirX * cos - dirY * sin) * fork) + ' ' + fmt(midY + (dirX * sin + dirY * cos) * fork) +
      'M' + fmt(midX) + ' ' + fmt(midY) +
      'L' + fmt(midX + (dirX * cos + dirY * sin) * fork) + ' ' + fmt(midY + (-dirX * sin + dirY * cos) * fork));
  }

  /* ---------- suivi du scroll ---------- */
  function headPosition() {
    var end = geo.height - 1.2 * geo.half - 6;
    var start = Math.min(end, Math.max(view.height * 0.42 - view.railTop, 140));
    var progress = view.maxScroll > 8 ? clamp(window.scrollY / view.maxScroll, 0, 1) : 1;
    return { start: start, at: start + (end - start) * progress };
  }

  function update() {
    scheduled = false;
    if (!geo.height) return;
    var head = headPosition();
    draw(reduceMotion ? head.start : head.at);
    for (var i = 0; i < nodes.length; i++) {
      var on = head.at >= nodes[i].y - 2;
      if (on !== nodes[i].on) {
        nodes[i].on = on;
        nodes[i].el.setAttribute('class', on ? 'rail-node on' : 'rail-node');
      }
    }
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  }
  function refresh() {
    measure();
    schedule();
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', refresh);
  if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(rail);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  refresh();
})();
