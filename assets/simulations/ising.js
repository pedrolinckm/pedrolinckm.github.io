/* 2D Ising model on an L×L square lattice with periodic boundaries.
 * H = -J Σ_<ij> s_i s_j - h Σ_i s_i, with J = k_B = 1.
 * Dynamics: single-spin Metropolis or Wolff cluster updates.
 * The temperature scan compares with Onsager's exact solution.
 */
(function () {
  "use strict";
  var root = document.getElementById("ising");
  if (!root || !window.Sim) return;
  var S = window.Sim;
  var $ = function (role) { return root.querySelector('[data-role="' + role + '"]'); };

  var TC = 2 / Math.log(1 + Math.SQRT2);

  // ---- fast random numbers (xorshift32) ----------------------------------
  var rs = ((Math.random() * 4294967296) >>> 0) || 1;
  function rnd() {
    rs ^= rs << 13; rs ^= rs >>> 17; rs ^= rs << 5;
    return (rs >>> 0) / 4294967296;
  }

  // ---- lattice -----------------------------------------------------------
  var L = 0, N = 0, spin, nbr, mark, queue, gen = 0;
  var T = TC, h = 0, beta = 1 / T, padd = 0;
  var prob = new Float64Array(10);
  var algo = "metropolis";

  function alloc(newL) {
    L = newL; N = L * L;
    spin = new Int8Array(N);
    nbr = new Int32Array(4 * N);
    mark = new Int32Array(N);
    queue = new Int32Array(N);
    gen = 0;
    for (var y = 0; y < L; y++) for (var x = 0; x < L; x++) {
      var i = y * L + x;
      nbr[4 * i] = y * L + (x + 1) % L;
      nbr[4 * i + 1] = y * L + (x + L - 1) % L;
      nbr[4 * i + 2] = ((y + 1) % L) * L + x;
      nbr[4 * i + 3] = ((y + L - 1) % L) * L + x;
    }
    off.width = L; off.height = L;
    img = offCtx.createImageData(L, L);
    pix = new Uint32Array(img.data.buffer);
  }

  function hotStart() { for (var i = 0; i < N; i++) spin[i] = rnd() < 0.5 ? 1 : -1; resetSeries(); }
  function coldStart() { spin.fill(1); resetSeries(); }

  function setParams() {
    beta = 1 / T;
    padd = 1 - Math.exp(-2 * beta);
    // flipping s with neighbour sum Σ costs ΔE = 2 s (Σ + h)
    for (var si = 0; si < 2; si++) for (var k = 0; k < 5; k++) {
      var s = si ? 1 : -1, sum = 2 * k - 4;
      prob[si * 5 + k] = Math.min(1, Math.exp(-2 * beta * s * (sum + h)));
    }
  }

  function metropolisSweep() {
    for (var n = 0; n < N; n++) {
      var i = (rnd() * N) | 0, s = spin[i], b = 4 * i;
      var sum = spin[nbr[b]] + spin[nbr[b + 1]] + spin[nbr[b + 2]] + spin[nbr[b + 3]];
      var p = prob[(s > 0 ? 5 : 0) + ((sum + 4) >> 1)];
      if (p >= 1 || rnd() < p) spin[i] = -s;
    }
  }

  var clusterAvg = 0;
  /* Grows one Wolff cluster; flips it (accepted with the field weight if h ≠ 0).
   * Returns the cluster size. */
  function wolffCluster() {
    var i0 = (rnd() * N) | 0, s = spin[i0];
    gen++;
    mark[i0] = gen; queue[0] = i0;
    var head = 0, tail = 1;
    while (head < tail) {
      var b = 4 * queue[head++];
      for (var k = 0; k < 4; k++) {
        var j = nbr[b + k];
        if (mark[j] !== gen && spin[j] === s && rnd() < padd) { mark[j] = gen; queue[tail++] = j; }
      }
    }
    if (h === 0 || rnd() < Math.exp(-2 * beta * h * s * tail)) {
      for (var q = 0; q < tail; q++) spin[queue[q]] = -s;
    }
    clusterAvg = clusterAvg ? 0.97 * clusterAvg + 0.03 * tail : tail;
    return tail;
  }

  /* One sweep: N single-spin attempts, or Wolff clusters until N spins were visited. */
  function sweep(method) {
    if (method === "wolff") { var done = 0; while (done < N) done += wolffCluster(); }
    else metropolisSweep();
    sweeps++;
  }

  function measure() {
    var M = 0, E = 0;
    for (var i = 0; i < N; i++) {
      var s = spin[i];
      M += s;
      E -= s * (spin[nbr[4 * i]] + spin[nbr[4 * i + 2]]);
    }
    return { m: M / N, e: E / N - h * M / N };
  }

  // ---- exact results (h = 0) ---------------------------------------------
  function agm(a, b) {
    for (var k = 0; k < 40 && Math.abs(a - b) > 1e-15; k++) { var a2 = 0.5 * (a + b); b = Math.sqrt(a * b); a = a2; }
    return a;
  }
  function exactM(t) { return t >= TC ? 0 : Math.pow(1 - Math.pow(Math.sinh(2 / t), -4), 0.125); }
  function exactE(t) {
    var b = 1 / t, k = 2 * Math.sinh(2 * b) / Math.pow(Math.cosh(2 * b), 2);
    var kp = Math.sqrt(Math.max(0, 1 - k * k)), th = Math.tanh(2 * b);
    var K = kp < 1e-12 ? 0 : Math.PI / (2 * agm(1, kp));
    return -(1 / th) * (1 + (2 / Math.PI) * (2 * th * th - 1) * K);
  }

  // ---- drawing: lattice --------------------------------------------------
  var C = S.colors();
  var off = document.createElement("canvas"), offCtx = off.getContext("2d"), img, pix;
  var upCol = 0, downCol = 0;
  function rgbaInt(css, fallback) {
    var m = /^#([0-9a-f]{6})$/i.exec(css.trim());
    var n = m ? parseInt(m[1], 16) : fallback;
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }
  function themeColors() {
    upCol = rgbaInt(C.accent, 0x2e44c4);
    downCol = C.dark ? rgbaInt("#1c2336", 0x1c2336) : rgbaInt("#e9ecf3", 0xe9ecf3);
  }

  var lw = 0, lh = 0, pw = 0, ph = 0;
  var lctx = S.fitCanvas($("lattice"), 1, function (w, hh) { lw = w; lh = hh; drawLattice(); });
  var pctx = S.fitCanvas($("plot"), 0.9, function (w, hh) { pw = w; ph = hh; drawPlot(); });

  function drawLattice() {
    if (!lw || !pix) return;
    for (var i = 0; i < N; i++) pix[i] = spin[i] > 0 ? upCol : downCol;
    offCtx.putImageData(img, 0, 0);
    lctx.imageSmoothingEnabled = false;
    lctx.drawImage(off, 0, 0, lw, lh);
  }

  // ---- drawing: plots ----------------------------------------------------
  function axes(box, xr, yr, xt, yt, xlabel, ylabel) {
    var ctx = pctx;
    var X = function (v) { return box.x + box.w * (v - xr[0]) / (xr[1] - xr[0]); };
    var Y = function (v) { return box.y + box.h * (1 - (v - yr[0]) / (yr[1] - yr[0])); };
    ctx.font = "11px system-ui, sans-serif";
    ctx.lineWidth = 1; ctx.strokeStyle = C.grid; ctx.fillStyle = C.muted;
    ctx.textAlign = "center";
    xt.forEach(function (v) {
      ctx.beginPath(); ctx.moveTo(X(v), box.y); ctx.lineTo(X(v), box.y + box.h); ctx.stroke();
      if (xlabel !== null) ctx.fillText(fmtTick(v), X(v), box.y + box.h + 14);
    });
    ctx.textAlign = "right";
    yt.forEach(function (v) {
      ctx.beginPath(); ctx.moveTo(box.x, Y(v)); ctx.lineTo(box.x + box.w, Y(v)); ctx.stroke();
      ctx.fillText(fmtTick(v), box.x - 6, Y(v) + 4);
    });
    ctx.textAlign = "left";
    ctx.fillText(ylabel, box.x, box.y - 7);
    if (xlabel) { ctx.textAlign = "right"; ctx.fillText(xlabel, box.x + box.w, box.y + box.h + 28); ctx.textAlign = "left"; }
    return { X: X, Y: Y };
  }
  function fmtTick(v) { return Math.abs(v) < 1e-9 ? "0" : String(+v.toPrecision(3)); }
  function ticks(a, b, n) {
    var raw = (b - a) / n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    var step = (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p, out = [];
    for (var v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function line(map, xs, ys, color, width, dash, alpha) {
    var ctx = pctx;
    ctx.strokeStyle = color; ctx.lineWidth = width || 1.5; ctx.setLineDash(dash || []);
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.beginPath();
    var started = false;
    for (var k = 0; k < xs.length; k++) {
      if (!isFinite(ys[k])) { started = false; continue; }
      if (!started) { ctx.moveTo(map.X(xs[k]), map.Y(ys[k])); started = true; } else ctx.lineTo(map.X(xs[k]), map.Y(ys[k]));
    }
    ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  function dots(map, xs, ys, color, alpha) {
    var ctx = pctx;
    ctx.fillStyle = color; ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    for (var k = 0; k < xs.length; k++) {
      if (!isFinite(ys[k])) continue;
      ctx.beginPath(); ctx.arc(map.X(xs[k]), map.Y(ys[k]), 2.6, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function vline(map, x, box, color, label) {
    var ctx = pctx;
    ctx.strokeStyle = color; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(map.X(x), box.y); ctx.lineTo(map.X(x), box.y + box.h); ctx.stroke(); ctx.setLineDash([]);
    if (label) { ctx.fillStyle = color; ctx.textAlign = "left"; ctx.fillText(label, map.X(x) + 4, box.y + 12); }
  }

  // time series
  var NS = 400, ser = { m: new Float32Array(NS), e: new Float32Array(NS), n: 0, head: 0 };
  function resetSeries() { ser.n = 0; ser.head = 0; sweeps = 0; }
  function pushSeries(m, e) {
    ser.m[ser.head] = m; ser.e[ser.head] = e;
    ser.head = (ser.head + 1) % NS; ser.n = Math.min(NS, ser.n + 1);
  }

  function boxes() {
    var m = { l: 46, r: 14 }, top = 24, gap = 46, bottom = 34;
    var hh = (ph - top - gap - bottom) / 2;
    return [{ x: m.l, y: top, w: pw - m.l - m.r, h: hh }, { x: m.l, y: top + hh + gap, w: pw - m.l - m.r, h: hh }];
  }

  function drawPlot() {
    if (!pw) return;
    pctx.fillStyle = C.bg; pctx.fillRect(0, 0, pw, ph);
    if ($("plotmode").value === "scan") drawScan(); else drawSeries();
  }

  function drawSeries() {
    var bx = boxes(), xs = [], ms = [], es = [];
    for (var k = 0; k < ser.n; k++) {
      var idx = (ser.head - ser.n + k + NS) % NS;
      xs.push(k); ms.push(ser.m[idx]); es.push(ser.e[idx]);
    }
    var xr = [0, NS - 1];
    var a = axes(bx[0], xr, [-1, 1], [], [-1, -0.5, 0, 0.5, 1], null, "magnetization per spin m");
    if (h === 0 && T < TC) {
      var ms0 = exactM(T);
      line(a, xr, [ms0, ms0], C.muted, 1, [5, 4]); line(a, xr, [-ms0, -ms0], C.muted, 1, [5, 4]);
      pctx.fillStyle = C.muted; pctx.textAlign = "right";
      pctx.fillText("±m from Onsager", bx[0].x + bx[0].w - 4, a.Y(ms0) - 5); pctx.textAlign = "left";
    }
    line(a, xs, ms, C.accent, 1.6);
    var lo = Math.min(-2 - Math.abs(h), Math.min.apply(null, es.length ? es : [0]) - 0.05);
    var b = axes(bx[1], xr, [lo, 0], [], ticks(lo, 0, 4), "time →", "energy per spin e");
    if (h === 0) { var e0 = exactE(T); line(b, xr, [e0, e0], C.muted, 1, [5, 4]); }
    line(b, xs, es, C.text, 1.4);
    if (h === 0) {
      pctx.fillStyle = C.muted; pctx.textAlign = "left";
      pctx.fillText("dashed: exact values, infinite lattice", bx[1].x, bx[1].y + bx[1].h + 28);
    }
  }

  // ---- temperature scan --------------------------------------------------
  var scans = [], scan = null;
  function scanTemps() {
    var out = [], t;
    for (t = 3.6; t > 2.6 + 1e-9; t -= 0.1) out.push(+t.toFixed(3));
    for (t = 2.6; t > 2.0 + 1e-9; t -= 0.025) out.push(+t.toFixed(3));
    for (t = 2.0; t >= 1.0 - 1e-9; t -= 0.1) out.push(+t.toFixed(3));
    return out;
  }

  function startScan() {
    h = 0; $("h").value = 0; $("h-out").textContent = "0.00";
    $("plotmode").value = "scan"; syncPlotMode();
    var temps = scanTemps();
    scan = { L: L, temps: temps, k: 0, phase: 0, count: 0, acc: null, pts: [] };
    scans.push(scan);
    if (scans.length > 4) scans.shift();
    hotStart();
    setT(temps[0]);
    $("T").disabled = true; $("h").disabled = true;
    $("scan").textContent = "Stop scan";
    $("scan-status").hidden = false;
  }
  function stopScan() {
    scan = null;
    $("T").disabled = false; $("h").disabled = false;
    $("scan").textContent = "Run temperature scan";
    $("scan-status").hidden = true;
  }

  var EQ = 60, MEAS = 220;
  function scanWork(budgetMs) {
    var t0 = performance.now();
    while (scan && performance.now() - t0 < budgetMs) {
      sweep("wolff");
      if (scan.phase === 0) {
        if (++scan.count >= EQ) { scan.phase = 1; scan.count = 0; scan.acc = { am: 0, m2: 0, e: 0, e2: 0 }; }
        continue;
      }
      var r = measure(), am = Math.abs(r.m);
      scan.acc.am += am; scan.acc.m2 += r.m * r.m; scan.acc.e += r.e; scan.acc.e2 += r.e * r.e;
      if (++scan.count >= MEAS) {
        var a = scan.acc, n = MEAS, Tk = scan.temps[scan.k];
        var mAbs = a.am / n, e = a.e / n;
        scan.pts.push({ T: Tk, m: mAbs, e: e,
          chi: N / Tk * (a.m2 / n - mAbs * mAbs),
          c: N / (Tk * Tk) * (a.e2 / n - e * e) });
        scan.k++;
        if (scan.k >= scan.temps.length) { scan.done = true; stopScan(); break; }
        setT(scan.temps[scan.k]);
        scan.phase = 0; scan.count = 0;
      }
    }
    if (scan) {
      $("scan-status").textContent = "Scanning at T = " + T.toFixed(3) + " (" + (scan.k + 1) + " of " + scan.temps.length + ")";
    }
  }

  function drawScan() {
    var bx = boxes(), xr = [0.9, 3.7], xt = [1, 1.5, 2, 2.5, 3, 3.5];
    var a = axes(bx[0], xr, [0, 1.05], xt, [0, 0.25, 0.5, 0.75, 1], null, "⟨|m|⟩");
    var xsEx = [], ysEx = [];
    for (var t = 0.9; t <= 3.7; t += 0.005) { xsEx.push(t); ysEx.push(exactM(t)); }
    line(a, xsEx, ysEx, C.muted, 1.4, [5, 4]);
    vline(a, TC, bx[0], C.muted, "Tc");

    var q = $("quantity").value;
    var label = { chi: "susceptibility per spin χ", c: "specific heat per spin c", e: "energy per spin e" }[q];
    var all = [];
    scans.forEach(function (s) { s.pts.forEach(function (p) { all.push(p[q]); }); });
    var yr = q === "e" ? [-2.05, 0] : [0, Math.max(q === "c" ? 2 : 10, Math.max.apply(null, all.length ? all : [0]) * 1.1)];
    var b = axes(bx[1], xr, yr, xt, ticks(yr[0], yr[1], 4), "temperature T", label);
    if (q === "e") {
      var es = xsEx.map(exactE);
      line(b, xsEx, es, C.muted, 1.4, [5, 4]);
    }
    vline(b, TC, bx[1], C.muted, "");

    var legend = [];
    scans.forEach(function (s, idx) {
      var latest = idx === scans.length - 1;
      var col = latest ? C.accent : C.text, alpha = latest ? 1 : 0.25 + 0.15 * idx;
      var xs = s.pts.map(function (p) { return p.T; });
      line(a, xs, s.pts.map(function (p) { return p.m; }), col, 1.4, [], alpha);
      dots(a, xs, s.pts.map(function (p) { return p.m; }), col, alpha);
      line(b, xs, s.pts.map(function (p) { return p[q]; }), col, 1.4, [], alpha);
      dots(b, xs, s.pts.map(function (p) { return p[q]; }), col, alpha);
      legend.push({ text: "L = " + s.L, col: col, alpha: alpha });
    });
    var ctx = pctx, y = bx[0].y + 14;
    ctx.textAlign = "right";
    legend.reverse().forEach(function (g) {
      ctx.globalAlpha = g.alpha; ctx.fillStyle = g.col;
      ctx.fillText(g.text, bx[0].x + bx[0].w - 4, y); y += 14;
    });
    ctx.globalAlpha = 1; ctx.fillStyle = C.muted;
    ctx.fillText(scans.length ? "dashed: Onsager, infinite lattice" : "Press “Run temperature scan” to fill this plot", bx[0].x + bx[0].w - 4, y);
    ctx.textAlign = "left";
  }

  // ---- loop --------------------------------------------------------------
  var running = !S.reducedMotion, perFrame = 2, sweeps = 0, frame = 0, swCount = 0, swT0 = performance.now(), swRate = 0;
  function loop() {
    if (running) {
      var before = sweeps;
      if (scan) scanWork(14);
      else {
        var t0 = performance.now();
        for (var k = 0; k < perFrame && performance.now() - t0 < 25; k++) sweep(algo);
        var r = measure();
        pushSeries(r.m, r.e);
      }
      swCount += sweeps - before;
      drawLattice();
      if (frame % 2 === 0) drawPlot();
    }
    if (++frame % 8 === 0) readout();
    requestAnimationFrame(loop);
  }

  function readout() {
    var now = performance.now();
    if (now - swT0 > 500) { swRate = swCount * 1000 / (now - swT0); swCount = 0; swT0 = now; }
    var r = measure();
    $("r-t").textContent = (T / TC).toFixed(3);
    $("r-m").textContent = r.m.toFixed(3);
    $("r-e").textContent = r.e.toFixed(3);
    $("r-sweeps").textContent = sweeps.toLocaleString("en-US");
    $("r-rate").textContent = running ? Math.round(swRate) + " /s" : "paused";
    $("r-cluster").textContent = (algo === "wolff" || scan) && clusterAvg ? Math.round(clusterAvg).toLocaleString("en-US") + " spins" : "–";
  }

  function setT(v) {
    T = v; setParams();
    $("T").value = v; $("T-out").textContent = v.toFixed(3);
  }

  // ---- interaction -------------------------------------------------------
  var painting = false;
  function paint(ev) {
    var p = S.pointer($("lattice"), ev);
    var cx = Math.floor(p.x / lw * L), cy = Math.floor(p.y / lh * L);
    var r = Math.max(1, Math.round(L / 28)), val = $("brush").value === "down" ? -1 : 1;
    for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      var x = (cx + dx + L) % L, y = (cy + dy + L) % L;
      spin[y * L + x] = val;
    }
    drawLattice();
  }
  $("lattice").addEventListener("pointerdown", function (ev) { painting = true; $("lattice").setPointerCapture(ev.pointerId); paint(ev); });
  $("lattice").addEventListener("pointermove", function (ev) { if (painting) paint(ev); });
  window.addEventListener("pointerup", function () { painting = false; });

  function setRunning(on) { running = on; $("play").textContent = running ? "Pause" : "Play"; readout(); }
  $("play").addEventListener("click", function () { setRunning(!running); });
  $("hot").addEventListener("click", function () { hotStart(); drawLattice(); drawPlot(); });
  $("cold").addEventListener("click", function () { coldStart(); drawLattice(); drawPlot(); });
  $("tc").addEventListener("click", function () { if (!scan) setT(TC); });
  $("T").addEventListener("input", function () { setT(parseFloat($("T").value)); });
  S.bindRange($("h"), $("h-out"), function (v) { return v.toFixed(2); }, function (v) { h = v; setParams(); });
  S.bindRange($("speed"), $("speed-out"), function (v) { return v + " per frame"; }, function (v) { perFrame = v; });
  $("algo").addEventListener("change", function () { algo = $("algo").value; clusterAvg = 0; });
  $("size").addEventListener("change", function () {
    if (scan) stopScan();
    alloc(parseInt($("size").value, 10)); hotStart(); drawLattice(); drawPlot();
  });
  function syncPlotMode() { $("quantity-field").hidden = $("plotmode").value !== "scan"; }
  $("plotmode").addEventListener("change", function () { syncPlotMode(); drawPlot(); });
  $("quantity").addEventListener("change", drawPlot);
  $("scan").addEventListener("click", function () {
    if (scan) stopScan(); else { startScan(); if (!running) setRunning(true); }
  });
  $("clear-scans").addEventListener("click", function () { if (scan) stopScan(); scans = []; drawPlot(); });
  S.onThemeChange(function (c) { C = c; themeColors(); drawLattice(); drawPlot(); });

  // ---- start -------------------------------------------------------------
  themeColors();
  alloc(parseInt($("size").value, 10));
  hotStart();
  setT(TC);
  syncPlotMode();
  setRunning(running);
  requestAnimationFrame(loop);
})();
