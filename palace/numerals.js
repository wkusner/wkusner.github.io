/* The Wending House: numerals.
   Each system takes a whole number and gives back HTML (some are drawn as small SVGs), and, where it can, plain text.
   The house uses the plain text for room numbers when a visitor chooses a system at the numerary. */
(function(){
"use strict";
const SY = window.SYSTEMS || (window.SYSTEMS = {});
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const digitsIn = (n, b) => { if(n === 0) return [0]; const d = []; while(n > 0){ d.unshift(n % b); n = Math.floor(n/b); } return d; };
const svg = (w, h, body, label) => `<svg class="numsvg" viewBox="0 0 ${w} ${h}" style="height:${Math.min(h, 64)}px;width:auto;max-width:100%;vertical-align:middle" role="img" aria-label="${esc(label)}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

/* ---------- positional bases ---------- */
const DIG = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", DOZ = "0123456789↊↋";
const base = (n, b, set) => digitsIn(n, b).map(d => (set || DIG)[d]).join("");
function balancedTernary(n){ if(n === 0) return "0"; let s = "", x = n; while(x !== 0){ let r = ((x % 3) + 3) % 3; if(r === 2){ r = -1; } s = (r === -1 ? "T" : String(r)) + s; x = (x - r)/3; } return s; }
function negabinary(n){ if(n === 0) return "0"; let s = "", x = n; while(x !== 0){ let r = ((x % -2) + 2) % 2; s = r + s; x = (x - r)/-2; } return s; }
function factorial(n){ if(n === 0) return "0"; const d = []; let x = n, k = 1; while(x > 0){ d.unshift(x % k); x = Math.floor(x/k); k++; } return d.join(d.some(v => v > 9) ? ":" : ""); }
function zeckendorf(n){ if(n === 0) return "0"; const F = [1, 2]; while(F[F.length-1] <= n) F.push(F[F.length-1] + F[F.length-2]); let s = "", x = n; for(let i = F.length-1; i >= 0; i--){ if(F[i] <= x){ s += "1"; x -= F[i]; } else if(s) s += "0"; } return s; }
function bijective26(n){ if(n === 0) return "(none)"; let s = "", x = n; while(x > 0){ const r = (x - 1) % 26; s = String.fromCharCode(65 + r) + s; x = Math.floor((x - 1)/26); } return s; }
const sexagesimal = n => digitsIn(n, 60).map(d => String(d).padStart(2, "0")).join(",").replace(/^0(\d)/, "$1");

/* ---------- additive and alphabetic ---------- */
function roman(n){ if(n === 0) return "nulla"; if(n >= 4000000) return null; const th = Math.floor(n/1000), r = n % 1000;
  if(n < 4000) return SY.romanNumeral(n); return `<span style="text-decoration:overline">${SY.romanNumeral(th)}</span>${SY.romanNumeral(r)}`; }
const romanText = n => n > 0 && n < 4000 ? SY.romanNumeral(n) : null;
const ION = [["","α","β","γ","δ","ε","ϛ","ζ","η","θ"],["","ι","κ","λ","μ","ν","ξ","ο","π","ϟ"],["","ρ","σ","τ","υ","φ","χ","ψ","ω","ϡ"]];
function ionic4(n){ const th = Math.floor(n/1000), h = Math.floor(n%1000/100), t = Math.floor(n%100/10), u = n%10; return (th ? "͵" + ION[0][th] : "") + ION[2][h] + ION[1][t] + ION[0][u]; }
function ionic(n){ if(n === 0) return null; if(n >= 1e8) return null; const my = Math.floor(n/10000), r = n % 10000;
  return (my ? `<span style="display:inline-flex;flex-direction:column;align-items:center;line-height:1;vertical-align:middle"><small>${ionic4(my)}</small>Μ</span>` : "") + (r ? ionic4(r) : "") + "ʹ"; }
const ionicText = n => n > 0 && n < 10000 ? ionic4(n) + "ʹ" : null;
function attic(n){ if(n === 0 || n >= 100000) return null; const comp = (big, small) => `<span style="display:inline-block;position:relative">${big}<small style="position:absolute;left:50%;top:38%;transform:translateX(-50%);font-size:.55em">${small}</small></span>`;
  const S = [[50000, comp("Π","Μ")],[10000,"Μ"],[5000, comp("Π","Χ")],[1000,"Χ"],[500, comp("Π","Η")],[100,"Η"],[50, comp("Π","Δ")],[10,"Δ"],[5,"Π"],[1,"Ι"]];
  let s = "", x = n; S.forEach(([v, c]) => { while(x >= v){ s += c; x -= v; } }); return s; }
function alphabetic(n, table, opts){ if(n === 0 || n >= 10000) return null; const th = Math.floor(n/1000), h = Math.floor(n%1000/100), t = Math.floor(n%100/10), u = n%10;
  return (th ? (opts.thousand || "") + (table[3] ? table[3][th] : table[0][th]) : "") + table[2][h] + table[1][t] + table[0][u] + (opts.after || ""); }
const ABJAD = [["","ا","ب","ج","د","ه","و","ز","ح","ط"],["","ي","ك","ل","م","ن","س","ع","ف","ص"],["","ق","ر","ش","ت","ث","خ","ذ","ض","ظ"],["","غ","غب","غج","غد","غه","غو","غز","غح","غط"]];
const ARMEN = [["","Ա","Բ","Գ","Դ","Ե","Զ","Է","Ը","Թ"],["","Ժ","Ի","Լ","Խ","Ծ","Կ","Հ","Ձ","Ղ"],["","Ճ","Մ","Յ","Ն","Շ","Ո","Չ","Պ","Ջ"],["","Ռ","Ս","Վ","Տ","Ր","Ց","Ւ","Փ","Ք"]];
const CYR = [["","а","в","г","д","є","ѕ","з","и","ѳ"],["","і","к","л","м","н","ѯ","о","п","ч"],["","р","с","т","у","ф","х","ѱ","ѿ","ц"]];
function cyrillic(n){ if(n === 0 || n >= 10000) return null; const th = Math.floor(n/1000), r = n % 1000; let s = alphabetic(r || 0, CYR, {}) || "";
  // 11–19 are written units first; the titlo goes over the second letter from the end
  const t = Math.floor(r%100/10), u = r % 10; if(t === 1 && u > 0) s = CYR[2][Math.floor(r%1000/100)] + CYR[0][u] + CYR[1][1];
  if(s.length) s = s.length > 1 ? s.slice(0, -1) + s.slice(-1) + "҃" : s + "҃"; return (th ? "҂" + CYR[0][th] : "") + s; }
// Ge'ez: digits for 1–9 and the tens, then ፻ for a hundred and ፼ for ten thousand, multiplying
const GEEZ1 = ["","፩","፪","፫","፬","፭","፮","፯","፰","፱"], GEEZ10 = ["","፲","፳","፴","፵","፶","፷","፸","፹","፺"];
function geez(n){ if(n === 0) return null; const two = x => GEEZ10[Math.floor(x/10)] + GEEZ1[x % 10], groups = digitsIn(n, 10000), L = groups.length;
  return groups.map((g, i) => { const lvl = L - 1 - i; if(g === 0) return ""; const hi = Math.floor(g/100), lo = g % 100;
    let s = (hi ? (hi === 1 ? "" : two(hi)) + "፻" : "") + two(lo); if(g === 1 && lvl > 0) s = ""; return s + "፼".repeat(lvl); }).join(""); }

/* ---------- East Asia ---------- */
function cjk(n, D, U, opts){ if(n === 0) return D[0]; const big = opts.big || ["","万","亿","兆"];
  const four = (x, lead) => { let s = "", zero = false; [[1000,U[3]],[100,U[2]],[10,U[1]],[1,""]].forEach(([v,u]) => { const d = Math.floor(x/v) % 10;
      if(d === 0){ if(s) zero = true; return; } if(zero && opts.zero){ s += D[0]; } zero = false;
      s += (d === 1 && v > 1 && (opts.dropOne || (v === 10 && lead && !s && opts.dropTen)) ? "" : D[d]) + u; }); return s; };
  const groups = digitsIn(n, 10000); let out = "", pendingZero = false;
  groups.forEach((g, i) => { const k = groups.length - 1 - i; if(g === 0){ pendingZero = true; return; }
    if(out && opts.zero && (pendingZero || g < 1000)) out += D[0]; pendingZero = false; out += four(g, !out) + big[k]; });
  return out; }
const HAN = ["零","一","二","三","四","五","六","七","八","九"], HAN_U = ["","十","百","千"];
const FIN = ["零","壹","贰","叁","肆","伍","陆","柒","捌","玖"], FIN_U = ["","拾","佰","仟"];
const DAIJI = ["〇","壱","弐","参","四","五","六","七","八","九"], DAIJI_U = ["","拾","百","千"];
const KOR = ["영","일","이","삼","사","오","육","칠","팔","구"], KOR_U = ["","십","백","천"];
const chinese = n => cjk(n, HAN, HAN_U, {zero:true, dropTen:true});
const financial = n => cjk(n, FIN, FIN_U, {zero:true, big:["","萬","億","兆"]});
const japanese = n => n === 0 ? "〇" : cjk(n, HAN, HAN_U, {dropOne:true, big:["","万","億","兆"]}).replace(/^一(?=[千])/, "");
const daiji = n => cjk(n, DAIJI, DAIJI_U, {big:["","萬","億","兆"]});
const korean = n => n === 0 ? "영" : cjk(n, KOR, KOR_U, {dropOne:true, big:["","만","억","조"]});
// Suzhou (huama): positional; where 1, 2, or 3 stand next to each other, alternate digits go horizontal
const SZ = ["〇","〡","〢","〣","〤","〥","〦","〧","〨","〩"], SZH = ["","一","二","三"];
function suzhou(n){ const d = digitsIn(n, 10); let prevV = false; return d.map(x => { if(x >= 1 && x <= 3){ const s = prevV ? SZH[x] : SZ[x]; prevV = !prevV; return s; } prevV = false; return SZ[x]; }).join(""); }
// counting rods: units upright, tens laid flat, and so on alternately; a blank for zero
function rods(n){ const d = digitsIn(n, 10), W = 22, H = 30; let body = "";
  d.forEach((x, i) => { const k = d.length - 1 - i, vertical = k % 2 === 0, ox = i*(W+6) + 3;
    if(x === 0){ body += `<circle cx="${ox + W/2}" cy="${H/2}" r="1" stroke-opacity=".25"/>`; return; }
    const five = x >= 6, ones = five ? x - 5 : x;
    if(vertical){ for(let j=0;j<ones;j++){ const xx = ox + 3 + j*(W-6)/Math.max(1, 4) ; body += `<line x1="${xx}" y1="4" x2="${xx}" y2="${H-4}"/>`; } if(five) body += `<line x1="${ox}" y1="8" x2="${ox+W}" y2="8"/>`; }
    else { for(let j=0;j<ones;j++){ const yy = 4 + j*(H-8)/4; body += `<line x1="${ox+2}" y1="${yy}" x2="${ox+W-2}" y2="${yy}"/>`; } if(five) body += `<line x1="${ox+W/2}" y1="2" x2="${ox+W/2}" y2="${H-2}"/>`; } });
  return svg(d.length*(W+6), H, body, "counting rods for " + n); }

/* ---------- drawn: Babylon, the Maya, Kaktovik, the Cistercians ---------- */
function babylonian(n){ const d = digitsIn(n, 60), CW = 12, gap = 10; let x0 = 2, body = "";
  const vw = (x, y, s = 1) => `<path d="M${x-3*s},${y} L${x+3*s},${y} L${x},${y+4*s} Z" fill="currentColor"/><line x1="${x}" y1="${y+3*s}" x2="${x}" y2="${y+14*s}"/>`;
  const cw = (x, y) => `<path d="M${x},${y+6} L${x+8},${y} M${x},${y+6} L${x+8},${y+12}" /><path d="M${x},${y+6} L${x+4},${y+3} L${x+4},${y+9} Z" fill="currentColor"/>`;
  const rowsOf = u => ({1:[1],2:[2],3:[3],4:[2,2],5:[3,2],6:[3,3],7:[4,3],8:[4,4],9:[3,3,3]})[u] || [];
  d.forEach((v, i) => { const t = Math.floor(v/10), u = v % 10;
    if(v === 0){ body += `<path d="M${x0+2},14 l6,-5 M${x0+2},22 l6,-5" stroke-width="2.2"/>`; x0 += 14 + gap; return; }
    for(let j=0;j<t;j++){ const cx = x0 + (j%3)*7, cy = 2 + Math.floor(j/3)*14; body += cw(cx, cy); }
    const tx = x0 + (t ? Math.min(t,3)*7 + 8 : 0), rs = rowsOf(u), s = rs.length > 2 ? .62 : rs.length > 1 ? .85 : 1;
    rs.forEach((cnt, r) => { for(let j=0;j<cnt;j++) body += vw(tx + 4 + j*7*s, 2 + r*15*s, s); });
    x0 = tx + (u ? Math.max(...rs)*7*s + 6 : 0) + gap; });
  return svg(Math.max(20, x0), 34, body, `${n} in Babylonian cuneiform (base sixty: ${d.join(", ")})`); }
function mayan(n){ const d = digitsIn(n, 20), W = 40, LH = 30; let body = "";
  d.forEach((v, i) => { const y = i*LH + 2;
    if(v === 0){ body += `<ellipse cx="${W/2}" cy="${y+12}" rx="14" ry="8"/><path d="M${W/2-10},${y+10} q10,-5 20,0 M${W/2-9},${y+14} q9,4 18,0"/>`; return; }
    const bars = Math.floor(v/5), dots = v % 5; let yy = y + 26;
    for(let b=0;b<bars;b++){ yy -= 6; body += `<rect x="4" y="${yy}" width="${W-8}" height="4" rx="2" fill="currentColor" stroke="none"/>`; }
    for(let k=0;k<dots;k++) body += `<circle cx="${W/2 + (k - (dots-1)/2)*8}" cy="${yy - 5}" r="2.6" fill="currentColor" stroke="none"/>`; });
  return svg(W, d.length*LH + 2, body, `${n} in Maya numerals (base twenty, top to bottom: ${d.join(", ")})`); }
// Kaktovik (Iñupiaq, 1994): base twenty; strokes on top count fives, the zigzag below counts ones
function kaktovik(n){ const d = digitsIn(n, 20), W = 22, H = 36; let body = "";
  d.forEach((v, i) => { const ox = i*(W+5) + 2, f = Math.floor(v/5), u = v % 5;
    if(v === 0){ body += `<path d="M${ox+2},6 L${ox+W/2},${H-14} L${ox+W-2},6 M${ox+4},${H-6} L${ox+W/2},${H-14} L${ox+W-4},${H-6}"/>`; return; }
    for(let k=0;k<f;k++) body += `<line x1="${ox}" y1="${4+k*5}" x2="${ox+W}" y2="${4+k*5}"/>`;
    const top = f ? 4 + (f-1)*5 : 4, bot = H - 3;
    if(u){ let p = `M${ox},${top}`; for(let k=0;k<u;k++){ const x = ox + (k+1)*W/u; p += ` L${x},${k%2===0 ? bot : top}`; } body += `<path d="${p}"/>`; }
    else body += `<line x1="${ox+W}" y1="${top}" x2="${ox+W}" y2="${top}"/>`; });
  return svg(d.length*(W+5), H, body, `${n} in Kaktovik numerals (base twenty: ${d.join(", ")})`) + `<span class="note" style="font-size:20px;margin-left:8px" title="the same, as Unicode characters (if your fonts have them)">${d.map(v => String.fromCodePoint(0x1D2C0 + v)).join("")}</span>`; }
// the Cistercian monks' ciphers: one glyph for any number to 9999, on a single stem
function cistercian(n){ if(n === 0 || n > 9999) return null;
  const Q = {1:[[0,0,1,0]],2:[[0,1,1,1]],3:[[0,0,1,1]],4:[[0,1,1,0]],5:[[0,0,1,0],[0,1,1,0]],6:[[1,0,1,1]],7:[[0,0,1,0],[1,0,1,1]],8:[[0,1,1,1],[1,0,1,1]],9:[[0,0,1,0],[0,1,1,1],[1,0,1,1]]};
  const s = 14, cx = 20, top = 4, bot = 4 + 3*s; let body = `<line x1="${cx}" y1="${top}" x2="${cx}" y2="${bot}"/>`;
  [[n%10, 1, 1], [Math.floor(n/10)%10, -1, 1], [Math.floor(n/100)%10, 1, -1], [Math.floor(n/1000)%10, -1, -1]].forEach(([dgt, sx, sy]) => {
    (Q[dgt]||[]).forEach(([x1,y1,x2,y2]) => { const X = v => cx + sx*v*s, Y = v => sy > 0 ? top + v*s : bot - v*s; body += `<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}"/>`; }); });
  return svg(40, bot + 4, body, `${n} as a Cistercian cipher`); }

