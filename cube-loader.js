const canvas = document.getElementById("ascii-cube");

// Data saver: the cube pulls hundreds of KB of three.js from a CDN purely for decoration. Skip
// it (and its empty box) when the visitor has asked to save data.
const saveData =
  (navigator.connection && navigator.connection.saveData === true) ||
  (window.matchMedia && window.matchMedia("(prefers-reduced-data: reduce)").matches);

if (canvas && saveData) {
  canvas.parentElement.hidden = true;
}

if (canvas && !saveData) {
  // Concurrent callers share one in-flight promise. On failure it is cleared so a
  // later intersection can retry: the cube pulls three.js from a CDN via the import
  // map, so a blocked or offline CDN (or a WebGL-less context) must degrade quietly
  // rather than raise an unhandled rejection. The canvas is decorative and simply
  // stays blank.
  let cubePromise = null;
  const loadCube = () => {
    if (!cubePromise) {
      cubePromise = import("/cube.js?v=69919b6c")
        .then(({ initCube }) => {
          initCube(canvas, "/cube-texture.webp");
          return true;
        })
        .catch(() => {
          cubePromise = null;
          return false;
        });
    }
    return cubePromise;
  };

  if (!("IntersectionObserver" in window)) {
    loadCube();
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        // Stop observing only once the cube is actually up, so a failed attempt can
        // be retried the next time the footer scrolls back into view.
        loadCube().then((ok) => {
          if (ok) observer.disconnect();
        });
      },
      { rootMargin: "200px 0px", threshold: 0 }
    );
    observer.observe(canvas);
  }
}
