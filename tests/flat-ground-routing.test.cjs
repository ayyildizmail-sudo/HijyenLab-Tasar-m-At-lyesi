'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),B=require('../frontend/background.js');
function pixels(c){return c.getContext('2d').getImageData(0,0,c.width,c.height).data;}
function canvas(w,h,bg){const c=createCanvas(w,h),x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,w,h);return c;}
function analyze(c){return B.analyze(pixels(c),c.width,c.height);}
function flat(c){return B.inspectFlatGraphic(pixels(c),c.width,c.height);}
function frame(w,h,bg='#f7f7f7',ink='#154936',thickness=.025){const c=canvas(w,h,bg),x=c.getContext('2d');x.strokeStyle=ink;x.lineWidth=Math.min(w,h)*thickness*2;x.strokeRect(0,0,w,h);x.fillStyle=ink;x.font=`bold ${h*.18}px sans-serif`;x.fillText('FRAME',w*.12,h*.57);return c;}
for(const size of [[160,240],[220,320],[300,300]])for(const bg of ['#f7f7f7','#d2e6f1']){
 const c=frame(...size,bg),d=pixels(c),copy=Buffer.from(d),r=analyze(c);
 assert.equal(r.reason,'preserved-frame-ground');assert.equal(r.maskAllowed,false);assert.equal(r.color,bg==='#f7f7f7'?'#ffffff':bg);assert.equal(r.kind,bg==='#f7f7f7'?'white':'color');assert.equal(B.assessMaskAgreement(d,...size,r).allowed,false);assert.deepEqual(Buffer.from(d),copy);
}
for(const color of ['#154936','#191f29','#7d2441']){const c=canvas(220,180,color),x=c.getContext('2d');x.fillStyle='#fff';x.font='bold 30px sans-serif';x.fillText('REVERSE',22,100);const r=analyze(c);assert.equal(r.color,color);assert.notEqual(r.maskAllowed,false);assert(B.assessMaskAgreement(pixels(c),220,180,r).allowed);}
// Padding, clipped strokes and white badge fills do not grant colour deletion.
const padded=canvas(240,240,'#f7f7f7');padded.getContext('2d').drawImage(frame(200,200),20,20);assert.equal(analyze(padded).color,'#ffffff');
const badge=canvas(200,200,'#143f38'),bx=badge.getContext('2d');bx.fillStyle='#fff';bx.fillRect(30,30,140,140);assert.equal(analyze(badge).color,'#143f38');assert.notEqual(analyze(badge).maskAllowed,false);
const clipped=canvas(176,56,'#231f20'),cx=clipped.getContext('2d');cx.fillStyle='#ddd';cx.font='italic 48px sans-serif';cx.fillText('CUT',-12,52);const clippedBefore=Buffer.from(pixels(clipped));flat(clipped);analyze(clipped);assert.deepEqual(Buffer.from(pixels(clipped)),clippedBefore,'classification must not complete clipped glyphs');
// A native thin frame may be diluted in a scan. Never turn a scan's coverage
// into permission to remove its very different native connected region.
const native=frame(1099,1600,'#f6f6f6','#154936',.002),scan=canvas(165,240,'#fff');scan.getContext('2d').drawImage(native,0,0,165,240);
const nativeBytes=pixels(native),nativeBefore=Buffer.from(nativeBytes),scanDetection=analyze(scan);
B.assessMaskAgreement(nativeBytes,native.width,native.height,scanDetection);assert.deepEqual(Buffer.from(nativeBytes),nativeBefore);
// Tiny antialiased strokes are evidence, not a license to fabricate detail.
const thin=canvas(176,56,'#231f20'),tx=thin.getContext('2d');tx.strokeStyle='#ddd';tx.lineWidth=1.3;for(let j=0;j<6;j++){tx.beginPath();tx.moveTo(25+j*20,10);tx.lineTo(30+j*20,40);tx.stroke();}assert(flat(thin).flatGraphic);
const wide=canvas(240,61,'#fff'),wx=wide.getContext('2d');wx.fillStyle='#111';wx.fillRect(15,15,210,32);wx.fillStyle='#fff';wx.font='18px sans-serif';wx.fillText('INVERSE',45,38);assert(flat(wide).flatGraphic);
for(const size of [[176,56],[240,61],[96,96]]){
 const c=canvas(...size,'#eee'),x=c.getContext('2d'),g=x.createLinearGradient(0,0,...size);g.addColorStop(0,'#152849');g.addColorStop(1,'#e4c79b');x.fillStyle=g;x.fillRect(0,0,...size);assert(!flat(c).flatGraphic,'continuous shading is not a ready flat graphic');
 const d=pixels(c);let seed=817;for(let i=0;i<d.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;for(let k=0;k<3;k++)d[i+k]=65+(seed>>>(k*8))%140;}assert(!B.inspectFlatGraphic(d,...size).flatGraphic,'tiny texture/photo stays rejected');
}
// A mask predicted at one scale must not silently erase unrelated geometry.
const c=canvas(80,80,'#fff'),r=analyze(c);assert.equal(B.assessMaskAgreement(pixels(c),80,80,{...r,connected:.15}).allowed,false);
(async()=>{
 const photo=await loadImage(path.join(__dirname,'fixtures/photo-frame-geometry/source.jpeg'));
 for(const box of [[0,0,photo.width,photo.height],[350,300,670,550]]){const c=canvas(176,56,'#fff');c.getContext('2d').drawImage(photo,...box,0,0,176,56);assert(!flat(c).flatGraphic,'bounded thin-stroke path must reject tiny real physical photo');}
 // Customer fixtures remain outside the repository/public payload.
 if(process.env.PRIVATE_CUSTOMER_BATCH){for(const id of ['U20','U25','U28']){
  const rec=JSON.parse(fs.readFileSync(path.join(process.env.PRIVATE_CUSTOMER_BATCH,id,'record.json'))),im=await loadImage(rec.input);
  for(const max of [240,320]){const scale=Math.min(1,max/Math.max(im.width,im.height)),c=canvas(Math.round(im.width*scale),Math.round(im.height*scale),'#fff');c.getContext('2d').drawImage(im,0,0,c.width,c.height);const d=pixels(c),before=Buffer.from(d),r=analyze(c);assert(flat(c).flatGraphic,id+' flat at '+max);if(id==='U25'){const native=canvas(im.width,im.height,'#fff');native.getContext('2d').drawImage(im,0,0);const nativeData=pixels(native),copy=Buffer.from(nativeData);assert.equal(B.assessMaskAgreement(nativeData,native.width,native.height,r).allowed,false);assert.deepEqual(Buffer.from(nativeData),copy);assert.equal(r.reason,'preserved-frame-ground');assert.equal(r.color,'#ffffff');assert.equal(r.kind,'white');assert.equal(r.sourceGroundColor,'#f7f7f7');assert.equal(r.maskAllowed,false);}if(id==='U20'){assert.equal(r.reason,'coherent-small-flat-ground');assert.equal(r.color,'#231f20');}assert.deepEqual(Buffer.from(d),before);}
 }}
 console.log('PASS flat-ground routing: framed planes, native thin strokes, wide inverse, gradients, textures, scale disagreement'+(process.env.PRIVATE_CUSTOMER_BATCH?', private U20/U25/U28':''));
})().catch(e=>{console.error(e);process.exitCode=1;});
