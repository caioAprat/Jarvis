import {build} from 'esbuild';
const stub={name:'stub',setup(b){b.onResolve({filter:/(WebGPURenderer|CanvasRenderer)\.mjs$/},a=>({path:a.path,namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'export const WebGPURenderer=undefined;export const CanvasRenderer=undefined;',loader:'js'}));}};
await build({entryPoints:['entrada.js'],bundle:true,minify:true,format:'iife',target:'es2020',outfile:'pixi.enxuto.js',legalComments:'none',plugins:[stub]});
