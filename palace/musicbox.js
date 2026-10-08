/* The Wending House: the music box's workshop — a zoomed-in screen with six drawers.
   Compose (generated music), Room (impulse responses: made, measured, loaded; four senses of convolution),
   Lab (convolve, deconvolve, correlate), Sources (files, radio, embeds, the microphone), Sonar (echoes, two-device ranging, Doppler),
   and the Manual. Loaded before palace.js; reaches the house through MUSICBOX.bind(). */
(function(){
"use strict";
const C = {}, D = window.MBDSP, G = window.MBGEN;
const $ = id => document.getElementById(id), esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const st = () => { const S = C.S; S.mbox = S.mbox || {}; const d = ({tab:"compose", genre:"ambient", bpm:60, scale:"dorian", tuning:"12tet", root:146.83, density:.6, swing:0, perc:true, roles:null, amb:"none", ambLevel:.5, ambRoom:false,
  ir:"office", mode:"causal", wet:.35, tape:false, noise:{colour:"off", level:.3, breathe:0, rate:8, width:1, cutoff:20000}, radio:[], sonar:{band:"audible", interval:.5, maxR:8, temp:20, f0:18000, self:.1}}); for(const k in d) if(S.mbox[k] === undefined) S.mbox[k] = d[k]; return S.mbox; };   // filled in place, so every caller holds the same object
const save = () => C.save && C.save();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const NOTE = ["C","C♯","D","E♭","E","F","F♯","G","A♭","A","B♭","B"], hzOf = m => 440*Math.pow(2, (m - 69)/12);

/* ---------- the audio chain: sources → [dry delay | convolver] → out → the house's music bus ---------- */
let ac = null, ch = null, eng = null;
function ensure(){
  if(ch) return true; ac = C.audio && C.audio(); if(!ac) return false;
  const input = ac.createGain(), dryDelay = ac.createDelay(20), dry = ac.createGain(), conv = ac.createConvolver(), wet = ac.createGain(), post = ac.createGain(), an = ac.createAnalyser();
  conv.normalize = true; an.fftSize = 2048; input.connect(dryDelay); dryDelay.connect(dry); dry.connect(post); input.connect(conv); conv.connect(wet); wet.connect(post); post.connect(an);
  const bus = C.sound && C.sound.buses && C.sound.buses.music; post.connect(bus || ac.destination);
  ch = {input, dryDelay, dry, conv, wet, post, an};
  eng = G.createEngine(ac, input, n => { notes.push(n); if(notes.length > 400) notes.splice(0, notes.length - 400); });
  const s = st(); if(s.roles) eng.set({roles: s.roles}); else s.roles = Object.assign({}, eng.useGenreDefaults(s.genre).roles);
  eng.set({genre: s.genre, bpm: s.bpm, scale: s.scale, tuning: s.tuning, root: s.root, density: s.density, swing: s.swing, perc: s.perc, roles: s.roles, tape: s.tape});
  if(s.noise && s.noise.colour !== "off") eng.noise(s.noise);
  setRoom(s.ir, s.mode, s.wet); eng.ambience(s.amb, s.ambRoom ? ch.input : ch.post); eng.setAmbLevel(s.ambLevel);
  return true;
}
const notes = [];

/* ---------- impulse responses ---------- */
const PRESETS = [
  ["dry", "Dry (no room)", () => [D.delta(64), D.delta(64)]],
  ["office", "The Office: small, wood and books", fs => D.shoeboxIR({room:[4.6, 3.8, 2.8], src:[1.2, 1.6, 1.2], mic:[3.4, 2.2, 1.3], absorb:.32, order:7, fs})],
  ["entry", "The Entry: panelled hall", fs => D.shoeboxIR({room:[7, 5.5, 3.6], src:[2, 2, 1.5], mic:[5, 3.5, 1.6], absorb:.18, order:8, fs})],
  ["archive", "The Archive: deep stacks", fs => D.synthIR({rt60:1.5, pre:.012, early:10, bright:.25, width:.7, fs, seed:3})],
  ["hall", "The Great Hall: stone and vaults", fs => D.synthIR({rt60:4.5, pre:.045, early:14, bright:.45, width:.95, fs, seed:9})],
  ["stair", "A stone stairwell", fs => D.shoeboxIR({room:[2.6, 2.4, 12], src:[1, 1, 1.5], mic:[1.6, 1.4, 1.6], absorb:.05, order:10, fs})],
  ["cathedral", "A cathedral", fs => D.synthIR({rt60:7, pre:.07, early:18, bright:.5, width:1, fs, seed:13})],
  ["cave", "A cave with a pool", fs => D.normalize(D.synthIR({rt60:3.2, pre:.03, early:22, bright:.3, width:.9, fs, seed:21}).map((c, i) => { const e = D.echoIR({fs, delays:[.19, .41], gains:[.35, .2], len:c.length/fs})[i]; return c.map((v, k) => v + .5*(e[k] || 0)); }))],
  ["plate", "A plate", fs => D.synthIR({rt60:2.3, pre:0, early:0, bright:.95, width:1, fs, seed:4})],
  ["spring", "A spring tank", fs => D.springIR({fs})],
  ["canyon", "A canyon", fs => D.echoIR({fs, delays:[.42, .87, 1.31, 1.8], gains:[.55, .35, .2, .1], len:3})],
  ["tunnel", "A long tunnel", fs => D.echoIR({fs, delays:[.08, .16, .24, .32, .40, .48], gains:[.5, .35, .25, .17, .11, .07], len:2.2, tailRt:1.8})],
  ["forest", "A forest clearing", fs => D.echoIR({fs, delays:[.11, .23, .37], gains:[.18, .12, .08], len:1.2, tailRt:.5})],
];
const lib = {};           // id → {id, name, fs, chs, made?, saved?}
function presetIR(id){ if(lib[id]) return lib[id]; const p = PRESETS.find(x => x[0] === id); if(!p) return null; const fs = ac ? ac.sampleRate : 48000; lib[id] = {id, name: p[1], fs, chs: p[2](fs), preset: true}; return lib[id]; }
function toBuffer(chs, fs){ const b = ac.createBuffer(chs.length, chs[0].length, fs); chs.forEach((c, i) => b.getChannelData(i).set(c)); return b; }
// the convolver can only run forward in time, so the anti-causal and symmetric senses delay the dry sound to make room for what comes "before"
function setRoom(id, mode, wet){ if(!ensure()) return; const s = st(); s.ir = id; s.mode = mode = mode || s.mode; if(wet != null) s.wet = wet;
  const ir = lib[id] || presetIR(id) || presetIR("dry"), fs = ir.fs;
  const ks = ir.chs.map(h => D.kernelFor(h, mode)), zero = ks[0].zero;
  ch.conv.buffer = toBuffer(ks.map(k => k.k), fs); ch.dryDelay.delayTime.setValueAtTime(Math.min(19.9, zero/fs), ac.currentTime);
  const w = id === "dry" ? 0 : s.wet; ch.wet.gain.setTargetAtTime(w*1.4, ac.currentTime, .05); ch.dry.gain.setTargetAtTime(1 - w*.7, ac.currentTime, .05); save(); }

/* the library of saved responses, kept in this browser (IndexedDB) */
const idb = (() => { let dbp = null; const open = () => dbp || (dbp = new Promise((res, rej) => { try { const r = indexedDB.open("wending-musicbox", 1); r.onupgradeneeded = () => r.result.createObjectStore("irs", {keyPath:"id"}); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch(e){ rej(e); } }));
  const tx = (mode, fn) => open().then(db => new Promise((res, rej) => { const t = db.transaction("irs", mode), s = t.objectStore("irs"), r = fn(s); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }));
  return {all: () => tx("readonly", s => s.getAll()).catch(() => []), put: o => tx("readwrite", s => s.put(o)).catch(() => null), del: id => tx("readwrite", s => s.delete(id)).catch(() => null)}; })();
async function loadSaved(){ const all = await idb.all(); (all || []).forEach(o => { lib[o.id] = Object.assign(o, {saved:true}); }); }
async function saveIR(name, chs, fs){ const id = "u" + Date.now().toString(36); lib[id] = {id, name, fs, chs, saved:true}; await idb.put({id, name, fs, chs}); return id; }

/* ---------- recording: an AudioWorklet that hands back every block with its context time ---------- */
let recReady = null;
function recModule(){ if(recReady) return recReady; const src = `class R extends AudioWorkletProcessor{constructor(){super();this.on=true;this.port.onmessage=e=>{if(e.data==="stop")this.on=false;};}
  process(i){const c=i[0]&&i[0][0];if(c&&this.on)this.port.postMessage({t:currentTime,d:c.slice(0)});return this.on;}}registerProcessor("mbx-rec",R);`;
  recReady = ac.audioWorklet.addModule(URL.createObjectURL(new Blob([src], {type:"application/javascript"}))); return recReady; }
async function recorder(node, keepSeconds = 0){ await recModule(); const w = new AudioWorkletNode(ac, "mbx-rec"), sink = ac.createGain(); sink.gain.value = 0; node.connect(w); w.connect(sink); sink.connect(ac.destination);
  const chunks = []; w.port.onmessage = e => { chunks.push(e.data); if(keepSeconds){ const lim = keepSeconds*ac.sampleRate/128; if(chunks.length > lim) chunks.splice(0, chunks.length - lim); } };
  return {chunks, stop(){ w.port.postMessage("stop"); try { node.disconnect(w); w.disconnect(); sink.disconnect(); } catch(e){} return flatten(chunks); }, window(t0, t1){ return slice(chunks, t0, t1); }}; }
function flatten(chunks){ const n = chunks.reduce((a, c) => a + c.d.length, 0), out = new Float32Array(n); let o = 0; chunks.forEach(c => { out.set(c.d, o); o += c.d.length; }); return {data: out, t0: chunks.length ? chunks[0].t : 0}; }
function slice(chunks, t0, t1){ const fs = ac.sampleRate, out = new Float32Array(Math.max(0, Math.round((t1 - t0)*fs))); chunks.forEach(c => { const off = Math.round((c.t - t0)*fs); for(let i = 0; i < c.d.length; i++){ const k = off + i; if(k >= 0 && k < out.length) out[k] = c.d[i]; } }); return out; }
// the microphone, with the browser's voice processing turned off (it would ruin a measurement)
const mics = {};
async function micNode(deviceId){ const key = deviceId || "default"; if(mics[key]) return mics[key];
  const stream = await navigator.mediaDevices.getUserMedia({audio: {deviceId: deviceId ? {exact: deviceId} : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1}});
  mics[key] = {stream, node: ac.createMediaStreamSource(stream)}; return mics[key]; }
async function devices(){ try { const d = await navigator.mediaDevices.enumerateDevices(); return {ins: d.filter(x => x.kind === "audioinput"), outs: d.filter(x => x.kind === "audiooutput")}; } catch(e){ return {ins: [], outs: []}; } }
function playBuffer(chs, fs, when, dest, gain = 1){ const b = toBuffer(chs, fs), s = ac.createBufferSource(); s.buffer = b; const g = ac.createGain(); g.gain.value = gain; s.connect(g); g.connect(dest || ac.destination); s.start(when || 0); return s; }

/* ---------- probe signals for measuring a room ---------- */
const PROBES = [
  ["ess", "Exponential sine sweep (Farina)"], ["lin", "Linear sine sweep"], ["delta", "Impulse (a click)"], ["mls", "Maximum-length sequence"], ["golay", "Golay complementary pair"],
  ["white", "White noise"], ["pink", "Pink noise"], ["chirp", "Short chirp"], ["costas", "Costas frequency hops"], ["multi", "Anti-harmonic multitone"]];
function makeProbe(kind, p, fs){
  const f1 = +p.f1 || 40, f2 = Math.min(+p.f2 || 20000, fs/2 - 100), T = +p.T || 3;
  switch(kind){
    case "ess": return {x: D.essSweep(f1, f2, T, fs), inv: D.essInverse(f1, f2, T, fs)};
    case "lin": return {x: D.linSweep(f1, f2, T, fs)};
    case "delta": { const x = new Float32Array(Math.round(.002*fs)); x[0] = 1; x[1] = .6; return {x, direct: true}; }
    case "mls": { const m = D.mls(Math.min(18, Math.max(12, Math.round(Math.log2(T*fs))))), x = new Float32Array(m.length*2); x.set(m); x.set(m, m.length); return {x: x.map(v => v*.5)}; }
    case "golay": { const n = Math.min(17, Math.max(10, Math.round(Math.log2(T*fs/2)))), g = D.golay(n); return {golay: g, x: null}; }
    case "white": return {x: D.noise(T, fs, "white", 3)};
    case "pink": return {x: D.noise(T, fs, "pink", 5)};
    case "chirp": return {x: D.chirp(f1, f2, Math.min(T, .2), fs)};
    case "costas": { const c = D.costas(13, Math.max(f1, 300), Math.min(400, (f2 - Math.max(f1, 300))/13), Math.min(.03, T/13), fs); return {x: c.x}; }
    case "multi": { const fr = D.antiHarmonicFreqs(16, Math.max(f1, 80), Math.min(f2, 12000)); return {x: D.multitone(fr, T, fs), freqs: fr}; }
  }
}
async function measure(opts, status){
  if(!ensure()) throw new Error("Sound is off; click anything in the house first.");
  const fs = ac.sampleRate, s = st(), irLen = Math.round((+opts.irLen || 2)*fs), reps = Math.max(1, Math.min(8, +opts.reps || 1)), gap = (+opts.irLen || 2) + .3, level = Math.min(1, +opts.level || .3);
  const mic = await micNode(opts.input || null), probe = makeProbe(opts.kind, opts, fs);
  const segs = probe.golay ? (() => { const g = probe.golay, z = new Float32Array(Math.round(gap*fs)), x = new Float32Array(g.a.length*2 + z.length*2); x.set(g.a); x.set(g.b, g.a.length + z.length); return {x, half: g.a.length + z.length}; })() : null;
  const x = segs ? segs.x : probe.x, period = x.length + (segs ? 0 : Math.round(gap*fs));
  const rec = await recorder(mic.node); await sleep(250);
  const t0 = ac.currentTime + .15; status && status(`Playing the probe${reps > 1 ? ` ${reps} times` : ""}…`);
  for(let r = 0; r < reps; r++) playBuffer([x], fs, t0 + r*period/fs, ac.destination, level);
  await sleep(((reps*period)/fs + .6)*1000); const {data, t0: rt0} = rec.stop(); status && status("Working it out…");
  const off = Math.round((t0 - rt0)*fs), y = new Float32Array(period);
  for(let r = 0; r < reps; r++) for(let i = 0; i < period; i++){ const k = off + r*period + i; if(k >= 0 && k < data.length) y[i] += data[k]/reps; }
  let ir, negative = null;
  if(probe.direct) ir = y.slice(0, irLen);
  else if(probe.golay){ const g = probe.golay, ya = y.subarray(0, segs.half), yb = y.subarray(segs.half), ra = D.correlate(ya, g.a).pos, rb = D.correlate(yb, g.b).pos; ir = new Float32Array(irLen); for(let i = 0; i < irLen; i++) ir[i] = ((ra[i] || 0) + (rb[i] || 0))/(2*g.a.length); }
  else if(probe.inv && opts.farina){ const full = D.convolve(y, probe.inv), z = x.length - 1; ir = full.slice(z, z + irLen); negative = full.slice(Math.max(0, z - Math.round(fs*.5)), z); }
  else { const r = D.deconvolve(y, x, +opts.eps || 1e-3, irLen); ir = r.ir; negative = r.negative; }
  let peak = D.peakIndex(ir, 0, Math.min(ir.length, Math.round(.5*fs)));
  const latencyMs = peak/fs*1000, trimmed = D.trimIR([ir], fs)[0], norm = D.normalize([trimmed])[0];
  // energy in the probe's own recording, for a signal-to-noise estimate
  let sig = 0, nz = 0; const n0 = Math.round(.05*fs); for(let i = 0; i < Math.min(norm.length, n0); i++) sig += norm[i]*norm[i]; for(let i = Math.max(0, norm.length - n0); i < norm.length; i++) nz += norm[i]*norm[i];
  return {chs: [norm], fs, latencyMs, rt60: D.rt60(norm, fs), snr: 10*Math.log10(sig/Math.max(1e-12, nz)), negative, freqs: probe.freqs};
}

/* ---------- drawing ---------- */
const css = v => getComputedStyle($("mbx") || document.documentElement).getPropertyValue(v).trim() || "#333";   // the workshop's own ink, not the dark house's
function plotWave(cv, x, fs, opts = {}){ if(!cv) return; const g = cv.getContext("2d"), W = cv.width, H = cv.height; g.clearRect(0, 0, W, H); g.fillStyle = "rgba(0,0,0,.04)"; g.fillRect(0, 0, W, H);
  g.strokeStyle = css("--ink"); g.lineWidth = 1; g.beginPath(); const n = x.length, step = Math.max(1, n/W); let m = 0; for(let i = 0; i < n; i++) m = Math.max(m, Math.abs(x[i])); m = m || 1;
  for(let px = 0; px < W; px++){ let lo = 1, hi = -1; for(let i = Math.floor(px*step); i < Math.min(n, Math.floor((px + 1)*step)); i++){ const v = x[i]/m; if(v < lo) lo = v; if(v > hi) hi = v; } if(lo > hi) continue; g.moveTo(px + .5, H/2 - hi*H*.45); g.lineTo(px + .5, H/2 - lo*H*.45 + .5); } g.stroke();
  g.fillStyle = css("--muted"); g.font = "11px serif"; g.fillText(opts.label || `${(n/fs).toFixed(2)} s`, 6, 12); if(opts.zero){ const zx = opts.zero/n*W; g.strokeStyle = css("--spot"); g.beginPath(); g.moveTo(zx, 0); g.lineTo(zx, H); g.stroke(); g.fillText("t = 0", zx + 3, H - 4); } }
function plotDecay(cv, x, fs){ if(!cv) return; const g = cv.getContext("2d"), W = cv.width, H = cv.height, d = D.schroeder(x), n = d.length; g.clearRect(0, 0, W, H); g.fillStyle = "rgba(0,0,0,.04)"; g.fillRect(0, 0, W, H);
  g.strokeStyle = css("--line"); g.fillStyle = css("--muted"); g.font = "11px serif"; for(let db = 0; db >= -80; db -= 20){ const y = -db/80*H; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); g.fillText(db + " dB", 4, y - 2); }
  g.strokeStyle = css("--spot"); g.lineWidth = 1.6; g.beginPath(); for(let px = 0; px < W; px++){ const v = d[Math.floor(px/W*n)], y = Math.min(H, -v/80*H); px ? g.lineTo(px, y) : g.moveTo(px, y); } g.stroke();
  const t = D.rt60(x, fs); g.fillStyle = css("--ink"); g.fillText(`energy decay (Schroeder) · RT60 ≈ ${t ? t.toFixed(2) + " s" : "—"}`, 70, 12); }
function plotSpectrum(cv, x, fs){ if(!cv) return; const g = cv.getContext("2d"), W = cv.width, H = cv.height, mag = D.magnitudeDb(x.length > 1<<17 ? x.subarray(0, 1<<17) : x, Math.max(4096, Math.min(1<<17, x.length))), n = mag.length; let mx = -999; for(let i = 1; i < n; i++) mx = Math.max(mx, mag[i]);
  g.clearRect(0, 0, W, H); g.fillStyle = "rgba(0,0,0,.04)"; g.fillRect(0, 0, W, H); g.strokeStyle = css("--line"); g.fillStyle = css("--muted"); g.font = "11px serif";
  const fx = f => Math.log(f/20)/Math.log((fs/2)/20)*W; [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].forEach(f => { if(f > fs/2) return; const x0 = fx(f); g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0, H); g.stroke(); g.fillText(f >= 1000 ? f/1000 + "k" : f, x0 + 2, H - 3); });
  g.strokeStyle = css("--ink"); g.lineWidth = 1.2; g.beginPath(); let first = true; for(let px = 0; px < W; px++){ const f = 20*Math.pow((fs/2)/20, px/W), i = Math.min(n - 1, Math.round(f/(fs/2)*n)), y = (mx - mag[i])/60*H; if(first){ g.moveTo(px, y); first = false; } else g.lineTo(px, y); } g.stroke(); g.fillText("magnitude, 60 dB range", 70, 12); }
// the cylinder: the notes just played, as pins on a turning drum
function drawCylinder(){ const cv = $("mbx-cyl"); if(!cv || !ac) return; const g = cv.getContext("2d"), W = cv.width, H = cv.height, now = ac.currentTime, span = 8;
  g.fillStyle = "#cdb98f"; g.fillRect(0, 0, W, H); const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, "rgba(0,0,0,.35)"); grd.addColorStop(.5, "rgba(255,255,255,.15)"); grd.addColorStop(1, "rgba(0,0,0,.4)"); g.fillStyle = grd; g.fillRect(0, 0, W, H);
  const lo = Math.log2(40), hi = Math.log2(3000); notes.forEach(n => { const x = W*.85 - (now - n.t)/span*W; if(x < -20 || x > W) return; if(n.perc){ g.fillStyle = "rgba(60,40,20,.5)"; g.fillRect(x, H - 6, 3, 4); return; }
    const y = H - (Math.log2(n.f) - lo)/(hi - lo)*H, len = Math.max(3, n.dur/span*W); g.fillStyle = {lead:"#6b2a1c", harmony:"#3b3226", bass:"#24324a"}[n.role] || "#333"; g.beginPath(); g.ellipse(x, y, 2.6, 2.6, 0, 0, 7); g.fill(); g.globalAlpha = .25; g.fillRect(x, y - 1, len, 2); g.globalAlpha = 1; });
  g.strokeStyle = "rgba(255,240,200,.8)"; g.beginPath(); g.moveTo(W*.85, 0); g.lineTo(W*.85, H); g.stroke(); g.fillStyle = "rgba(255,240,200,.85)"; g.font = "10px serif"; g.fillText("the comb", W*.85 + 4, 11); }
