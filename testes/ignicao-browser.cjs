'use strict';
// Teste de integração real: o código servido só ganha sondas, sem alterar o disco.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { chromium } = (process.env.PLAYWRIGHT_MODULE
  ? createRequire(path.resolve(process.env.PLAYWRIGHT_MODULE, 'package.json'))('playwright')
  : require('playwright'));
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.env.IGNICAO_OUTPUT || path.join(root, '.playwright-mcp/p2b'));
fs.mkdirSync(out, { recursive: true });

if (!process.argv.includes('--round')) {
  const { spawnSync } = require('node:child_process');
  const rounds = [];
  for (let i = 1; i <= 3; i++) {
    const dir = path.join(out, 'rodada-' + i);
    const r = spawnSync(process.execPath, [__filename, ...process.argv.slice(2), '--round'], {
      stdio: 'inherit', env: { ...process.env, IGNICAO_OUTPUT: dir }
    });
    assert.equal(r.status, 0, 'Falha funcional na rodada ' + i);
    rounds.push(JSON.parse(fs.readFileSync(path.join(dir, 'resultado.json'))).summary);
  }
  const median = values => values.sort((a,b)=>a-b)[1];
  const summary = { fps: median(rounds.map(r=>r.fps)), worstMs: median(rounds.map(r=>r.worstMs)),
    stops: rounds[0].stops.map((s,i)=>({id:s.id, fps:median(rounds.map(r=>r.stops[i].fps)), worstMs:median(rounds.map(r=>r.stops[i].worstMs))})) };
  fs.writeFileSync(path.join(out,'mediana.json'),JSON.stringify({summary,rounds},null,2));
  console.log('Mediana de 3 rodadas:', JSON.stringify(summary,null,2));
  for (const s of [summary,...summary.stops]) assert.ok(s.fps>=55 && s.worstMs<50, (s.id||'ignição')+': '+s.fps+' fps / '+s.worstMs+' ms');
  process.exit(0);
}
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'no-preference' });
    const errors = []; page.setDefaultTimeout(30000);
    const cdp = await page.context().newCDPSession(page);
    const trace = [];
    if (process.argv.includes('--trace')) {
      cdp.on('Tracing.dataCollected', e => trace.push(...e.value));
      await cdp.send('Tracing.start', {categories:'devtools.timeline,v8,blink,cc,gpu',transferMode:'ReportEvents'});
    }
    if (process.argv.includes('--profile')) {
      await cdp.send('Profiler.enable');
      await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
      await cdp.send('Profiler.start');
    }
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => {
      window.__diag = { spans: [], frames: [], samples: [], longTasks: [], energy: 0 };
      const d = window.__diag;
      new PerformanceObserver(list => list.getEntries().forEach(e => d.longTasks.push({ start: e.startTime, duration: e.duration })))
        .observe({ type: 'longtask', buffered: true });
      for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
        for (const name of ['compileShader', 'linkProgram', 'getProgramParameter', 'getShaderParameter', 'getUniformLocation', 'getAttribLocation', 'getActiveUniform', 'getActiveAttrib', 'getShaderInfoLog', 'getProgramInfoLog', 'bufferData', 'texImage2D', 'drawElements', 'drawArrays']) {
          const original = proto[name];
          proto[name] = function (...args) {
            const start = performance.now();
            try { return original.apply(this, args); }
            finally {
              const duration = performance.now() - start;
              if (duration > .5) {
                const span = { name: 'gl.' + name, start, duration };
                if (name === 'getProgramInfoLog' && duration > 10) {
                  span.shaders = (this.getAttachedShaders(args[0]) || []).map(s => this.getShaderSource(s).slice(-500));
                }
                if (name === 'getShaderInfoLog' && duration > 10) span.shaders = [this.getShaderSource(args[0]).slice(-500)];
                d.spans.push(span);
              }
            }
          };
        }
      }
    });
    await page.route('**/landing-roteiro.js*', async route => {
      let source = fs.readFileSync(path.join(root, 'landing-roteiro.js'), 'utf8');
      const marker = 'const est={p:0};';
      assert.equal(source.split(marker).length, 2, 'Sonda da ignição precisa ser atualizada');
      source = source.replace(marker, `window.__diag.start=performance.now(); window.__diag.pd=pd; const est={p:0};`);
      source = source.replace('const planeta =', 'window.__testScene={mapa,malhaVeias,fios}; const planeta =');
      source = source.replace('function irCena(c) {', 'window.__navegacaoPronta=()=>!portalDados&&!passeioAutomatico&&(!lenis||!lenis.isLocked); window.__irCenaTeste=id=>irCena(cenas.find(c=>c.id===id)); function irCena(c) {');
      await route.fulfill({ contentType: 'text/javascript', body: source });
    });
    await page.route('**/mapa-vivo.js*', async route => {
      let source = fs.readFileSync(path.join(root, 'mapa-vivo.js'), 'utf8');
      source = source.replace('w = r.width; h = r.height;', 'window.__diag.spans.push({name:"resize",start:performance.now(),duration:0,from:[w,h],to:[r.width,r.height]}); w = r.width; h = r.height;');
      await route.fulfill({contentType:'text/javascript',body:source});
    });
    await page.goto(process.env.IGNICAO_URL || 'http://127.0.0.1:4173/');
    await page.bringToFront();
    await page.waitForFunction(() => window.NARR && window.__testScene);
    await page.evaluate(() => NARR.irAoAcesso());
    await page.locator('input[type=password]').waitFor({ state: 'visible' });
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
      const d = __diag, { mapa, malhaVeias } = __testScene;
      const energy = mapa.energia;
      mapa.energia = v => { d.energy = v; return energy(v); };
      for (const name of ['BufferGeometry', 'SphereGeometry', 'RingGeometry', 'TorusGeometry', 'PlaneGeometry', 'SpriteMaterial']) {
        const Original = THREE[name];
        THREE[name] = new Proxy(Original, { construct(target, args, newTarget) {
          const start = performance.now();
          try { return Reflect.construct(target, args, newTarget); }
          finally { d.spans.push({ name, start, duration: performance.now() - start }); }
        } });
      }
      const renderer = mapa.depurar().renderer, render = renderer.render;
      renderer.render = function (...args) {
        const start = performance.now();
        try { return render.apply(this, args); }
        finally { const duration = performance.now() - start; if (duration > 8) d.spans.push({ name: 'renderer.render', start, duration }); }
      };
      let previous, bucket = 0, sampleStart, sampleFrames = 0;
      function frame(now) {
        if (d.start !== undefined) {
          if (previous !== undefined) d.frames.push({ start: previous, end: now, dt: now - previous });
          previous = now;
          if (sampleStart === undefined) sampleStart = now;
          sampleFrames++;
          const elapsed = now - d.start;
          if (elapsed >= bucket) {
            d.samples.push({ targetMs: bucket, elapsedMs: elapsed, timeline: d.pd.tempo(), energy: d.energy,
              // As veias são opacas por desenho; uLuz é a frente de energização.
              veins: malhaVeias.grupo.children.map(m => ({ opacity: m.material.opacity,
                transparent: m.material.transparent, light: m.material.uniforms.uLuz.value,
                charge: m.material.uniforms.uCarga.value })),
              fps: now > sampleStart ? (sampleFrames - 1) * 1000 / (now - sampleStart) : null,
              hidden: document.hidden, focused: document.hasFocus() });
            bucket += 100; sampleStart = now; sampleFrames = 1;
          }
          if (elapsed >= 7000) { d.done = true; return; }
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    // Teclado dispara a mesma autenticação que o usuário, com PIN do simulador.
    await page.locator('input[type=password]').focus();
    await page.keyboard.type('12345678', { delay: 35 });
    await page.waitForFunction(() => __diag.done, null, { timeout: 20000 });
    const data = await page.evaluate(() => {
      const { pd, ...data } = __diag;
      return data;
    });
    const frames = data.frames.filter(f => f.start >= data.start && f.end <= data.start + 7050);
    assert.ok(frames.length, 'Nenhum quadro registrado');
    const worst = frames.reduce((a, b) => a.dt > b.dt ? a : b);
    const fps = frames.length * 1000 / frames.reduce((n, f) => n + f.dt, 0);
    const related = data.spans.filter(s => s.start < worst.end && s.start + s.duration > worst.start);
    const explain = frame => {
      const spans = data.spans.filter(s => s.start < frame.end && s.start + s.duration > frame.start);
      const sum = pattern => spans.filter(s => pattern.test(s.name)).reduce((n, s) => n + s.duration, 0);
      const shaderMs = sum(/^gl\.(compileShader|linkProgram|getProgramParameter|getShaderParameter|getProgramInfoLog|getShaderInfoLog)$/);
      const uploadMs = sum(/^gl\.(texImage2D|bufferData)$/);
      const geometryMs = sum(/Geometry$/);
      return { atSeconds: (frame.end - data.start) / 1000, frameMs: frame.dt, shaderMs, uploadMs, geometryMs,
        evidence: shaderMs > 10 ? 'Espera por compilação/link de shader no driver' :
          geometryMs > 10 ? 'Criação de geometria no quadro' :
            uploadMs > 10 ? 'Upload de textura/buffer contribuiu; restante não atribuído' :
              'Sem bloqueio simples atribuído pelas sondas; consultar perfil CPU/GPU', spans };
    };
    const ignitionSpans = data.spans.filter(s => s.start >= data.start && s.start <= data.start + 7000);
    const summary = { fps, minFps: 1000 / worst.dt, worstMs: worst.dt,
      worstAtSeconds: (worst.end - data.start) / 1000, related,
      stalls: frames.filter(f => f.dt >= 50).sort((a, b) => b.dt - a.dt).slice(0, 5).map(explain),
      geometryCreated: ignitionSpans.filter(s => /Geometry$/.test(s.name)).length,
      shaderWaitMs: ignitionSpans.filter(s => /^gl\.get(Program|Shader)InfoLog$/.test(s.name)).reduce((n, s) => n + s.duration, 0),
      longTasks: data.longTasks.filter(s => s.start < worst.end && s.start + s.duration > worst.start), errors };
    const stops = [];
    if (!process.argv.includes('--ignition-only')) {
      await page.waitForFunction(() => __navegacaoPronta());
      for (const id of ['situacao', 'gabinete', 'planilha', 'assistente', 'painel', 'pedalada', 'atrasos', 'cacador', 'planeta', 'fecho']) {
        console.log('Medindo parada', id);
        const arrivalStart = await page.evaluate(id => { const start=performance.now(); __irCenaTeste(id); return start; }, id);
        await page.waitForFunction(id => NARR.cenaEm(NARR.progresso()) === id, id).catch(async e=>{console.error('Navegação',id,await page.evaluate(()=>({p:NARR.progresso(),scene:NARR.cenaEm(NARR.progresso()),scroll:scrollY})));throw e;});
        await page.waitForTimeout(2500);
        const stop = await page.evaluate(() => new Promise(resolve => {
          const frames = []; const start=performance.now(); let first, previous;
          function tick(now) {
            if (first === undefined) first = now;
            if (previous !== undefined) frames.push(now - previous);
            previous = now;
            if (now - first < 2000) return requestAnimationFrame(tick);
            resolve({ fps: frames.length * 1000 / (now - first), worstMs: Math.max(...frames),
              diagnostic: {start, end:now, spans:__diag.spans.filter(s=>s.start>=start), longTasks:__diag.longTasks.filter(s=>s.start>=start)},
              focused: document.hasFocus(), hidden: document.hidden, scene: NARR.cenaEm(NARR.progresso()) });
          }
          requestAnimationFrame(tick);
        }));
        stop.entry = await page.evaluate(start=>({spans:__diag.spans.filter(s=>s.start>=start),longTasks:__diag.longTasks.filter(s=>s.start>=start)}),arrivalStart);
        stops.push({id, ...stop});
        if (process.argv.includes('--screenshots')) await page.screenshot({path:path.join(out, id+'.png')});
      }
    }
    summary.stops = stops;
    if (process.argv.includes('--profile')) {
      const { profile } = await cdp.send('Profiler.stop');
      await cdp.send('Performance.enable');
      const { metrics } = await cdp.send('Performance.getMetrics');
      const now = await page.evaluate(() => performance.now());
      const offset = metrics.find(m => m.name === 'Timestamp').value * 1000 - now;
      const nodes = new Map(profile.nodes.map(n => [n.id, n]));
      const parents = new Map();
      profile.nodes.forEach(n => (n.children || []).forEach(id => parents.set(id, n.id)));
      let time = profile.startTime / 1000;
      const counts = new Map();
      profile.samples.forEach((id, i) => {
        time += profile.timeDeltas[i] / 1000;
        if (time - offset >= worst.start && time - offset <= worst.end) counts.set(id, (counts.get(id) || 0) + 1);
      });
      summary.cpu = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id, samples]) => {
        const stack = [];
        for (let n = id; n; n = parents.get(n)) stack.push(nodes.get(n).callFrame);
        return { samples, stack };
      });
      fs.writeFileSync(path.join(out, 'ignicao.cpuprofile'), JSON.stringify(profile));
    }
    fs.writeFileSync(path.join(out, 'resultado.json'), JSON.stringify({ summary, ...data }, null, 2));
    if (process.argv.includes('--trace')) {
      const done = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve));
      await cdp.send('Tracing.end'); await done;
      fs.writeFileSync(path.join(out, 'trace.json'), JSON.stringify({traceEvents:trace}));
    }
    console.log(JSON.stringify({ ...summary, stops:stops.map(({diagnostic,entry,...s})=>s), cpu: summary.cpu?.map(n => ({ samples: n.samples, functions: n.stack.map(f => f.functionName) })) }, null, 2));
    assert.equal(errors.length, 0, 'Erros no console');
    assert.ok(data.samples.every(s => !s.hidden && s.focused), 'Chrome precisa ficar em primeiro plano');
    assert.ok(data.samples.length >= 65, 'Amostragem insuficiente para 7 s');
    assert.ok(data.samples.some(s => s.timeline >= 2.8 && s.energy > 1), 'Núcleo não passou de energia 1 após 2,8 s');
    assert.ok(data.samples.some(s => s.veins.every(v => v.light >= 1)), 'Veias não energizaram');
    // Desempenho é validado pelo processo pai, usando as três rodadas.
    for (const stop of stops) {
      assert.equal(stop.scene, stop.id, `Câmera fora da parada ${stop.id}`);
      assert.ok(stop.focused && !stop.hidden, `Chrome sem foco em ${stop.id}`);
    }
    console.log('Rodada: verificações funcionais passaram; desempenho salvo para a mediana');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
