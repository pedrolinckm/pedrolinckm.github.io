---
title: "The cosmic microwave background"
excerpt: "Change how much ordinary matter, dark matter and dark energy the universe has, and see how the acoustic peaks of the CMB and the look of the sky respond."
order: 2
thumbnail: /images/simulations/cmb.png
sim_script: cmb.js
---

<div class="sim" id="cmb">
  <div class="sim__views sim__views--split">
    <div class="sim__stage">
      <canvas data-role="map" aria-label="Simulated temperature map of a patch of the microwave sky"></canvas>
    </div>
    <div class="sim__stage">
      <canvas data-role="plot" aria-label="Angular power spectrum of the temperature fluctuations"></canvas>
    </div>
  </div>
  <div class="sim__panel">
    <div class="sim__presets">
      <button type="button" class="sim-btn" data-preset='{"ob":0.0493,"oc":0.265,"ol":0.6847,"h":0.6736,"ns":0.9649}'>Planck 2018</button>
      <button type="button" class="sim-btn" data-preset='{"ob":0.0493,"oc":0.0,"ol":0.9506,"h":0.6736,"ns":0.9649}'>No dark matter</button>
      <button type="button" class="sim-btn" data-preset='{"ob":0.12,"oc":0.265,"ol":0.6149,"h":0.6736,"ns":0.9649}'>More baryons</button>
      <button type="button" class="sim-btn" data-preset='{"ob":0.0493,"oc":0.265,"ol":0.0,"h":0.6736,"ns":0.9649}'>Open, no Λ</button>
      <button type="button" class="sim-btn" data-preset='{"ob":0.0493,"oc":0.265,"ol":0.85,"h":0.6736,"ns":0.9649}'>Closed</button>
      <button type="button" class="sim-btn" data-preset='{"ob":0.0493,"oc":0.9506,"ol":0.0,"h":0.6736,"ns":0.9649}'>Matter only</button>
    </div>
    <label class="sim__field">
      <span class="sim__field-head"><span>Ordinary matter Ω<sub>b</sub></span> <output data-role="ob-out"></output></span>
      <input type="range" data-role="ob" min="0.01" max="0.2" step="0.001" value="0.0493">
    </label>
    <label class="sim__field">
      <span class="sim__field-head"><span>Dark matter Ω<sub>c</sub></span> <output data-role="oc-out"></output></span>
      <input type="range" data-role="oc" min="0" max="1" step="0.005" value="0.265">
    </label>
    <label class="sim__field">
      <span class="sim__field-head"><span>Dark energy Ω<sub>Λ</sub></span> <output data-role="ol-out"></output></span>
      <input type="range" data-role="ol" min="0" max="1.2" step="0.005" value="0.6847">
    </label>
    <label class="sim__field">
      <span class="sim__field-head"><span>Hubble constant h</span> <output data-role="h-out"></output></span>
      <input type="range" data-role="h" min="0.5" max="0.9" step="0.005" value="0.6736">
    </label>
    <label class="sim__field">
      <span class="sim__field-head"><span>Spectral index n<sub>s</sub></span> <output data-role="ns-out"></output></span>
      <input type="range" data-role="ns" min="0.85" max="1.1" step="0.005" value="0.9649">
    </label>
    <div class="sim__buttons"><button type="button" class="sim-btn" data-role="flat">Make it flat</button></div>
    <label class="sim__check"><input type="checkbox" data-role="ref" checked> Show the Planck 2018 curve</label>
    <p class="sim__alert" data-role="alert" hidden></p>
    <dl class="sim__readout">
      <dt>Curvature Ω<sub>k</sub></dt><dd data-role="r-ok"></dd>
      <dt>Total matter Ω<sub>m</sub></dt><dd data-role="r-om"></dd>
      <dt>Age of the universe</dt><dd data-role="r-age"></dd>
      <dt>Last scattering z<sub>*</sub></dt><dd data-role="r-zs"></dd>
      <dt>Sound horizon r<sub>s</sub></dt><dd data-role="r-rs"></dd>
      <dt>100 θ<sub>*</sub></dt><dd data-role="r-theta"></dd>
      <dt>Peak positions ℓ</dt><dd data-role="r-peak"></dd>
      <dt>1st / 2nd peak height</dt><dd data-role="r-ratio"></dd>
    </dl>
  </div>