// the scale against twelve equal semitones
function scaleRuler(){ const sc = G.scaleOf(st().scale), s = st(), L = sc.def.step ? 15 : (sc.def.semis || sc.def.cents).length, P = sc.def.period || 1200, W = 520;
  let b = `<svg viewBox="0 0 ${W} 54" style="width:100%;max-width:${W}px">`; for(let k = 0; k <= 12; k++){ const x = 10 + k/12*(W - 20); b += `<line x1="${x}" y1="10" x2="${x}" y2="26" stroke="currentColor" stroke-opacity=".3"/><text x="${x}" y="8" font-size="8" text-anchor="middle" fill="currentColor" opacity=".5">${k*100}</text>`; }
  for(let d = 0; d < L; d++){ const c = G.degreeCents(sc, d, s.tuning); if(c > Math.max(P, 1200) + 1) continue; const x = 10 + c/1200*(W - 20)*(1200/Math.max(P, 1200)); b += `<circle cx="${x}" cy="34" r="4" fill="var(--spot)"/><text x="${x}" y="50" font-size="8.5" text-anchor="middle" fill="currentColor">${Math.round(c)}</text>`; }
  return b + `</svg><p class="note">The degrees of the scale in cents above the root (dots), against the twelve equal semitones (ticks)${P !== 1200 ? `; this scale repeats at ${P.toFixed(0)} cents, not the octave` : ""}.</p>`; }

