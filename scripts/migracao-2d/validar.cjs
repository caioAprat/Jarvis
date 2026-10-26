const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require('/workspace/.jarvis-asset-tools/node_modules/sharp');
const dir=path.resolve(__dirname,'../../assets/scene');
(async()=>{let frames={},pages=0,total=0;
for(const f of fs.readdirSync(dir)){
 if(/\.(webp|png)$/.test(f))total+=fs.statSync(path.join(dir,f)).size;
 if(!/^(nucleo(?:-\d+)?|gemas|universo)\.json$/.test(f))continue;
 const j=JSON.parse(fs.readFileSync(path.join(dir,f)));const m=await sharp(path.join(dir,j.meta.image)).metadata();assert(m.hasAlpha);assert.equal(m.width,j.meta.size.w);assert.equal(m.height,j.meta.size.h);if(f.startsWith('nucleo'))pages++;
 for(const [n,v]of Object.entries(j.frames)){assert(!frames[n]);frames[n]=v;assert(v.frame.x>=0&&v.frame.y>=0&&v.frame.x+v.frame.w<=m.width&&v.frame.y+v.frame.h<=m.height);}
 const a=await sharp(path.join(dir,j.meta.image)).raw().toBuffer(),b=await sharp(path.join(dir,j.meta.image.replace('.webp','.png'))).raw().toBuffer();assert.equal(a.length,b.length);for(let k=0;k<a.length;k+=4){assert.equal(a[k+3],b[k+3]);if(a[k+3])for(let c=0;c<3;c++)assert.equal(a[k+c],b[k+c]);}
}
assert(total<=6000000);assert(pages<=2);assert.equal(Object.keys(frames).filter(x=>x.startsWith('rede-')).length,96);assert.equal(Object.keys(frames).filter(x=>x.startsWith('gema-')).length,64);
console.log(JSON.stringify({frames:Object.keys(frames).length,corePages:pages,totalBytes:total,budgetBytes:6000000,pngWebpIdentical:true}));})().catch(e=>{console.error(e);process.exitCode=1});
