/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS regression harness. */
// Optional private source: VIEWER_SOURCE=/absolute/path node tests/viewer-chrome-family.test.cjs
// Resizes/JPEG derivatives belong to ONE source family, not independent examples.
const assert=require('node:assert/strict'),{createCanvas,loadImage}=require('@napi-rs/canvas'),D=require('../frontend/screenshot-artwork.js');
const results=[];function test(name,fn){try{fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.message});}}
function fixture(w=460,h=1000){const c=createCanvas(w,h),x=c.getContext('2d');x.scale(w/460,h/1000);x.fillStyle='#fff';x.fillRect(0,0,460,1000);
 x.fillStyle='#267b65';x.beginPath();x.roundRect(35,12,70,24,12);x.fill();x.fillStyle='white';x.font='bold 17px sans-serif';x.fillText('12:34',41,30);
 x.fillStyle='#111';for(let i=0;i<4;i++)x.fillRect(350+i*7,28-i*3,4,5+i*3);x.fillRect(393,19,18,12);
 x.font='bold 20px sans-serif';x.fillText('Document preview',100,83);
 x.strokeStyle='#111';x.lineWidth=5;x.beginPath();x.moveTo(407,64);x.lineTo(429,86);x.moveTo(429,64);x.lineTo(407,86);x.stroke();
 x.beginPath();x.moveTo(395,937);x.lineTo(395,956);x.lineTo(421,956);x.lineTo(421,937);x.moveTo(408,946);x.lineTo(408,925);x.moveTo(400,932);x.lineTo(408,925);x.lineTo(416,932);x.stroke();
 x.strokeStyle='#682248';x.lineWidth=8;x.beginPath();x.ellipse(235,570,160,60,0,0,Math.PI*2);x.stroke();x.fillStyle='#25583c';x.font='italic bold 48px serif';x.fillText('Sample',135,590);return{c,x,w,h};}
function detect(f){return D.detect(f.x.getImageData(0,0,f.w,f.h).data,f.w,f.h);}
function white(f,x,y,w,h){f.x.fillStyle='#fff';f.x.fillRect(x,y,w,h);}
for(const [w,h]of [[460,1000],[370,800],[600,1300]])test(`Synthetic joint viewer ${w}x${h}`,()=>{const r=detect(fixture(w,h));assert.equal(r?.confidence,'joint-viewer-chrome');assert.deepEqual([r.box[0],r.box[2]],[0,w]);assert.ok(r.box[1]<h*.508&&r.box[3]>h*.632);});
test('Poster header/footer without status row is untouched',()=>{const f=fixture();white(f,0,0,460,50);assert.equal(detect(f),null);});
test('Status row alone does not authorize crop',()=>{const f=fixture();white(f,0,50,460,100);assert.equal(detect(f),null);});
test('Lone close/share-like brand marks are untouched',()=>{const f=fixture();white(f,0,0,460,50);white(f,90,50,270,60);assert.equal(detect(f),null);});
test('Missing corner control does not authorize crop',()=>{const f=fixture();white(f,0,880,460,120);assert.equal(detect(f),null);});
test('Multiple interior panels stop rather than drop a brand',()=>{const f=fixture();f.x.fillStyle='#333';f.x.fillRect(130,310,200,35);const r=detect(f);assert.ok(r?.needsSelection&&!r.box);});
test('Separate pale caption also stops rather than disappearing',()=>{const f=fixture();f.x.fillStyle='#f9f9f9';f.x.fillRect(130,740,200,8);const r=detect(f);assert.ok(r?.needsSelection&&!r.box);});
test('Intentional colored frame within content retained',()=>{const f=fixture();f.x.strokeStyle='#98762a';f.x.strokeRect(15,490,430,160);const r=detect(f);assert.ok(r?.box);assert.ok(r.box[1]<490&&r.box[3]>650);});
test('Frame spanning UI and content cannot be silently cropped',()=>{const f=fixture();f.x.strokeStyle='#98762a';f.x.strokeRect(15,120,430,730);const r=detect(f);assert.ok(!r?.box);});
test('Genuine gray and near-white contours preserve their rows',()=>{const f=fixture();f.x.strokeStyle='#aaa';f.x.lineWidth=3;f.x.strokeRect(20,485,420,170);f.x.strokeStyle='#f4f4f4';f.x.strokeRect(17,480,426,180);const r=detect(f);assert.ok(r?.box);assert.ok(r.box[1]<480&&r.box[3]>660);});
test('Tiny full-resolution detached mark cannot vanish during scan',()=>{const f=fixture(942,2048),p=f.x.getImageData(0,0,f.w,f.h);const sampled=new Set(Array.from({length:1000},(_,y)=>Math.floor(y*2048/1000)));let y=1500;while(sampled.has(y))y++;for(const x of [500,501])p.data.set([249,249,249,255],(y*f.w+x)*4);const r=D.detect(p.data,f.w,f.h);assert.ok(r?.needsSelection&&!r.box);});
test('Detection does not mutate any source bytes',()=>{const f=fixture(),p=f.x.getImageData(0,0,f.w,f.h).data,before=Buffer.from(p);D.detect(p,f.w,f.h);assert.deepEqual(Buffer.from(p),before);});
test('Photographic texture within viewer stops',()=>{const f=fixture();const p=f.x.createImageData(360,200);let seed=13;for(let i=0;i<p.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;p.data.set([seed&255,(seed>>>8)&255,(seed>>>16)&255,255],i);}f.x.putImageData(p,50,470);const r=detect(f);assert.ok(r?.needsSelection&&!r.box);});
(async()=>{
 for(const file of ['tests/fixtures/sponsor-source/packet.jpeg','tests/fixtures/photo-frame-geometry/source.jpeg']){const i=await loadImage(file),c=createCanvas(i.width,i.height),x=c.getContext('2d');x.drawImage(i,0,0);test(`Physical source not corner-viewer crop: ${file}`,()=>assert.notEqual(D.detect(x.getImageData(0,0,i.width,i.height).data,i.width,i.height)?.confidence,'joint-viewer-chrome'));}
 if(process.env.VIEWER_SOURCE){const original=await loadImage(process.env.VIEWER_SOURCE);for(const [h,q]of [[original.height,null],[1600,null],[1200,85],[800,70],[1600,55]]){const w=Math.round(original.width*h/original.height),c=createCanvas(w,h),x=c.getContext('2d');x.drawImage(original,0,0,w,h);if(q){const jpeg=await loadImage(c.toBuffer('image/jpeg',q));x.drawImage(jpeg,0,0);}test(`Private same-source family h=${h} jpeg=${q??'original-decoded'}`,()=>{const r=D.detect(x.getImageData(0,0,w,h).data,w,h);assert.equal(r?.confidence,'joint-viewer-chrome');assert.equal(r.box[0],0);assert.equal(r.box[2],w);assert.ok(r.box[1]/h<.537&&r.box[1]/h>.45);assert.ok(r.box[3]/h>.683&&r.box[3]/h<.75);});}}
 console.log(JSON.stringify({privateFamilyRun:Boolean(process.env.VIEWER_SOURCE),results},null,2));if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
