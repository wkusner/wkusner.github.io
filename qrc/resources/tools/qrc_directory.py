#!/usr/bin/env python3
"""QRC Resource Directory tools (Python 3 standard library only).

Run from the resources/ folder:

  python3 tools/qrc_directory.py export   # writes static.html and resources.csv from resources.js
  python3 tools/qrc_directory.py check    # tests every link and prints a report

`export` makes a no-JavaScript version for content systems that strip scripts:
paste the <main> section of static.html into the CMS, or upload the CSV.
`check` should be run once a term (links move). It only reads the web; it changes nothing.
"""
import csv
import html
import json
import os
import re
import sys
import urllib.request
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
MARK = "\nwindow.QRC_DIRECTORY ="


def load():
    with open(os.path.join(BASE, "resources.js"), encoding="utf-8") as f:
        text = f.read()
    start = text.index(MARK) + len(MARK)
    return json.loads(text[start:text.rindex(";")])


TOKEN = re.compile(r"\[\[([^\]]+)\]\]")


def guide_html(d, g, level):
    """Render one guide as plain HTML. Tokens: [[entry-id]], [[guide:id]], [[#section]], each with optional |label."""
    e = html.escape
    entries = {x["id"]: x for x in d["entries"]}
    guides = {x["id"]: x for x in d.get("guides", [])}
    sects = {x["id"]: x for x in d["sections"]}

    def rich(text):
        out, last = [], 0
        for m in TOKEN.finditer(text or ""):
            out.append(e(text[last:m.start()]))
            target, _, label = m.group(1).partition("|")
            if target.startswith("guide:") and target[6:] in guides:
                out.append(f"<a href=\"#guide-{e(target[6:])}\">{e(label or guides[target[6:]]['title'])}</a>")
            elif target.startswith("#") and target[1:] in sects:
                out.append(f"<a href=\"{e(target)}\">{e(label or sects[target[1:]]['short'])}</a>")
            elif target in entries:
                out.append(f"<a href=\"{e(entries[target]['url'])}\">{e(label or entries[target]['title'])}</a>")
            else:
                out.append(e(m.group(1)))
            last = m.end()
        out.append(e((text or "")[last:]))
        return "".join(out)

    h = f"h{level}"
    o = [f"<section class=\"guide\" id=\"guide-{e(g['id'])}\"><{h}>{e(g['title'])}</{h}>"
         f"<p class=\"meta\">QRC guide · {g.get('minutes', 2)} min read</p>"]
    if g.get("intro"):
        o.append(f"<p>{rich(g['intro'])}</p>")
    for part in g.get("parts", []):
        o.append(f"<p><strong>{e(part['h'])}.</strong> {rich(part.get('p', ''))}</p>" if part.get("p") else f"<p><strong>{e(part['h'])}</strong></p>")
        if part.get("ol"):
            o.append("<ol>" + "".join(f"<li>{rich(t)}</li>" for t in part["ol"]) + "</ol>")
    if g.get("box"):
        o.append(f"<pre>{e(g['box'])}</pre>")
    if g.get("tip"):
        o.append(f"<p><strong>Tip.</strong> {rich(g['tip'])}</p>")
    o.append("</section>\n")
    return "".join(o)


