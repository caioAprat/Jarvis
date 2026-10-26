// Ferramenta de auditoria, sem modificar arquivos do app ou acessar produção.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { chromium } = require('/workspace/.jarvis-audit-tools/node_modules/playwright');
const root = path.resolve(__dirname, '../../..');
const out = path.resolve(__dirname, '..');
const { ambiente } = require(path.join(root, 'testes/simulador'));
const local = 'http://127.0.0.1:8000';
(async () => {
  const A = ambiente({ agora: new Date().toISOString() });
  A.run('verificar()');
  const fixture = A.get({ k: A.props.CHAVE_PC, acao: 'pc' });
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true,
    proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined });
  try {
    const results = [];
    for (const target of [
      { name: 'pc-1920x1080', file: 'pc.html', width: 1920, height: 1080 },
      { name: 'celular-390x844', file: 'index.html', width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({ viewport: { width: target.width, height: target.height }, deviceScaleFactor: 1, serviceWorkers: 'block' });
      try {
        // Origem e chave fictícias. Não reutiliza storage de navegadores pessoais.
        await context.addInitScript(({ local, pc }) => localStorage.setItem(pc ? 'jarvis.pc.cfg' : 'jarvis.cfg', JSON.stringify({ u: local + '/__auditoria_simulada__', k: 'FICTICIA_AUDITORIA' })), { local, pc: target.file === 'pc.html' });
        await context.route('**/__auditoria_simulada__?*', route => {
          const action = new URL(route.request().url()).searchParams.get('acao');
          return route.fulfill({ contentType: 'application/json', body: JSON.stringify(action === 'estado' ? fixture.estado : fixture) });
        });
        const page = await context.newPage();
        const failures = [], errors = [], responses = [];
        page.on('requestfailed', r => failures.push({ url: r.url(), error: r.failure()?.errorText }));
        page.on('pageerror', e => errors.push(e.message));
        page.on('response', r => { if (r.status() >= 400) responses.push({ url: r.url(), status: r.status() }); });
        const cdp = await context.newCDPSession(page);
        await cdp.send('Performance.enable');
        await page.goto(local + '/' + target.file, { waitUntil: 'networkidle', timeout: 30000 });
        await page.screenshot({ path: path.join(out, 'diagnostico', target.name + '-incompleto.png') });
        const state = await page.evaluate(() => ({ three_loaded: !!window.THREE, gsap_loaded: !!window.gsap, canvas_count: document.querySelectorAll('canvas').length, rendered_projects: document.querySelectorAll('.mv-rotulo').length }));
        const metrics = await cdp.send('Performance.getMetrics');
        results.push({ target, state, failed_requests: failures, http_errors: responses, page_errors: errors,
          valid_3d_reference: state.three_loaded && state.gsap_loaded && state.canvas_count > 0 && state.rendered_projects === fixture.estado.projetos.length,
          diagnostic_cdp_metrics: metrics.metrics });
      } finally { await context.close(); }
    }
    const appFiles = ['pc.html', 'index.html', 'mapa-vivo.js', 'sw.js', 'manifest.webmanifest', 'manifest-pc.webmanifest'];
    const blocked = results.some(r => !r.valid_3d_reference || r.failed_requests.length || r.http_errors.length);
    const report = {
      phase: 0, status: blocked ? 'blocked' : 'scene_loaded_measurement_pending', generated_at: new Date().toISOString(),
      source_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      source: 'Dados fictícios produzidos pelo simulador existente; nenhuma chamada à produção.',
      environment: { browser: browser.version(), playwright: require('/workspace/.jarvis-audit-tools/node_modules/playwright/package.json').version, node: process.version, platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model, cpu_count: os.cpus().length, memory_bytes: os.totalmem(), headless: true, device_pixel_ratio: 1 },
      baseline: { average_fps: null, cpu_percent: null, js_heap_bytes: null, first_scene_render_ms: null, complete_runtime_transfer_bytes: null },
      metrics_note: 'Métricas da cena 3D ainda não medidas. CDP bruto é diagnóstico da página incompleta, não desempenho do 3D. Após liberar acesso: capturar referências válidas e coletar trace e métricas em janela definida; não usar valores nulos como zero.',
      build: { framework: 'JavaScript puro', bundler: null, package_manifest: null, local_source_bytes: Object.fromEntries(appFiles.map(f => [f, fs.statSync(path.join(root, f)).size])), note: 'Sem bundle gerado. Comparar fontes locais e transferências das bibliotecas CDN separadamente.' },
      runs: results,
    };
    fs.writeFileSync(path.join(out, 'baseline.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ status: report.status, runs: results.map(r => ({ target: r.target.name, state: r.state, failures: r.failed_requests.length, valid_reference: r.valid_3d_reference })) }, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
