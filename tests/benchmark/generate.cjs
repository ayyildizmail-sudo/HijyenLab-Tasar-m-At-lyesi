// Ölçüm seti üreticisi: kendi ürettiğimiz örnek logolardan, müşterilerin gönderebileceği türde kötü fotoğraflar.
// Hiçbir gerçek müşteri görseli kullanılmaz. Aynı tohumla her seferinde aynı set üretilir.
// Kullanım: node tests/benchmark/generate.cjs <çıktı-klasörü> [tekrar=2]
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');

function rng(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
const pick=(r,a)=>a[Math.floor(r()*a.length)];
const lerp=(a,b,t)=>a+(b-a)*t;

// ---------- Örnek logolar (şeffaf zeminde, yüksek çözünürlük) ----------
const PALETTE=['#c0392b','#1f6f8b','#2f8a5a','#d35400','#6c3483','#154360','#b7950b','#117a65','#922b21','#1b2631','#e74c3c','#2471a3'];
const NAMES_CAPS=['ÖZGÜR OTO','BORA MARKET','ATLAS','ŞEHİR BÜFE','KARADENİZ','YAMAN İNŞAAT','ÇINAR','DORUK'];
const NAMES_MIXED=['Defne Pastanesi','Nane Cafe','Lale Kuaför','Yıldız Kafe','Mavi Balık','Gül Çiçekçilik','Ekin Fırın','Sahil Otel'];
const TAGS=['1985’ten beri','Taze ve lezzetli','Kuru temizleme','Ev yemekleri'];

function measure(g,text){const m=g.measureText(text);return {w:m.width,asc:m.actualBoundingBoxAscent,desc:m.actualBoundingBoxDescent};}
function canvasFor(w,h){const c=createCanvas(Math.ceil(w),Math.ceil(h));return [c,c.getContext('2d')];}

const LOGOS={
 // 1) Düz, büyük harfli yazı logosu — tek renk
 wordmarkCaps(r){const text=pick(r,NAMES_CAPS),ink=pick(r,PALETTE),font=pick(r,['bold 160px FreeSans','bold 160px Carlito','bold 160px "DejaVu Sans"']);
  const [m0,g0]=canvasFor(10,10);g0.font=font;const t=measure(g0,text);const [c,g]=canvasFor(t.w+40,t.asc+t.desc+40);g.font=font;g.fillStyle=ink;g.fillText(text,20,20+t.asc);return {canvas:c,inks:[ink],kind:'yazı-büyük',text};},
 // 2) Büyük/küçük harf karışık yazı — tek renk
 wordmarkMixed(r){const text=pick(r,NAMES_MIXED),ink=pick(r,PALETTE),font=pick(r,['bold 150px Caladea','bold 150px FreeSerif','bold 150px "Bitstream Charter"','150px FreeSans']);
  const [,g0]=canvasFor(10,10);g0.font=font;const t=measure(g0,text);const [c,g]=canvasFor(t.w+40,t.asc+t.desc+40);g.font=font;g.fillStyle=ink;g.fillText(text,20,20+t.asc);return {canvas:c,inks:[ink],kind:'yazı-karışık',text};},
 // 3) Amblem + yazı: içinde beyaz harf olan daire ve yanında isim — iki renk
 emblemText(r){const text=pick(r,NAMES_MIXED),a=pick(r,PALETTE);let b=pick(r,PALETTE);if(b===a)b='#1b2631';const font='bold 120px Caladea';
  const [,g0]=canvasFor(10,10);g0.font=font;const t=measure(g0,text);const R=110;const [c,g]=canvasFor(2*R+40+t.w+40,2*R+40);
  g.fillStyle=a;g.beginPath();g.arc(20+R,20+R,R,0,7);g.fill();g.fillStyle='#ffffff';g.font='bold 150px FreeSans';const m=measure(g,text[0]);g.fillText(text[0],20+R-m.w/2,20+R+m.asc/2);
  g.fillStyle=b;g.font=font;g.fillText(text,2*R+60,20+R+t.asc/2-t.desc/2);return {canvas:c,inks:[a,b],kind:'amblem+yazı',text};},
 // 4) Çok renkli: üç yaprak/kare simge ve yazı — üç renk
 multiColor(r){const text=pick(r,NAMES_CAPS),cols=[...PALETTE].sort(()=>r()-.5).slice(0,3);const font='bold 120px FreeSans';
  const [,g0]=canvasFor(10,10);g0.font=font;const t=measure(g0,text);const [c,g]=canvasFor(260+t.w+60,260);
  cols.forEach((col,i)=>{g.fillStyle=col;g.save();g.translate(130,130);g.rotate(i*2.094);g.beginPath();g.ellipse(0,-55,38,62,0,0,7);g.fill();g.restore();});
  g.fillStyle=cols[0];g.font=font;g.fillText(text,270,130+t.asc/2);return {canvas:c,inks:cols,kind:'çok-renkli',text};},
 // 5) Eğik (italik) yazı ve altında kavis — tek renk
 italicSwoosh(r){const text=pick(r,NAMES_MIXED),ink=pick(r,PALETTE),font='bold italic 150px FreeSerif';
  const [,g0]=canvasFor(10,10);g0.font=font;const t=measure(g0,text);const [c,g]=canvasFor(t.w+60,t.asc+t.desc+110);g.font=font;g.fillStyle=ink;g.fillText(text,30,20+t.asc);
  g.strokeStyle=ink;g.lineWidth=16;g.lineCap='round';g.beginPath();g.moveTo(40,t.asc+t.desc+60);g.quadraticCurveTo(c.width/2,t.asc+t.desc+110,c.width-40,t.asc+t.desc+40);g.stroke();return {canvas:c,inks:[ink],kind:'italik+kavis',text};},
 // 6) Rozet: halka, ortada yıldız ve isim — tek renk
 badge(r){const text=pick(r,NAMES_CAPS).split(' ')[0],ink=pick(r,PALETTE);const [c,g]=canvasFor(560,560);g.strokeStyle=ink;g.fillStyle=ink;
  g.lineWidth=22;g.beginPath();g.arc(280,280,250,0,7);g.stroke();g.lineWidth=8;g.beginPath();g.arc(280,280,215,0,7);g.stroke();
  g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?32:75;g.lineTo(280+rr*Math.cos(a),190+rr*Math.sin(a));}g.closePath();g.fill();
  g.font='bold 92px FreeSans';const t=measure(g,text);const s=Math.min(1,330/t.w);g.save();g.translate(280,330);g.scale(s,1);g.fillText(text,-t.w/2,t.asc/2);g.restore();return {canvas:c,inks:[ink],kind:'rozet',text};},
 // 7) İki satır: isim ve küçük alt yazı — iki renk
 twoLine(r){const text=pick(r,NAMES_CAPS),tag=pick(r,TAGS),a=pick(r,PALETTE),b='#555555';const f1='bold 140px "DejaVu Sans"',f2='60px FreeSans';
  const [,g0]=canvasFor(10,10);g0.font=f1;const t1=measure(g0,text);g0.font=f2;const t2=measure(g0,tag);const W=Math.max(t1.w,t2.w)+60;const [c,g]=canvasFor(W,t1.asc+t1.desc+t2.asc+t2.desc+90);
  g.font=f1;g.fillStyle=a;g.fillText(text,(W-t1.w)/2,25+t1.asc);g.font=f2;g.fillStyle=b;g.fillText(tag,(W-t2.w)/2,25+t1.asc+t1.desc+30+t2.asc);return {canvas:c,inks:[a,b],kind:'iki-satır',text:text+' / '+tag};},
 // 8) Yalnız simge: ev + damla — iki renk, yazı yok
 iconOnly(r){const a=pick(r,PALETTE);let b=pick(r,PALETTE);if(b===a)b='#1b2631';const [c,g]=canvasFor(460,460);g.fillStyle=a;
  g.beginPath();g.moveTo(230,30);g.lineTo(430,210);g.lineTo(380,210);g.lineTo(380,430);g.lineTo(80,430);g.lineTo(80,210);g.lineTo(30,210);g.closePath();g.fill();
  g.fillStyle=b;g.beginPath();g.moveTo(230,190);g.bezierCurveTo(300,280,320,320,300,360);g.arc(230,350,72,0.14,Math.PI-0.14);g.bezierCurveTo(140,320,160,280,230,190);g.fill();return {canvas:c,inks:[a,b],kind:'simge',text:''};},
};

