// Serpent 3D (modèle Blender d'Atheris hispida) qui se promène sur toute la page, derrière le contenu.
// Le modèle est droit (queue en x=0, museau en x=1) ; un shader de sommets le plie le long
// de la trace laissée par sa tête, stockée dans une petite texture recalculée à chaque image.
import {
  ACESFilmicToneMapping,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  FloatType,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  NearestFilter,
  Object3D,
  PerspectiveCamera,
  RGBAFormat,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const SAMPLES = 256;
const EXTEND = 1.12; // la courbe dépasse du museau pour la langue
const TONGUE_OUT = 0.075; // sortie de la langue, en longueur de corps
const FOV = 30;
const THICK = 1.3; // épaisseur du corps par rapport au modèle
const STEP = 3; // espacement des points de la trace (px)
const STORE_KEY = 'atheris-trace';

export interface Snake3D {
  destroy: () => void;
}

interface P {
  x: number;
  y: number;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const smooth = (t: number) => {
  const u = clamp(t, 0, 1);
  return u * u * (3 - 2 * u);
};
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Convertit les attributs quantifiés en float et applique la transformation du nœud glTF. */
function bakeGeometry(mesh: Mesh): BufferGeometry {
  const src = mesh.geometry;
  const geo = new BufferGeometry();
  for (const name of ['position', 'normal', 'color'] as const) {
    const attr = src.getAttribute(name);
    if (!attr) continue;
    const out = new Float32Array(attr.count * 3);
    for (let i = 0; i < attr.count; i++) {
      out[i * 3] = attr.getX(i);
      out[i * 3 + 1] = attr.getY(i);
      out[i * 3 + 2] = attr.getZ(i);
    }
    geo.setAttribute(name, new BufferAttribute(out, 3));
  }
  if (src.index) geo.setIndex(src.index.clone());
  mesh.updateWorldMatrix(true, false);
  geo.applyMatrix4(mesh.matrixWorld);
  return geo;
}

interface Uniforms {
  uPath: { value: DataTexture };
  uLen: { value: number };
  uBreath: { value: number };
  uTongue: { value: number };
  uFlutter: { value: number };
}

function makeMaterial(uniforms: Uniforms, isTongue: boolean): MeshStandardMaterial {
  const mat = new MeshStandardMaterial({ vertexColors: true, roughness: isTongue ? 0.35 : 0.42, metalness: 0.18, side: DoubleSide });
  // three.js met en cache les shaders d'après le texte de onBeforeCompile, identique pour le corps
  // et la langue : sans clé distincte, la langue réutiliserait le shader du corps
  mat.customProgramCacheKey = () => (isTongue ? 'atheris-tongue' : 'atheris-body');
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D uPath;
uniform float uLen;
uniform float uBreath;
uniform float uTongue;
uniform float uFlutter;
vec3 pathAt(int row, float s) {
  float f = clamp(s / (uLen * ${EXTEND.toFixed(2)}), 0.0, 1.0) * ${(SAMPLES - 1).toFixed(1)};
  int i = int(floor(f));
  int j = min(i + 1, ${SAMPLES - 1});
  return mix(texelFetch(uPath, ivec2(i, row), 0).xyz, texelFetch(uPath, ivec2(j, row), 0).xyz, fract(f));
}`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `float bodyX = position.x${isTongue ? ' + uTongue' : ''};
float sArc = bodyX * uLen;
vec3 pP = pathAt(0, sArc);
vec3 pT = normalize(pathAt(1, sArc));
vec3 pN = normalize(pathAt(2, sArc));
vec3 pB = cross(pT, pN);
// respiration : le milieu du corps gonfle légèrement
float breath = 1.0 + uBreath * smoothstep(0.15, 0.5, bodyX) * (1.0 - smoothstep(0.75, 0.9, bodyX));
vec3 objectNormal = normalize(pT * normal.x + pB * normal.y - pN * normal.z);`,
      )
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = pP + (pB * position.y - pN * position.z) * uLen * ${THICK.toFixed(2)} * breath;${
          isTongue
            ? `
// sifflement : la langue fouette de gauche à droite, d'autant plus vers les pointes
float whip = max(0.0, bodyX - 0.99);
transformed += pN * uFlutter * whip * whip * uLen * 6.0;`
            : ''
        }`,
      );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
// liseré lumineux sur les bords, comme le néon de la charte
float rim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.2);
totalEmissiveRadiance += vec3(0.18, 0.5, 1.0) * rim * ${isTongue ? '0.6' : '1.1'};`,
    );
  };
  return mat;
}

/* ------------------------------------------------------------------ comportement */

/** Titres de sections visibles : le serpent va parfois les « regarder ». */
function visibleTitles(): DOMRect[] {
  const out: DOMRect[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('section[data-node] h2, h1[data-node]')) {
    const r = el.getBoundingClientRect();
    if (r.bottom > 60 && r.top < window.innerHeight - 60) out.push(r);
  }
  return out;
}

class Wanderer {
  /** trace de la tête, du museau vers l'arrière, en px de fenêtre */
  trail: P[] = [];
  heading = 0;
  speed = 0;
  phase = 0;
  target: P = { x: 0, y: 0 };
  /** titre regardé à l'arrivée (null : simple point de passage) */
  look: P | null = null;
  pause = 0;
  sinceTarget = 0;
  focus = 0;

  constructor(
    public w: number,
    public h: number,
    public len: number,
  ) {}

  get head() {
    return this.trail[0];
  }

  spawn() {
    // entre par le bord gauche, à mi-hauteur
    this.heading = rand(-0.25, 0.25);
    const y = this.h * rand(0.45, 0.7);
    this.trail = [];
    for (let d = 0; d <= this.len + 40; d += STEP) this.trail.push({ x: this.w * 0.06 - d, y: y + Math.sin(d / 60) * 12 });
    this.pickTarget();
  }

  restore(saved: { trail: [number, number][]; heading: number; w: number; h: number }) {
    const sx = this.w / saved.w;
    const sy = this.h / saved.h;
    this.trail = saved.trail.map(([x, y]) => ({ x: x * sx, y: y * sy }));
    this.heading = saved.heading;
    this.speed = 40;
    this.pickTarget();
  }

  pickTarget() {
    const m = Math.min(this.w, this.h) * 0.1;
    this.sinceTarget = 0;
    const titles = visibleTitles();
    if (titles.length && Math.random() < 0.4) {
      // s'approcher d'un titre par la gauche, puis le regarder
      const t = titles[Math.floor(Math.random() * titles.length)];
      this.target = { x: clamp(t.left - this.len * 0.12, m, this.w - m), y: clamp(t.top + t.height / 2 + rand(20, 60), m, this.h - m) };
      this.look = { x: t.left + Math.min(t.width, 160) / 2, y: t.top + t.height / 2 };
    } else {
      this.target = { x: rand(m, this.w - m), y: rand(m, this.h - m) };
      this.look = null;
    }
  }

  resize(w: number, h: number, len: number) {
    const sx = w / this.w;
    const sy = h / this.h;
    if (Math.abs(sx - 1) > 0.02 || Math.abs(sy - 1) > 0.02) {
      for (const p of this.trail) {
        p.x *= sx;
        p.y *= sy;
      }
      this.pickTarget();
    }
    this.w = w;
    this.h = h;
    this.len = len;
  }

  update(dt: number) {
    const head = this.head;
    this.sinceTarget += dt;
    const dx = this.target.x - head.x;
    const dy = this.target.y - head.y;
    const dist = Math.hypot(dx, dy);

    if (this.pause > 0) {
      this.pause -= dt;
      this.speed += (0 - this.speed) * (1 - Math.exp(-dt * 4));
      this.focus += ((this.look ? 1 : 0) - this.focus) * (1 - Math.exp(-dt * 3));
      if (this.pause <= 0) this.pickTarget();
    } else {
      this.focus += (0 - this.focus) * (1 - Math.exp(-dt * 4));
      const cruise = clamp(this.len * 0.17, 45, 95) * (dist < 120 ? 0.55 + 0.45 * (dist / 120) : 1);
      this.speed += (cruise - this.speed) * (1 - Math.exp(-dt * 1.5));
      const desired = Math.atan2(dy, dx);
      const turn = clamp(wrapAngle(desired - this.heading), -1.5 * dt, 1.5 * dt);
      this.heading += turn;
      if (dist < 24 || this.sinceTarget > 14) {
        this.pause = this.look ? rand(2.5, 4.5) : rand(0.6, 2.2);
        if (dist >= 24) this.pickTarget();
      }
    }

    const move = this.speed * dt;
    if (move < 0.01) return;
    // ondulation latérale : le cap oscille avec la distance parcourue
    this.phase += move / 95;
    const h = this.heading + 0.45 * Math.sin(this.phase * Math.PI * 2);
    const next = { x: head.x + Math.cos(h) * move, y: head.y + Math.sin(h) * move };
    const prev = this.trail[1];
    if (prev && Math.hypot(next.x - prev.x, next.y - prev.y) < STEP) this.trail[0] = next;
    else this.trail.unshift(next);
    const keep = Math.ceil((this.len + 40) / STEP) + 2;
    if (this.trail.length > keep) this.trail.length = keep;
  }

  save() {
    return { trail: this.trail.map((p): [number, number] => [Math.round(p.x), Math.round(p.y)]), heading: this.heading, w: this.w, h: this.h };
  }
}

/* ------------------------------------------------------------------ rendu */

export async function createSnake3D(host: HTMLElement): Promise<Snake3D> {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(new URL('./models/atheris.glb', document.baseURI).href);

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  // derrière le contenu (z-index 0, le contenu est au-dessus), au-dessus du fond
  canvas.className = 'pointer-events-none fixed inset-0 z-0 h-full w-full opacity-0 transition-opacity duration-300';
  host.appendChild(canvas);

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new Scene();
  scene.add(new HemisphereLight(new Color('#a5d6ff'), new Color('#0c2d6b'), 1.1));
  scene.add(new AmbientLight(new Color('#1f6feb'), 0.25));
  const key = new DirectionalLight(new Color('#dcefff'), 2.4);
  key.position.set(-0.6, 0.8, 1.4);
  scene.add(key);
  const rimLight = new DirectionalLight(new Color('#58a6ff'), 1.6);
  rimLight.position.set(0.9, -0.6, 0.4);
  scene.add(rimLight);

  const pathData = new Float32Array(SAMPLES * 3 * 4);
  const pathTex = new DataTexture(pathData, SAMPLES, 3, RGBAFormat, FloatType);
  pathTex.minFilter = pathTex.magFilter = NearestFilter;
  pathTex.needsUpdate = true;
  const uniforms: Uniforms = { uPath: { value: pathTex }, uLen: { value: 400 }, uBreath: { value: 0 }, uTongue: { value: 0 }, uFlutter: { value: 0 } };

  const meshes: Mesh[] = [];
  gltf.scene.traverse((obj) => {
    if ((obj as Mesh).isMesh) meshes.push(obj as Mesh);
  });
  for (const src of meshes) {
    // après compression, le nom « Tongue » peut être porté par un nœud parent
    let isTongue = false;
    for (let o: Object3D | null = src; o; o = o.parent) if (/tongue/i.test(o.name)) isTongue = true;
    const mesh = new Mesh(bakeGeometry(src), makeMaterial(uniforms, isTongue));
    mesh.name = isTongue ? 'Tongue' : 'Atheris';
    mesh.frustumCulled = false;
    scene.add(mesh);
  }

  const camera = new PerspectiveCamera(FOV, 1, 1, 10000);
  let size = { w: 0, h: 0 };
  const bodyLength = (w: number, h: number) => clamp(Math.min(w * 0.42, h * 0.6), 200, 520);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w === size.w && h === size.h) return false;
    size = { w, h };
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const dist = h / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);
    camera.position.set(w / 2, -h / 2, dist);
    camera.lookAt(w / 2, -h / 2, 0);
    camera.near = dist * 0.5;
    camera.far = dist * 2;
    camera.updateProjectionMatrix();
    return true;
  }
  resize();

  const snake = new Wanderer(size.w, size.h, bodyLength(size.w, size.h));
  let saved: ReturnType<Wanderer['save']> | null = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? 'null');
  } catch {
    saved = null;
  }
  if (saved && Array.isArray(saved.trail) && saved.trail.length > 10) snake.restore(saved);
  else snake.spawn();
  if (reduceMotion && !saved) {
    // immobile : posé en S dans le bas de la page
    snake.trail = [];
    for (let d = 0; d <= snake.len + 40; d += STEP) snake.trail.push({ x: size.w * 0.35 - d * 0.8, y: size.h * 0.78 + Math.sin(d / 70) * 30 });
  }
  const persist = () => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(snake.save()));
    } catch {
      /* stockage indisponible : le serpent repartira du bord */
    }
  };
  window.addEventListener('pagehide', persist);

  /* ---------- courbe envoyée au shader ---------- */
  const tmpT = new Vector3();
  const tmpN = new Vector3();
  const zAxis = new Vector3(0, 0, 1);

  function buildPath() {
    const len = snake.len;
    uniforms.uLen.value = len;
    const turnLen = len * 0.16;

    // trace du museau vers la queue, en coordonnées 3D (y vers le haut)
    const back: Vector3[] = [];
    let acc = 0;
    let neckIdx = -1;
    for (let i = 0; i < snake.trail.length; i++) {
      const p = new Vector3(snake.trail[i].x, -snake.trail[i].y, 0);
      if (i > 0) acc += p.distanceTo(back[i - 1]);
      back.push(p);
      if (neckIdx < 0 && acc >= turnLen) neckIdx = i;
      if (acc > len + 8) break;
    }
    // trace trop courte (début) : prolonger en ligne droite vers l'arrière
    if (acc < len + 8 && back.length > 1) {
      const dir = back[back.length - 1].clone().sub(back[back.length - 2]).normalize();
      while (acc < len + 8) {
        back.push(back[back.length - 1].clone().addScaledVector(dir, STEP));
        acc += STEP;
        if (neckIdx < 0 && acc >= turnLen) neckIdx = back.length - 1;
      }
    }
    neckIdx = Math.max(1, neckIdx);

    // la tête se tourne vers le titre regardé et se redresse
    const neck = back[neckIdx];
    const neckDir = back[neckIdx - 1].clone().sub(neck).normalize();
    let lookDir = neckDir.clone();
    if (snake.look) {
      lookDir = new Vector3(snake.look.x - snake.head.x, -(snake.look.y - snake.head.y), 0).normalize();
      lookDir.z = 0.7;
      lookDir.normalize();
    }
    const pts: Vector3[] = [];
    for (let i = back.length - 1; i > neckIdx; i--) pts.push(back[i]);
    const steps = 24;
    let cur = neck.clone();
    pts.push(cur);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const dir = neckDir.clone().lerp(lookDir, snake.focus * smooth(t)).normalize();
      cur = cur.clone().addScaledVector(dir, turnLen / steps);
      pts.push(cur);
    }

    const accs = [0];
    for (let i = 1; i < pts.length; i++) accs.push(accs[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const total = accs[accs.length - 1];
    const lastDir = pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize();
    const shift = total - len;

    let j = 0;
    for (let i = 0; i < SAMPLES; i++) {
      const s = (i / (SAMPLES - 1)) * len * EXTEND + shift;
      let p: Vector3;
      if (s >= total) {
        p = pts[pts.length - 1].clone().addScaledVector(lastDir, s - total);
        tmpT.copy(lastDir);
      } else {
        while (j < accs.length - 2 && accs[j + 1] < s) j++;
        const seg = accs[j + 1] - accs[j] || 1;
        p = pts[j].clone().lerp(pts[j + 1], clamp((s - accs[j]) / seg, 0, 1));
        tmpT.copy(pts[Math.min(pts.length - 1, j + 3)]).sub(pts[Math.max(0, j - 2)]).normalize();
      }
      tmpN.crossVectors(zAxis, tmpT).normalize();
      const o = i * 4;
      pathData.set([p.x, p.y, p.z], o);
      pathData.set([tmpT.x, tmpT.y, tmpT.z], SAMPLES * 4 + o);
      pathData.set([tmpN.x, tmpN.y, tmpN.z], SAMPLES * 8 + o);
    }
    pathTex.needsUpdate = true;
  }

  /* ---------- boucle ---------- */
  let raf = 0;
  let last = performance.now();
  let tongueT = -1;
  let flicks = 2;
  let nextFlick = performance.now() + 1200;
  let shown = false;

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (resize()) snake.resize(size.w, size.h, bodyLength(size.w, size.h));
    if (!reduceMotion) {
      snake.update(dt);
      uniforms.uBreath.value = 0.035 * Math.sin((now / 1000) * 1.5);
      // sifflement : 2 à 3 coups de langue rapides, la fourche vibrant de gauche à droite ;
      // plus fréquent à l'arrêt, comme un serpent qui « goûte » l'air
      if (tongueT < 0 && now > nextFlick) {
        tongueT = 0;
        flicks = Math.random() < 0.5 ? 2 : 3;
      }
      if (tongueT >= 0) {
        tongueT += dt / (0.26 * flicks);
        const k = Math.min(1, tongueT) * flicks;
        const out = Math.pow(Math.sin(Math.PI * (k % 1)), 0.6);
        uniforms.uTongue.value = TONGUE_OUT * out;
        uniforms.uFlutter.value = Math.sin(now / 1000 * Math.PI * 2 * 14) * out;
        if (tongueT >= 1) {
          tongueT = -1;
          uniforms.uTongue.value = 0;
          uniforms.uFlutter.value = 0;
          nextFlick = now + (snake.pause > 0 ? rand(700, 1800) : rand(2200, 5000));
        }
      }
    }
    buildPath();
    renderer.render(scene, camera);
    if (!shown) {
      shown = true;
      canvas.classList.remove('opacity-0');
    }
    raf = reduceMotion ? 0 : requestAnimationFrame(frame);
  }
  const onResize = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };
  window.addEventListener('resize', onResize);
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      persist();
      window.removeEventListener('pagehide', persist);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      canvas.remove();
    },
  };
}
