'use strict';
/** Um cabo por monitor. Simulação em corda-verlet.js; buffers de geometria reutilizados. */
(function () {
  function montar(mapa, proto, op) {
    if (!mapa || !proto || !window.THREE) return null;
    op = op || {};
    const E = proto.E, dep = mapa.depurar(), ambiente = AmbienteControle.montar(mapa, proto);
    const grupo = new THREE.Group(); grupo.name = 'fios'; dep.scene.add(grupo);
    const movimento = matchMedia('(prefers-reduced-motion: reduce)'), cabos = [], SEG = 64, LADOS = 8, raio = .028 * E;
    const metal = new THREE.MeshBasicMaterial({ color: 0x342b22 });
    const casco = new THREE.MeshBasicMaterial({ color: 0x1b1814 });
    const eixo = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
    const cossenos = new Float32Array(LADOS), senos = new Float32Array(LADOS);
    for(let i=0;i<LADOS;i++){cossenos[i]=Math.cos(i/LADOS*Math.PI*2);senos[i]=Math.sin(i/LADOS*Math.PI*2);}
    function conector() {
      const g = new THREE.Group(); grupo.add(g);
      const corpo = new THREE.Mesh(new THREE.CylinderGeometry(.065*E,.065*E,.18*E,12),metal);g.add(corpo);
      for(let i=0;i<4;i++){const aro=new THREE.Mesh(new THREE.TorusGeometry(.067*E,.008*E,4,12),metal);aro.rotation.x=Math.PI/2;aro.position.y=(i-1.5)*.045*E;g.add(aro);}
      const boot=new THREE.Mesh(new THREE.CylinderGeometry(raio,.052*E,.16*E,8),casco);boot.position.y=.15*E;g.add(boot);
      return g;
    }
    let poeira=null,texturaCurvas=null,dadosCurvas=null,tempoFluxo=0;
    function limparPoeira(){if(poeira){grupo.remove(poeira);poeira.geometry.dispose();poeira.material.dispose();poeira=null;}if(texturaCurvas){texturaCurvas.dispose();texturaCurvas=null;}}
    function criarPoeira(){
      limparPoeira();const n=cabos.length;if(!n)return;
      dadosCurvas=new Float32Array(SEG*n*4);texturaCurvas=new THREE.DataTexture(dadosCurvas,SEG,n,THREE.RGBAFormat,THREE.FloatType);texturaCurvas.minFilter=texturaCurvas.magFilter=THREE.NearestFilter;
      const total=op.leve?Math.min(2400,n*400):Math.min(9000,n*1100),sementes=new Float32Array(total*4),ids=new Float32Array(total);
      for(let i=0;i<total;i++){ids[i]=i%n;for(let j=0;j<4;j++)sementes[i*4+j]=Math.random();}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(total*3),3));geo.setAttribute('aSeed',new THREE.BufferAttribute(sementes,4));geo.setAttribute('aCabo',new THREE.BufferAttribute(ids,1));
      const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
        uniforms:{uCurvas:{value:texturaCurvas},uTime:{value:0},uE:{value:E},uVis:{value:0}},
        vertexShader:`attribute vec4 aSeed;attribute float aCabo;uniform sampler2D uCurvas;uniform float uTime,uE;varying vec3 vCor;varying float vAlpha;
          vec3 amostra(float u){float x=clamp(u,0.,1.)*${SEG-1}.;float y=(aCabo+.5)/${n}.;vec3 a=texture2D(uCurvas,vec2((floor(x)+.5)/${SEG}.,y)).xyz;vec3 b=texture2D(uCurvas,vec2((min(floor(x)+1.,${SEG-1}.)+.5)/${SEG}.,y)).xyz;return mix(a,b,fract(x));}
          void main(){float u=fract(aSeed.x+uTime*(.04+aSeed.y*.055));vec3 p=amostra(u);vec3 t=normalize(amostra(min(1.,u+.01))-amostra(max(0.,u-.01)));vec3 ref=abs(t.y)>.9?vec3(1,0,0):vec3(0,1,0);vec3 n=normalize(cross(t,ref)),b=cross(t,n);
            float solto=pow(max(0.,sin(uTime*.3+aSeed.w*31.)),14.);float r=(.032+aSeed.z*.055+solto*.16)*uE;float a=aSeed.w*6.28318+uTime*.3;p+=(n*cos(a)+b*sin(a))*r;
            vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((1.+aSeed.z*1.8)*38./max(1.,-mv.z),.7,4.);
            vCor=aSeed.w<.015?vec3(.48,.94,.7):aSeed.w<.03?vec3(1.,.76,.28):aSeed.w<.4?vec3(1.,.88,.72):vec3(1.,.6,.3);vAlpha=(.25+aSeed.y*.65)*(1.-solto*.6);}`,
        fragmentShader:'uniform float uVis;varying vec3 vCor;varying float vAlpha;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(vCor,vAlpha*uVis*(1.-smoothstep(.08,.5,r)));}'});
      poeira=new THREE.Points(geo,mat);poeira.name='poeira-cabos';poeira.frustumCulled=false;poeira.userData.total=total;grupo.add(poeira);
    }
    function materialCabo(i,comprimento){return new THREE.ShaderMaterial({uniforms:{uE:{value:E},uTime:{value:0},uVel:{value:.7+i*.11},uLength:{value:comprimento},uVis:{value:1}},
      vertexShader:'varying vec3 vP,vN;varying vec2 vUv;void main(){vP=(modelMatrix*vec4(position,1.)).xyz;vN=normalize(mat3(modelMatrix)*normal);vUv=uv;gl_Position=projectionMatrix*viewMatrix*vec4(vP,1.);}',
      fragmentShader:`uniform float uE,uTime,uVel,uLength,uVis;varying vec3 vP,vN;varying vec2 vUv;
        void main(){if(fract(sin(dot(gl_FragCoord.xy,vec2(12.98,78.23)))*43758.54)>uVis)discard;
          vec3 n=normalize(vN),l=normalize(-vP),v=normalize(cameraPosition-vP);float perto=1./(1.+dot(vP,vP)/(uE*uE)*.16);float rim=pow(1.-abs(dot(n,v)),3.);
          float faixa=smoothstep(.79,.83,fract(vUv.x*uLength/uE*2.))*(1.-smoothstep(.95,.99,fract(vUv.x*uLength/uE*2.)))*smoothstep(.1,.4,sin(vUv.y*6.28318));
          vec3 base=mix(vec3(.025,.023,.02),vec3(.25,.22,.18),faixa*.65);
          float pulso=pow(max(0.,cos(vUv.x*19.-uTime*uVel*3.)),32.);
          vec3 cor=base*(.7+max(dot(n,l),0.)*perto*2.)+vec3(1.,.4,.12)*perto*(.035+rim*.08)+vec3(1.,.88,.72)*rim*.035+vec3(1.,.5,.2)*pulso*.12;
          gl_FragColor=vec4(cor,1.);}`});}
    function criar(a, b, i) {
      const fisica = new CordaVerlet.Corda(a.ancora.toArray(),b.ancora.toArray(),{pontos:22,chao:ambiente.CHAO,raio,folga:.18+(i%3)*.025,gravidade:.8*E});
      const geo=new THREE.BufferGeometry(), pos=new Float32Array(SEG*LADOS*3), normal=new Float32Array(pos.length), uv=new Float32Array(SEG*LADOS*2), indices=[];
      for(let s=0;s<SEG;s++)for(let l=0;l<LADOS;l++){
        const id=s*LADOS+l;uv[id*2]=s/(SEG-1);uv[id*2+1]=l/LADOS;
        if(s<SEG-1){const n=s*LADOS+(l+1)%LADOS;indices.push(id,id+LADOS,n,n,id+LADOS,n+LADOS);}
      }
      geo.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('normal',new THREE.BufferAttribute(normal,3).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setIndex(indices);
      const mat = materialCabo(i,fisica.comprimento);
      const mesh=new THREE.Mesh(geo,mat);mesh.name='cabo-'+b.id;mesh.frustumCulled=false;grupo.add(mesh);
      const c={id:b.id,a,b,fisica,geo,mat,mesh,centros:new Float32Array(SEG*3),inicio:conector(),fim:conector()};cabos.push(c);atualizarTubo(c);return c;
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
    function limpar(){cabos.forEach(c=>{grupo.remove(c.mesh,c.inicio,c.fim);c.geo.dispose();c.mat.dispose();[c.inicio,c.fim].forEach(g=>g.traverse(o=>{if(o.geometry)o.geometry.dispose();}));});cabos.length=0;}
    function refazer(){limpar();ambiente.sincronizar();ambiente.apoios.forEach((a,i)=>criar(ambiente.portas[i],a,i));criarPoeira();}
    const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),plano=new THREE.Plane(new THREE.Vector3(0,1,0),-ambiente.CHAO-.3*E),ponto=new THREE.Vector3();
    let pointerAtivo=false,vis=0,ativo=true,acumulado=0,scrollAnterior=scrollY,ultimo=performance.now();
    const mover=ev=>{pointer.set(ev.clientX/innerWidth*2-1,1-ev.clientY/innerHeight*2);pointerAtivo=true;};
    const sair=()=>{pointerAtivo=false;};addEventListener('pointermove',mover,{passive:true});addEventListener('pointerleave',sair);
    function quadro(t,d){
      const agora=performance.now(),dt=Math.min(.05,(agora-ultimo)/1000);ultimo=agora;if(!ativo||document.hidden)return;
      ambiente.quadro();grupo.visible=vis>.001&&proto.visivel()>.005;
      if(!grupo.visible)return;
      const reduzido=movimento.matches;ray.setFromCamera(pointer,dep.camera);const temPonto=pointerAtivo&&!!ray.ray.intersectPlane(plano,ponto);
      const impulso=reduzido?0:Math.max(-.35,Math.min(.35,(scrollY-scrollAnterior)*.0005));scrollAnterior=scrollY;
      cabos.forEach(c=>{const a=c.a.ancora,b=c.b.ancora;c.fisica.ancoras(a.x,a.y,a.z,b.x,b.y,b.z);c.fisica.reduzido=reduzido;c.fisica.impulso+=impulso;c.fisica.ponteiro.ativo=temPonto&&!reduzido;c.fisica.ponteiro.x=ponto.x;c.fisica.ponteiro.y=ponto.y;c.fisica.ponteiro.z=ponto.z;c.fisica.ponteiro.raio=2*E;});
      acumulado+=dt;let passos=0;while(acumulado>=1/120&&passos<6){cabos.forEach(c=>c.fisica.passo(1/120));acumulado-=1/120;passos++;}cabos.forEach(atualizarTubo);
      tempoFluxo+=dt*(reduzido?.12:1);
      cabos.forEach((c,i)=>{c.mat.uniforms.uTime.value=tempoFluxo;c.mat.uniforms.uVis.value=Math.min(vis,proto.visivel());for(let j=0;j<SEG;j++){const k=(i*SEG+j)*4;dadosCurvas[k]=c.centros[j*3];dadosCurvas[k+1]=c.centros[j*3+1];dadosCurvas[k+2]=c.centros[j*3+2];dadosCurvas[k+3]=1;}});
      if(poeira){texturaCurvas.needsUpdate=true;poeira.material.uniforms.uTime.value=tempoFluxo;poeira.material.uniforms.uVis.value=Math.min(vis,proto.visivel());poeira.geometry.setDrawRange(0,Math.max(500,Math.floor(poeira.userData.total/Math.pow(1.7,mapa.qualidade()))));}
    }
    function mostrar(v){ativo=!!v;grupo.visible=!!v;ambiente.mostrar(v);}
    function acenderChao(v){vis=v;}
    function destruir(){limparPoeira();limpar();metal.dispose();casco.dispose();dep.scene.remove(grupo);ambiente.destruir();removeEventListener('pointermove',mover);removeEventListener('pointerleave',sair);}
    refazer();return{grupo,refazer,quadro,acenderChao,acenderEsticados(){},pacotes(){},status(){},mostrar,destruir,contagem:()=>({cabos:cabos.length})};
  }
  window.Fios={montar};
})();