// ---------- Yardımcılar ----------
// Kaynak görseli dört köşeli bir alana perspektifle yerleştirir (ters eşleme, çift doğrusal örnekleme).
function homography(src,dst){ // src,dst: 4 nokta; dst→src eşlemesi döndürür
 const A=[],B=[];for(let i=0;i<4;i++){const [x,y]=dst[i],[u,v]=src[i];A.push([x,y,1,0,0,0,-u*x,-u*y]);B.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);B.push(v);}
 const n=8;for(let i=0;i<n;i++){let p=i;for(let k=i+1;k<n;k++)if(Math.abs(A[k][i])>Math.abs(A[p][i]))p=k;[A[i],A[p]]=[A[p],A[i]];[B[i],B[p]]=[B[p],B[i]];for(let k=i+1;k<n;k++){const f=A[k][i]/A[i][i];for(let j=i;j<n;j++)A[k][j]-=f*A[i][j];B[k]-=f*B[i];}}
 const h=new Array(n);for(let i=n-1;i>=0;i--){let s=B[i];for(let j=i+1;j<n;j++)s-=A[i][j]*h[j];h[i]=s/A[i][i];}return [...h,1];
}
function warpInto(g,src,quad){
 const sw=src.width,sh=src.height,sd=src.getContext('2d').getImageData(0,0,sw,sh).data;const H=homography([[0,0],[sw,0],[sw,sh],[0,sh]],quad);
 const xs=quad.map(p=>p[0]),ys=quad.map(p=>p[1]);const x0=Math.max(0,Math.floor(Math.min(...xs))),x1=Math.min(g.canvas.width-1,Math.ceil(Math.max(...xs))),y0=Math.max(0,Math.floor(Math.min(...ys))),y1=Math.min(g.canvas.height-1,Math.ceil(Math.max(...ys)));
 const W=x1-x0+1,Hh=y1-y0+1;if(W<=0||Hh<=0)return;const img=g.getImageData(x0,y0,W,Hh),d=img.data;
 for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){const X=x+x0+.5,Y=y+y0+.5,w=H[6]*X+H[7]*Y+1,u=(H[0]*X+H[1]*Y+H[2])/w-.5,v=(H[3]*X+H[4]*Y+H[5])/w-.5;if(u<-.5||v<-.5||u>sw-.5||v>sh-.5)continue;
  const ix=Math.max(0,Math.min(sw-2,Math.floor(u))),iy=Math.max(0,Math.min(sh-2,Math.floor(v))),fx=Math.min(1,Math.max(0,u-ix)),fy=Math.min(1,Math.max(0,v-iy));const o=(y*W+x)*4;
  const s=k=>{const i00=(iy*sw+ix)*4+k,i10=i00+4,i01=i00+sw*4,i11=i01+4;return lerp(lerp(sd[i00],sd[i10],fx),lerp(sd[i01],sd[i11],fx),fy);};
  const a=s(3)/255;if(a<=0)continue;for(let k=0;k<3;k++)d[o+k]=d[o+k]*(1-a)+s(k)*a;}
 g.putImageData(img,x0,y0);
}
function noise(c,r,amount){const g=c.getContext('2d'),img=g.getImageData(0,0,c.width,c.height),d=img.data;for(let p=0;p<d.length;p+=4){const n=(r()-.5)*amount;d[p]+=n;d[p+1]+=n*.9;d[p+2]+=n*1.1;}g.putImageData(img,0,0);}
function lighting(c,r,{glare=0,shade=0,cast=null}){const g=c.getContext('2d');
 if(shade>0){const gr=g.createLinearGradient(0,0,c.width*(r()<.5?1:-.2),c.height);gr.addColorStop(0,`rgba(0,0,0,0)`);gr.addColorStop(1,`rgba(0,0,0,${shade})`);g.fillStyle=gr;g.fillRect(0,0,c.width,c.height);}
 if(glare>0){const x=c.width*(.2+r()*.6),y=c.height*(.2+r()*.5),R=Math.max(c.width,c.height)*.35;const gr=g.createRadialGradient(x,y,0,x,y,R);gr.addColorStop(0,`rgba(255,255,250,${glare})`);gr.addColorStop(1,'rgba(255,255,250,0)');g.fillStyle=gr;g.fillRect(0,0,c.width,c.height);}
 if(cast){g.globalCompositeOperation='multiply';g.fillStyle=cast;g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='source-over';}}
