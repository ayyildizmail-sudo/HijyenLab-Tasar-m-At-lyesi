/* Ürün/tabela fotoğrafından baskılı yüzeyi ve üzerindeki logoyu yerel olarak ayırır.
   Yapay zekâ veya dış servis kullanmaz; görsel cihazdan çıkmaz. Saf fonksiyonlar (tarayıcı ve Node).
   Adımlar: renk grupları → baskılı yüzey adayı (büyük, dikdörtgene yakın, içinde baskı olan düz renkli bölge)
   → perspektif düzeltme → ışık dengeleme → mürekkep ayırma → yön (90°/180°) → logo grubu → temiz düz renkli çıktı. */
(function(root){'use strict';
const MAX=900;
// ---------- renk yardımcıları ----------
function toLab(r,g,b){const f=c=>{c/=255;return c>.04045?((c+.055)/1.055)**2.4:c/12.92;};const R=f(r),G=f(g),B=f(b);let x=(R*.4124+G*.3576+B*.1805)/.95047,y=R*.2126+G*.7152+B*.0722,z=(R*.0193+G*.1192+B*.9505)/1.08883;const h=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;x=h(x);y=h(y);z=h(z);return [116*y-16,500*(x-y),200*(y-z)];}
const d3=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
// ---------- küçültme ----------
function downscale(data,w,h,max=MAX){
 const s=Math.min(1,max/Math.max(w,h));if(s===1)return {data,w,h,scale:1};
 const W=Math.max(1,Math.round(w*s)),H=Math.max(1,Math.round(h*s)),out=new Uint8ClampedArray(W*H*4);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const x0=Math.floor(x/s),x1=Math.min(w,Math.floor((x+1)/s)),y0=Math.floor(y/s),y1=Math.min(h,Math.floor((y+1)/s));let r=0,g=0,b=0,n=0;
  for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++){const i=(yy*w+xx)*4;r+=data[i];g+=data[i+1];b+=data[i+2];n++;}const o=(y*W+x)*4;out[o]=r/n;out[o+1]=g/n;out[o+2]=b/n;out[o+3]=255;}
 return {data:out,w:W,h:H,scale:s};
}
// ---------- k-ortalama (Lab, belirlenimci) ----------
function kmeans(lab,n,k=6,iters=10){
 const idx=[];for(let i=0;i<n;i+=Math.max(1,Math.floor(n/6000)))idx.push(i);
 const L=idx.map(i=>lab[i*3]).sort((a,b)=>a-b);let cent=[];
 for(let j=0;j<k;j++){const target=L[Math.floor((j+.5)/k*L.length)];let best=idx[0],bd=1e9;for(const i of idx){const d=Math.abs(lab[i*3]-target)+Math.hypot(lab[i*3+1],lab[i*3+2])*.05*j;if(d<bd){bd=d;best=i;}}cent.push([lab[best*3],lab[best*3+1],lab[best*3+2]]);}
 for(let it=0;it<iters;it++){const sum=cent.map(()=>[0,0,0,0]);for(const i of idx){let b=0,bd=1e9;for(let j=0;j<k;j++){const d=(lab[i*3]-cent[j][0])**2+(lab[i*3+1]-cent[j][1])**2+(lab[i*3+2]-cent[j][2])**2;if(d<bd){bd=d;b=j;}}const s=sum[b];s[0]+=lab[i*3];s[1]+=lab[i*3+1];s[2]+=lab[i*3+2];s[3]++;}cent=cent.map((c,j)=>sum[j][3]?[sum[j][0]/sum[j][3],sum[j][1]/sum[j][3],sum[j][2]/sum[j][3]]:c);}
 const labels=new Uint8Array(n);for(let i=0;i<n;i++){let b=0,bd=1e9;for(let j=0;j<k;j++){const d=(lab[i*3]-cent[j][0])**2+(lab[i*3+1]-cent[j][1])**2+(lab[i*3+2]-cent[j][2])**2;if(d<bd){bd=d;b=j;}}labels[i]=b;}
 return {labels,cent};
}
// ---------- morfoloji (kare çekirdek, integral görüntü) ----------
function boxDilate(m,w,h,r){const I=new Int32Array((w+1)*(h+1));for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){row+=m[y*w+x];I[(y+1)*(w+1)+x+1]=I[y*(w+1)+x+1]+row;}}
 const o=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const x0=Math.max(0,x-r),x1=Math.min(w,x+r+1),y0=Math.max(0,y-r),y1=Math.min(h,y+r+1);o[y*w+x]=I[y1*(w+1)+x1]-I[y0*(w+1)+x1]-I[y1*(w+1)+x0]+I[y0*(w+1)+x0]>0?1:0;}return o;}
const invert=m=>m.map(v=>v?0:1);
const boxErode=(m,w,h,r)=>invert(boxDilate(invert(m),w,h,r));
const closeMask=(m,w,h,r)=>boxErode(boxDilate(m,w,h,r),w,h,r);
function components(m,w,h){const lab=new Int32Array(w*h).fill(-1),comps=[],q=new Int32Array(w*h);
 for(let s=0;s<w*h;s++){if(!m[s]||lab[s]>=0)continue;let head=0,tail=0;q[tail++]=s;lab[s]=comps.length;let x0=w,y0=h,x1=0,y1=0,n=0;
  while(head<tail){const p=q[head++],x=p%w,y=(p/w)|0;n++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;for(const nb of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(nb>=0&&m[nb]&&lab[nb]<0){lab[nb]=comps.length;q[tail++]=nb;}}
  comps.push({id:comps.length,n,box:[x0,y0,x1+1,y1+1]});}
 return {lab,comps};}
function fillHoles(m,w,h){const out=new Uint8Array(w*h).fill(1),q=new Int32Array(w*h);let head=0,tail=0;const push=p=>{if(!m[p]&&out[p]){out[p]=0;q[tail++]=p;}};
 for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
 while(head<tail){const p=q[head++],x=p%w,y=(p/w)|0;if(x>0)push(p-1);if(x<w-1)push(p+1);if(y>0)push(p-w);if(y<h-1)push(p+w);}return out;}
// ---------- dışbükey örtü ve en küçük alanlı dikdörtgen ----------
function hull(pts){pts=pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],up=[];
 for(const p of pts){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}
 up.pop();lo.pop();return lo.concat(up);}
