(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var films = [
    document.getElementById("dance-film"),
    document.getElementById("dance-film-next")
  ].filter(Boolean);
  var filmToggle = document.getElementById("film-toggle");
  var poseDemo = document.getElementById("pose-demo");
  var scrollFill = document.getElementById("scroll-fill");
  var chapters = Array.prototype.slice.call(document.querySelectorAll("[data-chapter]"));
  var chapterLinks = Array.prototype.slice.call(document.querySelectorAll("[data-chapter-link]"));
  var parallaxLayers = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
  var revealTargets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var segmentPaths = Array.from({ length: 13 }, function (_, index) {
    return "../../assets/just-dance-film/just-dance-background-" + String(index).padStart(2, "0") + ".mp4";
  });
  var currentSegment = 0;
  var activeSlot = 0;
  var switchingFilm = false;
  var frameRequested = false;
  var manuallyPaused = false;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function activeFilm() {
    return films[activeSlot] || null;
  }

  function standbyFilm() {
    return films.length > 1 ? films[activeSlot === 0 ? 1 : 0] : null;
  }

  function configureFilm(film, segmentIndex) {
    if (!film || Number(film.dataset.segmentIndex) === segmentIndex) return;
    film.dataset.segmentIndex = String(segmentIndex);
    film.src = segmentPaths[segmentIndex];
    film.load();
  }

  function cueNextSegment() {
    configureFilm(standbyFilm(), (currentSegment + 1) % segmentPaths.length);
  }

  function updateFilmToggle() {
    if (!filmToggle) return;
    var film = activeFilm();
    var paused = !film || film.paused;
    filmToggle.textContent = paused ? "PLAY FILM" : "PAUSE FILM";
    filmToggle.setAttribute("aria-pressed", paused ? "true" : "false");
    body.classList.toggle("film-paused", paused);
  }

  function playFilm() {
    var film = activeFilm();
    if (!film || reducedMotion || manuallyPaused || document.hidden) return;
    var playAttempt = film.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch(updateFilmToggle);
    }
  }

  function pauseFilms() {
    films.forEach(function (film) {
      film.pause();
    });
  }

  function switchSegment(outgoing) {
    if (switchingFilm || outgoing !== activeFilm() || films.length < 2) return;
    switchingFilm = true;

    var incoming = standbyFilm();
    var nextSegment = (currentSegment + 1) % segmentPaths.length;
    configureFilm(incoming, nextSegment);

    function finishSwitch() {
      currentSegment = nextSegment;
      activeSlot = activeSlot === 0 ? 1 : 0;
      incoming.classList.add("is-active");
      outgoing.classList.remove("is-active");
      outgoing.pause();
      switchingFilm = false;
      updateFilmToggle();
      window.setTimeout(cueNextSegment, 180);
    }

    var playAttempt = incoming.play();
    if (playAttempt && typeof playAttempt.then === "function") {
      playAttempt.then(finishSwitch).catch(function () {
        switchingFilm = false;
        updateFilmToggle();
      });
    } else {
      finishSwitch();
    }
  }

  if (films.length) {
    films[0].dataset.segmentIndex = "0";
    films.forEach(function (film) {
      film.muted = true;
      film.addEventListener("canplay", function () {
        if (film !== activeFilm()) return;
        body.classList.add("film-ready");
        playFilm();
      });
      film.addEventListener("ended", function () {
        switchSegment(film);
      });
      film.addEventListener("play", updateFilmToggle);
      film.addEventListener("pause", updateFilmToggle);
    });
    if (films[0].readyState >= 2) body.classList.add("film-ready");
    cueNextSegment();
  }

  if (films.length && filmToggle) {
    filmToggle.addEventListener("click", function () {
      var film = activeFilm();
      if (!film) return;
      if (film.paused) {
        manuallyPaused = false;
        playFilm();
      } else {
        manuallyPaused = true;
        pauseFilms();
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
      var progress = clamp((viewportHeight - rect.top) / (viewportHeight + rect.height), 0, 1);
      var midpointDistance = Math.abs((rect.top + rect.bottom) * 0.5 - viewportHeight * 0.5);
      chapter.style.setProperty("--chapter-p", progress.toFixed(5));

      if (rect.bottom > 0 && rect.top < viewportHeight && midpointDistance < activeDistance) {
        activeDistance = midpointDistance;
        activeChapter = chapter.dataset.chapter;
      }
    });

    body.dataset.activeChapter = activeChapter;
    chapters.forEach(function (chapter) {
      chapter.classList.toggle("is-active", chapter.dataset.chapter === activeChapter);
    });
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
    if (document.hidden) pauseFilms();
    else playFilm();
  });

  if (reducedMotion) {
    manuallyPaused = true;
    pauseFilms();
    if (poseDemo) poseDemo.pause();
  } else {
    playFilm();
  }
  updateFilmToggle();
  updateScrollScene();
})();
