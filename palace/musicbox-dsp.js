/* The Wending House: the music box's workshop — signal processing.
   Pure functions on Float32Arrays, no audio context needed (so they can be tested anywhere).
   FFT; convolution in four senses (causal, anti-causal, symmetric, zero-phase); regularized deconvolution;
   correlation and matched filtering; probe signals (sweeps, deltas, MLS, Golay pairs, chirps, Costas hops,
   anti-harmonic multitones, noise); synthetic and image-source impulse responses; Schroeder decay and RT60; WAV. */
(function(root){
"use strict";
const TAU = Math.PI*2;
const nextPow2 = n => { let p = 1; while(p < n) p <<= 1; return p; };

/* ---------- FFT (iterative radix-2, in place) ---------- */
function fft(re, im, inverse){
  const n = re.length;
  for(let i = 1, j = 0; i < n; i++){ let bit = n >> 1; for(; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if(i < j){ let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for(let len = 2; len <= n; len <<= 1){
    const ang = (inverse ? TAU : -TAU)/len, wr = Math.cos(ang), wi = Math.sin(ang), half = len >> 1;
    for(let i = 0; i < n; i += len){ let cr = 1, ci = 0;
      for(let k = 0; k < half; k++){ const a = i + k, b = a + half, tr = re[b]*cr - im[b]*ci, ti = re[b]*ci + im[b]*cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti; const nr = cr*wr - ci*wi; ci = cr*wi + ci*wr; cr = nr; } } }
  if(inverse){ for(let i = 0; i < n; i++){ re[i] /= n; im[i] /= n; } }
}
function spectrum(x, n){ const re = new Float64Array(n), im = new Float64Array(n); re.set(x.length > n ? x.subarray(0, n) : x); fft(re, im, false); return {re, im}; }

/* ---------- convolution ---------- */
// full linear convolution, length a+b-1
function convolve(a, b){
  const L = a.length + b.length - 1, n = nextPow2(L), A = spectrum(a, n), B = spectrum(b, n);
  for(let i = 0; i < n; i++){ const r = A.re[i]*B.re[i] - A.im[i]*B.im[i], m = A.re[i]*B.im[i] + A.im[i]*B.re[i]; A.re[i] = r; A.im[i] = m; }
  fft(A.re, A.im, true); return Float32Array.from(A.re.subarray(0, L));
}
const reverse = h => Float32Array.from(h).reverse();
// the kernel for each sense of convolution, with the index of its time zero
function kernelFor(h, mode){
  const N = h.length;
  if(mode === "causal") return {k: Float32Array.from(h), zero: 0};
  if(mode === "anticausal") return {k: reverse(h), zero: N - 1};          // y(t) = Σ h(τ) x(t+τ): the effect comes before the cause
  if(mode === "symmetric"){ const k = new Float32Array(2*N - 1); for(let i = 0; i < N; i++){ k[N-1+i] += h[i]/2; k[N-1-i] += h[i]/2; } return {k, zero: N - 1}; }  // the even part, ½(h(t)+h(−t))
  if(mode === "zerophase"){ const k = convolve(h, reverse(h)); return {k, zero: N - 1}; }  // forward then backward: |H|², no phase at all
  throw new Error("unknown mode " + mode);
}
// convolve x with h in a given sense; the result carries `pre`, the samples it reaches before x's time zero
function convolveMode(x, h, mode){ const {k, zero} = kernelFor(h, mode); return {data: convolve(x, k), pre: zero}; }
// regularized (Wiener-style) deconvolution: find h with y ≈ x*h. eps is relative to the excitation's peak power.
function deconvolve(y, x, eps = 1e-3, len){
  const n = nextPow2(y.length + x.length), Y = spectrum(y, n), X = spectrum(x, n); let peak = 0;
  for(let i = 0; i < n; i++) peak = Math.max(peak, X.re[i]*X.re[i] + X.im[i]*X.im[i]);
  const lam = eps*peak;
  for(let i = 0; i < n; i++){ const d = X.re[i]*X.re[i] + X.im[i]*X.im[i] + lam, r = (Y.re[i]*X.re[i] + Y.im[i]*X.im[i])/d, m = (Y.im[i]*X.re[i] - Y.re[i]*X.im[i])/d; Y.re[i] = r; Y.im[i] = m; }
  fft(Y.re, Y.im, true);
  // negative times (where an ESS puts its harmonic distortion) wrap to the end of the buffer
  const L = Math.min(len || y.length, n), out = Float32Array.from(Y.re.subarray(0, L)), neg = Float32Array.from(Y.re.subarray(n - Math.min(n/4, 48000*2), n));
  return {ir: out, negative: neg};
}
// cross-correlation r(τ) = Σ a(t+τ) b(t), for τ ≥ 0 (and the negative lags in `neg`)
function correlate(a, b){ const n = nextPow2(a.length + b.length), A = spectrum(a, n), B = spectrum(b, n);
  for(let i = 0; i < n; i++){ const r = A.re[i]*B.re[i] + A.im[i]*B.im[i], m = A.im[i]*B.re[i] - A.re[i]*B.im[i]; A.re[i] = r; A.im[i] = m; }
  fft(A.re, A.im, true); return {pos: Float32Array.from(A.re.subarray(0, a.length)), neg: Float32Array.from(A.re.subarray(n - b.length, n)).reverse()}; }
// the envelope of a signal, by the analytic signal (Hilbert transform)
function envelope(x){ const n = nextPow2(x.length), X = spectrum(x, n);
  for(let i = 1; i < n/2; i++){ X.re[i] *= 2; X.im[i] *= 2; } for(let i = n/2 + 1; i < n; i++){ X.re[i] = 0; X.im[i] = 0; }
  fft(X.re, X.im, true); const e = new Float32Array(x.length); for(let i = 0; i < x.length; i++) e[i] = Math.hypot(X.re[i], X.im[i]); return e; }

/* ---------- probe signals ---------- */
const fadeEdges = (x, fs, ms = 5) => { const m = Math.min(x.length/2|0, Math.round(fs*ms/1000)); for(let i = 0; i < m; i++){ const w = .5 - .5*Math.cos(Math.PI*i/m); x[i] *= w; x[x.length-1-i] *= w; } return x; };
// exponential (logarithmic) sine sweep, after Farina: equal time per octave
function essSweep(f1, f2, T, fs){ const N = Math.round(T*fs), L = T/Math.log(f2/f1), x = new Float32Array(N);
  for(let i = 0; i < N; i++){ const t = i/fs; x[i] = Math.sin(TAU*f1*L*(Math.exp(t/L) - 1)); } return fadeEdges(x, fs); }
// Farina's inverse filter: the reversed sweep, tilted −6 dB/octave so that sweep*inverse ≈ a delta
function essInverse(f1, f2, T, fs){ const x = essSweep(f1, f2, T, fs), N = x.length, L = T/Math.log(f2/f1), inv = new Float32Array(N);
  for(let i = 0; i < N; i++){ const t = i/fs; inv[i] = x[N-1-i]*Math.exp(-(T - t)/L); } return inv; }
function linSweep(f1, f2, T, fs){ const N = Math.round(T*fs), k = (f2 - f1)/T, x = new Float32Array(N);
  for(let i = 0; i < N; i++){ const t = i/fs; x[i] = Math.sin(TAU*(f1*t + k*t*t/2)); } return fadeEdges(x, fs); }
function chirp(f1, f2, T, fs){ const x = linSweep(f1, f2, T, fs); for(let i = 0; i < x.length; i++) x[i] *= .5 - .5*Math.cos(TAU*i/(x.length - 1)); return x; }   // Hann-shaped, for sonar
function delta(N){ const x = new Float32Array(N); x[0] = 1; return x; }
// maximum-length sequence from a linear feedback shift register (taps for primitive polynomials)
const MLS_TAPS = {9:[9,5], 10:[10,7], 11:[11,9], 12:[12,11,10,4], 13:[13,12,11,8], 14:[14,13,12,2], 15:[15,14], 16:[16,15,13,4], 17:[17,14], 18:[18,11]};
function mls(order){ const taps = MLS_TAPS[order]; if(!taps) throw new Error("no taps for order " + order); const N = (1 << order) - 1, x = new Float32Array(N); let reg = 1;
  for(let i = 0; i < N; i++){ const out = reg & 1; x[i] = out ? 1 : -1; let fb = 0; taps.forEach(t => { fb ^= (reg >> (order - t)) & 1; }); reg = (reg >> 1) | (fb << (order - 1)); } return x; }
// Golay complementary pair: their autocorrelations add to a perfect delta
function golay(log2n){ let a = Float32Array.of(1), b = Float32Array.of(1);
  for(let k = 0; k < log2n; k++){ const na = new Float32Array(a.length*2), nb = new Float32Array(a.length*2); na.set(a); na.set(b, a.length); nb.set(a); for(let i = 0; i < b.length; i++) nb[a.length+i] = -b[i]; a = na; b = nb; } return {a, b}; }
// a Costas frequency-hopping probe (Welch construction): no two chips share a time-and-frequency offset, so its ambiguity is a single spike
function primitiveRoot(p){ for(let g = 2; g < p; g++){ const seen = new Set(); let v = 1; for(let i = 1; i < p; i++){ v = v*g % p; seen.add(v); } if(seen.size === p - 1) return g; } return 2; }
function costasSequence(p){ const g = primitiveRoot(p), s = []; let v = 1; for(let i = 1; i < p; i++){ v = v*g % p; s.push(v); } return s; }
function costas(p, f0, df, chipT, fs){ const seq = costasSequence(p), M = Math.round(chipT*fs), x = new Float32Array(M*seq.length); let ph = 0;
  seq.forEach((k, c) => { const f = f0 + (k - 1)*df; for(let i = 0; i < M; i++){ const w = .5 - .5*Math.cos(TAU*i/(M - 1)); ph += TAU*f/fs; x[c*M + i] = w*Math.sin(ph); } }); return {x, seq}; }
// an anti-harmonic multitone: tones log-spread between fmin and fmax, none in a small-integer ratio to another, with Schroeder phases for a low crest factor
function antiHarmonicFreqs(n, fmin, fmax, maxQ = 4, maxP = 16, tol = .004){
  // candidates spread over the log range by the golden ratio (never repeating), accepted greedily if no ratio to an earlier tone is near p/q with small q
  const out = [], span = Math.log(fmax/fmin), bad = r => { for(let q = 1; q <= maxQ; q++) for(let p = q; p <= maxP*q; p++){ if(Math.abs(r - p/q)/r < tol) return true; } return false; };
  for(let j = 0; j < n; j++) for(let k = 1; k < 400; k++){ const u = (j + (k*0.6180339887498949) % 1)/n, f = fmin*Math.exp(u*span);
    if(out.every(g => !bad(Math.max(f, g)/Math.min(f, g)))){ out.push(f); break; } }
  return out.sort((a,b) => a - b); }
function multitone(freqs, T, fs){ const N = Math.round(T*fs), x = new Float32Array(N), n = freqs.length;
  freqs.forEach((f, k) => { const ph = -Math.PI*k*k/n; for(let i = 0; i < N; i++) x[i] += Math.sin(TAU*f*i/fs + ph)/Math.sqrt(n); }); return fadeEdges(x, fs, 20); }
function noise(T, fs, colour = "white", seed = 1){ const N = Math.round(T*fs), x = new Float32Array(N); let s = seed >>> 0; const rnd = () => { s = (s*1664525 + 1013904223) >>> 0; return s/4294967296*2 - 1; };
  let b0 = 0, b1 = 0, b2 = 0; for(let i = 0; i < N; i++){ const w = rnd(); if(colour === "pink"){ b0 = .99765*b0 + w*.099046; b1 = .963*b1 + w*.2965164; b2 = .57*b2 + w*1.0526913; x[i] = (b0 + b1 + b2 + w*.1848)*.2; } else x[i] = w*.5; } return fadeEdges(x, fs); }

/* ---------- impulse responses, made rather than measured ---------- */
function rng(seed){ let s = seed >>> 0; return () => { s = (s*1664525 + 1013904223) >>> 0; return s/4294967296; }; }
// a decaying, darkening noise tail with early reflections; returns [left, right]
function synthIR({rt60 = 2, pre = .02, early = 8, bright = .6, width = .8, len, fs = 48000, seed = 7} = {}){
  const N = Math.round((len || Math.min(12, rt60*1.4 + pre + .1))*fs), R = rng(seed), out = [new Float32Array(N), new Float32Array(N)];
  for(let ch = 0; ch < 2; ch++){ const y = out[ch]; let lp = 0; const P = Math.round(pre*fs);
    for(let i = P; i < N; i++){ const t = (i - P)/fs, env = Math.exp(-6.91*t/rt60), cut = Math.min(.98, (.08 + .9*bright)*Math.exp(-t*(1.2 - bright)*2/rt60*3)), w = (R()*2 - 1);
      lp += cut*(w - lp); y[i] = lp*env/Math.sqrt(cut/(2 - cut)); }
    for(let e = 0; e < early; e++){ const t = pre + R()*Math.min(.09, rt60/6), i = Math.round(t*fs); if(i < N) y[i] += (R() < .5 ? -1 : 1)*(.55 - e*.04)*(ch === 0 ? 1 : (1 - width*.5 + width*R())); }
    y[0] = 0; }
  // mix the channels by the width
  for(let i = 0; i < N; i++){ const l = out[0][i], r = out[1][i], m = (l + r)/2; out[0][i] = m + (l - m)*width; out[1][i] = m + (r - m)*width; }
  return normalize(out); }
// the image-source model of a rectangular room: every reflection is a mirror image of the source
function shoeboxIR({room = [8, 6, 3.2], src = [2, 3, 1.5], mic = [6, 2.5, 1.6], absorb = .25, order = 8, fs = 48000, c = 343, ears = .17, tail = true} = {}){
  const beta = Math.sqrt(1 - absorb), [Lx, Ly, Lz] = room, V = Lx*Ly*Lz, Sarea = 2*(Lx*Ly + Lx*Lz + Ly*Lz), rt60 = .161*V/(Sarea*Math.max(.01, absorb));
  const N = Math.round(Math.min(10, rt60*1.5 + .2)*fs), out = [new Float32Array(N), new Float32Array(N)], mics = [[mic[0] - ears/2, mic[1], mic[2]], [mic[0] + ears/2, mic[1], mic[2]]];
  const img = (n, s, L) => n % 2 === 0 ? n*L + s : (n + 1)*L - s;   // coordinate of the nth image along one axis
  for(let nx = -order; nx <= order; nx++) for(let ny = -order; ny <= order; ny++) for(let nz = -order; nz <= order; nz++){
    const refl = Math.abs(nx) + Math.abs(ny) + Math.abs(nz); if(refl > order) continue;
    const p = [img(nx, src[0], Lx), img(ny, src[1], Ly), img(nz, src[2], Lz)], g = Math.pow(beta, refl);
    mics.forEach((m, ch) => { const d = Math.hypot(p[0] - m[0], p[1] - m[1], p[2] - m[2]), t = d/c*fs, i = Math.floor(t), f = t - i; if(i + 1 >= N) return; const a = g/Math.max(.3, d); out[ch][i] += a*(1 - f); out[ch][i+1] += a*f; }); }
  if(tail){ const tl = synthIR({rt60, pre: 0, early: 0, bright: .5, len: N/fs, fs, seed: 11}), d0 = Math.hypot(src[0] - mic[0], src[1] - mic[1], src[2] - mic[2]), start = Math.round((d0/c + order*Math.min(Lx, Ly, Lz)/c*.5)*fs);
    // scale the tail to carry on the energy of the reflections where it takes over
    const W = Math.round(.02*fs), rms = (c, a, b) => { let s = 0; for(let i = Math.max(0, a); i < Math.min(N, b); i++) s += c[i]*c[i]; return Math.sqrt(s/Math.max(1, b - a)); };
    const scale = rms(out[0], start - W, start)/Math.max(1e-9, rms(tl[0], start, start + W));
    for(let ch = 0; ch < 2; ch++) for(let i = start; i < N; i++){ const ramp = Math.min(1, (i - start)/(.01*fs)); out[ch][i] += tl[ch][i]*scale*ramp; } }
  const res = normalize(out); res.rt60 = rt60; return res; }
// a spring reverb: repeating dispersive chirps, each echo smeared a little more
function springIR({fs = 48000, len = 3, period = .045, decay = 1.6} = {}){ const N = Math.round(len*fs), out = [new Float32Array(N), new Float32Array(N)];
  for(let k = 0; k*period < len; k++){ const t0 = k*period, g = Math.exp(-6.91*t0/decay)*(k % 2 ? -1 : 1), M = Math.round((.012 + .004*k)*fs), f1 = 4200, f2 = 300;
    for(let ch = 0; ch < 2; ch++){ const off = Math.round((t0 + ch*.0007*k)*fs); for(let i = 0; i < M && off + i < N; i++){ const t = i/fs, T = M/fs, ph = TAU*(f1*t + (f2 - f1)*t*t/(2*T)); out[ch][off + i] += g*Math.sin(ph)*(.5 - .5*Math.cos(TAU*i/M))*.6; } } }
  return normalize(out); }
// discrete echoes, as from a canyon wall or a long tunnel
function echoIR({fs = 48000, delays = [.33, .71, 1.12], gains = [.6, .4, .25], len = 2.5, tailRt = 1.2} = {}){ const base = synthIR({rt60: tailRt, pre: 0, early: 3, bright: .4, len, fs, seed: 5}), N = base[0].length;
  for(let ch = 0; ch < 2; ch++){ for(let i = 0; i < N; i++) base[ch][i] *= .35; base[ch][0] = 1; delays.forEach((d, k) => { const i = Math.round((d + ch*.003)*fs); if(i < N) base[ch][i] += gains[k]; }); } return normalize(base); }
function normalize(chs){ let m = 0; chs.forEach(c => { for(let i = 0; i < c.length; i++) m = Math.max(m, Math.abs(c[i])); }); if(m > 0) chs.forEach(c => { for(let i = 0; i < c.length; i++) c[i] /= m; }); return chs; }

/* ---------- analysis ---------- */
// Schroeder backward integration: the energy decay curve, in dB
function schroeder(ir){ const N = ir.length, e = new Float64Array(N); let acc = 0; for(let i = N - 1; i >= 0; i--){ acc += ir[i]*ir[i]; e[i] = acc; }
  const out = new Float32Array(N); for(let i = 0; i < N; i++) out[i] = 10*Math.log10(Math.max(1e-12, e[i]/e[0])); return out; }
// reverberation time from the decay curve, fitted between −5 and −25 dB (T20) and doubled to −60
function rt60(ir, fs){ const d = schroeder(ir); let i5 = d.findIndex(v => v <= -5), i25 = d.findIndex(v => v <= -25); if(i5 < 0 || i25 < 0 || i25 <= i5) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0; for(let i = i5; i <= i25; i++){ const x = i/fs, y = d[i]; sx += x; sy += y; sxx += x*x; sxy += x*y; n++; } const slope = (n*sxy - sx*sy)/(n*sxx - sx*sx); return slope < 0 ? -60/slope : null; }
function magnitudeDb(x, n = 8192){ const S = spectrum(x, nextPow2(Math.max(n, 256))), out = new Float32Array(S.re.length/2); for(let i = 0; i < out.length; i++) out[i] = 20*Math.log10(Math.max(1e-9, Math.hypot(S.re[i], S.im[i]))); return out; }
function peakIndex(x, from = 0, to = x.length){ let m = -1, k = from; for(let i = from; i < to; i++){ const v = Math.abs(x[i]); if(v > m){ m = v; k = i; } } return k; }
// trim an IR to start a little before its first strong arrival
function trimIR(chs, fs, preMs = 2){ const k = peakIndex(chs[0]), th = Math.abs(chs[0][k])*.1; let s = 0; for(let i = 0; i < k; i++) if(Math.abs(chs[0][i]) > th){ s = i; break; } if(!s) s = k; s = Math.max(0, s - Math.round(preMs*fs/1000)); return chs.map(c => c.slice(s)); }

/* ---------- sonar ---------- */
const soundSpeed = tempC => 331.3*Math.sqrt(1 + tempC/273.15);
// two-device ranging without shared clocks (after Peng et al., "BeepBeep", 2007): each device times both chirps in its own recording
// dA = (A hears B) − (A hears A); dB = (B hears B) − (B hears A); distance = c/2·(dA − dB) + (selfA + selfB)/2
const twoWayDistance = (dA, dB, c, selfA = .05, selfB = .05) => c/2*(dA - dB) + (selfA + selfB)/2;

/* ---------- WAV ---------- */
function encodeWAV(chs, fs, float = false){ const nc = chs.length, N = chs[0].length, bps = float ? 4 : 2, buf = new ArrayBuffer(44 + N*nc*bps), v = new DataView(buf);
  const str = (o, s) => { for(let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + N*nc*bps, true); str(8, "WAVE"); str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, float ? 3 : 1, true); v.setUint16(22, nc, true);
  v.setUint32(24, fs, true); v.setUint32(28, fs*nc*bps, true); v.setUint16(32, nc*bps, true); v.setUint16(34, bps*8, true); str(36, "data"); v.setUint32(40, N*nc*bps, true);
  let o = 44; for(let i = 0; i < N; i++) for(let c = 0; c < nc; c++){ const s = Math.max(-1, Math.min(1, chs[c][i])); if(float){ v.setFloat32(o, s, true); o += 4; } else { v.setInt16(o, s < 0 ? s*32768 : s*32767, true); o += 2; } }
  return buf; }

const API = {nextPow2, fft, convolve, kernelFor, convolveMode, deconvolve, correlate, envelope, essSweep, essInverse, linSweep, chirp, delta, mls, golay, costas, costasSequence, antiHarmonicFreqs, multitone, noise, synthIR, shoeboxIR, springIR, echoIR, normalize, schroeder, rt60, magnitudeDb, peakIndex, trimIR, soundSpeed, twoWayDistance, encodeWAV};
if(typeof module !== "undefined" && module.exports) module.exports = API; else root.MBDSP = API;
})(typeof window !== "undefined" ? window : globalThis);
