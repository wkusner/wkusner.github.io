---
layout: page
permalink: /posts/
title: posts
shorttitle:
---

<ul>
{% for post in site.posts %}
<li>
<a href="{{ post.url }}">{{ post.title }}</a>
</li>
{% endfor %}
</ul>