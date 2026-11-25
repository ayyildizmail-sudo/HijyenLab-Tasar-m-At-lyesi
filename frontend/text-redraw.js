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
const EXTRA_FONTS=[{family:'HLR bebas-neue 400',file:'fs-bebas-neue-400',kind:'sans',weight:400},{family:'HLR cinzel 400',file:'fs-cinzel-400',kind:'serif',weight:400},{family:'HLR cinzel 500',file:'fs-cinzel-500',kind:'serif',weight:500},{family:'HLR cinzel 600',file:'fs-cinzel-600',kind:'serif',weight:600},{family:'HLR cinzel 700',file:'fs-cinzel-700',kind:'serif',weight:700},{family:'HLR cinzel 800',file:'fs-cinzel-800',kind:'serif',weight:800},{family:'HLR cormorant-garamond 400',file:'fs-cormorant-garamond-400',kind:'serif',weight:400},{family:'HLR cormorant-garamond 500',file:'fs-cormorant-garamond-500',kind:'serif',weight:500},{family:'HLR cormorant-garamond 600',file:'fs-cormorant-garamond-600',kind:'serif',weight:600},{family:'HLR cormorant-garamond 700',file:'fs-cormorant-garamond-700',kind:'serif',weight:700},{family:'HLR josefin-sans 400',file:'fs-josefin-sans-400',kind:'sans',weight:400},{family:'HLR josefin-sans 500',file:'fs-josefin-sans-500',kind:'sans',weight:500},{family:'HLR josefin-sans 600',file:'fs-josefin-sans-600',kind:'sans',weight:600},{family:'HLR josefin-sans 700',file:'fs-josefin-sans-700',kind:'sans',weight:700},{family:'HLR jost 400',file:'fs-jost-400',kind:'sans',weight:400},{family:'HLR jost 500',file:'fs-jost-500',kind:'sans',weight:500},{family:'HLR jost 600',file:'fs-jost-600',kind:'sans',weight:600},{family:'HLR jost 700',file:'fs-jost-700',kind:'sans',weight:700},{family:'HLR jost 800',file:'fs-jost-800',kind:'sans',weight:800},{family:'HLR kumbh-sans 400',file:'fs-kumbh-sans-400',kind:'sans',weight:400},{family:'HLR kumbh-sans 500',file:'fs-kumbh-sans-500',kind:'sans',weight:500},{family:'HLR kumbh-sans 600',file:'fs-kumbh-sans-600',kind:'sans',weight:600},{family:'HLR kumbh-sans 700',file:'fs-kumbh-sans-700',kind:'sans',weight:700},{family:'HLR kumbh-sans 800',file:'fs-kumbh-sans-800',kind:'sans',weight:800},{family:'HLR lato 400',file:'fs-lato-400',kind:'sans',weight:400},{family:'HLR lato 700',file:'fs-lato-700',kind:'sans',weight:700},{family:'HLR league-spartan 400',file:'fs-league-spartan-400',kind:'sans',weight:400},{family:'HLR league-spartan 500',file:'fs-league-spartan-500',kind:'sans',weight:500},{family:'HLR league-spartan 600',file:'fs-league-spartan-600',kind:'sans',weight:600},{family:'HLR league-spartan 700',file:'fs-league-spartan-700',kind:'sans',weight:700},{family:'HLR league-spartan 800',file:'fs-league-spartan-800',kind:'sans',weight:800},{family:'HLR lora 400',file:'fs-lora-400',kind:'serif',weight:400},{family:'HLR lora 500',file:'fs-lora-500',kind:'serif',weight:500},{family:'HLR lora 600',file:'fs-lora-600',kind:'serif',weight:600},{family:'HLR lora 700',file:'fs-lora-700',kind:'serif',weight:700},{family:'HLR merriweather 400',file:'fs-merriweather-400',kind:'serif',weight:400},{family:'HLR merriweather 500',file:'fs-merriweather-500',kind:'serif',weight:500},{family:'HLR merriweather 600',file:'fs-merriweather-600',kind:'serif',weight:600},{family:'HLR merriweather 700',file:'fs-merriweather-700',kind:'serif',weight:700},{family:'HLR merriweather 800',file:'fs-merriweather-800',kind:'serif',weight:800},{family:'HLR montserrat 400',file:'fs-montserrat-400',kind:'sans',weight:400},{family:'HLR montserrat 500',file:'fs-montserrat-500',kind:'sans',weight:500},{family:'HLR montserrat 600',file:'fs-montserrat-600',kind:'sans',weight:600},{family:'HLR montserrat 700',file:'fs-montserrat-700',kind:'sans',weight:700},{family:'HLR montserrat 800',file:'fs-montserrat-800',kind:'sans',weight:800},{family:'HLR nunito 400',file:'fs-nunito-400',kind:'sans',weight:400},{family:'HLR nunito 500',file:'fs-nunito-500',kind:'sans',weight:500},{family:'HLR nunito 600',file:'fs-nunito-600',kind:'sans',weight:600},{family:'HLR nunito 700',file:'fs-nunito-700',kind:'sans',weight:700},{family:'HLR nunito 800',file:'fs-nunito-800',kind:'sans',weight:800},{family:'HLR open-sans 400',file:'fs-open-sans-400',kind:'sans',weight:400},{family:'HLR open-sans 500',file:'fs-open-sans-500',kind:'sans',weight:500},{family:'HLR open-sans 600',file:'fs-open-sans-600',kind:'sans',weight:600},{family:'HLR open-sans 700',file:'fs-open-sans-700',kind:'sans',weight:700},{family:'HLR open-sans 800',file:'fs-open-sans-800',kind:'sans',weight:800},{family:'HLR oswald 400',file:'fs-oswald-400',kind:'sans',weight:400},{family:'HLR oswald 500',file:'fs-oswald-500',kind:'sans',weight:500},{family:'HLR oswald 600',file:'fs-oswald-600',kind:'sans',weight:600},{family:'HLR oswald 700',file:'fs-oswald-700',kind:'sans',weight:700},{family:'HLR outfit 400',file:'fs-outfit-400',kind:'sans',weight:400},{family:'HLR outfit 500',file:'fs-outfit-500',kind:'sans',weight:500},{family:'HLR outfit 600',file:'fs-outfit-600',kind:'sans',weight:600},{family:'HLR outfit 700',file:'fs-outfit-700',kind:'sans',weight:700},{family:'HLR outfit 800',file:'fs-outfit-800',kind:'sans',weight:800},{family:'HLR playfair-display 400',file:'fs-playfair-display-400',kind:'serif',weight:400},{family:'HLR playfair-display 500',file:'fs-playfair-display-500',kind:'serif',weight:500},{family:'HLR playfair-display 600',file:'fs-playfair-display-600',kind:'serif',weight:600},{family:'HLR playfair-display 700',file:'fs-playfair-display-700',kind:'serif',weight:700},{family:'HLR playfair-display 800',file:'fs-playfair-display-800',kind:'serif',weight:800},{family:'HLR poppins 400',file:'fs-poppins-400',kind:'sans',weight:400},{family:'HLR poppins 500',file:'fs-poppins-500',kind:'sans',weight:500},{family:'HLR poppins 600',file:'fs-poppins-600',kind:'sans',weight:600},{family:'HLR poppins 700',file:'fs-poppins-700',kind:'sans',weight:700},{family:'HLR poppins 800',file:'fs-poppins-800',kind:'sans',weight:800},{family:'HLR quicksand 400',file:'fs-quicksand-400',kind:'sans',weight:400},{family:'HLR quicksand 500',file:'fs-quicksand-500',kind:'sans',weight:500},{family:'HLR quicksand 600',file:'fs-quicksand-600',kind:'sans',weight:600},{family:'HLR quicksand 700',file:'fs-quicksand-700',kind:'sans',weight:700},{family:'HLR raleway 400',file:'fs-raleway-400',kind:'sans',weight:400},{family:'HLR raleway 500',file:'fs-raleway-500',kind:'sans',weight:500},{family:'HLR raleway 600',file:'fs-raleway-600',kind:'sans',weight:600},{family:'HLR raleway 700',file:'fs-raleway-700',kind:'sans',weight:700},{family:'HLR raleway 800',file:'fs-raleway-800',kind:'sans',weight:800},{family:'HLR roboto 400',file:'fs-roboto-400',kind:'sans',weight:400},{family:'HLR roboto 500',file:'fs-roboto-500',kind:'sans',weight:500},{family:'HLR roboto 600',file:'fs-roboto-600',kind:'sans',weight:600},{family:'HLR roboto 700',file:'fs-roboto-700',kind:'sans',weight:700},{family:'HLR roboto 800',file:'fs-roboto-800',kind:'sans',weight:800}];FONTS.push(...EXTRA_FONTS);
const MIN_CONF=.85,MIN_IOU=.78;
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
// yalnız küçük parçalar (nokta, Türkçe işaret) sayılır: harf gövdelerinin birbirine değmesi sayımı bozmasın
function compCount(mk,W,H,minN,maxH){const {comps}=PP._internal.components(mk,W,H);return comps.filter(c=>c.n>=minN&&(c.box[3]-c.box[1])<maxH).length;}
function iou(a,b,W,H){const da=dil(a,W,H),db=dil(b,W,H);let na=0,nb=0,ta=0,tb=0;for(let k=0;k<a.length;k++){if(a[k]){na++;if(db[k])ta++;}if(b[k]){nb++;if(da[k])tb++;}}const p=nb?tb/nb:0,r=na?ta/na:0;return p+r?2*p*r/(p+r):0;}
// ana fonksiyon
async function redraw({img,mask,out,palette,surface,opaqueGround,recognize,createCanvas,fonts=FONTS}){
 if(!recognize||!createCanvas||!out)return {replaced:0,lines:[]};
 const {w,h}=mask,m=mask.m;let maxLineH=0;const {lab,comps:allComps}=PP._internal.components(m,w,h),lines=PP.glyphLines(m,w,h).filter(l=>l.count>=2&&l.height>=10),report=[];for(const l of lines)maxLineH=Math.max(maxLineH,l.height);
 const [bx0,by0,bx1,by1]=out.box,k=out.w/(bx1-bx0);
 const oc=createCanvas(out.w,out.h),og=oc.getContext('2d'),id=og.createImageData(out.w,out.h);id.data.set(out.data);og.putImageData(id,0,0);let replaced=0;
 const used=[],done=new Set();let domW=null;const run=async(lineList,fonts,needMin,dry)=>{
 for(const line of lineList){
  const r=recTensor(img,line.box);let rec;try{rec=await recognize(r.tensor,r.width);}catch{continue;}if(!rec)continue;
  const chars=ctcDecode(rec.probs,rec.T,rec.C,rec.keys);if(chars.length<2)continue;const conf=chars.reduce((a,c)=>a+c.p,0)/chars.length;
  if(chars.some(c=>/[^ -ɏ]/.test(c.ch.normalize('NFKC')))){report.push({skip:'non-latin'});continue;}
  // Aday metinler: Türkçe işaretli (sütun kanıtıyla) ve işaretsiz. Hangisi fotoğraftaki mürekkeple daha iyi örtüşürse o seçilir.
  const plain=t=>t.normalize('NFKC').replace(/[ŞşÇçĞğÖöÜü]/g,c=>({Ş:'S',ş:'s',Ç:'C',ç:'c',Ğ:'G',ğ:'g',Ö:'O',ö:'o',Ü:'U',ü:'u'}[c])).replace(/İ/g,'I');
  // Kelime boşlukları: model bazen boşluğu yutar. Satırdaki sütun boşluklarından kelimeler bulunur, karakterler konumlarına göre ayrılır.
  const cropX0=r.crop[0],cropW=r.crop[2]-r.crop[0],[lx0,ly0,lx1,ly1]=line.box,lh=ly1-ly0;
  // toz: satır bandının dışında (üstte/altta) duran çok küçük parçalar. Nokta, iki nokta, virgül bant içindedir, korunur.
  // İki satıra yayılan (birbirine değen) parçalar: yalnız bu satırın bandındaki kısmı kullanılır
  const bandY0=Math.max(0,Math.floor(ly0-lh*.08)),bandY1=Math.min(h,Math.ceil(ly1+lh*.08)),span=new Map();
  const allC=allComps.map(c=>{const b=c.box;if(b[3]-b[1]<=lh*1.3||b[3]<=ly0||b[1]>=ly1||b[2]<lx0||b[0]>lx1)return c;let X0=1e9,Y0=1e9,X1=-1,Y1=-1,n=0;
   for(let y=Math.max(b[1],bandY0);y<Math.min(b[3],bandY1);y++)for(let x=b[0];x<b[2];x++)if(lab[y*w+x]===c.id){n++;if(x<X0)X0=x;if(x>X1)X1=x;if(y<Y0)Y0=y;if(y>Y1)Y1=y;}
   if(!n)return c;span.set(c.id,true);return {...c,n,box:[X0,Y0,X1+1,Y1+1]};});
  const dustMax=(lh*.045)**2,comps=allC.filter(c=>{if(c.n>dustMax)return true;const cy=(c.box[1]+c.box[3])/2;return cy>=ly0+lh*.1&&cy<=ly1+lh*.02;});
  // Harf kümeleri: satırdaki parçalar x'e göre sıralanır, üst üste binenler (i noktası, iki nokta, Ö noktaları) tek kümede birleşir.
  // Küme sayısı = karakter sayısı ise her karakter kendi kümesine eşlenir; kelime boşlukları kümeler arası boşluklardan kesin bulunur.
  const clusters0=(()=>{const cs=comps.filter(c=>{const b=c.box,bh=b[3]-b[1],ov=Math.min(b[3],ly1)-Math.max(b[1],ly0);if(b[0]<lx0-2||b[2]>lx1+2||c.n<3)return false;
    // satırın kendi harfi (bandla çoğunlukla örtüşen) ya da hemen üstündeki/altındaki küçük işaret; komşu satırın harfleri girmez
    if(ov>=bh*.5)return true;if(!(bh<lh*.45&&b[3]>=ly0-lh*.6&&b[1]<=ly1+lh*.5))return false;
    // alttaki leke, alt satırın üst işareti (Ü noktası, Ğ şapkası) ise bu satıra katılmaz; üstteki leke üst satırın alt çengeliyse aynı şekilde
    if(b[1]>=ly1-lh*.1&&lines.some(L2=>L2!==line&&L2.box[1]>ly1-lh*.1&&b[3]<=L2.box[1]+(L2.box[3]-L2.box[1])*.3&&b[1]>=L2.box[1]-(L2.box[3]-L2.box[1])*.75))return false;
    return true;}).map(c=>({x0:c.box[0],x1:c.box[2],y0:c.box[1],y1:c.box[3]})).sort((a,b)=>a.x0-b.x0),out=[];
   for(const c of cs){const last=out[out.length-1];if(last){const ov=Math.min(last.x1,c.x1)-Math.max(last.x0,c.x0);const small=q=>q.y1-q.y0<lh*.45&&q.x1-q.x0<lh*.3;const thin=q=>q.x1-q.x0<lh*.2;if(ov>=Math.min(c.x1-c.x0,last.x1-last.x0)*.5||(ov>0&&(small(c)||small(last)))||(ov>-Math.max(2,lh*.02)&&(thin(c)||thin(last))&&c.y1-c.y0>lh*.4&&!last.sm&&!small(c))){last.sm=last.sm&&small(c);last.x0=Math.min(last.x0,c.x0);last.x1=Math.max(last.x1,c.x1);last.y0=Math.min(last.y0,c.y0);last.y1=Math.max(last.y1,c.y1);continue;}}out.push({...c,sm:(c.y1-c.y0<lh*.45&&c.x1-c.x0<lh*.3)});}
   // satırın içinde dikey olarak hiç gövdesi olmayan (yalnız üstte/altta duran) kümeler işarettir: komşu kümeye katılır
   return out.filter(c=>!(c.y1<ly0+lh*.25||c.y0>ly1-lh*.25)&&!((c.x1-c.x0)<lh*.12&&(c.y1-c.y0)<lh*.3&&(c.y1<ly1-lh*.35)));})(); // küçük toz kümeleri sayılmaz (nokta/virgül taban çizgisindedir, kalır)
  // Birbirine değen harfler (küçük/bulanık yazı): kümeler harf sayısından azsa, okumanın verdiği harf konumlarıyla
  // her birleşik küme, harfler arasındaki en ince mürekkep sütunundan bölünür. Her küme en az bir harf almıyorsa bölünmez.
  const clusters=(()=>{const ns=chars.filter(c=>c.ch!==' ');if(ns.length<=clusters0.length||ns.length>clusters0.length*1.4)return clusters0;
   const cx=ns.map(c=>cropX0+c.x*cropW),own=clusters0.map(()=>[]);
   for(let j=0;j<cx.length;j++){let bi=-1,bd=1e9;clusters0.forEach((c,q)=>{const d=cx[j]<c.x0?c.x0-cx[j]:cx[j]>c.x1?cx[j]-c.x1:0;if(d<bd){bd=d;bi=q;}});if(bd>lh*.5)return clusters0;own[bi].push(j);}
   if(own.some(o=>!o.length))return clusters0;if(cx[0]>clusters0[0].x1+lh*.2||cx[cx.length-1]<clusters0[clusters0.length-1].x0-lh*.2)return clusters0;
   // sıra korunmalı (harf konumları kümelerle aynı sırada)
   for(let q=1;q<own.length;q++)if(own[q][0]<own[q-1][own[q-1].length-1])return clusters0;
   const colInk=(x,y0,y1)=>{let n=0;for(let y=Math.max(0,y0);y<Math.min(h,y1);y++)n+=m[y*w+x];return n;},out=[];
   clusters0.forEach((c,q)=>{const o=own[q];if(o.length===1){out.push(c);return;}
    const W=c.x1-c.x0,step=W/o.length,cuts=[];let prev=c.x0;
    for(let k=1;k<o.length;k++){const exp=Math.max(prev+step*.5,Math.min(c.x1-step*.5,(cx[o[k-1]]+cx[o[k]])/2*.5+(c.x0+step*k)*.5)),r=Math.max(2,Math.round(step*.35));let bx=Math.round(exp),bv=1e9;
     for(let x=Math.round(exp-r);x<=Math.round(exp+r);x++){if(x<=prev+2||x>=c.x1-2)continue;const v=colInk(x,Math.round(ly0),Math.round(ly1))+Math.abs(x-exp)*.02;if(v<bv){bv=v;bx=x;}}
     cuts.push(bx);prev=bx;}
    const xs=[c.x0,...cuts,c.x1];for(let k=0;k<o.length;k++){const a0=xs[k],a1=xs[k+1];let y0=1e9,y1=-1,x0=1e9,x1=-1;
     for(let y=Math.max(0,c.y0);y<Math.min(h,c.y1);y++)for(let x=a0;x<a1;x++)if(m[y*w+x]){if(y<y0)y0=y;if(y>y1)y1=y;if(x<x0)x0=x;if(x>x1)x1=x;}
     if(y1<0)return;out.push({x0,x1:x1+1,y0,y1:y1+1,split:true});}});
   return out.length===ns.length?out:clusters0;})(),wasSplit=clusters!==clusters0;
  const cgw=[];for(let q=1;q<clusters.length;q++)cgw.push(clusters[q].x0-clusters[q-1].x1);const cgm=cgw.slice().sort((a,b)=>a-b)[cgw.length>>1]||0;
  // Kelime boşlukları: model boşluk verdiyse sayısına güvenilir ve en büyük küme aralıklarına yerleştirilir; vermediyse belirgin büyük aralıklar.
  const ocrSpaces=chars.filter(c=>c.ch===' ').length,order=cgw.map((g,q)=>[g,q]).sort((a,b)=>b[0]-a[0]);
  const spaceSet=new Set(ocrSpaces?order.slice(0,ocrSpaces).map(o=>o[1]+1):order.filter(o=>o[0]>=Math.max(cgm*1.9,lh*.12)).map(o=>o[1]+1));
  const withSpaces=cs0=>{const cs=cs0.filter(c=>c.ch!==' ');if(cs.length!==clusters.length)return null;return cs.map((c,q)=>(spaceSet.has(q)?' ':'')+c.ch).join('');};
  const gaps=[...spaceSet].sort((a,b)=>a-b).map(q=>[clusters[q-1].x1,clusters[q].x0]);
  const marks=(()=>{ // bileşen yöntemi: harfin üstünde/altında ayrı küçük leke
   const small=comps.filter(c=>{const b=c.box;return b[2]-b[0]<lh*.8&&b[3]-b[1]<lh*.45&&b[2]>lx0-lh*.2&&b[0]<lx1+lh*.2&&c.n>=3;});
   const up=small.filter(c=>c.box[3]<=ly0+lh*.2&&c.box[1]>=ly0-lh*.7),dn=small.filter(c=>c.box[1]>=ly1-lh*.2&&c.box[3]<=ly1+lh*.6),step=cropW/Math.max(2,chars.length+1);
   return chars.map(c=>{const cx=cropX0+c.x*cropW,hw=Math.max(lh*.3,step*.55),near=L=>L.some(q=>Math.abs((q.box[0]+q.box[2])/2-cx)<=hw);let ch=c.ch;
    if(TR_ABOVE[ch]&&near(up))ch=TR_ABOVE[ch];else if(TR_BELOW[ch]&&near(dn))ch=TR_BELOW[ch];return {...c,ch};});})();
  const dotless=cs0=>{const cs=cs0.filter(c=>c.ch!==' ');if(cs.length!==clusters.length)return cs0;return cs.map((c,q)=>{if(c.ch!=='i'||!(q>0&&/[a-zçğıöşü]/.test(cs[q-1].ch)))return c;const cl=clusters[q];const n=allComps.filter(o=>o.box[0]>=cl.x0-2&&o.box[2]<=cl.x1+2&&o.box[3]<=cl.y1+1&&o.box[1]>=cl.y0-lh*.3&&o.n>=2).length;return n<=1?{...c,ch:'ı'}:c;});};
  const ws=cs=>{const d=dotless(cs);return withSpaces(d)??d.map(c=>c.ch).join('');};
  if(clusters.length!==chars.filter(c=>c.ch!==' ').length&&!ocrSpaces){const big=order.filter(o=>o[0]>=Math.max(cgm*2.5,lh*.15));if(big.length===1){/* tek belirgin boşluk: yaklaşık konumdan kelimeyi böl */const xg=(clusters[big[0][1]].x1+clusters[big[0][1]+1].x0)/2,frac=(xg-lx0)/(lx1-lx0);chars.splice(Math.max(1,Math.min(chars.length-1,Math.round(frac*chars.length))),0,{ch:' ',p:1,x:0});}}
  const trText=normalize(ws(turkish(chars,line,comps,cropX0,cropW,m,w,h))),trText2=normalize(ws(marks)),text=normalize(plain(ws(chars))),cands=[...new Set([trText,trText2,text])];
  // simge (Instagram, telif vb.) yazı sanılmasın: e-posta dışında @ © ® içeren satır yeniden çizilmez
  if(/[@©®]/.test(text)&&!/\S@\S+\.\S/.test(text)){report.push({text,skip:'symbol'});continue;}
  if(conf<MIN_CONF||text.replace(/\s/g,'').length<2){report.push({text,conf:+conf.toFixed(2),skip:'low-confidence'});continue;}
  // satırın mürekkebi: kutu + Türkçe işaret bölgesi
  const [x0,y0,x1,y1]=line.box,hh=y1-y0,ext=[Math.max(0,x0-2),Math.max(0,Math.round(y0-hh*.45)),Math.min(w,x1+2),Math.min(h,Math.round(y1+hh*.35))];
  const ids=new Set(),spanIds=new Set(span.keys());for(const c of comps){if(spanIds.has(c.id))continue;const b=c.box;if(b[0]>=ext[0]-1&&b[2]<=ext[2]+1&&b[1]>=ext[1]-1&&b[3]<=ext[3]+1)ids.add(c.id);}
  const LM=lineMask(m,w,ext,lab,ids);if(spanIds.size)for(let y=Math.max(ext[1],bandY0);y<Math.min(ext[3],bandY1);y++)for(let x=ext[0];x<ext[2];x++){const i=y*w+x;if(m[i]&&spanIds.has(lab[i]))LM.m[(y-ext[1])*LM.w+(x-ext[0])]=1;}let ix0=LM.w,iy0=LM.h,ix1=0,iy1=0;for(let y=0;y<LM.h;y++)for(let x=0;x<LM.w;x++)if(LM.m[y*LM.w+x]){if(x<ix0)ix0=x;if(x>ix1)ix1=x;if(y<iy0)iy0=y;if(y>iy1)iy1=y;}if(ix1<=ix0)continue;
  const IW=ix1-ix0+1,IH=iy1-iy0+1;let best=null,bestGlyph=null;
  const minN=Math.max(3,Math.round((lh*.07)**2)),targetCC=compCount(LM.m,LM.w,LM.h,minN,lh*.4),ccPen=tm=>Math.abs(compCount(tm,LM.w,LM.h,minN,lh*.4)-targetCC);
  const inkN=LM.m.reduce((a,v)=>a+v,0),inkPen=tm=>{let a=0;for(const v of tm)a+=v;return Math.max(0,Math.abs(Math.log(Math.max(1,a)/Math.max(1,inkN)))-.08)*.5;}; // kalınlık: çizilen mürekkep miktarı fotoğraftakine yakın olmalı
  const nonSpace=chars.filter(c=>c.ch!==' ').length,lineModeOk=clusters.length<=nonSpace+1&&clusters.length>=nonSpace-2;
  // Harf harf yerleştirme (küme sayısı = harf sayısı): her harf fotoğraftaki kendi yerine, ortak taban çizgisi ve yükseklikle çizilir.
  // Harf ve kelime aralıkları fotoğraftakiyle birebir olur; yazı tipi şekli temizdir.
  // Harf eşleşmesi kesinse Türkçe işaretler her harfin fotoğraftaki kendi şeklinden belirlenir (model değil):
  //  büyük harfte ortak üst çizginin belirgin üstüne çıkan mürekkep → Ö Ü İ Ğ; küçük harfte nokta/işaret; S/C'de taban altına inen çengel → Ş Ç
  const geomText=(()=>{if(wasSplit&&/[SCGIOUscgouiı]/.test(text))return null; // bölünmüş harflerde işaret konumu güvenilmez; işaretsiz metinde sorun yok
  let base0=chars.filter(c=>c.ch!==' ').map(c=>plain(c.ch).replace('ı','i'));if(base0.length!==clusters.length)return null;
   {const up=base0.filter(c=>/[A-Z]/.test(c)).length,lo=base0.filter(c=>/[a-z]/.test(c)).length;if(up>=2&&up>lo)base0=base0.map(c=>c==='i'?'I':c);} // büyük harfli satırda i → I
   const med=a=>{const q=a.slice().sort((x,y)=>x-y);return q.length?q[q.length>>1]:null;};
   const capRef=med(clusters.filter((c,q)=>/[A-HJ-NP-RT-Z0-9]/.test(base0[q])).map(c=>c.y0))??med(clusters.map(c=>c.y0)),xRef=med(clusters.filter((c,q)=>/[acemnrsvwxz]/.test(base0[q])).map(c=>c.y0)),baseRef=med(clusters.map(c=>c.y1));
   const inkRect=(x0,y0,x1,y1)=>{let n=0;for(let y=Math.max(0,Math.round(y0));y<Math.min(h,Math.round(y1));y++)for(let x=Math.max(0,Math.round(x0));x<Math.min(w,Math.round(x1));x++)n+=m[y*w+x];return n;};
   // işaret yeterince mürekkep içermeli (toz değil): üstte ≥ (0,07·boy)², altta çengel ≥ (0,08·boy)²
   const up=(c,ref)=>ref!=null&&c.y0<ref-lh*.12&&inkRect(c.x0,c.y0,c.x1,ref-lh*.06)>=(lh*.07)**2,down=c=>c.y1>baseRef+lh*.1&&inkRect(c.x0+(c.x1-c.x0)*.2,baseRef+lh*.04,c.x1-(c.x1-c.x0)*.2,c.y1+1)>=(lh*.08)**2;
   // Parlama altında soluk kalmış iki nokta: harfin üstünde, sol ve sağ yarıda çevresinden belirgin koyu birer leke (ham görüntüden)
   const faintDots=(c,ref)=>{const y0=Math.max(0,Math.round(ref-lh*.4)),y1=Math.max(0,Math.round(ref-lh*.06)),cw=c.x1-c.x0;if(y1-y0<4||cw<6)return false;
    const L=(x,y)=>{const j=(y*img.w+x)*4;return .299*img.data[j]+.587*img.data[j+1]+.114*img.data[j+2];};
    const half=(xa,xb)=>{const v=[];for(let y=y0;y<y1;y++)for(let x=Math.max(0,Math.round(xa));x<Math.min(w,Math.round(xb));x++)v.push(L(x,y));if(v.length<16)return false;const so=v.slice().sort((a,b)=>a-b),med=so[so.length>>1];
     // koyu leke: en koyu %3'lük kısım ortancadan ≥18 düzey koyu ve en az (0,03·boy)² piksel
     const thr=med-18;let n=0;for(const q of v)if(q<thr)n++;return n>=Math.max(4,(lh*.03)**2)&&n<=v.length*.25;};
    return half(c.x0,c.x0+cw*.5)&&half(c.x0+cw*.5,c.x1);};
   const res=[];const harmonyFront=q=>{for(let j=q-1;j>=0;j--){if(spaceSet.has(j+1)&&j+1<=q)break;const v=res[j];if(/[ÜÖ]/.test(v))return true;if(/[AEIOUİ]/.test(v))return false;}return false;};
   return base0.map((ch,q)=>{const r0=(()=>{const c=clusters[q];
    if(ch==='i'&&base0.filter(x=>/[A-Za-z]/.test(x)).length&&((q>0&&/[A-Z]/.test(base0[q-1]))&&(q+1<base0.length&&/[A-Z]/.test(base0[q+1]))))ch='I';
    if(/[OUGI]/.test(ch)){if(up(c,capRef))return {O:'Ö',U:'Ü',G:'Ğ',I:'İ'}[ch];if(ch==='U'&&capRef!=null&&harmonyFront(q)&&faintDots(c,capRef))return 'Ü';return ch;}
    if(/[SC]/.test(ch))return down(c)?{S:'Ş',C:'Ç'}[ch]:ch;
    if(/[ougs c]/.test(ch)&&ch!==' '){if(/[ou]/.test(ch))return up(c,xRef)?{o:'ö',u:'ü'}[ch]:ch;if(ch==='g')return up(c,xRef)?'ğ':ch;if(/[sc]/.test(ch))return down(c)?{s:'ş',c:'ç'}[ch]:ch;}
    if(ch==='i'){const dot=allComps.some(o=>o.box[0]>=c.x0-2&&o.box[2]<=c.x1+2&&o.box[3]<c.y1-lh*.15&&o.box[1]>=c.y0-lh*.4);return (dot||c.y0<(xRef??c.y0)-lh*.08)?'i':'ı';}
    return ch;})();res.push(r0);return r0;});})();
  // Türkçe işaret belirsizliği: harf eşleşmesi kesin değilse (ya da yazı işaretleri ayırt edemeyecek kadar küçükse),
  // işaret alabilecek harf içeren satır yeniden çizilmez — yanlış yazı, kirli yazıdan kötüdür.
  // Harfler birbirine değdiğinde Türkçe işaretler: harflerin yeri yazı tipi ölçülerinden hesaplanır (kelime kelime, fotoğraftaki
  // kelime sınırlarına oturtularak); her harfin tam üstünde ayrı küçük leke (nokta/şapka) ya da altında çengel aranır.
  // Kanıt belirsizse (eşiğe çok yakınsa) satır için sonuç verilmez → satır yeniden çizilmez.
  const LAY=(()=>{if(geomText||lh<22||lh>maxLineH*.6||!/[SCGIOUscgouiı]/.test(text))return null;const t=text.replace(/ı/g,'i');const words=t.split(' ').filter(Boolean);if(!words.length)return null;
   const big=200,ff=fonts.find(f=>f.kind==='sans')||fonts[0],mc=createCanvas(10,10).getContext('2d');mc.font=`${big}px "${ff.family}"`;
   const C=clusters0;if(C.length<2)return null;
   // fotoğraftaki kelime aralıkları: model boşluk sayısı kadar en büyük küme aralığı
   const g0=[];for(let q=1;q<C.length;q++)g0.push([C[q].x0-C[q-1].x1,q]);g0.sort((a,b)=>b[0]-a[0]);const cutsQ=g0.slice(0,words.length-1).map(v=>v[1]).sort((a,b)=>a-b);
   // kelime sınırları: modelin boşluk konumları (yakında küme aralığı varsa onun ortası); sayı tutmazsa en büyük aralıklar
   const colInkB=x=>{let n=0;for(let y=Math.max(0,Math.round(ly0));y<Math.min(h,Math.round(ly1));y++)n+=m[y*w+x];return n;};
   const sp=chars.filter(c=>c.ch===' '&&c.x>0).map(c=>cropX0+c.x*cropW);let bnds;
   
   if(sp.length===words.length-1){bnds=sp.map(sx=>{let best=null,bg=-1;for(let q=1;q<C.length;q++){const mid=(C[q].x0+C[q-1].x1)/2,d=Math.abs(mid-sx),gw=C[q].x0-C[q-1].x1;if(d<lh*.6&&gw>=1&&gw-d*.05>bg){bg=gw-d*.05;best=mid;}}if(best!=null)return best;let bx=sx,bv=1e9;for(let x=Math.round(sx-lh*.3);x<=Math.round(sx+lh*.3);x++){const v=colInkB(x);if(v<bv){bv=v;bx=x;}}return bx;});}
   else bnds=cutsQ.map(q=>(C[q].x0+C[q-1].x1)/2);
   bnds=[C[0].x0-1,...bnds,C[C.length-1].x1+1];for(let k=1;k<bnds.length;k++)if(bnds[k]<=bnds[k-1])return null;
   const segX=[];for(let k=0;k+1<bnds.length;k++){let a=-1,b=-1;for(let x=Math.max(0,Math.round(bnds[k]));x<Math.min(w,Math.round(bnds[k+1]));x++)if(colInkB(x)){if(a<0)a=x;b=x+1;}if(a<0)return null;segX.push([a,b]);}
   if(segX.length!==words.length)return null;
   {const gs=[];for(let q=1;q<C.length;q++)gs.push(C[q].x0-C[q-1].x1);const gm=gs.slice().sort((a,b)=>a-b)[gs.length>>1]||0,bigN=gs.filter(g=>g>=Math.max(gm*2.2,lh*.15)).length;if(bigN>words.length-1)return null;} // fotoğrafta modelin boşluklarından fazla belirgin boşluk varsa metin eksik
   // her harfin x aralığı
   // harf yerlerini, satırın sütun mürekkep dağılımına en iyi oturan yazı tipiyle ölç
   const photoCol=(a,b)=>{const v=[];for(let x=a;x<b;x++)v.push(colInkB(x));return v;},corr=(p,q)=>{const n=Math.min(p.length,q.length);let mp=0,mq=0;for(let i=0;i<n;i++){mp+=p[i];mq+=q[i];}mp/=n;mq/=n;let sp=0,sq=0,sx=0;for(let i=0;i<n;i++){const a=p[i]-mp,b=q[i]-mq;sx+=a*b;sp+=a*a;sq+=b*b;}return sp&&sq?sx/Math.sqrt(sp*sq):0;};
   const layoutWith=f=>{mc.font=`${big}px "${f.family}"`;const P=[];let score=0,tot=0;words.forEach((wd,k)=>{const xa=segX[k][0],xb=segX[k][1],mw=mc.measureText(wd),L=mw.actualBoundingBoxLeft,Wn=L+mw.actualBoundingBoxRight,sc=(xb-xa)/Math.max(1,Wn);
     for(let j=0;j<wd.length;j++){const a0=mc.measureText(wd.slice(0,j)).width,a1=mc.measureText(wd.slice(0,j+1)).width;P.push({ch:wd[j],w:k,x0:xa+(L+a0)*sc,x1:xa+(L+a1)*sc});}
     if(xb-xa>=4){const H=60,tm=maskOf(createCanvas,xb-xa,H,g=>{g.save();g.font=`${big}px "${f.family}"`;g.textBaseline='alphabetic';g.translate(L*sc,H*.8);g.scale(sc,H*.6/big*1.4);g.fillText(wd,0,0);g.restore();});
      const rc=[];for(let x=0;x<xb-xa;x++){let n=0;for(let y=0;y<H;y++)n+=tm[y*(xb-xa)+x];rc.push(n);}score+=corr(rc,photoCol(xa,xb))*(xb-xa);tot+=xb-xa;}});return {P,score:tot?score/tot:0};};
   let LB=null;for(const f of fonts.filter(f=>f.kind==='sans')){const r=layoutWith(f);if(!LB||r.score>LB.score)LB=r;}if(!LB)return null;const pos=LB.P;
   const med=a=>{const q=a.slice().sort((x,y)=>x-y);return q.length?q[q.length>>1]:null;};
   const clsOf=c=>{const cx=(c.x0+c.x1)/2,p=pos.filter(o=>o.x1>c.x0&&o.x0<c.x1);return p.map(o=>o.ch).join('');};
   const capRef=med(C.filter(c=>{const s=clsOf(c);return s&&/^[A-HJ-NP-RT-Z0-9bdfhklt]+$/.test(s);}).map(c=>c.y0)),xRef=med(C.filter(c=>{const s=clsOf(c);return s&&/^[aemnrvwxz]+$/.test(s);}).map(c=>c.y0)),baseRef=med(C.filter(c=>{const s=clsOf(c);return s&&/^[A-Za-bd-fh-ik-or-xz0-9]+$/.test(s);}).map(c=>c.y1));
   if(baseRef==null||(capRef==null&&xRef==null))return null;
   const smalls=allComps.filter(c=>{const b=c.box;return b[3]-b[1]<lh*.32&&b[2]-b[0]<lh*.5&&c.n>=Math.max(3,(lh*.04)**2);});
   const inkRect=(x0,y0,x1,y1)=>{let n=0;for(let y=Math.max(0,Math.round(y0));y<Math.min(h,Math.round(y1));y++)for(let x=Math.max(0,Math.round(x0));x<Math.min(w,Math.round(x1));x++)n+=m[y*w+x];return n;};
   let unsure=false;
   const upMark=(o,ref)=>{if(ref==null)return null;const a2=Math.round(o.x0+(o.x1-o.x0)*.15),b2=Math.round(o.x1-(o.x1-o.x0)*.15);if(b2<=a2)return null;
    const row=y=>{let n=0;for(let x=a2;x<b2;x++)n+=m[y*w+x];return n;};
    // harfin kendi sütununda gövdenin tepesi; üstünde boş satır(lar)dan sonra gelen mürekkep işarettir
    let y=Math.round(baseRef-lh*.15),top=-1;const stop=Math.round(ref-lh*.55);for(;y>stop;y--){if(row(y)===0){top=y+1;break;}}
    if(top>0){let n=0,yy=top-1;while(yy>top-lh*.08&&row(yy)===0)yy--;for(let k=yy;k>Math.max(0,top-lh*.5);k--)n+=row(k);const thr=(lh*.04)**2;
     if(n>=thr)return true;let half=n>=thr*.15;
     // ayrı leke yoksa: gövdenin tepesi beklenen yüksekliğin (x yüksekliği / büyük harf çizgisi) belirgin üstündeyse işaret gövdeye yapışıktır
     const rise=ref-top;if(rise>=lh*.12)return true;if(rise>lh*.05||half)return null;return false;}
    // gövde ile işaret birleşik: gövde büyük harf/x yüksekliğinin belirgin üstüne çıkıyorsa işaret var
    const n=inkRect(a2,ref-lh*.42,b2,ref-lh*.09),thr=(lh*.05)**2;if(n>=thr*.5&&n<thr*1.5)return null;return n>=thr;};
   const downMark=o=>{const a=o.x0+(o.x1-o.x0)*.25,b=o.x1-(o.x1-o.x0)*.25,n=inkRect(a,baseRef+lh*.05,b,baseRef+lh*.32),thr=(lh*.05)**2;if(n>=thr*.15&&n<thr*1.5)unsure=true;return n>=thr;};
   const upperLine=words.join('').replace(/[^A-Za-z]/g,'');const mostlyUpper=upperLine&&upperLine.replace(/[^A-Z]/g,'').length>upperLine.length*.6;
   // belirsiz işaret: kelimedeki önceki ünlüye göre ünlü uyumu (ince ünlüden sonra i/ü, kalından sonra ı/u); önceki ünlü yoksa karar verilmez
   const outC=[];const prevVowel=j=>{for(let k=j-1;k>=0&&pos[k].w===pos[j].w;k--){const v=outC[k];if(/[aeıioöuüAEIİOÖUÜ]/.test(v))return v;}return null;};
   const front=v=>/[eiöüEİÖÜ]/.test(v);
   pos.forEach((o,j)=>{let ch=o.ch;const prev=pos[j-1]&&pos[j-1].w===o.w?pos[j-1].ch:'',next=pos[j+1]&&pos[j+1].w===o.w?pos[j+1].ch:'';
    if(ch==='i'&&(mostlyUpper||(/[A-Z]/.test(prev)&&/[A-Z]/.test(next))))ch='I';
    const dec=(res,yes,no,harm)=>{if(res===true)return yes;if(res===false)return no;const pv=prevVowel(j);if(harm&&pv){return front(pv)?yes:no;}unsure=true;return no;};
    let r=ch;
    if(/[OUG]/.test(ch))r=dec(upMark(o,capRef),{O:'Ö',U:'Ü',G:'Ğ'}[ch],ch,ch==='U');
    else if(ch==='I')r=dec(upMark(o,capRef),'İ','I',true);
    else if(ch==='u')r=dec(upMark(o,xRef),'ü','u',true);
    else if(ch==='o')r=dec(upMark(o,xRef),'ö','o',false);
    else if(ch==='g')r=dec(upMark(o,xRef),'ğ','g',false);
    else if(ch==='i')r=dec(upMark(o,xRef),'i','ı',true);
    else if(/[SCsc]/.test(ch))r=downMark(o)?{S:'Ş',C:'Ç',s:'ş',c:'ç'}[ch]:ch;
    outC.push(r);});
   if(unsure)return null;let r='',k=0;const outW=[];words.forEach((wd,i)=>{if(i)r+=' ';const ww=outC.slice(k,k+wd.length).join('');outW.push(ww);r+=ww;k+=wd.length;});return {text:r,words:outW,segX,capRef,xRef,baseRef};})(),layoutText=LAY&&LAY.text;
  const eligible=/[SCGIOUscgoui]/.test(plain(text)),markSafe=geomText&&lh>=28;
  const glyphCands=markSafe?[geomText.join('')]:(!eligible&&geomText?[geomText.join('')]:[]);
  if(!markSafe&&eligible){cands.length=0;if(layoutText)cands.push(layoutText);}
  else if(markSafe){const g=geomText.join('');cands.length=0;const sp=[...spaceSet].sort((a,b)=>a-b);let t='',k=0;[...g].forEach((ch,q)=>{if(sp.includes(q))t+=' ';t+=ch;});cands.push(t);}
  for(const cand of glyphCands){const glyphs=[...cand];if(glyphs.length!==clusters.length||glyphs.length<2)continue;
   const big=200,base=(()=>{const b=clusters.map(c=>c.y1).sort((a,b)=>a-b);return b[b.length>>1];})(),capH=(()=>{const hs=clusters.filter((c,q)=>/[A-ZÇĞİÖŞÜ0-9bdfhklt]/.test(glyphs[q])).map(c=>c.y1-c.y0);hs.sort((a,b)=>a-b);return hs.length?hs[hs.length>>1]:lh;})();
   for(const f of fonts){const mc=createCanvas(10,10).getContext('2d');mc.font=`${big}px "${f.family}"`;const refH=mc.measureText('H').actualBoundingBoxAscent;if(!(refH>0))continue;const sc=capH/refH;
    const items=glyphs.map((ch,q)=>{const mm2=mc.measureText(ch),cx=(clusters[q].x0+clusters[q].x1)/2,cw2=(mm2.actualBoundingBoxLeft+mm2.actualBoundingBoxRight)*sc;return {ch,cx,cw2,left:mm2.actualBoundingBoxLeft,right:mm2.actualBoundingBoxRight,box:clusters[q]};});
    // genişlik uyumu: harf genişlikleri fotoğraftakine yakın olmalı (yazı tipi seçimini yönlendirir)
    const wr=items.map(it=>Math.log(Math.max(1,it.cw2)/Math.max(1,it.box.x1-it.box.x0)));const wmed=wr.slice().sort((a,b)=>a-b)[wr.length>>1];if(Math.abs(wmed)>.55)continue;const hx=Math.exp(-Math.max(-.4,Math.min(.4,wmed)));
    // Kelime kelime: harf aralığı yazı tipinin kendi aralığı (çift aralığı dahil); kelimenin başı ve sonu fotoğraftakiyle aynı.
    // Fotoğrafta harfler aralıklı dizildiyse (ör. C O F F E E) fark tüm harflere eşit dağıtılır.
    const words=[];{let cur=[];const splitAt=q=>spaceSet.has(q)||cgw[q-1]>=Math.max(cgm*1.8,lh*.1);glyphs.forEach((ch,q)=>{if(q&&splitAt(q)){words.push(cur);cur=[];}cur.push(q);});words.push(cur);}
    const adv=t=>mc.measureText(t).width,place=[],wordSpans=[];
    for(const W of words){const str=W.map(q=>glyphs[q]).join(''),mw=mc.measureText(str),natL=mw.actualBoundingBoxLeft,natW=natL+mw.actualBoundingBoxRight;
     const x0=clusters[W[0]].x0,x1=clusters[W[W.length-1]].x1,span=x1-x0;let wx=hx,tr=0;
     if(W.length>1){tr=(span-natW*sc*wx)/(W.length-1);if(tr<0){tr=0;wx=Math.max(hx*.8,span/Math.max(1,natW*sc));}}else{wx=hx;}
     let pen=0;const o0=W.length>1?x0+natL*sc*wx:(x0+x1)/2-(natW/2-natL)*sc*wx;
     const first=place.length;W.forEach((q,k)=>{if(k)pen+=adv(glyphs[W[k-1]]+glyphs[q])-adv(glyphs[q]);place.push({ch:glyphs[q],x:o0+pen*sc*wx+k*tr,wx});});wordSpans.push({a:first,b:place.length,x0,x1});}
    // kelime aralığı en az yazı tipinin boşluk genişliği kadar; satır fotoğraftaki merkezinde kalır
    const fitPlace=place.map(p=>({...p}));
    if(wordSpans.length>1){const minGap=adv(' ')*sc*hx*.9,starts=[wordSpans[0].x0];for(let i=1;i<wordSpans.length;i++){const P=wordSpans[i-1];starts.push(Math.max(wordSpans[i].x0,starts[i-1]+(P.x1-P.x0)+minGap));}
     const L=wordSpans[wordSpans.length-1],newEnd=starts[starts.length-1]+(L.x1-L.x0),shift=((wordSpans[0].x0+L.x1)-(starts[0]+newEnd))/2;
     wordSpans.forEach((S,i)=>{const d=starts[i]-S.x0+shift;for(let k=S.a;k<S.b;k++)place[k].x+=d;});}
    const drawP=P=>(g,ox,oy,kk)=>{g.save();g.font=`${big}px "${f.family}"`;g.textBaseline='alphabetic';g.textAlign='left';for(const it of P){g.save();g.translate(ox+(it.x-ext[0])*kk,oy+(base-ext[1])*kk);g.scale(sc*it.wx*kk,sc*kk);g.fillText(it.ch,0,0);g.restore();}g.restore();},draw=drawP(place);
    const tm=maskOf(createCanvas,LM.w,LM.h,g=>drawP(fitPlace)(g,0,0,1)),cd=ccPen(tm);const inkR=(()=>{let a=0,b=0;for(let q=0;q<tm.length;q++){a+=tm[q];b+=LM.m[q];}return Math.abs(Math.log(Math.max(1,a)/Math.max(1,b)));})(),scv=iou(tm,LM.m,LM.w,LM.h)-(domW&&f.weight!==domW?.04:0)-Math.max(0,inkR-.08)*.5-Math.max(0,Math.abs(wmed)-.15)*.25-(markSafe?Math.min(.15,cd*.03):(cd>1?1:cd*.05)),markCount=(cand.match(/[ŞşÇçĞğÖöÜüİ]/g)||[]).length,adj=scv-markCount*.012;
    if(!best||adj>(best.adj??best.s))best={s:scv,adj,f,text:cand,draw,mode:'glyph'};if(!bestGlyph||adj>bestGlyph.adj)bestGlyph={s:scv,adj,f,text:cand,draw,mode:'glyph'};}}
  // kelime bölgeleri (satır kesitinde): her kelime kendi mürekkep aralığına oturtulur → harf/kelime aralığı fotoğraftakiyle aynı
  const segs=[];{let a0=ix0;for(const [g0,g1] of gaps){const s0=g0-ext[0],s1=g1-ext[0];if(s0>a0&&s0<=ix1){segs.push([a0,s0]);a0=s1;}}segs.push([a0,ix1+1]);}
  const segBox=([a,b])=>{let t=LM.h,bt=-1,l=b,rr=a;for(let y=0;y<LM.h;y++)for(let x=a;x<b;x++)if(LM.m[y*LM.w+x]){if(y<t)t=y;if(y>bt)bt=y;if(x<l)l=x;if(x>rr)rr=x;}return bt<0?null:[l,t,rr+1,bt+1];};
  for(const cand of cands){const words=cand.split(' ').filter(Boolean);if(words.length!==segs.length||words.length<2)continue;const boxes=segs.map(segBox);if(boxes.some(b=>!b))continue;
   // satırın ortak üst/alt sınırı (büyük harf yüksekliği tutarlı kalsın)
   for(const f of fonts){const parts=[];let ok=true;for(let q=0;q<words.length;q++){const B=boxes[q],R=renderText(createCanvas,f,words[q],B[2]-B[0],B[3]-B[1]);if(!R||Math.abs(Math.log(R.sx/R.sy))>.45){ok=false;break;}parts.push({R,B});}if(!ok)continue;
    const draw=(g,ox,oy,kk)=>{for(const {R,B} of parts)R.draw(g,ox+B[0]*kk,oy+B[1]*kk,R.sx*kk,R.sy*kk);};
    const tm=maskOf(createCanvas,LM.w,LM.h,g=>draw(g,0,0,1)),pen=inkPen(tm)+parts.reduce((a,p)=>a+Math.max(0,Math.abs(Math.log(p.R.sx/p.R.sy))-.2),0)/parts.length*.3,cdw=ccPen(tm),sc=iou(tm,LM.m,LM.w,LM.h)-pen-(cdw>1?1:cdw*.05);
    const markCount=(cand.match(/[ŞşÇçĞğÖöÜüİ]/g)||[]).length,adj=sc-markCount*.012;if(!best||adj>best.adj)best={s:sc,adj,f,text:cand,draw};}}
  // kelime kelime, fotoğraftaki kelime sınırlarına ve taban/büyük harf çizgisine oturtma (harf işaretleri yukarıda kanıtlandı)
  let bestLay=null;if(LAY){for(const f of fonts){const mc=createCanvas(10,10).getContext('2d'),big=200;mc.font=`${big}px "${f.family}"`;const H0=mc.measureText('H').actualBoundingBoxAscent,x0h=mc.measureText('x').actualBoundingBoxAscent;if(!(H0>0))continue;
    const sv=LAY.capRef!=null?(LAY.baseRef-LAY.capRef)/H0:(LAY.baseRef-LAY.xRef)/x0h;if(!(sv>0))continue;let pen=0;const parts=[];
    LAY.words.forEach((wd,k)=>{const [xa,xb]=LAY.segX[k],mw=mc.measureText(wd),L=mw.actualBoundingBoxLeft,Wn=L+mw.actualBoundingBoxRight,hx=(xb-xa)/Math.max(1,Wn*sv);pen+=Math.max(0,Math.abs(Math.log(hx))-.15);parts.push({wd,xa,L,hx});});
    pen=pen/LAY.words.length*.4;
    // kelime aralığı en az boşluk genişliği; satır merkezde kalır (uyum puanı fotoğraftaki konumlarla hesaplanır)
    const fitParts=parts.map(P=>({...P}));{const hxs=parts.map(P=>P.hx).sort((a,b)=>a-b),minGap=mc.measureText(' ').width*sv*hxs[hxs.length>>1];
     const wW=P=>{const mw=mc.measureText(P.wd);return (mw.actualBoundingBoxLeft+mw.actualBoundingBoxRight)*sv*P.hx;};const st=[parts[0].xa];for(let k=1;k<parts.length;k++)st.push(Math.max(parts[k].xa,st[k-1]+wW(parts[k-1])+minGap));
     const L0=parts[parts.length-1],sh=((parts[0].xa+L0.xa+wW(L0))-(st[0]+st[st.length-1]+wW(L0)))/2;parts.forEach((P,k)=>{P.xa=st[k]+sh;});}
    const drawP=PS=>(g,ox,oy,kk)=>{g.save();g.font=`${big}px "${f.family}"`;g.textBaseline='alphabetic';g.textAlign='left';for(const P of PS){g.save();g.translate(ox+(P.xa+P.L*sv*P.hx-ext[0])*kk,oy+(LAY.baseRef-ext[1])*kk);g.scale(sv*P.hx*kk,sv*kk);g.fillText(P.wd,0,0);g.restore();}g.restore();},draw=drawP(parts);
    const tm=maskOf(createCanvas,LM.w,LM.h,g=>drawP(fitParts)(g,0,0,1)),sc=iou(tm,LM.m,LM.w,LM.h)-pen-inkPen(tm);if(!bestLay||sc>bestLay.s)bestLay={s:sc,adj:sc,f,text:LAY.text,draw,mode:'layout'};}
   if(bestLay&&(!best||bestLay.s>=best.s-.03))best=bestLay;}
  if(lineModeOk)for(const cand of cands)for(const f of fonts){const R=renderText(createCanvas,f,cand,IW,IH);if(!R)continue;if(Math.abs(Math.log(R.sx/R.sy))>.7)continue;
   const tm=maskOf(createCanvas,LM.w,LM.h,g=>R.draw(g,ix0,iy0,R.sx,R.sy)),cdl=ccPen(tm);const s=iou(tm,LM.m,LM.w,LM.h)-inkPen(tm)-Math.max(0,Math.abs(Math.log(R.sx/R.sy))-.25)*.3-(cdl>1?1:cdl*.05)-.04;const adj2=s-((cand.match(/[ŞşÇçĞğÖöÜüİ]/g)||[]).length)*.004;if(!best||adj2>(best.adj??best.s))best={s,adj:adj2,f,R,text:cand,draw:(g,ox,oy,kk)=>R.draw(g,ox+ix0*kk,oy+iy0*kk,R.sx*kk,R.sy*kk)};}
  // harf eşleşmesi ve Türkçe işaretler kesinse (metin doğru), yazı tipi benzerliği için eşik biraz daha esnek
  // metin kesinse harf harf yerleştirme tercih edilir (aralıklar fotoğraftakiyle birebir)
  if(geomText&&bestGlyph&&(!best||best.s<MIN_IOU||(bestGlyph.s>=(needMin??.66)&&bestGlyph.s>=best.s-.08)))best=bestGlyph; // metin kesinse harf harf (kelime içi aralık yazı tipinden); belirgin daha kötü değilse
  // kısa kelime (≤3 harf, çoğu zaman markanın kendisi): az kanıt → yalnız çok yüksek örtüşmede yeniden çizilir
  const need=best&&best.mode==='layout'?Math.max(.74,needMin??0):Math.max((markSafe&&best&&best.mode==='glyph')?(needMin??.66):MIN_IOU,nonSpace<=3?.88:0,wasSplit?.9:0); // bölünmüş harflerde eşleşme daha az kesin
  if(!best||best.s<need){report.push({text,bestFont:best&&best.f.family,conf:+conf.toFixed(2),iou:best?+best.s.toFixed(2):0,skip:'shape-mismatch'});continue;}
  if(dry){used.push({fam:best.f.family.replace(/ (\d+|Regular|SemiBold|Bold|Black)$/,''),wt:best.f.weight,w:lh*(best.s)*(best.mode==='layout'?.5:1)});continue;}
  // renk: satır mürekkebindeki baskın palet rengi
  const cnt=palette.map(()=>0);for(let y=0;y<LM.h;y++)for(let x=0;x<LM.w;x++){if(!LM.m[y*LM.w+x])continue;const j=((y+ext[1])*img.w+(x+ext[0]))*4;let bi=0,bd=1e9;palette.forEach((p,q)=>{const d=(img.data[j]-p[0])**2+(img.data[j+1]-p[1])**2+(img.data[j+2]-p[2])**2;if(d<bd){bd=d;bi=q;}});cnt[bi]++;}
  const col=palette[cnt.indexOf(Math.max(...cnt))]||[0,0,0];
  // çıktıda eski satırı sil, yeni yazıyı çiz
  const OX=(ext[0]-bx0)*k,OY=(ext[1]-by0)*k;og.save();og.beginPath();
  for(let y=0;y<LM.h;y++){let s=-1;for(let x=0;x<=LM.w;x++){const on=x<LM.w&&LM.m[y*LM.w+x];if(on&&s<0)s=x;if(!on&&s>=0){og.rect(OX+(s-2.5)*k,OY+(y-2.5)*k,(x-s+5)*k,5*k);s=-1;}}}
  // satırın hemen altında/üstünde kalan, başka satıra ait olmayan küçük eski mürekkep lekeleri de silinir
  for(const c of allComps){const b=c.box;if(c.n>(lh*.15)**2||b[0]<lx0-2||b[2]>lx1+2)continue;const cy=(b[1]+b[3])/2;if(!((cy>ly1&&cy<ly1+lh*.45)||(cy<ly0&&cy>ly0-lh*.7)))continue;
   if(ids.has(c.id))continue;if(lines.some(L2=>L2!==line&&cy>=L2.box[1]-(L2.box[3]-L2.box[1])*.7&&cy<=L2.box[3]+(L2.box[3]-L2.box[1])*.45))continue;
   og.rect((b[0]-bx0-1.5)*k,(b[1]-by0-1.5)*k,(b[2]-b[0]+3)*k,(b[3]-b[1]+3)*k);}
  og.clip();if(opaqueGround){og.fillStyle=`rgb(${surface.map(Math.round)})`;og.fillRect(0,0,out.w,out.h);}else og.clearRect(0,0,out.w,out.h);og.restore();
  og.fillStyle=`rgb(${col.map(Math.round)})`;best.draw(og,OX,OY,k);
  replaced++;done.add(line);report.push({text:best.text,mode:best.mode||'line',conf:+conf.toFixed(2),iou:+best.s.toFixed(2),font:best.f.family});}
 };
 // 1) kuru geçiş: her satırın en uygun yazı tipi ailesi; 2) logonun baskın ailesi bulunur; 3) satırlar önce o aileyle çizilir (tutarlı görünüm),
 //    olmayanlar tüm yazı tipleriyle denenir.
 const all=lines.slice(0,12),saveReport=report.length;await run(all,fonts,undefined,true);report.length=saveReport;
 const score=new Map();for(const u of used)score.set(u.fam,(score.get(u.fam)||0)+u.w);const dom=[...score].sort((a,b)=>b[1]-a[1])[0]?.[0];{const ws=new Map();for(const u of used)if(u.fam===dom)ws.set(u.wt,(ws.get(u.wt)||0)+u.w);domW=[...ws].sort((a,b)=>b[1]-a[1])[0]?.[0]??null;} // logonun baskın kalınlığı: farklı kalınlık ancak belirgin daha iyi örtüşürseused.length=0;
 if(dom)await run(all,fonts.filter(f=>f.family.replace(/ (\d+|Regular|SemiBold|Bold|Black)$/,'')===dom),.62);
 const rest=all.filter(l=>!done.has(l));const keep=report.filter(r=>r.font);report.length=0;report.push(...keep);if(rest.length)await run(rest,dom?fonts.filter(f=>f.family.replace(/ (\d+|Regular|SemiBold|Bold|Black)$/,'')===dom):fonts);
 if(replaced){const d=og.getImageData(0,0,out.w,out.h).data;out.data.set(d);}
 return {replaced,lines:report};}
const api=Object.freeze({redraw,FONTS,recTensor,ctcDecode,normalize,turkish});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TextRedraw=api;
})(typeof globalThis!=='undefined'?globalThis:this);
