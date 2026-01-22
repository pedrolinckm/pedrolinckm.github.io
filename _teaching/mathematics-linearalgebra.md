---
title: "Linear Algebra"
collection: teaching
type: "Undergraduate course"
permalink: /teaching/mathematics-linearalgebra/
venue: "Universidade Federal de Pernambuco, Mathematics Department"
location: "Recife, Brazil"
excerpt: "Linear Algebra undergraduate course at UFPE (lecture notes and materials)."
---

Linear Algebra undergraduate course given at Universidade Federal de Pernambuco.

## Lecture notes (view online)

{% assign tag = "linear-algebra-lectures" %}
{% for i in (1..17) %}
  {% capture pdf_url %}https://github.com/pedrolinckm/pedrolinckm.github.io/releases/download/{{ tag }}/lecture-{{ i }}.pdf{% endcapture %}
- <a href="https://docs.google.com/gview?embedded=1&url={{ pdf_url | uri_escape }}" target="_blank" rel="noopener">Lecture {{ i }}</a>
{% endfor %}
