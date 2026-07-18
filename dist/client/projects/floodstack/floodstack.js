(function () {
  "use strict";

  var journey = document.querySelector("[data-scan-journey]");
  var viewport = document.querySelector("[data-scan-viewport]");
  var progress = document.querySelector("[data-progress]");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!journey || !viewport) return;

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function smoothstep(value) {
    var t = clamp01(value);
    return t * t * (3 - 2 * t);
  }

  function range(value, start, end) {
    return smoothstep((value - start) / (end - start));
  }

  function render() {
    var viewportHeight = window.innerHeight;
    var rect = journey.getBoundingClientRect();
    var runway = Math.max(1, rect.height - viewportHeight);
    var pageProgress = clamp01(window.scrollY / Math.max(1, document.documentElement.scrollHeight - viewportHeight));
    var p = reducedMotion ? 1 : clamp01(-rect.top / runway);

    var reveal = range(p, 0.14, 0.61);
    var scanAlpha = range(p, 0.115, 0.16) * (1 - range(p, 0.6, 0.64));
    var titleAlpha = 1 - range(p, 0.075, 0.19);
    var scanCopyAlpha = range(p, 0.12, 0.2) * (1 - range(p, 0.58, 0.67));
    var legendAlpha = range(p, 0.25, 0.38) * (1 - range(p, 0.73, 0.82));
    var promptAlpha = 1 - range(p, 0.025, 0.1);
    var storyAlpha = range(p, 0.78, 0.94);
    var shadeAlpha = range(p, 0.74, 0.96) * 0.9;
    var mapScale = 1.015 + p * 0.13;
    var mapY = -1.8 + p * 5.8;
    var titleY = (1 - titleAlpha) * -22;
    var storyY = (1 - storyAlpha) * 44;

    viewport.style.setProperty("--mask-bottom", ((1 - reveal) * 100).toFixed(3) + "%");
    viewport.style.setProperty("--scan-y", (reveal * 100).toFixed(3) + "%");
    viewport.style.setProperty("--scan-alpha", scanAlpha.toFixed(4));
    viewport.style.setProperty("--title-alpha", titleAlpha.toFixed(4));
    viewport.style.setProperty("--scan-copy-alpha", scanCopyAlpha.toFixed(4));
    viewport.style.setProperty("--legend-alpha", legendAlpha.toFixed(4));
    viewport.style.setProperty("--prompt-alpha", promptAlpha.toFixed(4));
    viewport.style.setProperty("--story-alpha", storyAlpha.toFixed(4));
    viewport.style.setProperty("--shade-alpha", shadeAlpha.toFixed(4));
    viewport.style.setProperty("--map-scale", mapScale.toFixed(4));
    viewport.style.setProperty("--map-y", mapY.toFixed(3) + "vh");
    viewport.style.setProperty("--title-y", titleY.toFixed(2) + "px");
    viewport.style.setProperty("--story-y", storyY.toFixed(2) + "px");

    if (progress) progress.style.width = (pageProgress * 100).toFixed(3) + "%";
  }

  var queued = false;
  function queueRender() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function () {
      render();
      queued = false;
    });
  }

  window.addEventListener("scroll", queueRender, { passive: true });
  window.addEventListener("resize", queueRender);
  render();

  var storyReveals = Array.prototype.slice.call(document.querySelectorAll(".story-reveal"));
  if (!reducedMotion && "IntersectionObserver" in window && storyReveals.length) {
    document.body.classList.add("motion-ready");
    var storyObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          storyObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12%", threshold: 0.08 }
    );
    storyReveals.forEach(function (section) {
      storyObserver.observe(section);
    });
  } else {
    storyReveals.forEach(function (section) {
      section.classList.add("is-visible");
    });
  }
})();