function minAreaRect(H){let best=null;for(let i=0;i<H.length;i++){const a=H[i],b=H[(i+1)%H.length],ang=Math.atan2(b[1]-a[1],b[0]-a[0]),c=Math.cos(ang),s=Math.sin(ang);let mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9;
 for(const p of H){const x=p[0]*c+p[1]*s,y=-p[0]*s+p[1]*c;if(x<mnx)mnx=x;if(x>mxx)mxx=x;if(y<mny)mny=y;if(y>mxy)mxy=y;}const area=(mxx-mnx)*(mxy-mny);
 if(!best||area<best.area){const back=(x,y)=>[x*c-y*s,x*s+y*c];best={area,angle:ang,corners:[back(mnx,mny),back(mxx,mny),back(mxx,mxy),back(mnx,mxy)]};}}return best;}
function polyArea(P){let a=0;for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length];a+=p[0]*q[1]-q[0]*p[1];}return Math.abs(a)/2;}
// Örtüye yerleşen en büyük dörtgen: dikdörtgen köşelerine en yakın örtü noktalarından başla, yerel iyileştir
function bestQuad(H,rect){if(H.length<=4)return H.slice();let idx=rect.corners.map(c=>{let bi=0,bd=1e18;H.forEach((p,i)=>{const d=(p[0]-c[0])**2+(p[1]-c[1])**2;if(d<bd){bd=d;bi=i;}});return bi;});
 let improved=true,guard=0;while(improved&&guard++<50){improved=false;for(let k=0;k<4;k++){let bestA=polyArea(idx.map(i=>H[i])),bestI=idx[k];for(let i=0;i<H.length;i++){if(idx.includes(i))continue;const t=idx.slice();t[k]=i;const P=t.map(j=>H[j]);const order=[...P].map((p,j)=>({p,a:Math.atan2(p[1]-(P[0][1]+P[2][1])/2,p[0]-(P[0][0]+P[2][0])/2)}));const a=polyArea(order.sort((x,y)=>x.a-y.a).map(o=>o.p));if(a>bestA*1.0005){bestA=a;bestI=i;}}if(bestI!==idx[k]){idx[k]=bestI;improved=true;}}}
 const P=idx.map(i=>H[i]),cx=P.reduce((s,p)=>s+p[0],0)/4,cy=P.reduce((s,p)=>s+p[1],0)/4;P.sort((a,b)=>Math.atan2(a[1]-cy,a[0]-cx)-Math.atan2(b[1]-cy,b[0]-cx));
 let start=0,bs=1e18;P.forEach((p,i)=>{const s=p[0]+p[1];if(s<bs){bs=s;start=i;}});return [0,1,2,3].map(k=>P[(start+k)%4]);} // sol-üst, sağ-üst, sağ-alt, sol-alt
// ---------- 1) baskılı yüzey adayı ----------
function findSurface(data,w,h,options={}){
 const small=downscale(data,w,h,options.max||MAX),{w:W,h:Hh}=small,n=W*Hh,lab=new Float32Array(n*3);
 for(let i=0;i<n;i++){const [L,a,b]=toLab(small.data[i*4],small.data[i*4+1],small.data[i*4+2]);lab[i*3]=L;lab[i*3+1]=a;lab[i*3+2]=b;}
 const r=Math.max(2,Math.round(Math.max(W,Hh)*.012)),cands=[];
 for(const K of options.ks||[6,9]){const {labels,cent}=kmeans(lab,n,K);
 for(let k=0;k<cent.length;k++){
  const m=new Uint8Array(n);for(let i=0;i<n;i++)if(labels[i]===k)m[i]=1;
  const closed=closeMask(m,W,Hh,r),{lab:cl,comps}=components(closed,W,Hh);
  for(const c of comps){if(c.n<n*.02||c.n>n*.92)continue;
   const cm=new Uint8Array(n);for(let i=0;i<n;i++)if(cl[i]===c.id)cm[i]=1;const filled=fillHoles(cm,W,Hh);let fa=0,own=0,touch=0;const pts=[];
   for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){const i=y*W+x;if(!filled[i])continue;fa++;if(m[i])own++;if(x===0||y===0||x===W-1||y===Hh-1)touch++;const edge=x===0||y===0||x===W-1||y===Hh-1||!filled[i-1]||!filled[i+1]||!filled[i-W]||!filled[i+W];if(edge)pts.push([x,y]);}
   const Hl=hull(pts);if(Hl.length<3)continue;const rect=minAreaRect(Hl),rectangularity=fa/Math.max(1,rect.area),content=1-own/fa,area=fa/n;
   const perimeter=2*(W+Hh),touchFrac=touch/perimeter;
   // içerik: yüzeyin %1,5–%55'i baskı/delik olmalı; kenara aşırı dayanan bölge (arka plan) cezalandırılır
   const contentScore=content<.015?content/.015:content>.55?Math.max(0,1-(content-.55)/.3):1;
   const score=Math.sqrt(area)*rectangularity**3*contentScore*(1-Math.min(.9,touchFrac*2.5));
   cands.push({K,cluster:k,color:cent[k],area,rectangularity,content,touchFrac,score,quad:bestQuad(Hl,rect).map(([x,y])=>[x/small.scale,y/small.scale]),rect:rect.corners.map(([x,y])=>[x/small.scale,y/small.scale])});
  }
 }}
 cands.sort((a,b)=>b.score-a.score);return {best:cands[0]||null,candidates:cands.slice(0,6),work:{w:W,h:Hh,scale:small.scale}};
}
// ---------- 2) perspektif düzeltme ----------
function homography(src,dst){const A=[],B=[];for(let i=0;i<4;i++){const [x,y]=dst[i],[u,v]=src[i];A.push([x,y,1,0,0,0,-u*x,-u*y]);B.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);B.push(v);}
 for(let i=0;i<8;i++){let p=i;for(let k=i+1;k<8;k++)if(Math.abs(A[k][i])>Math.abs(A[p][i]))p=k;[A[i],A[p]]=[A[p],A[i]];[B[i],B[p]]=[B[p],B[i]];for(let k=i+1;k<8;k++){const f=A[k][i]/A[i][i];for(let j=i;j<8;j++)A[k][j]-=f*A[i][j];B[k]-=f*B[i];}}
 const h=new Array(8);for(let i=7;i>=0;i--){let t=B[i];for(let j=i+1;j<8;j++)t-=A[i][j]*h[j];h[i]=t/A[i][i];}return [...h,1];}
