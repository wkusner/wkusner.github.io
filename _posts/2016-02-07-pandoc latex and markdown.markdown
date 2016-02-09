---
layout: post
title:  pandoc latex and markdown
date:   2016-02-06 19:59:20
categories: projects
---

### A Cheatsheet: ###

[cheatsheet.][cs]


---
---


###Adding Math:###
An important element of some of these posts will be converting a typographic language I know to markdown.

I discovered [pandoc][pandoc], but it does not seem to display mathematics very well in any form. It seems 
vastly inferior to anything coming from latex; I have never really seen good math typesetting online. I 
think the solution is to link pdf documents anytime I want to include more detailed typsetting.


---



####Example:####
From latex:

`$$\frac{1}{n}\sum_{i=1}^n \alpha_r(|a_i|)$$`


To markdown_strict:
`$$\\frac{1}{n}\\sum\_{i=1}^n \\alpha\_r(|a\_i|)$$`

$$\\frac{1}{n}\\sum\_{i=1}^n \\alpha\_r(|a\_i|)$$

To HTML5:

`<p><span class="math display">\[\frac{1}{n}\sum_{i=1}^n \alpha_r(|a_i|)\]</span></p>`

<p><span class="math display">\[\frac{1}{n}\sum_{i=1}^n \alpha_r(|a_i|)\]</span></p>

I am not even going to try to demonstrate some of the other output.  Maybe the HTML looks better in a different browser?



---
---


###Adding Photos:### 

Also, I want to add photos to posts, this is much better, even though there is no apparent image size control in markdown.  I'll use this syntax, taken from [the horse's mouth][df] for inline images 

`![alt text omg](/assets/placeholder.jpg "placeholder title in quotes")`

![alt text omg](/assets/placeholder.jpg "placeholder title in quotes")

and this for referenced images (i think this is my preference)

`![alt text omg][placeholder]` with reference `[placeholder]: /assets/placeholder.jpg "placeholder title in quotes"`

![alt text omg][placeholder]

where "alt text omg" displays when the image is not linked properly (duh).

![alt text omg](/assets/placeholde.jpg "placeholder title in quotes")



[pandoc]: http://pandoc.org/

[placeholder]: /assets/placeholder.jpg "placeholder title in quotes"

[df]: http://daringfireball.net/projects/markdown/syntax

[cs]: http://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet