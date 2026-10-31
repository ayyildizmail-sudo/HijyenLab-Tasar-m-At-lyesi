/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {selectTextInk,estimate}=require('../frontend/combined-inks.js');
test('white ground reuses exact existing navy, not invented black',()=>{
 const r=selectTextInk(['#142850'],'#ffffff');assert.equal(r.ok,true);assert.equal(r.color,'#142850');assert.ok(r.contrast>=4.5);
 assert.notEqual(r.color,'#000000');
});
test('dark ground selects darkest readable existing light ink, not ground itself',()=>{
 const r=selectTextInk(['#142850','#f5f5f5','#bbbbbb'],'#142850');assert.equal(r.ok,true);assert.equal(r.color,'#bbbbbb');assert.ok(r.contrast>=4.5);
 assert.equal(selectTextInk(['#142850'],'#142850').ok,false);
});
test('white is substrate, not automatically invented as a text ink',()=>{
 const r=selectTextInk(['#142850','#ffffff'],'#142850');assert.equal(r.ok,false);assert.equal(r.color,null);
});
test('no readable palette returns no automatic color',()=>{
 for(const colors of [[],['#f5f5f5'],['#ffffff'],['#ffffff','#f5f5f5']]){const r=selectTextInk(colors,'#ffffff');assert.equal(r.ok,false);assert.equal(r.color,null);assert.match(r.reason,/Yeni renk otomatik eklenmedi/);}
});
test('unknown or malformed palette/ground is rejected',()=>{
 for(const colors of [undefined,null,{},['invalid'],['#142850','invalid'],new Array(1),[new Array(3)]]){const r=selectTextInk(colors,'#ffffff');assert.equal(r.ok,false);assert.equal(r.color,null);assert.equal(r.contrast,null);}
 for(const background of [undefined,null,'bad','#fff',new Array(3)]){assert.equal(selectTextInk(['#142850'],background).ok,false);}
});
test('selector is deterministic and does not mutate palette or choose a lighter eligible ink',()=>{
 const colors=['#800d2e','#142850','#bbbbbb'],before=JSON.stringify(colors),one=selectTextInk(colors,'#ffffff');
 assert.equal(one.color,'#142850');assert.deepEqual(one,selectTextInk(colors,'#ffffff'));assert.equal(JSON.stringify(colors),before);
 assert.equal(selectTextInk([...colors].reverse(),'#ffffff').color,'#142850');
});
test('explicit text choice is handled independently, never changed by selector',()=>{
 const request={front:{status:'estimated',colors:['#142850']},background:'#ffffff',rear:{textColor:'#800d2e'}};
 const before=JSON.stringify(request);assert.equal(selectTextInk(request.front.colors,request.background).color,'#142850');
 const result=estimate(request);assert.equal(result.count,2);assert.ok(result.actualInkColors.includes('#800d2e'));assert.equal(JSON.stringify(request),before);
});
