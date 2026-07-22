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
  var storyTrack = document.querySelector(".story-track");
  var skipLink = document.querySelector(".skip-link");
  var chapters = Array.prototype.slice.call(document.querySelectorAll("[data-chapter]"));
  var chapterLinks = Array.prototype.slice.call(document.querySelectorAll("[data-chapter-link]"));
  var parallaxLayers = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
  var revealTargets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  var motionSelector = [
    ".hero-ghost",
    ".hero-copy > .eyebrow",
    ".hero-copy > h1",
    ".hero-copy > .hero-lead",
    ".hero-readout",
    ".hero-caption",
    ".scroll-cue",
    ".chapter-index",
    ".story-card",
    ".story-card > .eyebrow",
    ".story-card > h2",
    ".story-card > p",
    ".concert-card",
    ".pull-quote",
    ".upgrade-card",
    ".system-head > *",
    ".demo-stage",
    ".pipeline > li",
    ".feedback-copy > *",
    ".score-console",
    ".beyond-copy > *",
    ".source-cta",
    ".closing-line"
  ].join(",");
  var chapterMotionObjects = chapters.map(function (chapter) {
    return Array.prototype.slice.call(chapter.querySelectorAll(motionSelector));
  });
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var segmentPaths = Array.from({ length: 13 }, function (_, index) {
    return "../../assets/just-dance-film/just-dance-background-" + String(index).padStart(2, "0") + ".mp4";
  });
  var currentSegment = 0;
  var activeSlot = 0;
  var switchingFilm = false;
  var frameRequested = false;
  var manuallyPaused = false;
  var activeChapterName = "";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function smoothStep(value) {
    var bounded = clamp(value, 0, 1);
    return bounded * bounded * (3 - 2 * bounded);
  }

  function objectVisibility(relativePosition, objectIndex, objectCount) {
    if (reducedMotion) return Math.abs(relativePosition) < 0.5 ? 1 : 0;

    var order = objectCount > 1 ? objectIndex / (objectCount - 1) : 0;
    if (relativePosition <= 0) {
      var entrance = relativePosition + 1;
      return smoothStep((entrance - 0.42 - order * 0.07) / 0.38);
    }

    var exitDelay = order * 0.07;
    return 1 - smoothStep((relativePosition - 0.05 - exitDelay) / 0.38);
  }

  chapterMotionObjects.forEach(function (objects) {
    objects.forEach(function (object) {
      object.classList.add("motion-object");
    });
  });
  revealTargets.forEach(function (target) {
    target.classList.add("revealed");
  });

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

  function syncPoseDemo(chapterName) {
    if (!poseDemo) return;
    if (reducedMotion || chapterName !== "system") {
      poseDemo.pause();
      return;
    }

    var playAttempt = poseDemo.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch(function () {});
    }
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
    var trackRect = storyTrack ? storyTrack.getBoundingClientRect() : null;
    var trackTravel = storyTrack ? Math.max(1, storyTrack.offsetHeight - viewportHeight) : Math.max(1, root.scrollHeight - viewportHeight);
    var trackProgress = trackRect ? clamp(-trackRect.top / trackTravel, 0, 1) : clamp(window.scrollY / trackTravel, 0, 1);
    var lastChapterIndex = Math.max(0, chapters.length - 1);
    var scenePosition = trackProgress * lastChapterIndex;
    var activeIndex = clamp(Math.round(scenePosition), 0, lastChapterIndex);
    var activeChapter = chapters.length ? chapters[activeIndex].dataset.chapter : "intro";

    if (scrollFill) scrollFill.style.transform = "scaleX(" + trackProgress.toFixed(5) + ")";
    root.style.setProperty("--grid-shift", (trackProgress * 74).toFixed(2) + "px");
    root.style.setProperty("--orb-x", (Math.sin(trackProgress * Math.PI * 2) * 42).toFixed(2) + "px");

    chapters.forEach(function (chapter, index) {
      var distance = Math.abs(scenePosition - index);
      var rawOpacity = clamp(1 - distance, 0, 1);
      var atmosphereOpacity = smoothStep(rawOpacity);
      var relativePosition = scenePosition - index;
      var chapterProgress = clamp(0.5 + (scenePosition - index) * 0.5, 0, 1);
      var isActive = index === activeIndex;

      chapter.style.setProperty("--atmosphere-opacity", (reducedMotion ? (isActive ? 1 : 0) : atmosphereOpacity).toFixed(5));
      chapter.style.setProperty("--chapter-p", chapterProgress.toFixed(5));
      chapter.classList.toggle("is-active", isActive);
      chapter.setAttribute("aria-hidden", isActive ? "false" : "true");
      chapter.inert = !isActive;

      var motionObjects = chapterMotionObjects[index] || [];
      motionObjects.forEach(function (object, objectIndex) {
        var visibility = objectVisibility(relativePosition, objectIndex, motionObjects.length);
        var travel = 1 - visibility;
        var lane = objectIndex % 2 === 0 ? -1 : 1;
        var intrinsicOpacity = object.classList.contains("chapter-index") ? 0.48 : (object.classList.contains("hero-ghost") ? 0.42 : 1);
        var motionY = reducedMotion ? 0 : (relativePosition <= 0 ? 46 * travel : -32 * travel);
        var motionX = reducedMotion ? 0 : lane * (relativePosition <= 0 ? 10 : -7) * travel;
        var motionScale = reducedMotion ? 1 : 0.982 + visibility * 0.018;

        object.style.opacity = (visibility * intrinsicOpacity).toFixed(5);
        object.style.translate = motionX.toFixed(2) + "px " + motionY.toFixed(2) + "px";
        object.style.scale = motionScale.toFixed(5);
      });
    });

    body.dataset.activeChapter = activeChapter;
    chapterLinks.forEach(function (link) {
      var isCurrent = link.dataset.chapterLink === activeChapter;
      link.classList.toggle("active", isCurrent);
      if (isCurrent) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });

    if (activeChapterName !== activeChapter) {
      activeChapterName = activeChapter;
      syncPoseDemo(activeChapter);
    }

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

  function scrollToChapter(index, behavior) {
    if (!storyTrack || !chapters.length) return;
    var boundedIndex = clamp(index, 0, chapters.length - 1);
    var trackTop = window.scrollY + storyTrack.getBoundingClientRect().top;
    var travel = Math.max(0, storyTrack.offsetHeight - window.innerHeight);
    var targetTop = trackTop + travel * (boundedIndex / Math.max(1, chapters.length - 1));
    window.scrollTo({
      top: targetTop,
      behavior: reducedMotion ? "auto" : (behavior || "smooth")
    });
  }

  chapterLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      var targetIndex = chapters.findIndex(function (chapter) {
        return chapter.dataset.chapter === link.dataset.chapterLink;
      });
      if (targetIndex < 0) return;
      event.preventDefault();
      history.replaceState(null, "", "#" + chapters[targetIndex].id);
      scrollToChapter(targetIndex);
    });
  });

  if (skipLink) {
    skipLink.addEventListener("click", function (event) {
      var targetId = skipLink.getAttribute("href").replace(/^#/, "");
      var targetIndex = chapters.findIndex(function (chapter) {
        return chapter.id === targetId;
      });
      if (targetIndex < 0) return;
      event.preventDefault();
      history.replaceState(null, "", "#" + targetId);
      scrollToChapter(targetIndex);
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

  if (window.location.hash) {
    var initialId = window.location.hash.slice(1);
    var initialIndex = chapters.findIndex(function (chapter) {
      return chapter.id === initialId;
    });
    if (initialIndex >= 0) {
      requestAnimationFrame(function () {
        scrollToChapter(initialIndex, "auto");
      });
    }
  }
})();