/* ---------- the screen ---------- */
const TABS = [["compose","Compose"],["room","Room"],["lab","Lab"],["sources","Sources"],["sonar","Sonar"],["manual","Manual"]];
let rafId = null;
function open(){
  ensure(); loadSaved().then(() => { if(st().tab === "room" || st().tab === "lab") draw(); });
  let el = $("mbx"); if(!el){ el = document.createElement("div"); el.id = "mbx"; el.className = "mbx win"; document.body.appendChild(el); }
  el.classList.add("open"); draw(); C.award && C.award("musicbox-workshop", 10);
  const loop = () => { if(!$("mbx") || !$("mbx").classList.contains("open")){ rafId = null; return; } drawCylinder(); meters(); rafId = requestAnimationFrame(loop); }; if(!rafId) rafId = requestAnimationFrame(loop);
}
function close(){ const el = $("mbx"); if(el) el.classList.remove("open"); stopSonar(); }
function meters(){ const m = $("mbx-meter"); if(!m || !ch) return; const a = new Float32Array(ch.an.fftSize); ch.an.getFloatTimeDomainData(a); let p = 0; for(let i = 0; i < a.length; i++) p = Math.max(p, Math.abs(a[i])); m.style.width = Math.min(100, p*100) + "%"; }
function draw(){ const el = $("mbx"), s = st(); if(!el) return;
  el.innerHTML = `<div class="tb"><span class="t">The music box · workshop</span><button class="box" type="button" id="mbx-x" aria-label="Close" title="Close (Esc)"></button></div>
    <div class="mbx-tabs">${TABS.map(([k, n]) => `<button type="button" class="mbx-tab${k === s.tab ? " on" : ""}" data-tab="${k}">${n}</button>`).join("")}
      <span class="mbx-tr"><button type="button" class="btn" id="mbx-lv" title="The house's own sound levels: weather, footsteps, music">House sound…</button><button type="button" class="btn${eng && eng.running ? " primary" : ""}" id="mbx-play">${eng && eng.running ? "■ Stop" : "▶ Play"}</button><span class="mbx-vu"><i id="mbx-meter"></i></span></span></div>
    <div class="mbx-body" id="mbx-body">${(VIEWS[s.tab] || VIEWS.compose)()}</div>`;
  $("mbx-x").onclick = close; $("mbx-lv").onclick = () => { close(); C.levels && C.levels(); }; el.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { s.tab = b.dataset.tab; save(); draw(); });
  $("mbx-play").onclick = () => { if(!ensure()) return C.toast && C.toast("Click once in the house to let it make sound."); if(eng.running) eng.stop(); else { C.S.snd.mode = "studio"; save(); eng.start(); } draw(); };
  (WIRE[s.tab] || WIRE.compose)(); }
const sel = (id, opts, cur, extra = "") => `<select id="${id}" ${extra}>${opts.map(o => Array.isArray(o) ? `<option value="${o[0]}" ${String(o[0]) === String(cur) ? "selected" : ""}>${esc(o[1])}</option>` : `<optgroup label="${esc(o.group)}">${o.items.map(x => `<option value="${x[0]}" ${String(x[0]) === String(cur) ? "selected" : ""}>${esc(x[1])}</option>`).join("")}</optgroup>`).join("")}</select>`;
const range = (id, min, max, step, v, label, unit = "") => `<label class="mbx-r"><span>${label}</span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${v}"><b id="${id}-v">${v}${unit}</b></label>`;
const grouped = (list, fam) => { const fams = [...new Set(list.map(fam))]; return fams.map(f => ({group: f, items: list.filter(x => fam(x) === f)})); };

const VIEWS = {}, WIRE = {};
/* moods: one click sets the music, its players, the room, the ambience, and the noise */
const MOODS = [
  ["ambient", "Ambient", {genre:"ambient", amb:"none", ir:"hall"}],
  ["lofi", "Lo-fi beats", {genre:"lofi", amb:"vinyl", ir:"office", wet:.2}],
  ["lofiup", "Upbeat lo-fi", {genre:"lofiup", amb:"vinyl", ir:"office", wet:.15}],
  ["cafe", "Café jazz", {genre:"cafejazz", amb:"cafe", ir:"entry", wet:.25}],
  ["rainy", "Rainy day", {genre:"rainyday", amb:"window", ir:"office", wet:.3}],
  ["drone", "Drone", {genre:"drone", amb:"none", ir:"cathedral", wet:.5}],
  ["wind", "Wind", {genre:"ambient", amb:"wind", ir:"canyon", wet:.3, density:.3, noise:{colour:"pink", level:.12, breathe:.8, rate:11}}],
  ["water", "Water", {genre:"water", amb:"stream", ir:"cave", wet:.3}],
  ["bells", "Bells", {genre:"windchimes", amb:"none", ir:"cathedral", wet:.45}],
  ["changes", "Change ringing", {genre:"bells", amb:"none", ir:"hall", wet:.4}],
  ["storm", "Storm", {genre:"drone", amb:"storm", ir:"hall", wet:.3, density:.3}],
  ["sleep", "Sleep (brown noise)", {stopMusic:true, amb:"none", noise:{colour:"brown", level:.35, breathe:.25, rate:10}}],
  ["focus", "Focus (pink noise)", {stopMusic:true, amb:"none", noise:{colour:"pink", level:.28, breathe:0}}],
];
function applyMood(k){ if(!ensure()) return; const m = (MOODS.find(x => x[0] === k) || MOODS[0])[2], s = st();
  if(m.genre){ const r = eng.useGenreDefaults(m.genre); Object.assign(s, {genre: r.genre, bpm: r.bpm, roles: Object.assign({}, r.roles), scale: r.scale, tuning: r.tuning, swing: r.swing, tape: r.tape}); }
  if(m.density != null){ s.density = m.density; eng.set({density: m.density}); }
  s.amb = m.amb || (eng.st.ambience) || "none"; eng.ambience(s.amb, s.ambRoom ? ch.input : ch.post);
  s.noise = Object.assign({colour:"off", level:.3, breathe:0, rate:8, width:1, cutoff:20000}, m.noise || {}); eng.noise(s.noise);
  if(m.ir) setRoom(m.ir, "causal", m.wet != null ? m.wet : s.wet);
  s.mood = k; save(); if(m.stopMusic){ if(eng.running) eng.stop(); } else if(!eng.running){ C.S.snd.mode = "studio"; eng.start(); } draw(); }
