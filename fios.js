'use strict';
/** Um cabo por monitor. Simulação em corda-verlet.js; buffers de geometria reutilizados. */
(function () {
  function montar(mapa, proto, op) {
    if (!mapa || !proto || !window.THREE) return null;
    op = op || {};
    const E = proto.E, dep = mapa.depurar(), ambiente = AmbienteControle.montar(mapa, proto);
    const grupo = new THREE.Group(); grupo.name = 'fios'; dep.scene.add(grupo);
    const movimento = matchMedia('(prefers-reduced-motion: reduce)'), cabos = [], SEG = 48, LADOS = 8, raio = .022 * E;
    const metal = new THREE.MeshBasicMaterial({ color: 0x342b22 });
    const eixo = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
    const cossenos = new Float32Array(LADOS), senos = new Float32Array(LADOS);
    for(let i=0;i<LADOS;i++){cossenos[i]=Math.cos(i/LADOS*Math.PI*2);senos[i]=Math.sin(i/LADOS*Math.PI*2);}
    function conector() {
      const pecas = [], corpo = new THREE.Mesh(new THREE.CylinderGeometry(.065*E,.065*E,.18*E,12)); pecas.push(corpo);
      for(let i=0;i<3;i++){const aro=new THREE.Mesh(new THREE.TorusGeometry(.067*E,.008*E,4,12));aro.rotation.x=Math.PI/2;aro.position.y=(i-1)*.055*E;pecas.push(aro);}
      const boot=new THREE.Mesh(new THREE.CylinderGeometry(raio,.052*E,.16*E,12));boot.position.y=.15*E;pecas.push(boot);
      const mesh=new THREE.Mesh(CenarioGeometria.unir(pecas),metal);
      const luz=new THREE.Mesh(new THREE.TorusGeometry(.082*E,.016*E,6,16),new THREE.MeshBasicMaterial({color:0xff9a4d,transparent:true,opacity:.75,depthWrite:false}));
      luz.rotation.x=Math.PI/2;luz.name='conector-energia';mesh.add(luz);mesh.userData.luz=luz;grupo.add(mesh);return mesh;
    }
    let poeira=null,texturaCurvas=null,dadosCurvas=null,tempoFluxo=0,enfase=0,trafego=0,arquivos=null;
    function limparPoeira(){if(poeira){grupo.remove(poeira);poeira.geometry.dispose();poeira.material.dispose();poeira=null;}if(texturaCurvas){texturaCurvas.dispose();texturaCurvas=null;}}
    function criarPoeira(){
      limparPoeira();const n=cabos.length;if(!n)return;
      dadosCurvas=new Float32Array(SEG*n*4);texturaCurvas=new THREE.DataTexture(dadosCurvas,SEG,n,THREE.RGBAFormat,THREE.FloatType);texturaCurvas.minFilter=texturaCurvas.magFilter=THREE.NearestFilter;
      const total=op.leve?Math.min(500,n*70):Math.min(1800,n*250),sementes=new Float32Array(total*4),ids=new Float32Array(total);
      for(let i=0;i<total;i++){ids[i]=i%n;for(let j=0;j<4;j++)sementes[i*4+j]=Math.random();}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(total*3),3));geo.setAttribute('aSeed',new THREE.BufferAttribute(sementes,4));geo.setAttribute('aCabo',new THREE.BufferAttribute(ids,1));
      const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
        uniforms:{uCurvas:{value:texturaCurvas},uTime:{value:0},uE:{value:E},uVis:{value:0}},
        vertexShader:`attribute vec4 aSeed;attribute float aCabo;uniform sampler2D uCurvas;uniform float uTime,uE;varying vec3 vCor;varying float vAlpha;
          vec3 amostra(float u){float x=clamp(u,0.,1.)*${SEG-1}.;float y=(aCabo+.5)/${n}.;vec3 a=texture2D(uCurvas,vec2((floor(x)+.5)/${SEG}.,y)).xyz;vec3 b=texture2D(uCurvas,vec2((min(floor(x)+1.,${SEG-1}.)+.5)/${SEG}.,y)).xyz;return mix(a,b,fract(x));}
          void main(){float u=fract(aSeed.x+uTime*(.04+aSeed.y*.055));vec3 p=amostra(u);vec3 t=normalize(amostra(min(1.,u+.01))-amostra(max(0.,u-.01)));vec3 ref=abs(t.y)>.9?vec3(1,0,0):vec3(0,1,0);vec3 n=normalize(cross(t,ref)),b=cross(t,n);
            float solto=pow(max(0.,sin(uTime*.3+aSeed.w*31.)),14.);float r=(.032+aSeed.z*.055+solto*.16)*uE;float a=aSeed.w*6.28318+uTime*.3;p+=(n*cos(a)+b*sin(a))*r;
            vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((1.+aSeed.z*1.8)*38./max(1.,-mv.z),.7,4.);
            vCor=aSeed.w<.4?vec3(.965,.918,.86):vec3(1.,.604,.302);vAlpha=(.25+aSeed.y*.65)*(1.-solto*.6);}`,
        fragmentShader:'uniform float uVis;varying vec3 vCor;varying float vAlpha;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(vCor,vAlpha*uVis*(1.-smoothstep(.08,.5,r)));}'});
      poeira=new THREE.Points(geo,mat);poeira.name='poeira-cabos';poeira.frustumCulled=false;poeira.userData.total=total;grupo.add(poeira);
    }
    function materialCabo(i,comprimento){return new THREE.ShaderMaterial({uniforms:{uE:{value:E},uTime:{value:0},uVel:{value:.7+i*.11},uEnfase:{value:0},uLigado:{value:1},uChegada:{value:-1},uLength:{value:comprimento},uVis:{value:1}},
      vertexShader:'varying vec3 vP,vN;varying vec2 vUv;varying float vDepth;void main(){vP=(modelMatrix*vec4(position,1.)).xyz;vN=normalize(mat3(modelMatrix)*normal);vUv=uv;vec4 mv=viewMatrix*vec4(vP,1.);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}',
      fragmentShader:`uniform float uE,uTime,uVel,uLength,uVis,uEnfase,uChegada,uLigado;varying vec3 vP,vN;varying vec2 vUv;varying float vDepth;
        void main(){if(uChegada>=0. && vUv.x>clamp(uChegada,0.,1.))discard;if(fract(sin(dot(gl_FragCoord.xy,vec2(12.98,78.23)))*43758.54)>uVis)discard;
          vec3 n=normalize(vN),l=normalize(-vP),v=normalize(cameraPosition-vP);float perto=1./(1.+dot(vP,vP)/(uE*uE)*.16);float rim=pow(1.-abs(dot(n,v)),3.);
          float faixa=smoothstep(.79,.83,fract(vUv.x*uLength/uE*2.))*(1.-smoothstep(.95,.99,fract(vUv.x*uLength/uE*2.)))*smoothstep(.1,.4,sin(vUv.y*6.28318));
          vec3 base=mix(vec3(.025,.023,.02),vec3(.25,.22,.18),faixa*.32);
          float pulso=pow(max(0.,cos(vUv.x*19.-uTime*uVel*3.)),32.);
          float energia=uLigado<0.?1.:1.-smoothstep(uLigado-.025,uLigado+.025,vUv.x);
          vec3 cor=base*(.7+max(dot(n,l),0.)*perto*2.)+vec3(1.,.4,.12)*perto*(.035+rim*.08)+vec3(1.,.88,.72)*rim*.035+vec3(1.,.5,.2)*pulso*(.08+uEnfase*.08)*energia;
          if(uLigado>0. && uLigado<1.)cor+=vec3(1.,.604,.302)*1.2*exp(-pow((vUv.x-uLigado)/.025,2.));
          if(uChegada>=0.)cor+=vec3(1.,.604,.302)*2.*exp(-pow((vUv.x-uChegada)/.025,2.));
          float fog=1.-exp(-vDepth*vDepth*.000025);cor=mix(cor,vec3(.03137,.02745,.02353),fog);gl_FragColor=vec4(cor,1.);}`});}
    function criar(a, b, i) {
      const destinoNominal=b.ancora.clone();destinoNominal.y-=proto.raiz.position.y;
      const fisica = new CordaVerlet.Corda(a.ancora.toArray(),destinoNominal.toArray(),{pontos:22,chao:ambiente.CHAO,raio,folga:.18+(i%3)*.025,gravidade:.12*E});
      const geo=new THREE.BufferGeometry(), pos=new Float32Array(SEG*LADOS*3), normal=new Float32Array(pos.length), uv=new Float32Array(SEG*LADOS*2), indices=[];
      for(let s=0;s<SEG;s++)for(let l=0;l<LADOS;l++){
        const id=s*LADOS+l;uv[id*2]=s/(SEG-1);uv[id*2+1]=l/LADOS;
        if(s<SEG-1){const n=s*LADOS+(l+1)%LADOS;indices.push(id,id+LADOS,n,n,id+LADOS,n+LADOS);}
      }
      geo.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('normal',new THREE.BufferAttribute(normal,3).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setIndex(indices);
      fisica.ancoras(a.ancora.x,a.ancora.y,a.ancora.z,b.ancora.x,b.ancora.y,b.ancora.z);for(let j=0;j<120;j++)fisica.passo(1/120);
      const mat = materialCabo(i,fisica.comprimento);
      const mesh=new THREE.Mesh(geo,mat);mesh.name='cabo-'+b.id;mesh.frustumCulled=false;grupo.add(mesh);
      const c={id:b.id,a,b,fisica,geo,mat,mesh,centros:new Float32Array(SEG*3),guia:new Float64Array(fisica.n*3),densa:new Float64Array(96*3),distancias:new Float64Array(96),c1:new THREE.Vector3(),c2:new THREE.Vector3(),inicio:conector(),fim:conector()};
      c.tipos=FiosIcones.tiposDoProjeto(b.id);c.duracao=2.2+(i%3)*.3;
      rotear(c,1);fisica.p.set(c.guia);fisica.anterior.set(c.guia);fisica.guiar(c.guia,28);
      cabos.push(c);atualizarTubo(c);return c;
    }
    const direitaRota=new THREE.Vector3(),frenteRota=new THREE.Vector3(),horizontalRota=new THREE.Vector3(),alvo1=new THREE.Vector3(),alvo2=new THREE.Vector3(),relativo=new THREE.Vector3();
    function rotear(c,f){
      const camera=dep.camera,a=c.a.ancora,b=c.b.ancora;
      camera.getWorldDirection(frenteRota);horizontalRota.copy(frenteRota).setY(0).normalize();
      const origem=Math.max(3*E,-relativo.copy(camera.position).dot(frenteRota));
      const camada=dep.scene.getObjectByName('cenario-medio'),escalaCamada=camada&&camada.userData.pontos.scale.z;
      const D=escalaCamada>3*E?escalaCamada:origem;
      const da=relativo.copy(a).sub(camera.position).dot(frenteRota),db=relativo.copy(b).sub(camera.position).dot(frenteRota),perto=Math.min(da,db);
      // Se ambas as pontas estão no fundo, a barriga vem ao plano médio. Se estão
      // no infinito (cena do planeta), visita o fundo. Não alonga até fora do piso.
      const profundidadeMeio=perto>=2.5*D?2.05*D:perto>=1.12*D?.98*D:1.32*D;
      const alvo=Math.max(.35*D,(profundidadeMeio-(da+db)*.125)/.75);
      alvo1.copy(a).lerp(b,.32);alvo2.copy(a).lerp(b,.76);
      alvo1.y=Math.max(ambiente.CHAO+.55*E,a.y+.3*E);alvo2.y=Math.max(ambiente.CHAO+.8*E,b.y-.4*E);
      for(let i=0;i<2;i++){
        const v=i?alvo2:alvo1,depth=relativo.copy(v).sub(camera.position).dot(frenteRota);
        v.addScaledVector(horizontalRota,(alvo-depth)/Math.max(.3,horizontalRota.dot(frenteRota)));
      }
      // Contorna a projeção do núcleo pelos lados; não cruza sua região brilhante.
      direitaRota.setFromMatrixColumn(camera.matrixWorld,0);
      const lado=b.dot(direitaRota)>=0?1:-1;
      for(let i=0;i<2;i++){const v=i?alvo2:alvo1;v.addScaledVector(direitaRota,lado*Math.max(4.2*E,Math.abs(v.dot(direitaRota)))-v.dot(direitaRota));}
      c.c1.lerp(alvo1,f);c.c2.lerp(alvo2,f);
      CenarioGeometria.bezier(c.densa,a,c.c1,c.c2,b);CenarioGeometria.uniformizar(c.densa,c.guia,c.distancias);
      let len=0;for(let j=3;j<c.guia.length;j+=3)len+=Math.hypot(c.guia[j]-c.guia[j-3],c.guia[j+1]-c.guia[j-2],c.guia[j+2]-c.guia[j-1]);
      c.fisica.comprimento=len;c.fisica.segmento=len/(c.fisica.n-1);c.mat.uniforms.uLength.value=len;
    }
    function atualizarTubo(c) {
      const p=c.fisica.p,n=c.fisica.n,centros=c.centros,pos=c.geo.attributes.position.array,norm=c.geo.attributes.normal.array;
      for(let s=0;s<SEG;s++){
        const u=s/(SEG-1)*(n-1),i=Math.min(n-2,Math.floor(u)),t=u-i,t2=t*t,t3=t2*t;
        for(let k=0;k<3;k++){
          const p0=p[Math.max(0,i-1)*3+k],p1=p[i*3+k],p2=p[(i+1)*3+k],p3=p[Math.min(n-1,i+2)*3+k];
          centros[s*3+k]=.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3);
        }
        centros[s*3+1]=Math.max(ambiente.CHAO+raio,centros[s*3+1]);
      }
      let nx=1,ny=0,nz=0;
      for(let s=0;s<SEG;s++){
        const antes=Math.max(0,s-1)*3,depois=Math.min(SEG-1,s+1)*3;
        let tx=centros[depois]-centros[antes],ty=centros[depois+1]-centros[antes+1],tz=centros[depois+2]-centros[antes+2];
        const len=Math.hypot(tx,ty,tz)||1;tx/=len;ty/=len;tz/=len;
        let d=nx*tx+ny*ty+nz*tz;nx-=tx*d;ny-=ty*d;nz-=tz*d;
        let nl=Math.hypot(nx,ny,nz);
        if(nl<.001){nx=-tz;ny=0;nz=tx;nl=Math.hypot(nx,nz)||1;}nx/=nl;ny/=nl;nz/=nl;
        const bx=ty*nz-tz*ny,by=tz*nx-tx*nz,bz=tx*ny-ty*nx;
        for(let l=0;l<LADOS;l++){
          const j=(s*LADOS+l)*3,co=cossenos[l],si=senos[l],x=nx*co+bx*si,y=ny*co+by*si,z=nz*co+bz*si;
          norm[j]=x;norm[j+1]=y;norm[j+2]=z;pos[j]=centros[s*3]+x*raio;pos[j+1]=centros[s*3+1]+y*raio;pos[j+2]=centros[s*3+2]+z*raio;
        }
      }
      c.geo.attributes.position.needsUpdate=c.geo.attributes.normal.needsUpdate=true;
      c.inicio.position.copy(c.a.ancora);dir.set(centros[3]-centros[0],centros[4]-centros[1],centros[5]-centros[2]).normalize();c.inicio.quaternion.setFromUnitVectors(eixo,dir);
      const f=(SEG-1)*3;c.fim.position.copy(c.b.ancora);dir.set(centros[f-3]-centros[f],centros[f-2]-centros[f+1],centros[f-1]-centros[f+2]).normalize();c.fim.quaternion.setFromUnitVectors(eixo,dir);
    }
    function limpar(){if(arquivos){arquivos.destruir();arquivos=null;}cabos.forEach(c=>{grupo.remove(c.mesh,c.inicio,c.fim);c.geo.dispose();c.mat.dispose();[c.inicio,c.fim].forEach(g=>{g.userData.luz.material.dispose();g.traverse(o=>{if(o.geometry)o.geometry.dispose();});});});cabos.length=0;}
    function refazer(){limparDebug();limpar();ambiente.sincronizar();ambiente.apoios.forEach((a,i)=>criar(ambiente.portas[i],a,i));arquivos=FiosIcones.montar(grupo,dep.camera,cabos);criarPoeira();atualizarDebug();}
    let debugGrupo=null,debugGeo=null,debugVerde=null,debugVermelho=null;
    const debugAtivo=()=>location.hash.split(/[&#]/).includes('debug');
    function limparDebug(){if(debugGrupo){grupo.remove(debugGrupo);debugGeo.dispose();debugVerde.dispose();debugVermelho.dispose();debugGrupo=null;}}
    function atualizarDebug(){
      limparDebug();if(!debugAtivo())return;
      debugGrupo=new THREE.Group();debugGrupo.name='ancoras-debug';grupo.add(debugGrupo);
      debugGeo=new THREE.SphereGeometry(.045*E,8,6);debugVerde=new THREE.MeshBasicMaterial({color:0x7bf0b4,depthTest:false,depthWrite:false});debugVermelho=new THREE.MeshBasicMaterial({color:0xff4d5e,depthTest:false,depthWrite:false});
      cabos.forEach(c=>{for(const ponta of[c.a,c.b]){const m=new THREE.Mesh(debugGeo,debugVerde);m.userData.ponta=ponta;m.userData.id=c.id;m.userData.cabo=c;m.renderOrder=100;debugGrupo.add(m);}});
      console.table(cabos.map(c=>({cabo:c.id,origem:c.a.grupo.name,destino:c.b.grupo.name,ancoraHub:c.a.ancora.toArray().map(x=>x.toFixed(3)).join(', '),ancoraMonitor:c.b.ancora.toArray().map(x=>x.toFixed(3)).join(', '),conectado:c.a.id===c.id&&c.b.id===c.id})));
    }
    function moverDebug(){if(!debugGrupo)return;let vermelhas=0;debugGrupo.children.forEach(m=>{const p=m.userData.ponta,c=m.userData.cabo,j=p===c.a?0:(SEG-1)*3;const erro=Math.hypot(c.centros[j]-p.ancora.x,c.centros[j+1]-p.ancora.y,c.centros[j+2]-p.ancora.z);const ok=p.id===m.userData.id&&p.grupo.parent===ambiente.grupo&&erro<.001;m.position.copy(p.ancora);m.material=ok?debugVerde:debugVermelho;if(!ok)vermelhas++;});grupo.userData.debug={cabos:cabos.length,verdes:cabos.length*2-vermelhas,vermelhas};}
    addEventListener('hashchange',atualizarDebug);
    const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),plano=new THREE.Plane(new THREE.Vector3(0,1,0),-ambiente.CHAO-.3*E),ponto=new THREE.Vector3();
    let pointerAtivo=false,vis=0,ativo=true,acumulado=0,scrollAnterior=scrollY,ultimo=performance.now();
    const mover=ev=>{pointer.set(ev.clientX/innerWidth*2-1,1-ev.clientY/innerHeight*2);pointerAtivo=true;};
    const sair=()=>{pointerAtivo=false;};addEventListener('pointermove',mover,{passive:true});addEventListener('pointerleave',sair);
    let mediaFrame=1/60,periodo=0,nivelLocal=0;
    function quadro(t,d){
      const agora=performance.now(),dt=Math.min(.05,(agora-ultimo)/1000);ultimo=agora;if(!ativo||document.hidden)return;
      ambiente.quadro();grupo.visible=vis>.001&&proto.visivel()>.005;
      if(!grupo.visible){moverDebug();return;}
      mediaFrame+=(dt-mediaFrame)*.04;periodo+=dt;if(periodo>3){if(mediaFrame>1/42)nivelLocal=Math.min(3,nivelLocal+1);else if(mediaFrame<1/58)nivelLocal=Math.max(0,nivelLocal-1);periodo=0;}
      const reduzido=movimento.matches;ray.setFromCamera(pointer,dep.camera);const temPonto=pointerAtivo&&!!ray.ray.intersectPlane(plano,ponto);
      const impulso=reduzido?0:Math.max(-.35,Math.min(.35,(scrollY-scrollAnterior)*.0005));scrollAnterior=scrollY;
      cabos.forEach(c=>{const a=c.a.ancora,b=c.b.ancora;c.fisica.ancoras(a.x,a.y,a.z,b.x,b.y,b.z);c.fisica.reduzido=reduzido;rotear(c,reduzido?1:1-Math.exp(-dt*2.5));c.fisica.impulso+=impulso;c.fisica.ponteiro.ativo=temPonto&&!reduzido;c.fisica.ponteiro.x=ponto.x;c.fisica.ponteiro.y=ponto.y;c.fisica.ponteiro.z=ponto.z;c.fisica.ponteiro.raio=2*E;});
      if(reduzido){
        cabos.forEach(c=>{if(!c.repousoReduzido){for(let k=0;k<180;k++)c.fisica.passo(1/120);c.repousoReduzido=true;}});acumulado=0;
      }else{
        cabos.forEach(c=>c.repousoReduzido=false);acumulado+=dt;let passos=0;while(acumulado>=1/60&&passos<3){cabos.forEach(c=>c.fisica.passo(1/60));acumulado-=1/60;passos++;}
      }
      cabos.forEach(atualizarTubo);
      tempoFluxo+=dt*(reduzido?0:1);
      arquivos.quadro(tempoFluxo,Math.min(vis,proto.visivel()),reduzido,dep.renderer);
      cabos.forEach(c=>{c.inicio.userData.luz.material.opacity=.7;c.fim.userData.luz.material.opacity=.65+c.brilho*.35;c.fim.userData.luz.scale.setScalar(1+c.brilho*.25);});
      cabos.forEach((c,i)=>{c.mat.uniforms.uTime.value=tempoFluxo;c.mat.uniforms.uEnfase.value=enfase;c.mat.uniforms.uVis.value=Math.min(vis,proto.visivel());for(let j=0;j<SEG;j++){const k=(i*SEG+j)*4;dadosCurvas[k]=c.centros[j*3];dadosCurvas[k+1]=c.centros[j*3+1];dadosCurvas[k+2]=c.centros[j*3+2];dadosCurvas[k+3]=1;}});
      moverDebug();
      if(poeira){texturaCurvas.needsUpdate=true;poeira.material.uniforms.uTime.value=tempoFluxo;poeira.material.uniforms.uVis.value=Math.min(vis,proto.visivel())*(.7+trafego*.3);poeira.geometry.setDrawRange(0,Math.max(120,Math.floor(poeira.userData.total/Math.pow(1.7,Math.max(nivelLocal,mapa.qualidade())))));}
    }
    function crescer(tempos) {
      cabos.forEach((c,i) => {
        const v = tempos ? tempos[i] || 0 : 1;
        c.mat.uniforms.uChegada.value = tempos ? v : -1;
        c.crescimento=v;
        c.inicio.visible = v > 0; c.fim.visible = v >= 1;
      });
      if(poeira) poeira.visible = !tempos;
    }
    function mostrar(v){ativo=!!v;grupo.visible=!!v;ambiente.mostrar(v);}
    function acenderChao(v){vis=v;}
    function destruir(){if(destruir.feito)return;destruir.feito=true;limparDebug();limparPoeira();limpar();metal.dispose();dep.scene.remove(grupo);ambiente.destruir();removeEventListener('pointermove',mover);removeEventListener('pointerleave',sair);removeEventListener('hashchange',atualizarDebug);removeEventListener('pagehide',destruir);document.removeEventListener('visibilitychange',visibilidade);}
    const visibilidade=()=>{ultimo=performance.now();acumulado=0;scrollAnterior=scrollY;};document.addEventListener('visibilitychange',visibilidade);addEventListener('pagehide',destruir,{once:true});
    refazer();return{energizar(valores){cabos.forEach((c,i)=>{c.mat.uniforms.uLigado.value=valores?valores[i]||0:-1;c.crescimento=valores?valores[i]||0:1;});if(poeira)poeira.visible=!valores;},grupo,refazer,quadro,crescer,acenderChao,acenderEsticados(v){enfase=v;},pacotes(v){trafego=v;},status(projetos){cabos.forEach(c=>{const p=projetos.find(p=>p.id===c.id);if(p)c.mesh.userData.status=p.status;});},mostrar,destruir,contagem:()=>({cabos:cabos.length})};
  }
  window.Fios={montar};
})();
