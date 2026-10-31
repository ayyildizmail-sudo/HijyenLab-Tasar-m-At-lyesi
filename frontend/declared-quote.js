/* Customer statement, not uploaded artwork or press approval. No storage or network. */
(function(root){'use strict';
const VERSION='declared-inks-v1';
function valid(value){return !!value&&Object.prototype.toString.call(value)==='[object Object]'&&Object.keys(value).sort().join(',')==='count,ground,version'&&value.version===VERSION&&['white','colored'].includes(value.ground)&&Number.isInteger(value.count)&&value.count>=1&&value.count<=3;}
function error(value){return valid(value)?'':'Otomatik fiyat için toplam 1, 2 veya 3 baskı rengini seçin. 4+ veya emin olmadığınız renkler için bizimle görüşün.';}
function create(ground='white',count=null){return {version:VERSION,ground,count};}
function snapshotValid(s){
 if(!s||s.quoteSource!=='customer-declared'||s.printMode!=='printed'||!valid(s.declaration)||s.design!==null||s.rear!==null||s.inkCount!==String(s.declaration.count)||s.designApproval!==false||!s.rules||s.ruleVersion!==s.rules.revision||!s.price||s.price.ruleRevision!==s.ruleVersion)return false;
 const catalog=typeof require==='function'?require('./product-catalog.js'):root.ProductCatalog;
 if(!catalog||!catalog.items.some(item=>item.id===s.product))return false;
 const canonical=catalog.get(s.product).priceRules;
 if(JSON.stringify(s.rules)!==JSON.stringify(canonical))return false;
 if(!['string','number'].includes(typeof s.quantity)||!/^\d+$/.test(String(s.quantity)))return false;
 if(!s.lead||!['customer','contact','phone','province'].every(k=>typeof s.lead[k]==='string'&&s.lead[k].trim())||s.lead.phone.replace(/\D/g,'').length<10)return false;
 const locations=typeof require==='function'?require('./shipping-location.js'):root.ShippingLocation;
 if(!locations||locations.error(s.lead.province,s.lead.district))return false;
 if(!['flambau','green_tea','bodrum_mandarin','lemon'].includes(s.fragrance?.id)||s.fragrance.productFamily!==(s.product==='BM21'?'wet_wipes':'towels'))return false;
 const r=s.rules,q=Number(s.quantity),p=s.price,min=r.minimum?.[s.declaration.ground];
 if(!['BM12','BM11','BM13','BM15','BM545','BM21'].includes(s.product)||!Number.isSafeInteger(q)||q<min||q>r.maxQuantity||!Number.isSafeInteger(r.unitsPerBox)||r.unitsPerBox<1||!['new','existing'].includes(s.cliche))return false;
 const boxes=Math.ceil(q/r.unitsPerBox),base=q*r.whiteUnitKurus,color=s.declaration.ground==='white'?0:q*(r.coloredUnitKurus-r.whiteUnitKurus),plate=s.declaration.count*r.platePerInkKurus,shipping=s.lead?.province==='Muğla'&&s.lead?.district==='Bodrum'?0:boxes*r.freightPerBoxKurus;
 return [base,color,plate,shipping].every(Number.isSafeInteger)&&p.base===base&&p.color===color&&p.plate===plate&&p.shipping===shipping&&p.boxes===boxes&&p.subtotal===base+color+plate+shipping&&p.plateUnknown===false&&JSON.stringify(p.rules)===JSON.stringify(r);
}
const api=Object.freeze({VERSION,valid,error,create,snapshotValid});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DeclaredQuote=api;
})(typeof globalThis!=='undefined'?globalThis:this);