function rectify(data,w,h,quad,maxSide=1400){
 const L=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);let W=Math.max(L(quad[0],quad[1]),L(quad[3],quad[2])),H=Math.max(L(quad[0],quad[3]),L(quad[1],quad[2]));const s=Math.min(1,maxSide/Math.max(W,H));W=Math.max(8,Math.round(W*s));H=Math.max(8,Math.round(H*s));
 const M=homography(quad,[[0,0],[W,0],[W,H],[0,H]]),out=new Uint8ClampedArray(W*H*4);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const X=x+.5,Y=y+.5,d=M[6]*X+M[7]*Y+1,u=(M[0]*X+M[1]*Y+M[2])/d-.5,v=(M[3]*X+M[4]*Y+M[5])/d-.5;const ix=Math.max(0,Math.min(w-2,Math.floor(u))),iy=Math.max(0,Math.min(h-2,Math.floor(v))),fx=Math.min(1,Math.max(0,u-ix)),fy=Math.min(1,Math.max(0,v-iy)),o=(y*W+x)*4;
  for(let k=0;k<3;k++){const i00=(iy*w+ix)*4+k,i10=i00+4,i01=i00+w*4,i11=i01+4;out[o+k]=(data[i00]*(1-fx)+data[i10]*fx)*(1-fy)+(data[i01]*(1-fx)+data[i11]*fx)*fy;}out[o+3]=255;}
 return {data:out,w:W,h:H};
}
// ---------- 3) ışık dengeleme ve mürekkep ----------
function surfaceColor(data,w,h){ // baskı dışı en yaygın renk (kaba histogram)
 const bins=new Map();for(let i=0;i<w*h;i+=2){const j=i*4,key=(data[j]>>4)<<8|(data[j+1]>>4)<<4|(data[j+2]>>4);bins.set(key,(bins.get(key)||0)+1);}
 let bk=0,bn=0;for(const [k,n] of bins)if(n>bn){bn=n;bk=k;}const c=[(bk>>8&15)*16+8,(bk>>4&15)*16+8,(bk&15)*16+8];
 let s=[0,0,0],n=0;for(let i=0;i<w*h;i+=2){const j=i*4;if(Math.abs(data[j]-c[0])<24&&Math.abs(data[j+1]-c[1])<24&&Math.abs(data[j+2]-c[2])<24){s[0]+=data[j];s[1]+=data[j+1];s[2]+=data[j+2];n++;}}
 return n?s.map(v=>v/n):c;}
function flatten(img,surface){ // yüzeydeki parlama/gölgeyi böl: hücre başına yüzeye en yakın piksellerin ortalaması
 const {data,w,h}=img,G=Math.max(8,Math.round(Math.max(w,h)/40)),gw=Math.ceil(w/G),gh=Math.ceil(h/G),bg=new Float32Array(gw*gh*3);
 for(let gy=0;gy<gh;gy++)for(let gx=0;gx<gw;gx++){const px=[];for(let y=gy*G;y<Math.min(h,(gy+1)*G);y++)for(let x=gx*G;x<Math.min(w,(gx+1)*G);x++){const j=(y*w+x)*4;px.push([data[j],data[j+1],data[j+2],Math.abs(data[j]-surface[0])+Math.abs(data[j+1]-surface[1])+Math.abs(data[j+2]-surface[2])]);}
  px.sort((a,b)=>a[3]-b[3]);const keep=px.slice(0,Math.max(1,Math.floor(px.length*.5)));const o=(gy*gw+gx)*3;for(let k=0;k<3;k++)bg[o+k]=keep.reduce((t,p)=>t+p[k],0)/keep.length;}
 // komşu hücrelerle yumuşat (yüzeyin tamamen baskıyla kaplı hücreleri için)
 const sm=new Float32Array(bg.length);for(let gy=0;gy<gh;gy++)for(let gx=0;gx<gw;gx++)for(let k=0;k<3;k++){let t=0,n=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const X=gx+dx,Y=gy+dy;if(X<0||Y<0||X>=gw||Y>=gh)continue;const v=bg[(Y*gw+X)*3+k];t+=v;n++;}sm[(gy*gw+gx)*3+k]=t/n;}
 const out=new Uint8ClampedArray(data.length);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const fx=Math.min(gw-1,Math.max(0,x/G-.5)),fy=Math.min(gh-1,Math.max(0,y/G-.5)),x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(gw-1,x0+1),y1=Math.min(gh-1,y0+1),ax=fx-x0,ay=fy-y0,j=(y*w+x)*4;
  for(let k=0;k<3;k++){const b=(sm[(y0*gw+x0)*3+k]*(1-ax)+sm[(y0*gw+x1)*3+k]*ax)*(1-ay)+(sm[(y1*gw+x0)*3+k]*(1-ax)+sm[(y1*gw+x1)*3+k]*ax)*ay;out[j+k]=Math.max(0,Math.min(255,data[j+k]*surface[k]/Math.max(8,b)));}out[j+3]=255;}
 return {data:out,w,h};}
// Koyu zeminde (gece tabelası, neon) zemin rengi ışıkla değişir: mürekkep, yerel zeminden belirgin parlak piksellerdir.
function inkMaskLightOnDark(img){const {data,w,h}=img,G=Math.max(8,Math.round(Math.max(w,h)/30)),gw=Math.ceil(w/G),gh=Math.ceil(h/G),bg=new Float32Array(gw*gh),lum=new Float32Array(w*h);
 for(let i=0;i<w*h;i++){const j=i*4;lum[i]=.3*data[j]+.59*data[j+1]+.11*data[j+2];}
 for(let gy=0;gy<gh;gy++)for(let gx=0;gx<gw;gx++){const v=[];for(let y=gy*G;y<Math.min(h,(gy+1)*G);y++)for(let x=gx*G;x<Math.min(w,(gx+1)*G);x++)v.push(lum[y*w+x]);v.sort((a,b)=>a-b);bg[gy*gw+gx]=v[Math.floor(v.length*.25)];}
 const m=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let b=1e9;const gx=Math.min(gw-1,Math.floor(x/G)),gy=Math.min(gh-1,Math.floor(y/G));for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=gx+dx,Y=gy+dy;if(X>=0&&Y>=0&&X<gw&&Y<gh)b=Math.min(b,bg[Y*gw+X]);}if(lum[y*w+x]>Math.max(b+55,b*1.9))m[y*w+x]=1;}
 return m;}
