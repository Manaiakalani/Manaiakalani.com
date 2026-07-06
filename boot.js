(function () {
  var GEO_CSS_HREF = "geocities.css?v=1";
  var GEO_JS_HREF = "geocities.js?v=1";
  var GEO_KEY = "geocities";
  var geoCssPromise;
  var geoJsPromise;
  var geoScriptReady = false;

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  }

  function loadGeoCitiesStyles() {
    if (geoCssPromise) return geoCssPromise;
    geoCssPromise = new Promise(function (resolve) {
      var existing = document.querySelector("link[data-geocities-css]");
      if (existing) {
        if (existing.sheet) {
          resolve();
        } else {
          existing.addEventListener("load", resolve, { once: true });
          existing.addEventListener("error", resolve, { once: true });
        }
        return;
      }

      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = GEO_CSS_HREF;
      link.setAttribute("data-geocities-css", "true");
      link.addEventListener("load", resolve, { once: true });
      link.addEventListener("error", resolve, { once: true });

      var anchor = document.querySelector('link[href^="style.css"]');
      if (anchor) {
        anchor.insertAdjacentElement("afterend", link);
      } else {
        document.head.appendChild(link);
      }
    });
    return geoCssPromise;
  }

  function loadGeoCitiesScript() {
    if (geoJsPromise) return geoJsPromise;
    geoJsPromise = new Promise(function (resolve, reject) {
      var existing = document.querySelector("script[data-geocities-js]");
      if (existing) {
        if (existing.getAttribute("data-loaded") === "true") {
          geoScriptReady = true;
          resolve();
        } else {
          existing.addEventListener(
            "load",
            function () {
              geoScriptReady = true;
              resolve();
            },
            { once: true }
          );
          existing.addEventListener("error", reject, { once: true });
        }
        return;
      }

      var script = document.createElement("script");
      script.src = GEO_JS_HREF;
      script.setAttribute("data-geocities-js", "true");
      script.addEventListener(
        "load",
        function () {
          geoScriptReady = true;
          script.setAttribute("data-loaded", "true");
          resolve();
        },
        { once: true }
      );
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });
    return geoJsPromise;
  }

  function loadGeoCitiesAssets() {
    loadGeoCitiesStyles();
    return new Promise(function (resolve, reject) {
      onReady(function () {
        loadGeoCitiesScript().then(resolve).catch(reject);
      });
    });
  }

  var t = localStorage.getItem("theme");
  if (
    t === "dark" ||
    (!t && window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.setAttribute("data-theme", "dark");
  }

  var geocitiesEnabled = localStorage.getItem(GEO_KEY) === "true";
  if (geocitiesEnabled) {
    document.documentElement.setAttribute("data-geocities", "true");
    loadGeoCitiesStyles();
    loadGeoCitiesAssets().catch(function () {});
  }

  onReady(function () {
    var toggle = document.querySelector(".geocities-toggle");
    if (!toggle) return;

    toggle.setAttribute("aria-pressed", String(geocitiesEnabled));

    toggle.addEventListener(
      "click",
      function (event) {
        if (geoScriptReady) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        loadGeoCitiesAssets()
          .then(function () {
            toggle.click();
          })
          .catch(function () {});
      },
      { capture: true }
    );
  });

  window.loadGeoCitiesAssets = loadGeoCitiesAssets;
})();
