/* Fotoğraftaki tabela/yazı harflerinden yerel, yapay zekâsız logo önerisi.
   Dış servis, OCR modeli veya üretilmiş piksel yok: renk grupları + bağlantılı bileşenler + harf şablonu
   eşleştirmesi. Her harf net tanınmazsa sonuç üretmez. Sonuç yalnız bir öneridir; tasarım onayı vermez. */
(function(root){'use strict';
const WEIGHTS=Object.freeze(['Regular','Medium','SemiBold','Bold','ExtraBold','Black']);
const CHARS=Object.freeze([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789','И','Я']);
// Ayrı parçalı Türkçe harfler: gövde + üstte/altta küçük parça
const ABOVE=Object.freeze({U:'Ü',O:'Ö',G:'Ğ',I:'İ'}),BELOW=Object.freeze({C:'Ç',S:'Ş'});
const NW=36,NH=48,MAX_SIDE=1200,MIN_LETTERS=3,MAX_LETTERS=24;
const MIN_SCORE=.45,MIN_WORD_SCORE=.55,MIN_MARGIN=.06,TRACKING=.04;
const family=weight=>'HLSign'+weight;

function hsv(r,g,b){const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h/=6;if(h<0)h+=1;}return [h,mx?d/mx:0,mx/255];}
const inkLike=(s,v)=>s>.25&&v>.12&&v<.97;
const hueBin=h=>Math.floor(h*36)%36;
const binNear=(a,b)=>Math.min(Math.abs(a-b),36-Math.abs(a-b))<=1;

// Renk grubunun maskesi (3×3 çoğunluk süzgeciyle tek piksel gürültüsü atılır)
// Renksiz mürekkep (beyaz pano yazısı / siyah yazı): ayrı aday maskeler
const LIGHT='light',DARK='dark',achroma={[LIGHT]:(s,v)=>s<.2&&v>.8,[DARK]:(s,v)=>v<.28};
function maskFor(img,bin){
 const {width:w,height:h,data}=img,raw=new Uint8Array(w*h),out=new Uint8Array(w*h),pred=achroma[bin];
 for(let p=0,i=0;p<w*h;p++,i+=4){const [hh,s,v]=hsv(data[i],data[i+1],data[i+2]);if(data[i+3]>200&&(pred?pred(s,v):(inkLike(s,v)&&binNear(hueBin(hh),bin))))raw[p]=1;}
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)n+=raw[(y+dy)*w+x+dx];out[y*w+x]=n>=5?1:0;}
 out.raw=raw;return out;
}
// 4-komşu bağlantılı bileşenler; pikseller tek dizide tutulur
function components(mask,w,h){
 const label=new Int32Array(w*h),list=new Int32Array(w*h),stack=new Int32Array(w*h),comps=[];let pos=0,id=0;
 for(let p=0;p<w*h;p++){if(!mask[p]||label[p])continue;id++;let sp=0;stack[sp++]=p;label[p]=id;const start=pos;let x0=w,y0=h,x1=-1,y1=-1;
  while(sp){const q=stack[--sp];list[pos++]=q;const x=q%w,y=(q-x)/w;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
   if(x>0&&mask[q-1]&&!label[q-1]){label[q-1]=id;stack[sp++]=q-1;}if(x<w-1&&mask[q+1]&&!label[q+1]){label[q+1]=id;stack[sp++]=q+1;}
   if(y>0&&mask[q-w]&&!label[q-w]){label[q-w]=id;stack[sp++]=q-w;}if(y<h-1&&mask[q+w]&&!label[q+w]){label[q+w]=id;stack[sp++]=q+w;}}
  comps.push({n:pos-start,start,end:pos,x0,y0,x1,y1});}
 return {comps,list};
}
// Yan yana, benzer boyda, harf benzeri bileşen dizisi
const letterLike=c=>{const ch=c.y1-c.y0,cw=c.x1-c.x0+1,fill=c.n/(cw*(ch+1)),asp=cw/(ch+1);return (fill<.75&&asp>.15&&asp<1.6)||(fill>=.6&&asp>=.06&&asp<=.3);};
// Komşudan komşuya zincir: eğik satırda da uçtaki harfler kaybolmaz
// Tekrar eden şerit (tente, panjur, korkuluk, ızgara): eşit genişlikte, eşit aralıklı, dolu çubuklar — harf dizisi değildir.
// Harflerin genişlikleri ve doluluğu farklıdır (I dar, M geniş; O içi boş).
function isStripe(row){if(row.length<5)return false;const cv=a=>{const m=a.reduce((x,y)=>x+y,0)/a.length;return m?Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length)/m:0;};
 const ws=row.map(c=>c.x1-c.x0+1),gs=row.slice(1).map((c,i)=>c.x0-row[i].x1),fill=row.map(c=>c.n/((c.x1-c.x0+1)*(c.y1-c.y0+1)));
 const mf=fill.reduce((a,b)=>a+b,0)/fill.length,asp=row.reduce((a,c)=>a+(c.x1-c.x0+1)/(c.y1-c.y0+1),0)/row.length;
 // şerit: neredeyse tamamen dolu (≥%80), eşit genişlikte dar çubuklar; harflerde doluluk düşük, genişlik farklıdır
 return (cv(ws)<.2&&mf>.8&&asp<.6)||row.length>MAX_LETTERS;} // aralıklar önündeki direk vb. yüzünden düzensiz olabilir; ölçüt değildir
