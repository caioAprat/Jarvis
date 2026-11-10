'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {abrirChrome,vigiarFoco,exigirFoco,esperarAcesso}=require('./ambiente-browser.cjs');
const {preparar}=require('../scripts/preparar-v3.cjs');
const {ambiente}=require('./simulador');
const root=path.resolve(__dirname,'..');
const protectedFiles=['pc.html','manifest-pc.webmanifest','sw.js','icons/jarvis.svg','icons/icon-192.png','icons/icon-512.png'];
const hashes=()=>Object.fromEntries(protectedFiles.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]));
const before=hashes(),mainBefore=execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim();
const testOut=fs.mkdtempSync(path.join(root,'.playwright-mcp/p7c/teste-site-'));
const pkg=preparar(testOut);assert.equal(pkg.out,testOut,'Teste deve usar pacote isolado');assert.deepEqual(hashes(),before,'Build alterou arquivo legado');
const manifest=JSON.parse(fs.readFileSync(path.join(pkg.out,'manifest-v3.webmanifest'),'utf8'));
const old=JSON.parse(fs.readFileSync(path.join(root,'manifest-pc.webmanifest'),'utf8'));
for(const key of ['name','id','start_url','scope'])assert.notEqual(manifest[key],old[key],key+' deve ser proprio');
assert.equal(manifest.name,'Jarvão Landing');assert.equal(manifest.short_name,'Jarvão v3');
assert.ok(pkg.files.every(p=>!/(?:apps-script|\.env|Segredos|testes|\.git\/|manifest-pc|(?:^|\/)sw\.js)/i.test(p)),'Arquivo privado/legado no pacote');
const sim=ambiente({agora:new Date().toISOString()});sim.run('verificar()');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/blank.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Fixture isolada</title><link rel="icon" href="data:,">');return;}
 if(url.pathname==='/__fixture_api'){
  assert.equal(url.searchParams.get('k'),'fixture-p7c');res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify(sim.get({...Object.fromEntries(url.searchParams),k:sim.props.CHAVE_PC})));return;
 }
 const file=url.pathname.slice(1)||'index.html';
 if(!pkg.files.includes(file)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(path.join(pkg.out,file)));
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const legacy=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Main fixture</title>');});
 await new Promise(resolve=>legacy.listen(0,'127.0.0.1',resolve));
 const profile=fs.mkdtempSync(path.join(root,'.playwright-mcp/p7c/perfil-'));
 let context;
 try{
  context=await abrirChrome({profile,viewport:{width:1366,height:768}});
  const legacyPage=await context.newPage();await legacyPage.goto('http://127.0.0.1:'+legacy.address().port);await legacyPage.evaluate(()=>localStorage.setItem('jarvis.pc.cfg','sentinela-main'));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)console.error('HTTP',r.status(),new URL(r.url()).pathname);});
  await vigiarFoco(page);
  await page.goto(base+'/blank.html');await page.evaluate(async()=>{await caches.open('sentinela-main');});
  await page.goto(base+'/v3/pc.html');await page.bringToFront();await exigirFoco(page);await page.waitForFunction(()=>window.NARR);
  await page.waitForFunction(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('/v3/sw-v3.js'),null,{timeout:30000});
  assert.ok(await page.evaluate(()=>caches.has('sentinela-main')),'Worker apagou cache alheio');
  const cdp=await context.newCDPSession(page);const appManifest=await cdp.send('Page.getAppManifest');assert.deepEqual(appManifest.errors,[]);
  const install=await cdp.send('Page.getInstallabilityErrors');assert.deepEqual(install.installabilityErrors,[],'Chrome nao considera instalavel');
  await page.evaluate(()=>NARR.irAoAcesso());await page.locator('#cenaLink').waitFor({state:'visible'});
  await esperarAcesso(page,'cenaLink');
  const readiness=await page.evaluate(()=>({scene:NARR.cenaEm(NARR.progresso()),opacity:getComputedStyle(document.querySelector('#cenaLink').closest('.narr-cena')).opacity}));
  assert.equal(readiness.scene,'acesso','BUG P8s: locator visible permite digitar antes da chegada ao acesso: '+JSON.stringify(readiness));
  await page.locator('#cenaLink').fill('https://central.example/pc.html#u='+encodeURIComponent(base+'/__fixture_api')+'&k=fixture-p7c');await page.locator('#cenaLink').press('Enter');
  await page.waitForFunction(()=>document.querySelector('#cenaPin'));
  await page.reload();await page.waitForFunction(()=>window.NARR);await page.evaluate(()=>NARR.irAoAcesso());
  await esperarAcesso(page);
  await page.waitForFunction(()=>document.activeElement?.id==='cenaPin');assert.equal(await page.locator('#cenaLink').count(),0,'Pediu link novamente');
  await page.keyboard.type('12345678',{delay:35});await page.waitForFunction(()=>NARR.emB());
  assert.equal(await legacyPage.evaluate(()=>localStorage.getItem('jarvis.pc.cfg')),'sentinela-main','Configuracao legada alterada');
  const cacheUrls=await page.evaluate(async()=>{const keys=await caches.keys(),urls=[];for(const k of keys.filter(k=>k.startsWith('jarvao-v3-casca-')))for(const r of await(await caches.open(k)).keys())urls.push(r.url);return urls;});
  assert.ok(cacheUrls.length>=25);assert.ok(cacheUrls.every(u=>!u.includes('__fixture_api')&&!u.includes('fixture-p7c')&&!u.includes('?k=')),'API/chave no cache');
  const icons=await page.evaluate(async icons=>Promise.all(icons.filter(i=>i.type==='image/png').map(i=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve({width:img.naturalWidth,height:img.naturalHeight});img.onerror=reject;img.src=new URL(i.src,location.origin+'/manifest-v3.webmanifest').href;}))),manifest.icons);
  assert.deepEqual(icons,[{width:192,height:192},{width:512,height:512}]);
  await exigirFoco(page);assert.deepEqual(errors,[]);assert.deepEqual(hashes(),before);assert.equal(execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim(),mainBefore);
  const result={version:pkg.version,manifest:manifest.name,id:manifest.id,scope:manifest.scope,installabilityErrors:install.installabilityErrors,worker:'/v3/sw-v3.js',foreignCachePreserved:true,legacyStoragePreserved:true,firstLinkThenPin:true,staticFiles:pkg.files.length,cachedResources:cacheUrls.length,protectedFilesUnchanged:true,icons};
  fs.writeFileSync(path.join(root,'.playwright-mcp/p7c/validacao.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 }finally{if(context)await context.close();await new Promise(r=>legacy.close(r));await new Promise(r=>server.close(r));}
})().catch(e=>{server.close();console.error(e);process.exitCode=1;});
