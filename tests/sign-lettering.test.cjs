// Fotoğraftaki tabela harflerinden yerel logo: yapay sahnelerle genel davranış.
// Sahneler müşteri görseli içermez; tabela harfleri şablonlardan FARKLI bir yazı tipiyle (DejaVu Sans Bold) çizilir.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
const SL=require('../frontend/sign-lettering.js');
for(const w of SL.WEIGHTS)assert.ok(GlobalFonts.registerFromPath(path.join(__dirname,`../frontend/assets/fonts/inter-${w}.woff2`),SL.family(w)),'yazı tipi '+w);
assert.ok(GlobalFonts.registerFromPath(path.join(__dirname,'fixtures/fonts/dejavu-sans-bold-subset.ttf'),'TestSign'));

// Basit, tekrarlanabilir sözde rastgele sayı üreteci
function rng(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
async function jpegRoundTrip(canvas,quality=.6){return loadImage(canvas.toBuffer('image/jpeg',Math.round(quality*100)));}
function scene({word,ink='#2f8a5a',panels=true,angle=4,width=1000,height=760,seed=1,letters=true,downscale=1}){
 const c=createCanvas(width,height),g=c.getContext('2d'),r=rng(seed);
 const wall=g.createLinearGradient(0,0,0,height);wall.addColorStop(0,'#dcdcd8');wall.addColorStop(1,'#cfcfca');g.fillStyle=wall;g.fillRect(0,0,width,height);
 g.strokeStyle='#3a62a8';g.lineWidth=14;g.strokeRect(width*.42,height*.14,width*.16,height*.22);g.strokeRect(width*.78,height*.16,width*.16,height*.22); // mavi pencere çerçeveleri
 g.fillStyle='#8b6f4e';g.beginPath();g.arc(width*.5,height*.3,30,0,7);g.fill(); // fıçı benzeri leke
 if(letters){
  g.save();g.translate(width/2,height*.48);g.rotate(angle*Math.PI/180);
  const n=word.length,cell=Math.min(110,(width*.8)/n),h=cell*1.05;
  g.fillStyle='#7a5b3e';g.fillRect(-n*cell/2-12,-h/2-10,n*cell+24,h+20); // ahşap tahta
  g.font=`bold ${Math.round(h*.72)}px "TestSign"`;g.textAlign='center';g.textBaseline='middle';
  [...word].forEach((ch,i)=>{const x=-n*cell/2+i*cell+cell/2;if(panels){g.fillStyle='#ecebe6';g.fillRect(x-cell*.44,-h/2,cell*.88,h);}else if(i===0){g.fillStyle='#ecebe6';g.fillRect(-n*cell/2,-h/2,n*cell,h);}
   if(ch!==' '){g.fillStyle=ink;g.fillText(ch,x,h*.04);}});
  g.restore();
 }
 for(let i=0;i<14;i++){g.fillStyle=i%2?'#f2f2f0':'#8a8f8c';g.fillRect(i*width/14,height*.62,width/14,height*.1);} // tente
 g.fillStyle='#2b2b2b';g.fillRect(0,height*.72,width,height*.28); // gölgeli giriş
 const img=g.getImageData(0,0,width,height);for(let p=0;p<img.data.length;p+=4){const n=(r()-.5)*18;img.data[p]+=n;img.data[p+1]+=n;img.data[p+2]+=n;}g.putImageData(img,0,0);
 if(downscale!==1){const d=createCanvas(Math.round(width*downscale),Math.round(height*downscale));d.getContext('2d').drawImage(c,0,0,d.width,d.height);return d;}
 return c;
}
function hueOf(hex){const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return SL._internal.hsv(r,g,b)[0]*360;}
const hueGap=(a,b)=>{const d=Math.abs(a-b)%360;return Math.min(d,360-d);};
function singleColorTransparent(canvas){const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;const corner=d[3];let colors=new Set();for(let p=0;p<d.length;p+=4)if(d[p+3]>250)colors.add(d[p]+','+d[p+1]+','+d[p+2]);return {corner,colors:colors.size};}

const POSITIVE=[
 {name:'ters harfli yeşil tabela (MAИUEL)',word:'MAИUEL',ink:'#2f8a5a',angle:4,seed:3},
 {name:'kırmızı, ters eğik tabela (KAFE)',word:'KAFE',ink:'#c0392b',angle:-3,seed:5},
 {name:'Türkçe harfler, tek parça zemin (GÜNEŞ)',word:'GÜNEŞ',ink:'#d35400',panels:false,angle:2,seed:7},
 {name:'çengelli ve noktalı harfler (ÇİĞ)',word:'ÇİĞ',ink:'#1f6f8b',panels:false,angle:-2,seed:9},
 {name:'iki kelime ve rakam (BODRUM 48)',word:'BODRUM 48',ink:'#6c3483',panels:false,angle:1,seed:11},
 {name:'düşük çözünürlük (LİMON, 0,4×)',word:'LİMON',ink:'#2e7d32',angle:3,seed:13,downscale:.4},
];
for(const c of POSITIVE)test('tanır: '+c.name,async()=>{
 const img=await jpegRoundTrip(scene(c)),r=SL.fromImage(img,{createCanvas});
 assert.equal(r.ok,true,'sonuç üretilmeli: '+JSON.stringify(r.letters?.map(l=>l.ch+':'+l.score.toFixed(2)+'/'+l.second+'/'+l.margin.toFixed(2))||r.reason));
 assert.equal(r.word,c.word);
 assert.ok(SL.WEIGHTS.includes(r.weight));
 assert.ok(hueGap(hueOf(r.color),hueOf(c.ink))<=20,`renk tonu korunmalı: ${r.color} ~ ${c.ink}`);
 const o=singleColorTransparent(r.canvas);assert.equal(o.corner,0,'zemin şeffaf');assert.ok(o.colors<=1,'tek renk (tek klişe)');
 assert.equal(r.method,'local-sign-lettering-v1');
});

test('harf yoksa sonuç üretmez (aynı sahne, tabelasız)',async()=>{
 const r=SL.fromImage(await jpegRoundTrip(scene({word:'X',letters:false,seed:21})),{createCanvas});
 assert.equal(r.ok,false);
});
test('renkli şekiller harf sanılmaz',async()=>{
 const c=createCanvas(800,600),g=c.getContext('2d'),r=rng(4);g.fillStyle='#f4f1ea';g.fillRect(0,0,800,600);
 for(let i=0;i<9;i++){g.fillStyle=['#c0392b','#2f8a5a','#1f6f8b'][i%3];g.beginPath();const x=80+i*80,y=300+(r()-.5)*40;if(i%3===0)g.arc(x,y,28,0,7);else if(i%3===1){g.moveTo(x,y-30);g.lineTo(x+30,y+28);g.lineTo(x-30,y+28);}else g.rect(x-25,y-25,50,50);g.fill();}
 const res=SL.fromImage(await jpegRoundTrip(c),{createCanvas});assert.equal(res.ok,false,'şekiller harf dizisi olarak tanınmamalı: '+res.word);
});
test('aynı görsel her seferinde aynı sonucu verir',async()=>{
 const img=await jpegRoundTrip(scene(POSITIVE[0])),a=SL.fromImage(img,{createCanvas}),b=SL.fromImage(img,{createCanvas});
 assert.deepEqual([a.word,a.weight,a.color],[b.word,b.weight,b.color]);
});
test('çok küçük görsel güvenle reddedilir',()=>{
 const c=createCanvas(30,30);assert.deepEqual(SL.fromImage(c,{createCanvas}).ok,false);
});
test('modül ağ, depolama veya dış servis kullanmaz',()=>{
 const src=require('node:fs').readFileSync(path.join(__dirname,'../frontend/sign-lettering.js'),'utf8');
 for(const banned of ['fetch(','XMLHttpRequest','WebSocket','navigator.sendBeacon','localStorage','indexedDB','import('])assert.ok(!src.includes(banned),banned+' kullanılmamalı');
});

// Toplu güvenlik kapısı: 42 yapay tabela. Yanlış kelime ASLA üretilmemeli; emin olunmayan durumda sonuç üretilmemesi kabul edilir.
test('42 yapay tabelada hiç yanlış sonuç yok, en az 26 doğru',async()=>{
 const set1=[['PİDE','#b03a2e',true,-4,1],['ÖZTÜRK','#154360',false,3,1],['SAHİL 7','#117a65',false,-1,1],['MARİNA','#7d3c98',true,5,1],['ÇAY EVİ','#a04000',false,-3,1],['BALIK','#1a5276',true,2,.5],['KUAFÖR','#922b21',true,-2,1],['DÖNER','#b9770e',false,4,1],['OTEL','#196f3d',true,-5,.6],['BUTİK 2','#6e2c00',false,1,1],['ESNAF','#283747',true,3,1],['HAVLU','#0e6655',false,-4,.45]].map(([word,ink,panels,angle,downscale],i)=>({word,ink,panels,angle,downscale,seed:100+i}));
 const words=['MEYHANE','KUZU','TAVUK','ÇİÇEK','GÖZDE','ŞİFA','BAKKAL','KASAP','LOKANTA','MAVİ','DENİZ 2','YILDIZ','ÖRNEK','SIRA','HAMAM','VİLLA','PASTANE','ÜZÜM','ÇARŞI','TEKNİK','ZEYTİN','GÜL','KEBAP 34','OCAKBAŞI','FIRIN','EKMEK','ŞAHİN','POSTA','KÖFTE','NAR'];
 const inks=['#1e8449','#c0392b','#2e4053','#af601a','#6c3483','#117864','#a93226','#1f618d','#7e5109','#196f3d'],r0=rng(2026);
 const set2=words.map((word,i)=>{const ink=inks[Math.floor(r0()*inks.length)],panels=r0()<.5,angle=Math.round((r0()*10-5)*10)/10,downscale=r0()<.3?.4+r0()*.3:1;return {word,ink,panels,angle,downscale,seed:500+i};});
 let correct=0;const wrong=[];
 for(const c of [...set1,...set2]){const r=SL.fromImage(await jpegRoundTrip(scene(c)),{createCanvas});if(!r.ok)continue;if(r.word===c.word)correct++;else wrong.push(c.word+' → '+r.word);}
 assert.deepEqual(wrong,[],'yanlış marka adı üretildi');
 assert.ok(correct>=26,'doğru sayısı düştü: '+correct);
});
