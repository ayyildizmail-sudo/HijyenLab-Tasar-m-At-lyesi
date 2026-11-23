// Ürün/tabela fotoğrafından baskı ayırma — yapay sahnelerle (gerçek müşteri görseli yok).
const test=require('node:test'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
const PP=require('../frontend/product-photo.js');
const {LOGOS,SCENES,rng}=require('./benchmark/generate.cjs');
const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function sceneOf(logo,scene,seed){const r=rng(seed),l=LOGOS[logo](r);return {logo:l,photo:SCENES[scene](l,r).canvas};}
const near=(a,b,t)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])<=t;

for(const [logo,scene,seed] of [['twoLine','ambalaj',11],['twoLine','kagit',12],['italicSwoosh','kartvizit',13]])
 test(`${scene} fotoğrafından baskı ayrılır (${logo})`,async()=>{
  const {logo:l,photo}=sceneOf(logo,scene,seed);const r=await PP.extract(pixels(photo),photo.width,photo.height,{});
  assert.equal(r.ok,true,r.reason);assert.equal(r.method,'local-product-photo-v1');
  const d=r.image.data;assert.equal(d[3],0,'köşe şeffaf');let ink=0;for(let i=3;i<d.length;i+=4)if(d[i]>128)ink++;assert.ok(ink>r.image.w*r.image.h*.01,'baskı var');
  assert.ok(r.glyphFraction>=.4,'yazı satırları bulunmalı: '+r.glyphFraction);
  // logonun ana rengi palette olmalı (fotoğraf ışığı nedeniyle toleranslı)
  assert.ok(r.palette.some(p=>near(hex(p),hex(l.inks[0]),95)),`ana renk korunmalı: ${r.palette} ~ ${l.inks[0]}`);
 });
test('koyu zemindeki açık tabela: zemin de tasarıma dahil edilir (opak, zemin renginde)',async()=>{
 const c=createCanvas(1400,900),g=c.getContext('2d');g.fillStyle='#b9b4aa';g.fillRect(0,0,1400,900);g.fillStyle='#173d2c';g.fillRect(200,250,1000,300);
 g.fillStyle='#f6edd2';g.font='bold 170px "DejaVu Serif"';g.fillText('Kumsal',380,460);
 const r=await PP.extract(pixels(c),1400,900,{});assert.equal(r.ok,true,r.reason);assert.equal(r.lightOnDark,true);
 assert.equal(r.image.data[3],255,'opak zemin');assert.ok(near([r.image.data[0],r.image.data[1],r.image.data[2]],[23,61,44],30),'zemin rengi korunmalı');
});
test('gürültü fotoğrafında baskı uydurulmaz',async()=>{
 const c=createCanvas(900,700),g=c.getContext('2d'),R=rng(7),img=g.createImageData(900,700);for(let i=0;i<img.data.length;i+=4){const v=R()*255;img.data[i]=v;img.data[i+1]=R()*255;img.data[i+2]=R()*255;img.data[i+3]=255;}g.putImageData(img,0,0);
 const r=await PP.extract(pixels(c),900,700,{});assert.ok(!r.ok||r.glyphFraction<.2,'gürültüden yazı çıkmamalı');
});
test('aynı fotoğraf her seferinde aynı sonucu verir',async()=>{
 const {photo}=sceneOf('twoLine','ambalaj',11),a=await PP.extract(pixels(photo),photo.width,photo.height,{}),b=await PP.extract(pixels(photo),photo.width,photo.height,{});
 assert.deepEqual([a.palette,a.quarterTurns,a.image.w,a.image.h],[b.palette,b.quarterTurns,b.image.w,b.image.h]);
});
test('modül ağ, depolama veya dış servis kullanmaz',()=>{
 const src=require('node:fs').readFileSync(require('node:path').join(__dirname,'../frontend/product-photo.js'),'utf8');
 for(const banned of ['fetch(','XMLHttpRequest','WebSocket','sendBeacon','localStorage','indexedDB','import('])assert.ok(!src.includes(banned),banned);
});
