(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var scenes = Array.prototype.slice.call(document.querySelectorAll("[data-bay-scene]"));
  var layers = Array.prototype.slice.call(document.querySelectorAll("[data-bay-layer]"));
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var framePending = false;
  var fx = null;

  if (!scenes.length || !layers.length) return;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setLayerStyle(layer, x, y, scale, rotate, clip, filter) {
    layer.style.setProperty("--bay-x", x.toFixed(2) + "px");
    layer.style.setProperty("--bay-y", y.toFixed(2) + "px");
    layer.style.setProperty("--bay-scale", scale.toFixed(5));
    layer.style.setProperty("--bay-rotate", rotate.toFixed(3) + "deg");
    layer.style.setProperty("--bay-clip", clip);
    layer.style.setProperty("--bay-filter", filter);
  }

  function clearLayerStyle(layer) {
    setLayerStyle(layer, 0, 0, 1, 0, "inset(0)", "none");
    layer.classList.remove("bay-layer-active");
  }

  function renderLayer(layer, index, viewportHeight) {
    var scene = layer.closest("[data-bay-scene]");
    if (!scene) return;

    var rect = layer.getBoundingClientRect();
    var enter = clamp((viewportHeight - rect.top) / (viewportHeight * 0.3), 0, 1);
    var delay = Math.min(0.22, (index % 5) * 0.035);
    enter = clamp((enter - delay) / (1 - delay), 0, 1);
    var exit = clamp((viewportHeight * 0.18 - rect.bottom) / (viewportHeight * 0.28), 0, 1);
    var visibility = clamp(Math.min(enter, 1 - exit), 0, 1);
    var center = rect.top + rect.height * 0.5;
    var depth = clamp((center - viewportHeight * 0.5) / viewportHeight, -1.2, 1.2);
    var effect = scene.dataset.bayEffect || "rise";
    var lane = index % 2 === 0 ? -1 : 1;
    var exiting = exit > 0.001;
    var direction = exiting ? -lane : lane;
    var travel = 1 - visibility;
    var x = 0;
    var y = -depth * (8 + (index % 3) * 3);
    var scale = 1;
    var rotate = 0;
    var clip = "inset(0)";
    var filter = "none";

    if (effect === "iris") {
      var radius = 8 + visibility * 108;
      clip = "circle(" + radius.toFixed(2) + "% at 50% 50%)";
      scale = 0.95 + visibility * 0.05;
      y += (exiting ? -1 : 1) * travel * 18;
    } else if (effect === "ripple") {
      var rippleRadius = 26 + visibility * 92;
      clip = "circle(" + rippleRadius.toFixed(2) + "% at 50% 62%)";
      scale = 0.89 + visibility * 0.11;
      y += (exiting ? -1 : 1) * travel * 28;
      filter = "blur(" + (travel * 2.6).toFixed(2) + "px) saturate(" + (0.72 + visibility * 0.28).toFixed(3) + ")";
    } else if (effect === "wash" || effect === "scan") {
      var washTop = enter < 1 ? (1 - enter) * 102 : 0;
      var washBottom = exit * 102;
      clip = "inset(" + washTop.toFixed(2) + "% 0 " + washBottom.toFixed(2) + "% 0)";
      y += direction * travel * 16;
      filter = "saturate(" + (0.38 + visibility * 0.62).toFixed(3) + ") brightness(" + (1 + travel * 0.22).toFixed(3) + ")";
    } else if (effect === "jump" || effect === "glitch") {
      var stepped = Math.round(visibility * 6) / 6;
      var jumpTravel = 1 - stepped;
      x = direction * jumpTravel * (effect === "glitch" ? 48 : 72);
      y += (index % 3 - 1) * jumpTravel * 14;
      rotate = direction * jumpTravel * (effect === "glitch" ? 0.8 : 2.4);
      if (direction > 0) clip = "inset(0 " + (jumpTravel * 76).toFixed(2) + "% 0 0)";
      else clip = "inset(0 0 0 " + (jumpTravel * 76).toFixed(2) + "%)";
      filter = effect === "glitch"
        ? "contrast(" + (1 + jumpTravel * 0.5).toFixed(3) + ") saturate(" + (1 + jumpTravel * 0.7).toFixed(3) + ")"
        : "none";
    } else if (effect === "dissolve") {
      var edge = visibility * 112;
      if (direction > 0) {
        clip = "polygon(0 0, " + edge.toFixed(2) + "% 0, " + Math.max(0, edge - 16).toFixed(2) + "% 100%, 0 100%)";
      } else {
        clip = "polygon(" + Math.max(0, 100 - edge).toFixed(2) + "% 0, 100% 0, 100% 100%, " + Math.min(100, 116 - edge).toFixed(2) + "% 100%)";
      }
      x = direction * travel * 22;
      filter = "blur(" + (travel * 3.2).toFixed(2) + "px) contrast(" + (1 + travel * 0.35).toFixed(3) + ")";
    } else if (effect === "beam") {
      if (direction > 0) clip = "inset(0 " + (travel * 105).toFixed(2) + "% 0 0)";
      else clip = "inset(0 0 0 " + (travel * 105).toFixed(2) + "%)";
      x = direction * travel * 30;
      filter = "brightness(" + (1 + travel * 0.42).toFixed(3) + ")";
    } else if (effect === "split") {
      var half = visibility * 50;
      clip = "polygon(" + (50 - half).toFixed(2) + "% 0, " + (50 + half).toFixed(2) + "% 0, " + (50 + half).toFixed(2) + "% 100%, " + (50 - half).toFixed(2) + "% 100%)";
      x = direction * travel * 32;
      scale = 0.97 + visibility * 0.03;
    } else {
      y += (exiting ? -1 : 1) * travel * 52;
      scale = 0.96 + visibility * 0.04;
    }

    setLayerStyle(layer, x, y, scale, rotate, clip, filter);
    layer.classList.toggle("bay-layer-active", rect.bottom > -viewportHeight * 0.2 && rect.top < viewportHeight * 1.2);
  }

  function activeScene(viewportHeight) {
    var midpoint = viewportHeight * 0.5;
    var chosen = scenes[0];
    var bestDistance = Infinity;

    scenes.forEach(function (scene) {
      var rect = scene.getBoundingClientRect();
      var distance = rect.top > midpoint ? rect.top - midpoint : rect.bottom < midpoint ? midpoint - rect.bottom : 0;
      if (distance <= bestDistance) {
        chosen = scene;
        bestDistance = distance;
      }
    });

    return chosen;
  }

  function renderFx(viewportHeight) {
    if (!fx) return;
    var scene = activeScene(viewportHeight);
    var rect = scene.getBoundingClientRect();
    var midpoint = viewportHeight * 0.5;
    var boundaryDistance = Math.min(Math.abs(rect.top - midpoint), Math.abs(rect.bottom - midpoint));
    var strength = clamp(1 - boundaryDistance / (viewportHeight * 0.36), 0, 1);
    var phase = clamp((viewportHeight * 0.86 - rect.top) / (viewportHeight * 0.72), 0, 1);
    var stepped = Math.round(phase * 7) / 7;

    fx.dataset.effect = scene.dataset.bayEffect || "wash";
    fx.style.setProperty("--bay-strength", (strength * 0.86).toFixed(4));
    fx.style.setProperty("--bay-phase", phase.toFixed(4));
    fx.style.setProperty("--bay-step", stepped.toFixed(4));
    fx.style.setProperty("--bay-iris-clear", (phase * 72).toFixed(2) + "%");
    fx.style.setProperty("--bay-iris-glow", (phase * 75).toFixed(2) + "%");
    fx.style.setProperty("--bay-iris-dark", (phase * 82).toFixed(2) + "%");
    fx.style.setProperty("--bay-iris-scale", (0.12 + phase * 1.45).toFixed(4));
    fx.style.setProperty("--bay-ripple-scale", (0.46 + phase * 1.15).toFixed(4));
    fx.style.setProperty("--bay-ripple-glow-scale", (0.7 + phase * 0.55).toFixed(4));
    fx.style.setProperty("--bay-wash-a", (phase * 100 - 16).toFixed(2) + "%");
    fx.style.setProperty("--bay-wash-b", (phase * 100 - 4).toFixed(2) + "%");
    fx.style.setProperty("--bay-wash-c", (phase * 100).toFixed(2) + "%");
    fx.style.setProperty("--bay-wash-d", (phase * 100 + 10).toFixed(2) + "%");
    fx.style.setProperty("--bay-wash-e", (phase * 100 + 27).toFixed(2) + "%");
    fx.style.setProperty("--bay-wash-shift", ((phase - 0.5) * 35).toFixed(2) + "%");
    fx.style.setProperty("--bay-scan-band", (phase * 100 - 9).toFixed(2) + "%");
    fx.style.setProperty("--bay-scan-line", (phase * 100).toFixed(2) + "%");
    fx.style.setProperty("--bay-dissolve-x", ((0.5 - phase) * 46).toFixed(2) + "px");
    fx.style.setProperty("--bay-dissolve-y", ((0.5 - phase) * 28).toFixed(2) + "px");
    fx.style.setProperty("--bay-jump-x", ((stepped - 0.5) * 42).toFixed(2) + "px");
    fx.style.setProperty("--bay-jump-border-x", ((0.5 - stepped) * 24).toFixed(2) + "px");
    fx.style.setProperty("--bay-split-left", ((phase - 1) * 32).toFixed(2) + "%");
    fx.style.setProperty("--bay-split-right", ((1 - phase) * 32).toFixed(2) + "%");
    body.dataset.bayActiveScene = scene.dataset.bayScene || scene.id || "scene";
  }

  function render() {
    framePending = false;

    if (reducedMotion.matches) {
      layers.forEach(clearLayerStyle);
      if (fx) fx.style.setProperty("--bay-strength", "0");
      return;
    }

    var viewportHeight = Math.max(1, window.innerHeight);
    layers.forEach(function (layer, index) {
      renderLayer(layer, index, viewportHeight);
    });
    renderFx(viewportHeight);
  }

  function requestRender() {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(render);
  }

  fx = document.createElement("div");
  fx.className = "bay-transition-fx";
  fx.setAttribute("aria-hidden", "true");
  body.appendChild(fx);

  render();
  root.classList.add("bay-motion-ready");
  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", requestRender, { passive: true });
  window.addEventListener("pageshow", requestRender);
  reducedMotion.addEventListener("change", requestRender);
})();
