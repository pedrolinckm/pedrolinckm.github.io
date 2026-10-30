/* N-body problem in 2D.
 * Softened Newtonian gravity (G = 1), integrated with kick-drift-kick leapfrog,
 * which is symplectic: the energy error stays bounded instead of drifting.
 */
(function () {
  "use strict";
  var root = document.getElementById("nbody");
  if (!root || !window.Sim) return;
  var S = window.Sim;
  var $ = function (role) { return root.querySelector('[data-role="' + role + '"]'); };

  var canvas = $("canvas");
  var C = S.colors();
  var W = 0, H = 0;
  var ctx = S.fitCanvas(canvas, 16 / 10, function (w, h) { W = w; H = h; draw(); });

  // ---- state -------------------------------------------------------------
  var N = 0, CAP = 1024, TRAIL = 90;
  var x = new Float64Array(CAP), y = new Float64Array(CAP);
  var vx = new Float64Array(CAP), vy = new Float64Array(CAP);
  var ax = new Float64Array(CAP), ay = new Float64Array(CAP);
  var m = new Float64Array(CAP);
  var tx = new Float32Array(CAP * TRAIL), ty = new Float32Array(CAP * TRAIL);
  var trailHead = 0, trailLen = 0;

  var t = 0, E0 = 0, dt = 0.01, eps = 1, viewR = 100;
  var running = !S.reducedMotion, steps = 4, newMass = 10;
  var camX = 0, camY = 0;
  var drag = null;

  var BODY_COLORS = ["#2e44c4", "#d9480f", "#0b7a5c", "#a61e4d", "#e0a100", "#5f3dc4", "#1098ad", "#495057"];

  // ---- physics -----------------------------------------------------------
  function accelerations() {
    var e2 = eps * eps;
    for (var i = 0; i < N; i++) { ax[i] = 0; ay[i] = 0; }
    for (i = 0; i < N; i++) {
      var xi = x[i], yi = y[i], axi = 0, ayi = 0;
      for (var j = i + 1; j < N; j++) {
        var dx = x[j] - xi, dy = y[j] - yi;
        var r2 = dx * dx + dy * dy + e2;
        var inv = 1 / (r2 * Math.sqrt(r2));
        axi += m[j] * dx * inv; ayi += m[j] * dy * inv;
        ax[j] -= m[i] * dx * inv; ay[j] -= m[i] * dy * inv;
      }
      ax[i] += axi; ay[i] += ayi;
    }
  }

  function step() {
    var h = 0.5 * dt;
    for (var i = 0; i < N; i++) { vx[i] += h * ax[i]; vy[i] += h * ay[i]; x[i] += dt * vx[i]; y[i] += dt * vy[i]; }
    accelerations();
    for (i = 0; i < N; i++) { vx[i] += h * ax[i]; vy[i] += h * ay[i]; }
    t += dt;
  }

  function energy() {
    var K = 0, U = 0, e2 = eps * eps;
    for (var i = 0; i < N; i++) {
      K += 0.5 * m[i] * (vx[i] * vx[i] + vy[i] * vy[i]);
      for (var j = i + 1; j < N; j++) {
        var dx = x[j] - x[i], dy = y[j] - y[i];
        U -= m[i] * m[j] / Math.sqrt(dx * dx + dy * dy + e2);
      }
    }
    return K + U;
  }

  function centerOfMass() {
    var M = 0, cx = 0, cy = 0, px = 0, py = 0;
    for (var i = 0; i < N; i++) { M += m[i]; cx += m[i] * x[i]; cy += m[i] * y[i]; px += m[i] * vx[i]; py += m[i] * vy[i]; }
    return M > 0 ? { x: cx / M, y: cy / M, px: px, py: py, M: M } : { x: 0, y: 0, px: 0, py: 0, M: 0 };
  }

  /* Shift to the zero-momentum frame so the system does not drift away. */
  function removeDrift() {
    var c = centerOfMass();
    if (!c.M) return;
    for (var i = 0; i < N; i++) { vx[i] -= c.px / c.M; vy[i] -= c.py / c.M; x[i] -= c.x; y[i] -= c.y; }
  }

  function add(px, py, pvx, pvy, pm) {
    if (N >= CAP) return;
    x[N] = px; y[N] = py; vx[N] = pvx; vy[N] = pvy; m[N] = pm;
    for (var k = 0; k < TRAIL; k++) { tx[N * TRAIL + k] = px; ty[N * TRAIL + k] = py; }
    N++;
  }

  // ---- initial conditions ------------------------------------------------
  var rand = S.rng(7);
  var presets = {
    figure8: function () {
      // Chenciner and Montgomery (2000) choreography, G = m = 1.
      var p = [0.97000436, -0.24308753], v = [-0.93240737, -0.86473146];
      add(p[0], p[1], -v[0] / 2, -v[1] / 2, 1);
      add(-p[0], -p[1], -v[0] / 2, -v[1] / 2, 1);
      add(0, 0, v[0], v[1], 1);
      dt = 0.0025; eps = 0.0; viewR = 1.25;
    },
    solar: function () {
      var M = 1000;
      add(0, 0, 0, 0, M);
      var radii = [22, 34, 48, 66, 95, 130, 165], masses = [0.05, 0.6, 0.8, 0.1, 30, 9, 1.5];
      for (var k = 0; k < radii.length; k++) {
        var r = radii[k], th = rand() * 2 * Math.PI, v = Math.sqrt(M / r);
        add(r * Math.cos(th), r * Math.sin(th), -v * Math.sin(th), v * Math.cos(th), masses[k]);
      }
      dt = 0.01; eps = 0.2; viewR = 185;
    },
    binary: function () {
      var Ms = 500, a = 20, v = Math.sqrt(Ms / (4 * a));
      add(a, 0, 0, v, Ms); add(-a, 0, 0, -v, Ms);
      var r = 115, vp = Math.sqrt(2 * Ms / r);
      add(0, r, -vp, 0, 0.5);
      add(0, -170, 0.92 * Math.sqrt(2 * Ms / 170), 0, 0.2);
      dt = 0.006; eps = 0.2; viewR = 200;
    },
    cluster: function (n) {
      var R = 100, Mtot = 3000, mi = Mtot / n;
      for (var k = 0; k < n; k++) {
        var r = R * Math.sqrt(rand()), th = rand() * 2 * Math.PI;
        var vc = 0.55 * Math.sqrt(Mtot * r) / R;
        add(r * Math.cos(th), r * Math.sin(th),
          -vc * Math.sin(th) + 2 * S.gaussian(rand), vc * Math.cos(th) + 2 * S.gaussian(rand),
          mi * (0.4 + 1.2 * rand()));
      }
      dt = 0.01; eps = 4; viewR = 150;
    },
    galaxies: function (n) {
      function disk(cx, cy, cvx, cvy, spin, count) {
        var Mc = 800;
        add(cx, cy, cvx, cvy, Mc);
        for (var k = 0; k < count; k++) {
          var r = 12 + 45 * Math.sqrt(rand()), th = rand() * 2 * Math.PI, v = Math.sqrt(Mc / r) * spin;
          add(cx + r * Math.cos(th), cy + r * Math.sin(th), cvx - v * Math.sin(th), cvy + v * Math.cos(th), 0.02);
        }
      }
      var half = Math.max(10, Math.floor((n - 2) / 2));
      disk(-110, -35, 2.4, 0.4, 1, half);
      disk(110, 35, -2.4, -0.4, -1, half);
      dt = 0.01; eps = 1.5; viewR = 210;
    },
    empty: function () { dt = 0.01; eps = 1; viewR = 150; }
  };

  function reset() {
    N = 0; t = 0; rand = S.rng(7 + Math.floor(Math.random() * 1e6));
    var key = $("preset").value;
    presets[key](parseInt($("n").value, 10));
    $("n-field").hidden = !(key === "cluster" || key === "galaxies");
    if (key !== "figure8") removeDrift();
    accelerations();
    E0 = energy();
    camX = 0; camY = 0;
    trailLen = 0;
    draw();
  }

  // ---- drawing -----------------------------------------------------------
  function radius(mass) {
    return Math.min(16, 1.3 + 1.9 * Math.cbrt(mass / refMass()));
  }
  var _ref = 1, _refN = -1;
  function refMass() {
    if (_refN === N) return _ref;
    var arr = Array.prototype.slice.call(m, 0, N).sort(function (a, b) { return a - b; });
    _ref = arr.length ? Math.max(arr[Math.floor(arr.length / 2)], 1e-9) : 1;
    _refN = N;
    return _ref;
  }

  function colorOf(i) {
    if (N <= BODY_COLORS.length) return C.dark ? lighten(BODY_COLORS[i]) : BODY_COLORS[i];
    return m[i] > 20 * refMass() ? (C.dark ? "#ffd08a" : "#d9480f") : C.accent;
  }
  function lighten(hex) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var f = function (c) { return Math.round(c + (255 - c) * 0.35); };
    return "rgb(" + f(r) + "," + f(g) + "," + f(b) + ")";
  }

  function draw() {
    if (!W) return;
    var scale = Math.min(W, H) / (2 * viewR);
    var ox = W / 2 - camX * scale, oy = H / 2 + camY * scale;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    if ($("trails").checked && trailLen > 1) {
      ctx.lineWidth = 1;
      for (var i = 0; i < N; i++) {
        ctx.strokeStyle = colorOf(i);
        var base = i * TRAIL;
        for (var seg = 0; seg < 3; seg++) {
          ctx.globalAlpha = 0.12 + 0.16 * seg;
          ctx.beginPath();
          var from = Math.floor(seg * (trailLen - 1) / 3), to = Math.floor((seg + 1) * (trailLen - 1) / 3);
          for (var k = from; k <= to; k++) {
            var idx = base + (trailHead - trailLen + 1 + k + TRAIL) % TRAIL;
            var sx = ox + tx[idx] * scale, sy = oy - ty[idx] * scale;
            if (k === from) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
          }
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    for (i = 0; i < N; i++) {
      ctx.fillStyle = colorOf(i);
      ctx.beginPath();
      ctx.arc(ox + x[i] * scale, oy - y[i] * scale, radius(m[i]), 0, 2 * Math.PI);
      ctx.fill();
    }

    if (drag) {
      ctx.strokeStyle = C.text;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(drag.x0, drag.y0);
      ctx.lineTo(drag.x1, drag.y1);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.text;
      ctx.beginPath();
      ctx.arc(drag.x0, drag.y0, radius(newMass), 0, 2 * Math.PI);
      ctx.fill();
    }

    if (N === 0) {
      ctx.fillStyle = C.muted;
      ctx.font = "15px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Drag anywhere to launch a body", W / 2, H / 2);
      ctx.textAlign = "left";
    }
  }

  function recordTrail() {
    trailHead = (trailHead + 1) % TRAIL;
    for (var i = 0; i < N; i++) { tx[i * TRAIL + trailHead] = x[i]; ty[i * TRAIL + trailHead] = y[i]; }
    trailLen = Math.min(TRAIL, trailLen + 1);
  }

  var frame = 0;
  function updateReadout() {
    var E = energy(), c = centerOfMass();
    $("r-n").textContent = N;
    $("r-t").textContent = S.fmt(t, 1);
    $("r-e").textContent = S.fmt(E, 3);
    $("r-de").textContent = N > 1 && E0 !== 0 ? S.fmt(Math.abs((E - E0) / E0), 1) : "–";
    $("r-p").textContent = S.fmt(Math.hypot(c.px, c.py), 2);
  }

  function loop() {
    if (running && N > 0) {
      var sub = Math.max(1, Math.round(steps * (N > 150 ? 0.5 : 1)));
      for (var s = 0; s < sub; s++) step();
      if ($("follow").checked) { var c = centerOfMass(); camX = c.x; camY = c.y; }
      recordTrail();
    }
    draw();
    if (++frame % 10 === 0) updateReadout();
    requestAnimationFrame(loop);
  }

  // ---- interaction -------------------------------------------------------
  function toWorld(p) {
    var scale = Math.min(W, H) / (2 * viewR);
    return { x: camX + (p.x - W / 2) / scale, y: camY - (p.y - H / 2) / scale, scale: scale };
  }

  canvas.addEventListener("pointerdown", function (ev) {
    var p = S.pointer(canvas, ev);
    drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener("pointermove", function (ev) {
    if (!drag) return;
    var p = S.pointer(canvas, ev);
    drag.x1 = p.x; drag.y1 = p.y;
  });
  canvas.addEventListener("pointerup", function () {
    if (!drag) return;
    var a = toWorld({ x: drag.x0, y: drag.y0 }), b = toWorld({ x: drag.x1, y: drag.y1 });
    // a drag of half the view radius gives 1.5 times the typical orbital speed sqrt(GM/R)
    var vScale = Math.sqrt(Math.max(centerOfMass().M, newMass, 1) / viewR);
    var k = 3 * vScale / viewR;
    add(a.x, a.y, (b.x - a.x) * k, (b.y - a.y) * k, newMass);
    accelerations();
    E0 = energy();
    drag = null;
    updateReadout();
  });
  canvas.addEventListener("pointercancel", function () { drag = null; });
  canvas.addEventListener("wheel", function (ev) {
    ev.preventDefault();
    viewR *= Math.exp(ev.deltaY * 0.0012);
    viewR = Math.min(Math.max(viewR, 0.2), 5000);
  }, { passive: false });

  function setRunning(on) {
    running = on;
    $("play").textContent = running ? "Pause" : "Play";
  }
  $("play").addEventListener("click", function () { setRunning(!running); });
  $("reset").addEventListener("click", reset);
  $("clear").addEventListener("click", function () { N = 0; t = 0; E0 = 0; trailLen = 0; updateReadout(); });
  $("preset").addEventListener("change", reset);
  S.bindRange($("n"), $("n-out"), null);
  $("n").addEventListener("change", reset);
  S.bindRange($("speed"), $("speed-out"), function (v) { return v + "×"; }, function (v) { steps = v; });
  S.bindRange($("mass"), $("mass-out"), null, function (v) { newMass = v; });
  S.bindRange($("soft"), $("soft-out"), function (v) { return v.toFixed(1); }, function (v) {
    if (N) { eps = v; accelerations(); E0 = energy(); }
  });
  $("trails").addEventListener("change", function () { trailLen = 0; });
  S.onThemeChange(function (c) { C = c; draw(); });

  reset();
  $("soft").value = eps; $("soft-out").textContent = eps.toFixed(1);
  setRunning(running);
  updateReadout();
  requestAnimationFrame(loop);

  // reset() changes the softening per preset; keep the slider in sync
  $("preset").addEventListener("change", function () { $("soft").value = eps; $("soft-out").textContent = eps.toFixed(1); });
})();
