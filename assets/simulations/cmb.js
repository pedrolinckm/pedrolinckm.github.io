/* Cosmic microwave background: acoustic peaks versus the content of the universe.
 *
 * The background quantities (redshift of last scattering, sound horizon, distance
 * to last scattering, damping and equality scales) are computed from the
 * Friedmann equation and standard fitting formulas (Hu & Sugiyama 1996,
 * Eisenstein & Hu 1998). The spectrum itself is a semi-analytic model of the
 * acoustic oscillations whose few free coefficients were fitted once so that
 * the Planck 2018 parameters reproduce the measured peaks. It shows the right
 * trends, not percent-level numbers: for that you need a Boltzmann code
 * such as CAMB or CLASS.
 */
(function () {
  "use strict";
  var root = document.getElementById("cmb");
  if (!root || !window.Sim) return;
  var S = window.Sim;
  var $ = function (role) { return root.querySelector('[data-role="' + role + '"]'); };

  var CKMS = 299792.458;          // speed of light, km/s
  var OMEGA_R_H2 = 4.18e-5;       // photons + 3 massless neutrinos
  var R_COEF = 30364;             // R = 3ρ_b/4ρ_γ = R_COEF ω_b a
  var LMAX = 2500;
  // coefficients of the acoustic model, fitted to the Planck 2018 best fit
  var K = { drive: 0.49422, pot: 0.0996, phi0: 0.27056, phi1: -0.04661, dexp: 1.31888,
            dscale: 0.71243, dop: 1.45298, load: 0.27108, lsw: 20.20613, amp: 10530.18 };
  var PLANCK = { ob: 0.0493, oc: 0.2650, ol: 0.6847, h: 0.6736, ns: 0.9649 };

  // ---- background --------------------------------------------------------
  function background(p) {
    var h = p.h, ob = p.ob, oc = p.oc, ol = p.ol;
    var wb = ob * h * h, om = ob + oc, wm = om * h * h, or = OMEGA_R_H2 / (h * h);
    var ok = 1 - om - ol - or;
    var g1 = 0.0783 * Math.pow(wb, -0.238) / (1 + 39.5 * Math.pow(wb, 0.763));
    var g2 = 0.560 / (1 + 21.1 * Math.pow(wb, 1.81));
    var zs = 1048 * (1 + 0.00124 * Math.pow(wb, -0.738)) * (1 + g1 * Math.pow(wm, g2));
    var H0 = 100 * h;
    var E2 = function (z) { var a = 1 + z; return or * a * a * a * a + om * a * a * a + ok * a * a + ol; };

    // a universe whose expansion rate vanishes before recombination never had a hot Big Bang
    for (var i = 0; i <= 400; i++) {
      if (E2(zs * i / 400) <= 0) return { bounce: true, ok: ok, om: om };
    }

    // sound horizon: r_s = ∫ c_s / (a H) d ln a, from a = 0 to a*
    var n = 3000, la0 = Math.log(1e-8), la1 = -Math.log(1 + zs), rs = 0, prev = null;
    for (i = 0; i <= n; i++) {
      var la = la0 + (la1 - la0) * i / n, a = Math.exp(la), z = 1 / a - 1;
      var f = CKMS / Math.sqrt(3 * (1 + R_COEF * wb * a)) / (a * H0 * Math.sqrt(E2(z)));
      if (prev !== null) rs += 0.5 * (f + prev) * (la1 - la0) / n;
      prev = f;
    }
    // comoving distance to last scattering, integrated in u = ln(1+z)
    var chi = 0; prev = null; var u1 = Math.log(1 + zs);
    for (i = 0; i <= n; i++) {
      var u = u1 * i / n, zz = Math.expm1(u);
      var g = CKMS * (1 + zz) / (H0 * Math.sqrt(E2(zz)));
      if (prev !== null) chi += 0.5 * (g + prev) * u1 / n;
      prev = g;
    }
    var DH = CKMS / H0, DM, wrapped = false;
    if (ok > 1e-6) DM = DH / Math.sqrt(ok) * Math.sinh(Math.sqrt(ok) * chi / DH);
    else if (ok < -1e-6) {
      var arg = Math.sqrt(-ok) * chi / DH;
      wrapped = arg > Math.PI * 0.95;
      DM = DH / Math.sqrt(-ok) * Math.sin(Math.min(arg, Math.PI * 0.95));
    } else DM = chi;

    // age: t0 = ∫ d ln a / H, converted from Mpc s/km to Gyr
    var age = 0; prev = null;
    for (i = 0; i <= n; i++) {
      var lb = la0 * (1 - i / n), ab = Math.exp(lb);
      var q = 1 / (H0 * Math.sqrt(E2(1 / ab - 1)));
      if (prev !== null) age += 0.5 * (q + prev) * (-la0) / n;
      prev = q;
    }
    age *= 977.792;

    var kD = 1.6 * Math.pow(wb, 0.52) * Math.pow(wm, 0.73) * (1 + Math.pow(10.4 * wm, -0.95));
    var keq = 0.0746 * wm;
    return { bounce: false, wrapped: wrapped, zs: zs, rs: rs, DM: DM, lA: Math.PI * DM / rs,
             Rs: R_COEF * wb / (1 + zs), lD: kD * DM, leq: keq * DM, ok: ok, om: om, age: age };
  }

  // ---- spectrum ----------------------------------------------------------
  function spectrum(p, b) {
    var D = new Float64Array(LMAX + 1);
    var R = K.load * b.Rs;
    for (var l = 2; l <= LMAX; l++) {
      var q = l / b.leq, f = q * q / (1 + q * q), pot = 1 / (1 + K.pot * q * q);
      var x = Math.PI * l / b.lA + Math.PI * (K.phi0 + K.phi1 * f);
      var Aosc = (1 / 3 + R) * Math.pow(1 + R, -0.25) * (1 + K.drive * f);
      var w = 1 - Math.exp(-Math.pow(l / K.lsw, 2));           // Sachs–Wolfe plateau at low ℓ
      var T0 = w * (Aosc * Math.cos(x) - R * pot) + (1 - w) / 3;  // monopole (+ potential)
      var T1 = w * K.dop * Aosc / Math.sqrt(3 * (1 + R)) * Math.sin(x); // Doppler
      var damp = Math.exp(-Math.pow(l / (K.dscale * b.lD), K.dexp));
      D[l] = K.amp * Math.pow(l / 700, p.ns - 1) * (T0 * T0 + T1 * T1) * damp;
    }
    return D;
  }

  function peaks(D) {
    var out = [];
    for (var l = 30; l < LMAX && out.length < 3; l++) if (D[l] > D[l - 1] && D[l] >= D[l + 1]) out.push(l);
    return out;
  }

  // ---- sky map (flat patch, Gaussian random field) ------------------------
  var NMAP = 256, PATCH_DEG = 20, LRAD = PATCH_DEG * Math.PI / 180;
  var noiseRe = new Float64Array(NMAP * NMAP), noiseIm = new Float64Array(NMAP * NMAP);
  (function () {
    var r = S.rng(20260101);
    for (var i = 0; i < NMAP * NMAP; i++) { noiseRe[i] = S.gaussian(r); noiseIm[i] = S.gaussian(r); }
  })();

  function fft1(re, im, off, stride, n, inv) {
    // in-place iterative radix-2 FFT on a strided line
    for (var i = 1, j = 0; i < n; i++) {
      var bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        var a = off + i * stride, b = off + j * stride, t;
        t = re[a]; re[a] = re[b]; re[b] = t; t = im[a]; im[a] = im[b]; im[b] = t;
      }
    }
    for (var len = 2; len <= n; len <<= 1) {
      var ang = (inv ? 2 : -2) * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (i = 0; i < n; i += len) {
        var cr = 1, ci = 0;
        for (var k = 0; k < len / 2; k++) {
          var p = off + (i + k) * stride, q = off + (i + k + len / 2) * stride;
          var xr = re[q] * cr - im[q] * ci, xi = re[q] * ci + im[q] * cr;
          re[q] = re[p] - xr; im[q] = im[p] - xi; re[p] += xr; im[p] += xi;
          var ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
        }
      }
    }
  }

  function skyMap(D) {
    var re = new Float64Array(NMAP * NMAP), im = new Float64Array(NMAP * NMAP);
    for (var j = 0; j < NMAP; j++) {
      var fy = j < NMAP / 2 ? j : j - NMAP;
      for (var i = 0; i < NMAP; i++) {
        var fx = i < NMAP / 2 ? i : i - NMAP;
        var l = 2 * Math.PI * Math.sqrt(fx * fx + fy * fy) / LRAD;
        var amp = 0;
        if (l >= 2 && l < LMAX) {
          var l0 = Math.floor(l), t = l - l0;
          var Dl = D[l0] * (1 - t) + D[l0 + 1] * t;
          var Cl = 2 * Math.PI * Dl / (l * (l + 1));
          amp = Math.sqrt(Cl) / LRAD;     // <|a_k|²> = C_ℓ / area
        }
        var idx = j * NMAP + i;
        re[idx] = noiseRe[idx] * amp; im[idx] = noiseIm[idx] * amp;
      }
    }
    for (j = 0; j < NMAP; j++) fft1(re, im, j * NMAP, 1, NMAP, true);
    for (i = 0; i < NMAP; i++) fft1(re, im, i, NMAP, NMAP, true);
    return re; // real part, in μK
  }

  // Planck-like diverging colormap: cold blue, pale, hot red
  var CMAP = [[0, [12, 30, 110]], [0.2, [40, 110, 210]], [0.4, [150, 205, 240]], [0.5, [246, 242, 228]],
              [0.6, [250, 205, 110]], [0.8, [228, 90, 40]], [1, [120, 12, 12]]];
  var LUT = new Uint8ClampedArray(256 * 3);
  (function () {
    for (var i = 0; i < 256; i++) {
      var t = i / 255, k = 1;
      while (k < CMAP.length - 1 && CMAP[k][0] < t) k++;
      var a = CMAP[k - 1], b = CMAP[k], u = (t - a[0]) / (b[0] - a[0]);
      for (var c = 0; c < 3; c++) LUT[3 * i + c] = a[1][c] + (b[1][c] - a[1][c]) * u;
    }
  })();
  var SCALE_UK = 300;

  var mapImg = document.createElement("canvas");
  mapImg.width = NMAP; mapImg.height = NMAP;
  var mapCtx = mapImg.getContext("2d");
  var imgData = mapCtx.createImageData(NMAP, NMAP);

  function paintMap(T) {
    var d = imgData.data;
    for (var i = 0; i < NMAP * NMAP; i++) {
      var t = Math.max(0, Math.min(255, Math.round(127.5 + 127.5 * T[i] / SCALE_UK)));
      d[4 * i] = LUT[3 * t]; d[4 * i + 1] = LUT[3 * t + 1]; d[4 * i + 2] = LUT[3 * t + 2]; d[4 * i + 3] = 255;
    }
    mapCtx.putImageData(imgData, 0, 0);
  }

  // ---- drawing -----------------------------------------------------------
  var C = S.colors();
  var mw = 0, mh = 0, pw = 0, ph = 0;
  var mctx = S.fitCanvas($("map"), 0.9, function (w, h) { mw = w; mh = h; drawMap(); });
  var pctx = S.fitCanvas($("plot"), 0.9, function (w, h) { pw = w; ph = h; drawPlot(); });
  var current = null, reference = null, hoverL = null;

  function drawMap() {
    if (!mw) return;
    mctx.fillStyle = "#05070d";
    mctx.fillRect(0, 0, mw, mh);
    if (!current || current.b.bounce) return;
    mctx.imageSmoothingEnabled = true;
    var bar = 48, size = Math.min(mw, mh - bar);
    var ox = (mw - size) / 2;
    mctx.drawImage(mapImg, ox, 0, size, size);
    // color bar
    var y0 = size + 10, bw = Math.min(220, mw - 120), bx = (mw - bw) / 2;
    for (var i = 0; i < bw; i++) {
      var t = Math.round(255 * i / (bw - 1));
      mctx.fillStyle = "rgb(" + LUT[3 * t] + "," + LUT[3 * t + 1] + "," + LUT[3 * t + 2] + ")";
      mctx.fillRect(bx + i, y0, 1, 8);
    }
    mctx.fillStyle = "#c9cfdb";
    mctx.font = "11px system-ui, sans-serif";
    mctx.textAlign = "right"; mctx.fillText("−" + SCALE_UK + " μK", bx - 6, y0 + 8);
    mctx.textAlign = "left"; mctx.fillText("+" + SCALE_UK + " μK", bx + bw + 6, y0 + 8);
    mctx.textAlign = "center"; mctx.fillText(PATCH_DEG + "° × " + PATCH_DEG + "° patch of sky", mw / 2, y0 + 24);
    mctx.textAlign = "left";
  }

  function drawPlot() {
    if (!pw) return;
    var ctx = pctx, w = pw, h = ph;
    var m = { l: 52, r: 22, t: 30, b: 40 }, iw = w - m.l - m.r, ih = h - m.t - m.b;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
    var D = current && !current.b.bounce ? current.D : null;
    var ymax = 6500;
    if (D) for (var l = 2; l <= LMAX; l++) ymax = Math.max(ymax, D[l] * 1.08);
    var X = function (l) { return m.l + iw * (l - 2) / (LMAX - 2); };
    var Y = function (v) { return m.t + ih * (1 - v / ymax); };

    ctx.font = "11px system-ui, sans-serif"; ctx.lineWidth = 1;
    ctx.strokeStyle = C.grid; ctx.fillStyle = C.muted; ctx.textAlign = "center";
    [2, 500, 1000, 1500, 2000, 2500].forEach(function (l) {
      ctx.beginPath(); ctx.moveTo(X(l), m.t); ctx.lineTo(X(l), m.t + ih); ctx.stroke();
      ctx.fillText(String(l), X(l), m.t + ih + 15);
    });
    var ystep = ymax > 15000 ? 5000 : ymax > 8000 ? 2000 : 1000;
    ctx.textAlign = "right";
    for (var v = 0; v <= ymax; v += ystep) {
      ctx.beginPath(); ctx.moveTo(m.l, Y(v)); ctx.lineTo(m.l + iw, Y(v)); ctx.stroke();
      ctx.fillText(String(v), m.l - 6, Y(v) + 4);
    }
    ctx.textAlign = "left";
    ctx.fillText("Dℓ = ℓ(ℓ+1)Cℓ / 2π   (μK²)", m.l, m.t - 12);
    ctx.textAlign = "right";
    ctx.fillText("multipole ℓ", m.l + iw, m.t + ih + 32);

    function line(arr, color, dash, width) {
      ctx.strokeStyle = color; ctx.setLineDash(dash); ctx.lineWidth = width;
      ctx.beginPath();
      for (var l = 2; l <= LMAX; l += 2) { if (l === 2) ctx.moveTo(X(l), Y(arr[l])); else ctx.lineTo(X(l), Y(arr[l])); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    if (reference && $("ref").checked) line(reference, C.muted, [5, 4], 1.5);
    if (D) line(D, C.accent, [], 2);

    if (D && hoverL) {
      var hy = Y(D[hoverL]);
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(hoverL), m.t); ctx.lineTo(X(hoverL), m.t + ih); ctx.stroke();
      ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(X(hoverL), hy, 3.5, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = C.text; ctx.textAlign = X(hoverL) > m.l + iw * 0.7 ? "right" : "left";
      var pad = ctx.textAlign === "left" ? 8 : -8;
      ctx.fillText("ℓ = " + hoverL + ",  Dℓ = " + Math.round(D[hoverL]) + " μK²", X(hoverL) + pad, m.t + 14);
      ctx.textAlign = "left";
    }
    if (reference && $("ref").checked) {
      ctx.fillStyle = C.muted; ctx.textAlign = "right";
      ctx.fillText("dashed: Planck 2018 values", m.l + iw, m.t + (hoverL ? 30 : 14));
      ctx.textAlign = "left";
    }
    plotGeom = { m: m, iw: iw };
  }
  var plotGeom = null;

  $("plot").addEventListener("pointermove", function (ev) {
    if (!plotGeom) return;
    var p = S.pointer($("plot"), ev);
    var l = Math.round(2 + (p.x - plotGeom.m.l) / plotGeom.iw * (LMAX - 2));
    hoverL = l >= 2 && l <= LMAX ? l : null;
    drawPlot();
  });
  $("plot").addEventListener("pointerleave", function () { hoverL = null; drawPlot(); });

  // ---- UI ----------------------------------------------------------------
  var fields = ["ob", "oc", "ol", "h", "ns"];
  function params() {
    var p = {};
    fields.forEach(function (f) { p[f] = parseFloat($(f).value); });
    return p;
  }

  var pending = false;
  function update() {
    fields.forEach(function (f) { $(f + "-out").textContent = parseFloat($(f).value).toFixed(f === "ob" ? 3 : f === "ns" ? 3 : 2); });
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      var p = params(), b = background(p);
      var alert = $("alert");
      if (b.bounce) {
        current = { b: b };
        alert.hidden = false;
        alert.textContent = "With this much dark energy and this little matter, the expansion would have turned around before recombination: there is no hot Big Bang to produce a CMB. Lower ΩΛ or add matter.";
      } else {
        var D = spectrum(p, b);
        current = { b: b, D: D };
        paintMap(skyMap(D));
        alert.hidden = !b.wrapped;
        alert.textContent = "This closed universe is so small that light from last scattering has wrapped most of the way around it; the model is not reliable here.";
      }
      readout(p, b);
      drawMap(); drawPlot();
    });
  }

  function readout(p, b) {
    var geom = Math.abs(b.ok) < 0.005 ? "flat" : b.ok > 0 ? "open" : "closed";
    $("r-ok").textContent = (b.ok >= 0 ? "+" : "−") + Math.abs(b.ok).toFixed(3) + " (" + geom + ")";
    $("r-om").textContent = b.om.toFixed(3);
    if (b.bounce) {
      ["r-age", "r-zs", "r-rs", "r-theta", "r-peak", "r-ratio"].forEach(function (k) { $(k).textContent = "–"; });
      return;
    }
    $("r-age").textContent = b.age.toFixed(2) + " Gyr";
    $("r-zs").textContent = b.zs.toFixed(0);
    $("r-rs").textContent = b.rs.toFixed(1) + " Mpc";
    $("r-theta").textContent = (100 * b.rs / b.DM).toFixed(4);
    var pk = peaks(current.D);
    $("r-peak").textContent = pk.length ? pk.join(", ") : "–";
    $("r-ratio").textContent = pk.length >= 2 ? (current.D[pk[0]] / current.D[pk[1]]).toFixed(2) : "–";
  }

  function setParams(p) {
    fields.forEach(function (f) { if (p[f] !== undefined) $(f).value = p[f]; });
    update();
  }

  fields.forEach(function (f) { $(f).addEventListener("input", update); });
  $("ref").addEventListener("change", drawPlot);
  $("flat").addEventListener("click", function () {
    var p = params();
    var ol = 1 - p.ob - p.oc - OMEGA_R_H2 / (p.h * p.h);
    $("ol").value = Math.max(0, Math.min(parseFloat($("ol").max), ol));
    update();
  });
  root.querySelectorAll("[data-preset]").forEach(function (btn) {
    btn.addEventListener("click", function () { setParams(JSON.parse(btn.getAttribute("data-preset"))); });
  });
  S.onThemeChange(function (c) { C = c; drawPlot(); });

  reference = spectrum(PLANCK, background(PLANCK));
  setParams(PLANCK);
})();
