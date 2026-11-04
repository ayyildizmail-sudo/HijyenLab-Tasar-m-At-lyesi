/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS regression tests and VM harness. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),Raster=require('../frontend/gallery-raster.js'),setup=require('./helpers/private-gallery-harness.cjs');
test('12 exact sources, both faces, viewport and DPR matrix stays within source pixels and memory limits',()=>{
 const h=setup();let cases=0;for(const s of h.samples)for(const face of ['front','back'])for(const width of [1,321,524,840,4000])for(const dpr of [.75,1,1.5,2,3,8,100]){const p=Raster.plan(width,width*610/1000,dpr,s[face]);assert(p);assert(p.width<=Raster.MAX_EDGE&&p.height<=Raster.MAX_EDGE);assert(p.width*p.height<=Raster.MAX_PIXELS);assert(p.scale<=1+1e-9);assert.equal(p.bytes,p.width*p.height*4);assert(Math.abs(p.drawWidth/s[face][2]-p.drawHeight/s[face][3])<1e-9);cases++;}assert.equal(cases,840);
});
test('mobile DPR follows physical pixels until actual source detail caps allocation',()=>{const r=[864,112,709,322],a=Raster.plan(321,196,1,r),b=Raster.plan(321,196,2,r),c=Raster.plan(321,196,3,r);assert.equal(a.width,321);assert.equal(b.width,642);assert.equal(b.height,392);assert.equal(c.width,709);assert(c.sourceLimited);assert(b.bytes<1000*610*4);assert.equal(Raster.plan(321,196,2,null),null);});
test('resize storms coalesce to one raster draw and DPR changes redraw once without image reload',()=>{
 const h=setup();h.complete();const initial=h.draws.length,imageCount=h.images.length;for(let i=0;i<1000;i++)h.resize();assert.equal(h.frames.size,1);h.root.devicePixelRatio=2;h.flush();assert.equal(h.draws.length,initial+1);assert.equal(h.images.length,imageCount);assert.equal(h.canvas.width,642);h.root.devicePixelRatio=3;h.density.change();h.flush();assert.equal(h.canvas.width,709);assert(Math.max(...h.allocations)<=Raster.MAX_PIXELS);
});
test('100 interrupted source changes cancel old loads, stale results and queued paints; dismissal releases canvas',()=>{
 const h=setup();h.complete();let peak=0;for(let i=0;i<100;i++){h.root.selectedProductId=i%2?'BM12':'BM21';h.sync();peak=Math.max(peak,h.images.filter(i=>i.onload).length);}assert.equal(peak,1);assert(h.images.slice(1,-1).every(i=>i.cancelled&&i.onload===null));h.complete();h.resize();assert.equal(h.frames.size,1);h.upload.listeners.click();assert.equal(h.frames.size,0);h.flush();assert.equal(h.canvas.width*h.canvas.height,1);assert.equal(h.images.filter(i=>i.onload).length,0);
});
