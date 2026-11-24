/* Görüntü izleme (vektörleştirme): fotoğraftan ayrılan logonun her renk katmanının kenarı alt-piksel hassasiyetle izlenir,
   düz parçalar düz çizgiye, eğriler yumuşak eğriye çevrilir, köşeler keskin bırakılır. Sonuç bu eğrilerden kenar
   yumuşatmalı olarak çizilir ve aynı eğrilerden SVG üretilir. Yazı tipi/şekil değiştirilmez; yalnız kenarlar düzelir.
   Saf fonksiyonlar (tarayıcı ve Node), dış bağımlılık yok. */
(function(root){'use strict';
// ---------- eşdeğer eğri (marching squares, 0,5 seviyesinde) ----------
function contours(F,W,H,level=.5){
 // kenar noktaları: yatay kenar (x,y)-(x+1,y) ve dikey kenar (x,y)-(x,y+1) üzerindeki kesişimler
 const v=(x,y)=>x<0||y<0||x>=W||y>=H?0:F[y*W+x];const segs=[];
 const lerp=(a,b)=>(level-a)/(b-a);
 for(let y=-1;y<H;y++)for(let x=-1;x<W;x++){const a=v(x,y),b=v(x+1,y),c=v(x+1,y+1),d=v(x,y+1);let idx=(a>level?8:0)|(b>level?4:0)|(c>level?2:0)|(d>level?1:0);if(idx===0||idx===15)continue;
  const T=[x+lerp(a,b),y],R=[x+1,y+lerp(b,c)],B=[x+lerp(d,c),y+1],L=[x,y+lerp(a,d)];
  const kT=`h${x},${y}`,kR=`v${x+1},${y}`,kB=`h${x},${y+1}`,kL=`v${x},${y}`;
  const add=(p,kp,q,kq)=>segs.push([kp,p,kq,q]);
  // yön: dolu bölge solda kalacak şekilde (dış sınır saat yönünün tersi)
  switch(idx){case 1:add(L,kL,B,kB);break;case 2:add(B,kB,R,kR);break;case 3:add(L,kL,R,kR);break;case 4:add(R,kR,T,kT);break;
   case 5:{const m=(a+b+c+d)/4;if(m>level){add(L,kL,T,kT);add(R,kR,B,kB);}else{add(L,kL,B,kB);add(R,kR,T,kT);}break;}
   case 6:add(B,kB,T,kT);break;case 7:add(L,kL,T,kT);break;case 8:add(T,kT,L,kL);break;case 9:add(T,kT,B,kB);break;
   case 10:{const m=(a+b+c+d)/4;if(m>level){add(T,kT,R,kR);add(B,kB,L,kL);}else{add(T,kT,L,kL);add(B,kB,R,kR);}break;}
   case 11:add(T,kT,R,kR);break;case 12:add(R,kR,L,kL);break;case 13:add(R,kR,B,kB);break;case 14:add(B,kB,L,kL);break;}}
 const next=new Map();for(const s of segs)next.set(s[0],s);const used=new Set(),loops=[];
 for(const s of segs){if(used.has(s[0]))continue;const loop=[];let cur=s,guard=0;while(cur&&!used.has(cur[0])&&guard++<1e6){used.add(cur[0]);loop.push(cur[1]);cur=next.get(cur[2]);}if(loop.length>=4)loops.push(loop);}
 return loops;}
function area(P){let a=0;for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length];a+=p[0]*q[1]-q[0]*p[1];}return a/2;}
// ---------- sadeleştirme (kapalı Douglas–Peucker) ----------
function dp(P,tol){if(P.length<3)return P.slice();const keep=new Uint8Array(P.length);keep[0]=keep[P.length-1]=1;const st=[[0,P.length-1]];
 while(st.length){const [i,j]=st.pop();let md=-1,mi=-1;const a=P[i],b=P[j],dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1;for(let k=i+1;k<j;k++){const d=Math.abs((P[k][0]-a[0])*dy-(P[k][1]-a[1])*dx)/L;if(d>md){md=d;mi=k;}}if(md>tol){keep[mi]=1;st.push([i,mi],[mi,j]);}}
 return P.filter((_,k)=>keep[k]);}
function simplifyClosed(P,tol){ // en uzak iki noktadan böl, iki yarıyı ayrı sadeleştir
 let far=0,fd=-1;for(let k=1;k<P.length;k++){const d=(P[k][0]-P[0][0])**2+(P[k][1]-P[0][1])**2;if(d>fd){fd=d;far=k;}}
 const A=dp(P.slice(0,far+1),tol),B=dp(P.slice(far).concat([P[0]]),tol);return A.slice(0,-1).concat(B.slice(0,-1));}
// ---------- köşe tespiti ve eğri ----------
// Köşe: iki komşu kenar arasındaki dönüş açısı büyükse (ör. 'E', 'A' uçları). Köşeler arası Catmull–Rom ile yumuşatılır.
function toPath(P,cornerDeg=55){const n=P.length;if(n<3)return null;const corner=new Uint8Array(n);
 for(let i=0;i<n;i++){const a=P[(i-1+n)%n],b=P[i],c=P[(i+1)%n],u=[b[0]-a[0],b[1]-a[1]],v=[c[0]-b[0],c[1]-b[1]],lu=Math.hypot(...u)||1,lv=Math.hypot(...v)||1;const t=Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/(lu*lv))))*180/Math.PI;
  // uzun düz kenarların ucu da köşedir (düz çizgi eğilmesin)
  corner[i]=t>=cornerDeg||(t>=38&&Math.min(lu,lv)>14)?1:0;}
 // her kenar için kübik Bezier kontrol noktaları: köşe uçlarında teğet = kenar doğrultusu (düz kalır)
 const segs=[];for(let i=0;i<n;i++){const p0=P[(i-1+n)%n],p1=P[i],p2=P[(i+1)%n],p3=P[(i+2)%n];
  let t1=corner[i]?[(p2[0]-p1[0])/3,(p2[1]-p1[1])/3]:[(p2[0]-p0[0])/6,(p2[1]-p0[1])/6],t2=corner[(i+1)%n]?[(p2[0]-p1[0])/3,(p2[1]-p1[1])/3]:[(p3[0]-p1[0])/6,(p3[1]-p1[1])/6];
  // kısa kenarda aşırı salınımı önle
  const L=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]),cap=v=>{const l=Math.hypot(...v);return l>L*.5?[v[0]*L*.5/l,v[1]*L*.5/l]:v;};t1=cap(t1);t2=cap(t2);
  segs.push([p1,[p1[0]+t1[0],p1[1]+t1[1]],[p2[0]-t2[0],p2[1]-t2[1]],p2]);}
 return segs;}
