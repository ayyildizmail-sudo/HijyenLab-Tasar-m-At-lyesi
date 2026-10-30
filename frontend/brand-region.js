/* Region preparation only. No OCR, semantic claim, generated pixels or customer templates. */
(function(root){'use strict';
const median=a=>{const b=Array.from(a).sort((x,y)=>x-y);return b[Math.floor(b.length/2)];};
function separate(data,w,h){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<16||h<16||data.length!==w*h*4)return{ok:false,reason:'Alan çok küçük. Logonun çevresinde biraz boşluk bırakın.'};
 const edge=[],band=Math.max(1,Math.round(Math.min(w,h)*.02));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(x<band||y<band||x>=w-band||y>=h-band){const j=(y*w+x)*4;if(data[j+3]>240)edge.push([data[j],data[j+1],data[j+2]]);}
 if(edge.length<20)return{ok:false,reason:'Seçim kenarlarında yeterli zemin bulunamadı.'};
 const bg=[0,1,2].map(k=>median(edge.map(p=>p[k]))),distance=p=>Math.hypot(...p.map((v,k)=>v-bg[k])),errors=edge.map(distance).sort((a,b)=>a-b),noise=errors[Math.floor(errors.length*.9)];
 if(noise>30||errors.filter(v=>v<24).length/edge.length<.88)return{ok:false,reason:'Seçimin çevresi tek renk değil. Yalnız logo ve marka yazılarını, çevresinde boşluk kalacak şekilde seçin.'};
 const low=Math.max(8,noise+3),high=low+14,out=new Uint8ClampedArray(data.length);let retained=0,cut=0,soft=0,minX=w,minY=h,maxX=-1,maxY=-1;
 for(let i=0;i<w*h;i++){
  const j=i*4,d=Math.hypot(data[j]-bg[0],data[j+1]-bg[1],data[j+2]-bg[2]);
  const a=Math.max(0,Math.min(1,(d-low)/(high-low)))*data[j+3]/255;
  if(a<=0)continue;
  out[j]=data[j];out[j+1]=data[j+1];out[j+2]=data[j+2];out[j+3]=Math.round(a*255);
  const x=i%w,y=Math.floor(i/w);if(a>.25){retained++;if(x<band||y<band||x>=w-band||y>=h-band)cut++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}if(a>0&&a<.9)soft++;
 }
 if(retained<12||retained/(w*h)<.002)return{ok:false,reason:'Bu alanda yeterince belirgin logo bulunamadı. Daha net bir kaynak gerekir.'};
 if(retained/(w*h)>.55)return{ok:false,reason:'Alan hâlâ fotoğraf veya dolu yüzey gibi görünüyor. Daha sade bir marka alanı seçin.'};
 if(cut>Math.max(2,retained*.005))return{ok:false,reason:'Baskı seçim kenarına taşıyor. Harfleri kesmemek için alanı biraz genişletin.'};
 // High-contrast chromatic alpha sanity check only; it cannot detect missing, faint or glare-obscured details.
 let chromatic=0,lost=0;for(let i=0;i<w*h;i++){const j=i*4,c=Math.max(data[j],data[j+1],data[j+2])-Math.min(data[j],data[j+1],data[j+2]);if(c>24&&Math.hypot(data[j]-bg[0],data[j+1]-bg[1],data[j+2]-bg[2])>high+5){chromatic++;if(out[j+3]<128)lost++;}}
 if(chromatic&&lost/chromatic>.05)return{ok:false,reason:'Renkli ayrıntı kaybı var; bu çıktı kullanılamaz.'};
 return{ok:true,data:out,background:bg,box:[minX,minY,maxX+1,maxY+1],coverage:retained/(w*h),softFraction:soft/Math.max(1,retained),noise};
}
function suggestBackground(rgb,isPhoto){const hi=Math.max(...rgb),lo=Math.min(...rgb),estimatedWhite=!!isPhoto&&lo>185&&hi-lo<32;return{rgb:estimatedWhite?[255,255,255]:rgb.slice(),estimatedWhite};}
const api={separate,suggestBackground};if(typeof module!=='undefined')module.exports=api;else root.BrandRegion=api;
})(typeof window!=='undefined'?window:globalThis);
