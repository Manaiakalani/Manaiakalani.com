// Footer "Swarm": an alternative to the ASCII cube.
//
// Beads circle in a loose ribbon, gather into the illustrated portrait (a
// shallow relief, so it turns toward the pointer), hold, then let go again.
// Each bead takes its colour from the portrait; the pointer brushes beads aside.
//
// Plain WebGL1, no three.js. Beads are sampled at runtime from a 256px
// transparent portrait, so there is no point-cloud payload to download.

const VERT = `
precision highp float;
attribute vec4 aPos;    // portrait xyz + edge weight
attribute vec3 aColor;
attribute vec4 aSeed;
uniform float uClock;   // loop clock (s)
uniform float uSpin;    // continuous time, so the ribbon never jumps at the loop seam
uniform vec2 uTilt;     // yaw, pitch
uniform vec3 uPointer;  // xy in bead space, z strength
uniform float uScale;
uniform vec2 uAspect;
uniform float uPointSize;
varying vec3 vColor;
varying float vDepth;
varying float vHue;
varying float vBlend;

const float PI = 3.14159265;
const float SWIRL = 0.9, GATHER = 1.6, HOLD = 4.4, RELEASE = 2.6;

vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z); }
vec3 rotX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, c*p.y - s*p.z, s*p.y + c*p.z); }

// Three tilted bands of a slowly breathing ribbon.
vec3 swirl(vec4 s, float t) {
  float band = floor(s.y * 3.0);
  float a = 6.2831853 * s.x + t * (0.55 + 0.25 * band);
  float r = 0.62 + 0.16 * sin(3.0 * a + t * 0.7 + band * 2.1) + (s.z - 0.5) * 0.12;
  vec3 p = vec3(cos(a) * r, sin(a) * r, 0.22 * sin(2.0 * a + t + band));
  p = rotX(p, 0.9 + band * 0.85);
  p = rotY(p, band * 1.3 + t * 0.15);
  return p;
}

void main() {
  vec3 A = rotY(rotX(aPos.xyz, uTilt.y), uTilt.x);
  float arrive = (uClock - SWIRL) / GATHER;
  float gather = smoothstep(aSeed.w * 0.3, 0.7 + aSeed.w * 0.3, arrive);
  float leave = smoothstep(aSeed.z * 0.5, 1.4 + aSeed.z * 0.9, uClock - SWIRL - GATHER - HOLD);
  float blend = gather * (1.0 - leave);
  float travel = sin(blend * PI);
  vec3 p = mix(swirl(aSeed, uSpin), A, blend);
  p += travel * 0.12 * vec3(sin(aSeed.x * 40.0 + uClock), cos(aSeed.y * 40.0 + uClock), aSeed.z - 0.5);

  // Pointer brush: beads part around the pointer and lift toward the viewer.
  vec2 d = p.xy - uPointer.xy;
  float f = uPointer.z * exp(-dot(d, d) / 0.028);
  p.xy += d * inversesqrt(dot(d, d) + 0.004) * f * 0.16;
  p.z += f * 0.2;

  float persp = 1.0 / (1.0 - p.z * 0.22);
  gl_Position = vec4(p.xy * persp * uScale * uAspect, -p.z * 0.4, 1.0);
  gl_PointSize = uPointSize * (0.75 + 0.5 * aSeed.z) * persp;
  vColor = aColor;
  vDepth = p.z;
  vHue = aSeed.x;
  vBlend = blend;
}`;

const FRAG = `
precision mediump float;
uniform float uRainbow;
uniform float uTime;
varying vec3 vColor;
varying float vDepth;
varying float vHue;
varying float vBlend;

vec3 hue(float h) { return 0.5 + 0.5 * cos(6.2831853 * (h + vec3(0.0, 0.33, 0.67))); }

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  vec3 n = vec3(uv.x, -uv.y, sqrt(1.0 - r2));
  vec3 L = normalize(vec3(-0.5, 0.7, 0.9));
  float diffuse = max(dot(n, L), 0.0);
  float glint = pow(max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 22.0);
  float depthFade = mix(0.75 + 0.25 * clamp(vDepth + 0.5, 0.0, 1.0), 1.0, vBlend * 0.7);
  // In flight the beads run through the site's rainbow; they settle into the
  // portrait's own colours as they land. GeoCities keeps them rainbow.
  vec3 flight = hue(vHue + uTime * 0.06) * 0.85;
  vec3 base = mix(mix(flight, vColor, vBlend), hue(vHue + uTime * 0.1), uRainbow);
  // Mostly flat shading once landed so the portrait's own tones carry the image.
  vec3 col = base * mix(0.55 + 0.6 * diffuse, 0.88 + 0.2 * diffuse, vBlend) * depthFade + glint * 0.12 * (1.0 - 0.6 * vBlend);
  float a = smoothstep(1.0, 0.72, r2);
  gl_FragColor = vec4(col * a, a);
}`;