function flatten(segs,step=.75){const out=[];for(const [a,b,c,d] of segs){const L=Math.hypot(b[0]-a[0],b[1]-a[1])+Math.hypot(c[0]-b[0],c[1]-b[1])+Math.hypot(d[0]-c[0],d[1]-c[1]),n=Math.max(1,Math.ceil(L/step));
 for(let k=0;k<n;k++){const t=k/n,u=1-t;out.push([u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1]]);}}return out;}
// ---------- kenar yumuşatmalı çokgen doldurma (çift-tek kuralı, satır başına 5 alt satır) ----------
function fillPolys(polys,W,H){const cov=new Float32Array(W*H),SUB=5;const edges=[];
 for(const P of polys)for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];if(a[1]===b[1])continue;edges.push(a[1]<b[1]?[a[0],a[1],b[0],b[1]]:[b[0],b[1],a[0],a[1]]);}
 edges.sort((p,q)=>p[1]-q[1]);let start=0;
 for(let y=0;y<H;y++)for(let s=0;s<SUB;s++){const sy=y+(s+.5)/SUB,xs=[];while(start<edges.length&&edges[start][3]<y)start++;
  for(let e=start;e<edges.length;e++){const E=edges[e];if(E[1]>sy)break;if(E[3]<=sy)continue;xs.push(E[0]+(sy-E[1])*(E[2]-E[0])/(E[3]-E[1]));}
  xs.sort((a,b)=>a-b);for(let k=0;k+1<xs.length;k+=2){let xa=Math.max(0,xs[k]),xb=Math.min(W,xs[k+1]);if(xb<=xa)continue;const ia=Math.floor(xa),ib=Math.floor(xb),row=y*W,w=1/SUB;
   if(ia===ib){if(ia<W)cov[row+ia]+=(xb-xa)*w;continue;}cov[row+ia]+=(ia+1-xa)*w;for(let x=ia+1;x<ib;x++)cov[row+x]+=w;if(ib<W)cov[row+ib]+=(xb-ib)*w;}}
 return cov;}
// ---------- ana çağrı ----------
// layers: [{field:Float32Array (fw×fh, 0..1), color:[r,g,b]}], fw×fh izleme ızgarası; çıktı W×H (ölçek = W/fw)
function render(layers,fw,fh,W,H,{opaqueGround=null,minArea=6,tol=.45}={}){
 const sx=W/fw,sy=H/fh,out=new Uint8ClampedArray(W*H*4),svg=[];if(opaqueGround)for(let i=0;i<W*H;i++){out[i*4]=opaqueGround[0];out[i*4+1]=opaqueGround[1];out[i*4+2]=opaqueGround[2];out[i*4+3]=255;}
 let loopsTotal=0;
 for(const L of layers){const loops=contours(L.field,fw,fh).filter(P=>Math.abs(area(P))>=minArea);if(!loops.length)continue;loopsTotal+=loops.length;
  const paths=loops.map(P=>toPath(simplifyClosed(P,tol))).filter(Boolean),polys=paths.map(sg=>flatten(sg).map(([x,y])=>[x*sx,y*sy]));
  const cov=fillPolys(polys,W,H),c=L.color;
  for(let i=0;i<W*H;i++){const a=Math.min(1,cov[i]);if(a<=0)continue;const o=i*4;if(opaqueGround){for(let k=0;k<3;k++)out[o+k]=Math.round(out[o+k]*(1-a)+c[k]*a);}else{const A0=out[o+3]/255,A=a+A0*(1-a);for(let k=0;k<3;k++)out[o+k]=Math.round((c[k]*a+out[o+k]*A0*(1-a))/(A||1));out[o+3]=Math.round(A*255);}}
  const f=v=>(+v.toFixed(2));svg.push(`<path fill="rgb(${c.map(Math.round).join(',')})" fill-rule="evenodd" d="${paths.map(sg=>'M'+f(sg[0][0][0]*sx)+' '+f(sg[0][0][1]*sy)+sg.map(([,b,cc,d])=>'C'+f(b[0]*sx)+' '+f(b[1]*sy)+' '+f(cc[0]*sx)+' '+f(cc[1]*sy)+' '+f(d[0]*sx)+' '+f(d[1]*sy)).join('')+'Z').join('')}"/>`);}
 const svgText=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${opaqueGround?`<rect width="${W}" height="${H}" fill="rgb(${opaqueGround.map(Math.round).join(',')})"/>`:''}${svg.join('')}</svg>`;
 return {data:out,w:W,h:H,svg:svgText,loops:loopsTotal};}
const api=Object.freeze({render,contours,simplifyClosed,toPath,flatten,fillPolys});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VectorTrace=api;
})(typeof globalThis!=='undefined'?globalThis:this);
