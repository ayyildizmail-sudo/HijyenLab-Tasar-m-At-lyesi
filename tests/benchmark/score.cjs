// Puanlayıcı: uygulamanın ambalaja koyduğu logoyu, örneğin doğru (üretildiği) logosuyla karşılaştırır.
// Kullanım: node tests/benchmark/score.cjs <set-klasörü> <sonuç-klasörü>
// Ölçütler (hepsi logo kutusuna göre normalize edilir):
//  - şekil F1: doğru logodaki mürekkep ile çıkan mürekkebin 3 px toleransla örtüşmesi (fazla öğe veya eksik parça F1'i düşürür)
//  - en/boy hatası: çıkan logonun en/boy oranının doğrusundan sapması (eğiklik düzeltilmediyse büyür)
//  - renk farkı: her mürekkep rengi için CIELAB ΔE
// Sonuç: "doğru" (F1 ≥ .85, en/boy ≤ %12, ΔE ≤ 25) · "kısmi" (F1 ≥ .60 ve en/boy ≤ %35) · "yanlış" · "sonuç yok" (yerleştirilemedi / özgün görsel)
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const N=400,TOL=3;

function lab([r,g,b]){const f=c=>{c/=255;return c>.04045?((c+.055)/1.055)**2.4:c/12.92;};const R=f(r),G=f(g),B=f(b);let x=(R*.4124+G*.3576+B*.1805)/.95047,y=R*.2126+G*.7152+B*.0722,z=(R*.0193+G*.1192+B*.9505)/1.08883;const h=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;x=h(x);y=h(y);z=h(z);return [116*y-16,500*(x-y),200*(y-z)];}
const dE=(a,b)=>{const A=lab(a),B=lab(b);return Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2]);};
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));

function pixels(img){const c=createCanvas(img.width,img.height),g=c.getContext('2d');g.drawImage(img,0,0);return {w:img.width,h:img.height,d:g.getImageData(0,0,img.width,img.height).data};}
// Mürekkep maskesi: opak ve kenar zemin renginden belirgin farklı pikseller
function inkMask({w,h,d},{alphaOnly=false}={}){
 const m=new Uint8Array(w*h);if(alphaOnly){for(let i=0;i<w*h;i++)m[i]=d[i*4+3]>128;return m;}
 const border=[];for(let x=0;x<w;x++){border.push(x,(h-1)*w+x);}for(let y=0;y<h;y++){border.push(y*w,y*w+w-1);}
 const opaque=border.filter(i=>d[i*4+3]>128);let bg=null;
 if(opaque.length>border.length*.5){const ch=k=>{const v=opaque.map(i=>d[i*4+k]).sort((a,b)=>a-b);return v[v.length>>1];};bg=[ch(0),ch(1),ch(2)];}
 for(let i=0;i<w*h;i++){if(d[i*4+3]<=128)continue;m[i]=bg?Math.hypot(d[i*4]-bg[0],d[i*4+1]-bg[1],d[i*4+2]-bg[2])>45:1;}return m;
}
// Gürültüye dayanıklı kutu: mürekkep koordinatlarının %0,5–%99,5 aralığı
function bbox(m,w,h){const xs=[],ys=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(m[y*w+x]){xs.push(x);ys.push(y);}if(xs.length<20)return null;xs.sort((a,b)=>a-b);ys.sort((a,b)=>a-b);const q=(a,p)=>a[Math.min(a.length-1,Math.floor(a.length*p))];return {x0:q(xs,.005),x1:q(xs,.995)+1,y0:q(ys,.005),y1:q(ys,.995)+1,count:xs.length};}
function sample(px,m,b,W,H){ // kutuyu W×H ızgaraya örnekler: maske + renk
 const mask=new Uint8Array(W*H),col=new Float32Array(W*H*3);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const sx=Math.min(px.w-1,Math.floor(b.x0+(x+.5)*(b.x1-b.x0)/W)),sy=Math.min(px.h-1,Math.floor(b.y0+(y+.5)*(b.y1-b.y0)/H)),i=sy*px.w+sx,o=y*W+x;mask[o]=m[i];col[o*3]=px.d[i*4];col[o*3+1]=px.d[i*4+1];col[o*3+2]=px.d[i*4+2];}
 return {mask,col};
}
function dilate(m,W,H,r){const o=new Uint8Array(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(!m[y*W+x])continue;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<W&&Y<H)o[Y*W+X]=1;}}return o;}

