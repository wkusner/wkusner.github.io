/* The Wending House: reckoning — the calendar cabinet, the timekeepers, and the numerary.
   Loaded before palace.js; everything here reaches the house's own helpers (S, now, overlay, sunTimes, sound, E…) only when called. */
(function(){
"use strict";
const C = {}; const SY = window.SYSTEMS, TAU = Math.PI*2, DEG = Math.PI/180;
const pad = n => String(n).padStart(2, "0");
const tfmt = t => t ? new Date(t).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}) : "—";

/* ---------- calendars, house-wide ---------- */
const calKey = () => (C.S && C.S.cal) || "gregorian";
// after sunset, the calendars whose day begins at sunset have already turned over
const afterSunset = d => { try { const st = C.sunTimes(); return !!(st.set && d.getTime() > st.set); } catch(e){ return false; } };
function calShort(d){ const c = SY.calendarOf(calKey()); try { return c.short(d, {afterSunset: afterSunset(d)}); } catch(e){ return d.toLocaleDateString([], {month:"short", day:"numeric"}); } }
function calLong(d, k){ const c = SY.calendarOf(k || calKey()); try { return c.long(d, {afterSunset: afterSunset(d)}); } catch(e){ return "—"; } }
function calSelect(id){ return `<select id="${id}">${["Solar","Lunisolar","Lunar","Counts"].map(f => `<optgroup label="${f}">${SY.CALENDARS.filter(c => c.family === f).map(c => `<option value="${c.k}" ${c.k===calKey()?"selected":""}>${c.name}</option>`).join("")}</optgroup>`).join("")}</select>`; }
function setCal(k){ C.S.cal = k; C.save(); C.render(); C.toast(`The house now keeps the ${SY.calendarOf(k).name} calendar.`); C.award("calendar:" + k, 3); }

