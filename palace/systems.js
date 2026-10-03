/* The Wending House: systems of reckoning.
   Calendars, numerals, and timekeepers, kept apart from the house so the rest of the engine can use them.
   Everything here is pure: give it a Date (house time) and it gives back names, numbers, and notes. */
(function(){
"use strict";
const TAU = Math.PI*2, DEG = Math.PI/180;
const mod = (a, n) => ((a % n) + n) % n;
const ord = n => n + (["th","st","nd","rd"][(n%100-20)%10] || ["th","st","nd","rd"][n%100] || "th");

/* ---------- day counts ---------- */
// the Julian Day Number of a Gregorian date (noon)
function jdnGreg(y, m, d){ const a = Math.floor((14-m)/12), yy = y + 4800 - a, mm = m + 12*a - 3;
  return d + Math.floor((153*mm+2)/5) + 365*yy + Math.floor(yy/4) - Math.floor(yy/100) + Math.floor(yy/400) - 32045; }
function gregFromJdn(J){ const a = J + 32044, b = Math.floor((4*a+3)/146097), c = a - Math.floor(146097*b/4), d = Math.floor((4*c+3)/1461), e = c - Math.floor(1461*d/4), m = Math.floor((5*e+2)/153);
  return {y: 100*b + d - 4800 + Math.floor(m/10), m: m + 3 - 12*Math.floor(m/10), d: e - Math.floor((153*m+2)/5) + 1}; }
function julFromJdn(J){ const c = J + 32082, d = Math.floor((4*c+3)/1461), e = c - Math.floor(1461*d/4), m = Math.floor((5*e+2)/153);
  return {y: d - 4800 + Math.floor(m/10), m: m + 3 - 12*Math.floor(m/10), d: e - Math.floor((153*m+2)/5) + 1}; }
const jdnOf = dt => jdnGreg(dt.getFullYear(), dt.getMonth()+1, dt.getDate());
// the Julian Date of a moment (UT)
const jdOf = dt => dt.getTime()/864e5 + 2440587.5;

/* ---------- the moon's conjunctions and the March equinox (Meeus, chs. 49 and 27) ---------- */
function newMoonJDE(k){
  const T = k/1236.85, E = 1 - .002516*T - .0000074*T*T;
  let jde = 2451550.09766 + 29.530588861*k + .00015437*T*T - .00000015*T*T*T;
  const M = (2.5534 + 29.1053567*k)*DEG, Mp = (201.5643 + 385.81693528*k + .0107582*T*T)*DEG, F = (160.7108 + 390.67050284*k - .0016118*T*T)*DEG, O = (124.7746 - 1.5637558*k)*DEG;
  jde += -.4072*Math.sin(Mp) + .17241*E*Math.sin(M) + .01608*Math.sin(2*Mp) + .01039*Math.sin(2*F) + .00739*E*Math.sin(Mp-M) - .00514*E*Math.sin(Mp+M)
       + .00208*E*E*Math.sin(2*M) - .00111*Math.sin(Mp-2*F) - .00057*Math.sin(Mp+2*F) + .00056*E*Math.sin(2*Mp+M) - .00042*Math.sin(3*Mp) + .00042*E*Math.sin(M+2*F)
       + .00038*E*Math.sin(M-2*F) - .00024*E*Math.sin(2*Mp-M) - .00017*Math.sin(O);
  return jde; }
function marchEquinoxJDE(y){ const Y = (y-2000)/1000; return 2451623.80984 + 365242.37404*Y + .05169*Y*Y - .00411*Y*Y*Y - .00057*Y*Y*Y*Y; }
function newMoonsAround(jd, before = 16, after = 3){ const k0 = Math.floor((jd - 2451550.09766)/29.530588861); const out = [];
  for(let k = k0 - before; k <= k0 + after; k++) out.push(newMoonJDE(k)); return out; }

/* ---------- calendars ---------- */
const GREG_M = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAY = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// Roman dating, by Kalends, Nones, and Ides, counted inclusively
const LAT_M = ["Ian.","Feb.","Mart.","Apr.","Mai.","Iun.","Iul.","Aug.","Sept.","Oct.","Nov.","Dec."];
function romanNumeral(n){ if(n <= 0) return ""; const v = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]]; let s = ""; v.forEach(([a,r]) => { while(n >= a){ s += r; n -= a; } }); return s; }
function romanDay(y, m, d){
  const leap = y % 4 === 0, long = [3,5,7,10].includes(m), non = long ? 7 : 5, id = long ? 15 : 13, dim = [31, leap?29:28, 31,30,31,30,31,31,30,31,30,31][m-1];
  if(d === 1) return `Kal. ${LAT_M[m-1]}`;
  if(d === non) return `Non. ${LAT_M[m-1]}`;
  if(d === id) return `Id. ${LAT_M[m-1]}`;
  if(d < non) return d === non-1 ? `prid. Non. ${LAT_M[m-1]}` : `a.d. ${romanNumeral(non-d+1)} Non. ${LAT_M[m-1]}`;
  if(d < id) return d === id-1 ? `prid. Id. ${LAT_M[m-1]}` : `a.d. ${romanNumeral(id-d+1)} Id. ${LAT_M[m-1]}`;
  const next = LAT_M[m % 12];
  if(m === 2 && leap){ if(d === 24) return `a.d. bis VI Kal. Mart.`; if(d >= 25){ const n = 29 - d + 2; return n === 2 ? `prid. Kal. Mart.` : `a.d. ${romanNumeral(n)} Kal. Mart.`; } }
  const n = dim - d + 2; return n === 2 ? `prid. Kal. ${next}` : `a.d. ${romanNumeral(n)} Kal. ${next}`;
}