function inkMask(img,surface,threshold=22){const {data,w,h}=img,S=toLab(...surface),m=new Uint8Array(w*h);for(let i=0;i<w*h;i++){const j=i*4;if(d3(toLab(data[j],data[j+1],data[j+2]),S)>threshold)m[i]=1;}return m;}
// ---------- 4) temizlik: kenar parçaları, kayıt işaretleri, gürültü ----------
function cleanInk(m,w,h){
 const {lab,comps}=components(m,w,h),keep=new Uint8Array(comps.length),area=w*h,band=Math.round(Math.min(w,h)*.035);
 for(const c of comps){const [x0,y0,x1,y1]=c.box,bw=x1-x0,bh=y1-y0;
  if(c.n<Math.max(6,area*.00002))continue;                                    // gürültü
  if(x0<=0||y0<=0||x1>=w||y1>=h)continue;                                      // yüzey dışına taşan (arka plan, dikiş)
  const nearEdge=x0<band||y0<band||x1>w-band||y1>h-band,small=Math.max(bw,bh)<Math.min(w,h)*.06;
  if(nearEdge&&small&&c.n/(bw*bh)>.8)continue;                                 // köşe kayıt işareti (dolu küçük kare)
  keep[c.id]=1;}
 // Kenar bandında kalan ve ana içerikten uzak, ince/küçük yazılar (ör. "Buradan açınız", üretici satırı)
 let cx0=w,cy0=h,cx1=0,cy1=0;for(const c of comps)if(keep[c.id]){const [x0,y0,x1,y1]=c.box,inBand=x0<band||y0<band||x1>w-band||y1>h-band;if(inBand)continue;cx0=Math.min(cx0,x0);cy0=Math.min(cy0,y0);cx1=Math.max(cx1,x1);cy1=Math.max(cy1,y1);}
 if(cx1>cx0)for(const c of comps)if(keep[c.id]){const [x0,y0,x1,y1]=c.box,inBand=x0<band||y0<band||x1>w-band||y1>h-band;if(!inBand)continue;const gap=Math.max(cx0-x1,x0-cx1,cy0-y1,y0-cy1);const tiny=Math.max(x1-x0,y1-y0)<Math.min(w,h)*.04||Math.min(x1-x0,y1-y0)<Math.min(w,h)*.02;if(gap>Math.min(w,h)*.02&&tiny)keep[c.id]=0;}
 // Esaslı parçaların kutusu (kenar bandı hariç); dışında kalan küçük parçalar doku/üretici yazısıdır
 let bx0=w,by0=h,bx1=0,by1=0;const big=area*.0005;for(const c of comps)if(keep[c.id]&&c.n>=big){const [x0,y0,x1,y1]=c.box;if(x0<band&&x1<band*2||y0<band&&y1<band*2||x1>w-band&&x0>w-band*2||y1>h-band&&y0>h-band*2)continue;bx0=Math.min(bx0,x0);by0=Math.min(by0,y0);bx1=Math.max(bx1,x1);by1=Math.max(by1,y1);}
 if(bx1>bx0){const mg=Math.round(Math.min(w,h)*.03);for(const c of comps)if(keep[c.id]&&c.n<big){const [x0,y0,x1,y1]=c.box;if(x1<bx0-mg||x0>bx1+mg||y1<by0-mg||y0>by1+mg)keep[c.id]=0;}}
 // Kenara yapışık doku kümesi (paket dikişi, kırışık parlama): kenarın %15'i içinde ve yalnız çok küçük beneklerden oluşur
 {const kept=new Uint8Array(w*h);for(let i=0;i<w*h;i++)if(lab[i]>=0&&keep[lab[i]])kept[i]=1;const R=Math.max(2,Math.round(Math.min(w,h)*.025)),groups=components(boxDilate(kept,w,h,R),w,h);
  const sizes=comps.filter(c=>keep[c.id]).map(c=>c.n).sort((a,b)=>a-b),med=sizes.length?sizes[sizes.length>>1]:0;const members=new Map();
  for(const c of comps)if(keep[c.id]){const [x0,y0]=c.box,g=groups.lab[y0*w+x0];if(g<0)continue;if(!members.has(g))members.set(g,[]);members.get(g).push(c);}
  for(const [g,list] of members){const gb=groups.comps[g].box,edge=gb[3]<h*.15||gb[1]>h*.85||gb[2]<w*.15||gb[0]>w*.85;if(!edge)continue;const ms=list.map(c=>c.n).sort((a,b)=>a-b),gm=ms[ms.length>>1];
   if(list.length>=6&&gm<med*.25)for(const c of list)keep[c.id]=0;}}
 const out=new Uint8Array(w*h);for(let i=0;i<w*h;i++)if(lab[i]>=0&&keep[lab[i]])out[i]=1;return out;
}
// ---------- 5) yön ----------
function rotateMask(m,w,h,q){if(q%4===0)return {m,w,h};const W=q%2?h:w,H=q%2?w:h,o=new Uint8Array(W*H);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(!m[y*w+x])continue;let X,Y;if(q===1){X=h-1-y;Y=x;}else if(q===2){X=w-1-x;Y=h-1-y;}else{X=y;Y=w-1-x;}o[Y*W+X]=1;}return {m:o,w:W,h:H};}
function rotateRGBA(img,q){if(q%4===0)return img;const {data,w,h}=img,W=q%2?h:w,H=q%2?w:h,o=new Uint8ClampedArray(W*H*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let X,Y;if(q===1){X=h-1-y;Y=x;}else if(q===2){X=w-1-x;Y=h-1-y;}else{X=y;Y=w-1-x;}const s=(y*w+x)*4,d=(Y*W+X)*4;o[d]=data[s];o[d+1]=data[s+1];o[d+2]=data[s+2];o[d+3]=data[s+3];}return {data:o,w:W,h:H};}
function lineScore(m,w,h){ // yatay yazı satırları: satır izdüşümünde belirgin tepe ve boşluklar
 const row=new Float64Array(h);let tot=0;for(let y=0;y<h;y++){let n=0;for(let x=0;x<w;x++)n+=m[y*w+x];row[y]=n;tot+=n;}if(!tot)return 0;
 let empty=0,trans=0;const thr=tot/h*.08;for(let y=0;y<h;y++){if(row[y]<=thr)empty++;if(y&&((row[y]>thr)!==(row[y-1]>thr)))trans++;}
 const mean=tot/h;let v=0;for(let y=0;y<h;y++)v+=(row[y]-mean)**2;return Math.sqrt(v/h)/mean+trans/h*20*(empty/h);}