function calendarsView(){
  const d = C.now(), turned = afterSunset(d);
  const fam = f => SY.CALENDARS.filter(c => c.family === f).map(c => `<div class="pin cal-row${c.k === calKey() ? " on" : ""}"><h3>${c.name}${c.k === calKey() ? " · the house's" : ""}</h3>
      <p class="big" style="font-size:18px">${calLong(d, c.k)}</p>${c.sunset && turned ? `<p class="note">After sunset: this calendar's day has already turned.</p>` : ""}
      <p class="note">${c.note}</p><p><button class="btn${c.k === calKey() ? " primary" : ""}" type="button" data-cal="${c.k}">${c.k === calKey() ? "Kept by the house" : "Keep this one in the house"}</button></p></div>`).join("");
  C.overlay("The calendar cabinet", `<div class="text"><p>A tall cabinet of shallow drawers, each with a different year in it, and a brass drum on top that turns to whichever you choose. The one you choose dates the whole house: the clock chip, the almanac, and the notice board.</p></div>
    <div class="board cal-board">${["Solar","Lunisolar","Lunar","Counts"].map(f => `<h4 class="cal-h">${f}</h4>${fam(f)}`).join("")}</div>
    <p class="note">On the list for later: Hindu lunisolar calendars and the pañcāṅga, the Bahá'í (Badí') calendar, the Aztec xiuhpohualli and tonalpohualli, the Attic festival calendar, the Roman republican calendar before Caesar, the Zoroastrian, the Balinese pawukon, Tibetan, Javanese, the Hindu and Buddhist eras, and the Discordian.</p>`);
  document.querySelectorAll("[data-cal]").forEach(b => b.onclick = () => { setCal(b.dataset.cal); calendarsView(); });
  C.award("calendars", 5);
}

/* ---------- the timekeepers ---------- */
// the night around a moment: last sunset to next sunrise (approximating yesterday's and tomorrow's from today's)
function nightSpan(d){ const st = C.sunTimes(), t = d.getTime(), day = 864e5; if(!st.rise || !st.set) return null;
  if(t < st.rise) return {from: st.set - day, to: st.rise}; if(t >= st.set) return {from: st.set, to: st.rise + day}; return {day:true, from: st.rise, to: st.set}; }
// Edo dawn and dusk: when the lines of your palm can be seen, about 36 minutes outside sunrise and sunset
const TOKI = [["卯","Rabbit",6,"明け六つ, dawn"],["辰","Dragon",5],["巳","Snake",4],["午","Horse",9,"昼九つ, noon"],["未","Goat",8],["申","Monkey",7],["酉","Rooster",6,"暮れ六つ, dusk"],["戌","Dog",5],["亥","Boar",4],["子","Rat",9,"夜九つ, midnight"],["丑","Ox",8],["寅","Tiger",7]];
function tokiNow(d){ const st = C.sunTimes(); if(!st.rise || !st.set) return null; const day = 864e5, t = d.getTime(), dawn = st.rise - 36*6e4, dusk = st.set + 36*6e4;
  let i, start, len;
  if(t >= dawn && t < dusk){ len = (dusk - dawn)/6; i = Math.floor((t - dawn)/len); start = dawn + i*len; }
  else { const n0 = t >= dusk ? dusk : dusk - day, n1 = t >= dusk ? dawn + day : dawn; len = (n1 - n0)/6; const j = Math.floor((t - n0)/len); i = 6 + j; start = n0 + j*len; }
  return {i, toki: TOKI[i], start, len, frac: (t - start)/len, dawn, dusk}; }
function italianHour(d){ const st = C.sunTimes(); if(!st.set) return null; const day = 864e5, t = d.getTime(); let zero = st.set + 30*6e4; if(t < zero) zero -= day; return (t - zero)/36e5; }
function decimalTime(d){ const f = (d.getHours()*3600 + d.getMinutes()*60 + d.getSeconds())/86400; return {f, h: Math.floor(f*10), m: Math.floor(f*1000) % 100, s: Math.floor(f*100000) % 100}; }

const svgWrap = (body, vb = "-110 -120 220 240", w = 220) => `<svg viewBox="${vb}" style="width:${w}px;max-width:100%;display:block;margin:0 auto;color:var(--ink)" role="img">${body}</svg>`;
const T = (x, y, s, size = 11, extra = "") => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" fill="currentColor" font-family="IM Fell English, serif" ${extra}>${s}</text>`;

const TIMEKEEPERS = [
  {k:"carriage", name:"The carriage clock", icon:"carriage", title:"A carriage clock", note:"It keeps house time and chimes the quarters."},
  {k:"hourglass", name:"An hourglass", icon:"tk-hourglass", title:"An hourglass",
    note:"A sand glass of one hour, turned on the hour. Ships kept half-hour glasses to measure the watches, and preachers had them in the pulpit.",
    face: d => { const f = (d.getMinutes()*60 + d.getSeconds())/3600, top = 1 - f;
      const ty = -10 - 58*top, by = 78 - 56*f;
      return svgWrap(`<rect x="-62" y="-96" width="124" height="12" rx="3" fill="var(--paper2)" stroke="currentColor" stroke-width="2"/><rect x="-62" y="84" width="124" height="12" rx="3" fill="var(--paper2)" stroke="currentColor" stroke-width="2"/>
        ${[-56,56].map(x => `<line x1="${x}" y1="-84" x2="${x}" y2="84" stroke="currentColor" stroke-width="3"/>`).join("")}
        <clipPath id="hgc"><path d="M-44,-82 C-44,-30 -6,-14 -4,0 C-6,14 -44,30 -44,82 H44 C44,30 6,14 4,0 C6,-14 44,-30 44,-82 Z"/></clipPath>
        <g clip-path="url(#hgc)"><rect x="-50" y="${ty}" width="100" height="${-10 - ty + 10}" fill="#c9a86a"/><path d="M-50,82 L-50,${by} Q0,${by - 18*Math.min(1, f*3)} 50,${by} L50,82 Z" fill="#c9a86a"/>${top > .002 ? `<line x1="0" y1="0" x2="0" y2="${by - 14*Math.min(1, f*3)}" stroke="#a88a50" stroke-width="1.6"/>` : ""}</g>
        <path d="M-44,-82 C-44,-30 -6,-14 -4,0 C-6,14 -44,30 -44,82 H44 C44,30 6,14 4,0 C6,-14 44,-30 44,-82 Z" fill="none" stroke="currentColor" stroke-width="1.8"/>
        ${T(0, 112, `${Math.floor((1-f)*60)} minutes of sand above`, 11)}`); }},
  {k:"clepsydra", name:"A water clock (clepsydra)", icon:"tk-clepsydra", title:"A water clock",
    note:"An outflow water clock after the one from Karnak (Amenhotep III, about 1400 BC): filled at sunset, it drains through a hole near the bottom, and the falling water passes lines for the hours of the night. The sides slope so the flow keeps nearly even as the water drops; there is a column of hour marks for each month, since nights are longer in winter.",
    face: d => { const ns = nightSpan(d), mo = d.getMonth(), full = !ns || ns.day; const f = full ? 0 : (d.getTime() - ns.from)/(ns.to - ns.from); const level = -70 + 140*f;
      const wx = y => 58 - (y + 70)/140*22;   // half-width at height y (wider at the top)
      let marks = ""; for(let c=0;c<12;c++){ const x0 = -48 + c*8.7; for(let h=1;h<12;h++){ const y = -70 + 140*h/12; marks += `<circle cx="${x0*(wx(y)/58)}" cy="${y}" r="${c===mo?1.6:.9}" fill="currentColor" opacity="${c===mo?1:.35}"/>`; } }
      return svgWrap(`<clipPath id="clc"><path d="M-58,-70 L58,-70 L36,70 L-36,70 Z"/></clipPath>
        <rect x="-70" y="-${level < 70 ? 0 : 0}" width="0" height="0"/>
        <g clip-path="url(#clc)"><rect x="-70" y="${level}" width="140" height="${70 - level}" fill="#7fa3b5" opacity=".55"/></g>
        <path d="M-58,-70 L58,-70 L36,70 L-36,70 Z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M-64,-74 h128" stroke="currentColor" stroke-width="3"/>
        ${marks}<path d="M36,64 h14" stroke="currentColor" stroke-width="2"/>${!full ? `<path d="M50,64 q6,8 4,30" stroke="#7fa3b5" stroke-width="1.6" fill="none"/>` : ""}
        ${T(0, 92, full ? `Full, waiting for sunset (${tfmt(C.sunTimes().set)})` : `the ${SY.ord(Math.min(12, Math.floor(f*12) + 1))} hour of the night`, 11)}
        ${T(0, 108, `this month's column is darker`, 9, 'opacity=".7"')}`); }},
  {k:"candle", name:"A candle clock", icon:"tk-candle", title:"A candle clock",
    note:"After King Alfred, as Asser tells it: six candles of equal weight, each twelve inches long, burned one after another through the day and night, four hours to a candle, so each inch is twenty minutes. Alfred set them in lanterns of thin horn because the draughts in his chapel made them gutter.",
    face: d => { const hrs = d.getHours() + d.getMinutes()/60 + d.getSeconds()/3600, i = Math.floor(hrs/4), f = (hrs - i*4)/4;
      let b = ""; for(let c=0;c<6;c++){ const x = -75 + c*30, h = c < i ? 0 : c > i ? 120 : 120*(1-f), y0 = 70;
        b += `<rect x="${x-9}" y="${y0}" width="18" height="6" fill="currentColor" opacity=".6"/>`;
        if(h > 0){ b += `<rect x="${x-5}" y="${y0 - h}" width="10" height="${h}" fill="var(--paper2)" stroke="currentColor"/>`; for(let k=1;k<12;k++){ const yy = y0 - 120 + k*10; if(yy > y0 - h) b += `<line x1="${x-5}" y1="${yy}" x2="${x-1}" y2="${yy}" stroke="currentColor" stroke-width=".8"/>`; }
          if(c === i) b += `<path d="M${x},${y0-h-4} q-4,-8 0,-16 q4,8 0,16 Z" fill="#f2b84a" stroke="#b5782a"/><circle cx="${x}" cy="${y0-h-10}" r="10" fill="#f2b84a" opacity=".18"/>`; else b += `<line x1="${x}" y1="${y0-h}" x2="${x}" y2="${y0-h-4}" stroke="currentColor"/>`; } }
      return svgWrap(b + T(0, 96, `the ${SY.ord(i+1)} candle, ${Math.floor((1-f)*12)} inches left (${Math.round((1-f)*240)} minutes)`, 11), "-100 -70 200 180"); }},
  {k:"incense", name:"An incense seal clock", icon:"tk-incense", title:"An incense clock",
    note:"A Chinese seal clock (香篆): powdered incense pressed into a maze in a bed of ash, lit at one end, burning along the trail at a steady pace. This one burns a full day, from the start of the hour of the Rat (11 at night), past the twelve double hours marked along the way.",
    face: d => { const f = (((d.getHours() + 1) % 24)*3600 + d.getMinutes()*60 + d.getSeconds())/86400;
      // a square meander, outside in
      const pts = []; let x = -80, y = -80, w = 160, step = 16, dir = 0; pts.push([x,y]);
      const legs = []; let len = w; legs.push(len); while(len > step){ legs.push(len); len -= step; legs.push(len); }
      legs.forEach((L, k) => { const [dx, dy] = [[1,0],[0,1],[-1,0],[0,-1]][k % 4]; x += dx*L; y += dy*L; pts.push([x,y]); });
      const segs = pts.slice(1).map((p,i) => Math.hypot(p[0]-pts[i][0], p[1]-pts[i][1])), total = segs.reduce((a,b) => a+b, 0);
      const at = s => { let r = s; for(let i=0;i<segs.length;i++){ if(r <= segs[i]){ const a = pts[i], b = pts[i+1], t = r/segs[i]; return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, i]; } r -= segs[i]; } return [...pts[pts.length-1], segs.length-1]; };
      const [ex, ey, ei] = at(f*total), burned = pts.slice(0, ei+1).concat([[ex, ey]]), rest = [[ex,ey]].concat(pts.slice(ei+1));
      const poly = a => a.map(p => p.join(",")).join(" ");
      let marks = ""; ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"].forEach((c, k) => { const [mx, my] = at(k/12*total); marks += `<text x="${mx}" y="${my-3}" font-size="8" text-anchor="middle" fill="currentColor" opacity=".8">${c}</text>`; });
      return svgWrap(`<rect x="-94" y="-94" width="188" height="188" rx="6" fill="#bdb5a4" stroke="currentColor" stroke-width="2"/>
        <polyline points="${poly(rest)}" fill="none" stroke="#8a6a44" stroke-width="5" stroke-linejoin="round"/><polyline points="${poly(burned)}" fill="none" stroke="#e8e2d6" stroke-width="5" stroke-linejoin="round" opacity=".9"/>
        ${marks}<circle cx="${ex}" cy="${ey}" r="4" fill="#e0582a"/><circle cx="${ex}" cy="${ey}" r="9" fill="#e0582a" opacity=".25"/>
        ${T(0, 112, `burning through the hour of the ${["Rat","Ox","Tiger","Rabbit","Dragon","Snake","Horse","Goat","Monkey","Rooster","Dog","Pig"][Math.floor(f*12)]}`, 11)}`, "-100 -100 200 222"); }},
  {k:"wadokei", name:"A Japanese clock (wadokei)", icon:"tk-wadokei", title:"A Japanese clock",
    note:"In Edo Japan the day from dawn to dusk and the night from dusk to dawn were each split into six toki, so the hours stretched and shrank with the seasons. Clockmakers built wadokei with movable hour plates, reset every couple of weeks. Each toki is named for an animal and struck with a count of bells, from nine at noon and midnight down to four, after three warning strokes. This one sets its plates by today's real dawn and dusk.",
    face: d => { const tk = tokiNow(d); if(!tk) return "<p class='note'>No dawn or dusk here today.</p>";
      const ang = t => { const x = new Date(t), h = x.getHours() + x.getMinutes()/60; return (h/24)*TAU + Math.PI; };   // noon at the top, midnight at the bottom
      let b = `<circle r="96" fill="var(--paper2)" stroke="currentColor" stroke-width="2.4"/>`;
      const day0 = tk.dawn, day1 = tk.dusk, a0 = ang(day0), a1 = ang(day1);
      const arc = (r, s, e) => { const large = ((e - s + TAU) % TAU) > Math.PI ? 1 : 0; return `M${Math.sin(s)*r},${-Math.cos(s)*r} A${r},${r} 0 ${large} 1 ${Math.sin(e)*r},${-Math.cos(e)*r}`; };
      b += `<path d="${arc(84, a0, a1)}" stroke="#e9cf8a" stroke-width="18" fill="none"/><path d="${arc(84, a1, a0 + TAU)}" stroke="#3b4256" stroke-width="18" fill="none" opacity=".55"/>`;
      const dl = (day1 - day0)/6, nl = (day0 + 864e5 - day1)/6;
      TOKI.forEach(([c, an, bells], k) => { const t = k < 6 ? day0 + k*dl : day1 + (k-6)*nl, a = ang(t), am = ang(t + (k < 6 ? dl : nl)/2);
        b += `<line x1="${Math.sin(a)*74}" y1="${-Math.cos(a)*74}" x2="${Math.sin(a)*94}" y2="${-Math.cos(a)*94}" stroke="currentColor" stroke-width="1.6"/>`;
        b += `<text x="${Math.sin(am)*84}" y="${-Math.cos(am)*84 + 4}" text-anchor="middle" font-size="11" fill="${k<6?"#3a2b1c":"#f4ecd8"}">${c}</text>`;
        b += `<text x="${Math.sin(am)*62}" y="${-Math.cos(am)*62 + 3}" text-anchor="middle" font-size="8" fill="currentColor" opacity=".75">${bells}</text>`; });
      const ah = ang(d.getTime()); b += `<line x1="0" y1="0" x2="${Math.sin(ah)*70}" y2="${-Math.cos(ah)*70}" stroke="var(--spot,#8a2a1c)" stroke-width="3" stroke-linecap="round"/><circle r="4" fill="currentColor"/>`;
      return svgWrap(b + T(0, 114, `${tk.toki[0]}の刻, the hour of the ${tk.toki[1]}: ${tk.toki[2]} bells${tk.toki[3] ? " (" + tk.toki[3] + ")" : ""}`, 11), "-104 -104 208 228"); },
    strike: d => { const tk = tokiNow(d); return tk ? tk.toki[2] : 0; }},
  {k:"decimal", name:"A French decimal clock", icon:"tk-decimal", title:"A decimal clock",
    note:"Decreed in 1793 with the Republican calendar: ten hours to the day, a hundred minutes to the hour, a hundred seconds to the minute, so a decimal second is 0.864 of ours. Clockmakers built dials with both; the law was suspended in 1795.",
    face: d => { const t = decimalTime(d); let b = `<circle r="96" fill="var(--paper2)" stroke="currentColor" stroke-width="2.4"/><circle r="56" fill="none" stroke="currentColor" opacity=".4"/>`;
      for(let k=0;k<100;k++){ const a = k/100*TAU; b += `<line x1="${Math.sin(a)*(k%10?88:82)}" y1="${-Math.cos(a)*(k%10?88:82)}" x2="${Math.sin(a)*94}" y2="${-Math.cos(a)*94}" stroke="currentColor" stroke-width="${k%10?.6:1.6}"/>`; }
      for(let k=0;k<10;k++){ const a = k/10*TAU; b += T(Math.sin(a)*70, -Math.cos(a)*70 + 5, k === 0 ? "10" : String(k), 15); }
      for(let k=0;k<24;k++){ const a = k/24*TAU; b += T(Math.sin(a)*46, -Math.cos(a)*46 + 3, String(k === 0 ? 24 : k), 7, 'opacity=".6"'); }
      const ha = t.f*TAU, ma = (t.f*10 % 1)*TAU;
      b += `<line x1="0" y1="0" x2="${Math.sin(ha)*50}" y2="${-Math.cos(ha)*50}" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><line x1="0" y1="0" x2="${Math.sin(ma)*80}" y2="${-Math.cos(ma)*80}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle r="4" fill="var(--spot,#8a2a1c)"/>`;
      return svgWrap(b + T(0, 116, `${t.h} h ${pad(t.m)} m ${pad(t.s)} s, decimal`, 12), "-104 -104 208 230"); }},
  {k:"italian", name:"An Italian-hours clock", icon:"tk-italian", title:"A clock of Italian hours",
    note:"Italian hours (ore italiche) counted the day from the Ave Maria, half an hour after sunset, through twenty-four hours, so you could always tell how long remained before dark. Paolo Uccello painted such a dial in Florence Cathedral in 1443; its single hand runs counterclockwise, as this one does.",
    face: d => { const h = italianHour(d); if(h == null) return "<p class='note'>The sun doesn't set here today.</p>";
      let b = `<circle r="96" fill="var(--paper2)" stroke="currentColor" stroke-width="2.4"/><circle r="64" fill="none" stroke="currentColor" opacity=".35"/>`;
      for(let k=1;k<=24;k++){ const a = -k/24*TAU + Math.PI; b += T(Math.sin(a)*80, -Math.cos(a)*80 + 4, SY.romanNumeral(k).replace("IV","IIII").replace("XIIII","XIIII"), 9); }
      const a = -(h/24)*TAU + Math.PI; b += `<line x1="0" y1="0" x2="${Math.sin(a)*68}" y2="${-Math.cos(a)*68}" stroke="currentColor" stroke-width="3"/><path d="M${Math.sin(a)*74},${-Math.cos(a)*74} l${Math.sin(a+2.6)*8},${-Math.cos(a+2.6)*8} l${Math.sin(a-2.6)*8},${-Math.cos(a-2.6)*8} Z" fill="var(--spot,#8a2a1c)"/>
        <circle r="18" fill="#e9cf8a" stroke="currentColor"/>`;
      const left = 24 - h - .5; return svgWrap(b + T(0, 114, `${Math.floor(h)} h ${Math.round((h % 1)*60)} m since the Ave Maria`, 11) + T(0, 128, (() => { const st = C.sunTimes(), t = d.getTime(); return st.rise && st.set && t > st.rise && t < st.set; })() ? `about ${left.toFixed(1)} hours of light left` : `night: the sun is down`, 9, 'opacity=".75"'), "-104 -104 208 240"); }},
];
const tkOf = k => TIMEKEEPERS.find(t => t.k === k) || TIMEKEEPERS[0];
const tkKey = () => (C.S && C.S.timekeeper) || "carriage";

let tkToken = 0;
function timekeeperView(){
  const tk = tkOf(tkKey());
  if(tk.k === "carriage") return C.clockView();
  const token = ++tkToken, draw = () => { const el = document.getElementById("tk-face"); if(!el || token !== tkToken) return false; el.innerHTML = tk.face(C.now()); return true; };
  C.overlay(tk.name, `<div class="text"><p>${tk.note}</p></div><div id="tk-face"></div>
    ${tk.strike ? `<p class="row"><button class="btn" type="button" id="tk-strike">Strike the hour</button> <label class="note"><input type="checkbox" id="tk-auto" ${C.S.tkStrike ? "checked" : ""}> strike each toki by itself</label></p>` : ""}
    <p class="note">The others wait in the case of timekeepers in the Archive. ${swapRow()}</p>`);
  draw(); const iv = setInterval(() => { if(!draw()) clearInterval(iv); }, 1000);
  if(tk.strike){ document.getElementById("tk-strike").onclick = () => strikeBells(tk.strike(C.now())); document.getElementById("tk-auto").onchange = e => { C.S.tkStrike = e.target.checked; C.save(); }; }
  wireSwap(); C.award("timekeeper:" + tk.k, 3);
}
function swapRow(){ return `<label>Put another on the desk: <select id="tk-swap">${TIMEKEEPERS.map(t => `<option value="${t.k}" ${t.k===tkKey()?"selected":""}>${t.name}</option>`).join("")}</select></label>`; }
function wireSwap(){ const s = document.getElementById("tk-swap"); if(s) s.onchange = e => { swapTo(e.target.value); timekeeperView(); }; }
function swapTo(k){ C.S.timekeeper = k; C.save(); C.render(); C.toast(`${tkOf(k).name} now stands on the Entry desk.`); }
function caseView(){
  C.overlay("The case of timekeepers", `<div class="text"><p>A glass-fronted case of things that keep time, each on its own shelf. One at a time can stand on the desk in the Entry in place of the carriage clock.</p></div>
    <div class="board">${TIMEKEEPERS.map(t => `<div class="pin${t.k === tkKey() ? " on" : ""}"><h3>${t.name}${t.k === tkKey() ? " · on the Entry desk" : ""}</h3>
      ${t.face ? `<div class="tk-thumb">${t.face(C.now())}</div>` : ""}<p class="note">${t.note}</p>
      <p><button class="btn${t.k === tkKey() ? " primary" : ""}" type="button" data-tk="${t.k}">${t.k === tkKey() ? "On the desk" : "Put it on the Entry desk"}</button></p></div>`).join("")}</div>
    <p class="note">On the list for later: a marine chronometer and the longitude, a nocturnal (telling time by the stars), a pocket ring dial, an astronomical regulator, a Chinese water-driven tower clock after Su Song, al-Jazarī's elephant clock, a mechanical orrery clock, a Babylonian merkhet, and an atomic clock's tick from the radio.</p>`);
  document.querySelectorAll("[data-tk]").forEach(b => b.onclick = () => { swapTo(b.dataset.tk); caseView(); });
  C.award("timecase", 5);
}
// the temple bell: three warning strokes, then the count
function strikeBells(n){ const ac = C.audio(); if(!ac || !n) return; const t0 = ac.currentTime + .1, f = 440*Math.pow(2, (43-69)/12);
  for(let k=0;k<3;k++) C.sound.gong(f*1.5, t0 + k*1.4, .22, false);
  for(let k=0;k<n;k++) C.sound.gong(f, t0 + 6 + k*3.2, .5, true); }
let lastToki = null;
setInterval(() => { try { if(!C.S || tkKey() !== "wadokei" || !C.S.tkStrike) return; const tk = tokiNow(C.now()); if(!tk) return;
  if(lastToki === null){ lastToki = tk.i; return; } if(tk.i !== lastToki){ lastToki = tk.i; const here = C.cur && String(C.cur.id) === "0"; if(here || C.S.chimeWhere === "house") strikeBells(tk.toki[2]); } } catch(e){} }, 15000);

/* ---------- the numerary ---------- */
function numeralsView(n0){
  const n = n0 != null ? n0 : (C.S.numN != null ? C.S.numN : C.now().getFullYear());
  const fams = SY.NUMERAL_FAMILIES, d = C.now(), room = C.cur ? +C.cur.id : 0;
  const presets = [["this year", d.getFullYear()], ["this room", room], ["today's Julian Day", SY.jdnOf(d)], ["seconds since midnight", d.getHours()*3600 + d.getMinutes()*60 + d.getSeconds()], ["a random number", 1 + Math.floor(Math.random()*9999)]];
  const row = s => { let h; try { h = s.html(n); } catch(e){ h = null; } return `<tr><th>${s.name}${s.k === (C.S.numerals||"") ? " ·" : ""}</th><td class="${s.cls||""}">${h == null ? `<span class="note">${n === 0 ? "no zero" : "out of its range"}</span>` : h}${s.notes ? ` <button class="btn chip-play" type="button" data-play="${s.k}" title="Play it">♪</button>` : ""}</td>
    <td class="note">${s.note}${s.text ? `<br><label><input type="radio" name="numsys" value="${s.k}" ${s.k === C.S.numerals ? "checked" : ""}> number the rooms this way</label>` : ""}</td></tr>`; };
  C.overlay("The numerary", `<div class="text"><p>A brass machine on a stand with a row of number wheels on top. Set a number and every drawer below shows it written another way, by another people or another machine.</p></div>
    <div class="row widget"><input id="nm-n" type="number" min="0" max="999999999" step="1" value="${n}" style="width:12em"> <button class="btn primary" type="button" id="nm-go">Set the wheels</button></div>
    <p>${presets.map(([l, v], i) => `<button class="btn" type="button" data-pre="${i}">${l}</button>`).join(" ")}</p>
    <p class="note"><label><input type="radio" name="numsys" value="" ${!C.S.numerals ? "checked" : ""}> number the rooms in ordinary digits</label></p>
    ${fams.map(f => `<h4 class="num-h">${f}</h4><table class="num-t">${SY.NUMERALS.filter(s => s.family === f).map(row).join("")}</table>`).join("")}
    <h4 class="num-h">On the list for later</h4><p class="note">${SY.NUMERALS_LATER.join("; ")}.</p>`);
  const go = v => { const x = Math.max(0, Math.min(999999999, Math.floor(+v || 0))); C.S.numN = x; C.save(); numeralsView(x); };
  document.getElementById("nm-go").onclick = () => go(document.getElementById("nm-n").value);
  document.getElementById("nm-n").onkeydown = e => { if(e.key === "Enter") go(e.target.value); };
  document.querySelectorAll("[data-pre]").forEach(b => b.onclick = () => go(presets[+b.dataset.pre][1]));
  document.querySelectorAll("[data-play]").forEach(b => b.onclick = () => { const s = SY.numeralOf(b.dataset.play), ac = C.audio(); if(!ac) return; const t0 = ac.currentTime + .08; s.notes(n).forEach((m, i) => C.sound.pluck(m, t0 + i*.38, .14)); });
  document.querySelectorAll("input[name=numsys]").forEach(r => r.onchange = () => { C.S.numerals = r.value || null; C.save(); C.render(); C.toast(C.S.numerals ? `Rooms are numbered in ${SY.numeralOf(C.S.numerals).name} now.` : "Rooms are numbered in ordinary digits again."); });
  C.award("numerary", 5);
}
const roomNum = id => (C.S && C.S.numerals) ? SY.numText(id, C.S.numerals) : String(id);

/* ---------- icons for the 2D view (merged into the house's ICON table) ---------- */
const icons = {
  "tk-hourglass": g => C.ICON.hourglass(g),
  "tk-clepsydra": g => { C.E("path",{d:"M-20,-18 L20,-18 L13,18 L-13,18 Z",fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1.8},g); C.E("path",{d:"M-17,-4 L17,-4 L13,18 L-13,18 Z",fill:"url(#s-dark)",opacity:.5},g); for(let i=0;i<5;i++) C.E("line",{x1:-10,y1:-12+i*6,x2:-6,y2:-12+i*6,stroke:"var(--ink)"},g); C.E("path",{d:"M13,15 h7 q2,4 1,9",fill:"none",stroke:"var(--ink)"},g); },
  "tk-candle": g => { C.E("rect",{x:-16,y:-22,width:32,height:40,rx:3,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1.6},g); C.E("rect",{x:-4,y:-6,width:8,height:22,fill:"var(--paper2)",stroke:"var(--ink)"},g); C.E("path",{d:"M0,-8 q-4,-6 0,-12 q4,6 0,12 Z",fill:"var(--spot)"},g); for(let i=0;i<4;i++) C.E("line",{x1:-4,y1:i*5-2,x2:-1,y2:i*5-2,stroke:"var(--ink)"},g); },
  "tk-incense": g => { C.E("rect",{x:-22,y:-16,width:44,height:32,rx:3,fill:"var(--paper2)",stroke:"var(--ink)","stroke-width":1.6},g); C.E("path",{d:"M-16,-10 H16 V10 H-10 V-4 H10 V4 H-4",fill:"none",stroke:"var(--ink)","stroke-width":2},g); C.E("circle",{cx:-4,cy:4,r:2.4,fill:"var(--spot)"},g); },
  "tk-wadokei": g => { C.E("rect",{x:-14,y:-24,width:28,height:48,rx:2,fill:"url(#h-light)",stroke:"var(--ink)","stroke-width":1.6},g); C.E("circle",{cy:-6,r:11,fill:"var(--paper)",stroke:"var(--ink)"},g); C.E("path",{d:"M0,-6 L0,-15",stroke:"var(--ink)","stroke-width":2},g); C.E("path",{d:"M-10,-26 L0,-32 L10,-26",fill:"none",stroke:"var(--ink)","stroke-width":1.6},g); },
  "tk-decimal": g => { C.E("circle",{r:20,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g); for(let i=0;i<10;i++){ const t=i/10*TAU; C.E("line",{x1:Math.sin(t)*14,y1:-Math.cos(t)*14,x2:Math.sin(t)*19,y2:-Math.cos(t)*19,stroke:"var(--ink)","stroke-width":1.6},g);} C.E("line",{x1:0,y1:0,x2:6,y2:-10,stroke:"var(--ink)","stroke-width":2},g); C.E("text",{y:13,"text-anchor":"middle","font-size":6,fill:"var(--ink)"},g).textContent = "X"; },
  "tk-italian": g => { C.E("circle",{r:20,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g); for(let i=0;i<24;i++){ const t=i/24*TAU; C.E("line",{x1:Math.sin(t)*16,y1:-Math.cos(t)*16,x2:Math.sin(t)*19,y2:-Math.cos(t)*19,stroke:"var(--ink)"},g);} C.E("circle",{r:6,fill:"var(--spot)",opacity:.7},g); C.E("line",{x1:0,y1:0,x2:-10,y2:10,stroke:"var(--ink)","stroke-width":2},g); },
  tkcase: g => { C.E("rect",{x:-22,y:-24,width:44,height:48,rx:2,fill:"url(#h-light)",stroke:"var(--ink)","stroke-width":1.6},g); C.E("rect",{x:-18,y:-20,width:36,height:40,fill:"var(--paper)",opacity:.7,stroke:"var(--ink)"},g); C.E("line",{x1:-18,y1:0,x2:18,y2:0,stroke:"var(--ink)"},g); C.E("circle",{cx:-8,cy:-10,r:5,fill:"none",stroke:"var(--ink)"},g); C.E("path",{d:"M4,-16 h8 l-4,6 l4,6 h-8 l4,-6 Z",fill:"none",stroke:"var(--ink)"},g); C.E("rect",{x:-12,y:4,width:5,height:12,fill:"var(--paper2)",stroke:"var(--ink)"},g); C.E("path",{d:"M4,16 L14,16 L12,6 L6,6 Z",fill:"none",stroke:"var(--ink)"},g); },
  calcab: g => { C.E("rect",{x:-20,y:-12,width:40,height:36,fill:"url(#h-light)",stroke:"var(--ink)","stroke-width":1.6},g); for(let i=0;i<4;i++) C.E("line",{x1:-20,y1:-3+i*9,x2:20,y2:-3+i*9,stroke:"var(--ink)"},g); C.E("ellipse",{cy:-18,rx:16,ry:7,fill:"var(--spot)",opacity:.8,stroke:"var(--ink)"},g); C.E("text",{y:-15,"text-anchor":"middle","font-size":7,fill:"var(--paper)"},g).textContent = "MMXXVI"; },
  numerary: g => { C.E("rect",{x:-24,y:-20,width:48,height:34,fill:"none",stroke:"var(--ink)","stroke-width":2.4},g); for(let i=0;i<5;i++){ const x=-16+i*8; C.E("line",{x1:x,y1:-20,x2:x,y2:14,stroke:"var(--ink)"},g); for(let j=0;j<3;j++) C.E("ellipse",{cx:x,cy:-12+j*6+(i%2)*8,rx:3.6,ry:2.4,fill:j===0?"var(--spot)":"var(--paper2)",stroke:"var(--ink)"},g); } C.E("line",{x1:-24,y1:-8,x2:24,y2:-8,stroke:"var(--ink)","stroke-width":1.6},g); C.E("path",{d:"M-12,14 l-6,12 M12,14 l6,12",stroke:"var(--ink)","stroke-width":2},g); },
};

window.RECKON = {bind: o => { Object.defineProperties(C, Object.getOwnPropertyDescriptors(o)); }, calShort, calLong, calSelect, setCal, calendarsView, TIMEKEEPERS, tkOf, tkKey, timekeeperView, caseView, swapTo, tokiNow, italianHour, decimalTime, nightSpan, numeralsView, roomNum, icons, strikeBells};
})();
