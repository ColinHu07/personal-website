/* ============================================================
   COLIN HU // JARVIS INTERFACE v5
   - Scroll scrub: writes --p (0..1) on each .scrub scene
   - Topographic holographic globe (filled continents, contour
     rings, Asia -> Europe -> NYC camera path)
   - Full-resolution NYC drone footage in a slow cinematic pass
   - Code-native Meta glasses disassembly, full 360-degree orbit,
     reassembly, and wearer-side display dive scrubbed from --p
   ============================================================ */

(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var phonePerformance = window.matchMedia("(max-width: 900px), (pointer: coarse), (orientation: landscape) and (max-height: 500px)");
  var isPhonePerformance = phonePerformance.matches;
  var isSafariPerformance = /^((?!chrome|chromium|android).)*safari/i.test(navigator.userAgent);
  var SCROLL_FALLBACK_DELAY = isPhonePerformance || isSafariPerformance ? 48 : 90;
  var MOBILE_FRAME_INTERVAL = 1000 / 30;
  var DPR = Math.min(window.devicePixelRatio || 1, isPhonePerformance ? 1 : 2);
  var pageVisible = !document.hidden;
  var siteInteractive = !document.documentElement.classList.contains("site-preloading");
  var runtimeSyncs = [];

  window.addEventListener("site:ready", function () {
    siteInteractive = true;
    runtimeSyncs.forEach(function (syncRuntime) {
      syncRuntime();
    });
  });

  document.addEventListener("visibilitychange", function () {
    pageVisible = !document.hidden;
    runtimeSyncs.forEach(function (syncRuntime) {
      syncRuntime();
    });
  });

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }
  function smooth(t) {
    t = clamp01(t);
    return t * t * (3 - 2 * t);
  }
  function smoother(t) {
    t = clamp01(t);
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function isInView(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  // Run expensive canvases only while their scene is on screen. Pausing the
  // requestAnimationFrame chain entirely (instead of merely skipping its draw)
  // keeps offscreen scenes from competing with scrolling on mobile Safari.
  function runSceneAnimation(target, renderFrame, options) {
    if (!target || typeof renderFrame !== "function") return;
    options = options || {};
    var intersecting = false;
    var frameId = 0;
    var lastFrame = -Infinity;
    var mobileInterval = options.mobileInterval == null ? MOBILE_FRAME_INTERVAL : options.mobileInterval;

    function frame(time) {
      frameId = 0;
      if (!intersecting || !pageVisible) return;
      if (!isPhonePerformance || mobileInterval <= 0 || time - lastFrame >= mobileInterval) {
        lastFrame = time;
        renderFrame(time || 0);
      }
      frameId = requestAnimationFrame(frame);
    }

    function syncRuntime() {
      var shouldRun = intersecting && pageVisible && siteInteractive;
      target.dataset.runtime = shouldRun ? "active" : "sleeping";
      if (shouldRun && !frameId) frameId = requestAnimationFrame(frame);
      if (!shouldRun && frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    }

    runtimeSyncs.push(syncRuntime);
    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        intersecting = Boolean(entries[0] && entries[0].isIntersecting);
        syncRuntime();
      }, { rootMargin: options.rootMargin || "25% 0px", threshold: 0 });
      observer.observe(target);
    } else {
      intersecting = true;
      syncRuntime();
    }
  }

  function whenSceneNear(target, callback, rootMargin) {
    if (!target || typeof callback !== "function") return;
    if (!("IntersectionObserver" in window)) {
      callback();
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0] && entries[0].isIntersecting) {
        observer.disconnect();
        callback();
      }
    }, { rootMargin: rootMargin || "200% 0px", threshold: 0 });
    observer.observe(target);
  }

  /* ---------- scroll scrub engine ---------- */

  var scrubScenes = Array.prototype.slice.call(document.querySelectorAll(".scene.scrub"));
  var progressFill = document.getElementById("progress-fill");
  var dots = Array.prototype.slice.call(document.querySelectorAll(".scene-dots a"));
  var allScenes = Array.prototype.slice.call(document.querySelectorAll(".scene"));
  var frontJourney = document.querySelector("[data-front-journey]");
  var frontJourneyProgress = 0;
  var phoneTimeline = window.matchMedia("(max-width: 760px), (orientation: landscape) and (max-height: 500px)");

  var cityViewport = document.querySelector("#city .viewport");
  var cityFlightVideo = document.querySelector(".city-flight-video");
  var cityFlightRequested = false;
  var montageLabel = document.getElementById("montage-label");
  var concertViewport = document.querySelector("#concert .viewport");
  var glassesViewport = document.querySelector("#glasses .viewport");
  var broadcastViewport = document.querySelector("#broadcast .viewport");
  var cityP = 0;
  var globeP = 0;
  var concertP = 0;

  var FRONT_JOURNEY_STOPS = { hero: 0, city: 0.62, broadcast: 0.84 };
  if (frontJourney) {
    Array.prototype.slice.call(document.querySelectorAll('a[href="#hero"], a[href="#city"], a[href="#broadcast"]')).forEach(function (link) {
      link.addEventListener("click", function (event) {
        var sceneName = link.getAttribute("href").slice(1);
        var stop = FRONT_JOURNEY_STOPS[sceneName];
        if (typeof stop !== "number") return;
        event.preventDefault();
        var runway = Math.max(0, frontJourney.offsetHeight - window.innerHeight);
        window.scrollTo({
          top: frontJourney.offsetTop + runway * stop,
          behavior: prefersReduced ? "auto" : "smooth",
        });
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, "", "#" + sceneName);
        }
      });
    });
  }

  // CSS animations are also paused outside the current/adjacent scene. The
  // generous margin lets the next transition warm up before it becomes visible.
  if ("IntersectionObserver" in window) {
    var sceneRuntimeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle("scene-runtime-active", entry.isIntersecting);
      });
    }, { rootMargin: "40% 0px", threshold: 0 });
    allScenes.forEach(function (scene) {
      sceneRuntimeObserver.observe(scene);
    });
  } else {
    allScenes.forEach(function (scene) {
      scene.classList.add("scene-runtime-active");
    });
  }

  var CITY_FLIGHT_STOPS = [
    "EAST RIVER RUN",
    "BRIDGE DECK APPROACH",
    "STREET-LEVEL ASCENT",
    "MIDTOWN TOWER PASS",
  ];

  function updateCityFlightLabel(progress) {
    if (!montageLabel) return;
    var stopIndex = Math.min(CITY_FLIGHT_STOPS.length - 1, Math.floor(clamp01(progress) * CITY_FLIGHT_STOPS.length));
    montageLabel.textContent = CITY_FLIGHT_STOPS[stopIndex];
  }

  function syncCityFlight() {
    var flyP = smoother((cityP - 0.29) / 0.68);
    updateCityFlightLabel(flyP);

    if (!cityFlightVideo) return;
    if (!cityFlightRequested && cityP > 0.12 && isInView(cityViewport)) {
      cityFlightRequested = true;
      cityFlightVideo.preload = "auto";
      cityFlightVideo.load();
    }
    cityFlightVideo.playbackRate = 0.58;

    var shouldFly = cityP > 0.27 && cityP < 0.99 && isInView(cityViewport) && !prefersReduced;
    if (shouldFly) {
      var playAttempt = cityFlightVideo.play();
      if (playAttempt && typeof playAttempt.catch === "function") playAttempt.catch(function () {});
    } else if (!cityFlightVideo.paused) {
      cityFlightVideo.pause();
    }
  }

  if (cityFlightVideo) {
    cityFlightVideo.addEventListener("loadedmetadata", syncCityFlight);
    cityFlightVideo.addEventListener("timeupdate", function () {
      if (Number.isFinite(cityFlightVideo.duration) && cityFlightVideo.duration > 0) {
        updateCityFlightLabel(cityFlightVideo.currentTime / cityFlightVideo.duration);
      }
    });
  }

  function onScroll() {
    var vh = window.innerHeight;
    var doc = document.documentElement;
    var frontRect = frontJourney ? frontJourney.getBoundingClientRect() : null;
    if (frontRect) {
      var frontRunway = Math.max(1, frontRect.height - vh);
      frontJourneyProgress = clamp01(-frontRect.top / frontRunway);
      var globeMorphP = clamp01(frontJourneyProgress / 0.18);
      var globeRevealP = smoother((frontJourneyProgress - 0.14) / 0.08);
      globeP = smoother((frontJourneyProgress - 0.22) / 0.38);
      var globeExitP = smoother((frontJourneyProgress - 0.6) / 0.08);
      if (cityViewport) {
        cityViewport.style.setProperty(
          "--front-scene-opacity",
          smoother((frontJourneyProgress - 0.04) / 0.12).toFixed(4)
        );
        cityViewport.style.setProperty("--globe-morph", globeMorphP.toFixed(4));
        cityViewport.style.setProperty("--globe-reveal", globeRevealP.toFixed(4));
        cityViewport.style.setProperty("--globe-orbit", globeP.toFixed(4));
        cityViewport.style.setProperty("--globe-exit", globeExitP.toFixed(4));
      }
      if (broadcastViewport) {
        broadcastViewport.style.setProperty(
          "--front-scene-opacity",
          smoother((frontJourneyProgress - 0.72) / 0.1).toFixed(4)
        );
      }
    }

    scrubScenes.forEach(function (scene) {
      var inFrontJourney = frontJourney && scene.parentElement === frontJourney;
      var rect = inFrontJourney && frontRect ? frontRect : scene.getBoundingClientRect();
      var nearScene = rect.bottom > -vh * 0.5 && rect.top < vh * 1.5;
      if (!nearScene) {
        if (scene.id === "city" && cityFlightVideo && !cityFlightVideo.paused) {
          cityFlightVideo.pause();
        }
        return;
      }
      var total = rect.height - vh;
      var p = total > 0 ? clamp01(-rect.top / total) : 0;
      if (inFrontJourney) {
        if (scene.id === "hero") p = clamp01(frontJourneyProgress / 0.18);
        else if (scene.id === "city") p = clamp01((frontJourneyProgress - 0.5) / 0.32);
        else if (scene.id === "broadcast") p = clamp01((frontJourneyProgress - 0.7) / 0.28);
      }
      var viewport = scene.querySelector(".viewport");
      if (viewport) {
        viewport.style.setProperty("--p", p.toFixed(4));
        viewport.style.setProperty("--scene-enter", smoother(p / (phoneTimeline.matches ? 0.14 : 0.1)).toFixed(4));
      }

      if (scene.id === "hero" && viewport) {
        var heroExitStart = phoneTimeline.matches ? 0.68 : 0.78;
        viewport.style.setProperty("--scene-exit", smoother((p - heroExitStart) / (1 - heroExitStart)).toFixed(4));
      }

      if (scene.id === "city") {
        cityP = p;
        var cityFlightReveal = smoother((p - 0.405) / 0.16);
        var citySceneExit = smoother((p - 0.86) / 0.14);
        if (cityViewport) {
          if (inFrontJourney) {
            cityViewport.style.setProperty(
              "--scene-enter",
              smoother((frontJourneyProgress - 0.04) / 0.12).toFixed(4)
            );
          }
          cityViewport.style.setProperty("--city-in", cityFlightReveal.toFixed(4));
          cityViewport.style.setProperty("--scene-exit", citySceneExit.toFixed(4));
        }
        syncCityFlight();
      }
      if (scene.id === "concert") concertP = p;
      if (scene.id === "glasses" && glassesViewport) {
        // Folded hero, quarter-turn to the left profile, exploded orbit,
        // precision reassembly, then one wearer-side right-lens camera glide.
        var templeFold = 1 - smooth(clamp01((p - 0.03) / 0.18));
        var explode = 0;
        if (p < 0.2) {
          explode = 0;
        } else if (p < 0.31) {
          explode = smooth((p - 0.2) / 0.11);
        } else if (p < 0.53) {
          explode = 1;
        } else if (p < 0.7) {
          explode = 1 - smooth((p - 0.53) / 0.17);
        }

        var productOrbit =
          p < 0.22
            ? 0.25 * smooth(clamp01((p - 0.03) / 0.19))
            : 0.25 + 0.75 * smooth(clamp01((p - 0.22) / 0.48));
        // The wearer-side rotation and camera approach deliberately overlap:
        // the right lens remains the camera target throughout one continuous glide.
        var productTurn = smoother((p - 0.56) / 0.24);
        var lensDive = smoother((p - 0.6) / 0.27);
        // Give the live feed a substantial scroll runway: it appears through
        // the waveguide, clears its optical bloom, reaches full focus, and then
        // holds long enough to read before the Socials handoff begins.
        var lensFeed = smoother((p - 0.72) / 0.15);
        var lensPortal = smoother((p - 0.75) / 0.14);
        var lensHud = smoother((p - 0.79) / 0.12);
        var statusProduct = 1 - smooth(clamp01(p / 0.08));
        var statusExploded =
          smooth(clamp01((p - 0.17) / 0.08)) *
          (1 - smooth(clamp01((p - 0.57) / 0.11)));
        var statusComplete =
          smooth(clamp01((p - 0.65) / 0.08)) *
          (1 - smooth(clamp01((p - 0.86) / 0.07)));

        glassesViewport.style.setProperty("--fold", templeFold.toFixed(4));
        glassesViewport.style.setProperty("--explode", explode.toFixed(4));
        glassesViewport.style.setProperty("--orbit", productOrbit.toFixed(4));
        glassesViewport.style.setProperty("--turn", productTurn.toFixed(4));
        glassesViewport.style.setProperty("--dive", lensDive.toFixed(4));
        glassesViewport.style.setProperty("--feed", lensFeed.toFixed(4));
        glassesViewport.style.setProperty("--portal", lensPortal.toFixed(4));
        glassesViewport.style.setProperty("--hud", lensHud.toFixed(4));
        glassesViewport.style.setProperty("--status-product", statusProduct.toFixed(4));
        glassesViewport.style.setProperty("--status-exploded", statusExploded.toFixed(4));
        glassesViewport.style.setProperty("--status-complete", statusComplete.toFixed(4));
        var glassesExitStart = phoneTimeline.matches ? 0.9 : 0.96;
        glassesViewport.style.setProperty("--scene-exit", smoother((p - glassesExitStart) / (1 - glassesExitStart)).toFixed(4));

        if (p > 0.91) glassesViewport.setAttribute("data-lens", "open");
        else glassesViewport.removeAttribute("data-lens");
      }
      if (scene.id === "broadcast" && broadcastViewport) {
        broadcastViewport.style.setProperty("--scene-enter", smoother(p / 0.12).toFixed(4));
        broadcastViewport.style.setProperty("--scene-exit", smoother((p - 0.84) / 0.16).toFixed(4));
        if (p > 0.6) broadcastViewport.setAttribute("data-feed", "open");
        else broadcastViewport.removeAttribute("data-feed");
      }
    });

    if (progressFill) {
      var max = doc.scrollHeight - vh;
      progressFill.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
    }

    var mid = vh * 0.5;
    var active = null;
    allScenes.forEach(function (scene) {
      var r = scene.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) active = scene.dataset.scene;
    });
    if (frontRect && frontRect.top <= mid && frontRect.bottom >= mid) {
      active = frontJourneyProgress < 0.18
        ? "hero"
        : frontJourneyProgress < 0.78
          ? "city"
          : "broadcast";
    }
    dots.forEach(function (dot) {
      dot.classList.toggle("active", dot.dataset.dot === active);
    });
    document.body.dataset.activeScene = active || "";
    window.dispatchEvent(new CustomEvent("scene:sync"));
  }

  var ticking = false;
  var scrollFallbackTimer = 0;

  function flushScrollUpdate() {
    if (!ticking) return;
    ticking = false;
    if (scrollFallbackTimer) {
      clearTimeout(scrollFallbackTimer);
      scrollFallbackTimer = 0;
    }
    onScroll();
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        // WebKit can defer requestAnimationFrame during momentum scrolling.
        // Keep the normal rAF path, but refresh Safari's scrub target soon
        // enough for the glasses renderer's frame-rescue timer to use it.
        scrollFallbackTimer = setTimeout(flushScrollUpdate, SCROLL_FALLBACK_DELAY);
        requestAnimationFrame(flushScrollUpdate);
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", onScroll);
  window.addEventListener("pageshow", onScroll);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) onScroll();
  });

  /* ---------- boot line typewriter ---------- */

  var bootLine = document.getElementById("boot-line");
  if (bootLine && !prefersReduced) {
    var msg = "> JARVIS PROTOCOL // SYSTEMS ONLINE. WELCOME, VISITOR.";
    bootLine.textContent = "";
    var ti = 0;
    (function type() {
      if (ti <= msg.length) {
        bootLine.textContent = msg.slice(0, ti) + (ti % 2 ? "\u2588" : "");
        ti++;
        setTimeout(type, 34);
      } else {
        bootLine.textContent = msg;
      }
    })();
  }

  /* ---------- ambient particle field ---------- */

  var canvas = document.getElementById("particle-field");
  if (canvas && !prefersReduced) {
    var ctx = canvas.getContext("2d");
    var particles = [];
    var W, H;

    var resizeParticles = function () {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resizeParticles();
    window.addEventListener("resize", resizeParticles);

    var COUNT = Math.min(90, Math.floor(window.innerWidth / 14));
    for (var p = 0; p < COUNT; p++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.8 + 0.4,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.18,
        a: Math.random() * 0.5 + 0.15,
        hue: Math.random() < 0.82 ? "79,216,255" : "255,79,216",
      });
    }

    function drawParticles(time) {
      var motionStep = Number.isFinite(particleLastFrame)
        ? Math.min(2.5, (time - particleLastFrame) / (1000 / 60))
        : 1;
      particleLastFrame = time;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < particles.length; i++) {
        var pt = particles[i];
        pt.x += pt.vx * motionStep;
        pt.y += pt.vy * motionStep;
        if (pt.x < -10) pt.x = W + 10;
        if (pt.x > W + 10) pt.x = -10;
        if (pt.y < -10) pt.y = H + 10;
        if (pt.y > H + 10) pt.y = -10;

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + pt.hue + "," + pt.a + ")";
        ctx.fill();
      }
      for (var a = 0; a < particles.length; a++) {
        for (var b = a + 1; b < particles.length; b++) {
          var dx = particles[a].x - particles[b].x;
          var dy = particles[a].y - particles[b].y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 110 * 110) {
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.strokeStyle = "rgba(79,216,255," + (0.07 * (1 - d2 / (110 * 110))).toFixed(3) + ")";
            ctx.stroke();
          }
        }
      }
    }
    var particleLastFrame = -Infinity;
    runSceneAnimation(document.getElementById("hero"), drawParticles, {
      rootMargin: "70% 0px",
    });
  }

  /* ============================================================
     PHOTOREAL GLOBE (scene 02, first phase)
     A WebGL sphere textured with NASA Blue Marble imagery
     (assets/earth-texture.jpg) renders the earth itself; the 2d
     canvas on top draws the holographic HUD (halo, scanlines,
     visited pings, NYC target lock).
     Camera path: Asia (118E) -> Europe -> locks onto NYC (74W).
     ============================================================ */

  var NYC = { lat: 40.7128, lon: -74.006 };

  var VISITED = [
    { name: "SWITZERLAND", lat: 46.8, lon: 8.2 },
    { name: "MEXICO", lat: 23.6, lon: -102.5 },
    { name: "CANADA", lat: 56.1, lon: -106.3 },
    { name: "CHINA", lat: 35.9, lon: 104.2 },
    { name: "JAPAN", lat: 36.2, lon: 138.3 },
    { name: "SOUTH KOREA", lat: 35.9, lon: 127.8 },
    { name: "ENGLAND", lat: 52.4, lon: -1.5 },
    { name: "ICELAND", lat: 64.9, lon: -19.0 },
    { name: "FRANCE", lat: 46.2, lon: 2.2 },
    { name: "SPAIN", lat: 40.5, lon: -3.7 },
    { name: "ITALY", lat: 41.9, lon: 12.6 },
  ];

  var globeCanvas = document.querySelector(".globe-canvas");
  if (globeCanvas) {
    var gtx = globeCanvas.getContext("2d");
    var GW, GH, GR, GCX, GCY;
    var globeHalo, globeOcean, globeShade;

    // WebGL canvas for the textured earth sits directly under the HUD canvas
    var glCanvas = document.createElement("canvas");
    glCanvas.className = "globe-canvas globe-gl";
    glCanvas.setAttribute("aria-hidden", "true");
    globeCanvas.parentNode.insertBefore(glCanvas, globeCanvas);

    var resizeGlobe = function () {
      GW = globeCanvas.width = globeCanvas.offsetWidth * DPR;
      GH = globeCanvas.height = globeCanvas.offsetHeight * DPR;
      glCanvas.width = GW;
      glCanvas.height = GH;
      GR = Math.min(GW, GH) * 0.31;
      GCX = GW / 2;
      GCY = GH / 2;
      globeHalo = gtx.createRadialGradient(GCX, GCY, GR * 0.88, GCX, GCY, GR * 1.3);
      globeHalo.addColorStop(0, "rgba(70,170,255,0)");
      globeHalo.addColorStop(0.5, "rgba(70,170,255,0.16)");
      globeHalo.addColorStop(0.75, "rgba(70,170,255,0.05)");
      globeHalo.addColorStop(1, "rgba(70,170,255,0)");
      globeOcean = gtx.createRadialGradient(
        GCX - GR * 0.35, GCY - GR * 0.4, GR * 0.1,
        GCX, GCY, GR
      );
      globeOcean.addColorStop(0, "rgba(70,150,220,0.6)");
      globeOcean.addColorStop(0.45, "rgba(24,84,150,0.72)");
      globeOcean.addColorStop(0.85, "rgba(8,40,84,0.85)");
      globeOcean.addColorStop(1, "rgba(4,20,46,0.95)");
      globeShade = gtx.createRadialGradient(
        GCX - GR * 0.5, GCY - GR * 0.45, GR * 0.2,
        GCX + GR * 0.25, GCY + GR * 0.25, GR * 1.35
      );
      globeShade.addColorStop(0, "rgba(0,0,0,0)");
      globeShade.addColorStop(0.66, "rgba(2,8,20,0.04)");
      globeShade.addColorStop(1, "rgba(2,8,20,0.5)");
      if (gl) gl.viewport(0, 0, GW, GH);
    };

    /* --- WebGL earth --- */
    var gl = glCanvas.getContext("webgl", { alpha: true, antialias: !isPhonePerformance }) ||
             glCanvas.getContext("experimental-webgl", { alpha: true, antialias: !isPhonePerformance });
    var glReady = false;
    var globeFrameConfirmed = false;
    var uRotLoc, uCenterLoc, uRadiusLoc, uResLoc;

    if (gl) {
      var vsSrc =
        "attribute vec2 aPos;" +
        "void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }";
      var fsSrc =
        "precision mediump float;" +
        "uniform sampler2D uTex;" +
        "uniform vec2 uRot;" +      // x: rotLon, y: rotLat (radians)
        "uniform vec2 uCenter;" +   // globe center in device px (y up)
        "uniform float uRadius;" +
        "void main(){" +
        "  vec2 p = (gl_FragCoord.xy - uCenter) / uRadius;" +
        "  float r2 = dot(p, p);" +
        "  if (r2 > 1.0) discard;" +
        "  float z = sqrt(1.0 - r2);" +
        "  vec3 n = vec3(p, z);" +
        // inverse of the orthographic camera used by the HUD overlay
        "  float cf = cos(uRot.y), sf = sin(uRot.y);" +
        "  float sinLa = n.y * cf + n.z * sf;" +
        "  float cosLaCosLo = n.z * cf - n.y * sf;" +
        "  float la = asin(clamp(sinLa, -1.0, 1.0));" +
        "  float lo = atan(n.x, cosLaCosLo) + uRot.x;" +
        "  vec2 uv = vec2(fract(lo / 6.2831853 + 0.5), 0.5 - la / 3.14159265);" +
        "  vec3 col = texture2D(uTex, uv).rgb;" +
        // soft sun from the upper left + ambient
        "  vec3 L = normalize(vec3(-0.38, 0.42, 0.82));" +
        "  float diff = clamp(dot(n, L), 0.0, 1.0);" +
        "  col *= 0.34 + 0.78 * diff;" +
        // atmosphere: blue scatter builds toward the limb
        "  float limb = pow(1.0 - z, 2.2);" +
        "  col = mix(col, vec3(0.42, 0.72, 1.0), limb * 0.55);" +
        // limb softening so the edge is not aliased
        "  float edge = smoothstep(1.0, 0.988, r2);" +
        "  gl_FragColor = vec4(col, edge);" +
        "}";

      function makeShader(type, src) {
        var sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
      }
      var vs = makeShader(gl.VERTEX_SHADER, vsSrc);
      var fs = makeShader(gl.FRAGMENT_SHADER, fsSrc);
      if (vs && fs) {
        var prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
          gl.useProgram(prog);
          var quad = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, quad);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
          var aPos = gl.getAttribLocation(prog, "aPos");
          gl.enableVertexAttribArray(aPos);
          gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
          uRotLoc = gl.getUniformLocation(prog, "uRot");
          uCenterLoc = gl.getUniformLocation(prog, "uCenter");
          uRadiusLoc = gl.getUniformLocation(prog, "uRadius");
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

          var tex = gl.createTexture();
          var texImg = new Image();
          texImg.decoding = "async";
          texImg.fetchPriority = "high";
          texImg.onload = function () {
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, texImg);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            glReady = true;
            globeFrameConfirmed = false;
          };
          texImg.onerror = function () {
            glReady = false;
            if (cityViewport) cityViewport.classList.add("globe-webgl-failed");
          };
          texImg.src = isPhonePerformance
            ? "assets/earth-texture-mobile.jpg"
            : "assets/earth-texture.jpg";
        }
      }

      glCanvas.addEventListener("webglcontextlost", function (event) {
        event.preventDefault();
        glReady = false;
        globeFrameConfirmed = false;
        if (cityViewport) {
          cityViewport.classList.remove("globe-webgl-ready");
          cityViewport.classList.add("globe-webgl-failed");
        }
      });
    }

    resizeGlobe();
    window.addEventListener("resize", resizeGlobe);

    // orthographic projection with camera at (rotLat, rotLon)
    function project(lat, lon, rotLon, rotLat) {
      var la = (lat * Math.PI) / 180;
      var lo = ((lon - rotLon) * Math.PI) / 180;
      var f = (rotLat * Math.PI) / 180;
      var x = Math.cos(la) * Math.sin(lo);
      var y = Math.cos(f) * Math.sin(la) - Math.sin(f) * Math.cos(la) * Math.cos(lo);
      var z = Math.sin(f) * Math.sin(la) + Math.cos(f) * Math.cos(la) * Math.cos(lo);
      return { x: GCX + x * GR, y: GCY - y * GR, z: z, ux: x, uy: y };
    }

    function drawGlobe(time) {
      if (cityP < 0.56 && isInView(cityViewport)) {
        gtx.clearRect(0, 0, GW, GH);

        // Asia -> Europe -> Americas camera sweep, locking on NYC
        var lock = globeP;
        var sway = Math.sin(time * 0.0004) * 4 * (1 - lock);
        // Asia (118E) -> Europe (~12E) -> NYC (-74W)
        var rotLon, rotLat;
        if (lock < 0.55) {
          var tAsia = smooth(lock / 0.55);
          rotLon = lerp(118, 12, tAsia);
          rotLat = lerp(16, 48, tAsia);
        } else {
          var tUs = smooth((lock - 0.55) / 0.45);
          rotLon = lerp(12, NYC.lon, tUs);
          rotLat = lerp(48, NYC.lat, tUs);
        }
        rotLon += sway;

        // --- textured earth (WebGL) ---
        if (gl) {
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          if (glReady) {
            gl.uniform2f(uRotLoc, (rotLon * Math.PI) / 180, (rotLat * Math.PI) / 180);
            gl.uniform2f(uCenterLoc, GCX, GH - GCY);
            gl.uniform1f(uRadiusLoc, GR);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            if (!globeFrameConfirmed && cityViewport && gl.getError() === gl.NO_ERROR) {
              globeFrameConfirmed = true;
              cityViewport.classList.remove("globe-webgl-failed");
              cityViewport.classList.add("globe-webgl-ready");
            }
          }
        }

        // --- atmosphere halo ---
        gtx.fillStyle = globeHalo;
        gtx.beginPath();
        gtx.arc(GCX, GCY, GR * 1.3, 0, Math.PI * 2);
        gtx.fill();

        // deep-space backing while the texture streams in
        if (!glReady) {
          gtx.fillStyle = globeOcean;
          gtx.beginPath();
          gtx.arc(GCX, GCY, GR, 0, Math.PI * 2);
          gtx.fill();
        }

        // --- subtle holo HUD over the sphere ---
        gtx.save();
        gtx.beginPath();
        gtx.arc(GCX, GCY, GR, 0, Math.PI * 2);
        gtx.clip();

        // night-side falloff toward the lower right
        gtx.fillStyle = globeShade;
        gtx.fillRect(GCX - GR, GCY - GR, GR * 2, GR * 2);

        // faint holographic scanlines
        gtx.fillStyle = "rgba(160,225,255,0.035)";
        var step = Math.max(4, GR * 0.028);
        for (var sy = GCY - GR; sy < GCY + GR; sy += step) {
          gtx.fillRect(GCX - GR, sy, GR * 2, 1);
        }

        gtx.restore(); // end sphere clip

        // --- rim light ---
        gtx.beginPath();
        gtx.arc(GCX, GCY, GR, 0, Math.PI * 2);
        gtx.strokeStyle = "rgba(150,220,255,0.45)";
        gtx.lineWidth = 1.4;
        gtx.stroke();

        // --- visited-place sparks ---
        var visitedAlpha = 1 - lock * 0.8;
        if (visitedAlpha > 0.05) {
          for (var vi = 0; vi < VISITED.length; vi++) {
            var place = VISITED[vi];
            var vp = project(place.lat, place.lon, rotLon, rotLat);
            if (vp.z < 0.08) continue;
            var cycle = (time * 0.0011 + vi * 0.53) % 3;
            var ping = cycle < 1 ? cycle : 0;
            var base = (0.4 + vp.z * 0.55) * visitedAlpha;

            var dotR = Math.max(GR * 0.014, 3.4);
            gtx.beginPath();
            gtx.arc(vp.x, vp.y, dotR * 2.4, 0, Math.PI * 2);
            gtx.fillStyle = "rgba(255,210,79," + (base * 0.25).toFixed(2) + ")";
            gtx.fill();
            gtx.beginPath();
            gtx.arc(vp.x, vp.y, dotR, 0, Math.PI * 2);
            gtx.fillStyle = "rgba(255,210,79," + base.toFixed(2) + ")";
            gtx.fill();

            if (ping > 0) {
              gtx.beginPath();
              gtx.arc(vp.x, vp.y, dotR + ping * GR * 0.09, 0, Math.PI * 2);
              gtx.strokeStyle = "rgba(255,210,79," + ((1 - ping) * 0.75 * visitedAlpha).toFixed(2) + ")";
              gtx.lineWidth = 2;
              gtx.stroke();
            }

            if (vp.z > 0.55 && ping > 0.1 && ping < 0.9) {
              gtx.font = "600 " + Math.max(GR * 0.052, 11).toFixed(0) + "px Rajdhani, sans-serif";
              gtx.fillStyle = "rgba(255,210,79," + (Math.sin(ping * Math.PI) * 0.9 * visitedAlpha).toFixed(2) + ")";
              gtx.fillText(place.name, vp.x + 10, vp.y - 8);
            }
          }
        }

        // --- NYC target marker ---
        var m = project(NYC.lat, NYC.lon, rotLon, rotLat);
        if (m.z > 0) {
          var pulse = 0.5 + Math.sin(time * 0.006) * 0.5;
          gtx.beginPath();
          gtx.arc(m.x, m.y, 5 + pulse * 4 + lock * 6, 0, Math.PI * 2);
          gtx.strokeStyle = "rgba(255,79,216," + (0.5 + lock * 0.5) + ")";
          gtx.lineWidth = 2;
          gtx.stroke();
          gtx.beginPath();
          gtx.arc(m.x, m.y, 3, 0, Math.PI * 2);
          gtx.fillStyle = "#ff4fd8";
          gtx.fill();
          gtx.strokeStyle = "rgba(255,79,216,0.8)";
          [[14, 0], [-14, 0], [0, 14], [0, -14]].forEach(function (t) {
            gtx.beginPath();
            gtx.moveTo(m.x + t[0] * 0.5, m.y + t[1] * 0.5);
            gtx.lineTo(m.x + t[0], m.y + t[1]);
            gtx.stroke();
          });
        }
      }
    }
    if (!prefersReduced) runSceneAnimation(cityViewport, drawGlobe, { rootMargin: "55% 0px" });
    else drawGlobe(0);
  }

  /* ============================================================
     3D NYC FLYTHROUGH (scene 02, second phase)
     Perspective wireframe city: procedurally generated blocks,
     landmark towers, suspension bridges, moving cars. Plays on
     a time loop for as long as the scene is on screen.
     ============================================================ */

  var cityCanvas = document.querySelector(".city-canvas");

  if (cityCanvas) {
    var ctx2 = cityCanvas.getContext("2d");
    var CW = 0, CH = 0;

    var resizeCity = function () {
      CW = cityCanvas.offsetWidth;
      CH = cityCanvas.offsetHeight;
      cityCanvas.width = CW * DPR;
      cityCanvas.height = CH * DPR;
    };
    resizeCity();
    window.addEventListener("resize", resizeCity);

    var ROW = 26;         // z-spacing between building rows
    var FAR = 620;        // view distance
    var SPEED = 0.036;    // world units per ms

    function rowRand(i) {
      // deterministic per-row seed
      var s = (i * 9301 + 49297) % 233280;
      return function () {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    }

    function projectCity(x, y, dz, camX, horizon, f, tilt) {
      var pitch = tilt || 0;
      var yLift = y + dz * pitch * 0.018;
      var inv = f / dz;
      return { x: CW / 2 + (x - camX) * inv, y: horizon + (26 - yLift) * inv, s: inv };
    }

    function edgeAlpha(dz) {
      return clamp01(1.25 - dz / FAR) * 0.9;
    }

    var cityTime = 0; // set once per frame, used by animated facade bits

    var AWNING_COLORS = [[200, 40, 60], [30, 140, 90], [40, 90, 180], [190, 120, 30]];
    var BILLBOARD_COLORS = [[255, 79, 216], [79, 216, 255], [255, 200, 60]];

    // street-level tenants: the stuff that actually makes it NYC
    var STOREFRONTS = [
      { name: "JOE'S PIZZA", band: [178, 34, 44], text: [255, 244, 224], glow: [255, 120, 90] },
      { name: "NY KNICKS", band: [0, 62, 148], text: [245, 132, 38], glow: [245, 132, 38] },
      { name: "DELI GROCERY 24HR", band: [214, 168, 36], text: [32, 26, 12], glow: [255, 220, 110] },
      { name: "HOT BAGELS", band: [124, 74, 36], text: [255, 236, 205], glow: [255, 200, 130] },
      { name: "RAMEN BAR", band: [150, 30, 40], text: [255, 230, 210], glow: [255, 90, 120] },
      { name: "NAIL SALON", band: [120, 40, 130], text: [255, 220, 250], glow: [230, 120, 255] },
    ];

    // draw a wireframe box: corners x0..x1, z0..z1, height h
    // seed (0..1) gives each building its own character: storefront
    // awnings, fire escapes, rooftop water towers, glowing billboards
    function drawBox(x0, x1, z0, z1, h, camZ, camX, horizon, f, hue, tilt, seed) {
      var dz0 = z0 - camZ, dz1 = z1 - camZ;
      if (dz1 <= 4) return;
      dz0 = Math.max(dz0, 4);

      var a = edgeAlpha(dz0);
      if (a <= 0.02) return;

      // masonry palette from the reference photos: brick, brownstone,
      // limestone, glass — so the block isn't one flat navy hologram
      var fc = [3, 11, 21];
      if (seed !== undefined) {
        var fPick = (seed * 13.7) % 1;
        if (fPick < 0.28) fc = [34, 18, 14];        // red brick
        else if (fPick < 0.5) fc = [30, 23, 16];    // brownstone
        else if (fPick < 0.68) fc = [20, 24, 30];   // limestone
        else if (fPick < 0.82) fc = [10, 18, 34];   // glass tower
      }

      // 8 corners
      var fBL = projectCity(x0, 0, dz0, camX, horizon, f, tilt);
      var fBR = projectCity(x1, 0, dz0, camX, horizon, f, tilt);
      var fTL = projectCity(x0, h, dz0, camX, horizon, f, tilt);
      var fTR = projectCity(x1, h, dz0, camX, horizon, f, tilt);
      var bBL = projectCity(x0, 0, dz1, camX, horizon, f, tilt);
      var bBR = projectCity(x1, 0, dz1, camX, horizon, f, tilt);
      var bTL = projectCity(x0, h, dz1, camX, horizon, f, tilt);
      var bTR = projectCity(x1, h, dz1, camX, horizon, f, tilt);

      var stroke = "rgba(" + hue + "," + (a * 0.8).toFixed(2) + ")";
      var aFill = 0.55 + a * 0.42;

      // top face
      ctx2.beginPath();
      ctx2.moveTo(fTL.x, fTL.y); ctx2.lineTo(fTR.x, fTR.y);
      ctx2.lineTo(bTR.x, bTR.y); ctx2.lineTo(bTL.x, bTL.y);
      ctx2.closePath();
      ctx2.fillStyle = shadeRgb(fc, 0.5, aFill);
      ctx2.fill();
      ctx2.strokeStyle = stroke;
      ctx2.lineWidth = 1.1;
      ctx2.stroke();

      // side face (visible side depends on camera x)
      var side = (x0 + x1) / 2 > camX
        ? [fBL, fTL, bTL, bBL]
        : [fBR, fTR, bTR, bBR];
      ctx2.beginPath();
      ctx2.moveTo(side[0].x, side[0].y); ctx2.lineTo(side[1].x, side[1].y);
      ctx2.lineTo(side[2].x, side[2].y); ctx2.lineTo(side[3].x, side[3].y);
      ctx2.closePath();
      ctx2.fillStyle = shadeRgb(fc, 0.65, aFill);
      ctx2.fill();
      ctx2.stroke();

      // front face
      ctx2.beginPath();
      ctx2.moveTo(fBL.x, fBL.y); ctx2.lineTo(fTL.x, fTL.y);
      ctx2.lineTo(fTR.x, fTR.y); ctx2.lineTo(fBR.x, fBR.y);
      ctx2.closePath();
      ctx2.fillStyle = shadeRgb(fc, 1, aFill);
      ctx2.fill();
      ctx2.stroke();

      // cornice capping the masonry facades (photo staple)
      if (seed !== undefined && dz0 < 260 && h > 20 && h < 140) {
        var cn1 = projectCity(x0 - 0.5, h - 2, dz0, camX, horizon, f, tilt);
        var cn2 = projectCity(x1 + 0.5, h - 2, dz0, camX, horizon, f, tilt);
        var cn3 = projectCity(x1 + 0.5, h + 0.6, dz0, camX, horizon, f, tilt);
        var cn4 = projectCity(x0 - 0.5, h + 0.6, dz0, camX, horizon, f, tilt);
        fillQuad(cn1, cn2, cn3, cn4, shadeRgb(fc, 1.9, Math.min(1, aFill * 1.05)));
        ctx2.strokeStyle = "rgba(" + hue + "," + (a * 0.5).toFixed(2) + ")";
        ctx2.lineWidth = 1;
        ctx2.beginPath(); ctx2.moveTo(cn4.x, cn4.y); ctx2.lineTo(cn3.x, cn3.y); ctx2.stroke();
        // band course above the storefront
        var bc1 = projectCity(x0, 10.2, dz0, camX, horizon, f, tilt);
        var bc2 = projectCity(x1, 10.2, dz0, camX, horizon, f, tilt);
        ctx2.strokeStyle = shadeRgb(fc, 2.2, a * 0.5);
        ctx2.beginPath(); ctx2.moveTo(bc1.x, bc1.y); ctx2.lineTo(bc2.x, bc2.y); ctx2.stroke();
      }

      // windows on nearby buildings — some warm, some cool, so the
      // grid reads like lived-in apartments instead of one hologram
      if (dz0 < 200 && h > 24) {
        var warm = seed !== undefined && (seed * 11.3) % 1 < 0.45;
        var cols = Math.max(2, Math.floor((x1 - x0) / 7));
        var rows = Math.max(2, Math.floor(h / 12));
        ctx2.fillStyle = warm
          ? "rgba(255,214,150," + (a * 0.5).toFixed(2) + ")"
          : "rgba(140,230,255," + (a * 0.55).toFixed(2) + ")";
        var rr = rowRand(Math.floor(z0));
        for (var wc = 0; wc < cols; wc++) {
          for (var wr = 0; wr < rows; wr++) {
            if (rr() > 0.36) continue;
            var wx = x0 + 2 + (wc + 0.5) * ((x1 - x0 - 4) / cols);
            var wy = 4 + (wr + 0.5) * ((h - 8) / rows);
            var wpt = projectCity(wx, wy, dz0, camX, horizon, f, tilt);
            var ws = Math.max(1, wpt.s * 1.6);
            ctx2.fillRect(wpt.x - ws / 2, wpt.y - ws / 2, ws, ws * 1.4);
          }
        }
      }

      // per-building character: doors, awnings, fire escapes,
      // billboards, rooftop water towers (Manhattan street life)
      if (seed !== undefined && dz0 < 230) {
        var s1 = (seed * 7.13) % 1;
        var s2 = (seed * 3.77) % 1;
        var midX = (x0 + x1) / 2;

        // street level: glowing shop glass, a colored sign fascia
        // with the tenant's name, and a lit doorway — this is what
        // sells the pizzeria / Knicks store / bodega block
        var s3 = (seed * 5.31) % 1;
        var tenant = STOREFRONTS[Math.floor(s3 * STOREFRONTS.length) % STOREFRONTS.length];

        // warm glass band across the ground floor
        var gq1 = projectCity(x0 + 0.8, 0.5, dz0, camX, horizon, f, tilt);
        var gq2 = projectCity(x1 - 0.8, 0.5, dz0, camX, horizon, f, tilt);
        var gq3 = projectCity(x1 - 0.8, 5.8, dz0, camX, horizon, f, tilt);
        var gq4 = projectCity(x0 + 0.8, 5.8, dz0, camX, horizon, f, tilt);
        fillQuad(gq1, gq2, gq3, gq4, "rgba(255,222,160," + (a * 0.32).toFixed(2) + ")");
        // window mullions
        ctx2.strokeStyle = "rgba(20,36,54," + (a * 0.8).toFixed(2) + ")";
        ctx2.lineWidth = 1;
        for (var mx = x0 + 5; mx < x1 - 2; mx += 5) {
          var m1 = projectCity(mx, 0.5, dz0, camX, horizon, f, tilt);
          var m2 = projectCity(mx, 5.8, dz0, camX, horizon, f, tilt);
          ctx2.beginPath(); ctx2.moveTo(m1.x, m1.y); ctx2.lineTo(m2.x, m2.y); ctx2.stroke();
        }
        // lit doorway
        var doorW = Math.min(4, (x1 - x0) * 0.2);
        var dBL = projectCity(midX - doorW / 2, 0, dz0, camX, horizon, f, tilt);
        var dBR = projectCity(midX + doorW / 2, 0, dz0, camX, horizon, f, tilt);
        var dTL = projectCity(midX - doorW / 2, 6, dz0, camX, horizon, f, tilt);
        var dTR = projectCity(midX + doorW / 2, 6, dz0, camX, horizon, f, tilt);
        fillQuad(dBL, dTL, dTR, dBR, "rgba(255,232,180," + (a * 0.85).toFixed(2) + ")");

        // sign fascia band with tenant name
        var f1 = projectCity(x0 + 0.6, 6.2, dz0, camX, horizon, f, tilt);
        var f2 = projectCity(x1 - 0.6, 6.2, dz0, camX, horizon, f, tilt);
        var f3 = projectCity(x1 - 0.6, 9.6, dz0, camX, horizon, f, tilt);
        var f4 = projectCity(x0 + 0.6, 9.6, dz0, camX, horizon, f, tilt);
        fillQuad(f1, f2, f3, f4, shadeRgb(tenant.band, 1, a * 0.92));
        // neon underglow spilling onto the sidewalk
        var spill = ctx2.createRadialGradient(
          (f1.x + f2.x) / 2, dBL.y, 0,
          (f1.x + f2.x) / 2, dBL.y, Math.max(8, (f2.x - f1.x) * 0.6)
        );
        spill.addColorStop(0, shadeRgb(tenant.glow, 1, a * 0.16));
        spill.addColorStop(1, shadeRgb(tenant.glow, 1, 0));
        ctx2.fillStyle = spill;
        ctx2.fillRect(f1.x - 20, dBL.y - 14, (f2.x - f1.x) + 40, 34);
        // tenant name, when close enough to read
        var signH = Math.abs(f1.y - f4.y);
        if (signH > 5.5 && f2.x - f1.x > 26) {
          ctx2.font = "700 " + (signH * 0.62).toFixed(1) + "px 'Arial Narrow', Arial, sans-serif";
          ctx2.textAlign = "center";
          ctx2.textBaseline = "middle";
          ctx2.fillStyle = shadeRgb(tenant.text, 1, Math.min(1, a * 1.15));
          ctx2.fillText(tenant.name, (f1.x + f2.x) / 2, (f1.y + f4.y) / 2 + signH * 0.06, (f2.x - f1.x) * 0.9);
        }

        // storefront awning over the sidewalk
        if (s1 < 0.38) {
          var a1 = projectCity(x0 + 1.5, 9.6, dz0, camX, horizon, f, tilt);
          var a2 = projectCity(x1 - 1.5, 9.6, dz0, camX, horizon, f, tilt);
          var a3 = projectCity(x1 - 2.5, 12.4, dz0, camX, horizon, f, tilt);
          var a4 = projectCity(x0 + 2.5, 12.4, dz0, camX, horizon, f, tilt);
          fillQuad(a1, a2, a3, a4, shadeRgb(tenant.band, 0.72, a * 0.8));
        }

        // fire escape zig-zagging down the facade
        if (s1 >= 0.38 && s1 < 0.7 && h > 34) {
          var fx0 = x0 + (x1 - x0) * 0.16;
          var fx1 = x0 + (x1 - x0) * 0.52;
          ctx2.strokeStyle = "rgba(150,215,240," + (a * 0.45).toFixed(2) + ")";
          ctx2.lineWidth = 1;
          var step = 0;
          for (var fy = 10; fy < h - 5; fy += 9) {
            var e1 = projectCity(fx0, fy, dz0, camX, horizon, f, tilt);
            var e2 = projectCity(fx1, fy, dz0, camX, horizon, f, tilt);
            ctx2.beginPath(); ctx2.moveTo(e1.x, e1.y); ctx2.lineTo(e2.x, e2.y); ctx2.stroke();
            if (fy + 9 < h - 5) {
              var lTop = projectCity(step % 2 === 0 ? fx1 : fx0, fy, dz0, camX, horizon, f, tilt);
              var lBot = projectCity(step % 2 === 0 ? fx0 : fx1, fy + 9, dz0, camX, horizon, f, tilt);
              ctx2.beginPath(); ctx2.moveTo(lTop.x, lTop.y); ctx2.lineTo(lBot.x, lBot.y); ctx2.stroke();
            }
            step++;
          }
        }

        // Times Square energy: stacked LED billboards that pulse out
        // of phase, and the occasional full-height LED wrap
        if (s2 > 0.74 && h > 46) {
          var tall = s2 > 0.92 && h > 70;
          var panels = tall ? 3 : 2;
          var bw = (x1 - x0) * (tall ? 0.4 : 0.32);
          var wrapTop = tall ? h * 0.88 : h * 0.82;
          var wrapBot = tall ? h * 0.24 : h * 0.55;
          for (var pn = 0; pn < panels; pn++) {
            var bc = BILLBOARD_COLORS[(Math.floor(s1 * 7) + pn) % BILLBOARD_COLORS.length];
            var pulse = 0.55 + 0.45 * Math.sin(cityTime * 0.0018 + seed * 30 + pn * 2.3);
            var py0 = wrapBot + ((wrapTop - wrapBot) / panels) * pn + 1;
            var py1 = wrapBot + ((wrapTop - wrapBot) / panels) * (pn + 1) - 1;
            var b1 = projectCity(midX - bw, py0, dz0, camX, horizon, f, tilt);
            var b2 = projectCity(midX + bw, py0, dz0, camX, horizon, f, tilt);
            var b3 = projectCity(midX + bw, py1, dz0, camX, horizon, f, tilt);
            var b4 = projectCity(midX - bw, py1, dz0, camX, horizon, f, tilt);
            fillQuad(b1, b2, b3, b4, shadeRgb(bc, 0.42, a * 0.65 * pulse));
            var g1 = projectCity(midX - bw * 0.86, py0 + (py1 - py0) * 0.16, dz0, camX, horizon, f, tilt);
            var g2 = projectCity(midX + bw * 0.86, py0 + (py1 - py0) * 0.16, dz0, camX, horizon, f, tilt);
            var g3 = projectCity(midX + bw * 0.86, py1 - (py1 - py0) * 0.16, dz0, camX, horizon, f, tilt);
            var g4 = projectCity(midX - bw * 0.86, py1 - (py1 - py0) * 0.16, dz0, camX, horizon, f, tilt);
            fillQuad(g1, g2, g3, g4, shadeRgb(bc, 1, a * 0.8 * pulse));
            // holographic photo panel inside each billboard slab
            var panelH = Math.abs(g4.y - g1.y);
            if (panelH > 5 && Math.abs(g2.x - g1.x) > 18) {
              var sky = ctx2.createLinearGradient(g1.x, g1.y, g2.x, g4.y);
              sky.addColorStop(0, "rgba(130,190,255," + (a * 0.3 * pulse).toFixed(2) + ")");
              sky.addColorStop(0.5, "rgba(255,210,130," + (a * 0.22 * pulse).toFixed(2) + ")");
              sky.addColorStop(1, "rgba(30,50,80," + (a * 0.35 * pulse).toFixed(2) + ")");
              ctx2.fillStyle = sky;
              ctx2.fillRect(Math.min(g1.x, g4.x), Math.min(g1.y, g4.y), Math.abs(g2.x - g1.x), panelH);
              ctx2.fillStyle = "rgba(4,12,24," + (a * 0.2).toFixed(2) + ")";
              for (var sl = g1.y; sl < g4.y; sl += 3) {
                ctx2.fillRect(g1.x, sl, g2.x - g1.x, 1);
              }
            }
          }
        }

        // rooftop water tower on the older walk-ups
        if (s1 >= 0.7 && h > 34 && h < 160) {
          var wtX = x0 + (x1 - x0) * 0.32;
          var wdz = dz0 + 3;
          var steelA = "rgba(140,200,225," + (a * 0.7).toFixed(2) + ")";
          ctx2.strokeStyle = steelA;
          ctx2.lineWidth = 1;
          [[-2.4, -1.9], [2.4, 1.9]].forEach(function (lg) {
            var lb = projectCity(wtX + lg[0], h, wdz, camX, horizon, f, tilt);
            var lt = projectCity(wtX + lg[1], h + 4, wdz, camX, horizon, f, tilt);
            ctx2.beginPath(); ctx2.moveTo(lb.x, lb.y); ctx2.lineTo(lt.x, lt.y); ctx2.stroke();
          });
          var w1 = projectCity(wtX - 3, h + 4, wdz, camX, horizon, f, tilt);
          var w2 = projectCity(wtX + 3, h + 4, wdz, camX, horizon, f, tilt);
          var w3 = projectCity(wtX + 3, h + 11, wdz, camX, horizon, f, tilt);
          var w4 = projectCity(wtX - 3, h + 11, wdz, camX, horizon, f, tilt);
          fillQuad(w1, w2, w3, w4, "rgba(10,22,36," + (0.6 + a * 0.35).toFixed(2) + ")");
          ctx2.beginPath();
          ctx2.moveTo(w1.x, w1.y); ctx2.lineTo(w2.x, w2.y);
          ctx2.lineTo(w3.x, w3.y); ctx2.lineTo(w4.x, w4.y);
          ctx2.closePath(); ctx2.stroke();
          var c1 = projectCity(wtX - 3.3, h + 11, wdz, camX, horizon, f, tilt);
          var c2 = projectCity(wtX + 3.3, h + 11, wdz, camX, horizon, f, tilt);
          var c3 = projectCity(wtX, h + 15, wdz, camX, horizon, f, tilt);
          ctx2.beginPath();
          ctx2.moveTo(c1.x, c1.y); ctx2.lineTo(c2.x, c2.y); ctx2.lineTo(c3.x, c3.y);
          ctx2.closePath();
          ctx2.fillStyle = "rgba(16,32,50," + (0.6 + a * 0.35).toFixed(2) + ")";
          ctx2.fill();
          ctx2.stroke();
        }
      }

      // spire for tall towers
      if (h > 150) {
        var spBase = projectCity((x0 + x1) / 2, h, dz0, camX, horizon, f, tilt);
        var spTop = projectCity((x0 + x1) / 2, h + 34, dz0, camX, horizon, f, tilt);
        ctx2.beginPath();
        ctx2.moveTo(spBase.x, spBase.y);
        ctx2.lineTo(spTop.x, spTop.y);
        ctx2.strokeStyle = stroke;
        ctx2.stroke();
        ctx2.beginPath();
        ctx2.arc(spTop.x, spTop.y, Math.max(1.6, spTop.s * 2), 0, Math.PI * 2);
        ctx2.fillStyle = "rgba(255,79,216," + a.toFixed(2) + ")";
        ctx2.fill();
      }
    }

    function drawBridge(z, camZ, camX, horizon, f, tilt) {
      var dz = z - camZ;
      if (dz <= 6 || dz > FAR) return;
      var a = edgeAlpha(dz);
      if (a <= 0.03) return;
      var stroke = "rgba(79,216,255," + a.toFixed(2) + ")";
      var towerH = 72, deckY = 22, span = 150;

      // deck
      var dL = projectCity(-span, deckY, dz, camX, horizon, f, tilt);
      var dR = projectCity(span, deckY, dz, camX, horizon, f, tilt);
      ctx2.beginPath();
      ctx2.moveTo(dL.x, dL.y); ctx2.lineTo(dR.x, dR.y);
      ctx2.strokeStyle = stroke;
      ctx2.lineWidth = 2;
      ctx2.stroke();
      ctx2.lineWidth = 1.1;

      // towers + cables + suspenders
      [-46, 46].forEach(function (tx) {
        var tB = projectCity(tx, 0, dz, camX, horizon, f, tilt);
        var tT = projectCity(tx, towerH, dz, camX, horizon, f, tilt);
        ctx2.beginPath();
        ctx2.moveTo(tB.x, tB.y); ctx2.lineTo(tT.x, tT.y);
        ctx2.strokeStyle = stroke;
        ctx2.lineWidth = 2.4;
        ctx2.stroke();
        ctx2.lineWidth = 1.1;
        // beacon
        ctx2.beginPath();
        ctx2.arc(tT.x, tT.y, Math.max(1.4, tT.s * 1.6), 0, Math.PI * 2);
        ctx2.fillStyle = "rgba(255,79,216," + a.toFixed(2) + ")";
        ctx2.fill();
      });
      // main cables: tower tops sag to deck at center and ends
      var t1 = projectCity(-46, towerH, dz, camX, horizon, f, tilt);
      var t2 = projectCity(46, towerH, dz, camX, horizon, f, tilt);
      var mid = projectCity(0, deckY + 6, dz, camX, horizon, f, tilt);
      var endL = projectCity(-span, deckY + 3, dz, camX, horizon, f, tilt);
      var endR = projectCity(span, deckY + 3, dz, camX, horizon, f, tilt);
      ctx2.beginPath();
      ctx2.moveTo(endL.x, endL.y);
      ctx2.quadraticCurveTo((endL.x + t1.x) / 2, t1.y + (endL.y - t1.y) * 0.2, t1.x, t1.y);
      ctx2.quadraticCurveTo(mid.x, mid.y + (mid.y - t1.y) * 0.12, t2.x, t2.y);
      ctx2.quadraticCurveTo((endR.x + t2.x) / 2, t2.y + (endR.y - t2.y) * 0.2, endR.x, endR.y);
      ctx2.strokeStyle = stroke;
      ctx2.stroke();
      // suspenders between towers
      for (var s = 1; s < 8; s++) {
        var sx = -46 + (92 / 8) * s;
        var sag = 1 - Math.abs(s - 4) / 4;
        var top = projectCity(sx, towerH - sag * (towerH - deckY - 6), dz, camX, horizon, f, tilt);
        var bot = projectCity(sx, deckY, dz, camX, horizon, f, tilt);
        ctx2.beginPath();
        ctx2.moveTo(top.x, top.y);
        ctx2.lineTo(bot.x, bot.y);
        ctx2.strokeStyle = "rgba(79,216,255," + (a * 0.5).toFixed(2) + ")";
        ctx2.stroke();
      }
    }

    /* ---------- vehicles: real car bodies, subway trains ---------- */

    var CAR_COLORS = [
      [252, 209, 22],   // yellow cab
      [252, 209, 22],
      [252, 209, 22],
      [205, 62, 78],
      [196, 208, 218],
      [74, 100, 132],
      [238, 242, 246],
    ];

    // Manhattan subway route bullets for entrance signs
    var MTA_LINES = ["N · Q · R · W", "4 · 5 · 6", "1 · 2 · 3", "A · C · E", "L TRAIN"];

    function shadeRgb(rgb, mul, a) {
      return "rgba(" + Math.min(255, (rgb[0] * mul) | 0) + "," +
        Math.min(255, (rgb[1] * mul) | 0) + "," +
        Math.min(255, (rgb[2] * mul) | 0) + "," + a.toFixed(2) + ")";
    }

    function fillQuad(p1, p2, p3, p4, fill) {
      ctx2.beginPath();
      ctx2.moveTo(p1.x, p1.y);
      ctx2.lineTo(p2.x, p2.y);
      ctx2.lineTo(p3.x, p3.y);
      ctx2.lineTo(p4.x, p4.y);
      ctx2.closePath();
      ctx2.fillStyle = fill;
      ctx2.fill();
    }

    // small solid box for vehicles; dzf/dzb are camera-relative depths
    function vehicleBox(x0, x1, y0, y1, dzf, dzb, camX, horizon, f, tilt, rgb, a) {
      if (dzb <= 4 || dzf > FAR) return;
      dzf = Math.max(dzf, 4);
      var fBL = projectCity(x0, y0, dzf, camX, horizon, f, tilt);
      var fBR = projectCity(x1, y0, dzf, camX, horizon, f, tilt);
      var fTL = projectCity(x0, y1, dzf, camX, horizon, f, tilt);
      var fTR = projectCity(x1, y1, dzf, camX, horizon, f, tilt);
      var bBL = projectCity(x0, y0, dzb, camX, horizon, f, tilt);
      var bBR = projectCity(x1, y0, dzb, camX, horizon, f, tilt);
      var bTL = projectCity(x0, y1, dzb, camX, horizon, f, tilt);
      var bTR = projectCity(x1, y1, dzb, camX, horizon, f, tilt);
      fillQuad(fTL, fTR, bTR, bTL, shadeRgb(rgb, 1.3, a));         // roof catches light
      if (camX < x0) fillQuad(fBL, fTL, bTL, bBL, shadeRgb(rgb, 0.58, a));
      else if (camX > x1) fillQuad(fBR, fTR, bTR, bBR, shadeRgb(rgb, 0.58, a));
      fillQuad(fBL, fTL, fTR, fBR, shadeRgb(rgb, 0.95, a));
    }

    // a car or yellow cab driving the avenue
    function drawCar(laneX, dz, toward, kind, camX, horizon, f, tilt) {
      if (dz <= 4 || dz > FAR) return;
      var a = edgeAlpha(dz);
      if (a < 0.04) return;
      var isCab = kind % CAR_COLORS.length <= 2;
      var col = CAR_COLORS[kind % CAR_COLORS.length];
      var len = isCab ? 6.8 : 7;
      var x0 = laneX - (isCab ? 1.85 : 1.7), x1 = laneX + (isCab ? 1.85 : 1.7);

      // wheels first so the body sits on them
      ctx2.fillStyle = "rgba(8,10,14," + a.toFixed(2) + ")";
      [[dz + 1.2], [dz + len - 1.2]].forEach(function (wz) {
        [x0 + 0.25, x1 - 0.25].forEach(function (wx) {
          var wp = projectCity(wx, 0.75, wz[0], camX, horizon, f, tilt);
          var wr = Math.min(Math.max(0.8, wp.s * 0.85), 4);
          ctx2.beginPath();
          ctx2.ellipse(wp.x, wp.y, wr * 0.75, wr, 0, 0, Math.PI * 2);
          ctx2.fill();
        });
      });

      // lower body slab with a darker rocker panel
      vehicleBox(x0, x1, 0.9, 2.7, dz + 0.3, dz + len - 0.3, camX, horizon, f, tilt, col, a);
      // hood + trunk step down slightly so it's not one brick
      vehicleBox(x0 + 0.1, x1 - 0.1, 2.7, 3.1, dz + 0.3, dz + 1.8, camX, horizon, f, tilt, col, a * 0.98);
      vehicleBox(x0 + 0.1, x1 - 0.1, 2.7, 3.1, dz + len - 1.8, dz + len - 0.3, camX, horizon, f, tilt, col, a * 0.98);

      // glass cabin: raked windshield + roof + rear glass
      var glass = [40, 62, 88];
      var c1 = projectCity(x0 + 0.35, 3.1, dz + 1.8, camX, horizon, f, tilt);
      var c2 = projectCity(x1 - 0.35, 3.1, dz + 1.8, camX, horizon, f, tilt);
      var c3 = projectCity(x1 - 0.45, 4.35, dz + 2.7, camX, horizon, f, tilt);
      var c4 = projectCity(x0 + 0.45, 4.35, dz + 2.7, camX, horizon, f, tilt);
      fillQuad(c1, c2, c3, c4, shadeRgb(glass, toward ? 1.25 : 0.9, a * 0.95));
      vehicleBox(x0 + 0.45, x1 - 0.45, 4.1, 4.4, dz + 2.7, dz + len - 2.5, camX, horizon, f, tilt, shadeArr(col, 0.92), a);
      var r1 = projectCity(x0 + 0.35, 3.1, dz + len - 1.6, camX, horizon, f, tilt);
      var r2 = projectCity(x1 - 0.35, 3.1, dz + len - 1.6, camX, horizon, f, tilt);
      var r3 = projectCity(x1 - 0.45, 4.35, dz + len - 2.5, camX, horizon, f, tilt);
      var r4 = projectCity(x0 + 0.45, 4.35, dz + len - 2.5, camX, horizon, f, tilt);
      fillQuad(r1, r2, r3, r4, shadeRgb(glass, toward ? 0.8 : 1.2, a * 0.95));

      // cab roof sign + medallion number plate
      if (isCab) {
        var t1 = projectCity(laneX - 0.75, 4.35, dz + 3.1, camX, horizon, f, tilt);
        var t2 = projectCity(laneX + 0.75, 4.35, dz + 3.1, camX, horizon, f, tilt);
        var th = Math.max(1.4, t1.s * 1.1);
        ctx2.fillStyle = "rgba(18,18,22," + a.toFixed(2) + ")";
        ctx2.fillRect(t1.x, t1.y - th, t2.x - t1.x, th);
        ctx2.fillStyle = "rgba(255,240,170," + (a * 0.95).toFixed(2) + ")";
        ctx2.fillRect(t1.x + (t2.x - t1.x) * 0.15, t1.y - th * 0.88, (t2.x - t1.x) * 0.7, th * 0.65);
        // checker band + rear medallion
        var sideX = camX < laneX ? x0 : x1;
        var k1 = projectCity(sideX, 1.5, dz + 0.5, camX, horizon, f, tilt);
        var k2 = projectCity(sideX, 1.5, dz + len - 0.5, camX, horizon, f, tilt);
        ctx2.strokeStyle = "rgba(12,12,14," + (a * 0.85).toFixed(2) + ")";
        ctx2.lineWidth = Math.max(1.2, k1.s * 0.55);
        ctx2.setLineDash([4, 3]);
        ctx2.beginPath(); ctx2.moveTo(k1.x, k1.y); ctx2.lineTo(k2.x, k2.y); ctx2.stroke();
        ctx2.setLineDash([]);
        var med = projectCity(sideX, 2.4, dz + len - 0.5, camX, horizon, f, tilt);
        ctx2.fillStyle = "rgba(255,252,230," + (a * 0.9).toFixed(2) + ")";
        var mw = Math.max(2, med.s * 2.2);
        ctx2.fillRect(med.x - mw / 2, med.y - mw * 0.35, mw, mw * 0.7);
      }

      // lights + bumper
      var frontZ = toward ? dz + 0.3 : dz + len - 0.3;
      var bmp1 = projectCity(x0, 1, dz + 0.15, camX, horizon, f, tilt);
      var bmp2 = projectCity(x1, 1, dz + 0.15, camX, horizon, f, tilt);
      ctx2.strokeStyle = "rgba(150,160,172," + (a * 0.6).toFixed(2) + ")";
      ctx2.lineWidth = Math.max(1, bmp1.s * 0.35);
      ctx2.beginPath(); ctx2.moveTo(bmp1.x, bmp1.y); ctx2.lineTo(bmp2.x, bmp2.y); ctx2.stroke();

      var l1 = projectCity(laneX - 1.15, 2, dz + 0.1, camX, horizon, f, tilt);
      var l2 = projectCity(laneX + 1.15, 2, dz + 0.1, camX, horizon, f, tilt);
      var r = Math.min(Math.max(0.8, l1.s * 1.1), 2.4);
      if (toward) {
        // headlights + a soft beam pool on the asphalt ahead
        ctx2.fillStyle = "rgba(255,250,225," + a.toFixed(2) + ")";
        ctx2.beginPath();
        ctx2.ellipse(l1.x, l1.y, r * 1.25, r * 0.8, 0, 0, Math.PI * 2);
        ctx2.ellipse(l2.x, l2.y, r * 1.25, r * 0.8, 0, 0, Math.PI * 2);
        ctx2.fill();
        var road = projectCity(laneX, 0, Math.max(5, dz - 6), camX, horizon, f, tilt);
        var beam = ctx2.createRadialGradient(road.x, road.y, 0, road.x, road.y, r * 7);
        beam.addColorStop(0, "rgba(255,245,210," + (a * 0.22).toFixed(2) + ")");
        beam.addColorStop(1, "rgba(255,245,210,0)");
        ctx2.fillStyle = beam;
        ctx2.beginPath(); ctx2.arc(road.x, road.y, r * 7, 0, Math.PI * 2); ctx2.fill();
      } else {
        // taillight bar
        var tl1 = projectCity(laneX - 1.3, 2.2, frontZ, camX, horizon, f, tilt);
        var tl2 = projectCity(laneX + 1.3, 2.2, frontZ, camX, horizon, f, tilt);
        ctx2.strokeStyle = "rgba(255,52,58," + a.toFixed(2) + ")";
        ctx2.lineWidth = Math.max(1.2, tl1.s * 0.5);
        ctx2.beginPath(); ctx2.moveTo(tl1.x, tl1.y); ctx2.lineTo(tl2.x, tl2.y); ctx2.stroke();
        var gl2 = ctx2.createRadialGradient((tl1.x + tl2.x) / 2, tl1.y, 0, (tl1.x + tl2.x) / 2, tl1.y, r * 4);
        gl2.addColorStop(0, "rgba(255,60,64," + (a * 0.25).toFixed(2) + ")");
        gl2.addColorStop(1, "rgba(255,60,64,0)");
        ctx2.fillStyle = gl2;
        ctx2.beginPath(); ctx2.arc((tl1.x + tl2.x) / 2, tl1.y, r * 4, 0, Math.PI * 2); ctx2.fill();
      }
    }

    function shadeArr(rgb, mul) {
      return [Math.min(255, (rgb[0] * mul) | 0), Math.min(255, (rgb[1] * mul) | 0), Math.min(255, (rgb[2] * mul) | 0)];
    }

    // elevated subway viaduct (Manhattan Bridge / 6th Ave el style)
    var EL_DECK = 24;
    function drawElTrack(z, camZ, camX, horizon, f, tilt) {
      var dz = z - camZ;
      if (dz <= 6 || dz > FAR) return;
      var a = edgeAlpha(dz);
      if (a <= 0.03) return;
      var span = 185, depth = 11;
      var girderTop = EL_DECK, girderBot = EL_DECK - 4;
      var steel = function (al) { return "rgba(112,192,225," + al.toFixed(2) + ")"; };

      // steel support bents with cross bracing
      for (var bx = -160; bx <= 160; bx += 46) {
        var midZ = dz + depth * 0.5;
        var lB = projectCity(bx - 4, 0, midZ, camX, horizon, f, tilt);
        var lT = projectCity(bx - 2, girderBot, midZ, camX, horizon, f, tilt);
        var rB = projectCity(bx + 4, 0, midZ, camX, horizon, f, tilt);
        var rT = projectCity(bx + 2, girderBot, midZ, camX, horizon, f, tilt);
        ctx2.strokeStyle = steel(a * 0.85);
        ctx2.lineWidth = Math.max(1, lB.s * 1.6);
        ctx2.beginPath(); ctx2.moveTo(lB.x, lB.y); ctx2.lineTo(lT.x, lT.y); ctx2.stroke();
        ctx2.beginPath(); ctx2.moveTo(rB.x, rB.y); ctx2.lineTo(rT.x, rT.y); ctx2.stroke();
        ctx2.lineWidth = 1;
        ctx2.strokeStyle = steel(a * 0.45);
        ctx2.beginPath(); ctx2.moveTo(lB.x, lB.y); ctx2.lineTo(rT.x, rT.y); ctx2.stroke();
        ctx2.beginPath(); ctx2.moveTo(rB.x, rB.y); ctx2.lineTo(lT.x, lT.y); ctx2.stroke();
      }

      // plate girder face
      var g1 = projectCity(-span, girderBot, dz, camX, horizon, f, tilt);
      var g2 = projectCity(span, girderBot, dz, camX, horizon, f, tilt);
      var g3 = projectCity(span, girderTop, dz, camX, horizon, f, tilt);
      var g4 = projectCity(-span, girderTop, dz, camX, horizon, f, tilt);
      fillQuad(g1, g2, g3, g4, "rgba(7,20,34," + (0.72 + a * 0.28).toFixed(2) + ")");
      ctx2.strokeStyle = steel(a * 0.9);
      ctx2.lineWidth = 1.3;
      ctx2.beginPath(); ctx2.moveTo(g4.x, g4.y); ctx2.lineTo(g3.x, g3.y); ctx2.stroke();
      ctx2.strokeStyle = steel(a * 0.55);
      ctx2.beginPath(); ctx2.moveTo(g1.x, g1.y); ctx2.lineTo(g2.x, g2.y); ctx2.stroke();
      // rivet stiffeners along the girder
      ctx2.strokeStyle = steel(a * 0.35);
      for (var rx = -span + 12; rx < span; rx += 24) {
        var s1 = projectCity(rx, girderBot, dz, camX, horizon, f, tilt);
        var s2 = projectCity(rx, girderTop, dz, camX, horizon, f, tilt);
        ctx2.beginPath(); ctx2.moveTo(s1.x, s1.y); ctx2.lineTo(s2.x, s2.y); ctx2.stroke();
      }

      // deck top face
      var t1 = projectCity(-span, girderTop, dz, camX, horizon, f, tilt);
      var t2 = projectCity(span, girderTop, dz, camX, horizon, f, tilt);
      var t3 = projectCity(span, girderTop, dz + depth, camX, horizon, f, tilt);
      var t4 = projectCity(-span, girderTop, dz + depth, camX, horizon, f, tilt);
      fillQuad(t1, t2, t3, t4, "rgba(10,26,42," + (0.5 + a * 0.3).toFixed(2) + ")");

      // two running rails per track (two tracks)
      [0.28, 0.72].forEach(function (tz) {
        [-1.4, 1.4].forEach(function (off) {
          var rz = dz + depth * tz + off;
          var ra = projectCity(-span, girderTop, rz, camX, horizon, f, tilt);
          var rb = projectCity(span, girderTop, rz, camX, horizon, f, tilt);
          ctx2.strokeStyle = "rgba(170,230,255," + (a * 0.6).toFixed(2) + ")";
          ctx2.lineWidth = 1;
          ctx2.beginPath(); ctx2.moveTo(ra.x, ra.y); ctx2.lineTo(rb.x, rb.y); ctx2.stroke();
        });
      });
      // ties across the deck
      ctx2.strokeStyle = steel(a * 0.25);
      for (var tx = -span + 6; tx < span; tx += 13) {
        var ta = projectCity(tx, girderTop, dz + 1, camX, horizon, f, tilt);
        var tb = projectCity(tx, girderTop, dz + depth - 1, camX, horizon, f, tilt);
        ctx2.beginPath(); ctx2.moveTo(ta.x, ta.y); ctx2.lineTo(tb.x, tb.y); ctx2.stroke();
      }
      // safety railing
      ctx2.strokeStyle = steel(a * 0.5);
      var hr1 = projectCity(-span, girderTop + 2.4, dz, camX, horizon, f, tilt);
      var hr2 = projectCity(span, girderTop + 2.4, dz, camX, horizon, f, tilt);
      ctx2.beginPath(); ctx2.moveTo(hr1.x, hr1.y); ctx2.lineTo(hr2.x, hr2.y); ctx2.stroke();
      for (var px = -span + 8; px < span; px += 16) {
        var pb = projectCity(px, girderTop, dz, camX, horizon, f, tilt);
        var pt = projectCity(px, girderTop + 2.4, dz, camX, horizon, f, tilt);
        ctx2.beginPath(); ctx2.moveTo(pb.x, pb.y); ctx2.lineTo(pt.x, pt.y); ctx2.stroke();
      }
    }

    // a subway train crossing at deck height; headX is the nose position
    function drawTrain(z, deckY, headX, dir, camZ, camX, horizon, f, tilt, routeRgb) {
      var dz = z - camZ;
      if (dz <= 6 || dz > FAR) return;
      var a = edgeAlpha(dz);
      if (a < 0.04) return;
      var cars = 6, carLen = 24, gap = 2;
      var zf = dz + 2, zb = dz + 8.5;

      for (var c = 0; c < cars; c++) {
        var nose = headX - dir * c * (carLen + gap);
        var xa = dir > 0 ? nose - carLen : nose;
        var xb = xa + carLen;
        if (xb < -220 || xa > 220) continue;

        // stainless body with darker undercarriage
        vehicleBox(xa, xb, deckY + 0.4, deckY + 7.2, zf, zb, camX, horizon, f, tilt, [168, 180, 190], a);
        vehicleBox(xa + 0.2, xb - 0.2, deckY, deckY + 0.5, zf, zb, camX, horizon, f, tilt, [90, 98, 108], a * 0.95);
        // corrugated stainless ribs along the lower flank
        ctx2.strokeStyle = "rgba(120,132,142," + (a * 0.55).toFixed(2) + ")";
        ctx2.lineWidth = 1;
        for (var rb = 0; rb < 3; rb++) {
          var ry = deckY + 0.8 + rb * 0.7;
          var rp1 = projectCity(xa + 0.3, ry, zf, camX, horizon, f, tilt);
          var rp2 = projectCity(xb - 0.3, ry, zf, camX, horizon, f, tilt);
          ctx2.beginPath(); ctx2.moveTo(rp1.x, rp1.y); ctx2.lineTo(rp2.x, rp2.y); ctx2.stroke();
        }
        // windows and door pairs alternate down the car
        for (var seg = 0; seg < 4; seg++) {
          var segX = xa + 2 + seg * 5.2;
          if (segX + 3.6 > xb - 1) break;
          if (seg % 2 === 0) {
            // window band
            ctx2.fillStyle = "rgba(255,238,180," + (a * 0.9).toFixed(2) + ")";
            var wp = projectCity(segX + 1.2, deckY + 3.8, zf, camX, horizon, f, tilt);
            var ww = Math.max(0.9, wp.s * 2.6);
            ctx2.fillRect(wp.x - ww / 2, wp.y - ww * 0.5, ww, ww);
          } else {
            // dark door pair with lit door windows
            var d1 = projectCity(segX, deckY + 0.6, zf, camX, horizon, f, tilt);
            var d2 = projectCity(segX + 3.4, deckY + 0.6, zf, camX, horizon, f, tilt);
            var d3 = projectCity(segX + 3.4, deckY + 5.6, zf, camX, horizon, f, tilt);
            var d4 = projectCity(segX, deckY + 5.6, zf, camX, horizon, f, tilt);
            fillQuad(d1, d2, d3, d4, "rgba(96,106,116," + (a * 0.95).toFixed(2) + ")");
            var dm = projectCity(segX + 1.7, deckY + 0.6, zf, camX, horizon, f, tilt);
            var dm2 = projectCity(segX + 1.7, deckY + 5.6, zf, camX, horizon, f, tilt);
            ctx2.strokeStyle = "rgba(50,58,66," + (a * 0.9).toFixed(2) + ")";
            ctx2.beginPath(); ctx2.moveTo(dm.x, dm.y); ctx2.lineTo(dm2.x, dm2.y); ctx2.stroke();
            ctx2.fillStyle = "rgba(255,238,180," + (a * 0.7).toFixed(2) + ")";
            var dw = Math.max(0.7, dm.s * 1);
            ctx2.fillRect(dm.x - dw * 1.6, dm2.y + dw, dw, dw * 1.4);
            ctx2.fillRect(dm.x + dw * 0.6, dm2.y + dw, dw, dw * 1.4);
          }
        }
        // black roofline strip
        var rl1 = projectCity(xa, deckY + 7.5, zf, camX, horizon, f, tilt);
        var rl2 = projectCity(xb, deckY + 7.5, zf, camX, horizon, f, tilt);
        ctx2.strokeStyle = "rgba(30,34,40," + (a * 0.8).toFixed(2) + ")";
        ctx2.lineWidth = Math.max(1, rl1.s * 0.7);
        ctx2.beginPath(); ctx2.moveTo(rl1.x, rl1.y); ctx2.lineTo(rl2.x, rl2.y); ctx2.stroke();

        // lead car: headlight + glowing route bullet like a real MTA car
        if (c === 0) {
          var noseX = dir > 0 ? xb : xa;
          var hp = projectCity(noseX, deckY + 2.4, (zf + zb) / 2, camX, horizon, f, tilt);
          var hr = Math.min(Math.max(1, hp.s * 1.8), 3.4);
          ctx2.fillStyle = "rgba(255,252,235," + a.toFixed(2) + ")";
          ctx2.beginPath(); ctx2.arc(hp.x, hp.y, hr, 0, Math.PI * 2); ctx2.fill();
          var hg = ctx2.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, hr * 6);
          hg.addColorStop(0, "rgba(255,250,220," + (a * 0.4).toFixed(2) + ")");
          hg.addColorStop(1, "rgba(255,250,220,0)");
          ctx2.fillStyle = hg;
          ctx2.beginPath(); ctx2.arc(hp.x, hp.y, hr * 6, 0, Math.PI * 2); ctx2.fill();
          var bp = projectCity(noseX - dir * 2, deckY + 6, (zf + zb) / 2, camX, horizon, f, tilt);
          var br = Math.min(Math.max(1, bp.s * 1.3), 3);
          ctx2.fillStyle = shadeRgb(routeRgb, 1, a);
          ctx2.beginPath(); ctx2.arc(bp.x, bp.y, br, 0, Math.PI * 2); ctx2.fill();
        }
      }
    }

    // trains come by every so often — each crossing has its own clock
    function trainCrossing(time, seed, period, crossFrac) {
      var ph = ((time + seed) % period) / period;
      if (ph > crossFrac) return null;
      var t = ph / crossFrac;
      var dir = (Math.floor((time + seed) / period) % 2) === 0 ? 1 : -1;
      return { x: lerp(-320, 320, t) * dir, dir: dir };
    }

    function hash01(n) {
      var s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return s - Math.floor(s);
    }

    // distant skyline silhouette behind the grid — slow parallax
    // towers with lit windows and blinking rooftop beacons
    function drawSkyline(time, camX, horizon, par, hMax, fillCol, winA) {
      var w = 30 + par * 30;
      var drift = camX * 16 * par + time * 0.0045 * par;
      var n = Math.ceil(CW / w) + 2;
      var base = Math.floor(drift / w);
      for (var ti = 0; ti <= n; ti++) {
        var idx = base + ti;
        var r1 = hash01(idx * 3.7 + par * 91);
        var r2 = hash01(idx * 7.1 + par * 17);
        var r3 = hash01(idx * 5.3 + par * 53);
        var tw = w * (0.55 + r2 * 0.4);
        var th = hMax * (0.3 + r1 * 0.7);
        var tx = ti * w - (drift - base * w);
        ctx2.fillStyle = fillCol;
        ctx2.fillRect(tx, horizon - th, tw, th + 2);
        // setbacks on the taller silhouettes
        if (r1 > 0.62) {
          ctx2.fillRect(tx + tw * 0.28, horizon - th - hMax * 0.16, tw * 0.44, hMax * 0.16 + 2);
        }
        if (r3 > 0.8) {
          // spire + blinking aircraft beacon
          ctx2.strokeStyle = fillCol;
          ctx2.lineWidth = 1.4;
          ctx2.beginPath();
          ctx2.moveTo(tx + tw / 2, horizon - th - (r1 > 0.62 ? hMax * 0.16 : 0));
          ctx2.lineTo(tx + tw / 2, horizon - th - (r1 > 0.62 ? hMax * 0.16 : 0) - 12 * par);
          ctx2.stroke();
          var blink = 0.3 + 0.7 * Math.max(0, Math.sin(time * 0.0016 + idx * 2.4));
          ctx2.fillStyle = "rgba(255,70,70," + (blink * par).toFixed(2) + ")";
          ctx2.beginPath();
          ctx2.arc(tx + tw / 2, horizon - th - (r1 > 0.62 ? hMax * 0.16 : 0) - 12 * par, 1.6, 0, Math.PI * 2);
          ctx2.fill();
        }
        // sparse lit windows
        if (winA > 0) {
          for (var wj = 0; wj < 7; wj++) {
            var wr1 = hash01(idx * 13 + wj * 7.7);
            var wr2 = hash01(idx * 17 + wj * 3.3);
            if (wr1 > 0.55) continue;
            ctx2.fillStyle = wr2 < 0.4
              ? "rgba(255,214,150," + winA.toFixed(2) + ")"
              : "rgba(140,220,255," + winA.toFixed(2) + ")";
            ctx2.fillRect(tx + 2 + wr1 * (tw - 5), horizon - th + 3 + wr2 * (th - 8), 1.6, 2.2);
          }
        }
      }
    }

    // an MTA bus: long white body, blue flank stripe, lit windows
    function drawBus(laneX, dz, toward, camX, horizon, f, tilt) {
      if (dz <= 4 || dz > FAR) return;
      var a = edgeAlpha(dz);
      if (a < 0.04) return;
      var len = 13;
      vehicleBox(laneX - 1.8, laneX + 1.8, 0.5, 4.8, dz, dz + len, camX, horizon, f, tilt, [222, 230, 238], a);
      // blue skirt stripe + a row of lit windows down the visible flank
      var sideX = camX < laneX ? laneX - 1.8 : laneX + 1.8;
      var st1 = projectCity(sideX, 1.2, dz + 0.4, camX, horizon, f, tilt);
      var st2 = projectCity(sideX, 1.2, dz + len - 0.4, camX, horizon, f, tilt);
      var st3 = projectCity(sideX, 2, dz + len - 0.4, camX, horizon, f, tilt);
      var st4 = projectCity(sideX, 2, dz + 0.4, camX, horizon, f, tilt);
      fillQuad(st1, st2, st3, st4, "rgba(30,80,180," + (a * 0.9).toFixed(2) + ")");
      ctx2.fillStyle = "rgba(255,238,190," + (a * 0.85).toFixed(2) + ")";
      for (var wz = dz + 1.6; wz < dz + len - 1.2; wz += 2.1) {
        var wp = projectCity(sideX, 3.6, wz, camX, horizon, f, tilt);
        var ws = Math.max(0.8, wp.s * 1.5);
        ctx2.fillRect(wp.x - ws / 2, wp.y - ws * 0.6, ws, ws * 1.2);
      }
      var l1 = projectCity(laneX - 1.2, 1.6, dz, camX, horizon, f, tilt);
      var l2 = projectCity(laneX + 1.2, 1.6, dz, camX, horizon, f, tilt);
      var r = Math.min(Math.max(0.8, l1.s * 1.4), 2.8);
      ctx2.fillStyle = toward
        ? "rgba(255,250,225," + a.toFixed(2) + ")"
        : "rgba(255,58,58," + a.toFixed(2) + ")";
      ctx2.beginPath();
      ctx2.arc(l1.x, l1.y, r, 0, Math.PI * 2);
      ctx2.arc(l2.x, l2.y, r, 0, Math.PI * 2);
      ctx2.fill();
    }

    // classic subway stair entrance: railed stairwell descending
    // into the sidewalk, green globe lamp, MTA-green signboard
    function drawSubwayEntrance(sx, z, camZ, camX, horizon, f, tilt, label) {
      var dz = z - camZ;
      if (dz <= 6 || dz > 260) return;
      var a = edgeAlpha(dz);
      if (a < 0.06) return;
      var w = 5.5, d = 9;
      var x0 = sx - w / 2, x1 = sx + w / 2;

      // dark stair opening in the sidewalk
      var o1 = projectCity(x0, 0.1, dz, camX, horizon, f, tilt);
      var o2 = projectCity(x1, 0.1, dz, camX, horizon, f, tilt);
      var o3 = projectCity(x1, 0.1, dz + d, camX, horizon, f, tilt);
      var o4 = projectCity(x0, 0.1, dz + d, camX, horizon, f, tilt);
      fillQuad(o1, o2, o3, o4, "rgba(2,6,12," + (0.75 + a * 0.2).toFixed(2) + ")");
      // warm light rising from underground
      var ug = ctx2.createLinearGradient(0, o3.y, 0, o1.y);
      ug.addColorStop(0, "rgba(255,214,130," + (a * 0.35).toFixed(2) + ")");
      ug.addColorStop(1, "rgba(255,214,130,0)");
      ctx2.fillStyle = ug;
      ctx2.beginPath();
      ctx2.moveTo(o1.x, o1.y); ctx2.lineTo(o2.x, o2.y);
      ctx2.lineTo(o3.x, o3.y); ctx2.lineTo(o4.x, o4.y);
      ctx2.closePath(); ctx2.fill();

      // railings down both sides
      ctx2.strokeStyle = "rgba(120,190,170," + (a * 0.8).toFixed(2) + ")";
      ctx2.lineWidth = Math.max(1, o1.s * 0.6);
      [x0, x1].forEach(function (rx) {
        var r1 = projectCity(rx, 2.6, dz, camX, horizon, f, tilt);
        var r2 = projectCity(rx, 2.6, dz + d, camX, horizon, f, tilt);
        ctx2.beginPath(); ctx2.moveTo(r1.x, r1.y); ctx2.lineTo(r2.x, r2.y); ctx2.stroke();
        for (var pz = 0; pz <= d; pz += 2.2) {
          var pb = projectCity(rx, 0.1, dz + pz, camX, horizon, f, tilt);
          var pt = projectCity(rx, 2.6, dz + pz, camX, horizon, f, tilt);
          ctx2.beginPath(); ctx2.moveTo(pb.x, pb.y); ctx2.lineTo(pt.x, pt.y); ctx2.stroke();
        }
      });

      // green globe lamp on a post at the street corner of the stair
      var gb = projectCity(x0 - 1, 0, dz, camX, horizon, f, tilt);
      var gt = projectCity(x0 - 1, 6.4, dz, camX, horizon, f, tilt);
      ctx2.strokeStyle = "rgba(140,180,160," + (a * 0.7).toFixed(2) + ")";
      ctx2.beginPath(); ctx2.moveTo(gb.x, gb.y); ctx2.lineTo(gt.x, gt.y); ctx2.stroke();
      var gr = Math.min(Math.max(1.2, gt.s * 1.5), 4);
      var glow = ctx2.createRadialGradient(gt.x, gt.y, 0, gt.x, gt.y, gr * 4);
      glow.addColorStop(0, "rgba(60,255,140," + (a * 0.5).toFixed(2) + ")");
      glow.addColorStop(1, "rgba(60,255,140,0)");
      ctx2.fillStyle = glow;
      ctx2.beginPath(); ctx2.arc(gt.x, gt.y, gr * 4, 0, Math.PI * 2); ctx2.fill();
      ctx2.fillStyle = "rgba(80,230,130," + Math.min(1, a * 1.1).toFixed(2) + ")";
      ctx2.beginPath(); ctx2.arc(gt.x, gt.y, gr, 0, Math.PI * 2); ctx2.fill();

      // MTA-green signboard over the stair mouth
      var s1 = projectCity(x0, 6.6, dz + 0.5, camX, horizon, f, tilt);
      var s2 = projectCity(x1, 6.6, dz + 0.5, camX, horizon, f, tilt);
      var s3 = projectCity(x1, 8.6, dz + 0.5, camX, horizon, f, tilt);
      var s4 = projectCity(x0, 8.6, dz + 0.5, camX, horizon, f, tilt);
      fillQuad(s1, s2, s3, s4, "rgba(6,60,36," + (0.5 + a * 0.45).toFixed(2) + ")");
      var sh = Math.abs(s1.y - s4.y);
      if (sh > 4.5 && s2.x - s1.x > 18) {
        ctx2.font = "700 " + (sh * 0.6).toFixed(1) + "px 'Arial Narrow', Arial, sans-serif";
        ctx2.textAlign = "center";
        ctx2.textBaseline = "middle";
        ctx2.fillStyle = "rgba(235,255,242," + Math.min(1, a * 1.1).toFixed(2) + ")";
        ctx2.fillText(label || "SUBWAY", (s1.x + s2.x) / 2, (s1.y + s4.y) / 2, (s2.x - s1.x) * 0.9);
      }
    }

    // hot dog cart with a striped umbrella and drifting steam
    function drawHotDogCart(sx, z, camZ, camX, horizon, f, tilt, time, seed) {
      var dz = z - camZ;
      if (dz <= 6 || dz > 210) return;
      var a = edgeAlpha(dz);
      if (a < 0.06) return;

      // cart body: stainless box with a dark base
      vehicleBox(sx - 2, sx + 2, 0.4, 3.2, dz, dz + 2.6, camX, horizon, f, tilt, [200, 208, 216], a);
      // yellow menu panel on the flank
      var sideX = camX < sx ? sx - 2 : sx + 2;
      var p1 = projectCity(sideX, 1.2, dz + 0.3, camX, horizon, f, tilt);
      var p2 = projectCity(sideX, 1.2, dz + 2.3, camX, horizon, f, tilt);
      var p3 = projectCity(sideX, 2.6, dz + 2.3, camX, horizon, f, tilt);
      var p4 = projectCity(sideX, 2.6, dz + 0.3, camX, horizon, f, tilt);
      fillQuad(p1, p2, p3, p4, "rgba(255,205,60," + (a * 0.85).toFixed(2) + ")");

      // umbrella: pole + canopy
      var ub = projectCity(sx, 3.2, dz + 1.3, camX, horizon, f, tilt);
      var ut = projectCity(sx, 7.2, dz + 1.3, camX, horizon, f, tilt);
      ctx2.strokeStyle = "rgba(180,200,215," + (a * 0.7).toFixed(2) + ")";
      ctx2.lineWidth = Math.max(0.8, ub.s * 0.4);
      ctx2.beginPath(); ctx2.moveTo(ub.x, ub.y); ctx2.lineTo(ut.x, ut.y); ctx2.stroke();
      var uw = 3.6;
      var c1 = projectCity(sx - uw, 5.6, dz + 1.3, camX, horizon, f, tilt);
      var c2 = projectCity(sx + uw, 5.6, dz + 1.3, camX, horizon, f, tilt);
      // two-tone canopy (yellow / blue like the Sabrett carts)
      ctx2.beginPath();
      ctx2.moveTo(c1.x, c1.y); ctx2.lineTo(ut.x, ut.y); ctx2.lineTo((ut.x + c2.x) / 2, (ut.y + c2.y) / 2);
      ctx2.closePath();
      ctx2.fillStyle = "rgba(255,205,60," + (a * 0.9).toFixed(2) + ")";
      ctx2.fill();
      ctx2.beginPath();
      ctx2.moveTo((ut.x + c1.x) / 2, (ut.y + c1.y) / 2); ctx2.lineTo(ut.x, ut.y); ctx2.lineTo(c2.x, c2.y);
      ctx2.closePath();
      ctx2.fillStyle = "rgba(40,90,190," + (a * 0.9).toFixed(2) + ")";
      ctx2.fill();

      // steam drifting off the grill
      for (var st = 0; st < 3; st++) {
        var ph = ((time * 0.00035 + seed + st * 0.33) % 1);
        var sy = 3.4 + ph * 3.4;
        var sp = projectCity(sx + Math.sin(ph * 9 + st) * 0.7, sy, dz + 0.6, camX, horizon, f, tilt);
        var sr = Math.max(1, sp.s * (0.8 + ph * 1.6));
        ctx2.fillStyle = "rgba(220,228,238," + (a * 0.2 * (1 - ph)).toFixed(2) + ")";
        ctx2.beginPath(); ctx2.arc(sp.x, sp.y, sr, 0, Math.PI * 2); ctx2.fill();
      }
    }

    // steam curling out of a manhole in the middle of the street
    function drawManholeSteam(z, camZ, camX, horizon, f, tilt, time, seed) {
      var dz = z - camZ;
      if (dz <= 8 || dz > 240) return;
      var a = edgeAlpha(dz);
      if (a < 0.06) return;
      var mx = (hash01(seed * 7.7) - 0.5) * 16;
      for (var pu = 0; pu < 4; pu++) {
        var ph = ((time * 0.00028 + seed * 0.13 + pu * 0.25) % 1);
        var py = ph * 8.5;
        var drift = Math.sin(ph * 7 + pu * 2 + seed) * (0.6 + ph * 1.8);
        var sp = projectCity(mx + drift, py, dz + pu * 0.8, camX, horizon, f, tilt);
        var sr = Math.max(1.5, sp.s * (1.4 + ph * 4.2));
        var sa = a * 0.16 * (1 - ph) * (0.5 + 0.5 * Math.sin(seed * 20 + pu));
        if (sa <= 0.01) continue;
        var sg = ctx2.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sr);
        sg.addColorStop(0, "rgba(210,222,235," + sa.toFixed(2) + ")");
        sg.addColorStop(1, "rgba(210,222,235,0)");
        ctx2.fillStyle = sg;
        ctx2.beginPath(); ctx2.arc(sp.x, sp.y, sr, 0, Math.PI * 2); ctx2.fill();
      }
    }

    function drawCityFrame(time) {
      cityTime = time;
      ctx2.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx2.clearRect(0, 0, CW, CH);

      // one continuous cruise down the avenue: every camera input is
      // a smooth function of time and the lateral drift stays well
      // inside the building line (±18), so we never clip into walls
      // or hard-cut between vantage points
      var horizon = CH * (0.42 + Math.sin(time * 0.00007) * 0.02);
      var f = CH * (0.92 + Math.sin(time * 0.00005) * 0.06);
      var camZ = time * SPEED;
      var camX = Math.sin(time * 0.00021) * 8;
      var tilt = Math.sin(time * 0.00013) * 0.045;

      // distant skyline silhouettes (two parallax layers) sit on the
      // horizon so the grid reads as one avenue inside a bigger city
      drawSkyline(time, camX, horizon, 0.35, CH * 0.1, "rgba(13,32,54,0.55)", 0);
      drawSkyline(time, camX, horizon, 0.7, CH * 0.17, "rgba(8,22,40,0.85)", 0.16);

      // atmospheric haze layer
      var haze = ctx2.createLinearGradient(0, horizon - CH * 0.15, 0, CH);
      haze.addColorStop(0, "rgba(79,216,255,0)");
      haze.addColorStop(0.35, "rgba(79,216,255,0.08)");
      haze.addColorStop(1, "rgba(3,10,18,0.55)");
      ctx2.fillStyle = haze;
      ctx2.fillRect(0, horizon - CH * 0.15, CW, CH - horizon + CH * 0.15);

      // horizon glow
      var hg = ctx2.createLinearGradient(0, horizon - CH * 0.09, 0, horizon + CH * 0.06);
      hg.addColorStop(0, "rgba(79,216,255,0)");
      hg.addColorStop(0.6, "rgba(79,216,255,0.14)");
      hg.addColorStop(1, "rgba(79,216,255,0)");
      ctx2.fillStyle = hg;
      ctx2.fillRect(0, horizon - CH * 0.09, CW, CH * 0.15);

      var firstRow = Math.floor(camZ / ROW) + 1;
      var lastRow = Math.floor((camZ + FAR) / ROW);

      // ground grid: cross lines at each row + avenue edges + lane dashes
      for (var gi = lastRow; gi >= firstRow; gi--) {
        var gz = gi * ROW - camZ;
        if (gz <= 4) continue;
        var ga = edgeAlpha(gz) * 0.32;
        var gl = projectCity(-170, 0, gz, camX, horizon, f, tilt);
        var gr = projectCity(170, 0, gz, camX, horizon, f, tilt);
        ctx2.beginPath();
        ctx2.moveTo(gl.x, gl.y); ctx2.lineTo(gr.x, gr.y);
        ctx2.strokeStyle = "rgba(79,216,255," + ga.toFixed(2) + ")";
        ctx2.lineWidth = 1;
        ctx2.stroke();
      }
      // avenue edges
      [-14, 14].forEach(function (ax) {
        var n = projectCity(ax, 0, 6, camX, horizon, f, tilt);
        var fp = projectCity(ax, 0, FAR, camX, horizon, f, tilt);
        ctx2.beginPath();
        ctx2.moveTo(n.x, n.y); ctx2.lineTo(fp.x, fp.y);
        ctx2.strokeStyle = "rgba(79,216,255,0.5)";
        ctx2.lineWidth = 1.4;
        ctx2.stroke();
      });
      // center lane dashes scroll toward the camera
      for (var dz = 8 - ((camZ) % 16); dz < FAR; dz += 16) {
        if (dz <= 4) continue;
        var da = edgeAlpha(dz) * 0.6;
        var d1 = projectCity(0, 0, dz, camX, horizon, f, tilt);
        var d2 = projectCity(0, 0, dz + 6, camX, horizon, f, tilt);
        ctx2.beginPath();
        ctx2.moveTo(d1.x, d1.y); ctx2.lineTo(d2.x, d2.y);
        ctx2.strokeStyle = "rgba(255,210,79," + da.toFixed(2) + ")";
        ctx2.lineWidth = 2;
        ctx2.stroke();
      }

      // buildings far -> near
      for (var i = lastRow; i >= firstRow; i--) {
        var rnd = rowRand(i);
        var z0 = i * ROW;

        if (i % 28 === 10) {
          drawBridge(z0, camZ, camX, horizon, f, tilt);
          // subway crossing the bridge deck (Manhattan Bridge style)
          var brTrain = trainCrossing(time, i * 1723, 18000, 0.5);
          if (brTrain) {
            drawTrain(z0, 22.5, brTrain.x, brTrain.dir, camZ, camX, horizon, f, tilt, [0, 147, 60]); // N/Q/4/5 green
          }
          continue;
        }
        if (i % 28 === 22) {
          // Manhattan el crossing the avenue
          drawElTrack(z0, camZ, camX, horizon, f, tilt);
          var elTrain = trainCrossing(time, i * 1013, 15000, 0.44);
          if (elTrain) {
            drawTrain(z0, EL_DECK, elTrain.x, elTrain.dir, camZ, camX, horizon, f, tilt, [0, 147, 60]); // N/Q/R/W green
          }
          continue;
        }
        if (i % 7 === 3) {
          // occasionally a train rumbles through the open cut at street level
          if (i % 14 === 10) {
            var cutTrain = trainCrossing(time, i * 577, 21000, 0.4);
            if (cutTrain) {
              drawTrain(i * ROW, 0.5, cutTrain.x, cutTrain.dir, camZ, camX, horizon, f, tilt, [238, 53, 46]); // 1/2/3 line red
            }
          }
          continue; // cross street gap
        }

        // left + right lots
        for (var sdx = 0; sdx < 2; sdx++) {
          var sign = sdx === 0 ? -1 : 1;
          var lots = 1 + Math.floor(rnd() * 2);
          var xEdge = 18 + rnd() * 8;
          for (var L = 0; L < lots; L++) {
            var wdt = 16 + rnd() * 26;
            var x0 = sign * (xEdge + (sign > 0 ? 0 : wdt));
            var x1 = x0 + sign * wdt * (sign > 0 ? 1 : -1);
            var lo = Math.min(x0, x1), hi = Math.max(x0, x1);

            var h = 22 + rnd() * 85;
            var hue = "79,216,255";
            if (i % 16 === 5 && L === 0) { h = 175 + rnd() * 70; }           // supertall
            else if (i % 16 === 13 && L === 0) {                              // stepped landmark
              var bw = hi - lo;
              drawBox(lo, hi, z0, z0 + ROW * 0.8, 60, camZ, camX, horizon, f, hue, tilt);
              drawBox(lo + bw * 0.15, hi - bw * 0.15, z0 + ROW * 0.1, z0 + ROW * 0.7, 110, camZ, camX, horizon, f, hue, tilt);
              drawBox(lo + bw * 0.3, hi - bw * 0.3, z0 + ROW * 0.2, z0 + ROW * 0.6, 158, camZ, camX, horizon, f, "255,79,216", tilt);
              xEdge += wdt + 6 + rnd() * 10;
              continue;
            }
            // vary the neon edge colors so the avenue reads colorful,
            // not one monochrome hologram
            var hv = rnd();
            if (hv > 0.9) hue = "255,79,216";
            else if (hv > 0.8) hue = "255,170,90";
            else if (hv > 0.7) hue = "150,120,255";
            drawBox(lo, hi, z0, z0 + ROW * 0.82, h, camZ, camX, horizon, f, hue, tilt, rnd());
            xEdge += wdt + 6 + rnd() * 10;
          }
        }
      }

      // street furniture: lamps along the sidewalks + traffic signals
      // at the cross streets, far -> near
      for (var li = lastRow; li >= firstRow; li--) {
        var lz = li * ROW - camZ + ROW * 0.5;
        if (lz <= 6 || lz > 330) continue;
        var la = edgeAlpha(lz);
        if (la < 0.05) continue;

        if (li % 2 === 0 && li % 7 !== 3) {
          [-15.4, 15.4].forEach(function (lampX) {
            var armX = lampX - (lampX > 0 ? 2.2 : -2.2);
            var pb = projectCity(lampX, 0, lz, camX, horizon, f, tilt);
            var pt = projectCity(lampX, 9.5, lz, camX, horizon, f, tilt);
            var ph = projectCity(armX, 9, lz, camX, horizon, f, tilt);
            ctx2.strokeStyle = "rgba(120,180,210," + (la * 0.55).toFixed(2) + ")";
            ctx2.lineWidth = Math.max(0.8, pb.s * 0.5);
            ctx2.beginPath(); ctx2.moveTo(pb.x, pb.y); ctx2.lineTo(pt.x, pt.y); ctx2.stroke();
            ctx2.beginPath(); ctx2.moveTo(pt.x, pt.y); ctx2.lineTo(ph.x, ph.y); ctx2.stroke();
            // sodium lamp head + light pool on the sidewalk
            var lr = Math.min(Math.max(1, ph.s * 1.1), 3.2);
            ctx2.fillStyle = "rgba(255,214,140," + (la * 0.95).toFixed(2) + ")";
            ctx2.beginPath(); ctx2.arc(ph.x, ph.y, lr, 0, Math.PI * 2); ctx2.fill();
            var ground = projectCity(armX, 0, lz, camX, horizon, f, tilt);
            var pool = ctx2.createRadialGradient(ground.x, ground.y, 0, ground.x, ground.y, lr * 7);
            pool.addColorStop(0, "rgba(255,214,140," + (la * 0.18).toFixed(2) + ")");
            pool.addColorStop(1, "rgba(255,214,140,0)");
            ctx2.fillStyle = pool;
            ctx2.beginPath(); ctx2.arc(ground.x, ground.y, lr * 7, 0, Math.PI * 2); ctx2.fill();
          });
        }

        // hot dog carts parked on the sidewalks, everywhere
        if (li % 11 === 5 || li % 11 === 8) {
          var cartSide = li % 22 < 11 ? -1 : 1;
          drawHotDogCart(cartSide * 16.4, li * ROW + ROW * 0.45, camZ, camX, horizon, f, tilt, time, li * 0.61);
        }

        // steam curling out of manholes mid-street
        if (li % 9 === 4) {
          drawManholeSteam(li * ROW, camZ, camX, horizon, f, tilt, time, li);
        }

        if (li % 7 === 3) {
          // subway stair entrances at every other cross street
          if (li % 14 === 3) {
            var lineLabel = MTA_LINES[(li / 14 | 0) % MTA_LINES.length];
            drawSubwayEntrance(-16.6, li * ROW + ROW * 0.3, camZ, camX, horizon, f, tilt, lineLabel);
          }
          // traffic signals guarding the cross street
          var phase = Math.floor(time / 2600 + li * 0.7) % 3;
          var sigCol = phase === 0 ? "0,225,110" : phase === 1 ? "255,205,60" : "255,64,64";
          [-16.2, 16.2].forEach(function (sx) {
            var sb = projectCity(sx, 0, lz, camX, horizon, f, tilt);
            var st = projectCity(sx, 7.5, lz, camX, horizon, f, tilt);
            ctx2.strokeStyle = "rgba(120,180,210," + (la * 0.5).toFixed(2) + ")";
            ctx2.lineWidth = Math.max(0.8, sb.s * 0.5);
            ctx2.beginPath(); ctx2.moveTo(sb.x, sb.y); ctx2.lineTo(st.x, st.y); ctx2.stroke();
            var sr = Math.min(Math.max(1, st.s * 1), 2.6);
            ctx2.fillStyle = "rgba(" + sigCol + "," + (la * 0.95).toFixed(2) + ")";
            ctx2.beginPath(); ctx2.arc(st.x, st.y, sr, 0, Math.PI * 2); ctx2.fill();
            var sg = ctx2.createRadialGradient(st.x, st.y, 0, st.x, st.y, sr * 4);
            sg.addColorStop(0, "rgba(" + sigCol + "," + (la * 0.3).toFixed(2) + ")");
            sg.addColorStop(1, "rgba(" + sigCol + ",0)");
            ctx2.fillStyle = sg;
            ctx2.beginPath(); ctx2.arc(st.x, st.y, sr * 4, 0, Math.PI * 2); ctx2.fill();
          });
        }
      }

      // pedestrians bustling along both sidewalks
      for (var pi = 0; pi < 30; pi++) {
        var pr1 = hash01(pi * 9.7 + 1);
        var pr2 = hash01(pi * 4.3 + 7);
        var pr3 = hash01(pi * 6.1 + 3);
        var side = pi % 2 === 0 ? -1 : 1;
        var pedX = side * (15.6 + pr1 * 3.2);
        var pdir = pr2 < 0.5 ? 1 : -1;
        var pz = ((pi * 41 + time * 0.008 * pdir - camZ) % 300);
        if (pz < 0) pz += 300;
        pz += 8;
        var pa = edgeAlpha(pz) * 0.85;
        if (pa < 0.05 || pz > 280) continue;
        var bob = Math.sin(time * 0.011 + pi * 2.6) * 0.16;
        var feet = projectCity(pedX, 0, pz, camX, horizon, f, tilt);
        var hip = projectCity(pedX, 1.5, pz, camX, horizon, f, tilt);
        var shoulder = projectCity(pedX, 2.7 + bob, pz, camX, horizon, f, tilt);
        var headP = projectCity(pedX, 3.15 + bob, pz, camX, horizon, f, tilt);
        var tone = pr3 < 0.33 ? "196,214,228" : pr3 < 0.66 ? "150,180,205" : "220,200,170";
        // legs scissor as they walk
        var stride = Math.sin(time * 0.011 + pi * 2.6) * 0.55;
        var lf = projectCity(pedX - stride, 0, pz, camX, horizon, f, tilt);
        var rf = projectCity(pedX + stride, 0, pz + 0.2, camX, horizon, f, tilt);
        ctx2.strokeStyle = "rgba(" + tone + "," + (pa * 0.8).toFixed(2) + ")";
        ctx2.lineWidth = Math.max(0.7, feet.s * 0.28);
        ctx2.beginPath(); ctx2.moveTo(hip.x, hip.y); ctx2.lineTo(lf.x, lf.y); ctx2.stroke();
        ctx2.beginPath(); ctx2.moveTo(hip.x, hip.y); ctx2.lineTo(rf.x, rf.y); ctx2.stroke();
        // torso
        ctx2.lineWidth = Math.max(1, feet.s * 0.6);
        ctx2.strokeStyle = "rgba(" + tone + "," + pa.toFixed(2) + ")";
        ctx2.beginPath(); ctx2.moveTo(hip.x, hip.y); ctx2.lineTo(shoulder.x, shoulder.y); ctx2.stroke();
        // head
        ctx2.fillStyle = "rgba(" + tone + "," + pa.toFixed(2) + ")";
        ctx2.beginPath(); ctx2.arc(headP.x, headP.y, Math.max(0.8, feet.s * 0.32), 0, Math.PI * 2); ctx2.fill();
      }

      // traffic on the avenue: oncoming lanes show headlights,
      // outgoing lanes show taillights; every few vehicles is an
      // MTA bus. Sorted far -> near
      var avenueCars = [];
      for (var k = 0; k < 18; k++) {
        var lane = [-9.5, -5, 5, 9.5][k % 4];
        var toward = lane < 0;
        var speed = toward ? -0.062 : 0.088;
        var zc = ((k * 47 + time * speed - camZ) % (FAR - 20));
        if (zc < 0) zc += FAR - 20;
        zc += 10;
        avenueCars.push({
          lane: lane, z: zc, toward: toward,
          bus: k % 6 === 2,
          // ~60% yellow cabs on a Manhattan avenue
          kind: k % 5 <= 2 ? (k % 3) : (3 + (k * 7 + 3) % (CAR_COLORS.length - 3)),
        });
      }
      avenueCars.sort(function (u, v) { return v.z - u.z; });
      for (var k2 = 0; k2 < avenueCars.length; k2++) {
        var car = avenueCars[k2];
        if (car.bus) drawBus(car.lane, car.z, car.toward, camX, horizon, f, tilt);
        else drawCar(car.lane, car.z, car.toward, car.kind, camX, horizon, f, tilt);
      }

      // cross-street cars at the gaps
      for (var gi2 = firstRow; gi2 <= lastRow; gi2++) {
        if (gi2 % 7 !== 3 || gi2 % 14 === 10) continue;
        var gz2 = gi2 * ROW - camZ;
        if (gz2 <= 8 || gz2 > 400) continue;
        var dir2 = gi2 % 2 === 0 ? 1 : -1;
        var xa = (((time * 0.045 + gi2 * 37) % 280) - 140) * dir2;
        var ca2 = edgeAlpha(gz2);
        if (ca2 < 0.05) continue;
        var col2 = CAR_COLORS[(gi2 * 5 + 1) % CAR_COLORS.length];
        // crossing car seen side-on: low slab + cabin
        var bx0 = Math.min(xa, xa + 7 * dir2);
        var bx1 = Math.max(xa, xa + 7 * dir2);
        vehicleBox(bx0, bx1, 0.5, 2.7, gz2, gz2 + 3.4, camX, horizon, f, tilt, col2, ca2);
        vehicleBox(bx0 + 1.6, bx1 - 1.6, 2.7, 4.1, gz2 + 0.5, gz2 + 2.9, camX, horizon, f, tilt, [46, 70, 96], ca2 * 0.95);
      }
    }

    function cityLoop(time) {
      if (prefersReduced) return;
      if (cityP > 0.28 && isInView(cityViewport)) {
        drawCityFrame(time || 0);
      }
    }
    runSceneAnimation(cityViewport, cityLoop, { rootMargin: "25% 0px" });
    if (prefersReduced) drawCityFrame(4000);
  }

  /* ============================================================
     K-POP HOLOGRAM STAGE (scene 03)
     Source: the "Kill This Love" MV chorus (1:13–1:15.2) — the
     continuous wide shot of the full-body choreography in the black
     chorus outfits, ending on the arms-up gun pose. 48 segmented
     frames packed into assets/kts-drones.png (8x6 tiles, 512x288)
     and played back directly as holographic footage — the dancers
     stay fully recognizable the whole way through.
     Timeline (concert --p):
       0.00–0.06  hologram materializes (scanline sweep)
       0.06–0.46  scroll scrubs the choreography like video
       0.46–0.54  gun pose locks + strobe (CSS)
       0.54–0.62  camera dives toward the raised gun; charge builds
       0.62–0.76  BANG — the background explodes like the MV:
                  white-blue flash, debris, dust, pose held in front
       0.76–1.00  the scene dissolves into the pink sparkle ocean
                  + project-card shards
     ============================================================ */

  var chorusFrame = document.querySelector(".chorus-frame");
  var stageCanvas = document.querySelector(".stage-canvas");

  var SHEET_URL = "assets/kts-drones.png?v=7";
  var SHEET_COLS = 8;
  var TILE_W = 512, TILE_H = 288;
  var FRAME_COUNT = 48;
  var POSE_FRAME = 34;               // arms-up finger-gun pose (all four, clean)
  var FLEET = isPhonePerformance ? 1800 : 5200; // scale the burst to the phone GPU budget
  var GUN_X = 0.72, GUN_Y = 0.12;    // raised finger-gun in tile coords (frame 34)
  var BL_X = 0.5, BL_Y = 0.40;       // blast center behind the dancers

  var PH_INTRO = 0.06;               // hologram fully materialized
  var PH_DANCE_END = 0.46;           // choreography fully scrubbed
  var PH_FREEZE = 0.50;
  var PH_ZOOM = 0.54;
  var PH_CHARGE = 0.56;
  var PH_FIRE = 0.62;                // the shot -> background blast
  var PH_IMPACT = 0.76;              // blast consumes the stage, dissolve

  // BLINK ocean: everything sparkles pink
  var stickColorsRgb = [
    [255, 79, 216], [255, 130, 200], [255, 180, 225], [255, 235, 245], [255, 60, 160],
  ];

  if (stageCanvas && chorusFrame) {
    var stx = stageCanvas.getContext("2d");
    var SW = 0, SH = 0;

    var resizeStage = function () {
      SW = stageCanvas.offsetWidth;
      SH = stageCanvas.offsetHeight;
      stageCanvas.width = SW * DPR;
      stageCanvas.height = SH * DPR;
    };
    var droneSeed = new Float32Array(FLEET);
    for (var ds = 0; ds < FLEET; ds++) {
      var sd = ((ds + 1) * 9301 + 49297) % 233280;
      droneSeed[ds] = sd / 233280;
    }

    // offscreen canvas used to tint each frame into a hologram
    var holoCv = document.createElement("canvas");
    holoCv.width = TILE_W;
    holoCv.height = TILE_H;
    var holoCtx = holoCv.getContext("2d");

    var sheetReady = false;
    var poseTargets = null; // particle sources for the detonation

    var sheet = new Image();
    sheet.decoding = "async";
    sheet.fetchPriority = "low";
    sheet.onload = function () {
      sheetReady = true;
      try {
        // sample only the final gun-pose frame: it powers the burst
        var oc = document.createElement("canvas");
        oc.width = TILE_W;
        oc.height = TILE_H;
        var octx = oc.getContext("2d", { willReadFrequently: true });
        var sx = (POSE_FRAME % SHEET_COLS) * TILE_W;
        var sy = Math.floor(POSE_FRAME / SHEET_COLS) * TILE_H;
        octx.drawImage(sheet, sx, sy, TILE_W, TILE_H, 0, 0, TILE_W, TILE_H);
        var data = octx.getImageData(0, 0, TILE_W, TILE_H).data;
        var pts = [];
        for (var y = 0; y < TILE_H; y += 2) {
          for (var x = 0; x < TILE_W; x += 2) {
            var i4 = (y * TILE_W + x) * 4;
            if (data[i4 + 3] < 110) continue;
            pts.push([x, y, data[i4], data[i4 + 1], data[i4 + 2]]);
          }
        }
        var t = new Float32Array(FLEET * 5);
        for (var d = 0; d < FLEET; d++) {
          var o = d * 5;
          if (pts.length) {
            var src = pts[Math.floor((d * pts.length) / FLEET)];
            t[o] = src[0]; t[o + 1] = src[1];
            t[o + 2] = src[2]; t[o + 3] = src[3]; t[o + 4] = src[4];
          } else {
            t[o] = TILE_W / 2; t[o + 1] = TILE_H / 2;
            t[o + 2] = 255; t[o + 3] = 120; t[o + 4] = 200;
          }
        }
        poseTargets = t;
      } catch (err) {
        // canvas tainted (opened via file://) — burst unavailable
        poseTargets = null;
      }
    };

    var stageAssetsRequested = false;
    function requestStageAssets() {
      if (stageAssetsRequested) return;
      stageAssetsRequested = true;
      resizeStage();
      window.addEventListener("resize", resizeStage);
      sheet.src = SHEET_URL;
    }
    whenSceneNear(concertViewport || stageCanvas, requestStageAssets, "260% 0px");

    // contain-fit the 16:9 tile into the stage canvas so the raised
    // arms and the footwork are never cropped away
    function stageMap() {
      var s = Math.min(SW / TILE_W, SH / TILE_H);
      return { s: s, ox: (SW - TILE_W * s) / 2, oy: (SH - TILE_H * s) / 2 };
    }

    function updateChorusCSS(p, m) {
      var zoomP = smooth(clamp01((p - PH_ZOOM) / 0.08));
      var chargeP = clamp01((p - PH_CHARGE) / (PH_FIRE - PH_CHARGE));
      var blastP = clamp01((p - PH_FIRE) / (PH_IMPACT - PH_FIRE));
      var burstP = clamp01((p - PH_IMPACT) / 0.22);
      // dive toward the gun, then the blast kicks the camera back out
      var zoom = 1 + zoomP * 2.2 * (1 - smooth(clamp01(blastP * 2.2)));
      chorusFrame.style.setProperty("--video-zoom", zoom.toFixed(3));
      chorusFrame.style.setProperty("--zoom-x", (((m.ox + GUN_X * TILE_W * m.s) / SW) * 100).toFixed(2) + "%");
      chorusFrame.style.setProperty("--zoom-y", (((m.oy + GUN_Y * TILE_H * m.s) / SH) * 100).toFixed(2) + "%");
      if (concertViewport) {
        concertViewport.style.setProperty("--crowd-boost", (burstP * 1.4).toFixed(3));
      }
      return { zoomP: zoomP, chargeP: chargeP, blastP: blastP, burstP: burstP, zoom: zoom };
    }

    function h01(n) {
      var s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return s - Math.floor(s);
    }

    // MV-style background detonation: white-blue flash behind the
    // dancers, dark debris chunks tumbling outward, a dust ring.
    // Pure function of blastP so it scrubs cleanly with the scroll.
    function drawBlast(blastP, time, m) {
      var cx = m.ox + BL_X * TILE_W * m.s;
      var cy = m.oy + BL_Y * TILE_H * m.s;
      var span = TILE_W * m.s;

      // sharp muzzle flash at the fingertip triggers it
      if (blastP < 0.1) {
        var ma = (0.1 - blastP) / 0.1;
        var mx = m.ox + GUN_X * TILE_W * m.s;
        var my = m.oy + GUN_Y * TILE_H * m.s;
        var fg = stx.createRadialGradient(mx, my, 0, mx, my, 30 * m.s * ma);
        fg.addColorStop(0, "rgba(255,252,240," + (ma * 0.95).toFixed(2) + ")");
        fg.addColorStop(0.35, "rgba(255,220,170," + (ma * 0.5).toFixed(2) + ")");
        fg.addColorStop(1, "rgba(255,220,170,0)");
        stx.fillStyle = fg;
        stx.beginPath();
        stx.arc(mx, my, 30 * m.s * ma, 0, Math.PI * 2);
        stx.fill();
      }

      var grow = smooth(clamp01(blastP * 1.15));
      if (grow <= 0) return;

      // white-blue core flash, blooming wide like the MV frame
      var coreR = span * (0.12 + grow * 0.65);
      var core = stx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      var coreA = Math.min(1, blastP * 5) * (1 - blastP * 0.25);
      core.addColorStop(0, "rgba(245,252,255," + (coreA * 0.95).toFixed(2) + ")");
      core.addColorStop(0.35, "rgba(190,225,250," + (coreA * 0.6).toFixed(2) + ")");
      core.addColorStop(0.7, "rgba(140,190,235," + (coreA * 0.25).toFixed(2) + ")");
      core.addColorStop(1, "rgba(140,190,235,0)");
      stx.fillStyle = core;
      stx.fillRect(0, 0, SW, SH);

      // dust billows pushed out along the ground
      for (var db = 0; db < 7; db++) {
        var da = h01(db * 3.3 + 5);
        var dph = clamp01(blastP * 1.3 - da * 0.2);
        if (dph <= 0) continue;
        var dx = cx + (da - 0.5) * span * 1.1 * smooth(dph);
        var dyv = cy + TILE_H * m.s * (0.28 + h01(db * 7.1) * 0.16);
        var dr = span * (0.06 + dph * 0.16) * (0.7 + da * 0.6);
        var dust = stx.createRadialGradient(dx, dyv, 0, dx, dyv, dr);
        var dAl = 0.3 * (1 - dph * 0.6);
        dust.addColorStop(0, "rgba(170,195,220," + dAl.toFixed(2) + ")");
        dust.addColorStop(1, "rgba(170,195,220,0)");
        stx.fillStyle = dust;
        stx.beginPath(); stx.arc(dx, dyv, dr, 0, Math.PI * 2); stx.fill();
      }

      // debris: dark chunks with lit rims, radiating + tumbling
      var N = 110;
      for (var i = 0; i < N; i++) {
        var r1 = h01(i * 12.9 + 3);
        var r2 = h01(i * 7.7 + 11);
        var r3 = h01(i * 5.1 + 29);
        var lt = clamp01((blastP * 1.25 - r1 * 0.22) / 0.85);
        if (lt <= 0) continue;
        var travel = 1 - Math.pow(1 - lt, 2.2); // fast launch, easing out
        var ang = r2 * Math.PI * 2;
        var dist = (0.1 + r3 * 0.9) * span * 0.62 * travel;
        var px = cx + Math.cos(ang) * dist * 1.15;
        var py = cy + Math.sin(ang) * dist * 0.7 + travel * travel * span * 0.1 * r1;
        var sz = (2.5 + r3 * 9) * m.s * (1 - travel * 0.25);
        var al = (1 - travel * 0.75) * Math.min(1, blastP * 4);
        if (al < 0.03 || sz < 0.6) continue;

        stx.save();
        stx.translate(px, py);
        stx.rotate(ang + travel * (3 + r2 * 6));
        // chunk silhouette against the flash
        stx.fillStyle = "rgba(14,18,28," + al.toFixed(2) + ")";
        stx.beginPath();
        stx.moveTo(-sz * 0.5, -sz * 0.32);
        stx.lineTo(sz * 0.18, -sz * 0.5);
        stx.lineTo(sz * 0.5, sz * 0.05);
        stx.lineTo(sz * 0.1, sz * 0.48);
        stx.lineTo(-sz * 0.42, sz * 0.3);
        stx.closePath();
        stx.fill();
        // lit rim on the side facing the core
        stx.strokeStyle = "rgba(190,220,250," + (al * 0.7).toFixed(2) + ")";
        stx.lineWidth = Math.max(0.7, sz * 0.09);
        stx.beginPath();
        stx.moveTo(-sz * 0.5, -sz * 0.32);
        stx.lineTo(sz * 0.18, -sz * 0.5);
        stx.stroke();
        stx.restore();
      }

      // shockwave ring
      if (blastP > 0.04 && blastP < 0.5) {
        var ringR = span * 0.1 + span * blastP * 1.15;
        stx.strokeStyle = "rgba(210,235,255," + ((0.5 - blastP) * 0.9).toFixed(2) + ")";
        stx.lineWidth = 2.5 * (1 - blastP);
        stx.beginPath();
        stx.ellipse(cx, cy, ringR, ringR * 0.62, 0, 0, Math.PI * 2);
        stx.stroke();
      }
    }

    function drawLightstick(g, x, y, sz, rgb, alpha) {
      // cheap layered arcs instead of shadowBlur — this runs for
      // hundreds of sticks per frame during the detonation
      g.strokeStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + (alpha * 0.9).toFixed(2) + ")";
      g.lineWidth = Math.max(1.5, sz * 0.22);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + sz * 2.8);
      g.stroke();
      g.fillStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + (alpha * 0.06).toFixed(2) + ")";
      g.beginPath();
      g.arc(x, y - sz * 0.4, sz * 1.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + alpha.toFixed(2) + ")";
      g.beginPath();
      g.arc(x, y - sz * 0.4, sz * 0.85, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(255,255,255," + (alpha * 0.45).toFixed(2) + ")";
      g.beginPath();
      g.arc(x, y - sz * 0.4, sz * 0.3, 0, Math.PI * 2);
      g.fill();
    }

    // detonation is a pure function of burstP so it scrubs cleanly.
    // The dissolve radiates from the blast center behind the dancers.
    function drawBurst(burstP, zoom, m) {
      var t = poseTargets;
      var fx = BL_X * TILE_W;
      var fy = BL_Y * TILE_H;
      var maxDist = Math.sqrt(TILE_W * TILE_W + TILE_H * TILE_H) * 0.7;
      var tipX = m.ox + fx * m.s;
      var tipY = m.oy + fy * m.s;

      stx.globalCompositeOperation = "lighter";
      for (var d = 0; d < FLEET; d++) {
        var o = d * 5;
        var bx = t[o], by = t[o + 1];
        var r1 = droneSeed[d];
        var r2 = droneSeed[(d * 7 + 3) % FLEET];
        var r3 = droneSeed[(d * 13 + 11) % FLEET];
        var dist = Math.sqrt((bx - fx) * (bx - fx) + (by - fy) * (by - fy));
        var delay = (dist / maxDist) * 0.35;
        var lt = clamp01((burstP * 1.35 - delay) / 0.8);
        var travel = Math.pow(lt, 1.2);
        var ang = Math.atan2(by - fy, bx - fx) + (r1 - 0.5) * 1.2;
        var dirX = Math.cos(ang);
        var dirY = Math.sin(ang) * 0.5 - 0.45 - r2 * 0.5;
        var speed = 80 + r2 * 220;
        var x = bx + dirX * speed * travel + Math.sin(r3 * 6.28 + travel * 5) * 12 * travel;
        var y = by + dirY * speed * travel + travel * travel * TILE_H * 0.55;
        var alpha = (1 - travel * 0.82) * Math.min(1, burstP * 3);
        if (alpha < 0.04) continue;

        var px = m.ox + x * m.s;
        var py = m.oy + y * m.s;
        var sz = (m.s * (0.9 + r1 * 0.6) * 4) / zoom;
        if (travel > 0.5 && d % 6 === 0) {
          drawLightstick(stx, px, py, sz * 1.5, stickColorsRgb[d % stickColorsRgb.length], alpha);
        } else {
          // ember flying off the hologram, pushed toward pink
          var rr = Math.min(255, ((t[o + 2] * 0.55) | 0) + 145);
          var gg = Math.min(255, ((t[o + 3] * 0.5) | 0) + 60);
          var bb = Math.min(255, ((t[o + 4] * 0.55) | 0) + 115);
          var ds2 = sz * (1 - travel * 0.35) * 0.75;
          stx.fillStyle = "rgba(" + rr + "," + gg + "," + bb + "," + (alpha * 0.08).toFixed(2) + ")";
          stx.fillRect(px - ds2, py - ds2, ds2 * 2, ds2 * 2);
          stx.fillStyle = "rgba(" + rr + "," + gg + "," + bb + "," + (alpha * 0.5).toFixed(2) + ")";
          stx.fillRect(px - ds2 / 2, py - ds2 / 2, ds2, ds2);
        }
      }
      stx.globalCompositeOperation = "source-over";

      // glowing card shards — the bullet "explodes into the project
      // list": holo-card fragments tumble out toward the next scene
      for (var si = 0; si < 14; si++) {
        var q1 = droneSeed[(si * 53 + 9) % FLEET];
        var q2 = droneSeed[(si * 29 + 17) % FLEET];
        var q3 = droneSeed[(si * 71 + 5) % FLEET];
        var st = clamp01((burstP * 1.25 - q1 * 0.18) / 0.9);
        if (st <= 0) continue;
        var sAng = q2 * Math.PI * 2;
        var sTravel = Math.pow(st, 0.8);
        var sx = fx + Math.cos(sAng) * sTravel * TILE_W * (0.25 + q3 * 0.4);
        var sy = fy + Math.sin(sAng) * sTravel * TILE_H * (0.3 + q1 * 0.5) + st * st * TILE_H * 0.2;
        var sAl = (1 - st * 0.7) * Math.min(1, burstP * 4);
        if (sAl < 0.04) continue;
        var cw = (26 + q3 * 24) * m.s * (1 - st * 0.3);
        var chh = cw * 0.62;
        stx.save();
        stx.translate(m.ox + sx * m.s, m.oy + sy * m.s);
        stx.rotate(sAng + st * (2 + q2 * 4));
        stx.fillStyle = "rgba(6,18,30," + (sAl * 0.85).toFixed(2) + ")";
        stx.fillRect(-cw / 2, -chh / 2, cw, chh);
        stx.strokeStyle = "rgba(79,216,255," + sAl.toFixed(2) + ")";
        stx.lineWidth = 1.2;
        stx.strokeRect(-cw / 2, -chh / 2, cw, chh);
        stx.fillStyle = "rgba(79,216,255," + (sAl * 0.7).toFixed(2) + ")";
        stx.fillRect(-cw / 2 + cw * 0.12, -chh / 2 + chh * 0.18, cw * 0.5, chh * 0.12);
        stx.fillStyle = "rgba(160,220,255," + (sAl * 0.45).toFixed(2) + ")";
        stx.fillRect(-cw / 2 + cw * 0.12, -chh / 2 + chh * 0.44, cw * 0.76, chh * 0.09);
        stx.fillRect(-cw / 2 + cw * 0.12, -chh / 2 + chh * 0.62, cw * 0.6, chh * 0.09);
        stx.restore();
      }

      // shockwave ring out of the impact
      if (burstP < 0.35) {
        stx.beginPath();
        stx.arc(tipX, tipY, (burstP * SW * 0.5) / zoom, 0, Math.PI * 2);
        stx.strokeStyle = "rgba(255,79,216," + ((0.4 - burstP) * 2).toFixed(2) + ")";
        stx.lineWidth = (4 * (1 - burstP)) / zoom;
        stx.stroke();
      }
      // white flash right at detonation
      if (burstP < 0.1) {
        stx.fillStyle = "rgba(255,240,252," + ((0.1 - burstP) * 8).toFixed(2) + ")";
        stx.fillRect(0, 0, SW, SH);
      }
    }

    // draw one spritesheet frame as a hologram projection:
    // cool tint, additive bloom pass, scanlines, gentle flicker
    function drawHoloFrame(idx, alpha, time, m) {
      var sx = (idx % SHEET_COLS) * TILE_W;
      var sy = Math.floor(idx / SHEET_COLS) * TILE_H;

      holoCtx.clearRect(0, 0, TILE_W, TILE_H);
      holoCtx.drawImage(sheet, sx, sy, TILE_W, TILE_H, 0, 0, TILE_W, TILE_H);
      // very light holographic grade — outfits must stay readable
      holoCtx.globalCompositeOperation = "source-atop";
      holoCtx.fillStyle = "rgba(96,140,255,0.08)";
      holoCtx.fillRect(0, 0, TILE_W, TILE_H);
      holoCtx.fillStyle = "rgba(255,120,220,0.04)";
      holoCtx.fillRect(0, 0, TILE_W, TILE_H);
      holoCtx.globalCompositeOperation = "source-over";

      var dx = m.ox, dy = m.oy, dw = TILE_W * m.s, dh = TILE_H * m.s;
      var flick = 0.95 + 0.05 * Math.sin(time * 0.021 + idx * 1.7);

      // faint floor reflection under the dancers (intro only)
      if (alpha < 0.72) {
        stx.save();
        stx.globalAlpha = alpha * 0.1;
        stx.translate(0, (dy + dh) * 2);
        stx.scale(1, -1);
        stx.drawImage(holoCv, dx, dy + dh * 0.02, dw, dh);
        stx.restore();
      }

      stx.save();
      stx.globalAlpha = alpha * flick;
      stx.drawImage(holoCv, dx, dy, dw, dh);
      // additive bloom — toned down so the outfits stay crisp
      stx.globalCompositeOperation = "lighter";
      stx.globalAlpha = alpha * 0.14 * flick;
      stx.drawImage(holoCv, dx - dw * 0.002, dy - dh * 0.004, dw * 1.004, dh * 1.008);
      stx.restore();

      // scanlines — light, only over the projection
      stx.save();
      stx.globalAlpha = alpha * 0.1;
      stx.fillStyle = "rgba(4,2,14,1)";
      for (var sl = Math.max(0, dy | 0); sl < dy + dh; sl += 4) {
        stx.fillRect(dx, sl, dw, 1.3);
      }
      stx.restore();
    }

    function drawStage(time) {
      var p = concertP;
      var m = stageMap();
      var phases = updateChorusCSS(p, m);

      stx.setTransform(DPR, 0, 0, DPR, 0, 0);
      stx.clearRect(0, 0, SW, SH);
      if (!sheetReady) return;

      if (phases.burstP > 0.002) {
        // aftershock shake, decaying fast (deterministic so it scrubs)
        if (phases.burstP < 0.22) {
          var mag = (0.22 - phases.burstP) * 22;
          stx.translate(Math.sin(phases.burstP * 240) * mag, Math.cos(phases.burstP * 197) * mag * 0.6);
        }
        // blast whites out, then cools off as the particles take over
        stx.save();
        stx.globalAlpha = Math.max(0, 1 - phases.burstP * 1.1);
        drawBlast(1, time, m);
        stx.restore();
        var holdA = Math.max(0, 1 - phases.burstP * 4);
        if (holdA > 0.02) drawHoloFrame(POSE_FRAME, holdA * 0.85, time, m);
        if (poseTargets) drawBurst(phases.burstP, phases.zoom, m);
        return;
      }

      // materialize: brightness ramps up with a scanline sweep
      var bootA = prefersReduced ? 1 : smooth(clamp01(p / PH_INTRO));

      // the choreography is scrubbed by scroll like video footage:
      // held group pose -> full dance -> arms-up gun pose
      var idx;
      if (prefersReduced || p >= PH_DANCE_END) {
        idx = POSE_FRAME;
      } else if (p < PH_INTRO) {
        idx = 0;
      } else {
        var danceT = (p - PH_INTRO) / (PH_DANCE_END - PH_INTRO);
        idx = Math.min(FRAME_COUNT - 1, Math.floor(danceT * FRAME_COUNT));
      }

      drawHoloFrame(idx, (p >= PH_DANCE_END ? 1 : 0.55 + bootA * 0.45), time, m);

      // materialization: the projection is revealed top-to-bottom by
      // a bright sweep line
      if (bootA < 1) {
        var sweepY = m.oy + TILE_H * m.s * bootA;
        // below the sweep line nothing has materialized yet
        stx.clearRect(0, sweepY + 3, SW, SH - sweepY);
        var sg = stx.createLinearGradient(0, sweepY - 26, 0, sweepY + 6);
        sg.addColorStop(0, "rgba(160,200,255,0)");
        sg.addColorStop(0.8, "rgba(190,220,255,0.5)");
        sg.addColorStop(1, "rgba(255,255,255,0.9)");
        stx.fillStyle = sg;
        stx.fillRect(m.ox, sweepY - 26, TILE_W * m.s, 32);
      }

      // BANG: the background detonates MV-style behind the held pose
      if (phases.blastP > 0) {
        drawBlast(phases.blastP, time, m);
        // dark silhouette rim so the dancers read against the white flash
        stx.save();
        stx.globalCompositeOperation = "source-over";
        stx.shadowColor = "rgba(8,12,24,0.85)";
        stx.shadowBlur = 14 * m.s;
        drawHoloFrame(POSE_FRAME, 1, time, m);
        stx.restore();
        drawHoloFrame(POSE_FRAME, 1, time, m);
      } else if (phases.chargeP > 0) {
        // energy charge building at the fist (until the shot fires)
        var tipX = m.ox + GUN_X * TILE_W * m.s;
        var tipY = m.oy + GUN_Y * TILE_H * m.s;
        var chR = ((8 + phases.chargeP * 38) * m.s) / phases.zoom;
        var cg = stx.createRadialGradient(tipX, tipY, 0, tipX, tipY, chR);
        cg.addColorStop(0, "rgba(255,255,255,0.95)");
        cg.addColorStop(0.35, "rgba(255,79,216,0.85)");
        cg.addColorStop(1, "rgba(255,79,216,0)");
        stx.fillStyle = cg;
        stx.beginPath();
        stx.arc(tipX, tipY, chR, 0, Math.PI * 2);
        stx.fill();
      }
    }

    function stageLoop(time) {
      if (isInView(concertViewport) && concertP < 0.97) {
        drawStage(time || 0);
      }
    }
    runSceneAnimation(concertViewport, stageLoop, { rootMargin: "20% 0px" });
  }
  /* ---------- concert crowd light sticks ---------- */

  // BLINK ocean: the whole crowd waves pink hammer lightsticks
  var stickColors = ["#ff4fd8", "#ff8ecb", "#ffb3dd", "#ffe3f1", "#ff3ca0", "#fff0f7"];

  function buildCrowd(sel, count, minH, maxH) {
    var elx = document.querySelector(sel);
    if (!elx) return;
    for (var i = 0; i < count; i++) {
      var stick = document.createElement("span");
      stick.className = "stick";
      var h = minH + Math.random() * (maxH - minH);
      stick.style.height = h.toFixed(0) + "px";
      stick.style.setProperty("--stick-color", stickColors[Math.floor(Math.random() * stickColors.length)]);
      stick.style.setProperty("--wave-dur", (1.7 + Math.random() * 1.6).toFixed(2) + "s");
      stick.style.setProperty("--wave-delay", (-Math.random() * 3).toFixed(2) + "s");
      elx.appendChild(stick);
    }
  }

  whenSceneNear(concertViewport, function () {
    buildCrowd("#concert .crowd.row-back", isPhonePerformance ? 48 : 90, 30, 60);
    buildCrowd("#concert .crowd.row-mid", isPhonePerformance ? 36 : 64, 45, 85);
    buildCrowd("#concert .crowd.row-front", isPhonePerformance ? 26 : 42, 65, 120);
  }, "220% 0px");

  /* ============================================================
     SOCIALS BACKGROUND (scene 06) — open-channels transmission
     grid: a radar sweep scans a character constellation. Star
     nodes trace a Pikachu-inspired silhouette and flare as the
     beam passes over them.
     ============================================================ */

  var socialsCanvas = document.querySelector(".socials-canvas");
  var contactSection = document.getElementById("contact");
  if (socialsCanvas && contactSection && !prefersReduced) {
    var sctx = socialsCanvas.getContext("2d");
    var XW = 0, XH = 0;
    var nodes = [];
    var constellationPaths = [];
    var planets = [];
    var socialsStartTime = null;
    var socialsLastFrameTime = null;
    var socialsFrameSampleStart = null;
    var socialsFrameSampleCount = 0;
    var socialsPixelRatio = isPhonePerformance || isSafariPerformance ? 1 : 1.25;
    var radarGlowScale = isPhonePerformance || isSafariPerformance ? 0.55 : 0.72;
    var constellationCanvas = document.createElement("canvas");
    var constellationContext = constellationCanvas.getContext("2d");
    var NODE_COLORS = [
      [255, 79, 216],   // instagram
      [255, 71, 87],    // youtube
      [215, 244, 255],  // github
      [79, 168, 255],   // linkedin
      [125, 255, 158],  // email
      [79, 216, 255],   // system cyan
    ];

    // The outer silhouette is traced from the supplied reference pose. Dense,
    // hidden geometry keeps it accurate while a medium set of visible stars
    // gives the second radar pass enough real anchors to connect.
    var CHARACTER_PATHS = [
      // Exact exterior: tail, feet, body, reaching arm, head, ears, and wave.
      {
        closed: true,
        smooth: false,
        color: [255, 211, 72],
        stars: 32,
        lineWidth: 1.7,
        points: [
          [1.000, 0.617], [0.872, 0.742], [0.692, 0.695], [0.631, 0.787],
          [0.592, 0.778], [0.584, 0.847], [0.528, 0.841], [0.538, 0.901],
          [0.520, 0.936], [0.580, 0.967], [0.596, 0.985], [0.593, 0.999],
          [0.555, 0.996], [0.450, 0.971], [0.438, 0.953], [0.292, 0.927],
          [0.208, 0.936], [0.200, 0.950], [0.115, 0.965], [0.054, 0.965],
          [0.050, 0.954], [0.064, 0.938], [0.112, 0.919], [0.092, 0.883],
          [0.088, 0.856], [0.159, 0.659], [0.154, 0.650], [0.116, 0.632],
          [0.103, 0.615], [0.092, 0.588], [0.095, 0.564], [0.103, 0.545],
          [0.130, 0.523], [0.166, 0.513], [0.205, 0.510], [0.178, 0.442],
          [0.176, 0.408], [0.184, 0.383], [0.214, 0.341], [0.238, 0.281],
          [0.259, 0.250], [0.192, 0.227], [0.122, 0.185], [0.039, 0.110],
          [0.000, 0.062], [0.005, 0.058], [0.057, 0.069], [0.157, 0.103],
          [0.247, 0.155], [0.314, 0.212], [0.420, 0.210], [0.482, 0.231],
          [0.538, 0.264], [0.551, 0.174], [0.576, 0.090], [0.611, 0.024],
          [0.634, 0.000], [0.643, 0.022], [0.647, 0.063], [0.645, 0.168],
          [0.623, 0.260], [0.585, 0.335], [0.585, 0.372], [0.565, 0.454],
          [0.565, 0.482], [0.573, 0.485], [0.616, 0.467], [0.681, 0.459],
          [0.686, 0.462], [0.685, 0.474], [0.704, 0.490], [0.700, 0.508],
          [0.685, 0.527], [0.688, 0.544], [0.792, 0.554], [0.869, 0.569],
          [0.953, 0.595],
        ],
      },
      // Ear-tip divisions follow the same angled shapes as the reference.
      {
        closed: true,
        smooth: false,
        color: [88, 42, 38],
        stars: 2,
        fillAlpha: 0.16,
        points: [[0.000, 0.062], [0.057, 0.069], [0.122, 0.185], [0.039, 0.110]],
      },
      {
        closed: true,
        smooth: false,
        color: [88, 42, 38],
        stars: 2,
        fillAlpha: 0.16,
        points: [[0.634, 0.000], [0.647, 0.063], [0.645, 0.147], [0.576, 0.090], [0.611, 0.024]],
      },
      // Circular, offset eyes and highlights preserve the head's real tilt.
      {
        closed: true,
        color: [88, 42, 38],
        stars: 3,
        fillAlpha: 0.34,
        lineWidth: 1.3,
        points: [[0.257, 0.336], [0.266, 0.313], [0.288, 0.304], [0.310, 0.313], [0.319, 0.336], [0.310, 0.359], [0.288, 0.368], [0.266, 0.359]],
      },
      {
        closed: true,
        color: [88, 42, 38],
        stars: 3,
        fillAlpha: 0.34,
        lineWidth: 1.3,
        points: [[0.472, 0.398], [0.481, 0.375], [0.503, 0.366], [0.525, 0.375], [0.534, 0.398], [0.525, 0.421], [0.503, 0.430], [0.481, 0.421]],
      },
      {
        closed: true,
        color: [245, 252, 255],
        fillAlpha: 0.82,
        lineWidth: 0.85,
        points: [[0.281, 0.326], [0.288, 0.315], [0.300, 0.318], [0.303, 0.331], [0.293, 0.339]],
      },
      {
        closed: true,
        color: [245, 252, 255],
        fillAlpha: 0.82,
        lineWidth: 0.85,
        points: [[0.496, 0.387], [0.503, 0.376], [0.515, 0.379], [0.518, 0.392], [0.508, 0.400]],
      },
      // Small button nose.
      {
        closed: true,
        color: [88, 42, 38],
        stars: 1,
        fillAlpha: 0.62,
        lineWidth: 0.8,
        points: [[0.376, 0.378], [0.386, 0.373], [0.395, 0.380], [0.386, 0.386]],
      },
      // Open smile and tongue, positioned from the reference rather than centered.
      {
        closed: true,
        color: [121, 43, 43],
        stars: 5,
        fillAlpha: 0.2,
        lineWidth: 1.35,
        points: [[0.309, 0.395], [0.348, 0.404], [0.382, 0.397], [0.418, 0.413], [0.451, 0.431], [0.437, 0.467], [0.410, 0.510], [0.383, 0.538], [0.356, 0.526], [0.335, 0.490], [0.321, 0.445]],
      },
      {
        closed: true,
        color: [255, 124, 143],
        stars: 2,
        fillAlpha: 0.24,
        lineWidth: 1,
        points: [[0.337, 0.465], [0.372, 0.455], [0.410, 0.470], [0.437, 0.490], [0.409, 0.522], [0.382, 0.536], [0.355, 0.522]],
      },
      // The cheeks are tall ovals in this tilted pose, not generic circles.
      {
        closed: true,
        color: [244, 75, 75],
        stars: 3,
        fillAlpha: 0.12,
        points: [[0.179, 0.408], [0.186, 0.375], [0.203, 0.361], [0.220, 0.375], [0.227, 0.408], [0.220, 0.441], [0.203, 0.455], [0.186, 0.441]],
      },
      {
        closed: true,
        color: [244, 75, 75],
        stars: 3,
        fillAlpha: 0.12,
        points: [[0.498, 0.512], [0.507, 0.483], [0.530, 0.471], [0.553, 0.483], [0.562, 0.512], [0.553, 0.541], [0.530, 0.553], [0.507, 0.541]],
      },
      // Interior arm seams make the pose readable without redrawing the silhouette.
      {
        closed: false,
        color: [247, 173, 52],
        stars: 3,
        lineWidth: 1.1,
        points: [[0.322, 0.557], [0.337, 0.570], [0.328, 0.579], [0.339, 0.589], [0.326, 0.596], [0.335, 0.606], [0.302, 0.632]],
      },
      {
        closed: false,
        color: [247, 173, 52],
        stars: 3,
        lineWidth: 1.1,
        points: [[0.450, 0.586], [0.520, 0.556], [0.590, 0.530], [0.670, 0.490]],
      },
      // Red tail root and two subtle foot creases.
      {
        closed: true,
        smooth: false,
        color: [224, 69, 56],
        stars: 2,
        fillAlpha: 0.1,
        points: [[0.550, 0.790], [0.592, 0.778], [0.584, 0.847], [0.528, 0.841]],
      },
      {
        closed: false,
        color: [247, 173, 52],
        stars: 2,
        lineWidth: 1,
        points: [[0.108, 0.950], [0.145, 0.933], [0.200, 0.936]],
      },
      {
        closed: false,
        color: [247, 173, 52],
        stars: 2,
        lineWidth: 1,
        points: [[0.450, 0.971], [0.520, 0.982], [0.580, 0.967]],
      },
    ];

    function addCharacterPath(path, artX, artY, artW, artH, spacing) {
      var sampledPoints = [];
      var segmentCount = path.closed ? path.points.length : path.points.length - 1;

      function pointAt(index) {
        if (path.closed) {
          return path.points[(index + path.points.length) % path.points.length];
        }
        return path.points[Math.max(0, Math.min(path.points.length - 1, index))];
      }

      for (var seg = 0; seg < segmentCount; seg++) {
        var p0 = pointAt(seg - 1);
        var p1 = pointAt(seg);
        var p2 = pointAt(seg + 1);
        var p3 = pointAt(seg + 2);
        var x1 = p1[0] * artW;
        var y1 = p1[1] * artH;
        var x2 = p2[0] * artW;
        var y2 = p2[1] * artH;
        var length = Math.hypot(x2 - x1, y2 - y1);
        var steps = Math.max(2, Math.ceil(length / spacing));

        for (var step = 0; step < steps; step++) {
          var t = step / steps;
          var tx;
          var ty;
          if (path.smooth === false) {
            tx = p1[0] + (p2[0] - p1[0]) * t;
            ty = p1[1] + (p2[1] - p1[1]) * t;
          } else {
            // Centripetal-looking Catmull-Rom interpolation: the source
            // points describe the pose while the generated trace stays round.
            var t2 = t * t;
            var t3 = t2 * t;
            tx = 0.5 * (
              2 * p1[0] +
              (-p0[0] + p2[0]) * t +
              (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
              (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
            );
            ty = 0.5 * (
              2 * p1[1] +
              (-p0[1] + p2[1]) * t +
              (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
              (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
            );
          }
          sampledPoints.push({
            x: artX + tx * artW,
            y: artY + ty * artH,
          });
        }
      }

      if (!path.closed) {
        var finalPoint = path.points[path.points.length - 1];
        sampledPoints.push({
          x: artX + finalPoint[0] * artW,
          y: artY + finalPoint[1] * artH,
        });
      }

      var visibleStars = {};
      var visibleStarCount = path.stars || 0;
      for (var starIndex = 0; starIndex < visibleStarCount; starIndex++) {
        var starPosition = visibleStarCount === 1
          ? Math.floor(sampledPoints.length * 0.5)
          : Math.floor((starIndex / (path.closed ? visibleStarCount : visibleStarCount - 1)) * (sampledPoints.length - 1));
        visibleStars[starPosition] = true;
      }

      var pathNodes = [];
      var pathPhase = (constellationPaths.length + 1) * 1.618;
      for (var sampleIndex = 0; sampleIndex < sampledPoints.length; sampleIndex++) {
        var sample = sampledPoints[sampleIndex];
        var nodeIndex = nodes.length;
        var sizeVariation = ((nodeIndex * 37) % 11) / 11;
        var brightnessVariation = ((nodeIndex * 53) % 17) / 17;
        nodes.push({
          x: sample.x,
          y: sample.y,
          drift: 0.018,
          phase: pathPhase + sampleIndex * 0.012,
          color: path.color,
          fieldColor: [175, 221, 255],
          ping: 0,
          character: true,
          visibleStar: !!visibleStars[sampleIndex],
          spark: !!visibleStars[sampleIndex],
          size: 1.05 + sizeVariation * 1.05,
          brightness: 0.26 + brightnessVariation * 0.56,
          connectionReveal: 0,
        });
        pathNodes.push(nodeIndex);
      }

      constellationPaths.push({
        nodes: pathNodes,
        closed: path.closed,
        color: path.color,
        fillAlpha: path.fillAlpha || 0,
        lineWidth: path.lineWidth || 1.45,
      });
    }

    // The dense character trace does not need to be rebuilt every animation
    // frame. Rendering it once removes hundreds of line segments and shadow
    // operations from the radar's hot path while keeping the moving stars,
    // sweep reveal, planets, and pings fully animated.
    function rebuildConstellationCache() {
      constellationCanvas.width = Math.max(1, Math.round(XW * socialsPixelRatio));
      constellationCanvas.height = Math.max(1, Math.round(XH * socialsPixelRatio));
      constellationContext.setTransform(socialsPixelRatio, 0, 0, socialsPixelRatio, 0, 0);
      constellationContext.clearRect(0, 0, XW, XH);
      constellationContext.lineCap = "round";
      constellationContext.lineJoin = "round";

      for (var pathDrawIndex = 0; pathDrawIndex < constellationPaths.length; pathDrawIndex++) {
        var constellationPath = constellationPaths[pathDrawIndex];
        var pathNodeIndices = constellationPath.nodes;
        if (!pathNodeIndices.length) continue;
        var pathColor = constellationPath.color || [255, 211, 72];

        constellationContext.beginPath();
        var firstPathNode = nodes[pathNodeIndices[0]];
        constellationContext.moveTo(firstPathNode.x, firstPathNode.y);
        for (var pathPointIndex = 1; pathPointIndex < pathNodeIndices.length; pathPointIndex++) {
          var pathPoint = nodes[pathNodeIndices[pathPointIndex]];
          constellationContext.lineTo(pathPoint.x, pathPoint.y);
        }
        if (constellationPath.closed) constellationContext.closePath();

        if (constellationPath.fillAlpha > 0) {
          constellationContext.fillStyle = "rgba(" + pathColor[0] + "," + pathColor[1] + "," + pathColor[2] + "," + constellationPath.fillAlpha.toFixed(2) + ")";
          constellationContext.fill();
        }

        constellationContext.shadowColor = "rgba(" + pathColor[0] + "," + pathColor[1] + "," + pathColor[2] + ",0.72)";
        constellationContext.shadowBlur = 10 * radarGlowScale;
        constellationContext.strokeStyle = "rgba(" + pathColor[0] + "," + pathColor[1] + "," + pathColor[2] + ",0.24)";
        constellationContext.lineWidth = constellationPath.lineWidth * 2.4;
        constellationContext.stroke();

        constellationContext.shadowBlur = 0;
        constellationContext.strokeStyle = "rgba(" + pathColor[0] + "," + pathColor[1] + "," + pathColor[2] + ",0.88)";
        constellationContext.lineWidth = constellationPath.lineWidth;
        constellationContext.stroke();
      }
    }

    var resizeSocials = function () {
      XW = socialsCanvas.offsetWidth;
      XH = socialsCanvas.offsetHeight;
      socialsCanvas.width = Math.max(1, Math.round(XW * socialsPixelRatio));
      socialsCanvas.height = Math.max(1, Math.round(XH * socialsPixelRatio));
      nodes = [];
      constellationPaths = [];
      planets = [];

      var artW = Math.min(XW * (XW < 700 ? 0.92 : 0.72), XH * 0.78);
      var artH = Math.min(XH * 0.78, artW * 1.08);
      var artX = (XW - artW) * 0.5;
      var artY = XH * 0.11;
      // Geometry is sampled densely for a continuous antialiased stroke. Only
      // each path's small `stars` allowance is visible before the reveal.
      var spacing = Math.max(5, Math.min(9, artW / 80));
      for (var pathIndex = 0; pathIndex < CHARACTER_PATHS.length; pathIndex++) {
        addCharacterPath(CHARACTER_PATHS[pathIndex], artX, artY, artW, artH, spacing);
      }

      // These unconnected stars sit inside and just beyond the eventual
      // silhouette. On pass one they keep the future character points from
      // reading as an isolated dotted outline; pass two selects only the
      // correct stars from this busier patch of sky.
      var localStarCount = Math.max(32, Math.floor(artW / 20));
      for (var localIndex = 0; localIndex < localStarCount; localIndex++) {
        var localSeed = ((localIndex + 17) * 9301 + 49297) % 233280;
        var localR1 = (localSeed = (localSeed * 9301 + 49297) % 233280) / 233280;
        var localR2 = (localSeed = (localSeed * 9301 + 49297) % 233280) / 233280;
        var localR3 = (localSeed = (localSeed * 9301 + 49297) % 233280) / 233280;
        // Two overlapping clouds: one inside the body and another extending
        // beyond every side of the eventual outline.
        var localX = localIndex % 3 === 0
          ? -0.1 + localR1 * 1.2
          : 0.12 + localR1 * 0.72;
        var localY = localIndex % 3 === 0
          ? 0.01 + localR2 * 1.01
          : 0.16 + localR2 * 0.76;
        nodes.push({
          x: artX + localX * artW,
          y: artY + localY * artH,
          drift: 0.07 + (localIndex % 4) * 0.025,
          phase: localIndex * 1.41,
          color: NODE_COLORS[(localIndex + 2) % NODE_COLORS.length],
          ping: 0,
          character: false,
          spark: localIndex % 9 === 0,
          size: 0.55 + localR3 * 1.75,
          brightness: 0.14 + localR1 * 0.56,
        });
      }

      // A small irregular halo hugs both sides of the future silhouette. It
      // makes the selected anchors feel discovered among neighboring stars,
      // rather than pre-arranged as a recognizable dotted frame.
      var HALO_STAR_POINTS = [
        [-0.02, 0.32], [0.11, 0.16], [0.50, 0.15], [0.91, 0.35],
        [0.98, 0.62], [0.82, 0.83], [0.68, 0.99], [0.37, 1.01],
        [0.14, 0.89], [0.04, 0.65], [0.31, 0.69], [0.58, 0.73],
      ];
      for (var haloIndex = 0; haloIndex < HALO_STAR_POINTS.length; haloIndex++) {
        var haloPoint = HALO_STAR_POINTS[haloIndex];
        nodes.push({
          x: artX + haloPoint[0] * artW,
          y: artY + haloPoint[1] * artH,
          drift: 0.08 + (haloIndex % 3) * 0.025,
          phase: haloIndex * 1.73,
          color: NODE_COLORS[(haloIndex + 5) % NODE_COLORS.length],
          ping: 0,
          character: false,
          spark: haloIndex % 7 === 0,
          size: 0.65 + ((haloIndex * 5) % 8) * 0.18,
          brightness: 0.2 + ((haloIndex * 7) % 9) * 0.055,
        });
      }

      // Populate the quieter left and right edges with a proper star field.
      // The center stays calmer so the social tiles and constellation can read.
      var count = Math.max(24, Math.floor(XW / 50));
      for (var i = 0; i < count; i++) {
        var s = ((i + 3) * 9301 + 49297) % 233280;
        var r1 = (s = (s * 9301 + 49297) % 233280) / 233280;
        var r2 = (s = (s * 9301 + 49297) % 233280) / 233280;
        var r3 = (s = (s * 9301 + 49297) % 233280) / 233280;
        var sideX = i % 2 === 0 ? r1 * 0.27 : 0.73 + r1 * 0.27;
        nodes.push({
          x: sideX * XW,
          y: (0.07 + r2 * 0.82) * XH,
          drift: 0.12 + r3 * 0.25,
          phase: r3 * Math.PI * 2,
          color: NODE_COLORS[i % NODE_COLORS.length],
          ping: 0,
          character: false,
          spark: i % 8 === 0,
          size: 0.7 + r3 * 1.35,
          brightness: 0.18 + r1 * 0.52,
        });
      }

      // A small irregular pocket keeps the left edge from feeling empty.
      var leftFillCount = Math.max(10, Math.floor(XW / 125));
      for (var leftIndex = 0; leftIndex < leftFillCount; leftIndex++) {
        var leftSeed = ((leftIndex + 41) * 11003 + 7919) % 233280;
        var leftR1 = (leftSeed = (leftSeed * 9301 + 49297) % 233280) / 233280;
        var leftR2 = (leftSeed = (leftSeed * 9301 + 49297) % 233280) / 233280;
        var leftR3 = (leftSeed = (leftSeed * 9301 + 49297) % 233280) / 233280;
        nodes.push({
          x: (0.025 + leftR1 * 0.31) * XW,
          y: (0.09 + leftR2 * 0.8) * XH,
          drift: 0.09 + leftR3 * 0.2,
          phase: leftIndex * 1.27,
          color: NODE_COLORS[(leftIndex + 3) % NODE_COLORS.length],
          ping: 0,
          character: false,
          spark: leftIndex % 11 === 0,
          size: 0.55 + leftR3 * 1.5,
          brightness: 0.12 + leftR1 * 0.48,
        });
      }

      var planetScale = Math.max(0.72, Math.min(1, XW / 1280));
      var PLANET_LAYOUT = [
        [0.075, 0.23, 18, [79, 216, 255], true, -0.18],
        [0.17, 0.72, 10, [255, 79, 216], false, 0.32],
        [0.105, 0.48, 7, [125, 255, 158], false, -0.4],
        [0.91, 0.19, 23, [138, 92, 255], true, 0.28],
        [0.94, 0.62, 13, [79, 168, 255], true, -0.3],
        [0.82, 0.84, 8, [255, 133, 187], false, 0.16],
      ];
      for (var planetIndex = 0; planetIndex < PLANET_LAYOUT.length; planetIndex++) {
        var planetDef = PLANET_LAYOUT[planetIndex];
        planets.push({
          x: planetDef[0] * XW,
          y: planetDef[1] * XH,
          r: planetDef[2] * planetScale,
          color: planetDef[3],
          ring: planetDef[4],
          tilt: planetDef[5],
          phase: planetIndex * 1.37,
          ping: 0,
        });
      }
      rebuildConstellationCache();
      socialsCanvas.dataset.radarProfile = isPhonePerformance ? "mobile" : isSafariPerformance ? "safari" : "desktop";
    };
    var socialsInitialized = false;
    whenSceneNear(contactSection, function () {
      if (socialsInitialized) return;
      socialsInitialized = true;
      resizeSocials();
      window.addEventListener("resize", resizeSocials);
    }, "220% 0px");

    function drawSocials(time) {
      if (socialsFrameSampleStart == null) socialsFrameSampleStart = time;
      socialsFrameSampleCount += 1;
      if (time - socialsFrameSampleStart >= 1000) {
        socialsCanvas.dataset.radarFps = String(Math.round(
          (socialsFrameSampleCount - 1) * 1000 / Math.max(1, time - socialsFrameSampleStart)
        ));
        socialsFrameSampleStart = time;
        socialsFrameSampleCount = 1;
      }
      var frameScale = socialsLastFrameTime == null
        ? 1
        : Math.min(4, Math.max(0.25, (time - socialsLastFrameTime) / (1000 / 60)));
      socialsLastFrameTime = time;
      sctx.setTransform(socialsPixelRatio, 0, 0, socialsPixelRatio, 0, 0);
      sctx.clearRect(0, 0, XW, XH);

      var cx = XW / 2;
      var cy = XH * 0.62;
      var maxR = Math.sqrt(XW * XW + XH * XH) * 0.62;
      var TAU = Math.PI * 2;
      var sweepTravel = time * 0.00085;
      var sweep = sweepTravel % TAU;
      var sweepCycle = Math.floor(sweepTravel / TAU);

      // concentric channel rings
      sctx.strokeStyle = "rgba(79,216,255,0.07)";
      sctx.lineWidth = 1;
      for (var ring = 1; ring <= 6; ring++) {
        sctx.beginPath();
        sctx.arc(cx, cy, (maxR / 6) * ring, 0, Math.PI * 2);
        sctx.stroke();
      }
      // crosshair spokes
      sctx.strokeStyle = "rgba(79,216,255,0.05)";
      for (var sp = 0; sp < 12; sp++) {
        var sa = (sp / 12) * Math.PI * 2;
        sctx.beginPath();
        sctx.moveTo(cx, cy);
        sctx.lineTo(cx + Math.cos(sa) * maxR, cy + Math.sin(sa) * maxR);
        sctx.stroke();
      }

      // First pass: a populated little solar system. The planets remain in
      // view while pass two selects the stars that form the character.
      for (var planetDrawIndex = 0; planetDrawIndex < planets.length; planetDrawIndex++) {
        var planet = planets[planetDrawIndex];
        var px = planet.x + Math.sin(time * 0.00016 + planet.phase) * 2.5;
        var py = planet.y + Math.cos(time * 0.00012 + planet.phase) * 1.8;
        var planetAngle = Math.atan2(py - cy, px - cx);
        if (planetAngle < 0) planetAngle += TAU;
        var planetDiff = (sweep - planetAngle + TAU) % TAU;
        if (planetDiff < 0.075) planet.ping = 1;
        planet.ping *= Math.pow(0.957, frameScale);

        var pc = planet.color;
        var planetGlow = sctx.createRadialGradient(
          px - planet.r * 0.32,
          py - planet.r * 0.34,
          planet.r * 0.08,
          px,
          py,
          planet.r * 1.15
        );
        planetGlow.addColorStop(0, "rgba(255,255,255,0.88)");
        planetGlow.addColorStop(0.18, "rgba(" + pc[0] + "," + pc[1] + "," + pc[2] + ",0.7)");
        planetGlow.addColorStop(0.72, "rgba(" + pc[0] + "," + pc[1] + "," + pc[2] + ",0.22)");
        planetGlow.addColorStop(1, "rgba(" + pc[0] + "," + pc[1] + "," + pc[2] + ",0)");
        sctx.beginPath();
        sctx.arc(px, py, planet.r * 1.15, 0, TAU);
        sctx.fillStyle = planetGlow;
        sctx.shadowColor = "rgba(" + pc[0] + "," + pc[1] + "," + pc[2] + ",0.55)";
        // The radial sprite already carries the idle glow. Reserve the costly
        // canvas shadow filter for the brief sweep ping only.
        sctx.shadowBlur = planet.ping > 0.02 ? (2 + planet.ping * 16) * radarGlowScale : 0;
        sctx.fill();

        sctx.beginPath();
        sctx.arc(px, py, planet.r * (1 + planet.ping * 0.07), 0, TAU);
        sctx.strokeStyle = "rgba(" + pc[0] + "," + pc[1] + "," + pc[2] + "," + (0.38 + planet.ping * 0.5).toFixed(2) + ")";
        sctx.lineWidth = 1;
        sctx.stroke();

        if (planet.ring) {
          sctx.save();
          sctx.translate(px, py);
          sctx.rotate(planet.tilt);
          sctx.beginPath();
          sctx.ellipse(0, 0, planet.r * 1.85, planet.r * 0.48, 0, 0, TAU);
          sctx.strokeStyle = "rgba(" + pc[0] + "," + pc[1] + "," + pc[2] + "," + (0.22 + planet.ping * 0.5).toFixed(2) + ")";
          sctx.lineWidth = 1.1;
          sctx.stroke();
          sctx.restore();
        }

        if (planet.ping > 0.32) {
          sctx.beginPath();
          sctx.arc(px, py, planet.r * 1.45 + (1 - planet.ping) * 18, 0, TAU);
          sctx.strokeStyle = "rgba(" + pc[0] + "," + pc[1] + "," + pc[2] + "," + (planet.ping * 0.3).toFixed(2) + ")";
          sctx.stroke();
        }
      }
      sctx.shadowBlur = 0;

      // radar sweep beam with trailing wedge
      var TRAIL = 1.15;
      var grad = sctx.createConicGradient
        ? sctx.createConicGradient(sweep - TRAIL, cx, cy)
        : null;
      if (grad) {
        grad.addColorStop(0, "rgba(79,216,255,0)");
        grad.addColorStop(TRAIL / (Math.PI * 2), "rgba(79,216,255,0.14)");
        grad.addColorStop(TRAIL / (Math.PI * 2) + 0.001, "rgba(79,216,255,0)");
        grad.addColorStop(1, "rgba(79,216,255,0)");
        sctx.fillStyle = grad;
        sctx.beginPath();
        sctx.moveTo(cx, cy);
        sctx.arc(cx, cy, maxR, 0, Math.PI * 2);
        sctx.fill();
      }
      // leading edge line
      sctx.beginPath();
      sctx.moveTo(cx, cy);
      sctx.lineTo(cx + Math.cos(sweep) * maxR, cy + Math.sin(sweep) * maxR);
      sctx.strokeStyle = "rgba(79,216,255,0.35)";
      sctx.lineWidth = 1.5;
      sctx.stroke();

      // Update every star first so the connecting silhouette and its nodes
      // flare together as the radar beam crosses them.
      for (var n = 0; n < nodes.length; n++) {
        var nd = nodes[n];
        // Hidden trace samples only build the cached silhouette. Updating
        // their trigonometry every frame was the radar's largest CPU cost.
        if (nd.character && !nd.visibleStar) continue;
        nd.drawX = nd.x + Math.sin(time * 0.0003 + nd.phase) * 14 * nd.drift;
        nd.drawY = nd.y + Math.cos(time * 0.00024 + nd.phase * 1.7) * 10 * nd.drift;

        var na = Math.atan2(nd.drawY - cy, nd.drawX - cx);
        if (na < 0) na += TAU;
        var diff = (sweep - na) % (Math.PI * 2);
        if (diff < 0) diff += Math.PI * 2;
        nd.reveal = 1;
        if (nd.character) {
          if (sweepCycle < 1) nd.connectionReveal = 0;
          else if (sweepCycle === 1) nd.connectionReveal = clamp01((sweep - na + 0.07) / 0.18);
          else nd.connectionReveal = 1;
        } else {
          nd.connectionReveal = 0;
        }
        if (diff < 0.052) nd.ping = 1;
        nd.ping *= Math.pow(0.952, frameScale);
      }

      // The second pass reveals complete antialiased paths through a sector
      // clip. This keeps curves continuous instead of painting many short,
      // independently glowing segments that read as pixels.
      if (sweepCycle >= 1) {
        sctx.save();
        if (sweepCycle === 1) {
          sctx.beginPath();
          sctx.moveTo(cx, cy);
          sctx.arc(cx, cy, maxR * 1.3, 0, Math.max(0.0001, sweep));
          sctx.closePath();
          sctx.clip();
        }

        sctx.drawImage(constellationCanvas, 0, 0, XW, XH);
        sctx.restore();
      }

      // Draw the star nodes over the traced silhouette.
      for (var nDraw = 0; nDraw < nodes.length; nDraw++) {
        var ndDraw = nodes[nDraw];
        if (ndDraw.character && !ndDraw.visibleStar) continue;
        var nx = ndDraw.drawX;
        var ny = ndDraw.drawY;

        var selected = ndDraw.character ? (ndDraw.connectionReveal || 0) : 0;
        var fieldColor = ndDraw.fieldColor || ndDraw.color;
        var c = [
          Math.round(fieldColor[0] + (ndDraw.color[0] - fieldColor[0]) * selected),
          Math.round(fieldColor[1] + (ndDraw.color[1] - fieldColor[1]) * selected),
          Math.round(fieldColor[2] + (ndDraw.color[2] - fieldColor[2]) * selected),
        ];
        var brightness = ndDraw.brightness == null ? 0.4 : ndDraw.brightness;
        var base = Math.min(1, brightness + ndDraw.ping * 0.48 + selected * 0.18);
        var starRadius = (ndDraw.size || 1.1) + selected * 0.35;
        sctx.beginPath();
        sctx.arc(nx, ny, starRadius + ndDraw.ping * 1.8, 0, Math.PI * 2);
        sctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + base.toFixed(2) + ")";
        sctx.shadowColor = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (0.25 + ndDraw.ping * 0.7).toFixed(2) + ")";
        var starNeedsGlow = ndDraw.spark || ndDraw.ping > 0.02 || selected > 0.02;
        sctx.shadowBlur = starNeedsGlow
          ? (2 + brightness * 4 + selected * 4 + ndDraw.ping * 12) * radarGlowScale
          : 0;
        sctx.fill();

        if (ndDraw.ping > 0.38 && ndDraw.spark) {
          sctx.beginPath();
          sctx.arc(nx, ny, 4 + (1 - ndDraw.ping) * 14, 0, Math.PI * 2);
          sctx.strokeStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (ndDraw.ping * 0.38).toFixed(2) + ")";
          sctx.lineWidth = 1.2;
          sctx.shadowBlur = 0;
          sctx.stroke();
        }
      }
      sctx.shadowBlur = 0;

      // drifting waveform along the bottom
      sctx.beginPath();
      for (var wx = 0; wx <= XW; wx += 6) {
        var wy = XH * 0.92 +
          Math.sin(wx * 0.02 + time * 0.0022) * 7 +
          Math.sin(wx * 0.047 + time * 0.0013) * 4;
        if (wx === 0) sctx.moveTo(wx, wy);
        else sctx.lineTo(wx, wy);
      }
      sctx.strokeStyle = "rgba(255,79,216,0.18)";
      sctx.lineWidth = 1.4;
      sctx.stroke();
    }

    function socialsLoop(time) {
      if (!socialsInitialized) return;
      var contactRect = contactSection.getBoundingClientRect();
      var socialsFocused =
        contactRect.top < window.innerHeight * 0.58 &&
        contactRect.bottom > window.innerHeight * 0.42;
      if (socialsFocused) {
        if (socialsStartTime === null) socialsStartTime = time || 0;
        drawSocials((time || 0) - socialsStartTime);
      } else {
        socialsStartTime = null;
        socialsLastFrameTime = null;
        socialsFrameSampleStart = null;
        socialsFrameSampleCount = 0;
      }
    }
    // This scene is lightweight enough after caching to follow every display
    // refresh. A zero interval bypasses the shared phone-only 30 fps limiter.
    runSceneAnimation(contactSection, socialsLoop, { rootMargin: "20% 0px", mobileInterval: 0 });
  }

  /* ---------- reveal-on-scroll for flow sections ---------- */

  var revealTargets = document.querySelectorAll(".holo-card, .section-head, .contact-actions, .social-tile");
  revealTargets.forEach(function (elr) {
    elr.classList.add("reveal");
  });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealTargets.forEach(function (elr) {
      io.observe(elr);
    });
  } else {
    revealTargets.forEach(function (elr) {
      elr.classList.add("visible");
    });
  }

  onScroll();
})();