// the calendars the browser knows (ICU), read through Intl
function intl(dt, cal, opts){ try {
    const f = new Intl.DateTimeFormat("en-u-ca-" + cal, Object.assign({timeZone: undefined}, opts || {year:"numeric", month:"long", day:"numeric"}));
    if(f.resolvedOptions().calendar !== cal) return null;
    const o = {}; f.formatToParts(dt).forEach(p => { o[p.type] = (o[p.type] ? o[p.type] + " " : "") + p.value; }); return o;
  } catch(e){ return null; } }
const shiftDay = (dt, n) => { const x = new Date(dt); x.setDate(x.getDate() + n); return x; };

// the Maya: the Long Count, the 260-day Tzolk'in, the 365-day Haab', and the Lord of the Night (GMT correlation, 584283)
const TZ = ["Imix","Ik'","Ak'bal","K'an","Chikchan","Kimi","Manik'","Lamat","Muluk","Ok","Chuwen","Eb","Ben","Ix","Men","Kib","Kaban","Etz'nab","Kawak","Ajaw"];
const HAAB = ["Pop","Wo'","Sip","Sotz'","Sek","Xul","Yaxk'in","Mol","Ch'en","Yax","Sak'","Keh","Mak","K'ank'in","Muwan","Pax","K'ayab","Kumk'u","Wayeb'"];
function maya(J){ const n = J - 584283;
  const lc = [Math.floor(n/144000), Math.floor(mod(n,144000)/7200), Math.floor(mod(n,7200)/360), Math.floor(mod(n,360)/20), mod(n,20)];
  const tzn = mod(n + 3, 13) + 1, tzd = mod(n + 19, 20), hp = mod(n + 348, 365), hm = Math.floor(hp/20), hd = hp % 20, g = mod(n - 1, 9) + 1;
  return {n, lc, tzn, tzd, tzName: TZ[tzd], haabD: hd, haabM: hm, haabName: HAAB[hm], lord: g}; }

