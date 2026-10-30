'use strict';
const assert=require('node:assert/strict');
const modelModule={exports:{}};new Function('module','exports',require('node:fs').readFileSync(require('node:path').join(__dirname,'../frontend/fragrance.js'),'utf8'))(modelModule,modelModule.exports);const F=modelModule.exports;
const ids=['flambau','green_tea','bodrum_mandarin','lemon'];
assert.deepEqual(F.OPTIONS.map(o=>o.id),ids);
assert.deepEqual(F.OPTIONS.map(o=>o.label),['Flambau çiçeği','Yeşil çay','Bodrum mandalinası','Limon']);
assert.deepEqual(F.OPTIONS.map(o=>o.seed),[315,95,55,35]);
assert.equal(F.OPTIONS.reduce((n,o)=>n+o.seed,0),500);
for(const id of ids)assert.equal(F.validId(id),true);
for(const id of ['unscented','kokusuz','rose','Flambau','',null,undefined,0,{},['lemon'],'toString','__proto__'])assert.equal(F.validId(id),false);
const percentages={flambau:63,green_tea:19,bodrum_mandarin:11,lemon:7};
assert.deepEqual(F.seedStats(),{seedVersion:'500-v1',source:'seed',productFamily:'towels',percentages});
const live={seedVersion:'500-v1',source:'shared',productFamily:'towels',percentages:{flambau:62,green_tea:20,bodrum_mandarin:11,lemon:7}};
assert.deepEqual(F.normalizeStats(live),live);
// UI receives percentages only; never synthesize a global count from this payload.
for(const key of ['counts','total'])assert.equal(Object.hasOwn(F.normalizeStats(live),key),false);
const clone=v=>JSON.parse(JSON.stringify(v));
for(const bad of [null,undefined,[],{},'shared',F.seedStats(),{...live,seedVersion:'old'},{...live,source:'local'}, {...live,percentages:null},{...live,percentages:[]}, {...live,percentages:{flambau:63,green_tea:19,bodrum_mandarin:18}}, {...live,percentages:{...percentages,unscented:0}}, {...live,percentages:{...percentages,lemon:8}}])assert.throws(()=>F.normalizeStats(bad));
for(const value of [-1,101,1.5,NaN,Infinity,-Infinity,'63',null,undefined,true]){const bad=clone(live);bad.percentages.flambau=value;assert.throws(()=>F.normalizeStats(bad));}
const edge={...live,percentages:{flambau:0,green_tea:0,bodrum_mandarin:0,lemon:100}};
assert.deepEqual(F.normalizeStats(edge),edge);
const before=clone(live);F.normalizeStats(live);assert.deepEqual(live,before);
console.log('PASS fragrance: four options, latest 500 seed / 63-19-11-7, valid IDs, shared percentage contract, invalid payload rejection and input preservation');

for(const productFamily of ['wetwipes','',null,undefined,1])assert.throws(()=>F.normalizeStats({...live,productFamily}));
console.log('PASS fragrance family isolation: towels only, wetwipes/missing/invalid rejected');
