/* The Wending House: folio helpers. Shared drawing and interaction for the instrument folios.
   Folio.E(tag, attrs, parent)   make an SVG element (class/style go in attrs)
   Folio.T(text, attrs, parent)  SVG text
   Folio.defs(svg)               hatching patterns (#h45, #h135, #hx, #hdot, #hh, #hv, plus -r/-l rubric/lapis kin) and the ink filter (#rough)
   Folio.pt(svg, evt)            the pointer in the drawing's own units
   Folio.drag(el, svg, move, start, end)  pointer dragging, mouse and touch alike
   Folio.roman(n)                I, II, III …
   Folio.plates()                wire the plate tabs (buttons[data-plate] ↔ section.plate#id), with #hash
   Folio.glosses(root)           a gloss with data-g lights the parts of the drawing with the same data-g, and back
   Folio.wobble(points, amp, seed)  a hand-drawn polyline through points
   Folio.fmt(x, d)               a number with d places and a true minus sign */
(function(){
const NS = "http://www.w3.org/2000/svg";
function E(tag, a, p){ const e = document.createElementNS(NS, tag);
  // a fill given beside an ink class wins over the class's own fill:none
  if(a && a.fill && a.class && /(^|\s)(ink2?|faded|rub|lap|ver)(\s|$)/.test(a.class)){ a = Object.assign({}, a); a.style = `fill:${a.fill};` + (a.style || ""); }
  if(a) for(const k in a){ if(a[k] != null) e.setAttribute(k, a[k]); } if(p) p.appendChild(e); return e; }
function T(s, a, p){ const e = E("text", a, p); e.textContent = s; return e; }
// the patterns live once, in a hidden drawing of their own, so a plate that is put away does not take them with it
function defs(){
  if(document.getElementById("folio-defs")) return;
  const host = E("svg", {id:"folio-defs", width:0, height:0, "aria-hidden":"true", style:"position:absolute;width:0;height:0;overflow:hidden"});
  document.body.insertBefore(host, document.body.firstChild);
  const d = E("defs", {class:"folio"}, host);
  const hatch = (id, ang, gap, cls, w) => { const p = E("pattern", {id, width:gap, height:gap, patternUnits:"userSpaceOnUse", patternTransform:`rotate(${ang})`}, d);
    E("line", {x1:gap/2, y1:-1, x2:gap/2, y2:gap+1, class:cls, "stroke-width":w||.7}, p); };
  hatch("h45", 45, 4, "ink2"); hatch("h135", -45, 4, "ink2"); hatch("hh", 90, 4, "ink2"); hatch("hv", 0, 4, "ink2");
  hatch("h45w", 45, 7, "ink2", .55); hatch("h135w", -45, 7, "ink2", .55); hatch("hhw", 90, 6, "faded", .6);
  hatch("h45r", 45, 4, "rub"); hatch("h45l", 45, 4, "lap"); hatch("h135l", -45, 4, "lap"); hatch("h45v", 45, 4, "ver");
  const x = E("pattern", {id:"hx", width:5, height:5, patternUnits:"userSpaceOnUse", patternTransform:"rotate(45)"}, d);
  E("line", {x1:2.5,y1:-1,x2:2.5,y2:6,class:"ink2","stroke-width":.6}, x); E("line", {x1:-1,y1:2.5,x2:6,y2:2.5,class:"ink2","stroke-width":.6}, x);
  const dot = E("pattern", {id:"hdot", width:5, height:5, patternUnits:"userSpaceOnUse"}, d);
  E("circle", {cx:1.2, cy:1.2, r:.55, class:"fink2"}, dot); E("circle", {cx:3.7, cy:3.7, r:.45, class:"fink2"}, dot);
  const f = E("filter", {id:"rough", x:"-5%", y:"-5%", width:"110%", height:"110%"}, d);
  E("feTurbulence", {type:"fractalNoise", baseFrequency:".9", numOctaves:"2", seed:"3", result:"t"}, f);
  E("feDisplacementMap", {in:"SourceGraphic", in2:"t", scale:"1.6", xChannelSelector:"R", yChannelSelector:"G"}, f);
  const g = E("filter", {id:"bleed", x:"-5%", y:"-5%", width:"110%", height:"110%"}, d);
  E("feGaussianBlur", {stdDeviation:".35"}, g);
  return d;
}
function pt(svg, e){ const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
function drag(el, svg, move, start, end){
  el.addEventListener("pointerdown", ev => { ev.preventDefault(); ev.stopPropagation();
    const p0 = pt(svg, ev); if(start && start(p0, ev) === false) return;
    // listen on the window, so a redraw that replaces the handle mid-drag does not drop it
    const id = ev.pointerId, mv = e => { if(e.pointerId === id) move(pt(svg, e), e, p0); };
    const up = e => { if(e.pointerId !== id) return; window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); if(end) end(pt(svg, e), e); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up); });
}
function roman(n){ const r = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]]; let s = ""; for(const [v,c] of r) while(n >= v){ s += c; n -= v; } return s; }
function plates(onShow){
  const tabs = [...document.querySelectorAll("[data-plate]")], secs = tabs.map(b => document.getElementById(b.dataset.plate));
  const show = id => { tabs.forEach(b => { const on = b.dataset.plate === id; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
    secs.forEach(s => { if(s) s.hidden = s.id !== id; }); if(onShow) onShow(id); };
  tabs.forEach(b => b.addEventListener("click", () => { history.replaceState(null, "", "#" + b.dataset.plate); show(b.dataset.plate); }));
  const h = location.hash.slice(1); show(secs.some(s => s && s.id === h) ? h : tabs[0].dataset.plate);
  return show;
}
function glosses(root){
  root = root || document;
  root.querySelectorAll(".gloss[data-g]").forEach(gl => {
    const key = gl.dataset.g, parts = () => root.querySelectorAll(`svg [data-g="${key}"]`);
    gl.addEventListener("pointerenter", () => { gl.classList.add("on"); parts().forEach(p => p.classList.add("lit")); });
    gl.addEventListener("pointerleave", () => { gl.classList.remove("on"); parts().forEach(p => p.classList.remove("lit")); });
  });
  root.addEventListener("pointerover", e => { const p = e.target.closest && e.target.closest("svg [data-g]"); if(!p) return;
    root.querySelectorAll(`.gloss[data-g="${p.dataset.g}"]`).forEach(g => g.classList.add("on")); });
  root.addEventListener("pointerout", e => { const p = e.target.closest && e.target.closest("svg [data-g]"); if(!p) return;
    root.querySelectorAll(`.gloss[data-g="${p.dataset.g}"]`).forEach(g => g.classList.remove("on")); });
}
function rng(seed){ let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function wobble(P, amp, seed){ const r = rng(seed || 1); amp = amp == null ? .5 : amp;
  return P.map((p, i) => `${i ? "L" : "M"}${(p[0] + (r() - .5) * amp).toFixed(2)},${(p[1] + (r() - .5) * amp).toFixed(2)}`).join(""); }
function line(a, b, n, amp, seed){ const P = []; n = n || Math.max(2, Math.ceil(Math.hypot(b[0]-a[0], b[1]-a[1]) / 18)); for(let i = 0; i <= n; i++){ const t = i / n; P.push([a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t]); } return wobble(P, amp, seed); }
function fmt(x, d){ if(!isFinite(x)) return x > 0 ? "∞" : "−∞"; return x.toFixed(d == null ? 2 : d).replace(/^-/, "−"); }
/* the cabinet: every folio, in order. The running head of each page is written from this list. */
const FOLIOS = [
  {slug:"sector",      title:"The Sector",            sub:"Galileo's compass of proportion"},
  {slug:"napier",      title:"Napier's Bones",        sub:"and the rods that followed them"},
  {slug:"slide-rule",  title:"The Slide Rule",        sub:"logarithms you can slide"},
  {slug:"planimeters", title:"The Planimeter Bench",  sub:"area by tracing"},
  {slug:"cross-ratio", title:"The Cross-Ratio Ruler", sub:"distance read off a picture"},
  {slug:"so3-rule",    title:"The Rule of Turns",     sub:"a slide rule for rotations"}
];
const ORD = ["First","Second","Third","Fourth","Fifth","Sixth","Seventh","Eighth","Ninth","Tenth","Eleventh","Twelfth"];
// fill <div class="runhead" data-folio="slug"></div>: the house, the folio's number with its neighbours, and the cabinet
function runhead(){
  const h = document.querySelector(".runhead[data-folio]"); if(!h) return;
  const i = FOLIOS.findIndex(f => f.slug === h.dataset.folio), prev = FOLIOS[i - 1], next = FOLIOS[i + 1];
  h.innerHTML = `<a href="/palace/">The Wending House</a>
    <span class="folionav">${prev ? `<a href="/${prev.slug}/" title="${prev.title}" rel="prev">‹ ${prev.title}</a>` : ""}<a href="/folio/">Of Instruments · Folio the ${ORD[i]}</a>${next ? `<a href="/${next.slug}/" title="${next.title}" rel="next">${next.title} ›</a>` : ""}</span>
    <a href="/puzzles/">Puzzles &amp; Devices</a>`;
}
// arrow keys for a draggable part: el gets focus, and step(dx, dy, big) is called; Shift takes big steps
function keys(el, step, label){
  el.setAttribute("tabindex", "0"); el.setAttribute("role", "slider"); if(label) el.setAttribute("aria-label", label);
  el.addEventListener("keydown", e => { const d = {ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1]}[e.key]; if(!d) return;
    e.preventDefault(); step(d[0], d[1], e.shiftKey); });
}
/* "Try this": <ol class="try"><li data-try="name">…</li></ol>. Folio.tries({name: {setup(), check() → true when done}})
   A setup button is added to each item that has one; an item is ticked once its check passes. Call Folio.tryCheck() after each redraw. */
let TRIES = {};
function tries(spec){ TRIES = Object.assign(TRIES, spec);
  document.querySelectorAll(".try li[data-try]").forEach(li => { const t = TRIES[li.dataset.try]; if(!t || li.querySelector(".tset")) return;
    if(t.setup){ const b = document.createElement("button"); b.type = "button"; b.className = "tset"; b.textContent = t.label || "set it up"; b.onclick = () => { t.setup(); tryCheck(); }; li.appendChild(b); } });
  tryCheck(); }
function tryCheck(){ document.querySelectorAll(".try li[data-try]").forEach(li => { const t = TRIES[li.dataset.try]; if(t && t.check){ try{ if(t.check()) li.classList.add("done"); }catch(_){} } }); }
document.addEventListener("DOMContentLoaded", runhead);
window.Folio = {E, T, defs, pt, drag, roman, plates, glosses, rng, wobble, line, fmt, NS, FOLIOS, ORD, runhead, keys, tries, tryCheck};
})();