function blur(c,px){if(px<=0)return c;const d=createCanvas(c.width,c.height),g=d.getContext('2d');g.filter=`blur(${px}px)`;g.drawImage(c,0,0);return d;}
function resize(c,w,h){const d=createCanvas(Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));d.getContext('2d').drawImage(c,0,0,d.width,d.height);return d;}
function fitLogo(logo,maxW,maxH){const s=Math.min(maxW/logo.width,maxH/logo.height);return resize(logo,logo.width*s,logo.height*s);}
function jitterQuad(r,cx,cy,w,h,tilt,persp){const pts=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];const a=tilt*Math.PI/180;
 return pts.map(([x,y],i)=>{const k=1+(i===1||i===2?persp:-persp)*.5;const X=x*1,Y=y*k;return [cx+X*Math.cos(a)-Y*Math.sin(a)+(r()-.5)*w*.02,cy+X*Math.sin(a)+Y*Math.cos(a)+(r()-.5)*h*.02];});}
function woodTexture(g,W,H,r,base=[120,86,58]){g.fillStyle=`rgb(${base})`;g.fillRect(0,0,W,H);for(let i=0;i<120;i++){const y=r()*H,v=(r()-.5)*40;g.strokeStyle=`rgba(${base.map(b=>Math.max(0,Math.min(255,b+v))).join(',')},.55)`;g.lineWidth=1+r()*5;g.beginPath();g.moveTo(0,y);g.bezierCurveTo(W*.3,y+(r()-.5)*30,W*.7,y+(r()-.5)*30,W,y+(r()-.5)*20);g.stroke();}}

