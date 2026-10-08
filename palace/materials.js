/* The materials library: woods, stones, bricks, cloths, leathers, metals, plasters, and tiles.
   Each entry is two things at once. It is a card a visitor can read in the Archive's cabinet (what it is, where it comes from,
   what it was used for), and it is a recipe the house's engine bakes into textures for its own surfaces (a colour map,
   a height map that becomes the bump, and a roughness map). The same entry drives both, so what you read is what the walls are made of.
   Everything is procedural and seamless: noise with integer periods, so every texture tiles. No images are downloaded.
   Loaded as a plain script before palace.js and palace3d.js; it exposes window.MATERIALS. */
(function(){
"use strict";
const TAU = Math.PI*2;
/* ---------- tiling noise ---------- */
function rng(seed){ let a = seed>>>0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a>>>15, 1|a); t = t + Math.imul(t ^ t>>>7, 61|t) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; }; }
function hashStr(s){ let h = 2166136261; for(const ch of String(s)){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h>>>0; }
// value noise on a lattice that repeats every px by py cells, so a texture built from it tiles when x and y run over whole periods
function pnoise(seed){ const R = rng(seed), P = new Float32Array(4096); for(let i=0;i<4096;i++) P[i] = R();
  const h = (x, y) => P[(((x * 73856093) ^ (y * 19349663)) >>> 0) & 4095];
  return (x, y, px, py) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf);
    const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px, y0 = ((yi % py) + py) % py, y1 = (y0 + 1) % py;
    return (h(x0,y0)*(1-u) + h(x1,y0)*u)*(1-v) + (h(x0,y1)*(1-u) + h(x1,y1)*u)*v; }; }
// fractal sum over octaves; fx, fy are whole numbers of cells across the tile
function fbm(n, u, v, fx, fy, oct){ let a = 0, w = .5, s = 0; for(let o=0;o<oct;o++){ a += w*n(u*fx, v*fy, fx, fy); s += w; fx *= 2; fy *= 2; w *= .5; } return a/s; }
const clamp = (x, a=0, b=1) => x < a ? a : x > b ? b : x;
const mix = (a, b, t) => a + (b - a)*t;
const sstep = (a, b, x) => { const t = clamp((x - a)/(b - a)); return t*t*(3 - 2*t); };
function hex(c){ const n = parseInt(c.slice(1), 16); return [(n>>16 & 255)/255, (n>>8 & 255)/255, (n & 255)/255]; }
const mixc = (a, b, t) => [mix(a[0],b[0],t), mix(a[1],b[1],t), mix(a[2],b[2],t)];
const mulc = (a, k) => [a[0]*k, a[1]*k, a[2]*k];
// cellular (Worley) distance, periodic: the nearest and second-nearest feature points
function worley(seed, cells){ const R = rng(seed), pts = []; for(let j=0;j<cells;j++) for(let i=0;i<cells;i++) pts.push([(i + R())/cells, (j + R())/cells, R()]);
  return (u, v) => { const ci = Math.floor(u*cells), cj = Math.floor(v*cells); let d1 = 9, d2 = 9, id = 0;
    for(let dj=-1;dj<=1;dj++) for(let di=-1;di<=1;di++){ const ii = ((ci+di) % cells + cells) % cells, jj = ((cj+dj) % cells + cells) % cells, p = pts[jj*cells + ii];
      const px = p[0] + (ci+di - ii)/cells, py = p[1] + (cj+dj - jj)/cells, d = Math.hypot(u - px, v - py);
      if(d < d1){ d2 = d1; d1 = d; id = p[2]; } else if(d < d2) d2 = d; }
    return [d1*cells, d2*cells, id]; }; }

/* ---------- weave drafts: a binary matrix says, at each crossing, whether the warp (1) or the weft (0) is on top ---------- */
const DRAFTS = {
  plain:   [[1,0],[0,1]],
  basket:  [[1,1,0,0],[1,1,0,0],[0,0,1,1],[0,0,1,1]],
  twill22: [[1,1,0,0],[0,1,1,0],[0,0,1,1],[1,0,0,1]],
  twill31: [[1,1,1,0],[0,1,1,1],[1,0,1,1],[1,1,0,1]],
  herringbone: (() => { const m = []; for(let r=0;r<8;r++){ const row = []; for(let c=0;c<8;c++){ const cc = c < 4 ? c : 7 - c; row.push(((cc - r) % 4 + 4) % 4 < 2 ? 1 : 0); } m.push(row); } return m; })(),
  // a regular satin of five: each row's raised warp moves on by 2, and 2 is prime to 5, so no two floats touch
  satin5:  (() => { const m = []; for(let r=0;r<5;r++){ const row = [0,0,0,0,0]; row[(r*2) % 5] = 1; m.push(row.map(x => 1 - x)); } return m; })(),
};