/* ---------- tallies and cords ---------- */
function tally(n){ if(n === 0) return "(no marks)"; const m = Math.min(n, 100), G = Math.ceil(m/5); let body = "";
  for(let g=0; g<G; g++){ const k = Math.min(5, m - g*5), ox = (g%10)*30 + 4, oy = Math.floor(g/10)*30 + 3;
    for(let j=0;j<Math.min(4,k);j++) body += `<line x1="${ox + j*5}" y1="${oy}" x2="${ox + j*5}" y2="${oy+22}"/>`;
    if(k === 5) body += `<line x1="${ox-3}" y1="${oy+18}" x2="${ox+19}" y2="${oy+4}"/>`; }
  return svg(Math.min(G,10)*30 + 4, Math.ceil(G/10)*30, body, `${n} tally marks`) + (n > 100 ? `<span class="note"> (the first hundred of ${n})</span>` : ""); }
const ZHENG = ["","一","丅","下","止","正"];
const zheng = n => n === 0 ? "(none)" : n > 200 ? null : "正".repeat(Math.floor(n/5)) + ZHENG[n%5];
// dots and lines: four dots, then the four sides of a square, then its two diagonals make ten
function dotdash(n){ if(n === 0) return "(no marks)"; const m = Math.min(n, 100), G = Math.ceil(m/10), S = 16; let body = "";
  for(let g=0; g<G; g++){ const k = Math.min(10, m - g*10), ox = (g%10)*(S+12) + 5, oy = Math.floor(g/10)*(S+12) + 5;
    const P = [[ox,oy],[ox+S,oy],[ox+S,oy+S],[ox,oy+S]];
    for(let j=0;j<Math.min(4,k);j++) body += `<circle cx="${P[j][0]}" cy="${P[j][1]}" r="2" fill="currentColor" stroke="none"/>`;
    for(let j=0;j<Math.min(4,k-4);j++){ const a = P[j], b = P[(j+1)%4]; body += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; }
    if(k >= 9) body += `<line x1="${ox}" y1="${oy}" x2="${ox+S}" y2="${oy+S}"/>`; if(k >= 10) body += `<line x1="${ox+S}" y1="${oy}" x2="${ox}" y2="${oy+S}"/>`; }
  return svg(Math.min(G,10)*(S+12) + 6, Math.ceil(G/10)*(S+12) + 4, body, `${n} in dot-and-line tally`) + (n > 100 ? `<span class="note"> (the first hundred of ${n})</span>` : ""); }
