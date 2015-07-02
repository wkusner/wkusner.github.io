## Branch of Louis's Home Page

## About 

This repo is a modified version of the [Jekyll][jekyll] source to Louis Theran's 
home page template.  As such, this README is an annotated version of that found [here.](https://github.com/theran/theran.github.io/tree/template)

## License

The code and layouts are derived from Jekyll, and inherit that
license.  

[jekyll]: http://jekyllrb.com/

## Documentation

At the moment, this is somewhat modular, except for the home page at 
`index.html` and the CV and `CV.html` which contain some free text 
inside the Liquid templates.

Below is a quick guide to some of the features.


### Editing
To have posts added to link bar at top of page, add a shorttitle in their md file

Edit the `_includes/aboutme.md` file to change the main page body content.
Edit the `_includes/picture.html` to pull a picture from the `_assets` folder and also change title and affiliations.  
The `_index.html` file in the main folder should be used to collate other pieces.
The `_includes/footer.html` file can be edited to remove the github and twitter links etc.
The `_layouts` has various templates for collections/.md files. 

### Papers

These are part of the collection `_papers`.  (This folder should be added.)  A typical journal article 
frontmatter looks like this:

~~~~~~~~~~~~~~
---
layout: paper
type: journal
arxiv: 1008.1837
doi: 10.1016/j.aim.2012.10.007
journal: advances
authors:
    - justin
    - louis
title: Generic combinatorial rigidity of periodic frameworks
year: 2013
volume: 233
issue: 1
pages: 291–331
---
~~~~~~~~~~~~~~

The body is the abstract.  
See this site for conference and preprint examples.  Authors conferences and journals 
are listed in `_data/authors.yml`, `_data/conferences.yml`, and `_data/journals.yml`.
This is enough to automatically generate your bibliography.

### CV

See `CV.html` for a semi-automated CV generator, that should be somewhat updatable.

### Styling

This is derived pretty closely from the Jekyll default.  I've (Louis) tried to make 
things even a little more modular, but I only noticed how SCSS mixins work
recently, so more can be done.