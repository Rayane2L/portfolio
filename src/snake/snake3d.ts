// Serpent 3D (modèle Blender d'Atheris hispida) courbé en temps réel le long du rail.
// Le modèle est droit (queue en x=0, museau en x=1) ; un shader de sommets le plie
// sur une courbe stockée dans une petite texture, recalculée à chaque image.
import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  DirectionalLight,
  FloatType,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  NearestFilter,
  PerspectiveCamera,
  RGBAFormat,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  ACESFilmicToneMapping,
  DoubleSide,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { Rail } from './rail';

const SAMPLES = 256;
const EXTEND = 1.08; // la courbe dépasse du museau pour la langue
const TONGUE_OUT = 0.05; // sortie de la langue, en longueur de corps
const FOV = 30;
// épaisseur du corps par rapport au modèle : plus trapu que nature pour que les écailles se lisent
const THICK_MAX = 1.7;

export interface Snake3D {
  destroy: () => void;
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

/** Convertit les attributs quantifiés en float et applique la transformation du nœud glTF. */
function bakeGeometry(mesh: Mesh): BufferGeometry {
  const src = mesh.geometry;
  const geo = new BufferGeometry();
  for (const name of ['position', 'normal', 'color'] as const) {
    const attr = src.getAttribute(name);
    if (!attr) continue;
    const size = name === 'color' ? 3 : 3;
    const out = new Float32Array(attr.count * size);
    for (let i = 0; i < attr.count; i++) {
      out[i * size] = attr.getX(i);
      out[i * size + 1] = attr.getY(i);
      out[i * size + 2] = attr.getZ(i);
    }
    geo.setAttribute(name, new BufferAttribute(out, size));
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
  uThick: { value: number };
}

function makeMaterial(uniforms: Uniforms, isTongue: boolean): MeshStandardMaterial {
  const mat = new MeshStandardMaterial({
    vertexColors: true,
    roughness: isTongue ? 0.35 : 0.42,
    metalness: 0.18,
    side: DoubleSide,
  });
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
uniform float uThick;
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
        `vec3 transformed = pP + (pB * position.y - pN * position.z) * uLen * uThick * breath;`,
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

export async function createSnake3D(rail: Rail, host: HTMLElement, onReady: () => void): Promise<Snake3D> {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(new URL('./models/atheris.glb', document.baseURI).href);

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'pointer-events-none fixed top-0 z-10 opacity-0 transition-opacity duration-700 [filter:drop-shadow(0_0_6px_rgb(47_129_247/0.55))]';
  host.appendChild(canvas);

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
  const uniforms: Uniforms = { uPath: { value: pathTex }, uLen: { value: 400 }, uBreath: { value: 0 }, uTongue: { value: 0 }, uThick: { value: THICK_MAX } };

  const meshes: Mesh[] = [];
  gltf.scene.traverse((obj) => {
    if ((obj as Mesh).isMesh) meshes.push(obj as Mesh);
  });
  for (const src of meshes) {
    const isTongue = src.name.toLowerCase().includes('tongue');
    const mesh = new Mesh(bakeGeometry(src), makeMaterial(uniforms, isTongue));
    mesh.frustumCulled = false;
    mesh.renderOrder = isTongue ? 0 : 1;
    scene.add(mesh);
  }

  const camera = new PerspectiveCamera(FOV, 1, 1, 10000);

  /* ---------- courbe ---------- */
  const pts: Vector3[] = [];
  const tmpT = new Vector3();
  const tmpN = new Vector3();
  const zAxis = new Vector3(0, 0, 1);
  let size = { w: 0, h: 0, left: 0 };
  let shownHead = NaN;
  let shownFocus = 0;

  function resize() {
    const f = rail.frame();
    const w = Math.ceil(f.rect.width + 24);
    const h = window.innerHeight;
    if (w === size.w && h === size.h && f.rect.left === size.left) return;
    size = { w, h, left: f.rect.left };
    canvas.style.left = `${f.rect.left}px`;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const dist = h / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);
    camera.position.set(w / 2, -h / 2, dist);
    camera.lookAt(w / 2, -h / 2, 0);
    camera.near = dist * 0.5;
    camera.far = dist * 2;
    camera.updateProjectionMatrix();
  }

  /** Construit la courbe de la queue au museau, en pixels de canvas (y vers le bas -> -y). */
  function buildPath(headY: number, focus: number) {
    const f = rail.frame();
    const len = f.geo.length;
    uniforms.uLen.value = len;
    // le corps doit tenir dans le rail : épaisseur limitée par sa largeur
    uniforms.uThick.value = Math.min(THICK_MAX, (f.geo.width * 0.21) / (0.045 * len));
    const top = f.rect.top;
    const turnLen = len * 0.17;

    // points du museau vers la queue le long de la piste
    const back: Vector3[] = [];
    let y = headY;
    let dist = 0;
    let neckIdx = -1;
    let prev = new Vector3(f.xAt(y), -(y + top), 0);
    back.push(prev);
    while (dist < len + 4) {
      y -= 2;
      const p = new Vector3(f.xAt(y), -(y + top), 0);
      dist += p.distanceTo(prev);
      back.push(p);
      prev = p;
      if (neckIdx < 0 && dist >= turnLen) neckIdx = back.length - 1;
    }
    // la tête quitte la piste : elle se tourne vers le titre de la section et se redresse
    const neck = back[Math.max(1, neckIdx)];
    const neckDir = back[Math.max(0, neckIdx - 1)].clone().sub(neck).normalize();
    const turned = new Vector3(1, -0.1, 0.65).normalize();
    const head: Vector3[] = [neck.clone()];
    const steps = 24;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const k = focus * t * t * (3 - 2 * t);
      const dir = neckDir.clone().lerp(turned, k).normalize();
      head.push(head[i - 1].clone().addScaledVector(dir, turnLen / steps));
    }
    // queue -> cou -> museau
    pts.length = 0;
    for (let i = back.length - 1; i > Math.max(1, neckIdx); i--) pts.push(back[i]);
    pts.push(...head);

    // abscisses curvilignes cumulées depuis la queue
    const acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const total = acc[acc.length - 1];
    const lastDir = pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize();
    // décale pour que la courbe se termine exactement au museau (s = len)
    const shift = total - len;

    let j = 0;
    for (let i = 0; i < SAMPLES; i++) {
      const s = (i / (SAMPLES - 1)) * len * EXTEND + shift;
      let p: Vector3;
      if (s >= total) {
        p = pts[pts.length - 1].clone().addScaledVector(lastDir, s - total);
        tmpT.copy(lastDir);
      } else {
        while (j < acc.length - 2 && acc[j + 1] < s) j++;
        const seg = acc[j + 1] - acc[j] || 1;
        const t = clamp01((s - acc[j]) / seg);
        p = pts[j].clone().lerp(pts[j + 1], t);
        const a = pts[Math.max(0, j - 2)];
        const b = pts[Math.min(pts.length - 1, j + 3)];
        tmpT.copy(b).sub(a).normalize();
      }
      tmpN.crossVectors(zAxis, tmpT).normalize();
      const o = i * 4;
      pathData.set([p.x, p.y, p.z], o);
      pathData.set([tmpT.x, tmpT.y, tmpT.z], SAMPLES * 4 + o);
      pathData.set([tmpN.x, tmpN.y, tmpN.z], SAMPLES * 8 + o);
    }
    pathTex.needsUpdate = true;
  }

  /* ---------- animation ---------- */
  let raf = 0;
  let last = performance.now();
  let tongueT = -1;
  let nextFlick = performance.now() + 1500;
  let ready = false;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    resize();
    const f = rail.frame();
    const ease = reduceMotion ? 1 : 1 - Math.exp(-dt * 9);
    shownHead = Number.isNaN(shownHead) ? f.headY : shownHead + (f.headY - shownHead) * ease;
    shownFocus += (f.focus - shownFocus) * (reduceMotion ? 1 : 1 - Math.exp(-dt * 5));
    buildPath(shownHead, shownFocus);

    if (!reduceMotion) {
      uniforms.uBreath.value = 0.035 * Math.sin(now / 1000 * 1.5);
      if (tongueT < 0 && now > nextFlick) tongueT = 0;
      if (tongueT >= 0) {
        tongueT += dt / 0.7;
        // deux battements rapides, comme un serpent qui « goûte » l'air
        const out = Math.sin(Math.min(1, tongueT) * Math.PI);
        const flutter = 0.82 + 0.18 * Math.sin(tongueT * Math.PI * 8);
        uniforms.uTongue.value = TONGUE_OUT * out * flutter;
        if (tongueT >= 1) {
          tongueT = -1;
          uniforms.uTongue.value = 0;
          nextFlick = now + 2500 + Math.random() * 4000;
        }
      }
    }
    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      canvas.classList.remove('opacity-0');
      onReady();
    }
    if (reduceMotion) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  const unsubscribe = rail.subscribe(() => {
    if (!raf) raf = requestAnimationFrame(frame);
  });
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      unsubscribe();
      renderer.dispose();
      canvas.remove();
    },
  };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
