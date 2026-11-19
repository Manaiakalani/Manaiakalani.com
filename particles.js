// Footer particle portraits: an alternative to the ASCII cube.
//
//   swarm: beads circle in a loose ribbon, gather into the portrait (a shallow
//          relief, so it turns toward the pointer), hold, then let go again.
//   morph: the same beads flow portrait -> cube -> globe -> portrait. Each bead
//          is paired with a nearby point of the next shape (recursive median
//          split of both clouds) so the flow reads as one sweep, not noise.
//
// Plain WebGL1, no three.js. Everything is generated at runtime from the cube
// texture, so there is no point-cloud payload to download.

const TAU = Math.PI * 2;

const VERT = `
precision highp float;
attribute vec4 aFrom;   // xyz + tone
attribute vec4 aTo;     // xyz + tone
attribute vec4 aSeed;
uniform float uMode;    // 0 swarm, 1 morph
uniform float uClock;   // swarm loop clock (s)
uniform float uSpin;    // continuous time for the swirl (no jump at loop wrap)
uniform float uMorph;   // morph progress 0..1
uniform vec2 uRotA;     // yaw, pitch applied to aFrom
uniform vec2 uRotB;     // yaw, pitch applied to aTo
uniform vec3 uPointer;  // xy in bead space, z strength
uniform float uScale;
uniform vec2 uAspect;
uniform float uPointSize;
varying float vTone;
varying float vDepth;
varying float vHue;

const float PI = 3.14159265;
const float SWIRL = 0.9, GATHER = 1.6, HOLD = 4.2, RELEASE = 2.6;

vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z); }
vec3 rotX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, c*p.y - s*p.z, s*p.y + c*p.z); }
vec3 orient(vec3 p, vec2 r) { return rotY(rotX(p, r.y), r.x); }

// Three tilted bands of a slowly breathing ribbon.
vec3 swirl(vec4 s, float t) {
  float band = floor(s.y * 3.0);
  float a = TAU_A(s.x) + t * (0.55 + 0.25 * band);
  float r = 0.62 + 0.16 * sin(3.0 * a + t * 0.7 + band * 2.1) + (s.z - 0.5) * 0.12;
  vec3 p = vec3(cos(a) * r, sin(a) * r, 0.22 * sin(2.0 * a + t + band));
  p = rotX(p, 0.9 + band * 0.85);
  p = rotY(p, band * 1.3 + t * 0.15);
  return p;
}

void main() {
  vec3 A = orient(aFrom.xyz, uRotA);
  vec3 p;
  float tone;
  if (uMode < 0.5) {
    float arrive = (uClock - SWIRL) / GATHER;
    float gather = smoothstep(aSeed.w * 0.3, 0.7 + aSeed.w * 0.3, arrive);
    float leave = smoothstep(aSeed.z * 0.5, 1.4 + aSeed.z * 0.9, uClock - SWIRL - GATHER - HOLD);
    float blend = gather * (1.0 - leave);
    float travel = sin(blend * PI);
    vec3 s = swirl(aSeed, uSpin);
    p = mix(s, A, blend);
    p += travel * 0.12 * vec3(sin(aSeed.x * 40.0 + uClock), cos(aSeed.y * 40.0 + uClock), aSeed.z - 0.5);
    tone = mix(0.42 + 0.2 * aSeed.z, aFrom.w, blend);
  } else {
    vec3 B = orient(aTo.xyz, uRotB);
    float e = clamp((uMorph - aSeed.w * 0.35) / 0.65, 0.0, 1.0);
    e = e * e * e * (e * (e * 6.0 - 15.0) + 10.0);
    p = mix(A, B, e) + sin(e * PI) * 0.2 * (aSeed.xyz - 0.5);
    tone = mix(aFrom.w, aTo.w, e);
  }

  // Pointer brush: beads part around the pointer and lift toward the viewer.
  vec2 d = p.xy - uPointer.xy;
  float f = uPointer.z * exp(-dot(d, d) / 0.028);
  p.xy += d * inversesqrt(dot(d, d) + 0.004) * f * 0.16;
  p.z += f * 0.2;

  float persp = 1.0 / (1.0 - p.z * 0.22);
  vec2 sp = p.xy * persp * uScale * uAspect;
  gl_Position = vec4(sp, -p.z * 0.4, 1.0);
  gl_PointSize = uPointSize * (0.7 + 0.6 * aSeed.z) * persp;
  vTone = tone;
  vDepth = p.z;
  vHue = aSeed.x;
}`.replace('TAU_A(s.x)', '6.2831853 * s.x');

