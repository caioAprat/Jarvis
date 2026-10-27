const assert=require('node:assert/strict');
const {chromium}=require('/workspace/.jarvis-audit-tools/node_modules/playwright');
const base=process.env.JARVIS_TEST_URL||'http://127.0.0.1:8001';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  await page.goto(base+'/index.html?demo');await page.waitForFunction(()=>MV.depurar().ready);
  if(process.env.JARVIS_ROBUST_CASE!=='scroll'){
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.waitForFunction(()=>MV.depurar().reduced&&!MV.depurar().loop);
   assert.equal(await page.evaluate(()=>MV.depurar().loop),false);
   assert.equal(await page.locator('.viagem-texto[inert]').count(),0);
   await page.emulateMedia({reducedMotion:'no-preference'});
   await page.waitForFunction(()=>MV.depurar().loop);
  }
  await page.evaluate(()=>scrollTo(0,document.querySelector('.jornada').getBoundingClientRect().bottom+scrollY));
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>document.querySelector('.jornada').classList.contains('jornada-fora')),true);
  assert.equal(await page.locator('.viagem-final .viagem-texto').isVisible(),false);
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(1200);
  await page.evaluate(()=>document.querySelector('.cena-2d canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await page.mouse.wheel(0,650);await page.waitForTimeout(400);
  assert.ok(await page.evaluate(()=>scrollY>100),'Fallback deve liberar scroll nativo');
  assert.ok(await page.evaluate(()=>MV.depurar().resolution<=2));
  console.log('Robustez '+(process.env.JARVIS_ROBUST_CASE||'completa')+': cenários selecionados passaram.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack.split('\n').slice(0,5).join('\n'));process.exitCode=1});