// Komşudan komşuya zincir: eğik satırda da uçtaki harfler kaybolmaz. Tüm aday zincirler döner (uzundan kısaya), şeritler atılır.
function glyphRows(comps,w,h){
 const minArea=Math.max(40,w*h*.00004),cands=comps.filter(c=>c.n>=minArea&&c.y1-c.y0>=10&&letterLike(c)).sort((a,b)=>a.x0-b.x0),chains=[];
 for(let i=0;i<cands.length;i++){const chain=[cands[i]];let last=cands[i];
  for(let j=i+1;j<cands.length;j++){const c=cands[j],lh=last.y1-last.y0+1,ch=c.y1-c.y0+1,heights=chain.map(d=>d.y1-d.y0+1).sort((a,b)=>a-b),mh=heights[Math.floor(heights.length/2)],gap=c.x0-last.x1;
   if(gap>4.5*mh)break;
   if(ch>.65*mh&&ch<1.5*mh&&Math.abs((c.y0+c.y1)/2-(last.y0+last.y1)/2)<.45*lh&&gap>-.15*lh){chain.push(c);last=c;}}
  if(chain.length<MIN_LETTERS)continue;
  // üst üste binen (ör. harf içindeki parça) bileşenleri at
  const row=chain.filter((c,k)=>!chain.some((d,j)=>j!==k&&d.n>c.n&&c.x0>=d.x0&&c.x1<=d.x1));if(row.length>=MIN_LETTERS&&!isStripe(row))chains.push(row);}
 chains.sort((a,b)=>b.length-a.length);
 // başka bir zincirin alt kümesi olan zincirler atılır
 return chains.filter((c,i)=>!chains.some((d,j)=>j<i&&c.every(x=>d.includes(x))));
}
function glyphRow(comps,w,h){return glyphRows(comps,w,h)[0]||[];}
// Aday harf satırları: renk gruplarından ve renksiz (beyaz/siyah) mürekkepten; her aday ayrı doğrulanır, sonuç sırayla tanımaya girer
function findRows(img,limit=8){
 const {width:w,height:h,data}=img,counts=new Array(36).fill(0);
 for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){const i=(y*w+x)*4,[hh,s,v]=hsv(data[i],data[i+1],data[i+2]);if(inkLike(s,v))counts[hueBin(hh)]++;}
 const bins=[...counts.map((n,b)=>[n,b]).filter(([n])=>n>0).sort((a,b)=>b[0]-a[0]).slice(0,6).map(([,b])=>b),LIGHT,DARK],out=[];
 for(const bin of bins){const mask=maskFor(img,bin),{comps,list}=components(mask,w,h);
  for(const row0 of glyphRows(comps,w,h).slice(0,3)){const cand={bin,mask,row:row0,list,comps,rawLen:row0.length};
   const meanColor=c=>{let r=0,g=0,b=0,n=0;for(let k=c.start;k<c.end;k+=Math.max(1,Math.floor((c.end-c.start)/400))){const i=list[k]*4;r+=data[i];g+=data[i+1];b+=data[i+2];n++;}return [r/n,g/n,b/n];};
   const cols=cand.row.map(meanColor),med=[0,1,2].map(k=>{const a=cols.map(c=>c[k]).sort((x,y)=>x-y);return a[Math.floor(a.length/2)];});
   cand.row=cand.row.filter((c,i)=>Math.hypot(cols[i][0]-med[0],cols[i][1]-med[1],cols[i][2]-med[2])<=45);cand.ink=med;cand.meanColor=meanColor;
   if(cand.row.length<MIN_LETTERS||cand.row.length>MAX_LETTERS||isStripe(cand.row))continue;
   {const row=cand.row,hs=row.map(c=>c.y1-c.y0+1).sort((a,b)=>a-b),mh=hs[Math.floor(hs.length/2)],ns=row.map(c=>c.n).sort((a,b)=>a-b),mn=ns[Math.floor(ns.length/2)];
    const x0=row[0].x0-4.5*mh,x1=row[row.length-1].x1+4.5*mh,lineY=x=>{const a=row[0],b=row[row.length-1],ya=(a.y0+a.y1)/2,yb=(b.y0+b.y1)/2;return b.x0===a.x0?ya:ya+(yb-ya)*(x-(a.x0+a.x1)/2)/(((b.x0+b.x1)/2)-((a.x0+a.x1)/2)||1);};
    const leftover=comps.some(c=>{if(row.includes(c))return false;const ch=c.y1-c.y0+1,cx=(c.x0+c.x1)/2;if(c.n<.35*mn||ch<.6*mh||ch>1.5*mh||cx<x0||cx>x1)return false;if(Math.abs((c.y0+c.y1)/2-lineY(cx))>.5*mh)return false;if(row.some(d=>c.x0>=d.x0&&c.x1<=d.x1))return false;const col=meanColor(c);return Math.hypot(col[0]-cand.ink[0],col[1]-cand.ink[1],col[2]-cand.ink[2])<=45;});
    if(leftover)continue;}
   out.push({ok:true,...cand,achromatic:!!achroma[bin]});}}
 // sıra: renkli adaylar uzunluğa göre (önceki davranış), sonra renksiz adaylar; aynı bölgeyi kaplayan tekrar adaylar atılır
 out.sort((a,b)=>(a.achromatic-b.achromatic)||(b.rawLen-a.rawLen));
 const box=c=>[Math.min(...c.row.map(r=>r.x0)),Math.min(...c.row.map(r=>r.y0)),Math.max(...c.row.map(r=>r.x1)),Math.max(...c.row.map(r=>r.y1))],keep=[];
 for(const c of out){const b=box(c);if(keep.some(k=>{const q=box(k),ix=Math.min(b[2],q[2])-Math.max(b[0],q[0]),iy=Math.min(b[3],q[3])-Math.max(b[1],q[1]);return ix>0&&iy>0&&ix*iy>.3*Math.min((b[2]-b[0])*(b[3]-b[1]),(q[2]-q[0])*(q[3]-q[1]));}))continue;keep.push(c);}
 return keep.slice(0,limit);
}
function findRow(img){return findRows(img,1)[0]||{ok:false,reason:'no-letter-row'};}
// Kazanan satır dışındaki belirgin yazı satırları (ambalaj/kartvizitte adres, telefon vb.): varsa tek satırlık logo yetmez, tüm baskı ayrılmalı
function otherRows(cands,found){const mh=r=>{const hs=r.row.map(c=>c.y1-c.y0+1).sort((a,b)=>a-b);return hs[hs.length>>1];},H=mh(found),bx=r=>[Math.min(...r.row.map(c=>c.x0)),Math.min(...r.row.map(c=>c.y0)),Math.max(...r.row.map(c=>c.x1)),Math.max(...r.row.map(c=>c.y1))],B=bx(found);
 return cands.filter(r=>{if(r===found||r.row.length<MIN_LETTERS)return false;const q=bx(r),ix=Math.min(B[2],q[2])-Math.max(B[0],q[0]),iy=Math.min(B[3],q[3])-Math.max(B[1],q[1]);if(ix>0&&iy>0)return false;return mh(r)>=H*.2;}).length;}