function textBands(m,w,h){const row=new Float64Array(h);let tot=0;for(let y=0;y<h;y++){let n=0;for(let x=0;x<w;x++)n+=m[y*w+x];row[y]=n;tot+=n;}const thr=Math.max(1,tot/h*.08),bands=[];let s=-1;
 for(let y=0;y<=h;y++){const on=y<h&&row[y]>thr;if(on&&s<0)s=y;if(!on&&s>=0){if(y-s>=4)bands.push([s,y]);s=-1;}}return bands;}
// Taban çizgisi düz, üst kenar dağınıktır (büyük/küçük harf, nokta, şapka). Ters yazıda tersi olur.
function uprightEvidence(m,w,h){let score=0;
 for(const [y0,y1] of textBands(m,w,h)){const tops=[],bots=[];for(let x=0;x<w;x++){let t=-1,b=-1;for(let y=y0;y<y1;y++)if(m[y*w+x]){if(t<0)t=y;b=y;}if(t>=0){tops.push(t);bots.push(b);}}
  if(tops.length<12)continue;const H=y1-y0,mode=a=>{const c=new Map();for(const v of a)c.set(v,(c.get(v)||0)+1);let bv=0,bn=0;for(const [v,n] of c)if(n>bn){bn=n;bv=v;}return bv;};
  const near=(a,v)=>a.filter(x=>Math.abs(x-v)<=Math.max(1,H*.06)).length/a.length; // ortak kenara oturan sütun oranı
  score+=(near(bots,mode(bots))-near(tops,mode(tops)))*tops.length;}
 return score;}
// Harfleri kelime/satır hâlinde birleştir: kelimeler enine uzundur. Alan ağırlıklı log(en/boy) > 0 → yatay yazı.
function wordAxis(m,w,h){const {comps}=components(m,w,h);const hs=comps.filter(c=>c.n>=8).map(c=>Math.min(c.box[2]-c.box[0],c.box[3]-c.box[1])).sort((a,b)=>a-b);if(!hs.length)return 0;
 const r=Math.max(1,Math.round(hs[hs.length>>1]*.45)),dil=boxDilate(m,w,h,r),{comps:words}=components(dil,w,h);let t=0,n=0;
 for(const c of words){const bw=c.box[2]-c.box[0],bh=c.box[3]-c.box[1];if(c.n<r*r*4)continue;const wt=Math.sqrt(c.n);t+=Math.log(bw/bh)*wt;n+=wt;}return n?t/n:0;}
// Satır kapsamı: bu yönde çıkan yazı satırlarının toplam uzunluğu (karesi) — gerçek yönde satırlar uzun ve düzenlidir
function lineCoverage(m,w,h){let t=0;for(const [x0,y0,x1,y1] of textLines(m,w,h))t+=((x1-x0)/w)**2*Math.min(1,(x1-x0)/Math.max(1,(y1-y0)*2));return t;}
function orientation(m,w,h){const axis=wordAxis(m,w,h),h0=lineScore(m,w,h),r=rotateMask(m,w,h,1),h1=lineScore(r.m,r.w,r.h),c0=lineCoverage(m,w,h),c1=lineCoverage(r.m,r.w,r.h);
 const base=Math.abs(axis)>.25?(axis<0?1:0):(Math.max(c0,c1)>0&&Math.abs(c0-c1)/Math.max(c0,c1)>.2?(c1>c0?1:0):(h1>h0*1.15?1:0));const a=rotateMask(m,w,h,base),b=rotateMask(m,w,h,base+2);
 const ea=uprightEvidence(a.m,a.w,a.h),eb=uprightEvidence(b.m,b.w,b.h);return {quarterTurns:ea>=eb?base:base+2,base,evidence:{c0,c1,axis,horizontal:h0,vertical:h1,upright:ea,flipped:eb}};}
// ---------- 6) yazı satırı kesitleri (yön sınıflandırıcısı için) ----------
function textLines(m,w,h){const row=new Float64Array(h);let tot=0;for(let y=0;y<h;y++){let n=0;for(let x=0;x<w;x++)n+=m[y*w+x];row[y]=n;tot+=n;}const thr=Math.max(1,tot/h*.06),bands=[];let s=-1;
 for(let y=0;y<=h;y++){const on=y<h&&row[y]>thr;if(on&&s<0)s=y;if(!on&&s>=0){if(y-s>=6)bands.push([s,y]);s=-1;}}
 const lines=[];for(const [y0,y1] of bands){const H=y1-y0,col=new Uint8Array(w);for(let x=0;x<w;x++)for(let y=y0;y<y1;y++)if(m[y*w+x]){col[x]=1;break;}let s2=-1,gap=0,last=-1;
  for(let x=0;x<=w;x++){if(x<w&&col[x]){if(s2<0)s2=x;last=x;gap=0;}else if(s2>=0){gap++;if(gap>H*1.2||x===w){if(last-s2>H*1.2)lines.push([s2,y0,last+1,y1]);s2=-1;gap=0;}}}}
 return lines;}
// Harf parçalarından yazı satırları: benzer boyda, dikey olarak örtüşen ve yakın aralıklı en az 3 parça.
// Yön sınıflandırıcısına yalnız gerçek yazı gider (tabak kenarı, bardak, gölge gibi parçalar satıra girmez).
function glyphLines(m,w,h){const {comps}=components(m,w,h),md=Math.min(w,h);
 const g=comps.filter(c=>{const bw=c.box[2]-c.box[0],bh=c.box[3]-c.box[1];return c.n>=10&&bh>=Math.max(w,h)*.008&&bh<=md*.92&&bw<=bh*3.5&&c.n/(bw*bh)>.08;}).map(c=>({x0:c.box[0],y0:c.box[1],x1:c.box[2],y1:c.box[3],h:c.box[3]-c.box[1]})).sort((a,b)=>a.x0-b.x0);
 const used=new Uint8Array(g.length),lines=[];
 for(let i=0;i<g.length;i++){if(used[i])continue;const line=[g[i]];used[i]=1;let last=g[i];
  for(let j=i+1;j<g.length;j++){if(used[j])continue;const c=g[j],ov=Math.min(last.y1,c.y1)-Math.max(last.y0,c.y0),mh=Math.min(last.h,c.h),ratio=c.h/last.h,gap=c.x0-last.x1;
   if(gap>Math.max(last.h,c.h)*1.6)break;if(ov>=mh*.5&&ratio>.45&&ratio<2.2){line.push(c);used[j]=1;last=c;}}
  if(line.length>=3){const x0=Math.min(...line.map(c=>c.x0)),y0=Math.min(...line.map(c=>c.y0)),x1=Math.max(...line.map(c=>c.x1)),y1=Math.max(...line.map(c=>c.y1));lines.push({box:[x0,y0,x1,y1],count:line.length,height:y1-y0});}}
 return lines.sort((a,b)=>b.count*b.height-a.count*a.height);}
