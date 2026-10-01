/* The Palace — a memory-palace engine for wkusner.github.io
   Data: window.PALACE (built by Jekyll from _data/palace.yml into data.js).
   State: localStorage "palace-v1" (per-visitor convenience only). */
(function(){
"use strict";
const P = window.PALACE;
const $ = id => document.getElementById(id);
if(!P || !P.rooms){ $("rname").textContent="The palace data did not load."; return; }
const NS = "http://www.w3.org/2000/svg";
const ROOMS = {}; P.rooms.forEach(r => { ROOMS[String(r.id)] = r; });
const WINGS = P.wings || {};
const START = String(P.start || P.rooms[0].id);
const RANKS = P.ranks || [{name:"Visitor",at:0,color:"#d9d2c0"}];
const LAT = P.latitude || 44.26;
const Q = new URLSearchParams(location.search);

/* ---------- state ---------- */
const KEY = "palace-v1";
const blank = () => ({visits:{}, log:[], edges:{}, frame:[0,0], frames:{}, inv:[], solved:{}, named:[], light:"auto", steps:0, walk:[], showAll:false});
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
  const d = new Date();
  if(Q.has("hour")) { d.setHours(+Q.get("hour"), +(Q.get("min")||0)); }
  if(Q.has("date")) { const t = new Date(Q.get("date")+"T"+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")); if(!isNaN(t)) return t; }
  return d;
}
function band(d){ const h=d.getHours(); return h>=21||h<5 ? "night" : h<8 ? "dawn" : h<18 ? "day" : "dusk"; }
function moonPhase(d){ const syn=29.530588853, ref=Date.UTC(2000,0,6,18,14); return (((d - ref)/864e5 % syn) + syn) % syn / syn; }
function lightNow(){ return S.light==="auto" ? band(now()) : S.light; }

/* ---------- the sky over the palace ---------- */
const DEG = Math.PI/180, LON = (P.longitude!=null ? P.longitude : -88.41);
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
function planetsEq(jd){
  const T=(jd-2451545)/36525, PL=(window.SKY&&SKY.planets)||{}, out=[];
  if(!PL.ter) return out; const t=helio(PL.ter.el,T);
  ["mer","ven","mar","jup","sat"].forEach(k => { if(!PL[k]) return; const p=helio(PL[k].el,T), x=p[0]-t[0], y=p[1]-t[1], z=p[2]-t[2];
    const lam=Math.atan2(y,x)/DEG, beta=Math.atan2(z,Math.hypot(x,y))/DEG, eq=eclToEq(lam,beta); out.push({id:k, name:PL[k].name, sym:PL[k].sym, ra:eq[0], dec:eq[1]}); });
  return out; }
function lst(jd){ return ((280.46061837 + 360.98564736629*(jd-2451545) + LON) % 360 + 360) % 360; }
function altaz(ra, dec, L){ const H=(L-ra)*DEG, d=dec*DEG, f=LAT*DEG;
  const alt=Math.asin(Math.sin(d)*Math.sin(f)+Math.cos(d)*Math.cos(f)*Math.cos(H));
  const az=Math.atan2(-Math.cos(d)*Math.sin(H), Math.sin(d)*Math.cos(f)-Math.cos(d)*Math.sin(f)*Math.cos(H));
  return [alt/DEG, ((az/DEG)%360+360)%360]; }
function skyNow(offsetHours){
  const d = new Date(now().getTime() + (offsetHours||0)*36e5), jd = jdOf(d), L = lst(jd);
  const s = sunEq(jd), m = moonEq(jd), sa = altaz(s[0],s[1],L), ma = altaz(m[0],m[1],L);
  ma[0] -= 0.95*Math.cos(ma[0]*DEG);   // parallax: we stand on the surface, not at the center
  return {d, jd, L, sun:{ra:s[0],dec:s[1],alt:sa[0],az:sa[1]}, moon:{ra:m[0],dec:m[1],alt:ma[0],az:ma[1],phase:moonPhase(d)}, planets:planetsEq(jd).map(p=>{const a=altaz(p.ra,p.dec,L); return Object.assign(p,{alt:a[0],az:a[1]});})};
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
  const P2 = (ra,dec) => { const a = altaz(ra,dec,sk.L); return a[0] < -1 ? null : proj(a[0],a[1],R,rot,mir).concat([a[0]]); };
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
function rankIndex(){ let i=0; RANKS.forEach((r,j)=>{ if(seen()>=r.at) i=j; }); return i; }
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
    default: return true;
  }
}
const visible = (x, room) => S.showAll || cond(x.when, room);
const open = (x, room) => S.showAll || (cond(x.needs, room) && (!x.riddle || S.solved[x.riddle.id]));

/* ---------- door targets ---------- */
let randomPick = {};
function target(door, room){
  const t = door.to;
  if(Array.isArray(t)) return String(t[now().getHours() % t.length]);
  if(t==="random"){
    const k = room.id+"|"+(door.label||"");
    if(!randomPick[k]){ const ids = Object.keys(ROOMS).filter(x => x!==String(room.id) && !ROOMS[x].secret); randomPick[k] = ids[Math.floor(Math.random()*ids.length)]; }
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
const W=800, H=450, BX0=190, BX1=610, BY0=80, BY1=300;
function leftPt(u, frac){ const x=BX0*u, top=BY0*u, bot=H-(H-BY1)*u; return [x, bot-(bot-top)*frac]; }
function rightPt(u, frac){ const p=leftPt(u,frac); return [W-p[0], p[1]]; }
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
function drawRoom(room, svg, light){
  defs(svg);
  const R = rng(hash("room"+room.id));
  const g = E("g",{filter:"url(#rough)"}, svg);
  E("rect",{x:0,y:0,width:W,height:H,fill:"var(--paper)"},g);
  E("polygon",{points:`0,0 ${W},0 ${BX1},${BY0} ${BX0},${BY0}`, fill:"url(#x-dark)"},g);
  E("polygon",{points:`0,0 ${BX0},${BY0} ${BX0},${BY1} 0,${H}`, fill:"url(#h-mid)"},g);
  E("polygon",{points:`${W},0 ${BX1},${BY0} ${BX1},${BY1} ${W},${H}`, fill:"url(#h-light)"},g);
  // ceiling beams
  for(let k=1;k<6;k++){ const t=k/6; L(g, W*t, 0, BX0+(BX1-BX0)*t, BY0, 1.6); }
  // back wall: courses of cut stone
  const shape = room.shape || "square";
  for(let y=BY0+22, row=0; y<BY1; y+=22, row++){
    L(g,BX0,y,BX1,y,.9);
    for(let x=BX0+(row%2?0:30); x<BX1; x+=60+R()*8) if(R()>.15) L(g,x,y-22,x,y,.9);
  }
  E("polygon",{points:`${BX0},${BY0} ${BX1},${BY0} ${BX1},${BY0+10} ${BX0},${BY0+10}`,fill:"url(#h-dark)"},g);
  // floor: planks, staggered joints, shadow at the wall
  const planks=[]; for(let i=-7;i<=7;i++) planks.push([400+i*(BX1-BX0)/14, 400+i*112]);
  planks.forEach(p => L(g,p[0],BY1,p[1],H,1.1));
  for(let i=0;i<planks.length-1;i++) for(let k=0;k<3;k++){ const s=.08+R()*.9, y=BY1+(H-BY1)*s;
    const xa=planks[i][0]+(planks[i][1]-planks[i][0])*s, xb=planks[i+1][0]+(planks[i+1][1]-planks[i+1][0])*s; L(g,xa,y,xb,y,1); }
  E("polygon",{points:`${BX0},${BY1} ${BX1},${BY1} ${BX1+16},${BY1+12} ${BX0-16},${BY1+12}`,fill:"url(#h-light)"},g);
  E("polygon",{points:`0,${H} ${BX0},${BY1} ${BX0-16},${BY1+12} 0,${H-60}`,fill:"url(#h-mid)",opacity:.0},g);
  // shapes
  if(shape==="hex"||shape==="oct"){ const a = shape==="hex"? [330,470] : [280,350,450,520];
    E("rect",{x:BX0,y:BY0,width:a[0]-BX0,height:BY1-BY0,fill:"url(#h-light)"},g);
    E("rect",{x:a[a.length-1],y:BY0,width:BX1-a[a.length-1],height:BY1-BY0,fill:"url(#h-rev)"},g);
    a.forEach(x => { E("rect",{x:x-5,y:BY0,width:10,height:BY1-BY0,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1.6},g); L(g,x+2,BY0,x+2,BY1,.8); }); }
  if(shape==="round"){
    E("path",{d:`M${BX0},${BY0+56} Q400,${BY0-62} ${BX1},${BY0+56} L${BX1},${BY0} L${BX0},${BY0} Z`,fill:"url(#x-dark)"},g);
    E("path",{d:`M${BX0},${BY0+56} Q400,${BY0-62} ${BX1},${BY0+56}`,fill:"none",stroke:"var(--ink)","stroke-width":2.4},g);
    for(let k=1;k<12;k++){ const t=k/12, x=BX0+(BX1-BX0)*t, y=(1-t)*(1-t)*(BY0+56)+2*t*(1-t)*(BY0-62)+t*t*(BY0+56); L(g,x,y,400+(x-400)*1.08,y-12,1.2); }
  }
  // contours
  [[0,0,BX0,BY0],[W,0,BX1,BY0],[0,H,BX0,BY1],[W,H,BX1,BY1]].forEach(l=>L(g,l[0],l[1],l[2],l[3],2.6));
  E("rect",{x:BX0,y:BY0,width:BX1-BX0,height:BY1-BY0,fill:"none",stroke:"var(--ink)","stroke-width":2.6},g);
  return g;
}
function decor(room, svg, light, mirror){
  const d = room.decor || [], R = rng(hash(room.id)), night = light==="night";
  const g = E("g", Object.assign({filter:"url(#rough)"}, mirror ? {transform:`translate(${W},0) scale(-1,1)`} : {}), svg);
  if(d.includes("glacier")){
    for(let i=0;i<12;i++){ const x=BX0+20+R()*(BX1-BX0-40); L(g,x,BY0+10,x+(R()-.5)*30,BY0+40+R()*120,.7); }
    for(let i=0;i<26;i++){ const x=20+i*30+R()*10, h=12+R()*30, y0=(x<BX0?BY0*x/BX0:x>BX1?BY0*(W-x)/(W-BX1):BY0);
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
    const wx=212, wy=98, ww=56, wh=70, path=`M${wx},${wy+wh} V${wy+20} A${ww/2},20 0 0 1 ${wx+ww},${wy+20} V${wy+wh} Z`;
    const sk = skyNow(), rel = a => ((a - facing() + 540) % 360) - 180;
    const sunRel = rel(sk.sun.az), moonRel = rel(sk.moon.az), dark = sk.sun.alt < -6;
    E("path",{d:`M${wx-6},${wy+wh+6} V${wy+18} A${ww/2+6},24 0 0 1 ${wx+ww+6},${wy+18} V${wy+wh+6} Z`,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g);
    E("path",{d:path,fill:dark?"#0d0c0b":(sk.sun.alt<0?"url(#s-dark)":"url(#s-hz)"),stroke:"var(--ink)","stroke-width":2},g);
    const inWin = (alt, r) => [wx + ww/2 + Math.max(-1,Math.min(1,r/60))*(ww/2-9), wy + wh - 10 - Math.max(0,Math.min(1,alt/50))*(wh-26)];
    if(dark){ for(let i=0;i<8;i++){ const x=wx+6+R()*(ww-12), y=wy+14+R()*(wh-20), r=1.2+R()*1.5; L(g,x-r,y,x+r,y,1,{stroke:"#F4EFE2"}); L(g,x,y-r,x,y+r,1,{stroke:"#F4EFE2"}); } }
    if(sk.moon.alt>0 && Math.abs(moonRel)<70){ const [mx,my]=inWin(sk.moon.alt,moonRel), p=sk.moon.phase;
      E("circle",{cx:mx,cy:my,r:7,fill:"#F4EFE2",stroke:"var(--ink)","stroke-width":.8},g); E("circle",{cx:mx + (p<.5 ? -28*p : 28*(1-p)), cy:my, r:7.4, fill:dark?"#0d0c0b":"url(#s-hz)"},g); }
    if(sk.sun.alt>-2 && Math.abs(sunRel)<70){ const [sx,sy]=inWin(sk.sun.alt,sunRel);
      for(let k=0;k<12;k++){ const t=k/12*2*Math.PI; L(g,sx+Math.cos(t)*9,sy+Math.sin(t)*9,sx+Math.cos(t)*(k%2?12:15),sy+Math.sin(t)*(k%2?12:15),1.1); }
      E("circle",{cx:sx,cy:sy,r:7,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1.4},g); }
    L(g,wx+ww/2,wy+4,wx+ww/2,wy+wh,2); L(g,wx,wy+wh*.55,wx+ww,wy+wh*.55,2);
    // a beam of sun (or full moon) on the floor
    const src = (sk.sun.alt>2 && Math.abs(sunRel)<80) ? {alt:sk.sun.alt, rel:sunRel} : (dark && sk.moon.alt>5 && Math.abs(moonRel)<80 && Math.abs(sk.moon.phase-.5)<.2) ? {alt:sk.moon.alt, rel:moonRel, moon:true} : null;
    LIGHT.beam = src;
    if(src){ const dy = Math.max(24, Math.min(150, 60/Math.tan(src.alt*DEG))), dx = Math.max(-220, Math.min(220, -Math.tan(src.rel*DEG)*dy*1.3));
      const pts = `${wx},${BY1} ${wx+ww},${BY1} ${wx+ww+dx+10},${BY1+dy} ${wx+dx-10},${BY1+dy}`;
      E("polygon",{points:pts,fill:"url(#beam)",opacity:src.moon?.6:.9},g);
      L(g,wx,wy+wh,wx+dx-10,BY1+dy,.6,{"stroke-dasharray":"2 5",opacity:.6}); L(g,wx+ww,wy+20,wx+ww+dx+10,BY1+dy,.6,{"stroke-dasharray":"2 5",opacity:.6}); }
  }
  if(d.includes("sky")){ const sg = E("g",{},svg); drawSky(sg, 400, 158, 118, {tag:"c", names:false}); }
  if(d.includes("stars")){ for(let i=0;i<34;i++){ const x=R()*W, y=R()*BY0*.9; if(y < BY0*Math.min(x/BX0,(W-x)/(W-BX1),1)-4){ const r=1.5+R()*2.5;
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
    const cx=282, cy=160, r=36, d0=now(), hh=d0.getHours()%12 + d0.getMinutes()/60;
    E("circle",{cx,cy,r:r+5,fill:"url(#s-hatch)",stroke:"var(--ink)","stroke-width":2},g);
    E("circle",{cx,cy,r,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g);
    for(let i=0;i<12;i++){ const t=i/12*2*Math.PI; T(i===0?"10":"0123456789↊↋"[i],{x:cx+Math.sin(t)*(r-9),y:cy-Math.cos(t)*(r-9)+3.5,"text-anchor":"middle","font-size":9,fill:"var(--ink)","font-family":"IM Fell English, serif"},g); }
    const a=hh/12*2*Math.PI, m=d0.getMinutes()/60*2*Math.PI;
    L(g,cx,cy,cx+Math.sin(a)*r*.5,cy-Math.cos(a)*r*.5,3.4); L(g,cx,cy,cx+Math.sin(m)*r*.8,cy-Math.cos(m)*r*.8,1.6);
    E("circle",{cx,cy,r:2.5,fill:"var(--ink)"},g);
  }
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
function render(){
  const room = effective(cur), id = String(room.id); LIGHT = {};
  const light = lightNow();
  document.documentElement.setAttribute("data-light", light);
  document.documentElement.setAttribute("data-ink", S.ink==="1bit" ? "1bit" : "two");
  if(S.ink==="1bit") document.documentElement.style.removeProperty("--spot"); else document.documentElement.style.setProperty("--spot", wingColor(room));
  $("cardt").textContent = `Card ${room.label||id} of ${P.rooms.length}`;
  $("b-ink").textContent = S.ink==="1bit" ? "Ink: 1-bit" : "Ink: two-color";
  $("b-primer").style.display = S.inv.includes("primer") ? "" : "none";
  const mirror = S.frame[1]===1;
  // header
  $("rnum").textContent = room.label || id;
  $("rname").innerHTML = mirror ? `<span class="mirror-text" title="${esc(room.name||"")}">${esc(room.name||"")}</span>` : esc(room.name||"");
  $("rwing").textContent = (WINGS[room.wing] && WINGS[room.wing].name) || "";
  document.title = `${room.label||id} · ${room.name||"The Palace"}`;
  statusBar(light);
  // scene
  const stage = $("stage"); stage.innerHTML = "";
  const svg = E("svg",{viewBox:`0 0 ${W} ${H}`, role:"img", "aria-label":`Room ${id}: ${room.name||""}`}, stage);
  drawRoom(room, svg, light);
  decor(room, svg, light, mirror);
  const doors = (room.doors||[]).filter(d => visible(d, room));
  const byWall = [[],[],[],[]];
  doors.forEach((d,i) => { const w0 = d.wall!=null ? WALLS[d.wall] : [1,0,2][i%3]; byWall[act(S.frame, w0)].push(d); });
  byWall.forEach((list, w) => list.forEach((d, i) => drawDoor(svg, room, d, w, i, list.length, mirror)));
  const objs = (room.objects||[]).filter(o => visible(o, room) && !(o.kind==="key" && S.inv.includes(o.item)));
  let shown = objs;
  if(objs.length>6){ shown = objs.slice(0,5).concat([{title:`+${objs.length-5} more on the shelves`, short:`+${objs.length-5} more`, icon:"books", more:true}]); }
  const ordered = mirror ? shown.slice().reverse() : shown;
  ordered.forEach((o,i) => drawObject(svg, room, o, i, ordered.length, mirror));
  // text
  const visits = S.visits[id]||0;
  let html = (room.text||"").split(/\n+/).filter(Boolean).map(p=>`<p>${p}</p>`).join("");
  if(visits>1 && room.again) html += `<p class="again">${room.again}</p>`;
  if(mirror && room.mirror) html += `<p class="again">${room.mirror}</p>`;
  (room.notes||[]).forEach(n => { if(visible(n, room)) html += `<p class="again">${n.text}</p>`; });
  $("rtext").innerHTML = html;
  // door list
  const dl = $("doors"); dl.innerHTML = "";
  if(!doors.length) dl.innerHTML = `<li class="note">No doors you can see. Try the map.</li>`;
  doors.forEach(d => {
    const w = act(S.frame, d.wall!=null ? WALLS[d.wall] : [1,0,2][(room.doors||[]).filter(x=>visible(x,room)).indexOf(d)%3]);
    const li = document.createElement("li"), b = document.createElement("button");
    b.type="button"; b.className="doorbtn";
    const lab = doorLabel(d, room), isOpen = open(d, room);
    b.innerHTML = `${isOpen?"":"🔒 "}Door ${esc(lab)} <span class="note">${WALLNAME[w]}${d.title? " · "+esc(d.title):""}</span>`;
    b.onclick = () => tryDoor(d, room);
    li.appendChild(b);
    if(!isOpen && d.hint) { const h=document.createElement("div"); h.className="note"; h.textContent=d.hint; li.appendChild(h); }
    dl.appendChild(li);
  });
  // object list
  const ol = $("objects"); ol.innerHTML = "";
  if(!objs.length) ol.innerHTML = `<li class="note">Nothing here, or nothing yet.</li>`;
  objs.forEach(o => {
    const li = document.createElement("li");
    const kind = o.kind || "device";
    const t = o.href ? `<a href="${esc(o.href)}">${esc(o.title)}</a>` : (kind==="key"||o.to||o.action) ? `<a href="#" data-obj="1">${esc(o.title)}</a>` : `<b>${esc(o.title)}</b>`;
    li.innerHTML = `<span class="k">${esc(kind)}</span>${t}${o.by? ` <span class="note">· ${esc(o.by)}</span>`:""}${o.note? `<div class="note">${o.note}</div>`:""}`;
    const a = li.querySelector("[data-obj]"); if(a) a.onclick = e => { e.preventDefault(); useObject(o, room); };
    ol.appendChild(li);
  });
  // pockets
  $("invpanel").style.display = S.inv.length ? "" : "none";
  $("inv").textContent = S.inv.map(k => (P.items && P.items[k]) || k).join(", ");
  // widget
  const wd = $("widget"); wd.innerHTML = ""; stopTimers();
  if(room.widget){ const spec = typeof room.widget==="string" ? {type:room.widget} : room.widget; (WIDGETS[spec.type]||(()=>{}))(wd, spec, room); }
}
function doorLabel(d, room){ if(d.label) return d.label; if(Array.isArray(d.to)) return "⟳"; if(d.to==="random") return "?"; if(d.to==="back") return "←"; return String(d.to); }
function drawDoor(svg, room, d, w, i, n, mirror){
  const lab = doorLabel(d, room), isOpen = open(d, room);
  const g = E("g",{},svg);
  const fill = isOpen ? "var(--void)" : "url(#x-dark)";
  if(w===1){
    const span = BX1-BX0, cx = BX0 + span*(i+1)/(n+1), hw = Math.min(36, span/(n+1)/2.4);
    E("path",{d:`M${cx-hw-7},${BY1} V${BY1-110} A${hw+7},${hw+7} 0 0 1 ${cx+hw+7},${BY1-110} V${BY1} Z`,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g);
    for(let k=0;k<9;k++){ const t=Math.PI*(k/8); g.appendChild(E("line",{x1:cx+Math.cos(Math.PI+t)*hw,y1:BY1-110-Math.sin(t)*hw,x2:cx+Math.cos(Math.PI+t)*(hw+7),y2:BY1-110-Math.sin(t)*(hw+7),stroke:"var(--ink)","stroke-width":1})); }
    E("path",{d:`M${cx-hw},${BY1} V${BY1-110} A${hw},${hw} 0 0 1 ${cx+hw},${BY1-110} V${BY1} Z`,fill,class:"hl",stroke:"var(--ink)","stroke-width":2.4},g);
    if(isOpen) E("path",{d:`M${cx-hw+5},${BY1} V${BY1-108} A${hw-5},${hw-5} 0 0 1 ${cx-2},${BY1-110-hw+5}`,fill:"none",stroke:"var(--paper)","stroke-width":1},g);
    else { E("circle",{cx:cx,cy:BY1-58,r:7,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1.5},g); E("path",{d:`M${cx-2},${BY1-58} h4 l2,9 h-8 Z`,fill:"var(--ink)"},g); }
    plaque(g, cx, BY1-110-hw-20, lab);
  } else if(w===0 || w===2){
    const fn = w===0 ? leftPt : rightPt;
    const c = .5 + (i-(n-1)/2) * Math.min(.32, .8/n), du = Math.min(.12, .5/n);
    const fa=fn(c-du-.025,0), fb=fn(c-du-.025,.67), fc=fn(c+du+.025,.67), fd=fn(c+du+.025,0);
    E("polygon",{points:[fa,fb,fc,fd].map(p=>p.join(",")).join(" "),fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g);
    const a=fn(c-du,0), b=fn(c-du,.62), cc=fn(c+du,.62), dd=fn(c+du,0);
    E("polygon",{points:[a,b,cc,dd].map(p=>p.join(",")).join(" "),fill,class:"hl",stroke:"var(--ink)","stroke-width":2.4},g);
    if(isOpen){ const e1=fn(c-du+.02,.02), e2=fn(c-du+.02,.58); E("line",{x1:e1[0],y1:e1[1],x2:e2[0],y2:e2[1],stroke:"var(--paper)","stroke-width":1},g); }
    const top = fn(c,.76); plaque(g, top[0], top[1], lab);
  } else {
    const cx = 72 + i*130;
    E("rect",{x:cx-58,y:H-36,width:116,height:28,fill:"var(--paper)",stroke:"var(--ink)",class:"hl","stroke-width":2},g);
    E("rect",{x:cx-54,y:H-32,width:108,height:20,fill:"none",stroke:"var(--ink)","stroke-width":.7},g);
    T(`☞ behind you · ${lab}`,{x:cx,y:H-17,"text-anchor":"middle","font-size":13,fill:"var(--ink)","font-family":"IM Fell English, serif"},g);
  }
  hot(g, `Door ${lab}${isOpen?"":" (locked)"}`, () => tryDoor(d, room));
  function plaque(g,x,y,txt){
    E("rect",{x:x-19,y:y-12,width:38,height:23,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":1.8},g);
    E("rect",{x:x-16,y:y-9,width:32,height:17,fill:"none",stroke:"var(--ink)","stroke-width":.6},g);
    const t = T(txt,{x:x,y:y+5,"text-anchor":"middle","font-size":15,fill:"var(--ink)","font-family":"IM Fell English SC, IM Fell English, serif"},g);
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
function useObject(o, room){
  if(o.more){ $("objects").scrollIntoView({behavior:"smooth",block:"center"}); return; }
  if(o.kind==="key"){ if(!S.inv.includes(o.item)){ S.inv.push(o.item); save(); toast(o.take || `You pocket ${o.title}.`); render(); } return; }
  if(o.action==="map") return mapView();
  if(o.action==="primer"){ if(o.item && !S.inv.includes(o.item)){ S.inv.push(o.item); save(); render(); toast("You take the Primer. It will travel with you (see the menu bar)."); } return primerView(); }
  if(o.action==="catalogue") return catalogueView();
  if(o.action==="ranks"){ overlay("Ranks of the library",""); WIDGETS.rank($("ovb")); return; }
  if(o.to){ if(o.say) toast(o.say); move(String(o.to), o.turn, room); return; }
  if(o.href){ location.href = o.href; return; }
  toast(o.note ? o.note.replace(/<[^>]+>/g,"") : o.title);
}
function statusBar(light){
  const ri = rankIndex(), rk = RANKS[ri], g = S.frame;
  const f = `<svg class="gnomon" viewBox="-14 -14 28 28" aria-hidden="true"><rect x="-13" y="-13" width="26" height="26" rx="4" fill="none" stroke="currentColor" opacity=".4"/><g transform="rotate(${90*g[0]}) scale(${g[1]?-1:1},1)"><path d="M-4,8 V-8 H6 M-4,0 H4" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round"/></g></svg>`;
  const icon = {night:"☾",dawn:"◒",day:"☀",dusk:"◓"}[light];
  $("status").innerHTML = `<span class="chip"><span class="vest" style="background:${rk.color}"></span>${esc(rk.name)}</span>
    <span class="chip" title="Your frame: how the palace has turned you. Loops can leave you turned.">${f} facing ${nameG(g)}</span>
    <span class="chip">${icon} ${light}${S.light!=="auto"?" (lamps)":""}</span>
    <span class="chip">remembered ${seen()}/${P.rooms.filter(r=>!r.secret).length}</span>
    ${S.showAll? '<span class="chip warn">curator: all doors open</span>':""}`;
}

/* ---------- movement ---------- */
let planned = null;
function tryDoor(d, room){
  if(!open(d, room)){
    if(d.riddle && !S.solved[d.riddle.id] && cond(d.needs, room)) return riddle(d, room);
    toast(d.hint || "The door will not open. Not yet, anyway."); return;
  }
  const t = target(d, room);
  if(!ROOMS[t]){ toast("This door opens onto a wall. (Room "+t+" isn't built yet.)"); return; }
  if(d.say) toast(d.say);
  move(t, d.turn, room);
}
function move(t, turn, from){
  S.frame = mul(S.frame, parseG(turn));
  if(from){ const k = from.id+">"+t; S.edges[k] = 1; }
  S.steps++;
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
  const before = rankIndex.cache, ri = rankIndex();
  if(before!=null && ri>before) toast(`You are now ${RANKS[ri].name}.`);
  rankIndex.cache = ri;
  save(); randomPick = {};
  render(); window.scrollTo({top:0,behavior:"smooth"});
}
function route(){
  const h = decodeURIComponent(location.hash.slice(1));
  if(h==="curator"){ S.curator=true; save(); history.replaceState(null,"","#"+(cur?cur.id:START)); if(!cur) arrive(START); curatorView(); return; }
  const id = h || START;
  if(planned === id){ planned = null; arrive(id); return; }
  planned = null;
  // arrived by memory (map, back button, typed URL): restore the frame you last had there
  S.frame = (S.frames[id] || [0,0]).slice();
  arrive(id);
}
window.addEventListener("hashchange", route);

/* ---------- riddles ---------- */
function riddle(d, room){
  const r = d.riddle;
  overlay("A question at the door", `<p class="text">${r.q}</p><div class="widget row"><input id="ra" autocomplete="off"> <button class="btn primary" id="rb" type="button">Answer</button></div><p class="note" id="rn"></p>`);
  const go = () => {
    const a = $("ra").value.trim().toLowerCase().replace(/\s+/g," ");
    const ok = [].concat(r.a).map(x=>String(x).toLowerCase()).includes(a);
    if(ok){ S.solved[r.id]=1; save(); closeOv(); toast(r.yes || "The door unlatches."); render(); }
    else $("rn").textContent = r.no || "Nothing happens.";
  };
  $("rb").onclick = go; $("ra").onkeydown = e => { if(e.key==="Enter") go(); }; $("ra").focus();
}

/* ---------- overlays ---------- */
function overlay(title, html){ $("ovt").textContent=title; $("ovb").innerHTML=html; $("ov").classList.add("open"); }
function closeOv(){ $("ov").classList.remove("open"); }
$("ovx").onclick = closeOv; $("ov").onclick = e => { if(e.target.id==="ov") closeOv(); };
document.addEventListener("keydown", e => { if(e.key==="Escape") closeOv(); });

function mapView(){
  const all = S.showAll;
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
    const T2 = ROOMS[t]; if(!r.at || !T2 || !T2.at) return;
    const k=[r.id,t].sort().join("~"); if(drawn.has(k)) return;
    const walked = S.edges[r.id+">"+t] || S.edges[t+">"+r.id];
    const show = all || walked || (known.has(String(r.id)) && (known.has(t)||fringe.has(t)));
    if(!show) return; drawn.add(k);
    const a=px(r), b=px(T2);
    s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="var(--ink)" stroke-width="${walked?3:1}" ${walked?"":'stroke-dasharray="2 4"'}/>`;
  })));
  P.rooms.forEach(r => {
    if(!r.at) return; const id=String(r.id), k=known.has(id), f=fringe.has(id);
    if(!(all||k||f)) return;
    const [x,y]=px(r), c = (WINGS[r.wing]&&WINGS[r.wing].color)||"#A77E22", here = cur && String(cur.id)===id;
    s += `<g ${k||all?`class="mapgo" data-id="${id}" style="cursor:pointer"`:""}><rect x="${x-17}" y="${y-15}" width="34" height="30" fill="${here?"var(--spot)":k||all?"var(--ink)":"var(--paper2)"}" stroke="var(--ink)" stroke-width="2" ${f&&!k&&!all?'stroke-dasharray="3 3"':""}/>${here?`<rect x="${x-21}" y="${y-19}" width="42" height="38" fill="none" stroke="var(--ink)" stroke-width="1.5"/>`:""}
      <text x="${x}" y="${y+5}" text-anchor="middle" font-family="IM Fell English SC, serif" font-size="17" fill="${k||all?"var(--paper2)":"var(--muted)"}">${k||all?esc(r.label||id):"?"}</text>
      ${k||all?`<text x="${x}" y="${y+31}" text-anchor="middle" font-family="Pixelify Sans, monospace" font-size="10" fill="var(--ink)">${esc((r.name||"").replace(/^The /,"").slice(0,16))}</text>`:""}</g>`;
  });
  s += `</svg><p class="note">Heavy lines are corridors you have walked. Dotted boxes are doors you have seen but not opened. Click a remembered room to return to it the way you first remember it, facing as you did then.</p>`;
  overlay("The map, as far as you remember it", s);
  document.querySelectorAll(".mapgo").forEach(el => el.addEventListener("click", () => { closeOv(); location.hash = el.dataset.id; }));
}
function catalogueView(){
  let items = [];
  P.rooms.forEach(r => (r.objects||[]).forEach(o => { if(o.kind!=="key" && !o.hide) items.push({o, r}); }));
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
  overlay("Catalogue", `<p class="note">Everything on the shelves, without the walking. Room numbers lead into the palace.</p><div class="widget row"><input id="catq" placeholder="search" style="width:260px"></div><div id="catl"></div>`);
  $("catq").oninput = e => draw(e.target.value); draw("");
}
function helpView(){
  overlay("How to walk the palace", `<div class="text">${P.help || ""}
  <p><b>Doors</b> are numbered. Click a door in the picture or in the list. Some doors appear only at certain hours, after certain rooms, or when you are facing a certain way.</p>
  <p><b>Facing.</b> Some corridors turn you, and some flip you as in a mirror. The small F in the top bar shows your frame, an element of the symmetry group of a square. Walk a loop and you may come back turned: that is holonomy. Some things can only be seen in a mirror.</p>
  <p><b>Time.</b> The palace keeps your local time. Light changes through the day, and a few rooms change with the hour or the moon. The Lamps button overrides the light.</p>
  <p><b>Rank.</b> The more rooms you remember, the higher your librarian's rank. Some stacks are closed to beginners.</p>
  <p><b>Memory.</b> The map remembers where you have been, in this browser only. The catalogue lists everything plainly.</p></div>
  <div class="row widget"><button class="btn" id="forget" type="button">Forget my walk</button></div>`);
  $("forget").onclick = () => { const c=S.curator; S = blank(); S.curator=c; save(); closeOv(); location.hash = START; route(); toast("The palace forgets you, politely."); };
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
    <p class="note">This view checks the data file and shows you the palace as the builder sees it. Visitors never see it unless they type #curator.</p>
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
    ${hol.length? "<ul>"+hol.map(h=>`<li class="mono">loop through ${h[0]} → ${h[1]}: ${h[2]}</li>`).join("")+"</ul>" : "<p class='note'>Every loop closes up flat. Nothing in the palace is twisted.</p>"}
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
  const t0 = Date.now();
  el.innerHTML = `<div class="panel"><h3>The pendulum, from above</h3>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
    <svg viewBox="-110 -110 220 220" width="220" height="220" aria-label="Top view of the swing plane"><circle r="100" fill="none" stroke="var(--line)"/>${Array.from({length:36},(_,i)=>{const a=i*10*Math.PI/180;return `<line x1="${95*Math.cos(a)}" y1="${95*Math.sin(a)}" x2="${(i%9?100:88)*Math.cos(a)}" y2="${(i%9?100:88)*Math.sin(a)}" stroke="var(--muted)"/>`;}).join("")}
    <text x="0" y="-80" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="IM Fell English SC, serif">N</text>
    <line id="pl" x1="-90" y1="0" x2="90" y2="0" stroke="var(--accent)" stroke-width="3"/><line id="pl0" x1="-90" y1="0" x2="90" y2="0" stroke="var(--brass)" stroke-dasharray="3 5"/><circle r="4" fill="var(--ink)"/></svg>
    <div class="mono" style="font-size:14px;line-height:1.7">latitude ${lat.toFixed(2)}° N<br>turns ${rate.toFixed(2)}° per hour (clockwise)<br>one full turn every ${(360/rate).toFixed(1)} hours<br><span id="pt"></span></div></div>
    <p class="note">The dashed line is where the plane pointed when you walked in. The red line is where it points now. Stay a while.</p></div>`;
  const tick = () => {
    const hrs = Date.now()/36e5, ang = (hrs*rate) % 180, since = (Date.now()-t0)/36e5*rate;
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
    if(worst && spec.award && !S.inv.includes(spec.award)){ S.inv.push(spec.award); save(); toast(spec.awardText || "Something golden falls from the last square into your pocket."); render(); }
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
    <p class="note">Looking straight up, with north at the top and east on the left, as a sky chart should be. The circle is the horizon. The projection is stereographic, the stereonet's projection, so every circle in the sky stays a circle. The chart turns with you: if the palace has turned you, the dome turns too, and in a mirror it is reversed, the way the ceiling of Grand Central was painted.</p>
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
      if(right){ S.solved.knightsCount = (S.solved.knightsCount||0)+1; if(S.solved.knightsCount>=need) S.solved.island = 1; save(); }
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
  const L2 = P.primer || {}, order = P.rooms.filter(r=>!r.secret).map(r=>String(r.id));
  const unseen = order.filter(id => !S.visits[id]);
  const secret = P.rooms.filter(r=>r.secret && !S.visits[r.id]).map(r=>String(r.id));
  let pick = unseen.find(id => L2[id]) || unseen[0] || secret[0];
  const here = String(cur.id), lessonHere = L2[here];
  const n = Object.keys(S.visits).length;
  let html = `<div class="text" style="max-width:640px;margin:0 auto">`;
  html += `<p>Once there was a reader called <b>${esc(name)}</b>, who had wandered through ${n} room${n===1?"":"s"} of a palace that was larger inside than out.</p>`;
  if(lessonHere) html += `<p><i>Here, in ${esc(cur.name)}:</i> ${lessonHere.lesson}</p>${lessonHere.q?`<p><b>The book asks:</b> ${lessonHere.q}</p><details><summary class="note">turn the page for the answer</summary><p>${lessonHere.a||""}</p></details>`:""}`;
  if(pick){ const r = ROOMS[pick], ls = L2[pick];
    html += `<p>${esc(name)} had not yet seen <b>${esc(r.name)}</b>${ls? ", where " + ls.teaser : ""}. The page shows a small picture of a door with the number ${esc(r.label||r.id)} on it.</p>
    <div class="row"><button class="btn primary" id="pr-go" type="button">Touch the picture</button></div>`;
  } else html += `<p>${esc(name)} had seen every room, even the hidden ones. The last page is still blank, which is the book's way of asking for a new room.</p>`;
  html += `<p class="note">The book rewrites itself for whoever holds it. Close it and open it again somewhere else.</p></div>`;
  overlay(`A Young Lady's Illustrated Primer · for ${name}`, html);
  const b = $("pr-go"); if(b) b.onclick = () => { closeOv(); toast("The picture swallows you, gently."); move(pick, "e", null); };
}

/* ---- a palace alethiometer: three hands set a question, the needle answers ---- */
const SYMBOLS = [["hourglass",7],["key",16],["lock",10],["compass",4],["lamp",1],["pendulum",7],["lily",19],["crystal",12],["tree",14],["tile",11],["card",9],["mirror",8],
 ["stair",13],["clock",17],["whale",15],["railroad",15],["φ",16],["die",27],["owl",22],["serpent",12],["star",4],["moon",4],["sun",3],["spiral",13],
 ["hexagon",18],["bell",17],["quill",21],["anchor",19],["wheel",2],["labyrinth",23],["scale",3],["ladder",13],["eye",5],["seed",29],["sphere",8],["door",1]];
WIDGETS.oracle = (el) => {
  const hands = [0,12,24];
  el.innerHTML = `<div class="panel"><h3>The palace alethiometer</h3>
    <svg id="al-s" viewBox="-170 -170 340 340" style="width:100%;max-width:380px;display:block;margin:0 auto" role="img" aria-label="A dial of 36 symbols with three hands and a needle"></svg>
    <div class="row">${[0,1,2].map(k=>`<label class="mono">hand ${k+1} <select id="al-h${k}">${SYMBOLS.map((s,j)=>`<option value="${j}" ${j===hands[k]?"selected":""}>${s[0]}</option>`).join("")}</select></label>`).join("")}</div>
    <div class="row"><button class="btn primary" id="al-a" type="button">Ask</button></div><div id="al-o" class="text"></div>
    <p class="note">Thirty-six symbols, each meaning many things, in honor of Pullman's instrument. This one knows only the palace, and it answers with a room.</p></div>`;
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
$("b-primer").onclick = primerView;
$("b-ink").onclick = () => { S.ink = S.ink==="1bit" ? "two" : "1bit"; save(); render(); toast(S.ink==="1bit" ? "Black ink only, as on a 1-bit screen." : "A second block of color, wing by wing."); };
$("b-close").onclick = () => { location.hash = START; };
const mclock = () => { const d=now(); $("mclock").textContent = d.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}); };
mclock(); setInterval(mclock, 20000);
$("b-lamp").onclick = () => { S.light = {auto:"night", night:"day", day:"auto"}[S.light] || "auto"; save(); render(); toast(S.light==="auto" ? "Lamps follow the clock again." : S.light==="night" ? "You turn the lamps down." : "You light every lamp."); };
rankIndex.cache = null;
route();
if(S.curator && location.hash!=="#curator") { /* stay quiet; the office opens on #curator */ }
})();