/* ---------- the recipes: each returns colour [r,g,b] (linear 0..1), height 0..1, and roughness 0..1 at (u, v) in the unit tile ---------- */
const RECIPES = {
  // plain-sawn or quarter-sawn wood: growth rings stretched along the grain (u), wobbling; earlywood pores; and, quarter-sawn, the ray fleck
  wood(e, n){ const [c0, c1] = [hex(e.colors[0]), hex(e.colors[1])], rings = e.rings || 26, quarter = e.cut === "quarter";
    // plain-sawn boards cut across the cone of growth rings, so the rings show as nested arches (the cathedral figure): a slow swing along the grain,
    // a second harmonic, irregular ring widths, and a little wander
    const ph = (hashStr(e.id) % 628)/100;
    return (u, v) => { const arch = quarter ? 0 : (.16*Math.sin(TAU*u + ph) + .05*Math.sin(2*TAU*u + ph*1.7))*(26/rings), wan = (fbm(n, u, v, 2, 3, 3) - .5)*(quarter ? .05 : .09),
      t = rings*(v + arch + wan) + 2.2*(fbm(n, u, v, 1, 5, 3) - .5);
      const ring = .5 + .5*Math.sin(t*TAU), late = sstep(.55, .95, ring), pore = fbm(n, u, v, 64, 512, 2);
      let c = mixc(c0, c1, late*.85 + .15*fbm(n, u, v, 3, 8, 3)); let h = .5 + .22*(ring - .5) - .2*Math.max(0, .35 - pore)*(1 - late);
      if(quarter){ const fl = fbm(n, u, v, 6, 40, 3), fl2 = fbm(n, u, v, 20, 3, 2); if(fl*fl2 > .3){ const k = sstep(.3, .42, fl*fl2); c = mixc(c, mulc(c0, 1.25), k*.75); h += .06*k; } }
      if(e.figure){ const f = .5 + .5*Math.sin((u*16 + fbm(n, u, v, 4, 4, 3)*3)*TAU); c = mulc(c, .93 + .14*f); }
      return [c, h, clamp((e.rough||.55) + .15*(.5 - ring)*(e.oiled ? .4 : 1))]; }; },
  // boards: the wood recipe laid in rows of planks, each with its own offset and shade, and dark seams
  boards(e, n){ const W = RECIPES.wood(e, n), rows = e.rows || 6, R = rng(hashStr(e.id)), len = [], off = [], tone = [];
    for(let r=0;r<rows;r++){ len.push(.34 + R()*.5); off.push(R()); tone.push(.86 + R()*.24); }
    return (u, v) => { const r = Math.floor(v*rows), vv = v*rows - r, L = len[r], s = (u + off[r]) / L, k = Math.floor(s), ss = s - k;
      const [c, h, ro] = W(((u + off[r] + k*.37) % 1 + 1) % 1, ((r/rows + vv/rows*.6 + k*.13) % 1 + 1) % 1);
      const sm = clamp(Math.min(vv/(.012*rows), (1 - vv)/(.012*rows), ss*L/.006, (1 - ss)*L/.006)), tn = tone[r]*(1 + .05*Math.sin(k*2.1));
      return [mulc(c, tn*(.35 + .65*sm)), h*sm, ro + (1 - sm)*.3]; }; },
  // herringbone parquet: blocks at right angles, set in zigzag rows
  // herringbone of blocks L units long and 1 wide. With c = (x − y) mod 2L on the unit grid, cells with c < L belong to a horizontal block
  // (the cells c = 0 … L−1 of one row), and cells with c ≥ L to a vertical one (going up, c falls from 2L−1 to L). Every cell is covered once.
  parquet(e, n){ const W = RECIPES.wood(e, n), Lb = e.ratio || 4, P = 2*Lb, R = rng(hashStr(e.id)), tones = []; for(let i=0;i<4096;i++) tones.push(.84 + R()*.26);
    return (u, v) => { const X = u*P, Y = v*P, xi = Math.floor(X), yi = Math.floor(Y), c = ((xi - yi) % P + P) % P;
      let along, across, id;
      if(c < Lb){ const x0 = xi - c; along = (X - x0)/Lb; across = Y - yi; id = ((x0 + 64)*61 + (yi + 64)*7) & 4095; }
      else { const yb = yi - (P - 1 - c); along = (Y - yb)/Lb; across = X - xi; id = ((xi + 64)*13 + (yb + 64)*97 + 5) & 4095; }
      const edge = clamp(Math.min(across, 1 - across, along*Lb, (1 - along)*Lb)/.04);
      const [col, h, ro] = W(along, (across*.18 + id*.0137) % 1);
      return [mulc(col, tones[id]*(.45 + .55*edge)), h*edge, ro + (1 - edge)*.25]; }; },
  // stones: a base mottle, plus veins (marble), speckle (granite), pits (travertine), bedding (sandstone, slate), or ooids (Portland)
  stone(e, n){ const [c0, c1, c2] = (e.colors.map(hex)).concat([hex(e.colors[0])]), kind = e.kind;
    const W = kind === "granite" ? worley(hashStr(e.id), 64) : kind === "travertine" ? worley(hashStr(e.id)+1, 20) : null;
    return (u, v) => { const g = fbm(n, u, v, 4, 4, 6); let c = mixc(c0, c1, sstep(.3, .75, g)*.7), h = .5 + .2*(g - .5), r = e.rough || .6;
      if(kind === "marble"){ const w = fbm(n, u, v, 3, 3, 6), vein = Math.abs(Math.sin((u*2 + v*1 + w*3.2)*Math.PI)), fine = Math.abs(Math.sin((u*5 - v*3 + fbm(n, u, v, 6, 6, 5)*4)*Math.PI));
        const k = Math.pow(1 - vein, 14)*.9 + Math.pow(1 - fine, 30)*.5; c = mixc(c, c2, clamp(k)); h -= .02*k; }
      else if(kind === "granite"){ const [d1, , id] = W(u, v); const grain = id < .45 ? c0 : id < .87 ? c1 : c2; c = mixc(grain, c0, .1 + .2*sstep(0, .6, d1)); c = mulc(c, .92 + .16*n(u*300, v*300, 300, 300)); h = .5 + .06*(id - .5); r = .35 + .3*id; }
      else if(kind === "slate"){ const bed = fbm(n, u, v, 1, 24, 4); c = mixc(c0, c1, sstep(.35, .7, bed)); h = .5 + .25*(bed - .5) + .1*(fbm(n, u, v, 2, 40, 3) - .5); r = .5 + .2*bed; }
      else if(kind === "travertine"){ const bed = fbm(n, u, v, 1, 10, 4), [d1] = W(u, (v*3) % 1); const pit = d1 < .1 + .08*fbm(n, u, v, 8, 8, 2) ? 1 : 0;
        c = mixc(mixc(c0, c1, sstep(.35, .7, bed)), c2, pit*.8); h = .55 + .15*(bed - .5) - .45*pit; r = .55 + .3*pit; }
      else if(kind === "sandstone"){ const bed = fbm(n, u, v, 1, 18, 5), sand = n(u*400, v*400, 400, 400); c = mixc(mixc(c0, c1, sstep(.25, .75, bed)), c2, .35*sand + .25*sstep(.6, .8, fbm(n, u, v, 2, 30, 3))); h = .5 + .15*(bed - .5) + .12*(sand - .5); r = .85; }
      else if(kind === "oolite"){ const o = n(u*300, v*300, 300, 300), shell = fbm(n, u, v, 16, 16, 2) > .7 ? 1 : 0; c = mixc(mixc(c0, c1, g), c2, .2*o + .25*shell); h = .5 + .2*(o - .5) - .1*shell; r = .8; }
      return [c, h, clamp(r)]; }; },
  // flags: a stone laid in rectangular slabs with joints
  flags(e, n){ const S = RECIPES.stone(e, n), rows = e.rows || 4, R = rng(hashStr(e.id)), cuts = [], tone = [];
    for(let r=0;r<rows;r++){ const k = 2 + Math.floor(R()*2), xs = [0]; for(let i=1;i<k;i++) xs.push(i/k + (R() - .5)*.12); cuts.push(xs); tone.push(.9 + R()*.18); }
    return (u, v) => { const r = Math.floor(v*rows), vv = v*rows - r, xs = cuts[r]; let i = xs.length - 1; while(i > 0 && u < xs[i]) i--; const x0 = xs[i], x1 = i + 1 < xs.length ? xs[i+1] : 1;
      const jw = .006*(e.joint || 1), d = Math.min(u - x0, x1 - u, vv/rows, (1 - vv)/rows), j = sstep(0, jw, d);
      const [c, h, ro] = S((u + i*.31) % 1, (v + r*.17) % 1);
      return [mixc(hex(e.mortar || "#5a5448"), mulc(c, tone[r]*(1 + .06*Math.sin(i*1.7))), j), .15 + h*.85*j, mix(.95, ro, j)]; }; },
  // checker of two stones, as the floors of the reading rooms are laid
  checker(e, n){ const A = RECIPES.stone(Object.assign({}, e, {colors:e.colors, kind:"marble"}), n), B = RECIPES.stone(Object.assign({}, e, {colors:e.colors2, kind:"marble"}), n), k = e.squares || 4;
    return (u, v) => { const i = Math.floor(u*k), j = Math.floor(v*k), fu = u*k - i, fv = v*k - j, edge = sstep(0, .012, Math.min(fu, 1 - fu, fv, 1 - fv));
      const s = (i + j) % 2 ? B : A, [c, h, ro] = s(fu, fv); return [mixc([.35,.33,.3], c, .25 + .75*edge), h*(.5 + .5*edge), ro]; }; },
  // bricks in their bonds; s = stretcher (the long face), h = header (the end)
  brick(e, n){ const [c0, c1, c2] = e.colors.map(hex), mortar = hex(e.mortar || "#cfc6b4"), R = rng(hashStr(e.id)), tones = []; for(let i=0;i<512;i++) tones.push(R());
    const L = e.L || 215, Wd = e.W || 102.5, H = e.H || 65, J = e.J || 10, bond = e.bond || "stretcher";
    // the tile spans whole repeats: two stretchers across, four courses up (enough for every bond here)
    const unitL = L + J, unitH = H + J, tileW = 2*unitL, tileH = 4*unitH;
    function cellAt(x, y){ // x, y in millimetres within the tile: which brick, and how far from its edges
      if(bond === "herringbone" || bond === "basket") return null;
      const row = Math.floor(y/unitH), yy = y - row*unitH; let x0 = 0, w = unitL, idx = 0;
      if(bond === "stretcher"){ const off = row % 2 ? unitL/2 : 0, xs = x + off, k = Math.floor(xs/unitL); x0 = k*unitL - off; idx = k; }
      else if(bond === "english"){ if(row % 2){ const hw = (Wd + J), k = Math.floor((x + hw*.5)/hw); x0 = k*hw - hw*.5; w = hw; idx = k + 50; } else { const k = Math.floor(x/unitL); x0 = k*unitL; idx = k; } }
      else if(bond === "flemish"){ const pat = Wd + J + unitL, off = row % 2 ? pat/2 : 0, xs = x + off, k = Math.floor(xs/pat), r = xs - k*pat;
        if(r < unitL){ x0 = k*pat - off; w = unitL; idx = 2*k; } else { x0 = k*pat - off + unitL; w = Wd + J; idx = 2*k + 1; } }
      return {dx: Math.min(x - x0, x0 + w - J - x), dy: Math.min(yy, H - yy), inBrick: x - x0 < w - J && yy < H, id: (row*37 + idx*11) & 511, head: w < unitL*.8}; }
    return (u, v) => { let cell;
      if(bond === "herringbone"){ // paving: bricks at 45°, alternating
        const s = 2*(Wd + J), x = u*s*4, y = v*s*4, a = x + y, b = y - x, par = ((Math.floor(a/s) % 2) + 2) % 2;
        const p = par ? ((b % (2*s)) + 2*s) % (2*s) : ((a % s) + s) % s, q = par ? ((a % s) + s) % s : ((b % (2*s)) + 2*s) % (2*s);
        cell = {dx: Math.min(q % (Wd + J), Wd - q % (Wd + J))*.7, dy: Math.min(p, 2*s - J - p)*.7, inBrick: q % (Wd + J) < Wd && p < 2*s - J, id: (Math.floor(a/s)*13 + Math.floor(b/s)*7 + Math.floor(q/(Wd + J))) & 511, head:false}; }
      else if(bond === "basket"){ const s = L + J, x = u*2*s, y = v*2*s, bi = Math.floor(x/s), bj = Math.floor(y/s), fx = x - bi*s, fy = y - bj*s, vert = (bi + bj) % 2;
        const a = vert ? fx : fy, b = vert ? fy : fx, k = Math.floor(a/(s/2)), aa = a - k*s/2;
        cell = {dx: Math.min(aa, s/2 - J - aa), dy: Math.min(b, s - J - b), inBrick: aa < s/2 - J && b < s - J, id: (bi*7 + bj*13 + k*3) & 511, head:false}; }
      else cell = cellAt(u*tileW, v*tileH);
      const t = tones[cell.id], burnt = t > .82, body = mixc(mixc(c0, c1, t), c2, burnt ? .6 : 0);
      const grain = fbm(n, u, v, 8, 8, 4), edge = cell.inBrick ? sstep(0, 3, Math.min(cell.dx, cell.dy)) : 0;
      const col = mixc(mortar, mulc(body, .88 + .2*grain + (cell.head && e.glazedHeaders ? -.25 : 0)), edge);
      return [col, cell.inBrick ? .7 + .15*(grain - .5) - (1 - edge)*.4 : .2 + .1*grain, cell.inBrick ? .8 : .95]; }; },
  // cloth: the draft says which thread is on top; threads are round in section, so each float is a little ridge
  weave(e, n){ const D = DRAFTS[e.draft] || DRAFTS.plain, rows = D.length, cols = D[0].length, reps = e.reps || 16, warp = hex(e.colors[0]), weft = hex(e.colors[1] || e.colors[0]);
    const wPat = e.warpPattern, fPat = e.weftPattern;   // colour orders, as in houndstooth: 4 dark, 4 light
    return (u, v) => { const x = u*reps*cols, y = v*reps*rows, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, up = D[((j % rows) + rows) % rows][((i % cols) + cols) % cols];
      const cw = wPat ? (wPat[i % wPat.length] ? hex(e.colors[2] || e.colors[0]) : warp) : warp, cf = fPat ? (fPat[j % fPat.length] ? hex(e.colors[2] || e.colors[1]) : weft) : weft;
      // the top thread runs along v (warp) or along u (weft); its cross-section is a half-cosine
      const across = up ? fx : fy, along = up ? fy : fx, prof = Math.sin(Math.PI*clamp(across*1.1 - .05)), dip = .85 + .15*Math.sin(Math.PI*along);
      const fuzz = fbm(n, u, v, 32, 32, 3), c = mulc(up ? cw : cf, (.62 + .38*prof)*(.92 + .16*fuzz));
      return [c, .5*prof*dip + .1*fuzz, clamp((e.rough || .9) - .1*prof)]; }; },
  // felt and baize: fibres matted together, no threads at all
  felt(e, n){ const c0 = hex(e.colors[0]), c1 = hex(e.colors[1] || e.colors[0]);
    return (u, v) => { const g = fbm(n, u, v, 32, 32, 5), f = fbm(n, u, v, 128, 128, 2); return [mixc(c0, c1, g), .5 + .1*(f - .5), .97]; }; },
  // leather: a pebbled grain of cells, with a few creases, and a sheen where it has been handled
  leather(e, n){ const c0 = hex(e.colors[0]), c1 = hex(e.colors[1] || e.colors[0]), W = worley(hashStr(e.id), 48);
    return (u, v) => { const [d1, d2] = W(u, v), cellEdge = sstep(0, .12, d2 - d1), crease = (1 - sstep(0, .012, Math.abs(fbm(n, u, v, 4, 4, 5) - .5)))*.5, wear = fbm(n, u, v, 2, 2, 4);
      const c = mulc(mixc(c0, c1, sstep(.35, .75, wear)), .82 + .18*cellEdge - .2*crease);
      return [c, .4 + .35*cellEdge - .3*crease, clamp((e.rough || .55) - .25*sstep(.55, .8, wear) + .1*(1 - cellEdge))]; }; },
  // metals: brushed, with a patina that gathers in the low places
  metal(e, n){ const c0 = hex(e.colors[0]), pat = e.colors[1] ? hex(e.colors[1]) : null;
    return (u, v) => { const brush = fbm(n, u, v, 2, 256, 2), blot = fbm(n, u, v, 4, 4, 5);
      let c = mulc(c0, .9 + .14*(brush - .5)), h = .5 + .05*(brush - .5), r = (e.rough || .3) + .2*(brush - .5);
      if(pat){ const th = e.patina ? 1 - e.patina : .6, sp = fbm(n, u, v, 48, 48, 2), k = sstep(th, th + .12, blot*.7 + sp*.3); c = mixc(c, pat, k); r = mix(r, .85, k); h += .04*k; }
      return [c, h, clamp(r)]; }; },
  // wrought iron: dark, with slag streaks along the rolling direction
  iron(e, n){ const c0 = hex(e.colors[0]), c1 = hex(e.colors[1]);
    return (u, v) => { const fib = fbm(n, u, v, 3, 60, 4), rust = fbm(n, u, v, 5, 5, 5); const c = mixc(mixc(c0, c1, sstep(.55, .8, fib)), hex("#6b3d22"), sstep(.68, .8, rust)*.7);
      return [c, .5 + .2*(fib - .5), clamp(.55 + .3*rust)]; }; },
  // plaster: lime trowelled flat, or tadelakt polished with stones until it shines
  plaster(e, n){ const c0 = hex(e.colors[0]), c1 = hex(e.colors[1] || e.colors[0]);
    return (u, v) => { const g = fbm(n, u, v, 3, 3, 6), sw = fbm(n, u, v, 6, 6, 3), trowel = Math.sin((u*7 + v*3 + sw*2)*TAU)*.5 + .5;
      return [mixc(c0, c1, sstep(.2, .85, g)*.8), .5 + .12*(g - .5) + .04*(trowel - .5)*(e.polished ? .3 : 1), clamp((e.rough || .85) - (e.polished ? .2*trowel : 0))]; }; },
  // tiles: square terracotta, or Truchet's tiles (two colours split on a diagonal, turned at random), or encaustic patterns
  tile(e, n){ const k = e.squares || 4, R = rng(hashStr(e.id)), turns = [], tones = []; for(let i=0;i<k*k;i++){ turns.push(Math.floor(R()*4)); tones.push(.88 + R()*.24); }
    const [c0, c1] = e.colors.map(hex), grout = hex(e.grout || "#bdb3a0");
    return (u, v) => { const i = Math.floor(u*k), j = Math.floor(v*k), fu = u*k - i, fv = v*k - j, t = turns[j*k + i], g = fbm(n, u, v, 8, 8, 4);
      const edge = sstep(0, .03, Math.min(fu, 1 - fu, fv, 1 - fv));
      let c;
      if(e.truchet === "diagonal"){ const a = [fu + fv < 1, fu > fv, fu + fv > 1, fu < fv][t]; c = a ? c0 : c1; }
      else if(e.truchet === "arcs"){ const flip = t % 2, d1 = Math.hypot(fu - (flip ? 1 : 0), fv), d2 = Math.hypot(fu - (flip ? 0 : 1), fv - 1), band = Math.abs(Math.min(d1, d2) - .5) < .14; c = band ? c1 : c0; }
      else c = mixc(c0, c1, g*.5);
      return [mulc(mixc(grout, c, edge), tones[j*k + i]*(.92 + .16*g)), .3 + .5*edge + .05*g, e.glazed ? clamp(.25 + .5*(1 - edge)) : .8]; }; },
};

