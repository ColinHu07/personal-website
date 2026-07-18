(function () {
  "use strict";
  var label = document.querySelector("[data-project-boot]");
  if (!label || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var message = label.textContent;
  var cursor = 0;
  label.textContent = "";
  function typeStatus() {
    label.textContent = message.slice(0, cursor) + (cursor < message.length ? "\u2588" : "");
    cursor += 1;
    if (cursor <= message.length) window.setTimeout(typeStatus, 34);
  }
  typeStatus();
})();
