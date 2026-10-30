/* Shared helpers for the simulations on this site.
 * Every simulation script can use window.Sim.
 */
(function () {
  "use strict";

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  /* Colors taken from the site theme, so canvases follow light/dark mode. */
  function colors() {
    return {
      bg: cssVar("--linck-canvas-bg", "#ffffff"),
      panel: cssVar("--linck-panel-bg", "#f3f4f8"),
      grid: cssVar("--linck-plot-grid", "#e3e6ee"),
      text: cssVar("--global-text-color", "#1b2230"),
      muted: cssVar("--global-text-color-light", "#5a6375"),
      accent: cssVar("--global-base-color", "#2e44c4"),
      border: cssVar("--global-border-color", "#e3e6ee"),
      dark: document.documentElement.getAttribute("data-theme") === "dark"
    };
  }

  /* Calls fn() whenever the site switches between light and dark. */
  function onThemeChange(fn) {
    new MutationObserver(function () { fn(colors()); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  /* Keeps a canvas sharp on high-DPI screens and sized to its box.
   * onResize(widthCss, heightCss) is called after every resize. */
  function fitCanvas(canvas, aspect, onResize) {
    var ctx = canvas.getContext("2d");
    var lastW = -1, lastH = -1;
    function resize() {
      var w = canvas.parentNode.clientWidth;
      var h = aspect ? Math.round(w / aspect) : canvas.clientHeight;
      if (w === lastW && h === lastH) return;
      lastW = w; lastH = h;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      if (aspect) canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (onResize) onResize(w, h);
    }
    // The observer also fires once right away, after the caller has its context.
    new ResizeObserver(resize).observe(canvas.parentNode);
    return ctx;
  }

  /* Pointer position in CSS pixels relative to the canvas. */
  function pointer(canvas, ev) {
    var r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  /* Binds a range input to a label showing its formatted value. */
  function bindRange(input, label, format, onChange) {
    function update() {
      var v = parseFloat(input.value);
      if (label) label.textContent = format ? format(v) : String(v);
      if (onChange) onChange(v);
    }
    input.addEventListener("input", update);
    update();
    return update;
  }

  /* Deterministic random numbers (mulberry32). */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gaussian(rand) {
    var u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* Number formatting: 12 345, 1.23e-5 style where needed. */
  function fmt(x, digits) {
    if (!isFinite(x)) return "–";
    var ax = Math.abs(x);
    if (ax !== 0 && (ax < 1e-3 || ax >= 1e5)) {
      var e = Math.floor(Math.log10(ax));
      return (x / Math.pow(10, e)).toFixed(digits === undefined ? 2 : digits) + "×10" + superscript(e);
    }
    return x.toLocaleString("en-US", { maximumFractionDigits: digits === undefined ? 2 : digits });
  }

  function superscript(n) {
    var map = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    return String(n).split("").map(function (c) { return map[c] || c; }).join("");
  }

  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.Sim = {
    colors: colors, onThemeChange: onThemeChange, fitCanvas: fitCanvas, pointer: pointer,
    bindRange: bindRange, rng: rng, gaussian: gaussian, fmt: fmt, superscript: superscript,
    reducedMotion: reducedMotion
  };
})();
