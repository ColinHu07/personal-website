/* ============================================================
   COLIN HU // JARVIS INTERFACE v5
   - Scroll scrub: writes --p (0..1) on each .scrub scene
   - Topographic holographic globe (filled continents, contour
     rings, Asia -> Europe -> NYC camera path)
   - 3D wireframe NYC flythrough (buildings/cars/bridges) that
     keeps playing until the user scrolls past
   - Real chorus video: finger-gun freeze, gun zoom, pixel
     disintegration into lightsticks
   - Exploded Meta glasses assembly handled in CSS from --p
   ============================================================ */

(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }
  function smooth(t) {
    t = clamp01(t);
    return t * t * (3 - 2 * t);
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function isInView(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  /* ---------- scroll scrub engine ---------- */

  var scrubScenes = Array.prototype.slice.call(document.querySelectorAll(".scene.scrub"));
  var progressFill = document.getElementById("progress-fill");
  var dots = Array.prototype.slice.call(document.querySelectorAll(".scene-dots a"));
  var allScenes = Array.prototype.slice.call(document.querySelectorAll(".scene"));

  var cityViewport = document.querySelector("#city .viewport");
  var concertViewport = document.querySelector("#concert .viewport");
  var glassesViewport = document.querySelector("#glasses .viewport");
  var broadcastViewport = document.querySelector("#broadcast .viewport");
  var cityP = 0;
  var concertP = 0;

  function onScroll() {
    var vh = window.innerHeight;
    var doc = document.documentElement;

    scrubScenes.forEach(function (scene) {
      var rect = scene.getBoundingClientRect();
      var total = rect.height - vh;
      var p = total > 0 ? clamp01(-rect.top / total) : 0;
      var viewport = scene.querySelector(".viewport");
      if (viewport) viewport.style.setProperty("--p", p.toFixed(4));

      if (scene.id === "city") cityP = p;
      if (scene.id === "concert") concertP = p;
      if (scene.id === "glasses" && glassesViewport) {
        if (p > 0.72) glassesViewport.setAttribute("data-lens", "open");
        else glassesViewport.removeAttribute("data-lens");
      }
      if (scene.id === "broadcast" && broadcastViewport) {
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
    dots.forEach(function (dot) {
      dot.classList.toggle("active", dot.dataset.dot === active);
    });
  }

  var ticking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function () {
          onScroll();
          ticking = false;
        });
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", onScroll);

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

    (function drawParticles() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < particles.length; i++) {
        var pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
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
      requestAnimationFrame(drawParticles);
    })();
  }

  /* ============================================================
     TOPOGRAPHIC GLOBE (scene 02, first phase)
     Filled continent polygons + contour rings + ocean shading.
     Camera path: Asia (118E) -> Europe -> locks onto NYC (74W).
     ============================================================ */

  var WORLD = [
    // North America
    [[-166,68],[-156,71],[-145,70],[-135,69],[-127,70],[-118,69],[-110,68],[-103,70],[-96,71],[-89,69],[-83,68],[-81,65],[-87,64],[-93,62],[-94,58],[-90,54],[-85,53],[-81,55],[-78,59],[-76,62],[-72,61],[-67,58],[-63,55],[-59,52],[-65,49],[-63,45],[-70,43],[-74,40],[-76,37],[-79,33],[-81,30],[-80,25],[-82,29],[-86,30],[-90,29],[-94,29],[-97,26],[-97,21],[-93,17],[-89,15],[-85,12],[-81,9],[-78,7],[-83,9],[-89,14],[-94,16],[-99,17],[-104,20],[-108,24],[-112,28],[-116,32],[-120,34],[-124,39],[-124,44],[-125,49],[-130,53],[-134,56],[-138,59],[-144,60],[-150,60],[-156,57],[-162,59],[-166,63]],
    // Greenland
    [[-57,76],[-52,80],[-44,82],[-36,83],[-27,82],[-21,79],[-20,75],[-24,71],[-31,68],[-38,65],[-43,60],[-48,61],[-52,65],[-55,70],[-58,74]],
    // South America
    [[-78,7],[-72,12],[-65,11],[-60,9],[-55,6],[-51,4],[-48,0],[-42,-3],[-36,-6],[-35,-10],[-38,-14],[-40,-19],[-45,-24],[-49,-28],[-54,-33],[-58,-37],[-63,-41],[-66,-46],[-69,-51],[-72,-54],[-74,-51],[-73,-45],[-74,-38],[-72,-31],[-70,-23],[-71,-18],[-76,-13],[-80,-7],[-81,-3],[-79,2]],
    // Africa
    [[-7,35],[-2,36],[4,37],[11,37],[20,33],[26,32],[32,31],[35,28],[38,20],[43,12],[48,12],[51,11],[46,-1],[41,-8],[38,-14],[35,-20],[32,-26],[27,-33],[22,-35],[18,-33],[15,-27],[12,-19],[13,-11],[10,-3],[9,3],[4,6],[-3,5],[-8,5],[-13,9],[-17,14],[-17,20],[-14,26],[-10,31]],
    // Eurasia
    [[-9,37],[-8,41],[-9,44],[-4,44],[-2,47],[-5,48],[-2,49],[2,51],[5,53],[8,54],[8,57],[11,56],[13,55],[18,58],[18,61],[21,63],[25,65],[22,68],[26,71],[31,70],[38,67],[45,68],[53,69],[60,70],[68,72],[75,72],[82,74],[90,75],[100,77],[110,76],[118,74],[128,73],[140,72],[150,71],[160,70],[170,68],[179,67],[179,64],[170,62],[163,59],[160,54],[155,51],[147,53],[141,53],[137,49],[132,45],[129,42],[126,39],[121,37],[119,33],[121,29],[116,23],[110,20],[107,16],[105,10],[103,2],[100,6],[98,11],[95,16],[91,22],[87,21],[82,17],[78,9],[76,15],[72,20],[67,24],[62,25],[58,24],[56,25],[52,27],[50,29],[48,30],[46,29],[48,27],[51,25],[56,24],[58,21],[55,17],[50,14],[45,12],[42,15],[39,20],[36,26],[34,29],[34,31],[35,34],[30,36],[27,36],[26,39],[22,37],[19,41],[15,39],[17,43],[13,45],[12,42],[9,44],[5,43],[3,41],[0,39],[-2,36],[-6,36]],
    // British Isles
    [[-5,50],[1,51],[2,53],[-1,55],[-3,58],[-6,58],[-5,55],[-8,54],[-10,52],[-6,50]],
    // Iceland
    [[-24,64],[-22,66],[-17,66.5],[-14,65],[-15,64],[-19,63.4],[-23,63.5]],
    // Japan
    [[130,31],[131,33],[135,34],[137,35],[140,35],[141,38],[140,41],[142,43],[145,44.5],[144,43],[141,41.5],[140,38.5],[139,35.5],[135,33],[132,31]],
    // Borneo
    [[109,1],[114,4],[117,2],[116,-3],[110,-2]],
    // Sumatra
    [[95,5],[102,-2],[106,-6],[103,-5],[97,2]],
    // New Guinea
    [[131,-1],[138,-2],[145,-5],[150,-8],[145,-8],[138,-7],[132,-4]],
    // Australia
    [[114,-22],[113,-25],[115,-33],[118,-35],[124,-33],[130,-32],[136,-35],[138,-35],[140,-38],[147,-38],[150,-37],[153,-32],[153,-27],[151,-24],[146,-19],[143,-14],[142,-11],[138,-14],[136,-12],[132,-11],[128,-15],[124,-16],[120,-19]],
    // Madagascar
    [[44,-16],[48,-13],[50,-16],[49,-22],[46,-25],[44,-22]],
  ];

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

    var resizeGlobe = function () {
      GW = globeCanvas.width = globeCanvas.offsetWidth * DPR;
      GH = globeCanvas.height = globeCanvas.offsetHeight * DPR;
      GR = Math.min(GW, GH) * 0.31;
      GCX = GW / 2;
      GCY = GH / 2;
    };
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

    // clamp back-hemisphere points to the limb so polygons stay sane
    function projectClamped(lat, lon, rotLon, rotLat) {
      var pt = project(lat, lon, rotLon, rotLat);
      if (pt.z < 0) {
        var len = Math.sqrt(pt.ux * pt.ux + pt.uy * pt.uy) || 1;
        pt.x = GCX + (pt.ux / len) * GR;
        pt.y = GCY - (pt.uy / len) * GR;
      }
      return pt;
    }

    function tracePoly(points) {
      gtx.beginPath();
      for (var i = 0; i < points.length; i++) {
        if (i === 0) gtx.moveTo(points[i].x, points[i].y);
        else gtx.lineTo(points[i].x, points[i].y);
      }
      gtx.closePath();
    }

    function hash2(lon, lat) {
      var s = Math.sin(lon * 12.9898 + lat * 78.233) * 43758.5453;
      return s - Math.floor(s);
    }

    function drawGlobe(time) {
      if (cityP < 0.5 && isInView(cityViewport)) {
        gtx.clearRect(0, 0, GW, GH);

        // Asia -> Europe -> Americas camera sweep, locking on NYC
        var lock = smooth(clamp01(cityP / 0.3));
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

        // --- atmosphere halo ---
        var halo = gtx.createRadialGradient(GCX, GCY, GR * 0.88, GCX, GCY, GR * 1.3);
        halo.addColorStop(0, "rgba(70,170,255,0)");
        halo.addColorStop(0.5, "rgba(70,170,255,0.16)");
        halo.addColorStop(0.75, "rgba(70,170,255,0.05)");
        halo.addColorStop(1, "rgba(70,170,255,0)");
        gtx.fillStyle = halo;
        gtx.beginPath();
        gtx.arc(GCX, GCY, GR * 1.3, 0, Math.PI * 2);
        gtx.fill();

        // --- ocean sphere ---
        var ocean = gtx.createRadialGradient(
          GCX - GR * 0.35, GCY - GR * 0.4, GR * 0.1,
          GCX, GCY, GR
        );
        ocean.addColorStop(0, "rgba(70,150,220,0.6)");
        ocean.addColorStop(0.45, "rgba(24,84,150,0.72)");
        ocean.addColorStop(0.85, "rgba(8,40,84,0.85)");
        ocean.addColorStop(1, "rgba(4,20,46,0.95)");
        gtx.fillStyle = ocean;
        gtx.beginPath();
        gtx.arc(GCX, GCY, GR, 0, Math.PI * 2);
        gtx.fill();

        // clip everything on-sphere from here
        gtx.save();
        gtx.beginPath();
        gtx.arc(GCX, GCY, GR, 0, Math.PI * 2);
        gtx.clip();

        // --- faint graticule ---
        gtx.strokeStyle = "rgba(140,210,255,0.1)";
        gtx.lineWidth = 1;
        for (var glat = -60; glat <= 60; glat += 30) {
          gtx.beginPath();
          var started = false;
          for (var glon = -180; glon <= 180; glon += 6) {
            var gp = project(glat, glon, rotLon, rotLat);
            if (gp.z < 0) { started = false; continue; }
            if (!started) { gtx.moveTo(gp.x, gp.y); started = true; }
            else gtx.lineTo(gp.x, gp.y);
          }
          gtx.stroke();
        }
        for (var glon2 = -180; glon2 < 180; glon2 += 30) {
          gtx.beginPath();
          var started2 = false;
          for (var glat2 = -85; glat2 <= 85; glat2 += 6) {
            var gp2 = project(glat2, glon2, rotLon, rotLat);
            if (gp2.z < 0) { started2 = false; continue; }
            if (!started2) { gtx.moveTo(gp2.x, gp2.y); started2 = true; }
            else gtx.lineTo(gp2.x, gp2.y);
          }
          gtx.stroke();
        }

        // --- filled continents with topographic contour rings ---
        var landGrad = gtx.createLinearGradient(GCX, GCY - GR, GCX, GCY + GR);
        landGrad.addColorStop(0, "rgba(190,235,255,0.92)");
        landGrad.addColorStop(0.5, "rgba(130,205,245,0.82)");
        landGrad.addColorStop(1, "rgba(80,155,205,0.7)");

        for (var w = 0; w < WORLD.length; w++) {
          var poly = WORLD[w];
          var pts = [];
          var anyFront = false;
          for (var v = 0; v < poly.length; v++) {
            var pp = projectClamped(poly[v][1], poly[v][0], rotLon, rotLat);
            if (pp.z >= 0) anyFront = true;
            pts.push(pp);
          }
          if (!anyFront) continue;

          tracePoly(pts);
          // topographic shading: lighter toward the "highlands" (centroid)
          var cx = 0, cy = 0;
          for (var c = 0; c < pts.length; c++) { cx += pts[c].x; cy += pts[c].y; }
          cx /= pts.length; cy /= pts.length;
          var elev = hash2(poly[0][0], poly[0][1]);
          var topo = gtx.createRadialGradient(cx, cy, 0, cx, cy, GR * (0.28 + elev * 0.18));
          topo.addColorStop(0, "rgba(" + Math.floor(200 + elev * 40) + ",245,255,0.96)");
          topo.addColorStop(0.45, "rgba(" + Math.floor(130 + elev * 30) + ",215,250,0.84)");
          topo.addColorStop(0.82, "rgba(" + Math.floor(70 + elev * 20) + ",165,215,0.72)");
          topo.addColorStop(1, "rgba(45,120,175,0.62)");
          gtx.fillStyle = topo;
          gtx.fill();
          gtx.strokeStyle = "rgba(225,248,255,0.82)";
          gtx.lineWidth = 1.6;
          gtx.stroke();
          // bright coastline rim
          gtx.strokeStyle = "rgba(255,255,255,0.35)";
          gtx.lineWidth = 2.2;
          gtx.stroke();

          // inner contour rings for elevation feel
          for (var ring = 1; ring <= 5; ring++) {
            var k = ring * 0.11;
            gtx.beginPath();
            for (var rv = 0; rv < pts.length; rv++) {
              var rx = lerp(pts[rv].x, cx, k);
              var ry = lerp(pts[rv].y, cy, k);
              if (rv === 0) gtx.moveTo(rx, ry);
              else gtx.lineTo(rx, ry);
            }
            gtx.closePath();
            gtx.strokeStyle = "rgba(255,255,255," + (0.16 - ring * 0.022).toFixed(2) + ")";
            gtx.lineWidth = 0.85;
            gtx.stroke();
          }
        }

        // subtle cloud wisps over oceans
        gtx.globalAlpha = 0.22;
        for (var ci = 0; ci < 7; ci++) {
          var clat = -20 + ci * 14 + Math.sin(time * 0.0003 + ci) * 6;
          var clon = -160 + ci * 48 + Math.cos(time * 0.00025 + ci * 1.7) * 18;
          var cp = project(clat, clon, rotLon, rotLat);
          if (cp.z < 0.15) continue;
          var cr = GR * (0.08 + hash2(clon, clat) * 0.06);
          var cg = gtx.createRadialGradient(cp.x, cp.y, 0, cp.x, cp.y, cr);
          cg.addColorStop(0, "rgba(255,255,255,0.55)");
          cg.addColorStop(0.55, "rgba(210,235,255,0.18)");
          cg.addColorStop(1, "rgba(210,235,255,0)");
          gtx.fillStyle = cg;
          gtx.beginPath();
          gtx.ellipse(cp.x, cp.y, cr * 1.4, cr * 0.55, ci * 0.4, 0, Math.PI * 2);
          gtx.fill();
        }
        gtx.globalAlpha = 1;

        // --- day/night terminator shading ---
        var shade = gtx.createRadialGradient(
          GCX - GR * 0.5, GCY - GR * 0.45, GR * 0.2,
          GCX + GR * 0.25, GCY + GR * 0.25, GR * 1.35
        );
        shade.addColorStop(0, "rgba(0,0,0,0)");
        shade.addColorStop(0.62, "rgba(2,8,20,0.05)");
        shade.addColorStop(1, "rgba(2,8,20,0.62)");
        gtx.fillStyle = shade;
        gtx.fillRect(GCX - GR, GCY - GR, GR * 2, GR * 2);

        // --- holographic scanlines ---
        gtx.fillStyle = "rgba(160,225,255,0.045)";
        var step = Math.max(4, GR * 0.028);
        for (var sy = GCY - GR; sy < GCY + GR; sy += step) {
          gtx.fillRect(GCX - GR, sy, GR * 2, 1);
        }

        gtx.restore(); // end sphere clip

        // --- rim light ---
        gtx.beginPath();
        gtx.arc(GCX, GCY, GR, 0, Math.PI * 2);
        gtx.strokeStyle = "rgba(150,220,255,0.75)";
        gtx.lineWidth = 1.6;
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
      requestAnimationFrame(drawGlobe);
    }
    if (!prefersReduced) requestAnimationFrame(drawGlobe);
    else drawGlobe(0);
  }

  /* ============================================================
     3D NYC FLYTHROUGH (scene 02, second phase)
     Perspective wireframe city: procedurally generated blocks,
     landmark towers, suspension bridges, moving cars. Plays on
     a time loop for as long as the scene is on screen.
     ============================================================ */

  var cityCanvas = document.querySelector(".city-canvas");
  var cityAerial = document.querySelector(".city-aerial");
  if (cityAerial) {
    cityAerial.muted = true;
    cityAerial.playsInline = true;
    cityAerial.loop = true;
    cityAerial.preload = "auto";
  }

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

    // draw a wireframe box: corners x0..x1, z0..z1, height h
    function drawBox(x0, x1, z0, z1, h, camZ, camX, horizon, f, hue, tilt) {
      var dz0 = z0 - camZ, dz1 = z1 - camZ;
      if (dz1 <= 4) return;
      dz0 = Math.max(dz0, 4);

      var a = edgeAlpha(dz0);
      if (a <= 0.02) return;

      // 8 corners
      var fBL = projectCity(x0, 0, dz0, camX, horizon, f, tilt);
      var fBR = projectCity(x1, 0, dz0, camX, horizon, f, tilt);
      var fTL = projectCity(x0, h, dz0, camX, horizon, f, tilt);
      var fTR = projectCity(x1, h, dz0, camX, horizon, f, tilt);
      var bBL = projectCity(x0, 0, dz1, camX, horizon, f, tilt);
      var bBR = projectCity(x1, 0, dz1, camX, horizon, f, tilt);
      var bTL = projectCity(x0, h, dz1, camX, horizon, f, tilt);
      var bTR = projectCity(x1, h, dz1, camX, horizon, f, tilt);

      var stroke = "rgba(" + hue + "," + a.toFixed(2) + ")";
      var fill = "rgba(3,11,21," + (0.55 + a * 0.4).toFixed(2) + ")";

      // top face
      ctx2.beginPath();
      ctx2.moveTo(fTL.x, fTL.y); ctx2.lineTo(fTR.x, fTR.y);
      ctx2.lineTo(bTR.x, bTR.y); ctx2.lineTo(bTL.x, bTL.y);
      ctx2.closePath();
      ctx2.fillStyle = fill;
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
      ctx2.fillStyle = fill;
      ctx2.fill();
      ctx2.stroke();

      // front face
      ctx2.beginPath();
      ctx2.moveTo(fBL.x, fBL.y); ctx2.lineTo(fTL.x, fTL.y);
      ctx2.lineTo(fTR.x, fTR.y); ctx2.lineTo(fBR.x, fBR.y);
      ctx2.closePath();
      ctx2.fillStyle = fill;
      ctx2.fill();
      ctx2.stroke();

      // windows on nearby buildings
      if (dz0 < 200 && h > 24) {
        var cols = Math.max(2, Math.floor((x1 - x0) / 7));
        var rows = Math.max(2, Math.floor(h / 12));
        ctx2.fillStyle = "rgba(140,230,255," + (a * 0.55).toFixed(2) + ")";
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

    function drawCityFrame(time) {
      ctx2.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx2.clearRect(0, 0, CW, CH);

      // cycle aerial vistas while the user stays on the city scene
      var vista = Math.floor(time / 9000) % 3;
      var horizon = CH * (vista === 2 ? 0.38 : 0.42);
      var f = CH * (vista === 1 ? 1.05 : 0.92);
      var camZ = time * (vista === 1 ? 0.022 : SPEED);
      var camX = vista === 1
        ? Math.sin(time * 0.00035) * 28
        : Math.sin(time * 0.00021) * 9 + (vista === 2 ? Math.sin(time * 0.00012) * 14 : 0);
      var tilt = vista === 2 ? Math.sin(time * 0.00018) * 0.12 : vista === 1 ? 0.04 : 0;
      if (cityAerial) {
        cityAerial.playbackRate = vista === 1 ? 0.85 : vista === 2 ? 1.15 : 1;
      }

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
          continue;
        }
        if (i % 7 === 3) continue; // cross street gap

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
            if (rnd() > 0.86) hue = "255,79,216";
            drawBox(lo, hi, z0, z0 + ROW * 0.82, h, camZ, camX, horizon, f, hue, tilt);
            xEdge += wdt + 6 + rnd() * 10;
          }
        }
      }

      // cars on the avenue
      for (var k = 0; k < 14; k++) {
        var lane = k % 2 === 0 ? 6 : -6;
        var speed = lane > 0 ? 0.085 : 0.058;
        var zc = ((k * 61 + time * speed - camZ) % (FAR - 20));
        if (zc < 0) zc += FAR - 20;
        zc += 10;
        var ca = edgeAlpha(zc);
        if (ca < 0.05) continue;
        var c1 = projectCity(lane, 1.6, zc, camX, horizon, f, tilt);
        var c2 = projectCity(lane, 1.6, zc + 5, camX, horizon, f, tilt);
        ctx2.beginPath();
        ctx2.moveTo(c1.x, c1.y); ctx2.lineTo(c2.x, c2.y);
        ctx2.strokeStyle = lane > 0
          ? "rgba(255,255,255," + ca.toFixed(2) + ")"
          : "rgba(255,79,216," + ca.toFixed(2) + ")";
        ctx2.lineWidth = Math.min(Math.max(1.6, c1.s * 3.4), 6);
        ctx2.lineCap = "round";
        ctx2.stroke();
        ctx2.lineCap = "butt";
        // headlight glow
        ctx2.beginPath();
        ctx2.arc(c1.x, c1.y, Math.min(Math.max(1.4, c1.s * 2.2), 4), 0, Math.PI * 2);
        ctx2.fillStyle = lane > 0
          ? "rgba(200,240,255," + (ca * 0.9).toFixed(2) + ")"
          : "rgba(255,140,230," + (ca * 0.9).toFixed(2) + ")";
        ctx2.fill();
      }

      // cross-street cars at the gaps
      for (var gi2 = firstRow; gi2 <= lastRow; gi2++) {
        if (gi2 % 7 !== 3) continue;
        var gz2 = gi2 * ROW - camZ;
        if (gz2 <= 8 || gz2 > 400) continue;
        var xa = ((time * 0.05 + gi2 * 37) % 280) - 140;
        var ca2 = edgeAlpha(gz2) * 0.9;
        var cc1 = projectCity(xa, 1.6, gz2, camX, horizon, f, tilt);
        var cc2 = projectCity(xa + 6, 1.6, gz2, camX, horizon, f, tilt);
        ctx2.beginPath();
        ctx2.moveTo(cc1.x, cc1.y); ctx2.lineTo(cc2.x, cc2.y);
        ctx2.strokeStyle = "rgba(255,210,79," + ca2.toFixed(2) + ")";
        ctx2.lineWidth = Math.min(Math.max(1.4, cc1.s * 3), 5);
        ctx2.stroke();
      }
    }

    (function cityLoop(time) {
      if (cityP > 0.28 && isInView(cityViewport) && !prefersReduced) {
        drawCityFrame(time || 0);
        if (cityAerial) {
          if (cityAerial.paused) cityAerial.play().catch(function () {});
        }
      } else if (cityAerial && !cityAerial.paused) {
        cityAerial.pause();
      }
      requestAnimationFrame(cityLoop);
    })(0);
    if (prefersReduced) drawCityFrame(4000);
  }

  /* ---------- flyover captions ---------- */

  var MONTAGE_STOPS = [
    "FIFTH AVENUE FLYOVER",
    "MIDTOWN CANYON SWEEP",
    "BROOKLYN BRIDGE APPROACH",
    "EMPIRE STATE GRID",
    "EAST RIVER CROSSING",
    "ONE WORLD TRADE CENTER",
  ];
  var montageLabel = document.getElementById("montage-label");
  var montageLabelIdx = 0;
  if (montageLabel && !prefersReduced) {
    setInterval(function () {
      if (cityP > 0.5 && isInView(cityViewport)) {
        montageLabelIdx = (montageLabelIdx + 1) % MONTAGE_STOPS.length;
        montageLabel.textContent = MONTAGE_STOPS[montageLabelIdx];
      }
    }, 3000);
  }

  /* ============================================================
     K-POP STAGE (scene 03) — real chorus video + disintegration
     Timeline (concert --p):
       0.00–0.35  chorus video plays toward the finger-gun moment
       0.35–0.42  freeze on gun pose + strobe (CSS)
       0.42–0.55  camera zooms into the guns
       0.52–0.58  energy charge at fingertip
       0.58–0.95  pixel burst -> particles rain into lightsticks
     ============================================================ */

  var chorusVideo = document.querySelector(".chorus-video");
  var chorusFrame = document.querySelector(".chorus-frame");
  var stageCanvas = document.querySelector(".stage-canvas");
  var GUN_TIME = 2.15;
  var GUN_X = 0.38;
  var GUN_Y = 0.46;
  var stickColorsRgb = [
    [255, 79, 216], [79, 216, 255], [138, 92, 255], [255, 210, 79], [125, 255, 158],
  ];

  if (stageCanvas && chorusVideo) {
    var stx = stageCanvas.getContext("2d");
    var SW = 0, SH = 0;
    var particlesCache = null;
    var offscreen = document.createElement("canvas");
    var offCtx = offscreen.getContext("2d");
    var pixelTiny = document.createElement("canvas");
    var pixelCtx = pixelTiny.getContext("2d");

    var resizeStage = function () {
      SW = stageCanvas.offsetWidth;
      SH = stageCanvas.offsetHeight;
      stageCanvas.width = SW * DPR;
      stageCanvas.height = SH * DPR;
      offscreen.width = SW;
      offscreen.height = SH;
      particlesCache = null;
    };
    resizeStage();
    window.addEventListener("resize", resizeStage);

    chorusVideo.muted = true;
    chorusVideo.playsInline = true;
    chorusVideo.preload = "auto";

    function syncVideo(p) {
      if (prefersReduced) {
        chorusVideo.currentTime = GUN_TIME;
        return;
      }
      if (p < 0.35) {
        var t = lerp(0.4, GUN_TIME, smooth(p / 0.35));
        if (Math.abs(chorusVideo.currentTime - t) > 0.08) chorusVideo.currentTime = t;
        if (chorusVideo.paused && isInView(concertViewport)) {
          chorusVideo.play().catch(function () {});
        }
      } else {
        chorusVideo.pause();
        chorusVideo.currentTime = GUN_TIME;
      }
    }

    function updateChorusCSS(p) {
      if (!chorusFrame) return;
      var zoomP = smooth(clamp01((p - 0.42) / 0.13));
      var disP = clamp01((p - 0.58) / 0.36);
      var chargeP = clamp01((p - 0.52) / 0.06);
      var pixelP = clamp01((p - 0.50) / 0.10) * (1 - disP * 0.35);
      chorusFrame.style.setProperty("--video-zoom", (1 + zoomP * 4.2).toFixed(3));
      chorusFrame.style.setProperty("--zoom-x", (GUN_X * 100).toFixed(1) + "%");
      chorusFrame.style.setProperty("--zoom-y", (GUN_Y * 100).toFixed(1) + "%");
      chorusFrame.style.setProperty("--dissolve", disP.toFixed(3));
      chorusFrame.style.setProperty("--pixel-cover", pixelP.toFixed(3));
      if (pixelP > 0.05 && disP < 0.25) chorusFrame.setAttribute("data-pixelating", "1");
      else chorusFrame.removeAttribute("data-pixelating");
      if (concertViewport) {
        concertViewport.style.setProperty("--crowd-boost", (disP * 1.4).toFixed(3));
      }
      return { zoomP: zoomP, disP: disP, chargeP: chargeP, pixelP: pixelP };
    }

    function drawPixelatedVideo(pixelP) {
      if (!chorusVideo.videoWidth || pixelP <= 0.02) return;
      offCtx.drawImage(chorusVideo, 0, 0, SW, SH);
      var block = Math.max(4, Math.round(lerp(6, 42, pixelP)));
      var pw = Math.ceil(SW / block);
      var ph = Math.ceil(SH / block);
      if (pixelTiny.width !== pw) pixelTiny.width = pw;
      if (pixelTiny.height !== ph) pixelTiny.height = ph;
      pixelCtx.drawImage(offscreen, 0, 0, pw, ph);
      stx.imageSmoothingEnabled = false;
      stx.drawImage(pixelTiny, 0, 0, pw, ph, 0, 0, SW, SH);
      stx.imageSmoothingEnabled = true;
    }

    function buildParticlesFromVideo() {
      if (!chorusVideo.videoWidth) return null;
      offCtx.drawImage(chorusVideo, 0, 0, SW, SH);
      var img = offCtx.getImageData(0, 0, SW, SH).data;
      var fx = SW * GUN_X;
      var fy = SH * GUN_Y;
      var pts = [];
      var stepPx = Math.max(3, Math.round(SW / 380));
      var maxDist = 1;
      for (var y = 0; y < SH; y += stepPx) {
        for (var x = 0; x < SW; x += stepPx) {
          var i4 = (y * SW + x) * 4;
          var a = img[i4 + 3];
          var lum = (img[i4] + img[i4 + 1] + img[i4 + 2]) / 3;
          if (a < 40 || lum < 18) continue;
          var dist = Math.sqrt((x - fx) * (x - fx) + (y - fy) * (y - fy));
          if (dist > maxDist) maxDist = dist;
          pts.push({ x: x, y: y, dist: dist, r: img[i4], g: img[i4 + 1], b: img[i4 + 2] });
        }
      }
      for (var pi = 0; pi < pts.length; pi++) {
        var s = (pi * 9301 + 49297) % 233280;
        var r1 = (s = (s * 9301 + 49297) % 233280) / 233280;
        var r2 = (s = (s * 9301 + 49297) % 233280) / 233280;
        var r3 = (s = (s * 9301 + 49297) % 233280) / 233280;
        var pt = pts[pi];
        var ang = Math.atan2(pt.y - fy, pt.x - fx) + (r1 - 0.5) * 1.4;
        pt.dirX = Math.cos(ang);
        pt.dirY = Math.sin(ang) * 0.55 - 0.35 - r2 * 0.5;
        pt.speed = 280 + r2 * 520;
        pt.wob = r3 * Math.PI * 2;
        pt.delay = (pt.dist / maxDist) * 0.38;
        pt.size = stepPx * (0.75 + r1 * 0.65);
        var sc = stickColorsRgb[pi % stickColorsRgb.length];
        pt.stickR = sc[0]; pt.stickG = sc[1]; pt.stickB = sc[2];
      }
      return { pts: pts, tip: { x: fx, y: fy } };
    }

    function drawLightstick(g, x, y, sz, rgb, alpha) {
      g.save();
      g.globalAlpha = alpha;
      g.strokeStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0.9)";
      g.lineWidth = Math.max(1.5, sz * 0.22);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + sz * 2.8);
      g.stroke();
      g.fillStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + alpha + ")";
      g.beginPath();
      g.arc(x, y - sz * 0.4, sz * 0.85, 0, Math.PI * 2);
      g.fill();
      g.shadowColor = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
      g.shadowBlur = sz * 2.2;
      g.beginPath();
      g.arc(x, y - sz * 0.4, sz * 0.5, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }

    function drawStage(time) {
      var p = concertP;
      syncVideo(p);
      var phases = updateChorusCSS(p);
      var disP = phases.disP;
      var chargeP = phases.chargeP;
      var pixelP = phases.pixelP;

      stx.setTransform(DPR, 0, 0, DPR, 0, 0);
      stx.clearRect(0, 0, SW, SH);

      if (pixelP > 0.02 && disP < 0.45) {
        drawPixelatedVideo(pixelP);
      }

      if (disP <= 0.02) return;

      if (!particlesCache && chorusVideo.readyState >= 2) {
        particlesCache = buildParticlesFromVideo();
      }
      if (!particlesCache) return;

      var burst = particlesCache.tip;
      for (var pi = 0; pi < particlesCache.pts.length; pi++) {
        var pt = particlesCache.pts[pi];
        var lt = clamp01((disP * 1.4 - pt.delay) / 0.78);
        var travel = Math.pow(lt, 1.25);
        var px = pt.x + pt.dirX * pt.speed * travel + Math.sin(pt.wob + travel * 6) * 26 * travel;
        var py = pt.y + pt.dirY * pt.speed * travel + travel * travel * SH * 0.35;
        var alpha2 = (1 - travel * 0.85) * disP;
        if (alpha2 < 0.04) continue;

        if (travel > 0.55) {
          drawLightstick(stx, px, py, pt.size, [pt.stickR, pt.stickG, pt.stickB], alpha2);
        } else {
          var sz = pt.size * (1 - travel * 0.4);
          stx.fillStyle = "rgba(" + pt.r + "," + pt.g + "," + pt.b + "," + alpha2.toFixed(2) + ")";
          stx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
        }
      }

      if (disP < 0.35) {
        var ringR = disP * SW * 0.55;
        stx.beginPath();
        stx.arc(burst.x, burst.y, ringR, 0, Math.PI * 2);
        stx.strokeStyle = "rgba(255,79,216," + ((0.4 - disP) * 2).toFixed(2) + ")";
        stx.lineWidth = 4 * (1 - disP);
        stx.stroke();
      }

      if (chargeP > 0 && disP < 0.08) {
        var cg = stx.createRadialGradient(burst.x, burst.y, 0, burst.x, burst.y, 8 + chargeP * 40);
        cg.addColorStop(0, "rgba(255,255,255,0.95)");
        cg.addColorStop(0.35, "rgba(255,79,216,0.85)");
        cg.addColorStop(1, "rgba(255,79,216,0)");
        stx.fillStyle = cg;
        stx.beginPath();
        stx.arc(burst.x, burst.y, 8 + chargeP * 40, 0, Math.PI * 2);
        stx.fill();
      }

      if (disP > 0.02 && disP < 0.12) {
        stx.fillStyle = "rgba(255,240,252," + ((0.12 - disP) * 10).toFixed(2) + ")";
        stx.fillRect(0, 0, SW, SH);
      }
    }

    (function stageLoop(time) {
      if (isInView(concertViewport) && concertP < 0.97) {
        drawStage(time || 0);
      }
      requestAnimationFrame(stageLoop);
    })(0);
  } else if (chorusVideo) {
    chorusVideo.muted = true;
    chorusVideo.playsInline = true;
  }
  /* ---------- concert crowd light sticks ---------- */

  var stickColors = ["#ff4fd8", "#4fd8ff", "#8a5cff", "#ffd24f", "#7dff9e"];

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

  buildCrowd("#concert .crowd.row-back", 46, 30, 60);
  buildCrowd("#concert .crowd.row-mid", 34, 45, 85);
  buildCrowd("#concert .crowd.row-front", 24, 65, 120);

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