const FRAG = `
precision mediump float;
uniform vec3 uInk;
uniform float uRainbow;
uniform float uTime;
varying float vTone;
varying float vDepth;
varying float vHue;

vec3 hue(float h) { return 0.5 + 0.5 * cos(6.2831853 * (h + vec3(0.0, 0.33, 0.67))); }

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  vec3 n = vec3(uv.x, -uv.y, sqrt(1.0 - r2));
  vec3 L = normalize(vec3(-0.5, 0.7, 0.9));
  float diffuse = max(dot(n, L), 0.0);
  float glint = pow(max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 22.0);
  float depthFade = 0.72 + 0.28 * clamp(vDepth + 0.5, 0.0, 1.0);
  vec3 base = mix(uInk, hue(vHue + uTime * 0.05), uRainbow);
  vec3 col = base * (0.28 + 0.8 * diffuse) * vTone * depthFade + glint * 0.35 * vTone;
  float a = smoothstep(1.0, 0.72, r2);
  gl_FragColor = vec4(col * a, a);
}`;

// --- deterministic randomness so every visit forms the same portrait ------
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// --- point sets: Float32Array(n * 4) of x, y, z, tone ----------------------
function portraitPoints(img, n) {
  const S = 220;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, S, S);
  const px = ctx.getImageData(0, 0, S, S).data;
  const lum = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) lum[i] = (px[i * 4] * 0.2126 + px[i * 4 + 1] * 0.7152 + px[i * 4 + 2] * 0.0722) / 255;

  const rand = rng(1018);
  const out = new Float32Array(n * 4);
  let k = 0, guard = 0;
  while (k < n && guard++ < n * 60) {
    const fx = rand() * S, fy = rand() * S;
    const x = (fx / S) * 2 - 1, y = 1 - (fy / S) * 2;
    const r = Math.hypot(x, y * 1.04);
    const mask = 1 - smooth(0.82, 1.0, r);
    if (mask <= 0) continue;
    const L = lum[(fy | 0) * S + (fx | 0)];
    const ink = Math.pow(1 - L, 1.6);
    // A faint floor keeps the face and paper as a sparse grain, not empty.
    const w = (0.035 + 0.965 * ink) * mask;
    if (rand() > w) continue;
    const dome = Math.sqrt(Math.max(0, 1 - r * r * 0.85));
    out[k * 4] = x * 0.92;
    out[k * 4 + 1] = y * 0.92;
    out[k * 4 + 2] = dome * 0.42 - 0.18 + (1 - L) * 0.05;
    out[k * 4 + 3] = 0.5 + 0.5 * ink;
    k++;
  }
  // Rejection sampling ran dry (unexpected image): reuse sampled beads.
  for (const filled = Math.max(1, k); k < n; k++) {
    const j = (k * 7919) % filled;
    out.copyWithin(k * 4, j * 4, j * 4 + 4);
  }
  return out;
}

function cubePoints(n) {
  const rand = rng(7);
  const h = 0.52;
  const out = new Float32Array(n * 4);
  const edges = [];
  for (const a of [-h, h]) for (const b of [-h, h]) {
    edges.push([[-h, a, b], [h, a, b]], [[a, -h, b], [a, h, b]], [[a, b, -h], [a, b, h]]);
  }
  for (let i = 0; i < n; i++) {
    let p, tone;
    if (i % 2 === 0) {
      const [e0, e1] = edges[(rand() * 12) | 0];
      const t = rand();
      p = [e0[0] + (e1[0] - e0[0]) * t, e0[1] + (e1[1] - e0[1]) * t, e0[2] + (e1[2] - e0[2]) * t].map(v => v + (rand() - 0.5) * 0.02);
      tone = 1;
    } else {
      const face = (rand() * 6) | 0, axis = face >> 1, sign = face & 1 ? 1 : -1;
      p = [(rand() * 2 - 1) * h, (rand() * 2 - 1) * h, (rand() * 2 - 1) * h];
      p[axis] = sign * h;
      tone = 0.42;
    }
    tilt(p, 0.5, 0.75);
    out.set([p[0], p[1], p[2], tone], i * 4);
  }
  return out;
}

function globePoints(n) {
  const rand = rng(11);
  const R = 0.78;
  const out = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    let lat, lon, tone;
    if (i % 5 < 3) {
      // graticule: meridians every 30deg, parallels every 30deg
      if (rand() < 0.5) { lon = (((rand() * 12) | 0) / 12) * TAU; lat = (rand() - 0.5) * Math.PI; }
      else { lat = ((((rand() * 5) | 0) - 2) / 6) * Math.PI; lon = rand() * TAU; }
      tone = 0.95;
    } else {
      lon = rand() * TAU; lat = Math.asin(rand() * 2 - 1); tone = 0.38;
    }
    const p = [Math.cos(lat) * Math.sin(lon) * R, Math.sin(lat) * R, Math.cos(lat) * Math.cos(lon) * R];
    tilt(p, 0.35, 0);
    out.set([p[0], p[1], p[2], tone], i * 4);
  }
  return out;
}

