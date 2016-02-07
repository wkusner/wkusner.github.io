---
layout: post
title:  "pandoc, latex and markdown"
date:   2016-02-07 18:52:00
categories: projects
---
An important element of some of these posts will be converting a typographic language I know to markdown.

I discovered [pandoc][pandoc], but it does not seem to display mathematics very well in any form. It seems 
vastly inferior to anything coming from latex; I have never really seen good math typesetting online. I 
think the solution is to link pdf documents anytime I want to include more detailed typsetting.


Also, I want to add photos to posts: Even though there is no apparent image size control in markdown,
I'll use this syntax, taken from [the horse's mouth][df] for inline images 

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