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
// ---------- 2b) köşeleri gerçek kenar çizgilerinden bulma ----------
// Beyaz peçete beyaz tabakta, paket benzer renkli zeminde: renk bölgesi taşabilir. Yüzeyin kenarları düz çizgilerdir;
// Hough ile çizgiler bulunur, logoyu içine alan ve kenarları gerçekten çizgi boyunca uzanan dörtgen seçilir.
function refineQuad(data,w,h,quad,center){
 const sm=downscale(data,w,h,700),W=sm.w,H=sm.h,sc=sm.scale,L=new Float32Array(W*H);for(let i=0;i<W*H;i++){const j=i*4;L[i]=.3*sm.data[j]+.59*sm.data[j+1]+.11*sm.data[j+2];}
 const mag=new Float32Array(W*H),ang=new Float32Array(W*H);for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x,gx=L[i-W+1]+2*L[i+1]+L[i+W+1]-L[i-W-1]-2*L[i-1]-L[i+W-1],gy=L[i+W-1]+2*L[i+W]+L[i+W+1]-L[i-W-1]-2*L[i-W]-L[i-W+1];mag[i]=Math.hypot(gx,gy);ang[i]=Math.atan2(gy,gx);}
 const sorted=Array.from(mag).sort((a,b)=>a-b),thr=Math.max(20,sorted[Math.floor(sorted.length*.9)]),edge=new Uint8Array(W*H);for(let i=0;i<W*H;i++)if(mag[i]>=thr)edge[i]=1;
 const R=Math.ceil(Math.hypot(W,H)),T=180,acc=new Float32Array(T*(2*R+1)),cosT=[],sinT=[];for(let t=0;t<T;t++){cosT.push(Math.cos(t*Math.PI/T));sinT.push(Math.sin(t*Math.PI/T));}
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x;if(!edge[i])continue;let gt=Math.round(((ang[i]%Math.PI)+Math.PI)%Math.PI/Math.PI*T)%T;for(let d=-6;d<=6;d++){const t=(gt+d+T)%T,r=Math.round(x*cosT[t]+y*sinT[t]);acc[t*(2*R+1)+r+R]+=1;}}
 const peaks=[];for(let t=0;t<T;t++)for(let r=-R;r<=R;r++){const v=acc[t*(2*R+1)+r+R];if(v<Math.max(W,H)*.12)continue;let best=true;for(let dt=-4;dt<=4&&best;dt++)for(let dr=-8;dr<=8;dr++){const tt=(t+dt+T)%T,rr=r+dr*(t+dt<0||t+dt>=T?-1:1);if(rr<-R||rr>R)continue;if(acc[tt*(2*R+1)+rr+R]>v){best=false;break;}}if(best)peaks.push({t,r,v});}
 peaks.sort((a,b)=>b.v-a.v);
 // Görüntünün baştan sona kesintisiz kenarı (ekran/fotoğraf çerçevesi, masa kenarı) nesne kenarı değildir
 const fullSpan=l=>{const c=cosT[l.t],s2=sinT[l.t];let n=0,hit=0;for(let k=0;k<=200;k++){let x,y;if(Math.abs(s2)>.5){x=k/200*(W-1);y=(l.r-x*c)/s2;}else{y=k/200*(H-1);x=(l.r-y*s2)/c;}if(x<0||y<0||x>=W||y>=H)continue;n++;const X=Math.round(x),Y=Math.round(y);let ok=false;for(let d=-2;d<=2&&!ok;d++){const yy=Abs(s2)>.5?Y+d:Y,xx=Abs(s2)>.5?X:X+d;if(xx>=0&&yy>=0&&xx<W&&yy<H&&edge[yy*W+xx])ok=true;}if(ok)hit++;}const axis=l.t<=1||l.t>=179||Math.abs(l.t-90)<=1;return n>50&&hit/n>(axis?.5:.8);};
 const Abs=Math.abs,lines=peaks.filter(l=>!fullSpan(l)).slice(0,22);
 // Renk bölgesi dörtgeninin kenarları da aday çizgi: beyaz-beyaz gibi zayıf kenarlarda (peçete/tabak) çizgi bulunamazsa bunlar kullanılır
 const qs=quad.map(([x,y])=>[x*sm.scale,y*sm.scale]);for(let e=0;e<4;e++){const p=qs[e],q=qs[(e+1)%4];let th=Math.atan2(q[1]-p[1],q[0]-p[0])+Math.PI/2;th=((th%Math.PI)+Math.PI)%Math.PI;const t=Math.round(th/Math.PI*T)%T,r=Math.round(p[0]*cosT[t]+p[1]*sinT[t]);lines.push({t,r,v:0,pseudo:true});}
 if(lines.length<4)return null;
 const inter=(a,b)=>{const d=cosT[a.t]*sinT[b.t]-sinT[a.t]*cosT[b.t];if(Math.abs(d)<1e-6)return null;return [(a.r*sinT[b.t]-sinT[a.t]*b.r)/d,(cosT[a.t]*b.r-a.r*cosT[b.t])/d];};
 const supportRaw=(p,q)=>{const n=Math.max(10,Math.round(Math.hypot(q[0]-p[0],q[1]-p[1])/2));let hit=0;for(let k=0;k<=n;k++){const x=Math.round(p[0]+(q[0]-p[0])*k/n),y=Math.round(p[1]+(q[1]-p[1])*k/n);let ok=false;for(let dy=-2;dy<=2&&!ok;dy++)for(let dx=-2;dx<=2;dx++){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<W&&Y<H&&edge[Y*W+X]){ok=true;break;}}if(ok)hit++;}return hit/(n+1);};
 const support=supportRaw;
 const cx=center[0]*sc,cy=center[1]*sc,q0=quad.map(([x,y])=>[x*sc,y*sc]),area0=polyArea(q0),tdist=(a,b)=>{const d=Math.abs(a-b)%T;return Math.min(d,T-d);};
 const inside=(P,x,y)=>{let s=0;for(let i=0;i<4;i++){const a=P[i],b=P[(i+1)%4],c=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);if(c===0)continue;if(!s)s=Math.sign(c);else if(Math.sign(c)!==s)return false;}return true;};
 let best=null;
 for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){if(tdist(lines[i].t,lines[j].t)>25)continue;const A=[lines[i],lines[j]];if(Math.abs(A[0].r-A[1].r)<20&&tdist(A[0].t,A[1].t)<5)continue;
  for(let k=0;k<lines.length;k++)for(let l=k+1;l<lines.length;l++){if(k===i||k===j||l===i||l===j)continue;if(tdist(lines[k].t,lines[l].t)>25)continue;const dA=tdist(lines[i].t,lines[k].t);if(dA<40)continue;
   const B=[lines[k],lines[l]],P=[inter(A[0],B[0]),inter(B[0],A[1]),inter(A[1],B[1]),inter(B[1],A[0])];if(P.some(p=>!p||p[0]<-W*.05||p[1]<-H*.05||p[0]>W*1.05||p[1]>H*1.05))continue;
   if(!inside(P,cx,cy))continue;const ar=polyArea(P);if(ar<area0*.3||ar>area0*1.25||ar<W*H*.03)continue;
   const sideLines=[A[0],B[0],A[1],B[1]],sup=[0,1,2,3].map(e=>sideLines[e].pseudo?Math.max(.6,support(P[e],P[(e+1)%4])):support(P[e],P[(e+1)%4])),minS=Math.min(...sup),mean=sup.reduce((a,b)=>a+b,0)/4;if(minS<.35)continue;
   // Nesne kenarı köşede biter; çerçeve/masa çizgisi köşeden sonra da sürer → köşe ötesindeki destek cezalandırılır
   let ext=0;for(let e=0;e<4;e++){const p=P[e],q=P[(e+1)%4],dx=q[0]-p[0],dy=q[1]-p[1];ext=Math.max(ext,support([p[0]-dx*.25,p[1]-dy*.25],[p[0]-dx*.03,p[1]-dy*.03]),support([q[0]+dx*.03,q[1]+dy*.03],[q[0]+dx*.25,q[1]+dy*.25]));}
   // Renk bölgesiyle uyum: dörtgenin ne kadarı ilk (renk) bölgesinin içinde (masa, çatal gibi dışarı taşmalar düşük)
   let inn=0,tot=0;const bx0=Math.min(...P.map(p=>p[0])),bx1=Math.max(...P.map(p=>p[0])),by0=Math.min(...P.map(p=>p[1])),by1=Math.max(...P.map(p=>p[1]));
   for(let gy=0;gy<24;gy++)for(let gx=0;gx<24;gx++){const x=bx0+(gx+.5)/24*(bx1-bx0),y=by0+(gy+.5)/24*(by1-by0);if(!inside(P,x,y))continue;tot++;if(inside(q0,x,y))inn++;}
   const precision=tot?inn/tot:0;
   const score=mean*Math.sqrt(ar/area0>1?1:ar/area0)*(.7+.3*minS)*(1-Math.max(0,ext-.35))*precision*precision;if(!best||score>best.score)best={score,P,mean,minS};}}
 if(!best||best.mean<.55)return null;
 const P=best.P,cxp=P.reduce((a,p)=>a+p[0],0)/4,cyp=P.reduce((a,p)=>a+p[1],0)/4;P.sort((a,b)=>Math.atan2(a[1]-cyp,a[0]-cxp)-Math.atan2(b[1]-cyp,b[0]-cxp));let st=0,bs=1e18;P.forEach((p,i)=>{const s2=p[0]+p[1];if(s2<bs){bs=s2;st=i;}});
 return {quad:[0,1,2,3].map(k=>[P[(st+k)%4][0]/sc,P[(st+k)%4][1]/sc]),support:best.mean,minSupport:best.minS};}
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
// Logo grubu: en belirgin yazı satırı (marka adı) + ona yakın, yeterince büyük satırlar + bu grubun kutusuna giren
// simge/grafikler. Grubun dışındaki her şey (gölge, parmak, arka plan parçası, küçük adres/telefon satırları) atılır.
function brandGroup(m,w,h){
 const lines=glyphLines(m,w,h);if(!lines.length)return m;
 const brand=lines.reduce((b,l)=>l.count*l.height*l.height>b.count*b.height*b.height?l:b,lines[0]),H=brand.height;
 // Müşterinin gönderdiği tüm yazı satırları korunur (adres, telefon, Instagram dahil): yeterince belirgin her satır gruba girer.
 // Yalnız yazı olmayan lekeler (gölge, parmak, arka plan parçası) grup dışında kalıp atılır.
 let box=brand.box.slice();const used=new Set([brand]),extra=lines.filter(l=>l!==brand&&l.count>=4&&l.height>=Math.max(6,H*.12));let grew=true;
 while(grew){grew=false;for(const l of lines){if(used.has(l)||l.height<H*.3)continue;const [x0,y0,x1,y1]=l.box,vgap=Math.max(box[1]-y1,y0-box[3]),hov=Math.min(box[2],x1)-Math.max(box[0],x0);
  const vov=Math.min(box[3],y1)-Math.max(box[1],y0),hgap=Math.max(box[0]-x1,x0-box[2]);
  // alt/üst satır ya da aynı hizada yan yana duran ikinci marka/satır
  if((vgap<=H*1.2&&hov>-H*.5)||(vov>0&&hgap<=H*2)){used.add(l);box=[Math.min(box[0],x0),Math.min(box[1],y0),Math.max(box[2],x1),Math.max(box[3],y1)];grew=true;}}}
 // simge/grafik: kutuya bitişik ya da kutuyla örtüşen bileşenler (yanındaki simge, üstündeki amblem, çevresindeki çember)
 const {lab,comps}=components(m,w,h),keep=new Uint8Array(comps.length);grew=true;
 const touches=(b,c,pad)=>!(c[2]<b[0]-pad||c[0]>b[2]+pad||c[3]<b[1]-pad||c[1]>b[3]+pad);
 while(grew){grew=false;for(const c of comps){if(keep[c.id]||c.n<6)continue;const cb=c.box,inside=cb[0]>=box[0]&&cb[1]>=box[1]&&cb[2]<=box[2]&&cb[3]<=box[3],big=Math.max(cb[2]-cb[0],cb[3]-cb[1])>=H*.5;
  if(inside||(big&&touches(box,cb,H*.6))||touches(box,cb,H*.15)){keep[c.id]=1;if(!inside){box=[Math.min(box[0],cb[0]),Math.min(box[1],cb[1]),Math.max(box[2],cb[2]),Math.max(box[3],cb[3])];grew=true;}}}}
 for(let pass=0;pass<2;pass++){let added=false;for(const l of lines){if(used.has(l)||l.height<H*.3)continue;const [x0,y0,x1,y1]=l.box,vgap=Math.max(box[1]-y1,y0-box[3]),hov=Math.min(box[2],x1)-Math.max(box[0],x0),vov=Math.min(box[3],y1)-Math.max(box[1],y0),hgap=Math.max(box[0]-x1,x0-box[2]);
  if((vgap<=H*1.2&&hov>-H*.5)||(vov>0&&hgap<=H*2)){used.add(l);box=[Math.min(box[0],x0),Math.min(box[1],y0),Math.max(box[2],x1),Math.max(box[3],y1)];added=true;}}
  if(!added)break;for(const c of comps){if(keep[c.id]||c.n<6)continue;const cb=c.box,inside=cb[0]>=box[0]&&cb[1]>=box[1]&&cb[2]<=box[2]&&cb[3]<=box[3],big=Math.max(cb[2]-cb[0],cb[3]-cb[1])>=H*.5;if(inside||(big&&touches(box,cb,H*.6))||touches(box,cb,H*.15))keep[c.id]=1;}}
 // Ek yazı satırları (adres, telefon...): yalnız kendi kutusundaki harf parçaları eklenir; büyük lekeler çekilmez
 for(const l of extra){const [x0,y0,x1,y1]=l.box,pad=l.height*.35;for(const c of comps){if(keep[c.id])continue;const b=c.box;if(b[0]>=x0-pad&&b[2]<=x1+pad&&b[1]>=y0-pad&&b[3]<=y1+pad&&(b[3]-b[1])<=l.height*1.6)keep[c.id]=1;}}
 const out=new Uint8Array(w*h);for(let i=0;i<w*h;i++)if(lab[i]>=0&&keep[lab[i]])out[i]=1;return out;}
