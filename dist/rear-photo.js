/* Bounded, review-only rear photo extraction. No front workflow state or raw-photo fallback. */
(function(root){'use strict';
const node=typeof module!=='undefined',W=node?require('./white-carrier.js'):root.WhiteCarrier,L=node?require('./light-surface.js'):root.LightSurface,O=node?require('./mark-orientation.js'):root.MarkOrientation;
const MAX_ROI_PIXELS=4000000,SCAN_SIZE=600;
function validResult(r){return r&&r.ok&&Number.isSafeInteger(r.width)&&Number.isSafeInteger(r.height)&&r.width>0&&r.height>0&&r.width*r.height<=MAX_ROI_PIXELS&&r.data&&r.data.length===r.width*r.height*4;}
async function prepare(img,options={}){
 const w=img&&(img.naturalWidth||img.width),h=img&&(img.naturalHeight||img.height);
 if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<2||h<2)throw Error('Fotoğraf boyutu geçerli değil.');
 const make=options.createCanvas||((width,height)=>{const c=root.document.createElement('canvas');c.width=width;c.height=height;return c;}),scale=Math.min(1,SCAN_SIZE/Math.max(w,h)),small=make(Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)));
 try{
 const sc=small.getContext('2d',{willReadFrequently:true});sc.drawImage(img,0,0,small.width,small.height);const pixels=sc.getImageData(0,0,small.width,small.height).data;
 const routes=[{name:'rear-white-carrier-photo',engine:W,correct:(r,c)=>W.deskew(r,c.carrierAngleRadians)},{name:'rear-light-surface-photo',engine:L,correct:r=>{if(!O||typeof O.correct!=='function')throw Error('Fotoğraf açı düzeltme aracı yüklenemedi.');return O.correct(r);}}];
 for(const route of routes){if(!route.engine||typeof route.engine.propose!=='function'||typeof route.engine.extractCrop!=='function')continue;
 const candidates=route.engine.propose(pixels,small.width,small.height,w,h);
 if(!Array.isArray(candidates))throw Error('Fotoğraf analizi geçerli bir sonuç vermedi.');
 if(candidates.length>1)throw Error('Fotoğrafta birden fazla marka bölgesi var. Tek markayı gösteren daha yakın bir görsel yükleyin.');
 if(candidates.length!==1)continue;
 const candidate=candidates[0],b=candidate.box;
 if(!Array.isArray(b)||b.length!==4||!b.every(Number.isSafeInteger)||b[0]<0||b[1]<0||b[2]>w||b[3]>h||b[2]<=b[0]||b[3]<=b[1])throw Error('Fotoğraftaki marka bölgesi geçerli değil.');
 const cw=b[2]-b[0],ch=b[3]-b[1];if(cw*ch>MAX_ROI_PIXELS)throw Error('Seçilen fotoğraf bölgesi çok büyük. Daha yakın veya daha küçük bir görsel yükleyin.');
 const source=make(cw,ch);let result;
 try{const cx=source.getContext('2d',{willReadFrequently:true});cx.drawImage(img,b[0],b[1],cw,ch,0,0,cw,ch);result=route.engine.extractCrop(cx.getImageData(0,0,cw,ch).data,cw,ch,candidate);}finally{source.width=source.height=1;}
 if(!validResult(result))continue;
 if(route.engine===W&&typeof W.deskew!=='function')throw Error('Fotoğraf açı düzeltme aracı yüklenemedi.');
 result=route.correct(result,candidate);if(!validResult(result))continue;
 let ink=0;for(let i=3;i<result.data.length;i+=4)if(result.data[i]>16)ink++;if(ink<12)continue;
 const canvas=make(result.width,result.height),target=canvas.getContext('2d'),out=target.createImageData(result.width,result.height);out.data.set(result.data);target.putImageData(out,0,0);
 return {canvas,method:route.name,reviewRequired:true,processing:result.metadata||{},sourceBounds:b.slice(),limitations:['Fotoğraftan çıkarılmış marka önerisidir; yazı ve simgeleri kaynakla karşılaştırarak onaylayın.','Açı düzeltmesi tam perspektif veya baskıya hazır vektör garantisi değildir.',...(result.metadata?.limitations||[])],contrastWarning:'Fotoğraf ayrıştırmasında ince veya soluk ayrıntılar etkilenebilir. Seçtiğiniz zeminde logonun tamamını kontrol edin.'};
 }
 throw Error('Fotoğraftan tek ve yeterince belirgin bir logo ayrılamadı. Daha yakın bir marka görseli veya şeffaf logo yükleyin.');
 }catch(error){if(error&&/[çğıöşüÇĞİÖŞÜ]/.test(error.message||''))throw error;throw Error('Fotoğraf işlenemedi. Daha küçük ve net bir logo görseli yükleyin.');}finally{small.width=small.height=1;}
}
const api={prepare,MAX_ROI_PIXELS,SCAN_SIZE};if(node)module.exports=api;else root.RearPhoto=api;
})(typeof globalThis!=='undefined'?globalThis:this);
