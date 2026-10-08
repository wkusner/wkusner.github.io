/* The Wending House: the Office's furniture, designed for the house — the balance rocker, its rocking footstool, and the staircase cabinet.
   Each opens a card with measured drawings and the essentials of how to make it. The full specification is in the project
   (claude/Wending-Furniture-Designs.md). Loaded before palace.js; reaches the house through FURNITURE.bind(). */
(function(){
"use strict";
const C = {};
const ink = "currentColor", thin = `stroke="${ink}" stroke-width="1" fill="none"`, dash = `stroke="${ink}" stroke-width=".8" stroke-dasharray="4 3" fill="none"`;
const dim = (x1, y1, x2, y2, label, off = 0, vertical = false) => { const lx = (x1 + x2)/2 + (vertical ? off : 0), ly = (y1 + y2)/2 + (vertical ? 0 : off);
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ink}" stroke-width=".7" marker-start="url(#fa)" marker-end="url(#fa)"/><text x="${lx}" y="${ly}" font-size="10" text-anchor="middle" fill="${ink}" ${vertical ? `transform="rotate(-90 ${lx} ${ly})"` : ""}>${label}</text>`; };
const defs = `<defs><marker id="fa" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,1 L8,4 L0,7" fill="${ink}"/></marker></defs>`;

// side elevation of the rocker, 1 px = 2.5 mm, floor at y = 300; z forward = right
function rockerSVG(){ const s = .27, X = z => 270 + z*s, Y = y => 330 - y*s, R = 600, A = .45, r = 100;
  const arc = (cz, cy, rad, a0, a1, n = 30) => Array.from({length: n + 1}, (_, i) => { const a = a0 + (a1 - a0)*i/n; return [X(cz + rad*Math.sin(a)), Y(cy - rad*Math.cos(a))]; });
  const pl = pts => pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const run = arc(0, R, R, -A, A), cf = arc((R - r)*Math.sin(A), R - (R - r)*Math.cos(A), r, A, A + 1, 10), cb = arc(-(R - r)*Math.sin(A), R - (R - r)*Math.cos(A), r, -A, -A - 1, 10);
  const post = [[200, 50], [270, 300], [300, 520], [240, 600], [50, 620], [-150, 600], [-250, 560]].map(([z, y]) => [X(z), Y(y)]);
  const rear = [[-205, 38], [-225, 300], [-250, 560]].map(([z, y]) => [X(z), Y(y)]), seat = [[300, 430], [180, 400], [50, 370], [-80, 380], [-180, 450], [-270, 600], [-340, 780], [-390, 950]].map(([z, y]) => [X(z), Y(y)]);
  return `<svg viewBox="0 0 560 390" style="width:100%;max-width:640px;color:var(--ink)" role="img" aria-label="Side elevation of the balance rocker">${defs}
    <line x1="10" y1="330" x2="550" y2="330" stroke="${ink}" stroke-width="1.2"/>${[...Array(26)].map((_, i) => `<line x1="${16 + i*21}" y1="330" x2="${8 + i*21}" y2="338" stroke="${ink}" stroke-width=".5"/>`).join("")}
    <circle cx="${X(0)}" cy="${Y(R)}" r="${R*s}" ${dash} opacity=".5"/>
    <path d="${pl(cb.slice().reverse())} ${pl(run).replace("M", "L")} ${pl(cf).replace("M", "L")}" stroke="${ink}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/>
    <path d="${pl(post)}" stroke="${ink}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/><path d="${pl(rear)}" stroke="${ink}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/>
    <path d="${pl(seat)}" stroke="#7a4326" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="7 2"/><circle cx="${X(-370)}" cy="${Y(990)}" r="${55*s}" fill="#7a4326"/>
    <circle cx="${X(0)}" cy="${Y(R)}" r="3" fill="${ink}"/><text x="${X(0) + 6}" y="${Y(R) - 6}" font-size="11" fill="${ink}" font-style="italic">C</text>
    <circle cx="${X(-10)}" cy="${Y(R - 40)}" r="3" fill="var(--spot,#8a2a1c)"/><text x="${X(-10) - 14}" y="${Y(R - 40) + 14}" font-size="11" fill="var(--spot,#8a2a1c)" font-style="italic">G</text>
    <line x1="${X(0)}" y1="${Y(R)}" x2="${X(0)}" y2="330" ${dash}/>
    <rect x="${X(-60)}" y="${Y(330)}" width="${120*s}" height="${35*s}" fill="#b39a62"/><line x1="${X(-110)}" y1="${Y(312)}" x2="${X(110)}" y2="${Y(312)}" stroke="#b39a62" stroke-width="1.5"/>
    ${dim(X(0) + 120, Y(R), X(0) + 120, 330, "R = 600", 10, true)}
    ${dim(X(-R*Math.sin(A)), 348, X(R*Math.sin(A)), 348, "runner chord 522", 12)}
    ${dim(500, Y(400), 500, 330, "seat 400", 10, true)}${dim(530, Y(1045), 530, 330, "1045", 10, true)}${dim(X(-450), 372, X(450), 372, "about 900 overall", 13)}
    <text x="14" y="22" font-size="11" fill="${ink}">The runners are one circle, centre C. The weight G sits a little below C; the brass block slides fore and aft under the seat.</text>
    <text x="14" y="38" font-size="11" fill="${ink}">Height of G as it rocks through θ: h(θ) = R − d cos θ, so the return torque is m g d sin θ. Small d, light hands.</text></svg>`; }

// front elevation of the staircase cabinet: cells 360 mm, columns 4-4-3-2-1
function cabinetSVG(){ const s = .28, cols = [4, 4, 3, 2, 1], Cm = 360, base = 100, X = x => 40 + x*s, Y = y => 470 - y*s;
  const plan = [["drawers","door:red","open","open"],["tambour","tambour","door:yellow","open"],["drawers","open","door:blue"],["door:red","open"],["drawers"]], col = {red:"#a8493c", yellow:"#c4a04a", blue:"#3f5f86"};
  let b = `<rect x="${X(30)}" y="${Y(base)}" width="${(5*Cm - 60)*s}" height="${base*s}" fill="#24221f"/>`;
  plan.forEach((cl, i) => cl.forEach((k, r) => { const x0 = X(i*Cm + 9), y0 = Y(base + (r + 1)*Cm - 9), w = (Cm - 18)*s, h = (Cm - 18)*s;
    if(k === "open") b += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="none" stroke="${ink}" stroke-width=".4"/>` + [...Array(6)].map((_, j) => `<rect x="${x0 + 6 + j*12}" y="${y0 + h - 20 - (j*7 % 13)}" width="9" height="${20 + (j*7 % 13)}" fill="${["#6b4a3a","#3e4a58","#55583e","#8a6a3a","#5a3a3a"][(i + r + j) % 5]}" opacity=".8"/>`).join("");
    else if(k.startsWith("door")) b += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${col[k.split(":")[1]]}"/><circle cx="${x0 + w - 12}" cy="${y0 + h/2}" r="4" fill="#1e1a16"/>`;
    else if(k === "drawers") b += `<rect x="${x0}" y="${y0}" width="${w}" height="${h/2 - 1}" fill="#5b3a24"/><rect x="${x0}" y="${y0 + h/2 + 1}" width="${w}" height="${h/2 - 1}" fill="#5b3a24"/>` + [y0 + 6, y0 + h/2 + 7].map(yy => `<path d="M${x0 + w/2 - 9},${yy} a9,6 0 0,0 18,0" fill="#2c1d12"/>`).join("");
    else if(k === "tambour") b += [...Array(13)].map((_, j) => `<rect x="${x0 + j*w/13}" y="${y0}" width="${w/13 - 1}" height="${h}" fill="#5b3a24"/>`).join(""); }));
  for(let i = 0; i <= 5; i++){ const hgt = Math.max(cols[i-1] || 0, cols[i] || 0)*Cm; b += `<rect x="${X(i*Cm) - 2.5}" y="${Y(base + hgt + 18)}" width="5" height="${(hgt + 18)*s}" fill="#7a5638"/>`; }
  for(let r = 0; r <= 4; r++){ const n = r === 0 ? 5 : cols.filter(c => c >= r).length; b += `<rect x="${X(0)}" y="${Y(base + r*Cm) - 2.5}" width="${n*Cm*s}" height="5" fill="#7a5638"/>`; }
  return `<svg viewBox="0 0 640 500" style="width:100%;max-width:640px;color:var(--ink)" role="img" aria-label="Front elevation of the staircase cabinet">${defs}${b}
    ${dim(X(0), 488, X(5*Cm), 488, "1800 (5 × 360)", 0)}${dim(X(5*Cm) + 30, Y(0), X(5*Cm) + 30, Y(base + 4*Cm), "1540", 12, true)}
    <text x="${X(2.6*Cm)}" y="${Y(base + 3.6*Cm)}" font-size="12" fill="${ink}" font-style="italic">cells by the partition 4 + 4 + 3 + 2 + 1</text>
    <g transform="translate(470,40)"><text x="0" y="0" font-size="11" fill="${ink}">the egg-crate joint</text>
      <rect x="0" y="10" width="120" height="14" fill="#7a5638"/><rect x="54" y="10" width="12" height="7" fill="var(--paper2,#f4ecd8)"/>
      <rect x="53" y="30" width="14" height="80" fill="#7a5638"/><rect x="53" y="30" width="14" height="40" fill="none" stroke="${ink}" stroke-dasharray="3 2"/>
      <text x="0" y="128" font-size="9.5" fill="${ink}">each board slotted halfway;</text><text x="0" y="140" font-size="9.5" fill="${ink}">slot = board + 0.2 mm</text></g></svg>`; }

function view(k){
  if(k === "cabinet"){ C.overlay("The staircase cabinet", `<div class="text"><p>An original design for the Wending House. It is made of five vertical and five horizontal boards that cross in half-depth slots, an egg-crate, with no screws or glue in the carcass. The cells are 360 mm squares, and the columns step down as a Young diagram: 4, 4, 3, 2, 1, so the cabinet climbs to a window sill or steps down under one. Any cell takes any front, by a pair of hidden brass pins: a door in linoleum, two drawers, a walnut tambour, glass, or nothing.</p></div>
      ${cabinetSVG()}
      <div class="text"><p><b>Materials.</b> The boards are 18 mm walnut-veneered birch plywood, CNC-cut. The edges are faced with 3 mm solid walnut and the stepped top is capped in solid walnut. The plinth is blackened mild-steel channel, set back 30 mm to make a toe-kick. Door fronts are Forbo furniture linoleum on 12 mm plywood, in a muted red, ochre, and blue, edged in walnut, each with a 28 mm finger hole. The drawers are walnut with a scooped finger pull, on wooden runners. The tambours are 13 walnut reeds on a canvas back, sliding in a routed track. Finish: hardwax oil.</p>
      <p><b>Why it is new.</b> An egg-crate in which every cell is interchangeable, with a profile that is a partition. Boards cut to the same scheme give any other partition, so the cabinet can be re-planned for another wall. Laid on its side, the same crate shows the conjugate partition: rows of 5, 4, 3, 2.</p>
      <p class="note">The full specification, with the cut list and the order of assembly, is in the project's furniture notes (Wending-Furniture-Designs). This is a design for the house, not a copy of any maker's product.</p></div>`);
    return; }
  C.overlay("The balance rocker", `<div class="text"><p>An original design for the Wending House. Its runners are arcs of a single circle, 600 mm in radius, whose centre C sits just above where a seated body and the chair carry their combined weight, G. Rocking on a circle lifts nothing but G's small offset from C, so the chair reclines at a touch and stays where it is left. A brass block slides fore and aft under the seat to set the angle it settles at. When the contact reaches the ends of the runner, curls of 100 mm radius stop it softly.</p></div>
    ${rockerSVG()}
    <div class="text"><p><b>The physics.</b> As the chair rolls without slipping through an angle θ, the circle's centre C stays at height R and travels level by Rθ. G, hanging a distance d below C, rises to h(θ) = R − d cos θ, so the chair always returns toward the angle where G hangs straight below C, with a torque m g d sin θ. With a 75 kg sitter, G is about 40 mm under C, which gives a gentle return. Sliding the 2.5 kg brass block 200 mm moves G sideways by about 5 mm, and the resting angle by atan(5/40), roughly 7°.</p>
    <p><b>Making it.</b> Each side is two bent laminations of black walnut, nine 3.2 mm plies glued over a two-part form: a hoop for the runner and its curls, and a sweep for the front post and arm. A gently curved rear post, sawn from solid walnut, joins the arm's end to the back of the runner. Every crossing is a bridle joint pinned with walnut dowels. Two turned walnut stretchers with wedged through-tenons and a brass tension rod tie the sides together. Laminated seat rails carry a channel-stitched cushion of vegetable-tanned leather (55 mm channels, wool and latex filling) on buckled straps, and a 110 mm leather bolster slides on its strap to suit your neck. Felt strips under the runners protect the floor.</p>
    <p><b>The footstool</b> rocks too, on arcs of a 900 mm circle. As you lean back, it tips about 4° to meet your legs, and felt stops at its ends hold it there.</p>
    <p class="note">${C.reclined ? "" : "Click the chair again to lean back. "}The full specification is in the project's furniture notes.</p></div>`);
}
window.FURNITURE = {bind: o => Object.defineProperties(C, Object.getOwnPropertyDescriptors(o)), view, rockerSVG, cabinetSVG};
})();
