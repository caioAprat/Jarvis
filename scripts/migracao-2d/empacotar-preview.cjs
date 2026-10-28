// Exporta a cena 3D já compilada: npm run build só é necessário ao editar módulos.
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let html=read('pc.html');
html=html.replace(/<link rel="(?:manifest|apple-touch-icon|icon)"[^>]*>/g,'');
html=html.replace(/<link rel="stylesheet" href="([^":]+\.css)">/g,(_,p)=>'<style>'+read(p)+'</style>');
html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,file)=>{
 let source=read(file);
 if(file==='demo.js')source=source.replace("new URLSearchParams(location.search).has('demo')",'true').replace("fetch('assets/demo.json').then(r=>r.json())",'Promise.resolve('+read('assets/demo.json')+')').replace("tag.href='demo.html'","tag.href='#'");
 return '<script>'+source.replace(/<\/script/gi,'<\\/script')+'</script>';
});
fs.mkdirSync(path.join(root,'preview'),{recursive:true});
for(const file of ['index.html','Jarvao-3D.html'])fs.writeFileSync(path.join(root,'preview',file),html);
console.log('Prévia 3D pronta para Netlify: preview/index.html ('+Buffer.byteLength(html)+' bytes)');
