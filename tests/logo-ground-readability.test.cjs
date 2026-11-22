const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../frontend/rear-contrast');
test('bright majority cannot conceal a disappearing minority detail',()=>{
 const score=C.score([{rgb:[255,255,255],count:95},{rgb:[16,47,89],count:5}],'#102f59');
 assert(score.average>3);assert.equal(score.lowFraction,.05);assert.equal(score.weakFraction,.05);
 const recommended=score.lowFraction<=.02&&score.weakFraction<=.1&&score.average>=3;assert.equal(recommended,false);
});
test('source gold is readable on navy and no recommendation invents a new logo color',()=>{
 const source=[{rgb:[222,164,80],count:100}];const before=JSON.stringify(source),score=C.score(source,'#102f59');
 assert(score.average>3);assert.equal(score.weakFraction,0);assert.equal(JSON.stringify(source),before);
});
