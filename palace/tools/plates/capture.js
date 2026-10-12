// Capture a room's standing places for plates: its geometry and lights once, and the quick picture's white light for each view.
// node capture.js <hour> <day|night> <room>   (run from a work folder; writes <work>/<day|night>/scene.json and viewN.json)
const { chromium } = require('playwright'); const fs = require('fs');
const hour = +(process.argv[2]||13), tag = process.argv[3]||'day', room = process.argv[4]||'0', out = `${process.cwd()}/${tag}`;
const SITE = process.env.PALACE || require('path').resolve(__dirname, '../..');   // the palace folder, served as the site root
fs.mkdirSync(out, {recursive:true});
(async()=>{const srv=await require(process.env.SRV || './srv.js')(SITE, 8796);const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1400,height:900}});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.addInitScript(()=>{ window.__aspect=2; localStorage.setItem('palace-v1', JSON.stringify({inv:['primer'],reader:'T',links:{0:1,35:2},refine:false,quality:'draft',moves:'dissolve'})) });
await p.goto(`http://localhost:8796/?debug&hour=${hour}#${room}`);await p.waitForTimeout(5000);
for(let i=0;i<6;i++){ const cls=await p.evaluate(()=>{const e=document.elementFromPoint(500,250); return e? (e.closest('canvas')?'CANVAS':e.className):'none'}); if(cls==='CANVAS') break; await p.keyboard.press('Escape'); await p.waitForTimeout(1500);}
await p.mouse.move(5,5);
const dump = await p.evaluate(()=>__bakeDump()); fs.writeFileSync(`${out}/scene.json`, JSON.stringify(dump)); console.log('meshes', dump.meshes.length, 'lights', dump.lights.length, dump.lights.map(l=>l.type+':'+l.intensity.toFixed(2)).join(' '));
const W = await p.evaluate(()=>document.querySelector('canvas.view3d').getBoundingClientRect().width); const scale = W/640;
const seen = new Set(); let n = 0;
async function grab(){ await p.waitForTimeout(2500); const v = await p.evaluate(s=>__bakeWhite(s), scale); const k = v.pos.join(',')+'|'+v.yaw; if(seen.has(k)) return; seen.add(k);
  fs.writeFileSync(`${out}/view${n}.json`, JSON.stringify(v)); console.log('view', n, v.w, v.h, v.pos, v.yaw, v.pitch, 'node', v.node, 'ahead', v.ahead); await p.screenshot({path:`${out}/view${n}.png`}); n++; }
for(let f=0; f<4; f++){ await grab(); await p.keyboard.press('ArrowLeft'); }
for(let f=0; f<4; f++){ await p.keyboard.press('ArrowUp'); await grab(); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(1200); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(1200); }
await b.close(); srv.close();})();
