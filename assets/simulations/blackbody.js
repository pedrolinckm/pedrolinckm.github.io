/* Color of a black body as a function of temperature.
 * Planck spectrum -> CIE 1931 XYZ (2° observer) -> linear sRGB -> sRGB.
 * Color matching functions: multi-lobe Gaussian fit of Wyman, Sloan and Shirley (2013).
 */
(function () {
  "use strict";
  var root = document.getElementById("blackbody");
  if (!root || !window.Sim) return;
  var S = window.Sim;
  var $ = function (role) { return root.querySelector('[data-role="' + role + '"]'); };

  // ---- physics -----------------------------------------------------------
  var h = 6.62607015e-34, c = 2.99792458e8, kB = 1.380649e-23, sigma = 5.670374419e-8, WIEN = 2.897771955e-3;

  /* Spectral radiance B_λ(λ, T) in W·sr⁻¹·m⁻²·nm⁻¹, with λ in nm. */
  function planck(lnm, T) {
    var l = lnm * 1e-9;
    var x = h * c / (l * kB * T);
    if (x > 700) return 0;
    return 2 * h * c * c / Math.pow(l, 5) / Math.expm1(x) * 1e-9;
  }

  function g(l, mu, s1, s2) { var t = (l - mu) / (l < mu ? s1 : s2); return Math.exp(-0.5 * t * t); }
  function cmf(l) {
    return [
      1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2),
      0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1),
      1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8)
    ];
  }

  function xyzToLinearRgb(X, Y, Z) {
    return [
      3.2406 * X - 1.5372 * Y - 0.4986 * Z,
      -0.9689 * X + 1.8758 * Y + 0.0415 * Z,
      0.0557 * X - 0.2040 * Y + 1.0570 * Z
    ];
  }
  function gamma(u) { u = Math.max(0, Math.min(1, u)); return u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055; }

  /* Brings an out-of-gamut color inside by adding white, then scales the
   * brightest channel to 1. Returns linear RGB in [0, 1]. */
  function normalize(rgb) {
    var lo = Math.min(rgb[0], rgb[1], rgb[2]);
    if (lo < 0) rgb = rgb.map(function (v) { return v - lo; });
    var hi = Math.max(rgb[0], rgb[1], rgb[2]) || 1;
    return rgb.map(function (v) { return v / hi; });
  }

  function toCss(lin, k) {
    k = k === undefined ? 1 : k;
    var r = Math.round(255 * gamma(lin[0] * k)), gg = Math.round(255 * gamma(lin[1] * k)), b = Math.round(255 * gamma(lin[2] * k));
    return { css: "rgb(" + r + "," + gg + "," + b + ")", hex: "#" + [r, gg, b].map(function (v) { return v.toString(16).padStart(2, "0"); }).join("") };
  }

  function blackbodyColor(T) {
    var X = 0, Y = 0, Z = 0;
    for (var l = 380; l <= 780; l += 2) {
      var B = planck(l, T), f = cmf(l);
      X += B * f[0]; Y += B * f[1]; Z += B * f[2];
    }
    var sum = X + Y + Z;
    return { lin: normalize(xyzToLinearRgb(X / Y, 1, Z / Y)), x: X / sum, y: Y / sum, Y: Y * 2 };
  }

  var Y6500 = blackbodyColor(6500).Y;

  /* Wavelength -> display color for the rainbow under the curve. */
  var specCache = {};
  function spectralColor(l) {
    var key = Math.round(l);
    if (specCache[key]) return specCache[key];
    // the analytic fit is only reliable inside ~400-690 nm, so hold the end colors
    var f = cmf(Math.max(415, Math.min(680, l)));
    var lin = normalize(xyzToLinearRgb(f[0], f[1], f[2]));
    // fade toward the ends of the visible range, where the eye is insensitive
    var fade = Math.min(1, Math.max(0.25, (l - 380) / 40), Math.max(0.25, (750 - l) / 60));
    return (specCache[key] = toCss(lin, fade).css);
  }

  function visibleFraction(T) {
    var s = 0;
    for (var l = 380; l <= 750; l += 1) s += planck(l, T);
    return s * Math.PI / (sigma * Math.pow(T, 4)); // ∫B dλ over the visible, over total radiance σT⁴/π
  }

  // ---- state & UI --------------------------------------------------------
  var T = 5772;
  var Tmin = 500, Tmax = 40000;
  var slider = $("temp");
  function sliderToT(v) { return Tmin * Math.pow(Tmax / Tmin, v / 1000); }
  function tToSlider(t) { return 1000 * Math.log(t / Tmin) / Math.log(Tmax / Tmin); }

  var C = S.colors();
  var sw = 0, shH = 0, pw = 0, ph = 0;
  var sctx = S.fitCanvas($("swatch"), 4 / 3, function (w, hh) { sw = w; shH = hh; render(); });
  var pctx = S.fitCanvas($("plot"), 4 / 3, function (w, hh) { pw = w; ph = hh; render(); });

  function render() {
    if (!sw || !pw) return;
    var col = blackbodyColor(T);
    var realistic = $("bright").checked;
    var k = 1;
    if (realistic) {
      // brightness on a logarithmic scale: 6500 K -> full, 10⁻⁵ of it -> black
      var ratio = col.Y / Y6500;
      k = Math.max(0, Math.min(1, (Math.log10(ratio) + 5) / 5));
      k = Math.pow(k, 2.2);
    }
    var cc = toCss(col.lin, k);
    drawSwatch(cc.css, col.lin, k);
    drawPlot();
    $("t-out").textContent = Math.round(T).toLocaleString("en-US") + " K";
    $("r-peak").textContent = formatLength(WIEN / T * 1e9);
    $("r-hex").textContent = toCss(col.lin, 1).hex;
    $("r-xy").textContent = col.x.toFixed(4) + ", " + col.y.toFixed(4);
    $("r-flux").textContent = S.fmt(sigma * Math.pow(T, 4), 2) + " W/m²";
    $("r-vis").textContent = (100 * visibleFraction(T)).toFixed(1) + "%";
    $("chip").style.background = toCss(col.lin, 1).css;
  }

  function formatLength(nm) {
    return nm >= 1000 ? (nm / 1000).toFixed(2) + " μm" : Math.round(nm) + " nm";
  }

  function drawSwatch(css, lin, k) {
    var w = sw, hh = shH;
    sctx.fillStyle = "#05070d";
    sctx.fillRect(0, 0, w, hh);
    var cx = w / 2, cy = hh / 2, R = Math.min(w, hh) * 0.3;
    // glow
    var glow = sctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 2.1);
    glow.addColorStop(0, toCss(lin, k * 0.55).css);
    glow.addColorStop(1, "rgba(5,7,13,0)");
    sctx.globalAlpha = 0.85;
    sctx.fillStyle = glow;
    sctx.fillRect(0, 0, w, hh);
    sctx.globalAlpha = 1;
    // disk with mild limb darkening
    var body = sctx.createRadialGradient(cx - R * 0.15, cy - R * 0.15, R * 0.05, cx, cy, R);
    body.addColorStop(0, toCss(lin.map(function (v) { return Math.min(1, v * 0.85 + 0.15); }), k).css);
    body.addColorStop(0.7, css);
    body.addColorStop(1, toCss(lin, k * 0.62).css);
    sctx.fillStyle = body;
    sctx.beginPath();
    sctx.arc(cx, cy, R, 0, 2 * Math.PI);
    sctx.fill();
  }

  function drawPlot() {
    var w = pw, hh = ph, ctx = pctx;
    var m = { l: 52, r: 24, t: 30, b: 40 };
    var iw = w - m.l - m.r, ih = hh - m.t - m.b;
    var lpk = WIEN / T * 1e9;
    var xmax = Math.max(2500, Math.min(15000, 3.2 * lpk));
    var showSun = $("sun").checked;
    var ymax = planck(lpk, T);
    if (showSun) ymax = Math.max(ymax, planck(WIEN / 5772 * 1e9, 5772));
    ymax *= 1.1;
    var X = function (l) { return m.l + iw * l / xmax; };
    var Yp = function (v) { return m.t + ih * (1 - v / ymax); };

    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, w, hh);

    // grid and axes
    ctx.font = "11px system-ui, sans-serif";
    ctx.strokeStyle = C.grid; ctx.fillStyle = C.muted; ctx.lineWidth = 1;
    var xstep = niceStep(xmax / 5);
    ctx.textAlign = "center";
    for (var l = 0; l <= xmax + 1; l += xstep) {
      ctx.beginPath(); ctx.moveTo(X(l), m.t); ctx.lineTo(X(l), m.t + ih); ctx.stroke();
      ctx.fillText(l >= 1000 ? (l / 1000) + " μm" : l + " nm", X(l), m.t + ih + 15);
    }
    var ystep = niceStep(ymax / 4);
    ctx.textAlign = "right";
    for (var v = 0; v <= ymax; v += ystep) {
      ctx.beginPath(); ctx.moveTo(m.l, Yp(v)); ctx.lineTo(m.l + iw, Yp(v)); ctx.stroke();
      ctx.fillText(axisNum(v), m.l - 6, Yp(v) + 4);
    }
    ctx.textAlign = "left";
    ctx.fillStyle = C.muted;
    ctx.fillText("Spectral radiance (W sr⁻¹ m⁻² nm⁻¹)", m.l, m.t - 12);
    ctx.textAlign = "right";
    ctx.fillText("wavelength", m.l + iw, m.t + ih + 32);

    // visible band as a rainbow under the curve
    var step = xmax / iw;
    for (l = 380; l <= 750; l += Math.max(1, step)) {
      var y = Yp(planck(l, T));
      ctx.fillStyle = spectralColor(l);
      ctx.fillRect(X(l), y, Math.max(1, iw * Math.max(1, step) / xmax) + 0.5, m.t + ih - y);
    }
    // faint fill outside the visible band
    ctx.fillStyle = C.accent;
    ctx.globalAlpha = 0.1;
    ctx.beginPath(); ctx.moveTo(X(1), m.t + ih);
    for (l = 1; l <= xmax; l += step) ctx.lineTo(X(l), Yp(planck(l, T)));
    ctx.lineTo(X(xmax), m.t + ih); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;

    if (showSun && Math.abs(T - 5772) > 1) curve(5772, C.muted, [5, 4]);
    curve(T, C.text, []);

    function curve(temp, color, dash) {
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash(dash);
      ctx.beginPath();
      for (var l2 = 1; l2 <= xmax; l2 += step) {
        var yy = Yp(planck(l2, temp));
        if (l2 === 1) ctx.moveTo(X(l2), yy); else ctx.lineTo(X(l2), yy);
      }
      ctx.stroke(); ctx.setLineDash([]);
    }

    // Wien peak marker
    if (lpk <= xmax) {
      ctx.strokeStyle = C.accent; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(lpk), Yp(planck(lpk, T))); ctx.lineTo(X(lpk), m.t + ih); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.accent; ctx.textAlign = X(lpk) > m.l + iw - 80 ? "right" : "left";
      ctx.fillText("  λmax = " + formatLength(lpk) + "  ", X(lpk), Yp(planck(lpk, T)) - 6);
    }
    if (showSun && Math.abs(T - 5772) > 1) {
      ctx.fillStyle = C.muted; ctx.textAlign = "right";
      ctx.fillText("dashed: the Sun, 5772 K", m.l + iw, m.t + 12);
    }
    ctx.textAlign = "left";
  }

  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
  }
  function axisNum(v) {
    if (v === 0) return "0";
    var e = Math.floor(Math.log10(v));
    if (e >= -2 && e <= 4) return String(+v.toPrecision(3));
    return (v / Math.pow(10, e)).toFixed(1).replace(/\.0$/, "") + "e" + e;
  }

  slider.addEventListener("input", function () { T = sliderToT(parseFloat(slider.value)); render(); });
  root.querySelectorAll("[data-temp]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      T = parseFloat(btn.getAttribute("data-temp"));
      slider.value = tToSlider(T);
      render();
    });
  });
  $("bright").addEventListener("change", render);
  $("sun").addEventListener("change", render);
  S.onThemeChange(function (cc) { C = cc; render(); });

  slider.value = tToSlider(T);
  render();
})();
