'use strict';
/** Um cabo por monitor. Curva assentada em coordenadas do mundo; buffers de geometria reutilizados. */
(function () {
  function montar(mapa, proto, op) {
    if (!mapa || !proto || !window.THREE) return null;
    op = op || {};
    const E = proto.E, dep = mapa.depurar(), ambiente = AmbienteControle.montar(mapa, proto);
    const grupo = new THREE.Group(); grupo.name = 'fios'; dep.scene.add(grupo);
    const cabos = [], SEG = 48, LADOS = 8, raio = .022 * E;
    const metal = new THREE.MeshBasicMaterial({ color: 0x342b22 });
    const eixo = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
    const cossenos = new Float32Array(LADOS), senos = new Float32Array(LADOS);
    for(let i=0;i<LADOS;i++){cossenos[i]=Math.cos(i/LADOS*Math.PI*2);senos[i]=Math.sin(i/LADOS*Math.PI*2);}
    function conector() {
      const pecas = [], corpo = new THREE.Mesh(new THREE.CylinderGeometry(.065*E,.065*E,.18*E,12),metal); pecas.push(corpo);
      for(let i=0;i<3;i++){const aro=new THREE.Mesh(new THREE.TorusGeometry(.067*E,.008*E,4,12),metal);aro.rotation.x=Math.PI/2;aro.position.y=(i-1)*.055*E;pecas.push(aro);}
      const boot=new THREE.Mesh(new THREE.CylinderGeometry(raio,.052*E,.16*E,12),metal);boot.position.y=.15*E;pecas.push(boot);
      const mesh=new THREE.Mesh(CenarioGeometria.unir(pecas),metal);
      const luz=new THREE.Mesh(new THREE.TorusGeometry(.082*E,.016*E,6,16),new THREE.MeshBasicMaterial({color:0xff9a4d,transparent:true,opacity:.75,depthWrite:false}));
      luz.rotation.x=Math.PI/2;luz.name='conector-energia';mesh.add(luz);mesh.userData.luz=luz;grupo.add(mesh);return mesh;
    }
    let enfase=0;
    function materialCabo(i,comprimento){return new THREE.ShaderMaterial({uniforms:{uE:{value:E},uEnfase:{value:0},uLigado:{value:1},uChegada:{value:-1},uLength:{value:comprimento},uVis:{value:1}},
      vertexShader:'varying vec3 vP,vN;varying vec2 vUv;varying float vDepth;void main(){vP=(modelMatrix*vec4(position,1.)).xyz;vN=normalize(mat3(modelMatrix)*normal);vUv=uv;vec4 mv=viewMatrix*vec4(vP,1.);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}',
      fragmentShader:`uniform float uE,uLength,uVis,uEnfase,uChegada,uLigado;varying vec3 vP,vN;varying vec2 vUv;varying float vDepth;
        void main(){if(uChegada>=0. && vUv.x>clamp(uChegada,0.,1.))discard;if(fract(sin(dot(gl_FragCoord.xy,vec2(12.98,78.23)))*43758.54)>uVis)discard;
          vec3 n=normalize(vN),l=normalize(-vP),v=normalize(cameraPosition-vP);float perto=1./(1.+dot(vP,vP)/(uE*uE)*.16);float rim=pow(1.-abs(dot(n,v)),3.);
          float faixa=smoothstep(.79,.83,fract(vUv.x*uLength/uE*2.))*(1.-smoothstep(.95,.99,fract(vUv.x*uLength/uE*2.)))*smoothstep(.1,.4,sin(vUv.y*6.28318));
          vec3 base=mix(vec3(.025,.023,.02),vec3(.25,.22,.18),faixa*.32);
          float energia=uLigado<0.?1.:1.-smoothstep(uLigado-.025,uLigado+.025,vUv.x);
          vec3 cor=base*(.7+max(dot(n,l),0.)*perto*2.)+vec3(1.,.4,.12)*perto*(.035+rim*.08)+vec3(1.,.88,.72)*rim*.035+vec3(1.,.5,.2)*(.04+uEnfase*.04)*energia;
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
      const c={id:b.id,a,b,fisica,geo,mat,mesh,centros:new Float32Array(SEG*3),guia:new Float64Array(fisica.n*3),inicio:conector(),fim:conector()};
      rotear(c);
      cabos.push(c);atualizarTubo(c);return c;
    }
    // Rota fixa: sai radialmente do hub, contorna sua base e sobe ao soquete.
    // Só as âncoras físicas podem reconstruí-la; câmera, scroll e mouse não entram.
    function rotear(c){
      const a=c.a.ancora,b=c.b.ancora;
      const aa=Math.atan2(a.z,a.x),ab=Math.atan2(b.z,b.x);
      const delta=Math.atan2(Math.sin(ab-aa),Math.cos(ab-aa));
      const y=ambiente.CHAO+.42*E, r=2.05*E;
      const pontos=[a.clone()];
      pontos.push(new THREE.Vector3(Math.cos(aa)*r,y,Math.sin(aa)*r));
      const passos=Math.max(1,Math.ceil(Math.abs(delta)/.25));
      for(let i=1;i<=passos;i++){
        const ang=aa+delta*i/passos;
        pontos.push(new THREE.Vector3(Math.cos(ang)*r,y,Math.sin(ang)*r));
      }
      // Desce pelo lado traseiro do monitor, afastado da haste de suporte.
      const tras=new THREE.Vector3(0,0,-.38*E).applyQuaternion(c.b.modulo.g.getWorldQuaternion(new THREE.Quaternion()));
      pontos.push(new THREE.Vector3(b.x+tras.x,y,b.z+tras.z));
      pontos.push(b.clone().add(tras).add(new THREE.Vector3(0,-.25*E,0)));
      pontos.push(b.clone());
      const curva=new THREE.CatmullRomCurve3(pontos,false,'centripetal');
      for(let i=0;i<c.fisica.n;i++){
        const v=curva.getPoint(i/(c.fisica.n-1));v.y=Math.max(y,v.y);
        c.guia[i*3]=v.x;c.guia[i*3+1]=v.y;c.guia[i*3+2]=v.z;
      }
      c.guia.set(a.toArray(),0);c.guia.set(b.toArray(),c.guia.length-3);
      let len=0;for(let j=3;j<c.guia.length;j+=3)len+=Math.hypot(c.guia[j]-c.guia[j-3],c.guia[j+1]-c.guia[j-2],c.guia[j+2]-c.guia[j-1]);
      c.fisica.comprimento=len;c.fisica.segmento=len/(c.fisica.n-1);c.mat.uniforms.uLength.value=len;
      c.fisica.p.set(c.guia);c.fisica.anterior.set(c.guia);c.fisica.fixar();
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
    function limpar(){cabos.forEach(c=>{grupo.remove(c.mesh,c.inicio,c.fim);c.geo.dispose();c.mat.dispose();[c.inicio,c.fim].forEach(g=>{g.userData.luz.material.dispose();g.traverse(o=>{if(o.geometry)o.geometry.dispose();});});});cabos.length=0;}
    function refazer(){limparDebug();limpar();ambiente.sincronizar();ambiente.apoios.forEach((a,i)=>criar(ambiente.portas[i],a,i));atualizarDebug();}
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
    let vis=0,ativo=true;
    function quadro(){
      if(!ativo||document.hidden)return;
      ambiente.quadro();grupo.visible=vis>.001&&proto.visivel()>.005;
      cabos.forEach(c=>{
        const a=c.a.ancora,b=c.b.ancora,f=c.fisica;
        if(a.x!==f.a[0]||a.y!==f.a[1]||a.z!==f.a[2]||b.x!==f.b[0]||b.y!==f.b[1]||b.z!==f.b[2]){
          f.ancoras(a.x,a.y,a.z,b.x,b.y,b.z);rotear(c);atualizarTubo(c);
        }
        c.mat.uniforms.uEnfase.value=enfase;c.mat.uniforms.uVis.value=Math.min(vis,proto.visivel());
        c.inicio.userData.luz.material.opacity=.7;c.fim.userData.luz.material.opacity=.65;
      });
      moverDebug();
    }
    function crescer(tempos) {
      cabos.forEach((c,i) => {
        const v = tempos ? tempos[i] || 0 : 1;
        c.mat.uniforms.uChegada.value = tempos ? v : -1;
        c.crescimento=v;
        c.inicio.visible = v > 0; c.fim.visible = v >= 1;
      });
    }
    function mostrar(v){ativo=!!v;grupo.visible=!!v;ambiente.mostrar(v);}
    function acenderChao(v){vis=v;}
    function destruir(){if(destruir.feito)return;destruir.feito=true;limparDebug();limpar();metal.dispose();dep.scene.remove(grupo);ambiente.destruir();removeEventListener('hashchange',atualizarDebug);removeEventListener('pagehide',destruir);}
    addEventListener('pagehide',destruir,{once:true});
    refazer();return{energizar(valores){cabos.forEach((c,i)=>{c.mat.uniforms.uLigado.value=valores?valores[i]||0:-1;c.crescimento=valores?valores[i]||0:1;});},grupo,refazer,quadro,crescer,acenderChao,acenderEsticados(v){enfase=v;},pacotes(){/* Compatibilidade: tráfego desativado. */},status(projetos){cabos.forEach(c=>{const p=projetos.find(p=>p.id===c.id);if(p)c.mesh.userData.status=p.status;});},mostrar,destruir,contagem:()=>({cabos:cabos.length})};
  }
  window.Fios={montar};
})();
