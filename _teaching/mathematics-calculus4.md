---
title: "Differential and Integral Calculus IV: Differential equations"
collection: teaching
type: "Undergraduate course"
permalink: /teaching/2021-mathematics-calculus4
venue: "Universidade Federal de Pernambuco, Mathematics Department"
location: "Recife, Brazil"
---

Differential and Integral Calculus IV undergraduate course given at Universidade Federal de Pernambuco. The lecture notes for this discipline are in portuguese.

## Lecture notes (view online)

{% assign tag = "calculus-4-lectures" %}

{% for i in (1..27) %}

  {% if i == 10 or i == 11 %}
    {% continue %}
  {% endif %}

  {% if i == 9 %}
    {% capture pdf_url %}https://github.com/pedrolinckm/pedrolinckm.github.io/releases/download/{{ tag }}/lecture-9-10-11.pdf{% endcapture %}
  {% else %}
    {% capture pdf_url %}https://github.com/pedrolinckm/pedrolinckm.github.io/releases/download/{{ tag }}/lecture-{{ i }}.pdf{% endcapture %}
  {% endif %}

- <a href="https://docs.google.com/gview?embedded=1&url={{ pdf_url | uri_escape }}" target="_blank" rel="noopener">Lecture {{ i }}</a>

{% endfor %}