function canvasOf(make,w,h){const c=make(Math.max(1,Math.ceil(w)),Math.max(1,Math.ceil(h)));return c;}
function alphaBox(ctx,w,h,threshold=110){const d=ctx.getImageData(0,0,w,h).data;let x0=w,y0=h,x1=-1,y1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>threshold){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}return x1<0?null:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};}
// Diğer harflerden belirgin uzun bileşen: taşan kısım taban çizgisinin altında/üstündeyse gövdeyi ayır
function splitAttached(found,w){
 const row=found.row,hs=row.map(c=>c.y1-c.y0+1).sort((a,b)=>a-b),mh=hs[Math.floor(hs.length/2)];
 const tops=row.map(c=>c.y0).sort((a,b)=>a-b),bots=row.map(c=>c.y1).sort((a,b)=>a-b),top=tops[Math.floor(tops.length/2)],bot=bots[Math.floor(bots.length/2)];
 return row.map(c=>{const h=c.y1-c.y0+1;if(h<=1.15*mh)return {comp:c,list:found.list,mark:null};
  const below=c.y1>bot+.1*mh&&c.y0>=top-.1*mh,above=c.y0<top-.1*mh&&c.y1<=bot+.1*mh;if(!below&&!above)return {comp:c,list:found.list,mark:null};
  const yMin=below?c.y0:Math.max(c.y0,top-Math.round(.02*mh)),yMax=below?Math.min(c.y1,bot+Math.round(.02*mh)):c.y1,pick=[];
  for(let k=c.start;k<c.end;k++){const q=found.list[k],y=(q-q%w)/w;if(y>=yMin&&y<=yMax)pick.push(q);}
  const list=Int32Array.from(pick);let x0=Infinity,x1=-1;for(const q of pick){const x=q%w;if(x<x0)x0=x;if(x>x1)x1=x;}
  return {comp:{n:pick.length,start:0,end:pick.length,x0,y0:yMin,x1,y1:yMax},list,mark:below?'below':'above'};});
}
// Harfi dikleştir: en dar yüksekliği veren küçük dönüş açısı
function uprightGlyph(c,list,w,make){
 const pts=[];for(let k=c.start;k<c.end;k+=Math.max(1,Math.floor((c.end-c.start)/1500)))pts.push(list[k]);
 let best={h:Infinity,a:0};
 for(let d=-8;d<=8;d+=.5){const a=d*Math.PI/180,sn=Math.sin(a),cs=Math.cos(a);let mn=Infinity,mx=-Infinity;for(const q of pts){const x=q%w,y=(q-x)/w,yy=x*sn+y*cs;if(yy<mn)mn=yy;if(yy>mx)mx=yy;}if(mx-mn<best.h-1e-9)best={h:mx-mn,a};}
 const gw=c.x1-c.x0+1,gh=c.y1-c.y0+1,src=canvasOf(make,gw,gh),sctx=src.getContext('2d'),id=sctx.createImageData(gw,gh);
 const bm=new Uint8Array(gw*gh);for(let k=c.start;k<c.end;k++){const q=list[k];bm[((q-q%w)/w-c.y0)*gw+(q%w-c.x0)]=1;}
 // gürültüden kalan 1–2 piksellik boşlukları doldur (sahte "delik" oluşmasın)
 for(let pass=0;pass<2;pass++){const add=[];for(let y=1;y<gh-1;y++)for(let x=1;x<gw-1;x++){if(bm[y*gw+x])continue;let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)n+=bm[(y+dy)*gw+x+dx];if(n>=5)add.push(y*gw+x);}for(const p of add)bm[p]=1;}
 for(let p=0;p<gw*gh;p++)if(bm[p]){const i=p*4;id.data[i]=id.data[i+1]=id.data[i+2]=255;id.data[i+3]=255;}
 sctx.putImageData(id,0,0);
 const pad=Math.ceil(Math.max(gw,gh)*.3),big=canvasOf(make,gw+2*pad,gh+2*pad),b=big.getContext('2d');
 b.translate(big.width/2,big.height/2);b.rotate(best.a);b.drawImage(src,-gw/2,-gh/2);
 const box=alphaBox(b,big.width,big.height);if(!box)return null;
 const out=canvasOf(make,box.w,box.h);out.getContext('2d').drawImage(big,box.x,box.y,box.w,box.h,0,0,box.w,box.h);return out;
}
function normalized(src,make){const n=canvasOf(make,NW,NH),x=n.getContext('2d');x.drawImage(src,0,0,src.width,src.height,0,0,NW,NH);const d=x.getImageData(0,0,NW,NH).data,m=new Uint8Array(NW*NH);for(let p=0;p<NW*NH;p++)m[p]=d[p*4+3]>110?1:0;return {mask:m,aspect:src.width/src.height,dist:distance(m),holes:holes(m),symmetry:symmetry(m)};}
function distance(m){const INF=1e9,d=new Float32Array(NW*NH);for(let p=0;p<d.length;p++)d[p]=m[p]?0:INF;
 for(let y=0;y<NH;y++)for(let x=0;x<NW;x++){const p=y*NW+x;if(x)d[p]=Math.min(d[p],d[p-1]+1);if(y)d[p]=Math.min(d[p],d[p-NW]+1);if(x&&y)d[p]=Math.min(d[p],d[p-NW-1]+1.4);if(x<NW-1&&y)d[p]=Math.min(d[p],d[p-NW+1]+1.4);}
 for(let y=NH-1;y>=0;y--)for(let x=NW-1;x>=0;x--){const p=y*NW+x;if(x<NW-1)d[p]=Math.min(d[p],d[p+1]+1);if(y<NH-1)d[p]=Math.min(d[p],d[p+NW]+1);if(x<NW-1&&y<NH-1)d[p]=Math.min(d[p],d[p+NW+1]+1.4);if(x&&y<NH-1)d[p]=Math.min(d[p],d[p+NW-1]+1.4);}
 return d;}