function inkContrast(img,surface){const S=toLab(...surface),c=new Float32Array(img.w*img.h);for(let i=0;i<c.length;i++){const j=i*4;c[i]=d3(toLab(img.data[j],img.data[j+1],img.data[j+2]),S);}return c;}
// İçerik dışı kırıntılar: ışık dokusu/yansıma parçaları zemine göre soluktur. Ana yazıya göre soluk satırlar satır sayılmaz;
// ana içeriğe uzak ve soluk ya da küçük kümeler atılır. QR/amblem gibi belirgin, büyük grafikler korunur.
function dropOutliers(m,w,h,contrast,img){
 const all=glyphLines(m,w,h);if(!all.length)return m;
 const lineC=l=>{const [x0,y0,x1,y1]=l.box;let t=0,n=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=y*w+x;if(m[i]){t+=contrast[i];n++;}}return n?t/n:0;};
 for(const l of all)l.c=lineC(l);const ref=all.slice(0,3).reduce((a,l)=>Math.max(a,l.c),0),lines=all.filter(l=>l.c>=ref*.72);if(!lines.length)return m;
 const gh=lines.map(l=>l.height).sort((a,b)=>a-b)[lines.length>>1],R=Math.max(2,Math.min(Math.round(gh*.22),Math.round(Math.min(w,h)*.012))),cl=components(boxDilate(m,w,h,R),w,h),inkPer=new Float64Array(cl.comps.length),cPer=new Float64Array(cl.comps.length);
 for(let i=0;i<w*h;i++)if(m[i]&&cl.lab[i]>=0){inkPer[cl.lab[i]]++;cPer[cl.lab[i]]+=contrast[i];}
 let lineInk=0;for(const l of lines){const [x0,y0,x1,y1]=l.box;let n=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)n+=m[y*w+x];lineInk=Math.max(lineInk,n);}
 // Ana yazı bölgesi: güçlü satırların birleşik kutusu, en büyük satır yüksekliğinin 1,5 katı genişletilmiş.
 // Bir küme alanının en az %60'ı bu bölgedeyse ve bir satıra yakınsa içeriktir (logo çemberi evet, tabak kenarı hayır).
 const maxLH=Math.max(...lines.map(l=>l.height)),U=[Math.min(...lines.map(l=>l.box[0]))-maxLH*1.5,Math.min(...lines.map(l=>l.box[1]))-maxLH*1.5,Math.max(...lines.map(l=>l.box[2]))+maxLH*1.5,Math.max(...lines.map(l=>l.box[3]))+maxLH*1.5];
 const inside=box=>{const ix=Math.max(0,Math.min(box[2],U[2])-Math.max(box[0],U[0])),iy=Math.max(0,Math.min(box[3],U[3])-Math.max(box[1],U[1]));return ix*iy/Math.max(1,(box[2]-box[0])*(box[3]-box[1]));};
 const near=box=>inside(box)>=.6&&lines.some(l=>{const [x0,y0,x1,y1]=l.box,pad=gh*.6;return !(box[2]<x0-pad||box[0]>x1+pad||box[3]<y0-pad||box[1]>y1+pad);});
 const colOf=(box,test)=>{const [x0,y0,x1,y1]=box;let r=0,g=0,b=0,n=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=y*w+x;if(!m[i]||!test(i))continue;const j=i*4;r+=img.data[j];g+=img.data[j+1];b+=img.data[j+2];n++;}return n?toLab(r/n,g/n,b/n):null;};
 const lineCols=img?lines.slice(0,4).map(l=>colOf(l.box,()=>true)).filter(Boolean):[];
 const keep=new Uint8Array(cl.comps.length);
 for(const c of cl.comps){const ink=inkPer[c.id],meanC=cPer[c.id]/Math.max(1,ink),[x0,y0,x1,y1]=c.box,density=ink/Math.max(1,(x1-x0-2*R)*(y1-y0-2*R));
  let far=false;if(img&&lineCols.length&&density>.5){const col=colOf(c.box,i=>cl.lab[i]===c.id);far=!!col&&lineCols.every(L=>d3(col,L)>35);}
  keep[c.id]=(near(c.box)&&meanC>=ref*.5)||(ink>=lineInk*.25&&density>=.18&&meanC>=ref*.72&&!far)?1:0;}
 const out=new Uint8Array(w*h);for(let i=0;i<w*h;i++)if(m[i]&&cl.lab[i]>=0&&keep[cl.lab[i]])out[i]=1;return out;}
// PP-OCR yön sınıflandırıcısı girdisi: 3×48×192, BGR, [-1,1]
function clsTensor(img,box){const [x0,y0,x1,y1]=box,pad=Math.round((y1-y0)*.15),X0=Math.max(0,x0-pad),Y0=Math.max(0,y0-pad),X1=Math.min(img.w,x1+pad),Y1=Math.min(img.h,y1+pad),cw=X1-X0,ch=Y1-Y0,W=Math.min(192,Math.ceil(48*cw/ch)),t=new Float32Array(3*48*192);
 for(let y=0;y<48;y++)for(let x=0;x<W;x++){const sx=X0+Math.min(cw-1,Math.floor(x*cw/W)),sy=Y0+Math.min(ch-1,Math.floor(y*ch/48)),j=(sy*img.w+sx)*4;t[y*192+x]=(img.data[j+2]/127.5)-1;t[48*192+y*192+x]=(img.data[j+1]/127.5)-1;t[2*48*192+y*192+x]=(img.data[j]/127.5)-1;}
 return {tensor:t,weight:x1-x0};}
