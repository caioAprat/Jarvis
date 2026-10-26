// Prancha estática de direção de arte, não é a interface final.
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/workspace/.jarvis-asset-tools/node_modules/sharp');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'assets/scene'),frames={};
for(const file of fs.readdirSync(dir).filter(f=>/^(nucleo(?:-\d+)?|gemas|universo)\.json$/.test(f)).map(f=>f.replace('.json',''))){
 const j=JSON.parse(fs.readFileSync(path.join(dir,file+'.json')));for(const [key,value]of Object.entries(j.frames))frames[key]={...value,image:path.join(dir,j.meta.image)};
}
async function sprite(name,size,tint){const f=frames[name];let s=sharp(f.image).extract({left:f.frame.x,top:f.frame.y,width:f.frame.w,height:f.frame.h});if(tint)s=s.tint(tint);return s.resize(size,size).png().toBuffer();}
(async()=>{
 const W=1440,H=960,items=[];
 const place=async(name,x,y,size,tint,blend='over')=>items.push({input:await sprite(name,size,tint),left:Math.round(x-size/2),top:Math.round(y-size/2),blend});
 for(const [n,x,y,size]of [['gasoso',160,180,280],['gelado',1260,180,190],['vulcanico',1200,780,250],['anel',300,800,260],['lua',1020,95,100]])await place(n,x,y,size);
 for(const [x,y,s]of [[440,350,480],[1000,430,450]])await place('nebulosa-0',x,y,s,undefined,'screen');
 let stars='';let seed=25;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<950;i++){const x=rnd()*W,y=rnd()*H,r=.3+rnd();stars+=`<circle cx="${x}" cy="${y}" r="${r}" fill="#e5b576" opacity="${.12+rnd()*.6}"/>`;}
 const names=['GABINETE CHAMADOS','PLANILHA J HISSNAUER','ASSISTENTE FINANCEIRO','PAINEL MEU DINHEIRO','PEDALADA DO DELEI','BOT DE ATRASOS','CAÇADOR DE CLIENTES'];
 const points=names.map((name,i)=>{const a=-Math.PI/2+i/7*Math.PI*2;return {name,x:720+Math.cos(a)*470,y:500+Math.sin(a)*300,status:i===5?'AGUARDANDO':i===6?'PAUSADO':'NO AR',colour:i===5?'#ffc247':i===6?'#897b6b':'#7bf0b4'};});
 let wires='';for(const p of points)wires+=`<path d="M720 500 Q${(720+p.x)/2-80} ${(500+p.y)/2-85} ${p.x} ${p.y}" stroke="${p.colour}" stroke-width="1" opacity=".45" fill="none" ${p.status==='AGUARDANDO'?'stroke-dasharray="4 8"':''}/>`;
 items.push({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${stars}${wires}</svg>`),left:0,top:0});
 await place('corona',720,500,740,undefined,'screen');
 await place('aneis',720,500,700,'#d09b59','screen');
 await place('rede-020',720,500,440,'#e9a354','screen');
 await place('nucleo',720,500,230,undefined,'screen');
 await place('glow',720,500,360,undefined,'screen');
 let labels='';for(let i=0;i<points.length;i++){
  const p=points[i];await place('glow',p.x,p.y,100,p.colour,'screen');await place('gema-'+String(i*8).padStart(3,'0'),p.x,p.y,62,p.colour,'screen');
  const left=p.x<720;labels+=`<text x="${p.x+(left?-36:36)}" y="${p.y-3}" text-anchor="${left?'end':'start'}" fill="#eee3d3" font-size="12">${p.name}</text><text x="${p.x+(left?-36:36)}" y="${p.y+17}" text-anchor="${left?'end':'start'}" fill="${p.colour}" font-size="10" letter-spacing="2">${p.status}</text>`;
 }
 labels+=`<text x="65" y="70" fill="#ffd3a0" font-size="36" letter-spacing="9">JARVÃO</text><text x="65" y="100" fill="#ad9376" font-size="11" letter-spacing="4">NÚCLEO DE CONTROLE</text><text x="1375" y="70" text-anchor="end" fill="#ad9376" font-size="12">FASE 1 · ESTUDO DOS SPRITES</text><text x="720" y="890" text-anchor="middle" fill="#e9a354" font-size="12" letter-spacing="3">ARTE EM CAMADAS · DADOS FICTÍCIOS · COMPOSIÇÃO ESTÁTICA</text>`;
 items.push({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="monospace">${labels}</svg>`),left:0,top:0});
 await sharp({create:{width:W,height:H,channels:4,background:'#080706'}}).composite(items).png().toFile(path.join(root,'docs/migracao-2d/amostras/composicao-2d.png'));
})().catch(e=>{console.error(e);process.exitCode=1});
