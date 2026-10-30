---
title: "Game of Life"
excerpt: "Conway's cellular automaton: two rules, endless behaviour. Draw cells, drop in gliders and guns, or try other birth and survival rules."
order: 3
thumbnail: /images/simulations/game-of-life.png
sim_script: game-of-life.js
---

<div class="sim" id="life">
  <div class="sim__views">
    <div class="sim__stage">
      <canvas data-role="canvas" aria-label="Grid of live and dead cells"></canvas>
    </div>
  </div>
  <div class="sim__panel">
    <div class="sim__buttons">
      <button type="button" class="sim-btn sim-btn--primary" data-role="play">Pause</button>
      <button type="button" class="sim-btn" data-role="step">Step</button>
      <button type="button" class="sim-btn" data-role="clear">Clear</button>
    </div>
    <label class="sim__field">
      <span class="sim__field-head">Click on the grid to</span>
      <select data-role="tool">
        <option value="cell">Draw or erase cells</option>
        <option value="glider">Place a glider</option>
        <option value="lwss">Place a spaceship</option>
        <option value="pulsar">Place a pulsar</option>
        <option value="gun">Place a Gosper glider gun</option>
        <option value="rpentomino">Place an R-pentomino</option>
        <option value="acorn">Place an acorn</option>
        <option value="diehard">Place a diehard</option>
      </select>
    </label>
    <label class="sim__field">
      <span class="sim__field-head">Rule</span>
      <select data-role="rule">
        <option value="B3/S23">Conway's Life (B3/S23)</option>
        <option value="B36/S23">HighLife (B36/S23)</option>
        <option value="B3678/S34678">Day &amp; Night (B3678/S34678)</option>
        <option value="B2/S">Seeds (B2/S)</option>
        <option value="B3/S12345">Maze (B3/S12345)</option>
        <option value="custom">Custom rule</option>
      </select>
    </label>
    <label class="sim__field" data-role="custom-field" hidden>
      <span class="sim__field-head">Custom rule</span>
      <input type="text" data-role="custom" value="B3/S23" spellcheck="false">
      <span class="sim__note" data-role="rule-error" hidden>Write it as B followed by digits, a slash, and S followed by digits, for example B36/S23.</span>
    </label>
    <label class="sim__field">
      <span class="sim__field-head">Speed <output data-role="speed-out"></output></span>
      <input type="range" data-role="speed" min="1" max="60" step="1" value="15">
    </label>
    <label class="sim__field">
      <span class="sim__field-head">Cell size <output data-role="zoom-out"></output></span>
      <input type="range" data-role="zoom" min="3" max="24" step="1" value="10">
    </label>
    <div class="sim__field">
      <span class="sim__field-head">Random fill density <output data-role="density-out"></output></span>
      <input type="range" data-role="density" min="0.05" max="0.6" step="0.01" value="0.2" aria-label="Random fill density">
    </div>
    <div class="sim__buttons"><button type="button" class="sim-btn" data-role="random">Fill at random</button></div>
    <label class="sim__check"><input type="checkbox" data-role="wrap" checked> Wrap around the edges</label>
    <label class="sim__check"><input type="checkbox" data-role="age"> Color cells by age</label>
    <label class="sim__check"><input type="checkbox" data-role="grid" checked> Show grid lines</label>
    <dl class="sim__readout">
      <dt>Generation</dt><dd data-role="r-gen">0</dd>
      <dt>Live cells</dt><dd data-role="r-pop">0</dd>
      <dt>Grid</dt><dd data-role="r-size">–</dd>
    </dl>
  </div>
</div>

## The rules

The board is a grid of cells, each alive or dead. At every generation each cell counts its eight neighbours, and all cells update at once:

- a dead cell with exactly 3 live neighbours becomes alive (birth);
- a live cell with 2 or 3 live neighbours stays alive (survival);
- every other cell dies or stays dead.

In the usual notation this is the rule B3/S23. Other choices of the digits give other "life-like" automata, which you can pick in the panel.

## Why it is interesting

From these local rules come structures that behave like objects: still lifes that never change, oscillators like the pulsar, and spaceships like the glider that move across the grid. The Gosper glider gun, found in 1970, emits a new glider every 30 generations, which proved that a finite pattern can grow forever.

Gliders can carry signals and collide to make logic gates, and the Game of Life is Turing complete: any computation can be encoded as an initial pattern. As a consequence, whether a given pattern eventually dies out is undecidable in general.

Small seeds can have long lives. The R-pentomino has five cells and settles only after 1103 generations; the acorn has seven and takes 5206. The diehard vanishes completely after 130 generations. Turn off "Wrap around the edges" to watch them on an unbounded-looking board, since on a torus the debris eventually comes back and interferes.