</div>

The fractions are today's densities in units of the critical density, and $$h$$ is the Hubble constant in units of $$100\ \mathrm{km\,s^{-1}\,Mpc^{-1}}$$. Whatever is left over, $$\Omega_k = 1 - \Omega_b - \Omega_c - \Omega_\Lambda - \Omega_r$$, is spatial curvature. The map is a random sky with the spectrum on the right, drawn with the same random numbers every time, so that only the physics changes.

## What the peaks are

Before recombination, at redshift $$z_* \approx 1090$$, photons and baryons formed a single fluid. Gravity pulled it into the potential wells of dark matter and radiation pressure pushed it back out, so every Fourier mode oscillated like a sound wave. Recombination froze the oscillations: modes caught at maximum compression or rarefaction give the peaks of the angular power spectrum

$$
D_\ell = \frac{\ell(\ell+1)}{2\pi}\, C_\ell , \qquad \Delta T(\hat n) = \sum_{\ell m} a_{\ell m} Y_{\ell m}(\hat n), \qquad C_\ell = \langle \lvert a_{\ell m} \rvert^2 \rangle .
$$

The peaks sit at multiples of the angle subtended by the sound horizon,

$$
r_s = \int_0^{t_*} \frac{c_s\, dt}{a}, \qquad c_s = \frac{c}{\sqrt{3(1+R)}}, \qquad R = \frac{3\rho_b}{4\rho_\gamma}, \qquad \theta_* = \frac{r_s}{D_M(z_*)} ,
$$

so that $$\ell_n \approx \pi n / \theta_*$$, shifted by a phase of order one.

## What each slider does

- **Curvature** moves the whole pattern. In an open universe geodesics diverge, the same ruler looks smaller on the sky, the peaks move to higher $$\ell$$ and the spots on the map shrink. A closed universe does the opposite. The measured first peak near $$\ell \approx 220$$ is how we know the universe is close to flat.
- **Baryons** load the fluid. Compressions (odd peaks) get deeper and rarefactions (even peaks) shallower, so the ratio of the first to the second peak grows.
- **Dark matter** sets when matter starts to dominate. With less of it, the potentials decay while the modes are oscillating, which drives the oscillations harder and raises the peaks.
- **The tilt** $$n_s$$ tips the whole spectrum, adding power at large or small scales.
- **Silk damping**: photons diffuse over a scale smaller than $$r_s$$, which exponentially suppresses the peaks beyond $$\ell \sim 1000$$.

## How it is computed

The background is exact for the chosen content: the Friedmann equation

$$
H(z) = H_0 \sqrt{\Omega_r (1+z)^4 + \Omega_m (1+z)^3 + \Omega_k (1+z)^2 + \Omega_\Lambda}
$$

gives $$r_s$$, the transverse distance $$D_M$$ (with $$\sinh$$ or $$\sin$$ for open or closed space) and the age. The redshift of last scattering and the damping and equality scales use the fitting formulas of Hu and Sugiyama (1996) and Eisenstein and Hu (1998).

The spectrum is a semi-analytic model in the spirit of Hu and Sugiyama: a monopole $$\Theta_0 + \Psi \propto (\tfrac13 + R)\cos(k r_s + \varphi) - R\,\Psi$$ and a Doppler term $$\Theta_1 \propto \sin(k r_s + \varphi)/\sqrt{3(1+R)}$$, with radiation driving, Silk damping and a Sachs–Wolfe plateau at low $$\ell$$. Its handful of coefficients were fitted once, so that the Planck 2018 parameters put the peaks at $$\ell \approx 220, 530, 820, 1130, 1430$$ with the observed heights. The trends are right, but away from the Planck values the numbers are only indicative. Effects like reionization, gravitational lensing, neutrinos and the late integrated Sachs–Wolfe effect are left out. For real analyses one uses Boltzmann codes such as CAMB or CLASS.