/* Compose */
VIEWS.compose = () => { const s = st(), g = eng ? eng.GENRES : {}, sc = G.scaleOf(s.scale), roots = []; for(let m = 36; m <= 60; m++) roots.push([hzOf(m).toFixed(2), `${NOTE[m % 12]}${Math.floor(m/12) - 1} (${hzOf(m).toFixed(1)} Hz)`]);
  const insts = (eng ? eng.INSTRUMENTS : []).map(k => [k, k]);
  return `<div class="mbx-moods">${MOODS.map(([k, n]) => `<button type="button" class="btn${s.mood === k ? " primary" : ""}" data-mood="${k}">${n}</button>`).join(" ")}</div>
    <div class="mbx-grid"><section><h4>Music</h4>
      <label>Kind ${sel("mc-genre", Object.keys(g).map(k => [k, g[k].name]), s.genre)}</label>
      ${range("mc-bpm", 20, 200, 1, s.bpm, "Tempo", " bpm")}${range("mc-den", 0, 1, .05, s.density, "Density")}${range("mc-swing", 0, 1, .05, s.swing, "Swing")}
      <label><input type="checkbox" id="mc-perc" ${s.perc ? "checked" : ""}> percussion where the music has it</label>
      <label><input type="checkbox" id="mc-tape" ${s.tape ? "checked" : ""}> through tape (wow, flutter, a darker tone, a little saturation)</label>
      <h4>Pitch</h4><label>Root ${sel("mc-root", roots, (+s.root).toFixed(2))}</label>
      <label>Scale ${sel("mc-scale", grouped(G.SCALES, x => x[2]).map(gr => ({group: gr.group, items: gr.items.map(x => [x[0], x[1]])})), s.scale)}</label>
      <label>Tuning ${sel("mc-tuning", Object.entries(G.TUNINGS).map(([k, t]) => [k, t.name]), s.tuning, sc.def.semis ? "" : "disabled title='This scale carries its own tuning'")}</label>
      <div id="mc-ruler">${scaleRuler()}</div></section>
    <section><h4>Players</h4>${["lead","harmony","bass"].map(r => `<label>${r} ${sel("mc-r-" + r, insts, (s.roles||{})[r])} <button class="btn" type="button" data-try="${r}">try</button></label>`).join("")}
      <h4>Around it</h4><label>Ambience ${sel("mc-amb", G.AMBIENCES, s.amb)}</label>${range("mc-ambl", 0, 1, .05, s.ambLevel, "Ambience level")}
      <label><input type="checkbox" id="mc-ambroom" ${s.ambRoom ? "checked" : ""}> put the ambience in the room too</label>
      <h4>Noise</h4><label>Colour ${sel("mc-nc", eng ? eng.NOISES : [["off","Off"]], s.noise.colour)}</label>
      ${range("mc-nl", 0, 1, .02, s.noise.level, "Level")}${range("mc-nb", 0, 1, .05, s.noise.breathe, "Breathing")}${range("mc-nr", 3, 30, 1, s.noise.rate, "Breath length", " s")}${range("mc-nw", 0, 1, .05, s.noise.width, "Stereo width")}${range("mc-nf", 200, 20000, 100, s.noise.cutoff, "Muffle above", " Hz")}
      <p class="note">Noise plays on its own, with or without the music. Each colour is made by shaping the spectrum of white noise, so it loops without a seam.</p>
      <p class="note">The room (its reverberation) is set in the Room drawer: now <b>${esc((lib[s.ir] || {name: (PRESETS.find(p => p[0] === s.ir) || [0, s.ir])[1]}).name)}</b>, ${s.mode}.</p>
      <canvas id="mbx-cyl" width="560" height="150" class="mbx-cv"></canvas></section></div>`; };
WIRE.compose = () => { const s = st(), up = o => { Object.assign(s, o); save(); if(ensure()) eng.set(o); };
  $("mc-genre").onchange = e => { if(!ensure()) return; const r = eng.useGenreDefaults(e.target.value); Object.assign(s, {genre: r.genre, bpm: r.bpm, roles: Object.assign({}, r.roles), scale: r.scale, tuning: r.tuning, swing: r.swing, tape: r.tape, mood: null});
    if(r.ambience){ s.amb = r.ambience; eng.ambience(s.amb, s.ambRoom ? ch.input : ch.post); } save(); draw(); };
  [["mc-bpm","bpm"],["mc-den","density"],["mc-swing","swing"]].forEach(([id, k]) => $(id).oninput = e => { $(id + "-v").textContent = e.target.value + (k === "bpm" ? " bpm" : ""); up({[k]: +e.target.value}); });
  $("mc-perc").onchange = e => up({perc: e.target.checked}); $("mc-tape").onchange = e => up({tape: e.target.checked});
  document.querySelectorAll("[data-mood]").forEach(b => b.onclick = () => applyMood(b.dataset.mood));
  const nz = () => { if(ensure()) eng.noise(s.noise); save(); };
  $("mc-nc").onchange = e => { s.noise.colour = e.target.value; nz(); };
  [["mc-nl","level",""],["mc-nb","breathe",""],["mc-nr","rate"," s"],["mc-nw","width",""],["mc-nf","cutoff"," Hz"]].forEach(([id, k, u]) => { $(id).oninput = e => { $(id + "-v").textContent = e.target.value + u; s.noise[k] = +e.target.value; }; $(id).onchange = nz; }); $("mc-root").onchange = e => up({root: +e.target.value});
  $("mc-scale").onchange = e => { up({scale: e.target.value}); draw(); }; $("mc-tuning").onchange = e => { up({tuning: e.target.value}); $("mc-ruler").innerHTML = scaleRuler(); };
  ["lead","harmony","bass"].forEach(r => { $("mc-r-" + r).onchange = e => { s.roles = Object.assign({}, s.roles, {[r]: e.target.value}); up({roles: s.roles}); }; });
  document.querySelectorAll("[data-try]").forEach(b => b.onclick = () => { if(ensure()) eng.preview(s.roles[b.dataset.try], eng.freq(b.dataset.try === "bass" ? 0 : 4, b.dataset.try === "bass" ? -1 : 0)); });
  $("mc-amb").onchange = e => { up({amb: e.target.value}); if(ensure()) eng.ambience(s.amb, s.ambRoom ? ch.input : ch.post); };
  $("mc-ambl").oninput = e => { $("mc-ambl-v").textContent = e.target.value; up({ambLevel: +e.target.value}); if(ensure()) eng.setAmbLevel(+e.target.value); };
  $("mc-ambroom").onchange = e => { up({ambRoom: e.target.checked}); if(ensure()) eng.ambience(s.amb, s.ambRoom ? ch.input : ch.post); }; };

/* Room */
let lastMeasure = null, viewIR = null;
VIEWS.room = () => { const s = st(), all = PRESETS.map(p => [p[0], p[1]]).concat(Object.values(lib).filter(x => !x.preset).map(x => [x.id, x.name + (x.saved ? " (yours)" : "")]));
  return `<div class="mbx-grid"><section><h4>The room</h4><label>Response ${sel("mr-ir", all, s.ir)}</label>
      <div class="mbx-modes">${[["causal","Causal","the echo follows the sound"],["anticausal","Anti-causal","the echo comes first, swelling into the sound"],["symmetric","Symmetric","half before, half after: ½(h(t)+h(−t))"],["zerophase","Zero-phase","forward then backward: |H|², no phase"]].map(([k, n, d]) => `<label title="${d}"><input type="radio" name="mr-mode" value="${k}" ${s.mode === k ? "checked" : ""}> <b>${n}</b> <span class="note">${d}</span></label>`).join("")}</div>
      ${range("mr-wet", 0, 1, .05, s.wet, "Wet")}
      <p class="row"><button class="btn" type="button" id="mr-dl">Download as WAV</button> <label class="btn">Load a WAV as a room<input type="file" id="mr-load" accept="audio/*" hidden></label> <button class="btn" type="button" id="mr-del" ${lib[s.ir] && lib[s.ir].saved ? "" : "disabled"}>Forget it</button></p>
      <canvas id="mr-w" width="560" height="90" class="mbx-cv"></canvas><canvas id="mr-d" width="560" height="110" class="mbx-cv"></canvas><canvas id="mr-s" width="560" height="110" class="mbx-cv"></canvas>
      <h4>Make one</h4><details><summary>A rectangular room, by mirror images</summary><p class="note">Every reflection off a flat wall looks like sound from a mirrored copy of the source; the copies tile space. Size in meters; absorption 0–1.</p>
        <div class="row">${["Lx","Ly","Lz"].map((k, i) => `<label>${k} <input id="mr-${k}" type="number" step=".1" value="${[8, 6, 3.2][i]}" style="width:4.5em"></label>`).join("")} <label>absorption <input id="mr-ab" type="number" step=".05" min=".01" max="1" value=".2" style="width:4em"></label> <label>order <input id="mr-or" type="number" min="1" max="14" value="8" style="width:3.5em"></label></div>
        <div class="row"><label>source x,y,z <input id="mr-src" value="2,3,1.5" style="width:7em"></label> <label>listener x,y,z <input id="mr-mic" value="6,2.5,1.6" style="width:7em"></label> <button class="btn" id="mr-box" type="button">Make it</button></div></details>
      <details><summary>A reverberation tail</summary><div class="row">${range("mr-rt", .2, 12, .1, 2.5, "RT60", " s")}${range("mr-br", 0, 1, .05, .5, "Brightness")}${range("mr-pd", 0, .15, .005, .02, "Pre-delay", " s")}<button class="btn" id="mr-syn" type="button">Make it</button></div></details></section>
    <section><h4>Measure a real one</h4><p class="note">Plays a probe through a speaker and records it with a microphone, then works out the room's impulse response. Use real speakers (not headphones); turn the house's music off; keep the room quiet.</p>
      <div class="row"><label>Microphone <select id="mm-in"><option value="">default</option></select></label> <label>Speaker <select id="mm-out"><option value="">default</option></select></label></div>
      <label>Probe ${sel("mm-kind", PROBES, "ess")}</label>
      <div class="row"><label>from <input id="mm-f1" type="number" value="40" style="width:5em"> Hz</label> <label>to <input id="mm-f2" type="number" value="20000" style="width:5.5em"> Hz</label> <label>length <input id="mm-T" type="number" step=".5" value="3" style="width:4em"> s</label></div>
      <div class="row"><label>level <input id="mm-lv" type="range" min=".02" max="1" step=".02" value=".25"></label> <label>repeats <input id="mm-rep" type="number" min="1" max="8" value="2" style="width:3.5em"></label> <label>listen for <input id="mm-len" type="number" step=".5" value="2.5" style="width:4em"> s</label></div>
      <div class="row"><label>regularization ε <input id="mm-eps" type="number" step=".0001" value=".001" style="width:6em"></label> <label><input type="checkbox" id="mm-far" checked> Farina's inverse filter for the exponential sweep</label></div>
      <p class="row"><button class="btn" id="mm-hear" type="button">Hear the probe</button> <button class="btn primary" id="mm-go" type="button">Measure</button></p><p class="note" id="mm-st"></p>
      <div id="mm-res">${lastMeasure ? measureCard(lastMeasure) : ""}</div></section></div>`; };