function holes(m){const W=NW+2,H=NH+2,bg=new Uint8Array(W*H),seen=new Uint8Array(W*H),st=[];for(let y=0;y<NH;y++)for(let x=0;x<NW;x++)bg[(y+1)*W+x+1]=m[y*NW+x]?0:1;for(let x=0;x<W;x++){bg[x]=1;bg[(H-1)*W+x]=1;}for(let y=0;y<H;y++){bg[y*W]=1;bg[y*W+W-1]=1;}
 let count=0;for(let p=0;p<W*H;p++){if(!bg[p]||seen[p])continue;let area=0;st.push(p);seen[p]=1;while(st.length){const q=st.pop();area++;for(const r of [q-1,q+1,q-W,q+W])if(r>=0&&r<W*H&&bg[r]&&!seen[r]){seen[r]=1;st.push(r);}}if(area>=6)count++;}
 return Math.max(0,count-1);}
function chamfer(a,b,da,db){let sa=0,na=0,sb=0,nb=0;for(let p=0;p<a.length;p++){if(a[p]){sa+=db[p];na++;}if(b[p]){sb+=da[p];nb++;}}return na&&nb?(sa/na+sb/nb)/2/NH:1;}
function symmetry(m){const f=new Uint8Array(m.length);for(let y=0;y<NH;y++)for(let x=0;x<NW;x++)f[y*NW+x]=m[y*NW+NW-1-x];return iou(m,f);}
function shapeScore(g,t){return iou(g.mask,t.mask)-.6*Math.abs(g.aspect-t.aspect)-3*chamfer(g.mask,t.mask,g.dist,t.dist)-.4*Math.abs(g.holes-t.holes)-.25*Math.abs(g.symmetry-t.symmetry);}
function iou(a,b){let i=0,u=0;for(let p=0;p<a.length;p++){i+=a[p]&b[p];u+=a[p]|b[p];}return u?i/u:0;}
// Çizgi kalınlığı / harf yüksekliği: satır ve sütunlardaki dolu koşuların ortancası
function strokeRatio(src){
 const w=src.width,h=src.height,d=src.getContext('2d').getImageData(0,0,w,h).data,on=(x,y)=>d[(y*w+x)*4+3]>110,runs=[];
 for(let y=Math.floor(h*.15);y<Math.ceil(h*.85);y++){let r=0;for(let x=0;x<w;x++){if(on(x,y))r++;else if(r){runs.push(r);r=0;}}if(r)runs.push(r);}
 for(let x=0;x<w;x++){let r=0;for(let y=0;y<h;y++){if(on(x,y))r++;else if(r){runs.push(r);r=0;}}if(r)runs.push(r);}
 const ok=runs.filter(r=>r<h*.5).sort((a,b)=>a-b);return ok.length?ok[Math.floor(ok.length/2)]/h:0;
}
function renderChar(ch,weight,make,size=200){const c=canvasOf(make,size*1.6,size*1.6),x=c.getContext('2d');x.font=`${size}px "${family(weight)}"`;x.textBaseline='top';x.fillStyle='#fff';x.fillText(ch,size*.2,size*.2);const box=alphaBox(x,c.width,c.height);if(!box)return null;const o=canvasOf(make,box.w,box.h);o.getContext('2d').drawImage(c,box.x,box.y,box.w,box.h,0,0,box.w,box.h);return o;}
const median=a=>{const b=a.slice().sort((x,y)=>x-y);return b[Math.floor(b.length/2)];};

