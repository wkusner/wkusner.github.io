---
layout: page
permalink: /posts/
title: posts
shorttitle:
---

<h2>recent and not so recent posts</h2>

Welcome to my secret list of posts, supposedly not linked elsewhere! 


<ul>
{% for post in site.posts %}
<li>
 <a href="{{ post.url }}">{{ post.title }}</a> ({{ post.date | date_to_long_string }})
</li>
{% endfor %}
</ul>
