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
function canvasTex(w, h, paint){ const c = document.createElement("canvas"); c.width=w; c.height=h; const g = c.getContext("2d"); paint(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
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
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  renderer.setPixelRatio(1);
  const camera = new THREE.PerspectiveCamera(62, 16/9, .05, 80);
  camera.rotation.order = "YXZ";
  let rt = null;
  const post = new THREE.ShaderMaterial({vertexShader:POST_VS, fragmentShader:POST_FS, uniforms:{
    tColor:{value:null}, tDepth:{value:null}, res:{value:new THREE.Vector2()}, dpr:{value:dpr}, night:{value:0}, time:{value:0},
    cnear:{value:camera.near}, cfar:{value:camera.far}, spacing:{value:5.8}, projInv:{value:new THREE.Matrix4()},
    paper:{value:new THREE.Color("#EEE8DA")}, ink:{value:new THREE.Color("#1d1a16")}, paperN:{value:new THREE.Color("#15130f")}, inkN:{value:new THREE.Color("#e6dfcd")} }});
  post.extensions = {derivatives:true};
  const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const tri = new THREE.BufferGeometry(); tri.setAttribute("position", new THREE.Float32BufferAttribute([-1,-1,0, 3,-1,0, -1,3,0],3)); tri.setAttribute("uv", new THREE.Float32BufferAttribute([0,0, 2,0, 0,2],2));
  postScene.add(new THREE.Mesh(tri, post));

  let scene = new THREE.Scene(), key = null, picks = [], anims = [], stations = {}, slots = {}, plan = null, labelDim = 1;
  const depthOnly = new THREE.MeshBasicMaterial({colorWrite:false});
  // lettering, pictures and the sky are printed on top of the engraving, so they stay legible
  function label(mesh){ const old = mesh.material; mesh.material = new THREE.MeshBasicMaterial({map:old.map||null, color:new THREE.Color(old.color||"#ffffff").multiplyScalar(labelDim), side:old.side||THREE.FrontSide, toneMapped:false, transparent:old.transparent, opacity:old.opacity}); old.dispose(); mesh.layers.set(1); return mesh; }
  const cam = {yaw:0, pitch:0, pos:new THREE.Vector3(0,EYE,2)}, goal = {yaw:0, pitch:0, pos:new THREE.Vector3(0,EYE,2)};
  let W = 0, H = 0;
  function resize(){
    const w = container.clientWidth || 800, h = Math.round(w*9/16);
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
      if(x < W*.085) return {kind:"turnL", label:"Turn left", onClick:()=>hooks.turn(-1)};
      if(x > W*.915) return {kind:"turnR", label:"Turn right", onClick:()=>hooks.turn(1)};
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
  canvas.addEventListener("pointermove", e => {
    const h = pickAt(e.clientX, e.clientY); hover = h;
    canvas.dataset.cursor = h ? h.kind : "none";
    if(h && h.label){ const r = container.getBoundingClientRect(); tip.textContent = h.label; tip.style.left = Math.min(e.clientX - r.left + 16, r.width - 220) + "px"; tip.style.top = (e.clientY - r.top + 18) + "px"; tip.classList.add("on"); }
    else tip.classList.remove("on");
  });
  canvas.addEventListener("pointerleave", () => { tip.classList.remove("on"); });
  canvas.addEventListener("click", e => { const h = pickAt(e.clientX, e.clientY); if(h && h.onClick) h.onClick(); });

  /* ---- the frame loop ---- */
  let last = performance.now(), dirty = 3;
  function frame(t){
    const dt = Math.min(.05, (t-last)/1000); last = t;
    // ease the camera toward its goal: a turn takes about half a second
    let dy = goal.yaw - cam.yaw; while(dy > Math.PI) dy -= TAU; while(dy < -Math.PI) dy += TAU;
    const k = 1 - Math.pow(.0009, dt);
    const moving = Math.abs(dy) > 1e-3 || Math.abs(goal.pitch-cam.pitch) > 1e-3 || cam.pos.distanceTo(goal.pos) > 1e-3;
    cam.yaw += dy*k; cam.pitch += (goal.pitch-cam.pitch)*k; cam.pos.lerp(goal.pos, k);
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
  function show(p){
    plan = p;
    const k = JSON.stringify([p.room.id, p.frame, p.mirror, p.band, p.doors.map(d=>[d.id,d.wall,d.open,d.label,d.name]), p.objects.map(o=>[o.title,o.wall]), p.decor, p.sheetKey, p.lantern, p.wxKind, Math.floor(p.minuteKey/10)]);
    if(k !== key){ key = k; build(p); }
    // where to stand and where to look
    const sl = slots[p.ahead] || {dir:new THREE.Vector3(0,0,-1), center:new THREE.Vector3(0,0,-5)};
    let pos, yaw = Math.atan2(-sl.dir.x, -sl.dir.z), pitch = p.pitch*0.95;
    if(p.close==="ahead" && stations[p.ahead]){ const st = stations[p.ahead]; pos = st.view.clone(); pitch = -0.66; yaw = Math.atan2(-(st.top.x-pos.x), -(st.top.z-pos.z)); }
    else { pos = sl.stand.clone(); }
    goal.pos.copy(pos); goal.yaw = yaw; goal.pitch = pitch;
    if(p.snap){ cam.pos.copy(pos); cam.yaw = yaw; cam.pitch = pitch; }
    post.uniforms.night.value = p.band==="night" ? 1 : 0;
    canvas.style.transform = "";
    dirty = 3;
  }

  function build(p){
    scene.traverse(o => { if(o.geometry) o.geometry.dispose(); if(o.material){ [].concat(o.material).forEach(m => { if(m.map) m.map.dispose(); m.dispose(); }); } });
    scene = new THREE.Scene(); picks = []; anims = []; stations = {}; slots = {}; labelDim = p.band==="night" ? .72 : p.band==="dusk" ? .9 : 1;
    WALL_H = (p.room.ceiling==="open") ? 3.3 : 4.2;
    const R = rng(hashStr("room"+p.room.id));
    const spot = muted(p.spot, .6), night = p.band==="night", dusk = p.band==="dusk"||p.band==="dawn";
    const shape = p.room.shape || "square";
    const faces = shell(shape);
    const wallMat = mat(p.room.decor && p.room.decor.includes("glacier") ? "#dfe7ea" : "#d6cdbb", {roughness:.95});
    const stoneTex = canvasTex(512, 512, (g,w,h) => { g.fillStyle="#cfc6b3"; g.fillRect(0,0,w,h); g.strokeStyle="#9c927f"; g.lineWidth=3;
      for(let y=0,row=0;y<h;y+=64,row++){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); for(let x=(row%2)*64;x<w;x+=128){ g.beginPath(); g.moveTo(x,y); g.lineTo(x,y+64); g.stroke(); } }
      for(let i=0;i<900;i++){ g.fillStyle=`rgba(80,70,55,${R()*.08})`; g.fillRect(R()*w,R()*h,2+R()*6,1+R()*3); } });
    stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
    // ---- walls, with their doors and windows cut out
    const doorsBySlot = {}; p.doors.forEach(d => (doorsBySlot[d.wall] = doorsBySlot[d.wall]||[]).push(d));
    const objsBySlot = {}; p.objects.forEach(o => (objsBySlot[o.wall] = objsBySlot[o.wall]||[]).push(o));
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
      const m = wallMat.clone(); if(!(p.room.decor||[]).includes("glacier")) { m.map = stoneTex; }
      const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; mesh.receiveShadow = true;
      // place: local x along the wall, local z outward
      const basis = new THREE.Matrix4().makeBasis(u, new THREE.Vector3(0,1,0), n.clone().negate());
      mesh.applyMatrix4(basis); mesh.position.set(f.a.x, 0, f.a.z);
      scene.add(mesh);
      // wainscot and cornice: a little architecture
      const cor = new THREE.Mesh(new THREE.BoxGeometry(len, .18, .22), mat("#c8bea9")); cor.position.copy(mid(f)).add(n.clone().multiplyScalar(.1)); cor.position.y = WALL_H - .09; cor.rotation.y = Math.atan2(-u.z, u.x); cor.castShadow = true; scene.add(cor);
      const base = new THREE.Mesh(new THREE.BoxGeometry(len, .22, .08), mat("#8f8573")); base.position.copy(mid(f)).add(n.clone().multiplyScalar(.04)); base.position.y = .11; base.rotation.y = cor.rotation.y; scene.add(base);
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
          const at = x + w/2; if(!holes.some(hh => Math.abs(hh.at-at) < hh.w/2 + w/2 + .1)) { const c = f.a.clone().add(u.clone().multiplyScalar(at)); cases ? buildCase(c, u, n, w, R, spot) : buildBookcase(c, u, n, w, low ? 1.1 : 3.3, R, spot); }
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
    const amb = new THREE.HemisphereLight(night ? "#8a90a0" : "#fbf6ea", night ? "#2a2620" : "#a39a88", night ? .9 : dusk ? 1.8 : 2.4); scene.add(amb);
    const fill = new THREE.DirectionalLight("#fff8ec", night ? .25 : .7); fill.position.set(2, 3, 6); scene.add(fill);
    const lit = p.lampLit;
    if(p.decor.includes("lamp")){
      const lamp = pendant(spot, lit); scene.add(lamp.group);
      if(lit){ const pl = new THREE.PointLight("#ffd89a", 40, 0, 1.1); pl.position.set(0, WALL_H-1.1, 0); pl.castShadow = !p.sunUp; pl.shadow.mapSize.set(512,512); scene.add(pl);
        const base = pl.intensity; anims.push((t) => { pl.intensity = base*(.93 + .07*Math.sin(t*7.1) * Math.sin(t*3.3+1.3)); }); }
    } else if(night){ const pl = new THREE.PointLight("#ffe2b0", 22, 0, 1.1); pl.position.set(0, WALL_H-.6, 1); scene.add(pl); }
    if(p.sunUp){
      // the real sun, from the real direction: walls cast the shadows, windows let it in
      const s = new THREE.DirectionalLight("#fff3d9", p.overcast ? .8 : 3.4);
      const az = p.sunRel*DEG, alt = Math.max(3, p.sunAlt)*DEG;
      const d = new THREE.Vector3(Math.sin(az)*Math.cos(alt), Math.sin(alt), -Math.cos(az)*Math.cos(alt));
      s.position.copy(d.multiplyScalar(30)); s.target.position.set(0,0,0); s.castShadow = true;
      s.shadow.mapSize.set(2048,2048); const sc = s.shadow.camera; sc.left=-12; sc.right=12; sc.top=12; sc.bottom=-12; sc.near=1; sc.far=80; s.shadow.bias = -.0006;
      scene.add(s); scene.add(s.target);
    }
    if(p.lantern){ const pl = new THREE.PointLight("#ffd28a", 9, 7, 1.5); scene.add(pl); anims.push(() => { pl.position.copy(cam.pos).add(new THREE.Vector3(.3,-.4,0)); }); }
    if(p.gloom){ amb.intensity *= p.lantern ? .7 : .25; }
    // ---- floor and wall fittings
    decorBuild(p, faces, R, spot);
    // ---- stations: furniture with the room's things on it, one per wall that has things
    Object.keys(objsBySlot).forEach(sk => { const sl = slots[sk]; if(!sl) return; buildStation(+sk, sl, objsBySlot[sk], p, R, spot); });
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

  function floorTexture(kind, R){
    return canvasTex(1024, 1024, (g,w,h) => {
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
    } else {
      const sm = new THREE.MeshBasicMaterial({color: p.band==="night" ? "#16181e" : "#dfe4e3", side:THREE.DoubleSide}); if(p.band==="night") mats.push(sm);
      const sky = new THREE.Mesh(new THREE.CircleGeometry(r*1.6, 48), sm);
      sky.rotation.x = Math.PI/2; sky.position.y = WALL_H + 2.5; sky.layers.set(1); scene.add(sky);
    }
  }

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
  function buildBookcase(c, u, n, w, h, R, spot){
    const g = new THREE.Group(), yaw = Math.atan2(-u.z, u.x), depth = .38;
    const wood = mat("#6a5440"), dark = mat("#2b2219");
    const backP = new THREE.Mesh(new THREE.BoxGeometry(w, h, .03), dark); backP.position.set(0, h/2, .015); g.add(backP);
    [-1,1].forEach(sx => { const side = new THREE.Mesh(new THREE.BoxGeometry(.05, h, depth), wood); side.position.set(sx*(w/2-.025), h/2, depth/2); side.castShadow = true; g.add(side); });
    const topP = new THREE.Mesh(new THREE.BoxGeometry(w+.08, .07, depth+.04), wood); topP.position.set(0, h-.035, depth/2); g.add(topP);
    const shelves = Math.max(2, Math.round(h/.42)), sh = (h-.12)/shelves;
    const bookCols = ["#7d6b55","#5f574a","#9a8b70","#4a4339","#b3a487","#6b5a48", "#"+spot.getHexString()];
    for(let s=0;s<shelves;s++){
      const y0 = .06 + s*sh, board = new THREE.Mesh(new THREE.BoxGeometry(w-.08, .04, depth-.02), wood); board.position.set(0, y0, depth/2); board.receiveShadow = true; g.add(board);
      let x = -w/2 + .07;
      while(x < w/2 - .1){ const bw = .025 + R()*.05, bh = sh*(.62 + R()*.3); if(R()<.06){ x += .08; continue; }
        const lean = R()<.07 ? (R()-.5)*.4 : 0;
        const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, depth*.75), mat(bookCols[Math.floor(R()*bookCols.length)], {roughness:.9}));
        b.position.set(x + bw/2, y0 + .02 + bh/2, depth*.5 + .02); b.rotation.z = lean; b.castShadow = true; g.add(b); x += bw + .004; }
    }
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

  /* ---- stations: a desk, a table, or a low bookcase, with the things on it ---- */
  function buildStation(slot, sl, objs, p, R, spot){
    const f = sl.face, u = f.b.clone().sub(f.a).normalize(), n = f.n, yaw = Math.atan2(-u.z, u.x);
    const len = f.a.distanceTo(f.b), free = [len*.5, len*.3, len*.7].find(at => !f.holes.some(h => Math.abs(h.at-at) < h.w/2 + 1.1)) ?? len*.5;
    const c = f.a.clone().add(u.clone().multiplyScalar(free)).add(n.clone().multiplyScalar(1.15));
    const bookish = objs.filter(o => o.bookish).length > objs.length/2;
    const shown = objs.slice(0, 7), w = Math.min(len*.7, Math.max(1.6, shown.length*.62+.5)), topY = bookish ? .95 : .82;
    const g = new THREE.Group(); g.position.copy(c); g.rotation.y = yaw;
    const wood = mat("#8c7458"), darkWood = mat("#4a3b2e");
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, .07, .95), mat("#a58c6c")); top.position.y = topY; top.castShadow = top.receiveShadow = true; g.add(top);
    if(bookish){ const body = new THREE.Mesh(new THREE.BoxGeometry(w-.04, topY-.03, .9), darkWood); body.position.y = (topY-.03)/2; g.add(body);
      for(let k=0;k<2;k++){ const shelf = new THREE.Mesh(new THREE.BoxGeometry(w-.1,.03,.85), wood); shelf.position.set(0, .12+k*.38, .02); g.add(shelf);
        let x=-w/2+.08; while(x<w/2-.1){ const bw=.03+R()*.04, bh=.24+R()*.08; const b=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,.6), mat(["#7d6b55","#4a4339","#9a8b70","#"+spot.getHexString()][Math.floor(R()*4)])); b.position.set(x+bw/2, .14+k*.38+bh/2, .25); g.add(b); x+=bw+.005; } } }
    else { [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz]) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(.07, topY, .07), darkWood); leg.position.set(sx*(w/2-.08), topY/2, sz*.4); leg.castShadow = true; g.add(leg); });
      const apron = new THREE.Mesh(new THREE.BoxGeometry(w-.1,.14,.9), darkWood); apron.position.y = topY-.1; g.add(apron);
      const drawer = new THREE.Mesh(new THREE.BoxGeometry(.5,.1,.02), wood); drawer.position.set(0, topY-.1, .46); g.add(drawer); }
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
      default: add(new THREE.BoxGeometry(.16,.12,.16), wood, 0,.06); add(new THREE.BoxGeometry(.17,.02,.17), sp, 0,.12);
    }
    g.scale.setScalar(1.25*s);
    return g;
  }

  /* ---- fittings that belong to particular rooms ---- */
  function decorBuild(p, faces, R, spot){
    const d = p.decor, sp = mat("#"+spot.getHexString());
    if(d.includes("rug")){ const tex = canvasTex(512,512,(g,w,h)=>{ g.fillStyle="#"+spot.getHexString(); g.fillRect(0,0,w,h); g.strokeStyle="#2b2318"; g.lineWidth=10; g.strokeRect(20,20,w-40,h-40); g.lineWidth=3; g.strokeRect(46,46,w-92,h-92); for(let i=0;i<10;i++){ g.beginPath(); g.arc(w/2,h/2,30+i*18,0,TAU); g.stroke(); } });
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.2,3), mat("#ffffff",{map:tex})); rug.rotation.x = -Math.PI/2; rug.position.y = .005; rug.receiveShadow = true; scene.add(rug); }
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
        const phi = p.lat*DEG; for(let hr=6; hr<=18; hr++){ const th = Math.atan2(Math.sin(phi)*Math.sin((hr-12)*15*DEG), Math.cos((hr-12)*15*DEG)); g.lineWidth = hr===12?6:3; g.beginPath(); g.moveTo(w/2,h/2); g.lineTo(w/2+Math.sin(th)*460, h/2-Math.cos(th)*460); g.stroke();
          g.save(); g.translate(w/2+Math.sin(th)*400, h/2-Math.cos(th)*400); g.rotate(th); g.fillStyle="#2b2318"; g.font=`54px ${FELLSC}`; g.textAlign="center"; g.fillText(["VI","VII","VIII","IX","X","XI","XII","I","II","III","IV","V","VI"][hr-6],0,0); g.restore(); } });
      // the dial is laid out with north toward the room's north
      const F = p.F*DEG;
      const dial = new THREE.Mesh(new THREE.CircleGeometry(1.1,64), mat("#ffffff",{map:plate, metalness:.3, roughness:.5})); dial.rotation.set(-Math.PI/2, 0, F); dial.position.set(0,.92,0); dial.receiveShadow = true; scene.add(dial);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(.35,.5,.9,16), mat("#bdb4a0")); ped.position.set(0,.45,0); ped.castShadow = true; scene.add(ped);
      // the style, pointing at the celestial pole at the latitude's angle
      const L0 = .85, style = new THREE.Shape(); style.moveTo(0,0); style.lineTo(L0,0); style.lineTo(L0, L0*Math.tan(p.lat*DEG)); style.lineTo(0,0);
      const gn = new THREE.Mesh(new THREE.ExtrudeGeometry(style,{depth:.05,bevelEnabled:false}), mat("#8a7448",{metalness:.6,roughness:.35}));
      const holder = new THREE.Group(); holder.position.set(0,.92,0); holder.rotation.y = Math.atan2(Math.cos(F), -Math.sin(F)); gn.position.set(0,0,-.025); holder.add(gn); gn.castShadow = true; scene.add(holder);
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