function chooseWeight(glyphs,make){
 const target=median(glyphs.map(strokeRatio));
 const scored=WEIGHTS.map(wt=>({weight:wt,ratio:median([...'HNEU'].map(ch=>{const g=renderChar(ch,wt,make);return g?strokeRatio(g):0;}))}));
 return {target,weight:scored.reduce((a,b)=>Math.abs(b.ratio-target)<Math.abs(a.ratio-target)?b:a).weight,scored};
}
function recognize(glyphs,weight,make){
 const templates=CHARS.map(ch=>{const g=renderChar(ch,weight,make);return g?{ch,...normalized(g,make)}:null;}).filter(Boolean);
 return glyphs.map(g=>{const n=normalized(g,make),s=templates.map(t=>({ch:t.ch,score:shapeScore(n,t)})).sort((a,b)=>b.score-a.score);if(!s.length)return {ch:'?',score:-1,second:'?',margin:0};return {ch:s[0].ch,score:s[0].score,second:s[1]?.ch||'-',margin:s[1]?s[0].score-s[1].score:s[0].score};});
}
// Işık dengesi: harf rengi, harflerin çevresindeki açık ve doygunluğu düşük (panel/zemin) piksellere göre
function balancedColor(img,found){
 const {width:w,data}=img,row=found.row,x0=Math.min(...row.map(c=>c.x0)),x1=Math.max(...row.map(c=>c.x1)),y0=Math.min(...row.map(c=>c.y0)),y1=Math.max(...row.map(c=>c.y1));
 const ink=[[],[],[]],white=[[],[],[]],bright=[];
 for(const c of row)for(let k=c.start;k<c.end;k+=3){const i=found.list[k]*4;ink[0].push(data[i]);ink[1].push(data[i+1]);ink[2].push(data[i+2]);bright.push(Math.max(data[i],data[i+1],data[i+2]));}
 for(let y=y0;y<=y1;y+=2)for(let x=x0;x<=x1;x+=2){const p=y*w+x;if(found.mask[p])continue;const i=p*4,[,s,v]=hsv(data[i],data[i+1],data[i+2]);if(s<.12&&v>.55){white[0].push(data[i]);white[1].push(data[i+1]);white[2].push(data[i+2]);}}
 const q=(a,f)=>{const b=a.slice().sort((x,y)=>x-y);return b[Math.min(b.length-1,Math.floor(b.length*f))];};
 let rgb;
 if(white[0].length>=20){rgb=[0,1,2].map(k=>Math.min(255,Math.round(q(ink[k],.5)*255/Math.max(1,q(white[k],.75)))));}
 else{const cut=q(bright,.75),sel=[[],[],[]];for(let k=0;k<bright.length;k++)if(bright[k]>=cut){sel[0].push(ink[0][k]);sel[1].push(ink[1][k]);sel[2].push(ink[2][k]);}rgb=[0,1,2].map(k=>q(sel[k],.5));}
 return '#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');
}
function addDiacritics(found,letters,parts,w,h,img){
 const raw=found.mask.raw||found.mask,data=img.data;
 // işaret harfle aynı mürekkep renginde olmalı (ör. kahverengi çerçeve turuncu harfin işareti sayılmaz)
 const cols=[[],[],[]];for(const c of found.row)for(let k=c.start;k<c.end;k+=5){const i=found.list[k]*4;cols[0].push(data[i]);cols[1].push(data[i+1]);cols[2].push(data[i+2]);}
 const ink=cols.map(a=>median(a)),sameInk=p=>Math.hypot(data[p*4]-ink[0],data[p*4+1]-ink[1],data[p*4+2]-ink[2])<=60;
 const run=(x,y,limit)=>{let a=x,b=x;while(a>0&&raw[y*w+a-1]&&x-a<limit)a--;while(b<w-1&&raw[y*w+b+1]&&b-x<limit)b++;return b-a+1;};
 const inkIn=(x0,x1,y0,y1,gw)=>{let n=0;for(let y=Math.max(0,Math.round(y0));y<=Math.min(h-1,Math.round(y1));y++)for(let x=Math.max(0,Math.round(x0));x<=Math.min(w-1,Math.round(x1));x++)if(raw[y*w+x]&&sameInk(y*w+x)&&run(x,y,gw*1.2)<=gw*1.05)n++;return n;};
 return letters.map((l,i)=>{const c=parts[i].comp,gh=c.y1-c.y0+1,gw=c.x1-c.x0+1,need=Math.max(3,c.n*.008);
  const above=parts[i].mark==='above'||inkIn(c.x0+gw*.1,c.x1-gw*.1,c.y0-gh*.38,c.y0-gh*.06,gw)>=need;
  const below=parts[i].mark==='below'||inkIn(c.x0+gw*.2,c.x1-gw*.2,c.y1+gh*.08,c.y1+gh*.4,gw)>=need;
  const ch=above&&ABOVE[l.ch]?ABOVE[l.ch]:below&&BELOW[l.ch]?BELOW[l.ch]:l.ch;return {...l,ch};});
}
// Satırda eksik harf: iki harf arasındaki boşlukta aynı mürekkepten belirgin parça varsa (harf bulunamamış) sonuç verilmez
function missingLetter(found,w){const row=found.row,ns=row.map(c=>c.n).sort((a,b)=>a-b),mn=ns[ns.length>>1],hs=row.map(c=>c.y1-c.y0+1).sort((a,b)=>a-b),mh=hs[hs.length>>1];
 // satır dışında kalmış, harf boyunda ayrı bir parça iki harfin arasında duruyorsa (ör. çengeli yüzünden elenen Ç) harf eksiktir
 for(let i=1;i<row.length;i++){const a=row[i-1],b=row[i],y0=Math.min(a.y0,b.y0)-.2*mh,y1=Math.max(a.y1,b.y1)+.4*mh;
  for(const c of found.comps){if(row.includes(c))continue;const ch=c.y1-c.y0+1,cx=(c.x0+c.x1)/2;if(cx<=a.x1||cx>=b.x0||c.y0<y0||c.y1>y1)continue;if(ch>=.5*mh&&ch<=1.7*mh&&c.n>=.25*mn)return true;}
  // parça zemine değip büyük bileşene karıştıysa: harf bandında, tam boy dolu sütunlar (pano arası şerit) dışındaki mürekkep sayılır
  {const m=found.mask,bx0=a.x1+2,bx1=b.x0-2,ty0=Math.round(Math.max(a.y0,b.y0)+.1*mh),ty1=Math.round(Math.min(a.y1,b.y1)-.1*mh),bh=ty1-ty0+1;if(bx1-bx0>=3&&bh>4){let n=0;
   for(let x=bx0;x<=bx1;x++){let col=0;for(let y=ty0;y<=ty1;y++)col+=m[y*w+x]?1:0;if(col<bh*.9)n+=col;}if(n>=mn*.12)return true;}}}
 return false;}
