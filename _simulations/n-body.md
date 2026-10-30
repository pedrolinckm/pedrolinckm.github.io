---
title: "N-body problem in 2D"
excerpt: "Point masses under Newtonian gravity. Watch a three-body choreography, a planetary system or two colliding galaxies, and throw in bodies of your own."
order: 1
thumbnail: /images/simulations/n-body.png
sim_script: n-body.js
---

<div class="sim" id="nbody">
  <div class="sim__views">
    <div class="sim__stage">
      <canvas data-role="canvas" aria-label="Animation of bodies moving under gravity"></canvas>
      <p class="sim__caption">Drag to launch a body (the drag sets its velocity). Scroll to zoom.</p>
    </div>
  </div>
  <div class="sim__panel">
    <div class="sim__buttons">
      <button type="button" class="sim-btn sim-btn--primary" data-role="play">Pause</button>
      <button type="button" class="sim-btn" data-role="reset">Restart</button>
      <button type="button" class="sim-btn" data-role="clear">Clear</button>
    </div>
    <label class="sim__field">
      <span class="sim__field-head">Initial setup</span>
      <select data-role="preset">
        <option value="figure8">Figure-eight (three bodies)</option>
        <option value="solar">Star with planets</option>
        <option value="binary">Binary star with planets</option>
        <option value="cluster">Random cluster</option>
        <option value="galaxies">Two colliding disks</option>
        <option value="empty">Empty space</option>
      </select>
    </label>
    <label class="sim__field" data-role="n-field">
      <span class="sim__field-head">Number of bodies <output data-role="n-out"></output></span>
      <input type="range" data-role="n" min="10" max="400" step="10" value="120">
    </label>
    <label class="sim__field">
      <span class="sim__field-head">Speed <output data-role="speed-out"></output></span>
      <input type="range" data-role="speed" min="1" max="20" step="1" value="4">
    </label>
    <label class="sim__field">
      <span class="sim__field-head">Softening length ε <output data-role="soft-out"></output></span>
      <input type="range" data-role="soft" min="0" max="10" step="0.1" value="1">
    </label>
    <label class="sim__field">
      <span class="sim__field-head">Mass of new bodies <output data-role="mass-out"></output></span>
      <input type="range" data-role="mass" min="0.1" max="500" step="0.1" value="10">
    </label>
    <label class="sim__check"><input type="checkbox" data-role="trails" checked> Show trails</label>
    <label class="sim__check"><input type="checkbox" data-role="follow" checked> Follow the center of mass</label>
    <dl class="sim__readout">
      <dt>Bodies</dt><dd data-role="r-n">0</dd>
      <dt>Time</dt><dd data-role="r-t">0</dd>
      <dt>Total energy</dt><dd data-role="r-e">0</dd>
      <dt>Relative energy error</dt><dd data-role="r-de">–</dd>
      <dt>Total momentum</dt><dd data-role="r-p">0</dd>
    </dl>
  </div>
</div>

## The model

Each body $$i$$ has mass $$m_i$$ and position $$\mathbf r_i$$ in the plane, and feels the gravity of all the others. With $$G = 1$$,

$$
\ddot{\mathbf r}_i = \sum_{j \neq i} \frac{m_j \,(\mathbf r_j - \mathbf r_i)}{\left(\lvert \mathbf r_j - \mathbf r_i \rvert^2 + \varepsilon^2\right)^{3/2}} .
$$

The softening length $$\varepsilon$$ removes the singularity of close encounters. For $$\varepsilon = 0$$ this is exact Newtonian gravity; for $$\varepsilon > 0$$ the system still has a conserved energy,

$$
E = \sum_i \tfrac12 m_i \lvert \dot{\mathbf r}_i \rvert^2 \;-\; \sum_{i \lt j} \frac{m_i m_j}{\sqrt{\lvert \mathbf r_j - \mathbf r_i \rvert^2 + \varepsilon^2}} ,
$$

and the panel shows how well the integrator keeps it.

## The integrator

The equations are advanced with the kick-drift-kick leapfrog,

$$
\mathbf v_{n+1/2} = \mathbf v_n + \tfrac{\Delta t}{2}\,\mathbf a(\mathbf r_n), \qquad
\mathbf r_{n+1} = \mathbf r_n + \Delta t\, \mathbf v_{n+1/2}, \qquad
\mathbf v_{n+1} = \mathbf v_{n+1/2} + \tfrac{\Delta t}{2}\,\mathbf a(\mathbf r_{n+1}).
$$

It is second order and symplectic, so it exactly conserves a slightly perturbed energy. That is why the relative energy error oscillates instead of growing. The forces are computed by direct summation, which costs $$O(N^2)$$ per step.

## Things to try

- **Figure-eight.** Three equal masses chasing each other on one closed curve, found numerically by Moore (1993) and proved to exist by Chenciner and Montgomery (2000). Nudge it by adding a tiny body and watch the orbit break apart.
- **Binary star.** Planets around a binary are only stable a few binary separations away. Launch a light body close to the pair and it is usually flung out.
- **Colliding disks.** Each disk is a heavy core with light test stars. Tidal forces pull out long tails, as in the Antennae galaxies.
- **Softening.** Set $$\varepsilon$$ to zero in the random cluster and see close pairs form tight binaries, which makes the energy error jump.
