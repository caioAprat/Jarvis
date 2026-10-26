// Arte procedural original do Jarvão; nenhuma imagem de terceiros.
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/workspace/.jarvis-asset-tools/node_modules/sharp');
const {createNoise3D}=require('/workspace/.jarvis-asset-tools/node_modules/simplex-noise');
const {packAsync}=require('/workspace/.jarvis-asset-tools/node_modules/free-tex-packer-core');
const root=path.resolve(__dirname,'../..'),raw='/workspace/.jarvis-capture',out=path.join(root,'assets/scene');
const seedRandom=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
const noise=createNoise3D(seedRandom(7026));
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const planets=[['rochoso',[160,91,47]],['gasoso',[188,123,67]],['gelado',[111,168,143]],['vulcanico',[208,66,19]],['anel',[186,129,75]],['lua',[138,128,105]],['deserto',[197,144,78]],['gasoso-escuro',[117,67,49]],['cobre',[168,87,57]],['gelado-escuro',[81,126,114]],['lua-verde',[110,130,89]],['vulcanico-escuro',[155,75,41]]];
async function planet(name,rgb,index){
 const S=256,R=86,b=Buffer.alloc(S*S*4);const n=(x,y,z,f)=>noise(x*f+index*8,y*f,z*f);
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){
  const u=(x-S/2)/R,v=(y-S/2)/R,r2=u*u+v*v;if(r2>1)continue;const z=Math.sqrt(1-r2);
  const rough=n(u,v,z,3)*.5+n(u,v,z,8)*.22+n(u,v,z,22)*.12+n(u,v,z,55)*.05;
  let surface=.66+rough*.48;
  if(name.includes('gasoso')||name==='anel')surface=.64+.18*Math.sin(v*39+rough*5)+.1*Math.sin(v*93+rough*2);
  if(name.includes('gelado'))surface=.76+rough*.35+Math.pow(Math.abs(n(u,v,z,7)),5)*.25;
  if(name.includes('lua'))surface=.53+rough*.7;
  const lit=clamp(-u*.62-v*.35+z*.55);const light=.07+.93*Math.pow(lit,1.5);
  const rim=Math.pow(1-z,4)*clamp(-u*.7-v*.4+z*.4)*.7;
  const lava=name.includes('vulcanico')?Math.pow(clamp(1-Math.abs(n(u,v,z,8))/.12),3)*clamp(rough+.3)*2:0;
  const i=(y*S+x)*4;
  for(let c=0;c<3;c++)b[i+c]=Math.round(clamp(rgb[c]*surface*light+rgb[c]*rim+[255,92,10][c]*lava,0,255));
  b[i+3]=Math.round(255*clamp((1-Math.sqrt(r2))*R));
 }
 let image=sharp(b,{raw:{width:S,height:S,channels:4}});
 if(name==='anel'){
  const ring=Buffer.from(`<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(-24 128 128)" fill="none" stroke="#c18b52"><ellipse cx="128" cy="128" rx="122" ry="34" stroke-width="5" opacity=".65"/><ellipse cx="128" cy="128" rx="114" ry="30" stroke-width="2" opacity=".8"/></g></svg>`);
  image=sharp(ring).composite([{input:await image.png().toBuffer()}]);
 }
 return {path:name+'.png',contents:await image.png().toBuffer()};
}
function glow(kind){
 const rings=kind==='corona'?'<circle cx="256" cy="256" r="133" fill="none" stroke="#ffc77d" stroke-width="3" opacity=".6"/>':'';
 return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><defs><radialGradient id="g"><stop offset="0" stop-color="#fff9dd" stop-opacity="${kind==='corona'?.25:1}"/><stop offset=".23" stop-color="#ffdc91" stop-opacity=".9"/><stop offset=".4" stop-color="#ff9b36" stop-opacity=".45"/><stop offset=".65" stop-color="#e55313" stop-opacity=".12"/><stop offset="1" stop-color="#8c2608" stop-opacity="0"/></radialGradient></defs><circle cx="256" cy="256" r="254" fill="url(#g)"/>${rings}</svg>`);
}
async function pack(name,images,max=4096){
 const files=await packAsync(images,{textureName:name,width:max,height:max,powerOfTwo:true,padding:2,extrude:1,allowRotation:false,allowTrim:false,detectIdentical:false,removeFileExtension:true,exporter:'Pixi'});
 const pngs=files.filter(x=>x.name.endsWith('.png'));
 if(name==='nucleo'&&pngs.length>2)throw Error('Núcleo excedeu dois atlas');
 if(name==='universo'&&pngs.length!==1)throw Error('Universo deve caber em um atlas');
 for(const f of files){
  if(f.name.endsWith('.png')){
   const quantized=await sharp(f.buffer).png({compressionLevel:9,palette:name==='nucleo-0',colours:64,quality:72,dither:.2,effort:10}).toBuffer();
   fs.writeFileSync(path.join(out,f.name),quantized);
   await sharp(quantized).webp({lossless:true,effort:6}).toFile(path.join(out,f.name.replace('.png','.webp')));
  }else if(f.name.endsWith('.json')){
   const j=JSON.parse(f.buffer);j.animations={};
   for(const prefix of ['rede','gema']){const frames=Object.keys(j.frames).filter(k=>k.startsWith(prefix+'-')).sort();if(frames.length)j.animations[prefix]=frames;}
   j.meta.image=j.meta.image.replace('.png','.webp');
   fs.writeFileSync(path.join(out,f.name),JSON.stringify(j));
   const fallback=structuredClone(j);fallback.meta.image=fallback.meta.image.replace('.webp','.png');
   fs.writeFileSync(path.join(out,f.name.replace('.json','-png.json')),JSON.stringify(fallback));
  }
 }
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 for(const f of fs.readdirSync(out))if(/^(nucleo|gemas|universo)(-\d+)?(-png)?\.(png|webp|json)$/.test(f))fs.unlinkSync(path.join(out,f));
 async function rede(f){const {data,info}=await sharp(path.join(raw,f)).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let i=0;i<data.length;i+=4){data[i+3]=Math.round(data[i+3]*Math.max(data[i],data[i+1],data[i+2])/255/17)*17;data[i]=data[i+1]=data[i+2]=255;}return sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer();}
 const core=await Promise.all(fs.readdirSync(raw).filter(x=>/^rede-|^(nucleo|aneis)\.png$/.test(x)).sort().map(async f=>({path:f,contents:f.startsWith('rede-')?await rede(f):fs.readFileSync(path.join(raw,f))})));
 core.push({path:'glow.png',contents:await sharp(glow('glow')).png().toBuffer()},{path:'corona.png',contents:await sharp(glow('corona')).png().toBuffer()});
 await pack('nucleo-0',core.filter(f=>f.path.startsWith('rede-'))); await pack('nucleo-1',core.filter(f=>!f.path.startsWith('rede-')),2048);console.log('Atlas do núcleo prontos');
 const gems=fs.readdirSync(raw).filter(x=>/^gema-/.test(x)).sort().map(f=>({path:f,contents:fs.readFileSync(path.join(raw,f))}));
 await pack('gemas',gems,1024);
 const backgrounds=[];for(let i=0;i<planets.length;i++)backgrounds.push(await planet(...planets[i],i));
 for(let i=0;i<3;i++){
  const S=256,b=Buffer.alloc(S*S*4);
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
   const u=(x-128)/128,v=(y-128)/128;const falloff=Math.pow(clamp(1-u*u-v*v),2);
   const cloud=clamp(.42+noise(u*3,v*3,i*7)*.35+noise(u*8,v*8,i*7)*.12);
   const k=(y*S+x)*4;const rgb=i===2?[79,145,119]:[186,81+i*18,30];rgb.forEach((c,j)=>b[k+j]=c);b[k+3]=Math.round(130*falloff*cloud);
  }
  backgrounds.push({path:`nebulosa-${i}.png`,contents:await sharp(b,{raw:{width:S,height:S,channels:4}}).png().toBuffer()});
 }
 backgrounds.push({path:'poeira.png',contents:await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><defs><radialGradient id="g"><stop stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs><circle cx="8" cy="8" r="8" fill="url(#g)"/></svg>')).png().toBuffer()});
 await pack('universo',backgrounds,2048);
 // Prancha de avaliação, independente do aplicativo.
 const tiles=[];for(let i=0;i<backgrounds.length&&i<12;i++)tiles.push({input:backgrounds[i].contents,left:(i%4)*256,top:Math.floor(i/4)*256});
 await sharp({create:{width:1024,height:768,channels:4,background:'#080706'}}).composite(tiles).png().toFile(path.join(root,'docs/migracao-2d/amostras/planetas.png'));
 await sharp(path.join(raw,'composicao.png')).webp({quality:82}).toFile(path.join(out,'fallback-nucleo.webp'));
 const entries=fs.readdirSync(out).filter(f=>/\.(webp|png)$/.test(f)).map(file=>({file,bytes:fs.statSync(path.join(out,file)).size}));
 const total=entries.reduce((n,f)=>n+f.bytes,0);fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({generatedBy:'scripts/migracao-2d/gerar-assets.cjs',seed:7026,networkFrames:96,gemFrames:64,backgroundPlanets:planets.map(p=>p[0]),files:entries,totalBytes:total,budgetBytes:6000000},null,2));
 console.log(JSON.stringify({totalBytes:total,budgetBytes:6000000,entries},null,2));
 if(total>6000000)throw Error('Orçamento de 6 MB excedido; otimizar antes de concluir');
})().catch(e=>{console.error(e);process.exitCode=1});