function wordTokens(row){const mh=median(row.map(c=>c.y1-c.y0+1)),gaps=row.slice(1).map((c,i)=>c.x0-row[i].x1),mg=gaps.length?median(gaps):0;let t=0;return row.map((c,i)=>{const g=i?gaps[i-1]:0;if(i&&g>Math.max(1.8*mg,.35*mh))t++;/* kelime boşluğu: olağan harf aralığına göre aykırı büyük aralık */return t;});}
function wordWithSpaces(row,letters){const token=wordTokens(row);let out='';row.forEach((c,i)=>{if(i&&token[i]!==token[i-1])out+=' ';out+=letters[i].ch;});return out;}
function renderWord(word,weight,color,make,size=240){
 const probe=canvasOf(make,10,10).getContext('2d');probe.font=`${size}px "${family(weight)}"`;
 const adv=[...word].map(ch=>probe.measureText(ch).width),total=adv.reduce((a,b)=>a+b,0)+TRACKING*size*(word.length-1);
 const c=canvasOf(make,total+size,size*1.8),x=c.getContext('2d');x.font=`${size}px "${family(weight)}"`;x.textBaseline='top';x.fillStyle=color;let pen=size*.5;
 [...word].forEach((ch,i)=>{x.fillText(ch,pen,size*.3);pen+=adv[i]+TRACKING*size;});
 const box=alphaBox(x,c.width,c.height,8);if(!box)return null;const pad=Math.round(box.h*.25),o=canvasOf(make,box.w+2*pad,box.h+2*pad),oc=o.getContext('2d');oc.drawImage(c,box.x,box.y,box.w,box.h,pad,pad,box.w,box.h);
 // tek mürekkep: kenar yumuşatması yalnız saydamlıkta kalır, renk tamamen aynıdır
 const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),d=oc.getImageData(0,0,o.width,o.height);for(let p=0;p<d.data.length;p+=4){if(d.data[p+3]){d.data[p]=rgb[0];d.data[p+1]=rgb[1];d.data[p+2]=rgb[2];}}oc.putImageData(d,0,0);return o;
}