// Eğiklik: harf satırlarının taban çizgisi açısı (harf alt noktalarına dayanıklı doğru oturtma, satır ağırlıklı).
// Logo bu açının tersine çevrilir; yazı karşıdan bakılıyormuş gibi yatay olur.
function baselineAngle(m,w,h){
 const {comps}=components(m,w,h),md=Math.min(w,h);let sum=0,wt=0;
 for(const l of glyphLines(m,w,h)){if(l.count<4)continue;const [x0,y0,x1,y1]=l.box;
  const pts=comps.filter(c=>{const b=c.box,bh=b[3]-b[1];return b[0]>=x0&&b[2]<=x1&&b[1]>=y0&&b[3]<=y1&&bh>=l.height*.45;}).map(c=>[(c.box[0]+c.box[2])/2,c.box[3]]);
  if(pts.length<4)continue;const fit=P=>{const n=P.length,mx=P.reduce((a,p)=>a+p[0],0)/n,my=P.reduce((a,p)=>a+p[1],0)/n;let sxy=0,sxx=0;for(const [x,y] of P){sxy+=(x-mx)*(y-my);sxx+=(x-mx)**2;}const k=sxx?sxy/sxx:0;return {k,b:my-k*mx};};
  let f=fit(pts);const res=pts.map(([x,y])=>Math.abs(y-(f.k*x+f.b))).sort((a,b)=>a-b),tol=Math.max(2,res[Math.floor(res.length*.6)]*1.5);const inl=pts.filter(([x,y])=>Math.abs(y-(f.k*x+f.b))<=tol);if(inl.length>=4)f=fit(inl);
  const weight=l.count*l.height;sum+=Math.atan(f.k)*weight;wt+=weight;}
 return wt?sum/wt:0;}
// Genel doğrusal dönüşüm (2×2 matris M: kaynak→hedef), merkez korunur.
function affineBy(img,mask,M){const {w,h}=img,det=M[0]*M[3]-M[1]*M[2];if(Math.abs(det)<1e-6)return {img,mask:{m:mask,w,h}};const I=[M[3]/det,-M[1]/det,-M[2]/det,M[0]/det];
 const cs=[[0,0],[w,0],[0,h],[w,h]].map(([x,y])=>[M[0]*(x-w/2)+M[1]*(y-h/2),M[2]*(x-w/2)+M[3]*(y-h/2)]),W=Math.ceil(Math.max(...cs.map(p=>p[0]))-Math.min(...cs.map(p=>p[0]))),H=Math.ceil(Math.max(...cs.map(p=>p[1]))-Math.min(...cs.map(p=>p[1])));
 const out=new Uint8ClampedArray(W*H*4),om=new Uint8Array(W*H),bg=[img.data[0],img.data[1],img.data[2]];
 for(let Y=0;Y<H;Y++)for(let X=0;X<W;X++){const dx=X-W/2,dy=Y-H/2,x=I[0]*dx+I[1]*dy+w/2,y=I[2]*dx+I[3]*dy+h/2,o=(Y*W+X)*4;
  if(x<0||y<0||x>w-1||y>h-1){out[o]=bg[0];out[o+1]=bg[1];out[o+2]=bg[2];out[o+3]=255;continue;}
  const ix=Math.min(w-2,Math.floor(x)),iy=Math.min(h-2,Math.floor(y)),fx=x-ix,fy=y-iy;for(let k=0;k<3;k++){const i00=(iy*w+ix)*4+k;out[o+k]=(img.data[i00]*(1-fx)+img.data[i00+4]*fx)*(1-fy)+(img.data[i00+w*4]*(1-fx)+img.data[i00+w*4+4]*fx)*fy;}out[o+3]=255;om[Y*W+X]=mask[Math.round(y)*w+Math.round(x)];}
 return {img:{data:out,w:W,h:H},mask:{m:om,w:W,h:H}};}
