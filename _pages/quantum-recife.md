---
layout: single
title: "Quantum Recife"
permalink: /quantum-recife/
author_profile: true
---

This page is a hub for **Quantum Recife** group meetings. Here you’ll find the schedule of upcoming talks and an archive of past talks, including abstracts and, when available, **slides/notes** and **recordings**.

## Upcoming talks
{% for t in site.data.quantum_recife.upcoming %}
### {{ t.title }}

**{{ t.speaker }}** ({{ t.affiliation }})  
{{ t.date }} — {{ t.location }}

{% if t.abstract and t.abstract != "" %}
{{ t.abstract }}
{% endif %}

{% assign slides_ok = t.slides and t.slides != "" %}
{% assign rec_ok = t.recording and t.recording != "" %}

{% if slides_ok or rec_ok %}
**Links:**{% if slides_ok %} [Slides]({{ t.slides }}){% endif %}{% if slides_ok and rec_ok %} ·{% endif %}{% if rec_ok %} [Recording]({{ t.recording }}){% endif %}
{% endif %}

---
{% endfor %}

## Past talks
{% for t in site.data.quantum_recife.past %}
### {{ t.title }}

**{{ t.speaker }}** ({{ t.affiliation }})  
{{ t.date }} — {{ t.location }}

{% if t.abstract and t.abstract != "" %}
{{ t.abstract }}
{% endif %}

{% assign slides_ok = t.slides and t.slides != "" %}
{% assign rec_ok = t.recording and t.recording != "" %}

{% if slides_ok or rec_ok %}
**Links:**{% if slides_ok %} [Slides]({{ t.slides }}){% endif %}{% if slides_ok and rec_ok %} ·{% endif %}{% if rec_ok %} [Recording]({{ t.recording }}){% endif %}
{% endif %}

---
{% endfor %}