/* ---------- the library itself ----------
   tile: the size in metres one texture covers, so grain and bricks come out the right size on any surface. */
const L = [
  // ---- woods
  {id:"white-oak", name:"White oak, quarter-sawn", family:"wood", recipe:"wood", cut:"quarter", rings:30, colors:["#b48a5c","#8a643e"], tile:.6, rough:.55,
    latin:"Quercus alba", origin:"Eastern North America",
    text:"Sawn so the growth rings stand on end, which brings out the medullary rays as pale flakes and ribbons (the “ray fleck”). Stable and strong. Tyloses plug its vessels, so it holds liquid: whisky and wine barrels are white oak.",
    facts:["Density about 755 kg/m³","Janka hardness about 1,360 lbf","The Arts and Crafts movement's favourite, fumed with ammonia to darken it"]},
  {id:"oak-boards", name:"Oak floorboards", family:"wood", recipe:"boards", rings:22, colors:["#b08a62","#8e6a46"], tile:1.6, rows:8, rough:.6,
    latin:"Quercus", origin:"Plain-sawn, laid in random lengths",
    text:"Plain-sawn oak in boards about 20 cm wide, end joints staggered. The house's ordinary rooms are floored in it.", facts:["The board ends are staggered so no two joints line up in neighbouring rows"]},
  {id:"oak-parquet", name:"Herringbone parquet", family:"wood", recipe:"parquet", rings:18, colors:["#b99467","#93704b"], tile:1.2, ratio:4, rough:.5,
    origin:"Blocks laid at right angles in zigzag rows",
    text:"Short oak blocks laid at right angles to each other, each row stepping half a block, so the floor reads as a field of chevrons. The pattern is as old as Roman brick paving (opus spicatum).",
    facts:["Every block is the same rectangle, twice as long as it is wide or more","The two directions of grain catch the light differently, so the zigzag changes as you walk"]},
  {id:"walnut", name:"Black walnut", family:"wood", recipe:"wood", rings:20, colors:["#6b4a32","#3e2a1c"], tile:.6, figure:false, rough:.45, oiled:true,
    latin:"Juglans nigra", origin:"Eastern United States",
    text:"Dark chocolate heartwood with a pale sapwood that is usually steamed to match. Easy to work and carve. The wood of mid-century furniture and of gunstocks.",
    facts:["Density about 610 kg/m³","Janka hardness about 1,010 lbf"]},
  {id:"hard-maple", name:"Hard maple", family:"wood", recipe:"wood", rings:34, colors:["#e2cfae","#c9b08a"], tile:.6, rough:.4,
    latin:"Acer saccharum", origin:"Northeastern North America (the sugar maple)",
    text:"Pale, close-grained, and hard. Bowling lanes, basketball courts, butcher blocks, and the necks of guitars. Sometimes it grows curly or bird's-eye.",
    facts:["Density about 705 kg/m³","Janka hardness about 1,450 lbf"]},
  {id:"cherry", name:"Black cherry", family:"wood", recipe:"wood", rings:28, colors:["#a8664a","#7e4630"], tile:.6, rough:.45, oiled:true,
    latin:"Prunus serotina", origin:"Eastern North America",
    text:"Pinkish when cut, it darkens in the light over a few years to a deep reddish brown. Shaker and Federal furniture.",
    facts:["Density about 560 kg/m³","Janka hardness about 950 lbf"]},
  {id:"mahogany", name:"Mahogany", family:"wood", recipe:"wood", rings:16, figure:true, colors:["#8a4a32","#5e2e1e"], tile:.6, rough:.4, oiled:true,
    latin:"Swietenia macrophylla", origin:"Central and South America",
    text:"The wood of Georgian furniture (Chippendale's chairs) and of fine boats. Interlocked grain gives a ribbon figure that shimmers as you move. Now protected: big-leaf mahogany has been on CITES Appendix II since 2003.",
    facts:["Density about 590 kg/m³","Janka hardness about 800 lbf"]},
  {id:"ebony", name:"Gaboon ebony", family:"wood", recipe:"wood", rings:40, colors:["#231b17","#120d0b"], tile:.4, rough:.3,
    latin:"Diospyros crassiflora", origin:"West and Central Africa",
    text:"Nearly black, very dense, and polishes like stone. The sharps on old pianos, the fingerboards of violins, chess pieces. It sinks in water.",
    facts:["Density about 955 kg/m³","Janka hardness about 3,080 lbf"]},
  {id:"white-pine", name:"Eastern white pine", family:"wood", recipe:"wood", rings:12, colors:["#dcc193","#b38d58"], tile:.8, rough:.7,
    latin:"Pinus strobus", origin:"Eastern North America, Wisconsin included",
    text:"Soft, light, and straight. The tallest pines were reserved for the Royal Navy's masts and marked with the King's Broad Arrow. The great Wisconsin logging boom of the nineteenth century was mostly white pine.",
    facts:["Density about 400 kg/m³","Janka hardness about 380 lbf"]},
  {id:"teak", name:"Teak", family:"wood", recipe:"wood", rings:22, colors:["#a77a46","#7f5a32"], tile:.6, rough:.5, oiled:true,
    latin:"Tectona grandis", origin:"South and Southeast Asia",
    text:"Oily and resistant to rot and water, so it goes on ships' decks and garden benches. Weathers to silver grey if left outside.",
    facts:["Density about 655 kg/m³","Janka hardness about 1,070 lbf"]},
  // ---- stones
  {id:"carrara", name:"Carrara marble", family:"stone", recipe:"stone", kind:"marble", colors:["#ecebe6","#dcdcd6","#8f9196"], tile:1.2, rough:.25,
    origin:"The Apuan Alps above Carrara, Tuscany", text:"Limestone recrystallised by heat and pressure into calcite marble, white to blue-grey with soft grey veins. Quarried since Roman times; Michelangelo chose his blocks here.",
    facts:["Mostly calcite, CaCO₃","Metamorphic rock (from limestone)"]},
  {id:"nero-marquina", name:"Nero Marquina", family:"stone", recipe:"stone", kind:"marble", colors:["#1c1c1e","#26262a","#e6e2da"], tile:1.2, rough:.2,
    origin:"Markina, in the Basque Country, Spain", text:"A fine black limestone shot through with white calcite veins. Black and white squares of it and of Carrara make the classic checkered floor.",
    facts:["Black from organic matter in the original sediment"]},
  {id:"marble-checker", name:"Black and white marble squares", family:"stone", recipe:"checker", colors:["#ecebe6","#dcdcd6","#8f9196"], colors2:["#1c1c1e","#26262a","#d6d2ca"], tile:2, squares:4, rough:.25,
    origin:"Carrara and Nero Marquina, laid on the diagonal or square", text:"The reading rooms' floor: alternating squares, as in a Dutch interior by Vermeer or de Hooch.", facts:["Squares 50 cm on a side here"]},
  {id:"portland", name:"Portland stone", family:"stone", recipe:"flags", kind:"oolite", colors:["#ddd6c4","#cfc6b0","#b8ad94"], tile:2, rows:3, rough:.8, mortar:"#a99f8a",
    origin:"The Isle of Portland, Dorset", text:"A pale Jurassic limestone made of ooids, tiny round grains of calcite grown around a speck, with fragments of shell. Wren built St Paul's Cathedral of it, and much of London after the Great Fire.",
    facts:["Oolitic limestone: sedimentary, about 150 million years old","Cuts freely in any direction (a “freestone”)"]},
  {id:"limestone-flags", name:"Limestone flags", family:"stone", recipe:"flags", kind:"plain", colors:["#cdc4b0","#bdb39c","#a89e88"], tile:2.4, rows:4, rough:.75, mortar:"#7d7462",
    origin:"Laid in courses of random lengths", text:"Sawn limestone slabs, the Archive's and the cloisters' floor. They wear into a gentle hollow where people walk most.", facts:["Joints are a little darker, filled with lime mortar"]},
  {id:"slate", name:"Green slate", family:"stone", recipe:"flags", kind:"slate", colors:["#4f5c53","#5c6a5c","#3d4842"], tile:2.4, rows:5, rough:.6, mortar:"#2e3631",
    origin:"The Slate Valley of Vermont and New York", text:"Mudstone squeezed until its clay minerals line up, so it splits into thin, flat sheets along its cleavage. Roofs, floors, billiard table beds, and the original blackboards.",
    facts:["Metamorphic rock (from shale)","Cleavage, not bedding: the splitting plane is set by the squeeze, not by how the mud was laid"]},
  {id:"granite", name:"Grey granite", family:"stone", recipe:"stone", kind:"granite", colors:["#a9a7a2","#d8d4cc","#2a2a2c"], tile:.8, rough:.3,
    origin:"Like Aberdeen's, the Granite City", text:"A coarse-grained igneous rock that cooled slowly underground: glassy grey quartz, pale feldspar, and black flakes of mica and hornblende. Hard to work, nearly impossible to wear out.",
    facts:["Quartz, feldspar, and mica","Grains a few millimetres across"]},
  {id:"travertine", name:"Travertine", family:"stone", recipe:"stone", kind:"travertine", colors:["#e0d2b4","#cdb991","#a8916a"], tile:1.2, rough:.6,
    origin:"Tivoli, near Rome (lapis tiburtinus)", text:"Calcium carbonate laid down by hot springs, banded and full of holes where gas bubbled through. The Colosseum is travertine; so is the Getty Center.",
    facts:["Sedimentary, from mineral springs","The holes are often filled when it is used for floors"]},
  {id:"brownstone", name:"Brownstone", family:"stone", recipe:"stone", kind:"sandstone", colors:["#7a5040","#6a4434","#a07a62"], tile:1.2, rough:.9,
    origin:"Portland, Connecticut", text:"A Triassic–Jurassic sandstone, its sand grains cemented with iron oxides into a chocolate red. New York's rowhouses gave their name to it.",
    facts:["Sedimentary: quartz sand, iron-oxide cement","Weathers by flaking when laid with its bedding upright"]},
  // ---- bricks
  {id:"brick-stretcher", name:"Red brick, stretcher bond", family:"brick", recipe:"brick", bond:"stretcher", colors:["#8e3e2c","#a8553a","#5e2a20"], tile:.45, rough:.85,
    origin:"Every course of long faces, each half a brick over from the one below", text:"The bond of a single-leaf wall, or of the outer skin of a cavity wall: only the stretchers show.",
    facts:["A standard British brick is 215 × 102.5 × 65 mm","With 10 mm joints, two headers and a joint make one stretcher: 2 × 102.5 + 10 = 215"]},
  {id:"brick-english", name:"Red brick, English bond", family:"brick", recipe:"brick", bond:"english", colors:["#8e3e2c","#a8553a","#5e2a20"], tile:.45, rough:.85,
    origin:"Courses of headers and stretchers, alternating", text:"The strongest of the traditional bonds for a wall one brick thick: every other course ties front to back.", facts:["Used for engineering work: bridges, viaducts, retaining walls"]},
  {id:"brick-flemish", name:"Red brick, Flemish bond", family:"brick", recipe:"brick", bond:"flemish", colors:["#8e3e2c","#a8553a","#5e2a20"], tile:.67, rough:.85, glazedHeaders:true,
    origin:"Header and stretcher alternate in every course", text:"Each header sits centred over a stretcher below. Georgian builders often used darker, glazed headers, so the wall carries a diaper of dark points.",
    facts:["Each course repeats every header plus stretcher: 102.5 + 10 + 215 + 10 = 337.5 mm"]},
  {id:"cream-city", name:"Cream City brick", family:"brick", recipe:"brick", bond:"stretcher", colors:["#e3d4ae","#d5c294","#b8a678"], mortar:"#e6dcc6", tile:.45, rough:.85,
    origin:"Milwaukee, Wisconsin", text:"Fired from the lime- and magnesium-rich clay of the Menomonee River valley, it comes out of the kiln a pale yellow-cream instead of red. It built nineteenth-century Milwaukee, which took its nickname from it, and was shipped all over the Midwest.",
    facts:["Its colour comes from the calcium and magnesium in the clay, which bind the iron that would otherwise turn it red"]},
  {id:"brick-herringbone", name:"Brick paving, herringbone", family:"brick", recipe:"brick", bond:"herringbone", colors:["#8a4a34","#a0583e","#6a3424"], tile:.9, rough:.9,
    origin:"Paving bricks laid flat at 45°", text:"Every brick locks between its neighbours, so a herringbone path resists the push of wheels better than one laid in rows.", facts:["Paving bricks are usually 200 × 100 mm, exactly twice as long as wide"]},
  {id:"brick-basket", name:"Brick paving, basket weave", family:"brick", recipe:"brick", bond:"basket", colors:["#8a4a34","#a0583e","#6a3424"], tile:.9, rough:.9,
    origin:"Pairs of bricks laid alternately across and along", text:"Pairs of bricks make squares, and the squares turn by a quarter turn each time, like a checkerboard of woven strips.", facts:["Needs bricks exactly twice as long as wide, joints included"]},
  // ---- cloths (woven from drafts)
  {id:"linen", name:"Linen, plain weave", family:"textile", recipe:"weave", draft:"plain", colors:["#d8cdb4","#cfc3a8"], tile:.05, reps:16,
    origin:"Flax", text:"The simplest weave: each weft thread goes over one warp and under the next, then the reverse. The weave draft is a checkerboard.", facts:["Draft: a 2 × 2 checkerboard","Flax fibres are long and strong, so linen is cool and crisp"]},
  {id:"twill", name:"Wool serge, 2/2 twill", family:"textile", recipe:"weave", draft:"twill22", colors:["#2f3a52","#3a4560"], tile:.04, reps:12,
    origin:"Wool", text:"Over two, under two, stepping one each row, which draws diagonal ribs across the cloth.", facts:["Draft: a 4 × 4 circulant matrix","Denim is a 3/1 twill: the warp shows on one face, the weft on the other"]},
  {id:"herringbone-tweed", name:"Herringbone tweed", family:"textile", recipe:"weave", draft:"herringbone", colors:["#6e6656","#3c382f"], tile:.08, reps:10,
    origin:"Wool, from the Scottish Borders and the Hebrides", text:"A twill whose diagonal reverses every few threads, so the ribs zigzag like the bones of a fish.", facts:["Draft: a twill reflected about a vertical line"]},
  {id:"houndstooth", name:"Houndstooth", family:"textile", recipe:"weave", draft:"twill22", colors:["#e8e0cc","#e8e0cc","#2a2622"], warpPattern:[1,1,1,1,0,0,0,0], weftPattern:[1,1,1,1,0,0,0,0], tile:.06, reps:8,
    origin:"Wool", text:"Nothing but a 2/2 twill, with four dark threads then four light in both warp and weft. The jagged four-pointed checks fall out of the arithmetic.",
    facts:["Colour order 4 and 4 in both directions","The same draft with 2 and 2 gives the smaller “puppytooth”"]},
  {id:"sateen", name:"Cotton sateen, five-end", family:"textile", recipe:"weave", draft:"satin5", colors:["#d9cfc0","#d0c6b6"], tile:.04, reps:14,
    origin:"Cotton", text:"Each weft floats over four warps and under one, and the binding point moves on by two each row, so the binding points never touch and the surface is nearly all float: smooth and lustrous.",
    facts:["A regular satin of n needs a step s with gcd(s, n) = 1 and s ≢ ±1 mod n","So satins exist for n = 5 and n ≥ 7, but not n = 6: the only steps prime to 6 are 1 and 5"]},
  {id:"baize", name:"Billiard cloth (baize)", family:"textile", recipe:"felt", colors:["#2f6a3e","#2a5e37"], tile:.3,
    origin:"Worsted wool, tightly woven and sheared", text:"The green cloth of billiard tables and of old office doors. Fast billiard cloth is a smooth worsted; the older baize is a napped woollen.", facts:["Green, it is said, after the lawns that billiards came in from"]},
  {id:"felt", name:"Wool felt", family:"textile", recipe:"felt", colors:["#7a6a58","#6e5e4c"], tile:.2,
    origin:"Wool fibres matted with heat, moisture, and pressure", text:"Not woven at all: wool's scaly fibres lock together when worked wet. Hat bodies, piano hammers, and the pads under a music box's feet.", facts:["Possibly the oldest textile"]},
  // ---- leathers
  {id:"saddle-leather", name:"Saddle leather", family:"leather", recipe:"leather", colors:["#8a5a34","#a4703f"], tile:.3, rough:.55,
    origin:"Full-grain cowhide, vegetable-tanned", text:"Tanned slowly with tannins from bark, it is firm, takes tooling, and darkens to a rich patina where hands rest. A candidate for the balance rocker's seat.", facts:["Vegetable tanning uses tannins from oak, chestnut, mimosa, or quebracho"]},
  {id:"oxblood", name:"Oxblood leather", family:"leather", recipe:"leather", colors:["#5b2a22","#6e3328"], tile:.3, rough:.5,
    origin:"Full-grain, dyed", text:"A deep red-brown, the colour of club chairs and good shoes.", facts:["The name is the colour, not the dye"]},
  {id:"chocolate-leather", name:"Aniline leather, chocolate", family:"leather", recipe:"leather", colors:["#3e2a20","#4e3628"], tile:.3, rough:.6,
    origin:"Full-grain, dyed through with no surface pigment", text:"Aniline-dyed leather shows its own grain and every mark of use. The other candidate for the rocker.", facts:["Soft, but it stains easily"]},
  // ---- metals
  {id:"brass", name:"Brass", family:"metal", recipe:"metal", colors:["#c9a45c","#6e6a3e"], patina:.18, metal:true, tile:.3, rough:.3,
    origin:"Copper and zinc", text:"Copper with zinc, typically about 70/30 for cartridge brass. The house's instruments, door furniture, and lamp fittings. It tarnishes to a soft brown, and to green where it is damp.", facts:["Zinc lightens the colour toward yellow","Takes a fine polish and machines cleanly"]},
  {id:"bell-bronze", name:"Bell bronze", family:"metal", recipe:"metal", colors:["#a87a48","#3f6f62"], patina:.3, metal:true, tile:.4, rough:.35,
    origin:"Copper and tin", text:"About 78 parts copper to 22 tin: harder and more brittle than ordinary bronze, and it rings. The carillon's bells, when they are cast, will be this.", facts:["Ordinary statuary bronze has more like 88 to 12","The tin is what makes it ring"]},
  {id:"copper-verdigris", name:"Copper with verdigris", family:"metal", recipe:"metal", colors:["#b86a46","#5f9e8a"], patina:.55, metal:true, tile:.5, rough:.4,
    origin:"Copper, weathered", text:"Copper outdoors turns brown, then black, then, over decades, the blue-green of copper carbonates and sulphates. The Statue of Liberty is copper sheet.", facts:["The patina protects the metal beneath it"]},
  {id:"wrought-iron", name:"Wrought iron", family:"metal", recipe:"iron", colors:["#2e2c2a","#4a4642"], metal:true, tile:.5,
    origin:"Iron worked from the bloom, with threads of slag", text:"Nearly pure iron with fibres of glassy slag drawn out along it, so it rusts in streaks and bends rather than snaps. Gates, railings, and the hall's lanterns.", facts:["Low in carbon, unlike cast iron","No longer made commercially; old pieces are salvaged"]},
  {id:"pewter", name:"Pewter", family:"metal", recipe:"metal", colors:["#9a9a96"], metal:true, tile:.3, rough:.45,
    origin:"Mostly tin", text:"Tin hardened with a little antimony and copper (old pewter often had lead). Soft and dull silver-grey: tankards, plates, and spoons.", facts:["Modern pewter is lead-free"]},
  {id:"sterling", name:"Sterling silver", family:"metal", recipe:"metal", colors:["#d8d8d4","#2a2420"], patina:.08, metal:true, tile:.3, rough:.15,
    origin:"Silver 92.5%, copper 7.5%", text:"Pure silver is too soft to use; copper stiffens it. Tarnishes black where sulphur reaches it.", facts:["The hallmark guarantees the standard"]},
  // ---- plasters
  {id:"lime-plaster", name:"Lime plaster", family:"plaster", recipe:"plaster", colors:["#e3dccb","#d6cdb8"], tile:2.2, rough:.9,
    origin:"Slaked lime and sand", text:"Lime sets slowly by taking carbon dioxide back out of the air and turning to limestone again. Soft, breathable, and full of small trowel marks.", facts:["Ca(OH)₂ + CO₂ → CaCO₃ + H₂O"]},
  {id:"tadelakt", name:"Tadelakt", family:"plaster", recipe:"plaster", colors:["#c98d64","#b8784f"], polished:true, tile:1.5, rough:.45,
    origin:"Marrakesh", text:"A Moroccan lime plaster, polished with river stones and sealed with black olive soap until it is waterproof. Hammams and fountains.", facts:["The soap reacts with the lime to form a water-repellent skin"]},
  // ---- tiles
  {id:"terracotta", name:"Terracotta tiles", family:"tile", recipe:"tile", colors:["#b0603e","#c27a52"], grout:"#cbbfa8", squares:4, tile:1.2,
    origin:"“Baked earth”", text:"Unglazed tiles of fired red clay, each a little different. Warm underfoot, and they darken with wax.", facts:["Fired at lower temperatures than stoneware, so they stay porous"]},
  {id:"truchet-diagonal", name:"Truchet tiles", family:"tile", recipe:"tile", truchet:"diagonal", colors:["#2a3a52","#e6dccb"], grout:"#9a9080", squares:8, tile:1.2, glazed:true,
    origin:"Sébastien Truchet, 1704", text:"One square split on its diagonal into two colours. Turned four ways and laid at random, they make mazes, stars, and lozenges. Truchet counted the patterns of pairs as a problem in combinations.",
    facts:["Four orientations per tile, so 4ⁿ ways to lay n tiles","Truchet's memoir was read to the Académie royale des sciences in 1704"]},
  {id:"truchet-arcs", name:"Smith's arcs", family:"tile", recipe:"tile", truchet:"arcs", colors:["#e6dccb","#3a5a4a"], grout:"#9a9080", squares:8, tile:1.2, glazed:true,
    origin:"After Cyril Stanley Smith, 1987", text:"A Truchet tile with two quarter-circles joining the midpoints of its sides. However you turn them, the arcs join up into unbroken winding paths: a random tiling that is always a set of closed curves (or curves running off the edge).",
    facts:["Only two distinct orientations","Every path is a closed loop or meets the boundary"]},
];

