---
title: "Color of a hot object"
excerpt: "Why red-hot iron, a light bulb, the Sun and Rigel have the colors they do: the Planck spectrum at any temperature, and the color your eye makes of it."
order: 4
thumbnail: /images/simulations/blackbody.png
sim_script: blackbody.js
---

<div class="sim" id="blackbody">
  <div class="sim__views sim__views--split">
    <div class="sim__stage">
      <canvas data-role="swatch" aria-label="A glowing sphere with the color of a black body at the chosen temperature"></canvas>
    </div>
    <div class="sim__stage">
      <canvas data-role="plot" aria-label="Planck spectrum at the chosen temperature"></canvas>
    </div>
  </div>
  <div class="sim__panel">
    <label class="sim__field">
      <span class="sim__field-head">Temperature <output data-role="t-out"></output></span>
      <input type="range" data-role="temp" min="0" max="1000" step="1" value="500">
    </label>
    <div class="sim__presets">
      <button type="button" class="sim-btn" data-temp="1000">Red-hot iron</button>
      <button type="button" class="sim-btn" data-temp="1850">Candle</button>
      <button type="button" class="sim-btn" data-temp="2700">Light bulb</button>
      <button type="button" class="sim-btn" data-temp="3600">Betelgeuse</button>
      <button type="button" class="sim-btn" data-temp="5772">Sun</button>
      <button type="button" class="sim-btn" data-temp="9940">Sirius</button>
      <button type="button" class="sim-btn" data-temp="12100">Rigel</button>
    </div>
    <label class="sim__check"><input type="checkbox" data-role="bright"> Show how bright it is</label>
    <label class="sim__check"><input type="checkbox" data-role="sun"> Compare with the Sun</label>
    <dl class="sim__readout">
      <dt>Color</dt><dd><span data-role="chip" class="sim__chip"></span> <span data-role="r-hex"></span></dd>
      <dt>Chromaticity (x, y)</dt><dd data-role="r-xy"></dd>
      <dt>Peak wavelength</dt><dd data-role="r-peak"></dd>
      <dt>Emitted power σT⁴</dt><dd data-role="r-flux"></dd>
      <dt>Fraction in the visible</dt><dd data-role="r-vis"></dd>
    </dl>
    <p class="sim__note">By default the sphere shows only the hue, scaled to full brightness. Tick "Show how bright it is" to also see how dim a cool object really is, on a logarithmic scale.</p>
  </div>
</div>

## Planck's law

A black body absorbs all light that falls on it, and in thermal equilibrium it emits a spectrum that depends only on its temperature $$T$$. The power emitted per unit area, per unit solid angle and per unit wavelength is

$$
B_\lambda(\lambda, T) = \frac{2 h c^2}{\lambda^5}\, \frac{1}{e^{hc/\lambda k_B T} - 1} .
$$

Two consequences are visible in the plot. The peak moves to shorter wavelengths as the object heats up (Wien's displacement law),

$$
\lambda_{\max} T = b \approx 2.898 \times 10^{-3}\ \mathrm{m\,K},
$$

and the total emitted power grows very fast with temperature (Stefan–Boltzmann law),

$$
\int_0^\infty \pi B_\lambda \, d\lambda = \sigma T^4 , \qquad \sigma = \frac{2\pi^5 k_B^4}{15 h^3 c^2} .
$$

## From a spectrum to a color

The eye does not see a spectrum, only three numbers. The CIE 1931 color matching functions $$\bar x(\lambda)$$, $$\bar y(\lambda)$$ and $$\bar z(\lambda)$$ describe the standard observer, and the color is fixed by

$$
X = \int B_\lambda\, \bar x\, d\lambda, \qquad Y = \int B_\lambda\, \bar y\, d\lambda, \qquad Z = \int B_\lambda\, \bar z\, d\lambda ,
$$

where $$Y$$ is the luminance. These are converted to linear sRGB with a fixed $$3 \times 3$$ matrix, scaled so the brightest channel is 1, and gamma encoded for the screen. The matching functions here use the analytic fit of Wyman, Sloan and Shirley (2013).

## Things to notice

- There is no green or purple star. Black-body colors follow a single curve: red, orange, yellowish white, white, then pale blue. When the spectrum peaks in the green, the neighbouring red and blue are almost as strong, and the mix looks white.
- The Sun's spectrum peaks near 500 nm, but its color comes out slightly warm, because sRGB defines white as daylight at about 6500 K.
- Even very hot stars never get deeply blue. As $$T \to \infty$$ the visible part of the spectrum approaches $$B_\lambda \propto \lambda^{-4}$$ and the color tends to a fixed pale blue.
- A light bulb at 2700 K radiates only about 7% of its power in the visible; the rest is infrared heat. That is why incandescent lamps are so inefficient.
