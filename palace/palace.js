/* The Wending House — a memory-palace engine for wkusner.github.io
   Data: window.PALACE (built by Jekyll from _data/palace.yml into data.js).
   State: localStorage "palace-v1" (per-visitor convenience only). */
(function(){
"use strict";
const P = window.PALACE;
const $ = id => document.getElementById(id);
if(!P || !P.rooms){ $("rname").textContent="The house data did not load."; return; }
const NS = "http://www.w3.org/2000/svg";
const ROOMS = {}; P.rooms.forEach(r => { ROOMS[String(r.id)] = r; });
const WINGS = P.wings || {};
const START = String(P.start!=null ? P.start : P.rooms[0].id);
const RANKS = P.ranks || [{name:"Visitor",at:0,color:"#d9d2c0"}];
let LAT = P.latitude || 44.26;   // the astrolabe can move the house; see setPlace()
const Q = new URLSearchParams(location.search);

/* ---------- state ---------- */
const KEY = "palace-v1";
const blank = () => ({visits:{}, log:[], edges:{}, frame:[0,0], frames:{}, inv:[], solved:{}, named:[], light:"auto", steps:0, walk:[], showAll:false,
  face:0, close:null, mode:null, xp:0, awards:{}, sheets:{}, clock:null, wx:null});
let S = blank();
/* ink: "two" (a spot color per wing) or "1bit" */
try { const s = JSON.parse(localStorage.getItem(KEY)); if(s) S = Object.assign(blank(), s); } catch(e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) {} };

/* ---------- the dihedral group D4: g = r^k s^f ---------- */
const mul = (a,b) => [ ((a[0] + (a[1] ? -b[0] : b[0])) % 4 + 4) % 4, a[1] ^ b[1] ];
const inv = g => g[1] ? [g[0],1] : [(4-g[0])%4, 0];
const isE = g => g[0]===0 && g[1]===0;
function parseG(str){
  let g=[0,0]; if(!str) return g;
  (String(str).match(/r\d*|s|e/g) || []).forEach(t => {
    if(t==="s") g = mul(g,[0,1]);
    else if(t[0]==="r") g = mul(g,[(+(t.slice(1)||1))%4,0]);
  });
  return g;
}
const nameG = g => (g[0]===0 && !g[1]) ? "e" : (g[0] ? "r"+(g[0]>1?g[0]:"") : "") + (g[1] ? "s" : "");
const act = (g,w) => (((g[1] ? (2-w+4)%4 : w) + g[0]) % 4);   // walls: 0 left, 1 back, 2 right, 3 behind
const WALLS = {left:0, back:1, right:2, front:3, behind:3};
const WALLNAME = ["on the left","ahead","on the right","behind you"];

/* ---------- time ---------- */
function now(){
  if(S.clock && !Q.has("hour") && !Q.has("date")){ const c=S.clock; return new Date(c.pal + (Date.now()-c.base)*(c.rate==null?1:c.rate)); }
  const d = new Date();
  if(Q.has("hour")) { d.setHours(+Q.get("hour"), +(Q.get("min")||0)); }
  if(Q.has("date")) { const t = new Date(Q.get("date")+"T"+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")); if(!isNaN(t)) return t; }
  return d;
}
function band(d){ if(S.loc){ const sk = skyNow(), a = sk.sun.alt; return a < -12 ? "night" : a < -.8 ? (sk.sun.az < 180 ? "dawn" : "dusk") : (a < 6 ? (sk.sun.az < 180 ? "dawn" : "dusk") : "day"); }
  const h=d.getHours(); return h>=21||h<5 ? "night" : h<8 ? "dawn" : h<18 ? "day" : "dusk"; }
// the moon's phase from the real elongation: 0 new, .25 first quarter, .5 full, .75 last quarter
function moonPhase(d){ const n = d.getTime()/864e5 + 2440587.5 - 2451545, g = (357.528+0.9856003*n)*DEG, Ls = 280.460+0.9856474*n + 1.915*Math.sin(g) + 0.020*Math.sin(2*g);
  const M=(134.963+13.064993*n)*DEG, F=(93.272+13.229350*n)*DEG, D=(297.850+12.190749*n)*DEG, Ms=(357.529+0.985600*n)*DEG;
  const Lm = 218.316+13.176396*n + 6.289*Math.sin(M) + 1.274*Math.sin(2*D-M) + 0.658*Math.sin(2*D) + 0.214*Math.sin(2*M) - 0.186*Math.sin(Ms) - 0.114*Math.sin(2*F);
  return (((Lm - Ls) % 360) + 360) % 360 / 360; }
function lightNow(){ return S.light==="auto" ? band(now()) : S.light; }

/* ---------- the sky over the house ---------- */
const DEG = Math.PI/180; let LON = (P.longitude!=null ? P.longitude : -88.41);
const HOME = {lat: LAT, lon: LON, name: P.place || "Appleton"};
if(S.loc && isFinite(S.loc.lat) && isFinite(S.loc.lon)){ LAT = S.loc.lat; LON = S.loc.lon; }
const placeName = () => S.loc ? (S.loc.name || `${Math.abs(LAT).toFixed(2)}°${LAT>=0?"N":"S"}, ${Math.abs(LON).toFixed(2)}°${LON>=0?"E":"W"}`) : HOME.name;
const locKey = () => LAT.toFixed(2)+","+LON.toFixed(2);
function setPlace(loc){ S.loc = loc; LAT = loc ? loc.lat : HOME.lat; LON = loc ? loc.lon : HOME.lon; S.wx = null; S.fc = null; weather.failed = 0; forecast.failed = 0; skyCache.key = null; save(); }
const jdOf = d => d.getTime()/864e5 + 2440587.5;
const OBL = 23.43928;
function eclToEq(lam, beta){ const e=OBL*DEG, l=lam*DEG, b=beta*DEG;
  const ra = Math.atan2(Math.sin(l)*Math.cos(e) - Math.tan(b)*Math.sin(e), Math.cos(l));
  const dec = Math.asin(Math.sin(b)*Math.cos(e) + Math.cos(b)*Math.sin(e)*Math.sin(l));
  return [((ra/DEG)%360+360)%360, dec/DEG]; }
function sunEq(jd){ const n=jd-2451545, L=280.460+0.9856474*n, g=(357.528+0.9856003*n)*DEG;
  return eclToEq(L + 1.915*Math.sin(g) + 0.020*Math.sin(2*g), 0); }
function moonEq(jd){ const n=jd-2451545, Lp=218.316+13.176396*n, M=(134.963+13.064993*n)*DEG, F=(93.272+13.229350*n)*DEG,
  D=(297.850+12.190749*n)*DEG, Ms=(357.529+0.985600*n)*DEG;
  const lam = Lp + 6.289*Math.sin(M) + 1.274*Math.sin(2*D-M) + 0.658*Math.sin(2*D) + 0.214*Math.sin(2*M) - 0.186*Math.sin(Ms) - 0.114*Math.sin(2*F);
  const beta = 5.128*Math.sin(F) + 0.281*Math.sin(M+F) + 0.278*Math.sin(M-F) + 0.173*Math.sin(2*D-F);
  return eclToEq(lam, beta); }
function helio(el, T){ const a=el.a+el.da*T, e=el.e+el.de*T, i=(el.i+el.di*T)*DEG, L=el.L+el.dL*T, W=el.W+el.dW*T, N=(el.N+el.dN*T)*DEG;
  let M=((L-W)%360+540)%360-180; M*=DEG; let E=M+e*Math.sin(M); for(let k=0;k<8;k++) E -= (E - e*Math.sin(E) - M)/(1 - e*Math.cos(E));
  const xp=a*(Math.cos(E)-e), yp=a*Math.sqrt(1-e*e)*Math.sin(E), w=W*DEG-N;
  const cw=Math.cos(w), sw=Math.sin(w), cN=Math.cos(N), sN=Math.sin(N), ci=Math.cos(i), si=Math.sin(i);
  return [ (cw*cN - sw*sN*ci)*xp + (-sw*cN - cw*sN*ci)*yp, (cw*sN + sw*cN*ci)*xp + (-sw*sN + cw*cN*ci)*yp, (sw*si)*xp + (cw*si)*yp ]; }
// Uranus and Neptune join the five bright planets (JPL's approximate Keplerian elements, Standish, valid 1800–2050)
const PLANETS_MORE = {
  ura: {name:"Uranus", sym:"♅", el:{a:19.18916464, e:0.04725744, i:0.77263783, L:313.23810451, W:170.95427630, N:74.01692503, da:-0.00196176, de:-0.00004397, di:-0.00242939, dL:428.48202785, dW:0.40805281, dN:0.04240589}},
  nep: {name:"Neptune", sym:"♆", el:{a:30.06992276, e:0.00859048, i:1.77004347, L:-55.12002969, W:44.96476227, N:131.78422574, da:0.00026291, de:0.00005105, di:0.00035372, dL:218.45945325, dW:-0.32241464, dN:-0.00508664}}};
const PLANET_KEYS = ["mer","ven","mar","jup","sat","ura","nep"];
const planetEl = k => ((window.SKY&&SKY.planets)||{})[k] || PLANETS_MORE[k];
function planetsEq(jd, more){
  const T=(jd-2451545)/36525, out=[], ter = planetEl("ter");
  if(!ter) return out; const t=helio(ter.el,T);
  PLANET_KEYS.forEach(k => { const P0 = planetEl(k); if(!P0) return; const p=helio(P0.el,T);
    // light time: we see each planet where it was when its light left
    const d0 = Math.hypot(p[0]-t[0], p[1]-t[1], p[2]-t[2]), pl = helio(P0.el, T - d0*0.0057755/36525);
    const x=pl[0]-t[0], y=pl[1]-t[1], z=pl[2]-t[2];
    const lam=Math.atan2(y,x)/DEG, beta=Math.atan2(z,Math.hypot(x,y))/DEG, eq=prec(...eclToEq(lam,beta), jd);
    const o = {id:k, name:P0.name, sym:P0.sym, ra:eq[0], dec:eq[1]};
    if(more){ const r = Math.hypot(...pl), D = Math.hypot(x,y,z), R0 = Math.hypot(...t);
      Object.assign(o, {lam:((lam%360)+360)%360, beta, r, delta:D, R:R0, helioLon:((Math.atan2(pl[1],pl[0])/DEG)%360+360)%360,
        phase: Math.acos(Math.max(-1, Math.min(1, (r*r + D*D - R0*R0)/(2*r*D))))/DEG, elong: Math.acos(Math.max(-1, Math.min(1, (R0*R0 + D*D - r*r)/(2*R0*D))))/DEG}); }
    out.push(o); });
  return out; }
function lst(jd){ return ((280.46061837 + 360.98564736629*(jd-2451545) + LON) % 360 + 360) % 360; }
// precession from the J2000 catalogue to the equinox of date (IAU 1976 angles); stars and planets need it, the sun and moon formulas are already of date
function prec(ra, dec, jd){ const T = (jd-2451545)/36525, as = DEG/3600, ze = (2306.2181*T + .30188*T*T)*as, z = (2306.2181*T + 1.09468*T*T)*as, th = (2004.3109*T - .42665*T*T)*as;
  const a = ra*DEG + ze, d = dec*DEG, A = Math.cos(d)*Math.sin(a), B = Math.cos(th)*Math.cos(d)*Math.cos(a) - Math.sin(th)*Math.sin(d), C = Math.sin(th)*Math.cos(d)*Math.cos(a) + Math.cos(th)*Math.sin(d);
  return [(((Math.atan2(A,B)+z)/DEG)%360+360)%360, Math.asin(C)/DEG]; }
function altaz(ra, dec, L){ const H=(L-ra)*DEG, d=dec*DEG, f=LAT*DEG;
  const alt=Math.asin(Math.sin(d)*Math.sin(f)+Math.cos(d)*Math.cos(f)*Math.cos(H));
  const az=Math.atan2(-Math.cos(d)*Math.sin(H), Math.sin(d)*Math.cos(f)-Math.cos(d)*Math.sin(f)*Math.cos(H));
  return [alt/DEG, ((az/DEG)%360+360)%360]; }
// atmospheric refraction lifts what we see near the horizon (Saemundsson's formula, in degrees)
const refr = h => h < -1.9 ? 0 : 1.02/Math.tan((h + 10.3/(h + 5.11))*DEG)/60;
function skyNow(offsetHours){
  const d = new Date(now().getTime() + (offsetHours||0)*36e5), jd = jdOf(d), L = lst(jd);
  const s = sunEq(jd), m = moonEq(jd), sa = altaz(s[0],s[1],L), ma = altaz(m[0],m[1],L);
  ma[0] -= 0.95*Math.cos(ma[0]*DEG);   // parallax: we stand on the surface, not at the center
  sa[0] += refr(sa[0]); ma[0] += refr(ma[0]);   // apparent positions, as the eye and a shadow see them
  return {d, jd, L, sun:{ra:s[0],dec:s[1],alt:sa[0],az:sa[1]}, moon:{ra:m[0],dec:m[1],alt:ma[0],az:ma[1],phase:moonPhase(d)}, planets:planetsEq(jd).map(p=>{const a=altaz(p.ra,p.dec,L); return Object.assign(p,{alt:a[0]+refr(a[0]),az:a[1]});})};
}
/* stereographic projection of the upper hemisphere, as seen looking up: north at top, east at left.
   rot = quarter turns of the visitor's frame; mir = mirrored frame */
function proj(alt, az, R, rot, mir){
  const z = (90-alt)*DEG, r = R*Math.tan(z/2), A = (az - 90*rot)*DEG;
  let x = -r*Math.sin(A), y = -r*Math.cos(A); if(mir) x = -x; return [x, y]; }
const facing = () => (((P.facing!=null?P.facing:180) + 90*S.frame[0]) % 360 + 360) % 360;
function drawSky(g, cx, cy, R, opts){
  opts = opts || {};
  const sk = skyNow(opts.offset), dark = sk.sun.alt < -6, mir = S.frame[1]===1, rot = S.frame[0];
  const SK = window.SKY; const id = "skyclip"+(opts.tag||"");
  const cp = E("clipPath",{id},g); E("circle",{cx,cy,r:R},cp);
  E("circle",{cx,cy,r:R+6,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2.4},g);
  const bg = dark ? "var(--sky-ink, #0d0c0b)" : (sk.sun.alt < 0 ? "url(#s-dark)" : "url(#s-hz)");
  E("circle",{cx,cy,r:R,fill: dark ? "#0d0c0b" : bg, stroke:"var(--ink)","stroke-width":1.5},g);
  const inner = E("g",{"clip-path":`url(#${id})`},g);
  const star = dark ? "#F4EFE2" : "var(--ink)", faint = dark ? 1 : .35;
  const P2 = (ra,dec) => { const a = altaz(...prec(ra,dec,sk.jd),sk.L); return a[0] < -1 ? null : proj(a[0],a[1],R,rot,mir).concat([a[0]]); };
  if(SK){
    if(opts.milky!==false && SK.mw) (SK.mw.ol1||[]).forEach(poly => { let d=""; let pen=false; poly.forEach(([ra,dec]) => { const p=P2(ra,dec); if(!p){ pen=false; return; } d += (pen?"L":"M")+(cx+p[0]).toFixed(1)+","+(cy+p[1]).toFixed(1); pen=true; }); if(d) E("path",{d,fill:"none",stroke:star,"stroke-width":.6,opacity:.35*faint,"stroke-dasharray":"1 2"},inner); });
    if(opts.lines!==false) SK.lines.forEach(ln => { let d="", pen=false; ln.forEach(([ra,dec]) => { const p=P2(ra,dec); if(!p){ pen=false; return; } d += (pen?"L":"M")+(cx+p[0]).toFixed(1)+","+(cy+p[1]).toFixed(1); pen=true; }); if(d) E("path",{d,fill:"none",stroke:dark?"var(--spot)":"var(--ink)","stroke-width":opts.big?1.1:.8,opacity:dark?.9:.45},inner); });
    const lim = opts.big ? 4.8 : (R>100 ? 4.2 : 3.6);
    SK.stars.forEach(([ra,dec,m]) => { if(m>lim) return; if(!dark && m>2.2) return; const p=P2(ra,dec); if(!p) return; const rr = Math.max(.5,(lim+.6-m)*(opts.big?.85:.6));
      E("circle",{cx:cx+p[0],cy:cy+p[1],r:rr,fill:star,opacity:faint},inner); });
    if(opts.names) SK.names.forEach(([ra,dec,n,m]) => { if(m>1.6) return; const p=P2(ra,dec); if(!p||p[2]<3) return; const t=T(n,{x:cx+p[0]+5,y:cy+p[1]-4,"font-size":10,fill:dark?"#F4EFE2":"var(--ink)","font-family":"IM Fell English, serif",opacity:.9},inner); });
    if(opts.cons) SK.cons.forEach(([ra,dec,n,rk]) => { if(rk>1) return; const p=P2(ra,dec); if(!p||p[2]<8) return; T(n.toUpperCase(),{x:cx+p[0],y:cy+p[1],"text-anchor":"middle","font-size":8.5,"letter-spacing":"1.5",fill:dark?"var(--spot)":"var(--muted)","font-family":"IM Fell English SC, serif"},inner); });
  }
  sk.planets.forEach(pl => { if(pl.alt<0) return; const p=proj(pl.alt,pl.az,R,rot,mir);
    E("circle",{cx:cx+p[0],cy:cy+p[1],r:opts.big?4:3,fill:dark?"var(--spot)":"var(--ink)",stroke:dark?"#F4EFE2":"var(--paper)","stroke-width":1},inner);
    if(opts.names||opts.big) T(pl.name,{x:cx+p[0]+6,y:cy+p[1]+11,"font-size":10,fill:dark?"#F4EFE2":"var(--ink)","font-family":"IM Fell English, serif","font-style":"italic"},inner); });
  if(sk.moon.alt>0){ const p=proj(sk.moon.alt,sk.moon.az,R,rot,mir), mr=opts.big?8:5, ph=sk.moon.phase;
    E("circle",{cx:cx+p[0],cy:cy+p[1],r:mr,fill:"#F4EFE2",stroke:"var(--ink)","stroke-width":.8},inner);
    E("circle",{cx:cx+p[0]+(ph<.5?-1:1)*mr*2*(ph<.5?2*ph:2*(1-ph)),cy:cy+p[1],r:mr*1.05,fill:"#0d0c0b",opacity:.85},inner); }
  if(sk.sun.alt>-1){ const p=proj(Math.max(sk.sun.alt,0),sk.sun.az,R,rot,mir);
    for(let k=0;k<16;k++){ const t=k/16*2*Math.PI; L(inner,cx+p[0]+Math.cos(t)*8,cy+p[1]+Math.sin(t)*8,cx+p[0]+Math.cos(t)*(k%2?12:16),cy+p[1]+Math.sin(t)*(k%2?12:16),1); }
    E("circle",{cx:cx+p[0],cy:cy+p[1],r:6.5,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1.4},inner); }
  // horizon ring and cardinal points, turned with the visitor
  [["N",0],["E",90],["S",180],["W",270]].forEach(([c,az]) => { const p=proj(0,az,R+14,rot,mir); E("circle",{cx:cx+p[0],cy:cy+p[1],r:opts.big?9:7,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1},g); T(c,{x:cx+p[0],y:cy+p[1]+4,"text-anchor":"middle","font-size":opts.big?13:10,fill:"var(--ink)","font-family":"IM Fell English SC, serif"},g); });
  return sk;
}

/* ---------- ranks, conditions ---------- */
const seen = () => Object.keys(S.visits).filter(k => ROOMS[k]).length;
function rankIndex(){ let i=0; RANKS.forEach((r,j)=>{ if((r.xp!=null ? S.xp : seen()) >= (r.xp!=null ? r.xp : r.at)) i=j; }); return i; }
function award(key, pts, why){
  if(S.awards[key]) return false; S.awards[key]=1; const before=rankIndex(); S.xp += pts; save();
  const after=rankIndex(); if(after>before) setTimeout(()=>toast(`Level ${after}: ${RANKS[after].name}. ${RANKS[after].gift||""}`), 900);
  else if(why) toast(`+${pts} · ${why}`);
  return true;
}
function cond(c, room){
  if(c==null || c==="") return true;
  if(Array.isArray(c)) return c.every(x => cond(x, room));
  c = String(c).trim();
  if(c.startsWith("not:")) return !cond(c.slice(4), room);
  if(c.includes("|")) return c.split("|").some(x => cond(x, room));
  const d = now(), h = d.getHours(), [key, val] = c.split(":");
  switch(key){
    case "night": case "day": case "dawn": case "dusk": return band(d)===key;
    case "weekend": return d.getDay()===0 || d.getDay()===6;
    case "weekday": return d.getDay()>0 && d.getDay()<6;
    case "minutes": { const [a,b]=val.split("-").map(Number), mm=d.getMinutes(); return mm>=a && mm<b; }
    case "sun": { const sa=skyNow().sun.alt; return val==="up" ? sa>0 : sa<=0; }
    case "hours": { const [a,b]=val.split("-").map(Number); return a<=b ? (h>=a && h<b) : (h>=a || h<b); }
    case "month": return d.getMonth()+1 === +val;
    case "moon": { const p=moonPhase(d); return val==="full" ? Math.abs(p-.5)<.07 : val==="new" ? (p<.07||p>.93) : true; }
    case "mirror": return S.frame[1]===1;
    case "upright": return S.frame[1]===0;
    case "frame": return nameG(S.frame)===nameG(parseG(val));
    case "visited": return !!S.visits[val];
    case "visits": return (S.visits[room && room.id]||0) >= +val;
    case "rank": return rankIndex() >= +val;
    case "has": return S.inv.includes(val);
    case "solved": return !!S.solved[val];
    case "seen": return seen() >= +val;
    case "mode": return walkMode()===val;
    case "level": return rankIndex() >= +val;
    case "sheet": { const m = val.match(/^(\w+)(=|!=|<|>)(-?\d+)$/); if(!m) return true; const v=S.sheets[m[1]]||0, n=+m[3];
      return m[2]==="=" ? v===n : m[2]==="!=" ? v!==n : m[2]==="<" ? v<n : v>n; }
    default: return true;
  }
}
// rooms being rebuilt keep their doors, boarded up with a note; rooms closed outright vanish from the plan
const reno = x => !!(x && x.to!=null && !Array.isArray(x.to) && ROOMS[String(x.to)] && ROOMS[String(x.to)].closed === "renovation");
const visible = (x, room) => S.showAll || (!x.hidden && cond(x.when, room) && (reno(x) || !(x.to!=null && !Array.isArray(x.to) && ROOMS[String(x.to)] && ROOMS[String(x.to)].closed)));
const open = (x, room) => !reno(x) && (S.showAll || (S.inv.includes("master-key") && !x.hardlock) || (cond(x.needs, room) && (!x.riddle || S.solved[x.riddle.id])));

/* ---------- door targets ---------- */
let randomPick = {};
function target(door, room){
  const t = door.to;
  if(Array.isArray(t)) return String(t[now().getHours() % t.length]);
  if(t==="random"){
    const k = room.id+"|"+(door.label||"");
    if(!randomPick[k]){ const ids = Object.keys(ROOMS).filter(x => x!==String(room.id) && !ROOMS[x].secret && !ROOMS[x].closed); randomPick[k] = ids[Math.floor(Math.random()*ids.length)]; }
    return randomPick[k];
  }
  if(t==="back") return S.walk.length>1 ? String(S.walk[S.walk.length-2]) : START;
  return String(t);
}
function allTargets(door){ const t=door.to; return Array.isArray(t) ? t.map(String) : (t==="random"||t==="back") ? [] : [String(t)]; }

/* ---------- helpers ---------- */
function E(tag, attrs, parent){ const e=document.createElementNS(NS,tag); for(const k in attrs) e.setAttribute(k, attrs[k]); if(parent) parent.appendChild(e); return e; }
function T(str, attrs, parent){ const e=E("text", attrs, parent); e.textContent=str; return e; }
function rng(seed){ let a = seed>>>0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a>>>15, 1|a); t = t + Math.imul(t ^ t>>>7, 61|t) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; }; }
function hash(s){ let h=2166136261; for(const ch of String(s)){ h ^= ch.charCodeAt(0); h = Math.imul(h,16777619); } return h>>>0; }
let toastT=null;
function toast(msg){ const t=$("toast"); t.textContent=msg; t.classList.add("on"); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("on"), 3200); }
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function wingColor(room){ return (WINGS[room.wing] && WINGS[room.wing].color) || "#A77E22"; }

