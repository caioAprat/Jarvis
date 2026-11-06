'use strict';
const {spawnSync}=require('node:child_process');
const path=require('node:path');
let failed=false;
for(const file of ['testes.js','qualidade-p9.cjs','ambiente-browser-teste.cjs','ignicao-browser.cjs','regressao-browser.cjs','ciclo-vida-browser.cjs','atalhos-browser.cjs','pwa-v3-browser.cjs']){
 console.log('\nExecutando',file);
 const r=spawnSync(process.execPath,[path.join(__dirname,file)],{stdio:'inherit',env:process.env});
 if(r.status!==0)failed=true;
}
process.exitCode=failed?1:0;
