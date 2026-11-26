// Dükkân cephesi fotoğrafları (duvar, pencere, çizgili tente, tabela, dükkân içi, ısıtıcı direği): tabela yazısı yolu.
// Müşteri görseli kullanılmaz; sahneler burada çizilir. Telefon çözünürlüğü (12 MP) ve küçük boyut (3 MP) birlikte denenir.
// Korunan hatalar: tente çizgilerinin harf dizisi sanılması, beyaz/siyah yazının hiç aranmaması, eksik harfle yanlış ad üretilmesi.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const SL=require('../frontend/sign-lettering.js');
for(const w of SL.WEIGHTS)GlobalFonts.registerFromPath(path.join(__dirname,`../frontend/assets/fonts/inter-${w}.woff2`),SL.family(w));
const F=path.join(__dirname,'../frontend/assets/fonts/redraw/');
for(const [f,n] of [['fs-montserrat-700','SM7'],['fs-oswald-600','SO6'],['fs-josefin-sans-700','SJ7'],['fs-league-spartan-800','SL8'],['fs-poppins-600','SP6']])GlobalFonts.registerFromPath(F+f+'.woff2',n);
function rng(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function storefront({word,font,board,tile,ink,wall,awning=['#ffffff','#3c6e52'],W=1512,H=2016,seed=1,showAwning=true,showWord=true}){
 const c=createCanvas(W,H),g=c.getContext('2d'),r=rng(seed);
 g.fillStyle='#a9c7e6';g.fillRect(0,0,W,H);g.fillStyle=wall;g.fillRect(0,H*.06,W,H*.94);
 for(const x of [W*.15,W*.6]){g.fillStyle='#2f5a9a';g.fillRect(x,H*.2,W*.25,H*.2);g.fillStyle='#c9d3da';g.fillRect(x+W*.013,H*.2+W*.013,W*.25-W*.026,H*.2-W*.013);}
 g.fillStyle='#f6f6f6';g.fillRect(W*.08,H*.1,W*.013,H*.4);
 if(showWord){g.save();g.translate(W*.5,H*.5);g.rotate((r()-.5)*.1);const bw=W*.86,bh=H*.11;if(board){g.fillStyle=board;g.fillRect(-bw/2,-bh/2,bw,bh);}
  const n=[...word].length,step=bw/n;g.textAlign='center';g.textBaseline='middle';
  [...word].forEach((ch,i)=>{const x=-bw/2+step*(i+.5);if(tile){g.fillStyle=tile;g.fillRect(x-step*.42,-bh*.42,step*.84,bh*.84);}g.fillStyle=ink;g.font=`${Math.round(bh*(tile?.62:.7))}px ${font}`;g.fillText(ch,x,bh*.03);});g.restore();}
 const ay=H*.57,sw=Math.round(W/50);if(showAwning)for(let x=0;x<W;x+=sw){g.fillStyle=awning[(x/sw)%2];g.fillRect(x,ay,sw,H*.08);}
 g.fillStyle='#1d1a17';g.fillRect(0,ay+H*.1,W,H);for(let i=0;i<400;i++){g.fillStyle=`hsl(${r()*360},40%,${10+r()*40}%)`;g.fillRect(r()*W,ay+H*.1+r()*H*.33,r()*W*.03,r()*H*.04);}
 g.fillStyle='#9aa0a6';g.beginPath();g.moveTo(W*.1,H);g.lineTo(W*.16,ay-H*.01);g.lineTo(W*.2,ay-H*.01);g.lineTo(W*.24,H);g.fill();
 const id=g.getImageData(0,0,W,H),d=id.data;for(let i=0;i<d.length;i+=4){const nz=(r()-.5)*14;d[i]+=nz;d[i+1]+=nz;d[i+2]+=nz;}g.putImageData(id,0,0);
 return c;}
const SCENES=[
 {word:'DENİZ',font:'SM7',board:'#6b5236',tile:'#f2f0e8',ink:'#2f7d63',wall:'#e9ecee',awning:['#ffffff','#3c6e52']},
 {word:'LOKANTA',font:'SJ7',board:'#1f3b5a',tile:null,ink:'#ffffff',wall:'#f3efe6',awning:['#ffffff','#1f3b5a']},
 {word:'MARINA',font:'SP6',board:'#ffffff',tile:null,ink:'#c0392b',wall:'#cfd8dc',awning:['#ffffff','#c0392b']},
 {word:'TAVERNA',font:'SL8',board:'#5b4636',tile:'#efe6d2',ink:'#3b2a1a',wall:'#eae4da',awning:['#f5f5f5','#5b4636']},
 {word:'FIRIN',font:'SM7',board:null,tile:null,ink:'#8a1c1c',wall:'#f1e3c8',awning:['#ffffff','#8a1c1c']},
 {word:'BAHÇE',font:'SO6',board:'#2e4d2e',tile:null,ink:'#f0f0f0',wall:'#dfe6df',awning:['#ffffff','#2e4d2e']}];
const MUST=new Set(['DENİZ','LOKANTA','MARINA','TAVERNA','FIRIN']); // şablonla kesin okunması gerekenler (12 MP)
for(const [label,scale] of [['12 MP',2],['3 MP',1]])test(`dükkân cepheleri (${label}): tente harf sanılmaz, yanlış ad üretilmez`,()=>{
 const wrong=[],got=[];
 SCENES.forEach((sc,i)=>{const r=SL.fromImage(storefront({...sc,W:1512*scale,H:2016*scale,seed:40+i}),{createCanvas});if(!r.ok)return;if(r.word!==sc.word)wrong.push(sc.word+' → '+r.word);else got.push(sc.word);});
 assert.deepEqual(wrong,[],'yanlış ad');
 const need=scale===2?[...MUST]:['LOKANTA','MARINA','TAVERNA','FIRIN'];for(const w of need)assert.ok(got.includes(w),`${label}: ${w} okunmalı (okunan: ${got.join(', ')})`);
});
test('yalnız tente ve cephe (yazı yok): sonuç yok',()=>{const r=SL.fromImage(storefront({...SCENES[0],showWord:false,seed:7}),{createCanvas});assert.equal(r.ok,false);});
test('tente adayları elenir: aday satırların hiçbiri şerit değil',()=>{const c=storefront({...SCENES[0],showWord:false,seed:8}),k=1200/Math.max(c.width,c.height),d=createCanvas(Math.round(c.width*k),Math.round(c.height*k));d.getContext('2d').drawImage(c,0,0,d.width,d.height);
 const rows=SL._internal.findRows(d.getContext('2d').getImageData(0,0,d.width,d.height),24);for(const r of rows)assert.ok(r.row.length<=12,'uzun eşit çubuk dizisi aday olmamalı');});
test('tek satır tabela "başka satır yok" olarak işaretlenir (hemen yerleşebilir)',()=>{const r=SL.fromImage(storefront({...SCENES[2],W:3024,H:4032,seed:41}),{createCanvas});assert.equal(r.ok,true);assert.equal(r.otherRows,0);});
test('eksik harf (çengeli zemine değen Ç) varsa yanlış ad yerine sonuç yok',()=>{for(const seed of [45,46,47]){const r=SL.fromImage(storefront({...SCENES[5],W:3024,H:4032,seed}),{createCanvas});if(r.ok)assert.equal(r.word,'BAHÇE');}});