// Ana giriş: kaynak (Image/ImageBitmap/Canvas) → {ok,word,weight,color,canvas,letters} ya da {ok:false,reason}
function fromImage(source,{createCanvas}){
 if(typeof createCanvas!=='function')throw new TypeError('createCanvas gerekli');
 const sw=source.width,sh=source.height;if(!(sw>=40&&sh>=40))return {ok:false,reason:'too-small'};
 const k=Math.min(1,MAX_SIDE/Math.max(sw,sh)),w=Math.round(sw*k),h=Math.round(sh*k),c=canvasOf(createCanvas,w,h),ctx=c.getContext('2d');
 ctx.drawImage(source,0,0,w,h);const img=ctx.getImageData(0,0,w,h),cands=findRows(img);if(!cands.length)return {ok:false,reason:'no-letter-row'};
 // adaylar sırayla tanınır; ilk güvenle okunan kullanılır (tente gibi yanlış aday tanımada elenir, gerçek tabela kaybolmaz)
 let last={ok:false,reason:'low-confidence'};
 for(let k=0;k<cands.length;k++){const r=readRow(cands[k],img,w,h,createCanvas,k>0);if(r.ok)return {...r,otherRows:otherRows(findRows(img,24),cands[k])};if(k===0)last=r;}
 return last;
}
function readRow(found,img,w,h,createCanvas,strict=false){
 const parts=splitAttached(found,w),glyphs=parts.map(p=>uprightGlyph(p.comp,p.list,w,createCanvas));if(glyphs.some(g=>!g))return {ok:false,reason:'glyph-failed'};
 const {weight,target}=chooseWeight(glyphs,createCanvas),letters=recognize(glyphs,weight,createCanvas);
 {const PAIRS=[['S','5'],['O','0'],['I','1'],['Z','2'],['B','8'],['G','6'],['T','7'],['A','4']],digit=ch=>/[0-9]/.test(ch);
  const sure=letters.filter(l=>l.margin>=MIN_MARGIN),letterVotes=sure.filter(l=>!digit(l.ch)).length,digitVotes=sure.length-letterVotes;
  // Rakamlarda çengel/nokta olmaz: işaretli parçadan rakam çıktıysa ikiz harf kullanılır (ör. 5 + çengel = Ş)
  letters.forEach((l,i)=>{const pair=PAIRS.find(([,b])=>b===l.ch);if(pair&&parts[i].mark){l.ch=pair[0];l.margin=Math.max(l.margin,MIN_MARGIN);l.context=true;}});
  // Harf kelimesinde tek kalan benzer rakam: sınıflandırıcı ikiz harfi de yakın görmüşse harf seçilir
  const token=wordTokens(found.row);
  letters.forEach((l,i)=>{const pair=PAIRS.find(([a,b])=>l.ch===b&&l.second===a);if(!pair||l.margin>=.2)return;const mates=letters.filter((m,j)=>j!==i&&token[j]===token[i]);if(mates.length>=2&&mates.every(m=>!digit(m.ch))){l.ch=pair[0];l.margin=Math.max(l.margin,MIN_MARGIN);l.context=true;}});
  for(const l of letters){if(l.margin>=MIN_MARGIN)continue;const pair=PAIRS.find(([a,b])=>(l.ch===a&&l.second===b)||(l.ch===b&&l.second===a));if(!pair)continue;
   if(letterVotes>=2&&letterVotes>2*digitVotes){l.ch=pair[0];l.margin=MIN_MARGIN;l.context=true;}else if(digitVotes>=2&&digitVotes>2*letterVotes){l.ch=pair[1];l.margin=MIN_MARGIN;l.context=true;}}}
 // ilk aday dışındakiler için daha sıkı güven (yanlış marka adı üretmektense sonuç vermemek)
 const ms=strict?MIN_MARGIN*2:MIN_MARGIN,ws=strict?MIN_WORD_SCORE+.1:MIN_WORD_SCORE;
 const confident=letters.every(l=>l.score>=MIN_SCORE&&l.margin>=ms)&&letters.reduce((a,l)=>a+l.score,0)/letters.length>=ws;
 if(!confident)return {ok:false,reason:'low-confidence',letters};
 if(missingLetter(found,w))return {ok:false,reason:'missing-letter',letters};
 return finish(found,img,w,h,createCanvas,letters,parts,weight,target);
}
function finish(found,img,w,h,createCanvas,letters,parts,weight,target){
 const word=wordWithSpaces(found.row,addDiacritics(found,letters,parts,w,h,img)),color=balancedColor(img,found),out=renderWord(word,weight,color,createCanvas);
 if(!out)return {ok:false,reason:'render-failed'};
 const rx0=Math.min(...found.row.map(c=>c.x0)),rx1=Math.max(...found.row.map(c=>c.x1)),ry0=Math.min(...found.row.map(c=>c.y0)),ry1=Math.max(...found.row.map(c=>c.y1));
 const coverage=((rx1-rx0+1)*(ry1-ry0+1))/(w*h),seen=new Set();
 for(let y=0;y<h;y+=3)for(let x=0;x<w;x+=3){if(x>=rx0&&x<=rx1&&y>=ry0&&y<=ry1)continue;const i=(y*w+x)*4;seen.add((img.data[i]>>5)<<6|(img.data[i+1]>>5)<<3|(img.data[i+2]>>5));}
 return {ok:true,word,weight,color,strokeRatio:target,letters,canvas:out,coverage,sceneColors:seen.size,method:'local-sign-lettering-v1'};
}
// İkinci okuyucu (isteğe bağlı): harf şablonları emin olamazsa, satır yerel metin tanıma modeliyle okunur (tarayıcıda; dışarı gönderilmez).
// Okunan harf sayısı satırdaki harf parçası sayısıyla birebir tutmalı ve okuma güveni yüksek olmalı; Türkçe işaretler yine geometriden.
async function fromImageAsync(source,{createCanvas,read=null}){
 const first=fromImage(source,{createCanvas});if(first.ok||!read)return first;
 const sw=source.width,sh=source.height;if(!(sw>=40&&sh>=40))return first;
 const k=Math.min(1,MAX_SIDE/Math.max(sw,sh)),w=Math.round(sw*k),h=Math.round(sh*k),c=canvasOf(createCanvas,w,h),ctx=c.getContext('2d');ctx.drawImage(source,0,0,w,h);
 const img=ctx.getImageData(0,0,w,h),cands=findRows(img);
 for(const found of cands){const parts=splitAttached(found,w);if(parts.length>MAX_LETTERS)continue;
  const x0=Math.min(...found.row.map(r=>r.x0)),x1=Math.max(...found.row.map(r=>r.x1)),y0=Math.min(...found.row.map(r=>r.y0)),y1=Math.max(...found.row.map(r=>r.y1));
  // tabelada harfler geniş aralıklı ve ayrı panolarda olabilir: harfler olağan aralıkla yan yana dizilip okunur (okuma güveni artar)
  const pad=Math.round((y1-y0+1)*.25),gapW=Math.round((y1-y0+1)*.18),ws=parts.map(p=>p.comp.x1-p.comp.x0+1),CW=ws.reduce((a,b)=>a+b,0)+gapW*(parts.length-1)+2*pad,CH=y1-y0+1+2*pad;
  const cc=canvasOf(createCanvas,CW,CH),cx=cc.getContext('2d'),corner=(()=>{const q=parts[0].comp,i=((Math.max(0,q.y0-2))*w+Math.max(0,q.x0-2))*4;return `rgb(${img.data[i]},${img.data[i+1]},${img.data[i+2]})`;})();
  cx.fillStyle=corner;cx.fillRect(0,0,CW,CH);let pen=pad;for(const p of parts){const q=p.comp,bw=q.x1-q.x0+1;cx.drawImage(c,q.x0,y0,bw,y1-y0+1,pen,pad,bw,y1-y0+1);pen+=bw+gapW;}
  const cd=cx.getImageData(0,0,CW,CH);
  let res;try{res=await read({data:cd.data,w:CW,h:CH},[0,0,CW,CH]);}catch{continue;}if(!res||!(res.conf>=.9))continue;
  const plain={'Ş':'S','Ç':'C','Ğ':'G','İ':'I','Ö':'O','Ü':'U','ı':'I'},chars=[...String(res.text||'').normalize('NFKC').toLocaleUpperCase('tr')].map(ch=>plain[ch]||ch).filter(ch=>/[A-Z0-9]/.test(ch));
  if(chars.length!==parts.length)continue;
  if(missingLetter(found,w))continue;
  const glyphs=parts.map(p=>uprightGlyph(p.comp,p.list,w,createCanvas));if(glyphs.some(g=>!g))continue;
  const {weight,target}=chooseWeight(glyphs,createCanvas),letters=chars.map(ch=>({ch,score:1,margin:1,reader:'ocr'}));
  const r=finish(found,img,w,h,createCanvas,letters,parts,weight,target);if(r.ok)return {...r,reader:'ocr',otherRows:otherRows(findRows(img,24),found)};}
 return first;}
async function loadFonts(base='assets/fonts/'){
 if(typeof FontFace!=='function'||typeof document==='undefined'||!document.fonts)return false;
 await Promise.all(WEIGHTS.map(async wt=>{const f=new FontFace(family(wt),`url(${base}inter-${wt}.woff2)`);await f.load();document.fonts.add(f);}));return true;
}
const api=Object.freeze({fromImage,fromImageAsync,loadFonts,family,WEIGHTS,CHARS,_internal:Object.freeze({hsv,findRow,findRows,strokeRatio,recognize,chooseWeight,balancedColor,splitAttached,uprightGlyph,normalized,renderChar,iou,chamfer})});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SignLettering=api;
})(typeof globalThis!=='undefined'?globalThis:this);
