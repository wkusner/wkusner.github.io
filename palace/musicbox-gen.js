/* The Wending House: the music box's composer.
   Tunings and scales (Western temperaments, equal divisions, ragas, maqamat, gamelan, Japanese, Chinese, Ethiopian,
   the harmonic series, Bohlen–Pierce), synthesized instruments, ambiences, and generators for a dozen kinds of music.
   Everything is made as it plays with Web Audio; nothing is recorded. */
(function(root){
"use strict";
const TAU = Math.PI*2;
const cents2ratio = c => Math.pow(2, c/1200);
const rand = (a, b) => a + Math.random()*(b - a), pick = a => a[Math.floor(Math.random()*a.length)], chance = p => Math.random() < p;

/* ---------- tunings: where the twelve semitones of a Western scale fall ---------- */
const TUNINGS = {
  "12tet":      {name:"Equal temperament (12-TET)", cents:[0,100,200,300,400,500,600,700,800,900,1000,1100]},
  "just":       {name:"Just intonation (5-limit)", cents:[0,111.73,203.91,315.64,386.31,498.04,590.22,701.96,813.69,884.36,1017.6,1088.27]},
  "pythagorean":{name:"Pythagorean", cents:[0,90.22,203.91,294.13,407.82,498.04,611.73,701.96,792.18,905.87,996.09,1109.78]},
  "meantone":   {name:"Quarter-comma meantone", cents:[0,76.05,193.16,310.26,386.31,503.42,579.47,696.58,772.63,889.74,1006.84,1082.89]},
  "werckmeister":{name:"Werckmeister III", cents:[0,90.22,192.18,294.13,390.22,498.04,588.27,696.09,792.18,888.27,996.09,1092.18]},
  "kirnberger": {name:"Kirnberger III", cents:[0,90.22,193.16,294.13,386.31,498.04,590.22,696.58,792.18,889.74,996.09,1088.27]},
};
/* ---------- scales: `semis` follow the tuning; `cents` and `edo` scales carry their own ---------- */
const edo = (N, steps, extra = {}) => Object.assign({cents: steps.map(s => s*1200/N), edoN: N}, extra);
const harm = (lo, hi) => { const c = []; for(let n = lo; n < hi; n++) c.push(1200*Math.log2(n/lo)); return c; };
const SCALES = [
  // Western modes and others (in the chosen tuning)
  ["ionian","Ionian (major)","Western",{semis:[0,2,4,5,7,9,11]}], ["dorian","Dorian","Western",{semis:[0,2,3,5,7,9,10]}], ["phrygian","Phrygian","Western",{semis:[0,1,3,5,7,8,10]}],
  ["lydian","Lydian","Western",{semis:[0,2,4,6,7,9,11]}], ["mixolydian","Mixolydian","Western",{semis:[0,2,4,5,7,9,10]}], ["aeolian","Aeolian (natural minor)","Western",{semis:[0,2,3,5,7,8,10]}],
  ["locrian","Locrian","Western",{semis:[0,1,3,5,6,8,10]}], ["harmminor","Harmonic minor","Western",{semis:[0,2,3,5,7,8,11]}], ["melminor","Melodic minor","Western",{semis:[0,2,3,5,7,9,11]}],
  ["majpent","Major pentatonic","Western",{semis:[0,2,4,7,9]}], ["minpent","Minor pentatonic","Western",{semis:[0,3,5,7,10]}], ["blues","Blues","Western",{semis:[0,3,5,6,7,10]}],
  ["wholetone","Whole tone","Western",{semis:[0,2,4,6,8,10]}], ["octatonic","Octatonic (diminished)","Western",{semis:[0,1,3,4,6,7,9,10]}], ["hungarian","Hungarian minor","Western",{semis:[0,2,3,6,7,8,11]}],
  ["doubleharm","Double harmonic","Western",{semis:[0,1,4,5,7,8,11]}],
  // Japan
  ["in","In (Miyako-bushi)","Japanese",{semis:[0,1,5,7,8]}], ["yo","Yo","Japanese",{semis:[0,2,5,7,9]}], ["hirajoshi","Hirajōshi","Japanese",{semis:[0,2,3,7,8]}],
  ["iwato","Iwato","Japanese",{semis:[0,1,5,6,10]}], ["kumoi","Kumoi","Japanese",{semis:[0,2,3,7,9]}], ["ryukyu","Ryūkyū","Japanese",{semis:[0,4,5,7,11]}],
  // China: the five tones from the Pythagorean method of adding and subtracting thirds (三分損益)
  ["gong","宮 gōng","Chinese",{cents:[0,203.91,407.82,701.96,905.87]}], ["shang","商 shāng","Chinese",{cents:[0,203.91,498.04,701.96,996.09]}],
  ["jue","角 jué","Chinese",{cents:[0,294.13,498.04,792.18,996.09]}], ["zhi","徵 zhǐ","Chinese",{cents:[0,203.91,498.04,701.96,905.87]}], ["yu","羽 yǔ","Chinese",{cents:[0,294.13,498.04,701.96,996.09]}],
  // North Indian ragas (just intonation, approximately as sung)
  ["yaman","Rāga Yaman","Indian",{cents:[0,203.91,386.31,590.22,701.96,884.36,1088.27], pakad:[6,1,2,1,0]}], ["bhairav","Rāga Bhairav","Indian",{cents:[0,111.73,386.31,498.04,701.96,813.69,1088.27]}],
  ["bhairavi","Rāga Bhairavi","Indian",{cents:[0,111.73,315.64,498.04,701.96,813.69,1017.6]}], ["kafi","Rāga Kāfī","Indian",{cents:[0,203.91,315.64,498.04,701.96,884.36,1017.6]}],
  ["todi","Rāga Todī","Indian",{cents:[0,111.73,315.64,590.22,701.96,813.69,1088.27]}], ["marwa","Rāga Mārwā","Indian",{cents:[0,111.73,386.31,590.22,884.36,1088.27]}],
  ["bhupali","Rāga Bhūpālī","Indian",{cents:[0,203.91,386.31,701.96,884.36]}], ["malkauns","Rāga Mālkauns","Indian",{cents:[0,315.64,498.04,813.69,1017.6]}],
  // Arabic and Turkish maqamat (quarter tones; approximate, as the ear sets them)
  ["rast","Maqām Rāst","Maqam",{cents:[0,200,350,500,700,900,1050]}], ["bayati","Maqām Bayātī","Maqam",{cents:[0,150,300,500,700,800,1000]}],
  ["saba","Maqām Ṣabā","Maqam",{cents:[0,150,300,400,700,800,1000]}], ["hijaz","Maqām Ḥijāz","Maqam",{cents:[0,100,400,500,700,800,1000]}],
  ["sikah","Maqām Sīkāh","Maqam",{cents:[0,150,350,550,700,850,1050]}], ["nahawand","Maqām Nahāwand","Maqam",{cents:[0,200,300,500,700,800,1100]}],
  ["kurd","Maqām Kurd","Maqam",{cents:[0,100,300,500,700,800,1000]}], ["hicaz53","Makam Hicaz (53 commas)","Maqam",edo(53,[0,5,17,22,31,35,44])],
  // Indonesia
  ["slendro","Sléndro","Gamelan",{cents:[0,231,474,717,955]}], ["pelog","Pélog (seven tones)","Gamelan",{cents:[0,120,270,540,670,785,950]}], ["pelogbem","Pélog bem","Gamelan",{cents:[0,120,270,670,785]}],
  // Ethiopia: the four qenet
  ["tizita","Tizita (major)","Ethiopian",{semis:[0,2,4,7,9]}], ["bati","Bati (major)","Ethiopian",{semis:[0,4,5,7,11]}], ["ambassel","Ambassel","Ethiopian",{semis:[0,1,5,7,8]}], ["anchihoye","Anchihoye","Ethiopian",{semis:[0,1,5,6,9]}],
  // Thailand
  ["thai7","Thai seven-tone equal","Thai",edo(7,[0,1,2,3,4,5,6])],
  // microtonal and xenharmonic
  ["edo19","19-EDO major","Microtonal",edo(19,[0,3,6,8,11,14,17])], ["edo31","31-EDO major (meantone-like)","Microtonal",edo(31,[0,5,10,13,18,23,28])],
  ["edo24n","24-EDO neutral (½-flat thirds)","Microtonal",edo(24,[0,4,7,10,14,17,21])], ["edo53","53-EDO just major","Microtonal",edo(53,[0,9,17,22,31,39,48])],
  ["edo22","22-EDO porcupine","Microtonal",edo(22,[0,3,6,9,13,16,19])], ["edo5","5-EDO","Microtonal",edo(5,[0,1,2,3,4])],
  ["bp","Bohlen–Pierce (Lambda, by tritaves)","Microtonal",{cents:[0,2,3,4,6,7,9,10,12].map(s => s*1901.955/13), period:1901.955}],
  ["alpha","Carlos alpha (78¢ steps, no octave)","Microtonal",{step:77.965}],
  ["harmonic","Harmonic series 8–16","Microtonal",{cents:harm(8,16)}], ["subharm","Subharmonic series 16–8","Microtonal",{cents:[16,15,14,13,12,11,10,9].map(n => 1200*Math.log2(16/n))}],
  ["otonal7","Septimal (7-limit) heptatonic","Microtonal",{cents:[0,203.91,386.31,498.04,701.96,884.36,968.83]}],
];
const scaleOf = k => { const s = SCALES.find(x => x[0] === k) || SCALES[0]; return {k: s[0], name: s[1], family: s[2], def: s[3]}; };
// the cents of degree d (any integer) above the root
function degreeCents(sc, d, tuning){ const def = sc.def;
  if(def.step) return d*def.step;
  const steps = def.semis ? def.semis.map(s => (TUNINGS[tuning] || TUNINGS["12tet"]).cents[s % 12] + 1200*Math.floor(s/12)) : def.cents;
  const n = steps.length, P = def.period || 1200, o = Math.floor(d/n), i = ((d % n) + n) % n; return steps[i] + o*P; }

/* ---------- ambiences ---------- */
const AMBIENCES = [["none","None"],["rain","Rain"],["tinroof","Rain on a tin roof"],["wind","Wind"],["surf","Surf"],["stream","A stream"],["fire","A fire"],["insects","Night insects"],["birds","Birds at dawn"],["cave","Cave drips"],["city","Distant city"],["roomtone","Room tone"]];

/* ---------- the engine ---------- */
function createEngine(ac, dest, onNote){
  const out = ac.createGain(); out.gain.value = .9; out.connect(dest); const NY = ac.sampleRate*.45, fq = f => Math.max(20, Math.min(NY, f));
  const ambOut = ac.createGain(); ambOut.gain.value = .5;
  const noiseBuf = (() => { const b = ac.createBuffer(1, ac.sampleRate*2, ac.sampleRate), d = b.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1; return b; })();
  const env = (g, t, a, peak, d, sus = 0, rel = .3, end) => { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(sus*peak, t + a, d/3); if(end){ g.gain.setTargetAtTime(0, end, rel/3); } };
  const osc = (type, f, t, stop, dst) => { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(dst); o.start(t); o.stop(stop); return o; };
  const gain = (v = 0, dst = out) => { const g = ac.createGain(); g.gain.value = v; g.connect(dst); return g; };
  const pan = (p, dst = out) => { const s = ac.createStereoPanner ? ac.createStereoPanner() : ac.createGain(); if(s.pan) s.pan.value = p; s.connect(dst); return s; };
  // each instrument: (freq, time, duration, velocity, pan) → schedules its nodes
  const INST = {
    comb: (f, t, d, v, p) => { const P = pan(p); [[1, 1, 2.4], [2.01, .32, 1.3], [3.98, .12, .7], [5.43, .07, .35]].forEach(([k, a, dd]) => { const g = gain(0, P); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v*a*.35, t + .003); g.gain.setTargetAtTime(0, t + .003, dd/4); osc("sine", f*k, t, t + dd + .2, g); }); },
    bell: (f, t, d, v, p) => { const P = pan(p), g = gain(0, P), m = ac.createOscillator(), mg = ac.createGain(); m.frequency.value = f*3.5; mg.gain.setValueAtTime(f*2.2, t); mg.gain.setTargetAtTime(0, t, 1.2); m.connect(mg); const c = osc("sine", f, t, t + 5, g); mg.connect(c.frequency); m.start(t); m.stop(t + 5); env(g, t, .002, v*.3, 3.5, 0); },
    pluck: (f, t, d, v, p) => { // Karplus–Strong: a burst of noise in a tuned, damped loop
      const P = pan(p), src = ac.createBufferSource(); src.buffer = noiseBuf; const burst = ac.createGain(); burst.gain.setValueAtTime(v*.5, t); burst.gain.setValueAtTime(0, t + 1/f*1.2);
      const dl = ac.createDelay(1); dl.delayTime.value = 1/f; const fb = ac.createGain(); fb.gain.value = .985; const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = fq(Math.min(9000, f*9));
      const o = gain(1, P); src.connect(burst); burst.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(o); o.gain.setTargetAtTime(0, t + Math.max(.6, d), .4); src.start(t); src.stop(t + .05);
      setTimeout(() => { try { fb.disconnect(); o.disconnect(); } catch(e){} }, (t - ac.currentTime + Math.max(.6, d) + 2.5)*1000); },
    koto: (f, t, d, v, p) => INST.pluck(f, t, d*1.5, v*1.1, p),
    oud: (f, t, d, v, p) => { INST.pluck(f, t, d, v, p); INST.pluck(f*1.002, t + .004, d, v*.6, p); },
    pad: (f, t, d, v, p) => { const P = pan(p), lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(fq(1400 + f), t + d*.5); lp.frequency.linearRampToValueAtTime(500, t + d + 1.5); lp.Q.value = 1; lp.connect(P);
      const g = ac.createGain(); g.connect(lp); env(g, t, Math.min(1.5, d*.4), v*.12, 1, .8, 1.5, t + d); [-7, 7].forEach(dt => { const o = osc("sawtooth", f, t, t + d + 2.5, g); o.detune.value = dt; }); },
    organ: (f, t, d, v, p) => { const P = pan(p), g = gain(0, P); env(g, t, .02, v*.12, .1, 1, .08, t + d); [[1, 1], [2, .5], [3, .3], [4, .25], [8, .12]].forEach(([k, a]) => { const gg = gain(a, g); osc("sine", f*k, t, t + d + .3, gg); }); },
    flute: (f, t, d, v, p) => { const P = pan(p), g = gain(0, P); env(g, t, .12, v*.2, .3, .8, .25, t + d); const o = osc("sine", f, t, t + d + .5, g); const tri = gain(.15, g); osc("triangle", f*2, t, t + d + .5, tri);
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f*.006, t + .6); lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + d + .5);
      const n = ac.createBufferSource(); n.buffer = noiseBuf; const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = fq(f*2); bp.Q.value = 4; const ng = gain(0, P); env(ng, t, .05, v*.05, .2, .3, .2, t + d); n.connect(bp); bp.connect(ng); n.start(t, Math.random()); n.stop(t + d + .5); },
    shakuhachi: (f, t, d, v, p) => { INST.flute(f*.985, t, d, v*1.1, p); },   // a breathy, slightly flat attack is scheduled inside flute; the bend is the meri
    bowed: (f, t, d, v, p) => { const P = pan(p), g = ac.createGain(); env(g, t, .25, v*.1, .5, .85, .4, t + d); [[700, 6], [1200, 7], [2600, 9]].forEach(([fc, q]) => { const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = fc; bp.Q.value = q; g.connect(bp); bp.connect(P); });
      const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3000; g.connect(lp); const lg = gain(.4, P); lp.connect(lg); const o = osc("sawtooth", f, t, t + d + 1, g); const vib = ac.createOscillator(), vg = ac.createGain(); vib.frequency.value = 5.5; vg.gain.value = f*.004; vib.connect(vg); vg.connect(o.frequency); vib.start(t); vib.stop(t + d + 1); },
    metal: (f, t, d, v, p) => { const P = pan(p); [[1, 1, 3], [2.76, .4, 1.6], [5.4, .2, .8], [8.93, .1, .4]].forEach(([k, a, dd]) => { [0, 6].forEach(beat => { const g = gain(0, P); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v*a*.18, t + .004); g.gain.setTargetAtTime(0, t + .004, dd/3); osc("sine", f*k + beat, t, t + dd + .5, g); }); }); },
    gong: (f, t, d, v, p) => { const P = pan(p); [[1, 1, 7], [1.48, .5, 5], [2.13, .4, 4], [2.92, .2, 3], [3.6, .15, 2]].forEach(([k, a, dd]) => { const g = gain(0, P); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v*a*.25, t + .03); g.gain.setTargetAtTime(0, t + .03, dd/3); const o = osc("sine", f*k, t, t + dd + 1, g); o.frequency.setValueAtTime(f*k*1.01, t); o.frequency.exponentialRampToValueAtTime(f*k, t + 1.5); }); },
    tanpura: (f, t, d, v, p) => { const P = pan(p), g = ac.createGain(); env(g, t, .05, v*.1, 1.5, .5, 1, t + d); const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 6; bp.frequency.setValueAtTime(fq(f*4), t); bp.frequency.exponentialRampToValueAtTime(fq(f*14), t + d*.8); g.connect(bp); bp.connect(P); const lg = gain(.5, P); g.connect(lg); osc("sawtooth", f, t, t + d + 2, g); },
    marimba: (f, t, d, v, p) => { const P = pan(p); [[1, 1, .9], [4, .25, .15], [9.9, .08, .05]].forEach(([k, a, dd]) => { const g = gain(0, P); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v*a*.35, t + .002); g.gain.setTargetAtTime(0, t + .002, dd/3); osc("sine", f*k, t, t + dd + .3, g); }); },
    epiano: (f, t, d, v, p) => { const P = pan(p), g = gain(0, P), m = ac.createOscillator(), mg = ac.createGain(); m.frequency.value = f; mg.gain.setValueAtTime(f*1.5*v, t); mg.gain.setTargetAtTime(f*.2, t, .3); m.connect(mg); const c = osc("sine", f, t, t + d + 1.5, g); mg.connect(c.frequency); m.start(t); m.stop(t + d + 1.5); env(g, t, .003, v*.22, 1.2, .3, .4, t + d); },
    bass: (f, t, d, v, p) => { const P = pan(p*.3), lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600; lp.connect(P); const g = ac.createGain(); g.connect(lp); env(g, t, .01, v*.3, .4, .6, .1, t + d); osc("sine", f, t, t + d + .3, g); const sg = gain(.3, g); osc("sawtooth", f, t, t + d + .3, sg); },
    drone: (f, t, d, v, p) => { const P = pan(p), g = ac.createGain(); env(g, t, 2, v*.1, 2, 1, 3, t + d); const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; g.connect(lp); lp.connect(P); [0, 701.96, 1200].forEach(c => { const o = osc("sawtooth", f*cents2ratio(c), t, t + d + 4, g); o.detune.value = rand(-4, 4); }); },
    throat: (f, t, d, v, p) => { // overtone singing: a buzzing drone through a narrow resonance that walks the harmonics
      const P = pan(p), g = ac.createGain(); env(g, t, 1, v*.12, 1, .9, 2, t + d); const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 22; bp.frequency.setValueAtTime(fq(f*6), t);
      [8, 9, 10, 12, 10, 9, 8, 6].forEach((h, i) => bp.frequency.setTargetAtTime(fq(f*h), t + i*d/8, .25)); g.connect(bp); bp.connect(P); const lg = gain(.25, P); g.connect(lg); osc("sawtooth", f, t, t + d + 3, g); },
  };
  const PERC = {
    frame: (t, v, p) => { const P = pan(p), g = gain(0, P); g.gain.setValueAtTime(v*.5, t); g.gain.setTargetAtTime(0, t, .08); const o = osc("sine", 160, t, t + .4, g); o.frequency.exponentialRampToValueAtTime(70, t + .2); },
    tek: (t, v, p) => { const P = pan(p), n = ac.createBufferSource(); n.buffer = noiseBuf; const hp = ac.createBiquadFilter(); hp.type = "bandpass"; hp.frequency.value = 3500; hp.Q.value = 2; const g = gain(0, P); g.gain.setValueAtTime(v*.35, t); g.gain.setTargetAtTime(0, t, .02); n.connect(hp); hp.connect(g); n.start(t, Math.random()); n.stop(t + .15); },
    tabla: (t, v, p, f = 300) => { const P = pan(p), g = gain(0, P); g.gain.setValueAtTime(v*.35, t); g.gain.setTargetAtTime(0, t, .12); const o = osc("sine", f*1.3, t, t + .6, g); o.frequency.exponentialRampToValueAtTime(f, t + .05); },
    bayan: (t, v, p) => { const P = pan(p), g = gain(0, P); g.gain.setValueAtTime(v*.5, t); g.gain.setTargetAtTime(0, t, .25); const o = osc("sine", 90, t, t + 1, g); o.frequency.linearRampToValueAtTime(130, t + .3); },
    shaker: (t, v, p) => { const P = pan(p), n = ac.createBufferSource(); n.buffer = noiseBuf; const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 6000; const g = gain(0, P); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v*.12, t + .02); g.gain.setTargetAtTime(0, t + .03, .03); n.connect(hp); hp.connect(g); n.start(t, Math.random()); n.stop(t + .2); },
    block: (t, v, p) => { const P = pan(p), g = gain(0, P); g.gain.setValueAtTime(v*.3, t); g.gain.setTargetAtTime(0, t, .02); osc("sine", 1250, t, t + .1, g); },
    brush: (t, v, p) => PERC.shaker(t, v*.7, p),
  };
  const INSTRUMENTS = Object.keys(INST);

  /* the state the generators read: tempo, scale, tuning, root, roles → instruments */
  const st = {genre:"ambient", bpm:72, scale:"dorian", tuning:"12tet", root:146.83, density:.6, swing:0, roles:{}, perc:true};
  const freq = (d, oct = 0) => st.root*cents2ratio(degreeCents(scaleOf(st.scale), d, st.tuning) + 1200*oct*(scaleOf(st.scale).def.period ? scaleOf(st.scale).def.period/1200 : 1));
  const scaleLen = () => { const def = scaleOf(st.scale).def; return def.step ? 15 : (def.semis || def.cents).length; };
  const play = (role, d, oct, t, dur, vel, p = 0) => { const inst = INST[st.roles[role]] || INST.comb, f = freq(d, oct); inst(f, t, dur, vel, p); onNote && onNote({t, f, d, dur, role}); };
  const hit = (k, t, v, p, extra) => { if(!st.perc) return; (PERC[k] || PERC.block)(t, v, p, extra); onNote && onNote({t, f: 0, perc: k, dur: .1}); };

  /* ---------- the genres ---------- */
  // each has default roles and a step(beat, t, spb) called once a beat (spb: seconds per beat)
  let mem = {};
  const GENRES = {
    ambient: {name:"Ambient", roles:{harmony:"pad", lead:"bell", bass:"drone"}, bpm:60,
      step(b, t, spb){ const L = scaleLen(); if(b % 8 === 0){ mem.ch = pick([0, 3, 4, 5, 1]); [0, 2, 4].forEach((k, i) => play("harmony", mem.ch + k, 0, t, spb*8.5, .7, (i - 1)*.5)); }
        if(b % 16 === 0) play("bass", 0, -1, t, spb*16.5, .7);
        if(chance(st.density*.45)){ mem.m = (mem.m ?? L) + pick([-2, -1, 1, 2, 0]); mem.m = Math.max(L - 3, Math.min(2*L + 2, mem.m)); play("lead", mem.m, 0, t + (chance(.5) ? spb/2 : 0), spb*2, .5, rand(-.6, .6)); } }},
    musicbox: {name:"Music box waltz", roles:{lead:"comb", harmony:"comb", bass:"comb"}, bpm:132,
      step(b, t, spb){ const bar = Math.floor(b/3), beat = b % 3, prog = [0, 5, 3, 4, 0, 3, 4, 0], ch = prog[bar % 8];
        if(beat === 0) play("bass", ch, -1, t, spb*2, .7); else [2, 4].forEach(k => play("harmony", ch + k, 0, t, spb, .35, .3));
        if(chance(.35 + st.density*.6)){ const L = scaleLen(), tgt = ch + pick([0, 2, 4, 7, 9]) + L; mem.m = mem.m == null ? tgt : mem.m + Math.sign(tgt - mem.m)*Math.min(2, Math.abs(tgt - mem.m)); play("lead", mem.m, 0, t, spb, .6, -.2);
          if(chance(st.density*.4)) play("lead", mem.m + 1, 0, t + spb/2, spb/2, .45, -.2); } }},
    minimal: {name:"Minimalist phasing", roles:{lead:"marimba", harmony:"marimba", bass:"bass"}, bpm:150,
      step(b, t, spb){ const pat = mem.pat || (mem.pat = [0, 2, 4, 7, 5, 2, 7, 4, 0, 5, 4, 2]); const s = spb/2;   // twelve notes, as in Piano Phase
        for(let k = 0; k < 2; k++){ const i = (b*2 + k), tt = t + k*s; play("lead", pat[i % 12], 1, tt, s*1.5, .55, -.6);
          const shift = Math.floor(i/ (12*8));  // the second player drifts ahead by one note every eight cycles
          play("harmony", pat[(i + shift) % 12], 1, tt + s*.003*(i % (12*8))/(12*8), s*1.5, .5, .6); }
        if(b % 12 === 0) play("bass", pick([0, 3, 5]), -1, t, spb*6, .5); }},
    raga: {name:"Rāga ālāp and drone", roles:{lead:"bowed", harmony:"tanpura", bass:"tanpura"}, bpm:50, scale:"yaman", tuning:"just",
      step(b, t, spb){ const L = scaleLen(), pa = Math.max(0, scaleOf(st.scale).def.cents ? scaleOf(st.scale).def.cents.findIndex(c => Math.abs(c - 702) < 30) : 4);
        if(b % 4 === 0){ [pa >= 0 ? pa - L : -3, 0, 0, -L].forEach((d, i) => play("harmony", d, 0, t + i*spb, spb*3, .6, -.3 + i*.2)); }  // Pa Sa Sa Sa, low to high
        mem.phase = mem.phase || 0; mem.m = mem.m ?? 0;
        if(chance(.3 + st.density*.5)){ const ceil = Math.min(2*L, Math.floor(mem.phase/12)); let nxt = mem.m + pick([-1, 1, 1, 0, -2, 2]); nxt = Math.max(-2, Math.min(ceil + 2, nxt)); mem.m = nxt; play("lead", nxt, 0, t, spb*rand(1, 3), .6, .1); }
        mem.phase++; if(st.perc && st.bpm > 70){ const tl = b % 16; if(tl % 4 === 0) hit("bayan", t, .6, -.2); hit("tabla", t + spb/2, .4, .2, st.root*2); } }},
    gamelan: {name:"Gamelan", roles:{lead:"metal", harmony:"metal", bass:"gong"}, bpm:84, scale:"slendro",
      step(b, t, spb){ const L = scaleLen(); mem.bal = mem.bal || Array.from({length: 16}, () => Math.floor(rand(0, L)));
        const n = mem.bal[b % 16]; play("lead", n, 0, t, spb, .6, 0);                         // the saron plays the balungan
        for(let k = 0; k < 4; k++){ const tt = t + k*spb/4, a = n + [0, 1, 0, 2][k], bb = n + [2, 0, 1, 0][k];  // kotekan: two parts interlock
          if(k % 2 === 0) play("harmony", a, 1, tt, spb/4, .35, -.6); else play("harmony", bb, 1, tt, spb/4, .35, .6); }
        if(b % 16 === 15) play("bass", 0, -2, t + spb*.9, spb*8, .9);                        // the great gong ends the cycle
        else if(b % 4 === 3) play("bass", n, -1, t, spb*2, .4); }},                          // kenong on the strong beats
    japanese: {name:"Koto and shakuhachi", roles:{lead:"shakuhachi", harmony:"koto", bass:"koto"}, bpm:56, scale:"in",
      step(b, t, spb){ const L = scaleLen(); if(chance(.25 + st.density*.4)){ const base = pick([0, 2, 3, 4]); [0, 2, 4].slice(0, Math.floor(rand(1, 4))).forEach((k, i) => play("harmony", base + k + (i ? 0 : -L), 1, t + i*spb*.18, spb*2, .55, -.3 + i*.2)); }
        if(b % 8 === 0 || (chance(.15) && !mem.blow)){ mem.s = Math.max(L - 2, Math.min(2*L, (mem.s ?? L) + pick([-2, -1, 1, 2]))); play("lead", mem.s, 0, t + spb*.3, spb*rand(3, 6), .55, .3); } }},
    maqam: {name:"Taqsīm and maqsūm", roles:{lead:"oud", harmony:"flute", bass:"bass"}, bpm:96, scale:"bayati",
      step(b, t, spb){ const L = scaleLen(); mem.m = mem.m ?? 0;
        for(let k = 0; k < 2; k++) if(chance(.3 + st.density*.5)){ mem.m = Math.max(-2, Math.min(L + 4, mem.m + pick([-1, 1, 1, -1, 2, 0]))); play("lead", mem.m, 1, t + k*spb/2, spb/2, .6, -.1); }
        if(b % 8 === 0 && chance(.6)) play("harmony", pick([0, 2, 4]), 1, t, spb*6, .45, .4);
        if(b % 8 === 0) play("bass", 0, -1, t, spb*8, .4);
        const m = b % 4; if(m === 0) hit("frame", t, .7, 0); if(m === 0 || m === 2) hit("tek", t + spb/2, .5, .2); if(m === 1) hit("tek", t + spb*.5, .4, -.2); if(m === 3) hit("frame", t + spb/2, .5, 0); }},
    chorale: {name:"Chorale", roles:{harmony:"organ", lead:"organ", bass:"organ"}, bpm:66, scale:"ionian",
      step(b, t, spb){ if(b % 2) return; const prog = mem.prog || (mem.prog = [0, 3, 4, 0, 5, 1, 4, 0, 3, 0, 4, 5, 3, 1, 4, 0]); const ch = prog[(b/2) % prog.length], L = scaleLen();
        const tones = [ch, ch + 2, ch + 4]; mem.v = mem.v || [L + 2, L + 4, 2*L]; // nearest voice leading in the upper three voices
        mem.v = mem.v.map(v => { let best = v, bd = 99; for(let o = -1; o <= 2; o++) tones.forEach(tn => { const c = tn + o*L; if(Math.abs(c - v) < bd){ bd = Math.abs(c - v); best = c; } }); return best; });
        mem.v.forEach((d, i) => play(i === 2 ? "lead" : "harmony", d, 0, t, spb*2, .5, (i - 1)*.4)); play("bass", ch, -1, t, spb*2, .55); }},
    bells: {name:"Change ringing (plain hunt)", roles:{lead:"bell", harmony:"bell", bass:"gong"}, bpm:150, scale:"ionian",
      step(b, t, spb){ // six bells ring every permutation of a plain hunt, swapping pairs (12)(34)(56), then (23)(45)
        mem.row = mem.row || [0, 1, 2, 3, 4, 5]; mem.k = mem.k ?? 0; const L = scaleLen();
        const i = b % 6; play("lead", 2*L - 1 - mem.row[i], 0, t, spb*2, .5, (mem.row[i] - 2.5)/3);
        if(i === 5){ const r = mem.row.slice(), s = mem.k % 2 === 0 ? 0 : 1; for(let j = s; j + 1 < 6; j += 2){ const x = r[j]; r[j] = r[j+1]; r[j+1] = x; } mem.row = r; mem.k++; if(r.join() === "0,1,2,3,4,5") play("bass", 0, -1, t + spb, spb*6, .5); } }},
    drone: {name:"Overtone drone", roles:{lead:"throat", harmony:"drone", bass:"drone"}, bpm:40, scale:"harmonic",
      step(b, t, spb){ if(b % 12 === 0){ play("bass", 0, -1, t, spb*13, .7); play("lead", 0, 0, t + spb*2, spb*10, .6); } if(b % 6 === 3 && chance(st.density)) play("harmony", pick([4, 7]), -1, t, spb*7, .4, rand(-.5, .5)); }},
    lounge: {name:"Lounge (ii–V–I)", roles:{harmony:"epiano", lead:"flute", bass:"bass"}, bpm:100, scale:"ionian",
      step(b, t, spb){ const L = scaleLen(), bar = Math.floor(b/4), beat = b % 4, prog = [1, 4, 0, 0, 5, 1, 4, 0], ch = prog[bar % 8];
        if(beat === 0 || (beat === 2 && chance(.4))) [0, 2, 4, 6].forEach((k, i) => play("harmony", ch + k, 0, t + (beat ? spb*.5 : 0), spb*1.6, .45, (i - 1.5)*.25));
        play("bass", ch + [0, 2, 4, 5][beat] - (beat === 3 ? 1 : 0), -1, t, spb*.9, .55);   // walking
        if(beat % 2 === 1) hit("brush", t, .4, .3); if(chance(st.density*.4)) play("lead", ch + pick([0, 2, 4, 6, 8]) + L, 0, t + (chance(.5) ? spb*.66 : 0), spb, .4, -.3); }},
    sparse: {name:"Silence and single notes", roles:{lead:"comb", harmony:"bell", bass:"gong"}, bpm:40, scale:"hirajoshi",
      step(b, t, spb){ if(chance(.18*st.density + .05)) play(chance(.7) ? "lead" : "harmony", Math.floor(rand(0, scaleLen()*2)), 0, t, spb*4, .5, rand(-.8, .8)); if(b % 32 === 0) play("bass", 0, -2, t, spb*16, .4); }},
  };

  /* ---------- the transport ---------- */
  let timer = null, nextT = 0, beat = 0, running = false;
  function tick(){ const spb = 60/st.bpm; while(nextT < ac.currentTime + .3){ const g = GENRES[st.genre] || GENRES.ambient; try { g.step(beat, nextT + (beat % 2 ? st.swing*spb*.33 : 0), spb); } catch(e){ console.warn(e); } beat++; nextT += spb; } }
  function start(){ if(running) return; running = true; nextT = ac.currentTime + .1; beat = 0; mem = {}; timer = setInterval(tick, 60); tick(); }
  function stop(){ running = false; clearInterval(timer); timer = null; out.gain.setTargetAtTime(0, ac.currentTime, .3); setTimeout(() => { if(!running) out.gain.value = .9; }, 1500); }
  function set(o){ const g0 = st.genre; Object.assign(st, o); if(o.genre && o.genre !== g0){ mem = {}; } }
  function useGenreDefaults(k){ const g = GENRES[k]; st.genre = k; st.bpm = g.bpm; st.roles = Object.assign({}, g.roles); if(g.scale) st.scale = g.scale; if(g.tuning) st.tuning = g.tuning; mem = {}; return st; }
  function preview(inst, f){ (INST[inst] || INST.comb)(f || st.root*2, ac.currentTime + .02, .8, .7, 0); }

  /* ---------- ambiences ---------- */
  let ambNodes = [], ambTimers = [];
  function ambience(k, toNode){ ambNodes.forEach(n => { try { n.stop ? n.stop() : 0; n.disconnect(); } catch(e){} }); ambTimers.forEach(clearInterval); ambNodes = []; ambTimers = [];
    try { ambOut.disconnect(); } catch(e){} ambOut.connect(toNode || out); if(!k || k === "none") return;
    const loopNoise = (type, f, q, v, dst = ambOut) => { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ac.createGain(); g.gain.value = v; s.connect(fl); fl.connect(g); g.connect(dst); s.start(); ambNodes.push(s, g); return {s, fl, g}; };
    const lfo = (param, rate, depth, base) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = rate; g.gain.value = depth; o.connect(g); g.connect(param); param.value = base; o.start(); ambNodes.push(o); };
    const every = (ms, fn) => ambTimers.push(setInterval(fn, ms));
    const drop = (f, v, d = .03) => { const t = ac.currentTime + Math.random()*.2, g = ac.createGain(); g.connect(ambOut); g.gain.setValueAtTime(v, t); g.gain.setTargetAtTime(0, t, d); const o = ac.createOscillator(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f*1.6, t + d*2); o.connect(g); o.start(t); o.stop(t + d*6); };
    if(k === "rain"){ loopNoise("lowpass", 5000, .5, .25); loopNoise("highpass", 7000, .5, .06); every(60, () => { if(chance(.5)) drop(rand(2500, 5000), .04, .006); }); }
    if(k === "tinroof"){ loopNoise("bandpass", 3000, .8, .15); every(25, () => { if(chance(.7)) drop(rand(1800, 4200), .08, .01); }); }
    if(k === "wind"){ const n = loopNoise("bandpass", 500, 3, .35); lfo(n.fl.frequency, .07, 300, 500); lfo(n.g.gain, .05, .2, .3); }
    if(k === "surf"){ const n = loopNoise("lowpass", 900, .7, .3); lfo(n.g.gain, .09, .28, .3); lfo(n.fl.frequency, .09, 600, 900); }
    if(k === "stream"){ loopNoise("bandpass", 1600, 1.2, .18); every(40, () => { if(chance(.6)) drop(rand(600, 1600), .05, .02); }); }
    if(k === "fire"){ loopNoise("lowpass", 400, .7, .2); every(50, () => { if(chance(.35)){ const t = ac.currentTime, s = ac.createBufferSource(); s.buffer = noiseBuf; const g = ac.createGain(); g.gain.setValueAtTime(rand(.05, .3), t); g.gain.setTargetAtTime(0, t, .004); const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = rand(1500, 5000); s.connect(hp); hp.connect(g); g.connect(ambOut); s.start(t, Math.random()); s.stop(t + .05); } }); }
    if(k === "insects"){ [4300, 4700, 5200].forEach((f, i) => { const o = ac.createOscillator(); o.frequency.value = f; const g = ac.createGain(); g.gain.value = 0; o.connect(g); g.connect(ambOut); o.start(); ambNodes.push(o, g);
        const am = ac.createOscillator(), ag = ac.createGain(); am.type = "square"; am.frequency.value = [2.1, 2.6, 3.3][i]; ag.gain.value = .012; am.connect(ag); ag.connect(g.gain); am.start(); ambNodes.push(am); }); loopNoise("lowpass", 300, .7, .05); }
    if(k === "birds"){ every(400, () => { if(!chance(.35)) return; const t = ac.currentTime + rand(0, .3), base = rand(2200, 4200), n = Math.floor(rand(2, 6)), g = ac.createGain(); g.connect(ambOut); g.gain.value = 0;
        const o = ac.createOscillator(); o.connect(g); for(let i = 0; i < n; i++){ const tt = t + i*.12; o.frequency.setValueAtTime(base*rand(.9, 1.1), tt); o.frequency.exponentialRampToValueAtTime(base*rand(1.2, 1.6), tt + .08); g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(.04, tt + .02); g.gain.linearRampToValueAtTime(0, tt + .1); } o.start(t); o.stop(t + n*.12 + .1); }); loopNoise("lowpass", 400, .7, .03); }
    if(k === "cave"){ loopNoise("lowpass", 200, .7, .06); every(700, () => { if(chance(.5)) drop(rand(900, 1900), .12, .05); }); }
    if(k === "city"){ const n = loopNoise("lowpass", 250, .7, .25); lfo(n.g.gain, .03, .08, .25); every(3000, () => { if(chance(.3)){ const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = rand(380, 520); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.015, t + .3); g.gain.linearRampToValueAtTime(0, t + 1.2); o.connect(g); g.connect(ambOut); o.start(t); o.stop(t + 1.3); } }); }
    if(k === "roomtone"){ loopNoise("lowpass", 180, .7, .08); const o = ac.createOscillator(); o.frequency.value = 60; const g = ac.createGain(); g.gain.value = .006; o.connect(g); g.connect(ambOut); o.start(); ambNodes.push(o, g); }
  }
  const setAmbLevel = v => { ambOut.gain.setTargetAtTime(v, ac.currentTime, .2); };

  return {st, start, stop, set, useGenreDefaults, preview, ambience, setAmbLevel, freq, get running(){ return running; }, out, ambOut, GENRES, INSTRUMENTS, PERC: Object.keys(PERC)};
}

const API = {TUNINGS, SCALES, scaleOf, degreeCents, AMBIENCES, createEngine, cents2ratio};
if(typeof module !== "undefined" && module.exports) module.exports = API; else root.MBGEN = API;
})(typeof window !== "undefined" ? window : globalThis);
