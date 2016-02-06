---
layout: page
permalink: /posts/
title: posts
shorttitle:
---

There is currently duplication and some form of case sensitive issue between /posts/ and /Posts/


<ul>
{% for post in site.posts %}
<li>
<a href="{{ post.url }}">{{ post.title }}</a>
</li>
{% endfor %}
</ul>