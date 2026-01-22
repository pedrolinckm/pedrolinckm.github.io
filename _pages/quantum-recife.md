---
layout: single
title: "Quantum Recife"
permalink: /quantum-recife/
author_profile: true
---

## Upcoming talks
{% for t in site.data.quantum_recife.upcoming %}
**{{ t.date }}** — *{{ t.speaker }}* ({{ t.affiliation }})  
**{{ t.title }}**  
{{ t.location }}  

{{ t.abstract }}

{% if t.slides %}[Slides]({{ t.slides }}){% endif %}{% if t.recording and t.slides %} · {% endif %}{% if t.recording %}[Recording]({{ t.recording }}){% endif %}

---
{% endfor %}

## Past talks
{% for t in site.data.quantum_recife.past %}
**{{ t.date }}** — *{{ t.speaker }}* ({{ t.affiliation }})  
**{{ t.title }}**  
{{ t.location }}  

{% if t.slides %}[Slides]({{ t.slides }}){% endif %}{% if t.recording and t.slides %} · {% endif %}{% if t.recording %}[Recording]({{ t.recording }}){% endif %}

---
{% endfor %}
