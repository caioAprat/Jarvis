'use strict';
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const grupos=require('./grupos.cjs');
const selection=process.argv.slice(2);
if(selection.some(a=>!['--logica','--desempenho'].includes(a)))throw Error('Use --logica ou --desempenho; sem opcao executa ambos.');
let failed=false;
for(const [group,files] of Object.entries(grupos)){
 if(selection.length&&!selection.includes('--'+group))continue;
 console.log('\n'+group.toUpperCase()+ (group==='logica'?' - headless, sem janela':' - PC quieto; mantenha a janela Chrome em foco. Perda de foco REPROVA.'));
 for(const file of files){
  console.log('\nExecutando',file);
  const r=spawnSync(process.execPath,[path.join(__dirname,file)],{stdio:'inherit',env:process.env,windowsHide:true});
  if(r.status!==0)failed=true;
 }
}
process.exitCode=failed?1:0;
