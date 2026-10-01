/* The Palace in three dimensions: rooms built from the data file, lit by the real sun and the lamps,
   and printed through an engraving shader (hatching that follows the surfaces, ink outlines, paper grain,
   muted color). Loaded by palace.js; falls back to the flat woodcut drawings if WebGL is missing. */
import * as THREE from "./lib/three.module.min.js";

const TAU = Math.PI*2, DEG = Math.PI/180;
let WALL_H = 4.2; const EYE = 1.62, DOOR_W = 1.35, DOOR_H = 2.45;

/* ---------- small helpers ---------- */
function rng(seed){ let a = seed>>>0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a>>>15, 1|a); t = t + Math.imul(t ^ t>>>7, 61|t) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; }; }
function hashStr(s){ let h=2166136261; for(const ch of String(s)){ h ^= ch.charCodeAt(0); h = Math.imul(h,16777619); } return h>>>0; }
const muted = (hex, k=0.55) => { const c = new THREE.Color(hex); const g = c.r*.3+c.g*.59+c.b*.11; return new THREE.Color(g+(c.r-g)*k, g+(c.g-g)*k, g+(c.b-g)*k); };
function mat(color, opts={}){ return new THREE.MeshStandardMaterial(Object.assign({color:new THREE.Color(color), roughness:.85, metalness:0}, opts)); }
let TEXK = 1;
function canvasTex(w, h, paint){ const c = document.createElement("canvas"); c.width=Math.round(w*TEXK); c.height=Math.round(h*TEXK); const g = c.getContext("2d"); g.scale(TEXK, TEXK); paint(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const FELL = '"IM Fell English", Georgia, serif', FELLSC = '"IM Fell English SC", "IM Fell English", Georgia, serif';

/* ---------- the engraving pass ---------- */
const POST_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const POST_FS = `
precision highp float;
uniform sampler2D tColor; uniform sampler2D tDepth;
uniform vec2 res; uniform float dpr, night, time, cnear, cfar, spacing;
uniform mat4 projInv; uniform vec3 paper, ink, paperN, inkN;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
vec3 viewPos(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 p = projInv * vec4(uv*2.-1., d*2.-1., 1.); return p.xyz/p.w; }
float linz(vec2 uv){ return -viewPos(uv).z; }
float lineSet(vec2 px, vec2 dir, float s, float w, float wob){
  float t = dot(px, vec2(-dir.y, dir.x))/s + wob;
  float v = abs(fract(t) - .5);
  float aa = 0.9/s;
  return 1. - smoothstep(w*.5 - aa, w*.5 + aa, v);
}
void main(){
  vec2 px = vUv*res;
  vec3 col = pow(max(texture2D(tColor, vUv).rgb, 0.), vec3(1./2.2));
  float dep = texture2D(tDepth, vUv).x;
  vec3 P = viewPos(vUv);
  vec3 N = normalize(cross(dFdx(P), dFdy(P)));
  float lum0 = dot(col, vec3(.299,.587,.114));
  float lum = smoothstep(.04, .80, lum0);
  if(night > .5) lum = 1. - lum;
  // hatching follows the surface: floors run across, walls run up, curved things follow their form
  vec2 dir = vec2(-N.y, N.x);
  if(length(dir) < .35) dir = vec2(0., 1.);
  dir = normalize(dir);
  float s = spacing*dpr;
  float wob = .18*(noise(px*.012) - .5) + .05*sin(px.y*.07 + px.x*.013);
  float dark = 1. - lum;
  float ink1 = lineSet(px, dir, s, clamp((dark - .36)*1.45, 0., .9), wob);
  float ink2 = lum < .40 ? lineSet(px, vec2(dir.y, -dir.x), s*1.07, clamp((.40-lum)*1.9, 0., .85), wob*1.3) : 0.;
  float ink3 = lum < .16 ? lineSet(px, normalize(dir + vec2(dir.y,-dir.x)), s*.92, clamp((.16-lum)*3.5, 0., .85), wob) : 0.;
  float hatch = max(ink1, max(ink2, ink3));
  if(dep >= .9999) hatch = 0.;
  // ink outlines where depth or orientation jumps
  vec2 e = vec2(1.2*dpr)/res;
  float zc = linz(vUv), zx = linz(vUv+vec2(e.x,0.)), zX = linz(vUv-vec2(e.x,0.)), zy = linz(vUv+vec2(0.,e.y)), zY = linz(vUv-vec2(0.,e.y));
  float dz = (abs(zx - zX) + abs(zy - zY)) / max(zc, .5);
  float edge = smoothstep(.035, .09, dz);
  float l1 = pow(dot(texture2D(tColor, vUv+vec2(e.x,0.)).rgb, vec3(.333)),.4545), l2 = pow(dot(texture2D(tColor, vUv-vec2(e.x,0.)).rgb, vec3(.333)),.4545);
  float l3 = pow(dot(texture2D(tColor, vUv+vec2(0.,e.y)).rgb, vec3(.333)),.4545), l4 = pow(dot(texture2D(tColor, vUv-vec2(0.,e.y)).rgb, vec3(.333)),.4545);
  edge = max(edge, smoothstep(.30, .55, abs(l1-l2) + abs(l3-l4)));
  float inkAmt = clamp(max(hatch, edge*.9), 0., 1.);
  vec3 pap = mix(paper, paperN, night), ik = mix(ink, inkN, night);
  // a little of each material's own color survives, muted
  vec3 chroma = col - vec3(lum0);
  vec3 tint = pap + chroma*.42*(1.-night*.5);
  vec3 c = mix(tint, ik, inkAmt);
  c *= .965 + .035*hash(floor(px/1.7));
  float vig = smoothstep(1.25, .45, length(vUv - .5)*1.4);
  c = mix(c*.86, c, vig);
  gl_FragColor = vec4(c, 1.);
}`;

/* ---------- the view ---------- */
const RAW = /[?&]raw=1/.test(location.search);
export function create(container, hooks){
  const canvas = document.createElement("canvas");
  canvas.className = "view3d";
  container.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({canvas, antialias:false, preserveDrawingBuffer:true});
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // quality: how many pixels are drawn for each one shown (supersampling smooths every line), shadow detail, texture detail, and how fine the engraver's lines are
  const QS = {draft:{ss:1, cap:1, shadow:1024, tex:.75, hatch:6.2}, normal:{ss:1.5, cap:2, shadow:2048, tex:1, hatch:5.8}, fine:{ss:2, cap:3, shadow:4096, tex:2, hatch:5.0}, ultra:{ss:3, cap:4, shadow:4096, tex:2.5, hatch:4.4}};
  const Q = QS[(hooks.quality&&hooks.quality())||"fine"] || QS.fine;
  TEXK = Q.tex;
  const dpr = Math.min(Math.max(window.devicePixelRatio||1, Q.ss) * (Q.ss > 1 && (window.devicePixelRatio||1) > 1 ? 1.25 : 1), Q.cap);
  renderer.setPixelRatio(1);
  const camera = new THREE.PerspectiveCamera(62, 16/9, .05, 80);
  camera.rotation.order = "YXZ";
  let rt = null;
  const post = new THREE.ShaderMaterial({vertexShader:POST_VS, fragmentShader:POST_FS, uniforms:{
    tColor:{value:null}, tDepth:{value:null}, res:{value:new THREE.Vector2()}, dpr:{value:dpr}, night:{value:0}, time:{value:0},
    cnear:{value:camera.near}, cfar:{value:camera.far}, spacing:{value:Q.hatch}, projInv:{value:new THREE.Matrix4()},
    paper:{value:new THREE.Color("#EEE8DA")}, ink:{value:new THREE.Color("#1d1a16")}, paperN:{value:new THREE.Color("#15130f")}, inkN:{value:new THREE.Color("#e6dfcd")} }});
  post.extensions = {derivatives:true};
  const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const tri = new THREE.BufferGeometry(); tri.setAttribute("position", new THREE.Float32BufferAttribute([-1,-1,0, 3,-1,0, -1,3,0],3)); tri.setAttribute("uv", new THREE.Float32BufferAttribute([0,0, 2,0, 0,2],2));
  postScene.add(new THREE.Mesh(tri, post));

  let scene = new THREE.Scene(), key = null, picks = [], anims = [], stations = {}, slots = {}, plan = null, labelDim = 1;
  const depthOnly = new THREE.MeshBasicMaterial({colorWrite:false});
  // lettering, pictures and the sky are printed on top of the engraving, so they stay legible
  function label(mesh){ const old = mesh.material; mesh.material = new THREE.MeshBasicMaterial({map:old.map||null, color:new THREE.Color(old.color||"#ffffff").multiplyScalar(labelDim), side:old.side||THREE.FrontSide, toneMapped:false, transparent:old.transparent, opacity:old.opacity}); old.dispose(); mesh.layers.set(1); return mesh; }
  const look = {yaw:0, pitch:0};   // the free look from dragging, on top of where the facing puts you
  const cam = {yaw:0, pitch:0, pos:new THREE.Vector3(0,EYE,2)}, goal = {yaw:0, pitch:0, pos:new THREE.Vector3(0,EYE,2)};
  let W = 0, H = 0;
  function resize(){
    const full = document.fullscreenElement === container, w = container.clientWidth || 800, h = full ? (container.clientHeight || Math.round(w*9/16)) : Math.round(w*9/16);
    if(w===W && h===H) return; W=w; H=h;
    renderer.setSize(w*dpr, h*dpr, false); canvas.style.width = w+"px"; canvas.style.height = h+"px";
    camera.aspect = w/h; camera.updateProjectionMatrix();
    if(rt) rt.dispose();
    rt = new THREE.WebGLRenderTarget(w*dpr, h*dpr, {depthTexture:new THREE.DepthTexture(w*dpr, h*dpr), samples:0});
    post.uniforms.res.value.set(w*dpr, h*dpr);
  }
  new ResizeObserver(resize).observe(container);
  resize();

  /* ---- picking: what is under the cursor, and what a click there would do ---- */
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); ray.layers.enableAll();
  const tip = document.createElement("div"); tip.className = "tip3d"; container.appendChild(tip);
  let hover = null;
  function zoneAt(x, y){
    // edges of the picture turn you, the top looks up, the bottom looks down or steps back
    if(plan && plan.close){ if(y > H*.86) return {kind:"back", label:"Step back", onClick:()=>hooks.stepBack()}; }
    else {
      if(x < W*.14) return {kind:"turnL", label:"Turn left (or drag to look)", onClick:()=>hooks.turn(-1)};
      if(x > W*.86) return {kind:"turnR", label:"Turn right (or drag to look)", onClick:()=>hooks.turn(1)};
      if(y < H*.09 && plan && plan.pitch<=0) return {kind:"up", label: plan.pitch<0 ? "Look ahead" : "Look up", onClick:()=>hooks.look(plan.pitch<0?0:1)};
      if(y > H*.91 && plan && plan.pitch>=0) return {kind:"down", label: plan.pitch>0 ? "Look ahead" : "Look down", onClick:()=>hooks.look(plan.pitch>0?0:-1)};
    }
    return null;
  }
  function pickAt(cx, cy){
    const r = canvas.getBoundingClientRect(), x = cx - r.left, y = cy - r.top;
    const z = zoneAt(x, y); if(z) return z;
    mouse.set(x/r.width*2-1, -(y/r.height)*2+1);
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(picks, true);
    for(const h of hits){ let o = h.object; while(o && !o.userData.hit) o = o.parent; if(o && o.userData.hit) return o.userData.hit; }
    return null;
  }
  /* ---- drag to look around: the view follows the hand; let go past half a quarter turn and you face that way ---- */
  let drag = null, swallowClick = false, keepLook = 0;
  canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", e => { if(e.button && e.button !== 0) return; drag = {x:e.clientX, y:e.clientY, moved:false, id:e.pointerId}; });
  const endDrag = e => { if(!drag) return; const was = drag; drag = null; if(!was.moved) return;
    swallowClick = true; setTimeout(() => swallowClick = false, 60); canvas.dataset.cursor = "none";
    const q = Math.round(look.yaw / (Math.PI/2));   // quarter turns past the halfway point become real turns
    if(q){ look.yaw -= q*Math.PI/2; keepLook = performance.now(); for(let i=0;i<Math.abs(q);i++) hooks.turn(q > 0 ? -1 : 1); } };
  canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);
  window.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointermove", e => {
    if(drag && (e.buttons & 1 || e.pointerType === "touch")){ const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if(!drag.moved && Math.hypot(dx, dy) < 6) return;
      if(!drag.moved){ drag.moved = true; try { canvas.setPointerCapture(drag.id); } catch(err){} tip.classList.remove("on"); canvas.dataset.cursor = "drag"; }
      const per = camera.fov*DEG / Math.max(1, canvas.getBoundingClientRect().height);
      look.yaw += dx*per; look.pitch += dy*per;
      const base = goal.pitch; look.pitch = Math.max(-1.35 - base, Math.min(1.52 - base, look.pitch));
      drag.x = e.clientX; drag.y = e.clientY; dirty = 3; return; }
    const h = pickAt(e.clientX, e.clientY); hover = h;
    canvas.dataset.cursor = h ? h.kind : "none";
    if(h && h.label){ const r = container.getBoundingClientRect(); tip.textContent = h.label; tip.style.left = Math.min(e.clientX - r.left + 16, r.width - 220) + "px"; tip.style.top = (e.clientY - r.top + 18) + "px"; tip.classList.add("on"); }
    else tip.classList.remove("on");
  });
  canvas.addEventListener("pointerleave", () => { tip.classList.remove("on"); });
  canvas.addEventListener("click", e => { if(swallowClick){ swallowClick = false; return; } const h = pickAt(e.clientX, e.clientY); if(h && h.onClick) h.onClick(); });

  /* ---- the frame loop ---- */
  let last = performance.now(), dirty = 3;
  function frame(t){
    const dt = Math.min(.05, (t-last)/1000); last = t;
    // ease the camera toward its goal: a turn takes about half a second
    let dy = goal.yaw + look.yaw - cam.yaw; while(dy > Math.PI) dy -= TAU; while(dy < -Math.PI) dy += TAU;
    const k = drag && drag.moved ? 1 - Math.pow(1e-9, dt) : 1 - Math.pow(.0009, dt), gp = Math.max(-1.35, Math.min(1.52, goal.pitch + look.pitch));
    const moving = Math.abs(dy) > 1e-3 || Math.abs(gp-cam.pitch) > 1e-3 || cam.pos.distanceTo(goal.pos) > 1e-3;
    cam.yaw += dy*k; cam.pitch += (gp-cam.pitch)*k; cam.pos.lerp(goal.pos, k);
    camera.position.copy(cam.pos); camera.rotation.set(cam.pitch, cam.yaw, 0);
    anims.forEach(a => a(t/1000, dt));
    if(moving || anims.length || dirty>0){
      dirty = Math.max(0, dirty-1);
      if(RAW){ camera.layers.enableAll(); renderer.setRenderTarget(null); renderer.render(scene, camera); requestAnimationFrame(frame); return; }
      camera.layers.set(0);
      renderer.setRenderTarget(rt); renderer.render(scene, camera);
      post.uniforms.tColor.value = rt.texture; post.uniforms.tDepth.value = rt.depthTexture;
      post.uniforms.projInv.value.copy(camera.projectionMatrixInverse); post.uniforms.time.value = t/1000;
      renderer.setRenderTarget(null); renderer.render(postScene, postCam);
      // depth of the room, then the lettering on top
      renderer.autoClear = false; renderer.clearDepth();
      scene.overrideMaterial = depthOnly; renderer.render(scene, camera); scene.overrideMaterial = null;
      camera.layers.set(1); renderer.render(scene, camera); camera.layers.set(0); renderer.autoClear = true;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---- building a room ---- */
  let prevRoom = null, plan0 = null;
  function show(p){
    plan = p;
    const k = JSON.stringify([p.room.id, p.frame, p.mirror, p.band, p.doors.map(d=>[d.id,d.wall,d.open,d.label,d.name]), p.objects.map(o=>[o.title,o.wall]), p.decor, p.sheetKey, p.lantern, p.wxKind, Math.floor(p.minuteKey/10)]);
    if(k !== key){ key = k; build(p); }
    // where to stand and where to look
    const sl = slots[p.ahead] || {dir:new THREE.Vector3(0,0,-1), center:new THREE.Vector3(0,0,-5)};
    let pos, yaw = Math.atan2(-sl.dir.x, -sl.dir.z), pitch = p.pitch*((p.room.ceiling||"")==="open" && p.pitch>0 ? 1.32 : 0.95);
    if(p.close==="ahead" && stations[p.ahead]){ const st = stations[p.ahead]; pos = st.view.clone(); pitch = -0.66; yaw = Math.atan2(-(st.top.x-pos.x), -(st.top.z-pos.z)); }
    else { pos = sl.stand.clone(); }
    // a turn made by dragging keeps the look; any other move squares the view up again
    const nav = JSON.stringify([p.room.id, p.ahead, p.close, p.pitch, p.frame]);
    if(nav !== prevRoom && (performance.now() - keepLook > 400 || p.room.id !== (plan0 && plan0.room.id))){ look.yaw = 0; look.pitch = 0; }
    prevRoom = nav; plan0 = p;
    goal.pos.copy(pos); goal.yaw = yaw; goal.pitch = pitch;
    if(p.snap){ cam.pos.copy(pos); cam.yaw = yaw; cam.pitch = pitch; }
    post.uniforms.night.value = p.band==="night" ? 1 : 0;
    canvas.style.transform = "";
    dirty = 3;
  }

  function build(p){
    scene.traverse(o => { if(o.geometry) o.geometry.dispose(); if(o.material){ [].concat(o.material).forEach(m => { if(m.map) m.map.dispose(); m.dispose(); }); } });
    scene = new THREE.Scene(); picks = []; anims = []; stations = {}; slots = {}; labelDim = p.band==="night" ? .72 : p.band==="dusk" ? .9 : 1;
    const hedged = (p.room.decor||[]).includes("hedges");
    WALL_H = hedged ? 2.9 : (p.room.ceiling==="open") ? 3.3 : 4.2;
    const R = rng(hashStr("room"+p.room.id));
    const spot = muted(p.spot, .6), night = p.band==="night", dusk = p.band==="dusk"||p.band==="dawn";
    const shape = p.room.shape || "square";
    const faces = shell(shape);
    const wallMat = mat(p.room.decor && p.room.decor.includes("glacier") ? "#dfe7ea" : "#d6cdbb", {roughness:.95});
    const stoneTex = canvasTex(512, 512, (g,w,h) => { g.fillStyle="#cfc6b3"; g.fillRect(0,0,w,h); g.strokeStyle="#9c927f"; g.lineWidth=3;
      for(let y=0,row=0;y<h;y+=64,row++){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); for(let x=(row%2)*64;x<w;x+=128){ g.beginPath(); g.moveTo(x,y); g.lineTo(x,y+64); g.stroke(); } }
      for(let i=0;i<900;i++){ g.fillStyle=`rgba(80,70,55,${R()*.08})`; g.fillRect(R()*w,R()*h,2+R()*6,1+R()*3); } });
    stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
    const hedgeTex = hedged ? leafTex(R) : null;
    // ---- walls, with their doors and windows cut out
    const doorsBySlot = {}; p.doors.forEach(d => (doorsBySlot[d.wall] = doorsBySlot[d.wall]||[]).push(d));
    const objsBySlot = {}; p.objects.forEach(o => (objsBySlot[o.wall] = objsBySlot[o.wall]||[]).push(o));
    const boardsOn = (f, len) => { f.holes = f.holes || []; const m = f.slot>=0 ? (objsBySlot[f.slot]||[]).filter(o => o.mount).length : 0; return m ? boardSpots(f, len, m) : []; };
    faces.forEach((f, fi) => {
      const len = f.a.distanceTo(f.b), u = f.b.clone().sub(f.a).normalize(), n = f.n;
      const ds = f.slot>=0 ? (doorsBySlot[f.slot]||[]) : [];
      const holes = [];
      // doors spaced across the wall; a window on the back wall if the room has one
      const nd = ds.length;
      ds.forEach((d,i) => { const at = len*(i+1)/(nd+1); holes.push({kind:"door", at, w:Math.min(DOOR_W, len/(nd+1)*.8), h:DOOR_H, sill:0, d}); });
      if(f.slot===1 && p.decor.includes("window") && len > 3){
        const free = freeSpot(len, holes, 1.2); if(free!=null) holes.push({kind:"window", at:free, w:1.15, h:1.7, sill:1.25});
      }
      f.holes = holes;
      const shapeW = new THREE.Shape(); shapeW.moveTo(0,0); shapeW.lineTo(len,0); shapeW.lineTo(len,WALL_H); shapeW.lineTo(0,WALL_H); shapeW.lineTo(0,0);
      holes.forEach(hh => { const hp = new THREE.Path(), x0 = hh.at - hh.w/2, x1 = hh.at + hh.w/2, y0 = hh.sill, y1 = hh.sill + hh.h - hh.w/2;
        hp.moveTo(x0,y0); hp.lineTo(x1,y0); hp.lineTo(x1,y1); hp.absarc(hh.at, y1, hh.w/2, 0, Math.PI, false); hp.lineTo(x0,y0); shapeW.holes.push(hp); });
      const geo = new THREE.ExtrudeGeometry(shapeW, {depth:.3, bevelEnabled:false, curveSegments:18});
      // UVs for the stone texture: world-ish meters
      const uv = geo.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i, uv.getX(i)/2.2, uv.getY(i)/2.2);
      const m = wallMat.clone(); if(hedged){ m.color.set("#ffffff"); m.map = hedgeTex; } else if(!(p.room.decor||[]).includes("glacier")) { m.map = stoneTex; }
      const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; mesh.receiveShadow = true;
      // place: local x along the wall, local z outward
      const basis = new THREE.Matrix4().makeBasis(u, new THREE.Vector3(0,1,0), n.clone().negate());
      mesh.applyMatrix4(basis); mesh.position.set(f.a.x, 0, f.a.z);
      scene.add(mesh);
      // wainscot and cornice: a little architecture
      if(hedged){ // a clipped top, a little ragged
        for(let x=.3; x<len; x+=.55){ if(holes.some(hh => Math.abs(hh.at - x) < hh.w/2 + .2)) continue; const tuft = new THREE.Mesh(new THREE.SphereGeometry(.32+R()*.1, 8, 6), mat("#ffffff",{map:hedgeTex})); tuft.scale.y = .5; tuft.position.copy(f.a).add(u.clone().multiplyScalar(x)).add(n.clone().multiplyScalar(-.15)); tuft.position.y = WALL_H; tuft.castShadow = true; scene.add(tuft); }
      } else {
      const cor = new THREE.Mesh(new THREE.BoxGeometry(len, .18, .22), mat("#c8bea9")); cor.position.copy(mid(f)).add(n.clone().multiplyScalar(.1)); cor.position.y = WALL_H - .09; cor.rotation.y = Math.atan2(-u.z, u.x); cor.castShadow = true; scene.add(cor);
      const base = new THREE.Mesh(new THREE.BoxGeometry(len, .22, .08), mat("#8f8573")); base.position.copy(mid(f)).add(n.clone().multiplyScalar(.04)); base.position.y = .11; base.rotation.y = cor.rotation.y; scene.add(base);
      }
      holes.forEach(hh => {
        const c = f.a.clone().add(u.clone().multiplyScalar(hh.at));
        if(hh.kind==="door") buildDoor(hh, c, u, n, p, f);
        else buildWindow(hh, c, u, n, p);
      });
      if(f.slot>=0){ const center = mid(f); slots[f.slot] = {center, dir:n.clone().negate(), stand:center.clone().multiplyScalar(shape==="corridor" ? -.2 : -.6).setY(EYE), face:f}; }
      // bookcases along any wall where the room keeps shelves
      if(p.decor.includes("shelves") || (p.decor.includes("cases") && f.slot!==1) || p.decor.includes("lowshelves")){
        const low = p.decor.includes("lowshelves"), cases = p.decor.includes("cases") && !p.decor.includes("shelves");
        let x = .6; while(x < len - .6){ const w = Math.min(1.6, len - .6 - x); if(w < .7) break;
          const at = x + w/2; if(!holes.some(hh => Math.abs(hh.at-at) < hh.w/2 + w/2 + .1) && !boardsOn(f, len).some(b => Math.abs(b.at-at) < b.w/2 + w/2 + .05)) { const c = f.a.clone().add(u.clone().multiplyScalar(at)); cases ? buildCase(c, u, n, w, R, spot) : buildBookcase(c, u, n, w, low ? 1.1 : 3.3, R, spot); }
          x += w + .08; }
      }
    });
    // ---- floor and ceiling
    const poly = faces.map(f => f.a);
    const floorShape = new THREE.Shape(poly.map(v => new THREE.Vector2(v.x, -v.z)));
    const fg = new THREE.ShapeGeometry(floorShape); fg.rotateX(-Math.PI/2);
    const fuv = fg.attributes.uv; for(let i=0;i<fuv.count;i++) fuv.setXY(i, fuv.getX(i)/2, fuv.getY(i)/2);
    const floorTex = floorTexture(p.room.floor || "planks", R); floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    const floor = new THREE.Mesh(fg, mat("#ffffff", {map:floorTex, roughness:.8})); floor.receiveShadow = true; scene.add(floor);
    const ceilKind = p.room.ceiling || "beams";
    if(ceilKind !== "open" && !p.decor.includes("sky")){
      const cg = new THREE.ShapeGeometry(floorShape); cg.rotateX(Math.PI/2); cg.translate(0, WALL_H, 0);
      const ceil = new THREE.Mesh(cg, mat("#bdb4a2", {side:THREE.DoubleSide})); ceil.receiveShadow = true; scene.add(ceil);
      ceilingDetail(ceilKind, faces, R);
    } else skyCeiling(p, faces);
    // ---- light
    const openSky = (p.room.ceiling||"") === "open", cloudK = 1 - .7*Math.min(1, (p.cloud||0)/100);
    const moonK = p.moonAlt > 0 && !p.moonOff && (p.sunAlt < -.8 || p.sunOff) ? p.moonLit * (1 - .9*Math.min(1, (p.cloud||0)/100)) * Math.min(1, p.moonAlt/8) : 0;
    const amb = new THREE.HemisphereLight(night ? "#8a90a0" : "#fbf6ea", night ? "#2a2620" : "#a39a88", night ? (openSky ? .32 + .25*moonK : .9) : (openSky && p.sunOff) ? .7 + .3*moonK : dusk ? 1.8 : 2.4); scene.add(amb);
    const fill = new THREE.DirectionalLight("#fff8ec", night ? .25 : .7); fill.position.set(2, 3, 6); scene.add(fill);
    const lit = p.lampLit;
    if(p.decor.includes("lamp")){
      const lamp = pendant(spot, lit); scene.add(lamp.group);
      if(lit){ const pl = new THREE.PointLight("#ffd89a", 40, 0, 1.1); pl.position.set(0, WALL_H-1.1, 0); pl.castShadow = !p.sunUp; pl.shadow.mapSize.set(512,512); scene.add(pl);
        const base = pl.intensity; anims.push((t) => { pl.intensity = base*(.93 + .07*Math.sin(t*7.1) * Math.sin(t*3.3+1.3)); }); }
    } else if(night){ const pl = new THREE.PointLight("#ffe2b0", 22, 0, 1.1); pl.position.set(0, WALL_H-.6, 1); scene.add(pl); }
    if(p.sunUp){
      // the real sun, from the real direction: walls cast the shadows, windows let it in
      const s = new THREE.DirectionalLight("#fff3d9", 3.4*cloudK);
      const az = p.sunRel*DEG, alt = Math.max(.5, p.sunAlt)*DEG;
      const d = new THREE.Vector3(Math.sin(az)*Math.cos(alt), Math.sin(alt), -Math.cos(az)*Math.cos(alt));
      s.position.copy(d.multiplyScalar(30)); s.target.position.set(0,0,0); s.castShadow = true;
      s.shadow.mapSize.set(Q.shadow,Q.shadow); const sc = s.shadow.camera; sc.left=-12; sc.right=12; sc.top=12; sc.bottom=-12; sc.near=1; sc.far=80; s.shadow.bias = -.0006;
      scene.add(s); scene.add(s.target);
    }
    if(moonK > .02){
      // the moon, from where it really is, as bright as its phase and the clouds allow; a bright moon throws shadows
      const m = new THREE.DirectionalLight("#c6d0e6", (openSky ? 2.6 : 1.6)*moonK);
      const az = p.moonRel*DEG, alt = Math.max(.5, p.moonAlt)*DEG;
      m.position.set(Math.sin(az)*Math.cos(alt)*30, Math.sin(alt)*30, -Math.cos(az)*Math.cos(alt)*30); m.target.position.set(0,0,0);
      if(moonK > .18){ m.castShadow = true; m.shadow.mapSize.set(Q.shadow,Q.shadow); const sc = m.shadow.camera; sc.left=-12; sc.right=12; sc.top=12; sc.bottom=-12; sc.near=1; sc.far=80; m.shadow.bias = -.0006; }
      scene.add(m); scene.add(m.target);
    }
    if(p.lantern){ const pl = new THREE.PointLight("#ffd28a", 9, 7, 1.5); scene.add(pl); anims.push(() => { pl.position.copy(cam.pos).add(new THREE.Vector3(.3,-.4,0)); }); }
    if(p.gloom){ amb.intensity *= p.lantern ? .7 : .25; }
    // ---- floor and wall fittings
    decorBuild(p, faces, R, spot);
    // ---- stations: furniture with the room's things on it, one per wall that has things
    Object.keys(objsBySlot).forEach(sk => { const sl = slots[sk]; if(!sl) return;
      const mounted = objsBySlot[sk].filter(o => o.mount), loose = objsBySlot[sk].filter(o => !o.mount);
      mounted.forEach((o,i) => buildBoard(sl, o, i, mounted.length, p, spot));
      if(loose.length) buildStation(+sk, sl, loose, p, R, spot); });
    scene.fog = night ? new THREE.Fog("#0d0c0b", 10, 30) : null;
  }

  function mid(f){ return f.a.clone().add(f.b).multiplyScalar(.5); }
  function freeSpot(len, holes, w){ const cands = [len*.25, len*.75, len*.5, len*.15, len*.85]; return cands.find(c => !holes.some(h => Math.abs(h.at-c) < h.w/2 + w/2 + .25)) ?? null; }

  // room outlines in plan: faces in order, each with its inward normal and which compass slot it serves
  function shell(shape){
    let pts = [], slotOf = null;
    const poly = (n, r, rot) => { const out = []; for(let i=0;i<n;i++){ const t = rot + i*TAU/n; out.push(new THREE.Vector3(Math.sin(t)*r, 0, -Math.cos(t)*r)); } return out; };
    if(shape==="hex"){ pts = poly(6, 6.4, -Math.PI/6); }
    else if(shape==="oct"){ pts = poly(8, 6.6, -Math.PI/8); }
    else if(shape==="round"){ pts = poly(20, 6.3, -Math.PI/20); }
    else if(shape==="corridor"){ pts = [new THREE.Vector3(-2.3,0,-11), new THREE.Vector3(2.3,0,-11), new THREE.Vector3(2.3,0,3), new THREE.Vector3(-2.3,0,3)]; }
    else { pts = [new THREE.Vector3(-5.5,0,-5.5), new THREE.Vector3(5.5,0,-5.5), new THREE.Vector3(5.5,0,5.5), new THREE.Vector3(-5.5,0,5.5)]; }
    const faces = pts.map((a,i) => { const b = pts[(i+1)%pts.length]; const m = a.clone().add(b).multiplyScalar(.5); const u = b.clone().sub(a).normalize(); let n = new THREE.Vector3(-u.z, 0, u.x); if(n.dot(m) > 0) n.negate(); return {a, b, n, m}; });
    // assign the four compass slots to the faces nearest -x, -z, +x, +z (left, back, right, front)
    const want = [new THREE.Vector3(-1,0,0), new THREE.Vector3(0,0,-1), new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,1)];
    if(shape==="hex") { // the faces next to the back face serve as left and right, as in the drawings
      want[0] = new THREE.Vector3(-Math.sin(Math.PI/3),0,-Math.cos(Math.PI/3)); want[2] = new THREE.Vector3(Math.sin(Math.PI/3),0,-Math.cos(Math.PI/3)); }
    faces.forEach(f => f.slot = -1);
    want.forEach((w, s) => { let best = null, bd = -2; faces.forEach(f => { if(f.slot>=0) return; const dd = f.m.clone().normalize().dot(w); if(dd > bd){ bd = dd; best = f; } }); if(best) best.slot = s; });
    return faces;
  }

  function leafTex(R){
    const t = canvasTex(512, 512, (g,w,h) => { g.fillStyle = "#4f6238"; g.fillRect(0,0,w,h);
      for(let i=0;i<5200;i++){ const x = R()*w, y = R()*h, r = 3 + R()*7, k = R(); g.fillStyle = k < .45 ? "#3c4d2b" : k < .85 ? "#62784a" : "#7f9663"; g.beginPath(); g.ellipse(x, y, r, r*.55, R()*Math.PI, 0, TAU); g.fill(); } });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
  function floorTexture(kind, R){
    return canvasTex(1024, 1024, (g,w,h) => {
      if(kind==="gravel"){ g.fillStyle = "#cdc4b0"; g.fillRect(0,0,w,h); for(let i=0;i<26000;i++){ const k = R(); g.fillStyle = k<.3 ? "#9c927e" : k<.6 ? "#e4dcca" : k<.8 ? "#b3a892" : "#7d735f"; g.fillRect(R()*w, R()*h, 2+R()*4, 2+R()*3); } return; }
      if(kind==="lawn"){ for(let i=0;i<8;i++){ g.fillStyle = i%2 ? "#71864f" : "#7d9258"; g.fillRect(i*128, 0, 128, h); } for(let i=0;i<30000;i++){ g.fillStyle = R()<.5 ? "rgba(50,70,30,.35)" : "rgba(170,190,120,.3)"; g.fillRect(R()*w, R()*h, 1.5, 3+R()*4); } return; }
      if(kind==="checker"){ for(let i=0;i<8;i++) for(let j=0;j<8;j++){ g.fillStyle = (i+j)%2 ? "#5d5649" : "#e2dccd"; g.fillRect(i*128,j*128,128,128); } g.strokeStyle="#3a352c"; g.lineWidth=3; for(let i=0;i<=8;i++){ g.beginPath(); g.moveTo(i*128,0); g.lineTo(i*128,h); g.stroke(); g.beginPath(); g.moveTo(0,i*128); g.lineTo(w,i*128); g.stroke(); } }
      else if(kind==="stone"){ g.fillStyle="#c9c0ad"; g.fillRect(0,0,w,h); g.strokeStyle="#7a705f"; g.lineWidth=4;
        for(let y=0,row=0;y<h;y+=170,row++){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); let x=row%2?-90:0; while(x<w){ const ww=150+R()*120; g.beginPath(); g.moveTo(x+ww,y); g.lineTo(x+ww,y+170); g.stroke(); g.fillStyle=`rgba(60,55,45,${R()*.12})`; g.fillRect(x+4,y+4,ww-8,162); x+=ww; } } }
      else { g.fillStyle="#bba78a"; g.fillRect(0,0,w,h); for(let x=0;x<w;x+=64){ g.fillStyle=`rgba(70,50,30,${.08+R()*.14})`; g.fillRect(x,0,64,h); g.strokeStyle="#5b4632"; g.lineWidth=3; g.beginPath(); g.moveTo(x,0); g.lineTo(x,h); g.stroke();
        let y = R()*400; while(y<h){ g.beginPath(); g.moveTo(x,y); g.lineTo(x+64,y); g.stroke(); y += 300+R()*500; }
        for(let k=0;k<14;k++){ g.strokeStyle=`rgba(60,40,20,${.15+R()*.2})`; g.lineWidth=1; g.beginPath(); const yy=R()*h; g.moveTo(x+4,yy); g.bezierCurveTo(x+20,yy+30,x+44,yy-30,x+60,yy+10); g.stroke(); } } }
    });
  }
  function ceilingDetail(kind, faces, R){
    const span = 12;
    if(kind==="coffers"){ for(let i=-5;i<=5;i++){ const b1 = new THREE.Mesh(new THREE.BoxGeometry(.22,.3,span), mat("#cfc6b2")); b1.position.set(i*1.2, WALL_H-.15, 0); scene.add(b1); const b2 = new THREE.Mesh(new THREE.BoxGeometry(span,.3,.22), mat("#cfc6b2")); b2.position.set(0, WALL_H-.15, i*1.2); scene.add(b2); }
      for(let i=-4;i<=4;i++) for(let j=-4;j<=4;j++){ const ro = new THREE.Mesh(new THREE.CylinderGeometry(.13,.16,.08,10), mat("#e6dfcf")); ro.position.set(i*1.2+.6, WALL_H-.04, j*1.2+.6); scene.add(ro); } }
    else if(kind==="vault"){ for(let i=-5;i<=5;i++){ const rib = new THREE.Mesh(new THREE.TorusGeometry(6, .12, 6, 30, Math.PI), mat("#cfc6b2")); rib.position.set(0, WALL_H-6+.2, i*1.15); rib.scale.set(1,.12,1); scene.add(rib); } }
    else { for(let i=-5;i<=5;i++){ const b = new THREE.Mesh(new THREE.BoxGeometry(.32,.42,span), mat("#7b6a54")); b.position.set(i*1.3, WALL_H-.21, 0); b.castShadow = true; scene.add(b); } }
  }
  function skyCeiling(p, faces){
    // the real sky: a disc of the sky chart overhead, or the open sky for courtyards
    let tex = null; const mats = [];
    if(p.skyCanvas) p.skyCanvas(cv => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; mats.forEach(m => { m.map = t; m.color.set("#ffffff"); m.needsUpdate = true; }); dirty = 3; });
    const r = Math.max(...faces.map(f => f.a.length()));
    if(p.decor.includes("sky")){
      const ring = new THREE.Mesh(new THREE.RingGeometry(r*.62, r*1.2, 40), mat("#b9b09d", {side:THREE.DoubleSide})); ring.rotation.x = Math.PI/2; ring.position.y = WALL_H; scene.add(ring);
      const dm = new THREE.MeshBasicMaterial({color:"#1a1c22", side:THREE.DoubleSide}); mats.push(dm);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(r*.62, 64), dm);
      disc.rotation.set(Math.PI/2, 0, -p.F*DEG); disc.position.y = WALL_H+.01; disc.layers.set(1); scene.add(disc);
      // ribs of the dome
      for(let i=0;i<12;i++){ const rib = new THREE.Mesh(new THREE.BoxGeometry(.06,.06,r*.62), mat("#2a261f")); rib.position.set(Math.sin(i/12*TAU)*r*.31, WALL_H-.02, -Math.cos(i/12*TAU)*r*.31); rib.rotation.y = -i/12*TAU; scene.add(rib); }
    } else if(p.dome) buildDome(p);
  }

  /* ---- the open sky: a dome coloured by the sun's height and the clouds, with the real stars, moon, and planets ---- */
  function buildDome(p){
    const D = p.dome, RS = 58, F = p.F, cc = Math.min(1, (p.cloud||0)/100);
    const dir = (alt, az) => { const a = (az - F)*DEG, h = alt*DEG; return new THREE.Vector3(Math.sin(a)*Math.cos(h), Math.sin(h), -Math.cos(a)*Math.cos(h)); };
    const on1 = o => { o.layers.set(1); o.renderOrder = -10; scene.add(o); return o; };
    const sunD = dir(D.sun.alt, D.sun.az), sa = p.sunOff ? -40 : D.sun.alt;   // with the sun put out, the sky is the night sky
    const C = h => new THREE.Color(h);
    const day = {z:C("#7f9db0"), h:C("#d8dfdc")}, tw = {z:C("#3a4660"), h:C("#d39a76")}, nt = {z:C("#0b0e15"), h:C("#1b2130")};
    const k1 = Math.max(0, Math.min(1, (sa + 12)/12)), k2 = Math.max(0, Math.min(1, sa/10));
    const geo = new THREE.SphereGeometry(RS+1, 64, 24, 0, TAU, 0, Math.PI/2 + .15), pos = geo.attributes.position, col = [];
    const grey = sa > 0 ? C("#c4c4bd") : sa > -8 ? C("#6f6c6a") : C("#1e2024"), v = new THREE.Vector3();
    for(let i=0;i<pos.count;i++){
      v.fromBufferAttribute(pos, i).normalize(); const up = Math.max(0, v.y), toward = Math.max(0, v.dot(sunD));
      const zt = nt.z.clone().lerp(tw.z, k1).lerp(day.z, k2), ht = nt.h.clone().lerp(tw.h.clone().lerp(C("#9c8f8c"), 1-Math.pow(toward,2)), k1).lerp(day.h, k2);
      const c = ht.clone().lerp(zt, Math.pow(up, .55));
      if(sa > -6) c.lerp(C("#fff3dc"), Math.pow(toward, 24)*.8*(1-cc));
      c.lerp(grey, cc*.88); col.push(c.r, c.g, c.b); }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    on1(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({vertexColors:true, side:THREE.BackSide, fog:false, depthWrite:false})));
    const dot = canvasTex(64, 64, (g,w,h) => { const gr = g.createRadialGradient(32,32,0,32,32,30); gr.addColorStop(0,"rgba(255,255,255,1)"); gr.addColorStop(.35,"rgba(255,255,255,.9)"); gr.addColorStop(1,"rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0,0,w,h); });
    const sv = Math.max(0, Math.min(1, (-sa - 3)/10)) * (1 - cc*.97);
    if(sv > .03){
      [[-2,1.6,5.2],[1.6,3,3.6],[3,4.7,2.4]].forEach(([lo,hi,size]) => { const pts = [];
        D.stars.forEach(([alt,az,m]) => { if(m < lo || m >= hi) return; pts.push(...dir(alt,az).multiplyScalar(RS-1).toArray()); });
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        on1(new THREE.Points(g, new THREE.PointsMaterial({size, map:dot, color:"#f6f0de", transparent:true, opacity:sv, sizeAttenuation:false, fog:false, depthWrite:false}))); });
      const lp = []; D.lines.forEach(([a,b]) => { lp.push(...dir(a[0],a[1]).multiplyScalar(RS-1.5).toArray(), ...dir(b[0],b[1]).multiplyScalar(RS-1.5).toArray()); });
      const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
      on1(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({color:"#"+muted(p.spot,.7).getHexString(), transparent:true, opacity:.38*sv, fog:false, depthWrite:false})));
      D.cons.forEach(([alt,az,n]) => skyLabel(n.toUpperCase(), dir(alt,az).multiplyScalar(RS-2), "#9a8f7c", 22, .55*sv, 3.2));
      D.names.forEach(([alt,az,n]) => skyLabel(n, dir(alt,az).multiplyScalar(RS-2).add(new THREE.Vector3(0,-.9,0)), "#e9e1cc", 20, .7*sv, 2.4, true));
    }
    const pv = Math.max(0, Math.min(1, (-sa + 1)/6)) * (1 - cc*.95);
    if(pv > .05) D.planets.forEach(pl => { if(pl.alt < 0) return; const at = dir(pl.alt, pl.az).multiplyScalar(RS-1.2);
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(at.toArray(), 3));
      on1(new THREE.Points(g, new THREE.PointsMaterial({size:7, map:dot, color:"#ffe6b0", transparent:true, opacity:pv, sizeAttenuation:false, fog:false, depthWrite:false})));
      skyLabel(pl.name, at.clone().add(new THREE.Vector3(0,-1.2,0)), "#e6c88f", 22, .85*pv, 2.6, true); });
    // each planet's track among the stars: a dot every four days, forty days either side; retrograde loops show as kinks
    const TC = {mer:"#cfc6b4", ven:"#f1e6c4", mar:"#d98a63", jup:"#e2c9a2", sat:"#e6d6a6", ura:"#a9d0d6", nep:"#8fa9d6"};
    if(pv > .05 && D.tracks) D.tracks.forEach(tr => { const pts = []; tr.pts.forEach(([alt,az]) => pts.push(...dir(alt,az).multiplyScalar(RS-1.3).toArray()));
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      on1(new THREE.Points(g, new THREE.PointsMaterial({size:3, map:dot, color:TC[tr.id]||"#ddd", transparent:true, opacity:.55*pv, sizeAttenuation:false, fog:false, depthWrite:false}))); });
    if(!p.sunOff && sa > -1.5 && cc < .9){ const s = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), new THREE.MeshBasicMaterial({color:"#fff7e2", fog:false, transparent:true, opacity:1-cc*.8, depthWrite:false}));
      s.position.copy(sunD.clone().multiplyScalar(RS-2)); s.lookAt(0,0,0); on1(s);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({map:dot, color:"#fff0cf", transparent:true, opacity:.55*(1-cc), fog:false, depthWrite:false})); halo.scale.setScalar(9); halo.position.copy(sunD.clone().multiplyScalar(RS-2.5)); on1(halo); }
    if(D.moon.alt > -1 && !p.moonOff){ const mD = dir(D.moon.alt, D.moon.az), ph = D.moon.phase, lit = (1-Math.cos(TAU*ph))/2;
      const tex = canvasTex(256, 256, (g,w,h) => { const r = 118, cx = w/2, cy = h/2;
        g.fillStyle = "#262a33"; g.beginPath(); g.arc(cx,cy,r,0,TAU); g.fill();
        g.save(); g.beginPath(); g.arc(cx,cy,r,0,TAU); g.clip();
        g.fillStyle = "#f1ead6"; g.beginPath(); g.arc(cx,cy,r,-Math.PI/2,Math.PI/2); g.fill();
        const ex = r*Math.abs(1-2*lit); g.beginPath(); g.ellipse(cx,cy,ex,r,0,0,TAU); g.fillStyle = lit < .5 ? "#262a33" : "#f1ead6"; g.fill();
        g.globalAlpha = .13; g.fillStyle = "#5d5a52"; [[-30,-38,26],[18,-52,15],[34,10,30],[-20,30,20],[-48,6,13],[6,52,11]].forEach(([x,y,rr]) => { g.beginPath(); g.arc(cx+x,cy+y,rr,0,TAU); g.fill(); });
        g.restore(); });
      const moon = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), new THREE.MeshBasicMaterial({map:tex, transparent:true, fog:false, opacity: (sa > 0 ? .7 : 1)*(1-cc*.85), depthWrite:false}));
      moon.position.copy(mD.clone().multiplyScalar(RS-2.2));
      const z = mD.clone().negate(), x = sunD.clone().sub(mD.clone().multiplyScalar(sunD.dot(mD))); if(x.lengthSq() < 1e-6) x.set(1,0,0); x.normalize(); const y = z.clone().cross(x);
      moon.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); on1(moon);
      if(sa < 0 && cc < .9){ const halo = new THREE.Sprite(new THREE.SpriteMaterial({map:dot, color:"#c9d3ea", transparent:true, opacity:.22*lit*(1-cc), fog:false, depthWrite:false})); halo.scale.setScalar(7); halo.position.copy(mD.clone().multiplyScalar(RS-2.6)); on1(halo); } }
    if(cc > .08){ const R2 = rng(D.seed), n = Math.round(4 + cc*22), grp = new THREE.Group();
      const puff = canvasTex(256, 128, (g,w,h) => { for(let k=0;k<14;k++){ const x = 40 + R2()*176, y = 50 + R2()*40, r = 18 + R2()*34; const gr = g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,"rgba(255,255,255,.9)"); gr.addColorStop(1,"rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0,0,w,h); } });
      const cColor = sa > 0 ? "#f2efe6" : sa > -8 ? "#b7a597" : "#3a3d45";
      for(let k=0;k<n;k++){ const alt = 14 + R2()*62, az = R2()*360, sp = new THREE.Sprite(new THREE.SpriteMaterial({map:puff, color:cColor, transparent:true, opacity:.55 + .4*cc, fog:false, depthWrite:false}));
        sp.position.copy(dir(alt, az).multiplyScalar(RS-4)); sp.scale.set(16 + R2()*14, 7 + R2()*5, 1); grp.add(sp); }
      grp.traverse(o => o.layers.set(1)); scene.add(grp); anims.push(t => { grp.rotation.y = t*.004; });
    }
    if(["rain","snow","storm"].includes(p.wxKind)){ const snow = p.wxKind==="snow", n = snow ? 1400 : 900, len = snow ? 0 : .32, pts = new Float32Array(n*6);
      for(let i=0;i<n;i++){ const x = (Math.random()-.5)*14, y = Math.random()*9, z = (Math.random()-.5)*14; pts.set([x,y,z, x+.03,y+len,z], i*6); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
      if(snow) on1(new THREE.Points(g, new THREE.PointsMaterial({size:3.2, map:dot, color:"#ffffff", transparent:true, opacity:.9, sizeAttenuation:false, fog:false, depthWrite:false})));
      else on1(new THREE.LineSegments(g, new THREE.LineBasicMaterial({color: p.band==="night" ? "#9aa6b4" : "#5d6875", transparent:true, opacity:.55, fog:false, depthWrite:false})));
      anims.push((t, dt) => { dt = Math.min(.1, dt || .016); const a = g.attributes.position.array, v = (snow ? 1.1 : 9)*dt;
        for(let i=0;i<n*2;i++){ a[i*3+1] -= v; if(snow) a[i*3] += Math.sin(t+i)*.002; }
        for(let i=0;i<n;i++){ if(a[i*6+1] < 0){ a[i*6+1] += 9; a[i*6+4] += 9; } }
        g.attributes.position.needsUpdate = true; }); }
  }
  function skyLabel(text, at, color, px, opacity, scale, italic){
    const tex = canvasTex(256, 48, (g,w,h) => { g.font = `${italic?"italic ":""}${px}px ${italic?FELL:FELLSC}`; g.fillStyle = color; g.textAlign = "center"; g.fillText(text, w/2, 32); });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, opacity, fog:false, depthWrite:false})); sp.scale.set(scale*256/48*.9, scale*.9, 1); sp.position.copy(at); sp.layers.set(1); scene.add(sp); return sp; }

  /* ---- doors ---- */
  function buildDoor(hh, c, u, n, p, f){
    const d = hh.d, g = new THREE.Group(), yaw = Math.atan2(-u.z, u.x);
    const out = n.clone().negate();
    // a passage beyond: dark, receding
    const pass = new THREE.Mesh(new THREE.BoxGeometry(hh.w, hh.h, 1.6), new THREE.MeshBasicMaterial({color: d.open ? "#0f0d0b" : "#2a241c"}));
    pass.position.copy(c).add(out.clone().multiplyScalar(1.1)); pass.position.y = hh.h/2; pass.rotation.y = yaw; g.add(pass);
    // the frame: an arch of cut stone
    const archPts = []; for(let i=0;i<=16;i++){ const t = Math.PI*i/16; archPts.push(new THREE.Vector3(Math.cos(t)*(hh.w/2+.08), hh.h - hh.w/2 + Math.sin(t)*(hh.w/2+.08), 0)); }
    const path = new THREE.CatmullRomCurve3([new THREE.Vector3(hh.w/2+.08,0,0), ...archPts, new THREE.Vector3(-hh.w/2-.08,0,0)]);
    const frameM = new THREE.Mesh(new THREE.TubeGeometry(path, 48, .1, 6, false), mat("#b4aa95"));
    frameM.position.copy(c).add(n.clone().multiplyScalar(.02)); frameM.rotation.y = yaw; frameM.castShadow = true; g.add(frameM);
    // a door leaf: open doors stand ajar, locked doors are shut and studded
    const leafG = new THREE.Shape(); const x0=-hh.w/2+.02, x1=hh.w/2-.02, y1=hh.h-hh.w/2;
    leafG.moveTo(x0,0); leafG.lineTo(x1,0); leafG.lineTo(x1,y1); leafG.absarc(0,y1,hh.w/2-.02,0,Math.PI,false); leafG.lineTo(x0,0);
    const leafTex = canvasTex(256, 512, (gg,w,h) => { gg.fillStyle = d.look==="mirror" ? "#d9dcdc" : d.look==="gold" ? "#6b5a3a" : "#5a4632"; gg.fillRect(0,0,w,h);
      if(d.look==="mirror"){ for(let k=0;k<6;k++){ gg.strokeStyle="rgba(255,255,255,.7)"; gg.lineWidth=6+k*2; gg.beginPath(); gg.moveTo(-40+k*60,h); gg.lineTo(w+40-k*10,h*.2+k*30); gg.stroke(); } }
      else { for(let x=0;x<w;x+=42){ gg.strokeStyle="#2c2218"; gg.lineWidth=3; gg.beginPath(); gg.moveTo(x,0); gg.lineTo(x,h); gg.stroke(); } [h*.25,h*.7].forEach(y=>{ gg.fillStyle="#2b2520"; gg.fillRect(0,y,w,14); for(let x=10;x<w;x+=36){ gg.beginPath(); gg.arc(x,y+7,4,0,TAU); gg.fillStyle="#9a8e78"; gg.fill(); } }); }
      if(d.look==="shelves"){ gg.fillStyle="#3b2e22"; gg.fillRect(0,0,w,h); for(let y=40;y<h;y+=80){ gg.fillStyle="#1d1712"; gg.fillRect(0,y,w,8); let x=6; while(x<w-8){ const bw=8+Math.random()*12; gg.fillStyle=["#6e5a44","#8a7a62","#4e4436","#a39478"][Math.floor(Math.random()*4)]; gg.fillRect(x,y-58+Math.random()*10,bw,58); x+=bw+2; } } }
      if(d.look==="gold"){ gg.beginPath(); gg.arc(w/2,h*.48,44,0,TAU); gg.fillStyle="#b08a2e"; gg.fill(); gg.fillStyle="#2b2010"; gg.font=`64px ${FELL}`; gg.textAlign="center"; gg.fillText("φ",w/2,h*.48+22); }
      if(d.look==="dials"){ for(let k=0;k<4;k++){ gg.beginPath(); gg.arc(40+k*58,h*.45,22,0,TAU); gg.fillStyle="#d8cfb9"; gg.fill(); gg.strokeStyle="#1d1712"; gg.lineWidth=4; gg.stroke(); gg.beginPath(); gg.moveTo(40+k*58,h*.45); gg.lineTo(40+k*58+Math.cos(k*1.7)*16,h*.45+Math.sin(k*1.7)*16); gg.stroke(); } }
      if(!d.open && d.look!=="bars"){ gg.beginPath(); gg.arc(w*.78,h*.55,10,0,TAU); gg.fillStyle="#c9b98f"; gg.fill(); gg.fillStyle="#111"; gg.fillRect(w*.78-3,h*.55,6,16); } });
    const leaf = new THREE.Mesh(new THREE.ExtrudeGeometry(leafG, {depth:.07, bevelEnabled:false, curveSegments:16}), mat("#ffffff", {map:leafTex, metalness: d.look==="mirror"? .6 : 0, roughness: d.look==="mirror" ? .2 : .8}));
    const luv = leaf.geometry.attributes.uv; for(let i=0;i<luv.count;i++) luv.setXY(i, (luv.getX(i)-x0)/(x1-x0), luv.getY(i)/hh.h);
    const showLeaf = !d.open || d.look;
    if(showLeaf){
      if(d.open && d.look){ // open but special: swung inward a little
        const hinge = new THREE.Group(); hinge.position.copy(c).add(u.clone().multiplyScalar(-hh.w/2)).add(out.clone().multiplyScalar(.05)); hinge.rotation.y = yaw - .9; leaf.position.set(hh.w/2,0,0); hinge.add(leaf); g.add(hinge);
      } else { leaf.position.copy(c).add(out.clone().multiplyScalar(.05)); leaf.rotation.y = yaw; g.add(leaf); }
    }
    if(d.look==="bars"){ for(let k=-2;k<=2;k++){ const bar = new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,hh.h,6), mat("#2a2a2a",{metalness:.5})); bar.position.copy(c).add(u.clone().multiplyScalar(k*hh.w/5.5)).add(n.clone().multiplyScalar(.03)); bar.position.y = hh.h/2; g.add(bar); } }
    // the brass plate over the door: number, and the room's name
    const plate = canvasTex(512, 200, (gg,w,h) => {
      gg.fillStyle = "#cdbf9a"; gg.fillRect(0,0,w,h); gg.strokeStyle="#2b2318"; gg.lineWidth=10; gg.strokeRect(5,5,w-10,h-10); gg.lineWidth=2; gg.strokeRect(22,22,w-44,h-44);
      gg.fillStyle = "#1e1912"; gg.textAlign="center"; gg.font = `${d.name?84:110}px ${FELLSC}`; gg.fillText(d.label, w/2, d.name ? 100 : 136);
      if(d.name){ gg.font = `34px ${FELLSC}`; gg.fillText(d.name.toUpperCase().slice(0,22), w/2, 160); }
      if(p.mirror){ const img = gg.getImageData(0,0,w,h); gg.save(); gg.scale(-1,1); gg.translate(-w,0); const c2=document.createElement("canvas"); c2.width=w; c2.height=h; c2.getContext("2d").putImageData(img,0,0); gg.drawImage(c2,0,0); gg.restore(); } });
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.05, .41), mat("#ffffff", {map:plate, metalness:.35, roughness:.45}));
    pm.position.copy(c).add(n.clone().multiplyScalar(.035)); pm.position.y = hh.h + .42; pm.rotation.y = yaw; g.add(label(pm));
    g.userData.hit = {kind: d.open ? "door" : "locked", label: (d.open ? "" : "Locked: ") + d.label + (d.name ? " · " + d.name : "") + (d.title ? " · " + d.title : ""), onClick: d.onClick};
    scene.add(g); picks.push(g);
  }

  /* ---- windows: the real sky, the real weather ---- */
  function buildWindow(hh, c, u, n, p){
    const yaw = Math.atan2(-u.z, u.x), out = n.clone().negate();
    const tex = canvasTex(256, 384, (g,w,h) => {
      const sky = p.band==="night" ? ["#151a26","#232a38"] : p.band==="dusk" ? ["#d9a079","#e9d2b0"] : p.band==="dawn" ? ["#e8c1b0","#efe2d0"] : ["#a9bfc9","#e1e6e2"];
      const gr = g.createLinearGradient(0,0,0,h); gr.addColorStop(0,sky[0]); gr.addColorStop(1,sky[1]); g.fillStyle = gr; g.fillRect(0,0,w,h);
      if(p.band==="night") for(let i=0;i<70;i++){ g.fillStyle=`rgba(255,250,230,${.4+Math.random()*.6})`; g.fillRect(Math.random()*w, Math.random()*h*.8, 1.6, 1.6); }
      if(p.sunInWindow){ g.beginPath(); g.arc(w*(.5+p.sunInWindow[0]*.4), h*(.75-p.sunInWindow[1]*.6), 22, 0, TAU); g.fillStyle="#fff6dc"; g.fill(); }
      if(p.moonInWindow){ g.beginPath(); g.arc(w*(.5+p.moonInWindow[0]*.4), h*(.75-p.moonInWindow[1]*.6), 16, 0, TAU); g.fillStyle="#f3edda"; g.fill(); }
      const wk = p.wxKind;
      if(wk!=="clear"){ for(let i=0;i<(wk==="cloud"?3:6);i++){ const x=Math.random()*w, y=Math.random()*h*.6; g.fillStyle = p.band==="night" ? "rgba(60,64,75,.9)" : "rgba(235,233,226,.95)"; [0,1,2].forEach(k=>{ g.beginPath(); g.arc(x+k*26, y+(k===1?-10:0), 26, 0, TAU); g.fill(); }); } }
      if(wk==="rain"||wk==="storm"){ g.strokeStyle="rgba(70,80,90,.7)"; g.lineWidth=1.5; for(let i=0;i<120;i++){ const x=Math.random()*w, y=Math.random()*h; g.beginPath(); g.moveTo(x,y); g.lineTo(x-6,y+18); g.stroke(); } }
      if(wk==="snow"){ g.fillStyle="#fff"; for(let i=0;i<160;i++){ g.beginPath(); g.arc(Math.random()*w, Math.random()*h, 1.5+Math.random()*2, 0, TAU); g.fill(); } }
      if(wk==="fog"){ g.fillStyle="rgba(230,230,225,.6)"; g.fillRect(0,0,w,h); }
    });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(hh.w*1.6, hh.h*1.4), new THREE.MeshBasicMaterial({map:tex}));
    back.position.copy(c).add(out.clone().multiplyScalar(.9)); back.position.y = hh.sill + hh.h/2; back.rotation.y = yaw; back.layers.set(1); scene.add(back);
    // mullions
    const mm = mat("#3a3128");
    const v = new THREE.Mesh(new THREE.BoxGeometry(.06, hh.h, .06), mm); v.position.copy(c).add(out.clone().multiplyScalar(.15)); v.position.y = hh.sill + hh.h/2; v.rotation.y = yaw; scene.add(v);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(hh.w, .06, .06), mm); hb.position.copy(v.position); hb.position.y = hh.sill + hh.h*.55; hb.rotation.y = yaw; scene.add(hb);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(hh.w+.3, .1, .4), mat("#b4aa95")); sill.position.copy(c).add(n.clone().multiplyScalar(.08)); sill.position.y = hh.sill - .05; sill.rotation.y = yaw; sill.receiveShadow = true; scene.add(sill);
    back.userData.hit = {kind:"look", label: p.wxLabel || "The window", onClick:()=>hooks.toast(p.wxLabel || "Outside, the weather goes on.")}; picks.push(back);
  }

  /* ---- furniture ---- */
  // books are drawn by the thousand in one pass: one instanced mesh per bookcase
  function bookBatch(){ const list = []; return { add(x,y,z,w,h,d,color,rz){ list.push([x,y,z,w,h,d,color,rz||0]); },
    mesh(){ if(!list.length) return null; const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({roughness:.9}), list.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); list.forEach((b,i) => { e.set(0,0,b[7]); q.setFromEuler(e); m.compose(new THREE.Vector3(b[0],b[1],b[2]), q, new THREE.Vector3(b[3],b[4],b[5])); im.setMatrixAt(i, m); im.setColorAt(i, new THREE.Color(b[6])); });
      im.castShadow = true; im.receiveShadow = true; return im; } }; }
  function buildBookcase(c, u, n, w, h, R, spot){
    const g = new THREE.Group(), yaw = Math.atan2(-u.z, u.x), depth = .38;
    const wood = mat("#6a5440"), dark = mat("#2b2219");
    const backP = new THREE.Mesh(new THREE.BoxGeometry(w, h, .03), dark); backP.position.set(0, h/2, .015); g.add(backP);
    [-1,1].forEach(sx => { const side = new THREE.Mesh(new THREE.BoxGeometry(.05, h, depth), wood); side.position.set(sx*(w/2-.025), h/2, depth/2); side.castShadow = true; g.add(side); });
    const topP = new THREE.Mesh(new THREE.BoxGeometry(w+.08, .07, depth+.04), wood); topP.position.set(0, h-.035, depth/2); g.add(topP);
    const shelves = Math.max(2, Math.round(h/.42)), sh = (h-.12)/shelves;
    const bookCols = ["#7d6b55","#5f574a","#9a8b70","#4a4339","#b3a487","#6b5a48", "#"+spot.getHexString()];
    const bb = bookBatch();
    for(let s=0;s<shelves;s++){
      const y0 = .06 + s*sh, board = new THREE.Mesh(new THREE.BoxGeometry(w-.08, .04, depth-.02), wood); board.position.set(0, y0, depth/2); board.receiveShadow = true; g.add(board);
      let x = -w/2 + .07;
      while(x < w/2 - .1){ const bw = .025 + R()*.05, bh = sh*(.62 + R()*.3); if(R()<.06){ x += .08; continue; }
        const lean = R()<.07 ? (R()-.5)*.4 : 0;
        bb.add(x + bw/2, y0 + .02 + bh/2, depth*.5 + .02, bw, bh, depth*.75, bookCols[Math.floor(R()*bookCols.length)], lean); x += bw + .004; }
    }
    const bm = bb.mesh(); if(bm) g.add(bm);
    g.position.copy(c).add(n.clone().multiplyScalar(.02)); g.rotation.y = yaw; scene.add(g);
  }
  function buildCase(c, u, n, w, R, spot){
    const g = new THREE.Group(), yaw = Math.atan2(-u.z, u.x);
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, .9, .55), mat("#5c4a38")); base.position.set(0,.45,.3); g.add(base);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w-.06, .6, .5), new THREE.MeshStandardMaterial({color:"#e8eceb", transparent:true, opacity:.18, roughness:.1})); glass.position.set(0,1.2,.3); g.add(glass);
    for(let k=0;k<3;k++){ const rule = new THREE.Mesh(new THREE.BoxGeometry(w*.8, .03, .08), mat(k===1? "#"+spot.getHexString() : "#d8cdb2")); rule.position.set(0, .93, .14 + k*.15); rule.rotation.x = -.1; g.add(rule); }
    g.position.copy(c).add(n.clone().multiplyScalar(.02)); g.rotation.y = yaw; scene.add(g);
  }
  function pendant(spot, lit){
    const group = new THREE.Group();
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,1,6), mat("#2a2520")); chain.position.y = WALL_H-.5; group.add(chain);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(.42,.34,24,1,true), mat("#"+spot.getHexString(), {side:THREE.DoubleSide, roughness:.6})); shade.position.y = WALL_H-1.05; group.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.09,12,8), new THREE.MeshBasicMaterial({color: lit ? "#fff1c8" : "#d9d2c0"})); bulb.position.y = WALL_H-1.18; group.add(bulb);
    return {group};
  }

  /* ---- boards on the walls: notices, links, office hours, the almanac ---- */
  // where the mounted boards on a face go, so shelves can leave room for them
  function boardSpots(f, len, n){ const bw = Math.min(2.6, len*.36), cands = [len*.5, len*.3, len*.7, len*.2, len*.8].filter(c => !f.holes.some(h => Math.abs(h.at-c) < h.w/2 + bw/2 + .15));
    return Array.from({length:n}, (_,i) => ({at: cands[i] ?? (len*(i+1)/(n+1)), w: bw})); }
  function buildBoard(sl, o, i, n, p, spot){
    const f = sl.face, u = f.b.clone().sub(f.a).normalize(), len = f.a.distanceTo(f.b), yaw = Math.atan2(-u.z, u.x);
    const bw = Math.min(2.6, len*.36), bh = 1.7;
    const at = boardSpots(f, len, n)[i].at;
    const c = f.a.clone().add(u.clone().multiplyScalar(at)).add(f.n.clone().multiplyScalar(.06));
    const bd = o.board || {title:o.title, lines:[]}, cork = o.raw && o.raw.action==="notices";
    const tex = canvasTex(1024, 680, (g,w,h) => {
      g.fillStyle = cork ? "#b89a6e" : "#2f2a24"; g.fillRect(0,0,w,h);
      if(cork) for(let k=0;k<2500;k++){ g.fillStyle=`rgba(80,55,30,${Math.random()*.25})`; g.fillRect(Math.random()*w, Math.random()*h, 2, 2); }
      g.strokeStyle = "#5a4632"; g.lineWidth = 26; g.strokeRect(0,0,w,h);
      g.fillStyle = cork ? "#1e1912" : "#e9e1cc"; g.textAlign = "center"; g.font = `64px ${FELLSC}`; g.fillText(bd.title, w/2, 92);
      if(bd.tiles){ const cols = 4, tw = (w-120)/cols; bd.tiles.forEach((t,k) => { const x = 60 + (k%cols)*tw, y = 130 + Math.floor(k/cols)*120; g.fillStyle = "#cdbf9a"; g.fillRect(x+8, y, tw-16, 96); g.strokeStyle = "#1e1912"; g.lineWidth = 4; g.strokeRect(x+8, y, tw-16, 96); g.fillStyle = "#1e1912"; g.font = `${t.length>14?30:38}px ${FELLSC}`; g.fillText(t.slice(0,18), x+tw/2, y+60); }); }
      else { if(cork){ g.fillStyle = "#f1ead8"; g.save(); g.translate(70,130); g.rotate(-.015); g.fillRect(0,0,w-140,h-190); g.restore(); [[90,140],[w-90,140]].forEach(([x,y]) => { g.beginPath(); g.arc(x,y,12,0,6.3); g.fillStyle="#"+spot.getHexString(); g.fill(); }); }
        g.textAlign = "left"; g.fillStyle = "#1e1912"; if(!cork) g.fillStyle = "#e9e1cc";
        (bd.lines||[]).forEach((L,k) => { g.font = (k===0 ? `40px ${FELLSC}` : `italic 36px ${FELL}`); g.fillText(L, 100, 200 + k*44); }); }
    });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(bw+.12, bh+.12, .06), mat("#4a3b2e")); frame.position.copy(c); frame.position.y = 2.15; frame.rotation.y = yaw; frame.castShadow = true; scene.add(frame);
    const m = label(new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), mat("#ffffff",{map:tex}))); m.position.copy(c).add(f.n.clone().multiplyScalar(.035)); m.position.y = 2.15; m.rotation.y = yaw; scene.add(m);
    frame.userData.hit = {kind: o.raw && o.raw.action==="links" ? "open" : "look", label: o.title, onClick:()=>hooks.useObject(o)}; picks.push(frame);
    m.userData.hit = frame.userData.hit; picks.push(m);
  }

  /* ---- stations: a desk, a table, or a low bookcase, with the things on it ---- */
  function buildStation(slot, sl, objs, p, R, spot){
    const f = sl.face, u = f.b.clone().sub(f.a).normalize(), n = f.n, yaw = Math.atan2(-u.z, u.x);
    const len = f.a.distanceTo(f.b), free = [len*.5, len*.3, len*.7].find(at => !f.holes.some(h => Math.abs(h.at-at) < h.w/2 + 1.1)) ?? len*.5;
    const c = f.a.clone().add(u.clone().multiplyScalar(free)).add(n.clone().multiplyScalar(1.15));
    const bookish = objs.filter(o => o.bookish).length > objs.length/2;
    const shown = objs.slice(0, 9), w = Math.min(len*.7, Math.max(1.6, shown.length*.62+.5)), topY = bookish ? .95 : .82;
    const g = new THREE.Group(); g.position.copy(c); g.rotation.y = yaw;
    const wood = mat("#8c7458"), darkWood = mat("#4a3b2e");
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, .07, .95), mat("#a58c6c")); top.position.y = topY; top.castShadow = top.receiveShadow = true; g.add(top);
    if(bookish){ const body = new THREE.Mesh(new THREE.BoxGeometry(w-.04, topY-.03, .9), darkWood); body.position.y = (topY-.03)/2; g.add(body);
      for(let k=0;k<2;k++){ const shelf = new THREE.Mesh(new THREE.BoxGeometry(w-.1,.03,.85), wood); shelf.position.set(0, .12+k*.38, .02); g.add(shelf);
        const bb=bookBatch(); let x=-w/2+.08; while(x<w/2-.1){ const bw=.03+R()*.04, bh=.24+R()*.08; bb.add(x+bw/2, .14+k*.38+bh/2, .25, bw, bh, .6, ["#7d6b55","#4a4339","#9a8b70","#"+spot.getHexString()][Math.floor(R()*4)]); x+=bw+.005; } const bm=bb.mesh(); if(bm) g.add(bm); } }
    else { top.visible = false; g.add(table(w, .95, topY + .035)); }   // a joined table: turned legs, moulded top, drawers with brass knobs
    // the station itself is clickable: look closer
    g.userData.hit = {kind:"closer", label: (bookish ? "A low bookcase" : "A desk") + ` with ${objs.length} thing${objs.length>1?"s":""}: look closer`, onClick:()=>hooks.closer(slot)};
    picks.push(g);
    // the things, each its own small model with its own card
    const spacing = (w-.4)/Math.max(1, shown.length-1 || 1);
    shown.forEach((o, i) => {
      const og = model(o.icon, spot, R); og.scale.multiplyScalar(1.35); const x = shown.length===1 ? 0 : -w/2+.2 + i*spacing;
      og.position.set(x, topY+.035, .05 + (i%2)*.12); og.rotation.y = (R()-.5)*.5; og.traverse(m => { if(m.isMesh){ m.castShadow = true; } });
      og.userData.hit = {kind: o.kind==="key" ? "take" : o.href ? "open" : o.action ? "use" : "look", label: o.title + (o.by ? " · " + o.by : ""), onClick:()=>hooks.useObject(o)};
      g.add(og); picks.push(og);
    });
    scene.add(g);
    // a close-up viewpoint over this station
    const view = c.clone().add(n.clone().multiplyScalar(.82)).setY(1.42), topW = c.clone().add(n.clone().multiplyScalar(-.05)).setY(topY);
    stations[slot] = {view, top:topW};
  }

  /* ---- the things themselves, as small models ---- */
  function model(icon, spot, R){
    const g = new THREE.Group(), s = .9;
    const paper = mat("#ece6d6"), ink = mat("#2a251e"), brass = mat("#b39a62", {metalness:.6, roughness:.35}), wood = mat("#6e5743"), sp = mat("#"+spot.getHexString());
    const add = (geo, m, x=0, y=0, z=0, rx=0, ry=0, rz=0) => { const me = new THREE.Mesh(geo, m); me.position.set(x,y,z); me.rotation.set(rx,ry,rz); g.add(me); return me; };
    switch(icon){
      case "rule": add(new THREE.BoxGeometry(.5,.025,.07), paper, 0,.013); add(new THREE.BoxGeometry(.5,.012,.025), sp, 0,.03); add(new THREE.BoxGeometry(.05,.04,.09), brass, .08,.03); break;
      case "net": add(new THREE.CylinderGeometry(.03,.06,.06,12), wood, 0,.03); add(new THREE.SphereGeometry(.13,24,16), paper, 0,.2); add(new THREE.TorusGeometry(.14,.008,6,32), brass, 0,.2,0, 0,0,.4); add(new THREE.TorusGeometry(.14,.006,6,32), ink, 0,.2,0, Math.PI/2,0,0); break;
      case "turns": add(new THREE.CylinderGeometry(.03,.06,.06,12), wood, 0,.03); add(new THREE.SphereGeometry(.13,24,16), paper, 0,.2); add(new THREE.TorusGeometry(.135,.01,6,24,2.2), sp, 0,.2,0, .5,.3,0); add(new THREE.TorusGeometry(.135,.01,6,24,1.6), ink, 0,.2,0, -.3,1.2,.4); break;
      case "planimeter": add(new THREE.CylinderGeometry(.02,.02,.02,10), ink, -.18,.01,0); add(new THREE.BoxGeometry(.25,.012,.02), brass, -.06,.03,-.04,0,.5,0); add(new THREE.BoxGeometry(.25,.012,.02), brass, .14,.03,.02,0,-.4,0); add(new THREE.CylinderGeometry(.04,.04,.015,16), paper, .04,.04,-.02, Math.PI/2,0,0); break;
      case "cross": for(let k=-3;k<=3;k++) add(new THREE.BoxGeometry(.008,.005,.32), ink, k*.03,.01,0,0,k*.12,0); add(new THREE.BoxGeometry(.34,.006,.01), sp, 0,.012,.06); break;
      case "plant": add(new THREE.CylinderGeometry(.08,.06,.12,12), sp, 0,.06); for(let k=0;k<7;k++) add(new THREE.ConeGeometry(.02,.3,5), mat("#55623f"), Math.sin(k)*.05,.27,Math.cos(k)*.05, Math.sin(k*2)*.4,0,Math.cos(k*2)*.4); break;
      case "cards": for(let k=0;k<3;k++) add(new THREE.BoxGeometry(.1,.004,.15), k===1?sp:paper, (k-1)*.06,.005+k*.004,0,0,(k-1)*.3,0); break;
      case "lock": add(new THREE.BoxGeometry(.16,.13,.08), brass, 0,.065); add(new THREE.TorusGeometry(.055,.014,8,20,Math.PI), mat("#3a3a3a",{metalness:.6}), 0,.13,0); for(let k=0;k<4;k++) add(new THREE.CylinderGeometry(.015,.015,.01,10), paper, -.05+k*.033,.08,.045, Math.PI/2,0,0); break;
      case "tiles": for(let i=0;i<4;i++) for(let j=0;j<4;j++){ if(i===3&&j===3) continue; add(new THREE.BoxGeometry(.045,.02,.045), (i+j)%2?paper:sp, -.075+j*.05,.01,-.075+i*.05); } add(new THREE.BoxGeometry(.22,.008,.22), wood, 0,-.002,0); break;
      case "crystal": for(let i=-2;i<=2;i++) for(let j=-2;j<=2;j++) if(i*i+j*j<7) add(new THREE.SphereGeometry(.018,8,6), (i===1&&j===0)?sp:ink, i*.04+(j%2)*.02,.06+j*.035,0); add(new THREE.BoxGeometry(.24,.01,.06), wood, 0,.005,0); break;
      case "tree": { const br=(x,y,len,a,dd)=>{ const x2=x+Math.sin(a)*len, y2=y+Math.cos(a)*len; const cyl=add(new THREE.CylinderGeometry(.004+dd*.002,.005+dd*.003,len,5), ink,(x+x2)/2,(y+y2)/2,0,0,0,-a); if(dd===0){ add(new THREE.SphereGeometry(.012,6,5), sp, x2,y2,0); return; } [-.5,0,.5].forEach(t=>br(x2,y2,len*.6,a+t,dd-1)); }; br(0,0,.14,0,3); add(new THREE.CylinderGeometry(.06,.07,.02,12), wood,0,.0,0); break; }
      case "book": case "unwritten": { const m = icon==="unwritten" ? mat("#e9e3d3", {transparent:true, opacity:.75}) : mat(["#6b4a3a","#3e4a58","#55583e"][Math.floor(R()*3)]); add(new THREE.BoxGeometry(.17,.04,.24), m, 0,.02,0); add(new THREE.BoxGeometry(.16,.032,.23), paper, .005,.02,0); add(new THREE.BoxGeometry(.06,.002,.03), brass, 0,.041,-.04); break; }
      case "books": for(let k=0;k<4;k++) add(new THREE.BoxGeometry(.2-k*.02,.035,.26-k*.02), mat(["#6b4a3a","#3e4a58","#55583e","#"+spot.getHexString()][k]), (R()-.5)*.02,.018+k*.036,0,0,(R()-.5)*.3,0); break;
      case "scroll": add(new THREE.CylinderGeometry(.025,.025,.28,12), paper, 0,.025,0,0,0,Math.PI/2); add(new THREE.CylinderGeometry(.012,.012,.32,8), wood, 0,.025,0,0,0,Math.PI/2); add(new THREE.BoxGeometry(.2,.002,.12), paper, 0,.002,.08); break;
      case "lectern": add(new THREE.CylinderGeometry(.02,.03,.4,8), wood, 0,.2); add(new THREE.BoxGeometry(.3,.02,.22), wood, 0,.42,0,-.4,0,0); add(new THREE.BoxGeometry(.26,.01,.18), paper, 0,.44,.005,-.4,0,0); break;
      case "clock": add(new THREE.CylinderGeometry(.12,.12,.04,32), brass, 0,.13,0,Math.PI/2,0,0); add(new THREE.CylinderGeometry(.105,.105,.045,32), paper, 0,.13,.003,Math.PI/2,0,0); add(new THREE.BoxGeometry(.008,.07,.005), ink, 0,.16,.03); add(new THREE.BoxGeometry(.05,.006,.005), sp, .02,.13,.03); add(new THREE.BoxGeometry(.06,.02,.06), wood, 0,.01,0); break;
      case "hourglass": add(new THREE.CylinderGeometry(.08,.08,.015,16), wood, 0,.008); add(new THREE.CylinderGeometry(.08,.08,.015,16), wood, 0,.29); add(new THREE.CylinderGeometry(.06,.005,.13,16,1,true), mat("#e8eceb",{transparent:true,opacity:.5}), 0,.21); add(new THREE.CylinderGeometry(.005,.06,.13,16,1,true), mat("#e8eceb",{transparent:true,opacity:.5}), 0,.08); add(new THREE.ConeGeometry(.045,.05,16), sp, 0,.04); break;
      case "compass": add(new THREE.CylinderGeometry(.09,.09,.03,24), brass, 0,.015); add(new THREE.CylinderGeometry(.08,.08,.032,24), paper, 0,.016); add(new THREE.ConeGeometry(.012,.07,4), sp, 0,.035,-.03, -Math.PI/2,0,0); add(new THREE.ConeGeometry(.012,.07,4), ink, 0,.035,.03, Math.PI/2,0,0); break;
      case "lamp": add(new THREE.CylinderGeometry(.07,.08,.03,12), mat("#2a2520"), 0,.015); add(new THREE.CylinderGeometry(.06,.06,.16,12,1,true), mat("#e8eceb",{transparent:true,opacity:.45}), 0,.11); add(new THREE.SphereGeometry(.03,8,6), new THREE.MeshBasicMaterial({color:"#ffd27a"}), 0,.1); add(new THREE.CylinderGeometry(.07,.06,.03,12), mat("#2a2520"), 0,.2); break;
      case "key": add(new THREE.TorusGeometry(.035,.01,8,16), brass, -.06,.012,0,Math.PI/2,0,0); add(new THREE.BoxGeometry(.12,.012,.012), brass, .03,.012,0); add(new THREE.BoxGeometry(.012,.012,.03), brass, .08,.012,.015); break;
      case "pond": add(new THREE.CylinderGeometry(.14,.14,.02,24), mat("#7d9aa3"), 0,.01); for(let k=0;k<5;k++) add(new THREE.CylinderGeometry(.03,.03,.006,12), mat("#5f7445"), Math.sin(k*2.4)*.07,.024,Math.cos(k*2.4)*.07); break;
      case "fraction": add(new THREE.BoxGeometry(.12,.004,.17), paper, 0,.003); add(new THREE.BoxGeometry(.06,.006,.004), ink, 0,.006,0); add(new THREE.BoxGeometry(.012,.006,.035), sp, 0,.006,-.035); add(new THREE.BoxGeometry(.012,.006,.035), sp, 0,.006,.035); break;
      case "note": add(new THREE.BoxGeometry(.15,.003,.2), paper, 0,.002,0,0,.2,0); for(let k=0;k<4;k++) add(new THREE.BoxGeometry(.1,.004,.004), ink, 0,.004,-.05+k*.03,0,.2,0); break;
      case "map": add(new THREE.BoxGeometry(.26,.003,.18), paper, 0,.002); add(new THREE.BoxGeometry(.004,.006,.18), ink, -.043,.003); add(new THREE.BoxGeometry(.004,.006,.18), ink, .043,.003); add(new THREE.TorusGeometry(.03,.004,4,12), sp, .05,.004,.03,Math.PI/2,0,0); break;
      case "pendulum": add(new THREE.CylinderGeometry(.003,.003,.35,4), ink, 0,.2); add(new THREE.SphereGeometry(.04,16,12), brass, 0,.03); break;
      case "hex": { const sh = new THREE.Shape(); for(let k=0;k<6;k++){ const t=k*Math.PI/3; k? sh.lineTo(Math.cos(t)*.12,Math.sin(t)*.12) : sh.moveTo(.12,0); } add(new THREE.ExtrudeGeometry(sh,{depth:.03,bevelEnabled:false}), paper, 0,.03,0,-Math.PI/2,0,0); break; }
      case "orrery": add(new THREE.CylinderGeometry(.06,.08,.12,12), wood, 0,.06); add(new THREE.SphereGeometry(.04,16,12), brass, 0,.17);
        [.08,.12,.16].forEach((r,k) => { add(new THREE.TorusGeometry(r,.003,4,40), brass, 0,.15,0, Math.PI/2,0,0); add(new THREE.SphereGeometry(.014+k*.004,10,8), k===1?sp:ink, Math.cos(k*2.2)*r,.15,Math.sin(k*2.2)*r); }); break;
      case "carriage": { // brass case, glass sides, a handle, and hands that keep palace time
        const glass = mat("#e8eceb",{transparent:true, opacity:.28, roughness:.1});
        add(new THREE.BoxGeometry(.2,.02,.15), brass, 0,.01); add(new THREE.BoxGeometry(.18,.015,.13), brass, 0,.27);
        [[-.085,-.06],[.085,-.06],[-.085,.06],[.085,.06]].forEach(([x,z]) => add(new THREE.BoxGeometry(.018,.25,.018), brass, x,.14,z));
        add(new THREE.BoxGeometry(.15,.23,.002), glass, 0,.14,-.062); add(new THREE.BoxGeometry(.002,.23,.11), glass, -.084,.14,0); add(new THREE.BoxGeometry(.002,.23,.11), glass, .084,.14,0);
        add(new THREE.TorusGeometry(.055,.008,6,20,Math.PI), brass, 0,.285,0);
        add(new THREE.BoxGeometry(.15,.17,.004), brass, 0,.15,.061); add(new THREE.CylinderGeometry(.058,.058,.004,32), paper, 0,.16,.064, Math.PI/2,0,0);
        for(let k=0;k<12;k++){ const a = k/12*TAU; add(new THREE.BoxGeometry(.004,.012,.002), ink, Math.sin(a)*.05,.16+Math.cos(a)*.05,.067, 0,0,-a); }
        const hh = new THREE.Group(), mh = new THREE.Group(); hh.position.set(0,.16,.068); mh.position.set(0,.16,.07); g.add(hh); g.add(mh);
        const hb = new THREE.Mesh(new THREE.BoxGeometry(.008,.032,.002), ink); hb.position.y = .016; hh.add(hb);
        const mb = new THREE.Mesh(new THREE.BoxGeometry(.005,.048,.002), ink); mb.position.y = .024; mh.add(mb);
        const balance = add(new THREE.TorusGeometry(.012,.002,4,16), brass, 0,.25,0, Math.PI/2,0,0);
        anims.push(t => { const d = hooks.now(), m = d.getMinutes() + d.getSeconds()/60, h = (d.getHours()%12) + m/60; mh.rotation.z = -m/60*TAU; hh.rotation.z = -h/12*TAU; balance.rotation.z = .9*Math.sin(t*TAU*2.5); });
        break; }
      case "astrolabe": { const ring = add(new THREE.CylinderGeometry(.13,.13,.012,40), brass, 0,.2,0, Math.PI/2,0,0); add(new THREE.CylinderGeometry(.11,.11,.014,40), paper, 0,.2,.002, Math.PI/2,0,0);
        add(new THREE.TorusGeometry(.075,.006,6,32), ink, 0,.2,.012); add(new THREE.BoxGeometry(.22,.012,.006), sp, 0,.2,.014, 0,0,.5); add(new THREE.BoxGeometry(.04,.05,.02), brass, 0,.34,0);
        add(new THREE.CylinderGeometry(.02,.02,.06,10), mat("#e8eceb",{transparent:true,opacity:.6}), 0,.36,0); add(new THREE.BoxGeometry(.03,.2,.03), wood, 0,.1,-.02); add(new THREE.CylinderGeometry(.07,.08,.02,16), wood, 0,.01,-.02); break; }
      case "bell": add(new THREE.CylinderGeometry(.09,.1,.02,24), wood, 0,.01); add(new THREE.SphereGeometry(.075,24,12,0,TAU,0,Math.PI/2), brass, 0,.02); add(new THREE.CylinderGeometry(.006,.006,.04,8), brass, 0,.11); add(new THREE.SphereGeometry(.014,10,8), brass, 0,.135); break;
      default: add(new THREE.BoxGeometry(.16,.12,.16), wood, 0,.06); add(new THREE.BoxGeometry(.17,.02,.17), sp, 0,.12);
    }
    g.scale.setScalar(1.25*s);
    return g;
  }

  /* ---- fittings that belong to particular rooms ---- */
  /* ---- a joiner's kit: turned legs, tables, desks, chairs, benches, columns, panelling ---- */
  const lathe = (prof, m, seg=16) => new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r,y]) => new THREE.Vector2(r,y)), seg), m);
  function turnedLeg(h, r, m){ // a baluster: foot, swelling vase, ring, square-ish neck
    const P = [[0,0],[r*.9,0],[r,.04*h],[r*.7,.1*h],[r*1.25,.32*h],[r*.75,.52*h],[r*1.05,.58*h],[r*.7,.64*h],[r*.85,.92*h],[r*.95,h],[0,h]];
    const leg = lathe(P, m, 12); leg.castShadow = true; return leg; }
  function knob(m){ return new THREE.Mesh(new THREE.SphereGeometry(.018, 10, 8), m); }
  function table(w, d, h, opts={}){ // a joined table: moulded top, apron with drawers, turned legs, stretchers
    const g = new THREE.Group(), wood = mat(opts.wood || "#7d6248"), dark = mat(opts.dark || "#4a3b2e"), brass = mat("#b39a62",{metalness:.6, roughness:.35});
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, .045, d), mat(opts.topColor || "#9a7f5f")); top.position.y = h - .022; top.castShadow = top.receiveShadow = true; g.add(top);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(w-.03, .03, d-.03), dark); lip.position.y = h - .06; g.add(lip);
    if(opts.leather){ const lt = new THREE.Mesh(new THREE.BoxGeometry(w-.24, .004, d-.24), mat(opts.leather)); lt.position.y = h + .002; lt.receiveShadow = true; g.add(lt); }
    const ap = new THREE.Mesh(new THREE.BoxGeometry(w-.12, .13, d-.12), wood); ap.position.y = h - .14; g.add(ap);
    const nd = Math.max(1, Math.round(w/.7)); for(let i=0;i<nd;i++){ const x = -w/2 + .06 + (i+.5)*(w-.12)/nd;
      const df = new THREE.Mesh(new THREE.BoxGeometry((w-.12)/nd - .05, .09, .015), mat(opts.wood || "#86694d")); df.position.set(x, h-.14, d/2-.055); g.add(df);
      const k = knob(brass); k.position.set(x, h-.14, d/2-.04); g.add(k); }
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz]) => { const L = turnedLeg(h-.2, .035, dark); L.position.set(sx*(w/2-.07), 0, sz*(d/2-.07)); g.add(L);
      const blk = new THREE.Mesh(new THREE.BoxGeometry(.075,.13,.075), dark); blk.position.set(sx*(w/2-.07), h-.14, sz*(d/2-.07)); g.add(blk); });
    const st = new THREE.Mesh(new THREE.BoxGeometry(w-.14, .03, .03), dark); st.position.y = .16; g.add(st);
    [-1,1].forEach(sx => { const s2 = new THREE.Mesh(new THREE.BoxGeometry(.03,.03,d-.14), dark); s2.position.set(sx*(w/2-.07), .16, 0); g.add(s2); });
    return g; }
  function pedestalDesk(w, d){ // a partners' desk: two banks of drawers, a green leather top, a little gallery at the back
    const g = new THREE.Group(), wood = mat("#6a4f38"), dark = mat("#3f3024"), brass = mat("#b39a62",{metalness:.6, roughness:.35}), h = .76;
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, .05, d), mat("#7a5b40")); top.position.y = h-.025; top.castShadow = top.receiveShadow = true; g.add(top);
    const lt = new THREE.Mesh(new THREE.BoxGeometry(w-.16, .004, d-.16), mat("#3f5a43")); lt.position.y = h+.002; g.add(lt);
    [-1,1].forEach(sx => { const pw = Math.min(.45, w*.3), ped = new THREE.Mesh(new THREE.BoxGeometry(pw, h-.12, d-.06), wood); ped.position.set(sx*(w/2-pw/2-.03), (h-.12)/2+.04, 0); ped.castShadow = true; g.add(ped);
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(pw+.03, .06, d-.03), dark); plinth.position.set(sx*(w/2-pw/2-.03), .03, 0); g.add(plinth);
      for(let k=0;k<3;k++){ const df = new THREE.Mesh(new THREE.BoxGeometry(pw-.06, .17, .012), mat("#77583e")); df.position.set(sx*(w/2-pw/2-.03), .16+k*.2, d/2-.025); g.add(df);
        const hd = new THREE.Mesh(new THREE.TorusGeometry(.022,.004,6,12,Math.PI), brass); hd.position.set(sx*(w/2-pw/2-.03), .2+k*.2, d/2-.015); hd.rotation.z = Math.PI; g.add(hd); } });
    const mid = new THREE.Mesh(new THREE.BoxGeometry(w*.38, .1, .012), mat("#77583e")); mid.position.set(0, h-.1, d/2-.02); g.add(mid);
    const gal = new THREE.Mesh(new THREE.BoxGeometry(w-.1, .012, .012), brass); gal.position.set(0, h+.09, -d/2+.04); g.add(gal);
    for(let k=0;k<=12;k++){ const post = new THREE.Mesh(new THREE.CylinderGeometry(.005,.005,.09,6), brass); post.position.set(-w/2+.05 + k*(w-.1)/12, h+.045, -d/2+.04); g.add(post); }
    return g; }
  function chair(m){ // a Windsor-ish chair: turned legs, saddle seat, spindle back
    const g = new THREE.Group(), wood = mat(m || "#5e4a37");
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(.24,.22,.05,20), wood); seat.position.y = .45; seat.scale.z = .9; seat.castShadow = true; g.add(seat);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz]) => { const L = turnedLeg(.43, .02, wood); L.position.set(sx*.15, 0, sz*.14); L.rotation.set(sz*.08, 0, -sx*.08); g.add(L); });
    const bow = new THREE.Mesh(new THREE.TorusGeometry(.2,.015,6,20,Math.PI), wood); bow.position.set(0,.66,-.17); g.add(bow);
    for(let k=-3;k<=3;k++){ const sp = new THREE.Mesh(new THREE.CylinderGeometry(.008,.01,.4,6), wood); sp.position.set(k*.05,.66,-.17); sp.scale.y = Math.sqrt(Math.max(.05, 1-(k*.05/.2)**2)); sp.position.y = .47 + .2*sp.scale.y; g.add(sp); }
    return g; }
  function bench(w, stone){ const g = new THREE.Group(), m = mat(stone ? "#c3b9a4" : "#6e5743");
    const seat = new THREE.Mesh(new THREE.BoxGeometry(w, .08, .42), m); seat.position.y = .44; seat.castShadow = seat.receiveShadow = true; g.add(seat);
    [-1,1].forEach(sx => { const leg = stone ? new THREE.Mesh(new THREE.BoxGeometry(.12,.4,.38), m) : turnedLeg(.4,.03,m); leg.position.set(sx*(w/2-.12), stone ? .2 : 0, 0); leg.castShadow = true; g.add(leg); });
    if(!stone){ const back = new THREE.Mesh(new THREE.BoxGeometry(w, .3, .04), m); back.position.set(0,.75,-.19); g.add(back); }
    return g; }
  function column(h, r, m){ // Tuscan: plinth, torus, a shaft that swells a little, echinus, abacus
    const g = new THREE.Group();
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(r*2.6,.12,r*2.6), m); plinth.position.y = .06; g.add(plinth);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(r*1.05,.05,8,24), m); torus.rotation.x = Math.PI/2; torus.position.y = .17; g.add(torus);
    const P = []; for(let i=0;i<=10;i++){ const t = i/10; P.push([r*(1 + .04*Math.sin(t*Math.PI*.8) - .14*t), .2 + t*(h-.5)]); }
    const shaft = lathe([[0,.2], ...P, [0,h-.3]], m, 24); shaft.castShadow = true; g.add(shaft);
    const ech = lathe([[0,h-.3],[r*.9,h-.3],[r*1.15,h-.2],[r*1.3,h-.14],[0,h-.14]], m, 24); g.add(ech);
    const ab = new THREE.Mesh(new THREE.BoxGeometry(r*2.8,.14,r*2.8), m); ab.position.y = h-.07; ab.castShadow = true; g.add(ab);
    return g; }
  function wallAt(faces, slot){ const f = faces.find(ff => ff.slot === slot); if(!f) return null; const u = f.b.clone().sub(f.a).normalize(), len = f.a.distanceTo(f.b);
    return {f, u, n:f.n, len, yaw:Math.atan2(-u.z, u.x), at:(t, off=0) => f.a.clone().add(u.clone().multiplyScalar(t)).add(f.n.clone().multiplyScalar(off)), free:(t, w) => !f.holes.some(h => Math.abs(h.at - t) < h.w/2 + w/2 + .1)}; }
  function wainscot(faces, height){ // frame-and-panel to dado height, with a chair rail and a skirting
    const frameM = mat("#6c553f"), panelM = mat("#7d6448"), railM = mat("#5a4634");
    faces.forEach(f => { const u = f.b.clone().sub(f.a).normalize(), len = f.a.distanceTo(f.b), yaw = Math.atan2(-u.z, u.x), n = f.n;
      const segs = []; let x = .05; const holes = (f.holes||[]).slice().sort((a,b) => a.at - b.at);
      holes.forEach(h => { const a = h.at - h.w/2 - .14; if(h.sill > height){ return; } if(a - x > .3) segs.push([x, a]); x = h.at + h.w/2 + .14; }); if(len - .05 - x > .3) segs.push([x, len-.05]);
      segs.forEach(([a,b]) => { const w = b - a, c = f.a.clone().add(u.clone().multiplyScalar((a+b)/2));
        const back = new THREE.Mesh(new THREE.BoxGeometry(w, height, .03), frameM); back.position.copy(c).add(n.clone().multiplyScalar(.02)); back.position.y = height/2; back.rotation.y = yaw; back.receiveShadow = true; scene.add(back);
        const np = Math.max(1, Math.round(w/.75)), pw = w/np; for(let k=0;k<np;k++){ const pc = f.a.clone().add(u.clone().multiplyScalar(a + (k+.5)*pw)).add(n.clone().multiplyScalar(.045));
          const pan = new THREE.Mesh(new THREE.BoxGeometry(pw-.16, height-.36, .02), panelM); pan.position.copy(pc); pan.position.y = height/2 + .03; pan.rotation.y = yaw; pan.castShadow = true; scene.add(pan); }
        const rail = new THREE.Mesh(new THREE.BoxGeometry(w, .06, .07), railM); rail.position.copy(c).add(n.clone().multiplyScalar(.045)); rail.position.y = height; rail.rotation.y = yaw; rail.castShadow = true; scene.add(rail);
        const sk = new THREE.Mesh(new THREE.BoxGeometry(w, .16, .05), railM); sk.position.copy(c).add(n.clone().multiplyScalar(.04)); sk.position.y = .08; sk.rotation.y = yaw; scene.add(sk); }); }); }
  function place(o, x, z, yaw=0, y=0){ o.position.set(x, y, z); o.rotation.y = yaw; o.traverse(m => { if(m.isMesh){ m.castShadow = true; m.receiveShadow = true; } }); scene.add(o); return o; }
  function decorBuild(p, faces, R, spot){
    const d = p.decor, sp = mat("#"+spot.getHexString());
    if(d.includes("rug")){ const tex = canvasTex(512,512,(g,w,h)=>{ g.fillStyle="#"+spot.getHexString(); g.fillRect(0,0,w,h); g.strokeStyle="#2b2318"; g.lineWidth=10; g.strokeRect(20,20,w-40,h-40); g.lineWidth=3; g.strokeRect(46,46,w-92,h-92); for(let i=0;i<10;i++){ g.beginPath(); g.arc(w/2,h/2,30+i*18,0,TAU); g.stroke(); } });
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.2,3), mat("#ffffff",{map:tex})); rug.rotation.x = -Math.PI/2; rug.position.y = .005; rug.receiveShadow = true; scene.add(rug); }
    if(d.includes("rose")){ const tex = canvasTex(1024,1024,(g,w,h)=>{ g.translate(w/2,h/2); g.fillStyle="#d9d0bb"; g.beginPath(); g.arc(0,0,500,0,TAU); g.fill(); g.strokeStyle="#2b2318"; g.lineWidth=10; g.stroke(); g.lineWidth=3; g.beginPath(); g.arc(0,0,440,0,TAU); g.stroke();
        for(let k=0;k<32;k++){ const t=k/32*TAU, r1 = k%8===0 ? 430 : k%4===0 ? 330 : k%2===0 ? 250 : 190; g.beginPath(); g.moveTo(Math.sin(t)*r1, -Math.cos(t)*r1); g.lineTo(Math.sin(t+.09)*48, -Math.cos(t+.09)*48); g.lineTo(0,0); g.closePath(); g.fillStyle = k%2 ? "#2b2318" : (k===0 ? "#"+spot.getHexString() : "#f1ead8"); g.fill(); g.stroke(); }
        g.fillStyle="#2b2318"; g.font=`80px ${FELLSC}`; g.textAlign="center"; ["N","E","S","W"].forEach((L,k)=>{ g.save(); g.rotate(k*Math.PI/2); g.fillText(L,0,-450+80); g.restore(); }); });
      const rose = new THREE.Mesh(new THREE.CircleGeometry(1.6,64), mat("#ffffff",{map:tex})); rose.rotation.set(-Math.PI/2, 0, p.F*DEG); rose.position.set(0,.007,.4); rose.receiveShadow = true; scene.add(rose); }
    if(d.includes("pendulum")){
      const pivot = new THREE.Group(); pivot.position.set(0, WALL_H, 0); scene.add(pivot);
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,WALL_H-.45,4), mat("#222")); wire.position.y = -(WALL_H-.45)/2; pivot.add(wire);
      const bob = new THREE.Mesh(new THREE.SphereGeometry(.2,24,16), mat("#b39a62",{metalness:.7,roughness:.3})); bob.position.y = -(WALL_H-.45); bob.castShadow = true; pivot.add(bob);
      for(let k=0;k<36;k++){ const t=k/36*TAU, peg = new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.16,8), mat("#e3dccb")); peg.position.set(Math.sin(t)*2.1,.08,Math.cos(t)*2.1); peg.castShadow=true; scene.add(peg); }
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.0,2.25,64), sp); ring.rotation.x = -Math.PI/2; ring.position.y = .006; scene.add(ring);
      anims.push(() => { const t = hooks.palaceSeconds(); const plane = hooks.pendulumPlane(); const sw = .32*Math.sin(t*TAU/5.6); pivot.rotation.set(0,0,0); pivot.rotateY(plane); pivot.rotateZ(sw); });
    }
    if(d.includes("stair")){ for(let k=0;k<7;k++){ const ring = new THREE.Mesh(new THREE.RingGeometry(1.7-k*.2, 2.6-k*.2, 40), mat(k%2?"#c9c0ad":"#9e9583",{side:THREE.DoubleSide})); ring.rotation.x = -Math.PI/2; ring.position.set(0, .01 - k*.22, .5); scene.add(ring); }
      const well = new THREE.Mesh(new THREE.CircleGeometry(1.0,32), new THREE.MeshBasicMaterial({color:"#0d0b09"})); well.rotation.x = -Math.PI/2; well.position.set(0,-1.5,.5); scene.add(well);
      for(let k=0;k<20;k++){ const t=k/20*TAU, post=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.9,6), mat("#3b3128")); post.position.set(Math.sin(t)*2.65,.45,.5+Math.cos(t)*2.65); scene.add(post); }
      const rail = new THREE.Mesh(new THREE.TorusGeometry(2.65,.04,6,64), mat("#b39a62",{metalness:.5})); rail.rotation.x = Math.PI/2; rail.position.set(0,.9,.5); scene.add(rail); }
    if(d.includes("pool")){
      const water = new THREE.Mesh(new THREE.CircleGeometry(3.4,64), new THREE.MeshStandardMaterial({color:"#7f9aa1", roughness:.15, metalness:.1})); water.rotation.x = -Math.PI/2; water.position.set(0,.02,.6); scene.add(water);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(3.45,.12,8,64), mat("#bdb4a0")); rim.rotation.x = Math.PI/2; rim.position.set(0,.05,.6); scene.add(rim);
      const pads = []; const r = .32; for(let j=-5;j<=5;j++) for(let i=-6;i<=6;i++){ const x=(i+(j&1)*.5)*2*r, z=j*r*1.732; if(x*x+z*z > 2.9*2.9 || R()<.12) continue;
        const shape = new THREE.Shape(); shape.moveTo(0,0); shape.absarc(0,0,r*.95,.15,TAU-.15,false); shape.lineTo(0,0);
        const pad = new THREE.Mesh(new THREE.ShapeGeometry(shape,24), mat("#61744a",{side:THREE.DoubleSide})); pad.rotation.x = -Math.PI/2; pad.rotation.z = R()*TAU; pad.position.set(x,.04,.6+z); pad.receiveShadow = true; scene.add(pad); pads.push([pad, R()*TAU]); }
      anims.push((t) => { pads.forEach(([pd,ph]) => { pd.position.y = .04 + .012*Math.sin(t*1.3+ph); pd.rotation.z += .0006*Math.sin(ph); }); });
    }
    if(d.includes("sundial")){
      const plate = canvasTex(1024,1024,(g,w,h)=>{ g.fillStyle="#c8b98f"; g.beginPath(); g.arc(w/2,h/2,500,0,TAU); g.fill(); g.strokeStyle="#2b2318"; g.lineWidth=8; g.stroke();
        const phi = p.lat*DEG; for(let hr=4; hr<=20; hr++){ const th = Math.atan2(Math.sin(phi)*Math.sin((hr-12)*15*DEG), Math.cos((hr-12)*15*DEG)); g.lineWidth = hr===12?6:3; g.beginPath(); g.moveTo(w/2,h/2); g.lineTo(w/2+Math.sin(th)*460, h/2-Math.cos(th)*460); g.stroke();
          g.save(); g.translate(w/2+Math.sin(th)*400, h/2-Math.cos(th)*400); g.rotate(th); g.fillStyle="#2b2318"; g.font=`54px ${FELLSC}`; g.textAlign="center"; g.fillText(["XII","I","II","III","IIII","V","VI","VII","VIII","IX","X","XI"][hr%12],0,0); g.restore(); } });
      // the dial is laid out with north toward the room's north
      const south = p.lat < 0, F = p.F*DEG + (south ? Math.PI : 0);   // the noon line points at the pole the style aims for
      const dial = new THREE.Mesh(new THREE.CircleGeometry(1.1,64), mat("#ffffff",{map:plate, metalness:.3, roughness:.5})); dial.rotation.set(-Math.PI/2, 0, F); dial.position.set(0,.92,0); dial.receiveShadow = true; scene.add(dial);
      // a baluster pedestal on two round steps
      const stoneM = mat("#c4bba6");
      [[1.55,.12,0],[1.2,.12,.12]].forEach(([r,h,y]) => { const st = new THREE.Mesh(new THREE.CylinderGeometry(r, r+.04, h, 48), stoneM); st.position.y = y + h/2; st.castShadow = st.receiveShadow = true; scene.add(st); });
      const ped = lathe([[0,.24],[.42,.24],[.42,.3],[.34,.34],[.22,.42],[.3,.56],[.32,.62],[.2,.74],[.16,.8],[.26,.84],[.38,.88],[.4,.92],[0,.92]], stoneM, 32); ped.castShadow = true; ped.receiveShadow = true; scene.add(ped);
      // the style, pointing at the celestial pole at the latitude's angle
      const L0 = .85, style = new THREE.Shape(); style.moveTo(0,0); style.lineTo(L0,0); style.lineTo(L0, L0*Math.tan(Math.min(89, Math.abs(p.lat))*DEG)); style.lineTo(0,0);
      const gn = new THREE.Mesh(new THREE.ExtrudeGeometry(style,{depth:.05,bevelEnabled:false}), mat("#8a7448",{metalness:.6,roughness:.35}));
      const holder = new THREE.Group(); holder.position.set(0,.92,0); holder.rotation.y = Math.atan2(Math.cos(F), -Math.sin(F)); gn.position.set(0,0,-.025); holder.add(gn); gn.castShadow = true; scene.add(holder);
      const read = {kind:"look", label:"The sundial: read the shadow", onClick:()=>hooks.dial && hooks.dial()}; dial.userData.hit = read; ped.userData.hit = read; picks.push(dial, ped);
    }
    // ---- fitted rooms
    if(d.includes("wainscot")) wainscot(faces, 1.05);
    if(d.includes("porter")){ // the Entry: hall bench, coat stand, umbrella stand, a pier table, a long rug toward the reading room
      const L = wallAt(faces, 0), Rt = wallAt(faces, 2), F = wallAt(faces, 3);
      if(L){ const t = [L.len*.82, L.len*.18].find(t => L.free(t, 1.6)); if(t!=null){ const b = bench(1.5, false), at = L.at(t, .35); place(b, at.x, at.z, L.yaw); } }
      const stand = new THREE.Group(), sw = mat("#4a3b2e"); const pole = turnedLeg(1.75, .03, sw); stand.add(pole);
      for(let k=0;k<4;k++){ const foot = new THREE.Mesh(new THREE.BoxGeometry(.32,.04,.04), sw); foot.rotation.y = k*Math.PI/4*2; foot.position.y = .03; stand.add(foot);
        const hook = new THREE.Mesh(new THREE.TorusGeometry(.06,.012,6,12,Math.PI), mat("#b39a62",{metalness:.6})); hook.position.set(Math.cos(k*Math.PI/2)*.06, 1.62, Math.sin(k*Math.PI/2)*.06); hook.rotation.y = -k*Math.PI/2; stand.add(hook); }
      const coat = new THREE.Mesh(new THREE.CylinderGeometry(.08,.22,.9,10,1,true), mat("#5a5148",{side:THREE.DoubleSide})); coat.position.set(.12,1.2,0); stand.add(coat);
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.12,16), mat("#2d2a27")); hat.position.set(-.08,1.78,0); stand.add(hat); const brim = new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.012,20), mat("#2d2a27")); brim.position.set(-.08,1.72,0); stand.add(brim);
      place(stand, -4.75, 4.75);
      const urn = lathe([[0,0],[.14,0],[.17,.1],[.15,.45],[.17,.5],[0,.5]], mat("#6b6f6a"), 20); place(urn, 4.85, 4.85);
      [[.02,.95],[-.03,.9],[.05,.85]].forEach(([dx,hh],k) => { const um = new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,hh,6), mat(["#2d2a27","#5b2a22","#283447"][k])); um.position.set(4.85+dx, hh/2+.1, 4.85+dx); um.rotation.z = dx*2; scene.add(um); });
      const runner = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.6), mat("#ffffff", {map: canvasTex(256, 512, (g,w,h) => { g.fillStyle = "#6b3a2e"; g.fillRect(0,0,w,h); g.strokeStyle = "#d9c9a3"; g.lineWidth = 8; g.strokeRect(14,14,w-28,h-28); g.lineWidth = 3; g.strokeRect(30,30,w-60,h-60); for(let y=70;y<h-60;y+=56){ g.beginPath(); g.moveTo(w/2,y); g.lineTo(w/2+40,y+28); g.lineTo(w/2,y+56); g.lineTo(w/2-40,y+28); g.closePath(); g.stroke(); } })}));
      runner.rotation.x = -Math.PI/2; runner.position.set(0,.009,-3.4); runner.receiveShadow = true; scene.add(runner);
    }
    if(d.includes("officefit")){ // the office: a partners' desk, chairs, a filing cabinet, a blackboard, a reading chair
      const Rw = wallAt(faces, 2); if(Rw){ for(let x = .7; x + 1.6 < Rw.len - .5; x += 1.68){ if(Rw.free(x+.8, 1.6)) buildBookcase(Rw.at(x+.8), Rw.u, Rw.n, 1.6, 3.3, R, spot); } }
      const desk = pedestalDesk(1.8, .9); place(desk, 1.6, -1.2, Math.PI);
      place(chair("#4f3d2c"), 1.6, -1.95, 0);                       // your chair, behind the desk
      place(chair("#6a5440"), 1.4, -.15, Math.PI + .25);             // a visitor's chair
      const lamp = new THREE.Group(); const lb = lathe([[0,0],[.08,0],[.06,.03],[.015,.05],[.015,.38],[0,.38]], mat("#b39a62",{metalness:.6, roughness:.35}), 16); lamp.add(lb);
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(.05,.14,.14,20,1,true), mat("#3f5a43",{side:THREE.DoubleSide})); shade.position.y = .42; lamp.add(shade);
      place(lamp, 2.25, -1.45, 0, .76); if(p.lampLit){ const pl = new THREE.PointLight("#ffd89a", 6, 4, 1.6); pl.position.set(2.25, 1.1, -1.45); scene.add(pl); }
      const papers = new THREE.Mesh(new THREE.BoxGeometry(.3,.03,.22), mat("#ece6d6")); place(papers, 1.2, -1.25, .2, .78);
      const cab = new THREE.Group(), cm = mat("#7a6a55"); const body = new THREE.Mesh(new THREE.BoxGeometry(.5,1.32,.62), cm); body.position.y = .66; cab.add(body);
      for(let k=0;k<4;k++){ const dr = new THREE.Mesh(new THREE.BoxGeometry(.44,.28,.012), mat("#8a7a63")); dr.position.set(0,.2+k*.31,.315); cab.add(dr); const hd = new THREE.Mesh(new THREE.BoxGeometry(.12,.02,.02), mat("#b39a62",{metalness:.6})); hd.position.set(0,.27+k*.31,.33); cab.add(hd); const lab = new THREE.Mesh(new THREE.BoxGeometry(.07,.04,.004), mat("#ece6d6")); lab.position.set(0,.31+k*.31,.323); cab.add(lab); }
      place(cab, -4.85, -5.05, 0);
      const Fw = wallAt(faces, 3); if(Fw){ const at = Fw.at(Fw.len*.5, .04), bb = new THREE.Group();
        const fr = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.5, .05), mat("#5a4634")); bb.add(fr);
        const slate = new THREE.Mesh(new THREE.PlaneGeometry(3.04, 1.34), mat("#ffffff", {map: canvasTex(1024, 450, (g,w,h) => { g.fillStyle = "#2c3330"; g.fillRect(0,0,w,h); for(let i=0;i<60;i++){ g.fillStyle = "rgba(220,225,215,.04)"; g.fillRect(Math.random()*w, Math.random()*h, 140, 30); }
          g.fillStyle = "#e6e8e0"; g.font = `italic 40px ${FELL}`; g.fillText("e", 60, 90); g.font = `italic 26px ${FELL}`; g.fillText("iπ", 82, 66); g.font = `italic 40px ${FELL}`; g.fillText("+ 1 = 0", 116, 90); g.fillText("∮ ω = 2πi · Res", 60, 170); g.font = `34px ${FELL}`; g.fillText("office hours: see the board by the door", 60, 270);
          g.strokeStyle = "#e6e8e0"; g.lineWidth = 3; g.beginPath(); g.arc(800, 200, 110, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(690, 200); g.lineTo(910, 200); g.moveTo(800, 90); g.lineTo(800, 310); g.stroke(); g.beginPath(); g.moveTo(800,200); g.lineTo(800+110*Math.cos(-.6), 200+110*Math.sin(-.6)); g.stroke(); })}));
        slate.position.z = .03; label(slate); bb.add(slate); const tray = new THREE.Mesh(new THREE.BoxGeometry(3.1,.04,.1), mat("#5a4634")); tray.position.set(0,-.78,.05); bb.add(tray);
        bb.position.set(at.x, 1.75, at.z); bb.rotation.y = Fw.yaw; scene.add(bb); }
      const arm = new THREE.Group(), am = mat("#6b3a2e"); const seat = new THREE.Mesh(new THREE.BoxGeometry(.75,.22,.7), am); seat.position.y = .32; arm.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(.75,.7,.18), am); back.position.set(0,.68,-.28); back.rotation.x = -.12; arm.add(back);
      [-1,1].forEach(sx => { const a = new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.62,12), am); a.rotation.x = Math.PI/2; a.position.set(sx*.38,.5,0); arm.add(a); });
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz]) => { const L = turnedLeg(.2,.025,mat("#3f3024")); L.position.set(sx*.3,0,sz*.28); arm.add(L); });
      place(arm, -3.6, 3.4, Math.PI*.8);
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.4), mat("#ffffff",{map: canvasTex(512, 360, (g,w,h) => { g.fillStyle = "#4f3a5a"; g.fillRect(0,0,w,h); g.strokeStyle = "#cdb88a"; g.lineWidth = 10; g.strokeRect(14,14,w-28,h-28); g.lineWidth = 3; for(let i=0;i<7;i++){ g.beginPath(); g.ellipse(w/2,h/2,40+i*26,24+i*17,0,0,TAU); g.stroke(); } })}));
      rug.rotation.x = -Math.PI/2; rug.position.set(1.4,.008,-.9); rug.receiveShadow = true; scene.add(rug);
    }
    if(d.includes("cloister")){ // the court: a colonnade on every side, its lean-to roof throwing a hard line of shadow; benches, urns, radial paving
      const cm = mat("#d3cab7"), H = WALL_H - .25, inset = 1.95;
      faces.forEach(f => { const u = f.b.clone().sub(f.a).normalize(), len = f.a.distanceTo(f.b), n = f.n, yaw = Math.atan2(-u.z, u.x);
        const nCol = 4;   // an even count, so a door at the middle of a wall opens between columns
        for(let k=0;k<nCol;k++){ const t = inset + k*(len - 2*inset)/(nCol-1), at = f.a.clone().add(u.clone().multiplyScalar(t)).add(n.clone().multiplyScalar(inset)); const col = column(H, .16, cm); col.position.copy(at); scene.add(col); }
        const ent = new THREE.Mesh(new THREE.BoxGeometry(len - 2*inset + .5, .26, .42), cm); ent.position.copy(mid(f)).add(n.clone().multiplyScalar(inset)); ent.position.y = H + .13; ent.rotation.y = yaw; ent.castShadow = true; scene.add(ent);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(len, .1, inset + .3), mat("#8f7a62")); roof.position.copy(mid(f)).add(n.clone().multiplyScalar((inset+.3)/2)); roof.position.y = H + .3; roof.rotation.y = yaw; roof.rotateX(-.08 * 0); roof.castShadow = true; roof.receiveShadow = true; scene.add(roof); });
      const pav = new THREE.Group(); for(let k=0;k<3;k++){ const ring = new THREE.Mesh(new THREE.RingGeometry(1.6 + k*.75, 1.68 + k*.75, 72), mat("#8f8573")); ring.rotation.x = -Math.PI/2; ring.position.y = .006; pav.add(ring); }
      for(let k=0;k<16;k++){ const t = k/16*TAU, ray = new THREE.Mesh(new THREE.PlaneGeometry(.05, 1.5), mat("#8f8573")); ray.rotation.set(-Math.PI/2, 0, t); ray.position.set(Math.sin(t)*2.4, .006, Math.cos(t)*2.4); pav.add(ray); }
      scene.add(pav);
      [[-2.9,0,Math.PI/2],[2.9,0,-Math.PI/2]].forEach(([x,z,yw]) => place(bench(1.6, true), x, z, yw));
      [[-3.3,-3.3],[3.3,-3.3],[-3.3,3.3],[3.3,3.3]].forEach(([x,z]) => { const urn = lathe([[0,0],[.18,0],[.14,.08],[.26,.3],[.3,.5],[.24,.62],[.28,.66],[0,.66]], mat("#b06a45"), 20); place(urn, x, z);
        const box = new THREE.Mesh(new THREE.SphereGeometry(.38,14,10), mat("#ffffff",{map:leafTex(R)})); box.position.set(x, 1.0, z); box.castShadow = true; scene.add(box); });
    }
    // ---- the gardens
    const green = () => mat("#ffffff", {map: leafTex(R)});
    const skyDir = (alt, az) => { const a = (az - p.F)*DEG, h = alt*DEG; return new THREE.Vector3(Math.sin(a)*Math.cos(h), Math.sin(h), -Math.cos(a)*Math.cos(h)); };
    if(d.includes("knot")){
      // a trefoil in clipped box: the hedge rises over and dips under at each crossing
      const curve = new THREE.Curve(); curve.getPoint = (t, out = new THREE.Vector3()) => { const a = t*TAU; return out.set((Math.sin(a) + 2*Math.sin(2*a))*.52, .3 + .18*Math.sin(3*a), (Math.cos(a) - 2*Math.cos(2*a))*.52 - 1.2); };
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 300, .16, 10, true), green()); tube.castShadow = true; tube.receiveShadow = true; scene.add(tube);
      const bed = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.3, .08, 48), mat("#6d5a43")); bed.position.set(0,.04,-1.2); bed.receiveShadow = true; scene.add(bed);
      const edge = new THREE.Mesh(new THREE.TorusGeometry(2.25, .07, 6, 64), mat("#b9ae98")); edge.rotation.x = Math.PI/2; edge.position.set(0,.08,-1.2); scene.add(edge);
    }
    if(d.includes("maze")){
      // turnings in the hedge, never quite letting you see through
      [[-3.6,-1.2,3.4,0],[3.4,1.6,3.0,0],[-1.6,-3.4,0,2.6],[1.8,3.6,0,2.2]].forEach(([x,z,lx,lz]) => { const h = new THREE.Mesh(new THREE.BoxGeometry(Math.max(.7,lx), WALL_H*.92, Math.max(.7,lz)), green()); h.position.set(x, WALL_H*.46, z); h.castShadow = h.receiveShadow = true; scene.add(h); });
    }
    if(d.includes("fountain")){
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.7,.5,40,1,true), mat("#bdb4a0",{side:THREE.DoubleSide})); basin.position.set(0,.25,0); scene.add(basin);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.65,.1,8,48), mat("#cfc6b2")); rim.rotation.x = Math.PI/2; rim.position.y = .5; scene.add(rim);
      const water = new THREE.Mesh(new THREE.CircleGeometry(1.6,48), new THREE.MeshStandardMaterial({color:"#7f9aa1", roughness:.15})); water.rotation.x = -Math.PI/2; water.position.y = .4; scene.add(water);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(.12,.18,1.3,12), mat("#cfc6b2")); col.position.y = .9; scene.add(col);
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(.45,24,12,0,TAU,Math.PI/2,Math.PI/2), mat("#cfc6b2",{side:THREE.DoubleSide})); bowl.position.y = 1.6; scene.add(bowl);
      const jet = new THREE.Mesh(new THREE.CylinderGeometry(.02,.05,.5,8), new THREE.MeshStandardMaterial({color:"#dfe9ee", transparent:true, opacity:.6})); jet.position.y = 1.85; scene.add(jet);
      anims.push(t => { jet.scale.y = 1 + .15*Math.sin(t*9); water.rotation.z = t*.05; });
    }
    if(d.includes("phyllo") || d.includes("sunflowers")){
      // Vogel's model: the n-th seed at radius c·√n and angle n times the golden angle
      const seedHead = (N, R0) => canvasTex(512, 512, (g,w,h) => { g.fillStyle = "#3a2a1a"; g.fillRect(0,0,w,h); const c = (w/2-10)/Math.sqrt(N), ga = Math.PI*(3-Math.sqrt(5));
        for(let n=1;n<=N;n++){ const r = c*Math.sqrt(n), t = n*ga; g.fillStyle = n%2 ? "#6b4a2a" : "#2a1d12"; g.beginPath(); g.arc(w/2 + r*Math.cos(t), h/2 + r*Math.sin(t), Math.max(2, c*.48), 0, TAU); g.fill(); } });
      if(d.includes("phyllo")){
        const bed = new THREE.Mesh(new THREE.CylinderGeometry(2.3,2.4,.35,64), mat("#7a6347")); bed.position.set(0,.18,.4); bed.receiveShadow = true; scene.add(bed);
        const ga = Math.PI*(3-Math.sqrt(5)), N = 610, c = 2.15/Math.sqrt(N), geo = new THREE.CylinderGeometry(.034,.04,.04,7);
        const im = new THREE.InstancedMesh(geo, mat("#ffffff"), N), m4 = new THREE.Matrix4(), col = new THREE.Color();
        for(let n=1;n<=N;n++){ const r = c*Math.sqrt(n), t = n*ga; m4.makeTranslation(r*Math.cos(t), .38, .4 + r*Math.sin(t)); im.setMatrixAt(n-1, m4);
          im.setColorAt(n-1, col.set(n%21===0 ? "#"+spot.getHexString() : n%13===0 ? "#c9a64a" : n%2 ? "#4a3520" : "#6b4c2c")); }
        im.instanceColor.needsUpdate = true; im.castShadow = true; scene.add(im);
      }
      if(d.includes("sunflowers")){
        // they turn their heads to the sun, or to the east, where it will rise
        const eastRel = (((90 - p.F) % 360) + 540) % 360 - 180, face = (p.sunUp ? p.sunRel : eastRel)*DEG, faceAlt = p.sunUp ? Math.min(50, p.sunAlt)*DEG : .15;
        const head = seedHead(400);
        [[-4.4,-3.9],[-3.5,-4.5],[-4.6,-2.6],[4.3,-4.2],[3.4,-4.6],[4.6,-2.9],[-4.4,3.6],[4.4,3.4]].forEach(([x,z],k) => {
          const hgt = 2 + R()*.7, g = new THREE.Group(); g.position.set(x,0,z); scene.add(g);
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(.035,.05,hgt,6), mat("#4f6a33")); stem.position.y = hgt/2; stem.castShadow = true; g.add(stem);
          for(let L=0;L<4;L++){ const leaf = new THREE.Mesh(new THREE.SphereGeometry(.18,8,6), mat("#5d7a3a")); leaf.scale.set(1,.15,.6); leaf.position.set(Math.cos(L*2.3)*.18, .5+L*.4, Math.sin(L*2.3)*.18); g.add(leaf); }
          const hd = new THREE.Group(); hd.position.y = hgt; g.add(hd);
          const disc = new THREE.Mesh(new THREE.CircleGeometry(.26, 40), mat("#ffffff",{map:head, side:THREE.DoubleSide})); hd.add(disc);
          for(let q=0;q<21;q++){ const pet = new THREE.Mesh(new THREE.ConeGeometry(.06,.24,4), mat("#d9b23c")); const t = q/21*TAU; pet.position.set(Math.cos(t)*.36, Math.sin(t)*.36, -.01); pet.rotation.z = t - Math.PI/2; hd.add(pet); }
          const tgt = new THREE.Vector3(Math.sin(face)*Math.cos(faceAlt), Math.sin(faceAlt), -Math.cos(face)*Math.cos(faceAlt)).multiplyScalar(10).add(new THREE.Vector3(x, hgt, z));
          hd.lookAt(tgt); hd.castShadow = true; });
      }
    }
    if(d.includes("moonflowers")){
      // white flowers that open at dusk and close by morning
      const open = p.band==="night" || p.band==="dusk";
      [[-4.2,-4.2],[-4.4,-1],[-4.2,2.6],[4.2,-4.2],[4.4,-1],[4.2,2.6],[-2,-4.6],[2,-4.6]].forEach(([x,z]) => {
        const bush = new THREE.Mesh(new THREE.SphereGeometry(.75,12,10), green()); bush.scale.y = .8; bush.position.set(x,.55,z); bush.castShadow = true; scene.add(bush);
        for(let k=0;k<9;k++){ const t = R()*TAU, ph = R()*1.2, at = new THREE.Vector3(x + Math.cos(t)*.62*Math.cos(ph), .55 + .55*Math.sin(ph)*.8, z + Math.sin(t)*.62*Math.cos(ph));
          const fl = open ? new THREE.Mesh(new THREE.CircleGeometry(.13, 10), new THREE.MeshStandardMaterial({color:"#f7f4ea", emissive:"#3a3a36", side:THREE.DoubleSide})) : new THREE.Mesh(new THREE.ConeGeometry(.04,.16,6), mat("#e8e4d6"));
          fl.position.copy(at); fl.lookAt(at.clone().multiplyScalar(2).sub(new THREE.Vector3(x,.55,z))); scene.add(fl); } });
    }
    if(d.includes("armillary")){
      // an equatorial dial: the polar rod's shadow falls on the hour band, sun time read straight off the brass
      const lat = p.lat, A = skyDir(Math.abs(lat), lat >= 0 ? 0 : 180).normalize(), Z = new THREE.Vector3(0,1,0);
      const M = Z.clone().sub(A.clone().multiplyScalar(Z.dot(A))).normalize(), west = skyDir(0, 270), W = west.sub(A.clone().multiplyScalar(west.dot(A))).normalize();
      const C = new THREE.Vector3(0, 1.45, 0), brass = mat("#b39a62",{metalness:.6, roughness:.35}), Rr = .62;
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(.18,.3,.85,16), mat("#bdb4a0")); ped.position.y = .42; ped.castShadow = true; scene.add(ped);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,1.7,8), brass); rod.position.copy(C); rod.quaternion.setFromUnitVectors(Z, A); rod.castShadow = true; scene.add(rod);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(Rr, Rr, .12, 64, 1, true), mat("#c7b07a",{metalness:.4, roughness:.45, side:THREE.DoubleSide})); band.position.copy(C); band.quaternion.setFromUnitVectors(Z, A); band.receiveShadow = true; band.castShadow = true; scene.add(band);
      const meridian = new THREE.Mesh(new THREE.TorusGeometry(Rr+.06, .018, 6, 64), brass); meridian.position.copy(C); meridian.lookAt(C.clone().add(W)); scene.add(meridian);
      const horizon = new THREE.Mesh(new THREE.TorusGeometry(Rr+.1, .02, 6, 64), brass); horizon.position.copy(C); horizon.rotation.x = Math.PI/2; scene.add(horizon);
      const support = new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.7,8), brass); support.position.set(0, .95, 0); scene.add(support);
      for(let hr=6; hr<=18; hr++){ const H = (hr-12)*15*DEG, P = M.clone().multiplyScalar(Math.cos(H)).add(W.clone().multiplyScalar(Math.sin(H))).multiplyScalar(-(Rr-.01));
        const tk = new THREE.Mesh(new THREE.BoxGeometry(.012, .13, hr===12 ? .05 : .03), mat("#2a251e")); tk.position.copy(C).add(P); tk.quaternion.setFromUnitVectors(Z, A); scene.add(tk);
        skyLabel(["VI","VII","VIII","IX","X","XI","XII","I","II","III","IV","V","VI"][hr-6], C.clone().add(P.clone().multiplyScalar(.82)), "#2a251e", 26, .95, .14); }
      const read = {kind:"look", label:"The armillary: an equatorial dial", onClick:()=>hooks.dial && hooks.dial()}; band.userData.hit = read; ped.userData.hit = read; picks.push(band, ped);
    }
    if(d.includes("orrery") && p.orrery){
      // the planets around a brass sun, each where it really is today; distances squeezed so Neptune fits on the lawn
      const O = p.orrery, C = new THREE.Vector3(0, .9, .3), rOf = a => .35 + .52*Math.log(1 + 2*a);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(.25,.4,.8,16), mat("#bdb4a0")); ped.position.set(C.x,.4,C.z); scene.add(ped);
      const sun = new THREE.Mesh(new THREE.SphereGeometry(.2, 24, 16), new THREE.MeshStandardMaterial({color:"#e9c35a", emissive:"#6b4a10", metalness:.4, roughness:.4})); sun.position.copy(C).setY(1.05); scene.add(sun);
      const ram = skyLabel("to the First Point of Aries →", C.clone().add(new THREE.Vector3(rOf(32)+.3, .1, 0)), "#3a3328", 30, .9, .35);
      O.forEach(pl => { const r = rOf(pl.a), t = pl.lon*DEG;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .008, 4, 96), mat("#8a7448",{metalness:.5})); ring.rotation.x = Math.PI/2; ring.position.copy(C); scene.add(ring);
        const at = C.clone().add(new THREE.Vector3(Math.cos(t)*r, .15, -Math.sin(t)*r));
        const arm = new THREE.Mesh(new THREE.BoxGeometry(r, .012, .012), mat("#8a7448",{metalness:.5})); arm.position.copy(C).add(new THREE.Vector3(Math.cos(t)*r/2, .12, -Math.sin(t)*r/2)); arm.rotation.y = t; scene.add(arm);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(pl.size, 16, 12), mat(pl.color)); ball.position.copy(at); ball.castShadow = true; scene.add(ball);
        if(pl.rings){ const rg = new THREE.Mesh(new THREE.RingGeometry(pl.size*1.4, pl.size*2.2, 32), mat("#cdb88a",{side:THREE.DoubleSide})); rg.position.copy(at); rg.rotation.x = -Math.PI/2 + .45; scene.add(rg); }
        const hit = {kind:"look", label:`${pl.name}: ${pl.note}`, onClick:()=>hooks.planets && hooks.planets()}; ball.userData.hit = hit; picks.push(ball);
        skyLabel(pl.sym + " " + pl.name, at.clone().add(new THREE.Vector3(0, .16 + pl.size, 0)), "#2a251e", 26, .95, .22, true); });
    }
    if(d.includes("pillar")){ const col = new THREE.Mesh(new THREE.CylinderGeometry(.55,.6,WALL_H,24), mat("#d3cab7")); col.position.set(0,WALL_H/2,-.5); col.castShadow = true; scene.add(col);
      const zero = canvasTex(256,256,(g,w,h)=>{ g.fillStyle="#d3cab7"; g.fillRect(0,0,w,h); g.fillStyle="#"+spot.getHexString(); g.font=`200px ${FELLSC}`; g.textAlign="center"; g.fillText(p.sheetZero||"0",w/2,200); });
      const lab = label(new THREE.Mesh(new THREE.PlaneGeometry(.6,.6), mat("#ffffff",{map:zero}))); lab.position.set(0,2.2,.07); scene.add(lab); }
    if(d.includes("glacier")){ faces.forEach(f => { const u=f.b.clone().sub(f.a), L=u.length(); u.normalize(); for(let x=.3;x<L;x+=.35+R()*.3){ const h=.3+R()*.9, ic=new THREE.Mesh(new THREE.ConeGeometry(.06+R()*.05,h,6), mat("#eef2f1",{roughness:.2})); ic.rotation.x = Math.PI; const pnt=f.a.clone().add(u.clone().multiplyScalar(x)).add(f.n.clone().multiplyScalar(.25)); ic.position.set(pnt.x, WALL_H-h/2-.05, pnt.z); scene.add(ic); } }); }
    if(d.includes("clockface")||d.includes("chalkboard")||d.includes("woodcut")||d.includes("thermo")||d.includes("names")||d.includes("screen")||d.includes("dial")){
      const f = faces.find(ff => ff.slot===1); if(f){ const u=f.b.clone().sub(f.a).normalize(), yaw=Math.atan2(-u.z,u.x), len=f.a.distanceTo(f.b);
        const atFace = (ff, y, h, tex) => { const uu=ff.b.clone().sub(ff.a).normalize(), L=ff.a.distanceTo(ff.b), w=Math.min(5.5, L*.8); const m = label(new THREE.Mesh(new THREE.PlaneGeometry(w,h), mat("#ffffff",{map:tex}))); const c=ff.a.clone().add(uu.clone().multiplyScalar(L/2)).add(ff.n.clone().multiplyScalar(.04)); m.position.set(c.x,y,c.z); m.rotation.y=Math.atan2(-uu.z,uu.x); scene.add(m); return m; };
        const at = (x,y,w,h,tex) => { const free=[len*.2,len*.8,len*.5].find(cc => !f.holes.some(hh => Math.abs(hh.at-cc) < hh.w/2 + w/2 + .2 && hh.sill < y+h/2)) ?? len*.2; const m = label(new THREE.Mesh(new THREE.PlaneGeometry(w,h), mat("#ffffff",{map:tex}))); const c=f.a.clone().add(u.clone().multiplyScalar(x ?? free)).add(f.n.clone().multiplyScalar(.04)); m.position.set(c.x,y,c.z); m.rotation.y=yaw; scene.add(m); return m; };
        if(d.includes("chalkboard")) at(len*.5, 3.3, Math.min(5,len*.6), .9, canvasTex(1024,190,(g,w,h)=>{ g.fillStyle="#2c3430"; g.fillRect(0,0,w,h); g.strokeStyle="#5a4632"; g.lineWidth=16; g.strokeRect(0,0,w,h); g.fillStyle="#ebe8de"; g.font=`italic 64px ${FELL}`; g.textAlign="center"; g.fillText("3/4 + 1/6 = 9/12 + 2/12 = 11/12", w/2, 120); }));
        if(d.includes("clockface")){ const tex = canvasTex(512,512,(g,w,h)=>drawClock(g,w,h,p)); const m = at(len*.22, 2.9, 1.1, 1.1, tex); anims.push(()=>{ if(Math.random()<.01){ const c=tex.image.getContext("2d"); drawClock(c,512,512,p); tex.needsUpdate=true; } }); }
        if(d.includes("woodcut")) at(null, 2.5, 1.1, .9, canvasTex(512,420,(g,w,h)=>{ g.fillStyle="#e9e2d0"; g.fillRect(0,0,w,h); g.strokeStyle="#2b2318"; g.lineWidth=18; g.strokeRect(0,0,w,h); for(let r=0;r<5;r++) for(let c=0;c<=r;c++){ g.beginPath(); g.arc(w/2+(c-r/2)*60, 70+r*55, 27, 0, TAU); g.fillStyle="#f4efe2"; g.fill(); g.lineWidth=3; g.stroke(); } g.fillStyle="#2b2318"; g.font=`26px ${FELLSC}`; g.textAlign="center"; g.fillText("KEPLER · 1611", w/2, h-30); }));
        if(d.includes("thermo")) at(null, 2.3, .55, 1.6, canvasTex(160,460,(g,w,h)=>{ g.fillStyle="#e8e1cf"; g.fillRect(0,0,w,h); g.strokeStyle="#2b2318"; g.lineWidth=8; g.strokeRect(0,0,w,h); g.fillStyle="#f4f2ec"; g.fillRect(w/2-10,40,20,h-110); g.beginPath(); g.arc(w/2,h-55,24,0,TAU); g.fillStyle="#"+spot.getHexString(); g.fill(); if(p.temp!=null){ const f=Math.max(0,Math.min(1,(p.temp+20)/120)), y=h-70-(h-110)*f; g.fillRect(w/2-6,y,12,h-70-y); g.fillStyle="#2b2318"; g.font=`34px ${FELLSC}`; g.textAlign="center"; g.fillText(Math.round(p.temp)+"°",w/2,32); } for(let k=0;k<=12;k++){ const y=h-70-(h-110)*k/12; g.fillStyle="#2b2318"; g.fillRect(w/2+14,y,k%3?10:18,2); } }));
        if(d.includes("names") && p.names) atFace(faces.find(ff => ff.slot===0 && !ff.holes.length) || faces.find(ff => ff.slot===2 && !ff.holes.length) || f, 2.5, 2.1, canvasTex(1024,420,(g,w,h)=>{ g.fillStyle="#cfc6b3"; g.fillRect(0,0,w,h); g.fillStyle="#2b2318"; g.font=`italic 34px ${FELL}`; p.names.forEach((nm,i)=>{ g.save(); g.translate(40+(i%2)*500, 50+Math.floor(i/2)*52); g.rotate((R()-.5)*.05); g.fillText((nm.n!=null?nm.n+" · ":"")+nm.name,0,0); g.restore(); }); }));
        if(d.includes("screen")) at(len*.5, 3.4, Math.min(4,len*.5), 1.1, canvasTex(800,220,(g,w,h)=>{ g.fillStyle="#f7f5ef"; g.fillRect(0,0,w,h); for(let i=0;i<300;i++){ const t=i*2.39996, r=6*Math.sqrt(i+.5); g.beginPath(); g.arc(w/2+r*Math.cos(t)*2.4, h/2+r*Math.sin(t), 2.4, 0, TAU); g.fillStyle="#2b2318"; g.fill(); } }));
      }
    }
    if(d.includes("gloom")) { /* handled by the light */ }
    if(d.includes("cot")){ const cot = new THREE.Mesh(new THREE.BoxGeometry(2.1,.45,.9), mat("#8b7d66")); cot.position.set(-1.2,.3,-1.8); cot.castShadow = true; scene.add(cot); const bl = new THREE.Mesh(new THREE.BoxGeometry(1.6,.12,.85), mat("#5e5246")); bl.position.set(-.9,.58,-1.8); scene.add(bl); const pil = new THREE.Mesh(new THREE.BoxGeometry(.5,.14,.6), mat("#e2dccb")); pil.position.set(-2.0,.6,-1.8); scene.add(pil);
      const ember = new THREE.PointLight("#ff8a3a", .8, 2.5, 2); ember.position.set(-2.0,.8,-1.4); scene.add(ember); anims.push((t)=>{ ember.intensity = .5+.4*Math.abs(Math.sin(t*1.7)*Math.sin(t*.6)); }); }
    if(d.includes("cardtables")){ [[-1.6,-.4],[1.7,.8]].forEach(([x,z],k)=>{ const top = new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.0,.06,40), mat(k? "#55623f" : "#4a5a3a")); top.position.set(x,.78,z); top.receiveShadow = true; scene.add(top); const leg = new THREE.Mesh(new THREE.CylinderGeometry(.08,.2,.76,10), mat("#3e3126")); leg.position.set(x,.38,z); scene.add(leg); for(let c=0;c<5;c++){ const card=new THREE.Mesh(new THREE.BoxGeometry(.12,.005,.17), mat(c===2?"#"+spot.getHexString():"#ece6d6")); card.position.set(x-.3+c*.15,.815,z+(c%2)*.06); card.rotation.y=(c-2)*.25; scene.add(card); } }); }
    if(d.includes("desks")){ for(let r=0;r<2;r++) for(let c=-1;c<=1;c++){ const dk = new THREE.Mesh(new THREE.BoxGeometry(1.2,.05,.6), mat("#7a6450")); dk.position.set(c*2.1, .74, -1.0 + r*1.6); dk.castShadow = true; scene.add(dk); [[-.55,-.25],[.55,-.25],[-.55,.25],[.55,.25]].forEach(([lx,lz])=>{ const lg=new THREE.Mesh(new THREE.BoxGeometry(.05,.72,.05), mat("#3e3126")); lg.position.set(c*2.1+lx,.36,-1.0+r*1.6+lz); scene.add(lg); }); } }
    if(d.includes("bigtree")){ const br=(pos,len,dirv,dd)=>{ const end=pos.clone().add(dirv.clone().multiplyScalar(len)); const cyl=new THREE.Mesh(new THREE.CylinderGeometry(.02+dd*.03,.03+dd*.04,len,6), mat("#3b3128")); cyl.position.copy(pos.clone().add(end).multiplyScalar(.5)); cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dirv.clone().normalize()); cyl.castShadow=true; scene.add(cyl); if(dd===0){ const b=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8), sp); b.position.copy(end); scene.add(b); return; } [-.6,0,.6].forEach((a,i)=>{ const nd=dirv.clone().applyAxisAngle(new THREE.Vector3(0,1,0), i*2.1).applyAxisAngle(new THREE.Vector3(0,0,1), a*.6); nd.y = Math.abs(nd.y)+.5; br(end,len*.62,nd.normalize(),dd-1); }); }; br(new THREE.Vector3(0,0,-1.5),1.4,new THREE.Vector3(0,1,0),3); }
    if(d.includes("polytope")){ const t=(1+Math.sqrt(5))/2, V=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]];
      const grp=new THREE.Group(); grp.position.set(0,2.9,-1); scene.add(grp); const pts=V.map(v=>new THREE.Vector3(...v).multiplyScalar(.32));
      for(let i=0;i<12;i++) for(let j=i+1;j<12;j++){ if(Math.abs(pts[i].distanceTo(pts[j])-.64)>1e-3) continue; const a=pts[i], b=pts[j]; const cyl=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.64,5), mat("#2b2318")); cyl.position.copy(a.clone().add(b).multiplyScalar(.5)); cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), b.clone().sub(a).normalize()); grp.add(cyl); }
      pts.forEach(pp=>{ const s=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6), sp); s.position.copy(pp); grp.add(s); });
      anims.push((tt)=>{ grp.rotation.y = tt*.25; grp.rotation.x = .3*Math.sin(tt*.2); }); }
    if(d.includes("alethiometer")){ const g=new THREE.Group(); g.position.set(0,1.2,-1.6); scene.add(g); const face=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.06,48), mat("#b39a62",{metalness:.6,roughness:.35})); face.rotation.x=Math.PI/2-.5; g.add(face); const ped=new THREE.Mesh(new THREE.CylinderGeometry(.06,.2,1.2,10), mat("#3e3126")); ped.position.y=-.6; g.add(ped); const needle=new THREE.Mesh(new THREE.BoxGeometry(.02,.36,.01), sp); needle.position.set(0,0,.05); const nh=new THREE.Group(); nh.rotation.x=-.5; nh.position.z=.0; nh.add(needle); needle.position.y=.18; g.add(nh); anims.push((tt)=>{ nh.rotation.z = Math.sin(tt*.37)*2.4 + Math.sin(tt*1.3)*.3; }); }
    if(d.includes("tilefloor")){ const tex=canvasTex(512,512,(g,w,h)=>{ const nums=[1,2,3,4,5,6,7,8,9,10,11,12,13,15,14,0]; for(let i=0;i<16;i++){ const x=(i%4)*128, y=Math.floor(i/4)*128; g.fillStyle=nums[i]? ((i+Math.floor(i/4))%2?"#e8e2d2":"#cbbf9f"):"#1a1714"; g.fillRect(x,y,128,128); g.strokeStyle="#2b2318"; g.lineWidth=5; g.strokeRect(x,y,128,128); if(nums[i]){ g.fillStyle=nums[i]>13?"#"+spot.getHexString():"#2b2318"; g.font=`72px ${FELLSC}`; g.textAlign="center"; g.fillText(String(nums[i]),x+64,y+90); } } });
      const tf=new THREE.Mesh(new THREE.PlaneGeometry(4,4), mat("#ffffff",{map:tex})); tf.rotation.x=-Math.PI/2; tf.position.set(0,.008,-.4); tf.receiveShadow=true; scene.add(tf); }
    if(d.includes("longtable")||d.includes("workbench")||d.includes("bench")){ const tb=new THREE.Mesh(new THREE.BoxGeometry(d.includes("longtable")?4.2:2.6,.08,1.1), mat("#7a6450")); tb.position.set(0,.84,-.8); tb.castShadow=tb.receiveShadow=true; scene.add(tb); [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>{ const lg=new THREE.Mesh(new THREE.BoxGeometry(.08,.82,.08), mat("#3e3126")); lg.position.set(sx*(d.includes("longtable")?2:1.2),.41,-.8+sz*.45); scene.add(lg); });
      for(let k=0;k<7;k++){ const sh=new THREE.Mesh(new THREE.BoxGeometry(.21,.004,.29), mat("#ece6d6")); sh.position.set(-1.4+k*.45+(R()-.5)*.2,.885,-.8+(R()-.5)*.6); sh.rotation.y=(R()-.5)*.8; scene.add(sh); } }
    if(d.includes("tiers")){ for(let k=0;k<4;k++){ const st=new THREE.Mesh(new THREE.CylinderGeometry(4.6+k*.6,4.6+k*.6,.3+k*.3,40,1,false,Math.PI*.65,Math.PI*.7), mat(k%2?"#8b7a62":"#9e8d73")); st.position.set(0,(.3+k*.3)/2,4.8); scene.add(st); } }
    if(d.includes("sand")){ const tex=canvasTex(512,512,(g,w,h)=>{ g.fillStyle="#d8ccb0"; g.fillRect(0,0,w,h); for(let i=0;i<9000;i++){ g.fillStyle=`rgba(90,80,60,${Math.random()*.35})`; g.fillRect(Math.random()*w,Math.random()*h,1.5,1.5); } g.strokeStyle="rgba(90,80,60,.35)"; g.lineWidth=2; for(let y=20;y<h;y+=46){ g.beginPath(); g.moveTo(0,y); for(let x=0;x<=w;x+=32) g.lineTo(x,y+Math.sin(x*.03+y)*8); g.stroke(); } }); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(3,3); const sf=new THREE.Mesh(new THREE.PlaneGeometry(14,14), mat("#ffffff",{map:tex})); sf.rotation.x=-Math.PI/2; sf.position.y=.004; sf.receiveShadow=true; scene.add(sf); }
    if(d.includes("fibfloor")){ const tex=canvasTex(512,830,(g,w,h)=>{ g.fillStyle="#d7cfbd"; g.fillRect(0,0,w,h); let x0=0,x1=w,y0=0,y1=h,dir=0; g.strokeStyle="#2b2318"; g.lineWidth=5; const pts=[]; for(let n=0;n<9;n++){ const s=Math.min(x1-x0,y1-y0); let q; if(dir===0){q=[x0,y1-s,s];y1-=s;} else if(dir===1){q=[x0,y0,s];x0+=s;} else if(dir===2){q=[x1-s,y0,s];y0+=s;} else {q=[x1-s,y0,s];x1-=s;} g.fillStyle=n%2?"#c2b79f":"#e6dfcf"; g.fillRect(q[0],q[1],q[2],q[2]); g.strokeRect(q[0],q[1],q[2],q[2]); dir=(dir+1)%4; } });
      const ff=new THREE.Mesh(new THREE.PlaneGeometry(3.0,4.85), mat("#ffffff",{map:tex})); ff.rotation.x=-Math.PI/2; ff.position.set(0,.006,-5); ff.receiveShadow=true; scene.add(ff); }
    if(d.includes("glasshouse")){ faces.forEach(f=>{ const u=f.b.clone().sub(f.a), L=u.length(); u.normalize(); for(let x=1;x<L;x+=1.1){ const m=new THREE.Mesh(new THREE.BoxGeometry(.06,WALL_H,.06), mat("#ece6d6")); const pnt=f.a.clone().add(u.clone().multiplyScalar(x)).add(f.n.clone().multiplyScalar(.06)); m.position.set(pnt.x,WALL_H/2,pnt.z); scene.add(m); } });
      for(let k=0;k<6;k++){ const pot=new THREE.Mesh(new THREE.CylinderGeometry(.3,.22,.5,12), sp); const a=k/6*TAU+.4; pot.position.set(Math.sin(a)*4,.25,Math.cos(a)*4); scene.add(pot); for(let j=0;j<9;j++){ const leaf=new THREE.Mesh(new THREE.ConeGeometry(.08,1.2,4), mat("#55623f")); leaf.position.set(pot.position.x+Math.sin(j)*.15, 1.0, pot.position.z+Math.cos(j)*.15); leaf.rotation.set(Math.sin(j*2)*.6,0,Math.cos(j*2)*.6); leaf.castShadow=true; scene.add(leaf); } } }
  }
  function drawClock(g,w,h,p){ const d=hooks.now(); g.fillStyle="#e9e2d0"; g.beginPath(); g.arc(w/2,h/2,w/2-6,0,TAU); g.fill(); g.strokeStyle="#2b2318"; g.lineWidth=14; g.stroke();
    const DOZ="0123456789↊↋"; g.fillStyle="#2b2318"; g.font=`54px ${FELLSC}`; g.textAlign="center"; g.textBaseline="middle"; for(let i=0;i<12;i++){ const t=i/12*TAU; g.fillText(i===0?"10":DOZ[i], w/2+Math.sin(t)*(w/2-60), h/2-Math.cos(t)*(w/2-60)); }
    const hr=(d.getHours()%12+d.getMinutes()/60)/12*TAU, mn=d.getMinutes()/60*TAU; g.lineCap="round"; g.lineWidth=16; g.beginPath(); g.moveTo(w/2,h/2); g.lineTo(w/2+Math.sin(hr)*110,h/2-Math.cos(hr)*110); g.stroke(); g.lineWidth=7; g.strokeStyle="#8a3b23"; g.beginPath(); g.moveTo(w/2,h/2); g.lineTo(w/2+Math.sin(mn)*170,h/2-Math.cos(mn)*170); g.stroke(); }

  /* ---- an object's own card: the thing alone, turning slowly, printed the same way ---- */
  function inspect(el, o, spotHex){
    const cv = document.createElement("canvas"); cv.width = 520; cv.height = 360; cv.className = "inspect3d"; el.appendChild(cv);
    const r2 = new THREE.WebGLRenderer({canvas:cv, antialias:false}); r2.setPixelRatio(1); r2.setSize(520, 360, false); r2.shadowMap.enabled = true;
    const sc = new THREE.Scene(), c2 = new THREE.PerspectiveCamera(35, 520/360, .02, 20); c2.position.set(0,.45,.9); c2.lookAt(0,.12,0);
    sc.add(new THREE.HemisphereLight("#f4efe2","#7d7466",.9)); const dl = new THREE.DirectionalLight("#fff3d9",2.2); dl.position.set(1,2,1.5); dl.castShadow = true; sc.add(dl);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(.42,.46,.06,48), mat("#b4aa95")); plinth.position.y = -.03; plinth.receiveShadow = true; sc.add(plinth);
    const m = model(o.icon, muted(spotHex,.6), rng(hashStr(o.title))); m.scale.multiplyScalar(1.9); m.traverse(x => { if(x.isMesh) x.castShadow = true; }); sc.add(m);
    const t2 = new THREE.WebGLRenderTarget(520, 360, {depthTexture:new THREE.DepthTexture(520,360)});
    const pm = post.clone(); pm.uniforms = THREE.UniformsUtils.clone(post.uniforms); pm.uniforms.res.value.set(520,360); pm.uniforms.dpr.value = 1; pm.uniforms.spacing.value = 3.2; pm.uniforms.night.value = 0;
    const ps = new THREE.Scene(); ps.add(new THREE.Mesh(tri, pm));
    let alive = true;
    const loop = (t) => { if(!alive || !cv.isConnected){ r2.dispose(); t2.dispose(); return; } m.rotation.y = t/2400; r2.setRenderTarget(t2); r2.render(sc, c2); pm.uniforms.tColor.value = t2.texture; pm.uniforms.tDepth.value = t2.depthTexture; pm.uniforms.projInv.value.copy(c2.projectionMatrixInverse); r2.setRenderTarget(null); r2.render(ps, postCam); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    return () => { alive = false; };
  }

  return {show, inspect, canvas, snapshot:()=>canvas.toDataURL("image/png")};
}