const BY = {}; L.forEach(e => BY[e.id] = e);
const FAMILIES = [
  {id:"wood", name:"Woods"}, {id:"stone", name:"Stones"}, {id:"brick", name:"Bricks"}, {id:"textile", name:"Cloths"},
  {id:"leather", name:"Leathers"}, {id:"metal", name:"Metals"}, {id:"plaster", name:"Plasters"}, {id:"tile", name:"Tiles"}];

// the room data's old floor words, and what they mean now
const FLOORS = {planks:"oak-boards", stone:"limestone-flags", slate:"slate", checker:"marble-checker", parquet:"oak-parquet", brick:"brick-herringbone", tile:"terracotta"};

/* ---------- baking: colour (sRGB bytes), height (floats), roughness (bytes), and a normal map from the height ---------- */
const CACHE = {};
function bake(id, N){
  const e = BY[id]; if(!e) return null; N = N || 512; const key = id + "@" + N; if(CACHE[key]) return CACHE[key];
  const n = pnoise(hashStr(id)), f = RECIPES[e.recipe](e, n), col = new Uint8ClampedArray(N*N*4), rough = new Uint8ClampedArray(N*N*4), H = new Float32Array(N*N);
  const toS = x => { x = clamp(x); return 255*(x <= .0031308 ? 12.92*x : 1.055*Math.pow(x, 1/2.4) - .055); };
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const [c, h, r] = f((x + .5)/N, (y + .5)/N), i = (y*N + x)*4;
    // the recipes speak in sRGB-ish colours from the swatches; treat them as display colours and store them as such
    col[i] = clamp(c[0])*255; col[i+1] = clamp(c[1])*255; col[i+2] = clamp(c[2])*255; col[i+3] = 255; H[y*N + x] = h;
    const rv = clamp(r, .04, 1)*255; rough[i] = rough[i+1] = rough[i+2] = rv; rough[i+3] = 255; }
  const k = (e.bump || ({wood:3, stone:4, brick:6, textile:5, leather:4, metal:1.2, plaster:3, tile:5})[e.family] || 3) * N/512;
  const nrm = new Uint8ClampedArray(N*N*4);
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const hx = H[y*N + (x+1)%N] - H[y*N + (x-1+N)%N], hy = H[((y+1)%N)*N + x] - H[((y-1+N)%N)*N + x];
    const nx = -hx*k, ny = -hy*k, l = Math.hypot(nx, ny, 1), i = (y*N + x)*4; nrm[i] = (nx/l*.5+.5)*255; nrm[i+1] = (ny/l*.5+.5)*255; nrm[i+2] = (1/l*.5+.5)*255; nrm[i+3] = 255; }
  return (CACHE[key] = {N, col, rough, H, nrm, entry:e});
}
/* ---------- a swatch for the cabinet: the colour, lit by a lamp you can move, using the bump ---------- */
function swatch(canvas, id, light, opts){
  opts = opts || {}; const e = BY[id]; if(!e) return; const S = canvas.width, Sy = canvas.height, N = opts.N || 256, b = bake(id, N), g = canvas.getContext("2d"), img = g.createImageData(S, Sy);
  const L0 = light || [-.5, .6, .8], ll = Math.hypot(...L0), Lx = L0[0]/ll, Ly = L0[1]/ll, Lz = L0[2]/ll, metal = !!e.metal, zoom = opts.zoom || 1;
  for(let y=0;y<Sy;y++) for(let x=0;x<S;x++){ const tx = Math.floor((x/S/zoom)*N) % N, ty = Math.floor((y/S/zoom)*N) % N, j = (ty*N + tx)*4, o = (y*S + x)*4;
    const nx = b.nrm[j]/127.5 - 1, ny = -(b.nrm[j+1]/127.5 - 1), nz = b.nrm[j+2]/127.5 - 1, d = Math.max(0, nx*Lx + ny*Ly + nz*Lz), r = b.rough[j]/255;
    // half-vector toward a viewer straight in front
    const hx = Lx, hy = Ly, hz = Lz + 1, hl = Math.hypot(hx, hy, hz), sp = Math.pow(Math.max(0, (nx*hx + ny*hy + nz*hz)/hl), 2/Math.max(.02, r*r)) * (1 - r)*(metal ? 1.4 : .5);
    const amb = .32, k = amb + .78*d;
    for(let c=0;c<3;c++){ const base = b.col[j+c]; img.data[o+c] = Math.min(255, base*k + (metal ? base : 255)*sp); } img.data[o+3] = 255; }
  g.putImageData(img, 0, 0);
}
window.MATERIALS = {list:L, by:BY, families:FAMILIES, floors:FLOORS, drafts:DRAFTS, bake, swatch, recipes:RECIPES,
  floorFor: word => BY[word] ? word : FLOORS[word] || null};
})();