// Babylon: a month begins on the evening the new crescent is first seen; the year begins with the first new month at the spring equinox
const BAB_M = ["Nisannu","Ayyāru","Simānu","Duʾūzu","Abu","Ulūlu","Tašrītu","Araḫsamnu","Kislīmu","Ṭebētu","Šabāṭu","Addaru","Addaru II"];
function babMonthStarts(jd){ return newMoonsAround(jd, 16, 2).map(c => { let e = Math.floor(c - .125) + .125; while(e - c < 1.25) e += 1; return e; }); }  // evenings near 15:00 UT, about sunset in Babylon
function babylonian(dt){
  const jd = jdOf(dt), starts = babMonthStarts(jd);
  const yearStart = Y => { const eq = marchEquinoxJDE(Y); return babMonthStarts(eq + 20).find(s => s >= eq - 11); };
  const gy = dt.getFullYear(); let Y = gy, ys = yearStart(Y); if(ys > jd){ Y -= 1; ys = yearStart(Y); }
  const ye = yearStart(Y + 1);
  const all = babMonthStarts(ys + 400).concat(starts).filter((v,i,a) => a.findIndex(w => Math.abs(w - v) < .5) === i).sort((a,b) => a-b);
  const inYear = all.filter(s => s >= ys - .5 && s < ye - .5), mi = inYear.filter(s => s <= jd).length - 1, ms = inYear[mi];
  const months = inYear.length, day = Math.floor(jd - ms) + 1;
  return {month: mi, monthName: BAB_M[months === 13 && mi === 12 ? 12 : Math.min(mi, 11)], day, se: Y + 311, months, leap: months === 13}; }

// Egypt: the civil year of 365 days, twelve months of thirty and five days over, counted from Nabonassar (747 BC)
const EG_M = ["Thoth","Phaophi","Athyr","Choiak","Tybi","Mechir","Phamenoth","Pharmuthi","Pachons","Payni","Epiphi","Mesore"];
function egyptian(J){ const n = J - 1448638, y = Math.floor(n/365) + 1, doy = mod(n, 365), m = Math.floor(doy/30), d = doy % 30 + 1;
  return {y, m, d, name: m < 12 ? EG_M[m] : "the epagomenal days", season: ["Akhet (the flood)","Peret (the growing)","Shemu (the harvest)",""][Math.floor(m/4)]}; }

// the French Republic: twelve months of three décades, from 22 September 1792 (the arithmetic rule proposed by Romme)
const FR_M = ["Vendémiaire","Brumaire","Frimaire","Nivôse","Pluviôse","Ventôse","Germinal","Floréal","Prairial","Messidor","Thermidor","Fructidor"];
const FR_D = ["Primidi","Duodi","Tridi","Quartidi","Quintidi","Sextidi","Septidi","Octidi","Nonidi","Décadi"];
const FR_SC = ["la Fête de la Vertu","la Fête du Génie","la Fête du Travail","la Fête de l'Opinion","la Fête des Récompenses","la Fête de la Révolution"];
function frFixed(y){ return 2375840 - 1 + 365*(y-1) + Math.floor((y-1)/4) - Math.floor((y-1)/100) + Math.floor((y-1)/400) - Math.floor((y-1)/4000); }
// the years the Republic actually kept, set by the autumn equinox at Paris (years III, VII, and XI were the leap years)
const FR_HIST = [[1792,22],[1793,22],[1794,22],[1795,23],[1796,22],[1797,22],[1798,22],[1799,23],[1800,23],[1801,23],[1802,23],[1803,24],[1804,23],[1805,23],[1806,23]].map(([y,d]) => jdnGreg(y,9,d));
function french(J){ if(J >= FR_HIST[0] && J < FR_HIST[14]){ const y = FR_HIST.findIndex((s,i) => J >= s && J < FR_HIST[i+1]) + 1, doy = J - FR_HIST[y-1], m = Math.floor(doy/30), d = doy % 30 + 1;
    return {y, m, d, name: m < 12 ? FR_M[m] : "les Sansculottides", dec: FR_D[(d-1)%10], fete: m === 12 ? FR_SC[d-1] : null}; }
  let y = Math.floor((J - 2375840 + 2)/(1460969/4000)) + 1; if(J < frFixed(y) + 1) y -= 1;
  const doy = J - frFixed(y) - 1, m = Math.floor(doy/30), d = doy % 30 + 1; return {y, m, d, name: m < 12 ? FR_M[m] : "les Sansculottides", dec: FR_D[(d-1)%10], fete: m === 12 ? FR_SC[d-1] : null}; }