// Açılı çekilmiş yuvarlak logo: en büyük halka bileşeni elips görünür. İkinci momentlerden elipsi bulup daireye çeviren dönüşüm.
function ellipseToCircle(m,w,h){const {lab,comps}=components(m,w,h);let ink=0,x0=w,y0=h,x1=0,y1=0;for(let i=0;i<w*h;i++)if(m[i]){ink++;const x=i%w,y=(i/w)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
 const ring=comps.filter(c=>{const bw=c.box[2]-c.box[0],bh=c.box[3]-c.box[1];return bw>=(x1-x0)*.6&&bh>=(y1-y0)*.6&&c.n/(bw*bh)<.25;}).sort((a,b)=>b.n-a.n)[0];if(!ring)return null;
 // Elips oturtma (cebirsel, a+c=1): kesintili halkada (yazı/simge kesiyor) momentlerden daha doğru
 const pts=[];for(let i=0;i<w*h;i+=1)if(lab[i]===ring.id)pts.push([i%w,(i/w)|0]);if(pts.length<30)return null;
 let mx=0,my=0;for(const p of pts){mx+=p[0];my+=p[1];}mx/=pts.length;my/=pts.length;const sc2=Math.max(x1-x0,y1-y0)/2;
 // bilinmeyenler [a,b,d,e,f] ; c=1-a : a(x²-y²)+bxy+dx+ey+f = -y²
 const N=[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],R=[0,0,0,0,0];
 for(let k=0;k<pts.length;k+=Math.max(1,Math.floor(pts.length/4000))){const x=(pts[k][0]-mx)/sc2,y=(pts[k][1]-my)/sc2,row=[x*x-y*y,x*y,x,y,1],t=-y*y;for(let i=0;i<5;i++){R[i]+=row[i]*t;for(let j=0;j<5;j++)N[i][j]+=row[i]*row[j];}}
 for(let i=0;i<5;i++){let p=i;for(let r=i+1;r<5;r++)if(Math.abs(N[r][i])>Math.abs(N[p][i]))p=r;[N[i],N[p]]=[N[p],N[i]];[R[i],R[p]]=[R[p],R[i]];if(Math.abs(N[i][i])<1e-12)return null;for(let r=i+1;r<5;r++){const f=N[r][i]/N[i][i];for(let c2=i;c2<5;c2++)N[r][c2]-=f*N[i][c2];R[r]-=f*R[i];}}
 const sol=[0,0,0,0,0];for(let i=4;i>=0;i--){let t=R[i];for(let j=i+1;j<5;j++)t-=N[i][j]*sol[j];sol[i]=t/N[i][i];}
 const A=sol[0],B=sol[1],C=1-A;if(4*A*C-B*B<=0)return null; // elips değil
 const tr=A+C,dt=A*C-B*B/4,e1=tr/2+Math.sqrt(Math.max(0,tr*tr/4-dt)),e2=tr/2-Math.sqrt(Math.max(0,tr*tr/4-dt));if(e2<=0)return null;
 // konik matrisin özdeğerleri: büyük özdeğer → kısa eksen. Oran = sqrt(e1/e2)
 const ratio=Math.sqrt(e1/e2);if(ratio<1.02||ratio>1.8)return null;
 // kısa eksen doğrultusu = büyük özdeğerin özvektörü
 const th=.5*Math.atan2(B,A-C)+Math.PI/2,c=Math.cos(th),s=Math.sin(th),k=ratio;
 return [c*c+k*s*s,(1-k)*c*s,(1-k)*c*s,s*s+k*c*c];}
// ---------- karşıdan görünüm (logonun kendi geometrisiyle perspektif düzeltme) ----------
// Gerçekte paralel olan çizgiler fotoğrafta bir kaçış noktasında birleşir:
//  yatay: harf satırlarının taban ve üst çizgileri; dikey: harflerin dik gövdeleri. Yuvarlak çember gerçekte dairedir.
// İki kaçış noktası → kaçış doğrusu sonsuza gönderilir (izdüşüm düzeltmesi); ardından yönler dik, çember yuvarlak yapılır.
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const lineThrough=(p,q)=>cross([p[0],p[1],1],[q[0],q[1],1]);
function fitLine(P){const n=P.length,mx=P.reduce((a,p)=>a+p[0],0)/n,my=P.reduce((a,p)=>a+p[1],0)/n;let sxx=0,syy=0,sxy=0;for(const [x,y] of P){sxx+=(x-mx)**2;syy+=(y-my)**2;sxy+=(x-mx)*(y-my);}
 const th=.5*Math.atan2(2*sxy,sxx-syy),dx=Math.cos(th),dy=Math.sin(th);const res=P.map(([x,y])=>Math.abs((x-mx)*dy-(y-my)*dx));return {p:[mx,my],d:[dx,dy],res:res.reduce((a,b)=>a+b,0)/n};}
function robustLine(P){if(P.length<3)return null;let f=fitLine(P);const r=P.map(([x,y])=>Math.abs((x-f.p[0])*f.d[1]-(y-f.p[1])*f.d[0])).sort((a,b)=>a-b),tol=Math.max(1.5,r[Math.floor(r.length*.6)]*1.6);const inl=P.filter(([x,y])=>Math.abs((x-f.p[0])*f.d[1]-(y-f.p[1])*f.d[0])<=tol);if(inl.length>=3)f=fitLine(inl);f.n=inl.length;return f;}
// Kaçış noktası: doğruların en küçük kareler kesişimi (homojen; sonsuzdaysa w≈0)
function vanishing(lines){if(lines.length<2)return null;let a=0,b=0,c=0,d=0,e=0,f=0,g=0,h=0,k=0;
 // M = Σ l lᵀ (l normalleştirilmiş); en küçük özdeğerin özvektörü
 for(const L of lines){const n=Math.hypot(L.l[0],L.l[1])||1,x=L.l[0]/n,y=L.l[1]/n,z=L.l[2]/n,wt=L.w;a+=wt*x*x;b+=wt*x*y;c+=wt*x*z;e+=wt*y*y;f+=wt*y*z;k+=wt*z*z;}
 const M=[[a,b,c],[b,e,f],[c,f,k]];let v=[0,0,1];
 // ters yineleme
 const inv=m=>{const det=m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);if(Math.abs(det)<1e-18)return null;
  return [[(m[1][1]*m[2][2]-m[1][2]*m[2][1])/det,(m[0][2]*m[2][1]-m[0][1]*m[2][2])/det,(m[0][1]*m[1][2]-m[0][2]*m[1][1])/det],[(m[1][2]*m[2][0]-m[1][0]*m[2][2])/det,(m[0][0]*m[2][2]-m[0][2]*m[2][0])/det,(m[0][2]*m[1][0]-m[0][0]*m[1][2])/det],[(m[1][0]*m[2][1]-m[1][1]*m[2][0])/det,(m[0][1]*m[2][0]-m[0][0]*m[2][1])/det,(m[0][0]*m[1][1]-m[0][1]*m[1][0])/det]];};
 const reg=1e-9,Mi=inv([[M[0][0]+reg,M[0][1],M[0][2]],[M[1][0],M[1][1]+reg,M[1][2]],[M[2][0],M[2][1],M[2][2]+reg]]);if(!Mi)return null;
 for(let it=0;it<30;it++){const u=[0,1,2].map(i=>Mi[i][0]*v[0]+Mi[i][1]*v[1]+Mi[i][2]*v[2]),n=Math.hypot(...u)||1;v=u.map(t=>t/n);}return v;}
// Harf satırlarından yatay doğrular (taban + üst çizgi), dik gövdelerden dikey doğrular
// Dayanıklı kaçış noktası: çizgi çiftlerinin kesişimleri arasında, en çok çizginin (açısal tolerans içinde) geçtiği nokta
function vanishingRansac(lines,tolDeg=1.5){if(lines.length<2)return null;let best=null;
 const passes=(v,L)=>{const p=L.p||null,d=L.d;if(!p)return false;// v homojen: p'den v'ye doğrultu ile d arasındaki açı
  const dir=Math.abs(v[2])<1e-12?[v[0],v[1]]:[v[0]/v[2]-p[0],v[1]/v[2]-p[1]],n=Math.hypot(dir[0],dir[1])||1,c=Math.abs((dir[0]*d[0]+dir[1]*d[1])/n);return Math.acos(Math.min(1,c))*180/Math.PI<=tolDeg;};
 for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){const v=cross(lines[i].l,lines[j].l),n=Math.hypot(...v)||1,vn=v.map(t=>t/n);const inl=lines.filter(L=>passes(vn,L));const wt=inl.reduce((a,L)=>a+L.w,0);if(!best||wt>best.wt)best={wt,inl};}
 if(!best||best.inl.length<Math.min(3,lines.length))return null;return vanishing(best.inl);}
function textGeometry(m,w,h){
 const {lab,comps}=components(m,w,h),H=[],V=[];
 for(const l of glyphLines(m,w,h)){if(l.count<3)continue;const [x0,y0,x1,y1]=l.box,cs=comps.filter(c=>c.box[0]>=x0&&c.box[2]<=x1&&c.box[1]>=y0&&c.box[3]<=y1&&c.box[3]-c.box[1]>=l.height*.55);
  if(cs.length<3)continue;const hs=cs.map(c=>c.box[3]-c.box[1]).sort((a,b)=>a-b),med=hs[hs.length>>1],tall=cs.filter(c=>c.box[3]-c.box[1]>=med*.85);
  const base=robustLine(cs.map(c=>[(c.box[0]+c.box[2])/2,c.box[3]])),top=robustLine(tall.map(c=>[(c.box[0]+c.box[2])/2,c.box[1]]));const len=x1-x0;
  for(const f of [base,top])if(f&&f.n>=3&&f.res<l.height*.12)H.push({l:lineThrough(f.p,[f.p[0]+f.d[0],f.p[1]+f.d[1]]),w:len*f.n,d:f.d,p:f.p});
  // dik gövdeler: harf içinde yaklaşık dikey koşular (her satırda en uzun mürekkep sütunu dizisi), çizgi oturtma
  for(const c of tall){const [bx0,by0,bx1,by1]=c.box,bh=by1-by0;let best=null;
   for(let x=bx0;x<bx1;x++){let run=0;for(let y=by0;y<by1;y++)if(lab[y*w+x]===c.id)run++;if(!best||run>best.run)best={x,run};}
   if(!best||best.run<bh*.75)continue;const P=[];for(let y=by0;y<by1;y++){let xs=[];for(let x=Math.max(bx0,best.x-Math.round(bh*.35));x<=Math.min(bx1-1,best.x+Math.round(bh*.35));x++)if(lab[y*w+x]===c.id)xs.push(x);if(!xs.length)continue;
    // gövdeye en yakın koşunun ortası
    let runs=[],s0=xs[0],pr=xs[0];for(const x of xs.slice(1)){if(x!==pr+1){runs.push([s0,pr]);s0=x;}pr=x;}runs.push([s0,pr]);const r=runs.reduce((b,r)=>Math.abs((r[0]+r[1])/2-best.x)<Math.abs((b[0]+b[1])/2-best.x)?r:b,runs[0]);if(r[1]-r[0]<bh*.35)P.push([(r[0]+r[1])/2,y]);}
   const f=P.length>=bh*.6?robustLine(P):null;if(f&&Math.abs(f.d[1])>.966&&f.res<1.5)V.push({l:lineThrough(f.p,[f.p[0]+f.d[0],f.p[1]+f.d[1]]),w:bh,d:f.d,p:f.p});}}
 return {H,V};}
