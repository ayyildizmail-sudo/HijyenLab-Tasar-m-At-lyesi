/* Verified product choices and commercial rules only; preview geometry is maintained separately. */
(function(root){'use strict';
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function make(id,label,type,towelDimensions,oppDimensions,frontAsset,backAsset,white,colored,minimum,unitsPerBox){
 const priceRules=freeze({revision:['BM11','BM13'].includes(id)?id+'-2026-10-31-r1':id==='BM12'?'BM12-2026-10-29-r1':id+'-2026-10-23-v4',product:id,source:['BM11','BM13'].includes(id)?'Eylül 2026 müşteri satış tarifesi; kayıtlı ürün minimum/koli koşulları; 31 Ekim ortak uygulama kuralları':id==='BM12'?'29 Ekim 2026 kullanıcı fiyat onayı; diğer koşullar 23 Ekim 2026 v4 listesi':'23 Ekim 2026 v4 fiyat listesi; kullanıcı tarafından doğrulanan ürün koşulları',minimum:{white:minimum,colored:10000},unitsPerBox,whiteUnitKurus:white,coloredUnitKurus:colored,get coloredSurchargeKurus(){return this.coloredUnitKurus-this.whiteUnitKurus;},platePerInkKurus:100000,freightPerBoxKurus:20000,vatPercent:20,get vat(){return this.vatPercent/100;},maxQuantity:1000000});
 return freeze({id,label,type,towelDimensions,oppDimensions,frontAsset,backAsset,priceRules});
}
const items=freeze([
 make('BM12','25 × 30 cm Rulo Islak Havlu','rulo',[25,30],[16,17],'assets/bm12-blank.png','assets/bm12-back-blank.png',290,330,5200,400),
 make('BM11','30 × 30 cm Rulo Islak Havlu','rulo',[30,30],[16,17],'assets/bm12-blank.png','assets/bm12-back-blank.png',350,390,5200,400),
 make('BM13','30 × 35 cm Rulo Islak Havlu','rulo',[30,35],[16,17],'assets/bm12-blank.png','assets/bm12-back-blank.png',380,430,5200,400),
 make('BM15','25 × 25 cm Rulo Islak Havlu','rulo',[25,25],[14,17],'assets/bm15-front.png','assets/bm15-back.png',250,300,5000,500),
 make('BM21','7 × 12 cm Islak Mendil','mendil',null,[7,12],'assets/bm21-approved-blank.png','assets/bm21-approved-blank.png',140,140,10000,1000),
 make('BM545','20 × 25 cm Katlı Islak Havlu','katlı',[20,25],[14,19],'assets/bm545-front.png','assets/bm545-back.png',240,290,5000,625)
]);
function get(id){const item=items.find(item=>item.id===id);if(!item)throw Error('Bu ürün için doğrulanmış ürün ve fiyat kuralı yok.');return item;}
function rules(id){return get(id).priceRules;}
const api=freeze({items,get,rules,defaultId:'BM12'});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProductCatalog=api;
})(typeof globalThis!=='undefined'?globalThis:this);
