const canvas = document.getElementById("ascii-cube");

if (canvas) {
  let loaded = false;
  const loadCube = async () => {
    if (loaded) return;
    loaded = true;
    try {
      const { initCube } = await import("./cube.js?v=2");
      initCube(canvas, "./cube-texture.webp");
    } catch (e) {
      // The cube pulls three.js from a CDN via the import map, so a blocked or
      // offline CDN (or a WebGL-less context) must degrade quietly rather than
      // raise an unhandled rejection. The canvas is decorative and simply stays
      // blank; reset the flag so a later attempt can retry.
      loaded = false;
    }
  };

  if (!("IntersectionObserver" in window)) {
    loadCube();
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        loadCube();
      },
      { rootMargin: "200px 0px", threshold: 0 }
    );
    observer.observe(canvas);
  }
}
