/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../frontend/combined-inks.js');
const ink=colors=>({status:'estimated',colors});
const base={front:ink(['#142850']),background:'#ffffff',rear:{sponsor:{status:'estimated',method:'native-alpha-trim',inkSamples:[{rgb:[20,40,80],count:100}]}}};
test('4+4 logos with one common ink count one plate, not eight',()=>{
 const design={...base,additional:Array.from({length:6},()=>ink(['#142850','#ffffff']))};
 const r=C.estimate(design);
 assert.equal(r.status,'estimated');assert.equal(r.count,1);assert.deepEqual(r.actualInkColors,['#142850']);
});
test('all prepared palettes union distinct inks and shared ground only once',()=>{
 const r=C.estimate({...base,background:'#800d2e',additional:[ink(['#800d2e','#142850']),ink(['#135b32']),ink(['#135b32','#800d2e'])]});
 assert.equal(r.count,3);assert.equal(r.status,'estimated');
 assert.deepEqual(new Set(r.actualInkColors),new Set(['#142850','#800d2e','#135b32']));
});
test('any unknown, pending, uncertain or malformed asset leaves price unknown, never zero',()=>{
 for(const asset of [null,{}, {status:'unknown',colors:[]},{status:'pending',colors:['#142850']},{status:'estimated'},{status:'estimated',colors:['bad']},{status:'estimated',colors:new Array(1)},{status:'estimated',colors:[[20,40,80]]},{status:'estimated',colors:['#142850'],uncertain:true},{status:'estimated',colors:[],uncertain:'false'}]){
  const r=C.estimate({...base,additional:[asset]});assert.equal(r.status,'unknown');assert.equal(r.count,null);assert.equal(r.qrColor,null);
 }
 for(const additional of [null,{},'bad',Array.from({length:7},()=>ink(['#142850']))])assert.equal(C.estimate({...base,additional}).count,null);
});
test('QR uses darkest extra ink and recomputes after removing it, never adds black',()=>{
 const design={front:ink(['#f5f5f5']),background:'#ffffff',rear:{qr:true},additional:[ink(['#800d2e']),ink(['#142850'])]};
 const r=C.estimate(design);assert.equal(r.qrColor,'#142850');assert.equal(r.count,3);assert(!r.actualInkColors.includes('#000000'));
 assert.equal(C.estimate({...design,additional:design.additional.slice(0,1)}).qrColor,'#800d2e');
 const removed=C.estimate({...design,additional:[]});assert.equal(removed.status,'unknown');assert.equal(removed.count,null);assert.equal(removed.qrColor,null);assert.deepEqual(removed.actualInkColors,['#f5f5f5']);
});
test('unknown extra blocks QR even when a known dark primary exists',()=>{
 const r=C.estimate({...base,rear:{...base.rear,qr:true},additional:[{status:'unknown',colors:['#142850']}]});
 assert.equal(r.qrColor,null);assert.equal(r.count,null);
});
test('white is excluded but pale ink is retained; union over six inks stays unknown',()=>{
 assert.equal(C.estimate({...base,additional:[ink(['#ffffff','#f5f5f5'])]}).count,2);
 const r=C.estimate({...base,additional:[ink(['#ff0000','#00ff00','#0000ff','#ffff00','#00ffff','#ff00ff'])]});
 assert.equal(r.count,null);assert.equal(r.status,'unknown');
});
test('legacy single-logo inputs stay unchanged and extra arrays are immutable',()=>{
 assert.deepEqual(C.estimate(base),C.estimate({...base,additional:[]}));
 const design={...base,additional:[ink(['#800d2e','#142850'])]};const before=JSON.stringify(design);C.estimate(design);assert.equal(JSON.stringify(design),before);
});
