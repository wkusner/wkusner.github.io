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
function drawRoom(room, svg, light){
  const wc = wingColor(room), night = light==="night";
  const g = E("g", {}, svg);
  E("rect",{x:0,y:0,width:W,height:H,fill:"var(--wall)"},g);
  E("polygon",{points:`0,0 ${W},0 ${BX1},${BY0} ${BX0},${BY0}`, fill:"#000", "fill-opacity":night?.25:.10},g);
  E("polygon",{points:`0,0 ${BX0},${BY0} ${BX0},${BY1} 0,${H}`, fill:"#000", "fill-opacity":night?.18:.07},g);
  E("polygon",{points:`${W},0 ${BX1},${BY0} ${BX1},${BY1} ${W},${H}`, fill:"#000", "fill-opacity":night?.22:.11},g);
  E("rect",{x:BX0,y:BY0,width:BX1-BX0,height:BY1-BY0,fill:wc,"fill-opacity":.10},g);
  E("polygon",{points:`0,${H} ${BX0},${BY1} ${BX1},${BY1} ${W},${H}`, fill:"var(--floor)"},g);
  for(let i=-6;i<=6;i++){ const xb=400+i*95, xt=400+i*(BX1-BX0)/12; E("line",{x1:xt,y1:BY1,x2:xb,y2:H,stroke:"var(--line)","stroke-width":1,opacity:.6},g); }
  [[0,0,BX0,BY0],[W,0,BX1,BY0],[0,H,BX0,BY1],[W,H,BX1,BY1]].forEach(l=>E("line",{x1:l[0],y1:l[1],x2:l[2],y2:l[3],stroke:"var(--line)"},g));
  E("rect",{x:BX0,y:BY0,width:BX1-BX0,height:BY1-BY0,fill:"none",stroke:"var(--line)"},g);
  const shape = room.shape || "square";
  if(shape==="hex"||shape==="oct"){ const a = shape==="hex"? [330,470] : [280,350,450,520];
    a.forEach(x=>E("line",{x1:x,y1:BY0,x2:x,y2:BY1,stroke:"var(--line)"},g));
    E("rect",{x:BX0,y:BY0,width:a[0]-BX0,height:BY1-BY0,fill:"#000","fill-opacity":.05},g);
    E("rect",{x:a[a.length-1],y:BY0,width:BX1-a[a.length-1],height:BY1-BY0,fill:"#000","fill-opacity":.08},g); }
  if(shape==="round"){ E("path",{d:`M${BX0},${BY0+40} Q400,${BY0-70} ${BX1},${BY0+40}`,fill:"none",stroke:"var(--line)","stroke-width":2},g); }
  return g;
}
function decor(room, svg, light, mirror){
  const d = room.decor || [], R = rng(hash(room.id)), night = light==="night";
  const g = E("g", mirror ? {transform:`translate(${W},0) scale(-1,1)`} : {}, svg);
  if(d.includes("glacier")){
    E("rect",{x:0,y:0,width:W,height:H,fill:"#9CC9E8","fill-opacity":night?.10:.18},g);
    for(let i=0;i<26;i++){ const x=20+i*30+R()*10, h=10+R()*28; E("path",{d:`M${x},${(x<BX0?BY0*x/BX0:x>BX1?BY0*(W-x)/(W-BX1):BY0)} l6,${h} l6,${-h}`,fill:"#DDEFFB",opacity:.8},g); }
  }
  if(d.includes("shelves")){
    [leftPt, rightPt].forEach(fn => {
      for(let s=0;s<5;s++){
        const fr = .12 + s*.19;
        const a = fn(.04, fr), b = fn(.96, fr);
        E("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:"var(--muted)","stroke-width":2},g);
        for(let u=.06; u<.94; u+= .018+R()*.02){
          const p = fn(u, fr), q = fn(u, fr + .10 + R()*.05);
          if(R()<.12) continue;
          E("line",{x1:p[0],y1:p[1]-1,x2:q[0],y2:q[1],stroke:["#7A3B2E","#3B5A7A","#5E6B3A","#8C6A2E","#4B3B5E"][Math.floor(R()*5)],"stroke-width":2.2+R()*2,"stroke-linecap":"butt",opacity:.85},g);
        }
      }
    });
  }
  if(d.includes("window")||d.includes("stars")){
    const wx=212, wy=98, ww=56, wh=70;
    E("path",{d:`M${wx},${wy+wh} V${wy+20} A${ww/2},20 0 0 1 ${wx+ww},${wy+20} V${wy+wh} Z`,fill:"var(--sky)",stroke:"var(--ink)","stroke-width":1.5},g);
    if(night){ for(let i=0;i<9;i++) E("circle",{cx:wx+5+R()*(ww-10),cy:wy+12+R()*(wh-16),r:.9+R(),fill:"#FFF7D6"},g);
      const p = moonPhase(now()), mx=wx+ww*.65, my=wy+30;
      E("circle",{cx:mx,cy:my,r:8,fill:"#FFF3C4"},g);
      E("circle",{cx:mx + (p<.5 ? -32*p : 32*(1-p)), cy:my, r:8.4, fill:"var(--sky)"},g);
    } else E("circle",{cx:wx+ww*.7,cy:wy+30,r:9,fill:"#F6D365",opacity:light==="day"?.9:.6},g);
    E("line",{x1:wx+ww/2,y1:wy+6,x2:wx+ww/2,y2:wy+wh,stroke:"var(--ink)"},g);
  }
  if(d.includes("stars")){ for(let i=0;i<40;i++){ const x=R()*W, y=R()*BY0*.9; if(y < BY0*Math.min(x/BX0,(W-x)/(W-BX1),1)) E("circle",{cx:x,cy:y,r:.8+R()*1.2,fill:night?"#FFF7D6":"var(--brass)",opacity:.8},g); } }
  if(d.includes("lamp")){
    E("line",{x1:400,y1:0,x2:400,y2:34,stroke:"var(--ink)"},g);
    E("circle",{cx:400,cy:52,r:night?60:30,fill:"var(--glow)",opacity:night?.25:.12},g);
    E("path",{d:"M384,34 h32 l8,18 h-48 Z",fill:"var(--brass)",stroke:"var(--ink)"},g);
    E("circle",{cx:400,cy:56,r:5,fill:night?"#FFE8A3":"#E9D9A8"},g);
  }
  if(d.includes("rug")) E("polygon",{points:"330,330 470,330 560,420 240,420",fill:wingColor(room),"fill-opacity":.18,stroke:wingColor(room),"stroke-opacity":.5},g);
  if(d.includes("stair")){
    for(let i=0;i<7;i++){ E("ellipse",{cx:400,cy:372-i*5,rx:130-i*15,ry:42-i*5,fill:i===6?"#000":"none","fill-opacity":.55,stroke:"var(--ink)","stroke-width":1,opacity:.7},g); }
    for(let a=0;a<16;a++){ const t=a/16*2*Math.PI; E("line",{x1:400+130*Math.cos(t),y1:372+42*Math.sin(t),x2:400+130*Math.cos(t),y2:372+42*Math.sin(t)-22,stroke:"var(--ink)",opacity:.5},g); }
    E("ellipse",{cx:400,cy:350,rx:130,ry:42,fill:"none",stroke:"var(--brass)","stroke-width":2},g);
  }
  if(d.includes("pool")){
    const cx=400, cy=378, rx=170, ry=48;
    E("ellipse",{cx,cy,rx,ry,fill:"#5E8FA6",opacity:.45,stroke:"var(--ink)"},g);
    const r=11; for(let j=-3;j<=3;j++) for(let i=-9;i<=9;i++){ const x=cx+(i+(j&1)*.5)*2*r, y=cy+j*r*1.732*ry/rx*1.6;
      if(((x-cx)/rx)**2+((y-cy)/ry)**2 < .78) E("ellipse",{cx:x,cy:y,rx:r*.95,ry:r*.95*ry/rx*1.6,fill:"#6E9E4E",stroke:"#2E5A2A","stroke-width":.8},g); }
  }
  if(d.includes("pendulum")){
    E("ellipse",{cx:400,cy:385,rx:150,ry:38,fill:"none",stroke:"var(--brass)","stroke-dasharray":"2 6","stroke-width":3},g);
    const sw = E("g",{class:"swing"},g);
    E("line",{x1:400,y1:0,x2:400,y2:372,stroke:"var(--ink)","stroke-width":1.2},sw);
    E("circle",{cx:400,cy:378,r:13,fill:"var(--brass)",stroke:"var(--ink)"},sw);
    const an = E("animateTransform",{attributeName:"transform",type:"rotate",values:"-7 400 0;7 400 0;-7 400 0",dur:"5.6s",repeatCount:"indefinite",calcMode:"spline",keySplines:".45 0 .55 1;.45 0 .55 1"},sw);
  }
  if(d.includes("clockface")){
    const cx=400, cy=135, r=34, d0=now(), hh=d0.getHours()%12 + d0.getMinutes()/60;
    E("circle",{cx,cy,r,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g);
    for(let i=0;i<12;i++){ const t=i/12*2*Math.PI; T(i===0?"10":"0123456789↊↋"[i],{x:cx+Math.sin(t)*(r-9),y:cy-Math.cos(t)*(r-9)+3.5,"text-anchor":"middle","font-size":8,fill:"var(--ink)","font-family":"IBM Plex Mono"},g); }
    const a=hh/12*2*Math.PI, m=d0.getMinutes()/60*2*Math.PI;
    E("line",{x1:cx,y1:cy,x2:cx+Math.sin(a)*r*.5,y2:cy-Math.cos(a)*r*.5,stroke:"var(--ink)","stroke-width":3},g);
    E("line",{x1:cx,y1:cy,x2:cx+Math.sin(m)*r*.78,y2:cy-Math.cos(m)*r*.78,stroke:"var(--accent)","stroke-width":1.5},g);
  }
  return g;
}

/* ---------- object icons ---------- */
const ICON = {
  rule:(g)=>{ E("rect",{x:-34,y:-8,width:68,height:16,rx:2,fill:"var(--paper)",stroke:"var(--ink)"},g); E("rect",{x:-34,y:-3,width:68,height:6,fill:"var(--brass)",opacity:.35},g); for(let i=0;i<=12;i++) E("line",{x1:-30+i*5,y1:-8,x2:-30+i*5,y2:i%4?-4:-1,stroke:"var(--ink)"},g); E("rect",{x:-6,y:-11,width:10,height:22,fill:"none",stroke:"var(--accent)","stroke-width":1.5},g); },
  net:(g)=>{ E("circle",{r:22,fill:"var(--paper)",stroke:"var(--ink)"},g); for(let i=-2;i<=2;i++){ E("ellipse",{rx:Math.abs(i)*8+.1,ry:22,fill:"none",stroke:"var(--ink)",opacity:.6},g); E("path",{d:`M-22,${i*8} Q0,${i*8+ (i?i*3:0)} 22,${i*8}`,fill:"none",stroke:"var(--ink)",opacity:.5},g);} },
  planimeter:(g)=>{ E("circle",{cx:-24,cy:10,r:3,fill:"var(--ink)"},g); E("line",{x1:-24,y1:10,x2:2,y2:-14,stroke:"var(--ink)","stroke-width":2.5},g); E("line",{x1:2,y1:-14,x2:26,y2:8,stroke:"var(--brass)","stroke-width":2.5},g); E("circle",{cx:10,cy:-7,r:6,fill:"var(--paper)",stroke:"var(--ink)"},g); E("circle",{cx:26,cy:8,r:3,fill:"var(--accent)"},g); },
  cross:(g)=>{ for(let i=-3;i<=3;i++) E("line",{x1:i*10,y1:14,x2:i*3,y2:-16,stroke:"var(--ink)",opacity:.7},g); for(let j=0;j<4;j++){ const y=14-j*(9-j*1.6); E("line",{x1:-32+j*5,y1:y,x2:32-j*5,y2:y,stroke:"var(--accent)"},g);} },
  plant:(g)=>{ E("path",{d:"M-12,4 h24 l-4,16 h-16 Z",fill:"var(--accent)",opacity:.8},g); for(let i=-2;i<=2;i++) E("path",{d:`M0,4 Q${i*9},-10 ${i*14},${-14-Math.abs(i)*-3}`,fill:"none",stroke:"#3E7A4F","stroke-width":3},g); },
  turns:(g)=>{ E("circle",{r:21,fill:"var(--paper)",stroke:"var(--ink)"},g); E("ellipse",{rx:21,ry:7,fill:"none",stroke:"var(--ink)",opacity:.5},g); E("path",{d:"M-15,-6 A18,18 0 0 1 12,-12",fill:"none",stroke:"var(--accent)","stroke-width":3},g); E("path",{d:"M12,-12 A18,18 0 0 1 14,10",fill:"none",stroke:"var(--brass)","stroke-width":3},g); },
  cards:(g)=>{ ["i","j","k"].forEach((s,i)=>{ const c=E("g",{transform:`rotate(${(i-1)*14}) translate(${(i-1)*8},0)`},g); E("rect",{x:-11,y:-17,width:22,height:32,rx:3,fill:"var(--paper)",stroke:"var(--ink)"},c); T(s,{x:0,y:4,"text-anchor":"middle","font-size":15,"font-style":"italic",fill:"var(--accent)","font-family":"IBM Plex Serif"},c); }); },
  lock:(g)=>{ E("path",{d:"M-11,-4 V-12 A11,11 0 0 1 11,-12 V-4",fill:"none",stroke:"var(--ink)","stroke-width":3.5},g); E("rect",{x:-17,y:-4,width:34,height:26,rx:4,fill:"var(--brass)",stroke:"var(--ink)"},g); E("circle",{cy:6,r:3.5,fill:"var(--ink)"},g); E("line",{x1:0,y1:8,x2:0,y2:15,stroke:"var(--ink)","stroke-width":2.5},g); },
  tiles:(g)=>{ for(let i=0;i<4;i++) for(let j=0;j<4;j++){ if(i===3&&j===3) continue; E("rect",{x:-20+j*10,y:-20+i*10,width:9,height:9,fill:(i+j)%2?"var(--paper)":"var(--brass)",stroke:"var(--ink)","stroke-width":.7},g);} },
  crystal:(g)=>{ for(let j=-2;j<=2;j++) for(let i=-3;i<=3;i++){ const x=i*8+(j&1)*4, y=j*7; if(x*x+y*y<480) E("circle",{cx:x,cy:y,r:2.6,fill:(i===1&&j===0)?"var(--accent)":"var(--ink)"},g);} },
  tree:(g)=>{ const br=(x,y,dx,n)=>{ if(!n) return; [-1,1].forEach(s=>{ E("line",{x1:x,y1:y,x2:x+s*dx,y2:y-10,stroke:"var(--ink)"},g); br(x+s*dx,y-10,dx/2,n-1); }); }; E("line",{x1:0,y1:18,x2:0,y2:10,stroke:"var(--ink)"},g); br(0,10,16,3); },
  book:(g)=>{ E("rect",{x:-14,y:-18,width:28,height:36,rx:2,fill:"var(--accent)",stroke:"var(--ink)"},g); E("line",{x1:-9,y1:-18,x2:-9,y2:18,stroke:"var(--ink)",opacity:.5},g); E("rect",{x:-4,y:-9,width:14,height:5,fill:"var(--brass)"},g); },
  books:(g)=>{ ["#7A3B2E","#3B5A7A","#5E6B3A","#8C6A2E"].forEach((c,i)=>E("rect",{x:-22,y:10-i*8,width:44-i*4,height:8,rx:1,fill:c,stroke:"var(--ink)","stroke-width":.6},g)); },
  unwritten:(g)=>{ E("rect",{x:-14,y:-18,width:28,height:36,rx:2,fill:"var(--paper)",stroke:"var(--ink)","stroke-dasharray":"3 3"},g); T("?",{x:0,y:7,"text-anchor":"middle","font-size":20,fill:"var(--muted)","font-family":"IBM Plex Serif"},g); },
  scroll:(g)=>{ E("rect",{x:-18,y:-14,width:36,height:28,fill:"var(--paper)",stroke:"var(--ink)"},g); E("circle",{cx:-18,cy:0,r:4,fill:"var(--brass)"},g); E("circle",{cx:18,cy:0,r:4,fill:"var(--brass)"},g); for(let i=0;i<4;i++) E("line",{x1:-12,y1:-8+i*5,x2:12,y2:-8+i*5,stroke:"var(--muted)"},g); },
  lectern:(g)=>{ E("line",{x1:0,y1:-2,x2:0,y2:22,stroke:"var(--ink)","stroke-width":4},g); E("path",{d:"M-24,-4 L0,-12 L24,-4 L0,4 Z",fill:"var(--paper)",stroke:"var(--ink)"},g); E("line",{x1:0,y1:-12,x2:0,y2:4,stroke:"var(--ink)"},g); },
  clock:(g)=>{ E("circle",{r:20,fill:"var(--paper)",stroke:"var(--ink)","stroke-width":2},g); for(let i=0;i<12;i++){ const t=i/12*2*Math.PI; E("line",{x1:Math.sin(t)*15,y1:-Math.cos(t)*15,x2:Math.sin(t)*19,y2:-Math.cos(t)*19,stroke:"var(--ink)"},g);} E("line",{x1:0,y1:0,x2:0,y2:-12,stroke:"var(--ink)","stroke-width":2},g); E("line",{x1:0,y1:0,x2:9,y2:4,stroke:"var(--accent)","stroke-width":2},g); },
  key:(g)=>{ E("circle",{cx:-14,r:8,fill:"none",stroke:"var(--brass)","stroke-width":4},g); E("line",{x1:-6,y1:0,x2:22,y2:0,stroke:"var(--brass)","stroke-width":4},g); E("line",{x1:16,y1:0,x2:16,y2:8,stroke:"var(--brass)","stroke-width":4},g); E("line",{x1:10,y1:0,x2:10,y2:6,stroke:"var(--brass)","stroke-width":4},g); },
  pond:(g)=>{ E("ellipse",{rx:26,ry:12,fill:"#5E8FA6",opacity:.6},g); [[-12,0],[0,-4],[11,1],[-2,5]].forEach(p=>E("circle",{cx:p[0],cy:p[1],r:5.5,fill:"#6E9E4E",stroke:"#2E5A2A"},g)); },
  fraction:(g)=>{ E("rect",{x:-15,y:-20,width:30,height:40,rx:4,fill:"var(--paper)",stroke:"var(--ink)"},g); T("3",{x:0,y:-4,"text-anchor":"middle","font-size":14,fill:"var(--ink)","font-family":"IBM Plex Mono"},g); E("line",{x1:-7,y1:0,x2:7,y2:0,stroke:"var(--ink)"},g); T("4",{x:0,y:14,"text-anchor":"middle","font-size":14,fill:"var(--ink)","font-family":"IBM Plex Mono"},g); },
  note:(g)=>{ E("path",{d:"M-14,-18 h22 l6,6 v30 h-28 Z",fill:"var(--paper)",stroke:"var(--ink)"},g); for(let i=0;i<4;i++) E("line",{x1:-9,y1:-8+i*6,x2:9,y2:-8+i*6,stroke:"var(--muted)"},g); },
  map:(g)=>{ E("path",{d:"M-24,-14 l16,-4 l16,4 l16,-4 v28 l-16,4 l-16,-4 l-16,4 Z",fill:"var(--paper)",stroke:"var(--ink)"},g); E("path",{d:"M-18,6 q8,-14 16,-4 t16,-6",fill:"none",stroke:"var(--accent)","stroke-dasharray":"2 2"},g); },
  pendulum:(g)=>{ E("line",{x1:0,y1:-22,x2:6,y2:12,stroke:"var(--ink)"},g); E("circle",{cx:6,cy:14,r:6,fill:"var(--brass)",stroke:"var(--ink)"},g); },
  hex:(g)=>{ E("polygon",{points:[0,1,2,3,4,5].map(i=>`${20*Math.cos(i*Math.PI/3)},${20*Math.sin(i*Math.PI/3)}`).join(" "),fill:"var(--paper)",stroke:"var(--ink)"},g); },
  door:(g)=>{ E("path",{d:"M-12,20 V-8 A12,12 0 0 1 12,-8 V20 Z",fill:"#2a2218",stroke:"var(--brass)"},g); },
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
let cur = null;
function render(){
  const room = cur, id = String(room.id);
  const light = lightNow();
  document.documentElement.setAttribute("data-light", light);
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
  const fill = isOpen ? "#241C12" : "#4A3F33";
  if(w===1){
    const span = BX1-BX0, cx = BX0 + span*(i+1)/(n+1), hw = Math.min(36, span/(n+1)/2.4);
    E("path",{d:`M${cx-hw},${BY1} V${BY1-110} A${hw},${hw} 0 0 1 ${cx+hw},${BY1-110} V${BY1} Z`,fill,class:"hl",stroke:"var(--brass)","stroke-width":2},g);
    if(!isOpen) E("circle",{cx:cx,cy:BY1-55,r:5,fill:"var(--brass)"},g);
    plaque(g, cx, BY1-110-hw-14, lab);
  } else if(w===0 || w===2){
    const fn = w===0 ? leftPt : rightPt;
    const c = .5 + (i-(n-1)/2) * Math.min(.32, .8/n), du = Math.min(.12, .5/n);
    const a=fn(c-du,0), b=fn(c-du,.62), cc=fn(c+du,.62), dd=fn(c+du,0);
    E("polygon",{points:[a,b,cc,dd].map(p=>p.join(",")).join(" "),fill,class:"hl",stroke:"var(--brass)","stroke-width":2},g);
    const top = fn(c,.70); plaque(g, top[0], top[1], lab);
  } else {
    const cx = 72 + i*130;
    E("rect",{x:cx-58,y:H-34,width:116,height:26,rx:13,fill:"var(--paper)",stroke:"var(--brass)",class:"hl","stroke-width":2},g);
    T(`↓ behind you · ${lab}`,{x:cx,y:H-16,"text-anchor":"middle","font-size":12,fill:"var(--ink)","font-family":"IBM Plex Mono"},g);
  }
  hot(g, `Door ${lab}${isOpen?"":" (locked)"}`, () => tryDoor(d, room));
  function plaque(g,x,y,txt){
    E("rect",{x:x-17,y:y-11,width:34,height:20,rx:3,fill:"var(--paper)",stroke:"var(--ink)"},g);
    const t = T(txt,{x:x,y:y+4,"text-anchor":"middle","font-size":13,"font-weight":600,fill:"var(--ink)","font-family":"IBM Plex Mono"},g);
    if(mirror) t.setAttribute("transform",`translate(${2*x},0) scale(-1,1)`);
  }
}
function drawObject(svg, room, o, i, n, mirror){
  const x = 400 + (i-(n-1)/2) * Math.min(150, 420/Math.max(n-1,1)), y = n>4 && i%2 ? 352 : 392;
  const g = E("g",{transform:`translate(${x},${y})`},svg);
  E("ellipse",{cx:0,cy:26,rx:34,ry:7,fill:"#000",opacity:.15},g);
  E("rect",{x:-30,y:18,width:60,height:8,rx:2,fill:"var(--brass)",opacity:.6,class:"hl",stroke:"none"},g);
  const ig = E("g",{transform:"translate(0,-6)" + (mirror? " scale(-1,1)":"")},g);
  (ICON[o.icon] || ICON[KIND_ICON[o.kind]] || ICON.box)(ig);
  const t = T(o.short || (o.title.length>22 ? o.title.slice(0,21)+"…" : o.title),{x:0,y:44,"text-anchor":"middle","font-size":12,fill:"var(--ink)","font-family":"IBM Plex Mono"},g);
  if(mirror) t.setAttribute("transform","scale(-1,1)");
  hot(g, o.title, () => useObject(o, room));
}
function useObject(o, room){
  if(o.more){ $("objects").scrollIntoView({behavior:"smooth",block:"center"}); return; }
  if(o.kind==="key"){ if(!S.inv.includes(o.item)){ S.inv.push(o.item); save(); toast(o.take || `You pocket ${o.title}.`); render(); } return; }
  if(o.action==="map") return mapView();
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
    s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${walked?"var(--accent)":"var(--line)"}" stroke-width="${walked?2.5:1.2}" ${walked?"":'stroke-dasharray="4 4"'}/>`;
  })));
  P.rooms.forEach(r => {
    if(!r.at) return; const id=String(r.id), k=known.has(id), f=fringe.has(id);
    if(!(all||k||f)) return;
    const [x,y]=px(r), c = (WINGS[r.wing]&&WINGS[r.wing].color)||"#A77E22", here = cur && String(cur.id)===id;
    s += `<g ${k||all?`class="mapgo" data-id="${id}" style="cursor:pointer"`:""}><circle cx="${x}" cy="${y}" r="${here?20:16}" fill="${k||all?c:"var(--paper)"}" fill-opacity="${k||all?.85:1}" stroke="${here?"var(--glow)":"var(--ink)"}" stroke-width="${here?4:1}" ${f&&!k&&!all?'stroke-dasharray="3 3"':""}/>
      <text x="${x}" y="${y+5}" text-anchor="middle" font-family="IBM Plex Mono" font-size="14" font-weight="600" fill="${k||all?"#fff":"var(--muted)"}">${k||all?esc(r.label||id):"?"}</text>
      ${k||all?`<text x="${x}" y="${y+31}" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" fill="var(--muted)">${esc((r.name||"").replace(/^The /,"").slice(0,16))}</text>`:""}</g>`;
  });
  s += `</svg><p class="note">Solid red lines are corridors you have walked. Dashed circles are doors you have seen but not opened. Click a remembered room to return to it the way you first remember it, facing as you did then.</p>`;
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
    <text x="0" y="-80" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono">N</text>
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
    const cols=["#A77E22","#8A3B23","#3B5A7A","#5E6B3A","#4B3B5E","#7A3B2E"];
    steps.forEach(([xx,q,yy,r],i) => {
      const s = Math.min(w,h);
      for(let k=0;k<q;k++){
        if(s*sc>=.6) E("rect",{x:X,y:Y,width:s*sc,height:s*sc,fill:cols[i%cols.length],"fill-opacity":.55,stroke:"var(--ink)","stroke-width":.6},svg);
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
$("b-lamp").onclick = () => { S.light = {auto:"night", night:"day", day:"auto"}[S.light] || "auto"; save(); render(); toast(S.light==="auto" ? "Lamps follow the clock again." : S.light==="night" ? "You turn the lamps down." : "You light every lamp."); };
rankIndex.cache = null;
route();
if(S.curator && location.hash!=="#curator") { /* stay quiet; the office opens on #curator */ }
})();
