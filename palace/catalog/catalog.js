/* The Log Book: the Wending House's catalogue.
   Everyone can read and search it. The archivist writes to it through the GitHub API, with a fine-grained
   access token that lives only in the archivist's own browser. GitHub Pages serves the result as a plain JSON file.

   Data: <repo>/<path>/index.json  = {version:1, updated, items:[...]}
         <repo>/<path>/images/*.jpg
   Settings (this browser only): localStorage "wending-curator" (repo, branch, path); the token in
   localStorage or sessionStorage "wending-token", as the archivist chooses. */
(() => {
"use strict";
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
if(window.top !== window) document.body.classList.add("embedded");

/* ---------- settings ---------- */
const DEFAULTS = {owner:"wkusner", repo:"wkusner.github.io", branch:"master", path:"catalog", publicUrl:"/catalog/index.json"};
let cfg = Object.assign({}, DEFAULTS);
try { Object.assign(cfg, JSON.parse(localStorage.getItem("wending-curator") || "{}")); } catch(e) {}
const saveCfg = () => { try { localStorage.setItem("wending-curator", JSON.stringify(cfg)); } catch(e) {} };
let token = null;
try { token = sessionStorage.getItem("wending-token") || localStorage.getItem("wending-token"); } catch(e) {}
let canWrite = false;   // set once the token has been checked against the repository

/* ---------- what can be catalogued, and what each kind asks for ---------- */
const F = {
  title:{label:"Title"}, subtitle:{label:"Subtitle"}, creators:{label:"Creators", kind:"creators", hint:"one per line: Name, role"},
  date:{label:"Date", hint:"a year, or a full date"}, publisher:{label:"Publisher"}, place:{label:"Place"}, edition:{label:"Edition"},
  "ids.isbn":{label:"ISBN"}, "ids.barcode":{label:"Barcode", hint:"UPC or EAN"}, "ids.doi":{label:"DOI"}, "ids.url":{label:"Web address", type:"url"}, "ids.catno":{label:"Catalogue no."},
  pages:{label:"Pages", type:"number"}, format:{label:"Format", kind:"select"}, medium:{label:"Medium"}, dimensions:{label:"Dimensions"},
  language:{label:"Language"}, series:{label:"Series"}, container:{label:"In", hint:"journal, anthology, album, or collection"},
  tags:{label:"Subjects & tags", kind:"tags", hint:"separated by commas"}, description:{label:"Description", kind:"textarea"}, notes:{label:"Notes", kind:"textarea"},
  location:{label:"Where it is", hint:"shelf, box, drawer, or a path on a disk"}, condition:{label:"Condition"},
  "acquired.date":{label:"Acquired"}, "acquired.source":{label:"From"}, cover:{label:"Cover image URL", type:"url"},
  private:{label:"Keep off the public site", kind:"check"}, room:{label:"House room", hint:"a room number in the house, if it belongs somewhere"}
};
const TYPES = {
  book:     {label:"Book", formats:["hardcover","paperback","mass-market paperback","pamphlet","ebook","manuscript","other"], fields:["title","subtitle","creators","publisher","place","date","edition","ids.isbn","pages","format","language","series","tags","description","location","condition","acquired.date","acquired.source","notes"]},
  paper:    {label:"Paper or article", formats:["journal article","preprint","chapter","thesis","report","offprint","other"], fields:["title","creators","container","date","ids.doi","ids.url","pages","format","tags","description","location","notes"]},
  physical: {label:"Physical media", formats:["LP","45","CD","cassette","DVD","Blu-ray","VHS","laserdisc","game cartridge","floppy","other"], fields:["title","creators","publisher","date","format","ids.barcode","ids.catno","tags","description","location","condition","acquired.date","acquired.source","notes"]},
  digital:  {label:"Digital media", formats:["ebook","PDF","audio","video","image","software","game","dataset","website","other"], fields:["title","creators","publisher","date","format","ids.url","ids.doi","location","tags","description","notes"]},
  ephemera: {label:"Ephemera", formats:["letter","postcard","ticket","program","poster","map","photograph","clipping","note","other"], fields:["title","creators","date","place","format","medium","dimensions","tags","description","location","condition","acquired.date","acquired.source","notes"]},
  object:   {label:"Object", formats:["instrument","device","model","tool","game","toy","specimen","other"], fields:["title","creators","date","place","format","medium","dimensions","tags","description","location","condition","acquired.date","acquired.source","notes","room"]},
  art:      {label:"Art", formats:["print","drawing","painting","photograph","sculpture","textile","other"], fields:["title","creators","date","medium","dimensions","edition","format","tags","description","location","condition","acquired.date","acquired.source","notes"]},
};
const typeLabel = t => (TYPES[t] || {label:t}).label;
const get = (o, k) => k.split(".").reduce((a, p) => a == null ? a : a[p], o);
const set = (o, k, v) => { const ps = k.split("."); let a = o; ps.slice(0,-1).forEach(p => { a[p] = a[p] || {}; a = a[p]; }); a[ps[ps.length-1]] = v; };

/* ---------- the catalogue itself ---------- */
let items = [], indexSha = null, loadedFrom = "";
const pubBase = () => cfg.publicUrl.replace(/index\.json(\?.*)?$/, "");
const rawBase = () => `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/${cfg.path}/`;
const imgUrl = p => !p ? "" : /^(https?:|data:|blob:)/.test(p) ? p : pubBase() + p;
const pendingImg = {};   // images saved this session, shown before the site rebuilds
async function loadPublic(){
  try { const r = await fetch(cfg.publicUrl + (cfg.publicUrl.includes("?") ? "&" : "?") + "t=" + Date.now()); if(!r.ok) throw 0; const j = await r.json(); items = j.items || []; loadedFrom = "the published catalogue"; }
  catch(e){ items = []; loadedFrom = "nothing yet"; }
}

/* ---------- GitHub ---------- */
const gh = (path, opts={}) => fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}${path ? "/" + path : ""}`, Object.assign({}, opts, {headers: Object.assign({Authorization:`Bearer ${token}`, Accept:"application/vnd.github+json", "X-GitHub-Api-Version":"2022-11-28"}, opts.headers||{})}));
const b64e = str => { const bytes = new TextEncoder().encode(str); let bin = ""; for(let i=0;i<bytes.length;i+=0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i+0x8000)); return btoa(bin); };
const b64d = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g,"")), c => c.charCodeAt(0)));
async function checkAccess(){
  if(!token){ canWrite = false; return "no token"; }
  try { const r = await gh(""); if(r.status === 401) { canWrite = false; return "The token was refused."; } if(!r.ok){ canWrite = false; return `GitHub answered ${r.status}.`; }
    const j = await r.json(); canWrite = !!(j.permissions && (j.permissions.push || j.permissions.admin)); return canWrite ? "ok" : "This token can read the repository but not write to it."; }
  catch(e){ canWrite = false; return "GitHub couldn't be reached."; }
}
async function readIndex(){
  const r = await gh(`contents/${cfg.path}/index.json?ref=${encodeURIComponent(cfg.branch)}`);
  if(r.status === 404) return {items:[], sha:null};
  if(!r.ok) throw new Error(`reading the catalogue: GitHub answered ${r.status}`);
  const j = await r.json(); let text = j.content ? b64d(j.content) : "";
  if(!text){ const b = await gh(`git/blobs/${j.sha}`); text = b64d((await b.json()).content); }
  const data = JSON.parse(text || "{}"); return {items: data.items || [], sha: j.sha};
}
async function putFile(path, b64, message, sha){
  const r = await gh(`contents/${path}`, {method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(Object.assign({message, content:b64, branch:cfg.branch}, sha ? {sha} : {}))});
  if(!r.ok){ const t = await r.text(); const e = new Error(`GitHub answered ${r.status}: ${t.slice(0,160)}`); e.status = r.status; throw e; }
  return (await r.json()).content;
}
async function deleteFile(path, message){
  const r = await gh(`contents/${path}?ref=${encodeURIComponent(cfg.branch)}`); if(!r.ok) return; const j = await r.json();
  await gh(`contents/${path}`, {method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({message, sha:j.sha, branch:cfg.branch})});
}
async function loadLive(){ const {items:it, sha} = await readIndex(); items = it; indexSha = sha; loadedFrom = "the repository, live"; }
// change the index with a function, retrying once if someone (another tab, another device) changed it meanwhile
async function commitIndex(mutate, message){
  for(let attempt=0; attempt<2; attempt++){
    const cur = await readIndex(); const next = mutate(cur.items.slice());
    const body = JSON.stringify({version:1, updated:new Date().toISOString(), count:next.length, items:next}, null, 1);
    try { const c = await putFile(`${cfg.path}/index.json`, b64e(body), message, cur.sha); items = next; indexSha = c.sha; return; }
    catch(e){ if(attempt === 0 && (e.status === 409 || e.status === 422)) continue; throw e; }
  }
}

/* ---------- identifiers: ISBN, EAN/UPC, DOI ---------- */
const digits = s => String(s||"").replace(/[^0-9Xx]/g, "").toUpperCase();
function isbn13ok(d){ if(!/^\d{13}$/.test(d)) return false; let s = 0; for(let i=0;i<12;i++) s += (+d[i])*(i%2?3:1); return (10 - s%10)%10 === +d[12]; }
function isbn10ok(d){ if(!/^\d{9}[\dX]$/.test(d)) return false; let s = 0; for(let i=0;i<10;i++) s += (d[i]==="X"?10:+d[i])*(10-i); return s%11 === 0; }
function to13(d10){ const b = "978" + d10.slice(0,9); let s = 0; for(let i=0;i<12;i++) s += (+b[i])*(i%2?3:1); return b + ((10 - s%10)%10); }
function to10(d13){ if(!d13.startsWith("978")) return ""; const b = d13.slice(3,12); let s = 0; for(let i=0;i<9;i++) s += (+b[i])*(10-i); const c = (11 - s%11)%11; return b + (c===10 ? "X" : c); }
function classify(raw){
  const s = String(raw||"").trim();
  if(/^(doi:|https?:\/\/(dx\.)?doi\.org\/)?10\.\d{4,9}\//i.test(s)) return {kind:"doi", value:s.replace(/^(doi:|https?:\/\/(dx\.)?doi\.org\/)/i, "")};
  if(/^https?:\/\//i.test(s)) return {kind:"url", value:s};
  const d = digits(s);
  if(d.length === 13 && /^97[89]/.test(d) && isbn13ok(d)) return {kind:"isbn", value:d, isbn10:to10(d)};
  if(d.length === 10 && isbn10ok(d)) return {kind:"isbn", value:to13(d), isbn10:d};
  if(/^\d{8}$|^\d{12,14}$/.test(d)) return {kind:"barcode", value:d};
  return {kind:"text", value:s};
}

/* ---------- looking things up ---------- */
const getJSON = async (url) => { const r = await fetch(url); if(!r.ok) throw new Error(r.status); return r.json(); };
const yearOf = s => (String(s||"").match(/\d{4}/)||[""])[0];
function fromOpenLibrary(b, isbn){
  if(!b) return null;
  return {type:"book", title:b.title||"", subtitle:b.subtitle||"", creators:(b.authors||[]).map(a => ({name:a.name, role:"author"})), publisher:(b.publishers||[]).map(p=>p.name).join("; "),
    place:(b.publish_places||[]).map(p=>p.name).join("; "), date:b.publish_date||"", pages:b.number_of_pages||"", tags:(b.subjects||[]).slice(0,8).map(x=>x.name),
    ids:{isbn, olid:(b.identifiers&&b.identifiers.openlibrary||[])[0]||"", url:b.url||""}, cover:(b.cover&&(b.cover.large||b.cover.medium))||"", source:"Open Library"};
}
function fromGoogle(v, isbn){
  if(!v) return null; const i = v.volumeInfo || {};
  const id13 = (i.industryIdentifiers||[]).find(x => x.type==="ISBN_13");
  return {type:"book", title:i.title||"", subtitle:i.subtitle||"", creators:(i.authors||[]).map(n => ({name:n, role:"author"})), publisher:i.publisher||"", date:i.publishedDate||"",
    pages:i.pageCount||"", tags:(i.categories||[]).slice(0,6), description:i.description||"", language:i.language||"",
    ids:{isbn: isbn || (id13&&id13.identifier) || "", url:i.infoLink||""}, cover:((i.imageLinks&&(i.imageLinks.thumbnail||i.imageLinks.smallThumbnail))||"").replace(/^http:/,"https:").replace("&edge=curl",""), source:"Google Books"};
}
function merge(a, b){ // fill a's blanks from b
  if(!a) return b; if(!b) return a; const out = JSON.parse(JSON.stringify(a));
  Object.keys(b).forEach(k => { const v = b[k]; if(k==="ids"){ out.ids = Object.assign({}, b.ids, Object.fromEntries(Object.entries(a.ids||{}).filter(([,x]) => x))); return; }
    if(out[k]==null || out[k]==="" || (Array.isArray(out[k]) && !out[k].length)) out[k] = v; });
  out.source = [a.source, b.source].filter(Boolean).join(" and "); return out;
}
async function lookupISBN(isbn){
  const [ol, gb] = await Promise.all([
    getJSON(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`).then(j => fromOpenLibrary(j[`ISBN:${isbn}`], isbn)).catch(() => null),
    getJSON(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`).then(j => fromGoogle((j.items||[])[0], isbn)).catch(() => null)]);
  const m = merge(ol, gb); if(m && !m.cover) m.cover = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  return m ? [m] : [];
}
function fromMusicBrainz(r){
  return {type:"physical", title:r.title||"", creators:(r["artist-credit"]||[]).map(a => ({name:a.name || (a.artist&&a.artist.name), role:"artist"})), date:r.date||"",
    publisher:((r["label-info"]||[])[0]||{}).label ? r["label-info"][0].label.name : "", ids:{barcode:r.barcode||"", catno:((r["label-info"]||[])[0]||{})["catalog-number"]||"", url:`https://musicbrainz.org/release/${r.id}`},
    format:((r.media||[])[0]||{}).format || "", cover:`https://coverartarchive.org/release/${r.id}/front-500`, source:"MusicBrainz"};
}
async function lookupBarcode(code){
  const out = [];
  try { const j = await getJSON(`https://musicbrainz.org/ws/2/release/?query=barcode:${code}&fmt=json&limit=6`); (j.releases||[]).forEach(r => out.push(fromMusicBrainz(r))); } catch(e) {}
  if(!out.length){ // some books carry only an EAN that is their ISBN; some publishers' codes are ISBNs
    const c = classify(code); if(c.kind === "isbn") return lookupISBN(c.value); }
  return out;
}
function fromCrossref(m){
  const d = ((m.issued||m.created||{})["date-parts"]||[[]])[0];
  return {type:"paper", title:(m.title||[""])[0], creators:(m.author||[]).map(a => ({name:[a.given,a.family].filter(Boolean).join(" ") || a.name, role:"author"})),
    container:(m["container-title"]||[""])[0], date:d.filter(Boolean).join("-"), publisher:m.publisher||"", pages:m.page||"", format:(m.type||"").replace(/-/g," "),
    ids:{doi:m.DOI||"", url:m.URL||""}, source:"Crossref"};
}
async function lookupDOI(doi){ try { const j = await getJSON(`https://api.crossref.org/works/${encodeURIComponent(doi)}`); return [fromCrossref(j.message)]; } catch(e){ return []; } }
async function searchFields(type, title, creator){
  title = (title||"").trim(); creator = (creator||"").trim(); if(!title && !creator) return [];
  if(type === "paper"){ const q = new URLSearchParams({rows:"8"}); if(title) q.set("query.bibliographic", title); if(creator) q.set("query.author", creator);
    try { const j = await getJSON(`https://api.crossref.org/works?${q}`); return (j.message.items||[]).map(fromCrossref); } catch(e){ return []; } }
  if(type === "physical"){ const q = [title && `release:"${title}"`, creator && `artist:"${creator}"`].filter(Boolean).join(" AND ");
    try { const j = await getJSON(`https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(q)}&fmt=json&limit=8`); return (j.releases||[]).map(fromMusicBrainz); } catch(e){ return []; } }
  // books, and anything else: Open Library and Google Books together
  const q = new URLSearchParams({limit:"8", fields:"key,title,subtitle,author_name,first_publish_year,publisher,isbn,cover_i,number_of_pages_median,subject"}); if(title) q.set("title", title); if(creator) q.set("author", creator);
  const gq = [title && `intitle:${title}`, creator && `inauthor:${creator}`].filter(Boolean).join("+");
  const [ol, gb] = await Promise.all([
    getJSON(`https://openlibrary.org/search.json?${q}`).then(j => (j.docs||[]).map(d => ({type:"book", title:d.title||"", subtitle:d.subtitle||"", creators:(d.author_name||[]).map(n => ({name:n, role:"author"})),
      date:d.first_publish_year?String(d.first_publish_year):"", publisher:(d.publisher||[])[0]||"", pages:d.number_of_pages_median||"", tags:(d.subject||[]).slice(0,6),
      ids:{isbn:(d.isbn||[]).find(x => x.length===13)||"", url:`https://openlibrary.org${d.key}`}, cover:d.cover_i?`https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`:"", source:"Open Library"}))).catch(() => []),
    getJSON(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(gq)}&maxResults=6`).then(j => (j.items||[]).map(v => fromGoogle(v))).catch(() => [])]);
  return ol.concat(gb).slice(0, 14);
}

/* ---------- search ---------- */
let query = "", typeFilter = "", sortBy = "recent", selected = null;
function hay(it){ return [it.title, it.subtitle, (it.creators||[]).map(c=>c.name).join(" "), it.publisher, it.date, it.container, (it.tags||[]).join(" "), it.description, it.notes, it.location, it.format, it.medium,
  Object.values(it.ids||{}).join(" "), typeLabel(it.type)].join(" ").toLowerCase(); }
function matches(it){
  if(it.private && !canWrite) return false;
  if(typeFilter && it.type !== typeFilter) return false;
  if(!query) return true;
  const d = digits(query); if(d.length >= 8 && Object.values(it.ids||{}).some(v => digits(v) === d || (d.length===10 && digits(v) === to13(d)))) return true;
  const h = hay(it); return query.toLowerCase().split(/\s+/).filter(Boolean).every(w => h.includes(w));
}
const creatorLine = it => (it.creators||[]).map(c => c.name).filter(Boolean).join(", ");
function sorted(list){
  const by = {recent:(a,b) => String(b.added||"").localeCompare(String(a.added||"")), title:(a,b) => String(a.title||"").localeCompare(String(b.title||"")),
    creator:(a,b) => creatorLine(a).localeCompare(creatorLine(b)), date:(a,b) => String(yearOf(a.date)).localeCompare(String(yearOf(b.date)))}[sortBy];
  return list.slice().sort(by);
}
function thumbHTML(it){
  const src = it.images && it.images[0] ? (pendingImg[it.images[0]] || imgUrl(it.images[0])) : it.cover;
  return src ? `<img class="thumb" src="${esc(src)}" alt="" loading="lazy" onerror="this.outerHTML='<span class=thumb>${esc(typeLabel(it.type))}</span>'">` : `<span class="thumb">${esc(typeLabel(it.type))}</span>`;
}
function renderSearch(){
  const L = $("left"), list = sorted(items.filter(matches));
  L.innerHTML = `<h2>The catalogue</h2>
    <div class="scan"><input id="q" type="search" placeholder="Search, or scan a barcode" value="${esc(query)}" aria-label="Search the catalogue" autocomplete="off"></div>
    <div class="chips" id="types"><button class="chip ${typeFilter?"":"on"}" data-t="">everything</button>${Object.entries(TYPES).map(([k,t]) => `<button class="chip ${typeFilter===k?"on":""}" data-t="${k}">${esc(t.label.toLowerCase())}</button>`).join("")}</div>
    <div class="row"><span class="note">sort by</span><select id="sort">${["recent","title","creator","date"].map(k => `<option ${k===sortBy?"selected":""}>${k}</option>`).join("")}</select><span class="count" style="margin-left:auto">${list.length} of ${items.filter(i => !i.private || canWrite).length} entries</span></div>
    <ul class="results" id="res">${list.slice(0, 400).map(it => `<li data-id="${esc(it.id)}" class="${selected===it.id?"on":""}">${thumbHTML(it)}<div><div class="kind">${esc(typeLabel(it.type))}${it.private?" · private":""}</div><div class="t">${esc(it.title||"(untitled)")}</div><div class="m">${esc([creatorLine(it), yearOf(it.date), it.format].filter(Boolean).join(" · "))}</div></div></li>`).join("")}</ul>
    ${list.length ? "" : `<p class="empty">${items.length ? "Nothing matches." : "The log book is empty so far."}</p>`}
    <p class="note" style="margin-top:14px">Read from ${esc(loadedFrom)}.</p>`;
  const q = $("q"); q.oninput = () => { query = q.value; renderResultsOnly(); }; q.onkeydown = e => { if(e.key === "Enter"){ const c = classify(q.value); if(["isbn","barcode","doi"].includes(c.kind) && canWrite && !items.some(matches)) location.hash = "add/" + encodeURIComponent(q.value); } };
  $("types").onclick = e => { const b = e.target.closest("[data-t]"); if(!b) return; typeFilter = b.dataset.t; renderSearch(); };
  $("sort").onchange = e => { sortBy = e.target.value; renderSearch(); };
  $("res").onclick = e => { const li = e.target.closest("li[data-id]"); if(li) location.hash = "item/" + encodeURIComponent(li.dataset.id); };
}
function renderResultsOnly(){ const pos = $("q").selectionStart; renderSearch(); const q = $("q"); q.focus(); try { q.setSelectionRange(pos, pos); } catch(e) {} }

/* ---------- an entry ---------- */
function renderItem(id){
  const it = items.find(x => x.id === id), R = $("right"); selected = id;
  if(!it || (it.private && !canWrite)){ R.innerHTML = `<p class="empty">No such entry.</p>`; return; }
  const imgs = (it.images||[]).map(p => pendingImg[p] || imgUrl(p)), cover = imgs[0] || it.cover || "";
  const row = (k, v) => v ? `<dt>${esc(k)}</dt><dd>${v}</dd>` : "";
  const ids = it.ids || {};
  R.innerHTML = `<article class="detail"><div class="kind" style="text-align:center">${esc(typeLabel(it.type))}${it.format?" · "+esc(it.format):""}</div><h2>${esc(it.title||"(untitled)")}</h2>
    ${it.subtitle?`<p style="text-align:center;margin-top:-6px"><i>${esc(it.subtitle)}</i></p>`:""}
    ${cover?`<div class="cover"><img src="${esc(cover)}" alt="" onerror="this.parentNode.remove()"></div>`:""}
    <dl>${row("by", (it.creators||[]).map(c => esc(c.name) + (c.role && c.role!=="author" ? ` <span class="note">(${esc(c.role)})</span>` : "")).join("<br>"))}
      ${row("in", esc(it.container))}${row("published", esc([it.publisher, it.place, it.date].filter(Boolean).join(", ")))}${row("edition", esc(it.edition))}${row("pages", esc(it.pages))}
      ${row("medium", esc(it.medium))}${row("size", esc(it.dimensions))}${row("language", esc(it.language))}${row("series", esc(it.series))}
      ${row("ISBN", esc(ids.isbn))}${row("barcode", esc(ids.barcode))}${row("cat. no.", esc(ids.catno))}${row("DOI", ids.doi?`<a href="https://doi.org/${esc(ids.doi)}" target="_blank" rel="noopener">${esc(ids.doi)}</a>`:"")}
      ${row("online", ids.url?`<a href="${esc(ids.url)}" target="_blank" rel="noopener">${esc(ids.url.replace(/^https?:\/\//,"").slice(0,48))}</a>`:"")}
      ${row("where", esc(it.location))}${row("condition", esc(it.condition))}${row("acquired", esc([it.acquired&&it.acquired.date, it.acquired&&it.acquired.source].filter(Boolean).join(", from ")))}
      ${row("subjects", (it.tags||[]).map(t => `<a href="#search" data-tag="${esc(t)}">${esc(t)}</a>`).join(", "))}
      ${row("in the house", it.room!=null && it.room!=="" ? `<a href="/palace/#${esc(it.room)}" target="_top">room ${esc(it.room)}</a>` : "")}</dl>
    ${it.description?`<p>${esc(it.description).replace(/\n/g,"<br>")}</p>`:""}${it.notes?`<p class="note">${esc(it.notes).replace(/\n/g,"<br>")}</p>`:""}
    ${imgs.length > 1 ? `<div class="gallery">${imgs.map(s => `<img src="${esc(s)}" alt="">`).join("")}</div>` : ""}
    <p class="note" style="clear:both">${esc([it.source && "details from " + it.source, it.added && "entered " + it.added.slice(0,10), it.updated && it.updated !== it.added && "revised " + it.updated.slice(0,10)].filter(Boolean).join(" · "))}</p>
    ${canWrite ? `<div class="row"><a class="btn" href="#edit/${encodeURIComponent(it.id)}">Revise the entry</a></div>` : ""}</article>`;
  R.querySelectorAll("[data-tag]").forEach(a => a.onclick = e => { e.preventDefault(); query = a.dataset.tag; location.hash = "search"; renderSearch(); });
  R.querySelectorAll(".gallery img, .cover img").forEach(im => im.onclick = () => { $("zoom").querySelector("img").src = im.src; $("zoom").classList.add("on"); });
}
$("zoom").onclick = () => $("zoom").classList.remove("on");

/* ---------- writing an entry ---------- */
let draft = null, draftImages = [], candidates = [];
const blank = type => ({id:"", type, title:"", creators:[], tags:[], ids:{}, acquired:{}, images:[]});
function fieldHTML(key){
  const f = F[key], v = get(draft, key), id = "f-" + key.replace(".", "-");
  let input;
  if(f.kind === "creators") input = `<textarea id="${id}" rows="2" placeholder="${esc(f.hint)}">${esc((v||[]).map(c => c.role && c.role!=="author" ? `${c.name}, ${c.role}` : c.name).join("\n"))}</textarea>`;
  else if(f.kind === "tags") input = `<input id="${id}" type="text" value="${esc((v||[]).join(", "))}" placeholder="${esc(f.hint)}">`;
  else if(f.kind === "textarea") input = `<textarea id="${id}" rows="3">${esc(v||"")}</textarea>`;
  else if(f.kind === "select") input = `<input id="${id}" type="text" list="fmt-list" value="${esc(v||"")}">`;
  else if(f.kind === "check") input = `<input id="${id}" type="checkbox" ${v?"checked":""} style="width:auto;justify-self:start">`;
  else input = `<input id="${id}" type="${f.type||"text"}" value="${esc(v==null?"":v)}" placeholder="${esc(f.hint||"")}">`;
  return `<label for="${id}">${esc(f.label)}</label>${input}`;
}
function readForm(){
  const t = TYPES[draft.type], keys = t.fields.concat(["cover","private"]);
  keys.forEach(key => { const f = F[key], el = $("f-" + key.replace(".", "-")); if(!el) return;
    if(f.kind === "creators") set(draft, key, el.value.split("\n").map(l => l.trim()).filter(Boolean).map(l => { const m = l.match(/^(.*?),\s*([^,]+)$/); return m && /^(author|editor|translator|illustrator|artist|director|composer|performer|maker|photographer|contributor|introduction)$/i.test(m[2].trim()) ? {name:m[1].trim(), role:m[2].trim().toLowerCase()} : {name:l, role: draft.type==="physical" ? "artist" : draft.type==="object" ? "maker" : "author"}; }));
    else if(f.kind === "tags") set(draft, key, el.value.split(",").map(s => s.trim()).filter(Boolean));
    else if(f.kind === "check") set(draft, key, el.checked);
    else if(f.type === "number") set(draft, key, el.value ? +el.value : "");
    else set(draft, key, el.value.trim()); });
}
function renderForm(){
  const R = $("right"), t = TYPES[draft.type];
  R.innerHTML = `<h2>${draft.id ? "Revising an entry" : "A new entry"}</h2>
    <div class="scan"><input id="code" type="text" inputmode="numeric" placeholder="Scan or type an ISBN, barcode, or DOI" autocomplete="off" aria-label="Barcode, ISBN, or DOI"><button class="btn" id="cam-b" type="button" title="Read a barcode with the camera">Camera</button></div>
    <div class="status" id="st"></div>
    <div class="chips" id="ftypes">${Object.entries(TYPES).map(([k,x]) => `<button class="chip ${draft.type===k?"on":""}" data-t="${k}" type="button">${esc(x.label.toLowerCase())}</button>`).join("")}</div>
    <datalist id="fmt-list">${t.formats.map(x => `<option value="${esc(x)}">`).join("")}</datalist>
    <div class="form">${t.fields.map(fieldHTML).join("")}${fieldHTML("cover")}${fieldHTML("private")}</div>
    <div class="row"><button class="btn" id="find" type="button">Find details from the title and creator</button></div>
    <div class="cands" id="cands"></div>
    <h3>Pictures</h3><div class="imgs" id="imgs"></div>
    <div class="row"><label class="btn" style="display:inline-block">Add photographs<input id="pics" type="file" accept="image/*" multiple capture="environment" hidden></label><span class="note">They're shrunk to 1600 pixels and saved with the entry.</span></div>
    <div class="row" style="margin-top:16px"><button class="btn primary" id="save" type="button">Write it in the log</button>${draft.id ? `<a class="btn" href="#item/${encodeURIComponent(draft.id)}">Leave unchanged</a><button class="btn danger" id="del" type="button" style="margin-left:auto">Strike it out</button>` : ""}</div>`;
  $("code").focus();
  $("ftypes").onclick = e => { const b = e.target.closest("[data-t]"); if(!b) return; readForm(); draft.type = b.dataset.t; renderForm(); };
  $("code").onkeydown = e => { if(e.key === "Enter"){ e.preventDefault(); handleCode($("code").value); } };
  $("cam-b").onclick = () => camera(code => { $("code").value = code; handleCode(code); });
  $("find").onclick = async () => { readForm(); status("Looking…"); candidates = await searchFields(draft.type, draft.title, (draft.creators[0]||{}).name); showCands(); };
  $("pics").onchange = async e => { for(const f of e.target.files){ try { draftImages.push(await shrink(f)); } catch(err){ status("That picture couldn't be read.", "err"); } } showImgs(); e.target.value = ""; };
  $("save").onclick = save;
  if($("del")) $("del").onclick = remove;
  showImgs(); showCands();
}
function status(msg, cls){ const s = $("st"); if(s){ s.textContent = msg || ""; s.className = "status " + (cls||""); } }
async function handleCode(raw){
  const c = classify(raw); readForm();
  if(c.kind === "text"){ status("That isn't an ISBN, a barcode, or a DOI. Try the title instead."); return; }
  const dup = items.find(it => Object.values(it.ids||{}).some(v => digits(v) && digits(v) === digits(c.value)));
  if(dup) status(`Already in the log: “${dup.title}”. You can still write another copy.`);
  else status("Looking it up…");
  if(c.kind === "isbn"){ draft.type = draft.type === "book" || !draft.title ? "book" : draft.type; draft.ids.isbn = c.value; candidates = await lookupISBN(c.value); }
  else if(c.kind === "barcode"){ draft.ids.barcode = c.value; candidates = await lookupBarcode(c.value); if(candidates[0] && !draft.title) draft.type = candidates[0].type; }
  else if(c.kind === "doi"){ draft.ids.doi = c.value; draft.type = "paper"; candidates = await lookupDOI(c.value); }
  else if(c.kind === "url"){ draft.ids.url = c.value; candidates = []; }
  if(candidates.length === 1 && !draft.title){ apply(candidates[0]); candidates = []; renderForm(); status("Found it. Check the details, add photographs, and write it in the log.", "ok"); return; }
  renderForm(); status(candidates.length ? `${candidates.length} possible matches below; choose one, or fill it in yourself.` : dup ? `Already in the log: “${dup.title}”.` : "Nothing found. Fill it in by hand; the number is kept.", candidates.length ? "" : "err");
}
function apply(c){
  ["type","title","subtitle","creators","publisher","place","date","edition","pages","format","language","container","description","tags","cover"].forEach(k => { const v = c[k]; if(v != null && v !== "" && !(Array.isArray(v) && !v.length)) draft[k] = v; });
  draft.ids = Object.assign({}, draft.ids, Object.fromEntries(Object.entries(c.ids||{}).filter(([,v]) => v))); draft.source = c.source || "";
}
function showCands(){
  const el = $("cands"); if(!el) return;
  el.innerHTML = candidates.map((c,i) => `<div class="cand" data-i="${i}">${c.cover?`<img src="${esc(c.cover)}" alt="" onerror="this.remove()">`:""}<b>${esc(c.title)}</b><br>${esc(creatorLine(c))}<br><span class="note">${esc([yearOf(c.date), c.publisher, c.format, c.source].filter(Boolean).join(" · "))}</span></div>`).join("");
  el.onclick = e => { const d = e.target.closest("[data-i]"); if(!d) return; readForm(); apply(candidates[+d.dataset.i]); candidates = []; renderForm(); status("Filled in. Check it over.", "ok"); };
}
function showImgs(){
  const el = $("imgs"); if(!el) return;
  const old = (draft.images||[]).map((p,i) => ({src: pendingImg[p] || imgUrl(p), old:i})), fresh = draftImages.map((d,i) => ({src:d.url, fresh:i}));
  el.innerHTML = old.concat(fresh).map(x => `<figure><img src="${esc(x.src)}" alt=""><button type="button" ${x.old!=null?`data-old="${x.old}"`:`data-fresh="${x.fresh}"`} aria-label="Remove">×</button></figure>`).join("") || `<span class="note">None yet.</span>`;
  el.onclick = e => { const b = e.target.closest("button"); if(!b) return; if(b.dataset.old != null) draft.images.splice(+b.dataset.old, 1); else draftImages.splice(+b.dataset.fresh, 1); showImgs(); };
}
async function shrink(file){
  const bmp = await createImageBitmap(file), k = Math.min(1, 1600/Math.max(bmp.width, bmp.height)), cv = document.createElement("canvas");
  cv.width = Math.round(bmp.width*k); cv.height = Math.round(bmp.height*k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
  const url = cv.toDataURL("image/jpeg", .85); return {url, b64:url.split(",")[1]};
}
const slug = s => String(s||"").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g,"").trim().replace(/\s+/g,"-").slice(0,40) || "entry";
async function save(){
  readForm();
  if(!draft.title){ status("An entry needs at least a title.", "err"); return; }
  if(!canWrite){ status("Only the archivist can write in the log. Sign in first.", "err"); return; }
  const b = $("save"); b.disabled = true;
  try {
    const now = new Date().toISOString();
    if(!draft.id) draft.id = `${slug(draft.title)}-${Date.now().toString(36).slice(-5)}`;
    draft.added = draft.added || now; draft.updated = now;
    for(let i=0;i<draftImages.length;i++){ status(`Saving photograph ${i+1} of ${draftImages.length}…`);
      const name = `images/${draft.id}-${Date.now().toString(36)}${i}.jpg`; await putFile(`${cfg.path}/${name}`, draftImages[i].b64, `Log book: picture for “${draft.title}”`); pendingImg[name] = draftImages[i].url; draft.images = (draft.images||[]).concat([name]); }
    draftImages = [];
    status("Writing it in the log…");
    const entry = JSON.parse(JSON.stringify(draft)); Object.keys(entry).forEach(k => { if(entry[k] === "" || (Array.isArray(entry[k]) && !entry[k].length)) delete entry[k]; });
    await commitIndex(list => { const i = list.findIndex(x => x.id === entry.id); if(i >= 0) list[i] = entry; else list.unshift(entry); return list; }, `Log book: ${draft.added === now ? "add" : "revise"} “${entry.title}”`);
    status("Written. The public site shows it after GitHub rebuilds, in a minute or two.", "ok");
    location.hash = "item/" + encodeURIComponent(entry.id);
  } catch(e){ status("It didn't save: " + e.message, "err"); }
  finally { b.disabled = false; }
}
async function remove(){
  if(!confirm(`Strike “${draft.title}” out of the log? Its photographs are removed too.`)) return;
  try { status("Striking it out…"); const gone = draft;
    await commitIndex(list => list.filter(x => x.id !== gone.id), `Log book: strike out “${gone.title}”`);
    for(const p of gone.images||[]) { try { await deleteFile(`${cfg.path}/${p}`, `Log book: remove a picture of “${gone.title}”`); } catch(e) {} }
    location.hash = "search";
  } catch(e){ status("It couldn't be struck out: " + e.message, "err"); }
}

/* ---------- the camera, where the browser can read barcodes ---------- */
async function camera(done){
  if(!("BarcodeDetector" in window)){ status("This browser can't read barcodes from the camera (Chrome and Edge on Android, and Chrome on a Mac, can). A USB or Bluetooth scanner works everywhere: just scan.", "err"); return; }
  let stream; try { stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}}); } catch(e){ status("The camera wasn't allowed.", "err"); return; }
  const v = $("camv"), box = $("cam"); v.srcObject = stream; await v.play(); box.classList.add("on");
  const det = new BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e","code_128","code_39","qr_code"]});
  let live = true; const stop = () => { live = false; stream.getTracks().forEach(t => t.stop()); box.classList.remove("on"); };
  $("cam-x").onclick = stop;
  const tick = async () => { if(!live) return; try { const r = await det.detect(v); if(r[0]){ stop(); done(r[0].rawValue); return; } } catch(e) {} setTimeout(tick, 180); };
  tick();
}
// a barcode scanner types fast and ends with Enter; catch it anywhere on the page
let burst = "", lastKey = 0;
document.addEventListener("keydown", e => {
  const t = e.target, inField = t.closest && t.closest("input,textarea,select");
  const now = performance.now(), fast = now - lastKey < 45; lastKey = now;
  if(e.key === "Enter"){ const code = burst; burst = ""; if(code.length >= 8 && !inField){ e.preventDefault(); scanned(code); } return; }
  if(e.key.length === 1){ burst = fast || !burst ? burst + e.key : e.key; }
});
function scanned(code){
  if(canWrite){ location.hash = "add/" + encodeURIComponent(code); }
  else { query = code; location.hash = "search"; renderSearch(); }
}

/* ---------- the archivist ---------- */
function renderCurator(){
  const R = $("right");
  R.innerHTML = `<h2>The archivist</h2>
    <p>Anyone can read the log book. Writing in it takes a key: a GitHub access token that can change this site's repository. The token stays in this browser and is sent only to GitHub. Nothing on the public site can write without it.</p>
    ${canWrite ? `<p class="status ok">Signed in. This browser can write in the log.</p>` : token ? `<p class="status err" id="why">Checking the key…</p>` : ""}
    <h3>The key</h3>
    <div class="form">
      <label for="tok">Access token</label><input id="tok" type="password" autocomplete="off" placeholder="${token ? "a key is set; paste a new one to replace it" : "github_pat_…"}">
      <label for="keep">Keep it</label><select id="keep"><option value="session">until this tab closes</option><option value="local">on this device</option></select>
    </div>
    <div class="row"><button class="btn primary" id="signin" type="button">Sign in</button>${token ? `<button class="btn" id="signout" type="button">Sign out and forget the key</button>` : ""}</div>
    <div class="status" id="st"></div>
    <h3>Where the log is kept</h3>
    <div class="form">
      <label for="c-owner">Owner</label><input id="c-owner" type="text" value="${esc(cfg.owner)}">
      <label for="c-repo">Repository</label><input id="c-repo" type="text" value="${esc(cfg.repo)}">
      <label for="c-branch">Branch</label><input id="c-branch" type="text" value="${esc(cfg.branch)}">
      <label for="c-path">Folder</label><input id="c-path" type="text" value="${esc(cfg.path)}">
      <label for="c-pub">Public address</label><input id="c-pub" type="text" value="${esc(cfg.publicUrl)}">
    </div>
    <div class="row"><button class="btn" id="c-save" type="button">Keep these settings</button><button class="btn" id="exp" type="button">Download the whole log (JSON)</button><button class="btn" id="csv" type="button">… or as a spreadsheet (CSV)</button></div>
    <div class="lock"><b>Making a key.</b> On GitHub, go to Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
      Give it access to <i>only</i> the ${esc(cfg.repo)} repository, with <i>Contents: Read and write</i> and nothing else, and an expiry date. Copy it and paste it above.
      If a key is ever lost, delete it on GitHub and make another.<br><br>
      <b>Keep in mind:</b> the repository is public, so every entry is public too, even ones kept off the site. Don't log anything you'd mind a stranger reading.
      Each entry is a commit to the repository, so pull in GitHub Desktop before you push your own changes.</div>`;
  $("signin").onclick = async () => { const v = $("tok").value.trim(); if(v){ token = v; } if(!token){ status("Paste a key first.", "err"); return; }
    try { sessionStorage.removeItem("wending-token"); localStorage.removeItem("wending-token"); ($("keep").value === "local" ? localStorage : sessionStorage).setItem("wending-token", token); } catch(e) {}
    status("Checking the key…"); const r = await checkAccess();
    if(r === "ok"){ status("Signed in. Reading the log from the repository…", "ok"); try { await loadLive(); } catch(e) {} nav(); route(); } else status(r, "err"); };
  if($("signout")) $("signout").onclick = () => { token = null; canWrite = false; try { sessionStorage.removeItem("wending-token"); localStorage.removeItem("wending-token"); } catch(e) {} loadPublic().then(() => { nav(); route(); }); };
  $("c-save").onclick = () => { cfg.owner = $("c-owner").value.trim(); cfg.repo = $("c-repo").value.trim(); cfg.branch = $("c-branch").value.trim(); cfg.path = $("c-path").value.trim().replace(/^\/|\/$/g,""); cfg.publicUrl = $("c-pub").value.trim(); saveCfg(); status("Kept.", "ok"); };
  $("exp").onclick = () => download("wending-log.json", JSON.stringify({version:1, exported:new Date().toISOString(), items}, null, 1), "application/json");
  $("csv").onclick = () => { const cols = ["id","type","title","subtitle","creators","date","publisher","format","isbn","barcode","doi","url","tags","location","condition","notes"];
    const val = (it,c) => c==="creators" ? creatorLine(it) : c==="tags" ? (it.tags||[]).join("; ") : ["isbn","barcode","doi","url"].includes(c) ? (it.ids||{})[c]||"" : it[c]||"";
    download("wending-log.csv", [cols.join(",")].concat(items.map(it => cols.map(c => `"${String(val(it,c)).replace(/"/g,'""')}"`).join(","))).join("\n"), "text/csv"); };
  if(token && !canWrite) checkAccess().then(r => { const w = $("why"); if(w){ w.textContent = r === "ok" ? "Signed in." : r; w.className = "status " + (r === "ok" ? "ok" : "err"); } nav(); });
}
function download(name, text, type){ const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], {type})); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }

