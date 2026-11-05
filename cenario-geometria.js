'use strict';
/** Geometria reutilizável da landing. Sem dependências além do Three r128 já carregado. */
(function () {
  function tubo(n, lados) {
    const g = new THREE.BufferGeometry(), p = new Float32Array(n * lados * 3), normal = new Float32Array(p.length), uv = new Float32Array(n * lados * 2), ix = [];
    for (let s = 0; s < n; s++) for (let l = 0; l < lados; l++) {
      const i = s * lados + l; uv[i * 2] = s / (n - 1); uv[i * 2 + 1] = l / lados;
      if (s < n - 1) { const j = s * lados + (l + 1) % lados; ix.push(i, i + lados, j, j, i + lados, j + lados); }
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(normal, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(ix);
    const cos = new Float32Array(lados), sin = new Float32Array(lados);
    for (let i = 0; i < lados; i++) { cos[i] = Math.cos(i / lados * Math.PI * 2); sin[i] = Math.sin(i / lados * Math.PI * 2); }
    function atualizar(centros, raio) {
      let nx = 1, ny = 0, nz = 0;
      for (let s = 0; s < n; s++) {
        const a = Math.max(0, s - 1) * 3, b = Math.min(n - 1, s + 1) * 3;
        let tx = centros[b] - centros[a], ty = centros[b + 1] - centros[a + 1], tz = centros[b + 2] - centros[a + 2];
        const len = Math.hypot(tx, ty, tz) || 1; tx /= len; ty /= len; tz /= len;
        const d = nx * tx + ny * ty + nz * tz; nx -= tx * d; ny -= ty * d; nz -= tz * d;
        let nl = Math.hypot(nx, ny, nz);
        if (nl < .001) { nx = -tz; ny = 0; nz = tx; nl = Math.hypot(nx, nz); if (nl < .001) { nx = 1; nl = 1; } }
        nx /= nl; ny /= nl; nz /= nl;
        const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
        for (let l = 0; l < lados; l++) {
          const j = (s * lados + l) * 3, x = nx * cos[l] + bx * sin[l], y = ny * cos[l] + by * sin[l], z = nz * cos[l] + bz * sin[l];
          p[j] = centros[s * 3] + x * raio; p[j + 1] = centros[s * 3 + 1] + y * raio; p[j + 2] = centros[s * 3 + 2] + z * raio;
          normal[j] = x; normal[j + 1] = y; normal[j + 2] = z;
        }
      }
      g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true;
    }
    return { geo: g, atualizar };
  }
  function bezier(out, a, b, c, d) {
    const n = out.length / 3;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), v = 1 - t, j = i * 3;
      out[j] = v*v*v*a.x + 3*v*v*t*b.x + 3*v*t*t*c.x + t*t*t*d.x;
      out[j+1] = v*v*v*a.y + 3*v*v*t*b.y + 3*v*t*t*c.y + t*t*t*d.y;
      out[j+2] = v*v*v*a.z + 3*v*v*t*b.z + 3*v*t*t*c.z + t*t*t*d.z;
    }
  }
  // Nós equidistantes ao longo da curva: evita dobras causadas por amostragem desigual em u.
  function uniformizar(origem, destino, distancias) {
    const n=origem.length/3,m=destino.length/3;distancias[0]=0;
    for(let i=1;i<n;i++){const j=i*3;distancias[i]=distancias[i-1]+Math.hypot(origem[j]-origem[j-3],origem[j+1]-origem[j-2],origem[j+2]-origem[j-1]);}
    let k=1;const total=distancias[n-1];
    for(let i=0;i<m;i++){
      const alvo=i/(m-1)*total;while(k<n-1&&distancias[k]<alvo)k++;
      const f=(alvo-distancias[k-1])/(distancias[k]-distancias[k-1]||1);
      for(let e=0;e<3;e++)destino[i*3+e]=origem[(k-1)*3+e]+(origem[k*3+e]-origem[(k-1)*3+e])*f;
    }
    for(let e=0;e<3;e++){destino[e]=origem[e];destino[(m-1)*3+e]=origem[(n-1)*3+e];}
  }
  // Junta peças estáticas de um mesmo material: uma chamada de desenho, sem biblioteca extra.
  function unir(pecas) {
    const geos = pecas.map(m => { m.updateMatrix(); const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(m.matrix); return g; });
    const g = new THREE.BufferGeometry();
    for (const nome of ['position', 'normal', 'uv']) {
      const size = nome === 'uv' ? 2 : 3, total = geos.reduce((n, x) => n + x.attributes.position.count * size, 0), arr = new Float32Array(total); let offset = 0;
      geos.forEach(x => { if (x.attributes[nome]) arr.set(x.attributes[nome].array, offset); offset += x.attributes.position.count * size; });
      g.setAttribute(nome, new THREE.BufferAttribute(arr, size));
    }
    geos.forEach(x => x.dispose()); pecas.forEach(x => x.geometry.dispose()); return g;
  }
  function retangulo(w, h, r) {
    const s = new THREE.Shape(), x = -w/2, y = -h/2;
    s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r); s.lineTo(x+w,y+h-r); s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    s.lineTo(x+r,y+h); s.quadraticCurveTo(x,y+h,x,y+h-r); s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y); return s;
  }
  // Piso e pilares do mesmo espaco do nucleo e do planeta; tres desenhos estaticos.
  function ambiente(E) {
    const grupo=new THREE.Group();grupo.name='ambiente-clientes';
    // Cota compartilhada com o hub, pés e colisão dos cabos de AmbienteControle.
    const chao=-3.2*E;
    // O piso local já desenha as sombras de contato; offset evita disputa de profundidade.
    const superficie=new THREE.Mesh(new THREE.PlaneGeometry(2000*E,2000*E),new THREE.MeshBasicMaterial({color:0x080706,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}));
    superficie.name='piso-solido';superficie.rotation.x=-Math.PI/2;superficie.position.y=chao;
    grupo.add(superficie);
    const piso=[],colunas=[],arcos=[];
    for(let i=-48;i<=48;i+=2){piso.push(-48*E,chao+.002*E,i*E,48*E,chao+.002*E,i*E,i*E,chao+.002*E,-48*E,i*E,chao+.002*E,48*E);}
    for(let x=-40;x<=40;x+=8)for(let z=-40;z<=40;z+=8){if(Math.hypot(x,z)<12)continue;colunas.push(x*E,chao,z*E,x*E,9*E,z*E);}
    for(let r=22;r<=46;r+=12)for(let j=0;j<128;j++){for(const q of [j,j+1]){const a=q/128*Math.PI;arcos.push(Math.cos(a)*r*E,chao+Math.sin(a)*r*.65*E,-24*E);}}
    for(const [nome,pts,alpha] of [['piso',piso,.14],['colunas',colunas,.05],['arcos',arcos,.08]]){
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
      const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
        uniforms:{uAlpha:{value:alpha},uE:{value:E}},
        vertexShader:'varying float vD;varying vec3 vP;void main(){vP=position;vec4 mv=modelViewMatrix*vec4(position,1.);vD=-mv.z;gl_Position=projectionMatrix*mv;}',
        fragmentShader:'uniform float uAlpha,uE;varying float vD;varying vec3 vP;void main(){float fade=(1.-smoothstep(18.*uE,80.*uE,vD))*(1.-smoothstep(38.*uE,68.*uE,length(vP.xz)));gl_FragColor=vec4(1.,.667,.392,uAlpha*fade);}'
      });const lines=new THREE.LineSegments(geo,mat);lines.name=nome+'-clientes';grupo.add(lines);
    }
    return grupo;
  }

  // G1 (Claude, 05/11): a sala do núcleo — deck em volta da base, borda com guarda-corpo, paredes de painéis em 3 camadas
  // e luzes de serviço no piso. Tudo em linhas/planos leves, no laranja da marca, com fade por distância (mesmo shader do piso).
  // Refs: Control Room isométrico (Roman Klčo, Dribbble) e painéis HUD em camadas. Nada encosta abaixo do piso (cota -3,2E).
  function linhasSala(nome, pts, alpha, E, longe) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uAlpha: { value: alpha }, uE: { value: E }, uLonge: { value: longe || 80 } },
      vertexShader: 'varying float vD;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vD=-mv.z;gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform float uAlpha,uE,uLonge;varying float vD;void main(){float fade=1.-smoothstep(16.*uE,uLonge*uE,vD);gl_FragColor=vec4(1.,.667,.392,uAlpha*fade);}' });
    const l = new THREE.LineSegments(geo, mat); l.name = nome; return l;
  }
  function sala(E) {
    const g = new THREE.Group(); g.name = 'sala-nucleo';
    const chao = -3.2 * E, R_DECK = 5.4 * E, R_BORDA = 5.9 * E;
    const circulo = (pts, r, y, n, a0, a1) => { a0 = a0 || 0; a1 = a1 == null ? Math.PI * 2 : a1; for (let i = 0; i < n; i++) { const t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n; pts.push(Math.cos(t0) * r, y, Math.sin(t0) * r, Math.cos(t1) * r, y, Math.sin(t1) * r); } };
    // Deck: disco escuro (metal fosco) rente ao piso, com juntas radiais e anéis de chapa.
    const deck = new THREE.Mesh(new THREE.CircleGeometry(R_DECK, 96), new THREE.MeshBasicMaterial({ color: 0x0d0a08, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    deck.rotation.x = -Math.PI / 2; deck.position.y = chao + .004 * E; deck.name = 'deck'; g.add(deck);
    const juntas = [];
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; juntas.push(Math.cos(a) * 1.6 * E, chao + .006 * E, Math.sin(a) * 1.6 * E, Math.cos(a) * R_DECK, chao + .006 * E, Math.sin(a) * R_DECK); }
    for (const r of [1.6, 2.6, 4.2]) circulo(juntas, r * E, chao + .006 * E, 96);
    g.add(linhasSala('deck-juntas', juntas, .11, E, 60));
    // Borda do deck: faixa de luz + mureta baixa (degrau) + guarda-corpo fino com postes.
    const faixa = new THREE.Mesh(new THREE.RingGeometry(R_DECK - .03 * E, R_DECK, 128), new THREE.MeshBasicMaterial({ color: 0xff9a4d, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    faixa.rotation.x = -Math.PI / 2; faixa.position.y = chao + .008 * E; faixa.name = 'deck-faixa'; g.add(faixa);
    const mureta = new THREE.Mesh(new THREE.CylinderGeometry(R_BORDA, R_BORDA, .28 * E, 128, 1, true), new THREE.MeshBasicMaterial({ color: 0x120e0b, side: THREE.DoubleSide }));
    mureta.position.y = chao + .14 * E; mureta.name = 'mureta'; g.add(mureta);
    const corrimao = [];
    circulo(corrimao, R_BORDA, chao + .28 * E, 128); circulo(corrimao, R_BORDA, chao + 1.05 * E, 128);
    for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; corrimao.push(Math.cos(a) * R_BORDA, chao + .28 * E, Math.sin(a) * R_BORDA, Math.cos(a) * R_BORDA, chao + 1.05 * E, Math.sin(a) * R_BORDA); }
    g.add(linhasSala('guarda-corpo', corrimao, .14, E, 70));
    // Paredes: 3 camadas de painéis (arcos parciais) cada vez mais altas e fracas; cada painel com moldura e frestas de luz.
    const camadas = [[17, 7, .1, 34], [27, 12, .065, 44], [40, 18, .04, 56]];
    for (const [r, alt, alpha, n] of camadas) {
      const pts = [], frestas = [];
      for (let i = 0; i < n; i++) {
        const a0 = i / n * Math.PI * 2, a1 = (i + .86) / n * Math.PI * 2, x0 = Math.cos(a0) * r * E, z0 = Math.sin(a0) * r * E, x1 = Math.cos(a1) * r * E, z1 = Math.sin(a1) * r * E;
        const h = alt * E * (.72 + .28 * Math.abs(Math.sin(i * 1.7))), y0 = chao, y1 = chao + h;
        pts.push(x0, y0, z0, x0, y1, z0, x1, y0, z1, x1, y1, z1, x0, y1, z0, x1, y1, z1);
        const ym = chao + h * (.35 + .3 * ((i * 7) % 5) / 5);
        pts.push(x0, ym, z0, x1, ym, z1);
        if (i % 3 === 0) { const ys = chao + h * .82; frestas.push(x0 + (x1 - x0) * .2, ys, z0 + (z1 - z0) * .2, x0 + (x1 - x0) * .8, ys, z0 + (z1 - z0) * .8); }
      }
      g.add(linhasSala('parede-' + r, pts, alpha, E, r + 40));
      g.add(linhasSala('frestas-' + r, frestas, alpha * 4.5, E, r + 40));
    }
    // Luzes de serviço: pontilhado radial no piso saindo do deck até a 1ª parede, e pontos na borda.
    const pontos = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + .13; for (let d = 6.6; d < 16.5; d += .9) pontos.push(Math.cos(a) * d * E, chao + .01 * E, Math.sin(a) * d * E); }
    for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; pontos.push(Math.cos(a) * (R_BORDA + .25 * E), chao + .01 * E, Math.sin(a) * (R_BORDA + .25 * E)); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pontos, 3));
    const pm = new THREE.PointsMaterial({ color: 0xff9a4d, size: .09 * E, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false });
    const luzes = new THREE.Points(pg, pm); luzes.name = 'luzes-servico'; g.add(luzes);
    return g;
  }
  function ondaPiso(scene,E){
    const mat=new THREE.MeshBasicMaterial({color:0xff9a4d,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
    const geo=new THREE.RingGeometry(.97,1,128),anel=new THREE.Mesh(geo,mat);
    anel.name='ignicao-piso';anel.rotation.x=-Math.PI/2;anel.position.y=-3.2*E+.025*E;scene.add(anel);
    return {progresso(p){anel.scale.setScalar((1+32*p)*E);mat.opacity=.55*Math.sin(Math.PI*p);},destruir(){scene.remove(anel);geo.dispose();mat.dispose();}};
  }
  const api = { tubo, bezier, uniformizar, unir, retangulo, ambiente, ondaPiso, sala };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.CenarioGeometria = api;
})();
