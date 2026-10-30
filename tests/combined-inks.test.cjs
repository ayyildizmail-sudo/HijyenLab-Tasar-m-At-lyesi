'use strict';const assert=require('assert/strict'),fs=require('fs'),vm=require('vm'),C=require('../frontend/combined-inks.js');
const base={front:{status:'estimated',colors:['#000000']},background:'#ffffff',rear:{textColor:'#111111',qr:true}};
assert.equal(C.estimate(base).count,1);assert.equal(C.estimate(base).status,'estimated');assert(C.estimate(base).estimateOnly);
assert.equal(C.estimate({...base,background:'#800d2e'}).count,2);
assert.equal(C.estimate({...base,front:{status:'estimated',colors:['#800d2e']},background:'#800d2e',rear:{textColor:'#800d2e'}}).count,1);
assert.equal(C.estimate({front:{status:'none'},background:'#ffffff'}).count,0);
assert.equal(C.estimate({...base,rear:{textColor:'#ffffff'}}).count,1);
assert.equal(C.estimate({...base,background:'#fefefe'}).count,2,'Explicit nonwhite ground must count');
assert.equal(C.estimate({...base,front:{status:'estimated',colors:['#000000','#777777','#bbbbbb'],monochrome:true}}).count,1);
assert.equal(C.estimate({...base,front:{status:'unknown',colors:['#000000','#777777'],monochrome:true}}).status,'unknown');
assert.equal(C.estimate({...base,front:{status:'estimated',colors:['#000000','#777777']}}).count,2,'Do not assume gray is shadow');
assert.equal(C.estimate({...base,front:{status:'estimated',colors:['#aa0000','#0000aa'],monochrome:true}}).status,'unknown');
const sponsor={status:'estimated',method:'native-alpha-trim',inkSamples:[{rgb:[0,0,0],count:100},{rgb:[12,12,12],count:10},{rgb:[255,255,255],count:100}]};
assert.equal(C.estimate({...base,rear:{...base.rear,sponsor}}).count,1);
assert.equal(C.estimate({...base,rear:{sponsor:{...sponsor,method:'rear-white-carrier-photo'}}}).status,'unknown');
assert.equal(C.estimate({...base,rear:{sponsor:{...sponsor,method:'rear-white-carrier-photo',recolor:'#000000'}}}).count,1);
assert.equal(C.estimate({...base,rear:{sponsor:{...sponsor,inkSamples:[{rgb:[255,0,0],count:10},{rgb:[0,0,255],count:10}]}}}).status,'unknown');
assert.equal(C.estimate({...base,rear:{sponsor:{...sponsor,inkSamples:[]}}}).status,'unknown');
assert.equal(C.estimate({...base,front:{status:'estimated',colors:['bogus']}}).status,'unknown');assert.equal(C.estimate({...base,background:null}).status,'unknown');assert.equal(C.estimate({}).status,'unknown');
assert.equal(C.estimate({...base,front:{status:'estimated',uncertain:true,colors:['#000000']}}).count,null);
assert.equal(C.estimate({front:{status:'none'},background:'#a00000',rear:{textColor:'#a10000',sponsor:{status:'estimated',recolor:'#a10000'}}}).count,2,'Repeated explicit nearcolor must not duplicate');
const before=JSON.stringify(base);C.estimate(base);assert.equal(JSON.stringify(base),before);const samplesBefore=JSON.stringify(sponsor);C.estimate({...base,rear:{sponsor}});assert.equal(JSON.stringify(sponsor),samplesBefore);
const browser={};vm.createContext(browser);vm.runInContext(fs.readFileSync('frontend/combined-inks.js','utf8'),browser);assert.equal(browser.CombinedInks.estimate(base).count,1);

for(const background of ['#ffffff','#000000']){const pale=C.estimate({front:{status:'estimated',colors:['#f5f5f5']},background});assert.equal(pale.count,background==='#ffffff'?1:2,'Trusted pale-gray foreground is ink, never white substrate');const ps=C.estimate({front:{status:'none'},background,rear:{sponsor:{status:'estimated',method:'native-alpha-trim',inkSamples:[{rgb:[245,245,245],count:100}]}}});assert.equal(ps.count,background==='#ffffff'?1:2,'Trusted pale-gray sponsor must count');}
assert.equal(C.estimate({front:{status:'estimated',colors:['#ffffff']},background:'#ffffff'}).count,0);
// QR reuses the existing design ink without introducing a new black plate.
for(const color of ['#142850','#800d2e','#135b32']){const design={front:{status:'estimated',colors:[color]},background:'#ffffff',rear:{qr:true}};const q=C.estimate(design);assert.equal(q.status,'estimated');assert.equal(q.count,1);assert.equal(q.qrColor,color);assert(!q.colors.includes('#000000'));assert.equal(C.estimate({...design,rear:{qr:false}}).count,q.count);}
assert.equal(C.estimate(base).qrColor,'#000000');
assert.equal(C.estimate({...base,front:{status:'unknown',colors:['#000000']}}).qrColor,null);
const paleQr=C.estimate({front:{status:'estimated',colors:['#f5f5f5']},background:'#ffffff',rear:{qr:true}});assert.equal(paleQr.status,'unknown');assert.equal(paleQr.count,null);assert.equal(paleQr.qrColor,null);assert.deepEqual(paleQr.colors,['#f5f5f5']);assert(paleQr.reason.includes('Yeni renk otomatik eklenmedi'));
assert.equal(C.estimate({front:{status:'none'},background:'#ffffff',rear:{qr:true}}).status,'unknown');
const sponsorQr=C.estimate({front:{status:'estimated',colors:['#f5f5f5']},background:'#ffffff',rear:{qr:true,sponsor:{status:'estimated',method:'native-alpha-trim',inkSamples:[{rgb:[20,40,80],count:100}]}}});assert.equal(sponsorQr.qrColor,'#142850');assert.equal(sponsorQr.count,2);
assert.equal(C.selectQrInk(['#800d2e','#142850']).color,'#142850');assert.equal(C.selectQrInk(['#ffffff']).ok,false);assert.equal(C.selectQrInk(['invalid']).ok,false);assert.equal(C.selectQrInk(['#f5f5f5']).ok,false);assert.equal(C.selectQrInk(['#000000']).contrast,21);
const charcoal=C.estimate({front:{status:'estimated',colors:['#181818']},background:'#ffffff',rear:{qr:true,textColor:'#222222'}});assert.equal(charcoal.count,1);assert.equal(charcoal.qrColor,'#181818');assert.deepEqual(charcoal.actualInkColors,['#181818','#222222']);
const sampledDark=C.estimate({front:{status:'estimated',colors:['#2b2b2b']},background:'#ffffff',rear:{textColor:'#111111',qr:true}});assert.equal(sampledDark.count,1);assert.equal(sampledDark.qrColor,'#111111');assert.deepEqual(sampledDark.actualInkColors,['#2b2b2b','#111111']);
assert.equal(C.estimate({front:{status:'estimated',colors:['#000000']},background:'#ffffff',rear:{textColor:'#2b2b2b',qr:true}}).count,2,'Explicitly chosen gray must remain separate from black');
console.log('PASS combined inks: existing darkest ink QR without new black; unknown/light-only guards; sponsor included before QR selection; front/rear union, pale-gray ink and immutable inputs');
