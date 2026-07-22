(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var film = document.getElementById("dance-film");
  var filmToggle = document.getElementById("film-toggle");
  var scrollFill = document.getElementById("scroll-fill");
  var chapters = Array.prototype.slice.call(document.querySelectorAll("[data-chapter]"));
  var chapterLinks = Array.prototype.slice.call(document.querySelectorAll("[data-chapter-link]"));
  var parallaxLayers = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
  var revealTargets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var frameRequested = false;
  var manuallyPaused = false;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function updateFilmToggle() {
    if (!film || !filmToggle) return;
    var paused = film.paused;
    filmToggle.textContent = paused ? "PLAY FILM" : "PAUSE FILM";
    filmToggle.setAttribute("aria-pressed", paused ? "true" : "false");
    body.classList.toggle("film-paused", paused);
  }

  function playFilm() {
    if (!film || reducedMotion || manuallyPaused || document.hidden) return;
    var playAttempt = film.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch(function () {
        updateFilmToggle();
      });
    }
  }

  if (film) {
    film.muted = true;
    if (film.readyState >= 2) body.classList.add("film-ready");
    film.addEventListener("canplay", function () {
      body.classList.add("film-ready");
      playFilm();
    });
    film.addEventListener("play", updateFilmToggle);
    film.addEventListener("pause", updateFilmToggle);
  }

  if (film && filmToggle) {
    filmToggle.addEventListener("click", function () {
      if (film.paused) {
        manuallyPaused = false;
        playFilm();
      } else {
        manuallyPaused = true;
        film.pause();
      }
      updateFilmToggle();
    });
  }

  function updateScrollScene() {
    frameRequested = false;
    var viewportHeight = Math.max(1, window.innerHeight);
    var pageHeight = Math.max(1, root.scrollHeight - viewportHeight);
    var documentProgress = clamp(window.scrollY / pageHeight, 0, 1);
    var activeChapter = chapters.length ? chapters[0].dataset.chapter : "intro";
    var activeDistance = Infinity;

    if (scrollFill) scrollFill.style.transform = "scaleX(" + documentProgress.toFixed(5) + ")";
    root.style.setProperty("--grid-shift", (documentProgress * 74).toFixed(2) + "px");
    root.style.setProperty("--orb-x", (Math.sin(documentProgress * Math.PI * 2) * 42).toFixed(2) + "px");

    chapters.forEach(function (chapter) {
      var rect = chapter.getBoundingClientRect();
      var total = Math.max(1, rect.height - viewportHeight);
      var progress = clamp(-rect.top / total, 0, 1);
      var midpointDistance = Math.abs((rect.top + rect.bottom) * 0.5 - viewportHeight * 0.5);
      chapter.style.setProperty("--chapter-p", progress.toFixed(5));

      if (rect.bottom > 0 && rect.top < viewportHeight && midpointDistance < activeDistance) {
        activeDistance = midpointDistance;
        activeChapter = chapter.dataset.chapter;
      }
    });

    body.dataset.activeChapter = activeChapter;
    chapterLinks.forEach(function (link) {
      link.classList.toggle("active", link.dataset.chapterLink === activeChapter);
    });

    if (!reducedMotion) {
      parallaxLayers.forEach(function (layer) {
        var chapter = layer.closest("[data-chapter]");
        if (!chapter) return;
        var progress = parseFloat(chapter.style.getPropertyValue("--chapter-p")) || 0;
        var speed = parseFloat(layer.dataset.parallax) || 0;
        var offset = (progress - 0.5) * viewportHeight * speed * 2;
        layer.style.setProperty("--parallax-y", offset.toFixed(2) + "px");
      });
    }
  }

  function requestScrollUpdate() {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(updateScrollScene);
  }

  if ("IntersectionObserver" in window && !reducedMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("revealed");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10%", threshold: 0.15 });
    revealTargets.forEach(function (target) {
      revealObserver.observe(target);
    });
  } else {
    revealTargets.forEach(function (target) {
      target.classList.add("revealed");
    });
  }

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate, { passive: true });
  window.addEventListener("pageshow", function () {
    requestScrollUpdate();
    playFilm();
  });
  document.addEventListener("visibilitychange", function () {
    if (!film) return;
    if (document.hidden) film.pause();
    else playFilm();
  });

  if (reducedMotion && film) {
    manuallyPaused = true;
    film.pause();
  } else {
    playFilm();
  }
  updateFilmToggle();
  updateScrollScene();
})();
