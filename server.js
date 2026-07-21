const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
http.createServer((req,res)=>{
  const clean = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(root, clean === '/' ? 'index.html' : clean.replace(/^\//,''));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file,(err,stat)=>{
    if(!err && stat.isDirectory()) file=path.join(file,'index.html');
    fs.readFile(file,(e,data)=>{
      if(e){ res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
      res.end(data);
    });
  });
}).listen(port,()=>console.log(`MAB Kargo Atlas Operations running at http://localhost:${port}`));
