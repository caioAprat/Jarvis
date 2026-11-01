const assert=require('node:assert/strict');
const {clamp,etapa,quantidade}=require('../landing-movimento');
for(const p of [-1,0,.2,.4,.6,1,2])assert.ok(etapa(p,false)<=3,'O scroll não revela dados antes do acesso');
assert.deepEqual([0,1/3,2/3,1].map(p=>etapa(p,true)),[0,3,6,9]);
assert.deepEqual([1,2/3,1/3,0].map(p=>etapa(p,true)),[9,6,3,0]);
assert.equal(clamp(NaN),0);assert.equal(clamp(Infinity),0);
assert.equal(quantidade(5200,0),5200);assert.equal(quantidade(5200,3),1300);assert.equal(quantidade(5200,100),600);assert.equal(quantidade(400,5),400);
console.log('Landing: acesso, reversão do scroll e orçamento de partículas passaram.');
