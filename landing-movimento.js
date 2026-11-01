'use strict';
(function(root){
  const clamp=p=>Math.max(0,Math.min(1,Number.isFinite(p)?p:0));
  function etapa(p,liberado){return Math.min(9,Math.round((liberado?clamp(p):Math.min(clamp(p),1/3))*9));}
  function quantidade(base,nivel,minimo=600){return Math.min(base,Math.max(minimo,Math.floor(base/(1+Math.max(0,nivel)))));}
  const api={clamp,etapa,quantidade};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.LandingMovimento=api;
})(typeof window!=='undefined'?window:globalThis);