function isoWeek(dt){ const d = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate())), wd = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - wd);
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return {y: d.getUTCFullYear(), w: Math.ceil(((d - y0)/864e5 + 1)/7), d: wd}; }

// the Chinese sexagenary cycle
const STEM = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"], STEM_P = ["jiǎ","yǐ","bǐng","dīng","wù","jǐ","gēng","xīn","rén","guǐ"];
const BRANCH = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"], BRANCH_P = ["zǐ","chǒu","yín","mǎo","chén","sì","wǔ","wèi","shēn","yǒu","xū","hài"];
const ANIMAL = ["Rat","Ox","Tiger","Rabbit","Dragon","Snake","Horse","Goat","Monkey","Rooster","Dog","Pig"], ELEMENT = ["Wood","Wood","Fire","Fire","Earth","Earth","Metal","Metal","Water","Water"];
const sexa = i => ({i, ch: STEM[i%10] + BRANCH[i%12], py: STEM_P[i%10] + "-" + BRANCH_P[i%12], animal: ANIMAL[i%12], element: ELEMENT[i%10]});
const CN_MONTH = ["正","二","三","四","五","六","七","八","九","十","冬","臘"];
const cnDay = d => d <= 10 ? "初" + "一二三四五六七八九十"[d-1] : d < 20 ? "十" + "一二三四五六七八九"[d-11] : d === 20 ? "二十" : d < 30 ? "廿" + "一二三四五六七八九"[d-21] : "三十";

/* Each calendar gives: short (for the house's date chip), long (a sentence or two, HTML), and a note on how it works.
   o = {afterSunset} lets the calendars whose day begins at sunset turn over in the evening. */