function homApply(Hm,x,y){const d=Hm[6]*x+Hm[7]*y+Hm[8];return [(Hm[0]*x+Hm[1]*y+Hm[2])/d,(Hm[3]*x+Hm[4]*y+Hm[5])/d];}
function warpHom(img,mask,Hm){ // Hm: kaynak→hedef 3×3; hedef kutusu kaynak köşelerinden
 const {w,h}=img,cs=[[0,0],[w,0],[0,h],[w,h]].map(([x,y])=>homApply(Hm,x,y));if(cs.some(p=>!isFinite(p[0])||!isFinite(p[1])))return null;
 const x0=Math.min(...cs.map(p=>p[0])),y0=Math.min(...cs.map(p=>p[1])),W=Math.ceil(Math.max(...cs.map(p=>p[0]))-x0),H=Math.ceil(Math.max(...cs.map(p=>p[1]))-y0);if(W<8||H<8||W*H>9e6)return null;
 const a=Hm,det=a[0]*(a[4]*a[8]-a[5]*a[7])-a[1]*(a[3]*a[8]-a[5]*a[6])+a[2]*(a[3]*a[7]-a[4]*a[6]);if(Math.abs(det)<1e-12)return null;
 const I=[(a[4]*a[8]-a[5]*a[7])/det,(a[2]*a[7]-a[1]*a[8])/det,(a[1]*a[5]-a[2]*a[4])/det,(a[5]*a[6]-a[3]*a[8])/det,(a[0]*a[8]-a[2]*a[6])/det,(a[2]*a[3]-a[0]*a[5])/det,(a[3]*a[7]-a[4]*a[6])/det,(a[1]*a[6]-a[0]*a[7])/det,(a[0]*a[4]-a[1]*a[3])/det];
 const out=new Uint8ClampedArray(W*H*4),om=new Uint8Array(W*H),bg=[img.data[0],img.data[1],img.data[2]];
 for(let Y=0;Y<H;Y++)for(let X=0;X<W;X++){const [x,y]=homApply(I,X+x0,Y+y0),o=(Y*W+X)*4;if(!(x>=0&&y>=0&&x<=w-1&&y<=h-1)){out[o]=bg[0];out[o+1]=bg[1];out[o+2]=bg[2];out[o+3]=255;continue;}
  const ix=Math.min(w-2,Math.floor(x)),iy=Math.min(h-2,Math.floor(y)),fx=x-ix,fy=y-iy;for(let k=0;k<3;k++){const i00=(iy*w+ix)*4+k;out[o+k]=(img.data[i00]*(1-fx)+img.data[i00+4]*fx)*(1-fy)+(img.data[i00+w*4]*(1-fx)+img.data[i00+w*4+4]*fx)*fy;}out[o+3]=255;om[Y*W+X]=mask[Math.round(y)*w+Math.round(x)];}
 return {img:{data:out,w:W,h:H},mask:{m:om,w:W,h:H}};}
// Düzlük ölçüsü: satırların açısı (derece), gövdelerin dikeyden sapması, çember en/boy oranı
function frontalMetrics(m,w,h){const {H:hl,V:vl}=textGeometry(m,w,h);const ang=L=>Math.abs(Math.atan2(L.d[1],L.d[0])*180/Math.PI);
 const hA=hl.length?hl.map(L=>{const a=ang(L);return Math.min(a,180-a);}).sort((a,b)=>a-b):[];const vA=vl.length?vl.map(L=>{const a=ang(L);return Math.abs(90-a);}).sort((a,b)=>a-b):[];
 const E=ellipseToCircle(m,w,h);let ring=1;if(E){const k=Math.max(E[0]+E[3]-1,1);ring=1/Math.max(1,(E[0]+E[3])-1);} // E≈özdeş ise 1
 const med=a=>a.length?a[a.length>>1]:0;return {horizontal:med(hA),vertical:med(vA),nH:hA.length,nV:vA.length,ringMatrix:E};}