// ---------- 7) renkler ve temiz çizim ----------
function palette(img,m,maxColors=4){const {data,w,h}=img,pts=[];for(let i=0;i<w*h;i+=Math.max(1,Math.floor(w*h/40000)))if(m[i]){const j=i*4;pts.push(toLab(data[j],data[j+1],data[j+2]));}
 if(!pts.length)return [];let best=null;
 for(let k=1;k<=maxColors;k++){const L=pts.map(p=>p[0]).sort((a,b)=>a-b);let cent=[...Array(k)].map((_,j)=>{const t=L[Math.floor((j+.5)/k*L.length)];return pts.reduce((b,p)=>Math.abs(p[0]-t)<Math.abs(b[0]-t)?p:b,pts[0]).slice();});
  for(let it=0;it<12;it++){const sum=cent.map(()=>[0,0,0,0]);for(const p of pts){let b=0,bd=1e9;cent.forEach((c,j)=>{const d=d3(p,c);if(d<bd){bd=d;b=j;}});sum[b][0]+=p[0];sum[b][1]+=p[1];sum[b][2]+=p[2];sum[b][3]++;}cent=cent.map((c,j)=>sum[j][3]?sum[j].slice(0,3).map(v=>v/sum[j][3]):c);}
  let err=0;const counts=cent.map(()=>0);for(const p of pts){let b=0,bd=1e9;cent.forEach((c,j)=>{const d=d3(p,c);if(d<bd){bd=d;b=j;}});err+=bd;counts[b]++;}err/=pts.length;
  const distinct=cent.every((c,i)=>cent.every((d,j)=>i>=j||d3(c,d)>30))&&counts.every(n=>n>=pts.length*.04);
  if(!best||(distinct&&err<best.err*.62))best={cent,err,counts};}
 return best.cent;}
function labToRgb([L,a,b]){let y=(L+16)/116,x=a/500+y,z=y-b/200;const f=t=>t**3>.008856?t**3:(t-16/116)/7.787;x=f(x)*.95047;y=f(y);z=f(z)*1.08883;let r=x*3.2406+y*-1.5372+z*-.4986,g=x*-.9689+y*1.8758+z*.0415,bb=x*.0557+y*-.204+z*1.057;const c=v=>Math.round(255*Math.max(0,Math.min(1,v>.0031308?1.055*v**(1/2.4)-.055:12.92*v)));return [c(r),c(g),c(bb)];}
// Yumuşak alfa (mürekkep olasılığı) ile kenarları düzgün, düz renkli, şeffaf zeminli çıktı
function renderClean(img,m,surface,pal,minLong=1200,opaqueGround=false){
 let x0=img.w,y0=img.h,x1=0,y1=0;for(let y=0;y<img.h;y++)for(let x=0;x<img.w;x++)if(m[y*img.w+x]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
 if(x1<x0)return null;const pad=Math.round(Math.max(x1-x0,y1-y0)*.03);x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(img.w-1,x1+pad);y1=Math.min(img.h-1,y1+pad);
 const cw=x1-x0+1,ch=y1-y0+1,scale=Math.max(1,minLong/Math.max(cw,ch)),W=Math.round(cw*scale),H=Math.round(ch*scale),S=toLab(...surface),rgbPal=pal.map(labToRgb);
 // kaynak çözünürlükte: alfa ve renk etiketi (yalnız temizlenmiş maskenin yakınında)
 const near=boxDilate(m,img.w,img.h,2),alpha=new Float32Array(cw*ch),label=new Uint8Array(cw*ch);
 for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const i=(y+y0)*img.w+(x+x0),j=i*4;if(!near[i])continue;const c=toLab(img.data[j],img.data[j+1],img.data[j+2]),dS=d3(c,S);let b=0,bd=1e9;pal.forEach((p,k)=>{const d=d3(c,p);if(d<bd){bd=d;b=k;}});
  alpha[y*cw+x]=Math.max(0,Math.min(1,(dS-12)/Math.max(8,d3(pal[b],S)-12)));label[y*cw+x]=b;}
 const out=new Uint8ClampedArray(W*H*4);
 for(let Y=0;Y<H;Y++)for(let X=0;X<W;X++){const fx=Math.min(cw-1.001,Math.max(0,(X+.5)/scale-.5)),fy=Math.min(ch-1.001,Math.max(0,(Y+.5)/scale-.5)),ix=Math.floor(fx),iy=Math.floor(fy),ax=fx-ix,ay=fy-iy;
  const a=(alpha[iy*cw+ix]*(1-ax)+alpha[iy*cw+ix+1]*ax)*(1-ay)+(alpha[(iy+1)*cw+ix]*(1-ax)+alpha[(iy+1)*cw+ix+1]*ax)*ay;
  const A=Math.max(0,Math.min(1,(a-.5)*3+.5)),o=(Y*W+X)*4;
  if(opaqueGround){const c=A>0?rgbPal[label[Math.round(fy)*cw+Math.round(fx)]]:surface;for(let k=0;k<3;k++)out[o+k]=Math.round(surface[k]*(1-A)+c[k]*A);out[o+3]=255;continue;}
  if(A<=0)continue;const nx=Math.round(fx),ny=Math.round(fy),c=rgbPal[label[ny*cw+nx]];out[o]=c[0];out[o+1]=c[1];out[o+2]=c[2];out[o+3]=Math.round(A*255);}
 return {data:out,w:W,h:H,box:[x0,y0,x1+1,y1+1]};}
