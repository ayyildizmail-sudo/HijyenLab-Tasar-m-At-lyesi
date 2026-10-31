'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const G=require('../frontend/product-geometry.js');
function fn(s,n){const start=s.indexOf('function '+n+'(');assert(start>=0);let i=s.indexOf('{',start),depth=1;for(++i;depth;i++){if(s[i]==='{')depth++;else if(s[i]==='}')depth--;}return s.slice(start,i);}
const scope={ProductGeometry:G,selectedProductId:'BM21'};scope.globalThis=scope;vm.createContext(scope);
vm.runInContext(fn(fs.readFileSync('frontend/app.js','utf8'),'materialColor')+'\n'+fn(fs.readFileSync('frontend/rear-preview.js','utf8'),'tintRearPixels'),scope);
const profile=G.get('BM21').material;assert.equal(profile.finish,'soft-satin');assert(Object.isFrozen(profile));
for(const id of ['BM12','BM11','BM13','BM15','BM545'])assert.equal(G.get(id).material,undefined);
// The same material function drives front tint and rear pixels. Whites remain source pixels.
for(const bg of ['#ffffff','#000000','#102f59','#800d2e','#fbefd9']){
 const rgb=[1,3,5].map(i=>parseInt(bg.slice(i,i+2),16));
 for(const lum of [0,.3,.65,.9,.97,1]){
  const value=Math.round(lum*255),pixels=new Uint8ClampedArray([value,value,value,255,17,27,37,0]);scope.tintRearPixels(pixels,bg);
  const expected=bg==='#ffffff'?[value,value,value]:Array.from(scope.materialColor(rgb,value/255));assert.deepEqual(Array.from(pixels.slice(0,3)),expected);
  assert.deepEqual(Array.from(pixels.slice(4)),[17,27,37,0]);
 }
}
assert.deepEqual(Array.from(scope.materialColor([0,0,0],1)),[8,8,8]); // soft sheen, not chalk matte or high-gloss 25
scope.selectedProductId='BM12';assert.deepEqual(Array.from(scope.materialColor([0,0,0],1)),[25,25,25]);
for(const lum of [0,.5,.9,1]){const rgb=[70,120,160],base=(.2126*70+.7152*120+.0722*160)/255,spec=Math.pow(Math.max(0,(lum-.86)/.14),1.6)*(base<.12?25:10);assert.deepEqual(Array.from(scope.materialColor(rgb,lum)),rgb.map(v=>Math.round(Math.max(0,Math.min(255,v*(.38+.62*lum)+spec)))));}
console.log('PASS BM21 soft-satin shared white/colored front/rear tint, alpha, and unchanged other products');
