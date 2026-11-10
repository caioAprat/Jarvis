'use strict';
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const {spawn,spawnSync} = require('node:child_process');
function carregarPlaywright() {
  const candidates = process.env.PLAYWRIGHT_MODULE
    ? [process.env.PLAYWRIGHT_MODULE]
    : ['playwright', path.join(os.tmpdir(), 'jarvao-playwright/node_modules/playwright')];
  for (const candidate of candidates) {
    let resolved;
    try { resolved = require.resolve(candidate); }
    catch (error) { if (error.code === 'MODULE_NOT_FOUND') continue; throw error; }
    return require(resolved);
  }
  throw Error('Playwright ausente. Execute npm install --prefix "' + path.join(os.tmpdir(), 'jarvao-playwright') + '" playwright. Veja testes/README.md; PLAYWRIGHT_MODULE permite outra pasta.');
}
const paginasHeadless = new WeakSet();
function headlessPadrao(options = {}) { return options.headless !== false; }
async function abrirChrome(options = {}) {
  const headless = headlessPadrao(options);
  const folder = path.resolve(__dirname,'../.playwright-mcp/p8s');
  fs.mkdirSync(folder,{recursive:true});
  const profile = options.profile || fs.mkdtempSync(path.join(folder,'chrome-'));
  const executable = process.env.CHROME_PATH || [process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA]
    .filter(Boolean).map(p=>path.join(p,'Google/Chrome/Application/chrome.exe')).find(p=>fs.existsSync(p));
  if (!executable) throw Error('Google Chrome nao encontrado; defina CHROME_PATH com o executavel.');
  // O launch padrão do Playwright força foco emulado na sessão interna. Um segundo
  // CDPSession não desliga essa sessão. Conexão CDP sem overrides preserva foco real.
  // Mesmas opções de isolamento/ruído do launcher Playwright 1.65.0 instalado.
  // Não trocar o renderer/GPU nem a carga da aplicação para aprovar desempenho.
  const automationArgs = ['--disable-field-trial-config','--disable-background-networking',
    '--disable-backgrounding-occluded-windows','--disable-back-forward-cache','--disable-breakpad',
    '--disable-component-extensions-with-background-pages','--disable-component-update','--disable-default-apps',
    '--disable-dev-shm-usage','--disable-extensions','--allow-pre-commit-input','--disable-hang-monitor',
    '--disable-ipc-flooding-protection','--disable-popup-blocking','--disable-prompt-on-repost',
    '--force-color-profile=srgb','--metrics-recording-only','--password-store=basic','--use-mock-keychain',
    '--no-service-autorun','--disable-search-engine-choice-screen','--enable-automation',
    '--disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,DestroyProfileOnBrowserClose,HttpsUpgrades,HttpsFirstBalancedModeAutoEnable,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,AvoidCorsURLLoaderRestartOnRedirect,TcpPortRandomizationWin,OptimizationHints,NetworkTimeServiceQuerying,AimEnabled,PreconnectToSearch',
    '--enable-features=CDPScreenshotNewSurface,SkipListAccountsWithoutGaiaCookies'];
  const child = spawn(executable,[...automationArgs,...(headless?['--headless=new']:[]),'--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',
    '--user-data-dir='+profile,'--no-first-run','--no-default-browser-check',
    '--disable-background-timer-throttling','--disable-renderer-backgrounding',options.appUrl ? '--app='+options.appUrl : 'about:blank'],{stdio:'ignore'});
  let launchError, browser;
  child.on('error',error=>{launchError=error;});
  const delay = ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const close = async()=>{
    try {
      if (browser && child.exitCode === null) {
        const cdp = await browser.newBrowserCDPSession();
        await cdp.send('Browser.close');
      }
    } finally {
      if (browser) await browser.close();
      for(let i=0;child.exitCode===null&&!launchError&&i<100;i++)await delay(50);
      if(child.exitCode===null&&!launchError) {
        if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'});
        else child.kill();
      }
    }
  };
  try {
    const portFile=path.join(profile,'DevToolsActivePort');
    for(let i=0;!fs.existsSync(portFile)&&i<200&&!launchError&&child.exitCode===null;i++)await delay(50);
    if(launchError)throw launchError;
    if(!fs.existsSync(portFile))throw Error('Chrome nao abriu a porta CDP em 10 s.');
    const port=await lerPortaCDP(portFile);
    if(!/^\d+$/.test(port))throw Error('Porta CDP invalida.');
    browser=await carregarPlaywright().chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});
    const context=browser.contexts()[0];
    return {
      initialPage:()=>context.pages()[0],
      async newPage(pageOptions={}) {
        const page=await context.newPage();
        if(headless)paginasHeadless.add(page);
        await page.setViewportSize(pageOptions.viewport||options.viewport||{width:1366,height:768});
        await page.emulateMedia({reducedMotion:pageOptions.reducedMotion||options.reducedMotion||'no-preference'});
        return page;
      },
      newCDPSession:page=>context.newCDPSession(page),close
    };
  } catch(error) {await close();throw error;}
}
async function vigiarFoco(page) {
  // Playwright ativa foco emulado por padrão: hasFocus() pode ser true em outra aba.
  // A sessão dura até o fechamento do contexto; o teste precisa do foco real.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setFocusEmulationEnabled', {enabled:paginasHeadless.has(page)});
  await page.addInitScript(() => {
    window.__testeFoco = {armado:false, perdeu:false};
    const registrar = () => {
      if (window.__testeFoco.armado && (document.hidden || !document.hasFocus())) window.__testeFoco.perdeu = true;
    };
    addEventListener('blur', registrar);
    document.addEventListener('visibilitychange', registrar);
  });
}
async function lerPortaCDP(portFile) {
  for(let i=0;i<200;i++) {
    try {
      const port=fs.readFileSync(portFile,'utf8').split('\n')[0].trim();
      if(/^\d+$/.test(port)&&Number(port)>0&&Number(port)<=65535)return port;
    } catch(error) {if(!['EBUSY','ENOENT','EPERM'].includes(error.code))throw error;}
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  throw Error('Arquivo DevToolsActivePort nao ficou legivel/completo em 10 s.');
}
async function exigirFoco(page) {
  const state = await page.evaluate(() => {
    const s = window.__testeFoco;
    if (s) s.armado = true;
    return {focused:document.hasFocus(), hidden:document.hidden, lost:!!s?.perdeu};
  });
  if (!state.focused || state.hidden || state.lost)
    throw Error('AMBIENTE INVALIDO: Chrome perdeu foco/visibilidade. Mantenha a janela do teste em primeiro plano e execute apenas uma suite. ' + JSON.stringify(state));
}
async function esperarAcesso(page,id='cenaPin') {
  // Playwright considera opacity:0 "visible". A saudação ainda captura teclas
  // nessa fase; aguardar a cena real evita digitar em formulário fora de quadro.
  await page.waitForFunction(id=>{
    const field=document.getElementById(id),scene=field?.closest('.narr-cena');
    return window.NARR && NARR.cenaEm(NARR.progresso())==='acesso' && scene &&
      +getComputedStyle(scene).opacity>.5 && scene.getAttribute('aria-hidden')!=='true';
  },id);
  await exigirFoco(page);
}
async function medirQuadros(page) {
  let deadline;
  try {return await Promise.race([page.evaluate(()=>new Promise((resolve,reject)=>{
    const frames=[],start=performance.now();let first,previous;
    let finished=false;
    const guard=setInterval(()=>{
      if(document.hidden||!document.hasFocus()||window.__testeFoco?.perdeu||performance.now()-start>10000) {
        finished=true;clearInterval(guard);
        reject(Error('AMBIENTE INVALIDO: amostragem interrompida por perda de foco/visibilidade ou ausencia de quadros por 10 s. Mantenha o Chrome em primeiro plano.'));
      }
    },100);
    function tick(now) {
      if(finished)return;
      if(first===undefined)first=now;
      if(previous!==undefined)frames.push(now-previous);
      previous=now;
      if(now-first<2000)return requestAnimationFrame(tick);
      finished=true;clearInterval(guard);
      resolve({fps:frames.length*1000/(now-first),worstMs:Math.max(...frames),
        diagnostic:{start,end:now,spans:window.__diag?.spans.filter(s=>s.start>=start)||[],longTasks:window.__diag?.longTasks.filter(s=>s.start>=start)||[]},
        focused:document.hasFocus(),hidden:document.hidden,scene:window.NARR?.cenaEm(NARR.progresso())});
    }
    requestAnimationFrame(tick);
  })),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('Amostragem nao concluiu em 12 s; verificar foco, visibilidade e travamento do navegador.')),12000);})]);}
  finally{clearTimeout(deadline);}
}
module.exports = {headlessPadrao, carregarPlaywright, abrirChrome, vigiarFoco, exigirFoco, esperarAcesso, medirQuadros, lerPortaCDP};