// Karşıdan görünüm: tek bir dönüşüm (izdüşüm a,b + kayma k + en/boy s) logonun kendi kısıtlarını birlikte sağlayacak şekilde aranır:
//  her satırın taban ve üst çizgisi paralel; dik gövdeler tabana dik; çember tam daire. Hesap noktalar üzerinde yapılır.
function collectFeatures(m,w,h){
 const {lab,comps}=components(m,w,h),lines=[],stems=[];
 for(const l of glyphLines(m,w,h)){if(l.count<3)continue;const [x0,y0,x1,y1]=l.box,cs=comps.filter(c=>c.box[0]>=x0&&c.box[2]<=x1&&c.box[1]>=y0&&c.box[3]<=y1&&c.box[3]-c.box[1]>=l.height*.55);if(cs.length<3)continue;
  const hs=cs.map(c=>c.box[3]-c.box[1]).sort((a,b)=>a-b),med=hs[hs.length>>1],tall=cs.filter(c=>c.box[3]-c.box[1]>=med*.85&&c.box[3]-c.box[1]<=med*1.2);
  // her harfin alt ve üst kenar noktaları (sütun bazında en alt/en üst mürekkep, kenarlardan %20 içeride)
  // harf başına bir taban ve bir üst nokta: yerel olarak en alt/en üst mürekkep (harfin %15–85 genişliği içinde)
  const base=[],top=[];for(const c of tall){const [bx0,by0,bx1,by1]=c.box,ix0=Math.round(bx0+(bx1-bx0)*.15),ix1=Math.round(bx1-(bx1-bx0)*.15);let tb=null,bb=null;
   for(let x=ix0;x<=ix1;x++){for(let y=by0;y<by1;y++)if(lab[y*w+x]===c.id){if(!tb||y<tb[1])tb=[x,y];break;}for(let y=by1-1;y>=by0;y--)if(lab[y*w+x]===c.id){if(!bb||y>bb[1])bb=[x,y];break;}}
   if(tb&&bb){top.push(tb);base.push(bb);}}
  if(base.length>=3)lines.push({base,top,weight:(x1-x0)*tall.length});
  for(const c of tall){const [bx0,by0,bx1,by1]=c.box,bh=by1-by0;let best=null;for(let x=bx0;x<bx1;x++){let run=0;for(let y=by0;y<by1;y++)if(lab[y*w+x]===c.id)run++;if(!best||run>best.run)best={x,run};}
   if(!best||best.run<bh*.8)continue;const P=[];for(let y=by0+Math.round(bh*.1);y<by1-Math.round(bh*.1);y++){const xs=[];for(let x=Math.max(bx0,best.x-Math.round(bh*.3));x<=Math.min(bx1-1,best.x+Math.round(bh*.3));x++)if(lab[y*w+x]===c.id)xs.push(x);if(!xs.length)continue;
    let runs=[],s0=xs[0],pr=xs[0];for(const x of xs.slice(1)){if(x!==pr+1){runs.push([s0,pr]);s0=x;}pr=x;}runs.push([s0,pr]);const r=runs.reduce((b,r)=>Math.abs((r[0]+r[1])/2-best.x)<Math.abs((b[0]+b[1])/2-best.x)?r:b,runs[0]);if(r[1]-r[0]<bh*.3)P.push([(r[0]+r[1])/2,y]);}
   if(P.length>=bh*.5){const f=fitLine(P);if(Math.abs(f.d[1])>.966&&f.res<1.2)stems.push({pts:P,weight:bh});}}}
 // çember: büyük, seyrek bileşen
 let x0=w,y0=h,x1=0,y1=0;for(let i=0;i<w*h;i++)if(m[i]){const x=i%w,y=(i/w)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
 // çember: tek parça ya da yazı/simgeyle bölünmüş yaylar. İnce, büyük, eğri bileşenlerin hepsi birlikte; logo kutusunun
 // kenarlarına değen yaylar. Bir elips oturuyor ve noktaların çoğu ona yakınsa çember kabul edilir.
 const arcs=comps.filter(c=>{const bw=c.box[2]-c.box[0],bh=c.box[3]-c.box[1];return (bw>=(x1-x0)*.35||bh>=(y1-y0)*.35)&&c.n/(bw*bh)<.25&&c.n>=20;});
 let ring=null;if(arcs.length){const ids=new Set(arcs.map(c=>c.id)),tot=arcs.reduce((a,c)=>a+c.n,0),step=Math.max(1,Math.floor(tot/2000));ring=[];let k=0;for(let i=0;i<w*h;i++)if(ids.has(lab[i])&&(k++%step===0))ring.push([i%w,(i/w)|0]);
  let rx0=w,ry0=h,rx1=0,ry1=0;for(const [x,y] of ring){if(x<rx0)rx0=x;if(x>rx1)rx1=x;if(y<ry0)ry0=y;if(y>ry1)ry1=y;}
  if(rx1-rx0<(x1-x0)*.7||ry1-ry0<(y1-y0)*.7||!conicRatio(ring))ring=null;}
 return {lines,stems,ring,box:[x0,y0,x1,y1]};}
function conicRatio(P){ // cebirsel elips oturtma; eksen oranı (≥1) ya da null
 let mx=0,my=0;for(const p of P){mx+=p[0];my+=p[1];}mx/=P.length;my/=P.length;let sc=0;for(const p of P)sc=Math.max(sc,Math.abs(p[0]-mx),Math.abs(p[1]-my));sc=sc||1;
 const N=[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],R=[0,0,0,0,0];
 for(const p of P){const x=(p[0]-mx)/sc,y=(p[1]-my)/sc,row=[x*x-y*y,x*y,x,y,1],t=-y*y;for(let i=0;i<5;i++){R[i]+=row[i]*t;for(let j=0;j<5;j++)N[i][j]+=row[i]*row[j];}}
 for(let i=0;i<5;i++){let p=i;for(let r=i+1;r<5;r++)if(Math.abs(N[r][i])>Math.abs(N[p][i]))p=r;[N[i],N[p]]=[N[p],N[i]];[R[i],R[p]]=[R[p],R[i]];if(Math.abs(N[i][i])<1e-12)return null;for(let r=i+1;r<5;r++){const f=N[r][i]/N[i][i];for(let c=i;c<5;c++)N[r][c]-=f*N[i][c];R[r]-=f*R[i];}}
 const s=[0,0,0,0,0];for(let i=4;i>=0;i--){let t=R[i];for(let j=i+1;j<5;j++)t-=N[i][j]*s[j];s[i]=t/N[i][i];}
 const A=s[0],B=s[1],C=1-A;if(4*A*C-B*B<=0)return null;const tr=A+C,dt=A*C-B*B/4,e1=tr/2+Math.sqrt(Math.max(0,tr*tr/4-dt)),e2=tr/2-Math.sqrt(Math.max(0,tr*tr/4-dt));return e2>0?Math.sqrt(e1/e2):null;}
function frontalTransform(F,w,h){
 const cx=(F.box[0]+F.box[2])/2,cy=(F.box[1]+F.box[3])/2,sc=Math.max(F.box[2]-F.box[0],F.box[3]-F.box[1])/2||1;
 const T=(p,q)=>{const x=(p[0]-cx)/sc,y=(p[1]-cy)/sc,d=q[0]*x+q[1]*y+1;return [((1+q[3])*x+q[2]*y)/d,y/d];};
 const ang=P=>{const f=fitLine(P);let a=Math.atan2(f.d[1],f.d[0]);if(a>Math.PI/2)a-=Math.PI;if(a<-Math.PI/2)a+=Math.PI;return a;};
 const wrap=a=>{while(a>Math.PI/2)a-=Math.PI;while(a<-Math.PI/2)a+=Math.PI;return a;};
 const cost=q=>{if(Math.abs(q[0])>.5||Math.abs(q[1])>.5||Math.abs(q[2])>.6||Math.abs(q[3])>.6)return 1e9;let e=0,wt=0,baseAng=0,bw=0;
  for(const L of F.lines){const b=ang(L.base.map(p=>T(p,q))),t=ang(L.top.map(p=>T(p,q)));e+=L.weight*wrap(b-t)**2*4;wt+=L.weight;baseAng+=b*L.weight;bw+=L.weight;}
  baseAng=bw?baseAng/bw:0;
  // tüm taban/üst çizgileri birbirine paralel
  for(const L of F.lines){const b=ang(L.base.map(p=>T(p,q))),t=ang(L.top.map(p=>T(p,q)));e+=L.weight*(wrap(b-baseAng)**2+wrap(t-baseAng)**2);}
  // gövdeler tabana dik ve birbirine paralel
  for(const S of F.stems){const a=ang(S.pts.map(p=>T(p,q)));e+=S.weight*wrap(a-baseAng-Math.PI/2)**2*2;wt+=S.weight;}
  if(F.ring){const r=conicRatio(F.ring.map(p=>T(p,q)));if(r)e+=(wt||1)*(r-1)**2*2;else e+=(wt||1)*1;}
  // izdüşüm gücü fiziksel sınırda tutulur: yalnız kanıt gerektiriyorsa büyür
  // en/boy ve kayma yalnız çember/gövde kanıtıyla değişir; kanıt yoksa korunur
  return e/(wt||1)+.02*(q[0]*q[0]+q[1]*q[1])+(F.ring?.01:2)*q[3]*q[3]+(F.stems.length>=3||F.ring?.01:2)*q[2]*q[2];};
 // Nelder-Mead (4 parametre)
 const runNM=start=>{let simplex=[start];for(let i=0;i<4;i++){const v=start.slice();v[i]+=.08;simplex.push(v);}let vals=simplex.map(cost);
 for(let it=0;it<300;it++){const idx=vals.map((v,i)=>i).sort((a,b)=>vals[a]-vals[b]);simplex=idx.map(i=>simplex[i]);vals=idx.map(i=>vals[i]);
  const c=[0,1,2,3].map(k=>simplex.slice(0,4).reduce((a,v)=>a+v[k],0)/4),wv=simplex[4],refl=c.map((v,k)=>v+(v-wv[k])),fr=cost(refl);
  if(fr<vals[0]){const ex=c.map((v,k)=>v+2*(v-wv[k])),fe=cost(ex);if(fe<fr){simplex[4]=ex;vals[4]=fe;}else{simplex[4]=refl;vals[4]=fr;}}
  else if(fr<vals[3]){simplex[4]=refl;vals[4]=fr;}
  else{const co=c.map((v,k)=>v+.5*(wv[k]-v)),fc=cost(co);if(fc<vals[4]){simplex[4]=co;vals[4]=fc;}else{for(let i=1;i<5;i++){simplex[i]=simplex[i].map((v,k)=>simplex[0][k]+.5*(v-simplex[0][k]));vals[i]=cost(simplex[i]);}}}
  if(Math.abs(vals[4]-vals[0])<1e-12)break;}
 return {x:simplex[0],v:vals[0]};};
 let bestR=null;for(const st of [[0,0,0,0],[.25,0,0,0],[-.25,0,0,0],[0,.25,0,0],[0,-.25,0,0],[.2,.2,0,0],[-.2,.2,0,0],[.2,-.2,0,0],[-.2,-.2,0,0]]){let r=runNM(st);r=runNM(r.x);if(!bestR||r.v<bestR.v)bestR=r;}
 const best=bestR.x,c0=cost([0,0,0,0]),c1=bestR.v;
 // taban açısı (döndürme) ve görüntü dönüşümü: normalize → q → döndür → geri ölçekle
 let baseAng=0,bw=0;for(const L of F.lines){baseAng+=ang(L.base.map(p=>T(p,best)))*L.weight;bw+=L.weight;}baseAng=bw?baseAng/bw:0;const cr=Math.cos(-baseAng),sr=Math.sin(-baseAng);
 // H = S⁻¹ · R · Q · S (S: normalize)
 const Q=[1+best[3],best[2],0,0,1,0,best[0],best[1],1],Rm=[cr,-sr,0,sr,cr,0,0,0,1],Sn=[1/sc,0,-cx/sc,0,1/sc,-cy/sc,0,0,1],Si=[sc,0,cx,0,sc,cy,0,0,1];
 const mul=(A,B)=>[0,1,2].flatMap(i=>[0,1,2].map(j=>A[i*3]*B[j]+A[i*3+1]*B[3+j]+A[i*3+2]*B[6+j]));
 return {H:mul(Si,mul(Rm,mul(Q,Sn))),params:best,cost0:c0,cost1:c1};}
function frontalize(img,mask){
 const F=collectFeatures(mask.m,mask.w,mask.h);globalThis.__fz={lines:F.lines.length,stems:F.stems.length,ring:!!F.ring,ringRatio:F.ring?conicRatio(F.ring):null};if(!F.lines.length)return null;const t=frontalTransform(F,mask.w,mask.h);globalThis.__fz.t={p:t.params,c0:t.cost0,c1:t.cost1};
 if(!(t.cost1<t.cost0*.9))return null;const res=warpHom(img,mask.m,t.H);if(!res)return null;{let a0=0,a1=0;for(const v of mask.m)a0+=v;for(const v of res.mask.m)a1+=v;if(a1<a0*.25||a1>a0*4)return null;}
 // yön korunmalı: dönüşüm logonun "yukarısını" aşağı çevirdiyse 180° döndür (izdüşümde işaret değişimi olabilir)
 {let cx=0,cy=0,n=0;for(let i=0;i<mask.m.length;i++)if(mask.m[i]){cx+=i%mask.w;cy+=(i/mask.w)|0;n++;}cx/=n;cy/=n;const p0=homApply(t.H,cx,cy),p1=homApply(t.H,cx,cy-20);
  if(p1[1]>p0[1]){const r=rotateRGBA(res.img,2),m2=rotateMask(res.mask.m,res.mask.w,res.mask.h,2);return {img:r,mask:m2,params:t.params,cost:[t.cost0,t.cost1],flipped:true};}}return {...res,params:t.params,cost:[t.cost0,t.cost1]};}
// Adaylar: (1) karşıdan görünüm, (2) eski elips+döndürme, (3) olduğu gibi. Düzlük ölçüsü en iyi olan seçilir.
function frontalChoose(img0,mmA){const cands=[];const score=r=>{const f=frontalMetrics(r.mask.m,r.mask.w,r.mask.h);const E=ellipseToCircle(r.mask.m,r.mask.w,r.mask.h);let ringErr=0;{const F2=collectFeatures(r.mask.m,r.mask.w,r.mask.h);if(F2.ring){const rr=conicRatio(F2.ring);ringErr=rr?rr-1:0;}}const ar=r.img.w/r.img.h;return {f,val:(f.nH===0||ar>6||ar<1/6||r.img.w*r.img.h<2e4)?1e9:f.horizontal+(f.nV>=2?f.vertical:2)+ringErr*40};};
 cands.push({img:img0,mask:mmA,kind:'none'});
 const E=ellipseToCircle(mmA.m,mmA.w,mmA.h),circ=E?affineBy(img0,mmA.m,E):{img:img0,mask:mmA},skew=baselineAngle(circ.mask.m,circ.mask.w,circ.mask.h),d=Math.abs(skew)>.006&&Math.abs(skew)<.35?rotateBy(circ.img,circ.mask.m,-skew):null;cands.push({img:d?d.img:circ.img,mask:d?d.mask:circ.mask,kind:'affine'});
 try{const fr=frontalize(img0,mmA);if(fr)cands.push({img:fr.img,mask:fr.mask,kind:'frontal'});}catch{}
 for(const c of cands)c.s=score(c);cands.sort((a,b)=>a.s.val-b.s.val);globalThis.__frontal=cands.map(c=>({kind:c.kind,val:+c.s.val.toFixed(2),h:+c.s.f.horizontal.toFixed(2),v:+c.s.f.vertical.toFixed(2),nV:c.s.f.nV}));return cands[0];}
function rotateBy(img,mask,angle){ // img: RGBA, mask: 0/1; açı radyan (pozitif: saat yönü düzeltmesi)
 const {w,h}=img,c=Math.cos(angle),s=Math.sin(angle),W=Math.ceil(Math.abs(w*c)+Math.abs(h*s)),H=Math.ceil(Math.abs(w*s)+Math.abs(h*c)),cx=w/2,cy=h/2,CX=W/2,CY=H/2;
 const out=new Uint8ClampedArray(W*H*4),om=new Uint8Array(W*H),bg=[img.data[0],img.data[1],img.data[2]];
 for(let Y=0;Y<H;Y++)for(let X=0;X<W;X++){const dx=X-CX,dy=Y-CY,x=c*dx+s*dy+cx,y=-s*dx+c*dy+cy,o=(Y*W+X)*4;
  if(x<0||y<0||x>w-1||y>h-1){out[o]=bg[0];out[o+1]=bg[1];out[o+2]=bg[2];out[o+3]=255;continue;}
  const ix=Math.min(w-2,Math.floor(x)),iy=Math.min(h-2,Math.floor(y)),fx=x-ix,fy=y-iy;for(let k=0;k<3;k++){const i00=(iy*w+ix)*4+k;out[o+k]=(img.data[i00]*(1-fx)+img.data[i00+4]*fx)*(1-fy)+(img.data[i00+w*4]*(1-fx)+img.data[i00+w*4+4]*fx)*fy;}out[o+3]=255;
  om[Y*W+X]=mask[Math.round(y)*w+Math.round(x)];}
 return {img:{data:out,w:W,h:H},mask:{m:om,w:W,h:H}};}
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
function renderClean(img,m,surface,pal,minLong=2000,opaqueGround=false,solid=null){
 let x0=img.w,y0=img.h,x1=0,y1=0;for(let y=0;y<img.h;y++)for(let x=0;x<img.w;x++)if(m[y*img.w+x]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
 if(x1<x0)return null;const pad=Math.round(Math.max(x1-x0,y1-y0)*.03);x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(img.w-1,x1+pad);y1=Math.min(img.h-1,y1+pad);
 const cw=x1-x0+1,ch=y1-y0+1,scale=Math.max(1,minLong/Math.max(cw,ch)),W=Math.round(cw*scale),H=Math.round(ch*scale),S=toLab(...surface),rgbPal=pal.map(labToRgb);
 // kaynak çözünürlükte: alfa ve renk etiketi (yalnız temizlenmiş maskenin yakınında)
 const ownD=new Float32Array((x1-x0+1)*(y1-y0+1)).fill(1e9),cS=new Float32Array((x1-x0+1)*(y1-y0+1)),near=boxDilate(closeMask(m,img.w,img.h,2),img.w,img.h,2),alpha=new Float32Array(cw*ch),label=new Uint8Array(cw*ch);
 for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const i=(y+y0)*img.w+(x+x0),j=i*4;if(!near[i])continue;const c=toLab(img.data[j],img.data[j+1],img.data[j+2]),dS=d3(c,S);let b=0,bd=1e9;pal.forEach((p,k)=>{const d=d3(c,p);if(d<bd){bd=d;b=k;}});
  // renkli (ince altın çizgi gibi) mürekkepte daha erken tam opaklık: soluk ince çizgiler kopmasın
  ownD[y*cw+x]=bd;cS[y*cw+x]=dS;const chroma=Math.hypot(pal[b][1],pal[b][2])>12,lo=chroma?8:12,span=Math.max(8,d3(pal[b],S)-lo)*(chroma?.65:1);alpha[y*cw+x]=Math.max(0,Math.min(1,(dS-lo)/span));if(solid&&solid[i])alpha[y*cw+x]=Math.max(alpha[y*cw+x],.95);label[y*cw+x]=b;}
 // İnce soluk çizgiler (altıgen çerçevesi gibi): karşıtlığın enine yerel tepe yaptığı orta hat pikselleri güçlendirilir.
 // Kalın harflerin kenarı tepe değildir (karşıtlık içe doğru artar), bu yüzden harfler kalınlaşmaz.
 const ridge=new Uint8Array(cw*ch);
 for(let y=1;y<ch-1;y++)for(let x=1;x<cw-1;x++){const i=y*cw+x,c=cS[i];if(alpha[i]<.12||alpha[i]>=.7)continue;
  const pk=(a,b)=>c>=cS[a]&&c>=cS[b]&&c>Math.max(cS[a],cS[b])*0+Math.min(cS[a],cS[b])+5;
  if(pk(i-1,i+1)||pk(i-cw,i+cw)||pk(i-cw-1,i+cw+1)||pk(i-cw+1,i+cw-1)){ridge[i]=1;}}
 for(let i=0;i<cw*ch;i++)if(ridge[i])alpha[i]=Math.max(alpha[i],.8);
 // Renk etiketi yalnız çekirdek (kenardan uzak) piksellerden alınır; kenar pikselleri en yakın çekirdeğin rengini alır.
 // Böylece koyu harflerin kenarında ikinci renkten (ör. altın) hale oluşmaz.
 {const core=new Uint8Array(cw*ch),q=new Int32Array(cw*ch);let head=0,tail=0;const lab2=new Int16Array(cw*ch).fill(-1);
  for(let y=1;y<ch-1;y++)for(let x=1;x<cw-1;x++){const i=y*cw+x;if(alpha[i]<.85)continue;if(solid&&solid[(y+y0)*img.w+(x+x0)])continue;if(alpha[i-1]<.85||alpha[i+1]<.85||alpha[i-cw]<.85||alpha[i+cw]<.85)continue;const j=((y+y0)*img.w+(x+x0))*4,c=toLab(img.data[j],img.data[j+1],img.data[j+2]);let b=0,bd=1e9;pal.forEach((p,k)=>{const d=d3(c,p);if(d<bd){bd=d;b=k;}});lab2[i]=b;q[tail++]=i;}
  if(tail){while(head<tail){const i=q[head++],x=i%cw,y=(i/cw)|0;for(const n of [x>0?i-1:-1,x<cw-1?i+1:-1,y>0?i-cw:-1,y<ch-1?i+cw:-1])if(n>=0&&lab2[n]<0&&alpha[n]>0){lab2[n]=lab2[i];q[tail++]=n;}}// ince koyu çizgiler (ör. altıgen çerçevesi) kendi rengini korur: pikselin kendi rengi en koyu mürekkepse ve ona çok yakınsa.
  // Koyu harf kenarındaki karışık pikseller (açık renge benzeyen) yine çekirdekten renk alır; hale oluşmaz.
  const darkest=pal.reduce((b,p,k)=>p[0]<pal[b][0]?k:b,0);
  for(let i=0;i<cw*ch;i++)if(lab2[i]>=0&&(solid&&solid[((i/cw)|0)+y0]!==undefined&&solid[(((i/cw)|0)+y0)*img.w+(i%cw)+x0]||!(label[i]===darkest&&((ownD[i]<16&&alpha[i]>=.5)||ridge[i]))))label[i]=lab2[i];}}
 // Vektörleştirme (vector-trace.js varsa): her renk katmanı izlenip düz çizgi/eğriye çevrilir ve bu eğrilerden çizilir
 const VT=typeof module!=='undefined'&&module.exports?(()=>{try{return require('./vector-trace.js');}catch{return null;}})():root.VectorTrace;
 if(VT){try{const f=2,fw=cw*f,fh=ch*f,cubv=t=>{t=Math.abs(t);return t<1?1.5*t*t*t-2.5*t*t+1:t<2?-.5*t*t*t+2.5*t*t-4*t+2:0;};const layers=[];
   for(let k=0;k<pal.length;k++){const src=new Float32Array(cw*ch);let any=0;for(let i=0;i<cw*ch;i++)if(label[i]===k&&alpha[i]>0){src[i]=alpha[i];any++;}if(any<8)continue;
    // kenar pikselleri komşu katmanla paylaşılır: alfa, bu katmanın etiketiyle sınırlanır
    const F=new Float32Array(fw*fh);for(let Y=0;Y<fh;Y++){const fy=(Y+.5)/f-.5,iy=Math.floor(fy);for(let X=0;X<fw;X++){const fx=(X+.5)/f-.5,ix=Math.floor(fx);let v=0,ws=0;for(let m2=-1;m2<=2;m2++){const yy=Math.min(ch-1,Math.max(0,iy+m2)),wy=cubv(fy-(iy+m2));for(let n2=-1;n2<=2;n2++){const xx=Math.min(cw-1,Math.max(0,ix+n2)),wx=cubv(fx-(ix+n2));v+=src[yy*cw+xx]*wx*wy;ws+=wx*wy;}}F[Y*fw+X]=v/ws;}}
    // hafif yumuşatma (3×3) — fotoğraf dokusundan gelen pürüzü alır
    const G=new Float32Array(fw*fh);for(let Y=0;Y<fh;Y++)for(let X=0;X<fw;X++){let t=0,n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=X+dx,yy=Y+dy;if(xx>=0&&yy>=0&&xx<fw&&yy<fh){t+=F[yy*fw+xx];n++;}}G[Y*fw+X]=Math.max(t/n,F[Y*fw+X]*.75);}
    layers.push({field:G,color:rgbPal[k]});}
   const vr=VT.render(layers,fw,fh,W,H,{opaqueGround:opaqueGround?surface.map(Math.round):null,minArea:6,tol:1.2});
   return {data:vr.data,w:W,h:H,box:[x0,y0,x1+1,y1+1],svg:vr.svg,vector:true};}catch(e){/* vektörleştirme başarısızsa raster yola devam */}}
 // Yüksek çözünürlükte keskin kenar: alfa bikübik büyütülür, hafif yumuşatılır (pürüz gider), dar geçişle eşiklenir
 const cub=t=>{t=Math.abs(t);return t<1?1.5*t*t*t-2.5*t*t+1:t<2?-.5*t*t*t+2.5*t*t-4*t+2:0;};
 const A=new Float32Array(W*H);
 for(let Y=0;Y<H;Y++){const fy=(Y+.5)/scale-.5,iy=Math.floor(fy);for(let X=0;X<W;X++){const fx=(X+.5)/scale-.5,ix=Math.floor(fx);let v=0,ws=0;
  for(let m=-1;m<=2;m++){const yy=Math.min(ch-1,Math.max(0,iy+m)),wy=cub(fy-(iy+m));for(let n=-1;n<=2;n++){const xx=Math.min(cw-1,Math.max(0,ix+n)),wx=cub(fx-(ix+n));v+=alpha[yy*cw+xx]*wx*wy;ws+=wx*wy;}}A[Y*W+X]=v/ws;}}
 const r=Math.max(1,Math.round(scale*1.1)),tmp=new Float32Array(W*H),B=new Float32Array(W*H);
 for(let Y=0;Y<H;Y++){let acc=0;for(let X=-r;X<W+r;X++){const add=X+r<W?A[Y*W+Math.min(W-1,X+r)]:0,sub=X-r-1>=0?A[Y*W+X-r-1]:0;acc+=add-sub;if(X>=0)tmp[Y*W+X]=acc/(2*r+1);}}
 for(let X=0;X<W;X++){let acc=0;for(let Y=-r;Y<H+r;Y++){const add=Y+r<H?tmp[Math.min(H-1,Y+r)*W+X]:0,sub=Y-r-1>=0?tmp[(Y-r-1)*W+X]:0;acc+=add-sub;if(Y>=0)B[Y*W+X]=acc/(2*r+1);}}
 const out=new Uint8ClampedArray(W*H*4),edge=.5/Math.max(1,r);
 for(let Y=0;Y<H;Y++)for(let X=0;X<W;X++){const a=Math.max(B[Y*W+X],A[Y*W+X]*.72),Aa=Math.max(0,Math.min(1,(a-.5)/(edge*2)+.5)),o=(Y*W+X)*4;
  const fx=Math.min(cw-1,Math.max(0,Math.round((X+.5)/scale-.5))),fy=Math.min(ch-1,Math.max(0,Math.round((Y+.5)/scale-.5)));
  if(opaqueGround){const c=rgbPal[label[fy*cw+fx]]||surface;for(let k=0;k<3;k++)out[o+k]=Math.round(surface[k]*(1-Aa)+c[k]*Aa);out[o+3]=255;continue;}
  if(Aa<=0)continue;const c=rgbPal[label[fy*cw+fx]]||rgbPal[0];out[o]=c[0];out[o+1]=c[1];out[o+2]=c[2];out[o+3]=Math.round(Aa*255);}
 return {data:out,w:W,h:H,box:[x0,y0,x1+1,y1+1]};}
