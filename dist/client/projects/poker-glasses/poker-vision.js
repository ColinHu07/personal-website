(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dealScene = document.getElementById("deal");
  var dealViewport = document.querySelector(".deal-viewport");
  var boardScene = document.getElementById("project-board");
  var boardViewport = document.querySelector(".board-viewport");
  var storyScene = document.getElementById("story");
  var riverDealStack = document.querySelector(".river-deal-stack");
  var flightCards = Array.prototype.slice.call(document.querySelectorAll(".flight-card"));
  var chapterLinks = Array.prototype.slice.call(document.querySelectorAll(".chapter-rail a"));
  var scrollFill = document.getElementById("scroll-fill");

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clamp01(value) {
    return clamp(value, 0, 1);
  }

  function smooth(value) {
    value = clamp01(value);
    return value * value * (3 - 2 * value);
  }

  function smoother(value) {
    value = clamp01(value);
    return value * value * value * (value * (value * 6 - 15) + 10);
  }

  function sceneProgress(scene) {
    if (!scene) return 0;
    var rect = scene.getBoundingClientRect();
    var travel = rect.height - window.innerHeight;
    return travel > 0 ? clamp01(-rect.top / travel) : rect.top <= 0 ? 1 : 0;
  }

  function setVar(element, name, value) {
    if (element) element.style.setProperty(name, value.toFixed(4));
  }

  function makeCorner(rank, suit, position) {
    var corner = document.createElement("span");
    corner.className = "card-corner " + position;
    corner.innerHTML = "<b>" + rank + "</b><i>" + suit + "</i>";
    return corner;
  }

  function pipPositions(count) {
    var layouts = {
      1: [[3, 2]],
      5: [[1, 1], [1, 3], [3, 2], [5, 1], [5, 3]],
      6: [[1, 1], [1, 3], [3, 1], [3, 3], [5, 1], [5, 3]],
      7: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3], [5, 1], [5, 3]],
      8: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3], [4, 2], [5, 1], [5, 3]],
      9: [[1, 1], [1, 3], [2, 1], [2, 3], [3, 2], [4, 1], [4, 3], [5, 1], [5, 3]],
      10: [[1, 1], [1, 3], [2, 2], [2, 1], [2, 3], [4, 1], [4, 3], [4, 2], [5, 1], [5, 3]]
    };
    return layouts[count] || layouts[1];
  }

  function decorateFlightCards() {
    var backCount = 0;
    flightCards.forEach(function (card) {
      if (card.classList.contains("back")) {
        card.classList.add(backCount++ % 3 === 1 ? "back-red" : "back-blue");
        return;
      }

      var rankNode = card.querySelector("b");
      var suitNode = card.querySelector("i");
      if (!rankNode || !suitNode) return;
      var rank = rankNode.textContent;
      var suit = suitNode.textContent;
      rankNode.remove();
      suitNode.remove();
      card.appendChild(makeCorner(rank, suit, "top"));
      card.appendChild(makeCorner(rank, suit, "bottom"));

      if (/^[JQK]$/.test(rank)) {
        var court = document.createElement("span");
        court.className = "court-panel";
        court.innerHTML = "<b>" + rank + "</b><i>" + suit + "</i>";
        card.appendChild(court);
        return;
      }

      var count = rank === "A" ? 1 : Number(rank);
      var field = document.createElement("span");
      field.className = "pip-field pips-" + count;
      pipPositions(count).forEach(function (position) {
        var pip = document.createElement("i");
        pip.className = "card-pip" + (position[0] > 3 ? " flip" : "");
        pip.style.setProperty("--row", position[0]);
        pip.style.setProperty("--col", position[1]);
        pip.textContent = suit;
        field.appendChild(pip);
      });
      card.appendChild(field);
    });
  }

  function updateFlightCards(progress) {
    flightCards.forEach(function (card) {
      var delay = Number(card.dataset.delay || 0);
      var flight = smoother((progress - 0.54 - delay) / 0.23);
      var vanish = smooth((flight - 0.86) / 0.14);
      var arc = Math.sin(flight * Math.PI) * -24;
      var x = Number(card.dataset.x || 0) * flight;
      var y = Number(card.dataset.y || 0) * flight + arc;
      var rotation = -18 + Number(card.dataset.r || 0) * flight;
      var scale = 0.17 + flight * 6.3;
      card.style.transform = "translate3d(calc(-50% + " + x.toFixed(2) + "vw), calc(-50% + " + y.toFixed(2) + "vh), 0) rotate(" + rotation.toFixed(2) + "deg) scale(" + scale.toFixed(3) + ")";
      card.style.opacity = String(clamp01(flight * 5) * (1 - vanish));
      card.style.filter = "blur(" + (vanish * 7).toFixed(2) + "px)";
    });
  }

  function updateDeal(progress) {
    var push = smoother((progress - 0.07) / 0.22);
    var titleOut = smooth((progress - 0.08) / 0.14);
    var quoteIn = smoother((progress - 0.22) / 0.13);
    var quoteOut = smooth((progress - 0.43) / 0.1);
    var blackout = smoother((progress - 0.45) / 0.09);
    var cards = smoother((progress - 0.52) / 0.28);

    setVar(dealViewport, "--push", push);
    setVar(dealViewport, "--hand-push", push);
    setVar(dealViewport, "--title-out", titleOut);
    setVar(dealViewport, "--quote-in", quoteIn);
    setVar(dealViewport, "--quote-opacity", quoteIn * (1 - quoteOut));
    setVar(dealViewport, "--blackout", blackout);
    setVar(dealViewport, "--cards", cards);
    updateFlightCards(progress);
  }

  function updateBoard(progress) {
    var boardEnter = smoother(progress / 0.14);
    var headingIn = smoother((progress - 0.03) / 0.13);
    var riverStackIn = smoother((progress - 0.47) / 0.08);
    var riverIn = smoother((progress - 0.58) / 0.16);
    var riverLift = Math.sin(riverIn * Math.PI);
    var sourceIn = smoother((progress - 0.77) / 0.12);

    setVar(boardViewport, "--board-enter", boardEnter);
    setVar(boardViewport, "--heading-in", headingIn);
    setVar(boardViewport, "--river-stack-in", riverStackIn);
    setVar(boardViewport, "--river-in", riverIn);
    setVar(boardViewport, "--river-lift", riverLift);
    setVar(boardViewport, "--source-in", sourceIn);
    if (riverDealStack) riverDealStack.classList.toggle("is-face-up", riverIn >= 0.5);

    var pipelineCards = boardViewport ? boardViewport.querySelectorAll(".pipeline-card") : [];
    Array.prototype.forEach.call(pipelineCards, function (card, index) {
      var cardIn = smoother((progress - 0.18 - index * 0.065) / 0.13);
      card.style.setProperty("--card-in", cardIn.toFixed(4));
    });
  }

  function updateChapter() {
    var middle = window.innerHeight * 0.52;
    var active = "deal";
    [dealScene, boardScene, storyScene].forEach(function (scene) {
      if (!scene) return;
      var rect = scene.getBoundingClientRect();
      if (rect.top <= middle && rect.bottom >= middle) active = scene.dataset.scene;
    });
    chapterLinks.forEach(function (link) {
      link.classList.toggle("active", link.dataset.chapter === active);
    });
    document.body.dataset.activeScene = active;
  }

  function update() {
    if (!reducedMotion) {
      updateDeal(sceneProgress(dealScene));
      if (window.innerWidth > 700) updateBoard(sceneProgress(boardScene));
    } else {
      updateDeal(0);
      updateBoard(1);
    }

    if (scrollFill) {
      var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      scrollFill.style.width = (maxScroll > 0 ? window.scrollY / maxScroll * 100 : 0) + "%";
    }
    updateChapter();
  }

  var ticking = false;
  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      update();
      ticking = false;
    });
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  decorateFlightCards();
  update();
})();
