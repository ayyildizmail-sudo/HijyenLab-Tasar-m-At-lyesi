// Flekso önerisi genel koruma testi: ayrı mavi ve siyah yazılar farklı JPEG kalitelerinde ayrı mürekkep kalmalı.
// Not: Gerçek müşteri görselinde gözlenen zincirleme birleştirme (mavi↔hale↔siyah) bu yapay çizimle birebir
// üretilemedi; o durum yerel (depoya konmayan) gerçek görsel ölçümünde denetlenir.
const test=require('node:test'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const F=require('../frontend/flexo-design-proposal.js');

function artwork(){
 const c=createCanvas(1100,414),g=c.getContext('2d');g.fillStyle='#ffffff';g.fillRect(0,0,1100,414);
 // daire amblem: siyah zemin, içinde gri-beyaz kıvrım ve mavi vurgu
 g.fillStyle='#151515';g.beginPath();g.arc(140,150,110,0,7);g.fill();
 g.strokeStyle='#c7c7c8';g.lineWidth=26;g.beginPath();g.arc(140,150,60,2.2,5.6);g.stroke();
 g.strokeStyle='#0461ac';g.lineWidth=14;g.beginPath();g.arc(140,150,82,5.6,8.4);g.stroke();
 g.fillStyle='#0461ac';g.font='bold 110px "DejaVu Sans"';g.fillText('SÖZEN',290,140);
 g.fillStyle='#151515';g.font='bold 74px "DejaVu Sans"';g.fillText('AHŞAP YAPI',290,240);
 g.fillStyle='#0461ac';g.font='bold 60px "DejaVu Sans"';g.fillText('Alper',420,350);
 return c;
}
const hue=([r,g,b])=>{const mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(mx===mn)return 0;let h=mx===r?(g-b)/(mx-mn):mx===g?2+(b-r)/(mx-mn):4+(r-g)/(mx-mn);return ((h*60)+360)%360;};
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));

for(const q of [70,80,88,92,95,98])test(`JPEG kalite ${q}: mavi ve siyah ayrı mürekkep kalır`,async()=>{
 const img=await loadImage(artwork().toBuffer('image/jpeg',q));const c=createCanvas(img.width,img.height),g=c.getContext('2d');g.drawImage(img,0,0);
 const r=F.proposePixels(g.getImageData(0,0,c.width,c.height).data,c.width,c.height);
 assert.equal(r.applied,true,r.reason);
 const pal=r.metadata.actualProposedPalette.map(rgb);
 assert.ok(pal.some(p=>Math.max(...p)-Math.min(...p)>60&&hue(p)>190&&hue(p)<235),'mavi mürekkep korunmalı: '+r.metadata.actualProposedPalette);
 assert.ok(pal.some(p=>Math.max(...p)<70),'siyah mürekkep korunmalı: '+r.metadata.actualProposedPalette);
});

// Gölgeli, çok renkli resim (maskot/illüstrasyon) 3 mürekkebe indirilmemeli; özgün renkleriyle korunmalı.
function illustration(families){
 const c=createCanvas(900,700),g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,900,700);
 const fams=[['#ffb300','#e65100'],['#e53935','#7f0000'],['#66bb6a','#1b5e20'],['#4fc3f7','#01579b']].slice(0,families);
 fams.forEach(([a,b],k)=>{const x=130+k*210,gr=g.createRadialGradient(x-30,300,10,x,330,130);gr.addColorStop(0,a);gr.addColorStop(1,b);g.fillStyle=gr;g.beginPath();g.ellipse(x,330,95,150,0,0,7);g.fill();g.strokeStyle='#2b1100';g.lineWidth=8;g.stroke();});
 g.fillStyle='#2b1100';g.font='bold 80px "DejaVu Sans"';g.fillText('MASKOT',220,640);return c;
}
async function propose(c,q){const img=await loadImage(c.toBuffer('image/jpeg',q));const d=createCanvas(img.width,img.height),g=d.getContext('2d');g.drawImage(img,0,0);return F.proposePixels(g.getImageData(0,0,d.width,d.height).data,d.width,d.height);}
for(const families of [3,4])test(`${families} renk geçişi aileli resim özgün renklerinde korunur`,async()=>{
 for(const q of [85,95]){const r=await propose(illustration(families),q);assert.equal(r.applied,false);assert.equal(r.reason,'full-color-illustration-preserved');}
});
test('tek geçiş aileli sade logo yine düz renk önerisi alır',async()=>{const r=await propose(illustration(1),90);assert.equal(r.applied,true,r.reason);});