// ---------- tam akış ----------
// classify: (tensorlar) → Promise<P(düz)[]> (isteğe bağlı yerel model). Verilmezse yalnız geometrik kanıt kullanılır.
// Kavisli yüzey (şişkin poşet, kıvrık kâğıt): her yazı satırının taban çizgisi ikinci dereceden eğriyle bulunur ve satırlar
// dikey kaydırmayla dümdüz edilir. Satırlar arası kaydırma doğrusal geçişle hesaplanır. Düzleşme ölçülmezse değişiklik yapılmaz.
function baselineCurves(m,w,h){const {comps}=components(m,w,h),out=[];
 for(const l of glyphLines(m,w,h)){if(l.count<4)continue;const [x0,y0,x1,y1]=l.box,cs=comps.filter(c=>c.box[0]>=x0&&c.box[2]<=x1&&c.box[1]>=y0&&c.box[3]<=y1&&c.box[3]-c.box[1]>=l.height*.55);if(cs.length<4)continue;
  const hs=cs.map(c=>c.box[3]-c.box[1]).sort((a,b)=>a-b),med=hs[hs.length>>1],P=cs.filter(c=>c.box[3]-c.box[1]<=med*1.25).map(c=>[(c.box[0]+c.box[2])/2,c.box[3]]);if(P.length<4)continue;
  const fit=Q=>{const cx=(x0+x1)/2,sx=Math.max(1,(x1-x0)/2);let S=[0,0,0,0,0],T=[0,0,0];for(const [x,y] of Q){const u=(x-cx)/sx,v=[1,u,u*u];for(let i=0;i<3;i++){T[i]+=v[i]*y;}S[0]+=1;S[1]+=u;S[2]+=u*u;S[3]+=u*u*u;S[4]+=u*u*u*u;}
   const A=[[S[0],S[1],S[2]],[S[1],S[2],S[3]],[S[2],S[3],S[4]]],b=T.slice();for(let i=0;i<3;i++){let p=i;for(let r=i+1;r<3;r++)if(Math.abs(A[r][i])>Math.abs(A[p][i]))p=r;[A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];if(Math.abs(A[i][i])<1e-9)return null;for(let r=i+1;r<3;r++){const f=A[r][i]/A[i][i];for(let c=i;c<3;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i];}}
   const c=[0,0,0];for(let i=2;i>=0;i--){let t=b[i];for(let j=i+1;j<3;j++)t-=A[i][j]*c[j];c[i]=t/A[i][i];}return {c,cx,sx,at:x=>{const u=Math.max(-1.15,Math.min(1.15,(x-cx)/sx));return c[0]+c[1]*u+c[2]*u*u;}};};
  let f=fit(P);if(!f)continue;const res=P.map(([x,y])=>Math.abs(y-f.at(x))),tol=Math.max(1.5,res.slice().sort((a,b)=>a-b)[Math.floor(res.length*.7)]*1.5),inl=P.filter((p,i)=>res[i]<=tol);if(inl.length>=4)f=fit(inl)||f;
  // eğri satıra temiz oturmalı: noktaların çoğu eğriye yakın (yan yana iki ayrı satır birleşmişse oturmaz → dokunulmaz)
  const r2=P.map(([x,y])=>Math.abs(y-f.at(x))),good=r2.filter(v=>v<=Math.max(1.5,l.height*.06)).length/P.length;if(good<.85)continue;
  out.push({box:l.box,height:l.height,curve:f,target:f.at(f.cx)});}
 return out.sort((a,b)=>a.target-b.target);}
