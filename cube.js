import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass }     from 'three/addons/postprocessing/ShaderPass.js';

// Light-to-dense ramp. Ten steps give the faces real shading instead of 3 tones.
const CHARACTERS      = ' .:-=+*#%@';
const DAMPING_FACTOR  = 0.25;
const AUTO_SPIN_SPEED = 0.003;
const DRAG_SENSITIVITY = 85;
// 3 so iPhone Pro Max (3x) gets a native buffer instead of an upscaled 2x one.
const MAX_DPR         = 3;
const ENTER_DURATION  = 1800;

// Glyph cell in CSS px. ~60 columns across the canvas: enough to resolve the
// face on the texture, while each glyph still renders at 8-15 device px.
function getCellSize(w) {
  if (w < 260) return 4;
  return 4.5;
}

// Ink colour follows the footer text so the cube reads as part of the page,
// not a rainbow sticker. GeoCities mode still blends to the gradient.
function footerInk(el) {
  const c = getComputedStyle(el.closest('footer') || document.body).color;
  const m = c.match(/[\d.]+/g);
  if (!m) return new THREE.Color(0xe8e6e1);
  return new THREE.Color(+m[0] / 255, +m[1] / 255, +m[2] / 255);
}

function createCharactersTexture(width, height, characters) {
  const canvas = document.createElement('canvas');
  const dpr = Math.min(MAX_DPR, devicePixelRatio || 1);
  const SIZE = Math.max(width, height);
  const MAX_PER_ROW = 16;
  const CELL = SIZE / MAX_PER_ROW;
  canvas.width = canvas.height = SIZE * dpr;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(dpr, dpr);
  ctx.font = `700 ${CELL}px ui-monospace, Menlo, Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';

  for (let i = 0; i < characters.length; i++) {
    const col = i % MAX_PER_ROW;
    const row = Math.floor(i / MAX_PER_ROW);
    const m = ctx.measureText(characters[i]);
    const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    const adj = (CELL - h) / 2;
    ctx.fillText(characters[i], col * CELL + CELL / 2, row * CELL + CELL / 2 + adj / 2);
  }

  const tex = new THREE.CanvasTexture(
    canvas, undefined,
    THREE.RepeatWrapping, THREE.RepeatWrapping,
    THREE.LinearFilter, THREE.LinearFilter,
    // UnsignedByte, not Float: float textures are not linearly filterable on
    // iOS WebGL, which smeared or blanked the glyphs on iPhone.
    THREE.RGBAFormat, THREE.UnsignedByteType
  );
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

const ASCIIShader = {
  uniforms: {
    tDiffuse:         { value: null },
    uCharacters:      { value: null },
    uCharactersCount: { value: 0 },
    uCellSize:        { value: 8 },
    uColor:           { value: new THREE.Color('#ffffff') },
    uInvert:          { value: true },
    uTime:            { value: 0 },
    uGradientMix:     { value: 0 },
    uOpacity:         { value: 0 },
    resolution:       { value: new THREE.Vector2() },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D uCharacters;
    uniform float uCharactersCount;
    uniform float uCellSize;
    uniform vec3  uColor;
    uniform float uTime;
    uniform float uGradientMix;
    uniform bool  uInvert;
    uniform vec2  resolution;
    uniform float uOpacity;
    varying vec2  vUv;

    const vec2 SIZE = vec2(16.0, 16.0);

    float greyscale(vec3 c) {
      return dot(c, vec3(0.2126, 0.7152, 0.0722));
    }

    vec3 rotatingGradient(float t, vec2 uv) {
      vec3 a = vec3(0.5), b = vec3(0.5), c = vec3(1.0), d = vec3(0.0, 0.33, 0.67);
      float uvF = dot(uv - 0.5, uv - 0.5);
      vec3 grad = a + b * cos(6.28318 * (c * (t + uvF * 2.0) + d));
      // Light radial falloff only: at 0.5 the corners went near-black and the
      // cube's silhouette disappeared into the footer.
      vec3 c2 = mix(grad, vec3(1.0 - length(uv - 0.5) * 2.0), 0.2);
      return max(c2, vec3(0.38));
    }

    float vignette(vec2 uv) {
      return 1.0 - 0.35 * smoothstep(0.25, 0.7, length(uv - 0.5));
    }

    float sharpen(sampler2D tex, vec2 uv, vec2 ts) {
      float center = texture2D(tex, uv).r;
      float top    = texture2D(tex, uv + vec2(0, ts.y)).r;
      float bottom = texture2D(tex, uv - vec2(0, ts.y)).r;
      float left   = texture2D(tex, uv - vec2(ts.x, 0)).r;
      float right  = texture2D(tex, uv + vec2(ts.x, 0)).r;
      return clamp(5.0 * center - top - bottom - left - right, 0.0, 1.0);
    }

    void main() {
      vec2 cell = resolution / uCellSize;
      vec2 grid = 1.0 / cell;
      vec2 pUV  = grid * (0.5 + floor(vUv / grid));
      vec4 px   = texture2D(tDiffuse, pUV);
      float gs  = greyscale(px.rgb);

      // Contrast curve: skin and paper fall to blank, ink lines stay dense,
      // so the face reads instead of a wall of mid-tone glyphs.
      gs = smoothstep(0.18, 0.92, gs);
      if (uInvert) gs = 1.0 - gs;

      vec3 animC = mix(uColor * vignette(vUv), rotatingGradient(uTime, vUv), uGradientMix);

      float ci  = floor((uCharactersCount - 1.0) * gs);
      vec2  cp  = vec2(mod(ci, SIZE.x), floor(ci / SIZE.y));
      vec2  off = vec2(cp.x, -cp.y) / SIZE;
      vec2  cUV = mod(vUv * (cell / SIZE), 1.0 / SIZE) - vec2(0.0, 1.0 / SIZE) + off;

      float intensity = sharpen(uCharacters, cUV, 1.0 / (SIZE * uCharactersCount));
      intensity = smoothstep(0.4, 0.45, intensity);

      vec3  finalColor = mix(vec3(0.0), animC * intensity, uOpacity);
      float finalAlpha = intensity * px.a;

      if (finalAlpha < 0.01) discard;
      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `
};

