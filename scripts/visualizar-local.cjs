'use strict';
// Servidor de desenvolvimento: a interface original recebe apenas uma configuração local.
// O simulador executa as regras Apps Script sem rede e mantém alterações só em memória.
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {execFile}=require('node:child_process');
const {ambiente}=require('../testes/simulador');
const root=path.resolve(__dirname,'..');
const sim=ambiente({agora:new Date().toISOString()});
sim.run('verificar()');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
let port=4173;
const server=http.createServer(async(req,res)=>{
  const send=(status,type,body)=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);};
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/__preview_api'){
      const query=Object.fromEntries(url.searchParams);
      let result;
      if(req.method==='POST'){
        // Impede que outra página envie ações ao simulador pelo navegador.
        if(req.headers.origin&&req.headers.origin!==`http://127.0.0.1:${port}`)return send(403,'text/plain','Origem inválida');
        let body='';for await(const chunk of req){body+=chunk;if(body.length>100000)return send(413,'text/plain','Pedido muito grande');}
        result=sim.post(query.k,JSON.parse(body));
      }else if(req.method==='GET')result=sim.get(query);
      else return send(405,'text/plain','Método não permitido');
      return send(200,'application/json; charset=utf-8',JSON.stringify(result));
    }
    if(req.method!=='GET'&&req.method!=='HEAD')return send(405,'text/plain','Método não permitido');
    const name=decodeURIComponent(url.pathname==='/'?'/pc.html':url.pathname).slice(1);
    // Só arquivos públicos da interface; código do servidor e diretórios Git não são servidos.
    if(!/^(?:camera-estado\.json|[a-zA-Z0-9-]+\.(?:html|js|webmanifest)|icons\/[a-zA-Z0-9-]+\.(?:png|svg))$/.test(name)||name==='sw.js')return send(404,'text/plain','Arquivo não disponível na prévia');
    let body=await fs.readFile(path.join(root,name));
    if(name.endsWith('.html')){
      const cfg=JSON.stringify({u:`http://127.0.0.1:${port}/__preview_api`,k:sim.props.CHAVE_PC});
      const bootstrap=`<script>window.JarvisPreviewLocal=true;localStorage.setItem('jarvis.pc.cfg',JSON.stringify(${cfg}));localStorage.setItem('jarvis.pin.ate',String(Date.now()+43200000));</script>`;
      body=body.toString().replace('<head>','<head>'+bootstrap);
      // APIs somente locais. Scripts/fontes CDN continuam sendo os mesmos da branch.
      res.setHeader('Content-Security-Policy',"connect-src 'self'; worker-src 'none'");
    }
    send(200,mime[path.extname(name)]||'application/octet-stream',req.method==='HEAD'?'':body);
  }catch(error){sendError(error);}
  function sendError(error){res.writeHead(error.code==='ENOENT'?404:400,{'Content-Type':'text/plain; charset=utf-8'});res.end(error.code==='ENOENT'?'Arquivo não encontrado':'Não foi possível processar o pedido local');}
});
server.on('error',error=>{
  if(error.code==='EADDRINUSE'&&port<4183){port++;server.listen(port,'127.0.0.1');}
  else{console.error('Não foi possível iniciar:',error.message);process.exitCode=1;}
});
server.on('listening',()=>{
  const address=`http://127.0.0.1:${port}/`;
  console.log('\nJARVÃO — PRÉVIA LOCAL / visual/landing-v3\n');
  console.log('Abra no navegador: '+address);
  console.log('Dados simulados. Nenhuma ação altera os serviços reais.');
  console.log('Internet necessária para as bibliotecas 3D e fontes.');
  console.log('Deixe esta janela aberta. Para encerrar, pressione Ctrl+C.\n');
  if(process.argv.includes('--abrir')){
    const command=process.platform==='win32'?'cmd.exe':process.platform==='darwin'?'open':'xdg-open';
    const args=process.platform==='win32'?['/d','/c','start','',address]:[address];
    execFile(command,args,error=>{if(error)console.log('Abra o endereço acima manualmente no navegador.');});
  }
});
server.listen(port,'127.0.0.1');
