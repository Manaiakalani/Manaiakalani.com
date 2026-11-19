const MODES = ["cube", "swarm"];
const STORE_KEY = "mnk:footer-viz";

let canvas = document.getElementById("ascii-cube");
const wrapper = canvas && canvas.parentElement;
const switcher = document.querySelector(".viz-switch");

// Data saver: the footer animation pulls three.js from a CDN purely for decoration. Skip
// it (and its empty box) when the visitor has asked to save data.
const saveData =
  (navigator.connection && navigator.connection.saveData === true) ||
  (window.matchMedia && window.matchMedia("(prefers-reduced-data: reduce)").matches);

if (canvas && saveData) {
  wrapper.hidden = true;
}

function readMode() {
  try {
    const m = localStorage.getItem(STORE_KEY);
    if (MODES.includes(m)) return m;
  } catch (e) {}
  return "cube";
}

function saveMode(m) {
  try { localStorage.setItem(STORE_KEY, m); } catch (e) {}
}

if (canvas && !saveData) {
  let mode = readMode();
  let instance = null;
  let started = false;
  let pending = null;
  // Bumped on every switch so a slow import for an old mode cannot win the race.
  let generation = 0;

  // The canvas is decorative and simply stays blank if three.js (CDN) or WebGL is
  // unavailable; failures clear `pending` so a later intersection can retry.
  const engines = {
    cube: () => import("/cube.js?v=d310ef1a").then(({ initCube }) => initCube(canvas, "/cube-texture.webp?v=0fbe3269")),
    swarm: () => import("/particles.js?v=b03f7c3c").then(({ initParticles }) => initParticles(canvas, { imageUrl: "/portrait-beads.webp?v=49d075cf" }))
  };

  const start = () => {
    if (pending) return pending;
    const gen = ++generation;
    pending = engines[mode]()
      .then((inst) => {
        if (gen !== generation) { inst && inst.destroy && inst.destroy(); return false; }
        instance = inst;
        started = true;
        wrapper.dataset.viz = mode;
        return true;
      })
      .catch(() => {
        pending = null;
        return false;
      });
    return pending;
  };

  // A canvas keeps the first context type it hands out, so each engine gets a fresh one.
  const freshCanvas = () => {
    const next = canvas.cloneNode(false);
    next.removeAttribute("style");
    next.removeAttribute("width");
    next.removeAttribute("height");
    canvas.replaceWith(next);
    canvas = next;
  };

  const select = (next) => {
    if (!MODES.includes(next) || next === mode) return;
    mode = next;
    saveMode(mode);
    syncButtons();
    const wasLoading = pending !== null;
    generation++;
    if (instance && instance.destroy) instance.destroy();
    instance = null;
    pending = null;
    freshCanvas();
    if (started || wasLoading) start();
  };

  function syncButtons() {
    if (!switcher) return;
    switcher.querySelectorAll("button[data-viz]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.viz === mode));
    });
  }

  if (switcher) {
    switcher.hidden = false;
    syncButtons();
    switcher.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-viz]");
      if (b) select(b.dataset.viz);
    });
  }

  if (!("IntersectionObserver" in window)) {
    start();
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        // Stop observing only once something is actually up, so a failed attempt can
        // be retried the next time the footer scrolls back into view.
        start().then((ok) => {
          if (ok) observer.disconnect();
        });
      },
      { rootMargin: "200px 0px", threshold: 0 }
    );
    observer.observe(wrapper);
  }
}
