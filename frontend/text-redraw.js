/* Fotoğraftan ayrılan logodaki yazıları okuyup temiz yazı tipiyle yeniden çizer.
   Okuma: yerel metin tanıma modeli (PP-OCRv3, tarayıcıda; dışarıya hiçbir şey gönderilmez) — recognize() ile verilir.
   Türkçe harfler (Ş Ç Ğ İ Ö Ü) modelde yok: harfin üstündeki/altındaki işaretlerden tamamlanır.
   Yazı tipi: paketteki açık lisanslı yazı tiplerinden, satırın gerçek mürekkebiyle en çok örtüşen seçilir.
   Güvenlik: okuma güveni ve şekil örtüşmesi yeterli değilse o satır fotoğraftaki hâliyle (temizlenmiş) kalır. */
(function(root){'use strict';
const PP=typeof module!=='undefined'&&module.exports?require('./product-photo.js'):root.ProductPhoto;
const FONTS=[
 {family:'HLR Inter',file:'Inter-Regular',kind:'sans',weight:400},{family:'HLR Inter SemiBold',file:'Inter-SemiBold',kind:'sans',weight:600},
 {family:'HLR Inter Bold',file:'Inter-Bold',kind:'sans',weight:700},{family:'HLR Inter Black',file:'Inter-Black',kind:'sans',weight:900},
 {family:'HLR DejaVu Sans',file:'DejaVuSans',kind:'sans',weight:400},{family:'HLR DejaVu Sans Bold',file:'DejaVuSans-Bold',kind:'sans',weight:700},
 {family:'HLR Carlito',file:'Carlito-Regular',kind:'sans',weight:400},{family:'HLR Carlito Bold',file:'Carlito-Bold',kind:'sans',weight:700},
 {family:'HLR DejaVu Serif',file:'DejaVuSerif',kind:'serif',weight:400},{family:'HLR DejaVu Serif Bold',file:'DejaVuSerif-Bold',kind:'serif',weight:700},
 {family:'HLR Caladea',file:'Caladea-Regular',kind:'serif',weight:400},{family:'HLR Caladea Bold',file:'Caladea-Bold',kind:'serif',weight:700}];
const MIN_CONF=.88,MIN_IOU=.9;
// PP-OCR tanıma girdisi: 3×48×W (BGR, [-1,1])
function recTensor(img,box){const [x0,y0,x1,y1]=box,pad=Math.round((y1-y0)*.25),X0=Math.max(0,x0-pad),Y0=Math.max(0,y0-pad),X1=Math.min(img.w,x1+pad),Y1=Math.min(img.h,y1+pad),cw=X1-X0,ch=Y1-Y0,W=Math.min(1280,Math.max(48,Math.round(48*cw/ch)));
 const t=new Float32Array(3*48*W);for(let y=0;y<48;y++)for(let x=0;x<W;x++){const sx=X0+Math.min(cw-1,Math.floor(x*cw/W)),sy=Y0+Math.min(ch-1,Math.floor(y*ch/48)),j=(sy*img.w+sx)*4;t[y*W+x]=img.data[j+2]/127.5-1;t[48*W+y*W+x]=img.data[j+1]/127.5-1;t[2*48*W+y*W+x]=img.data[j]/127.5-1;}
 return {tensor:t,width:W,crop:[X0,Y0,X1,Y1]};}
// CTC çözümü: karakterler, güven ve her karakterin x konumu (kesit içinde 0..1)
function ctcDecode(probs,T,C,keys){let s=[],prev=0;for(let k=0;k<T;k++){let bi=0,bv=-1;for(let q=0;q<C;q++){const v=probs[k*C+q];if(v>bv){bv=v;bi=q;}}if(bi!==prev&&bi!==0)s.push({ch:keys[bi]||'',p:bv,x:(k+.5)/T});prev=bi;}return s;}
const TR_ABOVE={S:null,C:null,G:'Ğ',I:'İ',O:'Ö',U:'Ü',g:'ğ',o:'ö',u:'ü'},TR_BELOW={S:'Ş',C:'Ç',s:'ş',c:'ç'};
// Türkçe işaretler: harfin sütunlarında, satırın ortak üst çizgisinin üstünde (Ö Ü İ Ğ) ya da ortak taban çizgisinin
// altında (Ş Ç) mürekkep var mı? İşaret harfe değiyor olsa da çalışır.
function turkish(chars,line,comps,cropX0,cropW,m,w,h){const [x0,y0,x1,y1]=line.box,H=y1-y0;
 const inside=comps.filter(c=>{const b=c.box;return b[0]>=x0-1&&b[2]<=x1+1&&b[1]>=y0-H&&b[3]<=y1+H&&(b[3]-b[1])>=H*.5;});
 const med=a=>{const s=a.slice().sort((p,q)=>p-q);return s.length?s[s.length>>1]:0;};const top=inside.length?med(inside.map(c=>c.box[1])):y0,base=inside.length?med(inside.map(c=>c.box[3])):y1,CH=Math.max(4,base-top);
 // İşaret, harf gövdesinden boş bir satırla ayrılmış ayrı bir leke olmalı (yuvarlak harflerin taşması işaret sayılmaz)
 const rowInk=(cx,hw,y)=>{let n=0;for(let x=Math.max(0,Math.round(cx-hw));x<Math.min(w,Math.round(cx+hw));x++)n+=m[y*w+x];return n;};
 // Harf gövdesinin gerçek üst/alt sınırı (o sütunlarda) bulunur; işaret bu sınırın dışında, boş satırla ayrılmış, küçük bir leke olmalı.
 const mark=(cx,hw,dir)=>{const start=Math.round(dir<0?top+CH*.3:base-CH*.3),lim=Math.round(dir<0?top-CH*.65:base+CH*.55);let y=start,body=-1;
  for(;dir<0?y>=Math.max(0,lim):y<Math.min(h,lim);y+=dir){const r=rowInk(cx,hw,y);if(r>0)body=y;else if(body>=0&&Math.abs(y-body)>=1)break;}
  if(body<0)return 0;const edge=body; // gövdenin bittiği satır
  if(dir<0?edge<top-CH*.12:edge>base+CH*.12)return 0; // gövde ortak çizginin çok dışına taşıyorsa (büyük harf/uzun harf) işaret değil
  let ink=0,rows=0;for(y=edge+dir*2;dir<0?y>=Math.max(0,lim):y<Math.min(h,lim);y+=dir){const r=rowInk(cx,hw,y);if(r){ink+=r;rows++;}else if(rows)break;}
  return rows>=2&&rows<=CH*.4&&ink<=CH*CH*.2?ink:0;};
 const markAbove=(cx,hw)=>mark(cx,hw,-1),markBelow=(cx,hw)=>mark(cx,hw,1);
 const inkIn=(cx,hw,ya,yb)=>{let n=0;for(let y=Math.max(0,Math.round(ya));y<Math.min(h,Math.round(yb));y++)for(let x=Math.max(0,Math.round(cx-hw));x<Math.min(w,Math.round(cx+hw));x++)n+=m[y*w+x];return n;};
 const step=cropW/Math.max(2,chars.length+1);
 return chars.map(c=>{const cx=cropX0+c.x*cropW,hw=Math.max(CH*.18,step*.32),thr=Math.max(3,CH*CH*.004);let ch=c.ch;
  const up=markAbove(cx,hw),dn=markBelow(cx,hw);
  if(TR_ABOVE[ch]&&up>=thr)ch=TR_ABOVE[ch];else if(TR_BELOW[ch]&&dn>=thr)ch=TR_BELOW[ch];return {...c,ch};});}
function normalize(text){let t=text.normalize('NFKC').replace(/\s+/g,' ').trim();
 // büyük harfli kelimede küçük i → İ ; tamamı büyük harfse 'i' bulunmaz
 t=t.split(' ').map(w=>{const up=(w.match(/[A-ZÇĞİÖŞÜ]/g)||[]).length,lo=(w.match(/[a-zçğıöşü]/g)||[]).length;return up>=2&&up>lo?w.replace(/i/g,'İ'):w;}).join(' ');return t;}
function lineMask(m,w,box,lab,keepIds){const [x0,y0,x1,y1]=box,W=x1-x0,H=y1-y0,o=new Uint8Array(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y+y0)*w+(x+x0);if(m[i]&&(!keepIds||keepIds.has(lab[i])))o[y*W+x]=1;}return {m:o,w:W,h:H};}
function renderText(createCanvas,font,text,W,H){ // metni W×H kutuya mürekkep sınırlarıyla oturtur
 const big=200,c=createCanvas(Math.ceil(big*Math.max(1,text.length)*.9+40),Math.ceil(big*1.8)),g=c.getContext('2d');g.font=`${big}px "${font.family}"`;g.textBaseline='alphabetic';
 const m=g.measureText(text),ax=m.actualBoundingBoxLeft,aw=m.actualBoundingBoxLeft+m.actualBoundingBoxRight,ah=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;if(!(aw>0&&ah>0))return null;
 const sx=W/aw,sy=H/ah;return {sx,sy,ax,asc:m.actualBoundingBoxAscent,draw:(gg,X,Y,scaleX,scaleY)=>{gg.save();gg.translate(X,Y);gg.scale(scaleX,scaleY);gg.font=`${big}px "${font.family}"`;gg.textBaseline='alphabetic';gg.fillText(text,ax,m.actualBoundingBoxAscent);gg.restore();}};}
function maskOf(createCanvas,W,H,drawFn){const c=createCanvas(W,H),g=c.getContext('2d');g.fillStyle='#000';drawFn(g);const d=g.getImageData(0,0,W,H).data,o=new Uint8Array(W*H);for(let i=0;i<W*H;i++)o[i]=d[i*4+3]>110?1:0;return o;}
function dil(a,W,H){const o=new Uint8Array(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(!a[y*W+x])continue;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<W&&Y<H)o[Y*W+X]=1;}}return o;}
// 1 px toleranslı F1 (ince çizgilerde birkaç piksellik kayma cezalandırılmasın)
function iou(a,b,W,H){const da=dil(a,W,H),db=dil(b,W,H);let na=0,nb=0,ta=0,tb=0;for(let k=0;k<a.length;k++){if(a[k]){na++;if(db[k])ta++;}if(b[k]){nb++;if(da[k])tb++;}}const p=nb?tb/nb:0,r=na?ta/na:0;return p+r?2*p*r/(p+r):0;}
// ana fonksiyon
async function redraw({img,mask,out,palette,surface,opaqueGround,recognize,createCanvas,fonts=FONTS}){
 if(!recognize||!createCanvas||!out)return {replaced:0,lines:[]};
 const {w,h}=mask,m=mask.m,{lab,comps}=PP._internal.components(m,w,h),lines=PP.glyphLines(m,w,h).filter(l=>l.count>=2&&l.height>=10),report=[];
 const [bx0,by0,bx1,by1]=out.box,k=out.w/(bx1-bx0);
 const oc=createCanvas(out.w,out.h),og=oc.getContext('2d'),id=og.createImageData(out.w,out.h);id.data.set(out.data);og.putImageData(id,0,0);let replaced=0;
 for(const line of lines.slice(0,12)){
  const r=recTensor(img,line.box);let rec;try{rec=await recognize(r.tensor,r.width);}catch{continue;}if(!rec)continue;
  const chars=ctcDecode(rec.probs,rec.T,rec.C,rec.keys);if(chars.length<2)continue;const conf=chars.reduce((a,c)=>a+c.p,0)/chars.length;
  if(chars.some(c=>/[^ -ɏ]/.test(c.ch.normalize('NFKC')))){report.push({skip:'non-latin'});continue;}
  // Türkçe işaretler (Ş Ç Ğ İ Ö Ü) fotoğraftaki hâliyle korunur: yalnız harf gövdeleri yeniden çizilir, işaret lekelerine dokunulmaz.
  // Bu yüzden gövde metni işaretsiz harflerle yazılır (Ş→S, İ→I, Ö→O...). Görünen sonuç yine Türkçe karakterlidir.
  const base=s=>s.normalize('NFKC').replace(/[ŞşÇçĞğÖöÜü]/g,c=>({Ş:'S',ş:'s',Ç:'C',ç:'c',Ğ:'G',ğ:'g',Ö:'O',ö:'o',Ü:'U',ü:'u'}[c])).replace(/İ/g,'I');
  const text=base(normalize(chars.map(c=>c.ch).join(''))).replace(/İ/g,'I');
  if(conf<MIN_CONF||text.replace(/\s/g,'').length<2){report.push({text,conf:+conf.toFixed(2),skip:'low-confidence'});continue;}
  // satırın mürekkebi: kutu + Türkçe işaret bölgesi
  const [x0,y0,x1,y1]=line.box,hh=y1-y0,ext=[Math.max(0,x0-2),Math.max(0,Math.round(y0-hh*.45)),Math.min(w,x1+2),Math.min(h,Math.round(y1+hh*.35))];
  const ids=new Set();for(const c of comps){const b=c.box;if(b[0]>=ext[0]-1&&b[2]<=ext[2]+1&&b[1]>=ext[1]-1&&b[3]<=ext[3]+1&&(b[3]-b[1])>=hh*.45)ids.add(c.id);}
  const LM=lineMask(m,w,ext,lab,ids);let ix0=LM.w,iy0=LM.h,ix1=0,iy1=0;for(let y=0;y<LM.h;y++)for(let x=0;x<LM.w;x++)if(LM.m[y*LM.w+x]){if(x<ix0)ix0=x;if(x>ix1)ix1=x;if(y<iy0)iy0=y;if(y>iy1)iy1=y;}if(ix1<=ix0)continue;
  const bodies=ids.size,letters=text.replace(/[^A-Za-z0-9&@]/g,'').length;
  // bitişik harfler tek gövde olabilir (gövde ≤ harf), ama fazla gövde = okunmayan harf → yeniden çizilmez
  if(bodies>letters||bodies<letters-Math.floor(letters/4)){report.push({text,conf:+conf.toFixed(2),bodies,letters,skip:'letter-count'});continue;}
  // Büyük harfli satırda harf gövdesi ortak üst/alt çizgiden belirgin taşıyorsa bitişik bir Türkçe işaret (Ö, Ü, İ, Ş, Ç) olabilir:
  // yeniden çizim işareti kaybettirir → satır fotoğraftaki hâliyle kalır.
  {const bs=comps.filter(c=>ids.has(c.id)),med=a=>{const q=a.slice().sort((x,y)=>x-y);return q[q.length>>1];},tp=med(bs.map(c=>c.box[1])),bt=med(bs.map(c=>c.box[3])),CH=Math.max(4,bt-tp);
   const caps=!/[a-z]/.test(text);if(caps&&bs.some(c=>c.box[1]<tp-CH*.12||c.box[3]>bt+CH*.12)){report.push({text,conf:+conf.toFixed(2),skip:'merged-mark'});continue;}}
  const IW=ix1-ix0+1,IH=iy1-iy0+1;let best=null;
  for(const f of fonts){const R=renderText(createCanvas,f,text.replace(/i/g,'ı').replace(/j/g,'ȷ'),IW,IH);if(!R)continue;if(Math.abs(Math.log(R.sx/R.sy))>.7)continue;
   const tm=maskOf(createCanvas,LM.w,LM.h,g=>R.draw(g,ix0,iy0,R.sx,R.sy));const s=iou(tm,LM.m,LM.w,LM.h)-Math.max(0,Math.abs(Math.log(R.sx/R.sy))-.25)*.3;if(!best||s>best.s)best={s,f,R};}
  if(!best||best.s<MIN_IOU){report.push({text,conf:+conf.toFixed(2),iou:best?+best.s.toFixed(2):0,skip:'shape-mismatch'});continue;}
  // renk: satır mürekkebindeki baskın palet rengi
  const cnt=palette.map(()=>0);for(let y=0;y<LM.h;y++)for(let x=0;x<LM.w;x++){if(!LM.m[y*LM.w+x])continue;const j=((y+ext[1])*img.w+(x+ext[0]))*4;let bi=0,bd=1e9;palette.forEach((p,q)=>{const d=(img.data[j]-p[0])**2+(img.data[j+1]-p[1])**2+(img.data[j+2]-p[2])**2;if(d<bd){bd=d;bi=q;}});cnt[bi]++;}
  const col=palette[cnt.indexOf(Math.max(...cnt))]||[0,0,0];
  // çıktıda eski satırı sil, yeni yazıyı çiz
  const OX=(ext[0]-bx0)*k,OY=(ext[1]-by0)*k;og.save();og.beginPath();
  for(let y=0;y<LM.h;y++){let s=-1;for(let x=0;x<=LM.w;x++){const on=x<LM.w&&LM.m[y*LM.w+x];if(on&&s<0)s=x;if(!on&&s>=0){og.rect(OX+(s-1.5)*k,OY+(y-1.5)*k,(x-s+3)*k,3*k);s=-1;}}}
  og.clip();if(opaqueGround){og.fillStyle=`rgb(${surface.map(Math.round)})`;og.fillRect(0,0,out.w,out.h);}else og.clearRect(0,0,out.w,out.h);og.restore();
  og.fillStyle=`rgb(${col.map(Math.round)})`;best.R.draw(og,OX+ix0*k,OY+iy0*k,best.R.sx*k,best.R.sy*k);
  // Türkçe işaret ve noktalar (gövde olmayan küçük lekeler) fotoğraftaki hâliyle geri konur
  {const marks=comps.filter(c=>!ids.has(c.id)&&c.box[0]>=ext[0]-1&&c.box[2]<=ext[2]+1&&c.box[1]>=ext[1]-1&&c.box[3]<=ext[3]+1);if(marks.length){const cur=og.getImageData(0,0,out.w,out.h);
   for(const c of marks){const X0=Math.max(0,Math.floor((c.box[0]-1-bx0)*k)),X1=Math.min(out.w,Math.ceil((c.box[2]+1-bx0)*k)),Y0=Math.max(0,Math.floor((c.box[1]-1-by0)*k)),Y1=Math.min(out.h,Math.ceil((c.box[3]+1-by0)*k));
    for(let Y=Y0;Y<Y1;Y++)for(let X=X0;X<X1;X++){const sx=Math.min(w-1,Math.round(X/k+bx0-.5)),sy=Math.min(h-1,Math.round(Y/k+by0-.5));let near=false;for(let dy=-1;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++){const xx=sx+dx,yy=sy+dy;if(xx>=0&&yy>=0&&xx<w&&yy<h&&lab[yy*w+xx]===c.id){near=true;break;}}
     if(!near)continue;const o=(Y*out.w+X)*4;if(out.data[o+3]>cur.data[o+3]||opaqueGround){for(let q=0;q<4;q++)cur.data[o+q]=out.data[o+q];}}}
   og.putImageData(cur,0,0);}}
  replaced++;report.push({text,conf:+conf.toFixed(2),iou:+best.s.toFixed(2),font:best.f.family});}
 if(replaced){const d=og.getImageData(0,0,out.w,out.h).data;out.data.set(d);}
 return {replaced,lines:report};}
const api=Object.freeze({redraw,FONTS,recTensor,ctcDecode,normalize,turkish});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TextRedraw=api;
})(typeof globalThis!=='undefined'?globalThis:this);
