const {buildSync}=require('esbuild');
const fs=require('node:fs');
const licenses=['three-MIT.txt','lucide-ISC.txt','webgl-noise-MIT.txt'].map(f=>fs.readFileSync('vendor/licenses/'+f,'utf8')).join('\n\n');
buildSync({entryPoints:['scene-3d/main.js'],bundle:true,minify:true,format:'iife',target:['es2020'],outfile:'cena-3d.js',loader:{'.svg':'text'},legalComments:'eof',banner:{js:'/*!\n'+licenses+'\n*/'}});
console.log('Cena 3D compilada: cena-3d.js');