// ---------- Sahneler ----------
const SCENES={
 // Kontrol: temiz PNG, beyaz zemin
 temizDosya(logo,r){const L=fitLogo(logo.canvas,900,600),[c,g]=canvasFor(L.width+120,L.height+120);g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(L,60,60);return {canvas:c,format:'png',note:'temiz PNG'};},
 // Küçük ve sıkıştırılmış JPEG (WhatsApp'tan gelen, sosyal medyadan kaydedilen)
 dusukCozunurluk(logo,r){const L=fitLogo(logo.canvas,900,600),[c,g]=canvasFor(L.width+120,L.height+120);g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(L,60,60);
  const w=110+Math.round(r()*90);const small=resize(blur(c,r()*1.2),w,c.height*w/c.width);return {canvas:small,format:'jpeg',quality:35+Math.round(r()*25),note:`${w}px genişlik`};},
 // Ekran görüntüsü: web sayfası/Instagram profili içinde logo
 ekranGoruntusu(logo,r){const W=1170,H=1500,[c,g]=canvasFor(W,H);g.fillStyle='#fafafa';g.fillRect(0,0,W,H);g.fillStyle='#e9e9ee';g.fillRect(0,0,W,140);g.fillStyle='#bbb';for(let i=0;i<4;i++)g.fillRect(60+i*260,60,180,22);
  const L=fitLogo(logo.canvas,W*.7,420);g.fillStyle='#fff';g.fillRect(80,220,W-160,L.height+120);g.drawImage(L,(W-L.width)/2,280);
  g.fillStyle='#c8c8cc';for(let i=0;i<14;i++)g.fillRect(90,L.height+420+i*48,(W-180)*(.5+r()*.5),18);g.fillStyle='#3b82f6';g.fillRect(W/2-180,H-160,360,80);return {canvas:resize(c,W*.75,H*.75),format:'png',note:'ekran görüntüsü'};},
 // Kartvizit fotoğrafı: masada, eğik, gölge ve parlama
 kartvizit(logo,r){const W=1600,H=1200,[c,g]=canvasFor(W,H);woodTexture(g,W,H,r,pick(r,[[120,86,58],[150,120,90],[60,60,64]]));
  const cardColor=pick(r,['#fbfbf8','#f4f1e8','#ffffff']);const [card,cg]=canvasFor(1050,600);cg.fillStyle=cardColor;cg.fillRect(0,0,1050,600);
  const L=fitLogo(logo.canvas,560,260);cg.drawImage(L,60,60);cg.fillStyle='#444';cg.font='34px FreeSans';['Ahmet Yılmaz','0532 000 00 00','ornek@ornek.com.tr','Merkez Mah. Örnek Sok. No:1'].forEach((t,i)=>cg.fillText(t,60,400+i*48));
  const q=jitterQuad(r,W/2+(r()-.5)*120,H/2+(r()-.5)*80,1050*.95,600*.95,(r()-.5)*24,(r()-.5)*.35);
  g.fillStyle='rgba(0,0,0,.35)';g.beginPath();q.forEach(([x,y],i)=>i?g.lineTo(x+18,y+22):g.moveTo(x+18,y+22));g.fill();warpInto(g,card,q);
  lighting(c,r,{glare:r()*.45,shade:r()*.35,cast:r()<.4?pick(r,['#fff3dc','#e8eeff']):null});noise(c,r,14+r()*14);
  return {canvas:resize(blur(c,r()*1.8),W*.75,H*.75),format:'jpeg',quality:55+Math.round(r()*25),note:'kartvizit, masa üstü'};},
 // Tabela fotoğrafı: bina cephesinde renkli panel üzerinde logo
 tabela(logo,r){const W=1600,H=1100,[c,g]=canvasFor(W,H);const wall=g.createLinearGradient(0,0,0,H);wall.addColorStop(0,'#d9d6cf');wall.addColorStop(1,'#bdb8ae');g.fillStyle=wall;g.fillRect(0,0,W,H);
  g.fillStyle='#4a4f57';g.fillRect(W*.1,H*.6,W*.35,H*.4);g.fillStyle='#7c8fa3';g.fillRect(W*.55,H*.58,W*.33,H*.3);g.strokeStyle='#2e3a4a';g.lineWidth=12;g.strokeRect(W*.55,H*.58,W*.33,H*.3);
  const panel=pick(r,['#ffffff','#f3efe2','#202020','#0d3b66']);const dark=panel==='#202020'||panel==='#0d3b66';const [p,pg]=canvasFor(1300,420);pg.fillStyle=panel;pg.fillRect(0,0,1300,420);pg.strokeStyle='#888';pg.lineWidth=10;pg.strokeRect(5,5,1290,410);
  let L=fitLogo(logo.canvas,1150,330);if(dark){const inv=createCanvas(L.width,L.height),ig=inv.getContext('2d');ig.drawImage(L,0,0);ig.globalCompositeOperation='source-in';ig.fillStyle='#ffffff';ig.fillRect(0,0,L.width,L.height);L=inv;}
  pg.drawImage(L,(1300-L.width)/2,(420-L.height)/2);const q=jitterQuad(r,W/2,H*.3,1300*.9,420*.9,(r()-.5)*10,(r()-.5)*.25);warpInto(g,p,q);
  lighting(c,r,{glare:r()*.3,shade:.15+r()*.3,cast:r()<.5?pick(r,['#ffe9c7','#dfe7ff']):null});noise(c,r,18+r()*14);
  return {canvas:resize(blur(c,.5+r()*1.5),W*.7,H*.7),format:'jpeg',quality:50+Math.round(r()*25),note:'tabela'+(dark?' (koyu zemin, beyaz baskı)':''),inverted:dark};},
 // Kraft kese/ambalaj fotoğrafı
 ambalaj(logo,r){const W=1400,H=1400,[c,g]=canvasFor(W,H);g.fillStyle='#e8e6e1';g.fillRect(0,0,W,H);const [bag,bg]=canvasFor(800,1000);const kraft=pick(r,['#b08a5c','#c39b6a','#f6f4ef']);bg.fillStyle=kraft;bg.fillRect(0,0,800,1000);
  for(let i=0;i<40;i++){bg.strokeStyle='rgba(0,0,0,.05)';bg.lineWidth=2;bg.beginPath();bg.moveTo(r()*800,0);bg.lineTo(r()*800,1000);bg.stroke();}const L=fitLogo(logo.canvas,620,420);bg.drawImage(L,(800-L.width)/2,330);
  const q=jitterQuad(r,W/2,H/2,800*.95,1000*.95,(r()-.5)*14,(r()-.5)*.3);g.fillStyle='rgba(0,0,0,.25)';g.beginPath();q.forEach(([x,y],i)=>i?g.lineTo(x+25,y+15):g.moveTo(x+25,y+15));g.fill();warpInto(g,bag,q);
  lighting(c,r,{glare:r()*.3,shade:r()*.4});noise(c,r,12+r()*12);return {canvas:resize(blur(c,r()*1.5),W*.7,H*.7),format:'jpeg',quality:55+Math.round(r()*25),note:'ambalaj fotoğrafı ('+(kraft==='#f6f4ef'?'beyaz':'kraft')+')'};},
 // Elde tutulan kâğıt / broşür: eğik, düzensiz ışık
 kagit(logo,r){const W=1500,H=1500,[c,g]=canvasFor(W,H);g.fillStyle=pick(r,['#5d6d7e','#7b7d7d','#a04000']);g.fillRect(0,0,W,H);const [ppr,pp]=canvasFor(900,1200);pp.fillStyle='#f7f7f2';pp.fillRect(0,0,900,1200);
  const L=fitLogo(logo.canvas,720,380);pp.drawImage(L,(900-L.width)/2,200);pp.fillStyle='#bbb';for(let i=0;i<10;i++)pp.fillRect(90,700+i*40,720*(.5+r()*.5),14);
  const q=jitterQuad(r,W/2,H/2,900*.9,1200*.9,(r()-.5)*30,(r()-.5)*.45);warpInto(g,ppr,q);lighting(c,r,{glare:r()*.5,shade:.2+r()*.4,cast:r()<.5?'#fff0d8':null});noise(c,r,16+r()*16);
  return {canvas:resize(blur(c,r()*2.2),W*.6,H*.6),format:'jpeg',quality:45+Math.round(r()*30),note:'elde kâğıt'};},
};

