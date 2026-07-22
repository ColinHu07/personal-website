(function () {
  "use strict";

  var scene = document.querySelector(".hydro-scene");
  var world = document.querySelector(".world");
  var progress = document.querySelector(".page-progress span");
  var inspect = document.querySelector("[data-inspect]");
  var waterlineCanvas = document.querySelector("[data-waterline]");
  var heroLiveBeam = document.querySelector(".beam-live");
  var heroHistoryBeam = document.querySelector(".beam-history");
  var hydroStory = document.querySelector("[data-hydro-story]");
  var originSection = document.querySelector(".origin-section");
  var methodSection = document.querySelector(".method-section");
  var geometryPanel = document.querySelector('[data-hydro-panel="geometry"]');
  var methodTransition = document.querySelector("[data-method-transition]");
  var geometryVisual = document.querySelector(".geometry-visual");
  var geometryField = document.querySelector("[data-geometry-field]");
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

  function smoothstep(value) {
    value = clamp(value, 0, 1);
    return value * value * (3 - 2 * value);
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

  function positionHeroBeam(beam, start, end) {
    if (!beam) return;
    var deltaX = end[0] - start[0];
    var deltaY = end[1] - start[1];
    beam.style.left = start[0].toFixed(2) + "px";
    beam.style.top = start[1].toFixed(2) + "px";
    beam.style.width = Math.hypot(deltaX, deltaY).toFixed(2) + "px";
    beam.style.setProperty("--beam-angle", Math.atan2(deltaY, deltaX).toFixed(6) + "rad");
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
    function mapPoint(point) {
      return [
        offsetX + point[0] * scale,
        offsetY + point[1] * scale
      ];
    }

    var target = mapPoint(waterlineLeft[0]);
    var cameraLens = mapPoint([493, 518]);
    var historyTarget = mapPoint([waterlineLeft[0][0], 455]);
    var targetX = target[0];
    var targetY = target[1];
    if (world) {
      world.style.setProperty("--camera-x", (cameraLens[0] / width * 100).toFixed(4) + "%");
      world.style.setProperty("--camera-y", (cameraLens[1] / height * 100).toFixed(4) + "%");
      world.style.setProperty("--target-x", (targetX / width * 100).toFixed(4) + "%");
      world.style.setProperty("--target-y", (targetY / height * 100).toFixed(4) + "%");
    }
    positionHeroBeam(heroLiveBeam, cameraLens, target);
    positionHeroBeam(heroHistoryBeam, cameraLens, historyTarget);

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
      scene.style.setProperty("--beam-scale", "1");
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

    var storyHandoff = null;
    if (hydroStory && methodSection && geometryPanel && window.innerWidth > 900 && !reduceMotion.matches) {
      var storyRect = hydroStory.getBoundingClientRect();
      var storyDistance = Math.max(1, storyRect.height - window.innerHeight);
      var storyProgress = clamp(-storyRect.top / storyDistance, 0, 1);
      storyHandoff = smoothstep((storyProgress - 0.06) / 0.36);
      var geometryHandoff = smoothstep((storyProgress - 0.54) / 0.36);
      var clipLeft = (1 - storyHandoff) * 100;
      var clipRight = clamp(clipLeft - Math.sin(storyHandoff * Math.PI) * 7, 0, 100);
      var geometryClipLeft = (1 - geometryHandoff) * 100;
      var geometryClipRight = clamp(
        geometryClipLeft - Math.sin(geometryHandoff * Math.PI) * 6,
        0,
        100
      );

      hydroStory.style.setProperty("--origin-panel-y", (-30 * storyHandoff).toFixed(2) + "px");
      hydroStory.style.setProperty("--origin-panel-scale", (1 - storyHandoff * 0.018).toFixed(4));
      hydroStory.style.setProperty("--origin-heading-y", (-38 * storyHandoff).toFixed(2) + "px");
      hydroStory.style.setProperty("--origin-story-y", (-18 * storyHandoff).toFixed(2) + "px");
      hydroStory.style.setProperty("--origin-timeline-y", (12 * storyHandoff).toFixed(2) + "px");
      hydroStory.style.setProperty("--method-clip-left", clipLeft.toFixed(2) + "%");
      hydroStory.style.setProperty("--method-clip-right", clipRight.toFixed(2) + "%");
      hydroStory.style.setProperty("--method-panel-y", ((1 - storyHandoff) * 26 - geometryHandoff * 24).toFixed(2) + "px");
      hydroStory.style.setProperty("--method-panel-scale", (0.985 + storyHandoff * 0.015 - geometryHandoff * 0.012).toFixed(4));
      hydroStory.style.setProperty("--method-copy-y", ((1 - storyHandoff) * 20 - geometryHandoff * 14).toFixed(2) + "px");
      hydroStory.style.setProperty("--method-steps-y", ((1 - storyHandoff) * 34 - geometryHandoff * 8).toFixed(2) + "px");
      hydroStory.style.setProperty("--geometry-clip-left", geometryClipLeft.toFixed(2) + "%");
      hydroStory.style.setProperty("--geometry-clip-right", geometryClipRight.toFixed(2) + "%");
      hydroStory.style.setProperty("--geometry-panel-y", ((1 - geometryHandoff) * 24).toFixed(2) + "px");
      hydroStory.style.setProperty("--geometry-panel-scale", (0.99 + geometryHandoff * 0.01).toFixed(4));
      hydroStory.style.setProperty("--geometry-copy-y", ((1 - geometryHandoff) * 28).toFixed(2) + "px");
      hydroStory.style.setProperty("--palette-line", ((1 - geometryHandoff) * 100).toFixed(2) + "%");
      hydroStory.style.setProperty("--palette-strength", Math.sin(geometryHandoff * Math.PI).toFixed(4));
    }

    if (methodTransition) {
      var transitionRect = methodTransition.getBoundingClientRect();
      var handoff = storyHandoff === null
        ? (reduceMotion.matches ? 1 : clamp(
            (window.innerHeight - transitionRect.top) / (window.innerHeight + transitionRect.height),
            0,
            1
          ))
        : storyHandoff;
      methodTransition.style.setProperty("--grid-opacity", (0.12 + handoff * 0.24).toFixed(4));
      methodTransition.style.setProperty("--grid-y", (58 - handoff * 92).toFixed(2) + "px");
      methodTransition.style.setProperty("--orbit-opacity", (0.16 + handoff * 0.52).toFixed(4));
      methodTransition.style.setProperty("--orbit-x", ((1 - handoff) * 70).toFixed(2) + "px");
      methodTransition.style.setProperty("--orbit-y", ((1 - handoff) * 42).toFixed(2) + "px");
      methodTransition.style.setProperty("--orbit-scale", (0.82 + handoff * 0.18).toFixed(4));
      methodTransition.style.setProperty("--rail-scale", (0.08 + handoff * 0.92).toFixed(4));
      methodTransition.style.setProperty("--node-x", (8 + handoff * 72).toFixed(2) + "%");
      methodTransition.style.setProperty("--copy-opacity", handoff.toFixed(4));
      methodTransition.style.setProperty("--copy-y", ((1 - handoff) * 24).toFixed(2) + "px");
      methodTransition.style.setProperty("--small-opacity", (0.2 + handoff * 0.8).toFixed(4));
      methodTransition.style.setProperty("--small-y", ((1 - handoff) * -18).toFixed(2) + "px");
      if (originSection) {
        originSection.style.setProperty("--origin-opacity", (1 - handoff * 0.38).toFixed(4));
        originSection.style.setProperty("--origin-y", (-34 * handoff).toFixed(2) + "px");
        originSection.style.setProperty("--origin-scale", (1 - handoff * 0.018).toFixed(4));
      }
    }

    ticking = false;
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateScroll);
  }

  function positionGeometryRays() {
    if (!geometryVisual || !geometryOrigin) return;

    if (geometryField && geometryField.naturalWidth && geometryField.naturalHeight) {
      var visualWidth = geometryVisual.clientWidth;
      var visualHeight = geometryVisual.clientHeight;
      var imageScale = Math.max(
        visualWidth / geometryField.naturalWidth,
        visualHeight / geometryField.naturalHeight
      );
      var imageOffsetX = (visualWidth - geometryField.naturalWidth * imageScale) / 2;
      var imageOffsetY = (visualHeight - geometryField.naturalHeight * imageScale) / 2;
      var mappedLensX = imageOffsetX + Number(geometryField.dataset.lensX) * imageScale;
      var mappedLensY = imageOffsetY + Number(geometryField.dataset.lensY) * imageScale;
      var mappedPierX = imageOffsetX + Number(geometryField.dataset.pierX) * imageScale;
      var mappedReferenceY = imageOffsetY + Number(geometryField.dataset.referenceY) * imageScale;
      var mappedLiveY = imageOffsetY + Number(geometryField.dataset.liveY) * imageScale;

      geometryOrigin.style.left = mappedLensX.toFixed(2) + "px";
      geometryOrigin.style.top = mappedLensY.toFixed(2) + "px";
      geometryVisual.style.setProperty("--pier-x", mappedPierX.toFixed(2) + "px");
      geometryVisual.style.setProperty("--reference-y", mappedReferenceY.toFixed(2) + "px");
      geometryVisual.style.setProperty("--live-y", mappedLiveY.toFixed(2) + "px");
    }

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

  if (geometryField) {
    geometryField.addEventListener("load", requestGeometryUpdate);
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
