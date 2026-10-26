'use strict';
// Demonstração explicitamente isolada: armazenamento próprio, sem servidor e sem push.
window.JarvisDemo=(()=>{
  const ativo=new URLSearchParams(location.search).has('demo');
  if(!ativo)return {ativo:false};
  const cfg=JSON.stringify({k:'DEMONSTRACAO_SEM_ACESSO',u:'/__demo_sem_servidor__'});
  localStorage.setItem('jarvis.demo.pc.cfg',cfg);localStorage.setItem('jarvis.demo.cfg',cfg);
  const data=fetch('assets/demo.json').then(r=>r.json()).then(p=>{p.estado.verificadoEm=new Date().toISOString();return p;});
  const ready=()=>{const tag=document.createElement('a');tag.className='demo-aviso';tag.textContent='DEMONSTRAÇÃO · DADOS FICTÍCIOS';tag.href='demo.html';document.body.appendChild(tag);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
  return {ativo,async api(acao){const p=await data;if(acao==='estado')return p.estado;if(acao==='pc')return p;if(acao==='pedidos')return {ok:true,pedidos:p.pedidos};return {ok:false,erro:'Disponível quando conectado ao seu Jarvão. Esta demonstração não acessa os seus sistemas.'};},async post(corpo){if(corpo.tipo==='verificar')return {ok:true};return {ok:false,erro:'Demonstração: nenhuma alteração foi enviada aos seus sistemas.'};}};
})();
