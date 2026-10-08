/* The Wending House in three dimensions: rooms built from the data file, lit by the real sun and the lamps,
   and printed through an engraving shader (hatching that follows the surfaces, ink outlines, paper grain,
   muted color). Loaded by palace.js; falls back to the flat woodcut drawings if WebGL is missing. */
import * as THREE from "./lib/three.module.min.js";

const TAU = Math.PI*2, DEG = Math.PI/180;
let WALL_H = 4.2; const EYE = 1.62, DOOR_W = 1.35, DOOR_H = 2.45;

/* ---------- small helpers ---------- */
function rng(seed){ let a = seed>>>0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a>>>15, 1|a); t = t + Math.imul(t ^ t>>>7, 61|t) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; }; }
function hashStr(s){ let h=2166136261; for(const ch of String(s)){ h ^= ch.charCodeAt(0); h = Math.imul(h,16777619); } return h>>>0; }
const muted = (hex, k=0.55) => { const c = new THREE.Color(hex); const g = c.r*.3+c.g*.59+c.b*.11; return new THREE.Color(g+(c.r-g)*k, g+(c.g-g)*k, g+(c.b-g)*k); };
function mat(color, opts={}){ const m = new THREE.MeshStandardMaterial(Object.assign({color:new THREE.Color(color), roughness:.85, metalness:0}, opts));
  const k = typeof color === "string" && SURFACES_ON ? surfaceFor(color, opts) : null;
  if(k){ const sf = surface(k); m.map = sf.map; m.normalMap = sf.normalMap; m.roughnessMap = sf.roughnessMap; m.normalScale = new THREE.Vector2(k === "brass" ? .4 : .8, k === "brass" ? .4 : .8); if(k === "brass"){ m.metalness = Math.max(.75, m.metalness); m.roughness = .55; } else m.roughness = 1; }
  return m; }
// a pointed arch (a two-centred arch, drawn as a stretched equilateral one) or a round one: points from the right springing over to the left, x about the centre
function archPts(w, h, pointed, n){ const out = [], a = pointed ? w*.62 : w/2, y1 = h - a, ptd = u => Math.sqrt(4 - (2-u)*(2-u))/Math.sqrt(3);
  for(let i=0;i<=n;i++){ const u = i/n; out.push(pointed ? [w/2 - u*w/2, y1 + a*ptd(u)] : [Math.cos(Math.PI*u/2)*w/2, y1 + Math.sin(Math.PI*u/2)*w/2]); }
  for(let i=n-1;i>=0;i--){ const [x,y] = out[i]; out.push([-x, y]); } return out; }
const archPts2 = (w, h, pointed, n) => [[w/2, 0], ...archPts(w, h, pointed, n), [-w/2, 0]];
let SURFACES_ON = true;
let TEXK = 1;
/* ---------- surfaces: procedural wood, leather, brass, stone, plaster, and cloth, each with a colour map, a bump (normal) map and a roughness map.
   Neutral in tone, so a material's own colour tints them. Made once per visit, at the quality's texture size. ---------- */
const SURF = {};
function noise2(seed){ const R = rng(seed), P = new Float32Array(512); for(let i=0;i<512;i++) P[i] = R(); const h = (x, y) => P[((x & 255) + ((y & 255) * 7)) & 511];
  return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf);
    return (h(xi,yi)*(1-u) + h(xi+1,yi)*u)*(1-v) + (h(xi,yi+1)*(1-u) + h(xi+1,yi+1)*u)*v; }; }
