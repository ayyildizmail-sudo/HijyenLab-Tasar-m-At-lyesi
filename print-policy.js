/* Customer-approved automatic quote limit. This never changes the detected ink count. */
(function(root){'use strict';
const MAX_PRINT_INKS=3;
const UNCERTAIN_MESSAGE='Bu görselde baskı renklerini üç renk sınırı içinde güvenle doğrulayamadık. Uygun baskı seçenekleri için WhatsApp’tan yazın veya bizi arayın.';
const CONTACT_MESSAGE='Bu tasarım 3 renkten fazla baskı rengi içeriyor. Size uygun baskı ve fiyat seçenekleri için WhatsApp’tan yazın veya bizi arayın.';
const valid=c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c),normalize=c=>c.toLowerCase();
function evaluate(estimate){
 const count=typeof estimate==='number'?estimate:estimate?.count;
 const known=Number.isInteger(count)&&count>=0,blocked=known&&count>MAX_PRINT_INKS;
 if(estimate&&typeof estimate==='object'&&estimate.hasArtwork===true&&(estimate.uncertain===true||estimate.status==='unknown'))return {blocked:true,count:null,detectedCount:Number.isInteger(estimate.detectedCount)?estimate.detectedCount:known?count:null,reason:UNCERTAIN_MESSAGE,status:'contact-required'};
 return {blocked,count:known?count:null,reason:blocked?CONTACT_MESSAGE:known?'':'Baskı rengi sayısı henüz belirlenemedi.',status:blocked?'contact-required':known?'within-limit':'unknown'};
}
function guardCount(count){const result=evaluate(count);if(result.blocked)throw new Error(CONTACT_MESSAGE);return result;}
function permitsTextColor(colors,color){
 if(!Array.isArray(colors)||!valid(color)||colors.some(c=>!valid(c)))return false;
 const palette=new Set(colors.map(normalize).filter(c=>c!=='#ffffff')),chosen=normalize(color);
 if(chosen!=='#ffffff')palette.add(chosen);
 return palette.size<=MAX_PRINT_INKS;
}
const api=Object.freeze({MAX_PRINT_INKS,CONTACT_MESSAGE,UNCERTAIN_MESSAGE,evaluate,guardCount,permitsTextColor});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PrintPolicy=api;
})(typeof globalThis!=='undefined'?globalThis:this);
