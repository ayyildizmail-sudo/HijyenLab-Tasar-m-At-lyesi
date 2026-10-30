/* Local-only URL QR encoding. No API request, tracking redirect, or decorative QR pattern. */
(function(root){'use strict';
const MAX_URL_LENGTH=512,QUIET_ZONE=4;
function normalizeUrl(value){
 if(typeof value!=='string')throw Error('QR bağlantısını yazın.');const input=value.trim();
 if(!input||input.length>MAX_URL_LENGTH||/[\u0000-\u0020\u007f]/.test(input))throw Error('QR için boşluksuz, en fazla 512 karakterlik bir bağlantı yazın.');
 const explicitScheme=/^[a-z][a-z0-9+.-]*:/i.test(input);let url;try{url=new URL(explicitScheme?input:'https://'+input);}catch(error){throw Error('Geçerli bir QR bağlantısı yazın; örnek: https://site.com/menu');}
 if(!['https:','http:'].includes(url.protocol)||!url.hostname||url.username||url.password)throw Error('QR için yalnız http veya https bağlantısı kullanın; kullanıcı adı/şifre eklemeyin.');
 const normalized=url.href;if(normalized.length>MAX_URL_LENGTH)throw Error('QR bağlantısı çok uzun. Daha kısa bir bağlantı kullanın.');return normalized;
}
function encodeUrl(value){
 const url=normalizeUrl(value),lib=root.qrcodegen;if(!lib?.QrCode||!lib?.QrSegment)throw Error('QR oluşturucu yüklenemedi. Sayfayı yenileyin.');
 const qr=lib.QrCode.encodeText(url,lib.QrCode.Ecc.MEDIUM),modules=Array.from({length:qr.size},(_,y)=>Array.from({length:qr.size},(_,x)=>qr.getModule(x,y)));
 return {url,size:qr.size,modules,quietZone:QUIET_ZONE,errorCorrection:qr.errorCorrectionLevel.ordinal,version:qr.version};
}
function draw(context,qr,x,y,maxSize){
 if(!qr||!Number.isInteger(qr.size)||qr.size<21||qr.size>177||qr.quietZone!==QUIET_ZONE||!Array.isArray(qr.modules)||qr.modules.length!==qr.size||qr.modules.some(row=>!Array.isArray(row)||row.length!==qr.size)||![x,y,maxSize].every(Number.isFinite))throw Error('QR önizleme verisi geçersiz.');
 const count=qr.size+2*QUIET_ZONE,modulePixels=Math.floor(maxSize/count);if(modulePixels<2)throw Error('QR bu alana okunabilir büyüklükte sığmıyor. Bağlantıyı kısaltın.');
 const renderedSize=count*modulePixels,left=Math.round(x+(maxSize-renderedSize)/2),top=Math.round(y+(maxSize-renderedSize)/2);
 context.save();context.globalAlpha=1;context.globalCompositeOperation='source-over';context.imageSmoothingEnabled=false;context.fillStyle='#ffffff';context.fillRect(left,top,renderedSize,renderedSize);context.fillStyle='#000000';
 for(let row=0;row<qr.size;row++)for(let col=0;col<qr.size;col++)if(qr.modules[row][col])context.fillRect(left+(col+QUIET_ZONE)*modulePixels,top+(row+QUIET_ZONE)*modulePixels,modulePixels,modulePixels);
 context.restore();return {x:left,y:top,width:renderedSize,height:renderedSize,modulePixels,quietZonePixels:QUIET_ZONE*modulePixels};
}
const api={normalizeUrl,encodeUrl,draw,MAX_URL_LENGTH,QUIET_ZONE};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.QRPreview=api;
})(typeof globalThis!=='undefined'?globalThis:this);