def export(d):
    e = html.escape
    out = []
    out.append("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
               "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
               f"<title>{e(d['meta']['title'])}</title>\n"
               "<style>body{font-family:Georgia,serif;line-height:1.55;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#262623;background:#fff}"
               "a{color:#004a87}h2{margin-top:2.2rem;border-bottom:2px solid #0a1231}li{margin:.9rem 0}.by,.meta{color:#5b5a52;font-size:.9em}"
               ".guide{border-top:3px solid #dba538;margin:1.4rem 0;padding-top:.4rem}pre{white-space:pre-wrap;font-family:Georgia,serif;background:#f7f4ec;padding:.8rem}"
               "@media (prefers-color-scheme:dark){body{background:#0a1231;color:#ede8d9}h2{border-color:#ede8d9}.by,.meta{color:#b9b4a5}a{color:#b7cfdf}pre{background:#121b40}}</style>\n"
               "<script src=\"/ga.js\" async></script>\n</head>\n<body>\n<main>\n")
    out.append(f"<h1>{e(d['meta']['title'])}</h1>\n<p>{e(d['meta']['owner'])}. Version {e(d['meta']['version'])}, updated {e(d['meta']['updated'])}. "
               "Free, vetted resources for quantitative work. Entries marked &#9733; are QRC picks.</p>\n")
    out.append("<nav><ul>\n")
    for s in d["sections"]:
        out.append(f"<li><a href=\"#{e(s['id'])}\">{e(s['title'])}</a>: {e(s['need'])}</li>\n")
    out.append("</ul></nav>\n")
    how = [g for g in d.get("guides", []) if g.get("kind") != "topic"]
    if how:
        out.append("<h2 id=\"guides\">Short guides</h2>\n")
        for g in how:
            out.append(guide_html(d, g, 3))
    for s in d["sections"]:
        items = [x for x in d["entries"] if x["section"] == s["id"] or s["id"] in x.get("also", [])]
        pk = lambda x: x.get("pick") is True or s["id"] in (x.get("pick") or [] if isinstance(x.get("pick"), list) else [])
        items.sort(key=lambda x: not pk(x))
        out.append(f"<h2 id=\"{e(s['id'])}\">{e(s['title'])}</h2>\n<p><em>{e(s['need'])}</em> {e(s['blurb'])}</p>\n")
        for g in d.get("guides", []):
            if g.get("kind") == "topic" and g.get("section") == s["id"]:
                out.append(guide_html(d, g, 3))
        out.append("<ul>\n")
        for x in items:
            star = ("&#9733; " if pk(x) else "") + ("<strong>[Used at Lawrence]</strong> " if x.get("lu") else "")
            meta = " · ".join([x["type"], x.get("cost", ""), x.get("level", "")] + x.get("courses", []))
            start = f"<br><strong>Start:</strong> {e(x['start'])}" if x.get("start") else ""
            out.append(f"<li>{star}<a href=\"{e(x['url'])}\">{e(x['title'])}</a> <span class=\"by\">({e(x['by'])})</span><br>"
                       f"{e(x['note'])}{start}<br><span class=\"meta\">{e(meta)}</span></li>\n")
        out.append("</ul>\n")
    out.append("</main>\n</body>\n</html>\n")
    with open(os.path.join(BASE, "static.html"), "w", encoding="utf-8") as f:
        f.write("".join(out))

    cols = ["id", "title", "url", "by", "section", "type", "audience", "level", "courses", "cost", "note", "start", "checked", "pick", "lu"]
    with open(os.path.join(BASE, "resources.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for x in d["entries"]:
            w.writerow(["; ".join(x.get(c) or []) if c in ("audience", "courses") else x.get(c) for c in cols])
    print(f"Wrote static.html and resources.csv ({len(d['entries'])} entries, {len(d.get('guides', []))} guides).")


def check(d):
    bad = []
    for x in d["entries"]:
        if x.get("internal"):
            continue
        req = urllib.request.Request(x["url"], headers={"User-Agent": "Mozilla/5.0 (QRC link check)"})
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                code, final = r.status, r.geturl()
        except Exception as ex:  # noqa: BLE001
            code, final = getattr(ex, "code", "ERR"), str(getattr(ex, "reason", ex))
        flag = "ok " if code == 200 else "!! "
        moved = f"  -> {final}" if code == 200 and final.rstrip("/") != x["url"].rstrip("/") else ""
        print(f"{flag}{code}  {x['id']:<22} {x['url']}{moved}")
        if code != 200:
            bad.append(x["id"])
    print(f"\n{len(d['entries']) - len(bad)} ok, {len(bad)} need a look. Checked {date.today().isoformat()}.")
    if bad:
        print("Fix or remove: " + ", ".join(bad))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    data = load()
    if cmd == "export":
        export(data)
    elif cmd == "check":
        check(data)
    else:
        print(__doc__)
