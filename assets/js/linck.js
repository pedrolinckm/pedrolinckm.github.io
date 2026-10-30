/* Long abstracts in lists are clamped to three lines; this adds a button to expand them. */
(function () {
  "use strict";
  function setup() {
    document.querySelectorAll(".archive__item-excerpt").forEach(function (box) {
      var p = box.querySelector("p");
      if (!p || box.querySelector(".excerpt-toggle")) return;
      if (p.scrollHeight <= p.clientHeight + 2) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "excerpt-toggle";
      btn.textContent = "Show full abstract";
      btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("click", function () {
        var open = box.classList.toggle("is-open");
        btn.textContent = open ? "Show less" : "Show full abstract";
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      box.appendChild(btn);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
  window.addEventListener("load", setup); // again after fonts and MathJax change the layout
})();