const CALENDARS = [
  {k:"gregorian", name:"Gregorian", family:"Solar",
    short: dt => dt.toLocaleDateString([], {month:"short", day:"numeric"}),
    long: dt => `${WEEKDAY[dt.getDay()]}, ${dt.getDate()} ${GREG_M[dt.getMonth()]} ${dt.getFullYear()}`,
    note: "The reform of 1582 under Gregory XIII: a leap day every four years, except in century years not divisible by 400. The year averages 365.2425 days."},
  {k:"julian", name:"Julian (Roman style)", family:"Solar",
    short: dt => { const j = julFromJdn(jdnOf(dt)); return `${j.d} ${GREG_M[j.m-1].slice(0,3)} (O.S.)`; },
    long: dt => { const j = julFromJdn(jdnOf(dt)); return `${j.d} ${GREG_M[j.m-1]} ${j.y}, Old Style; in Roman form <i>${romanDay(j.y, j.m, j.d)}</i>, in the year ${romanNumeral(j.y + 753)} <i>ab urbe condita</i>`; },
    note: "Caesar's calendar of 45 BC: a leap day every fourth year, so the year averages 365.25 days and drifts a day from the sun every 128 years; it now runs 13 days behind the Gregorian. Romans counted days down, inclusively, to the next Kalends (the 1st), Nones (the 5th or 7th), or Ides (the 13th or 15th)."},
  {k:"hebrew", name:"Hebrew", family:"Lunisolar", sunset:true,
    short: (dt, o) => { const p = intl(o && o.afterSunset ? shiftDay(dt, 1) : dt, "hebrew"); return p ? `${p.day} ${p.month}` : "—"; },
    long: (dt, o) => { const p = intl(o && o.afterSunset ? shiftDay(dt, 1) : dt, "hebrew"); return p ? `${p.day} ${p.month} ${p.year} <span class="note">(${hebrewNum(+p.day)} ${p.month}, ${hebrewNum(+p.year % 1000)})</span>` : "Your browser doesn't know this calendar."; },
    note: "Lunar months of 29 or 30 days, kept in step with the sun by seven leap years (an extra Adar) in every nineteen. Years are counted from the creation as reckoned in the Talmud. The day begins at sunset."},
  {k:"islamic", name:"Islamic (Hijri)", family:"Lunar", sunset:true,
    short: (dt, o) => { const p = intl(o && o.afterSunset ? shiftDay(dt, 1) : dt, "islamic-umalqura") || intl(o && o.afterSunset ? shiftDay(dt, 1) : dt, "islamic-civil"); return p ? `${p.day} ${p.month}` : "—"; },
    long: (dt, o) => { const p = intl(o && o.afterSunset ? shiftDay(dt, 1) : dt, "islamic-umalqura") || intl(o && o.afterSunset ? shiftDay(dt, 1) : dt, "islamic-civil"); return p ? `${p.day} ${p.month} ${p.year} AH` : "Your browser doesn't know this calendar."; },
    note: "Twelve lunar months with no intercalation, so the year of about 354 days moves through the seasons in 33 years. Years run from the Hijra of 622. Here by the Umm al-Qura tables of Saudi Arabia; in practice many communities begin each month on sighting the new crescent. The day begins at sunset."},
  {k:"persian", name:"Persian (Solar Hijri)", family:"Solar",
    short: dt => { const p = intl(dt, "persian"); return p ? `${p.day} ${p.month}` : "—"; },
    long: dt => { const p = intl(dt, "persian"); return p ? `${p.day} ${p.month} ${p.year} SH` : "Your browser doesn't know this calendar."; },
    note: "The calendar of Iran and Afghanistan. The year begins at Nowruz, on the day of the March equinox, so it follows the sun more closely than the Gregorian. The first six months have 31 days, the next five 30, and the last 29 or 30."},
  {k:"chinese", name:"Chinese (traditional)", family:"Lunisolar",
    short: dt => { const p = intl(dt, "chinese", {year:"numeric", month:"numeric", day:"numeric"}); return p ? `${CN_MONTH[(parseInt(p.month)||1)-1]}月${cnDay(+p.day)}` : "—"; },
    long: dt => { const p = intl(dt, "chinese", {year:"numeric", month:"numeric", day:"numeric"}); if(!p) return "Your browser doesn't know this calendar.";
      const mo = parseInt(p.month)||1, leap = /bis|leap/i.test(p.month||""), ry = +(p.relatedYear || p.year), y = sexa(mod(ry - 4, 60)), dd = sexa(mod(jdnOf(dt) + 49, 60));
      return `${leap?"閏":""}${CN_MONTH[mo-1]}月${cnDay(+p.day)}, the ${ord(+p.day)} day of the ${leap?"leap ":""}${ord(mo)} month, in the year ${y.ch} (${y.py}), the year of the ${y.element} ${y.animal}. The day is ${dd.ch} (${dd.py}).`; },
    note: "Months begin at the new moon (as seen from China) and the leap month falls where a month contains no principal solar term, so the winter solstice always lands in the eleventh month. Years and days are also named by a cycle of sixty: ten stems and twelve branches, the branches matched with animals."},
  {k:"japanese", name:"Japanese (imperial era)", family:"Solar",
    short: dt => { const p = intl(dt, "japanese", {era:"long", year:"numeric", month:"numeric", day:"numeric"}); return p ? `${p.era} ${p.year}.${p.month}.${p.day}` : "—"; },
    long: dt => { const p = intl(dt, "japanese", {era:"long", year:"numeric", month:"long", day:"numeric"}); return p ? `${p.day} ${p.month}, year ${p.year} of ${p.era}` : "Your browser doesn't know this calendar."; },
    note: "Gregorian months and days since 1873, with years counted in eras (nengō), each now the reign of an emperor: Reiwa began on 1 May 2019."},
  {k:"coptic", name:"Coptic", family:"Solar",
    short: dt => { const p = intl(dt, "coptic"); return p ? `${p.day} ${p.month}` : "—"; },
    long: dt => { const p = intl(dt, "coptic"); return p ? `${p.day} ${p.month} ${p.year} AM (Anno Martyrum)` : "Your browser doesn't know this calendar."; },
    note: "The old Egyptian year of twelve 30-day months and five or six days over, with a Julian leap day added under Augustus. Years count from 284, the start of Diocletian's reign, the Era of the Martyrs."},
  {k:"ethiopic", name:"Ethiopian", family:"Solar",
    short: dt => { const p = intl(dt, "ethiopic"); return p ? `${p.day} ${p.month}` : "—"; },
    long: dt => { const p = intl(dt, "ethiopic"); return p ? `${p.day} ${p.month} ${p.year} (Amete Mihret)` : "Your browser doesn't know this calendar."; },
    note: "Like the Coptic, twelve months of thirty days and a thirteenth, Pagumē, of five or six. The year begins on Enkutatash, about 11 September, and runs seven or eight years behind the Gregorian count."},
  {k:"indian", name:"Indian national (Śaka)", family:"Solar",
    short: dt => { const p = intl(dt, "indian"); return p ? `${p.day} ${p.month}` : "—"; },
    long: dt => { const p = intl(dt, "indian"); return p ? `${p.day} ${p.month} ${p.year} Śaka` : "Your browser doesn't know this calendar."; },
    note: "Adopted in 1957 alongside the Gregorian: the year begins about 22 March, and years are counted in the Śaka era from AD 78. (The many traditional Hindu lunisolar calendars, and the pañcāṅga, are on the list for later.)"},
  {k:"buddhist", name:"Buddhist (Thai)", family:"Solar",
    short: dt => { const p = intl(dt, "buddhist"); return p ? `${p.day} ${(p.month||"").slice(0,3)} ${p.year}` : "—"; },
    long: dt => { const p = intl(dt, "buddhist"); return p ? `${p.day} ${p.month} ${p.year} BE` : "Your browser doesn't know this calendar."; },
    note: "The Thai solar calendar: Gregorian months, with years counted from the Buddha's parinibbāna, 543 years before the Christian era."},
  {k:"maya", name:"Maya", family:"Counts",
    short: dt => { const m = maya(jdnOf(dt)); return `${m.tzn} ${m.tzName} ${m.haabD === 0 ? "Seating of" : m.haabD} ${m.haabName}`; },
    long: dt => { const m = maya(jdnOf(dt)); return `Long Count <b>${m.lc.join(".")}</b>; in the Calendar Round <b>${m.tzn} ${m.tzName} ${m.haabD === 0 ? "the seating of" : m.haabD} ${m.haabName}</b>; under the Lord of the Night G${m.lord}. ${m.n.toLocaleString()} days since the creation of the present world, 4 Ajaw 8 Kumk'u (11 August 3114 BC).`; },
    note: "Three counts at once. The Long Count numbers days in a mixed base twenty: k'in, winal (20), tun (360), k'atun (7,200), and b'ak'tun (144,000). The Tzolk'in pairs thirteen numbers with twenty day names, for 260 days; the Haab' is eighteen months of twenty days and five unlucky days of Wayeb'. Together they repeat every 52 years. Converted by the GMT correlation (584283)."},
  {k:"babylonian", name:"Babylonian", family:"Lunisolar", sunset:true,
    short: dt => { const b = babylonian(dt); return `${b.monthName} ${b.day}`; },
    long: dt => { const b = babylonian(dt); return `Day ${b.day} of ${b.monthName}, in year ${b.se} of the Seleucid era${b.leap ? ", a year of thirteen months" : ""}.`; },
    note: "Each month began on the evening the new crescent was first seen over Babylon, and the year with the first month near the spring equinox; seven years in nineteen took a thirteenth month. Here it is reckoned rather than observed: the crescent is taken as seen about a day and a quarter after the conjunction, and the extra month is always a second Addaru. Years run from the Seleucid era (311 BC)."},
  {k:"egyptian", name:"Egyptian civil", family:"Solar",
    short: dt => { const e = egyptian(jdnOf(dt)); return e.m < 12 ? `${e.d} ${e.name}` : `Epagomenal ${e.d}`; },
    long: dt => { const e = egyptian(jdnOf(dt)); return `${e.m < 12 ? `Day ${e.d} of ${e.name}, in the season of ${e.season}` : `The ${ord(e.d)} of the epagomenal days`}, year ${e.y} of Nabonassar.`; },
    note: "The wandering year: twelve months of thirty days and five days over, never a leap day, so it slips a day every four years against the sun and the rising of Sirius, coming round again after 1,461 years. Ptolemy counted years in it from Nabonassar's accession in 747 BC."},
  {k:"republican", name:"French Republican", family:"Solar",
    short: dt => { const f = french(jdnOf(dt)); return f.m < 12 ? `${f.d} ${f.name}` : f.fete; },
    long: dt => { const f = french(jdnOf(dt)); return `${f.m < 12 ? `${f.dec}, ${f.d} ${f.name}` : `${f.fete}, among ${f.name}`}, an ${romanNumeral(f.y)} de la République.`; },
    note: "Twelve months of three ten-day décades, named for the weather and the harvest (Vendémiaire, the vintage; Brumaire, the mists), with five or six festival days at the end. Used from 1793 to 1805, and briefly by the Commune in 1871. Its years I–XIV are given as kept, by the autumn equinox at Paris; later years follow the arithmetic leap rule Romme proposed."},
  {k:"iso", name:"ISO week and Julian Day", family:"Counts",
    short: dt => { const w = isoWeek(dt); return `${w.y}-W${String(w.w).padStart(2,"0")}-${w.d}`; },
    long: dt => { const w = isoWeek(dt), J = jdOf(dt); return `ISO week date <b>${w.y}-W${String(w.w).padStart(2,"0")}-${w.d}</b>. Julian Date <b>${J.toFixed(4)}</b> (Modified JD ${(J - 2400000.5).toFixed(4)}). Day ${Math.round((new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()) - new Date(dt.getFullYear(), 0, 0))/864e5)} of the year.`; },
    note: "The astronomers' and the accountants' counts. Julian Days run continuously from noon on 1 January 4713 BC (proleptic Julian), so any two moments subtract cleanly. ISO weeks begin on Monday, and week 1 is the one with the year's first Thursday."},
];
const calendarOf = k => CALENDARS.find(c => c.k === k) || CALENDARS[0];

