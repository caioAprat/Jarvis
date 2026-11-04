'use strict';
/** Atlas de traços desenhado localmente. Um único draw call por rede de cabos. */
(function () {
  const TIPOS = ['documento', 'tabela', 'grafico', 'codigo', 'banco', 'pasta'];
  function textura() {
    const cv = document.createElement('canvas'); cv.width = 384; cv.height = 64;
    const ctx = cv.getContext('2d');
    TIPOS.forEach((tipo, i) => {
      ctx.save(); ctx.translate(i * 64 + 8, 8); ctx.scale(2, 2);
      ctx.strokeStyle = '#ff9a4d'; ctx.lineWidth = 1.6; ctx.lineCap = ctx.lineJoin = 'round';
      function linha(p) { ctx.beginPath(); p.forEach(([x,y],j) => j ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.stroke(); }
      if (tipo === 'documento') { linha([[5,2],[14,2],[19,7],[19,22],[5,22],[5,2]]); linha([[14,2],[14,7],[19,7]]); linha([[8,12],[16,12]]); linha([[8,16],[14,16]]); }
      if (tipo === 'tabela') { ctx.strokeRect(3,4,18,16); linha([[3,9],[21,9]]); linha([[3,14],[21,14]]); linha([[9,4],[9,20]]); linha([[15,9],[15,20]]); }
      if (tipo === 'grafico') { linha([[3,3],[3,21],[22,21]]); linha([[7,16],[11,11],[15,14],[21,5]]); }
      if (tipo === 'codigo') { linha([[7,6],[2,12],[7,18]]); linha([[17,6],[22,12],[17,18]]); linha([[14,3],[10,21]]); }
      if (tipo === 'banco') { ctx.beginPath(); ctx.ellipse(12,5,9,3,0,0,Math.PI*2); ctx.stroke(); linha([[3,5],[3,19]]); linha([[21,5],[21,19]]); [12,19].forEach(y => {ctx.beginPath();ctx.ellipse(12,y,9,3,0,0,Math.PI);ctx.stroke();}); }
      if (tipo === 'pasta') linha([[2,7],[2,4],[10,4],[13,7],[22,7],[22,20],[2,20],[2,7],[22,7]]);
      ctx.restore();
    });
    const tex = new THREE.CanvasTexture(cv); tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false; return tex;
  }
  function tiposDoProjeto(id) {
    if (/planilha|hiss/i.test(id)) return ['tabela','documento','tabela'];
    if (/assistente|financ/i.test(id)) return ['grafico','tabela','grafico'];
    if (/gabinete|cliente/i.test(id)) return ['documento','pasta','banco'];
    return ['codigo','banco','pasta'];
  }
  function montar(grupo, camera, rotas) {
    const total = rotas.length * 3, pos = new Float32Array(total * 3), tipos = new Float32Array(total), alpha = new Float32Array(total);
    const geo = new THREE.BufferGeometry(), tex = textura();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aTipo',new THREE.BufferAttribute(tipos,1));
    geo.setAttribute('aAlpha',new THREE.BufferAttribute(alpha,1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({transparent:true,depthWrite:false,
      uniforms:{uAtlas:{value:tex},uDpr:{value:1}},
      vertexShader:'attribute float aTipo,aAlpha;uniform float uDpr;varying float vTipo,vAlpha;void main(){vTipo=aTipo;vAlpha=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=18.*uDpr;if(mv.z>=0.)gl_PointSize=0.;}',
      fragmentShader:'uniform sampler2D uAtlas;varying float vTipo,vAlpha;void main(){vec4 c=texture2D(uAtlas,vec2((vTipo+gl_PointCoord.x)/6.,1.-gl_PointCoord.y));float a=c.a*vAlpha;if(a<.015)discard;gl_FragColor=vec4(c.rgb,a);}'
    });
    const pontos = new THREE.Points(geo,mat); pontos.name = 'arquivos-em-transito'; pontos.frustumCulled = false; grupo.add(pontos);
    const distancias = rotas.map(r => new Float32Array(r.centros.length / 3));
    rotas.forEach((r,i) => { r.brilho = 0; for(let j=0;j<3;j++)tipos[i*3+j]=TIPOS.indexOf(r.tipos[j%r.tipos.length]); });
    const drawing = new THREE.Vector2();
    function quadro(tempo, vis, reduzido, renderer) {
      // Tamanho em pixels CSS, independente da distância. O render target usa o DPR real.
      renderer.getDrawingBufferSize(drawing); mat.uniforms.uDpr.value = drawing.y / Math.max(1,renderer.domElement.clientHeight);
      rotas.forEach((r,i) => {
        const p=r.centros, dist=distancias[i], n=dist.length; dist[0]=0;
        for(let k=1;k<n;k++)dist[k]=dist[k-1]+Math.hypot(p[k*3]-p[k*3-3],p[k*3+1]-p[k*3-2],p[k*3+2]-p[k*3-1]);
        r.brilho=0;
        for(let j=0;j<3;j++) {
          const fase=reduzido?(j+.5)/3:(tempo/(r.duracao||2.4)+j/3+i*.137)%1;
          // Aceleração suave perto da chegada, sem aglomerar os três arquivos.
          const u=fase*.9+.1*fase*fase, alvo=u*dist[n-1]; let k=1;
          while(k<n-1&&dist[k]<alvo)k++;
          const f=(alvo-dist[k-1])/Math.max(.000001,dist[k]-dist[k-1]), at=(i*3+j)*3;
          for(let axis=0;axis<3;axis++)pos[at+axis]=p[(k-1)*3+axis]+(p[k*3+axis]-p[(k-1)*3+axis])*f;
          const crescimento=r.crescimento==null?1:r.crescimento;
          alpha[i*3+j]=vis*(u<=crescimento?1:0);
          if(!reduzido)r.brilho=Math.max(r.brilho,Math.exp(-fase*30));
        }
      });
      geo.attributes.position.needsUpdate=geo.attributes.aAlpha.needsUpdate=true; pontos.visible=vis>.005;
    }
    function destruir(){grupo.remove(pontos);geo.dispose();mat.dispose();tex.dispose();}
    return {quadro,destruir};
  }
  window.FiosIcones={montar,tiposDoProjeto};
})();
