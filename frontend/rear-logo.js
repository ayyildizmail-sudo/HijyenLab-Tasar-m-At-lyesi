/* Rear sponsor artwork only. Source pixels, no front-state access or generated lettering. */
(function(root){'use strict';
const B=typeof module!=='undefined'?require('./background.js'):root.BackgroundAnalysis;
const MAX_PIXELS=4000000,dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const fail=reason=>({ok:false,reason,reviewRequired:true});
// Ready dense graphics bypass the physical-carrier matte. Preserve enclosed
// white letters/rings; only the edge-connected blank outside is transparent.
function readyGraphic(raw,w,h,b){
 if(b.kind!=='white'||!(b.connected<.4)||w<160||h<160)return null;
 const scale=Math.min(1,240/Math.max(w,h)),sw=Math.round(w*scale),sh=Math.round(h*scale),small=new Uint8ClampedArray(sw*sh*4);
 for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const j=(Math.min(h-1,Math.floor((y+.5)/scale))*w+Math.min(w-1,Math.floor((x+.5)/scale)))*4;small.set(raw.subarray(j,j+4),(y*sw+x)*4);}
 if(!B.inspectFlatGraphic(small,sw,sh).flatGraphic)return null;
 // A closed outside border may touch the image at a few tangent points. Broad
 // edge-crossing ink is still clipped/ambiguous, not permission to invent it.
 const mask=B.edgeMask(raw,w,h,b.rgb,32).mask;let boundary=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if((!x||!y||x===w-1||y===h-1)&&!mask[y*w+x])boundary++;
 if(boundary/(2*w+2*h-4)>.12)return null;
 const data=new Uint8ClampedArray(raw),colors=new Map();for(let i=0;i<w*h;i++){const j=i*4;if(mask[i])data[j+3]=0;else if(data[j+3]>240){const key=Array.from(data.subarray(j,j+3)).map(v=>Math.min(255,Math.round(v/16)*16)).join(',');colors.set(key,(colors.get(key)||0)+1);}}
 return {ok:true,data,width:w,height:h,sourceBounds:[0,0,w,h],sourceWidth:w,sourceHeight:h,method:'ready-flat-graphic-source-pixels',background:b.rgb,reviewRequired:true,limitations:['Hazır grafik oranı ve iç beyaz ayrıntıları korunur; yalnız dışa bağlı beyaz alan kaldırılır.'],inkSamples:[...colors].sort((a,b)=>b[1]-a[1]).slice(0,16).map(([key,count])=>({rgb:key.split(',').map(Number),count}))};
}
function extractRGBA(raw,w,h){
 if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<2||h<2||w*h>MAX_PIXELS||!raw||raw.length!==w*h*4)return fail('Görsel boyutu veya piksel sınırı uygun değil.');
 const n=w*h;let transparent=0,edge=0,edgeTransparent=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=raw[(y*w+x)*4+3];if(a<16)transparent++;if(x===0||y===0||x===w-1||y===h-1){edge++;if(a<16)edgeTransparent++;}}
 const native=transparent/n>.01,out=new Uint8ClampedArray(raw);let method='native-alpha-trim',background=null,limitations=[];
 if(!native){
  const b=B.analyze(raw,w,h),ready=readyGraphic(raw,w,h,b);if(ready)return ready;if(!['white','color'].includes(b.kind)||b.confidence<.98||b.connected<.4||Math.min(...b.rgb)<210||Math.max(...b.rgb)-Math.min(...b.rgb)>35)return fail('Bu görselden sponsor logosu güvenle ayrılamadı. Şeffaf logo veya düz açık zeminli görsel kullanın.');
  background=b.rgb;method='uniform-light-carrier-source-pixels';
  // Strong ink palette is evidence of flat art, not a semantic brand classifier.
  const bins=new Map();let strong=0;
  for(let i=0;i<n;i++){const j=i*4,p=Array.from(raw.subarray(j,j+3));if(raw[j+3]<240)return fail('Karışık saydamlık ve zemin birlikte çözümlenemedi.');if(dist(p,background)>65){strong++;const key=p.map(v=>Math.floor(v/32)).join(',');const v=bins.get(key)||{n:0,sum:[0,0,0]};v.n++;p.forEach((c,k)=>v.sum[k]+=c);bins.set(key,v);}}
  const ranked=[...bins.values()].sort((a,b)=>b.n-a.n),dominant=ranked.slice(0,16),concentration=dominant.reduce((s,v)=>s+v.n,0)/Math.max(1,strong);
  if(strong<12||strong/n>.6||concentration<.97)return fail('Fotoğraf dokusu veya belirsiz baskı ayrıştırmayı engelliyor.');
  // Estimate ink only from locally stable interiors, never the pale antialias ring.
  const interior=new Uint8Array(n),coreBins=new Map();
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x,j=i*4,p=Array.from(raw.subarray(j,j+3));if(dist(p,background)<=18)continue;
   let stable=true;for(let yy=Math.max(0,y-2);yy<=Math.min(h-1,y+2)&&stable;yy++)for(let xx=Math.max(0,x-2);xx<=Math.min(w-1,x+2);xx++)if(dist(p,raw.subarray((yy*w+xx)*4,(yy*w+xx)*4+3))>12){stable=false;break;}if(!stable)continue;
   interior[i]=1;const key=p.map(v=>Math.floor(v/24)).join(',');const q=coreBins.get(key)||{n:0,sum:[0,0,0]};q.n++;p.forEach((v,k)=>q.sum[k]+=v);coreBins.set(key,q);
  }
  const palette=[...coreBins.values()].filter(v=>v.n>=4).sort((a,b)=>b.n-a.n).slice(0,32).map(v=>v.sum.map(c=>c/v.n));
  if(!palette.length)return fail('Logo için güvenilir iç baskı rengi bulunamadı.');
  let uncertain=0;
  for(let i=0;i<n;i++){const j=i*4,p=Array.from(raw.subarray(j,j+3)),d=dist(p,background);if(d<=12){out[j+3]=0;continue;}
   if(interior[i])continue; // Actual opaque ink remains byte-for-byte unchanged.
   let best=null;for(const ink of palette){const v=ink.map((c,k)=>c-background[k]),den=v.reduce((s,c)=>s+c*c,0),a=Math.max(0,Math.min(1,v.reduce((s,c,k)=>s+c*(p[k]-background[k]),0)/den)),r=dist(p,background.map((c,k)=>c+a*v[k]));if(!best||r<best.r)best={a,r,ink};}
   let localSupport=false;
   if(best&&best.r<=65){const x=i%w,y=Math.floor(i/w);for(let yy=Math.max(1,y-6);yy<Math.min(h-1,y+7)&&!localSupport;yy++)for(let xx=Math.max(1,x-6);xx<Math.min(w-1,x+7);xx++){const q=yy*w+xx;if(dist(raw.subarray(q*4,q*4+3),background)>65&&dist(raw.subarray(q*4,q*4+3),best.ink)<=50){localSupport=true;break;}}}
   if(best&&best.a>=.97&&localSupport&&best.r<=65){out[j+3]=255;continue;}
   if(!best||best.r>35||(!localSupport&&(best.a>.1||best.r>14))){uncertain++;continue;}
   const a=best.a;if(a>=.97&&best.r<=14){out[j+3]=255;continue;}if(a<.04){out[j+3]=0;continue;}
   // Only boundary pixels receive an estimated foreground/coverage pair.
   // Using supported interior ink avoids retaining JPEG carrier contamination.
   out[j+3]=Math.round(255*a);for(let k=0;k<3;k++)out[j+k]=Math.round(best.ink[k]);
  }
  // No unexplained opaque pixel is silently passed through as a successful matte.
  if(uncertain)return fail('Bazı kenar veya soluk baskı ayrıntıları güvenle ayrılamadı; daha net logo gerekir.');
  limitations=['Açık ve tekdüze taşıyıcı tahmini; marka anlamı otomatik doğrulanmaz.','Kenar saydamlığı ve kenar rengi fotoğraftan tahmin edilir; kaynakta kaybolmuş ayrıntı geri üretilmez.','Beyaz logo ayrıntıları açık taşıyıcıdan kesin ayırt edilemez; önizlemeyi kaynakla karşılaştırın.'];
 }
 let x0=w,y0=h,x1=0,y1=0,count=0,boundary=0;const colors=new Map();
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const j=(y*w+x)*4;if(out[j+3]>(native?0:16)){count++;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);if(!x||!y||x===w-1||y===h-1)boundary++;if(out[j+3]>240){const key=Array.from(out.subarray(j,j+3)).map(c=>Math.round(c/16)*16).join(',');colors.set(key,(colors.get(key)||0)+1);}}}
 if(count<12||(!native&&boundary>0))return fail('Logo boş veya kaynak kenarında kesilmiş görünüyor.');
 const pad=2; x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(w,x1+pad);y1=Math.min(h,y1+pad);
 const width=x1-x0,height=y1-y0,data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)data.set(out.subarray(((y+y0)*w+x0)*4,((y+y0)*w+x1)*4),y*width*4);
 return {ok:true,data,width,height,sourceBounds:[x0,y0,x1,y1],sourceWidth:w,sourceHeight:h,method,background,reviewRequired:true,limitations,inkSamples:[...colors.entries()].sort((a,b)=>b[1]-a[1]).slice(0,16).map(([key,count])=>({rgb:key.split(',').map(v=>Math.min(255,+v)),count}))};
}
function contrastWarning(result,background){
 const rgb=typeof background==='string'&&/^#[0-9a-f]{6}$/i.test(background)?[1,3,5].map(i=>parseInt(background.slice(i,i+2),16)):background;
 if(!Array.isArray(rgb)||rgb.length!==3)return null;
 const lum=p=>p.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0),b=lum(rgb);let low=0,total=0;
 for(const s of result.inkSamples||[]){const l=lum(s.rgb),ratio=(Math.max(l,b)+.05)/(Math.min(l,b)+.05);total+=s.count;if(ratio<2)low+=s.count;}
 return total&&low/total>.2?'Logo rengi seçilen zeminde zor görünebilir. Logo rengi değiştirilmedi.':null;
}
async function prepare(img,options={}){
 const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;if(!w||!h||w*h>MAX_PIXELS)throw Error('Görsel en fazla 4 milyon piksel olmalı.');
 const context=typeof module!=='undefined'?require('./source-context.js'):root.SourceContext;if(!context)throw Error('Kaynak alanı kontrol aracı yüklenemedi.');context.assertRegion(img,options);
 const make=options.createCanvas||((w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;}),source=make(w,h),ctx=source.getContext('2d');ctx.drawImage(img,0,0,w,h);
 const r=extractRGBA(ctx.getImageData(0,0,w,h).data,w,h);if(!r.ok)throw Error(r.reason);
 const canvas=make(r.width,r.height),target=canvas.getContext('2d'),pixels=target.createImageData(r.width,r.height);pixels.data.set(r.data);target.putImageData(pixels,0,0);return {...r,canvas,contrastWarning:contrastWarning(r,options.background)};
}
const api={MAX_PIXELS,extractRGBA,prepare,contrastWarning};if(typeof module!=='undefined')module.exports=api;else root.RearLogo=api;
})(typeof window!=='undefined'?window:globalThis);
