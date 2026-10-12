// a tiny static server, started inside each test so it can't die between runs
const http=require('http'),fs=require('fs'),path=require('path');
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
module.exports=(root,port)=>new Promise(res=>{const s=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream'});r.end(d);});});s.listen(port,()=>res(s));});
