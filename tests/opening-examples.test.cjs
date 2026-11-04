/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS regression tests and VM harness. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),setup=require('./helpers/private-gallery-harness.cjs');
test('five real BM12 samples autoplay, preserve crop ratios, and finish on blank',()=>{
 const h=setup();h.complete();assert.equal(h.nodes.sampleTitle.textContent,'Orkun Group');assert.equal(h.timers.size,1);let a=h.draws.at(-1);assert(Math.abs(a[7]/a[3]-a[8]/a[4])<1e-9);
 h.nodes.sampleBack.onclick();assert.equal(h.timers.size,0);h.complete();assert.equal(h.draws.at(-1)[2],0);assert(h.images.at(-1).src.startsWith('gallery-examples/orkun-back.png?v='));
 for(const name of ['Sierra Aviation','Ateş Ocakbaşı','Genel Havacılık A.Ş.','Gastrokars']){h.tick();h.complete();assert.equal(h.nodes.sampleTitle.textContent,name);}h.tick();assert(h.nodes.openingExamples.hidden);h.sync();assert(h.nodes.openingExamples.hidden);
});
test('short galleries show only available real samples, then blank; empty products skip gallery',()=>{
 for(const [id,count]of [['BM11',1],['BM545',2],['BM21',2],['OSHIBORI',2]]){const h=setup();h.root.selectedProductId=id;h.sync();h.complete();assert.equal(h.samples.filter(s=>s.product===id).length,count);for(let i=1;i<count;i++){h.tick();h.complete();}h.tick();assert(h.nodes.openingExamples.hidden,id);assert.equal(h.canvas.width*h.canvas.height,1);assert.equal(h.timers.size,0);}
 for(const id of ['BM13','BM15']){const h=setup();h.root.selectedProductId=id;h.sync();assert(h.nodes.openingExamples.hidden);assert.equal(h.canvas.width*h.canvas.height,1);assert.equal(h.timers.size,0);}
});
test('stale callbacks and front/back face changes never paint a mismatched crop',()=>{
 const h=setup();h.complete();h.nodes.sampleBack.onclick();const stale=h.images.at(-1).onload;h.nodes.sampleFront.onclick();stale();assert.equal(h.canvas.width*h.canvas.height,1);h.complete();assert(h.draws.at(-1)[0].src.startsWith('gallery-examples/orkun-front.png'));
 h.root.selectedProductId='BM21';h.sync();const old=h.images.at(-1).onload;h.root.selectedProductId='BM12';h.sync();old();h.complete();assert.equal(h.nodes.sampleTitle.textContent,'Orkun Group');assert.equal(new Set(h.samples.flatMap(x=>Object.values(x.hashes))).size,24);
});
test('pause, upload cancellation and customer/quote isolation are preserved',()=>{
 const h=setup(),before=JSON.stringify(h.state);h.complete();h.nodes.samplePause.onclick();assert.equal(h.timers.size,0);h.nodes.samplePause.onclick();h.tick();h.complete();assert.equal(h.nodes.sampleTitle.textContent,'Sierra Aviation');h.upload.listeners.click();h.sync();assert(h.nodes.openingExamples.hidden);assert.equal(h.timers.size,0);assert.equal(JSON.stringify(h.state),before);assert.equal(h.canvas.width*h.canvas.height,1);
});
