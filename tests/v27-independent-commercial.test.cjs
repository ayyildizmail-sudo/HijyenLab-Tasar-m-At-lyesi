// Legacy artwork/unprinted fixture: declaration mode is explicitly inactive.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const path=__dirname,app=fs.readFileSync(require('path').join(__dirname,'../frontend/app.js'),'utf8'),life=fs.readFileSync(require('path').join(__dirname,'../frontend/processing-lifecycle.js'),'utf8'),results=[];
const rules={source:'QA-only injected policy',revision:'qa-A',minimum:{white:6000,colored:12000},unitsPerBox:300,whiteUnitKurus:311,coloredSurchargeKurus:44,platePerInkKurus:123400,freightPerBoxKurus:22200,vat:.18,vatPercent:18,coloredUnitKurus:355,maxQuantity:900000};
const elements={},values={qty:'6000',inks:'',province:'İstanbul',district:'Kadıköy',cliche:'new'};const el=id=>elements[id]||(elements[id]={value:values[id]??'',children:[],replaceChildren(){this.children=[];},append(...a){this.children.push(...a);}});
const c={$:el,state:{requestedQuantity:null,inkSelection:{status:'unknown'}},document:{createElement(){return{children:[],append(...a){this.children.push(...a);}}}},syncQuantity:()=>6000,effectiveBackground:()=> '#ffffff',status(){},money:n=>String(n/100),syncProcessingDesign(){},designFingerprint:()=> 'design-A',leadValues:()=> ['same']};c.isUnprinted=()=>false;c.isDeclaredQuote=()=>false;vm.createContext(c);
vm.runInContext(app.slice(app.indexOf('const VAT_EXCLUSION_NOTE'),app.indexOf('const $=')),c);
vm.runInContext(app.slice(app.indexOf('function pricing('),app.indexOf('\nconst money=')),c);
c.productRules=()=>rules;
vm.runInContext(app.slice(app.indexOf('function calculateRaw(){'),app.indexOf("\n$('province')")),c);
vm.runInContext(life.slice(life.indexOf('function makeQuoteSnapshot(){'),life.indexOf('\nfunction ',life.indexOf('function makeQuoteSnapshot(){')+1)),c);
function test(id,fn){try{fn();results.push({id,status:'PASS'});}catch(e){results.push({id,status:'FAIL',error:e.message});}}
c.calculateRaw();
test('unknown_plate_tax_uses_same_policy',()=>assert.equal(c.latest.tax,Math.round(c.latest.subtotal*rules.vat)));
test('unknown_plate_not_reported_as_final_zero',()=>{assert(c.latest.plateUnknown);assert.equal(c.latest.totalStatus,'partial-excludes-plate');});
el('inks').value='2';c.calculateRaw();
const texts=()=>elements.breakdown.children.flatMap(r=>r.children.flatMap(e=>[e.textContent,...(e.children||[]).map(n=>n.textContent)])).filter(Boolean).join('|');
test('plate_label_uses_same_policy',()=>assert(texts().includes('1234')));
test('freight_total_uses_same_policy_without_form_tariff',()=>{assert.equal(c.latest.shipping,20*22200);assert(texts().includes('4440'));assert(texts().includes('İstanbul'));});
test('production_rules_nested_immutable',()=>{const original=vm.runInContext('COMMERCIAL_RULES',c);assert(Object.isFrozen(original));assert(Object.isFrozen(original.minimum));});
test('quote_snapshot_deeply_immutable',()=>{const snap=c.makeQuoteSnapshot();assert(Object.isFrozen(snap));assert(Object.isFrozen(snap.rules));assert(Object.isFrozen(snap.rules.minimum));assert(Object.isFrozen(snap.price));});
const a=JSON.stringify(c.makeQuoteSnapshot());rules.revision='qa-B';rules.platePerInkKurus=123500;const b=JSON.stringify(c.makeQuoteSnapshot());
test('policy_change_alone_changes_quote_snapshot',()=>assert.notEqual(a,b));
test('maximum_quantity_uses_same_policy',()=>assert.throws(()=>c.pricing(900001,'#ffffff','Muğla','Bodrum','new',1)));
test('legacy_existing_plate_normalizes_to_new_without_discount',()=>{const p=c.pricing(6000,'#ffffff','Muğla','Bodrum','existing',1);assert.equal(p.platePending,false);assert.equal(p.plate,123500);});
test('integer_kurus_rounding_alternate_policy',()=>{for(const q of [6001,6002,6011,8001]){const p=c.pricing(q,'#ffffff','İstanbul','Kadıköy','new',2);const net=q*311+2*rules.platePerInkKurus+Math.ceil(q/300)*22200;assert.equal(p.subtotal,net);assert.equal(p.tax,Math.round(net*18/100));assert(Number.isSafeInteger(p.total));}});
test('colored_direct_unit_price',()=>{const p=c.pricing(12000,'#123456','Muğla','Bodrum','new',1);assert.equal(p.base+p.color,12000*355);});
vm.runInContext(app.slice(app.indexOf('function syncQuantity('),app.indexOf('function calculateRaw(){')),c);
test('white_minimum_autofill_uses_policy',()=>{c.state.requestedQuantity=null;c.effectiveBackground=()=> '#ffffff';assert.equal(c.syncQuantity(),6000);assert.equal(el('qty').value,6000);});
test('colored_minimum_autofill_uses_policy',()=>{c.effectiveBackground=()=> '#123456';assert.equal(c.syncQuantity(),12000);assert.equal(el('qty').value,12000);});
const uiLabels={vat:{},prices:{},terms:{}};c.document.querySelectorAll=()=>[uiLabels.vat];c.document.querySelector=s=>s.includes('prices')?uiLabels.prices:uiLabels.terms;
vm.runInContext(app.slice(app.indexOf('function syncCommercialLabels(){'),app.indexOf('function pricing(')),c);
test('active_policy_labels_and_quantity_max_match',()=>{c.syncCommercialLabels();assert.equal(el('qty').max,900000);assert.equal(uiLabels.vat.textContent,'Fiyatlara %18 KDV dahil değildir.');assert(uiLabels.prices.textContent.includes('3.11'));assert(uiLabels.prices.textContent.includes('3.55'));assert(uiLabels.terms.textContent.includes('300 adet'));assert(uiLabels.terms.textContent.includes('1235'));});
fs.writeFileSync(path+'/v27-independent-commercial-results.json',JSON.stringify(results,null,2));console.log(results);

if(results.some(x=>x.status==="FAIL"))process.exitCode=1;
