const canvas = document.getElementById("ascii-cube");

if (canvas) {
  let loaded = false;
  const loadCube = async () => {
    if (loaded) return;
    loaded = true;
    const { initCube } = await import("./cube.js");
    initCube(canvas, "./cube-texture.webp");
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
