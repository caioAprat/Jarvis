'use strict';
// Executa a política real com relógio controlado, sem exigir GPU ou simular gosto.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(require.resolve('../mapa-vivo.js'),'utf8');
const block=src.slice(src.indexOf('      // se a máquina não dá conta'),src.indexOf('      const vel =',src.indexOf('      // se a máquina não dá conta')));
function fixture(){
 const original={setPixelRatio(){},setSize(){}},flow={geometry:{attributes:{position:{count:100}},setDrawRange(a,b){this.count=b;}}};
 const s={reduzido:false,quadros:0,lentos:0,nivel:0,limite30:false,baixo:false,dt:.05,agora:0,aquecimentoQualidade:0,estaveis:0,comp:original,compOriginal:original,diagAtivo:false,pixelRatioOriginal:1.25,pix:{value:1.25},renderer:{setPixelRatio(v){this.ratio=v;},setSize(){}},w:1366,h:768,fluxoObjs:[flow],document:{hidden:false,hasFocus:()=>true}};
 vm.createContext(s);return {s,run(ms,dt=.05){for(let t=0;t<ms;t+=dt*1000){s.agora+=dt*1000;s.dt=dt;vm.runInContext(block.split('      // Medir antes')[0],s);}}};
}
let f=fixture();f.run(7900);assert.equal(f.s.nivel,0,'P9: carga inicial não pode rebaixar qualidade nos primeiros 8 s');
f.run(2200);assert.ok(f.s.nivel>0,'Carga sustentada após aquecimento deve reduzir qualidade');
f.run(45000,1/60);assert.equal(f.s.nivel,0,'P9: estabilidade recupera qualidade cheia');assert.equal(f.s.comp,f.s.compOriginal,'Bloom deve voltar');assert.equal(f.s.pix.value,1.25);assert.equal(f.s.fluxoObjs[0].geometry.count,100);
f=fixture();f.s.document.hidden=true;f.run(20000);assert.equal(f.s.nivel,0,'Aba oculta não conta');
f=fixture();f.s.document.hasFocus=()=>false;f.run(20000);assert.equal(f.s.nivel,0,'Janela sem foco não conta');
console.log('P9: aquecimento, degradação sustentada, recuperação, bloom/DPR/partículas e foco OK');
