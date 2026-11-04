'use strict';
/** Distribui rótulos fora das projeções dos monitores, núcleo e outros rótulos.
 * Não altera tipografia nem os efeitos de Escrita. */
(function () {
  function montar(op) {
    const v = new THREE.Vector3(), centro = new THREE.Vector3(), lateral = new THREE.Vector3();
    let ocupados=[],fixos=[],camera=null,W=0,H=0;
    const tamanhos=new WeakMap();
    const observar=new ResizeObserver(entries=>entries.forEach(({target,contentRect})=>tamanhos.set(target,{width:contentRect.width,height:contentRect.height})));
    let interfaceFixa=[],ultimoUI=-Infinity;
    function tamanho(el){
      if(!tamanhos.has(el)){const b=el.getBoundingClientRect();tamanhos.set(el,{width:b.width,height:b.height});observar.observe(el);}
      return tamanhos.get(el);
    }
    const redimensionar=()=>ultimoUI=-Infinity;
    addEventListener('resize',redimensionar);
    function rect(x,y,w,h){return{x,y,w,h};}
    function area(a,b){return Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));}
    function projetar(p){v.copy(p).project(camera);return{x:(v.x*.5+.5)*W,y:(-.5*v.y+.5)*H,z:v.z};}
    function obstaculos(){
      camera=op.camera();W=innerWidth;H=innerHeight;camera.updateMatrixWorld();op.proto.raiz.updateMatrixWorld(true);fixos=[];ocupados=[];
      const p=projetar(centro.set(0,0,0));lateral.setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(op.E*2.15);const q=projetar(lateral),r=Math.abs(q.x-p.x);
      if(p.z<1)fixos.push(rect(p.x-r,p.y-r,r*2,r*2));
      if(op.planeta && op.planeta.grupo.visible){
        const a=projetar(op.planeta.posicao);
        lateral.setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(op.planeta.raio*1.12).add(op.planeta.posicao);
        const b=projetar(lateral),rp=Math.abs(b.x-a.x);
        if(a.z<1)fixos.push(rect(a.x-rp,a.y-rp,rp*2,rp*2));
      }
      if(op.proto.visivel()>.02)op.proto.modulos.forEach(m=>{
        let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,visivel=false;
        for(const x of[-.85,.85])for(const y of[-.53,.53])for(const z of[-.05,.05]){
          v.set(x*op.E,y*op.E,z*op.E).applyMatrix4(m.g.matrixWorld);v.project(camera);if(v.z<1)visivel=true;
          const px=(v.x*.5+.5)*W,py=(-v.y*.5+.5)*H;minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
        }
        if(visivel)fixos.push(rect(minX-8,minY-8,maxX-minX+16,maxY-minY+16));
      });
      if(performance.now()-ultimoUI>400){
        interfaceFixa=[];document.querySelectorAll('.barra,.dock,.nav-cenas,.ir-direto').forEach(el=>{const b=el.getBoundingClientRect();if(b.width&&b.height&&getComputedStyle(el).visibility!=='hidden')interfaceFixa.push(rect(b.left-6,b.top-6,b.width+12,b.height+12));});
        ultimoUI=performance.now();
      }
      fixos.push(...interfaceFixa);
    }
    function colocar(el,p,guia){
      const a=projetar(p);if(a.z>1)return false;
      const b=tamanho(el),w=Math.min(W-24,b.width),h=b.height;
      const margem=12,xs=[margem,Math.max(margem,W-w-64),(W-w)/2,Math.max(margem,Math.min(W-w-margem,a.x+40)),Math.max(margem,Math.min(W-w-margem,a.x-w-40))];
      const anterior=el._layoutRect;if(anterior){xs.push(Math.max(margem,Math.min(W-w-margem,anterior.x)));}
      const inicioY=W<700?Math.round(H*.57):margem;
      const ys=[Math.max(inicioY,Math.min(H-h-margem,a.y-h/2))];if(anterior)ys.push(Math.max(inicioY,Math.min(H-h-margem,anterior.y)));for(let y=inicioY;y<=H-h-margem;y+=12)ys.push(y);
      let melhor=null,nota=Infinity,colisao=Infinity;
      // Reutiliza a posição aprovada enquanto continuar livre: evita centenas de candidatos por quadro.
      const candidatoAnterior=anterior?rect(anterior.x,anterior.y,w,h):null;
      if(anterior && anterior.y>=inicioY && anterior.x>=margem && anterior.x+w<=W-margem && anterior.y+h<=H-margem && !fixos.concat(ocupados).some(o=>area(candidatoAnterior,o)>0)) {
        melhor=rect(anterior.x,anterior.y,w,h);nota=0;colisao=0;
      }
      if(!melhor)for(const x of xs)for(const y of ys){const box=rect(x,y,w,h);let overlap=0;for(const o of fixos)overlap+=area(box,o);for(const o of ocupados)overlap+=area(box,o)*2;
        const custo=overlap*10000+Math.hypot(x+w/2-a.x,y+h/2-a.y)*.2+(anterior?Math.hypot(x-anterior.x,y-anterior.y)*2:0);
        if(custo<nota){nota=custo;melhor=box;colisao=overlap;}}
      if(!melhor)return false;
      el._layoutRect=melhor;const sobreposicao=String(Math.round(colisao));if(el.dataset.sobreposicao!==sobreposicao)el.dataset.sobreposicao=sobreposicao;const transform=`translate(${Math.round(melhor.x)}px,${Math.round(melhor.y)}px)`;if(el.style.transform!==transform)el.style.transform=transform;
      ocupados.push(rect(melhor.x-8,melhor.y-8,w+16,h+16));
      // Rótulo HTML não é conexão física. Mantém só o marcador de origem; sem diagrama 2D.
      if(guia){guia.style.display='';guia.setAttribute('transform',`translate(${a.x},${a.y})`);}
      return true;
    }
    function quadro(host){
      obstaculos();
      host.querySelectorAll('.narr-texto-camada').forEach(c=>{
        if(Number(c.style.opacity)<.08)return;
        c.querySelectorAll('.mom-lado').forEach(el=>{
          const texto=el.querySelector('.esc-vis');if(!texto||Number(getComputedStyle(texto).opacity)<.05)return;
          // Campos e botões continuam na camada original; aqui só existem cópias invisíveis deles.
          el.querySelectorAll('form,button,canvas').forEach(n=>n.style.display='none');
          if(!el.dataset.layout){const b=tamanho(el);el.style.width=Math.min(b.width,W-24)+'px';el.style.position='fixed';el.style.left='0';el.style.top='0';el.style.margin='0';el.dataset.layout='1';}
          colocar(el,centro.set(0,0,0));
        });
      });
    }
    return{quadro,colocar,destruir(){observar.disconnect();removeEventListener('resize',redimensionar);}};
  }
  window.RotulosLayout={montar};
})();