function measureCard(m){ return `<p><b>Measured.</b> Latency ${m.latencyMs.toFixed(1)} ms (the trip through the computer's buffers, trimmed away) · RT60 ${m.rt60 ? m.rt60.toFixed(2) + " s" : "—"} · head-to-tail ${m.snr.toFixed(0)} dB${m.freqs ? ` · ${m.freqs.length} tones: ${m.freqs.map(f => f.toFixed(0)).join(", ")} Hz` : ""}</p>
  ${m.negative ? `<p class="note">Before time zero (left of the red line) the sweep's harmonic distortion collects: each harmonic arrives a fixed time early.</p><canvas id="mm-neg" width="560" height="70" class="mbx-cv"></canvas>` : ""}
  <p class="row"><input id="mm-name" value="My room, ${new Date().toLocaleDateString()}" style="width:16em"> <button class="btn primary" id="mm-save" type="button">Keep it and use it</button> <button class="btn" id="mm-try" type="button">Use it now</button></p>`; }
WIRE.room = () => { const s = st(), fs = () => ac ? ac.sampleRate : 48000;
  const show = id => { const ir = lib[id] || presetIR(id); if(!ir) return; viewIR = ir; plotWave($("mr-w"), ir.chs[0], ir.fs, {label: `${ir.name} · ${(ir.chs[0].length/ir.fs).toFixed(2)} s · ${ir.chs.length} ch`}); plotDecay($("mr-d"), ir.chs[0], ir.fs); plotSpectrum($("mr-s"), ir.chs[0], ir.fs); };
  if(ensure()) show(s.ir);
  $("mr-ir").onchange = e => { setRoom(e.target.value); show(e.target.value); draw(); };
  document.querySelectorAll("input[name=mr-mode]").forEach(r => r.onchange = () => { setRoom(s.ir, r.value); C.toast && C.toast({causal:"The echo follows the sound.", anticausal:"The echo comes first: the dry sound is held back by the room's length.", symmetric:"Half the echo before, half after.", zerophase:"Forward and backward: all magnitude, no phase."}[r.value]); });
  $("mr-wet").oninput = e => { $("mr-wet-v").textContent = e.target.value; setRoom(s.ir, s.mode, +e.target.value); };
  $("mr-dl").onclick = () => { const ir = lib[s.ir] || presetIR(s.ir); download(D.encodeWAV(ir.chs, ir.fs), (ir.name || "room") + ".wav"); };
  $("mr-load").onchange = async e => { const f = e.target.files[0]; if(!f || !ensure()) return; const b = await ac.decodeAudioData(await f.arrayBuffer()); const chs = []; for(let i = 0; i < Math.min(2, b.numberOfChannels); i++) chs.push(b.getChannelData(i).slice(0, Math.min(b.length, 20*b.sampleRate)));
    const id = await saveIR(f.name.replace(/\.[^.]+$/, ""), chs, b.sampleRate); setRoom(id); draw(); };
  $("mr-del").onclick = async () => { if(!lib[s.ir] || !lib[s.ir].saved) return; await idb.del(s.ir); delete lib[s.ir]; setRoom("office"); draw(); };
  $("mr-box").onclick = async () => { if(!ensure()) return; const v = id => +$(id).value, tri = id => $(id).value.split(",").map(Number); const room = [v("mr-Lx"), v("mr-Ly"), v("mr-Lz")];
    const chs = D.shoeboxIR({room, src: tri("mr-src"), mic: tri("mr-mic"), absorb: v("mr-ab"), order: v("mr-or"), fs: fs()}); const id = await saveIR(`A room ${room.join(" × ")} m, α ${v("mr-ab")}`, chs, fs()); setRoom(id); draw(); };
  ["mr-rt","mr-br","mr-pd"].forEach(id => $(id).oninput = e => $(id + "-v").textContent = e.target.value + (id === "mr-br" ? "" : " s"));
  $("mr-syn").onclick = async () => { if(!ensure()) return; const rt = +$("mr-rt").value, chs = D.synthIR({rt60: rt, bright: +$("mr-br").value, pre: +$("mr-pd").value, fs: fs(), seed: Date.now() % 997}); const id = await saveIR(`A tail of ${rt} s`, chs, fs()); setRoom(id); draw(); };
  devices().then(d => { const fill = (id, list) => { const el = $(id); if(!el) return; list.forEach((x, i) => { const o = document.createElement("option"); o.value = x.deviceId; o.textContent = x.label || `${id === "mm-in" ? "microphone" : "speaker"} ${i + 1}`; el.appendChild(o); }); };
    fill("mm-in", d.ins); fill("mm-out", d.outs); if(!ac || !ac.setSinkId) { const o = $("mm-out"); if(o){ o.disabled = true; o.title = "This browser can't choose a speaker; use the system's sound settings."; } } });
  $("mm-out").onchange = async e => { try { if(ac.setSinkId) await ac.setSinkId(e.target.value || ""); C.toast && C.toast("The house now plays through that speaker."); } catch(err){ C.toast && C.toast("That speaker couldn't be chosen."); } };
  const opts = () => ({kind: $("mm-kind").value, f1: $("mm-f1").value, f2: $("mm-f2").value, T: $("mm-T").value, level: $("mm-lv").value, reps: $("mm-rep").value, irLen: $("mm-len").value, eps: $("mm-eps").value, farina: $("mm-far").checked, input: $("mm-in").value});
  $("mm-hear").onclick = () => { if(!ensure()) return; const p = makeProbe($("mm-kind").value, opts(), fs()); if(p.golay) playBuffer([p.golay.a], fs(), 0, ac.destination, +$("mm-lv").value); else playBuffer([p.x], fs(), 0, ac.destination, +$("mm-lv").value); };
  $("mm-go").onclick = async () => { const stt = m => { const el = $("mm-st"); if(el) el.textContent = m; }; const wasRunning = eng && eng.running; if(wasRunning) eng.stop();
    try { lastMeasure = await measure(opts(), stt); stt(""); $("mm-res").innerHTML = measureCard(lastMeasure); viewIR = {name:"(just measured)", chs: lastMeasure.chs, fs: lastMeasure.fs};
      plotWave($("mr-w"), lastMeasure.chs[0], lastMeasure.fs, {label:"just measured"}); plotDecay($("mr-d"), lastMeasure.chs[0], lastMeasure.fs); plotSpectrum($("mr-s"), lastMeasure.chs[0], lastMeasure.fs);
      if(lastMeasure.negative) plotWave($("mm-neg"), lastMeasure.negative, lastMeasure.fs, {label:"before t = 0", zero: lastMeasure.negative.length - 1});
      $("mm-save").onclick = async () => { const id = await saveIR($("mm-name").value || "My room", lastMeasure.chs, lastMeasure.fs); setRoom(id); lastMeasure = null; draw(); };
      $("mm-try").onclick = () => { lib.__last = {id:"__last", name:"Just measured", chs: lastMeasure.chs, fs: lastMeasure.fs}; setRoom("__last"); };
      C.award && C.award("measured-room", 20);
    } catch(err){ stt(`Couldn't measure: ${err.message || err}. The browser needs permission to use the microphone.`); } }; };

/* Lab */
const clips = {};   // id → {name, chs, fs}
let labRes = null, labSrc = null, labMsg = "Lengths are capped at 40 seconds. Each operation runs on the whole signal at once, by the fast Fourier transform.";
function labSources(){ const out = [["", "—"]]; Object.values(clips).forEach(c => out.push(["c:" + c.id, "clip: " + c.name])); PRESETS.forEach(p => out.push(["i:" + p[0], "room: " + p[1]])); Object.values(lib).filter(x => !x.preset && x.id !== "__last").forEach(x => out.push(["i:" + x.id, "room: " + x.name]));
  PROBES.forEach(p => out.push(["p:" + p[0], "probe: " + p[1]])); out.push(["t:clicks", "test: a click every half second"], ["t:tone", "test: a pure tone, 440 Hz"], ["t:pluck", "test: a plucked note"]); if(labRes) out.push(["r:", "the last result"]); return out; }
function labGet(key){ const fs = ac ? ac.sampleRate : 48000, [k, id] = [key.slice(0, 1), key.slice(2)];
  if(k === "c") return clips[id]; if(k === "i"){ const ir = lib[id] || presetIR(id); return ir && {name: ir.name, chs: ir.chs, fs: ir.fs}; }
  if(k === "p"){ const p = makeProbe(id, {f1: 40, f2: 16000, T: 1.5}, fs); return {name: id, chs: [p.golay ? p.golay.a : p.x], fs}; }
  if(k === "t"){ const N = 2*fs, x = new Float32Array(N); if(id === "clicks") for(let i = 0; i < N; i += fs/2) x[i] = 1; if(id === "tone") for(let i = 0; i < N; i++) x[i] = .5*Math.sin(2*Math.PI*440*i/fs)*Math.min(1, i/400, (N - i)/400);
    if(id === "pluck"){ let y = 0; const P = Math.round(fs/220), buf = Float32Array.from({length: P}, () => Math.random()*2 - 1); for(let i = 0; i < N; i++){ const j = i % P, nx = (j + 1) % P; y = .996*.5*(buf[j] + buf[nx]); buf[j] = y; x[i] = y; } } return {name: id, chs: [x], fs}; }
  if(k === "r") return labRes; return null; }
VIEWS.lab = () => { const src = labSources(); return `<div class="mbx-grid"><section><h4>Two signals</h4>
    <label>A (the signal) ${sel("ml-a", src, labSrc ? labSrc.a : "t:pluck")}</label><label>B (the kernel) ${sel("ml-b", src, labSrc ? labSrc.b : "i:hall")}</label>
    <p class="row"><button class="btn" id="ml-pa" type="button">▶ A</button> <button class="btn" id="ml-pb" type="button">▶ B</button> <button class="btn" id="ml-rec" type="button">Record 8 s of the music box</button> <button class="btn" id="ml-mic" type="button">Record 8 s from the microphone</button> <label class="btn">Load a sound file<input type="file" id="ml-file" accept="audio/*" hidden></label></p>
    <canvas id="ml-wa" width="560" height="70" class="mbx-cv"></canvas><canvas id="ml-wb" width="560" height="70" class="mbx-cv"></canvas>
    <h4>Do</h4><div class="mbx-ops">
      <button class="btn" data-op="causal" type="button">A ∗ B, causal</button> <button class="btn" data-op="anticausal" type="button">anti-causal</button> <button class="btn" data-op="symmetric" type="button">symmetric</button> <button class="btn" data-op="zerophase" type="button">zero-phase</button><br>
      <button class="btn" data-op="deconv" type="button">deconvolve A by B</button> <label class="note">ε <input id="ml-eps" type="number" step=".0001" value=".001" style="width:6em"></label> <button class="btn" data-op="xcorr" type="button">correlate A with B</button> <button class="btn" data-op="acorr" type="button">autocorrelate A</button> <button class="btn" data-op="rev" type="button">reverse A</button></div>
    <p class="note" id="ml-st">${esc(labMsg)}</p></section>
    <section><h4>The result</h4><canvas id="ml-wr" width="560" height="110" class="mbx-cv"></canvas><canvas id="ml-sr" width="560" height="110" class="mbx-cv"></canvas>
      <p class="row"><button class="btn primary" id="ml-pr" type="button" ${labRes ? "" : "disabled"}>▶ Play</button> <button class="btn" id="ml-stop" type="button">■</button> <button class="btn" id="ml-dl" type="button" ${labRes ? "" : "disabled"}>Download WAV</button> <button class="btn" id="ml-ir" type="button" ${labRes ? "" : "disabled"}>Use as the room</button> <button class="btn" id="ml-toa" type="button" ${labRes ? "" : "disabled"}>Make it A</button></p>
      <p class="note">${labRes ? esc(labRes.name) : "Nothing yet."}</p></section></div>`; };
let labPlaying = null;
WIRE.lab = () => { const s = st(), cap = x => x.length > 40*48000 ? x.subarray(0, 40*48000) : x, stt = m => { labMsg = m; const e = $("ml-st"); if(e) e.textContent = m; };
  const cur = () => ({a: $("ml-a").value, b: $("ml-b").value}), showAB = () => { if(!ensure()) return; labSrc = cur(); const A = labGet(labSrc.a), B = labGet(labSrc.b); if(A) plotWave($("ml-wa"), A.chs[0], A.fs, {label: "A · " + A.name}); if(B) plotWave($("ml-wb"), B.chs[0], B.fs, {label: "B · " + B.name}); };
  showAB(); $("ml-a").onchange = showAB; $("ml-b").onchange = showAB;
  if(labRes){ plotWave($("ml-wr"), labRes.chs[0], labRes.fs, {label: labRes.name, zero: labRes.pre}); plotSpectrum($("ml-sr"), labRes.chs[0], labRes.fs); }
  const play = x => { if(!ensure() || !x) return; if(labPlaying) try { labPlaying.stop(); } catch(e){} labPlaying = playBuffer(x.chs, x.fs, 0, ch.post, .9); };
  $("ml-pa").onclick = () => play(labGet(cur().a)); $("ml-pb").onclick = () => play(labGet(cur().b)); $("ml-stop").onclick = () => { if(labPlaying) try { labPlaying.stop(); } catch(e){} };
  const addClip = (name, chs, fs) => { const id = "k" + Date.now().toString(36); clips[id] = {id, name, chs, fs}; labSrc = Object.assign(labSrc || {}, {a: "c:" + id}); draw(); };
  $("ml-rec").onclick = async () => { if(!ensure()) return; stt("Recording what the music box is playing…"); const r = await recorder(ch.post); await sleep(8000); const {data} = r.stop(); addClip("the music box, " + new Date().toLocaleTimeString(), [data], ac.sampleRate); };
  $("ml-mic").onclick = async () => { if(!ensure()) return; try { const m = await micNode(null); stt("Recording the microphone…"); const r = await recorder(m.node); await sleep(8000); const {data} = r.stop(); addClip("the microphone, " + new Date().toLocaleTimeString(), [data], ac.sampleRate); } catch(e){ stt("The microphone isn't available: " + e.message); } };
  $("ml-file").onchange = async e => { const f = e.target.files[0]; if(!f || !ensure()) return; const b = await ac.decodeAudioData(await f.arrayBuffer()); const chs = []; for(let i = 0; i < Math.min(2, b.numberOfChannels); i++) chs.push(cap(b.getChannelData(i)).slice()); addClip(f.name, chs, b.sampleRate); };
  document.querySelectorAll("[data-op]").forEach(btn => btn.onclick = async () => { if(!ensure()) return; const A = labGet(cur().a), B = labGet(cur().b), op = btn.dataset.op; if(!A || (!B && !["acorr","rev"].includes(op))) return stt("Choose A (and B).");
    stt("Working…"); await sleep(30); const t0 = performance.now(), a0 = cap(A.chs[0]), b0 = B ? cap(B.chs[0]) : null; let chs, pre = 0, name;
    try {
      if(["causal","anticausal","symmetric","zerophase"].includes(op)){ chs = A.chs.map((a, i) => { const r = D.convolveMode(cap(a), cap(B.chs[Math.min(i, B.chs.length - 1)]), op); pre = r.pre; return r.data; }); name = `${A.name} ∗ ${B.name} (${op})`; }
      else if(op === "deconv"){ const r = D.deconvolve(a0, b0, +$("ml-eps").value || 1e-3, a0.length); chs = [r.ir]; name = `${A.name} ÷ ${B.name}`; }
      else if(op === "xcorr"){ const r = D.correlate(a0, b0); chs = [Float32Array.from([...r.neg.slice(0, -1), ...r.pos])]; pre = r.neg.length - 1; name = `${A.name} ⋆ ${B.name}`; }
      else if(op === "acorr"){ const r = D.correlate(a0, a0); chs = [Float32Array.from([...r.neg.slice(0, -1), ...r.pos])]; pre = r.neg.length - 1; name = `${A.name} ⋆ itself`; }
      else if(op === "rev"){ chs = A.chs.map(c => Float32Array.from(c).reverse()); name = `${A.name}, reversed`; }
      labRes = {name, chs: D.normalize(chs.map(c => Float32Array.from(c))), fs: A.fs, pre}; stt(`Done in ${Math.round(performance.now() - t0)} ms.`); draw();
    } catch(err){ stt("That didn't work: " + err.message); } });
  if($("ml-pr")) $("ml-pr").onclick = () => play(labRes);
  if($("ml-dl")) $("ml-dl").onclick = () => labRes && download(D.encodeWAV(labRes.chs, labRes.fs), labRes.name.replace(/[^\w ∗÷⋆,.-]+/g, "") + ".wav");
  if($("ml-ir")) $("ml-ir").onclick = async () => { if(!labRes) return; const id = await saveIR(labRes.name, labRes.chs.map(c => c.slice(0, Math.min(c.length, 20*labRes.fs))), labRes.fs); setRoom(id); C.toast && C.toast("The result is the room now."); };
  if($("ml-toa")) $("ml-toa").onclick = () => { if(!labRes) return; const id = "k" + Date.now().toString(36); clips[id] = {id, name: labRes.name, chs: labRes.chs, fs: labRes.fs}; labSrc = {a: "c:" + id, b: cur().b}; draw(); }; };

/* Sources */
const RADIO = [["https://ice1.somafm.com/dronezone-128-mp3", "SomaFM · Drone Zone"], ["https://ice1.somafm.com/deepspaceone-128-mp3", "SomaFM · Deep Space One"], ["https://ice1.somafm.com/groovesalad-128-mp3", "SomaFM · Groove Salad"],
  ["https://ice1.somafm.com/secretagent-128-mp3", "SomaFM · Secret Agent"], ["https://ice1.somafm.com/missioncontrol-128-mp3", "SomaFM · Mission Control"], ["https://ice1.somafm.com/spacestation-128-mp3", "SomaFM · Space Station Soma"]];
const files = []; let filePlaying = null, radioEl = null, radioNode = null, micLive = null;
function embedFor(text){ const t = text.trim(), m = t.match(/src=["']([^"']+)["']/); const u = m ? m[1] : t; let url; try { url = new URL(u); } catch(e){ return null; }
  const h = url.hostname.replace(/^www\./, "");
  if(h === "youtube.com" || h === "m.youtube.com" || h === "youtu.be" || h === "youtube-nocookie.com"){ const id = h === "youtu.be" ? url.pathname.slice(1) : (url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop()); const list = url.searchParams.get("list");
    return {src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}${list ? "?list=" + encodeURIComponent(list) : ""}`, h: 260}; }
  if(h === "soundcloud.com" || h === "w.soundcloud.com") return {src: h === "w.soundcloud.com" ? u : `https://w.soundcloud.com/player/?url=${encodeURIComponent(u)}&visual=false`, h: 166};
  if(h === "bandcamp.com" && url.pathname.startsWith("/EmbeddedPlayer")) return {src: u, h: 120};
  if(h === "open.spotify.com") return {src: `https://open.spotify.com/embed${url.pathname.replace(/^\/embed/, "")}`, h: 152};
  if(h === "vimeo.com" || h === "player.vimeo.com"){ const id = url.pathname.split("/").filter(Boolean).pop(); return {src: `https://player.vimeo.com/video/${encodeURIComponent(id)}`, h: 240}; }
  return null; }
VIEWS.sources = () => { const s = st(), stations = RADIO.concat(s.radio.map(r => [r.url, r.name]));
  return `<div class="mbx-grid"><section><h4>Sound files</h4><p class="note">MP3, WAV, FLAC, OGG, or anything the browser can read, from your computer. They play through the room.</p>
      <p class="row"><label class="btn">Choose files<input type="file" id="ms-f" accept="audio/*" multiple hidden></label> <span class="note">or drop them here</span></p>
      <ul class="list" id="ms-list">${files.map((f, i) => `<li><button class="btn" data-fp="${i}" type="button">▶</button> ${esc(f.name)} <span class="note">${(f.buf.duration).toFixed(1)} s</span> <button class="btn" data-fir="${i}" type="button">as a room</button> <button class="btn" data-flab="${i}" type="button">to the Lab</button></li>`).join("") || `<li class="note">None loaded.</li>`}</ul>
      <p class="row"><button class="btn" id="ms-fstop" type="button">■ Stop</button> <label><input type="checkbox" id="ms-loop"> loop</label></p>
      <h4>The microphone, live, through the room</h4><p class="note">Sing into the cathedral. Use headphones, or it will howl.</p><p class="row"><button class="btn" id="ms-mic" type="button">${micLive ? "■ Stop the microphone" : "▶ Open the microphone"}</button></p></section>
    <section><h4>Radio</h4>${sel("ms-st", stations, stations[0][0])} <button class="btn" id="ms-rp" type="button">${radioEl && !radioEl.paused ? "■ Stop" : "▶ Listen"}</button>
      <p class="row"><input id="ms-url" placeholder="a stream's address (https://…)" style="width:18em"> <input id="ms-name" placeholder="its name" style="width:9em"> <button class="btn" id="ms-add" type="button">Add</button></p>
      <p class="note" id="ms-rnote">A station that allows it plays through the room; one that doesn't still plays, but dry. Stations listed by permission of nobody: they are public streams.</p>
      <h4>From other sites</h4><p class="note">Paste a YouTube, SoundCloud, Spotify, or Vimeo address, or Bandcamp's embed code. These play in the site's own player, so the room can't reach them.</p>
      <p class="row"><input id="ms-emb" placeholder="https://…" style="width:22em"> <button class="btn" id="ms-eg" type="button">Show the player</button></p><div id="ms-embox"></div></section></div>`; };
WIRE.sources = () => { const s = st();
  const addFiles = async list => { if(!ensure()) return; for(const f of list){ try { const buf = await ac.decodeAudioData(await f.arrayBuffer()); files.push({name: f.name, buf}); } catch(e){ C.toast && C.toast(`${f.name} couldn't be read.`); } } draw(); };
  $("ms-f").onchange = e => addFiles([...e.target.files]); const body = $("mbx-body"); body.ondragover = e => { e.preventDefault(); }; body.ondrop = e => { e.preventDefault(); addFiles([...e.dataTransfer.files].filter(f => /^audio\//.test(f.type) || /\.(wav|mp3|flac|ogg|m4a|aac)$/i.test(f.name))); };
  document.querySelectorAll("[data-fp]").forEach(b => b.onclick = () => { if(!ensure()) return; if(filePlaying) try { filePlaying.stop(); } catch(e){} const src = ac.createBufferSource(); src.buffer = files[+b.dataset.fp].buf; src.loop = $("ms-loop").checked; src.connect(ch.input); src.start(); filePlaying = src; });
  document.querySelectorAll("[data-fir]").forEach(b => b.onclick = async () => { const f = files[+b.dataset.fir], chs = []; for(let i = 0; i < Math.min(2, f.buf.numberOfChannels); i++) chs.push(f.buf.getChannelData(i).slice(0, Math.min(f.buf.length, 20*f.buf.sampleRate))); const id = await saveIR(f.name, chs, f.buf.sampleRate); setRoom(id); C.toast && C.toast(`${f.name} is the room now.`); });
  document.querySelectorAll("[data-flab]").forEach(b => b.onclick = () => { const f = files[+b.dataset.flab], chs = []; for(let i = 0; i < Math.min(2, f.buf.numberOfChannels); i++) chs.push(f.buf.getChannelData(i).slice(0, Math.min(f.buf.length, 40*f.buf.sampleRate))); const id = "k" + Date.now().toString(36); clips[id] = {id, name: f.name, chs, fs: f.buf.sampleRate}; labSrc = {a: "c:" + id, b: (labSrc || {}).b || "i:hall"}; st().tab = "lab"; draw(); });
  $("ms-fstop").onclick = () => { if(filePlaying) try { filePlaying.stop(); } catch(e){} filePlaying = null; };
  $("ms-mic").onclick = async () => { if(!ensure()) return; if(micLive){ try { micLive.disconnect(ch.input); } catch(e){} micLive = null; draw(); return; } try { const m = await micNode(null); m.node.connect(ch.input); micLive = m.node; draw(); } catch(e){ C.toast && C.toast("The microphone isn't available."); } };
  $("ms-rp").onclick = () => { if(!ensure()) return; if(radioEl && !radioEl.paused){ radioEl.pause(); draw(); return; } const url = $("ms-st").value;
    // first try to route it through the room (needs the station's permission, CORS); if that fails, play it plainly
    const plain = () => { radioEl = new Audio(url); radioEl.play().catch(() => {}); $("ms-rnote").textContent = "This station doesn't allow its sound to be processed, so it plays dry, outside the room."; };
    try { radioEl = new Audio(); radioEl.crossOrigin = "anonymous"; radioEl.src = url; radioEl.onerror = () => { plain(); };
      if(radioNode) try { radioNode.disconnect(); } catch(e){} radioNode = ac.createMediaElementSource(radioEl); radioNode.connect(ch.input); radioEl.play().then(() => { $("ms-rnote").textContent = "Playing through the room."; draw(); }).catch(plain); } catch(e){ plain(); } };
  $("ms-add").onclick = () => { const url = $("ms-url").value.trim(), name = $("ms-name").value.trim() || url; if(!/^https:\/\//.test(url)) return C.toast && C.toast("A stream's address starts with https://"); s.radio.push({url, name}); save(); draw(); };
  $("ms-eg").onclick = () => { const e = embedFor($("ms-emb").value); if(!e) return C.toast && C.toast("That isn't an address the music box knows how to show."); $("ms-embox").innerHTML = `<iframe src="${esc(e.src)}" style="width:100%;height:${e.h}px;border:0" allow="autoplay; encrypted-media" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`; }; };

/* Sonar */
let sonar = null;
function stopSonar(){ if(!sonar) return; sonar.stop(); sonar = null; }
const sonarBands = {audible: [2000, 9000], high: [12000, 18000], ultra: [17500, 20500]};
VIEWS.sonar = () => { const s = st().sonar, c = D.soundSpeed(s.temp);
  return `<div class="mbx-grid"><section><h4>Echo ranging</h4><p class="note">The box chirps and listens. Matching the recording against the chirp finds each echo; half its delay times the speed of sound is the distance to what returned it.</p>
      <div class="row"><label>Chirp ${sel("mn-band", [["audible","2–9 kHz (audible)"],["high","12–18 kHz (thin)"],["ultra","17.5–20.5 kHz (near-ultrasonic)"]], s.band)}</label> <label>every <input id="mn-int" type="number" step=".1" min=".2" value="${s.interval}" style="width:4em"> s</label> <label>to <input id="mn-max" type="number" step="1" value="${s.maxR}" style="width:3.5em"> m</label></div>
      <div class="row"><label>air at <input id="mn-temp" type="number" step="1" value="${s.temp}" style="width:4em"> °C</label> <span class="note">c = ${c.toFixed(1)} m/s</span> <button class="btn primary" id="mn-echo" type="button">${sonar && sonar.kind === "echo" ? "■ Stop" : "▶ Start pinging"}</button></div>
      <canvas id="mn-a" width="560" height="120" class="mbx-cv"></canvas><canvas id="mn-wf" width="560" height="160" class="mbx-cv"></canvas><p class="note" id="mn-read"></p>
      <h4>Doppler</h4><p class="note">A steady high tone; anything moving reflects it a little higher (coming) or lower (going). The shift is Δf = 2 v f₀ / c.</p>
      <div class="row"><label>tone <input id="mn-f0" type="number" step="100" value="${s.f0}" style="width:6em"> Hz</label> <label><input type="checkbox" id="mn-ther"> play it as a theremin</label> <button class="btn" id="mn-dop" type="button">${sonar && sonar.kind === "doppler" ? "■ Stop" : "▶ Start"}</button></div>
      <canvas id="mn-sg" width="560" height="140" class="mbx-cv"></canvas><p class="note" id="mn-v"></p></section>
    <section><h4>Two devices: how far apart?</h4><p class="note">Open the Wending House's music box on a second device (a phone will do), set one to <b>A</b> and the other to <b>B</b>, and start both listening. A chirps up; B hears it and chirps down. Each device times both chirps on its own clock, so the clocks never need to agree.</p>
      <div class="row"><label><input type="radio" name="mn-role" value="A" checked> A (starts)</label> <label><input type="radio" name="mn-role" value="B"> B (answers)</label> <button class="btn primary" id="mn-two" type="button">${sonar && sonar.kind === "two" ? "■ Stop" : "▶ Listen"}</button> <button class="btn" id="mn-ping" type="button" ${sonar && sonar.kind === "two" && sonar.role === "A" ? "" : "disabled"}>Chirp</button></div>
      <p class="big" id="mn-dt" style="font-size:20px">Δ = —</p><p class="note">Δ is the time from the up-chirp to the down-chirp in this device's own recording.</p>
      <div class="row"><label>B's Δ <input id="mn-db" type="number" step=".001" style="width:7em"> ms</label> <label>speaker-to-mic on each <input id="mn-self" type="number" step=".01" value="${s.self}" style="width:4em"> m</label> <button class="btn" id="mn-calc" type="button">Distance</button></div>
      <p class="big" id="mn-dist" style="font-size:22px"></p>
      <p class="note">d = (c/2)(Δ<sub>A</sub> − Δ<sub>B</sub>) + (s<sub>A</sub> + s<sub>B</sub>)/2, after Peng and others' BeepBeep (2007). With several partners, or one moved, the same arithmetic locates a device.</p>
      <p class="note"><b>Care:</b> keep levels low. High chirps can bother dogs, cats, and some people, and small speakers distort near their limits.</p></section></div>`; };
WIRE.sonar = () => { const s = st().sonar, upd = () => { s.band = $("mn-band").value; s.interval = Math.max(.2, +$("mn-int").value); s.maxR = +$("mn-max").value; s.temp = +$("mn-temp").value; s.f0 = +$("mn-f0").value; s.self = +$("mn-self").value; save(); };
  ["mn-band","mn-int","mn-max","mn-temp","mn-f0","mn-self"].forEach(id => $(id).onchange = upd);
  $("mn-echo").onclick = async () => { if(sonar){ const k = sonar.kind; stopSonar(); if(k === "echo"){ draw(); return; } } upd(); if(!ensure()) return; try { sonar = await echoSonar(s); } catch(e){ $("mn-read").textContent = "The microphone isn't available: " + e.message; return; } draw(); };
  $("mn-dop").onclick = async () => { if(sonar){ const k = sonar.kind; stopSonar(); if(k === "doppler"){ draw(); return; } } upd(); if(!ensure()) return; try { sonar = await dopplerSonar(s, $("mn-ther").checked); } catch(e){ $("mn-v").textContent = "The microphone isn't available: " + e.message; return; } draw(); };
  $("mn-two").onclick = async () => { if(sonar){ const k = sonar.kind; stopSonar(); if(k === "two"){ draw(); return; } } upd(); if(!ensure()) return; const role = document.querySelector("input[name=mn-role]:checked").value; try { sonar = await twoDevice(s, role); } catch(e){ $("mn-dt").textContent = "The microphone isn't available."; return; } draw(); };
  if($("mn-ping")) $("mn-ping").onclick = () => sonar && sonar.ping && sonar.ping();
  $("mn-calc").onclick = () => { const dA = sonar && sonar.lastDelta, dB = +$("mn-db").value/1000; if(dA == null || !$("mn-db").value) return $("mn-dist").textContent = "Need this device's Δ and B's."; const d = D.twoWayDistance(dA, dB, D.soundSpeed(s.temp), s.self, s.self); $("mn-dist").textContent = `${d.toFixed(2)} m apart`; };
  if(sonar && sonar.redraw) sonar.redraw(); };
async function echoSonar(s){ const fs = ac.sampleRate, [f1, f2] = sonarBands[s.band], chirp = D.chirp(f1, Math.min(f2, fs/2 - 200), .006, fs), c = D.soundSpeed(s.temp), mic = await micNode(null), rec = await recorder(mic.node, 4);
  const maxT = 2*s.maxR/c + .15, rows = [], pings = []; let timer = null, stopped = false;
  const fire = () => { const t = ac.currentTime + .05; playBuffer([chirp], fs, t, ac.destination, .5); pings.push(t); if(pings.length > 20) pings.shift(); };
  const analyze = () => { const tp = pings.find(t => ac.currentTime > t + maxT + .05 && !t.done); if(tp == null) return; pings.splice(pings.indexOf(tp), 1);
    const seg = rec.window(tp, tp + maxT), cor = D.correlate(seg, chirp).pos, env = D.envelope(cor), dIdx = D.peakIndex(env, 0, Math.min(env.length, Math.round(.12*fs))), ref = env[dIdx] || 1;
    // the direct sound (speaker straight to mic) marks t = 0; everything after it is an echo
    const N = 280, row = new Float32Array(N); for(let k = 0; k < N; k++){ const r = k/N*s.maxR, i = dIdx + Math.round(2*r/c*fs); row[k] = i < env.length ? 20*Math.log10(Math.max(1e-6, env[i]/ref)) : -80; }
    rows.push(row); if(rows.length > 160) rows.shift(); let best = -1, bi = 0; for(let k = Math.round(N*.06); k < N; k++) if(row[k] > best || best === -1){ best = row[k]; bi = k; }
    draw1(row, bi/N*s.maxR, best); };
  const draw1 = (row, br, bdb) => { const a = $("mn-a"), w = $("mn-wf"); if(!a || !w) return; let g = a.getContext("2d"); const W = a.width, H = a.height; g.clearRect(0, 0, W, H); g.fillStyle = "rgba(0,0,0,.04)"; g.fillRect(0, 0, W, H);
    g.strokeStyle = css("--line"); g.fillStyle = css("--muted"); g.font = "11px serif"; for(let m = 0; m <= s.maxR; m += Math.max(1, Math.round(s.maxR/8))){ const x = m/s.maxR*W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); g.fillText(m + " m", x + 2, H - 3); }
    g.strokeStyle = css("--ink"); g.beginPath(); row.forEach((v, k) => { const x = k/row.length*W, y = Math.min(H, -v/60*H); k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    const wg = w.getContext("2d"), img = wg.getImageData(0, 1, w.width, w.height - 1); wg.putImageData(img, 0, 0); for(let k = 0; k < row.length; k++){ const v = Math.max(0, Math.min(1, (row[k] + 50)/50)); wg.fillStyle = `rgba(30,20,10,${v})`; wg.fillRect(k/row.length*w.width, w.height - 1, w.width/row.length + 1, 1); }
    const rd = $("mn-read"); if(rd) rd.textContent = (bdb > -45 ? `Strongest echo at about ${br.toFixed(2)} m (${(-bdb).toFixed(0)} dB below the direct sound).` : `No clear echo yet: turn the level up, or point the speaker and microphone at something.`) + ` Each new ping is a row at the bottom of the waterfall; moving things draw slanted lines.`; };
  timer = setInterval(() => { if(stopped) return; fire(); analyze(); }, s.interval*1000); fire();
  return {kind: "echo", stop(){ stopped = true; clearInterval(timer); rec.stop(); }}; }
async function dopplerSonar(s, theremin){ const fs = ac.sampleRate, f0 = Math.min(s.f0, fs/2 - 500), c = D.soundSpeed(s.temp), mic = await micNode(null);
  const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f0; g.gain.value = .25; o.connect(g); g.connect(ac.destination); o.start();
  const an = ac.createAnalyser(); an.fftSize = 32768; an.smoothingTimeConstant = .2; mic.node.connect(an); const bins = new Float32Array(an.frequencyBinCount), df = fs/an.fftSize, k0 = Math.round(f0/df), span = Math.round(300/df);
  let th = null; if(theremin){ th = {o: ac.createOscillator(), g: ac.createGain()}; th.o.type = "triangle"; th.o.frequency.value = 330; th.g.gain.value = .12; th.o.connect(th.g); th.g.connect(ch.input); th.o.start(); }
  let run = true, vs = 0;
  const loop = () => { if(!run) return; an.getFloatFrequencyData(bins); const sg = $("mn-sg"); let num = 0, den = 0, floor = -100; const seg = bins.subarray(k0 - span, k0 + span + 1);
    for(let i = 0; i < seg.length; i++) floor = Math.max(floor, -200); const sorted = Float32Array.from(seg).sort(), med = sorted[sorted.length >> 1];
    for(let i = 0; i < seg.length; i++){ const k = i - span; if(Math.abs(k) < 3) continue; const p = Math.pow(10, (seg[i] - med)/10) - 1; if(p > 2){ num += p*k*df; den += p; } }
    const shift = den > 0 ? num/den : 0, v = c*shift/(2*f0); vs = vs*.8 + v*.2;
    if(sg){ const g2 = sg.getContext("2d"), W = sg.width, H = sg.height, img = g2.getImageData(1, 0, W - 1, H); g2.putImageData(img, 0, 0); for(let i = 0; i < seg.length; i++){ const y = H - i/seg.length*H, a = Math.max(0, Math.min(1, (seg[i] - med)/40)); g2.fillStyle = `rgba(30,20,10,${a})`; g2.fillRect(W - 1, y - H/seg.length, 1, H/seg.length + 1); } }
    const vt = $("mn-v"); if(vt) vt.textContent = `${vs >= 0 ? "toward" : "away"} at about ${Math.abs(vs).toFixed(2)} m/s (shift ${shift.toFixed(1)} Hz around ${f0} Hz; the middle line of the picture is the tone itself)`;
    if(th) th.o.frequency.setTargetAtTime(330*Math.pow(2, Math.max(-2, Math.min(2, vs*1.5))), ac.currentTime, .05);
    requestAnimationFrame(loop); };
  loop(); return {kind: "doppler", stop(){ run = false; try { o.stop(); mic.node.disconnect(an); if(th){ th.o.stop(); } } catch(e){} }}; }
async function twoDevice(s, role){ const fs = ac.sampleRate, up = D.chirp(3000, 7000, .04, fs), down = D.chirp(7000, 3000, .04, fs), mic = await micNode(null), rec = await recorder(mic.node, 8);
  let run = true, lastHeard = 0; const self = {kind: "two", role, lastDelta: null};
  // find a chirp's arrival (sub-sample, by a parabola through the envelope's peak) in a stretch of recording
  const find = (seg, ref) => { const env = D.envelope(D.correlate(seg, ref).pos), k = D.peakIndex(env), a = env[k - 1] || 0, b = env[k], c = env[k + 1] || 0, off = (a - c)/(2*(a - 2*b + c) || 1);
    const sorted = Float32Array.from(env).sort(), med = sorted[sorted.length >> 1] || 1e-9; return {i: k + (isFinite(off) ? off : 0), snr: b/med}; };
  const report = (dt) => { self.lastDelta = dt; const el = $("mn-dt"); if(el) el.textContent = `Δ${role} = ${(dt*1000).toFixed(3)} ms`; };
  self.ping = () => { const t = ac.currentTime + .1; playBuffer([up], fs, t, ac.destination, .6); setTimeout(() => { if(!run) return; // A: look for both chirps in the next two seconds of its own recording
      const seg = rec.window(t - .05, t + 2), u = find(seg, up), dn = find(seg, down); if(dn.snr < 6){ $("mn-dt").textContent = "B didn't answer (or wasn't heard)."; return; } report((dn.i - u.i)/fs); }, 2400); };
  const watch = setInterval(() => { if(!run || role !== "B") return; const now = ac.currentTime; if(now - lastHeard < 2.5) return; const seg = rec.window(now - 1, now), u = find(seg, up);
    if(u.snr > 10){ lastHeard = now; const tHeard = now - 1 + u.i/fs, tReply = ac.currentTime + .5; playBuffer([down], fs, tReply, ac.destination, .6);
      setTimeout(() => { const seg2 = rec.window(tHeard - .3, tReply + .5), a = find(seg2, up), b = find(seg2, down); report((b.i - a.i)/fs); }, 1200); } }, 300);
  return Object.assign(self, {stop(){ run = false; clearInterval(watch); rec.stop(); }}); }

function download(buf, name){ const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([buf], {type: "audio/wav"})); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }

/* Manual */
VIEWS.manual = () => window.MBMANUAL || "<p>The manual is missing.</p>"; WIRE.manual = () => {};

document.addEventListener("keydown", e => { if(e.key === "Escape" && $("mbx") && $("mbx").classList.contains("open")){ e.stopPropagation(); close(); } }, true);
window.MUSICBOX = {bind: o => Object.defineProperties(C, Object.getOwnPropertyDescriptors(o)), open, close, get engine(){ return eng; }, setRoom, presetIR, lib, measure, PRESETS, isOpen: () => !!($("mbx") && $("mbx").classList.contains("open"))};
})();
