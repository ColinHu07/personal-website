(function () {
  "use strict";

  var viewport = document.getElementById("solve-viewport");
  var scene = document.getElementById("demo");
  var scrollFill = document.getElementById("scroll-fill");
  var statusLabel = document.getElementById("hud-status");
  var geometryCaption = document.getElementById("geometry-caption");
  var answerStream = document.getElementById("answer-stream");
  var thinkingState = document.getElementById("thinking-state");
  var progressNodes = Array.prototype.slice.call(document.querySelectorAll("[data-progress]"));
  var chapterLinks = Array.prototype.slice.call(document.querySelectorAll(".chapter-rail a"));
  var chapterSections = Array.prototype.slice.call(document.querySelectorAll("[data-chapter-section]"));
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var statuses = [
    "PROBLEM PARSED",
    "CIRCUMCENTER LOCKED",
    "ROTATION MATRIX READY",
    "ORIENTATION VERIFIED",
    "SHOELACE SUM RUNNING",
    "ANSWER CONFIDENCE // 99.8%",
  ];
  var captions = [
    "POINTS ACQUIRED",
    "CIRCUMCIRCLE LOCKED",
    "ROTATING COPY",
    "ORIENTATION VERIFIED",
    "HEXAGON TRACE",
    "AREA // 155.7",
  ];
  var solutionText = [
    "Let’s put the triangle on a coordinate plane.\n\n",
    "A 13–14–15 triangle splits into 5–12–13 and 9–12–15 right triangles, so take\n",
    "A = (5, 12),   B = (0, 0),   C = (14, 0).\n\n",
    "The perpendicular bisector of BC gives x = 7. Equating the distances from O to B and A gives\n",
    "O = (7, 33/8),   R = 65/8.\n\n",
    "Vector AC is (9, −12). To make A′C′ vertical while satisfying the side condition, rotate by −36.87°, where cos θ = 4/5 and sin θ = −3/5.\n\n",
    "Applying that rotation about O gives\n",
    "A′ = (81/8, 93/8),\n",
    "C′ = (81/8, −27/8),\n",
    "B′ = (−43/40, 201/40).\n\n",
    "Now use the requested vertex order A, A′, C, C′, B, B′ in the shoelace formula:\n",
    "Area = ½ |Σ(xᵢyᵢ₊₁ − yᵢxᵢ₊₁)| = 1557/10 = 155.7.\n\n",
    "Therefore, the nearest integer is 156.",
  ].join("");

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function smooth(value) {
    var t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function range(value, start, end) {
    return smooth((value - start) / (end - start));
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  var activeStep = -1;
  var sceneProgress = 0;
  var visibleCharacters = -1;

  function setActiveStep(nextStep) {
    if (nextStep === activeStep) return;
    activeStep = nextStep;

    progressNodes.forEach(function (node, index) {
      node.classList.toggle("active", index === activeStep);
      node.classList.toggle("complete", index < activeStep);
    });

    if (activeStep >= 0) {
      statusLabel.textContent = statuses[activeStep];
      geometryCaption.textContent = captions[activeStep];
    } else {
      statusLabel.textContent = "WAITING FOR CAPTURE";
      geometryCaption.textContent = "ACQUIRING POINTS…";
    }
  }

  function updateAnswerStream(progress) {
    if (!answerStream) return;
    var nextCharacterCount = Math.floor(solutionText.length * clamp(progress, 0, 1));
    if (nextCharacterCount !== visibleCharacters) {
      visibleCharacters = nextCharacterCount;
      var cursor = nextCharacterCount < solutionText.length ? "▋" : "";
      answerStream.textContent = solutionText.slice(0, nextCharacterCount) + cursor;
      answerStream.scrollTop = answerStream.scrollHeight;
    }

    if (thinkingState) {
      thinkingState.textContent = progress <= 0 ? "Thinking…" : progress < 1 ? "Writing…" : "Done";
    }
  }

  function updateScroll() {
    var vh = window.innerHeight;
    var rect = scene.getBoundingClientRect();
    var total = Math.max(1, rect.height - vh);
    sceneProgress = clamp(-rect.top / total, 0, 1);

    var zoom = range(sceneProgress, 0.08, 0.31);
    var titleFade = 1 - range(sceneProgress, 0.12, 0.24);
    var focus = range(sceneProgress, 0.19, 0.31) * (1 - range(sceneProgress, 0.63, 0.7));
    var pencilsOut = range(sceneProgress, 0.16, 0.34);
    var drop = range(sceneProgress, 0.34, 0.48);
    var lensFocus = range(sceneProgress, 0.46, 0.63);
    var scan = range(sceneProgress, 0.54, 0.68) * (1 - range(sceneProgress, 0.7, 0.77));
    var lensTint = range(sceneProgress, 0.53, 0.67);
    var hud = range(sceneProgress, 0.72, 0.79);
    var lensInterface = lensTint * (1 - hud);
    var exam = 1 - hud * 0.14;
    var desk = 1 - hud * 0.5;
    var baseScale = window.innerWidth <= 640 ? 0.5 : 0.49;
    var zoomScale = window.innerWidth <= 640 ? 0.98 : window.innerWidth <= 960 ? 0.8 : 0.84;
    var examScale = lerp(baseScale, zoomScale, zoom);

    viewport.style.setProperty("--grid-opacity", (hud * 0.92).toFixed(4));
    viewport.style.setProperty("--title-opacity", (titleFade * 0.95).toFixed(4));
    viewport.style.setProperty("--title-y", ((1 - titleFade) * -3).toFixed(3) + "rem");
    viewport.style.setProperty("--desk-opacity", desk.toFixed(4));
    viewport.style.setProperty("--exam-opacity", exam.toFixed(4));
    viewport.style.setProperty("--exam-scale", examScale.toFixed(4));
    viewport.style.setProperty("--exam-y", lerp(2, 4.5, zoom).toFixed(3) + "vh");
    viewport.style.setProperty("--exam-rotate", lerp(-1.6, 0, zoom).toFixed(3) + "deg");
    viewport.style.setProperty("--exam-blur", (hud * 0.12).toFixed(3) + "px");
    viewport.style.setProperty("--focus-opacity", focus.toFixed(4));
    viewport.style.setProperty("--surround-opacity", (1 - zoom * 0.86).toFixed(4));
    viewport.style.setProperty("--pencil-opacity", (1 - pencilsOut).toFixed(4));
    viewport.style.setProperty("--pencil-left-x", (-pencilsOut * 34).toFixed(3) + "vw");
    viewport.style.setProperty("--pencil-left-y", (pencilsOut * 18).toFixed(3) + "vh");
    viewport.style.setProperty("--pencil-right-x", (pencilsOut * 36).toFixed(3) + "vw");
    viewport.style.setProperty("--pencil-right-y", (pencilsOut * 17).toFixed(3) + "vh");
    viewport.style.setProperty("--scan-opacity", scan.toFixed(4));
    viewport.style.setProperty("--scan-y", (scan * 77).toFixed(3) + "%");
    viewport.style.setProperty("--glasses-x", (-lensFocus * (window.innerWidth <= 640 ? 12 : 17)).toFixed(3) + "vw");
    viewport.style.setProperty("--glasses-y", (-105 + drop * 105 - lensFocus * (window.innerWidth <= 640 ? 7 : 16)).toFixed(3) + "vh");
    viewport.style.setProperty("--glasses-origin-x", (50 + lensFocus * 24).toFixed(3) + "%");
    viewport.style.setProperty("--glasses-rotate-x", (23 - drop * 21).toFixed(3) + "deg");
    viewport.style.setProperty("--glasses-rotate-z", (-3 + drop * 3).toFixed(3) + "deg");
    viewport.style.setProperty("--glasses-scale", (0.62 + lensFocus * (window.innerWidth <= 640 ? 1.08 : 1.76)).toFixed(4));
    viewport.style.setProperty("--glasses-opacity", drop.toFixed(4));
    viewport.style.setProperty("--peripheral-opacity", (1 - lensFocus * 0.92).toFixed(4));
    viewport.style.setProperty("--brow-opacity", (1 - lensFocus * 0.76).toFixed(4));
    viewport.style.setProperty("--active-detail-opacity", (1 - lensFocus * 0.42).toFixed(4));
    viewport.style.setProperty("--lens-tint", lensTint.toFixed(4));
    viewport.style.setProperty("--lens-interface", lensInterface.toFixed(4));
    viewport.style.setProperty("--hud-opacity", hud.toFixed(4));
    viewport.style.setProperty("--hud-scrim", (hud * 0.04).toFixed(4));
    viewport.style.setProperty("--hud-blur", (hud * 0.25).toFixed(3) + "px");
    viewport.style.setProperty("--hud-scale", (1.05 - hud * 0.05).toFixed(4));
    viewport.style.setProperty("--answer-complete", range(sceneProgress, 0.98, 0.996).toFixed(4));
    viewport.style.setProperty("--cue-opacity", Math.max(0, 1 - drop * 1.8).toFixed(4));
    viewport.style.setProperty("--scene-handoff", range(sceneProgress, 0.91, 0.985).toFixed(4));

    updateAnswerStream(range(sceneProgress, 0.765, 0.975));

    var nextStep = sceneProgress < 0.77
      ? -1
      : Math.min(5, Math.floor((sceneProgress - 0.77) / (0.21 / 6)));
    setActiveStep(nextStep);

    var doc = document.documentElement;
    var max = Math.max(1, doc.scrollHeight - vh);
    scrollFill.style.width = (window.scrollY / max) * 100 + "%";

    var mid = vh * 0.5;
    var currentChapter = null;
    chapterSections.forEach(function (section) {
      var sectionRect = section.getBoundingClientRect();
      if (sectionRect.top <= mid && sectionRect.bottom >= mid) {
        currentChapter = section.dataset.chapterSection;
      }
    });
    chapterLinks.forEach(function (link) {
      link.classList.toggle("active", link.dataset.chapter === currentChapter);
    });

    drawGeometry();
  }

  var canvas = document.getElementById("geometry-canvas");
  var context = canvas ? canvas.getContext("2d") : null;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resizeCanvas() {
    if (!canvas || !context) return;
    var renderScale = window.innerWidth <= 640 ? 1.8 : 2.15;
    var width = canvas.offsetWidth || canvas.getBoundingClientRect().width;
    var height = canvas.offsetHeight || canvas.getBoundingClientRect().height;
    canvas.width = Math.max(1, Math.floor(width * renderScale * dpr));
    canvas.height = Math.max(1, Math.floor(height * renderScale * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawGeometry();
  }

  function drawGeometry() {
    if (!canvas || !context) return;
    var width = canvas.width / dpr;
    var height = canvas.height / dpr;
    context.clearRect(0, 0, width, height);

    var padX = Math.min(Math.max(8, width * 0.12), width * 0.24);
    var padY = Math.min(Math.max(8, height * 0.12), height * 0.24);
    var minX = -2;
    var maxX = 16;
    var minY = -5;
    var maxY = 13;
    var scale = Math.max(0.1, Math.min(
      (width - padX * 2) / (maxX - minX),
      (height - padY * 2) / (maxY - minY)
    ));
    var plotWidth = (maxX - minX) * scale;
    var plotHeight = (maxY - minY) * scale;
    var offsetX = (width - plotWidth) / 2;
    var offsetY = (height - plotHeight) / 2;

    function point(x, y) {
      return {
        x: offsetX + (x - minX) * scale,
        y: offsetY + (maxY - y) * scale,
      };
    }

    var A = point(5, 12);
    var B = point(0, 0);
    var C = point(14, 0);
    var O = point(7, 33 / 8);
    var Ap = point(81 / 8, 93 / 8);
    var Bp = point(-43 / 40, 201 / 40);
    var Cp = point(81 / 8, -27 / 8);

    context.save();
    context.strokeStyle = "rgba(85,185,255,0.055)";
    context.lineWidth = 1;
    for (var gx = Math.ceil(minX); gx <= Math.floor(maxX); gx += 2) {
      var gridX = point(gx, 0).x;
      context.beginPath();
      context.moveTo(gridX, offsetY);
      context.lineTo(gridX, offsetY + plotHeight);
      context.stroke();
    }
    for (var gy = Math.ceil(minY); gy <= Math.floor(maxY); gy += 2) {
      var gridY = point(0, gy).y;
      context.beginPath();
      context.moveTo(offsetX, gridY);
      context.lineTo(offsetX + plotWidth, gridY);
      context.stroke();
    }
    context.restore();

    function line(from, to, color, alpha, dashed) {
      context.save();
      context.globalAlpha = alpha;
      context.strokeStyle = color;
      context.lineWidth = 1.7;
      if (dashed) context.setLineDash([7, 7]);
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
      context.restore();
    }

    function dot(at, label, color, alpha) {
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 12;
      context.beginPath();
      context.arc(at.x, at.y, 3.4, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      context.font = "600 12px 'DM Mono', monospace";
      context.fillText(label, at.x + 7, at.y - 7);
      context.restore();
    }

    var baseAlpha = range(sceneProgress, 0.77, 0.82);
    line(A, B, "#d9f2ff", baseAlpha, false);
    line(B, C, "#d9f2ff", baseAlpha, false);
    line(C, A, "#d9f2ff", baseAlpha, false);
    dot(A, "A", "#d9f2ff", baseAlpha);
    dot(B, "B", "#d9f2ff", baseAlpha);
    dot(C, "C", "#d9f2ff", baseAlpha);

    var circleAlpha = range(sceneProgress, 0.84, 0.87);
    context.save();
    context.globalAlpha = circleAlpha * 0.5;
    context.strokeStyle = "#55b9ff";
    context.setLineDash([4, 6]);
    context.beginPath();
    context.arc(O.x, O.y, (65 / 8) * scale, 0, Math.PI * 2);
    context.stroke();
    context.restore();
    dot(O, "O", "#ffcf66", circleAlpha);

    var rotatedAlpha = range(sceneProgress, 0.88, 0.93);
    line(Ap, Bp, "#55b9ff", rotatedAlpha, true);
    line(Bp, Cp, "#55b9ff", rotatedAlpha, true);
    line(Cp, Ap, "#55b9ff", rotatedAlpha, true);
    dot(Ap, "A′", "#55b9ff", rotatedAlpha);
    dot(Bp, "B′", "#55b9ff", rotatedAlpha);
    dot(Cp, "C′", "#55b9ff", rotatedAlpha);

    var hexAlpha = range(sceneProgress, 0.94, 0.975);
    var polygon = [A, Ap, C, Cp, B, Bp];
    context.save();
    context.globalAlpha = hexAlpha;
    context.fillStyle = "rgba(85,185,255,0.08)";
    context.strokeStyle = "#ffcf66";
    context.lineWidth = 2.4;
    context.beginPath();
    context.moveTo(polygon[0].x, polygon[0].y);
    polygon.slice(1).forEach(function (vertex) { context.lineTo(vertex.x, vertex.y); });
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }

  var queued = false;
  window.addEventListener("scroll", function () {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function () {
      updateScroll();
      queued = false;
    });
  }, { passive: true });

  window.addEventListener("resize", function () {
    resizeCanvas();
    updateScroll();
  });

  var revealNodes = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !prefersReduced) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });
    revealNodes.forEach(function (node) { observer.observe(node); });
  } else {
    revealNodes.forEach(function (node) { node.classList.add("visible"); });
  }

  resizeCanvas();
  updateScroll();
  if (prefersReduced) {
    answerStream.textContent = solutionText;
    thinkingState.textContent = "Done";
    setActiveStep(5);
  }
})();