function tilt(p, ax, ay) {
  let c = Math.cos(ax), s = Math.sin(ax);
  const y = c * p[1] - s * p[2], z = s * p[1] + c * p[2];
  p[1] = y; p[2] = z;
  c = Math.cos(ay); s = Math.sin(ay);
  const x = c * p[0] + s * p[2], z2 = -s * p[0] + c * p[2];
  p[0] = x; p[2] = z2;
}

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Reorder `dst` so bead i (currently at src[i]) travels to a nearby point:
// split both clouds at the median of their widest axis, recurse.
export function matchClouds(src, dst, n) {
  const a = new Int32Array(n), b = new Int32Array(n);
  for (let i = 0; i < n; i++) a[i] = b[i] = i;
  const out = new Float32Array(n * 4);
  const stack = [0, n];
  while (stack.length) {
    const hi = stack.pop(), lo = stack.pop();
    const len = hi - lo;
    if (len === 1) { out.set(dst.subarray(b[lo] * 4, b[lo] * 4 + 4), a[lo] * 4); continue; }
    if (len < 1) continue;
    const ext = [0, 1, 2].map(ax => spread(src, a, lo, hi, ax) + spread(dst, b, lo, hi, ax));
    const ax = ext[0] >= ext[1] && ext[0] >= ext[2] ? 0 : ext[1] >= ext[2] ? 1 : 2;
    a.subarray(lo, hi).sort((i, j) => src[i * 4 + ax] - src[j * 4 + ax]);
    b.subarray(lo, hi).sort((i, j) => dst[i * 4 + ax] - dst[j * 4 + ax]);
    const mid = lo + (len >> 1);
    stack.push(lo, mid, mid, hi);
  }
  return out;
}

function spread(arr, idx, lo, hi, ax) {
  let mn = Infinity, mx = -Infinity;
  for (let i = lo; i < hi; i++) { const v = arr[idx[i] * 4 + ax]; if (v < mn) mn = v; if (v > mx) mx = v; }
  return mx - mn;
}

function inkColor(el) {
  const m = getComputedStyle(el.closest('footer') || document.body).color.match(/[\d.]+/g);
  return m ? [m[0] / 255, m[1] / 255, m[2] / 255] : [0.91, 0.9, 0.88];
}

function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

