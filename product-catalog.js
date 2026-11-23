/* eslint-disable @typescript-eslint/no-require-imports -- Browser/CommonJS module or Node regression harness. */
/* Verified product choices and commercial rules only; preview geometry is maintained separately. */
(function(root){'use strict';
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function make(id,label,type,towelDimensions,oppDimensions,frontAsset,backAsset,white,colored,minimum,unitsPerBox){
 const priceRules=freeze({revision:id==='BM11'?'BM11-2026-11-01-r2':id==='BM13'?id+'-2026-10-31-r1':id==='BM12'?'BM12-2026-10-29-r1':id+'-2026-10-23-v4',product:id,source:id==='BM11'?'23 Ekim 2026 kullanıcı onaylı renkli zemin +0,50 TL; kayıtlı minimum/koli ve ortak uygulama kuralları':id==='BM13'?'Eylül 2026 müşteri satış tarifesi; kayıtlı ürün minimum/koli koşulları; 31 Ekim ortak uygulama kuralları':id==='BM12'?'29 Ekim 2026 kullanıcı fiyat onayı; diğer koşullar 23 Ekim 2026 v4 listesi':'23 Ekim 2026 v4 fiyat listesi; kullanıcı tarafından doğrulanan ürün koşulları',minimum:{white:minimum,colored:10000},unitsPerBox,whiteUnitKurus:white,coloredUnitKurus:colored,get coloredSurchargeKurus(){return this.coloredUnitKurus-this.whiteUnitKurus;},platePerInkKurus:100000,freightPerBoxKurus:20000,vatPercent:20,get vat(){return this.vatPercent/100;},maxQuantity:1000000});
 return freeze({id,label,type,towelDimensions,oppDimensions,frontAsset,backAsset,priceRules});
}
const fx=typeof module!=='undefined'&&module.exports?require('./oshibori-fx.js'):root.OshiboriFX;
function oshiboriRules(rate=fx?.get()){
 const ready=!!fx?.valid(rate),unit=ready?Number((rate.rate*100).toFixed(4)):null;
 return freeze({revision:'OSHIBORI-2026-11-01-r1',product:'OSHIBORI',source:'1 Kasım 2026 kullanıcı onayı; TCMB döviz satış kuru',currency:'TRY',sourceUnitPrice:{currency:'USD',minorUnits:100},fxSnapshot:ready?{...rate}:null,fxPending:!ready,minimum:{white:3000,colored:3000},unitsPerBox:250,whiteUnitKurus:unit,coloredUnitKurus:unit,coloredSurchargeKurus:0,platePerInkKurus:100000,freightPerBoxKurus:20000,vatPercent:20,vat:.2,maxQuantity:1000000});
}
const oshibori=freeze({id:'OSHIBORI',manufacturerCode:null,label:'Oshibori · 22,5 × 24,5 cm Pamuk Havlu',type:'oshibori',towelDimensions:[22.5,24.5],oppDimensions:[16,17],frontAsset:'assets/bm12-blank.png',backAsset:'assets/bm12-back-blank.png',material:'%100 pamuk',weightGramsPerTowel:15,productionCity:'Denizli',get priceRules(){return oshiboriRules();}});
const items=freeze([
 make('BM12','25 × 30 cm Rulo Islak Havlu','rulo',[25,30],[16,17],'assets/bm12-blank.png','assets/bm12-back-blank.png',290,330,5200,400),
 make('BM11','30 × 30 cm Rulo Islak Havlu','rulo',[30,30],[16,17],'assets/bm12-blank.png','assets/bm12-back-blank.png',350,400,5200,400),
 make('BM13','30 × 35 cm Rulo Islak Havlu','rulo',[30,35],[16,17],'assets/bm12-blank.png','assets/bm12-back-blank.png',380,430,5200,400),
 make('BM15','25 × 25 cm Rulo Islak Havlu','rulo',[25,25],[14,17],'assets/bm15-front.png','assets/bm15-back.png',250,300,5000,500),
 make('BM21','7 × 12 cm Islak Mendil','mendil',null,[7,12],'assets/bm21-soft-satin-blank.png','assets/bm21-soft-satin-blank.png',140,140,10000,1000),
 make('BM545','20 × 25 cm Katlı Islak Havlu','katlı',[20,25],[14,19],'assets/bm545-front.png','assets/bm545-back.png',240,290,5000,625),
 oshibori
]);
function get(id){const item=items.find(item=>item.id===id);if(!item)throw Error('Bu ürün için doğrulanmış ürün ve fiyat kuralı yok.');return item;}
function rules(id,rate){return id==='OSHIBORI'?oshiboriRules(rate):get(id).priceRules;}
function validRules(value){try{if(value?.product==='OSHIBORI'&&(!fx?.valid(value.fxSnapshot)||value.fxPending||value.currency!=='TRY'))return false;return JSON.stringify(value)===JSON.stringify(rules(value.product,value.fxSnapshot));}catch{return false;}}
const api=freeze({items,get,rules,validRules,defaultId:'BM12'});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProductCatalog=api;
})(typeof globalThis!=='undefined'?globalThis:this);