// the Inka khipu: one pendant cord; single knots for tens and higher, a long knot of n turns for units, a figure-eight for a unit of one
function khipu(n){ const d = digitsIn(n, 10), L = d.length, H = 40 + L*22, cx = 30; let body = `<line x1="4" y1="6" x2="56" y2="6" stroke-width="3"/><line x1="${cx}" y1="6" x2="${cx}" y2="${H-4}" stroke-width="1.4"/>`;
  d.forEach((v, i) => { const k = L - 1 - i, y = 18 + i*22;
    if(v === 0) return;
    if(k > 0){ for(let j=0;j<v;j++){ const yy = y + (j - (v-1)/2)*2.2*(v > 5 ? .8 : 1); body += `<ellipse cx="${cx}" cy="${yy+6}" rx="3.2" ry="1.4" fill="currentColor" stroke="none"/>`; } }
    else if(v === 1) body += `<path d="M${cx},${y} c6,3 6,7 0,9 c-6,2 -6,6 0,9 c6,-3 6,-7 0,-9 c-6,-2 -6,-6 0,-9 Z"/>`;
    else { const h = 4 + v*2.6; body += `<rect x="${cx-3.6}" y="${y}" width="7.2" height="${h}" rx="3.4"/>`; for(let j=1;j<v;j++) body += `<line x1="${cx-3.4}" y1="${y + j*h/v}" x2="${cx+3.4}" y2="${y + j*h/v + 1.2}" stroke-width=".9"/>`; } });
  return svg(60, H, body, `${n} on a khipu cord (knots by place: ${d.join(", ")})`); }

