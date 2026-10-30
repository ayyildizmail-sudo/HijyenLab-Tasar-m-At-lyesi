/* White, blank catalogue products; prices always come from ProductCatalog. */
(function(root){'use strict';
function validQuantity(q,rules){return Number.isSafeInteger(q)&&q>=rules.unitsPerBox&&q<=rules.maxQuantity&&q%rules.unitsPerBox===0;}
function quantity(cartons,rules){if(!Number.isSafeInteger(cartons)||cartons<1||cartons>Math.floor(rules.maxQuantity/rules.unitsPerBox))throw Error('En az 1 koli seçin; koli sayısı tam sayı olmalıdır.');return cartons*rules.unitsPerBox;}
function pricing(q,province,district,rules){if(!validQuantity(q,rules))throw Error('En az 1 koli seçin; koli sayısı tam sayı olmalıdır.');const boxes=q/rules.unitsPerBox,base=q*rules.whiteUnitKurus,shipping=province==='Muğla'&&district==='Bodrum'?0:boxes*rules.freightPerBoxKurus,subtotal=base+shipping,tax=Math.round(subtotal*rules.vatPercent/100);return{boxes,base,color:0,plate:0,shipping,subtotal,tax,total:subtotal+tax,minimum:rules.unitsPerBox,plateUnknown:false,platePending:false,totalStatus:'estimated-complete',rules,ruleRevision:rules.revision,printMode:'unprinted'};}
const api=Object.freeze({validQuantity,quantity,pricing});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.UnprintedFlow=api;
})(typeof globalThis!=='undefined'?globalThis:this);
