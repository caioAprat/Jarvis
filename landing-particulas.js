'use strict';
/** Tres camadas em volume. O núcleo e a câmera não pertencem a estes grupos.
 * Inspiração: Lusion (escala/falloff), Active Theory (atmosfera), Territory (hierarquia).
 * D = distância ao foco do roteiro; Z negativo é a frente da câmera, em coordenadas de visão.
 */
(function () {
  // Tres planos ativos tambem no mobile; populacao total > 5x a rodada 1.
  const CAMADAS = [
    { nome: 'frente', z: [.3,.6], n: 180, escala: [2,3], opacidade: .32, parallax: 1, scroll: 1, velocidade: 1 },
    { nome: 'medio', z: [.7,1.12], n: 1800, escala: [1,1.5], opacidade: .55, parallax: .25, scroll: .25, velocidade: .45 },
    { nome: 'fundo', z: [1.12,2.2], n: 4200, escala: [.5,1], opacidade: .48, parallax: .08, scroll: .08, velocidade: .16 },
  ];
  function montar(cena, op) {
    op = op || {}; const camera = op.camera, leve = !!op.leve, E = op.escala || 2.6;
    if (!camera) return null;
    const motion = matchMedia('(prefers-reduced-motion: reduce)'), grupos = [], materiais = [], geos = [];
    const ponteiro = new THREE.Vector2(), suave = new THREE.Vector2(), foco = new THREE.Vector3();
    const areas = Array.from({length:12}, () => new THREE.Vector4(-9,-9,-9,-9)); let proximaLeitura = 0, intensidade = 1;
    let seed = 173; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    CAMADAS.forEach((c,k) => {
      const grupo = new THREE.Group(); grupo.name = 'cenario-' + c.nome; grupo.userData.camada = {...c}; cena.add(grupo); grupos.push(grupo);

      const n = leve ? Math.round(c.n*.65) : c.n, p = new Float32Array(n*3), size = new Float32Array(n), fase = new Float32Array(n);
      for (let i=0;i<n;i++) {
        const z=c.z[0]+random()*(c.z[1]-c.z[0]);
        // Distribuição irregular em volume; distribuicao cobre tambem os cantos do campo visual.
        p[i*3]=((random()-.5)*2.3)*z;
        p[i*3+1]=(random()-.5)*1.8*z; p[i*3+2]=-z;
        size[i]=c.escala[0]+random()*(c.escala[1]-c.escala[0]); fase[i]=random()*6.28318;
      }
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(p,3));geo.setAttribute('aSize',new THREE.BufferAttribute(size,1));geo.setAttribute('aFase',new THREE.BufferAttribute(fase,1));geos.push(geo);
      const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:k===0?THREE.NormalBlending:THREE.AdditiveBlending,
        uniforms:{uTime:{value:0},uOpacity:{value:c.opacidade},uScale:{value:1},uFrente:{value:k===0?1:0},uAreas:{value:areas},uViewport:{value:new THREE.Vector2()},uPix:{value:1}},
        vertexShader:`attribute float aSize,aFase;uniform float uTime,uScale,uPix;varying float vFase,vDist;void main(){vec3 p=position;p.x+=sin(uTime*.08+aFase)*.018;p.y+=cos(uTime*.065+aFase)*.015;vec4 mv=modelViewMatrix*vec4(p,1.);vDist=-mv.z;vFase=aFase;gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*uPix*uScale/max(.1,-mv.z),.55,72.);}`,
        fragmentShader:`uniform float uOpacity,uFrente,uPix;uniform vec2 uViewport;uniform vec4 uAreas[12];varying float vFase,vDist;void main(){vec2 d=gl_PointCoord-.5;float r=length(d);if(r>.5)discard;vec2 screen=vec2(gl_FragCoord.x/uPix,uViewport.y-gl_FragCoord.y/uPix);if(uFrente>.5){for(int i=0;i<12;i++){vec4 a=uAreas[i];if(screen.x>a.x&&screen.y>a.y&&screen.x<a.z&&screen.y<a.w)discard;}}float fall=exp(-dot(d,d)*22.)*(1.-smoothstep(.35,.5,r));vec3 cor=mix(vec3(.69,.61,.52),vec3(1.,.6,.3),step(3.,vFase));if(uFrente>.5)cor=vec3(.69,.42,.2);gl_FragColor=vec4(cor,fall*uOpacity*exp(-vDist*.0018));}`});materiais.push(mat);
      const points=new THREE.Points(geo,mat);points.name='poeira-'+c.nome;points.frustumCulled=false;grupo.add(points);
      grupo.userData.pontos=points;grupo.userData.quantidade=n;
      if(k===2){
        const linhas=[];
        for(let anel=0;anel<3;anel++)for(let j=0;j<96;j++){
          if(j%7===6)continue;
          for(const q of[j,j+1]){const a=q/96*Math.PI*2,r=.72+anel*.19,z=1.35+anel*.23;linhas.push(Math.cos(a)*r*z,Math.sin(a)*r*z*.62-.24*z,-z+Math.sin(a)*.11);}
        }
        const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(linhas,3));geos.push(lg);
        const lm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
          uniforms:{uOpacity:{value:.08}},vertexShader:'varying float vD;varying vec2 vN;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vD=-mv.z;gl_Position=projectionMatrix*mv;vN=gl_Position.xy/gl_Position.w;}',
          fragmentShader:'uniform float uOpacity;varying float vD;varying vec2 vN;void main(){float fade=smoothstep(.3,.85,length(vN))*(1.-smoothstep(1.1,1.6,length(vN)));gl_FragColor=vec4(.69,.61,.52,uOpacity*fade*exp(-vD*.006));}'});materiais.push(lm);
        const estrutura=new THREE.LineSegments(lg,lm);estrutura.name='arcos-distantes';estrutura.frustumCulled=false;points.add(estrutura);
      }

    });
    const mover=e=>{ponteiro.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);};
    const sair=()=>ponteiro.set(0,0);addEventListener('pointermove',mover,{passive:true});addEventListener('blur',sair);
    function lerAreas(t) {
      if(t<proximaLeitura)return;proximaLeitura=t+.12;areas.forEach(a=>a.set(-9,-9,-9,-9));let i=0;
      document.querySelectorAll('.narr-texto-camada .mom-lado,.cham-bloco,.barra,.dock,.ir-direto').forEach(el=>{
        if(i>=areas.length || getComputedStyle(el).opacity==='0')return;
        const camada=el.closest('.narr-texto-camada');if(camada&&Number(camada.style.opacity)<.01)return;const alvo=el;
        const r=alvo.getBoundingClientRect();if(r.width&&r.height)areas[i++].set(r.left-24,r.top-20,r.right+24,r.bottom+20);
      });
    }
    function quadro(t,d,estado) {
      if(document.hidden)return;estado=estado||{};const red=motion.matches;
      const dt=Math.min(.05,d),f=1-Math.exp(-dt*2.7);if(red)suave.set(0,0);else suave.lerp(ponteiro,f);
      foco.set(estado.cx||0,estado.cy||0,estado.cz||0);const D=Math.max(4*E,Math.min(70,camera.position.distanceTo(foco))),tan=Math.tan(camera.fov*Math.PI/360);
      lerAreas(performance.now()/1000);
      grupos.forEach((g,k)=>{
        if(!g.visible)return;const c=CAMADAS[k],points=g.userData.pontos,mat=points.material;
        g.position.copy(camera.position);g.quaternion.copy(camera.quaternion);
        // Profundidade geométrica real; só a translação lateral extra responde ao ponteiro/scroll.
        points.scale.set(D*tan*camera.aspect,D*tan,D);
        points.position.set(red?0:suave.x*c.parallax*D*.055,red?0:suave.y*c.parallax*D*.035+Math.sin((estado.p||0)*Math.PI*2)*c.scroll*D*.09,0);
        mat.uniforms.uTime.value=red?0:t*c.velocidade;mat.uniforms.uScale.value=D*(c.z[0]+c.z[1])/2;
        const pix=op.renderer?op.renderer.getPixelRatio():1;mat.uniforms.uPix.value=pix;mat.uniforms.uViewport.value.set(innerWidth,innerHeight);
        mat.uniforms.uOpacity.value=c.opacidade*Math.min(1.15,intensidade);
      });
    }
    function destruir(){grupos.forEach(g=>cena.remove(g));materiais.forEach(m=>m.dispose());geos.forEach(g=>g.dispose());removeEventListener('pointermove',mover);removeEventListener('blur',sair);}
    return { grupos, quadro, intensidade:v=>{intensidade=v;}, destruir, tabela:CAMADAS };
  }
  window.LandingParticulas={montar,CAMADAS};
})();
