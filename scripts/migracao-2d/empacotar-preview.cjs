// Exportação portátil para revisão: abre por duplo clique, sem instalar servidor.
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8'),data=f=>'data:image/webp;base64,'+fs.readFileSync(path.join(root,f)).toString('base64');
let html=read('pc.html');
html=html.replace(/<link rel="(?:manifest|apple-touch-icon|icon)"[^>]*>/g,'');
html=html.replace(/<link rel="stylesheet" href="((?:vendor\/)?(?:cena-2d|lenis)\.css)">/g,(_,p)=>'<style>'+read(p)+'</style>');
const sheets={};for(const name of ['nucleo-0','nucleo-1','universo'])sheets[name]={json:JSON.parse(read('assets/scene/'+name+'.json')),image:data('assets/scene/'+name+'.webp')};
const patch=`const jarvisFolhas=${JSON.stringify(sheets)};const jarvisLoad=PIXI.Assets.load.bind(PIXI.Assets);const jarvisPromises={};PIXI.Assets.load=function(url,...args){const m=typeof url==='string'&&url.match(/assets\\/scene\\/(nucleo-[01]|gemas|universo)(?:-png)?\\.json/);if(!m)return jarvisLoad(url,...args);const n=m[1];return jarvisPromises[n] ||= (async()=>{const texture=await jarvisLoad(jarvisFolhas[n].image);const sheet=new PIXI.Spritesheet(texture,jarvisFolhas[n].json);await sheet.parse();return sheet;})();};`;
html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,file)=>{
 let source=read(file);
 if(file==='vendor/pixi.min.js')source+='\n;'+patch;
 if(file==='cena-2d.js')source=source.replace('assets/scene/fallback-nucleo.webp',data('assets/scene/fallback-nucleo.webp'));
 if(file==='demo.js')source=source.replace("new URLSearchParams(location.search).has('demo')",'true').replace("fetch('assets/demo.json').then(r=>r.json())",'Promise.resolve('+read('assets/demo.json')+')').replace("tag.href='demo.html'","tag.href='#'");
 return '<script>'+source.replace(/<\/script/gi,'<\\/script')+'</script>';
});
fs.mkdirSync(path.join(root,'preview'),{recursive:true});fs.writeFileSync(path.join(root,'preview/Jarvao-2D.html'),html);
fs.writeFileSync(path.join(root,'preview/index.html'),html);
console.log('Preview portátil:',Buffer.byteLength(html),'bytes');
