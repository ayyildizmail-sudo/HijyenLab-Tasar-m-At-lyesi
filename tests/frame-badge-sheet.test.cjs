// Kenar şeridi/çerçeve kırpma, rozet dış zemini ve teknik çizim sayfası tanıma — yapay görsellerle.
const test=require('node:test'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const FT=require('../frontend/frame-trim.js'),SC=require('../frontend/source-context.js');
const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
async function jpeg(c,q=90){const im=await loadImage(c.toBuffer('image/jpeg',q));const d=createCanvas(im.width,im.height);d.getContext('2d').drawImage(im,0,0);return d;}

function coloredLogo({strip=0,sides=['top','right']}={}){
 const c=createCanvas(1000,700),g=c.getContext('2d');g.fillStyle='#86744c';g.fillRect(0,0,1000,700);
 g.strokeStyle='#ffffff';g.lineWidth=10;g.beginPath();g.moveTo(250,450);g.lineTo(380,250);g.lineTo(380,520);g.stroke();
 g.fillStyle='#ffffff';g.font='bold 120px "DejaVu Sans"';g.fillText('KÖŞE',420,440);
 g.fillStyle='#f2f0ea';for(const s of sides){if(s==='top')g.fillRect(0,0,1000,strip);if(s==='right')g.fillRect(1000-strip,0,strip,700);if(s==='left')g.fillRect(0,0,strip,700);if(s==='bottom')g.fillRect(0,700-strip,1000,strip);}
 return c;
}
test('düz renkli logoda ince açık kenar şeridi kırpılır',async()=>{
 const c=await jpeg(coloredLogo({strip:3}));const r=FT.detect(pixels(c),c.width,c.height);
 assert.ok(r,'kırpılmalı');assert.ok(r.top>=3&&r.right>=3&&r.left===0&&r.bottom===0,JSON.stringify(r));
});
test('şeritsiz düz renkli logo kırpılmaz',async()=>{const c=await jpeg(coloredLogo({strip:0}));assert.equal(FT.detect(pixels(c),c.width,c.height),null);});
test('yalnız en dış tek piksel farklıysa (yeniden örnekleme artığı) kırpılmaz',async()=>{const c=await jpeg(coloredLogo({strip:1,sides:['top','left']}),95);assert.equal(FT.detect(pixels(c),c.width,c.height),null);});
test('beyaz zeminde kenara paralel ince çerçeve çizgileri kırpılır',async()=>{
 const c=createCanvas(1180,414),g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,1180,414);g.fillStyle='#1f5fb0';g.font='bold 110px "DejaVu Sans"';g.fillText('ÖRNEK',300,200);
 g.fillStyle='#595959';g.fillRect(42,0,2,414);g.fillRect(1180-34,0,2,414);
 const r=FT.detect(pixels(await jpeg(c)),1180,414);assert.ok(r&&r.left>=44&&r.right>=34,JSON.stringify(r));
});
test('kenara yakın logo içeriği çerçeve sanılmaz',async()=>{
 const c=createCanvas(800,400),g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,800,400);g.fillStyle='#c0392b';g.fillRect(10,40,30,320);g.font='bold 120px "DejaVu Sans"';g.fillText('ABC',80,250);
 assert.equal(FT.detect(pixels(await jpeg(c)),800,400),null);
});

function badgeOnSquare(ground='#000000'){
 const c=createCanvas(600,600),g=c.getContext('2d');g.fillStyle=ground;g.fillRect(0,0,600,600);
 g.strokeStyle='#e8411c';g.lineWidth=6;g.beginPath();g.arc(300,300,292,0,7);g.stroke();
 g.fillStyle='#d32f2f';g.font='bold 110px "DejaVu Sans"';g.fillText('TURBO',110,330);g.fillStyle='#9e9e9e';g.beginPath();g.arc(300,170,70,0,7);g.fill();return c;
}
test('düz renkli kare zemindeki yuvarlak rozet: dış zemin tanınır',async()=>{
 for(const size of [600,320]){const c=createCanvas(size,size);c.getContext('2d').drawImage(await jpeg(badgeOnSquare()),0,0,size,size);const r=FT.badgeGround(pixels(c),size,size);assert.ok(r,'rozet '+size);assert.equal(r.color.slice(0,3),'#00');}
});
test('siyah zeminde yazı (rozet yok) rozet sayılmaz',async()=>{
 const c=createCanvas(600,600),g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,600,600);g.fillStyle='#fff';g.font='bold 140px "DejaVu Sans"';g.fillText('KRUST',60,340);
 assert.equal(FT.badgeGround(pixels(await jpeg(c)),600,600),null);
});
test('beyaz zemindeki daire logo bu yola girmez (mevcut beyaz zemin yolu)',async()=>{
 const c=createCanvas(600,600),g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,600,600);g.strokeStyle='#000';g.lineWidth=8;g.beginPath();g.arc(300,300,280,0,7);g.stroke();
 assert.equal(FT.badgeGround(pixels(await jpeg(c)),600,600),null);
});

function sheet({vertical=true}={}){
 const c=createCanvas(500,590),g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,500,590);g.fillStyle='#636569';g.fillRect(95,290,320,280);
 g.strokeStyle='#e5007e';g.fillStyle='#e5007e';g.lineWidth=1.5;g.beginPath();g.moveTo(95,270);g.lineTo(415,270);g.stroke();
 if(vertical){g.beginPath();g.moveTo(80,290);g.lineTo(80,570);g.stroke();}g.font='bold 18px "DejaVu Sans"';g.fillText('160 mm',220,262);g.fillText('1 RENK',430,280);
 g.fillStyle='#555';g.fillRect(150,60,90,140);g.fillRect(270,60,90,140);return c;
}
test('pembe ölçü çizgili teknik çizim sayfası tanınır',async()=>{const c=await jpeg(sheet());assert.equal(SC.technicalSheet(pixels(c),c.width,c.height)?.evidence,'technical-drawing-dimension-lines');});
test('tek yönde pembe çizgi (ör. logo alt çizgisi) teknik çizim sayılmaz',async()=>{const c=await jpeg(sheet({vertical:false}));assert.equal(SC.technicalSheet(pixels(c),c.width,c.height),null);});
test('pembe kalın logo teknik çizim sayılmaz',async()=>{
 const c=createCanvas(600,400),g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,600,400);g.fillStyle='#e5007e';g.font='bold 150px "DejaVu Sans"';g.fillText('PEMBE',20,250);g.fillRect(20,280,560,30);g.fillRect(20,20,30,360);
 assert.equal(SC.technicalSheet(pixels(await jpeg(c)),600,400),null);
});