export async function initParticles(canvas, { mode = 'swarm', textureUrl = '/cube-texture.webp' } = {}) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) throw new Error('webgl unavailable');

  const img = await loadImage(textureUrl);
  const small = canvas.parentElement.getBoundingClientRect().width < 260;
  const N = small ? 6500 : 9000;
  const shapes = [portraitPoints(img, N), cubePoints(N), globePoints(N)];

  const prog = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]]) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    gl.attachShader(prog, sh);
  }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  const U = {};
  for (const name of ['uMode', 'uClock', 'uSpin', 'uMorph', 'uRotA', 'uRotB', 'uPointer', 'uScale', 'uAspect', 'uPointSize', 'uInk', 'uRainbow', 'uTime']) {
    U[name] = gl.getUniformLocation(prog, name);
  }

  const seeds = new Float32Array(N * 4);
  const rand = rng(42);
  for (let i = 0; i < seeds.length; i++) seeds[i] = rand();

  function buffer(name, data, usage) {
    const buf = gl.createBuffer();
    const loc = gl.getAttribLocation(prog, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 0, 0);
    return buf;
  }
  const fromBuf = buffer('aFrom', shapes[0], gl.DYNAMIC_DRAW);
  const toBuf = buffer('aTo', shapes[0], gl.DYNAMIC_DRAW);
  buffer('aSeed', seeds, gl.STATIC_DRAW);

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ink = inkColor(canvas);
  const isGeo = () => document.documentElement.getAttribute('data-geocities') === 'true';
  let rainbow = isGeo() ? 1 : 0;
  const mo = new MutationObserver(() => { ink = inkColor(canvas); if (reduced) draw(); });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-geocities', 'data-theme', 'class'] });

  // --- sizing ---------------------------------------------------------
  let dpr = 1, cssW = 1;
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(2.5, devicePixelRatio || 1);
    cssW = r.width;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const asp = r.width / r.height;
    gl.uniform2f(U.uAspect, Math.min(1, 1 / asp), Math.min(1, asp));
    if (reduced) draw();
  }
  let resizeTimer = 0;
  const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 100); };
  addEventListener('resize', onResize);

  // --- pointer: brush + tilt -----------------------------------------
  const pointer = { x: 0, y: 0, s: 0, active: false };
  const tiltNow = [0, 0], tiltGoal = [0, 0];
  const SCALE = 0.98;
  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = 1 - ((e.clientY - r.top) / r.height) * 2;
    pointer.x = nx / SCALE; pointer.y = ny / SCALE; pointer.active = true;
    tiltGoal[0] = nx * 0.45; tiltGoal[1] = -ny * 0.3;
  }
  function onLeave() { pointer.active = false; tiltGoal[0] = tiltGoal[1] = 0; }
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointercancel', onLeave);
  canvas.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') onLeave(); });

  // --- morph sequencing ----------------------------------------------
  const HOLD = 3.4, MOVE = 2.4;
  let shapeIdx = 0, nextIdx = 0, phaseT = 0, morph = 0;
  let current = shapes[0];
  const yawFor = (idx, t) => idx === 0 ? tiltNow[0] : t * 0.5;
  const pitchFor = (idx) => idx === 0 ? tiltNow[1] : 0;

  function startMorph() {
    nextIdx = (shapeIdx + 1) % shapes.length;
    const target = matchClouds(current, shapes[nextIdx], N);
    gl.bindBuffer(gl.ARRAY_BUFFER, fromBuf);
    gl.bufferData(gl.ARRAY_BUFFER, current, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, toBuf);
    gl.bufferData(gl.ARRAY_BUFFER, target, gl.DYNAMIC_DRAW);
    current = target;
  }

  // --- loop ------------------------------------------------------------
  let clock = reduced ? 0.9 + 1.6 + 1.0 : 0;
  let time = 0, last = 0, raf = 0, visible = true;
  const LOOP = 0.9 + 1.6 + 4.2 + 2.6 + 0.4;

  function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform1f(U.uMode, mode === 'morph' ? 1 : 0);
    gl.uniform1f(U.uClock, clock);
    gl.uniform1f(U.uSpin, time);
    gl.uniform1f(U.uMorph, morph);
    gl.uniform2f(U.uRotA, yawFor(shapeIdx, time), pitchFor(shapeIdx));
    gl.uniform2f(U.uRotB, yawFor(nextIdx, time), pitchFor(nextIdx));
    gl.uniform3f(U.uPointer, pointer.x, pointer.y, pointer.s);
    gl.uniform1f(U.uScale, SCALE);
    // ~2.3 CSS px beads on the 280px canvas; scales with the box.
    gl.uniform1f(U.uPointSize, Math.max(1.5, (cssW / 120) * dpr));
    gl.uniform3f(U.uInk, ink[0], ink[1], ink[2]);
    gl.uniform1f(U.uRainbow, rainbow);
    gl.uniform1f(U.uTime, time);
    gl.drawArrays(gl.POINTS, 0, N);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    time += dt;
    rainbow += ((isGeo() ? 1 : 0) - rainbow) * 0.05;
    pointer.s += ((pointer.active ? 1 : 0) - pointer.s) * (pointer.active ? 0.2 : 0.06);
    tiltNow[0] += (tiltGoal[0] - tiltNow[0]) * 0.06;
    tiltNow[1] += (tiltGoal[1] - tiltNow[1]) * 0.06;

    if (mode === 'swarm') {
      clock = (clock + dt * (isGeo() ? 1.6 : 1)) % LOOP;
    } else {
      phaseT += dt;
      if (shapeIdx === nextIdx) {
        if (phaseT > HOLD) { phaseT = 0; morph = 0; startMorph(); }
      } else {
        morph = Math.min(1, phaseT / MOVE);
        if (morph >= 1) { shapeIdx = nextIdx; phaseT = 0; morph = 0; gl.bindBuffer(gl.ARRAY_BUFFER, fromBuf); gl.bufferData(gl.ARRAY_BUFFER, current, gl.DYNAMIC_DRAW); }
      }
    }
    draw();
  }

  function start() { if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }, { threshold: 0.1 });
  const onVis = () => (document.hidden ? stop() : start());
  resize();
  if (reduced) {
    draw();
  } else {
    io.observe(canvas);
    document.addEventListener('visibilitychange', onVis);
    start();
  }

  return {
    destroy() {
      stop();
      io.disconnect();
      mo.disconnect();
      clearTimeout(resizeTimer);
      removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  };
}
