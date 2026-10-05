/* QRC Resource Directory renderer. No libraries. Reads window.QRC_DIRECTORY (resources.js)
   and renders into <div id="qrc-directory">. Works from GitHub Pages, a college web server, or a local file.

   Four screens, chosen by the address hash:
     (none)              home: a "talk to a person" line, search, and topic buttons (data.home)
     #<section id>       one topic: its top picks, with everything else folded under "More options"
     #all, #student, #tutor, #faculty, #staff   browse: every section in that audience view (data.views)
   Typing in the search box shows matching entries from anywhere. */
(function () {
  "use strict";
  var D = window.QRC_DIRECTORY;
  var root = document.getElementById("qrc-directory");
  if (!D || !root) return;

  var SECT = {}, VIEW = {};
  D.sections.forEach(function (s) { SECT[s.id] = s; });
  (D.views || []).forEach(function (v) { VIEW[v.id] = v; });
  var HOME = (D.home || D.sections.map(function (s) { return s.id; })).filter(function (id) { return SECT[id]; });

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function norm(s) { return (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  D.entries.forEach(function (e) {
    e._h = norm([e.lu ? "used at lawrence" : "", e.title, e.by, e.note, e.start, e.type, e.level, (e.courses || []).join(" "), e.cost, SECT[e.section] ? SECT[e.section].short : ""].join(" "));
  });
  function inSection(id) {
    return D.entries.filter(function (e) { return e.section === id || (e.also || []).indexOf(id) >= 0; })
      .sort(function (a, b) { return rank(b, id) - rank(a, id); });
  }
  function isPick(e, sec) { return e.pick === true || (Array.isArray(e.pick) && e.pick.indexOf(sec) >= 0); }
  function rank(e, sec) { var p = isPick(e, sec); return (p ? 2 : 0) + (p && e.lu ? 1 : 0); }

  /* ---------- pieces ---------- */
  function entryNode(e, compact, sec) {
    var pk = isPick(e, sec || e.section);
    var tags = el("div", { class: "qd-tags" });
    if (pk) tags.appendChild(el("span", { class: "qd-tag pick", text: "QRC pick" }));
    if (e.lu) tags.appendChild(el("span", { class: "qd-tag lu", text: "Used at Lawrence" }));
    tags.appendChild(el("span", { class: "qd-tag type", text: e.type }));
    if (e.cost) tags.appendChild(el("span", { class: "qd-tag", text: e.cost }));
    if (!compact) (e.courses || []).forEach(function (c) { tags.appendChild(el("span", { class: "qd-tag", text: c })); });
    var kids = [
      el("div", { class: "qd-title" }, [el("a", { href: e.url, target: "_blank", rel: "noopener" }, [e.title])]),
      el("div", { class: "qd-by", text: e.by }),
      tags,
      el("p", { class: "qd-note", text: e.note })
    ];
    if (e.start) kids.push(el("p", { class: "qd-start" }, [el("b", { text: "Start: " }), e.start]));
    return el("li", { class: "qd-entry" + (pk && !compact ? " is-pick" : "") + (compact ? " is-compact" : "") }, kids);
  }
  function personLine() {
    var p = D.meta.person;
    if (!p) return null;
    return el("p", { class: "qd-person" }, [el("b", { text: "Want to talk to someone? " }), p.text + " ",
      el("a", { href: "#" + p.link, text: "More ways to get help" })]);
  }
  function backLink() { return el("p", { class: "qd-back" }, [el("a", { href: "#", text: "← All topics" })]); }

  /* ---------- screens ---------- */
  function home() {
    var grid = el("ul", { class: "qd-topics" });
    HOME.forEach(function (id) {
      var s = SECT[id];
      grid.appendChild(el("li", null, [el("a", { href: "#" + id }, [el("b", { text: s.short }), el("span", { text: s.need })])]));
    });
    var others = el("p", { class: "qd-others" }, [
      el("span", { text: "Not a student? " }),
      el("a", { href: "#tutor", text: "For tutors" }), " · ",
      el("a", { href: "#faculty", text: "For faculty" }), " · ",
      el("a", { href: "#staff", text: "For staff" }), " · ",
      el("a", { href: "#all", text: "Browse all " + D.entries.length + " resources" })
    ]);
    return [personLine(), el("h2", { class: "qd-ask", text: "What are you working on?" }), grid, others];
  }

  function topic(id) {
    var s = SECT[id], items = inSection(id);
    var picks = items.filter(function (e) { return isPick(e, id); }).slice(0, 3);
    if (!picks.length) picks = items.slice(0, 2);
    var rest = items.filter(function (e) { return picks.indexOf(e) < 0; });
    var out = [backLink(), el("header", { class: "qd-topichead" }, [
      el("h2", { text: s.title }), el("p", { class: "qd-need", text: s.need }), el("p", { class: "qd-blurb", text: s.blurb })])];
    out.push(el("h3", { class: "qd-sub", text: picks.length > 1 ? "Try these first" : "Try this first" }));
    var ul = el("ul", { class: "qd-list" });
    picks.forEach(function (e) { ul.appendChild(entryNode(e, false, id)); });
    out.push(ul);
    if (rest.length) {
      var more = el("ul", { class: "qd-list" });
      rest.forEach(function (e) { more.appendChild(entryNode(e, true, id)); });
      out.push(el("details", { class: "qd-more" }, [el("summary", { text: "More options (" + rest.length + ")" }), more]));
    }
    if (id !== "start") out.push(personLine());
    out.push(backLink());
    return out;
  }

  function browse(viewId) {
    var v = VIEW[viewId] || VIEW.all || { id: "all", label: "Everyone", sections: null };
    var ids = v.sections ? v.sections.filter(function (x) { return SECT[x]; }) : D.sections.map(function (s) { return s.id; });
    var switcher = el("p", { class: "qd-others" }, [el("span", { text: "Show: " })]);
    (D.views || []).forEach(function (w, i) {
      if (i) switcher.appendChild(document.createTextNode(" · "));
      switcher.appendChild(w.id === v.id ? el("b", { text: w.label }) : el("a", { href: "#" + w.id, text: w.label }));
    });
    var title = v.id === "all" ? "All resources" : "For " + v.label.toLowerCase();
    var out = [backLink(), el("header", { class: "qd-topichead" }, [el("h2", { text: title }), v.intro ? el("p", { class: "qd-blurb", text: v.intro }) : null]), switcher];
    var toc = el("ul", { class: "qd-toc" });
    ids.forEach(function (id) { toc.appendChild(el("li", null, [el("a", { href: "#" + id, text: SECT[id].short })])); });
    out.push(el("nav", { "aria-label": "Topics in this view" }, [toc]));
    ids.forEach(function (id) {
      var items = inSection(id).filter(function (e) { return v.id === "all" || (e.audience || []).indexOf(v.id) >= 0; });
      if (!items.length) return;
      var ul = el("ul", { class: "qd-list" });
      items.forEach(function (e) { ul.appendChild(entryNode(e, true, id)); });
      out.push(el("section", { class: "qd-section" }, [
        el("header", null, [el("h2", null, [el("a", { href: "#" + id, class: "qd-plain", text: SECT[id].title })]), el("p", { class: "qd-need", text: SECT[id].need })]), ul]));
    });
    return out;
  }

  function results(q) {
    var terms = norm(q).split(/\s+/).filter(Boolean);
    var hits = D.entries.filter(function (e) { return terms.every(function (t) { return e._h.indexOf(t) >= 0; }); })
      .sort(function (a, b) { return rank(b, b.section) - rank(a, a.section); });
    var out = [el("p", { class: "qd-count", "aria-live": "polite", text: hits.length + (hits.length === 1 ? " result" : " results") + " for “" + q + "”" })];
    if (!hits.length) {
      out.push(el("p", { class: "qd-blurb" }, ["Nothing matched. Try a course number like MATH 140, a tool like Excel, or ", el("a", { href: "#", text: "pick a topic" }), "."]));
      out.push(personLine());
      return out;
    }
    var ul = el("ul", { class: "qd-list" });
    hits.forEach(function (e) {
      var li = entryNode(e, true);
      li.insertBefore(el("div", { class: "qd-where" }, [el("a", { href: "#" + e.section, text: SECT[e.section].short })]), li.firstChild);
      ul.appendChild(li);
    });
    out.push(ul);
    return out;
  }

  /* ---------- shell ---------- */
  var search = el("input", { type: "search", id: "qd-q", placeholder: "Search: MATH 140, Excel, ALEKS, p-values…", "aria-label": "Search the directory" });
  var bar = el("div", { class: "qd-controls" }, [el("div", { class: "qd-search" }, [search])]);
  var view = el("div", { class: "qd-view" });
  root.appendChild(bar);
  root.appendChild(view);

  function draw(nodes) {
    view.textContent = "";
    nodes.forEach(function (n) { if (n) view.appendChild(n); });
  }
  function route(scroll) {
    var q = search.value.trim();
    if (q) { draw(results(q)); return; }
    var h = (location.hash || "").replace("#", "");
    if (SECT[h]) draw(topic(h));
    else if (VIEW[h]) draw(browse(h));
    else draw(home());
    if (scroll && (h || window.scrollY > root.offsetTop)) root.scrollIntoView({ block: "start" });
  }
  search.addEventListener("input", function () { route(false); });
  window.addEventListener("hashchange", function () {
    if (search.value) search.value = "";
    route(true);
  });
  route(false);
})();
