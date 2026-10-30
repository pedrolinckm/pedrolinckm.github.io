/* Conway's Game of Life and a few other "life-like" cellular automata.
 * A rule B.../S... says how many live neighbours give a birth (B)
 * and how many let a live cell survive (S).
 */
(function () {
  "use strict";
  var root = document.getElementById("life");
  if (!root || !window.Sim) return;
  var S = window.Sim;
  var $ = function (role) { return root.querySelector('[data-role="' + role + '"]'); };

  var canvas = $("canvas");
  var C = S.colors();
  var W = 0, H = 0, cols = 0, rows = 0, cell = 10;
  var grid = new Uint8Array(0), next = new Uint8Array(0), age = new Uint16Array(0);
  var gen = 0, running = false, gps = 15, wrap = true;
  var birth = [false, false, false, true, false, false, false, false, false];
  var survive = [false, false, true, true, false, false, false, false, false];
  var started = false;

  var ctx = S.fitCanvas(canvas, 16 / 10, function (w, h) {
    W = w; H = h;
    resizeGrid();
    if (!started) { started = true; randomize(0.2); }
    draw();
  });

  // Patterns as lists of "x,y" offsets ("O" = alive) in plaintext format.
  var PATTERNS = {
    glider: [".O.", "..O", "OOO"],
    lwss: [".O..O", "O....", "O...O", "OOOO."],
    pulsar: [
      "..OOO...OOO..", ".............", "O....O.O....O", "O....O.O....O", "O....O.O....O",
      "..OOO...OOO..", ".............", "..OOO...OOO..", "O....O.O....O", "O....O.O....O",
      "O....O.O....O", ".............", "..OOO...OOO.."],
    gun: [
      "........................O...........",
      "......................O.O...........",
      "............OO......OO............OO",
      "...........O...O....OO............OO",
      "OO........O.....O...OO..............",
      "OO........O...O.OO....O.O...........",
      "..........O.....O.......O...........",
      "...........O...O....................",
      "............OO......................"],
    rpentomino: [".OO", "OO.", ".O."],
    acorn: [".O.....", "...O...", "OO..OOO"],
    diehard: ["......O.", "OO......", ".O...OOO"],
    cell: ["O"]
  };

  function resizeGrid() {
    var nc = Math.max(10, Math.floor(W / cell)), nr = Math.max(10, Math.floor(H / cell));
    if (nc === cols && nr === rows) return;
    var old = grid, oc = cols, or = rows;
    cols = nc; rows = nr;
    grid = new Uint8Array(cols * rows); next = new Uint8Array(cols * rows); age = new Uint16Array(cols * rows);
    for (var y = 0; y < Math.min(or, rows); y++)
      for (var x = 0; x < Math.min(oc, cols); x++) grid[y * cols + x] = old[y * oc + x];
  }

  function step() {
    for (var y = 0; y < rows; y++) {
      var ym = y - 1, yp = y + 1;
      for (var x = 0; x < cols; x++) {
        var xm = x - 1, xp = x + 1, n = 0;
        if (wrap) {
          var a = (ym + rows) % rows, b = yp % rows, l = (xm + cols) % cols, r = xp % cols;
          n = grid[a * cols + l] + grid[a * cols + x] + grid[a * cols + r] +
              grid[y * cols + l] + grid[y * cols + r] +
              grid[b * cols + l] + grid[b * cols + x] + grid[b * cols + r];
        } else {
          for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            var yy = y + dy, xx = x + dx;
            if (yy >= 0 && yy < rows && xx >= 0 && xx < cols) n += grid[yy * cols + xx];
          }
        }
        var i = y * cols + x, alive = grid[i];
        var v = alive ? (survive[n] ? 1 : 0) : (birth[n] ? 1 : 0);
        next[i] = v;
        age[i] = v ? (alive ? Math.min(age[i] + 1, 60000) : 0) : 0;
      }
    }
    var tmp = grid; grid = next; next = tmp;
    gen++;
  }

  function population() { var p = 0; for (var i = 0; i < grid.length; i++) p += grid[i]; return p; }

  function draw() {
    if (!W) return;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    var showAge = $("age").checked;
    var young = C.accent, old = C.dark ? "#f0b45a" : "#d9480f";
    var gap = cell >= 6 ? 1 : 0;
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      var i = y * cols + x;
      if (!grid[i]) continue;
      ctx.fillStyle = showAge && age[i] > 8 ? old : young;
      if (showAge) ctx.globalAlpha = age[i] > 8 ? 0.9 : 1;
      ctx.fillRect(x * cell, y * cell, cell - gap, cell - gap);
    }
    ctx.globalAlpha = 1;
    if (cell >= 8 && $("grid").checked) {
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (x = 0; x <= cols; x++) { ctx.moveTo(x * cell - 0.5, 0); ctx.lineTo(x * cell - 0.5, rows * cell); }
      for (y = 0; y <= rows; y++) { ctx.moveTo(0, y * cell - 0.5); ctx.lineTo(cols * cell, y * cell - 0.5); }
      ctx.stroke();
    }
    $("r-gen").textContent = gen.toLocaleString("en-US");
    $("r-pop").textContent = population().toLocaleString("en-US");
    $("r-size").textContent = cols + " × " + rows;
  }

  function randomize(density) {
    var r = S.rng(Math.floor(Math.random() * 1e9));
    for (var i = 0; i < grid.length; i++) { grid[i] = r() < density ? 1 : 0; age[i] = 0; }
    gen = 0;
  }

  function placePattern(name, ox, oy) {
    var p = PATTERNS[name];
    for (var y = 0; y < p.length; y++) for (var x = 0; x < p[y].length; x++) {
      if (p[y][x] !== "O") continue;
      var gx = ((ox + x) % cols + cols) % cols, gy = ((oy + y) % rows + rows) % rows;
      grid[gy * cols + gx] = 1; age[gy * cols + gx] = 0;
    }
  }

  function parseRule(str) {
    var m = /^\s*B([0-8]*)\s*\/\s*S([0-8]*)\s*$/i.exec(str);
    if (!m) return false;
    for (var k = 0; k < 9; k++) { birth[k] = m[1].indexOf(String(k)) >= 0; survive[k] = m[2].indexOf(String(k)) >= 0; }
    return true;
  }

  // ---- loop --------------------------------------------------------------
  var acc = 0, last = performance.now();
  function loop(now) {
    var dtms = Math.min(250, now - last); last = now;
    if (running) {
      acc += dtms * gps / 1000;
      var n = 0;
      while (acc >= 1 && n < 30) { step(); acc -= 1; n++; }
      if (n) draw();
    }
    requestAnimationFrame(loop);
  }

  // ---- interaction -------------------------------------------------------
  var painting = null;
  function cellAt(ev) {
    var p = S.pointer(canvas, ev);
    return { x: Math.floor(p.x / cell), y: Math.floor(p.y / cell) };
  }
  canvas.addEventListener("pointerdown", function (ev) {
    var c = cellAt(ev);
    if (c.x < 0 || c.y < 0 || c.x >= cols || c.y >= rows) return;
    var tool = $("tool").value;
    if (tool === "cell") {
      painting = grid[c.y * cols + c.x] ? 0 : 1;
      grid[c.y * cols + c.x] = painting; age[c.y * cols + c.x] = 0;
      canvas.setPointerCapture(ev.pointerId);
    } else {
      var p = PATTERNS[tool];
      placePattern(tool, c.x - Math.floor(p[0].length / 2), c.y - Math.floor(p.length / 2));
    }
    draw();
  });
  canvas.addEventListener("pointermove", function (ev) {
    if (painting === null) return;
    var c = cellAt(ev);
    if (c.x < 0 || c.y < 0 || c.x >= cols || c.y >= rows) return;
    grid[c.y * cols + c.x] = painting; age[c.y * cols + c.x] = 0;
    draw();
  });
  window.addEventListener("pointerup", function () { painting = null; });

  function setRunning(on) {
    running = on;
    $("play").textContent = running ? "Pause" : "Play";
    last = performance.now();
  }
  $("play").addEventListener("click", function () { setRunning(!running); });
  $("step").addEventListener("click", function () { setRunning(false); step(); draw(); });
  $("clear").addEventListener("click", function () { grid.fill(0); age.fill(0); gen = 0; draw(); });
  $("random").addEventListener("click", function () { randomize(parseFloat($("density").value)); draw(); });
  S.bindRange($("density"), $("density-out"), function (v) { return Math.round(v * 100) + "%"; });
  S.bindRange($("speed"), $("speed-out"), function (v) { return v + " gen/s"; }, function (v) { gps = v; });
  S.bindRange($("zoom"), $("zoom-out"), function (v) { return v + " px"; }, function (v) {
    cell = v; if (W) { resizeGrid(); draw(); }
  });
  $("wrap").addEventListener("change", function () { wrap = $("wrap").checked; });
  $("age").addEventListener("change", draw);
  $("grid").addEventListener("change", draw);
  $("rule").addEventListener("change", function () {
    var v = $("rule").value;
    $("custom-field").hidden = v !== "custom";
    if (v !== "custom") parseRule(v); else applyCustom();
  });
  function applyCustom() {
    var ok = parseRule($("custom").value);
    $("custom").setAttribute("aria-invalid", ok ? "false" : "true");
    $("rule-error").hidden = ok;
  }
  $("custom").addEventListener("input", applyCustom);
  S.onThemeChange(function (c) { C = c; draw(); });

  setRunning(!S.reducedMotion);
  requestAnimationFrame(loop);
})();
