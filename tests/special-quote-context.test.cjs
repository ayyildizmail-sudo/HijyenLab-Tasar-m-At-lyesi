'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const source = fs.readFileSync('frontend/app.js','utf8');
const provider = source.slice(source.indexOf('globalThis.getHijyenLabSpecialQuoteContext='),source.indexOf('// Read-only message context;'));
const catalogContext={module:{exports:{}}};vm.runInNewContext(fs.readFileSync('frontend/product-catalog.js','utf8'),catalogContext);
const blankContext={module:{exports:{}}};vm.runInNewContext(fs.readFileSync('frontend/unprinted-flow.js','utf8'),blankContext);
const catalog=catalogContext.module.exports, blank=blankContext.module.exports;
const nodes={pricing:{hidden:false},qty:{value:'5200'}};
let product=catalog.get('BM12'), unprinted=false, bg='#ffffff';
const state={requestedQuantity:null,lead:{companyName:'PRIVATE'},fragrance:'Limon'};
const env={state,$:id=>nodes[id],productRules:()=>product.priceRules,isUnprinted:()=>unprinted,effectiveBackground:()=>bg,UnprintedFlow:blank,
 getHijyenLabHelpContext:()=>({product:product.label,printMode:unprinted?'unprinted':'printed',fragrance:state.fragrance,quantity:null})};
vm.createContext(env);vm.runInContext(provider,env);
const snapshot=JSON.stringify(state);
for(const id of ['BM12','BM15','BM545']){
 product=catalog.get(id);const rules=product.priceRules;
 for(const color of ['#ffffff','#123456']){
  bg=color;const min=color==='#ffffff'?rules.minimum.white:rules.minimum.colored;
  nodes.qty.value=String(min);assert.equal(env.getHijyenLabSpecialQuoteContext().quantity,min);
  for(const q of ['',0,min-1,1.5,1000001,'x']){nodes.qty.value=String(q);assert.equal(env.getHijyenLabSpecialQuoteContext().quantity,null);}
 }
 unprinted=true;nodes.qty.value=String(rules.unitsPerBox);assert.equal(env.getHijyenLabSpecialQuoteContext().quantity,rules.unitsPerBox);
 nodes.qty.value=String(rules.unitsPerBox+1);assert.equal(env.getHijyenLabSpecialQuoteContext().quantity,null);unprinted=false;
}
assert.equal(JSON.stringify(state),snapshot,'read-only provider leaves quantity, fragrance and lead untouched');
state.photoLayout={};state.photoQuoteBg='unknown';bg='#ffffff';nodes.qty.value='5000';assert.equal(env.getHijyenLabSpecialQuoteContext().quantity,null);
nodes.qty.value='10000';assert.equal(env.getHijyenLabSpecialQuoteContext().quantity,10000);
nodes.pricing.hidden=true;assert.equal(env.getHijyenLabSpecialQuoteContext(),null);
assert(!/fetch\(|localStorage|sessionStorage|state\.\w+\s*=(?!=)|\.value\s*=(?!=)/.test(provider));
const contact=fs.readFileSync('frontend/contact-help.js','utf8');
assert(!/getHijyenLabLeadRequestContext|leadValues|calculate\(|pricing\(|discount|\.checked\s*=/.test(contact));
assert.match(contact,/Özel fiyat, firma\/kurum bilgileri ve talep incelendikten sonra belirlenir\./);
assert.match(contact,/Bu seçim indirim veya doğrulanmış müşteri statüsü sağlamaz/);
console.log('PASS special quote provider: all SKU/mode quantity rules, actual control rather than stale request, unknown ground, expired pricing screen, no lead/fragrance/financial state changes.');