/* ---------- routing ---------- */
function nav(){ $("n-add").hidden = !canWrite; ["n-search","n-add","n-cur"].forEach(i => $(i).classList.remove("on")); }
function route(){
  const h = decodeURIComponent(location.hash.slice(1)), [view, ...rest] = h.split("/"), arg = rest.join("/");
  nav();
  if(view === "item"){ renderSearch(); renderItem(arg); $("n-search").classList.add("on"); return; }
  if(view === "add" || view === "edit"){
    if(!canWrite){ renderSearch(); $("right").innerHTML = `<p class="empty">Only the archivist can write in the log. <a href="#curator">Sign in</a>.</p>`; return; }
    if(view === "edit"){ const it = items.find(x => x.id === arg); draft = it ? JSON.parse(JSON.stringify(it)) : blank("book"); draft.ids = draft.ids||{}; draft.acquired = draft.acquired||{}; }
    else { draft = blank("book"); }
    draftImages = []; candidates = []; renderSearch(); renderForm(); $("n-add").classList.add("on");
    if(view === "add" && arg){ $("code").value = arg; handleCode(arg); }
    return; }
  if(view === "curator"){ renderSearch(); renderCurator(); $("n-cur").classList.add("on"); return; }
  renderSearch(); $("n-search").classList.add("on");
  if(!selected) $("right").innerHTML = `<h2>The log book</h2><p>Every book, record, paper, object, picture, and scrap in the house is entered here. Search on the left, or scan a barcode: a scanner works anywhere on this page.</p>
    <p class="note">${canWrite ? "You're signed in as the archivist: choose “Write an entry” above, or just scan." : "Only the archivist can write in it."}</p>`;
}
window.addEventListener("hashchange", route);

(async () => {
  if(token){ const r = await checkAccess(); if(r === "ok"){ try { await loadLive(); } catch(e){ await loadPublic(); } } else await loadPublic(); }
  else await loadPublic();
  route();
})();
})();