// Deterministic randomness so every visit forms the same portrait.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Returns { pos: Float32Array(n*4), color: Float32Array(n*3) }.
function sampleBeads(img, n) {
  const S = 320;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, S, S);
  const px = ctx.getImageData(0, 0, S, S).data;
  const lum = (i) => (px[i * 4] * 0.2126 + px[i * 4 + 1] * 0.7152 + px[i * 4 + 2] * 0.0722) / 255;

  const rand = rng(1018);
  const pos = new Float32Array(n * 4);
  const color = new Float32Array(n * 3);
  let k = 0, guard = 0;
  while (k < n && guard++ < n * 80) {
    const fx = rand() * S, fy = rand() * S;
    const ix = fx | 0, iy = fy | 0, i = iy * S + ix;
    const alpha = px[i * 4 + 3] / 255;
    if (alpha < 0.5) continue;
    // Denser on line work (hair, eyes, outlines) so features stay crisp.
    const l = lum(i);
    const nb = ix > 0 && ix < S - 1 && iy > 0 && iy < S - 1
      ? Math.abs(lum(i - 1) - lum(i + 1)) + Math.abs(lum(i - S) - lum(i + S)) : 0;
    const w = Math.min(1, 0.6 + nb * 2.5 + (1 - l) * 0.3);
    if (rand() > w) continue;
    const x = (fx / S) * 2 - 1, y = 1 - (fy / S) * 2;
    const r = Math.hypot(x * 1.1, y);
    const dome = Math.sqrt(Math.max(0, 1 - r * r * 0.7));
    pos[k * 4] = x * 0.94;
    pos[k * 4 + 1] = y * 0.94;
    pos[k * 4 + 2] = dome * 0.42 - 0.2 + (1 - l) * 0.04;
    pos[k * 4 + 3] = nb;
    // Lift the darkest tones (hair) so they still read on the dark footer.
    for (let ch = 0; ch < 3; ch++) {
      const v = px[i * 4 + ch] / 255;
      color[k * 3 + ch] = 0.07 + 0.98 * Math.pow(v, 0.95);
    }
    k++;
  }
  // Sampling ran dry (unexpected image): reuse sampled beads.
  for (const filled = Math.max(1, k); k < n; k++) {
    const j = (k * 7919) % filled;
    pos.copyWithin(k * 4, j * 4, j * 4 + 4);
    color.copyWithin(k * 3, j * 3, j * 3 + 3);
  }
  return { pos, color };
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

export async function initParticles(canvas, { imageUrl = '/portrait-beads.webp' } = {}) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) throw new Error('webgl unavailable');

  const img = await loadImage(imageUrl);
  const small = canvas.parentElement.getBoundingClientRect().width < 260;
  const N = small ? 18000 : 24000;
  const { pos, color } = sampleBeads(img, N);

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
  for (const name of ['uClock', 'uSpin', 'uTilt', 'uPointer', 'uScale', 'uAspect', 'uPointSize', 'uRainbow', 'uTime']) {
    U[name] = gl.getUniformLocation(prog, name);
  }

  const seeds = new Float32Array(N * 4);
  const rand = rng(42);
  for (let i = 0; i < seeds.length; i++) seeds[i] = rand();

  for (const [name, data, size] of [['aPos', pos, 4], ['aColor', color, 3], ['aSeed', seeds, 4]]) {
    const buf = gl.createBuffer();
    const loc = gl.getAttribLocation(prog, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  }

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isGeo = () => document.documentElement.getAttribute('data-geocities') === 'true';
  let rainbow = isGeo() ? 1 : 0;
  const mo = new MutationObserver(() => { if (reduced) { rainbow = isGeo() ? 1 : 0; draw(); } });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-geocities'] });

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

  // --- loop ------------------------------------------------------------
  const LOOP = 0.9 + 1.6 + 4.4 + 2.6 + 0.4;
  let clock = reduced ? 0.9 + 1.6 + 1.0 : 0;
  let time = 0, last = 0, raf = 0, visible = true;

  function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform1f(U.uClock, clock);
    gl.uniform1f(U.uSpin, time);
    gl.uniform2f(U.uTilt, tiltNow[0], tiltNow[1]);
    gl.uniform3f(U.uPointer, pointer.x, pointer.y, pointer.s);
    gl.uniform1f(U.uScale, SCALE);
    // ~1.4 CSS px beads on the 280px canvas; scales with the box.
    gl.uniform1f(U.uPointSize, Math.max(1.25, (cssW / 205) * dpr));
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
    clock = (clock + dt * (isGeo() ? 1.6 : 1)) % LOOP;
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
