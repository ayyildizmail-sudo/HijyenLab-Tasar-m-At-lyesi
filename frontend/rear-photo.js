/* Bounded, review-only rear photo extraction. No front workflow state or raw-photo fallback. */
(function(root){'use strict';
const node=typeof module!=='undefined',W=node?require('./white-carrier.js'):root.WhiteCarrier,L=node?require('./light-surface.js'):root.LightSurface,O=node?require('./mark-orientation.js'):root.MarkOrientation;
const Shared=node?require('./standard-photo.js'):root.StandardPhoto;
const MAX_ROI_PIXELS=4000000,SCAN_SIZE=600;
function validResult(r){return r&&r.ok&&Number.isSafeInteger(r.width)&&Number.isSafeInteger(r.height)&&r.width>0&&r.height>0&&r.width*r.height<=MAX_ROI_PIXELS&&r.data&&r.data.length===r.width*r.height*4;}
async function prepare(img,options={}){
 const w=img&&(img.naturalWidth||img.width),h=img&&(img.naturalHeight||img.height);
 if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<2||h<2)throw Error('Fotoğraf boyutu geçerli değil.');
 const context=typeof module!=='undefined'?require('./source-context.js'):root.SourceContext;if(!context)throw Error('Kaynak alanı kontrol aracı yüklenemedi.');context.assertRegion(img,options);
 const make=options.createCanvas||((width,height)=>{const c=root.document.createElement('canvas');c.width=width;c.height=height;return c;}),scale=Math.min(1,SCAN_SIZE/Math.max(w,h)),small=make(Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)));
 try{
 const sc=small.getContext('2d',{willReadFrequently:true});sc.drawImage(img,0,0,small.width,small.height);const pixels=sc.getImageData(0,0,small.width,small.height).data;
 // Use the same source-resolution group extraction as the front, before localized fallbacks.
 if(Shared&&typeof Shared.prepare==='function'){
  const shared=await Shared.prepare(img,{createCanvas:make});
  if(shared){
   if(shared.whiteCarrier){const candidates=W&&typeof W.propose==='function'?W.propose(pixels,small.width,small.height,w,h):[];if(candidates.length>1)throw Error('Fotoğrafta birden fazla ambalaj alanı var. Kullanacağınız ambalajı seçin.');}
   let result={data:shared.canvas.getContext('2d').getImageData(0,0,shared.canvas.width,shared.canvas.height).data,width:shared.canvas.width,height:shared.canvas.height,metadata:shared.processing};
   if(shared.whiteCarrier)result=O.correctPhotoFrame(result);
   if(result.width*result.height>MAX_ROI_PIXELS)throw Error('Seçilen fotoğraf bölgesi çok büyük.');
   const canvas=make(result.width,result.height),cx=canvas.getContext('2d'),out=cx.createImageData(result.width,result.height);out.data.set(result.data);cx.putImageData(out,0,0);
   return {canvas,method:'rear-shared-standard-photo',reviewRequired:true,processing:result.metadata,sourceBounds:shared.processing.box.slice(),limitations:shared.processing.limitations||[],contrastWarning:'Fotoğraf ayrıştırmasında ince veya soluk ayrıntılar etkilenebilir. Seçtiğiniz zeminde logonun tamamını kontrol edin.'};
  }
 }
 const whiteCandidates=W&&typeof W.propose==='function'?W.propose(pixels,small.width,small.height,w,h):[];
 if(whiteCandidates.length>1)throw Error('Fotoğrafta birden fazla ambalaj alanı var. Kullanacağınız ambalajı seçin.');
 const routes=[{name:'rear-white-carrier-photo',engine:W,correct:(r,c)=>W.deskew(r,c.carrierAngleRadians)},{name:'rear-light-surface-photo',engine:L,correct:r=>{if(!O||typeof O.correct!=='function')throw Error('Fotoğraf açı düzeltme aracı yüklenemedi.');return O.correct(r);}}];
 for(const route of routes){if(!route.engine||typeof route.engine.propose!=='function'||typeof route.engine.extractCrop!=='function')continue;
 const candidates=route.engine===W?whiteCandidates:route.engine.propose(pixels,small.width,small.height,w,h);
 if(!Array.isArray(candidates))throw Error('Fotoğraf analizi geçerli bir sonuç vermedi.');
 if(candidates.length>1)throw Error('Fotoğrafta hangi bölgenin logoya ait olduğu net seçilemedi. Logoyu daha yakından gösteren bir görsel yükleyin.');
 if(candidates.length!==1)continue;
 const candidate=candidates[0],b=candidate.box;
 if(!Array.isArray(b)||b.length!==4||!b.every(Number.isSafeInteger)||b[0]<0||b[1]<0||b[2]>w||b[3]>h||b[2]<=b[0]||b[3]<=b[1])throw Error('Fotoğraftaki marka bölgesi geçerli değil.');
 const cw=b[2]-b[0],ch=b[3]-b[1];if(cw*ch>MAX_ROI_PIXELS)throw Error('Seçilen fotoğraf bölgesi çok büyük. Daha yakın veya daha küçük bir görsel yükleyin.');
 const source=make(cw,ch);let result;
 try{const cx=source.getContext('2d',{willReadFrequently:true});cx.drawImage(img,b[0],b[1],cw,ch,0,0,cw,ch);result=route.engine.extractCrop(cx.getImageData(0,0,cw,ch).data,cw,ch,candidate);}finally{source.width=source.height=1;}
 if(!validResult(result))continue;
 if(route.engine===W&&typeof W.deskew!=='function')throw Error('Fotoğraf açı düzeltme aracı yüklenemedi.');
 result=route.correct(result,candidate);if(!validResult(result))continue;
 if(!O||typeof O.correctPhotoFrame!=='function')throw Error('Fotoğraf açı düzeltme aracı yüklenemedi.');result=O.correctPhotoFrame(result);if(!validResult(result))continue;
 let ink=0;for(let i=3;i<result.data.length;i+=4)if(result.data[i]>16)ink++;if(ink<12)continue;
 const canvas=make(result.width,result.height),target=canvas.getContext('2d'),out=target.createImageData(result.width,result.height);out.data.set(result.data);target.putImageData(out,0,0);
 return {canvas,method:route.name,reviewRequired:true,processing:result.metadata||{},sourceBounds:b.slice(),limitations:['Fotoğraftan çıkarılmış marka önerisidir; yazı ve simgeleri kaynakla karşılaştırarak onaylayın.','Açı düzeltmesi tam perspektif veya baskıya hazır vektör garantisi değildir.',...(result.metadata?.limitations||[])],contrastWarning:'Fotoğraf ayrıştırmasında ince veya soluk ayrıntılar etkilenebilir. Seçtiğiniz zeminde logonun tamamını kontrol edin.'};
 }
 throw Error('Fotoğraftan tek ve yeterince belirgin bir logo ayrılamadı. Daha yakın bir marka görseli veya şeffaf logo yükleyin.');
 }catch(error){if(error&&/[çğıöşüÇĞİÖŞÜ]/.test(error.message||''))throw error;throw Error('Fotoğraf işlenemedi. Daha küçük ve net bir logo görseli yükleyin.');}finally{small.width=small.height=1;}
}
// Preserve small, locally contrasted source components missed by the strong-ink
// seed threshold. Only add ORIGINAL RGB pixels, within the established ink group,
// with neighboring component support; never expand out to page/packet decorations.
function retainSelectedFineDetails(raw,result,w,h,E){
 const n=w*h,lum=Float32Array.from({length:n},(_,i)=>(raw[i*4]+raw[i*4+1]+raw[i*4+2])/3),radius=Math.max(5,Math.round(Math.min(w,h)*.045)),bg=E.filter(E.filter(lum,w,h,radius),w,h,radius,false),mask=Uint8Array.from(lum,(v,i)=>bg[i]-v>12&&v<215?1:0);
 let x0=w,y0=h,x1=0,y1=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(result.data[(y*w+x)*4+3]>100){x0=Math.min(x0,x);x1=Math.max(x1,x+1);y0=Math.min(y0,y);y1=Math.max(y1,y+1);}
 const pad=Math.max(3,Math.round(Math.min(w,h)*.012)),parts=E.components(mask,w,h).filter(p=>{const b=p.box,bw=b[2]-b[0],bh=b[3]-b[1];return b[0]>=x0-pad&&b[2]<=x1+pad&&b[1]>=y0-pad&&b[3]<=y1+pad*2.5&&p.pts.length>=2&&bh>=3&&bw/bh<4&&bw*bh<n*.003&&Math.max(bw,bh)<Math.min(w,h)*.12&&p.pts.filter(i=>result.data[i*4+3]<100).length/p.pts.length>.7;});
 let restoredPixels=0,restoredComponents=0;
 for(const p of parts){const a=p.box,ah=a[3]-a[1],neighbors=parts.some(q=>{if(q===p)return false;const b=q.box,bh=b[3]-b[1],gap=Math.max(b[0]-a[2],a[0]-b[2],0);return gap<3*Math.max(ah,bh)&&Math.abs(a[3]-b[3])<Math.max(ah,bh)*.65;});if(!neighbors)continue;
  restoredComponents++;for(const i of p.pts){result.data.set(raw.subarray(i*4,i*4+3),i*4);result.data[i*4+3]=255;restoredPixels++;}
 }
 return {restoredPixels,restoredComponents,method:'bounded-source-pixel-fine-detail-retention',limitations:['Small neutral details are preserved only with local contrast and neighboring component evidence; this is not text recognition or a completeness certificate.']};
}
// Explicit user selection is authoritative: never run a localized detector that can
// silently replace a two-brand selection with just one brand. Matte the WHOLE ROI.
async function prepareSelected(img,options={}){
 const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
 if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<16||h<16||w*h>MAX_ROI_PIXELS)throw Error('Seçilen alanın boyutu uygun değil; en fazla 4 milyon piksel olmalı.');
 const context=node?require('./source-context.js'):root.SourceContext;if(!context)throw Error('Kaynak alanı kontrol aracı yüklenemedi.');context.assertRegion(img,options);
 const F=node?require('./photo-fidelity.js'):root.PhotoFidelity,E=node?require('./ink-extraction.js'):root.LocalInkExtraction;
 const make=options.createCanvas||((w,h)=>{const c=root.document.createElement('canvas');c.width=w;c.height=h;return c;}),canvas=make(w,h),cx=canvas.getContext('2d');cx.drawImage(img,0,0,w,h);
 const raw=cx.getImageData(0,0,w,h).data,result=F.matte(raw,w,h),fineDetails=retainSelectedFineDetails(raw,result,w,h,E);let ink=0,boundary=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(result.data[(y*w+x)*4+3]>100){ink++;if(x<2||y<2||x>=w-2||y>=h-2)boundary++;}
 if(!E.preservesChromaticInk(raw,result.data,w,h)||ink<30||ink>w*h*.5||boundary>Math.max(3,ink*.002))throw Error('Seçilen alanın tüm baskısı güvenle ayrılamadı. Harfleri kesmeden, çevresinde boşluk kalacak şekilde alanı düzeltin.');
 const pixels=cx.createImageData(w,h);pixels.data.set(result.data);cx.putImageData(pixels,0,0);
 return {canvas,method:'rear-user-selected-whole-group-photo',sourceBounds:[0,0,w,h],reviewRequired:true,processing:{method:'user-selected-whole-group-matte',fineDetails,box:[0,0,w,h],preservedRegions:[{box:[0,0,w,h],reason:'Entire explicit selection; no automatic brand subset selection.'}],limitations:result.limitations||[]},limitations:result.limitations||[],contrastWarning:fineDetails.restoredPixels?'Küçük veya soluk yazılar bulundu; kaynak pikselleri korunarak öneriye eklendi. Özellikle alt yazıları büyüterek karşılaştırın; okunamayan harfler yeniden üretilmez.':'Seçtiğiniz alanın tamamı işlendi. Küçük yazılar ve ince çizgiler dahil tüm baskıyı kaynakla karşılaştırın.'};
}
const api={prepare,prepareSelected,retainSelectedFineDetails,MAX_ROI_PIXELS,SCAN_SIZE};if(node)module.exports=api;else root.RearPhoto=api;
})(typeof globalThis!=='undefined'?globalThis:this);
