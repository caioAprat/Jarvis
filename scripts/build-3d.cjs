const {buildSync}=require('esbuild');
require('node:child_process').execFileSync(process.execPath,['scripts/build-icons.cjs'],{stdio:'inherit'});
const fs=require('node:fs');
const dictionary=require('../scene-3d/design-tokens.json');
for(const name of ['manifest.webmanifest','manifest-pc.webmanifest']){const manifest=JSON.parse(fs.readFileSync(name,'utf8'));manifest.background_color=manifest.theme_color=dictionary.palette.background;fs.writeFileSync(name,JSON.stringify(manifest,null,2)+'\n');}
const css=Object.entries(dictionary.palette).map(([key,value])=>'--scene-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+value+';').concat(Object.entries(dictionary.status).map(([key,value])=>'--status-'+key+':'+value+';'));
fs.writeFileSync('design-tokens.css','/* Gerado de scene-3d/design-tokens.json. */\n:root{'+css.join('')+'}\n');
const licenses=['three-MIT.txt','lucide-ISC.txt','webgl-noise-MIT.txt','lenis-MIT.txt'].map(f=>fs.readFileSync('vendor/licenses/'+f,'utf8')).join('\n\n');
buildSync({entryPoints:['scene-3d/main.js'],bundle:true,minify:true,format:'iife',target:['es2020'],outfile:'cena-3d.js',loader:{'.svg':'text','.glsl':'text','.jpg':'dataurl'},legalComments:'eof',banner:{js:'/*!\n'+licenses+'\n*/'}});
console.log('Cena 3D compilada: cena-3d.js');
