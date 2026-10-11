/* QRC course self-check. No libraries. Reads window.QRC_DIAGNOSTIC (diagnostic-data.js) for questions
   and window.QRC_DIRECTORY (resources.js) for resource names and links. Renders into <div id="qrc-check">.
   Nothing is stored or sent anywhere: answers live only in the open page.
   Screens: choose a course (no hash) → questions (#102, #103, #140, #155) → results (same page, after "See my results"). */
(function () {
  "use strict";
  var X = window.QRC_DIAGNOSTIC, D = window.QRC_DIRECTORY || { entries: [], guides: [] };
  var root = document.getElementById("qrc-check");
  if (!X || !root) return;

  var LEVEL = {}, ENTRY = {}, GUIDE = {};
  X.levels.forEach(function (l) { LEVEL[l.id] = l; });
  (D.entries || []).forEach(function (e) { ENTRY[e.id] = e; });
  (D.guides || []).forEach(function (g) { GUIDE[g.id] = g; });
  var DIRECTORY = "index.html";

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = math(attrs[k]);
      else if (k === "class") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  /* {{a|b}} → stacked fraction */
  function math(s) { return String(s).replace(/\{\{(.+?)\|(.+?)\}\}/g, '<span class="dg-frac"><span>$1</span><span>$2</span></span>'); }
  function plain(s) { var d = document.createElement("div"); d.innerHTML = String(s).replace(/\{\{(.+?)\|(.+?)\}\}/g, "($1)/($2)").replace(/<sup>/g, "^").replace(/<\/sup>/g, ""); return d.textContent; }

  /* stable shuffle so options don't always put the answer first */
  function seeded(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return function () { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }
  function shuffled(item, key) {
    var idx = item.opts.map(function (_, i) { return i; }), r = seeded(key);
    for (var i = idx.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    return idx;
  }

  var view = el("div", { class: "dg-view" });
  root.appendChild(view);
  function draw(nodes) { view.textContent = ""; nodes.forEach(function (n) { if (n) view.appendChild(n); }); window.scrollTo(0, root.offsetTop - 10 > 0 ? root.offsetTop - 10 : 0); }
  function back(href, text) { return el("p", { class: "qd-back" }, [el("a", { href: href, text: text })]); }
  function person() {
    var p = D.meta && D.meta.person;
    return p ? el("p", { class: "qd-person" }, [el("b", { text: "Want to talk to someone? " }), p.text + " ", el("a", { href: DIRECTORY + "#" + p.link, text: "More ways to get help" })]) : null;
  }

  /* ---------- screen 1: choose a course ---------- */
  function choose() {
    var list = el("ul", { class: "dg-levels" });
    X.levels.forEach(function (l) {
      list.appendChild(el("li", null, [el("a", { href: "#" + l.id }, [
        el("span", { class: "dg-course", text: l.course }),
        el("b", { text: l.name }),
        el("span", { class: "dg-covers", text: l.covers }),
        l.text ? el("span", { class: "dg-text", text: "Text: " + l.text }) : null,
        el("span", { class: "dg-who", text: "Prerequisite: " + l.who })
      ])]));
    });
    return [
      el("h2", { class: "qd-ask", text: "Which course are you in, or headed to?" }),
      el("p", { class: "qd-blurb", text: "About 16 to 18 questions, 10 to 15 minutes. You'll get a list of the skills to work on, with QRC worksheets and free resources for each. Use paper and pencil, and pick \"I'm not sure\" rather than guessing: an honest result is more useful." }),
      list,
      el("p", { class: "dg-note" }, ["This is a self-check, not a placement test. Placement into MATH 102, 103, and 140 comes from ALEKS (", el("a", { href: DIRECTORY + "#guide-aleks", text: "how ALEKS works" }), "). Nothing you enter here is saved or sent anywhere."]),
      person()
    ];
  }

  /* ---------- screen 2: questions ---------- */
  function quiz(l) {
    var form = el("form", { class: "dg-form", novalidate: "novalidate" });
    var n = 0, total = 0;
    l.areas.forEach(function (a) { total += a.items.length; });
    var counter = el("p", { class: "dg-progress", "aria-live": "polite" });
    l.areas.forEach(function (a) {
      var fs = el("fieldset", { class: "dg-area" }, [el("legend", null, [el("span", { class: "dg-areaname", text: a.name }), a.ready ? el("span", { class: "qd-tag", text: "Coming in" }) : null])]);
      a.items.forEach(function (it, k) {
        n++;
        var name = "q-" + l.id + "-" + a.id + "-" + k;
        var order = shuffled(it, name);
        var q = el("div", { class: "dg-q" }, [el("p", { class: "dg-qtext" }, [el("span", { class: "dg-num", text: n + "." }), el("span", { html: it.q })])]);
        var opts = el("div", { class: "dg-opts" });
        order.forEach(function (oi) {
          var id = name + "-" + oi;
          opts.appendChild(el("label", { class: "dg-opt", for: id }, [el("input", { type: "radio", name: name, id: id, value: String(oi) }), el("span", { html: it.opts[oi] })]));
        });
        var nsid = name + "-ns";
        opts.appendChild(el("label", { class: "dg-opt is-ns", for: nsid }, [el("input", { type: "radio", name: name, id: nsid, value: "ns" }), el("span", { text: "I'm not sure" })]));
        q.appendChild(opts);
        fs.appendChild(q);
      });
      form.appendChild(fs);
    });
    var submit = el("button", { type: "submit", class: "dg-submit", text: "See my results" });
    var hint = el("p", { class: "dg-hint" });
    form.appendChild(el("div", { class: "dg-actions" }, [submit, hint]));
    function count() {
      var answered = 0;
      l.areas.forEach(function (a) { a.items.forEach(function (_, k) { if (form.querySelector('input[name="q-' + l.id + "-" + a.id + "-" + k + '"]:checked')) answered++; }); });
      counter.textContent = answered + " of " + total + " answered";
      hint.textContent = answered < total ? "Unanswered questions count as \"I'm not sure.\"" : "";
    }
    form.addEventListener("change", count);
    form.addEventListener("submit", function (ev) { ev.preventDefault(); draw(results(l, form)); });
    count();
    return [
      back("#", "← Choose a different course"),
      el("header", { class: "qd-topichead" }, [
        el("div", { class: "qd-guide-label", text: l.course + " self-check" }),
        el("h2", { text: l.name }),
        el("p", { class: "qd-blurb", text: l.covers }),
        l.text ? el("p", { class: "dg-textline", text: "Course text: " + l.text + ". Section numbers in your results refer to it." }) : null,
        el("p", { class: "qd-need", text: "Areas marked \"Coming in\" are skills the course expects you to bring with you." })
      ]),
      counter, form
    ];
  }

  /* ---------- screen 3: results ---------- */
  function resourceNode(f) {
    var a, label;
    if (f.ref && ENTRY[f.ref]) { a = el("a", { href: ENTRY[f.ref].url, target: "_blank", rel: "noopener", class: "qd-rlink", text: ENTRY[f.ref].title }); }
    else if (f.guide && GUIDE[f.guide]) { a = el("a", { href: DIRECTORY + "#guide-" + f.guide, class: "qd-glink", text: GUIDE[f.guide].title }); }
    else if (f.url) { a = el("a", { href: f.url, target: "_blank", rel: "noopener", class: "qd-rlink", text: f.label || f.url }); }
    else return null;
    return el("li", null, [a, f.where ? el("span", { class: "dg-where", html: " — " + f.where }) : null]);
  }

  function results(l, form) {
    var rows = l.areas.map(function (a) {
      var right = 0, detail = [];
      a.items.forEach(function (it, k) {
        var c = form.querySelector('input[name="q-' + l.id + "-" + a.id + "-" + k + '"]:checked');
        var v = c ? c.value : "ns";
        var ok = v === "0";
        if (ok) right++;
        detail.push({ it: it, ok: ok, ns: v === "ns", pick: v === "ns" ? null : +v });
      });
      var status = right === a.items.length ? "solid" : right === 0 ? "gap" : "shaky";
      return { a: a, right: right, status: status, detail: detail };
    });
    var need = rows.filter(function (r) { return r.status !== "solid"; })
      .sort(function (x, y) { return (y.a.ready ? 2 : 0) - (x.a.ready ? 2 : 0) || (x.status === "gap" ? -1 : 1) - (y.status === "gap" ? -1 : 1); });
    var solid = rows.filter(function (r) { return r.status === "solid"; });
    var readyGaps = rows.filter(function (r) { return r.a.ready && r.status === "gap"; }).length;

    var out = [back("#" + l.id, "← Back to the questions"), el("header", { class: "qd-topichead" }, [
      el("div", { class: "qd-guide-label", text: l.course + " self-check · your results" }),
      el("h2", { text: need.length ? "Here's where to start" : "You're solid on everything here" })
    ])];

    var stats = el("div", { class: "dg-stats" });
    [["solid", "Solid"], ["shaky", "Shaky"], ["gap", "To work on"]].forEach(function (s) {
      var c = rows.filter(function (r) { return r.status === s[0]; }).length;
      stats.appendChild(el("div", { class: "dg-stat is-" + s[0] }, [el("b", { text: String(c) }), el("span", { text: s[1] })]));
    });
    out.push(stats);

    var advice = [];
    if (readyGaps && l.prev) advice.push(el("p", null, ["Some of the skills this course builds on need work. The ", el("a", { href: "#" + l.prev, text: LEVEL[l.prev].course + " self-check" }), " can pinpoint them."]));
    if (!need.length && l.next) advice.push(el("p", null, ["Nice work. To see what's coming next, try the ", el("a", { href: "#" + l.next, text: LEVEL[l.next].course + " self-check" }), "."]));
    if (need.length) advice.push(el("p", null, ["Work through these in order, one or two a week. Bring this list to QRC drop-in tutoring; a tutor can start right where you are."]));
    if (advice.length) out.push(el("div", { class: "dg-advice" }, advice));

    if (need.length) {
      var list = el("ol", { class: "dg-recs" });
      need.forEach(function (r) {
        var res = el("ul", { class: "dg-res" });
        (r.a.worksheets || []).forEach(function (w) {
          res.appendChild(el("li", null, [
            w.file ? el("a", { href: w.file, target: "_blank", rel: "noopener", text: w.title }) : el("span", { class: "dg-ws", text: w.title }),
            el("span", { class: "qd-tag pick", text: "QRC worksheet" }),
            w.file ? null : el("span", { class: "dg-where", text: " — ask for a printed copy at the QRC desk." })
          ]));
        });
        (r.a.free || []).forEach(function (f) { var n = resourceNode(f); if (n) res.appendChild(n); });
        list.appendChild(el("li", { class: "dg-rec is-" + r.status }, [
          el("div", { class: "dg-rechead" }, [el("b", { text: r.a.name }), el("span", { class: "dg-chip is-" + r.status, text: r.status === "gap" ? "To work on" : "Shaky" }), r.a.ready ? el("span", { class: "qd-tag", text: "Coming in" }) : null]),
          el("p", { class: "dg-why", text: r.a.why }),
          res
        ]));
      });
      out.push(list);
    }
    if (l.further) {
      var fl = el("ul", { class: "dg-res" });
      (l.further.items || []).forEach(function (f) {
        if (f.section) fl.appendChild(el("li", null, [el("a", { href: DIRECTORY + "#" + f.section, class: "qd-glink", text: f.label || f.section })]));
        else { var n = resourceNode(f); if (n) fl.appendChild(n); }
      });
      out.push(el("div", { class: "dg-further" }, [el("div", { class: "qd-guide-label", text: "Going further" }), el("p", { class: "dg-why", text: l.further.intro }), fl]));
    }
    if (solid.length) {
      var chips = el("p", { class: "dg-solid" }, [el("b", { text: "Solid: " })]);
      solid.forEach(function (r, i) { chips.appendChild(document.createTextNode((i ? " · " : "") + r.a.name)); });
      out.push(chips);
    }

    /* review answers */
    var rev = el("ol", { class: "dg-review" });
    rows.forEach(function (r) {
      r.detail.forEach(function (d) {
        rev.appendChild(el("li", { class: d.ok ? "is-ok" : "is-miss" }, [
          el("p", { class: "dg-qtext" }, [el("span", { html: d.it.q })]),
          el("p", null, [el("b", { text: d.ok ? "Correct: " : (d.ns ? "Not sure. Answer: " : "Answer: ") }), el("span", { html: d.it.opts[0] })]),
          !d.ok && !d.ns ? el("p", { class: "dg-yours" }, ["You chose: ", el("span", { html: d.it.opts[d.pick] })]) : null,
          el("p", { class: "dg-explain", html: d.it.explain })
        ]));
      });
    });
    out.push(el("details", { class: "qd-more" }, [el("summary", { text: "Review every question with explanations" }), rev]));

    /* copy for a tutor */
    var summary = [l.course + " self-check (QRC)"];
    rows.forEach(function (r) { summary.push((r.status === "solid" ? "Solid" : r.status === "shaky" ? "Shaky" : "To work on") + ": " + r.a.name + " (" + r.right + "/" + r.a.items.length + ")"); });
    var text = summary.join("\n");
    var btn = el("button", { type: "button", class: "qd-copy", text: "Copy results for a tutor" });
    var pre = el("pre", { class: "qd-box", text: text });
    btn.addEventListener("click", function () {
      function done() { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = "Copy results for a tutor"; }, 1600); }
      function fallback() { var r = document.createRange(); r.selectNodeContents(pre); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "Selected: press Ctrl+C or Cmd+C"; }
      try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
    });
    out.push(el("div", { class: "qd-boxwrap" }, [pre, btn]));

    var nav = el("p", { class: "qd-others" }, [el("a", { href: "#", text: "Choose another course" })]);
    if (l.prev) nav.append(" · ", el("a", { href: "#" + l.prev, text: LEVEL[l.prev].course + " check" }));
    if (l.next) nav.append(" · ", el("a", { href: "#" + l.next, text: LEVEL[l.next].course + " check" }));
    nav.append(" · ", el("a", { href: DIRECTORY, text: "Resource directory" }));
    out.push(nav, person());
    return out;
  }

  function route() {
    var h = (location.hash || "").replace("#", "");
    draw(LEVEL[h] ? quiz(LEVEL[h]) : choose());
  }
  window.addEventListener("hashchange", route);
  route();
})();
