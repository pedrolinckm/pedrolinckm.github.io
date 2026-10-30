---
title: "Ising model and its phase transition"
excerpt: "A lattice of magnetic spins that orders spontaneously below a critical temperature. Heat it, cool it, apply a field, and compare with Onsager's exact solution."
order: 5
thumbnail: /images/simulations/ising.png
sim_script: ising.js
---

<div class="sim" id="ising">
  <div class="sim__views sim__views--split">
    <div class="sim__stage">
      <canvas data-role="lattice" aria-label="Lattice of up and down spins"></canvas>
    </div>
    <div class="sim__stage">
      <canvas data-role="plot" aria-label="Magnetization and energy plots"></canvas>
    </div>
  </div>
  <div class="sim__panel">
    <div class="sim__buttons">
      <button type="button" class="sim-btn sim-btn--primary" data-role="play">Pause</button>
      <button type="button" class="sim-btn" data-role="hot">Random spins</button>
      <button type="button" class="sim-btn" data-role="cold">All up</button>
    </div>
    <label class="sim__field">
      <span class="sim__field-head"><span>Temperature T</span> <output data-role="T-out"></output></span>
      <input type="range" data-role="T" min="0.5" max="5" step="0.001" value="2.269">
    </label>
    <div class="sim__buttons"><button type="button" class="sim-btn" data-role="tc">Set T = T<sub>c</sub> ≈ 2.269</button></div>
    <label class="sim__field">
      <span class="sim__field-head"><span>Magnetic field h</span> <output data-role="h-out"></output></span>
      <input type="range" data-role="h" min="-1" max="1" step="0.01" value="0">
    </label>
    <label class="sim__field">
      <span class="sim__field-head">Update rule</span>
      <select data-role="algo">
        <option value="metropolis">Metropolis (one spin at a time)</option>
        <option value="wolff">Wolff (whole clusters)</option>
      </select>
    </label>
    <label class="sim__field">
      <span class="sim__field-head">Lattice size</span>
      <select data-role="size">
        <option value="32">32 × 32</option>
        <option value="64">64 × 64</option>
        <option value="128" selected>128 × 128</option>
        <option value="256">256 × 256</option>
      </select>
    </label>
    <label class="sim__field">
      <span class="sim__field-head"><span>Sweeps</span> <output data-role="speed-out"></output></span>
      <input type="range" data-role="speed" min="1" max="20" step="1" value="2">
    </label>
    <label class="sim__field">
      <span class="sim__field-head">Dragging on the lattice paints</span>
      <select data-role="brush">
        <option value="up">Up spins</option>
        <option value="down">Down spins</option>
      </select>
    </label>
    <label class="sim__field">
      <span class="sim__field-head">Plot</span>
      <select data-role="plotmode">
        <option value="time">Magnetization and energy over time</option>
        <option value="scan">Temperature scan</option>
      </select>
    </label>
    <label class="sim__field" data-role="quantity-field">
      <span class="sim__field-head">Lower plot of the scan</span>
      <select data-role="quantity">
        <option value="chi">Susceptibility χ</option>
        <option value="c">Specific heat c</option>
        <option value="e">Energy e</option>
      </select>
    </label>
    <div class="sim__buttons">
      <button type="button" class="sim-btn" data-role="scan">Run temperature scan</button>
      <button type="button" class="sim-btn" data-role="clear-scans">Clear scans</button>
    </div>
    <p class="sim__alert" data-role="scan-status" hidden></p>
    <dl class="sim__readout">
      <dt>T / T<sub>c</sub></dt><dd data-role="r-t"></dd>
      <dt>Magnetization m</dt><dd data-role="r-m"></dd>
      <dt>Energy e</dt><dd data-role="r-e"></dd>
      <dt>Sweeps</dt><dd data-role="r-sweeps"></dd>
      <dt>Speed</dt><dd data-role="r-rate"></dd>
      <dt>Mean Wolff cluster</dt><dd data-role="r-cluster"></dd>
    </dl>
    <p class="sim__note">The scan cools the lattice from T = 3.6 to 1.0 with Wolff updates and h = 0. Run it at several lattice sizes: the last four scans stay on the plot.</p>
  </div>
</div>

## The model

Each site $$i$$ of an $$L \times L$$ square lattice carries a spin $$s_i = \pm 1$$. Neighbouring spins prefer to point the same way, and a field $$h$$ favours one direction:

$$
H = -J \sum_{\langle ij \rangle} s_i s_j \;-\; h \sum_i s_i ,
$$

where the first sum runs over nearest-neighbour pairs. Here $$J = k_B = 1$$ and the boundaries are periodic. In equilibrium at temperature $$T$$ a configuration appears with the Boltzmann weight $$e^{-H/T}$$. The plots show the magnetization and energy per spin,

$$
m = \frac{1}{N} \sum_i s_i , \qquad e = \frac{H}{N}, \qquad N = L^2 .
$$

## The phase transition

At high temperature the spins are disordered and $$m$$ fluctuates around zero. Below the critical temperature found by Onsager (1944),

$$
T_c = \frac{2J}{\ln\!\left(1 + \sqrt 2\right)} \approx 2.269 ,
$$

the lattice orders spontaneously: one direction wins, although the Hamiltonian at $$h = 0$$ has no preference. On an infinite lattice the magnetization is (Yang 1952)

$$
m_0(T) = \left[ 1 - \sinh^{-4}\!\left( \frac{2J}{T} \right) \right]^{1/8} \quad (T \lt T_c), \qquad m_0 = 0 \quad (T \ge T_c),
$$

so near $$T_c$$ it vanishes as $$m_0 \sim (T_c - T)^{1/8}$$. The energy per spin is also known in closed form,

$$
e(T) = -\coth\frac{2J}{T} \left[ 1 + \frac{2}{\pi}\left( 2\tanh^2\frac{2J}{T} - 1 \right) K(k) \right], \qquad k = \frac{2\sinh(2J/T)}{\cosh^2(2J/T)} ,
$$

with $$K$$ the complete elliptic integral of the first kind. Both curves appear dashed in the plots. The susceptibility and specific heat follow from the fluctuations,

$$
\chi = \frac{N}{T}\left( \langle m^2 \rangle - \langle \lvert m \rvert \rangle^2 \right), \qquad
c = \frac{N}{T^2}\left( \langle e^2 \rangle - \langle e \rangle^2 \right).
$$

For an infinite lattice $$\chi$$ diverges as $$\lvert T - T_c \rvert^{-7/4}$$ and $$c$$ as $$\ln \lvert T - T_c \rvert$$. A finite lattice has no true singularity: the peaks are rounded, grow with $$L$$ and shift toward $$T_c$$. The temperature scan shows this when you run it at several sizes.

## The two update rules

**Metropolis.** Pick a random spin and propose to flip it. The energy changes by $$\Delta E = 2 s_i \left( J \sum_{j} s_j + h \right)$$, summed over its four neighbours, and the flip is accepted with probability $$\min\!\left(1, e^{-\Delta E / T}\right)$$. One sweep is $$N$$ attempts. This satisfies detailed balance and looks like real relaxation, but near $$T_c$$ it suffers from critical slowing down: the correlation time grows as $$L^{z}$$ with $$z \approx 2.17$$.

**Wolff (1989).** Start a cluster at a random spin and add each aligned neighbour with probability

$$
p_{\text{add}} = 1 - e^{-2J/T},
$$

then flip the whole cluster at once (with a field, the flip is accepted with probability $$\min(1, e^{-2 h s n / T})$$ for a cluster of $$n$$ spins with sign $$s$$). Near $$T_c$$ the clusters are as large as the correlated regions themselves, and the critical slowing down almost disappears. The panel shows the mean cluster size.

## Things to try

- **Quench.** Press "Random spins" at $$T = 1.5$$ with Metropolis. Domains of up and down spins form and coarsen, with a typical size growing like $$t^{1/2}$$. Often the lattice gets stuck in stripes that wrap around the torus.
- **Critical point.** At $$T = T_c$$ the domains have structure at every scale, from single spins to the whole lattice. This scale invariance is what makes the critical exponents universal.
- **Critical slowing down.** At $$T_c$$, compare how fast $$m(t)$$ wanders with Metropolis and with Wolff, at $$L = 256$$.
- **Hysteresis.** At $$T = 1.5$$, start from "All up" and slowly lower $$h$$ below zero. The lattice stays up, in a metastable state, until a down domain nucleates and sweeps through.
- **Finite-size scaling.** Run the temperature scan at $$L = 32$$, $$64$$ and $$128$$ and watch the peak of $$\chi$$ sharpen and approach $$T_c$$.
