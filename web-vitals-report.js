// Web Vitals reporting via Rybbit custom events
(function () {
  try {
    import('https://cdn.jsdelivr.net/npm/web-vitals@5.3.0/dist/web-vitals.js')
      .then(function (mod) {
        var metrics = ['onCLS', 'onFCP', 'onINP', 'onLCP', 'onTTFB'];
        metrics.forEach(function (fn) {
          if (typeof mod[fn] === 'function') {
            mod[fn](function (metric) {
              if (typeof window.rybbit !== 'undefined' && window.rybbit.event) {
                window.rybbit.event('web-vitals', {
                  metric: metric.name,
                  value: Math.round(metric.value),
                  rating: metric.rating,
                  page: location.pathname
                });
              }
            });
          }
        });
      })
      .catch(function () { /* CDN unreachable — silent no-op */ });
  } catch (e) { /* dynamic import unsupported — silent no-op */ }
})();
