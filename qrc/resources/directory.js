/* QRC Resource Directory renderer. No libraries. Reads window.QRC_DIRECTORY (resources.js)
   and renders into <div id="qrc-directory">. Works from GitHub Pages, a college web server, or a local file.

   Four screens, chosen by the address hash:
     (none)              home: a "talk to a person" line, search, and topic buttons (data.home)
     #<section id>       one topic: its start-here guide, its top picks, and everything else folded under "More options"
     #guide-<id>         one short guide (data.guides)
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
  /* ---------- guides: short QRC-written on-ramps ---------- */
  var GUIDE = {}, ENTRY = {};
  D.entries.forEach(function (e) { ENTRY[e.id] = e; });
  (D.guides || []).forEach(function (g) { GUIDE[g.id] = g; });
  var TOKEN = /\[\[([^\]]+)\]\]/g;
  function resolve(tok) {
    var bar = tok.indexOf("|"), target = bar < 0 ? tok : tok.slice(0, bar), label = bar < 0 ? "" : tok.slice(bar + 1);
    if (target.indexOf("guide:") === 0) { var g = GUIDE[target.slice(6)]; return g ? { href: "#guide-" + g.id, text: label || g.title, cls: "qd-glink" } : null; }
    if (target.charAt(0) === "#") { var s = SECT[target.slice(1)]; return s ? { href: target, text: label || s.short, cls: "qd-glink" } : null; }
    var e = ENTRY[target]; return e ? { href: e.url, text: label || e.title, cls: e.internal ? "qd-glink" : "qd-rlink", ext: !e.internal } : null;
  }
  function rich(text) {
    var out = [], last = 0, m;
    text = text || "";
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      var r = resolve(m[1]);
      if (r) out.push(el("a", r.ext ? { href: r.href, class: r.cls, target: "_blank", rel: "noopener" } : { href: r.href, class: r.cls }, [r.text]));
      else out.push(m[1]);
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }
  function plain(text) { return (text || "").replace(TOKEN, function (all, tok) { var r = resolve(tok); return " " + (r ? r.text : tok) + " "; }); }
  (D.guides || []).forEach(function (g) {
    var bits = [g.title, g.intro, g.tip, g.box];
    (g.parts || []).forEach(function (p) { bits.push(p.h, p.p, (p.ol || []).join(" ")); });
    g._h = norm(plain(bits.join(" ")) + " guide");
  });
  function guideCard(g) {
    return el("li", null, [el("a", { href: "#guide-" + g.id }, [
      el("b", { text: g.title }), el("span", { text: g.intro || "" }), el("em", { text: g.minutes + " min read" })])]);
  }
  function guideBody(g) {
    var topicKind = g.kind === "topic";
    var kids = [el("div", { class: "qd-guide-label", text: "QRC guide · " + g.minutes + " min read" })];
    kids.push(el(topicKind ? "h3" : "h2", { class: "qd-guide-title", text: g.title }));
    if (g.intro) kids.push(el("p", { class: "qd-guide-intro" }, rich(g.intro)));
    (g.parts || []).forEach(function (p) {
      if (topicKind) {
        var hp = p.h.split(" · ");
        kids.push(el("div", { class: "qd-step" }, [el("div", { class: "qd-when" }, [hp[0], hp[1] ? el("small", { text: hp[1] }) : null]), el("p", null, rich(p.p))]));
      } else {
        kids.push(el("h3", { class: "qd-guide-h", text: p.h }));
        if (p.p) kids.push(el("p", null, rich(p.p)));
        if (p.ol) { var ol = el("ol", { class: "qd-guide-ol" }); p.ol.forEach(function (t) { ol.appendChild(el("li", null, rich(t))); }); kids.push(ol); }
      }
    });
    if (g.box) {
      var pre = el("pre", { class: "qd-box", text: g.box });
      var btn = el("button", { type: "button", class: "qd-copy", text: "Copy text" });
      btn.addEventListener("click", function () {
        function done() { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = "Copy text"; }, 1600); }
        function fallback() { var r = document.createRange(); r.selectNodeContents(pre); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); btn.textContent = "Selected: press Ctrl+C or Cmd+C"; }
        try { navigator.clipboard.writeText(g.box).then(done, fallback); } catch (e) { fallback(); }
      });
      kids.push(el("div", { class: "qd-boxwrap" }, [pre, btn]));
    }
    if (g.tip) kids.push(el("p", { class: "qd-tip" }, [el("b", { text: "Tip " })].concat(rich(g.tip))));
    return el("article", { class: "qd-guide" + (topicKind ? " is-topic" : "") }, kids);
  }
  function homeGuides() {
    return (D.guides || []).filter(function (g) { return g.home; }).sort(function (a, b) { return a.home - b.home; });
  }

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
      el("div", { class: "qd-title" }, [el("a", e.internal ? { href: e.url } : { href: e.url, target: "_blank", rel: "noopener" }, [e.title])]),
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
    var hg = homeGuides(), first = el("ul", { class: "qd-guides" }), more = el("ul", { class: "qd-guides is-more" });
    hg.forEach(function (g, i) { (i < 4 ? first : more).appendChild(guideCard(g)); });
    var out = [personLine()];
    if (hg.length) out.push(el("h2", { class: "qd-ask", text: "New here? Start with a short guide" }), first);
    var sc = D.meta.selfcheck;
    if (sc) out.push(el("a", { class: "qd-cta", href: sc.link }, [el("span", { class: "qd-guide-label", text: "Self-check · MATH 102, 103, 140, 155" }), el("b", { text: sc.text }), el("span", { class: "qd-cta-go", text: "Start the self-check →" })]));
    out.push(el("h2", { class: "qd-ask", text: "What are you working on?" }), grid);
    if (hg.length > 4) out.push(el("h2", { class: "qd-ask is-small", text: "More short guides" }), more);
    out.push(others);
    return out;
  }

  function topic(id) {
    var s = SECT[id], items = inSection(id);
    var picks = items.filter(function (e) { return isPick(e, id); }).slice(0, 3);
    if (!picks.length) picks = items.slice(0, 2);
    var rest = items.filter(function (e) { return picks.indexOf(e) < 0; });
    var out = [backLink(), el("header", { class: "qd-topichead" }, [
      el("h2", { text: s.title }), el("p", { class: "qd-need", text: s.need }), el("p", { class: "qd-blurb", text: s.blurb })])];
    var tg = (D.guides || []).filter(function (g) { return g.kind === "topic" && g.section === id; })[0];
    if (tg) out.push(guideBody(tg));
    out.push(el("h3", { class: "qd-sub", text: tg ? "The QRC's picks" : (picks.length > 1 ? "Try these first" : "Try this first") }));
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
    var vg = (D.guides || []).filter(function (g) { return g.kind !== "topic" && (v.id === "all" || (g.audience || []).indexOf(v.id) >= 0); });
    if (vg.length) {
      var gl = el("ul", { class: "qd-guides" });
      vg.forEach(function (g) { gl.appendChild(guideCard(g)); });
      out.push(el("h3", { class: "qd-sub", text: "Short guides" }), gl);
    }
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

  function guidePage(g) {
    var out = [backLink(), guideBody(g)];
    if (g.section && SECT[g.section]) out.push(el("p", { class: "qd-others" }, [el("a", { href: "#" + g.section, text: "See every resource for " + SECT[g.section].short.toLowerCase() + " →" })]));
    var others = homeGuides().filter(function (x) { return x !== g; });
    if (g.home && others.length) {
      var gl = el("ul", { class: "qd-guides is-more" });
      others.forEach(function (x) { gl.appendChild(guideCard(x)); });
      out.push(el("h3", { class: "qd-sub", text: "Other short guides" }), gl);
    }
    if (g.id !== "first-visit") out.push(personLine());
    out.push(backLink());
    return out;
  }

  function results(q) {
    var terms = norm(q).split(/\s+/).filter(Boolean);
    var hits = D.entries.filter(function (e) { return terms.every(function (t) { return e._h.indexOf(t) >= 0; }); })
      .sort(function (a, b) { return rank(b, b.section) - rank(a, a.section); });
    var ghits = (D.guides || []).filter(function (g) { return terms.every(function (t) { return g._h.indexOf(t) >= 0; }); });
    var n = hits.length + ghits.length;
    var out = [el("p", { class: "qd-count", "aria-live": "polite", text: n + (n === 1 ? " result" : " results") + " for “" + q + "”" })];
    if (ghits.length) {
      var gl = el("ul", { class: "qd-guides" });
      ghits.forEach(function (g) { gl.appendChild(guideCard(g)); });
      out.push(gl);
    }
    if (!hits.length && ghits.length) return out;
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
    if (h.indexOf("guide-") === 0 && GUIDE[h.slice(6)]) draw(guidePage(GUIDE[h.slice(6)]));
    else if (SECT[h]) draw(topic(h));
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