async function main(){
 const out=path.resolve(process.argv[2]||'benchmark-out'),reps=Number(process.argv[3]||2);fs.mkdirSync(out,{recursive:true});const cases=[];let n=0;
 for(let rep=0;rep<reps;rep++)for(const [lk,mk] of Object.entries(LOGOS))for(const [sk,sf] of Object.entries(SCENES)){
  const seed=1000*rep+(++n)*7919;const r=rng(seed);const logo=mk(r);const scene=sf(logo,r);
  const id=String(cases.length+1).padStart(3,'0')+'-'+lk+'-'+sk;const ext=scene.format==='png'?'png':'jpg';
  fs.writeFileSync(path.join(out,id+'.'+ext),scene.format==='png'?scene.canvas.toBuffer('image/png'):scene.canvas.toBuffer('image/jpeg',scene.quality));
  fs.writeFileSync(path.join(out,id+'.gt.png'),logo.canvas.toBuffer('image/png'));
  cases.push({id,file:id+'.'+ext,gt:id+'.gt.png',logo:lk,logoKind:logo.kind,scene:sk,note:scene.note,inks:scene.inverted?['#ffffff']:logo.inks,text:logo.text,width:scene.canvas.width,height:scene.canvas.height,seed});
 }
 fs.writeFileSync(path.join(out,'cases.json'),JSON.stringify(cases,null,1));console.log(cases.length+' örnek üretildi →',out);
}
if(require.main===module)main();
module.exports={LOGOS,SCENES,rng};