// Pre-allocated reusable objects
const _tmpQuat  = new THREE.Quaternion();
const _tmpEuler = new THREE.Euler();

export function initCube(canvasEl, textureUrl) {
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(10, 1, 0.1, 2000);
  camera.position.z = 500;

  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, alpha: true, antialias: true });

  let cube, composer, asciiPass, cubeMaterial;
  const currentQ = new THREE.Quaternion();
  const targetQ  = new THREE.Quaternion();
  let autoRotateDir = 1;
  let isDragging = false;
  let lastDragX = 0;
  let lastDragY = 0;
  let resizeTimer = 0;
  let loopId = null;
  let visible = true;
  let destroyed = false;
  const cleanups = [];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setup(texture) {
    if (destroyed) { texture.dispose(); return; }
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const geo = new THREE.BoxGeometry(50, 50, 50, 8, 8, 8);
    cubeMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 });
    cube = new THREE.Mesh(geo, cubeMaterial);

    const initRot = new THREE.Euler(0.5, 0.75, 0, 'XYZ');
    cube.quaternion.setFromEuler(initRot);
    currentQ.setFromEuler(initRot);
    targetQ.setFromEuler(initRot);
    cube.position.set(0, 1.0, 0);
    scene.add(cube);
    // Mostly ambient so the face stays readable, plus a soft key light so the
    // three visible faces get distinct densities and the cube reads as 3D.
    scene.add(new THREE.AmbientLight(0xffffff, 2.1));
    const key = new THREE.DirectionalLight(0xffffff, 0.7);
    key.position.set(-0.6, 0.8, 1);
    scene.add(key);

    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    asciiPass = new ShaderPass(ASCIIShader);
    asciiPass.uniforms.uCharactersCount.value = CHARACTERS.length;
    asciiPass.uniforms.uColor.value = footerInk(canvasEl);
    asciiPass.uniforms.uInvert.value = true;
    composer.addPass(asciiPass);

    onResize();
    playEntrance();
    loopId = renderer.setAnimationLoop(animate);
  }

  function playEntrance() {
    if (prefersReducedMotion) {
      asciiPass.uniforms.uOpacity.value = 1;
      cube.scale.set(1, 1, 1);
      composer.render();
      return;
    }
    asciiPass.uniforms.uOpacity.value = 0;
    cube.scale.set(0, 0, 0);
    const start = performance.now();
    (function tick() {
      const t = Math.min(1, (performance.now() - start) / ENTER_DURATION);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      asciiPass.uniforms.uOpacity.value = ease;
      cube.scale.setScalar(ease);
      if (t < 1) requestAnimationFrame(tick);
    })();
  }

  // GeoCities mode: rainbow cube with faster spin. Elsewhere the cube is mono.
  let gcTarget = 0;
  let gcCurrent = 0;
  const GC_LERP = 0.04;

  function isGeoCitiesActive() {
    return document.documentElement.getAttribute('data-geocities') === 'true';
  }

  const gcObserver = new MutationObserver(() => {
    gcTarget = isGeoCitiesActive() ? 1 : 0;
    // Theme toggles change the footer text colour too.
    if (asciiPass) asciiPass.uniforms.uColor.value = footerInk(canvasEl);
  });
  gcObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-geocities', 'data-theme', 'class']
  });
  cleanups.push(() => gcObserver.disconnect());
  gcTarget = isGeoCitiesActive() ? 1 : 0;
  gcCurrent = gcTarget;

  function animate() {
    if (!cube || !visible) return;

    // Smoothly interpolate geocities mix
    gcCurrent += (gcTarget - gcCurrent) * GC_LERP;
    const gc = gcCurrent;

    asciiPass.uniforms.uGradientMix.value = gc;
    // Gradient only animates in GeoCities mode (frozen under reduced motion)
    if (!prefersReducedMotion && gc > 0.001) {
      asciiPass.material.uniforms.uTime.value += 0.003 + gc * 0.007;
    }

    // Skip auto-rotation under reduced motion; drag still works
    if (!prefersReducedMotion) {
      const spin = AUTO_SPIN_SPEED + gc * 0.012;
      _tmpEuler.set(0, spin * autoRotateDir, 0);
      _tmpQuat.setFromEuler(_tmpEuler);
      targetQ.multiplyQuaternions(_tmpQuat, targetQ);
    }
    currentQ.slerp(targetQ, DAMPING_FACTOR);
    cube.quaternion.copy(currentQ);
    composer.render();
  }

  function onResize() {
    const rect = canvasEl.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const dpr = Math.min(MAX_DPR, devicePixelRatio || 1);

    renderer.setSize(w, h);
    renderer.setPixelRatio(dpr);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    if (composer) {
      composer.setSize(w, h);
      composer.setPixelRatio(dpr);
    }
    if (asciiPass) {
      const old = asciiPass.uniforms.uCharacters.value;
      if (old) old.dispose();
      asciiPass.uniforms.resolution.value.set(w, h);
      asciiPass.uniforms.uCharacters.value = createCharactersTexture(w, h, CHARACTERS);
      asciiPass.uniforms.uCellSize.value = getCellSize(w);
    }
  }

  const onWinResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 100);
  };
  window.addEventListener('resize', onWinResize);
  cleanups.push(() => { window.removeEventListener('resize', onWinResize); clearTimeout(resizeTimer); });

  // Pause when off-screen
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && loopId === null) {
      loopId = renderer.setAnimationLoop(animate);
    } else if (!visible) {
      renderer.setAnimationLoop(null);
      loopId = null;
    }
  }, { threshold: 0.1 });
  observer.observe(canvasEl);
  cleanups.push(() => observer.disconnect());

  // Drag interaction
  canvasEl.addEventListener('pointerdown', e => {
    isDragging = true;
    lastDragX = e.clientX;
    lastDragY = e.clientY;
    canvasEl.setPointerCapture(e.pointerId);
  });

  canvasEl.addEventListener('pointermove', e => {
    if (!isDragging) return;
    const dx = e.clientX - lastDragX;
    const dy = e.clientY - lastDragY;
    lastDragX = e.clientX;
    lastDragY = e.clientY;
    _tmpEuler.set(dy / DRAG_SENSITIVITY, dx / DRAG_SENSITIVITY, 0, 'XYZ');
    _tmpQuat.setFromEuler(_tmpEuler);
    targetQ.multiplyQuaternions(_tmpQuat, targetQ);
    autoRotateDir = e.clientX < innerWidth / 2 ? -1 : 1;
  });

  canvasEl.addEventListener('pointerup', e => {
    isDragging = false;
    canvasEl.releasePointerCapture(e.pointerId);
  });

  canvasEl.addEventListener('pointercancel', e => {
    isDragging = false;
    canvasEl.releasePointerCapture(e.pointerId);
  });

  // Load texture
  const loader = new THREE.TextureLoader();
  loader.load(textureUrl, tex => {
    setup(tex);
  }, undefined, () => {
    // Fallback: plain white cube
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    setup(tex);
  });

  return {
    destroy() {
      destroyed = true;
      cleanups.forEach(fn => fn());
      renderer.setAnimationLoop(null);
      if (asciiPass) asciiPass.uniforms.uCharacters.value?.dispose();
      if (cube) { cube.geometry.dispose(); cubeMaterial.map?.dispose(); cubeMaterial.dispose(); }
      composer?.dispose?.();
      renderer.dispose();
      renderer.forceContextLoss();
    }
  };
}