/* ---------- codes and music ---------- */
const BRL = "⠚⠁⠃⠉⠙⠑⠋⠛⠓⠊";
const braille = n => "⠼" + String(n).split("").map(c => BRL[+c]).join("");
const MORSE = ["-----",".----","..---","...--","....-",".....","-....","--...","---..","----."];
const morse = n => String(n).split("").map(c => MORSE[+c]).join(" ");
const SOLFA = ["do","re","mi","fa","sol","la","ti"], SOLFA_MIDI = [60,62,64,65,67,69,71];
const PC = ["C","C♯","D","E♭","E","F","F♯","G","A♭","A","B♭","B"];
const solfa = n => digitsIn(n, 7).map(d => SOLFA[d]).join("·");
const pitchClass = n => digitsIn(n, 12).map(d => PC[d]).join(" ");

/* ---------- the browser's own decimal scripts ---------- */
const SCRIPTS = [["arab","Arabic-Indic"],["arabext","Persian (Eastern Arabic)"],["deva","Devanagari"],["beng","Bengali"],["guru","Gurmukhi"],["gujr","Gujarati"],["orya","Odia"],["tamldec","Tamil (decimal)"],["telu","Telugu"],["knda","Kannada"],["mlym","Malayalam"],["sinh","Sinhala (Lith)"],["thai","Thai"],["laoo","Lao"],["khmr","Khmer"],["mymr","Burmese"],["tibt","Tibetan"],["mong","Mongolian"],["limb","Limbu"],["olck","Ol Chiki"],["nkoo","N'Ko"],["adlm","Adlam"],["bali","Balinese"],["java","Javanese"],["sund","Sundanese"],["cham","Cham"],["hanidec","Chinese decimal"],["fullwide","Full-width"]];
const supported = (() => { try { return new Set(Intl.supportedValuesOf("numberingSystem")); } catch(e){ return null; } })();
const script = sys => n => { try { const f = new Intl.NumberFormat("en-u-nu-" + sys, {useGrouping:false}); return f.resolvedOptions().numberingSystem === sys ? f.format(n) : null; } catch(e){ return null; } };