/* Hebrew numerals (used by the Hebrew calendar, and the numerals cabinet) */
function hebrewNum(n){ if(n <= 0 || n >= 10000) return String(n);
  const th = Math.floor(n/1000); let r = n % 1000, s = th ? hebrewNum(th).replace(/[׳״]/g, "") + "׳" : "";
  const H = [[400,"ת"],[300,"ש"],[200,"ר"],[100,"ק"],[90,"צ"],[80,"פ"],[70,"ע"],[60,"ס"],[50,"נ"],[40,"מ"],[30,"ל"],[20,"כ"],[10,"י"],[9,"ט"],[8,"ח"],[7,"ז"],[6,"ו"],[5,"ה"],[4,"ד"],[3,"ג"],[2,"ב"],[1,"א"]];
  let t = ""; while(r >= 400){ t += "ת"; r -= 400; }
  if(r % 100 === 15){ t += H.find(h => h[0] === (r - 15))?.[1] || ""; t += "טו"; r = 0; } else if(r % 100 === 16){ t += H.find(h => h[0] === (r - 16))?.[1] || ""; t += "טז"; r = 0; }
  H.forEach(([v, c]) => { while(r >= v){ t += c; r -= v; } });
  if(!t) return s; return s + (t.length === 1 ? t + "׳" : t.slice(0,-1) + "״" + t.slice(-1)); }

window.SYSTEMS = Object.assign(window.SYSTEMS || {}, {mod, ord, jdnGreg, gregFromJdn, julFromJdn, jdnOf, jdOf, newMoonJDE, marchEquinoxJDE, romanNumeral, romanDay, maya, babylonian, egyptian, french, isoWeek, sexa, hebrewNum, intl, CALENDARS, calendarOf, WEEKDAY, GREG_M});
})();
