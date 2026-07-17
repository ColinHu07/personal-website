(function () {
  "use strict";

  var scene = document.querySelector(".hydro-scene");
  var world = document.querySelector(".world");
  var progress = document.querySelector(".page-progress span");
  var inspect = document.querySelector("[data-inspect]");
  var waterlineCanvas = document.querySelector("[data-waterline]");
  var geometryVisual = document.querySelector(".geometry-visual");
  var geometryOrigin = document.querySelector("[data-geo-origin]");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var ticking = false;

  // Run-length encoded, source-pixel contour sampled directly from the visible
  // structure/water boundary in hydroheight-river-v1.png (1680 × 941).
  var waterlineRuns = [
    [504, 5], [502, 1], [499, 1], [496, 1], [494, 4], [495, 7], [496, 2],
    [497, 20], [496, 3], [499, 1], [502, 4], [501, 5], [502, 4], [501, 11],
    [500, 2], [499, 3], [501, 4], [500, 12], [499, 5], [502, 1], [504, 6],
    [505, 11], [504, 2], [503, 9], [504, 3], [505, 1], [506, 3], [507, 8],
    [508, 11], [509, 18], [510, 3], [509, 5], [511, 20], [513, 1],
    [515, 15], [513, 7], [514, 1], [515, 11], [514, 1], [513, 8], [514, 3],
    [513, 9], [515, 3], [513, 7], [511, 4], [509, 3], [506, 4], [508, 1],
    [510, 1], [513, 1], [516, 6], [519, 2], [520, 11], [521, 10], [522, 4],
    [521, 3], [520, 4], [521, 10], [520, 5], [519, 2], [518, 1], [517, 5],
    [516, 1], [515, 4], [512, 5], [510, 1], [509, 5], [508, 1], [507, 2],
    [506, 5], [505, 4]
  ];
  var waterlinePixels = [];
  var sourceX = 876;
  waterlineRuns.forEach(function (run) {
    for (var count = 0; count < run[1]; count += 1) {
      waterlinePixels.push([sourceX, run[0]]);
      sourceX += 1;
    }
  });
  var waterlineCenterIndex = 1115 - 876;
  var waterlineLeft = waterlinePixels.slice(0, waterlineCenterIndex + 1).reverse();
  var waterlineRight = waterlinePixels.slice(waterlineCenterIndex);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function revealedPath(points, amount) {
    var travel = clamp(amount, 0, 1) * (points.length - 1);
    var whole = Math.floor(travel);
    var fraction = travel - whole;
    var visible = points.slice(0, whole + 1);

    if (whole < points.length - 1 && fraction > 0) {
      var from = points[whole];
      var to = points[whole + 1];
      visible.push([
        from[0] + (to[0] - from[0]) * fraction,
        from[1] + (to[1] - from[1]) * fraction
      ]);
    }

    return visible;
  }

  function drawWaterline(amount) {
    if (!waterlineCanvas) return;

    var width = waterlineCanvas.clientWidth;
    var height = waterlineCanvas.clientHeight;
    if (!width || !height) return;

    var pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    var bufferWidth = Math.round(width * pixelRatio);
    var bufferHeight = Math.round(height * pixelRatio);
    if (waterlineCanvas.width !== bufferWidth || waterlineCanvas.height !== bufferHeight) {
      waterlineCanvas.width = bufferWidth;
      waterlineCanvas.height = bufferHeight;
    }

    var context = waterlineCanvas.getContext("2d");
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    var imageWidth = 1680;
    var imageHeight = 941;
    var scale = Math.max(width / imageWidth, height / imageHeight);
    var renderedWidth = imageWidth * scale;
    var renderedHeight = imageHeight * scale;
    var objectPositionX = window.innerWidth <= 620 ? 0.58 : 0.5;
    var offsetX = (width - renderedWidth) * objectPositionX;
    var offsetY = (height - renderedHeight) * 0.5;
    var targetX = offsetX + waterlineLeft[0][0] * scale;
    var targetY = offsetY + waterlineLeft[0][1] * scale;
    if (world) {
      world.style.setProperty("--target-x", (targetX / width * 100).toFixed(4) + "%");
      world.style.setProperty("--target-y", (targetY / height * 100).toFixed(4) + "%");
    }

    function mapPoint(point) {
      return [
        offsetX + point[0] * scale,
        offsetY + point[1] * scale
      ];
    }

    if (amount <= 0) return;

    var left = revealedPath(waterlineLeft, amount).map(mapPoint).reverse();
    var right = revealedPath(waterlineRight, amount).map(mapPoint);
    var combined = left.concat(right.slice(1));
    if (combined.length < 2) return;

    function traceLine() {
      context.beginPath();
      context.moveTo(combined[0][0], combined[0][1]);
      for (var index = 1; index < combined.length; index += 1) {
        context.lineTo(combined[index][0], combined[index][1]);
      }
    }

    traceLine();
    context.lineTo(combined[combined.length - 1][0], height);
    context.lineTo(combined[0][0], height);
    context.closePath();
    context.fillStyle = "rgba(103, 242, 210, 0.018)";
    context.fill();

    traceLine();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "rgba(0, 10, 13, 0.72)";
    context.lineWidth = 2;
    context.shadowBlur = 0;
    context.stroke();

    traceLine();
    context.strokeStyle = "rgba(103, 242, 210, 0.98)";
    context.lineWidth = 0.82;
    context.shadowColor = "rgba(103, 242, 210, 0.95)";
    context.shadowBlur = 4.5;
    context.stroke();
  }

  function updateScroll() {
    var maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progress.style.transform = "scaleX(" + clamp(window.scrollY / maxScroll, 0, 1) + ")";

    var sceneProgress = 0;
    if (scene && !reduceMotion.matches) {
      var rect = scene.getBoundingClientRect();
      var distance = Math.max(1, rect.height - window.innerHeight);
      sceneProgress = clamp(-rect.top / distance, 0, 1);
      scene.style.setProperty("--p", sceneProgress.toFixed(4));
      scene.style.setProperty("--zoom", (1.01 + sceneProgress * 2.05).toFixed(4));
      scene.style.setProperty("--world-brightness", (0.93 - sceneProgress * 0.12).toFixed(4));
      scene.style.setProperty("--grade-opacity", clamp(1 - sceneProgress * 0.72, 0.25, 1).toFixed(4));
      scene.style.setProperty("--grid-opacity", clamp(0.34 - sceneProgress * 0.45, 0, 0.34).toFixed(4));
      scene.style.setProperty("--intro-opacity", clamp(1.06 - sceneProgress * 3.6, 0, 1).toFixed(4));
      scene.style.setProperty("--intro-y", (-70 * sceneProgress).toFixed(2) + "px");
      scene.style.setProperty("--beam-opacity", clamp(1.25 - sceneProgress * 1.75, 0, 0.95).toFixed(4));
      scene.style.setProperty("--beam-scale", (1 - sceneProgress * 0.85).toFixed(4));
      scene.style.setProperty("--history-opacity", clamp(0.57 - sceneProgress * 0.8, 0, 0.44).toFixed(4));
      scene.style.setProperty("--target-opacity", clamp(1.1 - sceneProgress * 0.4, 0.4, 1).toFixed(4));
      scene.style.setProperty("--target-scale", (1 - sceneProgress * 0.42).toFixed(4));
      scene.style.setProperty("--label-opacity", clamp(1.2 - sceneProgress * 2, 0, 0.9).toFixed(4));
      scene.style.setProperty("--readout-opacity", clamp(1.18 - sceneProgress * 3.8, 0, 1).toFixed(4));
      scene.style.setProperty("--readout-y", (50 * sceneProgress).toFixed(2) + "px");
      scene.style.setProperty("--inspect-opacity", clamp(1.2 - sceneProgress * 3.4, 0, 1).toFixed(4));
      scene.style.setProperty("--focus-opacity", clamp((sceneProgress - 0.48) * 5, 0, 1).toFixed(4));
      scene.style.setProperty("--focus-y", clamp((0.75 - sceneProgress) * 110, 0, 60).toFixed(2) + "px");
      scene.style.setProperty("--segment-opacity", clamp((sceneProgress - 0.46) * 4.5, 0, 1).toFixed(4));
      scene.style.setProperty("--segment-status-opacity", clamp((sceneProgress - 0.68) * 6, 0, 1).toFixed(4));
      scene.style.setProperty("--segment-status-y", (10 * (1 - clamp((sceneProgress - 0.68) * 6, 0, 1))).toFixed(2) + "px");
    }

    drawWaterline(reduceMotion.matches ? 1 : clamp((sceneProgress - 0.5) / 0.34, 0, 1));

    ticking = false;
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateScroll);
  }

  function positionGeometryRays() {
    if (!geometryVisual || !geometryOrigin) return;

    var visualRect = geometryVisual.getBoundingClientRect();
    var originRect = geometryOrigin.getBoundingClientRect();
    var originX = originRect.left + originRect.width / 2 - visualRect.left;
    var originY = originRect.top + originRect.height / 2 - visualRect.top;
    var rays = geometryVisual.querySelectorAll("[data-geo-ray]");

    rays.forEach(function (ray) {
      var key = ray.getAttribute("data-geo-ray");
      var target = geometryVisual.querySelector('[data-geo-target="' + key + '"]');
      if (!target) return;

      var targetRect = target.getBoundingClientRect();
      var targetX = targetRect.left + targetRect.width / 2 - visualRect.left;
      var targetY = targetRect.top + targetRect.height / 2 - visualRect.top;
      var deltaX = targetX - originX;
      var deltaY = targetY - originY;

      ray.style.left = originX.toFixed(2) + "px";
      ray.style.top = (originY - 1).toFixed(2) + "px";
      ray.style.width = Math.hypot(deltaX, deltaY).toFixed(2) + "px";
      ray.style.transform = "rotate(" + Math.atan2(deltaY, deltaX).toFixed(6) + "rad)";
    });

    geometryVisual.classList.add("is-calibrated");
  }

  function requestGeometryUpdate() {
    window.requestAnimationFrame(positionGeometryRays);
  }

  if (inspect && scene) {
    inspect.addEventListener("click", function () {
      var destination = scene.offsetTop + (scene.offsetHeight - window.innerHeight) * 0.68;
      window.scrollTo({ top: destination, behavior: reduceMotion.matches ? "auto" : "smooth" });
    });
  }

  if (world && !reduceMotion.matches && window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener("pointermove", function (event) {
      var x = (event.clientX / window.innerWidth - 0.5) * -8;
      var y = (event.clientY / window.innerHeight - 0.5) * -6;
      world.style.setProperty("--mx", x.toFixed(2) + "px");
      world.style.setProperty("--my", y.toFixed(2) + "px");
    }, { passive: true });
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  window.addEventListener("resize", requestGeometryUpdate);
  reduceMotion.addEventListener("change", requestUpdate);
  requestGeometryUpdate();
  updateScroll();
})();