/* ---------- scene ---------- */
const W=800, H=450;
function defs(svg){
  const d = E("defs",{},svg);
  const pat = (id, size, rot, ys, sw) => {
    const p = E("pattern",{id, width:size, height:size, patternUnits:"userSpaceOnUse", patternTransform:`rotate(${rot})`},d);
    E("rect",{width:size,height:size,fill:"var(--paper)"},p);
    ys.forEach(y => E("line",{x1:-1,y1:y,x2:size+1,y2:y,stroke:"var(--ink)","stroke-width":sw},p));
  };
  pat("h-light",7,-38,[3.5],.75); pat("h-mid",4.6,-38,[2.3],1); pat("h-dark",3.3,-38,[1.65],1.35);
  pat("h-rev",5,38,[2.5],.85); pat("hz",5,0,[2.5],.8); pat("hz-fine",3.6,0,[1.8],.7);
  const cross = (id, size, sw) => { const p=E("pattern",{id,width:size,height:size,patternUnits:"userSpaceOnUse",patternTransform:"rotate(28)"},d);
    E("rect",{width:size,height:size,fill:"var(--paper)"},p);
    E("line",{x1:-1,y1:size/2,x2:size+1,y2:size/2,stroke:"var(--ink)","stroke-width":sw},p); E("line",{x1:size/2,y1:-1,x2:size/2,y2:size+1,stroke:"var(--ink)","stroke-width":sw},p); };
  cross("x-dark",4,1.15); cross("x-light",7,.8);
  const spot = (id, size, rot, sw) => { const p=E("pattern",{id,width:size,height:size,patternUnits:"userSpaceOnUse",patternTransform:`rotate(${rot})`},d);
    E("rect",{width:size,height:size,fill:"var(--paper)"},p); E("line",{x1:-1,y1:size/2,x2:size+1,y2:size/2,stroke:"var(--spot)","stroke-width":sw},p); };
  { const p=E("pattern",{id:"beam",width:4,height:4,patternUnits:"userSpaceOnUse",patternTransform:"rotate(-60)"},d); E("line",{x1:-1,y1:2,x2:5,y2:2,stroke:"var(--spot)","stroke-width":1.3},p); }
  spot("s-hatch",4.6,-38,1.2); spot("s-dark",3.2,-38,1.5); spot("s-hz",4.2,0,1.1);
  const f = E("filter",{id:"rough",x:"-3%",y:"-3%",width:"106%",height:"106%"},d);
  E("feTurbulence",{type:"fractalNoise",baseFrequency:"0.04",numOctaves:"2",seed:"11",result:"n"},f);
  E("feDisplacementMap",{in:"SourceGraphic",in2:"n",scale:"2.8",xChannelSelector:"R",yChannelSelector:"G"},f);
}
const INK = {stroke:"var(--ink)"};
function L(g,x1,y1,x2,y2,w,extra){ return E("line",Object.assign({x1,y1,x2,y2,stroke:"var(--ink)","stroke-width":w||1,"stroke-linecap":"round"},extra||{}),g); }
let BX0=190, BX1=610, BY0=80, BY1=300, LO={x:0,yt:0,yb:450};
const GEOS = {
  square:  {b:[190,610,80,300],  lo:{x:0,yt:0,yb:450}},
  round:   {b:[190,610,80,300],  lo:{x:0,yt:0,yb:450}},
  hex:     {b:[292,508,100,286], lo:{x:58,yt:24,yb:402}},
  oct:     {b:[250,550,92,292],  lo:{x:46,yt:16,yb:410}},
  corridor:{b:[306,494,150,252], lo:{x:0,yt:0,yb:450}},
};
function ceilY(x){ if(x>W/2) x=W-x; const lx=LO.x; if(lx>0 && x<lx) return LO.yt*x/lx; if(x<BX0) return LO.yt+(BY0-LO.yt)*(x-lx)/(BX0-lx); return BY0; }
function setGeo(shape){ const G = GEOS[shape] || GEOS.square; [BX0,BX1,BY0,BY1] = G.b; LO = G.lo; }
function leftPt(u, frac){ const x=LO.x+(BX0-LO.x)*u, top=LO.yt+(BY0-LO.yt)*u, bot=LO.yb+(BY1-LO.yb)*u; return [x, bot-(bot-top)*frac]; }
function rightPt(u, frac){ const p=leftPt(u,frac); return [W-p[0], p[1]]; }
function drawRoom(room, svg, light){
  defs(svg);
  const shape = room.shape || "square"; setGeo(shape);
  const R = rng(hash("room"+room.id));
  const g = E("g",{filter:"url(#rough)"}, svg);
  const lx=LO.x, rx=W-LO.x;
  E("rect",{x:0,y:0,width:W,height:H,fill:"var(--paper)"},g);
  // ceiling, walls, slivers of further walls (hex and oct)
  E("polygon",{points:`0,0 ${W},0 ${rx},${LO.yt} ${BX1},${BY0} ${BX0},${BY0} ${lx},${LO.yt}`, fill:"url(#x-dark)"},g);
  E("polygon",{points:`${lx},${LO.yt} ${BX0},${BY0} ${BX0},${BY1} ${lx},${LO.yb}`, fill:"url(#h-mid)"},g);
  E("polygon",{points:`${rx},${LO.yt} ${BX1},${BY0} ${BX1},${BY1} ${rx},${LO.yb}`, fill:"url(#h-light)"},g);
  if(lx>0){ E("polygon",{points:`0,0 ${lx},${LO.yt} ${lx},${LO.yb} 0,${H}`,fill:"url(#h-dark)"},g); E("polygon",{points:`${W},0 ${rx},${LO.yt} ${rx},${LO.yb} ${W},${H}`,fill:"url(#h-mid)"},g); }
  // the ceiling: beams by default, coffers or a ribbed vault where the room calls for it
  const ceil = room.ceiling || "beams";
  if(ceil==="open"){
    const sk = skyNow(), dk = sk.sun.alt < -6, R2 = rng(7);
    E("polygon",{points:`0,0 ${W},0 ${rx},${LO.yt} ${BX1},${BY0} ${BX0},${BY0} ${lx},${LO.yt}`, fill: dk ? "#0d0c0b" : "url(#s-hz)"},g);
    if(dk) for(let i=0;i<60;i++){ const x=R2()*W, y=R2()*BY0*.95; if(y<ceilY(x)-3) E("circle",{cx:x,cy:y,r:.6+R2()*1.4,fill:"#F4EFE2"},g); }
    L(g,0,2,W,2,3);
  } else if(ceil==="coffers"){
    for(let k=1;k<8;k++){ const t=k/8; L(g, W*t, 0, BX0+(BX1-BX0)*t, BY0, 2.2,{stroke:"var(--paper)"}); L(g, W*t, 0, BX0+(BX1-BX0)*t, BY0, .8); }
    for(let j=1;j<5;j++){ const f = 1 - Math.pow(.62,j), y = BY0*f, xl = (lx>0? lx*(1-f)+BX0*f : BX0*f), xr = W - (W - (lx>0?W-lx:W))*0 - (W-BX1)*f; L(g, BX0*f, y, W-(W-BX1)*f, y, 2.2,{stroke:"var(--paper)"}); L(g, BX0*f, y, W-(W-BX1)*f, y, .8);
      for(let k=0;k<8;k++){ const t=(k+.5)/8, x = BX0*f*(1) + ((W-(W-BX1)*f) - BX0*f)*t, f2 = 1-Math.pow(.62,j-.5); const yy=BY0*f2, x2 = BX0*f2 + ((W-(W-BX1)*f2)-BX0*f2)*t; E("circle",{cx:x2,cy:yy,r:Math.max(1.5,5*(1-f2)+1.2),fill:"var(--paper)",stroke:"var(--ink)","stroke-width":.8},g); } }
  } else if(ceil==="vault"){
    for(let k=0;k<=8;k++){ const t=k/8, x=W*t, xb=BX0+(BX1-BX0)*t; E("path",{d:`M${x},0 Q${(x+xb)/2},${BY0*.2} ${xb},${BY0}`,fill:"none",stroke:"var(--paper)","stroke-width":3},g); E("path",{d:`M${x},0 Q${(x+xb)/2},${BY0*.2} ${xb},${BY0}`,fill:"none",stroke:"var(--ink)","stroke-width":1.1},g); }
    E("path",{d:`M0,${BY0*.15} Q400,${BY0*1.25} ${W},${BY0*.15}`,fill:"none",stroke:"var(--ink)","stroke-width":1.4},g);
  } else for(let k=1;k<6;k++){ const t=k/6; L(g, W*t, 0, BX0+(BX1-BX0)*t, BY0, 1.6); }
  // back face: courses of cut stone
  for(let y=BY0+22, row=0; y<BY1; y+=22, row++){
    L(g,BX0,y,BX1,y,.9);
    for(let x=BX0+(row%2?0:30); x<BX1; x+=60+R()*8) if(R()>.15) L(g,x,Math.max(BY0,y-22),x,y,.9);
  }
  E("polygon",{points:`${BX0},${BY0} ${BX1},${BY0} ${BX1},${BY0+10} ${BX0},${BY0+10}`,fill:"url(#h-dark)"},g);
  // floor
  E("polygon",{points:`0,${H} ${lx},${LO.yb} ${BX0},${BY1} ${BX1},${BY1} ${rx},${LO.yb} ${W},${H}`, fill:"var(--paper)"},g);
  if(shape==="corridor"){
    // boards equally spaced in depth, so unequally spaced in the picture: a cross-ratio lesson
    const yh = (BY0+BY1)/2 - 10, k = H - yh;
    for(let z=1; ; z+=.28){ const y = yh + k/z; if(y<=BY1+1) break; const t=(H-y)/(H-BY1); L(g, BX0*t, y, W-(W-BX1)*t, y, 1.1); }
    for(let i=-3;i<=3;i++) L(g, 400+i*(BX1-BX0)/7, BY1, 400+i*130, H, .9);
  } else if((room.floor||"")==="checker" || (room.floor||"")==="stone"){
    // a floor laid in true perspective: squares (or flags) of equal size, shrinking with depth
    const yh = BY0 - 40, k = H - yh, zb = k/(BY1-yh), checker = room.floor==="checker";
    const zs=[]; for(let z=1; z<zb; z*=1.22) zs.push(z); zs.push(zb);
    const X = (u, z) => { const y = yh + k/z, t = (H-y)/(H-BY1), xl = LO.x*(1-t)*0 + (0)*(1-t) + BX0*t, xr = W - (W-BX1)*t; return [xl + (xr-xl)*u, y]; };
    const cols = 10;
    for(let r=0;r<zs.length-1;r++) for(let c=0;c<cols;c++){
      const a=X(c/cols,zs[r]), b=X((c+1)/cols,zs[r]), cc=X((c+1)/cols,zs[r+1]), d=X(c/cols,zs[r+1]);
      if(checker){ if((r+c)%2) E("polygon",{points:[a,b,cc,d].map(p=>p.join(",")).join(" "),fill:"url(#h-mid)",stroke:"var(--ink)","stroke-width":.8},g); else E("polygon",{points:[a,b,cc,d].map(p=>p.join(",")).join(" "),fill:"var(--paper)",stroke:"var(--ink)","stroke-width":.8},g); }
      else { L(g,a[0],a[1],b[0],b[1],1); if(R()>.35){ const m=X((c+(r%2?.5:0))/cols,zs[r]), m2=X((c+(r%2?.5:0))/cols,zs[r+1]); L(g,m[0],m[1],m2[0],m2[1],1); } }
    }
  } else {
    const planks=[]; for(let i=-7;i<=7;i++) planks.push([400+i*(BX1-BX0)/14, 400+i*112]);
    planks.forEach(p => L(g,p[0],BY1,p[1],H,1.1));
    for(let i=0;i<planks.length-1;i++) for(let k=0;k<3;k++){ const s=.08+R()*.9, y=BY1+(H-BY1)*s;
      const xa=planks[i][0]+(planks[i][1]-planks[i][0])*s, xb=planks[i+1][0]+(planks[i+1][1]-planks[i+1][0])*s; L(g,xa,y,xb,y,1); }
  }
  E("polygon",{points:`${BX0},${BY1} ${BX1},${BY1} ${BX1+16},${BY1+12} ${BX0-16},${BY1+12}`,fill:"url(#h-light)"},g);
  if(shape==="round"){
    // a curved back wall: the floor line and the cornice bow, and the corners soften into pilasters
    E("path",{d:`M${BX0},${BY0} Q400,${BY0-34} ${BX1},${BY0} L${BX1},${BY0+2} L${BX0},${BY0+2} Z`,fill:"url(#x-dark)"},g);
    E("path",{d:`M${BX0},${BY1} Q400,${BY1+30} ${BX1},${BY1}`,fill:"none",stroke:"var(--ink)","stroke-width":2.4},g);
    E("path",{d:`M${BX0},${BY0} Q400,${BY0-34} ${BX1},${BY0}`,fill:"none",stroke:"var(--ink)","stroke-width":2.4},g);
    [BX0+60, BX1-60].forEach(x => { E("rect",{x:x-6,y:BY0-12,width:12,height:BY1-BY0+22,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1.4},g); L(g,x,BY0-10,x,BY1+8,.7); });
  }
  // contours
  [[lx,LO.yt,BX0,BY0],[rx,LO.yt,BX1,BY0],[lx,LO.yb,BX0,BY1],[rx,LO.yb,BX1,BY1]].forEach(l=>L(g,l[0],l[1],l[2],l[3],2.6));
  if(lx>0){ [[0,0,lx,LO.yt],[W,0,rx,LO.yt],[0,H,lx,LO.yb],[W,H,rx,LO.yb]].forEach(l=>L(g,l[0],l[1],l[2],l[3],2.4)); L(g,lx,LO.yt,lx,LO.yb,2.6); L(g,rx,LO.yt,rx,LO.yb,2.6); }
  if(shape!=="round") E("rect",{x:BX0,y:BY0,width:BX1-BX0,height:BY1-BY0,fill:"none",stroke:"var(--ink)","stroke-width":2.6},g);
  else { L(g,BX0,BY0,BX0,BY1,2.6); L(g,BX1,BY0,BX1,BY1,2.6); }
  return g;
}
/* furniture and fittings, so the pictures match the words */
const DECOR = {
  cases(g,R){ // glass cases of rules on both side walls; one empty
    [leftPt, rightPt].forEach((fn,side) => { for(let k=0;k<3;k++){ const u0=.12+k*.28, u1=u0+.2;
      const a=fn(u0,.18), b=fn(u0,.5), c=fn(u1,.5), d=fn(u1,.18);
      E("polygon",{points:[a,b,c,d].map(p=>p.join(",")).join(" "),fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g);
      if(side===1 && k===1){ T("empty",{x:(a[0]+c[0])/2,y:(a[1]+c[1])/2+4,"text-anchor":"middle","font-size":10,"font-style":"italic",fill:"var(--muted)","font-family":"IM Fell English, serif"},g); continue; }
      for(let j=0;j<3;j++){ const f=.24+j*.08, p=fn(u0+.02,f), q=fn(u1-.02,f), p2=fn(u0+.02,f+.04), q2=fn(u1-.02,f+.04);
        E("polygon",{points:[p,q,q2,p2].map(p=>p.join(",")).join(" "),fill:j===1?"url(#s-hatch)":"url(#h-light)",stroke:"var(--ink)","stroke-width":.8},g);
        for(let t=0;t<9;t++){ const m=fn(u0+.02+(u1-u0-.04)*t/8, f), m2=fn(u0+.02+(u1-u0-.04)*t/8, f+(t%4?.012:.025)); L(g,m[0],m[1],m2[0],m2[1],.6); } }
      L(g,a[0]+4,a[1]-4,c[0]-4,c[1]+6,.6,{stroke:"var(--paper)"}); } });
  },
  bench(g){ // a drafting bench, tilted top, with four instruments drawn small on it
    E("polygon",{points:"300,318 500,318 520,348 280,348",fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g);
    E("polygon",{points:"280,348 520,348 520,356 280,356",fill:"url(#h-mid)",stroke:"var(--ink)","stroke-width":1.4},g);
    [[290,356,290,410],[510,356,510,410],[300,356,300,402],[500,356,500,402]].forEach(l=>L(g,...l,3));
    E("ellipse",{cx:330,cy:333,rx:16,ry:6,fill:"none",stroke:"var(--ink)"},g); L(g,318,330,350,325,1.4); E("circle",{cx:350,cy:325,r:3,fill:"var(--ink)"},g);
    E("path",{d:"M385,338 l22,-12 l18,10",fill:"none",stroke:"var(--ink)","stroke-width":1.6},g); E("circle",{cx:407,cy:326,r:4,fill:"var(--paper)",stroke:"var(--ink)"},g);
    E("path",{d:"M440,340 q10,-14 24,-8 l14,-8",fill:"none",stroke:"var(--ink)","stroke-width":1.6},g); E("path",{d:"M476,322 l8,-2 l-3,7 Z",fill:"var(--ink)"},g);
    E("rect",{x:486,y:324,width:16,height:12,fill:"url(#h-light)",stroke:"var(--ink)"},g);
  },
  glasshouse(g,R){ // panes on the walls and ceiling, palms and ferns
    [leftPt, rightPt].forEach(fn => { for(let k=1;k<6;k++){ const a=fn(k/6,.15), b=fn(k/6,1); L(g,a[0],a[1],b[0],b[1],2.2,{stroke:"var(--paper)"}); L(g,a[0],a[1],b[0],b[1],1); }
      for(const f of [.4,.7]){ const a=fn(.02,f), b=fn(.98,f); L(g,a[0],a[1],b[0],b[1],1.2); } });
    for(let k=1;k<8;k++){ const x=W*k/8; L(g,x,0,BX0+(BX1-BX0)*k/8,BY0,2.2,{stroke:"var(--paper)"}); }
    [[80,420,1.3],[722,420,1.3],[250,330,.8],[560,330,.8]].forEach(([x,y,s]) => { E("path",{d:`M${x-12*s},${y} h${24*s} l${-4*s},${-22*s} h${-16*s} Z`,fill:"url(#s-dark)",stroke:"var(--ink)"},g);
      for(let i=-4;i<=4;i++){ const ex=x+i*14*s, ey=y-40*s-Math.abs(i)*(-6*s)-30*s; E("path",{d:`M${x},${y-22*s} Q${x+i*6*s},${y-60*s} ${ex},${ey+ (Math.abs(i)>2?30*s:0)}`,fill:"none",stroke:"var(--ink)","stroke-width":2.2*s},g);
        for(let j=1;j<5;j++){ const t=j/5, px=x+(ex-x)*t, py=(y-22*s)+(ey-(y-22*s))*t; L(g,px,py,px+(i>=0?7:-7)*s,py+5*s,1); } } });
  },
  cardtables(g){ [[300,345,"var(--spot)"],[520,330,"url(#s-hatch)"]].forEach(([x,y,f],k) => {
      E("ellipse",{cx:x,cy:y,rx:78,ry:22,fill:"url(#s-dark)",stroke:"var(--ink)","stroke-width":2},g);
      E("ellipse",{cx:x,cy:y,rx:70,ry:18,fill:"none",stroke:"var(--paper)","stroke-width":1},g);
      [[-60,0],[60,0],[0,20]].forEach(([dx,dy])=>L(g,x+dx*.9,y+dy+6,x+dx*.9,y+dy+44,3));
      if(k===0) for(let c=0;c<5;c++){ E("rect",{x:x-34+c*13,y:y-10+(c%2)*3,width:10,height:14,fill:"var(--paper)",stroke:"var(--ink)",transform:`rotate(${c*8-16} ${x-29+c*13} ${y-3})`},g); }
      else { E("rect",{x:x-30,y:y-12,width:10,height:14,fill:"var(--paper)",stroke:"var(--ink)"},g); E("rect",{x:x+20,y:y-12,width:10,height:14,fill:"var(--paper)",stroke:"var(--ink)"},g); } });
  },
  tilefloor(g){ // a fifteen puzzle laid into the floor, in perspective
    const cols=4, z0=1.15, z1=2.9, yh=190, k=H-yh;
    const P = (u,z) => { const y=yh+k/z, t=(H-y)/(H-BY1); const xl=BX0*t+120*(1-t)*0, xr=W-(W-BX1)*t; const cxm=400, half=(xr-xl)/2*.62; return [cxm-half+2*half*u, y]; };
    const nums=[1,2,3,4,5,6,7,8,9,10,11,12,13,15,14,0];
    for(let r=0;r<4;r++) for(let c=0;c<cols;c++){ const za=z1-(z1-z0)*r/4, zb=z1-(z1-z0)*(r+1)/4, n=nums[r*4+c];
      const p=[P(c/4,za),P((c+1)/4,za),P((c+1)/4,zb),P(c/4,zb)];
      E("polygon",{points:p.map(q=>q.join(",")).join(" "),fill:n?((r+c)%2?"var(--paper)":"url(#h-light)"):"var(--void)",stroke:"var(--ink)","stroke-width":1.6},g);
      if(n){ const m=[(p[0][0]+p[2][0])/2,(p[0][1]+p[2][1])/2+5]; T(String(n),{x:m[0],y:m[1],"text-anchor":"middle","font-size":11+r*3.2,fill:n>13?"var(--spot)":"var(--ink)","font-family":"IM Fell English SC, serif"},g); } }
  },
  dial(g){ const cx=BX1-70, cy=BY0+70; E("circle",{cx,cy,r:30,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g);
    T("+1",{x:cx-14,y:cy-6,"font-size":11,"text-anchor":"middle",fill:"var(--ink)","font-family":"IM Fell English, serif"},g); T("−1",{x:cx+14,y:cy-6,"font-size":11,"text-anchor":"middle",fill:"var(--ink)","font-family":"IM Fell English, serif"},g);
    L(g,cx,cy+10,cx-12,cy-14,2.4,{stroke:"var(--spot)"}); E("circle",{cx,cy:cy+10,r:3,fill:"var(--ink)"},g); T("PARITY",{x:cx,y:cy+24,"font-size":7,"letter-spacing":"1.5","text-anchor":"middle",fill:"var(--ink)","font-family":"IM Fell English SC, serif"},g); },
  lattice(g){ // atoms on the back wall, with one dislocation and a Burgers circuit that fails to close
    const a=22, h=a*Math.sqrt(3)/2, x0=BX0+16, y0=BY0+18;
    for(let r=0;r*h<BY1-BY0-24;r++) for(let c=0;c*a<BX1-BX0-24;c++){ let x=x0+c*a+(r%2)*a/2, y=y0+r*h;
      const xm=400; if(r>=5 && Math.abs(x-xm)<a*.6) continue; if(r>=5) x += (x<xm? -a*.25 : a*.25);
      E("circle",{cx:x,cy:y,r:3.2,fill:"var(--ink)"},g); }
    E("path",{d:`M${400-3*a},${y0+3*h} h${6*a} l${a/2},${4*h} h${-6*a-a*.5}`,fill:"none",stroke:"var(--spot)","stroke-width":2,"stroke-dasharray":"5 3"},g);
    E("path",{d:`M${400-3*a-a/2+2},${y0+7*h} l${a*.5-2},${-4*h+4}`,fill:"none",stroke:"var(--spot)","stroke-width":2.6},g);
    T("b",{x:400-3*a-a,y:y0+5.4*h,"font-size":14,"font-style":"italic",fill:"var(--spot)","font-family":"IM Fell English, serif"},g);
  },
  bigtree(g){ // a tree growing out of the floor, three branches at every fork
    const br=(x,y,len,ang,n,w)=>{ const x2=x+Math.sin(ang)*len, y2=y-Math.cos(ang)*len; L(g,x,y,x2,y2,w); if(!n){ E("circle",{cx:x2,cy:y2,r:2.6,fill:"var(--spot)"},g); return; } [-.55,0,.55].forEach(d=>br(x2,y2,len*.58,ang+d,n-1,Math.max(.8,w*.62))); };
    br(400,BY1+30,62,0,3,7); },
  gloom(g){ const lit = S.lantern && S.inv.includes("lantern"); E("rect",{x:0,y:0,width:W,height:H,fill:"url(#x-dark)",opacity:lit?.18:.55},g); E("ellipse",{cx:400,cy:330,rx:lit?330:210,ry:lit?190:120,fill:"var(--paper)",opacity:lit?.5:.35},g); },
  cot(g){ E("polygon",{points:"230,360 470,360 500,392 200,392",fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g);
    E("polygon",{points:"200,392 500,392 500,402 200,402",fill:"url(#h-mid)",stroke:"var(--ink)"},g); L(g,205,402,205,428,3); L(g,495,402,495,428,3);
    E("ellipse",{cx:250,cy:368,rx:22,ry:8,fill:"var(--paper)",stroke:"var(--ink)"},g); E("path",{d:"M270,372 q90,-16 200,4",fill:"none",stroke:"var(--ink)","stroke-width":1.4},g);
    E("circle",{cx:262,cy:356,r:2.4,fill:"var(--spot)"},g); E("path",{d:"M262,352 q-6,-14 4,-24 q8,-10 0,-22",fill:"none",stroke:"var(--ink)","stroke-width":.8,opacity:.7},g); },
  names(g, R, room){ const sp = room.widget && room.widget.names; if(!sp) return;
    sp.forEach((n,i) => { const col=i%2, row=Math.floor(i/2), x=BX0+30+col*(BX1-BX0-60)/2+R()*20, y=BY0+30+row*24;
      if(y>BY1-10) return; T((n.n!=null? n.n+" · ":"")+n.name,{x,y,"font-size":12,"font-style":"italic",fill:"var(--ink)","font-family":"IM Fell English, serif",opacity:.85,transform:`rotate(${(R()-.5)*6} ${x} ${y})`},g); }); },
  fibrect(g){ // the back wall is a golden rectangle, cut into squares, with the spiral
    const x0=BX0+10, y0=BY0+10, h=BY1-BY0-20, w=Math.min(BX1-BX0-20, h*1.618); let x=x0, y=y0, ww=w, hh=h, dir=0;
    E("rect",{x:x0,y:y0,width:w,height:h,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1.6},g);
    let d="";
    for(let k=0;k<9;k++){ const s=Math.min(ww,hh); let sx,sy,ax,ay,bx,by;
      if(dir===0){ sx=x; sy=y; x+=s; ww-=s; ax=sx; ay=sy+s; bx=sx+s; by=sy; }
      else if(dir===1){ sx=x; sy=y; y+=s; hh-=s; ax=sx; ay=sy; bx=sx+s; by=sy+s; }
      else if(dir===2){ sx=x+ww-s; sy=y; ww-=s; ax=sx+s; ay=sy; bx=sx; by=sy+s; }
      else { sx=x; sy=y+hh-s; hh-=s; ax=sx+s; ay=sy+s; bx=sx; by=sy; }
      E("rect",{x:sx,y:sy,width:s,height:s,fill:k%2?"url(#h-light)":"var(--paper)",stroke:"var(--ink)","stroke-width":1},g);
      d += (k? "":"M"+ax+","+ay) + ` A${s},${s} 0 0 1 ${bx},${by}`; dir=(dir+1)%4; }
    E("path",{d,fill:"none",stroke:"var(--spot)","stroke-width":2},g); },
  fibfloor(g){ // the corridor floor is a golden rectangle, cut into squares like Euclid's algorithm on Fibonacci numbers
    const yh=(BY0+BY1)/2-10, k=H-yh, phi=(1+Math.sqrt(5))/2;
    const S2 = (X,Z) => [400 + X*400/Z, yh + k/Z];
    const hw0=.66; let x0=-hw0, x1=hw0, z1=4.15, z0=z1-2*hw0*phi, dir=0; const pts=[];
    for(let n=0;n<9;n++){ const wX=x1-x0, wZ=z1-z0, s=Math.min(wX,wZ); let q;
      if(dir===0){ q=[x0,x1,z0,z0+s]; z0+=s; } else if(dir===1){ q=[x0,x0+s,z0,z1]; x0+=s; } else if(dir===2){ q=[x0,x1,z1-s,z1]; z1-=s; } else { q=[x1-s,x1,z0,z1]; x1-=s; }
      const c=[S2(q[0],q[2]),S2(q[1],q[2]),S2(q[1],q[3]),S2(q[0],q[3])];
      E("polygon",{points:c.map(p=>p.join(",")).join(" "),fill:n%2?"url(#h-light)":"var(--paper)",stroke:"var(--ink)","stroke-width":n<3?2.4:1.4},g);
      { const m=S2((q[0]+q[1])/2,(q[2]+q[3])/2); if(n<5) T(String([89,55,34,21,13][n]>0?["55","34","21","13","8"][n]:""),{x:m[0],y:m[1]+4,"text-anchor":"middle","font-size":Math.max(9,22-n*3.5),fill:"var(--ink)","font-family":"IM Fell English SC, serif",opacity:.7},g); }
      const ctr = [[q[1],q[3]],[q[1],q[2]],[q[0],q[2]],[q[0],q[3]]][dir], a0 = [-Math.PI/2, Math.PI, Math.PI/2, 0][dir];
      for(let t=0;t<=12;t++){ const a=a0 - t/12*Math.PI/2; pts.push(S2(ctr[0]+s*Math.cos(a), ctr[1]+s*Math.sin(a))); }
      dir=(dir+1)%4; }
    E("polyline",{points:pts.map(p=>p.map(v=>v.toFixed(1)).join(",")).join(" "),fill:"none",stroke:"var(--spot)","stroke-width":2.4},g);
  },
  pillar(g){ E("rect",{x:372,y:BY0-10,width:56,height:BY1-BY0+150,fill:"url(#h-light)",stroke:"var(--ink)","stroke-width":2.4},g); E("rect",{x:362,y:BY0-18,width:76,height:12,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g); E("rect",{x:362,y:BY1+140,width:76,height:12,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g);
    for(let k=1;k<5;k++) L(g,372+k*11.2,BY0-6,372+k*11.2,BY1+140,.7); T("0",{x:400,y:BY0+60,"text-anchor":"middle","font-size":22,fill:"var(--spot)","font-family":"IM Fell English SC, serif"},g); },
  thermo(g){ const wxc = weather(), t = wxc ? wxc.temperature_2m : null, p = wxc ? wxc.surface_pressure : null;
    const x=BX1-46, y0=BY0+18, y1=BY0+150; E("rect",{x:x-16,y:y0-8,width:32,height:y1-y0+34,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g);
    E("rect",{x:x-4,y:y0,width:8,height:y1-y0,rx:4,fill:"var(--paper2)",stroke:"var(--ink)"},g); E("circle",{cx:x,cy:y1+10,r:9,fill:"var(--spot)",stroke:"var(--ink)"},g);
    for(let k=0;k<=12;k++){ const yy=y1-(y1-y0)*k/12; L(g,x+5,yy,x+(k%3?9:13),yy,.8); }
    if(t!=null){ const f=Math.max(0,Math.min(1,(t+20)/120)), yy=y1-(y1-y0)*f; E("rect",{x:x-2.5,y:yy,width:5,height:y1-yy+4,fill:"var(--spot)"},g);
      T(Math.round(t)+"°F",{x:x,y:y0-12,"text-anchor":"middle","font-size":12,fill:"var(--ink)","font-family":"IM Fell English SC, serif"},g); }
    const bx=BX1-118, by=BY0+70; E("circle",{cx:bx,cy:by,r:34,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2.4},g); E("circle",{cx:bx,cy:by,r:28,fill:"none",stroke:"var(--ink)","stroke-width":.6},g);
    ["RAIN","CHANGE","FAIR"].forEach((w,k)=>T(w,{x:bx+(k-1)*20,y:by+(k===1?-14:-6),"text-anchor":"middle","font-size":6,fill:"var(--ink)","font-family":"IM Fell English SC, serif"},g));
    if(p!=null){ const a = (-60 + 120*Math.max(0,Math.min(1,(p-980)/60)))*DEG; L(g,bx,by,bx+Math.sin(a)*24,by-Math.cos(a)*24,2,{stroke:"var(--spot)"}); T((p*0.02953).toFixed(2)+" in",{x:bx,y:by+20,"text-anchor":"middle","font-size":8,fill:"var(--ink)","font-family":"IM Fell English, serif"},g); }
    E("circle",{cx:bx,cy:by,r:2.5,fill:"var(--ink)"},g); },
  sundial(g){ const sk = skyNow(), Hd = (((sk.L - sk.sun.ra)%360)+540)%360-180, phi = LAT*DEG, H = Hd*DEG;
    const cx=400, cy=372, rx=150, ry=40, Fz = (facing() + 90*S.face)*DEG;
    const P2 = (az, rr) => { const r = az - Fz; return [cx + Math.sin(r)*rx*rr, cy - Math.cos(r)*ry*rr]; };
    E("ellipse",{cx,cy:cy+12,rx:rx+10,ry:ry+8,fill:"url(#h-mid)",stroke:"var(--ink)","stroke-width":2},g);
    E("ellipse",{cx,cy,rx:rx+10,ry:ry+8,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2.2},g);
    for(let h=6; h<=18; h++){ const th = Math.atan2(Math.sin(phi)*Math.sin((h-12)*15*DEG), Math.cos((h-12)*15*DEG)); const a=P2(th,.25), b=P2(th,.95); L(g,a[0],a[1],b[0],b[1],h===12?1.6:.8);
      const lp=P2(th,1.08); T(["VI","VII","VIII","IX","X","XI","XII","I","II","III","IV","V","VI"][h-6],{x:lp[0],y:lp[1]+3,"text-anchor":"middle","font-size":8,fill:"var(--ink)","font-family":"IM Fell English SC, serif"},g); }
    if(sk.sun.alt>0){ const th = Math.atan2(Math.sin(phi)*Math.sin(H), Math.cos(H)), a=P2(0,0), b=P2(th,.9); E("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:"var(--spot)","stroke-width":4,"stroke-linecap":"round"},g); }
    const n0=P2(0,0), n1=P2(0,.7); E("polygon",{points:`${n0[0]},${n0[1]} ${n1[0]},${n1[1]} ${n1[0]},${n1[1]-30}`,fill:"url(#h-dark)",stroke:"var(--ink)","stroke-width":1.6},g); },
  woodcut(g){ const x=BX1-118, y=BY0+18; E("rect",{x,y,width:96,height:78,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":3},g);
    E("rect",{x:x+6,y:y+6,width:84,height:66,fill:"none",stroke:"var(--ink)","stroke-width":.8},g);
    for(let r=0;r<4;r++) for(let c=0;c<=r;c++){ const cx=x+48+(c-r/2)*14, cy=y+18+r*12; E("circle",{cx,cy,r:6.4,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1},g); E("path",{d:`M${cx+1},${cy-6} a6,6 0 0 1 0,12 a3,6 0 0 0 0,-12 Z`,fill:"url(#h-dark)"},g); }
    T("KEPLER 1611",{x:x+48,y:y+70,"text-anchor":"middle","font-size":7,"letter-spacing":"1",fill:"var(--ink)","font-family":"IM Fell English SC, serif"},g); },
  chalkboard(g){ const x=BX0+30, y=BY0+10, w=BX1-BX0-60, h=40;
    E("rect",{x:x-6,y:y-6,width:w+12,height:h+12,fill:"url(#h-mid)",stroke:"var(--ink)","stroke-width":2},g);
    E("rect",{x,y,width:w,height:h,fill:"#1d2420",stroke:"var(--ink)"},g);
    T("3/4 + 1/6 = 9/12 + 2/12 = 11/12",{x:x+w/2,y:y+26,"text-anchor":"middle","font-size":16,fill:"#EDEBE3","font-family":"IM Fell English, serif","font-style":"italic"},g);
    L(g,x,y+h+4,x+w,y+h+4,3); },
  desks(g){ for(let r=0;r<2;r++) for(let c=-1;c<=1;c++){ const x=400+c*(150+r*40), y=330+r*48, w=70+r*16;
    E("polygon",{points:`${x-w/2},${y} ${x+w/2},${y} ${x+w/2+8},${y+12} ${x-w/2-8},${y+12}`,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1.6},g);
    E("rect",{x:x-w/2-8,y:y+12,width:w+16,height:5,fill:"url(#h-mid)",stroke:"var(--ink)"},g); L(g,x-w/2,y+17,x-w/2,y+40+r*8,2.4); L(g,x+w/2,y+17,x+w/2,y+40+r*8,2.4); } },
  workbench(g){ E("polygon",{points:"250,335 550,335 575,360 225,360",fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g);
    E("rect",{x:225,y:360,width:350,height:9,fill:"url(#h-mid)",stroke:"var(--ink)"},g); [235,565].forEach(x=>L(g,x,369,x,425,4));
    E("path",{d:"M270,334 l14,-24 h24 l14,24",fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1.4},g); E("ellipse",{cx:296,cy:310,rx:12,ry:4,fill:"url(#h-light)",stroke:"var(--ink)"},g);
    E("polygon",{points:"340,334 362,318 384,334",fill:"url(#s-hatch)",stroke:"var(--ink)"},g);
    for(let i=0;i<14;i++) E("circle",{cx:420+((i*37)%120),cy:328+((i*13)%8),r:1,fill:"var(--ink)"},g);
    L(g,470,333,520,322,2.4); E("rect",{x:514,y:316,width:16,height:8,fill:"var(--ink)",transform:"rotate(-12 522 320)"},g); },
  tiers(g){ for(let k=0;k<4;k++){ const y=360+k*22, rx=170+k*55; E("path",{d:`M${400-rx},${y} Q400,${y-40} ${400+rx},${y}`,fill:"none",stroke:"var(--ink)","stroke-width":3},g); E("path",{d:`M${400-rx},${y+8} Q400,${y-32} ${400+rx},${y+8}`,fill:"none",stroke:"var(--ink)","stroke-width":1},g); } },
  screen(g){ const x=BX0+90, y=BY0+8, w=BX1-BX0-180, h=40; L(g,x-6,y-4,x+w+6,y-4,4); E("rect",{x,y,width:w,height:h,fill:"var(--paper2)",stroke:"var(--ink)","stroke-width":1.6},g);
    for(let i=0;i<40;i++){ const t=i*2.39996, r=2*Math.sqrt(i+.5); E("circle",{cx:x+w/2+r*Math.cos(t)*1.8,cy:y+h/2+r*Math.sin(t)*.9,r:1.3,fill:"var(--ink)"},g); }
    E("path",{d:`M400,0 L${x+w/2-6},${y-4} M400,0 L${x+w/2+6},${y-4}`,stroke:"var(--ink)","stroke-width":.6,"stroke-dasharray":"2 4"},g); },
  longtable(g){ E("polygon",{points:"300,322 500,322 610,400 190,400",fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g);
    E("polygon",{points:"190,400 610,400 610,410 190,410",fill:"url(#h-mid)",stroke:"var(--ink)"},g); [200,600].forEach(x=>L(g,x,410,x,440,4));
    for(let i=0;i<9;i++){ const x=290+((i*53)%200)+ (i>4?20:0), y=332+((i*29)%56); E("rect",{x,y,width:22,height:16,fill:"var(--paper)",stroke:"var(--ink)",transform:`rotate(${(i*23)%30-15} ${x+11} ${y+8})`},g); L(g,x+4,y+6,x+18,y+6,.6); } },
  polytope(g){ // an icosahedron hanging from the ceiling: the snub 24-cell's cells are icosahedra and tetrahedra
    const t=(1+Math.sqrt(5))/2, PX=BX1-78, PY=BY0+74, V=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]];
    const a=.5, b=.35, rot=([x,y,z])=>{ const x1=x*Math.cos(a)+z*Math.sin(a), z1=-x*Math.sin(a)+z*Math.cos(a), y1=y*Math.cos(b)-z1*Math.sin(b); return [x1,y1]; };
    const P=V.map(v=>{ const [x,y]=rot(v); return [PX+x*30, PY+y*30]; });
    L(g,PX,0,PX,PY-t*30*.95,1);
    for(let i=0;i<12;i++) for(let j=i+1;j<12;j++){ const dd=Math.hypot(V[i][0]-V[j][0],V[i][1]-V[j][1],V[i][2]-V[j][2]); if(Math.abs(dd-2)<1e-6) L(g,P[i][0],P[i][1],P[j][0],P[j][1],1.6); }
    P.forEach(p=>E("circle",{cx:p[0],cy:p[1],r:2.4,fill:"var(--spot)"},g)); },
  sand(g,R){ E("polygon",{points:`0,${H} ${LO.x},${LO.yb} ${BX0},${BY1} ${BX1},${BY1} ${W-LO.x},${LO.yb} ${W},${H}`,fill:"var(--paper)"},g);
    for(let i=0;i<700;i++){ const y=BY1+4+Math.pow(R(),.8)*(H-BY1-6), t=(H-y)/(H-BY1), xl=BX0*t, xr=W-(W-BX1)*t, x=xl+R()*(xr-xl); E("circle",{cx:x,cy:y,r:.5+R()*(1-t)*1.3,fill:"var(--ink)"},g); }
    for(let k=0;k<4;k++){ const y=330+k*28; E("path",{d:`M${120+k*20},${y} q140,-14 280,0 t280,0`,fill:"none",stroke:"var(--ink)","stroke-width":.7,opacity:.6},g); } },
  sea(g){ const wx=BX0+12, wy=BY0+16; for(let k=0;k<4;k++) E("path",{d:`M${wx},${wy+48+k*6} q7,-4 14,0 t14,0 t14,0 t14,0`,fill:"none",stroke:"var(--ink)","stroke-width":1},g); },
  alethiometer(g){ const cx=400, cy=262; L(g,cx,cy+26,cx,BY1+42,5); E("polygon",{points:`${cx-26},${BY1+42} ${cx+26},${BY1+42} ${cx+16},${BY1+34} ${cx-16},${BY1+34}`,fill:"url(#h-mid)",stroke:"var(--ink)"},g);
    E("circle",{cx,cy,r:30,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2.4},g); E("circle",{cx,cy,r:22,fill:"url(#s-hatch)",stroke:"var(--ink)"},g);
    for(let k=0;k<36;k++){ const t=k/36*2*Math.PI; L(g,cx+Math.cos(t)*24,cy+Math.sin(t)*24,cx+Math.cos(t)*29,cy+Math.sin(t)*29,.7); }
    [0,2.1,4.2].forEach(t=>L(g,cx,cy,cx+Math.cos(t)*20,cy+Math.sin(t)*20,1.6)); L(g,cx,cy,cx+Math.cos(5.3)*24,cy+Math.sin(5.3)*24,1.2,{stroke:"var(--spot)"}); },
  lowshelves(g,R){ [leftPt,rightPt].forEach(fn=>{ for(let s2=0;s2<2;s2++){ const fr=.05+s2*.16; for(let u=.1;u<.9;u+=.03+R()*.02){ const p=fn(u,fr), q=fn(u,fr+.1+R()*.03); L(g,p[0],p[1],q[0],q[1],3.4); L(g,p[0],p[1]-1,q[0],q[1]+1,1.4,{stroke:"var(--paper)"}); } const a=fn(.06,fr), b=fn(.94,fr); L(g,a[0],a[1],b[0],b[1],4); } }); },
};

function decor(room, svg, light, mirror){
  const homeAhead = pos(1)===1, R = rng(hash(room.id)), night = light==="night";
  const d = (room.decor || []).filter(x => homeAhead || !WALL_DECOR.includes(x));
  const g = E("g", Object.assign({filter:"url(#rough)"}, mirror ? {transform:`translate(${W},0) scale(-1,1)`} : {}), svg);
  const PRE = ["sand","tilefloor","fibfloor","lattice","fibrect","chalkboard","screen","bigtree","woodcut","cases","glasshouse","lowshelves"];
  d.forEach(name => { if(PRE.includes(name) && DECOR[name]) DECOR[name](g, R, room); });
  if(d.includes("glacier")){
    for(let i=0;i<12;i++){ const x=BX0+20+R()*(BX1-BX0-40); L(g,x,BY0+10,x+(R()-.5)*30,BY0+40+R()*120,.7); }
    for(let i=0;i<26;i++){ const x=20+i*30+R()*10, h=12+R()*30, y0=ceilY(x);
      E("path",{d:`M${x},${y0} l6,${h} l6,${-h} Z`,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1.2},g); L(g,x+3,y0+2,x+6,y0+h*.7,.6); }
  }
  if(d.includes("shelves")){
    [leftPt, rightPt].forEach(fn => {
      for(let s=0;s<5;s++){
        const fr = .12 + s*.19;
        for(let u=.06; u<.94; u+= .02+R()*.016){
          if(R()<.1) continue;
          const tall = .10 + R()*.05, p = fn(u, fr), q = fn(u, fr+tall), w = 2.4+R()*2.2, dark = R()<.35;
          E("line",{x1:p[0],y1:p[1]-1,x2:q[0],y2:q[1],stroke:"var(--ink)","stroke-width":w+1.6,"stroke-linecap":"butt"},g);
          if(!dark) E("line",{x1:p[0],y1:p[1]-2,x2:q[0],y2:q[1]+1,stroke:"var(--paper)","stroke-width":Math.max(.8,w-1),"stroke-linecap":"butt"},g);
          if(R()<.4){ const m=fn(u, fr+tall*.7), m2=fn(u+.004, fr+tall*.7); L(g,m[0]-w/2,m[1],m2[0]+w/2,m2[1],.8); }
        }
        const a = fn(.03, fr), b = fn(.97, fr);
        E("line",{x1:a[0],y1:a[1]+1,x2:b[0],y2:b[1]+1,stroke:"var(--ink)","stroke-width":4},g);
        E("line",{x1:a[0],y1:a[1]-.5,x2:b[0],y2:b[1]-.5,stroke:"var(--paper)","stroke-width":1},g);
      }
    });
  }
  if(d.includes("window")){
    const ww=(BX1-BX0)<260?44:56, wx=BX0+12, wy=BY0+16, wh=70, path=`M${wx},${wy+wh} V${wy+20} A${ww/2},20 0 0 1 ${wx+ww},${wy+20} V${wy+wh} Z`;
    const sk = skyNow(), rel = a => ((a - facing() + 540) % 360) - 180;
    const sunRel = rel(sk.sun.az), moonRel = rel(sk.moon.az), dark = sk.sun.alt < -6;
    E("path",{d:`M${wx-6},${wy+wh+6} V${wy+18} A${ww/2+6},24 0 0 1 ${wx+ww+6},${wy+18} V${wy+wh+6} Z`,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g);
    E("path",{d:path,fill:dark?"#0d0c0b":(sk.sun.alt<0?"url(#s-dark)":"url(#s-hz)"),stroke:"var(--ink)","stroke-width":2},g);
    const inWin = (alt, r) => [wx + ww/2 + Math.max(-1,Math.min(1,r/60))*(ww/2-9), wy + wh - 10 - Math.max(0,Math.min(1,alt/50))*(wh-26)];
    if(dark){ for(let i=0;i<8;i++){ const x=wx+6+R()*(ww-12), y=wy+14+R()*(wh-20), r=1.2+R()*1.5; L(g,x-r,y,x+r,y,1,{stroke:"#F4EFE2"}); L(g,x,y-r,x,y+r,1,{stroke:"#F4EFE2"}); } }
    if(sk.moon.alt>0 && Math.abs(moonRel)<70){ const [mx,my]=inWin(sk.moon.alt,moonRel), p=sk.moon.phase;
      E("circle",{cx:mx,cy:my,r:7,fill:"#F4EFE2",stroke:"var(--ink)","stroke-width":.8},g); E("circle",{cx:mx + (p<.5 ? -28*p : 28*(1-p)), cy:my, r:7.4, fill:dark?"#0d0c0b":"url(#s-hz)"},g); }
    const wxc = weather(), wk = wxc ? wxKind(wxc.weather_code) : "clear", overcast = wxc && wxc.cloud_cover>85;
    if(sk.sun.alt>-2 && Math.abs(sunRel)<70 && !overcast){ const [sx,sy]=inWin(sk.sun.alt,sunRel);
      for(let k=0;k<12;k++){ const t=k/12*2*Math.PI; L(g,sx+Math.cos(t)*9,sy+Math.sin(t)*9,sx+Math.cos(t)*(k%2?12:15),sy+Math.sin(t)*(k%2?12:15),1.1); }
      E("circle",{cx:sx,cy:sy,r:7,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1.4},g); }
    // the weather outside, from Open-Meteo
    const wclip = "wclip"+room.id; const cp = E("clipPath",{id:wclip},g); E("path",{d:path},cp); const wg = E("g",{"clip-path":`url(#${wclip})`},g);
    if(wk!=="clear"){ [[.3,.32,14],[.72,.22,11],[.55,.5,9]].slice(0, overcast?3:2).forEach(([fx,fy,r]) => { const cx=wx+ww*fx, cy=wy+wh*fy; ["-1","0","1"].forEach((k,j) => E("circle",{cx:cx+(j-1)*r*.8,cy:cy+(j===1?-r*.35:0),r:r*(j===1?.8:.6),fill:dark?"#2a2724":"var(--paper)",stroke:"var(--ink)","stroke-width":.9},wg)); }); }
    if(wk==="rain"||wk==="storm") for(let i=0;i<18;i++){ const x=wx+R()*ww, y=wy+20+R()*(wh-24); L(wg,x,y,x-3,y+8,.9,{stroke:dark?"#F4EFE2":"var(--ink)"}); }
    if(wk==="snow") for(let i=0;i<22;i++) E("circle",{cx:wx+R()*ww,cy:wy+16+R()*(wh-18),r:1.1+R(),fill:dark?"#F4EFE2":"var(--paper)",stroke:"var(--ink)","stroke-width":.4},wg);
    if(wk==="fog") for(let k=0;k<6;k++) L(wg,wx+2,wy+24+k*8,wx+ww-2,wy+24+k*8,1.4,{"stroke-dasharray":"6 4",opacity:.7});
    if(wk==="storm") E("path",{d:`M${wx+ww*.6},${wy+22} l-6,12 h6 l-8,14`,fill:"none",stroke:"var(--spot)","stroke-width":2},wg);
    L(g,wx+ww/2,wy+4,wx+ww/2,wy+wh,2); L(g,wx,wy+wh*.55,wx+ww,wy+wh*.55,2);
    // a beam of sun (or full moon) on the floor
    const src = (sk.sun.alt>2 && Math.abs(sunRel)<80 && !overcast) ? {alt:sk.sun.alt, rel:sunRel} : (dark && sk.moon.alt>5 && Math.abs(moonRel)<80 && Math.abs(sk.moon.phase-.5)<.2) ? {alt:sk.moon.alt, rel:moonRel, moon:true} : null;
    LIGHT.beam = src;
    if(src){ const dy = Math.max(24, Math.min(150, 60/Math.tan(src.alt*DEG))), dx = Math.max(-220, Math.min(220, -Math.tan(src.rel*DEG)*dy*1.3));
      const pts = `${wx},${BY1} ${wx+ww},${BY1} ${wx+ww+dx+10},${BY1+dy} ${wx+dx-10},${BY1+dy}`;
      E("polygon",{points:pts,fill:"url(#beam)",opacity:src.moon?.6:.9},g);
      L(g,wx,wy+wh,wx+dx-10,BY1+dy,.6,{"stroke-dasharray":"2 5",opacity:.6}); L(g,wx+ww,wy+20,wx+ww+dx+10,BY1+dy,.6,{"stroke-dasharray":"2 5",opacity:.6}); }
  }
  if(d.includes("sky")){ const sg = E("g",{},svg); drawSky(sg, 400, 158, 118, {tag:"c", names:false}); }
  if(d.includes("stars")){ for(let i=0;i<34;i++){ const x=R()*W, y=R()*BY0*.9; if(y < ceilY(x)-4){ const r=1.5+R()*2.5;
    E("path",{d:`M${x-r},${y} L${x},${y-r*.35} L${x+r},${y} L${x},${y+r*.35} Z M${x},${y-r} L${x+r*.35},${y} L${x},${y+r} L${x-r*.35},${y} Z`,fill:"var(--paper)"},g); } } }
  if(d.includes("lamp")){
    const lit = LIGHT.lamp = (light==="night" || light==="dusk" || S.light==="night" || room.dark);
    L(g,400,0,400,34,1.6);
    if(lit) for(let k=0;k<18;k++){ const t=Math.PI*(.08+k/17*.84); L(g,400+Math.cos(t)*16,58+Math.sin(t)*16,400+Math.cos(t)*(k%2?34:50),58+Math.sin(t)*(k%2?34:50),.8); }
    E("path",{d:"M384,34 h32 l9,19 h-50 Z",fill:lit?"var(--spot)":"url(#h-mid)",stroke:"var(--ink)","stroke-width":1.5},g);
    E("circle",{cx:400,cy:58,r:5,fill:lit?"#F4EFE2":"var(--paper)",stroke:"var(--ink)"},g);
  }
  if(d.includes("rug")){ E("polygon",{points:"330,330 470,330 560,420 240,420",fill:"url(#s-hatch)",stroke:"var(--ink)","stroke-width":2},g);
    E("polygon",{points:"340,336 460,336 540,414 260,414",fill:"none",stroke:"var(--ink)","stroke-width":1},g);
    for(let i=0;i<14;i++){ const x=240+i*320/13; L(g,x,420,x,428,1); } }
  if(d.includes("stair")){
    for(let i=0;i<7;i++) E("ellipse",{cx:400,cy:372-i*5,rx:130-i*15,ry:42-i*5,fill:i===6?"var(--ink)":(i%2?"url(#h-mid)":"var(--paper)"),stroke:"var(--ink)","stroke-width":1.2},g);
    for(let a=0;a<20;a++){ const t=a/20*2*Math.PI; if(Math.sin(t)<-.2) continue; const x=400+130*Math.cos(t), y=350+42*Math.sin(t); L(g,x,y,x,y+22,1.4); }
    E("ellipse",{cx:400,cy:350,rx:130,ry:42,fill:"none",stroke:"var(--ink)","stroke-width":3},g);
  }
  if(d.includes("pool")){
    const cx=400, cy=378, rx=170, ry=48;
    E("ellipse",{cx,cy,rx:rx+8,ry:ry+5,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2.4},g);
    E("ellipse",{cx,cy,rx,ry,fill:"url(#s-hz)",stroke:"var(--ink)","stroke-width":1.2},g);
    const r=11; for(let j=-3;j<=3;j++) for(let i=-9;i<=9;i++){ const x=cx+(i+(j&1)*.5)*2*r, y=cy+j*r*1.732*ry/rx*1.6;
      if(((x-cx)/rx)**2+((y-cy)/ry)**2 < .78){ const ry2=r*.95*ry/rx*1.6, a=R()*Math.PI*2;
        E("path",{d:`M${x},${y} L${x+Math.cos(a)*r*.95},${y+Math.sin(a)*ry2} A${r*.95},${ry2} 0 1 1 ${x+Math.cos(a+.5)*r*.95},${y+Math.sin(a+.5)*ry2} Z`,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1},g); } }
  }
  if(d.includes("pendulum")){
    for(let k=0;k<36;k++){ const t=k/36*2*Math.PI, x=400+150*Math.cos(t), y=385+38*Math.sin(t); E("rect",{x:x-2.5,y:y-7,width:5,height:8,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1},g); }
    const sw = E("g",{},g);
    L(sw,400,0,400,366,1.4);
    E("circle",{cx:400,cy:378,r:13,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},sw);
    E("path",{d:"M400,365 A13,13 0 0 1 400,391 A8,13 0 0 0 400,365 Z",fill:"url(#h-dark)"},sw);
    E("animateTransform",{attributeName:"transform",type:"rotate",values:"-7 400 0;7 400 0;-7 400 0",dur:"5.6s",repeatCount:"indefinite",calcMode:"spline",keySplines:".45 0 .55 1;.45 0 .55 1"},sw);
  }
  if(d.includes("clockface")){
    const cx=BX0+82, cy=BY0+78, r=36, d0=now(), hh=d0.getHours()%12 + d0.getMinutes()/60;
    E("circle",{cx,cy,r:r+5,fill:"url(#s-hatch)",stroke:"var(--ink)","stroke-width":2},g);
    E("circle",{cx,cy,r,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g);
    for(let i=0;i<12;i++){ const t=i/12*2*Math.PI; T(i===0?"10":"0123456789↊↋"[i],{x:cx+Math.sin(t)*(r-9),y:cy-Math.cos(t)*(r-9)+3.5,"text-anchor":"middle","font-size":9,fill:"var(--ink)","font-family":"IM Fell English, serif"},g); }
    const a=hh/12*2*Math.PI, m=d0.getMinutes()/60*2*Math.PI;
    L(g,cx,cy,cx+Math.sin(a)*r*.5,cy-Math.cos(a)*r*.5,3.4); L(g,cx,cy,cx+Math.sin(m)*r*.8,cy-Math.cos(m)*r*.8,1.6);
    E("circle",{cx,cy,r:2.5,fill:"var(--ink)"},g);
  }
  d.forEach(name => { if(!PRE.includes(name) && DECOR[name]) DECOR[name](g, R, room); });
  return g;
}

/* ---------- object icons ---------- */
const ICON = {
  rule:(g)=>{ E("rect",{x:-34,y:-8,width:68,height:16,rx:2,fill:"var(--paper)",stroke:"var(--ink)"},g); E("rect",{x:-34,y:-3,width:68,height:6,fill:"url(#h-mid)",opacity:1},g); for(let i=0;i<=12;i++) E("line",{x1:-30+i*5,y1:-8,x2:-30+i*5,y2:i%4?-4:-1,stroke:"var(--ink)"},g); E("rect",{x:-6,y:-11,width:10,height:22,fill:"none",stroke:"var(--ink)","stroke-width":1.5},g); },
  net:(g)=>{ E("circle",{r:22,fill:"var(--paper)",stroke:"var(--ink)"},g); for(let i=-2;i<=2;i++){ E("ellipse",{rx:Math.abs(i)*8+.1,ry:22,fill:"none",stroke:"var(--ink)",opacity:.6},g); E("path",{d:`M-22,${i*8} Q0,${i*8+ (i?i*3:0)} 22,${i*8}`,fill:"none",stroke:"var(--ink)",opacity:.5},g);} },
  planimeter:(g)=>{ E("circle",{cx:-24,cy:10,r:3,fill:"var(--ink)"},g); E("line",{x1:-24,y1:10,x2:2,y2:-14,stroke:"var(--ink)","stroke-width":2.5},g); E("line",{x1:2,y1:-14,x2:26,y2:8,stroke:"var(--ink)","stroke-width":2.5},g); E("circle",{cx:10,cy:-7,r:6,fill:"var(--paper)",stroke:"var(--ink)"},g); E("circle",{cx:26,cy:8,r:3,fill:"url(#s-dark)"},g); },
  cross:(g)=>{ for(let i=-3;i<=3;i++) E("line",{x1:i*10,y1:14,x2:i*3,y2:-16,stroke:"var(--ink)",opacity:.7},g); for(let j=0;j<4;j++){ const y=14-j*(9-j*1.6); E("line",{x1:-32+j*5,y1:y,x2:32-j*5,y2:y,stroke:"var(--ink)"},g);} },
  plant:(g)=>{ E("path",{d:"M-12,4 h24 l-4,16 h-16 Z",fill:"url(#s-dark)",opacity:.8},g); for(let i=-2;i<=2;i++) E("path",{d:`M0,4 Q${i*9},-10 ${i*14},${-14-Math.abs(i)*-3}`,fill:"none",stroke:"var(--ink)","stroke-width":3},g); },
  turns:(g)=>{ E("circle",{r:21,fill:"var(--paper)",stroke:"var(--ink)"},g); E("ellipse",{rx:21,ry:7,fill:"none",stroke:"var(--ink)",opacity:.5},g); E("path",{d:"M-15,-6 A18,18 0 0 1 12,-12",fill:"none",stroke:"var(--ink)","stroke-width":3},g); E("path",{d:"M12,-12 A18,18 0 0 1 14,10",fill:"none",stroke:"var(--ink)","stroke-width":3},g); },
  cards:(g)=>{ ["i","j","k"].forEach((s,i)=>{ const c=E("g",{transform:`rotate(${(i-1)*14}) translate(${(i-1)*8},0)`},g); E("rect",{x:-11,y:-17,width:22,height:32,rx:3,fill:"var(--paper)",stroke:"var(--ink)"},c); T(s,{x:0,y:4,"text-anchor":"middle","font-size":15,"font-style":"italic",fill:"url(#s-dark)","font-family":"IM Fell English, serif"},c); }); },
  lock:(g)=>{ E("path",{d:"M-11,-4 V-12 A11,11 0 0 1 11,-12 V-4",fill:"none",stroke:"var(--ink)","stroke-width":3.5},g); E("rect",{x:-17,y:-4,width:34,height:26,rx:4,fill:"url(#h-mid)",stroke:"var(--ink)"},g); E("circle",{cy:6,r:3.5,fill:"var(--ink)"},g); E("line",{x1:0,y1:8,x2:0,y2:15,stroke:"var(--ink)","stroke-width":2.5},g); },
  tiles:(g)=>{ for(let i=0;i<4;i++) for(let j=0;j<4;j++){ if(i===3&&j===3) continue; E("rect",{x:-20+j*10,y:-20+i*10,width:9,height:9,fill:(i+j)%2?"var(--paper)":"var(--brass)",stroke:"var(--ink)","stroke-width":.7},g);} },
  crystal:(g)=>{ for(let j=-2;j<=2;j++) for(let i=-3;i<=3;i++){ const x=i*8+(j&1)*4, y=j*7; if(x*x+y*y<480) E("circle",{cx:x,cy:y,r:2.6,fill:(i===1&&j===0)?"var(--accent)":"var(--ink)"},g);} },
  tree:(g)=>{ const br=(x,y,dx,n)=>{ if(!n) return; [-1,1].forEach(s=>{ E("line",{x1:x,y1:y,x2:x+s*dx,y2:y-10,stroke:"var(--ink)"},g); br(x+s*dx,y-10,dx/2,n-1); }); }; E("line",{x1:0,y1:18,x2:0,y2:10,stroke:"var(--ink)"},g); br(0,10,16,3); },
  book:(g)=>{ E("rect",{x:-14,y:-18,width:28,height:36,rx:2,fill:"url(#s-dark)",stroke:"var(--ink)"},g); E("line",{x1:-9,y1:-18,x2:-9,y2:18,stroke:"var(--ink)",opacity:.5},g); E("rect",{x:-4,y:-9,width:14,height:5,fill:"url(#h-mid)"},g); },
  books:(g)=>{ ["var(--ink)","url(#h-mid)","url(#x-light)","url(#s-dark)"].forEach((c,i)=>E("rect",{x:-22,y:10-i*8,width:44-i*4,height:8,rx:1,fill:c,stroke:"var(--ink)","stroke-width":.6},g)); },
  unwritten:(g)=>{ E("rect",{x:-14,y:-18,width:28,height:36,rx:2,fill:"var(--paper)",stroke:"var(--ink)","stroke-dasharray":"3 3"},g); T("?",{x:0,y:7,"text-anchor":"middle","font-size":20,fill:"var(--muted)","font-family":"IM Fell English, serif"},g); },
  scroll:(g)=>{ E("rect",{x:-18,y:-14,width:36,height:28,fill:"var(--paper)",stroke:"var(--ink)"},g); E("circle",{cx:-18,cy:0,r:4,fill:"url(#h-mid)"},g); E("circle",{cx:18,cy:0,r:4,fill:"url(#h-mid)"},g); for(let i=0;i<4;i++) E("line",{x1:-12,y1:-8+i*5,x2:12,y2:-8+i*5,stroke:"var(--muted)"},g); },
  lectern:(g)=>{ E("line",{x1:0,y1:-2,x2:0,y2:22,stroke:"var(--ink)","stroke-width":4},g); E("path",{d:"M-24,-4 L0,-12 L24,-4 L0,4 Z",fill:"var(--paper)",stroke:"var(--ink)"},g); E("line",{x1:0,y1:-12,x2:0,y2:4,stroke:"var(--ink)"},g); },
  clock:(g)=>{ E("circle",{r:20,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g); for(let i=0;i<12;i++){ const t=i/12*2*Math.PI; E("line",{x1:Math.sin(t)*15,y1:-Math.cos(t)*15,x2:Math.sin(t)*19,y2:-Math.cos(t)*19,stroke:"var(--ink)"},g);} E("line",{x1:0,y1:0,x2:0,y2:-12,stroke:"var(--ink)","stroke-width":2},g); E("line",{x1:0,y1:0,x2:9,y2:4,stroke:"var(--ink)","stroke-width":2},g); },
  key:(g)=>{ E("circle",{cx:-14,r:8,fill:"none",stroke:"var(--ink)","stroke-width":4},g); E("line",{x1:-6,y1:0,x2:22,y2:0,stroke:"var(--ink)","stroke-width":4},g); E("line",{x1:16,y1:0,x2:16,y2:8,stroke:"var(--ink)","stroke-width":4},g); E("line",{x1:10,y1:0,x2:10,y2:6,stroke:"var(--ink)","stroke-width":4},g); },
  pond:(g)=>{ E("ellipse",{rx:26,ry:12,fill:"url(#hz-fine)",stroke:"var(--ink)"},g); [[-12,0],[0,-4],[11,1],[-2,5]].forEach(p=>E("circle",{cx:p[0],cy:p[1],r:5.5,fill:"var(--paper)",stroke:"var(--ink)"},g)); },
  fraction:(g)=>{ E("rect",{x:-15,y:-20,width:30,height:40,rx:4,fill:"var(--paper)",stroke:"var(--ink)"},g); T("3",{x:0,y:-4,"text-anchor":"middle","font-size":14,fill:"var(--ink)","font-family":"IM Fell English, serif"},g); E("line",{x1:-7,y1:0,x2:7,y2:0,stroke:"var(--ink)"},g); T("4",{x:0,y:14,"text-anchor":"middle","font-size":14,fill:"var(--ink)","font-family":"IM Fell English, serif"},g); },
  note:(g)=>{ E("path",{d:"M-14,-18 h22 l6,6 v30 h-28 Z",fill:"var(--paper)",stroke:"var(--ink)"},g); for(let i=0;i<4;i++) E("line",{x1:-9,y1:-8+i*6,x2:9,y2:-8+i*6,stroke:"var(--muted)"},g); },
  map:(g)=>{ E("path",{d:"M-24,-14 l16,-4 l16,4 l16,-4 v28 l-16,4 l-16,-4 l-16,4 Z",fill:"var(--paper)",stroke:"var(--ink)"},g); E("path",{d:"M-18,6 q8,-14 16,-4 t16,-6",fill:"none",stroke:"var(--ink)","stroke-dasharray":"2 2"},g); },
  pendulum:(g)=>{ E("line",{x1:0,y1:-22,x2:6,y2:12,stroke:"var(--ink)"},g); E("circle",{cx:6,cy:14,r:6,fill:"url(#h-mid)",stroke:"var(--ink)"},g); },
  hex:(g)=>{ E("polygon",{points:[0,1,2,3,4,5].map(i=>`${20*Math.cos(i*Math.PI/3)},${20*Math.sin(i*Math.PI/3)}`).join(" "),fill:"var(--paper)",stroke:"var(--ink)"},g); },
  door:(g)=>{ E("path",{d:"M-12,20 V-8 A12,12 0 0 1 12,-8 V20 Z",fill:"var(--ink)",stroke:"var(--ink)"},g); },
  astrolabe:(g)=>{ E("circle",{r:19,fill:"url(#h-light)",stroke:"var(--ink)","stroke-width":2},g); E("circle",{r:13,fill:"none",stroke:"var(--ink)"},g); E("path",{d:"M-13,0 A13,13 0 0 0 13,0 M0,-13 V13",fill:"none",stroke:"var(--ink)",opacity:.6},g); E("path",{d:"M-6,-22 h12 v4 h-12 Z",fill:"var(--spot)",stroke:"var(--ink)"},g); E("line",{x1:-16,y1:6,x2:16,y2:-6,stroke:"var(--ink)","stroke-width":2},g); },
  hourglass:(g)=>{ E("rect",{x:-16,y:-24,width:32,height:5,fill:"var(--ink)"},g); E("rect",{x:-16,y:19,width:32,height:5,fill:"var(--ink)"},g); E("path",{d:"M-12,-19 C-12,-4 -2,-4 -2,0 C-2,4 -12,4 -12,19 H12 C12,4 2,4 2,0 C2,-4 12,-4 12,-19 Z",fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1.6},g); E("path",{d:"M-8,17 Q0,6 8,17 Z",fill:"url(#s-dark)"},g); E("path",{d:"M-6,-12 h12 l-6,9 Z",fill:"url(#s-dark)"},g); },
  compass:(g)=>{ E("circle",{r:20,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g); for(let k=0;k<8;k++){ const t=k*Math.PI/4; E("line",{x1:Math.sin(t)*15,y1:-Math.cos(t)*15,x2:Math.sin(t)*19,y2:-Math.cos(t)*19,stroke:"var(--ink)"},g); } E("path",{d:"M0,-15 L4,0 L0,15 L-4,0 Z",fill:"var(--paper)",stroke:"var(--ink)"},g); E("path",{d:"M0,-15 L4,0 L-4,0 Z",fill:"var(--spot)"},g); },
  lamp:(g)=>{ E("path",{d:"M-10,-20 h20 M0,-20 v-4",stroke:"var(--ink)","stroke-width":2},g); E("path",{d:"M-12,-18 h24 l-3,30 h-18 Z",fill:"url(#hz)",stroke:"var(--ink)","stroke-width":1.6},g); E("ellipse",{cx:0,cy:-2,rx:5,ry:8,fill:"var(--spot)"},g); E("rect",{x:-14,y:12,width:28,height:6,fill:"var(--ink)"},g); },
  carriage:(g)=>{ E("rect",{x:-15,y:-14,width:30,height:34,rx:2,fill:"url(#h-light)",stroke:"var(--ink)","stroke-width":1.6},g); E("path",{d:"M-8,-14 Q0,-26 8,-14",fill:"none",stroke:"var(--ink)","stroke-width":2.4},g); E("circle",{cy:2,r:10,fill:"var(--paper)",stroke:"var(--ink)"},g); E("line",{x1:0,y1:2,x2:0,y2:-5,stroke:"var(--ink)","stroke-width":1.6},g); E("line",{x1:0,y1:2,x2:5,y2:4,stroke:"var(--ink)","stroke-width":1.6},g); },
  orrery:(g)=>{ E("circle",{r:5,fill:"var(--spot)",stroke:"var(--ink)"},g); [10,16,22].forEach((r,k)=>{ E("circle",{r,fill:"none",stroke:"var(--ink)",opacity:.6},g); E("circle",{cx:Math.cos(k*2.1)*r,cy:Math.sin(k*2.1)*r,r:2.6,fill:"var(--ink)"},g); }); },
  bell:(g)=>{ E("rect",{x:-18,y:10,width:36,height:6,rx:2,fill:"var(--ink)"},g); E("path",{d:"M-14,10 A14,14 0 0 1 14,10 Z",fill:"url(#h-mid)",stroke:"var(--ink)","stroke-width":1.6},g); E("line",{x1:0,y1:-4,x2:0,y2:-12,stroke:"var(--ink)","stroke-width":2},g); E("circle",{cy:-13,r:3,fill:"var(--spot)",stroke:"var(--ink)"},g); },
  box:(g)=>{ E("rect",{x:-16,y:-14,width:32,height:28,fill:"var(--paper)",stroke:"var(--ink)"},g); }
};
const KIND_ICON = {device:"box", book:"book", paper:"scroll", ref:"book", unwritten:"unwritten", key:"key", note:"note", link:"book", page:"note"};

function hot(el, label, fn){
  el.setAttribute("class","hot"); el.setAttribute("tabindex","0"); el.setAttribute("role","button"); el.setAttribute("aria-label",label);
  el.addEventListener("click", fn);
  el.addEventListener("keydown", e => { if(e.key==="Enter"||e.key===" "){ e.preventDefault(); fn(); } });
  const t = E("title",{},el); t.textContent = label;
}

/* ---------- rendering ---------- */
let cur = null, LIGHT = {};
function effective(base){
  const r = Object.assign({}, base);
  (base.phases||[]).forEach(ph => { if(!cond(ph.when, base)) return;
    if(ph.name) r.name = ph.name;
    if(ph.text) r.text = ph.replace ? ph.text : (r.text||"") + "\n" + ph.text;
    ["decor","doors","objects","notes"].forEach(k => { if(ph[k]) r[k] = (r[k]||[]).concat(ph[k]); });
    if(ph.drop) r.decor = (r.decor||[]).filter(x => !ph.drop.includes(x));
    if(ph.widget) r.widget = ph.widget; });
  return r;
}
const FACES = ["n","e","s","w"], FACENAME = ["north","east","south","west"];
const WALL_DECOR = ["window","clockface","chalkboard","screen","woodcut","fibrect","dial","sea","thermo"];
const POSNAME = ["on your left","ahead","on your right","behind you"];
const pos = w => (act(S.frame, w) - S.face + 4) % 4;
function objWall(o, i, n){ if(o.wall!=null) return WALLS[o.wall]; return n>3 ? [1,2,0,3][i%4] : 1; }
const BOOKISH = o => ["book","ref","unwritten","paper","notes","talk"].includes(o.kind);
function render(){
  const room = effective(cur), id = String(room.id); LIGHT = {};
  const light = lightNow(); soundScene(room);
  document.documentElement.setAttribute("data-light", light);
  document.documentElement.setAttribute("data-ink", S.ink==="1bit" ? "1bit" : "two");
  if(S.ink==="1bit") document.documentElement.style.removeProperty("--spot"); else document.documentElement.style.setProperty("--spot", wingColor(room));
  $("b-ink").textContent = S.ink==="1bit" ? "Ink: 1-bit" : "Ink: two-color";
  $("b-gfx").textContent = S.gfx==="2d" ? "View: woodcut" : S.gfx==="photo" ? "View: photographic" : "View: engraved";
  $("b-q").textContent = "Quality: " + defaultQuality(); $("b-q").style.display = VIEW3D && S.gfx!=="2d" ? "" : "none"; $("b-full").style.display = VIEW3D && S.gfx!=="2d" ? "" : "none";
  const mirror = S.frame[1]===1;
  $("rnum").textContent = room.label || id;
  $("rname").innerHTML = mirror ? `<span class="mirror-text" title="${esc(room.name||"")}">${esc(room.name||"")}</span>` : esc(room.name||"");
  $("rwing").textContent = ((WINGS[room.wing] && WINGS[room.wing].name) || "") + " · facing " + FACENAME[S.face] + (S.close ? " · looking closer" : "");
  document.title = `${room.label||id} · ${room.name||"The Wending House"}`;
  tally(light);
  // the view
  const stage = $("stage");
  stage.querySelectorAll("svg.view").forEach(o => { o.classList.add("fading"); setTimeout(() => o.remove(), 320); });
  const use3d = VIEW3D && S.gfx!=="2d";
  stage.classList.toggle("is3d", !!use3d);
  const svg = use3d ? document.createElementNS(NS,"svg") : E("svg",{viewBox:`0 0 ${W} ${H}`, role:"img", class:"view", "aria-label":`Room ${id}, ${room.name||""}, facing ${FACENAME[S.face]}`}, stage);
  const allDoors = (room.doors||[]).filter(d => visible(d, room));
  const doorWall = (d,i) => d.wall!=null ? WALLS[d.wall] : [1,0,2][i%3];
  const objs = (room.objects||[]).filter(o => visible(o, room) && !((o.kind==="key" || o.portable) && S.inv.includes(o.item)));
  const byObjWall = [[],[],[],[]]; objs.forEach((o,i) => byObjWall[act(S.frame, objWall(o,i,objs.length))].push(o));
  const ahead = [0,1,2,3].find(w => (w - S.face + 4) % 4 === 1);
  if(use3d){ VIEW3D.show(plan3d(room, allDoors, doorWall, objs, light, mirror)); VIEW3D.snap = false; }
  else if(S.close==="ahead"){ drawClose(room, svg, byObjWall[ahead] || [], mirror); }
  else {
    drawRoom(room, svg, light);
    decor(room, svg, light, mirror);
    const byPos = [[],[],[],[]];
    allDoors.forEach((d,i) => byPos[pos(doorWall(d,i))].push(d));
    [0,1,2].forEach(p => byPos[p].forEach((d,i) => drawDoor(svg, room, d, p, i, byPos[p].length, mirror)));
    // furniture and things on the wall ahead; cabinets on the side walls hint at more
    const aheadObjs = byObjWall[ahead] || [];
    if(aheadObjs.length) drawStation(svg, room, aheadObjs, mirror);
    [0,2].forEach(p => { const w = [0,1,2,3].find(w2 => (w2 - S.face + 4) % 4 === p); const n = (byObjWall[w]||[]).length; if(n) drawSideCabinet(svg, p, n, () => turn(p===0?-1:1)); });
    const behind = byPos[3].length + ((byObjWall[[0,1,2,3].find(w2 => (w2 - S.face + 4) % 4 === 3)]||[]).length);
    turnZones(svg, behind);
  }
  // text
  const visits = S.visits[id]||0;
  let html = fillTokens((room.text||"")).split(/\n+/).filter(Boolean).map(p=>`<p>${p}</p>`).join("");
  if(visits>1 && room.again) html += `<p class="again">${fillTokens(room.again)}</p>`;
  if(mirror && room.mirror) html += `<p class="again">${room.mirror}</p>`;
  (room.notes||[]).forEach(n => { if(visible(n, room)) html += `<p class="again">${fillTokens(n.text)}</p>`; });
  $("rtext").innerHTML = html;
  // doors, for keyboards and screen readers
  const dl = $("doors"); dl.innerHTML = "";
  if(!allDoors.length) dl.innerHTML = `<li class="note">No doors you can see. Try the map.</li>`;
  allDoors.forEach((d,i) => {
    const p = pos(doorWall(d,i)), li = document.createElement("li"), b = document.createElement("button");
    b.type="button"; b.className="doorbtn";
    const lab = doorLabel(d, room), isOpen = open(d, room), nm = doorName(d);
    b.innerHTML = `${isOpen?"":"🔒 "}${esc(lab)}${nm?" · "+esc(nm):""} <span class="note">${POSNAME[p]}${d.title? " · "+esc(d.title):""}</span>`;
    b.onclick = () => tryDoor(d, room);
    li.appendChild(b);
    if(!isOpen && d.hint) { const h=document.createElement("div"); h.className="note"; h.textContent=d.hint; li.appendChild(h); }
    dl.appendChild(li);
  });
  const ol = $("objects"); ol.innerHTML = "";
  if(!objs.length) ol.innerHTML = `<li class="note">Nothing here, or nothing yet.</li>`;
  objs.forEach((o,i) => {
    const li = document.createElement("li"), kind = o.kind || "device", w = act(S.frame, objWall(o,i,objs.length)), p = (w - S.face + 4) % 4;
    li.innerHTML = `<span class="k">${esc(kind)}</span><a href="#" data-obj="1">${esc(o.title)}</a>${o.by? ` <span class="note">· ${esc(o.by)}</span>`:""} <span class="note">(${POSNAME[p]})</span>`;
    li.querySelector("[data-obj]").onclick = e => { e.preventDefault(); useObject(o, room); };
    ol.appendChild(li);
  });
  annotations(room);
  bag(); corners(room);
  const wd = $("widget"); wd.innerHTML = ""; stopTimers();
  if(room.widget){ const spec = typeof room.widget==="string" ? {type:room.widget} : room.widget; (WIDGETS[spec.type]||(()=>{}))(wd, spec, room); }
}
/* ---------- the engraved, three-dimensional view ---------- */
let VIEW3D = null, skyCache = {key:null, canvas:null, waiting:[]};
function plan3d(room, allDoors, doorWall, objs, light, mirror){
  const sk = skyNow(), F = facing(), rel = a => ((a - F + 540) % 360) - 180, wx = weather(), wk = wx ? wxKind(wx.weather_code) : "clear";
  const sunRel = rel(sk.sun.az), moonRel = rel(sk.moon.az), overcast = !!(wx && wx.cloud_cover > 85);
  const inWin = (alt, r) => Math.abs(r) < 70 && alt > -2 ? [Math.max(-1,Math.min(1,r/60)), Math.max(0,Math.min(1,alt/50))] : null;
  const names = room.widget && room.widget.names;
  return {
    room, frame:S.frame, mirror, band:light, spot:wingColor(room), F, lat:LAT,
    ahead:(1+S.face)%4, close: S.close==="ahead" ? "ahead" : null, pitch: S.close==="up" ? 1 : S.close==="down" ? -1 : 0,
    decor: room.decor || [], names,
    doors: allDoors.map((d,i) => ({id:i+":"+(d.to||""), wall:act(S.frame, doorWall(d,i)), label:doorLabel(d, room), name:doorName(d), title:d.title||"", open:open(d, room), look: reno(d) ? "boarded" : (d.look||""), onClick:()=>tryDoor(d, room)})),
    objects: objs.map((o,i) => ({raw:o, mount:o.mount||null, board: o.mount ? boardContent(o) : null, title:o.title, by:o.by||"", kind:o.kind||"device", href:o.href, action:o.action, icon:o.icon || KIND_ICON[o.kind] || "box", bookish:BOOKISH(o), wall:act(S.frame, objWall(o,i,objs.length))})),
    lampLit: light==="night" || light==="dusk" || S.light==="night" || !!room.dark,
    sunUp: sk.sun.alt > 0 && !overcast && !skyOff("sun"), sunAlt: sk.sun.alt, sunRel, overcast,
    sunInWindow: sk.sun.alt > -2 && !overcast && !skyOff("sun") ? inWin(sk.sun.alt, sunRel) : null, moonInWindow: sk.moon.alt > 0 && !skyOff("moon") ? inWin(sk.moon.alt, moonRel) : null,
    sunOff: skyOff("sun"), moonOff: skyOff("moon"),
    wxKind: wk, wxLabel: wx ? `Outside: ${Math.round(wx.temperature_2m)}°F, ${({clear:"clear",cloud:"clouds",fog:"fog",rain:"rain",snow:"snow",storm:"a storm"})[wk]}, wind ${Math.round(wx.wind_speed_10m)} mph.` : "",
    temp: wx ? wx.temperature_2m : null,
    lantern: !!(S.lantern && S.inv.includes("lantern")), gloom: (room.decor||[]).includes("gloom"),
    sheetKey: JSON.stringify(S.sheets) + ":" + (CATALOG ? CATALOG.length : -1) + ":" + (S.dial||""), minuteKey: Math.floor(now().getTime()/60000),
    snap: !VIEW3D.snapped || VIEW3D.lastRoom !== String(room.id) ? (VIEW3D.snapped = true, VIEW3D.lastRoom = String(room.id), true) : false,
    skyCanvas: (room.decor||[]).includes("sky") ? skyCanvasFor : null,
    // the moon: where it is, how much of it is lit, and how much the clouds let through
    moonAlt: sk.moon.alt, moonRel, moonLit: (1 - Math.cos(2*Math.PI*sk.moon.phase))/2, cloud: wx ? (wx.cloud_cover||0) : 0,
    dome: room.ceiling==="open" ? domeData(sk) : null, place: placeName(),
    orrery: (room.decor||[]).includes("orrery") ? orreryData(sk.jd) : null,
    dialType: (room.decor||[]).includes("sundial") ? dialType() : null, dialData: (room.decor||[]).includes("sundial") ? dialData(dialType()) : null, dials: DIALS,
    catalog: (room.decor||[]).includes("catalogshelves") ? (CATALOG||[]).filter(it => ["book","paper","physical","digital","ephemera","art"].includes(it.type)).map(it => ({id:it.id, title:it.title, creator:((it.creators||[])[0]||{}).name||"", type:it.type, pages:it.pages})) : null,
  };
}
/* ---------- the planets, tracked ---------- */
const PLANET_LOOK = {mer:{color:"#a59c8e", size:.045}, ven:{color:"#e8dcb8", size:.07}, ter:{color:"#5f7f99", size:.07}, mar:{color:"#b5603c", size:.055}, jup:{color:"#c9a983", size:.13}, sat:{color:"#d8c690", size:.11, rings:true}, ura:{color:"#9cc3c9", size:.085}, nep:{color:"#5f7fb5", size:.085}};
// the zodiac as the IAU draws it, by ecliptic longitude (J2000); planets stay close to the ecliptic, so this names the constellation they're in
const ZODIAC = [[28.7,"Pisces"],[53.5,"Aries"],[90.1,"Taurus"],[118.0,"Gemini"],[138.0,"Cancer"],[174.2,"Leo"],[218.0,"Virgo"],[241.0,"Libra"],[248.0,"Scorpius"],[266.3,"Ophiuchus"],[299.7,"Sagittarius"],[327.9,"Capricornus"],[351.6,"Aquarius"],[360,"Pisces"]];
const zodiacOf = lam => (ZODIAC.find(z => lam < z[0]) || ZODIAC[0])[1];
function planetMag(id, r, D, i){ const L = 5*Math.log10(r*D);
  return ({mer: -0.613 + 6.328e-2*i - 1.6336e-3*i*i + 3.3644e-5*i**3 - 3.4265e-7*i**4 + 1.6893e-9*i**5 - 3.0334e-12*i**6,
    ven: i < 163.7 ? -4.384 - 1.044e-3*i + 3.687e-4*i*i - 2.814e-6*i**3 + 8.938e-9*i**4 : 236.05828 - 2.81914*i + 8.39034e-3*i*i,
    mar: -1.601 + 2.267e-2*i - 1.302e-4*i*i, jup: -9.395 + 3.7e-4*i + 6.16e-4*i*i, sat: -8.95 + 4.4e-2*i, ura: -7.110 + 6.587e-3*i + 1.045e-4*i*i, nep: -7.00})[id] + L; }
function orreryData(jd){
  const T = (jd-2451545)/36525, out = [];
  ["mer","ven","ter","mar","jup","sat","ura","nep"].forEach(k => { const P0 = planetEl(k); if(!P0) return; const h = helio(P0.el, T), lon = ((Math.atan2(h[1],h[0])/DEG)%360+360)%360, r = Math.hypot(...h);
    out.push(Object.assign({id:k, name:P0.name, sym:P0.sym, a:P0.el.a, lon, note:`${r.toFixed(2)} AU from the sun, heliocentric longitude ${lon.toFixed(0)}°`}, PLANET_LOOK[k])); });
  return out; }
function planetReport(){
  const d = now(), sk = skyNow(), jd = sk.jd, full = planetsEq(jd, true);
  const ter = planetEl("ter"), te = helio(ter.el, (jd-2451545)/36525), sunLam = ((Math.atan2(-te[1], -te[0])/DEG)%360+360)%360;
  // a day of altitudes, every ten minutes, for rising, transit, and setting
  const d0 = new Date(d.toDateString()).getTime(), steps = [];
  for(let m=0; m<=1440; m+=10){ const t = d0 + m*60e3, j = t/864e5 + 2440587.5, L = lst(j); steps.push({t, alts: planetsEq(j).map(pl => altaz(pl.ra, pl.dec, L)[0])}); }
  return full.map((pl, k) => { const now0 = sk.planets.find(q => q.id===pl.id) || {};
    let rise=null, set=null, top=null, topAlt=-99; const H0 = -.5667;
    for(let i=1;i<steps.length;i++){ const a0 = steps[i-1].alts[k], a1 = steps[i].alts[k], tt = steps[i-1].t + (steps[i].t-steps[i-1].t)*(H0-a0)/(a1-a0);
      if(a0 < H0 && a1 >= H0 && rise==null) rise = tt; if(a0 >= H0 && a1 < H0 && set==null) set = tt; if(a1 > topAlt){ topAlt = a1; top = steps[i].t; } }
    const east = ((pl.lam - sunLam + 360) % 360) < 180, lit = (1 + Math.cos(pl.phase*DEG))/2;
    return Object.assign(pl, {alt: now0.alt, az: now0.az, rise, set, top, topAlt, east, lit, mag: planetMag(pl.id, pl.r, pl.delta, pl.phase), zodiac: zodiacOf(pl.lam), lightMin: pl.delta*8.3167}); });
}
function planetsView(){
  const rep = planetReport(), tf = t => t ? new Date(t).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}) : "—";
  const compass = az => ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.round(az/22.5)%16];
  const sk = skyNow(), dark = sk.sun.alt < -6;
  const verdict = pl => { const faint = pl.mag > 6 ? "; too faint for the eye, so binoculars or a telescope" : "";
    if(pl.elong < 12) return "lost in the sun's glare";
    if(pl.elong > 150) return "near opposition: up all night" + faint;
    if(pl.elong > 90) return (pl.east ? "high in the evening, setting after midnight" : "rising in the evening, best before dawn") + faint;
    return (pl.east ? "an evening object, in the west after sunset" : "a morning object, in the east before sunrise") + faint; };
  const rows = rep.map(pl => `<tr><td><b>${pl.sym} ${esc(pl.name)}</b><br><span class="note">${verdict(pl)}</span></td>
    <td class="mono">${pl.alt > 0 ? `${pl.alt.toFixed(1)}° up in the ${compass(pl.az)}` : `below the horizon`}<br><span class="note">az ${pl.az.toFixed(1)}°</span></td>
    <td>${pl.zodiac}<br><span class="note mono">RA ${(pl.ra/15).toFixed(2)}h · Dec ${pl.dec>=0?"+":""}${pl.dec.toFixed(1)}°</span></td>
    <td class="mono">${pl.mag.toFixed(1)}</td>
    <td class="mono">rises ${tf(pl.rise)}<br>highest ${tf(pl.top)} (${pl.topAlt.toFixed(0)}°)<br>sets ${tf(pl.set)}</td>
    <td class="mono">${pl.elong.toFixed(0)}° ${pl.east?"E":"W"} of the sun<br>${Math.round(pl.lit*100)}% lit</td>
    <td class="mono">${pl.delta.toFixed(2)} AU<br><span class="note">light ${pl.lightMin < 120 ? pl.lightMin.toFixed(1)+" min" : (pl.lightMin/60).toFixed(1)+" h"}</span></td></tr>`).join("");
  // a small orrery, seen from the north ecliptic pole
  const O = orreryData(sk.jd), rOf = a => 18 + 34*Math.log(1 + 2*a);
  const orr = `<svg viewBox="-190 -190 380 380" style="width:100%;max-width:360px;display:block;margin:0 auto" role="img" aria-label="The planets around the sun today">
    <circle r="7" fill="var(--spot)" stroke="var(--ink)"/>${O.map(pl => { const r = rOf(pl.a), x = Math.cos(pl.lon*DEG)*r, y = -Math.sin(pl.lon*DEG)*r;
      return `<circle r="${r.toFixed(1)}" fill="none" stroke="var(--line, #888)" stroke-width=".7" opacity=".6"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${pl.id==="ter"?5:4}" fill="${pl.color}" stroke="var(--ink)"/><text x="${(x+7).toFixed(1)}" y="${(y-6).toFixed(1)}" font-size="11" fill="var(--ink)" font-family="IM Fell English, serif">${pl.sym}</text>`; }).join("")}
    <text x="182" y="4" font-size="11" text-anchor="end" fill="var(--muted)" font-family="IM Fell English, serif">♈︎ →</text></svg>`;
  overlay("The planets", `<div class="text"><p>Where each planet is for ${esc(placeName())} at ${sk.d.toLocaleString([], {weekday:"short", month:"short", day:"numeric", hour:"numeric", minute:"2-digit"})}${S.clock?" (house time)":""}. Positions are worked out here from orbital elements, with light time, precession, and refraction; they agree with a professional ephemeris to a few hundredths of a degree. ${dark ? "" : "The sun is up, so most of them are hidden in daylight."}</p></div>
    <div style="overflow-x:auto"><table class="ptab"><thead><tr><th>planet</th><th>now</th><th>in</th><th>mag</th><th>today</th><th>from the sun</th><th>from us</th></tr></thead><tbody>${rows}</tbody></table></div>
    <h3>The orrery, today</h3>${orr}<p class="note">Seen from above the earth's north pole; distances squeezed so Neptune fits. Magnitudes are approximate (Saturn's rings are ignored). In the Sundial Court each planet's path among the stars shows as a dotted track, forty days either side of now.</p>`);
}
/* the open sky over a courtyard, as directions (alt, az) for the 3D view to place */
function domeData(sk){
  const key = Math.floor(sk.d.getTime()/60000) + ":" + locKey();
  if(domeData.key === key) return domeData.v;
  const SK = window.SKY || {stars:[], lines:[], names:[], cons:[]}, up = (ra,dec) => altaz(...prec(ra,dec,sk.jd),sk.L);
  const stars = []; SK.stars.forEach(([ra,dec,m]) => { if(m > 4.7) return; const a = up(ra,dec); if(a[0] > -2) stars.push([a[0], a[1], m]); });
  const lines = []; (SK.lines||[]).forEach(ln => { let prev = null; ln.forEach(([ra,dec]) => { const a = up(ra,dec); if(prev && prev[0] > -2 && a[0] > -2) lines.push([prev, a]); prev = a; }); });
  const names = (SK.names||[]).filter(n => n[3] <= 1.5).map(([ra,dec,n]) => up(ra,dec).concat([n])).filter(a => a[0] > 6);
  const cons = (SK.cons||[]).filter(c => c[3] <= 1).map(([ra,dec,n]) => up(ra,dec).concat([n])).filter(a => a[0] > 12);
  // each planet's path among the stars, forty days either side of now, every four days
  const tracks = PLANET_KEYS.map(k => ({id:k, pts:[]}));
  for(let dd=-40; dd<=40; dd+=4){ if(!dd) continue; planetsEq(sk.jd + dd).forEach(pl => { const tr = tracks.find(t => t.id===pl.id); if(!tr) return; const a = altaz(pl.ra, pl.dec, sk.L); if(a[0] > -2) tr.pts.push([a[0], a[1], dd]); }); }
  domeData.key = key;
  domeData.v = {tracks: tracks.filter(t => t.pts.length),sun: {alt: sk.sun.alt, az: sk.sun.az}, moon: {alt: sk.moon.alt, az: sk.moon.az, phase: sk.moon.phase},
    planets: sk.planets.filter(p => p.alt > -2).map(p => ({name: p.name, alt: p.alt, az: p.az})), stars, lines, names, cons, seed: Math.floor(sk.d.getTime()/36e5)};
  return domeData.v;
}
function skyCanvasFor(cb){
  // draw the sky chart as a picture, then hand it to the 3D view as a texture
  const key = Math.floor(now().getTime()/300000) + ":" + S.frame.join(",") + ":" + locKey();
  if(skyCache.key === key && skyCache.canvas) return cb(skyCache.canvas);
  skyCache.waiting.push(cb); if(skyCache.busy) return; skyCache.busy = true;
  const svg = document.createElementNS(NS,"svg"); svg.setAttribute("xmlns", NS); svg.setAttribute("viewBox","0 0 1024 1024"); svg.setAttribute("width","1024"); svg.setAttribute("height","1024");
  const style = getComputedStyle(document.documentElement);
  defs(svg); const g = E("g",{},svg); E("rect",{x:0,y:0,width:1024,height:1024,fill:"#1d1a16"},g);
  drawSky(g, 512, 512, 470, {big:true, names:true, cons:true, tag:"tex"});
  let src = new XMLSerializer().serializeToString(svg);
  ["--paper","--paper2","--ink","--spot","--muted","--line","--void"].forEach(v => { src = src.split(`var(${v})`).join(style.getPropertyValue(v).trim() || "#888"); });
  const img = new Image(), cv = document.createElement("canvas"); cv.width = cv.height = 1024;
  img.onload = () => { cv.getContext("2d").drawImage(img,0,0); skyCache = {key, canvas:cv, waiting:[], busy:false}; const w = skyCache.waiting; (w.length?w:[]).forEach(f=>f(cv)); };
  const waiting = skyCache.waiting;
  img.onload = () => { cv.getContext("2d").drawImage(img,0,0); skyCache.key = key; skyCache.canvas = cv; skyCache.busy = false; waiting.splice(0).forEach(f => f(cv)); };
  img.onerror = () => { skyCache.busy = false; };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src);
}
// fine by default on a desktop-sized window, normal on small screens; the menu cycles draft, normal, fine, ultra
function defaultQuality(){ return S.quality || (Math.min(screen.width, screen.height) >= 700 ? "fine" : "normal"); }
function fullView(){ const st = $("stage"); if(document.fullscreenElement){ document.exitFullscreen(); return; } if(st.requestFullscreen) st.requestFullscreen().catch(() => toast("This browser won't go full screen here.")); }
function start3d(){
  if(S.gfx==="2d") return;
  try { const t = document.createElement("canvas"); if(!t.getContext("webgl2")) return; } catch(e){ return; }
  import("./palace3d.js").then(m => {
    VIEW3D = m.create($("stage"), {
      turn, toast, now, quality: defaultQuality, style: () => S.gfx === "photo" ? "photo" : "engraved",
      look: p => setView(S.face, p>0 ? "up" : p<0 ? "down" : null),
      closer: slot => { const f = (slot + 3) % 4; if(f===S.face) setView(S.face, "ahead"); else setView(f, null); },
      stepBack: () => setView(S.face, null),
      useObject: o => useObject(o.raw, effective(cur)),
      palaceSeconds: () => now().getTime()/1000,
      planets: () => planetsView(),
      setDial: t => setDial(t),
      openItem: id => catalogView("item/" + id),
      openCatalog: h => catalogView(h || ""),
      dial: () => { const w = $("widget"); if(w && w.firstChild){ w.scrollIntoView({behavior:"smooth", block:"center"}); w.classList.add("flash"); setTimeout(() => w.classList.remove("flash"), 1400); } },
      pendulumPlane: () => { const rate = 360*Math.sin(LAT*DEG)/23.9345; return -((now().getTime()/36e5*rate) % 180)*DEG; },
    });
    if(cur) render();
  }).catch(e => { console.warn("3D view unavailable", e); });
}
function fillTokens(t){ return String(t).replace(/\{sheet:(\w+)\}/g, (_,k) => String(S.sheets[k]||0)).replace(/\{reader\}/g, esc(S.reader||"reader")); }
function doorName(d){ if(Array.isArray(d.to) || d.to==="random" || d.to==="back") return ""; const r = ROOMS[String(d.to)]; if(!r) return ""; if(r.secret && !S.visits[r.id]) return ""; const nm = (r.name||"").replace(/^The /,""); return r.closed === "renovation" ? nm + " · closed for renovation" : r.hours ? nm + " · " + (officeStatus().open ? "open" : "closed") : nm; }
function turnZones(svg, behind){
  const zl = E("rect",{x:0,y:0,width:62,height:H,fill:"transparent",class:"turnL"},svg);
  const zr = E("rect",{x:W-62,y:0,width:62,height:H,fill:"transparent",class:"turnR"},svg);
  hot(zl, "Turn left", () => turn(-1)); hot(zr, "Turn right", () => turn(1));
  zl.setAttribute("class","hot turnL"); zr.setAttribute("class","hot turnR");
  if(behind){ const g=E("g",{},svg); E("rect",{x:W/2-70,y:H-24,width:140,height:20,fill:"var(--paper2)",stroke:"var(--ink)","stroke-width":1.2,rx:3},g);
    T(`↶ ${behind} thing${behind>1?"s":""} behind you`,{x:W/2,y:H-10,"text-anchor":"middle","font-size":11.5,fill:"var(--ink)","font-family":"IM Fell English, serif"},g);
    hot(g, "Turn around", () => turn(2)); g.setAttribute("class","hot turnB"); }
}
function drawSideCabinet(svg, p, n, fn){
  const f = p===0 ? leftPt : rightPt, g = E("g",{},svg);
  const a=f(.62,0), b=f(.62,.24), c=f(.86,.24), d=f(.86,0);
  E("polygon",{points:[a,b,c,d].map(q=>q.join(",")).join(" "),fill:"url(#h-light)",stroke:"var(--ink)","stroke-width":1.6,class:"hl"},g);
  const m=f(.74,.12); E("circle",{cx:m[0],cy:m[1],r:9,fill:"var(--spot)",stroke:"var(--ink)"},g);
  T(String(n),{x:m[0],y:m[1]+4,"text-anchor":"middle","font-size":11,fill:"var(--paper2)","font-family":"IM Fell English SC, serif"},g);
  hot(g, `${n} thing${n>1?"s":""} ${p===0?"to your left":"to your right"}: turn to look`, fn);
}
function drawStation(svg, room, objs, mirror){
  const n = Math.min(objs.length, 5), shown = objs.length>5 ? objs.slice(0,4).concat([{title:`${objs.length-4} more`, short:`+${objs.length-4} more`, icon:"books", more:true}]) : objs;
  const span = Math.min(150, 520/Math.max(n,1)), x0 = 400-(n-1)*span/2, x1 = 400+(n-1)*span/2;
  const g = E("g",{},svg), book = objs.filter(BOOKISH).length > objs.length/2;
  // a desk, or a low bookcase for bookish things
  const L0=x0-58, R0=x1+58, top=352, front=368;
  E("polygon",{points:`${L0},${front+40} ${R0},${front+40} ${R0+14},${front+52} ${L0-14},${front+52}`,fill:"url(#h-dark)",opacity:.9},g);
  E("polygon",{points:`${L0+22},${top} ${R0-22},${top} ${R0},${front} ${L0},${front}`,fill:book?"url(#h-light)":"var(--paper)",stroke:"var(--ink)","stroke-width":2,class:"hl"},g);
  E("rect",{x:L0,y:front,width:R0-L0,height:12,fill:"url(#h-mid)",stroke:"var(--ink)","stroke-width":1.6},g);
  if(book){ E("rect",{x:L0,y:front+12,width:R0-L0,height:30,fill:"url(#x-dark)",stroke:"var(--ink)","stroke-width":1.6},g);
    for(let x=L0+6;x<R0-6;x+=7+((x*13)%5)) L(g,x,front+15,x,front+40,3,{stroke:"var(--paper)"}); }
  else { [L0+8,R0-8].forEach(x=>L(g,x,front+12,x,front+48,4)); for(let k=0;k<3;k++){ const dx=L0+(R0-L0)*(k+.5)/3; E("rect",{x:dx-24,y:front+2,width:48,height:8,fill:"var(--paper)",stroke:"var(--ink)"},g); E("circle",{cx:dx,cy:front+6,r:1.6,fill:"var(--ink)"},g);} }
  hot(g, "Look closer", () => setView(S.face, "ahead"));
  shown.forEach((o,i) => {
    const x = 400 + (i-(n-1)/2)*span, gg = E("g",{transform:`translate(${x},${top-8})`},svg);
    const ig = E("g",{transform:"translate(0,-14)" + (mirror? " scale(-1,1)":"")},gg);
    (ICON[o.icon] || ICON[KIND_ICON[o.kind]] || ICON.box)(ig);
    const cap = o.short || (o.title.length>20 ? o.title.slice(0,19)+"…" : o.title), cw = cap.length*6.4+14;
    E("rect",{x:-cw/2,y:58,width:cw,height:17,fill:"var(--paper2)",stroke:"var(--ink)","stroke-width":1.1},gg);
    const t = T(cap,{x:0,y:70,"text-anchor":"middle","font-size":13,fill:"var(--ink)","font-family":"IM Fell English, serif"},gg);
    if(mirror) t.setAttribute("transform","scale(-1,1)");
    hot(gg, o.title, () => o.more ? setView(S.face,"ahead") : useObject(o, room));
  });
}
function drawClose(room, svg, objs, mirror){
  defs(svg);
  const g = E("g",{filter:"url(#rough)"},svg);
  E("rect",{x:0,y:0,width:W,height:H,fill:"url(#h-mid)"},g);
  const book = objs.filter(BOOKISH).length > objs.length/2;
  if(book){
    // a bookcase, face on: spines with their titles
    E("rect",{x:40,y:24,width:720,height:380,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":3},g);
    const rows = 3, perRow = Math.ceil(objs.length/rows) || 1;
    for(let r=0;r<rows;r++){ const y0 = 30 + r*124; E("rect",{x:44,y:y0+112,width:712,height:8,fill:"var(--ink)"},g); }
    objs.forEach((o,i) => {
      const r = Math.floor(i/perRow), c = i%perRow, y0 = 30 + r*124, w = Math.min(64, 690/perRow - 6), x = 52 + c*(w+6);
      const sp = E("g",{},svg), dark = (hash(o.title)%3)===0, h = 92 + (hash(o.title)%18);
      E("rect",{x,y:y0+112-h,width:w,height:h,fill:o.kind==="unwritten"?"var(--paper)":dark?"var(--ink)":(hash(o.title)%3===1?"url(#s-hatch)":"url(#h-light)"),stroke:"var(--ink)","stroke-width":1.6,"stroke-dasharray":o.kind==="unwritten"?"4 3":"none",class:"hl"},sp);
      E("rect",{x:x+3,y:y0+112-h+8,width:w-6,height:h-16,fill:"var(--paper2)",stroke:"var(--ink)","stroke-width":.8,opacity:.92},sp);
      const t = T(o.title.length>26?o.title.slice(0,25)+"…":o.title,{x:x+w/2+4,y:y0+112-h/2,"text-anchor":"middle","font-size":Math.min(12,w*.32),fill:"var(--ink)","font-family":"IM Fell English, serif",transform:`rotate(-90 ${x+w/2} ${y0+112-h/2})`},sp);
      if(mirror) t.setAttribute("transform",`rotate(90 ${x+w/2} ${y0+112-h/2})`);
      hot(sp, o.title + (o.by?", "+o.by:""), () => useObject(o, room));
    });
  } else {
    // a desk top, seen from above: things laid out with their labels
    E("polygon",{points:"30,70 770,70 800,430 0,430",fill:"var(--paper)",stroke:"var(--ink)","stroke-width":3},g);
    for(let k=0;k<14;k++) L(g,30+k*53,70,(k*800/13),430,.5,{opacity:.5});
    // the furniture of a desk: a blotter, an inkwell and quill, a brass lamp, a stray card
    E("polygon",{points:"200,110 600,110 640,400 160,400",fill:"url(#s-hatch)",stroke:"var(--ink)","stroke-width":1.6,opacity:.55},g);
    E("ellipse",{cx:90,cy:120,rx:26,ry:12,fill:"url(#h-dark)",stroke:"var(--ink)","stroke-width":1.4},g); E("ellipse",{cx:90,cy:112,rx:18,ry:8,fill:"var(--ink)"},g);
    E("path",{d:"M92,108 Q140,40 190,24",fill:"none",stroke:"var(--ink)","stroke-width":1.4},g); for(let k=0;k<10;k++){ const t=k/10, x=92+98*t, y=108-84*t+10*Math.sin(t*3); L(g,x,y,x+8,y-10,.7); }
    E("ellipse",{cx:712,cy:118,rx:30,ry:12,fill:"url(#h-mid)",stroke:"var(--ink)","stroke-width":1.6},g); L(g,712,118,712,70,3); E("path",{d:"M686,72 h52 l-8,-26 h-36 Z",fill:"var(--spot)",stroke:"var(--ink)","stroke-width":1.6},g);
    E("rect",{x:690,y:330,width:60,height:40,fill:"var(--paper2)",stroke:"var(--ink)",transform:"rotate(-8 720 350)"},g); for(let k=0;k<3;k++) L(g,698,342+k*9,740,336+k*9,.7);
    const n = objs.length, cols = Math.min(3, n), rows = Math.ceil(n/cols);
    objs.forEach((o,i) => {
      const c=i%cols, r=Math.floor(i/cols), x = 400 + (c-(cols-1)/2)*240, y = 150 + r*(rows>2?100:150) - (rows-1)*20;
      const gg = E("g",{transform:`translate(${x},${y})`},svg);
      E("ellipse",{cx:6,cy:40,rx:60,ry:10,fill:"url(#h-dark)",opacity:.6},gg);
      const ig = E("g",{transform:`scale(${rows>2?1.5:2.1})` + (mirror?" scale(-1,1)":"")},gg);
      (ICON[o.icon] || ICON[KIND_ICON[o.kind]] || ICON.box)(ig);
      const cap = o.title.length>30 ? o.title.slice(0,29)+"…" : o.title, cw = Math.max(90, cap.length*6.8+16);
      E("rect",{x:-cw/2,y:54,width:cw,height:o.by?34:20,fill:"var(--paper2)",stroke:"var(--ink)","stroke-width":1.3},gg);
      T(cap,{x:0,y:68,"text-anchor":"middle","font-size":13.5,fill:"var(--ink)","font-family":"IM Fell English, serif"},gg);
      if(o.by) T(o.by,{x:0,y:83,"text-anchor":"middle","font-size":11,"font-style":"italic",fill:"var(--muted)","font-family":"IM Fell English, serif"},gg);
      hot(gg, o.title, () => useObject(o, room));
    });
  }
  const back = E("g",{},svg); E("rect",{x:0,y:H-30,width:W,height:30,fill:"transparent"},back);
  E("rect",{x:W/2-70,y:H-26,width:140,height:20,fill:"var(--paper2)",stroke:"var(--ink)","stroke-width":1.2,rx:3},back);
  T("↓ step back",{x:W/2,y:H-12,"text-anchor":"middle","font-size":12,fill:"var(--ink)","font-family":"IM Fell English, serif"},back);
  hot(back, "Step back", () => setView(S.face, null)); back.setAttribute("class","hot turnB");
  award("close:"+cur.id+":"+S.face, 3);
}
function doorLabel(d, room){ if(d.label) return d.label; if(Array.isArray(d.to)) return "⟳"; if(d.to==="random") return "?"; if(d.to==="back") return "←"; return String(d.to); }
function doorFill(d, fill){ return d.look==="mirror" ? "url(#hz-fine)" : d.look==="bars" ? "var(--void)" : fill; }
function doorLook(g, d, isOpen, cx, ytop, ybot, hw){
  if(d.look==="mirror"){ for(let k=0;k<4;k++){ const y=ytop+(ybot-ytop)*(.2+k*.17); L(g,cx-hw*.7,y+12,cx+hw*.5,y-8,k%2?1:2.2,{stroke:"var(--paper)"}); } }
  if(d.look==="bars"){ for(let k=-2;k<=2;k++) L(g,cx+k*hw*.38,ytop+4,cx+k*hw*.38,ybot,2.6,{stroke:"var(--paper)"}); L(g,cx-hw,ytop+(ybot-ytop)*.45,cx+hw,ytop+(ybot-ytop)*.45,3,{stroke:"var(--paper)"}); }
  if(d.look==="dials"){ for(let k=0;k<4;k++){ const x=cx-hw*.66+k*hw*.44, y=ytop+(ybot-ytop)*.42; E("circle",{cx:x,cy:y,r:Math.max(4,hw*.18),fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1.2},g); L(g,x,y,x+Math.cos(k*1.7)*hw*.15,y+Math.sin(k*1.7)*hw*.15,1.2); } }
  if(d.look==="gold"){ E("circle",{cx,cy:ytop+(ybot-ytop)*.45,r:Math.max(6,hw*.28),fill:"var(--spot)",stroke:"var(--paper)","stroke-width":1.5},g); T("φ",{x:cx,y:ytop+(ybot-ytop)*.45+5,"text-anchor":"middle","font-size":Math.max(10,hw*.4),fill:"var(--paper)","font-family":"IM Fell English, serif"},g); }
  if(d.look==="shelves"){ for(let k=1;k<6;k++){ const y=ytop+(ybot-ytop)*k/6; L(g,cx-hw,y,cx+hw,y,1.6,{stroke:"var(--paper)"}); for(let j=-3;j<=3;j++) L(g,cx+j*hw*.26,y-2,cx+j*hw*.26+1,y-(ybot-ytop)/8,2.2,{stroke:"var(--paper)",opacity:.7}); } }
}
function drawDoor(svg, room, d, w, i, n, mirror){
  const lab = doorLabel(d, room), isOpen = open(d, room);
  const g = E("g",{},svg);
  const fill = isOpen ? "var(--void)" : "url(#x-dark)";
  if(w===1){
    const span = BX1-BX0, dh = Math.min(110, (BY1-BY0)*.6), cx = BX0 + span*(i+1)/(n+1), hw = Math.min(36, span/(n+1)/2.4, dh*.36), top = BY1-dh;
    E("path",{d:`M${cx-hw-7},${BY1} V${top} A${hw+7},${hw+7} 0 0 1 ${cx+hw+7},${top} V${BY1} Z`,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g);
    for(let k=0;k<9;k++){ const t=Math.PI*(k/8); L(g,cx+Math.cos(Math.PI+t)*hw,top-Math.sin(t)*hw,cx+Math.cos(Math.PI+t)*(hw+7),top-Math.sin(t)*(hw+7),1); }
    E("path",{d:`M${cx-hw},${BY1} V${top} A${hw},${hw} 0 0 1 ${cx+hw},${top} V${BY1} Z`,fill:doorFill(d,fill),class:"hl",stroke:"var(--ink)","stroke-width":2.4},g);
    doorLook(g, d, isOpen, cx, top-hw*.4, BY1, hw);
    if(isOpen && !d.look) E("path",{d:`M${cx-hw+5},${BY1} V${top+2} A${hw-5},${hw-5} 0 0 1 ${cx-2},${top-hw+5}`,fill:"none",stroke:"var(--paper)","stroke-width":1},g);
    else if(!isOpen && !d.look){ const ky=BY1-dh*.5; E("circle",{cx:cx,cy:ky,r:7,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1.5},g); E("path",{d:`M${cx-2},${ky} h4 l2,9 h-8 Z`,fill:"var(--ink)"},g); }
    plaque(g, cx, top-hw-20, lab);
  } else if(w===0 || w===2){
    const fn = w===0 ? leftPt : rightPt;
    const c = .5 + (i-(n-1)/2) * Math.min(.32, .8/n), du = Math.min(.12, .5/n);
    const fa=fn(c-du-.025,0), fb=fn(c-du-.025,.67), fc=fn(c+du+.025,.67), fd=fn(c+du+.025,0);
    E("polygon",{points:[fa,fb,fc,fd].map(p=>p.join(",")).join(" "),fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g);
    const a=fn(c-du,0), b=fn(c-du,.62), cc=fn(c+du,.62), dd=fn(c+du,0);
    E("polygon",{points:[a,b,cc,dd].map(p=>p.join(",")).join(" "),fill:doorFill(d,fill),class:"hl",stroke:"var(--ink)","stroke-width":2.4},g);
    { const t0=fn(c,.62), b0=fn(c,0); doorLook(g, d, isOpen, t0[0], t0[1], b0[1], Math.abs(cc[0]-a[0])/2); }
    if(isOpen && !d.look){ const e1=fn(c-du+.02,.02), e2=fn(c-du+.02,.58); E("line",{x1:e1[0],y1:e1[1],x2:e2[0],y2:e2[1],stroke:"var(--paper)","stroke-width":1},g); }
    const top = fn(c,.76); plaque(g, top[0], top[1], lab);
  } else {
    const cx = 72 + i*130;
    E("rect",{x:cx-58,y:H-36,width:116,height:28,fill:"var(--paper)",stroke:"var(--ink)",class:"hl","stroke-width":2},g);
    E("rect",{x:cx-54,y:H-32,width:108,height:20,fill:"none",stroke:"var(--ink)","stroke-width":.7},g);
    T(`☞ behind you · ${lab}`,{x:cx,y:H-17,"text-anchor":"middle","font-size":13,fill:"var(--ink)","font-family":"IM Fell English, serif"},g);
  }
  hot(g, `Door ${lab}${isOpen?"":" (locked)"}`, () => tryDoor(d, room));
  function plaque(g,x,y,txt){
    const nm = doorName(d), short = nm.length>16 ? nm.slice(0,15)+"…" : nm, pw = Math.max(40, short.length*5.6+14);
    E("rect",{x:x-pw/2,y:y-13,width:pw,height:nm?34:24,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1.8},g);
    E("rect",{x:x-pw/2+3,y:y-10,width:pw-6,height:nm?28:18,fill:"none",stroke:"var(--ink)","stroke-width":.6},g);
    const t = T(txt,{x:x,y:y+4,"text-anchor":"middle","font-size":15,fill:"var(--ink)","font-family":"IM Fell English SC, IM Fell English, serif"},g);
    if(nm){ const t2 = T(short.toUpperCase(),{x:x,y:y+16,"text-anchor":"middle","font-size":7.5,"letter-spacing":".8",fill:"var(--ink)","font-family":"IM Fell English SC, serif"},g); if(mirror) t2.setAttribute("transform",`translate(${2*x},0) scale(-1,1)`); }
    if(mirror) t.setAttribute("transform",`translate(${2*x},0) scale(-1,1)`);
  }
}
function drawObject(svg, room, o, i, n, mirror){
  const x = 400 + (i-(n-1)/2) * Math.min(150, 420/Math.max(n-1,1)), y = n>4 && i%2 ? 352 : 392;
  const g = E("g",{transform:`translate(${x},${y})`},svg);
  { const b = LIGHT.beam; let sx=14, sy=8;
    if(b){ const len = Math.max(8, Math.min(60, 22/Math.tan(Math.max(b.alt,3)*DEG))); sx = -Math.sin(b.rel*DEG)*len*(mirror?-1:1); sy = 4+Math.cos(b.rel*DEG)*len*.35; }
    else if(LIGHT.lamp){ sx = (x-400)*.06; sy = 6; }
    E("polygon",{points:`-30,26 30,26 ${30+sx},${26+sy} ${-30+sx},${26+sy}`,fill:"url(#h-dark)"},g); }
  E("polygon",{points:"-30,18 30,18 36,14 -24,14",fill:"url(#h-light)",stroke:"var(--ink)","stroke-width":1.2},g);
  E("rect",{x:-30,y:18,width:60,height:8,fill:"var(--paper)",class:"hl",stroke:"var(--ink)","stroke-width":1.4},g);
  E("polygon",{points:"30,18 36,14 36,22 30,26",fill:"url(#h-mid)",stroke:"var(--ink)","stroke-width":1.2},g);
  const ig = E("g",{transform:"translate(0,-6)" + (mirror? " scale(-1,1)":"")},g);
  (ICON[o.icon] || ICON[KIND_ICON[o.kind]] || ICON.box)(ig);
  const cap = o.short || (o.title.length>22 ? o.title.slice(0,21)+"…" : o.title), cw = cap.length*6.6+14;
  E("rect",{x:-cw/2,y:32,width:cw,height:18,fill:"var(--paper2)",stroke:"var(--ink)","stroke-width":1.2},g);
  const t = T(cap,{x:0,y:45,"text-anchor":"middle","font-size":13.5,fill:"var(--ink)","font-family":"IM Fell English, serif"},g);
  if(mirror) t.setAttribute("transform","scale(-1,1)");
  hot(g, o.title, () => useObject(o, room));
}
/* ---------- things you carry ---------- */
const ITEMS = {
  "map":         {icon:"map",       name:"A map that fills in as you walk", use:()=>mapView()},
  "plan":        {icon:"map",       name:"The full plan of the house",     use:()=>mapView()},
  "finding-aid": {icon:"scroll",    name:"The finding aid (every link)",    use:()=>catalogueView()},
  "master-key":  {icon:"key",       name:"The porter's master key",         use:()=>toast("The master key opens every ordinary lock. A few doors want more than a key.")},
  "golden-key":  {icon:"key",       name:"A golden key, stamped φ",         use:()=>toast("A golden key, stamped φ. Somewhere there is a lock to match.")},
  "compass":     {icon:"compass",   name:"A compass",                       use:()=>{ S.frame=[0,0]; save(); render(); toast("The needle settles. You are facing true, and no longer mirrored."); }},
  "lantern":     {icon:"lamp",      name:"A lantern",                       use:()=>{ S.lantern=!S.lantern; save(); render(); toast(S.lantern?"You raise the lantern.":"You shade the lantern."); }},
  "hourglass":   {icon:"hourglass", name:"An hourglass that sets the house's clock", use:()=>timeView()},
  "page-left":   {icon:"note",      name:"The left half of a torn page", use:()=>toast("Half a page. The words stop in the middle.")},
  "page-right":  {icon:"note",      name:"The right half of a torn page", use:()=>toast("Half a page. The words start in the middle.")},
  "mended-page": {icon:"scroll",    name:"A mended page", use:()=>overlay("The mended page", `<div class="text"><p>Once mended, the page is a short poem about square roots: every number has two, and you cannot choose one consistently all the way around zero. Walk around the pillar once and you have changed your mind about which root you meant.</p><p>At the bottom, in a different hand, a warp word: <b class="mono">SHEET</b>.</p></div>`)},
  "primer":      {icon:"book",      name:"A Young Lady's Illustrated Primer", use:()=>primerView()},
  "musicbox":    {icon:"musicbox",  name:"A music box: the house's music, and how loud everything is", use:()=>musicView()},
  "astrolabe":   {icon:"astrolabe", name:"An astrolabe with a storm glass: sets the place, the date, and the weather", use:()=>astrolabeView()},
};
function take(item, msg){ if(S.inv.includes(item)) return; S.inv.push(item); sound.take(); save(); award("item:"+item, item==="golden-key"?40:15); toast(msg || `You take ${(ITEMS[item]||{}).name || item}.`); render(); }
function useObject(o, room){
  if(o.more) return setView(S.face, "ahead");
  if(o.kind==="key"){ take(o.item, o.take); return; }
  if(o.action==="mode") return modeView();
  if(o.action==="letter") return letterView();
  if(o.action==="register") return registerView();
  if(o.action==="return") return returnView();
  if(o.action==="bell"){ award("bell", 1); toast(Math.random()<.15 ? "The bell rings, and somewhere far off a latch clicks." : "The bell rings. Nobody comes. Nobody ever comes."); return; }
  if(o.action==="notices") return noticesView();
  if(o.action==="links") return linksView();
  if(o.action==="almanac") return almanacView();
  if(o.action==="officehours") return officeHoursView();
  if(o.action==="search") return searchView();
  if(o.action==="planets") return planetsView();
  if(o.action==="logbook") return catalogView("");
  if(o.action==="link") return linkView(o, room);
  if(o.action==="music") return musicView(o);
  if(o.action==="clock") return clockView();
  if(o.action==="astrolabe"){ if(o.item && !S.inv.includes(o.item)) take(o.item, "You lift the astrolabe off its hook. The storm glass in its throne clouds and clears."); return astrolabeView(); }
  if(o.action==="combine"){ const uses=o.uses||[]; if(uses.every(k=>S.inv.includes(k))){ S.inv = S.inv.filter(k=>!uses.includes(k)); if(o.solve) S.solved[o.solve]=1; save(); take(o.gives, o.say); award("combine:"+o.gives, 40); } else toast(o.hint || "Something is missing."); return; }
  if(o.action==="directory") return directoryView();
  if(o.action==="codes") return codesView();
  if(o.action==="time") return timeView(true);
  if(o.action==="map") return mapView(true);
  if(o.action==="primer"){ if(o.item && !S.inv.includes(o.item)) take(o.item, "You take the Primer. It rides in your bag now."); return primerView(); }
  if(o.action==="catalogue") return catalogueView(true);
  if(o.action==="ranks"){ overlay("Ranks of the library",""); WIDGETS.rank($("ovb")); return; }
  if(o.to){ if(o.say) toast(o.say); move(String(o.to), o.turn, room); return; }
  cardView(o);
}
function iconSVG(name, scale){ const s = document.createElementNS(NS,"svg"); s.setAttribute("viewBox","-34 -34 68 68"); s.setAttribute("width",scale||64); s.setAttribute("height",scale||64); const g=E("g",{},s); (ICON[name]||ICON.box)(g); return s; }
function cardView(o){
  overlay(o.title, `<div class="obcard"><div id="obi" class="obi"></div><div><p class="mono note">${esc(o.kind||"device")}${o.by?" · "+esc(o.by):""}</p>${o.note?`<p class="text" style="font-size:18px">${o.note}</p>`:""}${o.href?`<p><a class="btn primary" href="${esc(o.href)}">Open it</a></p>`:""}${o.kind==="unwritten"?`<p class="note">Not yet written. It waits on the shelf.</p>`:""}</div></div>`);
  if(VIEW3D && S.gfx!=="2d") VIEW3D.inspect($("obi"), Object.assign({icon:o.icon || KIND_ICON[o.kind] || "box"}, o), wingColor(effective(cur)));
  else $("obi").appendChild(iconSVG(o.icon || KIND_ICON[o.kind] || "box", 120));
  award("look:"+o.title, 2);
}
function bag(){
  const b = $("bag"); b.innerHTML = "";
  if(!S.inv.length){ b.innerHTML = `<span class="note">Your bag is empty. The porter at the Entry can help.</span>`; return; }
  S.inv.forEach(k => { const it = ITEMS[k] || {icon:"box", name:(P.items&&P.items[k])||k}; const btn=document.createElement("button"); btn.type="button"; btn.className="slot"; btn.title=it.name; btn.setAttribute("aria-label",it.name);
    btn.appendChild(iconSVG(it.icon, 40)); btn.onclick = () => it.use ? it.use() : toast(it.name); b.appendChild(btn); });
}
function corners(room){
  const m = $("mini"), pr = $("primerc");
  if(S.inv.includes("map")||S.inv.includes("plan")||S.showAll){ m.style.display=""; m.innerHTML = miniMapSVG(); m.onclick = () => mapView(); } else m.style.display="none";
  if(S.inv.includes("primer")){ const L2 = P.primer||{}, l = L2[String(room.id)]; pr.style.display=""; pr.innerHTML = `<b>Primer:</b> ${l ? esc(l.teaser) : "turn the page for somewhere new"}`; pr.onclick = primerView; } else pr.style.display="none";
}
function miniMapSVG(){
  const c = cur; if(!c || !c.at) return "";
  const near = new Set([String(c.id)]); (c.doors||[]).forEach(d => allTargets(d).forEach(t => near.add(t)));
  const ids = [...near].filter(i => ROOMS[i] && ROOMS[i].at && !ROOMS[i].closed && (S.visits[i] || S.inv.includes("plan") || i===String(c.id) || true));
  const u=26, cx=c.at[0], cy=c.at[1];
  let s = `<svg viewBox="-80 -60 160 120" width="160" height="120" aria-label="Nearby rooms">`;
  ids.forEach(i => { if(i===String(c.id)) return; const r=ROOMS[i]; s += `<line x1="0" y1="0" x2="${(r.at[0]-cx)*u}" y2="${(r.at[1]-cy)*u}" stroke="var(--ink)" stroke-width="1" stroke-dasharray="${S.visits[i]?"0":"2 2"}"/>`; });
  ids.forEach(i => { const r=ROOMS[i], x=(r.at[0]-cx)*u, y=(r.at[1]-cy)*u, k=S.visits[i]||S.inv.includes("plan"), me=i===String(c.id);
    s += `<rect x="${x-9}" y="${y-8}" width="18" height="16" fill="${me?"var(--spot)":k?"var(--ink)":"var(--paper2)"}" stroke="var(--ink)" stroke-width="1.2"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="9" fill="${me||k?"var(--paper2)":"var(--ink)"}" font-family="IM Fell English SC, serif">${(r.secret&&!S.visits[i])?"?":esc(r.label||r.id)}</text>`; });
  const a = (facing()/90 + S.face)*90 + 180; // arrow shows which way you face on the map (north up)
  s += `<g transform="rotate(${((facing()+90*S.face)%360)})"><path d="M0,-14 l4,7 h-8 z" fill="var(--paper2)" stroke="var(--ink)"/></g>`;
  return s + `</svg>`;
}
/* ---------- the tally bar ---------- */
function tally(light){
  const ri = rankIndex(), rk = RANKS[ri], nx = RANKS[ri+1], g = S.frame;
  const lo = rk.xp||0, hi = nx ? nx.xp : lo+1, frac = nx ? Math.min(1,(S.xp-lo)/(hi-lo)) : 1;
  const f = `<svg class="gnomon" viewBox="-14 -14 28 28" aria-hidden="true"><rect x="-13" y="-13" width="26" height="26" fill="none" stroke="currentColor" opacity=".4"/><g transform="rotate(${90*g[0]}) scale(${g[1]?-1:1},1)"><path d="M-4,8 V-8 H6 M-4,0 H4" fill="none" stroke="var(--spot)" stroke-width="2.6" stroke-linecap="round"/></g></svg>`;
  const d = now(), wx = weather(), icon = {night:"☾",dawn:"◒",day:"☀",dusk:"◓"}[light];
  const sheets = Object.keys(S.sheets).filter(k => S.sheets[k]).map(k => `${((P.sheets||{})[k]||{}).sym||k} ${S.sheets[k]}`).join(" · ");
  $("tally").innerHTML = `
    <span class="chip" title="Level and experience"><span class="vest" style="background:${rk.color}"></span>L${ri} ${esc(rk.name)} <span class="xp"><span style="width:${(frac*100).toFixed(0)}%"></span></span> ${S.xp} xp</span>
    <span class="chip" title="Your frame: how the house has turned you">${f} ${nameG(g)}${sheets?" · "+esc(sheets):""}</span>
    <button class="chip" id="t-time" type="button" title="${S.inv.includes("hourglass")?"Set the house's clock with the hourglass":"The house keeps your time"}">${icon} ${d.toLocaleDateString([], {month:"short", day:"numeric"})} ${d.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})}${S.clock?" ⧗":""}</button>
    <span class="chip" title="${wx? (wx.set ? "Weather set by the astrolabe's storm glass" : "Weather in "+placeName()+" now (Open-Meteo)") :"Weather unavailable"}">${wx? `${wxIcon(wx.weather_code, wx.is_day)} ${Math.round(wx.temperature_2m)}°F` : "· · ·"}</span>
    <button class="chip" id="t-code" type="button" title="Save code and warp codes">⌘ ${saveCode().slice(0,9)}…</button>
    <span class="chip" title="Your way of walking, by what you carry">${esc(walkMode())}</span>
    <button class="chip" id="t-pin" type="button" title="Pin this room to the link board">${(S.pins||[]).includes(String(cur.id)) ? "★" : "☆"}</button>
    <button class="chip" id="t-go" type="button" title="Go to… (press /)">/ go</button>
    ${S.showAll? '<span class="chip warn">curator</span>':""}`;
  $("t-time").onclick = () => S.inv.includes("hourglass") ? timeView() : toast("You'd need an hourglass to change the time.");
  $("t-code").onclick = codesView;
  $("t-go").onclick = searchView;
  $("t-pin").onclick = () => { S.pins = S.pins||[]; const id=String(cur.id); S.pins = S.pins.includes(id) ? S.pins.filter(x=>x!==id) : S.pins.concat([id]); save(); tally(lightNow()); toast(S.pins.includes(id) ? "Pinned to the link board." : "Unpinned."); };
}
/* ---------- weather (Open-Meteo, no key) ---------- */
let wxFetching = false;
const skyOff = k => !!(S.skyOff && S.skyOff[k]);   // the storm glass can put out the sun or the moon, to see the stars
const WX_SET = {clear:{weather_code:0,cloud_cover:0}, cloud:{weather_code:2,cloud_cover:55}, overcast:{weather_code:3,cloud_cover:96}, fog:{weather_code:45,cloud_cover:100}, rain:{weather_code:63,cloud_cover:100}, snow:{weather_code:73,cloud_cover:100}, storm:{weather_code:95,cloud_cover:100}};
function weather(){
  if(S.wxSet && WX_SET[S.wxSet]){ const live = S.wx && S.wx.c || {}; const sk = skyNow();
    return Object.assign({temperature_2m: live.temperature_2m!=null ? live.temperature_2m : (S.wxSet==="snow" ? 28 : 58), relative_humidity_2m: live.relative_humidity_2m||60, wind_speed_10m: live.wind_speed_10m!=null ? live.wind_speed_10m : 6, surface_pressure: live.surface_pressure||1013, is_day: sk.sun.alt>0?1:0, set:true}, WX_SET[S.wxSet]); }
  if(S.wx && S.wx.at && S.wx.at !== locKey()) S.wx = null;
  const fresh = S.wx && (Date.now()-S.wx.t < 20*60e3);
  if(!fresh && !wxFetching && !(weather.failed && Date.now()-weather.failed < 10*60e3)){ wxFetching = true;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,weather_code,cloud_cover,wind_speed_10m,surface_pressure,is_day&temperature_unit=fahrenheit&wind_speed_unit=mph`)
      .then(r => r.json()).then(j => { if(j && j.current){ S.wx = {t:Date.now(), c:j.current, at:locKey()}; save(); if(cur) render(); } }).catch(()=>{ weather.failed = Date.now(); }).finally(()=>{ wxFetching=false; }); }
  return S.wx ? S.wx.c : null;
}
function wxKind(code){ if(code==null) return "clear"; if(code>=95) return "storm"; if(code>=71 && code<=77 || code===85 || code===86) return "snow"; if(code>=51 && code<=67 || code>=80 && code<=82) return "rain"; if(code===45||code===48) return "fog"; if(code>=2) return "cloud"; return "clear"; }
function wxIcon(code, day){ return {clear: day?"☀":"☾", cloud:"☁", fog:"≋", rain:"☂", snow:"❄", storm:"ϟ"}[wxKind(code)]; }
/* ---------- the hourglass: set the house's clock ---------- */
function timeView(fromDesk){
  if(!S.inv.includes("hourglass") && !fromDesk && !S.showAll){ toast("You'd need an hourglass."); return; }
  const d = now(), pad = n => String(n).padStart(2,"0"), v = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  overlay("The hourglass", `<div class="text"><p>Turn the glass and the house's clock follows: the light, the sky, the sundial, the pendulum, and every door that keeps hours.</p></div>
    <div class="row widget"><input id="tv-d" type="datetime-local" value="${v}" style="width:240px"><select id="tv-r"><option value="1">runs at 1×</option><option value="60">60× (a minute a second)</option><option value="3600">3600× (an hour a second)</option><option value="0">stopped</option></select><button class="btn primary" id="tv-s" type="button">Turn the glass</button></div>
    <div class="row"><button class="btn" id="tv-n" type="button">Return to the real time</button></div><p class="note">${S.clock?"The house is on hourglass time now.":"The house is on real time."}</p>`);
  if(S.clock) $("tv-r").value = String(S.clock.rate);
  $("tv-s").onclick = () => { const t = new Date($("tv-d").value); if(isNaN(t)) return; S.clock = {base:Date.now(), pal:t.getTime(), rate:+$("tv-r").value}; save(); closeOv(); render(); toast("The sand runs differently now."); award("hourglass-used", 10); };
  $("tv-n").onclick = () => { S.clock = null; save(); closeOv(); render(); toast("Back on real time."); };
}

/* ---------- the court's sundials: five instruments that take turns in the middle of the court ---------- */
const DIALS = {
  horizontal: {name:"The horizontal dial", blurb:"A brass plate and a style aimed at the pole: the sun's own time, as it falls here."},
  armillary:  {name:"The armillary sphere", blurb:"An equatorial dial: the polar rod's shadow on an evenly divided band."},
  meantime:   {name:"The mean-time dial", blurb:"A plate of figure-eights. The shadow of a bead on a pin tells the clock's own time, the equation of time and the longitude already worked in."},
  meridiana:  {name:"The glass sphere", blurb:"A glass ball on a column throws a spot of sun on the paving; at clock noon it crosses the figure-eight, at sun noon the straight line."},
  cannon:     {name:"The noon cannon", blurb:"A burning glass over the touch-hole: when the sun crosses the meridian on a clear day, it fires."},
};
const dialType = () => DIALS[S.dial] ? S.dial : "horizontal";
// hours east of UTC for standard time (no daylight saving), as the dials that tell clock time are drawn
function stdOffsetH(){ const y = now().getFullYear(); return -Math.max(new Date(y,0,1).getTimezoneOffset(), new Date(y,6,1).getTimezoneOffset())/60; }
function sunAtUTC(ms){ const jd = ms/864e5 + 2440587.5, L = lst(jd), sq = sunEq(jd), a = altaz(sq[0], sq[1], L); a[0] += refr(a[0]); return {alt:a[0], az:a[1], ra:sq[0], dec:sq[1], L}; }
// the shadow of a point one unit above the ground, as (east, north)
const shadowOf = a => { const t = 1/Math.tan(a.alt*DEG); return [-t*Math.sin(a.az*DEG), -t*Math.cos(a.az*DEG)]; };
function dialData(type){
  const y = now().getFullYear(), key = type + ":" + locKey() + ":" + y; if(dialData.cache && dialData.cache.key === key) return dialData.cache.v;
  const off = stdOffsetH(), out = {type, stdOffset: off, lat: LAT};
  if(type === "meantime"){ // a figure-eight for each clock hour: where the bead's shadow falls at that standard time, every few days of the year
    out.hours = {}; for(let hr=6; hr<=18; hr++){ const pts = []; for(let d=0; d<=366; d+=3){ const a = sunAtUTC(Date.UTC(y,0,1+d, hr - off, 0)); if(a.alt > 5) pts.push(shadowOf(a).concat([d])); } out.hours[hr] = pts; }
    out.dates = [[171,"June solstice"],[79,"equinoxes"],[354,"December solstice"]].map(([d, lab]) => ({lab, pts: Array.from({length:65}, (_, k) => { const a = sunAtUTC(Date.UTC(y,0,1+d, 4 - off, 0) + k*15*6e4); return a.alt > 5 ? shadowOf(a) : null; }).filter(Boolean)}));
  }
  if(type === "meridiana"){ // where the spot falls at clock noon through the year, and the marks for each month's first day at sun noon
    out.noon8 = []; for(let d=0; d<=366; d+=2){ const a = sunAtUTC(Date.UTC(y,0,1+d, 12 - off, 0)); if(a.alt > 3) out.noon8.push(shadowOf(a).concat([d])); }
    out.months = Array.from({length:12}, (_, m) => { const jd = Date.UTC(y, m, 1, 12)/864e5 + 2440587.5, dec = sunEq(jd)[1], alt = 90 - Math.abs(LAT - dec); return {m, n: (LAT >= dec ? 1 : -1)/Math.tan(alt*DEG)}; });
  }
  dialData.cache = {key, v: out}; return out;
}
function setDial(t){ if(!DIALS[t]) return; S.dial = t; save(); award("dial:" + t, 5); toast(`${DIALS[t].name} is carried out into the court.`); render(); }
// the noon cannon: listen for the sun crossing the meridian
let lastHA = null;
setInterval(() => { if(!cur || String(cur.id) !== "34" || dialType() !== "cannon") { lastHA = null; return; }
  const sk = skyNow(), ha = ((sk.L - sk.sun.ra + 540) % 360) - 180, wx = weather(), cc = wx ? (wx.cloud_cover||0) : 0;
  if(lastHA != null && lastHA < 0 && ha >= 0 && sk.sun.alt > 0 && cc < 70 && !skyOff("sun")){ window.dispatchEvent(new CustomEvent("wending-cannon")); sound.cannon && sound.cannon(); toast("Noon. The sun crosses the meridian, the burning glass finds the touch-hole, and the little cannon fires."); award("cannon", 20); }
  lastHA = ha; }, 2000);
/* ---------- the Archive's log book: the catalogue, read inside the house ---------- */
let CATALOG = null;
function loadCatalog(){ const url = (P.catalog && P.catalog.url) || "/catalog/index.json";
  fetch(url + "?t=" + Math.floor(Date.now()/6e4)).then(r => r.ok ? r.json() : {items:[]}).then(j => { CATALOG = (j.items||[]).filter(it => !it.private); if(cur && (effective(cur).decor||[]).includes("catalogshelves")) render(); }).catch(() => { CATALOG = []; }); }
loadCatalog();
// the house's notices, as the archivist last posted them from the log book, override the data file's
(function loadHouseNotices(){ const base = ((P.catalog && P.catalog.url) || "/catalog/index.json").replace(/index\.json.*$/, "");
  fetch(base + "house.json?t=" + Math.floor(Date.now()/6e4)).then(r => r.ok ? r.json() : null).then(h => { if(!h) return;
    ["office","office_hours","events","news","puzzles"].forEach(k => { if(h[k] != null) P[k] = h[k]; }); if(cur) render(); }).catch(() => {}); })();
function catalogView(hash){
  let lb = $("logbook-ov");
  if(!lb){ lb = document.createElement("div"); lb.id = "logbook-ov"; lb.className = "logbook-ov"; lb.innerHTML = `<button type="button" class="lbx" aria-label="Close the log book">×</button><iframe title="The log book" allow="camera"></iframe>`; document.body.appendChild(lb);
    lb.querySelector(".lbx").onclick = () => { lb.classList.remove("open"); lb.querySelector("iframe").src = "about:blank"; sound.page && sound.page(); };
    document.addEventListener("keydown", e => { if(e.key === "Escape" && lb.classList.contains("open")) lb.querySelector(".lbx").click(); }); }
  lb.querySelector("iframe").src = "catalog/" + (hash ? "#" + hash : ""); lb.classList.add("open"); sound.page && sound.page(); award("logbook", 5);
}
/* ---------- linking books: a moving picture of somewhere else; touch it and you're there ---------- */
const SHOTS = {}; try { Object.assign(SHOTS, JSON.parse(sessionStorage.getItem("wending-shots") || "{}")); } catch(e) {}
function keepShot(id){ setTimeout(() => { if(!VIEW3D || !VIEW3D.thumb || !cur || String(cur.id) !== String(id)) return; try { SHOTS[id] = VIEW3D.thumb(); const keys = Object.keys(SHOTS); if(keys.length > 8) delete SHOTS[keys[0]]; sessionStorage.setItem("wending-shots", JSON.stringify(SHOTS)); } catch(e) {} }, 2500); }
function linkView(o, room){
  const t = String(o.to), dest = ROOMS[t]; if(!dest) return;
  const shot = SHOTS[t];
  overlay("A linking book", `<div class="linkbook"><div class="lpage"><h3>${esc(dest.name)}</h3><p>${esc(((dest.text||"").split(/\n|\. /)[0]||"").slice(0,180))}.</p><p class="note">The book is warm. The picture on the right-hand page moves, very slightly, like a window seen through water.</p></div>
    <div class="rpage"><button type="button" class="panel" id="lk-go" aria-label="Touch the panel to link to ${esc(dest.name)}">${shot ? `<img src="${shot}" alt="">` : `<span class="dark">${esc(dest.name)}</span>`}</button><p class="note">Touch the panel.</p></div></div>`);
  sound.page && sound.page();
  $("lk-go").onclick = () => { const veil = document.createElement("div"); veil.className = "linkveil"; document.body.appendChild(veil); sound.link && sound.link();
    requestAnimationFrame(() => veil.classList.add("on"));
    setTimeout(() => { closeOv(); S.frame = [0,0]; move(t, null, room); award("link:"+t, 10); }, 1300);
    setTimeout(() => { veil.classList.remove("on"); setTimeout(() => veil.remove(), 1400); }, 1900); };
}
/* ---------- the carriage clock: chimes on house time ---------- */
// sequences from the standard chime tables: bells numbered from the lowest; four changes make the hour
const midiHz = n => 440*Math.pow(2, (n-69)/12);   // MIDI note to hertz
const CHIMES = {
  westminster: {name:"Westminster", bells:[midiHz(62),midiHz(67),midiHz(69),midiHz(71)], hour:midiHz(50),
    q:[["4321"], ["2431","2342"], ["4231","1342","4321"], ["2431","2342","4231","1342"]]},
  whittington: {name:"Whittington", bells:[midiHz(62),midiHz(64),midiHz(66),midiHz(67),midiHz(69),midiHz(71),midiHz(73),midiHz(74)], hour:midiHz(50),
    q:[["87654321"], ["82736451","86427531"], ["87436521","24685231","87654321"], ["82736451","86427531","87436521","24685231"]]},
  stmichael:   {name:"St. Michael's", bells:[midiHz(65),midiHz(67),midiHz(69),midiHz(70),midiHz(72),midiHz(74),midiHz(76),midiHz(77)], hour:midiHz(53),
    q:[["87654321"], ["82347561","54362781"], ["78342561","57384261","87654321"], ["82347561","54362781","78342561","57384261"]]},
  tingtang:    {name:"Ting-tang", bells:[midiHz(72),midiHz(76)], hour:midiHz(55), q:[["21"], ["21","21"], ["21","21","21"], []]},
  ships:       {name:"Ship's bells", bells:[midiHz(81)], ships:true},
  hours:       {name:"The hours only", bells:[], hour:midiHz(55), q:[[],[],[],[]]},
  silent:      {name:"Silent", silent:true},
};
/* ---------- sound: one audio graph for the whole house ----------
   master ─┬─ effects (steps, doors, pages, the link)        each bus also sends to a hall reverb
           ├─ ambience (rain, wind, birds, crickets, thunder, room tone, the clock's tick)
           ├─ music (the house's own: slow chords and a few notes, in a mode for each wing)
           └─ chimes (the carriage clock)
   Browsers allow sound only after the visitor has clicked something; it starts on the first click. */
let AC = null;
S.snd = Object.assign({on:true, master:.8, amb:.7, music:.35, sfx:.7, mode:"house"}, S.snd || {});
const sound = (() => {
  let ac = null, master, rev, buses = {}, noise = {}, amb = {}, scene = {}, musicT = null, tickT = null;
  const mk = (type, opts={}) => Object.assign(ac["create" + type](), opts);
  function g(v){ const x = ac.createGain(); x.gain.value = v; return x; }
  function impulse(sec, decay){ const n = Math.round(ac.sampleRate*sec), b = ac.createBuffer(2, n, ac.sampleRate);
    for(let c=0;c<2;c++){ const d = b.getChannelData(c); for(let i=0;i<n;i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/n, decay) * (i < ac.sampleRate*.012 ? i/(ac.sampleRate*.012) : 1); } return b; }
  function noiseBuf(kind){ const n = ac.sampleRate*4, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0, last=0;
    for(let i=0;i<n;i++){ const w = Math.random()*2-1;
      if(kind === "pink"){ b0=.99886*b0+w*.0555179; b1=.99332*b1+w*.0750759; b2=.969*b2+w*.153852; b3=.8665*b3+w*.3104856; b4=.55*b4+w*.5329522; b5=-.7616*b5-w*.016898; d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11; b6=w*.115926; }
      else { last = (last + .02*w)/1.02; d[i] = last*3.5; } } return b; }
  function loop(buf){ const src = mk("BufferSource"); src.buffer = buf; src.loop = true; src.start(); return src; }
  function init(){
    if(ac) { if(ac.state === "suspended") ac.resume(); return ac; }
    if(navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;   // wait for the visitor's first click
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return null; }
    AC = ac;
    master = g(S.snd.on ? S.snd.master : 0); const comp = mk("DynamicsCompressor"); comp.threshold.value = -18; comp.ratio.value = 3; master.connect(comp); comp.connect(ac.destination);
    rev = mk("Convolver"); rev.buffer = impulse(3.4, 2.4); const wet = g(.5); rev.connect(wet); wet.connect(master);
    [["sfx", S.snd.sfx, .22], ["amb", S.snd.amb, .12], ["music", S.snd.music, .55], ["chime", 1, .45]].forEach(([k, v, send]) => { const b = g(v); b.connect(master); const sd = g(send); b.connect(sd); sd.connect(rev); buses[k] = b; buses[k + "Send"] = sd; });
    noise.pink = noiseBuf("pink"); noise.brown = noiseBuf("brown");
    // continuous layers, silent until the scene asks for them
    const layer = (buf, filt) => { const src = loop(buf), f = mk("BiquadFilter", filt), out = g(0); src.connect(f); f.connect(out); out.connect(buses.amb); return {f, out}; };
    amb.rain = layer(noise.pink, {type:"bandpass"}); amb.rain.f.frequency.value = 2600; amb.rain.f.Q.value = .5;
    amb.rainLow = layer(noise.brown, {type:"lowpass"}); amb.rainLow.f.frequency.value = 500;
    amb.wind = layer(noise.brown, {type:"bandpass"}); amb.wind.f.frequency.value = 420; amb.wind.f.Q.value = .8;
    amb.room = layer(noise.brown, {type:"lowpass"}); amb.room.f.frequency.value = 160;
    // the wind gusts
    setInterval(() => { if(!ac || !scene.windK) return; const t = ac.currentTime; amb.wind.f.frequency.setTargetAtTime(260 + Math.random()*700*scene.windK, t, 1.2); amb.wind.out.gain.setTargetAtTime(scene.windK*(.25 + Math.random()*.5)*(scene.open ? 1 : .35), t, 1.5); }, 1800);
    // drops, birds, crickets, thunder
    setInterval(tickAmbience, 120);
    setScene(scene); startMusic();
    return ac;
  }
  function env(node, t, a, peak, d){ node.gain.setValueAtTime(0, t); node.gain.linearRampToValueAtTime(peak, t + a); node.gain.exponentialRampToValueAtTime(1e-4, t + a + d); }
  function burst(bus, t, {freq=1200, q=1, type="bandpass", a=.003, d=.08, v=.3, buf="pink", rate=1}={}){ const src = mk("BufferSource"); src.buffer = noise[buf]; src.playbackRate.value = rate; const f = mk("BiquadFilter"); f.type = type; f.frequency.value = freq; f.Q.value = q; const e = g(0); src.connect(f); f.connect(e); e.connect(buses[bus]); env(e, t, a, v, d); src.start(t, Math.random()*3); src.stop(t + a + d + .05); }
  function tone(bus, t, f, {type="sine", a=.005, d=1, v=.2, detune=0}={}){ const o = mk("Oscillator"); o.type = type; o.frequency.value = f; o.detune.value = detune; const e = g(0); o.connect(e); e.connect(buses[bus]); env(e, t, a, v, d); o.start(t); o.stop(t + a + d + .05); return o; }
  let lastDrop = 0, nextBird = 0, nextCricket = 0, nextThunder = 0;
  function tickAmbience(){
    if(!ac || ac.state !== "running") return; const t = ac.currentTime;
    if(scene.rainK > .05){ const n = Math.round(scene.rainK * (scene.open ? 6 : 2)); for(let k=0;k<n;k++) burst("amb", t + Math.random()*.12, {freq: scene.open ? 2000 + Math.random()*5000 : 900 + Math.random()*1200, q: 3, d:.02 + Math.random()*.03, v: (scene.open ? .14 : .05)*Math.random()}); }
    if(scene.birds && t > nextBird){ nextBird = t + 2.5 + Math.random()*7; const f0 = 2400 + Math.random()*2200, n = 2 + Math.floor(Math.random()*5);
      for(let k=0;k<n;k++){ const tt = t + k*(.09 + Math.random()*.06), o = tone("amb", tt, f0, {a:.004, d:.07 + Math.random()*.06, v:.05}); o.frequency.setValueAtTime(f0*(1 + Math.random()*.3), tt); o.frequency.exponentialRampToValueAtTime(f0*(.7 + Math.random()*.6), tt + .08); } }
    if(scene.crickets && t > nextCricket){ nextCricket = t + .9 + Math.random()*1.4; for(let k=0;k<3;k++) tone("amb", t + k*.05, 4300 + Math.random()*200, {a:.002, d:.035, v:.025}); }
    if(scene.storm && t > nextThunder){ nextThunder = t + 18 + Math.random()*40; const delay = 1 + Math.random()*4;
      window.dispatchEvent(new CustomEvent("wending-lightning")); burst("amb", t + delay, {buf:"brown", type:"lowpass", freq:140, q:.7, a:.08, d:4.5 + Math.random()*3, v: scene.open ? .9 : .5, rate:.5}); burst("amb", t + delay, {buf:"pink", type:"lowpass", freq:900, a:.01, d:.6, v:.25}); }
  }
  function setScene(sc){
    scene = sc || {}; if(!ac) return; const t = ac.currentTime, open = !!scene.open;
    const rk = scene.rainK || 0;
    amb.rain.out.gain.setTargetAtTime(rk * (open ? .55 : .14), t, 1.2); amb.rain.f.frequency.setTargetAtTime(open ? 2600 : 900, t, .5);
    amb.rainLow.out.gain.setTargetAtTime(rk * (open ? .35 : .22), t, 1.2);
    amb.room.out.gain.setTargetAtTime(open ? 0 : .12, t, 1);
    if(!scene.windK) amb.wind.out.gain.setTargetAtTime(0, t, 1);
    buses.ambSend.gain.setTargetAtTime(open ? .03 : .14, t, .5); buses.sfxSend.gain.setTargetAtTime(open ? .05 : scene.big ? .35 : .22, t, .5);
    clearInterval(tickT); if(scene.clock) tickT = setInterval(() => { if(ac.state === "running"){ const tt = ac.currentTime; burst("amb", tt, {freq:3200, q:6, d:.012, v:.05}); } }, 1000);
  }
  /* the house's own music: slow chords in a mode, a few bell-like notes over them */
  const MODES = {foyer:[0,2,3,5,7,9,10], court:[0,2,4,6,7,9,11], archive:[0,2,3,5,7,8,10], garden:[0,2,4,7,9], default:[0,2,4,5,7,9,11]};
  const ROOTS = {foyer:50, court:53, archive:45, garden:55, default:48};
  function startMusic(){
    clearTimeout(musicT); if(!ac) return;
    const step = () => { musicT = setTimeout(step, 7000 + Math.random()*5000);
      if(!S.snd.on || S.snd.mode === "quiet" || ac.state !== "running") return;
      const wing = scene.wing && MODES[scene.wing] ? scene.wing : "default", mode = MODES[wing], root = ROOTS[wing], t = ac.currentTime + .1;
      const deg = Math.floor(Math.random()*mode.length), chord = [0,2,4].map(k => root + mode[(deg+k) % mode.length] + 12*Math.floor((deg+k)/mode.length));
      if(S.snd.mode === "house"){ // a pad: two detuned saws through a slow low-pass, per note
        chord.forEach((m, k) => { const f = midiHz(m - 12); [-7, 7].forEach(dt => { const o = mk("Oscillator"); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = dt; const lp = mk("BiquadFilter"); lp.type = "lowpass"; lp.frequency.value = 500 + k*120; const e = g(0); o.connect(lp); lp.connect(e); e.connect(buses.music);
          e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.035, t + 3); e.gain.setValueAtTime(.035, t + 6); e.gain.linearRampToValueAtTime(0, t + 11); o.start(t); o.stop(t + 11.2); }); }); }
      const notes = S.snd.mode === "box" ? 7 + Math.floor(Math.random()*6) : 1 + Math.floor(Math.random()*3);
      for(let k=0;k<notes;k++){ const m = root + 12 + mode[Math.floor(Math.random()*mode.length)] + (Math.random() < .3 ? 12 : 0), tt = t + (S.snd.mode === "box" ? k*.32 : 1 + Math.random()*7);
        pluck(m, tt, S.snd.mode === "box" ? .12 : .08); }
    };
    step();
  }
  function pluck(m, t, v){ const f = midiHz(m); // a bell or music-box tooth: a few inharmonic partials
    [[1, 1, 2.2], [2.01, .35, 1.2], [3.98, .12, .6], [5.4, .06, .3]].forEach(([k, a, d]) => tone("music", t, f*k, {a:.003, d, v:v*a})); }
  /* the clock's gongs, fuller than before: detuned pairs, a soft mallet, a lower body, a long tail into the hall */
  function gong(f, t, vol, long){
    if(!init()) return;
    const out = g(vol); const lp = mk("BiquadFilter"); lp.type = "lowpass"; lp.frequency.value = 5200; out.connect(lp); lp.connect(buses.chime);
    [[.5, .35, long ? 7 : 3.5], [1, 1, long ? 8 : 4.2], [2.0, .3, 2.4], [2.756, .38, 1.8], [4.07, .14, 1.0], [5.404, .1, .7]].forEach(([k, a, d]) => {
      [-3, 3].forEach(dt => { const o = mk("Oscillator"); o.frequency.value = f*k; o.detune.value = dt*(k > 1 ? 2 : 1); const e = g(0); o.connect(e); e.connect(out); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(a*.5, t + .006); e.gain.exponentialRampToValueAtTime(1e-4, t + d); o.start(t); o.stop(t + d + .05); }); });
    const src = mk("BufferSource"); src.buffer = noise.pink; const bp = mk("BiquadFilter"); bp.type = "bandpass"; bp.frequency.value = f*3; bp.Q.value = 2; const e = g(0); src.connect(bp); bp.connect(e); e.connect(out); env(e, t, .001, .25, .05); src.start(t); src.stop(t + .1);
  }
  const fx = {
    cannon(){ if(!init() || !S.snd.on) return; const t = ac.currentTime; burst("sfx", t, {buf:"brown", type:"lowpass", freq:300, a:.004, d:1.8, v:1.2, rate:.6}); burst("sfx", t, {buf:"pink", type:"lowpass", freq:2400, a:.002, d:.25, v:.7}); burst("amb", t + .35, {buf:"brown", type:"lowpass", freq:160, a:.2, d:3, v:.4, rate:.4}); },
    step(){ if(!init() || !S.snd.on) return; const t = ac.currentTime; [0, .38].forEach(dt => burst("sfx", t + dt, {buf:"brown", type:"lowpass", freq: scene.open ? 700 : 380, a:.004, d:.13, v:.5, rate:.8})); },
    door(){ if(!init() || !S.snd.on) return; const t = ac.currentTime, o = mk("Oscillator"); o.type = "sawtooth"; o.frequency.setValueAtTime(90, t); o.frequency.linearRampToValueAtTime(140 + Math.random()*60, t + .5);
      const bp = mk("BiquadFilter"); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 9; const e = g(0); o.connect(bp); bp.connect(e); e.connect(buses.sfx); env(e, t, .08, .07, .55); o.start(t); o.stop(t + .7);
      burst("sfx", t + .62, {buf:"brown", type:"lowpass", freq:220, d:.25, v:.5}); },
    page(){ if(!init() || !S.snd.on) return; const t = ac.currentTime; for(let k=0;k<3;k++) burst("sfx", t + k*.05, {freq:4200 + Math.random()*2000, q:.8, type:"highpass", d:.06 + Math.random()*.05, v:.12}); },
    take(){ if(!init() || !S.snd.on) return; const t = ac.currentTime; [2100, 3170, 4600].forEach((f, k) => tone("sfx", t, f, {a:.002, d:.25 - k*.05, v:.05})); },
    link(){ if(!init() || !S.snd.on) return; const t = ac.currentTime; // a rising rush of air, a shimmer, and quiet
      const src = mk("BufferSource"); src.buffer = noise.pink; const bp = mk("BiquadFilter"); bp.type = "bandpass"; bp.Q.value = 1.2; bp.frequency.setValueAtTime(200, t); bp.frequency.exponentialRampToValueAtTime(3800, t + 1.2); bp.frequency.exponentialRampToValueAtTime(600, t + 2.4);
      const e = g(0); src.connect(bp); bp.connect(e); e.connect(buses.sfx); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.6, t + .9); e.gain.exponentialRampToValueAtTime(1e-4, t + 2.6); src.start(t); src.stop(t + 2.7);
      [62, 69, 74, 78, 81].forEach((m, k) => tone("sfx", t + .5 + k*.08, midiHz(m), {a:.4, d:1.8, v:.04, detune: (k%2 ? 8 : -8)})); },
  };
  function levels(){ if(!ac) return; const t = ac.currentTime; master.gain.setTargetAtTime(S.snd.on ? S.snd.master : 0, t, .1); buses.amb.gain.setTargetAtTime(S.snd.amb, t, .1); buses.music.gain.setTargetAtTime(S.snd.mode === "quiet" ? 0 : S.snd.music, t, .3); buses.sfx.gain.setTargetAtTime(S.snd.sfx, t, .1); }
  return Object.assign({init, setScene, levels, gong, pluck, get ac(){ return ac; }}, fx);
})();
const audio = () => sound.init();
document.addEventListener("pointerdown", () => { if(S.snd.on) sound.init(); }, {once:true});
document.addEventListener("keydown", () => { if(S.snd.on) sound.init(); }, {once:true});
// what the room sounds like: weather, the hour, whether it's open to the sky
function soundScene(room){
  const wx = weather(), wk = wx ? wxKind(wx.weather_code) : "clear", open = room.ceiling === "open", band = lightNow(), sk = skyNow();
  const rainK = wk === "storm" ? 1 : wk === "rain" ? .7 : 0;
  sound.setScene({open, wing: room.wing === "foyer" || room.wing === "court" || room.wing === "archive" || room.wing === "garden" ? room.wing : "default", big: room.shape === "oct" || room.shape === "round",
    rainK, storm: wk === "storm", windK: wx ? Math.min(1, (wx.wind_speed_10m||0)/25) : .1,
    birds: open && sk.sun.alt > 2 && rainK === 0 && wk !== "snow", crickets: open && sk.sun.alt < -4 && rainK === 0 && (!wx || wx.temperature_2m > 55),
    clock: String(room.id) === "0"});
}
function gong(ac, f, t, vol, long){ sound.gong(f, t, vol*2.2, long); }
function musicView(o){
  if(o && o.item && !S.inv.includes(o.item)) take(o.item, "You lift the music box. It fits in the bag, and it hums a little.");
  sound.init();
  const sl = (id, label, v) => `<label class="note" style="display:flex;align-items:center;gap:10px;margin:6px 0"><span style="width:120px">${label}</span><input id="${id}" type="range" min="0" max="1" step=".05" value="${v}" style="flex:1"></label>`;
  overlay("The music box", `<div class="text"><p>A walnut box with a brass cylinder and a steel comb. Open, it plays the house's music; turned over, its little dials set how loud everything is: the rain, the wind, the birds in the court, your own footsteps, the clock.</p></div>
    <div class="row widget"><label class="note"><input type="checkbox" id="mb-on" ${S.snd.on?"checked":""}> sound in the house</label>
      <select id="mb-mode"><option value="house" ${S.snd.mode==="house"?"selected":""}>the house's own music</option><option value="box" ${S.snd.mode==="box"?"selected":""}>the music box</option><option value="quiet" ${S.snd.mode==="quiet"?"selected":""}>no music, only the house</option></select></div>
    ${sl("mb-master","everything",S.snd.master)}${sl("mb-amb","weather and rooms",S.snd.amb)}${sl("mb-music","music",S.snd.music)}${sl("mb-sfx","footsteps, doors, pages",S.snd.sfx)}
    <div class="row"><button class="btn" id="mb-clock" type="button">The clock's chimes…</button></div>
    <p class="note">The music is made as it plays, slow chords in a mode for each part of the house: Dorian in the foyer, Lydian in the court, Aeolian in the archive.</p>`);
  const upd = () => { S.snd.on = $("mb-on").checked; S.snd.mode = $("mb-mode").value; ["master","amb","music","sfx"].forEach(k => S.snd[k] = +$("mb-" + k).value); save(); sound.levels(); };
  ["mb-on","mb-mode","mb-master","mb-amb","mb-music","mb-sfx"].forEach(id => $(id).oninput = $(id).onchange = upd);
  $("mb-clock").onclick = clockView;
}
// what the clock strikes at a given moment (quarter 1–4, with the hour on the fourth)
function chimeScore(kind, d){
  const C = CHIMES[kind]; if(!C || C.silent) return [];
  const m = d.getMinutes(), qi = Math.round(m/15) % 4, hr = (d.getHours() + (m >= 53 ? 1 : 0)) % 12 || 12, notes = []; let t = 0;
  if(C.ships){ // a bell every half hour of the watch, struck in pairs
    const half = ((d.getHours()*2 + (m >= 30 ? 1 : 0)) % 8) || 8; for(let k=0;k<half;k++){ notes.push([C.bells[0], t, 1]); t += (k%2 ? 1.1 : .42); } return notes; }
  const seq = C.q[(qi + 3) % 4];   // :15 is the first quarter, :00 the fourth
  seq.forEach(change => { [...change].forEach(ch => { notes.push([C.bells[+ch-1], t, .8]); t += kind==="tingtang" ? .55 : .62; }); t += .7; });
  if(qi === 0 && C.hour){ t += 1.2; for(let k=0;k<hr;k++){ notes.push([C.hour, t, 1, true]); t += 1.7; } }
  return notes;
}
function playChime(kind, d, vol){ const ac = audio(); if(!ac) return; const t0 = ac.currentTime + .08; chimeScore(kind, d).forEach(([f, t, a, long]) => gong(ac, f, t0 + t, (vol!=null ? vol : (S.chimeVol!=null ? S.chimeVol : .5))*.35*a, long)); }
// listen for the quarters (and, for ship's bells, the half hours)
let lastQ = null;
setInterval(() => { const kind = S.chime; if(!kind || kind==="silent" || !AC) return; if(S.clock && S.clock.rate > 60) return;
  const d = now(), m = d.getMinutes(), every = kind==="ships" ? 30 : 15, key = d.getHours()*60 + Math.floor(m/every)*every;
  if(lastQ === null){ lastQ = key; return; } if(key === lastQ) return; lastQ = key;
  if(m % every > 1) return;   // only on the quarter itself
  if(S.chimeNight === false && (d.getHours() >= 22 || d.getHours() < 7)) return;
  const here = cur && String(cur.id) === "0", near = cur && (ROOMS["0"].doors||[]).some(dd => String(dd.to) === String(cur.id));
  if(S.chimeWhere === "house" || here) playChime(kind, d, (S.chimeVol!=null?S.chimeVol:.5) * (here ? 1 : near ? .5 : .25));
  else if(near) playChime(kind, d, (S.chimeVol!=null?S.chimeVol:.5) * .35);
}, 3000);
function clockView(){
  const d = now(), sel = S.chime || "silent";
  const face = () => { const t = now(), hA = ((t.getHours()%12) + t.getMinutes()/60)*30, mA = (t.getMinutes() + t.getSeconds()/60)*6;
    return `<svg viewBox="-110 -130 220 250" style="width:200px;display:block;margin:0 auto" role="img" aria-label="The carriage clock's face">
      <rect x="-92" y="-102" width="184" height="210" rx="10" fill="url(#h-light)" stroke="var(--ink)" stroke-width="3"/><path d="M-40,-102 Q0,-140 40,-102" fill="none" stroke="var(--ink)" stroke-width="5"/>
      <rect x="-80" y="-90" width="160" height="186" rx="4" fill="var(--paper)" stroke="var(--ink)"/><circle r="66" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.5"/>
      ${[...Array(60)].map((_,k)=>{ const a=k*6*DEG, r0 = k%5 ? 60 : 54; return `<line x1="${Math.sin(a)*r0}" y1="${-Math.cos(a)*r0}" x2="${Math.sin(a)*64}" y2="${-Math.cos(a)*64}" stroke="var(--ink)" stroke-width="${k%5?.6:1.6}"/>`; }).join("")}
      ${["XII","I","II","III","IIII","V","VI","VII","VIII","IX","X","XI"].map((n,k)=>{ const a=k*30*DEG; return `<text x="${Math.sin(a)*44}" y="${-Math.cos(a)*44+5}" text-anchor="middle" font-size="12" fill="var(--ink)" font-family="IM Fell English SC, serif">${n}</text>`; }).join("")}
      <line x1="0" y1="0" x2="${Math.sin(hA*DEG)*30}" y2="${-Math.cos(hA*DEG)*30}" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/>
      <line x1="0" y1="0" x2="${Math.sin(mA*DEG)*52}" y2="${-Math.cos(mA*DEG)*52}" stroke="var(--ink)" stroke-width="2.4" stroke-linecap="round"/><circle r="3.5" fill="var(--spot)" stroke="var(--ink)"/>
      <text y="86" text-anchor="middle" font-size="9" letter-spacing="2" fill="var(--muted)" font-family="IM Fell English SC, serif">HOUSE TIME</text></svg>`; };
  overlay("The carriage clock", `<div class="text"><p>A brass carriage clock with bevelled glass on every side, so you can watch the platform escapement tick. It keeps house time, so it follows the hourglass and the astrolabe. Inside are rod gongs for the chimes and a deeper one for the hours.</p></div>
    <div id="cc-face">${face()}</div>
    <div class="row widget"><select id="cc-k">${Object.entries(CHIMES).map(([k,c])=>`<option value="${k}" ${k===sel?"selected":""}>${c.name}</option>`).join("")}</select>
      <label class="note">volume <input id="cc-v" type="range" min="0" max="1" step=".05" value="${S.chimeVol!=null?S.chimeVol:.5}" style="width:110px"></label></div>
    <div class="row widget"><select id="cc-w"><option value="entry" ${S.chimeWhere!=="house"?"selected":""}>heard in the Entry, faintly next door</option><option value="house" ${S.chimeWhere==="house"?"selected":""}>heard through the whole house</option></select>
      <label class="note"><input type="checkbox" id="cc-n" ${S.chimeNight===false?"":"checked"}> chime at night</label></div>
    <div class="row"><button class="btn primary" id="cc-r" type="button">Repeat</button> <button class="btn" id="cc-1" type="button">¼</button> <button class="btn" id="cc-2" type="button">½</button> <button class="btn" id="cc-3" type="button">¾</button> <button class="btn" id="cc-4" type="button">the hour</button></div>
    <p class="note">The repeat button strikes the last hour and quarters, the way a repeater does in the dark. Westminster, Whittington, and St. Michael's chime the quarters; ting-tang marks them with two notes; ship's bells strike the half hours of each four-hour watch, in pairs, up to eight bells. Browsers let a page make sound only after you've clicked something on it, so the clock is silent until then.</p>`);
  const tick = setInterval(() => { const el = $("cc-face"); if(!el){ clearInterval(tick); return; } el.innerHTML = face(); }, 15000);
  $("cc-k").onchange = e => { S.chime = e.target.value; save(); audio(); if(S.chime !== "silent"){ const t = new Date(now()); t.setMinutes(15); playChime(S.chime, t); toast(`The clock will chime ${CHIMES[S.chime].name}.`); } else toast("The clock ticks on, silently."); award("chime", 5); };
  $("cc-v").oninput = e => { S.chimeVol = +e.target.value; save(); };
  $("cc-w").onchange = e => { S.chimeWhere = e.target.value; save(); };
  $("cc-n").onchange = e => { S.chimeNight = e.target.checked; save(); };
  $("cc-r").onclick = () => { const k = S.chime && S.chime!=="silent" ? S.chime : "westminster", t = new Date(now()); const m = t.getMinutes(); if(k==="ships"){ t.setMinutes(m >= 30 ? 30 : 0); } else { t.setMinutes(Math.floor(m/15)*15 || 0); }
    if(Math.floor(m/15) === 0 || k==="ships") playChime(k, t); else { // the hour, then the quarters since
      const h = new Date(t); h.setMinutes(0); const ac = audio(); const hs = chimeScore(k, h).filter(n => n[3]); const qs = chimeScore(k, t); const t0 = ac.currentTime + .08, v = (S.chimeVol!=null?S.chimeVol:.5)*.35;
      hs.forEach(([f,tt,a,l],i) => gong(ac, f, t0 + i*1.7, v*a, l)); const off = hs.length*1.7 + 1.2; qs.forEach(([f,tt,a,l]) => gong(ac, f, t0 + off + tt, v*a, l)); } };
  [1,2,3,4].forEach(q => $("cc-"+q).onclick = () => { const t = new Date(now()); t.setMinutes(q===4 ? 0 : q*15); playChime(S.chime && S.chime!=="silent" && S.chime!=="ships" ? S.chime : "westminster", t); });
}
/* ---------- the astrolabe: carry the house to another place, day, or weather ---------- */
const PLACES = [["Appleton, Wisconsin", 44.26, -88.41], ["Reykjavík", 64.15, -21.94], ["Tromsø, in the midnight sun", 69.65, 18.96], ["Quito, on the equator", -0.18, -78.47], ["Alexandria, after Eratosthenes", 31.2, 29.92], ["Kyoto", 35.01, 135.77], ["Sydney", -33.87, 151.21], ["the South Pole", -89.99, 0]];
function astrolabeView(){
  if(!S.inv.includes("astrolabe") && !S.showAll){ toast("You'd need the astrolabe. It hangs in the Sundial Court."); return; }
  const d = now(), pad = n => String(n).padStart(2,"0"), v = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const wxo = [["", "live, from the weather service"], ["clear","clear"], ["cloud","broken cloud"], ["overcast","overcast"], ["fog","fog"], ["rain","rain"], ["snow","snow"], ["storm","a storm"]];
  overlay("The astrolabe", `<div class="text"><p>A brass astrolabe, its rete pierced with star pointers, and set into its throne a little storm glass. Turn the rete and the house stands somewhere else under the sky; tap the glass and the weather changes its mind.</p></div>
    <div class="board">
      <div class="pin"><h3>The place</h3><p class="mono">now: ${esc(placeName())} · ${Math.abs(LAT).toFixed(2)}°${LAT>=0?"N":"S"} ${Math.abs(LON).toFixed(2)}°${LON>=0?"E":"W"}</p>
        <div class="row widget"><select id="as-p"><option value="">choose a place…</option>${PLACES.map((pl,i)=>`<option value="${i}">${esc(pl[0])}</option>`).join("")}</select></div>
        <div class="row widget"><input id="as-lat" type="number" step="0.01" min="-90" max="90" value="${LAT}" style="width:110px" aria-label="latitude"> <input id="as-lon" type="number" step="0.01" min="-180" max="180" value="${LON}" style="width:110px" aria-label="longitude"> <input id="as-n" type="text" placeholder="name (optional)" value="${S.loc&&S.loc.name?esc(S.loc.name):""}" style="width:160px"></div>
        <div class="row"><button class="btn primary" id="as-go" type="button">Stand here</button> <button class="btn" id="as-geo" type="button">Where I am</button> <button class="btn" id="as-home" type="button">Home to ${esc(HOME.name)}</button></div>
        <p class="note">Latitude north and longitude east are positive. “Where I am” asks your browser, once; nothing is sent anywhere but the weather service.</p></div>
      <div class="pin"><h3>The day and hour</h3>
        <div class="row widget"><input id="as-d" type="datetime-local" value="${v}" style="width:240px"><select id="as-r"><option value="1">runs at 1×</option><option value="60">60×</option><option value="3600">3600×</option><option value="0">stopped</option></select></div>
        <div class="row"><button class="btn primary" id="as-t" type="button">Set the clock</button> <button class="btn" id="as-tn" type="button">Real time</button></div>
        <p class="note">Times are on your own clock's zone, wherever the house stands.</p></div>
      <div class="pin"><h3>The storm glass</h3><div class="row widget"><select id="as-w">${wxo.map(([k,l])=>`<option value="${k}" ${(S.wxSet||"")===k?"selected":""}>${l}</option>`).join("")}</select></div>
        <div class="row"><button class="btn primary" id="as-clear" type="button">Clear the sky</button></div>
        <div class="row widget"><label class="note"><input type="checkbox" id="as-sun" ${skyOff("sun")?"":"checked"}> the sun</label> <label class="note"><input type="checkbox" id="as-moon" ${skyOff("moon")?"":"checked"}> the moon</label></div>
        <p class="note">Clouds dim the sun and hide the stars; under a clear sky a bright moon throws shadows of its own. Put out the sun and the court's sky goes dark, so the stars and planets show by day; put out the moon and its glare and shadows go with it.</p></div>
    </div>`);
  if(S.clock) $("as-r").value = String(S.clock.rate);
  $("as-p").onchange = e => { const pl = PLACES[+e.target.value]; if(!pl) return; $("as-lat").value = pl[1]; $("as-lon").value = pl[2]; $("as-n").value = pl[0]; };
  const go = (lat, lon, name) => { if(!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90) return toast("The rete won't turn that far.");
    lon = ((lon + 540) % 360) - 180; const home = Math.abs(lat-HOME.lat) < .005 && Math.abs(lon-HOME.lon) < .005;
    setPlace(home ? null : {lat, lon, name: name || ""}); award("astrolabe-moved", 15); closeOv(); render(); toast(home ? "Home again." : `The house stands at ${placeName()} now.`); };
  $("as-go").onclick = () => go(parseFloat($("as-lat").value), parseFloat($("as-lon").value), $("as-n").value.trim());
  $("as-home").onclick = () => { setPlace(null); closeOv(); render(); toast("Home again."); };
  $("as-geo").onclick = () => { if(!navigator.geolocation) return toast("This browser can't say where it is.");
    toast("Asking where you are…"); navigator.geolocation.getCurrentPosition(pos => go(+pos.coords.latitude.toFixed(3), +pos.coords.longitude.toFixed(3), "where you are"), () => toast("The browser wouldn't say."), {timeout:10000, maximumAge:36e5}); };
  $("as-t").onclick = () => { const t = new Date($("as-d").value); if(isNaN(t)) return; S.clock = {base:Date.now(), pal:t.getTime(), rate:+$("as-r").value}; save(); closeOv(); render(); toast("The rete turns to another hour."); };
  $("as-tn").onclick = () => { S.clock = null; save(); closeOv(); render(); toast("Back on real time."); };
  $("as-clear").onclick = () => { S.wxSet = "clear"; save(); closeOv(); render(); toast("The storm glass runs clear. So does the sky."); };
  const sw = (k, on) => { S.skyOff = Object.assign({}, S.skyOff, {[k]: !on}); save(); render(); toast(on ? `The ${k} is lit again.` : `The ${k} goes out.`); };
  $("as-sun").onchange = e => sw("sun", e.target.checked); $("as-moon").onchange = e => sw("moon", e.target.checked);
  $("as-w").onchange = e => { S.wxSet = e.target.value || null; save(); closeOv(); render(); toast(S.wxSet ? "The storm glass clouds over, and outside the sky agrees." : "The storm glass settles. The weather is the real weather again."); };
}
setInterval(() => { if(S.clock && S.clock.rate>1 && cur && !$("ov").classList.contains("open")) render(); }, 4000);
/* ---------- modes ---------- */
function modeView(){
  overlay("The porter's desk", `<div class="text"><p>The porter looks up. “How would you like to walk?”</p></div>
   <div class="modes">
    <button class="mode" data-m="guided" type="button"><b>Guided</b><span>The master key, the full plan, the finding aid, a compass, a lantern, and the hourglass. Everything opens.</span></button>
    <button class="mode" data-m="wanderer" type="button"><b>Wanderer</b><span>A map that fills in as you go, a compass, and a lantern. Puzzles open some doors. The finding aid is on the desk if you want it.</span></button>
    <button class="mode" data-m="hardcore" type="button"><b>Hardcore</b><span>Nothing. No map, no list, no key. Everything must be found or earned.</span></button>
   </div><p class="note">You can come back to the desk and change your mind. Your walk and experience are kept either way.</p>`);
  document.querySelectorAll(".mode").forEach(b => b.onclick = () => {
    const m = b.dataset.m; S.mode = m;
    const give = {guided:["map","plan","finding-aid","master-key","compass","lantern","hourglass"], wanderer:["map","compass","lantern"], hardcore:[]}[m];
    if(m!=="guided") S.inv = S.inv.filter(k => !["plan","master-key"].includes(k) || S.awards["earned:"+k]);
    give.forEach(k => { if(!S.inv.includes(k)) S.inv.push(k); });
    save(); closeOv(); render(); toast({guided:"The porter hands you a heavy ring of keys.", wanderer:"The porter hands you a folded map and a compass.", hardcore:"The porter nods, and gives you nothing at all."}[m]);
  });
}
function directoryView(){
  const links = P.links || [];
  overlay("The directory", `<p class="note">The plain way through: the rest of the site, without the walking.</p><div class="dir">${links.map(l => `<a class="dirl" href="${esc(l.href)}"><b>${esc(l.title)}</b><span>${esc(l.note||"")}</span></a>`).join("")}</div>`);
}
/* ---------- the Entry: the letter, the desk, the boards ---------- */
function walkMode(){ return S.inv.includes("master-key") ? "guided" : (S.inv.some(k => ["map","plan","compass"].includes(k)) ? "wanderer" : "hardcore"); }
const DESK_ITEMS = ["master-key","plan","map","compass","finding-aid","lantern","hourglass"];
function isoWeek(d){ const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay()||7; t.setUTCDate(t.getUTCDate()+4-day); const y0 = new Date(Date.UTC(t.getUTCFullYear(),0,1)); return [t.getUTCFullYear(), Math.ceil(((t-y0)/864e5+1)/7)]; }
function puzzleOfWeek(offset){ const L = P.puzzles||[]; if(!L.length) return null; const [y,w] = isoWeek(new Date(now().getTime() + (offset||0)*7*864e5));
  const pin = L.find(p => p.week === `${y}-W${String(w).padStart(2,"0")}`); if(pin) return pin;   // a problem pinned to this week by the archivist
  const free = L.filter(p => !p.week), pool = free.length ? free : L; return pool[((y*53 + w) % pool.length + pool.length) % pool.length]; }
function upcomingEvents(n){ const t0 = new Date(now().toDateString()).getTime(); return (P.events||[]).map(e => Object.assign({t:new Date(e.date+"T00:00").getTime()}, e)).filter(e => e.t >= t0).sort((a,b)=>a.t-b.t).slice(0, n||4); }
function officeStatus(){
  const H = P.office_hours || []; if(!H.length) return {open:false, label:"hours not yet posted"};
  const d = now(), day = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()], m = d.getHours()*60+d.getMinutes();
  const toM = s => { const [h,mm] = String(s).split(":").map(Number); return h*60+(mm||0); };
  const nowSlot = H.find(h => [].concat(h.days||h.day).includes(day) && m >= toM(h.start) && m < toM(h.end));
  if(nowSlot) return {open:true, label:`open now, until ${nowSlot.end}`};
  return {open:false, label:"closed now"};
}
function letterView(){
  const L = P.letter || "";
  overlay("A letter, left on the desk", `<div class="letter">${L.split(/\n\s*\n/).map(p=>`<p>${p.replace(/\n/g,"<br>")}</p>`).join("")}</div>
    <p class="note">This is visit ${Object.values(S.visits).reduce((a,b)=>a+b,0)} of yours to the house, by its own count.</p>`);
  award("letter", 5);
}
function registerView(){
  overlay("The guest book", `<div class="text"><p>An open book with a pen in the gutter. The last entries are in your own hand, if you've been here before${S.reader?`: <b>${esc(S.reader)}</b>`:""}.</p></div>
    <div class="row widget"><input id="gb-n" style="width:240px" placeholder="your name or initials" value="${esc(S.reader||"")}"><button class="btn primary" id="gb-b" type="button">Sign</button></div><p class="note">The name stays in this browser. The Primer will use it.</p>`);
  $("gb-b").onclick = () => { const v=$("gb-n").value.trim(); if(!v) return; S.reader=v; save(); closeOv(); award("signed", 5); toast(`Signed: ${v}.`); };
}
function returnView(){
  const back = S.inv.filter(k => DESK_ITEMS.includes(k));
  if(!back.length){ toast("You aren't carrying anything from the desk."); return; }
  S.inv = S.inv.filter(k => !DESK_ITEMS.includes(k)); save(); render();
  toast(`You put back ${back.map(k => (ITEMS[k]||{}).name || k).join(", ")}.`);
}
function noticesView(){
  const pz = puzzleOfWeek(0), last = puzzleOfWeek(-1), ev = upcomingEvents(5), news = (P.news||[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
  const d = now(), y = d.getFullYear(), mo = d.getMonth(), first = new Date(y,mo,1).getDay(), days = new Date(y,mo+1,0).getDate();
  const evDays = new Set((P.events||[]).filter(e => { const t=new Date(e.date+"T00:00"); return t.getFullYear()===y && t.getMonth()===mo; }).map(e => new Date(e.date+"T00:00").getDate()));
  let cal = `<table class="cal"><tr>${["S","M","T","W","T","F","S"].map(x=>`<th>${x}</th>`).join("")}</tr><tr>`;
  for(let i=0;i<first;i++) cal += "<td></td>";
  for(let dd=1; dd<=days; dd++){ cal += `<td class="${dd===d.getDate()?"today":""}${evDays.has(dd)?" ev":""}">${dd}</td>`; if((first+dd)%7===0) cal += "</tr><tr>"; }
  cal += "</tr></table>";
  const unw = []; P.rooms.forEach(r => { if(r.closed || r.secret) return; (r.objects||[]).forEach(o => { if(o.kind==="unwritten" && !o.hidden) unw.push({o, r}); }); });
  const wanted = unw.length ? unw[isoWeek(d)[1] % unw.length] : null;
  overlay("The notice board", `<div class="board">
    <div class="pin"><h3>Problem of the week · week ${isoWeek(d)[1]}</h3>${pz ? `<p class="text">${pz.q}</p><p class="note">${esc(pz.source||"")}</p>` : `<p class="note">No problems on file.</p>`}
      ${last ? `<details><summary class="note">Last week's problem, and its answer</summary><p>${last.q}</p><p><b>Answer.</b> ${last.a}</p></details>` : ""}</div>
    <div class="pin"><h3>${d.toLocaleString([], {month:"long", year:"numeric"})}</h3>${cal}
      ${ev.length ? `<ul class="list">${ev.map(e=>`<li><span class="mono">${esc(e.date)}${e.time?" "+esc(e.time):""}</span> ${e.href?`<a href="${esc(e.href)}">${esc(e.title)}</a>`:esc(e.title)}${e.where?` <span class="note">· ${esc(e.where)}</span>`:""}</li>`).join("")}</ul>` : `<p class="note">No events posted.</p>`}</div>
    <div class="pin"><h3>News</h3><ul class="list">${news.map(n=>`<li><span class="mono">${esc(n.date)}</span> ${n.href?`<a href="${esc(n.href)}">${esc(n.text)}</a>`:esc(n.text)}</li>`).join("") || "<li class='note'>Nothing new.</li>"}</ul></div>
    ${wanted ? `<div class="pin"><h3>Wanted</h3><p><b>${esc(wanted.o.title)}</b>: ${wanted.o.note||""}</p><p class="note">On the shelf of unwritten things in room ${esc(wanted.r.label||wanted.r.id)}, ${esc(wanted.r.name)}.</p></div>` : ""}
  </div>`);
}
/* the link board: public tiles from the data file, private tiles kept only in this browser */
const LKEY = "palace-links";
function myLinks(){ try { return JSON.parse(localStorage.getItem(LKEY)) || []; } catch(e){ return []; } }
function setMyLinks(L){ try { localStorage.setItem(LKEY, JSON.stringify(L)); } catch(e){} }
function linksView(){
  const pub = P.links || [], mine = myLinks(), pins = (S.pins||[]).filter(id => ROOMS[id]);
  const tile = (l, i, own) => `<div class="tilewrap"><a class="dirl" href="${esc(l.href)}"${/^https?:/.test(l.href)?' target="_blank" rel="noopener"':""}><b>${esc(l.title)}</b><span>${esc(l.note||l.href.replace(/^https?:\/\//,"").slice(0,40))}</span></a>${own?`<span class="tileed"><button type="button" data-up="${i}" title="Move up">↑</button><button type="button" data-del="${i}" title="Remove">×</button></span>`:""}</div>`;
  overlay("The link board", `
    ${pins.length ? `<h3 class="cat-wing">Pinned rooms</h3><div class="dir">${pins.map(id => tile({title:`${ROOMS[id].label||id} · ${ROOMS[id].name}`, href:"#"+id, note:"in the house"}, 0, false)).join("")}</div>` : ""}
    <h3 class="cat-wing">Your own tiles <span class="note">(kept only in this browser)</span></h3>
    <div class="dir" id="lb-mine">${mine.map((l,i)=>tile(l,i,true)).join("") || `<p class="note">None yet. Add your mail, calendar, course sites, anything.</p>`}</div>
    <div class="row widget"><input id="lb-t" placeholder="label" style="width:160px"><input id="lb-u" placeholder="https://…" style="width:280px"><button class="btn primary" id="lb-add" type="button">Add a tile</button></div>
    <h3 class="cat-wing">The site</h3><div class="dir">${pub.map((l,i)=>tile(l,i,false)).join("")}</div>
    <div class="row widget" style="margin-top:14px"><label class="note"><input type="checkbox" id="lb-start" ${S.startLinks?"checked":""}> open the house straight onto this board</label>
      <button class="btn" id="lb-exp" type="button">Export my tiles</button><button class="btn" id="lb-imp" type="button">Import tiles</button></div>
    <p class="note">Bookmark <span class="mono">${esc(location.origin+location.pathname)}#0/links</span> to use this as your launch page.</p>`);
  $("lb-add").onclick = () => { const t=$("lb-t").value.trim(); let u=$("lb-u").value.trim(); if(!t||!u) return; if(!/^(https?:|\/|#|mailto:)/.test(u)) u="https://"+u; const L=myLinks(); L.push({title:t, href:u}); setMyLinks(L); linksView(); };
  document.querySelectorAll("[data-del]").forEach(b => b.onclick = e => { e.preventDefault(); const L=myLinks(); L.splice(+b.dataset.del,1); setMyLinks(L); linksView(); });
  document.querySelectorAll("[data-up]").forEach(b => b.onclick = e => { e.preventDefault(); const i=+b.dataset.up; if(i<1) return; const L=myLinks(); [L[i-1],L[i]]=[L[i],L[i-1]]; setMyLinks(L); linksView(); });
  $("lb-start").onchange = e => { S.startLinks = e.target.checked; save(); };
  $("lb-exp").onclick = () => { const s = btoa(unescape(encodeURIComponent(JSON.stringify(myLinks())))); prompt("Copy this, and import it in another browser:", s); };
  $("lb-imp").onclick = () => { const s = prompt("Paste exported tiles:"); if(!s) return; try { const L = JSON.parse(decodeURIComponent(escape(atob(s.trim())))); if(Array.isArray(L)){ setMyLinks(L); linksView(); } } catch(e){ toast("That didn't read as a set of tiles."); } };
  award("links", 2);
}
/* the almanac: today's sun and moon, the planets tonight, and a short forecast */
let fcFetching = false;
function forecast(){
  if(S.fc && S.fc.at && S.fc.at !== locKey()) S.fc = null;
  const fresh = S.fc && (Date.now()-S.fc.t < 3*3600e3);
  if(!fresh && !fcFetching && !(forecast.failed && Date.now()-forecast.failed < 15*60e3)){ fcFetching = true;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=auto&forecast_days=4`)
      .then(r=>r.json()).then(j => { if(j && j.daily){ S.fc = {t:Date.now(), d:j.daily, at:locKey()}; save(); if($("ov").classList.contains("open") && $("ovt").textContent==="The almanac") almanacView(); } }).catch(()=>{ forecast.failed = Date.now(); if($("ov").classList.contains("open") && $("ovt").textContent==="The almanac") almanacView(); }).finally(()=>{ fcFetching=false; }); }
  return S.fc ? S.fc.d : null;
}
function sunTimes(){
  // scan the day for the sun crossing −0.833° (the standard horizon, refraction included)
  const d0 = new Date(now().toDateString()).getTime(), alt = t => { const jd = t/864e5 + 2440587.5, L = lst(jd), s = sunEq(jd); return altaz(s[0], s[1], L)[0]; };
  let rise=null, set=null, prev = alt(d0);
  for(let m=5; m<=1440; m+=5){ const t = d0 + m*60e3, a = alt(t), at = t - 5*60e3*(a+.833)/(a-prev); if(prev < -.833 && a >= -.833 && rise==null) rise = at; if(prev >= -.833 && a < -.833) set = at; prev = a; }
  return {rise, set};
}
function almanacView(){
  const wx = weather(), fc = forecast(), st = sunTimes(), d = now(), ph = moonPhase(d), lit = Math.round(50*(1-Math.cos(2*Math.PI*ph)));
  const t21 = new Date(d.toDateString()); t21.setHours(21); const off = (t21.getTime()-d.getTime())/36e5, sky = skyNow(off);
  const tf = t => t ? new Date(t).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}) : "—";
  const len = st.rise && st.set ? ((st.set-st.rise)/36e5) : null;
  const phaseName = ph<.03||ph>.97 ? "new" : ph<.22 ? "waxing crescent" : ph<.28 ? "first quarter" : ph<.47 ? "waxing gibbous" : ph<.53 ? "full" : ph<.72 ? "waning gibbous" : ph<.78 ? "last quarter" : "waning crescent";
  const compass = az => ["N","NE","E","SE","S","SW","W","NW"][Math.round(az/45)%8];
  overlay("The almanac", `<div class="board">
    <div class="pin"><h3>Now, in ${esc(placeName())}${wx && wx.set ? " (by the storm glass)" : ""}</h3>${wx ? `<p class="big">${wxIcon(wx.weather_code, wx.is_day)} ${Math.round(wx.temperature_2m)}°F</p><p class="mono note">humidity ${wx.relative_humidity_2m}% · wind ${Math.round(wx.wind_speed_10m)} mph · ${(wx.surface_pressure*0.02953).toFixed(2)} inHg</p>` : `<p class="note">The instruments can't reach the weather service just now.</p>`}</div>
    <div class="pin"><h3>Forecast</h3>${fc ? `<ul class="list">${fc.time.slice(0,4).map((t,i)=>`<li><span class="mono">${new Date(t+"T12:00").toLocaleDateString([], {weekday:"short"})}</span> ${wxIcon(fc.weather_code[i], 1)} ${Math.round(fc.temperature_2m_max[i])}° / ${Math.round(fc.temperature_2m_min[i])}°${fc.precipitation_probability_max?` <span class="note">· ${fc.precipitation_probability_max[i]}% chance of rain</span>`:""}</li>`).join("")}</ul>` : `<p class="note">${forecast.failed ? "The forecast can't be fetched just now." : "Fetching…"}</p>`}</div>
    <div class="pin"><h3>The sun</h3><p class="mono">rises ${tf(st.rise)} · sets ${tf(st.set)}${len?` · ${Math.floor(len)}h ${Math.round((len%1)*60)}m of daylight`:""}</p></div>
    <div class="pin"><h3>Tonight at 9</h3><p class="mono">moon ${phaseName}, ${lit}% lit${sky.moon.alt>0?`, ${sky.moon.alt.toFixed(0)}° up in the ${compass(sky.moon.az)}`:", below the horizon"}</p>
      <p class="mono">${sky.planets.filter(p=>p.alt>0).map(p=>`${p.name} ${p.alt.toFixed(0)}° ${compass(p.az)}`).join(" · ") || "no bright planets up"}</p></div>
  </div><div class="row"><button class="btn" id="al-pl" type="button">All the planets…</button></div><p class="note">Weather from Open-Meteo. Sun, moon, and planets computed here, for latitude ${LAT}° and longitude ${LON}°.</p>`);
  $("al-pl").onclick = planetsView;
}
function officeHoursView(){
  const H = P.office_hours || [], st = officeStatus(), o = P.office || {};
  overlay("Office hours", `<div class="board"><div class="pin"><h3>${st.open ? "Open" : "Closed"}</h3><p class="big">${esc(st.label)}</p>${o.where?`<p class="mono">${esc(o.where)}</p>`:""}</div>
    <div class="pin"><h3>Each week</h3>${H.length ? `<ul class="list">${H.map(h=>`<li><span class="mono">${esc([].concat(h.days||h.day).join(", "))} ${esc(h.start)}–${esc(h.end)}</span>${h.where?` · ${esc(h.where)}`:""}${h.note?` <span class="note">· ${esc(h.note)}</span>`:""}</li>`).join("")}</ul>` : `<p class="note">${esc(o.unset || "Office hours will be posted here.")}</p>`}</div>
    ${o.note?`<div class="pin"><p>${o.note}</p></div>`:""}</div>`);
}
/* type to go: rooms, things, links, warp words */
function searchView(){
  const recent = []; for(let i=S.log.length-1; i>=0 && recent.length<6; i--){ const id = S.log[i]; if(ROOMS[id] && !recent.includes(id)) recent.push(id); }
  overlay("Go to…", `<div class="row widget"><input id="sv-q" style="width:100%;font-size:18px" placeholder="a room, a device, a book, a link, a warp word" autocomplete="off"></div><div id="sv-r"></div>`);
  const items = [];
  P.rooms.forEach(r => { if(r.closed && !S.showAll) return; if(r.secret && !S.visits[r.id] && !S.showAll) return; items.push({kind:"room", title:`${r.label||r.id} · ${r.name}`, text:(r.text||"")+" "+(r.wing||""), go:()=>{ location.hash = String(r.id); }});
    (r.objects||[]).forEach(o => { if(o.hidden && !S.showAll) return; items.push({kind:o.kind||"device", title:o.title, text:(o.by||"")+" "+(o.note||""), sub:`room ${r.label||r.id}`, go:()=>{ if(o.href) location.href = o.href; else location.hash = String(r.id); }}); }); });
  (P.links||[]).concat(myLinks()).forEach(l => items.push({kind:"link", title:l.title, text:l.href, go:()=>{ location.href = l.href; }}));
  const draw = q => {
    q = (q||"").trim().toLowerCase(); let list;
    if(!q){ const pins = (S.pins||[]).filter(id=>ROOMS[id]); list = pins.map(id=>({kind:"pinned", title:`${ROOMS[id].label||id} · ${ROOMS[id].name}`, go:()=>{ location.hash=id; }})).concat(recent.map(id=>({kind:"recent", title:`${ROOMS[id].label||id} · ${ROOMS[id].name}`, go:()=>{ location.hash=id; }}))); }
    else { const w = (P.warps||{})[q.toUpperCase().replace(/\s+/g,"")]; list = (w ? [{kind:"warp", title:q.toUpperCase(), go:()=>{ S.frame=[0,0]; location.hash=String(w.room); }}] : []).concat(items.filter(it => (it.title+" "+(it.text||"")).toLowerCase().includes(q)).sort((a,b) => (a.title.toLowerCase().startsWith(q)?0:1) - (b.title.toLowerCase().startsWith(q)?0:1)).slice(0,14)); }
    $("sv-r").innerHTML = list.map((it,i)=>`<button type="button" class="doorbtn svi${i===0?" first":""}" data-i="${i}"><span class="k">${esc(it.kind)}</span> ${esc(it.title)} ${it.sub?`<span class="note">· ${esc(it.sub)}</span>`:""}</button>`).join("") || `<p class="note">Nothing by that name.</p>`;
    document.querySelectorAll(".svi").forEach(b => b.onclick = () => { closeOv(); list[+b.dataset.i].go(); });
    searchView.list = list;
  };
  $("sv-q").oninput = e => draw(e.target.value);
  $("sv-q").onkeydown = e => { if(e.key==="Enter" && searchView.list && searchView.list[0]){ closeOv(); searchView.list[0].go(); } };
  draw(""); $("sv-q").focus();
}
document.addEventListener("keydown", e => { if(e.key==="/" && !(e.target.closest && e.target.closest("input,textarea,select")) && !$("ov").classList.contains("open")){ e.preventDefault(); searchView(); } });
/* what a mounted board shows on the wall, in the engraved view */
function boardContent(o){
  if(o.action==="notices"){ const pz = puzzleOfWeek(0), ev = upcomingEvents(2); return {title:"NOTICES", lines:[`Problem of the week ${isoWeek(now())[1]}:`, ...(pz ? wrapText(pz.q.replace(/<[^>]+>/g,""), 44).slice(0,5) : ["(none on file)"]), "", ev.length ? "Next: "+ev[0].date+" "+ev[0].title : "No events posted.", "", ...((P.news||[]).slice(-2).map(n => "· "+n.text))]}; }
  if(o.action==="links"){ return {title:"LINKS", tiles:(P.links||[]).map(l=>l.title).concat(myLinks().map(l=>l.title)).slice(0,16)}; }
  if(o.action==="officehours"){ const st = officeStatus(); return {title:"OFFICE HOURS", lines:[st.label.toUpperCase(), "", ...(P.office_hours||[]).map(h => `${[].concat(h.days||h.day).join(", ")}  ${h.start}–${h.end}`)]}; }
  if(o.action==="almanac"){ const wx=weather(), st=sunTimes(); const tf=t=>t?new Date(t).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}):"—"; return {title:"ALMANAC", lines:[wx?`${Math.round(wx.temperature_2m)}°F  ${(wx.surface_pressure*0.02953).toFixed(2)} in`:"· · ·", `sunrise ${tf(st.rise)}`, `sunset ${tf(st.set)}`]}; }
  return {title:o.title.toUpperCase(), lines:[]};
}
function wrapText(s, n){ const out=[]; let line=""; s.split(/\s+/).forEach(w => { if((line+" "+w).trim().length > n){ out.push(line); line=w; } else line=(line+" "+w).trim(); }); if(line) out.push(line); return out; }

/* ---------- save codes and warp codes ---------- */
const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ITEM_ORDER = ["map","plan","finding-aid","master-key","golden-key","compass","lantern","hourglass","primer","page-left","page-right","mended-page","astrolabe","musicbox"];
const SOLVED_ORDER = ["galois","island","mended"];
function roomOrder(){ return P.rooms.map(r => String(r.id)); }
function crc8(bytes){ let c=0; bytes.forEach(b => { c ^= b; for(let k=0;k<8;k++) c = (c&0x80) ? ((c<<1)^0x07)&255 : (c<<1)&255; }); return c; }
function saveCode(){
  const ro = roomOrder(), bytes = [1, ["wanderer","guided","hardcore"].indexOf(walkMode()) & 3, (S.xp>>8)&255, S.xp&255];
  const bits = (list, has) => { const out=[]; for(let i=0;i<list.length;i+=8){ let b=0; for(let j=0;j<8 && i+j<list.length;j++) if(has(list[i+j])) b|=1<<j; out.push(b); } return out; };
  bytes.push(...bits(ro, id => !!S.visits[id]));
  bytes.push(...bits(ITEM_ORDER, k => S.inv.includes(k)));
  bytes.push(...bits(SOLVED_ORDER, k => !!S.solved[k]));
  bytes.push(((S.sheets.log||0)+128)&255, (S.sheets.sqrt||0)&255, (S.frame[0]|(S.frame[1]<<2))&255);
  bytes.push(crc8(bytes));
  let acc=0, n=0, s="";
  bytes.forEach(b => { acc=(acc<<8)|b; n+=8; while(n>=5){ s+=B32[(acc>>(n-5))&31]; n-=5; } acc &= (1<<n)-1; });
  if(n>0) s+=B32[(acc<<(5-n))&31];
  return s.match(/.{1,4}/g).join("-");
}
function loadCode(code){
  const clean = code.toUpperCase().replace(/[^0-9A-Z]/g,"").replace(/O/g,"0").replace(/[IL]/g,"1");
  let acc=0, n=0; const bytes=[];
  for(const ch of clean){ const v = B32.indexOf(ch); if(v<0) return false; acc=(acc<<5)|v; n+=5; if(n>=8){ bytes.push((acc>>(n-8))&255); n-=8; acc &= (1<<n)-1; } }
  if(bytes.length<6 || bytes[0]!==1) return false;
  // codes written before the house grew name fewer rooms; try today's count, then the counts of earlier plans
  const nb = l => Math.ceil(l/8), all = roomOrder(); let ro = null, need = 0;
  for(const nr of [all.length, 36]){ const nd = 4 + nb(nr) + nb(ITEM_ORDER.length) + nb(SOLVED_ORDER.length) + 3; if(bytes.length >= nd+1 && crc8(bytes.slice(0,nd)) === bytes[nd]){ ro = all.slice(0, nr); need = nd; break; } }
  if(!ro) return false;
  let p=4; const rd = (list, f) => { for(let i=0;i<list.length;i++){ if(bytes[p+(i>>3)] & (1<<(i&7))) f(list[i]); } p += nb(list.length); };
  S.mode = ["wanderer","guided","hardcore"][bytes[1]&3]; S.xp = (bytes[2]<<8)|bytes[3];
  const visits = {}; rd(ro, id => visits[id] = Math.max(1, S.visits[id]||0)); S.visits = Object.assign(visits, {});
  S.inv = []; rd(ITEM_ORDER, k => S.inv.push(k)); rd(SOLVED_ORDER, k => S.solved[k]=1);
  S.sheets.log = bytes[p]-128; S.sheets.sqrt = bytes[p+1]; S.frame = [bytes[p+2]&3, (bytes[p+2]>>2)&1];
  Object.keys(S.visits).forEach(id => S.awards["room:"+id]=1);
  save(); return true;
}
function codesView(){
  const code = saveCode();
  overlay("Codes", `<div class="text"><p>Your save code records the rooms you remember, what you carry, the puzzles you've solved, your experience, and how the house has turned you. Write it down, or type it into another browser to carry on there.</p></div>
    <p class="savecode">${code}</p><div class="row"><button class="btn" id="cd-copy" type="button">Copy</button></div>
    <div class="row widget"><input id="cd-in" style="width:280px" placeholder="a save code or a warp word"><button class="btn primary" id="cd-go" type="button">Enter</button></div><p class="note" id="cd-o">Warp words take you straight to a place. Some are printed in books; some are scratched on walls.</p>`);
  $("cd-copy").onclick = () => { try { navigator.clipboard.writeText(code); toast("Copied."); } catch(e) {} };
  const go = () => { const v = $("cd-in").value.trim(); if(!v) return; const w = (P.warps||{})[v.toUpperCase().replace(/\s+/g,"")];
    if(w){ closeOv(); if(w.time){ const t=new Date(w.time); if(!isNaN(t)) S.clock={base:Date.now(), pal:t.getTime(), rate:1}; } award("warp:"+v.toUpperCase(), 5); S.frame=[0,0]; save(); location.hash = String(w.room) + (w.face?"/"+w.face:""); toast(w.say || "The floor tilts, and you are elsewhere."); return; }
    if(loadCode(v)){ closeOv(); render(); toast("The house remembers you."); return; }
    $("cd-o").textContent = "Nothing happens. Check the code, letter by letter."; };
  $("cd-go").onclick = go; $("cd-in").onkeydown = e => { if(e.key==="Enter") go(); };
}
/* ---------- annotations ---------- */
function annotations(room){
  const on = !!S.annot; $("annwin").style.display = on ? "" : "none"; $("b-ann").textContent = on ? "Annotations ✓" : "Annotations";
  if(!on) return;
  const tab = S.annotTab || "marginalia", items = room[tab] || [];
  document.querySelectorAll(".tab").forEach(b => { b.setAttribute("aria-selected", b.dataset.tab===tab ? "true" : "false"); const n=(room[b.dataset.tab]||[]).length; b.textContent = {marginalia:"Marginalia",sources:"Sources",bib:"Bibliography"}[b.dataset.tab] + (n?` (${n})`:""); });
  $("annb").className = "ann" + (tab==="marginalia" ? " marg" : "");
  $("annb").innerHTML = items.length ? (tab==="bib" ? "<ol>" : "<ul>") + items.map(t=>`<li>${t}</li>`).join("") + (tab==="bib" ? "</ol>" : "</ul>") : `<p class="empty">Nothing in this margin yet.</p>`;
}
document.querySelectorAll(".tab").forEach(b => b.onclick = () => { S.annotTab = b.dataset.tab; save(); annotations(effective(cur)); });

/* ---------- movement: rooms, facings, close-ups ---------- */
let planned = null;
const viewHash = (id, face, close) => "#" + id + (face||close ? "/" + FACES[face||0] : "") + (close ? "/" + close : "");
function setView(face, close){ S.face = ((face%4)+4)%4; S.close = close || null; save(); planned = "view"; const h = viewHash(cur.id, S.face, S.close); if(location.hash===h) render(); else location.hash = h; }
function turn(k){ setView(S.face + k, null); }
const RENO_NOTE = () => (P.renovation && P.renovation.note) || "Closed for renovation. The house is being rebuilt a few rooms at a time; this one will open again when it's ready. — W. K.";
function tryDoor(d, room){
  if(reno(d)){ toast("A note is pinned to the boards: " + RENO_NOTE()); return; }
  if(!open(d, room)){
    if(d.riddle && !S.solved[d.riddle.id] && cond(d.needs, room)) return riddle(d, room);
    toast(d.hint || "The door will not open. Not yet, anyway."); return;
  }
  const t = target(d, room);
  if(!ROOMS[t]){ toast("This door opens onto a wall. (Room "+t+" isn't built yet.)"); return; }
  if(d.say) toast(d.say);
  sound.door();
  if(d.lift) liftSheets(d.lift);
  move(t, d.turn, room);
}
function liftSheets(lift){
  Object.keys(lift).forEach(k => { const spec = (P.sheets||{})[k] || {}; let v = (S.sheets[k]||0) + (+lift[k]);
    if(spec.mod) v = ((v % spec.mod) + spec.mod) % spec.mod; S.sheets[k] = v;
    if(v!==0) award("sheet:"+k+":"+v, 25, `${spec.name||k}: sheet ${v}`); });
}
function move(t, turnG, from){
  S.frame = mul(S.frame, parseG(turnG));
  if(from){ const k = from.id+">"+t; S.edges[k] = 1; }
  S.steps++; S.face = 0; S.close = null;
  planned = t;
  if(location.hash === "#"+t) arrive(t); else location.hash = t;
}
function arrive(id){
  if(!ROOMS[id]) id = START;
  cur = ROOMS[id];
  if(id===START) S.walk = [];
  S.walk.push(id);
  S.visits[id] = (S.visits[id]||0)+1;
  S.log.push(id); if(S.log.length>2000) S.log = S.log.slice(-2000);
  S.frames[id] = S.frame.slice();
  award("room:"+id, ROOMS[id].secret ? 30 : 10);
  keepShot(id); sound.step();
  save(); randomPick = {};
  render();
  if(id===START && S.visits[id]===1) setTimeout(letterView, 500);
}
function route(){
  const h = decodeURIComponent(location.hash.slice(1));
  if(h==="curator"){ S.curator=true; save(); history.replaceState(null,"","#"+(cur?cur.id:START)); if(!cur) arrive(START); curatorView(); return; }
  if(h.endsWith("/links") || (!h && S.startLinks)){ const rid0 = h.split("/")[0] || START; history.replaceState(null,"","#"+rid0); if(!cur || String(cur.id)!==rid0){ S.frame=[0,0]; arrive(rid0); } setTimeout(linksView, 200); return; }
  const [rid, f, c] = (h || START).split("/"), id = rid || START, face = Math.max(0, FACES.indexOf(f||"n")), close = c || null;
  if(planned==="view" || (cur && String(cur.id)===id)){ planned = null; S.face = face; S.close = close; save(); render(); return; }
  if(planned === id){ planned = null; arrive(id); return; }
  planned = null;
  S.frame = (S.frames[id] || [0,0]).slice(); S.face = face; S.close = close;
  arrive(id);
}
window.addEventListener("hashchange", route);
document.addEventListener("keydown", e => {
  if(e.target.closest && e.target.closest("input,select,textarea")) return;
  if($("ov").classList.contains("open")) return;
  if(e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  // look up and down: shift with the arrows, or page up and page down
  if((e.shiftKey && k==="ArrowUp") || k==="PageUp"){ e.preventDefault(); setView(S.face, S.close==="down" ? null : "up"); return; }
  if((e.shiftKey && k==="ArrowDown") || k==="PageDown"){ e.preventDefault(); setView(S.face, S.close==="up" ? null : "down"); return; }
  if(k==="f"){ e.preventDefault(); fullView(); return; }
  if(k==="ArrowLeft" || k==="a"){ e.preventDefault(); turn(-1); }
  else if(k==="ArrowRight" || k==="d"){ e.preventDefault(); turn(1); }
  else if(k==="ArrowDown" || k==="s"){ e.preventDefault(); if(S.close) setView(S.face,null); else turn(2); }
  else if(k==="ArrowUp" || k==="w"){ e.preventDefault(); const room=effective(cur); const ds=(room.doors||[]).filter(d=>visible(d,room)); const d=ds.find((d,i)=>pos(d.wall!=null?WALLS[d.wall]:[1,0,2][i%3])===1); if(d) tryDoor(d, room); }
});

/* ---------- riddles ---------- */
function riddle(d, room){
  const r = d.riddle;
  overlay("A question at the door", `<p class="text">${r.q}</p><div class="widget row"><input id="ra" autocomplete="off"> <button class="btn primary" id="rb" type="button">Answer</button></div><p class="note" id="rn"></p>`);
  const go = () => {
    const a = $("ra").value.trim().toLowerCase().replace(/\s+/g," ");
    const ok = [].concat(r.a).map(x=>String(x).toLowerCase()).includes(a);
    if(ok){ S.solved[r.id]=1; save(); closeOv(); award("riddle:"+r.id, 50); toast(r.yes || "The door unlatches."); render(); }
    else $("rn").textContent = r.no || "Nothing happens.";
  };
  $("rb").onclick = go; $("ra").onkeydown = e => { if(e.key==="Enter") go(); }; $("ra").focus();
}

/* ---------- overlays ---------- */
function overlay(title, html){ if(typeof sound !== "undefined" && sound.ac) sound.page(); $("ovt").textContent=title; $("ovb").innerHTML=html; $("ov").classList.add("open"); }
function closeOv(){ $("ov").classList.remove("open"); }
$("ovx").onclick = closeOv; $("ov").onclick = e => { if(e.target.id==="ov") closeOv(); };
document.addEventListener("keydown", e => { if(e.key==="Escape") closeOv(); });

function mapView(force){
  if(!force && !S.showAll && !S.inv.includes("map") && !S.inv.includes("plan")){ toast("You have no map. The porter at the Entry keeps them."); return; }
  const all = S.showAll || S.inv.includes("plan");
  const known = new Set(Object.keys(S.visits).filter(k=>ROOMS[k]));
  const fringe = new Set();
  known.forEach(k => (ROOMS[k].doors||[]).forEach(d => allTargets(d).forEach(t => { if(ROOMS[t] && !known.has(t)) fringe.add(t); })));
  const pts = P.rooms.filter(r=>r.at);
  if(!pts.length){ overlay("Map","<p class='note'>No room has map coordinates yet.</p>"); return; }
  const xs = pts.map(r=>r.at[0]), ys = pts.map(r=>r.at[1]);
  const u=64, x0=Math.min(...xs)-1, y0=Math.min(...ys)-1, w=(Math.max(...xs)-x0+1)*u, h=(Math.max(...ys)-y0+1)*u;
  const px = r => [(r.at[0]-x0)*u, (r.at[1]-y0)*u];
  let s = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;max-height:70vh" role="img" aria-label="Map of the rooms you remember">`;
  const drawn = new Set();
  P.rooms.forEach(r => (r.doors||[]).forEach(d => allTargets(d).forEach(t => {
    const T2 = ROOMS[t]; if(!r.at || !T2 || !T2.at) return; if(!S.showAll && [r,T2].some(x => x.closed || (x.secret && !S.visits[x.id]))) return;
    const k=[r.id,t].sort().join("~"); if(drawn.has(k)) return;
    const walked = S.edges[r.id+">"+t] || S.edges[t+">"+r.id];
    const show = all || walked || (known.has(String(r.id)) && (known.has(t)||fringe.has(t)));
    if(!show) return; drawn.add(k);
    const a=px(r), b=px(T2);
    s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="var(--ink)" stroke-width="${walked?3:1}" ${walked?"":'stroke-dasharray="2 4"'}/>`;
  })));
  P.rooms.forEach(r => {
    if(!r.at) return; const id=String(r.id), k=known.has(id), f=fringe.has(id);
    if(!(all||k||f) || (!S.showAll && (r.closed || (r.secret && !k)))) return;
    const [x,y]=px(r), c = (WINGS[r.wing]&&WINGS[r.wing].color)||"#A77E22", here = cur && String(cur.id)===id;
    s += `<g ${k||all?`class="mapgo" data-id="${id}" style="cursor:pointer"`:""}><rect x="${x-17}" y="${y-15}" width="34" height="30" fill="${here?"var(--spot)":k||all?"var(--ink)":"var(--paper2)"}" stroke="var(--ink)" stroke-width="2" ${f&&!k&&!all?'stroke-dasharray="3 3"':""}/>${here?`<rect x="${x-21}" y="${y-19}" width="42" height="38" fill="none" stroke="var(--ink)" stroke-width="1.5"/>`:""}
      <text x="${x}" y="${y+5}" text-anchor="middle" font-family="IM Fell English SC, serif" font-size="17" fill="${k||all?"var(--paper2)":"var(--muted)"}">${k||all?esc(r.label||id):"?"}</text>
      ${k||all?`<text x="${x}" y="${y+31}" text-anchor="middle" font-family="Pixelify Sans, monospace" font-size="10" fill="var(--ink)">${esc((r.name||"").replace(/^The /,"").slice(0,16))}</text>`:""}</g>`;
  });
  s += `</svg><p class="note">Heavy lines are corridors you have walked. Dotted boxes are doors you have seen but not opened. Click a remembered room to return to it the way you first remember it, facing as you did then.</p>`;
  overlay("The map, as far as you remember it", s);
  document.querySelectorAll(".mapgo").forEach(el => el.addEventListener("click", () => { closeOv(); location.hash = el.dataset.id; }));
}
function catalogueView(force){
  if(!force && !S.showAll && !S.inv.includes("finding-aid")){ toast("The finding aid is kept at the porter\u2019s desk."); return; }
  let items = [];
  P.rooms.forEach(r => { if(r.closed && !S.showAll) return; (r.objects||[]).forEach(o => { if(o.kind!=="key" && !o.hide && (!o.hidden || S.showAll)) items.push({o, r}); }); });
  const wingOrder = Object.keys(WINGS);
  const draw = q => {
    q = (q||"").toLowerCase();
    let h = "";
    wingOrder.concat(["_"]).forEach(wk => {
      const its = items.filter(({o,r}) => (wingOrder.includes(r.wing)? r.wing : "_")===wk && (!q || (o.title+" "+(o.by||"")+" "+(o.note||"")+" "+(o.kind||"")).toLowerCase().includes(q)));
      if(!its.length) return;
      h += `<div class="cat-wing">${esc(wk==="_"?"Elsewhere":WINGS[wk].name)}</div>`;
      its.forEach(({o,r}) => { h += `<div class="cat-item"><span class="t">${o.href?`<a href="${esc(o.href)}">${esc(o.title)}</a>`:esc(o.title)}${o.by?` <span class="note">· ${esc(o.by)}</span>`:""}</span><span class="m">${esc(o.kind||"device")} · <a href="#${r.id}" data-cat="1">room ${esc(r.label||r.id)}</a></span></div>`; });
    });
    $("catl").innerHTML = h || "<p class='note'>Nothing matches.</p>";
    document.querySelectorAll("[data-cat]").forEach(a => a.onclick = closeOv);
  };
  overlay("Catalogue", `<p class="note">Everything on the shelves, without the walking. Room numbers lead into the house.</p><div class="widget row"><input id="catq" placeholder="search" style="width:260px"></div><div id="catl"></div>`);
  $("catq").oninput = e => draw(e.target.value); draw("");
}
function helpView(){
  overlay("How to walk the house", `<div class="text">${P.help || ""}
  <p><b>Looking.</b> Drag anywhere in the picture to look around, up at the sky or down at the floor; let go past half a quarter turn and you'll face that way. The edges of the picture turn you, and the top and bottom look up and down. Keys: ← → or A D turn, ↑ or W goes through the door ahead, ↓ or S turns around or steps back, Shift with ↑ ↓ (or Page Up, Page Down) looks up and down, and F fills the screen. Press / to go anywhere.</p>
  <p><b>Doors</b> are numbered. Click a door in the picture or in the list. Some doors appear only at certain hours, after certain rooms, or when you are facing a certain way.</p>
  <p><b>Facing.</b> Some corridors turn you, and some flip you as in a mirror. The small F in the top bar shows your frame, an element of the symmetry group of a square. Walk a loop and you may come back turned: that is holonomy. Some things can only be seen in a mirror.</p>
  <p><b>Time.</b> The house keeps your local time. Light changes through the day, and a few rooms change with the hour or the moon. The Lamps button overrides the light.</p>
  <p><b>Rank.</b> The more rooms you remember, the higher your librarian's rank. Some stacks are closed to beginners.</p>
  <p><b>Memory.</b> The map remembers where you have been, in this browser only. The catalogue lists everything plainly.</p></div>
  <div class="row widget"><button class="btn" id="forget" type="button">Forget my walk</button></div>`);
  $("forget").onclick = () => { const c=S.curator; S = blank(); S.curator=c; save(); closeOv(); location.hash = START; route(); toast("The house forgets you, politely."); };
}

/* ---------- curator ---------- */
function curatorView(){
  const ids = Object.keys(ROOMS), errs = [], warn = [];
  P.rooms.forEach(r => {
    if(!r.at) warn.push(`Room ${r.id} has no map position (at: [x, y]).`);
    if(!WINGS[r.wing]) warn.push(`Room ${r.id} names wing "${r.wing}", which isn't in wings.`);
    (r.doors||[]).forEach(d => {
      allTargets(d).forEach(t => { if(!ROOMS[t]) errs.push(`Room ${r.id}: door to ${t}, which doesn't exist.`);
        else if(d.oneway) {}
        else if(!(ROOMS[t].doors||[]).some(b => allTargets(b).includes(String(r.id)))) warn.push(`Room ${r.id} → ${t} is one-way (no door back).`);
        else { const back = (ROOMS[t].doors||[]).find(b => allTargets(b).includes(String(r.id)));
          if(back && !d.twist && !back.twist && nameG(mul(parseG(d.turn), parseG(back.turn)))!=="e") warn.push(`Doors ${r.id} → ${t} → ${r.id} don't undo each other (turns ${d.turn||"e"} then ${back.turn||"e"}). Walking there and back leaves you turned.`); } });
      if(d.wall && WALLS[d.wall]==null) errs.push(`Room ${r.id}: unknown wall "${d.wall}".`);
    });
    (r.objects||[]).forEach(o => { if(!o.title) errs.push(`Room ${r.id}: an object has no title.`); });
  });
  // reachability and holonomy: spanning tree from START
  const fr = {[START]:[0,0]}, queue=[START], tree = new Set();
  while(queue.length){ const u=queue.shift(); (ROOMS[u].doors||[]).forEach(d => allTargets(d).forEach(t => { if(ROOMS[t] && !fr[t]){ fr[t]=mul(fr[u],parseG(d.turn)); tree.add(u+">"+t); queue.push(t); } })); }
  ids.forEach(i => { if(!fr[i]) errs.push(`Room ${i} can't be reached from the start through doors.`); });
  const hol = [], holSeen = new Set();
  P.rooms.forEach(r => (r.doors||[]).forEach(d => allTargets(d).forEach(t => {
    const u=String(r.id); if(!fr[u]||!fr[t]||tree.has(u+">"+t)) return;
    const h = mul(mul(fr[u], parseG(d.turn)), inv(fr[t]));
    const key=[u,t].sort().join("~"); if(!isE(h) && !holSeen.has(key)){ holSeen.add(key); hol.push([u,t,nameG(h)]); }
  })));
  // shortest paths
  const dist = bfs(START);
  const rows = P.rooms.map(r => `<tr><td><a href="#${r.id}" data-cur="1">${esc(r.label||r.id)}</a></td><td>${esc(r.name||"")}</td><td>${esc(r.wing||"")}</td><td>${dist[r.id]??"—"}</td><td>${fr[r.id]?nameG(fr[r.id]):"—"}</td><td>${S.visits[r.id]||0}</td></tr>`).join("");
  overlay("Curator's office", `
    <p class="note">This view checks the data file and shows you the house as the builder sees it. Visitors never see it unless they type #curator.</p>
    <div class="row widget">
      <button class="btn ${S.showAll?"primary":""}" id="c-all" type="button">${S.showAll?"Showing all doors and objects":"Show all doors and objects"}</button>
      <button class="btn" id="c-forget" type="button">Forget my walk</button>
      <button class="btn" id="c-e" type="button">Reset my frame to e</button>
      <button class="btn" id="c-exit" type="button">Leave curator mode</button>
    </div>
    <p class="note">To test the clock, add <span class="mono">?hour=22</span> or <span class="mono">?date=2026-12-25</span> before the # in the address.</p>
    <h3 class="cat-wing">Problems (${errs.length})</h3>${errs.length? "<ul>"+errs.map(e=>`<li class="warn">${esc(e)}</li>`).join("")+"</ul>" : "<p class='ok'>None. Every door leads somewhere and every room is reachable.</p>"}
    <h3 class="cat-wing">Notes (${warn.length})</h3>${warn.length? "<ul>"+warn.map(e=>`<li class="note">${esc(e)}</li>`).join("")+"</ul>" : "<p class='note'>None.</p>"}
    <h3 class="cat-wing">Holonomy (${hol.length} twisted loop${hol.length===1?"":"s"})</h3>
    <p class="note">Each line is a loop: walk from the Foyer to the first room by the shortest tree path, take the door to the second, and walk the tree path back. The element is how the loop leaves you turned.</p>
    ${hol.length? "<ul>"+hol.map(h=>`<li class="mono">loop through ${h[0]} → ${h[1]}: ${h[2]}</li>`).join("")+"</ul>" : "<p class='note'>Every loop closes up flat. Nothing in the house is twisted.</p>"}
    <h3 class="cat-wing">Rooms</h3>
    <table class="cur"><tr><th>#</th><th>name</th><th>wing</th><th>steps from start</th><th>tree frame</th><th>your visits</th></tr>${rows}</table>`);
  $("c-all").onclick = () => { S.showAll=!S.showAll; save(); render(); curatorView(); };
  $("c-forget").onclick = () => { S = Object.assign(blank(), {curator:true}); save(); closeOv(); location.hash=START; route(); };
  $("c-e").onclick = () => { S.frame=[0,0]; save(); render(); toast("Frame reset to e."); };
  $("c-exit").onclick = () => { S.curator=false; S.showAll=false; save(); closeOv(); render(); };
  document.querySelectorAll("[data-cur]").forEach(a => a.onclick = closeOv);
}
function bfs(src){
  const dist = {[src]:0}, q=[src];
  while(q.length){ const u=q.shift(); (ROOMS[u].doors||[]).forEach(d => allTargets(d).forEach(t => { if(ROOMS[t] && dist[t]==null){ dist[t]=dist[u]+1; q.push(t); } })); }
  return dist;
}

/* ---------- widgets ---------- */
let timers = [];
function stopTimers(){ timers.forEach(clearInterval); timers = []; }
const WIDGETS = {};
WIDGETS.pendulum = (el, spec) => {
  const lat = spec.latitude || LAT, s = Math.sin(lat*Math.PI/180);
  const rate = 360*s/23.9345; // degrees per hour, relative to the floor
  const t0 = now().getTime();
  el.innerHTML = `<div class="panel"><h3>The pendulum, from above</h3>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
    <svg viewBox="-110 -110 220 220" width="220" height="220" aria-label="Top view of the swing plane"><circle r="100" fill="none" stroke="var(--line)"/>${Array.from({length:36},(_,i)=>{const a=i*10*Math.PI/180;return `<line x1="${95*Math.cos(a)}" y1="${95*Math.sin(a)}" x2="${(i%9?100:88)*Math.cos(a)}" y2="${(i%9?100:88)*Math.sin(a)}" stroke="var(--muted)"/>`;}).join("")}
    <text x="0" y="-80" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="IM Fell English SC, serif">N</text>
    <line id="pl" x1="-90" y1="0" x2="90" y2="0" stroke="var(--accent)" stroke-width="3"/><line id="pl0" x1="-90" y1="0" x2="90" y2="0" stroke="var(--brass)" stroke-dasharray="3 5"/><circle r="4" fill="var(--ink)"/></svg>
    <div class="mono" style="font-size:14px;line-height:1.7">latitude ${lat.toFixed(2)}° N<br>turns ${rate.toFixed(2)}° per hour (clockwise)<br>one full turn every ${(360/rate).toFixed(1)} hours<br><span id="pt"></span></div></div>
    <p class="note">The dashed line is where the plane pointed when you walked in. The red line is where it points now. Stay a while.</p></div>`;
  const tick = () => {
    const tn = now().getTime(), hrs = tn/36e5, ang = (hrs*rate) % 180, since = (tn-t0)/36e5*rate;
    const a0 = ((t0/36e5*rate) % 180) * Math.PI/180, a = ang*Math.PI/180;
    $("pl").setAttribute("x1",-90*Math.cos(a)); $("pl").setAttribute("y1",-90*Math.sin(a)); $("pl").setAttribute("x2",90*Math.cos(a)); $("pl").setAttribute("y2",90*Math.sin(a));
    $("pl0").setAttribute("x1",-90*Math.cos(a0)); $("pl0").setAttribute("y1",-90*Math.sin(a0)); $("pl0").setAttribute("x2",90*Math.cos(a0)); $("pl0").setAttribute("y2",90*Math.sin(a0));
    $("pt").textContent = `since you came in: ${since.toFixed(4)}°`;
  };
  tick(); timers.push(setInterval(tick, 1000));
};
WIDGETS.funes = (el, spec) => {
  const names = spec.names || [];
  const path = S.log.slice(-60);
  el.innerHTML = `<div class="panel"><h3>The wall of names</h3><ul class="list">${names.map(n=>`<li><span class="mono" style="color:var(--brass)">${esc(n.n ?? "?")}</span> &nbsp;${esc(n.name)}</li>`).join("")}</ul>
    <h3 style="margin-top:14px">Name a number, the way Funes did</h3>
    <div class="row"><input id="fn-n" inputmode="numeric" placeholder="a number"><input id="fn-w" placeholder="its name" style="width:200px"><button class="btn primary" id="fn-b" type="button">Remember it</button></div>
    <div class="row"><button class="btn" id="fn-q" type="button">Quiz me on my names</button><span id="fn-r" class="note"></span></div>
    <div id="fn-l" class="note"></div>
    <h3 style="margin-top:14px">What the room remembers of you</h3><p class="mono" style="font-size:13px;line-height:1.6;word-break:break-word">${path.length? path.join(" → ") : "Nothing yet."}${S.log.length>60? ` <span class="note">(and ${S.log.length-60} steps before that)</span>`:""}</p>
    <p class="note">${S.log.length} steps, ${seen()} rooms. Funes would hold all of it, and could add none of it.</p></div>`;
  const list = () => { $("fn-l").innerHTML = S.named.length ? "Your names: " + S.named.map(x=>`<span class="mono">${esc(x.n)}</span> = ${esc(x.w)}`).join(" · ") : "You haven't named any numbers yet."; };
  list();
  $("fn-b").onclick = () => { const n=$("fn-n").value.trim(), w=$("fn-w").value.trim(); if(!n||!w) return;
    S.named = S.named.filter(x=>x.n!==n); S.named.push({n,w}); save(); $("fn-n").value=$("fn-w").value=""; list();
    toast(S.named.length>=2 ? `Now add ${S.named[0].w} and ${S.named[1].w}, in your system.` : "Remembered. It has no digits, so it has no neighbors."); };
  $("fn-q").onclick = () => { if(!S.named.length){ $("fn-r").textContent="Name something first."; return; }
    const x = S.named[Math.floor(Math.random()*S.named.length)];
    $("fn-r").innerHTML = `What did you call <b class="mono">${esc(x.n)}</b>? <input id="fn-a" style="width:160px"> <button class="btn" id="fn-c" type="button">Check</button>`;
    $("fn-c").onclick = () => { $("fn-r").innerHTML = $("fn-a").value.trim().toLowerCase()===x.w.toLowerCase() ? `<span class="ok">Yes: ${esc(x.w)}.</span>` : `<span class="warn">No. You called it ${esc(x.w)}. Funes would not have needed to ask.</span>`; }; };
};
WIDGETS.euclid = (el, spec, room) => {
  const phi = (1+Math.sqrt(5))/2;
  el.innerHTML = `<div class="panel"><h3>Euclid's corridor</h3>
    <div class="row"><label class="mono">a <input id="eu-a" type="number" min="1" value="${spec.a||89}"></label><label class="mono">b <input id="eu-b" type="number" min="1" value="${spec.b||34}"></label>
    <button class="btn primary" id="eu-go" type="button">Walk it</button><button class="btn" id="eu-f" type="button">Fibonacci pair</button><button class="btn" id="eu-r" type="button">Random pair</button></div>
    <svg id="eu-s" viewBox="0 0 640 260" style="width:100%;height:auto;border:1px solid var(--line);border-radius:6px;background:var(--paper)"></svg>
    <div id="eu-t" class="mono" style="font-size:14px;line-height:1.6;margin-top:8px"></div></div>`;
  const fib = [1,1]; while(fib.length<40) fib.push(fib[fib.length-1]+fib[fib.length-2]);
  const go = () => {
    let a = Math.floor(+$("eu-a").value), b = Math.floor(+$("eu-b").value);
    if(!(a>0&&b>0)) return; if(a<b) [a,b]=[b,a];
    if(a>1e12){ a=1e12; }
    const steps=[]; let x=a, y=b; while(y>0){ const q=Math.floor(x/y), r=x-q*y; steps.push([x,q,y,r]); x=y; y=r; }
    const n = steps.length, bound = Math.log(b)/Math.log(phi)+1, digits = String(b).length;
    // draw the squares
    const svg=$("eu-s"); svg.innerHTML=""; const sc = Math.min(620/a, 240/b); let X=10, Y=10, w=a, h=b, horiz=true;
    const cols=["url(#h-light)","url(#h-mid)","url(#x-light)","url(#h-rev)","url(#hz)","url(#h-dark)"];
    steps.forEach(([xx,q,yy,r],i) => {
      const s = Math.min(w,h);
      for(let k=0;k<q;k++){
        if(s*sc>=.6) E("rect",{x:X,y:Y,width:s*sc,height:s*sc,fill:cols[i%cols.length],stroke:"var(--ink)","stroke-width":1.2},svg);
        if(w>=h){ X+=s*sc; w-=s; } else { Y+=s*sc; h-=s; }
      }
    });
    const lines = steps.slice(0,12).map(([x,q,y,r])=>`${x} = ${q}·${y} + ${r}`).join("<br>") + (n>12?`<br>… ${n-12} more`:"");
    const worst = n===Math.floor(bound+1e-9) && b>=5;
    $("eu-t").innerHTML = `${lines}<br><br>gcd = <b>${steps[n-1][2]}</b> after <b>${n}</b> division${n>1?"s":""}.<br>
      Lamé's bound (as in the write-up): n ≤ ln b / ln φ + 1 = ${bound.toFixed(3)}.<br>Lamé's 1844 form: at most 5 × (digits of b) = ${5*digits}.<br>
      ${worst?`<span class="ok">This pair is a worst case: the walk is as long as the bound allows for this b.</span>`:`<span class="note">Slack: ${(bound-n).toFixed(3)}. Consecutive Fibonacci numbers leave the least.</span>`}`;
    if(worst && spec.award && !S.inv.includes(spec.award)){ take(spec.award, spec.awardText || "Something golden falls from the last square into your bag."); }
  };
  $("eu-go").onclick = go;
  $("eu-f").onclick = () => { const k = 5+Math.floor(Math.random()*20); $("eu-a").value=fib[k+1]; $("eu-b").value=fib[k]; go(); };
  $("eu-r").onclick = () => { const a=10+Math.floor(Math.random()*5000), b=1+Math.floor(Math.random()*a); $("eu-a").value=a; $("eu-b").value=b; go(); };
  go();
};
const DOZ = "0123456789↊↋";
function toBase(n, b, digits){ if(n===0) return "0"; let s=""; while(n>0){ s = (digits? digits[n%b] : String(n%b)) + s; n = Math.floor(n/b); } return s; }
WIDGETS.clock = (el, spec, room) => {
  el.innerHTML = `<div class="panel"><h3>The dozenal clock</h3><div class="big" id="dz"></div><div id="dz2" class="mono" style="font-size:14px;line-height:1.7"></div>
    <p class="note">↊ is ten and ↋ is eleven. A dozen dozens is a gross (144), and a dozen gross is a great gross (1728). A day has 86,400 seconds, which is exactly 50 great gross.</p></div>`;
  const door = (room.doors||[]).find(d => Array.isArray(d.to));
  const tick = () => { const d=now(), h=d.getHours(), m=d.getMinutes(), s=d.getSeconds(), sec=h*3600+m*60+s;
    $("dz").textContent = `${toBase(h,12,DOZ).padStart(2,"0")} : ${toBase(m,12,DOZ).padStart(2,"0")} : ${toBase(s,12,DOZ).padStart(2,"0")}`;
    $("dz2").innerHTML = `seconds since midnight: ${sec} = ${toBase(sec,12,DOZ)} in base twelve<br>= ${Math.floor(sec/1728)} great gross, ${Math.floor(sec%1728/144)} gross, ${Math.floor(sec%144/12)} dozen, ${sec%12}` + (door?`<br>the turning door leads to room ${target(door, room)} this hour`:"");
  };
  tick(); timers.push(setInterval(tick, 1000));
};
WIDGETS.babel = (el, spec, room) => {
  const AL = "abcdefghijlmnopqrstuvxz ,.";   // 22 letters, space, comma, period: 25 symbols
  const page = (seed, plant) => {
    const R = rng(seed), rows=[]; for(let i=0;i<14;i++){ let l=""; for(let j=0;j<64;j++) l+=AL[Math.floor(R()*25)]; rows.push(l); }
    let txt = rows.join("\n");
    if(plant){ const p = plant.slice(0, 60); const at = Math.floor(R()*(14*65-p.length-2)); let flat = rows.join(""); const pos = Math.min(at, flat.length-p.length); flat = flat.slice(0,pos)+p+flat.slice(pos+p.length);
      const out=[]; for(let i=0;i<14;i++) out.push(flat.slice(i*64,(i+1)*64)); txt = esc(out.join("\n"));
      const i0 = txt.indexOf(esc(p)); return i0>=0 ? txt : esc(out.join("\n")); }
    return esc(txt);
  };
  const addr = seed => { const R=rng(seed^0x9e3779b9); return `hexagon ${Array.from({length:6},()=>Math.floor(R()*4294967296).toString(36)).join("")}… · wall ${1+Math.floor(R()*4)} · shelf ${1+Math.floor(R()*5)} · volume ${1+Math.floor(R()*32)} · page ${1+Math.floor(R()*410)}`; };
  el.innerHTML = `<div class="panel"><h3>A page from the shelves</h3><div id="bb-a" class="note mono"></div><div class="babel" id="bb-p"></div>
    <div class="row"><button class="btn" id="bb-n" type="button">Take down another book</button><input id="bb-q" placeholder="a phrase to find" style="width:240px"><button class="btn primary" id="bb-f" type="button">Find it</button></div>
    <p class="note">Every book here has 410 pages of 40 lines of about 80 symbols, drawn from 25 symbols. You see one fragment. Every phrase you can type in this alphabet is on some page; the hard part is the address.</p></div>`;
  const show = (seed, plant) => { let html = page(seed, plant); if(plant){ const p = esc(plant.slice(0,60)); html = html.replace(p, `<mark>${p}</mark>`); } $("bb-p").innerHTML = html; $("bb-a").textContent = addr(seed); };
  $("bb-n").onclick = () => show(Math.floor(Math.random()*4294967296));
  $("bb-f").onclick = () => { const q = $("bb-q").value.toLowerCase().split("").map(c => AL.includes(c)? c : (c==="k"?"c":c==="w"?"u":c==="y"?"i":c==="q"?"c":" ")).join(""); if(!q.trim()) return; show(hash(q)*7919>>>0, q); };
  show(hash(room.id + ":" + (S.visits[room.id]||0)));
};
WIDGETS.sky = (el, spec) => {
  const compass = az => ["N","NE","E","SE","S","SW","W","NW"][Math.round(az/45)%8];
  el.innerHTML = `<div class="panel"><h3>The dome, unrolled</h3>
    <svg id="sk-s" viewBox="0 0 560 560" style="width:100%;max-width:560px;height:auto;display:block;margin:0 auto" role="img" aria-label="The sky over Appleton, as seen looking straight up"></svg>
    <div class="row"><label class="mono" for="sk-o">turn the dome</label><input id="sk-o" type="range" min="-24" max="24" step="0.25" value="0" style="width:240px"><span id="sk-ol" class="mono"></span><button class="btn" id="sk-n" type="button">Now</button></div>
    <div id="sk-t" class="mono" style="font-size:13.5px;line-height:1.7"></div>
    <p class="note">Looking straight up, with north at the top and east on the left, as a sky chart should be. The circle is the horizon. The projection is stereographic, the stereonet's projection, so every circle in the sky stays a circle. The chart turns with you: if the house has turned you, the dome turns too, and in a mirror it is reversed, the way the ceiling of Grand Central was painted.</p>
    <p class="note" style="font-size:12px">${esc((window.SKY&&SKY.credit)||"")}</p></div>`;
  const draw = () => {
    const off = +$("sk-o").value, svg = $("sk-s"); svg.innerHTML = "";
    const sk = drawSky(svg, 280, 280, 240, {big:true, names:true, cons:true, tag:"w", offset:off});
    $("sk-ol").textContent = (off>=0?"+":"") + off + " h · " + sk.d.toLocaleString([], {weekday:"short", hour:"numeric", minute:"2-digit"});
    const up = sk.planets.filter(p=>p.alt>0).map(p=>`${p.name} ${p.alt.toFixed(0)}° up in the ${compass(p.az)}`);
    const lit = Math.round(50*(1-Math.cos(2*Math.PI*sk.moon.phase)));
    $("sk-t").innerHTML = `sun: ${sk.sun.alt>0?`${sk.sun.alt.toFixed(0)}° up in the ${compass(sk.sun.az)}`:`${(-sk.sun.alt).toFixed(0)}° below the horizon`}<br>
      moon: ${lit}% lit, ${sk.moon.alt>0?`${sk.moon.alt.toFixed(0)}° up in the ${compass(sk.moon.az)}`:"below the horizon"}<br>
      planets up: ${up.length? up.join("; ") : "none"}<br>local sidereal time ${(sk.L/15).toFixed(2)} h · latitude ${LAT}° · you face ${compass(facing())}`;
  };
  $("sk-o").oninput = draw; $("sk-n").onclick = () => { $("sk-o").value = 0; draw(); };
  draw(); timers.push(setInterval(draw, 60000));
};
/* ---- Smullyan's island: knights always tell the truth, knaves always lie ---- */
const KN = (() => {
  const NAMES = ["Ash","Birch","Cedar"];
  const DOOR = ["the left door","the right door"];
  function templates(n){
    const T = [];
    for(let x=0;x<n;x++){
      T.push({txt:(i)=>x===i?null:`${NAMES[x]} is a knight.`, f:(w)=>w.r[x]});
      T.push({txt:(i)=>x===i?null:`${NAMES[x]} is a knave.`, f:(w)=>!w.r[x]});
      T.push({txt:(i)=>x===i?null:`${NAMES[x]} and I are the same kind.`, f:(w,i)=>w.r[x]===w.r[i]});
      T.push({txt:(i)=>x===i?null:`${NAMES[x]} and I are different kinds.`, f:(w,i)=>w.r[x]!==w.r[i]});
      for(const dd of [0,1]){
        T.push({txt:(i)=>x===i?null:`${NAMES[x]} would tell you that ${DOOR[dd]} leads on.`, f:(w)=> w.r[x] ? w.s===dd : w.s!==dd});
        T.push({txt:(i)=>x===i?null:`Either ${NAMES[x]} is a knave, or ${DOOR[dd]} leads on.`, f:(w)=> !w.r[x] || w.s===dd});
      }
    }
    for(const dd of [0,1]){
      T.push({txt:()=>`${DOOR[dd][0].toUpperCase()+DOOR[dd].slice(1)} leads on.`, f:(w)=>w.s===dd, direct:true});
      T.push({txt:()=>`If I am a knight, then ${DOOR[dd]} leads on.`, f:(w,i)=>!w.r[i] || w.s===dd});
      T.push({txt:()=>`I am a knave or ${DOOR[dd]} leads on.`, f:(w,i)=>!w.r[i] || w.s===dd});
      T.push({txt:()=>`I am a knight, and ${DOOR[dd]} leads on.`, f:(w,i)=>w.r[i] && w.s===dd});
    }
    T.push({txt:()=>`At least one of us is a knave.`, f:(w)=>w.r.some(v=>!v)});
    T.push({txt:()=>`Exactly one of us is a knight.`, f:(w)=>w.r.filter(v=>v).length===1});
    T.push({txt:()=>`We are all the same kind.`, f:(w)=>w.r.every(v=>v===w.r[0])});
    return T;
  }
  function worlds(n){ const out=[]; for(let m=0;m<(1<<n);m++) for(const s of [0,1]) out.push({r:Array.from({length:n},(_,k)=>!!(m>>k&1)), s}); return out; }
  function make(rand){
    for(let tries=0; tries<4000; tries++){
      const n = rand()<.55 ? 2 : 3, T = templates(n), says=[];
      for(let i=0;i<n;i++){ let t, txt; do { t=T[Math.floor(rand()*T.length)]; txt=t.txt(i); } while(!txt); says.push({i, t, txt}); }
      if(says.filter(x=>x.t.direct).length>1) continue;
      const ok = worlds(n).filter(w => says.every(({i,t}) => t.f(w,i)===w.r[i]));
      if(!ok.length) continue;
      if(!ok.every(w=>w.s===ok[0].s)) continue;
      if(ok.length > 2) continue;
      if(says.some(x=>x.t.direct) && says.length===2 && rand()<.6) continue;
      return {n, says, ok, safe: ok[0].s};
    }
    return null;
  }
  return {make, NAMES, DOOR};
})();
WIDGETS.knights = (el, spec) => {
  const need = spec.need || 3;
  let pz = null;
  const show = () => {
    pz = KN.make(Math.random);
    const solved = S.solved.knightsCount || 0;
    el.innerHTML = `<div class="panel"><h3>A puzzle at the two doors</h3>
      <p class="note">One door leads on and the other leads back to the start. ${pz.n===2?"Two":"Three"} islanders stand between them. Each is a knight, who always tells the truth, or a knave, who always lies.</p>
      <ul class="list" style="margin:10px 0">${pz.says.map(x=>`<li><b>${KN.NAMES[x.i]}:</b> “${esc(x.txt)}”</li>`).join("")}</ul>
      <div class="row"><button class="btn" id="kn-l" type="button">Take the left door</button><button class="btn" id="kn-r" type="button">Take the right door</button><button class="btn" id="kn-n" type="button">Another island</button></div>
      <div id="kn-o" class="note"></div><p class="note">Solved here: ${solved}${solved<need?` of the ${need} the far door asks for`:""}.</p></div>`;
    const answer = d => {
      const right = d===pz.safe, w = pz.ok[0];
      const roles = pz.ok.length===1 ? Array.from({length:pz.n},(_,k)=>`${KN.NAMES[k]} is a ${w.r[k]?"knight":"knave"}`).join(", ") : "the islanders' kinds aren't all determined, but the door is";
      if(right){ S.solved.knightsCount = (S.solved.knightsCount||0)+1; if(S.solved.knightsCount>=need) S.solved.island = 1; save(); award("knights:"+S.solved.knightsCount, 15); }
      $("kn-o").innerHTML = right ? `<span class="ok">Right. ${esc(roles)}.</span>` : `<span class="warn">That door leads back. ${esc(roles)}, so ${KN.DOOR[pz.safe]} leads on.</span>`;
      $("kn-l").disabled = $("kn-r").disabled = true;
      if(right && S.solved.knightsCount===need){ toast("Somewhere on the island, a door unbars."); render(); }
    };
    $("kn-l").onclick = () => answer(0); $("kn-r").onclick = () => answer(1); $("kn-n").onclick = show;
  };
  show();
};

/* ---- the Primer ---- */
function primerView(){
  const name = S.reader;
  if(!name){
    overlay("A Young Lady's Illustrated Primer", `<div class="text"><p>The book is heavier than it looks. The first page is blank, and then it isn't: <i>Who is reading?</i></p></div><div class="row widget"><input id="pr-n" style="width:220px" placeholder="your name"><button class="btn primary" id="pr-b" type="button">Answer the book</button></div>`);
    const go = () => { const v=$("pr-n").value.trim(); if(!v) return; S.reader=v; save(); primerView(); };
    $("pr-b").onclick = go; $("pr-n").onkeydown = e => { if(e.key==="Enter") go(); }; return;
  }
  const L2 = P.primer || {}, order = P.rooms.filter(r=>!r.secret&&!r.closed).map(r=>String(r.id));
  const unseen = order.filter(id => !S.visits[id]);
  const secret = P.rooms.filter(r=>r.secret && !S.visits[r.id]).map(r=>String(r.id));
  let pick = unseen.find(id => L2[id]) || unseen[0] || secret[0];
  const here = String(cur.id), lessonHere = L2[here];
  const n = Object.keys(S.visits).length;
  let html = `<div class="text" style="max-width:640px;margin:0 auto">`;
  html += `<p>Once there was a reader called <b>${esc(name)}</b>, who had wandered through ${n} room${n===1?"":"s"} of a house that was larger inside than out.</p>`;
  if(lessonHere) html += `<p><i>Here, in ${esc(cur.name)}:</i> ${lessonHere.lesson}</p>${lessonHere.q?`<p><b>The book asks:</b> ${lessonHere.q}</p><details><summary class="note">turn the page for the answer</summary><p>${lessonHere.a||""}</p></details>`:""}`;
  if(pick){ const r = ROOMS[pick], ls = L2[pick];
    html += `<p>${esc(name)} had not yet seen <b>${esc(r.name)}</b>${ls? ", where " + ls.teaser : ""}. The page shows a small picture of a door with the number ${esc(r.label||r.id)} on it.</p>
    <div class="row"><button class="btn primary" id="pr-go" type="button">Touch the picture</button></div>`;
  } else html += `<p>${esc(name)} had seen every room, even the hidden ones. The last page is still blank, which is the book's way of asking for a new room.</p>`;
  html += `<p class="note">The book rewrites itself for whoever holds it. Close it and open it again somewhere else.</p></div>`;
  overlay(`A Young Lady's Illustrated Primer · for ${name}`, html);
  const b = $("pr-go"); if(b) b.onclick = () => { closeOv(); toast("The picture swallows you, gently."); move(pick, "e", null); };
}

/* ---- a house alethiometer: three hands set a question, the needle answers ---- */
const SYMBOLS = [["hourglass",7],["key",16],["lock",10],["compass",4],["lamp",1],["pendulum",7],["lily",19],["crystal",12],["tree",14],["tile",11],["card",9],["mirror",8],
 ["stair",13],["clock",17],["whale",15],["railroad",15],["φ",16],["die",27],["owl",22],["serpent",12],["star",4],["moon",4],["sun",3],["spiral",13],
 ["hexagon",18],["bell",17],["quill",21],["anchor",19],["wheel",2],["labyrinth",23],["scale",3],["ladder",13],["eye",5],["seed",29],["sphere",8],["door",1]];
WIDGETS.oracle = (el) => {
  const hands = [0,12,24];
  el.innerHTML = `<div class="panel"><h3>The house alethiometer</h3>
    <svg id="al-s" viewBox="-170 -170 340 340" style="width:100%;max-width:380px;display:block;margin:0 auto" role="img" aria-label="A dial of 36 symbols with three hands and a needle"></svg>
    <div class="row">${[0,1,2].map(k=>`<label class="mono">hand ${k+1} <select id="al-h${k}">${SYMBOLS.map((s,j)=>`<option value="${j}" ${j===hands[k]?"selected":""}>${s[0]}</option>`).join("")}</select></label>`).join("")}</div>
    <div class="row"><button class="btn primary" id="al-a" type="button">Ask</button></div><div id="al-o" class="text"></div>
    <p class="note">Thirty-six symbols, each meaning many things, in honor of Pullman's instrument. This one knows only the house, and it answers with a room.</p></div>`;
  const svg = $("al-s"); let needle = 0;
  const draw = () => {
    svg.innerHTML = "";
    E("circle",{r:160,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":3},svg); E("circle",{r:122,fill:"url(#s-hatch)",stroke:"var(--ink)","stroke-width":1.5},svg); E("circle",{r:100,fill:"var(--paper)",stroke:"var(--ink)"},svg);
    SYMBOLS.forEach((s,j) => { const t=(j/36)*2*Math.PI-Math.PI/2; L(svg,122*Math.cos(t+Math.PI/36),122*Math.sin(t+Math.PI/36),160*Math.cos(t+Math.PI/36),160*Math.sin(t+Math.PI/36),.8);
      const tx=T(s[0],{x:141*Math.cos(t),y:141*Math.sin(t)+3,"text-anchor":"middle","font-size":s[0].length>7?6.5:8,fill:"var(--ink)","font-family":"IM Fell English, serif",transform:`rotate(${j*10} ${141*Math.cos(t)} ${141*Math.sin(t)})`},svg); });
    [0,1,2].forEach(k => { const j=+$("al-h"+k).value, t=(j/36)*2*Math.PI-Math.PI/2; L(svg,0,0,96*Math.cos(t),96*Math.sin(t),2.5); E("circle",{cx:96*Math.cos(t),cy:96*Math.sin(t),r:4,fill:"var(--ink)"},svg); });
    const nt=(needle/36)*2*Math.PI-Math.PI/2; L(svg,0,0,118*Math.cos(nt),118*Math.sin(nt),1.4,{stroke:"var(--spot)"}); E("circle",{r:7,fill:"var(--spot)",stroke:"var(--ink)"},svg);
  };
  [0,1,2].forEach(k => $("al-h"+k).onchange = draw);
  $("al-a").onclick = () => {
    const q = [0,1,2].map(k=>+$("al-h"+k).value), seed = hash(q.join("-") + ":" + new Date().toDateString());
    const R = rng(seed), target = Math.floor(R()*36); let steps = 0; const total = 36*2 + ((target - needle + 36) % 36);
    const swing = setInterval(() => { needle = (needle+1)%36; draw(); if(++steps>=total){ clearInterval(swing);
      const sym = SYMBOLS[target], room = ROOMS[String(sym[1])] || cur, first = SYMBOLS[q[0]][0];
      $("al-o").innerHTML = `<p>The needle settles on <b>${esc(sym[0])}</b>. You asked about ${esc(first)}, ${esc(SYMBOLS[q[1]][0])}, and ${esc(SYMBOLS[q[2]][0])}. The ${esc(sym[0])} means many things; today it means <b>room ${esc(room.label||room.id)}, ${esc(room.name)}</b>.</p>`; } }, 28);
    timers.push(swing);
  };
  draw();
};

WIDGETS.sundial = (el) => {
  const t = dialType(); if(t === "meantime" || t === "meridiana" || t === "cannon") return dialWidget2(el, t);
  el.innerHTML = `<div class="panel"><h3>The dial, from above</h3><svg id="sd-s" viewBox="-260 -260 520 520" style="width:100%;max-width:440px;display:block;margin:0 auto" role="img" aria-label="A horizontal sundial with today's shadow"></svg><div id="sd-t" class="mono" style="font-size:13.5px;line-height:1.7"></div>
    <p class="note">A horizontal dial laid out for latitude ${LAT}° (${esc(placeName())}): each hour line makes angle θ with the noon line, where tan θ = sin φ · tan(15° × hours from noon). The style points at the celestial pole. The dial tells local apparent solar time. Your clock differs by the longitude correction (in Appleton, which is west of its time-zone meridian), by daylight saving time, and by the equation of time.</p></div>`;
  const draw = () => {
    const svg=$("sd-s"); svg.innerHTML=""; const sk=skyNow(), phi=LAT*DEG, Hd=(((sk.L-sk.sun.ra)%360)+540)%360-180, H=Hd*DEG;
    E("circle",{r:240,fill:"url(#h-light)",stroke:"var(--ink)","stroke-width":3},svg); E("circle",{r:226,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1.2},svg);
    for(let m=4*4; m<=20*4; m++){ const h=m/4, th=Math.atan2(Math.sin(phi)*Math.sin((h-12)*15*DEG), Math.cos((h-12)*15*DEG)), r0 = m%4?196:150;
      L(svg, Math.sin(th)*r0, -Math.cos(th)*r0, Math.sin(th)*220, -Math.cos(th)*220, m%4?.6:1.4);
      if(!(m%4)){ T(["XII","I","II","III","IIII","V","VI","VII","VIII","IX","X","XI"][(m/4)%12],{x:Math.sin(th)*176,y:-Math.cos(th)*176+5,"text-anchor":"middle","font-size":16,fill:"var(--ink)","font-family":"IM Fell English SC, serif"},svg); } }
    T(LAT>=0?"N":"S",{x:0,y:-244,"text-anchor":"middle","font-size":12,fill:"var(--ink)","font-family":"IM Fell English SC, serif"},svg);
    const Hm = ((((sk.L-sk.moon.ra)%360)+540)%360-180)*DEG, wxd = weather(), cc = wxd ? (wxd.cloud_cover||0) : 0, lit = (1-Math.cos(2*Math.PI*sk.moon.phase))/2;
    const sunShadow = sk.sun.alt > 0 && cc < 85 && !skyOff("sun");
    const moonShadow = !sunShadow && (sk.sun.alt < -.8 || skyOff("sun")) && sk.moon.alt > 0 && !skyOff("moon") && lit > .15 && cc < 85;
    const shade = (Ha, fill, op) => { const th = Math.atan2(Math.sin(phi)*Math.sin(Ha), Math.cos(Ha)); E("polygon",{points:`0,0 ${Math.sin(th-.03)*210},${-Math.cos(th-.03)*210} ${Math.sin(th+.03)*210},${-Math.cos(th+.03)*210}`,fill,opacity:op},svg); };
    if(moonShadow) shade(Hm, "var(--ink)", .25+.5*lit);
    if(sunShadow) shade(H, "var(--spot)", .85);
    E("polygon",{points:"-5,0 5,0 0,-150",fill:"url(#h-dark)",stroke:"var(--ink)","stroke-width":1.5},svg); E("circle",{r:5,fill:"var(--ink)"},svg);
    const n=sk.jd-2451545, Lm=((280.460+0.9856474*n)%360+360)%360; let eot=(Lm-sk.sun.ra); eot=((eot+540)%360-180)*4;
    const hm = x => { const h = ((x%24)+24)%24, mm = Math.floor(h%1*60); return `${Math.floor(h)}:${String(mm).padStart(2,"0")}`; };
    const clock = sk.d.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
    const zone = -sk.d.getTimezoneOffset()/60, lonMin = (LON - zone*15)*4;
    $("sd-t").innerHTML = sunShadow
      ? `The shadow reads <b>${hm(12 + Hd/15)}</b>. The clock says ${clock}.<br><span class="note">Nothing on the plate is corrected: this is the sun's own time, here. The difference from the clock is the longitude (${lonMin>=0?"+":""}${lonMin.toFixed(0)} min from the zone's meridian), the equation of time (${eot>=0?"+":""}${eot.toFixed(1)} min today), and daylight saving if it's in force. Sun ${sk.sun.alt.toFixed(1)}° up.</span>`
      : moonShadow
      ? `The moon's shadow reads <b>${hm(12 + (Hm/DEG)/15)}</b>. The clock says ${clock}.<br><span class="note">This is moon time, read straight off the plate, as a real dial would show it. The moon is ${sk.moon.alt.toFixed(1)}° up and ${Math.round(lit*100)}% lit, ${(sk.moon.phase*29.530588853).toFixed(1)} days past new.</span>`
      : skyOff("sun") && sk.sun.alt > 0 ? `The storm glass has put the sun out. No shadow until it's lit again.`
      : sk.sun.alt > 0 ? `The sun is up but the cloud is too thick for a shadow (${Math.round(cc)}% cover). The dial waits.`
      : sk.moon.alt > 0 && skyOff("moon") ? `The moon is up, but the storm glass has put it out.`
      : sk.moon.alt > 0 && cc >= 85 ? `The moon is up behind the clouds. No shadow tonight.`
      : sk.moon.alt > 0 ? `The moon is up but only ${Math.round(lit*100)}% lit, too thin to throw a shadow you could read.`
      : `The sun is down and the moon is down too. The dial is only a plate of brass until morning. (Sun ${(-sk.sun.alt).toFixed(0)}° below the horizon.)`;
  };
  draw(); timers.push(setInterval(draw, 30000));
};

// the readings for the dials that tell clock time, or fire
function dialWidget2(el, t){
  const D = DIALS[t];
  el.innerHTML = `<div class="panel"><h3>${esc(D.name)}</h3><svg id="sd2" viewBox="-260 -260 520 520" style="width:100%;max-width:440px;display:block;margin:0 auto" role="img" aria-label="${esc(D.name)}"></svg><div id="sd2-t" class="mono" style="font-size:13.5px;line-height:1.7"></div><p class="note">${esc(D.blurb)} Change it at the cabinet under the colonnade.</p></div>`;
  const draw = () => {
    const svg = $("sd2"); if(!svg) return; svg.innerHTML = ""; const sk = skyNow(), wx = weather(), cc = wx ? (wx.cloud_cover||0) : 0, sunOK = sk.sun.alt > 0 && cc < 85 && !skyOff("sun");
    const off = stdOffsetH(), d = sk.d, stdH = ((d.getUTCHours() + d.getUTCMinutes()/60 + d.getUTCSeconds()/3600 + off) % 24 + 24) % 24, hm = h => { const x = ((h%24)+24)%24; return `${Math.floor(x)}:${String(Math.floor(x%1*60)).padStart(2,"0")}`; };
    const ha = ((sk.L - sk.sun.ra + 540) % 360) - 180, toNoon = -ha/15;   // hours until the sun crosses the meridian
    const n0 = ((sk.jd - 2451545)), Lm = ((280.460+0.9856474*n0)%360+360)%360; let eot = ((Lm - sk.sun.ra + 540) % 360 - 180)*4;
    if(t === "meantime"){ const D2 = dialData("meantime"), k = 92, oy = (LAT >= 0 ? -1 : 1)*150;   // the bead stands toward the equator side
      E("circle",{r:240,fill:"url(#h-light)",stroke:"var(--ink)","stroke-width":3},svg); E("circle",{r:226,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1},svg);
      const P = ([e,n]) => [e*k, -(n*k + oy)];
      D2.dates.forEach(dl => { if(dl.pts.length < 2) return; E("polyline",{points:dl.pts.map(P).map(p=>p.join(",")).join(" "),fill:"none",stroke:"var(--muted)","stroke-dasharray":"3 3","stroke-width":1},svg); });
      Object.entries(D2.hours).forEach(([hr, pts]) => { const inside = pts.map(P).filter(([x,y]) => x*x+y*y < 222*222); if(inside.length < 3) return;
        E("polyline",{points:inside.map(p=>p.join(",")).concat([inside[0].join(",")]).join(" "),fill:"none",stroke:+hr===12?"var(--spot)":"var(--ink)","stroke-width":+hr===12?2:1.2},svg);
        const top = inside.reduce((a,b) => a[1] < b[1] ? a : b); T(["XII","I","II","III","IIII","V","VI","VII","VIII","IX","X","XI"][hr%12],{x:top[0],y:top[1]-6,"text-anchor":"middle","font-size":12,fill:"var(--ink)","font-family":"IM Fell English SC, serif"},svg); });
      E("circle",{cx:0,cy:-oy,r:4,fill:"var(--ink)"},svg); T(LAT>=0?"N":"S",{x:0,y:-244,"text-anchor":"middle","font-size":12,fill:"var(--ink)","font-family":"IM Fell English SC, serif"},svg);
      if(sunOK){ const [x,y] = P(shadowOf(sk.sun)); E("line",{x1:0,y1:-oy,x2:x,y2:y,stroke:"var(--ink)","stroke-width":1.5,opacity:.5},svg); E("circle",{cx:x,cy:y,r:7,fill:"var(--spot)",stroke:"var(--ink)"},svg); }
      $("sd2-t").innerHTML = sunOK ? `The bead's shadow reads <b>${hm(stdH)}</b> standard time: the clock's own time, read straight off the figure-eights.${d.getTimezoneOffset() !== -off*60 ? ` Your clock is on daylight saving, an hour ahead: ${hm(stdH+1)}.` : ""}<br><span class="note">Each figure-eight is one clock hour through the year; the shadow runs up the left loop in spring and down the right in autumn (in the north). The equation of time today is ${eot>=0?"+":""}${eot.toFixed(1)} minutes.</span>` : `No shadow to read: ${sk.sun.alt <= 0 ? "the sun is down" : skyOff("sun") ? "the storm glass has put the sun out" : "too much cloud"}.`;
    }
    if(t === "meridiana"){ const D2 = dialData("meridiana"), k = 70, hS = 2.6, base = 200*(LAT >= 0 ? 1 : -1);   // the column stands toward the equator, at the bottom of the drawing
      const P = ([e,n]) => [e*hS*k/2.6*1, base - n*hS*k/2.6];
      E("rect",{x:-230,y:-250,width:460,height:500,fill:"url(#h-light)",stroke:"var(--ink)","stroke-width":2},svg);
      E("line",{x1:0,y1:-250,x2:0,y2:250,stroke:"var(--ink)","stroke-width":2},svg);
      D2.months.forEach(mk => { const y = base - mk.n*hS*k/2.6; if(Math.abs(y) < 248){ E("line",{x1:-12,y1:y,x2:12,y2:y,stroke:"var(--ink)"},svg); T(["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][mk.m],{x:16,y:y+4,"font-size":11,fill:"var(--ink)","font-family":"IM Fell English, serif"},svg); } });
      E("polyline",{points:D2.noon8.map(P).map(p=>p.join(",")).join(" "),fill:"none",stroke:"var(--spot)","stroke-width":2},svg);
      E("circle",{cx:0,cy:base,r:8,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},svg);
      if(sunOK){ const sh = shadowOf(sk.sun), [x,y] = P(sh); if(Math.abs(x) < 230 && Math.abs(y) < 250) E("circle",{cx:x,cy:y,r:7,fill:"#fff6c8",stroke:"var(--ink)"},svg); }
      const mins = Math.round(toNoon*60);
      $("sd2-t").innerHTML = sunOK ? `The spot of sun ${Math.abs(mins) < 2 ? "is crossing the straight line now: <b>sun noon</b>" : mins > 0 ? `will cross the straight line in <b>${Math.floor(mins/60) ? Math.floor(mins/60)+" h " : ""}${mins%60} min</b> (sun noon)` : `crossed the straight line ${Math.floor(-mins/60) ? Math.floor(-mins/60)+" h " : ""}${(-mins)%60} min ago`}, and the figure-eight at ${hm(12 + (toNoon > 0 ? 0 : 0))} standard time, ${(() => { const mn = (12 - stdH)*60; return Math.abs(mn) < 2 ? "now" : mn > 0 ? `in ${Math.floor(mn/60) ? Math.floor(mn/60)+" h " : ""}${Math.round(mn%60)} min` : `${Math.floor(-mn/60) ? Math.floor(-mn/60)+" h " : ""}${Math.round(-mn%60)} min ago`; })()}.<br><span class="note">The gap between the two is the longitude and the equation of time (${eot>=0?"+":""}${eot.toFixed(1)} min today). The month marks are where the spot falls at sun noon on the first of each month.</span>` : `No spot today: ${sk.sun.alt <= 0 ? "the sun is down" : skyOff("sun") ? "the storm glass has put the sun out" : "too much cloud"}.`;
    }
    if(t === "cannon"){ const mins = Math.round(toNoon*60), next = mins >= 0 ? mins : mins + 24*60 - 4;
      E("circle",{r:200,fill:"url(#h-light)",stroke:"var(--ink)","stroke-width":2},svg); E("path",{d:"M-120,40 L110,10 L120,40 L-110,70 Z",fill:"url(#s-dark)",stroke:"var(--ink)"},svg); E("circle",{cx:-120,cy:55,r:26,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":3},svg);
      E("ellipse",{cx:60,cy:-70,rx:42,ry:14,fill:"#e9f0f2",stroke:"var(--ink)"},svg); E("line",{x1:60,y1:-56,x2:62,y2:18,stroke:"var(--spot)","stroke-dasharray":"4 3"},svg);
      $("sd2-t").innerHTML = `${sunOK ? `The cannon fires at sun noon, in <b>${Math.floor(next/60) ? Math.floor(next/60)+" h " : ""}${next%60} min</b>${next > 12*60 ? " (tomorrow)" : ""}, if the sky stays clear.` : "No firing today unless the sky clears: the glass needs the sun."}<br><span class="note">Sun noon is ${hm(stdH + toNoon)} by the standard clock today. The Palais-Royal's noon cannon in Paris fired this way from 1786; the cannon in the Wending House is smaller and fires only for those in the court.</span>`;
    }
  };
  draw(); timers.push(setInterval(draw, 20000));
}
WIDGETS.center = (el, spec, room) => {
  const d = bfs(START)[String(room.id)];
  const n = Math.max(0, S.walk.length-1);
  el.innerHTML = `<div class="panel"><h3>The center</h3><p class="mono" style="font-size:15px;line-height:1.7">You came ${n} step${n===1?"":"s"} from the Foyer this time.<br>The shortest way is ${d ?? "?"} step${d===1?"":"s"}, if every door is open.</p>
    <p class="note">${n && d!=null && n<=d ? "You found the shortest path. Now find the shortest way back." : "There is a shorter way. Some of its doors keep hours, and one needs a key."}</p></div>`;
};
WIDGETS.rank = (el) => {
  el.innerHTML = `<div class="panel"><h3>Ranks of the library</h3><ul class="list">${RANKS.map((r,i)=>`<li><span class="vest" style="background:${r.color}"></span> ${esc(r.name)} <span class="note">· ${r.at} rooms remembered</span>${i===rankIndex()?' <b>← you</b>':""}</li>`).join("")}</ul></div>`;
};

/* ---------- controls ---------- */
$("b-map").onclick = mapView;
$("b-cat").onclick = catalogueView;
$("b-help").onclick = helpView;
$("b-ann").onclick = () => { S.annot = !S.annot; save(); annotations(effective(cur)); if(S.annot) $("annwin").scrollIntoView({behavior:"smooth",block:"nearest"}); };
$("ann-x").onclick = () => { S.annot = false; save(); annotations(effective(cur)); };
$("b-ink").onclick = () => { S.ink = S.ink==="1bit" ? "two" : "1bit"; save(); render(); toast(S.ink==="1bit" ? "Black ink only, as on a 1-bit screen." : "A second block of color, wing by wing."); };
setInterval(() => { if(cur && !$("ov").classList.contains("open")) tally(lightNow()); }, 30000);
$("b-lamp").onclick = () => { S.light = {auto:"night", night:"day", day:"auto"}[S.light] || "auto"; save(); render(); toast(S.light==="auto" ? "Lamps follow the clock again." : S.light==="night" ? "You turn the lamps down." : "You light every lamp."); };
rankIndex.cache = null;
$("b-full").onclick = fullView;
// skins: Myst (journals, brass, a dark room around the picture) or HyperCard (striped title bars, hard shadows, 1-bit chrome)
function applySkin(){ const m = (S.skin||"myst")==="myst"; document.documentElement.classList.toggle("skin-myst", m); document.documentElement.classList.toggle("skin-hypercard", !m); $("b-skin").textContent = "Skin: " + (m ? "Myst" : "HyperCard"); }
$("b-skin").onclick = () => { S.skin = (S.skin||"myst")==="myst" ? "hypercard" : "myst"; save(); applySkin(); toast(S.skin==="myst" ? "The journals come out." : "Back to the stack."); };
applySkin();
$("b-q").onclick = () => { S.quality = {draft:"normal", normal:"fine", fine:"ultra", ultra:"max", max:"draft"}[defaultQuality()]; save(); toast(`Quality: ${S.quality}. Redrawing…`); setTimeout(() => location.reload(), 500); };
// three ways to see the house: engraved (the default), photographic, and the flat woodcuts
$("b-gfx").onclick = () => { S.gfx = S.gfx==="2d" ? "3d" : S.gfx==="photo" ? "2d" : "photo"; save(); if(S.gfx!=="2d" && !VIEW3D) start3d(); render(); toast({"3d":"Engraved.", photo:"Photographic: the light as it is.", "2d":"Woodcuts."}[S.gfx]); };
route();
start3d();
if(S.curator && location.hash!=="#curator") { /* stay quiet; the office opens on #curator */ }
})();
