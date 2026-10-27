// Não há bundler, lint ou TypeScript configurado. Valida sintaxe das fontes próprias.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const scripts=['cena-2d.js','mapa-2d.js','jornada.js','demo.js','sw.js'];
let count=0;
for(const file of scripts){new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});count++;}
for(const file of ['pc.html','index.html']){
 const html=fs.readFileSync(file,'utf8');
 for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)){new vm.Script(match[1],{filename:file});count++;}
 assert.ok(!/three\.min|mapa-vivo\.js|react-three|gltf|glsl/.test(html),file+' ainda carrega motor anterior');
 for(const match of html.matchAll(/<script src="([^"?]+)(?:\?[^\"]*)?"><\/script>/g))if(!/^https?:/.test(match[1]))assert.ok(fs.existsSync(match[1]),'Script ausente: '+match[1]);
}
console.log(count+' fontes próprias com sintaxe válida; scripts locais presentes; páginas sem carregamento 3D.');