async function scoreCase(c,dir,out,run){
 const r=run[c.id]||{outcome:'koşucu-hatası'};const res={id:c.id,logo:c.logo,scene:c.scene,outcome:r.outcome,method:r.method,ms:r.ms};
 if(!['logo','fotoğraf-yerleşimi'].includes(r.outcome)||!fs.existsSync(path.join(out,c.id+'.out.png'))){res.verdict='sonuç yok';return res;}
 const gt=pixels(await loadImage(path.join(dir,c.gt))),ot=pixels(await loadImage(path.join(out,c.id+'.out.png')));
 const gm=inkMask(gt,{alphaOnly:true}),om=inkMask(ot);const gb=bbox(gm,gt.w,gt.h),ob=bbox(om,ot.w,ot.h);
 if(!ob){res.verdict='yanlış';res.f1=0;res.reason='boş çıktı';return res;}
 const ga=(gb.x1-gb.x0)/(gb.y1-gb.y0),oa=(ob.x1-ob.x0)/(ob.y1-ob.y0);res.aspectErr=+Math.abs(Math.log(oa/ga)).toFixed(3);
 const W=N,H=Math.max(8,Math.round(N/ga));const G=sample(gt,gm,gb,W,H),O=sample(ot,om,ob,W,H);
 const Gd=dilate(G.mask,W,H,TOL),Od=dilate(O.mask,W,H,TOL);let gs=0,os=0,tp1=0,tp2=0;
 for(let i=0;i<W*H;i++){if(G.mask[i]){gs++;if(Od[i])tp2++;}if(O.mask[i]){os++;if(Gd[i])tp1++;}}
 const prec=os?tp1/os:0,rec=gs?tp2/gs:0,f1=prec+rec?2*prec*rec/(prec+rec):0;Object.assign(res,{precision:+prec.toFixed(3),recall:+rec.toFixed(3),f1:+f1.toFixed(3)});
 // Renk: doğru logodaki her mürekkep için, aynı yerdeki çıkan mürekkebin ortalama rengi
 const inks=c.inks.map(hex);const worst=[];
 if(!(inks.length===1&&inks[0].every(v=>v===255))){for(const ink of inks){let s=[0,0,0],n=0;for(let i=0;i<W*H;i++){if(!G.mask[i]||!O.mask[i])continue;const gc=[G.col[i*3],G.col[i*3+1],G.col[i*3+2]];let best=null,bd=1e9;for(const k of inks){const dd=Math.hypot(gc[0]-k[0],gc[1]-k[1],gc[2]-k[2]);if(dd<bd){bd=dd;best=k;}}if(best!==ink)continue;s[0]+=O.col[i*3];s[1]+=O.col[i*3+1];s[2]+=O.col[i*3+2];n++;}if(n>30)worst.push(dE(s.map(v=>v/n),ink));}}
 res.colorDE=worst.length?+Math.max(...worst).toFixed(1):null;
 const colorOk=res.colorDE===null||res.colorDE<=25;
 res.verdict=f1>=.85&&res.aspectErr<=.12&&colorOk?'doğru':f1>=.6&&res.aspectErr<=.35?'kısmi':'yanlış';
 if(res.verdict!=='doğru')res.reason=[f1<.85?(prec<rec?'fazla öğe/zemin':'eksik parça'):null,res.aspectErr>.12?'eğik/oran bozuk':null,!colorOk?'renk farklı':null].filter(Boolean).join(', ');
 return res;
}

async function main(){
 const dir=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);const cases=JSON.parse(fs.readFileSync(path.join(dir,'cases.json'),'utf8'));const run=JSON.parse(fs.readFileSync(path.join(out,'run.json'),'utf8'));
 const rows=[];for(const c of cases)if(run[c.id])rows.push(await scoreCase(c,dir,out,run));
 fs.writeFileSync(path.join(out,'score.json'),JSON.stringify(rows,null,1));
 const tally=(key)=>{const t={};for(const r of rows){const k=r[key];t[k]=t[k]||{doğru:0,kısmi:0,yanlış:0,'sonuç yok':0,n:0};t[k][r.verdict]++;t[k].n++;}return t;};
 const line=(name,t)=>`${name.padEnd(18)} ${String(t.n).padStart(3)}  doğru ${String(t.doğru).padStart(3)}  kısmi ${String(t.kısmi).padStart(3)}  yanlış ${String(t.yanlış).padStart(3)}  sonuç yok ${String(t['sonuç yok']).padStart(3)}`;
 const all={doğru:0,kısmi:0,yanlış:0,'sonuç yok':0,n:rows.length};for(const r of rows)all[r.verdict]++;
 const lines=['TOPLAM',line('hepsi',all),'','SAHNE TÜRÜNE GÖRE',...Object.entries(tally('scene')).map(([k,t])=>line(k,t)),'','LOGO TÜRÜNE GÖRE',...Object.entries(tally('logo')).map(([k,t])=>line(k,t))];
 const reasons={};for(const r of rows)if(r.reason)for(const x of r.reason.split(', '))reasons[x]=(reasons[x]||0)+1;lines.push('','BAŞARISIZLIK NEDENLERİ',...Object.entries(reasons).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k.padEnd(18)} ${v}`));
 const txt=lines.join('\n');fs.writeFileSync(path.join(out,'summary.txt'),txt);console.log(txt);
}
main().catch(e=>{console.error(e);process.exit(1);});