function dewarpLines(img,mask){const curves=baselineCurves(mask.m,mask.w,mask.h);if(curves.length<1)return null;
 // eğrilik/eğim yeterince büyük mü (satır ucu ile ortası arasında > satır yüksekliğinin %4'ü)
 const dev=c=>Math.max(Math.abs(c.curve.at(c.box[0])-c.target),Math.abs(c.curve.at(c.box[2])-c.target))/c.height;if(!curves.some(c=>dev(c)>.04))return null;
 const {w,h}=img,out=new Uint8ClampedArray(w*h*4),om=new Uint8Array(w*h),bg=[img.data[0],img.data[1],img.data[2]];
 // her satırın düzeltmesi yalnız kendi yatay aralığında uygulanır (uçlarda yumuşak geçiş); yan sütundaki satırlar etkilenmez
 for(let X=0;X<w;X++){const d=curves.map(c=>{const m=c.height*.6,out=X<c.box[0]?c.box[0]-X:X>c.box[2]?X-c.box[2]:0,wgt=Math.max(0,1-out/m);return (c.curve.at(X)-c.target)*wgt;}),T=curves.map(c=>c.target);
  for(let Y=0;Y<h;Y++){let disp;if(Y<=T[0])disp=d[0];else if(Y>=T[T.length-1])disp=d[d.length-1];else{let k=0;while(k<T.length-2&&Y>T[k+1])k++;const t=(Y-T[k])/Math.max(1e-6,T[k+1]-T[k]);disp=d[k]*(1-t)+d[k+1]*t;}
   const y=Y+disp,o=(Y*w+X)*4;if(y<0||y>h-1){out[o]=bg[0];out[o+1]=bg[1];out[o+2]=bg[2];out[o+3]=255;continue;}const iy=Math.min(h-2,Math.floor(y)),fy=y-iy;
   for(let k=0;k<3;k++)out[o+k]=img.data[(iy*w+X)*4+k]*(1-fy)+img.data[((iy+1)*w+X)*4+k]*fy;out[o+3]=255;om[Y*w+X]=mask.m[Math.round(y)*w+X];}}
 const after=baselineCurves(om,w,h),score=cs=>cs.reduce((a,c)=>a+dev(c),0)/Math.max(1,cs.length);if(!(score(after)<score(curves)*.9))return null;
 return {img:{data:out,w,h},mask:{m:om,w,h}};}
// Son görünümün yukarısı doğru mu? Yerel yön modeli (varsa) ya da taban çizgisi kanıtıyla; gerekirse 180° çevir.
async function uprightView(v,classify){if(v.kind!=='frontal')return v;const flip={img:rotateRGBA(v.img,2),mask:rotateMask(v.mask.m,v.mask.w,v.mask.h,2),kind:v.kind+'+180'};
 const score=async c=>{const gl=glyphLines(c.mask.m,c.mask.w,c.mask.h).slice(0,6);if(!gl.length)return null;if(classify){const items=gl.map(l=>({...clsTensor(c.img,l.box),weight:l.count*l.height}));const P=await classify(items.map(i=>i.tensor));let s=0,w=0;P.forEach((p,i)=>{s+=p*items[i].weight;w+=items[i].weight;});return w?s/w:null;}return uprightEvidence(c.mask.m,c.mask.w,c.mask.h);};
 const a=await score(v),b=await score(flip);return a!=null&&b!=null&&b>a+(classify?.3:5)?flip:v;}