/* ---------- the registry ---------- */
const T = (k, name, family, fn, note, o = {}) => Object.assign({k, name, family, html: n => { const v = fn(n); return v == null ? null : v; }, note}, o);
const NUMERALS = [
  // Ancient written
  T("babylonian","Babylonian cuneiform","Ancient written", babylonian, "Base sixty, written with two wedges: a corner wedge for ten and an upright for one. Positional, but for a long time with no zero: later scribes put a double slanted wedge in an empty middle place.", {max:1e9}),
  T("egyptian","Egyptian hieroglyphic","Ancient written", n => n === 0 || n >= 1e7 ? null : (() => { const G = ["𓏺","𓎆","𓍢","𓆼","𓂭","𓆐","𓁨"]; return digitsIn(n,10).map((d,i,a) => G[a.length-1-i].repeat(d)).join(""); })(), "Additive, base ten: a stroke, a hobble, a coil of rope, a lotus, a finger, a tadpole, and a god with raised arms for a million. Each sign is repeated as many times as needed.", {cls:"egy", text: null}),
  T("attic","Greek (Attic)","Ancient written", attic, "Acrophonic: the signs are the first letters of the number words, Π for pente (5), Δ for deka (10), Η for hekaton (100), Χ for khilioi (1000), Μ for myrioi (10,000), with Π drawn round another sign to multiply it by five."),
  T("ionic","Greek (alphabetic)","Ancient written", ionic, "Each letter has a value, 1–9, 10–90, and 100–900, using three old letters (digamma or stigma ϛ, koppa ϟ, sampi ϡ). A mark before a letter multiplies it by a thousand, and myriads are written over an M.", {text: ionicText}),
  T("roman","Roman","Ancient written", roman, "Additive with subtraction (IV, IX) as written since the Middle Ages; Romans themselves often wrote IIII. A bar over numerals multiplies them by a thousand.", {text: romanText}),
  T("maya","Maya","Ancient written", mayan, "Base twenty, read top to bottom: a dot for one, a bar for five, and a shell for zero, one of the earliest true zeros. (In the calendar's Long Count the third place is eighteen twenties, not twenty.)", {max:1e9}),
  // East Asian
  T("chinese","Chinese","East Asian", chinese, "Multiplicative-additive: digits with the unit words 十 ten, 百 hundred, 千 thousand, and 万 ten thousand, 亿 a hundred million. 零 marks skipped places.", {text: chinese}),
  T("financial","Chinese financial (大写)","East Asian", financial, "Complex forms of the digits, used on cheques and contracts because they are hard to alter.", {text: financial}),
  T("japanese","Japanese","East Asian", japanese, "The same characters read in Japanese, which drop the one before 十, 百, and 千, and group by 万 and 億.", {text: japanese}),
  T("daiji","Japanese daiji","East Asian", daiji, "Japanese legal forms, like the Chinese financial numerals; only 壱, 弐, 参, and 拾 are still in legal use.", {text: daiji}),
  T("korean","Korean (Sino-Korean)","East Asian", korean, "Sino-Korean numbers in Hangul (il, i, sam…), grouped by 만 (ten thousand) like the Chinese. Native Korean numbers (hana, dul, set) count to ninety-nine.", {text: korean}),
  T("suzhou","Suzhou (花碼)","East Asian", suzhou, "Market numerals from the old Chinese counting rods, positional, used by merchants into the twentieth century. Next to one another, ones, twos, and threes alternate between upright and flat so they can't be misread.", {text: suzhou}),
  T("rods","Counting rods","East Asian", rods, "Rods laid on a counting board: units upright, tens flat, hundreds upright again, so a blank shows a zero place. Since the Warring States period."),
  // Bases
  T("binary","Binary (base 2)","Bases", n => base(n,2), "Leibniz's dyadic arithmetic, now the machines'.", {text: n => base(n,2)}),
  T("octal","Octal (base 8)","Bases", n => base(n,8), "Three binary digits to an octal one.", {text: n => base(n,8)}),
  T("dozenal","Dozenal (base 12)","Bases", n => base(n,12,DOZ), "Twelve divides by 2, 3, 4, and 6. ↊ is ten and ↋ is eleven (Pitman's digits, now in Unicode).", {text: n => base(n,12,DOZ)}),
  T("hex","Hexadecimal (base 16)","Bases", n => base(n,16), "Four binary digits to a hex one.", {text: n => base(n,16)}),
  T("vigesimal","Vigesimal (base 20)","Bases", n => base(n,20), "Counting on fingers and toes: the Maya, the Inuit, and the score of French quatre-vingts.", {text: n => base(n,20)}),
  T("sexagesimal","Sexagesimal (base 60)","Bases", sexagesimal, "Babylon's base, still in our hours, minutes, and seconds and our degrees. Written here with modern digits, place by place.", {text: sexagesimal}),
  T("balanced3","Balanced ternary","Bases", balancedTernary, "Digits −1, 0, and 1 (T, 0, 1): negative numbers need no sign, and rounding is truncation. The Setun computer (Moscow, 1958) used it.", {text: balancedTernary}),
  T("negabinary","Negabinary (base −2)","Bases", negabinary, "Base minus two: every integer, positive or negative, without a sign.", {text: negabinary}),
  T("factorial","Factorial base","Bases", factorial, "Place values 1!, 2!, 3!…, so the k-th digit runs from 0 to k. It numbers permutations (the Lehmer code).", {text: factorial}),
  T("zeckendorf","Fibonacci (Zeckendorf)","Bases", zeckendorf, "Every whole number is a sum of non-consecutive Fibonacci numbers in exactly one way.", {text: zeckendorf}),
  T("bijective26","Bijective base 26","Bases", bijective26, "Digits A–Z with no zero, as spreadsheets name their columns: Z, AA, AB…", {text: bijective26}),
  // Tallies and cords
  T("tally","Tally (five-bar gates)","Tallies and cords", tally, "Four strokes and a fifth across them, as on a prison wall or a cricket scorecard."),
  T("zheng","Tally with 正","Tallies and cords", zheng, "In China, Japan, and Korea, votes are tallied by writing 正 a stroke at a time: it has five strokes.", {text: zheng}),
  T("dotdash","Dots and lines","Tallies and cords", dotdash, "The field tally of foresters and ecologists: four dots, four lines to box them, and two diagonals, ten to a square, hard to miscount."),
  T("khipu","Inka khipu","Tallies and cords", khipu, "Knotted cords: places in base ten down the cord, single knots for tens and above, a long knot of so many turns for the units, a figure-eight knot for a unit of one, and an empty space for zero.", {max:1e8}),
  T("kaktovik","Kaktovik (Iñupiaq)","Tallies and cords", kaktovik, "Invented in 1994 by students at Kaktovik, Alaska, for Iñupiaq counting, which is base twenty with sub-base five. Strokes on top count fives and the zigzag below counts ones, so arithmetic can be done by eye. In Unicode since 2022.", {max:1e9}),
  T("cistercian","Cistercian ciphers","Tallies and cords", cistercian, "Thirteenth-century monks' numerals: one stem, with the units, tens, hundreds, and thousands as marks in its four corners, so any number to 9999 is a single sign."),
  // Scripts of the world
  T("hebrew","Hebrew","Scripts of the world", n => n > 0 && n < 10000 ? SY.hebrewNum(n) : null, "Alphabetic: א to ט for 1–9, י to צ for the tens, ק to ת for the hundreds. Fifteen and sixteen are written ט״ו and ט״ז to avoid spelling a divine name.", {text: n => n > 0 && n < 10000 ? SY.hebrewNum(n) : null}),
  T("abjad","Arabic abjad","Scripts of the world", n => alphabetic(n, ABJAD, {}), "The older letter values of Arabic, in the order of the Semitic alphabet (abjad: alif, bā, jīm, dāl), used for chronograms and dates in verse.", {text: n => alphabetic(n, ABJAD, {})}),
  T("armenian","Armenian","Scripts of the world", n => alphabetic(n, ARMEN, {}), "Mesrop Mashtots's alphabet of 405, with thirty-six letters for 1–9000.", {text: n => alphabetic(n, ARMEN, {})}),
  T("cyrillic","Cyrillic (Church Slavonic)","Scripts of the world", cyrillic, "Letter values after the Greek, with a titlo (◌҃) over the number and ҂ for thousands; still used in Church Slavonic books.", {text: cyrillic}),
  T("geez","Ge'ez (Ethiopic)","Scripts of the world", geez, "Ethiopic numerals: digits for 1–9 and for the tens, then ፻ (hundred) and ፼ (ten thousand) used as multipliers. There is no zero.", {text: geez}),
  ...SCRIPTS.filter(([sys]) => !supported || supported.has(sys)).map(([sys, name]) => T("nu-" + sys, name, "Scripts of the world", script(sys), "Decimal and positional, Hindu-Arabic numerals in this script's own digits.", {text: script(sys)})),
  // Codes and music
  T("braille","Braille","Codes and music", braille, "A number sign ⠼, then the letters a–j standing for 1–9 and 0.", {text: braille}),
  T("morse","Morse","Codes and music", morse, "Five dots and dashes for each digit.", {text: morse}),
  T("solfa","Solfège (base 7)","Codes and music", solfa, "The number in base seven, each digit a degree of the major scale, do to ti. Play it.", {notes: n => digitsIn(n,7).map(d => SOLFA_MIDI[d]), text: solfa}),
  T("pitch","Pitch classes (base 12)","Codes and music", pitchClass, "Base twelve as the twelve pitch classes of the chromatic scale, C = 0 through B = 11, as in musical set theory. Play it.", {notes: n => digitsIn(n,12).map(d => 60 + d), text: pitchClass}),
];
const FAMILIES = ["Ancient written","East Asian","Bases","Tallies and cords","Scripts of the world","Codes and music"];
// on the list for later
const NUMERALS_LATER = ["Aztec (dots, flags for 20, feathers for 400, bags for 8000)", "Sumerian (the older curved signs for 1, 10, 60, 600, 3600)", "Egyptian hieratic and demotic", "Linear A and Linear B", "Etruscan", "Brahmi and Kharoṣṭhī", "Glagolitic", "Coptic letter numerals", "Old Persian and Aegean numerals", "Yoruba (base twenty, built by subtraction)", "Native Korean and Japanese counting words", "Chinese commercial 'huama' in the vertical", "Bede's finger counting (Bede, The Reckoning of Time)", "the soroban and suanpan, as abaci you can work", "Napier's bones", "base φ (golden ratio base)", "Gray code", "p-adic expansions", "the Ishango and Lebombo bones", "change-ringing permutations as numbers", "Byzantine and Arabic musical letter notations"];

SY.NUMERALS = NUMERALS; SY.NUMERAL_FAMILIES = FAMILIES; SY.NUMERALS_LATER = NUMERALS_LATER; SY.numeralOf = k => NUMERALS.find(x => x.k === k);
// the house's room numbers, in the chosen numerals (plain text only; falls back to ordinary digits)
SY.numText = (n, k) => { const s = SY.numeralOf(k); if(!s || !s.text || n == null || isNaN(+n)) return String(n); try { const v = s.text(+n); return v == null || v === "" ? String(n) : String(v); } catch(e){ return String(n); } };
})();