// ---------- tam akış ----------
// classify: (tensorlar) → Promise<P(düz)[]> (isteğe bağlı yerel model). Verilmezse yalnız geometrik kanıt kullanılır.
async function extract(data,w,h,{classify=null,candidates=3}={}){
 // Sonuç girdi boyutuna bağlı olmasın: her zaman en uzun kenarı en çok 2048 piksel olan görüntüde çalış (tarayıcı = test)
 {const d=downscale(data,w,h,2048);data=d.data;w=d.w;h=d.h;}
 const found=findSurface(data,w,h);if(!found.best)return {ok:false,reason:'surface-not-found'};
 const tried=[];let pool=found.candidates.slice(0,candidates);
 if(found.best&&found.best.area<.97){const top=found.best,inner=rectify(data,w,h,top.quad,1100),sub=findSurface(inner.data,inner.w,inner.h);
  if(sub.best&&sub.best.area<.8){const H=homography([[0,0],[inner.w,0],[inner.w,inner.h],[0,inner.h]],top.quad);const map=([x,y])=>{const d=H[6]*x+H[7]*y+1;return [(H[0]*x+H[1]*y+H[2])/d,(H[3]*x+H[4]*y+H[5])/d];};
   pool=pool.concat(sub.candidates.slice(0,2).map(c=>({...c,score:c.score*Math.min(1,top.score*2.2)*.85,quad:c.quad.map(map),nested:true})));}}
 for(const cand of pool){
  const rect=rectify(data,w,h,cand.quad);const surface=surfaceColor(rect.data,rect.w,rect.h),lum=.3*surface[0]+.59*surface[1]+.11*surface[2];
  const dark=lum<80,flat=dark?rect:flatten(rect,surface);const mask=cleanInk(dark?inkMaskLightOnDark(flat):inkMask(flat,surface),rect.w,rect.h);let ink=0;for(const v of mask)ink+=v;
  const inkFrac=ink/(rect.w*rect.h);if(inkFrac<.004||inkFrac>.6){tried.push({reason:'ink-out-of-range',inkFrac});continue;}
  const o=orientation(mask,rect.w,rect.h);let q=o.quarterTurns,source='geometry',confidence=0;
  if(classify){const P=[];const turns=[o.base,o.base+2];for(const turn of turns){const img=rotateRGBA(flat,turn),mm=rotateMask(mask,rect.w,rect.h,turn).m,gl=glyphLines(mm,img.w,img.h).slice(0,8);if(!gl.length){P.push(null);continue;}
    const items=gl.map(l=>({...clsTensor(img,l.box),weight:Math.max(.5,l.count-2)**1.5*l.height}));const probs=await classify(items.map(i=>i.tensor));let s=0,wt=0;probs.forEach((p,i)=>{s+=p*items[i].weight;wt+=items[i].weight;});P.push(wt?s/wt:null);}
   const valid=P.map((p,i)=>({p,t:turns[i]%4})).filter(v=>v.p!=null).sort((a,b)=>b.p-a.p);if(valid.length>=2){confidence=valid[0].p-valid[1].p;const opposite=valid.find(v=>(v.t+2)%4===valid[0].t);if(opposite)confidence=Math.min(confidence*2,valid[0].p-opposite.p);if(confidence>=.25){q=valid[0].t;source='local-orientation-model';}}}else confidence=.5;
  // Baskı kalitesi: yazı satırları var mı, tek parça büyük leke mi (ekran/harita), yön modeli ne kadar emin
  const {comps}=components(mask,rect.w,rect.h);const maxShare=comps.reduce((m,c)=>Math.max(m,c.n),0)/Math.max(1,ink);const lines=textLines(rotateMask(mask,rect.w,rect.h,q).m,q%2?rect.h:rect.w,q%2?rect.w:rect.h).length;
  // Yazı oranı: mürekkebin ne kadarı harf satırlarındaki parçalara ait (gösterge, süs, efekt parçaları düşük çıkar)
  const rm=rotateMask(mask,rect.w,rect.h,q),gls=glyphLines(rm.m,rm.w,rm.h);let glyphInk=0;{const inBox=new Uint8Array(rm.w*rm.h);for(const l of gls){const [x0,y0,x1,y1]=l.box;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)inBox[y*rm.w+x]=1;}for(let i=0;i<inBox.length;i++)if(inBox[i]&&rm.m[i])glyphInk++;}
  const glyphFrac=glyphInk/Math.max(1,ink);
  const quality=cand.score*(.5+.5*Math.min(lines,4)/4)*(1-.75*Math.min(1,maxShare))*(.35+.65*Math.min(1,confidence/.6));
  tried.push({cand,rect,flat,mask,surface,q,source,inkFrac,quality,diag:{glyphFrac:+glyphFrac.toFixed(2),glyphLines:gls.length,score:+cand.score.toFixed(3),lines,maxShare:+maxShare.toFixed(2),confidence:+confidence.toFixed(2),surface:surface.map(v=>v|0).join(',')}});
 }
 const ok=tried.filter(t=>t.quality!=null).sort((a,b)=>b.quality-a.quality);if(!ok.length)return {ok:false,reason:'no-usable-surface',tried:tried.map(t=>t.reason)};
 {const {cand,rect,flat,mask,surface,q,source,inkFrac,quality}=ok[0];
  const img=rotateRGBA(flat,q),mm0=rotateMask(mask,rect.w,rect.h,q),mm={...mm0,m:dropOutliers(mm0.m,mm0.w,mm0.h,inkContrast(img,surface),img)},core=boxErode(mm.m,mm.w,mm.h,1);let coreN=0;for(const v of core)coreN+=v;const pal=palette(img,coreN>200?core:mm.m);// Koyu zemin üzerindeki açık baskı (tabela, neon): yüzey rengi de tasarımın parçasıdır; düz, tam kaplayan zeminle çizilir
  const lumS=.3*surface[0]+.59*surface[1]+.11*surface[2],lumInk=pal.length?Math.max(...pal.map(p=>p[0]))*2.55:0,lightOnDark=lumS<110&&lumInk>lumS+40;
  const out=renderClean(img,mm.m,surface.map(Math.round),pal,1200,lightOnDark);if(!out)return {ok:false,reason:'empty'};
  return {ok:true,lightOnDark,confidence:ok[0].diag.confidence,glyphFraction:ok[0].diag.glyphFrac,quality,alternatives:ok.length-1,diagnostics:ok.map(t=>({...t.diag,quality:+t.quality.toFixed(4)})),image:out,palette:pal.map(labToRgb).map(c=>'#'+c.map(v=>v.toString(16).padStart(2,'0')).join('')),surface:'#'+surface.map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''),quad:cand.quad,quarterTurns:q,orientationSource:source,inkFraction:inkFrac,surfaceScore:cand.score,method:'local-product-photo-v1'};
 }
}
const api=Object.freeze({glyphLines,extract,findSurface,textLines,clsTensor,palette,renderClean,rectify,surfaceColor,flatten,inkMask,cleanInk,orientation,rotateRGBA,_internal:{homography,rotateMask,uprightEvidence,lineScore,downscale,kmeans,closeMask,components,fillHoles,hull,minAreaRect,bestQuad,toLab}});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProductPhoto=api;
})(typeof globalThis!=='undefined'?globalThis:this);