function fbm(n, x, y, oct){ let a = 0, f = 1, w = .5; for(let o=0;o<oct;o++){ a += w*n(x*f, y*f); f *= 2.03; w *= .5; } return a; }
function surface(kind){
  if(SURF[kind]) return SURF[kind];
  const N = Math.round(512*Math.min(2, Math.max(.75, TEXK))), n = noise2(hashStr(kind)), H = new Float32Array(N*N), col = new Uint8ClampedArray(N*N*4), rough = new Uint8ClampedArray(N*N*4);
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const u = x/N, v = y/N; let h = .5, c = 1, r = .5;
    if(kind === "wood"){ // grain along x: growth rings stretched long, wobbling; pores; a few darker streaks
      const wob = fbm(n, u*3, v*18, 4)*2.2, ring = Math.sin((v*38 + wob*3.2)*Math.PI), fine = fbm(n, u*90, v*400, 2);
      h = .5 + .28*ring + .18*(fine - .5); c = .78 + .16*ring + .1*(fbm(n, u*2, v*6, 3) - .5) - .08*Math.max(0, fine - .7)*3; r = .55 + .25*(1 - h); }
    else if(kind === "leather"){ const cell = fbm(n, u*60, v*60, 3), crease = Math.abs(fbm(n, u*9, v*9, 4) - .5) < .02 ? -.25 : 0;
      h = .5 + .3*(cell - .5) + crease; c = .85 + .12*(cell - .5) + crease*.4; r = .6 - .2*(cell - .5); }
    else if(kind === "brass"){ const brush = fbm(n, u*2, v*900, 2), blot = fbm(n, u*5, v*5, 4);
      h = .5 + .06*(brush - .5); c = .9 + .1*(brush - .5) - .12*Math.max(0, blot - .62); r = .28 + .25*(brush - .5) + .3*Math.max(0, blot - .6); }
    else if(kind === "stone"){ const g = fbm(n, u*14, v*14, 5), speck = n(u*300, v*300) > .86 ? -.12 : 0, vein = Math.abs(fbm(n, u*4, v*4, 5) - .5) < .012 ? -.18 : 0;
      h = .5 + .35*(g - .5) + speck + vein; c = .9 + .12*(g - .5) + speck + vein*.6; r = .75 + .2*(g - .5); }
    else if(kind === "plaster"){ const g = fbm(n, u*8, v*8, 5), fine = n(u*200, v*200); h = .5 + .2*(g - .5) + .05*(fine - .5); c = .94 + .07*(g - .5); r = .85; }
    else if(kind === "cloth"){ const warp = Math.sin(u*N*.5*Math.PI)*.5 + .5, weft = Math.sin(v*N*.5*Math.PI)*.5 + .5, g = fbm(n, u*20, v*20, 3);
      h = .5 + .2*(warp*weft - .25) + .1*(g - .5); c = .86 + .1*(warp - .5) + .08*(g - .5); r = .95; }
    else { const g = fbm(n, u*10, v*10, 4); h = .5 + .1*(g - .5); c = .95 + .06*(g - .5); r = .7; }
    H[y*N + x] = h; const i = (y*N + x)*4, cv = Math.max(0, Math.min(1, c))*255; col[i] = col[i+1] = col[i+2] = cv; col[i+3] = 255; const rv = Math.max(.05, Math.min(1, r))*255; rough[i] = rough[i+1] = rough[i+2] = rv; rough[i+3] = 255; }
  // the bump becomes a normal map
  const nrm = new Uint8ClampedArray(N*N*4), k = kind === "brass" ? 1.2 : kind === "wood" ? 3 : 4;
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const hx = H[y*N + (x+1)%N] - H[y*N + (x-1+N)%N], hy = H[((y+1)%N)*N + x] - H[((y-1+N)%N)*N + x];
    let nx = -hx*k, ny = -hy*k, nz = 1; const l = Math.hypot(nx, ny, nz); const i = (y*N + x)*4; nrm[i] = (nx/l*.5+.5)*255; nrm[i+1] = (ny/l*.5+.5)*255; nrm[i+2] = (nz/l*.5+.5)*255; nrm[i+3] = 255; }
  const tex = (data, srgb) => { const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 8; if(srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; };
  return (SURF[kind] = {map: tex(col, true), normalMap: tex(nrm), roughnessMap: tex(rough)});
}
const WOODS = new Set(["#6a5440","#4a3b2e","#7d6248","#5e4632","#8c7458","#a58c6c","#6e5743","#3f3024","#77583e","#6a4f38","#5a3c26","#6a4730","#7a5b40","#5c4a38","#4a3726","#8a6a45","#93724c","#6e5236","#5e4a37","#4f3d2c","#6a5440","#3d2e20","#5a4634","#6c553f","#7d6448","#5a4632","#2b2219","#241b13","#3b3128","#3c2c1e","#4a3b2e","#8f7a62","#7a6a55","#8a7a63","#9a7f5f","#86694d","#2b2318"]);
const BRASS = new Set(["#b39a62","#b8955a","#8a7448","#c7b07a","#6e5a34","#b06a45"]);
const LEATHER = new Set(["#3f5a43","#6b3a2e","#5b2a22","#7a2e24","#6b2f26","#2f4a5a","#3f5a3a","#5a4630","#7a5a2e","#3a3048","#25303a"]);
const STONE = new Set(["#c2b8a2","#bdb4a0","#d3cab7","#c4bba6","#cfc6b2","#b4aa95","#c8bea9","#8f8573","#b9ae98","#c3b9a4","#d6cdbb","#e6dfcf","#bdb4a2","#b8af9c","#c9c0ad","#9e9583","#cdbd92","#c8b98f"]);
function surfaceFor(hex, opts){ if(opts.map || opts.transparent || opts.side === THREE.DoubleSide && !STONE.has(hex)) return null; const h = String(hex).toLowerCase();
  if(BRASS.has(h) || (opts.metalness||0) >= .5) return "brass"; if(LEATHER.has(h)) return "leather"; if(WOODS.has(h)) return "wood"; if(STONE.has(h)) return "stone";
  const c = new THREE.Color(hex), hsl = {}; c.getHSL(hsl);
  if(hsl.h > .04 && hsl.h < .12 && hsl.s > .15 && hsl.l < .5) return "wood"; if(hsl.s < .2 && hsl.l > .55) return "plaster"; return null; }

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
  vec3 sat = mix(vec3(lum0), col, .72);
  vec3 hue = clamp(sat / max(lum0, .18), 0., 2.2);
  vec3 tint = mix(pap, pap*hue, .58*(1.-night*.45));
  vec3 c = mix(tint, ik, inkAmt);
  c *= .965 + .035*hash(floor(px/1.7));
  float vig = smoothstep(1.25, .45, length(vUv - .5)*1.4);
  c = mix(c*.86, c, vig);
  gl_FragColor = vec4(c, 1.);
}`;

/* ---------- the view ---------- */

const PHOTO_FS = `
precision highp float;
uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 res; uniform float time, aoK, night, exposure; uniform mat4 projInv; uniform mat4 proj;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
vec3 viewPos(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 p = projInv * vec4(uv*2.-1., d*2.-1., 1.); return p.xyz/p.w; }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
void main(){
  vec3 col = texture2D(tColor, vUv).rgb * exposure;
  float dep = texture2D(tDepth, vUv).x;
  float ao = 1.;
  if(dep < .9999){
    vec3 P = viewPos(vUv), N = normalize(cross(dFdx(P), dFdy(P)));
    float rad = .38, occ = 0., ang = hash(vUv*res)*6.2831;
    for(int i=0;i<16;i++){ float fi = float(i), r = (fi+.5)/16., a = ang + fi*2.39996;
      vec2 off = vec2(cos(a), sin(a)) * r * rad * proj[0][0] / max(-P.z, .1) * .5;
      vec3 Q = viewPos(vUv + off*vec2(1., res.x/res.y)), v = Q - P; float d = length(v);
      occ += max(dot(N, v/max(d,1e-4)) - .08, 0.) * (1. - smoothstep(rad*.6, rad*2., d)); }
    ao = clamp(1. - aoK*occ/16.*2.2, .25, 1.);
  }
  col *= ao;
  col = aces(col);
  col = pow(col, vec3(1./2.2));
  // a little of the lens: vignette and grain, as on film
  float vig = smoothstep(1.3, .35, length(vUv - .5)*1.5); col *= mix(.78, 1., vig);
  col += (hash(vUv*res + time) - .5)*.022;
  gl_FragColor = vec4(col, 1.);
}`;
const RAW = /[?&]raw=1/.test(location.search);
export function create(container, hooks){
  const canvas = document.createElement("canvas");
  canvas.className = "view3d";
  container.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({canvas, antialias:false, preserveDrawingBuffer:true});
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // quality: how many pixels are drawn for each one shown (supersampling smooths every line), shadow detail, texture detail, and how fine the engraver's lines are
  const QS = {draft:{ss:1, cap:1, shadow:1024, tex:.75, hatch:6.2}, normal:{ss:1.5, cap:2, shadow:2048, tex:1, hatch:5.8}, fine:{ss:2, cap:3, shadow:4096, tex:2, hatch:5.0}, ultra:{ss:3, cap:4, shadow:4096, tex:2.5, hatch:4.4}, max:{ss:4, cap:5, shadow:4096, tex:3, hatch:4.0}};
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
    paper:{value:new THREE.Color("#EEE4CF")}, ink:{value:new THREE.Color("#2a1f17")}, paperN:{value:new THREE.Color("#14110d")}, inkN:{value:new THREE.Color("#e9ddc4")} }});
  post.extensions = {derivatives:true};
  const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const tri = new THREE.BufferGeometry(); tri.setAttribute("position", new THREE.Float32BufferAttribute([-1,-1,0, 3,-1,0, -1,3,0],3)); tri.setAttribute("uv", new THREE.Float32BufferAttribute([0,0, 2,0, 0,2],2));
  const postMesh = new THREE.Mesh(tri, post); postScene.add(postMesh);
  // the photographic view: no engraving, a tone curve, light reflected from the room, and soft shadow in every corner
  const photo = new THREE.ShaderMaterial({vertexShader:POST_VS, fragmentShader:PHOTO_FS, uniforms:{tColor:{value:null}, tDepth:{value:null}, res:{value:new THREE.Vector2()}, time:{value:0}, aoK:{value:1}, night:{value:0}, exposure:{value:1.0}, projInv:{value:new THREE.Matrix4()}, proj:{value:new THREE.Matrix4()}}});
  photo.extensions = {derivatives:true};
  const isPhoto = () => !!(hooks.style && hooks.style() === "photo");
  let envTex = null;
  function roomEnvironment(){ // a soft room of light to be reflected in brass, varnish, and glass
    if(envTex) return envTex; const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    const box = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshBasicMaterial({color:"#6b5f50", side:THREE.BackSide})); es.add(box);
    [[0,3.9,0, 6,6, "#fff4e0", 2.6],[5.9,1.5,0, 3,2.4,"#d8e4f0", 3.2],[-5.9,1.2,1, 2,2,"#ffe0b0", 1.6],[0,-3.9,0, 10,10,"#3a3026", 1]].forEach(([x,y,z,w,h,c,k]) => {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(k), side:THREE.DoubleSide})); pl.position.set(x,y,z); pl.lookAt(0,0,0); es.add(pl); });
    envTex = pm.fromScene(es, .04).texture; pm.dispose(); return envTex; }

  let scene = new THREE.Scene(), key = null, picks = [], anims = [], stations = {}, slots = {}, plan = null, labelDim = 1, glints = [], nodeMarks = [];
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
    rt = new THREE.WebGLRenderTarget(w*dpr, h*dpr, {depthTexture:new THREE.DepthTexture(w*dpr, h*dpr), samples:0, type:THREE.HalfFloatType});
    post.uniforms.res.value.set(w*dpr, h*dpr); photo.uniforms.res.value.set(w*dpr, h*dpr);
  }
  new ResizeObserver(resize).observe(container);
  resize();

  /* ---- picking: what is under the cursor, and what a click there would do ---- */
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); ray.layers.enableAll();
  const tip = document.createElement("div"); tip.className = "tip3d"; container.appendChild(tip);
  let hover = null;
  let peeking = false, focusPt = null, seated = null, lastNavK = null;
  // a close look (the sky, a peek at the dial or the cabinet, a desk) answers only to clicks on what is in it; a click anywhere else steps back
  function focusKind(){ if(skyOn) return "sky"; if(peeking) return "peek"; if(plan && plan.close) return "close"; return null; }
  function allowedHit(h){ const f = focusKind(); if(!f) return true; if(f === "sky") return h.distance > 20;
    const c = f === "peek" ? focusPt : (stations[plan.ahead] && stations[plan.ahead].top); return !c || h.point.distanceTo(c) < 2.4; }
  function exitFocus(){ const f = focusKind(); if(f === "sky"){ skyMode(false); hooks.skyClosed && hooks.skyClosed(); } else if(f === "peek"){ peeking = false; focusPt = null; if(seated){ const s = seated; seated = null; s.leave(); } window.dispatchEvent(new CustomEvent("wending-unpeek")); show(plan); } else if(f === "close") hooks.stepBack(); }
  function zoneAt(x, y){
    if(skyOn && y > H*.88) return {kind:"down", label:"Come back down", onClick:()=>{ skyMode(false); hooks.skyClosed && hooks.skyClosed(); }};
    if(peeking && y > H*.84) return {kind:"back", label: seated ? "Stand up" : "Step back", onClick: exitFocus};
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
  let lastHit = null, walkPos = null, walkRoom = null;
  function pickAt(cx, cy){
    const r = canvas.getBoundingClientRect(), x = cx - r.left, y = cy - r.top;
    const z = zoneAt(x, y);
    mouse.set(x/r.width*2-1, -(y/r.height)*2+1);
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(picks, true);
    // things in the picture win over the turning edges, except for walking, which the edges win
    for(const h of hits){ let o = h.object; while(o && !o.userData.hit) o = o.parent; if(o && o.userData.hit){ if(!allowedHit(h)) continue; if(z && o.userData.hit.kind === "walk") return z; lastHit = h.point.clone(); return o.userData.hit; } }
    if(z) return z;
    const f = focusKind(); if(f) return {kind:"back", label: f === "sky" ? "Come back down" : "Step back", onClick: exitFocus};
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
    canvas.dataset.cursor = h ? h.kind : "none"; showAim(h && h.kind === "walk" ? (h.at || (lastHit && !(plan && plan.HG) ? lastHit : null)) : null);
    if(h && h.label){ const r = container.getBoundingClientRect(); tip.textContent = h.label; tip.style.left = Math.min(e.clientX - r.left + 16, r.width - 220) + "px"; tip.style.top = (e.clientY - r.top + 18) + "px"; tip.classList.add("on"); }
    else tip.classList.remove("on");
  });
  canvas.addEventListener("pointerleave", () => { tip.classList.remove("on"); showAim(null); });
  canvas.addEventListener("click", e => { if(swallowClick){ swallowClick = false; return; } const h = pickAt(e.clientX, e.clientY); if(h && h.onClick) h.onClick(); });

  // going up into the sky: stand where you are, tip your head back, and drag to look around
  let skyOn = false;
  function skyMode(on){ skyOn = !!on; if(on){ peeking = false; goal.pitch = 1.2; look.pitch = 0; dirty = 3; } else { look.pitch = 0; if(plan) show(plan); } }
  // in a court you can walk: to where you click on the paving, or a few steps forward and back
  function walkTo(pt){ if(!plan || !plan.room.walk || !pt) return; const lx = (plan.halfX || plan.half || 5.5) - 1.1, lz = (plan.halfZ || plan.half || 5.5) - 1.1;
    if(plan.HG){ if(!walking) hallGo(pt); return; }
    walkPos = new THREE.Vector3(Math.max(-lx, Math.min(lx, pt.x)), EYE, Math.max(-lz, Math.min(lz, pt.z)));
    if((plan.decor||[]).includes("sundial") && walkPos.length() < 1.9) walkPos.setLength(1.9);   // not into the dial
    peeking = false; focusPt = null; if(!walking) walkRoute([walkPos.clone()]); else goal.pos.copy(walkPos); dirty = 3; }
  let aimRing = null;
  function showAim(pt){ if(!aimRing){ aimRing = new THREE.Mesh(new THREE.RingGeometry(.22, .3, 32), new THREE.MeshBasicMaterial({color:"#fff3c4", transparent:true, opacity:.75, depthWrite:false})); aimRing.rotation.x = -Math.PI/2; }
    if(aimRing.parent !== scene) scene.add(aimRing); if(pt){ aimRing.visible = true; aimRing.position.set(pt.x, (pt.y || 0) + .02, pt.z); } else aimRing.visible = false; dirty = 2; }
  function step(dir){ if(focusKind()){ exitFocus(); return; } if(plan && plan.HG){ if(!walking) hallStep(dir); return; } const yaw = goal.yaw + look.yaw, f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)); walkTo(goal.pos.clone().addScaledVector(f, 2.4*dir)); }
  // step up to something without leaving where you are: the shelves, a picture; any other move steps back
  function peek(eye, aim){ peeking = true; focusPt = aim.clone(); goal.pos.copy(eye); goal.yaw = Math.atan2(-(aim.x - eye.x), -(aim.z - eye.z)); goal.pitch = Math.atan2(aim.y - eye.y, Math.hypot(aim.x - eye.x, aim.z - eye.z)); look.yaw = 0; look.pitch = 0; dirty = 3; }
  /* ---- moving: a few steps toward a door before the next room, and a dissolve between rooms ---- */
  let walking = false;
  function approach(to, then){ if(walking) return; walking = true; const dest = cam.pos.clone().lerp(new THREE.Vector3(to.x, (to.y||0) + EYE, to.z), .5); goal.pos.copy(dest); look.yaw = 0; look.pitch = 0;
    const dyaw = Math.atan2(-(to.x - cam.pos.x), -(to.z - cam.pos.z)); let dd = dyaw - goal.yaw; while(dd > Math.PI) dd -= TAU; while(dd < -Math.PI) dd += TAU; if(Math.abs(dd) < .6) goal.yaw += dd*.6;
    dirty = 3; setTimeout(() => { walking = false; then(); }, 300); }
  const veil = document.createElement("canvas"); veil.className = "veil3d"; container.appendChild(veil);
  function dissolve(){ try { veil.width = Math.max(1, Math.round(canvas.width/2)); veil.height = Math.max(1, Math.round(canvas.height/2)); veil.getContext("2d").drawImage(canvas, 0, 0, veil.width, veil.height);
      veil.style.transition = "none"; veil.style.opacity = "1"; requestAnimationFrame(() => requestAnimationFrame(() => { veil.style.transition = "opacity .5s ease"; veil.style.opacity = "0"; })); } catch(e) {} }
  const flash = document.createElement("div"); flash.className = "flash3d"; container.appendChild(flash);
  const backBtn = document.createElement("button"); backBtn.type = "button"; backBtn.className = "back3d"; backBtn.textContent = "↩ Step back"; container.appendChild(backBtn);
  backBtn.addEventListener("click", e => { e.stopPropagation(); exitFocus(); });
  window.addEventListener("wending-lightning", () => { if(!plan || !((plan.room.ceiling||"") === "open" || plan.decor.includes("window"))) return;
    flash.style.transition = "none"; flash.style.opacity = ".75"; setTimeout(() => { flash.style.transition = "opacity .5s"; flash.style.opacity = "0"; }, 70); setTimeout(() => { flash.style.transition = "none"; flash.style.opacity = ".5"; setTimeout(() => { flash.style.transition = "opacity .9s"; flash.style.opacity = "0"; }, 60); }, 240); });
  /* ---- the frame loop ---- */
  let last = performance.now(), dirty = 3;
  function frame(t){
    const dt = Math.min(.05, (t-last)/1000); last = t;
    // ease the camera toward its goal: a turn takes about half a second
    let dy = goal.yaw + look.yaw - cam.yaw; while(dy > Math.PI) dy -= TAU; while(dy < -Math.PI) dy += TAU;
    const k = drag && drag.moved ? 1 - Math.pow(1e-9, dt) : 1 - Math.pow(.00012, dt), gp = Math.max(-1.35, Math.min(1.52, goal.pitch + look.pitch));
    const moving = Math.abs(dy) > 1e-3 || Math.abs(gp-cam.pitch) > 1e-3 || cam.pos.distanceTo(goal.pos) > 1e-3;
    cam.yaw += dy*k; cam.pitch += (gp-cam.pitch)*k; cam.pos.lerp(goal.pos, k);
    camera.position.copy(cam.pos); camera.rotation.set(cam.pitch, cam.yaw, 0);
    anims.forEach(a => a(t/1000, dt));
    const fk = focusKind(); backBtn.classList.toggle("on", !!fk); if(fk) backBtn.textContent = fk === "sky" ? "↩ Come back down" : seated ? "↩ Stand up" : "↩ Step back";
    if(moving || anims.length || dirty>0){
      dirty = Math.max(0, dirty-1);
      if(RAW){ camera.layers.enableAll(); renderer.setRenderTarget(null); renderer.render(scene, camera); requestAnimationFrame(frame); return; }
      camera.layers.set(0);
      renderer.setRenderTarget(rt); renderer.render(scene, camera);
      post.uniforms.tColor.value = rt.texture; post.uniforms.tDepth.value = rt.depthTexture;
      post.uniforms.projInv.value.copy(camera.projectionMatrixInverse); post.uniforms.time.value = t/1000;
      if(isPhoto()){ postMesh.material = photo; photo.uniforms.tColor.value = rt.texture; photo.uniforms.tDepth.value = rt.depthTexture; photo.uniforms.projInv.value.copy(camera.projectionMatrixInverse); photo.uniforms.proj.value.copy(camera.projectionMatrix); photo.uniforms.time.value = (t/1000) % 100; }
      else postMesh.material = post;
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
  let prevRoom = null, plan0 = null, R0 = Math.random, stairAt = null, stairRoom = null;
  function show(p){
    const prevPlan = plan, navK = JSON.stringify([p.room.id, p.ahead, p.close, p.pitch, p.frame, p.node]);
    // a redraw that changes nothing about where you stand (the clock, the weather) keeps a close look, or a seat, as it is
    const keepPeek = peeking && navK === lastNavK; lastNavK = navK; plan = p; if(!keepPeek){ peeking = false; if(seated){ const s = seated; seated = null; s.leave(); } }
    if(prevPlan && prevPlan.room && p.room && prevPlan.room.id === p.room.id) ['HG','half','halfX','halfZ','hallFog','envK','doorSpots'].forEach(k => { if(p[k] === undefined && prevPlan[k] !== undefined) p[k] = prevPlan[k]; });
    const k = (isPhoto() ? "photo:" : "") + JSON.stringify(p.skyOpts || {}) + JSON.stringify([p.room.id, p.frame, p.mirror, p.band, p.doors.map(d=>[d.id,d.wall,d.open,d.label,d.name]), p.objects.map(o=>[o.title,o.wall]), p.decor, p.sheetKey, p.lantern, p.lanternColor, p.shade, p.light, p.wxKind, !!p.sunOff, !!p.moonOff, Math.floor(p.minuteKey/10)]);
    if(k !== key){ if(plan0 && plan0.room.id !== p.room.id) dissolve(); key = k; build(p); }
    // where to stand and where to look
    const sl = slots[p.ahead] || {dir:new THREE.Vector3(0,0,-1), center:new THREE.Vector3(0,0,-5), stand:new THREE.Vector3(0,EYE,0)};
    let pos, yaw = Math.atan2(-sl.dir.x, -sl.dir.z), pitch = p.pitch*((p.room.ceiling||"")==="open" && p.pitch>0 ? 1.32 : 0.95);
    if(p.close==="ahead" && stations[p.ahead]){ const st = stations[p.ahead]; pos = st.view.clone(); pitch = -0.66; yaw = Math.atan2(-(st.top.x-pos.x), -(st.top.z-pos.z)); }
    else if(nodeRoom(p) && p.node != null && nodePos(p.node)){ pos = nodePos(p.node); if(String(p.node) === String(p.ahead) && stations[p.ahead] && !p.pitch) pitch = -.3; }
    else { pos = sl.stand.clone(); }
    if(p.room.landings){ const kL = p.landing || 0, turnYaw = -(((p.ahead || 1) - 1 + 4) % 4)*Math.PI/2; pitch = p.pitch*.95 - .14;
      if(stairRoom === p.room.id && stairAt != null && stairAt !== kL && !walking){ stairTransit(p, stairAt, kL); pos = goal.pos.clone(); yaw = goal.yaw; }
      else if(walking && stairRoom === p.room.id){ pos = goal.pos.clone(); yaw = goal.yaw; }
      else { pos = stairStand(p, kL); yaw = Math.atan2(-Math.cos(.75), -Math.sin(.75)) + turnYaw; }
      stairAt = kL; stairRoom = p.room.id; }
    else stairRoom = null;
    if(p.room.floors){ pos = new THREE.Vector3(0, EYE, .55); yaw = -(((p.ahead || 1) - 1 + 4) % 4)*Math.PI/2; }
    // a turn made by dragging keeps the look; any other move squares the view up again
    const nav = JSON.stringify([p.room.id, p.ahead, p.close, p.pitch, p.frame]);
    if(nav !== prevRoom && (performance.now() - keepLook > 400 || p.room.id !== (plan0 && plan0.room.id))){ look.yaw = 0; look.pitch = 0; }
    prevRoom = nav; plan0 = p;
    if(p.room.walk && !p.close){ if(walkRoom !== p.room.id || !walkPos){ walkPos = pos.clone();
        if(p.HG){ const G = p.HG, lv = G.level, back = p.doors.find(d => String(d.to) === String(p.cameFrom)); let at = null, out = null;
          if(back && back.fixture && G.fixtures[back.fixture]){ const f = G.fixtures[back.fixture]; at = new THREE.Vector3(f.x + f.nx*2.4, 0, f.z + f.nz*2.4); out = Math.atan2(-f.nx, -f.nz); }
          else if(back && p.doorSpots[back.id]){ at = p.doorSpots[back.id].clone(); const sl2 = slots[back.wall]; if(sl2) out = Math.atan2(sl2.dir.x, sl2.dir.z); }
          const k = nearestNode(G, lv, at || pos); if(k >= 0){ walkPos = G.nodes[lv][k].clone(); if(out != null) setTimeout(() => faceYaw(out), 30); } } }
      pos = walkPos.clone(); } else if(walkRoom !== p.room.id) walkPos = null; walkRoom = p.room.id;   // in rooms you can walk, a turn turns you where you stand
    if(keepPeek){ post.uniforms.night.value = p.band==="night" ? 1 : 0; dirty = 3; return; }
    if(skyOn && !(p.room.ceiling === "open")) skyOn = false;
    // the info spots of a wall glint only when you stand at it, or look closely at it
    glints.forEach(gl => { gl.mesh.visible = !p.close ? (p.node != null && String(gl.slot) === String(p.node)) : String(gl.slot) === String(p.ahead); });
    nodeMarks.forEach(m => { m.visible = !p.close && String(m.userData.node) !== String(p.node == null ? "mid" : p.node); });
    goal.pos.copy(pos); goal.yaw = yaw; goal.pitch = skyOn ? 1.2 : pitch;
    if(p.snap){ cam.pos.copy(pos); cam.yaw = yaw; cam.pitch = pitch; }
    post.uniforms.night.value = p.band==="night" ? 1 : 0;
    canvas.style.transform = "";
    dirty = 3;
  }

  function build(p){
    scene.traverse(o => { if(o.geometry) o.geometry.dispose(); if(o.material){ [].concat(o.material).forEach(m => { if(m.map) m.map.dispose(); m.dispose(); }); } });
    winL.forEach(([ty, fn]) => window.removeEventListener(ty, fn)); winL = [];
    scene = new THREE.Scene(); picks = []; anims = []; glints = []; nodeMarks = [];
    if(isPhoto()){ scene.environment = roomEnvironment(); scene.environmentIntensity = p.band === "night" ? .15 : .45; } stations = {}; slots = {}; labelDim = p.band==="night" ? .72 : p.band==="dusk" ? .9 : 1;
    const hedged = (p.room.decor||[]).includes("hedges");
    WALL_H = p.room.height || (hedged ? 2.9 : (p.room.ceiling==="open") ? 3.3 : 4.2);
    const R = rng(hashStr("room"+p.room.id)); R0 = R;
    const spot = muted(p.spot, .6), night = p.band==="night", dusk = p.band==="dusk"||p.band==="dawn";
    const shape = p.room.shape || "square";
    if(p.room.landings){ buildStair(p, R); return; }
    if(p.room.floors){ buildCar(p); return; }
    const faces = shell(shape, p.room.size, p.room.length); p.halfX = (p.room.size || 11)/2; p.halfZ = (p.room.length || p.room.size || 11)/2; p.half = Math.max(p.halfX, p.halfZ);
    const gothic = p.room.ceiling === "gothic", HG = gothic ? hallGrid(p) : p.room.walk ? walkGrid(p) : null; p.HG = HG;
    const wallMat = mat(p.room.decor && p.room.decor.includes("glacier") ? "#dfe7ea" : "#d6cdbb", {roughness:.95});
    const stoneTex = canvasTex(512, 512, (g,w,h) => { g.fillStyle="#cfc6b3"; g.fillRect(0,0,w,h); g.strokeStyle="#9c927f"; g.lineWidth=3;
      for(let y=0,row=0;y<h;y+=64,row++){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); for(let x=(row%2)*64;x<w;x+=128){ g.beginPath(); g.moveTo(x,y); g.lineTo(x,y+64); g.stroke(); } }
      for(let i=0;i<900;i++){ g.fillStyle=`rgba(80,70,55,${R()*.08})`; g.fillRect(R()*w,R()*h,2+R()*6,1+R()*3); } });
    stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
    const hedgeTex = hedged ? leafTex(R) : null;
    // ---- walls, with their doors and windows cut out
    const doorsBySlot = {}; p.doors.filter(d => !d.fixture).concat((p.ghosts||[]).filter(d => !d.fixture && !(p.room.landings || p.room.floors))).forEach(d => (doorsBySlot[d.wall] = doorsBySlot[d.wall]||[]).push(d)); p.doorSpots = {};
    const objsBySlot = {}; p.objects.forEach(o => (objsBySlot[o.wall] = objsBySlot[o.wall]||[]).push(o));
    const boardsOn = (f, len) => { f.holes = f.holes || []; const m = f.slot>=0 ? (objsBySlot[f.slot]||[]).filter(o => o.mount).length : 0; return m ? boardSpots(f, len, m) : []; };
    faces.forEach((f, fi) => {
      const len = f.a.distanceTo(f.b), u = f.b.clone().sub(f.a).normalize(), n = f.n;
      const ds = f.slot>=0 ? (doorsBySlot[f.slot]||[]) : [];
      const holes = [];
      // doors spaced across the wall; a window on the back wall if the room has one
      const nd = ds.length;
      ds.forEach((d,i) => { if(gothic){ const side = f.slot === 0 || f.slot === 2, up = (d.level||0) > 0, same = ds.filter(e => ((e.level||0) > 0) === up), j = same.indexOf(d), k = same.length;
          const at = len/2 + (j - (k-1)/2)*(side ? HG.bay : (HG.xs[3] - HG.xs[2] > 0 ? (HG.xs[4] - HG.xs[1])/3 : 6));
          holes.push({kind:"door", at, w: up ? 2.3 : side ? 3.5 : 4.2, h: up ? 3.7 : side ? 6.4 : 7.0, sill: up ? HG.gal : 0, d, pointed:true}); return; }
        const at = len*(i+1)/(nd+1); holes.push({kind:"door", at, w:Math.min(DOOR_W, len/(nd+1)*.8), h:DOOR_H, sill:0, d}); });
      if(p.room.windows === "all" && len > 3){ const ww = p.room.winW || 1.8, wh = Math.min(p.room.winH || 3, WALL_H - (p.room.winSill || .9) - .35); let x = 1.3; while(x < len - 1.3){ if(!holes.some(hh => Math.abs(hh.at - x) < hh.w/2 + ww/2 + .35)) holes.push({kind:"window", at:x, w:ww, h:wh, sill:p.room.winSill || .9, view:true}); x += ww + .8; } }
      if(f.slot===1 && p.decor.includes("window") && len > 3){
        const free = freeSpot(len, holes, 1.2); if(free!=null) holes.push({kind:"window", at:free, w:1.15, h:1.7, sill:1.25});
      }
      f.holes = holes;
      const shapeW = new THREE.Shape(); shapeW.moveTo(0,0); shapeW.lineTo(len,0); shapeW.lineTo(len,WALL_H); shapeW.lineTo(0,WALL_H); shapeW.lineTo(0,0);
      holes.forEach(hh => { const hp = new THREE.Path(), x0 = hh.at - hh.w/2, x1 = hh.at + hh.w/2, y0 = hh.sill;
        if(hh.pointed){ const ap = archPts(hh.w, hh.h, true, 14); hp.moveTo(x0,y0); hp.lineTo(x1,y0); ap.forEach(([x,y]) => hp.lineTo(hh.at + x, y0 + y)); hp.lineTo(x0,y0); shapeW.holes.push(hp); return; }
        const y1 = hh.sill + hh.h - hh.w/2;
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
      if(f.slot>=0){ const center = mid(f); slots[f.slot] = {center, dir:n.clone().negate(), stand:center.clone().multiplyScalar(gothic ? -(1 - 3.2/center.length()) : shape==="corridor" ? -.2 : p.room.walk ? -.6 : -.1).setY(EYE), face:f}; }
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
    const roofless = (p.room.ceiling||"") === "open", wet = roofless && ["rain","storm"].includes(p.wxKind), snowy = roofless && p.wxKind === "snow" && (p.temp == null || p.temp < 35);
    const floor = new THREE.Mesh(fg, mat(wet ? "#b9b2a4" : snowy ? "#ffffff" : "#ffffff", {map:floorTex, roughness: wet ? .28 : .8, metalness: wet ? .15 : 0})); floor.receiveShadow = true; scene.add(floor);
    if(p.room.walk && !(gothic && (p.room.level||0) > 0)){ floor.userData.hit = {kind:"walk", label:"Walk here", onClick:()=>walkTo(lastHit)}; picks.push(floor); }
    if(snowy){ const cover = new THREE.Mesh(fg.clone(), new THREE.MeshStandardMaterial({color:"#f4f6f6", roughness:.95, transparent:true, opacity:.72})); cover.position.y = .004; cover.receiveShadow = true; scene.add(cover); }
    const ceilKind = p.room.ceiling || "beams";
    if(ceilKind !== "open" && !p.decor.includes("sky")){
      const cg = new THREE.ShapeGeometry(floorShape); cg.rotateX(Math.PI/2); cg.translate(0, WALL_H, 0);
      const ceil = new THREE.Mesh(cg, mat("#bdb4a2", {side:THREE.DoubleSide})); ceil.receiveShadow = true; scene.add(ceil);
      if(gothic){ ceil.material.color.set("#4a443b"); ceil.castShadow = true; } else ceilingDetail(ceilKind, faces, R);
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
    } else if(night && !gothic){ const pl = new THREE.PointLight("#ffe2b0", 22, 0, 1.1); pl.position.set(0, WALL_H-.6, 1); scene.add(pl); }
    if(p.sunUp){
      // the real sun, from the real direction: walls cast the shadows, windows let it in
      const s = new THREE.DirectionalLight("#fff3d9", 3.4*cloudK);
      const az = p.sunRel*DEG, alt = Math.max(.5, p.sunAlt)*DEG;
      const d = new THREE.Vector3(Math.sin(az)*Math.cos(alt), Math.sin(alt), -Math.cos(az)*Math.cos(alt));
      s.position.copy(d.multiplyScalar(30)); s.target.position.set(0,0,0); s.castShadow = true;
      s.shadow.mapSize.set(Q.shadow,Q.shadow); const sc = s.shadow.camera; const ext = Math.max(12, p.half*1.35); sc.left=-ext; sc.right=ext; sc.top=ext; sc.bottom=-ext; sc.near=1; sc.far=90; s.shadow.bias = -.0006;
      scene.add(s); scene.add(s.target);
    }
    if(moonK > .02){
      // the moon, from where it really is, as bright as its phase and the clouds allow; a bright moon throws shadows
      const m = new THREE.DirectionalLight("#c6d0e6", (openSky ? 2.6 : 1.6)*moonK);
      const az = p.moonRel*DEG, alt = Math.max(.5, p.moonAlt)*DEG;
      m.position.set(Math.sin(az)*Math.cos(alt)*30, Math.sin(alt)*30, -Math.cos(az)*Math.cos(alt)*30); m.target.position.set(0,0,0);
      if(moonK > .18){ m.castShadow = true; m.shadow.mapSize.set(Q.shadow,Q.shadow); const sc = m.shadow.camera; const ext = Math.max(12, p.half*1.35); sc.left=-ext; sc.right=ext; sc.top=ext; sc.bottom=-ext; sc.near=1; sc.far=90; m.shadow.bias = -.0006; }
      scene.add(m); scene.add(m.target);
    }
    // the lantern you carry: shaded, low, steady or bright, held a little to your right and below your eyes
    const LV = +p.lantern || 0;
    if(LV){ const pl = new THREE.PointLight(p.lanternColor || "#ffd28a", [0, 5, 12, 26][LV], [0, 5, 9, 15][LV], 1.5); pl.userData.lantern = true; scene.add(pl);
      const base = pl.intensity; anims.push((t) => { pl.position.copy(cam.pos).add(new THREE.Vector3(.3,-.4,0)); pl.intensity = base*(.95 + .05*Math.sin(t*5.3)*Math.sin(t*2.1+.7)); }); }
    if(p.gloom){ amb.intensity *= [.25, .55, .7, .85][LV]; }
    // ---- floor and wall fittings
    decorBuild(p, faces, R, spot);
    if(gothic) buildCommonsHall(p, faces, R);
    if(isPhoto()){ // in the photographic view the room's light comes from the sun, the lamps, and what the walls reflect: less flat fill
      scene.traverse(o => { if(o.isHemisphereLight) o.intensity *= .38; else if(o.isDirectionalLight && !o.castShadow) o.intensity *= .45; else if(o.isPointLight) o.intensity *= 1.25; }); }
    // the shutters: by day you can half-close them or draw them, and the daylight in the room goes down with them
    const shade = p.shade == null ? 1 : p.shade;
    if(shade < 1 && p.band !== "night" && !openSky) scene.traverse(o => { if(o.isHemisphereLight) o.intensity *= .25 + .75*shade; else if(o.isDirectionalLight) o.intensity *= shade; });
    // ---- stations: furniture with the room's things on it, one per wall that has things
    Object.keys(objsBySlot).forEach(sk => { const sl = slots[sk]; if(!sl) return;
      const mounted = objsBySlot[sk].filter(o => o.mount), loose = objsBySlot[sk].filter(o => !o.mount);
      const boards = mounted.filter(o => o.mount === "board"), stands = mounted.filter(o => o.mount !== "board");
      boards.forEach((o,i) => buildBoard(sl, o, i, boards.length, p, spot));
      stands.forEach((o,i) => buildPedestal(sl, o, i, p, spot));
      if(loose.length) buildStation(+sk, sl, loose, p, R, spot); });
    if(nodeRoom(p)){ const wallsWith = {}; p.objects.forEach(o => (wallsWith[o.wall] = wallsWith[o.wall] || []).push(o.title)); p.doors.forEach(d => (wallsWith[d.wall] = wallsWith[d.wall] || []).push(d.label + (d.name ? " " + d.name : "")));
      const disc = (pos, node, label) => { const m = new THREE.Mesh(new THREE.CircleGeometry(.75, 24), new THREE.MeshBasicMaterial({visible:false})); m.rotation.x = -Math.PI/2; m.position.set(pos.x, .01, pos.z); m.userData.node = node;
        m.userData.hit = {kind:"walk", label, at: new THREE.Vector3(pos.x, 0, pos.z), onClick:() => hooks.goNode && hooks.goNode(node === "mid" ? null : node)}; scene.add(m); picks.push(m); nodeMarks.push(m); };
      Object.keys(slots).forEach(k => { const np = nodePos(k); if(!np) return; const os = p.objects.filter(o => String(o.wall) === String(k)), ds = p.doors.filter(d => String(d.wall) === String(k)); if(!os.length && !ds.length) return;
        const board = os.find(o => o.mount === "board"), stand = os.find(o => o.mount && o.mount !== "board"), loose = os.filter(o => !o.mount);
        const what = loose.length ? (loose.some(o => o.bookish) ? "the bookcase" : "the desk") + (loose.length > 1 ? ` (${loose.length} things)` : `: ${loose[0].title}`) : board ? board.title.replace(/^the /i, "the ") : stand ? stand.title : `the door, ${ds[0].label}${ds[0].name ? " " + ds[0].name : ""}`;
        disc(np, k, "Walk over to " + what.charAt(0).toLowerCase() + what.slice(1)); });
      const ms = (slots[p.ahead] || slots[0] || {stand:new THREE.Vector3(0, EYE, 0)}).stand; disc(new THREE.Vector3(0, 0, 0), "mid", "Back to the middle of the room"); }
    if(p.envK != null) scene.traverse(o => { if(o.material) [].concat(o.material).forEach(m => { if("envMapIntensity" in m) m.envMapIntensity = p.envK; }); });
    scene.fog = (p.wxKind === "fog" && (p.room.ceiling||"") === "open") ? new THREE.Fog(night ? "#24262a" : "#d8d8d2", 2.5, 16) : p.hallFog ? p.hallFog : night ? new THREE.Fog("#0d0c0b", p.half > 12 ? 30 : 10, p.half > 12 ? 85 : 30) : null;
  }

  function mid(f){ return f.a.clone().add(f.b).multiplyScalar(.5); }
  /* ---- nodes: in an ordinary room you stand in the middle, or at a standing place in front of a wall; you turn on the spot and glide between them ---- */
  const nodeRoom = p => !!(p && p.room && !p.room.walk && (p.room.ceiling || "") !== "gothic" && !p.room.landings && !p.room.floors);
  function nodePos(k){ const sl = slots[k]; if(!sl) return null; const d = sl.center.clone().setY(0), L = d.length(); if(L < .5) return null; const back = Math.min(2.1, L*.55); return d.multiplyScalar(1 - back/L).setY(EYE); }
  function freeSpot(len, holes, w){ const cands = [len*.25, len*.75, len*.5, len*.15, len*.85]; return cands.find(c => !holes.some(h => Math.abs(h.at-c) < h.w/2 + w/2 + .25)) ?? null; }

  // room outlines in plan: faces in order, each with its inward normal and which compass slot it serves
  function shell(shape, size, length){
    let pts = [], slotOf = null;
    const poly = (n, r, rot) => { const out = []; for(let i=0;i<n;i++){ const t = rot + i*TAU/n; out.push(new THREE.Vector3(Math.sin(t)*r, 0, -Math.cos(t)*r)); } return out; };
    if(shape==="hex"){ pts = poly(6, 6.4, -Math.PI/6); }
    else if(shape==="oct"){ pts = poly(8, 6.6, -Math.PI/8); }
    else if(shape==="round"){ pts = poly(20, 6.3, -Math.PI/20); }
    else if(shape==="corridor"){ pts = [new THREE.Vector3(-2.3,0,-11), new THREE.Vector3(2.3,0,-11), new THREE.Vector3(2.3,0,3), new THREE.Vector3(-2.3,0,3)]; }
    else { const hs = size ? size/2 : 5.5, hz = length ? length/2 : hs; pts = [new THREE.Vector3(-hs,0,-hz), new THREE.Vector3(hs,0,-hz), new THREE.Vector3(hs,0,hz), new THREE.Vector3(-hs,0,hz)]; }
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
      if(kind==="slate"){ // green Vermont slate, laid in long flags
        g.fillStyle = "#4f5c53"; g.fillRect(0,0,w,h); let y = 0, row = 0;
        while(y < h){ const rh = 120 + Math.floor(R()*3)*30; let x = row%2 ? -R()*160 : 0;
          while(x < w){ const ww = 180 + R()*200, tone = R(); g.fillStyle = tone < .3 ? "#56655a" : tone < .6 ? "#4a574f" : tone < .85 ? "#5c6a5c" : "#46514a"; g.fillRect(x + 3, y + 3, ww - 6, rh - 6);
            for(let k=0;k<26;k++){ g.fillStyle = `rgba(${R() < .5 ? "20,28,24" : "120,135,120"},${.05 + R()*.07})`; g.fillRect(x + R()*ww, y + R()*rh, 8 + R()*40, 1 + R()*2); }
            x += ww; } y += rh; row++; }
        g.strokeStyle = "#2e3631"; g.lineWidth = 3; return; }
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
  /* ---- a great Gothic hall, after the Commons Room of Pittsburgh's Cathedral of Learning: clustered piers, a ribbed vault,
          galleries over the alcoves, a great window over an iron gate, iron lanterns, and long oak tables ---- */
  function mergeGeoms(list, worldUV){
    const pos = [], nor = [], uv = [], idx = []; let off = 0;
    list.forEach(([g, m]) => { const gg = g.clone().applyMatrix4(m), P = gg.attributes.position, N = gg.attributes.normal, U = gg.attributes.uv;
      for(let i=0;i<P.count;i++){ const x = P.getX(i), y = P.getY(i), z = P.getZ(i), nx = N ? N.getX(i) : 0, ny = N ? N.getY(i) : 1, nz = N ? N.getZ(i) : 0; pos.push(x, y, z); nor.push(nx, ny, nz);
        if(worldUV){ const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz); uv.push(...(ay >= ax && ay >= az ? [x/2.4, z/2.4] : ax >= az ? [z/2.4, y/2.4] : [x/2.4, y/2.4])); }
        else uv.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0); }
      if(gg.index) for(let i=0;i<gg.index.count;i++) idx.push(gg.index.getX(i) + off); else for(let i=0;i<P.count;i++) idx.push(i + off);
      off += P.count; gg.dispose(); });
    const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); out.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); out.setIndex(idx); return out; }
  /* ---- the Great Hall, after the Commons Room of Pittsburgh's Cathedral of Learning.
          The plan: a ring of vaulted bays around the tower's core, which holds the elevators behind tall iron gates; a stone turret stair
          beside the core; a walkway all round at the third-floor level, with rooms off it, reached by the turret, the elevators, and two bridges;
          rooms off the floor beneath it; an enormous fireplace at the far end, and great windows over both ends. ---- */
  function hallGrid(p){
    const HX = (p.room.size || 42)/2, HZ = (p.room.length || 56)/2, WD = p.room.walkway || 5, core = p.room.core || [12, 16], cx = core[0]/2, cz = core[1]/2;
    const iz = HZ - WD, n = Math.max(2, Math.round(2*iz/8)), bay = 2*iz/n, zs = [-HZ]; for(let k=0;k<=n;k++) zs.push(-iz + k*bay); zs.push(HZ);
    const xs = [-HX, -(HX - WD), -cx, cx, HX - WD, HX], BW = 3, tr = 2.8, tx = cx + BW + tr + .4, tz = -cz/2;
    const G = {HX, HZ, WD, cx, cz, xs, zs, bay, gal: p.room.gallery || 8, H: WALL_H, BW, tx, tz, tr, level: p.room.level || 0, bridges:[{s:-1, z:-5.5, w:2.6}, {s:1, z:5.5, w:2.6}]};
    // the furniture and the stone that the floor's paths keep clear of
    G.tables = []; [-1, 1].forEach(sd => [-12.5, -5, 5, 12.5].forEach(x => [cz + 6, cz + 12].forEach(z => { if(sd > 0 || Math.abs(x) > 3) G.tables.push([x, sd*z]); }))); [-4, 4].forEach(z => G.tables.push([-(cx + 5.5), z]));
    G.piers = []; const ix = HX - WD, izz = HZ - WD;
    for(let k=1;k<zs.length-1;k++) [-ix, ix].forEach(x => G.piers.push([x, zs[k], 1.35]));
    for(let i=2;i<4;i++) [-izz, izz].forEach(z => G.piers.push([xs[i], z, 1.35]));
    G.fixtures = {"lift-front":{x:0, z:cz, nx:0, nz:1}, "lift-back":{x:0, z:-cz, nx:0, nz:-1}, "turret":{x:tx, z:tz + tr, nx:0, nz:1}, "turret-up":{x:tx - tr, z:tz, nx:-1, nz:0}};
    G.nodes = [[], []]; G.adj = [[], []];
    const add = (lv, x, z) => { if(hallOK(G, x, z, lv) && !G.nodes[lv].some(q => Math.hypot(q.x - x, q.z - z) < 1.6)) G.nodes[lv].push(new THREE.Vector3(x, lv*G.gal + EYE, z)); };
    for(let x = -HX + 2.5; x <= HX - 2.4; x += 4.2) for(let z = -HZ + 2.5; z <= HZ - 2.4; z += 4.2) add(0, x, z);
    Object.values(G.fixtures).forEach(f => add(0, f.x + f.nx*2.6, f.z + f.nz*2.6));
    const rc = ix + WD/2, rzc = izz + WD/2;   // the walkway's middle line
    for(let z = -rzc; z <= rzc + .01; z += 4) { add(1, -rc, z); add(1, rc, z); } for(let x = -rc + 4; x <= rc - 3.9; x += 4) { add(1, x, -rzc); add(1, x, rzc); }
    const bc = cx + BW/2, bzc = cz + BW/2; for(let z = -bzc; z <= bzc + .01; z += 3) { add(1, -bc, z); add(1, bc, z); } for(let x = -bc + 3; x <= bc - 2.9; x += 3) { add(1, x, -bzc); add(1, x, bzc); }
    G.bridges.forEach(b => { for(let t=0; t<=1.001; t+=1/3){ add(1, b.s*(cx + BW + .4 + t*(ix - cx - BW - .8)), b.z); } });
    add(1, tx - tr - 1.7, tz);
    [0, 1].forEach(lv => { const N = G.nodes[lv]; N.forEach((a, i) => { G.adj[lv][i] = []; N.forEach((b, j) => { if(i !== j && a.distanceTo(b) < 6.2 && hallClear(G, a, b, lv)) G.adj[lv][i].push(j); }); }); });
    return G;
  }
  // an open court's standing places: round the sundial, out in the court, and along the cloister walk under the colonnade
  function walkGrid(p){ const HX = p.halfX, HZ = p.halfZ, G = {level:0, fixtures:{}, nodes:[[]], adj:[[]], court:true}, N = G.nodes[0], kind = [];
    const add = (x, z, k) => { if(Math.hypot(x, z) < 2.6 || Math.abs(x) > HX - .8 || Math.abs(z) > HZ - .8) return; if(N.some(q => Math.hypot(q.x - x, q.z - z) < 1.5)) return; N.push(new THREE.Vector3(x, EYE, z)); kind.push(k); };
    for(let i = 0; i < 8; i++){ const a = i*Math.PI/4; add(3.3*Math.sin(a), 3.3*Math.cos(a), "ring"); }
    const r2 = Math.min(HX, HZ) - 3.7; if(r2 > 5) for(let i = 0; i < 8; i++){ const a = i*Math.PI/4 + Math.PI/8; add(r2*Math.sin(a), r2*Math.cos(a), "court"); }
    const cx = HX - 1.0, cz = HZ - 1.0; [-1, -.5, 0, .5, 1].forEach(t => { add(t*cx, -cz, t ? "walk" : "gate"); add(t*cx, cz, t ? "walk" : "gate"); add(-cx, t*cz, t ? "walk" : "gate"); add(cx, t*cz, t ? "walk" : "gate"); });
    const near = (a, b) => { const n = 24; for(let i = 1; i < n; i++){ const t = i/n, x = a.x + (b.x - a.x)*t, z = a.z + (b.z - a.z)*t; if(Math.hypot(x, z) < 2.3) return false; } return true; };
    N.forEach((a, i) => { G.adj[0][i] = []; N.forEach((b, j) => { if(i === j) return; const d = a.distanceTo(b), ki = kind[i], kj = kind[j];
      const cloister = k => k === "walk" || k === "gate", cross = cloister(ki) !== cloister(kj);
      if(cross && !(ki === "gate" || kj === "gate")) return;   // the colonnade is crossed only where a gate opens between columns
      if(cloister(ki) && cloister(kj) && Math.abs(a.x - b.x) > .1 && Math.abs(a.z - b.z) > .1) return;   // the cloister walk runs straight along each side
      if(d < (cross ? 6.5 : 5.2) && near(a, b)) G.adj[0][i].push(j); }); });
    return G; }
  function hallClear(G, a, b, up){ const n = Math.ceil(a.distanceTo(b)/.3); for(let i=1;i<n;i++){ const t = i/n; if(!hallOK(G, a.x + (b.x - a.x)*t, a.z + (b.z - a.z)*t, up)) return false; } return true; }
  function hallOK(G, x, z, up){
    if(!up){ if(Math.abs(x) > G.HX - 1.2 || Math.abs(z) > G.HZ - 1.2) return false; if(Math.abs(x) < G.cx + 1.1 && Math.abs(z) < G.cz + 1.1) return false;
      if(Math.hypot(x - G.tx, z - G.tz) < G.tr + 1.1) return false; if(z < -G.HZ + 3.5 && Math.abs(x) < 5) return false;
      if(G.piers.some(([px, pz, r]) => Math.hypot(x - px, z - pz) < r + .5)) return false;
      return !G.tables.some(([tx, tz]) => Math.abs(x - tx) < 1.9 && Math.abs(z - tz) < 2.9); }
    const ix = G.HX - G.WD, iz = G.HZ - G.WD, m = 1.0;
    if((Math.abs(x) > ix + m || Math.abs(z) > iz + m) && Math.abs(x) < G.HX - m && Math.abs(z) < G.HZ - m) return true;
    if(Math.hypot(x - G.tx, z - G.tz) < G.tr + .6) return false;
    if(Math.abs(x) < G.cx + G.BW - m && Math.abs(z) < G.cz + G.BW - m && (Math.abs(x) > G.cx + .8 || Math.abs(z) > G.cz + .8)) return true;
    return G.bridges.some(b => Math.abs(z - b.z) < b.w/2 - .5 && x*b.s > G.cx + .8 && x*b.s < ix + 1.2) || Math.hypot(x - (G.tx - G.tr - 1.7), z - G.tz) < 1.0;
  }
  // Myst-style: you stand only at the hall's standing places, and move between them along clear paths
  function nearestNode(G, lv, pt, maxD = 1e9){ let best = -1, bd = maxD; G.nodes[lv].forEach((q, i) => { const d = Math.hypot(q.x - pt.x, q.z - pt.z); if(d < bd){ bd = d; best = i; } }); return best; }
  function nodePath(G, lv, a, b){ const N = G.nodes[lv], dist = N.map(() => Infinity), prev = N.map(() => -1), done = N.map(() => false); dist[a] = 0;
    for(let it=0; it<N.length; it++){ let u = -1; for(let i=0;i<N.length;i++) if(!done[i] && (u < 0 || dist[i] < dist[u])) u = i; if(u < 0 || dist[u] === Infinity || u === b) break; done[u] = true;
      G.adj[lv][u].forEach(v => { const d = dist[u] + N[u].distanceTo(N[v]); if(d < dist[v]){ dist[v] = d; prev[v] = u; } }); }
    if(a !== b && prev[b] < 0) return null; const path = []; for(let v = b; v !== a; v = prev[v]) path.unshift(N[v].clone()); return path; }
  function hallGo(pt){ const G = plan.HG, lv = G.level, here = nearestNode(G, lv, goal.pos), to = nearestNode(G, lv, pt, 7); if(to < 0 || here < 0 || to === here) return; const path = nodePath(G, lv, here, to); if(!path || !path.length) return; walkPos = path[path.length-1].clone(); peeking = false; walkRoute(path); }
  function hallStep(dir){ const G = plan.HG, lv = G.level, here = nearestNode(G, lv, goal.pos); if(here < 0) return; const yaw = goal.yaw + look.yaw, f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).multiplyScalar(dir);
    let best = -1, bs = Math.cos(40*DEG); G.adj[lv][here].forEach(j => { const d = G.nodes[lv][j].clone().sub(G.nodes[lv][here]).setY(0), L = d.length(); const c = d.dot(f)/L - L*.004; if(c > bs){ bs = c; best = j; } });
    if(best < 0){ hooks.toast && hooks.toast(dir > 0 ? "No way on that way." : "No way back that way."); return; } walkPos = G.nodes[lv][best].clone(); peeking = false; walkRoute([walkPos.clone()]); }
  function walkRoute(path){ walking = true; let i = 0, stepT = 0;
    const fn = (t, dt) => { const target = path[i], d = goal.pos.distanceTo(target), sp = 5*(dt || .016);
      if(d <= sp){ goal.pos.copy(target); i++; if(i >= path.length){ const k = anims.indexOf(fn); if(k >= 0) anims.splice(k, 1); walkPos = target.clone(); walking = false; return; } }
      else goal.pos.add(target.clone().sub(goal.pos).multiplyScalar(sp/d));
      dirty = 2; if(performance.now() - stepT > 420){ stepT = performance.now(); hooks.footstep && hooks.footstep(); } };
    anims.push(fn); }
  // turn the house's own facing so the view settles on this heading (a quarter turn at a time)
  function faceYaw(y, snap){ let d = y - goal.yaw; while(d > Math.PI) d -= TAU; while(d < -Math.PI) d += TAU; const q = Math.round(d/(Math.PI/2));
    if(snap){ cam.yaw = goal.yaw + q*Math.PI/2; } keepLook = performance.now(); for(let i=0;i<Math.abs(q);i++) hooks.turn(q > 0 ? -1 : 1); }
  function buildCommonsHall(p, faces, R){
    const G = p.HG, HX = G.HX, HZ = G.HZ, H = G.H, xs = G.xs, zs = G.zs, ix = HX - G.WD, iz = HZ - G.WD, gal = G.gal, cx = G.cx, cz = G.cz;
    const hs = 10.5, hR = H - .25 - hs, gs = gal + 4.2, gR = Math.min(H - .5 - gs, 3.4), sHall = gal - .6;   // springings and rises: the high vault, the gallery vault, the walkway's underside
    const ptd = u => Math.sqrt(Math.max(0, 4 - (2-u)*(2-u)))/Math.sqrt(3), prof = (v, a, b) => ptd(1 - Math.abs(2*(v - a)/(b - a) - 1));
    const M = (x=0, y=0, z=0, rx=0, ry=0, rz=0, sx=1, sy=1, sz=1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    const stoneP = [], ribP = [], oakP = [], ironP = [], giltP = [], darkP = [], bronzeP = [], walkP = [], traceP = [], glowP = [];
    const photo = isPhoto(), mode = p.light || "auto";  const _u = 0, dark = mode === "night" || (mode === "auto" && p.band === "night"), bright = mode === "day", lowered = mode === "night", dayAuto = mode === "auto" && p.band !== "night", lampK = lowered ? .2 : bright ? 2.2 : dayAuto ? .75 : 1;
    // ---- the vault, cell by cell
    const cells = [];
    for(let i=0;i<5;i++) for(let k=0;k<zs.length-1;k++){ const x0 = xs[i], x1 = xs[i+1], z0 = zs[k], z1 = zs[k+1];
      if(i === 2 && z0 >= -cz - .01 && z1 <= cz + .01) continue;   // the core
      const outer = i === 0 || i === 4 || k === 0 || k === zs.length - 2; cells.push({x0, x1, z0, z1, outer, hs: outer ? gs : hs, rise: outer ? gR : hR}); }
    const yAt = (c, x, z) => c.hs + c.rise*Math.max(prof(x, c.x0, c.x1), prof(z, c.z0, c.z1));
    const pos = [], uvs = [], idx = [];
    const quad = (fn, nu, nv) => { const base = pos.length/3; for(let j=0;j<=nv;j++) for(let i=0;i<=nu;i++){ const [x,y,z,u,v] = fn(i/nu, j/nv); pos.push(x,y,z); uvs.push(u,v); }
      for(let j=0;j<nv;j++) for(let i=0;i<nu;i++){ const a = base + j*(nu+1) + i, b = a+1, c2 = a + nu+1, d = c2+1; idx.push(a, c2, b, b, c2, d); } };
    cells.forEach(c => quad((s, t) => { const x = c.x0 + (c.x1-c.x0)*s, z = c.z0 + (c.z1-c.z0)*t; return [x, yAt(c, x, z), z, x/2.4, z/2.4]; }, 18, 18));
    // the clerestory walls over the arches of the high vault, along the walkway's edge, and the ground arcade's spandrels under the walkway
    const archY = (v, a, b, y0, r) => y0 + r*prof(v, a, b);
    for(let k=1;k<zs.length-2;k++) [-ix, ix].forEach(x => { const a = zs[k], b = zs[k+1];
      quad((s, t) => { const z = a + (b-a)*s, y0 = archY(z, a, b, hs, hR), y = y0 + (H - y0)*t; return [x, y, z, z/2.4, y/2.4]; }, 20, 3);
      quad((s, t) => { const z = a + (b-a)*s, y0 = archY(z, a, b, 3.9, 2.9), y = y0 + (sHall - y0)*t; return [x, y, z, z/2.4, y/2.4]; }, 20, 3); });
    for(let i=1;i<4;i++) [-iz, iz].forEach(z => { const a = xs[i], b = xs[i+1];
      quad((s, t) => { const x = a + (b-a)*s, y0 = archY(x, a, b, hs, hR), y = y0 + (H - y0)*t; return [x, y, z, x/2.4, y/2.4]; }, 20, 3);
      quad((s, t) => { const x = a + (b-a)*s, y0 = archY(x, a, b, 3.9, Math.min(2.9, (b-a)*.3)), y = y0 + (sHall - y0)*t; return [x, y, z, x/2.4, y/2.4]; }, 20, 3); });
    const vg = new THREE.BufferGeometry(); vg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); vg.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); vg.setIndex(idx); vg.computeVertexNormals();
    const vault = new THREE.Mesh(vg, mat("#d3cab7", {side:THREE.DoubleSide})); vault.receiveShadow = true; vault.castShadow = photo; scene.add(vault);
    // ---- the ribs and bosses
    const seen = new Set(), tube = (pts, r, arr = ribP) => arr.push([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length*2, r, 6, false), M()]);
    const rib = (fn, n, r, key) => { if(key){ if(seen.has(key)) return; seen.add(key); } const pts = []; for(let i=0;i<=n;i++) pts.push(fn(i/n)); tube(pts, r); };
    cells.forEach(c => { const r = c.outer ? .12 : .18, V = (x, z) => new THREE.Vector3(x, yAt(c, x, z) - .06, z);
      [c.z0, c.z1].forEach(z => rib(t => V(c.x0 + (c.x1-c.x0)*t, z), 20, r, `t${c.x0},${z},${c.outer}`));
      [c.x0, c.x1].forEach(x => rib(t => V(x, c.z0 + (c.z1-c.z0)*t), 20, r*.8, `l${x},${c.z0},${c.outer}`));
      rib(t => V(c.x0 + (c.x1-c.x0)*t, c.z0 + (c.z1-c.z0)*t), 24, r*.9); rib(t => V(c.x1 + (c.x0-c.x1)*t, c.z0 + (c.z1-c.z0)*t), 24, r*.9);
      const mx = (c.x0+c.x1)/2, mz = (c.z0+c.z1)/2, top = c.hs + c.rise;
      if(!c.outer){ rib(t => new THREE.Vector3(mx, top - .1, c.z0 + (c.z1-c.z0)*t), 3, .14); rib(t => new THREE.Vector3(c.x0 + (c.x1-c.x0)*t, top - .1, mz), 3, .14);
        // tiercerons: the extra ribs of an English vault, from each corner to the ridge
        [[c.x0,c.z0],[c.x1,c.z0],[c.x0,c.z1],[c.x1,c.z1]].forEach(([ax, az]) => { rib(t => V(ax + (mx - ax)*t, az + (c.z0 + (c.z1-c.z0)*.25 + (az > mz ? (c.z1-c.z0)*.5 : 0) - az)*t), 16, .1); rib(t => V(ax + (c.x0 + (c.x1-c.x0)*.25 + (ax > mx ? (c.x1-c.x0)*.5 : 0) - ax)*t, az + (mz - az)*t), 16, .1); }); }
      giltP.push([new THREE.SphereGeometry(c.outer ? .26 : .44, 14, 8), M(mx, top - .16, mz, 0, 0, 0, 1, .5, 1)]);
      if(!c.outer) for(let q=0;q<10;q++){ const a = q/10*TAU; giltP.push([new THREE.SphereGeometry(.13, 6, 4), M(mx + Math.cos(a)*.52, top - .2, mz + Math.sin(a)*.52, 0, -a, 0, 1.6, .5, .7)]); } });
    // arches of the ground arcade and of the clerestory, as ribs
    for(let k=1;k<zs.length-2;k++) [-ix, ix].forEach(x => { const a = zs[k], b = zs[k+1]; rib(t => new THREE.Vector3(x, archY(a + (b-a)*t, a, b, 3.9, 2.9), a + (b-a)*t), 20, .2); });
    for(let i=1;i<4;i++) [-iz, iz].forEach(z => { const a = xs[i], b = xs[i+1]; rib(t => new THREE.Vector3(a + (b-a)*t, archY(a + (b-a)*t, a, b, 3.9, Math.min(2.9, (b-a)*.3)), z), 20, .2); });
    // ---- the piers: clustered shafts with carved capitals. On the walkway's edge they rise through it to the high vault
    const pier = (x, z, top, core, ns) => { const sh = top - .6 - .8;
      stoneP.push([new THREE.CylinderGeometry(core + .38, core + .5, .8, 8), M(x, .4, z)]); stoneP.push([new THREE.TorusGeometry(core + .22, .13, 6, 24), M(x, .86, z, Math.PI/2)]);
      stoneP.push([new THREE.CylinderGeometry(core, core, sh, 18), M(x, .8 + sh/2, z)]);
      for(let i=0;i<ns;i++){ const a = i/ns*TAU + Math.PI/ns; stoneP.push([new THREE.CylinderGeometry(.17, .17, sh, 10), M(x + Math.cos(a)*core, .8 + sh/2, z + Math.sin(a)*core)]); }
      [3.9, top].forEach(cy => { stoneP.push([new THREE.CylinderGeometry(core + .34, core + .14, .55, 18), M(x, cy - .6, z)]);
        for(let i=0;i<16;i++){ const a = i/16*TAU; stoneP.push([new THREE.SphereGeometry(.17, 7, 5), M(x + Math.cos(a)*(core + .27), cy - .64 + (i%2)*.08, z + Math.sin(a)*(core + .27), 0, -a, (i%2 ? .5 : -.5), 1, 1.7, .5)]); }
        stoneP.push([new THREE.CylinderGeometry(core + .46, core + .4, .24, 8), M(x, cy - .2, z)]); }); };
    for(let k=1;k<zs.length-1;k++) [-ix, ix].forEach(x => pier(x, zs[k], hs, .7, 8));
    for(let i=2;i<4;i++) [-iz, iz].forEach(z => pier(xs[i], z, hs, .7, 8));
    [[-cx,-cz],[cx,-cz],[-cx,cz],[cx,cz],[-cx,0]].forEach(([x,z]) => pier(x + Math.sign(x)*.25, z + (Math.abs(z) > 0 ? Math.sign(z)*.25 : 0), hs, .55, 6));
    for(let k=1;k<zs.length-1;k++) [-HX + .15, HX - .15].forEach(x => pier(x, zs[k], gs, .38, 4));
    for(let i=1;i<5;i++) [-HZ + .15, HZ - .15].forEach(z => pier(xs[i], z, gs, .38, 4));
    // ---- the walkway: a stone deck all round at the third-floor level, slate underfoot, a pierced parapet, and rooms off it
    const slate = floorTexture("slate", R); slate.wrapS = slate.wrapT = THREE.RepeatWrapping;
    const deck = (x0, x1, z0, z1, walk = true) => { stoneP.push([new THREE.BoxGeometry(x1 - x0, .6, z1 - z0), M((x0+x1)/2, gal - .3, (z0+z1)/2)]);
      if(walk){ const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); const uv = g.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i, uv.getX(i)*(x1-x0)/2, uv.getY(i)*(z1-z0)/2); walkP.push([g, M((x0+x1)/2, gal + .005, (z0+z1)/2, -Math.PI/2)]); } };
    deck(-HX, -ix, -HZ, HZ); deck(ix, HX, -HZ, HZ); deck(-ix, ix, iz, HZ); deck(-ix, ix, -HZ, -iz);
    for(let k=0;k<zs.length;k++) [-1, 1].forEach(sd => stoneP.push([new THREE.BoxGeometry(G.WD, .34, .3), M(sd*(ix + G.WD/2), gal - .75, zs[k])]));
    // the core's own balcony, and the two bridges across to the walkway
    deck(-cx - G.BW, cx + G.BW, cz, cz + G.BW); deck(-cx - G.BW, cx + G.BW, -cz - G.BW, -cz); deck(-cx - G.BW, -cx, -cz, cz); deck(cx, cx + G.BW, -cz, cz);
    for(let q=0;q<9;q++){ const a = q/8; [[-cx - G.BW + a*(2*cx + 2*G.BW), cz + G.BW],[-cx - G.BW + a*(2*cx + 2*G.BW), -cz - G.BW]].forEach(([x,z]) => stoneP.push([new THREE.BoxGeometry(.3, .7, .5), M(x, gal - .95, z - Math.sign(z)*.25)])); }
    G.bridges.forEach(b => { const x0 = b.s > 0 ? cx + G.BW : -ix, x1 = b.s > 0 ? ix : -cx - G.BW; deck(x0, x1, b.z - b.w/2, b.z + b.w/2);
      const a = Math.min(x0, x1), bb = Math.max(x0, x1); [b.z - b.w/2 + .02, b.z + b.w/2 - .02].forEach(z => quad((s, t) => { const x = a + (bb - a)*s, y0 = gal - 2.6 + 2*prof(x, a, bb), y = y0 + (gal - .6 - y0)*t; return [x, y, z, x/2.4, y/2.4]; }, 16, 2));
      rib(t => new THREE.Vector3(a + (bb - a)*t, gal - 2.6 + 2*prof(a + (bb - a)*t, a, bb) - .05, b.z), 16, .16); });
    // parapets of pierced quatrefoils, with gaps where the bridges and the turret land
    const qTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = "#cfc6b2"; g.fillRect(0, 0, w, h); g.globalCompositeOperation = "destination-out";
      for(let x=32; x<w; x+=64){ const y = h/2; for(let q=0;q<4;q++){ const a = q*Math.PI/2; g.beginPath(); g.arc(x + Math.cos(a)*11, y + Math.sin(a)*11, 11, 0, TAU); g.fill(); } }
      g.globalCompositeOperation = "source-over"; g.strokeStyle = "#9e9583"; g.lineWidth = 4; g.strokeRect(0, 0, w, h); });
    const parapet = (ax, az, bx, bz, gaps = []) => { const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax)/L, uz = (bz - az)/L; let segs = [[0, L]];
      gaps.forEach(([g0, g1]) => { segs = segs.flatMap(([s0, s1]) => g1 <= s0 || g0 >= s1 ? [[s0, s1]] : [[s0, g0], [g1, s1]].filter(([u, v]) => v - u > .3)); });
      segs.forEach(([s0, s1]) => { const l = s1 - s0, mx = ax + ux*(s0 + l/2), mz = az + uz*(s0 + l/2), yaw = Math.atan2(-uz, ux);
        [-.17, .17].forEach(o => { const g = new THREE.PlaneGeometry(l, .9); const uv = g.attributes.uv; for(let i=0;i<uv.count;i++) uv.setX(i, uv.getX(i)*l/1.6); traceP.push([g, M(mx - uz*o, gal + .55, mz + ux*o, 0, yaw)]); });
        stoneP.push([new THREE.BoxGeometry(l, .16, .6), M(mx, gal + 1.08, mz, 0, yaw)]); stoneP.push([new THREE.BoxGeometry(l, .14, .52), M(mx, gal + .07, mz, 0, yaw)]);
        for(let q=0; q<=Math.floor(l/1.6); q++){ const d = s0 + Math.min(l, q*1.6); stoneP.push([new THREE.BoxGeometry(.16, .9, .36), M(ax + ux*d, gal + .55, az + uz*d, 0, yaw)]); } }); };
    const bz0 = G.bridges[0], bz1 = G.bridges[1];
    parapet(-ix, -iz, -ix, iz, [[iz + bz0.z - bz0.w/2, iz + bz0.z + bz0.w/2]]); parapet(ix, -iz, ix, iz, [[iz + bz1.z - bz1.w/2, iz + bz1.z + bz1.w/2]]);
    parapet(-ix, iz, ix, iz); parapet(-ix, -iz, ix, -iz);
    const bx = cx + G.BW, bzz = cz + G.BW;
    parapet(-bx, bzz, bx, bzz); parapet(-bx, -bzz, bx, -bzz);
    parapet(-bx, -bzz, -bx, bzz, [[bzz + bz0.z - bz0.w/2, bzz + bz0.z + bz0.w/2]]); parapet(bx, -bzz, bx, bzz, [[bzz + G.tz - 1.3, bzz + G.tz + 1.3], [bzz + bz1.z - bz1.w/2, bzz + bz1.z + bz1.w/2]]);
    G.bridges.forEach(b => { const a = b.s > 0 ? bx : -ix, c2 = b.s > 0 ? ix : -bx; [b.z - b.w/2, b.z + b.w/2].forEach(z => parapet(a, z, c2, z)); });
    const trace = new THREE.Mesh(mergeGeoms(traceP), mat("#cfc6b2", {map:qTex, transparent:true, alphaTest:.5, side:THREE.DoubleSide})); trace.castShadow = true; trace.receiveShadow = true; scene.add(trace);
    const walk = new THREE.Mesh(mergeGeoms(walkP), mat("#ffffff", {map:slate, roughness:.7})); walk.receiveShadow = true; if(G.level === 1){ walk.userData.hit = {kind:"walk", label:"Walk here", onClick:()=>walkTo(lastHit)}; picks.push(walk); } scene.add(walk);
    // a string course above the walkway, and the wall-arches of the galleries
    [[-HX + .17, 0, .34, 2*HZ], [HX - .17, 0, .34, 2*HZ], [0, -HZ + .17, 2*HX, .34], [0, HZ - .17, 2*HX, .34]].forEach(([x, z, w, d]) => { stoneP.push([new THREE.BoxGeometry(w, .26, d), M(x, gal + 4.6, z)]); stoneP.push([new THREE.BoxGeometry(w, .3, d), M(x, gal - .45, z)]); });
    // ---- the core: the tower's footing, with the elevators behind tall iron gates front and back, and doorways onto the balcony
    const coreM = mat("#c4bba6"), gH = 5.5, gW = 2*cx - 3, rD = 2;
    stoneP.push([new THREE.BoxGeometry(2*cx, H, 2*cz - 2*rD), M(0, H/2, 0)]);
    [-1, 1].forEach(sd => { const zf = sd*cz; stoneP.push([new THREE.BoxGeometry(1.5, H, rD), M(-cx + .75, H/2, zf - sd*rD/2)]); stoneP.push([new THREE.BoxGeometry(1.5, H, rD), M(cx - .75, H/2, zf - sd*rD/2)]);
      stoneP.push([new THREE.BoxGeometry(gW, H - gH, rD), M(0, gH + (H - gH)/2, zf - sd*rD/2)]);
      // the lobby behind the gate: dark bronze doors with their dials, four to a side
      darkP.push([new THREE.PlaneGeometry(gW, gH), M(0, gH/2, zf - sd*rD + sd*.01, 0, sd > 0 ? 0 : Math.PI)]);
      for(let e=0;e<4;e++){ const ex = -gW/2 + (e + .5)*gW/4; bronzeP.push([new THREE.BoxGeometry(1.25, 2.5, .06), M(ex, 1.25, zf - sd*rD + sd*.05)]);
        bronzeP.push([new THREE.BoxGeometry(.03, 2.5, .08), M(ex, 1.25, zf - sd*rD + sd*.07)]); bronzeP.push([new THREE.BoxGeometry(1.5, .2, .1), M(ex, 2.6, zf - sd*rD + sd*.06)]);
        bronzeP.push([new THREE.CylinderGeometry(.34, .34, .06, 20, 1, false, -Math.PI/2, Math.PI), M(ex, 3.0, zf - sd*rD + sd*.05, Math.PI/2*sd, 0, 0)]);
        ironP.push([new THREE.BoxGeometry(.02, .3, .02), M(ex + Math.sin((e - 1.5)*.6)*.14, 3.0 + Math.cos((e - 1.5)*.6)*.14, zf - sd*rD + sd*.1, 0, 0, -(e - 1.5)*.6)]); }
      // the gate
      const gTex = canvasTex(512, 384, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = "#1c1916"; g.lineCap = "round";
        g.lineWidth = 9; g.strokeRect(5, 5, w - 10, h - 5); [w/4, w/2, 3*w/4].forEach(x => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); });
        g.lineWidth = 3.5; for(let x=18; x<w; x+=21){ g.beginPath(); g.moveTo(x, 10); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(x - 5, 22); g.lineTo(x, 6); g.lineTo(x + 5, 22); g.stroke(); }
        g.lineWidth = 5; [h*.3, h*.62].forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for(let x=10; x<w; x+=42){ g.beginPath(); g.arc(x + 10, y - 16, 12, Math.PI*.2, Math.PI*1.8); g.stroke(); g.beginPath(); g.arc(x + 31, y + 16, 12, Math.PI*1.2, Math.PI*2.8); g.stroke(); } });
        g.lineWidth = 4; for(let q=0;q<4;q++){ const x0 = q*w/4; g.beginPath(); g.moveTo(x0 + 8, h*.16); g.quadraticCurveTo(x0 + w/8, -h*.02, x0 + w/4 - 8, h*.16); g.stroke(); } });
      const gate = new THREE.Mesh(new THREE.PlaneGeometry(gW, gH), new THREE.MeshStandardMaterial({map:gTex, transparent:true, alphaTest:.4, side:THREE.DoubleSide, metalness:.55, roughness:.5}));
      gate.position.set(0, gH/2, zf + sd*.02); if(sd < 0) gate.rotation.y = Math.PI; gate.castShadow = true; scene.add(gate);
      const insc = canvasTex(1600, 110, (g, w, h) => { g.fillStyle = "#cfc6b2"; g.fillRect(0, 0, w, h); g.strokeStyle = "#8f8573"; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
        g.fillStyle = "#4a4236"; g.font = `50px ${FELLSC}`; g.textAlign = "center"; g.fillText("HERE IS ETERNAL SPRING · FOR YOU THE VERY STARS OF HEAVEN ARE NEW", w/2, 72); });
      const ip = new THREE.Mesh(new THREE.PlaneGeometry(gW + 1.2, .62), mat("#ffffff", {map:insc})); ip.position.set(0, gH + .55, zf + sd*.03); if(sd < 0) ip.rotation.y = Math.PI; scene.add(label(ip));
      stoneP.push([new THREE.BoxGeometry(gW + 1.6, .3, .3), M(0, gH + .02, zf + sd*.12)]);
      // the elevators: ride up to the gallery, or down
      // the elevator landing on the balcony
      darkP.push([new THREE.ShapeGeometry((() => { const sh = new THREE.Shape(); archPts2(2.2, 3.4, true, 10).forEach(([x,y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y)); return sh; })()), M(0, gal, zf + sd*.02, 0, sd > 0 ? 0 : Math.PI)]); });
    G.bridges.forEach(b => darkP.push([new THREE.ShapeGeometry((() => { const sh = new THREE.Shape(); archPts2(2, 3.2, true, 10).forEach(([x,y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y)); return sh; })()), M(b.s*(cx + .02), gal, b.z, 0, b.s*Math.PI/2)]));
    // ---- the turret stair, stone-lined, winding up beside the core to the balcony
    { const tx = G.tx, tz = G.tz, tr = G.tr, top = gal + 3.6, nP = 20, pw = TAU*tr/nP + .08;
      const seg = (a, y0, y1) => { if(y1 - y0 > .05) stoneP.push([new THREE.BoxGeometry(pw, y1 - y0, .5), M(tx + Math.cos(a)*tr, (y0 + y1)/2, tz + Math.sin(a)*tr, 0, -a + Math.PI/2)]); };
      for(let q=0;q<nP;q++){ const a = q/nP*TAU + Math.PI/nP, off = v => Math.abs(Math.atan2(Math.sin(a - v), Math.cos(a - v)));
        if(off(Math.PI/2) < .2){ seg(a, 3.1, top); continue; }                                  // the doorway, on the floor
        if(off(Math.PI) < .35){ seg(a, 0, gal); seg(a, gal + 3.1, top); continue; }              // where the stair lands on the balcony
        if(off(0) < .2 || off(-Math.PI/2) < .2 || off(-Math.PI/4 + .1) < .16){ seg(a, 0, 1.0); seg(a, gal - .4, top); continue; }   // tall openings onto the stair
        seg(a, 0, top); if(q % 3 === 0) for(let y=2.2; y<top - 1; y+=3.1) darkP.push([new THREE.PlaneGeometry(.16, .9), M(tx + Math.cos(a)*(tr + .26), y, tz + Math.sin(a)*(tr + .26), 0, -a + Math.PI/2)]); }
      stoneP.push([new THREE.CylinderGeometry(tr + .45, tr + .55, .5, 32), M(tx, .25, tz)]);
      [gal - .4, top].forEach(y => stoneP.push([new THREE.TorusGeometry(tr + .1, .2, 6, 40), M(tx, y, tz, Math.PI/2)]));
      stoneP.push([new THREE.CylinderGeometry(.42, .42, top, 14), M(tx, top/2, tz)]);
      const nT = Math.round(gal/.2); for(let i=0;i<nT;i++){ const a = Math.PI/2 + i*(TAU/18), y = (i + 1)*gal/nT; stoneP.push([new THREE.BoxGeometry(tr - .5, .16, .62), M(tx + Math.cos(a)*(tr/2), y - .08, tz + Math.sin(a)*(tr/2), 0, -a, 0)]); }
      stoneP.push([new THREE.ConeGeometry(tr + .6, 3.4, 14), M(tx, top + 1.7, tz)]); giltP.push([new THREE.SphereGeometry(.22, 10, 8), M(tx, top + 3.5, tz)]);
    }
    stoneP.push([new THREE.BoxGeometry(1.4, .6, 2.6), M(G.tx - G.tr - .3, gal - .3, G.tz)]); walkP.push([new THREE.PlaneGeometry(1.4, 2.6), M(G.tx - G.tr - .3, gal + .006, G.tz, -Math.PI/2)]);
    // ---- doors that are part of the fabric: the elevator gates, the turret's doorways
    p.doors.filter(d => d.fixture && G.fixtures[d.fixture]).forEach(d => { const f = G.fixtures[d.fixture], up = d.fixture === "turret-up" || (G.level === 1 && d.fixture.startsWith("lift")), y0 = up ? gal : 0;
      const w = d.fixture.startsWith("lift") ? (up ? 2.4 : 2*cx - 3) : 1.6, h = d.fixture.startsWith("lift") ? (up ? 3.4 : 5.5) : 3.0;
      const hb = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(f.nx) > .5 ? .4 : w, h, Math.abs(f.nx) > .5 ? w : .4), new THREE.MeshBasicMaterial({visible:false})); hb.position.set(f.x + f.nx*.25, y0 + h/2, f.z + f.nz*.25);
      const at = new THREE.Vector3(f.x + f.nx*.8, y0, f.z + f.nz*.8), go = d.onClick;
      hb.userData.hit = {kind:"door", label: d.label + (d.name ? " · " + d.name : "") + (d.title ? " · " + d.title : ""), onClick: () => approach(at, go)}; scene.add(hb); picks.push(hb); });
    // ---- the enormous fireplace, at the far end
    { const z = -HZ, fw = 6.4, fh = 3.2;
      stoneP.push([new THREE.BoxGeometry(fw + 2.4, .3, 2.2), M(0, .15, z + 1.1)]);
      [-1, 1].forEach(sd => { stoneP.push([new THREE.BoxGeometry(1.1, fh + .4, 1.3), M(sd*(fw/2 + .55), (fh + .4)/2, z + .65)]); stoneP.push([new THREE.BoxGeometry(.5, .5, .5), M(sd*(fw/2 + .55), fh + .65, z + 1.2)]); });
      stoneP.push([new THREE.BoxGeometry(fw + 2.6, .7, 1.4), M(0, fh + .55, z + .7)]); stoneP.push([new THREE.BoxGeometry(fw + 3, .2, 1.6), M(0, fh + 1.0, z + .8)]);
      const hood = new THREE.CylinderGeometry(.72, 1, 1, 4, 1, false, Math.PI/4); stoneP.push([hood, M(0, fh + 1.1 + (gal - .9 - fh - 1.1)/2, z + .55, 0, 0, 0, (fw + 1.6)/Math.SQRT2, gal - .9 - fh - 1.1, 1.0/Math.SQRT2*1.1)]);
      darkP.push([new THREE.PlaneGeometry(fw, fh), M(0, fh/2, z + .05)]);
      for(let i=0;i<4;i++) oakP.push([new THREE.CylinderGeometry(.16, .18, 2.2, 8), M((i - 1.5)*.5, .45 + (i%2)*.18, z + 1.0, 0, (i%2 ? .3 : -.3), Math.PI/2)]);
      ironP.push([new THREE.BoxGeometry(3, .12, .12), M(0, .35, z + 1.4)]);
      // the flames: soft sprites, each flickering on its own
      const flameTex = canvasTex(64, 128, (g, w, h) => { const gr = g.createRadialGradient(w/2, h*.72, 2, w/2, h*.62, h*.55); gr.addColorStop(0, "rgba(255,250,215,1)"); gr.addColorStop(.25, "rgba(255,196,90,.9)"); gr.addColorStop(.6, "rgba(230,98,24,.45)"); gr.addColorStop(1, "rgba(120,30,0,0)");
        g.fillStyle = gr; g.beginPath(); g.moveTo(w/2, 0); g.bezierCurveTo(w*.95, h*.45, w*.92, h*.92, w/2, h); g.bezierCurveTo(w*.08, h*.92, w*.05, h*.45, w/2, 0); g.fill(); });
      const fl = new THREE.Group(), fm = new THREE.SpriteMaterial({map:flameTex, blending:THREE.AdditiveBlending, depthWrite:false, transparent:true, color:"#ffd9a0"});
      for(let i=0;i<16;i++){ const sp = new THREE.Sprite(fm); const s0 = .45 + R()*.55; sp.userData = {x:(R() - .5)*2.4, s0, ph:R()*10, sp:4 + R()*5}; sp.scale.set(s0*.6, s0*1.3, 1); sp.position.set(sp.userData.x, .7 + s0*.5, z + 1.0 + (R() - .5)*.4); fl.add(sp); }
      const ember = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .7), new THREE.MeshBasicMaterial({color:"#ff6a1a", transparent:true, opacity:.55, blending:THREE.AdditiveBlending, depthWrite:false})); ember.rotation.x = -Math.PI/2; ember.position.set(0, .34, z + 1.0); fl.add(ember);
      scene.add(fl);
      const fire = new THREE.PointLight("#ff9a4a", lowered ? 360 : 240, 0, 2); fire.position.set(0, 1.4, z + 2.2); if(photo){ fire.castShadow = true; fire.shadow.mapSize.set(512, 512); fire.shadow.bias = -.002; } scene.add(fire);
      anims.push(t => { fl.children.forEach(c => { const u = c.userData; if(!u || u.s0 == null) return; const f = .75 + .35*Math.sin(t*u.sp + u.ph)*Math.sin(t*u.sp*.43 + u.ph*2); c.scale.set(u.s0*.6*(1.1 - .2*f), u.s0*1.3*f, 1); c.position.x = u.x + .05*Math.sin(t*3 + u.ph); c.position.y = .7 + u.s0*.5*f; }); fire.intensity = (lowered ? 360 : 240)*(.85 + .15*Math.sin(t*9.3)*Math.sin(t*4.1 + 1)); }); }
    // ---- the great windows over both ends, above the walkway
    const glassTex = (w0, h0, seed) => canvasTex(512, 512*h0/w0, (g, w, h) => { const RR = rng(seed); g.fillStyle = "#2a2622"; g.fillRect(0, 0, w, h);
      const lights = 7, lw = w/lights, tr = h*.4; const pal = ["#e9d9a8","#efe2bd","#dcd2a6","#d6e0c8","#e7d3a0"], jewel = ["#2f4f8f","#8e2f2a","#3e6b3a","#b07a24","#5a3a7a"];
      for(let i=0;i<lights;i++) for(let y=tr; y<h; y+=h*.12){ const x0 = i*lw + 5, x1 = (i+1)*lw - 5; g.fillStyle = pal[Math.floor(RR()*pal.length)]; g.fillRect(x0, y + 4, x1 - x0, h*.12 - 8);
        g.strokeStyle = "rgba(60,50,40,.5)"; g.lineWidth = 1.2; for(let d=-lw; d<lw*2; d+=13){ g.beginPath(); g.moveTo(x0 + d, y + 4); g.lineTo(x0 + d + 24, y + h*.12 - 4); g.stroke(); g.beginPath(); g.moveTo(x0 + d + 24, y + 4); g.lineTo(x0 + d, y + h*.12 - 4); g.stroke(); }
        if(RR() < .4){ g.fillStyle = jewel[Math.floor(RR()*jewel.length)]; g.beginPath(); g.ellipse((x0+x1)/2, y + h*.06, (x1-x0)*.28, h*.035, 0, 0, TAU); g.fill(); } }
      for(let r=0;r<4;r++) for(let i=0;i<lights*2;i++){ const x0 = i*lw/2 + 3, y0 = tr*(r/4) + 3; g.fillStyle = (i + r)%3 ? "#e3d7b0" : jewel[(i + r)%jewel.length]; g.beginPath(); g.moveTo(x0, y0 + tr/4 - 6); g.lineTo(x0, y0 + 12); g.quadraticCurveTo(x0 + lw/4 - 3, y0 - 5, x0 + lw/2 - 6, y0 + 12); g.lineTo(x0 + lw/2 - 6, y0 + tr/4 - 6); g.closePath(); g.fill(); }
      g.strokeStyle = "#2a2622"; g.lineWidth = 8; for(let i=1;i<lights;i++){ g.beginPath(); g.moveTo(i*lw, 0); g.lineTo(i*lw, h); g.stroke(); } [tr, tr + (h - tr)/2].forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }); });
    const outside = p.band === "night" ? "#2a2c38" : p.band === "dusk" || p.band === "dawn" ? "#d8b08a" : "#ffffff";
    const bigWindow = (z, dir, y0, w, h, seed) => { const sh = new THREE.Shape(); archPts2(w, h, true, 16).forEach(([x,y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y));
      const geo = new THREE.ShapeGeometry(sh); const uv = geo.attributes.uv, P = geo.attributes.position; for(let i=0;i<uv.count;i++) uv.setXY(i, (P.getX(i) + w/2)/w, P.getY(i)/h);
      const win = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:"#000000", emissive:outside, emissiveMap:glassTex(w, h, seed), roughness:1})); win.position.set(0, y0, z + dir*.03); win.rotation.y = dir > 0 ? 0 : Math.PI; scene.add(win);
      tube(archPts(w + .3, h + .15, true, 18).map(([x,y]) => new THREE.Vector3(x, y + y0, z + dir*.08)), .22, stoneP);
      for(let q=1;q<7;q++){ const x = -w/2 + q*w/7; stoneP.push([new THREE.BoxGeometry(.16, h*.9, .16), M(x, y0 + h*.45, z + dir*.1)]); }
      // a shaft of daylight, in the photographic view
      if(photo && p.band === "day" && !p.overcast){ const sTex = canvasTex(64, 256, (g, ww, hh) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, "rgba(255,240,205,.55)"); gr.addColorStop(1, "rgba(255,240,205,0)"); g.fillStyle = gr; g.fillRect(0, 0, ww, hh); });
        const shaft = new THREE.Mesh(new THREE.PlaneGeometry(w*.8, 22), new THREE.MeshBasicMaterial({map:sTex, transparent:true, opacity: dark ? .16 : .1, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}));
        shaft.position.set(0, y0 + h*.5 - 7, z + dir*7.5); shaft.rotation.x = dir*.62; scene.add(shaft); } };
    bigWindow(-HZ, 1, gal + 1.4, Math.min(13, HX*.6), H - gal - 2.2, 11); bigWindow(HZ, -1, gal + 1.4, Math.min(13, HX*.6), H - gal - 2.2, 23);
    // ---- the lanterns, one on a long chain from the boss of every bay round the core
    const lanTex = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w/2, h/2, 10, w/2, h/2, w*.7); gr.addColorStop(0, "#fff3c4"); gr.addColorStop(1, "#e2a24a"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#1e1a16"; g.lineWidth = 9; for(let x=0; x<=w; x+=w/4){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } g.lineWidth = 5; [h*.33, h*.66].forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }); });
    const lights = [];
    cells.filter(c => !c.outer).forEach((c, n) => { const x = (c.x0 + c.x1)/2, z = (c.z0 + c.z1)/2, top = c.hs + c.rise - .3, ly = 6.4;
      ironP.push([new THREE.CylinderGeometry(.035, .035, top - (ly + .95), 5), M(x, (top + ly + .95)/2, z)]);
      glowP.push([new THREE.CylinderGeometry(.5, .4, 1.3, 8, 1, true), M(x, ly, z)]);
      ironP.push([new THREE.ConeGeometry(.66, .55, 8), M(x, ly + .92, z)]); ironP.push([new THREE.SphereGeometry(.1, 8, 6), M(x, ly + 1.25, z)]);
      ironP.push([new THREE.ConeGeometry(.42, .5, 8), M(x, ly - .9, z, Math.PI)]); ironP.push([new THREE.TorusGeometry(.56, .045, 5, 16), M(x, ly + .64, z, Math.PI/2)]); ironP.push([new THREE.TorusGeometry(.44, .045, 5, 16), M(x, ly - .64, z, Math.PI/2)]);
      if(n % 2 === 0) lights.push(new THREE.Vector3(x, ly, z)); });
    
    const glow = new THREE.Mesh(mergeGeoms(glowP), new THREE.MeshStandardMaterial({color:"#000000", emissive: dark ? "#c99b5c" : "#ffe7b8", emissiveMap:lanTex, side:THREE.DoubleSide, roughness:1})); scene.add(glow);
    lights.slice(0, 8).forEach(v => { const pl = new THREE.PointLight("#ffc879", 150*lampK, 0, 2); pl.position.copy(v); scene.add(pl); });
    // ---- the tables: long oak study tables with their chairs, in the bays before and behind the core
    const table = (x, z) => { const L = 4.6, W2 = 1.15;
      oakP.push([new THREE.BoxGeometry(W2, .09, L), M(x, .78, z)]);
      [-1, 1].forEach(e => { oakP.push([new THREE.BoxGeometry(W2*.8, .66, .12), M(x, .4, z + e*(L/2 - .4))]); oakP.push([new THREE.BoxGeometry(W2*.95, .1, .5), M(x, .05, z + e*(L/2 - .4))]); });
      oakP.push([new THREE.BoxGeometry(.1, .14, L - .9), M(x, .3, z)]);
      for(let i=0;i<4;i++){ const cz2 = z - L/2 + (i + .5)*L/4; [-1, 1].forEach(sd => { const cxx = x + sd*(W2/2 + .38);
        oakP.push([new THREE.BoxGeometry(.48, .06, .46), M(cxx, .46, cz2)]); oakP.push([new THREE.BoxGeometry(.06, .6, .44), M(cxx + sd*.22, .78, cz2)]);
        [[-.2,-.19],[.2,-.19],[-.2,.19],[.2,.19]].forEach(([a, b]) => oakP.push([new THREE.BoxGeometry(.05, .45, .05), M(cxx + a, .225, cz2 + b)])); }); } };
    [-1, 1].forEach(sd => [-12.5, -5, 5, 12.5].forEach(x => [cz + 6, cz + 12].forEach(z => { if(sd > 0 || Math.abs(x) > 3) table(x, sd*z); })));
    [-1].forEach(sd => [-4, 4].forEach(z => table(sd*(cx + 5.5), z)));
    // ---- all of it, merged by material
    const add = (parts, m, shadow, wuv) => { if(!parts.length) return; const mesh = new THREE.Mesh(mergeGeoms(parts, wuv), m); mesh.castShadow = shadow; mesh.receiveShadow = true; scene.add(mesh); return mesh; };
    add(stoneP, mat("#c8bea9"), true, true); add(ribP, mat("#b9ae98"), photo); add(oakP, mat("#4f3d2c"), true); add(ironP, mat("#2a2622", {metalness:.6, roughness:.5}), true);
    add(giltP, mat("#c9a35a", {metalness:.7, roughness:.35}), false); add(bronzeP, mat("#6b5232", {metalness:.85, roughness:.32}), true); add(darkP, new THREE.MeshBasicMaterial({color:"#120e0b", side:THREE.DoubleSide}), false);
    // ---- the light: the real room is dark. By the clock, it is dim; with the lamps turned down, darker; with every lamp lit, bright
    scene.traverse(o => { if(o.isHemisphereLight) o.intensity *= lowered ? .04 : bright ? .8 : dayAuto ? .42 : .08; else if(o.isDirectionalLight && !o.castShadow) o.intensity *= lowered ? .03 : bright ? .8 : dayAuto ? .3 : .05; });
    p.envK = lowered ? .03 : bright ? .45 : dayAuto ? .18 : .06;
    p.hallFog = dark ? new THREE.Fog("#0a0907", 26, 75) : null;
  }
  /* ---- the view from the top of the tower: a panorama of the land, in the light of the hour ---- */
  function panoramaTex(p, withSky){
    return canvasTex(2048, 512, (g, w, h) => { const RR = rng(41), night = p.band === "night", dusk = p.band === "dusk" || p.band === "dawn", hz = h*.56;
      if(withSky){ g.clearRect(0, 0, w, h); } else { const gr = g.createLinearGradient(0, 0, 0, hz); gr.addColorStop(0, night ? "#0a0f1c" : dusk ? "#5a6b8f" : "#7fa3c7"); gr.addColorStop(1, night ? "#1d2436" : dusk ? "#e8b48a" : "#d9e4ea"); g.fillStyle = gr; g.fillRect(0, 0, w, hz + 2);
        if(night) for(let i=0;i<260;i++){ g.fillStyle = `rgba(255,250,235,${.3 + RR()*.7})`; g.fillRect(RR()*w, RR()*hz*.9, 1.4, 1.4); }
        else if(p.wxKind !== "clear") for(let i=0;i<22;i++){ const x = RR()*w, y = RR()*hz*.7; g.fillStyle = dusk ? "rgba(240,200,180,.5)" : "rgba(250,250,248,.75)"; for(let k=0;k<4;k++){ g.beginPath(); g.ellipse(x + k*30, y + (k%2)*6, 46, 16, 0, 0, TAU); g.fill(); } } }
      // far hills, nearer hills, the river, the town
      const ridge = (y0, amp, col, f) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, h); for(let x=0; x<=w; x+=8){ const y = y0 - amp*(.5 + .5*Math.sin(x*f + 1.3)*Math.sin(x*f*2.7 + 4) + .25*Math.sin(x*f*7.1)); g.lineTo(x, y); } g.lineTo(w, h); g.closePath(); g.fill(); };
      ridge(hz + 4, 14, night ? "#141822" : dusk ? "#6c6a7c" : "#9fb0b8", .004); ridge(hz + 16, 18, night ? "#10131a" : dusk ? "#56604f" : "#7f9378", .007);
      g.fillStyle = night ? "#0c0f14" : dusk ? "#4c5a3f" : "#6f8a5c"; g.fillRect(0, hz + 22, w, h);
      for(let i=0;i<900;i++){ g.fillStyle = night ? "rgba(20,24,20,.6)" : `rgba(${60 + RR()*40},${80 + RR()*40},${45 + RR()*30},.5)`; g.fillRect(RR()*w, hz + 24 + RR()*(h - hz), 6 + RR()*20, 2 + RR()*4); }
      g.strokeStyle = night ? "#1d2533" : dusk ? "#c9a58a" : "#a9c3d2"; g.lineWidth = 9; g.beginPath(); g.moveTo(0, hz + 60); for(let x=0; x<=w; x+=16) g.lineTo(x, hz + 48 + 30*Math.sin(x*.004) + 12*Math.sin(x*.013)); g.stroke();
      for(let b=0; b<4; b++){ const x0 = RR()*w; for(let i=0;i<70;i++){ const x = x0 + (RR() - .5)*260, y = hz + 26 + RR()*50, bw = 4 + RR()*10, bh = 3 + RR()*9;
        g.fillStyle = night ? "#0e1015" : dusk ? "#7d6a5e" : "#b8aa98"; g.fillRect(x, y - bh, bw, bh); if(night && RR() < .7){ g.fillStyle = RR() < .8 ? "#ffd27a" : "#fff3c4"; g.fillRect(x + RR()*bw, y - RR()*bh, 1.6, 1.6); } } }
      if(night) for(let i=0;i<400;i++){ g.fillStyle = "rgba(255,210,120,.8)"; g.fillRect(RR()*w, hz + 28 + RR()*(h - hz - 30), 1.3, 1.3); }
      if(p.wxKind === "fog"){ g.fillStyle = "rgba(220,222,220,.7)"; g.fillRect(0, hz - 30, w, h); } });
  }
  function buildPanorama(p, r, withSky){ const tex = panoramaTex(p, withSky); tex.wrapS = THREE.RepeatWrapping; const geo = new THREE.CylinderGeometry(r, r, r*1.2, 64, 1, true);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({map:tex, side:THREE.BackSide, transparent: !!withSky, depthWrite: !withSky, fog:false})); m.position.y = EYE - r*.008 + .06*r*1.2; m.layers.set(1); m.renderOrder = -5; scene.add(m);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({color: p.band === "night" ? "#0b0d10" : "#62794f", fog:false})); ground.rotation.x = -Math.PI/2; ground.position.y = EYE - r*.008 - .44*r*1.2 - .5; ground.layers.set(1); scene.add(ground); }
  /* ---- the observatory on the roof: a round house, a dome with its slit open, and the telescope ---- */
  function buildObservatory(p){ const g = new THREE.Group(), R2 = 3.4, Hh = 3.0, stone = mat("#c8bea9"), copper = mat("#7a9a8a", {metalness:.4, roughness:.55});
    for(let q=0;q<24;q++){ const a = q/24*TAU; if(Math.abs(Math.atan2(Math.sin(a - Math.PI/2), Math.cos(a - Math.PI/2))) < .3) continue; const b = new THREE.Mesh(new THREE.BoxGeometry(TAU*R2/24 + .05, Hh, .35), stone); b.position.set(Math.cos(a)*R2, Hh/2, Math.sin(a)*R2); b.rotation.y = -a + Math.PI/2; g.add(b); }
    const lint = new THREE.Mesh(new THREE.BoxGeometry(1.9, .5, .4), stone); lint.position.set(0, Hh - .25, R2); g.add(lint);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R2 + .05, .14, 6, 48), stone); ring.rotation.x = Math.PI/2; ring.position.y = Hh; g.add(ring);
    const slit = .55, az0 = Math.PI*.15;   // the dome, with a slit from the horizon over the top, turned toward the south
    [[0, Math.PI - slit/2], [Math.PI + slit/2, Math.PI - slit/2]].forEach(([s0, len]) => { const d = new THREE.Mesh(new THREE.SphereGeometry(R2 + .1, 40, 20, s0 + az0, len, 0, Math.PI/2), copper); d.material.side = THREE.DoubleSide; d.position.y = Hh; g.add(d); });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R2, 40), mat("#8f8573")); floor.rotation.x = -Math.PI/2; floor.position.y = .02; g.add(floor);
    // the telescope: a pier, an equatorial mount tipped to the latitude, and a long brass refractor pointed up through the slit
    const brass = mat("#b8955a", {metalness:.8, roughness:.3}), iron = mat("#2a2622", {metalness:.6, roughness:.5}), lat = (p.lat || 44)*DEG, tg = new THREE.Group();
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(.28, .38, 1.3, 16), iron); pier.position.y = .65; tg.add(pier);
    const axis = new THREE.Group(); axis.position.y = 1.35; axis.rotation.x = -(Math.PI/2 - lat); tg.add(axis);
    const pol = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .7, 12), iron); axis.add(pol);
    const tube = new THREE.Group(); tube.position.y = .42; tube.rotation.x = .9; axis.add(tube);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.11, .13, 2.6, 24), brass); body.rotation.z = Math.PI/2; tube.add(body);
    const dew = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .5, 24), brass); dew.rotation.z = Math.PI/2; dew.position.x = 1.3; tube.add(dew);
    const ep = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .25, 12), iron); ep.position.set(-1.35, .08, 0); tube.add(ep);
    const fs = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .7, 12), brass); fs.rotation.z = Math.PI/2; fs.position.set(-.3, .2, 0); tube.add(fs);
    const cw = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .22, 16), iron); cw.position.set(0, -.55, 0); tube.add(cw);
    tg.rotation.y = Math.PI*.15; g.add(tg); g.traverse(o => { if(o.isMesh){ o.castShadow = true; o.receiveShadow = true; } }); scene.add(g);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 3.2, 12), new THREE.MeshBasicMaterial({visible:false})); hit.position.set(0, 1.6, 0);
    hit.userData.hit = {kind:"look", label:"The telescope: look through it", onClick:() => hooks.telescope && hooks.telescope()}; scene.add(hit); picks.push(hit);
    const ob = new THREE.PointLight("#ff8a5a", 4, 6, 2); ob.position.set(0, 2.2, 0); scene.add(ob); }
  /* ---- the map table: the land below, from OpenStreetMap ---- */
  function buildMapTable(p){ const W2 = 3.2, D2 = 2.2, z = 14, lat = p.lat || 44.26, lon = p.lon || -88.41, n = Math.pow(2, z), xt = (lon + 180)/360*n, yt = (1 - Math.log(Math.tan(lat*DEG) + 1/Math.cos(lat*DEG))/Math.PI)/2*n;
    const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 704; const g = cv.getContext("2d"); g.fillStyle = "#e8dcc0"; g.fillRect(0, 0, cv.width, cv.height);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const x0 = Math.floor(xt) - 2, y0 = Math.floor(yt) - 1, ox = (xt - x0)*256 - 512, oy = (yt - y0)*256 - 352;
    const finish = () => { g.save(); g.globalCompositeOperation = "multiply"; g.fillStyle = "#efdcb3"; g.fillRect(0, 0, cv.width, cv.height); g.restore();
      g.strokeStyle = "#8c3f2f"; g.lineWidth = 4; g.beginPath(); g.arc(512, 352, 10, 0, TAU); g.stroke(); g.fillStyle = "#3a2c1c"; g.font = "18px Georgia, serif"; g.fillText("© OpenStreetMap contributors", 12, cv.height - 12); tex.needsUpdate = true; dirty = 3; };
    let left = 0; for(let i=0;i<5;i++) for(let j=0;j<4;j++){ left++; const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => { g.drawImage(im, i*256 - ox, j*256 - oy); tex.needsUpdate = true; dirty = 3; if(--left === 0) finish(); }; im.onerror = () => { if(--left === 0) finish(); };
      im.src = `https://tile.openstreetmap.org/${z}/${x0 + i}/${y0 + j}.png`; }
    const top = new THREE.Mesh(new THREE.PlaneGeometry(W2, D2), new THREE.MeshStandardMaterial({map:tex, roughness:.85})); top.rotation.x = -Math.PI/2; top.position.y = .9; scene.add(top);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(W2 + .2, .1, D2 + .2), mat("#5e4632")); frame.position.y = .84; scene.add(frame);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(.12, .84, .12), mat("#5e4632")); leg.position.set(a*(W2/2 - .1), .42, b*(D2/2 - .1)); scene.add(leg); });
    const hit = new THREE.Mesh(new THREE.BoxGeometry(W2, .3, D2), new THREE.MeshBasicMaterial({visible:false})); hit.position.y = .95; hit.userData.hit = {kind:"look", label:"The map table: look closer", onClick:() => hooks.mapRoom && hooks.mapRoom()}; scene.add(hit); picks.push(hit); }
  /* ---- the weather station: the real instruments, reading the real weather ---- */
  function buildWeatherStation(p, faces){ const wx = p.wxRaw || {}, brass = mat("#b8955a", {metalness:.8, roughness:.3}), wood = mat("#5e4632");
    const dial = (title, val, lo, hi, unit, x, z, ry, y = 1.7) => { const tex = canvasTex(512, 512, (g, w, h) => { g.translate(w/2, h/2); g.fillStyle = "#efe6cf"; g.beginPath(); g.arc(0, 0, 240, 0, TAU); g.fill(); g.strokeStyle = "#2b2016"; g.lineWidth = 6; g.stroke();
        for(let i=0;i<=40;i++){ const a = -Math.PI*1.25 + i/40*Math.PI*1.5; g.lineWidth = i%5 ? 2 : 4; g.beginPath(); g.moveTo(Math.cos(a)*(i%5 ? 196 : 184), Math.sin(a)*(i%5 ? 196 : 184)); g.lineTo(Math.cos(a)*214, Math.sin(a)*214); g.stroke();
          if(!(i%10)){ g.fillStyle = "#2b2016"; g.font = "30px Georgia, serif"; g.textAlign = "center"; g.fillText(String(Math.round(lo + (hi - lo)*i/40)), Math.cos(a)*150, Math.sin(a)*150 + 10); } }
        g.font = "italic 34px Georgia, serif"; g.textAlign = "center"; g.fillText(title, 0, 90); g.font = "26px Georgia, serif"; g.fillText(val == null ? "—" : `${(+val).toFixed(unit === "in" ? 2 : 0)} ${unit}`, 0, 130);
        if(val != null){ const a = -Math.PI*1.25 + Math.max(0, Math.min(1, (val - lo)/(hi - lo)))*Math.PI*1.5; g.strokeStyle = "#8c3f2f"; g.lineWidth = 8; g.beginPath(); g.moveTo(-Math.cos(a)*30, -Math.sin(a)*30); g.lineTo(Math.cos(a)*190, Math.sin(a)*190); g.stroke(); }
        g.fillStyle = "#2b2016"; g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill(); });
      const grp = new THREE.Group(); const face = new THREE.Mesh(new THREE.CircleGeometry(.36, 40), new THREE.MeshStandardMaterial({map:tex, roughness:.6})); face.position.z = .06; grp.add(face);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(.37, .04, 8, 40), brass); rim.position.z = .06; grp.add(rim); const back = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .1, 40), wood); back.rotation.x = Math.PI/2; grp.add(back);
      grp.position.set(x, y, z); grp.rotation.y = ry; scene.add(grp); };
    const hw = (p.room.size || 10)/2 - .08;
    dial("Barometer", wx.surface_pressure != null ? wx.surface_pressure*0.02953 : null, 28.5, 31, "in", -1.2, -hw, 0);
    dial("Hygrometer", wx.relative_humidity_2m, 0, 100, "%", 1.2, -hw, 0);
    dial("Anemometer", wx.wind_speed_10m, 0, 50, "mph", -hw, -1.2, Math.PI/2);
    dial("Rain", wx.precipitation, 0, 1, "in", -hw, 1.2, Math.PI/2);
    // the wind vane's repeater: a compass card and an arrow
    { const tex = canvasTex(512, 512, (g, w, h) => { g.translate(w/2, h/2); g.fillStyle = "#efe6cf"; g.beginPath(); g.arc(0, 0, 240, 0, TAU); g.fill(); g.strokeStyle = "#2b2016"; g.lineWidth = 6; g.stroke(); g.fillStyle = "#2b2016"; g.font = "40px Georgia, serif"; g.textAlign = "center";
        ["N","E","S","W"].forEach((L, k) => { const a = k*Math.PI/2 - Math.PI/2; g.fillText(L, Math.cos(a)*190, Math.sin(a)*190 + 14); }); g.font = "italic 30px Georgia, serif"; g.fillText("Wind from", 0, 120);
        if(wx.wind_direction_10m != null){ const a = wx.wind_direction_10m*DEG - Math.PI/2; g.strokeStyle = "#8c3f2f"; g.lineWidth = 12; g.beginPath(); g.moveTo(Math.cos(a)*150, Math.sin(a)*150); g.lineTo(-Math.cos(a)*120, -Math.sin(a)*120); g.stroke(); g.fillStyle = "#8c3f2f"; g.beginPath(); g.moveTo(-Math.cos(a)*150, -Math.sin(a)*150); g.lineTo(-Math.cos(a + .25)*100, -Math.sin(a + .25)*100); g.lineTo(-Math.cos(a - .25)*100, -Math.sin(a - .25)*100); g.fill(); } });
      const f = new THREE.Mesh(new THREE.CircleGeometry(.5, 40), new THREE.MeshStandardMaterial({map:tex, roughness:.6})); f.position.set(hw - .03, 1.8, 0); f.rotation.y = -Math.PI/2; scene.add(f); const r = new THREE.Mesh(new THREE.TorusGeometry(.51, .05, 8, 40), brass); r.position.copy(f.position); r.rotation.y = -Math.PI/2; scene.add(r); }
    // the thermometer: a tall glass tube with its red column at the real temperature
    { const T = wx.temperature_2m, x = 1.6, z = -hw + .12, board = new THREE.Mesh(new THREE.BoxGeometry(.3, 1.6, .05), wood); board.position.set(x + 1.2, 1.5, z); scene.add(board);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1.3, 12), new THREE.MeshStandardMaterial({color:"#e8f0f2", transparent:true, opacity:.35})); tube.position.set(x + 1.2, 1.5, z + .05); scene.add(tube);
      const k = T == null ? .5 : Math.max(.02, Math.min(1, (T + 20)/130)), col = new THREE.Mesh(new THREE.CylinderGeometry(.013, .013, 1.25*k, 8), mat("#b0302a")); col.position.set(x + 1.2, 1.5 - .625 + .625*k, z + .05); scene.add(col);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.04, 12, 8), mat("#b0302a")); bulb.position.set(x + 1.2, .83, z + .05); scene.add(bulb); }
    // the rain gauge on a stand, and the barograph's drum turning on the table
    { const stand = new THREE.Mesh(new THREE.CylinderGeometry(.2, .25, .9, 16), wood); stand.position.set(-2.5, .45, 2.5); scene.add(stand); const gauge = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .5, 24), new THREE.MeshStandardMaterial({color:"#dfe9ec", transparent:true, opacity:.45, roughness:.1})); gauge.position.set(-2.5, 1.15, 2.5); scene.add(gauge);
      const tbl = new THREE.Mesh(new THREE.BoxGeometry(1.6, .08, .8), wood); tbl.position.set(2.2, .85, 2.4); scene.add(tbl); const drum = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .3, 24), mat("#efe6cf")); drum.position.set(2.2, 1.06, 2.4); scene.add(drum); anims.push(t => { drum.rotation.y = t*.02; }); }
    const hit = new THREE.Mesh(new THREE.BoxGeometry(2*hw, 2.4, 2*hw), new THREE.MeshBasicMaterial({visible:false})); hit.position.y = 1.4; hit.scale.set(.5, 1, .5); hit.userData.hit = {kind:"look", label:"The instruments: read the week's record", onClick:() => hooks.weatherStation && hooks.weatherStation()}; scene.add(hit); picks.push(hit); }
  /* ---- armchairs round a low table, for the lounge ---- */
  function buildLounge(){ const leather = mat("#6e3a28"), wood = mat("#4a3b2e");
    [[-1.6,-1.2,.5],[1.6,-1.2,-.5],[-1.6,1.4,2.6],[1.6,1.4,-2.6]].forEach(([x, z, ry]) => { const g = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(.9, .22, .85), leather); seat.position.y = .45; g.add(seat); const back = new THREE.Mesh(new THREE.BoxGeometry(.9, .8, .2), leather); back.position.set(0, .85, .4); back.rotation.x = -.12; g.add(back);
      [-1, 1].forEach(s => { const arm = new THREE.Mesh(new THREE.BoxGeometry(.16, .32, .85), leather); arm.position.set(s*.48, .65, 0); g.add(arm); }); [[-.38,-.36],[.38,-.36],[-.38,.36],[.38,.36]].forEach(([a, b]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(.06, .34, .06), wood); l.position.set(a, .17, b); g.add(l); });
      place(g, x, z, ry); });
    const tbl = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .06, 32), wood); tbl.position.y = .48; const leg = new THREE.Mesh(new THREE.CylinderGeometry(.08, .2, .46, 12), wood); leg.position.y = .23; const tg = new THREE.Group(); tg.add(tbl); tg.add(leg); place(tg, 0, .1);
    [[-2.6,-2.4],[2.6,2.6]].forEach(([x, z]) => { const lg = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.5, 8), mat("#2a2622", {metalness:.6})); st.position.y = .75; lg.add(st);
      const sh = new THREE.Mesh(new THREE.ConeGeometry(.28, .3, 20, 1, true), mat("#e8d6a8", {side:THREE.DoubleSide})); sh.position.y = 1.55; lg.add(sh); place(lg, x, z); const pl = new THREE.PointLight("#ffd9a0", 10, 0, 2); pl.position.set(x, 1.45, z); scene.add(pl); }); }
  /* ---- the turret stair: a stone-lined well, with a landing and a door at every floor, and the stair winding between ---- */
  const STAIR = {R:3.3, newel:.45, walkR:1.6, half:.75};
  function stairTurns(dy){ return Math.max(1, Math.round(Math.abs(dy)/4.3)); }
  function stairStand(p, k){ const L = p.room.landings[k] || {y:0}; return new THREE.Vector3(STAIR.walkR, L.y + EYE, 0); }
  function stairTransit(p, from, to){ const Ls = p.room.landings, dir = Math.sign(to - from); walking = true; let seq = []; for(let k = from; k !== to; k += dir) seq.push([k, k + dir]);
    let seg = 0, t0 = performance.now(), stepT = 0;
    const fn = () => { if(seg >= seq.length){ const i = anims.indexOf(fn); if(i >= 0) anims.splice(i, 1); walking = false; goal.yaw = Math.atan2(-Math.cos(.75), -Math.sin(.75)); goal.pitch = 0; return; }
      const [a, b] = seq[seg], lo = Math.min(a, b), turns = stairTurns(Ls[lo + 1].y - Ls[lo].y), span = turns*TAU, dur = 1700*turns, t = Math.min(1, (performance.now() - t0)/dur), e = t*t*(3 - 2*t);
      const ang = dir > 0 ? e*span : (1 - e)*span, y0 = Ls[lo].y, y1 = Ls[lo + 1].y, f = Math.max(0, Math.min(1, (ang - STAIR.half)/(span - 2*STAIR.half))), y = y0 + (y1 - y0)*f;
      goal.pos.set(Math.cos(ang)*STAIR.walkR, y + EYE, Math.sin(ang)*STAIR.walkR); const tx = -Math.sin(ang)*dir, tz = Math.cos(ang)*dir; goal.yaw = Math.atan2(-tx, -tz); goal.pitch = dir > 0 ? .12 : -.18; dirty = 2;
      if(performance.now() - stepT > 330){ stepT = performance.now(); hooks.footstep && hooks.footstep(); }
      if(t >= 1){ seg++; t0 = performance.now(); } };
    anims.push(fn); }
  function buildStair(p, R){ const Ls = p.room.landings, S2 = STAIR, yMin = Ls[0].y - .25, yMax = Ls[Ls.length - 1].y + 4.2, Hs = yMax - yMin, k0 = p.landing || 0;
    const M = (x=0, y=0, z=0, rx=0, ry=0, rz=0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
    const stoneP = [], darkP = [], glowP = [];
    const wall = new THREE.Mesh(mergeGeoms([[new THREE.CylinderGeometry(S2.R, S2.R, Hs, 56, 12, true), M(0, yMin + Hs/2, 0)]], true), mat("#c8bea9", {side:THREE.BackSide})); wall.receiveShadow = true; scene.add(wall);
    stoneP.push([new THREE.CylinderGeometry(S2.R, S2.R, .3, 40), M(0, yMin - .15, 0)]); stoneP.push([new THREE.CylinderGeometry(S2.R, S2.R, .3, 40), M(0, yMax + .15, 0)]);
    stoneP.push([new THREE.CylinderGeometry(S2.newel, S2.newel, Hs, 16), M(0, yMin + Hs/2, 0)]);
    // landings, and the treads between them
    Ls.forEach((L, k) => { stoneP.push([new THREE.CylinderGeometry(S2.R - .02, S2.R - .02, .22, 24, 1, false, Math.PI/2 - S2.half, 2*S2.half), M(0, L.y - .11, 0)]);
      if(k < Ls.length - 1){ const dy = Ls[k + 1].y - L.y, turns = stairTurns(dy), span = turns*TAU, n = Math.max(8, Math.round(dy/.19)), dphi = (span - 2*S2.half)/n;
        for(let i=0;i<n;i++){ const phi = S2.half + (i + .5)*dphi, y = L.y + (i + 1)*dy/(n + 1), rm = (S2.R + S2.newel)/2;
          stoneP.push([new THREE.BoxGeometry(S2.R - S2.newel - .05, .16, dphi*S2.R*1.08), M(Math.cos(phi)*rm, y - .08, Math.sin(phi)*rm, 0, -phi, 0)]);
          stoneP.push([new THREE.BoxGeometry(S2.R - S2.newel - .05, dy/(n + 1), .05), M(Math.cos(phi - dphi/2)*rm, y - .08 - dy/(n + 1)/2, Math.sin(phi - dphi/2)*rm, 0, -(phi - dphi/2), 0)]); }
        // a handrail on the wall, following the stair
        const pts = []; for(let i=0;i<=40;i++){ const t = i/40, phi = S2.half + t*(span - 2*S2.half); pts.push(new THREE.Vector3(Math.cos(phi)*(S2.R - .12), L.y + .95 + dy*t, Math.sin(phi)*(S2.R - .12))); }
        stoneP.push([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, .035, 6, false), M()]);
        // slit windows on the way up
        for(let q=1;q<turns*3;q++){ const phi = q/3*TAU + .4, y = L.y + dy*q/(turns*3) + 1.4; glowP.push([new THREE.PlaneGeometry(.16, .9), M(Math.cos(phi)*(S2.R - .03), y, Math.sin(phi)*(S2.R - .03), 0, -phi - Math.PI/2, 0)]); } }
      // a lamp by each door
      glowP.push([new THREE.SphereGeometry(.12, 12, 8), M((S2.R - .2)*Math.cos(.55), L.y + 2.3, (S2.R - .2)*Math.sin(.55))]);
      const pl = new THREE.PointLight("#ffc879", 14, 0, 2); pl.position.set((S2.R - .5)*Math.cos(.55), L.y + 2.2, (S2.R - .5)*Math.sin(.55)); scene.add(pl); });
    // the doors: the ones at your landing open; the others are drawn, but out of reach
    const doorAt = (d, k) => { const L = Ls[k]; if(!L) return; const c = new THREE.Vector3(S2.R - .14, 0, 0), u = new THREE.Vector3(0, 0, -1), n = new THREE.Vector3(-1, 0, 0);
      const hh = {kind:"door", at:0, w:1.4, h:2.5, sill:L.y, d, pointed:true}; if(d.open) darkP.push([new THREE.ShapeGeometry((() => { const sh = new THREE.Shape(); archPts2(1.4, 2.5, true, 12).forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y)); return sh; })()), M(S2.R - .09, L.y, 0, 0, -Math.PI/2, 0)]);
      buildDoor(hh, c, u, n, p, null); };
    p.doors.forEach(d => doorAt(d, d.stop || 0)); (p.ghosts || []).forEach(d => doorAt(Object.assign({}, d, {open:false}), d.stop || 0));
    // up and down, from where you stand
    const L0 = Ls[k0], hot = (k, phi, y, label) => { const hb = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.4), new THREE.MeshBasicMaterial({visible:false})); hb.position.set(Math.cos(phi)*1.9, y, Math.sin(phi)*1.9); hb.rotation.y = -phi;
      hb.userData.hit = {kind:"look", label, onClick:() => hooks.landing && hooks.landing(k)}; scene.add(hb); picks.push(hb); };
    if(Ls[k0 + 1]) hot(k0 + 1, S2.half + .7, L0.y + 1.2, "Up the stair: " + (Ls[k0 + 1].name || "the next landing"));
    if(Ls[k0 - 1]) hot(k0 - 1, -S2.half - .7, L0.y + .2, "Down the stair: " + (Ls[k0 - 1].name || "the landing below"));
    const add = (parts, m, shadow, wuv) => { if(!parts.length) return; const mesh = new THREE.Mesh(mergeGeoms(parts, wuv), m); mesh.castShadow = shadow; mesh.receiveShadow = true; scene.add(mesh); };
    add(stoneP, mat("#c8bea9"), true, true); add(darkP, new THREE.MeshBasicMaterial({color:"#120e0b", side:THREE.DoubleSide}), false);
    add(glowP, new THREE.MeshBasicMaterial({color: p.band === "night" ? "#ffcf8a" : "#f4f0e2", side:THREE.DoubleSide}), false);
    scene.add(new THREE.HemisphereLight("#fbf2e0", "#4a4036", p.band === "night" ? .25 : .7));
  }
  /* ---- the elevator: a bronze and walnut car with a folding gate, a dial over it, and a button for every floor ---- */
  let carFloorShown = null;
  function buildCar(p){ const floors = p.room.floors || [], k = p.car || 0, W2 = 2.3, D2 = 2.1, Hc = 2.75, z0 = -D2/2;
    const wood = mat("#5a3c26"), bronze = mat("#8a6a3e", {metalness:.85, roughness:.3}), stoneM = mat("#c8bea9");
    const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; scene.add(b); return b; };
    box(W2, .05, D2, mat("#6e2a22"), 0, 0, 0); box(W2, .05, D2, mat("#3a2a1c"), 0, Hc, 0);
    box(.05, Hc, D2, wood, -W2/2, Hc/2, 0); box(.05, Hc, D2, wood, W2/2, Hc/2, 0); box(W2, Hc, .05, wood, 0, Hc/2, D2/2);
    [-1, 1].forEach(s => box(.5, Hc, .06, wood, s*(W2/2 - .25), Hc/2, z0)); box(W2, Hc - 2.3, .06, wood, 0, 2.3 + (Hc - 2.3)/2, z0);
    [.95, 2.2].forEach(y => { box(.03, .04, D2, bronze, -W2/2 + .04, y, 0); box(.03, .04, D2, bronze, W2/2 - .04, y, 0); box(W2, .04, .03, bronze, 0, y, D2/2 - .04); });
    box(.04, .04, D2*.8, bronze, -W2/2 + .1, .95, 0);   // a hand rail
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(.35, 32), new THREE.MeshBasicMaterial({color:"#fff0cc"})); lamp.rotation.x = Math.PI/2; lamp.position.set(0, Hc - .03, 0); scene.add(lamp);
    const pl = new THREE.PointLight("#ffe2b0", 8, 0, 2); pl.position.set(0, Hc - .3, 0); scene.add(pl); scene.add(new THREE.HemisphereLight("#fbf2e0", "#4a4036", .55));
    // the dial over the gate, with its needle at this floor
    const n = Math.max(1, floors.length - 1), ang = i => Math.PI - i/n*Math.PI;
    const dialTex = canvasTex(512, 280, (g, w, h) => { g.fillStyle = "#c9a35a"; g.beginPath(); g.arc(w/2, h - 20, 240, Math.PI, 0); g.fill(); g.fillStyle = "#efe6cf"; g.beginPath(); g.arc(w/2, h - 20, 220, Math.PI, 0); g.fill();
      g.fillStyle = "#2b2016"; g.font = "bold 34px Georgia, serif"; g.textAlign = "center"; floors.forEach((f, i) => { const a = ang(i); g.fillText(f.n, w/2 + Math.cos(a)*180, h - 20 - Math.sin(a)*180 + 12); }); });
    const dial = new THREE.Mesh(new THREE.PlaneGeometry(.9, .49), new THREE.MeshStandardMaterial({map:dialTex, roughness:.5})); dial.position.set(0, 2.5, z0 + .04); scene.add(dial);
    const needle = new THREE.Group(); needle.position.set(0, 2.5 - .49/2 + .035, z0 + .05); const nm = new THREE.Mesh(new THREE.BoxGeometry(.28, .02, .01), mat("#2b2016")); nm.position.x = .14; needle.add(nm); scene.add(needle);
    const setNeedle = i => { needle.rotation.z = ang(i); }; setNeedle(carFloorShown != null && carFloorShown !== k ? carFloorShown : k);
    // the folding gate
    const gateTex = canvasTex(256, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = "#2a2622"; g.lineWidth = 7; for(let x=-h; x<w + h; x+=46){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x + h*.5, h); g.stroke(); g.beginPath(); g.moveTo(x, h); g.lineTo(x + h*.5, 0); g.stroke(); } g.lineWidth = 12; g.strokeRect(0, 0, w, h); });
    const gate = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.3), new THREE.MeshStandardMaterial({map:gateTex, transparent:true, alphaTest:.4, side:THREE.DoubleSide, metalness:.6, roughness:.4})); gate.position.set(-.65, 1.15, z0 - .02); gate.geometry.translate(.65, 0, 0); gate.scale.x = .12; scene.add(gate);
    // the landing beyond: stone, and this floor's door
    box(W2 + 1, .05, 2.2, stoneM, 0, 0, z0 - 1.15); box(W2 + 1, .05, 2.2, stoneM, 0, 3.0, z0 - 1.15); [-1, 1].forEach(s => box(.05, 3, 2.2, stoneM, s*(W2/2 + .5), 1.5, z0 - 1.15)); box(W2 + 1, 3, .05, stoneM, 0, 1.5, z0 - 2.25);
    p.doors.forEach(d => buildDoor({kind:"door", at:0, w:1.5, h:2.5, sill:0, d, pointed:true}, new THREE.Vector3(0, 0, z0 - 2.2), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), p, null));
    const lpl = new THREE.PointLight("#ffd9a0", 4, 0, 2); lpl.position.set(0, 2.6, z0 - 1.2); scene.add(lpl);
    // the buttons
    const pnl = box(.04, .2 + floors.length*.17, .34, bronze, W2/2 - .05, 1.25, z0 + .45);
    floors.forEach((f, i) => { const y = 1.25 + (floors.length - 1)/2*.17 - i*.17, lit = i === k, closed = !!f.closed;
      const tex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = lit ? "#ffd27a" : closed ? "#7a6a55" : "#efe6cf"; g.beginPath(); g.arc(64, 64, 58, 0, TAU); g.fill(); g.fillStyle = "#2b2016"; g.font = "bold 54px Georgia, serif"; g.textAlign = "center"; g.fillText(f.n, 64, 82); });
      const b = new THREE.Mesh(new THREE.CircleGeometry(.06, 24), lit ? new THREE.MeshBasicMaterial({map:tex}) : new THREE.MeshStandardMaterial({map:tex, roughness:.4})); b.position.set(W2/2 - .075, y, z0 + .45); b.rotation.y = -Math.PI/2; scene.add(b);
      b.userData.hit = {kind:"look", label: `${f.n}: ${f.name || ""}${closed ? " (closed)" : ""}`, onClick:() => hooks.car && hooks.car(i)}; picks.push(b); });
    // the ride: the gate folds shut, the needle swings, the car hums and shivers, the gate folds open
    const ride = e => { const to = e.detail && e.detail.to; if(to == null) return; const from = carFloorShown != null ? carFloorShown : k, t0 = performance.now();
      const fn = () => { const t = (performance.now() - t0)/1000; gate.scale.x = t < .5 ? .12 + .88*t/.5 : t < 2.2 ? 1 : Math.max(.12, 1 - .88*(t - 2.2)/.4);
        const u = Math.max(0, Math.min(1, (t - .5)/1.7)); needle.rotation.z = ang(from) + (ang(to) - ang(from))*(u*u*(3 - 2*u));
        cam.pos.y = EYE + (t > .5 && t < 2.2 ? Math.sin(t*61)*.006 : 0); dirty = 2; if(t > 2.7){ const i = anims.indexOf(fn); if(i >= 0) anims.splice(i, 1); carFloorShown = to; } };
      anims.push(fn); };
    onWin("wending-car", ride); carFloorShown = k;
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
    const domeM = on1(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({vertexColors:true, side:THREE.BackSide, fog:false, depthWrite:false})));
    domeM.userData.hit = {kind:"look", get label(){ return skyOn ? "The sky: open its notes" : (plan && plan.pitch <= 0 && cam.pitch < .5) ? "Look up at the sky" : "The sky: go up into it"; }, onClick:()=>{ if(!skyOn && plan && plan.pitch <= 0 && cam.pitch < .5){ hooks.look(1); return; } if(!skyOn) skyMode(true); hooks.sky && hooks.sky(); }}; picks.push(domeM);
    // the guides an observer would draw in: the alt-azimuth grid, the celestial equator, the ecliptic, the pole and the zenith
    const O = p.skyOpts || {}, guide = (pts, color, op, closed) => { if(pts.length < 2) return; const g2 = new THREE.BufferGeometry().setFromPoints(pts); on1(new (closed ? THREE.LineLoop : THREE.Line)(g2, new THREE.LineBasicMaterial({color, transparent:true, opacity:op, fog:false, depthWrite:false}))); };
    const ring = (alt) => Array.from({length:121}, (_, k) => dir(alt, k*3).multiplyScalar(RS-.8));
    if(O.grid){ [15, 30, 45, 60, 75].forEach(a => guide(ring(a), "#9aa3b5", .28, true)); for(let az=0; az<360; az+=30) guide(Array.from({length:31}, (_, k) => dir(k*3, az).multiplyScalar(RS-.8)), "#9aa3b5", .22);
      [["N",0],["E",90],["S",180],["W",270]].forEach(([c, az]) => skyLabel(c, dir(4, az).multiplyScalar(RS-2), "#e9dcc0", 30, .9, 3.4)); skyLabel("zenith", dir(89.5, 0).multiplyScalar(RS-2), "#e9dcc0", 22, .8, 2.6, true); }
    const segs = (list, color, op) => { let run = []; list.forEach(([alt, az]) => { if(alt > -3) run.push(dir(alt, az).multiplyScalar(RS-.9)); else { guide(run, color, op); run = []; } }); guide(run, color, op); };
    if(O.equator && D.equator){ segs(D.equator, "#7fa0c8", .7); const e0 = D.equator.find(([a]) => a > 10); if(e0) skyLabel("celestial equator", dir(e0[0], e0[1]).multiplyScalar(RS-2), "#a9c0de", 22, .9, 2.8, true); }
    if(O.ecliptic && D.ecliptic){ segs(D.ecliptic, "#d8a85a", .8); const e1 = D.ecliptic.find(([a]) => a > 12); if(e1) skyLabel("the ecliptic: the sun's road", dir(e1[0], e1[1]).multiplyScalar(RS-2), "#e6c88f", 22, .9, 3.2, true); }
    if(O.pole){ const pa = Math.abs(p.lat), paz = p.lat >= 0 ? 0 : 180; const pm = new THREE.Mesh(new THREE.RingGeometry(.5, .62, 32), new THREE.MeshBasicMaterial({color:"#e8c77a", side:THREE.DoubleSide, fog:false, depthWrite:false})); pm.position.copy(dir(pa, paz).multiplyScalar(RS-1)); pm.lookAt(0,0,0); on1(pm);
      skyLabel(p.lat >= 0 ? "north celestial pole" : "south celestial pole", dir(pa - 2.2, paz).multiplyScalar(RS-2), "#e8c77a", 22, .95, 3, true); }
    const dot = canvasTex(64, 64, (g,w,h) => { const gr = g.createRadialGradient(32,32,0,32,32,30); gr.addColorStop(0,"rgba(255,255,255,1)"); gr.addColorStop(.35,"rgba(255,255,255,.9)"); gr.addColorStop(1,"rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0,0,w,h); });
    const sv = Math.max(0, Math.min(1, (-sa - 3)/10)) * (1 - cc*.97);
    if(sv > .03){
      [[-2,1.6,5.2],[1.6,3,3.6],[3,4.7,2.4]].forEach(([lo,hi,size]) => { const pts = [];
        D.stars.forEach(([alt,az,m]) => { if(m < lo || m >= hi) return; pts.push(...dir(alt,az).multiplyScalar(RS-1).toArray()); });
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        on1(new THREE.Points(g, new THREE.PointsMaterial({size, map:dot, color:"#f6f0de", transparent:true, opacity:sv, sizeAttenuation:false, fog:false, depthWrite:false}))); });
      if(O.lines !== false){ const lp = []; D.lines.forEach(([a,b]) => { lp.push(...dir(a[0],a[1]).multiplyScalar(RS-1.5).toArray(), ...dir(b[0],b[1]).multiplyScalar(RS-1.5).toArray()); });
      const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
      on1(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({color:"#"+muted(p.spot,.7).getHexString(), transparent:true, opacity:.38*sv, fog:false, depthWrite:false}))); }
      if(O.names !== false) D.cons.forEach(([alt,az,n]) => skyLabel(n.toUpperCase(), dir(alt,az).multiplyScalar(RS-2), "#9a8f7c", 22, .55*sv, 3.2));
      if(O.names !== false) D.names.forEach(([alt,az,n]) => skyLabel(n, dir(alt,az).multiplyScalar(RS-2).add(new THREE.Vector3(0,-.9,0)), "#e9e1cc", 20, .7*sv, 2.4, true));
    }
    const pv = Math.max(0, Math.min(1, (-sa + 1)/6)) * (1 - cc*.95);
    if(pv > .05) D.planets.forEach(pl => { if(pl.alt < 0) return; const at = dir(pl.alt, pl.az).multiplyScalar(RS-1.2);
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(at.toArray(), 3));
      on1(new THREE.Points(g, new THREE.PointsMaterial({size:7, map:dot, color:"#ffe6b0", transparent:true, opacity:pv, sizeAttenuation:false, fog:false, depthWrite:false})));
      skyLabel(pl.name, at.clone().add(new THREE.Vector3(0,-1.2,0)), "#e6c88f", 22, .85*pv, 2.6, true); });
    // each planet's track among the stars: a dot every four days, forty days either side; retrograde loops show as kinks
    const TC = {mer:"#cfc6b4", ven:"#f1e6c4", mar:"#d98a63", jup:"#e2c9a2", sat:"#e6d6a6", ura:"#a9d0d6", nep:"#8fa9d6"};
    if(pv > .05 && D.tracks && O.tracks !== false) D.tracks.forEach(tr => { const pts = []; tr.pts.forEach(([alt,az]) => pts.push(...dir(alt,az).multiplyScalar(RS-1.3).toArray()));
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
    if(["rain","storm"].includes(p.wxKind)){ // rings where the drops land
      const rings = []; for(let k=0;k<70;k++){ const r = new THREE.Mesh(new THREE.RingGeometry(.02,.035,16), new THREE.MeshBasicMaterial({color:"#dfe6ea", transparent:true, opacity:0, depthWrite:false})); r.rotation.x = -Math.PI/2; r.position.set((Math.random()-.5)*(p.half*2-2), .012, (Math.random()-.5)*(p.half*2-2)); r.layers.set(1); scene.add(r); rings.push([r, Math.random()]); }
      anims.push((t, dt) => { rings.forEach(rr => { rr[1] += (dt||.016)*(p.wxKind==="storm" ? 2.2 : 1.5); if(rr[1] > 1){ rr[1] = 0; rr[0].position.set((Math.random()-.5)*(p.half*2-2), .012, (Math.random()-.5)*(p.half*2-2)); } const k = rr[1]; rr[0].scale.setScalar(1 + k*5); rr[0].material.opacity = .55*(1-k); }); }); }
    if(["rain","snow","storm"].includes(p.wxKind)){ const snow = p.wxKind==="snow", n = snow ? 2400 : p.wxKind==="storm" ? 3200 : 2400, len = snow ? 0 : .55, pts = new Float32Array(n*6);
      for(let i=0;i<n;i++){ const x = (Math.random()-.5)*14, y = Math.random()*9, z = (Math.random()-.5)*14; pts.set([x*(p.half||5.5)/7*1.0,y,z*(p.half||5.5)/7*1.0, x*(p.half||5.5)/7+.03,y+len,z*(p.half||5.5)/7], i*6); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
      if(snow) on1(new THREE.Points(g, new THREE.PointsMaterial({size:4.2, map:dot, color:"#ffffff", transparent:true, opacity:.9, sizeAttenuation:false, fog:false, depthWrite:false})));
      else on1(new THREE.LineSegments(g, new THREE.LineBasicMaterial({color: p.band==="night" ? "#aab5c2" : "#4a5662", transparent:true, opacity:.7, fog:false, depthWrite:false})));
      anims.push((t, dt) => { dt = Math.min(.1, dt || .016); const a = g.attributes.position.array, v = (snow ? 1.1 : 11)*dt;
        for(let i=0;i<n*2;i++){ a[i*3+1] -= v; if(snow) a[i*3] += Math.sin(t+i)*.002; }
        for(let i=0;i<n;i++){ if(a[i*6+1] < 0){ a[i*6+1] += 9; a[i*6+4] += 9; } }
        g.attributes.position.needsUpdate = true; }); }
  }
  function skyLabel(text, at, color, px, opacity, scale, italic){
    const tex = canvasTex(256, 48, (g,w,h) => { g.font = `${italic?"italic ":""}${px}px ${italic?FELL:FELLSC}`; g.fillStyle = color; g.textAlign = "center"; g.fillText(text, w/2, 32); });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, opacity, fog:false, depthWrite:false})); sp.scale.set(scale*256/48*.9, scale*.9, 1); sp.position.copy(at); sp.layers.set(1); scene.add(sp); return sp; }

  /* ---- doors ---- */
  function buildDoor(hh, c, u, n, p, f){
    let d = hh.d; const g = new THREE.Group(), yaw = Math.atan2(-u.z, u.x);
    const out = n.clone().negate();
    // a passage beyond: dark, receding
    const pass = new THREE.Mesh(new THREE.BoxGeometry(hh.w, hh.h, 1.6), new THREE.MeshBasicMaterial({color: d.open ? "#0f0d0b" : "#2a241c"}));
    pass.position.copy(c).add(out.clone().multiplyScalar(1.1)); pass.position.y = hh.h/2; pass.rotation.y = yaw; g.add(pass);
    // the frame: an arch of cut stone
    const archPts = hh.pointed ? archPts2(hh.w + .16, hh.h + .08, true, 16).slice(1, -1).map(([x,y]) => new THREE.Vector3(x, y, 0)) : []; if(!hh.pointed) for(let i=0;i<=16;i++){ const t = Math.PI*i/16; archPts.push(new THREE.Vector3(Math.cos(t)*(hh.w/2+.08), hh.h - hh.w/2 + Math.sin(t)*(hh.w/2+.08), 0)); }
    const path = new THREE.CatmullRomCurve3([new THREE.Vector3(hh.w/2+.08,0,0), ...archPts, new THREE.Vector3(-hh.w/2-.08,0,0)]);
    const frameM = new THREE.Mesh(new THREE.TubeGeometry(path, 48, hh.pointed ? .2 : .1, 6, false), mat("#b4aa95"));
    frameM.position.copy(c).add(n.clone().multiplyScalar(.02)); frameM.rotation.y = yaw; frameM.castShadow = true; g.add(frameM);
    // a door leaf: open doors stand ajar, locked doors are shut and studded
    const leafG = new THREE.Shape(); const x0=-hh.w/2+.02, x1=hh.w/2-.02, y1=hh.h-hh.w/2;
    if(hh.pointed){ leafG.moveTo(x0,0); leafG.lineTo(x1,0); archPts2(hh.w-.04, hh.h-.02, true, 14).forEach(([x,y]) => leafG.lineTo(x,y)); leafG.lineTo(x0,0); } else { leafG.moveTo(x0,0); leafG.lineTo(x1,0); leafG.lineTo(x1,y1); leafG.absarc(0,y1,hh.w/2-.02,0,Math.PI,false); leafG.lineTo(x0,0); }
    const leafTex = canvasTex(256, 512, (gg,w,h) => { gg.fillStyle = d.look==="mirror" ? "#d9dcdc" : d.look==="gold" ? "#6b5a3a" : "#5a4632"; gg.fillRect(0,0,w,h);
      if(d.look==="mirror"){ for(let k=0;k<6;k++){ gg.strokeStyle="rgba(255,255,255,.7)"; gg.lineWidth=6+k*2; gg.beginPath(); gg.moveTo(-40+k*60,h); gg.lineTo(w+40-k*10,h*.2+k*30); gg.stroke(); } }
      else { for(let x=0;x<w;x+=42){ gg.strokeStyle="#2c2218"; gg.lineWidth=3; gg.beginPath(); gg.moveTo(x,0); gg.lineTo(x,h); gg.stroke(); } [h*.25,h*.7].forEach(y=>{ gg.fillStyle="#2b2520"; gg.fillRect(0,y,w,14); for(let x=10;x<w;x+=36){ gg.beginPath(); gg.arc(x,y+7,4,0,TAU); gg.fillStyle="#9a8e78"; gg.fill(); } }); }
      if(d.look==="shelves"){ gg.fillStyle="#3b2e22"; gg.fillRect(0,0,w,h); for(let y=40;y<h;y+=80){ gg.fillStyle="#1d1712"; gg.fillRect(0,y,w,8); let x=6; while(x<w-8){ const bw=8+Math.random()*12; gg.fillStyle=["#6e5a44","#8a7a62","#4e4436","#a39478"][Math.floor(Math.random()*4)]; gg.fillRect(x,y-58+Math.random()*10,bw,58); x+=bw+2; } } }
      if(d.look==="boarded"){ // planks nailed across, and a note
        [[-.1,.32,.18],[.1,.58,-.2],[0,.78,.12]].forEach(([dx,y,a]) => { gg.save(); gg.translate(w/2+dx*w, h*y); gg.rotate(a); gg.fillStyle = "#9b8a6c"; gg.fillRect(-w*.75, -16, w*1.5, 32); gg.strokeStyle = "#4a3c2b"; gg.lineWidth = 3; gg.strokeRect(-w*.75, -16, w*1.5, 32);
          [-.55,.55].forEach(nx => { gg.beginPath(); gg.arc(nx*w, 0, 4, 0, TAU); gg.fillStyle = "#2b2520"; gg.fill(); }); gg.restore(); });
        gg.save(); gg.translate(w/2, h*.46); gg.rotate(-.04); gg.fillStyle = "#f1e9d4"; gg.fillRect(-62,-70,124,140); gg.strokeStyle = "#8a7a62"; gg.lineWidth = 2; gg.strokeRect(-62,-70,124,140);
        gg.fillStyle = "#2b2016"; gg.font = `italic 22px ${FELL}`; gg.textAlign = "center"; gg.fillText("Closed", 0, -32); gg.fillText("for", 0, -6); gg.fillText("renovation", 0, 20); gg.font = `16px ${FELL}`; gg.fillText("— W. K.", 20, 52);
        gg.beginPath(); gg.arc(0,-62,5,0,TAU); gg.fillStyle = "#a33a2a"; gg.fill(); gg.restore(); }
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
    const psc = hh.pointed ? (hh.sill > 0 ? 1.2 : 1.9) : 1; pm.scale.setScalar(psc); pm.position.copy(c).add(n.clone().multiplyScalar(.035)); pm.position.y = hh.h + .22 + .2*psc; pm.rotation.y = yaw; g.add(label(pm));
    const onClick0 = d.onClick, doorAt = c.clone().add(out.clone().multiplyScalar(.4)); doorAt.y = hh.sill || 0; 
    d = Object.assign({}, d, {onClick: d.open ? () => approach(doorAt, onClick0) : onClick0});
    g.userData.hit = {kind: d.open ? "door" : "locked", label: (d.open ? "" : d.look==="boarded" ? "Closed for renovation: " : "Locked: ") + d.label + (d.name ? " · " + d.name : "") + (d.title ? " · " + d.title : ""), onClick: d.onClick};
    g.position.y = hh.sill || 0; scene.add(g); if(!d.ghost) picks.push(g); if(p.doorSpots) p.doorSpots[d.id] = c.clone().add(n.clone().multiplyScalar(1.2)).setY(hh.sill || 0);
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
    let back = null; if(!hh.view){ back = new THREE.Mesh(new THREE.PlaneGeometry(hh.w*1.6, hh.h*1.4), new THREE.MeshBasicMaterial({map:tex}));
    back.position.copy(c).add(out.clone().multiplyScalar(.9)); back.position.y = hh.sill + hh.h/2; back.rotation.y = yaw; back.layers.set(1); scene.add(back); }
    // mullions
    const mm = mat("#3a3128");
    const v = new THREE.Mesh(new THREE.BoxGeometry(.06, hh.h, .06), mm); v.position.copy(c).add(out.clone().multiplyScalar(.15)); v.position.y = hh.sill + hh.h/2; v.rotation.y = yaw; scene.add(v);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(hh.w, .06, .06), mm); hb.position.copy(v.position); hb.position.y = hh.sill + hh.h*.55; hb.rotation.y = yaw; scene.add(hb);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(hh.w+.3, .1, .4), mat("#b4aa95")); sill.position.copy(c).add(n.clone().multiplyScalar(.08)); sill.position.y = hh.sill - .05; sill.rotation.y = yaw; sill.receiveShadow = true; scene.add(sill);
    if(["rain","storm","snow"].includes(p.wxKind)){ // drops on the glass, running down; or flakes going past
      const cv = document.createElement("canvas"); cv.width = 192; cv.height = 288; const gx = cv.getContext("2d"), tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
      const snowW = p.wxKind === "snow", drops = Array.from({length: snowW ? 70 : 46}, () => ({x:Math.random()*192, y:Math.random()*288, v: snowW ? 8 + Math.random()*14 : 20 + Math.random()*90, r: snowW ? 1.5 + Math.random()*2.5 : 1.5 + Math.random()*3}));
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(hh.w*.98, hh.h*.98), new THREE.MeshBasicMaterial({map:tx, transparent:true, depthWrite:false}));
      glass.position.copy(c).add(out.clone().multiplyScalar(.12)); glass.position.y = hh.sill + hh.h/2; glass.rotation.y = yaw; glass.layers.set(1); scene.add(glass);
      let acc = 0; anims.push((t, dt) => { acc += dt||.016; if(acc < .066) return; const step = acc; acc = 0; gx.clearRect(0,0,192,288);
        drops.forEach(d => { d.y += d.v*step*(snowW ? 1 : (d.r > 3 ? 1.6 : .4)); if(snowW) d.x += Math.sin(t*.8 + d.v)*.6; if(d.y > 300){ d.y = -10; d.x = Math.random()*192; }
          if(snowW){ gx.fillStyle = "rgba(255,255,255,.9)"; gx.beginPath(); gx.arc(d.x, d.y, d.r, 0, TAU); gx.fill(); }
          else { gx.strokeStyle = "rgba(210,222,232,.35)"; gx.lineWidth = d.r*.7; gx.beginPath(); gx.moveTo(d.x, d.y - d.r*6); gx.lineTo(d.x, d.y); gx.stroke(); gx.fillStyle = "rgba(235,242,248,.75)"; gx.beginPath(); gx.arc(d.x, d.y, d.r, 0, TAU); gx.fill(); } });
        if(!snowW){ gx.strokeStyle = "rgba(90,105,120,.55)"; gx.lineWidth = 1.2; for(let k=0;k<40;k++){ const x = Math.random()*192, y = Math.random()*288; gx.beginPath(); gx.moveTo(x, y); gx.lineTo(x-4, y+14); gx.stroke(); } }
        tx.needsUpdate = true; dirty = 2; }); }
    if(back){ back.userData.hit = {kind:"look", label: p.wxLabel || "The window", onClick:()=>hooks.toast(p.wxLabel || "Outside, the weather goes on.")}; picks.push(back); }
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
    m.userData.hit = frame.userData.hit; picks.push(m); glint(scene, c.clone().add(u.clone().multiplyScalar(bw/2 - .1)).add(f.n.clone().multiplyScalar(.12)).setY(2.15 + bh/2 - .1), o, f.slot);
  }

  /* ---- stations: a desk, a table, or a low bookcase, with the things on it ---- */
  // an info spot: a small glint of light over a thing; touching it lets the Primer tell you about it
  let glintTex = null;
  function glint(parent, at, o, slot){ if(!o || !(o.raw && (o.raw.note || o.raw.info))) return;
    if(!glintTex) glintTex = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2); gr.addColorStop(0, "rgba(255,248,220,1)"); gr.addColorStop(.25, "rgba(255,226,150,.85)"); gr.addColorStop(1, "rgba(255,210,120,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(255,250,230,.9)"; g.lineWidth = 2; g.beginPath(); g.moveTo(w/2, 8); g.lineTo(w/2, h - 8); g.moveTo(8, h/2); g.lineTo(w - 8, h/2); g.stroke(); });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({map: glintTex, transparent:true, depthTest:false, depthWrite:false, toneMapped:false})); s.scale.setScalar(.11); s.position.copy(at); s.layers.set(1); s.renderOrder = 10; parent.add(s);
    const seen = hooks.noted && hooks.noted(o.raw); s.material.opacity = seen ? .45 : 1;
    s.userData.hit = {kind:"info", label: (seen ? "In your Primer: " : "What is it? ") + o.title, onClick:() => { hooks.info && hooks.info(o.raw); s.material.opacity = .45; dirty = 2; }}; picks.push(s);
    const ph = Math.random()*6; anims.push(t => { if(s.visible){ s.scale.setScalar(.09 + .025*Math.sin(t*2.2 + ph)); } }); glints.push({mesh: s, slot}); }
  function buildStation(slot, sl, objs, p, R, spot){
    const f = sl.face, u = f.b.clone().sub(f.a).normalize(), n = f.n, yaw = Math.atan2(-u.z, u.x);
    const len = f.a.distanceTo(f.b), free = [len*.5, len*.3, len*.7].find(at => !f.holes.some(h => Math.abs(h.at-at) < h.w/2 + 1.1)) ?? len*.5;
    const c = f.a.clone().add(u.clone().multiplyScalar(free)).add(n.clone().multiplyScalar(1.15));
    const bookish = objs.filter(o => o.bookish).length > objs.length/2;
    const trayO = objs.find(o => o.action === "return"), onTray = trayO ? objs.filter(o => o.kind === "key") : [];
    const shown = objs.filter(o => o !== trayO && !onTray.includes(o)).slice(0, 9), w = Math.min(len*.7, Math.max(trayO ? 2.2 : 1.6, (shown.length + (trayO ? 1.4 : 0))*.62+.5)), topY = bookish ? .95 : .82;
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
    if(trayO){ // the return tray sits at the front of the desk, and the things you may take lie on it
      const tg = model("tray", spot, R); tg.scale.setScalar(1.35); tg.position.set(w/2 - .55, topY+.035, .12); tg.traverse(m => { if(m.isMesh) m.receiveShadow = true; });
      tg.userData.hit = {kind:"use", label: trayO.title + (onTray.length ? "" : " (empty: everything is in your bag)"), onClick:()=>hooks.useObject(trayO)}; g.add(tg); picks.push(tg);
      onTray.forEach((o, k) => { const og = model(o.icon, spot, R); og.scale.multiplyScalar(1.15); og.position.set(w/2 - .55 - .26 + (k%2)*.28, topY+.055, .12 - .1 + Math.floor(k/2)*.17); og.rotation.y = (R()-.5)*.6;
        og.traverse(m => { if(m.isMesh) m.castShadow = true; }); og.userData.hit = {kind:"take", label: o.title, onClick:()=>hooks.useObject(o)}; g.add(og); picks.push(og);
        glint(g, new THREE.Vector3(w/2 - .55 - .26 + (k%2)*.28 + .08, topY + .26, .12 - .1 + Math.floor(k/2)*.17), o, slot); });
    }
    const spacing = (w-.4 - (trayO ? 1.1 : 0))/Math.max(1, shown.length-1 || 1);
    shown.forEach((o, i) => {
      const og = model(o.icon, spot, R); og.scale.multiplyScalar(1.35); const x = shown.length===1 ? (trayO ? -w/2 + .5 : 0) : -w/2+.2 + i*spacing;
      og.position.set(x, topY+.035, .05 + (i%2)*.12); og.rotation.y = (R()-.5)*.5; og.traverse(m => { if(m.isMesh){ m.castShadow = true; } });
      og.userData.hit = {kind: o.kind==="key" ? "take" : o.href ? "open" : o.action ? "use" : "look", label: o.title + (o.by ? " · " + o.by : ""), onClick:()=>hooks.useObject(o)};
      g.add(og); picks.push(og); glint(g, new THREE.Vector3(x + .12, topY + .32, .05 + (i%2)*.12), o, slot);
    });
    scene.add(g);
    // a close-up viewpoint over this station
    const view = c.clone().add(n.clone().multiplyScalar(.82 + w*.22)).setY(1.42 + w*.08), topW = c.clone().add(n.clone().multiplyScalar(-.05)).setY(topY);
    stations[slot] = {view, top:topW};
  }



  /* ---- the Archive's shelves hold the catalogue itself: each entry a book (or a record, or a box) with its title on the spine ---- */
  const TYPE_LOOK = {book:{h:[.22,.3], t:[.03,.06], cols:["#6b2f26","#2f4a5a","#3f5a3a","#5a4630","#7a5a2e","#3a3048","#25303a"]}, paper:{h:[.28,.3], t:[.012,.02], cols:["#d8ccb0","#c9bb98"]},
    physical:{h:[.31,.31], t:[.008,.012], cols:["#1d1b19","#3a2e28","#2b3440"]}, digital:{h:[.19,.19], t:[.012,.012], cols:["#2a2f36","#3b3f46"]}, ephemera:{h:[.26,.26], t:[.07,.09], cols:["#8a7a5c","#6e6048"]},
    object:{h:[.26,.26], t:[.08,.1], cols:["#7d6b55"]}, art:{h:[.34,.34], t:[.05,.06], cols:["#4a3b2e"]}};
  function spineLabel(b, w, h, colHex){
    return canvasTex(64, 320, (g, W, H) => { g.fillStyle = colHex; g.fillRect(0,0,W,H);
      const light = new THREE.Color(colHex).getHSL({}).l > .5; g.fillStyle = light ? "#2b2016" : "#e3cf98";
      g.fillRect(4, 14, W-8, 2); g.fillRect(4, H-18, W-8, 2);
      g.save(); g.translate(W/2, H/2); g.rotate(-Math.PI/2); g.textAlign = "center"; g.textBaseline = "middle";
      let fs = 26; g.font = `${fs}px ${FELL}`; const t = b.title || ""; while(g.measureText(t).width > H - 70 && fs > 12){ fs -= 1; g.font = `${fs}px ${FELL}`; }
      g.fillText(t, 8, b.creator ? -7 : 0); if(b.creator){ g.font = `italic 14px ${FELL}`; g.fillText(b.creator.split(/\s+/).slice(-1)[0], 8, 13); } g.restore(); });
  }
  function buildCatalogShelves(faces, books, R, spot){
    let k = 0; const shelfH = .44, depth = .36, wood = mat("#5e4632"), dark = mat("#241b13");
    faces.forEach(f => { const u = f.b.clone().sub(f.a).normalize(), n = f.n, len = f.a.distanceTo(f.b), yaw = Math.atan2(-u.z, u.x), holes = f.holes || [];
      let x = .35; while(x < len - .35){ const w = Math.min(1.5, len - .35 - x); if(w < .7) break; const at = x + w/2;
        if(!holes.some(hh => Math.abs(hh.at - at) < hh.w/2 + w/2 + .1)){
          const g = new THREE.Group(), H = 3.3, shelves = Math.round((H-.12)/shelfH);
          const back = new THREE.Mesh(new THREE.BoxGeometry(w, H, .03), dark); back.position.set(0, H/2, .015); g.add(back);
          [-1,1].forEach(sx => { const side = new THREE.Mesh(new THREE.BoxGeometry(.05, H, depth), wood); side.position.set(sx*(w/2-.025), H/2, depth/2); side.castShadow = true; g.add(side); });
          const crown = new THREE.Mesh(new THREE.BoxGeometry(w+.1, .1, depth+.06), wood); crown.position.set(0, H-.05, depth/2); g.add(crown);
          const fill = bookBatch();
          const order = Array.from({length:shelves}, (_, i) => i).sort((a, b) => Math.abs(a - 3.2) - Math.abs(b - 3.2));   // eye-level shelves fill first
          for(const sI of order){ const y0 = .06 + sI*((H-.12)/shelves), board = new THREE.Mesh(new THREE.BoxGeometry(w-.08,.035,depth-.02), wood); board.position.set(0,y0,depth/2); board.receiveShadow = true; g.add(board);
            let bx = -w/2 + .07;
            while(bx < w/2 - .08){
              const b = books[k];
              if(b){ const L = TYPE_LOOK[b.type] || TYPE_LOOK.book, hsh = hashStr(b.id), bh = L.h[0] + (hsh%100)/100*(L.h[1]-L.h[0]), bw = Math.min(.08, L.t[0] + ((hsh>>8)%100)/100*(L.t[1]-L.t[0]) + (b.pages ? Math.min(.04, b.pages/14000) : 0));
                if(bx + bw > w/2 - .08) break;
                const col = L.cols[hsh % L.cols.length];
                const box = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, depth*.72), mat(col)); box.position.set(bx + bw/2, y0 + .018 + bh/2, depth*.5); box.castShadow = box.receiveShadow = true; g.add(box);
                const sp = new THREE.Mesh(new THREE.PlaneGeometry(bw*.96, bh*.97), new THREE.MeshBasicMaterial({map: spineLabel(b, bw, bh, col)})); sp.position.set(bx + bw/2, y0 + .018 + bh/2, depth*.5 + depth*.36 + .002); label(sp); g.add(sp);
                const hit = {kind:"open", label: b.title + (b.creator ? " · " + b.creator : "") + " · take it down", onClick:()=>{ const tz = box.position.z; box.position.z += .1; sp.position.z += .1; dirty = 3; setTimeout(() => { box.position.z = tz; sp.position.z = tz + depth*.36 + .002; dirty = 3; }, 900); hooks.openItem && hooks.openItem(b.id); }};
                box.userData.hit = hit; sp.userData.hit = hit; picks.push(box, sp); bx += bw + .004; k++;
              } else { // the rest of the shelf: books not yet catalogued, sparser
                const bw = .025 + R()*.045, bh = .2 + R()*.1; if(R() < .35){ bx += .06 + R()*.1; continue; }
                fill.add(bx + bw/2, y0 + .018 + bh/2, depth*.5, bw, bh, depth*.7, ["#6b5a48","#4a4339","#7d6b55","#5f574a"][Math.floor(R()*4)], 0); bx += bw + .004; }
            } }
          const fm = fill.mesh(); if(fm) g.add(fm);
          const c = f.a.clone().add(u.clone().multiplyScalar(at)); g.position.copy(c).add(n.clone().multiplyScalar(.02)); g.rotation.y = yaw; scene.add(g);
          const eye = c.clone().add(n.clone().multiplyScalar(1.25)).setY(1.5), aim = c.clone().add(n.clone().multiplyScalar(.2)).setY(1.25);
          back.userData.hit = {kind:"closer", label:"The shelves: look closer", onClick:()=>peek(eye, aim)}; picks.push(back);
        }
        x += w + .06; } });
  }
  function buildCardCatalog(at, faceTo){ // an oak card-catalogue cabinet: thirty drawers with brass label frames and pulls
    const g = new THREE.Group(), oak = mat("#8a6a45"), brass = mat("#b39a62",{metalness:.6, roughness:.35}), card = mat("#efe6cf");
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, .9, .5), oak); body.position.y = .75; body.castShadow = true; g.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.16, .04, .56), mat("#6e5236")); top.position.y = 1.22; g.add(top);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz]) => { const L = turnedLeg(.3, .03, mat("#5e4632")); L.position.set(sx*.5, 0, sz*.2); g.add(L); });
    for(let r=0;r<6;r++) for(let c=0;c<5;c++){ const x = -.44 + c*.22, y = .38 + r*.14;
      const df = new THREE.Mesh(new THREE.BoxGeometry(.2,.12,.012), mat(r%2 ? "#93724c" : "#8a6a45")); df.position.set(x, y, .256); g.add(df);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(.06,.03,.006), brass); fr.position.set(x, y+.025, .265); g.add(fr);
      const lab = new THREE.Mesh(new THREE.BoxGeometry(.05,.022,.004), card); lab.position.set(x, y+.025, .268); g.add(lab);
      const pull = new THREE.Mesh(new THREE.TorusGeometry(.014,.004,6,12,Math.PI), brass); pull.position.set(x, y-.025, .266); pull.rotation.z = Math.PI; g.add(pull); }
    const drawer = new THREE.Mesh(new THREE.BoxGeometry(.2,.12,.36), mat("#93724c")); drawer.position.set(-.22, .38 + 3*.14, .38); g.add(drawer);   // one drawer pulled out
    for(let k=0;k<12;k++){ const cd = new THREE.Mesh(new THREE.BoxGeometry(.17,.1,.003), card); cd.position.set(-.22, .43 + 3*.14, .24 + k*.02); cd.rotation.x = -.15; g.add(cd); }
    g.position.copy(at); g.rotation.y = Math.atan2(faceTo.x, faceTo.z); scene.add(g);
    g.userData.hit = {kind:"use", label:"The card catalogue: search the log book", onClick:()=>hooks.openCatalog && hooks.openCatalog("")}; picks.push(g);
  }

  /* ---- the court's other dials ---- */
  function compassAxes(p){ const F = p.F*DEG; return {east: new THREE.Vector3(Math.sin(Math.PI/2 - F), 0, -Math.cos(Math.PI/2 - F)), north: new THREE.Vector3(Math.sin(-F), 0, -Math.cos(-F))}; }
  function dialSteps(){ const stoneM = mat("#c4bba6"); [[1.55,.12,0],[1.2,.12,.12]].forEach(([r,h,y]) => { const st = new THREE.Mesh(new THREE.CylinderGeometry(r, r+.04, h, 64), stoneM); st.position.y = y + h/2; st.castShadow = st.receiveShadow = true; scene.add(st); }); }
  function buildDialVariant(p, spot){
    const t = p.dialType, D = p.dialData || {}, {east, north} = compassAxes(p), brass = mat("#b39a62",{metalness:.65, roughness:.32}), stoneM = mat("#c4bba6");
    const read = {kind:"closer", label: (p.dials && p.dials[t] ? p.dials[t].name : "The dial") + ": look closer and read it", onClick:()=>{ lookAtDial(t === "meridiana" ? null : 1); hooks.dial && hooks.dial(); }};
    const at = (e, n, y=0) => east.clone().multiplyScalar(e).add(north.clone().multiplyScalar(n)).setY(y);
    if(t === "meantime"){ // a horizontal plate of figure-eights; a bead on a pin casts the shadow
      dialSteps();
      const ped = lathe([[0,.24],[.42,.24],[.42,.3],[.34,.34],[.22,.42],[.3,.56],[.32,.62],[.2,.74],[.16,.8],[.26,.84],[.38,.88],[.4,.92],[0,.92]], stoneM, 48); ped.castShadow = ped.receiveShadow = true; scene.add(ped);
      const hN = .3, R0 = 1.1, oy = (p.lat >= 0 ? -1 : 1)*.62, k = 500/R0;
      const plate = canvasTex(1024, 1024, (g, w, h) => { const X = (e, n) => [w/2 + e*k, h/2 - n*k];
        g.fillStyle = "#cdbd92"; g.beginPath(); g.arc(w/2, h/2, 500, 0, TAU); g.fill(); g.strokeStyle = "#2b2318"; g.lineWidth = 8; g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(w/2, h/2, 470, 0, TAU); g.stroke();
        g.save(); g.beginPath(); g.arc(w/2, h/2, 468, 0, TAU); g.clip();
        (D.dates||[]).forEach(dl => { g.setLineDash([14,10]); g.strokeStyle = "rgba(43,35,24,.6)"; g.lineWidth = 4; g.beginPath(); dl.pts.forEach(([e,n],i) => { const [x,y] = X(e*hN, n*hN + oy); i ? g.lineTo(x,y) : g.moveTo(x,y); }); g.stroke(); g.setLineDash([]); });
        Object.entries(D.hours||{}).forEach(([hr, pts]) => { if(pts.length < 3) return; g.strokeStyle = +hr === 12 ? "#7a2b1e" : "#2b2318"; g.lineWidth = +hr === 12 ? 9 : 6; g.beginPath(); pts.forEach(([e,n],i) => { const [x,y] = X(e*hN, n*hN + oy); i ? g.lineTo(x,y) : g.moveTo(x,y); }); g.closePath(); g.stroke();
          const top = pts.reduce((a,b) => (b[1] > a[1] ? b : a)); const [x,y] = X(top[0]*hN, top[1]*hN + oy); g.fillStyle = "#2b2318"; g.font = `40px ${FELLSC}`; g.textAlign = "center"; g.fillText(["XII","I","II","III","IIII","V","VI","VII","VIII","IX","X","XI"][hr%12], x, y - 14); });
        g.restore(); g.fillStyle = "#2b2318"; g.font = `italic 30px ${FELL}`; g.textAlign = "center"; g.fillText("Horas non numero nisi serenas", w/2, h - 70); });
      const dial = new THREE.Mesh(new THREE.CircleGeometry(R0, 96), mat("#ffffff",{map:plate, metalness:.3, roughness:.45})); dial.rotation.set(-Math.PI/2, 0, p.F*DEG); dial.position.set(0,.92,0); dial.receiveShadow = true; scene.add(dial);
      const foot = at(0, oy, .92), pin = new THREE.Mesh(new THREE.CylinderGeometry(.006,.008,hN,12), brass); pin.position.copy(foot).setY(.92 + hN/2); pin.castShadow = true; scene.add(pin);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(.022, 24, 16), brass); bead.position.copy(foot).setY(.92 + hN); bead.castShadow = true; scene.add(bead);
      dial.userData.hit = read; ped.userData.hit = read; picks.push(dial, ped);
    }
    if(t === "meridiana"){ // a glass ball on a column at the equator side; its spot of sun crosses the paving
      const hS = 2.6, foot = at(0, (p.lat >= 0 ? -1 : 1)*3.0);
      const col = lathe([[0,0],[.3,0],[.3,.12],[.22,.18],[.16,.3],[.13,2.2],[.18,2.3],[.2,2.42],[.08,2.48],[0,2.48]], stoneM, 48); col.position.copy(foot); col.castShadow = col.receiveShadow = true; scene.add(col);
      const cup = new THREE.Mesh(new THREE.TorusGeometry(.1,.015,12,48), brass); cup.rotation.x = Math.PI/2; cup.position.copy(foot).setY(hS - .1); scene.add(cup);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(.12, 48, 32), new THREE.MeshStandardMaterial({color:"#eef5f7", roughness:.02, metalness:0, transparent:true, opacity:.55})); ball.position.copy(foot).setY(hS); ball.castShadow = true; scene.add(ball);
      // the brass inlay in the paving: the meridian line, the figure-eight at clock noon, the month marks
      const strip = (pts, r, m) => { if(pts.length < 2) return; const curve = new THREE.CatmullRomCurve3(pts.map(([e,n]) => at(e, n, .012))); const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length*3, r, 6, false), m); tube.receiveShadow = true; scene.add(tube); };
      const nf = n => (p.lat >= 0 ? -1 : 1)*3.0 + n*hS;
      const inside = ([e,n]) => { const w = at(e, n); return Math.abs(w.x) < 5.3 && Math.abs(w.z) < 5.3; };
      strip([[0, (p.lat >= 0 ? -1 : 1)*3.0], [0, (p.lat >= 0 ? 1 : -1)*5.3]], .015, brass);
      strip((D.noon8||[]).map(([e,n]) => [e*hS, nf(n)]).filter(inside), .012, mat("#8f3b2a",{metalness:.3, roughness:.4}));
      (D.months||[]).forEach(mk => { const n = nf(mk.n); if(!inside([0,n])) return; const tick = new THREE.Mesh(new THREE.BoxGeometry(.32,.012,.025), brass); tick.position.copy(at(0, n, .012)); tick.lookAt(at(0, n + 1, .012)); tick.rotateY(Math.PI/2); scene.add(tick);
        skyLabel(["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][mk.m], at(.42, n, .05), "#3a2b1c", 28, .9, .3, true); });
      // the spot itself, where the sun's ray through the ball meets the floor
      const sun = p.dome && p.dome.sun, ok = sun && sun.alt > 1 && !p.sunOff && (p.cloud||0) < 85;
      if(ok){ const a = (sun.az - p.F)*DEG, h = sun.alt*DEG, dirS = new THREE.Vector3(Math.sin(a)*Math.cos(h), Math.sin(h), -Math.cos(a)*Math.cos(h)), tt = hS/dirS.y, spotAt = foot.clone().setY(hS).sub(dirS.clone().multiplyScalar(tt)).setY(.016);
        if(Math.abs(spotAt.x) < 5.4 && Math.abs(spotAt.z) < 5.4){ const sp = new THREE.Mesh(new THREE.CircleGeometry(.05, 32), new THREE.MeshBasicMaterial({color:"#fff8d8", transparent:true, opacity:.95, depthWrite:false})); sp.rotation.x = -Math.PI/2; sp.position.copy(spotAt); sp.layers.set(1); scene.add(sp);
          const halo = new THREE.Mesh(new THREE.CircleGeometry(.12, 32), new THREE.MeshBasicMaterial({color:"#ffe9a0", transparent:true, opacity:.35, depthWrite:false})); halo.rotation.x = -Math.PI/2; halo.position.copy(spotAt).setY(.015); halo.layers.set(1); scene.add(halo);
          anims.push(t2 => { sp.material.opacity = .85 + .1*Math.sin(t2*9); }); } }
      col.userData.hit = read; ball.userData.hit = read; picks.push(col, ball);
    }
    if(t === "cannon"){ // a bronze noon gun on a stone block, a burning glass on an arc above its touch-hole
      dialSteps(); const block = new THREE.Mesh(new THREE.BoxGeometry(1.2,.75,.7), stoneM); block.position.y = .615; block.castShadow = block.receiveShadow = true; scene.add(block);
      const g = new THREE.Group(); g.position.y = .99; g.lookAt(north.clone().setY(.99)); scene.add(g);
      const bronze = mat("#6e5a34",{metalness:.7, roughness:.38});
      const barrel = lathe([[0,-.42],[.09,-.42],[.1,-.38],[.085,-.34],[.08,-.1],[.07,.2],[.065,.38],[.075,.4],[.07,.44],[.04,.44],[0,.44]], bronze, 48); barrel.rotation.x = Math.PI/2; barrel.castShadow = true; g.add(barrel);
      [-1,1].forEach(sx => { const wheel = new THREE.Mesh(new THREE.TorusGeometry(.13,.025,12,40), mat("#3d2e20")); wheel.position.set(sx*.16, -.05, -.05); wheel.rotation.y = Math.PI/2; g.add(wheel); });
      const arc = new THREE.Mesh(new THREE.TorusGeometry(.32,.01,8,48,Math.PI), brass); arc.position.set(0, 0, -.3); arc.rotation.y = Math.PI/2; g.add(arc);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.012,48), new THREE.MeshStandardMaterial({color:"#eef5f7", roughness:.02, transparent:true, opacity:.5})); lens.position.set(0, .3, -.3); lens.rotation.x = .5; g.add(lens);
      const puff = new THREE.Group(); scene.add(puff); const puffs = []; for(let k=0;k<14;k++){ const sm = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 12), new THREE.MeshStandardMaterial({color:"#e9e6df", transparent:true, opacity:0, depthWrite:false})); puff.add(sm); puffs.push(sm); }
      let fired = -1; const muzzle = north.clone().multiplyScalar(.45).setY(1.05);
      const fire = () => { fired = performance.now(); puffs.forEach(sm => { sm.position.copy(muzzle); sm.userData.v = north.clone().multiplyScalar(1.2 + Math.random()).add(new THREE.Vector3((Math.random()-.5)*.6, .3 + Math.random()*.5, (Math.random()-.5)*.6)); }); dirty = 3; };
      onWin("wending-cannon", fire);
      anims.push(() => { if(fired < 0) return; const tt = (performance.now() - fired)/1000; puffs.forEach(sm => { sm.position.addScaledVector(sm.userData.v, .016); sm.userData.v.multiplyScalar(.97); sm.scale.setScalar(1 + tt*3); sm.material.opacity = Math.max(0, .8 - tt*.25); }); if(tt > 4) fired = -1; });
      block.userData.hit = read; barrel.userData.hit = read; picks.push(block, barrel);
    }
  }
  /* ---- the cabinet of dials, under the colonnade: open it, look in, and choose ---- */
  function buildDialCabinet(p, faces, spot){
    const W = wallAt(faces, 0) || wallAt(faces, 2); if(!W) return;
    const t0 = [W.len*.5, W.len*.3, W.len*.7].find(t => W.free(t, 1.8)) ?? W.len*.5, c = W.at(t0, .02);
    const g = new THREE.Group(); g.position.copy(c); g.rotation.y = W.yaw; scene.add(g);
    const wood = mat("#5e4632"), dark = mat("#2b2219"), brass = mat("#b39a62",{metalness:.6, roughness:.35}), glassM = new THREE.MeshStandardMaterial({color:"#e8eef0", roughness:.05, transparent:true, opacity:.25});
    const w = 1.7, h = 2.1, dpt = .5;
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, .03), dark); back.position.set(0, .3 + h/2, .015); g.add(back);
    [-1,1].forEach(sx => { const side = new THREE.Mesh(new THREE.BoxGeometry(.05, h, dpt), wood); side.position.set(sx*(w/2-.025), .3 + h/2, dpt/2); side.castShadow = true; g.add(side); });
    const top = new THREE.Mesh(new THREE.BoxGeometry(w+.12, .1, dpt+.06), wood); top.position.set(0, .3 + h, dpt/2); g.add(top);
    const base = new THREE.Mesh(new THREE.BoxGeometry(w+.06, .3, dpt+.04), wood); base.position.set(0, .15, dpt/2); g.add(base);
    [.3, .3 + h*.5].forEach(y => { const sh = new THREE.Mesh(new THREE.BoxGeometry(w-.1, .03, dpt-.04), mat("#8a6a45")); sh.position.set(0, y + .015, dpt/2); sh.receiveShadow = true; g.add(sh); });
    // the doors: two glazed leaves that swing open when you come close
    const doors = [-1, 1].map(sx => { const hinge = new THREE.Group(); hinge.position.set(sx*(w/2-.02), .3, dpt); g.add(hinge);
      const fr = new THREE.Group(); hinge.add(fr); const dw = w/2 - .03;
      [[0, h/2, dw, .05], [0, -h/2 + .03, dw, .05], [-dw/2 + .025, 0, .05, h], [dw/2 - .025, 0, .05, h]].forEach(([x, y, ww, hh]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, .04), wood); m.position.set(-sx*dw/2 + x, h/2 + y - .02, 0); fr.add(m); });
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(dw - .1, h - .1), glassM); gl.position.set(-sx*dw/2, h/2, 0); fr.add(gl);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(.02, 16, 12), brass); knob.position.set(-sx*(dw - .06), h/2, .03); fr.add(knob);
      return {hinge, sx}; });
    let open = 0, openTo = 0; anims.push((tt, dt) => { if(Math.abs(open - openTo) < .001) return; open += (openTo - open)*Math.min(1, (dt||.016)*4); doors.forEach(d => d.hinge.rotation.y = d.sx*open*1.9); dirty = 2; });
    // the five dials in small
    const kinds = Object.keys(p.dials || {}), cur = p.dialType || "horizontal";
    kinds.forEach((k, i) => { const row = i < 3 ? 1 : 0, n = row ? 3 : 2, j = row ? i : i - 3, x = -w/2 + (j + .5)*w/n, y = .3 + h*.5*row + .05;
      const m = miniDial(k, brass, stoneM2(), spot); m.position.set(x, y, dpt*.45); g.add(m);
      const tag = skyLabel(p.dials[k].name.replace(/^The /, ""), new THREE.Vector3(0,0,0), "#e9dcc0", 22, .9, .22, true); g.remove(tag); scene.remove(tag); tag.position.set(x, y + .58, dpt*.6); g.add(tag);
      if(k === cur){ const ring = new THREE.Mesh(new THREE.RingGeometry(.2, .23, 40), new THREE.MeshBasicMaterial({color:"#e8c77a"})); ring.rotation.x = -Math.PI/2; ring.position.set(x, y + .005, dpt*.45); ring.layers.set(1); g.add(ring); }
      m.userData.hit = {kind:"use", label: k === cur ? `${p.dials[k].name}: in the court now` : `${p.dials[k].name}: carry it out into the court`, onClick:()=> { if(k !== cur) hooks.setDial && hooks.setDial(k); }}; picks.push(m); });
    const eye = W.at(t0, 1.35).setY(1.45), aim = W.at(t0, .2).setY(1.05);
    const hit = {kind:"closer", label:"The cabinet of dials: open it", onClick:()=>{ openTo = 1; peek(eye, aim); }};
    back.userData.hit = hit; doors.forEach(d => { d.hinge.userData.hit = hit; picks.push(d.hinge); }); picks.push(back);
    onWin("wending-unpeek", () => { openTo = 0; });
  }
  // listeners that belong to one room's build, removed when the next room is built
  let winL = []; function onWin(type, fn){ window.addEventListener(type, fn); winL.push([type, fn]); }
  // step up to the dial in the middle of the court and look down at its face (or, for the glass sphere, at the paving)
  function lookAtDial(near){ const from = cam.pos.clone().setY(0); if(from.lengthSq() < .01) from.set(0,0,1); from.normalize();
    if(near) peek(from.clone().multiplyScalar(1.15).setY(2.05), new THREE.Vector3(0, .92, 0));
    else peek(from.clone().multiplyScalar(3.2).setY(2.6), new THREE.Vector3(0, 0, 0)); }
  function stoneM2(){ return mat("#c4bba6"); }
  function miniDial(k, brass, stone, spot){
    const g = new THREE.Group(), add = (geo, m, x=0, y=0, z=0, rx=0, ry=0, rz=0) => { const me = new THREE.Mesh(geo, m); me.position.set(x,y,z); me.rotation.set(rx,ry,rz); me.castShadow = true; g.add(me); return me; };
    add(new THREE.CylinderGeometry(.16,.18,.05,40), stone, 0,.025);
    if(k === "horizontal"){ add(new THREE.CylinderGeometry(.14,.14,.01,48), brass, 0,.06); const sh = new THREE.Shape(); sh.moveTo(0,0); sh.lineTo(.12,0); sh.lineTo(.12,.1); sh.lineTo(0,0); add(new THREE.ExtrudeGeometry(sh,{depth:.006,bevelEnabled:false}), brass, -.06,.065,0); }
    if(k === "armillary"){ add(new THREE.CylinderGeometry(.02,.03,.18,16), stone, 0,.14); [0,1,2].forEach(i => add(new THREE.TorusGeometry(.12,.006,8,48), brass, 0,.33,0, i===0?Math.PI/2:0.8, i===2?Math.PI/2:0, 0)); add(new THREE.CylinderGeometry(.004,.004,.32,8), brass, 0,.33,0, .75,0,0); }
    if(k === "meantime"){ add(new THREE.CylinderGeometry(.14,.14,.01,48), mat("#cdbd92"), 0,.06); const pts = []; for(let i=0;i<=48;i++){ const a = i/48*TAU; pts.push(new THREE.Vector3(.03*Math.sin(2*a), .067, .07*Math.sin(a))); } add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 64, .003, 6, true), mat("#7a2b1e")); add(new THREE.CylinderGeometry(.002,.002,.06,6), brass, 0,.09,-.08); add(new THREE.SphereGeometry(.008,12,8), brass, 0,.12,-.08); }
    if(k === "meridiana"){ add(new THREE.CylinderGeometry(.02,.03,.36,24), stone, 0,.23); add(new THREE.SphereGeometry(.035,32,24), new THREE.MeshStandardMaterial({color:"#eef5f7", roughness:.02, transparent:true, opacity:.6}), 0,.44); }
    if(k === "cannon"){ add(new THREE.BoxGeometry(.2,.08,.12), stone, 0,.09); add(new THREE.CylinderGeometry(.018,.025,.22,24), mat("#6e5a34",{metalness:.7,roughness:.38}), 0,.16,0, 0,0,Math.PI/2); add(new THREE.TorusGeometry(.06,.003,6,32,Math.PI), brass, .02,.16,0, 0,Math.PI/2,0); }
    g.scale.setScalar(1.6); return g;
  }
  /* ---- a book on a stand: the linking books against a wall, the log book on its podium in the middle of the room ---- */
  function buildPedestal(sl, o, i, p, spot){
    const centre = o.mount === "center", f = sl.face, u = f.b.clone().sub(f.a).normalize(), len = f.a.distanceTo(f.b);
    let at;
    if(centre) at = new THREE.Vector3(0, 0, -.6);
    else { const t = [len*.5, len*.25, len*.75, len*.15, len*.85].find(t => !f.holes.some(h => Math.abs(h.at - t) < h.w/2 + .9)) ?? len*.5; at = f.a.clone().add(u.clone().multiplyScalar(t)).add(f.n.clone().multiplyScalar(1.5)); }
    const g = new THREE.Group(); g.position.copy(at); const toward = centre ? new THREE.Vector3(0,0,2.2) : f.n.clone(); g.rotation.y = Math.atan2(toward.x, toward.z); scene.add(g);
    const stone = mat("#c2b8a2"), wood = mat("#4a3726"), brass = mat("#b39a62",{metalness:.6, roughness:.35});
    if(centre){ // a stepped stone podium with a sloped oak desk
      [[.62,.1,0],[.5,.1,.1]].forEach(([r,h,y]) => { const st = new THREE.Mesh(new THREE.CylinderGeometry(r, r+.03, h, 8), stone); st.position.y = y + h/2; st.castShadow = st.receiveShadow = true; g.add(st); });
      const shaft = lathe([[0,.2],[.2,.2],[.2,.26],[.13,.32],[.11,.7],[.15,.8],[.2,.86],[0,.86]], stone, 8); shaft.castShadow = true; g.add(shaft);
    } else {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(.24,.28,.08,24), brass); base.position.y = .04; g.add(base);
      const col = lathe([[0,.08],[.06,.08],[.035,.2],[.03,.75],[.05,.82],[.07,.86],[0,.86]], brass, 20); col.castShadow = true; g.add(col);
    }
    const desk = new THREE.Group(); desk.position.y = centre ? .9 : .9; desk.rotation.x = -.42; g.add(desk);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(centre ? .78 : .52, .04, centre ? .58 : .4), wood); slab.castShadow = true; desk.add(slab);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(centre ? .78 : .52, .05, .02), wood); lip.position.set(0, .04, (centre ? .29 : .2)); desk.add(lip);
    const book = model(o.icon, spot, R0); book.position.y = .02; book.scale.multiplyScalar(centre ? 2.2 : 1.6); desk.add(book);
    const hit = {kind:"use", label: o.title, onClick:()=>hooks.useObject(o)}; g.userData.hit = hit; picks.push(g); glint(g, new THREE.Vector3(.22, 1.25, .1), o, sl.face.slot);
    if(o.icon === "linkbook"){ // the panel glows faintly, and moves
      const glow = new THREE.PointLight("#cfe0ff", .8, 1.6, 2); glow.position.set(0, 1.15, .15); g.add(glow);
      anims.push(t => { glow.intensity = .6 + .25*Math.sin(t*1.7); }); }
    stations["p" + (o.title||i)] = {view: at.clone().add(toward.clone().normalize().multiplyScalar(.9)).setY(1.55), top: at.clone().setY(.95)};
  }
  /* ---- the things themselves, as small models ---- */
  // the incense trail: a square meander, outside in, burned from its start by the fraction of the day since 11 pm
  function incensePath(){ const pts = [[.06,.06]]; let x = .06, y = .06, len = .88, k = 0; const step = .07; const legs = [len]; while(len > step){ legs.push(len); len -= step; legs.push(len); }
    legs.forEach((L, i) => { const [dx, dy] = [[1,0],[0,1],[-1,0],[0,-1]][i % 4]; x += dx*L; y += dy*L; pts.push([x,y]); }); return pts; }
  const INC = incensePath(), INC_SEG = INC.slice(1).map((p,i) => Math.hypot(p[0]-INC[i][0], p[1]-INC[i][1])), INC_LEN = INC_SEG.reduce((a,b) => a+b, 0);
  const dayFrac = d => (((d.getHours() + 1) % 24)*3600 + d.getMinutes()*60 + d.getSeconds())/86400;
  function incensePoint(d){ let r = dayFrac(d)*INC_LEN; for(let i=0;i<INC_SEG.length;i++){ if(r <= INC_SEG[i]){ const a = INC[i], b = INC[i+1], t = r/INC_SEG[i]; return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, i]; } r -= INC_SEG[i]; } return [...INC[INC.length-1], INC_SEG.length-1]; }
  function incenseTrail(gg, w, h, d){ const [ex, ey, ei] = incensePoint(d); gg.lineCap = "round"; gg.lineJoin = "round"; gg.lineWidth = w*.022;
    gg.strokeStyle = "#7a5a3a"; gg.beginPath(); gg.moveTo(ex*w, ey*h); INC.slice(ei+1).forEach(p => gg.lineTo(p[0]*w, p[1]*h)); gg.stroke();
    gg.strokeStyle = "rgba(240,236,228,.95)"; gg.beginPath(); gg.moveTo(INC[0][0]*w, INC[0][1]*h); INC.slice(1, ei+1).forEach(p => gg.lineTo(p[0]*w, p[1]*h)); gg.lineTo(ex*w, ey*h); gg.stroke(); }
  function wadokeiFace(gg, w, h, d){ const cx = w/2, cy = h/2, r = w*.48, st = hooks.sunTimes ? hooks.sunTimes() : {};
    gg.fillStyle = "#1e1a16"; gg.beginPath(); gg.arc(cx, cy, r, 0, TAU); gg.fill();
    if(st.rise && st.set){ const ang = t => { const x = new Date(t), hh = x.getHours() + x.getMinutes()/60; return (hh/24)*TAU + Math.PI/2; };   // noon at the top
      const dawn = st.rise - 36*6e4, dusk = st.set + 36*6e4; gg.fillStyle = "#d9b866"; gg.beginPath(); gg.moveTo(cx, cy); gg.arc(cx, cy, r*.96, ang(dawn), ang(dusk)); gg.closePath(); gg.fill();
      const names = ["卯","辰","巳","午","未","申","酉","戌","亥","子","丑","寅"], dl = (dusk - dawn)/6, nl = (dawn + 864e5 - dusk)/6;
      gg.font = `bold ${w*.085}px serif`; gg.textAlign = "center"; gg.textBaseline = "middle";
      names.forEach((c, k) => { const t0 = k < 6 ? dawn + k*dl : dusk + (k-6)*nl, a = ang(t0), am = ang(t0 + (k < 6 ? dl : nl)/2);
        gg.strokeStyle = "#1e1a16"; gg.lineWidth = 3; gg.beginPath(); gg.moveTo(cx + Math.cos(a)*r*.5, cy + Math.sin(a)*r*.5); gg.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r); gg.stroke();
        gg.fillStyle = k < 6 ? "#1e1a16" : "#e8dcc0"; gg.fillText(c, cx + Math.cos(am)*r*.76, cy + Math.sin(am)*r*.76); }); }
    gg.fillStyle = "#b39a62"; gg.beginPath(); gg.arc(cx, cy, r*.12, 0, TAU); gg.fill(); }
  function dialFace(gg, w, h, dec){ const cx = w/2, cy = h/2, r = w*.48; gg.fillStyle = "#f1ead8"; gg.beginPath(); gg.arc(cx, cy, r, 0, TAU); gg.fill(); gg.strokeStyle = "#2a251e"; gg.lineWidth = 3; gg.stroke();
    gg.fillStyle = "#2a251e"; gg.textAlign = "center"; gg.textBaseline = "middle";
    if(dec){ for(let k=0;k<100;k++){ const a = k/100*TAU - Math.PI/2, r0 = k%10 ? r*.9 : r*.82; gg.lineWidth = k%10 ? 1 : 3; gg.beginPath(); gg.moveTo(cx + Math.cos(a)*r0, cy + Math.sin(a)*r0); gg.lineTo(cx + Math.cos(a)*r*.97, cy + Math.sin(a)*r*.97); gg.stroke(); }
      gg.font = `${w*.1}px ${FELL}`; for(let k=0;k<10;k++){ const a = k/10*TAU - Math.PI/2; gg.fillText(k === 0 ? "10" : String(k), cx + Math.cos(a)*r*.68, cy + Math.sin(a)*r*.68); } }
    else { const R = ["I","II","III","IIII","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIIII","XV","XVI","XVII","XVIII","XIX","XX","XXI","XXII","XXIII","XXIIII"]; gg.font = `${w*.05}px ${FELL}`;
      for(let k=1;k<=24;k++){ const a = -k/24*TAU + Math.PI/2; gg.save(); gg.translate(cx + Math.cos(a)*r*.8, cy + Math.sin(a)*r*.8); gg.rotate(a + Math.PI/2); gg.fillText(R[k-1], 0, 0); gg.restore(); }
      gg.fillStyle = "#d9b866"; gg.beginPath(); gg.arc(cx, cy, r*.22, 0, TAU); gg.fill(); } }
  function model(icon, spot, R){
    const g = new THREE.Group(), s = .9;
    const paper = mat("#ece6d6"), ink = mat("#2a251e"), brass = mat("#b39a62", {metalness:.6, roughness:.35}), wood = mat("#6e5743"), sp = mat("#"+spot.getHexString());
    const add = (geo, m, x=0, y=0, z=0, rx=0, ry=0, rz=0) => { const me = new THREE.Mesh(geo, m); me.position.set(x,y,z); me.rotation.set(rx,ry,rz); g.add(me); return me; };
    switch(icon){
      case "rule": add(new THREE.BoxGeometry(.5,.025,.07), paper, 0,.013); add(new THREE.BoxGeometry(.5,.012,.025), sp, 0,.03); add(new THREE.BoxGeometry(.05,.04,.09), brass, .08,.03); break;
      case "net": add(new THREE.CylinderGeometry(.03,.06,.06,24), wood, 0,.03); add(new THREE.SphereGeometry(.13,48,32), paper, 0,.2); add(new THREE.TorusGeometry(.14,.008,12,64), brass, 0,.2,0, 0,0,.4); add(new THREE.TorusGeometry(.14,.006,12,64), ink, 0,.2,0, Math.PI/2,0,0); break;
      case "turns": add(new THREE.CylinderGeometry(.03,.06,.06,24), wood, 0,.03); add(new THREE.SphereGeometry(.13,48,32), paper, 0,.2); add(new THREE.TorusGeometry(.135,.01,12,48,2.2), sp, 0,.2,0, .5,.3,0); add(new THREE.TorusGeometry(.135,.01,12,48,1.6), ink, 0,.2,0, -.3,1.2,.4); break;
      case "planimeter": add(new THREE.CylinderGeometry(.02,.02,.02,20), ink, -.18,.01,0); add(new THREE.BoxGeometry(.25,.012,.02), brass, -.06,.03,-.04,0,.5,0); add(new THREE.BoxGeometry(.25,.012,.02), brass, .14,.03,.02,0,-.4,0); add(new THREE.CylinderGeometry(.04,.04,.015,32), paper, .04,.04,-.02, Math.PI/2,0,0); break;
      case "cross": for(let k=-3;k<=3;k++) add(new THREE.BoxGeometry(.008,.005,.32), ink, k*.03,.01,0,0,k*.12,0); add(new THREE.BoxGeometry(.34,.006,.01), sp, 0,.012,.06); break;
      case "plant": add(new THREE.CylinderGeometry(.08,.06,.12,24), sp, 0,.06); for(let k=0;k<7;k++) add(new THREE.ConeGeometry(.02,.3,10), mat("#55623f"), Math.sin(k)*.05,.27,Math.cos(k)*.05, Math.sin(k*2)*.4,0,Math.cos(k*2)*.4); break;
      case "cards": for(let k=0;k<3;k++) add(new THREE.BoxGeometry(.1,.004,.15), k===1?sp:paper, (k-1)*.06,.005+k*.004,0,0,(k-1)*.3,0); break;
      case "lock": add(new THREE.BoxGeometry(.16,.13,.08), brass, 0,.065); add(new THREE.TorusGeometry(.055,.014,16,40,Math.PI), mat("#3a3a3a",{metalness:.6}), 0,.13,0); for(let k=0;k<4;k++) add(new THREE.CylinderGeometry(.015,.015,.01,20), paper, -.05+k*.033,.08,.045, Math.PI/2,0,0); break;
      case "tiles": for(let i=0;i<4;i++) for(let j=0;j<4;j++){ if(i===3&&j===3) continue; add(new THREE.BoxGeometry(.045,.02,.045), (i+j)%2?paper:sp, -.075+j*.05,.01,-.075+i*.05); } add(new THREE.BoxGeometry(.22,.008,.22), wood, 0,-.002,0); break;
      case "crystal": for(let i=-2;i<=2;i++) for(let j=-2;j<=2;j++) if(i*i+j*j<7) add(new THREE.SphereGeometry(.018,16,12), (i===1&&j===0)?sp:ink, i*.04+(j%2)*.02,.06+j*.035,0); add(new THREE.BoxGeometry(.24,.01,.06), wood, 0,.005,0); break;
      case "tree": { const br=(x,y,len,a,dd)=>{ const x2=x+Math.sin(a)*len, y2=y+Math.cos(a)*len; const cyl=add(new THREE.CylinderGeometry(.004+dd*.002,.005+dd*.003,len,10), ink,(x+x2)/2,(y+y2)/2,0,0,0,-a); if(dd===0){ add(new THREE.SphereGeometry(.012,12,10), sp, x2,y2,0); return; } [-.5,0,.5].forEach(t=>br(x2,y2,len*.6,a+t,dd-1)); }; br(0,0,.14,0,3); add(new THREE.CylinderGeometry(.06,.07,.02,24), wood,0,.0,0); break; }
      case "book": case "unwritten": { const m = icon==="unwritten" ? mat("#e9e3d3", {transparent:true, opacity:.75}) : mat(["#6b4a3a","#3e4a58","#55583e"][Math.floor(R()*3)]); add(new THREE.BoxGeometry(.17,.04,.24), m, 0,.02,0); add(new THREE.BoxGeometry(.16,.032,.23), paper, .005,.02,0); add(new THREE.BoxGeometry(.06,.002,.03), brass, 0,.041,-.04); break; }
      case "books": for(let k=0;k<4;k++) add(new THREE.BoxGeometry(.2-k*.02,.035,.26-k*.02), mat(["#6b4a3a","#3e4a58","#55583e","#"+spot.getHexString()][k]), (R()-.5)*.02,.018+k*.036,0,0,(R()-.5)*.3,0); break;
      case "scroll": add(new THREE.CylinderGeometry(.025,.025,.28,24), paper, 0,.025,0,0,0,Math.PI/2); add(new THREE.CylinderGeometry(.012,.012,.32,16), wood, 0,.025,0,0,0,Math.PI/2); add(new THREE.BoxGeometry(.2,.002,.12), paper, 0,.002,.08); break;
      case "lectern": add(new THREE.CylinderGeometry(.02,.03,.4,16), wood, 0,.2); add(new THREE.BoxGeometry(.3,.02,.22), wood, 0,.42,0,-.4,0,0); add(new THREE.BoxGeometry(.26,.01,.18), paper, 0,.44,.005,-.4,0,0); break;
      case "clock": add(new THREE.CylinderGeometry(.12,.12,.04,64), brass, 0,.13,0,Math.PI/2,0,0); add(new THREE.CylinderGeometry(.105,.105,.045,64), paper, 0,.13,.003,Math.PI/2,0,0); add(new THREE.BoxGeometry(.008,.07,.005), ink, 0,.16,.03); add(new THREE.BoxGeometry(.05,.006,.005), sp, .02,.13,.03); add(new THREE.BoxGeometry(.06,.02,.06), wood, 0,.01,0); break;
      case "hourglass": add(new THREE.CylinderGeometry(.08,.08,.015,32), wood, 0,.008); add(new THREE.CylinderGeometry(.08,.08,.015,32), wood, 0,.29); add(new THREE.CylinderGeometry(.06,.005,.13,32,1,true), mat("#e8eceb",{transparent:true,opacity:.5}), 0,.21); add(new THREE.CylinderGeometry(.005,.06,.13,32,1,true), mat("#e8eceb",{transparent:true,opacity:.5}), 0,.08); add(new THREE.ConeGeometry(.045,.05,32), sp, 0,.04); break;
      case "compass": add(new THREE.CylinderGeometry(.09,.09,.03,48), brass, 0,.015); add(new THREE.CylinderGeometry(.08,.08,.032,48), paper, 0,.016); add(new THREE.ConeGeometry(.012,.07,8), sp, 0,.035,-.03, -Math.PI/2,0,0); add(new THREE.ConeGeometry(.012,.07,8), ink, 0,.035,.03, Math.PI/2,0,0); break;
      case "lamp": add(new THREE.CylinderGeometry(.07,.08,.03,24), mat("#2a2520"), 0,.015); add(new THREE.CylinderGeometry(.06,.06,.16,24,1,true), mat("#e8eceb",{transparent:true,opacity:.45}), 0,.11); add(new THREE.SphereGeometry(.03,16,12), new THREE.MeshBasicMaterial({color:"#ffd27a"}), 0,.1); add(new THREE.CylinderGeometry(.07,.06,.03,24), mat("#2a2520"), 0,.2); break;
      case "key": add(new THREE.TorusGeometry(.035,.01,16,32), brass, -.06,.012,0,Math.PI/2,0,0); add(new THREE.BoxGeometry(.12,.012,.012), brass, .03,.012,0); add(new THREE.BoxGeometry(.012,.012,.03), brass, .08,.012,.015); break;
      case "pond": add(new THREE.CylinderGeometry(.14,.14,.02,48), mat("#7d9aa3"), 0,.01); for(let k=0;k<5;k++) add(new THREE.CylinderGeometry(.03,.03,.006,24), mat("#5f7445"), Math.sin(k*2.4)*.07,.024,Math.cos(k*2.4)*.07); break;
      case "fraction": add(new THREE.BoxGeometry(.12,.004,.17), paper, 0,.003); add(new THREE.BoxGeometry(.06,.006,.004), ink, 0,.006,0); add(new THREE.BoxGeometry(.012,.006,.035), sp, 0,.006,-.035); add(new THREE.BoxGeometry(.012,.006,.035), sp, 0,.006,.035); break;
      case "note": add(new THREE.BoxGeometry(.15,.003,.2), paper, 0,.002,0,0,.2,0); for(let k=0;k<4;k++) add(new THREE.BoxGeometry(.1,.004,.004), ink, 0,.004,-.05+k*.03,0,.2,0); break;
      case "map": add(new THREE.BoxGeometry(.26,.003,.18), paper, 0,.002); add(new THREE.BoxGeometry(.004,.006,.18), ink, -.043,.003); add(new THREE.BoxGeometry(.004,.006,.18), ink, .043,.003); add(new THREE.TorusGeometry(.03,.004,8,24), sp, .05,.004,.03,Math.PI/2,0,0); break;
      case "pendulum": add(new THREE.CylinderGeometry(.003,.003,.35,8), ink, 0,.2); add(new THREE.SphereGeometry(.04,32,24), brass, 0,.03); break;
      case "hex": { const sh = new THREE.Shape(); for(let k=0;k<6;k++){ const t=k*Math.PI/3; k? sh.lineTo(Math.cos(t)*.12,Math.sin(t)*.12) : sh.moveTo(.12,0); } add(new THREE.ExtrudeGeometry(sh,{depth:.03,bevelEnabled:false}), paper, 0,.03,0,-Math.PI/2,0,0); break; }
      case "orrery": add(new THREE.CylinderGeometry(.06,.08,.12,24), wood, 0,.06); add(new THREE.SphereGeometry(.04,32,24), brass, 0,.17);
        [.08,.12,.16].forEach((r,k) => { add(new THREE.TorusGeometry(r,.003,8,80), brass, 0,.15,0, Math.PI/2,0,0); add(new THREE.SphereGeometry(.014+k*.004,20,16), k===1?sp:ink, Math.cos(k*2.2)*r,.15,Math.sin(k*2.2)*r); }); break;
      case "logbook": { // a great ledger lying open, ruled pages, a red ribbon
        const pageTex = canvasTex(512, 360, (gg,w,h) => { gg.fillStyle = "#efe6cf"; gg.fillRect(0,0,w,h); gg.strokeStyle = "rgba(90,70,50,.35)"; gg.lineWidth = 1; for(let y=40;y<h-20;y+=14){ gg.beginPath(); gg.moveTo(20,y); gg.lineTo(w/2-16,y); gg.moveTo(w/2+16,y); gg.lineTo(w-20,y); gg.stroke(); }
          gg.strokeStyle = "rgba(140,60,40,.5)"; gg.beginPath(); gg.moveTo(70,30); gg.lineTo(70,h-20); gg.moveTo(w/2+66,30); gg.lineTo(w/2+66,h-20); gg.stroke();
          gg.fillStyle = "rgba(40,30,20,.75)"; gg.font = `italic 13px ${FELL}`; for(let y=52, k=0; y<h-40; y+=28, k++){ gg.fillText(["The Art of Memory","Ficciones","Elements","Maze","Naive Lie Theory","The Name of the Rose","Visual Complex Analysis","The Sand Reckoner","Geometry and the Imagination","On Quaternions and Octonions","Mathematical Gems II"][k%11], 78, y); gg.fillText(["Yates","Borges","Euclid","Manson","Stillwell","Eco","Needham","Archimedes","Hilbert","Conway","Honsberger"][k%11], w/2+74, y); }
          gg.fillStyle = "rgba(60,40,20,.25)"; gg.fillRect(w/2-8, 0, 16, h); });
        add(new THREE.BoxGeometry(.3,.025,.21), mat("#5b2a22"), 0,.012);
        const pages = add(new THREE.BoxGeometry(.29,.02,.2), mat("#ffffff",{map:pageTex}), 0,.032); 
        add(new THREE.CylinderGeometry(.012,.012,.2,24), mat("#efe6cf"), -.072,.044,0, Math.PI/2,0,0); add(new THREE.CylinderGeometry(.012,.012,.2,24), mat("#efe6cf"), .072,.044,0, Math.PI/2,0,0);
        add(new THREE.BoxGeometry(.008,.002,.14), mat("#9a2a22"), .01,.045,.06); break; }
      case "linkbook": { // a small book open on its stand, a moving picture on the right-hand page
        add(new THREE.BoxGeometry(.2,.018,.14), mat("#3c2c1e"), 0,.009);
        add(new THREE.BoxGeometry(.09,.012,.13), paper, -.048,.024); add(new THREE.BoxGeometry(.09,.012,.13), paper, .048,.024);
        const panel = add(new THREE.PlaneGeometry(.062,.05), new THREE.MeshBasicMaterial({color:"#9fb6c8"}), .048,.031,-.005, -Math.PI/2,0,0); label(panel);
        anims.push(t => { panel.material.color.setHSL(.58 + .02*Math.sin(t*.6), .25, .6 + .06*Math.sin(t*1.3)); });
        const tt = canvasTex(128, 32, (gg,w,h) => { gg.fillStyle = "#3a2b1c"; gg.font = `italic 15px ${FELL}`; gg.textAlign = "center"; gg.fillText("linking book", w/2, 21); });
        add(new THREE.PlaneGeometry(.08,.02), new THREE.MeshBasicMaterial({map:tt, transparent:true}), -.048,.031,-.03, -Math.PI/2,0,0); break; }
      case "musicbox": { // a walnut music box, lid raised, a brass cylinder and comb inside
        add(new THREE.BoxGeometry(.2,.08,.13), mat("#5a3c26"), 0,.04); add(new THREE.BoxGeometry(.18,.002,.11), mat("#7a2e24"), 0,.081);
        const lid = new THREE.Group(); lid.position.set(0,.082,-.065); g.add(lid); const lidM = new THREE.Mesh(new THREE.BoxGeometry(.2,.012,.13), mat("#6a4730")); lidM.position.z = .065; lid.add(lidM); lid.rotation.x = -1.1;
        const cyl = add(new THREE.CylinderGeometry(.018,.018,.13,48), brass, 0,.07,-.01, 0,0,Math.PI/2); add(new THREE.BoxGeometry(.12,.004,.03), mat("#c9c2b0",{metalness:.7}), 0,.07,.025);
        add(new THREE.CylinderGeometry(.006,.006,.03,16), brass, .11,.04,0, 0,0,Math.PI/2); anims.push(t => { cyl.rotation.x = t*.4; }); break; }
      case "tray": { // a shallow brass-edged tray of green baize
        add(new THREE.BoxGeometry(.62,.012,.4), mat("#3f5a43"), 0,.006); [[0,.2,.62,.012],[0,-.2,.62,.012],[.31,0,.012,.4],[-.31,0,.012,.4]].forEach(([x,z,w,d]) => add(new THREE.BoxGeometry(w,.03,d), brass, x,.018,z)); break; }
      case "carriage": { // brass case, glass sides, a handle, and hands that keep house time
        const glass = mat("#e8eceb",{transparent:true, opacity:.28, roughness:.1});
        add(new THREE.BoxGeometry(.2,.02,.15), brass, 0,.01); add(new THREE.BoxGeometry(.18,.015,.13), brass, 0,.27);
        [[-.085,-.06],[.085,-.06],[-.085,.06],[.085,.06]].forEach(([x,z]) => add(new THREE.BoxGeometry(.018,.25,.018), brass, x,.14,z));
        add(new THREE.BoxGeometry(.15,.23,.002), glass, 0,.14,-.062); add(new THREE.BoxGeometry(.002,.23,.11), glass, -.084,.14,0); add(new THREE.BoxGeometry(.002,.23,.11), glass, .084,.14,0);
        add(new THREE.TorusGeometry(.055,.008,12,40,Math.PI), brass, 0,.285,0);
        add(new THREE.BoxGeometry(.15,.17,.004), brass, 0,.15,.061); add(new THREE.CylinderGeometry(.058,.058,.004,64), paper, 0,.16,.064, Math.PI/2,0,0);
        for(let k=0;k<12;k++){ const a = k/12*TAU; add(new THREE.BoxGeometry(.004,.012,.002), ink, Math.sin(a)*.05,.16+Math.cos(a)*.05,.067, 0,0,-a); }
        const hh = new THREE.Group(), mh = new THREE.Group(); hh.position.set(0,.16,.068); mh.position.set(0,.16,.07); g.add(hh); g.add(mh);
        const hb = new THREE.Mesh(new THREE.BoxGeometry(.008,.032,.002), ink); hb.position.y = .016; hh.add(hb);
        const mb = new THREE.Mesh(new THREE.BoxGeometry(.005,.048,.002), ink); mb.position.y = .024; mh.add(mb);
        const balance = add(new THREE.TorusGeometry(.012,.002,8,32), brass, 0,.25,0, Math.PI/2,0,0);
        anims.push(t => { const d = hooks.now(), m = d.getMinutes() + d.getSeconds()/60, h = (d.getHours()%12) + m/60; mh.rotation.z = -m/60*TAU; hh.rotation.z = -h/12*TAU; balance.rotation.z = .9*Math.sin(t*TAU*2.5); });
        break; }
      /* ---- the timekeepers that can stand in for the carriage clock, and the reckoning devices ---- */
      case "tk-hourglass": { // an hour glass in a turned frame; the sand runs down through the hour
        const glass = mat("#e8eceb",{transparent:true, opacity:.3, roughness:.1}), sand = mat("#c9a86a");
        add(new THREE.CylinderGeometry(.09,.09,.018,32), wood, 0,.009); add(new THREE.CylinderGeometry(.09,.09,.018,32), wood, 0,.33);
        [0,1,2].forEach(k => { const a = k/3*TAU; add(new THREE.CylinderGeometry(.007,.007,.31,10), wood, Math.sin(a)*.075,.17,Math.cos(a)*.075); });
        const bulb = [[.004,0],[.03,.012],[.058,.05],[.062,.09],[.05,.13],[.012,.155],[.005,.16]];
        const lo = lathe(bulb.map(([r,y]) => [r, y]), glass, 32); lo.position.y = .018; g.add(lo);
        const hi = lathe(bulb.map(([r,y]) => [r, .32 - y - .018]).reverse(), glass, 32); hi.position.y = .0; g.add(hi);
        const top = add(new THREE.ConeGeometry(.052,.09,32), sand, 0,.235,0, Math.PI,0,0), bot = add(new THREE.ConeGeometry(.056,.07,32), sand, 0,.055);
        const stream = add(new THREE.CylinderGeometry(.0015,.0015,.11,6), sand, 0,.13);
        anims.push(() => { const d = hooks.now(), f = (d.getMinutes()*60 + d.getSeconds())/3600, t = Math.max(.02, 1-f), b = Math.max(.02, f);
          top.scale.set(Math.sqrt(t), t, Math.sqrt(t)); top.position.y = .19 + .045*t; bot.scale.set(Math.sqrt(b), b, Math.sqrt(b)); bot.position.y = .02 + .035*b; stream.visible = t > .03; });
        break; }
      case "tk-clepsydra": { // an alabaster outflow vessel, wider at the top; the water falls through the night
        const stone = mat("#d9d0bb", {roughness:.7}), water = mat("#7fa3b5", {transparent:true, opacity:.75, roughness:.1});
        const v = lathe([[0,0],[.07,0],[.072,.01],[.11,.26],[.118,.27],[.112,.275],[.104,.265],[.066,.012],[0,.012]], stone, 48); g.add(v);
        for(let k=0;k<12;k++){ const a = k/12*Math.PI*.8 - Math.PI*.4; for(let h=1;h<12;h++){ const y = .02 + h/12*.24, r = .07 + (y/.26)*.04 + .003; add(new THREE.SphereGeometry(.0025,6,4), ink, Math.sin(a)*r, y, Math.cos(a)*r); } }
        add(new THREE.CylinderGeometry(.004,.004,.03,8), stone, 0,.02,.08, Math.PI/2,0,0);
        const surf = add(new THREE.CylinderGeometry(1,1,.004,40), water, 0,.2);
        anims.push(() => { const R = hooks.reckon && hooks.reckon(); const ns = R && R.nightSpan(hooks.now()); const f = !ns || ns.day ? 0 : (hooks.now().getTime() - ns.from)/(ns.to - ns.from);
          const y = .26 - .24*Math.min(1, Math.max(0, f)), r = .068 + (y/.26)*.04; surf.position.y = y; surf.scale.set(r, 1, r); });
        add(new THREE.CylinderGeometry(.13,.14,.02,32), wood, 0,-.01);
        break; }
      case "tk-candle": { // a horn lantern with a marked candle; one candle burns down every four hours
        const horn = mat("#e9c98a", {transparent:true, opacity:.42, roughness:.6}), wax = mat("#f1e8d2"), tin = mat("#4a4540", {metalness:.5, roughness:.5});
        add(new THREE.BoxGeometry(.16,.015,.16), tin, 0,.008); add(new THREE.BoxGeometry(.16,.015,.16), tin, 0,.36); add(new THREE.ConeGeometry(.11,.06,4), tin, 0,.395,0, 0,Math.PI/4,0); add(new THREE.TorusGeometry(.025,.005,8,20), tin, 0,.44,0);
        [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([x,z]) => add(new THREE.BoxGeometry(.01,.35,.01), tin, x*.075,.18,z*.075));
        [[0,.077,0],[0,-.077,0],[.077,0,Math.PI/2],[-.077,0,Math.PI/2]].forEach(([x,z,ry]) => add(new THREE.BoxGeometry(.15,.33,.002), horn, x,.18,z, 0,ry,0));
        const candle = add(new THREE.CylinderGeometry(.016,.016,1,20), wax, 0,.17); const flame = add(new THREE.SphereGeometry(.012,12,10), new THREE.MeshBasicMaterial({color:"#ffcf6a"}), 0,.3); flame.scale.y = 1.8;
        anims.push(t => { const d = hooks.now(), hrs = d.getHours() + d.getMinutes()/60, f = (hrs % 4)/4, h = .02 + .27*(1-f); candle.scale.y = h; candle.position.y = .016 + h/2; flame.position.y = .016 + h + .018; flame.scale.x = 1 + .12*Math.sin(t*13); });
        break; }
      case "tk-incense": { // a lacquered box, a bed of ash, and a trail of incense burning through the day
        add(new THREE.BoxGeometry(.26,.05,.26), mat("#3a1e18", {roughness:.4}), 0,.025); add(new THREE.BoxGeometry(.24,.004,.24), mat("#c9c2b2"), 0,.051);
        const tex = canvasTex(256, 256, (gg, w, h) => incenseTrail(gg, w, h, hooks.now()));
        const top = add(new THREE.PlaneGeometry(.23,.23), new THREE.MeshBasicMaterial({map:tex, transparent:true}), 0,.054,0, -Math.PI/2,0,0);
        let last = 0; anims.push(t => { if(t - last < 20) return; last = t; const gg = tex.image.getContext("2d"); gg.clearRect(0,0,256,256); incenseTrail(gg, 256, 256, hooks.now()); tex.needsUpdate = true; });
        const ember = add(new THREE.SphereGeometry(.006,10,8), new THREE.MeshBasicMaterial({color:"#ff6a2a"}), 0,.058,0); anims.push(() => { const pt = incensePoint(hooks.now()); ember.position.set(pt[0]*.23 - .115, .058, pt[1]*.23 - .115); });
        add(new THREE.BoxGeometry(.27,.012,.27), mat("#3a1e18"), 0,.002,0);
        break; }
      case "tk-wadokei": { // a Japanese lantern clock on its tall stand, the dial turning once a day under fixed hour plates set to today's dawn and dusk
        const stand = mat("#2b1c14", {roughness:.5}); add(new THREE.BoxGeometry(.16,.2,.16), stand, 0,.1); add(new THREE.BoxGeometry(.18,.015,.18), stand, 0,.205);
        add(new THREE.BoxGeometry(.13,.16,.13), brass, 0,.29); add(new THREE.SphereGeometry(.05,24,12,0,TAU,0,Math.PI/2), brass, 0,.37); add(new THREE.CylinderGeometry(.004,.004,.04,8), brass, 0,.43);
        const tex = canvasTex(256, 256, (gg, w, h) => wadokeiFace(gg, w, h, hooks.now()));
        const face = add(new THREE.CircleGeometry(.058, 48), new THREE.MeshBasicMaterial({map:tex}), 0,.29,.0655);
        const hand = new THREE.Group(); hand.position.set(0,.29,.068); g.add(hand); const hb = new THREE.Mesh(new THREE.BoxGeometry(.006,.05,.002), ink); hb.position.y = .025; hand.add(hb);
        let last = 0; anims.push(t => { const d = hooks.now(), h = d.getHours() + d.getMinutes()/60; hand.rotation.z = -(h/24)*TAU + Math.PI; if(t - last > 60){ last = t; const gg = tex.image.getContext("2d"); gg.clearRect(0,0,256,256); wadokeiFace(gg, 256, 256, d); tex.needsUpdate = true; } });
        break; }
      case "tk-decimal": case "tk-italian": { // a drum clock with a revolutionary dial (ten hours), or a 24-hour dial of Italian hours
        const dec = icon === "tk-decimal"; add(new THREE.BoxGeometry(.2,.025,.12), dec ? mat("#e9e1cf") : wood, 0,.012);
        add(new THREE.CylinderGeometry(.09,.09,.06,64), dec ? brass : wood, 0,.12,0, Math.PI/2,0,0); add(new THREE.BoxGeometry(.03,.03,.04), dec ? brass : wood, 0,.04);
        const tex = canvasTex(256, 256, (gg, w, h) => dialFace(gg, w, h, dec));
        add(new THREE.CircleGeometry(.08, 64), new THREE.MeshBasicMaterial({map:tex}), 0,.12,.031);
        const hh = new THREE.Group(), mh = new THREE.Group(); hh.position.set(0,.12,.033); mh.position.set(0,.12,.035); g.add(hh); if(dec) g.add(mh);
        const hb = new THREE.Mesh(new THREE.BoxGeometry(.007, dec ? .04 : .062, .002), ink); hb.position.y = dec ? .02 : .031; hh.add(hb);
        const mb = new THREE.Mesh(new THREE.BoxGeometry(.004,.062,.002), ink); mb.position.y = .031; mh.add(mb);
        anims.push(() => { const d = hooks.now(), R = hooks.reckon && hooks.reckon();
          if(dec){ const f = (d.getHours()*3600 + d.getMinutes()*60 + d.getSeconds())/86400; hh.rotation.z = -f*TAU; mh.rotation.z = -((f*10) % 1)*TAU; }
          else { const ih = R ? R.italianHour(d) : 0; hh.rotation.z = (ih/24)*TAU + Math.PI; } });
        break; }
      case "tkcase": { // a glass-fronted case with a timekeeper on each shelf
        const glass = mat("#e8eceb",{transparent:true, opacity:.22, roughness:.05});
        add(new THREE.BoxGeometry(.34,.46,.18), wood, 0,.23,-.01); add(new THREE.BoxGeometry(.3,.42,.002), glass, 0,.23,.081);
        [.13,.28].forEach(y => add(new THREE.BoxGeometry(.3,.008,.15), wood, 0,y,0));
        const sandM = mat("#c9a86a"); add(new THREE.ConeGeometry(.02,.04,16), sandM, -.08,.05+.02,0); add(new THREE.ConeGeometry(.02,.04,16), sandM, -.08,.05+.06,0, Math.PI,0,0);
        add(new THREE.CylinderGeometry(.008,.008,.07,10), mat("#f1e8d2"), .0,.17,0); add(new THREE.CylinderGeometry(.03,.025,.06,20), mat("#d9d0bb"), .08,.165,0);
        add(new THREE.CylinderGeometry(.035,.035,.012,32), brass, -.06,.33,0, Math.PI/2,0,0); add(new THREE.BoxGeometry(.06,.06,.06), brass, .07,.32,0); add(new THREE.BoxGeometry(.05,.012,.05), mat("#3a1e18"), 0,.04,.02);
        break; }
      case "calcab": { // a cabinet of shallow drawers, with a brass drum on top that turns to the house's calendar
        add(new THREE.BoxGeometry(.3,.3,.2), wood, 0,.15); for(let k=0;k<5;k++){ add(new THREE.BoxGeometry(.27,.045,.004), mat("#7d6450"), 0,.035+k*.056,.101); add(new THREE.SphereGeometry(.007,10,8), brass, 0,.035+k*.056,.106); }
        const drum = add(new THREE.CylinderGeometry(.05,.05,.24,40), brass, 0,.36,0, 0,0,Math.PI/2); add(new THREE.CylinderGeometry(.051,.051,.14,40,1,true), paper, 0,.36,0, 0,0,Math.PI/2);
        [-.13,.13].forEach(x => add(new THREE.BoxGeometry(.012,.07,.05), brass, x,.33,0));
        anims.push(t => { drum.rotation.x = Math.sin(t*.1)*.2; });
        break; }
      case "numerary": { // an abacus-like reckoning frame: rods of beads, a bar, and a row of number wheels on top
        const frame = mat("#3e2b1e"); [[-.16,0],[.16,0]].forEach(([x]) => add(new THREE.BoxGeometry(.015,.24,.04), frame, x,.12)); add(new THREE.BoxGeometry(.335,.015,.04), frame, 0,.24); add(new THREE.BoxGeometry(.335,.015,.04), frame, 0,.005); add(new THREE.BoxGeometry(.335,.01,.042), frame, 0,.17);
        const beadA = mat("#"+spot.getHexString(), {roughness:.4}), beadB = mat("#e9e1cf", {roughness:.4});
        for(let r=0;r<7;r++){ const x = -.135 + r*.045; add(new THREE.CylinderGeometry(.002,.002,.23,6), brass, x,.12);
          const R2 = rng(r*7+3); const up = Math.floor(R2()*2), lo = Math.floor(R2()*5);
          for(let k=0;k<2;k++){ const b = add(new THREE.SphereGeometry(.014,14,10), beadA, x, k < up ? .18 + k*.022 : .215 - (1-k)*.0, 0); b.scale.y = .7; b.position.y = k < up ? .182 + k*.021 : .212 + (k-1)*0 - (k===0 && up===0 ? .021 : 0); }
          for(let k=0;k<5;k++){ const b = add(new THREE.SphereGeometry(.014,14,10), beadB, x, k < lo ? .16 - k*.021 : .02 + (4-k)*.021, 0); b.scale.y = .7; } }
        for(let k=0;k<5;k++) add(new THREE.CylinderGeometry(.018,.018,.03,24), brass, -.08 + k*.04,.27,0, 0,0,Math.PI/2);
        break; }
      case "astrolabe": { const ring = add(new THREE.CylinderGeometry(.13,.13,.012,64), brass, 0,.2,0, Math.PI/2,0,0); add(new THREE.CylinderGeometry(.11,.11,.014,64), paper, 0,.2,.002, Math.PI/2,0,0);
        add(new THREE.TorusGeometry(.075,.006,12,64), ink, 0,.2,.012); add(new THREE.BoxGeometry(.22,.012,.006), sp, 0,.2,.014, 0,0,.5); add(new THREE.BoxGeometry(.04,.05,.02), brass, 0,.34,0);
        add(new THREE.CylinderGeometry(.02,.02,.06,20), mat("#e8eceb",{transparent:true,opacity:.6}), 0,.36,0); add(new THREE.BoxGeometry(.03,.2,.03), wood, 0,.1,-.02); add(new THREE.CylinderGeometry(.07,.08,.02,32), wood, 0,.01,-.02); break; }
      case "bell": add(new THREE.CylinderGeometry(.09,.1,.02,48), wood, 0,.01); add(new THREE.SphereGeometry(.075,48,24,0,TAU,0,Math.PI/2), brass, 0,.02); add(new THREE.CylinderGeometry(.006,.006,.04,16), brass, 0,.11); add(new THREE.SphereGeometry(.014,20,16), brass, 0,.135); break;
      default: add(new THREE.BoxGeometry(.16,.12,.16), wood, 0,.06); add(new THREE.BoxGeometry(.17,.02,.17), sp, 0,.12);
    }
    g.scale.setScalar(1.25*s);
    return g;
  }

  /* ---- fittings that belong to particular rooms ---- */
  /* ---- a joiner's kit: turned legs, tables, desks, chairs, benches, columns, panelling ---- */
  const lathe = (prof, m, seg=40) => new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r,y]) => new THREE.Vector2(r,y)), seg), m);
  function turnedLeg(h, r, m){ // a baluster: foot, swelling vase, ring, square-ish neck
    const P = [[0,0],[r*.9,0],[r,.04*h],[r*.7,.1*h],[r*1.25,.32*h],[r*.75,.52*h],[r*1.05,.58*h],[r*.7,.64*h],[r*.85,.92*h],[r*.95,h],[0,h]];
    const leg = lathe(P, m, 32); leg.castShadow = true; return leg; }
  function knob(m){ return new THREE.Mesh(new THREE.SphereGeometry(.018, 10, 8), m); }
  function table(w, d, h, opts={}){ // a joined table: moulded top, apron with drawers, turned legs, stretchers
    const g = new THREE.Group(), wood = mat(opts.wood || "#7d6248"), dark = mat(opts.dark || "#4a3b2e"), brass = mat("#b39a62",{metalness:.6, roughness:.35});
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, .045, d), mat(opts.topColor || "#9a7f5f")); top.position.y = h - .022; top.castShadow = top.receiveShadow = true; g.add(top);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(w-.03, .03, d-.03), dark); lip.position.y = h - .06; g.add(lip);
    if(opts.leather){ const lt = new THREE.Mesh(new THREE.BoxGeometry(w-.24, .004, d-.24), mat(opts.leather)); lt.position.y = h + .002; lt.receiveShadow = true; g.add(lt); }
    const ap = new THREE.Mesh(new THREE.BoxGeometry(w-.12, .13, d-.12), wood); ap.position.y = h - .14; g.add(ap);
    const nd = Math.max(1, Math.round(w/.7)); for(let i=0;i<nd;i++){ const x = -w/2 + .06 + (i+.5)*(w-.12)/nd, dw = (w-.12)/nd - .05;
      const dr = new THREE.Group(); dr.position.set(x, h-.14, 0); g.add(dr);
      const df = new THREE.Mesh(new THREE.BoxGeometry(dw, .09, .015), mat(opts.wood || "#86694d")); df.position.set(0, 0, d/2-.055); dr.add(df);
      const k = knob(brass); k.position.set(0, 0, d/2-.04); dr.add(k);
      // the drawer box behind the front, and a few things kept in it
      const inner = mat("#b49a78"), D2 = d*.55; [[0, -.04, d/2 - .06 - D2/2, dw - .02, .008, D2], [-dw/2 + .01, -.005, d/2 - .06 - D2/2, .008, .07, D2], [dw/2 - .01, -.005, d/2 - .06 - D2/2, .008, .07, D2], [0, -.005, d/2 - .065 - D2, dw - .02, .07, .008]].forEach(([bx, by, bz, bw, bh, bd]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), inner); b.position.set(bx, by, bz); dr.add(b); });
      const Rr = rng(hashStr("drawer" + i + w)); for(let j = 0; j < 3; j++){ const kind = Math.floor(Rr()*4), m2 = [mat("#ece6d6"), mat("#2a251e"), mat("#6b2f26"), brass][kind];
        const it = kind === 1 ? new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, .15, 6), m2) : kind === 3 ? new THREE.Mesh(new THREE.TorusGeometry(.018, .004, 6, 16), m2) : new THREE.Mesh(new THREE.BoxGeometry(.09 + Rr()*.06, .006, .12), m2);
        if(kind === 1) it.rotation.z = Math.PI/2; if(kind === 3) it.rotation.x = Math.PI/2; it.position.set((Rr() - .5)*(dw - .08), -.03, d/2 - .1 - Rr()*(D2 - .08)); it.rotation.y = (Rr() - .5); dr.add(it); }
      let open = 0, target = 0; df.userData.hit = {kind:"use", label:"A drawer: open it", onClick:() => { if(!focusKind()){ let o = df.parent; while(o && !(o.userData.hit && o.userData.hit.kind === "closer")) o = o.parent; if(o) return o.userData.hit.onClick(); } target = target ? 0 : D2*.85; df.userData.hit.label = target ? "The drawer: close it" : "A drawer: open it"; hooks.drawer && hooks.drawer(target > 0); }}; picks.push(df);
      anims.push(() => { if(Math.abs(target - open) > .0005){ open += (target - open)*.18; dr.position.z = open; dirty = 2; } }); }
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
  /* ---- original furniture for the Office (designs in claude/Wending-Furniture-Designs.md) ---- */
  // a flat ribbon of bent laminate: a centreline in the (z, y) plane, given a thickness in that plane and a width across (x)
  function ribbon(pts, thick, width, m){ const L = pts.length, up = [], dn = [];
    for(let i = 0; i < L; i++){ const a = pts[Math.max(0, i-1)], b = pts[Math.min(L-1, i+1)], tz = b[0] - a[0], ty = b[1] - a[1], n = Math.hypot(tz, ty) || 1, nz = -ty/n, ny = tz/n;
      up.push([pts[i][0] + nz*thick/2, pts[i][1] + ny*thick/2]); dn.push([pts[i][0] - nz*thick/2, pts[i][1] - ny*thick/2]); }
    const sh = new THREE.Shape(); sh.moveTo(up[0][0], up[0][1]); up.slice(1).forEach(q => sh.lineTo(q[0], q[1])); dn.reverse().forEach(q => sh.lineTo(q[0], q[1])); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, {depth: width, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 2, curveSegments: 4});
    g.rotateY(Math.PI/2); g.translate(-width/2, 0, 0); return new THREE.Mesh(g, m); }
  const arcPts = (cz, cy, r, a0, a1, n = 24) => Array.from({length: n + 1}, (_, i) => { const a = a0 + (a1 - a0)*i/n; return [cz + r*Math.sin(a), cy - r*Math.cos(a)]; });
  const WALNUT = () => mat("#5b3a24", {roughness:.45}), LEATHER = () => mat("#7a4326", {roughness:.55}), BRASS = () => mat("#b39a62", {metalness:.7, roughness:.3});
  // The balance rocker. Its runners are arcs of one circle (R = 0.60 m) centred near the seated body's centre of mass, so rocking hardly lifts the sitter:
  // it reclines with a fingertip and stays where it's left. A brass weight sliding under the seat sets how strongly it returns upright.
  function balanceRocker(){ const R = .60, group = new THREE.Group(), body = new THREE.Group(); group.add(body);
    const wal = WALNUT(), lea = LEATHER(), br = BRASS(), C = [0, R];   // the rocker's centre, R above the floor
    // each side frame: the runner (arc of the circle), curled-up ends as soft stops, a front post sweeping up into the arm, and a rear post from the arm's end down to the runner
    const A = .45, runner = arcPts(0, R, R, -A, A, 30), curlF = arcPts((R - .1)*Math.sin(A), R - (R - .1)*Math.cos(A), .1, A, A + 1, 8).slice(1), curlB = arcPts(-(R - .1)*Math.sin(A), R - (R - .1)*Math.cos(A), .1, -A, -A - 1, 8).slice(1);   // tangent-continuous curls of radius 0.1 m
    const frame = [...curlB.reverse(), ...runner, ...curlF];
    const post = [[.2, .05], [.27, .3], [.3, .52], [.24, .6], [.05, .62], [-.15, .6], [-.25, .56]];   // front post sweeping back into the arm
    [-1, 1].forEach(sx => { const x = sx*.36; const f = ribbon(frame, .03, .055, wal); f.position.x = x; body.add(f); const a = ribbon(post, .032, .055, wal); a.position.x = x; body.add(a); const rp = ribbon([[-.205, .038], [-.225, .3], [-.25, .56]], .032, .055, wal); rp.position.x = x; body.add(rp);
      const pv = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .012, 24), br); pv.rotation.z = Math.PI/2; pv.position.set(x + sx*.03, .42, -.02); body.add(pv); });
    // stretchers: two turned walnut rails and a brass rod tie the sides
    [[.2, .06], [-.22, .07]].forEach(([z, y]) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .72, 16), wal); s.rotation.z = Math.PI/2; s.position.set(0, y + .015, z); body.add(s); });
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .72, 10), br); rod.rotation.z = Math.PI/2; rod.position.set(0, .26, -.05); body.add(rod);
    // the cradle: a seat-and-back curve in channel-stitched leather over a webbing of straps, with a head bolster
    const seat = [[.3, .43], [.18, .40], [.05, .37], [-.08, .38], [-.18, .45], [-.27, .6], [-.34, .78], [-.39, .95]];
    const cr = []; for(let i = 0; i < seat.length - 1; i++){ const a = seat[i], b = seat[i+1], n = Math.max(1, Math.round(Math.hypot(b[0]-a[0], b[1]-a[1])/.055)); for(let k = 0; k < n; k++) cr.push([a[0] + (b[0]-a[0])*k/n, a[1] + (b[1]-a[1])*k/n]); }
    cr.forEach(([z, y], i) => { const roll = new THREE.Mesh(new THREE.CapsuleGeometry(.028, .6, 4, 14), lea); roll.rotation.z = Math.PI/2; roll.position.set(0, y + .02, z); roll.scale.set(1, 1, .95 + .1*Math.sin(i)); body.add(roll); });
    [-1, 1].forEach(sx => { const rail = ribbon(seat.map(([z, y]) => [z, y - .01]), .03, .03, wal); rail.position.x = sx*.325; body.add(rail); });
    const bolster = new THREE.Mesh(new THREE.CapsuleGeometry(.055, .5, 6, 16), lea); bolster.rotation.z = Math.PI/2; bolster.position.set(0, .99, -.36); body.add(bolster);
    // the sliding weight, under the seat
    const wt = new THREE.Mesh(new THREE.BoxGeometry(.12, .035, .07), br); wt.position.set(0, .31, -.02); body.add(wt);
    body.traverse(m => { if(m.isMesh){ m.castShadow = true; m.receiveShadow = true; } });
    // rolling: tilt θ about the circle's centre, which moves level with the floor by Rθ
    // rolling without slipping: turn by θ about the circle's centre C, and C travels level with the floor by Rθ
    let th = 0, target = 0; body.matrixAutoUpdate = false;
    const pose = () => { body.matrix.copy(new THREE.Matrix4().makeTranslation(0, R, R*th).multiply(new THREE.Matrix4().makeRotationX(th)).multiply(new THREE.Matrix4().makeTranslation(0, -R, 0))); body.matrixWorldNeedsUpdate = true; };
    pose();
    anims.push(() => { if(Math.abs(target - th) > .0005){ th += (target - th)*.06; pose(); } });
    const hit = new THREE.Mesh(new THREE.BoxGeometry(.8, 1.0, 1.0), new THREE.MeshBasicMaterial({visible:false, side:THREE.DoubleSide})); hit.position.set(0, .5, 0); group.add(hit);
    return {group, hit, toggle(){ target = target ? 0 : -.26; return target !== 0; }, set(v){ target = v; }}; }
  // the rocking footstool: its runners are arcs of a 0.9 m circle, so as the rocker leans back the stool tips a little to meet the legs; felt pads at the ends stop it
  function nestingStool(){ const g = new THREE.Group(), wal = WALNUT(), lea = LEATHER(), Ro = .9;
    const run = arcPts(0, Ro, Ro, -.24, .24, 16), side = [[-.24, .2], [-.235, .1], ...run, [.235, .1], [.24, .2]].concat([[.2, .33], [0, .35], [-.2, .32], [-.24, .2]]);
    [-1, 1].forEach(sx => { const r = ribbon(side, .028, .05, wal); r.position.x = sx*.24; g.add(r); });
    for(let k = 0; k < 7; k++){ const z = -.17 + k*.057, y = .335 + .02*(z/.17); const roll = new THREE.Mesh(new THREE.CapsuleGeometry(.026, .42, 4, 12), lea); roll.rotation.z = Math.PI/2; roll.position.set(0, y + .03, z); g.add(roll); }
    const s = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .5, 12), wal); s.rotation.z = Math.PI/2; s.position.set(0, .14, 0); g.add(s); return g; }
  // the staircase cabinet: an egg-crate of slotted boards (no hardware) whose cells, 360 mm square, step down like a Young diagram, 4-4-3-2-1;
  // any cell takes any front: open, a door, two drawers, a tambour, or glass. Fronts in muted red, yellow, and blue linoleum, edged in walnut.
  function staircaseCabinet(){ const g = new THREE.Group(), cols = [4, 4, 3, 2, 1], C = .36, T = .018, D = .4, base = .1, W = cols.length*C;
    const wal = WALNUT(), ply = mat("#7a5638", {roughness:.5}), steel = mat("#24221f", {metalness:.5, roughness:.5}), br = BRASS();
    const LINO = {red: mat("#a8493c", {roughness:.7}), yellow: mat("#c4a04a", {roughness:.7}), blue: mat("#3f5f86", {roughness:.7})};
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(W - .06, base - .01, D - .08), steel); plinth.position.set(W/2, base/2, -.02); g.add(plinth);
    const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
    // verticals: one board per column line, as tall as the taller neighbour; horizontals: one per row line, as long as that row
    for(let i = 0; i <= cols.length; i++){ const h = Math.max(cols[i-1] || 0, cols[i] || 0)*C; box(T, h + T, D, ply, i*C, base + h/2, 0); }
    for(let r = 0; r <= 4; r++){ let n = cols.filter(c => c >= Math.max(1, r)).length; if(r === 0) n = cols.length; const len = n*C; if(len) box(len + T, T, D, ply, len/2, base + r*C, 0); }
    // the stepped top edge, capped in solid walnut
    cols.forEach((c, i) => box(C + T, .012, D + .01, wal, i*C + C/2, base + c*C + .015, 0));
    box(W + T, .5, .01, ply, W/2, base + .25, -D/2);   // a back panel low down; above it the cells are open behind, like a room divider
    // fronts
    const plan = [["drawers","door:red","open","open"],["tambour","tambour","door:yellow","open"],["drawers","open","door:blue"],["door:red","open"],["drawers"]];
    const fronts = [], ease = f => () => { const t = f.open ? 1 : 0; if(Math.abs(t - f.k) > .002){ f.k += (t - f.k)*.14; f.apply(f.k); dirty = 2; } };
    plan.forEach((col, i) => col.forEach((kind, r) => { const cx = i*C + C/2, cy = base + r*C + C/2, z = D/2 - .01, iw = C - T - .006, ih = C - T - .006;
      if(kind === "open"){ for(let k = 0; k < 6; k++){ const bh = .2 + ((i*7 + r*3 + k*5) % 7)*.016, bw = .022 + ((k*3 + i) % 4)*.006; box(bw, bh, .2, mat(["#6b4a3a","#3e4a58","#55583e","#8a6a3a","#5a3a3a"][(i + r + k) % 5]), i*C + .04 + k*.045, base + r*C + T/2 + bh/2, .02); } return; }
      // behind every front, a little of what the cabinet keeps
      const keep = mat(["#ece6d6", "#6b2f26", "#3e4a58", "#b39a62"][(i + r) % 4]); box(iw*.5, ih*.35, .2, keep, cx - iw*.15, base + r*C + T/2 + ih*.175, -.02);
      if(kind.startsWith("door")){ const m = LINO[kind.split(":")[1]], hinge = new THREE.Group(); hinge.position.set(cx - iw/2, cy, z); g.add(hinge);
        const add2 = (geo, mm, x, y, zz) => { const me = new THREE.Mesh(geo, mm); me.position.set(x, y, zz); hinge.add(me); return me; };
        add2(new THREE.BoxGeometry(iw, ih, .016), m, iw/2, 0, 0); add2(new THREE.BoxGeometry(iw + .006, .006, .018), wal, iw/2, ih/2, 0); add2(new THREE.BoxGeometry(iw + .006, .006, .018), wal, iw/2, -ih/2, 0);
        const hole = add2(new THREE.CylinderGeometry(.014, .014, .02, 20), mat("#1e1a16"), iw - .04, 0, .002); hole.rotation.x = Math.PI/2;
        const f = {mesh: hinge, label: "A door: open it", open: false, k: 0, apply: k => { hinge.rotation.y = -1.85*k; }}; f.step = ease(f); fronts.push(f); return; }
      if(kind === "drawers"){ [.25, -.25].forEach(fy => { const dg = new THREE.Group(); dg.position.set(cx, cy + fy*ih, z); g.add(dg);
          const fr = new THREE.Mesh(new THREE.BoxGeometry(iw, ih/2 - .004, .018), wal); dg.add(fr); const sc2 = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .02, 20, 1, false, 0, Math.PI), mat("#2c1d12")); sc2.rotation.set(Math.PI/2, 0, 0); sc2.position.set(0, ih/4 - .006, .003); dg.add(sc2);
          const tray = new THREE.Mesh(new THREE.BoxGeometry(iw - .02, .006, .3), mat("#b49a78")); tray.position.set(0, -ih/4 + .02, -.16); dg.add(tray);
          const f = {mesh: dg, label: "A drawer: open it", open: false, k: 0, apply: k => { dg.position.z = z + .26*k; }}; f.step = ease(f); fronts.push(f); }); return; }
      if(kind === "tambour"){ const roll = new THREE.Group(); roll.position.set(cx, cy + ih/2, z); g.add(roll); const n = 13;
        for(let k = 0; k < n; k++){ const reed = new THREE.Mesh(new THREE.BoxGeometry(iw/n - .002, ih, .014), wal); reed.position.set(-iw/2 + (k + .5)*iw/n, -ih/2, 0); roll.add(reed); }
        const pull = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .08, 10), br); pull.rotation.z = Math.PI/2; pull.position.set(0, -ih + .03, .012); roll.add(pull);
        const f = {mesh: roll, label: "The tambour: roll it up", open: false, k: 0, apply: k => { roll.scale.y = 1 - .88*k; }}; f.step = ease(f); fronts.push(f); } }));
    g.children.forEach(m => { m.castShadow = true; m.receiveShadow = true; }); g.position.x = -W/2;
    const outer = new THREE.Group(); outer.add(g); const hit = new THREE.Mesh(new THREE.BoxGeometry(W, 4*C + base, D + .1), new THREE.MeshBasicMaterial({visible:false})); hit.position.set(0, (4*C + base)/2, 0); outer.add(hit);
    return {group: outer, hit, fronts}; }
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
    if(d.includes("panorama")) buildPanorama(p, p.room.ceiling === "open" ? 50 : 70, p.room.ceiling === "open");
    if(d.includes("observatory")) buildObservatory(p);
    if(d.includes("maptable")) buildMapTable(p);
    if(d.includes("wxstation")) buildWeatherStation(p, faces);
    if(d.includes("lounge")) buildLounge();
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
    if(d.includes("sundial") && p.dialType && p.dialType !== "horizontal") buildDialVariant(p, spot);
    if(d.includes("dialcabinet")) buildDialCabinet(p, faces, spot);
    if(d.includes("sundial") && (!p.dialType || p.dialType === "horizontal")){
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
      const read = {kind:"closer", label:"The sundial: look closer and read the shadow", onClick:()=>{ lookAtDial(1); hooks.dial && hooks.dial(); }}; dial.userData.hit = read; ped.userData.hit = read; picks.push(dial, ped);
    }
    // ---- the Archive
    if(d.includes("catalogshelves")) buildCatalogShelves(faces, p.catalog || [], R, spot);
    if(d.includes("cardcatalog")){ const at = new THREE.Vector3(-3.2, 0, 2.9); buildCardCatalog(at, at.clone().multiplyScalar(-1).normalize()); }
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
      // the balance rocker and its nesting footstool, by the window corner; the staircase cabinet along the left wall
      const rk = balanceRocker(), rkAt = new THREE.Vector3(-3.3, 0, 3.0); rk.group.position.copy(rkAt); rk.group.rotation.y = Math.PI*.8; scene.add(rk.group);
      const fs = nestingStool(); const fsOff = new THREE.Vector3(0, 0, .78).applyAxisAngle(new THREE.Vector3(0,1,0), Math.PI*.8); place(fs, rkAt.x + fsOff.x, rkAt.z + fsOff.z, Math.PI*.8);
      const sit = () => { const yaw = Math.PI*.8, fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), eye = rkAt.clone().addScaledVector(fwd, -.12).setY(1.08), aim = rkAt.clone().addScaledVector(fwd, 1.6).setY(.55);
        peek(eye, aim); seated = {leave(){ rk.set(0); rk.hit.userData.hit.label = "The balance rocker: sit in it"; }, lean(){ const on = rk.toggle(); goal.pitch = on ? .12 : Math.atan2(aim.y - eye.y, 1.72); goal.pos.y = on ? 1.0 : 1.08; dirty = 3; return on; }}; hooks.furniture && hooks.furniture("rocker"); };
      rk.hit.userData.hit = {kind:"look", label:"The balance rocker: sit in it", onClick:() => { if(seated){ const on = seated.lean(); rk.hit.userData.hit.label = on ? "Sit up" : "Lean back"; } else { sit(); rk.hit.userData.hit.label = "Lean back"; } }}; picks.push(rk.hit);
      const Lw = wallAt(faces, 0); if(Lw){ const sc = staircaseCabinet(), t = +(window.__cabT || .76)*Lw.len; if(Lw.free(t, 2)){ const at = Lw.at(t, .24); sc.group.position.set(at.x, 0, at.z); sc.group.rotation.y = Lw.yaw; scene.add(sc.group);
        const toward = Lw.n.clone(), eye = new THREE.Vector3(at.x, 1.45, at.z).addScaledVector(toward, 1.9), aim = new THREE.Vector3(at.x, .85, at.z);
        sc.hit.userData.hit = {kind:"closer", label:"The staircase cabinet: look closer", onClick:() => { peek(eye, aim); const keep = sc.hit.userData.hit; sc.hit.userData.hit = null; const off = () => { sc.hit.userData.hit = keep; window.removeEventListener("wending-unpeek", off); }; window.addEventListener("wending-unpeek", off); if(!sc.seen){ sc.seen = true; hooks.furniture && hooks.furniture("cabinet"); } }}; picks.push(sc.hit);
        sc.fronts.forEach(f => { f.mesh.userData.hit = {kind:"use", label: f.label, onClick:() => { f.open = !f.open; f.mesh.userData.hit.label = f.open ? f.label.replace("open it", "close it").replace("roll it up", "let it down") : f.label; }}; picks.push(f.mesh); anims.push(() => f.step()); }); } }
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.4), mat("#ffffff",{map: canvasTex(512, 360, (g,w,h) => { g.fillStyle = "#4f3a5a"; g.fillRect(0,0,w,h); g.strokeStyle = "#cdb88a"; g.lineWidth = 10; g.strokeRect(14,14,w-28,h-28); g.lineWidth = 3; for(let i=0;i<7;i++){ g.beginPath(); g.ellipse(w/2,h/2,40+i*26,24+i*17,0,0,TAU); g.stroke(); } })}));
      rug.rotation.x = -Math.PI/2; rug.position.set(1.4,.008,-.9); rug.receiveShadow = true; scene.add(rug);
    }
    if(d.includes("cloister")){ // the court: a colonnade on every side, its lean-to roof throwing a hard line of shadow; benches, urns, radial paving
      const cm = mat("#d3cab7"), H = WALL_H - .25, inset = 1.95;
      faces.forEach(f => { const u = f.b.clone().sub(f.a).normalize(), len = f.a.distanceTo(f.b), n = f.n, yaw = Math.atan2(-u.z, u.x);
        const nCol = Math.max(4, 2*Math.round(((len - 2*inset)/2.6 + 1)/2));   // an even count, so a door at the middle of a wall opens between columns
        for(let k=0;k<nCol;k++){ const t = inset + k*(len - 2*inset)/(nCol-1), at = f.a.clone().add(u.clone().multiplyScalar(t)).add(n.clone().multiplyScalar(inset)); const col = column(H, .16, cm); col.position.copy(at); scene.add(col); }
        const ent = new THREE.Mesh(new THREE.BoxGeometry(len - 2*inset + .5, .26, .42), cm); ent.position.copy(mid(f)).add(n.clone().multiplyScalar(inset)); ent.position.y = H + .13; ent.rotation.y = yaw; ent.castShadow = true; scene.add(ent);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(len, .1, inset + .3), mat("#8f7a62")); roof.position.copy(mid(f)).add(n.clone().multiplyScalar((inset+.3)/2)); roof.position.y = H + .3; roof.rotation.y = yaw; roof.rotateX(-.08 * 0); roof.castShadow = true; roof.receiveShadow = true; scene.add(roof); });
      const pav = new THREE.Group(); for(let k=0;k<3;k++){ const ring = new THREE.Mesh(new THREE.RingGeometry(1.6 + k*.75, 1.68 + k*.75, 72), mat("#8f8573")); ring.rotation.x = -Math.PI/2; ring.position.y = .006; pav.add(ring); }
      for(let k=0;k<16;k++){ const t = k/16*TAU, ray = new THREE.Mesh(new THREE.PlaneGeometry(.05, 1.5), mat("#8f8573")); ray.rotation.set(-Math.PI/2, 0, t); ray.position.set(Math.sin(t)*2.4, .006, Math.cos(t)*2.4); pav.add(ray); }
      scene.add(pav);
      [[-2.9,0,Math.PI/2],[2.9,0,-Math.PI/2]].forEach(([x,z,yw]) => place(bench(1.6, true), x, z, yw));
      const far = p.half - 3.4; ([[-3.3,-3.3],[3.3,-3.3],[-3.3,3.3],[3.3,3.3]].concat(far > 5 ? [[-far,-far],[far,-far],[-far,far],[far,far],[0,-far],[0,far],[-far,0],[far,0]].filter(([x,z]) => Math.abs(x) < 1 || Math.abs(z) < 1 ? false : true) : [])).forEach(([x,z]) => { const urn = lathe([[0,0],[.18,0],[.14,.08],[.26,.3],[.3,.5],[.24,.62],[.28,.66],[0,.66]], mat("#b06a45"), 20); place(urn, x, z);
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
    if(d.includes("armillary") || (d.includes("sundial") && p.dialType === "armillary")){
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

  // a small picture of the room as it is now, for the linking books' panels
  function thumb(){ const c = document.createElement("canvas"); c.width = 480; c.height = 270; c.getContext("2d").drawImage(canvas, 0, 0, 480, 270); return c.toDataURL("image/jpeg", .82); }
  return {show, inspect, canvas, thumb, step, canWalk:()=>!!(plan && plan.room.walk), skyMode, isSky:()=>skyOn, focused:()=>!!focusKind(), hasStation: k => !!stations[k], _pickables: () => picks.map(o => { const h = o.userData.hit; if(!h) return null; const v = o.getWorldPosition(new THREE.Vector3()).project(camera); return [h.kind, h.label, +((v.x+1)/2).toFixed(3), +((1-v.y)/2).toFixed(3), v.z < 1]; }).filter(Boolean), _focus: () => focusKind(), _hg: () => plan && plan.HG ? plan.HG.nodes[plan.HG.level].length : 0, _glints: () => glints.filter(gl => gl.mesh.visible).map(gl => { const v = gl.mesh.getWorldPosition(new THREE.Vector3()).project(camera); return [(v.x + 1)/2, (1 - v.y)/2, gl.mesh.userData.hit.label]; }), exitFocus:()=>exitFocus(), _place:(x,y,z,yaw)=>{ walkPos = new THREE.Vector3(x,y,z); goal.pos.copy(walkPos); cam.pos.copy(walkPos); if(yaw != null){ look.yaw = yaw - goal.yaw; } dirty = 3; }, where:()=>({pos:cam.pos.toArray().map(v=>+v.toFixed(2)), goal:goal.pos.toArray().map(v=>+v.toFixed(2)), yaw:+cam.yaw.toFixed(2), walkPos: walkPos ? walkPos.toArray().map(v=>+v.toFixed(2)) : null}), view:()=>({yaw:cam.yaw, pitch:cam.pitch, F: plan ? plan.F : 0, mirror: !!(plan && plan.mirror)}), snapshot:()=>canvas.toDataURL("image/png")};
}