async function extract(data,w,h,{classify=null,candidates=3,recognize=null,createCanvas=null,redrawText=null}={}){
 // Sonuç girdi boyutuna bağlı olmasın: her zaman en uzun kenarı en çok 2048 piksel olan görüntüde çalış (tarayıcı = test)
 {const d=downscale(data,w,h,2048);data=d.data;w=d.w;h=d.h;}
 const found=findSurface(data,w,h);if(!found.best)return {ok:false,reason:'surface-not-found'};
 const tried=[];let pool=found.candidates.slice(0,candidates);
 if(found.best&&found.best.area<.97){const top=found.best,inner=rectify(data,w,h,top.quad,1100),sub=findSurface(inner.data,inner.w,inner.h);
  if(sub.best&&sub.best.area<.8){const H=homography([[0,0],[inner.w,0],[inner.w,inner.h],[0,inner.h]],top.quad);const map=([x,y])=>{const d=H[6]*x+H[7]*y+1;return [(H[0]*x+H[1]*y+H[2])/d,(H[3]*x+H[4]*y+H[5])/d];};
   pool=pool.concat(sub.candidates.slice(0,2).map(c=>({...c,score:c.score*Math.min(1,top.score*2.2)*.85,quad:c.quad.map(map),nested:true})));}}
 for(let cand of pool){
  let rect=rectify(data,w,h,cand.quad);let surface=surfaceColor(rect.data,rect.w,rect.h);const lum=.3*surface[0]+.59*surface[1]+.11*surface[2];
  let dark=lum<80,flat=dark?rect:flatten(rect,surface),mask=cleanInk(dark?inkMaskLightOnDark(flat):inkMask(flat,surface),rect.w,rect.h);let ink=0;for(const v of mask)ink+=v;
  // Kenar çizgileriyle köşe iyileştirme (yalnız açık renkli yüzeylerde: peçete, paket, kartvizit)
  if(!dark&&ink>0){let mx=0,my=0;for(let i=0;i<mask.length;i++)if(mask[i]){mx+=i%rect.w;my+=(i/rect.w)|0;}mx/=ink;my/=ink;
   const Hm=homography([[0,0],[rect.w,0],[rect.w,rect.h],[0,rect.h]],cand.quad),dd=Hm[6]*mx+Hm[7]*my+1,center=[(Hm[0]*mx+Hm[1]*my+Hm[2])/dd,(Hm[3]*mx+Hm[4]*my+Hm[5])/dd];
   const ref=refineQuad(data,w,h,cand.quad,center);
   if(ref){cand={...cand,quad:ref.quad,refined:ref};rect=rectify(data,w,h,cand.quad);surface=surfaceColor(rect.data,rect.w,rect.h);flat=flatten(rect,surface);mask=cleanInk(inkMask(flat,surface),rect.w,rect.h);ink=0;for(const v of mask)ink+=v;}}
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
  tried.push({cand,rect,flat,mask,surface,q,source,inkFrac,quality,diag:{refined:cand.refined?+cand.refined.support.toFixed(2):null,nested:!!cand.nested,quad:cand.quad.map(p=>p.map(Math.round)),glyphFrac:+glyphFrac.toFixed(2),glyphLines:gls.length,score:+cand.score.toFixed(3),lines,maxShare:+maxShare.toFixed(2),confidence:+confidence.toFixed(2),surface:surface.map(v=>v|0).join(',')}});
 }
 const ok=tried.filter(t=>t.quality!=null).sort((a,b)=>b.quality-a.quality);if(!ok.length)return {ok:false,reason:'no-usable-surface',tried:tried.map(t=>t.reason)};
 {const {cand,rect,flat,mask,surface,q,source,inkFrac,quality}=ok[0];
  globalThis.__frontal=null;const img0=rotateRGBA(flat,q),mm0=rotateMask(mask,rect.w,rect.h,q),mmA={...mm0,m:brandGroup(dropOutliers(mm0.m,mm0.w,mm0.h,inkContrast(img0,surface),img0),mm0.w,mm0.h)},view0=frontalChoose(img0,mmA),viewU=await uprightView(view0,classify),dw=dewarpLines(viewU.img,viewU.mask),view=dw?{...viewU,img:dw.img,mask:dw.mask}:viewU,img=view.img,mm=view.mask,core=boxErode(mm.m,mm.w,mm.h,1);let coreN=0;for(const v of core)coreN+=v;const pal=palette(img,coreN>200?core:mm.m);// Koyu zemin üzerindeki açık baskı (tabela, neon): yüzey rengi de tasarımın parçasıdır; düz, tam kaplayan zeminle çizilir
  const lumS=.3*surface[0]+.59*surface[1]+.11*surface[2],lumInk=pal.length?Math.max(...pal.map(p=>p[0]))*2.55:0,lightOnDark=lumS<110&&lumInk>lumS+40;
  // Parlama/aşınma onarımı: harf gövdelerindeki küçük delik ve çatlaklar kapatılır, harfe değmeyen ufak lekeler atılır
  // Parlama/aşınma onarımı — yalnız yazı satırlarının içinde ve her satırın kendi harf boyuna göre:
  // harf gövdesindeki ince çatlaklar kapatılır, harf içindeki küçük delikler doldurulur. Satır dışı (QR, simge, amblem) aynen kalır.
  // Satır dışındaki uzun-ince/seyrek toz parçaları atılır.
  const repair=(()=>{const G=glyphLines(mm.m,mm.w,mm.h),W2=mm.w,H2=mm.h,mask=mm.m.slice(),solid=new Uint8Array(W2*H2);if(!G.length)return {mask,solid:null};
   for(const l of G){const [x0,y0,x1,y1]=l.box,pad=Math.round(l.height*.15),X0=Math.max(0,x0-pad),Y0=Math.max(0,y0-pad),X1=Math.min(W2,x1+pad),Y1=Math.min(H2,y1+pad),w2=X1-X0,h2=Y1-Y0;if(w2<4||h2<4)continue;
    const sub=new Uint8Array(w2*h2);for(let y=0;y<h2;y++)for(let x=0;x<w2;x++)sub[y*w2+x]=mm.m[(y+Y0)*W2+x+X0];
    if(l.height<Math.min(W2,H2)*.07)continue; // küçük yazılar onarılmaz (harf içi boşluklar kapanabilir)
    const r=Math.max(1,Math.round(l.height*.02)),cl=closeMask(sub,w2,h2,r),inv=cl.map(v=>v?0:1),HC=components(inv,w2,h2),holeMax=(l.height*.07)**2;
    for(let y=0;y<h2;y++)for(let x=0;x<w2;x++){const i=y*w2+x;let on=cl[i];if(!on){const c=HC.comps[HC.lab[i]];const b=c.box;if(c.n<=holeMax&&b[0]>0&&b[1]>0&&b[2]<w2&&b[3]<h2)on=1;}
     // kapatma iki ayrı harfi birleştirmesin: yalnız orijinal mürekkebe çok yakın (r içinde) pikseller eklenir
     // kapatmadan gelen piksel yalnız iki karşı yanında mürekkep varsa (çatlak) eklenir; harfin dış kenarı kalınlaşmaz
     if(on&&!sub[i]&&cl[i]){const at=(xx,yy)=>xx>=0&&yy>=0&&xx<w2&&yy<h2&&sub[yy*w2+xx];let L=false,R=false,U=false,D=false;for(let k=1;k<=r+1;k++){L=L||at(x-k,y);R=R||at(x+k,y);U=U||at(x,y-k);D=D||at(x,y+k);}if(!((L&&R)||(U&&D)))on=0;}
     if(on){mask[(y+Y0)*W2+x+X0]=1;if(!sub[i])solid[(y+Y0)*W2+x+X0]=1;}}} // yalnız onarılan (eklenen) pikseller zorla dolu; mevcut kenar yumuşaklığı korunur
   const inLine=b=>G.some(l=>{const [x0,y0,x1,y1]=l.box,p=l.height*.12;return b[0]>=x0-p&&b[2]<=x1+p&&b[1]>=y0-p&&b[3]<=y1+p;});
   const hs=G.map(l=>l.height).sort((a,b)=>a-b),Hm=hs[hs.length>>1],{lab,comps}=components(mask,W2,H2),drop=new Uint8Array(comps.length);
   for(const c of comps){if(inLine(c.box))continue;const bw=c.box[2]-c.box[0],bh=c.box[3]-c.box[1];if(c.n<Hm*Hm*.04&&!(bw/Math.max(1,bh)<2.2&&bh/Math.max(1,bw)<2.6&&c.n/(bw*bh)>.5))drop[c.id]=1;}
   for(let i=0;i<mask.length;i++)if(lab[i]>=0&&drop[lab[i]]){mask[i]=0;solid[i]=0;}
   return {mask,solid};})();
  const out=renderClean(img,repair.mask,surface.map(Math.round),pal,2000,lightOnDark,repair.solid);if(!out)return {ok:false,reason:'empty'};
  // Yazıları okuyup temiz yazı tipiyle yeniden çiz (yerel metin tanıma modeli verilmişse)
  let textRedraw=null;const TR=redrawText||(typeof root!=='undefined'&&root.TextRedraw);if(recognize&&createCanvas&&TR){try{textRedraw=await TR.redraw({img,mask:{m:repair.mask,w:mm.w,h:mm.h},out,palette:pal.map(labToRgb),surface,opaqueGround:lightOnDark,recognize,createCanvas});}catch(e){textRedraw={error:String(e&&e.message||e)};}}
  // Temizlenmiş logodaki harf oranı (kendiliğinden yerleştirme kararı için)
  let finalInk=0,finalGlyph=0;{for(const v of mm.m)finalInk+=v;const inBox=new Uint8Array(mm.w*mm.h);for(const l of glyphLines(mm.m,mm.w,mm.h)){const [x0,y0,x1,y1]=l.box;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)inBox[y*mm.w+x]=1;}for(let i=0;i<inBox.length;i++)if(inBox[i]&&mm.m[i])finalGlyph++;}
  return {ok:true,svg:out.svg||null,vector:!!out.vector,textRedraw,lightOnDark,confidence:ok[0].diag.confidence,glyphFractionRaw:ok[0].diag.glyphFrac,glyphFraction:+(finalGlyph/Math.max(1,finalInk)).toFixed(2),quality,alternatives:ok.length-1,diagnostics:ok.map(t=>({...t.diag,quality:+t.quality.toFixed(4)})),image:out,palette:pal.map(labToRgb).map(c=>'#'+c.map(v=>v.toString(16).padStart(2,'0')).join('')),surface:'#'+surface.map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''),quad:cand.quad,quarterTurns:q,orientationSource:source,inkFraction:inkFrac,surfaceScore:cand.score,method:'local-product-photo-v1'};
 }
}
const api=Object.freeze({_conic:conicRatio,frontalize,frontalMetrics,textGeometry,collectFeatures,frontalTransform,refineQuad,glyphLines,extract,findSurface,textLines,clsTensor,palette,renderClean,rectify,surfaceColor,flatten,inkMask,cleanInk,orientation,rotateRGBA,_internal:{homography,rotateMask,uprightEvidence,lineScore,downscale,kmeans,closeMask,components,fillHoles,hull,minAreaRect,bestQuad,toLab}});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProductPhoto=api;
})(typeof globalThis!=='undefined'?globalThis:this);
