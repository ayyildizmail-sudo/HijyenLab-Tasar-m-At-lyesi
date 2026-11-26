/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS regression tests and VM harness. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const scope={};vm.runInNewContext(fs.readFileSync('frontend/preview-sources.js','utf8'),scope);const samples=scope.PrivatePreviewSamples;
test('24 visible lossless crop PNGs replace all 12 full proof sheets',()=>{
 assert.equal(samples.length,12);const hashes=[];
 for(const s of samples){assert.equal('source'in s,false);assert.equal('file'in s,false);assert.equal('sha256'in s,false);
  for(const face of ['front','back']){assert(/^gallery-examples\/[a-z0-9-]+-(front|back)\.png$/.test(s.files[face]));const b=fs.readFileSync('frontend/'+s.files[face]);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),s.hashes[face]);assert.deepEqual(Array.from(s[face]),[0,0,b.readUInt32BE(16),b.readUInt32BE(20)]);hashes.push(s.hashes[face]);}}
 assert.equal(new Set(hashes).size,24);assert(!fs.existsSync('frontend/private-examples'));
});
test('actual coverage stays honest without public missing-slot placeholders',()=>{
 const counts=Object.fromEntries(['BM12','BM11','BM13','BM15','BM545','BM21','OSHIBORI'].map(p=>[p,samples.filter(s=>s.product===p).length]));assert.deepEqual(counts,{BM12:5,BM11:1,BM13:0,BM15:0,BM545:2,BM21:2,OSHIBORI:2});
 const source=fs.readFileSync('frontend/opening-examples.js','utf8');assert(!source.includes('Örnek bekleniyor'));assert(!source.includes('sampleMissing'));assert(!source.includes('SİZİN MARKANIZ'));const html=fs.readFileSync('frontend/index.html','utf8');assert(html.indexOf('preview-sources.js')<html.indexOf('opening-examples.js'));assert(html.includes('gallery-raster.js'));
});
