'use strict';
// Gera apenas um pacote local estático. Não executa Git, deploy ou publicação.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),defaultOut=path.join(root,'.playwright-mcp/p7c/site');
function preparar(out=defaultOut){
 let html=fs.readFileSync(path.join(root,'pc.html'),'utf8');
 const replace=(a,b)=>{assert.equal(html.split(a).length,2,'Marcador mudou: '+a);html=html.replace(a,b);};
 replace('<title>Jarvão · Central</title>','<title>Jarvão Landing · v3</title>');
 replace('href="manifest-pc.webmanifest"','href="../manifest-v3.webmanifest"');
 replace('href="icons/jarvis.svg"','href="icons/jarvis-v3.svg"');
 replace('href="icons/apple-touch-icon.png"','href="icons/icon-v3-192.png"');
 replace("location.protocol === 'https:') navigator.serviceWorker.register('sw.js')","(location.protocol === 'https:' || ['localhost','127.0.0.1'].includes(location.hostname))) navigator.serviceWorker.register('sw-v3.js', { scope: './' })");
 replace('content="#0b0f17"','content="#080706"');
 assert.ok(!html.includes('JarvisPreviewLocal=true'),'Recusa HTML com bootstrap do simulador');
 const files=new Map([['v3/pc.html',Buffer.from(html)],['manifest-v3.webmanifest',fs.readFileSync(path.join(root,'manifest-v3.webmanifest'))]]);
 const scripts=[...html.matchAll(/<script src="([a-zA-Z0-9-]+\.js)(?:\?[^"<>]*)?"/g)].map(m=>m[1]);
 const assets=[...new Set([...scripts,'camera-estado.json','icons/jarvis-v3.svg','icons/icon-v3-192.png','icons/icon-v3-512.png'])];
 for(const file of assets)files.set('v3/'+file,fs.readFileSync(path.join(root,file)));
 files.set('index.html',Buffer.from('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Jarvão Landing</title><script>location.replace("v3/pc.html"+location.search+location.hash)</script><a href="v3/pc.html">Abrir Jarvão Landing</a></html>'));
 const hash=crypto.createHash('sha256');for(const [name,data] of files){hash.update(name);hash.update(data);}hash.update(fs.readFileSync(path.join(root,'sw-v3.js')));
 const version=hash.digest('hex').slice(0,16);
 const worker=fs.readFileSync(path.join(root,'sw-v3.js'),'utf8').replace('__BUILD_V3__',version).replace('/*__ARQUIVOS_V3__*/[]',JSON.stringify(['pc.html',...assets]));
 files.set('v3/sw-v3.js',Buffer.from(worker));
 // Recusa conteúdo alheio no destino, em vez de apagá-lo ou publicá-lo por engano.
 if(fs.existsSync(out))for(const entry of fs.readdirSync(out,{recursive:true,withFileTypes:true})){
  if(!entry.isFile())continue;
  const name=path.relative(out,path.join(entry.parentPath,entry.name)).split(path.sep).join('/');
  assert.ok(files.has(name),'Arquivo alheio no pacote: '+name);
 }
 for(const [name,data] of files){const target=path.join(out,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);}
 return {out,version,files:[...files.keys()]};
}
module.exports={preparar};
if(require.main===module)console.log(JSON.stringify(preparar(),null,2));
