---
layout: archive
title: "CV"
permalink: /cv/
author_profile: true
redirect_from:
  - /resume
---

{% include base_path %}

Education
======
* Ph.D in Physics, Universidade Federal de Pernambuco, 2028 (expected)
* M.S. in Mathematics, Universidade Federal de Pernambuco, 2023
* B.S. in Physics, Universidade Federal de Pernambuco, 2023
* B.S. in Mathematics, Universidade Federal de Pernambuco, 2020

Work experience
======
* 2025-Now: Substitute Professor
  * Physics Department, Universidade Federal de Pernambuco
  
* 2021: Substitute Professor
  * Mathematics Department, Universidade Federal de Pernambuco
  
Publications
======
  <ul>{% for post in site.publications reversed %}
    {% include archive-single-cv.html %}
  {% endfor %}</ul>
  
Talks
======
  <ul>{% for post in site.talks reversed %}
    {% include archive-single-talk-cv.html  %}
  {% endfor %}</ul>
  
Teaching
======
  <ul>{% for post in site.teaching reversed %}
    {% include archive-single-cv.html %}
  {% endfor %}</ul>
